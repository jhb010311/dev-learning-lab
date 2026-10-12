// 기초개념 "JDBC" 실습의 모형 결과를 실제 H2 2.4.240 실행 결과(jdbc_basic_probe.out.txt)와 대조한다
// 대조: 결과 표 세 항목(DB가 받은 SQL, 출력된 값, 예외), 화면의 코드가 Probe가 컴파일한 Main.java 안의 글과 같은지,
//       DB가 받은 SQL 판정의 근거(실행 기록, 파서에서 난 예외, 닫힘 확인에서 난 예외), 실행 뒤 DB 쪽 세션 수,
//       단계 문장이 기대는 사실(FACT 줄)
const fs = require('fs'), path = require('path');
const { load, combos } = require('../model_rows.js');
const lesson = load('jdbc_basic');
const lines = fs.readFileSync(path.join(__dirname, 'jdbc_basic_probe.out.txt'), 'utf8').split(/\r?\n/).filter(Boolean);
console.log(lines[0]);
// Probe가 body를 감싼 모양과 같은 것
const wrap = body => 'import java.sql.*;\n\npublic class Main {\n    public static void main(String[] args) throws Exception {\n' + body.split('\n').map(l => '        ' + l + '\n').join('') + '    }\n}\n';
// H2의 오류 코드 -> 화면에 적는 예외 종류 (이 표에 없는 코드가 나오면 모형이 모르는 오류이므로 다름으로 센다)
const KIND = { '42102': 'typo', '2000': 'none', '90007': 'closed' };
const parse = s => { const f = {}; s.split('|').forEach(p => { const i = p.indexOf('='); if (i > 0) f[p.slice(0, i)] = p.slice(i + 1); }); return f; };
let ok = 0, total = 0;
for (const ln of lines.slice(1)) {
  if (ln.startsWith('FACT ')) continue;
  total++;
  const [k, v] = ln.split(' => '), [conn, sqlk] = k.split('|'), c = { conn, sql: sqlk };
  const f = parse(v), probs = [];
  const sim = lesson.simulate.call(lesson, Object.assign({}, c));
  if (!v.startsWith('compile=OK')) { console.log('다름: ' + k + ' 컴파일 실패 ' + v); continue; }
  const kind = f.exc === '-' ? '' : KIND[f.code] || '(모르는 오류 ' + f.code + ')';
  const real = [f.recv === '-' ? '없음 (SQL을 받지 못함)' : f.recv, f.out === '' ? '(아무것도 출력되지 않음)' : f.out,
    kind ? (lesson.errName[kind] || '(모르는 오류 ' + f.code + ')') : '없음'];
  if (JSON.stringify(sim.row) !== JSON.stringify(real)) probs.push('표 모형 ' + sim.row.join(' | ') + '\n   실제 ' + real.join(' | '));
  // 화면의 코드 = Probe가 컴파일한 소스
  const srcFile = path.join(__dirname, '..', 'out', 'jdbc_basic', conn + '-' + sqlk, 'Main.java');
  const src = fs.readFileSync(srcFile, 'utf8').replace(/\r\n/g, '\n');
  if (src !== wrap(lesson.code.call(lesson, c))) probs.push('화면의 코드와 Probe가 컴파일한 소스가 다름');
  // 화면의 SQL 글이 코드 안에서 executeQuery에 적힌 글과 같은지
  if (lesson.code.call(lesson, c).indexOf('executeQuery("' + lesson.sqlText(c) + '")') < 0) probs.push('sqlText가 코드와 다름');
  // DB가 받은 SQL 판정의 근거
  const want = lesson.sqlText(c);
  if (conn === 'closed') {
    if (!(f.stat === '-' && f.parser === 'false' && f.quotes === 'false' && /JdbcConnection\.checkClosed/.test(f.frames))) probs.push('닫힌 연결: DB 쪽 기록이 없고 닫힘 확인에서 나야 하는데 ' + v);
  } else if (sqlk === 'typo') {
    if (!(f.stat === '-' && f.parser === 'true' && f.quotes === 'true')) probs.push('없는 테이블: 실행 기록은 없고 파서에서 나야 하는데 ' + v);
  } else if (f.stat !== want) probs.push('실행 기록이 다름: ' + f.stat);
  // 모형의 recvCount와 판정
  if (sim.recvCount !== (f.recv === '-' ? 0 : 1)) probs.push('받은 SQL 수 모형 ' + sim.recvCount + ' 실제 ' + (f.recv === '-' ? 0 : 1));
  if (sim.excKind !== kind) probs.push('예외 종류 모형 ' + sim.excKind + ' 실제 ' + kind);
  if (f.exc !== '-' && !/\(SQLException\)$/.test(f.exc)) probs.push('SQLException이 아님: ' + f.exc);
  // 실행이 끝난 뒤 DB 쪽 세션: 준비 코드의 연결 하나 + (닫지 않았으면) 이 코드의 연결 하나
  if (+f.sessions !== (conn === 'closed' ? 1 : 2)) probs.push('세션 수 ' + f.sessions);
  // 예외가 난 줄 뒤는 실행되지 않는다: 출력은 예외 앞 줄까지만
  const expectOut = { 'open|ok': 'true / kim', 'open|typo': '', 'open|none': 'false' }[k] ?? '';
  if (f.out !== expectOut) probs.push('출력 ' + f.out + ' (기대 ' + expectOut + ')');
  if (!probs.length) ok++; else console.log('다름: ' + k + '\n   ' + probs.join('\n   '));
}
const mc = combos(lesson).length;
if (mc !== total) console.log('다름: 모형의 조합 ' + mc + '개, Probe 출력 ' + total + '개');
// 단계 문장이 기대는 사실
const fl = lines.find(l => l.startsWith('FACT '));
const ff = parse((fl || '').slice(5)), fchecks = [
  ['연결을 맺으면 세션 +1, 닫으면 -1', ff['sessions(before,open,closed)'] === '1,2,1'],
  ['createStatement만으로는 SELECT가 실행 기록에 없다', ff.selectAfterCreateStatement === '0'],
  ['executeQuery 뒤에는 실행 기록에 있다', ff.selectAfterExecuteQuery === '1'],
  ['next() 전에 읽으면 SQLException', /^SQLException 02000 2000/.test(ff.getStringBeforeNext || '')],
  ['next()는 true 다음에 false, 첫 행은 kim', ff.nextTwice === 'true,false' && ff.name === 'kim'],
];
for (const [name, good] of fchecks) { total++; if (good) ok++; else console.log('다름: FACT ' + name + ' ' + fl); }
console.log('일치 ' + ok + ' / ' + total);  // 조합 6개 + 사실 5개

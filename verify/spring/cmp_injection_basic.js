// 기초개념 "SQL 인젝션" 실습의 모형 결과를 실제 H2 2.4.240 실행 결과(injection_basic_probe.out.txt)와 대조한다
// 대조: 결과 표 세 항목(DB가 받은 SQL, 돌아온 행, 입력이 다뤄진 방식), 화면의 코드가 Probe가 컴파일한 Main.java 안의 글과 같은지,
//       DB가 받은 SQL 판정의 근거(실행 기록, 파서에서 난 오류), 단계 문장이 기대는 사실(FACT 줄)
// 결과 표의 세 번째 항목은 실제 값에서 이렇게 얻는다: DB가 받은 SQL에 input의 글이 들어 있지 않으면 "값으로만 다뤄짐",
//   들어 있으면 "SQL 글자의 일부가 됨"이고, 괄호 안은 오류가 났는가 / 이름이 input과 같은 행보다 많은 행이 돌아왔는가로 정한다.
const fs = require('fs'), path = require('path');
const { load, combos } = require('../model_rows.js');
const lesson = load('injection_basic');
const lines = fs.readFileSync(path.join(__dirname, 'injection_basic_probe.out.txt'), 'utf8').split(/\r?\n/).filter(Boolean);
console.log(lines[0]);
const wrap = body => 'import java.sql.*;\n\npublic class Main {\n    public static void main(String[] args) throws Exception {\n' + body.split('\n').map(l => '        ' + l + '\n').join('') + '    }\n}\n';
const parse = s => { const f = {}; s.split('|').forEach(p => { const i = p.indexOf('='); if (i > 0) f[p.slice(0, i)] = p.slice(i + 1); }); return f; };
const MEMBERS = ['kim', 'lee', "O'Neil"];
// H2의 오류 코드 -> 화면에 적는 예외 종류
const KIND = { '42000': 'syntax' };
let ok = 0, total = 0;
for (const ln of lines.slice(1)) {
  if (ln.startsWith('FACT ')) continue;
  total++;
  const [k, v] = ln.split(' => '), [how, input] = k.split('|'), c = { how, input };
  const f = parse(v), probs = [];
  const sim = lesson.simulate.call(lesson, Object.assign({}, c));
  if (!v.startsWith('compile=OK')) { console.log('다름: ' + k + ' 컴파일 실패 ' + v); continue; }
  const I = lesson.inp[input];
  const kind = f.exc === '-' ? '' : KIND[f.code] || '(모르는 오류 ' + f.code + ')';
  const names = f.out === '' ? [] : f.out.split(' / ');
  const inSql = f.recv.includes(I);
  const exact = MEMBERS.filter(m => m === I).length;
  const realRecv = how === 'bind' ? f.recv + ' (값: ' + I + ')' : f.recv;
  const realRows = kind ? (kind === 'syntax' ? lesson.errName + ' (돌아온 행 없음)' : '(모르는 오류)') : (names.length ? names.length + '개: ' + names.join(', ') : '0개');
  const realWay = !inSql ? '값으로만 다뤄짐 (SQL 글자에 들어가지 않음)'
    : 'SQL 글자의 일부가 됨 (' + (kind ? '따옴표가 문자열을 끝내 문법이 깨짐' : names.length > exact ? 'OR 조건이 SQL로 읽혀 실행됨' : '평범한 글이라 결과는 같음') + ')';
  const real = [realRecv, realRows, realWay];
  if (JSON.stringify(sim.row) !== JSON.stringify(real)) probs.push('표 모형 ' + sim.row.join(' | ') + '\n   실제 ' + real.join(' | '));
  // 모형의 돌아온 행, 오류 여부
  if (JSON.stringify(sim.outcome.names) !== JSON.stringify(names) || sim.outcome.err !== !!kind) probs.push('모형의 결과 ' + JSON.stringify(sim.outcome) + ' 실제 ' + f.out + ' / ' + kind);
  // 화면의 코드 = Probe가 컴파일한 소스
  const src = fs.readFileSync(path.join(__dirname, '..', 'out', 'injection_basic', how + '-' + input, 'Main.java'), 'utf8').replace(/\r\n/g, '\n');
  if (src !== wrap(lesson.code.call(lesson, c))) probs.push('화면의 코드와 Probe가 컴파일한 소스가 다름');
  // DB가 받은 SQL: 모형의 sqlText와 실제
  if (f.recv !== lesson.sqlText(c)) probs.push('sqlText 모형 ' + lesson.sqlText(c) + ' 실제 ' + f.recv);
  // 판정의 근거: 오류가 아니면 실행 기록에 그 SELECT가 한 번, 오류면 기록 없이 파서(토크나이저)에서 나고 메시지가 그 SQL을 인용
  if (!kind) { if (!(f.stat === f.recv && f.statCount === '1')) probs.push('실행 기록이 다름: ' + f.stat + ' x' + f.statCount); }
  else if (!(f.stat === '-' && f.statCount === '0' && f.parser === 'true' && f.quotes === 'true' && /Tokenizer\.readCharacterString/.test(f.frames) && f.msg.includes("'O'Neil[*]'"))) probs.push('문법 오류: 기록 없이 파서(문자열 읽기)에서 나야 하는데 ' + v);
  if (f.exc !== '-' && !/\(SQLException\)$/.test(f.exc)) probs.push('SQLException이 아님: ' + f.exc);
  // ?로 넘기면 DB가 받은 SQL에 input의 글이 없고, 이어 붙이면 있다
  if ((how === 'bind') === inSql) probs.push('input의 글이 SQL 글자에 ' + (inSql ? '있음' : '없음') + ' (' + how + ')');
  if (!probs.length) ok++; else console.log('다름: ' + k + '\n   ' + probs.join('\n   '));
}
const mc = combos(lesson).length;
if (mc !== total) console.log('다름: 모형의 조합 ' + mc + '개, Probe 출력 ' + total + '개');
// 단계 문장이 기대는 사실
const fl = lines.find(l => l.startsWith('FACT '));
const ff = parse((fl || '').slice(5));
const lit = s => "'" + s.replace(/'/g, "''") + "'";   // H2가 값을 보여 주는 모양(작은따옴표를 두 번 씀)
const fchecks = [
  ['prepareStatement와 setString까지는 DB 실행 기록에 SELECT가 없다', ff.selectBeforeExecute === '0'],
  ['ps의 ? 자리는 1개', ff.paramCount === '1'],
  ['createStatement만으로는 SELECT가 실행 기록에 없다', ff.selectAfterCreateStatement === '0'],
  ['이어 붙인 SQL에는 ? 자리가 없다', ff.concatParamCount === '0'],
  ...['kim', 'or', 'oneil'].map(i => ['ps는 SQL 글자(?)와 1번 자리의 값을 따로 가진다: ' + i, new RegExp('^prep\\d+: SELECT name FROM member WHERE name = \\? \\{1: ' + lit(lesson.inp[i]).replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\}$').test(ff['ps_' + i] || '')]),
];
for (const [name, good] of fchecks) { total++; if (good) ok++; else console.log('다름: FACT ' + name + ' ' + fl); }
console.log('일치 ' + ok + ' / ' + total);  // 조합 6개 + 사실 7개

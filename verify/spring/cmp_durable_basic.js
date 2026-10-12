// 기초개념 "저장과 지속성" 실습의 모형 결과를 실제 DB(H2 2.4.240)를 정리 없이 끝냈다가 다시 연 결과(durable_basic_probe.out.txt)와 대조한다
// 결과 표의 세 항목, 화면의 SQL 글자(Probe가 실행한 SQL과 같은가), 단계 문장의 근거가 되는 값, 그리고 요약이 말하는 참고 실험(H2 기본 설정)을 본다
const fs = require('fs'), path = require('path');
const { load, combos } = require('../model_rows.js');
const lesson = load('durable_basic');
const lines = fs.readFileSync(path.join(__dirname, 'durable_basic_probe.out.txt'), 'utf8').split(/\r?\n/).filter(Boolean);
console.log(lines[0]);
const parse = v => { const f = {}; v.split('|').forEach(p => { const i = p.indexOf('='); if (i > 0) f[p.slice(0, i)] = p.slice(i + 1); }); return f; };
let ok = 0, n = 0;
const seen = new Set();
for (const ln of lines.slice(1).filter(x => !x.startsWith('FACT'))) {
  const [k, v] = ln.split(' => '), f = parse(v.slice(v.indexOf('|exit1=') + 1));
  const sqlText = v.slice(4, v.indexOf('|exit1='));
  n++;
  const [commit, where] = k.split('|'), c = { commit: commit === 'true', where };
  seen.add(JSON.stringify(c));
  const sim = lesson.simulate(c), fc = sim.facts;
  let good = true;
  const bad = m => { good = false; console.log(m); };
  // 실제 결과를 표의 말로 옮긴다
  let fin;
  if (f.rows !== undefined) fin = f.rows + '행' + (f.rows === '0' ? ' (memo 테이블은 있음)' : ' ' + f.data);
  else if (f.errCode === '42104' || f.errCode === '42102') fin = '오류: memo 테이블이 없음';
  else fin = '알 수 없음: ' + JSON.stringify(f);
  const real = [fin, /\nCOMMIT;/.test(sqlText.replace(/\\n/g, '\n')) ? '있음' : '없음', f.files2.indexOf('shop.mv.db') >= 0 ? '디스크의 파일 (shop.mv.db)' : '메모리뿐 (파일 없음)'];
  if (JSON.stringify(sim.row) !== JSON.stringify(real)) bad('다름: ' + k + '\n   모형 ' + sim.row.join(' | ') + '\n   실제 ' + real.join(' | '));
  const wantSql = lesson.code.call(lesson, c).split('\n').join('\\n');
  if (sqlText !== wantSql) bad('화면의 SQL이 Probe가 실행한 SQL과 다름: ' + k + '\n   화면 ' + wantSql + '\n   실행 ' + sqlText);
  if (Object.keys(f).some(x => x.startsWith('ERR'))) bad('실행 중 오류: ' + k + ' ' + Object.keys(f).filter(x => x.startsWith('ERR')).join());
  const eq = (name, want, got) => { if (String(want) !== String(got)) bad('근거가 다름: ' + k + ' ' + name + ' 모형 ' + want + ' 실제 ' + got); };
  eq('exit1(정리 없이 끝냄)', '7', f.exit1); eq('exit2', '0', f.exit2);
  eq('autoStart', 'true', f.autoStart);
  eq('autoAfterBegin', fc.autoAfterBegin, f.autoAfterBegin);
  if (c.commit) eq('autoAfterCommit', fc.autoAfterCommit, f.autoAfterCommit); else eq('autoAfterCommit 기록 없음', 'undefined', String(f.autoAfterCommit));
  eq('꺼지기 직전 행', fc.pre, f.beforeHalt);
  eq('실행에 성공한 문장 수', c.commit ? 4 : 3, f.ok);
  eq('files1', fc.files1, f.files1); eq('files2', fc.files2, f.files2);
  eq('opened', fc.opened, f.opened);
  if (where === 'mem') { eq('오류 종류', 'table', fc.errKind); if (!/this database is empty/.test(f.msg || '')) bad('메모리 DB의 오류 메시지가 달라짐: ' + f.msg); }
  if (good) ok++;
}
// 조합 수 확인: 모든 조합이 Probe에 있는가
const all = combos(lesson).map(c => JSON.stringify(c));
all.forEach(c => { if (!seen.has(c)) { n++; console.log('Probe에 없는 조합: ' + c); } });
// 참고 실험: 요약과 assume이 말하는 "다섯 번 모두", "두 번 모두"
{
  n++;
  let good = true;
  const bad = m => { good = false; console.log(m); };
  const imm = lines.filter(x => x.startsWith('FACT defaultImmediate')), wait = lines.filter(x => x.startsWith('FACT defaultWait'));
  if (imm.length !== 5) bad('바로 끈 실험이 5번이 아님: ' + imm.length);
  imm.forEach(x => { const f = parse(x.split(' => ')[1]); if (f.rows !== undefined || f.errCode !== '42104' || f.exit1 !== '7') bad('기본 설정에서 바로 끈 실험이 요약과 다름: ' + x.slice(0, 200)); });
  if (wait.length !== 2) bad('기다린 실험이 2번이 아님: ' + wait.length);
  wait.forEach(x => { const f = parse(x.split(' => ')[1]); if (f.rows !== '1' || f.exit1 !== '7') bad('기본 설정에서 기다렸다 끈 실험이 요약과 다름: ' + x.slice(0, 200)); });
  // 요약의 문장이 이 숫자에 기대고 있다
  const s = lesson.simulate({ commit: true, where: 'file' }).summary.join(' ');
  if (!/다섯 번 모두/.test(s) || !/두 번 모두/.test(s)) bad('요약에 참고 실험의 횟수 문장이 없음');
  if (good) ok++;
}
console.log('일치 ' + ok + ' / ' + n);

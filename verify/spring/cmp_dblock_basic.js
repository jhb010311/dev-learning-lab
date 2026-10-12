// 기초개념 "행 잠금" 실습의 모형 결과를 실제 DB(H2 2.4.240) 실행 결과(dblock_basic_probe.out.txt)와 대조한다
// 결과 표의 세 항목, 화면의 SQL 글자(Probe가 실행한 SQL과 같은가), 단계 문장의 근거가 되는 값
// (B가 기다렸는지와 A의 COMMIT보다 늦게 끝났는지, 오류의 종류, 다른 연결의 읽기, 마지막 잔액)을 본다
const fs = require('fs'), path = require('path');
const { load } = require('../model_rows.js');
const lesson = load('dblock_basic');
const lines = fs.readFileSync(path.join(__dirname, 'dblock_basic_probe.out.txt'), 'utf8').split(/\r?\n/).filter(Boolean);
console.log(lines[0]);
let ok = 0, n = 0;
for (const ln of lines.slice(1)) {
  const [k, v] = ln.split(' => '), f = {};
  v.split('|').forEach(p => { const i = p.indexOf('='); f[p.slice(0, i)] = p.slice(i + 1); });
  n++;
  const [row, end] = k.split('|'), c = { row, end };
  const sim = lesson.simulate(c);
  let good = true;
  const bad = m => { good = false; console.log(m); };
  // 결과 표: 실제 값에서 얻는다
  const timedOut = f.bUpdate.startsWith('ERR') && f.sqlstate === 'HYT00' && f.code === '50200';
  const waited = f.bDoneAt400 === 'false';
  const upd = timedOut ? '기다리다 시간 초과' : f.bUpdate.startsWith('ERR') ? '알 수 없는 오류 ' + f.sqlstate : waited && f.bEndedAfterACommit === 'true' ? 'A의 COMMIT 뒤에 실행됨' : !waited && f.bDone === 'true' ? '바로 실행됨' : '판단 불가';
  const why = !waited ? '기다리지 않음: 다른 행이라 잠금이 없음' : f.aHasCommit === 'true' ? '같은 행에 A의 잠금이 걸려 있었음' : '같은 행의 잠금을 A가 풀지 않음';
  const real = [upd, f.final, why];
  if (JSON.stringify(sim.row) !== JSON.stringify(real)) bad('다름: ' + k + '\n   모형 ' + sim.row.join(' | ') + '\n   실제 ' + real.join(' | '));
  // 화면의 SQL = Probe가 실행한 SQL
  const wantSql = lesson.code.call(lesson, c).split('\n').join('\\n');
  if (f.sql !== wantSql) bad('화면의 SQL이 Probe가 실행한 SQL과 다름: ' + k + '\n   화면 ' + wantSql + '\n   실행 ' + f.sql);
  const eq = (name, want, got) => { if (String(want) !== String(got)) bad('근거가 다름: ' + k + ' ' + name + ' 기대 ' + want + ' 실제 ' + got); };
  const same = row === 'same', commit = end === 'commit';
  // 구역이 맞게 나뉘었다: A는 BEGIN, UPDATE (, COMMIT), B는 BEGIN, UPDATE, COMMIT
  eq('A 문장 수', commit ? 3 : 2, f.nA); eq('B 문장 수', 3, f.nB); eq('aHasCommit', commit, f.aHasCommit);
  // 단계 문장의 근거
  eq('autoStart', 'true', f.autoStart);
  eq('A의 BEGIN 뒤 자동 커밋 꺼짐', 'false', f.autoABegin); eq('B의 BEGIN 뒤 자동 커밋 꺼짐', 'false', f.autoBBegin);
  eq('A의 UPDATE 직후 A가 읽는 값', '900', f.aOwn1);
  eq('A의 UPDATE 직후 다른 연결이 읽는 값(확정 전)', '1000', f.cAfterA);
  eq('0.4초 뒤 B가 끝났는가', same ? 'false' : 'true', f.bDoneAt400);
  eq('B가 기다리는 동안 다른 연결의 SELECT가 읽은 값', '1000', f.cReadWhileB);
  eq('그 SELECT가 기다리지 않음', 'fast', f.cReadMs);
  eq('마지막 읽기가 기다리지 않음', 'fast', f.finalMs);
  if (commit) {
    eq('A의 COMMIT 뒤 자동 커밋 켜짐', 'true', f.autoAEnd);
    eq('B의 UPDATE가 A의 COMMIT보다 늦게 끝났는가', same ? 'true' : 'false', f.bEndedAfterACommit);
    if (same) eq('B의 UPDATE가 길게 걸림(기다림)', 'long', f.bMs); else eq('B의 UPDATE가 바로 끝남', 'short', f.bMs);
  } else {
    eq('A의 COMMIT이 없음', 'none', f.bEndedAfterACommit);
  }
  if (same && !commit) {
    eq('B의 UPDATE가 시간 초과 오류', 'true', timedOut);
    eq('오류 뒤에도 B의 묶음이 열려 있음(자동 커밋 꺼짐)', 'false', f.autoBAfterUpdate);
    eq('B가 오류 뒤 읽은 계좌 1', '1000', f.bOwn1);
    eq('B가 기다린 시간이 길다', 'long', f.bMs);
  } else {
    eq('B의 UPDATE가 성공', 'OK', f.bUpdate.split('|')[0]);
    eq('B의 UPDATE가 바꾼 행 수', '1', f.updated);
  }
  if (same && commit) eq('B가 이어서 실행한 뒤 읽은 계좌 1(A가 확정한 900에 50)', '950', f.bOwn1);
  if (!same) eq('B가 UPDATE 뒤 읽은 계좌 2', '1050', f.bOwn2);
  eq('B의 COMMIT', 'OK', f.bCommit); eq('B의 COMMIT 뒤 자동 커밋 켜짐', 'true', f.autoBEnd);
  eq('A를 닫은 뒤에 읽어도 같은 값', f.final, f.finalAfterClose);
  if (good) ok++;
}
console.log('일치 ' + ok + ' / ' + n);

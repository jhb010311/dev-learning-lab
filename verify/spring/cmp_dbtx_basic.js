// 기초개념 "트랜잭션" 실습의 모형 결과를 실제 DB(H2 2.4.240) 실행 결과(dbtx_basic_probe.out.txt)와 대조한다
// 결과 표의 세 항목, 화면의 SQL 글자(Probe가 실행한 SQL과 같은가), 단계 문장의 근거가 되는 값
// (문장마다 이 연결과 다른 연결이 읽은 잔액, 자동 커밋 상태, 이 연결의 마지막 SELECT)을 본다
const fs = require('fs'), path = require('path');
const { load } = require('../model_rows.js');
const lesson = load('dbtx_basic');
const lines = fs.readFileSync(path.join(__dirname, 'dbtx_basic_probe.out.txt'), 'utf8').split(/\r?\n/).filter(Boolean);
console.log(lines[0]);
let ok = 0, n = 0;
for (const ln of lines.slice(1)) {
  const [k, v] = ln.split(' => '), f = {};
  v.split('|').forEach(p => { const i = p.indexOf('='); f[p.slice(0, i)] = p.slice(i + 1); });
  n++;
  const [begin, end] = k.split('|'), c = { begin: begin === 'true', end };
  const sim = lesson.simulate(c), fc = sim.facts;
  const real = [f.bUpd1.split(',')[0], f.final1, f.final2];
  const wantSql = lesson.code.call(lesson, c).split('\n').join('\\n');
  let good = true;
  const bad = m => { good = false; console.log(m); };
  if (JSON.stringify(sim.row) !== JSON.stringify(real)) bad('다름: ' + k + '\n   모형 ' + sim.row.join(' | ') + '\n   실제 ' + real.join(' | '));
  if (f.sql !== wantSql) bad('화면의 SQL이 Probe가 실행한 SQL과 다름: ' + k + '\n   화면 ' + wantSql + '\n   실행 ' + f.sql);
  if (Object.keys(f).some(x => x.startsWith('ERR'))) bad('실행 중 오류: ' + k + ' ' + Object.keys(f).filter(x => x.startsWith('ERR')).join());
  // 단계 문장의 근거: 문장마다 읽은 값, 자동 커밋, 마지막 SELECT, 끝난 뒤 합
  const eq = (name, want, got) => { if (want !== got) bad('근거가 다름: ' + k + ' ' + name + ' 모형 ' + want + ' 실제 ' + got); };
  eq('bSetup', fc.bSetup, f.bSetup);
  eq('aUpd1', fc.aUpd1, f.aUpd1); eq('bUpd1', fc.bUpd1, f.bUpd1);
  eq('aUpd2', fc.aUpd2, f.aUpd2); eq('bUpd2', fc.bUpd2, f.bUpd2);
  eq('aSelect', fc.aSelect, f.aSelect); eq('bSelect', fc.bSelect, f.bSelect);
  eq('autoStart', 'true', f.autoStart);
  eq('autoBegin', String(c.begin ? fc.autoBegin : undefined), String(c.begin ? f.autoBegin === 'true' : undefined));
  if (!c.begin && f.autoBegin !== undefined) bad('BEGIN이 없는데 autoBegin이 기록됨: ' + k);
  eq('autoLast', String(fc.autoLast), f.autoLast);
  if (c.end !== 'none') {
    eq('aEnd', fc.aEnd, f.aEnd); eq('bEnd', fc.bEnd, f.bEnd);
    eq('autoEnd', 'true', f.autoEnd); // COMMIT이나 ROLLBACK 뒤에는 언제나 자동 커밋이 켜져 있다
  }
  eq('final', fc.final, f.final1 + ',' + f.final2);
  eq('bFinal', fc.final, f.bFinal); // 닫은 뒤에도 다른 연결(B)이 읽는 값은 새 연결(C)과 같다
  eq('sum', '1000', f.sum);
  if (good) ok++;
}
console.log('일치 ' + ok + ' / ' + n);

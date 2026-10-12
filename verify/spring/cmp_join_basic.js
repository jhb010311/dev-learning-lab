// 기초개념 "조인" 실습의 모형 결과를 실제 DB(H2 2.4.240) 실행 결과(join_basic_probe.out.txt)와 대조한다
// 결과 표의 두 항목(행 수, 읽힌 결과), 화면의 SQL 글자(Probe가 실행한 SQL과 같은가), 단계 문장의 근거가 되는 값을 본다
const fs = require('fs'), path = require('path');
const { load } = require('../model_rows.js');
const lesson = load('join_basic');
const lines = fs.readFileSync(path.join(__dirname, 'join_basic_probe.out.txt'), 'utf8').split(/\r?\n/).filter(Boolean);
console.log(lines[0]);
let ok = 0, n = 0;
for (const ln of lines.slice(1)) {
  const [k, v] = ln.split(' => '), f = {};
  v.split('|').forEach(p => { const i = p.indexOf('='); f[p.slice(0, i)] = p.slice(i + 1); });
  n++;
  const [how, orphan] = k.split('|'), c = { how, orphan: orphan === 'true' };
  const sim = lesson.simulate(c);
  const bad = [];
  // 결과 표: 실제 행을 같은 규칙(앞의 네 행과 모두 n행)으로 줄여 견준다
  const realRows = f.rows ? f.rows.split('/') : [];
  const short = realRows.length > 4 ? realRows.slice(0, 4).join(', ') + ', … (모두 ' + realRows.length + '행)' : realRows.join(', ');
  const real = [f.n + '행', short];
  if (f.sel !== 'OK') bad.push('SELECT 실패: ' + k + ' ' + f.sel);
  if (JSON.stringify(sim.row) !== JSON.stringify(real)) bad.push('다름: ' + k + '\n   모형 ' + sim.row.join(' | ') + '\n   실제 ' + real.join(' | '));
  // 모형이 만든 결과의 모든 줄도 실제 행 전체와 같은가(줄이기 전)
  const modelRows = sim.events[sim.events.length - 1].snap.res.map(r => r[0] + '·' + r[1]);
  if (JSON.stringify(modelRows) !== JSON.stringify(realRows)) bad.push('줄이기 전의 결과가 다름: ' + k + '\n   모형 ' + modelRows.join('/') + '\n   실제 ' + realRows.join('/'));
  // 화면의 SQL = Probe가 실행한 SQL
  const wantSql = lesson.code.call(lesson, c).split('\n').join('\\n');
  if (f.sql !== wantSql) bad.push('화면의 SQL이 Probe가 실행한 SQL과 다름: ' + k + '\n   화면 ' + wantSql + '\n   실행 ' + f.sql);
  if (f.stmts !== '5' || f.s0 !== 'OK' || f.s1 !== 'OK' || f.s2 !== 'OK' || f.s3 !== 'OK') bad.push('테이블 만들기나 INSERT가 실패함: ' + k);
  // 단계 문장의 근거: orders 행 수, member 행 수, id가 9인 회원 없음, 주문 10의 짝, ON 없는 CROSS JOIN 행 수
  const nOrders = c.orphan ? 4 : 3;
  if (f.ordersCount !== String(nOrders) || f.memberCount !== '2' || f.member9 !== '0' || f.pairOf10 !== '키보드·김철수' || f.noOnRows !== String(nOrders * 2))
    bad.push('단계 문장의 근거가 다름: ' + k + ' ' + [f.ordersCount, f.memberCount, f.member9, f.pairOf10, f.noOnRows].join(','));
  // 단계 문장이 말하는 행 수와 같은가(마지막 단계의 문장에 실제 행 수가 들어 있다)
  const lastText = sim.events[sim.events.length - 1].s;
  if (lastText.indexOf('결과는 ' + f.n + '행') < 0) bad.push('마지막 단계의 행 수 문장이 실제와 다름: ' + k + ' ' + lastText);
  if (bad.length) console.log(bad.join('\n')); else ok++;
}
console.log('일치 ' + ok + ' / ' + n);

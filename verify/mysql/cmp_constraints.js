// "테이블, 키, 제약 조건" 실습의 모형 결과를 실제 MySQL 실행 결과(constraints_probe.out.txt)와 조합마다 대조한다.
// 비교 표의 네 칸뿐 아니라 오류 메시지와, 끝난 뒤 두 테이블에 남은 모든 행도 함께 비교한다.
const fs = require('fs'), path = require('path');
const { load, combos } = require('../model_rows.js');
const lesson = load('constraints');
const lines = fs.readFileSync(path.join(__dirname, 'constraints_probe.out.txt'), 'utf8').split(/\r?\n/);
console.log(lines[0]);
const real = {}; lines.filter(l => l.includes(' => ')).forEach(l => { const [k, v] = l.split(' => '); real[k] = v.split('|'); });
let ok = 0, n = 0; const seen = new Set();
for (const c of combos(lesson)) {
  const key = [c.op, c.con, c.act].join('|'); if (seen.has(key)) continue; seen.add(key); n++;
  const sim = lesson.simulate(Object.assign({}, c)), r = real[key];
  if (!r) { console.log('다름: ' + key + '  실제 실행 결과가 없음'); continue; }
  const [errno, rc, mN, oN, chk, msg, mDump, oDump] = r, ck = lesson.chk(c);
  const want = [errno === '0' ? '성공' : '오류 ' + errno, rc === '-1' ? '없음' : rc + '행', 'member ' + mN + '행, orders ' + oN + '행', ck[1] + ' ' + chk + ck[2]];
  const model = sim.row.concat([sim.err ? sim.err.msg : '', sim.dump.member, sim.dump.orders]);
  // 외래 키 오류 메시지는 뒤에 데이터베이스 이름과 제약 이름이 붙으므로, 모형이 적은 앞부분으로 시작하는지를 본다
  const same = JSON.stringify(sim.row) === JSON.stringify(want) && (sim.err ? msg.startsWith(sim.err.msg) : msg === '') && sim.dump.member === mDump && sim.dump.orders === oDump;
  if (same) ok++; else console.log('다름: ' + key + '\n   모형 ' + model.join(' / ') + '\n   실제 ' + want.concat([msg, mDump, oDump]).join(' / '));
}
console.log('일치 ' + ok + ' / ' + n);

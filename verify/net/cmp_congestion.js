// "흐름 제어와 혼잡 제어" 실습의 모형 수치(왕복 단위의 식)를 congestion_probe.out.txt(ACK 하나 단위의 계산)와 대조한다.
// 둘 다 RFC 5681의 규칙을 옮긴 계산이며 실제 TCP 실행 결과가 아니다. 유실이 일어나는 왕복은 3~10번째를 모두 본다.
const fs = require('fs'), path = require('path');
const { load, combos } = require('../model_rows.js');
const lesson = load('congestion');
const lines = fs.readFileSync(path.join(__dirname, 'congestion_probe.out.txt'), 'utf8').split(/\r?\n/).filter(l => l.includes(' => ') && !l.startsWith('#'));
const calc = {};
for (const ln of lines) {
  const [k, v] = ln.split(' => '), [flights, cwnds, ssths, ssthAfter, cwndAfter, total, limited] = v.split('|');
  calc[k] = { row: [flights, ssthAfter === '-' ? '유실 없음' : ssthAfter + '조각', cwndAfter === '-' ? '유실 없음' : cwndAfter + '조각', total + '조각', limited + '번'], cwnds, ssths };
}
let ok = 0, total = 0; const seen = new Set();
for (const c of combos(lesson, { at: [3, 4, 5, 6, 7, 8, 9, 10] })) {
  const k = [c.loss, c.at, c.ssth, c.rwnd].join('|'); if (seen.has(k)) continue; seen.add(k); total++;
  const sim = lesson.simulate(Object.assign({}, c)), want = calc[k];
  if (!want) { console.log('계산 결과 없음: ' + k); continue; }
  const same = JSON.stringify(sim.row) === JSON.stringify(want.row) && sim.R.map(o => o.cwnd).join(' ') === want.cwnds && sim.R.map(o => o.ssth).join(' ') === want.ssths;
  if (same) ok++; else console.log('다름: ' + k + '\n  모형 ' + sim.row.join(' / ') + ' / cwnd ' + sim.R.map(o => o.cwnd).join(' ') + '\n  계산 ' + want.row.join(' / ') + ' / cwnd ' + want.cwnds);
}
console.log('일치 ' + ok + ' / ' + total + ' (규칙을 다시 계산한 값과의 대조, 계산 결과 ' + lines.length + '줄. 결과 표의 다섯 칸과 왕복마다의 혼잡 윈도, 문턱값을 비교)');

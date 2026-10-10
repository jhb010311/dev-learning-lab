// "SELECT가 처리되는 순서" 실습의 모형 결과를 실제 MySQL 실행 결과(selectorder_probe.out.txt)와 조합마다 대조한다.
// 비교 표의 네 칸과 오류 메시지를 비교한다. ORDER BY가 없는 조합은 행의 순서가 보장되지 않으므로 순서를 빼고 비교한다.
const fs = require('fs'), path = require('path');
const { load, combos } = require('../model_rows.js');
const lesson = load('selectorder');
const lines = fs.readFileSync(path.join(__dirname, 'selectorder_probe.out.txt'), 'utf8').split(/\r?\n/);
console.log(lines[0]);
const real = {}; lines.filter(l => l.includes(' => ')).forEach(l => { const [k, v] = l.split(' => '); real[k] = v.split('|'); });
let ok = 0, n = 0;
for (const c of combos(lesson)) {
  const key = [c.cond, c.at, c.galias, c.tail].join('|'); n++;
  const sim = lesson.simulate(Object.assign({}, c)), r = real[key];
  if (!r) { console.log('다름: ' + key + '  실제 실행 결과가 없음'); continue; }
  const [errno, msg, rowsJson, cnt] = r, failed = errno !== '0', ordered = c.tail === 'limit';
  let list = JSON.parse(rowsJson).map(x => x[0] + ' ' + x[1]);
  // ORDER BY가 없으면 모형의 순서에 맞춰 놓고 비교한다 (들어 있는 행이 다르면 그대로 달라진다)
  if (!failed && !ordered && sim.list && list.slice().sort().join('|') === sim.list.slice().sort().join('|')) list = sim.list.slice();
  // MySQL이 받아 준 확장: 문장이 실제로 성공했을 때, 별칭을 GROUP BY나 HAVING에 썼는지로 정한다
  const ext = []; if (c.galias) ext.push('GROUP BY'); if (c.at === 'having' && c.cond === 'alias') ext.push('HAVING');
  const want = [failed ? '오류 ' + errno : '성공', failed ? '-' : c.at === 'where' ? '6행 중 ' + cnt + '행' : 'WHERE 없음', failed ? '-' : list.length + '행: ' + list.join(', '), failed ? '-' : ext.length ? ext.join('와 ') + '의 별칭' : '없음'];
  const same = JSON.stringify(sim.row) === JSON.stringify(want) && (sim.err ? sim.err.msg : '') === msg && (c.at === 'where' || failed || cnt === '6');
  if (same) ok++; else console.log('다름: ' + key + '\n   모형 ' + sim.row.concat([sim.err ? sim.err.msg : '']).join(' / ') + '\n   실제 ' + want.concat([msg]).join(' / '));
}
console.log('일치 ' + ok + ' / ' + n);

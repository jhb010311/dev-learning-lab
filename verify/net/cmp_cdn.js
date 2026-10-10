// "CDN" 실습의 모형 결과를 실제 실행 결과(cdn_probe.out.txt)와 대조한다.
// 조합마다 다섯 열(네 번의 요청 각각의 X-Cache 값과 받은 내용, 오리진에 온 요청 수)을 모두 비교한다.
const fs = require('fs'), path = require('path');
const { load, combos } = require('../model_rows.js');
const lesson = load('cdn');
const real = {};
fs.readFileSync(path.join(__dirname, 'cdn_probe.out.txt'), 'utf8').split(/\r?\n/).filter(l => l.includes(' => ')).forEach(l => { const [k, v] = l.split(' => '); real[k] = v.split('|'); });
let ok = 0; const seen = new Set();
for (const c of combos(lesson)) {
  const k = [c.ttl, c.q2, c.chg, c.after].join('|'); if (seen.has(k)) continue; seen.add(k);
  const r = real[k], row = lesson.simulate(Object.assign({}, c)).row;
  if (!r) { console.log('실행 결과 없음: ' + k); continue; }
  const cells = r.slice(0, 4).map(x => x.split(','));
  const want = cells.map(([st, body], i) => st + (c.chg && i >= 2 ? ' · ' + (body === 'old' ? '옛 내용' : body === 'new' ? '새 내용' : '?') : '')).concat(r[4] + '번');
  const sane = cells.every(([st, body], i) => (c.chg && i >= 2) || body === 'old');      // 바꾸기 전의 요청은 모두 처음 내용이어야 한다
  if (sane && JSON.stringify(row) === JSON.stringify(want)) ok++; else console.log('다름: ' + k + '\n  모형 ' + row.join(' / ') + '\n  실제 ' + want.join(' / ') + (sane ? '' : '  (실행 결과 자체가 이상함: ' + r.join('|') + ')'));
}
console.log('일치 ' + ok + ' / ' + seen.size);

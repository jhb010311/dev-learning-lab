// 변수와 타입 실습의 모형 결과를 실제 실행 결과(VarsProbe.out.txt)와 조합마다 대조한다
const fs = require('fs'), path = require('path');
const { load, combos } = require('../model_rows.js');
const lesson = load('vars');
const real = {};
fs.readFileSync(path.join(__dirname, 'VarsProbe.out.txt'), 'utf8').split(/\r?\n/).filter(l => l.includes(' => ')).forEach(ln => { const [k, v] = ln.split(' => '); real[k] = v.split('|'); });
let ok = 0, n = 0; const used = new Set();
for (const c of combos(lesson)) {
  const k = c.what + '|' + c.how, r = real[k]; n++; used.add(k);
  if (!r) { console.log('실제 실행 결과가 없는 조합: ' + k); continue; }
  const row = lesson.simulate(Object.assign({}, c)).row, want = [r[0], r[1], r[2] === 'true' ? '달라짐' : '그대로'];
  if (JSON.stringify(row) === JSON.stringify(want)) ok++; else console.log('다름: ' + k + '  모형 ' + row.join(' / ') + '  실제 ' + want.join(' / '));
}
Object.keys(real).filter(k => !used.has(k)).forEach(k => { n++; console.log('모형에 없는 조합: ' + k); });
console.log('일치 ' + ok + ' / ' + n);

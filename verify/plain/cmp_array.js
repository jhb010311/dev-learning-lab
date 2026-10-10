// 배열 실습의 모형 결과를 실제 실행 결과(ArrayProbe.out.txt)와 조합마다 대조한다
const fs = require('fs'), path = require('path');
const { load, combos } = require('../model_rows.js');
const lesson = load('array');
const real = {};
fs.readFileSync(path.join(__dirname, 'ArrayProbe.out.txt'), 'utf8').split(/\r?\n/).filter(l => l.includes(' => ') && !l.startsWith('#')).forEach(ln => { const i = ln.indexOf(' => '); real[ln.slice(0, i)] = ln.slice(i + 4).split('|'); });
let ok = 0, n = 0; const used = new Set();
for (const c of combos(lesson)) {
  const k = [c.shape, c.type, c.copy, c.idx].join('|'), r = real[k]; n++; used.add(k);
  if (!r) { console.log('실제 실행 결과가 없는 조합: ' + k); continue; }
  const row = lesson.simulate(Object.assign({}, c)).row, eq = r[0].split(','), bad = r[1] !== 'OK';
  const want = [eq.length === 2 ? eq[0] + ' (a[0] == b[0]은 ' + eq[1] + ')' : eq[0], bad ? r[1] : '성공', bad ? '출력 전에 멈춤' : r[2], bad ? '출력 전에 멈춤' : r[3]];
  if (JSON.stringify(row) === JSON.stringify(want)) ok++; else console.log('다름: ' + k + '  모형 ' + row.join(' / ') + '  실제 ' + want.join(' / '));
}
Object.keys(real).filter(k => !used.has(k)).forEach(k => { n++; console.log('모형에 없는 조합: ' + k); });
console.log('일치 ' + ok + ' / ' + n);

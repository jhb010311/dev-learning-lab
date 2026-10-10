// 조건문과 반복문 실습의 모형 결과를 실제 실행 결과(LoopsProbe.out.txt)와 조합마다 대조한다
// 숨겨진 설정은 결과에 쓰이지 않으므로, 반복문은 "문장 + 조건 + 하는 일", switch는 "방식 + n"이 같은 조합을 한 번만 센다.
const fs = require('fs'), path = require('path');
const { load, combos } = require('../model_rows.js');
const lesson = load('loops');
const real = {};
fs.readFileSync(path.join(__dirname, 'LoopsProbe.out.txt'), 'utf8').split(/\r?\n/).filter(l => l.includes(' => ') && !l.startsWith('#')).forEach(ln => { const i = ln.indexOf(' => '), v = ln.slice(i + 4), j = v.lastIndexOf('|'); real[ln.slice(0, i)] = [v.slice(0, j), v.slice(j + 1)]; });
let ok = 0, n = 0; const seen = new Set();
for (const c of combos(lesson)) {
  const loop = c.stmt === 'for' || c.stmt === 'while', k = loop ? c.stmt + '|' + c.cmp + '|' + c.jump : c.stmt + '|' + c.val;
  const row = lesson.simulate(Object.assign({}, c)).row;
  if (seen.has(k)) { if (JSON.stringify(row) !== seen[k]) console.log('숨겨진 설정이 결과를 바꿈: ' + JSON.stringify(c)); continue; }
  seen.add(k); seen[k] = JSON.stringify(row); n++;
  const r = real[k];
  if (!r) { console.log('실제 실행 결과가 없는 조합: ' + k); continue; }
  const want = [r[0], loop ? (r[1] === '끝없이' ? '끝없이 반복' : '본문 ' + r[1] + '번') : 'case ' + r[1] + '개'];
  if (JSON.stringify(row) === JSON.stringify(want)) ok++; else console.log('다름: ' + k + '  모형 ' + row.join(' / ') + '  실제 ' + want.join(' / '));
}
Object.keys(real).filter(k => !seen.has(k)).forEach(k => { n++; console.log('모형에 없는 조합: ' + k); });
console.log('일치 ' + ok + ' / ' + n);

// 연산자와 형변환 실습의 모형 결과를 실제 실행 결과(CastingProbe.out.txt)와 코드마다 대조한다
// 숨겨진 설정은 결과에 쓰이지 않으므로, "살펴볼 것 + 그 주제에서 고른 코드"가 같은 조합은 한 번만 센다.
const fs = require('fs'), path = require('path');
const { load, combos } = require('../model_rows.js');
const lesson = load('casting');
const text = fs.readFileSync(path.join(__dirname, 'CastingProbe.out.txt'), 'utf8').split(/\r?\n/);
const real = {};
text.filter(l => l.includes(' => ') && !l.startsWith('#')).forEach(ln => { const i = ln.indexOf(' => '); real[ln.slice(0, i)] = ln.slice(i + 4).split('|'); });
const realMsg = (text.find(l => l.startsWith('# 컴파일 메시지: ')) || '').slice('# 컴파일 메시지: '.length);
let ok = 0, n = 0; const seen = new Set();
for (const c of combos(lesson)) {
  const k = c.topic + '|' + (c.topic === 'ints' ? c.e1 : c.topic === 'conv' ? c.e2 : c.e3);
  const sim = lesson.simulate(Object.assign({}, c)), row = sim.row;
  if (seen.has(k)) { if (JSON.stringify(row) !== seen[k]) console.log('숨겨진 설정이 결과를 바꿈: ' + JSON.stringify(c)); continue; }
  seen.add(k); seen[k] = JSON.stringify(row); n++;
  const r = real[k];
  if (!r) { console.log('실제 실행 결과가 없는 코드: ' + k); continue; }
  let same = JSON.stringify(row) === JSON.stringify(r);
  if (k === 'conv|narrow' && sim.msg !== realMsg) { same = false; console.log('컴파일 메시지가 다름: 모형 "' + sim.msg + '"  실제 "' + realMsg + '"'); }
  if (same) ok++; else console.log('다름: ' + k + '  모형 ' + row.join(' / ') + '  실제 ' + r.join(' / '));
}
Object.keys(real).filter(k => !seen.has(k)).forEach(k => { n++; console.log('모형에 없는 코드: ' + k); });
console.log('일치 ' + ok + ' / ' + n);

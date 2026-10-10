// String, StringBuilder 실습의 모형 결과를 실제 실행 결과(StrBuildProbe.out.txt)와 대조한다
const fs = require('fs'), path = require('path');
const { load, combos } = require('../model_rows.js');
const lesson = load('strbuild');
const real = {};
fs.readFileSync(path.join(__dirname, 'StrBuildProbe.out.txt'), 'utf8').split(/\r?\n/).filter(l => l.includes(' => ')).forEach(l => { const [k, v] = l.split(' => '); real[k] = v; });
const cs = combos(lesson);
let ok = 0;
for (const c of cs) {
  const k = [c.type, c.op, c.m].join('|');
  if (!real[k]) { console.log('실제 실행 결과 없음: ' + k); continue; }
  const [now, first, same, changed] = real[k].split('|');
  const want = [now, first, same === 'true' ? '같은 객체' : '다른 객체', changed === '-' ? '(반복 없음)' : changed + '번'];
  const row = lesson.simulate(Object.assign({}, c)).row;
  if (JSON.stringify(row) === JSON.stringify(want)) ok++; else console.log('다름: ' + k + '  모형 ' + row.join(' / ') + '  실제 ' + want.join(' / '));
}
if (cs.length !== Object.keys(real).length) console.log('조합 수가 다름: 모형 ' + cs.length + ', 실제 ' + Object.keys(real).length);
console.log('일치 ' + ok + ' / ' + Object.keys(real).length);

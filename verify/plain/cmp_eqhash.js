// equals와 hashCode 실습의 모형 결과를 실제 실행 결과(EqHashProbe.out.txt)와 대조한다
const fs = require('fs'), path = require('path');
const { load } = require('../model_rows.js');
const lesson = load('eqhash');
const lines = fs.readFileSync(path.join(__dirname, 'EqHashProbe.out.txt'), 'utf8').split(/\r?\n/).filter(l => l.includes(' => '));
let ok = 0;
for (const ln of lines) {
  const [k, v] = ln.split(' => '), [how, same] = k.split('|'), [eq, hs, got, size] = v.split('|');
  const row = lesson.simulate({ how, same }).row, real = [eq, hs === 'true' ? '같음' : '다름', got, size + '개'];
  if (JSON.stringify(row) === JSON.stringify(real)) ok++; else console.log('다름: ' + k + '  모형 ' + row.join(' / ') + '  실제 ' + real.join(' / '));
}
console.log('일치 ' + ok + ' / ' + lines.length);

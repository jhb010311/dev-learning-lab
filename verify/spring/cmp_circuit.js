// 서킷 브레이커 실습의 모형 결과를 실제 Resilience4j 실행 결과(circuit_probe.out.txt)와 대조한다
const fs = require('fs'), path = require('path');
const { load } = require('../model_rows.js');
const lesson = load('circuit');
const lines = fs.readFileSync(path.join(__dirname, 'circuit_probe.out.txt'), 'utf8').split(/\r?\n/).filter(Boolean);
console.log(lines[0]);
let ok = 0;
for (const ln of lines.slice(1)) {
  const [k, v] = ln.split(' => '), [th, wait, dur] = k.split('|'), [okN, failN, blockN, trans] = v.split('|');
  const row = lesson.simulate({ use: true, th, wait, dur }).row;
  const real = [okN + '번', failN + '번', blockN + '번', failN * 3 + '초', trans];
  if (JSON.stringify(row) === JSON.stringify(real)) ok++; else console.log('다름: ' + k + '\n   모형 ' + row.join(' | ') + '\n   실제 ' + real.join(' | '));
}
console.log('일치 ' + ok + ' / ' + (lines.length - 1));

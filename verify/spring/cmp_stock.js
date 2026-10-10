// 재고 차감과 락 실습의 모형 결과를 실제 MySQL·Redis 실행 결과(stock_probe.out.txt)와 대조한다
const fs = require('fs'), path = require('path');
const { load } = require('../model_rows.js');
const lesson = load('stock');
const lines = fs.readFileSync(path.join(__dirname, 'stock_probe.out.txt'), 'utf8').split(/\r?\n/).filter(Boolean);
console.log(lines[0]);
let ok = 0;
for (const ln of lines.slice(1)) {
  const [k, v] = ln.split(' => '), [how, s, n] = k.split('|'), [orders, qty, waits, retries] = v.split('|').map(Number);
  const row = lesson.simulate({ how, s: +s, n: +n }).row;
  const real = [orders + '건', qty + '개', (+s - qty === orders) ? '맞음' : '어긋남', waits + '번', retries + '번'];
  if (JSON.stringify(row) === JSON.stringify(real)) ok++; else console.log('다름: ' + k + '  모형 ' + row.join(' / ') + '  실제 ' + real.join(' / '));
}
console.log('일치 ' + ok + ' / ' + (lines.length - 1));

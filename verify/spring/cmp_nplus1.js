// N+1 실습의 모형 쿼리 수를 실제 Hibernate가 내보낸 SQL 수(nplus1_probe.out.txt)와 대조한다
const fs = require('fs'), path = require('path');
const { load } = require('../model_rows.js');
const lesson = load('nplus1');
const lines = fs.readFileSync(path.join(__dirname, 'nplus1_probe.out.txt'), 'utf8').split(/\r?\n/).filter(Boolean);
console.log(lines[0]);
let ok = 0; const bad = [];
for (const ln of lines.slice(1)) {
  const [k, v] = ln.split(' => '), [st, bs, n, m, use] = k.split('|'), real = v.split('|').map(x => x + '번');
  const row = lesson.simulate({ n: +n, m: +m, st, bs: +bs || 5, use: use === 'true', rt: 5 }).row.slice(0, 3);
  if (JSON.stringify(row) === JSON.stringify(real)) ok++; else bad.push(k + '  모형 ' + row.join('/') + '  실제 ' + real.join('/'));
}
console.log('일치 ' + ok + ' / ' + (lines.length - 1));
bad.slice(0, 30).forEach(b => console.log('다름: ' + b));

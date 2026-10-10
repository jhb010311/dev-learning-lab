// 빈 생성과 주입 실습의 모형 결과를 실제 스프링 부트 기동 결과(di_probe.out.txt)와 대조한다
const fs = require('fs'), path = require('path');
const { load } = require('../model_rows.js');
const lesson = load('di');
const lines = fs.readFileSync(path.join(__dirname, 'di_probe.out.txt'), 'utf8').split(/\r?\n/).filter(Boolean);
console.log(lines[0]);
let ok = 0;
for (const ln of lines.slice(1)) {
  const [k, v] = ln.split(' => '), [inj, cycle, allow] = k.split('|'), real = v.split('|');
  const row = lesson.simulate({ inj, cycle: cycle === 'true', allow: allow === 'true' }).row;
  if (JSON.stringify(row) === JSON.stringify(real.slice(0, 3))) ok++; else console.log('다름: ' + k + '\n   모형 ' + row.join(' | ') + '\n   실제 ' + real.join(' | '));
}
console.log('일치 ' + ok + ' / ' + (lines.length - 1));

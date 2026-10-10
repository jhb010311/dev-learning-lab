// "람다와 함수형 인터페이스" 실습의 모형 결과를 실제 실행 결과(LambdaProbe.out.txt)와 대조한다.
// 모형의 모든 설정 조합에 대해 부르는 메서드, 받는 것, 돌려주는 것, 본문 실행 횟수, 돌려받은 값, 출력된 줄의 순서를 비교한다.
const fs = require('fs'), path = require('path');
const { load, combos } = require('../model_rows.js');
const lesson = load('lambda');
const real = {};
fs.readFileSync(path.join(__dirname, 'LambdaProbe.out.txt'), 'utf8').split(/\r?\n/).filter(l => l.includes(' => ')).forEach(l => { const i = l.indexOf(' => '); real[l.slice(0, i)] = l.slice(i + 4); });
let ok = 0, n = 0;
for (const c of combos(lesson)) {
  n++;
  const key = c.fi + '|' + c.form + '|' + c.calls, r = real[key];
  if (!r) { console.log('실제 실행 결과 없음: ' + key); continue; }
  const [method, params, ret, count, lines] = r.split('|');
  const got = lines.split(' / ').filter(l => l.startsWith('결과 ')).map(l => l.slice(3));
  const want = [
    method,
    params === '0' ? '없음' : params === '1' ? '값 하나' : '값 ' + params + '개',
    ret === 'void' ? '없음 (void)' : ret === 'boolean' ? 'true 또는 false' : '값 하나',
    count + '번',
    count === '0' ? '(부르지 않음)' : got.length ? got.join(', ') : '(돌려주는 값 없음)',
    lines,
  ];
  const sim = lesson.simulate(Object.assign({}, c)), mine = sim.row.concat([sim.out.join(' / ')]);
  if (JSON.stringify(mine) === JSON.stringify(want)) ok++; else console.log('다름: ' + key + '\n  모형 ' + mine.join(' | ') + '\n  실제 ' + want.join(' | '));
}
console.log('일치 ' + ok + ' / ' + n);

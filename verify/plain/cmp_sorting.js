// "정렬과 Comparator" 실습의 모형 결과를 실제 실행 결과(SortingProbe.out.txt)와 대조한다.
// 모형의 모든 설정 조합에 대해 정렬 결과, compare가 돌려준 두 값, 잔액 순서가 맞는지를 비교한다.
const fs = require('fs'), path = require('path');
const { load, combos } = require('../model_rows.js');
const lesson = load('sorting');
const real = {};
fs.readFileSync(path.join(__dirname, 'SortingProbe.out.txt'), 'utf8').split(/\r?\n/).filter(l => l.includes(' => ')).forEach(l => { const i = l.indexOf(' => '); real[l.slice(0, i)] = l.slice(i + 4); });
const cell = v => v + (v < 0 ? ' (음수: park가 앞)' : v > 0 ? ' (양수: park가 뒤)' : ' (순서를 가리지 않음)');
let ok = 0, n = 0;
for (const c of combos(lesson)) {
  n++;
  const key = c.by + '|' + c.data + '|' + c.rev, r = real[key];
  if (!r) { console.log('실제 실행 결과 없음: ' + key); continue; }
  const [names, c1, c2, balOk] = r.split('|');
  const want = [names, cell(+c1), cell(+c2), c.by === 'natural' ? '(잔액을 보지 않음)' : balOk === 'true' ? '맞음' : '틀림'];
  const got = lesson.simulate(Object.assign({}, c)).row;
  if (JSON.stringify(got) === JSON.stringify(want)) ok++; else console.log('다름: ' + key + '\n  모형 ' + got.join(' / ') + '\n  실제 ' + want.join(' / '));
}
const txt = fs.readFileSync(path.join(__dirname, 'SortingProbe.out.txt'), 'utf8');
console.log('Collections.sort(list)가 naturalOrder와 같은 순서인지 확인 ' + (txt.includes('확인 Collections.sort와 naturalOrder가 같은 결과: true') ? 1 : 0) + ' / 1');
console.log('일치 ' + ok + ' / ' + n);

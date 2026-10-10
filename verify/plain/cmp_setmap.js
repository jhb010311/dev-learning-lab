// "Set과 Map의 종류" 실습의 모형 결과를 실제 실행 결과(SetMapProbe.out.txt)와 대조한다.
// 모형의 모든 설정 조합에 대해 출력, 크기, 중복을 넣었을 때 돌려준 값, 예외, 예외가 난 차례, HashMap의 칸 번호를 비교한다.
const fs = require('fs'), path = require('path');
const { load, combos } = require('../model_rows.js');
const lesson = load('setmap');
const real = {};
fs.readFileSync(path.join(__dirname, 'SetMapProbe.out.txt'), 'utf8').split(/\r?\n/).filter(l => l.includes(' => ')).forEach(l => { const i = l.indexOf(' => '); real[l.slice(0, i)] = l.slice(i + 4); });
let ok = 0, n = 0;
for (const c of combos(lesson)) {
  n++;
  const key = c.kind + '|' + c.data + '|' + c.shape, r = real[key];
  if (!r) { console.log('실제 실행 결과 없음: ' + key); continue; }
  const [print, size, dup, ex, at, cells, tab] = r.split('|');
  const want = [
    ex === '없음' ? print : '(출력 전에 멈춤)',
    ex === '없음' ? size + '개' : '-',
    dup === '-' ? '-' : c.shape === 'set' ? 'add가 ' + dup + '를 돌려줌' : 'put이 예전 값(' + dup + ')을 돌려줌',
    ex,
    c.kind === 'hash' ? cells : '-',
    at,
  ];
  const sim = lesson.simulate(Object.assign({}, c)), got = sim.row.concat([sim.cells, String(sim.stopAt)]);
  const tabOk = c.kind !== 'hash' || tab === '16';
  if (JSON.stringify(got) === JSON.stringify(want) && tabOk) ok++; else console.log('다름: ' + key + '\n  모형 ' + got.join(' / ') + '\n  실제 ' + want.join(' / ') + (tabOk ? '' : '\n  칸 수가 16이 아님: ' + tab));
}
const txt = fs.readFileSync(path.join(__dirname, 'SetMapProbe.out.txt'), 'utf8');
// Set<Task>, Set<String>처럼 타입을 적은 화면의 코드 그대로도 컴파일되고 같은 예외가 나는지
const extra = [txt.includes('확인 typedObj: ClassCastException'), txt.includes('확인 typedNull: NullPointerException, 그때 크기 2')];
console.log('타입을 적은 코드의 예외 확인 ' + extra.filter(Boolean).length + ' / ' + extra.length);
console.log('일치 ' + ok + ' / ' + n);

// 내부 클래스와 익명 클래스 실습의 모형 결과를 실제 컴파일·실행 결과(InnerProbe.out.txt)와 대조한다.
// 화면에 보이는 코드(code)가 실제로 컴파일한 소스와 글자까지 같은지도 함께 본다.
const fs = require('fs'), path = require('path');
const { load, combos } = require('../model_rows.js');
const lesson = load('inner');
const real = {}, src = {};
fs.readFileSync(path.join(__dirname, 'InnerProbe.out.txt'), 'utf8').split(/\r?\n/).forEach(l => {
  // SRC 줄은 소스의 줄바꿈을 역슬래시와 n 두 글자로 적어 둔 것이므로 다시 줄바꿈으로 되돌린다
  if (l.startsWith('SRC ')) { const i = l.indexOf(' :: '); src[l.slice(4, i)] = l.slice(i + 4).split(String.fromCharCode(92) + 'n').join('\n'); }
  else if (l.includes(' => ')) { const [k, v] = l.split(' => '); real[k] = v; }
});
const cs = combos(lesson);
let ok = 0, same = 0;
for (const c of cs) {
  const k = [c.kind, c.use, c.loc].join('|');
  if (!real[k]) { console.log('실제 실행 결과 없음: ' + k); continue; }
  const [cmp, out, ref] = real[k].split('|'), good = cmp === 'ok';
  const rel = ref === 'ref=true' ? '안쪽 객체가 바깥 객체 o를 가리킴' : ref === 'ref=none' ? '바깥 객체를 가리키지 않음'
    : !good ? '-' : out.endsWith('this = Outer$1') ? 'this는 익명 객체 자신' : out.endsWith('this = Outer') ? 'this는 바깥 Outer 객체' : '?';
  const want = [good ? '성공' : '오류: ' + cmp.replace(/^error: /, ''), good ? out : '(실행되지 않음)', rel];
  const row = lesson.simulate(Object.assign({}, c)).row;
  if (JSON.stringify(row) === JSON.stringify(want)) ok++; else console.log('다름: ' + k + '\n  모형 ' + row.join(' / ') + '\n  실제 ' + want.join(' / '));
  if (lesson.code(c) === src[k]) same++; else console.log('코드가 다름: ' + k);
}
console.log('화면의 코드와 컴파일한 소스가 같은 조합 ' + same + ' / ' + cs.length);
console.log('일치 ' + ok + ' / ' + Object.keys(real).length);

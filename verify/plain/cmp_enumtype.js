// "열거형(enum)" 실습의 모형 결과를 실제 컴파일·실행 결과(EnumTypeProbe.out.txt)와 대조한다.
// 결과 표의 네 칸을 조합마다 비교하고, 화면의 코드가 실제로 컴파일한 코드와 같은지도 비교한다.
const fs = require('fs'), path = require('path');
const { load, combos } = require('../model_rows.js');
const lesson = load('enumtype');
const text = fs.readFileSync(path.join(__dirname, 'EnumTypeProbe.out.txt'), 'utf8').split(/\r?\n/);
const real = {}, src = {};
for (const ln of text) {
  if (ln.startsWith('# src ')) { const i = ln.indexOf(' :: '); src[ln.slice(6, i)] = ln.slice(i + 4).split('\\n').join('\n'); }
  else if (ln.includes(' => ')) { const i = ln.indexOf(' => '); real[ln.slice(0, i)] = ln.slice(i + 4).split('|'); }
}
let ok = 0, codeOk = 0, n = 0;
for (const c of combos(lesson)) {
  const key = c.store + '|' + c.change + '|' + c.saved, r = real[key]; n++;
  if (!r) { console.log('실제 결과 없음: ' + key); continue; }
  const [value, comp, out, exit, err] = r, row = lesson.simulate(Object.assign({}, c)).row, lines = out === '-' ? [] : out.split(' / ');
  const shown = c.store === 'ordinal' ? value : '"' + value + '"';
  const want = comp !== 'OK' ? [shown, '(컴파일 오류)', '(컴파일 오류)', comp]
    : exit === '0' ? [shown, lines[0], lines[1], '정상 종료']
    : [shown, '(읽지 못함)', '(읽지 못함)', '예외로 중단: ' + err.replace('Exception in thread "main" ', '')];
  if (JSON.stringify(row) === JSON.stringify(want) && lines.length === (exit === '0' ? 2 : 0)) ok++;
  else console.log('다름: ' + key + '\n  모형 ' + row.join(' | ') + '\n  실제 ' + want.join(' | '));
  if (lesson.code(c) === src[key]) codeOk++; else console.log('코드 다름: ' + key);
}
// 설정에는 없지만 글에서 말한 사실
const yes = (label, good) => console.log(label + ': ' + (good ? '예 (글과 같음)' : '아니오 (글과 다름)'));
const x = k => (real['extra|' + k] || []).join('|');
yes('같은 상수는 어떤 방법으로 얻어도 같은 객체인가', x('same-object') === 'true');
yes('valueOf는 대소문자가 다른 이름에 IllegalArgumentException을 던지는가', x('valueOf-lowercase').startsWith('java.lang.IllegalArgumentException'));
yes('==는 한쪽이 null이어도 예외 없이 false인가', x('null-eq') === 'false');
yes('서로 다른 enum 타입의 == 비교는 컴파일 오류인가', x('cross-enum-eq').startsWith('ERROR incomparable types'));
yes('상수를 지우면 번호 1로 뒤의 상수가 읽히는가', x('removed-ordinal-1') === 'OK|SHIPPED|0|-');
yes('상수를 지우면 마지막 번호는 배열 범위를 벗어나는가', x('removed-ordinal-2').includes('ArrayIndexOutOfBoundsException'));
yes('상수를 지우면 그 이름의 valueOf는 예외를 던지는가', x('removed-name').includes('IllegalArgumentException: No enum constant Status.PAID'));
console.log('코드 일치 ' + codeOk + ' / ' + n);
console.log('일치 ' + ok + ' / ' + n);

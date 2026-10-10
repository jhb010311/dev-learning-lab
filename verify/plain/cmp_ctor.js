// "클래스, 객체, 생성자" 실습의 모형 결과를 실제 컴파일·실행 결과(CtorProbe.out.txt)와 대조한다
// 1) 조합마다 모형의 row(컴파일, 실행된 순서, 출력)가 실제와 같은지  2) 화면의 코드가 실제로 컴파일한 소스와 같은지(주석과 공백 제외)
// 3) 모형이 말하는 필드의 기본값이 실제와 같은지
const fs = require('fs'), path = require('path');
const { load, combos } = require('../model_rows.js');
const lesson = load('ctor');
const all = fs.readFileSync(path.join(__dirname, 'CtorProbe.out.txt'), 'utf8').split(/\r?\n/);
const lines = all.filter(l => l.includes(' => ') && !/^(SRC|#) /.test(l)), srcs = all.filter(l => l.startsWith('SRC '));
const norm = s => s.split('\n').map(x => x.replace(/\/\/.*$/, '')).join(' ').replace(/\s+/g, '');
const cfg = k => { const [ctors, call, first] = k.split('|'); return { ctors, call, first }; };
let ok = 0, okSrc = 0;
for (const ln of lines) {
  const [k, v] = ln.split(' => '), [comp, order, out] = v.split('|');
  const row = lesson.simulate(cfg(k)).row, real = [comp, order === '-' ? '실행되지 않음' : order, out === '-' ? '실행되지 않음' : out];
  if (JSON.stringify(row) === JSON.stringify(real)) ok++; else console.log('다름: ' + k + '  모형 ' + row.join(' / ') + '  실제 ' + real.join(' / '));
}
for (const ln of srcs) {
  const i = ln.indexOf(' => '), k = ln.slice(4, i), real = ln.slice(i + 4).replace(/\\n/g, '\n');
  if (norm(lesson.code(cfg(k))) === norm(real)) okSrc++; else console.log('코드 다름: ' + k);
}
const n = combos(lesson).length;
if (lines.length !== n || srcs.length !== n) console.log('조합 수가 다름: 모형 ' + n + ', 실행 ' + lines.length);
const def = (all.find(l => l.startsWith('# 기본값 => ')) || '').split(' => ')[1];
const snap = lesson.simulate({ ctors: 'none', call: 'noarg', first: 'field' }).events.find(e => e.snap.made).snap;
console.log('기본값: 모형 ' + snap.qty + ', ' + snap.memo + ' / 실제 ' + def + (snap.qty + ', ' + snap.memo === def ? ' (같음)' : ' (다름)'));
console.log('this(...)가 첫 문장이 아닐 때(JDK 21): ' + (all.find(l => l.startsWith('# this가 첫 문장이 아님 => ')) || '').split(' => ')[1]);
console.log('코드 일치 ' + okSrc + ' / ' + srcs.length);
console.log('일치 ' + ok + ' / ' + lines.length);

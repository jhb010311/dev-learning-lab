// "상속과 오버라이딩" 실습의 모형 결과를 실제 컴파일·실행 결과(InheritProbe.out.txt)와 대조한다
// 1) 조합마다 모형의 row(컴파일, new Dog() 동안의 출력, d.describe()의 출력)가 실제와 같은지  2) 화면의 코드가 실제로 컴파일한 소스와 같은지(주석과 공백 제외)
const fs = require('fs'), path = require('path');
const { load, combos } = require('../model_rows.js');
const lesson = load('inherit');
const all = fs.readFileSync(path.join(__dirname, 'InheritProbe.out.txt'), 'utf8').split(/\r?\n/);
const lines = all.filter(l => l.includes(' => ') && !/^(SRC|#) /.test(l)), srcs = all.filter(l => l.startsWith('SRC '));
const norm = s => s.split('\n').map(x => x.replace(/\/\/.*$/, '')).join(' ').replace(/\s+/g, '');
const cfg = k => { const [pctor, sup, pcall, sm] = k.split('|'); return { pctor, sup, pcall: pcall === 'true', sm: sm === 'true' }; };
let ok = 0, okSrc = 0;
for (const ln of lines) {
  const [k, v] = ln.split(' => '), [comp, errCount, o1, o2] = v.split('|');
  const row = lesson.simulate(cfg(k)).row, real = [comp, o1 === '-' ? '실행되지 않음' : o1, o2 === '-' ? '실행되지 않음' : o2];
  if (JSON.stringify(row) === JSON.stringify(real) && errCount === (comp === '성공' ? '0' : '1')) ok++; else console.log('다름: ' + k + '  모형 ' + row.join(' | ') + '  실제 ' + real.join(' | '));
}
for (const ln of srcs) {
  const i = ln.indexOf(' => '), k = ln.slice(4, i), real = ln.slice(i + 4).replace(/\\n/g, '\n');
  if (norm(lesson.code(cfg(k))) === norm(real)) okSrc++; else console.log('코드 다름: ' + k);
}
const n = combos(lesson).length;
if (lines.length !== n || srcs.length !== n) console.log('조합 수가 다름: 모형 ' + n + ', 실행 ' + lines.length);
all.filter(l => l.startsWith('# ')).forEach(l => console.log('추가 확인: ' + l.slice(2)));
console.log('코드 일치 ' + okSrc + ' / ' + srcs.length);
console.log('일치 ' + ok + ' / ' + lines.length);

// "접근 제어자와 캡슐화" 실습의 모형 결과를 실제 컴파일 결과(AccessProbe.out.txt)와 대조한다
// 1) 조합마다 모형의 row 가운데 컴파일 결과와 오류 메시지가 실제와 같은지("판단한 이유" 칸은 설명이라 대조하지 않는다)
// 2) 화면의 코드가 실제로 컴파일한 소스와 같은지(주석과 공백 제외)  3) 필드를 메서드로 바꿔 컴파일해도 성공과 오류가 같은지
const fs = require('fs'), path = require('path');
const { load, combos } = require('../model_rows.js');
const lesson = load('access');
const all = fs.readFileSync(path.join(__dirname, 'AccessProbe.out.txt'), 'utf8').split(/\r?\n/);
const lines = all.filter(l => l.includes(' => ') && !/^(SRC|M|#) /.test(l)), srcs = all.filter(l => l.startsWith('SRC ')), meth = all.filter(l => l.startsWith('M '));
const norm = s => s.split('\n').map(x => x.replace(/\/\/.*$/, '')).join(' ').replace(/\s+/g, '');
const cfg = k => { const [mod, from] = k.split('|'); return { mod, from }; };
let ok = 0, okSrc = 0, okM = 0;
for (const ln of lines) {
  const [k, v] = ln.split(' => '), [comp, errCount, msg] = v.split('|');
  const row = lesson.simulate(cfg(k)).row, model = [row[0], row[2]], real = [comp, msg === '-' ? '없음' : msg];
  if (JSON.stringify(model) === JSON.stringify(real) && errCount === (comp === '성공' ? '0' : '1')) ok++; else console.log('다름: ' + k + '  모형 ' + model.join(' | ') + '  실제 ' + real.join(' | '));
}
for (const ln of srcs) {
  const i = ln.indexOf(' => '), k = ln.slice(4, i), real = ln.slice(i + 4).replace(/\\n/g, '\n');
  if (norm(lesson.code(cfg(k))) === norm(real)) okSrc++; else console.log('코드 다름: ' + k);
}
for (const ln of meth) {
  const [k, v] = ln.slice(2).split(' => ');
  if (lesson.simulate(cfg(k)).row[0] === v.split('|')[0]) okM++; else console.log('메서드일 때 다름: ' + k + ' 실제 ' + v);
}
const n = combos(lesson).length;
if (lines.length !== n || srcs.length !== n) console.log('조합 수가 다름: 모형 ' + n + ', 실행 ' + lines.length);
console.log('메서드로 바꿨을 때 성공/오류 일치 ' + okM + ' / ' + meth.length);
console.log('코드 일치 ' + okSrc + ' / ' + srcs.length);
console.log('일치 ' + ok + ' / ' + lines.length);

// "static과 인스턴스" 실습의 모형 결과를 실제 컴파일·실행 결과(StaticProbe.out.txt)와 대조한다
// 1) 조합마다 모형의 row(컴파일, a.count와 b.count, 추가한 줄의 출력)가 실제와 같은지  2) 화면의 코드가 실제로 컴파일한 소스와 같은지(주석과 공백 제외)
const fs = require('fs'), path = require('path');
const { load, combos } = require('../model_rows.js');
const lesson = load('static');
const all = fs.readFileSync(path.join(__dirname, 'StaticProbe.out.txt'), 'utf8').split(/\r?\n/);
const lines = all.filter(l => l.includes(' => ') && !/^(SRC|#) /.test(l)), srcs = all.filter(l => l.startsWith('SRC '));
const norm = s => s.split('\n').map(x => x.replace(/\/\/.*$/, '')).join(' ').replace(/\s+/g, '');
const cfg = k => { const [decl, extra, nb] = k.split('|'); return { decl, extra, nb }; };
let ok = 0, okSrc = 0;
for (const ln of lines) {
  const [k, v] = ln.split(' => '), [comp, errCount, stdout] = v.split('|'), c = cfg(k);
  const row = lesson.simulate(c).row;
  // 모형의 row를 실제 프로그램이 찍는 순서의 표준 출력으로 바꾼다: cls0은 추가한 줄이 먼저, sm은 나중에 찍힌다
  const model = row[0] !== '성공' ? '-' : c.extra === 'cls0' ? row[2] + ' / ' + row[1] : c.extra === 'sm' ? row[1] + ' / ' + row[2] : row[1];
  const same = row[0] === comp && model === stdout && (comp === '성공' ? errCount === '0' && (c.extra === 'cls0' || c.extra === 'sm' || row[2] === '추가한 줄 없음') : errCount === '1' && row[1] === '실행되지 않음' && row[2] === '실행되지 않음');
  if (same) ok++; else console.log('다름: ' + k + '  모형 ' + row.join(' / ') + '  실제 ' + v);
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

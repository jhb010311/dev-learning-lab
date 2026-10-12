// 기초개념 "서블릿" 실습의 모형 결과를 실제 톰캣 실행 결과(servlet_basic_probe.out.txt)와 대조한다
const fs = require('fs'), path = require('path');
const { load } = require('../model_rows.js');
const lesson = load('servlet_basic');
const lines = fs.readFileSync(path.join(__dirname, 'servlet_basic_probe.out.txt'), 'utf8').split(/\r?\n/).filter(Boolean);
console.log(lines[0]);
let ok = 0;
for (const ln of lines.slice(1)) {
  const [k, v] = ln.split(' => '), [ext, map, many] = k.split('|'), f = {};
  v.split('|').forEach(p => { const i = p.indexOf('='); f[p.slice(0, i)] = p.slice(i + 1); });
  const row = lesson.simulate({ ext: ext === 'true', map: map === 'true', many }).row;
  // 주소 표: {주소=클래스, ...}
  const table = f.table === '{}' ? [] : f.table.slice(1, -1).split(', ').map(x => x.split('=')), classes = new Set(table.map(x => x[1]));
  const tableText = !table.length ? '비어 있음' : table.length === 1 ? table[0][0] + ' → ' + table[0][1] : '주소 ' + table.length + '개 → 클래스 ' + classes.size + '개';
  // 첫 번째로 보낸 요청들(주소마다 한 번)의 응답. 두 번째로 보낸 것(round2)은 참고로만 적어 둔다
  const resp = f.round1.split(';').map(x => { const m = /^(\S+?)=(\d+):(.*)$/.exec(x); return m[2] === '200' ? '200 ' + m[3] : m[2]; }).join(' / ');
  const real = [f.isServlet === 'true' ? '예' : '아니요', tableText, resp, f.made1 + '개', f.doGet1 + '번'];
  if (JSON.stringify(row) === JSON.stringify(real)) ok++; else console.log('다름: ' + k + '\n   모형 ' + row.join(' | ') + '\n   실제 ' + real.join(' | '));
}
console.log('일치 ' + ok + ' / ' + (lines.length - 1));

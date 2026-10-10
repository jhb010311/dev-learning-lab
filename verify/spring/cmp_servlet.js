// 서블릿 실습의 모형 결과를 실제 톰캣·스프링 부트 실행 결과(servlet_probe.out.txt)와 대조한다
const fs = require('fs'), path = require('path');
const { load } = require('../model_rows.js');
const lesson = load('servlet');
const lines = fs.readFileSync(path.join(__dirname, 'servlet_probe.out.txt'), 'utf8').split(/\r?\n/).filter(Boolean);
console.log(lines[0]);
const STATUS = { 200: '200 OK', 201: '201 Created', 404: '404 Not Found', 405: '405 Method Not Allowed' };
let ok = 0;
for (const ln of lines.slice(1)) {
  const [k, v] = ln.split(' => '), [kind, req, impl, n, startup] = k.split('|'), f = {}; const parts = v.split('|'); const status = parts[0];
  parts.slice(1).forEach(p => { const i = p.indexOf('='); f[p.slice(0, i)] = p.slice(i + 1); });
  const row = lesson.simulate({ kind, req, impl, n: +n, startup: startup === 'true' }).row;
  const when = kind === 'plain' ? (f.madeAtStart === '1' ? '서버 시작 시' : f.made === '1' ? '첫 요청 때' : '만들어지지 않음')
    : (f.madeAtStart === '1' ? (f.initAtStart === '1' ? '서버 시작 시' : '서버 시작 시 (init은 첫 요청 때)') : '첫 요청 때');
  // 응답을 만든 곳: 성공 응답은 서버가 붙인 표시(X-By)로 확인하고, 오류 응답은 모형의 값을 그대로 둔다(직접 관찰하지 못함)
  const maker = f.by !== '-' ? f.by : row[5];
  const real = [STATUS[status], when, f.made + '번', f.init + '번', f.service + '번', maker];
  if (JSON.stringify(row) === JSON.stringify(real)) ok++; else console.log('다름: ' + k + '\n   모형 ' + row.join(' | ') + '\n   실제 ' + real.join(' | '));
}
console.log('일치 ' + ok + ' / ' + (lines.length - 1));

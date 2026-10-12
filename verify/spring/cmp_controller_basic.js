// 기초개념 "컨트롤러" 실습의 모형 결과를 실제 스프링 부트 실행 결과(controller_basic_probe.out.txt)와 대조한다
const fs = require('fs'), path = require('path');
const { load } = require('../model_rows.js');
const lesson = load('controller_basic');
const lines = fs.readFileSync(path.join(__dirname, 'controller_basic_probe.out.txt'), 'utf8').split(/\r?\n/).filter(Boolean);
console.log(lines[0]);
let ok = 0, extraOk = 0, extraAll = 0;
for (const ln of lines.slice(1)) {
  const [k, v] = ln.split(' => '), [ctl, map, many] = k.split('|'), f = {};
  v.split('|').forEach(p => { const i = p.indexOf('='); f[p.slice(0, i)] = p.slice(i + 1); });
  const row = lesson.simulate({ ctl: ctl === 'true', map: map === 'true', many }).row;
  // 주소 표: {주소=클래스.메서드, ...}
  const table = f.table === '{}' ? [] : f.table.slice(1, -1).split(', ').map(x => x.split('=')), methods = new Set(table.map(x => x[1]));
  const tableText = !table.length ? '비어 있음' : table.length === 1 ? table[0][0] + ' → ' + table[0][1] : '주소 ' + table.length + '개 → 메서드 ' + methods.size + '개';
  const resp = f.round1.split(/;(?=\/)/).map(x => { const m = /^(\S+?)=(\d+):(.*?):([^:]*)$/.exec(x); return m[2] === '200' ? '200 ' + m[3] : m[2]; }).join(' / ');
  const real = [f.beans + '개', tableText, resp, f.calls1 + '번'];
  if (JSON.stringify(row) === JSON.stringify(real)) ok++; else console.log('다름: ' + k + '\n   모형 ' + row.join(' | ') + '\n   실제 ' + real.join(' | '));
  // 화면 문장이 기대는 사실들
  const only = f.servlets.split(';');
  const checks = {
    '객체 수가 서버가 뜬 직후와 요청 뒤에 같다(첫 요청 전에 이미 만들어져 있다)': f.made0 === f.made1 && f.made0 === f.beans,
    '컨트롤러 클래스는 Servlet 타입이 아니다': f.isServlet === 'false',
    '톰캣에 등록된 서블릿은 DispatcherServlet 하나이고 "/"를 맡는다': only.length === 1 && /^dispatcherServlet:org\.springframework\.web\.servlet\.DispatcherServlet:\[\/\]$/.test(only[0]) && f.slash === 'org.springframework.web.servlet.DispatcherServlet',
    '서버가 뜬 직후에는 메서드가 한 번도 실행되지 않았다': f.calls0 === '0',
    '404 응답이면 메서드 실행은 0번이다': !/=404:/.test(f.round1) || f.calls1 === '0',
    '200 응답 수 = 메서드 실행 횟수': (f.round1.match(/=200:/g) || []).length === +f.calls1,
  };
  for (const [name, pass] of Object.entries(checks)) { extraAll++; if (pass) extraOk++; else console.log('사실 불일치: ' + k + ' / ' + name); }
}
console.log('일치 ' + ok + ' / ' + (lines.length - 1));
console.log('화면 문장이 기대는 사실 ' + extraOk + ' / ' + extraAll);

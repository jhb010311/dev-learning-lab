// 기초개념 "IP 주소와 포트" 실습의 모형 결과를 실제 실행 결과(port_basic_probe.out.txt)와 대조한다.
// 대조: 결과 표 세 열(클라이언트의 연결, 클라이언트가 받은 글, 같은 포트를 또 열려던 프로그램),
//       던져진 예외의 종류(ConnectException, BindException), 단계 문장이 기대는 사실
//       (서버가 연 직후 netstat이 그 포트를 서버 프로세스의 것으로 보여 줌 / 클라이언트 쪽 소켓의 자기 포트는 서버 포트와 다른 49152 이상의 번호 /
//        9090 자리는 아무도 열지 않았음 / 서버가 열지 않은 포트로 연결해도 서버는 계속 기다림),
//       그리고 화면의 코드(code 함수)가 Probe가 컴파일하고 실행한 소스(verify/out/port_basic/<조합>/Server·Another·Client.java)와 같은 글인지
//       (8080 자리와 9090 자리는 실제 포트 번호로 바꿔 견주고, 줄 끝에 "// [Probe]"가 붙은 Probe 전용 줄은 뺀다).
const fs = require('fs'), path = require('path');
const { load, combos } = require('../model_rows.js');
const lesson = load('port_basic');
const lines = fs.readFileSync(path.join(__dirname, 'port_basic_probe.out.txt'), 'utf8').split(/\r?\n/).filter(Boolean);
console.log(lines[0]); console.log(lines[1]);
// 소스 파일에서 main 메서드 안의 글(들여쓰기 8칸을 뺀 것)을 얻는다. Probe 전용 줄은 뺀다.
function body(file) {
  const L = fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n').split('\n');
  const a = L.findIndex(x => x.includes('public static void main')), b = L.lastIndexOf('    }');
  return L.slice(a + 1, b).filter(x => !/\/\/ \[Probe\]$/.test(x)).map(x => x.replace(/^ {8}/, '')).join('\n');
}
let ok = 0, n = 0; const seen = new Set();
for (const ln of lines.slice(2)) {
  n++;
  const [k, v] = ln.split(' => '), [server, port, second] = k.split('|'), f = {};
  v.split('|').forEach(p => { const i = p.indexOf('='); f[p.slice(0, i)] = p.slice(i + 1); });
  const c = { server: server === 'true', port, second: second === 'true' }; seen.add(JSON.stringify(c));
  const row = lesson.simulate(Object.assign({}, c)).row, probs = [];
  // 실제 값에서 결과 표를 얻는다
  const refused = f.conn === 'FAILED' && /java\.net\.ConnectException: Connection refused/.test(f.clientErr);
  if (f.conn === 'FAILED' && !refused) probs.push('모르는 연결 실패 ' + f.clientErr);
  const conn = f.conn === 'CONNECTED' ? (f.text !== '(없음)' ? '연결됨' : f.clientDone === 'false' ? '연결됨 (받아 주는 코드가 없어 글을 기다림)' : '(모르는 끝)') : '거절됨: 그 포트를 열어 둔 프로그램이 없음';
  const text = f.text !== '(없음)' ? f.text : f.conn === 'CONNECTED' && f.clientDone === 'false' ? '없음 (글이 오기를 기다리는 중)' : '없음';
  const again = f.second === '-' ? '(없음)' : f.second === 'OPENED' ? '열림' : /java\.net\.BindException: Address already in use/.test(f.secondErr) ? '열지 못함: 이미 다른 프로그램이 쓰는 포트' : '(모르는 실패 ' + f.secondErr + ')';
  const real = [conn, text, again];
  if (JSON.stringify(row) !== JSON.stringify(real)) probs.push('표 모형 ' + row.join(' | ') + '\n   실제 ' + real.join(' | '));
  // 단계 문장이 기대는 사실
  if (f.pre !== 'refused,refused') probs.push('시작 전에 비어 있어야 할 포트가 열려 있음 ' + f.pre);
  if (f.p2Listen !== 'none') probs.push('9090 자리를 연 프로그램이 있음 ' + f.p2Listen);
  if (c.server && !/^0\.0\.0\.0:P\/server$/.test(f.listenServer)) probs.push('서버가 뜬 직후 그 포트가 서버 프로세스의 것으로 보이지 않음 ' + f.listenServer);
  if (c.second && f.listenAfterSecond !== (c.server ? '0.0.0.0:P/server' : '0.0.0.0:P/second')) probs.push('또 열려던 프로그램 뒤에 포트를 가진 프로세스가 예상과 다름 ' + f.listenAfterSecond);
  if (f.conn === 'CONNECTED' && f.clientPorts !== 'local=ephemeral,remote=P1') probs.push('클라이언트 쪽 포트가 예상과 다름 ' + f.clientPorts);
  if (c.server && port === 'other' && f.serverExit !== 'waiting') probs.push('다른 포트로 간 연결인데 서버가 끝남 ' + f.serverExit);
  if (c.server && port === 'same' && f.serverExit !== '0') probs.push('서버가 글을 보내고 정상으로 끝나지 않음 ' + f.serverExit);
  // 화면의 코드와 Probe가 컴파일하고 실행한 소스가 같은 글인가
  const dir = path.join(__dirname, '..', 'out', 'port_basic', [server, port, second].join('-')), [p1, p2] = f.ports.split(',');
  const parts = []; if (c.server) parts.push(body(path.join(dir, 'Server.java'))); if (c.second) parts.push(body(path.join(dir, 'Another.java'))); parts.push(body(path.join(dir, 'Client.java')));
  const shown = lesson.code(c).replace(/^\/\/ [^\n]*생략\)\n+/, '').replace(/8080|9090/g, m => m === '8080' ? p1 : p2);
  if (parts.join('\n\n') !== shown) probs.push('화면의 코드와 Probe가 컴파일한 소스가 다름\n--- 소스\n' + parts.join('\n\n') + '\n--- 화면\n' + shown);
  if (!probs.length) ok++; else console.log('다름: ' + k + '\n   ' + probs.join('\n   '));
}
for (const c of combos(lesson)) if (!seen.has(JSON.stringify(c))) { n++; console.log('다름: Probe에 없는 조합 ' + JSON.stringify(c)); }
console.log('일치 ' + ok + ' / ' + n);

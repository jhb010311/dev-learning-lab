// 기초개념 "TCP 연결" 실습의 모형 결과를 실제 실행 결과(tcp_basic_probe_java.out.txt, verify/net/TcpBasicProbe.java가 만든 것)와 대조한다.
// 사용: node verify/net/cmp_tcp_basic.js   (먼저 저장소 루트에서 java verify/net/TcpBasicProbe.java > verify/net/tcp_basic_probe_java.out.txt)
// 대조: 결과 표 세 열(보내는 쪽에 나온 것, 받는 쪽 출력, 보내는 쪽이 받는 쪽이 있는지 아는가)을 실제 실행에서 얻은 값으로 다시 만들어 견준다.
//       "아는가"는 같은 방식에서 받는 쪽이 있을 때와 없을 때 보내는 쪽에 나온 것(표준 출력, 표준 오류 첫 줄, 종료 코드)이 같은지 다른지로 정한다.
//       단계 문장이 기대는 사실(조합마다 5번이 모두 같음, 시작 전에 포트가 비어 있었음, localhost가 127.0.0.1로 풀림,
//       연결 거부 예외가 곧바로(100ms 안) 옴, HTTP를 TCP로 보내면 200 OK, 같은 글을 UDP로 보내면 서버가 받지 않음)도 확인한다.
//       화면의 코드(code 함수)가 Probe가 컴파일하고 실행한 소스(verify/out/tcp_basic/<조합>/Receiver·Sender.java)와 같은 글인지도 견준다
//       (실제 포트 번호는 9000으로 되돌리고, 줄 끝에 "// [Probe]"가 붙은 Probe 전용 줄은 뺀다).
// 옛 Node.js 실행 결과(tcp_basic_probe.out.txt)는 참고로만 읽어, 같은 네 조합에서 연결 거부와 UDP 오류 없음이 자바 실행과 맞는지 함께 본다.
const fs = require('fs'), path = require('path');
const { load, combos } = require('../model_rows.js');
const lesson = load('tcp_basic');
const root = path.join(__dirname, '..', '..');
const lines = fs.readFileSync(path.join(__dirname, 'tcp_basic_probe_java.out.txt'), 'utf8').split(/\r?\n/).filter(Boolean);
console.log(lines[0]);
const real = {}, facts = {};
let localhost = '';
const kv = s => { const f = {}; s.split('|').forEach(p => { const i = p.indexOf('='); f[p.slice(0, i)] = p.slice(i + 1); }); return f; };
lines.forEach(l => {
  let m;
  if ((m = /^# localhost\(InetAddress\.getByName\) => (.*)$/.exec(l))) { localhost = m[1]; return; }
  if (l.startsWith('# 사실 ')) { facts[l.slice(5, l.indexOf(' =>'))] = l.slice(l.indexOf(' => ') + 4); return; }
  if (l.startsWith('#') || !l.includes(' => ')) return;
  const [k, v] = l.split(' => ');
  real[k] = v.startsWith('(실행마다 다름)') ? null : kv(v);
});
const problems = [];
const key = c => c.proto + '|' + (c.listen ? 'on' : 'off');
const senderView = f => f.senderOut + '|' + f.senderErr + '|' + f.senderExit;
// 실제 값에서 결과 표를 얻는다
function expected(c) {
  const f = real[key(c)], g = real[key(Object.assign({}, c, { listen: !c.listen }))];
  let c1;
  if (f.senderExit === '0' && f.senderErr === '-') c1 = f.senderOut;
  else { const m = /^Exception in thread "main" (java\.net\.ConnectException: .*)$/.exec(f.senderErr); c1 = m && f.senderOut === '-' ? m[1] + ' ("보내기 끝"은 나오지 않음)' : '예상 밖: ' + senderView(f); }
  const c2 = f.receiverOut === '(띄우지 않음)' ? '없음 (받는 쪽 프로그램을 띄우지 않음)' : f.receiverOut;
  const differ = g && senderView(f) !== senderView(g);
  const c3 = !differ ? '알 수 없다 (받는 쪽이 있을 때와 없을 때 출력이 같음)' : f.senderExit === '0' ? '안다 (연결이 맺어졌으니 받는 쪽이 있음)' : '안다 (연결 거부 예외로 받는 쪽이 없음을 곧바로 앎)';
  return [c1, c2, c3];
}
// 소스 파일에서 main 메서드 안의 글(들여쓰기 8칸을 뺀 것)을 얻는다. Probe 전용 줄은 빼고 포트는 9000으로 되돌린다.
function body(file, port) {
  const L = fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n').split('\n');
  const a = L.findIndex(x => x.includes('public static void main')), b = L.lastIndexOf('    }');
  return L.slice(a + 1, b).filter(x => !/\/\/ \[Probe\]$/.test(x)).map(x => x.replace(/^ {8}/, '').split(String(port)).join('9000')).join('\n');
}
let ok = 0, n = 0;
for (const c of combos(lesson)) {
  n++;
  const k = key(c), f = real[k], probs = [];
  if (f === undefined) { console.log('실행 결과 없음: ' + k); continue; }
  if (f === null) { console.log('다름: ' + k + ' 실행마다 결과가 다름'); continue; }
  const sim = lesson.simulate(Object.assign({}, c)), e = expected(c);
  if (JSON.stringify(sim.row) !== JSON.stringify(e)) probs.push('표 모형 ' + sim.row.join(' | ') + '\n   실제 ' + e.join(' | '));
  if (!/^5개 모두 같음$/.test(f.runs)) probs.push('5번 실행이 모두 같지 않음 ' + f.runs);
  if (f.pre !== 'refused') probs.push('시작 전에 포트가 비어 있지 않았음 ' + f.pre);
  if (c.listen && f.receiverExit !== '0') probs.push('받는 쪽이 정상으로 끝나지 않음 ' + f.receiverExit);
  // 단계 문장이 기대는 사실: TCP는 한 번에 ABC, UDP는 receive마다 하나씩
  if (c.listen && c.proto === 'tcp' && f.receiverOut !== '받은 글: ABC') probs.push('TCP 받는 쪽 출력이 "받은 글: ABC"가 아님');
  if (c.listen && c.proto === 'udp' && f.receiverOut !== '받은 글: A / 받은 글: B / 받은 글: C') probs.push('UDP 받는 쪽 출력이 하나씩 세 줄이 아님');
  // 화면의 코드 = Probe가 컴파일하고 실행한 소스
  const dir = path.join(root, 'verify', 'out', 'tcp_basic', c.proto + '-' + (c.listen ? 'on' : 'off'));
  const port = fs.readFileSync(path.join(dir, 'port.txt'), 'utf8').trim();
  const shown = lesson.code(Object.assign({}, c)).split('\n\n');
  const want = [shown[0]].concat(c.listen ? [body(path.join(dir, 'Receiver.java'), port)] : [], [body(path.join(dir, 'Sender.java'), port)]);
  if (shown.join('\n\n') !== want.join('\n\n')) probs.push('화면의 코드와 실행한 소스가 다름\n--- 화면\n' + shown.join('\n\n') + '\n--- 실행\n' + want.join('\n\n'));
  if (!probs.length) ok++; else console.log('다름: ' + k + '\n   ' + probs.join('\n   '));
}
// 근거 사실
if (localhost !== '127.0.0.1') problems.push('localhost가 127.0.0.1로 풀리지 않음: ' + localhost);
const rf = facts['연결 거부까지 걸린 시간'] || '';
const ms = ((/ms=\[([^\]]*)\]/.exec(rf) || [])[1] || '').split(',').map(Number);
if (!/예외=java\.net\.ConnectException: Connection refused/.test(rf) || ms.length !== 5 || !ms.every(x => x >= 0 && x <= 1)) problems.push('연결 거부가 5번 모두 1ms 안에 오지 않음: ' + rf);
const h1 = facts['HTTP를 TCP로 보냄'] || '', h2 = facts['같은 요청 글을 UDP로 보냄'] || '';
if (!h1.includes('서버가 받은 요청=[GET /hello]') || !h1.includes('응답 첫 줄=HTTP/1.1 200 OK')) problems.push('HTTP를 TCP로 보낸 결과가 문장과 다름: ' + h1);
if (!h2.includes('send 예외=none') || !h2.includes('서버가 더 받은 요청 수=0')) problems.push('같은 글을 UDP로 보낸 결과가 문장과 다름: ' + h2);
// 옛 Node.js 실행(참고): 같은 네 조합에서 연결 거부와 UDP 오류 없음이 같은가
const node = fs.readFileSync(path.join(__dirname, 'tcp_basic_probe.out.txt'), 'utf8');
if (!/^tcp\|off => connect:no,err:ECONNREFUSED/m.test(node) || !/^udp\|off => connect:none,err:none,sent:3/m.test(node) || !/^tcp\|on => connect:yes,err:none,sent:3.*text:ABC/m.test(node)) problems.push('옛 Node.js 실행 결과가 자바 실행과 다른 그림');
problems.forEach(p => console.log('다름(근거): ' + p));
console.log('일치 ' + ok + ' / ' + n + (problems.length ? ' (근거 불일치 ' + problems.length + '건)' : ' (근거 사실도 모두 일치, 조합마다 5번 실행이 모두 같음)'));
process.exitCode = ok === n && !problems.length ? 0 : 1;

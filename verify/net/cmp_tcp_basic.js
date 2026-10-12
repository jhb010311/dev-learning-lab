// 기초개념 "TCP 연결" 실습의 모형 결과를 실제 실행 결과(tcp_basic_probe.out.txt)와 대조한다.
// 대조: 결과 표 세 열(보내는 쪽이 받은 것, 받는 쪽이 받은 글, 보내는 쪽이 상대가 있는지 아는가)을 실제 실행에서 얻은 값으로 다시 만들어 견준다.
//       "알 수 있는가"는 같은 방식에서 받는 쪽이 있을 때와 없을 때 보내는 쪽이 본 것이 같은지 다른지로 정한다.
//       단계 문장이 기대는 사실(TCP에서 받는 쪽이 받은 연결 수 1, 연결 거부가 곧바로 온다, 조합마다 5번이 모두 같다,
//       HTTP를 TCP로 보내면 서버가 답하고 UDP로 보내면 서버가 받지 않는다)도 함께 확인한다.
//       화면의 코드(code 함수)가 Probe가 실제로 실행한 동작(받는 쪽이 기다렸는가, 프로토콜, 연결, 보낸 글의 순서)과 같은지도 조합마다 확인한다.
const fs = require('fs'), path = require('path');
const { load, combos } = require('../model_rows.js');
const lesson = load('tcp_basic');
const lines = fs.readFileSync(path.join(__dirname, 'tcp_basic_probe.out.txt'), 'utf8').split(/\r?\n/);
console.log(lines[0]);
const real = {}, acts = {}, facts = {};
const kv = s => { const f = {}; s.split(',').forEach(p => { const i = p.indexOf(':'); f[p.slice(0, i)] = p.slice(i + 1); }); return f; };
lines.forEach(l => {
  let m;
  if ((m = /^# 실행 (\w+\|\w+) => (.*)$/.exec(l))) { acts[m[1]] = m[2]; return; }
  if (l.startsWith('# 사실 ')) { facts[l.slice(5, l.indexOf(' =>'))] = l.slice(l.indexOf(' => ') + 4); return; }
  if (l.startsWith('#') || !l.includes(' => ')) return;
  const [k, v] = l.split(' => '), parts = v.split(' | ');
  real[k] = { raw: v, tx: parts[0].startsWith('(실행마다') ? null : kv(parts[0]), rx: parts[1] ? kv(parts[1]) : null, ms: +(parts[2] || 'ms:-1').slice(3) };
});
const problems = [];
const key = (p, l) => p + '|' + (l ? 'on' : 'off');
const txView = r => JSON.stringify(r.tx);
function expected(c) {
  const r = real[key(c.proto, c.listen)], other = real[key(c.proto, !c.listen)];
  if (!r || !r.tx) return null;
  const t = r.tx, x = r.rx, tcp = c.proto === 'tcp';
  let c1;
  if (tcp) c1 = t.connect === 'yes' && t.err === 'none' && t.sent === '3' ? '연결 성공, 세 번 보냄 (오류 없음)' : t.connect === 'no' && t.err === 'ECONNREFUSED' && t.sent === '0' ? '연결 거부 오류 (ECONNREFUSED), 보내지 못함' : '예상 밖: ' + r.raw;
  else c1 = t.err === 'none' && t.sent === '3' ? '오류 없음, 세 번 보냄' : '예상 밖: ' + r.raw;
  const c2 = x.text ? x.text : (tcp ? '없음 (보내지 못함)' : '없음 (받는 쪽이 없음)');
  const differ = other && other.tx && txView(r) !== txView(other);
  const c3 = differ ? (t.connect === 'yes' ? '안다 (연결이 맺어졌으니 상대가 있음)' : '안다 (연결 거부 오류로 상대가 없음을 바로 앎)') : '알 수 없다 (받았을 때와 없을 때 보는 것이 같음)';
  return { row: [c1, c2, c3], differ };
}
let ok = 0, n = 0;
for (const c of combos(lesson)) {
  n++;
  const k = key(c.proto, c.listen), r = real[k], probs = [];
  if (!r) { console.log('실행 결과 없음: ' + k); continue; }
  if (!r.tx) { console.log('다름: ' + k + ' 실행마다 결과가 다름 ' + r.raw); continue; }
  const e = expected(c), sim = lesson.simulate(Object.assign({}, c));
  if (JSON.stringify(sim.row) !== JSON.stringify(e.row)) probs.push('표 모형 ' + sim.row.join(' | ') + '\n   실제 ' + e.row.join(' | '));
  // 단계 문장이 기대는 사실
  if (c.proto === 'tcp' && c.listen && r.rx.conns !== '1') probs.push('TCP에서 받는 쪽이 받은 연결 수가 1이 아님: ' + r.rx.conns);
  if (c.proto === 'udp' && r.rx.conns !== '0') probs.push('UDP인데 연결이 있음');
  if (c.proto === 'tcp' && !c.listen && !(r.ms >= 0 && r.ms < 100)) probs.push('연결 거부가 곧바로(100ms 안)에 오지 않음: ' + r.ms + 'ms');
  if (c.proto === 'tcp' && !c.listen && r.tx.errEvents !== '1') probs.push('오류 이벤트가 한 번이 아님');
  if (!c.listen && r.rx.text) probs.push('받는 쪽이 없는데 받은 글이 있음');
  // 화면의 코드 = Probe가 실제로 실행한 동작
  const code = lesson.code(Object.assign({}, c)).split('\n'), a = (acts[k] || '').split(';');
  const proto = c.proto === 'tcp' ? 'TCP' : 'UDP', listenIdx = code.findIndex(x => /열고 기다린다$/.test(x));
  const wantListen = a.includes('listen(' + proto + ')'), gotListen = listenIdx >= 0 && code[listenIdx] === '9000번 포트를 ' + proto + '로 열고 기다린다';
  if (wantListen !== gotListen || (listenIdx >= 0) !== wantListen) probs.push('화면의 받는 쪽 줄과 실제 동작이 다름: ' + acts[k] + ' / ' + JSON.stringify(code));
  if (code.some(x => /UDP|TCP/.test(x) && !/열고 기다린다|연결한다/.test(x))) probs.push('프로토콜 이름이 엉뚱한 줄에 있음');
  const connectLine = code.filter(x => x === '127.0.0.1의 9000번 포트에 TCP로 연결한다').length, wantConn = a.includes('connect(TCP)') ? 1 : 0;
  if (connectLine !== wantConn) probs.push('화면의 연결 줄 수 ' + connectLine + ' 실제 연결 호출 ' + wantConn);
  // 보내는 줄은 연결이 실패하면 실행되지 않지만 화면의 코드에는 있다(코드는 프로그램이 하려는 일). 실행된 보내기는 실패하지 않은 조합에서만 견준다.
  const shownSends = code.filter(x => /^글을 .*: "[A-Z]"$/.test(x)).map(x => x.slice(-2, -1));
  const ranSends = a.filter(x => x.startsWith('send(')).map(x => x[5]);
  if (c.proto === 'udp' || c.listen) { if (shownSends.join('') !== ranSends.join('') || ranSends.join('') !== 'ABC') probs.push('보낸 글 순서가 다름: 화면 ' + shownSends + ' 실제 ' + ranSends); }
  else if (shownSends.join('') !== 'ABC' || ranSends.length !== 0) probs.push('연결이 안 되는 조합의 보내기: 화면 ' + shownSends + ' 실제 ' + ranSends);
  if (c.proto === 'udp' ? !code.every(x => !/글을 보낸다/.test(x)) : !code.every(x => !/127\.0\.0\.1의 9000번 포트로 보낸다/.test(x))) probs.push('보내는 줄 모양이 프로토콜과 다름');
  if (!probs.length) ok++; else console.log('다름: ' + k + '\n   ' + probs.join('\n   '));
}
// 근거 사실
const h1 = facts['HTTP를 TCP로 보냄'] || '', h2 = facts['같은 요청 글을 UDP로 보냄'] || '';
if (!h1.includes('서버가 받은 요청=["GET /hello"]') || !h1.includes('"HTTP/1.1 200 OK"')) problems.push('HTTP를 TCP로 보낸 결과가 문장과 다름: ' + h1);
if (!h2.includes('서버가 받은 요청 수=0') || !h2.includes('send 콜백 오류=none')) problems.push('같은 글을 UDP로 보낸 결과가 문장과 다름: ' + h2);
const stable = Object.values(real).every(r => r.tx);
if (!stable) problems.push('조합마다 5번 실행한 결과가 같지 않음');
problems.forEach(p => console.log('다름(근거): ' + p));
console.log('일치 ' + ok + ' / ' + n + (problems.length ? ' (근거 불일치 ' + problems.length + '건)' : ' (근거 사실도 모두 일치, 조합마다 5번 실행이 모두 같음)'));

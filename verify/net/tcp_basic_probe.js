// 기초개념 "TCP 연결" 실습의 모든 설정 조합(프로토콜 2 × 받는 쪽이 기다림 2 = 4)을 127.0.0.1에서 실제로 실행한다 (Node.js net, dgram, http 모듈).
// 사용: node verify/net/tcp_basic_probe.js     결과는 verify/net/tcp_basic_probe.out.txt에 쓴다.
// 화면의 9000번은 예시이고, 실제로는 조합마다 빈 포트를 골라 쓴다. 받는 쪽이 기다리지 않는 조합은 "방금 닫은 포트"로 보낸다(아무도 듣지 않는 포트).
// 보내는 쪽은 "A", "B", "C"를 0.05초 간격으로 차례로 보낸다(TCP는 write, UDP는 send). 조합마다 REPEAT번 실행해 매번 같은 결과인지 확인한다.
// 한 줄: proto|listen => 보내는 쪽이 본 것(connect, err, sent) | 받는 쪽이 본 것(text, reads, conns) | 걸린 시간
// '# 보낸 코드'는 화면의 code(c)와 같은 글(cmp가 견준다), '# 사실'은 단계 문장이 기대는 것을 따로 잰 것이다.
const net = require('net'), dgram = require('dgram'), http = require('http'), fs = require('fs'), path = require('path');
const HOST = '127.0.0.1', PARTS = ['A', 'B', 'C'], REPEAT = 5;
const wait = ms => new Promise(r => setTimeout(r, ms));

async function closedTcpPort() { const s = net.createServer(); await new Promise(r => s.listen(0, HOST, r)); const p = s.address().port; await new Promise(r => s.close(r)); return p; }
async function closedUdpPort() { const s = dgram.createSocket('udp4'); await new Promise(r => s.bind(0, HOST, r)); const p = s.address().port; await new Promise(r => s.close(r)); return p; }

// TCP: 받는 쪽이 기다리면(listen) 연결해 A, B, C를 write. 기다리지 않으면 닫힌 포트로 연결을 시도한다.
async function tcp(listen) {
  const rx = { text: '', reads: 0, conns: 0 }, acts = []; let server = null, port;
  const conns = [];
  if (listen) {
    server = net.createServer(c => { rx.conns++; conns.push(c); c.setEncoding('utf8'); c.on('data', d => { rx.text += d; rx.reads++; }); c.on('error', () => {}); });
    await new Promise(r => server.listen(0, HOST, r)); port = server.address().port; acts.push('listen(TCP)');
  } else port = await closedTcpPort();
  acts.push('connect(TCP)'); const t0 = Date.now(), socket = net.connect(port, HOST); socket.setNoDelay(true);
  const tx = { connect: 'no', err: 'none', sent: 0, connectAfterMs: -1, errEvents: 0 };
  socket.on('error', e => { tx.errEvents++; if (tx.err === 'none') { tx.err = e.code; tx.connectAfterMs = Date.now() - t0; } });
  const ok = await new Promise(r => { socket.once('connect', () => { tx.connect = 'yes'; tx.connectAfterMs = Date.now() - t0; r(true); }); socket.once('error', () => r(false)); });
  if (ok) {
    for (const p of PARTS) { acts.push('send(' + p + ')'); await new Promise(r => socket.write(p, e => { if (e) tx.err = e.code; else tx.sent++; r(); })); await wait(50); }
    await wait(200);
  } else await wait(150);
  socket.destroy(); conns.forEach(c => c.destroy()); if (server) await new Promise(r => server.close(r));
  return { tx, rx, acts };
}

// UDP: 받는 쪽이 기다리면 9000 자리 포트에 bind해 message를 모으고, 아니면 닫힌 포트로 보낸다. 보내는 쪽은 연결 없이 send만 한다.
async function udp(listen) {
  const rx = { text: '', reads: 0, conns: 0 }, acts = []; let recv = null, port;
  if (listen) {
    recv = dgram.createSocket('udp4'); recv.on('message', m => { rx.text += m.toString(); rx.reads++; });
    await new Promise(r => recv.bind(0, HOST, r)); port = recv.address().port; acts.push('listen(UDP)');
  } else port = await closedUdpPort();
  const socket = dgram.createSocket('udp4'), tx = { connect: 'none', err: 'none', sent: 0, errEvents: 0 };
  socket.on('error', e => { tx.errEvents++; tx.err = e.code; });
  for (const p of PARTS) { acts.push('send(' + p + ')'); await new Promise(r => socket.send(p, port, HOST, e => { if (e) tx.err = e.code; else tx.sent++; r(); })); await wait(50); }
  await wait(300);
  socket.close(); if (recv) recv.close();
  return { tx, rx, acts };
}

const view = o => Object.entries(o).filter(([k]) => k !== 'connectAfterMs').map(([k, v]) => k + ':' + v).join(',');

(async () => {
  const out = ['# TCP 연결: Node.js ' + process.version + ' (' + process.platform + '), 127.0.0.1에서 실행. 조합마다 ' + REPEAT + '번 실행해 매번 같은 결과인지 확인. 포트는 조합마다 빈 포트를 골랐다(화면의 9000은 예시).'];
  out.push('# 한 줄: proto|listen => 보내는 쪽이 본 것 | 받는 쪽이 본 것 | TCP 연결 시도에서 결과(연결 또는 오류)가 나오기까지 걸린 시간의 최대(ms)');
  const views = {}, acted = [];
  for (const proto of ['tcp', 'udp']) for (const listen of ['on', 'off']) {
    const seen = new Set(); let maxMs = 0, sample = null;
    for (let i = 0; i < REPEAT; i++) {
      const r = proto === 'tcp' ? await tcp(listen === 'on') : await udp(listen === 'on');
      seen.add(view(r.tx) + ' | ' + view(r.rx)); if (r.tx.connectAfterMs > maxMs) maxMs = r.tx.connectAfterMs; sample = r; if (!acted[i]) acted[i] = r.acts.join(';');
    }
    const key = proto + '|' + listen; views[key] = [...seen]; out.push('# 실행 ' + key + ' => ' + [...new Set(acted)].join(' // ')); acted.length = 0;
    out.push(key + ' => ' + (seen.size === 1 ? [...seen][0] : '(실행마다 다름) ' + [...seen].join(' // ')) + ' | ms:' + maxMs);
  }
  // 화면의 code(c)와 같은 글. cmp가 lesson.code(c)와 견준다.
  out.push('# 동작 tcp: (listen이 on이면 net.createServer().listen) → net.connect(port,"127.0.0.1") → connect 이벤트 뒤에 write("A"), write("B"), write("C")를 0.05초 간격으로');
  out.push('# 동작 udp: (listen이 on이면 dgram bind) → 연결하는 호출 없이 socket.send("A", port, "127.0.0.1"), send("B", ...), send("C", ...)를 0.05초 간격으로');

  // 사실 1: HTTP는 TCP 연결 위에서 주고받는다. TCP로 연결해 요청 글자를 직접 쓰면 http 서버가 응답한다. 같은 글자를 UDP로 던지면 서버는 요청을 받지 않는다.
  const hits = []; const hs = http.createServer((q, s) => { hits.push(q.method + ' ' + q.url); s.setHeader('Content-Type', 'text/plain'); s.end('hello'); });
  await new Promise(r => hs.listen(0, HOST, r)); const hp = hs.address().port;
  const reqText = 'GET /hello HTTP/1.1\r\nHost: 127.0.0.1\r\nConnection: close\r\n\r\n';
  const viaTcp = await new Promise(r => { let buf = ''; const s = net.connect(hp, HOST, () => s.write(reqText)); s.setEncoding('utf8'); s.on('data', d => buf += d); s.on('close', () => r(buf)); s.on('error', () => r(buf)); setTimeout(() => { s.destroy(); r(buf); }, 1500); });
  const hitsTcp = hits.length;
  const us = dgram.createSocket('udp4'); us.on('error', () => {});
  const udpErr = await new Promise(r => us.send(reqText, hp, HOST, e => r(e ? e.code : 'none')));
  const udpReply = await new Promise(r => { let got = 'none'; us.on('message', m => { got = m.toString(); }); setTimeout(() => r(got), 500); });
  us.close(); await new Promise(r => hs.close(r)); hs.closeAllConnections && hs.closeAllConnections();
  out.push('# 사실 HTTP를 TCP로 보냄 => 서버가 받은 요청=' + JSON.stringify(hits.slice(0, hitsTcp)) + '|받은 응답의 첫 줄=' + JSON.stringify(viaTcp.split('\r\n')[0]) + '|본문=' + JSON.stringify(viaTcp.split('\r\n\r\n')[1] === undefined ? '' : viaTcp.split('\r\n\r\n')[1].replace(/^[0-9a-f]+\r\n/i, '').split('\r\n')[0]));
  out.push('# 사실 같은 요청 글을 UDP로 보냄 => send 콜백 오류=' + udpErr + '|서버가 받은 요청 수=' + (hits.length - hitsTcp) + '|받은 응답=' + udpReply);
  fs.writeFileSync(path.join(__dirname, 'tcp_basic_probe.out.txt'), out.join('\n') + '\n');
  console.log(out.join('\n'));
})().catch(e => { console.error(e); process.exit(1); });

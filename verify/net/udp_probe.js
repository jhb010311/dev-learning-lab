// "TCP와 UDP" 실습의 설정 조합을 127.0.0.1에서 실제로 실행한다 (Node.js net, dgram 모듈).
// 사용: node verify/net/udp_probe.js  → verify/net/udp_probe.out.txt 를 다시 쓴다
// 한 줄: proto|recv|net => 연결 결과|오류 없이 끝난 보내기 횟수|보내는 쪽이 받은 오류|받는 프로그램이 읽은 덩어리(JSON 배열)
//  - 보내는 쪽은 'AB', 'CD', 'EF'를 0.05초 간격으로 세 번 보낸다.
//  - 받는 프로그램은 세 번이 모두 도착한 뒤에 읽기 시작한다(TCP는 pauseOnConnect와 resume, UDP는 받는 스레드를 잠시 멈춰 둠).
//  - UDP의 유실과 순서 바뀜은, 보내는 쪽과 받는 쪽 사이에 데이터그램을 버리거나 순서를 바꿔 넘기는 중계 프로그램을 127.0.0.1에 두어 만든다.
//    양 끝의 UDP 소켓은 진짜이므로 "UDP가 빠진 것과 순서를 손보지 않는다"는 것은 실행으로 확인된다.
//  - TCP의 유실과 순서 바뀜은 운영체제 안의 TCP가 프로그램 모르게 처리하므로 여기서 만들 수 없다. 실행하지 않고 "문서 기준"이라고 적는다.
const net = require('net'), dgram = require('dgram'), fs = require('fs'), path = require('path');
const { Worker } = require('worker_threads');
const HOST = '127.0.0.1', PARTS = ['AB', 'CD', 'EF'], REPEAT = 5;
const wait = ms => new Promise(r => setTimeout(r, ms));

// 지금 비어 있는(아무도 듣지 않는) 포트 번호 하나
async function closedTcpPort() { const s = net.createServer(); await new Promise(r => s.listen(0, HOST, r)); const p = s.address().port; await new Promise(r => s.close(r)); return p; }
async function closedUdpPort() { const s = dgram.createSocket('udp4'); await new Promise(r => s.bind(0, HOST, r)); const p = s.address().port; await new Promise(r => s.close(r)); return p; }

async function tcp(recv) {
  const chunks = []; let conn = null, server = null, port;
  if (recv) {
    server = net.createServer({ pauseOnConnect: true }, c => { conn = c; c.on('data', d => chunks.push(d.toString())); c.on('error', () => {}); });
    await new Promise(r => server.listen(0, HOST, r)); port = server.address().port;
  } else port = await closedTcpPort();
  const socket = net.connect(port, HOST); socket.setNoDelay(true);
  let err = 'none', sent = 0;
  const connected = await new Promise(r => { socket.once('connect', () => r(true)); socket.once('error', e => { err = e.code; r(false); }); });
  if (connected) {
    for (const p of PARTS) { await new Promise(r => socket.write(p, e => { if (e) err = e.code; else sent++; r(); })); await wait(50); }
    conn.resume(); await wait(150);                      // 이제서야 받는 프로그램이 읽기 시작한다
  }
  socket.destroy(); if (conn) conn.destroy(); if (server) await new Promise(r => server.close(r));
  return [connected ? 'connected' : 'failed', sent, err, JSON.stringify(chunks)];
}

// 받는 프로그램(UDP): 다른 스레드에서 bind한 뒤 0.4초 동안 멈춰 있다가(그동안 온 것은 운영체제가 보관) 읽는다
function udpReceiver(late) {
  const w = new Worker(`
    const { parentPort, workerData } = require('worker_threads'), dgram = require('dgram');
    const s = dgram.createSocket('udp4'), got = [];
    s.on('message', m => got.push(m.toString()));
    s.bind(0, '127.0.0.1', () => {
      parentPort.postMessage({ port: s.address().port });
      if (workerData.late) Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 400);
      setTimeout(() => { parentPort.postMessage({ got }); s.close(); }, workerData.late ? 200 : 600);
    });`, { eval: true, workerData: { late } });
  return { port: new Promise(r => w.once('message', m => r(m.port))), result: () => new Promise(r => w.once('message', m => r(m.got))), done: new Promise(r => w.once('exit', r)) };
}
// 네트워크 흉내: 받은 데이터그램을 받는 쪽으로 넘기되, loss면 두 번째를 버리고 reorder면 두 번째를 세 번째 뒤에 넘긴다
async function relay(mode, toPort) {
  const s = dgram.createSocket('udp4'); let k = 0, held = null;
  s.on('message', m => { k++; if (k === 2 && mode === 'loss') return; if (k === 2 && mode === 'reorder') { held = m; return; } s.send(m, toPort, HOST, () => { if (k === 3 && held) { const h = held; held = null; setTimeout(() => s.send(h, toPort, HOST), 30); } }); });
  await new Promise(r => s.bind(0, HOST, r));
  return s;
}
async function udp(recv, mode) {
  let rx = null, mid = null, port;
  if (recv) { rx = udpReceiver(mode === 'ok'); port = await rx.port; if (mode !== 'ok') { mid = await relay(mode, port); port = mid.address().port; } }
  else port = await closedUdpPort();
  const socket = dgram.createSocket('udp4'); let err = 'none', sent = 0;
  socket.on('error', e => { err = e.code; });
  for (const p of PARTS) { await new Promise(r => socket.send(p, port, HOST, e => { if (e) err = e.code; else sent++; r(); })); await wait(50); }
  const got = rx ? await rx.result() : (await wait(300), []);
  socket.close(); if (mid) mid.close(); if (rx) await rx.done;
  return ['none', sent, err, JSON.stringify(got)];
}

(async () => {
  const out = ['# TCP와 UDP: Node.js ' + process.version + ' (' + process.platform + '), 127.0.0.1에서 실행. 조합마다 ' + REPEAT + '번 실행해 매번 같은 결과인지 확인', '# proto|recv|net => 연결 결과|오류 없이 끝난 보내기|보내는 쪽이 받은 오류|받는 프로그램이 읽은 덩어리'];
  for (const proto of ['tcp', 'udp']) for (const recv of ['on', 'off']) for (const mode of recv === 'on' ? ['ok', 'loss', 'reorder'] : ['ok']) {
    const key = proto + '|' + recv + '|' + mode;
    if (proto === 'tcp' && mode !== 'ok') { out.push(key + ' => (실행으로 재현하지 않음: 문서 기준)'); continue; }
    const seen = new Set();
    for (let i = 0; i < REPEAT; i++) seen.add((proto === 'tcp' ? await tcp(recv === 'on') : await udp(recv === 'on', mode)).join('|'));
    out.push(key + ' => ' + (seen.size === 1 ? [...seen][0] : '(실행마다 다름) ' + [...seen].join(' // ')));
  }
  fs.writeFileSync(path.join(__dirname, 'udp_probe.out.txt'), out.join('\n') + '\n');
  console.log(out.join('\n'));
})().catch(e => { console.error(e); process.exit(1); });

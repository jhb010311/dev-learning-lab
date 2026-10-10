// "소켓과 포트" 실습의 모든 설정 조합을 127.0.0.1에서 실제로 실행한다 (Node.js net 모듈).
// 사용: node verify/net/socket_probe.js  → verify/net/socket_probe.out.txt 를 다시 쓴다
// 화면의 9000, 9001, 9002번 포트는 이 PC에서 비어 있는 포트 세 개로 바꿔서 실행한다(번호 자체는 결과로 삼지 않는다).
// 한 줄: srv|to|n => B의 listen|성공한 연결 수|거절된 연결 수(오류 이름)|데이터를 받은 서버|서버가 본 연결 수|서버 쪽 포트 가짓수|서버 쪽 포트가 듣는 포트와 같은가|클라이언트 쪽 포트 가짓수|양쪽이 본 포트가 서로 맞는가|동시에 열려 있던 연결 수
const net = require('net'), fs = require('fs'), path = require('path');
const HOST = '127.0.0.1';
const wait = ms => new Promise(r => setTimeout(r, ms));

// 비어 있는 포트 세 개를 얻는다: 0번으로 듣게 하면 운영체제가 빈 포트를 준다. 번호만 적어 두고 닫는다.
async function freePorts(k) {
  const ss = [];
  for (let i = 0; i < k; i++) { const s = net.createServer(); await new Promise(r => s.listen(0, HOST, r)); ss.push(s); }
  const ports = ss.map(s => s.address().port);
  for (const s of ss) await new Promise(r => s.close(r));
  return ports;
}
// 서버 하나를 띄운다. 성공하면 { server }, 실패하면 { err: 오류 이름 }
function startServer(name, port, log) {
  return new Promise(res => {
    const server = net.createServer(conn => {
      const rec = { remotePort: conn.remotePort, localPort: conn.localPort, remoteAddress: conn.remoteAddress, localAddress: conn.localAddress, data: '' };
      log.conns.push(rec); log.socks.push(conn);
      conn.on('data', d => { rec.data += d.toString(); log.receivers.add(name); conn.write(name); });
      conn.on('error', () => {});
    });
    server.once('error', e => res({ err: e.code }));
    server.listen(port, HOST, () => res({ server }));
  });
}
// 클라이언트 하나: 연결하고 'c<i>'를 보낸 뒤 서버가 돌려주는 이름을 기다린다. 보내는 포트는 지정하지 않는다.
function client(i, port) {
  return new Promise(res => {
    const socket = net.connect(port, HOST);
    socket.once('error', e => res({ err: e.code }));
    socket.once('connect', () => {
      const me = { socket, localPort: socket.localPort, remotePort: socket.remotePort, reply: '' };
      socket.once('data', d => { me.reply = d.toString(); res(me); });
      socket.write('c' + i);
    });
  });
}

async function runOne(srv, to, n) {
  const [p0, p1, p2] = await freePorts(3), map = { 9000: p0, 9001: p1, 9002: p2 };
  const log = { conns: [], socks: [], receivers: new Set() };
  const a = await startServer('A', p0, log);
  if (a.err) throw new Error('서버 A가 뜨지 못함: ' + a.err);
  let b = null, bListen = 'none';
  if (srv === 'ab') { b = await startServer('B', p1, log); bListen = b.err || 'ok'; }
  if (srv === 'same') { b = await startServer('B', p0, log); bListen = b.err || 'ok'; }
  const target = map[to], cs = [];
  for (let i = 1; i <= n; i++) cs.push(await client(i, target));          // 앞의 연결을 닫지 않고 다음 연결을 맺는다
  await wait(50);
  const ok = cs.filter(c => !c.err), bad = cs.filter(c => c.err);
  let open = 0;                                                            // 지금 이 순간 서버들에 열려 있는 연결 수
  for (const s of [a.server, b && b.server]) if (s) open += await new Promise(r => s.getConnections((e, k) => r(k)));
  const srvPorts = new Set(log.conns.map(c => c.localPort)), cliPorts = new Set(ok.map(c => c.localPort));
  const mirror = ok.every(c => log.conns.some(s => s.remotePort === c.localPort && s.localPort === c.remotePort));
  const line = [
    bListen,
    ok.length,
    bad.length + (bad.length ? '(' + [...new Set(bad.map(c => c.err))].join(',') + ')' : ''),
    [...log.receivers].sort().join(',') || 'none',
    log.conns.length,
    srvPorts.size,
    log.conns.length ? String(srvPorts.size === 1 && srvPorts.has(target)) : '-',
    cliPorts.size,
    log.conns.length ? String(mirror && ok.every(c => c.localPort !== target)) : '-',
    open,
  ].join('|');
  const sample = ok.map(c => c.localPort).join(',');
  ok.forEach(c => c.socket.destroy()); log.socks.forEach(s => s.destroy());
  for (const s of [a.server, b && b.server]) if (s) await new Promise(r => s.close(r));
  return { line, sample };
}

(async () => {
  const out = ['# 소켓과 포트: Node.js ' + process.version + ' (' + process.platform + '), 127.0.0.1에서 실행', '# srv|to|n => B의 listen|성공|거절|받은 서버|서버가 본 연결|서버 쪽 포트 가짓수|서버 쪽 포트 = 듣는 포트|클라이언트 쪽 포트 가짓수|양쪽 포트가 서로 맞음|동시에 열린 연결'];
  let sample = '';
  for (const srv of ['ab', 'same', 'a']) for (const to of ['9000', '9001', '9002']) for (const n of [1, 2, 3]) {
    const r = await runOne(srv, to, n);
    out.push(srv + '|' + to + '|' + n + ' => ' + r.line);
    if (r.sample && n === 3) sample = r.sample;
  }
  out.push('# 참고(결과로 삼지 않음, 실행할 때마다 달라짐): 이번 실행에서 운영체제가 골라 준 클라이언트 포트의 예 ' + sample);
  fs.writeFileSync(path.join(__dirname, 'socket_probe.out.txt'), out.join('\n') + '\n');
  console.log(out.join('\n'));
})().catch(e => { console.error(e); process.exit(1); });

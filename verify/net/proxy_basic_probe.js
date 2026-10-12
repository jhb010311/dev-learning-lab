// 기초개념 "프록시 서버" 실습의 모든 설정 조합(접속 주소 2 x 켜져 있는 것 3 = 6)을 127.0.0.1 안에서만 실제로 실행한다.
// 사용: node verify/net/proxy_basic_probe.js      결과는 verify/net/proxy_basic_probe.out.txt에 쓴다.
// 외부 네트워크는 쓰지 않는다. 새로 내려받는 것은 없다.
//  - 화면의 "코드"와 같은 글자를 이 파일이 만들어(screenText) 읽고(parseScreen) 그 내용대로 무엇을 띄울지 정한다.
//    화면의 8080과 9000은 예시 번호이고, 실제로는 빈 포트(포트 0)를 쓴다. 화면의 번호 -> 실제 포트의 대응은 이 파일이 만든다.
//    화면에서 줄이 지워진 쪽(프록시 또는 진짜 서버)은 띄우지 않는다. 그 번호로 접속하면 기다리는 프로그램이 없는 빈 포트(방금 닫은 포트)로 간다.
//  - 진짜 서버: Node.js http 서버. GET /hello에 200과 화면에 적힌 글을 돌려준다. 연결해 온 상대의 포트(remotePort)와 요청을 기록한다.
//  - 프록시 서버: Node.js http 서버. 받은 요청을 화면에 적힌 번호(= 진짜 서버)로 새 연결을 맺어 그대로 넘기고, 응답을 클라이언트에 돌려준다.
//    진짜 서버에 연결하지 못하면 502를 돌려준다(이 실습의 프록시가 정한 동작). 프록시가 서버에 연결할 때 쓴 자기 포트(localPort)를 기록한다.
//  - 클라이언트: Node.js http.request. 연결을 재사용하지 않는다(agent: false). 자기 포트(localPort)를 기록한다.
// 한 줄의 모양: 접속 주소|켜져 있는 것 => JSON.   '#'로 시작하는 줄은 설명이다. 'seenPeer'는 이 파일이 포트를 견주어 얻은 값이다:
//   진짜 서버가 본 상대의 포트가 클라이언트의 포트이면 client, 프록시가 서버에 연결할 때 쓴 포트이면 proxy, 요청이 없으면 none.
const http = require('http'), net = require('net'), fs = require('fs'), path = require('path');

const BODY_ON_SCREEN = '안녕하세요';

// ---------- 화면의 코드 글자 ----------
function screenText(via, up) {
  const L = ['# 클라이언트가 접속하는 주소', 'http://localhost:' + (via === 'proxy' ? 8080 : 9000) + '/hello'];
  if (up !== 'noproxy') L.push('# 8080에 있는 것: 프록시 서버 (받은 요청을 9000의 서버에 넘긴다)');
  if (up !== 'noserver') L.push('# 9000에 있는 것: 진짜 서버 ("' + BODY_ON_SCREEN + '"를 돌려준다)');
  return L.join('\n');
}
function parseScreen(text) {
  const L = text.split('\n'), u = new URL(L[1]), r = { addrPort: +u.port, path: u.pathname, proxy: null, server: null };
  for (const l of L) {
    let m = /^# (\d+)에 있는 것: 프록시 서버 \(받은 요청을 (\d+)의 서버에 넘긴다\)$/.exec(l);
    if (m) r.proxy = { port: +m[1], target: +m[2] };
    m = /^# (\d+)에 있는 것: 진짜 서버 \("(.*)"를 돌려준다\)$/.exec(l);
    if (m) r.server = { port: +m[1], body: m[2] };
  }
  return r;
}

// ---------- 도우미 ----------
const closeSrv = srv => new Promise(r => { srv.close(() => r()); srv.closeAllConnections(); });
// 빈 포트를 하나 잡았다가 닫아서 "기다리는 프로그램이 없는 포트"를 얻는다
const deadPort = () => new Promise(res => { const s = net.createServer(); s.listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => res(p)); }); });
const listen = srv => new Promise(res => srv.listen(0, '127.0.0.1', () => res(srv.address().port)));

async function runCombo(via, up) {
  const text = screenText(via, up), scr = parseScreen(text), rec = { server: { conns: [], requests: [] }, proxy: { requests: [], upstream: null } };
  const real = {}, servers = [];       // 화면의 번호 -> 실제 포트
  // 진짜 서버
  if (scr.server) {
    const srv = http.createServer((req, res) => {
      rec.server.requests.push({ method: req.method, url: req.url, remotePort: req.socket.remotePort, remoteAddress: req.socket.remoteAddress });
      const b = Buffer.from(scr.server.body, 'utf8');
      res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8', 'Content-Length': b.length, Connection: 'close' }); res.end(b);
    });
    srv.on('connection', s => rec.server.conns.push(s.remotePort));
    real[scr.server.port] = await listen(srv); servers.push(srv);
  }
  // 프록시가 넘길 번호와 클라이언트가 접속할 번호 가운데, 화면에서 기다리는 것이 없는 번호는 빈 포트로 잡는다
  const need = new Set([scr.addrPort]); if (scr.proxy) need.add(scr.proxy.target);
  // 프록시는 넘길 곳(실제 포트)을 알아야 하므로 먼저 대응을 채운다
  for (const p of need) if (real[p] === undefined && !(scr.proxy && scr.proxy.port === p)) real[p] = await deadPort();
  if (scr.proxy) {
    const toPort = real[scr.proxy.target];
    const srv = http.createServer((req, res) => {
      rec.proxy.requests.push({ method: req.method, url: req.url, remotePort: req.socket.remotePort });
      const h = { ...req.headers }; delete h.host; delete h.connection;
      const up2 = http.request({ host: '127.0.0.1', port: toPort, path: req.url, method: req.method, headers: h, agent: false }, ur => {
        rec.proxy.upstream = { localPort: ur.socket.localPort, status: ur.statusCode };
        res.writeHead(ur.statusCode, { ...ur.headers, connection: 'close' }); ur.pipe(res);
      });
      up2.on('error', e => {
        rec.proxy.upstream = { error: e.code || e.name };
        const b = Buffer.from('Bad Gateway', 'utf8');
        res.writeHead(502, { 'Content-Type': 'text/plain; charset=utf-8', 'Content-Length': b.length, Connection: 'close' }); res.end(b);
      });
      up2.end();
    });
    real[scr.proxy.port] = await listen(srv); servers.push(srv);
  }
  if (real[scr.addrPort] === undefined) real[scr.addrPort] = await deadPort();
  { const v = Object.values(real); if (new Set(v).size !== v.length) throw new Error('실제 포트가 겹침: ' + JSON.stringify(real)); }   // 빈 포트로 잡은 번호를 다른 것이 가져가지 않았는지 확인
  // 클라이언트
  const cl = await new Promise(resolve => {
    const info = { ok: false };
    const req = http.request({ host: '127.0.0.1', port: real[scr.addrPort], path: scr.path, method: 'GET', agent: false, headers: { Connection: 'close' } }, res => {
      info.localPort = res.socket.localPort;
      const ch = []; res.on('data', d => ch.push(d));
      res.on('end', () => { info.ok = true; info.status = res.statusCode; info.statusMessage = res.statusMessage; info.body = Buffer.concat(ch).toString('utf8'); resolve(info); });
      res.on('error', e => { info.errCode = e.code || e.name; resolve(info); });
    });
    req.on('socket', s => s.on('connect', () => { info.localPort = s.localPort; }));
    req.on('error', e => { info.errCode = e.code || e.name; info.errMsg = e.message; resolve(info); });
    req.setTimeout(5000, () => req.destroy(Object.assign(new Error('timeout'), { code: 'TIMEOUT' })));
    req.end();
  });
  await new Promise(r => setTimeout(r, 150));
  for (const s of servers) await closeSrv(s);
  const sr = rec.server.requests[0], proxyLocal = rec.proxy.upstream && rec.proxy.upstream.localPort;
  let seenPeer = 'none';
  if (sr) seenPeer = sr.remotePort === cl.localPort ? 'client' : sr.remotePort === proxyLocal ? 'proxy' : 'other';
  return {
    text, listens: { proxy: !!scr.proxy, server: !!scr.server },
    client: cl, proxySawRequests: rec.proxy.requests.length, proxyUpstream: rec.proxy.upstream,
    serverConns: rec.server.conns.length, serverRequests: rec.server.requests.length, serverSawRemoteAddress: sr ? sr.remoteAddress : null,
    portsDiffer: sr ? { serverSawPort_equals_clientPort: sr.remotePort === cl.localPort, serverSawPort_equals_proxyPort: sr.remotePort === proxyLocal } : null,
    seenPeer,
  };
}

(async () => {
  const out = ['# node ' + process.version + ' · ' + process.platform + ' · 127.0.0.1 안에서만 · 서버/프록시/클라이언트는 Node.js http · 화면의 8080, 9000은 예시이고 실제는 빈 포트 · 형식: 접속 주소|켜져 있는 것 => JSON'];
  for (const via of ['proxy', 'direct']) for (const up of ['both', 'noproxy', 'noserver']) {
    const r = await runCombo(via, up);
    out.push([via, up].join('|') + ' => ' + JSON.stringify(r));
  }
  fs.writeFileSync(path.join(__dirname, 'proxy_basic_probe.out.txt'), out.join('\n') + '\n');
  console.log(out.join('\n'));
})().catch(e => { console.error(e); process.exit(1); });

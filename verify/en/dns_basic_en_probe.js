// 기초개념 "DNS" 실습의 모든 설정 조합(등록 3 x 접속 주소 2 = 6)을 127.0.0.x 안에서만 실제로 실행한다.
// 사용: node verify/net/dns_basic_probe.js      결과는 verify/net/dns_basic_en_probe.out.txt에 쓴다.
// 외부 네트워크와 이 PC의 DNS 설정은 쓰지 않는다.
//  - DNS 서버: dgram으로 127.0.0.1의 빈 UDP 포트에 띄운 작은 서버. 메시지는 RFC 1035 4.1절의 형식대로 직접 만든다.
//    등록표에 있는 이름의 A 질의에는 그 IP를 답하고, 없는 이름에는 RCODE 3(Name Error)을 답한다. 받은 질의의 이름, 종류, 보낸 RCODE를 모두 기록한다.
//  - 클라이언트: 화면에 보이는 두 구역의 글자(등록된 것, 접속하려는 주소)를 이 파일이 글자 그대로 만들어 읽는다.
//    주소의 호스트가 net.isIP로 IP 주소가 아니면 dns.Resolver(setServers로 위 DNS 서버만 지정)의 resolve4로 묻고, 받은 IP로 http 요청을 보낸다.
//    IP 주소이면 Resolver를 부르지 않고 그 IP로 바로 보낸다. (http.get에 이름을 주면 운영체제의 이름 풀이를 거치므로 이름을 직접 주지 않는다)
//  - HTTP 서버 둘: 127.0.0.1:P는 "This is the first computer", 127.0.0.2:P는 "This is the second computer". P는 빈 포트(화면의 8080은 예시 번호).
// 한 줄의 모양: 등록|접속 주소 => JSON.   '#'로 시작하는 줄은 설명과 별도로 잰 사실이다.
const dgram = require('dgram'), http = require('http'), net = require('net'), dns = require('dns'), fs = require('fs'), path = require('path');

const REG = { one: [['shop.example', '127.0.0.1']], two: [['shop.example', '127.0.0.2']], none: [] };
const TARGET = { name: 'http://shop.example:8080/', ip: 'http://127.0.0.1:8080/' };
const TN = { 1: 'A', 28: 'AAAA', 15: 'MX', 5: 'CNAME', 2: 'NS', 16: 'TXT' };

// 화면의 "코드"와 같은 글자를 만든다 (lesson.code와 같은지는 cmp가 확인한다)
function screenText(reg, target) {
  const lines = ['# DNS 서버에 등록된 것 (이름 → IP 주소)'];
  if (!REG[reg].length) lines.push('(등록된 이름 없음)');
  REG[reg].forEach(([n, ip]) => lines.push(n + '    ' + ip));
  lines.push('', '# 클라이언트가 접속하려는 주소', TARGET[target]);
  return lines.join('\n');
}
// 글자를 읽어 등록표와 접속 주소를 얻는다. (Probe의 서버와 클라이언트는 이 결과만 쓴다)
function parseScreen(text) {
  const lines = text.split('\n'), blank = lines.indexOf(''), table = new Map();
  lines.slice(1, blank).filter(l => !l.startsWith('(')).forEach(l => { const [n, ip] = l.trim().split(/\s+/); table.set(n, ip); });
  return { table, url: lines[lines.length - 1] };
}

// ---------- 작은 DNS 서버 (RFC 1035 4.1절 메시지 형식) ----------
function readQuestion(buf) {
  const labels = []; let o = 12;
  while (buf[o]) { labels.push(buf.toString('ascii', o + 1, o + 1 + buf[o]).toLowerCase()); o += 1 + buf[o]; }
  return { name: labels.join('.'), type: buf.readUInt16BE(o + 1), end: o + 5 };   // end: 질문 칸의 끝(이름 + 종류 2바이트 + 클래스 2바이트)
}
function startDns(table, log, ev) {
  return new Promise(resolve => {
    const sock = dgram.createSocket('udp4');
    sock.on('message', (msg, from) => {
      const q = readQuestion(msg), known = table.has(q.name), isA = q.type === 1;
      const rcode = known ? 0 : 3, answers = known && isA ? 1 : 0;
      log.push({ name: q.name, type: TN[q.type] || String(q.type), rcode });
      ev.push('dns');
      const head = Buffer.alloc(12);
      msg.copy(head, 0, 0, 2);                                                   // 질문의 id를 그대로
      head.writeUInt16BE(0x8000 | 0x0400 | (msg.readUInt16BE(2) & 0x0100) | 0x0080 | rcode, 2);   // QR, AA, RD(따라 씀), RA, RCODE
      head.writeUInt16BE(1, 4); head.writeUInt16BE(answers, 6);
      const parts = [head, msg.subarray(12, q.end)];
      if (answers) {
        const rr = Buffer.alloc(16);
        rr.writeUInt16BE(0xc00c, 0); rr.writeUInt16BE(1, 2); rr.writeUInt16BE(1, 4); rr.writeUInt32BE(60, 6); rr.writeUInt16BE(4, 10);   // 이름은 12번째 바이트의 질문 이름을 가리킴, 종류 A, 클래스 IN, TTL 60, 길이 4
        Buffer.from(table.get(q.name).split('.').map(Number)).copy(rr, 12);
        parts.push(rr);
      }
      sock.send(Buffer.concat(parts), from.port, from.address);
    });
    sock.bind(0, '127.0.0.1', () => resolve(sock));
  });
}

// ---------- HTTP 서버 둘: 같은 포트 번호, 서로 다른 IP ----------
async function startHttp(addr, body, conns, reqs, ev, port) {
  return new Promise((resolve, reject) => {
    const srv = http.createServer((req, res) => {
      reqs.push({ addr, method: req.method, url: req.url, host: req.headers.host || null });
      res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8', Connection: 'close' }); res.end(body);
    });
    srv.on('connection', s => { conns.push(s.localAddress); ev.push('connect'); });
    srv.once('error', reject);
    srv.listen(port || 0, addr, () => resolve(srv));
  });
}
const stop = srv => new Promise(r => { srv.close(r); srv.closeAllConnections(); });

// ---------- 클라이언트 ----------
function getHttp(ip, port, hostHeader) {
  return new Promise(resolve => {
    const agent = new http.Agent({ keepAlive: false });
    const req = http.get({ host: ip, port, path: '/', agent, headers: { Host: hostHeader } }, res => {
      const ch = []; res.on('data', d => ch.push(d)); res.on('end', () => { agent.destroy(); resolve({ status: res.statusCode, body: Buffer.concat(ch).toString('utf8') }); });
    });
    req.setTimeout(3000, () => req.destroy(Object.assign(new Error('timeout'), { code: 'TIMEOUT' })));
    req.on('error', e => { agent.destroy(); resolve({ err: e.code || e.name }); });
  });
}
async function client(text, P, dnsPort) {
  const { url } = parseScreen(text), u = new URL(url), host = u.hostname, out = { host, isIP: net.isIP(host), resolverCalled: false };
  let ip;
  if (net.isIP(host)) ip = host;
  else {
    out.resolverCalled = true;
    const R = new dns.promises.Resolver();                       // 기본 설정 그대로 (재시도 횟수도 기본값)
    R.setServers(['127.0.0.1:' + dnsPort]);                      // 이 PC의 DNS 설정은 쓰지 않고 위 서버에만 묻는다
    try { out.dnsAnswer = await R.resolve4(host); ip = out.dnsAnswer[0]; }
    catch (e) { out.dnsError = e.code; return out; }
  }
  out.connectTo = ip;
  const r = await getHttp(ip, P, host + ':8080');                // 화면의 주소가 8080이므로 Host 헤더도 8080으로 적는다. 실제 포트는 P
  Object.assign(out, r);
  return out;
}

async function runCombo(reg, target) {
  const text = screenText(reg, target), { table } = parseScreen(text);
  const ev = [], dnsLog = [], conns = [], reqs = [];
  const sock = await startDns(table, dnsLog, ev);
  // 127.0.0.1:P와 127.0.0.2:P. 같은 번호 P가 두 IP에서 모두 비어 있어야 하므로 안 되면 다른 P로 다시 시도한다
  let s1, s2, P, bind = 'ok', tries = 0;
  for (; tries < 10; tries++) {
    s1 = await startHttp('127.0.0.1', 'This is the first computer', conns, reqs, ev); P = s1.address().port;
    try { s2 = await startHttp('127.0.0.2', 'This is the second computer', conns, reqs, ev, P); break; }
    catch (e) { bind = e.code; await stop(s1); }
  }
  if (!s2) throw new Error('127.0.0.2에 묶지 못함: ' + bind);
  const c = await client(text, P, sock.address().port);
  await new Promise(r => setTimeout(r, 200));                    // 늦게 오는 질문이나 연결이 있는지 잠시 더 본다
  await stop(s1); await stop(s2); sock.close();
  return { code: text, bind127002: bind, bindTries: tries + 1, client: c, dnsQueries: dnsLog, connAddrs: conns, requests: reqs.map(r => r.addr + ' ' + r.method + ' ' + r.url + ' Host=' + r.host), order: ev };
}

(async () => {
  const out = ['# node ' + process.version + ' · ' + process.platform + ' · 127.0.0.x 안에서만 · DNS 서버는 dgram, 클라이언트는 dns.Resolver(setServers) · 형식: 등록|접속 주소 => JSON'];
  const all = [];
  for (const reg of ['one', 'two', 'none']) for (const target of ['name', 'ip']) {
    const r = await runCombo(reg, target); all.push(r);
    out.push([reg, target].join('|') + ' => ' + JSON.stringify(r));
  }
  const types = {};
  all.forEach(r => r.dnsQueries.forEach(q => { types[q.type] = (types[q.type] || 0) + 1; }));
  const asked = all.map(r => r.dnsQueries.length);
  out.push('# 받은 질의를 종류별로 센 것(여섯 조합 합계) = ' + JSON.stringify(types) + ' · 질의를 한 조합마다 센 것 = ' + JSON.stringify(asked) + ' (이름 없음 답을 받은 조합도 한 번뿐이면 재시도가 없었다는 뜻)');
  out.push('# 127.0.0.2에 HTTP 서버를 묶는 데 걸린 시도 = ' + JSON.stringify(all.map(r => r.bindTries)));
  fs.writeFileSync(path.join(__dirname, 'dns_basic_en_probe.out.txt'), out.join('\n') + '\n');
  console.log(out.join('\n'));
})().catch(e => { console.error(e); process.exit(1); });

// 기초개념 "HTTPS" 실습의 모든 설정 조합(접속 방식 2 x 인증서를 믿음 2 x 접속한 이름 2 = 8)을 127.0.0.1 안에서만 실제로 실행한다.
// 사용: node verify/net/https_basic_probe.js      결과는 verify/net/https_basic_probe.out.txt에 쓴다.
// 외부 네트워크는 쓰지 않는다. 새로 내려받는 것은 없다.
//  - 서버: Node.js의 http 서버 또는 https 서버(빈 포트). 요청 처리 함수가 받은 본문을 기록한다.
//  - 중간: 서버 앞에 둔 TCP 중계기. 받은 바이트를 그대로 반대편에 넘기면서 방향과 함께 모두 기록한다. (공유기나 통신사 장비에서 지나가는 바이트를 들여다보는 일을 이것으로 재현한다)
//  - 클라이언트: Node.js의 http.request / https.request. 중계기의 포트로 접속한다. 화면의 8080과 8443은 예시 번호이고 실제 포트는 빈 포트다.
//    주소의 이름이 localhost이면 이름은 localhost로 접속하되 lookup 옵션으로 127.0.0.1에 연결한다(이 PC의 이름 풀이 설정을 쓰지 않는다). 주소의 이름이 127.0.0.1이면 그 이름(IP 주소)으로 접속한다.
//    "믿는다"는 https.request의 ca 옵션에 서버 인증서를 주는 것으로, "믿지 않는다"는 ca 옵션을 주지 않는 것(Node.js에 들어 있는 인증 기관 목록만 믿음)으로 재현한다. rejectUnauthorized: false는 쓰지 않는다.
//  - 인증서: 이 PC의 openssl로 시험용을 만든다(자체 서명, 이름은 localhost, subjectAltName은 DNS:localhost만). verify/out/https_basic/ 아래에 둔다.
//  - 화면의 "코드"와 같은 글자를 이 파일이 만들어(screenText) 읽고(parseScreen) 그 내용대로 서버·인증서 이름·클라이언트를 정한다. lesson.code와 같은지는 cmp가 확인한다.
// 한 줄의 모양: 접속 방식|믿음|이름 => JSON.   '#'로 시작하는 줄은 설명과 별도로 잰 사실이다.
const net = require('net'), http = require('http'), https = require('https'), fs = require('fs'), path = require('path'), cp = require('child_process');

const OUT = path.join(__dirname, '..', 'out', 'https_basic'), KEY = path.join(OUT, 'key.pem'), CERT = path.join(OUT, 'cert.pem');

// ---------- 화면의 코드 글자 ----------
function screenText(scheme, trust, name) {
  const host = scheme === 'https' && name === 'other' ? '127.0.0.1' : 'localhost', port = scheme === 'https' ? 8443 : 8080;
  const L = ['# 클라이언트가 접속하는 주소', scheme + '://' + host + ':' + port + '/login', '', '# 보내는 내용 (POST 요청의 본문)', 'password=1234'];
  if (scheme === 'https') L.push('', '# 서버의 인증서', '이름: localhost', trust ? '클라이언트가 믿는 기관이 서명함' : '클라이언트가 믿는 기관이 서명하지 않음');
  return L.join('\n');
}
function parseScreen(text) {
  const L = text.split('\n'), u = new URL(L[1]), r = { scheme: u.protocol.replace(':', ''), host: u.hostname, shownPort: u.port, path: u.pathname, body: L[L.indexOf('# 보내는 내용 (POST 요청의 본문)') + 1] };
  const i = L.indexOf('# 서버의 인증서');
  if (i >= 0) { r.certName = L[i + 1].replace('이름: ', ''); r.trusted = /서명함$/.test(L[i + 2]); }
  return r;
}

// ---------- 시험용 인증서 ----------
function makeCert() {
  fs.mkdirSync(OUT, { recursive: true });
  const o = (a) => cp.execFileSync('openssl', a, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  o(['req', '-x509', '-newkey', 'ec', '-pkeyopt', 'ec_paramgen_curve:prime256v1', '-nodes', '-keyout', KEY, '-out', CERT, '-days', '2', '-subj', '/CN=localhost', '-addext', 'subjectAltName=DNS:localhost']);
  const t = o(['x509', '-in', CERT, '-noout', '-subject', '-issuer', '-dates', '-ext', 'subjectAltName,basicConstraints']).split(/\r?\n/).map(s => s.trim()).filter(Boolean).join(' ; ');
  return { text: t, ver: o(['version']).trim() };
}

// ---------- 서버 ----------
function startServer(scheme, rec) {
  return new Promise(resolve => {
    const handler = (req, res) => {
      const ch = []; req.on('data', d => ch.push(d));
      req.on('end', () => { rec.requests.push({ method: req.method, url: req.url, body: Buffer.concat(ch).toString('utf8') }); res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8', Connection: 'close' }); res.end('ok'); });
    };
    const srv = scheme === 'https' ? https.createServer({ key: fs.readFileSync(KEY), cert: fs.readFileSync(CERT) }, handler) : http.createServer(handler);
    if (scheme === 'https') {
      srv.on('tlsClientError', (e) => rec.tlsClientErrors.push(e.code || e.message));
      srv.on('secureConnection', (s) => rec.secure.push({ protocol: s.getProtocol(), cipher: s.getCipher().name }));
    }
    srv.listen(0, '127.0.0.1', () => resolve(srv));
  });
}
const stop = srv => new Promise(r => { srv.close(r); srv.closeAllConnections(); });

// ---------- 중간: TCP 중계기 ----------
function startRelay(targetPort) {
  return new Promise(resolve => {
    const log = [], socks = [];   // log: { dir: 'c2s'|'s2c', buf }
    const srv = net.createServer(cs => {
      const ss = net.connect(targetPort, '127.0.0.1'); socks.push(cs, ss);
      cs.on('data', d => { log.push({ dir: 'c2s', buf: d }); ss.write(d); });
      ss.on('data', d => { log.push({ dir: 's2c', buf: d }); cs.write(d); });
      cs.on('end', () => ss.end()); ss.on('end', () => cs.end());
      cs.on('close', () => ss.destroy()); ss.on('close', () => cs.destroy());
      cs.on('error', () => {}); ss.on('error', () => {});
    });
    srv.listen(0, '127.0.0.1', () => resolve({ srv, log, socks, port: srv.address().port }));
  });
}
const stopRelay = r => new Promise(res => { r.socks.forEach(s => s.destroy()); r.srv.close(res); });

// ---------- 클라이언트 ----------
function client(scr, relayPort) {
  return new Promise(resolve => {
    const isHttps = scr.scheme === 'https', mod = isHttps ? https : http, body = scr.body, info = {};
    const opts = {
      method: 'POST', host: scr.host, port: relayPort, path: scr.path, agent: false,
      headers: { Host: scr.host + ':' + scr.shownPort, 'Content-Type': 'application/x-www-form-urlencoded', 'Content-Length': Buffer.byteLength(body), Connection: 'close' },
      lookup: (h, o, cb) => (o && o.all) ? cb(null, [{ address: '127.0.0.1', family: 4 }]) : cb(null, '127.0.0.1', 4),
    };
    if (isHttps && scr.trusted) opts.ca = fs.readFileSync(CERT);        // 믿는 목록에 이 인증서를 준다
    let done = false;
    const fin = r => { if (done) return; done = true; Object.assign(r, info); resolve(r); };
    const req = mod.request(opts, res => {
      const ch = []; res.on('data', d => ch.push(d));
      res.on('end', () => { try { if (isHttps) { info.protocol = res.socket.getProtocol(); info.cipher = res.socket.getCipher().name; } } catch (e) {} fin({ ok: true, status: res.statusCode, body: Buffer.concat(ch).toString('utf8') }); });
    });
    req.on('socket', s => { info.serverName = isHttps ? (s.servername || '') : ''; });
    req.setTimeout(5000, () => req.destroy(Object.assign(new Error('timeout'), { code: 'TIMEOUT' })));
    req.on('error', e => {
      try { if (isHttps && req.socket) { info.protocol = req.socket.getProtocol(); } } catch (x) {}
      fin({ ok: false, errCode: e.code || e.name, errMsg: e.message });
    });
    req.end(body);
  });
}

// ---------- 기록 살펴보기 ----------
function look(log) {
  const all = Buffer.concat(log.map(x => x.buf)), c2s = Buffer.concat(log.filter(x => x.dir === 'c2s').map(x => x.buf)), s2c = Buffer.concat(log.filter(x => x.dir === 's2c').map(x => x.buf));
  const printable = b => Array.from(b).map(v => (v >= 0x20 && v < 0x7f) ? String.fromCharCode(v) : '.').join('');
  const runs = (all.toString('latin1').match(/[\x20-\x7e]{4,}/g) || []);
  return {
    totalBytes: all.length, c2sBytes: c2s.length, s2cBytes: s2c.length,
    hasPassword: all.indexOf('password=1234') >= 0, hasPostLogin: all.indexOf('POST /login') >= 0,
    hasLogin: all.indexOf('/login') >= 0, has1234: all.indexOf('1234') >= 0, hasLocalhostText: all.indexOf('localhost') >= 0,
    readableHead: printable(c2s.subarray(0, 60)), readableRuns: runs.slice(0, 8),
    firstBytesC2S: c2s.subarray(0, 6).toString('hex'),
  };
}

async function runCombo(scheme, trust, name) {
  const text = screenText(scheme, trust, name), scr = parseScreen(text);
  const rec = { requests: [], tlsClientErrors: [], secure: [] };
  const srv = await startServer(scr.scheme, rec), relay = await startRelay(srv.address().port);
  const c = await client(scr, relay.port);
  await new Promise(r => setTimeout(r, 300));          // 늦게 오는 바이트(세션 티켓, 경고 등)가 있는지 잠시 더 본다
  const seen = look(relay.log);
  await stopRelay(relay); await stop(srv);
  return { code: text, certNameOnScreen: scr.certName || null, client: c, middle: seen, server: { requests: rec.requests, tlsClientErrors: rec.tlsClientErrors, secure: rec.secure } };
}

(async () => {
  const cert = makeCert();
  const out = ['# node ' + process.version + ' · ' + cert.ver + ' · ' + process.platform + ' · 127.0.0.1 안에서만 · 서버/클라이언트는 Node.js http, https · 중간은 net으로 만든 TCP 중계기 · 형식: 접속 방식|믿음|이름 => JSON'];
  out.push('# 시험용 인증서(openssl로 만듦, verify/out/https_basic/) = ' + cert.text);
  const all = [];
  for (const scheme of ['https', 'http']) for (const trust of [true, false]) for (const name of ['match', 'other']) {
    const r = await runCombo(scheme, trust, name); all.push(r);
    out.push([scheme, trust, name].join('|') + ' => ' + JSON.stringify(r));
  }
  const ver = {};
  all.forEach(r => { const p = r.client.protocol || (r.server.secure[0] && r.server.secure[0].protocol); if (p) { const k = p + ' ' + (r.client.cipher || (r.server.secure[0] && r.server.secure[0].cipher) || '?'); ver[k] = (ver[k] || 0) + 1; } });
  out.push('# 사용한 TLS 버전과 암호 묶음(연결된 조합 수) = ' + JSON.stringify(ver));
  fs.writeFileSync(path.join(__dirname, 'https_basic_probe.out.txt'), out.join('\n') + '\n');
  console.log(out.join('\n'));
})().catch(e => { console.error(e); process.exit(1); });

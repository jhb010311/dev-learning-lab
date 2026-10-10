// "프록시와 리버스 프록시" 실습의 모든 설정 조합을 이 PC의 루프백 주소 세 개로 실행한다.
//   클라이언트 127.0.0.10  ·  프록시 127.0.0.20  ·  서버 127.0.0.30   (모두 이 PC 안의 주소다. 밖으로 나가는 요청은 없다)
//   직접: 클라이언트 → 서버(HTTP)   포워드: 클라이언트 → 프록시(HTTP, 요청 줄에 전체 주소) → 서버   리버스: 클라이언트 → 프록시(HTTPS) → 서버(HTTP)
// 클라이언트는 두 가지(Node의 http/https 모듈, curl)로 각각 실행해 서버가 본 것이 같은지도 확인한다.
// 리버스 프록시의 HTTPS에 쓸 시험용 인증서는 실행할 때 openssl로 만들어 임시 폴더에 둔다(Git Bash처럼 openssl이 PATH에 있는 곳에서 실행).
// 사용: node verify/net/revproxy_probe.js      결과는 verify/net/revproxy_probe.out.txt에 쓴다.
// 한 줄의 모양: 길|프록시의 XFF 처리|위조 여부|서버가 읽는 곳 =>
//   클라이언트가 연결한 상대|프록시가 받은 요청 줄의 모양|서버가 본 연결 상대|서버가 받은 X-Forwarded-For|서버가 판단한 클라이언트|클라이언트가 쓴 프로토콜|서버가 받은 연결의 프로토콜|서버가 받은 X-Forwarded-Proto
const http = require('http'), https = require('https'), fs = require('fs'), os = require('os'), path = require('path'), cp = require('child_process');
const C = '127.0.0.10', P = '127.0.0.20', S = '127.0.0.30', FORGED = '198.51.100.99';
const role = a => String(a).split(C).join('client').split(P).join('proxy').split(S).join('server');

// 뒤 서버: 연결 상대 주소와 받은 헤더를 그대로 알려 주고, 설정(read)에 따라 클라이언트 주소를 판단한다
function backend(read) {
  return http.createServer((req, res) => {
    const remote = req.socket.remoteAddress, xff = req.headers['x-forwarded-for'], list = xff ? xff.split(',').map(s => s.trim()) : [];
    const client = read === 'remote' || !list.length ? remote : read === 'first' ? list[0] : list[list.length - 1];
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ remote, xff: xff || '-', client, proto: req.socket.encrypted ? 'https' : 'http', xfp: req.headers['x-forwarded-proto'] || '-' }));
  });
}
// 프록시: 받은 요청을 새 연결로 넘긴다. 포워드는 요청 줄의 전체 주소로, 리버스는 정해진 뒤 서버로 보낸다
function proxy(kind, xff, backendPort, tls, seen) {
  const handler = (req, res) => {
    const abs = /^http:\/\//.test(req.url), to = kind === 'forward' ? new URL(req.url) : { hostname: S, port: backendPort, pathname: req.url, search: '' };
    seen.push(abs ? 'absolute' : 'origin');
    const headers = Object.assign({}, req.headers), peer = req.socket.remoteAddress;
    delete headers['proxy-connection'];
    if (xff === 'append') headers['x-forwarded-for'] = (headers['x-forwarded-for'] ? headers['x-forwarded-for'] + ', ' : '') + peer;   // 받은 값 뒤에 덧붙임
    if (xff === 'set') headers['x-forwarded-for'] = peer;                                                                              // 받은 값을 버리고 새로 씀
    if (xff !== 'none' && kind === 'reverse') headers['x-forwarded-proto'] = req.socket.encrypted ? 'https' : 'http';
    http.request({ host: to.hostname, port: to.port, path: to.pathname + to.search, method: req.method, headers, localAddress: P }, up => { res.writeHead(up.statusCode, up.headers); up.pipe(res); }).end();
  };
  return kind === 'reverse' ? https.createServer(tls, handler) : http.createServer(handler);
}
const listen = (srv, host) => new Promise(r => srv.listen(0, host, () => r(srv.address().port)));
const stop = srv => new Promise(r => { srv.close(r); srv.closeAllConnections(); });
const run = (cmd, args) => new Promise(r => cp.execFile(cmd, args, { encoding: 'utf8' }, (e, so, se) => r({ exit: e ? e.code : 0, out: so, err: se.trim() })));
function nodeGet(kind, bp, pp, spoof) {
  const headers = spoof ? { 'X-Forwarded-For': FORGED } : {};
  const opt = kind === 'direct' ? { host: S, port: bp, path: '/whoami', headers } : kind === 'forward' ? { host: P, port: pp, path: 'http://' + S + ':' + bp + '/whoami', headers: Object.assign({ Host: S + ':' + bp }, headers) } : { host: P, port: pp, path: '/whoami', headers, rejectUnauthorized: false };
  opt.localAddress = C; opt.agent = false;
  return new Promise((resolve, reject) => (kind === 'reverse' ? https : http).get(opt, res => { let d = ''; const peer = res.socket.remoteAddress; res.on('data', c => d += c); res.on('end', () => resolve(Object.assign(JSON.parse(d), { peer }))); }).on('error', reject));
}
async function curlGet(kind, bp, pp, spoof) {
  const a = ['-sS', '--interface', C, '-w', '\n%{remote_ip}'];
  if (spoof) a.push('-H', 'X-Forwarded-For: ' + FORGED);
  if (kind === 'direct') a.push('http://' + S + ':' + bp + '/whoami');
  if (kind === 'forward') a.push('-x', 'http://' + P + ':' + pp, 'http://' + S + ':' + bp + '/whoami');
  if (kind === 'reverse') a.push('-k', 'https://' + P + ':' + pp + '/whoami');
  const r = await run('curl', a); if (r.exit) throw new Error('curl 실패: ' + r.err);
  const [body, peer] = r.out.split('\n'); return Object.assign(JSON.parse(body), { peer });
}

(async () => {
  // 시험용 인증서 (자체 서명, 이틀짜리)
  const dir = path.join(os.tmpdir(), 'lab_revproxy_tls'), key = path.join(dir, 'key.pem'), crt = path.join(dir, 'cert.pem');
  fs.mkdirSync(dir, { recursive: true });
  const g = await run('openssl', ['req', '-x509', '-newkey', 'rsa:2048', '-nodes', '-keyout', key, '-out', crt, '-days', '2', '-subj', '/CN=shop.example']);
  if (g.exit) { console.log('openssl로 시험용 인증서를 만들지 못했습니다: ' + g.err); process.exit(1); }
  const tls = { key: fs.readFileSync(key), cert: fs.readFileSync(crt) };
  const out = ['# node ' + process.version + ' · ' + (await run('curl', ['--version'])).out.split(/\r?\n/)[0].split(' ').slice(0, 2).join(' ') + ' · 클라이언트 ' + C + ', 프록시 ' + P + ', 서버 ' + S];
  for (const kind of ['direct', 'forward', 'reverse']) for (const xff of kind === 'direct' ? ['none'] : ['none', 'append', 'set']) for (const spoof of [false, true]) for (const read of ['remote', 'first', 'last']) {
    const b = backend(read), bp = await listen(b, S), seen = []; let p = null, pp = 0;
    if (kind !== 'direct') { p = proxy(kind, xff, bp, tls, seen); pp = await listen(p, P); }
    const line = [];
    for (const get of [nodeGet, curlGet]) {
      seen.length = 0;
      const r = await get(kind, bp, pp, spoof);
      line.push([role(r.peer), seen[0] || '-', role(r.remote), role(r.xff), role(r.client), kind === 'reverse' ? 'https' : 'http', r.proto, r.xfp].join('|'));
    }
    if (p) await stop(p); await stop(b);
    if (line[0] !== line[1]) throw new Error('Node 클라이언트와 curl의 결과가 다름: ' + line.join('  /  '));
    out.push([kind, xff, spoof, read].join('|') + ' => ' + line[0]);
  }
  fs.writeFileSync(path.join(__dirname, 'revproxy_probe.out.txt'), out.join('\n') + '\n');
  console.log(out.join('\n'));
})();

// 기초개념 "URL" 실습의 모든 설정 조합(스킴 2 x 포트 2 x 경로 3 x 쿼리 2 = 24)을 Node.js로 실제 실행한다.
// 사용: node verify/en/url_basic_en_probe.js      결과는 verify/en/url_basic_en_probe.out.txt에 쓴다.
// 조합마다 (1) 화면의 URL 글자 그대로 new URL(글자)로 나눈 결과(protocol, hostname, port, pathname, search)를 남기고,
// (2) http: 주소로 읽힌 것은 Node.js의 http.request(URL 객체)로 요청을 보내되 연결만 127.0.0.1의 시험 서버로 돌려(가로채기),
//     클라이언트가 연결하려던 host와 port, 서버가 받은 요청의 첫 줄과 Host 헤더를 기록한다. 화면의 URL 글자 그대로이므로 포트는 8080(또는 생략=80)이다.
// (3) 포트를 적은 조합은 가로채지 않은 실제 실행도 한다: 비어 있는 포트에 시험 서버를 띄우고 URL의 8080 자리에 그 번호를 넣어 localhost라는 이름으로 실제로 연결한다.
//     (포트를 생략한 조합은 80번에 실제로 연결하지 않는다. 가로채기로 "연결하려던 곳"만 본다.)
// (4) http:가 아닌 스킴으로 읽힌 것은 http.request와 fetch가 어떻게 되는지 본다. 스킴을 알 수 없는 주소라 연결은 일어나지 않는다.
// 서버: GET /hello에 200과 "안녕하세요, <name 값>"(name이 없으면 "안녕하세요, 손님"), 그 밖의 경로에는 404. 127.0.0.1에서만 열고 끝나면 닫는다.
// 한 줄의 모양: scheme|port|path|query => JSON.   '#'로 시작하는 줄은 설명과 별도로 잰 사실이다.
const http = require('http'), net = require('net'), dns = require('dns'), fs = require('fs'), path = require('path');

const PATHS = { hello: '/hello', nothing: '/nothing', none: '' };
// 화면의 code(c)와 같은 방법으로 URL 글자를 만든다. 경로를 적지 않으면 호스트나 포트 바로 뒤에 ?가 온다.
function urlText(c) {
  return (c.scheme ? 'http://' : '') + 'localhost' + (c.port ? ':8080' : '') + PATHS[c.path] + (c.query ? '?name=kim' : '');
}

function startServer() {
  return new Promise(resolve => {
    const log = [];
    const srv = http.createServer((req, res) => {
      const u = new URL(req.url, 'http://x');
      log.push({ method: req.method, url: req.url, host: req.headers.host === undefined ? null : req.headers.host, ra: req.socket.remoteAddress });
      if (req.method === 'GET' && u.pathname === '/hello') {
        const name = u.searchParams.get('name');
        res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' }); res.end('Hello, ' + (name === null ? 'guest' : name));
      } else { res.writeHead(404); res.end(); }
    });
    // 서버가 받은 첫 줄과 Host 줄을 글자 그대로 남긴다
    srv.on('connection', s => s.once('data', d => { const t = d.toString('latin1'); log.rawFirst = (log.rawFirst || []); log.rawFirst.push({ line: t.split('\r\n')[0], hostLine: (t.split('\r\n').find(l => /^host:/i.test(l)) || '') }); }));
    srv.listen(0, '127.0.0.1', () => resolve({ srv, log, port: srv.address().port }));
  });
}
function stop(srv) { return new Promise(r => { srv.close(r); srv.closeAllConnections(); }); }

// 요청을 보내고 응답을 모은다. 오류가 나면 코드를 돌려준다.
function request(url, opts) {
  return new Promise(resolve => {
    let req;
    try { req = http.request(url, opts, res => { const ch = []; res.on('data', d => ch.push(d)); res.on('end', () => resolve({ ok: true, status: res.statusCode, body: Buffer.concat(ch).toString('utf8') })); }); }
    catch (e) { return resolve({ ok: false, err: e.code || e.name }); }
    req.setTimeout(3000, () => req.destroy(Object.assign(new Error('timeout'), { code: 'TIMEOUT' })));
    req.on('error', e => resolve({ ok: false, err: e.code || e.name }));
    req.end();
  });
}

(async () => {
  const out = ['# node ' + process.version + ' · 127.0.0.1의 시험 서버 · 형식: scheme|port|path|query => JSON'];
  // 이 PC에서 localhost가 무엇으로 풀리는지
  const addrs = await dns.promises.lookup('localhost', { all: true });
  out.push('# dns.lookup(localhost, all) = ' + JSON.stringify(addrs));
  const combos = [];
  for (const scheme of [false, true]) for (const port of [false, true]) for (const p of ['hello', 'nothing', 'none']) for (const query of [false, true]) combos.push({ scheme, port, path: p, query });

  for (const c of combos) {
    const text = urlText(c), key = [c.scheme, c.port, c.path, c.query].join('|'), r = { text };
    // (1) 쪼개기
    let u = null;
    try { u = new URL(text); r.parse = { protocol: u.protocol, hostname: u.hostname, port: u.port, pathname: u.pathname, search: u.search }; }
    catch (e) { r.parse = { error: e.code, message: e.message }; }
    if (u && u.protocol === 'http:' && u.hostname) {
      // (2) 가로채기: 연결하려던 곳을 기록하고 연결은 시험 서버로 돌린다
      {
        const { srv, log, port } = await startServer();
        const agent = new http.Agent({ keepAlive: false }); let wanted = null;
        agent.createConnection = o => { wanted = { host: o.host, port: Number(o.port) }; return net.connect(port, '127.0.0.1'); };
        const res = await request(u, { agent });
        agent.destroy(); await stop(srv);
        r.intercept = { wantedHost: wanted && wanted.host, wantedPort: wanted && wanted.port, requestLine: log.rawFirst && log.rawFirst[0].line, hostLine: log.rawFirst && log.rawFirst[0].hostLine, method: log[0] && log[0].method, url: log[0] && log[0].url, hostHeader: log[0] && log[0].host, status: res.status, body: res.body, err: res.err };
      }
      // (3) 포트를 적은 조합: 실제로 연결
      if (c.port) {
        const { srv, log, port } = await startServer();
        const realText = text.replace(':8080', ':' + port); let looked = null;
        const agent = new http.Agent({ keepAlive: false, lookup: (h, o, cb) => dns.lookup(h, o, (e, a, f) => { looked = a; cb(e, a, f); }) });
        const res = await request(new URL(realText), { agent });
        agent.destroy(); await stop(srv);
        const norm = s => s == null ? s : s.replace(':' + port, ':8080');
        r.real = { realText: realText.replace(':' + port, ':<빈 포트>'), requestLine: log.rawFirst && norm(log.rawFirst[0].line), hostLine: log.rawFirst && norm(log.rawFirst[0].hostLine), method: log[0] && log[0].method, url: log[0] && log[0].url, hostHeader: log[0] && norm(log[0].host), remoteAddress: log[0] && log[0].ra, lookedUp: looked && (Array.isArray(looked) ? looked.map(x => x.address) : looked), status: res.status, body: res.body, err: res.err, calls: log.length };
      }
    } else if (u) {
      // (4) http가 아닌 스킴으로 읽힌 주소
      const res = await request(u, {});
      r.sendAttempt = { err: res.err, ok: res.ok };
    }
    if (!u || u.protocol !== 'http:') {
      let f; try { await fetch(text); f = 'fetch가 성공'; } catch (e) { f = 'fetch ' + e.name + ': ' + e.message + (e.cause ? ' / cause ' + (e.cause.code || e.cause.message) : ''); }
      r.fetch = f;
      if (!u) { const res = await request(text, {}); r.sendString = { err: res.err }; }
    }
    out.push(key + ' => ' + JSON.stringify(r));
  }

  // 별도로 잰 사실 1: localhost라는 이름으로 연결할 때 자동 선택(autoSelectFamily)을 끄면 어떻게 되는가 (시험 서버는 127.0.0.1에서만 연다)
  for (const asf of [true, false]) {
    const { srv, log, port } = await startServer();
    const agent = new http.Agent({ keepAlive: false, autoSelectFamily: asf });
    const res = await request(new URL('http://localhost:' + port + '/hello?name=kim'), { agent });
    agent.destroy(); await stop(srv);
    out.push('# autoSelectFamily=' + asf + ' => ' + JSON.stringify({ status: res.status, err: res.err, calls: log.length, remoteAddress: log[0] && log[0].ra }));
  }
  // 별도로 잰 사실 2: 시험 서버에 기본 포트를 적은 주소를 쪼개 본다 (http://localhost:80은 포트가 비어 읽히는가)
  { const x = new URL('http://localhost:80/hello'); out.push('# new URL(http://localhost:80/hello).port = ' + JSON.stringify(x.port) + ' · href = ' + x.href); }
  out.push('# 80번 포트에는 연결하지 않았다.');

  fs.writeFileSync(path.join(__dirname, 'url_basic_en_probe.out.txt'), out.join('\n') + '\n');
  console.log(out.join('\n'));
})();

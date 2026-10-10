// 브라우저의 실제 동작(CORS, HTTP 캐시, XSS, SameSite 쿠키)을 확인하기 위한 로컬 시험 서버.
// 페이지 서버: http://127.0.0.1:4181 (또는 http://localhost:4181), API 서버: http://127.0.0.1:4182
const http = require('http');
const log = [];            // API 서버가 받은 요청 기록
let etagVer = 1;
const cacheHits = [];
const slow = { now: 0, max: 0, count: 0, sockets: new Set() };

function page(res, body, headers) { res.writeHead(200, Object.assign({ 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' }, headers || {})); res.end('<!doctype html><meta charset="utf-8"><title>probe</title>' + body); }

http.createServer((req, res) => {
  const u = new URL(req.url, 'http://x');
  if (u.pathname === '/log') { res.writeHead(200, { 'content-type': 'application/json', 'cache-control': 'no-store' }); res.end(JSON.stringify({ log, cacheHits })); return; }
  if (u.pathname === '/reset') { log.length = 0; cacheHits.length = 0; etagVer = 1; res.writeHead(200, { 'cache-control': 'no-store' }); res.end('ok'); return; }
  if (u.pathname === '/setver') { etagVer = +u.searchParams.get('v'); res.writeHead(200, { 'cache-control': 'no-store' }); res.end('ok'); return; }
  if (u.pathname.startsWith('/cache/')) {            // HTTP 캐시 시험 (같은 출처)
    const policy = u.pathname.split('/')[2], etag = '"v' + etagVer + '"', inm = req.headers['if-none-match'] || '';
    const cc = { max: 'max-age=2', nostore: 'no-store', nocache: 'no-cache' }[policy];
    const h = { 'cache-control': cc }; if (policy !== 'nostore') h.etag = etag;
    if (policy !== 'nostore' && inm === etag) { cacheHits.push({ key: u.search, inm, status: 304 }); res.writeHead(304, h); res.end(); return; }
    cacheHits.push({ key: u.search, inm, status: 200 }); h['content-type'] = 'text/plain'; res.writeHead(200, h); res.end('body-v' + etagVer + '-' + 'x'.repeat(2000));
    return;
  }
  if (u.pathname === '/comment') {                   // XSS 시험
    const mode = u.searchParams.get('mode'), httpOnly = u.searchParams.get('httponly') === '1';
    const comment = "<script>window.__xss = 1; window.__seen = document.cookie;</" + "script>";
    const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    page(res, '<h1>게시글</h1><p id="c">' + (mode === 'escape' ? esc(comment) : comment) + '</p>', { 'set-cookie': 'sid=abc123; Path=/' + (httpOnly ? '; HttpOnly' : '') });
    return;
  }
  if (u.pathname === '/slow') {                      // HTTP/1.1 연결 수 시험: 0.3초 뒤에 응답
    slow.now++; slow.max = Math.max(slow.max, slow.now); slow.sockets.add(req.socket.remotePort); slow.count++;
    setTimeout(() => { slow.now--; res.writeHead(200, { 'cache-control': 'no-store', 'content-type': 'text/plain' }); res.end('ok'); }, 300);
    return;
  }
  if (u.pathname === '/slowstat') { res.writeHead(200, { 'cache-control': 'no-store', 'content-type': 'application/json' }); res.end(JSON.stringify({ count: slow.count, maxConcurrent: slow.max, sockets: slow.sockets.size })); slow.count = 0; slow.max = 0; slow.sockets.clear(); return; }
  if (u.pathname === '/attack') {                    // CSRF 시험: 다른 사이트(localhost)에서 127.0.0.1로 자동 제출되는 폼
    page(res, '<form id="f" method="post" action="http://127.0.0.1:4182/transfer"><input name="to" value="attacker"><input name="amount" value="1000000"></form><p>공격자 페이지</p>');
    return;
  }
  page(res, '<h1>probe page</h1>');
}).listen(4181, '0.0.0.0');

http.createServer((req, res) => {
  const u = new URL(req.url, 'http://x'), parts = u.pathname.split('/');
  if (parts[1] === 'cors') {                         // /cors/<서버 설정>/<시험 id>
    const mode = parts[2], id = parts[3];
    log.push({ id, method: req.method, cookie: !!req.headers.cookie });
    const h = { 'cache-control': 'no-store' };
    if (mode === 'star') { h['access-control-allow-origin'] = '*'; h['access-control-allow-methods'] = '*'; h['access-control-allow-headers'] = '*'; }
    if (mode === 'exact') { h['access-control-allow-origin'] = 'http://127.0.0.1:4181'; h['access-control-allow-credentials'] = 'true'; h['access-control-allow-methods'] = 'GET, POST, DELETE'; h['access-control-allow-headers'] = 'content-type, authorization'; h.vary = 'Origin'; }
    if (req.method === 'OPTIONS') { res.writeHead(mode === 'none' ? 403 : 204, h); res.end(); return; }
    h['content-type'] = 'application/json'; res.writeHead(200, h); res.end('{"ok":true}');
    return;
  }
  if (u.pathname === '/login') {                     // 쿠키 발급: ss = lax | none | unset
    const ss = u.searchParams.get('ss'), attr = ss === 'lax' ? '; SameSite=Lax' : ss === 'none' ? '; SameSite=None; Secure' : '';
    res.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'set-cookie': 'bank=' + ss + '; Path=/; Max-Age=600' + attr, 'cache-control': 'no-store' });
    res.end('<!doctype html><meta charset="utf-8"><p id="r">logged-in:' + ss + '</p>');
    return;
  }
  if (u.pathname === '/transfer') {
    const c = req.headers.cookie || '';
    res.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' });
    res.end('<!doctype html><meta charset="utf-8"><p id="r">transfer method=' + req.method + ' cookie=' + (c || '(없음)') + '</p>');
    return;
  }
  if (u.pathname === '/clear') { res.writeHead(200, { 'set-cookie': 'bank=; Path=/; Max-Age=0', 'cache-control': 'no-store', 'content-type': 'text/html' }); res.end('<p id="r">cleared</p>'); return; }
  res.writeHead(404); res.end();
}).listen(4182, '0.0.0.0');
console.log('probe servers on 4181 / 4182');

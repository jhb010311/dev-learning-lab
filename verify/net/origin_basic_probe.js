// 기초개념 "출처(origin)" 실습의 모든 설정 조합(요청 주소 5가지)을 두 층으로 실제 확인한다.
// 층 1: 화면의 주소(shop.example)의 출처를 Node.js의 new URL(...).origin 으로 계산해 같은 출처인지, 스킴·호스트·포트 가운데 어느 것이 다른지 잰다.
// 층 2: 이 PC의 Chrome을 창 없이(--headless=new --dump-dom) 실행해, 페이지의 스크립트가 fetch로 요청한 응답을 읽을 수 있는지,
//       그리고 막힌 경우에도 서버에 요청이 도착했는지(서버 기록)를 잰다. shop.example은 실제 서버가 아니므로 127.0.0.1의 시험 서버로 같은 차이를 만든다:
//         같은 출처    페이지 http://127.0.0.1:A/cart  → http://127.0.0.1:A/api/items
//         경로·쿼리만   → http://127.0.0.1:A/other?x=1
//         호스트가 다름 → http://localhost:A/items      (같은 컴퓨터, 같은 포트, 이름만 다름)
//         포트가 다름   → http://127.0.0.1:B/items      (다른 서버)
//         스킴이 다름   → https://127.0.0.1:A/items     (같은 포트에서 첫 바이트를 보고 http와 https를 나눠 받는 서버라서 스킴만 다르다)
//       시험 서버는 CORS 헤더를 달지 않는다. 포트는 모두 빈 포트(0)이고, 끝나면 서버와 이 실행이 띄운 Chrome을 모두 끝낸다.
// 사용: node verify/net/origin_basic_probe.js     결과는 verify/net/origin_basic_probe.out.txt 에 쓴다.
const net = require('net'), http = require('http'), https = require('https'), fs = require('fs'), path = require('path'), cp = require('child_process');
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const OUT = path.join(__dirname, '..', 'out', 'origin_basic');
fs.mkdirSync(OUT, { recursive: true });

// 화면의 주소 (lesson의 code와 같은 글을 만들 때 쓴다. cmp가 lesson.code와 견준다)
const PAGE = 'https://shop.example/cart';
const SCREEN = {
  same: 'https://shop.example/api/items',
  path: 'https://shop.example/other?x=1',
  host: 'https://api.shop.example/items',
  port: 'https://shop.example:8443/items',
  scheme: 'http://shop.example/items',
};
const DEFPORT = { 'http:': '80', 'https:': '443' };
function parts(u) { const x = new URL(u); return { origin: x.origin, scheme: x.protocol.replace(':', ''), host: x.hostname, port: x.port || DEFPORT[x.protocol] }; }
function compare(pageUrl, targetUrl) {
  const a = parts(pageUrl), b = parts(targetUrl);
  return { origin: b.origin, same: a.origin === b.origin, scheme: a.scheme === b.scheme, host: a.host === b.host, port: a.port === b.port, a, b };
}
function screenCode(key) { return ['# 지금 열려 있는 페이지', PAGE, '# 그 페이지의 스크립트가 요청하는 주소', SCREEN[key]].join('\n'); }

// 시험용 자체 서명 인증서 (127.0.0.1용, verify/out 아래에만 둔다)
const keyFile = path.join(OUT, 'key.pem'), certFile = path.join(OUT, 'cert.pem');
if (!fs.existsSync(certFile)) cp.execFileSync('openssl', ['req', '-x509', '-newkey', 'rsa:2048', '-nodes', '-keyout', keyFile, '-out', certFile, '-days', '3', '-subj', '/CN=127.0.0.1', '-addext', 'subjectAltName=IP:127.0.0.1,DNS:localhost'], { stdio: 'ignore' });
const TLS = { key: fs.readFileSync(keyFile), cert: fs.readFileSync(certFile) };

const log = [];   // 서버가 받은 요청 기록
let target = '';  // 이번 실행에서 페이지의 스크립트가 요청할 주소

function pageHtml() {
  return '<!doctype html><meta charset="utf-8"><title>cart</title><pre id="out">대기</pre><script>\n' +
    'const T = ' + JSON.stringify(target) + ';\n' +
    '(async () => { let r; try { const res = await fetch(T); const text = await res.text(); r = { ok: true, status: res.status, text: text }; }\n' +
    'catch (e) { r = { ok: false, name: e.name, message: e.message }; }\n' +
    'r.pageOrigin = location.origin; r.ua = navigator.userAgent; document.getElementById("out").textContent = JSON.stringify(r); })();\n</script>';
}
function handler(name, scheme, cors) {
  return (req, res) => {
    log.push({ server: name, scheme, host: req.headers.host, url: req.url, origin: req.headers.origin || null });
    if (req.url.startsWith('/cart')) { res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' }); res.end(pageHtml()); return; }
    const h = { 'content-type': 'text/plain; charset=utf-8' };
    if (cors) h['access-control-allow-origin'] = cors();
    res.writeHead(200, h); res.end('상품 3개');
  };
}
const socks = new Set();
function track(s) { socks.add(s); s.on('close', () => socks.delete(s)); s.on('error', () => {}); }
// 서버 A: 한 포트에서 첫 바이트가 0x16(TLS)이면 https, 아니면 http로 받는다
function startA() {
  const hs = http.createServer(handler('A', 'http')), ss = https.createServer(TLS, handler('A', 'https'));
  const srv = net.createServer(sock => {
    track(sock);
    sock.once('data', chunk => { sock.pause(); sock.unshift(chunk); (chunk[0] === 0x16 ? ss : hs).emit('connection', sock); process.nextTick(() => sock.resume()); });
  });
  return new Promise(r => srv.listen(0, '127.0.0.1', () => r(srv)));
}
function startB(cors) {
  const srv = http.createServer(handler('B', 'http', cors));
  srv.on('connection', track);
  return new Promise(r => srv.listen(0, '127.0.0.1', () => r(srv)));
}
function freePort() { return new Promise(r => { const s = net.createServer(); s.listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => r(p)); }); }); }

function runChrome(url, dir) {
  return new Promise(resolve => {
    const p = cp.spawn(CHROME, ['--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check', '--ignore-certificate-errors', '--virtual-time-budget=5000', '--user-data-dir=' + dir, '--dump-dom', url], { stdio: ['ignore', 'pipe', 'ignore'] });
    let out = ''; p.stdout.setEncoding('utf8'); p.stdout.on('data', d => out += d);
    const t = setTimeout(() => { try { cp.execFileSync('taskkill', ['/PID', String(p.pid), '/T', '/F'], { stdio: 'ignore' }); } catch (e) {} }, 40000);
    p.on('close', () => { clearTimeout(t); resolve(out); });
  });
}
function parseDom(dom) {
  const m = /<pre id="out">([\s\S]*?)<\/pre>/.exec(dom);
  if (!m) return { ok: null, name: '(결과 없음)', message: dom.slice(0, 200) };
  try { return JSON.parse(m[1].replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&')); } catch (e) { return { ok: null, name: '(해석 실패)', message: m[1].slice(0, 200) }; }
}

// 한 번 실행: 페이지 주소와 스크립트가 요청할 주소를 받아 Chrome으로 열고, 결과와 서버 기록을 돌려준다
async function experiment(name, pageUrl, targetUrl, matchUrl) {
  log.length = 0; target = targetUrl;
  const dom = await runChrome(pageUrl, path.join(OUT, 'prof-' + name));
  const r = parseDom(dom);
  const hits = log.filter(e => e.url === matchUrl);
  return { r, hits, page: log.filter(e => e.url.startsWith('/cart')).length };
}

(async () => {
  const lines = [], extra = [];
  const A = await startA(), B = await startB(null), BC = await startB(() => 'http://127.0.0.1:' + A.address().port);
  const pa = A.address().port, pb = B.address().port, pbc = BC.address().port, pc = await freePort();
  lines.push('# node ' + process.version + ' · Chrome(headless=new) · 127.0.0.1 시험 서버(CORS 헤더 없음) · 포트는 이번 실행에서 잡은 빈 포트 · 화면의 주소는 shop.example(실제 서버 아님)');
  lines.push('# 화면의 페이지 = ' + PAGE);
  // 층 1의 보조 사실
  const f = [];
  f.push('기본포트생략|https://shop.example:443/x=' + new URL('https://shop.example:443/x').origin);
  f.push('포트없음|https://shop.example/x=' + new URL('https://shop.example/x').origin);
  f.push('경로쿼리|' + new URL('https://shop.example/other?x=1').origin + '=' + new URL('https://shop.example/api/items').origin);
  f.push('http기본포트생략|http://shop.example:80/x=' + new URL('http://shop.example:80/x').origin);
  f.push('같은컴퓨터다른이름|localhost vs 127.0.0.1=' + (new URL('http://localhost:1/').origin === new URL('http://127.0.0.1:1/').origin ? '같음' : '다름'));
  lines.push('# 사실 ' + f.join(' ; '));

  const REAL = {
    same: ['http://127.0.0.1:' + pa + '/api/items', '/api/items'],
    path: ['http://127.0.0.1:' + pa + '/other?x=1', '/other?x=1'],
    host: ['http://localhost:' + pa + '/items', '/items'],
    port: ['http://127.0.0.1:' + pb + '/items', '/items'],
    scheme: ['https://127.0.0.1:' + pa + '/items', '/items'],
  };
  const realPage = 'http://127.0.0.1:' + pa + '/cart';
  let ua = '';
  for (const key of Object.keys(SCREEN)) {
    const sc = compare(PAGE, SCREEN[key]), rc = compare(realPage, REAL[key][0]);
    const x = await experiment(key, realPage, REAL[key][0], REAL[key][1]);
    ua = x.r.ua || ua;
    const h = x.hits[0];
    lines.push(key + ' => ' + ['origin=' + sc.origin, 'same=' + sc.same, 'scheme=' + (sc.scheme ? '같음' : '다름'), 'host=' + (sc.host ? '같음' : '다름'), 'port=' + (sc.port ? '같음' : '다름'),
      'arrived=' + (x.hits.length > 0), 'read=' + (x.r.ok === true), 'errName=' + (x.r.name || '(없음)'), 'errMsg=' + (x.r.message || '(없음)'), 'status=' + (x.r.status || '(없음)'), 'body=' + (x.r.text || '(없음)'),
      'realTarget=' + REAL[key][0], 'realSame=' + rc.same, 'realParts=' + ['scheme', 'host', 'port'].map(k => k + ':' + (rc[k] ? '같음' : '다름')).join(','),
      'serverSaw=' + (h ? h.server + ' ' + h.scheme + ' Host:' + h.host : '(도착 안 함)'), 'originHeader=' + (h ? (h.origin || '(없음)') : '(없음)'), 'pageLoads=' + x.page].join('|'));
    extra.push('# 화면의 코드 ' + key + ' = ' + JSON.stringify(screenCode(key)));
  }
  lines.push('# 브라우저 ' + ua);

  // 근거 1: 스킴만 반대로 (https 페이지 → http 주소)
  { const x = await experiment('scheme_rev', 'https://127.0.0.1:' + pa + '/cart', 'http://127.0.0.1:' + pa + '/items', '/items');
    lines.push('# 근거 스킴 반대(https 페이지에서 http 주소로) => 읽음=' + (x.r.ok === true) + '|오류=' + x.r.name + ': ' + x.r.message + '|서버에 도착=' + (x.hits.length > 0) + '|서버가 본 것=' + (x.hits[0] ? x.hits[0].scheme : '-')); }
  // 근거 2: 다른 출처여도 서버가 응답에 Access-Control-Allow-Origin으로 페이지의 출처를 허락하면 읽힌다 (CORS는 세부 동작 실습에서)
  { const x = await experiment('port_cors', realPage, 'http://127.0.0.1:' + pbc + '/items', '/items');
    lines.push('# 근거 허락 헤더를 단 다른 포트 서버 => 읽음=' + (x.r.ok === true) + '|본문=' + (x.r.text || '(없음)') + '|오류=' + (x.r.name || '(없음)') + '|서버에 도착=' + (x.hits.length > 0)); }
  // 근거 3: 아무도 기다리지 않는 포트에 요청하면 스크립트가 받는 오류가 막힌 경우와 같은가
  { const x = await experiment('closed', realPage, 'http://127.0.0.1:' + pc + '/items', '/items');
    lines.push('# 근거 서버가 없는 포트 => 읽음=' + (x.r.ok === true) + '|오류=' + x.r.name + ': ' + x.r.message + '|서버에 도착=' + (x.hits.length > 0)); }

  for (const s of socks) s.destroy();
  await Promise.all([A, B, BC].map(s => new Promise(r => s.close(r))));
  // 이 실행이 띄운 Chrome만 끝낸다 (명령줄에 verify\out\origin_basic\prof- 가 든 것)
  try { cp.execFileSync('powershell', ['-NoProfile', '-Command', "Get-CimInstance Win32_Process -Filter \"Name='chrome.exe'\" | Where-Object { $_.CommandLine -like '*origin_basic*prof-*' } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }"], { stdio: 'ignore' }); } catch (e) {}
  const text = lines.join('\n') + '\n' + extra.join('\n') + '\n';
  fs.writeFileSync(path.join(__dirname, 'origin_basic_probe.out.txt'), text);
  console.log(text);
})();

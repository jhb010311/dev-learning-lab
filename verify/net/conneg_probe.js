// "내용 협상과 압축" 실습의 모든 설정 조합을 127.0.0.1의 시험 서버로 실행한다.
//  - 서버: Node http + negotiator 1.0(Express가 쓰는 헤더 해석 라이브러리, npm에 들어 있는 것) + zlib(gzip, brotli 기본 설정)
//  - 공유 캐시: Node http + http-cache-semantics 4.2(npm에 들어 있는 HTTP 캐시 규칙 구현)로 만든 작은 캐싱 프록시
//  - 클라이언트 A, B: Node http.request (받은 바이트를 그대로 본다). 추가 확인은 fetch와 curl.
// 사용: node verify/net/conneg_probe.js      결과는 verify/net/conneg_probe.out.txt에 쓴다.
// 한 줄의 모양: 형식|Accept-Language|Accept-Encoding|Vary 여부 =>
//   Content-Type|Content-Language|Content-Encoding|원래 크기|전송 크기|zlib 대조|Vary|A의 캐시 결과|B의 캐시 결과|B가 받은 Content-Encoding|B가 받은 Content-Language|B가 받은 크기|B에게 맞는가
const http = require('http'), zlib = require('zlib'), fs = require('fs'), os = require('os'), path = require('path'), cp = require('child_process');
const npm = path.join(path.dirname(process.execPath), 'node_modules', 'npm', 'node_modules');
const Negotiator = require(path.join(npm, 'negotiator')), CachePolicy = require(path.join(npm, 'http-cache-semantics'));

// ---- 서버가 가진 표현들 (같은 주소 /guide의 여러 모습) ----
function html(lang) {
  const ko = lang === 'ko', rows = [];
  for (let i = 1; i <= 120; i++) rows.push(ko
    ? '<tr><td>' + i + '구역</td><td>주문한 뒤 ' + (1 + i % 3) + '일 안에 도착합니다</td><td>배송비 ' + (2500 + (i % 4) * 500) + '원</td></tr>'
    : '<tr><td>Zone ' + i + '</td><td>Arrives within ' + (1 + i % 3) + ' days after the order</td><td>Shipping fee ' + (2500 + (i % 4) * 500) + ' won</td></tr>');
  return Buffer.from('<!doctype html>\n<html lang="' + lang + '">\n<head><meta charset="utf-8"><title>' + (ko ? '배송 안내' : 'Delivery guide') + '</title></head>\n<body>\n<h1>' + (ko ? '지역별 배송 안내' : 'Delivery guide by zone') + '</h1>\n<table>\n' + rows.join('\n') + '\n</table>\n</body>\n</html>\n');
}
function json(lang) { return Buffer.from(JSON.stringify({ title: lang === 'ko' ? '배송 안내' : 'Delivery guide', zones: 120 })); }
// 67×67 그림을 진짜 PNG 파일로 만든다. PNG 안의 그림 데이터는 이미 deflate로 압축되어 있다.
function png() {
  const W = 67, raw = Buffer.alloc(W * (1 + W * 3)); let seed = 12345, p = 0;
  const rnd = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return (seed >> 16) & 31; };
  for (let y = 0; y < W; y++) { raw[p++] = 0; for (let x = 0; x < W; x++) { raw[p++] = (x * 2 + rnd()) & 255; raw[p++] = (y * 2 + rnd()) & 255; raw[p++] = (x + y + rnd()) & 255; } }
  const chunk = (type, data) => { const len = Buffer.alloc(4); len.writeUInt32BE(data.length); const td = Buffer.concat([Buffer.from(type), data]), crc = Buffer.alloc(4); crc.writeUInt32BE(zlib.crc32(td) >>> 0); return Buffer.concat([len, td, crc]); };
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(W, 0); ihdr.writeUInt32BE(W, 4); ihdr[8] = 8; ihdr[9] = 2;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0))]);
}
const BODY = { 'text/html': { ko: html('ko'), en: html('en') }, 'application/json': { ko: json('ko'), en: json('en') }, 'image/png': { '-': png() } };
const ACCEPT = { html: 'text/html', json: 'application/json', png: 'image/png' };

// ---- 서버: 요청 헤더를 보고 형식, 언어, 압축을 고른다 ----
const seen = [];
function origin(vary) {
  return http.createServer((req, res) => {
    seen.push(req.headers['accept-encoding'] || '(없음)');
    const want = new Negotiator(req);
    const type = want.mediaType(['text/html', 'application/json', 'image/png']);
    const hasLang = type !== 'image/png', lang = hasLang ? want.language(['ko', 'en']) || 'ko' : '-';   // 맞는 언어가 없으면 서버 기본값 ko
    const enc = want.encoding(['br', 'gzip', 'identity'], { preferred: ['br', 'gzip'] });               // q가 같으면 서버가 선호하는 순서
    let body = BODY[type][lang];
    if (enc === 'gzip') body = zlib.gzipSync(body);
    if (enc === 'br') body = zlib.brotliCompressSync(body);
    const h = { 'Content-Type': type + (hasLang ? '; charset=utf-8' : ''), 'Cache-Control': 'public, max-age=60', 'Content-Length': body.length };
    if (hasLang) h['Content-Language'] = lang;
    if (enc !== 'identity') h['Content-Encoding'] = enc;
    if (vary) h['Vary'] = hasLang ? 'Accept, Accept-Language, Accept-Encoding' : 'Accept, Accept-Encoding';
    res.writeHead(200, h); res.end(body);
  });
}
// ---- 공유 캐시: 주소로 찾고, 저장된 응답을 이 요청에 써도 되는지는 http-cache-semantics가 판단한다(Vary 포함) ----
function cache(originPort) {
  const store = new Map();
  return http.createServer((req, res) => {
    const creq = { url: req.url, method: req.method, headers: req.headers }, hit = store.get(req.url);
    if (hit && hit.policy.satisfiesWithoutRevalidation(creq)) { res.writeHead(200, Object.assign({}, hit.policy.responseHeaders(), { 'X-Cache': 'HIT' })); return res.end(hit.body); }
    const up = http.request({ host: '127.0.0.1', port: originPort, path: req.url, method: req.method, headers: req.headers }, ur => {
      const ch = []; ur.on('data', d => ch.push(d)); ur.on('end', () => {
        const body = Buffer.concat(ch), policy = new CachePolicy(creq, { status: ur.statusCode, headers: ur.headers }, { shared: true });
        if (policy.storable()) store.set(req.url, { policy, body });
        res.writeHead(ur.statusCode, Object.assign({}, ur.headers, { 'X-Cache': 'MISS' })); res.end(body);
      });
    });
    up.end();
  });
}
const listen = srv => new Promise(r => srv.listen(0, '127.0.0.1', () => r(srv.address().port)));
const stop = srv => new Promise(r => { srv.close(r); srv.closeAllConnections(); });
const get = (port, headers) => new Promise((resolve, reject) => http.get({ host: '127.0.0.1', port, path: '/guide', headers }, res => { const ch = []; res.on('data', d => ch.push(d)); res.on('end', () => resolve({ status: res.statusCode, h: res.headers, body: Buffer.concat(ch) })); }).on('error', reject));
const run = (cmd, args) => new Promise(r => cp.execFile(cmd, args, { encoding: 'utf8' }, (e, so, se) => r({ exit: e ? e.code : 0, out: so, err: se.trim() })));
const unpack = (enc, buf) => enc === 'gzip' ? zlib.gunzipSync(buf) : enc === 'br' ? zlib.brotliDecompressSync(buf) : buf;

(async () => {
  const out = ['# node ' + process.version + ' · zlib ' + process.versions.zlib + ' · brotli ' + process.versions.brotli + ' · negotiator ' + require(path.join(npm, 'negotiator', 'package.json')).version + ' · http-cache-semantics ' + require(path.join(npm, 'http-cache-semantics', 'package.json')).version];
  // 표현마다 원래 크기와 zlib으로 직접 압축한 크기
  for (const t of Object.keys(BODY)) for (const l of Object.keys(BODY[t])) out.push('size|' + t + '|' + l + ' => ' + [BODY[t][l].length, zlib.gzipSync(BODY[t][l]).length, zlib.brotliCompressSync(BODY[t][l]).length].join('|'));
  const LANGS = ['ko', 'en', 'en;q=0.5, ko;q=0.9', 'ja, en;q=0.7', 'fr'], ENCS = ['none', 'gzip', 'gzip, br', 'br;q=0.1, gzip'];
  for (const fmt of ['html', 'json', 'png']) for (const lang of fmt === 'png' ? ['ko'] : LANGS) for (const enc of ENCS) for (const vary of [false, true]) {
    const o = origin(vary), op = await listen(o), c = cache(op), cp2 = await listen(c);
    const ha = { Accept: ACCEPT[fmt], 'Accept-Language': lang }; if (enc !== 'none') ha['Accept-Encoding'] = enc;
    const A = await get(cp2, ha);
    const B = await get(cp2, { Accept: ACCEPT[fmt], 'Accept-Language': 'en' });          // B: 영어를 원하고 Accept-Encoding을 보내지 않는 클라이언트
    await stop(c); await stop(o);
    const type = A.h['content-type'].split(';')[0], cl = A.h['content-language'] || '-', ce = A.h['content-encoding'] || '-', orig = BODY[type][cl];
    const direct = ce === 'gzip' ? zlib.gzipSync(orig).length : ce === 'br' ? zlib.brotliCompressSync(orig).length : orig.length;
    const zl = direct === A.body.length && unpack(ce, A.body).equals(orig) ? 'ok' : 'DIFF';
    const ideal = BODY[type][type === 'image/png' ? '-' : 'en'];                          // B가 서버에 직접 물었다면 받았을 본문
    out.push([fmt, lang, enc, vary].join('|') + ' => ' + [type, cl, ce, orig.length, A.body.length, zl, A.h.vary || '-', A.h['x-cache'], B.h['x-cache'], B.h['content-encoding'] || '-', B.h['content-language'] || '-', B.body.length, B.body.equals(ideal) ? 'right' : 'wrong'].join('|'));
  }
  // ---- 추가 확인: 실제 클라이언트가 압축을 다루는 모습 ----
  const tmp = path.join(os.tmpdir(), 'lab_conneg_out.bin'), want = BODY['text/html'].ko;
  {
    const o = origin(false), op = await listen(o), c = cache(op), cport = await listen(c), url = 'http://127.0.0.1:';
    seen.length = 0;
    const f = await fetch(url + op + '/guide', { headers: { Accept: 'text/html', 'Accept-Language': 'ko' } }), ft = Buffer.from(await f.arrayBuffer());
    out.push('extra|fetch 기본값 => 보낸 Accept-Encoding: ' + seen.pop() + '|받은 Content-Encoding: ' + f.headers.get('content-encoding') + '|코드가 받은 본문이 원래 HTML과 ' + (ft.equals(want) ? '같음' : '다름'));
    const f2 = await fetch(url + op + '/guide', { headers: { Accept: 'text/html', 'Accept-Language': 'ko', 'Accept-Encoding': 'br' } }), f2t = Buffer.from(await f2.arrayBuffer());
    out.push('extra|fetch에 Accept-Encoding: br => 받은 Content-Encoding: ' + f2.headers.get('content-encoding') + '|코드가 받은 본문이 원래 HTML과 ' + (f2t.equals(want) ? '같음' : '다름'));
    seen.length = 0;
    await run('curl', ['-sS', '--compressed', '-H', 'Accept: text/html', '-H', 'Accept-Language: ko', '-o', tmp, url + op + '/guide']);
    out.push('extra|curl --compressed => 보낸 Accept-Encoding: ' + seen.pop() + '|저장된 본문이 원래 HTML과 ' + (fs.readFileSync(tmp).equals(want) ? '같음' : '다름'));
    seen.length = 0;
    await run('curl', ['-sS', '-H', 'Accept: text/html', '-H', 'Accept-Language: ko', '-o', tmp, url + op + '/guide']);
    out.push('extra|curl 옵션 없음 => 보낸 Accept-Encoding: ' + seen.pop() + '|저장된 본문이 원래 HTML과 ' + (fs.readFileSync(tmp).equals(want) ? '같음' : '다름'));
    // Vary 없는 캐시에 A(br)가 먼저 다녀간 뒤, 압축을 요청하지 않은 curl이 같은 주소를 받으면
    await get(cport, { Accept: 'text/html', 'Accept-Language': 'ko', 'Accept-Encoding': 'gzip, br' });
    const cb = await run('curl', ['-sS', '-H', 'Accept: text/html', '-H', 'Accept-Language: en', '-o', tmp, '-w', '%{http_code} %header{content-encoding} %header{x-cache}', url + cport + '/guide']), got = fs.readFileSync(tmp);
    out.push('extra|Vary 없는 캐시 뒤의 curl(옵션 없음) => ' + cb.out + '|저장된 ' + got.length + '바이트가 영어 HTML과 ' + (got.equals(BODY['text/html'].en) ? '같음' : '다름') + '|br로 풀면 한국어 HTML과 ' + (zlib.brotliDecompressSync(got).equals(want) ? '같음' : '다름'));
    await stop(c); await stop(o);
  }
  fs.writeFileSync(path.join(__dirname, 'conneg_probe.out.txt'), out.join('\n') + '\n');
  console.log(out.join('\n'));
})();

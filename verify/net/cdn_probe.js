// "CDN" 실습의 모든 설정 조합을 127.0.0.1에 띄운 오리진 서버와 엣지(작은 캐싱 프록시)로 실행한다.
//  - 오리진: Node http. app.css를 주고, 응답에 Cache-Control: public, s-maxage=<초>를 붙인다. 30초 시점에 파일 내용을 바꿀 수 있다.
//  - 엣지: Node http로 만든 캐싱 프록시. 사본은 주소(경로 + 쿼리 문자열)로 찾고, 보관해도 되는지와 아직 유효한지는
//          http-cache-semantics 4.2(npm에 들어 있는 HTTP 캐시 규칙 구현, 공유 캐시 모드)가 판단한다. PURGE 요청을 받으면 그 주소의 사본을 지운다.
//  - 사용자: 0초와 40초는 Node의 fetch, 10초와 80초는 curl. 서로 다른 클라이언트가 같은 사본을 함께 쓰는지도 본다.
//  - 80초를 기다리지 않도록 엣지의 시계를 실제보다 33배쯤 빠르게 돌린다(모형의 1초 = 실제 30ms). 유효 시간의 여유는 가장 빠듯한 곳도 20초(실제 600ms)다.
// 사용: node verify/net/cdn_probe.js      결과는 verify/net/cdn_probe.out.txt에 쓴다.
// 한 줄의 모양: 유효 시간|10초의 요청 주소|내용 변경|바꾼 뒤 조치 => 0초|10초|40초|80초|오리진에 온 요청 수      (칸마다 X-Cache 값,받은 내용)
const http = require('http'), fs = require('fs'), path = require('path'), cp = require('child_process');
const npm = path.join(path.dirname(process.execPath), 'node_modules', 'npm', 'node_modules');
const CachePolicy = require(path.join(npm, 'http-cache-semantics'));
const UNIT = 30, OLD = '.btn { color: blue; }   /* old */', NEW = '.btn { color: green; }  /* new */';

function origin(ttl) {
  const o = { body: OLD, count: 0 };
  o.srv = http.createServer((req, res) => { o.count++; res.writeHead(200, { 'Content-Type': 'text/css', 'Cache-Control': 'public, s-maxage=' + ttl }); res.end(o.body); });
  return o;
}
function edge(originPort) {
  const t0 = Date.now(), store = new Map();
  class FastPolicy extends CachePolicy { now() { return t0 + (Date.now() - t0) * (1000 / UNIT); } }      // 빠르게 가는 시계
  return http.createServer((req, res) => {
    if (req.method === 'PURGE') { const had = store.delete(req.url); res.writeHead(200); return res.end(had ? 'purged' : 'nothing'); }
    const creq = { url: req.url, method: req.method, headers: { host: 'cdn.shop.example' } }, hit = store.get(req.url);
    if (hit && hit.policy.satisfiesWithoutRevalidation(creq)) { res.writeHead(200, { 'Content-Type': 'text/css', 'X-Cache': 'HIT' }); return res.end(hit.body); }
    http.get({ host: '127.0.0.1', port: originPort, path: req.url }, ur => {
      const ch = []; ur.on('data', d => ch.push(d)); ur.on('end', () => {
        const body = Buffer.concat(ch), policy = new FastPolicy(creq, { status: ur.statusCode, headers: ur.headers }, { shared: true });
        if (policy.storable()) store.set(req.url, { policy, body }); else store.delete(req.url);
        res.writeHead(200, { 'Content-Type': 'text/css', 'X-Cache': hit ? 'EXPIRED' : 'MISS' }); res.end(body);
      });
    });
  });
}
const listen = srv => new Promise(r => srv.listen(0, '127.0.0.1', () => r(srv.address().port)));
const stop = srv => new Promise(r => { srv.close(r); srv.closeAllConnections(); });
const run = (cmd, args) => new Promise(r => cp.execFile(cmd, args, { encoding: 'utf8' }, (e, so, se) => r({ exit: e ? e.code : 0, out: so, err: se.trim() })));
const until = (start, sec) => new Promise(r => setTimeout(r, Math.max(0, start + sec * UNIT - Date.now())));
const what = body => body.includes('old') ? 'old' : body.includes('new') ? 'new' : '?';
async function viaFetch(url) { const r = await fetch(url); return r.headers.get('x-cache') + ',' + what(await r.text()); }
async function viaCurl(url) { const r = await run('curl', ['-sS', '-w', '\n%header{x-cache}', url]); if (r.exit) throw new Error('curl 실패: ' + r.err); const [body, xc] = r.out.split('\n'); return xc + ',' + what(body); }

async function combo(ttl, q2, chg, after) {
  const o = origin(ttl), op = await listen(o.srv), e = edge(op), ep = await listen(e), base = 'http://127.0.0.1:' + ep, U1 = '/app.css?v=1';
  const start = Date.now(), got = [];
  got.push(await viaFetch(base + U1));                                                          // 0초
  await until(start, 10); got.push(await viaCurl(base + (q2 === 'ref' ? '/app.css?v=1&ref=mail' : U1)));   // 10초
  await until(start, 30);
  if (chg) { o.body = NEW; if (after === 'purge') await new Promise(r => http.request({ host: '127.0.0.1', port: ep, path: U1, method: 'PURGE' }, x => { x.resume(); x.on('end', r); }).end()); }   // 30초: 배포(와 무효화)
  const U3 = chg && after === 'ver' ? '/app.css?v=2' : U1;
  await until(start, 40); got.push(await viaFetch(base + U3));                                  // 40초
  await until(start, 80); got.push(await viaCurl(base + U3));                                   // 80초
  await stop(e); await stop(o.srv);
  return [ttl, q2, chg, after].join('|') + ' => ' + got.concat(o.count).join('|');
}

(async () => {
  const out = ['# node ' + process.version + ' · ' + (await run('curl', ['--version'])).out.split(/\r?\n/)[0].split(' ').slice(0, 2).join(' ') + ' · http-cache-semantics ' + require(path.join(npm, 'http-cache-semantics', 'package.json')).version + ' · 모형의 1초 = 실제 ' + UNIT + 'ms'];
  const jobs = [];
  for (const ttl of [60, 300]) for (const q2 of ['same', 'ref']) for (const chg of [false, true]) for (const after of chg ? ['none', 'purge', 'ver'] : ['none']) jobs.push([ttl, q2, chg, after]);
  for (let i = 0; i < jobs.length; i += 4) out.push(...await Promise.all(jobs.slice(i, i + 4).map(j => combo(...j))));     // 네 조합씩 함께 실행
  fs.writeFileSync(path.join(__dirname, 'cdn_probe.out.txt'), out.join('\n') + '\n');
  console.log(out.join('\n'));
})();

// "URL의 구조" 실습의 모든 설정 조합을 Node.js의 URL, URLSearchParams, HTTP 클라이언트로 실제 실행한다.
// 사용: node verify/net/url_probe.js > verify/net/url_probe.out.txt
// 조합마다 (1) 화면의 코드와 같은 방법으로 URL을 만들어 부분들을 읽고
// (2) Node.js의 http/https 클라이언트로 그 URL에 요청을 보내되, 연결만 127.0.0.1의 시험 서버로 돌려 실제로 나간 요청 줄과 Host 헤더를 받고
// (3) 시험 서버가 받은 요청 줄의 쿼리를 URLSearchParams로 풀이하고 (4) 상대 주소를 new URL(rel, base)로 풀이한다.
// shop.example에 대한 DNS 조회나 외부 접속은 일어나지 않는다. https 주소도 암호화하지 않은 글자로 받는다(요청 줄과 헤더의 내용만 보기 위해서다).
const http = require('http'), https = require('https'), net = require('net');
const origins = ['https://shop.example', 'https://shop.example:443', 'https://shop.example:8443', 'http://shop.example', 'http://shop.example:8080'];
const qs = ['A&B', 'C#', 'C++', '겨울 옷', 'keyboard'], rels = ['detail', '../cart', '/help', '?page=2', '#top', '//cdn.example/app.js'];

// 시험 서버: 받은 요청의 머리 부분을 글자 그대로 넘겨주고 빈 응답을 돌려준다
let onRequest = null;
const server = net.createServer(sock => {
  let buf = ''; sock.on('error', () => {});
  sock.on('data', d => { buf += d.toString('latin1'); if (buf.includes('\r\n\r\n')) { if (onRequest) onRequest(buf); sock.end('HTTP/1.1 200 OK\r\nContent-Length: 0\r\nConnection: close\r\n\r\n'); } });
});
// Node.js의 HTTP 클라이언트가 이 URL로 보내는 요청을 받아 본다. 클라이언트가 접속하려던 포트도 함께 기록한다
function send(url) {
  return new Promise((resolve, reject) => {
    const mod = url.protocol === 'https:' ? https : http, agent = new mod.Agent();
    let wanted = null, raw = null;
    agent.createConnection = opts => { wanted = { host: opts.host, port: opts.port }; return net.connect(server.address().port, '127.0.0.1'); };
    onRequest = text => { raw = text; };
    const req = mod.request(url, { agent }, res => { res.resume(); res.on('end', () => { agent.destroy(); const lines = raw.split('\r\n'); resolve({ wantedHost: wanted.host, connectPort: String(wanted.port), requestLine: lines[0], hostHeader: lines.find(l => /^host:/i.test(l)).replace(/^host:\s*/i, '') }); }); });
    req.on('error', reject); req.end();
  });
}

(async () => {
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  console.log('# node ' + process.version + ' · 형식: 주소의 앞부분|검색어|인코딩|링크 => 실행 결과(JSON)');
  let n = 0;
  for (const origin of origins) for (const q of qs) for (const enc of [false, true]) {
    const keyword = q;
    let url;
    if (enc) { url = new URL(origin + '/shop/list'); url.searchParams.set('q', keyword); url.searchParams.set('sort', 'price'); url.hash = 'review'; }
    else url = new URL(origin + '/shop/list?q=' + keyword + '&sort=price#review');
    const sent = await send(url);
    const target = sent.requestLine.split(' ')[1];
    const params = [...new URL(target, 'http://localhost').searchParams];       // 서버 쪽: 받은 요청 줄에서 쿼리를 풀이
    const first = params.find(p => p[0] === 'q');
    for (const rel of rels) {
      n++;
      console.log([origin, q, enc, rel].join('|') + ' => ' + JSON.stringify({ href: url.href, scheme: url.protocol.replace(':', ''), host: url.hostname, port: url.port, path: url.pathname, query: url.search.replace(/^\?/, ''), frag: url.hash.replace(/^#/, ''),
        wantedHost: sent.wantedHost, connectPort: sent.connectPort, requestLine: sent.requestLine, hostHeader: sent.hostHeader, params, q: first ? first[1] : null, link: new URL(rel, url).href }));
    }
  }
  console.log('# 조합 ' + n + '개');

  // 추가 1: 상대 주소 풀이를 더 여러 가지 기준 주소와 상대 주소로 확인한다 (단계 설명과 설명 용어에 쓴 내용의 근거)
  const bases = ['https://shop.example/shop/list', 'https://shop.example/shop/list/', 'https://shop.example', 'https://shop.example:8443/a/b/c?x=1#y', 'http://shop.example:8080/shop/list?q=1'];
  const moreRels = ['detail', './detail', '../cart', '../../x', '../../../x', '/help', '?page=2', '#top', '', '.', '..', 'a/b/../c', 'detail?x=1#y', 'detail/', '/', '//cdn.example/app.js', 'https://pay.example/checkout', 'HTTP://Other.Example:80/x'];
  for (const base of bases) for (const rel of moreRels) console.log('@rel ' + JSON.stringify({ base, rel, href: new URL(rel, base).href }));

  // 추가 2: 인코딩과 풀이를 더 여러 가지 글자로 확인한다
  const words = ['A&B', 'C#', 'C++', '겨울 옷', 'keyboard', 'a=b', '100%', '50%25', 'x y+z', '~!\'()*', 'é', '😀', 'a/b?c', '"<>`', '한글&english=1#2', '%zz', 'a b', '-._*'];
  for (const w of words) {
    const form = new URLSearchParams({ q: w }).toString();                       // 값을 인코딩해서 넣은 쿼리
    const typed = new URL('https://shop.example/shop/list?q=' + w + '&sort=price#review');   // 그대로 이어 붙인 주소
    const comp = encodeURIComponent(w);
    console.log('@form ' + JSON.stringify({ w, form, formBack: [...new URLSearchParams(form)], typedHref: typed.href, typedQuery: typed.search.replace(/^\?/, ''), typedFrag: typed.hash.replace(/^#/, ''), typedParams: [...typed.searchParams],
      comp, compBack: new URLSearchParams('q=' + comp).get('q') }));
  }
  server.close();
})();

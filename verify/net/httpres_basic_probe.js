// 기초개념 "HTTP 응답" 실습의 모든 설정 조합(상태 줄 3 × Content-Type 줄 2 × Content-Length 3 = 18)을 실제로 실행한다.
// 서버: net 모듈로 띄운다. 연결이 오면 요청을 (빈 줄까지) 읽고, 화면의 글자를 CRLF 줄 끝으로 그대로 써 보낸 뒤 연결을 닫는다.
//       (http 모듈로 응답을 만들면 틀린 모양을 보낼 수 없다)
// 클라이언트: Node.js의 http 모듈(실제 HTTP 해석기)로 GET /hello 요청을 보내 응답을 읽는다. 127.0.0.1에서만 연다.
// 사용: node verify/net/httpres_basic_probe.js     결과는 verify/net/httpres_basic_probe.out.txt에 쓴다.
// 한 줄의 모양: 상태|ctype|clen => state=클라이언트가 읽은 상태|type=받은 content-type 헤더|body=받은 본문(UTF-8)|bytes=받은 본문 바이트 수|ended=응답이 끝났는지|errCode=해석 오류 코드|errMsg=해석 오류 메시지
// '# 보낸 글'은 서버가 보낸 글자 전체, '# 근거'는 이 실습의 문장이 기대는 사실을 따로 잰 것이다.
const net = require('net'), http = require('http'), fs = require('fs'), path = require('path');
const WAIT = 1500;   // 이 시간 안에 응답이 끝나지 않으면 "끝나지 않음"
const BODY = '안녕하세요';
const STATUS = { ok: 'HTTP/1.1 200 OK', notfound: 'HTTP/1.1 404 Not Found', none: null };
const CLEN = { right: 'Content-Length: 15', short: 'Content-Length: 6', none: null };

// 화면의 코드와 같은 글 (빈 줄은 (빈 줄)로 적는다). 화면의 code(c)와 이 글이 같은지 cmp가 확인한다.
function screenCode(st, ctype, clen) {
  const rows = [];
  if (STATUS[st]) rows.push(STATUS[st]);
  if (ctype) rows.push('Content-Type: text/plain; charset=utf-8');
  if (CLEN[clen]) rows.push(CLEN[clen]);
  rows.push('(빈 줄)', BODY);
  return rows.join('\n');
}
// 서버가 실제로 보내는 글자: (빈 줄)은 아무 글자도 없는 줄로, 줄 끝은 CRLF. 본문 뒤에는 아무것도 붙이지 않는다.
function wire(code) { return code.split('\n').map(l => l === '(빈 줄)' ? '' : l).join('\r\n'); }

// 응답 서버. close가 true이면 보낸 뒤 연결을 닫고, false이면 닫지 않는다(근거 측정용).
function startServer(text, close, seen) {
  const socks = new Set();
  return new Promise(resolve => {
    const srv = net.createServer(sock => {
      socks.add(sock); sock.on('error', () => {}); sock.on('close', () => socks.delete(sock));
      let buf = '', sent = false;
      sock.on('data', d => {
        buf += d.toString('latin1');
        if (!sent && buf.includes('\r\n\r\n')) {
          sent = true; if (seen) seen.push(buf.split('\r\n')[0]);
          if (close) sock.end(Buffer.from(text, 'utf8')); else sock.write(Buffer.from(text, 'utf8'));
        }
      });
    });
    srv.destroyAll = () => new Promise(r => { socks.forEach(s => s.destroy()); srv.close(r); });
    srv.listen(0, '127.0.0.1', () => resolve(srv));
  });
}

// http 모듈로 GET /hello를 보내 응답을 읽는다. 연결을 재사용하지 않는다(agent: false).
function fetchOnce(port, wait) {
  return new Promise(resolve => {
    const r = { gotHead: false, state: '', type: null, body: Buffer.alloc(0), ended: false, errCode: '(없음)', errMsg: '(없음)', headers: null, order: [] };
    let done = false;
    const finish = () => { if (done) return; done = true; clearTimeout(t); req.destroy(); resolve(r); };
    const req = http.request({ host: '127.0.0.1', port, path: '/hello', method: 'GET', agent: false }, res => {
      r.order.push('응답'); r.gotHead = true; r.state = res.statusCode + ' ' + res.statusMessage; r.type = res.headers['content-type'] === undefined ? null : res.headers['content-type']; r.headers = res.headers;
      const chunks = [];
      res.on('data', d => { chunks.push(d); r.body = Buffer.concat(chunks); });
      res.on('end', () => { r.order.push('끝'); r.ended = true; r.body = Buffer.concat(chunks); setTimeout(finish, 250); });
      res.on('error', e => { r.order.push('오류'); r.errCode = e.code || e.name; r.errMsg = e.message; });
      res.on('aborted', () => { r.aborted = true; });
    });
    req.on('error', e => { r.order.push('오류'); if (!r.errCode || r.errCode === '(없음)') { r.errCode = e.code || e.name; r.errMsg = e.message; } setTimeout(finish, 100); });
    req.end();
    const t = setTimeout(finish, wait);
  });
}

(async () => {
  const out = ['# node ' + process.version + ' · 127.0.0.1 · net 서버가 글자를 그대로 보내고 연결을 닫음 · http 클라이언트가 GET /hello · 기다리는 시간 ' + WAIT + 'ms'], extra = [];
  // 근거 0: 본문과 앞부분의 UTF-8 바이트 수
  out.push('# 사실 안녕하세요=' + Buffer.byteLength('안녕하세요', 'utf8') + '바이트|안녕=' + Buffer.byteLength('안녕', 'utf8') + '바이트|한 글자=' + Buffer.byteLength('안', 'utf8') + '바이트|하세요=' + Buffer.byteLength('하세요', 'utf8') + '바이트');
  for (const st of Object.keys(STATUS)) for (const ctype of [true, false]) for (const clen of Object.keys(CLEN)) {
    const code = screenCode(st, ctype, clen), text = wire(code), seen = [];
    const srv = await startServer(text, true, seen);
    const r = await fetchOnce(srv.address().port, WAIT);
    await srv.destroyAll();
    const key = [st, ctype, clen].join('|');
    out.push(key + ' => ' + ['state=' + (r.gotHead ? r.state : '(응답으로 읽지 못함)'), 'type=' + (r.gotHead ? (r.type === null ? '(헤더 없음)' : r.type) : '(없음)'), 'body=' + (r.gotHead ? r.body.toString('utf8') : '(없음)'), 'bytes=' + (r.gotHead ? r.body.length : 0), 'ended=' + r.ended, 'errCode=' + r.errCode, 'errMsg=' + r.errMsg, 'order=' + r.order.join('>'), 'server=' + (seen.length ? seen[0] : '(요청 없음)')].join('|'));
    extra.push('# 보낸 글 ' + key + ' = ' + JSON.stringify(text));
    if (r.gotHead) extra.push('# 받은 헤더 ' + key + ' = ' + JSON.stringify(r.headers));
  }

  // 근거 1: 길이 정보가 없을 때 연결이 닫히지 않는 서버 → 클라이언트가 기다리는가. 같은 글을 닫는 서버 / 닫지 않는 서버에 보내 비교한다.
  for (const clen of ['right', 'short', 'none']) for (const close of [true, false]) {
    const text = wire(screenCode('ok', true, clen)), srv = await startServer(text, close, null);
    const r = await fetchOnce(srv.address().port, WAIT);
    await srv.destroyAll();
    out.push('# 근거 연결을' + (close ? ' 닫는' : ' 닫지 않는') + ' 서버, Content-Length ' + clen + ' => 헤더를 받음=' + r.gotHead + '|받은 본문=' + JSON.stringify(r.body.toString('utf8')) + '|바이트=' + r.body.length + '|' + WAIT + 'ms 안에 응답이 끝남=' + r.ended + '|순서=' + r.order.join('>') + '|오류=' + r.errCode);
  }
  // 근거 2: Content-Length: 6일 때 본문 뒤에 남은 바이트(9바이트)가 클라이언트 쪽에서 오류를 내는가는 위 18줄의 errCode로 본다.
  fs.writeFileSync(path.join(__dirname, 'httpres_basic_probe.out.txt'), out.join('\n') + '\n' + extra.join('\n') + '\n');
  console.log(out.join('\n') + '\n' + extra.join('\n'));
})();

// 기초개념 "HTTP 요청" 실습의 모든 설정 조합(첫 줄 3 × Host 줄 2 × 끝의 빈 줄 2 = 12)을
// 127.0.0.1의 Node.js http 서버에 net.connect로 글자를 그대로 보내 실행한다. (http 클라이언트를 쓰면 틀린 모양을 보낼 수 없다)
// 서버: GET /hello에 200과 "안녕하세요", 그 밖의 경로에는 404. 요청 처리 함수가 불렸는지와 받은 method, url을 기록한다.
// 사용: node verify/net/http_basic_probe.js      결과는 verify/net/http_basic_en_probe.out.txt에 쓴다.
// 한 줄의 모양: 첫줄|host|blank => status=상태 줄|body=본문|called=처리 함수가 불렸는지|req=받은 method url|answered=시간 안에 응답이 왔는지|clientError=요청으로 읽지 못해 Node가 낸 오류 코드|hostOff=Host 검사를 끄면 처리 함수가 받는 것
// 줄 끝은 CRLF(\r\n). 빈 줄이 있으면 마지막 헤더(또는 첫 줄)의 CRLF 뒤에 CRLF가 하나 더 간다.
// 같은 글자를 서버 세 개에 따로 보낸다. (1) 기본 서버: 응답과 처리 함수 호출을 잰다. (2) 관찰용 서버: 같은 서버에 clientError 구독만 더한 것(구독이 있으면 Node의 기본 400 응답이 사라지므로 응답은 (1)에서만 잰다).
// (3) Host 검사를 끈 서버(requireHostHeader: false): Host가 없어 거절된 요청이 원래 어떻게 읽혔는지 본다.
const net = require('net'), http = require('http'), fs = require('fs'), path = require('path');
const WAIT = 1500;       // 이 시간 동안 한 바이트도 오지 않으면 "응답 없음"
const SETTLE = 300;      // 첫 바이트가 온 뒤, 새 바이트가 이만큼 오지 않으면 응답이 끝난 것으로 본다
const OBSERVE = 500;     // 관찰용 서버에는 보낸 뒤 이만큼 기다렸다가 기록을 읽는다

const LINES = { ok: 'GET /hello HTTP/1.1', nopath: 'GET /nothing HTTP/1.1', broken: '/hello' };

function startServer(opts, calls, errs) {
  return new Promise(resolve => {
    const srv = http.createServer(opts, (req, res) => {
      calls.push(req.method + ' ' + req.url);
      if (req.method === 'GET' && req.url === '/hello') { res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' }); res.end('Hello'); }
      else { res.writeHead(404); res.end(); }
    });
    if (errs) srv.on('clientError', (e, sock) => { errs.push(e.code); sock.destroy(); });
    srv.listen(0, '127.0.0.1', () => resolve(srv));
  });
}
function stop(srv) { return new Promise(r => { srv.close(r); srv.closeAllConnections(); }); }

// 글자를 그대로 보내고, 받은 바이트를 모은다. 첫 바이트가 WAIT 안에 오지 않으면 빈 채로 끝난다.
function send(port, text, wait, settle) {
  return new Promise(resolve => {
    const chunks = []; let first = null, st = null, done = false;
    const sock = net.connect(port, '127.0.0.1');
    const finish = () => { if (done) return; done = true; clearTimeout(first); clearTimeout(st); sock.destroy(); resolve(Buffer.concat(chunks)); };
    sock.on('connect', () => sock.write(text));
    sock.on('data', d => { chunks.push(d); clearTimeout(first); clearTimeout(st); st = setTimeout(finish, settle); });
    sock.on('close', finish);
    sock.on('error', finish);
    first = setTimeout(finish, wait);
  });
}
// Transfer-Encoding: chunked 본문 풀기
function dechunk(s) {
  let out = '', buf = Buffer.from(s, 'utf8'), i = 0;
  while (i < buf.length) {
    const e = buf.indexOf('\r\n', i); if (e < 0) break;
    const n = parseInt(buf.slice(i, e).toString(), 16); if (!n) break;
    out += buf.slice(e + 2, e + 2 + n).toString('utf8'); i = e + 2 + n + 2;
  }
  return out;
}

(async () => {
  const out = ['# node ' + process.version + ' · 127.0.0.1 · net.connect로 글자 그대로 전송 · 응답 없음 기준: ' + WAIT + 'ms 동안 0바이트'], raws = [];
  for (const line of Object.keys(LINES)) for (const host of [true, false]) for (const blank of [true, false]) {
    const rows = [LINES[line]]; if (host) rows.push('Host: localhost:8080');
    const text = rows.join('\r\n') + '\r\n' + (blank ? '\r\n' : '');
    // (1) 기본 서버
    const calls = [], srv = await startServer({}, calls, null);
    const got = await send(srv.address().port, text, WAIT, SETTLE), raw = got.toString('utf8'), answered = got.length > 0;
    await stop(srv);
    const i = raw.indexOf('\r\n\r\n'), head = answered ? raw.slice(0, i) : '', status = answered ? head.split('\r\n')[0] : '(없음)';
    const body = answered ? (/transfer-encoding: chunked/i.test(head) ? dechunk(raw.slice(i + 4)) : raw.slice(i + 4)) : '';
    // (2) 관찰용 서버
    const calls2 = [], errs = [], obs = await startServer({}, calls2, errs);
    await send(obs.address().port, text, OBSERVE, OBSERVE); await stop(obs);
    // (3) Host 검사를 끈 서버
    const calls3 = [], off = await startServer({ requireHostHeader: false }, calls3, null);
    await send(off.address().port, text, OBSERVE, OBSERVE); await stop(off);
    const key = [line, host, blank].join('|');
    out.push(key + ' => ' + ['status=' + status, 'body=' + body, 'called=' + (calls.length > 0), 'req=' + (calls.length ? calls.join(';') : '(없음)'), 'answered=' + answered, 'clientError=' + (errs.length ? errs.join(',') : '(없음)'), 'hostOff=' + (calls3.length ? calls3.join(';') : '(없음)')].join('|'));
    raws.push('# 보낸 글 ' + key + ' = ' + JSON.stringify(text) + '\n# 받은 글 ' + key + ' = ' + JSON.stringify(raw));
  }
  fs.writeFileSync(path.join(__dirname, 'http_basic_en_probe.out.txt'), out.join('\n') + '\n' + raws.join('\n') + '\n');
  console.log(out.join('\n') + '\n' + raws.join('\n'));
})();

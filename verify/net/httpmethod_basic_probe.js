// 기초개념 "HTTP 메서드" 실습의 모든 설정 조합(메서드 3 × 보내는 횟수 2 = 6)을 실제로 실행한다.
// 서버: Node.js http 모듈로 127.0.0.1의 빈 포트(0)에 띄운다. 목록(memos)에 처음에는 "first" 하나가 있다.
//   GET /memos  → 200, 본문은 목록을 ", "로 이은 글      (목록은 바뀌지 않는다)
//   POST /memos → 요청 본문의 글을 목록에 더하고 200, 본문은 더한 뒤의 목록
//   /memos에 그 밖의 메서드 → 405, Allow: GET, POST를 서버 코드가 붙인다
//   그 밖의 경로 → 404
// 클라이언트: net.connect로 화면의 요청 글자를 그대로(줄 끝 CRLF) 보내고, 서버가 연결을 닫을 때까지 받아 해석한다.
//   두 번 보낼 때는 연결을 새로 맺어 같은 글자를 한 번 더 보낸다.
// 사용: node verify/net/httpmethod_basic_probe.js     결과는 verify/net/httpmethod_basic_probe.out.txt에 쓴다.
// 한 줄의 모양: 메서드|횟수 => status1=..|body1=..|allow1=..|status2=..|body2=..|allow2=..|seen=서버가 받은 method url [본문]들|before=처음 목록|after=요청 뒤 목록|count=요청 뒤 개수|changed=목록이 바뀌었는가|check=마지막에 GET /memos로 다시 읽은 본문|checkSame=check가 서버의 실제 목록과 같은가
// '# 화면 코드'는 화면의 code(c)와 같아야 하는 글, '# 보낸 글'은 실제로 보낸 글자, '# 받은 글'은 첫 응답의 원문이다.
const net = require('net'), http = require('http'), fs = require('fs'), path = require('path');
const INITIAL = 'first';

const REQ = {
  GET: ['GET /memos HTTP/1.1', 'Host: localhost:8080', '(빈 줄)'],
  POST: ['POST /memos HTTP/1.1', 'Host: localhost:8080', 'Content-Length: 5', '(빈 줄)', 'hello'],
  DELETE: ['DELETE /memos HTTP/1.1', 'Host: localhost:8080', '(빈 줄)'],
};
// 화면의 코드와 같은 글 (빈 줄은 (빈 줄)로 적는다)
function screenCode(method, times) {
  const out = [];
  if (times === 2) out.push('# 같은 요청을 두 번 보낸다');
  out.push(...REQ[method], '', '# 서버: 처음 목록에는 메모 first 하나가 있다', '# 서버: GET /memos → 목록을 돌려준다', '# 서버: POST /memos → 본문의 글을 목록에 더한다');
  return out.join('\n');
}
// 실제로 보내는 글자: 요청 줄들만. (빈 줄)은 아무 글자도 없는 줄로, 줄 끝은 CRLF. 마지막이 (빈 줄)이면 그 앞 줄의 CRLF 뒤에 CRLF가 하나 더 간다.
function wire(method) {
  const rows = REQ[method];
  return rows.map(l => l === '(빈 줄)' ? '' : l).join('\r\n') + (rows[rows.length - 1] === '(빈 줄)' ? '\r\n' : '');
}

function startServer(state) {
  return new Promise(resolve => {
    const srv = http.createServer((req, res) => {
      let body = ''; req.setEncoding('utf8');
      req.on('data', d => body += d);
      req.on('end', () => {
        state.seen.push(req.method + ' ' + req.url + (body ? ' [' + body + ']' : ''));
        const send = (code, text, extra) => {
          const b = Buffer.from(text, 'utf8');
          res.writeHead(code, Object.assign({ 'Content-Type': 'text/plain; charset=utf-8', 'Content-Length': b.length, Connection: 'close' }, extra || {}));
          res.end(b);
        };
        if (req.url === '/memos' && req.method === 'GET') send(200, state.memos.join(', '));
        else if (req.url === '/memos' && req.method === 'POST') { state.memos.push(body); send(200, state.memos.join(', ')); }
        else if (req.url === '/memos') send(405, '', { Allow: 'GET, POST' });
        else send(404, '');
      });
    });
    srv.listen(0, '127.0.0.1', () => resolve(srv));
  });
}
function stop(srv) { return new Promise(r => { srv.close(r); srv.closeAllConnections(); }); }

function sendRaw(port, text) {
  return new Promise(resolve => {
    const chunks = []; let done = false;
    const sock = net.connect(port, '127.0.0.1');
    const finish = () => { if (done) return; done = true; clearTimeout(t); sock.destroy(); resolve(Buffer.concat(chunks).toString('utf8')); };
    sock.on('connect', () => sock.write(text));
    sock.on('data', d => chunks.push(d));
    sock.on('close', finish); sock.on('error', finish);
    const t = setTimeout(finish, 3000);
  });
}
function parse(raw) {
  const i = raw.indexOf('\r\n\r\n'), head = raw.slice(0, i).split('\r\n'), h = {};
  head.slice(1).forEach(l => { const k = l.indexOf(':'); h[l.slice(0, k).toLowerCase()] = l.slice(k + 1).trim(); });
  return { status: head[0].replace(/^HTTP\/1\.1 /, ''), allow: h.allow === undefined ? '(없음)' : h.allow, body: raw.slice(i + 4), len: h['content-length'] };
}

(async () => {
  const out = ['# node ' + process.version + ' · 127.0.0.1 빈 포트 · net.connect로 요청 글자 그대로 전송 · 서버가 연결을 닫을 때까지 받음'], extra = [];
  for (const method of Object.keys(REQ)) for (const times of [1, 2]) {
    const state = { memos: [INITIAL], seen: [] }, srv = await startServer(state), port = srv.address().port;
    const before = state.memos.join(', '), text = wire(method), f = [];
    let firstRaw = '';
    for (let n = 1; n <= times; n++) {
      const raw = await sendRaw(port, text); if (n === 1) firstRaw = raw;
      const r = parse(raw);
      f.push('status' + n + '=' + r.status, 'body' + n + '=' + r.body, 'allow' + n + '=' + r.allow);
    }
    const after = state.memos.join(', '), seenReq = state.seen.slice();
    const chk = parse(await sendRaw(port, wire('GET'))).body;   // 확인용: 서버 밖에서 GET으로 다시 읽은 목록
    await stop(srv);
    const key = method + '|' + times;
    out.push(key + ' => ' + f.concat(['seen=' + seenReq.join(';'), 'before=' + before, 'after=' + after, 'count=' + state.memos.length, 'changed=' + (before !== after), 'check=' + chk, 'checkSame=' + (chk === after)]).join('|'));
    extra.push('# 화면 코드 ' + key + ' = ' + JSON.stringify(screenCode(method, times)));
    extra.push('# 보낸 글 ' + key + ' = ' + JSON.stringify(text));
    extra.push('# 받은 글 ' + key + ' = ' + JSON.stringify(firstRaw));
  }
  // 근거: 서버에 없는 주소 /nothing에 GET을 보내면 (주소가 없을 때의 404와, 주소는 있고 메서드가 안 맞을 때의 405를 가르는 문장이 기댄다)
  {
    const state = { memos: [INITIAL], seen: [] }, srv = await startServer(state);
    const r = parse(await sendRaw(srv.address().port, 'GET /nothing HTTP/1.1\r\nHost: localhost:8080\r\n\r\n'));
    await stop(srv);
    out.push('# 근거 없는 주소 GET /nothing => status=' + r.status + '|allow=' + r.allow + '|seen=' + state.seen.join(';'));
  }
  fs.writeFileSync(path.join(__dirname, 'httpmethod_basic_probe.out.txt'), out.join('\n') + '\n' + extra.join('\n') + '\n');
  console.log(out.join('\n') + '\n' + extra.join('\n'));
})();

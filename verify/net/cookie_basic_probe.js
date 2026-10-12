// 기초개념 "쿠키" 실습의 모든 설정 조합(Set-Cookie 줄 2 × 요청을 보내는 쪽 3 = 6)을 실제로 실행한다.
// 서버: net 모듈로 127.0.0.1의 빈 포트에 띄운다. 요청의 헤더를 빈 줄까지 읽고, Cookie 헤더에 visitor 값이 있으면 "또 오셨군요, 값"을,
//       없으면 "처음 오셨군요"를 화면의 응답 글(CRLF 줄 끝) 그대로 써 보낸 뒤 연결을 닫는다. (http 모듈은 Date 같은 헤더를 더 붙여 화면의 글과 달라진다)
//       Set-Cookie 줄은 설정이 켜져 있고 Cookie 헤더가 없던 요청의 응답에만 붙인다. 서버는 방문자를 기억하는 곳이 없다(요청마다 그 요청의 글만 본다).
// 클라이언트: 쿠키 규칙(RFC 6265)을 구현한 이 PC의 curl. 쿠키를 저장하는 쪽은 curl -b <jar> -c <jar>, 저장하지 않는 쪽은 쿠키 옵션이 없는 curl.
//       "사용자가 쿠키를 지운다"는 둘째 요청에 새 빈 jar 파일을 주는 것으로 재현한다. (파일을 지우지 않는다)
// 사용: node verify/net/cookie_basic_probe.js     결과는 verify/net/cookie_basic_probe.out.txt에 쓴다. jar 파일은 verify/out/cookie_basic/ 아래에 둔다.
// 한 줄의 모양: set|client => stored1=첫 응답 뒤 jar의 쿠키|cookie1=서버가 받은 첫 요청의 Cookie 헤더|cookie2=서버가 받은 둘째 요청의 Cookie 헤더|resp2=둘째 응답 본문(클라이언트가 받은 것)
//   |setSent1=첫 응답에 Set-Cookie가 있었는지|setSent2=둘째 응답에 Set-Cookie가 있었는지|clientSaw1=클라이언트가 받은 첫 응답에 Set-Cookie 줄이 있었는지
//   |stored2=둘째 응답 뒤 jar의 쿠키|fresh=쿠키 없는 새 클라이언트가 그 뒤에 요청했을 때의 응답|manualCookie=curl 인자에 Cookie 헤더를 직접 적었는지|statusOk=curl 종료 코드가 0이고 상태 줄이 200 OK인지
// '# ' 줄은 원문이다: 서버가 받은 요청 전체, 서버가 보낸 응답 전체, jar 파일 내용, curl 인자.
const net = require('net'), fs = require('fs'), path = require('path'), cp = require('child_process');
const OUT_DIR = path.join(__dirname, '..', 'out', 'cookie_basic');
fs.mkdirSync(OUT_DIR, { recursive: true });
const slash = p => p.replace(/\\/g, '/');

// 서버가 보내는 글. 화면의 코드(첫 응답)와 같은 모양이다. 화면의 code(c)와 같은지는 cmp가 확인한다.
function responseText(set, visitor) {
  const rows = ['HTTP/1.1 200 OK'];
  if (visitor === null && set) rows.push('Set-Cookie: visitor=kim');
  rows.push('Content-Type: text/plain; charset=utf-8', '', visitor === null ? '처음 오셨군요' : '또 오셨군요, ' + visitor);
  return rows.join('\r\n');
}
// Cookie 헤더 값에서 visitor를 찾는다
function visitorOf(cookieValue) {
  if (!cookieValue) return null;
  for (const p of cookieValue.split(';')) { const t = p.trim(), i = t.indexOf('='); if (i > 0 && t.slice(0, i) === 'visitor') return t.slice(i + 1); }
  return null;
}
function startServer(set, log) {
  const socks = new Set();
  return new Promise(resolve => {
    const srv = net.createServer(sock => {
      socks.add(sock); sock.on('error', () => {}); sock.on('close', () => socks.delete(sock));
      let buf = '', answered = false;
      sock.on('data', d => {
        buf += d.toString('latin1');
        if (answered || !buf.includes('\r\n\r\n')) return;
        answered = true;
        const head = buf.slice(0, buf.indexOf('\r\n\r\n')), lines = head.split('\r\n'), hs = {};
        lines.slice(1).forEach(l => { const i = l.indexOf(':'); if (i > 0) hs[l.slice(0, i).toLowerCase()] = l.slice(i + 1).trim(); });
        const text = responseText(set, visitorOf(hs.cookie));
        log.push({ request: head + '\r\n\r\n', cookie: hs.cookie === undefined ? null : hs.cookie, response: text });
        sock.end(Buffer.from(text, 'utf8'));
      });
    });
    srv.destroyAll = () => new Promise(r => { socks.forEach(s => s.destroy()); srv.close(r); });
    srv.listen(0, '127.0.0.1', () => resolve(srv));
  });
}

// curl을 실행해 받은 글(상태 줄과 헤더와 본문)을 돌려준다. 프록시 환경 변수는 쓰지 않는다.
function curl(port, jar) {
  // 같은 프로세스의 서버가 응답해야 하므로 동기 실행(spawnSync)을 쓰지 않는다
  const args = ['-s', '-i', '--noproxy', '*', '--max-time', '10'];
  if (jar) args.push('-b', slash(jar), '-c', slash(jar));
  args.push('http://127.0.0.1:' + port + '/');
  return new Promise(resolve => {
    const p = cp.spawn('curl', args), o = [], e = [];
    p.stdout.on('data', d => o.push(d)); p.stderr.on('data', d => e.push(d));
    p.on('close', code => {
      const raw = Buffer.concat(o).toString('utf8'), i = raw.indexOf('\r\n\r\n');
      resolve({ args, code, raw, head: i >= 0 ? raw.slice(0, i) : raw, body: i >= 0 ? raw.slice(i + 4) : '', err: Buffer.concat(e).toString('utf8') });
    });
  });
}
// jar 파일(Netscape 형식)에서 쿠키 이름=값을 읽는다
function readJar(jar) {
  const txt = fs.readFileSync(jar, 'utf8'), got = [];
  txt.split(/\r?\n/).forEach(l => { if (!l || (l.startsWith('#') && !l.startsWith('#HttpOnly_'))) return; const f = l.split('\t'); if (f.length >= 7) got.push(f[5] + '=' + f[6]); });
  return { txt, stored: got.length ? got.join('; ') : '없음' };
}
function freshJar(name) { const p = path.join(OUT_DIR, name); fs.writeFileSync(p, ''); return p; }   // 비어 있는 새 파일 (이미 있으면 내용만 비운다)

(async () => {
  const ver = cp.spawnSync('curl', ['--version']).stdout.toString('utf8').split(/\r?\n/)[0];
  const out = ['# node ' + process.version + ' · ' + ver + ' · 127.0.0.1 · net 서버가 화면의 응답 글을 그대로 보냄 · 클라이언트는 curl(쿠키 엔진: -b/-c)'], raws = [];
  for (const set of [true, false]) for (const client of ['keep', 'clear', 'nojar']) {
    const key = [set, client].join('|'), tag = set + '-' + client, log = [], srv = await startServer(set, log), port = srv.address().port;
    let jar1 = null, jar2 = null;
    if (client !== 'nojar') jar1 = freshJar(tag + '-1.jar');
    const r1 = await curl(port, jar1);
    const j1 = jar1 ? readJar(jar1) : { txt: '(jar 파일 없음: 쿠키 옵션이 없는 curl)', stored: '없음' };
    // 둘째 요청: keep은 같은 jar, clear는 새 빈 jar(사용자가 쿠키를 지운 것), nojar는 옵션 없이
    jar2 = client === 'keep' ? jar1 : client === 'clear' ? freshJar(tag + '-2.jar') : null;
    const r2 = await curl(port, jar2);
    const j2 = jar2 ? readJar(jar2) : { txt: '(jar 파일 없음: 쿠키 옵션이 없는 curl)', stored: '없음' };
    // 쿠키 없는 새 클라이언트가 그 뒤에 요청하면 서버는 앞의 방문자를 기억하지 못한다
    const jar3 = freshJar(tag + '-3.jar'), r3 = await curl(port, jar3);
    await srv.destroyAll();
    const hasSet = t => /^set-cookie:/im.test(t);
    const ck = x => x === null ? '(없음)' : x;
    const manual = [r1, r2, r3].some(r => r.args.some(a => /^(-H|--header)$/.test(a) || /cookie:/i.test(a)));
    const ok = [r1, r2, r3].every(r => r.code === 0 && r.head.split('\r\n')[0] === 'HTTP/1.1 200 OK');
    out.push(key + ' => ' + ['stored1=' + j1.stored, 'cookie1=' + ck(log[0] && log[0].cookie), 'cookie2=' + ck(log[1] && log[1].cookie), 'resp2=' + r2.body,
      'setSent1=' + hasSet(log[0].response), 'setSent2=' + hasSet(log[1].response), 'clientSaw1=' + hasSet(r1.head), 'stored2=' + j2.stored, 'fresh=' + r3.body,
      'manualCookie=' + manual, 'statusOk=' + ok, 'requests=' + log.length].join('|'));
    [['첫 요청', log[0].request], ['첫 응답', log[0].response], ['둘째 요청', log[1].request], ['둘째 응답', log[1].response], ['jar(첫 응답 뒤)', j1.txt], ['jar(둘째 응답 뒤)', j2.txt],
      ['curl 인자(첫 요청)', r1.args.join(' ')], ['curl 인자(둘째 요청)', r2.args.join(' ')]].forEach(([n, t]) => raws.push('# ' + n + ' ' + key + ' = ' + JSON.stringify(t)));
  }
  const lines = out.concat(raws);
  fs.writeFileSync(path.join(__dirname, 'cookie_basic_probe.out.txt'), lines.join('\n') + '\n');
  console.log(lines.join('\n'));
})();

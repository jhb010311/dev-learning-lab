// 리다이렉션 실습의 모든 설정 조합(상태 코드 5 × 메서드 3 × 가리키는 곳 2 = 30)을
// 127.0.0.1의 시험 서버와 실제 클라이언트 두 가지(Node의 fetch, curl -L)로 실행한다.
// 사용: node verify/net/redirect_probe.js      결과는 verify/net/redirect_probe.out.txt에 쓴다.
// 한 줄의 모양: 코드|메서드|가리키는 곳 => fetch의 두 번째 요청|curl의 두 번째 요청|fetch 때 서버에 온 요청 수|curl 때 요청 수|fetch의 끝|curl의 끝
const http = require('http'), cp = require('child_process'), fs = require('fs'), os = require('os'), path = require('path');
const BODY = 'item=keyboard';

// 조합 하나에 서버 하나. /order가 주어진 코드로 /orders를 가리키고, loop이면 /orders도 /order를 가리킨다.
function startServer(code, loop, log) {
  return new Promise(resolve => {
    const srv = http.createServer((req, res) => {
      let n = 0;
      req.on('data', d => { n += d.length; });
      req.on('end', () => {
        log.push(req.method + ' ' + req.url + (n ? ' +본문' : ''));
        if (req.url === '/order') { res.writeHead(code, { Location: '/orders' }); return res.end(); }
        if (req.url === '/orders' && loop) { res.writeHead(code, { Location: '/order' }); return res.end(); }
        res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' }); res.end('주문 목록');
      });
    });
    srv.listen(0, '127.0.0.1', () => resolve(srv));
  });
}
function stop(srv) { return new Promise(r => { srv.close(r); srv.closeAllConnections(); }); }
function run(cmd, args) { return new Promise(r => cp.execFile(cmd, args, { encoding: 'utf8' }, (e, so, se) => r({ exit: e ? e.code : 0, out: so, err: se.trim() }))); }

(async () => {
  const out = [], tmp = path.join(os.tmpdir(), 'lab_redirect_body.txt');
  fs.writeFileSync(tmp, BODY);                                  // curl -T(PUT)로 올릴 본문
  const ver = (await run('curl', ['--version'])).out.split(/\r?\n/)[0].split(' ').slice(0, 2).join(' ');
  out.push('# node ' + process.version + ' (fetch) · ' + ver);
  for (const code of [301, 302, 303, 307, 308]) for (const m of ['GET', 'POST', 'PUT']) for (const dest of ['ok', 'loop']) {
    const log = [], srv = await startServer(code, dest === 'loop', log), url = 'http://127.0.0.1:' + srv.address().port + '/order';
    // 1) fetch: 기본값이 redirect: 'follow'
    let fEnd;
    try { const r = await fetch(url, m === 'GET' ? {} : { method: m, body: BODY, headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }); await r.text(); fEnd = String(r.status); }
    catch (e) { fEnd = 'ERR ' + (e.cause ? e.cause.message : e.message); }
    const fLog = log.splice(0);
    // 2) curl -L: POST는 -d, PUT은 -T(파일 올리기)
    const args = ['-sS', '-L', '-o', os.devNull, '-w', '%{http_code}'];
    if (m === 'POST') args.push('-d', BODY); if (m === 'PUT') args.push('-T', tmp);
    const c = await run('curl', args.concat(url)), cLog = log.splice(0);
    const cEnd = c.exit === 0 ? c.out : 'ERR exit ' + c.exit + ' ' + c.err.replace(/^curl: /, '');
    await stop(srv);
    if (fLog[0] !== cLog[0] || !fLog[0].startsWith(m + ' /order')) throw new Error('첫 요청이 예상과 다름: ' + fLog[0] + ' / ' + cLog[0]);
    out.push([code, m, dest].join('|') + ' => ' + [fLog[1], cLog[1], fLog.length, cLog.length, fEnd, cEnd].join('|'));
  }
  // 따라가지 않는 클라이언트: Node의 http 모듈, -L이 없는 curl, redirect: 'manual'인 fetch는 3xx 응답을 그대로 받는다
  const log = [], srv = await startServer(302, false, log), url = 'http://127.0.0.1:' + srv.address().port + '/order';
  const h = await new Promise(r => http.get(url, x => { x.resume(); x.on('end', () => r(x.statusCode + ' Location=' + x.headers.location)); }));
  out.push('# 따라가지 않음 http.get => ' + h + ' 요청 ' + log.splice(0).length + '번');
  const c = await run('curl', ['-sS', '-o', os.devNull, '-w', '%{http_code}', url]);
  out.push('# 따라가지 않음 curl(-L 없음) => ' + c.out + ' 요청 ' + log.splice(0).length + '번');
  const f = await fetch(url, { redirect: 'manual' });
  out.push('# 따라가지 않음 fetch(redirect: manual) => ' + f.status + ' Location=' + f.headers.get('location') + ' 요청 ' + log.splice(0).length + '번');
  await stop(srv);
  fs.writeFileSync(path.join(__dirname, 'redirect_probe.out.txt'), out.join('\n') + '\n');
  console.log(out.join('\n'));
})();

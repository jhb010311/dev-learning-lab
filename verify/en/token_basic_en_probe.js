// English-lab version of verify/net/token_basic_probe.js: same keys, same user names (kim, admin), same method. The only change is the response body of GET /me: "안녕하세요, <user>" became "Hello, <user>". Tokens do not contain that text, so they are expected to be identical to the Korean-lab run (the output is compared by hand/diff).
// 기초개념 "토큰" 실습의 모든 설정 조합(보내는 토큰 5 × 서버가 서명을 확인함 2 = 10)을 실제로 실행한다.
// 토큰: JWT(HS256). Node.js crypto(HMAC-SHA256)와 base64url로 RFC 7515의 방식대로 만들고 확인한다.
// 먼저 RFC 7515 부록 A.1의 예시(문서에 적힌 열쇠, 머리, 내용)로 이 파일의 sign()이 문서의 서명 값을 내는지 확인해 출력 첫머리에 남긴다.
// 서버: 127.0.0.1의 Node.js http 서버. POST /login은 로그인한 사람의 이름을 받아 토큰을 만들어 돌려주고(서버는 아무것도 저장하지 않는다),
//       GET /me는 Authorization 헤더의 토큰을 꺼내 check가 true면 서명을 확인하고(맞지 않거나 없으면 401), false면 확인 없이 내용만 읽어 응답한다.
//       서버의 판단은 handle(req, key, check)라는 한 함수가 하고, 이 함수는 요청과 열쇠와 check만 읽는다(어떤 저장소도 찾아보지 않는다).
// 클라이언트: Node.js http.request(실제 HTTP 요청). 조합에 따른 토큰을 Authorization: Bearer 헤더에 실어 보낸다.
// 시험용 비밀 열쇠와 "다른 열쇠"는 이 파일에만 있다. 출력에는 열쇠의 값을 쓰지 않는다. (jose4j 확인에는 표준입력으로 건넨다)
// 사용: node verify/en/token_basic_en_probe.js     결과는 verify/en/token_basic_en_probe.out.txt와 token_basic_en_jose4j.out.txt에 쓴다.
// 한 줄의 모양: 토큰|check => verify=서버의 서명 확인 결과(match|mismatch|missing|skipped|no-token|malformed)|user=서버가 믿은 사용자|status=응답 상태 코드|body=응답 본문
//   |authz=서버가 받은 Authorization 헤더|www=401의 WWW-Authenticate 헤더|http=요청의 HTTP 버전|reqline=서버가 받은 요청의 method와 url
// '# ' 줄은 부가 사실이다.
const http = require('http'), crypto = require('crypto'), fs = require('fs'), path = require('path'), cp = require('child_process');

const SERVER_KEY = Buffer.from('shop-example-token-basic-key-001', 'ascii');   // 시험용 값. 서버만 아는 열쇠 (32바이트)
const OTHER_KEY = Buffer.from('someone-elses-guessed-key-000000', 'ascii');                      // 시험용 값. 서버의 열쇠가 아닌 다른 열쇠
const JDK = 'E:/dev/jdk-21.0.12.1+1/bin', JOSE = 'E:/dev/gradle/caches/modules-2/files-2.1/org.bitbucket.b_c/jose4j/0.9.5/e4ca26802488e6f16e24558d74ac8775a955fdd3/jose4j-0.9.5.jar',
  SLF4J = 'E:/dev/java-interview-lab/verify/spring/libs/slf4j-api-2.0.18.jar';

// ---- 토큰 만들기 (RFC 7515: 서명 입력 = ASCII(BASE64URL(머리) || '.' || BASE64URL(내용)), 서명 = BASE64URL(HMAC-SHA256)) ----
const b64u = s => Buffer.from(s, 'utf8').toString('base64url');
const fromB64u = s => Buffer.from(s, 'base64url').toString('utf8');
const sign = (key, input) => crypto.createHmac('sha256', key).update(input, 'ascii').digest('base64url');
const HEADER = '{"alg":"HS256"}', KIM = '{"user":"kim"}', ADMIN = '{"user":"admin"}';
const makeToken = (key, headerText, payloadText) => { const h = b64u(headerText), p = b64u(payloadText); return h + '.' + p + '.' + sign(key, h + '.' + p); };

// ---- 서버의 판단: 요청과 열쇠와 check만 읽는다 ----
function handle(req, key, check) {
  const reply = (status, body, info) => Object.assign({ status, body, user: '-' }, info);
  if (req.method === 'GET' && req.url === '/me') {
    const authz = req.headers.authorization;
    const m = authz === undefined ? null : /^Bearer +(\S+)$/.exec(authz);
    if (!m) return reply(401, '', { verify: 'no-token', www: 'Bearer' });
    const part = m[1].split('.');
    if (part.length !== 3) return reply(401, '', { verify: 'malformed', www: 'Bearer' });
    let verify = 'skipped';
    if (check) {
      if (part[2] === '') verify = 'missing';
      else {
        const expected = crypto.createHmac('sha256', key).update(part[0] + '.' + part[1], 'ascii').digest(), got = Buffer.from(part[2], 'base64url');
        verify = got.length === expected.length && crypto.timingSafeEqual(got, expected) ? 'match' : 'mismatch';
      }
    }
    if (verify === 'missing' || verify === 'mismatch') return reply(401, '', { verify, www: 'Bearer' });
    const user = JSON.parse(fromB64u(part[1])).user;
    return reply(200, 'Hello, ' + user, { verify, user });
  }
  return reply(404, '', { verify: 'n/a' });
}
function startServer(key, check, log) {
  return new Promise(resolve => {
    const srv = http.createServer((req, res) => {
      if (req.method === 'POST' && req.url === '/login') {   // 로그인: 받은 이름을 적고 서명을 붙여 돌려준다. 서버는 이 일을 어디에도 적어 두지 않는다.
        let body = ''; req.on('data', d => body += d); req.on('end', () => { const user = body.trim(); res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' }); res.end(makeToken(key, HEADER, '{"user":"' + user + '"}')); });
        return;
      }
      const r = handle(req, key, check);
      log.push({ reqline: req.method + ' ' + req.url, http: req.httpVersion, authz: req.headers.authorization === undefined ? null : req.headers.authorization, rawHeaders: req.rawHeaders.slice(), r });
      const h = { 'Content-Type': 'text/plain; charset=utf-8' }; if (r.www) h['WWW-Authenticate'] = r.www;
      res.writeHead(r.status, h); res.end(r.body);
    });
    srv.listen(0, '127.0.0.1', () => resolve(srv));
  });
}
const stop = srv => new Promise(r => { srv.close(r); srv.closeAllConnections(); });

function request(port, method, url, headers, body) {
  return new Promise((resolve, reject) => {
    const req = http.request({ host: '127.0.0.1', port, method, path: url, headers: headers || {}, agent: false }, res => {
      const c = []; res.on('data', d => c.push(d)); res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: Buffer.concat(c).toString('utf8') }));
    });
    req.on('error', reject); if (body) req.write(body); req.end();
  });
}
const get = (port, token) => request(port, 'GET', '/me', token === null ? {} : { Authorization: 'Bearer ' + token });

(async () => {
  const out = ['# node ' + process.version + ' · openssl ' + process.versions.openssl + ' · 127.0.0.1 · HMAC-SHA256, base64url · JWT(HS256)'];
  // (1) RFC 7515 부록 A.1 — 문서의 값과 이 파일의 sign()이 낸 값을 견준다
  const A1 = {
    header: '{"typ":"JWT",\r\n "alg":"HS256"}', payload: '{"iss":"joe",\r\n "exp":1300819380,\r\n "http://example.com/is_root":true}',
    k: 'AyM1SysPpbyDfgZld3umj1qzKObwVMkoqQ-EstJQLr_T-1qS0gZH75aKtMN3Yj0iPS4hcgUuTwjAzZr1Z9CAow',
    headerB64: 'eyJ0eXAiOiJKV1QiLA0KICJhbGciOiJIUzI1NiJ9', payloadB64: 'eyJpc3MiOiJqb2UiLA0KICJleHAiOjEzMDA4MTkzODAsDQogImh0dHA6Ly9leGFtcGxlLmNvbS9pc19yb290Ijp0cnVlfQ',
    sig: 'dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk',
    headerOctets: [123, 34, 116, 121, 112, 34, 58, 34, 74, 87, 84, 34, 44, 13, 10, 32, 34, 97, 108, 103, 34, 58, 34, 72, 83, 50, 53, 54, 34, 125],
    sigOctets: [116, 24, 223, 180, 151, 153, 224, 37, 79, 250, 96, 125, 216, 173, 187, 186, 22, 212, 37, 77, 105, 214, 191, 240, 91, 88, 5, 88, 83, 132, 141, 121],
    full: 'eyJ0eXAiOiJKV1QiLA0KICJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJqb2UiLA0KICJleHAiOjEzMDA4MTkzODAsDQogImh0dHA6Ly9leGFtcGxlLmNvbS9pc19yb290Ijp0cnVlfQ.dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk',
  };
  const a1key = Buffer.from(A1.k, 'base64url'), a1h = b64u(A1.header), a1p = b64u(A1.payload), a1sig = sign(a1key, a1h + '.' + a1p);
  const a1sigOct = [...crypto.createHmac('sha256', a1key).update(a1h + '.' + a1p, 'ascii').digest()];
  const a1 = {
    headerOctets: JSON.stringify([...Buffer.from(A1.header, 'utf8')]) === JSON.stringify(A1.headerOctets), headerB64: a1h === A1.headerB64, payloadB64: a1p === A1.payloadB64,
    sig: a1sig === A1.sig, sigOctets: JSON.stringify(a1sigOct) === JSON.stringify(A1.sigOctets), full: a1h + '.' + a1p + '.' + a1sig === A1.full,
    keyBytes: a1key.length,
  };
  out.push('# rfc7515-A.1 (문서의 열쇠 k, 머리, 내용으로 이 파일의 sign()을 돌림; 값은 rfc-editor.org/rfc/rfc7515.html 부록 A.1에서 옮김) => ' + Object.keys(a1).map(k => k + '=' + a1[k]).join('|'));
  out.push('# rfc7515-A.1 계산한 서명 ' + a1sig + ' / 문서의 서명 ' + A1.sig);

  // (2) 서버가 로그인에 준 토큰과 조합별 토큰
  const tokens = {}, log0 = [], s0 = await startServer(SERVER_KEY, true, log0);
  const login = await request(s0.address().port, 'POST', '/login', { 'Content-Type': 'text/plain' }, 'kim');
  const loginAdmin = await request(s0.address().port, 'POST', '/login', { 'Content-Type': 'text/plain' }, 'admin');
  await stop(s0);
  const good = login.body, gp = good.split('.');
  tokens.good = good;                                                              // 서버가 로그인 때 준 토큰 그대로
  tokens.edited = gp[0] + '.' + b64u(ADMIN) + '.' + gp[2];                         // 내용만 admin으로 고치고 서명은 그대로
  tokens.nosig = gp[0] + '.' + gp[1] + '.';                                        // 서명만 떼어 냄 (점은 남기고 서명 자리를 비움)
  tokens.otherkey = makeToken(OTHER_KEY, HEADER, ADMIN);                           // 내용은 admin, 다른 열쇠로 서명
  tokens.none = null;                                                              // 토큰 없이
  out.push('# login 응답 상태 ' + login.status + ' · 로그인 응답 토큰 = makeToken(서버 열쇠, 머리, kim) : ' + (good === makeToken(SERVER_KEY, HEADER, KIM)) + ' · 서버가 만든 admin 토큰(참고) = 고친 토큰의 내용과 같은 내용 : ' + (loginAdmin.body.split('.')[1] === b64u(ADMIN)));
  for (const k of ['good', 'edited', 'nosig', 'otherkey']) out.push('# token.' + k + ' ' + tokens[k]);
  out.push('# token.none (Authorization 헤더를 보내지 않음)');
  for (const k of ['good', 'edited', 'nosig', 'otherkey']) { const p = tokens[k].split('.'); out.push('# decoded.' + k + ' 머리=' + fromB64u(p[0]) + ' 내용=' + (p[1] ? fromB64u(p[1]) : '') + ' 서명길이=' + p[2].length); }
  const serverSigFor = { kim: sign(SERVER_KEY, gp[0] + '.' + b64u(KIM)), admin: sign(SERVER_KEY, gp[0] + '.' + b64u(ADMIN)) };
  out.push('# recomputed 서버 열쇠로 kim 내용을 계산 ' + serverSigFor.kim + ' · 고친(admin) 내용을 계산 ' + serverSigFor.admin + ' · 고친 토큰에 붙어 온 서명 ' + gp[2] + ' · 고친 내용으로 계산한 값이 붙어 온 서명과 다름 : ' + (serverSigFor.admin !== gp[2]) + ' · 다른 열쇠로 만든 서명 ' + tokens.otherkey.split('.')[2] + ' (서버가 계산한 admin 값과 다름 : ' + (tokens.otherkey.split('.')[2] !== serverSigFor.admin) + ')');

  // (3) 조합별 실행
  const raws = [];
  for (const tok of ['good', 'edited', 'nosig', 'otherkey', 'none']) for (const check of [true, false]) {
    const log = [], srv = await startServer(SERVER_KEY, check, log), res = await get(srv.address().port, tokens[tok]); await stop(srv);
    const e = log[0];
    out.push([tok, check].join('|') + ' => ' + ['verify=' + e.r.verify, 'user=' + e.r.user, 'status=' + res.status, 'body=' + res.body, 'authz=' + (e.authz === null ? '(없음)' : e.authz),
      'www=' + (res.headers['www-authenticate'] || '(없음)'), 'http=' + e.http, 'reqline=' + e.reqline, 'requests=' + log.length].join('|'));
    raws.push('# 서버가 받은 헤더 ' + [tok, check].join('|') + ' = ' + JSON.stringify(e.rawHeaders));
  }
  // (4) 단계 문장이 기대는 사실
  // 4-1 열쇠 없이 내용을 읽을 수 있다
  out.push('# readable 열쇠 없이 base64url만 풀면 좋은 토큰의 내용: ' + fromB64u(gp[1]) + ' · 머리: ' + fromB64u(gp[0]));
  // 4-2 서버에 로그인한 사람의 목록이 없다: 로그인을 한 번도 받지 않은 새 서버(같은 열쇠)도 같은 토큰을 받아들이고, 다른 열쇠의 서버는 받아들이지 않는다
  const logF = [], fresh = await startServer(SERVER_KEY, true, logF), rf = await get(fresh.address().port, good); await stop(fresh);
  const logW = [], wrong = await startServer(OTHER_KEY, true, logW), rw = await get(wrong.address().port, good); await stop(wrong);
  out.push('# freshServer 로그인을 한 번도 받지 않은 새 서버(같은 열쇠) => status=' + rf.status + '|body=' + rf.body + '|requests=' + logF.length);
  out.push('# wrongKeyServer 다른 열쇠를 가진 서버 => status=' + rw.status + '|verify=' + logW[0].r.verify);
  // 4-3 응답 형태
  out.push('# response 200의 Content-Type: ' + (await (async () => { const l = [], s = await startServer(SERVER_KEY, true, l), r = await get(s.address().port, good); await stop(s); return r.headers['content-type']; })()));
  // 4-4 서명을 떼어 내는 두 모양: 점을 남기고 비운 것(h.p.)과 점까지 뗀 것(h.p). 그리고 alg를 none으로 바꾼 토큰(이 실습은 다루지 않는다)
  const variants = {
    'nosig-dot': tokens.nosig, 'nosig-nodot': gp[0] + '.' + gp[1],
    'algnone': b64u('{"alg":"none"}') + '.' + b64u(ADMIN) + '.',
  };
  for (const [name, tk] of Object.entries(variants)) for (const check of [true, false]) {
    const l = [], s = await startServer(SERVER_KEY, check, l), r = await get(s.address().port, tk); await stop(s);
    out.push('# variant ' + name + '|' + check + ' => verify=' + l[0].r.verify + '|user=' + l[0].r.user + '|status=' + r.status + ' · 토큰=' + tk);
  }
  out.push('# 서버 코드 사실: handle()은 req, key, check만 읽는다(저장소 없음). 로그인 때 서버가 만든 토큰은 응답으로만 나가고 서버 쪽에 남는 것이 없다.');

  // (5) 같은 토큰을 JWT 라이브러리 jose4j로 확인
  const jin = SERVER_KEY.toString('hex') + '\n' + ['good', 'edited', 'nosig', 'otherkey'].map(k => k + '\t' + tokens[k]).join('\n') + '\n';
  const jsrc = path.join(__dirname, '..', 'net', 'TokenBasicJose4jCheck.java'), outDir = 'C:/Users/wlsgu/AppData/Local/Temp/claude/C--/0d076020-6795-44d4-8279-d5047966b753/scratchpad/en_basics/w11/token_out';
  fs.mkdirSync(outDir, { recursive: true });
  let jose = '';
  if (fs.existsSync(JOSE) && fs.existsSync(SLF4J)) {
    const jr = cp.spawnSync(JDK + '/java', ['-Dfile.encoding=UTF-8', '-Dstdout.encoding=UTF-8', '-cp', JOSE + ';' + SLF4J, jsrc], { input: jin, encoding: 'utf8' });
    jose = (jr.stdout || '').trim(); if (jr.status !== 0) jose += '\n# jose4j 실행 오류: ' + (jr.stderr || '').slice(0, 400);
  } else jose = '# jose4j 없음';
  fs.writeFileSync(path.join(__dirname, 'token_basic_en_jose4j.out.txt'), jose + '\n');

  const lines = out.concat(raws);
  fs.writeFileSync(path.join(__dirname, 'token_basic_en_probe.out.txt'), lines.join('\n') + '\n');
  console.log(lines.join('\n')); console.log('--- jose4j\n' + jose);
})().catch(e => { console.error(e); process.exit(1); });

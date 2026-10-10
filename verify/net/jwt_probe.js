// "JWT의 구조와 검증" 실습의 대조용 실행. 외부로 나가는 요청은 없다(계산만 한다).
// Node.js의 crypto(HMAC-SHA256)로 토큰 네 가지를 실제로 만들고, 서버의 검증 절차(RFC 7515 5.2절, RFC 7519 7.2절)를
// 두 가지 방식(알고리즘을 서버가 정해 둠 / 토큰 머리말의 alg를 따름)과 두 시각으로 돌려 결과를 한 줄씩 적는다.
// 사용: node verify/net/jwt_probe.js verify/net/jwt_probe.out.txt
const crypto = require('crypto'), fs = require('fs');

const SERVER_KEY = Buffer.from('shop-example-hs256-secret-key-01', 'ascii');   // 시험용 값. 서버만 아는 키 (32바이트)
const OTHER_KEY = Buffer.from('someone-elses-guessed-key-000000', 'ascii');    // 시험용 값. 서버의 키가 아닌 다른 키
const EXP = 1767225600;                                                         // 2026-01-01T00:00:00Z
const NOW = { before: EXP - 600, after: EXP + 60 };

const b64u = s => Buffer.from(s, 'utf8').toString('base64url');
const hmac = (key, input) => crypto.createHmac('sha256', key).update(input, 'ascii').digest('base64url');

const HEADER = { hs256: '{"alg":"HS256","typ":"JWT"}', none: '{"alg":"none","typ":"JWT"}' };
const PAYLOAD = { user: '{"sub":"7","role":"USER","exp":' + EXP + '}', admin: '{"sub":"7","role":"ADMIN","exp":' + EXP + '}' };
const H = { hs256: b64u(HEADER.hs256), none: b64u(HEADER.none) }, P = { user: b64u(PAYLOAD.user), admin: b64u(PAYLOAD.admin) };
const SIG = {
  ok: hmac(SERVER_KEY, H.hs256 + '.' + P.user),            // 서버가 발급할 때 붙인 서명
  serverForAdmin: hmac(SERVER_KEY, H.hs256 + '.' + P.admin), // 내용이 바뀐 토큰을 서버가 다시 계산하면 나오는 값
  other: hmac(OTHER_KEY, H.hs256 + '.' + P.admin),         // 다른 키로 만든 서명
};
const TOKEN = {
  ok: H.hs256 + '.' + P.user + '.' + SIG.ok,               // 발급한 그대로
  payload: H.hs256 + '.' + P.admin + '.' + SIG.ok,         // 내용만 고치고 서명은 그대로
  otherkey: H.hs256 + '.' + P.admin + '.' + SIG.other,     // 내용을 고치고 다른 키로 서명을 새로 만듦
  none: H.none + '.' + P.admin + '.',                      // 머리말의 alg를 none으로, 서명 부분은 비움 (RFC 7519 6.1절의 모양)
};

// 서버의 검증. policy: fixed(서버가 HS256으로 정해 둠) | trust(토큰 머리말의 alg를 따름)
function verify(token, policy, now) {
  const part = token.split('.');
  if (part.length !== 3) return { sig: 'malformed', exp: 'skipped', result: 'reject', role: '-' };
  const header = JSON.parse(Buffer.from(part[0], 'base64url').toString('utf8'));    // 키 없이 풀린다
  const payload = JSON.parse(Buffer.from(part[1], 'base64url').toString('utf8'));
  const checkHmac = () => {
    const expected = crypto.createHmac('sha256', SERVER_KEY).update(part[0] + '.' + part[1], 'ascii').digest();
    const received = Buffer.from(part[2], 'base64url');
    return received.length === expected.length && crypto.timingSafeEqual(expected, received) ? 'match' : 'mismatch';
  };
  let sig;
  if (policy === 'fixed') {
    if (header.alg !== 'HS256') return { sig: 'alg-rejected', exp: 'skipped', result: 'reject', role: '-' };
    sig = checkHmac();
  } else {
    if (header.alg === 'HS256') sig = checkHmac();
    else if (header.alg === 'none') sig = 'not-checked';     // 서명이 없는 토큰으로 보고 확인을 건너뛴다
    else return { sig: 'alg-rejected', exp: 'skipped', result: 'reject', role: '-' };
  }
  if (sig === 'mismatch') return { sig, exp: 'skipped', result: 'reject', role: '-' };
  if (!(now < payload.exp)) return { sig, exp: 'expired', result: 'reject', role: '-' };   // RFC 7519 4.1.4절: 지금이 exp보다 앞이어야 한다
  return { sig, exp: 'valid', result: 'accept', role: payload.role };
}

const out = ['# node ' + process.version + ' | openssl ' + process.versions.openssl + ' | HMAC-SHA256, base64url'];
out.push('# exp ' + EXP + ' = ' + new Date(EXP * 1000).toISOString() + ' | before ' + NOW.before + ' = ' + new Date(NOW.before * 1000).toISOString() + ' | after ' + NOW.after + ' = ' + new Date(NOW.after * 1000).toISOString());
Object.keys(HEADER).forEach(k => out.push('# header.' + k + ' ' + HEADER[k] + ' -> ' + H[k]));
Object.keys(PAYLOAD).forEach(k => out.push('# payload.' + k + ' ' + PAYLOAD[k] + ' -> ' + P[k]));
Object.keys(SIG).forEach(k => out.push('# sig.' + k + ' ' + SIG[k]));
Object.keys(TOKEN).forEach(k => out.push('# token.' + k + ' ' + TOKEN[k]));
// 누구나 읽을 수 있다는 것: 키를 쓰지 않고 앞의 두 부분을 풀어 본다
Object.keys(TOKEN).forEach(k => { const p = TOKEN[k].split('.'); out.push('# decoded.' + k + ' ' + Buffer.from(p[0], 'base64url').toString('utf8') + ' ' + Buffer.from(p[1], 'base64url').toString('utf8')); });
// 지금이 exp와 정확히 같을 때 (경계)
out.push('# boundary now==exp: ' + verify(TOKEN.ok, 'fixed', EXP).result + ' | now==exp-1: ' + verify(TOKEN.ok, 'fixed', EXP - 1).result);
for (const tok of Object.keys(TOKEN)) for (const time of ['before', 'after']) for (const policy of ['fixed', 'trust']) {
  const r = verify(TOKEN[tok], policy, NOW[time]);
  out.push(tok + '|' + time + '|' + policy + ' => ' + r.sig + '|' + r.exp + '|' + r.result + '|' + r.role);
}
if (process.argv[2]) fs.writeFileSync(process.argv[2], out.join('\n') + '\n', 'utf8');
console.log(out.join('\n'));

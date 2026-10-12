// 기초개념 "HTTPS" 실습의 모형 결과를 실제 실행 결과(https_basic_probe.out.txt)와 대조한다.
// 대조: 결과 표 세 열(실제 값에서 얻는다), 화면의 코드(code 함수)가 Probe가 읽어 실행한 글과 같은지,
//       단계 문장이 기대는 사실(http면 중계기 기록에 POST /login과 password=1234가 있음, https면 없음, 끊긴 조합은 서버가 요청을 받지 못함,
//       끊은 이유의 종류와 먼저 나온 오류, 연결된 조합의 TLS 버전, 이름이 localhost일 때만 연결 시작 바이트에 localhost 글자가 있음)
// 실제 값에서 표를 얻는 방법:
//   클라이언트의 연결 = 응답을 받았으면 '연결됨', 오류 DEPTH_ZERO_SELF_SIGNED_CERT이면 믿을 수 없는 인증서로 끊음, ERR_TLS_CERT_ALTNAME_INVALID이면 인증서의 이름이 접속한 주소와 다름으로 끊음
//   중간에서 들여다본 내용 = 서버가 요청을 받지 못했으면 '요청을 보내지 않음', 받았고 기록에 password=1234가 있으면 '그대로 보임', 없으면 '알아볼 수 없는 바이트 (password=1234 없음)'
//   서버가 받은 내용 = 서버의 요청 처리 함수가 받은 본문 또는 '받지 못함'
const fs = require('fs'), path = require('path');
const { load, combos } = require('../model_rows.js');
const lesson = load('https_basic');
const lines = fs.readFileSync(path.join(__dirname, 'https_basic_probe.out.txt'), 'utf8').split(/\r?\n/);
console.log(lines[0]);
const real = {};
lines.filter(l => l.includes(' => ') && !l.startsWith('#')).forEach(l => { const i = l.indexOf(' => '); real[l.slice(0, i)] = JSON.parse(l.slice(i + 4)); });
const CONN = { DEPTH_ZERO_SELF_SIGNED_CERT: lesson.CONN.trust, ERR_TLS_CERT_ALTNAME_INVALID: lesson.CONN.name };
let ok = 0, n = 0;
const seenRows = {};
for (const c of combos(lesson)) {
  n++;
  const k = [c.scheme, c.trust, c.name].join('|'), r = real[k];
  if (!r) { console.log('실행 결과 없음: ' + k); continue; }
  const sim = lesson.simulate(Object.assign({}, c)), cl = r.client, m = r.middle, sv = r.server, probs = [], https = c.scheme === 'https';
  const conn = cl.ok ? '연결됨' : (CONN[cl.errCode] || '(모르는 오류 ' + cl.errCode + ')');
  const got = sv.requests.length ? sv.requests.map(q => q.body).join(' / ') : '받지 못함';
  const mid = !sv.requests.length ? '요청을 보내지 않음' : m.hasPassword ? 'password=1234가 그대로 보임' : '요청 내용은 알아볼 수 없는 바이트 (password=1234 없음)';
  const want = [conn, mid, got];
  if (JSON.stringify(sim.row) !== JSON.stringify(want)) probs.push('표 모형 ' + sim.row.join(' | ') + '\n   실제 ' + want.join(' | '));
  // 화면의 코드와 Probe가 읽어 실행한 글
  if (r.code !== lesson.code(c)) probs.push('화면의 코드와 Probe가 쓴 글이 다름');
  // 단계 문장이 기대는 사실
  if (https && r.certNameOnScreen !== 'localhost') probs.push('화면의 인증서 이름이 localhost가 아님');
  if (sv.requests.length > 1) probs.push('서버가 요청을 둘 이상 받음');
  if (sv.requests.length && (sv.requests[0].method !== 'POST' || sv.requests[0].url !== '/login')) probs.push('서버가 받은 요청이 POST /login이 아님: ' + JSON.stringify(sv.requests));
  if (!https) {
    if (!(m.hasPassword && m.hasPostLogin)) probs.push('http인데 중계기 기록에 POST /login과 password=1234가 모두 있지 않음');
    if (!cl.ok || cl.status !== 200) probs.push('http 요청이 200을 받지 못함');
  } else if (cl.ok) {
    if (m.hasPassword || m.hasPostLogin) probs.push('https 연결인데 중계기 기록에 password=1234 또는 POST /login이 있음');
    if (cl.protocol !== 'TLSv1.3') probs.push('TLS 버전이 TLSv1.3이 아님: ' + cl.protocol);
    if (!sv.secure.length || sv.tlsClientErrors.length) probs.push('서버 쪽 TLS 연결 기록이 이상함');
  } else {
    if (m.hasPassword || m.hasPostLogin) probs.push('끊긴 연결인데 중계기 기록에 password=1234 또는 POST /login이 있음');
    if (sv.requests.length) probs.push('끊긴 연결인데 서버가 요청을 받음');
    if (JSON.stringify(sv.tlsClientErrors) !== '["ECONNRESET"]' || sv.secure.length) probs.push('서버가 기록한 것이 ECONNRESET 하나가 아님(assume과 다름): ' + JSON.stringify(sv.tlsClientErrors));
    if (m.c2sBytes === 0) probs.push('끊긴 연결인데 클라이언트가 보낸 바이트가 하나도 없음(연결을 시작하는 바이트가 지나갔다는 문장과 다름)');
    // 먼저 나온 오류: 믿지 않으면 항상 믿을 수 없는 인증서
    if (!c.trust && cl.errCode !== 'DEPTH_ZERO_SELF_SIGNED_CERT') probs.push('믿지 않는데 끊은 이유가 믿을 수 없는 인증서가 아님: ' + cl.errCode);
    if (c.trust && c.name === 'other' && cl.errCode !== 'ERR_TLS_CERT_ALTNAME_INVALID') probs.push('믿는 인증서이고 다른 이름인데 끊은 이유가 이름 불일치가 아님: ' + cl.errCode);
  }
  // 이름이 localhost일 때만 연결 시작 바이트에 localhost 글자가 있다는 문장(https)
  if (https && m.hasLocalhostText !== (c.name === 'match')) probs.push('localhost 글자 여부가 문장과 다름: ' + m.hasLocalhostText);
  // http 네 조합은 믿음·이름과 상관없이 같아야 한다
  if (!https) { const sig = JSON.stringify([want, m.hasPassword, m.hasPostLogin]); seenRows.http = seenRows.http || sig; if (seenRows.http !== sig) probs.push('http 조합끼리 결과가 다름'); }
  if (!probs.length) ok++; else console.log('다름: ' + k + '\n   ' + probs.join('\n   '));
}
console.log(lines.filter(l => l.startsWith('# 시험용 인증서') || l.startsWith('# 사용한 TLS')).join('\n'));
console.log('일치 ' + ok + ' / ' + n);

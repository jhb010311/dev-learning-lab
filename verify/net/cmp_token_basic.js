// 기초개념 "토큰" 실습의 모형 결과를 실제 실행 결과(token_basic_probe.out.txt, token_basic_jose4j.out.txt)와 대조한다.
// 대조: (0) 토큰을 만드는 구현이 표준대로인지: RFC 7515 부록 A.1의 예시를 돌린 결과가 모두 문서의 값과 같은지, 그리고 JWT 라이브러리 jose4j가 같은 토큰을 검증한 결과.
//       (1) 결과 표 세 열을 실제 값에서 얻는다. 서명 확인은 서버의 판단(match 등), 믿은 사용자와 응답은 클라이언트가 받은 상태 코드와 본문에서.
//       (2) 화면의 코드(code 함수)가 서버가 실제로 받은 요청과 같은 글인지: 첫 줄(method url HTTP/버전), Authorization 헤더(서명 부분만 (서명)으로 줄임),
//           풀어 본 머리와 내용(서버가 받은 토큰을 base64url로 푼 글), 서명 줄의 뜻(붙어 온 서명이 어느 열쇠, 어느 내용으로 계산된 것인지), 서버 구역(서명 확인 여부).
//       (3) 화면의 토큰 글자와 서명 값(lesson.V)이 Probe가 만든 토큰과 같은지, 단계 문장이 기대는 사실.
const fs = require('fs'), path = require('path');
const { load, combos } = require('../model_rows.js');
const lesson = load('token_basic');
const read = f => fs.readFileSync(path.join(__dirname, f), 'utf8').split(/\r?\n/).filter(Boolean);
const lines = read('token_basic_probe.out.txt');
console.log(lines[0]);
const dec = s => Buffer.from(s, 'base64url').toString('utf8');
let problems = 0;
const bad = m => { problems++; console.log('다름: ' + m); };

// (0) RFC 7515 부록 A.1
const a1 = lines.find(l => l.startsWith('# rfc7515-A.1 (')), a1f = {};
a1.split(' => ')[1].split('|').forEach(p => { const [k, v] = p.split('='); a1f[k] = v; });
const a1ok = ['headerOctets', 'headerB64', 'payloadB64', 'sig', 'sigOctets', 'full'].every(k => a1f[k] === 'true') && a1f.keyBytes === '64';
console.log('RFC 7515 부록 A.1 (머리 옥텟, 머리와 내용의 base64url, 서명, 서명 옥텟, 전체 압축 형식) ' + (a1ok ? '모두 문서의 값과 같음' : '다름 ' + JSON.stringify(a1f)));
if (!a1ok) problems++;
// jose4j
const jl = read('token_basic_jose4j.out.txt'), jreal = {};
console.log(jl[0]);
jl.filter(l => l.includes(' => ')).forEach(l => { const [k, v] = l.split(' => '), f = {}; v.split('|').forEach(p => { const i = p.indexOf('='); f[p.slice(0, i)] = p.slice(i + 1); }); jreal[k] = f; });

// 토큰과 부가 사실
const tokens = {}; lines.filter(l => /^# token\.\w+ \S/.test(l)).forEach(l => { const m = /^# token\.(\w+) (\S+)$/.exec(l); if (m) tokens[m[1]] = m[2]; });
tokens.nosig = tokens.nosig || null;
const rec = /recomputed 서버 열쇠로 kim 내용을 계산 (\S+) · 고친\(admin\) 내용을 계산 (\S+) · 고친 토큰에 붙어 온 서명 (\S+) · .* 다름 : (\w+) · 다른 열쇠로 만든 서명 (\S+) \(서버가 계산한 admin 값과 다름 : (\w+)\)/.exec(lines.find(l => l.startsWith('# recomputed')));
if (!rec) { bad('# recomputed 줄을 읽지 못함'); process.exit(1); }
const serverSig = { kim: rec[1], admin: rec[2] };
if (rec[4] !== 'true' || rec[6] !== 'true') bad('고친 내용으로 계산한 값이 붙어 온 서명과 같거나, 다른 열쇠의 서명이 서버가 계산한 값과 같음');
if (rec[3] !== tokens.good.split('.')[2] || rec[5] !== tokens.otherkey.split('.')[2]) bad('# recomputed의 서명이 토큰의 서명과 다름');
const parts = n => { const p = tokens[n].split('.'); return { h: p[0], p: p[1], s: p[2] }; };
// 화면의 토큰 값 = Probe가 만든 토큰
const V = lesson.V, G = parts('good'), E = parts('edited'), N = parts('nosig'), O = parts('otherkey');
const vchk = { hdr: [V.hdr, G.h], pKim: [V.pKim, G.p], pAdmin: [V.pAdmin, E.p], sGood: [V.sGood, G.s], sOther: [V.sOther, O.s], sAdminByServer: [V.sAdminByServer, serverSig.admin], hdrJson: [V.hdrJson, dec(G.h)], jKim: [V.jKim, dec(G.p)], jAdmin: [V.jAdmin, dec(E.p)] };
Object.keys(vchk).forEach(k => { if (vchk[k][0] !== vchk[k][1]) bad('lesson.V.' + k + ' 화면 ' + vchk[k][0] + ' / 실제 ' + vchk[k][1]); });
if (E.s !== G.s || E.h !== G.h || N.h !== G.h || N.p !== G.p || N.s !== '' || O.h !== G.h) bad('조합별 토큰의 구성이 설계와 다름');
if (!/로그인 응답 토큰 = makeToken\(서버 열쇠, 머리, kim\) : true/.test(lines.find(l => l.startsWith('# login')))) bad('서버가 로그인에 준 토큰이 모형의 토큰과 다름');

// 조합별 실제 값
const real = {};
lines.filter(l => l.includes(' => ') && !l.startsWith('#')).forEach(l => { const [k, v] = l.split(' => '), f = {}; v.split('|').forEach(p => { const i = p.indexOf('='); f[p.slice(0, i)] = p.slice(i + 1); }); real[k] = f; });
const VERIFY = { match: '맞음', mismatch: '맞지 않음', missing: '서명이 없음', skipped: '하지 않음', 'no-token': '토큰이 없음' };
let ok = 0, n = 0;
for (const c of combos(lesson)) {
  n++;
  const k = [c.token, c.check].join('|'), f = real[k], probs = [];
  if (!f) { console.log('실행 결과 없음: ' + k); continue; }
  const status = +f.status, m = /^안녕하세요, (.+)$/.exec(f.body);
  // (1) 표 세 열
  const realRow = [VERIFY[f.verify], status === 200 ? m[1] : '없음', status === 200 ? '200 ' + f.body : String(status)];
  const row = lesson.simulate(Object.assign({}, c)).row;
  if (JSON.stringify(row) !== JSON.stringify(realRow)) probs.push('표 모형 ' + row.join(' | ') + '\n   실제 ' + realRow.join(' | '));
  if (status === 200 && f.user !== m[1]) probs.push('서버가 믿은 사용자(user=' + f.user + ')와 응답 본문(' + f.body + ')이 다름');
  if (status === 401 && f.www !== 'Bearer') probs.push('401 응답에 WWW-Authenticate: Bearer가 없음');
  if (f.requests !== '1' || f.http !== '1.1' || f.reqline !== 'GET /me') probs.push('요청 수 또는 첫 줄이 예상과 다름 ' + f.requests + ' ' + f.http + ' ' + f.reqline);
  // (2) 화면의 코드 = 서버가 받은 요청
  const code = lesson.code(c).split('\n'), want = [f.reqline + ' HTTP/' + f.http];
  const has = f.authz !== '(없음)';
  if (has !== (c.token !== 'none')) probs.push('Authorization 헤더 유무가 설정과 다름');
  if (has) {
    const m2 = /^Bearer (\S+)$/.exec(f.authz), p = m2[1].split('.');
    want.push('Authorization: Bearer ' + p[0] + '.' + p[1] + '.' + (p[2] ? '(서명)' : ''));
    want.push('', '# 토큰을 점(.)으로 나눠 풀어 보면', '머리: ' + dec(p[0]), '내용: ' + dec(p[1]));
    // 서명 줄의 뜻: 붙어 온 서명이 어느 열쇠로 어느 내용에서 계산된 것인지
    const content = JSON.parse(dec(p[1])).user, sig = p[2];
    const kind = sig === '' ? 'none' : sig === serverSig.kim && content === 'kim' ? 'server-own' : sig === serverSig.kim && content === 'admin' ? 'server-before-edit' : sig === rec[5] && content === 'admin' ? 'other-key' : '알 수 없음';
    const line = { 'server-own': '서명: (서버의 비밀 열쇠로 머리와 내용을 계산한 값)', 'server-before-edit': '서명: (고치기 전 내용으로 계산한 값 그대로)', 'other-key': '서명: (다른 열쇠로 머리와 내용을 계산한 값)', none: '서명: (비어 있음)' }[kind];
    if (!line) probs.push('붙어 온 서명의 종류를 알 수 없음'); else want.push(line);
  }
  want.push('', '# 서버', '서명 확인: ' + (c.check ? '한다' : '하지 않는다'));
  if (JSON.stringify(code) !== JSON.stringify(want)) probs.push('화면의 코드와 서버가 받은 요청이 다름\n--- 실제\n' + want.join('\n') + '\n--- 화면\n' + code.join('\n'));
  if (has && (f.verify === 'skipped') === c.check) probs.push('서명 확인 여부가 설정과 다름 ' + f.verify);
  // 화면의 코드 줄 너비 (한글 2칸) 75 이하
  code.forEach(l => { const w = [...l].reduce((a, ch) => a + (ch.charCodeAt(0) > 0x7f ? 2 : 1), 0); if (w > 75) probs.push('코드 줄이 75칸을 넘음: ' + l); });
  // (3) 서버가 받은 헤더 원문에도 Authorization 줄이 이 모양으로 한 번만
  const raw = lines.find(l => l.startsWith('# 서버가 받은 헤더 ' + k + ' = ')), rh = JSON.parse(raw.split(' = ').slice(1).join(' = '));
  const idx = rh.map(x => x.toLowerCase()).filter(x => x === 'authorization').length;
  if (idx !== (has ? 1 : 0)) probs.push('서버가 받은 원문 헤더의 Authorization 줄 수가 예상과 다름 ' + idx);
  // 모형이 그림에 쓰는 서명 값: 서버가 다시 계산한 값
  const T = lesson.tok(c.token);
  if (T && c.check && T.sig && T.expect !== (T.who === 'kim' ? serverSig.kim : serverSig.admin)) probs.push('모형이 쓰는 "서버가 다시 계산한 값"이 실제와 다름');
  // jose4j와 서버(서명 확인 켬)의 판단이 같은가
  if (c.check && c.token !== 'none') {
    const j = jreal[c.token], serverAccepts = f.verify === 'match';
    if (!j || (j.verify === 'true') !== serverAccepts) probs.push('jose4j의 검증(' + (j && j.verify) + ')이 서버의 판단(' + f.verify + ')과 다름');
  }
  if (!probs.length) ok++; else console.log('다름: ' + k + '\n   ' + probs.join('\n   '));
}
console.log('일치 ' + ok + ' / ' + n);

// 단계 문장이 기대는 사실
const facts = [];
const f1 = lines.find(l => l.startsWith('# readable'));
facts.push(['열쇠 없이 base64url만 풀어도 내용과 머리가 읽힘', f1.includes('내용: {"user":"kim"} · 머리: {"alg":"HS256"}')]);
const fr = lines.find(l => l.startsWith('# freshServer'));
facts.push(['로그인을 한 번도 받지 않은 새 서버(같은 열쇠)도 서버가 준 토큰에 200 안녕하세요, kim', fr.includes('status=200|body=안녕하세요, kim|requests=1')]);
const fw = lines.find(l => l.startsWith('# wrongKeyServer'));
facts.push(['다른 열쇠를 가진 서버는 같은 토큰을 거절(401, mismatch)', fw.includes('status=401|verify=mismatch')]);
facts.push(['고친 내용(admin)으로 다시 계산한 서명이 붙어 온 서명과 다름', rec[4] === 'true']);
facts.push(['다른 열쇠로 만든 서명이 서버가 계산한 admin 값과 다름', rec[6] === 'true']);
facts.push(['서명 길이 43자(서명 있는 토큰) / 0자(뗀 토큰)', ['good', 'edited', 'otherkey'].every(t => lines.find(l => l.startsWith('# decoded.' + t)).endsWith('서명길이=43')) && lines.find(l => l.startsWith('# decoded.nosig')).endsWith('서명길이=0')]);
const vr = n => lines.find(l => l.startsWith('# variant ' + n));
facts.push(['점까지 뗀 토큰(머리.내용)은 서명 확인 여부와 상관없이 형식 오류 401(이 서버의 동작, 화면에는 쓰지 않음)', vr('nosig-nodot|true').includes('verify=malformed') && vr('nosig-nodot|false').includes('verify=malformed')]);
facts.push(['점을 남기고 서명만 비운 토큰은 확인 켬 401(missing), 끔 200(skipped)', vr('nosig-dot|true').includes('verify=missing|user=-|status=401') && vr('nosig-dot|false').includes('verify=skipped|user=kim|status=200')]);
facts.push(['(참고, 다루지 않음) alg none으로 바꾼 토큰: 이 서버는 머리의 alg를 읽지 않고 확인 켬이면 서명이 비어 401, 끔이면 200', vr('algnone|true').includes('status=401') && vr('algnone|false').includes('user=admin|status=200')]);
const jgood = jreal.good, jall = ['edited', 'nosig', 'otherkey'].every(t => jreal[t] && jreal[t].verify === 'false');
facts.push(['jose4j: 서버가 준 토큰은 맞고 고친 것, 서명을 뗀 것, 다른 열쇠로 서명한 것은 맞지 않음', jgood && jgood.verify === 'true' && jgood.payload === '{"user":"kim"}' && jall]);
facts.push(['서버 코드에 저장소가 없다는 기록(handle은 req, key, check만 읽음)', lines.some(l => l.startsWith('# 서버 코드 사실'))]);
facts.forEach(([t, v]) => { console.log('사실 ' + (v ? '확인' : '다름') + ': ' + t); if (!v) problems++; });
console.log(problems ? '문제 ' + problems + '개' : '문제 없음');

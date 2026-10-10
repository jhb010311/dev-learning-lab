Lab.register({
  id: 'jwt', nav: 'JWT의 구조와 검증', cat: '인증', mode: 'step',
  title: '누구나 읽을 수 있는 토큰을 서버는 어떻게 믿나',
  intro: 'JWT는 점(.)으로 이어진 세 부분, 곧 머리말과 내용과 서명으로 된 글자입니다. 앞의 두 부분은 암호화한 것이 아니라 표기만 바꿔 적은 것이라 누구나 읽고 고칠 수 있습니다. 서버가 그래도 이 토큰을 믿을 수 있는 까닭은 셋째 부분인 서명을 직접 다시 계산해 보기 때문입니다. 토큰 한 개를 뜯어보고, 내용을 고치거나 머리말을 바꾼 토큰이 어디에서 걸리는지 확인합니다.',
  terms: ['JWT(JSON Web Token)', 'Base64URL 인코딩', '클레임(Claim)', 'HMAC과 전자서명', '알고리즘 고정(alg 검증)'],
  controls: [
    { id: 'tok', label: '서버에 도착한 토큰', type: 'select', value: 'payload', options: [['ok', '서버가 발급한 그대로'], ['payload', '내용의 role을 ADMIN으로 고침 (서명은 그대로)'], ['otherkey', '내용을 고치고 다른 키로 서명을 새로 만듦'], ['none', '머리말의 alg를 none으로 바꾸고 서명을 비움']] },
    { id: 'time', label: '서버가 검증하는 시각', type: 'select', value: 'before', options: [['before', '만료(exp) 10분 전'], ['after', '만료(exp) 1분 뒤']] },
    { id: 'policy', label: '서버가 검증 알고리즘을 정하는 방법', type: 'select', value: 'fixed', options: [['fixed', '서버가 HS256으로 정해 둔다'], ['trust', '토큰 머리말의 alg에 적힌 대로 따른다']], hint: '두 방식의 차이는 alg를 none으로 바꾼 토큰에서 드러납니다.' },
  ],
  presets: [
    { t: '처음 설정으로', d: '내용의 role을 ADMIN으로 고친 토큰입니다. 읽고 고칠 수는 있어도 서명에서 걸립니다.', v: { tok: 'payload', time: 'before', policy: 'fixed' } },
    { t: '발급한 그대로', d: '서명이 일치하고 만료 전이라 통과합니다.', v: { tok: 'ok', time: 'before', policy: 'fixed' } },
    { t: '다른 키로 서명을 새로 만들면', d: '서버의 키로 계산한 값과 달라 거절됩니다.', v: { tok: 'otherkey', time: 'before', policy: 'fixed' } },
    { t: '만료 시각이 지나면', d: '서명이 맞아도 거절됩니다.', v: { tok: 'ok', time: 'after', policy: 'fixed' } },
    { t: 'alg를 none으로 바꾼 토큰', d: '알고리즘을 정해 둔 서버는 서명을 보기도 전에 거절합니다.', v: { tok: 'none', time: 'before', policy: 'fixed' } },
    { t: '토큰이 말하는 alg를 믿는 서버', d: '서명이 없는 토큰이 ADMIN으로 통과합니다.', v: { tok: 'none', time: 'before', policy: 'trust' } },
  ],
  // 실제로 계산한 값 (verify/net/jwt_probe.js와 verify/plain/JwtProbe.java가 같은 값을 낸다)
  V: {
    hHs: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9', hNone: 'eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0',
    pUser: 'eyJzdWIiOiI3Iiwicm9sZSI6IlVTRVIiLCJleHAiOjE3NjcyMjU2MDB9', pAdmin: 'eyJzdWIiOiI3Iiwicm9sZSI6IkFETUlOIiwiZXhwIjoxNzY3MjI1NjAwfQ',
    sOk: '5hho4Bt2LLsypoE43dqORdbPqUDkMlzinRCY-zDKmMc', sAdmin: '_Crl3waja45Oj0WU2YHqH-bAhgouCo5PsGQEAgYkIuQ', sOther: 'qmZRR9KJgyn1QAoptqhfdyZ5pV0I2gPLAaszvAlaFJ8',
    jHs: '{"alg":"HS256","typ":"JWT"}', jNone: '{"alg":"none","typ":"JWT"}', jUser: '{"sub":"7","role":"USER","exp":1767225600}', jAdmin: '{"sub":"7","role":"ADMIN","exp":1767225600}',
    exp: 1767225600, now: { before: 1767225000, after: 1767225660 },
  },
  // 설정에 해당하는 토큰의 세 부분과, 풀어 본 내용
  token: function (c) {
    var V = this.V, none = c.tok === 'none', admin = c.tok !== 'ok';
    var p = [none ? V.hNone : V.hHs, admin ? V.pAdmin : V.pUser, c.tok === 'ok' || c.tok === 'payload' ? V.sOk : c.tok === 'otherkey' ? V.sOther : ''];
    return { part: p, text: p.join('.'), header: none ? V.jNone : V.jHs, payload: admin ? V.jAdmin : V.jUser, alg: none ? 'none' : 'HS256', role: admin ? 'ADMIN' : 'USER', expect: admin ? V.sAdmin : V.sOk };
  },
  code: function (c) {
    var T = this.token(c), V = this.V;
    var head = '// 요청 헤더  Authorization: Bearer <토큰>\n// 토큰  ' + T.part[0] + '\n//       .' + T.part[1] + '\n//       .' + (T.part[2] || '(비어 있음)') + '\n// 지금  now = ' + V.now[c.time] + '   (exp = ' + V.exp + ')\n\n';
    var open = 'Claims verify(String token, long now) throws Exception {\n    String[] part = token.split("\\\\.", -1);                 // 머리말 . 내용 . 서명\n    if (part.length != 3) throw new BadTokenException("형식 오류");\n    Base64.Decoder dec = Base64.getUrlDecoder();\n    String header  = new String(dec.decode(part[0]), UTF_8);   // 키 없이 풀린다\n    String payload = new String(dec.decode(part[1]), UTF_8);   // 키 없이 풀린다\n\n';
    var sig = function (pad) { return pad + '// 2. 서명: 앞의 두 부분으로 서버가 직접 다시 계산해 비교한다\n' + pad + 'Mac mac = Mac.getInstance("HmacSHA256");\n' + pad + 'mac.init(new SecretKeySpec(serverKey, "HmacSHA256"));  // 서버만 아는 키\n' + pad + 'byte[] expected = mac.doFinal((part[0] + "." + part[1]).getBytes(US_ASCII));\n' + pad + 'if (!MessageDigest.isEqual(expected, dec.decode(part[2])))\n' + pad + '    throw new BadTokenException("서명 불일치");\n'; };
    var alg = c.policy === 'fixed'
      ? '    // 1. 알고리즘: 서버가 정해 둔 HS256만 받는다\n    if (!"HS256".equals(field(header, "alg")))\n        throw new BadTokenException("허용하지 않는 알고리즘");\n\n' + sig('    ')
      : '    // 1. 알고리즘: 토큰의 머리말에 적힌 대로 따른다 (위험한 방식)\n    String alg = field(header, "alg");\n    if (alg.equals("HS256")) {\n' + sig('        ') + '    } else if (alg.equals("none")) {\n        // "서명이 없는 토큰"으로 보고 서명 확인을 건너뛴다\n    } else {\n        throw new BadTokenException("허용하지 않는 알고리즘");\n    }\n';
    var tail = '\n    // 3. 만료: 지금이 exp보다 앞이어야 한다\n    if (now >= Long.parseLong(field(payload, "exp")))\n        throw new BadTokenException("만료됨");\n    return new Claims(field(payload, "sub"), field(payload, "role"));   // 여기까지 와야 내용을 믿는다\n}\n\n// field(json, 이름)은 JSON에서 값 하나를 꺼내는 도우미다.\n// 원리를 보이려고 직접 적은 코드다. 실제 서비스에서는 검증된 JWT 라이브러리를 쓴다.';
    return head + open + alg + tail;
  },
  label: function (c) { return { ok: '발급한 그대로', payload: '내용을 고침', otherkey: '다른 키로 서명', none: 'alg none' }[c.tok] + ' · ' + (c.time === 'before' ? '만료 전' : '만료 뒤') + ' · ' + (c.policy === 'fixed' ? '서버가 alg 지정' : '토큰의 alg를 따름'); },
  columns: ['서명 확인', '만료 확인', '서버의 판단', '서버가 믿은 권한'],
  // 검증 절차의 결과만 계산한다 (실제 실행과 대조하는 부분)
  judge: function (c) {
    var T = this.token(c), V = this.V, sig, exp = 'skip';
    if (T.alg !== 'HS256') sig = c.policy === 'fixed' ? 'alg' : 'none';
    else sig = T.part[2] === T.expect ? 'match' : 'mismatch';
    if (sig === 'match' || sig === 'none') exp = V.now[c.time] < V.exp ? 'valid' : 'expired';
    return { sig: sig, exp: exp, ok: exp === 'valid' };
  },
  simulate: function (c) {
    var T = this.token(c), V = this.V, J = this.judge(c), ev = [], sum = [], short = function (s) { return s.slice(0, 8) + '…'; };
    var st = { split: false, header: '', payload: '', alg: '', sig: '', calc: '', exp: '', res: '' };
    function push(s, k) { ev.push({ s: s, k: k || '', snap: JSON.parse(JSON.stringify(st)) }); }
    var nowText = c.time === 'before' ? '2025-12-31 23:50:00 UTC' : '2026-01-01 00:01:00 UTC';
    push({ ok: '로그인할 때 서버가 내려 준 토큰이 요청의 Authorization 헤더에 그대로 실려 왔습니다. 발급할 때 서버는 회원 번호 7, 권한 USER, 만료 시각을 적고 자기 키로 서명을 붙였습니다.',
      payload: '누군가 토큰의 가운데 부분을 고쳐서 보냈습니다. role을 USER에서 ADMIN으로 바꿔 다시 적었고, 끝의 서명은 원래 것을 그대로 두었습니다.',
      otherkey: '누군가 토큰의 role을 ADMIN으로 고치고, 서버의 키를 모르므로 자기가 가진 다른 키로 서명을 새로 계산해 붙였습니다.',
      none: '누군가 머리말의 alg를 none(서명 없음)으로 바꾸고 role을 ADMIN으로 고친 뒤, 서명 부분을 비워서 보냈습니다. 그래서 토큰이 점으로 끝납니다.' }[c.tok], c.tok === 'ok' ? '' : 'bad');
    st.split = true;
    push('token.split("\\\\."): 서버가 토큰을 점(.)에서 잘라 세 부분으로 나눕니다. 첫째가 머리말(header), 둘째가 내용(payload), 셋째가 서명(signature)입니다.' + (T.part[2] ? '' : ' 이 토큰은 셋째 부분이 비어 있습니다.'));
    st.header = T.header;
    push('dec.decode(part[0]): 첫째 부분을 base64url 디코더로 풉니다. 키는 필요 없습니다. 결과는 ' + T.header + ' 입니다. alg는 "이 토큰은 이 알고리즘으로 서명했다"는 토큰 쪽의 주장입니다.', T.alg === 'none' ? 'bad' : '');
    st.payload = T.payload;
    push('dec.decode(part[1]): 둘째 부분도 같은 방법으로 풉니다. 결과는 ' + T.payload + ' 입니다. 암호화한 것이 아니라 표기만 바꿔 적은 것이라, 토큰을 손에 넣은 사람은 누구나 읽습니다. 아직 서명을 확인하지 않았으므로 서버는 이 내용을 믿지 않습니다.', T.role === 'ADMIN' ? 'bad' : '');
    if (c.policy === 'fixed') {
      st.alg = T.alg === 'HS256' ? 'ok' : 'reject';
      push('알고리즘 확인: 이 서버는 HS256만 받기로 정해 두었습니다. 머리말의 alg가 ' + T.alg + (T.alg === 'HS256' ? '이므로 다음 확인으로 넘어갑니다.' : '이므로 여기에서 거절합니다. 서명과 만료 시각은 볼 필요도 없습니다.'), T.alg === 'HS256' ? '' : 'good');
    } else {
      st.alg = T.alg === 'HS256' ? 'ok' : 'follow';
      push('알고리즘 확인: 이 서버는 머리말의 alg에 적힌 방법으로 검증합니다. ' + (T.alg === 'HS256' ? 'HS256이라고 적혀 있으므로 HMAC-SHA256으로 서명을 확인하러 갑니다.' : 'none이라고 적혀 있으므로 "서명이 없는 토큰"으로 보고 서명 확인을 건너뜁니다. 어떻게 검증할지를, 검증을 받는 토큰이 고른 셈입니다.'), T.alg === 'HS256' ? '' : 'bad');
    }
    if (J.sig === 'match' || J.sig === 'mismatch') {
      st.calc = T.expect;
      push('mac.doFinal(part[0] + "." + part[1]): 받은 토큰의 앞 두 부분과 서버만 아는 키로 서명을 다시 계산합니다. 결과는 ' + short(T.expect) + ' 입니다. 토큰에 붙어 온 서명을 그대로 믿지 않고, 서버가 직접 만들어 보는 것입니다.');
      st.sig = J.sig;
      if (J.sig === 'match') push('MessageDigest.isEqual: 다시 계산한 값과 토큰의 셋째 부분(' + short(T.part[2]) + ')을 비교합니다. 같습니다. 서버가 발급한 뒤로 머리말과 내용이 한 글자도 바뀌지 않았다는 뜻입니다.', 'good');
      else if (c.tok === 'payload') push('MessageDigest.isEqual: 다시 계산한 값(' + short(T.expect) + ')과 토큰의 셋째 부분(' + short(T.part[2]) + ')을 비교합니다. 다릅니다. 붙어 온 서명은 고치기 전의 내용으로 만든 것이라, 고친 내용으로 계산한 값과 맞지 않습니다. "서명 불일치"로 거절합니다.', 'good');
      else push('MessageDigest.isEqual: 다시 계산한 값(' + short(T.expect) + ')과 토큰의 셋째 부분(' + short(T.part[2]) + ')을 비교합니다. 다릅니다. 붙어 온 서명은 다른 키로 만든 것이라 서버의 키로 계산한 값과 맞지 않습니다. 서버의 키를 모르면 맞는 서명을 만들 수 없습니다. "서명 불일치"로 거절합니다.', 'good');
    } else st.sig = J.sig;
    if (J.exp !== 'skip') {
      st.exp = J.exp;
      push('만료 확인: 내용의 exp는 ' + V.exp + '(2026-01-01 00:00:00 UTC)이고, 지금은 ' + V.now[c.time] + '(' + nowText + ')입니다. ' + (J.exp === 'valid' ? '지금이 exp보다 앞이므로 아직 유효합니다.' : '지금이 exp보다 뒤이므로 "만료됨"으로 거절합니다.' + (J.sig === 'match' ? ' 서명이 맞아도 만료된 토큰은 받지 않습니다.' : '')), J.exp === 'valid' ? '' : J.sig === 'none' ? '' : 'bad');
    }
    st.res = J.ok ? 'accept' : 'reject';
    if (J.ok && J.sig === 'match') push('검증 통과: 세 가지 확인을 모두 지났으므로 이제 내용을 믿습니다. 서버는 저장소를 찾아보지 않고 이 요청을 회원 7, 권한 USER의 요청으로 처리합니다.', 'good');
    else if (J.ok) push('검증 통과: 서버가 서명이 없는 토큰의 내용을 믿고 이 요청을 회원 7, 권한 ADMIN의 요청으로 처리합니다. 서버의 키를 몰라도 만들 수 있는 토큰이 통과했습니다.', 'bad');
    else push('거절: 서버는 토큰의 내용을 쓰지 않고 요청을 거절합니다. 보통 401 Unauthorized로 답합니다.', c.tok === 'ok' ? '' : 'good');
    var row = [{ match: '일치', mismatch: '불일치', none: '건너뜀 (alg가 none)', alg: '하지 않음 (alg에서 거절)' }[J.sig], { valid: '만료 전', expired: '만료됨', skip: '하지 않음 (앞에서 거절)' }[J.exp], J.ok ? '통과' : '거절', J.ok ? T.role : '없음'];
    sum.push('서명 확인은 "' + row[0] + '", 만료 확인은 "' + row[1] + '"이고, 서버의 판단은 ' + row[2] + '입니다.' + (J.ok ? ' 서버는 이 요청을 ' + T.role + ' 권한의 요청으로 처리합니다.' : ''));
    sum.push('머리말과 내용은 base64url로 적은 것이라 키 없이도 읽고 고칠 수 있습니다. 그래서 토큰에는 비밀번호 같은 것을 넣지 않습니다.');
    if (J.sig === 'match' && J.ok) sum.push('서버는 붙어 온 서명을 믿는 것이 아니라, 앞의 두 부분과 자기 키로 서명을 다시 계산해 비교합니다. 값이 같다는 것은 발급한 뒤로 내용이 바뀌지 않았다는 뜻입니다. 내용을 고친 토큰으로 바꿔 비교해 보세요.');
    if (J.sig === 'match' && !J.ok) sum.push('서명이 맞는 토큰이라도 exp가 지나면 거절합니다. 토큰은 발급한 뒤에는 서버가 회수하기 어렵기 때문에, 만료 시각을 짧게 두어 유출됐을 때의 피해 시간을 줄입니다.');
    if (J.sig === 'mismatch') sum.push(c.tok === 'payload' ? '내용을 한 글자라도 고치면 서버가 다시 계산한 서명이 달라집니다. 서명은 "이 내용 그대로"에 대해서만 맞습니다.' : '서명을 새로 만들어 붙여도, 서버의 키로 만든 것이 아니면 서버가 계산한 값과 다릅니다. 이 방식(HS256)의 안전은 서버의 키가 새지 않는 데 달려 있습니다.');
    if (J.sig === 'mismatch' && c.time === 'after') sum.push('서명에서 거절됐으므로 만료 시각은 확인하지도 않았습니다. 시각을 바꿔도 결과가 같습니다.');
    if (J.sig === 'alg') sum.push('검증에 쓸 알고리즘은 서버가 정합니다. 머리말의 alg는 누구나 고칠 수 있는 글자이므로, 서버가 정해 둔 것과 다르면 서명을 보기도 전에 거절합니다.');
    if (J.sig === 'none') sum.push('머리말의 alg를 그대로 따르는 서버는, 보내는 쪽이 "서명 없음"을 고르면 서명 확인을 건너뜁니다.' + (J.ok ? ' 그 결과 서명이 없는 토큰이 ADMIN 권한으로 통과했습니다.' : ' 이번에는 만료 시각 때문에 거절됐을 뿐이고, 만료 전이라면 통과합니다.') + ' 서버가 알고리즘을 정해 두는 방식으로 바꿔 비교해 보세요.');
    if (c.tok !== 'none' && c.policy === 'trust') sum.push('이 토큰은 alg가 HS256이라서, 알고리즘을 정하는 두 방식의 결과가 같습니다. 차이는 alg를 none으로 바꾼 토큰에서 드러납니다.');
    return { events: ev, summary: sum, tk: T, row: row };
  },
  render: function (v, sim, t, H, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : null, T = sim.tk;
    if (!s) { H.text(v, '실행을 누르면 토큰을 한 부분씩 풀어 보고 검증합니다.'); return; }
    H.table(v, ['부분', '토큰에 적힌 글자', '풀어 본 내용'], [
      { cells: ['머리말', s.split ? T.part[0] : '', { v: s.header || (s.split ? '아직 풀지 않음' : ''), cls: s.header && T.alg === 'none' ? 'bad' : '' }] },
      { cells: ['내용', s.split ? T.part[1] : '', { v: s.payload || (s.split ? '아직 풀지 않음' : ''), cls: s.payload && T.role === 'ADMIN' ? 'bad' : '' }] },
      { cells: ['서명', s.split ? (T.part[2] || '(비어 있음)') : '', s.calc ? '서버가 다시 계산한 값: ' + s.calc : '글자로 풀어 볼 내용이 아님 (계산한 값)'] },
    ], s.split ? '세 부분으로 나눈 토큰' : '받은 토큰 (아직 나누기 전)');
    var ln = H.lanes(v);
    H.lane(ln, '1. 알고리즘', { '': '아직 확인 전', ok: 'HS256으로 검증', reject: 'none은 받지 않음: 거절', follow: '토큰이 말한 none을 따름' }[s.alg], s.alg === 'ok' ? 'good' : s.alg === 'reject' ? 'bad' : s.alg === 'follow' ? 'hot' : 'none');
    H.lane(ln, '2. 서명', { '': s.calc ? '다시 계산함, 비교 전' : '아직 확인 전', match: '다시 계산한 값과 일치', mismatch: '다시 계산한 값과 다름: 거절', none: '확인하지 않고 건너뜀', alg: '확인하지 않음' }[s.sig], s.sig === 'match' ? 'good' : s.sig === 'mismatch' ? 'bad' : s.sig === 'none' ? 'hot' : 'none');
    H.lane(ln, '3. 만료 시각', { '': s.res ? '확인하지 않음' : '아직 확인 전', valid: '만료 전: 유효', expired: '만료 시각이 지남: 거절' }[s.exp], s.exp === 'valid' ? 'good' : s.exp === 'expired' ? 'bad' : 'none');
    H.counters(v, [[s.res === 'accept' ? '통과' : s.res === 'reject' ? '거절' : '검증 중', '서버의 판단'], [s.res === 'accept' ? T.role : s.res === 'reject' ? '없음' : '아직 없음', '서버가 믿은 권한']]);
  },
  // 그림: 위쪽 세 줄은 토큰의 세 부분(적힌 글자와 풀어 본 내용), 아래쪽은 서버가 차례로 하는 세 가지 확인과 최종 판단이다.
  draw: function (P, sim, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : { split: false, header: '', payload: '', alg: '', sig: '', calc: '', exp: '', res: '' }, T = sim.tk, n = shown.length, tot = sim.events.length;
    P.size(680, 346);
    var cur = function (on) { return on ? ' now' : ''; };
    P.box('p0', 16, 12, 648, 62, { cls: (s.header ? (T.alg === 'none' ? 'bad' : 'wait') : s.split ? 'plain' : 'ghost') + cur(n === 3), title: '첫째 부분: 머리말', sub: [T.part[0], s.header ? '풀어 본 내용  ' + s.header : '아직 풀지 않음'], mono: true });
    P.box('p1', 16, 80, 648, 62, { cls: (s.payload ? (T.role === 'ADMIN' ? 'hot' : 'wait') : s.split ? 'plain' : 'ghost') + cur(n === 4), title: '둘째 부분: 내용', sub: [T.part[1], s.payload ? '풀어 본 내용  ' + s.payload : '아직 풀지 않음'], mono: true });
    P.box('p2', 16, 148, 648, 62, { cls: s.sig === 'match' ? 'good' : s.sig === 'mismatch' ? 'bad' : !T.part[2] && s.split ? 'ghost' : s.split ? 'plain' : 'ghost', title: '셋째 부분: 서명', sub: [T.part[2] || '(비어 있음)', s.calc ? '서버가 다시 계산한 값  ' + s.calc : '서버가 다시 계산한 값  아직 없음'], mono: true });
    P.box('c1', 16, 224, 210, 54, { cls: (s.alg === 'ok' ? 'good' : s.alg === 'reject' ? 'bad' : s.alg === 'follow' ? 'hot' : 'ghost') + cur(n === 5), title: '1. 알고리즘', sub: { '': '아직 확인 전', ok: 'HS256으로 검증', reject: 'none은 받지 않음', follow: '토큰이 말한 none을 따름' }[s.alg] });
    P.box('c2', 235, 224, 210, 54, { cls: s.sig === 'match' ? 'good' : s.sig === 'mismatch' ? 'bad' : s.sig === 'none' ? 'hot' : 'ghost', title: '2. 서명', sub: { '': s.calc ? '다시 계산함, 비교 전' : '아직 확인 전', match: '다시 계산한 값과 일치', mismatch: '다시 계산한 값과 다름', none: '확인하지 않고 건너뜀', alg: '확인하지 않음' }[s.sig] });
    P.box('c3', 454, 224, 210, 54, { cls: s.exp === 'valid' ? 'good' : s.exp === 'expired' ? 'bad' : 'ghost', title: '3. 만료 시각', sub: { '': s.res ? '확인하지 않음' : '아직 확인 전', valid: '만료 전: 유효', expired: '만료 시각이 지남' }[s.exp] });
    P.arrow('a1', 'c1:r', 'c2:l', { cls: s.alg === 'ok' || s.alg === 'follow' ? '' : 'mut' });
    P.arrow('a2', 'c2:r', 'c3:l', { cls: s.sig === 'match' || s.sig === 'none' ? '' : 'mut' });
    P.box('res', 16, 292, 648, 38, { cls: (s.res === 'accept' ? (s.sig === 'none' ? 'bad' : 'good') : s.res === 'reject' ? 'plain' : 'ghost') + cur(n === tot && n > 0), title: '서버의 판단', right: s.res === 'accept' ? '통과 · 회원 7을 ' + T.role + ' 권한으로 처리' : s.res === 'reject' ? '거절 · 토큰의 내용을 쓰지 않음' : '검증 중' });
    P.note('위의 세 줄이 토큰의 세 부분입니다. 첫째와 둘째는 키 없이 풀어 읽을 수 있고, 셋째는 서버가 자기 키로 다시 계산해 비교합니다. 아래의 세 확인을 차례로 모두 지나야 서버가 내용을 믿습니다. 빨간 칸은 그 자리에서 거절된 곳입니다.');
  },
  assume: '화면의 토큰 글자, 서명 값, 열여섯 가지 조합의 검증 결과는 이 PC의 Node.js 24에 든 crypto(HMAC-SHA256)로 토큰을 실제로 만들고 검증해 본 결과와 대조했습니다. 화면의 자바 코드도 JDK 21에서 그대로 실행해 같은 토큰과 같은 결과가 나오는 것을 확인했습니다. 이 PC에는 JWT 라이브러리가 없어서, 검증 절차는 표준 문서를 보고 직접 적은 코드로 실행했습니다. 근거는 다음과 같습니다. 세 부분을 점으로 잇는 모양과 base64url 표기는 RFC 7515 3절과 2절, 서명을 계산하는 대상이 "첫째 부분.둘째 부분"이라는 것은 RFC 7515 5.1절, 검증 순서는 RFC 7515 5.2절과 RFC 7519 7.2절, 지금이 exp보다 앞이어야 한다는 것은 RFC 7519 4.1.4절, alg가 none이고 서명이 빈 토큰의 모양은 RFC 7519 6.1절입니다. 지금이 exp와 정확히 같을 때는 거절됩니다(직접 실행해 확인). 서버가 받을 알고리즘을 정해 두어야 한다는 것은 RFC 8725 3.1절의 권고이고, 널리 쓰이는 JWT 라이브러리가 none을 기본으로 거절한다는 것은 실행으로 확인하지 못했습니다. 실제 서버는 시계 오차를 감안해 exp에 몇 초에서 몇 분의 여유를 두기도 하고(RFC 7519 4.1.4절이 허용), iss, aud 같은 다른 클레임도 함께 확인합니다. 화면의 키와 토큰은 이 실습을 위해 만든 값입니다. 공개키 방식(RS256)을 쓰는 서버에서 alg를 HS256으로 바꿔 보내는 문제는 다루지 않았습니다.',
});

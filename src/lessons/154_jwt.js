Lab.register({
  id: 'jwt', nav: 'JWT의 구조와 검증', cat: '인증', mode: 'step',
  title: '누구나 읽을 수 있는 토큰을 서버는 어떻게 믿나',
  why: '서버 세션 방식은 로그인 상태를 서버 저장소에 두고 요청마다 세션 ID로 찾아보므로, 서버가 여러 대이거나 여러 서비스가 같은 로그인을 확인해야 하면 모두가 그 저장소를 함께 써야 한다. JWT는 사용자 정보와 서명을 토큰 자체에 적어서, 서명을 확인할 키만 가진 서버라면 어디서든 토큰이 발급된 그대로인지 스스로 확인할 수 있게 한다.',
  use: 'OpenID Connect의 ID 토큰이 JWT이고, OAuth 2.0 인가 서버가 발급하는 액세스 토큰에도 흔히 쓰인다. API를 부르는 쪽은 Authorization: Bearer 헤더로 토큰을 보내고, 스프링 서버에서는 Spring Security의 OAuth2 리소스 서버 기능이 JwtDecoder(보통 NimbusJwtDecoder)로 서명과 만료 시각을 검사한다. 로그아웃이나 계정 정지를 바로 반영해야 하면 서버 세션을 쓰거나 토큰의 유효 시간을 짧게 잡는다.',
  intro: 'JWT는 점(.)으로 이어진 세 부분, 곧 머리말과 내용과 서명으로 된 글자입니다. 앞의 두 부분은 암호화한 것이 아니라 표기만 바꿔 적은 것이라 누구나 읽고 고칠 수 있습니다. 스프링 시큐리티가 주는 JwtDecoder의 decode(token)는 알고리즘, 서명, 만료 시각을 차례로 확인해 하나라도 어긋나면 예외를 던지고, 모두 맞을 때만 내용을 돌려줍니다. 토큰을 고치거나 시간이 지났을 때 decode가 어디에서 무엇을 던지는지 봅니다.',
  terms: ['JWT(JSON Web Token)', 'Base64URL 인코딩', '클레임(Claim)', 'JwtDecoder와 NimbusJwtDecoder', 'HMAC과 전자서명', '알고리즘 고정(alg 검증)', '시계 오차 여유(clock skew)'],
  controls: [
    { id: 'tok', label: '서버에 도착한 토큰', type: 'select', value: 'payload', options: [['ok', '서버가 발급한 그대로'], ['payload', '내용의 role을 ADMIN으로 고침 (서명은 그대로)'], ['otherkey', '내용을 고치고 다른 키로 서명을 새로 만듦'], ['none', '머리말의 alg를 none으로 바꾸고 서명을 비움']] },
    { id: 'time', label: '서버가 검증하는 시각', type: 'select', value: 'before', options: [['before', '만료(exp) 10분 전'], ['grace', '만료(exp) 30초 뒤'], ['after', '만료(exp) 5분 뒤']] },
    { id: 'view', label: '보는 코드', type: 'select', value: 'std', options: [['std', '표준: JwtDecoder로 검증'], ['inside', '디코더가 속에서 하는 일: 서명을 직접 다시 계산']], hint: '두 코드의 판단은 같습니다. 둘째는 디코더가 무엇을 계산하는지 JDK만으로 따라 해 본 것입니다.' },
  ],
  presets: [
    { t: '처음 설정으로', q: '내용의 role을 ADMIN으로 고치고 서명은 그대로 둔 토큰을 만료 10분 전에 decode하면 어떻게 되나', d: '내용은 읽고 고칠 수 있어도, decode가 서명에서 BadJwtException을 던집니다.', v: { tok: 'payload', time: 'before', view: 'std' } },
    { t: '발급한 그대로', q: '서버가 발급한 그대로의 토큰을 decode하면', d: '서명이 일치하고 만료 전이라 Jwt 객체가 돌아옵니다.', v: { tok: 'ok', time: 'before', view: 'std' } },
    { t: '다른 키로 서명을 새로 만들면', q: '내용을 고치고 다른 키로 서명을 새로 만든 토큰을 decode하면', d: '서버의 키로 계산한 값과 달라 거절됩니다.', v: { tok: 'otherkey', time: 'before', view: 'std' } },
    { t: '만료 5분 뒤', q: '발급한 그대로의 토큰을 만료(exp) 5분 뒤에 decode하면', d: '서명이 맞아도 JwtValidationException이 납니다.', v: { tok: 'ok', time: 'after', view: 'std' } },
    { t: '만료 30초 뒤', q: '발급한 그대로의 토큰을 만료(exp) 30초 뒤에 decode하면', d: '기본 설정의 디코더는 60초까지 봐주므로 통과합니다.', v: { tok: 'ok', time: 'grace', view: 'std' } },
    { t: 'alg를 none으로 바꾼 토큰', q: '머리말의 alg를 none으로 바꾸고 서명을 비운 토큰을 decode하면', d: '디코더는 서명 없는 토큰을 받지 않습니다.', v: { tok: 'none', time: 'before', view: 'std' } },
    { t: '디코더가 속에서 하는 일', q: 'decode는 서명이 맞는지를 어떻게 알아내나', d: '서명을 JDK의 Mac으로 직접 다시 계산해 비교해 봅니다.', v: { tok: 'payload', time: 'before', view: 'inside' } },
  ],
  // 실제로 계산한 값 (verify/plain/JwtProbe.java와 verify/net/jwt_probe.js가 같은 값을 낸다)
  V: {
    hHs: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9', hNone: 'eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0',
    pUser: 'eyJzdWIiOiI3Iiwicm9sZSI6IlVTRVIiLCJleHAiOjE3NjcyMjU2MDB9', pAdmin: 'eyJzdWIiOiI3Iiwicm9sZSI6IkFETUlOIiwiZXhwIjoxNzY3MjI1NjAwfQ',
    sOk: '5hho4Bt2LLsypoE43dqORdbPqUDkMlzinRCY-zDKmMc', sAdmin: '_Crl3waja45Oj0WU2YHqH-bAhgouCo5PsGQEAgYkIuQ', sOther: 'qmZRR9KJgyn1QAoptqhfdyZ5pV0I2gPLAaszvAlaFJ8',
    jHs: '{"alg":"HS256","typ":"JWT"}', jNone: '{"alg":"none","typ":"JWT"}', jUser: '{"sub":"7","role":"USER","exp":1767225600}', jAdmin: '{"sub":"7","role":"ADMIN","exp":1767225600}',
    exp: 1767225600, now: { before: 1767225000, grace: 1767225630, after: 1767225900 },
    nowText: { before: '2025-12-31 23:50:00 UTC', grace: '2026-01-01 00:00:30 UTC', after: '2026-01-01 00:05:00 UTC' },
    // NimbusJwtDecoder(Spring Security 7.1.1)가 던지는 예외의 메시지 (소스에서 옮김, verify/plain/jwt_probe_std.out.txt)
    msgSig: 'An error occurred while attempting to decode the Jwt: Signed JWT rejected: Invalid signature',
    msgNone: 'Unsupported algorithm of none',
    msgExp: 'An error occurred while attempting to decode the Jwt: Jwt expired at 2026-01-01T00:00:00Z',
  },
  // 설정에 해당하는 토큰의 세 부분과, 풀어 본 내용
  token: function (c) {
    var V = this.V, none = c.tok === 'none', admin = c.tok !== 'ok';
    var p = [none ? V.hNone : V.hHs, admin ? V.pAdmin : V.pUser, c.tok === 'ok' || c.tok === 'payload' ? V.sOk : c.tok === 'otherkey' ? V.sOther : ''];
    return { part: p, text: p.join('.'), header: none ? V.jNone : V.jHs, payload: admin ? V.jAdmin : V.jUser, alg: none ? 'none' : 'HS256', role: admin ? 'ADMIN' : 'USER', expect: admin ? V.sAdmin : V.sOk };
  },
  code: function (c) {
    var T = this.token(c), V = this.V, J = this.judge(c);
    var tokLines = '// 토큰  ' + T.part[0] + '\n//       .' + T.part[1] + '\n//       .' + (T.part[2] || '(비어 있음)') + '\n';
    if (c.view === 'inside') {
      return '// 디코더가 속에서 하는 일을 JDK만으로 따라 해 본 코드다(설명용으로 줄임). 실제 검증은 JwtDecoder에 맡긴다.\n' +
        '// check는 예시로 만든 메서드다. 클래스 선언, serverKey 필드, import는 생략\n' + tokLines +
        '// 지금  now = ' + V.now[c.time] + '   (exp = ' + V.exp + ')\n\n' +
        'boolean check(String token, long now) throws Exception {\n' +
        '    String[] part = token.split("\\\\.", -1);                   // 머리말 . 내용 . 서명\n' +
        '    Base64.Decoder dec = Base64.getUrlDecoder();\n' +
        '    String header  = new String(dec.decode(part[0]), UTF_8);   // 키 없이 풀린다\n' +
        '    String payload = new String(dec.decode(part[1]), UTF_8);   // 키 없이 풀린다\n\n' +
        '    // 1. 알고리즘: 머리말이 무엇이라 하든 서버가 정해 둔 HS256으로만 검증한다\n' +
        '    if (!header.contains("\\"alg\\":\\"HS256\\"")) return false;' + (J.sig === 'alg' ? '   // ← 이번 토큰: 여기서 false' : '') + '\n\n' +
        '    // 2. 서명: 앞의 두 부분과 서버만 아는 키로 HMAC-SHA256을 다시 계산해 셋째 부분과 비교한다\n' +
        '    Mac mac = Mac.getInstance("HmacSHA256");\n' +
        '    mac.init(new SecretKeySpec(serverKey, "HmacSHA256"));\n' +
        '    byte[] expected = mac.doFinal((part[0] + "." + part[1]).getBytes(US_ASCII));\n' +
        '    if (!MessageDigest.isEqual(expected, dec.decode(part[2]))) return false;' + (J.sig === 'mismatch' ? '   // ← 이번 토큰: 여기서 false' : '') + '\n\n' +
        '    // 3. 만료: 지금에서 60초(시계 오차 여유)를 뺀 시각이 exp보다 뒤면 만료\n' +
        '    long exp = 1767225600L;   // payload의 exp 값 (JSON에서 꺼내는 코드는 생략)\n' +
        '    return !Instant.ofEpochSecond(now).minusSeconds(60).isAfter(Instant.ofEpochSecond(exp));' + (J.exp === 'expired' ? '   // ← 이번 토큰: false' : J.ok ? '   // ← 이번 토큰: true' : '') + '\n' +
        '}';
    }
    var mark = function (on, text) { return on ? '   // ← 이번 토큰: ' + text : ''; };
    return '// 예시로 만든 서버 코드의 일부 (클래스 선언, serverKey 필드, import는 생략)\n' +
      '// JwtDecoder, NimbusJwtDecoder, Jwt, BadJwtException, JwtValidationException은\n' +
      '// Spring Security(spring-security-oauth2-jose)가 주는 것이다.\n' +
      '// 요청 헤더  Authorization: Bearer <토큰>\n' + tokLines +
      '// 검증 시각  ' + V.nowText[c.time] + '   (exp = 2026-01-01 00:00:00 UTC)\n\n' +
      'SecretKey key = new SecretKeySpec(serverKey, "HmacSHA256");        // 서버만 아는 키 (32바이트)\n' +
      'JwtDecoder decoder = NimbusJwtDecoder.withSecretKey(key).build();   // 받는 알고리즘: HS256 (기본값)\n\n' +
      'try {\n' +
      '    Jwt jwt = decoder.decode(token);   // 알고리즘 → 서명 → 만료(60초 여유) 순서로 확인\n' +
      '    String userId = jwt.getSubject();             // "7"\n' +
      '    String role = jwt.getClaimAsString("role");' + (J.ok ? '   // ← 이번 토큰: 통과, "' + T.role + '"' : '   // "USER"') + '\n' +
      '} catch (JwtValidationException e) {   // 서명은 맞았는데 만료 같은 검증에서 걸림' + mark(J.exp === 'expired', 'Jwt expired at …') + '\n' +
      '    // 토큰의 내용을 쓰지 않는다\n' +
      '} catch (BadJwtException e) {          // 알고리즘이나 서명이 틀림' + mark(J.sig === 'alg' || J.sig === 'mismatch', J.sig === 'alg' ? 'Unsupported algorithm of none' : 'Invalid signature') + '\n' +
      '    // 토큰의 내용을 쓰지 않는다\n' +
      '}\n\n' +
      '// 스프링 부트 서버에서는 decode를 직접 부르지 않는다. 이 decoder를 빈으로 등록하고\n' +
      '// http.oauth2ResourceServer(o -> o.jwt(Customizer.withDefaults()))를 켜 두면\n' +
      '// BearerTokenAuthenticationFilter가 요청마다 decode를 부르고, 예외가 나면 401로 답한다.';
  },
  label: function (c) { return { ok: '발급한 그대로', payload: '내용을 고침', otherkey: '다른 키로 서명', none: 'alg none' }[c.tok] + ' · ' + { before: '만료 10분 전', grace: '만료 30초 뒤', after: '만료 5분 뒤' }[c.time] + ' · ' + (c.view === 'std' ? 'JwtDecoder' : '속에서 하는 일'); },
  columns: ['서명 확인', '만료 확인', '판단', '거절 이유'],
  // 검증 절차의 결과만 계산한다 (실제 계산과 대조하는 부분). 두 코드의 판단은 같다.
  judge: function (c) {
    var T = this.token(c), V = this.V, sig, exp = 'skip';
    if (T.alg !== 'HS256') sig = 'alg';
    else sig = T.part[2] === T.expect ? 'match' : 'mismatch';
    if (sig === 'match') exp = V.now[c.time] < V.exp ? 'valid' : V.now[c.time] - 60 <= V.exp ? 'grace' : 'expired';
    return { sig: sig, exp: exp, ok: exp === 'valid' || exp === 'grace' };
  },
  simulate: function (c) {
    var T = this.token(c), V = this.V, J = this.judge(c), std = c.view === 'std', ev = [], sum = [], short = function (s) { return s.slice(0, 8) + '…'; };
    var st = { split: false, header: '', payload: '', alg: '', sig: '', calc: '', exp: '', res: '' };
    function push(s, k) { ev.push({ s: s, k: k || '', snap: JSON.parse(JSON.stringify(st)) }); }
    push({ ok: '로그인할 때 서버가 내려 준 토큰이 요청의 Authorization 헤더에 그대로 실려 왔습니다. 발급할 때 서버는 회원 번호 7, 권한 USER, 만료 시각을 적고 자기 키로 서명을 붙였습니다.',
      payload: '누군가 토큰의 가운데 부분을 고쳐서 보냈습니다. role을 USER에서 ADMIN으로 바꿔 다시 적었고, 끝의 서명은 원래 것을 그대로 두었습니다.',
      otherkey: '누군가 토큰의 role을 ADMIN으로 고치고, 서버의 키를 모르므로 자기가 가진 다른 키로 서명을 새로 계산해 붙였습니다.',
      none: '누군가 머리말의 alg를 none(서명 없음)으로 바꾸고 role을 ADMIN으로 고친 뒤, 서명 부분을 비워서 보냈습니다. 그래서 토큰이 점으로 끝납니다.' }[c.tok], c.tok === 'ok' ? '' : 'bad');
    st.split = true; st.header = T.header;
    push((std ? 'decoder.decode(token): 디코더가 토큰을 점(.)에서 세 부분으로 나누고, 첫째 부분(머리말)을 base64url로 풉니다.' : 'token.split과 dec.decode(part[0]): 토큰을 점(.)에서 세 부분으로 나누고, 첫째 부분(머리말)을 base64url 디코더로 풉니다.') + ' 키는 필요 없습니다. 결과는 ' + T.header + ' 입니다. alg는 "이 토큰은 이 알고리즘으로 서명했다"는 토큰 쪽의 주장입니다.' + (T.part[2] ? '' : ' 이 토큰은 셋째 부분이 비어 있습니다.'), T.alg === 'none' ? 'bad' : '');
    st.payload = T.payload;
    push('둘째 부분(내용)도 같은 방법으로 풀면 ' + T.payload + ' 입니다. 암호화한 것이 아니라 표기만 바꿔 적은 것이라, 토큰을 손에 넣은 사람은 누구나 읽습니다. 아직 서명을 확인하지 않았으므로 이 내용을 믿지 않습니다.', T.role === 'ADMIN' ? 'bad' : '');
    if (J.sig === 'alg') {
      st.alg = 'reject';
      push(std ? '알고리즘 확인: alg가 none이라 이 토큰은 서명이 없는 토큰으로 읽혔습니다. NimbusJwtDecoder는 서명 없는 토큰을 받지 않으므로 BadJwtException을 던집니다. 메시지는 "' + V.msgNone + '"입니다. 서명과 만료 시각은 보지도 않습니다.'
        : 'header.contains: 머리말의 alg가 HS256이 아니라 none이므로 false를 돌려줍니다. 어떤 알고리즘으로 검증할지를 토큰이 아니라 서버가 정해 두었기 때문에, 서명을 계산해 보기도 전에 거절합니다.', 'good');
    } else {
      st.alg = 'ok';
      push(std ? '알고리즘 확인: 이 디코더는 withSecretKey(key)로 만들 때 HS256으로 정해졌습니다(기본값). 머리말의 alg도 HS256이므로 서버의 키로 서명을 확인하러 갑니다.' : 'header.contains: 머리말의 alg가 서버가 정해 둔 HS256과 같으므로 서명 확인으로 넘어갑니다.');
      st.calc = T.expect;
      push((std ? '서명 다시 계산: 디코더가 받은 토큰의 앞 두 부분과 서버만 아는 키로 HMAC-SHA256을 다시 계산합니다.' : 'mac.doFinal(part[0] + "." + part[1]): 받은 토큰의 앞 두 부분과 서버만 아는 키로 HMAC-SHA256을 다시 계산합니다.') + ' 결과는 ' + short(T.expect) + ' 입니다. 토큰에 붙어 온 서명을 그대로 믿지 않고, 서버가 직접 만들어 보는 것입니다.');
      st.sig = J.sig;
      var cmp = (std ? '비교' : 'MessageDigest.isEqual') + ': 다시 계산한 값(' + short(T.expect) + ')과 토큰의 셋째 부분(' + short(T.part[2]) + ')을 비교합니다. ';
      if (J.sig === 'match') push(cmp + '같습니다. 서버가 발급한 뒤로 머리말과 내용이 한 글자도 바뀌지 않았다는 뜻입니다.', 'good');
      else push(cmp + '다릅니다. ' + (c.tok === 'payload' ? '붙어 온 서명은 고치기 전의 내용으로 만든 것이라, 고친 내용으로 계산한 값과 맞지 않습니다.' : '붙어 온 서명은 다른 키로 만든 것이라 서버의 키로 계산한 값과 맞지 않습니다. 서버의 키를 모르면 맞는 서명을 만들 수 없습니다.') + (std ? ' BadJwtException을 던집니다. 메시지는 "' + V.msgSig + '"입니다.' : ' false를 돌려줍니다.'), 'good');
    }
    if (J.exp !== 'skip') {
      st.exp = J.exp;
      var at = '만료 확인' + (std ? '(JwtTimestampValidator)' : '') + ': 내용의 exp는 ' + V.exp + '(2026-01-01 00:00:00 UTC)이고, 지금은 ' + V.now[c.time] + '(' + V.nowText[c.time] + ')입니다. ';
      if (J.exp === 'valid') push(at + '지금이 exp보다 앞이므로 아직 유효합니다.');
      else if (J.exp === 'grace') push(at + '지금이 exp보다 30초 뒤지만, 서버끼리의 시계 차이를 감안해 기본으로 60초를 봐줍니다. 지금에서 60초를 뺀 시각이 exp보다 앞이므로 유효로 봅니다.', 'hot');
      else push(at + '지금이 exp보다 5분 뒤라 60초 여유도 넘었습니다. ' + (std ? 'JwtValidationException을 던집니다. 메시지는 "' + V.msgExp + '"입니다.' : 'false를 돌려줍니다.') + ' 서명이 맞아도 만료된 토큰은 받지 않습니다.', 'bad');
    }
    st.res = J.ok ? 'accept' : 'reject';
    if (J.ok) push(std ? 'decode가 Jwt 객체를 돌려줍니다. jwt.getSubject()는 "7", jwt.getClaimAsString("role")은 "USER"입니다. 서버는 저장소를 찾아보지 않고 이 요청을 회원 7, 권한 USER의 요청으로 처리합니다.' : 'check가 true를 돌려줍니다. 디코더도 같은 값을 계산해 Jwt 객체를 돌려줍니다.', 'good');
    else push(std ? '거절: 예외가 났으므로 토큰의 내용을 쓰지 않습니다. 리소스 서버 설정(oauth2ResourceServer)이라면 BearerTokenAuthenticationFilter가 이 예외를 받아 401과 WWW-Authenticate: Bearer error="invalid_token" 헤더로 답합니다.' : 'check가 false를 돌려줍니다. 디코더라면 같은 자리에서 예외를 던집니다.', c.tok === 'ok' ? '' : 'good');
    var why = std ? { alg: 'BadJwtException (Unsupported algorithm of none)', mismatch: 'BadJwtException (Invalid signature)', expired: 'JwtValidationException (Jwt expired)' } : { alg: 'alg가 HS256이 아님', mismatch: '서명이 다름', expired: '만료 시각이 지남' };
    var row = [{ match: '일치', mismatch: '불일치', alg: '하지 않음 (알고리즘에서 거절)' }[J.sig], { valid: '만료 전', grace: '만료 30초 뒤 · 60초 여유 안', expired: '만료됨 (60초 여유도 지남)', skip: '하지 않음 (앞에서 거절)' }[J.exp], J.ok ? '통과 · role ' + T.role : '거절', J.ok ? '없음' : why[J.sig === 'match' ? 'expired' : J.sig]];
    sum.push('머리말과 내용은 base64url로 적은 것이라 키 없이도 읽고 고칠 수 있습니다. 그래서 토큰에는 비밀번호 같은 것을 넣지 않습니다.');
    if (J.ok && J.exp === 'valid') sum.push('decode가 예외 없이 Jwt를 돌려줬다는 것은 서명이 서버의 키로 만든 것과 같고 만료 전이라는 뜻입니다. 그때부터 getSubject(), getClaimAsString("role")로 꺼낸 값을 믿습니다.');
    if (J.exp === 'grace') sum.push('기본 설정의 NimbusJwtDecoder(JwtTimestampValidator)는 시계 차이를 감안해 exp에서 60초까지는 통과시키고 61초부터 거절합니다. 여유를 바꾸려면 new JwtTimestampValidator(Duration.ofSeconds(10))처럼 만든 검증기를 JwtValidators.createDefaultWithValidators로 묶어 NimbusJwtDecoder의 setJwtValidator에 넘깁니다.');
    if (J.exp === 'expired') sum.push('서명이 맞는 토큰이라도 exp에서 60초 여유를 넘기면 JwtValidationException입니다. 이 예외는 BadJwtException을 물려받은 것이라, 둘을 나눠 잡으려면 JwtValidationException을 먼저 적습니다. 토큰은 발급한 뒤에는 서버가 회수하기 어렵기 때문에, 만료 시각을 짧게 두어 유출됐을 때의 피해 시간을 줄입니다.');
    if (J.sig === 'mismatch') sum.push(c.tok === 'payload' ? '내용을 한 글자라도 고치면 다시 계산한 서명이 달라집니다. 서명은 "이 내용 그대로"에 대해서만 맞습니다.' : '서명을 새로 만들어 붙여도, 서버의 키로 만든 것이 아니면 서버가 계산한 값과 다릅니다. 이 방식(HS256)의 안전은 서버의 키가 새지 않는 데 달려 있습니다.');
    if (J.sig === 'mismatch' && c.time !== 'before') sum.push('서명에서 거절됐으므로 만료 시각은 확인하지도 않았습니다. 시각을 바꿔도 결과가 같습니다.');
    if (J.sig === 'alg') sum.push('검증에 쓸 알고리즘은 디코더를 만들 때 정해집니다(withSecretKey는 HS256). 머리말의 alg는 누구나 고칠 수 있는 글자라서, 그 값을 따라 서명 확인을 건너뛰는 검증 코드는 서명 없는 토큰을 통과시킵니다. NimbusJwtDecoder는 서명 없는 토큰을 받지 않습니다.');
    if (!std) sum.push('직접 짠 코드도 디코더와 같은 값을 계산해 같은 판단을 냈습니다. 디코더가 하는 일이 이것이라는 것을 보이려는 것이고, 실제 서버에서는 형식 오류, 키 길이, 다른 알고리즘, typ 확인 같은 경우까지 맡는 JwtDecoder를 씁니다.');
    return { events: ev, summary: sum, tk: T, std: std, row: row };
  },
  render: function (v, sim, t, H, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : null, T = sim.tk;
    if (!s) { H.text(v, '실행을 누르면 토큰을 한 부분씩 풀어 보고 검증합니다.'); return; }
    H.table(v, ['부분', '토큰에 적힌 글자', '풀어 본 내용'], [
      { cells: ['머리말', s.split ? T.part[0] : '', { v: s.header || (s.split ? '아직 풀지 않음' : ''), cls: s.header && T.alg === 'none' ? 'bad' : '' }] },
      { cells: ['내용', s.split ? T.part[1] : '', { v: s.payload || (s.split ? '아직 풀지 않음' : ''), cls: s.payload && T.role === 'ADMIN' ? 'bad' : '' }] },
      { cells: ['서명', s.split ? (T.part[2] || '(비어 있음)') : '', s.calc ? '서버가 다시 계산한 값: ' + s.calc : '글자로 풀어 볼 내용이 아님 (계산한 값)'] },
    ], s.split ? '세 부분으로 나눈 토큰' : '받은 토큰 (아직 나누기 전)');
  },
  // 그림: 위쪽 세 줄은 토큰의 세 부분(적힌 글자와 풀어 본 내용), 아래쪽은 디코더가 차례로 하는 세 가지 확인과 decode의 결과다.
  draw: function (P, sim, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : { split: false, header: '', payload: '', alg: '', sig: '', calc: '', exp: '', res: '' }, T = sim.tk, n = shown.length, tot = sim.events.length, std = sim.std;
    P.size(680, 346);
    var cur = function (on) { return on ? ' now' : ''; };
    P.box('p0', 16, 12, 648, 62, { cls: (s.header ? (T.alg === 'none' ? 'bad' : 'wait') : 'ghost') + cur(n === 2), title: '첫째 부분: 머리말', sub: [T.part[0], s.header ? '풀어 본 내용  ' + s.header : '아직 풀지 않음'], mono: true });
    P.box('p1', 16, 80, 648, 62, { cls: (s.payload ? (T.role === 'ADMIN' ? 'hot' : 'wait') : s.split ? 'plain' : 'ghost') + cur(n === 3), title: '둘째 부분: 내용', sub: [T.part[1], s.payload ? '풀어 본 내용  ' + s.payload : '아직 풀지 않음'], mono: true });
    P.box('p2', 16, 148, 648, 62, { cls: s.sig === 'match' ? 'good' : s.sig === 'mismatch' ? 'bad' : s.split ? (T.part[2] ? 'plain' : 'ghost') : 'ghost', title: '셋째 부분: 서명', sub: [T.part[2] || '(비어 있음)', s.calc ? '서버가 다시 계산한 값  ' + s.calc : '서버가 다시 계산한 값  아직 없음'], mono: true });
    P.box('c1', 16, 224, 210, 54, { cls: (s.alg === 'ok' ? 'good' : s.alg === 'reject' ? 'bad' : 'ghost') + cur(n === 4), title: '1. 알고리즘', sub: { '': '아직 확인 전', ok: 'HS256 (서버가 정해 둠)', reject: 'none은 받지 않음' }[s.alg] });
    P.box('c2', 235, 224, 210, 54, { cls: s.sig === 'match' ? 'good' : s.sig === 'mismatch' ? 'bad' : 'ghost', title: '2. 서명', sub: { '': s.calc ? '다시 계산함, 비교 전' : s.alg === 'reject' ? '확인하지 않음' : '아직 확인 전', match: '다시 계산한 값과 일치', mismatch: '다시 계산한 값과 다름' }[s.sig] });
    P.box('c3', 454, 224, 210, 54, { cls: s.exp === 'valid' ? 'good' : s.exp === 'grace' ? 'hot' : s.exp === 'expired' ? 'bad' : 'ghost', title: '3. 만료 시각 (60초 여유)', sub: { '': s.res ? '확인하지 않음' : '아직 확인 전', valid: '만료 전: 유효', grace: '30초 지났지만 여유 안', expired: '여유까지 지남' }[s.exp] });
    P.arrow('a1', 'c1:r', 'c2:l', { cls: s.alg === 'ok' ? '' : 'mut' });
    P.arrow('a2', 'c2:r', 'c3:l', { cls: s.sig === 'match' ? '' : 'mut' });
    P.box('res', 16, 292, 648, 38, { cls: (s.res === 'accept' ? 'good' : s.res === 'reject' ? 'plain' : 'ghost') + cur(n === tot && n > 0), title: std ? 'decode의 결과' : 'check의 결과', right: s.res === 'accept' ? (std ? 'Jwt를 돌려줌 · 회원 7, role ' + T.role : 'true') : s.res === 'reject' ? (std ? sim.row[3].replace(/ \(.*$/, '') + '을 던짐' : 'false') : '검증 중' });
    P.note('위의 세 줄이 토큰의 세 부분입니다. 아래의 세 확인을 차례로 모두 지나야 서버가 내용을 믿습니다. 빨간 칸은 그 자리에서 거절된 곳이고, 노란 칸은 눈여겨볼 곳(고친 내용, 60초 여유 덕에 통과한 만료 확인)입니다.');
  },
  assume: '화면의 토큰 글자와 서명 값은 검증 실행에서 JDK 21의 javax.crypto.Mac(HmacSHA256)과 Node.js 24의 crypto로 각각 실제로 만들어 같은 값이 나오는 것을 확인했습니다. 검증 실행 환경에는 spring-security-oauth2-jose와 nimbus-jose-jwt가 없어서 NimbusJwtDecoder 자체는 실행하지 않았습니다. 대신 decode가 거치는 순서와 예외 이름, 메시지를 공식 소스(Spring Security 7.1.1의 NimbusJwtDecoder, JwtValidators, JwtTimestampValidator와 그것이 쓰는 nimbus-jose-jwt 10.9.1의 JWTParser, PlainJWT, DefaultJWTProcessor)에서 옮기고, 서명이 맞는지는 Mac으로 실제로 계산해 열두 가지 경우의 결과를 냈습니다. 만료 여유는 소스의 조건(지금에서 60초를 뺀 시각이 exp보다 뒤이면 거절) 그대로 계산해, exp에서 60초 뒤까지는 통과하고 61초 뒤부터 거절되는 것을 확인했습니다. JwtTimestampValidator는 시스템 시계로 재므로, 화면의 검증 시각은 이 실습에서 정한 값입니다(setClock으로 고정할 수 있음). 화면의 표준 코드는 공식 시그니처만 옮긴 대역과 함께 javac로 컴파일되는 것을 확인했고, "속에서 하는 일" 코드는 JDK 21에서 그대로 실행해 화면의 판단과 같은 결과가 나오는 것을 확인했습니다. 근거가 된 표준은 다음과 같습니다. 세 부분을 점으로 잇는 모양과 base64url 표기는 RFC 7515 3절과 2절, 서명을 계산하는 대상이 "첫째 부분.둘째 부분"이라는 것은 RFC 7515 5.1절, exp의 뜻과 시계 오차 여유를 둘 수 있다는 것은 RFC 7519 4.1.4절, alg가 none이고 서명이 빈 토큰의 모양은 RFC 7519 6.1절, 받을 알고리즘을 서버가 정해 두라는 권고는 RFC 8725 3.1절입니다. 실제 서버는 iss, aud 같은 다른 클레임도 함께 확인하도록 검증기를 더하기도 합니다. 화면의 키와 토큰은 이 실습을 위해 만든 값입니다. 공개키 방식(RS256)을 쓰는 서버와 그때의 공격은 다루지 않았습니다.',
});

Lab.register({
  id: 'jwt', nav: 'JWT structure and verification', cat: 'Authentication', mode: 'step',
  title: 'How does the server trust a token that anyone can read?',
  why: 'The server session approach keeps the login state in server storage and looks it up with the session ID on every request, so if there are several servers, or several services have to check the same login, they all have to share that storage. A JWT writes the user information and a signature into the token itself, so any server that has only the key for checking the signature can verify on its own that the token is exactly as it was issued.',
  use: 'The ID token in OpenID Connect is a JWT, and a JWT is also commonly used for the access tokens that an OAuth 2.0 authorization server issues. The side that calls the API sends the token in the Authorization: Bearer header, and on a Spring server, the OAuth2 resource server feature of Spring Security checks the signature and the expiration time with a JwtDecoder (usually NimbusJwtDecoder). If you need a logout or an account suspension to take effect right away, you use server sessions or keep the lifetime of the token short.',
  intro: 'A JWT is a string made of three parts joined by dots (.): a header, a payload, and a signature. The first two parts are not encrypted. They are only written in a different notation, so anyone can read and change them. The decode(token) method of the JwtDecoder that Spring Security provides checks the algorithm, the signature, and the expiration time in that order, throws an exception if even one of them is wrong, and returns the contents only when all of them are correct. You see where decode throws what when the token is changed or time has passed.',
  terms: ['JSON Web Token (JWT)', 'Base64url encoding', 'Claim', 'JwtDecoder and NimbusJwtDecoder', 'HMAC and digital signatures', 'Algorithm verification', 'Clock skew'],
  controls: [
    { id: 'tok', label: 'The token that arrived at the server', type: 'select', value: 'payload', options: [['ok', 'Exactly as the server issued it'], ['payload', 'The role in the payload changed to ADMIN (signature left as is)'], ['otherkey', 'Payload changed, and a new signature made with a different key'], ['none', 'The alg in the header changed to none and the signature left empty']] },
    { id: 'time', label: 'When the server verifies', type: 'select', value: 'before', options: [['before', '10 minutes before expiration (exp)'], ['grace', '30 seconds after expiration (exp)'], ['after', '5 minutes after expiration (exp)']] },
    { id: 'view', label: 'Code to view', type: 'select', value: 'std', options: [['std', 'Standard: verify with JwtDecoder'], ['inside', 'What the decoder does inside: recalculate the signature yourself']], hint: 'The two codes make the same decision. The second one follows, with only the JDK, what the decoder calculates.' },
  ],
  presets: [
    { t: 'Default settings', q: 'What happens when you decode a token with the role changed to ADMIN and the signature left as is, 10 minutes before expiration (exp)?', d: 'Even though the payload can be read and changed, decode throws BadJwtException at the signature.', v: { tok: 'payload', time: 'before', view: 'std' } },
    { t: 'Exactly as issued', q: 'What if you decode a token exactly as the server issued it?', d: 'The signature matches and the token has not expired, so a Jwt object is returned.', v: { tok: 'ok', time: 'before', view: 'std' } },
    { t: 'If a new signature is made with a different key', q: 'What if you decode a token whose payload was changed and whose new signature was made with a different key?', d: 'It differs from the value calculated with the server\'s key, so it is rejected.', v: { tok: 'otherkey', time: 'before', view: 'std' } },
    { t: '5 minutes after expiration', q: 'What if you decode a token exactly as issued 5 minutes after expiration (exp)?', d: 'Even though the signature is correct, JwtValidationException is thrown.', v: { tok: 'ok', time: 'after', view: 'std' } },
    { t: '30 seconds after expiration', q: 'What if you decode a token exactly as issued 30 seconds after expiration (exp)?', d: 'The decoder with the default settings allows 60 seconds, so it passes.', v: { tok: 'ok', time: 'grace', view: 'std' } },
    { t: 'A token with alg changed to none', q: 'What if you decode a token whose alg in the header was changed to none and whose signature was left empty?', d: 'The decoder does not accept a token without a signature.', v: { tok: 'none', time: 'before', view: 'std' } },
    { t: 'What the decoder does inside', q: 'How does decode find out whether the signature is correct?', d: 'You recalculate the signature yourself with Mac of the JDK and compare.', v: { tok: 'payload', time: 'before', view: 'inside' } },
  ],
  // Values that were actually calculated (verify/plain/JwtProbe.java and verify/net/jwt_probe.js produce the same values)
  V: {
    hHs: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9', hNone: 'eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0',
    pUser: 'eyJzdWIiOiI3Iiwicm9sZSI6IlVTRVIiLCJleHAiOjE3NjcyMjU2MDB9', pAdmin: 'eyJzdWIiOiI3Iiwicm9sZSI6IkFETUlOIiwiZXhwIjoxNzY3MjI1NjAwfQ',
    sOk: '5hho4Bt2LLsypoE43dqORdbPqUDkMlzinRCY-zDKmMc', sAdmin: '_Crl3waja45Oj0WU2YHqH-bAhgouCo5PsGQEAgYkIuQ', sOther: 'qmZRR9KJgyn1QAoptqhfdyZ5pV0I2gPLAaszvAlaFJ8',
    jHs: '{"alg":"HS256","typ":"JWT"}', jNone: '{"alg":"none","typ":"JWT"}', jUser: '{"sub":"7","role":"USER","exp":1767225600}', jAdmin: '{"sub":"7","role":"ADMIN","exp":1767225600}',
    exp: 1767225600, now: { before: 1767225000, grace: 1767225630, after: 1767225900 },
    nowText: { before: '2025-12-31 23:50:00 UTC', grace: '2026-01-01 00:00:30 UTC', after: '2026-01-01 00:05:00 UTC' },
    // The messages of the exceptions that NimbusJwtDecoder (Spring Security 7.1.1) throws (copied from the source, verify/plain/jwt_probe_std.out.txt)
    msgSig: 'An error occurred while attempting to decode the Jwt: Signed JWT rejected: Invalid signature',
    msgNone: 'Unsupported algorithm of none',
    msgExp: 'An error occurred while attempting to decode the Jwt: Jwt expired at 2026-01-01T00:00:00Z',
  },
  // The three parts of the token for the settings, and the decoded content
  token: function (c) {
    var V = this.V, none = c.tok === 'none', admin = c.tok !== 'ok';
    var p = [none ? V.hNone : V.hHs, admin ? V.pAdmin : V.pUser, c.tok === 'ok' || c.tok === 'payload' ? V.sOk : c.tok === 'otherkey' ? V.sOther : ''];
    return { part: p, text: p.join('.'), header: none ? V.jNone : V.jHs, payload: admin ? V.jAdmin : V.jUser, alg: none ? 'none' : 'HS256', role: admin ? 'ADMIN' : 'USER', expect: admin ? V.sAdmin : V.sOk };
  },
  code: function (c) {
    var T = this.token(c), V = this.V, J = this.judge(c);
    var tokLines = '// Token  ' + T.part[0] + '\n//       .' + T.part[1] + '\n//       .' + (T.part[2] || '(empty)') + '\n';
    if (c.view === 'inside') {
      return '// This code follows what the decoder does inside, using only the JDK (shortened for explanation). Real verification is left to JwtDecoder.\n' +
        '// check is a method made for this example. The class declaration, the serverKey field, and imports are omitted\n' + tokLines +
        '// Now  now = ' + V.now[c.time] + '   (exp = ' + V.exp + ')\n\n' +
        'boolean check(String token, long now) throws Exception {\n' +
        '    String[] part = token.split("\\\\.", -1);                   // header . payload . signature\n' +
        '    Base64.Decoder dec = Base64.getUrlDecoder();\n' +
        '    String header  = new String(dec.decode(part[0]), UTF_8);   // decodes without a key\n' +
        '    String payload = new String(dec.decode(part[1]), UTF_8);   // decodes without a key\n\n' +
        '    // 1. Algorithm: whatever the header says, verify only with HS256, which the server has set\n' +
        '    if (!header.contains("\\"alg\\":\\"HS256\\"")) return false;' + (J.sig === 'alg' ? '   // ← this token: false here' : '') + '\n\n' +
        '    // 2. Signature: recalculate HMAC-SHA256 from the first two parts and a key only the server knows, and compare it with the third part\n' +
        '    Mac mac = Mac.getInstance("HmacSHA256");\n' +
        '    mac.init(new SecretKeySpec(serverKey, "HmacSHA256"));\n' +
        '    byte[] expected = mac.doFinal((part[0] + "." + part[1]).getBytes(US_ASCII));\n' +
        '    if (!MessageDigest.isEqual(expected, dec.decode(part[2]))) return false;' + (J.sig === 'mismatch' ? '   // ← this token: false here' : '') + '\n\n' +
        '    // 3. Expiration: the token has expired if the time 60 seconds (the clock skew) before now is after exp\n' +
        '    long exp = 1767225600L;   // the exp value of the payload (the code that takes it out of the JSON is omitted)\n' +
        '    return !Instant.ofEpochSecond(now).minusSeconds(60).isAfter(Instant.ofEpochSecond(exp));' + (J.exp === 'expired' ? '   // ← this token: false' : J.ok ? '   // ← this token: true' : '') + '\n' +
        '}';
    }
    var mark = function (on, text) { return on ? '   // ← this token: ' + text : ''; };
    return '// Part of a server code made as an example (class declaration, serverKey field, and imports omitted)\n' +
      '// JwtDecoder, NimbusJwtDecoder, Jwt, BadJwtException, and JwtValidationException are\n' +
      '// provided by Spring Security (spring-security-oauth2-jose).\n' +
      '// Request header  Authorization: Bearer <token>\n' + tokLines +
      '// Verification time  ' + V.nowText[c.time] + '   (exp = 2026-01-01 00:00:00 UTC)\n\n' +
      'SecretKey key = new SecretKeySpec(serverKey, "HmacSHA256");        // a key only the server knows (32 bytes)\n' +
      'JwtDecoder decoder = NimbusJwtDecoder.withSecretKey(key).build();   // accepted algorithm: HS256 (the default)\n\n' +
      'try {\n' +
      '    Jwt jwt = decoder.decode(token);   // checks in the order algorithm → signature → expiration (60 second skew)\n' +
      '    String userId = jwt.getSubject();             // "7"\n' +
      '    String role = jwt.getClaimAsString("role");' + (J.ok ? '   // ← this token: passed, "' + T.role + '"' : '   // "USER"') + '\n' +
      '} catch (JwtValidationException e) {   // the signature matched but a check such as expiration failed' + mark(J.exp === 'expired', 'Jwt expired at …') + '\n' +
      '    // do not use the contents of the token\n' +
      '} catch (BadJwtException e) {          // the algorithm or the signature is wrong' + mark(J.sig === 'alg' || J.sig === 'mismatch', J.sig === 'alg' ? 'Unsupported algorithm of none' : 'Invalid signature') + '\n' +
      '    // do not use the contents of the token\n' +
      '}\n\n' +
      '// In a Spring Boot server, you do not call decode yourself. If you register this decoder as a bean and turn on\n' +
      '// http.oauth2ResourceServer(o -> o.jwt(Customizer.withDefaults())),\n' +
      '// BearerTokenAuthenticationFilter calls decode on every request and answers with 401 if an exception occurs.';
  },
  label: function (c) { return { ok: 'Exactly as issued', payload: 'Payload changed', otherkey: 'Signed with another key', none: 'alg none' }[c.tok] + ' · ' + { before: '10 minutes before expiration', grace: '30 seconds after expiration', after: '5 minutes after expiration' }[c.time] + ' · ' + (c.view === 'std' ? 'JwtDecoder' : 'What it does inside'); },
  columns: ['Signature check', 'Expiration check', 'Decision', 'Reason for rejection'],
  // Only the result of the verification procedure is calculated (the part checked against real calculation). The decision is the same for both codes.
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
    push({ ok: 'The token the server handed out at login arrived unchanged in the Authorization header of the request. When it issued the token, the server wrote member number 7, the role USER, and an expiration time into it, and attached a signature made with its own key.',
      payload: 'Someone changed the middle part of the token before sending it. They rewrote the role from USER to ADMIN and left the original signature at the end as it was.',
      otherkey: 'Someone changed the role in the token to ADMIN. They do not know the server\'s key, so they calculated a new signature with another key they hold and attached it.',
      none: 'Someone changed the alg in the header to none (no signature), changed the role to ADMIN, and sent the token with the signature part empty. That is why the token ends with a dot.' }[c.tok], c.tok === 'ok' ? '' : 'bad');
    st.split = true; st.header = T.header;
    push((std ? 'decoder.decode(token): the decoder cuts the token at the dots (.) into three parts and decodes the first part (the header) with base64url.' : 'token.split and dec.decode(part[0]): the code cuts the token at the dots (.) into three parts and decodes the first part (the header) with a base64url decoder.') + ' No key is needed. The result is ' + T.header + '. The alg is what the token says about itself: "this token was signed with this algorithm."' + (T.part[2] ? '' : ' The third part of this token is empty.'), T.alg === 'none' ? 'bad' : '');
    st.payload = T.payload;
    push('Decoding the second part (the payload) the same way gives ' + T.payload + '. It is not encrypted, only written in a different notation, so anyone who gets hold of the token can read it. The signature has not been checked yet, so this content is not trusted.', T.role === 'ADMIN' ? 'bad' : '');
    if (J.sig === 'alg') {
      st.alg = 'reject';
      push(std ? 'Algorithm check: the alg is none, so this token was read as a token without a signature. NimbusJwtDecoder does not accept a token without a signature, so it throws BadJwtException. The message is "' + V.msgNone + '". It does not even look at the signature or the expiration time.'
        : 'header.contains: the alg in the header is none, not HS256, so it returns false. Because the server, not the token, has decided which algorithm to verify with, it rejects the token before even calculating the signature.', 'good');
    } else {
      st.alg = 'ok';
      push(std ? 'Algorithm check: when this decoder was built with withSecretKey(key), it was set to HS256 (the default). The alg in the header is also HS256, so it goes on to check the signature with the server\'s key.' : 'header.contains: the alg in the header is the same as the HS256 that the server has set, so it moves on to the signature check.');
      st.calc = T.expect;
      push((std ? 'Recalculating the signature: the decoder recalculates HMAC-SHA256 from the first two parts of the received token and the key only the server knows.' : 'mac.doFinal(part[0] + "." + part[1]): the code recalculates HMAC-SHA256 from the first two parts of the received token and the key only the server knows.') + ' The result is ' + short(T.expect) + '. The server does not trust the signature that came with the token. It builds one itself.');
      st.sig = J.sig;
      var cmp = (std ? 'Comparison' : 'MessageDigest.isEqual') + ': it compares the recalculated value (' + short(T.expect) + ') with the third part of the token (' + short(T.part[2]) + '). ';
      if (J.sig === 'match') push(cmp + 'They are the same. This means the header and the payload have not changed by a single character since the server issued the token.', 'good');
      else push(cmp + 'They differ. ' + (c.tok === 'payload' ? 'The attached signature was made from the contents before the change, so it does not match the value calculated from the changed contents.' : 'The attached signature was made with a different key, so it does not match the value calculated with the server\'s key. Without the server\'s key, no one can make a matching signature.') + (std ? ' It throws BadJwtException. The message is "' + V.msgSig + '".' : ' It returns false.'), 'good');
    }
    if (J.exp !== 'skip') {
      st.exp = J.exp;
      var at = 'Expiration check' + (std ? ' (JwtTimestampValidator)' : '') + ': the exp in the payload is ' + V.exp + ' (2026-01-01 00:00:00 UTC), and the current time is ' + V.now[c.time] + ' (' + V.nowText[c.time] + '). ';
      if (J.exp === 'valid') push(at + 'The current time is before exp, so the token is still valid.');
      else if (J.exp === 'grace') push(at + 'The current time is 30 seconds after exp, but to allow for clock differences between servers, a clock skew of 60 seconds is allowed by default. The time 60 seconds before now is before exp, so the token is treated as valid.', 'hot');
      else push(at + 'The current time is 5 minutes after exp, which is past the 60 second clock skew too. ' + (std ? 'It throws JwtValidationException. The message is "' + V.msgExp + '".' : 'It returns false.') + ' Even if the signature matches, an expired token is not accepted.', 'bad');
    }
    st.res = J.ok ? 'accept' : 'reject';
    if (J.ok) push(std ? 'decode returns a Jwt object. jwt.getSubject() is "7" and jwt.getClaimAsString("role") is "USER". Without looking anything up in a store, the server handles this request as a request from member 7 with the role USER.' : 'check returns true. The decoder also calculates the same values and returns a Jwt object.', 'good');
    else push(std ? 'Rejected: an exception occurred, so the contents of the token are not used. With the resource server setting (oauth2ResourceServer), BearerTokenAuthenticationFilter receives this exception and answers with 401 and a WWW-Authenticate: Bearer error="invalid_token" header.' : 'check returns false. A decoder would throw an exception at the same place.', c.tok === 'ok' ? '' : 'good');
    var why = std ? { alg: 'BadJwtException (Unsupported algorithm of none)', mismatch: 'BadJwtException (Invalid signature)', expired: 'JwtValidationException (Jwt expired)' } : { alg: 'alg is not HS256', mismatch: 'Signature differs', expired: 'Expiration time has passed' };
    var row = [{ match: 'Match', mismatch: 'Mismatch', alg: 'Not done (rejected at the algorithm check)' }[J.sig], { valid: 'Before expiration', grace: '30s after expiration · within the 60s skew', expired: 'Expired (past the 60s skew too)', skip: 'Not done (rejected earlier)' }[J.exp], J.ok ? 'Accepted · role ' + T.role : 'Rejected', J.ok ? 'None' : why[J.sig === 'match' ? 'expired' : J.sig]];
    sum.push('The header and the payload are written in base64url, so they can be read and changed without a key. That is why you do not put things like passwords in a token.');
    if (J.ok && J.exp === 'valid') sum.push('That decode returned a Jwt without an exception means that the signature is the same as one made with the server\'s key and the token has not expired. From then on, you trust the values taken out with getSubject() and getClaimAsString("role").');
    if (J.exp === 'grace') sum.push('The default NimbusJwtDecoder (JwtTimestampValidator) allows a clock skew of 60 seconds: it accepts a token up to 60 seconds after exp and rejects it from the 61st second. To change the margin, create a validator such as new JwtTimestampValidator(Duration.ofSeconds(10)), combine it with JwtValidators.createDefaultWithValidators, and pass it to setJwtValidator of NimbusJwtDecoder.');
    if (J.exp === 'expired') sum.push('Even a token with a matching signature gets JwtValidationException once it is past the 60 second clock skew after exp. This exception inherits from BadJwtException, so to catch the two separately, you write JwtValidationException first. After a token is issued, it is hard for the server to take it back, so a short expiration time reduces the time during which a leaked token can do damage.');
    if (J.sig === 'mismatch') sum.push(c.tok === 'payload' ? 'If you change even one character of the contents, the signature that is recalculated changes. The signature matches only these exact contents.' : 'Even if you make a new signature and attach it, it differs from the value the server calculates unless it was made with the server\'s key. The safety of this method (HS256) depends on the server\'s key not leaking.');
    if (J.sig === 'mismatch' && c.time !== 'before') sum.push('The token was rejected at the signature, so the expiration time was not even checked. The result is the same if you change the time.');
    if (J.sig === 'alg') sum.push('The algorithm used for verification is set when the decoder is built (withSecretKey uses HS256). The alg in the header is text that anyone can change, so verification code that follows that value and skips the signature check lets a token without a signature pass. NimbusJwtDecoder does not accept a token without a signature.');
    if (!std) sum.push('The code written by hand also calculated the same values and made the same decision as the decoder. This is to show that this is what the decoder does. A real server uses a JwtDecoder, which also handles cases such as format errors, key length, other algorithms, and the typ check.');
    return { events: ev, summary: sum, tk: T, std: std, row: row };
  },
  render: function (v, sim, t, H, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : null, T = sim.tk;
    if (!s) { H.text(v, 'Click Run to take the token apart one part at a time and verify it.'); return; }
    H.table(v, ['Part', 'Text in the token', 'Decoded content'], [
      { cells: ['Header', s.split ? T.part[0] : '', { v: s.header || (s.split ? 'Not decoded yet' : ''), cls: s.header && T.alg === 'none' ? 'bad' : '' }] },
      { cells: ['Payload', s.split ? T.part[1] : '', { v: s.payload || (s.split ? 'Not decoded yet' : ''), cls: s.payload && T.role === 'ADMIN' ? 'bad' : '' }] },
      { cells: ['Signature', s.split ? (T.part[2] || '(empty)') : '', s.calc ? 'Value the server recalculated: ' + s.calc : 'Not text that can be decoded (a calculated value)'] },
    ], s.split ? 'Token split into three parts' : 'Received token (not split yet)');
  },
  // Diagram: the top three rows are the three parts of the token (the text and the decoded content), and the bottom shows the three checks the decoder makes in order and the result of decode.
  draw: function (P, sim, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : { split: false, header: '', payload: '', alg: '', sig: '', calc: '', exp: '', res: '' }, T = sim.tk, n = shown.length, tot = sim.events.length, std = sim.std;
    P.size(680, 346);
    var cur = function (on) { return on ? ' now' : ''; };
    P.box('p0', 16, 12, 648, 62, { cls: (s.header ? (T.alg === 'none' ? 'bad' : 'wait') : 'ghost') + cur(n === 2), title: 'First part: header', sub: [T.part[0], s.header ? 'Decoded  ' + s.header : 'Not decoded yet'], mono: true });
    P.box('p1', 16, 80, 648, 62, { cls: (s.payload ? (T.role === 'ADMIN' ? 'hot' : 'wait') : s.split ? 'plain' : 'ghost') + cur(n === 3), title: 'Second part: payload', sub: [T.part[1], s.payload ? 'Decoded  ' + s.payload : 'Not decoded yet'], mono: true });
    P.box('p2', 16, 148, 648, 62, { cls: s.sig === 'match' ? 'good' : s.sig === 'mismatch' ? 'bad' : s.split ? (T.part[2] ? 'plain' : 'ghost') : 'ghost', title: 'Third part: signature', sub: [T.part[2] || '(empty)', s.calc ? 'Recalculated by the server  ' + s.calc : 'Recalculated by the server  none yet'], mono: true });
    P.box('c1', 16, 224, 210, 54, { cls: (s.alg === 'ok' ? 'good' : s.alg === 'reject' ? 'bad' : 'ghost') + cur(n === 4), title: '1. Algorithm', sub: { '': 'Not checked yet', ok: 'HS256 (set by the server)', reject: 'none is not accepted' }[s.alg] });
    P.box('c2', 235, 224, 210, 54, { cls: s.sig === 'match' ? 'good' : s.sig === 'mismatch' ? 'bad' : 'ghost', title: '2. Signature', sub: { '': s.calc ? 'Recalculated, not compared' : s.alg === 'reject' ? 'Not checked' : 'Not checked yet', match: 'Matches recalculated value', mismatch: 'Differs from recalculated' }[s.sig] });
    P.box('c3', 454, 224, 210, 54, { cls: s.exp === 'valid' ? 'good' : s.exp === 'grace' ? 'hot' : s.exp === 'expired' ? 'bad' : 'ghost', title: '3. Expiration (60s skew)', sub: { '': s.res ? 'Not checked' : 'Not checked yet', valid: 'Before expiration: valid', grace: '30s past, within skew', expired: 'Past the skew too' }[s.exp] });
    P.arrow('a1', 'c1:r', 'c2:l', { cls: s.alg === 'ok' ? '' : 'mut' });
    P.arrow('a2', 'c2:r', 'c3:l', { cls: s.sig === 'match' ? '' : 'mut' });
    P.box('res', 16, 292, 648, 38, { cls: (s.res === 'accept' ? 'good' : s.res === 'reject' ? 'plain' : 'ghost') + cur(n === tot && n > 0), title: std ? 'Result of decode' : 'Result of check', right: s.res === 'accept' ? (std ? 'Returns Jwt · member 7, role ' + T.role : 'true') : s.res === 'reject' ? (std ? 'Throws ' + sim.row[3].replace(/ \(.*$/, '') : 'false') : 'Verifying' });
    P.note('The top three rows are the three parts of the token. The server trusts the contents only after the token passes all three checks below, in order. A red box marks the place where the token was rejected, and a yellow box marks something to look at (the changed contents, and the expiration check that passed thanks to the 60 second skew).');
  },
  assume: 'The token text and the signature values on the screen were each actually created in our test run with javax.crypto.Mac (HmacSHA256) of JDK 21 and with crypto of Node.js 24, and I confirmed that the same values come out. spring-security-oauth2-jose and nimbus-jose-jwt were not in the test environment, so NimbusJwtDecoder itself was not run. Instead, the order that decode goes through and the exception names and messages were copied from the official source (NimbusJwtDecoder, JwtValidators, and JwtTimestampValidator of Spring Security 7.1.1, and JWTParser, PlainJWT, and DefaultJWTProcessor of nimbus-jose-jwt 10.9.1, which it uses), and whether the signature matches was actually calculated with Mac to produce the results of 12 cases. The expiration margin was calculated exactly as the condition in the source (the token is rejected if the time 60 seconds before now is after exp), and I confirmed that a token passes up to 60 seconds after exp and is rejected from 61 seconds after. JwtTimestampValidator measures with the system clock, so the verification times on the screen are values chosen for this lab (the clock can be fixed with setClock). The standard code on the screen was confirmed to compile with javac together with a stand-in that copies only the official signatures, and the code of "What the decoder does inside" was run as it is on JDK 21 and gave the same results as the decisions on the screen. The standards behind this are as follows. The shape of three parts joined by dots and the base64url notation are in RFC 7515 Section 3 and Section 2, that the signature is calculated over "first part.second part" is in RFC 7515 Section 5.1, the meaning of exp and that a clock skew can be allowed are in RFC 7519 Section 4.1.4, the shape of a token whose alg is none and whose signature is empty is in RFC 7519 Section 6.1, and the recommendation that the server set the algorithms it accepts is in RFC 8725 Section 3.1. A real server may also add validators so that other claims such as iss and aud are checked. The keys and tokens on the screen are values made for this lab. A server that uses a public-key algorithm (RS256) and the attack on it are not covered.',
});

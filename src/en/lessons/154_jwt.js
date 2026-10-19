Lab.register({
  id: 'jwt', nav: 'JWT structure and verification', cat: 'Authentication', mode: 'step',
  title: 'How does the server trust a token that anyone can read?',
  intro: 'A JWT is a string made of three parts joined by dots (.): a header, a payload, and a signature. The first two parts are not encrypted. They are only written in a different notation, so anyone can read and change them. The server can still trust the token because it recalculates the third part, the signature, by itself.',
  terms: ['JSON Web Token (JWT)', 'Base64url encoding', 'Claim', 'HMAC and digital signatures', 'Algorithm verification'],
  controls: [
    { id: 'tok', label: 'The token that arrived at the server', type: 'select', value: 'payload', options: [['ok', 'Exactly as the server issued it'], ['payload', 'The role in the payload changed to ADMIN (signature left as is)'], ['otherkey', 'Payload changed, and a new signature made with a different key'], ['none', 'The alg in the header changed to none and the signature left empty']] },
    { id: 'time', label: 'When the server verifies', type: 'select', value: 'before', options: [['before', '10 minutes before expiration (exp)'], ['after', '1 minute after expiration (exp)']] },
    { id: 'policy', label: 'How the server decides the verification algorithm', type: 'select', value: 'fixed', options: [['fixed', 'The server sets it to HS256 in advance'], ['trust', 'The server follows the alg written in the token header']], hint: 'The difference between the two shows up with a token whose alg was changed to none.' },
  ],
  presets: [
    { t: 'Default settings', q: 'What does the server decide when a token with the role changed to ADMIN and the signature left as is arrives 10 minutes before expiration (exp)?', d: 'This is a token whose role in the payload was changed to ADMIN. Anyone can read and change it, but it gets caught at the signature.', v: { tok: 'payload', time: 'before', policy: 'fixed' } },
    { t: 'Exactly as issued', q: 'What if the token arrives exactly as the server issued it?', d: 'The signature matches and the token has not expired, so it passes.', v: { tok: 'ok', time: 'before', policy: 'fixed' } },
    { t: 'If a new signature is made with a different key', q: 'What if the payload was changed and a new signature was made with a different key?', d: 'It differs from the value calculated with the server\'s key, so it is rejected.', v: { tok: 'otherkey', time: 'before', policy: 'fixed' } },
    { t: 'After the expiration time', q: 'What if the server verifies a token exactly as issued 1 minute after expiration (exp)?', d: 'It is rejected even though the signature is correct.', v: { tok: 'ok', time: 'after', policy: 'fixed' } },
    { t: 'A token with alg changed to none', q: 'What if the alg in the header is changed to none and the signature is left empty?', d: 'A server that has fixed the algorithm rejects it before even looking at the signature.', v: { tok: 'none', time: 'before', policy: 'fixed' } },
    { t: 'A server that trusts the alg the token states', q: 'What if that token arrives and the server follows the alg written in the token header?', d: 'The token with no signature passes as ADMIN.', v: { tok: 'none', time: 'before', policy: 'trust' } },
  ],
  // Values that were actually calculated (verify/net/jwt_probe.js and verify/plain/JwtProbe.java produce the same values)
  V: {
    hHs: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9', hNone: 'eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0',
    pUser: 'eyJzdWIiOiI3Iiwicm9sZSI6IlVTRVIiLCJleHAiOjE3NjcyMjU2MDB9', pAdmin: 'eyJzdWIiOiI3Iiwicm9sZSI6IkFETUlOIiwiZXhwIjoxNzY3MjI1NjAwfQ',
    sOk: '5hho4Bt2LLsypoE43dqORdbPqUDkMlzinRCY-zDKmMc', sAdmin: '_Crl3waja45Oj0WU2YHqH-bAhgouCo5PsGQEAgYkIuQ', sOther: 'qmZRR9KJgyn1QAoptqhfdyZ5pV0I2gPLAaszvAlaFJ8',
    jHs: '{"alg":"HS256","typ":"JWT"}', jNone: '{"alg":"none","typ":"JWT"}', jUser: '{"sub":"7","role":"USER","exp":1767225600}', jAdmin: '{"sub":"7","role":"ADMIN","exp":1767225600}',
    exp: 1767225600, now: { before: 1767225000, after: 1767225660 },
  },
  // The three parts of the token for the settings, and the decoded content
  token: function (c) {
    var V = this.V, none = c.tok === 'none', admin = c.tok !== 'ok';
    var p = [none ? V.hNone : V.hHs, admin ? V.pAdmin : V.pUser, c.tok === 'ok' || c.tok === 'payload' ? V.sOk : c.tok === 'otherkey' ? V.sOther : ''];
    return { part: p, text: p.join('.'), header: none ? V.jNone : V.jHs, payload: admin ? V.jAdmin : V.jUser, alg: none ? 'none' : 'HS256', role: admin ? 'ADMIN' : 'USER', expect: admin ? V.sAdmin : V.sOk };
  },
  code: function (c) {
    var T = this.token(c), V = this.V;
    var head = '// Request header  Authorization: Bearer <token>\n// Token  ' + T.part[0] + '\n//       .' + T.part[1] + '\n//       .' + (T.part[2] || '(empty)') + '\n// Now  now = ' + V.now[c.time] + '   (exp = ' + V.exp + ')\n\n';
    var open = 'Claims verify(String token, long now) throws Exception {\n    String[] part = token.split("\\\\.", -1);                 // header . payload . signature\n    if (part.length != 3) throw new BadTokenException("invalid format");\n    Base64.Decoder dec = Base64.getUrlDecoder();\n    String header  = new String(dec.decode(part[0]), UTF_8);   // decodes without a key\n    String payload = new String(dec.decode(part[1]), UTF_8);   // decodes without a key\n\n';
    var sig = function (pad) { return pad + '// 2. Signature: the server recalculates it from the first two parts and compares\n' + pad + 'Mac mac = Mac.getInstance("HmacSHA256");\n' + pad + 'mac.init(new SecretKeySpec(serverKey, "HmacSHA256"));  // a key only the server knows\n' + pad + 'byte[] expected = mac.doFinal((part[0] + "." + part[1]).getBytes(US_ASCII));\n' + pad + 'if (!MessageDigest.isEqual(expected, dec.decode(part[2])))\n' + pad + '    throw new BadTokenException("signature mismatch");\n'; };
    var alg = c.policy === 'fixed'
      ? '    // 1. Algorithm: accept only HS256, which the server has set\n    if (!"HS256".equals(field(header, "alg")))\n        throw new BadTokenException("algorithm not allowed");\n\n' + sig('    ')
      : '    // 1. Algorithm: follow what the token header says (a dangerous approach)\n    String alg = field(header, "alg");\n    if (alg.equals("HS256")) {\n' + sig('        ') + '    } else if (alg.equals("none")) {\n        // treat it as a token without a signature and skip the signature check\n    } else {\n        throw new BadTokenException("algorithm not allowed");\n    }\n';
    var tail = '\n    // 3. Expiration: the current time must be before exp\n    if (now >= Long.parseLong(field(payload, "exp")))\n        throw new BadTokenException("expired");\n    return new Claims(field(payload, "sub"), field(payload, "role"));   // the payload is trusted only after reaching this point\n}\n\n// Claims, BadTokenException, and field(json, name) are a class, an exception, and a method made for this example.\n// field is a helper that pulls one value out of the JSON.\n// This code is written by hand to show the principle. A real service uses a well-tested JWT library.';
    return head + open + alg + tail;
  },
  label: function (c) { return { ok: 'Exactly as issued', payload: 'Payload changed', otherkey: 'Signed with another key', none: 'alg none' }[c.tok] + ' · ' + (c.time === 'before' ? 'Before expiration' : 'After expiration') + ' · ' + (c.policy === 'fixed' ? 'Server sets alg' : 'Follows the token\'s alg'); },
  columns: ['Signature check', 'Expiration check', 'Server\'s decision', 'Role the server trusted'],
  // Only the result of the verification procedure is calculated (the part checked against real execution)
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
    push({ ok: 'The token the server handed out at login arrived unchanged in the Authorization header of the request. When it issued the token, the server wrote member number 7, the role USER, and an expiration time into it, and attached a signature made with its own key.',
      payload: 'Someone changed the middle part of the token before sending it. They rewrote the role from USER to ADMIN and left the original signature at the end as it was.',
      otherkey: 'Someone changed the role in the token to ADMIN. They do not know the server\'s key, so they calculated a new signature with another key they hold and attached it.',
      none: 'Someone changed the alg in the header to none (no signature), changed the role to ADMIN, and sent the token with the signature part empty. That is why the token ends with a dot.' }[c.tok], c.tok === 'ok' ? '' : 'bad');
    st.split = true;
    push('token.split("\\\\."): the server cuts the token at the dots (.) into three parts. The first is the header, the second is the payload, and the third is the signature.' + (T.part[2] ? '' : ' The third part of this token is empty.'));
    st.header = T.header;
    push('dec.decode(part[0]): the server decodes the first part with a Base64url decoder. No key is needed. The result is ' + T.header + '. The alg is what the token says about itself: "this token was signed with this algorithm."', T.alg === 'none' ? 'bad' : '');
    st.payload = T.payload;
    push('dec.decode(part[1]): the server decodes the second part the same way. The result is ' + T.payload + '. It is not encrypted, only written in a different notation, so anyone who gets hold of the token can read it. The signature has not been checked yet, so the server does not trust this content.', T.role === 'ADMIN' ? 'bad' : '');
    if (c.policy === 'fixed') {
      st.alg = T.alg === 'HS256' ? 'ok' : 'reject';
      push('Algorithm check: this server has decided to accept only HS256. The alg in the header is ' + T.alg + (T.alg === 'HS256' ? ', so it moves on to the next check.' : ', so it rejects the token here. There is no need to even look at the signature or the expiration time.'), T.alg === 'HS256' ? '' : 'good');
    } else {
      st.alg = T.alg === 'HS256' ? 'ok' : 'follow';
      push('Algorithm check: this server verifies with the method written in the alg of the header. ' + (T.alg === 'HS256' ? 'It says HS256, so the server goes on to check the signature with HMAC-SHA256.' : 'It says none, so the server treats the token as a token without a signature and skips the signature check. The token that is being verified has, in effect, chosen how it is verified.'), T.alg === 'HS256' ? '' : 'bad');
    }
    if (J.sig === 'match' || J.sig === 'mismatch') {
      st.calc = T.expect;
      push('mac.doFinal(part[0] + "." + part[1]): the server recalculates the signature from the first two parts of the received token and the key only the server knows. The result is ' + short(T.expect) + '. The server does not trust the signature that came with the token. It builds one itself.');
      st.sig = J.sig;
      if (J.sig === 'match') push('MessageDigest.isEqual: it compares the recalculated value with the third part of the token (' + short(T.part[2]) + '). They are the same. This means the header and the payload have not changed by a single character since the server issued the token.', 'good');
      else if (c.tok === 'payload') push('MessageDigest.isEqual: it compares the recalculated value (' + short(T.expect) + ') with the third part of the token (' + short(T.part[2]) + '). They differ. The attached signature was made from the contents before the change, so it does not match the value calculated from the changed contents. The server rejects the token as a "signature mismatch".', 'good');
      else push('MessageDigest.isEqual: it compares the recalculated value (' + short(T.expect) + ') with the third part of the token (' + short(T.part[2]) + '). They differ. The attached signature was made with a different key, so it does not match the value calculated with the server\'s key. Without the server\'s key, no one can make a matching signature. The server rejects the token as a "signature mismatch".', 'good');
    } else st.sig = J.sig;
    if (J.exp !== 'skip') {
      st.exp = J.exp;
      push('Expiration check: the exp in the payload is ' + V.exp + ' (2026-01-01 00:00:00 UTC), and the current time is ' + V.now[c.time] + ' (' + nowText + '). ' + (J.exp === 'valid' ? 'The current time is before exp, so the token is still valid.' : 'The current time is after exp, so the server rejects the token as "expired".' + (J.sig === 'match' ? ' Even if the signature matches, an expired token is not accepted.' : '')), J.exp === 'valid' ? '' : J.sig === 'none' ? '' : 'bad');
    }
    st.res = J.ok ? 'accept' : 'reject';
    if (J.ok && J.sig === 'match') push('Verification passed: the token passed all three checks, so the server now trusts the payload. Without looking anything up in a store, it handles this request as a request from member 7 with the role USER.', 'good');
    else if (J.ok) push('Verification passed: the server trusts the payload of a token that has no signature and handles this request as a request from member 7 with the role ADMIN. A token that anyone could make without knowing the server\'s key got through.', 'bad');
    else push('Rejected: the server does not use the contents of the token and rejects the request. It usually answers with 401 Unauthorized.', c.tok === 'ok' ? '' : 'good');
    var row = [{ match: 'Match', mismatch: 'Mismatch', none: 'Skipped (alg is none)', alg: 'Not done (rejected at alg)' }[J.sig], { valid: 'Before expiration', expired: 'Expired', skip: 'Not done (rejected earlier)' }[J.exp], J.ok ? 'Accepted' : 'Rejected', J.ok ? T.role : 'None'];
    sum.push('The header and the payload are written in base64url, so they can be read and changed without a key. That is why you do not put things like passwords in a token.');
    if (J.sig === 'match' && J.ok) sum.push('The server does not trust the signature that came with the token. It recalculates the signature from the first two parts and its own key and compares. A matching value means the contents have not changed since the token was issued.');
    if (J.sig === 'match' && !J.ok) sum.push('Even a token with a matching signature is rejected once exp has passed. After a token is issued, it is hard for the server to take it back, so a short expiration time reduces the time during which a leaked token can do damage.');
    if (J.sig === 'mismatch') sum.push(c.tok === 'payload' ? 'If you change even one character of the contents, the signature the server recalculates changes. The signature matches only these exact contents.' : 'Even if you make a new signature and attach it, it differs from the value the server calculates unless it was made with the server\'s key. The safety of this method (HS256) depends on the server\'s key not leaking.');
    if (J.sig === 'mismatch' && c.time === 'after') sum.push('The token was rejected at the signature, so the expiration time was not even checked. The result is the same if you change the time.');
    if (J.sig === 'alg') sum.push('The server decides the algorithm used for verification. The alg in the header is text that anyone can change, so if it differs from what the server has set, the server rejects the token before even looking at the signature.');
    if (J.sig === 'none') sum.push('A server that simply follows the alg in the header skips the signature check when the sender chooses "no signature".' + (J.ok ? ' As a result, a token with no signature passed with the ADMIN role.' : ' This time it was rejected only because of the expiration time. Before expiration it would pass.'));
    if (c.tok !== 'none' && c.policy === 'trust') sum.push('The alg of this token is HS256, so the two ways of deciding the algorithm give the same result. The difference shows up with a token whose alg was changed to none.');
    return { events: ev, summary: sum, tk: T, row: row };
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
  // Diagram: the top three rows are the three parts of the token (the text and the decoded content), and the bottom shows the three checks the server makes in order and the final decision.
  draw: function (P, sim, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : { split: false, header: '', payload: '', alg: '', sig: '', calc: '', exp: '', res: '' }, T = sim.tk, n = shown.length, tot = sim.events.length;
    P.size(680, 346);
    var cur = function (on) { return on ? ' now' : ''; };
    P.box('p0', 16, 12, 648, 62, { cls: (s.header ? (T.alg === 'none' ? 'bad' : 'wait') : s.split ? 'plain' : 'ghost') + cur(n === 3), title: 'First part: header', sub: [T.part[0], s.header ? 'Decoded  ' + s.header : 'Not decoded yet'], mono: true });
    P.box('p1', 16, 80, 648, 62, { cls: (s.payload ? (T.role === 'ADMIN' ? 'hot' : 'wait') : s.split ? 'plain' : 'ghost') + cur(n === 4), title: 'Second part: payload', sub: [T.part[1], s.payload ? 'Decoded  ' + s.payload : 'Not decoded yet'], mono: true });
    P.box('p2', 16, 148, 648, 62, { cls: s.sig === 'match' ? 'good' : s.sig === 'mismatch' ? 'bad' : !T.part[2] && s.split ? 'ghost' : s.split ? 'plain' : 'ghost', title: 'Third part: signature', sub: [T.part[2] || '(empty)', s.calc ? 'Recalculated by the server  ' + s.calc : 'Recalculated by the server  none yet'], mono: true });
    P.box('c1', 16, 224, 210, 54, { cls: (s.alg === 'ok' ? 'good' : s.alg === 'reject' ? 'bad' : s.alg === 'follow' ? 'hot' : 'ghost') + cur(n === 5), title: '1. Algorithm', sub: { '': 'Not checked yet', ok: 'Verified with HS256', reject: 'none is not accepted', follow: 'Follows the token\'s none' }[s.alg] });
    P.box('c2', 235, 224, 210, 54, { cls: s.sig === 'match' ? 'good' : s.sig === 'mismatch' ? 'bad' : s.sig === 'none' ? 'hot' : 'ghost', title: '2. Signature', sub: { '': s.calc ? 'Recalculated, not compared' : 'Not checked yet', match: 'Matches recalculated value', mismatch: 'Differs from recalculated', none: 'Skipped without checking', alg: 'Not checked' }[s.sig] });
    P.box('c3', 454, 224, 210, 54, { cls: s.exp === 'valid' ? 'good' : s.exp === 'expired' ? 'bad' : 'ghost', title: '3. Expiration time', sub: { '': s.res ? 'Not checked' : 'Not checked yet', valid: 'Before expiration: valid', expired: 'Past the expiration time' }[s.exp] });
    P.arrow('a1', 'c1:r', 'c2:l', { cls: s.alg === 'ok' || s.alg === 'follow' ? '' : 'mut' });
    P.arrow('a2', 'c2:r', 'c3:l', { cls: s.sig === 'match' || s.sig === 'none' ? '' : 'mut' });
    P.box('res', 16, 292, 648, 38, { cls: (s.res === 'accept' ? (s.sig === 'none' ? 'bad' : 'good') : s.res === 'reject' ? 'plain' : 'ghost') + cur(n === tot && n > 0), title: 'Server\'s decision', right: s.res === 'accept' ? 'Accepted · member 7 handled as ' + T.role : s.res === 'reject' ? 'Rejected · token contents not used' : 'Verifying' });
    P.note('The top three rows are the three parts of the token. The server trusts the contents only after the token passes all three checks below, in order. A red box marks the place where the token was rejected.');
  },
  assume: 'The token text, the signature values, and the verification results of all 16 combinations on the screen were checked against the results of actually creating and verifying tokens with crypto (HMAC-SHA256) in Node.js 24 in our test run. The Java code on the screen was also run as is on JDK 21, and the same tokens and the same results came out. No JWT library was used in the test environment, so the verification procedure was run with code written by hand from the standard documents. The basis is as follows. The shape of three parts joined by dots and the base64url notation are in RFC 7515 Section 3 and Section 2, that the signature is calculated over "first part.second part" is in RFC 7515 Section 5.1, the order of verification is in RFC 7515 Section 5.2 and RFC 7519 Section 7.2, that the current time must be before exp is in RFC 7519 Section 4.1.4, and the shape of a token whose alg is none and whose signature is empty is in RFC 7519 Section 6.1. When the current time is exactly equal to exp, the token is rejected (checked by running it). That the server should set the algorithms it accepts is the recommendation of RFC 8725 Section 3.1, and that widely used JWT libraries reject none by default was not verified by execution. A real server may allow a margin of a few seconds to a few minutes on exp to allow for clock skew (RFC 7519 Section 4.1.4 allows this), and it also checks other claims such as iss and aud. The keys and tokens on the screen are values made for this lab. The problem of sending a token with alg changed to HS256 to a server that uses a public-key algorithm (RS256) is not covered.',
});

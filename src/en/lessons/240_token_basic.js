Lab.register({
  id: 'token_basic', nav: 'Tokens', cat: 'Fundamentals', mode: 'step', basic: true, deep: ['jwt'],
  title: 'What is a token, and what does the server look at to trust it?',
  why: 'In the session approach, the login record exists only on the server that holds it, so when you increase the number of servers, extra preparation is needed so that a request going to any server finds the same record. A token sends "who the user is" together with a signature that vouches for it with every request, so any server that has the key to verify the signature checks it on the spot, without asking anywhere else.',
  use: 'It is commonly used for login checks when a mobile app or the JavaScript screens of a browser call the API of a Spring server. It is also used to make several servers trust together a token received once in a system divided into several services. A token that has been issued is hard for the server to revoke midway, so it is used together with a method of setting a short validity time and receiving a new token again.',
  intro: 'When a login succeeds, the server writes down "this person is kim" as text, attaches a signature calculated with a secret key that only the server knows, and gives it to the client. This text is called a token, and the most common format is the JWT. A token is three pieces joined by dots (.): the header, the payload, and the signature. The client holds the token and sends it in the Authorization: Bearer token header with every request. The server does not keep a separate list of logged-in people. Instead, it recalculates the signature from the header and the payload of the token it received, and checks whether it is the same as the signature that came with the token. If it is the same, the server trusts that the token was made by the server and has not been changed, and reads the payload. In this lab, you change the payload of the token, remove the signature, sign with a different key, or take the token away, and also make the server skip the signature check, and you see whom the server trusts and what response it gives. The code panel shows the request the client sends and the token decoded, and it is not Java code. The signature is long, so it is written as (signature). The server in this lab is built to answer a GET /me request with "Hello, user name", and its server code is not shown on the screen.',
  terms: ['Token authentication', 'JSON Web Token (JWT)', 'Signature (token)', 'Authorization: Bearer'],
  controls: [
    { id: 'token', label: 'Token the client sends', type: 'select', value: 'good', options: [['good', 'Send the token the server gave, as it is'], ['edited', 'Change kim to admin in the payload and send it (the signature stays)'], ['nosig', 'Remove the signature and send it'], ['otherkey', 'Sign with a different key and send it (the payload is admin)'], ['none', 'Send without a token']] },
    { id: 'check', label: 'The server verifies the signature', type: 'check', value: true },
  ],
  // q is the question shown on the question-style screen. t and d are the name and the description used in the text-only reading
  presets: [
    { t: 'Default settings', q: 'What does a token look like, and what does the server check in the token it receives?', d: 'The token the server gave, as it is. The server recalculates the signature, sees that it matches, and trusts the payload (kim).', v: { token: 'good', check: true } },
    { t: 'Changing the payload to admin', q: 'What if you change the payload of the token from kim to admin?', d: 'You can read and change the payload, but the recalculated signature differs from the signature that came with the token, so the result is 401.', v: { token: 'edited', check: true } },
    { t: 'Removing the signature', q: 'What if you remove the signature?', d: 'There is no signature to compare with, so the result is 401.', v: { token: 'nosig', check: true } },
    { t: 'Signing with a different key', q: 'What if you sign with a different key?', d: 'It differs from the value calculated with the server\'s key, so the result is 401.', v: { token: 'otherkey', check: true } },
    { t: 'The server does not verify the signature', q: 'What if the server does not verify the signature and a token with a changed payload arrives?', d: 'The server does not look at the signature, so the changed payload (admin) gets through as it is.', v: { token: 'edited', check: false } },
    { t: 'Requesting without a token', q: 'What if you send a request without a token?', d: 'There is no token to read, so the server cannot know who it is, and the result is 401.', v: { token: 'none', check: true } },
  ],
  // Values from the actual calculation (the same values as the tokens made by verify/net/token_basic_probe.js, which the English run verify/en/token_basic_en_probe.js reproduced. cmp compares them)
  V: {
    hdr: 'eyJhbGciOiJIUzI1NiJ9', hdrJson: '{"alg":"HS256"}',
    pKim: 'eyJ1c2VyIjoia2ltIn0', pAdmin: 'eyJ1c2VyIjoiYWRtaW4ifQ', jKim: '{"user":"kim"}', jAdmin: '{"user":"admin"}',
    sGood: 'jzV9172X5ouTjI0iT6vIB97B7M9nYxcJxmInkhxTkSg', sOther: '0WL9HiP_a-1P71E5dbCJJ7Mrzsv92FFU-eKfuehCCCE', sAdminByServer: 'fv3hkCU04f2PAIslv9QYiJIT9QS8ioSwBnQCk0nuFwg',
  },
  // The token for each setting: the second piece (payload), the signature, the decoded payload, the signature line in the code panel, and the value the server recalculates from that payload
  tok: function (name) {
    var V = this.V;
    return {
      good: { pay: V.pKim, sig: V.sGood, json: V.jKim, who: 'kim', sigLine: '(value calculated from the header and payload with the server\'s secret key)', note: 'Unchanged', expect: V.sGood },
      edited: { pay: V.pAdmin, sig: V.sGood, json: V.jAdmin, who: 'admin', sigLine: '(value calculated from the payload before the change, left as it is)', note: 'Unchanged', expect: V.sAdminByServer },
      nosig: { pay: V.pKim, sig: '', json: V.jKim, who: 'kim', sigLine: '(empty)', note: 'Removed', expect: V.sGood },
      otherkey: { pay: V.pAdmin, sig: V.sOther, json: V.jAdmin, who: 'admin', sigLine: '(value calculated from the header and payload with a different key)', note: 'Other key', expect: V.sAdminByServer },
      none: null,
    }[name];
  },
  code: function (c) {
    var T = this.tok(c.token), V = this.V, out = ['GET /me HTTP/1.1'];
    if (T) {
      out.push('Authorization: Bearer ' + V.hdr + '.' + T.pay + '.' + (T.sig ? '(signature)' : ''));
      out.push('', '# Split the token at the dots (.) and decode it', 'header: ' + V.hdrJson, 'payload: ' + T.json, 'signature: ' + T.sigLine);
    }
    out.push('', '# Server', 'signature check: ' + (c.check ? 'yes' : 'no'));
    return out.join('\n');
  },
  label: function (c) { return { good: 'Token the server gave, as it is', edited: 'Payload changed to admin', nosig: 'Signature removed', otherkey: 'Signed with a different key', none: 'No token' }[c.token] + ' · ' + (c.check ? 'server verifies the signature' : 'server does not verify the signature'); },
  columns: ['Server signature check', 'User the server trusted', 'Response'],
  // Only the server's decision is calculated (the part that is checked against real execution)
  judge: function (c) {
    var T = this.tok(c.token);
    if (!T) return { verify: 'No token', user: 'None', resp: '401' };
    if (!c.check) return { verify: 'Not done', user: T.who, resp: '200 Hello, ' + T.who };
    if (!T.sig) return { verify: 'No signature', user: 'None', resp: '401' };
    if (T.sig === T.expect) return { verify: 'Match', user: T.who, resp: '200 Hello, ' + T.who };
    return { verify: 'No match', user: 'None', resp: '401' };
  },
  simulate: function (c) {
    var T = this.tok(c.token), V = this.V, J = this.judge(c), ev = [], sum = [], ok = J.resp !== '401', fooled = ok && T && T.who === 'admin';
    var st = { sent: false, split: false, calc: '', cmp: '', user: '', resp: '', recv: false };
    function push(s, k) { ev.push({ s: s, k: k || '', snap: JSON.parse(JSON.stringify(st)) }); }
    function short(s) { return s.slice(0, 8) + '…'; }
    var tail = ' The client receives a ' + J.resp.split(' ')[0] + ' response.' + (ok ? ' The body is "Hello, ' + T.who + '".' : '');
    // Step 1: send the request
    st.sent = true;
    push({
      good: 'The client sends a GET /me request to the server. The Authorization header carries the token after Bearer. The server made this token when the login succeeded, and the client keeps it as it is and attaches it to the request.',
      edited: 'The client sends a GET /me request to the server. The token in the Authorization header is the token the server gave, with the payload changed. The payload was changed from kim to admin, and the signature part is as the server gave it.',
      nosig: 'The client sends a GET /me request to the server. The signature part was removed from the token in the Authorization header. The dot (.) is left, so the token has the form "header.payload." and the place for the signature is empty.',
      otherkey: 'The client sends a GET /me request to the server. The token in the Authorization header has the payload changed to admin, and it has a signature calculated with a different key that the client has, because the client does not know the server\'s secret key.',
      none: 'The client sends a GET /me request to the server. This time there is no Authorization header. The client did not send a token.',
    }[c.token], T && c.token !== 'good' ? 'bad' : '');
    if (!T) {
      // There is no token
      st.user = J.user; st.resp = J.resp; st.cmp = c.check ? '' : 'skipped';
      push('The server looks for the Authorization header in the request. There is no header, so there is no token to read, and the server cannot know who sent this request. ' + (c.check ? 'There is no signature to verify either.' : 'This server does not verify signatures, but it is the same in that there is no payload to read.') + ' The server returns a 401 response. The server keeps no list of logged-in people, so it has nowhere to look up whether this request came from someone who logged in before.', 'bad');
      st.recv = true;
      push('The client receives a 401 response.', 'bad');
      sum.push('If you send a request without a token, the server cannot know whose request it is and answers 401. It is the same whether or not it verifies the signature.');
      sum.push('With tokens, the request must carry who it is by itself. The server keeps no list of logged-in people, so it has no means to recognize a request that has no token.');
      return { events: ev, summary: sum, tk: T, row: [J.verify, J.user, J.resp] };
    }
    // Step 2: split the token at the dots
    st.split = true;
    push('The server takes the token from the Authorization header and splits it at the dots (.). From the front, they are the header, the payload, and the signature.' + (T.sig ? '' : ' This token has an empty place for the signature.') + ' The header and the payload are not encrypted. They are text written in a notation called base64url, so even without a key, if you decode them, the header reads as ' + V.hdrJson + ' and the payload as ' + T.json + '. Being able to read it does not mean you trust it.', '');
    if (!c.check) {
      // A server that does not verify the signature
      st.cmp = 'skipped';
      push('This server does not verify the signature (at the bottom of the code panel, "signature check: no"). It does not recalculate the signature with a key, and it does not look at the signature that came with the token. It reads only the payload part.' + (T.sig ? '' : ' Even if the place for the signature is empty, the server does not look at that place.') + ' The user written in the payload is ' + T.who + '.', fooled ? 'bad' : '');
      st.user = J.user; st.resp = J.resp;
      push('The server trusts ' + T.who + ', which is written in the payload, as it is, handles this request as a request from ' + T.who + ', and makes a 200 response.' + (fooled ? ' Nobody caught that the token was changed. If the server does not verify, anyone can write admin in the payload and send it.' : ' This token is the payload the server gave, so the result looks right, but it is not because the server verified it.'), fooled ? 'bad' : '');
      st.recv = true;
      push(tail.trim(), fooled ? 'bad' : '');
      if (fooled) {
        sum.push('If the server does not verify the signature, the admin in ' + (c.token === 'edited' ? 'the changed token' : 'the token signed with a different key') + ' gets through as it is. The server trusts the user written in the payload.');
        sum.push('The safety of a token does not come from the fact that a signature is attached. It comes from the fact that the server recalculates the signature and checks it.');
      } else if (c.token === 'nosig') {
        sum.push('If the server does not verify the signature, a token with the signature removed gets through too. This is because the server does not look at whether the place for the signature is empty.');
        sum.push('This time the payload is kim, so the result looks the same. But if you change the payload to admin and send it without a signature, it gets through the same way.');
      } else {
        sum.push('Even if the server does not verify the signature, the token the server gave gets through as kim. The result looks the same, but the server did not find out whether this token had been changed.');
        sum.push('The difference between a server that verifies the signature and one that does not shows when a changed token arrives.');
      }
      return { events: ev, summary: sum, tk: T, row: [J.verify, J.user, J.resp] };
    }
    if (!T.sig) {
      // The place for the signature is empty
      st.cmp = 'empty';
      push('The server looks at the place for the signature in the token. It is empty, so there is no signature to compare with the value it calculated. A token with no signature has no guarantee that the server made it, so the server does not trust this token.', 'bad');
      st.user = J.user; st.resp = J.resp;
      push('The server does not use the payload of the token and returns a 401 response. It is the same even if the user written in the payload is ' + T.who + '.', 'bad');
      st.recv = true;
      push(tail.trim(), 'bad');
      sum.push('If you remove the signature, the server has no signature to compare with, does not trust the token, and answers 401.');
      sum.push('The signature is a part that must be there. Accepting an empty place for the signature happens only when the server does not verify signatures.');
      return { events: ev, summary: sum, tk: T, row: [J.verify, J.user, J.resp] };
    }
    // Step 3: recalculate the signature
    st.calc = T.expect;
    push('The server recalculates the signature with its own secret key, using the header and the payload of the token it received. Only the server knows the key, and it was never given to the client. The calculated value is ' + short(T.expect) + '.' + (T.who === 'admin' ? ' It is the value calculated from the payload of the token whose payload was changed to admin.' : ''), '');
    // Step 4: compare
    var same = T.sig === T.expect;
    st.cmp = same ? 'same' : 'diff';
    if (same) push('The server compares the value it calculated (' + short(T.expect) + ') with the signature that came with the token (' + short(T.sig) + '). They are the same. This token has a signature calculated with the server\'s key, which means the header and the payload have not changed by even one character since the signature was made.', 'good');
    else if (c.token === 'edited') push('The server compares the value it calculated (' + short(T.expect) + ') with the signature that came with the token (' + short(T.sig) + '). They differ. The signature that came with it was calculated from the payload before it was changed (kim), and if the server calculates from the changed payload (admin), a different value comes out. The signature matches only when the payload is exactly as it was.', 'bad');
    else push('The server compares the value it calculated (' + short(T.expect) + ') with the signature that came with the token (' + short(T.sig) + '). They differ. The signature that came with it was calculated with a different key, so it differs from the value calculated with the server\'s key. The premise of a signature method is that a party that does not know the key cannot make a matching signature.', 'bad');
    // Step 5: trust or reject
    st.user = J.user; st.resp = J.resp;
    if (same) push('The signature matches, so the server trusts this token as one that it made and that has not been changed, and reads the payload. The user is ' + T.who + '. The server did not write anywhere that ' + T.who + ' logged in. That fact is written in the token, and the signature vouches for it. This server code has no list of logged-in people. The server handles this request as a request from ' + T.who + ' and makes a 200 response.', 'good');
    else push('The signature does not match, so the server does not use the payload of the token and returns a 401 response. Even if admin is written in the payload, it does not trust it.', 'bad');
    st.recv = true;
    push(tail.trim(), same ? 'good' : 'bad');
    if (same) {
      sum.push('A token is text that says "kim logged in" with a signature attached, calculated with the server\'s secret key. The server recalculates the signature from the header and the payload of the token it received, checks whether it is the same as the signature that came with it, and if it is the same, it trusts the payload.');
      sum.push('The server did not keep a separate list of logged-in people. This is different from a session, where the server writes it in its own storage and gives out only a number. The fact that it is kim is written in the token, and the signature vouches for it. Anyone can read the payload even without the key, so you do not write secrets in it.');
    } else if (c.token === 'edited') {
      sum.push('If you change the payload from kim to admin, the signature the server recalculates differs from the signature that came with the token, and the token is rejected with 401.');
      sum.push('Anyone can read the payload of a token and can change the characters, but the server does not accept a changed token. This is because the signature matches only when the payload is exactly as it was.');
    } else {
      sum.push('If you sign with a different key, it differs from the value the server calculates with its own key, and the token is rejected with 401.');
      sum.push('It is not enough that a signature is attached. It must be a signature calculated with the server\'s key. That is why only the server should know the key.');
    }
    return { events: ev, summary: sum, tk: T, row: [J.verify, J.user, J.resp] };
  },
  render: function (v, sim, t, H, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : null, T = sim.tk, V = this.V;
    if (!s) { H.text(v, 'Click Run to start with the client sending the request.'); return; }
    if (T) H.table(v, ['Part', 'Characters in the token', 'Decoded'], [
      { cls: s.split ? '' : 'gone', cells: ['Header', s.split ? V.hdr : '', s.split ? V.hdrJson : ''] },
      { cls: s.split ? '' : 'gone', cells: ['Payload', s.split ? T.pay : '', s.split ? { v: T.json, cls: T.who === 'admin' ? 'bad' : '' } : ''] },
      { cls: s.split ? '' : 'gone', cells: ['Signature', s.split ? (T.sig ? T.sig.slice(0, 8) + '…' : '(empty)') : '', s.calc ? 'Value the server recalculated: ' + s.calc.slice(0, 8) + '…' : 'Not text you can decode (a calculated value)'] },
    ], s.split ? 'Token split into three parts' : 'Token sent');
    H.table(v, ['Item', 'Value'], [
      { cls: s.cmp ? '' : 'gone', cells: ['Server signature check', s.cmp ? { v: sim.row[0], cls: s.cmp === 'same' ? 'good' : s.cmp === 'skipped' ? '' : 'bad' } : 'Not yet'] },
      { cls: s.user ? '' : 'gone', cells: ['User the server trusted', s.user ? { v: s.user, cls: s.user === 'admin' ? 'bad' : s.user === 'kim' ? 'good' : '' } : 'Not yet'] },
      { cls: s.resp ? '' : 'gone', cells: ['Response', s.resp ? { v: s.resp, cls: s.resp.indexOf('200') === 0 ? (s.user === 'admin' ? 'bad' : 'good') : 'bad' } : 'Not yet'] },
    ], 'Result');
  },
  // Diagram: on the left, the three pieces of the token the client holds (header, payload, signature); on the right, the server (secret key, recalculated signature, comparison). The payload and the signature go to the server and are compared. A changed piece is red, and if the signature matches it is green. At the bottom are the user the server trusted and the response.
  draw: function (P, sim, shown) {
    var c = sim.c, T = sim.tk, V = this.V, last = shown[shown.length - 1], s = last ? last.snap : null, n = shown.length;
    var chk = c.check, sent = !!(s && s.sent && T);
    P.size(680, 312);
    P.region('cl', 14, 12, 246, 238, 'Token the client holds');
    P.region('sv', 420, 12, 246, 238, 'Server');
    P.box('p0', 24, 38, 226, 62, { cls: T ? 'plain' : 'ghost', title: 'Header', sub: T ? [V.hdr, V.hdrJson] : ['No token'], mono: !!T });
    P.box('p1', 24, 108, 226, 62, { cls: !T ? 'ghost' : T.who === 'admin' ? 'bad' : 'plain', title: 'Payload', right: T && T.who === 'admin' ? 'Edit' : '', sub: T ? [T.pay, T.json] : ['No token'], mono: !!T });
    var p2cls = !T ? 'ghost' : s && s.cmp === 'same' ? 'good' : s && s.cmp === 'diff' ? 'bad' : c.token === 'otherkey' ? 'bad' : !T.sig ? 'ghost' : 'plain';
    P.box('p2', 24, 178, 226, 62, { cls: p2cls, title: 'Signature', right: T ? T.note : '', sub: T ? [T.sig ? T.sig.slice(0, 8) + '…' : '(removed)'] : ['No token'], mono: !!T });
    P.box('key', 430, 38, 226, 62, { cls: chk ? 'plain' : 'ghost', title: 'Secret key', sub: [chk ? 'Only the server knows' : 'Not used'] });
    var calcSub = !chk ? 'Not done' : s && s.calc ? s.calc.slice(0, 8) + '…' : s && s.split && T && !T.sig ? 'Signature place is empty' : s && !T && s.resp ? 'No token, so not calculated' : 'Not yet';
    P.box('calc', 430, 108, 226, 62, { cls: !chk ? 'ghost' : s && s.calc ? 'wait' : s && s.resp ? 'ghost' : 'plain', title: 'Recalculated signature', sub: [calcSub], mono: !!(chk && s && s.calc) });
    var cm = s ? s.cmp : '';
    P.box('cmp', 430, 178, 226, 62, { cls: !chk || cm === 'skipped' ? 'ghost' : cm === 'same' ? 'good' : cm === 'diff' || cm === 'empty' ? 'bad' : s && s.resp ? 'ghost' : 'plain', title: 'Compare signatures', sub: [!chk ? 'Not done' : cm === 'same' ? 'Same: trust' : cm === 'diff' ? 'Different: reject' : cm === 'empty' ? 'No signature attached' : s && s.resp ? 'Not done' : 'Not yet'] });
    if (sent && chk) {
      P.arrow('a0', 'p0:r', 'calc:l:0.3', { cls: 'hot' });
      P.arrow('a1', 'p1:r', 'calc:l:0.7', { cls: 'hot' });
      if (T.sig) P.arrow('a2', 'p2:r', 'cmp:l', { cls: 'hot' });
    }
    if (sent && !chk) P.arrow('a1', 'p1:r', 'calc:l', { cls: 'dash' });
    if (s && s.calc) { P.arrow('ak', 'key:b', 'calc:t', { cls: 'hot' }); P.arrow('ac', 'calc:b', 'cmp:t', { cls: 'hot' }); }
    var u = s ? s.user : '', r = s ? s.resp : '';
    P.box('r1', 14, 262, 322, 36, { cls: u === 'admin' ? 'bad' : u === 'kim' ? 'good' : u ? 'plain' : 'ghost', title: 'User the server trusted', right: u || 'Not yet' });
    P.box('r2', 344, 262, 322, 36, { cls: r.indexOf('200') === 0 ? (u === 'admin' ? 'bad' : 'good') : r ? 'bad' : 'ghost', title: 'Response', right: r || 'Not yet' });
  },
  assume: 'The server is a single one started with the http module of Node.js 24.18.0 on a free port of 127.0.0.1. POST /login makes a token from the name it receives and returns it (the password check is left out and the server stores nothing). GET /me takes the token after Bearer from the Authorization header and splits it at the dots. If signature verification is on, it recalculates HMAC-SHA256 from the header and the payload and compares it with the signature that came with the token (if it does not match or is empty, the result is 401). If verification is off, it does not compare, reads the user in the payload, and answers with 200 and "Hello, user name". This decision is made by one function that reads only the request, the key, and whether verification is on, and it does not look up any storage such as a list of logged-in people. The client sent real HTTP requests with Node.js http.request, and in all 10 combinations we checked the first line of the request that the server received (GET /me, HTTP/1.1), the Authorization header, the result of the signature check, and the response status and body, and checked them against the model. The token line in the code panel is the same text as the header the server received, with only the signature part shortened to (signature), and the decoded header and payload are the same text as the token the server received decoded with base64url. The request the server received also had other headers such as Host and Connection, and they are shortened on the screen. The localhost on the screen was not used, and the request went to another port in our test run. That the implementation that makes the tokens follows the standard was checked first by running the same calculation on the example in RFC 7515 Appendix A.1 (the key, header, and payload written in the document) and getting the same value as the signature in the document. We also verified the same tokens with an HS256 key with jose4j 0.9.5, a JWT library that was in the Gradle cache in our test run. Only the token the server gave was valid, and the one with the payload changed, the one with the signature removed, and the one signed with a different key were not valid, which was the same as the decision of this server. Also, when we sent the token the server gave to a new server (with the same key) that had never received a login, it accepted it with 200, and a server with a different key rejected the same token. When the payload was changed to admin, the value the server recalculated from that payload differed from the signature that came with the token, and the signature made with a different key also differed from the value the server calculated. The token with the signature removed was sent in the form "header.payload.", with the dot left and only the place for the signature emptied. We separately saw that "header.payload", with the dot removed too, becomes 401 as a malformed token on this server whether or not signature verification is on, but this comes from the way this server was built, so it is not used on the screen. The 401 response had a WWW-Authenticate: Bearer header, and it is shortened on the screen. This lab deals only with a token with the signature part emptied, and does not deal with the attack of changing alg in the header to none. This server does not read alg in the header and always verifies with HMAC-SHA256, and the problems around algorithms are covered in the in-depth lab "JWT structure and verification". It also does not cover the expiration time of a token (exp), problems when a token is stolen, the difficulty of invalidating a token that was already given, where to keep a token, and the public-key method (RS256). What we opened in the documents and checked is as follows. RFC 7519 sections 1 and 3 (a JWT represents claims as a JSON object in a JWS or JWE structure, and in a signed JWT the claims set is the payload of the JWS), the first step of section 7.2 (a JWT must contain at least one dot, and what is before the first dot is the header), RFC 7515 section 2 (the signing input is the base64url header, a dot, and the base64url payload), section 3 (JWS overview), section 5.2 (signature verification is done on the signing input, and if no verification succeeds, the JWS is invalid), section 7.1 (the compact form joins the header, the payload, and the signature with dots), Appendix A.1 (the HMAC SHA-256 example), RFC 6750 section 1.2 (a Bearer token is a token that anyone who holds it can use), section 2.1 (the token is sent in the Authorization header with the Bearer method), and section 3 (the WWW-Authenticate response header, with the method name Bearer). RFC 6750 is a document for OAuth 2.0 access tokens, but the token in this lab was also sent in a header of the same form. The key and the tokens on the screen are values made for this lab, and the value of the key is not shown on the screen. We did not run it in a browser.',
});

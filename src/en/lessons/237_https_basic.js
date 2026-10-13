Lab.register({
  id: 'https_basic', nav: 'HTTPS', cat: 'Fundamentals', mode: 'step', basic: true, deep: ['tls'],
  title: 'How is HTTPS different from HTTP?',
  intro: 'HTTP sends requests and responses onto the network as plain characters. Between the client and the server there are things like routers and carrier equipment, and if someone looks at the characters passing through there, even a password can be read as it is. HTTPS sends the same HTTP characters encrypted, and the address starts with https://. The code box on the screen has three parts. The first is the address the client connects to, the second is the content it sends (the body of a POST request), and the third is the server\'s certificate, which appears only for https. Before encryption starts, the server shows its certificate to prove that it is the owner of that name, and the client checks two things: whether the certificate is in its list of trusted certificates, and whether the name it connected to is written in the certificate. If a check fails, the client closes the connection and does not send the request. In this lab you change https:// to http://, stop trusting the certificate, or connect with a name that is not written in the certificate, and send the same content each time. You see what can be seen in the middle of the diagram and what the server receives. 8080 and 8443 on the screen are port numbers written as examples, and password=1234 is a string for testing.',
  terms: ['HTTPS and TLS', 'TLS handshake and certificates', 'Plaintext', 'Server certificate verification (trust anchors and name)'],
  controls: [
    { id: 'scheme', label: 'Start of the address to connect to', type: 'select', value: 'https', options: [['https', 'Connect with https://'], ['http', 'Connect with http://']] },
    { id: 'trust', label: 'The client knows this server\'s certificate as trusted', type: 'check', value: true, show: function (c) { return c.scheme === 'https'; } },
    { id: 'name', label: 'Name to connect to', type: 'select', value: 'match', options: [['match', 'Connect to localhost (the name written in the certificate)'], ['other', 'Connect to 127.0.0.1 (a name not written in the certificate)']], show: function (c) { return c.scheme === 'https'; } },
  ],
  // q is the question shown on the question-style screen. t and d are the name and the description used in the text-only reading
  presets: [
    { t: 'Default settings', q: 'What can be seen in the middle when you send over HTTPS, and what does the server receive?', d: 'Only unreadable bytes pass through the middle, and the server receives the original characters, password=1234.', v: { scheme: 'https', trust: true, name: 'match' } },
    { t: 'Changing to http', q: 'What if you change https:// to http://?', d: 'There is no check and no encryption, so the characters pass through as they are and password=1234 can be read in the middle.', v: { scheme: 'http', trust: true, name: 'match' } },
    { t: 'Not trusting the certificate', q: 'What if the client does not trust the server\'s certificate?', d: 'The client closes the connection and does not send the request. The server receives nothing.', v: { scheme: 'https', trust: false, name: 'match' } },
    { t: 'Connecting to 127.0.0.1', q: 'What if you connect with a name that is not in the certificate (127.0.0.1)?', d: 'Even if the certificate is trusted, the name connected to is not written in it, so the client closes the connection.', v: { scheme: 'https', trust: true, name: 'other' } },
    { t: 'Not trusting it and connecting to 127.0.0.1 too', q: 'What if the client does not trust the certificate and the name you connect with (127.0.0.1) is not in the certificate either?', d: 'Both things are wrong. The reason the client reports is an untrusted certificate.', v: { scheme: 'https', trust: false, name: 'other' } },
  ],
  CONN: { ok: 'Connected', trust: 'The client closes the connection: untrusted certificate', name: 'The client closes the connection: the name in the certificate does not match the address' },
  MID: { plain: 'password=1234 is visible as it is', enc: 'The content of the request is unreadable bytes (no password=1234)', none: 'No request was sent' },
  code: function (c) {
    var https = c.scheme === 'https', host = https && c.name === 'other' ? '127.0.0.1' : 'localhost';
    var out = ['# Address the client connects to', c.scheme + '://' + host + ':' + (https ? '8443' : '8080') + '/login', '', '# Content sent (body of the POST request)', 'password=1234'];
    if (https) out.push('', '# Server certificate', 'Name: localhost', c.trust ? 'Signed by an authority the client trusts' : 'Not signed by an authority the client trusts');
    return out.join('\n');
  },
  label: function (c) { return c.scheme === 'http' ? 'Connect with http://' : 'Connect with https:// · certificate ' + (c.trust ? 'trusted' : 'not trusted') + ' · ' + (c.name === 'other' ? 'connect to 127.0.0.1' : 'connect to localhost'); },
  columns: ['Client connection', 'What can be seen in the middle', 'What the server received'],
  simulate: function (c) {
    var https = c.scheme === 'https', other = https && c.name === 'other', trust = !!c.trust, host = other ? '127.0.0.1' : 'localhost';
    var url = (https ? 'https://' : 'http://') + host + ':' + (https ? '8443' : '8080') + '/login';
    var sni = https && !other ? ' In this run, the bytes that start the connection were seen to contain the name localhost, which the client connected to, as plain characters. That is not the content of the request.' : '';
    var ev = [], sum = [];
    var st = { clc: 'plain', clt: ['Waiting'], a1: '', a2: '', cut: false, seenc: 'ghost', seent: ['Nothing has', 'passed yet'], svc: 'plain', svt: ['Waiting'], certc: 'ghost', certt: https ? ['Name: localhost'] : ['No certificate'], chk: [], conn: '', connc: '', mid: '', midc: '', got: '', gotc: '' };
    function push(s, k) { ev.push({ s: s, k: k, snap: JSON.parse(JSON.stringify(st)) }); }
    var between = ' Between the client and the server there are things like a router and carrier equipment (the middle of the diagram), and someone can look at the characters passing through there.';
    if (!https) {
      // http: no check and no encryption
      st.clc = 'hot'; st.clt = ['Using http']; st.a1 = 'plain'; st.a2 = 'plain'; st.seenc = 'plain'; st.seent = ['Bytes that start', 'the connection pass']; st.svt = ['Accepted']; st.conn = this.CONN.ok;
      push('The address to connect to the server is ' + url + '. It starts with http://, so the client (the program that connects to the server) sends the HTTP characters right away, without verifying the server and without preparing encryption. The server does not show a certificate either.' + between + ' 8080 is a port number written as an example.', '');
      st.clt = ['Sends text', 'as it is']; st.a1 = 'hot'; st.seenc = 'bad'; st.seent = ['POST /login HTTP/1.1', '(header lines)', '(empty line)', 'password=1234'];
      push('The client sends the HTTP request characters as they are. The first line POST /login HTTP/1.1, the header lines, the empty line, and the body password=1234 all flow out onto the network as plain characters.', '');
      st.mid = this.MID.plain; st.midc = 'bad';
      push('If someone looks at the characters passing through the middle (a router, carrier equipment, and so on), the request can be read as it is. Both POST /login and the password=1234 in the body are visible. In this run, both strings were found in the bytes recorded by the relay placed in the middle.', 'bad');
      st.svc = 'good'; st.svt = ['Body received:', 'password=1234']; st.got = 'password=1234'; st.gotc = 'good'; st.clc = 'plain'; st.clt = ['Request sent'];
      push('The body that the server\'s request-handling function received is password=1234. The characters the server receives are the same as with HTTPS. What differs is the characters seen in the middle.', 'good');
      sum.push('If you connect with http://, the same characters pass through as they are, so if someone looks in the middle, password=1234 can be read as it is. The characters the server received are the same as with HTTPS.');
      sum.push('The difference between HTTPS and HTTP is not the characters the server receives but the characters seen in the middle. HTTP also has no step to check that the server really owns that address.');
      return { events: ev, summary: sum, row: [this.CONN.ok, this.MID.plain, 'password=1234'] };
    }
    // https: connect -> certificate -> check -> (if it passes) encryption
    st.clc = 'hot'; st.clt = ['Using https']; st.a1 = 'plain'; st.a2 = 'plain'; st.seenc = 'plain'; st.seent = ['Bytes that start', 'the connection pass'];
    push('The address to connect to the server is ' + url + '. It starts with https://, so before sending HTTP characters, the client (the program that connects to the server) first verifies the server and prepares encryption.' + between + ' 8443 is a port number written as an example.', '');
    st.svc = 'hot'; st.svt = ['Shows certificate']; st.certc = 'hot';
    push('The server shows its certificate. A certificate is a document with which the server proves "I am the owner of this name," and this server\'s certificate has the name localhost written in it ("Server certificate" in the code box).', '');
    st.clt = ['Checking']; st.certc = 'plain';
    st.chk.push(['In the trusted list?', trust ? 'Yes' : 'No', trust ? 'good' : 'bad']);
    if (!trust) {
      push('The client checks the certificate. The first question is whether this certificate can be trusted. The client has a list of trusted certificates, and it looks to see whether the certificate the server showed is in that list. This certificate is not in the list the client trusts. It cannot be told apart from a certificate that anyone can make for themselves, so it does not prove that the server owns that name.' + (other ? ' In this combination the name connected to, 127.0.0.1, is also not written in the certificate, but in this run the reason the client gave for closing the connection was an untrusted certificate.' : ''), 'bad');
    } else {
      push('The client checks the certificate. The first question is whether this certificate can be trusted. The client has a list of trusted certificates, and it looks to see whether the certificate the server showed is in that list. This certificate is in the list the client trusts, so it passes.', 'good');
      st.chk.push(['Is the name connected to in the certificate?', other ? 'No' : 'Yes', other ? 'bad' : 'good']);
      push('The second question is whether the name connected to is written in the certificate. The name connected to is ' + host + '. The only name written in the certificate is localhost.' + (other ? ' The name connected to is not written there, so this certificate cannot be accepted as one issued by the server at this address.' : ' The name connected to is written there, so it passes.'), other ? 'bad' : 'good');
    }
    if (!trust || other) {
      var why = !trust ? 'trust' : 'name';
      st.clc = 'bad'; st.clt = ['Closed']; st.a2 = ''; st.cut = true; st.a1 = 'bad'; st.conn = this.CONN[why]; st.connc = 'bad';
      push('The check failed, so the client closes the connection. It did not send the HTTP request characters (POST /login and password=1234).', 'bad');
      st.seenc = 'plain'; st.seent = ['Bytes starting the', 'connection only', '(no request passed)']; st.mid = this.MID.none;
      push('What was seen in the middle is only the bytes up to the side that starts the connection. No request was sent, so neither POST /login nor password=1234 ever passed through. This is the result of searching the bytes recorded by the relay placed in the middle in this run.' + sni, '');
      st.svt = ['Got no request']; st.got = 'Nothing received'; st.gotc = 'bad';
      push('The server\'s request-handling function was not called, and the server received nothing. This is because the client closed the connection first.', 'bad');
      if (why === 'trust') {
        sum.push('If the client does not trust the server\'s certificate, it closes the connection and does not send the request. password=1234 did not appear either in the middle or at the server.');
        sum.push('Encryption starts after it is confirmed who is on the other side.' + (other ? ' In this combination the name connected to was also not written in the certificate, but the reason the client reported was an untrusted certificate.' : ' Even if the name connected to is written in the certificate, the connection is blocked if the certificate is not in the trusted list.'));
      } else {
        sum.push('Even if the certificate is in the trusted list, if the name connected to, 127.0.0.1, is not written in the certificate, the client closes the connection and does not send the request.');
        sum.push('A certificate is checked together with the name. localhost and 127.0.0.1 both point to this computer, but the only name written in the certificate is localhost, so the client that connected to 127.0.0.1 did not accept this certificate.');
      }
      return { events: ev, summary: sum, row: [this.CONN[why], this.MID.none, 'Nothing received'] };
    }
    st.clc = 'good'; st.clt = ['Checks passed']; st.conn = this.CONN.ok; st.connc = 'good'; st.svt = ['Encryption starts'];
    push('Both checks passed. The two sides start encrypted communication, having agreed on the key used to encrypt the HTTP characters. How the key is agreed on is covered in the in-depth lab "TLS handshake".', 'good');
    st.clt = ['Encrypted']; st.a1 = 'good';
    push('The client encrypts the HTTP request characters (the POST /login request and the body password=1234) and sends them. The characters before encryption are the same as when sending with http://.', '');
    st.seenc = 'good'; st.seent = ['Unreadable bytes', '(no password=1234)']; st.mid = this.MID.enc; st.midc = 'good';
    push('If you look at the bytes passing through the middle, you see unreadable bytes. You cannot find either POST /login or password=1234 as characters. This is the result of searching the bytes recorded by the relay placed in the middle in this run.' + sni, 'good');
    st.svc = 'good'; st.svt = ['Body received:', 'password=1234']; st.got = 'password=1234'; st.gotc = 'good';
    push('The server decrypts the bytes it received with the key and gets the original characters. The body that the server\'s request-handling function received is password=1234. Encryption changes only what is seen in the middle; it does not change the characters the server receives.', 'good');
    sum.push('HTTPS sends the same characters as HTTP (POST /login, password=1234), but encrypted. If you look in the middle, you see unreadable bytes, and the server decrypts them and receives the original characters, password=1234.');
    sum.push('Before encryption starts, the server shows its certificate, and the client checks whether it is in the trusted list and whether the name connected to is written in the certificate. The request is sent only if both checks pass.');
    return { events: ev, summary: sum, row: [this.CONN.ok, this.MID.enc, 'password=1234'] };
  },
  render: function (v, sim, t, H, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : null;
    if (!s) { H.text(v, 'Click Run to start with the client connecting to the server.'); return; }
    if (s.chk.length) H.table(v, ['Check the client made', 'Result'], s.chk.map(function (r) { return { cls: '', cells: [r[0], { v: r[1], cls: r[2] }] }; }), 'Certificate check');
    H.table(v, ['Item', 'Value'], [
      { cls: s.conn ? '' : 'gone', cells: ['Client connection', s.conn ? { v: s.conn, cls: s.connc } : 'Not yet'] },
      { cls: s.mid ? '' : 'gone', cells: ['What can be seen in the middle', s.mid ? { v: s.mid, cls: s.midc } : 'Not yet'] },
      { cls: s.got ? '' : 'gone', cells: ['What the server received', s.got ? { v: s.got, cls: s.gotc } : 'Not yet'] },
    ], 'Result');
  },
  // Diagram: on the left the client, in the middle a box for "what can be seen in the middle (router, carrier equipment, and so on)", and on the right the server and the certificate. What matters is whether the text in the middle box is password=1234 (red) or unreadable bytes (green). If the check fails and the connection is closed, there is an arrow only from the client to the middle, and the arrow to the server is cut. Below are three result boxes.
  draw: function (P, sim, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : null, https = sim.c.scheme === 'https';
    P.size(680, 356);
    P.box('cl', 14, 82, 120, 76, { cls: s ? s.clc : 'plain', title: 'Client', sub: s ? s.clt : ['Waiting'] });
    P.region('rmid', 190, 14, 262, 190, 'The middle (router, carrier equipment)');
    P.box('seen', 200, 54, 242, 140, { cls: s ? s.seenc : 'ghost', title: 'What can be seen here', sub: s ? s.seent : ['Nothing has', 'passed yet'] });
    P.region('rsv', 508, 14, 158, 190, 'Server');
    P.box('sv', 516, 50, 142, 62, { cls: s ? s.svc : 'plain', title: 'Server', sub: s ? s.svt : ['Waiting'] });
    P.box('cert', 516, 128, 142, 66, { cls: s ? s.certc : 'ghost', title: 'Certificate', sub: s ? s.certt : (https ? ['Name: localhost'] : ['No certificate']) });
    if (s && s.a1) P.arrow('a1', 'cl:r', 'seen:l', { cls: s.a1 === 'plain' ? '' : s.a1 });
    if (s && s.a2) P.arrow('a2', 'seen:r:0.3', 'sv:l', { cls: s.a2 === 'plain' ? '' : s.a2 });
    if (s && s.cut) P.text('cutx', 479, 100, 'Closed', { cls: 'bad', anchor: 'middle', bold: true });
    P.box('n1', 14, 218, 652, 36, { cls: s && s.conn ? s.connc || 'wait' : 'ghost', title: 'Client connection', right: s && s.conn ? s.conn.replace('The client closes the connection', 'Closed') : 'Not yet' });
    P.box('n2', 14, 262, 652, 36, { cls: s && s.mid ? s.midc || 'wait' : 'ghost', title: 'Seen in the middle', right: s && s.mid ? s.mid : 'Not yet' });
    P.box('n3', 14, 306, 652, 36, { cls: s && s.got ? s.gotc || 'wait' : 'ghost', title: 'Server received', right: s && s.got ? s.got : 'Not yet' });
  },
  assume: 'We ran all eight combinations for real, using only 127.0.0.1 on the PC used to write this lab, and checked against the results. We did not connect to any external network. The server is the http server or https server of Node.js 24.18.0 (its request-handling function records the body it received), and the client is http.request or https.request of the same Node.js. Between the server and the client we placed a TCP relay made by the Probe. The relay passes the bytes it receives to the other side as they are, while recording the bytes in both directions, and the "what can be seen in the middle (router, carrier equipment, and so on)" in the middle of the diagram was reproduced from this record. In all of the recorded bytes, we searched for the strings password=1234 and POST /login. In the four combinations that connect with http://, both strings were there, and in the combinations that connect with https://, both strings were absent, both for those that connected and for those that were closed. This is the result of the search in this run, and it is not proof that the encryption is safe. Also, in the combinations that connect to localhost with https://, the string localhost was visible in the bytes that start the connection, and in the combinations that connect to 127.0.0.1 it was not (we only observed this and did not check the cause in this lab). We made the certificate for testing with openssl 3.5.7 on the PC used to write this lab (self-signed, name localhost, subjectAltName only DNS:localhost, valid for 2 days, files in verify/out/https_basic/). "The client trusts it" was reproduced by giving this certificate to the ca option of https.request, and "does not trust it" by not giving the ca option (so that only the list of certificate authorities included in Node.js is trusted); we did not use rejectUnauthorized: false, which turns verification off. The two combinations that do not trust it were closed with the error DEPTH_ZERO_SELF_SIGNED_CERT, and the combination that trusts it but connects to 127.0.0.1 was closed with the error ERR_TLS_CERT_ALTNAME_INVALID (the message starts with Hostname/IP does not match certificate\'s altnames). In the combination where both apply (does not trust it and connects to 127.0.0.1), the untrusted certificate error came out, and the name mismatch error did not. In the combinations that were closed, the server\'s request-handling function was never called (the server recorded only the error ECONNRESET, meaning the connection was reset), and in the combinations that connected, the server received the body password=1234 of the POST /login request. The TLS version used by the combinations that connected was TLSv1.3, and the cipher suite was TLS_AES_256_GCM_SHA384; we could not measure the TLS version of the combinations that were closed. 8080 and 8443 on the screen are example numbers, and in the real runs we used free ports, and password=1234 is a string for testing. Real browsers and operating systems come with a list of trusted certificate authorities built in, and the server\'s certificate must be signed by one of those authorities, but this lab does not cover that and covers only "in the trusted list / not in the list". We did not run it with a real browser. What we checked in the documents is section 4.2.2 of RFC 9110 (the https URI scheme: a connection protected by TLS, the server is authenticated as acting on behalf of the authority, default port 443) and section 4.3.4 (https certificate verification: the identity in the certificate must be checked against the server at the address that was connected to, and the check needs a list of trusted certificates. If the certificate is not valid for that address, a user agent such as a browser must obtain confirmation from the user or terminate the connection, and for an automated client terminating the connection is recommended), and section 1 of RFC 8446 (the purpose of TLS is a secure channel between two peers, the data in the channel is visible only at the two ends, and tampering can be detected). The client in this lab is an automated program, so it closes the connection without asking the user. We did not cover the case where a browser shows a warning page and asks whether to continue. We did not cover how the key is agreed on before encryption, the order of the messages in the TLS handshake, or the validity period, revocation, and chain of certificates; those are covered in the in-depth lab "TLS handshake". The code on the screen shows the address the client connects to, the content it sends, and the state of the server\'s certificate, and it is not the program code of a server or a client.',
});

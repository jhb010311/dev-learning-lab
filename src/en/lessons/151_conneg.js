Lab.register({
  id: 'conneg', nav: 'Content negotiation and compression', cat: 'HTTP', mode: 'step',
  title: 'Why do different people get different responses from the same address?',
  intro: 'Even for the same address, a server can give several representations of a response that differ in format, language, and compression method. When a client says what it wants with the Accept, Accept-Language, and Accept-Encoding headers, the server chooses among them. This is called content negotiation. Change the request headers and see what the server chooses, how much compression shrinks the body, and why the Vary header is needed so that a shared cache, which stores responses in the middle, does not give the wrong response to another person.',
  terms: ['Content negotiation (Accept and Content-Type)', 'Quality value (qvalue)', 'Compression in HTTP and Content-Encoding', 'Vary header', 'Cache'],
  controls: [
    { id: 'fmt', label: 'Accept of A (the format it wants)', type: 'select', value: 'html', options: [['html', 'text/html → a long HTML document'], ['json', 'application/json → a short JSON document'], ['png', 'image/png → a PNG image that is already compressed']] },
    { id: 'lang', label: 'Accept-Language of A (the language it wants)', type: 'select', value: 'ko', options: [['ko', 'ko'], ['en', 'en'], ['en;q=0.5, ko;q=0.9', 'en;q=0.5, ko;q=0.9'], ['ja, en;q=0.7', 'ja, en;q=0.7'], ['fr', 'fr']], show: function (c) { return c.fmt !== 'png'; }, hint: 'The server has only a Korean version (ko) and an English version (en). q is the quality value (qvalue), a number from 0 to 1 that shows how much the client prefers an option. It is 1 when you leave it out.' },
    { id: 'enc', label: 'Accept-Encoding of A (the compression it can decompress)', type: 'select', value: 'gzip, br', options: [['none', '(header not sent)'], ['gzip', 'gzip'], ['gzip, br', 'gzip, br'], ['br;q=0.1, gzip', 'br;q=0.1, gzip']] },
    { id: 'vary', label: 'The server adds a Vary header to the response', type: 'check', value: false, hint: 'After A, another client, B, requests the same address through a shared cache. B wants English and cannot decompress anything.' },
  ],
  presets: [
    { t: 'Default settings', d: 'There is no Vary. The shared cache gives B the response made for A (br compression, Korean) as it is.', v: { fmt: 'html', lang: 'ko', enc: 'gzip, br', vary: false } },
    { t: 'With Vary', d: 'The cache compares the request headers, so it asks the server again for the request from B.', v: { fmt: 'html', lang: 'ko', enc: 'gzip, br', vary: true } },
    { t: 'The qvalue beats the written order', d: 'Even though en is written first, the server picks ko, which has the higher qvalue, and gzip, which has a higher qvalue than br.', v: { fmt: 'html', lang: 'en;q=0.5, ko;q=0.9', enc: 'br;q=0.1, gzip', vary: true } },
    { t: 'When the language is not on the server', d: 'There is no Japanese version, so the server gives the English version, the next candidate.', v: { fmt: 'html', lang: 'ja, en;q=0.7', enc: 'gzip', vary: true } },
    { t: 'Compressing a small body', d: 'A 37-byte JSON document becomes bigger when it is compressed.', v: { fmt: 'json', lang: 'ko', enc: 'gzip', vary: true } },
    { t: 'Compressing an image that is already compressed', d: 'A PNG does not get smaller when it is compressed once more.', v: { fmt: 'png', lang: 'ko', enc: 'gzip', vary: true } },
    { t: 'When no compression is requested', d: 'Without Accept-Encoding, the server sends the body as it is.', v: { fmt: 'html', lang: 'en', enc: 'none', vary: false } },
  ],
  // An image (PNG) has no language versions, so the language setting is fixed to one value
  fix: function (c) { return c.fmt === 'png' ? { lang: 'ko' } : null; },
  TYPE: { html: 'text/html', json: 'application/json', png: 'image/png' },
  WHAT: { html: 'the long HTML document', json: 'the short JSON document', png: 'the PNG image' },
  // For each representation: [original size, size compressed with gzip, size compressed with br] (bytes). These are the sizes of the real bodies of the test server, compressed with the default settings of zlib in Node 24.
  SIZES: { 'html-ko': [12542, 809, 425], 'html-en': [12422, 774, 399], 'json-ko': [37, 58, 41], 'json-en': [38, 58, 40], 'png': [12270, 12293, 12274] },
  num: function (n) { return String(n).replace(/\B(?=(\d{3})+$)/g, ','); },
  // Splits the header value at commas and makes [{ v: name, q: qvalue }]. A q that is not written is 1.
  parse: function (h) { return h.split(',').map(function (p) { var x = p.split(';'), q = 1; x.slice(1).forEach(function (a) { var kv = a.trim().split('='); if (kv[0] === 'q') q = parseFloat(kv[1]); }); return { v: x[0].trim(), q: q }; }); },
  // Language: the one with the highest q among those the server has (ko, en). null if there is none
  pickLang: function (h) { var best = null; this.parse(h).forEach(function (a) { if ((a.v === 'ko' || a.v === 'en') && a.q > 0 && (!best || a.q > best.q)) best = a; }); return best ? best.v : null; },
  // Compression: the one with the highest q. If the q values are equal, the order the server prefers (br, gzip). If there is no header, no compression (identity)
  pickEnc: function (h) { if (h === 'none') return 'identity'; var qs = {}, best = 'identity', bq = 0; this.parse(h).forEach(function (a) { qs[a.v] = a.q; }); ['br', 'gzip'].forEach(function (e) { if ((qs[e] || 0) > bq) { best = e; bq = qs[e]; } }); return best; },
  judge: function (c) {
    var png = c.fmt === 'png', got = png ? null : this.pickLang(c.lang), lang = png ? '' : got || 'ko', enc = this.pickEnc(c.enc);
    var sz = this.SIZES[png ? 'png' : c.fmt + '-' + lang], orig = sz[0], wire = enc === 'gzip' ? sz[1] : enc === 'br' ? sz[2] : sz[0];
    var varyVal = c.vary ? (png ? 'Accept, Accept-Encoding' : 'Accept, Accept-Language, Accept-Encoding') : '';
    // B: the same Accept, Accept-Language: en, no Accept-Encoding
    var diff = []; if (!png && c.lang !== 'en') diff.push('Accept-Language'); if (c.enc !== 'none') diff.push('Accept-Encoding');
    var hit = !c.vary || !diff.length, wrong = [];
    if (hit) { if (enc !== 'identity') wrong.push(enc + ' compression'); if (!png && lang !== 'en') wrong.push('Korean'); }
    return { png: png, langMatched: !!got, lang: lang, enc: enc, orig: orig, wire: wire, vary: varyVal, diff: diff, hit: hit, wrong: wrong };
  },
  sizeText: function (j) {
    if (j.enc === 'identity') return this.num(j.orig) + ' bytes (as is)';
    return this.num(j.orig) + ' → ' + this.num(j.wire) + ' bytes (' + (j.wire < j.orig ? Math.round((1 - j.wire / j.orig) * 100) + '% smaller' : (j.wire - j.orig) + ' bytes larger') + ')';
  },
  code: function (c) {
    var png = c.fmt === 'png', vary = c.vary ? '\n        \'Vary\': \'' + (png ? 'Accept, Accept-Encoding' : 'Accept, Accept-Language, Accept-Encoding') + '\',       // the request headers that were looked at when this response was chosen' : '';
    return '// Server (Node.js). Negotiator is a library that interprets the Accept family of headers\nhttp.createServer((req, res) => {\n    const want = new Negotiator(req);\n    const type = want.mediaType([\'text/html\', \'application/json\', \'image/png\']);        // Accept\n    const lang = want.language([\'ko\', \'en\']) || \'ko\';                                    // Accept-Language, ko if nothing matches\n    const enc  = want.encoding([\'br\', \'gzip\', \'identity\'], { preferred: [\'br\', \'gzip\'] });  // Accept-Encoding\n\n    let body = load(type, lang);                       // the body in the chosen format and language\n    if (enc === \'gzip\') body = zlib.gzipSync(body);\n    if (enc === \'br\')   body = zlib.brotliCompressSync(body);\n\n    res.writeHead(200, {\n        \'Content-Type\': type,\n        \'Content-Language\': lang,                      // not added for the image\n        \'Content-Encoding\': enc,                       // not added when the body was not compressed' + vary + '\n        \'Cache-Control\': \'public, max-age=60\',         // a shared cache may store it for 60 seconds\n    });\n    res.end(body);\n});\n\n// Request of client A\n// curl -H \'Accept: ' + this.TYPE[c.fmt] + '\'' + (png ? '' : ' -H \'Accept-Language: ' + c.lang + '\'') + (c.enc === 'none' ? '' : ' -H \'Accept-Encoding: ' + c.enc + '\'') + ' http://shop.example/guide';
  },
  label: function (c) { return this.TYPE[c.fmt] + (c.fmt === 'png' ? '' : ' · ' + c.lang) + ' · ' + (c.enc === 'none' ? 'no compression requested' : c.enc) + (c.vary ? ' · Vary present' : ' · no Vary'); },
  columns: ['Representation the server chose', 'Content-Encoding', 'Body size (original → sent)', 'Vary', 'What the other client B received'],
  simulate: function (c) {
    var j = this.judge(c), T = this.TYPE[c.fmt], num = this.num, ev = [], sum = [];
    var st = { step: 0, type: '', lang: '', enc: '', wire: 0, sent: false, b: '', bres: '', bcls: '' };
    function push(s, k) { st.step++; ev.push({ s: s, k: k, snap: JSON.parse(JSON.stringify(st)) }); }
    var langName = { ko: 'Korean', en: 'English' }[j.lang], size = this.sizeText(j);
    push('Client A sends the request GET /guide. It uses request headers to say what it wants. Accept is the format it wants to receive, Accept-Language is the language, and Accept-Encoding is the compression methods it can decompress. The shared cache in the middle has nothing stored yet, so the request goes all the way to the server.', '');
    st.type = T;
    push('The server looks at the Accept header (' + T + ') and chooses the format. This server can give /guide in three formats: HTML, JSON, and PNG. Of these, it picks ' + this.WHAT[c.fmt] + ', and writes the chosen format (' + T + ') in the Content-Type header of the response.', '');
    if (j.png) { st.lang = '(not applicable)'; push('There are no language versions of an image. The server does not look at Accept-Language when it chooses this response.', ''); }
    else {
      st.lang = j.lang;
      var lw = { 'ko': 'This means that the client wants the Korean version. The server has a Korean version, so it chooses that.', 'en': 'This means that the client wants the English version. The server has an English version, so it chooses that.', 'en;q=0.5, ko;q=0.9': 'q is a number from 0 to 1 that shows preference. en is written first, but ko (0.9) has a higher qvalue than en (0.5). The server looks at the qvalue, not the order, and chooses the Korean version.', 'ja, en;q=0.7': 'ja has no q, so its qvalue is 1, and it is the language the client wants most. But the server has no Japanese version. The next candidate, en (q=0.7), is on the server, so the server chooses the English version.', 'fr': 'The client wants a French version, but the server has only a Korean version and an English version, and no other candidate is written. This server ignores the request and gives the default language, the Korean version. Some servers refuse with 406 Not Acceptable when nothing matches.' }[c.lang];
      push('The server looks at the Accept-Language header (' + c.lang + ') and chooses the language. ' + lw + ' It writes the chosen language in the Content-Language header of the response.', j.langMatched ? '' : 'bad');
    }
    st.enc = j.enc === 'identity' ? 'none' : j.enc;
    var ew = { 'none': 'The request has no Accept-Encoding header. The server decides to send the body as it is, without compression.', 'gzip': 'Accept-Encoding: gzip means that the client can decompress gzip. The server decides to compress with gzip.', 'gzip, br': 'Accept-Encoding: gzip, br means that the client can decompress both. No q is written, so both have the same qvalue, 1. When the qvalues are equal, the server decides. This server is set to choose br (Brotli) first.', 'br;q=0.1, gzip': 'In Accept-Encoding: br;q=0.1, gzip, the qvalue of br is 0.1, and gzip, which has no q, has 1. The server is set to choose br first, but it chooses gzip, which the client prefers more.' }[c.enc];
    push(ew, '');
    st.wire = j.wire;
    if (j.enc === 'identity') push('Nothing is compressed, so the ' + num(j.orig) + '-byte body is sent as it is. No Content-Encoding header is added to the response.', '');
    else if (j.wire < j.orig) push('The ' + num(j.orig) + '-byte body became ' + num(j.wire) + ' bytes when compressed with ' + j.enc + '. The server adds the header Content-Encoding: ' + j.enc + ' to the response to tell the receiver which method to use to decompress it. Content-Type stays ' + T + '. Compression does not change the content; it changes only the packaging used for transfer.', 'good');
    else if (j.png) push('The ' + num(j.orig) + '-byte body was compressed with ' + j.enc + ', but it actually grew a little, to ' + num(j.wire) + ' bytes. The image data inside a PNG file is already compressed, so there is no repetition left to remove. Only the information needed for decompression was added.', 'bad');
    else push('The body is only ' + num(j.orig) + ' bytes. It was compressed with ' + j.enc + ', but it actually grew to ' + num(j.wire) + ' bytes. Compressed output carries the information needed to decompress it, and when the body is very small, the added part is larger than the part that is saved.', 'bad');
    st.sent = true;
    push('The server responds with 200 OK. ' + (c.vary ? 'It added a Vary header (' + j.vary + ') to the response. This marks that "this response depends on these headers of the request".' : 'It did not add a Vary header to the response.') + ' The shared cache stores this response as the response for /guide and passes it to A.', '');
    st.b = 'ask';
    push('Next, another client, B, requests the same address, /guide. B wants English (Accept-Language: en) and sends no Accept-Encoding. It is a simple program that cannot decompress anything. This request reaches the shared cache first.', '');
    var bres;
    if (!j.hit) {
      st.b = 'miss'; bres = 'The cache asked the server again, and B got a response that suits it'; st.bres = bres; st.bcls = 'good';
      push('The cache compares the headers listed in Vary of the stored response between the request from A and the request from B. The values of ' + j.diff.join(' and ') + ' differ. The cache does not use the stored response and asks the server again. B receives the uncompressed ' + (j.png ? 'image' : 'English version') + '.' + (j.enc === 'identity' && j.lang === 'en' ? ' The result the server chooses is the same as for A, but the cache treats requests as different when the text of a header differs.' : ''), 'good');
    } else if (c.vary) {
      st.b = 'hit'; bres = 'B received the response for A as it is (the request headers are the same, so it suits B too)'; st.bres = bres; st.bcls = 'good';
      push('The cache compares the headers listed in Vary of the stored response between the request from A and the request from B. All the values are the same. The cache does not ask the server and gives the stored response to B. The two requests want the same thing, so the response suits B too.', 'good');
    } else if (!j.wrong.length) {
      st.b = 'hit'; bres = 'B received the response for A as it is (it happens to suit B too)'; st.bres = bres; st.bcls = 'hot';
      push('The cache has a response for /guide and there is no Vary header. The cache does not compare the request headers and gives the stored response to B. It happened that what A received was the uncompressed ' + (j.png ? 'image' : 'English version') + ', so it suited B too. It would not have suited B if the request of A had been different.', '');
    } else {
      st.b = 'hit'; bres = 'B received the response for A as it is: ' + j.wrong.join(', ') + ' (does not suit B)'; st.bres = bres; st.bcls = 'bad';
      push('The cache has a response for /guide and there is no Vary header. The cache assumes that "the response for this address is the same for everyone" and gives B the response made for A as it is.' + (j.enc !== 'identity' ? ' B cannot decompress ' + j.enc + ', so it cannot read the body.' : '') + (!j.png && j.lang !== 'en' ? ' B wanted English but received the Korean version.' : ''), 'bad');
    }
    sum.push('What the server chose: ' + T + (j.png ? '' : ', ' + langName + ' version') + ', compression ' + (j.enc === 'identity' ? 'none' : j.enc) + '. Body size: ' + size + '. B ' + (j.hit ? (j.wrong.length ? 'received the response made for A, which it could not use.' : 'received the response for A as it is, and there was no problem.') : 'received a new response that suits it from the server.'));
    if (c.lang.indexOf('q=') >= 0 || c.enc.indexOf('q=') >= 0) sum.push('A qvalue is a number from 0 to 1 that shows preference, and it is 1 when it is not written. The server chooses the one with the highest qvalue among the things it can give. The order in which the values are written may be considered only when the qvalues are equal.');
    if (!j.png && !j.langMatched) sum.push('When no language matches, the server can respond in a default language or refuse with 406 Not Acceptable. The standard allows both. Showing the user something is better than showing nothing, so responding in the default language is more common.');
    if (j.enc !== 'identity' && j.wire < j.orig) sum.push('A body made of text, such as HTML, CSS, JavaScript, and JSON, has many repeated parts and compresses well. The HTML in this example repeats a table of the same shape for 120 lines, so it shrank a great deal. How much a body shrinks depends on its content. br usually makes the data smaller than gzip does, but it takes more time to compress.');
    if (j.enc !== 'identity' && j.wire >= j.orig) sum.push('Small bodies and data that is already compressed (PNG, JPEG, video, zip) do not shrink when compressed, and compression only uses CPU time. This is why real servers are set not to compress responses smaller than a certain size or these formats. This test server compressed everything without choosing, to show the difference.');
    if (j.enc === 'identity') sum.push('If Accept-Encoding is not sent, the server sends the body without compression. A browser sends this header automatically, and curl sends it only when you give the --compressed option.');
    if (!c.vary) sum.push(j.wrong.length ? 'The response depends on request headers, but without Vary, a shared cache gives a response made for one person to another person as it is. The server must write in Vary the names of the request headers it looked at when it chose the response.' : 'This time there was no problem, but that was by chance. Without Vary, a shared cache gives B the same response whatever the request headers of A were. Change the language or the compression setting of A.');
    else sum.push(j.hit ? 'The values of the headers listed in Vary were the same in the requests from A and B, so the cache reused the stored response.' : 'With Vary, a shared cache treats responses to requests with different request headers separately, even for the same address. In return, it treats requests as different even if a header differs by a few characters, so the cache answers directly less often. This is why Vary lists only the headers that were really looked at when the response was chosen.');
    return { events: ev, summary: sum, j: j, size: size, row: [T + (j.png ? '' : ' · ' + j.lang), j.enc === 'identity' ? 'none' : j.enc, size, j.vary || 'none', bres] };
  },
  render: function (v, sim, t, H, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : null, c = sim.c, j = sim.j, num = this.num;
    if (!s) { H.text(v, 'Click Run, and the server looks at the request headers one by one and chooses a response.'); return; }
    H.table(v, ['Request header of A', 'Value', 'What the server chose (response header)'], [
      { cells: ['Accept', this.TYPE[c.fmt], s.type ? { v: 'Content-Type: ' + s.type, cls: 'good' } : '?'] },
      { cells: ['Accept-Language', j.png ? '(not used for an image)' : c.lang, s.lang ? (j.png ? '(not applicable)' : { v: 'Content-Language: ' + s.lang, cls: j.langMatched ? 'good' : 'hot' }) : '?'] },
      { cells: ['Accept-Encoding', c.enc === 'none' ? '(no header)' : c.enc, s.enc ? (s.enc === 'none' ? 'Not compressed (no Content-Encoding)' : { v: 'Content-Encoding: ' + s.enc, cls: 'good' }) : '?'] },
    ], 'Content negotiation between client A and the server');
    H.counters(v, [[num(j.orig) + ' bytes', 'Original body'], [s.wire ? num(s.wire) + ' bytes' : '?', 'Body sent'], [s.sent ? (j.vary || 'none') : '?', 'Vary']]);
    var ln = H.lanes(v);
    H.lane(ln, 'Shared cache', s.sent ? 'Storing the response for /guide' + (j.vary ? ' (Vary present)' : ' (no Vary)') : 'Empty', s.sent ? 'wait' : 'none');
    H.lane(ln, 'Client B', !s.b ? 'Has not requested yet' : s.b === 'ask' ? 'Requested the same address (English, cannot decompress)' : s.bres, !s.b || s.b === 'ask' ? 'none' : s.bcls === 'hot' ? 'hot' : s.bcls);
  },
  // Diagram: on the left, the three request headers of A; on the right, the three response headers the server chose. Below them, the body sizes and what B receives through the shared cache.
  draw: function (P, sim, shown) {
    var last = shown[shown.length - 1], c = sim.c, j = sim.j, num = this.num, s = last ? last.snap : { step: 0, type: '', lang: '', enc: '', wire: 0, sent: false, b: '', bres: '', bcls: '' };
    P.size(680, 338);
    P.region('rq', 16, 16, 316, 150, 'Request headers of client A');
    P.region('rs', 348, 16, 316, 150, 'Response headers the server chose');
    P.box('qa', 30, 46, 288, 30, { cls: 'wait', title: 'Accept', right: this.TYPE[c.fmt] });
    P.box('ql', 30, 82, 288, 30, { cls: j.png ? 'ghost' : 'wait', title: 'Accept-Language', right: j.png ? 'not used' : c.lang });
    P.box('qe', 30, 118, 288, 30, { cls: c.enc === 'none' ? 'ghost' : 'wait', title: 'Accept-Encoding', right: c.enc === 'none' ? '(none)' : c.enc });
    P.box('ra', 362, 46, 288, 30, { cls: s.type ? 'good' : 'ghost', title: 'Content-Type', right: s.type || '?' });
    P.box('rl', 362, 82, 288, 30, { cls: !s.lang || j.png ? 'ghost' : j.langMatched ? 'good' : 'hot', title: 'Content-Language', right: s.lang ? (j.png ? 'none' : s.lang) : '?' });
    P.box('re', 362, 118, 288, 30, { cls: !s.enc || s.enc === 'none' ? 'ghost' : 'good', title: 'Content-Encoding', right: s.enc || '?' });
    if (s.type) P.arrow('aa', 'qa:r', 'ra:l');
    if (s.lang && !j.png) P.arrow('al', 'ql:r', 'rl:l');
    if (s.enc) P.arrow('ae', 'qe:r', 're:l', { cls: s.enc === 'none' ? 'mut' : '' });
    P.box('so', 16, 180, 316, 36, { cls: 'plain', title: 'Original body', right: num(j.orig) + ' bytes' });
    P.box('sw', 348, 180, 316, 36, { cls: !s.wire ? 'ghost' : j.enc === 'identity' ? 'plain' : j.wire < j.orig ? 'good' : 'bad', title: 'Body sent', right: s.wire ? num(s.wire) + ' bytes' : '?' });
    P.box('ca', 16, 230, 316, 50, { cls: s.sent ? 'wait' : 'ghost', title: !s.sent ? 'Shared cache' : j.vary ? 'Shared cache: compares Vary' : 'Shared cache: decides by address only', sub: s.sent ? (j.vary || 'Stores the response for /guide (no Vary)') : 'Empty' });
    P.box('b', 348, 230, 316, 50, { cls: !s.b ? 'ghost' : s.b === 'ask' ? 'wait' : s.bcls, title: 'Client B (English, cannot decompress)', sub: !s.b ? 'Has not requested yet' : s.b === 'ask' ? 'Requests the same address, /guide' : s.b === 'miss' ? 'Got a new, suitable response' : j.wrong.length ? 'A\'s response: ' + j.wrong.join(', ') : 'A\'s response: suits B too' });
    if (s.b) P.arrow('bc', 'b:l', 'ca:r', { cls: s.b === 'ask' ? '' : s.bcls === 'hot' ? 'hot' : s.bcls, label: s.b === 'ask' ? 'Request' : s.b === 'miss' ? 'Asks the server again' : 'Gives the stored one' });
    P.text('sz', 340, 310, s.wire ? 'Body size: ' + sim.size : 'Run the steps to see the compression result', { anchor: 'middle', cls: !s.wire ? 'mut' : j.enc === 'identity' ? 'mut' : j.wire < j.orig ? 'good' : 'bad', bold: !!s.wire });
    P.note('One request header decides one response header. A shared cache is a store that the requests of many users pass through. When a response has no Vary, the cache looks only at the address and gives the same response to everyone.');
  },
  assume: 'The three bodies (a long HTML document, a short JSON document, and a PNG image) are examples made for testing. The sizes are the real values obtained by compressing those bodies with the default settings of zlib 1.3.1 (gzip) and brotli 1.2.0 in Node.js 24 on the PC used to write this lab. With a different compression level or library version, they can differ by a few bytes. The HTML in the example repeats a table of the same shape, so it shrinks much more than an ordinary document does. 88 different combinations (the language setting is not used for an image) were run against a test server started on 127.0.0.1, and the format, language, compression, and size sent by the server, Vary, and the response received by B were confirmed to match the model. The test server was built from the http module of Node with the header-parsing library negotiator 1.0 (the one Express uses) and zlib. The shared cache was a small caching proxy, written for this purpose, that makes its decisions with http-cache-semantics 4.2, an implementation of the HTTP caching rules. It was not verified with a real CDN or proxy product. In addition, these were confirmed by execution: fetch (which sends Accept-Encoding: gzip, deflate by default) and curl --compressed decompress a compressed response by themselves and return it; curl without options does not send Accept-Encoding; and, behind a cache without Vary, curl without options receives the Korean response compressed with br as it is. The meaning of qvalues and the fact that a qvalue is 1 when omitted, and the fact that when no language matches the server can either ignore the header or respond with 406, follow RFC 9110 sections 12.4.2 and 12.5.4. The meaning of Vary follows section 12.5.5, and the fact that a cache compares the request headers listed in Vary follows RFC 9111 section 4.1. Which compression method to choose among those with equal qvalues is not set by the standard, so it differs from server to server (this test server prefers br). According to the standard (RFC 9110 section 12.5.3), a server may use any compression for a request without Accept-Encoding, but most servers, including this test server, send the body without compression. That B "cannot decompress" assumes that B is a program that does not support compression. A client that decompresses by itself by looking at Content-Encoding, such as a browser, can read the content, but it still has the problem of receiving a language it did not want.',
});

Lab.register({
  id: 'url', nav: 'URL structure', cat: 'Networking', mode: 'step',
  title: 'After I added the search term "A&B" to the URL, the server received only "A"',
  intro: 'A URL is divided into the scheme, host, port, path, query, and fragment at fixed symbols (://, :, /, ?, #, &, =). These symbols act as separators within a URL, so if you put the same character directly into a value, the URL gets cut at the wrong place.',
  terms: ['URI and URL', 'URL components', 'Percent-encoding', 'Query string and form data', 'Relative URL'],
  controls: [
    { id: 'origin', label: 'Beginning of the URL (scheme, host, port)', type: 'select', value: 'https://shop.example', options: [['https://shop.example', 'https://shop.example (port not written)'], ['https://shop.example:443', 'https://shop.example:443'], ['https://shop.example:8443', 'https://shop.example:8443'], ['http://shop.example', 'http://shop.example (port not written)'], ['http://shop.example:8080', 'http://shop.example:8080']] },
    { id: 'q', label: 'Search term to put in the query', type: 'select', value: 'A&B', options: [['A&B', 'A&B'], ['C#', 'C#'], ['C++', 'C++'], ['겨울 옷', '겨울 옷 (Korean text and a space)'], ['keyboard', 'keyboard']] },
    { id: 'enc', label: 'Encode the search term when inserting it', type: 'check', value: false, hint: 'When off, the characters are appended as they are. When on, they are inserted with searchParams.set.' },
    { id: 'rel', label: 'Link on this page (relative URL)', type: 'select', value: 'detail', options: [['detail', 'detail'], ['../cart', '../cart'], ['/help', '/help'], ['?page=2', '?page=2'], ['#top', '#top'], ['//cdn.example/app.js', '//cdn.example/app.js']] },
  ],
  presets: [
    { t: 'Default settings', d: 'The search term A&B is appended as it is. The server receives only A as the value of q.', v: { origin: 'https://shop.example', q: 'A&B', enc: false, rel: 'detail' } },
    { t: 'With encoding', d: '& becomes %26, and the value arrives intact.', v: { origin: 'https://shop.example', q: 'A&B', enc: true, rel: 'detail' } },
    { t: 'A # in the search term', d: 'Everything after # becomes the fragment and is not sent to the server.', v: { origin: 'https://shop.example', q: 'C#', enc: false, rel: '#top' } },
    { t: 'A + in the search term', d: 'The server reads + as a space.', v: { origin: 'https://shop.example', q: 'C++', enc: false, rel: 'detail' } },
    { t: 'Korean text and a space', d: 'See which characters the browser converts for you, and what they look like.', v: { origin: 'https://shop.example', q: '겨울 옷', enc: true, rel: '?page=2' } },
    { t: 'A URL with a port', d: 'It connects to port 8443, which is not the default port, and the port is also added to the Host header.', v: { origin: 'https://shop.example:8443', q: 'keyboard', enc: true, rel: '/help' } },
    { t: 'Writing the default port anyway', d: ':443 is the same as leaving the port out, so it disappears from the normalized URL.', v: { origin: 'https://shop.example:443', q: 'keyboard', enc: true, rel: '../cart' } },
  ],
  code: function (c) {
    var head = '// JavaScript. Paste it into the console of the browser developer tools to run it.\nconst keyword = \'' + c.q + '\';\n\n';
    var make = c.enc ? '// Insert the search term with encoding\nconst url = new URL(\'' + c.origin + '/shop/list\');\nurl.searchParams.set(\'q\', keyword);\nurl.searchParams.set(\'sort\', \'price\');\nurl.hash = \'review\';\n' : '// Append the search term as the characters are\nconst url = new URL(\'' + c.origin + '/shop/list?q=\' + keyword + \'&sort=price#review\');\n';
    return head + make + '\nconsole.log(url.href);                                   // the URL as the browser normalized it\nconsole.log(url.protocol, url.hostname, url.port, url.pathname, url.search, url.hash);\nconsole.log([...url.searchParams]);                      // the query read as names and values (the same rules as the server uses)\nconsole.log(new URL(\'' + c.rel + '\', url).href);' + ' '.repeat(Math.max(1, 22 - c.rel.length)) + '// the URL that the link (href="' + c.rel + '") points to';
  },
  label: function (c) { return c.origin + ' · search term ' + c.q + (c.enc ? ' (encoded)' : ' (as is)') + ' · link ' + c.rel; },
  columns: ['Port connected to', 'Request line sent to the server', 'q received by the server', 'All parameters received by the server', 'URL the link points to'],
  PORTS: { http: '80', https: '443' },
  // write one character (code point) as its UTF-8 bytes in the %XX form
  pct: function (cp) {
    var b = cp < 0x80 ? [cp] : cp < 0x800 ? [0xC0 | (cp >> 6), 0x80 | (cp & 63)] : cp < 0x10000 ? [0xE0 | (cp >> 12), 0x80 | ((cp >> 6) & 63), 0x80 | (cp & 63)] : [0xF0 | (cp >> 18), 0x80 | ((cp >> 12) & 63), 0x80 | ((cp >> 6) & 63), 0x80 | (cp & 63)];
    return b.map(function (x) { return '%' + (x < 16 ? '0' : '') + x.toString(16).toUpperCase(); }).join('');
  },
  // turn the string into an array of code points (a surrogate pair is joined into one)
  cps: function (s) { var out = [], i, a, b; for (i = 0; i < s.length; i++) { a = s.charCodeAt(i); b = s.charCodeAt(i + 1); if (a >= 0xD800 && a <= 0xDBFF && b >= 0xDC00 && b <= 0xDFFF) { out.push((a - 0xD800) * 0x400 + (b - 0xDC00) + 0x10000); i++; } else out.push(a); } return out; },
  // the encoding used when a value is put into a query (what searchParams.set does): letters, digits, and * - . _ stay, a space becomes +, and everything else becomes %XX
  formEncode: function (s) {
    var self = this;
    return this.cps(s).map(function (cp) { var ch = String.fromCharCode(cp); return cp < 0x80 && /[A-Za-z0-9*\-._]/.test(ch) ? ch : cp === 0x20 ? '+' : self.pct(cp); }).join('');
  },
  // the encoding the browser applies when it normalizes a URL that is already written out. It changes only the characters in set, spaces, control characters, and characters outside ASCII. It leaves &, =, +, and % alone
  looseEncode: function (s, set) {
    var self = this;
    return this.cps(s).map(function (cp) { return cp <= 0x20 || cp > 0x7E || (cp < 0x80 && set.indexOf(String.fromCharCode(cp)) >= 0) ? self.pct(cp) : String.fromCharCode(cp); }).join('');
  },
  // split the URL string into parts: scheme :// host :port /path ?query #fragment
  parse: function (str) {
    var u = { scheme: '', host: '', port: '', typedPort: '', path: '/', query: null, frag: null }, i = str.indexOf('://'), rest, h, a;
    u.scheme = str.slice(0, i).toLowerCase(); rest = str.slice(i + 3);
    h = rest.indexOf('#'); if (h >= 0) { u.frag = this.looseEncode(rest.slice(h + 1), '"<>`'); rest = rest.slice(0, h); }
    h = rest.indexOf('?'); if (h >= 0) { u.query = this.looseEncode(rest.slice(h + 1), '"#<>\''); rest = rest.slice(0, h); }
    h = rest.indexOf('/'); a = h >= 0 ? rest.slice(0, h) : rest; if (h >= 0) u.path = this.dots(rest.slice(h));
    h = a.lastIndexOf(':'); if (h >= 0) { u.typedPort = a.slice(h + 1); a = a.slice(0, h); }
    u.host = a.toLowerCase(); u.port = u.typedPort === this.PORTS[u.scheme] ? '' : u.typedPort;
    return u;
  },
  // resolve . and .. in the path
  dots: function (path) {
    var segs = path.split('/'), out = [], i, s, end; segs.shift();
    for (i = 0; i < segs.length; i++) { s = segs[i]; end = i === segs.length - 1; if (s === '..') { if (out.length) out.pop(); if (end) out.push(''); } else if (s === '.') { if (end) out.push(''); } else out.push(s); }
    return '/' + out.join('/');
  },
  href: function (u) { return u.scheme + '://' + u.host + (u.port ? ':' + u.port : '') + u.path + (u.query !== null ? '?' + u.query : '') + (u.frag !== null ? '#' + u.frag : ''); },
  // resolve the relative URL rel against the base URL b
  resolve: function (rel, b) {
    var r = { scheme: b.scheme, host: b.host, port: b.port, typedPort: b.port, path: b.path, query: null, frag: null }, h, rq = null;
    if (/^[A-Za-z][A-Za-z0-9+.\-]*:\/\//.test(rel)) return this.parse(rel);
    if (rel.slice(0, 2) === '//') return this.parse(b.scheme + ':' + rel);
    h = rel.indexOf('#'); if (h >= 0) { r.frag = this.looseEncode(rel.slice(h + 1), '"<>`'); rel = rel.slice(0, h); }
    h = rel.indexOf('?'); if (h >= 0) { rq = this.looseEncode(rel.slice(h + 1), '"#<>\''); rel = rel.slice(0, h); }
    if (rel === '') { r.query = rq !== null ? rq : b.query; return r; }
    r.query = rq;
    r.path = this.dots(rel.charAt(0) === '/' ? rel : b.path.slice(0, b.path.lastIndexOf('/') + 1) + rel);
    return r;
  },
  // turn %XX and + back into the original characters
  formDecode: function (s) {
    var bytes = [], i, out = '', cp, n, k;
    for (i = 0; i < s.length; i++) {
      if (s.charAt(i) === '+') bytes.push(0x20);
      else if (s.charAt(i) === '%' && /^[0-9A-Fa-f]{2}$/.test(s.substr(i + 1, 2))) { bytes.push(parseInt(s.substr(i + 1, 2), 16)); i += 2; }
      else this.cps(s.charAt(i)).forEach(function (c) { if (c < 0x80) bytes.push(c); else bytes.push(-c); });
    }
    for (i = 0; i < bytes.length; i++) {
      cp = bytes[i];
      if (cp < 0) { out += String.fromCharCode(-cp); continue; }
      n = cp < 0x80 ? 0 : cp >= 0xC2 && cp < 0xE0 ? 1 : cp >= 0xE0 && cp < 0xF0 ? 2 : cp >= 0xF0 && cp < 0xF5 ? 3 : -1;
      if (n < 0) { out += '�'; continue; }
      if (n) { cp = cp & (0x3F >> n); for (k = 1; k <= n; k++) { if (i + k >= bytes.length || bytes[i + k] < 0x80 || bytes[i + k] > 0xBF) { cp = -1; break; } cp = cp * 64 + (bytes[i + k] & 63); } if (cp < 0) { out += '�'; continue; } i += n; }
      out += cp >= 0x10000 ? String.fromCharCode(0xD800 + ((cp - 0x10000) >> 10), 0xDC00 + ((cp - 0x10000) & 0x3FF)) : String.fromCharCode(cp);
    }
    return out;
  },
  // the rules the server uses to read a query: split at &, split each piece into a name and a value at the first =, and undo the encoding
  parseForm: function (query) {
    var self = this;
    return (query || '').split('&').filter(function (p) { return p !== ''; }).map(function (p) { var e = p.indexOf('='); return e < 0 ? [self.formDecode(p), ''] : [self.formDecode(p.slice(0, e)), self.formDecode(p.slice(e + 1))]; });
  },
  simulate: function (c) {
    var ev = [], sum = [], st = { stage: 0 }, q = c.q, u, typed;
    function push(s, kind) { st.stage++; ev.push({ s: s, k: kind || '', snap: JSON.parse(JSON.stringify(st)) }); }
    if (c.enc) { u = this.parse(c.origin + '/shop/list'); u.query = 'q=' + this.formEncode(q) + '&sort=price'; u.frag = 'review'; typed = this.href(u); }
    else { typed = c.origin + '/shop/list?q=' + q + '&sort=price#review'; u = this.parse(typed); }
    var href = this.href(u), def = this.PORTS[u.scheme], eff = u.port || def, params = this.parseForm(u.query), got = null, target = u.path + (u.query !== null ? '?' + u.query : ''), hostHeader = u.host + (u.port ? ':' + u.port : '');
    params.forEach(function (p) { if (got === null && p[0] === 'q') got = p[1]; });
    var link = this.resolve(c.rel, u), linkHref = this.href(link), ok = got === q, sortOk = params.some(function (p) { return p[0] === 'sort' && p[1] === 'price'; });
    var portWhy = u.typedPort === '' ? 'default port of ' + u.scheme : u.typedPort === def ? 'the port written is the default port' : 'port written in the URL';
    var plist = params.map(function (p) { return p[0] + '="' + p[1] + '"'; }).join(', ');
    var encQ = this.formEncode(q), rawQ = u.query;
    if (c.enc) push('Building the URL: searchParams.set encoded the search term ("' + q + '") and put it in the query. Every character other than letters, digits, and a few symbols (* - . _) is replaced by the bytes of that character written as % followed by two hex digits. ' + { 'A&B': '& became %26.', 'C#': '# became %23.', 'C++': '+ became %2B.', '겨울 옷': 'Each Korean character is 3 bytes in UTF-8, so it became three %XX groups, and the space became +.', 'keyboard': 'This search term has no characters to change, so it stays as it is.' }[q] + ' The result inserted is q=' + encQ + '.', 'good');
    else push('Building the URL: The search term ("' + q + '") was appended to the URL exactly as the characters are. The resulting text is ' + typed + '.', '');
    push('Scheme: The part from the start up to ://, which is ' + u.scheme + '. It decides which protocol is used to connect.');
    push('Host and port: The part after :// up to the first / is where to connect. The host is ' + u.host + '. ' + (u.typedPort === '' ? 'No port is written, so it connects to port ' + def + ', the default port of ' + u.scheme + '.' : u.typedPort === def ? ':' + def + ' is written, but it is the same number as the default port of ' + u.scheme + ', so it is the same as not writing it. The browser removes this part when it normalizes the URL.' : 'A port is written, so it connects to port ' + u.typedPort + ' instead of the default port (' + def + ').'));
    push('Path: The part after the host and port, which is ' + u.path + '. It points to what is being requested inside the server, and it ends before the first ?.');
    var cutHash = !c.enc && q.indexOf('#') >= 0, auto = !c.enc && rawQ !== 'q=' + q + '&sort=price' && !cutHash;
    push('Query: The part after ? up to the first #, which is ' + rawQ + '. This is where the name=value pairs for the server are written, joined with &.' + (cutHash ? ' The # inside the search term was read as the mark that starts the fragment, so the query ended there.' : auto ? ' Korean characters and spaces cannot be used in a URL as they are, so the browser converted them to the %XX form while normalizing the URL (a space becomes %20).' : ''), cutHash ? 'bad' : '');
    push('Fragment: Everything after the first #, which is ' + u.frag + '. It marks a position inside the document that was received, and only the browser uses it. It is not sent to the server.' + (cutHash ? ' Even the &sort=price that should have been in the query ended up here.' : ''), cutHash ? 'bad' : '');
    push('What goes to the server: The browser connects to ' + u.host + ' on port ' + eff + ' and sends the request line (GET ' + target + ' HTTP/1.1) and the Host header (Host: ' + hostHeader + '). The request line contains only the path and the query. The fragment is not carried anywhere.');
    var why = ok && sortOk ? (c.enc ? 'The search term arrived exactly as it was sent. The encoded %XX and + are not read as separators, and they turn back into the original characters only after the query has been split.' : auto ? 'The search term arrived intact. This is because the browser encodes Korean characters and spaces for you. But characters that have a special meaning in a URL, such as &, #, and +, are not changed by the browser.' : 'This search term has no characters with a special meaning in a URL, so it arrived intact even when appended as it is.') : q === 'A&B' ? 'The & inside the search term was read as the symbol that separates pairs. The value of q was cut off at "A", and an unrelated name, B, was created.' : q === 'C#' ? 'Nothing after # reached the server. The value of q was cut off at "C", and sort, which came after it, disappeared too.' : 'In a query, + is the symbol that means a space. The value of q became "C" followed by two spaces.';
    push('Server query parsing: The query is split at &, each piece is split into a name and a value at the first =, and then + is turned back into a space and %XX into the original character. The result is ' + plist + '. ' + why, ok && sortOk ? 'good' : 'bad');
    var relWhy = { 'detail': 'It does not start with /, so the last segment of the current path (' + u.path + ') is replaced with detail. The query and the fragment are not inherited.', '../cart': '.. means one level up. Removing the last segment of the current path (' + u.path + ') leaves /shop/, and going up one level from there and adding cart gives /cart.', '/help': 'It starts with /, so the whole path is replaced with /help. The scheme, host, and port of the current URL are used as they are.', '?page=2': 'It starts with ?, so the path stays and only the query is replaced with page=2. The query of the current URL is not inherited; it is replaced entirely.', '#top': 'It starts with #, so the path and the query stay and only the fragment is replaced with top. This only moves to a position inside the same document, so no new request is sent to the server.', '//cdn.example/app.js': 'It starts with //, so only the scheme (' + u.scheme + ') is inherited, and the host onward is set anew. The port is not inherited either.' }[c.rel];
    push('Resolving the relative URL: The link on this page (href="' + c.rel + '") gives only part of a URL, so the browser fills in the missing parts using the current URL as the base. ' + relWhy + ' The result is ' + linkHref + '.');
    if (!ok) sum.push('&, =, #, +, %, and ? are characters that act as separators within a URL. If a value can contain such characters, you must always encode it before inserting it. In JavaScript, URLSearchParams or encodeURIComponent does this, and in Java, URLEncoder.encode does. Code that builds a URL by joining characters by hand usually works, and then fails on the day such a value arrives.');
    else if (c.enc) sum.push('Encoding replaces a character inside a value with its %XX form so that it is not read as a separator. The server splits at the separators first and decodes afterward, so the value stays intact.');
    else sum.push('This search term worked even when appended as it is, but users can type any characters into a value.');
    sum.push('The fragment (the part after #) does not go to the server. It is not in the server log, and server code cannot read it. The query, on the other hand, goes to the server and may be kept in its access log, so do not put values such as passwords in the query.');
    if (u.typedPort !== '') sum.push(u.port === '' ? 'A default port (80 for http, 443 for https) is the same whether it is written or not. So the port does not appear in the normalized URL or in the Host header.' : 'A port other than the default must always be written in the URL, and it is carried in the Host header too.');
    return { events: ev, summary: sum, u: u, typed: typed, href: href, eff: eff, def: def, target: target, hostHeader: hostHeader, params: params, got: got, ok: ok && sortOk, link: linkHref, portWhy: portWhy,
      row: [eff + ' (' + portWhy + ')', 'GET ' + target + ' HTTP/1.1', got === null ? 'none' : '"' + got + '"' + (ok ? '' : ' (sent: "' + q + '")'), plist, linkHref] };
  },
  render: function (v, sim, t, H, shown) {
    var last = shown[shown.length - 1], n = last ? last.snap.stage : 0, u = sim.u, c = sim.c;
    if (!n) { H.text(v, 'Click Run to build the URL and split it from the front, one part at a time.'); return; }
    H.table(v, ['What', 'Characters'], [{ cells: [c.enc ? 'Built URL' : 'Text appended as is', { v: sim.typed, cls: 'hot' }] }].concat(n >= 6 && sim.href !== sim.typed ? [{ cells: ['URL normalized by the browser', sim.href] }] : []), 'URL');
    var rows = [];
    if (n >= 2) rows.push({ cells: ['Scheme', u.scheme, 'Protocol used to connect', 'No'] });
    if (n >= 3) rows.push({ cells: ['Host', u.host, 'Name of the computer to connect to', 'In the Host header'] }, { cells: ['Port', u.typedPort === '' ? '(not written)' : u.typedPort, 'Connects to port ' + sim.eff + ' (' + sim.portWhy + ')', u.port ? 'In the Host header' : 'No'] });
    if (n >= 4) rows.push({ cells: ['Path', u.path, 'Which resource inside the server', { v: 'In the request line', cls: 'good' }] });
    if (n >= 5) rows.push({ cells: ['Query', u.query, 'name=value pairs passed to the server', { v: 'In the request line', cls: 'good' }] });
    if (n >= 6) rows.push({ cells: ['Fragment', u.frag, 'Position inside the document (used only by the browser)', { v: 'Not sent', cls: 'bad' }] });
    if (rows.length) H.table(v, ['Part', 'Value', 'What it does', 'Sent to the server?'], rows, 'Result of splitting the URL');
    var ln = H.lanes(v);
    H.lane(ln, 'Host header', n >= 7 ? 'Host: ' + sim.hostHeader : 'Not sent yet', n >= 7 ? 'hot' : 'none');
  },
  // Diagram: the URL is split into six parts, placed one line at a time from top to bottom, and below them come the request line sent to the server, the values the server parsed, and the URL the link points to.
  draw: function (P, sim, shown) {
    var last = shown[shown.length - 1], n = last ? last.snap.stage : 0, u = sim.u, c = sim.c, i;
    var parts = [['Scheme', u.scheme, 2, ''], ['Host', u.host, 3, ''], ['Port', u.typedPort === '' ? '(not written) → ' + sim.eff : u.port === '' ? u.typedPort + ' (same as the default port)' : u.typedPort, 3, ''], ['Path', u.path, 4, 'sent to server'], ['Query', u.query, 5, 'sent to server'], ['Fragment', u.frag, 6, 'not sent to server']];
    P.size(680, 346);
    for (i = 0; i < 6; i++) {
      var on = n >= parts[i][2], cur = n === parts[i][2], sent = n >= 7 && parts[i][3];
      P.text('pt' + i, 16, 31 + i * 28, parts[i][0], { cls: on ? '' : 'mut', bold: cur });
      P.box('pv' + i, 104, 14 + i * 28, 560, 24, { cls: !on ? 'ghost' : cur ? 'hot now' : sent ? (i === 5 ? 'bad' : 'good') : 'wait', sub: on ? parts[i][1] : '', right: sent ? parts[i][3] : '', mono: true });
    }
    P.box('req', 16, 190, 648, 44, { cls: n >= 7 ? (n === 7 ? 'hot now' : 'plain') : 'ghost', title: n >= 7 ? 'Request line sent to the server (connecting to ' + u.host + ' on port ' + sim.eff + ')' : 'Request line sent to the server', sub: n >= 7 ? 'GET ' + sim.target + ' HTTP/1.1' : '', mono: true });
    P.box('srv', 16, 240, 648, 44, { cls: n >= 8 ? (sim.ok ? 'good' : 'bad') + (n === 8 ? ' now' : '') : 'ghost', title: 'Values the server parsed from the query (search term sent: "' + c.q + '")', sub: n >= 8 ? sim.row[3] : '' });
    P.box('lnk', 16, 290, 648, 44, { cls: n >= 9 ? 'hot now' : 'ghost', title: 'URL the link (href="' + c.rel + '") points to', sub: n >= 9 ? sim.link : '', mono: true });
    P.note('The six lines at the top are the parts of the URL. Only the green lines (path and query) are carried in the request line to the server, and the red line (fragment) stays in the browser.');
  },
  assume: 'All 300 combinations were run on Node.js 24 and checked. The result of splitting the URL, the normalized URL, and the resolution of relative URLs were checked against the values produced by the Node.js URL (an implementation of the WHATWG URL standard, which browsers follow). The connection port, the request line, and the Host header were checked by sending a request to that URL with the Node.js HTTP client, redirecting only the connection to a test server on 127.0.0.1, and receiving the characters that were actually sent (no DNS lookup for shop.example and no outside connection was made, and even the https URLs were received without encryption). The values the server received are the query of that request line parsed with URLSearchParams. Other servers such as Tomcat use the same rules (application/x-www-form-urlencoded), which split at & and = and turn + and %XX back, but this lab did not run them separately. Parts that differ from server to server, such as whether a malformed %XX is treated as an error, are not covered. encodeURIComponent turns a space into %20, not +, and in a query both are read as a space (this difference was also confirmed by execution). The rules for splitting a URL are in RFC 3986 section 3, removing the fragment before making the request is in section 3.5, resolving relative URLs is in section 5.2, and the request line and the Host header are in RFC 9112 section 3.2 and RFC 9110 section 7.2. That clicking a link that starts with # does not send a new request to the server was written down from the behavior of browsers (fragment navigation in the HTML standard) and was not run. URLs that contain a user name, IPv6 addresses, and domain names written in Korean are not covered.',
});

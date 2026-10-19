Lab.register({
  id: 'origin_basic', nav: 'Origins', cat: 'Fundamentals', mode: 'step', basic: true, deep: ['cors', 'webattack', 'clickjack'],
  title: 'What is an origin, and why does the browser tell different origins apart?',
  intro: 'An origin is the combination of three parts at the start of an address (URL): the scheme (https or http), the host (the site name), and the port (a number). If any one of the three differs, it is a different origin, and the path and query that come after are not part of the origin. The browser blocks a script running inside a page from reading the response to a request sent to another origin. This rule is the same-origin policy. In this lab, the code box lists the address of the page that is open and the address that the script of that page requests. You change the requested address one part at a time and see whether the browser treats the origin as the same, whether the request arrives at the server, and whether the script reads the response. The code box is not a program but two addresses. The way a server allows reading (CORS) is not covered in this lab.',
  terms: ['Origin', 'Scripts in web pages', 'Scheme and default port', 'CORS and the same-origin policy'],
  controls: [
    { id: 'target', label: 'Address the script requests', type: 'select', value: 'same', options: [['same', 'https://shop.example/api/items (path only)'], ['path', 'https://shop.example/other?x=1 (only the path and query differ)'], ['host', 'https://api.shop.example/items (the host differs)'], ['port', 'https://shop.example:8443/items (the port differs)'], ['scheme', 'http://shop.example/items (the scheme differs)']] },
  ],
  // q is the question shown on the question-style screen. t and d are the name and the description used in the text-only reading
  presets: [
    { t: 'Default settings', q: 'Which part of an address is the origin, and can the script read the response to a request sent to the same origin?', d: 'The scheme, host, and port of the page and the requested address are all the same. The script reads the response.', v: { target: 'same' } },
    { t: 'Changing only the path and query', q: 'What if you change the path and query of the requested address to /other?x=1?', d: 'The path and query are not part of the origin, so it is still the same origin. The script reads the response.', v: { target: 'path' } },
    { t: 'Changing the host', q: 'What if you change the host of the requested address to api.shop.example?', d: 'The host differs, so it is a different origin. The request arrives at the server, but the script cannot read the response.', v: { target: 'host' } },
    { t: 'Changing the port', q: 'What if you add the port :8443 to the requested address?', d: 'The port differs, so it is a different origin. The script cannot read the response.', v: { target: 'port' } },
    { t: 'Changing the scheme', q: 'What if you change the requested address to start with http instead of https?', d: 'The scheme differs, so it is a different origin. The script cannot read the response.', v: { target: 'scheme' } },
  ],
  PAGE: { url: 'https://shop.example/cart', origin: 'https://shop.example', scheme: 'https', host: 'shop.example', port: '443' },
  // For each requested address: the address, origin, scheme, host, port, whether the port is written in the address, and the rest of the address (path and query)
  T: {
    same: { url: 'https://shop.example/api/items', origin: 'https://shop.example', scheme: 'https', host: 'shop.example', port: '443', written: false, rest: '/api/items (path)' },
    path: { url: 'https://shop.example/other?x=1', origin: 'https://shop.example', scheme: 'https', host: 'shop.example', port: '443', written: false, rest: '/other (path) and ?x=1 (query)' },
    host: { url: 'https://api.shop.example/items', origin: 'https://api.shop.example', scheme: 'https', host: 'api.shop.example', port: '443', written: false, rest: '/items (path)' },
    port: { url: 'https://shop.example:8443/items', origin: 'https://shop.example:8443', scheme: 'https', host: 'shop.example', port: '8443', written: true, rest: '/items (path)' },
    scheme: { url: 'http://shop.example/items', origin: 'http://shop.example', scheme: 'http', host: 'shop.example', port: '80', written: false, rest: '/items (path)' },
  },
  code: function (c) {
    return ['# The page that is open now', this.PAGE.url, '# The address that the script of that page requests', this.T[c.target].url].join('\n');
  },
  label: function (c) { return { same: 'Same origin · path only', path: 'Only the path and query differ', host: 'The host differs', port: 'The port differs', scheme: 'The scheme differs' }[c.target]; },
  columns: ['Origin of the requested address', 'Same as the page\'s origin', 'Request arrives at the server', 'Script reads the response'],
  simulate: function (c) {
    var t = this.T[c.target], pg = this.PAGE, ev = [], sum = [], B = '3 items';
    var parts = [t.scheme === pg.scheme, t.host === pg.host, t.port === pg.port], same = parts[0] && parts[1] && parts[2];
    var names = ['Scheme', 'Host', 'Port'], pv = [pg.scheme, pg.host, pg.port], tv = [t.scheme, t.host, t.port];
    var diffs = names.filter(function (n, i) { return !parts[i]; });
    var st = { pg: false, tg: false, cmp: false, pgTxt: 'Idle', bwTxt: 'Idle', svTxt: 'Idle', bwCls: 'plain', pgCls: 'plain', svCls: 'plain', rq: false, rs: false, pass: false, arrived: 'Not yet', read: 'Not yet' };
    function push(s, k) { ev.push({ s: s, k: k, snap: JSON.parse(JSON.stringify(st)) }); }
    // Step 1: open the page
    st.pg = true; st.pgTxt = 'Page is open'; st.pgCls = 'wait';
    push('When you type the address ' + pg.url + ' in the address bar of the browser, the browser gets this page from the server and shows it. This page contains a script (a program that the browser runs inside the page). The browser decides the origin of the page from the first three parts of the address. The scheme (' + pg.scheme + ') is which rules are used to communicate, the host (' + pg.host + ') is which site, and the port is a number that points to a program on one computer. The port is not written in the address, so the default port of ' + pg.scheme + ', ' + pg.port + ', is used. The combination of these three is the origin, and the origin of this page is ' + pg.origin + ' (the default port is not written).', '');
    // Step 2: the script is about to send a request
    st.tg = true; st.pgTxt = 'Requesting'; st.svTxt = 'Unknown yet';
    var portSay = t.written ? 'the port is written in the address as ' + t.port : 'the port is not written in the address, so the default port of ' + t.scheme + ', ' + t.port + ', is used';
    push('The script of the page is about to send a request to ' + t.url + '. The browser decides the origin of this address in the same way. The scheme is ' + t.scheme + ', the host is ' + t.host + ', and ' + portSay + '. The part after the host, ' + t.rest + ', is not part of the origin, so it is ignored. The origin of this requested address is ' + t.origin + '.', '');
    // Step 3: compare
    st.cmp = true; st.pgCls = 'hot'; st.svCls = 'hot';
    push('The browser compares the origin of the page with the origin of the requested address, three parts one by one. ' + names.map(function (n, i) { return n + ': page ' + pv[i] + ', request ' + tv[i] + ' → ' + (parts[i] ? 'same' : 'different'); }).join('. ') + '.', same ? '' : 'bad');
    // Step 4: conclusion
    if (same) push('All three are the same, so it is the same origin. A different path or query in the address does not affect the origin.', 'good');
    else push('The part that differs: ' + diffs.join(', ').toLowerCase() + '. If even one of the three differs, it is a different origin, so this request is a request to another origin.', 'bad');
    // Step 5: the request goes out
    st.rq = true; st.bwTxt = 'Forwarding'; st.svTxt = 'Got request'; st.arrived = 'Yes'; st.pgCls = 'wait'; st.svCls = 'wait'; st.bwCls = 'hot';
    push('The browser sends this request to the server. The request in this lab is an ordinary request (GET) by which the script fetches content, and ' + (same ? 'it goes to the same origin.' : 'even though it goes to another origin, the browser does not block this request and sends it to the server.') + ' The request arrived at the server.', '');
    // Step 6: the server answers
    st.rs = true; st.svTxt = 'Sent 200'; st.svCls = 'good';
    push('The server handles the request as usual and returns a 200 response with the body "' + B + '".' + (same ? '' : ' This server did not add to the response a mark saying that a page of another origin may read it.'), '');
    // Step 7: the browser checks the response
    if (same) {
      st.pass = true; st.bwTxt = 'Handed over'; st.bwCls = 'good';
      push('The browser checks the response. The requested address has the same origin as the page, so the browser hands the response to the script.', 'good');
      st.pgTxt = 'Read the body'; st.pgCls = 'good'; st.read = 'Yes';
      push('The script receives the response and reads the status 200 and the body "' + B + '".', 'good');
    } else {
      st.bwTxt = 'Blocked'; st.bwCls = 'bad';
      push('The browser checks the response. The requested address has a different origin from the page, and the response has no mark saying that it may be read, so the browser does not hand the response to the script. This rule, which keeps a script from reading a response from another origin, is the same-origin policy.', 'bad');
      st.pgTxt = 'Got an error'; st.pgCls = 'bad'; st.read = 'No';
      push('The script receives an error instead of the response (TypeError: Failed to fetch in Chrome 155 in our test run). It can read neither the status nor the body. From this error alone, you cannot tell whether the request arrived at the server. This is because we received the same error when the server was off and the connection failed.', 'bad');
      push('To let a script read a response from another origin, the server has to add to the response a mark saying that reading is allowed. That way is CORS, and its details are covered in the "CORS" lab.', '');
    }
    // Summary
    if (c.target === 'same') {
      sum.push('An origin is the combination of the scheme, host, and port of an address. This request has all three the same as the page, so it is the same origin, and the script could read the response.');
      sum.push('What the browser blocks is a script reading a response from another origin. The purpose of this rule is to keep the script of any page from reading the content of another site that you are logged in to.');
    } else if (c.target === 'path') {
      sum.push('Only the path and query (/other?x=1) changed, and the scheme, host, and port stayed the same, so it is the same origin. The script could read the response.');
      sum.push('Only the scheme, host, and port tell origins apart. Even if the later part of the address differs a lot, the origin does not change.');
    } else if (c.target === 'host') {
      sum.push('The host changed to api.shop.example, so it is a different origin. The server received and handled the request, but the browser did not hand the response to the script.');
      sum.push('If the host name differs even a little, it is a different origin. A site with api. added before shop.example is also treated as a different origin.');
    } else if (c.target === 'port') {
      sum.push('The port changed to 8443, so it is a different origin. The server received and handled the request, but the browser did not hand the response to the script.');
      sum.push('Even if the host is the same, a different port makes a different origin. An address with no port written is compared as the default port of https, 443.');
    } else {
      sum.push('The scheme changed to http, so it is a different origin. In this lab (127.0.0.1), the server received and handled the request, but the browser did not hand the response to the script.');
      sum.push('https and http are different origins even if the host is the same. This address has no port written, so the default port of http, 80, is used, which means the port also differs from 443.');
    }
    return { events: ev, summary: sum, tg: t, parts: parts, same: same, row: [t.origin, same ? 'Same origin' : 'Different origin', 'Yes', same ? 'Yes' : 'No'] };
  },
  render: function (v, sim, t, H, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : null;
    if (!s) { H.text(v, 'Click Run to start with the browser deciding the origin of the page.'); return; }
    var pg = this.PAGE, tg = sim.tg, pv = [pg.scheme, pg.host, pg.port], tv = [tg.scheme, tg.host, tg.port], names = ['Scheme', 'Host', 'Port'];
    H.table(v, ['Part of the origin', 'Page', 'Requested address', 'Comparison result'], names.map(function (n, i) {
      return { cls: s.tg ? '' : 'gone', cells: [n, s.pg ? pv[i] : 'Not yet', s.tg ? tv[i] : 'Not yet', s.cmp ? { v: sim.parts[i] ? 'Same' : 'Different', cls: sim.parts[i] ? 'good' : 'bad' } : 'Not yet'] };
    }), 'Origin comparison');
    H.table(v, ['Item', 'Value'], [
      { cls: s.arrived === 'Not yet' ? 'gone' : '', cells: ['Request arrives at the server', s.arrived] },
      { cls: s.read === 'Not yet' ? 'gone' : '', cells: ['Script reads the response', s.read === 'Not yet' ? 'Not yet' : { v: s.read, cls: s.read === 'Yes' ? 'good' : 'bad' }] },
    ], 'Result');
  },
  // Diagram: at the top, the three parts of an origin (scheme, host, port) are compared side by side for the page and the requested address (green if the same, red if different); at the bottom, the script of the page, the browser, and the server of the requested address. The request goes to the server, and the response is either handed from the browser to the script or blocked.
  draw: function (P, sim, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : null, pg = this.PAGE, tg = sim.tg;
    var pv = [pg.scheme, pg.host, pg.port], tv = [tg.scheme, tg.host, tg.port], names = ['Scheme', 'Host', 'Port'];
    P.size(680, 316);
    P.region('cmp', 10, 8, 660, 122, 'The three parts of an origin');
    names.forEach(function (n, i) {
      P.box('c' + i, 20 + i * 218, 36, 204, 82, { cls: s && s.cmp ? (sim.parts[i] ? 'good' : 'bad') : 'plain', title: n + (s && s.cmp ? (sim.parts[i] ? ': Same' : ': Different') : ''), sub: ['Page ' + (s && s.pg ? pv[i] : '...'), 'Request ' + (s && s.tg ? tv[i] : '...')] });
    });
    P.box('pg', 20, 152, 190, 76, { cls: s ? s.pgCls : 'plain', title: 'Script in the page', sub: [s && s.pg ? pg.origin : '...', s ? s.pgTxt : 'Idle'] });
    P.box('bw', 270, 152, 110, 76, { cls: s ? s.bwCls : 'plain', title: 'Browser', sub: s ? s.bwTxt : 'Idle' });
    P.box('sv', 450, 152, 210, 76, { cls: s ? s.svCls : 'plain', title: 'Requested server', sub: [s && s.tg ? tg.origin : '...', s ? s.svTxt : 'Idle'] });
    if (s && s.rq) { P.arrow('a1', 'pg:r:0.3', 'bw:l:0.3', { cls: 'hot' }); P.arrow('a2', 'bw:r:0.3', 'sv:l:0.3', { cls: 'hot' }); }
    if (s && s.rs) P.arrow('a3', 'sv:l:0.75', 'bw:r:0.75', { cls: 'good' });
    if (s && s.rs && s.pass) P.arrow('a4', 'bw:l:0.75', 'pg:r:0.75', { cls: 'good' });
    P.box('n1', 14, 262, 322, 36, { cls: s && s.arrived === 'Yes' ? 'wait' : 'ghost', title: 'Request arrives at the server', right: s ? s.arrived : 'Not yet' });
    P.box('n2', 344, 262, 322, 36, { cls: s && s.read !== 'Not yet' ? (s.read === 'Yes' ? 'good' : 'bad') : 'ghost', title: 'Script reads the response', right: s ? s.read : 'Not yet' });
  },
  assume: 'The code box is not a program that was run. It lists the address of the page that is open and the address that the script requests, and shop.example is a reserved example domain, so there is no real server behind it. So we checked in two layers. First, we calculated the origins of the six addresses on the screen (one page and five requested addresses) with the URL standard implementation of Node.js 24.18.0 (new URL(...).origin), and checked against the model whether they are the same origin and which of the scheme, host, and port differs. The same calculation also showed that the origin of https://shop.example:443/x comes out as https://shop.example, the same as for an address with no port written (the default port is left out), and that addresses with a different path and query have the same origin. Second, whether the browser hands the response to the script was checked by running Chrome 155 (HeadlessChrome) without a window in our test run (--headless=new --dump-dom). We started a test server on 127.0.0.1 that adds no CORS headers (on a free port), and made the script of the page that the server sent request the addresses below with fetch and write the result into the page. For the same origin, we requested /api/items of the same server; for only the path and query differing, /other?x=1 of the same server; for a different host, the name localhost on the same computer and the same port (the page was on 127.0.0.1); for a different port, a server on another port; and for a different scheme, we made an https request (with a self-signed certificate) to a server that takes http and https separately on the same port. In all five combinations the request arrived at the server; for the two same-origin ones the script read the status 200 and the body, and for the other three the script received a TypeError (Failed to fetch) and could not read it. The addresses in this experiment made the same differences as the addresses on the screen, but they are not the addresses on the screen themselves. The scheme experiment requested an https address from an http page, which is the opposite direction of the example on the screen (an http address from an https page), so we also ran the same direction as the screen (an http address from an https page) separately and confirmed that the script could not read it and that the request arrived at the server. The scheme example on the screen differs in the port too (80 for http, 443 for https) along with the scheme, but the Chrome experiment made only the scheme differ. A request to the same origin had no Origin header, and a request to another origin had an Origin header, but the screen does not cover this. When we requested a port where the server was off, the error the script received was the same TypeError (Failed to fetch) as in the blocked case, and when the server of the other origin wrote the origin of the page in Access-Control-Allow-Origin in its response, the script read the body. These are behaviors observed in this Chrome version, and we did not run other browsers or other versions. What we checked against the documentation is sections 3.2, 4, 5, and 6 of RFC 6454 (an origin is three values, the scheme, host, and port; if there is no port, the default port of the scheme is used; two origins are the same only when all three values are the same; and when an origin is written down, the default port is left out), sections 4.2, 4.4, and 4.7 of the WHATWG URL Standard (the default ports of http and https are 80 and 443, a default port is stored as null in a URL, and the origin of an http or https URL is a value made of the scheme, host, and port), the page Same-origin policy of MDN (addresses that differ only in the path are the same origin, reading from another origin is mostly blocked, the way to allow reading is CORS, and the purpose is to keep a script of a malicious page from reading the content of webmail you are logged in to), and the page Using the Fetch API of MDN (if the server of another origin does not send the allowing header, the browser does not share the response with the caller). The order in which the browser checks the allowing mark after receiving the response of the server, and the purpose of "protecting the content of other sites you are logged in to", follow the explanation in the documentation, and we did not run whether cookies actually go along. What the screen leaves out is the process of getting the page, the headers of the request and the response, and the interpretation of the response body. We covered only one ordinary GET request with no special headers. The case where the browser first asks the server before sending the request (a preflight request), requests that carry cookies, and the way a server allows reading (CORS) are covered in the in-depth lab "CORS", attacks aimed at origins in the in-depth lab "Three web attacks", and putting a page of another site into a frame in the in-depth lab "Clickjacking and open redirects". We also did not cover the fact that loading images and script files from another origin (embedding) is usually allowed, or the remaining origin rules (cookies, storage, and so on).',
});

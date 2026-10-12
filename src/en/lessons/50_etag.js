Lab.register({
  id: 'etag', nav: 'HTTP caching and ETag', cat: 'HTTP', mode: 'step',
  title: 'Do we have to fetch the same file again?',
  intro: 'A browser keeps a response it has received and uses it again later. If the server tells it, in the response headers, "how long it may use the response as it is" and "a tag for the version of the content (the ETag)", the browser can skip the request altogether or ask only "has it changed?".',
  terms: ['Conditional requests and ETag', 'HTTP status codes', 'Cache', 'CDN'], ranks: ['http', 'cache', 'rest'],
  controls: [
    { id: 'cc', label: 'Cache directive sent by the server', type: 'select', value: 'max', options: [['nostore', 'Cache-Control: no-store (do not store)'], ['max', 'Cache-Control: max-age=60 (use as it is for 60s)'], ['nocache', 'Cache-Control: no-cache (check every time before use)']] },
    { id: 'when', label: 'When the address is opened the second time', type: 'select', value: '120', options: [['30', '30s later'], ['120', '120s later']], show: function (c) { return c.cc === 'max'; } },
    { id: 'chg', label: 'The content on the server changed in the meantime', type: 'check', value: false },
  ],
  presets: [
    { t: 'Default settings', q: 'What is exchanged with the server when you open a file received with Cache-Control: max-age=60 again 120 seconds later?', d: 'The request is made again after the freshness lifetime has passed. If nothing changed, only a 304 comes back, with no body.', v: { cc: 'max', when: '120', chg: false } },
    { t: 'Open again within the freshness lifetime', q: 'What if you open the address the second time 30s later?', d: 'No request is sent to the server at all.', v: { cc: 'max', when: '30', chg: false } },
    { t: 'If the content changed', q: 'What if the content on the server changed in the meantime and you open the address 120s later?', d: 'The ETag is different, so the new content arrives with 200.', v: { cc: 'max', when: '120', chg: true } },
    { t: 'Content changes within the freshness lifetime', q: 'What if you open the address 30s later and the content on the server changed in the meantime?', d: 'The browser does not know, and it uses the old content.', v: { cc: 'max', when: '30', chg: true } },
    { t: 'no-store', q: 'What if the server sends Cache-Control: no-store?', d: 'Nothing is stored, so the whole response is received again every time.', v: { cc: 'nostore', when: '120', chg: false } },
    { t: 'no-cache', q: 'What if the server sends Cache-Control: no-cache?', d: 'The response is stored, but the server is asked every time before it is used.', v: { cc: 'nocache', when: '120', chg: false } },
  ],
  code: function (c) {
    var h = { nostore: 'CacheControl.noStore()', max: 'CacheControl.maxAge(60, TimeUnit.SECONDS)', nocache: 'CacheControl.noCache()' }[c.cc];
    return '@GetMapping("/products/{id}")\nResponseEntity<Product> get(@PathVariable long id) {\n    Product p = productService.find(id);\n    return ResponseEntity.ok()\n        .cacheControl(' + h + ')\n' + (c.cc === 'nostore' ? '' : '        .eTag("\\"v' + '" + p.getVersion() + "\\"")     // a tag for the version of the content\n') + '        .body(p);\n}\n\n// If the If-None-Match of the request equals the current ETag,\n// Spring responds with 304 Not Modified and no body';
  },
  label: function (c) { return { nostore: 'no-store', max: 'max-age=60 · ' + c.when + 's later', nocache: 'no-cache' }[c.cc] + (c.chg ? ' · content changed' : ' · content unchanged'); },
  columns: ['Request sent to the server the second time', 'Response', 'Body transferred', 'What appeared on screen'],
  simulate: function (c) {
    var ev = [], rows = [], sum = [], SIZE = 200, sent = SIZE, cache = 'None';
    function step(dir, what, res, s, k) { rows.push({ cells: [dir, what, { v: res, cls: k === 'bad' ? 'bad' : k === 'good' ? 'good' : '' }] }); ev.push({ s: s, k: k, snap: { rows: rows.slice(), cache: cache, sent: sent } }); }
    var hdr = { nostore: 'Cache-Control: no-store', max: 'Cache-Control: max-age=60, ETag: "v1"', nocache: 'Cache-Control: no-cache, ETag: "v1"' }[c.cc];
    step('Browser → Server', 'GET /products/1', '(first request)', 'This is the first time this address is opened. Nothing is stored in the browser, so it sends a request to the server.', '');
    cache = c.cc === 'nostore' ? 'None (storing is forbidden)' : 'Body 200KB, ETag "v1"' + (c.cc === 'max' ? ', fresh for 60s' : ', must be checked before each use');
    step('Server → Browser', '200 OK + 200KB body', hdr, 'The server sends the 200KB body together with a cache directive.' + (c.cc === 'nostore' ? ' Because of no-store, the browser does not store this response.' : ' The browser stores the body together with the ETag (a tag that marks the version of the content).'), '');
    var when = c.cc === 'max' ? +c.when : 120, req2, res2, body2, shown;
    if (c.chg) step('Server', 'Product data updated', 'ETag changes to "v2"', 'The product data changed on the server in the meantime. The ETag that the server computes is now "v2" too.', '');
    if (c.cc === 'nostore') { req2 = 'GET (no condition)'; res2 = '200 OK'; body2 = '200KB'; sent += SIZE; shown = c.chg ? 'New content' : 'Same content'; step('Browser → Server', 'GET /products/1', '200 OK + 200KB body', when + 's later, the same address is opened again. Nothing is stored, so the request is made exactly as the first time, and the whole body is received again.', 'bad'); sum.push('no-store does not store the response anywhere. Use it for responses that must not be left behind, such as personal data or payment screens. For anything else it is wasteful, because the whole response is received again every time.'); }
    else if (c.cc === 'max' && when < 60) { req2 = 'None'; res2 = '(no request sent)'; body2 = '0KB'; shown = c.chg ? 'Old content (unaware of the change)' : 'Same content'; step('Browser', 'Used straight from the cache', 'No request sent to the server', when + 's later, the same address is opened again. Less than 60s have passed since the response was received, so the browser uses the stored response as it is. The server does not even know that this request happened.' + (c.chg ? ' The content on the server has changed, but the browser has no way of knowing, so it shows the old content.' : ''), c.chg ? 'bad' : 'good'); sum.push('Within the freshness lifetime (max-age), the network is not used at all, which makes this the fastest case. In exchange, changes made on the server are not reflected during that time. So give a short lifetime to data that changes often, and a very long one to files that do not change (JS and CSS files with a hash in the name).'); }
    else {
      step('Browser → Server', 'GET /products/1 + If-None-Match: "v1"', '(conditional request)', when + 's later, the same address is opened again. ' + (c.cc === 'max' ? 'The freshness lifetime of 60s has passed.' : 'no-cache means the browser must check with the server before it uses the response.') + ' The browser does not throw away what it stored. It asks, "What I have is v1. Is it still the same?"', '');
      req2 = 'GET + If-None-Match';
      if (c.chg) { res2 = '200 OK'; body2 = '200KB'; sent += SIZE; shown = 'New content'; cache = 'Body 200KB, ETag "v2"'; step('Server → Browser', '200 OK + 200KB body', 'ETag: "v2"', 'The current ETag on the server is "v2". It differs from the "v1" that the browser sent, so the server sends the whole new body and the new ETag. The browser replaces what it stored.', ''); }
      else { res2 = '304 Not Modified'; body2 = '0KB'; shown = 'Same content'; step('Server → Browser', '304 Not Modified (no body)', 'ETag: "v1"', 'The current ETag on the server is "v1" too. Nothing has changed, so the server answers with just 304 and no body. The browser uses the body it stored as it is and starts the freshness lifetime again. The 200KB was not sent again.', 'good'); }
      sum.push(c.chg ? 'The content changed, so the new body was received. Thanks to the ETag, the whole body is received only when it has changed.' : 'A 304 response has no body, so almost nothing is transferred. One round trip still takes place, though, and the server has to do some work to find out the current ETag.');
      if (c.cc === 'nocache') sum.push('Despite its name, no-cache does not mean "do not store". It means "store it, but check with the server every time before using it". The directive that prevents storing is no-store.');
    }
    return { events: ev, summary: sum, row: [req2, res2, body2, shown] };
  },
  render: function (v, sim, t, H, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : { rows: [], cache: 'None', sent: 0 };
    if (s.rows.length) H.table(v, ['Direction', 'What was sent', 'Header / result'], s.rows, 'Between the browser and the server'); else H.text(v, 'Click Run to start.');
  },
  // Diagram: requests and responses between the browser and the server. When the browser uses the cache directly, no arrow to the server appears.
  draw: function (P, sim, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : { rows: [], cache: '', sent: 0 }, ids = { 'Browser': 'b', 'Server': 's' };
    var msgs = s.rows.map(function (r) { var m = P.dir(P.v(r.cells[0]), ids); m.s = P.v(r.cells[1]); m.cls = P.c(r.cells[1]) || P.c(r.cells[2]); return m; });
    var end = P.seq([['b', 'Browser', 'wait'], ['s', 'Server', 'wait']], msgs, { keep: 6 });
    P.box('cache', 16, end + 14, 440, 48, { cls: s.cache ? 'good' : 'ghost', title: 'Copy kept by the browser (cache)', sub: s.cache || 'None' });
    P.box('sent', 468, end + 14, 196, 48, { cls: 'plain', title: 'Total body received', sub: s.sent + 'KB' });
    P.size(680, end + 78);
    P.note('A step that has only a box on the browser side and no arrow is one where the browser used its stored copy without asking the server. A 304 response has arrows going back and forth but no body, so the amount transferred does not grow.');
  },
  assume: 'The body size of 200KB is an example. The meaning of the cache directives and of conditional requests follows the HTTP caching standard (RFC 9111) and the definition of conditional requests (RFC 9110). The same check can also be done with the last modified time (Last-Modified / If-Modified-Since) instead of the ETag. When the user clicks reload, the browser may send a validation request regardless of the freshness lifetime. It was checked with a local test server and a real browser (Chromium-based), with the freshness lifetime shortened to 2s for the test. A repeated request within the freshness lifetime did not reach the server; after it had passed, If-None-Match was attached and a 304 came back; and when the content had changed, a 200 and the new body came. With no-store, the whole response was received both times, and with no-cache, a conditional request was sent even when the request was repeated immediately. When the content on the server changed within the freshness lifetime, the browser kept using the old content.',
});

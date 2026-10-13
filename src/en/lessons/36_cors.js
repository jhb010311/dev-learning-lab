Lab.register({
  id: 'cors', nav: 'CORS', cat: 'HTTP', mode: 'step',
  title: 'Why a request works in Postman but is blocked only in the browser',
  intro: 'By default, a browser does not let a script on a web page read a response from a server at a different origin. The block is lifted only when the server says in a response header that this origin is allowed.',
  terms: ['CORS and the same-origin policy', 'Preflight request', 'HTTP methods', 'Cookie'], ranks: ['websec', 'http', 'network'],
  controls: [
    { id: 'api', label: 'Address of the API server (the page is https://shop.example)', type: 'select', value: 'cross', options: [['same', 'https://shop.example/api (same origin)'], ['cross', 'https://api.shop.example (different origin)']] },
    { id: 'req', label: 'Request sent by the script', type: 'select', value: 'json', options: [['simple', 'GET, no extra headers'], ['json', 'POST, Content-Type: application/json'], ['auth', 'GET, with an Authorization header'], ['del', 'DELETE']] },
    { id: 'cred', label: 'Send cookies with the request (credentials: include)', type: 'check', value: false, show: function (c) { return c.api === 'cross'; } },
    { id: 'srv', label: 'CORS settings on the server', type: 'select', value: 'none', options: [['none', 'No settings'], ['star', 'Allow all origins (*)'], ['exact', 'Allow only https://shop.example + allow cookies']], show: function (c) { return c.api === 'cross'; } },
  ],
  presets: [
    { t: 'Default settings', q: 'What happens when a script sends a JSON POST to the different origin https://api.shop.example and the server has no CORS settings?', d: 'A JSON POST to a different origin. The server has no settings, so the request is blocked at the preflight request.', v: { api: 'cross', req: 'json', cred: false, srv: 'none' } },
    { t: 'When the server allows the origin', q: 'What if you set the CORS settings on the server to allow only https://shop.example and allow cookies?', d: 'The preflight request passes, and the actual request is sent.', v: { api: 'cross', req: 'json', cred: false, srv: 'exact' } },
    { t: 'Simple GET, no server settings', q: 'What if the request sent by the script is a GET with no extra headers?', d: 'The request reaches the server and is handled. Only the response is not passed to the script.', v: { api: 'cross', req: 'simple', cred: false, srv: 'none' } },
    { t: 'Allow all origins + cookies', q: 'What if a GET with no extra headers sends cookies and the server allows all origins (*)?', d: '* and cookies cannot be used together.', v: { api: 'cross', req: 'simple', cred: true, srv: 'star' } },
    { t: 'If the origin is the same', q: 'What if the address of the API server is https://shop.example/api, the same origin?', d: 'There is no CORS check at all.', v: { api: 'same', req: 'json', cred: false, srv: 'none' } },
  ],
  code: function (c) {
    var url = c.api === 'same' ? '/api/orders' : 'https://api.shop.example/orders', opt = [];
    if (c.req === 'json') opt.push("method: 'POST'", "headers: { 'Content-Type': 'application/json' }", 'body: JSON.stringify(order)');
    if (c.req === 'auth') opt.push("headers: { Authorization: 'Bearer ' + token }");
    if (c.req === 'del') opt.push("method: 'DELETE'");
    if (c.api === 'cross' && c.cred) opt.push("credentials: 'include'");
    var js = '// Script on the page https://shop.example\nfetch(\'' + url + '\'' + (opt.length ? ', {\n    ' + opt.join(',\n    ') + '\n}' : '') + ');';
    if (c.api === 'same') return js;
    var srv = c.srv === 'none' ? '// Server: no CORS settings' : '// Server (Spring)\n@Bean\nCorsConfigurationSource corsConfigurationSource() {\n    var cfg = new CorsConfiguration();\n    cfg.' + (c.srv === 'star' ? 'addAllowedOrigin("*");' : 'addAllowedOrigin("https://shop.example");\n    cfg.setAllowCredentials(true);') + '\n    cfg.addAllowedMethod("*");\n    cfg.addAllowedHeader("*");\n    ...\n}';
    return js + '\n\n' + srv;
  },
  label: function (c) { return (c.api === 'same' ? 'Same origin' : 'Different origin') + ' · ' + { simple: 'Simple GET', json: 'JSON POST', auth: 'Authorization header', del: 'DELETE' }[c.req] + (c.api === 'cross' ? (c.cred ? ' · with cookies' : '') + ' · server ' + { none: 'no settings', star: '* allowed', exact: 'origin specified' }[c.srv] : ''); },
  columns: ['Preflight request', 'Actual request reaches the server', 'Script receives the response', 'Why it is blocked'],
  judge: function (c) {
    if (c.api === 'same') return { pre: false, reached: true, ok: true, why: '' };
    var pre = c.req !== 'simple', allow = c.srv === 'exact' || (c.srv === 'star' && !c.cred), why = c.srv === 'none' ? 'The response has no Access-Control-Allow-Origin header' : c.srv === 'star' && c.cred ? 'A request that sends cookies cannot use *' : '';
    return { pre: pre, reached: pre ? allow : true, ok: allow, why: why };
  },
  simulate: function (c) {
    var j = this.judge(c), ev = [], rows = [], sum = [], M = { simple: 'GET', json: 'POST', auth: 'GET', del: 'DELETE' }[c.req];
    function push(s, k) { ev.push({ s: s, k: k, snap: { rows: rows.slice() } }); }
    function row(who, what, res, cls) { rows.push({ cells: [who, what, { v: res, cls: cls }] }); }
    if (c.api === 'same') {
      row('Browser', M + ' /api/orders', 'Sent', ''); push('The page (https://shop.example) and the API have the same origin. An origin is the combination of scheme, host, and port. There is no restriction between two parts of the same origin, so the browser simply sends the request.', '');
      row('Server', 'Handles the request', '200 OK', 'good'); row('Browser', 'Passes the response to the script', 'Passed', 'good'); push('The server responds, and the script receives the result. No CORS headers are needed.', 'good');
      sum.push('CORS does not come into play within the same origin. This is why CORS problems do not occur when you put the front end and the API on the same origin (same host and port, with a reverse proxy) or use the proxy feature of a development server.');
      return { events: ev, summary: sum, row: ['None', 'Yes', 'Yes', '-'] };
    }
    push('The origin of the page is https://shop.example, and the origin of the API is https://api.shop.example. The hosts differ, so the origins differ. The browser first decides whether this is a kind of request that it may simply send.', '');
    if (j.pre) {
      var reason = c.req === 'json' ? 'the Content-Type is application/json' : c.req === 'auth' ? 'an Authorization header is attached' : 'the method is DELETE';
      row('Browser', 'OPTIONS /orders (preflight request)', 'Sent', 'hot'); push('This is not a simple request (' + reason + '). Before sending the actual request, the browser first asks the server with the OPTIONS method whether it may send a request like this. The script did not ask for this request. The browser sends it on its own.', '');
      if (j.ok) { row('Server', 'Preflight', 'Access-Control-Allow-Origin: ' + (c.srv === 'star' ? '*' : 'https://shop.example') + ' + Allow headers', 'good'); push('The server returns the origins, methods, and headers it allows in response headers. The browser checks them and decides that the actual request may be sent.', 'good'); }
      else { row('Server', 'Preflight', c.srv === 'none' ? 'No Allow headers' : 'Access-Control-Allow-Origin: *', 'bad'); row('Browser', M + ' /orders (actual request)', 'Not sent', 'bad'); push('The server\'s response does not meet the conditions (' + j.why + '). The browser does not send the actual request at all, and reports a network error to the script. The order-handling code on the server did not run.', 'bad'); }
    } else push('This is a simple request: a GET with no special headers. The browser sends it right away, with no preflight request.', '');
    if (j.reached) {
      row('Browser', M + ' /orders (actual request)' + (c.cred ? ' + cookies' : ''), 'Sent', ''); row('Server', 'Handles the request', '200 OK' + (c.srv === 'none' ? ' (no Allow headers)' : ''), j.ok ? 'good' : 'hot');
      push('The actual request reaches the server, and the server handles it and responds as usual.' + (j.ok ? '' : ' On the server side, processing finished without any problem.'), '');
      if (j.ok) { row('Browser', 'Passes the response to the script', 'Passed', 'good'); push('The response has a header that allows this origin. The browser hands the response to the script.', 'good'); }
      else { row('Browser', 'Passes the response to the script', 'Blocked', 'bad'); push('The browser checks the response headers. ' + j.why + '. It does not hand the response to the script, and it prints a CORS error to the console. The server has already handled the request.', 'bad'); }
    }
    if (!j.ok) sum.push('CORS is a rule that the browser enforces, not the server. That is why the same request works from Postman or curl, and in calls between servers. The fix is for the API server to send the Allow headers, not for the front end to change.');
    if (!j.pre && !j.ok) sum.push('A simple request reaches the server and runs without any check beforehand. All the browser blocks is reading the response. CORS is not a mechanism that protects the server, so a request that changes state has to be protected with authentication and CSRF countermeasures.');
    if (c.srv === 'star' && c.cred) sum.push('For a request that carries cookies or other credentials, the server must give the exact origin in Access-Control-Allow-Origin and also send Access-Control-Allow-Credentials: true.');
    if (j.ok && j.pre) sum.push('A preflight request adds one more round trip each time. If the server sends Access-Control-Max-Age, the browser remembers the result for that time and does not ask again.');
    if (!sum.length) sum.push('Preflight request: ' + (j.pre ? 'sent' : 'not sent') + '. The actual request ' + (j.reached ? 'reached' : 'did not reach') + ' the server, and the script ' + (j.ok ? 'received' : 'did not receive') + ' the response.');
    return { events: ev, summary: sum, row: [j.pre ? 'Sent' : 'Not sent', j.reached ? 'Yes' : 'No', j.ok ? 'Yes' : 'No', j.why || '-'] };
  },
  render: function (v, sim, t, H, shown) {
    var last = shown[shown.length - 1], rows = last ? last.snap.rows : [];
    if (rows.length) H.table(v, ['Who', 'What', 'Result'], rows, 'What passed between the browser and the server'); else H.text(v, 'Nothing has passed yet.');
  },
  // Diagram: the browser and a server at a different origin. The key points are where the browser does not send the request and where it does not pass the response to the script.
  draw: function (P, sim, shown) {
    var last = shown[shown.length - 1], rows = last ? last.snap.rows : [];
    var msgs = rows.map(function (r) {
      var who = P.v(r.cells[0]), what = P.v(r.cells[1]), res = P.v(r.cells[2]), cls = P.c(r.cells[2]);
      if (who === 'Server') return { f: 's', t: 'b', s: what + ': ' + res, cls: cls === 'hot' ? '' : cls };
      if (what.indexOf('to the script') >= 0) return { f: 'b', s: res === 'Blocked' ? 'Response not passed to the script (blocked)' : 'Response passed to the script', cls: cls };
      if (res === 'Not sent') return { f: 'b', s: what + ': not sent', cls: 'bad' };
      return { f: 'b', t: 's', s: what, cls: cls === 'hot' ? '' : cls };
    });
    var end = P.seq([['b', 'Browser', 'wait'], ['s', 'API server', 'wait']], msgs, { keep: 5 });
    P.size(680, end + 16);
    P.note('The one that blocks is the browser, not the server. The server handles a request as usual when it receives it, and the browser looks at the Allow headers in the response to decide whether to pass it to the script. If the preflight request is not allowed, the actual request is not sent at all.');
  },
  assume: 'Where the server allows the origin, it is assumed to allow all methods and headers as well. The conditions for a simple request (the method is GET, HEAD, or POST, there are no extra headers, and the Content-Type is a form submission type or text/plain), the preflight request, and the rules when cookies are included follow the explanations in the Fetch standard and the MDN documentation. The 24 combinations of requests to a different origin (4 kinds of request × cookies included or not × 3 server settings) were run with two local test servers and a real browser (Chromium-based). Whether a preflight request was sent, whether the actual request reached the server, and whether the script received the response all matched the model.',
});

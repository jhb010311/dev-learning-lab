Lab.register({
  id: 'redirect', nav: 'Redirection', cat: 'HTTP', mode: 'step',
  title: 'When a server says "go to another address", how does the next request go out?',
  intro: 'Instead of handling a request itself, a server can use a 3xx status code and the Location header to tell the client "send the request again to this address". This is called redirection. The codes 301, 302, 303, 307, and 308 all look like the same instruction, but they differ in whether the move is permanent or temporary and in whether the method of the next request is kept.',
  terms: ['Redirection and the Location header', 'Post-Redirect-Get pattern', 'HTTP status codes', 'HTTP methods', 'Safe methods and idempotent methods'],
  controls: [
    { id: 'code', label: 'Status code the server responds with', type: 'select', value: '302', options: [['301', '301 Moved Permanently'], ['302', '302 Found'], ['303', '303 See Other'], ['307', '307 Temporary Redirect'], ['308', '308 Permanent Redirect']] },
    { id: 'm', label: 'Request the client sent first', type: 'select', value: 'POST', options: [['GET', 'GET /order (no body)'], ['POST', 'POST /order (body: item=keyboard)'], ['PUT', 'PUT /order (body: item=keyboard)']] },
    { id: 'dest', label: 'Address that Location points to', type: 'select', value: 'ok', options: [['ok', '/orders responds normally'], ['loop', '/orders also points back to /order (they point to each other)']], hint: 'If a configuration mistake makes two addresses point to each other, the redirect never ends.' },
  ],
  presets: [
    { t: 'Default settings', q: 'When you send POST /order (body: item=keyboard) and the server responds with 302 Found pointing to /orders, how does the next request go out?', d: 'The server responds to a POST with 302. The next request becomes a GET and the body is lost.', v: { code: '302', m: 'POST', dest: 'ok' } },
    { t: 'With 307, the POST stays a POST', q: 'What if the server responds with the status code 307 Temporary Redirect?', d: 'The request is sent again to the new address without changing the method or the body.', v: { code: '307', m: 'POST', dest: 'ok' } },
    { t: '303: get the result with GET', q: 'What if the server responds with the status code 303 See Other?', d: 'This is the approach used to send the user to a result page after a form is submitted.', v: { code: '303', m: 'POST', dest: 'ok' } },
    { t: 'Sending a PUT with 301', q: 'What if the status code is 301 Moved Permanently and the first request is PUT /order?', d: 'Only a POST is changed to GET. A PUT goes on unchanged.', v: { code: '301', m: 'PUT', dest: 'ok' } },
    { t: 'Permanent redirect 308', q: 'What if the server responds with the status code 308 Permanent Redirect?', d: 'It is a permanent move like 301, but it keeps the method.', v: { code: '308', m: 'POST', dest: 'ok' } },
    { t: 'Redirects that point to each other', q: 'What if the first request is GET /order and /orders also points back to /order?', d: 'There is no end, so the client stops by itself at a limit it has set.', v: { code: '302', m: 'GET', dest: 'loop' } },
  ],
  CODES: {
    '301': { name: 'Moved Permanently', kind: 'Permanent', rule: 'May change POST to GET (allowed)' },
    '302': { name: 'Found', kind: 'Temporary', rule: 'May change POST to GET (allowed)' },
    '303': { name: 'See Other', kind: 'Retrieve with GET', rule: 'Retrieves with GET' },
    '307': { name: 'Temporary Redirect', kind: 'Temporary', rule: 'Must not change the method' },
    '308': { name: 'Permanent Redirect', kind: 'Permanent', rule: 'Must not change the method' },
  },
  code: function (c) {
    var K = this.CODES[c.code], loop = c.dest === 'loop';
    var srv = '// Server (Node.js)\nhttp.createServer((req, res) => {\n    if (req.url === \'/order\') {\n        res.writeHead(' + c.code + ', { Location: \'/orders\' });    // ' + c.code + ' ' + K.name + '\n        return res.end();                              // only gives directions, with no body\n    }\n' + (loop ? '    if (req.url === \'/orders\') {\n        res.writeHead(' + c.code + ', { Location: \'/order\' });     // wrong setting: points to /order again\n        return res.end();\n    }\n' : '') + '    res.writeHead(200);\n    res.end(\'Order list\');\n});';
    var opt = c.m === 'GET' ? '' : ', {\n    method: \'' + c.m + '\',\n    body: \'item=keyboard\'\n}';
    var curl = c.m === 'GET' ? 'curl -L http://shop.example/order' : c.m === 'POST' ? 'curl -L -d \'item=keyboard\' http://shop.example/order' : 'curl -L -T body.txt http://shop.example/order';
    return srv + '\n\n// Client 1: fetch follows Location unless you tell it otherwise\nawait fetch(\'http://shop.example/order\'' + opt + ');\n\n// Client 2: curl follows it only when you add -L\n// ' + curl;
  },
  label: function (c) { return c.code + ' · ' + c.m + (c.dest === 'loop' ? ' · pointing at each other' : ''); },
  columns: ['Kind', 'Method handling set by the standard', 'Second request (fetch, curl -L)', 'Requests that reached the server', 'How it ended'],
  // Method and body of the second request: a 303 changes any request that is not a GET into a GET, and a 301 or 302 changes only a POST into a GET. A 307 or 308 leaves them as they are.
  nextReq: function (c) {
    var hasBody = c.m !== 'GET', toGet = hasBody && (c.code === '303' || (c.m === 'POST' && (c.code === '301' || c.code === '302')));
    return { m: toGet ? 'GET' : c.m, body: hasBody && !toGet, toGet: toGet };
  },
  simulate: function (c) {
    var K = this.CODES[c.code], nx = this.nextReq(c), loop = c.dest === 'loop', hasBody = c.m !== 'GET', ev = [], sum = [];
    var st = { msgs: [], n: 0, done: '' };
    function push(s, k) { ev.push({ s: s, k: k, snap: JSON.parse(JSON.stringify(st)) }); }
    function msg(f, t, what, mean, cls) { st.msgs.push({ f: f, t: t, s: what, mean: mean, cls: cls || '' }); }
    var first = c.m + ' /order' + (hasBody ? ' + body' : ''), next = nx.m + ' /orders' + (nx.body ? ' + body' : ' (no body)');
    var line = c.code + ' ' + K.name;
    st.n = 1; msg('c', 's', first, 'First request');
    push('The client sends the request ' + first + '. ' + (hasBody ? 'The body holds the content of the order (item=keyboard).' : 'It is a read request, so it has no body.'), '');
    msg('s', 'c', line + ', Location: /orders', K.kind);
    var kindWhy = { 'Permanent': 'is a permanent redirect. It means that this address will be /orders from now on, so the client may remember the new address and send later requests there directly.', 'Temporary': 'is a temporary redirect. It means "go to /orders just this time", so the client must still send the next request to the original address, /order, first.', 'Retrieve with GET': 'does not mean that the address has moved. It means "get the result from /orders".' }[K.kind];
    push('The server responds with ' + line + '. The Location header of the response holds the next address to request, /orders. A ' + c.code + ' response ' + kindWhy, '');
    var why;
    if (c.code === '307' || c.code === '308') why = 'The standard (RFC 9110) says that the method must not change on a 307 or 308. ' + (hasBody ? 'The client decides to send the ' + c.m + ' method and the body again as they are.' : 'The client decides to send GET again as it is.');
    else if (c.code === '303') why = 'The standard (RFC 9110) says that after a 303, the client retrieves the address in Location with GET. ' + (hasBody ? 'The client decides to change the ' + c.m + ' method to GET and not to send the body.' : 'The request was already a GET, so nothing changes.');
    else if (c.m === 'POST') why = 'The standard (RFC 9110) allows changing POST to GET on a 301 or 302. It is not required, but fetch and curl really do change it to GET and drop the body.';
    else if (c.m === 'PUT') why = 'The only method that the standard (RFC 9110) allows to be changed on a 301 or 302 is POST. fetch and curl decide to send the PUT method and the body again as they are.';
    else why = 'There is nothing to change for a GET. The client decides to send GET as it is.';
    msg('c', '', nx.toGet ? 'Changes ' + c.m + ' to GET' : 'Keeps ' + c.m, 'Chooses the next request', nx.toGet && c.code !== '303' ? 'bad' : '');
    push('The client reads Location and builds the next request. ' + why, nx.toGet && c.code !== '303' ? 'bad' : '');
    st.n = 2; msg('c', 's', next, 'Second request');
    push('The client sends the request ' + next + '. The user did not ask for this second request. The client sends it by itself after reading Location.' + (nx.toGet ? ' The body of the first request is not carried in this request.' : ''), '');
    var count, end;
    if (!loop) {
      st.done = '200 OK'; msg('s', 'c', '200 OK', 'Final response', 'good');
      push('The server for /orders responds with 200 OK. ' + (nx.toGet ? 'What it received is a GET, so it returns the list of orders. The body sent in the first request never reached this server.' : nx.body ? 'It receives the ' + c.m + ' request and the body as they are and handles them.' : 'It returns the list of orders.') + ' Only this last response is passed to the code that sent the request.', nx.toGet && c.code !== '303' ? '' : 'good');
      count = '2'; end = '200 OK';
    } else {
      var back = nx.m + ' /order' + (nx.body ? ' + body' : '');
      msg('s', 'c', line + ', Location: /order', 'Sent back', 'bad');
      push('The server for /orders also returns the same ' + c.code + ' response, and its Location points to /order again. The two addresses point to each other.', 'bad');
      st.n = 3; msg('c', 's', back, 'Third request');
      push('As instructed, the client sends the request ' + back + '. This is the very address it requested first.', '');
      st.n = 'keeps growing'; msg('*', '', 'The same responses and requests repeat again and again', 'Never ends', 'bad');
      push('/order points to /orders again, and /orders points to /order again. Neither answers with 200, so this back and forth does not end by itself.' + (nx.body ? ' The body is sent again with every request.' : ''), 'bad');
      st.n = 'fetch 21, curl 51'; st.done = 'Stopped with an error'; msg('c', '', 'Stops at its limit and reports an error', 'Client stops', 'bad');
      push('The client stops by itself. fetch follows 20 redirects and then reports a "redirect count exceeded" error, and curl follows 50 and then reports a "Maximum (50) redirects followed" error. By then, 21 requests had reached the server in the case of fetch and 51 in the case of curl.', 'bad');
      count = 'fetch 21, curl 51'; end = 'Stopped with an error (after following 20 redirects in fetch, 50 in curl)';
    }
    if (nx.toGet && c.code !== '303') sum.push('Changing POST to GET on a 301 or 302 is something the standard permits ("it is allowed"), and most clients, including browsers, do it. The body is lost when this happens. To pass the POST on to the new address as it is, use 307 (temporary) or 308 (permanent).');
    if (c.code === '303') sum.push(hasBody ? 'A 303 is used to send the user to a result page after a form is submitted. The second request is a GET, so even if the user presses refresh, the form is not submitted again. This approach is called the Post-Redirect-Get pattern.' : 'A 303 is mainly used after a POST, to tell the client "see the result at this address with GET". If the request was a GET from the start, the result is the same as with 302 or 307.');
    if ((c.code === '307' || c.code === '308') && hasBody) sum.push('307 and 308 were added later to guarantee that the method and the body do not change. 307 is the "keep the method" version of 302, and 308 is the "keep the method" version of 301.');
    if ((c.code === '301' || c.code === '302') && c.m === 'PUT') sum.push('On a 301 or 302, only a POST is changed to GET. A method such as PUT or DELETE is kept. To avoid confusion, when the method has to be kept, it is clearer to use 307 or 308 from the start.');
    if (c.m === 'GET') sum.push('A GET request goes out as a GET whichever code redirects it. The method differences among the five codes show only in requests that have a body, such as a POST. With a GET, the only difference is whether the move is permanent (301, 308) or not.');
    if (K.kind === 'Permanent' && !loop) sum.push('A permanent redirect is hard to undo once you have sent it, because a browser can remember the new address and, from then on, go straight to it without sending requests to the old address. When you are not sure, start with a temporary redirect.');
    if (loop) sum.push('The standard says only that a client should detect an endless redirect and stop, and it does not set a number of redirects. So the limit differs from client to client (20 for fetch, 50 for curl). In a browser, this becomes an error page that says there were too many redirects. The cause is most often two rules that point to each other.');
    return { events: ev, summary: sum, next: next, row: [K.kind, K.rule, next, count, end] };
  },
  render: function (v, sim, t, H, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : null, c = sim.c, CODES = this.CODES;
    if (!s) { H.text(v, 'Click Run to see the requests and responses go back and forth one at a time.'); return; }
    H.counters(v, [[s.n + '', 'Requests that reached the server']]);
    H.table(v, ['Who', 'Sent', 'Meaning'], s.msgs.map(function (m) { return { cells: [m.f === '*' ? 'Both' : m.f === 'c' ? (m.t ? 'Client → server' : 'Client') : 'Server → client', { v: m.s, cls: m.cls === 'bad' ? 'bad' : m.cls === 'good' ? 'good' : '' }, m.mean] }; }), 'Between the client and the server');
    H.table(v, ['Code', 'Kind', 'Method handling set by the standard'], ['301', '302', '303', '307', '308'].map(function (k) { var X = CODES[k]; return { cells: [{ v: k + ' ' + X.name, cls: k === c.code ? 'hot' : '' }, X.kind, X.rule] }; }), 'The five redirection status codes');
  },
  // Diagram: a sequence diagram between the client and the server. The key point is that the client, after receiving a 3xx response, sends the second request by itself.
  draw: function (P, sim, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : { msgs: [], n: 0, done: '' }, c = sim.c, K = this.CODES[c.code];
    var end = P.seq([['c', 'Client', 'wait'], ['s', 'Server (shop.example)', 'wait']], s.msgs.map(function (m) { return { f: m.f, t: m.t || undefined, s: m.s, cls: m.cls }; }), { keep: 8 });
    P.box('kind', 16, end + 14, 320, 36, { cls: s.msgs.length > 1 ? 'hot' : 'ghost', title: c.code + ' ' + K.name, right: K.kind });
    P.box('next', 344, end + 14, 320, 36, { cls: s.msgs.length > 3 ? (sim.next.indexOf('no body') >= 0 && c.m !== 'GET' && c.code !== '303' ? 'bad' : 'good') : 'ghost', title: 'Second request', right: s.msgs.length > 3 ? sim.next : '?' });
    P.size(680, end + 66);
    P.note('The server only gives the address with Location, and it is the client that sends the request to that address again. So the method and the body of the second request are decided by the client, based on the status code.');
  },
  assume: '30 combinations (5 status codes × 3 methods × 2 destinations) were run against a test server started on 127.0.0.1 with two clients (fetch in Node.js 24 and curl 8.21 with the -L option), and the method and body of the second request, the number of requests that reached the server, and how it ended were confirmed to match the model. The second request of the two clients was the same in every combination, and only the number of redirects after which they stop differed (20 for fetch, 50 for curl). This number differs from client to client, and curl can change it with --max-redirs. The limit and the error page of browsers were not verified by execution. The "Kind" and "Method handling set by the standard" columns are not execution results; they restate the wording of the HTTP standard (RFC 9110, section 15.4). The rule that only a POST is changed to GET on 301 and 302, and that every method other than GET and HEAD is changed to GET on 303, is written in the Fetch standard (HTTP-redirect fetch). The explanation that browsers remember a permanent redirect follows from the standard defining 301 and 308 responses as responses that can be stored even when no explicit instruction says so, and it was not verified by execution. Whether to follow a redirect is up to the client. It was confirmed on the same test server that the http module of Node, curl without -L, and fetch called with redirect: \'manual\' do not follow it and return the 3xx response as it is. The PUT in curl was sent with -T (upload a file). When you specify the method directly with -X in curl, that method is used as it is even after a redirect, so the result differs.',
});

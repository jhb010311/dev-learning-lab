Lab.register({
  id: 'httpmsg', nav: 'HTTP messages and status codes', cat: 'HTTP', mode: 'step',
  title: 'This is what a request and a response look like as text',
  intro: 'The HTTP messages that a browser and a server exchange are text with a fixed shape. A request has "what" (the address) and "how" (the method) on its first line, and a response has "how it went" (the status code) on its first line.',
  terms: ['HTTP as a stateless protocol', 'HTTP methods', 'HTTP status codes', 'REST', 'URI and URL'], ranks: ['http', 'rest'],
  controls: [
    { id: 'sc', label: 'Situation', type: 'select', value: 'get', options: [['get', 'Get order 1'], ['create', 'Create a new order'], ['delete', 'Delete order 1'], ['bad', 'Create an order with a required value missing'], ['noauth', 'Get an order without logging in'], ['forbid', 'Get another user\'s order'], ['missing', 'Get order 999, which does not exist'], ['moved', 'Get an old path whose address has changed'], ['error', 'An exception is thrown in server code']] },
  ],
  presets: [
    { t: 'Default settings', q: 'What text do the request and the response look like when you get order 1?', d: 'A successful read. The response comes with 200 and a body.', v: { sc: 'get' } },
    { t: 'Create a new order', q: 'What if you create a new order?', d: 'The response is 201, and it tells you the address of the newly created order.', v: { sc: 'create' } },
    { t: 'Invalid request', q: 'What if you create an order with a required value missing?', d: '400. The sender has to fix it.', v: { sc: 'bad' } },
    { t: 'Not logged in / No permission', q: 'What if you get an order without logging in?', d: 'Switch back and forth to see the difference between 401 and 403.', v: { sc: 'noauth' } },
    { t: 'Order that does not exist', q: 'What if you get order 999, which does not exist?', d: '404. There is nothing at the address.', v: { sc: 'missing' } },
    { t: 'Server error', q: 'What if an exception is thrown in server code?', d: '500. The server has to fix it, not the sender.', v: { sc: 'error' } },
  ],
  CASES: {
    get: { req: ['GET /orders/1 HTTP/1.1', 'Host: shop.example', 'Authorization: Bearer eyJ…'], body: '', status: '200 OK', hdr: ['Content-Type: application/json'], rbody: '{"id":1,"item":"keyboard","quantity":2}', who: 'None', next: 'Use the body that was received' },
    create: { req: ['POST /orders HTTP/1.1', 'Host: shop.example', 'Authorization: Bearer eyJ…', 'Content-Type: application/json'], body: '{"item":"keyboard","quantity":2}', status: '201 Created', hdr: ['Content-Type: application/json', 'Location: /orders/7'], rbody: '{"id":7}', who: 'None', next: 'The address in Location is the new order' },
    delete: { req: ['DELETE /orders/1 HTTP/1.1', 'Host: shop.example', 'Authorization: Bearer eyJ…'], body: '', status: '204 No Content', hdr: [], rbody: '', who: 'None', next: 'Check only that it succeeded, with no body' },
    bad: { req: ['POST /orders HTTP/1.1', 'Host: shop.example', 'Authorization: Bearer eyJ…', 'Content-Type: application/json'], body: '{"item":"keyboard"}', status: '400 Bad Request', hdr: ['Content-Type: application/json'], rbody: '{"message":"quantity is required"}', who: 'The sender (client)', next: 'Fix the request and send it again. Sending it again as it is gives the same result' },
    noauth: { req: ['GET /orders/1 HTTP/1.1', 'Host: shop.example'], body: '', status: '401 Unauthorized', hdr: ['WWW-Authenticate: Bearer'], rbody: '', who: 'The sender (client)', next: 'Log in, attach the credentials, and request again' },
    forbid: { req: ['GET /orders/55 HTTP/1.1', 'Host: shop.example', 'Authorization: Bearer eyJ…'], body: '', status: '403 Forbidden', hdr: ['Content-Type: application/json'], rbody: '{"message":"No access permission"}', who: 'The sender (client)', next: 'Logging in again with the same account gives the same result. The account needs permission' },
    missing: { req: ['GET /orders/999 HTTP/1.1', 'Host: shop.example', 'Authorization: Bearer eyJ…'], body: '', status: '404 Not Found', hdr: ['Content-Type: application/json'], rbody: '{"message":"Order not found"}', who: 'The sender (client)', next: 'Check that the address (the order number) is correct' },
    moved: { req: ['GET /order-list HTTP/1.1', 'Host: shop.example'], body: '', status: '301 Moved Permanently', hdr: ['Location: /orders'], rbody: '', who: 'None', next: 'The browser automatically requests again at the address in Location' },
    error: { req: ['GET /orders/1 HTTP/1.1', 'Host: shop.example', 'Authorization: Bearer eyJ…'], body: '', status: '500 Internal Server Error', hdr: ['Content-Type: application/json'], rbody: '{"message":"A server error occurred"}', who: 'The server', next: 'There is nothing wrong with the request. The server has to fix it, and trying again after a short while is possible' },
  },
  code: function (c) {
    return { get: '@GetMapping("/orders/{id}")\nOrderDto get(@PathVariable long id) {\n    return orderService.find(id);                 // 200 OK + JSON body\n}', create: '@PostMapping("/orders")\nResponseEntity<OrderDto> create(@RequestBody @Valid OrderRequest req) {\n    OrderDto saved = orderService.create(req);\n    return ResponseEntity.created(URI.create("/orders/" + saved.id()))   // 201 + Location\n                         .body(saved);\n}', delete: '@DeleteMapping("/orders/{id}")\n@ResponseStatus(HttpStatus.NO_CONTENT)            // 204, no body\nvoid delete(@PathVariable long id) {\n    orderService.delete(id);\n}', bad: '@PostMapping("/orders")\nResponseEntity<OrderDto> create(@RequestBody @Valid OrderRequest req) { ... }\n\nrecord OrderRequest(@NotBlank String item, @NotNull Integer quantity) { }\n// If validation fails, the body of the controller method does not run, and the response is 400', noauth: '// Spring Security: a request with no credentials\nhttp.authorizeHttpRequests(a -> a.anyRequest().authenticated());\n// 401 before it reaches the controller', forbid: '@GetMapping("/orders/{id}")\nOrderDto get(@PathVariable long id, @AuthenticationPrincipal Member me) {\n    Order order = orderService.find(id);\n    if (!order.isOwnedBy(me)) throw new AccessDeniedException("another user\'s order");   // 403\n    return OrderDto.of(order);\n}', missing: 'Order find(long id) {\n    return orderRepository.findById(id)\n        .orElseThrow(() -> new OrderNotFoundException(id));\n}\n\n@ExceptionHandler(OrderNotFoundException.class)\n@ResponseStatus(HttpStatus.NOT_FOUND)             // 404\nErrorResponse notFound(OrderNotFoundException e) { ... }', moved: '@GetMapping("/order-list")\nResponseEntity<Void> old() {\n    return ResponseEntity.status(HttpStatus.MOVED_PERMANENTLY)   // 301\n                         .location(URI.create("/orders")).build();\n}', error: '@GetMapping("/orders/{id}")\nOrderDto get(@PathVariable long id) {\n    return orderService.find(id);    // A NullPointerException is thrown inside\n}\n// An exception that is not handled becomes a 500' }[c.sc];
  },
  label: function (c) { return { get: 'Get', create: 'Create', delete: 'Delete', bad: 'Invalid input', noauth: 'Not logged in', forbid: 'No permission', missing: 'Order not found', moved: 'Moved address', error: 'Server exception' }[c.sc]; },
  columns: ['Status code', 'Category', 'Who has to fix it', 'What the receiver should do'],
  simulate: function (c) {
    var K = this.CASES[c.sc], ev = [], sum = [], S = { req: [], res: [], part: '' }, code = K.status.slice(0, 3), cls = code.charAt(0);
    var group = { '2': '2xx Successful', '3': '3xx Redirection', '4': '4xx Client Error', '5': '5xx Server Error' }[cls];
    function push(s, k, part) { S.part = part; ev.push({ s: s, k: k, snap: JSON.parse(JSON.stringify(S)) }); }
    S.req.push(['Start line', K.req[0]]); var p = K.req[0].split(' ');
    push('This is the first line of the request, the start line. It holds the method ' + p[0] + ', the target path ' + p[1] + ', and the protocol version, in that order. The method says "what to do", and the path says "what it is about".', '', 'req');
    K.req.slice(1).forEach(function (h) { S.req.push(['Header', h]); });
    push('The next lines are headers. Each one is written as "name: value" and carries extra information about the request. Host says which site the request is for, ' + (K.req.join(' ').indexOf('Authorization') >= 0 ? 'Authorization says who is sending it,' : '(this request has no credentials)') + (K.body ? ' Content-Type tells the format of the body.' : ''), '', 'req');
    S.req.push(['Empty line', '']); if (K.body) S.req.push(['Body', K.body]);
    push('An empty line marks the end of the headers. ' + (K.body ? 'What comes after it is the body. It holds the data to send to the server.' : 'This request has no data to send, so it has no body.') + ' The server has to be able to handle the request by looking at this one request alone, because it does not remember the requests sent before it (it is stateless).', '', 'req');
    S.res.push(['Start line', 'HTTP/1.1 ' + K.status]);
    push('This is the response from the server. The status code ' + K.status + ' is on the first line. The first digit of the three-digit number is the broad category: ' + group + '.', cls === '2' || cls === '3' ? 'good' : 'bad', 'res');
    K.hdr.forEach(function (h) { S.res.push(['Header', h]); }); S.res.push(['Empty line', '']); if (K.rbody) S.res.push(['Body', K.rbody]);
    var why = { get: 'The server finds the requested order and returns it in the body.', create: 'A new order has been created. The Location header tells you the address of the new order. The server uses 201 instead of 200 to tell you that something new was created.', delete: 'The delete succeeded and there is nothing to return. That is why the response is 204, which has no body.', bad: 'The required value quantity is missing. The request itself does not follow the rules, so the response is 400. The server did not even start the work.', noauth: 'The server cannot tell who sent the request. The response is 401, which means "authenticate first".', forbid: 'The server has confirmed who you are, but you do not have permission to view this order. The response is 403.', missing: 'The form of the address is correct, but there is no order with that number. The response is 404.', moved: 'This address has been moved permanently to /orders. The browser automatically requests again at the address in the Location header.', error: 'There was nothing wrong with the request, but the server code threw an exception that it did not handle. The response is 500. The details of the internal error are not sent out as they are in the body.' }[c.sc];
    push(why, cls === '2' || cls === '3' ? 'good' : 'bad', 'res');
    sum.push('The first digit of the status code alone tells you how to respond. With 4xx, sending the same request again does not help, and the request has to be fixed. 5xx is a problem on the server side, so you can try again after a short while. Monitoring also counts 4xx and 5xx separately.');
    if (c.sc === 'noauth' || c.sc === 'forbid') sum.push('401 means "I do not know who you are" (authentication), and 403 means "I know who you are, but it is not allowed" (authorization). Despite its name, 401 Unauthorized means that authentication failed.');
    if (c.sc === 'error' || c.sc === 'bad') sum.push('Avoid answering every failure with 200 and writing the error in the body. Browsers, proxies, and monitoring tools that act on the status code will mistake it for a success.');
    sum.push('An HTTP message has four parts: the start line, the headers, an empty line, and the body. The start line of a request holds the method and the path, and the start line of a response holds the status code.');
    return { events: ev, summary: sum, row: [K.status, group, K.who, K.next] };
  },
  render: function (v, sim, t, H, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : { req: [], res: [], part: '' };
    if (!s.req.length) { H.text(v, 'Click Run to see the parts one at a time, starting with the request.'); return; }
    var tab = function (rows) { return rows.map(function (r) { return { cells: [r[0], { v: r[1] || '(empty line)', cls: r[0] === 'Start line' ? 'hot' : '' }] }; }); };
    H.table(v, ['Part', 'Text sent from the browser to the server'], tab(s.req), 'HTTP request');
    if (s.res.length) H.table(v, ['Part', 'Text sent from the server to the browser'], tab(s.res), 'HTTP response');
    H.table(v, ['First digit', 'Meaning', 'Examples'], [['2xx', 'Successful', '200 OK, 201 Created, 204 No Content'], ['3xx', 'Redirection (points the client to another place)', '301 Moved Permanently, 304 Not Modified'], ['4xx', 'Client Error (the sender has to fix it)', '400, 401, 403, 404, 405'], ['5xx', 'Server Error (the server failed)', '500, 502, 503']].map(function (r) { var on = s.res.length && s.res[0][1].split(' ')[1].charAt(0) === r[0].charAt(0); return { cells: [{ v: r[0], cls: on ? 'hot' : '' }, r[1], r[2]] }; }), 'Categories of status codes');
  },
  // Diagram: put the request and the response side by side like letters, and stack the start line, headers, empty line, and body one line at a time.
  draw: function (P, sim, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : { req: [], res: [], part: '' }, kind = { 'Start line': 'hot', 'Header': 'plain', 'Empty line': 'ghost', 'Body': 'good' };
    P.size(680, 300);
    P.region('rq', 16, 16, 320, 220, 'Request: browser → server');
    P.region('rs', 344, 16, 320, 220, 'Response: server → browser');
    function lines(pre, x, arr) { arr.forEach(function (ln, i) { P.box(pre + i, x + 6, 50 + i * 30, 308, 26, { cls: kind[ln[0]] || 'plain', sub: ln[1] || '(empty line: end of headers)', mono: !!ln[1] }); }); }
    lines('q', 16, s.req); lines('r', 344, s.res);
    if (!s.req.length) P.text('hint', 172, 130, 'Click Run to stack the parts one at a time', { cls: 'mut', anchor: 'middle' });
    if (s.res.length) P.arrow('go', 'rq:r', 'rs:l');
    var done = s.res.length > 0, code = done ? sim.row[0] : '';
    P.box('st', 16, 250, 648, 34, { cls: !done ? 'ghost' : /^[23]/.test(code) ? 'good' : 'bad', title: done ? 'Status code ' + code : 'Status code', right: done ? sim.row[1] : 'No response yet' });
    P.note('The yellow line is the start line, white lines are headers, the dotted line is the empty line, and the green line is the body.');
  },
  assume: 'The structure of the messages (start line, headers, empty line, body) is exactly the shape seen in the raw text exchanged between a real HTTP server and a socket, and only the main headers are kept on screen. The status code for each situation follows the definitions in the HTTP standard (RFC 9110) and the conventions widely used in REST APIs. Some designs return 404 instead of 403 for a request about another user\'s resource, to hide that the resource exists.',
});

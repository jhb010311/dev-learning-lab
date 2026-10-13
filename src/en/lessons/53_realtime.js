Lab.register({
  id: 'realtime', nav: 'Polling, SSE, and WebSocket', cat: 'HTTP', mode: 'step',
  title: 'Four ways to tell the browser what happened on the server',
  intro: 'HTTP works by the client asking and the server answering, so even when the server has a new notification, it cannot speak first. The options are to ask periodically (polling), to hold the answer back (long polling), to keep the connection open and stream data through it (SSE), or to switch to a two-way channel (WebSocket).',
  terms: ['SSE (server-sent events) and polling', 'WebSocket', 'HTTP as a stateless protocol'], ranks: ['http', 'network', 'traffic'],
  controls: [
    { id: 'how', label: 'Method', type: 'select', value: 'poll', options: [['poll', 'Polling (asks periodically)'], ['long', 'Long polling (holds the response until there is news)'], ['sse', 'SSE (the server keeps sending in one direction)'], ['ws', 'WebSocket (two-way channel)']] },
    { id: 'iv', label: 'Polling interval', type: 'select', value: '5', options: [['1', '1s'], ['5', '5s'], ['10', '10s']], show: function (c) { return c.how === 'poll'; } },
    { id: 'n', label: 'Notifications created in 30 seconds', type: 'select', value: '3', options: [['1', '1 notification'], ['3', '3 notifications'], ['12', '12 notifications']] },
    { id: 'up', label: 'The client also sends to the server often (chat input, for example)', type: 'check', value: false },
  ],
  presets: [
    { t: 'Default settings', q: 'With polling every 5s and 3 notifications created in 30 seconds, how does the browser find out about them?', d: 'Polling every 5s. Half of the 6 requests end with "no news".', v: { how: 'poll', iv: '5', n: '3', up: false } },
    { t: 'Polling interval of 1s', q: 'What if you change the polling interval to 1s?', d: 'The delay gets shorter, but the requests grow to 30.', v: { how: 'poll', iv: '1', n: '3', up: false } },
    { t: 'Long polling', q: 'What if you change the method to long polling?', d: 'The server responds the moment news arrives. The number of requests is close to the number of notifications.', v: { how: 'long', iv: '5', n: '3', up: false } },
    { t: 'SSE', q: 'What if you change the method to SSE?', d: 'With one connection, the server sends as things happen.', v: { how: 'sse', iv: '5', n: '3', up: false } },
    { t: 'When you need two-way communication', q: 'What if you change the method to WebSocket, with 12 notifications and a client that also sends to the server often?', d: 'If the client also sends often, as in a chat, WebSocket is the right fit.', v: { how: 'ws', iv: '5', n: '12', up: true } },
    { t: 'SSE, but the client also sends often', q: 'What if the method is SSE, there are 12 notifications, and the client also sends to the server often?', d: 'Each message the client sends becomes a separate HTTP request.', v: { how: 'sse', iv: '5', n: '12', up: true } },
  ],
  code: function (c) {
    if (c.how === 'poll') return '// Browser\nsetInterval(async () => {\n    const res = await fetch("/notifications?after=" + lastId);\n    show(await res.json());              // an empty array if there is nothing\n}, ' + (+c.iv * 1000) + ');';
    if (c.how === 'long') return '// Server: holds the response until a new notification arrives (30 seconds at most)\n@GetMapping("/notifications")\nDeferredResult<List<Notification>> wait(@RequestParam long after) {\n    var result = new DeferredResult<List<Notification>>(30_000L, List.of());\n    waiters.add(after, result);          // when a notification arrives, call result.setResult(...)\n    return result;\n}\n// Browser: as soon as it gets a response, it sends the request again';
    if (c.how === 'sse') return '// Server\n@GetMapping(value = "/notifications/stream", produces = TEXT_EVENT_STREAM_VALUE)\nSseEmitter stream() {\n    SseEmitter emitter = new SseEmitter(0L);\n    emitters.add(emitter);               // when a notification arrives, call emitter.send(...)\n    return emitter;\n}\n\n// Browser\nconst es = new EventSource("/notifications/stream");\nes.onmessage = e => show(JSON.parse(e.data));   // reconnects automatically if the connection drops';
    return '// Server\n@Component\nclass ChatHandler extends TextWebSocketHandler {\n    protected void handleTextMessage(WebSocketSession s, TextMessage m) {\n        broadcast(m);                    // passes the received message to the other users\n    }\n}\n\n// Browser\nconst ws = new WebSocket("wss://shop.example/chat");\nws.onmessage = e => show(e.data);\nws.send("Hello");                        // the same connection is used for sending too';
  },
  label: function (c) { return { poll: 'Polling ' + c.iv + 's', long: 'Long polling', sse: 'SSE', ws: 'WebSocket' }[c.how] + ' · Notifications: ' + c.n + (c.up ? ' · client also sends' : ''); },
  columns: ['HTTP requests', 'Requests that ended empty-handed', 'Average delivery delay', 'Open connections'],
  simulate: function (c) {
    var D = 30, n = +c.n, ev = [], rows = [], sum = [], evT = [], i, reqs = 0, empty = 0, delay = 0, conn = 'None (only when a request is made)', ups = c.up ? 10 : 0;
    for (i = 0; i < n; i++) evT.push(Math.round((D / n * (i + 0.37)) * 10) / 10);
    function push(s, k) { ev.push({ s: s, k: k, snap: { rows: rows.slice(), reqs: reqs, empty: empty } }); }
    function row(t, what, res, cls) { rows.push({ cells: [t === 'Often' ? t : t + 's', what, { v: res, cls: cls }] }); }
    var fmt = function (x) { return (Math.round(x * 10) / 10).toFixed(1); };
    function setLast(res, cls) { var p = rows[rows.length - 1]; rows[rows.length - 1] = { cells: [p.cells[0], p.cells[1], { v: res, cls: cls }] }; }
    if (c.how === 'poll') {
      var iv = +c.iv, last = 0, tot = 0;
      push('Every ' + iv + ' seconds, the browser requests "Are there any new notifications?" The server returns the notifications that have piled up until then, or an empty response if there are none.', '');
      for (var t = iv; t <= D; t += iv) { reqs++; var got = evT.filter(function (x) { return x > last && x <= t; }); if (got.length) { got.forEach(function (x) { tot += t - x; }); row(t, 'Request', 'Notifications: ' + got.length + ' (created at ' + got.map(fmt).join(', ') + 's)', 'good'); } else { empty++; row(t, 'Request', 'No news', ''); } last = t; if (iv >= 5 || got.length) push(t + 's: The browser sent a request. ' + (got.length ? 'It received the ' + got.length + (got.length === 1 ? ' notification' : ' notifications') + ' created in the meantime. They were created at ' + got.map(fmt).join(', ') + 's, but had to wait until the next request.' : 'There were no new notifications, so it received an empty response.'), got.length ? 'good' : ''); }
      delay = n ? tot / n : 0; push('Of the ' + reqs + ' requests in 30 seconds, ' + empty + ' ended empty-handed.', empty > reqs / 2 ? 'bad' : '');
      sum.push('Polling is the simplest to implement. But if the interval is long, notifications arrive late, and if it is short, requests that gain nothing pile up on the server. With many users, those requests alone become a load.');
    }
    if (c.how === 'long') {
      conn = 'One request waiting for a response is always pending';
      reqs = 1; row('0.0', 'Request (waiting for a response)', 'The server holds the response', 'hot'); push('The browser sends a request. If there is no new notification, the server does not respond and keeps the connection held.', '');
      evT.forEach(function (x) { setLast('Responds with 1 notification at ' + fmt(x) + 's', 'good'); reqs++; row(fmt(x), 'Request again right away (waiting for a response)', 'The server holds the response', 'hot'); push(fmt(x) + 's: When a notification is created, the server immediately responds to the request it was holding. As soon as it receives that, the browser sends another request to wait for the next notification.', 'good'); });
      setLast('Still waiting when the 30s window ends', ''); empty = 0; delay = 0.05; push('The last request is still waiting for news when the 30-second window ends (the 30-second time limit counts from when the request was sent).', '');
      sum.push('Long polling delivers a notification as soon as it is created, yet it uses only ordinary HTTP requests. In exchange, one request per user stays pending on the server, and if notifications are frequent, a new request has to be made every time.');
    }
    if (c.how === 'sse' || c.how === 'ws') {
      reqs = 1; conn = c.how === 'sse' ? '1 (server → browser direction)' : '1 (two-way)';
      row('0.0', c.how === 'sse' ? 'GET /notifications/stream' : 'GET /chat (Upgrade: websocket)', c.how === 'sse' ? '200 OK, the response is left open' : '101 Switching Protocols', 'good');
      push(c.how === 'sse' ? 'The browser sends a request once. The server starts the response but does not end it, and keeps the connection open. The format is an ordinary HTTP response that goes on and on.' : 'In an HTTP request, the browser proposes "let\'s switch to WebSocket," and the server accepts. From this moment, the connection is no longer HTTP. It is a channel through which both sides can send messages freely.', '');
      evT.forEach(function (x) { row(fmt(x), 'Server → browser', '1 notification (on the same connection)', 'good'); });
      delay = 0.05; push('Each time a notification is created, the server sends it right away over the open connection. All ' + n + ' were delivered without a new request.', 'good');
      if (c.up) {
        if (c.how === 'sse') { reqs += ups; row('Often', 'Browser → server (POST)', ups + ' separate HTTP requests', 'hot'); push('The ' + ups + ' messages the client sends cannot go over the SSE connection. SSE goes only from the server to the browser. Each time the client sends, it makes an ordinary HTTP request separately.', 'bad'); }
        else { row('Often', 'Browser → server', ups + ' messages (on the same connection)', 'good'); push('The ' + ups + ' messages the client sends also go over the same connection. There is no split into request and response. Either side sends when it needs to.', 'good'); }
      }
      sum.push(c.how === 'sse' ? 'SSE suits uses where the server announces things on its own (notifications, progress, price quotes). It is ordinary HTTP, so it works well with cookie authentication, proxies, and load balancers, and if the connection drops, the browser reconnects by itself.' : 'WebSocket suits uses where both sides send back and forth often (chat, collaborative editing, games). It is a separate protocol, not HTTP, so you have to check the proxy and load balancer settings separately, and you have to handle reconnection and authentication yourself.');
      sum.push('A method that keeps connections open maintains as many connections as there are users. With several servers, you have to solve "which server holds this user\'s connection," and you usually add an intermediate channel such as Redis publish/subscribe.');
    }
    return { events: ev, summary: sum, row: [reqs + '', empty + '', delay < 0.1 ? 'Almost 0s' : fmt(delay) + 's', conn] };
  },
  render: function (v, sim, t, H, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : { rows: [], reqs: 0, empty: 0 };
    if (s.rows.length) H.table(v, ['Time', 'What', 'Result'], s.rows.slice(-14), 'Between the browser and the server' + (s.rows.length > 14 ? ' (last 14 rows)' : '')); else H.text(v, 'Nothing has passed yet.');
  },
  // Diagram: requests and responses between the browser and the server. It shows who speaks first and how many requests come back empty-handed.
  draw: function (P, sim, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : { rows: [], reqs: 0, empty: 0 }, msgs = [];
    s.rows.forEach(function (r) {
      var tm = P.v(r.cells[0]), kind = P.v(r.cells[1]), res = P.v(r.cells[2]), cls = P.c(r.cells[2]);
      if (kind.indexOf('Server → browser') === 0) msgs.push({ f: 's', t: 'b', s: tm + ' ' + res, cls: cls });
      else if (kind.indexOf('Browser → server') === 0) msgs.push({ f: 'b', t: 's', s: tm + ' ' + res, cls: cls });
      else { msgs.push({ f: 'b', t: 's', s: tm + ' ' + kind }); msgs.push({ f: 's', t: 'b', s: res, cls: cls === 'hot' ? '' : cls || 'mut' }); }
    });
    var end = P.seq([['b', 'Browser', 'wait'], ['s', 'Server', 'wait']], msgs, { keep: 8 });
    P.box('rq', 16, end + 14, 318, 34, { cls: 'plain', title: 'Requests the browser sent', right: '' + s.reqs });
    P.box('em', 346, end + 14, 318, 34, { cls: s.empty ? 'bad' : 'good', title: 'Responses with no news', right: '' + s.empty });
    P.size(680, end + 64);
    P.note('Arrows pointing right were sent by the browser, and arrows pointing left were sent by the server. Gray arrows are responses that came back with no new news. The more a method lets the server send first, the fewer arrows point right.');
  },
  assume: 'Notifications are assumed to be created evenly across the 30-second window. Network round-trip time is ignored in the delivery delay. The messages the client sends are fixed at 10 per 30 seconds. The long-polling time limit is set to 30 seconds. The behavior of the four methods follows the explanations in the HTML standard (EventSource), the WebSocket standard (RFC 6455), and the Spring documentation.',
});

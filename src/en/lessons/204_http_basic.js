Lab.register({
  id: 'http_basic', nav: 'HTTP requests', cat: 'Fundamentals', mode: 'step', basic: true, deep: ['httpmsg'],
  title: 'What does an HTTP request look like as text?',
  intro: 'An HTTP request that a browser sends to a server is a few lines of text in a fixed shape. The first line (the request line) holds the method, the path, and the version. Below it come lines called headers, in the form "name: value", and an empty line, a line with no text at all, tells the server that the headers are over (a request with no body ends here). The server reads this text to find out what the request asks for. In this lab you change or remove the first line, the Host line, and the last empty line one at a time, and send the text exactly as it is to the same server (a server that has only the /hello address), to see whether the server reads the text as a request, what response it sends back, and whether the request reaches the server code we wrote. The (empty line) in the code box is a way to show a line with no text at all, so that you can see it.',
  terms: ['Request line', 'Host header', 'End of an HTTP request (the empty line)', 'HTTP status codes'],
  controls: [
    { id: 'line', label: 'First line', type: 'select', value: 'ok', options: [['ok', 'First line: GET /hello HTTP/1.1'], ['nopath', 'First line: GET /nothing HTTP/1.1 (a path the server does not have)'], ['broken', 'First line: /hello (GET and HTTP/1.1 removed)']] },
    { id: 'host', label: 'Include the Host: localhost:8080 line', type: 'check', value: true },
    { id: 'blank', label: 'Put an empty line at the end', type: 'check', value: true },
  ],
  // q is the question shown on the question-style screen. t and d are the name and the description used in the text-only reading
  presets: [
    { t: 'Default settings', q: 'What does an HTTP request look like, and what does the server look at to respond?', d: 'A request with the right shape and a path /hello that exists. The server code returns 200 and a body.', v: { line: 'ok', host: true, blank: true } },
    { t: 'Changing the path to /nothing', q: 'What if you change the path to /nothing?', d: 'The shape is right, but the path does not exist on the server. The server code answers 404.', v: { line: 'nopath', host: true, blank: true } },
    { t: 'Removing the Host line', q: 'What if you remove the Host: localhost:8080 line?', d: 'It can still be read as a request, but there is no Host, so Node.js does not pass it to the server code and rejects it with 400.', v: { line: 'ok', host: false, blank: true } },
    { t: 'Removing GET and HTTP/1.1 from the first line', q: 'What if you remove GET and HTTP/1.1 from the first line?', d: 'It is not read as a request, so the answer is 400. It never reaches the server code.', v: { line: 'broken', host: true, blank: true } },
    { t: 'Removing the empty line at the end', q: 'What if you remove the empty line at the end?', d: 'There is no line to say the request is over, so the server waits, and no response comes.', v: { line: 'ok', host: true, blank: false } },
  ],
  LINES: { ok: 'GET /hello HTTP/1.1', nopath: 'GET /nothing HTTP/1.1', broken: '/hello' },
  code: function (c) {
    var out = [this.LINES[c.line]];
    if (c.host) out.push('Host: localhost:8080');
    if (c.blank) out.push('(empty line)');
    return out.join('\n');
  },
  label: function (c) { return { ok: 'first line GET /hello', nopath: 'first line GET /nothing', broken: 'first line /hello' }[c.line] + ' · ' + (c.host ? 'Host present' : 'no Host') + ' · ' + (c.blank ? 'empty line present' : 'no empty line'); },
  columns: ['What the server read', 'Response', 'Server code ran'],
  simulate: function (c) {
    var ev = [], sum = [], line = this.LINES[c.line], path = c.line === 'nopath' ? '/nothing' : '/hello', broken = c.line === 'broken';
    var st = { sent: false, lc: 'plain', hc: 'plain', bc: 'plain', rdc: 'plain', rdt: ['Waiting'], cdc: 'ghost', cdt: ['Not yet'], arr1: false, go: false, resp: '', ran: '', rcv: false, rows: [], done: false };
    function push(s, k) { ev.push({ s: s, k: k, snap: JSON.parse(JSON.stringify(st)) }); }
    st.hc = c.host ? 'plain' : 'ghost'; st.bc = c.blank ? 'plain' : 'ghost';
    var cut = (!c.host || !c.blank) ? ' In this lab, the text is sent as in the code box, without' + (!c.host && !c.blank ? ' the Host line and the empty line' : !c.host ? ' the Host line' : ' the last empty line') + '.' : '';
    // Step 1: the browser sends the text
    st.sent = true; st.rdt = ['Waiting'];
    if (broken) push('The browser connects to the server and sends the text below. Because the first line is only /hello, it is different from the text a browser sends when you type an address in the address bar. The server is one that has only the /hello address.' + cut, '');
    else push('When you type localhost:8080' + path + ' in the address bar of the browser, the browser connects to the server and sends the text below. The server is one that has only the /hello address.' + cut, '');
    // Step 2: read the first line
    st.arr1 = true; st.lc = broken ? 'bad' : 'hot'; st.rdc = broken ? 'bad' : 'hot'; st.rdt = ['Reading first line'];
    if (broken) {
      st.rdt = ['Not read as a request']; st.cdt = ['Not called']; st.resp = '400'; st.ran = 'No';
      push('Node.js, which makes up the server, reads the first line. The text it read is "/hello". A request line must have three parts, a method, a path, and a version, but /hello comes where the method should be, so it cannot be read as a method. Node.js cannot read this text as a request.', 'bad');
      st.rcv = true; st.done = true;
      push('Node.js does not call the server code we wrote, and sends back a 400 response by itself.' + (!c.blank ? ' It does not wait even though the empty line has not arrived. This is because it can tell the first line is wrong from the first line alone.' : '') + (!c.host ? ' The missing Host line is also a problem, but 400 was already decided at the first line, before that is considered.' : ''), 'bad');
      push('The browser receives the 400 response. The text was not read as a request, so it did not reach the server code we wrote.', 'bad');
      sum.push('A first line with GET and HTTP/1.1 removed is not a request line, so the server (Node.js) cannot read this text as a request and answers 400.');
      sum.push('400 is the case where the text was not read as a request and never reached the server code, and 404 is the case where it was read as a request and then the server code answered "there is no such path."' + (!c.host || !c.blank ? ' A wrong first line is decided as 400 from the first line alone, whatever the later lines are.' : ''));
      return { events: ev, summary: sum, row: ['Not read as a request', '400', 'No'] };
    }
    st.rows.push([line, 'Method ' + 'GET, path ' + path + ', version HTTP/1.1', '']);
    push('Node.js, which makes up the server, reads the first line. The text it read is "' + line + '". The first line (the request line) has three things written in order. GET is the method, which says what the request wants to do (it asks to get something), ' + path + ' is the path, which says what it is about, and HTTP/1.1 is the version, which says what rules the text was written by. All three parts are there, so it is read as a request line.', '');
    // Step 3: the Host line
    if (c.host) {
      st.lc = 'plain'; st.hc = 'hot'; st.rdt = ['Reading Host line'];
      st.rows.push(['Host: localhost:8080', 'Header. Which site the request is for', '']);
      push('Node.js reads the next line. The text it read is "Host: localhost:8080". A line in the form "name: value" is called a header. The Host header tells which site (address) this request came to.', '');
    }
    if (!c.blank) {
      // The empty line does not arrive
      st.lc = 'plain'; st.hc = c.host ? 'plain' : 'ghost'; st.bc = 'wait'; st.rdc = 'wait'; st.rdt = ['Waiting for empty line']; st.cdt = ['Not called'];
      push(c.host ? 'Nothing more came after the Host line. Because there is no empty line, Node.js considers that the headers are not over yet and waits for more text.' : 'Nothing more came after the first line. There is neither a Host line nor an empty line, so Node.js considers that the headers are not over yet and waits for more text. Until the headers are over, it cannot say for sure that Host will not come.', 'bad');
      st.resp = 'No response (waiting)'; st.ran = 'No'; st.done = true; st.rcv = false;
      push('Not a single byte of a response came even after 1.5 seconds. Even though the request has reached the server, there is no empty line to say it is over, so Node.js did not hand the request over, and the server code we wrote was not called. The browser did not receive a response.', 'bad');
      sum.push('If you remove the empty line at the end, the server thinks the request has not fully arrived and waits. No response came, and the server code was not called.');
      sum.push('The empty line is what says the request is over. ' + (c.host ? '' : 'Whether Host is missing can also be known only after the headers end, so in this case the result was waiting, not 400. ') + 'Only a wrong first line is an exception; then it does not wait for the empty line and returns 400 from the first line alone.');
      return { events: ev, summary: sum, row: ['Still reading', 'No response (waiting)', 'No'] };
    }
    // Step 4: the empty line
    st.lc = 'plain'; st.hc = c.host ? 'plain' : 'ghost'; st.bc = 'hot'; st.rdt = ['Empty line: end of request'];
    st.rows.push(['(empty line)', 'A line with no text at all. The end of the request', '']);
    push(c.host ? 'Node.js reads the next line and finds an empty line with no text at all (the (empty line) on the screen). An empty line marks the end of the headers, so Node.js decides that the request has arrived in full.' : 'Node.js reads the next line and finds, right away, an empty line with no text at all (the (empty line) on the screen). The headers ended without a single header, and Node.js decides that the request has arrived in full.', '');
    if (!c.host) {
      st.bc = 'plain'; st.hc = 'bad'; st.rdc = 'bad'; st.rdt = ['Rejected: no Host']; st.cdt = ['Not called']; st.resp = '400'; st.ran = 'No'; st.rcv = true; st.done = true;
      st.rows[0][2] = '';
      push('An HTTP/1.1 request must have a Host header. This request does not have one, so Node.js does not pass it to the server code we wrote and sends back a 400 response by itself. The result was decided before the server code could check the path.', 'bad');
      push('The browser receives the 400 response. The request was read correctly up to the request line, but without Host it did not reach the server code we wrote.', 'bad');
      sum.push('An HTTP/1.1 request with no Host line is read as a request, but the server (Node.js) does not pass it to the server code we wrote and rejects it with 400.');
      sum.push('The HTTP/1.1 specification (RFC 9112) says a server must respond with 400 to a request without Host. On this server, the server code was never called.');
      return { events: ev, summary: sum, row: [line.split(' ')[0] + ' ' + path + ' request (rejected: no Host)', '400', 'No'] };
    }
    // Step 5: the request is handed to the server code
    st.bc = 'plain'; st.rdc = 'good'; st.rdt = ['GET ' + path + ' request complete']; st.go = true; st.cdc = 'hot now'; st.cdt = ['Receiving the request'];
    push('In the request Node.js read, the method is GET and the path is ' + path + '. The shape is right and Host is there, so Node.js hands this request to the server code we wrote.', 'good');
    if (c.line === 'ok') {
      st.cdc = 'good'; st.cdt = ['Ran: 200 response']; st.resp = '200 Hello'; st.ran = 'Yes';
      push('The server code we wrote looks at the path. /hello is an address we made, so it builds a 200 response with the body "Hello". This code is not shown on the screen, but it is made to answer this way only to a GET request whose path is /hello.', 'good');
      st.rcv = true; st.done = true;
      push('The browser receives the 200 response. The body is "Hello".', 'good');
      sum.push('An HTTP request is a few lines of text that the browser sends to the server. The first line (the request line) holds the method, the path, and the version, below it are headers in the form "name: value", and an empty line marks the end.');
      sum.push('The server (Node.js) read this text from the first line, learned that it is a GET /hello request, decided at the empty line that the request was over, and handed it to the server code we wrote. The server code looked at the path and answered 200.');
      return { events: ev, summary: sum, row: ['GET /hello request', '200 Hello', 'Yes'] };
    }
    st.cdc = 'plain'; st.cdt = ['Ran: 404 response']; st.resp = '404'; st.ran = 'Yes';
    push('The server code we wrote looks at the path. /nothing is not an address we made, so it builds a 404 response. The request was read correctly, and it was the server code that answered that there is no such path.', 'bad');
    st.rcv = true; st.done = true;
    push('The browser receives the 404 response.', 'bad');
    sum.push('Even if you change the path to /nothing, the shape of the request is right, so the server reads it as a GET /nothing request and hands it to the server code. The server code did not make that path, so it answered 404.');
    sum.push('404 does not mean the request was wrong; it is the server code answering "there is no such path." It differs from 400 in that the request reached the server code.');
    return { events: ev, summary: sum, row: ['GET /nothing request', '404', 'Yes'] };
  },
  render: function (v, sim, t, H, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : null;
    if (!s) { H.text(v, 'Click Run to start with the server reading the text that was sent, one line at a time.'); return; }
    if (s.rows.length) H.table(v, ['Line the server read', 'Meaning'], s.rows.map(function (r) { return { cls: '', cells: [r[0], r[1]] }; }), 'Lines read');
    H.table(v, ['Item', 'Value'], [
      { cls: s.resp ? '' : 'gone', cells: ['Response', s.resp ? { v: s.resp, cls: s.resp.indexOf('200') === 0 ? 'good' : 'bad' } : 'Not yet'] },
      { cls: s.ran ? '' : 'gone', cells: ['Server code ran', s.ran ? { v: s.ran, cls: s.ran === 'Yes' ? 'good' : '' } : 'Not yet'] },
    ], 'Result');
  },
  // Diagram: the browser on the left, the text that was sent (request line, Host line, empty line) in the middle, and in the server area on the right, reading the request (Node.js) and the server code we wrote. If the text is read as a request, the arrow goes on to the server code. If it is 400, the arrow stops at reading the request. If there is no empty line, it stops at reading the request and waits.
  draw: function (P, sim, shown) {
    var c = sim.c, last = shown[shown.length - 1], s = last ? last.snap : null;
    var hostTxt = c.host ? 'Host: localhost:8080' : '(no Host line)', blankTxt = c.blank ? '(empty line)' : '(no empty line)';
    P.size(680, 292);
    P.box('br', 14, 94, 84, 58, { cls: s && s.sent && !s.done ? 'wait' : 'plain', title: 'Browser', sub: !s ? 'Waiting' : s.rcv ? 'Got ' + s.resp.split(' ')[0] : s.done ? 'No answer' : 'Sent text' });
    P.region('tx', 150, 16, 210, 208, 'Text sent');
    P.box('l1', 160, 44, 190, 34, { cls: s ? s.lc : 'plain', sub: { ok: 'GET /hello HTTP/1.1', nopath: 'GET /nothing HTTP/1.1', broken: '/hello' }[c.line], mono: true });
    P.box('l2', 160, 94, 190, 34, { cls: s ? s.hc : (c.host ? 'plain' : 'ghost'), sub: hostTxt, mono: !!c.host });
    P.box('l3', 160, 144, 190, 34, { cls: s ? s.bc : (c.blank ? 'plain' : 'ghost'), sub: blankTxt });
    P.region('sv', 412, 16, 254, 208, 'Server');
    P.box('rd', 422, 58, 234, 62, { cls: s ? s.rdc : 'plain', title: 'Request reader (Node.js)', sub: s ? s.rdt : ['Waiting'] });
    P.box('cd', 422, 156, 234, 56, { cls: s ? s.cdc : 'ghost', title: 'Our server code', sub: s ? s.cdt : ['Not yet'] });
    if (s && s.sent) P.arrow('send', 'br:r', 'l2:l', {});
    if (s && s.arr1) P.arrow('rd1', 'l2:r', [422, 111], { cls: 'hot' });
    if (s && s.go) P.arrow('go', 'rd:b', 'cd:t', { cls: 'hot' });
    if (s && s.rcv) P.arrow('rs', [56, 240], [56, 154], { cls: s.resp.indexOf('200') === 0 ? 'good' : 'bad', label: s.resp.split(' ')[0] });
    P.box('n1', 14, 242, 322, 36, { cls: s && s.rcv ? (s.resp.indexOf('200') === 0 ? 'good' : 'bad') : s && s.done ? 'bad' : 'ghost', title: 'Response', right: s && s.resp ? s.resp : 'Not yet' });
    P.box('n2', 344, 242, 322, 36, { cls: s && s.ran === 'Yes' ? 'good' : 'ghost', title: 'Server code ran', right: s && s.ran ? s.ran : 'Not yet' });
  },
  assume: 'The server is a single one made with the http module of Node.js 24.18.0. It returns 200 with the body "Hello" for GET /hello and 404 for any other path. All 12 combinations were sent character for character, with the net module, to this server on 127.0.0.1 (lines end with CRLF), and checked against the model: the status line and body of the response received, whether our request handler function was called, and the method and url that function received. The (empty line) on the screen is a way to show a line with no text at all, so that you can see it, and for the combinations with no empty line, the text was sent only as far as the line break of the last line. "No response (waiting)" means that no byte of a response came for 1.5 seconds after the text was sent. How long Node.js waits before giving up was not examined. For the first line with a wrong shape (/hello), Node.js cannot read it as a request, raises a clientError (HPE_INVALID_METHOD), and sends back 400 by itself, and 400 also came when only the first line was sent, whatever the later lines were. For a request with no Host, Node.js sends back 400 by itself after the empty line arrives and the headers end, before it calls our code (the request handler function was not called and no clientError was raised). When the same text was sent to a server with the Host check turned off (requireHostHeader: false), the handler function received a GET request, so the text had been read correctly up to the request line. These are behaviors observed on this Node.js version. What was checked against the documentation is RFC 9112 section 2.1 (message format: the empty line after the request line and headers), section 3 (the request line: three parts, method, request target, and version), section 3.2 (a server must respond with 400 to an HTTP/1.1 request that has no Host), and RFC 9110 section 7.2 (Host), section 15.5.1 (400), and section 15.5.5 (404). The request on the screen has the minimum shape, with only Host left as a header, and only GET requests without a body were covered. How a 400 is returned can differ from server to server, and this screen shows the behavior of a Node.js server. The server code is not shown on the screen. The in-depth details on the same subject (the shape of responses, all the status codes) are covered in the in-depth lab "HTTP messages and status codes".',
});

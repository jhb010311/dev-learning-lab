Lab.register({
  id: 'httpmethod_basic', nav: 'HTTP methods', cat: 'Fundamentals', mode: 'step', basic: true, deep: ['idem', 'httpmsg', 'binding'],
  title: 'How is GET different from POST?',
  intro: 'The first word of the first line of an HTTP request is called the method. The method is the word that tells the server what the request wants done at that address, so even for the same /memos address, what the server does depends on whether you send GET or POST. GET is the method that gets something that is on the server; it is not a request to change anything on the server. POST is the method that asks the server to process the content (the body) that is sent with the request. A server writes code for the methods it handles, and if a request comes with a method it has not written code for, it answers with the status code 405. In this lab you send requests to a server that has a list of memos, change the method on the first line, send the same request once or twice, and see what happens to the memos on the server. The upper part of the code box is the text that was actually sent to the server, and a line that starts with # is a note that is not sent to the server (what the server has set up, and how many times the request is sent). The code box is not the code of the server program; it shows what was exchanged. (empty line) is a way to show a line with no text at all, so that you can see it.',
  terms: ['HTTP methods', 'GET method', 'POST method', '405 Method Not Allowed and the Allow header'],
  controls: [
    { id: 'method', label: 'Method on the first line', type: 'select', value: 'get', options: [['get', 'First line: GET /memos HTTP/1.1'], ['post', 'First line: POST /memos HTTP/1.1 (a Content-Length line and the body hello are added)'], ['delete', 'First line: DELETE /memos HTTP/1.1 (the server has no line that handles DELETE)']] },
    { id: 'times', label: 'Number of requests', type: 'select', value: '1', options: [['1', 'Send the request once'], ['2', 'Send the same request twice']] },
  ],
  // q is the question shown on the question-style screen. t and d are the name and the description used in the text-only reading
  presets: [
    { t: 'Default settings', q: 'What does a GET /memos request look like, and what happens when you send it to the server?', d: 'The server only returns the list. The memos on the server stay as they are.', v: { method: 'get', times: '1' } },
    { t: 'Sending the same GET twice', q: 'What if you send the same GET request twice?', d: 'The response is the same both times, and the memos on the server stay as they are.', v: { method: 'get', times: '2' } },
    { t: 'Changing to POST', q: 'What if you change the first line to POST /memos HTTP/1.1 and add the body hello?', d: 'The server adds the text of the body to the list, so the memos grow by one.', v: { method: 'post', times: '1' } },
    { t: 'Sending the same POST twice', q: 'What if you send the same POST request twice?', d: 'The memos grow by one each time you send.', v: { method: 'post', times: '2' } },
    { t: 'Changing to DELETE', q: 'What if you change the first line to DELETE /memos HTTP/1.1?', d: 'The server has not set up that method, so it refuses with 405.', v: { method: 'delete', times: '1' } },
  ],
  // The text of the request for each method (the upper part of the code box). (empty line) is a line with no text at all.
  REQ: {
    get: ['GET /memos HTTP/1.1', 'Host: localhost:8080', '(empty line)'],
    post: ['POST /memos HTTP/1.1', 'Host: localhost:8080', 'Content-Length: 5', '(empty line)', 'hello'],
    delete: ['DELETE /memos HTTP/1.1', 'Host: localhost:8080', '(empty line)'],
  },
  NAME: { get: 'GET', post: 'POST', delete: 'DELETE' },
  code: function (c) {
    var out = [];
    if (+c.times === 2) out.push('# Send the same request twice');
    out.push.apply(out, this.REQ[c.method]);
    out.push('', '# Server: the list at first has one memo, first', '# Server: GET /memos → returns the list', '# Server: POST /memos → adds the text of the body to the list');
    return out.join('\n');
  },
  label: function (c) { return 'First line ' + this.NAME[c.method] + ' · ' + (+c.times === 2 ? 'same request twice' : 'request once'); },
  columns: ['Response', 'Memos on the server', 'Server changed'],
  simulate: function (c) {
    var nm = this.NAME[c.method], N = +c.times, ev = [], sum = [], memos = ['first'], tgt = c.method === 'get' ? 'h1' : c.method === 'post' ? 'h2' : 'h3', found = c.method !== 'delete';
    var first = memos.join(', ');
    var st = { round: 0, sent: 0, phase: '', target: '', rq: 'plain', h1: 'plain', h2: 'plain', h3: 'ghost', memoCls: 'plain', memos: memos.slice(), arrAdd: false, arrRead: false, resp: null, changed: 'Not yet', reqs: [] };
    function push(s, k) { ev.push({ s: s, k: k, snap: JSON.parse(JSON.stringify(st)) }); }
    var devs = [];
    if (c.method !== 'get') devs.push('the ' + nm + ' on the first line' + (c.method === 'post' ? ', the Content-Length line, and the body hello' : ''));
    if (N === 2) devs.push('the "Send the same request twice" line');
    var note = devs.length ? ' The places that differ from the default settings in the code box are ' + devs.join(', ') + '.' : ''; function mm(n) { return n + (n === 1 ? ' memo' : ' memos'); }
    var cells = [];
    for (var n = 1; n <= N; n++) {
      var again = n > 1;
      st.round = n; st.sent = n; st.phase = 'send'; st.target = ''; st.resp = null; st.arrAdd = false; st.arrRead = false; st.rq = 'hot'; st.h1 = 'plain'; st.h2 = 'plain'; st.h3 = 'ghost'; st.memoCls = 'plain';
      // 1. Send the request
      if (!again) {
        push('The client (the side that sends the request) sends the text below to the server. This text is the HTTP request. The server starts with a list that holds one memo, first. The first word of the first line is the method, and it shows what the request wants the server to do. The method of this request is ' + nm + '. /memos after it is the path, which address the request is for, and HTTP/1.1 is the version, which rules the text was written by.' + (c.method === 'post' ? ' The Content-Length: 5 line means that the size of the body is 5 bytes. The body is attached below the empty line; it is the content sent to the server, and in this request it is hello.' : '') + (N === 2 ? ' The request is sent twice, with exactly the same text.' : '') + note, '');
      } else {
        push('The same request is sent once more. A new connection is opened, and exactly the same text is sent again from the start. The list on the server holds ' + mm(memos.length) + ' now.', '');
      }
      // 2. The server reads the first line and looks for the line that handles it
      st.phase = 'read'; st.target = tgt; st.rq = 'plain'; st[tgt] = found ? 'hot' : 'bad';
      if (!again) {
        if (found) push('The server starts to read the text. From the first line it reads that the method is ' + nm + ' and the path is /memos. The server looks through what it has set up (the # Server lines under the code box) for the same method and path. It has a line that handles the ' + nm + ' /memos request.', '');
        else push('The server starts to read the text. From the first line it reads that the method is DELETE and the path is /memos. What the server has set up is the two lines GET /memos and POST /memos, and it has no line that handles the DELETE method. /memos is an address the server knows, but it has not set up anything to receive the DELETE method at this address.', 'bad');
      } else {
        push(found ? 'The server reads the first line and again finds the line that handles the ' + nm + ' /memos request.' : 'The server reads the first line. Again it has no line that handles the DELETE method.', found ? '' : 'bad');
      }
      // 3. The server does the job
      st.phase = 'act';
      var body, status, allow = '', k = '';
      if (c.method === 'get') {
        body = memos.join(', '); status = '200 OK'; st.arrRead = true;
        push(!again ? 'The server does the job written on the GET /memos line. It only reads the list and puts it in the response, and does not touch the list, so the server still has ' + mm(memos.length) + '. The text it puts in the response is "' + body + '".' : 'The server again only reads the list and puts it in the response. The text it puts is "' + body + '", and the server still has ' + mm(memos.length) + '.', 'good');
      } else if (c.method === 'post') {
        memos.push('hello'); st.memos = memos.slice(); st.memoCls = 'hot'; st.arrAdd = true; body = memos.join(', '); status = '200 OK';
        push(!again ? 'The server does the job written on the POST /memos line. It takes the text out of the body of the request and adds it to the end of the list. The text it adds is "hello". The list on the server changes, and it now holds ' + mm(memos.length) + '.' : 'The server again takes the text out of the body and adds it to the end of the list. The text it adds is "hello", and the same text goes into the list again, so it now holds ' + mm(memos.length) + '.', 'hot');
      } else {
        body = ''; status = '405 Method Not Allowed'; allow = 'GET, POST';
        push(!again ? 'The server does not touch the list and builds a 405 Method Not Allowed response. 405 is a status code that means the server knows this address but does not accept this method. The server code adds an Allow line to the response to tell that the methods this address accepts are GET, POST (the HTTP standard says to add an Allow line to a 405 response). The server still has ' + mm(memos.length) + '.' : 'The server again does not touch the list, builds a 405 response, and writes GET, POST on the Allow line. The server still has ' + mm(memos.length) + '.', 'bad');
      }
      // 4. The client gets the response
      st.phase = 'resp'; st.arrAdd = false; st.arrRead = false; st.memoCls = 'plain'; st[tgt] = found ? 'good' : 'bad';
      st.resp = { status: status, body: body, allow: allow, ok: found };
      st.changed = memos.join(', ') !== first ? 'Changed' : 'Not changed';
      var cell = status + (found ? ', body "' + body + '"' : ', Allow: ' + allow);
      cells.push(cell);
      st.reqs.push(['#' + n + ' ' + nm + ' /memos', cell, String(memos.length)]);
      var tail = '';
      if (again && c.method === 'get') tail = ' The body is the same as in the earlier response.';
      if (again && c.method === 'post') tail = ' The body is different from the earlier response.';
      if (!again && c.method === 'post') tail = ' The body is the list after the addition.';
      push(found ? 'The client gets the response. The status is ' + status + ' and the body is "' + body + '".' + tail : 'The client gets the response. The status is ' + status + ', the Allow line says ' + allow + ', and there is no body.', found ? 'good' : 'bad');
    }
    var cnt = memos.length, ch = memos.join(', ') !== first;
    if (c.method === 'get' && N === 1) {
      sum.push('The HTTP method is the first word of the first line of a request, and even for the same /memos address, what the server does depends on the method. GET is the method that gets what is on the server, so the server only returned the list, and the server still has 1 memo.');
      sum.push('The server reads the method and the path on the first line, finds the line it has set up that handles them, and does that job. The GET /memos line is the job of returning the list.');
    } else if (c.method === 'get') {
      sum.push('Even if you send the same GET request twice, the bodies of the two responses are the same ("first"), and the server still has 1 memo.');
      sum.push('By agreement, GET should not change the server, and this server was built that way, so no matter how many times you send it, the server is in the same state as before you sent it.');
    } else if (c.method === 'post' && N === 1) {
      sum.push('When you send the body hello to POST /memos, the server adds that text to the list, and the number of memos goes from 1 to ' + cnt + '. The response is 200 OK, and the body is the list after the addition.');
      sum.push('The address is the same /memos, but GET only got, and POST changed something on the server. When the method is different, what the server does is different.');
    } else if (c.method === 'post') {
      sum.push('If you send the same POST request twice, the server handles both, so hello goes in twice, and the number of memos goes from 1 to ' + cnt + '. The bodies of the two responses are also different from each other.');
      sum.push('Unlike GET, POST changes something on the server every time you send it. Sending the same request again means adding one more.');
    } else if (N === 1) {
      sum.push('If you send with the DELETE method, which the server has not set up, the server refuses with 405 Method Not Allowed and tells with the Allow line the methods this address accepts (GET, POST). The server still has 1 memo.');
      sum.push('Even when the address /memos is right, if the server has not set up a line that handles that method, nothing on the server changes and it answers 405. This is a different status code from the 404 for an address that does not exist.');
    } else {
      sum.push('Even if you send the DELETE request twice, both are refused with 405 Method Not Allowed, and the server still has 1 memo.');
      sum.push('A method the server does not handle cannot change anything on the server, no matter how many times you send it. The Allow line tells the methods it can accept (GET, POST).');
    }
    var respCell = N === 1 ? cells[0] : cells.map(function (x, i) { return '#' + (i + 1) + ' ' + x; }).join(' / ');
    return { events: ev, summary: sum, tgt: tgt, row: [respCell, '1 → ' + cnt, ch ? 'Changed' : 'Not changed'] };
  },
  render: function (v, sim, t, H, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : null;
    if (!s) { H.text(v, 'Click Run to start with the client sending the request.'); return; }
    if (s.reqs.length) H.table(v, ['Request sent', 'Response received', 'Memos on the server after that'], s.reqs.map(function (r) { return { cls: '', cells: [r[0], { v: r[1], cls: r[1].indexOf('200') === 0 ? 'good' : 'bad' }, r[2]] }; }), 'Requests and responses');
    H.counters(v, [[s.memos.length, 'Memos on the server'], [s.sent, 'Requests sent']]);
  },
  // Diagram: on the left the client that sends the request, in the middle the lines the server has set up (GET /memos, POST /memos, any other method), and on the right the list of memos on the server. It shows whether the arrow of the request reaches the line that handles it, and if it does, whether the line only reads the list or adds to it.
  draw: function (P, sim, shown) {
    var c = sim.c, last = shown[shown.length - 1], s = last ? last.snap : null, nm = this.NAME[c.method], tgt = sim.tgt;
    var memos = s ? s.memos : ['first'];
    P.size(680, 300);
    P.region('cl', 10, 16, 140, 216, 'Client');
    P.box('rq', 20, 44, 120, 70, { cls: s ? s.rq : 'plain', title: 'Request', sub: [nm + ' /memos', c.method === 'post' ? 'Body hello' : 'No body'] });
    P.box('rs', 20, 122, 120, 106, { cls: s && s.resp ? (s.resp.ok ? 'good' : 'bad') : 'ghost', title: 'Response', sub: s && s.resp ? (s.resp.ok ? ['200 OK', 'Body'].concat(s.resp.body.split(', ')) : ['405', 'Method Not', 'Allowed']) : ['Not yet'] });
    P.region('sv', 200, 16, 470, 216, 'What the server has set up');
    P.box('h1', 210, 40, 250, 46, { cls: s ? s.h1 : 'plain', title: 'GET /memos', sub: 'Returns the list' });
    P.box('h2', 210, 92, 250, 46, { cls: s ? s.h2 : 'plain', title: 'POST /memos', sub: 'Adds the body text to the list' });
    P.box('h3', 210, 144, 250, 46, { cls: s ? s.h3 : 'ghost', title: 'Any other method', sub: 'No line to handle it' });
    P.box('memo', 510, 40, 150, 150, { cls: s ? s.memoCls : 'plain', title: 'Server memos', sub: memos });
    if (s && s.phase === 'send') P.arrow('send', 'rq:r', [200, 80], { cls: 'hot' });
    else if (s) P.arrow('send', 'rq:r', tgt + ':l:0.3', { cls: tgt === 'h3' ? 'bad' : 'hot' });
    if (s && s.arrRead) P.arrow('read', 'memo:l:0.3', 'h1:r:0.5', { cls: 'hot' });
    if (s && s.arrAdd) P.arrow('add', 'h2:r:0.5', 'memo:l:0.7', { cls: 'hot' });
    if (s && s.resp) P.arrow('back', tgt + ':l:0.8', 'rs:r:0.3', { cls: s.resp.ok ? 'good' : 'bad' });
    P.box('n1', 14, 250, 322, 36, { cls: s && s.sent ? 'wait' : 'ghost', title: 'Memos on the server', right: String(memos.length) });
    P.box('n2', 344, 250, 322, 36, { cls: s && s.changed === 'Changed' ? 'hot' : s && s.changed === 'Not changed' ? 'good' : 'ghost', title: 'Server changed', right: s ? s.changed : 'Not yet' });
  },
  assume: 'The server was started on an empty port of 127.0.0.1 with the http module of Node.js 24.18.0. At first its list holds one memo, first. For GET /memos it returns 200 OK with the list joined by ", " as the body. For POST /memos it adds the text of the request body to the list and returns 200 OK with the list after the addition as the body. For any other method that comes to /memos, it returns 405 with an Allow: GET, POST line that the server code adds, and for any other address it returns 404. The code box is not the code of the server program; it shows what was exchanged, and a line that starts with # is a note that is not sent to the server. All 6 combinations, 3 methods and 2 numbers of requests, were actually run. The client used the net module and sent the text of the request in the upper part of the code box exactly as it is, with CRLF at the end of each line (when it sent twice, it opened a new connection and sent the same text once more), and it parsed the status line, the Allow line, and the body of the response it received until the server closed the connection. We checked against the model the method, the path, and the body that the server received, the number of memos on the server after the request and whether the list changed, whether the list read by one more GET /memos at the end is the same as the real list of the server, and whether a GET to an address that does not exist, /nothing, gets 404, and we also checked for each combination that the text of the request is the same text that the code on the screen ran. Everything matched the model. Host: localhost:8080 on the screen is an example; the request was actually sent to an empty port, and this server does not look at the value of Host. That GET did not change anything on the server is because we made this server that way. The standard only gives GET the meaning of read-only, so what happens with a server that changes something on a GET was not run. Answering POST with 200 OK is also the choice of this server. The standard recommends answering with 201 Created and a Location line if a new resource was created (section 9.3.3), and we did not use it because a memo of this server has no address of its own. What was checked against the documentation is the following sections of RFC 9110: section 9.1 (method names are case-sensitive, and it recommends 501 for a method that the server does not know or has not implemented, and 405 for a method that it knows but the resource does not accept), section 9.2.1 (safe methods: defined with read-only meaning, so the client neither requests nor expects a change of state on the server), section 9.2.2 (idempotent), section 9.3.1 (GET: a request to transfer the current representation of the target resource), section 9.3.3 (POST: a request that the target resource process the representation enclosed in the request, and its uses), section 10.2.1 (Allow), and section 15.5.6 (405 Method Not Allowed: a method that is known but not supported by the target resource, and the Allow line must be added to a 405 response). We opened these documents with WebFetch, but we opened the long documents in parts and what came back was a summary and short excerpts, so we could not check whole sentences against the original. What this lab does not cover: cases where PUT, PATCH, and DELETE succeed, the property that sending the same request many times gives the same result (idempotency), and whether it is safe to send again when you did not get a response are covered in the in-depth lab "Retries and idempotency"; the shape of the text of requests and responses and all the status codes are covered in the in-depth lab "HTTP messages and status codes"; and how Spring separates requests by method and address is covered in the in-depth lab "Request mapping and parameter binding". We did not use a browser, and we did not check that typing an address in the address bar of a browser sends GET and that an HTML form can use POST.',
});

Lab.register({
  id: 'httpres_basic', nav: 'HTTP responses', cat: 'Fundamentals', mode: 'step', basic: true, deep: ['httpmsg'],
  title: 'What does an HTTP response look like as text?',
  why: 'If the shape of responses differed from server to server, a browser would have to work out separately for each server where the part that reports the result ends and where the content begins. The fixed shape of an HTTP response has everyone follow the order of a status code on the first line, headers below it, and the body after a blank line, so that an answer sent by any server is read the same way.',
  use: 'When a browser receives a web page or an app fetches data from a server, every answer that comes has a status code and headers, and usually a body follows. When a Spring controller returns a value, Spring and Tomcat attach the status code and headers to make the response. During development, you can see the status code and headers directly in the Network tab of the browser\'s developer tools.',
  intro: 'The HTTP response that a server sends back in answer to a request is also a few lines of text in a fixed shape. The first line (the status line) holds the version, the status code (a three-digit number like 200 or 404), and a short description. Below it come lines called headers, in the form "name: value", and after an empty line, a line with no text at all, comes the body (the actual content). The client (the browser) learns from the status code what happened to the request, from the Content-Type header what kind of content the body is, and from the Content-Length header how many bytes the body is. In this lab you change or remove the status line, the Content-Type line, and the Content-Length line one at a time, send that text exactly as it is to the client, and see what the client reads out of it. The (empty line) in the code box is a way to show a line with no text at all, so that you can see it.',
  terms: ['Status line', 'HTTP status codes', 'Content-Type header', 'Content-Length header'],
  controls: [
    { id: 'status', label: 'First line', type: 'select', value: 'ok', options: [['ok', 'First line: HTTP/1.1 200 OK'], ['notfound', 'First line: HTTP/1.1 404 Not Found'], ['none', 'Remove the first line (the status line)']] },
    { id: 'ctype', label: 'Include the Content-Type: text/plain; charset=utf-8 line', type: 'check', value: true },
    { id: 'clen', label: 'Content-Length line', type: 'select', value: 'right', options: [['right', 'Content-Length: 12 (the same number of bytes as the body)'], ['short', 'Content-Length: 5 (shorter than the body)'], ['none', 'Remove the Content-Length line']] },
  ],
  // q is the question shown on the question-style screen. t and d are the name and the description used in the text-only reading
  presets: [
    { t: 'Default settings', q: 'What does an HTTP response look like, and what does the client look at to read it?', d: 'A response with the right shape. The client reads the status, the kind of body, and the body.', v: { status: 'ok', ctype: true, clen: 'right' } },
    { t: 'Changing the status code to 404', q: 'What if you change the status code to 404?', d: 'Only the status is read as 404, and the body is read as it is.', v: { status: 'notfound', ctype: true, clen: 'right' } },
    { t: 'Removing the Content-Type line', q: 'What if you remove the Content-Type line?', d: 'The body is read, but there is no header that says the kind of the body.', v: { status: 'ok', ctype: false, clen: 'right' } },
    { t: 'Writing Content-Length shorter than the body', q: 'What if you write Content-Length shorter than the body?', d: 'Only the 5 bytes written are read as the body, so the text is cut off.', v: { status: 'ok', ctype: true, clen: 'short' } },
    { t: 'Removing the Content-Length line', q: 'What if you remove the Content-Length line?', d: 'There is no length information, so all the text received until the connection closes becomes the body.', v: { status: 'ok', ctype: true, clen: 'none' } },
    { t: 'Removing the first line (the status line)', q: 'What if you remove the first line (the status line)?', d: 'It is not read as a response. It does not help even if the headers and body are right.', v: { status: 'none', ctype: true, clen: 'right' } },
  ],
  STATUS: { ok: 'HTTP/1.1 200 OK', notfound: 'HTTP/1.1 404 Not Found' },
  CLEN: { right: 'Content-Length: 12', short: 'Content-Length: 5' },
  TYPE: 'Content-Type: text/plain; charset=utf-8',
  code: function (c) {
    var out = [];
    if (c.status !== 'none') out.push(this.STATUS[c.status]);
    if (c.ctype) out.push(this.TYPE);
    if (c.clen !== 'none') out.push(this.CLEN[c.clen]);
    out.push('(empty line)', 'Hello, world');
    return out.join('\n');
  },
  label: function (c) { return { ok: 'first line 200 OK', notfound: 'first line 404 Not Found', none: 'no status line' }[c.status] + ' · ' + (c.ctype ? 'Content-Type present' : 'no Content-Type') + ' · ' + { right: 'Content-Length 12', short: 'Content-Length 5', none: 'no Content-Length' }[c.clen]; },
  columns: ['Status the client read', 'Kind of body the client knew', 'Body the client read'],
  simulate: function (c) {
    var ev = [], sum = [], B = 'Hello, world', unread = c.status === 'none', ok = c.status === 'ok', num = ok ? '200' : '404';
    var stTxt = unread ? 'Not read as a response' : ok ? '200 OK' : '404 Not Found';
    var tyTxt = unread ? 'None (response not read)' : c.ctype ? 'text/plain; charset=utf-8' : 'Unknown (no header)';
    var boTxt = unread ? 'None (response not read)' : c.clen === 'short' ? 'Hello' : B;
    var bytes = unread ? 0 : c.clen === 'short' ? 5 : 12;
    var st = { sent: false, c1: unread ? 'ghost' : 'plain', c2: c.ctype ? 'plain' : 'ghost', c3: c.clen !== 'none' ? 'plain' : 'ghost', c4: 'plain', c5: 'plain', bsub: B, rdc: 'plain', rdt: ['Waiting'], gst: '', gty: '', gbo: '', arrR: false, arrD: false, rcv: false, done: false, rows: [] };
    function push(s, k) { ev.push({ s: s, k: k, snap: JSON.parse(JSON.stringify(st)) }); }
    var devs = [];
    if (c.status === 'notfound') devs.push('the 404 in the status line');
    if (unread) devs.push('no status line');
    if (!c.ctype) devs.push('no Content-Type line');
    if (c.clen === 'short') devs.push('Content-Length 5');
    if (c.clen === 'none') devs.push('no Content-Length line');
    var note = devs.length ? ' What differs from the default settings in the code box is ' + devs.join(', ') + '.' : '';
    // Step 1: the server sends the text
    st.sent = true;
    push('The browser sends a GET /hello request to the server, and the server answers by sending back the text below. This text is the HTTP response. The server in this lab sends the text in the code box exactly as it is, and closes the connection when it is done. The client that reads the response is the http module of Node.js.' + note, '');
    if (unread) {
      // Step 2: the first line is not a status line
      var first = c.ctype ? 'the first line of this text is "' + this.TYPE + '"' : c.clen !== 'none' ? 'the first line of this text is "' + this.CLEN[c.clen] + '"' : 'this text starts right away with an empty line with no text at all, and the body follows it';
      var fid = c.ctype ? 'c2' : c.clen !== 'none' ? 'c3' : 'c4';
      st[fid] = 'bad'; st.rdc = 'bad'; st.rdt = ['Not read as', 'a response']; st.arrR = true;
      st.rows.push([c.ctype ? this.TYPE : c.clen !== 'none' ? this.CLEN[c.clen] : '(empty line)', 'Not a status line. Not read as a response']);
      push('The client reads the first line. The first line of a response must be the status line, which states the rules the text was written by, like HTTP/1.1. But ' + first + '. No text starting with HTTP/ came, so the client cannot read this text as an HTTP response and raises an error.', 'bad');
      st.gst = stTxt; st.gty = tyTxt; st.gbo = boTxt; st.rcv = true; st.done = true;
      push('The client could not read the response. It got neither the status, nor the kind of body, nor the body. Nothing after this text was read either, whatever shape the ' + (c.ctype || c.clen !== 'none' ? 'headers and body' : 'body') + ' had.', 'bad');
      sum.push('If you remove the first line (the status line), the client cannot read the text as an HTTP response and raises an error. It got neither the status nor the body.');
      sum.push('It does not help even if the headers and body are right. The client reads from the status line, which starts with HTTP/, so without a status line the result is the same whatever Content-Type and Content-Length are.');
      return { events: ev, summary: sum, bytes: bytes, row: [stTxt, tyTxt, boTxt] };
    }
    // Step 2: the status line
    var line = this.STATUS[c.status];
    st.c1 = 'hot'; st.rdc = 'hot'; st.rdt = ['Reading the', 'first line']; st.arrR = true; st.gst = stTxt;
    st.rows.push([line, 'Status line. Version HTTP/1.1, status code ' + num + ', description ' + (ok ? 'OK' : 'Not Found')]);
    push('The client reads the first line. The text it read is "' + line + '". The first line (the status line) has three things written in order. HTTP/1.1 is the rules the text was written by (the version), the ' + num + ' part is a three-digit number that tells what happened to the request (the status code), and ' + (ok ? 'OK' : 'Not Found') + ' is a short description that puts that code into words for people to read. ' + (ok ? '200 means the request was handled well.' : '404 means the server could not find what was requested.') + ' The status the client read is "' + stTxt + '".', ok ? '' : 'bad');
    // Step 3: the Content-Type line
    if (c.ctype) {
      st.c1 = 'plain'; st.c2 = 'hot'; st.rdt = ['Content-Type', 'being read']; st.gty = tyTxt;
      st.rows.push([this.TYPE, 'Header. The kind of body']);
      push('The client reads the next line. The text it read is "' + this.TYPE + '". A line in the form "name: value" is called a header. The Content-Type header tells what kind of content the body is. text/plain means plain text, and charset=utf-8 means that the text is written in UTF-8.', '');
    }
    // Step 4: the Content-Length line
    if (c.clen !== 'none') {
      st.c2 = c.ctype ? 'plain' : st.c2; st.c1 = 'plain'; st.c3 = 'hot'; st.rdt = ['Content-Length', 'being read'];
      st.rows.push([this.CLEN[c.clen], 'Header. The number of bytes in the body']);
      push('The client reads the next line. The text it read is "' + this.CLEN[c.clen] + '". The Content-Length header tells how many bytes the body is, and the client uses this number to decide where the body ends. A byte is the unit used to count the size of data (it can differ from the number of characters). In UTF-8, each of the 12 characters of "' + B + '" is 1 byte, so the body is 12 bytes.' + (c.clen === 'short' ? ' The body the server actually sent is 12 bytes, but Content-Length says 5. The client follows the number written.' : ''), '');
    }
    // Step 5: the empty line
    st.c1 = 'plain'; st.c2 = c.ctype ? 'plain' : 'ghost'; st.c3 = c.clen !== 'none' ? 'plain' : 'ghost'; st.c4 = 'hot'; st.rdt = ['Empty line:', 'end of headers']; st.gty = tyTxt;
    st.rows.push(['(empty line)', 'A line with no text at all. The end of the headers']);
    var miss = (!c.ctype ? ' The Content-Type header did not come, so the client did not get any information that says what kind of content the body is.' : '') + (c.clen === 'none' ? ' The Content-Length header did not come either, so there is no information that says how many bytes the body is.' : '');
    push('The client reads the next line and finds an empty line with no text at all (the (empty line) on the screen). An empty line marks the end of the headers, and the text from the next character on is the body.' + miss, c.ctype && c.clen !== 'none' ? '' : 'bad');
    // Step 6: the body
    st.c4 = 'plain'; st.c5 = 'hot'; st.rdt = ['Reading', 'the body']; st.arrD = true; st.gbo = boTxt; st.rows.push(['Hello, world', 'Body. The actual content']);
    if (c.clen === 'right') {
      st.bsub = 'Hello, world (all 12 bytes)';
      push('The client reads as the body as many bytes as Content-Length says, 12 bytes. The text it read is "' + B + '", and the body ends exactly here. This number is how the client knows where the body ends.', 'good');
    } else if (c.clen === 'short') {
      st.c5 = 'bad'; st.bsub = 'Hello | , world (first 5 bytes only)';
      push('The client reads only as many bytes as Content-Length says, 5 bytes, as the body. The first 5 bytes are "Hello". The remaining 7 bytes (", world") are not the body of this response. The server sent 12 bytes, but the client stops at the number written. The client in this lab raised one error while reading the leftover text, but it did receive the first 5 bytes as the body.', 'bad');
    } else {
      st.bsub = 'Hello, world (until the connection closes)';
      push('This response has no Content-Length, so there is no information that says how many bytes the body is. So the client reads everything that comes as the body until the server closes the connection. This server closed the connection after sending 12 bytes, so the body is "' + B + '".', '');
    }
    // Step 7: the result of reading
    st.rdc = 'good'; st.rcv = true; st.done = true; st.rdt = ['Done reading'];
    push('The client has finished reading the response. What it read is the status "' + stTxt + '", the kind of body ' + (c.ctype ? '"' + tyTxt + '"' : 'unknown') + ', and the body "' + boTxt + '".' + (ok ? '' : ' Even though the status is 404, the body was read separately.'), ok && c.clen !== 'short' ? 'good' : 'bad');
    // Summary
    var S = [], L = [];
    if (!ok) { S.push('If you change the status code to 404, the client reads that the request ended with 404 Not Found.'); L.push('The status code is the field that tells what happened to the request, and the body is read separately. Even with 404, the body the server attached arrived at the client as it is.'); }
    if (!c.ctype) { S.push('If you remove the Content-Type line, the client does not get a header that says what kind of content the body is.'); L.push('Even without Content-Type, the text of the body arrives as it is. But the response does not say what kind of content that text is. How a browser guesses and shows the body in this case was not checked in this lab.'); }
    if (c.clen === 'short') { S.push('If you write Content-Length as 5, shorter than the body, the client reads only the first 5 bytes, "Hello", as the body.'); L.push('The client decides where the body ends by the number of bytes in Content-Length, not by the number of characters. The remaining 7 bytes the server sent were not read as the body.'); }
    if (c.clen === 'none') { S.push('Even if you remove the Content-Length line, this server closes the connection after sending all the text, so the client reads all the text it received, "Hello, world", as the body.'); L.push('Without a line that gives the length, the client knows the body has ended only when the connection closes. When the same text was sent by a server that does not close the connection, the 12 bytes of the body were received, but the response had not ended even after 1.5 seconds.'); }
    if (!devs.length) {
      sum.push('An HTTP response is a few lines of text that the server sends back. The first line (the status line) holds the version, the status code, and a short description, below it are headers in the form "name: value", and the body follows an empty line.');
      sum.push('From the status code 200 the client learned that the request was handled well, from Content-Type that the body is text/plain, and from Content-Length that the body is 12 bytes, and it read the body. The body it read is "' + B + '".');
    } else if (devs.length === 1) {
      sum.push(S[0]); sum.push(L[0]);
    } else {
      sum.push(S.join(' '));
      sum.push('The status code, Content-Type, and Content-Length are lines with different jobs, so when one changes, the others are still each read on their own.');
    }
    return { events: ev, summary: sum, bytes: bytes, row: [stTxt, tyTxt, boTxt] };
  },
  render: function (v, sim, t, H, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : null;
    if (!s) { H.text(v, 'Click Run to start with the client reading the text the server sent, one line at a time.'); return; }
    if (s.rows.length) H.table(v, ['Line the client read', 'Meaning'], s.rows.map(function (r) { return { cls: '', cells: [r[0], r[1]] }; }), 'Lines read');
    H.table(v, ['Item', 'Value'], [
      { cls: s.gst ? '' : 'gone', cells: ['Status read', s.gst ? { v: s.gst, cls: s.gst.indexOf('200') === 0 ? 'good' : 'bad' } : 'Not yet'] },
      { cls: s.gty ? '' : 'gone', cells: ['Kind of body', s.gty ? s.gty : 'Not yet'] },
      { cls: s.gbo ? '' : 'gone', cells: ['Body read', s.gbo ? s.gbo : 'Not yet'] },
    ], 'Result');
  },
  // Diagram: the server on the right, the text the server sent in the middle (the status line, the Content-Type line, the Content-Length line, the empty line, and the body as boxes), and the client on the left (reading the response and what it read). The line being read now is yellow, the line with the problem is red, and a removed line is dotted.
  draw: function (P, sim, shown) {
    var c = sim.c, last = shown[shown.length - 1], s = last ? last.snap : null, un = c.status === 'none';
    var stSub = un ? '(no status line)' : c.status === 'ok' ? 'HTTP/1.1 200 OK' : 'HTTP/1.1 404 Not Found';
    var cls1 = s ? s.c1 : (un ? 'ghost' : 'plain'), cls2 = s ? s.c2 : (c.ctype ? 'plain' : 'ghost'), cls3 = s ? s.c3 : (c.clen !== 'none' ? 'plain' : 'ghost');
    var gs = s && s.gst ? (s.gst.indexOf('Not read') === 0 ? 'none' : s.gst.split(' ')[0] === '404' ? '404' : s.gst) : '...', gt = s && s.gty ? (s.gty.indexOf('text/plain') === 0 ? 'text' : 'unknown') : '...', gb = s && s.gbo ? (s.gbo.indexOf('None') === 0 ? 'None' : s.gbo) : '...';
    P.size(680, 300);
    P.region('cl', 10, 16, 140, 216, 'Client');
    P.box('rd', 20, 44, 120, 62, { cls: s ? s.rdc : 'plain', title: 'Reading', sub: s ? s.rdt : ['Waiting'] });
    P.box('got', 20, 128, 120, 92, { cls: s && s.done ? (un ? 'bad' : 'good') : 'ghost', title: 'Read result', sub: ['Status ' + gs, 'Kind ' + gt, gb.length > 9 ? gb : 'Body ' + gb] });
    P.region('tx', 190, 16, 350, 216, 'Text the server sent');
    P.box('l1', 200, 44, 330, 30, { cls: cls1, sub: stSub, mono: !un });
    P.box('l2', 200, 82, 330, 30, { cls: cls2, sub: c.ctype ? 'Content-Type: text/plain; charset=utf-8' : '(no Content-Type line)', mono: !!c.ctype });
    P.box('l3', 200, 120, 330, 30, { cls: cls3, sub: c.clen === 'none' ? '(no Content-Length line)' : c.clen === 'right' ? 'Content-Length: 12' : 'Content-Length: 5', mono: c.clen !== 'none' });
    P.box('l4', 200, 158, 330, 30, { cls: s ? s.c4 : 'plain', sub: '(empty line)' });
    P.box('l5', 200, 196, 330, 30, { cls: s ? s.c5 : 'plain', sub: s ? s.bsub : 'Hello, world' });
    P.region('sv', 580, 16, 90, 216, 'Server');
    P.box('srv', 590, 82, 70, 70, { cls: s && s.sent ? 'wait' : 'plain', title: 'Send', sub: s && s.sent ? ['sends,', 'closes'] : ['Waiting'] });
    if (s && s.sent) P.arrow('send', 'srv:l', 'l3:r', {});
    if (s && s.arrR) P.arrow('rd1', 'l2:l', 'rd:r', { cls: un ? 'bad' : 'hot' });
    if (s && s.arrD) P.arrow('rd2', 'rd:b', 'got:t', { cls: 'good' });
    var n1c = s && s.gst ? (s.gst.indexOf('200') === 0 ? 'good' : 'bad') : 'ghost';
    P.box('n1', 14, 250, 322, 36, { cls: n1c, title: 'Status read', right: s && s.gst ? s.gst : 'Not yet' });
    P.box('n2', 344, 250, 322, 36, { cls: s && s.gbo ? (un ? 'bad' : c.clen === 'short' ? 'bad' : 'good') : 'ghost', title: 'Body read', right: s && s.gbo ? s.gbo : 'Not yet' });
  },
  assume: 'The server is one started with the net module of Node.js 24.18.0. When a connection comes, it reads the request up to the empty line, then writes the text of the code box exactly as it is, with CRLF line endings, and closes the connection (a response made with the http module cannot send a wrongly shaped one, so it was not used). Nothing is attached after the body "Hello, world", and this text is 12 bytes in UTF-8 and the first part, "Hello", is 5 bytes, which was measured to confirm. The client sent a GET /hello request with the http module of Node.js (a real HTTP parser) and read the response. All 18 combinations were run, and the status the client read (the status code and description), the value of the content-type header it received, and the body it actually received with its number of bytes were checked against the model. For each combination it was also checked that the code on the screen is the same text as the text the server sent. When Content-Length was 5, this client received only the first 5 bytes ("Hello") as the body, and then raised one parse error (HPE_INVALID_CONSTANT) while reading the remaining 7 bytes. All 6 combinations without a status line failed to read the response with the same parse error (HPE_INVALID_CONSTANT, with the message Expected HTTP/, RTSP/ or ICE/), whatever the headers and body were. These are behaviors observed on this Node.js version. When there is no Content-Length, this server closes the connection after sending, so the client read everything until the connection closed as the body. A server that does not close the connection is not covered on the screen, but as a separate check, the same text was sent to a server that does not close the connection, and the client received the 12 bytes of the body, but the response had not ended even after 1.5 seconds (when Content-Length was present, it ended right away even without closing the connection). What happens when it waits longer, or with another client, was not examined. How a browser guesses and shows a body without Content-Type was not checked in this lab. What was checked against the documentation is RFC 9112 section 2.1 (message format: start line, headers, empty line, body), section 4 (the status line: version, three-digit status code, description), sections 6.2 and 6.3 (Content-Length sets the number of bytes of the body, and for a response with no length information, the length of the body is the number of bytes received before the server closes the connection), and RFC 9110 section 8.3 (Content-Type tells the media type of the body, and without it the receiver may assume application/octet-stream or examine the data to decide the kind), section 8.6 (Content-Length), section 15 (a status code is a three-digit number), section 15.3.1 (200), and section 15.5.5 (404). The response on the screen has the minimum shape, with only two headers left, and only GET responses whose body is text were covered. Writing the line endings of the text the server sent as CRLF, and using Node.js as the client, are choices of this lab, and a browser was not used. The in-depth details on the same subject (the shape of requests and responses, all the status codes) are covered in the in-depth lab "HTTP messages and status codes".',
});

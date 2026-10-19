Lab.register({
  id: 'cookie_basic', nav: 'Cookies', cat: 'Fundamentals', mode: 'step', basic: true, deep: ['cookie'],
  title: 'What is a cookie, and who stores it and who sends it?',
  intro: 'In HTTP, each request stands on its own, so the server cannot tell by itself whether a second request came from the same person as before. A cookie is a small value made to solve this. The code box shows the response text that the server sends back to the first request, and the Set-Cookie: visitor=alice line in it is the line that hands over a cookie. With this line, the server asks, "Keep this value, and show it to me when you come next time." It is the browser that stores the value and the browser that sends it back. The browser adds the stored value to the next request to the same server as a Cookie: visitor=alice header. The server in this lab is made to send back "Welcome back, value" when the value of visitor comes in the Cookie header of a request, and "Hello, new visitor" when it does not, and this server code is not shown on the screen. You remove the Set-Cookie line, delete the cookie before the second request, or send the requests with a program that does not store cookies, and see whether the server recognizes the second request when the same server is requested twice. The (empty line) in the code box is a way to show a line with no text at all, so that you can see it.',
  terms: ['Cookie', 'Set-Cookie header', 'Cookie header', 'HTTP as a stateless protocol'],
  controls: [
    { id: 'set', label: 'The server adds a Set-Cookie: visitor=alice line to the response', type: 'check', value: true },
    { id: 'client', label: 'Who sends the requests', type: 'select', value: 'keep', options: [['keep', 'A browser that stores the cookie'], ['clear', 'A browser stores it, and the user deletes the cookie before the second request'], ['nojar', 'A program that does not store cookies']] },
  ],
  // q is the question shown on the question-style screen. t and d are the name and the description used in the text-only reading
  presets: [
    { t: 'Default settings', q: 'What does a cookie look like, and what happens when you send a second request to the same server?', d: 'The server adds Set-Cookie and the browser stores it. The browser adds a Cookie header to the second request, and the server recognizes the visitor.', v: { set: true, client: 'keep' } },
    { t: 'Removing the Set-Cookie line', q: 'What if you remove the Set-Cookie line?', d: 'The browser has nothing to store, so the second request has no Cookie header, and the server treats the visitor as someone it sees for the first time.', v: { set: false, client: 'keep' } },
    { t: 'Deleting the cookie before the second request', q: 'What if you delete the cookie in the browser before the second request?', d: 'The stored cookie is gone, so the browser cannot add a Cookie header, and the server treats the visitor as someone it sees for the first time.', v: { set: true, client: 'clear' } },
    { t: 'With a program that does not store cookies', q: 'What if the requests are sent by a program that does not store cookies?', d: 'Even if the server adds Set-Cookie, the program does not store it, so the second request has no Cookie header.', v: { set: true, client: 'nojar' } },
  ],
  code: function (c) {
    var out = ['HTTP/1.1 200 OK'];
    if (c.set) out.push('Set-Cookie: visitor=alice');
    out.push('Content-Type: text/plain; charset=utf-8', '(empty line)', 'Hello, new visitor');
    return out.join('\n');
  },
  label: function (c) { return (c.set ? 'Set-Cookie line present' : 'no Set-Cookie line') + ' · ' + { keep: 'browser stores the cookie', clear: 'cookie deleted before the second request', nojar: 'program that does not store cookies' }[c.client]; },
  columns: ['Cookie stored on the client after the first response', 'Cookie header on the second request', 'Second response'],
  simulate: function (c) {
    var ev = [], sum = [], nojar = c.client === 'nojar', clear = c.client === 'clear';
    var who = nojar ? 'The program that does not store cookies' : 'The browser', whoL = nojar ? 'a program that does not store cookies' : 'the browser';
    var saved = c.set && !nojar, cookie2 = c.set && c.client === 'keep';
    var resp2 = cookie2 ? 'Welcome back, alice' : 'Hello, new visitor';
    var st = { m: 0, jar: 'none', att: '', read: '', r1: '', r2: '', r3: '', rows: [], done: false };
    function push(s, k) { ev.push({ s: s, k: k, snap: JSON.parse(JSON.stringify(st)) }); }
    // Step 1: the first request
    st.m = 1; st.rows.push(['First request', 'no Cookie header', '']);
    push(nojar ? 'A program that does not store cookies sends a GET / request to the server. This request has no Cookie header.' : 'When you type localhost:8080 in the address bar of the browser, the browser sends a GET / request to the server. This request has no Cookie header.', '');
    // Step 2: the server reads the first request
    st.read = 'none';
    push('The server reads the request. There is no Cookie header, so it cannot tell who this is. In HTTP, each request stands on its own, so the server cannot tell by itself whether this request came from someone who came before. This server is made to send back "Welcome back, value" when a visitor value comes in the Cookie header, and "Hello, new visitor" when it does not. This server code is not shown on the screen.', '');
    // Step 3: the first response
    st.m = 2; st.rows.push(['First response', c.set ? 'Set-Cookie: visitor=alice' : 'no Set-Cookie line', 'Hello, new visitor']);
    if (c.set) push('The server sends the response. The body is "Hello, new visitor", and the Set-Cookie: visitor=alice line from the code box is attached. This line means "Keep this value, and show it to me when you come next time."', 'good');
    else push('The server sends the response. The body is "Hello, new visitor". The response in the code box has no Set-Cookie line, so the server gave nothing to keep.', '');
    // Step 4: the client receives the response
    if (saved) {
      st.jar = 'visitor=alice'; st.r1 = 'visitor=alice';
      push(who + ' receives the response and stores visitor=alice from the Set-Cookie line on its own side. The place where the value is stored is the browser, not the server. This server has no place to write down visitors.', 'good');
    } else if (c.set) {
      st.r1 = 'none';
      push(who + ' receives the response. It only reads the body and does not store the value of the Set-Cookie line, so no stored cookie remains.', 'bad');
    } else {
      st.r1 = 'none';
      push(who + ' receives the response. The response has no Set-Cookie line, so there is no value to store, and no stored cookie remains.', '');
    }
    // Step 5: the user deletes the cookie
    if (clear) {
      st.jar = 'none';
      push(c.set ? 'Before sending the second request, the user deletes the cookie in the browser. The stored visitor=alice disappears, and there is no stored cookie.' : 'Before sending the second request, the user deletes the cookie in the browser. There was no cookie to delete from the start, so nothing changes.', c.set ? 'bad' : '');
    }
    // Step 6: the second request
    st.m = 3; st.att = cookie2 ? 'Cookie: visitor=alice' : 'not added'; st.r2 = cookie2 ? 'Cookie: visitor=alice' : 'none';
    st.rows.push(['Second request', cookie2 ? 'Cookie: visitor=alice' : 'no Cookie header', '']);
    if (cookie2) push('The browser sends a second request to the same server. A cookie that this server handed over is stored, so the browser adds the stored value to the request as a Cookie: visitor=alice header. We did not write the code that adds this header. The browser does it.', 'good');
    else push(who + ' sends a second request to the same server. It has no stored cookie, so it does not add a Cookie header.', 'bad');
    // Step 7: the server reads the second request
    st.read = cookie2 ? 'visitor=alice' : 'none';
    if (cookie2) push('The server reads the request. The Cookie header has visitor=alice, so it makes "Welcome back, alice" the body. The server did not remember this person. It only read the value that came with the request. A Cookie header has come, so this response gets no Set-Cookie line.', 'good');
    else push('The server reads the request. There is no Cookie header, so, just as with the first request, it cannot tell who this is. The server does not remember that it answered once before, and it makes "Hello, new visitor" the body.' + (c.set ? ' This request has no Cookie header, so the server attaches the Set-Cookie: visitor=alice line again this time too.' : ''), 'bad');
    // Step 8: the second response
    st.m = 4; st.r3 = resp2; st.done = true; st.rows.push(['Second response', cookie2 ? 'no Set-Cookie line' : c.set ? 'Set-Cookie: visitor=alice' : 'no Set-Cookie line', resp2]);
    if (clear && c.set) st.jar = 'visitor=alice';
    push(who + ' receives the second response. The body is "' + resp2 + '".' + (clear && c.set ? ' Following the new Set-Cookie line, the browser stores visitor=alice again.' : ''), cookie2 ? 'good' : 'bad');
    // Summary
    if (cookie2) {
      sum.push('A cookie is a small value that the server hands over with the Set-Cookie header of a response (here, visitor=alice). The browser stores it and adds it to every later request to the same server as a Cookie header.');
      sum.push('HTTP treats each request on its own, so the server cannot recognize the second request by itself, but because the cookie comes with the request, it recognized the visitor with "Welcome back, alice". It was the browser, not code we wrote, that added the header.');
    } else if (!c.set) {
      sum.push('Without a Set-Cookie line, ' + whoL + ' has nothing to store and cannot add a Cookie header to the second request. The server treated the second request as coming from a first-time visitor too, and answered "Hello, new visitor".');
      sum.push('In this lab, a cookie comes into being only when the server hands one over with Set-Cookie (in a browser, JavaScript on the page can also create a cookie with document.cookie, but this lab does not cover that case). For this server, which has not handed one over, ' + whoL + ' has no cookie to send.');
    } else if (clear) {
      sum.push('If the user deletes the cookie before the second request, the browser has no value to show, so it adds no Cookie header, and the server again treats the visitor as new and answers "Hello, new visitor".');
      sum.push('The browser is the one that holds the cookie, and the user deletes it in the browser. All the server knows is whether a Cookie header came with the request, so it does not know the cookie was deleted. If the server attaches Set-Cookie again, the browser stores it again.');
    } else {
      sum.push('A program that does not store cookies does not store the value even if the response has a Set-Cookie line, so it adds no Cookie header to the second request, and the server answered "Hello, new visitor".');
      sum.push('Set-Cookie is a request from the server. Storing the value and sending it with the next request is done by the side that sends the requests. If the server adds the line but the receiving side does not store it, the cookie is not used.');
    }
    return { events: ev, summary: sum, row: [saved ? 'visitor=alice' : 'none', cookie2 ? 'Cookie: visitor=alice' : 'none', resp2] };
  },
  render: function (v, sim, t, H, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : null;
    if (!s) { H.text(v, 'Click Run to start with the browser sending the first request.'); return; }
    H.table(v, ['Text sent', 'Line about cookies', 'Body'], s.rows.map(function (r, i) { return { cls: '', cells: [r[0], { v: r[1], cls: r[1].indexOf('visitor=alice') >= 0 ? 'good' : '' }, r[2]] }; }), 'Text sent');
    H.table(v, ['Item', 'Value'], [
      { cls: s.r1 ? '' : 'gone', cells: ['Cookie stored on the client after the first response', s.r1 ? { v: s.r1, cls: s.r1 === 'visitor=alice' ? 'good' : '' } : 'Not yet'] },
      { cls: s.r2 ? '' : 'gone', cells: ['Cookie header on the second request', s.r2 ? { v: s.r2, cls: s.r2 === 'none' ? 'bad' : 'good' } : 'Not yet'] },
      { cls: s.r3 ? '' : 'gone', cells: ['Second response', s.r3 ? { v: s.r3, cls: s.r3.indexOf('Welcome back') === 0 ? 'good' : 'bad' } : 'Not yet'] },
    ], 'Result');
  },
  // Diagram: the browser on the left (with a box for the stored cookie and a box for the Cookie added to the second request), the server on the right (with a box for the Cookie the server read), and between them arrows for the first request, the first response, the second request, and the second response in order. The arrow that carries the cookie is hot, and the box for the second response is below.
  draw: function (P, sim, shown) {
    var c = sim.c, last = shown[shown.length - 1], s = last ? last.snap : null, m = s ? s.m : 0, nojar = c.client === 'nojar';
    var cookie2 = c.set && c.client === 'keep', jar = s ? s.jar : 'none';
    P.size(680, 298);
    P.region('bw', 14, 16, 196, 212, nojar ? 'No-cookie program' : 'Browser');
    P.box('jar', 24, 56, 176, 66, { cls: jar === 'visitor=alice' ? 'good' : nojar ? 'ghost' : 'plain', title: 'Stored cookie', sub: nojar ? ['Nowhere to store'] : [jar], mono: jar === 'visitor=alice' });
    P.box('att', 24, 142, 176, 66, { cls: s && s.att ? (cookie2 ? 'hot' : 'plain') : 'ghost', title: 'Cookie on request #2', sub: [s && s.att ? s.att : 'Not yet'], mono: !!(s && s.att === 'Cookie: visitor=alice') });
    P.region('sw', 470, 16, 196, 212, 'Server');
    P.box('sv1', 480, 56, 176, 66, { cls: 'plain', title: 'Server code', sub: ['visitor in Cookie?', 'yes: Welcome back,', 'no: new-visitor text'] });
    P.box('sv2', 480, 142, 176, 66, { cls: !s || !s.read ? 'ghost' : s.read === 'none' ? 'plain' : 'good', title: 'Cookie read', sub: [s && s.read ? s.read : 'Not yet'], mono: !!(s && s.read === 'visitor=alice') });
    if (m >= 1) P.arrow('a1', [210, 58], [470, 58], { label: 'GET /  (no Cookie)' });
    if (m >= 2) P.arrow('a2', [470, 104], [210, 104], { cls: c.set ? 'hot' : '', label: c.set ? 'Set-Cookie: visitor=alice' : 'Response (no Set-Cookie)' });
    if (m >= 3) P.arrow('a3', [210, 150], [470, 150], { cls: cookie2 ? 'hot' : '', label: cookie2 ? 'GET /  Cookie: visitor=alice' : 'GET /  (no Cookie)' });
    if (m >= 4) P.arrow('a4', [470, 196], [210, 196], { label: 'Response: ' + s.r3 });
    P.box('n1', 14, 246, 652, 36, { cls: s && s.r3 ? (cookie2 ? 'good' : 'bad') : 'ghost', title: 'Second response', right: s && s.r3 ? s.r3 : 'Not yet' });
  },
  assume: 'The server is a single one started with the net module of Node.js 24.18.0 on a free port of 127.0.0.1. It reads the headers of a request up to the empty line, and sends back "Welcome back, value" if the Cookie header has a value for visitor, and "Hello, new visitor" if it does not. The Set-Cookie: visitor=alice line is attached only to the response to a request that has no Cookie header while the setting is on, and the connection is closed after sending. The first response the server sent is the same as the text in the code box, line by line (if it were made with the http module, headers such as Date would be added and the text would differ, so the text was sent exactly as it is with net, and Content-Length was not used, so the end of the response is shown by closing the connection). This server has no place to write down visitors, so when a new client without a cookie made a request after that, it did not recognize the earlier visitor. The client in our test run is curl 8.21.0, which implements the cookie rules (RFC 6265). For the side that stores cookies, the same jar file was given to curl -b and -c (the cookie engine is turned on and cookies are saved to the file), and the stored cookie was obtained by reading the jar file after the first response. The user deleting the cookie was reproduced by giving a new empty jar file to the second request. The side that does not store cookies is curl without cookie options, and this curl did not add a Cookie header to the second request even though it received the Set-Cookie line of the first response. All 6 combinations were run, and the stored cookie, the Cookie header the server actually received in the second request, and the second response were checked against the model. The full headers of the two requests, the raw text of the two responses, and the arguments given to curl (there is no argument that writes a Cookie header by hand) were also checked. The check was made with the cookie engine of curl instead of a browser. Browsers also follow the same standard (RFC 6265), but the results of this lab were not run and checked in a real browser. What was checked against the documentation is RFC 6265 section 1 (the server sends a cookie with Set-Cookie, and the client decides whether to return it with Cookie in later requests), sections 3 and 3.1 (the example in which Cookie: SID=31d4d96e407aad42 is carried on the next request after receiving Set-Cookie: SID=31d4d96e407aad42), section 4.1 (Set-Cookie is the response header with which a server sends a cookie to a client), and section 4.2 (Cookie is the request header with which a client returns the cookies it has stored to the server), and that HTTP is a stateless protocol in which each request can be understood on its own follows section 3.3 of RFC 9110. The localhost:8080 on the screen is an example address, and the actual check was made on another port in our test run. Cookie attributes such as expiry, path, domain, Secure, HttpOnly, and SameSite were not covered, and the details are covered in the in-depth lab "Cookies". This server code is not shown on the screen.',
});

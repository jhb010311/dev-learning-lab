Lab.register({
  id: 'session_basic', nav: 'Sessions', cat: 'Fundamentals', mode: 'step', basic: true, deep: ['auth'],
  title: 'What is a session, and where is the logged-in state remembered?',
  intro: 'A session is a memory that is written in a store inside the server. In the code box, session is an argument of the type HttpSession, and it points to one slot in the server\'s session store that belongs to this request. The line session.setAttribute("user", "kim") in the login method writes "the user of this session is kim" in that slot, and the line session.getAttribute("user") in the me method reads that value from the slot. Each slot has a number the server gave it (the session ID), and the server gives only this number to the browser, as a cookie named JSESSIONID. The browser sends that cookie with every following request, and the server finds the slot in the store by the number and knows who it is. In this lab you change how /me is requested after logging in (without the cookie, by another person, after the server deleted the slot) and see whether the server recognizes who it is. The code box shows only the part that runs when login succeeds. The process of checking the username and password is not covered in this lab, so it was left out. What a cookie is follows the earlier "Cookies" lab.',
  terms: ['Session', 'Session ID (JSESSIONID)', 'HttpSession', 'Cookie'],
  controls: [
    { id: 'save', label: 'login runs the line session.setAttribute("user", "kim")', type: 'check', value: true },
    { id: 'second', label: 'How /me is requested', type: 'select', value: 'same', options: [['same', 'The same browser requests /me with the JSESSIONID cookie it received'], ['nocookie', 'Request /me without the JSESSIONID cookie'], ['stolen', 'Another person requests /me holding the same JSESSIONID value'], ['gone', 'After the server deletes that session (logout), request /me with the same cookie']] },
  ],
  // q is the question shown on the question-style screen. t and d are the name and the description used in the text-only reading
  presets: [
    { t: 'Default settings', q: 'How is a session used, and how does the server recognize you when you make another request after logging in?', d: 'user=kim is written in the server\'s session store and only the ID is given as a cookie. On the next request, the server finds the slot by the ID in the request and recognizes kim.', v: { save: true, second: 'same' } },
    { t: 'Requesting without the cookie', q: 'What if you request without the JSESSIONID cookie?', d: 'There is no ID, so the server does not know which slot it is, and does not know who it is.', v: { save: true, second: 'nocookie' } },
    { t: 'Another person with the same value', q: 'What if another person requests holding the same JSESSIONID value?', d: 'The server finds the slot by the ID alone, so it treats that person as kim.', v: { save: true, second: 'stolen' } },
    { t: 'After the server deleted the session', q: 'What if you request with the same cookie after the server deleted the session?', d: 'The ID is the same, but there is no slot to point to, so the server does not know who it is.', v: { save: true, second: 'gone' } },
    { t: 'Removing setAttribute', q: 'What if you remove session.setAttribute from login?', d: 'The session slot and the cookie are created, but the slot is empty, so the server does not know who it is.', v: { save: false, second: 'same' } },
  ],
  code: function (c) {
    var out = ['// Only the controller class body is shown (@RestController class declaration and imports omitted)', '@PostMapping("/login")', 'public String login(HttpSession session) {'];
    if (c.save) out.push('    // Write "the user of this session is kim" in the server\'s session store', '    session.setAttribute("user", "kim");');
    out.push('    return "Logged in";', '}', '', '@GetMapping("/me")', 'public String me(HttpSession session) {', '    // Use the session ID in the request to find the slot in the store and read it', '    Object user = session.getAttribute("user");', '    return user == null ? "Unknown user" : "Hello, " + user;', '}');
    return out.join('\n');
  },
  label: function (c) { return (c.save ? 'setAttribute runs' : 'no setAttribute') + ' · ' + { same: 'same browser, with the cookie', nocookie: 'without the cookie', stolen: 'another person with the same value', gone: 'same cookie after the server deleted it' }[c.second]; },
  columns: ['Server session store after login', 'Cookie the browser received', 'Response to the /me request'],
  simulate: function (c) {
    var ev = [], sum = [], ID = '3A9F…', ID2 = 'B71E…', CK = 'JSESSIONID=' + ID, CK2 = 'JSESSIONID=' + ID2, sec = c.second;
    // Slot: id, user (the value written), gone (the server deleted it). Snapshot state: who (the box that sent the request), show (hdr: the Cookie in the request / jar: the saved cookie), hot (the slot to highlight), tgt (the slot the request arrow points to), rq (color of the request arrow)
    var st = { slots: [], cA: '', cB: '', who: 'a', show: 'hdr', sent: '', sentCk: '', ph: '', hot: -1, tgt: -1, rq: '', rcls: '', resp: null, reqs: [] };
    var kim = c.save, bodyKim = 'Hello, kim', bodyNo = 'Unknown user';
    function push(s, k) { ev.push({ s: s, k: k, snap: JSON.parse(JSON.stringify(st)) }); }
    // 1: the login request
    st.sent = 'POST /login'; st.sentCk = ''; st.ph = 'login'; st.who = 'a'; st.show = 'hdr';
    push('When you click the login button on the login page, the browser sends a POST /login request to the server. This request has no Cookie header. The server\'s session store is empty. The process of checking the username and password is not covered in this lab, so it was left out.', '');
    // 2: the server creates a session
    st.slots.push({ id: ID, user: '', gone: false }); st.ph = 'made'; st.hot = 0;
    push('To call the login method, Spring has to fill in the session argument, but this request carries no session ID, so there is no session belonging to the request yet. So the server (Tomcat) creates a new session and gives it a random ID (the ID Tomcat gave was 32 uppercase letters and digits, and here only the first part is written, shortened to ' + ID + '). One slot is created in the store, and it is empty. Our code has no line that creates a session and no line that gives it an ID.', '');
    // 3: setAttribute
    if (kim) {
      st.slots[0].user = 'kim'; st.ph = 'write';
      push('The login method runs the line session.setAttribute("user", "kim"). user=kim is written in the slot that was just created. The place where the fact of having logged in is written is not the browser but the session store inside the server.', 'good');
    } else {
      st.ph = 'write';
      push('The login method has no session.setAttribute line, so nothing is written in the slot. The slot stays empty. The session slot was already created just by receiving the session argument, and what to write in that slot is a separate matter.', 'bad');
    }
    // 4: the response + Set-Cookie
    st.ph = 'setck'; st.rcls = 'good';
    st.reqs.push(['POST /login', 'None', 'Logged in']);
    push('The login method returns "Logged in," and a Set-Cookie: ' + CK + ' line is added to the response. We did not write code that adds this line. Tomcat adds it. The cookie value is only the ID, and the characters kim are not in it.' + (kim ? '' : ' The cookie is added when a session is newly created, so it was added even without a setAttribute line.'), kim ? 'good' : '');
    // 5: the browser saves it
    st.cA = CK; st.show = 'jar'; st.ph = 'saved'; st.hot = -1; st.rcls = '';
    push('The browser receives the response and saves the cookie ' + CK + '. What the browser holds is only the ID,' + (kim ? ' and user=kim is only in the server\'s store.' : ' and the server\'s slot is empty.'), '');
    // 6 and on: the second request
    st.sent = 'GET /me';
    var kimResp = kim && (sec === 'same' || sec === 'stolen'), respBody = kimResp ? bodyKim : bodyNo;
    if (sec === 'same') {
      st.who = 'a'; st.show = 'hdr'; st.sentCk = CK; st.ph = 'req'; st.tgt = 0; st.rq = '';
      push('The browser sends a GET /me request to the server. A cookie is saved, so the browser adds the header Cookie: ' + CK + ' to the request. We did not write code that adds this header. The browser does it.', '');
      st.ph = 'look'; st.hot = 0; st.rq = 'hot';
      push('The server reads the ID ' + ID + ' from the Cookie header of the request and looks in the session store for the slot with the same ID. The slot exists, so it does not create a new one, and passes that slot in as the session argument of the me method.', 'good');
      st.ph = 'read';
      push(kim ? 'The me method reads the slot with the line session.getAttribute("user"). user=kim is written in the slot, so it returns "Hello, kim." The server knows kim not because kim is in the cookie, but because kim is written in the slot it found by the ID.' : 'The me method reads the slot with the line session.getAttribute("user"). The slot was found by the ID, but it is empty, so the user value is null and it returns "Unknown user."', kim ? 'good' : 'bad');
    } else if (sec === 'nocookie') {
      st.who = 'a'; st.show = 'hdr'; st.sentCk = ''; st.ph = 'req'; st.tgt = -1; st.rq = '';
      push('A GET /me request arrives at the server. This request carries no JSESSIONID cookie (it was sent by something that does not send cookies, or it is a request after the cookie was deleted in the browser). There is no Cookie header.', 'bad');
      st.ph = 'look';
      push('The server has no ID to look for in the request. Even if the store has a slot with ID ' + ID + ', there is no way to tell whose request this is.', 'bad');
      st.slots.push({ id: ID2, user: '', gone: false }); st.ph = 'made2'; st.hot = 1;
      push('To fill in the session argument of the me method, the server (Tomcat) creates a new session and gives it a new ID ' + ID2 + '. The new slot is empty and is separate from the slot with ID ' + ID + '.' + (kim ? ' The user=kim in that slot remains on the server as it was.' : ''), '');
      st.ph = 'read';
      push('The me method reads the new slot with the line session.getAttribute("user"). It is empty, so the user value is null and it returns "Unknown user."', 'bad');
    } else if (sec === 'stolen') {
      st.who = 'b'; st.show = 'hdr'; st.sentCk = CK; st.cB = CK; st.ph = 'req'; st.tgt = 0; st.rq = '';
      push('Another person sends a GET /me request to the server. This person has never logged in, but knows the ID ' + ID + ', so they write the header Cookie: ' + CK + ' themselves and send it. This request comes over a connection separate from the logged-in browser A. How this ID was found out is not covered in this lab.', 'bad');
      st.ph = 'look'; st.hot = 0; st.rq = 'hot';
      push('The server reads the ID ' + ID + ' from the Cookie header of the request, finds the slot with the same ID in the session store, and passes it in to the me method. The server looked only at whether the ID was the same, and did not check whether this request came from the browser that logged in. No new slot was created either.', 'bad');
      st.ph = 'read';
      push(kim ? 'The me method reads the slot with the line session.getAttribute("user"). user=kim is written in the slot, so the server sees this person as kim and returns "Hello, kim."' : 'The me method reads the slot with the line session.getAttribute("user"). The slot was found by the ID, but it is empty, so the user value is null and it returns "Unknown user." The slot the stolen ID points to has nothing written in it, so there is nothing to recognize.', kim ? 'bad' : '');
    } else {
      st.who = 'a'; st.show = 'hdr'; st.sent = 'POST /logout'; st.sentCk = CK; st.ph = 'logout'; st.tgt = -1; st.rq = '';
      st.slots[0].gone = true; st.slots[0].user = ''; st.hot = -1; st.reqs.push(['POST /logout', CK, 'Logged out']);
      push('When the user logs out, the browser sends a POST /logout request to the server with the header Cookie: ' + CK + ', and the logout method on the server runs session.invalidate() and deletes the slot with ID ' + ID + '. This method is not shown in the code box. The response does not carry a Set-Cookie line that tells the browser to delete the cookie, so the browser keeps the ID as it is.', 'bad');
      st.sent = 'GET /me'; st.ph = 'req'; st.tgt = 0;
      push('The browser sends a GET /me request to the server. The saved cookie is still there, so the browser adds the header Cookie: ' + CK + ' to the request.', '');
      st.ph = 'look'; st.rq = 'bad';
      push('The server reads the ID ' + ID + ' from the Cookie header of the request and looks in the session store for the slot with the same ID. That slot has already been deleted, so it cannot be found. The ID is there, but there is no slot to point to.', 'bad');
      st.slots.push({ id: ID2, user: '', gone: false }); st.ph = 'made2'; st.hot = 1; st.rq = '';
      push('To fill in the session argument of the me method, the server (Tomcat) creates a new session and gives it a new ID ' + ID2 + '. The new slot is empty.', '');
      st.ph = 'read';
      push('The me method reads the new slot with the line session.getAttribute("user"). It is empty, so the user value is null and it returns "Unknown user."', 'bad');
    }
    // Last: the response
    var newCookie = sec === 'nocookie' || sec === 'gone';
    st.ph = 'done'; st.resp = respBody; st.rcls = kimResp ? (sec === 'stolen' ? 'bad' : 'good') : 'bad'; st.tgt = -1; st.rq = '';
    st.reqs.push([(sec === 'stolen' ? '(other person) ' : '') + 'GET /me', st.sentCk || 'None', respBody]);
    if (sec === 'stolen') { st.who = 'b'; }
    push((sec === 'stolen' ? 'The other person' : 'The browser') + ' receives a 200 response. The body is "' + respBody + '".' + (newCookie ? ' This response carries a Set-Cookie: ' + CK2 + ' line with the new ID.' : ' This response carries no Set-Cookie line. This is because an existing slot was found.'), kimResp ? (sec === 'stolen' ? 'bad' : 'good') : 'bad');
    // Summary
    if (kim && sec === 'same') {
      sum.push('A session is login information written in a store on the server, and what the browser carries around is only the ID that points to that slot (the JSESSIONID cookie). When you make another request after logging in, the ID arrives as a cookie, and the server finds the slot by the ID and recognizes kim.');
      sum.push('user=kim is on the server and the cookie has only the ID. Tomcat and the browser attach and send the cookie, and the code we wrote is only two lines that write to and read from the slot.');
    } else if (kim && sec === 'nocookie') {
      sum.push('If you make a request without the ID, the server cannot tell which slot it is, so it does not know who it is. The slot with user=kim is still on the server, but this request has no ID that points to it.');
      sum.push('The server created a new empty session for the request without an ID. Because the login information is in the server\'s slot and not in the cookie, the logged-in state does not reach a request that has no cookie.');
    } else if (kim && sec === 'stolen') {
      sum.push('If another person comes with the same ID, the server sees that person as kim. The server only finds the slot by the ID, and it does not check who brought the ID.');
      sum.push('So a session ID is like an ID card, and it must not leak to others. How an ID leaks and how to prevent it are not covered in this lab; they are covered in the in-depth labs.');
    } else if (kim && sec === 'gone') {
      sum.push('When the server deletes the slot, the server does not know who it is even if the browser brings the same ID. This is because there is no slot for the ID to point to.');
      sum.push('The fact of having logged in is in the server\'s slot, so when the server deletes the slot (logout), the logged-in state ends even if the cookie remains in the browser. The server created a new empty session for the request whose ID it could not find.');
    } else if (sec === 'same') {
      sum.push('The session slot and the JSESSIONID cookie were created, and the cookie came with the next request, but the slot is empty, so the server does not know who it is. Only when there is a setAttribute line that writes user in the slot does the server recognize the logged-in person.');
      sum.push('Having a session and having logged in are different things. Receiving the session argument creates the session slot, and the information that you logged in appears only when you write it in the slot yourself.');
    } else if (sec === 'nocookie') {
      sum.push('Without the setAttribute line, nothing is written in the slot whichever way you request. This time there was no ID either, so the server created an empty session, and it does not know who it is.');
      sum.push('With or without a cookie, if the login information was not written in the slot, the server has nothing to recognize.');
    } else if (sec === 'stolen') {
      sum.push('There is no setAttribute line and the slot is empty, so the server does not know who it is even if someone comes with the same ID. If the slot has no login information, stealing the ID gains nothing.');
      sum.push('The ID is useful because of the login information written in the slot. In this case too, the server found the slot only by checking whether the ID was the same.');
    } else {
      sum.push('There was no setAttribute line and the server also deleted the slot, so the server does not know who it is even if you request with the same cookie. The server created a new empty session for the request whose ID it could not find.');
      sum.push('The slot was empty, so the server would not have known who it was even before the deletion. Only when you write the login information in the slot does the session remember the logged-in state.');
    }
    return { events: ev, summary: sum, row: [kim ? '1 session: user=kim' : '1 session: empty', 'JSESSIONID=(32 random characters)', respBody] };
  },
  render: function (v, sim, t, H, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : null;
    if (!s) { H.text(v, 'Click Run to start with the browser sending the login request.'); return; }
    H.table(v, ['ID', 'Contents'], s.slots.length ? s.slots.map(function (k) { return { cls: k.gone ? 'gone' : '', cells: [k.id, k.gone ? 'Deleted' : k.user ? { v: 'user=' + k.user, cls: 'good' } : 'Empty'] }; }) : [{ cls: 'gone', cells: ['Empty', ''] }], 'Server session store');
    H.table(v, ['Request', 'Cookie sent with the request', 'Response'], s.reqs.map(function (r) { return { cls: '', cells: [r[0], r[1] === 'None' ? { v: r[1], cls: 'bad' } : r[1], { v: r[2], cls: r[2] === 'Hello, kim' ? 'good' : r[2] === 'Unknown user' ? 'bad' : '' }] }; }), 'Requests exchanged');
    H.table(v, ['Item', 'Value'], [
      { cls: '', cells: ['Cookie saved by browser A', s.cA ? { v: s.cA, cls: 'good' } : 'Not yet'] },
      { cls: s.resp ? '' : 'gone', cells: ['Response to the /me request', s.resp ? { v: s.resp, cls: s.resp === 'Hello, kim' ? 'good' : 'bad' } : 'Not yet'] },
    ], 'Result');
  },
  // Diagram: on the left the browser (what it holds is only the ID, and the box for another person appears only for a stolen value), on the right the session store inside the server (slots with IDs). What matters is the arrow from the ID in the request to the slot in the store (no ID means no arrow, and a deleted slot has nowhere to go, so it is red). At the bottom, the box for the /me response.
  draw: function (P, sim, shown) {
    var c = sim.c, last = shown[shown.length - 1], s = last ? last.snap : null;
    P.size(680, 340);
    var stolen = c.second === 'stolen', ph = s ? s.ph : '';
    P.region('bw', 14, 16, 212, 256, 'Browser');
    function bsub(who) {
      var mine = s && s.who === who && s.sent;
      if (!s) return ['Waiting', 'Saved cookie:', 'None'];
      if (who === 'b') return mine ? [s.sent, 'Cookie header:', s.sentCk || 'None'] : ['Waiting', 'Value it holds:', 'None'];
      if (mine && s.show === 'hdr') return [s.sent, 'Cookie header:', s.sentCk || 'None'];
      return [mine ? s.sent : 'Waiting', 'Saved cookie:', s.cA || 'None'];
    }
    var aOn = s && s.who === 'a' && (ph === 'login' || ph === 'req' || ph === 'look' || ph === 'logout');
    P.box('ba', 24, 44, 192, 88, { cls: aOn ? 'wait' : 'plain', title: 'Browser A', sub: bsub('a') });
    if (stolen) P.box('bb', 24, 158, 192, 88, { cls: s && s.who === 'b' && s.sent ? 'bad' : 'ghost', title: 'Another person', sub: bsub('b') });
    P.region('sw', 330, 16, 336, 256, 'Server (Tomcat)');
    P.region('stg', 340, 40, 316, 222, 'Session store');
    var slots = s ? s.slots : [];
    for (var i = 0; i < 2; i++) {
      var k = slots[i], y = 68 + i * 98;
      if (!k) { if (i === 0) P.box('s0', 352, y, 292, 76, { cls: 'ghost', title: 'No slot', sub: [' ', ' '] }); continue; }
      var hot = s.hot === i;
      P.box('s' + i, 352, y, 292, 76, { cls: k.gone ? 'ghost' : hot ? 'hot now' : k.user ? 'good' : 'plain', title: 'ID ' + k.id, sub: k.gone ? ['Deleted slot', ' '] : [k.user ? 'user=' + k.user : 'Empty', ' '] });
    }
    var from = s && s.who === 'b' ? 'bb' : 'ba';
    if (s && (ph === 'req' || ph === 'look' || ph === 'read') && s.tgt >= 0 && s.sentCk) P.arrow('rq', from + ':r:0.4', 's' + s.tgt + ':l:0.4', { cls: s.rq });
    if (s && (ph === 'setck' || ph === 'done')) {
      var hs = ph === 'setck' ? 0 : Math.max(0, s.hot);
      P.arrow('rs', 's' + hs + ':l:0.75', from + ':r:0.75', { cls: s.rcls });
    }
    P.box('res', 14, 288, 652, 36, { cls: s && s.resp ? (s.rcls === 'bad' ? 'bad' : 'good') : 'ghost', title: 'Response to /me', right: s && s.resp ? s.resp : 'Not yet' });
  },
  assume: 'These are the results of running Spring Boot 4.1.1 (Spring Framework 7.0.9, embedded Tomcat 11.0.24) on JDK 21. For all eight combinations, we compiled the same source as the code on the screen (with only the logout method, which is not on the screen, added) in the package app, started a new Java process together with a start class (@SpringBootConfiguration, @EnableAutoConfiguration, @ComponentScan), and checked. We did not register the controller by hand but let Spring scan for the classes, and we sent the requests over real HTTP after the server was up. We did not put Spring Security, JPA, or H2 on the classpath (because with Security present, requests could be blocked and session handling could differ). The code on the screen leaves out the package and import lines, the class declaration, and the logout method. The logout method runs session.invalidate() and returns "Logged out", and the process of checking the username and password is also left out because this lab does not cover it. What we checked against was the server\'s session store right after login (the number of sessions in the Tomcat session manager and what is written in each slot), the Set-Cookie of the login response, and the response to /me. "The same browser" is one client that writes the value of the Set-Cookie it received directly into the Cookie header of the next request (we did not use a cookie jar, and we did not run it in a real browser), "another person" is a separate connection (a separate client) that writes the same value into the Cookie header and sends it, and the server deleting the session was reproduced by first sending POST /logout with the same cookie. The IDs on the screen (3A9F…, B71E…) are made-up examples for explanation, and in reality they were 32 uppercase letters and digits that differed every run. What the documents decide is Chapter 7 of the Jakarta Servlet 6.1 specification (7.1.1: the standard name of the session tracking cookie is JSESSIONID, 7.2: a session is new until the client returns the tracking information to the server and joins it, and the id can be read with getId(), 7.5: once invalidation starts, new requests cannot see that session) and the API documentation of HttpSession (a session is a way to identify a user across more than one request and to store information about that user, and the identifier returned by getId is assigned by the servlet container and is implementation dependent). What follows is not decided by the documents but is behavior we observed in this version. The ID is 32 uppercase letters and digits and the cookie value does not contain kim; the cookie carries the attributes Path=/ and HttpOnly; a method that takes a session argument creates a session even if it does not call setAttribute, and a cookie goes out (Spring calls getSession() of the request to fill that argument; we confirmed this call in the bytecode of the Spring class); if /me is requested without a cookie, the server creates a new empty session and gives a new ID; even if the same ID is sent over a separate connection, the server treats it as the same session and does not create a new one (the connection ports of the two requests were different); if a request comes with the ID of a session the server deleted, the server creates a new session and gives a new ID; and the logout response has no Set-Cookie line that tells the browser to delete the cookie. The attack that steals a session ID and the defenses against it (session fixation, the HttpOnly setting, and so on) are not covered in this lab, and are left to the study labs ("Sessions and JWT" and "Session hijacking and session fixation"). We also did not cover the session timeout, how to share sessions among several servers, or methods that do not use cookies (such as putting the ID in the URL).',
});

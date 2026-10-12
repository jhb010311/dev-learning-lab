Lab.register({
  id: 'sessionfix', nav: 'Session hijacking and session fixation', cat: 'Authentication', mode: 'step',
  title: 'Whoever knows the session ID is that user',
  intro: 'The server decides "whose request this is" only from the session ID that arrives in the request\'s cookie. So anyone who knows the session ID of a logged-in session can act as that user without knowing the password (session hijacking). Session fixation reverses the order. If the session ID used before login stays the same after login, a person who already knew that ID gets to use the logged-in session.',
  terms: ['Session', 'Session hijacking', 'Session fixation', 'HttpOnly, Secure, and SameSite', 'Cookie'],
  controls: [
    { id: 'fix', label: 'What the server does to the session when login succeeds', type: 'select', value: 'none', options: [['default', 'Change the session ID to a new value (Spring Security default)'], ['newSession', 'Create a new session and discard the old contents (newSession)'], ['none', 'Do nothing (protection turned off: none)']] },
    { id: 'when', label: 'When another person learned the session ID', type: 'select', value: 'before', options: [['before', 'Before login: the victim is made to use an ID the attacker already holds (session fixation)'], ['after', 'After login: the ID of the logged-in session is obtained (session hijacking)']] },
    { id: 'logout', label: 'The victim logs out before that person sends a request', type: 'check', value: false },
  ],
  presets: [
    { t: 'Default settings', q: 'What happens when a victim logs in with a session ID the attacker already holds, on a server that does nothing at login (none)?', d: 'The session ID stays the same after login. A request from a person who knew that ID in advance is handled as kim.', v: { fix: 'none', when: 'before', logout: false } },
    { t: 'With the Spring Security default', q: 'What if the server changes the session ID to a new value when login succeeds (the Spring Security default)?', d: 'The ID changes at the moment of login, so the ID obtained in advance is useless.', v: { fix: 'default', when: 'before', logout: false } },
    { t: 'Creating a new session', q: 'What if the server creates a new session and discards the old contents when login succeeds (newSession)?', d: 'The ID changes just the same, but the cart filled before login is lost.', v: { fix: 'newSession', when: 'before', logout: false } },
    { t: 'If the ID after login leaks', q: 'What if the server changes the session ID at login, but the attacker learns the ID of the logged-in session?', d: 'Changing the ID at login does not stop this.', v: { fix: 'default', when: 'after', logout: false } },
    { t: 'If the victim logs out', q: 'What if, with the Spring Security default, the victim logs out before the person who learned the logged-in session ID sends a request?', d: 'The server deletes the session, so the leaked ID no longer works.', v: { fix: 'default', when: 'after', logout: true } },
    { t: 'Protection off, but the victim logs out', q: 'What if protection is turned off and the victim logs out before that person sends a request?', d: 'The request is blocked after logout, but the session was open for as long as the victim stayed logged in.', v: { fix: 'none', when: 'before', logout: true } },
  ],
  code: function (c) {
    var sm = c.fix === 'none' ? '        .sessionManagement(s -> s\n            .sessionFixation(f -> f.none()))          // leave the session as it is on login (protection off)\n'
      : c.fix === 'newSession' ? '        .sessionManagement(s -> s\n            .sessionFixation(f -> f.newSession()))    // create a new session and do not carry over the old contents\n'
      : '        // sessionManagement is not written explicitly.\n        // Default: when login succeeds, change the session ID to a new value (changeSessionId)\n';
    return '@Bean\nSecurityFilterChain filterChain(HttpSecurity http) throws Exception {\n    return http\n        .authorizeHttpRequests(a -> a\n            .requestMatchers("/cart").permitAll()      // the cart can be used before login\n            .anyRequest().authenticated())\n        .formLogin(Customizer.withDefaults())          // log in with POST /login\n' + sm + '        .build();\n}\n\n' +
      '@GetMapping("/me")\nString me(Principal p) {\n    return p.getName();                  // whose request this one was handled as\n}\n\n@PostMapping("/cart")\nString add(@RequestParam String item, HttpSession session) {\n    session.setAttribute("cart", item);  // write the cart into the session\n    return "ok";\n}\n\n' +
      '// Response header when the server sends down a session ID (Spring Boot default settings)\n// Set-Cookie: JSESSIONID=aaa111; Path=/; HttpOnly';
  },
  label: function (c) { return { default: 'ID replaced at login', newSession: 'New session at login', none: 'Protection off' }[c.fix] + ' · ' + (c.when === 'before' ? 'Knows the ID from before login' : 'Knows the ID from after login') + (c.logout ? ' · Victim logged out' : ''); },
  columns: ['Session ID after login', 'Cart filled before login', 'Request from another user with that ID', 'What blocked it'],
  // Only the result is calculated (the part checked against a real server)
  outcome: function (c) {
    var changed = c.fix !== 'none', kept = c.fix !== 'newSession', current = c.when === 'after' || !changed, ok = current && !c.logout;
    return { changed: changed, kept: kept, current: current, ok: ok, by: ok ? 'Not blocked' : !current ? 'Session ID replaced at login' : 'Logout (session deleted)' };
  },
  simulate: function (c) {
    var R = this.outcome(c), A = 'aaa111', B = 'bbb222', post = R.changed ? B : A, known = c.when === 'before' ? A : post, ev = [], sum = [];
    var st = { msgs: [], s1: { on: false, user: '', cart: '', gone: '' }, s2: { on: false, user: '', cart: '', gone: '' }, vc: '', known: '', rows: [], att: '' };
    function push(s, k) { ev.push({ s: s, k: k || '', snap: JSON.parse(JSON.stringify(st)) }); }
    function msg(f, t, s, cls) { st.msgs.push(t ? { f: f, t: t, s: s, cls: cls || '' } : { f: f, s: s, cls: cls || '' }); }
    function row(who, req, cookie, res, cls) { st.rows.push([who, req, cookie, { v: res, cls: cls || '' }]); }
    if (c.when === 'before') {
      st.s1.on = true; st.known = A; msg('a', 's', 'GET /login'); msg('s', 'a', 'Set-Cookie: JSESSIONID=' + A, 'hot'); row('Another user', 'GET /login', '(none)', '200 · Set-Cookie: JSESSIONID=' + A + '; Path=/; HttpOnly');
      push('Another user (the attacker) opens the login page of shop.example. The server creates a session for the browser that has just arrived and sends down session ID ' + A + ' in the Set-Cookie response header. No one has logged in to this session yet. The attacker writes this ID down.');
      st.vc = A; msg('*', '', 'Victim\'s browser uses known ID ' + A + ' as cookie', 'bad');
      push('The attacker gets this session ID into the victim\'s browser as a cookie. This lab does not cover how, and only assumes the result: "the victim\'s browser sends ' + A + ' as a cookie". Nothing has been gained yet, because this is not a logged-in session.', 'bad');
    } else {
      st.s1.on = true; st.vc = A; msg('v', 's', 'GET /login'); msg('s', 'v', 'Set-Cookie: JSESSIONID=' + A, 'hot'); row('Victim', 'GET /login', '(none)', '200 · Set-Cookie: JSESSIONID=' + A + '; Path=/; HttpOnly');
      push('The victim opens the login page of shop.example. The server creates a session for the browser that has just arrived and sends down session ID ' + A + ' in the Set-Cookie response header. This session is not logged in yet.');
    }
    st.s1.cart = 'keyboard'; msg('v', 's', 'POST /cart · cookie ' + A); row('Victim', 'POST /cart (keyboard)', 'JSESSIONID=' + A, '200 · cart written into the session');
    push('POST /cart: before logging in, the victim puts a keyboard in the cart. The browser sends the cookie JSESSIONID=' + A + ' with the request, and the server writes the cart into that session.');
    msg('v', 's', 'POST /login · cookie ' + A);
    push('POST /login: the victim sends a user name and password. The cookie is still JSESSIONID=' + A + '. The server checked the user name and password, and authentication succeeded.');
    if (c.fix === 'default') {
      st.s1.gone = 'ID changed to ' + B + ' at login'; st.s2 = { on: true, user: 'kim', cart: 'keyboard', gone: '' };
      msg('s', 'v', '302 · Set-Cookie: JSESSIONID=' + B, 'good'); row('Victim', 'POST /login', 'JSESSIONID=' + A, '302 · Set-Cookie: JSESSIONID=' + B + '; Path=/; HttpOnly', 'good');
      push('Right after login succeeds: Spring Security changes the session ID to a new value, ' + B + '. It leaves the contents of the session (the cart) as they are, changes only the ID, and then records the logged-in user kim. The new ID reaches the victim\'s browser in the Set-Cookie of the response, and the ID ' + A + ' ceases to exist on the server.', 'good');
    } else if (c.fix === 'newSession') {
      st.s1.gone = 'Discarded'; st.s2 = { on: true, user: 'kim', cart: '', gone: '' };
      msg('s', 'v', '302 · Set-Cookie: JSESSIONID=' + B, 'good'); row('Victim', 'POST /login', 'JSESSIONID=' + A, '302 · Set-Cookie: JSESSIONID=' + B + '; Path=/; HttpOnly', 'good');
      push('Right after login succeeds: Spring Security discards the old session, creates a new session ' + B + ', and records the logged-in user kim in it. The cart in the old session is not moved to the new session. The new ID reaches the victim\'s browser in the Set-Cookie of the response.', 'good');
    } else {
      st.s1.user = 'kim';
      msg('s', 'v', '302 · no new Set-Cookie', 'bad'); row('Victim', 'POST /login', 'JSESSIONID=' + A, '302 · no Set-Cookie (same ID kept)', 'bad');
      push('Right after login succeeds: nothing is done to the session. The logged-in user kim is recorded in the original session ' + A + ' as it is, and the response has no new Set-Cookie. The ID used before login has become the ID of the logged-in session.', 'bad');
    }
    st.vc = post;
    msg('v', 's', 'GET /cart · cookie ' + post + ' → ' + (R.kept ? 'keyboard' : 'empty')); row('Victim', 'GET /cart', 'JSESSIONID=' + post, R.kept ? '200 · keyboard' : '200 · empty', R.kept ? '' : 'hot');
    push('GET /cart: the victim\'s browser now sends the cookie JSESSIONID=' + post + '. ' + (R.kept ? 'The keyboard is still in the cart.' + (R.changed ? ' Only the ID changed, and the contents of the session stayed the same.' : '') : 'The cart is empty. The new session holds nothing that was put in before login.'));
    if (c.when === 'after') {
      st.known = post; msg('a', '', 'Learned the ID of the logged-in session: ' + post, 'bad');
      push('Another user (the attacker) learns the ID of the logged-in session (' + post + '). Typical routes are a script injected into the page reading the cookie when the cookie has no HttpOnly, and eavesdropping on communication that is not https. This lab only assumes the result: "the ID was learned".', 'bad');
    }
    if (c.logout) {
      (R.changed ? st.s2 : st.s1).gone = 'Deleted by logout'; st.vc = '';
      msg('v', 's', 'POST /logout · cookie ' + post); row('Victim', 'POST /logout', 'JSESSIONID=' + post, '302 · server deleted the session');
      push('POST /logout: the victim logs out. The server deletes that session (' + post + '). This ID no longer points to any session on the server.');
    }
    st.att = R.ok ? 'ok' : 'blocked';
    msg('a', 's', 'GET /me · cookie ' + known); msg('s', 'a', R.ok ? '200 · kim' : '302 · to the login page', R.ok ? 'bad' : 'good'); row('Another user', 'GET /me', 'JSESSIONID=' + known, R.ok ? '200 · kim' : '302 · sent to /login', R.ok ? 'bad' : 'good');
    push('GET /me: from their own computer, the attacker puts the ID they know in the cookie (JSESSIONID=' + known + ') and sends a request. ' + (R.ok
      ? 'The server finds the session by that ID, handles the request as the request of kim recorded there, and answers 200. The only thing the server looks at is the session ID, so it does not tell which computer sent the request. The attacker never entered the password.'
      : !R.current ? 'The server has no session with that ID, because ' + (c.fix === 'default' ? 'the ID was changed to ' + B + ' at login.' : 'login switched to the new session ' + B + '.') + ' The server treats this as a request that is not logged in and sends it to the login page with a 302.'
        : 'The server has no session with that ID, because it was deleted at logout. The server treats this as a request that is not logged in and sends it to the login page with a 302.'), R.ok ? 'bad' : 'good');
    var row3 = R.ok ? '200 · handled as kim' : '302 · sent to the login page';
    if (c.when === 'before' && R.ok) sum.push('Session fixation: if the session ID is the same before and after login, a person who already knew that ID gets to use the logged-in session without knowing the password. You can prevent this by changing the session ID at the moment login succeeds, and Spring Security does that even if you configure nothing.');
    if (c.when === 'before' && !R.changed && c.logout) sum.push('This time the request was blocked only because logout deleted the session. While the victim was logged in, anyone could get in with the ID known in advance.');
    if (c.when === 'before' && R.changed) sum.push('The session ID changed at the moment of login, so the ID obtained in advance does not point to any session.');
    if (c.when === 'after') sum.push('Session hijacking: anyone who knows the ID of a logged-in session is handled as that user. The protection that changes the ID at login does not help against an ID that leaks after login. That is why you add HttpOnly (so scripts cannot read it) and Secure (so it is sent only over https) to the cookie.');
    if (c.when === 'after' && c.logout) sum.push('When the user logs out, the server deletes the session, so the leaked ID no longer works. Keeping the session timeout short is done for the same reason: it reduces the time during which an ID is useful.');
    if (!R.kept) sum.push('The approach that creates a new session does not carry over the values put in the session before login (the cart). The default, "change only the ID", leaves the contents as they are.');
    return { events: ev, summary: sum, row: [R.changed ? 'Changed to a new ID' : 'Same as before login', R.kept ? 'Still there' : 'Gone', row3, R.by] };
  },
  sesText: function (x) { return !x.on ? ['Not created yet', ' '] : x.gone ? ['Gone', x.gone] : ['Logged-in user: ' + (x.user || 'none'), 'Cart: ' + (x.cart || 'empty')]; },
  render: function (v, sim, t, H, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : null;
    if (!s) { H.text(v, 'Click Run to go step by step, starting from before login.'); return; }
    H.counters(v, [[s.vc || 'None', 'Session ID in the victim\'s browser']]);
    H.table(v, ['Who', 'Request', 'Cookie sent', 'Server response'], s.rows.map(function (r) { return { cells: [{ v: r[0], cls: r[0] === 'Another user' ? 'hot' : '' }, r[1], r[2], r[3]] }; }), 'Request log');
  },
  // Diagram: the upper part is the order of requests and responses between the attacker, the server, and the victim's browser. The lower part is the state of the two sessions the server holds.
  draw: function (P, sim, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : { msgs: [], s1: { on: false }, s2: { on: false }, vc: '', known: '', att: '' };
    var end = P.seq([['a', 'Another user', 'hot'], ['s', 'shop.example server'], ['v', 'Victim\'s browser', 'wait']], s.msgs, { keep: 6 }), y = end + 12, self = this;
    [['s1', 'aaa111', 16], ['s2', 'bbb222', 344]].forEach(function (d) {
      var x = s[d[0]], known = s.known === d[1], bad = known && x.on && !x.gone && x.user;
      P.box(d[0], d[2], y, 320, 64, { cls: !x.on || x.gone ? 'ghost' : bad ? 'bad' : x.user ? 'good' : 'plain', title: 'Session ' + d[1] + (known ? ' · attacker knows ID' : ''), sub: self.sesText(x) });
    });
    P.size(680, y + 64 + 14);
    P.note('The upper part is the order in which requests and responses were exchanged, and the lower part is the sessions the server holds. A green box is a logged-in session, a red box is a logged-in session whose ID the attacker knows, and a dashed box is a session that does not exist or is gone. Session IDs are shortened to make them easy to read.');
  },
  assume: 'All 12 combinations were checked against real execution on the PC used to write this lab. A Spring Boot 4.1.1 and Spring Security 7.1.1 server was started on 127.0.0.1 and run with the same settings as on the screen. The checks were: whether the JSESSIONID that the server sends down changes before and after form login, whether the cart filled before login survives, and whether the response to a request that carries an ID another person knows in its cookie (200 with the body kim, or 302 with /login) matches the screen. Here the "attacker" and the "victim" are requests from the same test program that differ only in the session ID put in the cookie, and no real browser was used. How an attacker plants a session ID in the victim\'s browser, and how the ID of a logged-in session is learned, were not run; only the result that this happened is assumed. That a script cannot read an HttpOnly cookie was checked with a real browser in the "Cookies" lab. The real session ID was 32 characters long (checked on this server) and is generated randomly so that it cannot be guessed. The aaa111 and bbb222 on the screen are shortened to make them easy to read. That the Set-Cookie attributes of the session ID the server sends down are "Path=/; HttpOnly", and that Secure is added when you set server.servlet.session.cookie.secure=true, were also checked on this server. Even when the behavior at login was specified explicitly as changeSessionId or migrateSession, the result seen from outside was the same as the default. A session is created when the login page is first opened because the CSRF token placed on that page is kept in the session. That a session disappears when the session timeout passes was not checked by execution. The reference is the explanation of session fixation protection in the Session Management chapter of the Spring Security documentation (Servlet Applications, Authentication). Sharing sessions when there are several servers is covered in the "Sessions and JWT" lab.',
});

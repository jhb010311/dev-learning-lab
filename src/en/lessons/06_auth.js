Lab.register({
  id: 'auth', nav: 'Sessions and JWT', cat: 'Authentication', mode: 'step',
  title: 'Where is the login state stored?',
  why: 'An HTTP request knows nothing about the earlier requests, so if you do not want to send the password again with every request, you need a mark that says "this user has already logged in". A session solves this: the server stores the login record and finds it by the session ID. A JWT lets the server only verify a token that it signed, so even with many servers, it can identify the user without a shared store for login records.',
  use: 'A web service where the server builds the pages commonly uses sessions, and when there are several servers, the sessions are kept in a shared store such as Redis. For mobile apps and for APIs where several services must verify the same login, JWT is commonly used. A token that has already been issued is hard to invalidate before it expires, so the access token is kept short and a new one is issued with a refresh token.',
  intro: 'A logged-in user sends requests at 10-minute intervals, and a load balancer hands the requests to the servers in turn. See what happens when you add servers or force a logout, first when the server remembers the login state (a session) and then when the client carries it (a JWT).',
  terms: ['Cookie', 'Session', 'JSON Web Token (JWT)', 'Access token and refresh token', 'HTTP as a stateless protocol'], ranks: ['auth', 'http'],
  controls: [
    { id: 'mode', label: 'Authentication method', type: 'select', value: 'local', options: [['local', 'Session (stored in each server\'s memory)'], ['redis', 'Session (stored in a shared store, Redis)'], ['jwt', 'JWT (access token only)'], ['refresh', 'JWT (access token + refresh token)']] },
    { id: 'servers', label: 'Number of servers', type: 'range', min: 1, max: 3, value: 2, fmt: function (v) { return v + (v === 1 ? ' server' : ' servers'); } },
    { id: 'exp', label: 'Access token expiration time', type: 'select', value: '25', options: [['15', '15 min'], ['25', '25 min'], ['45', '45 min']], show: function (c) { return c.mode === 'jwt' || c.mode === 'refresh'; } },
    { id: 'kick', label: 'An administrator forces this user to log out at 25 min', type: 'check', value: false },
  ],
  presets: [
    { t: 'Default settings', q: 'What happens to the login state when you use sessions stored in each server\'s memory on 2 servers?', d: 'Session in server memory, 2 servers. A request that goes to a different server is no longer logged in.', v: { mode: 'local', servers: 2, exp: '25', kick: false } },
    { t: 'Move the session to Redis', q: 'What if you change the authentication method to a session stored in a shared store, Redis?', d: 'The login stays valid whichever server the request goes to. In exchange, every request queries the store.', v: { mode: 'redis', servers: 2, exp: '25', kick: false } },
    { t: 'Switch to JWT', q: 'What if you change the authentication method to JWT (access token only)?', d: 'The server remembers nothing. The token expires after 25 minutes.', v: { mode: 'jwt', servers: 2, exp: '25', kick: false } },
    { t: 'JWT with a forced logout', q: 'What if you use JWT (access token only) with a 45 min expiration and an administrator forces the user to log out at 25 min?', d: 'There is no way to stop a token that has already been issued until it expires.', v: { mode: 'jwt', servers: 2, exp: '45', kick: true } },
    { t: 'Session with a forced logout', q: 'What if an administrator forces the user to log out at 25 min with a session stored in Redis?', d: 'If you delete the session from the store, requests are blocked starting with the very next one.', v: { mode: 'redis', servers: 2, exp: '25', kick: true } },
    { t: 'Short access token + refresh token', q: 'What if you use JWT (access token + refresh token) with a 15 min expiration and an administrator forces a logout at 25 min?', d: 'A new access token is issued every 15 minutes. Even if it comes late, a forced logout takes effect within 15 minutes.', v: { mode: 'refresh', servers: 2, exp: '15', kick: true } },
  ],
  code: function (c) {
    if (c.mode === 'local' || c.mode === 'redis') return (c.mode === 'redis' ? '// Adding the spring-session-data-redis dependency\n// stores the session in Redis instead of server memory\n\n' : '') + '// Only the needed parts are kept (login and later requests are handled in different methods)\n\n// On successful login\nHttpSession session = request.getSession();\nsession.setAttribute("memberId", member.getId());\n// Response header: Set-Cookie: JSESSIONID=abc123; HttpOnly\n\n// On every later request: find the session by the session ID in the cookie\nHttpSession session = request.getSession(false);\nif (session == null) {\n    throw new UnauthorizedException();   // an example exception -> 401\n}';
    return '// Only the needed parts are kept (login and later requests are handled in different methods)\n\n// On successful login: create a signed token and return it in the response\nString access = Jwts.builder()\n    .subject(memberId)\n    .expiration(Date.from(Instant.now().plus(Duration.ofMinutes(' + c.exp + '))))   // expires ' + c.exp + ' min from now\n    .signWith(key)\n    .compact();\n' + (c.mode === 'refresh' ? '// createRefreshToken is an example method (makes a 14-day token and also saves it in the server store)\nString refresh = createRefreshToken();\n' : '') +
      '\n// On every later request: check only the signature and the expiration (no store lookup)\nClaims claims = Jwts.parser()\n    .verifyWith(key).build()\n    .parseSignedClaims(token)          // throws if expired -> 401\n    .getPayload();' + (c.mode === 'refresh' ? '\n\n// On a 401, the client asks for a new token with the refresh token\n// The server checks in the store that the refresh token is valid' : '');
  },
  label: function (c) { return { local: 'In-memory session', redis: 'Redis session', jwt: 'JWT ' + c.exp + ' min', refresh: 'JWT ' + c.exp + ' min + refresh' }[c.mode] + ' · ' + c.servers + (c.servers === 1 ? ' server' : ' servers') + (c.kick ? ' · forced logout' : ''); },
  columns: ['Successful requests', '401 responses', 'Shared store accesses', 'Requests that passed after the forced logout'],
  simulate: function (c) {
    var S = c.servers, M = c.mode, exp = +c.exp, ev = [], rows = [], ok = 0, fail = 0, look = 0, leaked = 0, kicked = false, loggedOut = false;
    var local = [], redis = null, refreshStore = null, client = {}, accessExp = null;
    for (var i = 0; i < S; i++) local.push(null);
    function srvText(i) { return M === 'local' ? (local[i] ? 'Session abc123 → member 7' : 'No session') : M === 'redis' ? 'Remembers nothing (asks Redis)' : 'Remembers nothing (verification key only)'; }
    function snap(hot) { var sv = []; for (var i = 0; i < S; i++) sv.push(srvText(i)); return { sv: sv, hot: hot, shared: M === 'redis' ? (redis ? 'Session abc123 → member 7' : 'Empty') : M === 'refresh' ? (refreshStore ? 'Refresh token r-001 → member 7' : 'Empty') : null, client: M === 'local' || M === 'redis' ? (client.cookie ? 'Cookie JSESSIONID=abc123' : 'None') : (client.access ? 'Access token (expires at ' + accessExp + ' min)' + (M === 'refresh' ? ' + refresh token r-001' : '') : 'None'), rows: rows.slice(), ok: ok, fail: fail, look: look }; }
    function push(s, k, hot) { ev.push({ s: s, k: k, snap: snap(hot) }); }
    function row(t, srv, what, res, cls) { rows.push({ cells: [t + ' min', srv, what, { v: res, cls: cls }] }); }
    // 0 min: login (Server 1)
    if (M === 'local') { local[0] = 1; client.cookie = 1; row(0, 'Server 1', 'Username and password', 'Login succeeded, session created', 'good'); push('0 min: The user logged in on Server 1. Server 1 creates a session in its own memory and sends the session ID down in a cookie. Only Server 1 remembers this user.', '', 0); }
    if (M === 'redis') { redis = 1; client.cookie = 1; look++; row(0, 'Server 1', 'Username and password', 'Login succeeded, session created', 'good'); push('0 min: The user logged in on Server 1. The session is stored not in server memory but in Redis, which all the servers share, and the session ID is sent down in a cookie.', '', 0); }
    if (M === 'jwt' || M === 'refresh') { client.access = 1; accessExp = exp; if (M === 'refresh') { refreshStore = 1; look++; } row(0, 'Server 1', 'Username and password', 'Login succeeded, token issued', 'good'); push('0 min: The user logged in on Server 1. The server sends down an access token that contains the member number and the expiration time (' + exp + ' min) and is signed. The server leaves no session on its side.' + (M === 'refresh' ? ' It also issues a refresh token, and only this is recorded in the store.' : ''), '', 0); }
    [10, 20, 30, 40, 50].forEach(function (t, j) {
      var si = (j + 1) % S, name = 'Server ' + (si + 1);
      if (c.kick && !kicked && t > 25) {
        kicked = true;
        if (M === 'local') { for (var i = 0; i < S; i++) local[i] = null; push('25 min: The administrator forced the user to log out. The session in server memory is deleted.', '', -1); }
        if (M === 'redis') { redis = null; look++; push('25 min: The administrator forced the user to log out. The session is deleted from Redis.', '', -1); }
        if (M === 'jwt') push('25 min: The administrator tries to force the user to log out. But the server has nothing to delete. The token is on the user\'s side, and as long as its signature and expiration time are valid, the server trusts it.', 'bad', -1);
        if (M === 'refresh') { refreshStore = null; look++; push('25 min: The administrator forced the user to log out. The refresh token is deleted from the store. An access token that has already been issued cannot be taken back.', '', -1); }
      }
      if (loggedOut) { row(t, name, '(none)', 'Login screen', ''); return; }
      if (M === 'local') {
        if (local[si]) { ok++; row(t, name, 'Cookie abc123', '200 OK', 'good'); push(t + ' min: The request went to ' + name + '. This server has session abc123 in its memory, so it treats the user as logged in.', 'good', si); }
        else { fail++; row(t, name, 'Cookie abc123', '401 Login required', 'bad'); push(t + ' min: The request went to ' + name + '. It sent the session ID in the cookie, but ' + (kicked ? 'the session had been deleted' : 'this server has no such session in its memory') + ', so it treats the user as not logged in.', 'bad', si); }
      }
      if (M === 'redis') {
        look++;
        if (redis) { ok++; row(t, name, 'Cookie abc123', '200 OK', 'good'); push(t + ' min: The request went to ' + name + '. The server looked up session abc123 in Redis and confirmed the login state. Whichever server the request goes to, it sees the same store.', 'good', si); }
        else { fail++; row(t, name, 'Cookie abc123', '401 Login required', 'bad'); push(t + ' min: The request went to ' + name + '. There is no session in Redis, so the server rejects the request right away. The forced logout took effect immediately, from the next request.', 'bad', si); }
      }
      if (M === 'jwt' || M === 'refresh') {
        if (t < accessExp) { ok++; if (kicked) leaked++; row(t, name, 'Access token', '200 OK', kicked ? 'hot' : 'good'); push(t + ' min: The request went to ' + name + '. The server checks only the signature and the expiration time of the token. It does not query a store, and the request passes on any server.' + (kicked ? ' Although this user had been forced to log out, the token is still valid, so the request passed.' : ''), kicked ? 'bad' : 'good', si); }
        else if (M === 'jwt') { fail++; loggedOut = true; client.access = null; row(t, name, 'Access token (expired)', '401 Log in again', 'bad'); push(t + ' min: The request went to ' + name + '. The expiration time of the token (' + accessExp + ' min) has passed. The user gets a 401 and has to log in again.', 'bad', si); }
        else {
          fail++; row(t, name, 'Access token (expired)', '401 Token expired', 'bad'); push(t + ' min: The request went to ' + name + '. The expiration time of the access token (' + accessExp + ' min) has passed, so it got a 401. The client asks for a new token with the refresh token.', '', si);
          look++;
          if (refreshStore) { accessExp = t + exp; ok++; row(t, name, 'Refresh token', 'New token → retry succeeded', 'good'); push(t + ' min: The server checks in the store that refresh token r-001 is valid and issues a new access token (expires at ' + accessExp + ' min). The original request is sent again and succeeds. The user does not notice that the login was interrupted.', 'good', si); }
          else { loggedOut = true; client.access = null; row(t, name, 'Refresh token', '401 Log in again', 'bad'); push(t + ' min: The server checked the store, but the refresh token has been deleted. It refuses to issue a new token. The forced logout takes effect only here.', 'bad', si); }
        }
      }
    });
    var sum = [];
    if (M === 'local' && S > 1 && !c.kick) sum.push('The session exists only in the memory of the one server where the user logged in, so requests that went to other servers lost the login. To add more servers, you must either always send the same user to the same server (sticky sessions) or move the session to a shared store.');
    if (M === 'local' && S === 1) sum.push('With one server there is no problem.');
    if (M === 'redis') sum.push('If the session is kept in a shared store, the login stays valid no matter how many servers there are, and you can log a user out immediately just by deleting the session. In exchange, every request queries the store, and if the store cannot be reached, sessions cannot be checked, so everyone is treated as not logged in.');
    if (M === 'jwt') sum.push('With a JWT the server stores nothing, so it is easy to add servers and there is no lookup cost.' + (c.kick ? ' In exchange, a token that has been issued cannot be invalidated before it expires. Requests that passed even after the forced logout: ' + leaked + '. You can block tokens by keeping a list of blocked tokens on the server, but then every request queries a store again.' : ' After the expiration time passes, the user has to log in again.'));
    if (M === 'refresh') sum.push('If you keep the access token short and reissue it with the refresh token, ordinary requests are handled without a lookup, while the damage from a leaked access token or a forced logout is limited to the expiration time of the access token.');
    if (!sum.length) sum.push('Out of 5 requests, handled as logged in: ' + ok + ', 401 responses: ' + fail + ', shared store accesses: ' + look + '.');
    return { events: ev, summary: sum, row: [ok + '', fail + '', look + '', c.kick ? leaked + '' : 'N/A'] };
  },
  render: function (v, sim, t, H, shown) {
    var c = sim.c, last = shown[shown.length - 1], s = last ? last.snap : null;
    if (!s) { H.text(v, 'Click Run to start with the login at 0 min.'); return; }
    H.counters(v, [[s.ok, 'Successful requests'], [s.fail, '401 responses'], [s.look, 'Shared store accesses']]);
    H.table(v, ['Time', 'Server that received it', 'What the user sent', 'Result'], s.rows, 'Request log');
  },
  // Diagram: the request from the browser goes through the load balancer to one of the servers. The boxes below show where the login state is kept.
  draw: function (P, sim, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : { sv: [], hot: -1, shared: null, client: 'None', rows: [] }, n = Math.max(1, s.sv.length || 1), actors = [['b', 'Browser', 'wait']], msgs = [];
    for (var i = 0; i < n; i++) actors.push(['s' + (i + 1), 'Server ' + (i + 1)]);
    s.rows.forEach(function (r) { var tm = P.v(r.cells[0]), sv = 's' + P.v(r.cells[1]).replace('Server ', ''), res = P.v(r.cells[3]); msgs.push({ f: 'b', t: sv, s: tm + ' ' + P.v(r.cells[2]) }); msgs.push({ f: sv, t: 'b', s: res, cls: P.c(r.cells[3]) }); });
    var end = P.seq(actors, msgs, { keep: 8 }), w = (648 - (n - 1) * 8) / n, y = end + 14;
    P.box('cl', 16, y, 648, 46, { cls: s.client === 'None' ? 'ghost' : 'wait', title: 'What the browser holds', sub: s.client });
    s.sv.forEach(function (t, i) { var p = t.split(' ('); P.box('mem' + i, 16 + i * (w + 8), y + 54, w, 62, { cls: (/no session|nothing/i.test(t) || t === '-' ? 'ghost' : 'good') + (i === s.hot ? ' now' : ''), title: 'Server ' + (i + 1) + ' memory', sub: [p[0], p[1] ? '(' + p[1] : ' '] }); });
    if (s.shared !== null) P.box('sh', 16, y + 124, 648, 46, { cls: s.shared === 'Empty' ? 'ghost' : 'good', title: 'Store shared by the servers (Redis)', sub: s.shared });
    P.size(680, y + 124 + (s.shared !== null ? 46 + 16 : 8));
    P.note('The top shows the order of requests and responses, and the bottom shows where the login state is kept. The thick outline marks the server that just received a request.');
  },
  assume: 'It assumes that the load balancer sends requests to the servers in turn (the login goes to Server 1, the next request to Server 2, and so on). The session expiration time and the refresh token expiration (usually days to weeks) are assumed not to be reached within these 50 minutes. Verifying a JWT signature uses only the key the server holds, with no store. Keeping the refresh token in a server store and checking it there is a widely used setup, but no standard requires it.',
});

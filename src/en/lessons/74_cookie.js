Lab.register({
  id: 'cookie', nav: 'Cookies', cat: 'Authentication', mode: 'step',
  title: 'Showing a name tag, every time, to a server that cannot remember you',
  intro: 'HTTP does not link one request to the next. The server cannot tell whether an earlier request came from the same browser. So when a login succeeds, the server sends a small value (a cookie) in the response, and the browser stores it and attaches it automatically to every request that goes to the same site.',
  terms: ['Cookie', 'HTTP as a stateless protocol', 'HttpOnly, Secure, and SameSite', 'Session'], ranks: ['auth', 'http'],
  controls: [
    { id: 'give', label: 'The login response sets a cookie', type: 'check', value: true },
    { id: 'path', label: 'Path (the path the cookie is sent to)', type: 'select', value: '/', options: [['/', 'Path=/ (the whole site)'], ['/shop', 'Path=/shop (only under /shop)']], show: function (c) { return c.give; } },
    { id: 'http', label: 'HttpOnly (so that JavaScript cannot read it)', type: 'check', value: true, show: function (c) { return c.give; } },
    { id: 'life', label: 'Lifetime', type: 'select', value: 'session', options: [['session', 'Not specified (until the browser is closed)'], ['hour', 'Max-Age=3600 (1 hour)'], ['short', 'Max-Age=3 (3s)']], show: function (c) { return c.give; } },
    { id: 'later', label: 'When the next request is sent', type: 'select', value: 'now', options: [['now', 'Right after login'], ['wait', '10s later'], ['restart', '10s later, after closing the browser and opening it again']], show: function (c) { return c.give; } },
  ],
  presets: [
    { t: 'Default settings', q: 'What does the server receive from a request sent right after login, when the login response sets a cookie with Path=/ and HttpOnly on?', d: 'The cookie is attached automatically to every request to the same site.', v: { give: true, path: '/', http: true, life: 'session', later: 'now' } },
    { t: 'Without a cookie', q: 'What if the login response does not set a cookie?', d: 'Even for a request right after the login, the server does not know who sent it.', v: { give: false } },
    { t: 'Narrow the path to /shop', q: 'What if you change the path to Path=/shop (only under /shop)?', d: 'The cookie is not attached to a request for /orders.', v: { give: true, path: '/shop', http: true, life: 'session', later: 'now' } },
    { t: 'Turn off HttpOnly', q: 'What if you turn off HttpOnly (so that JavaScript cannot read it)?', d: 'JavaScript on the page can read the value of the cookie.', v: { give: true, path: '/', http: false, life: 'session', later: 'now' } },
    { t: 'Lifetime of 3s, request after 10s', q: 'What if you set the lifetime to Max-Age=3 (3s) and send the next request 10s later?', d: 'The browser deletes an expired cookie.', v: { give: true, path: '/', http: true, life: 'short', later: 'wait' } },
    { t: 'Close the browser and open it again', q: 'What if the next request is sent 10s later, after closing the browser and opening it again?', d: 'A cookie with no lifetime specified disappears. Change it to 1 hour and compare.', v: { give: true, path: '/', http: true, life: 'session', later: 'restart' } },
  ],
  // A pure calculation used to check against real browser results: is the cookie sent in each situation?
  sent: function (c) {
    var alive = !!c.give && !(c.life === 'short' && c.later !== 'now') && !(c.life === 'session' && c.later === 'restart');
    return { alive: alive, orders: alive && c.path === '/', shop: alive, other: false, js: alive && !c.http };
  },
  header: function (c) { return 'Set-Cookie: sid=abc123; Path=' + c.path + (c.life === 'hour' ? '; Max-Age=3600' : c.life === 'short' ? '; Max-Age=3' : '') + (c.http ? '; HttpOnly' : ''); },
  code: function (c) {
    if (!c.give) return '@PostMapping("/login")\nResponseEntity<Void> login(@RequestBody LoginRequest req) {\n    memberService.check(req.id(), req.password());\n    return ResponseEntity.ok().build();      // does not send a cookie\n}\n\n// The next request carries nothing that shows the user logged in';
    return '@PostMapping("/login")\nResponseEntity<Void> login(@RequestBody LoginRequest req) {\n    Member m = memberService.check(req.id(), req.password());\n    String sid = sessionStore.create(m.getId());        // "abc123" → member 7\n\n    ResponseCookie cookie = ResponseCookie.from("sid", sid)\n        .path("' + c.path + '")\n' + (c.life === 'hour' ? '        .maxAge(Duration.ofHours(1))\n' : c.life === 'short' ? '        .maxAge(Duration.ofSeconds(3))\n' : '') + '        .httpOnly(' + c.http + ')\n        .build();\n    return ResponseEntity.ok()\n        .header(HttpHeaders.SET_COOKIE, cookie.toString())\n        .build();\n}\n// Response header: ' + this.header(c);
  },
  label: function (c) { return !c.give ? 'No cookie' : 'Path=' + c.path + (c.http ? ' · HttpOnly' : '') + ' · ' + { session: 'no lifetime specified', hour: '1 hour', short: '3s' }[c.life] + ' · ' + { now: 'right after', wait: '10s later', restart: 'browser reopened' }[c.later]; },
  columns: ['GET /orders', 'GET /shop/cart', 'Request to another site', 'Read by JavaScript'],
  simulate: function (c) {
    var R = this.sent(c), ev = [], sum = [], S = { jar: [], rows: [] }, self = this;
    function push(s, k) { ev.push({ s: s, k: k, snap: JSON.parse(JSON.stringify(S)) }); }
    S.rows.push(['POST /login', '(none)', 'Checks the ID and the password']);
    push('This is the login request. It is the first request, so the browser has no cookie for this site. The server checks the ID and the password in the body.', '');
    if (!c.give) {
      push('The server responds with 200 but sends no cookie. Nothing is left in the browser.', '');
      S.rows.push(['GET /orders', '(none)', 'Does not know who it is → 401']);
      push('Right after, the browser requests the order list. The server has no way of knowing that this is the browser that just logged in. HTTP requests are independent of each other, and the server does not remember the earlier request (HTTP is stateless).', 'bad');
      sum.push('Without a cookie, the ID and the password would have to be sent again with every request. A cookie is the means by which the browser tells the server, with each request, that it is "the browser that was verified earlier".');
      sum.push('HTTP does not remember state between requests. Information that has to carry on, such as the login state, has to be carried by the browser and presented every time.');
      return { events: ev, summary: sum, row: ['No cookie → 401', 'No cookie → 401', 'Not attached', 'Nothing to read'] };
    }
    var jarText = 'sid=abc123  (Path=' + c.path + (c.http ? ', HttpOnly' : '') + ', ' + { session: 'deleted when the browser is closed', hour: 'expires after 1 hour', short: 'expires after 3s' }[c.life] + ')';
    S.jar = [jarText];
    push('The server sends ' + self.header(c) + ' in the response header. The browser stores this value as a cookie of shop.example. The server writes down on its own side that "abc123 is member 7".', '');
    if (c.later !== 'now') {
      if (!R.alive) S.jar = [];
      push((c.later === 'wait' ? '10s have passed. ' : 'After 10s, the browser was closed completely and opened again. ') + (R.alive ? 'The cookie is still there.' : c.life === 'short' ? 'The browser deleted the cookie, whose lifetime (3s) had passed.' : 'A cookie with no lifetime specified (a session cookie) is deleted when the browser is closed.'), R.alive ? '' : 'bad');
    }
    var say = function (ok) { return ok ? 'Handled as a request from member 7' : 'Does not know who it is → 401'; };
    S.rows.push(['GET /orders', R.orders ? 'Cookie: sid=abc123' : '(none)', say(R.orders)]);
    push('This is the request for shop.example/orders. ' + (R.orders ? 'The browser attached sid to the Cookie header automatically. It is attached even though the code does not add it anywhere. The server looks up abc123 and knows that the request is from member 7.' : !R.alive ? 'No cookie is stored, so nothing is attached. The user has to log in again.' : 'The Path of the cookie is /shop, so it is not attached to a request for /orders. The cookie is still there, but this path is not one it applies to.'), R.orders ? 'good' : 'bad');
    S.rows.push(['GET /shop/cart', R.shop ? 'Cookie: sid=abc123' : '(none)', say(R.shop)]);
    push('This is the request for shop.example/shop/cart. ' + (R.shop ? 'This path falls under Path=' + c.path + ', so the cookie is attached.' : 'No cookie is stored.'), R.shop ? 'good' : 'bad');
    S.rows.push(['GET other.example/ (another site)', '(none)', 'The cookie of shop.example is not sent']);
    push('This is a request going to another site, other.example. The cookie that shop.example gave is not attached. A cookie is attached only to requests going to the host that sent it, shop.example (the Domain attribute can widen this).', '');
    S.rows.push(['JavaScript on the page: document.cookie', R.js ? '"sid=abc123" is read' : '(not readable)', R.js ? 'The script can take the value' : R.alive ? 'Not visible to scripts because of HttpOnly' : 'No cookie']);
    push('JavaScript on the shop.example/shop/cart page reads document.cookie. ' + (R.js ? 'There is no HttpOnly, so the value is read as it is. If a malicious script gets into the page (XSS), it can steal this value and take over the login state.' : R.alive ? 'A cookie with HttpOnly is not visible to scripts. It is still attached to requests automatically.' : 'No cookie is stored.'), R.js ? 'bad' : R.alive ? 'good' : '');
    if (R.alive && c.path !== '/') sum.push('Narrowing the Path means the cookie is not attached to requests outside that path. A login cookie is usually left at Path=/.');
    if (R.js) sum.push('Put HttpOnly on the cookie used for login so that scripts cannot read it. In a real service, you also specify Secure, which sends the cookie only over https, and SameSite, which decides whether the cookie is attached to requests started from another site.');
    if (c.life === 'session' && c.later !== 'restart') sum.push('A cookie with no lifetime specified is deleted when the browser is closed. "Stay logged in" is a cookie whose lifetime is specified with Max-Age or Expires.');
    sum.push('A cookie is stored in the user\'s browser, so the user can see and change its contents. That is why you do not put a value such as the member number directly into a cookie, but an identifier that cannot be guessed (a session ID) or a signed token. This continues in the "Sessions and JWT" lab.');
    return { events: ev, summary: sum, row: [R.orders ? 'Cookie attached' : 'Not attached → 401', R.shop ? 'Cookie attached' : 'Not attached → 401', 'Not attached', R.js ? 'Readable (dangerous)' : R.alive ? 'Not readable' : 'No cookie'] };
  },
  render: function (v, sim, t, H, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : { jar: [], rows: [] };
    if (s.rows.length) H.table(v, ['Request or action', 'Cookie header the browser attached', 'What the server (or the script) knows'], s.rows.map(function (r, i) { var on = i === s.rows.length - 1; return { cells: [{ v: r[0], cls: on ? 'hot' : '' }, { v: r[1], cls: r[1].indexOf('sid=') >= 0 ? (r[0].indexOf('document') >= 0 ? 'bad' : 'good') : '' }, r[2]] }; }), 'Whether the cookie is attached to each request');
  },
  // Diagram: whether the browser attaches the cookie to each request. Look at the same site, a different path, another site, and the case where a script reads it, one after another.
  draw: function (P, sim, shown) {
    var c = sim.c, last = shown[shown.length - 1], s = last ? last.snap : { jar: [], rows: [] }, msgs = [];
    s.rows.forEach(function (r, i) {
      var req = r[0], ck = r[1], has = ck.indexOf('sid=') >= 0;
      if (req.indexOf('document.cookie') >= 0) { msgs.push({ f: 'b', s: 'document.cookie: ' + (has ? 'the value is read' : 'not readable'), cls: has ? 'bad' : 'good' }); return; }
      if (req.indexOf('other.example') >= 0) { msgs.push({ f: 'b', t: 'o', s: 'GET / · no cookie attached', cls: 'mut' }); return; }
      msgs.push({ f: 'b', t: 's', s: req + ' · ' + (has ? ck : 'no cookie'), cls: i === 0 ? '' : has ? 'good' : 'bad' });
      if (i === 0 && c.give && shown.length >= 2) msgs.push({ f: 's', t: 'b', s: this.header(c), cls: 'hot' });
    }, this);
    var end = P.seq([['b', 'Browser', 'wait'], ['s', 'shop.example server', 'wait'], ['o', 'other.example']], msgs, { keep: 7 });
    P.box('jar', 16, end + 14, 648, 46, { cls: s.jar.length ? 'good' : 'ghost', title: 'Cookies of shop.example that the browser is storing', sub: s.jar[0] || 'None' });
    P.size(680, end + 76);
    P.note('Green arrows are requests that went with the cookie attached, and red arrows are requests that went without a cookie, so the server does not know who sent them. On the document.cookie line at the bottom, green means it was not readable (safe) and red means it was readable (dangerous).');
  },
  assume: 'The paths that a cookie is attached to according to Path, the fact that an HttpOnly cookie is not visible in document.cookie, the disappearance of a cookie after its Max-Age has passed, and the fact that a cookie is not sent to an address on a different host are the same as the results checked with a real browser and a test server. That a session cookie is deleted when the browser is closed follows the standard behavior, and it was not checked by running it. A browser with the "restore previous tabs" feature turned on may bring session cookies back. The Secure, SameSite, and Domain attributes are not covered in this lab.',
});

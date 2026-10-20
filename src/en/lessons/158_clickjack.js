Lab.register({
  id: 'clickjack', nav: 'Clickjacking and open redirects', cat: 'Authentication', mode: 'step',
  title: 'How do you stop your page from being hidden inside another site\'s page, or your URL from sending users to another site?',
  why: 'Without a mark that forbids it, a browser draws any page inside another site\'s iframe, and a script put in the page to break out of a frame did not work when the side showing the page blocked scripts with the sandbox attribute of the iframe. X-Frame-Options and the frame-ancestors of CSP state, in a response header, which sites may show this page in a frame, so that the browser does not draw it for any other site.',
  use: 'Spring Security adds X-Frame-Options: DENY to responses even if you configure nothing, and if some screen uses frames within the same site, such as the H2 console, you change it to sameOrigin. When you have to let a partner site show a payment or map screen in a frame, you write that origin in frame-ancestors. Code that takes the address to return to after login from the request checks that it is a path of the same site, or accepts only names decided in advance.',
  intro: 'Clickjacking is when another site puts a page of your site in an invisible frame, so that the user clicks a button on your page without knowing it. An open redirect is when your server takes the "URL to return to after login" from the request and redirects to it without checking, so a link that starts with your site\'s address ends up on another site. In both cases the server is not broken into. Instead, people\'s trust in your site is exploited, and clickjacking is blocked by the browser according to the response header the server sends, and an open redirect is blocked by the server checking the URL.',
  terms: ['Clickjacking', 'X-Frame-Options and frame-ancestors', 'Open redirect', 'Spring Security and SecurityFilterChain', 'CORS and the same-origin policy'],
  controls: [
    { id: 'topic', label: 'Problem to look at', type: 'select', value: 'frame', options: [['frame', 'Clickjacking (putting my page in a frame)'], ['redir', 'Open redirect (the URL to return to after login)']] },
    { id: 'hdr', label: 'Header settings on my server (shop.example)', type: 'select', value: 'off', options: [['off', 'frameOptions disabled (no header)'], ['default', 'Spring Security default, unchanged'], ['same', 'frameOptions set to sameOrigin'], ['csp', 'CSP frame-ancestors allowing only my site and a partner site'], ['both', 'Default kept, plus CSP frame-ancestors added']], show: function (c) { return c.topic === 'frame'; } },
    { id: 'who', label: 'Page that puts my payment page in a frame', type: 'select', value: 'attacker', options: [['attacker', 'Attacker site (attacker.example)'], ['self', 'Another page on my own site (shop.example)'], ['partner', 'The agreed partner site (partner.example)']], show: function (c) { return c.topic === 'frame'; } },
    { id: 'check', label: 'How the server checks the next value', type: 'select', value: 'none', options: [['none', 'No check'], ['slash', 'Only check that it starts with "/"'], ['path', 'Allow only paths on the same site']], show: function (c) { return c.topic === 'redir'; } },
    { id: 'next', label: 'Value in the next parameter of the link', type: 'select', value: 'abs', options: [['path', '/orders (a normal path)'], ['abs', 'https://attacker.example/login'], ['dslash', '//attacker.example/login']], show: function (c) { return c.topic === 'redir'; } },
  ],
  presets: [
    { t: 'Default settings', q: 'What happens when a page on attacker.example puts the payment page of a server with frameOptions disabled (no header) in a frame?', d: 'A server with the frame header turned off. An attacker can put my payment page in a hidden frame.', v: { topic: 'frame', hdr: 'off', who: 'attacker', check: 'none', next: 'abs' } },
    { t: 'Spring Security default', q: 'What if you leave the header settings at the Spring Security default, unchanged?', d: 'Even with no configuration, X-Frame-Options: DENY is added, so the page is not rendered in a frame.', v: { topic: 'frame', hdr: 'default', who: 'attacker', check: 'none', next: 'abs' } },
    { t: 'Frame on my own page under the default', q: 'What if, under the Spring Security default, another page on your own site (shop.example) puts the payment page in a frame?', d: 'DENY blocks frames from the same site too.', v: { topic: 'frame', hdr: 'default', who: 'self', check: 'none', next: 'abs' } },
    { t: 'Allow only the partner site', q: 'What if CSP frame-ancestors allows only your site and a partner site, and a page on partner.example puts the payment page in a frame?', d: 'The page is rendered only in frames from the origins listed in frame-ancestors.', v: { topic: 'frame', hdr: 'csp', who: 'partner', check: 'none', next: 'abs' } },
    { t: 'If the return URL is not checked', q: 'What if the server does not check the next value in an open redirect, and the value is https://attacker.example/login?', d: 'A link that starts with my site\'s address ends up on the attacker\'s site.', v: { topic: 'redir', hdr: 'off', who: 'attacker', check: 'none', next: 'abs' } },
    { t: 'If only "/" is checked', q: 'What if the server only checks that the next value starts with "/", and the value is //attacker.example/login?', d: 'An address that starts with // passes the check.', v: { topic: 'redir', hdr: 'off', who: 'attacker', check: 'slash', next: 'dslash' } },
    { t: 'Allow only same-site paths', q: 'What if the server allows only paths on the same site, and the next value is //attacker.example/login?', d: 'A value that points to another site is replaced with the home page.', v: { topic: 'redir', hdr: 'off', who: 'attacker', check: 'path', next: 'dslash' } },
  ],
  CSP: "frame-ancestors 'self' https://partner.example",
  NEXT: { path: '/orders', abs: 'https://attacker.example/login', dslash: '//attacker.example/login' },
  PAGE: { attacker: 'https://attacker.example', self: 'https://shop.example/cart', partner: 'https://partner.example' },
  ORIGIN: { attacker: 'https://attacker.example', self: 'https://shop.example', partner: 'https://partner.example' },
  // Frame-related headers added to the response, depending on the header settings
  headers: function (hdr) {
    var csp = 'Content-Security-Policy: ' + this.CSP;
    return { off: [], default: ['X-Frame-Options: DENY'], same: ['X-Frame-Options: SAMEORIGIN'], csp: [csp], both: ['X-Frame-Options: DENY', csp] }[hdr];
  },
  // Does the browser render that page inside the frame?
  framed: function (hdr, who) {
    if (hdr === 'off') return true;
    if (hdr === 'default') return false;
    if (hdr === 'same') return who === 'self';
    return who !== 'attacker';            // csp, both: the frame-ancestors list decides (an X-Frame-Options sent with it is ignored)
  },
  // The result of the server checking next, and the Location of the response
  redirect: function (check, next) {
    var v = this.NEXT[next], second = v.charAt(1);
    var ok = check === 'none' ? true : check === 'slash' ? v.charAt(0) === '/' : v.charAt(0) === '/' && second !== '/' && second !== '\\';
    var target = ok ? v : '/';
    // Spring Boot's embedded Tomcat sends Location as an absolute URL
    var loc = /^https?:/.test(target) ? target : target.slice(0, 2) === '//' ? 'https:' + target : 'https://shop.example' + target;
    return { v: v, ok: ok, target: target, loc: loc, away: loc.indexOf('https://shop.example/') !== 0 };
  },
  code: function (c) {
    if (c.topic === 'frame') {
      var line = { off: '    http.headers(h -> h.frameOptions(f -> f.disable()));', default: '    // No headers configuration (the Spring Security default)', same: '    http.headers(h -> h.frameOptions(f -> f.sameOrigin()));', csp: '    http.headers(h -> h\n        .frameOptions(f -> f.disable())\n        .contentSecurityPolicy(c -> c.policyDirectives(\n            "' + this.CSP + '")));', both: '    http.headers(h -> h\n        .contentSecurityPolicy(c -> c.policyDirectives(\n            "' + this.CSP + '")));' }[c.hdr];
      var hs = this.headers(c.hdr);
      return '// Spring Security configuration of the shop.example server\n@Bean\nSecurityFilterChain filterChain(HttpSecurity http) throws Exception {\n    // (settings about who may access what are omitted)\n' + line + '\n    return http.build();\n}\n\n// Frame-related headers on the /pay response with this configuration\n' + (hs.length ? hs.map(function (h) { return '//   ' + h; }).join('\n') : '//   (none)') + '\n\n<!-- Framing side: a page on ' + this.PAGE[c.who] + ' -->\n<iframe src="https://shop.example/pay"></iframe>';
    }
    var body = c.check === 'none' ? '    return "redirect:" + next;                 // uses the received value as it is, without checking' : c.check === 'slash' ? '    if (!next.startsWith("/")) next = "/";     // only checks that it starts with "/"\n    return "redirect:" + next;' : '    // accept only paths on the same site\n    boolean ok = next.startsWith("/")\n              && !next.startsWith("//")\n              && !next.startsWith("/\\\\");\n    if (!ok) next = "/";\n    return "redirect:" + next;';
    body = body.split('\n').map(function (l) { return '    ' + l; }).join('\n');
    return '// Link: https://shop.example/login?next=' + this.NEXT[c.next] + '\n\n@Controller   // not @RestController: the returned "redirect:..." is read as a redirect instruction, not as the body\nclass LoginDoneController {   // a class made up for this example\n    // Runs after a successful login.\n    // next is the value from the original link, passed along unchanged.\n    @GetMapping("/login/done")\n    public String done(@RequestParam String next) {\n' + body + '\n    }\n}';
  },
  label: function (c) {
    if (c.topic === 'frame') return 'Clickjacking · ' + { off: 'no header', default: 'default (DENY)', same: 'SAMEORIGIN', csp: 'frame-ancestors', both: 'DENY + frame-ancestors' }[c.hdr] + ' · ' + { attacker: 'attacker site', self: 'same site', partner: 'partner site' }[c.who];
    return 'Redirect · ' + { none: 'no check', slash: 'only "/" prefix checked', path: 'paths only' }[c.check] + ' · next=' + this.NEXT[c.next];
  },
  columns: ['Response headers from the server', 'What the browser does', 'Result'],
  simulate: function (c) { return c.topic === 'frame' ? this.simFrame(c) : this.simRedir(c); },
  simFrame: function (c) {
    var hs = this.headers(c.hdr), on = this.framed(c.hdr, c.who), who = c.who, page = this.PAGE[who], origin = this.ORIGIN[who], ev = [], sum = [], rows = [];
    var st = { phase: 0, hs: null, on: null };
    function push(s, k) { ev.push({ s: s, k: k, snap: { phase: st.phase, hs: st.hs, on: st.on, rows: rows.slice() } }); }
    function row(a, b, r, cls) { rows.push({ cells: [a, b, { v: r, cls: cls }] }); }
    var hsText = hs.length ? hs.join(' and ') : 'No frame-related headers';
    st.phase = 1; row('Browser', 'Opens ' + page, 'The page contains a frame', '');
    if (who === 'attacker') push('The user opens the page at ' + page + '. Only a "Claim prize" button is visible. But this page overlays the shop.example payment page on that button as a frame (iframe) and makes it transparent so that it cannot be seen.', '');
    else if (who === 'self') push('The user opens ' + page + '. It is the cart page of shop.example, and it is built to include the payment page (/pay) of the same site as a frame (iframe) so that both appear on one screen. This is not an attack. It is a feature of my own site.', '');
    else push('The user opens the page at ' + page + '. It is a partner site that has an agreement with shop.example, and it puts the shop.example payment page in a frame (iframe) and shows it openly.', '');
    st.phase = 2; row('Browser', 'GET https://shop.example/pay', 'Requests the page to put in the frame', '');
    push('The browser requests https://shop.example/pay to get the page to put in the frame. The page inside a frame is fetched from the server in the same way as when you type an address in the address bar.', '');
    st.phase = 3; st.hs = hs; row('shop.example', 'Responds with the payment page', hsText, 'hot');
    push({ off: 'shop.example responds with the payment page. Because frameOptions is turned off in the settings, the response has no frame-related headers at all.',
      default: 'shop.example responds with the payment page. No headers were configured, but Spring Security adds X-Frame-Options: DENY to the response by default.',
      same: 'shop.example responds with the payment page. Because frameOptions is set to sameOrigin, the response has X-Frame-Options: SAMEORIGIN.',
      csp: 'shop.example responds with the payment page. X-Frame-Options is turned off, and a Content-Security-Policy: ' + this.CSP + ' header is added instead.',
      both: 'shop.example responds with the payment page. The default X-Frame-Options: DENY is kept, and a Content-Security-Policy: ' + this.CSP + ' header is added. The response carries both headers.' }[c.hdr], '');
    st.phase = 4; st.on = on; row('Browser', 'Decides whether to render in the frame', on ? 'Renders' : 'Does not render', who === 'attacker' ? (on ? 'bad' : 'good') : (on ? 'good' : 'bad'));
    var same = origin === 'https://shop.example', why;
    if (c.hdr === 'off') why = 'The browser checks the response headers: nothing says the page must not be put in a frame. A page like this can be framed by any site, so the browser renders the payment page inside the frame.';
    else if (c.hdr === 'default') why = 'The browser checks the response headers: X-Frame-Options: DENY means "do not let any page put this in a frame". ' + (same ? 'There is no exception even for a page on the same site. ' : '') + 'The browser does not render the payment page and leaves the frame empty.';
    else if (c.hdr === 'same') why = 'The browser checks the response headers: X-Frame-Options: SAMEORIGIN means "only a page with the same origin may put this in a frame". The origin of the framing page is ' + origin + ' and the origin of the payment page is https://shop.example. ' + (on ? 'The two origins are the same, so the browser renders the page inside the frame.' : 'The two origins are different, so the browser does not render the page and leaves the frame empty.');
    else why = 'The browser checks the response headers: ' + (c.hdr === 'both' ? 'When X-Frame-Options and frame-ancestors are both present, the browser follows frame-ancestors and ignores X-Frame-Options. ' : '') + 'frame-ancestors is the list of origins that may put this page in a frame. \'self\' means the same origin as the payment page (https://shop.example), followed by https://partner.example. The origin of the framing page, ' + origin + (on ? ', is in the list, so the browser renders the page inside the frame.' : ', is not in the list, so the browser does not render the page and leaves the frame empty.');
    push(why, who === 'attacker' ? (on ? 'bad' : 'good') : (on ? 'good' : 'bad'));
    st.phase = 5;
    var res;
    if (who === 'attacker' && on) { res = 'Clickjacking possible'; row('User', 'Clicks "Claim prize"', 'Actually clicks [Pay]', 'bad'); push('The user clicks "Claim prize". What is visible is a button on the attacker\'s page, but a transparent payment page is overlaid on it. What was actually clicked is the [Pay] button of shop.example. If the user was logged in to shop.example, they have approved a payment without knowing it.', 'bad'); }
    else if (who === 'attacker') { res = 'Clickjacking blocked'; row('User', 'Clicks "Claim prize"', 'The frame is empty, so nothing happens', 'good'); push('The user clicks "Claim prize". The frame overlaid on it is empty, so the shop.example button is not clicked. Clickjacking does not succeed.', 'good'); }
    else if (on) { res = who === 'self' ? 'Frame on my own page is visible' : 'Frame on the partner site is visible'; row('User', 'Views the page', 'The payment page is visible in the frame', 'good'); push('The payment page is visible inside ' + (who === 'self' ? 'the cart page' : 'the partner site\'s page') + '. It works as intended.', 'good'); }
    else { res = who === 'self' ? 'Frame on my own page blocked too' : 'Frame on the partner site blocked too'; row('User', 'Views the page', 'The frame area is empty', 'bad'); push('The frame area looks empty on ' + (who === 'self' ? 'the cart page' : 'the partner site\'s page') + '. The header added to stop the attack blocked ' + (who === 'self' ? 'a feature of my own site' : 'the site it was meant to allow') + ' as well.', 'bad'); }
    if (c.hdr === 'off') sum.push('Without a header that says not to frame the page, the browser renders it in a frame on any site. If you turn off frameOptions altogether to show one screen that uses frames (for example, the H2 console), every page ends up in this state. Changing it to sameOrigin instead of turning it off is safer.');
    if (c.hdr === 'default') sum.push('Spring Security adds X-Frame-Options: DENY even if you configure nothing. It is the safest value, but it also blocks frames from the same site, so if you use frames inside your own site, change it to sameOrigin.');
    if (c.hdr === 'same') sum.push('SAMEORIGIN allows frames only from pages with the same origin (scheme, host, and port). With X-Frame-Options you cannot write "allow just one more site". To allow selected other sites, use frame-ancestors in Content-Security-Policy.');
    if (c.hdr === 'csp') sum.push('frame-ancestors lists the origins that may frame the page. \'none\' has the same effect as DENY, and listing only \'self\' has the same effect as SAMEORIGIN. Adding more origins after it allows only those specific sites.');
    if (c.hdr === 'both') sum.push('When both headers are present, frame-ancestors takes precedence. ' + (who === 'attacker' ? 'It means that frames from origins in the list are rendered even though DENY is present.' : 'That is why the frame was rendered even though DENY is present.') + ' However, older browsers that do not know frame-ancestors follow DENY, so it is less confusing to make the two headers mean the same thing or to use only one of them.');
    if (who === 'attacker' && on) sum.push('From the requests the server receives, clickjacking cannot be told apart from a normal click. So the server blocks it by announcing in advance, with a response header, that "this page must not be put in a frame", and the browser obeys.');
    return { events: ev, summary: sum, row: [hsText, on ? 'Rendered inside the frame' : 'Not rendered inside the frame', res], on: on, hs: hs };
  },
  simRedir: function (c) {
    var r = this.redirect(c.check, c.next), v = r.v, ev = [], sum = [], rows = [], atk = c.next !== 'path';
    var st = { phase: 0, checked: '', loc: '', at: '' };
    function push(s, k) { ev.push({ s: s, k: k, snap: { phase: st.phase, checked: st.checked, loc: st.loc, at: st.at, rows: rows.slice() } }); }
    function row(a, b, x, cls) { rows.push({ cells: [a, b, { v: x, cls: cls }] }); }
    var link = 'https://shop.example/login?next=' + v;
    st.phase = 1; row(atk ? 'Attacker' : 'User', atk ? 'Sends a link' : 'Opens the login page', link, '');
    if (atk) push('The attacker sends the user a link. The URL is ' + link + '. Because it begins with shop.example, it looks trustworthy. But in next, which says where to go after login, the attacker has put the address of another site.', '');
    else push('The user tried to view the order history without being logged in and was sent to the login page. The URL is ' + link + '. next holds the place to return to once the login is done.', '');
    st.phase = 2; row('User', 'Logs in on shop.example', 'Success. The server receives next=' + v, '');
    push('The user enters an ID and password on the real shop.example login page. The login finishes normally, and the server takes out the next value carried by the request. This value was not chosen by the server. It was chosen by whoever built the request.', '');
    st.phase = 3;
    var bad = r.away, good = atk && !r.away;
    if (c.check === 'none') { st.checked = 'Not checked'; row('shop.example', 'Check next', 'Not checked', bad ? 'bad' : ''); push('return "redirect:" + next: the server does not check next and uses it as it is. Whatever address it contains, the user will be sent there.', bad ? 'bad' : ''); }
    else if (c.check === 'slash') {
      st.checked = r.ok ? 'Passed' : 'Rejected, replaced with "/"'; row('shop.example', 'Check next: does it start with "/"?', st.checked, bad ? 'bad' : good ? 'good' : '');
      push('next.startsWith("/"): ' + (!r.ok ? 'This value does not start with "/". The server does not accept it and replaces it with the home page ("/").' : c.next === 'dslash' ? 'This value starts with "/", so it passes. But an address that starts with // is not a path. It means "keep the same scheme as now, and the host name comes right after it".' : 'This value starts with "/", so it passes.'), bad ? 'bad' : good ? 'good' : '');
    } else {
      st.checked = r.ok ? 'Passed' : 'Rejected, replaced with "/"'; row('shop.example', 'Check next: is it a path on the same site?', st.checked, good ? 'good' : '');
      push('The server checks that it starts with "/" and that the second character is not "/" or "\\": ' + (r.ok ? '/orders is a path that meets the conditions, so it passes.' : c.next === 'abs' ? 'This value does not start with "/". The server does not accept it and replaces it with the home page ("/").' : 'This value starts with "/", but its second character is also "/". It is an address followed by a host name, so the server does not accept it and replaces it with the home page ("/").'), good ? 'good' : '');
    }
    st.phase = 4; st.loc = r.loc; row('shop.example', '302 response', 'Location: ' + r.loc, bad ? 'bad' : 'hot');
    push('The server sends a 302 response meaning "go to another address". The address in the Location header of the response is ' + r.loc + '. The embedded Tomcat of Spring Boot sends Location as an absolute URL.' + (r.ok && c.next === 'dslash' ? ' //attacker.example/login became https://attacker.example/login.' : ''), bad ? 'bad' : '');
    st.phase = 5; st.at = r.loc; row('Browser', 'Follows Location', r.away ? 'Arrives at attacker.example' : 'Stays on shop.example', bad ? 'bad' : 'good');
    var res = !atk ? 'Went to the intended page' : r.away ? 'Open redirect succeeded' : 'Blocked (sent to the home page)';
    if (!atk) push('The browser goes to the address in Location. It arrives at ' + r.loc + '. The order history the user wanted to see before logging in opens. This is what the feature was meant to do.', 'good');
    else if (r.away) push('The browser goes to the address in Location. It arrives at ' + r.loc + '. The user has just logged in on the real shop.example, so they are not suspicious. If the page they arrive at looks exactly like shop.example and says "Enter your password again", they are likely to enter it.', 'bad');
    else push('The browser goes to the address in Location. It arrives at ' + r.loc + '. The address the attacker inserted was discarded, and the user is on the home page of shop.example.', 'good');
    if (r.away && c.check === 'none') sum.push('If the server redirects to an address taken from the request as it is, a link that starts with your site\'s address becomes a passage to anywhere. Users trust the first part of the address, so this is used to lure them to a fake login page.');
    if (r.away && c.check === 'slash') sum.push('It is easy to assume that a value starting with "/" is a path on your own site, but an address starting with // points to a different host. Browsers also treat an address starting with /\\ like //, so you have to check the second character as well.');
    if (atk && !r.away) sum.push((c.check === 'slash' ? 'This value was blocked, but a check that only looks for "/" has a gap. ' : '') + 'The way to block it is "accept only what is acceptable". Accept only paths on the same site or, more reliably, accept a predefined name (for example, next=orders) instead of an address, and have the server look up the address in its own list.');
    if (!atk) sum.push('A normal value gives the same result in every check. The difference shows when an address on another site comes in.');
    if (atk) sum.push('The default login of Spring Security takes the address to return to from what it saved in the server\'s session, not from a value in the request, so it does not have this problem. A check is needed when you build the login so that it takes the return address directly from a request value.');
    return { events: ev, summary: sum, row: ['Location: ' + r.loc, r.away ? 'Went to attacker.example' : 'Stayed on shop.example', res], away: r.away, loc: r.loc };
  },
  render: function (v, sim, t, H, shown) {
    var last = shown[shown.length - 1], rows = last ? last.snap.rows : [], c = sim.c;
    if (!rows.length) { H.text(v, 'Click Run to go one step at a time.'); return; }
    H.table(v, ['Who', 'What', 'Result'], rows, c.topic === 'frame' ? 'What happened between the browser and shop.example' : 'What happened after the link was opened');
    if (c.topic === 'frame') H.text(v, 'The headers that Spring Security with its default settings adds to a response are Cache-Control, Pragma, Expires, X-Content-Type-Options: nosniff, X-Frame-Options: DENY, and X-XSS-Protection: 0 (checked in the actual response to a request sent over http; according to the Spring Security documentation, Strict-Transport-Security is also added to https requests). Of these, the one about frames is X-Frame-Options.');
  },
  // Diagram: for clickjacking, the page open in the browser and its frame on the left, my server and the response headers on the right. For the redirect, link → check on my server → where the browser arrives.
  draw: function (P, sim, shown) {
    var c = sim.c, last = shown[shown.length - 1], s = last ? last.snap : { phase: 0 }, ph = s.phase;
    P.size(680, 280);
    if (c.topic === 'frame') {
      var who = c.who, on = sim.on, atk = who === 'attacker', judged = ph >= 4;
      var verdict = !judged ? '' : atk ? (on ? 'bad' : 'good') : (on ? 'good' : 'bad');
      P.region('f_pg', 16, 16, 316, 196, 'Open page: ' + this.PAGE[who].replace('https://', ''));
      P.box('f_btn', 30, 46, 288, 32, { cls: ph >= 1 ? 'plain' : 'ghost', title: atk ? 'Visible: "Claim prize" button' : who === 'self' ? 'Visible: the cart' : 'Visible: partner site page' });
      P.box('f_fr', 30, 90, 288, 108, { cls: ph < 2 ? 'ghost' : !judged ? 'wait' : verdict, title: 'Frame (iframe)', sub: [atk ? 'Made transparent, over the button' : 'Shown as part of the page', ph < 2 ? 'Still empty' : !judged ? 'Fetching shop.example/pay' : on ? 'Payment page rendered: [Pay]' : 'Empty (not rendered by the browser)', ph === 5 && atk && on ? 'The click lands on [Pay]' : ' '] });
      P.region('f_sv', 348, 16, 316, 196, 'My server: shop.example');
      P.box('f_pay', 362, 46, 288, 32, { cls: ph >= 2 ? 'wait' : 'ghost', title: 'GET /pay: payment page' });
      var lines = !s.hs ? ['No response yet'] : !s.hs.length ? ['(none)'] : [];
      (s.hs || []).forEach(function (h) { if (h.indexOf('Content-Security-Policy') === 0) lines.push('Content-Security-Policy:', "  frame-ancestors 'self'", '  https://partner.example'); else lines.push(h); });
      P.box('f_hd', 362, 90, 288, 108, { cls: !s.hs ? 'ghost' : 'hot', title: 'Response headers (frame-related)', sub: lines, mono: !!s.hs });
      if (ph >= 2) P.arrow('f_rq', 'f_fr:r:0.25', 'f_pay:l', { label: 'Request' });
      if (ph >= 3) P.arrow('f_rs', 'f_hd:l:0.6', 'f_fr:r:0.6', { cls: !judged ? 'hot' : on ? (atk ? 'bad' : 'good') : 'dash', label: !judged ? 'Response' : on ? 'Render' : 'No render' });
      P.box('f_res', 16, 228, 648, 36, { cls: ph < 5 ? 'ghost' : verdict, title: 'Result', right: ph < 5 ? 'In progress' : sim.row[2] });
      P.note('The browser, not the server, decides whether to render the page inside a frame. The server only says in a response header who may put the page in a frame. With no header, the browser renders it in anyone\'s frame.');
      return;
    }
    var away = sim.away, atk2 = c.next !== 'path', v = this.NEXT[c.next];
    P.box('r_link', 16, 16, 648, 52, { cls: ph === 1 ? 'hot' : ph ? 'plain' : 'ghost', title: atk2 ? 'Link sent by the attacker' : 'URL opened by the user', sub: 'https://shop.example/login?next=' + v, mono: true });
    P.box('r_srv', 16, 100, 340, 108, { cls: ph < 2 ? 'ghost' : ph >= 4 && away ? 'bad' : 'wait', title: 'My server: shop.example', sub: [ph >= 2 ? 'next = ' + v : 'No request yet', ph >= 3 ? 'Check: ' + s.checked : ' ', ph >= 4 ? 'Location:' : ' ', ph >= 4 ? '  ' + s.loc : ' '] });
    P.box('r_dst', 396, 100, 268, 108, { cls: ph < 5 ? 'ghost' : away ? 'bad' : 'good', title: 'Where the browser arrives', sub: ph < 5 ? ['Not moved yet'] : away ? ['attacker.example/login', 'The attacker\'s site', '(fake shop.example page)'] : [sim.loc.replace('https://', ''), atk2 ? 'Home page of shop.example' : 'Order history on shop.example'] });
    if (ph >= 2) P.arrow('r_a1', 'r_link:b:0.25', 'r_srv:t', { label: 'Login' });
    if (ph >= 4) P.arrow('r_a2', 'r_srv:r', 'r_dst:l', { cls: ph < 5 ? 'hot' : away ? 'bad' : 'good', label: '302' });
    P.box('r_res', 16, 228, 648, 36, { cls: ph < 5 ? 'ghost' : away ? 'bad' : 'good', title: 'Result', right: ph < 5 ? 'In progress' : sim.row[2] });
    P.note('The first part of the link is the real shop.example, and the login also happens on the real server. If the value in the request decides where to send the user back, the check on that value is the only line of defense.');
  },
  assume: 'The 5 frame-related header cases and the 9 Location header cases were checked against the actual responses of a Spring Boot 4.1.1 (Spring Security 7.1.1, embedded Tomcat 11) server started on 127.0.0.1. Browser behavior (15 cases of whether the page is rendered inside the frame, and 9 cases of which server the browser reaches by following Location) was checked by running Chromium 151 in headless mode, with origins imitated by different ports on 127.0.0.1. Other browsers were not run, and the documentation was followed: RFC 7034 and the HTML Standard for X-Frame-Options, the W3C Content Security Policy Level 3 for frame-ancestors, RFC 3986 section 4.2 for addresses that start with //, and the WHATWG URL Standard for treating a backslash like a slash. Simplifications: only one level of framing is covered (with several levels, the browser checks all the outer pages). How a page is overlaid transparently is not included. Cookies with SameSite=Lax are not attached to requests sent from inside a frame on another site (RFC 6265bis draft), and Chromium-based browsers treat cookies with no SameSite attribute as Lax too. So clickjacking of a page that requires login mainly works when the session cookie is SameSite=None. This cookie part was not run. The ALLOW-FROM value of X-Frame-Options is not covered because current browsers do not support it. Location is converted to an absolute URL with the Spring Boot default (server.tomcat.use-relative-redirects=false), and a server with this value set to true sends the received value as it is. With that setting, a value of the form /\\attacker.example also passed the check that only looks for "/", and Chromium was confirmed to go to another server. The Location shown on screen is the address of the test server rewritten as https://shop.example.',
});

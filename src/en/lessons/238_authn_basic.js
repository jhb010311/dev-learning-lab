Lab.register({
  id: 'authn_basic', nav: 'Authentication and authorization', cat: 'Fundamentals', mode: 'step', basic: true, deep: ['security'],
  title: 'How are authentication and authorization different?',
  intro: 'Authentication and authorization are two checks a server makes when it receives a request. Authentication checks who sent the request (whether the username and password are right), and authorization checks whether that person is allowed to do this (whether they have permission). Authentication comes first. These checks are not in the controller\'s code. Spring Security makes them before the request reaches the controller, and the rules for them are the settings part at the top of the screen. The line .requestMatchers("/admin").hasRole("ADMIN") is an authorization rule that opens /admin only to someone with the ADMIN role, the line .anyRequest().authenticated() is a rule that opens any other address only to someone whose identity is confirmed, and the line .httpBasic(...) is the method that confirms who it is from the username and password carried in the request. In this lab you remove or open the authorization rule and send /admin requests from the administrator admin, the regular member kim, a wrong password, and no username, and you see at which check the request is blocked and what response goes out.',
  terms: ['Authentication and authorization', '401 Unauthorized and 403 Forbidden', 'Authority (role)', 'HTTP Basic authentication', 'Spring Security and SecurityFilterChain'],
  controls: [
    { id: 'rule', label: 'Rule written for /admin', type: 'select', value: 'role', options: [['role', '/admin uses hasRole("ADMIN")'], ['authed', 'Remove the role rule for /admin (only authenticated() is left)'], ['open', '/admin uses permitAll() (open to everyone)']] },
    { id: 'who', label: 'Who requests /admin', type: 'select', value: 'admin', options: [['admin', 'The administrator admin requests with the right password'], ['kim', 'The regular member kim requests with the right password'], ['wrong', 'kim requests with the wrong password'], ['none', 'Request with no username and password']] },
  ],
  // q is the question shown on the question-style screen. t and d are the name and the description used in the text-only reading
  presets: [
    { t: 'Default settings', q: 'How are authentication and authorization different, and what happens when the administrator requests /admin?', d: 'The administrator passes authentication and authorization in turn, and the admin() method runs.', v: { rule: 'role', who: 'admin' } },
    { t: 'Requesting with no username and password', q: 'What if you request with no username and password?', d: 'Who it is is not confirmed, so a 401 response goes out and the admin() method does not run.', v: { rule: 'role', who: 'none' } },
    { t: 'The regular member kim requests', q: 'What if the regular member kim requests?', d: 'Who it is is confirmed, but kim lacks the role, so a 403 response goes out.', v: { rule: 'role', who: 'kim' } },
    { t: 'kim requests with the wrong password', q: 'What if kim requests with the wrong password?', d: 'The request is blocked at authentication, so a 401 response goes out. The authorization rule is not even looked at.', v: { rule: 'role', who: 'wrong' } },
    { t: 'Removing the hasRole("ADMIN") rule', q: 'What if you remove the hasRole("ADMIN") rule and kim requests?', d: 'Anyone whose identity is confirmed gets through, so even the regular member kim sees the admin page.', v: { rule: 'authed', who: 'kim' } },
    { t: 'Opening it to everyone', q: 'What if you open /admin to everyone (permitAll) and request with no username?', d: 'Even a request whose identity is not confirmed gets through, and the admin() method runs.', v: { rule: 'open', who: 'none' } },
  ],
  // The status code of the response in this setting
  result: function (c) {
    if (c.who === 'wrong') return 401;
    if (c.who === 'none') return c.rule === 'open' ? 200 : 401;
    if (c.who === 'admin') return 200;
    return c.rule === 'role' ? 403 : 200;
  },
  code: function (c) {
    var out = ['@Configuration', 'public class SecurityConfig {', '    @Bean', '    SecurityFilterChain filterChain(HttpSecurity http) throws Exception {', '        http.authorizeHttpRequests(auth -> auth'];
    if (c.rule === 'role') out.push('                // Authorization: /admin only for someone with the ADMIN role', '                .requestMatchers("/admin").hasRole("ADMIN")');
    if (c.rule === 'open') out.push('                // No check: /admin is open to everyone', '                .requestMatchers("/admin").permitAll()');
    out.push('                // Authorization rule: any other address is allowed only if the identity is confirmed (authenticated)', '                .anyRequest().authenticated())', '            // Confirm who it is from the username and password in the request', '            .httpBasic(Customizer.withDefaults());', '        return http.build();', '    }', '}', '',
      '@RestController', 'public class AdminController {', '    @GetMapping("/admin")', '    public String admin() {', '        return "Admin page";', '    }', '}');
    return out.join('\n');
  },
  label: function (c) { return { role: '/admin uses hasRole("ADMIN")', authed: 'no role rule for /admin', open: '/admin uses permitAll()' }[c.rule] + ' · ' + { admin: 'admin requests', kim: 'kim requests', wrong: 'kim requests with the wrong password', none: 'request with no username' }[c.who]; },
  columns: ['Who the server confirmed', 'Response', 'admin() method ran'],
  simulate: function (c) {
    var ev = [], sum = [], st = { phase: '', a1: '', a2: '', resp: null, calls: 0 };
    var who = c.who, rule = c.rule, res = this.result(c), valid = who === 'admin' || who === 'kim';
    var nm = who === 'admin' ? 'admin' : 'kim', lbl = who === 'admin' ? 'administrator' : 'regular member', role = who === 'admin' ? 'ADMIN' : 'USER';
    function push(s, k) { ev.push({ s: s, k: k, snap: JSON.parse(JSON.stringify(st)) }); }
    var carried = { admin: 'The Authorization header of the request carries the username admin and the right password.', kim: 'The Authorization header of the request carries the username kim and the right password.', wrong: 'The Authorization header of the request carries the username kim and a wrong password.', none: 'This request has no Authorization header. It carries neither a username nor a password.' }[who];
    st.phase = 'sent';
    push('A GET /admin request (a request asking the server for the page at the /admin address) arrives at the server. ' + carried + (valid || who === 'wrong' ? ' The username and password arrive in this header, and the server does the checking.' : ''), '');
    st.phase = 'sec';
    push('Before the request reaches the controller, Spring Security receives it first. Spring Security is a line of filters placed in front of the controller, and it checks two things in order to decide whether to pass this request on to the controller. Nothing has reached the admin() method that we wrote yet.', '');
    // Authentication
    st.phase = 'authn';
    if (valid) {
      st.a1 = 'ok';
      push('Authentication (who is it?): the username ' + nm + ' and the password in the request are compared with the registered users. They match. The server has confirmed that the sender of this request is ' + nm + ' (' + lbl + '), and it remembers this while the request is being handled. This is done by the method that the .httpBasic(...) line turns on.', 'good');
    } else if (who === 'wrong') {
      st.a1 = 'fail';
      push('Authentication (who is it?): the username kim and the password in the request are compared with the registered users. The username exists, but the password does not match. Who it is is not confirmed, so Spring Security rejects this request here. It does not go on to the authorization step.' + (rule === 'open' ? ' This is the same even if /admin is permitAll(). A request that carries a username and password goes through authentication first, and if it is wrong, the request ends before the rule for /admin is looked at.' : ''), 'bad');
      st.a2 = 'skip'; st.resp = { status: '401', body: '' }; st.phase = 'done';
      push('Spring Security sends back a 401 Unauthorized response. 401 means "who it is has not been confirmed," and the response carries a notice asking for a username and password (the WWW-Authenticate header). The admin() method did not run.', 'bad');
    } else {
      st.a1 = 'anon';
      push('Authentication (who is it?): the request has no username and password. There is nothing to compare, so the request goes on to the next step with who it is still not confirmed. Spring Security treats this request as one from an unnamed "anonymous user."', '');
    }
    // Authorization
    if (who !== 'wrong') {
      st.phase = 'authz';
      var head = 'Authorization (is it allowed?): ', tail = '';
      if (rule === 'role') {
        head += 'The rule for /admin is hasRole("ADMIN"), so only someone with the ADMIN role gets through. ';
        tail = who === 'admin' ? 'The role of admin is ADMIN. It passes.' : who === 'kim' ? 'The only role of kim is USER. kim does not have the ADMIN role, so the request is denied.' : 'Who it is has not been confirmed, so the request is denied before roles are even considered.';
      } else if (rule === 'authed') {
        head += 'There is no separate rule for /admin, so the last rule, which is used for any other address, anyRequest().authenticated(), applies. Anyone whose identity is confirmed gets through. ';
        tail = who === 'admin' ? 'admin is confirmed, so it passes.' : who === 'kim' ? 'kim is confirmed, so it passes. It does not matter that kim has only the USER role, because there is no rule that checks roles.' : 'Who this request is has not been confirmed, so it is denied.';
      } else {
        head += 'The rule for /admin is permitAll(), so it is open to everyone. ';
        tail = valid ? 'It lets the request through without asking who it is.' : 'It lets through a request with no username too.';
      }
      if (res === 200) {
        st.a2 = 'pass';
        push(head + tail, 'good');
        st.phase = 'ctl'; st.calls = 1;
        push('It passed Spring Security, so the request reaches the controller and the admin() method runs. There is not a single line in the admin() we wrote that checks who it is. Spring Security finished the check before the request got here.', 'good');
        st.phase = 'done'; st.resp = { status: '200', body: 'Admin page' };
        push('The browser receives a 200 response. The body is "Admin page".', '');
      } else if (res === 401) {
        st.a2 = 'd401';
        push(head + tail, 'bad');
        st.phase = 'done'; st.resp = { status: '401', body: '' };
        push('Spring Security sends back a 401 Unauthorized response. A request whose identity is not confirmed came to a place that only confirmed people may enter, so this is a 401, meaning "first say who you are." The response carries a notice asking for a username and password (the WWW-Authenticate header). The admin() method did not run.', 'bad');
      } else {
        st.a2 = 'd403';
        push(head + tail, 'bad');
        st.phase = 'done'; st.resp = { status: '403', body: '' };
        push('Spring Security sends back a 403 Forbidden response. Who it is has been confirmed, but this user is not allowed to do this, so this is a 403, meaning "you are not allowed." Unlike a 401, no notice asking for a username and password (the WWW-Authenticate header) is attached. The admin() method did not run.', 'bad');
      }
    }
    // Summary
    var who2 = nm;
    if (rule === 'role' && who === 'admin') {
      sum.push('Authentication confirms who sent the request, and authorization confirms whether that person is allowed to do this. Authentication comes first. The administrator admin passed both, so the admin() method ran and a 200 response came back.');
      sum.push('Neither check is in the controller. Spring Security did them before the request reached the controller, and there is no checking line in the admin() we wrote. Only when both pass does the controller code run.');
    } else if (who === 'wrong') {
      sum.push('Even if the username is kim, a wrong password means who it is is not confirmed, so a 401 response goes out at the authentication step. The request never got to the authorization step, and the admin() method did not run.');
      sum.push(rule === 'open' ? '/admin is permitAll(), but a request that carries a wrong password is still rejected at authentication. Even for an address open to everyone, a check follows if you send a username and password.' : 'A wrong password gives the same 401 as sending no username. A username alone does not make you kim; you are kim only when the right password confirms it.');
    } else if (res === 401) {
      sum.push('With no username and password, who it is is not confirmed, so a 401 response goes out. 401 means "first say who you are," and the admin() method does not run.');
      sum.push('Authentication, which confirms who it is, comes before authorization, which checks permissions. A request from someone unknown cannot be said to have or lack permission, so it gets 401, not 403.');
    } else if (res === 403) {
      sum.push('kim was confirmed as kim, but /admin needs the ADMIN role, so a 403 response goes out. 403 means "you are not allowed," and the admin() method does not run.');
      sum.push('Passing authentication and passing authorization are different things. A request can be blocked even after the identity is confirmed, and asking again with the same username and password gives the same result.');
    } else if (rule === 'authed') {
      sum.push('If you remove the hasRole("ADMIN") rule, /admin gets the rule "anyone whose identity is confirmed gets through," so ' + (who === 'kim' ? 'the regular member kim passes too and gets a 200 response. The admin() method runs.' : 'the administrator admin still passes. But now a regular member passes as well.'));
      sum.push('Sorting people by role is the job of the authorization rule. Without that rule, everyone who passes authentication can see the admin page.');
    } else {
      sum.push('If you open /admin with permitAll(), ' + (valid ? 'even the request from ' + who2 + ', whose identity is confirmed, passes without any problem and' : 'even a request with no username and password passes and') + ' gets a 200 response, and the admin() method runs.');
      sum.push(valid ? 'permitAll() cares neither who it is nor roles. Even if the server found out who ' + who2 + ' is, that was not used to decide whether to pass.' : 'An address open to everyone can be called by anyone. No one was confirmed by the server (anonymous), but the method ran, and the admin page was opened to anyone.');
    }
    return { events: ev, summary: sum, row: [valid ? nm + ' (' + lbl + ')' : 'Not confirmed', res === 200 ? '200 Admin page' : String(res), res === 200 ? 'Ran' : 'Did not run'] };
  },
  render: function (v, sim, t, H, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : null, c = sim.c;
    if (!s) { H.text(v, 'Click Run to start with the request arriving at the server.'); return; }
    var s1 = { '': '', ok: (c.who === 'admin' ? 'admin' : 'kim') + ' confirmed', fail: 'Not confirmed: wrong password', anon: 'Not confirmed: no username (anonymous)' }[s.a1];
    var s2 = { '': '', pass: 'Passed', d401: 'Denied (401)', d403: 'Denied (403)', skip: 'Skipped' }[s.a2];
    var rule = { role: 'hasRole("ADMIN")', authed: 'authenticated()', open: 'permitAll()' }[c.rule];
    H.table(v, ['Check', 'What it checks', 'Result'], [
      { cls: '', cells: ['Authentication: who is it?', 'Do the username and password in the request match a registered user?', { v: s1, cls: s.a1 === 'ok' ? 'good' : s.a1 === 'fail' ? 'bad' : '' }] },
      { cls: s.a2 === 'skip' ? 'gone' : '', cells: ['Authorization: is it allowed?', 'Rule for /admin: ' + rule, { v: s2, cls: s.a2 === 'pass' ? 'good' : s.a2 === 'skip' || !s.a2 ? '' : 'bad' }] },
    ], 'Two checks the server makes');
    if (s.resp) H.table(v, ['Response', 'WWW-Authenticate header'], [{ cls: '', cells: [{ v: s.resp.status + (s.resp.body ? ' ' + s.resp.body : ''), cls: s.resp.status === '200' ? 'good' : 'bad' }, s.resp.status === '401' ? 'Present (a notice asking for a username and password)' : 'Absent'] }], 'Response');
    H.counters(v, [[s.calls, 'admin() runs']]);
  },
  // Diagram: on the left the request (who sent it), in the middle two gates inside Spring Security (authentication, authorization) in order, and on the right the controller's admin(). A gate that blocks shows in red and the response goes back from there.
  draw: function (P, sim, shown) {
    var c = sim.c, last = shown[shown.length - 1], s = last ? last.snap : null, ph = s ? s.phase : '';
    P.size(680, 250);
    var who = { admin: ['admin', 'Password OK'], kim: ['kim', 'Password OK'], wrong: ['kim', 'No match'], none: ['No username', ' '] }[c.who];
    P.box('rq', 14, 56, 100, 70, { cls: s && ph !== 'done' ? 'wait' : 'plain', title: 'GET /admin', sub: who });
    P.region('sc', 144, 16, 376, 138, 'Spring Security');
    var a1 = s ? s.a1 : '', a2 = s ? s.a2 : '';
    var t1 = { '': ' ', ok: (c.who === 'admin' ? 'admin' : 'kim') + ' confirmed', fail: 'Wrong password', anon: 'No username' }[a1];
    P.box('g1', 156, 50, 150, 76, { cls: ph === 'authn' ? 'hot now' : a1 === 'ok' ? 'good' : a1 === 'fail' ? 'bad' : a1 === 'anon' ? 'wait' : 'ghost', title: 'Authentication', sub: ['Password right?', t1] });
    var r2 = { role: 'Has ADMIN role?', authed: 'Confirmed user?', open: 'Anyone passes' }[c.rule];
    var t2 = { '': ' ', pass: 'Passed', d401: 'Denied 401', d403: 'Denied 403', skip: 'Skipped' }[a2];
    P.box('g2', 358, 50, 150, 76, { cls: ph === 'authz' ? 'hot now' : a2 === 'pass' ? 'good' : a2 === 'd401' || a2 === 'd403' ? 'bad' : 'ghost', title: 'Authorization', sub: [r2, t2] });
    var on = ph === 'ctl';
    P.box('k', 570, 50, 100, 76, { cls: on ? 'hot now' : s && s.calls ? 'good' : 'ghost', title: 'Controller', sub: ['admin()', 'Runs: ' + (s ? s.calls : 0)] });
    if (s) P.arrow('a_rq', 'rq:r:0.5', 'g1:l:0.5', ph === 'sent' ? {} : { cls: 'hot' });
    if (s && (a1 === 'ok' || a1 === 'anon') && a2 !== 'skip' && (ph === 'authz' || ph === 'ctl' || ph === 'done')) P.arrow('a_12', 'g1:r:0.5', 'g2:l:0.5', { cls: 'good' });
    if (a2 === 'pass' && (ph === 'ctl' || ph === 'done')) P.arrow('a_2k', 'g2:r:0.5', 'k:l:0.5', { cls: 'good' });
    if (s && s.resp) {
      if (a1 === 'fail') P.arrow('a_rs', 'g1:b:0.5', 'n1:t:0.3', { cls: 'bad' });
      else if (a2 === 'd401' || a2 === 'd403') P.arrow('a_rs', 'g2:b:0.5', 'n1:t:0.7', { cls: 'bad' });
      else P.arrow('a_rs', 'k:b:0.5', 'n1:t:0.9', { cls: 'good' });
    }
    P.box('n1', 14, 192, 322, 36, { cls: s && s.resp ? (s.resp.status === '200' ? 'good' : 'bad') : 'ghost', title: 'Response', right: s && s.resp ? s.resp.status : '-' });
    P.box('n2', 344, 192, 322, 36, { cls: s && s.calls ? 'good' : 'ghost', title: 'Times admin() ran', right: String(s ? s.calls : 0) });
  },
  assume: 'These are the results of running Spring Boot 4.1.1 (Spring Framework 7.0.9, embedded Tomcat 11) and Spring Security 7.1.1 on JDK 21. For all twelve combinations, we compiled the same source as the code on the screen (the security configuration SecurityConfig and the controller AdminController, to which we added only a line that counts how many times it runs) in the package app, started a real server as a child Java process, and sent a real HTTP request (GET /admin) to check. The username and password were sent in the Authorization header, and we started a new server for every request. What we left out of the screen are the package and import lines, the start class, and the user registration. The users are a regular member kim (role USER) and an administrator admin (role ADMIN) in an in-memory user store (InMemoryUserDetailsManager), and the passwords carry the {noop} prefix and are unencrypted values for testing (in a real service, passwords are stored encrypted). We added nothing to the security configuration beyond the lines on the screen. CSRF and session settings are the defaults, and because the request is a GET they did not affect the result. "Who the server confirmed" was obtained from which Authentication was recorded in SecurityContextHolder while the request was being handled. We changed the storage strategy of SecurityContextHolder to a recording wrapper around the default one, which wrote the name and the authorities each time it was read or written, so the authentication information of requests that did not reach the controller could also be seen, and we added nothing to the security filter chain. The limit is that we see what happened inside the filters only at the points of reading and writing (we did not see the internal decisions of the filters themselves). What we checked against was the confirmed person obtained from this record (anonymous, or nothing set, when there is none), the status code and body, whether the WWW-Authenticate header was present, the number of times the admin() method ran, the order in which authentication happens before authorization, and whether the error response is forwarded once more to /error. What the documents decide is section 11 HTTP Authentication of RFC 9110 (11.1, 11.6.1), section 15.5.2 (401 means there are no valid authentication credentials, and WWW-Authenticate must be sent), section 15.5.4 (403 means the server understood the request but refuses to handle it), the Spring Security documentation Authorize HttpServletRequests (AuthorizationFilter looks at the rules in order from the top and applies only the first one that matches, hasRole adds the ROLE_ prefix, and AccessDeniedException is thrown when the request is denied), and the Architecture and Basic sections of Authentication (when an unauthenticated request is denied, AuthenticationEntryPoint sends the WWW-Authenticate header, and when authentication fails, SecurityContextHolder is cleared and the same handler is called). We opened the documents with WebFetch and checked them against the summarized results, and we could not read the RFC in full. What follows is not decided by the documents but is behavior we observed in this version. First, when the code on this screen is run as it is, a 403 goes out as it is for the request from the regular member kim. The error response is forwarded once more to /error, and in that second request too kim was recorded as a confirmed person and was not blocked. In the "Security filter chain" lab, which authenticates with a filter we made ourselves without using a session, the 403 at the same step turned into a 401, so it may differ depending on the configuration. Second, a wrong password gets a 401 even if /admin is permitAll(). A request that carries a username and password was rejected at authentication before the authorization rules were looked at, and there was no trace of the authorization step in the record. Third, a request with no username is not blocked at authentication but goes on as an anonymous user to the authorization step, where it gets a 401 if the rule blocks it and reaches the controller if the rule is open. Fourth, the 401 response carries the WWW-Authenticate header (the value is Basic realm="Realm"), and the 403 and 200 responses did not. Fifth, the response body of the 401 was empty and that of the 403 was Spring Boot\'s error page, and this can differ depending on the Accept header of the request, so the screen deals only with status codes. Sixth, in Spring Security 7.1, along with the ROLE_ authorities, an authority that indicates how the user authenticated (FACTOR_PASSWORD) is also recorded among the authorities of the logged-in user, but this lab does not cover it. We did not cover login methods (a login page, sessions, tokens). The requests in this lab use HTTP Basic, which sends the username and password with every request, and sessions and tokens that keep the logged-in state are covered in the Fundamentals labs "Sessions" and "Tokens" and in the study lab "Security filter chain". The real filter chain has more filters than are written here.',
});

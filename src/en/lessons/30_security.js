Lab.register({
  id: 'security', nav: 'Security filter chain', cat: 'Authentication', mode: 'step',
  title: 'Where is it decided whether the response is 401 or 403?',
  intro: 'Spring Security is a line of filters placed in front of the controller. A filter near the front checks "who this is" and records it, and a filter near the back decides "whether this user may enter this path". The response is 401 when the user is not identified, and 403 when the user is identified but lacks the required authority. This lab shows where a request is stopped, and with which response it ends, depending on its token and path.',
  terms: ['Authentication and authorization', 'Spring Security and SecurityFilterChain', 'SecurityContext', 'Servlet filter', 'HTTP status codes'], ranks: ['auth', 'websec', 'filter'],
  controls: [
    { id: 'who', label: 'Token carried by the request', type: 'select', value: 'none', options: [['none', 'No token'], ['bad', 'Expired or forged token'], ['user', 'Valid token (role: USER)'], ['admin', 'Valid token (role: ADMIN)']] },
    { id: 'path', label: 'Request path', type: 'select', value: 'orders', options: [['public', 'GET /public/notice (permitted for everyone)'], ['orders', 'GET /orders (login required)'], ['admin', 'GET /admin/users (ADMIN role required)']] },
  ],
  presets: [
    { t: 'Default settings', d: 'A path that requires login is requested without a token. 401.', v: { who: 'none', path: 'orders' } },
    { t: 'With a valid token', d: 'The request reaches the controller.', v: { who: 'user', path: 'orders' } },
    { t: 'USER requests an admin path', d: 'It is known who the user is, but the user lacks the permission. 403.', v: { who: 'user', path: 'admin' } },
    { t: 'ADMIN requests an admin path', d: 'The request passes.', v: { who: 'admin', path: 'admin' } },
    { t: 'Admin path without a token', d: 'The response is 401, not 403. See why.', v: { who: 'none', path: 'admin' } },
    { t: 'Path permitted for everyone', d: 'The request passes even without a token.', v: { who: 'none', path: 'public' } },
  ],
  code: function () {
    return '@Bean\nSecurityFilterChain filterChain(HttpSecurity http) throws Exception {\n    return http\n        .csrf(csrf -> csrf.disable())\n        .sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))\n        .authorizeHttpRequests(auth -> auth\n            .requestMatchers("/public/**").permitAll()\n            .requestMatchers("/admin/**").hasRole("ADMIN")\n            .anyRequest().authenticated())\n        .addFilterBefore(jwtAuthenticationFilter,\n                         UsernamePasswordAuthenticationFilter.class)\n        .exceptionHandling(e -> e\n            .authenticationEntryPoint((req, res, ex) -> res.setStatus(401))   // not authenticated\n            .accessDeniedHandler((req, res, ex) -> res.setStatus(403)))       // no permission\n        .build();\n}\n\n// JwtAuthenticationFilter: verifies the token in the Authorization header and,\n// if it is valid, puts the authentication information into the SecurityContext';
  },
  label: function (c) { return { none: 'No token', bad: 'Invalid token', user: 'USER token', admin: 'ADMIN token' }[c.who] + ' · ' + { public: '/public/notice', orders: '/orders', admin: '/admin/users' }[c.path]; },
  columns: ['Response', 'Authenticated?', 'Where it ended', 'Controller'],
  result: function (c) {
    var authed = c.who === 'user' || c.who === 'admin';
    if (c.path === 'public') return 200;
    if (!authed) return 401;
    if (c.path === 'admin' && c.who !== 'admin') return 403;
    return 200;
  },
  simulate: function (c) {
    var ev = [], seen = [], ctx = 'Empty', resp = '', res = this.result(c), authed = c.who === 'user' || c.who === 'admin', sum = [], end = '';
    var req = { public: 'GET /public/notice', orders: 'GET /orders', admin: 'GET /admin/users' }[c.path];
    function push(id, s, k) { seen.push(id); ev.push({ s: s, k: k, snap: { seen: seen.slice(), cur: id, ctx: ctx, resp: resp, bad: k === 'bad' ? id : null } }); }
    push('IN', req + ' comes in and enters the security filter chain. This is the Servlet filter stage, which comes before the controller.', '');
    if (c.who === 'none') push('JWT', 'JwtAuthenticationFilter: There is no token in the Authorization header. The filter does nothing and passes the request on to the next filter. It does not reject the request right here because the path may be one that does not require authentication.', '');
    if (c.who === 'bad') push('JWT', 'JwtAuthenticationFilter: There is a token, but its signature does not match or it has expired. The filter records no authentication information and passes the request on to the next filter.', '');
    if (authed) { ctx = 'Member 7 · ROLE_' + (c.who === 'admin' ? 'ADMIN' : 'USER'); push('JWT', 'JwtAuthenticationFilter: The filter has checked the signature and the expiration time of the token. It creates the authentication information from the member number and the authority in the token and puts it into the SecurityContext. While this request is being handled, "who the current user is" can be read from anywhere.', 'good'); }
    if (!authed) { ctx = 'Anonymous user'; push('ANON', 'AnonymousAuthenticationFilter: If there is still no authentication information at this point, the filter marks the request as coming from an "anonymous user".', ''); }
    var rule = { public: 'permitAll (permitted for everyone)', orders: 'authenticated (authenticated users only)', admin: 'hasRole("ADMIN") (the ADMIN role only)' }[c.path];
    if (res === 200) {
      push('AUTHZ', 'AuthorizationFilter: The rule for this path is ' + rule + '. ' + (c.path === 'public' ? 'Anyone passes.' : c.path === 'orders' ? 'The SecurityContext holds an authenticated user, so the request passes.' : 'The authority in the SecurityContext is ROLE_ADMIN, so the request passes.'), 'good');
      resp = '200 OK'; end = 'Controller'; push('CTL', 'The request has passed the whole filter chain and reaches DispatcherServlet and the controller.' + (authed ? ' The controller can receive the current user, for example with @AuthenticationPrincipal.' : ''), 'good');
    } else {
      push('AUTHZ', 'AuthorizationFilter: The rule for this path is ' + rule + '. ' + (authed ? 'The authority of the current user is ROLE_USER, so the condition is not met.' : 'The current user is anonymous, so the condition is not met.') + ' The filter throws an access denied exception.', 'bad');
      if (res === 401) { resp = '401 Unauthorized'; end = 'AuthenticationEntryPoint'; push('ETF', 'ExceptionTranslationFilter: The filter catches the exception and checks the user. The user is anonymous, so the filter treats this not as "no permission" but as "say who you are first", and it calls the AuthenticationEntryPoint to respond with 401.', 'bad'); }
      else { resp = '403 Forbidden'; end = 'AccessDeniedHandler'; push('ETF', 'ExceptionTranslationFilter: The filter catches the exception and checks the user. The user is authenticated but does not have enough authority, so the filter calls the AccessDeniedHandler to respond with 403.', 'bad'); }
    }
    ctx = 'Cleared'; push('OUT', 'The response goes out, and the SecurityContext that was used for this request is cleared. The information is bound to the thread, so it must be removed before the thread is reused for the next request.', '');
    if (res === 200 && c.path !== 'public') sum.push('The response is ' + resp + '. ' + (res === 200 ? 'The request passed the filter chain and the controller ran.' : 'The controller did not run, and ' + end + ' produced the response.'));
    if (res === 401) sum.push('401 means "it has not been confirmed who this is" (authentication failed). A request for an admin path without a token gets 401, not 403, because permissions cannot be checked while it is not known who the user is.');
    if (res === 403) sum.push('403 means "it is known who this is, but this user has no permission to do this" (authorization failed). Logging in again gives the same result.');
    if (res !== 200) sum.push('This response is produced in a filter before the request reaches DispatcherServlet, so it cannot be changed with @ControllerAdvice. To change the format of the response, register your own AuthenticationEntryPoint and AccessDeniedHandler.');
    if (res === 200 && c.path === 'public') sum.push('permitAll does not skip the filter chain. The request goes through all the filters, and the authorization step lets anyone pass.');
    return { events: ev, summary: sum, row: [resp, authed ? 'Yes' : 'No', end, res === 200 ? 'Ran' : 'Did not run'] };
  },
  STAGES: [['IN', 'Request comes in'], ['JWT', 'JwtAuthenticationFilter (who is this?)'], ['ANON', 'AnonymousAuthenticationFilter'], ['ETF', 'ExceptionTranslationFilter (to 401 or 403)'], ['AUTHZ', 'AuthorizationFilter (may this user enter?)'], ['CTL', 'DispatcherServlet → controller'], ['OUT', 'Response']],
  render: function (v, sim, t, H, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : { seen: [], cur: null, ctx: 'Empty', resp: '' }, done = shown.length === sim.events.length;
    var bads = shown.filter(function (e) { return e.snap.bad; }).map(function (e) { return e.snap.bad; });
    H.table(v, ['Filter chain (in order from top to bottom)', 'Status'], this.STAGES.map(function (st) { var id = st[0], seen = s.seen.indexOf(id) >= 0; return { cls: !seen && done ? 'gone' : '', cells: [st[1], { v: id === s.cur ? 'Now here' : seen ? (bads.indexOf(id) >= 0 ? 'Blocked here' : 'Passed') : done ? 'Not reached' : '', cls: id === s.cur ? 'hot' : bads.indexOf(id) >= 0 ? 'bad' : seen ? 'good' : '' }] }; }));
    H.text(v, 'ExceptionTranslationFilter comes before AuthorizationFilter, so it catches and handles the exception that is thrown behind it.');
  },
  // Diagram: a passage in which the filters are lined up from top to bottom. Colors show how far the request went in and where it was blocked.
  draw: function (P, sim, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : { seen: [], cur: null, ctx: 'Empty', resp: '' }, bads = shown.filter(function (e) { return e.snap.bad; }).map(function (e) { return e.snap.bad; });
    P.size(680, 330);
    P.region('chain', 16, 16, 440, 298, 'Filter chain (passed through from top to bottom)');
    this.STAGES.forEach(function (st, i) { var id = st[0], seen = s.seen.indexOf(id) >= 0, blocked = bads.indexOf(id) >= 0; P.box('st_' + id, 26, 50 + i * 37, 420, 30, { cls: id === s.cur ? 'hot now' : blocked ? 'bad' : seen ? 'good' : 'ghost', title: st[1], right: blocked ? 'Blocked' : '' }); });
    P.box('ctx', 472, 50, 192, 64, { cls: s.ctx === 'Empty' || s.ctx === 'Cleared' ? 'ghost' : 'good', title: 'SecurityContext', sub: ['Contains:', s.ctx] });
    P.box('resp', 472, 130, 192, 64, { cls: !s.resp ? 'ghost' : /^2/.test(s.resp) ? 'good' : 'bad', title: 'Response', sub: [s.resp || 'In progress', ' '] });
    P.note('Green is a filter that the request has passed, yellow is where the request is now, red is where the request was blocked, and a dashed outline is a place that the request did not reach.');
  },
  assume: 'The model assumes a common JWT-based setup that does not use sessions. The custom JwtAuthenticationFilter is assumed to pass the request on without rejecting it when the token is missing or invalid (some implementations make this filter return 401 right away for an invalid token). For all 12 combinations, HTTP requests were sent to a real server running Spring Boot 4.1.1 and Spring Security 7.1.1, and it was confirmed that the response code, the place that produced the response (AuthenticationEntryPoint, AccessDeniedHandler), and whether the controller ran match the screen. Two things were learned while doing this. First, if the response for an authentication failure is not specified (that is, if there is no exceptionHandling configuration), a request without a token gets 403, not 401. That is why the exceptionHandling configuration was put in the code on the screen. Second, when insufficient authority was left to the default handler of Spring Security, 401, not 403, came back when USER requested the admin path. This is because the default handler passes the request on again to the error page (/error), and that request has no authentication information, so it is handled as an authentication failure once more. To get 403 as on the screen, the handler must respond with the status code directly, or the /error path must be permitted. A real chain has more filters that are not listed here.',
});

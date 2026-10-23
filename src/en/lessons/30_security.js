Lab.register({
  id: 'security', nav: 'Security filter chain', cat: 'Authentication', mode: 'step',
  title: 'Where is it decided whether the response is 401 or 403?',
  why: 'If code that checks login status and permissions is put directly in each controller, missing just one place leaves that path open. Spring Security gathers this check in the filter stage in front of the controllers, so that when rules for each path are written in one place in the configuration, they are applied to all requests in the same way.',
  use: 'It is used in web services and API servers that require login. An API server that verifies users with a JWT turns on the token-checking filter with one line of oauth2ResourceServer configuration, and writes the rule that lets only the ADMIN authority through on admin paths in authorizeHttpRequests. When checking permissions per controller method, annotations such as @PreAuthorize are used together.',
  intro: 'Spring Security is a line of filters placed in front of the controller. A filter near the front checks "who this is" and records it in the SecurityContext, and a filter near the back decides "whether this user may enter this path". For an API server that uses a JWT, the oauth2ResourceServer configuration that Spring Security provides adds the token-checking filter (BearerTokenAuthenticationFilter) together with the parts that make the 401 and 403 responses. The response is 401 when the user is not identified, and 403 when the user is identified but lacks the required authority. This lab shows where a request is stopped, and with which response it ends, depending on its token and path.',
  terms: ['Authentication and authorization', 'Spring Security and SecurityFilterChain', 'OAuth 2.0 resource server (oauth2ResourceServer)', 'SecurityContext', 'Servlet filter', 'AuthenticationEntryPoint and AccessDeniedHandler', 'HTTP status codes'], ranks: ['auth', 'websec', 'filter'],
  controls: [
    { id: 'who', label: 'Token carried by the request', type: 'select', value: 'none', options: [['none', 'No token'], ['bad', 'Forged token (payload changed)'], ['user', 'Valid token (role: USER)'], ['admin', 'Valid token (role: ADMIN)']] },
    { id: 'path', label: 'Request path', type: 'select', value: 'orders', options: [['public', 'GET /public/notice (permitted for everyone)'], ['orders', 'GET /orders (login required)'], ['admin', 'GET /admin/users (ADMIN authority required)']] },
  ],
  presets: [
    { t: 'Default settings', q: 'Where does the request end when you request GET /orders, which requires login, without a token?', d: 'A path that requires login is requested without a token. 401.', v: { who: 'none', path: 'orders' } },
    { t: 'With a valid token', q: 'What if you request GET /orders with a valid token with the USER role?', d: 'The request reaches the controller.', v: { who: 'user', path: 'orders' } },
    { t: 'USER requests an admin path', q: 'What if you request GET /admin/users with a valid token with the USER role?', d: 'It is known who the user is, but the user lacks the authority. 403.', v: { who: 'user', path: 'admin' } },
    { t: 'ADMIN requests an admin path', q: 'What if you request GET /admin/users with a valid token with the ADMIN role?', d: 'The request passes.', v: { who: 'admin', path: 'admin' } },
    { t: 'Admin path without a token', q: 'What if you request GET /admin/users without a token?', d: 'The response is 401, not 403. See why.', v: { who: 'none', path: 'admin' } },
    { t: 'Path permitted for everyone, with a forged token', q: 'What if you request GET /public/notice, which is permitted for everyone, with a forged token?', d: 'The response is 401 even though it is a permitAll path.', v: { who: 'bad', path: 'public' } },
    { t: 'Path permitted for everyone, without a token', q: 'What if you request GET /public/notice, which is permitted for everyone, without a token?', d: 'The request passes even without a token.', v: { who: 'none', path: 'public' } },
  ],
  code: function () {
    return '// Only the configuration class body is shown (@Configuration class declaration and imports omitted)\n' +
      '// oauth2ResourceServer, JwtDecoder, NimbusJwtDecoder, JwtAuthenticationConverter,\n' +
      '// and JwtGrantedAuthoritiesConverter are provided by Spring Security (spring-boot-starter-oauth2-resource-server).\n' +
      '@Bean\n' +
      'SecurityFilterChain filterChain(HttpSecurity http) throws Exception {\n' +
      '    return http\n' +
      '        .sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))\n' +
      '        .authorizeHttpRequests(auth -> auth\n' +
      '            .requestMatchers("/public/**").permitAll()\n' +
      '            .requestMatchers("/admin/**").hasRole("ADMIN")\n' +
      '            .anyRequest().authenticated())\n' +
      '        .oauth2ResourceServer(o -> o.jwt(Customizer.withDefaults()))   // adds BearerTokenAuthenticationFilter\n' +
      '        .build();\n' +
      '}\n\n' +
      '@Bean   // the decoder that checks the signature of the token (HS256, the key is at least 32 bytes)\n' +
      'JwtDecoder jwtDecoder(@Value("${app.jwt.secret}") String secret) {   // app.jwt.secret is a setting name chosen for this example\n' +
      '    SecretKey key = new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), "HmacSHA256");\n' +
      '    return NimbusJwtDecoder.withSecretKey(key).build();\n' +
      '}\n\n' +
      '@Bean   // turns the role claim ("USER") of the token into the authority ROLE_USER (by default, the scope claim becomes SCOPE_ authorities)\n' +
      'JwtAuthenticationConverter jwtAuthenticationConverter() {\n' +
      '    JwtGrantedAuthoritiesConverter roles = new JwtGrantedAuthoritiesConverter();\n' +
      '    roles.setAuthoritiesClaimName("role");\n' +
      '    roles.setAuthorityPrefix("ROLE_");\n' +
      '    JwtAuthenticationConverter converter = new JwtAuthenticationConverter();\n' +
      '    converter.setJwtGrantedAuthoritiesConverter(roles);\n' +
      '    return converter;\n' +
      '}\n\n' +
      '// The 401 and 403 responses are made by BearerTokenAuthenticationEntryPoint and\n' +
      '// BearerTokenAccessDeniedHandler, which oauth2ResourceServer registers by default (you do not need to write exceptionHandling separately).';
  },
  label: function (c) { return { none: 'No token', bad: 'Forged token', user: 'USER token', admin: 'ADMIN token' }[c.who] + ' · ' + { public: '/public/notice', orders: '/orders', admin: '/admin/users' }[c.path]; },
  columns: ['Response', 'Authenticated?', 'Where it ended', 'Controller'],
  result: function (c) {
    var authed = c.who === 'user' || c.who === 'admin';
    if (c.who === 'bad') return 401;          // it ends right in the token-checking filter (whatever the path)
    if (c.path === 'public') return 200;
    if (!authed) return 401;
    if (c.path === 'admin' && c.who !== 'admin') return 403;
    return 200;
  },
  simulate: function (c) {
    var ev = [], seen = [], ctx = 'Empty', resp = '', res = this.result(c), authed = c.who === 'user' || c.who === 'admin', sum = [], end = '';
    var req = { public: 'GET /public/notice', orders: 'GET /orders', admin: 'GET /admin/users' }[c.path], role = c.who === 'admin' ? 'ADMIN' : 'USER';
    function push(id, s, k) { seen.push(id); ev.push({ s: s, k: k, snap: { seen: seen.slice(), cur: id, ctx: ctx, resp: resp, bad: k === 'bad' ? id : null } }); }
    push('IN', req + ' comes in and enters the security filter chain. This is the Servlet filter stage, which comes before the controller.', '');
    if (c.who === 'none') push('BEARER', 'BearerTokenAuthenticationFilter: There is no Bearer token in the Authorization header. The filter does nothing and passes the request on to the next filter. It does not reject the request right here because the path may be one that does not require authentication.', '');
    if (c.who === 'bad') {
      resp = '401 Unauthorized'; end = 'AuthenticationEntryPoint (from the token filter)';
      push('BEARER', 'BearerTokenAuthenticationFilter: The filter checked the token with JwtDecoder.decode, and the signature did not match, so BadJwtException occurred. This filter does not pass the request on to the next filter. It calls the AuthenticationEntryPoint (BearerTokenAuthenticationEntryPoint) right there and answers with 401. The WWW-Authenticate response header carries error="invalid_token" and the reason for the failure. It does not look at what the request path is.', 'bad');
    }
    if (authed) { ctx = 'JwtAuthenticationToken · Member 7 · ROLE_' + role; push('BEARER', 'BearerTokenAuthenticationFilter: The filter checked the signature and the expiration time with JwtDecoder.decode. The JwtAuthenticationConverter that was registered makes the authority ROLE_' + role + ' from the role claim, and the filter puts the JwtAuthenticationToken of member 7 into the SecurityContext. While this request is being handled, "who the current user is" can be read from anywhere.', 'good'); }
    if (c.who === 'none') { ctx = 'Anonymous user'; push('ANON', 'AnonymousAuthenticationFilter: If there is still no authentication information at this point, the filter marks the request as coming from an "anonymous user".', ''); }
    var rule = { public: 'permitAll (permitted for everyone)', orders: 'authenticated (authenticated users only)', admin: 'hasRole("ADMIN") (the ADMIN authority only)' }[c.path];
    if (c.who !== 'bad') {
      if (res === 200) {
        push('AUTHZ', 'AuthorizationFilter: The rule for this path is ' + rule + '. ' + (c.path === 'public' ? 'Anyone passes.' : c.path === 'orders' ? 'The SecurityContext holds an authenticated user, so the request passes.' : 'The authority in the SecurityContext is ROLE_ADMIN, so the request passes.'), 'good');
        resp = '200 OK'; end = 'Controller'; push('CTL', 'The request has passed the whole filter chain and reaches DispatcherServlet and the controller.' + (authed ? ' The controller can receive the claims of the token with a @AuthenticationPrincipal Jwt jwt parameter.' : ''), 'good');
      } else {
        push('AUTHZ', 'AuthorizationFilter: The rule for this path is ' + rule + '. ' + (authed ? 'The authority of the current user is ROLE_USER, so the condition is not met.' : 'The current user is anonymous, so the condition is not met.') + ' The filter throws an access denied exception (AccessDeniedException).', 'bad');
        if (res === 401) { resp = '401 Unauthorized'; end = 'AuthenticationEntryPoint'; push('ETF', 'ExceptionTranslationFilter: The filter catches the exception and checks the user. The user is anonymous, so the filter treats this not as "no authority" but as "say who you are first", and it calls the AuthenticationEntryPoint. The BearerTokenAuthenticationEntryPoint that oauth2ResourceServer registered responds with 401 and a WWW-Authenticate: Bearer header.', 'bad'); }
        else { resp = '403 Forbidden'; end = 'AccessDeniedHandler'; push('ETF', 'ExceptionTranslationFilter: The filter catches the exception and checks the user. The user is authenticated but does not have enough authority, so the filter calls the AccessDeniedHandler. The BearerTokenAccessDeniedHandler that oauth2ResourceServer registered responds with 403 and a WWW-Authenticate: Bearer error="insufficient_scope" header.', 'bad'); }
      }
    }
    ctx = 'Cleared'; push('OUT', 'The response goes out, and the SecurityContext that was used for this request is cleared. The information is bound to the thread, so it must be removed before the thread is reused for the next request.', '');
    if (res === 200 && c.path !== 'public') sum.push('The response is 200 OK. The request passed the filter chain and the controller ran.');
    if (res === 200 && c.path === 'public') sum.push('permitAll does not skip the filter chain. The request goes through all the filters, and the authorization step lets anyone pass.');
    if (res === 401 && c.who === 'none') sum.push('401 means "it has not been confirmed who this is" (authentication failed). A request for an admin path without a token gets 401, not 403, because ExceptionTranslationFilter turns the access denial of an anonymous user into "say who you are first". oauth2ResourceServer registers BearerTokenAuthenticationEntryPoint as the entry point used for this, so 401 comes out even if you do not write exceptionHandling separately.');
    if (c.who === 'bad') sum.push('If a token is sent and it is wrong, BearerTokenAuthenticationFilter ends the request right there with 401. That is why even a permitAll path gets 401 when the request carries a forged or expired token, while the request passes if you leave the token out. If you write the token-checking filter yourself so that it passes a wrong token on without rejecting it, this request becomes 200 (checked in the test run). The standard filter does not just let "a token was given but it is wrong" go by.');
    if (res === 403) sum.push('403 means "it is known who this is, but this user has no authority to do this" (authorization failed). BearerTokenAccessDeniedHandler writes the status code 403 itself, so the request is not passed on again to the error page. Logging in again gives the same result.');
    if (res !== 200) sum.push('This response is produced in a filter before the request reaches DispatcherServlet, so it cannot be changed with @ControllerAdvice. To change the format of the response, pass other implementations with oauth2ResourceServer(o -> o.authenticationEntryPoint(…).accessDeniedHandler(…)).');
    return { events: ev, summary: sum, row: [resp, authed ? 'Yes' : 'No', end, res === 200 ? 'Ran' : 'Did not run'] };
  },
  STAGES: [['IN', 'Request comes in'], ['BEARER', 'BearerTokenAuthenticationFilter (who?)'], ['ANON', 'AnonymousAuthenticationFilter'], ['ETF', 'ExceptionTranslationFilter (to 401 or 403)'], ['AUTHZ', 'AuthorizationFilter (may this user enter?)'], ['CTL', 'DispatcherServlet → controller'], ['OUT', 'Response']],
  render: function (v, sim, t, H, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : { seen: [], cur: null, ctx: 'Empty', resp: '' }, done = shown.length === sim.events.length;
    var bads = shown.filter(function (e) { return e.snap.bad; }).map(function (e) { return e.snap.bad; });
    var etfWaits = s.seen.indexOf('AUTHZ') >= 0 && s.seen.indexOf('OUT') < 0;
    H.table(v, ['Filter chain (in order from top to bottom)', 'Status'], this.STAGES.map(function (st) { var id = st[0], seen = s.seen.indexOf(id) >= 0, waitEtf = id === 'ETF' && !seen && etfWaits; return { cls: !seen && done ? 'gone' : '', cells: [st[1], { v: id === s.cur ? 'Now here' : seen ? (bads.indexOf(id) >= 0 ? (id === 'ETF' ? 'Caught the exception and made the ' + s.resp + ' response' : id === 'BEARER' ? 'Made the 401 response here' : 'Blocked here') : 'Passed') : waitEtf ? 'Passed, waiting for an exception thrown behind it' : done ? 'Nothing to do, or not reached' : '', cls: id === s.cur ? 'hot' : bads.indexOf(id) >= 0 ? 'bad' : seen ? 'good' : '' }] }; }));
    H.text(v, 'ExceptionTranslationFilter comes before AuthorizationFilter, so it catches and handles the exception that is thrown behind it. A request with a wrong token ends earlier than that, in BearerTokenAuthenticationFilter.');
  },
  // Diagram: a passage in which the filters are lined up from top to bottom. Colors show how far the request went in and where it was blocked.
  draw: function (P, sim, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : { seen: [], cur: null, ctx: 'Empty', resp: '' }, bads = shown.filter(function (e) { return e.snap.bad; }).map(function (e) { return e.snap.bad; });
    var etfWaits = s.seen.indexOf('AUTHZ') >= 0 && s.seen.indexOf('OUT') < 0;
    P.size(680, 330);
    P.region('chain', 16, 16, 440, 298, 'Filter chain (passed through from top to bottom)');
    this.STAGES.forEach(function (st, i) { var id = st[0], seen = s.seen.indexOf(id) >= 0, blocked = bads.indexOf(id) >= 0, waitEtf = id === 'ETF' && !seen && etfWaits; P.box('st_' + id, 26, 50 + i * 37, 420, 30, { cls: id === s.cur ? 'hot now' : blocked ? 'bad' : seen ? 'good' : waitEtf ? 'wait' : 'ghost', title: st[1], right: blocked ? (id === 'AUTHZ' ? 'Blocked' : 'Replied') : waitEtf ? 'Waiting' : '' }); });
    P.box('ctx', 472, 50, 192, 64, { cls: s.ctx === 'Empty' || s.ctx === 'Cleared' ? 'ghost' : s.ctx.indexOf('Anonymous') === 0 ? 'plain' : 'good', title: 'SecurityContext', sub: ['Authentication:', s.ctx.replace('JwtAuthenticationToken · ', '')] });
    P.box('resp', 472, 130, 192, 64, { cls: !s.resp ? 'ghost' : /^2/.test(s.resp) ? 'good' : 'bad', title: 'Response', sub: [s.resp || 'In progress', ' '] });
    P.note('Green is a filter that the request has passed, yellow is where the request is now, red is where the request was blocked and where the 401 or 403 response was made, blue is a filter the request already passed that waits to catch an exception thrown behind it, and a dashed outline is a place where the request passed with nothing to do, or that it did not reach. The SecurityContext box is green when there is an authenticated user and white for an anonymous user.');
  },
  assume: 'The model assumes a JWT API server that does not use sessions and uses oauth2ResourceServer of Spring Security with an HS256 JwtDecoder. For all 12 combinations, HTTP requests were sent to a real server running Spring Boot 4.1.1 and Spring Security 7.1.1, and it was confirmed that the response code, the place that produced the response, and whether the controller ran match the screen. In these runs, authorizeHttpRequests, AnonymousAuthenticationFilter, ExceptionTranslationFilter, and AuthorizationFilter of the real Spring Security ran. However, spring-security-oauth2-resource-server and oauth2-jose were not in the test environment, so the three parts that oauth2ResourceServer adds (BearerTokenAuthenticationFilter, BearerTokenAuthenticationEntryPoint, and BearerTokenAccessDeniedHandler) were replaced with stand-ins that copy only the behavior from the official 7.1.1 source, and I checked against the source the position of the filter (right before BasicAuthenticationFilter), the way it is registered by default, that a wrong token ends right there with 401 whatever the path, and that the 403 handler writes the status code itself. The token is the value from the lab "JWT structure and verification", and its signature was actually calculated and checked. The configuration code on the screen was confirmed to compile with javac together with a stand-in that copies only the official signatures. From 7.0 on, JwtAuthenticationConverter adds one more authority, FACTOR_BEARER, besides the authorities made from role, but this does not affect the rules of this lab. A real chain has more filters that are not listed here.',
});

Lab.register({
  id: 'security', nav: '시큐리티 필터 체인', cat: '인증', mode: 'step',
  title: '401과 403은 어디에서 갈리나',
  intro: '스프링 시큐리티는 컨트롤러 앞에 놓인 필터들의 줄입니다. 앞쪽 필터가 "누구인지"를 확인해 기록해 두고, 뒤쪽 필터가 "이 경로에 들어와도 되는지"를 판단합니다.',
  terms: ['인증과 인가', 'Spring Security와 SecurityFilterChain', 'SecurityContext', '필터(Filter)', 'HTTP 상태 코드'], ranks: ['auth', 'websec', 'filter'],
  controls: [
    { id: 'who', label: '요청에 실린 토큰', type: 'select', value: 'none', options: [['none', '토큰 없음'], ['bad', '만료되었거나 위조된 토큰'], ['user', '유효한 토큰 (권한: USER)'], ['admin', '유효한 토큰 (권한: ADMIN)']] },
    { id: 'path', label: '요청 경로', type: 'select', value: 'orders', options: [['public', 'GET /public/notice (누구나 허용)'], ['orders', 'GET /orders (로그인 필요)'], ['admin', 'GET /admin/users (ADMIN 권한 필요)']] },
  ],
  presets: [
    { t: '처음 설정으로', d: '토큰 없이 로그인이 필요한 경로를 요청합니다. 401.', v: { who: 'none', path: 'orders' } },
    { t: '유효한 토큰으로', d: '컨트롤러까지 도달합니다.', v: { who: 'user', path: 'orders' } },
    { t: 'USER가 관리자 경로를 요청', d: '누구인지는 알지만 권한이 없습니다. 403.', v: { who: 'user', path: 'admin' } },
    { t: 'ADMIN이 관리자 경로를 요청', d: '통과합니다.', v: { who: 'admin', path: 'admin' } },
    { t: '토큰 없이 관리자 경로', d: '403이 아니라 401입니다. 왜 그런지 보세요.', v: { who: 'none', path: 'admin' } },
    { t: '누구나 허용된 경로', d: '토큰이 없어도 통과합니다.', v: { who: 'none', path: 'public' } },
  ],
  code: function () {
    return '@Bean\nSecurityFilterChain filterChain(HttpSecurity http) throws Exception {\n    return http\n        .csrf(csrf -> csrf.disable())\n        .sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))\n        .authorizeHttpRequests(auth -> auth\n            .requestMatchers("/public/**").permitAll()\n            .requestMatchers("/admin/**").hasRole("ADMIN")\n            .anyRequest().authenticated())\n        .addFilterBefore(jwtAuthenticationFilter,\n                         UsernamePasswordAuthenticationFilter.class)\n        .exceptionHandling(e -> e\n            .authenticationEntryPoint((req, res, ex) -> res.setStatus(401))   // 인증 안 됨\n            .accessDeniedHandler((req, res, ex) -> res.setStatus(403)))       // 권한 없음\n        .build();\n}\n\n// JwtAuthenticationFilter: Authorization 헤더의 토큰을 검증하고\n// 유효하면 SecurityContext에 인증 정보를 넣는다';
  },
  label: function (c) { return { none: '토큰 없음', bad: '잘못된 토큰', user: 'USER 토큰', admin: 'ADMIN 토큰' }[c.who] + ' · ' + { public: '/public/notice', orders: '/orders', admin: '/admin/users' }[c.path]; },
  columns: ['응답', '인증됐나', '끝난 지점', '컨트롤러 실행'],
  result: function (c) {
    var authed = c.who === 'user' || c.who === 'admin';
    if (c.path === 'public') return 200;
    if (!authed) return 401;
    if (c.path === 'admin' && c.who !== 'admin') return 403;
    return 200;
  },
  simulate: function (c) {
    var ev = [], seen = [], ctx = '비어 있음', resp = '', res = this.result(c), authed = c.who === 'user' || c.who === 'admin', sum = [], end = '';
    var req = { public: 'GET /public/notice', orders: 'GET /orders', admin: 'GET /admin/users' }[c.path];
    function push(id, s, k) { seen.push(id); ev.push({ s: s, k: k, snap: { seen: seen.slice(), cur: id, ctx: ctx, resp: resp, bad: k === 'bad' ? id : null } }); }
    push('IN', req + ' 요청이 들어와 시큐리티 필터 체인에 진입합니다. 컨트롤러보다 앞, 서블릿 필터 단계입니다.', '');
    if (c.who === 'none') push('JWT', 'JwtAuthenticationFilter: Authorization 헤더에 토큰이 없습니다. 아무것도 하지 않고 다음 필터로 넘깁니다. 여기서 바로 거절하지 않는 이유는, 인증이 필요 없는 경로일 수도 있기 때문입니다.', '');
    if (c.who === 'bad') push('JWT', 'JwtAuthenticationFilter: 토큰이 있지만 서명이 맞지 않거나 만료됐습니다. 인증 정보를 기록하지 않고 다음 필터로 넘깁니다.', '');
    if (authed) { ctx = '회원 7 · 권한 ROLE_' + (c.who === 'admin' ? 'ADMIN' : 'USER'); push('JWT', 'JwtAuthenticationFilter: 토큰의 서명과 만료 시각을 확인했습니다. 토큰에 담긴 회원 번호와 권한으로 인증 정보를 만들어 SecurityContext에 넣습니다. 이 요청을 처리하는 동안 어디서든 "지금 사용자가 누구인지" 꺼내 볼 수 있습니다.', 'good'); }
    if (!authed) { ctx = '익명 사용자 (인증 안 됨)'; push('ANON', 'AnonymousAuthenticationFilter: 여기까지 인증 정보가 없으면 "익명 사용자"로 표시해 둡니다.', ''); }
    var rule = { public: 'permitAll (누구나 허용)', orders: 'authenticated (인증된 사용자만)', admin: 'hasRole("ADMIN") (ADMIN 권한만)' }[c.path];
    if (res === 200) {
      push('AUTHZ', 'AuthorizationFilter: 이 경로의 규칙은 ' + rule + '입니다. ' + (c.path === 'public' ? '누구든 통과합니다.' : c.path === 'orders' ? 'SecurityContext에 인증된 사용자가 있으므로 통과합니다.' : 'SecurityContext의 권한이 ROLE_ADMIN이므로 통과합니다.'), 'good');
      resp = '200 OK'; end = '컨트롤러'; push('CTL', '필터 체인을 모두 통과해 DispatcherServlet과 컨트롤러에 도달합니다.' + (authed ? ' 컨트롤러는 @AuthenticationPrincipal 등으로 현재 사용자를 받아 쓸 수 있습니다.' : ''), 'good');
    } else {
      push('AUTHZ', 'AuthorizationFilter: 이 경로의 규칙은 ' + rule + '입니다. ' + (authed ? '현재 사용자의 권한은 ROLE_USER라서 조건에 맞지 않습니다.' : '현재 사용자는 익명이라 조건에 맞지 않습니다.') + ' 접근 거부 예외를 던집니다.', 'bad');
      if (res === 401) { resp = '401 Unauthorized'; end = 'AuthenticationEntryPoint'; push('ETF', 'ExceptionTranslationFilter: 예외를 받아 사용자를 확인합니다. 익명 사용자이므로 "권한이 없다"가 아니라 "누구인지부터 밝혀라"로 판단하고, AuthenticationEntryPoint를 호출해 401로 응답합니다.', 'bad'); }
      else { resp = '403 Forbidden'; end = 'AccessDeniedHandler'; push('ETF', 'ExceptionTranslationFilter: 예외를 받아 사용자를 확인합니다. 인증된 사용자인데 권한이 모자란 것이므로 AccessDeniedHandler를 호출해 403으로 응답합니다.', 'bad'); }
    }
    ctx = '비워짐'; push('OUT', '응답이 나가고, 이 요청에 쓰인 SecurityContext는 비워집니다. 스레드에 묶어 두는 정보라서, 스레드가 다음 요청에 재사용되기 전에 지워야 합니다.', '');
    if (res === 200 && c.path !== 'public') sum.push('응답은 ' + resp + '입니다. ' + (res === 200 ? '필터 체인을 통과해 컨트롤러가 실행됐습니다.' : '컨트롤러는 실행되지 않았고 ' + end + '가 응답을 만들었습니다.'));
    if (res === 401) sum.push('401은 "누구인지 확인되지 않았다"(인증 실패)입니다. 토큰 없이 관리자 경로를 요청해도 403이 아니라 401인 이유는, 누구인지 모르는 상태에서는 권한을 따질 수 없기 때문입니다.');
    if (res === 403) sum.push('403은 "누구인지는 알지만 이 일을 할 권한이 없다"(인가 실패)입니다. 다시 로그인해도 결과가 같습니다.');
    if (res !== 200) sum.push('이 응답은 DispatcherServlet에 닿기 전에 필터에서 만들어지므로 @ControllerAdvice로는 바꿀 수 없습니다. 응답 형식을 바꾸려면 AuthenticationEntryPoint와 AccessDeniedHandler를 직접 등록합니다.');
    if (res === 200 && c.path === 'public') sum.push('permitAll은 필터 체인을 건너뛰는 것이 아니라, 필터를 다 거치되 인가 단계에서 누구든 통과시키는 것입니다.');
    return { events: ev, summary: sum, row: [resp, authed ? '예' : '아니오', end, res === 200 ? '실행됨' : '실행 안 됨'] };
  },
  STAGES: [['IN', '요청 진입'], ['JWT', 'JwtAuthenticationFilter (인증: 누구인가)'], ['ANON', 'AnonymousAuthenticationFilter'], ['ETF', 'ExceptionTranslationFilter (401/403으로 변환)'], ['AUTHZ', 'AuthorizationFilter (인가: 들어와도 되는가)'], ['CTL', 'DispatcherServlet → 컨트롤러'], ['OUT', '응답']],
  render: function (v, sim, t, H, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : { seen: [], cur: null, ctx: '비어 있음', resp: '' }, done = shown.length === sim.events.length;
    var bads = shown.filter(function (e) { return e.snap.bad; }).map(function (e) { return e.snap.bad; });
    H.table(v, ['필터 체인 (위에서 아래 순서로 배치됨)', '상태'], this.STAGES.map(function (st) { var id = st[0], seen = s.seen.indexOf(id) >= 0; return { cls: !seen && done ? 'gone' : '', cells: [st[1], { v: id === s.cur ? '지금 여기' : seen ? (bads.indexOf(id) >= 0 ? '여기서 막힘' : '지나감') : done ? '거치지 않음' : '', cls: id === s.cur ? 'hot' : bads.indexOf(id) >= 0 ? 'bad' : seen ? 'good' : '' }] }; }));
    H.text(v, 'ExceptionTranslationFilter는 AuthorizationFilter보다 앞에 있어서, 뒤에서 던진 예외를 받아 처리합니다.');
  },
  // 그림: 필터들이 위에서 아래로 늘어선 통로. 요청이 어디까지 들어갔다가 어디서 막혔는지를 색으로 보인다.
  draw: function (P, sim, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : { seen: [], cur: null, ctx: '비어 있음', resp: '' }, bads = shown.filter(function (e) { return e.snap.bad; }).map(function (e) { return e.snap.bad; });
    P.size(680, 330);
    P.region('chain', 16, 16, 440, 298, '필터 체인 (위에서 아래로 지나감)');
    this.STAGES.forEach(function (st, i) { var id = st[0], seen = s.seen.indexOf(id) >= 0, blocked = bads.indexOf(id) >= 0; P.box('st_' + id, 26, 50 + i * 37, 420, 30, { cls: id === s.cur ? 'hot now' : blocked ? 'bad' : seen ? 'good' : 'ghost', title: st[1], right: blocked ? '막힘' : '' }); });
    P.box('ctx', 472, 50, 192, 64, { cls: s.ctx === '비어 있음' || s.ctx === '비워짐' ? 'ghost' : 'good', title: 'SecurityContext', sub: ['들어 있는 것:', s.ctx] });
    P.box('resp', 472, 130, 192, 64, { cls: !s.resp ? 'ghost' : /^2/.test(s.resp) ? 'good' : 'bad', title: '응답', sub: [s.resp || '처리 중', ' '] });
    P.note('초록은 지나간 필터, 노랑은 지금 있는 곳, 빨강은 요청이 막힌 곳, 점선은 거치지 않은 곳입니다.');
  },
  assume: '세션을 쓰지 않는 JWT 방식의 일반적인 구성을 가정했습니다. 직접 만든 JwtAuthenticationFilter는 토큰이 없거나 잘못된 경우 거절하지 않고 넘긴다고 보았습니다(잘못된 토큰이면 이 필터에서 바로 401을 내도록 구현하기도 합니다). 열두 가지 조합 모두를 실제 스프링 부트 4.1.1과 스프링 시큐리티 7.1.1 서버에 HTTP 요청을 보내, 응답 코드와 응답을 만든 곳(AuthenticationEntryPoint, AccessDeniedHandler), 컨트롤러 실행 여부가 화면과 일치하는 것을 확인했습니다. 이때 두 가지를 알게 됐습니다. 첫째, 인증 실패 때의 응답을 정하지 않으면(exceptionHandling 설정이 없으면) 토큰 없는 요청에 401이 아니라 403이 돌아옵니다. 그래서 화면의 코드에 exceptionHandling 설정을 넣었습니다. 둘째, 권한 부족을 스프링 시큐리티의 기본 처리기에 맡기면 USER가 관리자 경로를 요청했을 때 403이 아니라 401이 돌아왔습니다. 기본 처리기가 오류 페이지(/error)로 요청을 다시 넘기는데, 그 요청에는 인증 정보가 없어 다시 인증 실패로 처리되기 때문입니다. 화면처럼 403이 나오게 하려면 처리기에서 상태 코드를 직접 응답하거나 /error 경로를 허용해야 합니다. 실제 체인에는 여기 적지 않은 필터가 더 있습니다.',
});

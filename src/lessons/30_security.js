Lab.register({
  id: 'security', nav: '시큐리티 필터 체인', cat: '인증', mode: 'step',
  title: '401과 403은 어디에서 갈리나',
  why: '컨트롤러마다 로그인 여부와 권한을 확인하는 코드를 직접 넣으면, 한 곳만 빠뜨려도 그 경로가 열린다. Spring Security는 이 확인을 컨트롤러 앞의 필터 단계로 모아, 경로별 규칙을 설정 한 곳에 적어 두면 모든 요청에 같은 방식으로 적용되게 한다.',
  use: '로그인이 필요한 웹 서비스와 API 서버에서 쓴다. JWT로 사용자를 확인하는 API 서버는 oauth2ResourceServer 설정 한 줄로 토큰 확인 필터를 켜고, 관리자 경로에는 ADMIN 권한만 통과시키는 규칙을 authorizeHttpRequests에 적는다. 컨트롤러 메서드 단위로 권한을 따질 때는 @PreAuthorize 같은 애너테이션을 함께 쓴다.',
  intro: '스프링 시큐리티는 컨트롤러 앞에 놓인 필터들의 줄입니다. 앞쪽 필터가 "누구인지"를 확인해 SecurityContext에 적어 두고, 뒤쪽 필터가 "이 경로에 들어와도 되는지"를 판단합니다. JWT를 쓰는 API 서버라면 스프링 시큐리티가 주는 oauth2ResourceServer 설정이 토큰 확인 필터(BearerTokenAuthenticationFilter)와 401·403 응답을 만드는 부품을 함께 넣어 줍니다. 누구인지 확인되지 않았으면 401, 누구인지는 알지만 권한이 없으면 403입니다. 토큰과 경로에 따라 요청이 어디에서 막히고 어떤 응답으로 끝나는지 봅니다.',
  terms: ['인증과 인가', 'Spring Security와 SecurityFilterChain', 'OAuth2 리소스 서버(oauth2ResourceServer)', 'SecurityContext', '필터(Filter)', 'AuthenticationEntryPoint와 AccessDeniedHandler', 'HTTP 상태 코드'], ranks: ['auth', 'websec', 'filter'],
  controls: [
    { id: 'who', label: '요청에 실린 토큰', type: 'select', value: 'none', options: [['none', '토큰 없음'], ['bad', '위조된 토큰 (내용을 고침)'], ['user', '유효한 토큰 (role: USER)'], ['admin', '유효한 토큰 (role: ADMIN)']] },
    { id: 'path', label: '요청 경로', type: 'select', value: 'orders', options: [['public', 'GET /public/notice (누구나 허용)'], ['orders', 'GET /orders (로그인 필요)'], ['admin', 'GET /admin/users (ADMIN 권한 필요)']] },
  ],
  presets: [
    { t: '처음 설정으로', q: '토큰 없이 로그인이 필요한 경로 GET /orders를 요청하면 어디에서 끝나나', d: '토큰 없이 로그인이 필요한 경로를 요청합니다. 401.', v: { who: 'none', path: 'orders' } },
    { t: '유효한 토큰으로', q: 'role이 USER인 유효한 토큰을 실어 GET /orders를 요청하면', d: '컨트롤러까지 도달합니다.', v: { who: 'user', path: 'orders' } },
    { t: 'USER가 관리자 경로를 요청', q: 'role이 USER인 유효한 토큰으로 GET /admin/users를 요청하면', d: '누구인지는 알지만 권한이 없습니다. 403.', v: { who: 'user', path: 'admin' } },
    { t: 'ADMIN이 관리자 경로를 요청', q: 'role이 ADMIN인 유효한 토큰으로 GET /admin/users를 요청하면', d: '통과합니다.', v: { who: 'admin', path: 'admin' } },
    { t: '토큰 없이 관리자 경로', q: '토큰 없이 GET /admin/users를 요청하면', d: '403이 아니라 401입니다. 왜 그런지 보세요.', v: { who: 'none', path: 'admin' } },
    { t: '위조된 토큰으로 누구나 허용된 경로', q: '위조된 토큰을 실어 누구나 허용된 경로 GET /public/notice를 요청하면', d: 'permitAll 경로인데도 401입니다.', v: { who: 'bad', path: 'public' } },
    { t: '토큰 없이 누구나 허용된 경로', q: '토큰 없이 누구나 허용된 경로 GET /public/notice를 요청하면', d: '토큰이 없어도 통과합니다.', v: { who: 'none', path: 'public' } },
  ],
  code: function () {
    return '// 설정 클래스 본문만 보임 (@Configuration 클래스 선언과 import는 생략)\n' +
      '// oauth2ResourceServer, JwtDecoder, NimbusJwtDecoder, JwtAuthenticationConverter,\n' +
      '// JwtGrantedAuthoritiesConverter는 Spring Security(spring-boot-starter-oauth2-resource-server)가 주는 것이다.\n' +
      '@Bean\n' +
      'SecurityFilterChain filterChain(HttpSecurity http) throws Exception {\n' +
      '    return http\n' +
      '        .sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))\n' +
      '        .authorizeHttpRequests(auth -> auth\n' +
      '            .requestMatchers("/public/**").permitAll()\n' +
      '            .requestMatchers("/admin/**").hasRole("ADMIN")\n' +
      '            .anyRequest().authenticated())\n' +
      '        .oauth2ResourceServer(o -> o.jwt(Customizer.withDefaults()))   // BearerTokenAuthenticationFilter를 넣는다\n' +
      '        .build();\n' +
      '}\n\n' +
      '@Bean   // 토큰의 서명을 확인할 디코더 (HS256, 키는 32바이트 이상)\n' +
      'JwtDecoder jwtDecoder(@Value("${app.jwt.secret}") String secret) {   // app.jwt.secret은 예시로 정한 설정 이름\n' +
      '    SecretKey key = new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), "HmacSHA256");\n' +
      '    return NimbusJwtDecoder.withSecretKey(key).build();\n' +
      '}\n\n' +
      '@Bean   // 토큰의 role 클레임("USER")을 권한 ROLE_USER로 바꾼다 (기본은 scope 클레임을 SCOPE_ 권한으로)\n' +
      'JwtAuthenticationConverter jwtAuthenticationConverter() {\n' +
      '    JwtGrantedAuthoritiesConverter roles = new JwtGrantedAuthoritiesConverter();\n' +
      '    roles.setAuthoritiesClaimName("role");\n' +
      '    roles.setAuthorityPrefix("ROLE_");\n' +
      '    JwtAuthenticationConverter converter = new JwtAuthenticationConverter();\n' +
      '    converter.setJwtGrantedAuthoritiesConverter(roles);\n' +
      '    return converter;\n' +
      '}\n\n' +
      '// 401·403 응답은 oauth2ResourceServer가 기본으로 등록하는 BearerTokenAuthenticationEntryPoint와\n' +
      '// BearerTokenAccessDeniedHandler가 만든다(exceptionHandling을 따로 적지 않아도 된다).';
  },
  label: function (c) { return { none: '토큰 없음', bad: '위조된 토큰', user: 'USER 토큰', admin: 'ADMIN 토큰' }[c.who] + ' · ' + { public: '/public/notice', orders: '/orders', admin: '/admin/users' }[c.path]; },
  columns: ['응답', '인증됐나', '끝난 지점', '컨트롤러 실행'],
  result: function (c) {
    var authed = c.who === 'user' || c.who === 'admin';
    if (c.who === 'bad') return 401;          // 토큰 확인 필터에서 바로 끝난다 (경로와 상관없음)
    if (c.path === 'public') return 200;
    if (!authed) return 401;
    if (c.path === 'admin' && c.who !== 'admin') return 403;
    return 200;
  },
  simulate: function (c) {
    var ev = [], seen = [], ctx = '비어 있음', resp = '', res = this.result(c), authed = c.who === 'user' || c.who === 'admin', sum = [], end = '';
    var req = { public: 'GET /public/notice', orders: 'GET /orders', admin: 'GET /admin/users' }[c.path], role = c.who === 'admin' ? 'ADMIN' : 'USER';
    function push(id, s, k) { seen.push(id); ev.push({ s: s, k: k, snap: { seen: seen.slice(), cur: id, ctx: ctx, resp: resp, bad: k === 'bad' ? id : null } }); }
    push('IN', req + ' 요청이 들어와 시큐리티 필터 체인에 진입합니다. 컨트롤러보다 앞, 서블릿 필터 단계입니다.', '');
    if (c.who === 'none') push('BEARER', 'BearerTokenAuthenticationFilter: Authorization 헤더에 Bearer 토큰이 없습니다. 아무것도 하지 않고 다음 필터로 넘깁니다. 여기서 바로 거절하지 않는 이유는, 인증이 필요 없는 경로일 수도 있기 때문입니다.', '');
    if (c.who === 'bad') {
      resp = '401 Unauthorized'; end = 'AuthenticationEntryPoint (토큰 확인 필터에서)';
      push('BEARER', 'BearerTokenAuthenticationFilter: 토큰을 JwtDecoder.decode로 확인했더니 서명이 맞지 않아 BadJwtException이 났습니다. 이 필터는 다음 필터로 넘기지 않고, 그 자리에서 AuthenticationEntryPoint(BearerTokenAuthenticationEntryPoint)를 불러 401로 답합니다. 응답 헤더 WWW-Authenticate에는 error="invalid_token"과 실패 이유가 실립니다. 요청 경로가 무엇인지는 보지 않습니다.', 'bad');
    }
    if (authed) { ctx = 'JwtAuthenticationToken · 회원 7 · ROLE_' + role; push('BEARER', 'BearerTokenAuthenticationFilter: JwtDecoder.decode로 서명과 만료 시각을 확인했습니다. 등록해 둔 JwtAuthenticationConverter가 role 클레임으로 권한 ROLE_' + role + (role === 'ADMIN' ? '을' : '를') + ' 만들고, 회원 7의 JwtAuthenticationToken을 SecurityContext에 둡니다. 이 요청을 처리하는 동안 어디서든 "지금 사용자가 누구인지" 꺼내 볼 수 있습니다.', 'good'); }
    if (c.who === 'none') { ctx = '익명 사용자 (인증 안 됨)'; push('ANON', 'AnonymousAuthenticationFilter: 여기까지 인증 정보가 없으면 "익명 사용자"로 표시해 둡니다.', ''); }
    var rule = { public: 'permitAll (누구나 허용)', orders: 'authenticated (인증된 사용자만)', admin: 'hasRole("ADMIN") (ADMIN 권한만)' }[c.path];
    if (c.who !== 'bad') {
      if (res === 200) {
        push('AUTHZ', 'AuthorizationFilter: 이 경로의 규칙은 ' + rule + '입니다. ' + (c.path === 'public' ? '누구든 통과합니다.' : c.path === 'orders' ? 'SecurityContext에 인증된 사용자가 있으므로 통과합니다.' : 'SecurityContext의 권한에 ROLE_ADMIN이 있으므로 통과합니다.'), 'good');
        resp = '200 OK'; end = '컨트롤러'; push('CTL', '필터 체인을 모두 통과해 DispatcherServlet과 컨트롤러에 도달합니다.' + (authed ? ' 컨트롤러는 @AuthenticationPrincipal Jwt jwt 매개변수로 토큰의 클레임을 받아 쓸 수 있습니다.' : ''), 'good');
      } else {
        push('AUTHZ', 'AuthorizationFilter: 이 경로의 규칙은 ' + rule + '입니다. ' + (authed ? '현재 사용자의 권한은 ROLE_USER라서 조건에 맞지 않습니다.' : '현재 사용자는 익명이라 조건에 맞지 않습니다.') + ' 접근 거부 예외(AccessDeniedException)를 던집니다.', 'bad');
        if (res === 401) { resp = '401 Unauthorized'; end = 'AuthenticationEntryPoint'; push('ETF', 'ExceptionTranslationFilter: 예외를 받아 사용자를 확인합니다. 익명 사용자이므로 "권한이 없다"가 아니라 "누구인지부터 밝혀라"로 판단하고, AuthenticationEntryPoint를 호출합니다. oauth2ResourceServer가 등록해 둔 BearerTokenAuthenticationEntryPoint가 401과 WWW-Authenticate: Bearer 헤더로 응답합니다.', 'bad'); }
        else { resp = '403 Forbidden'; end = 'AccessDeniedHandler'; push('ETF', 'ExceptionTranslationFilter: 예외를 받아 사용자를 확인합니다. 인증된 사용자인데 권한이 모자란 것이므로 AccessDeniedHandler를 호출합니다. oauth2ResourceServer가 등록해 둔 BearerTokenAccessDeniedHandler가 403과 WWW-Authenticate: Bearer error="insufficient_scope" 헤더로 응답합니다.', 'bad'); }
      }
    }
    ctx = '비워짐'; push('OUT', '응답이 나가고, 이 요청에 쓰인 SecurityContext는 비워집니다. 스레드에 묶어 두는 정보라서, 스레드가 다음 요청에 재사용되기 전에 지워야 합니다.', '');
    if (res === 200 && c.path !== 'public') sum.push('응답은 200 OK입니다. 필터 체인을 통과해 컨트롤러가 실행됐습니다.');
    if (res === 200 && c.path === 'public') sum.push('permitAll은 필터 체인을 건너뛰는 것이 아니라, 필터를 다 거치되 인가 단계에서 누구든 통과시키는 것입니다.');
    if (res === 401 && c.who === 'none') sum.push('401은 "누구인지 확인되지 않았다"(인증 실패)입니다. 토큰 없이 관리자 경로를 요청해도 403이 아니라 401인 이유는, ExceptionTranslationFilter가 익명 사용자의 접근 거부를 "누구인지부터 밝혀라"로 바꾸기 때문입니다. 이때 쓸 진입점을 oauth2ResourceServer가 BearerTokenAuthenticationEntryPoint로 등록해 두므로, exceptionHandling을 따로 적지 않아도 401이 나옵니다.');
    if (c.who === 'bad') sum.push('토큰을 실어 보냈는데 틀리면 BearerTokenAuthenticationFilter가 그 자리에서 401로 끝냅니다. 그래서 permitAll 경로라도 위조되거나 만료된 토큰을 실으면 401이고, 토큰을 아예 빼면 통과합니다. 토큰 확인 필터를 직접 만들어 틀린 토큰을 거절하지 않고 넘기게 짜면 이 요청은 200이 됩니다(검증 실행에서 확인). 표준 필터는 "토큰을 냈는데 틀렸다"를 그냥 넘기지 않습니다.');
    if (res === 403) sum.push('403은 "누구인지는 알지만 이 일을 할 권한이 없다"(인가 실패)입니다. BearerTokenAccessDeniedHandler는 상태 코드 403을 직접 써서 응답하므로 오류 페이지로 다시 넘어가지 않습니다. 다시 로그인해도 결과가 같습니다.');
    if (res !== 200) sum.push('이 응답은 DispatcherServlet에 닿기 전에 필터에서 만들어지므로 @ControllerAdvice로는 바꿀 수 없습니다. 응답 형식을 바꾸려면 oauth2ResourceServer(o -> o.authenticationEntryPoint(…).accessDeniedHandler(…))로 다른 구현을 넘깁니다.');
    return { events: ev, summary: sum, row: [resp, authed ? '예' : '아니오', end, res === 200 ? '실행됨' : '실행 안 됨'] };
  },
  STAGES: [['IN', '요청 진입'], ['BEARER', 'BearerTokenAuthenticationFilter (인증: 누구인가)'], ['ANON', 'AnonymousAuthenticationFilter'], ['ETF', 'ExceptionTranslationFilter (401/403으로 변환)'], ['AUTHZ', 'AuthorizationFilter (인가: 들어와도 되는가)'], ['CTL', 'DispatcherServlet → 컨트롤러'], ['OUT', '응답']],
  render: function (v, sim, t, H, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : { seen: [], cur: null, ctx: '비어 있음', resp: '' }, done = shown.length === sim.events.length;
    var bads = shown.filter(function (e) { return e.snap.bad; }).map(function (e) { return e.snap.bad; });
    var etfWaits = s.seen.indexOf('AUTHZ') >= 0 && s.seen.indexOf('OUT') < 0;
    H.table(v, ['필터 체인 (위에서 아래 순서로 배치됨)', '상태'], this.STAGES.map(function (st) { var id = st[0], seen = s.seen.indexOf(id) >= 0, waitEtf = id === 'ETF' && !seen && etfWaits; return { cls: !seen && done ? 'gone' : '', cells: [st[1], { v: id === s.cur ? '지금 여기' : seen ? (bads.indexOf(id) >= 0 ? (id === 'ETF' ? '예외를 받아 ' + s.resp + ' 응답을 만듦' : id === 'BEARER' ? '여기서 401 응답을 만듦' : '여기서 막힘') : '지나감') : waitEtf ? '지나왔고, 뒤에서 던질 예외를 기다림' : done ? '할 일 없이 지나갔거나 도달 안 함' : '', cls: id === s.cur ? 'hot' : bads.indexOf(id) >= 0 ? 'bad' : seen ? 'good' : '' }] }; }));
    H.text(v, 'ExceptionTranslationFilter는 AuthorizationFilter보다 앞에 있어서, 뒤에서 던진 예외를 받아 처리합니다. 토큰이 틀린 요청은 그보다 앞의 BearerTokenAuthenticationFilter에서 끝납니다.');
  },
  // 그림: 필터들이 위에서 아래로 늘어선 통로. 요청이 어디까지 들어갔다가 어디서 막혔는지를 색으로 보인다.
  draw: function (P, sim, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : { seen: [], cur: null, ctx: '비어 있음', resp: '' }, bads = shown.filter(function (e) { return e.snap.bad; }).map(function (e) { return e.snap.bad; });
    var etfWaits = s.seen.indexOf('AUTHZ') >= 0 && s.seen.indexOf('OUT') < 0;
    P.size(680, 330);
    P.region('chain', 16, 16, 440, 298, '필터 체인 (위에서 아래로 지나감)');
    this.STAGES.forEach(function (st, i) { var id = st[0], seen = s.seen.indexOf(id) >= 0, blocked = bads.indexOf(id) >= 0, waitEtf = id === 'ETF' && !seen && etfWaits; P.box('st_' + id, 26, 50 + i * 37, 420, 30, { cls: id === s.cur ? 'hot now' : blocked ? 'bad' : seen ? 'good' : waitEtf ? 'wait' : 'ghost', title: st[1], right: blocked ? (id === 'AUTHZ' ? '막힘' : '응답') : waitEtf ? '대기' : '' }); });
    P.box('ctx', 472, 50, 192, 64, { cls: s.ctx === '비어 있음' || s.ctx === '비워짐' ? 'ghost' : s.ctx.indexOf('익명') === 0 ? 'plain' : 'good', title: 'SecurityContext', sub: ['인증 정보:', s.ctx.replace('JwtAuthenticationToken · ', '')] });
    P.box('resp', 472, 130, 192, 64, { cls: !s.resp ? 'ghost' : /^2/.test(s.resp) ? 'good' : 'bad', title: '응답', sub: [s.resp || '처리 중', ' '] });
    P.note('초록은 지나간 필터, 노랑은 지금 있는 곳, 빨강은 요청이 막힌 곳과 401·403 응답을 만든 곳, 파랑은 이미 지나왔지만 뒤에서 던질 예외를 받으려고 기다리는 필터, 점선은 할 일 없이 지나갔거나 도달하지 않은 곳입니다. SecurityContext 상자는 인증된 사용자가 있으면 초록, 익명 사용자이면 흰색입니다.');
  },
  assume: '세션을 쓰지 않는 JWT API 서버에서 스프링 시큐리티의 oauth2ResourceServer와 HS256 JwtDecoder를 쓰는 구성을 가정했습니다. 열두 가지 조합을 실제 스프링 부트 4.1.1과 스프링 시큐리티 7.1.1 서버에 HTTP 요청으로 보내, 응답 코드와 응답을 만든 곳, 컨트롤러 실행 여부가 화면과 같은 것을 확인했습니다. 이때 authorizeHttpRequests, AnonymousAuthenticationFilter, ExceptionTranslationFilter, AuthorizationFilter는 실제 스프링 시큐리티가 돌았습니다. 다만 검증 실행 환경에 spring-security-oauth2-resource-server와 oauth2-jose가 없어서, oauth2ResourceServer가 넣는 세 부품(BearerTokenAuthenticationFilter, BearerTokenAuthenticationEntryPoint, BearerTokenAccessDeniedHandler)은 7.1.1 공식 소스에서 동작만 옮긴 대역으로 바꿔 끼웠고, 그 자리(BasicAuthenticationFilter 바로 앞)와 기본 등록 방식, 틀린 토큰이면 경로와 상관없이 그 자리에서 401로 끝낸다는 것, 403 처리기가 상태 코드를 직접 쓴다는 것은 소스와 대조했습니다. 토큰은 "JWT의 구조와 검증" 실습의 값이고 서명은 실제로 계산해 확인했습니다. 화면의 설정 코드는 공식 시그니처만 옮긴 대역과 함께 javac로 컴파일되는 것을 확인했습니다. 7.0부터 JwtAuthenticationConverter는 role에서 만든 권한 말고도 FACTOR_BEARER라는 권한을 하나 더 붙이지만, 이 실습의 규칙에는 영향이 없습니다. 실제 체인에는 여기 적지 않은 필터가 더 있습니다.',
});

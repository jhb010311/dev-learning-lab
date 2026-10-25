Lab.register({
  id: 'auth', nav: '세션과 JWT', cat: '인증', mode: 'step',
  title: '로그인 상태는 어디에 저장되나',
  why: 'HTTP 요청은 앞선 요청을 모르므로, 요청마다 비밀번호를 다시 보내지 않으려면 "이미 로그인한 사용자"임을 알릴 표시가 필요하다. 세션은 서버가 로그인 기록을 저장해 두고 세션 ID로 찾아 이 문제를 풀고, JWT는 서버가 서명한 토큰을 검증만 하면 되게 해서 서버가 여러 대여도 로그인 기록을 함께 볼 저장소 없이 사용자를 확인하게 한다.',
  use: '서버가 화면을 만들어 보내는 웹 서비스는 세션을 흔히 쓰고, 서버가 여러 대이면 Redis 같은 공용 저장소에 세션을 둔다. 모바일 앱이나 여러 서비스가 같은 로그인을 확인해야 하는 API에서는 JWT를 흔히 쓰며, 이미 발급한 토큰은 만료 전에 무효로 만들기 어려우므로 액세스 토큰을 짧게 두고 리프레시 토큰으로 다시 발급한다. 스프링 서버에서는 Spring Security가 주는 JwtEncoder(NimbusJwtEncoder)로 토큰을 발급하고, OAuth2 리소스 서버 설정(oauth2ResourceServer)이 JwtDecoder(NimbusJwtDecoder)로 요청마다 서명과 만료 시각을 검사한다.',
  intro: '로그인한 사용자가 10분 간격으로 요청을 보내고, 로드밸런서가 요청을 서버에 돌아가며 나눠 줍니다. 로그인 상태를 서버가 기억하는 방식(세션)과 클라이언트가 들고 다니는 방식(JWT)에서, 서버를 늘리거나 강제 로그아웃을 시킬 때 무슨 일이 생기는지 보세요.',
  terms: ['쿠키', '세션', 'JWT(JSON Web Token)', 'JwtEncoder와 NimbusJwtEncoder', 'JwtDecoder와 NimbusJwtDecoder', '액세스 토큰과 리프레시 토큰', 'HTTP와 무상태(Stateless)'], ranks: ['auth', 'http'],
  controls: [
    { id: 'mode', label: '인증 방식', type: 'select', value: 'local', options: [['local', '세션 (각 서버 메모리에 저장)'], ['redis', '세션 (공용 저장소 Redis에 저장)'], ['jwt', 'JWT (액세스 토큰만)'], ['refresh', 'JWT (액세스 토큰 + 리프레시 토큰)']] },
    { id: 'servers', label: '서버 수', type: 'range', min: 1, max: 3, value: 2, fmt: function (v) { return v + '대'; } },
    { id: 'exp', label: '액세스 토큰 만료 시간', type: 'select', value: '25', options: [['15', '15분'], ['25', '25분'], ['45', '45분']], show: function (c) { return c.mode === 'jwt' || c.mode === 'refresh'; } },
    { id: 'kick', label: '25분에 관리자가 이 사용자를 강제 로그아웃시킨다', type: 'check', value: false },
  ],
  presets: [
    { t: '처음 설정으로', q: '각 서버 메모리에 세션을 저장하는 서버 2대를 쓰면 로그인 상태는 어떻게 되나', d: '서버 메모리 세션, 서버 2대. 다른 서버로 간 요청은 로그인이 풀립니다.', v: { mode: 'local', servers: 2, exp: '25', kick: false } },
    { t: '세션을 Redis로 옮기면', q: '세션을 각 서버 메모리 대신 Redis 공용 저장소에 저장하면', d: '어느 서버로 가도 로그인이 유지됩니다. 대신 요청마다 저장소를 조회합니다.', v: { mode: 'redis', servers: 2, exp: '25', kick: false } },
    { t: 'JWT로 바꾸면', q: '액세스 토큰만 쓰는 JWT로 인증하면', d: '서버는 아무것도 기억하지 않습니다. 25분 뒤 토큰이 만료됩니다.', v: { mode: 'jwt', servers: 2, exp: '25', kick: false } },
    { t: 'JWT인데 강제 로그아웃', q: '액세스 토큰만 쓰는 JWT에서 만료 시간을 45분으로 하고 25분에 관리자가 강제 로그아웃시키면', d: '이미 발급한 토큰은 만료 전까지 막을 방법이 없습니다.', v: { mode: 'jwt', servers: 2, exp: '45', kick: true } },
    { t: '세션인데 강제 로그아웃', q: 'Redis 공용 저장소 세션에서 25분에 관리자가 강제 로그아웃시키면', d: '저장소에서 세션을 지우면 바로 다음 요청부터 막힙니다.', v: { mode: 'redis', servers: 2, exp: '25', kick: true } },
    { t: '짧은 액세스 토큰 + 리프레시 토큰', q: '리프레시 토큰을 함께 쓰는 JWT로 바꾸고 액세스 토큰 만료 시간을 15분으로 줄인 채 25분에 관리자가 강제 로그아웃시키면', d: '15분마다 재발급합니다. 강제 로그아웃이 늦어도 15분 안에 먹힙니다.', v: { mode: 'refresh', servers: 2, exp: '15', kick: true } },
  ],
  code: function (c) {
    if (c.mode === 'local' || c.mode === 'redis') return (c.mode === 'redis' ? '// spring-session-data-redis 의존성을 추가하면\n// 세션이 서버 메모리 대신 Redis에 저장된다\n\n' : '') + '// 필요한 부분만 남김 (로그인 처리와 이후 요청 처리는 서로 다른 메서드)\n\n// 로그인 성공 시\nHttpSession session = request.getSession();\nsession.setAttribute("memberId", member.getId());\n// 응답 헤더: Set-Cookie: JSESSIONID=abc123; HttpOnly\n\n// 이후 요청마다: 쿠키의 세션 ID로 세션을 찾는다\nHttpSession session = request.getSession(false);\nif (session == null) {\n    throw new ResponseStatusException(HttpStatus.UNAUTHORIZED);   // 스프링이 주는 예외 -> 401 응답\n}';
    return '// 필요한 부분만 남김 (로그인 처리와 이후 요청 처리는 서로 다른 메서드. 클래스 선언, import, serverKey·memberId·token의 선언은 생략)\n// JwtEncoder, NimbusJwtEncoder, JwtClaimsSet, JwsHeader, MacAlgorithm, JwtEncoderParameters,\n// JwtDecoder, NimbusJwtDecoder, Jwt는 Spring Security(spring-security-oauth2-jose)가 주는 것이다.\nSecretKey key = new SecretKeySpec(serverKey, "HmacSHA256");      // 서버만 아는 키 (서명과 검증에 같은 키)\nJwtEncoder encoder = NimbusJwtEncoder.withSecretKey(key).build();\nJwtDecoder decoder = NimbusJwtDecoder.withSecretKey(key).build();\n\n' +
      '// 로그인 성공 시: 서명한 토큰을 만들어 응답으로 준다\nInstant now = Instant.now();\nJwtClaimsSet claims = JwtClaimsSet.builder()\n    .subject(memberId)\n    .issuedAt(now)\n    .expiresAt(now.plus(Duration.ofMinutes(' + c.exp + ')))   // 만료: 지금부터 ' + c.exp + '분 뒤\n    .build();\nJwsHeader header = JwsHeader.with(MacAlgorithm.HS256).build();\nString access = encoder.encode(JwtEncoderParameters.from(header, claims)).getTokenValue();\n' + (c.mode === 'refresh' ? '// createRefreshToken은 예시로 만든 메서드 (14일짜리 토큰을 만들고 서버 저장소에도 저장)\nString refresh = createRefreshToken();\n' : '') +
      '\n// 이후 요청마다: 서명과 만료만 확인한다 (저장소 조회 없음)\nJwt jwt = decoder.decode(token);      // 서명이 틀리거나 만료됐으면 예외 -> 401\nString userId = jwt.getSubject();' + (c.mode === 'refresh' ? '\n\n// 401을 받으면 클라이언트가 리프레시 토큰으로 재발급 요청\n// 서버는 저장소에서 리프레시 토큰이 유효한지 확인한다' : '') +
      '\n\n// 스프링 부트 서버에서는 decode를 직접 부르지 않는다. decoder를 빈으로 등록하고\n// http.oauth2ResourceServer(o -> o.jwt(Customizer.withDefaults()))를 켜 두면\n// BearerTokenAuthenticationFilter가 요청마다 decode를 부르고, 예외가 나면 401로 답한다.';
  },
  label: function (c) { return { local: '서버 메모리 세션', redis: 'Redis 세션', jwt: 'JWT ' + c.exp + '분', refresh: 'JWT ' + c.exp + '분 + 리프레시' }[c.mode] + ' · 서버 ' + c.servers + '대' + (c.kick ? ' · 강제 로그아웃' : ''); },
  columns: ['성공한 요청', '401 응답', '공용 저장소 접근', '강제 로그아웃 뒤 통과한 요청'],
  simulate: function (c) {
    var S = c.servers, M = c.mode, exp = +c.exp, ev = [], rows = [], ok = 0, fail = 0, look = 0, leaked = 0, kicked = false, loggedOut = false;
    var local = [], redis = null, refreshStore = null, client = {}, accessExp = null;
    for (var i = 0; i < S; i++) local.push(null);
    function srvText(i) { return M === 'local' ? (local[i] ? '세션 abc123 → 회원 7' : '세션 없음') : M === 'redis' ? '기억하는 것 없음 (Redis에 물어봄)' : '기억하는 것 없음 (서명 검증용 키만 보유)'; }
    function snap(hot) { var sv = []; for (var i = 0; i < S; i++) sv.push(srvText(i)); return { sv: sv, hot: hot, shared: M === 'redis' ? (redis ? '세션 abc123 → 회원 7' : '비어 있음') : M === 'refresh' ? (refreshStore ? '리프레시 토큰 r-001 → 회원 7' : '비어 있음') : null, client: M === 'local' || M === 'redis' ? (client.cookie ? '쿠키 JSESSIONID=abc123' : '없음') : (client.access ? '액세스 토큰 (' + accessExp + '분에 만료)' + (M === 'refresh' ? ' + 리프레시 토큰 r-001' : '') : '없음'), rows: rows.slice(), ok: ok, fail: fail, look: look }; }
    function push(s, k, hot) { ev.push({ s: s, k: k, snap: snap(hot) }); }
    function row(t, srv, what, res, cls) { rows.push({ cells: [t + '분', srv, what, { v: res, cls: cls }] }); }
    // 0분: 로그인 (서버 1)
    if (M === 'local') { local[0] = 1; client.cookie = 1; row(0, '서버 1', '아이디·비밀번호', '로그인 성공, 세션 생성', 'good'); push('0분: 서버 1에서 로그인했습니다. 서버 1이 자기 메모리에 세션을 만들고, 세션 ID를 쿠키로 내려 줍니다. 서버 1만 이 사용자를 기억합니다.', '', 0); }
    if (M === 'redis') { redis = 1; client.cookie = 1; look++; row(0, '서버 1', '아이디·비밀번호', '로그인 성공, 세션 생성', 'good'); push('0분: 서버 1에서 로그인했습니다. 세션은 서버 메모리가 아니라 모든 서버가 함께 쓰는 Redis에 저장되고, 세션 ID를 쿠키로 내려 줍니다.', '', 0); }
    if (M === 'jwt' || M === 'refresh') { client.access = 1; accessExp = exp; if (M === 'refresh') { refreshStore = 1; look++; } row(0, '서버 1', '아이디·비밀번호', '로그인 성공, 토큰 발급', 'good'); push('0분: 서버 1에서 로그인했습니다. 서버는 JwtEncoder로 회원 번호(sub)와 만료 시각(exp, ' + exp + '분)을 적고 서명한 액세스 토큰을 내려 줍니다. 서버 쪽에는 세션을 남기지 않습니다.' + (M === 'refresh' ? ' 리프레시 토큰도 함께 발급하고, 이것만 저장소에 기록합니다.' : ''), '', 0); }
    [10, 20, 30, 40, 50].forEach(function (t, j) {
      var si = (j + 1) % S, name = '서버 ' + (si + 1);
      if (c.kick && !kicked && t > 25) {
        kicked = true;
        if (M === 'local') { for (var i = 0; i < S; i++) local[i] = null; push('25분: 관리자가 강제 로그아웃시켰습니다. 서버 메모리의 세션을 지웁니다.', '', -1); }
        if (M === 'redis') { redis = null; look++; push('25분: 관리자가 강제 로그아웃시켰습니다. Redis에서 세션을 지웁니다.', '', -1); }
        if (M === 'jwt') push('25분: 관리자가 강제 로그아웃시키려 합니다. 그런데 서버에는 지울 것이 없습니다. 토큰은 사용자 쪽에 있고, 서명과 만료 시각이 유효한 한 서버는 그 토큰을 믿습니다.', 'bad', -1);
        if (M === 'refresh') { refreshStore = null; look++; push('25분: 관리자가 강제 로그아웃시켰습니다. 저장소에서 리프레시 토큰을 지웁니다. 이미 나간 액세스 토큰은 회수할 수 없습니다.', '', -1); }
      }
      if (loggedOut) { row(t, name, '(없음)', '로그인 화면', ''); return; }
      if (M === 'local') {
        if (local[si]) { ok++; row(t, name, '쿠키 abc123', '200 성공', 'good'); push(t + '분: 요청이 ' + name + '로 갔습니다. 이 서버 메모리에 세션 abc123이 있어서 로그인 상태로 처리합니다.', 'good', si); }
        else { fail++; row(t, name, '쿠키 abc123', '401 로그인 필요', 'bad'); push(t + '분: 요청이 ' + name + '로 갔습니다. 쿠키로 세션 ID를 보냈지만 ' + (kicked ? '세션이 지워져서' : '이 서버 메모리에는 그런 세션이 없어서') + ' 로그인하지 않은 사용자로 취급합니다.', 'bad', si); }
      }
      if (M === 'redis') {
        look++;
        if (redis) { ok++; row(t, name, '쿠키 abc123', '200 성공', 'good'); push(t + '분: 요청이 ' + name + '로 갔습니다. 서버가 Redis에서 세션 abc123을 조회해 로그인 상태를 확인했습니다. 어느 서버로 가든 같은 저장소를 봅니다.', 'good', si); }
        else { fail++; row(t, name, '쿠키 abc123', '401 로그인 필요', 'bad'); push(t + '분: 요청이 ' + name + '로 갔습니다. Redis에 세션이 없으므로 바로 거절합니다. 강제 로그아웃이 다음 요청부터 즉시 적용됐습니다.', 'bad', si); }
      }
      if (M === 'jwt' || M === 'refresh') {
        if (t < accessExp) { ok++; if (kicked) leaked++; row(t, name, '액세스 토큰', '200 성공', kicked ? 'hot' : 'good'); push(t + '분: 요청이 ' + name + '로 갔습니다. JwtDecoder의 decode가 토큰의 서명과 만료 시각만 확인합니다. 저장소를 조회하지 않고 어느 서버에서나 통과합니다.' + (kicked ? ' 강제 로그아웃된 사용자인데도 토큰이 아직 유효해서 통과했습니다.' : ''), kicked ? 'bad' : 'good', si); }
        else if (M === 'jwt') { fail++; loggedOut = true; client.access = null; row(t, name, '액세스 토큰(만료)', '401 다시 로그인', 'bad'); push(t + '분: 요청이 ' + name + '로 갔습니다. 토큰의 만료 시각(' + accessExp + '분)이 지나 decode가 JwtValidationException을 던지고, 응답은 401입니다. 사용자는 다시 로그인해야 합니다.', 'bad', si); }
        else {
          fail++; row(t, name, '액세스 토큰(만료)', '401 토큰 만료', 'bad'); push(t + '분: 요청이 ' + name + '로 갔습니다. 액세스 토큰의 만료 시각(' + accessExp + '분)이 지나 decode가 예외를 던지고 401을 받았습니다. 클라이언트가 리프레시 토큰으로 재발급을 요청합니다.', '', si);
          look++;
          if (refreshStore) { accessExp = t + exp; ok++; row(t, name, '리프레시 토큰', '새 액세스 토큰 발급 → 재요청 성공', 'good'); push(t + '분: 서버가 저장소에서 리프레시 토큰 r-001이 유효한지 확인하고 새 액세스 토큰(' + accessExp + '분에 만료)을 발급했습니다. 원래 요청을 다시 보내 성공합니다. 사용자는 로그인이 끊긴 것을 느끼지 못합니다.', 'good', si); }
          else { loggedOut = true; client.access = null; row(t, name, '리프레시 토큰', '401 다시 로그인', 'bad'); push(t + '분: 서버가 저장소를 확인했지만 리프레시 토큰이 지워져 있습니다. 재발급을 거절합니다. 강제 로그아웃이 여기서 비로소 적용됐습니다.', 'bad', si); }
        }
      }
    });
    var sum = [];
    if (M === 'local' && S > 1 && !c.kick) sum.push('세션이 로그인한 서버 한 대의 메모리에만 있어서, 다른 서버로 간 요청은 로그인이 풀렸습니다. 서버를 여러 대로 늘리려면 같은 사용자를 항상 같은 서버로 보내거나(스티키 세션), 세션을 공용 저장소로 옮겨야 합니다.');
    if (M === 'local' && S === 1) sum.push('서버가 한 대일 때는 문제가 없습니다.');
    if (M === 'redis') sum.push('세션을 공용 저장소에 두면 서버가 몇 대든 로그인이 유지되고, 세션을 지우는 것만으로 즉시 로그아웃시킬 수 있습니다. 대신 요청마다 저장소를 조회하고, 저장소에 닿지 못하면 세션을 확인할 수 없어 전원이 로그인하지 않은 것으로 처리됩니다.');
    if (M === 'jwt') sum.push('JWT는 서버가 아무것도 저장하지 않아 서버를 늘리기 쉽고 조회 비용도 없습니다.' + (c.kick ? ' 대신 한 번 발급한 토큰은 만료 전까지 무효화할 수 없습니다. ' + (leaked ? '강제 로그아웃 뒤에도 요청 ' + leaked + '번이 통과했습니다.' : '이번에는 강제 로그아웃 시점에 토큰이 이미 만료된 뒤라서, 그 뒤에 통과한 요청이 없었습니다.') + ' 차단 목록을 서버에 두면 막을 수 있지만, 그러면 다시 요청마다 저장소를 조회하게 됩니다.' : ' 만료 시간이 지나면 다시 로그인해야 합니다.'));
    if (M === 'refresh') sum.push('액세스 토큰을 짧게 두고 리프레시 토큰으로 재발급하면, 평소 요청은 조회 없이 처리하면서도 액세스 토큰 유출이나 강제 로그아웃의 피해를 액세스 토큰 만료 시간 안으로 줄일 수 있습니다.');
    if (!sum.length) sum.push('요청 5번 중 ' + ok + '번이 로그인 상태로 처리됐고, 401 응답은 ' + fail + '번이었습니다. 공용 저장소에는 ' + look + '번 접근했습니다.');
    return { events: ev, summary: sum, row: [ok + '번', fail + '번', look + '번', c.kick ? leaked + '번' : '해당 없음'] };
  },
  render: function (v, sim, t, H, shown) {
    var c = sim.c, last = shown[shown.length - 1], s = last ? last.snap : null;
    if (!s) { H.text(v, '실행을 누르면 0분에 로그인부터 시작합니다.'); return; }
    H.counters(v, [[s.ok, '성공한 요청'], [s.fail, '401 응답'], [s.look, '공용 저장소 접근']]);
    H.table(v, ['시각', '받은 서버', '사용자가 보낸 것', '결과'], s.rows, '요청 기록');
  },
  // 그림: 브라우저의 요청이 로드밸런서를 거쳐 서버 중 한 대로 간다. 로그인 상태를 어디에 두었는지가 아래 상자에 보인다.
  draw: function (P, sim, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : { sv: [], hot: -1, shared: null, client: '없음', rows: [] }, n = Math.max(1, s.sv.length || 1), actors = [['b', '브라우저', 'wait']], msgs = [];
    for (var i = 0; i < n; i++) actors.push(['s' + (i + 1), '서버 ' + (i + 1)]);
    s.rows.forEach(function (r) { var tm = P.v(r.cells[0]), sv = 's' + P.v(r.cells[1]).replace('서버 ', ''), res = P.v(r.cells[3]); msgs.push({ f: 'b', t: sv, s: tm + ' ' + P.v(r.cells[2]) }); msgs.push({ f: sv, t: 'b', s: res, cls: P.c(r.cells[3]) }); });
    var end = P.seq(actors, msgs, { keep: 8 }), w = (648 - (n - 1) * 8) / n, y = end + 14;
    P.box('cl', 16, y, 648, 46, { cls: s.client === '없음' ? 'ghost' : 'wait', title: '브라우저가 들고 있는 것', sub: s.client });
    s.sv.forEach(function (t, i) { var p = t.split(' ('); P.box('mem' + i, 16 + i * (w + 8), y + 54, w, 62, { cls: (t.indexOf('없음') >= 0 || t === '-' ? 'ghost' : 'good') + (i === s.hot ? ' now' : ''), title: '서버 ' + (i + 1) + '의 메모리', sub: [p[0], p[1] ? '(' + p[1] : ' '] }); });
    if (s.shared !== null) P.box('sh', 16, y + 124, 648, 46, { cls: s.shared === '비어 있음' ? 'ghost' : 'good', title: '서버들이 함께 쓰는 저장소 (Redis)', sub: s.shared });
    P.size(680, y + 124 + (s.shared !== null ? 46 + 16 : 8));
    P.note('위쪽은 요청과 응답의 순서, 아래쪽은 로그인 상태가 놓인 곳입니다. 굵은 테두리는 방금 요청을 받은 서버입니다.');
  },
  assume: '로드밸런서는 요청을 서버에 차례로 돌아가며 보낸다고 가정했습니다(로그인은 서버 1, 그다음 요청은 서버 2 …). 세션 만료 시간과 리프레시 토큰 만료(보통 며칠에서 몇 주)는 이 50분 안에 닿지 않는다고 보았습니다. JWT의 서명 검증은 저장소 없이 서버가 가진 키만으로 이루어집니다. 리프레시 토큰을 서버 저장소에 두고 확인하는 것은 널리 쓰이는 구성이지만 표준이 강제하는 것은 아닙니다. 세션 코드에서 ResponseStatusException(HttpStatus.UNAUTHORIZED)을 던지면 401 응답이 되는 것은 스프링 부트 4.1.1 서버를 띄워 확인했습니다(세션 없이 요청하면 401, 로그인해 받은 JSESSIONID 쿠키를 보내면 200). JWT 코드는 Spring Security 7.1.1이 주는 JwtEncoder·NimbusJwtEncoder(발급)와 JwtDecoder·NimbusJwtDecoder(검증)를 썼습니다. 검증 실행 환경에는 spring-security-oauth2-jose와 nimbus-jose-jwt가 없어서 발급과 검증은 실행하지 않았고, 화면의 JWT 코드는 공식 시그니처만 옮긴 대역과 함께 javac로 컴파일되는 것만 확인했습니다. 디코더는 만료 시각에 기본으로 60초 여유를 두지만, 이 실습의 요청은 모두 만료 시각과 5분 이상 떨어져 있어 결과가 바뀌지 않습니다. 만료된 토큰에 decode가 JwtValidationException을 던지고 리소스 서버 설정이 401로 답하는 것은 "JWT의 구조와 검증" 실습에서 공식 소스와 대조한 내용을 따랐습니다.',
});

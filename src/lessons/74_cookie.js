Lab.register({
  id: 'cookie', nav: '쿠키', cat: '인증', mode: 'step',
  title: '기억하지 못하는 서버에게 매번 이름표를 내민다',
  intro: 'HTTP는 요청과 요청을 이어 주지 않습니다. 서버는 앞서 온 요청이 같은 브라우저에서 왔는지 알 수 없습니다. 그래서 로그인에 성공하면 서버가 응답에 작은 값(쿠키)을 실어 보내고, 브라우저는 그것을 보관했다가 같은 사이트로 가는 요청마다 자동으로 붙여 보냅니다.',
  terms: ['쿠키', 'HTTP와 무상태(Stateless)', 'HttpOnly, Secure, SameSite', '세션'], ranks: ['auth', 'http'],
  controls: [
    { id: 'give', label: '로그인 응답에 쿠키를 내려 준다', type: 'check', value: true },
    { id: 'path', label: 'Path (쿠키를 보낼 경로)', type: 'select', value: '/', options: [['/', 'Path=/ (사이트 전체)'], ['/shop', 'Path=/shop (/shop 아래에서만)']], show: function (c) { return c.give; } },
    { id: 'http', label: 'HttpOnly (자바스크립트가 읽지 못하게)', type: 'check', value: true, show: function (c) { return c.give; } },
    { id: 'life', label: '수명', type: 'select', value: 'session', options: [['session', '지정 안 함 (브라우저를 닫을 때까지)'], ['hour', 'Max-Age=3600 (1시간)'], ['short', 'Max-Age=3 (3초)']], show: function (c) { return c.give; } },
    { id: 'later', label: '다음 요청을 보내는 시점', type: 'select', value: 'now', options: [['now', '로그인 직후'], ['wait', '10초 뒤'], ['restart', '10초 뒤, 브라우저를 닫았다가 다시 열고']], show: function (c) { return c.give; } },
  ],
  presets: [
    { t: '처음 설정으로', q: '로그인 응답에 쿠키(Path=/, HttpOnly 켬)를 내려 준 뒤 로그인 직후 요청을 보내면 서버는 무엇을 받나', d: '쿠키가 같은 사이트의 요청마다 자동으로 붙습니다.', v: { give: true, path: '/', http: true, life: 'session', later: 'now' } },
    { t: '쿠키가 없다면', q: '로그인 응답에 쿠키를 내려 주지 않으면', d: '로그인 직후의 요청도 서버는 누구인지 모릅니다.', v: { give: false } },
    { t: '경로를 /shop으로 좁히면', q: 'Path=/shop으로 /shop 아래에서만 쿠키를 보내게 하면', d: '/orders 요청에는 붙지 않습니다.', v: { give: true, path: '/shop', http: true, life: 'session', later: 'now' } },
    { t: 'HttpOnly를 끄면', q: 'HttpOnly를 끄면', d: '페이지의 자바스크립트가 쿠키 값을 읽을 수 있습니다.', v: { give: true, path: '/', http: false, life: 'session', later: 'now' } },
    { t: '수명 3초, 10초 뒤 요청', q: '쿠키 수명을 3초(Max-Age=3)로 바꾸고 다음 요청을 10초 뒤에 보내면', d: '만료된 쿠키는 브라우저가 지웁니다.', v: { give: true, path: '/', http: true, life: 'short', later: 'wait' } },
    { t: '브라우저를 닫았다 열면', q: '10초 뒤에 브라우저를 닫았다가 다시 열고 다음 요청을 보내면', d: '수명을 지정하지 않은 쿠키는 사라집니다. 1시간으로 바꿔 비교해 보세요.', v: { give: true, path: '/', http: true, life: 'session', later: 'restart' } },
  ],
  // 실제 브라우저 결과와 대조하는 데 쓰는 순수 계산: 각 상황에서 쿠키가 전달되는가
  sent: function (c) {
    var alive = !!c.give && !(c.life === 'short' && c.later !== 'now') && !(c.life === 'session' && c.later === 'restart');
    return { alive: alive, orders: alive && c.path === '/', shop: alive, other: false, js: alive && !c.http };
  },
  header: function (c) { return 'Set-Cookie: sid=abc123; Path=' + c.path + (c.life === 'hour' ? '; Max-Age=3600; Expires=(1시간 뒤 시각)' : c.life === 'short' ? '; Max-Age=3; Expires=(3초 뒤 시각)' : '') + (c.http ? '; HttpOnly' : ''); },
  code: function (c) {
    if (!c.give) return '// 컨트롤러 클래스 본문만 보임 (클래스 선언, import, 예시로 만든 LoginRequest·memberService의 선언은 생략)\n@PostMapping("/login")\nResponseEntity<Void> login(@RequestBody LoginRequest req) {\n    memberService.check(req.id(), req.password());\n    return ResponseEntity.ok().build();      // 쿠키를 내려 주지 않는다\n}\n\n// 다음 요청에는 로그인했다는 표시가 아무것도 없다';
    return '// 컨트롤러 클래스 본문만 보임 (클래스 선언, import, 예시로 만든 LoginRequest·Member·memberService·sessionStore의 선언은 생략)\n@PostMapping("/login")\nResponseEntity<Void> login(@RequestBody LoginRequest req) {\n    Member m = memberService.check(req.id(), req.password());\n    String sid = sessionStore.create(m.getId());        // "abc123" → 회원 7\n\n    ResponseCookie cookie = ResponseCookie.from("sid", sid)\n        .path("' + c.path + '")\n' + (c.life === 'hour' ? '        .maxAge(Duration.ofHours(1))\n' : c.life === 'short' ? '        .maxAge(Duration.ofSeconds(3))\n' : '') + '        .httpOnly(' + c.http + ')\n        .build();\n    return ResponseEntity.ok()\n        .header(HttpHeaders.SET_COOKIE, cookie.toString())\n        .build();\n}\n// 응답 헤더: ' + this.header(c);
  },
  label: function (c) { return !c.give ? '쿠키 없음' : 'Path=' + c.path + (c.http ? ' · HttpOnly' : '') + ' · ' + { session: '수명 지정 없음', hour: '1시간', short: '3초' }[c.life] + ' · ' + { now: '직후', wait: '10초 뒤', restart: '브라우저 다시 엶' }[c.later]; },
  columns: ['GET /orders', 'GET /shop/cart', '다른 사이트로 가는 요청', '자바스크립트로 읽기'],
  simulate: function (c) {
    var R = this.sent(c), ev = [], sum = [], S = { jar: [], rows: [] }, self = this;
    function push(s, k) { ev.push({ s: s, k: k, snap: JSON.parse(JSON.stringify(S)) }); }
    S.rows.push(['POST /login', '(없음)', '아이디와 비밀번호를 확인함']);
    push('로그인 요청입니다. 첫 요청이라 브라우저에는 이 사이트의 쿠키가 없습니다. 서버는 본문의 아이디와 비밀번호를 확인합니다.', '');
    if (!c.give) {
      push('서버가 200으로 응답하지만 쿠키를 내려 주지 않습니다. 브라우저에 남는 것이 없습니다.', '');
      S.rows.push(['GET /orders', '(없음)', '누구인지 모름 → 401']);
      push('바로 이어서 주문 목록을 요청합니다. 서버는 방금 로그인한 그 브라우저인지 알 방법이 없습니다. HTTP 요청은 서로 독립이고, 서버는 앞 요청을 기억하지 않기 때문입니다(무상태).', 'bad');
      sum.push('쿠키가 없으면 요청마다 아이디와 비밀번호를 다시 보내야 합니다. 쿠키는 "앞에서 확인받은 그 브라우저"임을 요청마다 알려 주는 수단입니다.');
      sum.push('HTTP는 요청 사이의 상태를 기억하지 않습니다. 로그인 상태처럼 이어져야 하는 정보는 브라우저가 들고 다니며 매번 내밀어야 합니다.');
      return { events: ev, summary: sum, row: ['쿠키 없음 → 401', '쿠키 없음 → 401', '안 붙음', '읽을 값 없음'] };
    }
    var jarText = 'sid=abc123  (Path=' + c.path + (c.http ? ', HttpOnly' : '') + ', ' + { session: '브라우저를 닫으면 삭제', hour: '1시간 뒤 만료', short: '3초 뒤 만료' }[c.life] + ')';
    S.jar = [jarText];
    push('서버가 응답에 ' + self.header(c) + ' 헤더를 실어 보냅니다.' + (c.life === 'session' ? '' : ' Expires는 Max-Age와 같은 만료 시점을 날짜와 시각으로 적은 속성이고, 스프링의 ResponseCookie가 함께 붙입니다.') + ' 브라우저는 이 값을 shop.example의 쿠키로 보관합니다. 서버는 "abc123은 회원 7"이라고 자기 쪽에 적어 둡니다.', '');
    if (c.later !== 'now') {
      if (!R.alive) S.jar = [];
      push((c.later === 'wait' ? '10초가 지났습니다. ' : '10초 뒤 브라우저를 완전히 닫았다가 다시 열었습니다. ') + (R.alive ? '쿠키는 아직 남아 있습니다.' : c.life === 'short' ? '수명(3초)이 지난 쿠키를 브라우저가 지웠습니다.' : '수명을 지정하지 않은 쿠키(세션 쿠키)는 브라우저를 닫을 때 지워집니다.'), R.alive ? '' : 'bad');
    }
    var say = function (ok) { return ok ? '회원 7의 요청으로 처리' : '누구인지 모름 → 401'; };
    S.rows.push(['GET /orders', R.orders ? 'Cookie: sid=abc123' : '(없음)', say(R.orders)]);
    push('shop.example/orders 요청입니다. ' + (R.orders ? '브라우저가 Cookie 헤더에 sid를 자동으로 붙였습니다. 코드에서 따로 넣어 주지 않아도 붙습니다. 서버는 abc123을 찾아 회원 7의 요청임을 압니다.' : !R.alive ? '보관된 쿠키가 없으므로 아무것도 붙지 않습니다. 다시 로그인해야 합니다.' : '쿠키의 Path가 /shop이라서 /orders 요청에는 붙지 않습니다. 쿠키는 남아 있지만 이 경로는 대상이 아닙니다.'), R.orders ? 'good' : 'bad');
    S.rows.push(['GET /shop/cart', R.shop ? 'Cookie: sid=abc123' : '(없음)', say(R.shop)]);
    push('shop.example/shop/cart 요청입니다. ' + (R.shop ? '이 경로는 Path=' + c.path + '에 해당하므로 쿠키가 붙습니다.' : '보관된 쿠키가 없습니다.'), R.shop ? 'good' : 'bad');
    S.rows.push(['GET other.example/ (다른 사이트)', '(없음)', 'shop.example의 쿠키는 전달되지 않음']);
    push('다른 사이트 other.example로 가는 요청입니다. shop.example이 준 쿠키는 붙지 않습니다. 쿠키는 그것을 내려 준 호스트(shop.example)로 가는 요청에만 붙습니다(Domain 속성을 쓰면 범위가 넓어집니다).', '');
    S.rows.push(['페이지의 자바스크립트: document.cookie', R.js ? '"sid=abc123"을 읽음' : '(읽히지 않음)', R.js ? '스크립트가 값을 가져갈 수 있음' : R.alive ? 'HttpOnly라서 스크립트에 보이지 않음' : '쿠키 없음']);
    push('shop.example/shop/cart 페이지에서 자바스크립트가 document.cookie를 읽습니다. ' + (R.js ? 'HttpOnly가 없어서 값이 그대로 읽힙니다. 페이지에 악성 스크립트가 끼어들면(XSS) 이 값을 빼내 로그인 상태를 훔칠 수 있습니다.' : R.alive ? 'HttpOnly 쿠키는 스크립트에 보이지 않습니다. 그래도 요청에는 계속 자동으로 붙습니다.' : '보관된 쿠키가 없습니다.'), R.js ? 'bad' : R.alive ? 'good' : '');
    if (R.alive && c.path !== '/') sum.push('Path를 좁히면 그 경로 밖의 요청에는 쿠키가 붙지 않습니다. 로그인 쿠키는 보통 Path=/로 둡니다.');
    if (R.js) sum.push('로그인에 쓰는 쿠키에는 HttpOnly를 붙여 스크립트가 읽지 못하게 합니다. 실제 서비스에서는 https에서만 보내는 Secure, 다른 사이트에서 시작된 요청에 붙을지를 정하는 SameSite도 함께 지정합니다.');
    if (c.life === 'session' && c.later !== 'restart') sum.push('수명을 지정하지 않은 쿠키는 브라우저를 닫을 때 지워집니다. "로그인 유지"는 Max-Age나 Expires로 수명을 지정한 쿠키입니다.');
    sum.push('쿠키는 사용자의 브라우저에 저장되므로 사용자가 내용을 보거나 바꿀 수 있습니다. 그래서 쿠키에는 회원 번호 같은 값을 직접 넣지 않고, 추측할 수 없는 식별자(세션 ID)나 서명된 토큰을 넣습니다. 그 내용은 "세션과 JWT" 실습에서 이어집니다.');
    return { events: ev, summary: sum, row: [R.orders ? '쿠키 붙음' : '안 붙음 → 401', R.shop ? '쿠키 붙음' : '안 붙음 → 401', '안 붙음', R.js ? '읽힘 (위험)' : R.alive ? '안 읽힘' : '쿠키 없음'] };
  },
  render: function (v, sim, t, H, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : { jar: [], rows: [] };
    if (s.rows.length) H.table(v, ['요청 또는 동작', '브라우저가 붙인 Cookie 헤더', '서버(또는 스크립트)가 아는 것'], s.rows.map(function (r, i) { var on = i === s.rows.length - 1; return { cells: [{ v: r[0], cls: on ? 'hot' : '' }, { v: r[1], cls: r[1].indexOf('sid=') >= 0 ? (r[0].indexOf('document') >= 0 ? 'bad' : 'good') : '' }, r[2]] }; }), '요청마다 쿠키가 붙는지');
  },
  // 그림: 브라우저가 요청마다 쿠키를 붙이는지. 같은 사이트, 다른 경로, 다른 사이트, 스크립트가 읽는 경우를 차례로 본다.
  draw: function (P, sim, shown) {
    var c = sim.c, last = shown[shown.length - 1], s = last ? last.snap : { jar: [], rows: [] }, msgs = [];
    s.rows.forEach(function (r, i) {
      var req = r[0], ck = r[1], has = ck.indexOf('sid=') >= 0;
      if (req.indexOf('document.cookie') >= 0) { msgs.push({ f: 'b', s: 'document.cookie: ' + (has ? '값이 읽힘' : '읽히지 않음'), cls: has ? 'bad' : 'good' }); return; }
      if (req.indexOf('other.example') >= 0) { msgs.push({ f: 'b', t: 'o', s: 'GET / · 쿠키 안 붙음', cls: 'mut' }); return; }
      msgs.push({ f: 'b', t: 's', s: req + ' · ' + (has ? ck : '쿠키 없음'), cls: i === 0 ? '' : has ? 'good' : 'bad' });
      if (i === 0 && c.give && shown.length >= 2) msgs.push({ f: 's', t: 'b', s: this.header(c), cls: 'hot' });
    }, this);
    var end = P.seq([['b', '브라우저', 'wait'], ['s', 'shop.example 서버', 'wait'], ['o', 'other.example']], msgs, { keep: 7 });
    P.box('jar', 16, end + 14, 648, 46, { cls: s.jar.length ? 'good' : 'ghost', title: '브라우저가 보관 중인 shop.example의 쿠키', sub: s.jar[0] || '없음' });
    P.size(680, end + 76);
    P.note('초록 화살표는 쿠키가 붙어 간 요청, 빨간 화살표는 쿠키 없이 가서 서버가 누구인지 모르는 요청입니다. 맨 아래 document.cookie 줄은 초록이 안 읽힘(안전), 빨강이 읽힘(위험)입니다.');
  },
  assume: 'Path에 따라 붙는 경로, HttpOnly 쿠키가 document.cookie에 보이지 않는 것, Max-Age가 지난 쿠키가 사라지는 것, 호스트가 다른 주소로는 쿠키가 가지 않는 것은 실제 브라우저와 시험용 서버로 확인한 결과와 같습니다. 브라우저를 닫을 때 세션 쿠키가 지워지는 것은 표준 동작을 따른 것이며 직접 실행해 확인하지는 않았습니다. "이전 탭 복원" 기능을 켠 브라우저는 세션 쿠키를 되살리기도 합니다. Secure와 SameSite, Domain 속성은 이 실습에서 다루지 않았습니다.',
});

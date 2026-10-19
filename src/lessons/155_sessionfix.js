Lab.register({
  id: 'sessionfix', nav: '세션 하이재킹과 세션 고정', cat: '인증', mode: 'step',
  title: '세션 ID를 아는 사람이 곧 그 사용자다',
  intro: '서버는 요청의 쿠키에 실려 온 세션 ID만 보고 "누구의 요청인지"를 정합니다. 그래서 로그인된 세션의 ID를 아는 사람은 비밀번호를 몰라도 그 사용자로 행세할 수 있습니다(세션 하이재킹). 세션 고정은 순서를 뒤집은 것입니다. 로그인 전에 쓰던 세션 ID가 로그인 뒤에도 그대로이면, 그 ID를 미리 알고 있던 사람이 로그인된 세션을 쓰게 됩니다.',
  terms: ['세션', '세션 하이재킹', '세션 고정(Session Fixation)', 'HttpOnly, Secure, SameSite', '쿠키'],
  controls: [
    { id: 'fix', label: '로그인에 성공했을 때 서버가 세션에 하는 일', type: 'select', value: 'none', options: [['default', '세션 ID를 새 값으로 바꾼다 (스프링 시큐리티 기본값)'], ['newSession', '새 세션을 만들고 예전 내용은 버린다 (newSession)'], ['none', '아무것도 하지 않는다 (보호를 끔: none)']] },
    { id: 'when', label: '다른 사람이 세션 ID를 알게 된 때', type: 'select', value: 'before', options: [['before', '로그인 전: 미리 받아 둔 ID를 피해자가 쓰게 만듦 (세션 고정)'], ['after', '로그인 뒤: 로그인된 세션의 ID를 알아냄 (세션 하이재킹)']] },
    { id: 'logout', label: '그 사람이 요청하기 전에 피해자가 로그아웃한다', type: 'check', value: false },
  ],
  presets: [
    { t: '처음 설정으로', q: '로그인 성공 때 아무것도 하지 않는(none) 서버에서 미리 받아 둔 세션 ID로 피해자가 로그인하면 어떻게 되나', d: '로그인해도 세션 ID가 그대로입니다. 그 ID를 미리 알던 사람의 요청이 kim으로 처리됩니다.', v: { fix: 'none', when: 'before', logout: false } },
    { t: '스프링 시큐리티의 기본값이면', q: '로그인에 성공했을 때 세션 ID를 새 값으로 바꾸는 스프링 시큐리티 기본값을 쓰면', d: '로그인하는 순간 ID가 바뀌어, 미리 알아 둔 ID는 쓸모가 없어집니다.', v: { fix: 'default', when: 'before', logout: false } },
    { t: '새 세션을 만드는 방식', q: '로그인에 성공했을 때 새 세션을 만들고 예전 내용은 버리는 newSession 방식을 쓰면', d: 'ID가 바뀌는 것은 같지만 로그인 전에 담은 장바구니가 사라집니다.', v: { fix: 'newSession', when: 'before', logout: false } },
    { t: '로그인 뒤의 ID가 새어 나가면', q: '세션 ID를 새 값으로 바꾸는 기본값인데 다른 사람이 로그인된 세션의 ID를 알아냈으면', d: '로그인할 때 ID를 바꾸는 것으로는 막지 못합니다.', v: { fix: 'default', when: 'after', logout: false } },
    { t: '피해자가 로그아웃하면', q: '기본값에서 다른 사람이 로그인된 세션의 ID를 알아냈는데 그 사람이 요청하기 전에 피해자가 로그아웃하면', d: '서버가 세션을 지워, 새어 나간 ID가 더는 통하지 않습니다.', v: { fix: 'default', when: 'after', logout: true } },
    { t: '보호를 껐지만 로그아웃한 경우', q: '보호를 끈 채로 세션 ID를 알게 된 사람이 요청하기 전에 피해자가 로그아웃하면', d: '로그아웃한 뒤에는 막히지만, 로그인해 있는 동안은 열려 있었습니다.', v: { fix: 'none', when: 'before', logout: true } },
  ],
  code: function (c) {
    var sm = c.fix === 'none' ? '        .sessionManagement(s -> s\n            .sessionFixation(f -> f.none()))          // 로그인해도 세션을 그대로 둔다 (보호를 끔)\n'
      : c.fix === 'newSession' ? '        .sessionManagement(s -> s\n            .sessionFixation(f -> f.newSession()))    // 새 세션을 만들고 예전 내용은 옮기지 않는다\n'
      : '        // sessionManagement를 따로 적지 않았다.\n        // 기본값: 로그인에 성공하면 세션 ID를 새 값으로 바꾼다 (changeSessionId)\n';
    return '// 설정 클래스와 컨트롤러 클래스의 본문만 보임 (두 클래스의 선언과 import는 생략)\n@Bean\nSecurityFilterChain filterChain(HttpSecurity http) throws Exception {\n    return http\n        .authorizeHttpRequests(a -> a\n            .requestMatchers("/cart").permitAll()      // 장바구니는 로그인 전에도 쓴다\n            .anyRequest().authenticated())\n        .formLogin(Customizer.withDefaults())          // POST /login 으로 로그인\n        // CSRF 보호는 끄지 않았다(기본값: 켜짐). 그래서 POST /cart, /login, /logout에는\n        // 로그인 화면에 든 _csrf 값을 함께 보내야 한다. 없으면 처리되지 않고 로그인 화면으로 보내진다(302).\n' + sm + '        .build();\n}\n\n' +
      '@GetMapping("/me")\nString me(Principal p) {\n    return p.getName();                  // 이 요청이 누구의 요청으로 처리됐는지\n}\n\n@PostMapping("/cart")\nString add(@RequestParam String item, HttpSession session) {\n    session.setAttribute("cart", item);  // 세션에 장바구니를 적어 둔다\n    return "ok";\n}\n\n' +
      '// 서버가 세션 ID를 내려 줄 때의 응답 헤더 (스프링 부트 기본 설정)\n// Set-Cookie: JSESSIONID=aaa111; Path=/; HttpOnly';
  },
  label: function (c) { return { default: '로그인 때 ID 교체', newSession: '로그인 때 새 세션', none: '보호 끔' }[c.fix] + ' · ' + (c.when === 'before' ? '로그인 전의 ID를 앎' : '로그인 뒤의 ID를 앎') + (c.logout ? ' · 로그아웃함' : ''); },
  columns: ['로그인 뒤 세션 ID', '로그인 전에 담은 장바구니', '그 ID로 보낸 다른 사람의 요청', '막아 준 것'],
  // 결과만 계산한다 (실제 서버와 대조하는 부분)
  outcome: function (c) {
    var changed = c.fix !== 'none', kept = c.fix !== 'newSession', current = c.when === 'after' || !changed, ok = current && !c.logout;
    return { changed: changed, kept: kept, current: current, ok: ok, by: ok ? '막지 못함' : !current ? '로그인할 때의 세션 ID 교체' : '로그아웃 (세션 삭제)' };
  },
  simulate: function (c) {
    var R = this.outcome(c), A = 'aaa111', B = 'bbb222', post = R.changed ? B : A, known = c.when === 'before' ? A : post, ev = [], sum = [];
    var st = { msgs: [], s1: { on: false, user: '', cart: '', gone: '' }, s2: { on: false, user: '', cart: '', gone: '' }, vc: '', known: '', rows: [], att: '' };
    function push(s, k) { ev.push({ s: s, k: k || '', snap: JSON.parse(JSON.stringify(st)) }); }
    function msg(f, t, s, cls) { st.msgs.push(t ? { f: f, t: t, s: s, cls: cls || '' } : { f: f, s: s, cls: cls || '' }); }
    function row(who, req, cookie, res, cls) { st.rows.push([who, req, cookie, { v: res, cls: cls || '' }]); }
    if (c.when === 'before') {
      st.s1.on = true; st.known = A; msg('a', 's', 'GET /login'); msg('s', 'a', 'Set-Cookie: JSESSIONID=' + A, 'hot'); row('다른 사람', 'GET /login', '(없음)', '200 · Set-Cookie: JSESSIONID=' + A + '; Path=/; HttpOnly');
      push('다른 사람(공격자)이 shop.example의 로그인 화면을 엽니다. 서버는 처음 온 브라우저에 세션을 하나 만들고, 응답 헤더 Set-Cookie로 세션 ID ' + A + '을 내려 줍니다. 아직 아무도 로그인하지 않은 세션입니다. 공격자는 이 ID를 적어 둡니다.');
      st.vc = A; msg('*', '', '피해자의 브라우저가 공격자가 아는 ID ' + A + '을 쿠키로 쓰게 됨', 'bad');
      push('공격자가 피해자의 브라우저에 이 세션 ID가 쿠키로 들어가게 만듭니다. 방법은 이 실습에서 다루지 않고, "피해자의 브라우저가 ' + A + '을 쿠키로 보낸다"는 결과만 가정합니다. 이 시점에는 아직 얻은 것이 없습니다. 로그인하지 않은 세션이기 때문입니다.', 'bad');
    } else {
      st.s1.on = true; st.vc = A; msg('v', 's', 'GET /login'); msg('s', 'v', 'Set-Cookie: JSESSIONID=' + A, 'hot'); row('피해자', 'GET /login', '(없음)', '200 · Set-Cookie: JSESSIONID=' + A + '; Path=/; HttpOnly');
      push('피해자가 shop.example의 로그인 화면을 엽니다. 서버는 처음 온 브라우저에 세션을 하나 만들고, 응답 헤더 Set-Cookie로 세션 ID ' + A + '을 내려 줍니다. 아직 로그인하지 않은 세션입니다.');
    }
    st.s1.cart = '키보드'; msg('v', 's', 'POST /cart · 쿠키 ' + A); row('피해자', 'POST /cart (키보드)', 'JSESSIONID=' + A, '200 · 세션에 장바구니를 적어 둠');
    push('POST /cart: 피해자가 로그인하기 전에 키보드를 장바구니에 담습니다. 브라우저가 쿠키 JSESSIONID=' + A + '을 함께 보내고, 서버는 그 세션에 장바구니를 적어 둡니다.');
    msg('v', 's', 'POST /login · 쿠키 ' + A);
    push('POST /login: 피해자가 아이디와 비밀번호를 보냅니다. 쿠키는 여전히 JSESSIONID=' + A + '입니다. 서버가 아이디와 비밀번호를 확인했고, 인증에 성공했습니다.');
    if (c.fix === 'default') {
      st.s1.gone = 'ID가 ' + B + '로 바뀜'; st.s2 = { on: true, user: 'kim', cart: '키보드', gone: '' };
      msg('s', 'v', '302 · Set-Cookie: JSESSIONID=' + B, 'good'); row('피해자', 'POST /login', 'JSESSIONID=' + A, '302 · Set-Cookie: JSESSIONID=' + B + '; Path=/; HttpOnly', 'good');
      push('로그인 성공 직후: 스프링 시큐리티가 세션 ID를 새 값 ' + B + '로 바꿉니다. 세션에 든 내용(장바구니)은 그대로 두고 ID만 바꾼 뒤, 로그인한 사용자 kim을 기록합니다. 응답의 Set-Cookie로 새 ID가 피해자의 브라우저에 전달되고, ' + A + '이라는 ID는 서버에서 없어집니다.', 'good');
    } else if (c.fix === 'newSession') {
      st.s1.gone = '버려짐'; st.s2 = { on: true, user: 'kim', cart: '', gone: '' };
      msg('s', 'v', '302 · Set-Cookie: JSESSIONID=' + B, 'good'); row('피해자', 'POST /login', 'JSESSIONID=' + A, '302 · Set-Cookie: JSESSIONID=' + B + '; Path=/; HttpOnly', 'good');
      push('로그인 성공 직후: 스프링 시큐리티가 예전 세션을 버리고 새 세션 ' + B + '를 만들어, 거기에 로그인한 사용자 kim을 기록합니다. 예전 세션에 있던 장바구니는 새 세션으로 옮기지 않습니다. 응답의 Set-Cookie로 새 ID가 피해자의 브라우저에 전달됩니다.', 'good');
    } else {
      st.s1.user = 'kim';
      msg('s', 'v', '302 · 새 Set-Cookie 없음', 'bad'); row('피해자', 'POST /login', 'JSESSIONID=' + A, '302 · Set-Cookie 없음 (쓰던 ID 그대로)', 'bad');
      push('로그인 성공 직후: 세션에 아무 처리도 하지 않습니다. 로그인한 사용자 kim이 원래 세션 ' + A + '에 그대로 기록되고, 응답에는 새 Set-Cookie가 없습니다. 로그인 전에 쓰던 ID가 그대로 로그인된 세션의 ID가 됐습니다.', 'bad');
    }
    st.vc = post;
    msg('v', 's', 'GET /cart · 쿠키 ' + post + ' → ' + (R.kept ? '키보드' : '비어 있음')); row('피해자', 'GET /cart', 'JSESSIONID=' + post, R.kept ? '200 · 키보드' : '200 · 비어 있음', R.kept ? '' : 'hot');
    push('GET /cart: 피해자의 브라우저는 이제 JSESSIONID=' + post + ' 쿠키를 보냅니다. ' + (R.kept ? '장바구니에 키보드가 남아 있습니다.' + (R.changed ? ' ID만 바뀌었고 세션의 내용은 그대로이기 때문입니다.' : '') : '장바구니가 비어 있습니다. 새 세션에는 로그인 전에 담은 것이 없기 때문입니다.'));
    if (c.when === 'after') {
      st.known = post; msg('a', '', '로그인된 세션의 ID를 알아냄: ' + post, 'bad');
      push('다른 사람(공격자)이 로그인된 세션의 ID(' + post + ')를 알아냅니다. 쿠키에 HttpOnly가 없어 페이지에 끼어든 스크립트가 쿠키를 읽는 경우, https가 아닌 통신을 중간에서 엿보는 경우가 대표적인 경로입니다. 이 실습에서는 "알아냈다"는 결과만 가정합니다.', 'bad');
    }
    if (c.logout) {
      (R.changed ? st.s2 : st.s1).gone = '로그아웃으로 삭제됨'; st.vc = '';
      msg('v', 's', 'POST /logout · 쿠키 ' + post); row('피해자', 'POST /logout', 'JSESSIONID=' + post, '302 · 서버가 세션을 지움');
      push('POST /logout: 피해자가 로그아웃합니다. 서버는 그 세션(' + post + ')을 지웁니다. 이 ID는 이제 서버의 어떤 세션도 가리키지 않습니다.');
    }
    st.att = R.ok ? 'ok' : 'blocked';
    msg('a', 's', 'GET /me · 쿠키 ' + known); msg('s', 'a', R.ok ? '200 · kim' : '302 · 로그인 화면으로', R.ok ? 'bad' : 'good'); row('다른 사람', 'GET /me', 'JSESSIONID=' + known, R.ok ? '200 · kim' : '302 · /login 으로 보냄', R.ok ? 'bad' : 'good');
    push('GET /me: 공격자가 자기 컴퓨터에서, 알고 있는 ID를 쿠키(JSESSIONID=' + known + ')에 넣어 요청합니다. ' + (R.ok
      ? '서버는 그 ID로 세션을 찾고, 거기 기록된 kim의 요청으로 처리해 200으로 답합니다. 서버가 보는 것은 세션 ID뿐이라 어느 컴퓨터에서 보냈는지는 구별하지 않습니다. 공격자는 비밀번호를 한 번도 입력하지 않았습니다.'
      : !R.current ? '서버에 그 ID의 세션은 없습니다. 로그인할 때 ' + (c.fix === 'default' ? 'ID가 ' + B + '로 바뀌었기' : '새 세션 ' + B + '로 갈아탔기') + ' 때문입니다. 서버는 로그인하지 않은 요청으로 보고 302로 로그인 화면에 보냅니다.'
        : '서버에 그 ID의 세션은 없습니다. 로그아웃할 때 지웠기 때문입니다. 서버는 로그인하지 않은 요청으로 보고 302로 로그인 화면에 보냅니다.'), R.ok ? 'bad' : 'good');
    var row3 = R.ok ? '200 · kim으로 처리됨' : '302 · 로그인 화면으로 보냄';
    if (c.when === 'before' && R.ok) sum.push('세션 고정: 로그인 전후의 세션 ID가 같으면, 그 ID를 미리 알고 있던 사람은 비밀번호를 몰라도 로그인된 세션을 쓰게 됩니다. 로그인에 성공하는 순간 세션 ID를 바꾸면 막을 수 있고, 스프링 시큐리티는 따로 설정하지 않아도 그렇게 합니다.');
    if (c.when === 'before' && !R.changed && c.logout) sum.push('이번에는 로그아웃으로 세션이 지워져 막혔을 뿐입니다. 피해자가 로그인해 있는 동안에는 미리 알려진 ID로 누구든 들어올 수 있었습니다.');
    if (c.when === 'before' && R.changed) sum.push('로그인하는 순간 세션 ID가 바뀌었으므로, 미리 알아 둔 ID는 아무 세션도 가리키지 않습니다.');
    if (c.when === 'after') sum.push('세션 하이재킹: 로그인된 세션의 ID를 아는 사람은 누구든 그 사용자로 처리됩니다. 로그인할 때 ID를 바꾸는 보호는 로그인 뒤에 새어 나간 ID에는 소용이 없습니다. 그래서 ID가 새지 않도록 쿠키에 HttpOnly(스크립트가 읽지 못하게)와 Secure(https로만 보내게)를 붙입니다.');
    if (c.when === 'after' && c.logout) sum.push('로그아웃하면 서버가 세션을 지우므로 새어 나간 ID가 더는 통하지 않습니다. 세션 만료 시간을 짧게 두는 것도 같은 까닭입니다. ID가 쓸모 있는 시간을 줄입니다.');
    if (!R.kept) sum.push('새 세션을 만드는 방식은 로그인 전에 세션에 넣어 둔 값(장바구니)을 옮기지 않습니다. 기본값인 "ID만 바꾸기"는 내용을 그대로 둡니다.');
    return { events: ev, summary: sum, row: [R.changed ? '새 ID로 바뀜' : '로그인 전과 같음', R.kept ? '남아 있음' : '사라짐', row3, R.by] };
  },
  sesText: function (x, w) { return !x.on ? [w === 's2' ? '같은 세션 · 아직 바뀌지 않음' : '아직 없음', ' '] : x.gone ? [w === 's1' ? '같은 세션 · 더는 통하지 않음' : '없어짐', x.gone] : [(w === 's2' ? '같은 세션 · ' : '') + '로그인한 사용자: ' + (x.user || '없음'), '장바구니: ' + (x.cart || '비어 있음')]; },
  render: function (v, sim, t, H, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : null;
    if (!s) { H.text(v, '실행을 누르면 로그인 전부터 차례로 진행합니다.'); return; }
    H.counters(v, [[s.vc || '없음', '피해자의 브라우저에 있는 세션 ID']]);
    H.table(v, ['누가', '요청', '보낸 쿠키', '서버의 응답'], s.rows.map(function (r) { return { cells: [{ v: r[0], cls: r[0] === '다른 사람' ? 'hot' : '' }, r[1], r[2], r[3]] }; }), '요청 기록');
  },
  // 그림: 위쪽은 공격자, 서버, 피해자의 브라우저 사이를 오간 요청과 응답의 순서. 아래쪽은 서버가 가지고 있는 세션 두 개의 상태다.
  draw: function (P, sim, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : { msgs: [], s1: { on: false }, s2: { on: false }, vc: '', known: '', att: '' };
    var end = P.seq([['a', '다른 사람 (공격자)', 'hot'], ['s', 'shop.example 서버'], ['v', '피해자의 브라우저', 'wait']], s.msgs, { keep: 6 }), y = end + 12, self = this, def = sim.c.fix === 'default';
    [['s1', 'aaa111', 16], ['s2', 'bbb222', 344]].forEach(function (d) {
      var x = s[d[0]], known = s.known === d[1], bad = known && x.on && !x.gone && x.user;
      P.box(d[0], d[2], y, 320, 64, { cls: !x.on || x.gone ? 'ghost' : bad ? 'bad' : x.user ? 'good' : 'plain', title: !x.on ? (def && d[0] === 's2' ? '새 ID' : d[0] === 's2' ? '새 세션' : '서버의 세션') : (def ? (d[0] === 's2' ? '새 ID ' : x.gone ? '예전 ID ' : '서버의 세션 ') : '서버의 세션 ') + d[1] + (known ? ' · 공격자가 아는 ID' : ''), sub: self.sesText(x, def ? d[0] : '') });
    });
    P.size(680, y + 64 + 14);
    P.note('위쪽은 요청과 응답이 오간 순서, 아래쪽은 서버가 가지고 있는 세션입니다. ID를 바꾸는 기본값에서는 두 상자가 따로 만든 세션이 아니라 같은 세션의 예전 ID와 새 ID입니다. 초록 상자는 로그인된 세션, 빨간 상자는 공격자가 ID를 알고 있는 로그인된 세션, 점선은 없거나 없어진 세션입니다. 세션 ID는 알아보기 쉽게 줄여 적었습니다.');
  },
  assume: '열두 가지 조합 모두를, 스프링 부트 4.1.1과 스프링 시큐리티 7.1.1 서버를 127.0.0.1에 띄우고 화면과 같은 설정으로 실제로 실행해 대조했습니다. CSRF 보호는 켜 둔 채로, POST 요청마다 로그인 화면에 든 CSRF 토큰(_csrf)을 함께 보냈습니다. 토큰 없이 보낸 POST /cart와 POST /login은 처리되지 않고 302로 로그인 화면에 보내지는 것도 확인했습니다. 폼 로그인 전후에 서버가 내려 준 JSESSIONID가 바뀌는지, 로그인 전에 담은 장바구니가 남는지, 다른 사람이 알고 있는 ID를 쿠키에 넣어 보낸 요청의 응답(200과 본문 kim, 또는 302와 /login)이 화면과 같은지 확인했습니다. 여기서 "공격자"와 "피해자"는 쿠키에 넣는 세션 ID만 다른 같은 시험 프로그램의 요청이며, 실제 브라우저는 쓰지 않았습니다. 공격자가 피해자의 브라우저에 세션 ID를 심는 방법과 로그인된 세션의 ID를 알아내는 방법은 실행하지 않았고, 그렇게 됐다는 결과만 가정했습니다. HttpOnly 쿠키를 스크립트가 읽지 못한다는 것은 "쿠키" 실습에서 실제 브라우저로 확인한 내용입니다. 실제 세션 ID는 32글자였고(이 서버에서 확인) 추측할 수 없도록 무작위로 만들어집니다. 화면의 aaa111과 bbb222는 알아보기 쉽게 줄여 적은 것입니다. 서버가 세션 ID를 내려 줄 때의 Set-Cookie 속성이 "Path=/; HttpOnly"라는 것, server.servlet.session.cookie.secure=true로 설정하면 Secure가 붙는다는 것도 이 서버에서 확인했습니다. 로그인할 때의 동작을 changeSessionId나 migrateSession으로 명시해도 밖에서 보이는 결과는 기본값과 같았습니다. 로그인 화면을 처음 열 때 세션이 만들어지는 것은 그 화면에 넣는 CSRF 토큰을 세션에 보관하기 때문입니다. 세션 만료 시간이 지나 세션이 없어지는 것은 실행으로 확인하지 않았습니다. 근거 문서는 스프링 시큐리티 문서의 Servlet Applications, Authentication, Session Management 장에 있는 세션 고정 보호 설명입니다. 서버가 여러 대일 때의 세션 공유는 "세션과 JWT" 실습에서 다룹니다.',
});

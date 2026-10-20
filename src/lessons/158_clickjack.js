Lab.register({
  id: 'clickjack', nav: '클릭재킹과 오픈 리다이렉트', cat: '인증', mode: 'step',
  title: '내 화면이 남의 페이지에 숨겨지거나, 내 주소가 사용자를 남의 사이트로 넘겨주는 일을 어떻게 막나',
  why: '브라우저는 막는 표시가 없으면 어느 페이지든 다른 사이트의 iframe에 그려 주고, 페이지에 넣어 둔 프레임을 벗어나는 스크립트는 띄우는 쪽이 iframe의 sandbox 속성으로 스크립트를 막으면 통하지 않았다. X-Frame-Options와 CSP의 frame-ancestors는 이 페이지를 프레임으로 띄워도 되는 사이트를 응답 헤더로 밝혀, 그 밖의 사이트에서는 브라우저가 그리지 않게 한다.',
  use: '스프링 시큐리티는 설정하지 않아도 응답에 X-Frame-Options: DENY를 붙이고, H2 콘솔처럼 같은 사이트 안에서 프레임을 쓰는 화면이 있으면 sameOrigin으로 바꾼다. 협력 사이트에 결제나 지도 화면을 프레임으로 띄워 줘야 할 때는 frame-ancestors에 그 출처를 적는다. 로그인 뒤 돌아갈 주소를 요청에서 받는 코드는 같은 사이트의 경로인지 확인하거나 미리 정한 이름만 받는다.',
  intro: '클릭재킹은 다른 사이트가 내 사이트의 화면을 보이지 않는 프레임에 넣어, 사용자가 모르는 사이에 내 화면의 단추를 누르게 만드는 것입니다. 오픈 리다이렉트는 "로그인 뒤 돌아갈 주소"를 요청에서 받아 확인 없이 그대로 보내 주어, 내 사이트의 주소로 시작하는 링크가 다른 사이트로 넘어가게 되는 것입니다. 둘 다 서버가 뚫리는 것이 아니라 내 사이트에 대한 믿음이 이용당하는 문제이며, 클릭재킹은 서버가 보낸 응답 헤더를 보고 브라우저가 막고, 오픈 리다이렉트는 서버가 주소를 검사해 막습니다.',
  terms: ['클릭재킹', 'X-Frame-Options와 frame-ancestors', '오픈 리다이렉트', 'Spring Security와 SecurityFilterChain', 'CORS와 동일 출처 정책'],
  controls: [
    { id: 'topic', label: '살펴볼 문제', type: 'select', value: 'frame', options: [['frame', '클릭재킹 (내 화면을 프레임에 넣기)'], ['redir', '오픈 리다이렉트 (로그인 뒤 돌아갈 주소)']] },
    { id: 'hdr', label: '내 서버(shop.example)의 헤더 설정', type: 'select', value: 'off', options: [['off', 'frameOptions를 꺼 둠 (헤더 없음)'], ['default', '스프링 시큐리티 기본값 그대로'], ['same', 'frameOptions를 sameOrigin으로'], ['csp', 'CSP frame-ancestors로 내 사이트와 협력 사이트만 허용'], ['both', '기본값을 둔 채 CSP frame-ancestors를 추가']], show: function (c) { return c.topic === 'frame'; } },
    { id: 'who', label: '내 결제 화면을 프레임에 넣는 페이지', type: 'select', value: 'attacker', options: [['attacker', '공격자 사이트 (attacker.example)'], ['self', '같은 사이트의 내 페이지 (shop.example)'], ['partner', '약속한 협력 사이트 (partner.example)']], show: function (c) { return c.topic === 'frame'; } },
    { id: 'check', label: '서버가 next 값을 검사하는 방법', type: 'select', value: 'none', options: [['none', '검사하지 않음'], ['slash', '"/"로 시작하는지만 확인'], ['path', '같은 사이트의 경로만 허용']], show: function (c) { return c.topic === 'redir'; } },
    { id: 'next', label: '링크의 next에 들어 있는 값', type: 'select', value: 'abs', options: [['path', '/orders (정상적인 경로)'], ['abs', 'https://attacker.example/login'], ['dslash', '//attacker.example/login']], show: function (c) { return c.topic === 'redir'; } },
  ],
  presets: [
    { t: '처음 설정으로', q: 'frameOptions를 꺼 둔 서버의 결제 화면을 attacker.example 페이지가 프레임에 넣으면 어떻게 되나', d: '프레임 헤더를 꺼 둔 서버입니다. 공격자가 내 결제 화면을 숨은 프레임에 넣을 수 있습니다.', v: { topic: 'frame', hdr: 'off', who: 'attacker', check: 'none', next: 'abs' } },
    { t: '스프링 시큐리티 기본값', q: '헤더 설정을 스프링 시큐리티 기본값 그대로 두면', d: '설정하지 않아도 X-Frame-Options: DENY가 붙어 프레임에 그려지지 않습니다.', v: { topic: 'frame', hdr: 'default', who: 'attacker', check: 'none', next: 'abs' } },
    { t: '기본값에서 내 페이지의 프레임', q: '스프링 시큐리티 기본값인데 같은 사이트의 shop.example 페이지가 결제 화면을 프레임에 넣으면', d: 'DENY는 같은 사이트의 프레임까지 막습니다.', v: { topic: 'frame', hdr: 'default', who: 'self', check: 'none', next: 'abs' } },
    { t: '협력 사이트만 허용', q: 'CSP frame-ancestors로 내 사이트와 협력 사이트만 허용하고 partner.example 페이지가 결제 화면을 프레임에 넣으면', d: 'frame-ancestors에 적은 출처의 프레임에만 그려집니다.', v: { topic: 'frame', hdr: 'csp', who: 'partner', check: 'none', next: 'abs' } },
    { t: '돌아갈 주소를 검사하지 않으면', q: '오픈 리다이렉트에서 next를 검사하지 않고 next에 https://attacker.example/login이 들어 있으면', d: '내 사이트의 주소로 시작하는 링크가 공격자 사이트로 넘어갑니다.', v: { topic: 'redir', hdr: 'off', who: 'attacker', check: 'none', next: 'abs' } },
    { t: '"/"로 시작하는지만 보면', q: '서버가 next 값이 /로 시작하는지만 확인하는데 next에 //attacker.example/login이 들어 있으면', d: '//로 시작하는 주소가 검사를 통과합니다.', v: { topic: 'redir', hdr: 'off', who: 'attacker', check: 'slash', next: 'dslash' } },
    { t: '같은 사이트의 경로만 허용', q: 'next 검사를 같은 사이트의 경로만 허용하는 방식으로 바꾸고 next가 //attacker.example/login이면', d: '다른 사이트로 가는 값은 첫 화면으로 바뀝니다.', v: { topic: 'redir', hdr: 'off', who: 'attacker', check: 'path', next: 'dslash' } },
  ],
  CSP: "frame-ancestors 'self' https://partner.example",
  NEXT: { path: '/orders', abs: 'https://attacker.example/login', dslash: '//attacker.example/login' },
  PAGE: { attacker: 'https://attacker.example', self: 'https://shop.example/cart', partner: 'https://partner.example' },
  ORIGIN: { attacker: 'https://attacker.example', self: 'https://shop.example', partner: 'https://partner.example' },
  // 헤더 설정에 따라 응답에 붙는 프레임 관련 헤더
  headers: function (hdr) {
    var csp = 'Content-Security-Policy: ' + this.CSP;
    return { off: [], default: ['X-Frame-Options: DENY'], same: ['X-Frame-Options: SAMEORIGIN'], csp: [csp], both: ['X-Frame-Options: DENY', csp] }[hdr];
  },
  // 브라우저가 그 화면을 프레임 안에 그리는가
  framed: function (hdr, who) {
    if (hdr === 'off') return true;
    if (hdr === 'default') return false;
    if (hdr === 'same') return who === 'self';
    return who !== 'attacker';            // csp, both: frame-ancestors의 목록이 정한다 (함께 온 X-Frame-Options는 무시된다)
  },
  // 서버가 next를 검사한 결과와 응답의 Location
  redirect: function (check, next) {
    var v = this.NEXT[next], second = v.charAt(1);
    var ok = check === 'none' ? true : check === 'slash' ? v.charAt(0) === '/' : v.charAt(0) === '/' && second !== '/' && second !== '\\';
    var target = ok ? v : '/';
    // 스프링 부트의 내장 톰캣은 Location을 완전한 주소로 바꿔 내보낸다
    var loc = /^https?:/.test(target) ? target : target.slice(0, 2) === '//' ? 'https:' + target : 'https://shop.example' + target;
    return { v: v, ok: ok, target: target, loc: loc, away: loc.indexOf('https://shop.example/') !== 0 };
  },
  code: function (c) {
    if (c.topic === 'frame') {
      var line = { off: '    http.headers(h -> h.frameOptions(f -> f.disable()));', default: '    // headers를 따로 설정하지 않는다 (스프링 시큐리티의 기본값)', same: '    http.headers(h -> h.frameOptions(f -> f.sameOrigin()));', csp: '    http.headers(h -> h\n        .frameOptions(f -> f.disable())\n        .contentSecurityPolicy(c -> c.policyDirectives(\n            "' + this.CSP + '")));', both: '    http.headers(h -> h\n        .contentSecurityPolicy(c -> c.policyDirectives(\n            "' + this.CSP + '")));' }[c.hdr];
      var hs = this.headers(c.hdr);
      return '// shop.example 서버의 스프링 시큐리티 설정\n@Bean\nSecurityFilterChain filterChain(HttpSecurity http) throws Exception {\n    // (누가 들어올 수 있는지에 관한 설정은 생략)\n' + line + '\n    return http.build();\n}\n\n// 이 설정에서 /pay 응답에 붙는 프레임 관련 헤더\n' + (hs.length ? hs.map(function (h) { return '//   ' + h; }).join('\n') : '//   (없음)') + '\n\n<!-- 프레임에 넣는 쪽: ' + this.PAGE[c.who] + ' 의 페이지 -->\n<iframe src="https://shop.example/pay"></iframe>';
    }
    var body = c.check === 'none' ? '    return "redirect:" + next;                 // 받은 값을 확인 없이 그대로 쓴다' : c.check === 'slash' ? '    if (!next.startsWith("/")) next = "/";     // "/"로 시작하는지만 본다\n    return "redirect:" + next;' : '    // 같은 사이트의 경로만 받는다\n    boolean ok = next.startsWith("/")\n              && !next.startsWith("//")\n              && !next.startsWith("/\\\\");\n    if (!ok) next = "/";\n    return "redirect:" + next;';
    body = body.split('\n').map(function (l) { return '    ' + l; }).join('\n');
    return '// 링크: https://shop.example/login?next=' + this.NEXT[c.next] + '\n\n@Controller   // @RestController가 아니다: 반환한 "redirect:..."를 본문이 아니라 이동 지시로 해석한다\nclass LoginDoneController {   // 예시로 만든 클래스\n    // 로그인에 성공한 뒤 실행된다.\n    // next는 처음 링크에 있던 값이 그대로 넘어온 것이다.\n    @GetMapping("/login/done")\n    public String done(@RequestParam String next) {\n' + body + '\n    }\n}';
  },
  label: function (c) {
    if (c.topic === 'frame') return '클릭재킹 · ' + { off: '헤더 없음', default: '기본값(DENY)', same: 'SAMEORIGIN', csp: 'frame-ancestors', both: 'DENY + frame-ancestors' }[c.hdr] + ' · ' + { attacker: '공격자 사이트', self: '같은 사이트', partner: '협력 사이트' }[c.who];
    return '리다이렉트 · ' + { none: '검사 없음', slash: '"/" 시작만 확인', path: '경로만 허용' }[c.check] + ' · next=' + this.NEXT[c.next];
  },
  columns: ['서버의 응답 헤더', '브라우저의 동작', '결과'],
  simulate: function (c) { return c.topic === 'frame' ? this.simFrame(c) : this.simRedir(c); },
  simFrame: function (c) {
    var hs = this.headers(c.hdr), on = this.framed(c.hdr, c.who), who = c.who, page = this.PAGE[who], origin = this.ORIGIN[who], ev = [], sum = [], rows = [];
    var st = { phase: 0, hs: null, on: null };
    function push(s, k) { ev.push({ s: s, k: k, snap: { phase: st.phase, hs: st.hs, on: st.on, rows: rows.slice() } }); }
    function row(a, b, r, cls) { rows.push({ cells: [a, b, { v: r, cls: cls }] }); }
    var hsText = hs.length ? hs.join(' 그리고 ') : '프레임 관련 헤더 없음';
    st.phase = 1; row('브라우저', page + ' 열기', '페이지 안에 프레임이 있음', '');
    if (who === 'attacker') push('사용자가 ' + page + '의 페이지를 엽니다. 화면에는 "경품 받기" 단추만 보입니다. 그런데 이 페이지는 그 단추 위에 shop.example의 결제 화면을 프레임(iframe)으로 겹쳐 놓고, 보이지 않게 투명하게 만들어 두었습니다.', '');
    else if (who === 'self') push('사용자가 ' + page + '를 엽니다. shop.example의 장바구니 페이지이고, 같은 사이트의 결제 화면(/pay)을 프레임(iframe)으로 넣어 한 화면에서 보여 주도록 만들어져 있습니다. 공격이 아니라 내 사이트의 기능입니다.', '');
    else push('사용자가 ' + page + '의 페이지를 엽니다. shop.example과 약속을 맺은 협력 사이트이고, shop.example의 결제 화면을 프레임(iframe)으로 넣어 숨기지 않고 보여 줍니다.', '');
    st.phase = 2; row('브라우저', 'GET https://shop.example/pay', '프레임에 넣을 화면을 요청', '');
    push('브라우저가 프레임에 넣을 화면을 받으려고 https://shop.example/pay를 요청합니다. 프레임 안의 화면도 주소창에 주소를 넣었을 때와 같은 방식으로 서버에서 받아 옵니다.', '');
    st.phase = 3; st.hs = hs; row('shop.example', '결제 화면을 응답', hsText, 'hot');
    push({ off: 'shop.example이 결제 화면을 응답합니다. 설정에서 frameOptions를 꺼 두었으므로, 응답에는 프레임에 관한 헤더가 하나도 없습니다.',
      default: 'shop.example이 결제 화면을 응답합니다. headers를 따로 설정하지 않았지만, 스프링 시큐리티가 기본으로 X-Frame-Options: DENY를 응답에 붙입니다.',
      same: 'shop.example이 결제 화면을 응답합니다. frameOptions를 sameOrigin으로 정했으므로 응답에 X-Frame-Options: SAMEORIGIN이 붙습니다.',
      csp: 'shop.example이 결제 화면을 응답합니다. X-Frame-Options는 끄고, 대신 Content-Security-Policy: ' + this.CSP + ' 헤더를 붙였습니다.',
      both: 'shop.example이 결제 화면을 응답합니다. 기본값인 X-Frame-Options: DENY를 그대로 둔 채 Content-Security-Policy: ' + this.CSP + ' 헤더를 더했습니다. 응답에 두 헤더가 함께 붙습니다.' }[c.hdr], '');
    st.phase = 4; st.on = on; row('브라우저', '프레임 안에 그릴지 판단', on ? '그림' : '그리지 않음', who === 'attacker' ? (on ? 'bad' : 'good') : (on ? 'good' : 'bad'));
    var same = origin === 'https://shop.example', why;
    if (c.hdr === 'off') why = '브라우저가 응답 헤더를 확인합니다: 프레임에 넣지 말라는 표시가 없습니다. 이런 화면은 어느 사이트의 페이지든 프레임에 넣을 수 있으므로, 브라우저가 결제 화면을 프레임 안에 그립니다.';
    else if (c.hdr === 'default') why = '브라우저가 응답 헤더를 확인합니다: X-Frame-Options: DENY는 "어떤 페이지의 프레임에도 넣지 말라"는 뜻입니다. ' + (same ? '같은 사이트의 페이지라도 예외가 없습니다. ' : '') + '브라우저가 결제 화면을 그리지 않고 프레임을 비워 둡니다.';
    else if (c.hdr === 'same') why = '브라우저가 응답 헤더를 확인합니다: X-Frame-Options: SAMEORIGIN은 "출처가 같은 페이지의 프레임에만 넣어도 된다"는 뜻입니다. 프레임에 넣는 페이지의 출처는 ' + origin + '이고 결제 화면의 출처는 https://shop.example입니다. ' + (on ? '두 출처가 같으므로 프레임 안에 그립니다.' : '두 출처가 다르므로 그리지 않고 프레임을 비워 둡니다.');
    else why = '브라우저가 응답 헤더를 확인합니다: ' + (c.hdr === 'both' ? 'X-Frame-Options와 frame-ancestors가 함께 있으면 브라우저는 frame-ancestors를 따르고 X-Frame-Options는 무시합니다. ' : '') + 'frame-ancestors는 이 화면을 프레임에 넣어도 되는 출처의 목록입니다. \'self\'는 결제 화면과 같은 출처(https://shop.example)를 뜻하고, 그 뒤에 https://partner.example이 적혀 있습니다. 프레임에 넣는 페이지의 출처 ' + origin + (on ? '이 목록에 있으므로 프레임 안에 그립니다.' : '은 목록에 없으므로 그리지 않고 프레임을 비워 둡니다.');
    push(why, who === 'attacker' ? (on ? 'bad' : 'good') : (on ? 'good' : 'bad'));
    st.phase = 5;
    var res;
    if (who === 'attacker' && on) { res = '클릭재킹 가능'; row('사용자', '"경품 받기"를 누름', '실제로는 [결제하기]가 눌림', 'bad'); push('사용자가 "경품 받기"를 누릅니다: 눈에 보이는 것은 공격자 페이지의 단추지만, 그 위에는 투명한 결제 화면이 겹쳐 있습니다. 실제로 눌린 것은 shop.example의 [결제하기] 단추입니다. 사용자가 shop.example에 로그인된 상태였다면 자기도 모르게 결제를 승인한 것이 됩니다.', 'bad'); }
    else if (who === 'attacker') { res = '클릭재킹을 막음'; row('사용자', '"경품 받기"를 누름', '프레임이 비어 있어 아무 일도 없음', 'good'); push('사용자가 "경품 받기"를 누릅니다: 그 위에 겹쳐 둔 프레임이 비어 있으므로 shop.example의 단추는 눌리지 않습니다. 클릭재킹이 성립하지 않습니다.', 'good'); }
    else if (on) { res = who === 'self' ? '내 페이지의 프레임이 보임' : '협력 사이트의 프레임이 보임'; row('사용자', '페이지를 봄', '프레임 안에 결제 화면이 보임', 'good'); push((who === 'self' ? '장바구니 페이지' : '협력 사이트의 페이지') + ' 안에 결제 화면이 보입니다. 의도한 대로 동작합니다.', 'good'); }
    else { res = who === 'self' ? '내 페이지의 프레임까지 막힘' : '협력 사이트의 프레임까지 막힘'; row('사용자', '페이지를 봄', '프레임 자리가 비어 있음', 'bad'); push((who === 'self' ? '장바구니 페이지' : '협력 사이트의 페이지') + '에서 프레임 자리가 비어 보입니다. 공격을 막으려고 붙인 헤더가 ' + (who === 'self' ? '내 사이트의 기능까지' : '허용하려던 사이트까지') + ' 막았습니다.', 'bad'); }
    if (c.hdr === 'off') sum.push('프레임에 넣지 말라는 헤더가 없으면 브라우저는 어느 사이트의 프레임에든 화면을 그립니다. 프레임을 쓰는 화면 하나(예: H2 콘솔)를 띄우려고 frameOptions를 통째로 끄면 모든 화면이 이 상태가 됩니다. 끄지 말고 sameOrigin으로 바꾸는 편이 안전합니다.');
    if (c.hdr === 'default') sum.push('스프링 시큐리티는 아무 설정을 하지 않아도 X-Frame-Options: DENY를 붙입니다. 가장 안전한 값이지만 같은 사이트의 프레임까지 막으므로, 내 사이트 안에서 프레임을 쓴다면 sameOrigin으로 바꿉니다.');
    if (c.hdr === 'same') sum.push('SAMEORIGIN은 출처(프로토콜, 호스트, 포트)가 같은 페이지의 프레임만 허용합니다. X-Frame-Options로는 "이 사이트 하나만 더 허용"을 적을 수 없습니다. 다른 사이트를 골라 허용하려면 Content-Security-Policy의 frame-ancestors를 씁니다.');
    if (c.hdr === 'csp') sum.push('frame-ancestors는 프레임에 넣어도 되는 출처를 목록으로 적습니다. \'none\'이면 DENY와, \'self\'만 적으면 SAMEORIGIN과 같은 효과이고, 뒤에 출처를 더 적어 특정 사이트만 허용할 수 있습니다.');
    if (c.hdr === 'both') sum.push('두 헤더가 함께 오면 frame-ancestors가 우선합니다. 이는 DENY가 붙어 있는데도 ' + (who === 'attacker' ? '목록에 있는 출처의 프레임은 그려진다는 뜻입니다.' : '프레임이 그려진 이유입니다.') + ' 다만 frame-ancestors를 모르는 오래된 브라우저는 DENY를 따르므로, 두 헤더가 같은 뜻이 되도록 맞추거나 한쪽만 쓰는 편이 헷갈리지 않습니다.');
    if (who === 'attacker' && on) sum.push('클릭재킹은 서버가 받은 요청만 보아서는 정상적인 클릭과 구별되지 않습니다. 그래서 서버가 응답 헤더로 "이 화면을 프레임에 넣지 말라"고 미리 알리고, 브라우저가 그것을 지키는 방식으로 막습니다.');
    return { events: ev, summary: sum, row: [hsText, on ? '프레임 안에 그림' : '프레임 안에 그리지 않음', res], on: on, hs: hs };
  },
  simRedir: function (c) {
    var r = this.redirect(c.check, c.next), v = r.v, ev = [], sum = [], rows = [], atk = c.next !== 'path';
    var st = { phase: 0, checked: '', loc: '', at: '' };
    function push(s, k) { ev.push({ s: s, k: k, snap: { phase: st.phase, checked: st.checked, loc: st.loc, at: st.at, rows: rows.slice() } }); }
    function row(a, b, x, cls) { rows.push({ cells: [a, b, { v: x, cls: cls }] }); }
    var link = 'https://shop.example/login?next=' + v;
    st.phase = 1; row(atk ? '공격자' : '사용자', atk ? '링크를 보냄' : '로그인 화면을 엶', link, '');
    if (atk) push('공격자가 사용자에게 링크를 보냅니다. 링크의 주소는 ' + link + ' 입니다. 앞부분이 shop.example이므로 믿을 만해 보입니다. 그런데 로그인 뒤 돌아갈 곳을 적는 next에 다른 사이트의 주소를 넣어 두었습니다.', '');
    else push('사용자가 로그인하지 않은 채 주문 내역을 보려다 로그인 화면으로 왔습니다. 주소는 ' + link + ' 입니다. next는 로그인을 마친 뒤 돌아갈 곳을 적어 둔 값입니다.', '');
    st.phase = 2; row('사용자', 'shop.example에서 로그인', '성공. 서버가 next=' + v + ' 값을 받음', '');
    push('사용자가 진짜 shop.example의 로그인 화면에서 아이디와 비밀번호를 넣습니다. 로그인은 정상으로 끝나고, 서버는 요청에 실려 온 next 값을 꺼냅니다. 이 값은 서버가 정한 것이 아니라 요청을 만든 쪽이 정한 것입니다.', '');
    st.phase = 3;
    var bad = r.away, good = atk && !r.away;
    if (c.check === 'none') { st.checked = '검사하지 않음'; row('shop.example', 'next 검사', '검사하지 않음', bad ? 'bad' : ''); push('return "redirect:" + next: 서버가 next를 검사하지 않고 그대로 씁니다. 어떤 주소가 들어 있든 그곳으로 보내게 됩니다.', bad ? 'bad' : ''); }
    else if (c.check === 'slash') {
      st.checked = r.ok ? '통과' : '거절, "/"로 바꿈'; row('shop.example', 'next 검사: "/"로 시작하는가', st.checked, bad ? 'bad' : good ? 'good' : '');
      push('next.startsWith("/"): ' + (!r.ok ? '이 값은 "/"로 시작하지 않습니다. 받아들이지 않고 첫 화면("/")으로 바꿉니다.' : c.next === 'dslash' ? '이 값은 "/"로 시작하므로 통과합니다. 그런데 //로 시작하는 주소는 경로가 아닙니다. "프로토콜은 지금과 같게 두고, 바로 뒤에 오는 것이 호스트 이름"이라는 뜻의 주소입니다.' : '이 값은 "/"로 시작하므로 통과합니다.'), bad ? 'bad' : good ? 'good' : '');
    } else {
      st.checked = r.ok ? '통과' : '거절, "/"로 바꿈'; row('shop.example', 'next 검사: 같은 사이트의 경로인가', st.checked, good ? 'good' : '');
      push('"/"로 시작하고 둘째 글자가 "/"나 "\\"가 아닌지 확인합니다: ' + (r.ok ? '/orders는 조건에 맞는 경로이므로 통과합니다.' : c.next === 'abs' ? '이 값은 "/"로 시작하지 않습니다. 받아들이지 않고 첫 화면("/")으로 바꿉니다.' : '이 값은 "/"로 시작하지만 둘째 글자도 "/"입니다. 호스트 이름이 이어지는 주소이므로 받아들이지 않고 첫 화면("/")으로 바꿉니다.'), good ? 'good' : '');
    }
    st.phase = 4; st.loc = r.loc; row('shop.example', '302 응답', 'Location: ' + r.loc, bad ? 'bad' : 'hot');
    push('서버가 "다른 주소로 가라"는 302 응답을 보냅니다. 응답의 Location 헤더에 적힌 주소는 ' + r.loc + ' 입니다. 스프링 부트의 내장 톰캣은 Location을 완전한 주소로 바꿔 내보냅니다.' + (r.ok && c.next === 'dslash' ? ' //attacker.example/login이 https://attacker.example/login이 됐습니다.' : ''), bad ? 'bad' : '');
    st.phase = 5; st.at = r.loc; row('브라우저', 'Location을 따라 이동', r.away ? 'attacker.example에 도착' : 'shop.example에 머무름', bad ? 'bad' : 'good');
    var res = !atk ? '의도한 화면으로 이동' : r.away ? '오픈 리다이렉트 성립' : '막음 (첫 화면으로 보냄)';
    if (!atk) push('브라우저가 Location에 적힌 주소로 이동합니다. 도착한 곳은 ' + r.loc + ' 입니다. 로그인 전에 보려던 주문 내역이 열립니다. 이 기능이 원래 하려던 일입니다.', 'good');
    else if (r.away) push('브라우저가 Location에 적힌 주소로 이동합니다. 도착한 곳은 ' + r.loc + ' 입니다. 사용자는 방금 진짜 shop.example에서 로그인했으므로 의심하지 않습니다. 도착한 페이지가 shop.example과 똑같이 생긴 채 "비밀번호를 다시 입력하세요"라고 하면 그대로 입력하기 쉽습니다.', 'bad');
    else push('브라우저가 Location에 적힌 주소로 이동합니다. 도착한 곳은 ' + r.loc + ' 입니다. 공격자가 넣은 주소는 버려졌고 사용자는 shop.example의 첫 화면에 있습니다.', 'good');
    if (r.away && c.check === 'none') sum.push('요청에서 받은 주소로 그대로 보내 주면, 내 사이트의 주소로 시작하는 링크가 어디로든 가는 통로가 됩니다. 사용자는 주소의 앞부분만 보고 믿기 때문에 가짜 로그인 화면으로 끌어들이는 데 쓰입니다.');
    if (r.away && c.check === 'slash') sum.push('"/"로 시작하면 내 사이트의 경로라고 생각하기 쉽지만, //로 시작하는 주소는 다른 호스트를 가리킵니다. 브라우저는 /\\로 시작하는 주소도 //처럼 다루므로 둘째 글자까지 확인해야 합니다.');
    if (atk && !r.away) sum.push((c.check === 'slash' ? '이 값은 막았지만 "/"로 시작하는지만 보는 검사에는 빈틈이 있습니다. ' : '') + '막는 방법은 "받아도 되는 것만 받는다"입니다. 같은 사이트의 경로만 받거나, 더 확실하게는 주소 대신 미리 정해 둔 이름(예: next=orders)을 받아 서버가 가진 목록에서 주소를 찾습니다.');
    if (!atk) sum.push('정상적인 값은 어떤 검사에서든 같은 결과입니다. 차이는 다른 사이트의 주소가 들어왔을 때 드러납니다.');
    if (atk) sum.push('스프링 시큐리티의 기본 로그인은 돌아갈 주소를 요청의 값이 아니라 서버의 세션에 저장해 둔 것에서 꺼내므로 이 문제가 없습니다. 돌아갈 주소를 요청의 값으로 직접 받도록 만들 때 검사가 필요합니다.');
    return { events: ev, summary: sum, row: ['Location: ' + r.loc, r.away ? 'attacker.example로 이동' : 'shop.example에 머무름', res], away: r.away, loc: r.loc };
  },
  render: function (v, sim, t, H, shown) {
    var last = shown[shown.length - 1], rows = last ? last.snap.rows : [], c = sim.c;
    if (!rows.length) { H.text(v, '실행을 누르면 한 단계씩 진행합니다.'); return; }
    H.table(v, ['누가', '무엇을', '결과'], rows, c.topic === 'frame' ? '브라우저와 shop.example 사이에 일어난 일' : '링크를 연 뒤 일어난 일');
    if (c.topic === 'frame') H.text(v, '기본 설정의 스프링 시큐리티가 응답에 붙이는 헤더는 Cache-Control, Pragma, Expires, X-Content-Type-Options: nosniff, X-Frame-Options: DENY, X-XSS-Protection: 0입니다(http로 보낸 요청의 실제 응답에서 확인. 스프링 시큐리티 문서에 따르면 https 요청에는 Strict-Transport-Security도 붙습니다). 이 가운데 프레임에 관한 것이 X-Frame-Options입니다.');
  },
  // 그림: 클릭재킹은 왼쪽에 브라우저에 열린 페이지와 그 안의 프레임, 오른쪽에 내 서버와 응답 헤더. 리다이렉트는 링크 → 내 서버의 검사 → 도착한 곳.
  draw: function (P, sim, shown) {
    var c = sim.c, last = shown[shown.length - 1], s = last ? last.snap : { phase: 0 }, ph = s.phase;
    P.size(680, 280);
    if (c.topic === 'frame') {
      var who = c.who, on = sim.on, atk = who === 'attacker', judged = ph >= 4;
      var verdict = !judged ? '' : atk ? (on ? 'bad' : 'good') : (on ? 'good' : 'bad');
      P.region('f_pg', 16, 16, 316, 196, '열린 페이지: ' + this.PAGE[who].replace('https://', ''));
      P.box('f_btn', 30, 46, 288, 32, { cls: ph >= 1 ? 'plain' : 'ghost', title: atk ? '보이는 것: "경품 받기" 단추' : who === 'self' ? '보이는 것: 장바구니' : '보이는 것: 협력 사이트의 화면' });
      P.box('f_fr', 30, 90, 288, 108, { cls: ph < 2 ? 'ghost' : !judged ? 'wait' : verdict, title: '프레임 (iframe)', sub: [atk ? '투명하게 만들어 단추 위에 겹쳐 둠' : '화면의 한 부분으로 보이게 넣음', ph < 2 ? '아직 비어 있음' : !judged ? 'shop.example/pay를 받아 오는 중' : on ? '결제 화면이 그려짐: [결제하기]' : '비어 있음 (브라우저가 그리지 않음)', ph === 5 && atk && on ? '사용자의 클릭이 [결제하기]에 닿음' : ' '] });
      P.region('f_sv', 348, 16, 316, 196, '내 서버: shop.example');
      P.box('f_pay', 362, 46, 288, 32, { cls: ph >= 2 ? 'wait' : 'ghost', title: 'GET /pay: 결제 화면' });
      var lines = !s.hs ? ['아직 응답 전'] : !s.hs.length ? ['(없음)'] : [];
      (s.hs || []).forEach(function (h) { if (h.indexOf('Content-Security-Policy') === 0) lines.push('Content-Security-Policy:', "  frame-ancestors 'self'", '  https://partner.example'); else lines.push(h); });
      P.box('f_hd', 362, 90, 288, 108, { cls: !s.hs ? 'ghost' : 'hot', title: '응답 헤더 (프레임에 관한 것)', sub: lines, mono: !!s.hs });
      if (ph >= 2) P.arrow('f_rq', 'f_fr:r:0.25', 'f_pay:l', { label: '요청' });
      if (ph >= 3) P.arrow('f_rs', 'f_hd:l:0.6', 'f_fr:r:0.6', { cls: !judged ? 'hot' : on ? (atk ? 'bad' : 'good') : 'dash', label: !judged ? '응답' : on ? '그림' : '그리지 않음' });
      P.box('f_res', 16, 228, 648, 36, { cls: ph < 5 ? 'ghost' : verdict, title: '결과', right: ph < 5 ? '진행 중' : sim.row[2] });
      P.note('프레임 안의 화면을 그릴지는 서버가 아니라 브라우저가 정합니다. 서버는 응답 헤더로 "이 화면을 누구의 프레임에 넣어도 되는지"를 알릴 뿐입니다. 헤더가 없으면 브라우저는 누구의 프레임에든 그립니다.');
      return;
    }
    var away = sim.away, atk2 = c.next !== 'path', v = this.NEXT[c.next];
    P.box('r_link', 16, 16, 648, 52, { cls: ph === 1 ? 'hot' : ph ? 'plain' : 'ghost', title: atk2 ? '공격자가 보낸 링크' : '사용자가 연 주소', sub: 'https://shop.example/login?next=' + v, mono: true });
    P.box('r_srv', 16, 100, 340, 108, { cls: ph < 2 ? 'ghost' : ph >= 4 && away ? 'bad' : 'wait', title: '내 서버: shop.example', sub: [ph >= 2 ? 'next = ' + v : '아직 요청 전', ph >= 3 ? '검사: ' + s.checked : ' ', ph >= 4 ? 'Location:' : ' ', ph >= 4 ? '  ' + s.loc : ' '] });
    P.box('r_dst', 396, 100, 268, 108, { cls: ph < 5 ? 'ghost' : away ? 'bad' : 'good', title: '브라우저가 도착한 곳', sub: ph < 5 ? ['아직 이동 전'] : away ? ['attacker.example/login', '공격자의 사이트', '(shop.example처럼 꾸민 화면)'] : [sim.loc.replace('https://', ''), atk2 ? 'shop.example의 첫 화면' : 'shop.example의 주문 내역'] });
    if (ph >= 2) P.arrow('r_a1', 'r_link:b:0.25', 'r_srv:t', { label: '로그인' });
    if (ph >= 4) P.arrow('r_a2', 'r_srv:r', 'r_dst:l', { cls: ph < 5 ? 'hot' : away ? 'bad' : 'good', label: '302' });
    P.box('r_res', 16, 228, 648, 36, { cls: ph < 5 ? 'ghost' : away ? 'bad' : 'good', title: '결과', right: ph < 5 ? '진행 중' : sim.row[2] });
    P.note('링크의 앞부분은 진짜 shop.example이고 로그인도 진짜 서버에서 합니다. 어디로 돌려보낼지를 요청의 값으로 정하게 두면, 그 값을 검사하는 곳이 유일한 방어선입니다.');
  },
  assume: '프레임 관련 헤더 다섯 가지와 Location 헤더 아홉 가지는 스프링 부트 4.1.1(스프링 시큐리티 7.1.1, 내장 톰캣 11) 서버를 127.0.0.1에 띄워 실제 응답과 대조했습니다. 브라우저의 동작(프레임 안에 그리는지 열다섯 가지, Location을 따라 어느 서버에 닿는지 아홉 가지)은 크로미움 151을 화면 없이 실행해 확인했으며, 이때 출처는 127.0.0.1의 서로 다른 포트로 흉내 냈습니다. 다른 브라우저는 실행하지 않았고 문서를 따랐습니다: X-Frame-Options는 RFC 7034와 HTML 표준, frame-ancestors는 W3C의 Content Security Policy Level 3, //로 시작하는 주소는 RFC 3986 4.2절, 역슬래시를 슬래시처럼 다루는 것은 WHATWG URL 표준입니다. 단순화한 것: 프레임은 한 겹만 다뤘습니다(여러 겹이면 브라우저는 바깥의 모든 페이지를 확인합니다). 화면을 투명하게 겹치는 방법은 싣지 않았습니다. SameSite=Lax인 쿠키는 다른 사이트의 프레임 안에서 보내는 요청에 붙지 않고(RFC 6265bis 초안), 크롬 계열 브라우저는 SameSite를 지정하지 않은 쿠키도 Lax로 다룹니다. 그래서 로그인이 필요한 화면의 클릭재킹은 세션 쿠키가 SameSite=None일 때 주로 성립합니다. 쿠키에 관한 이 부분은 실행하지 않았습니다. X-Frame-Options의 ALLOW-FROM은 요즘 브라우저가 지원하지 않아 다루지 않았습니다. Location이 완전한 주소로 바뀌는 것은 스프링 부트의 기본값(server.tomcat.use-relative-redirects=false)일 때이며, 이 값을 true로 바꾼 서버는 받은 값을 그대로 내보냅니다. 그 설정에서는 /\\attacker.example 꼴의 값도 "/"로 시작하는지만 보는 검사를 통과해 크로미움이 다른 서버로 이동하는 것을 확인했습니다. 화면의 Location은 시험 서버의 주소를 https://shop.example로 바꿔 적은 것입니다.',
});

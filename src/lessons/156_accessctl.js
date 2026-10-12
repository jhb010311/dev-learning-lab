Lab.register({
  id: 'accessctl', nav: '접근 제어', cat: '인증', mode: 'step',
  title: '로그인한 사용자가 주소의 번호만 바꾸면 남의 주문이 보이나',
  intro: '로그인했다는 것은 "누구인지 확인됐다"(인증)는 뜻일 뿐, "이 자원을 봐도 된다"(인가)는 뜻이 아닙니다. kim이 로그인한 뒤 주소의 주문 번호만 바꿔 lee의 주문을 요청하면 어떻게 될까요. 서버가 무엇을 확인하느냐에 따라 그대로 보이기도 하고 거절되기도 합니다.',
  terms: ['인증과 인가', '접근 제어와 소유자 확인', '역할 기반 접근 제어(RBAC)', 'HTTP 상태 코드', 'Spring Security와 SecurityFilterChain'],
  controls: [
    { id: 'check', label: '서버가 확인하는 것', type: 'select', value: 'login', options: [['login', '로그인했는지만 확인한다'], ['role', 'URL 규칙으로 역할(USER)만 확인한다'], ['owner403', '주문의 주인인지 확인하고, 아니면 403'], ['owner404', '내 주문 가운데에서만 찾고, 없으면 404'], ['ownerAdmin', '주인이거나 ADMIN 역할이면 허용, 아니면 403']] },
    { id: 'who', label: '요청하는 사람 (로그인한 상태)', type: 'select', value: 'kim', options: [['kim', 'kim · 역할 USER · 주문 1번의 주인'], ['admin', 'park · 역할 ADMIN (고객센터 직원) · 자기 주문 없음']] },
    { id: 'target', label: '요청하는 주소', type: 'select', value: '2', options: [['1', 'GET /orders/1 · kim의 주문'], ['2', 'GET /orders/2 · lee의 주문'], ['99', 'GET /orders/99 · 없는 주문']] },
  ],
  presets: [
    { t: '처음 설정으로', q: '로그인만 확인하는 서버에서 kim이 lee의 주문인 GET /orders/2를 요청하면 무슨 일이 일어나나', d: '로그인만 확인하는 서버입니다. 번호만 바꿨는데 lee의 주문이 그대로 보입니다.', v: { check: 'login', who: 'kim', target: '2' } },
    { t: '역할로 막아 보면', q: '서버가 URL 규칙으로 USER 역할만 확인하게 바꾸면', d: 'kim도 USER라서 통과합니다. 역할은 누구의 주문인지 모릅니다.', v: { check: 'role', who: 'kim', target: '2' } },
    { t: '주인인지 확인하면', q: '서버가 주문의 주인인지 확인하고 아니면 403을 보내게 바꾸면', d: '주문의 주인과 로그인한 사용자가 달라 403으로 거절됩니다.', v: { check: 'owner403', who: 'kim', target: '2' } },
    { t: '없는 번호를 넣으면', q: '주문의 주인인지 확인하는 서버에서 없는 주문 GET /orders/99를 요청하면', d: '404입니다. 2번은 403이었으니, 2번 주문이 있다는 것은 드러납니다.', v: { check: 'owner403', who: 'kim', target: '99' } },
    { t: '남의 것도 404로 답하면', q: '서버가 내 주문 가운데에서만 찾고 없으면 404를 보내게 바꾸면', d: '없는 주문과 구별되지 않아, 있는지조차 알 수 없습니다.', v: { check: 'owner404', who: 'kim', target: '2' } },
    { t: '고객센터 직원이 조회하면', q: '주인이거나 ADMIN 역할이면 허용하는 서버에서 ADMIN 역할인 park이 GET /orders/2를 요청하면', d: '주인이 아니어도 ADMIN 역할로 허용됩니다.', v: { check: 'ownerAdmin', who: 'admin', target: '2' } },
    { t: '역할 규칙이 직원을 막는 경우', q: 'URL 규칙으로 USER 역할만 확인하는데 ADMIN 역할인 park이 없는 주문 GET /orders/99를 요청하면', d: '컨트롤러가 실행되기도 전에 403입니다.', v: { check: 'role', who: 'admin', target: '99' } },
  ],
  code: function (c) {
    var rule = (c.check === 'role' ? '            .requestMatchers("/orders/**").hasRole("USER")   // 역할만 본다\n' : '') + '            .anyRequest().authenticated())                 // 로그인했는지만 본다\n';
    var find = '    Order o = orders.findById(id)\n        .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));\n';
    var body = {
      login: find + '    return o;                                 // 누구의 주문인지 확인하지 않는다\n',
      role: find + '    return o;                                 // 누구의 주문인지 확인하지 않는다\n',
      owner403: find + '    if (!o.owner().equals(auth.getName()))    // 주문의 주인과 로그인한 사용자를 비교한다\n        throw new ResponseStatusException(HttpStatus.FORBIDDEN);\n    return o;\n',
      owner404: '    return orders.findByIdAndOwner(id, auth.getName())   // 내 주문 가운데에서만 찾는다\n        .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));\n',
      ownerAdmin: find + '    boolean owner = o.owner().equals(auth.getName());\n    boolean admin = auth.getAuthorities().stream()\n        .anyMatch(g -> g.getAuthority().equals("ROLE_ADMIN"));\n    if (!owner && !admin)                     // 주인도 아니고 ADMIN도 아니면 거절\n        throw new ResponseStatusException(HttpStatus.FORBIDDEN);\n    return o;\n',
    }[c.check];
    return '// 주문 1번의 주인은 kim, 2번의 주인은 lee다. 99번 주문은 없다.\n// kim과 lee의 역할은 USER, park의 역할은 ADMIN이다.\n\n@Bean\nSecurityFilterChain filterChain(HttpSecurity http) throws Exception {\n    return http\n        .authorizeHttpRequests(a -> a\n' + rule + '        .httpBasic(Customizer.withDefaults())              // 로그인 방법 (무엇이든 결과는 같다)\n        .build();\n}\n\n@GetMapping("/orders/{id}")\nOrder one(@PathVariable long id, Authentication auth) {     // auth: 지금 로그인한 사용자\n' + body + '}';
  },
  label: function (c) { return { login: '로그인만 확인', role: '역할만 확인', owner403: '주인 확인 (403)', owner404: '주인 확인 (404)', ownerAdmin: '주인 또는 ADMIN' }[c.check] + ' · ' + (c.who === 'kim' ? 'kim(USER)' : 'park(ADMIN)') + ' · /orders/' + c.target; },
  columns: ['응답', '응답 본문에 담긴 주문', '판단한 곳'],
  // 결과만 계산한다 (실제 서버와 대조하는 부분). why: filter, nocheck, notfound, owner, notowner, notmine, admin
  judge: function (c) {
    var owner = { '1': 'kim', '2': 'lee' }[c.target] || '', me = c.who === 'admin' ? 'park' : 'kim', role = c.who === 'admin' ? 'ADMIN' : 'USER', mine = owner === me;
    function r(st, why) { return { st: st, why: why, owner: owner, me: me, role: role, body: st === 200 ? owner : '', ctl: why !== 'filter' }; }
    if (c.check === 'role' && role !== 'USER') return r(403, 'filter');
    if (c.check === 'login' || c.check === 'role') return owner ? r(200, 'nocheck') : r(404, 'notfound');
    if (c.check === 'owner404') return mine ? r(200, 'owner') : r(404, 'notmine');
    if (!owner) return r(404, 'notfound');
    if (mine) return r(200, 'owner');
    if (c.check === 'ownerAdmin' && role === 'ADMIN') return r(200, 'admin');
    return r(403, 'notowner');
  },
  simulate: function (c) {
    var J = this.judge(c), me = J.me, id = c.target, ev = [], sum = [];
    var miss = this.judge({ check: c.check, who: c.who, target: '99' }), same99 = J.st === miss.st;
    var st = { req: false, auth: '', url: '', ctl: '', look: '', resp: '', body: '' };
    function push(s, k) { ev.push({ s: s, k: k || '', snap: JSON.parse(JSON.stringify(st)) }); }
    var STATUS = { 200: '200 OK', 403: '403 Forbidden', 404: '404 Not Found' };
    st.req = true;
    push((me === 'kim' ? 'kim이 로그인한 상태로 GET /orders/' + id + ' 요청을 보냅니다. ' + (id === '1' ? '1번은 kim 자신의 주문입니다.' : id === '2' ? 'kim의 주문은 1번이고 2번은 lee의 주문입니다. 주소의 번호만 2로 바꿔 본 것입니다.' : '99번이라는 주문은 없습니다. 번호를 아무렇게나 넣어 본 것입니다.')
      : '고객센터 직원 park이 로그인한 상태로 GET /orders/' + id + ' 요청을 보냅니다. park의 역할은 ADMIN이고 자기 주문은 없습니다. ' + (id === '99' ? '99번이라는 주문은 없습니다.' : id + '번은 ' + J.owner + '의 주문입니다.')), '');
    st.auth = me + ' · 역할 ' + J.role;
    push('인증: 서버가 요청에 실린 로그인 정보를 확인해, 보낸 사람이 ' + me + '이고 역할이 ' + J.role + '임을 알아냅니다. 여기까지는 "누구인가"만 확인한 것입니다. ' + id + '번 주문을 봐도 되는지는 아직 아무도 따지지 않았습니다.', '');
    if (c.check === 'role') {
      st.url = J.why === 'filter' ? 'deny' : 'pass';
      if (J.why === 'filter') {
        push('.requestMatchers("/orders/**").hasRole("USER"): URL 규칙이 역할을 봅니다. park의 역할은 ADMIN이고 USER가 아니므로 여기에서 거절합니다. 컨트롤러는 실행되지 않고, 주문이 있는지도 조회하지 않았습니다.', 'bad');
        st.resp = STATUS[403];
        push('응답은 403 Forbidden입니다. 주문 번호가 무엇이든, 없는 번호여도 같은 응답입니다. 주소 모양과 역할만 보고 판단했기 때문입니다.', 'bad');
      } else push('.requestMatchers("/orders/**").hasRole("USER"): URL 규칙이 역할을 봅니다. kim의 역할은 USER이므로 통과합니다. 역할은 "어떤 종류의 사용자인가"만 말해 줍니다. 주소 끝의 ' + id + '번이 누구의 주문인지는 이 규칙이 알지 못합니다.', id === '2' ? 'bad' : '');
    } else {
      st.url = 'pass';
      push('.anyRequest().authenticated(): URL 규칙은 로그인한 사용자인지만 봅니다. ' + me + '은 로그인했으므로 통과합니다. 이 규칙은 주소 끝의 ' + id + '번이 누구의 주문인지 알지 못합니다.', '');
    }
    if (J.ctl) {
      st.look = id;
      if (c.check === 'owner404') {
        st.ctl = J.why;
        if (J.why === 'owner') push('orders.findByIdAndOwner(' + id + ', "' + me + '"): 컨트롤러가 "번호가 ' + id + '이고 주인이 ' + me + '인 주문"을 찾습니다. 조건에 맞는 주문이 있습니다.', 'good');
        else push('orders.findByIdAndOwner(' + id + ', "' + me + '"): 컨트롤러가 "번호가 ' + id + '이고 주인이 ' + me + '인 주문"을 찾습니다. 그런 주문은 없습니다. ' + (J.owner ? id + '번 주문은 있지만 주인이 ' + J.owner + '입니다. 조건에 맞지 않습니다. ' : id + '번 주문 자체가 없습니다. ') + '어느 쪽이든 코드에서는 똑같이 "없음"으로 끝납니다.', J.owner ? 'good' : '');
      } else {
        if (!J.owner) { st.ctl = 'notfound'; push('orders.findById(' + id + '): 컨트롤러가 번호로 주문을 조회합니다. ' + id + '번 주문은 없습니다. 404로 응답하기로 합니다.', ''); }
        else {
          push('orders.findById(' + id + '): 컨트롤러가 번호로 주문을 조회합니다. ' + J.owner + '의 주문이 나옵니다.', '');
          st.ctl = J.why;
          if (J.why === 'nocheck') push('return o: 조회한 주문을 그대로 돌려줍니다. 주문의 주인(' + J.owner + ')과 로그인한 사용자(' + me + ')를 비교하는 코드가 어디에도 없습니다.', J.owner === me ? '' : 'bad');
          else if (J.why === 'owner') push('o.owner().equals(auth.getName()): 주문의 주인(' + J.owner + ')과 로그인한 사용자(' + me + ')를 비교합니다. 같으므로 통과합니다.', 'good');
          else if (J.why === 'admin') push('소유자 확인과 역할 확인: 주문의 주인(' + J.owner + ')과 로그인한 사용자(' + me + ')는 다릅니다. 하지만 ' + me + '의 권한 목록에 ROLE_ADMIN이 있으므로 통과합니다.', 'good');
          else push('o.owner().equals(auth.getName()): 주문의 주인(' + J.owner + ')과 로그인한 사용자(' + me + ')를 비교합니다. 다릅니다.' + (c.check === 'ownerAdmin' ? ' ' + me + '의 권한 목록에 ROLE_ADMIN도 없습니다.' : '') + ' FORBIDDEN 예외를 던집니다.', 'good');
        }
      }
      st.resp = STATUS[J.st]; st.body = J.body;
      if (J.st === 200) push('응답은 200 OK이고, 본문에 ' + J.owner + '의 주문(상품과 배송지 주소)이 담겨 ' + me + '에게 갑니다.' + (J.why === 'nocheck' && J.owner !== me ? ' 로그인은 정상적으로 했고 서버의 모든 규칙을 통과했는데, 남의 주문이 보였습니다.' : ''), J.why === 'nocheck' && J.owner !== me ? 'bad' : 'good');
      else if (J.st === 403) push('응답은 403 Forbidden입니다. 본문에 주문 내용은 없습니다. 다만 없는 번호를 넣으면 404가 나오므로, 403이라는 응답에서 "' + id + '번 주문은 있다"는 것은 알 수 있습니다.', 'good');
      else push('응답은 404 Not Found입니다. 본문에 주문 내용은 없습니다.' + (J.why === 'notmine' && J.owner ? ' 없는 번호를 넣었을 때와 똑같은 응답이라, 요청한 사람은 ' + id + '번 주문이 있는지조차 알 수 없습니다.' : ''), J.why === 'notmine' && J.owner ? 'good' : '');
    }
    var WHY = { filter: 'URL 규칙 (컨트롤러 실행 전)', nocheck: '소유자 확인 없이 조회함', notfound: '조회해 보니 없는 주문', owner: '소유자 확인: 주인이 맞음', notowner: '소유자 확인: 주인이 아님', notmine: '내 주문 가운데 없음', admin: '주인은 아니지만 ADMIN 역할' };
    var bodyText = J.body ? J.body + '의 주문 (' + (J.body === me ? '본인' : '다른 회원') + ')' : '없음';
    if (J.why === 'nocheck' && J.owner !== me && c.check === 'login') sum.push('인증(누구인지 확인)과 인가(이 자원을 봐도 되는지 확인)는 서로 다른 일입니다. 로그인만 확인하는 서버에서는 주소의 번호만 바꿔 남의 자원을 볼 수 있습니다. 번호가 1, 2, 3처럼 이어져 있으면 차례로 넣어 보는 것만으로 다른 사람의 주문이 모두 드러납니다. 자원을 돌려주기 전에 "이 자원의 주인이 지금 로그인한 사용자인가"를 서버 코드에서 확인해야 합니다.');
    if (J.why === 'nocheck' && J.owner !== me && c.check === 'role') sum.push(me === 'kim' ? '역할은 "USER인가 ADMIN인가"만 말해 줍니다. kim과 lee는 둘 다 USER라서 역할 규칙으로는 둘을 구별할 수 없습니다. "자기 것만"은 역할이 아니라 소유자 비교로 막습니다.' : '역할 규칙은 통과했지만 누구의 주문인지는 확인하지 않았습니다.');
    if (J.why === 'filter') sum.push('URL 규칙은 컨트롤러보다 앞에서 주소와 역할만 보고 판단합니다. 주문을 조회하기 전이라 누구의 주문인지 알 수 없고, 없는 번호에도 같은 403이 나옵니다. "주인만" 같은 조건은 자원을 조회한 뒤의 코드에서만 판단할 수 있습니다.');
    if (J.why === 'notowner') sum.push('403은 "그 자원은 있지만 당신에게는 허용되지 않는다"는 뜻으로 읽힙니다. 없는 번호에는 404가 나오므로, 번호를 바꿔 가며 응답을 비교하면 어떤 번호의 주문이 실제로 있는지 알 수 있습니다. 그것까지 숨기려면 남의 자원에도 404로 답하는 방식을 씁니다.');
    if (J.why === 'notmine' && J.owner) sum.push('남의 주문과 없는 주문에 똑같이 404로 답하면 요청한 사람은 둘을 구별할 수 없습니다. HTTP 표준도 자원이 있다는 사실을 숨기려 할 때 403 대신 404로 답해도 된다고 적고 있습니다. 대신 정당한 사용자도 권한 문제인지 주소를 잘못 쓴 것인지 응답만으로는 알기 어렵습니다.');
    if (J.why === 'admin') sum.push('고객센터 직원처럼 남의 주문을 봐야 하는 사람은 역할로 허용합니다. 실제 서비스의 규칙은 대개 "주인이거나, 그 일을 맡은 역할이거나"처럼 소유자 확인과 역할 확인을 함께 씁니다.');
    if (me === 'park' && (J.why === 'notowner' || (J.why === 'notmine' && J.owner))) sum.push('ADMIN이라고 저절로 허용되지는 않습니다. 서버는 코드에 적힌 규칙대로만 판단하고, 이 코드는 주인만 허용합니다.');
    if (J.st === 200 && J.owner === me) sum.push('자기 주문은 어느 방식에서나 보입니다. 방식의 차이는 남의 주문을 요청할 때 드러납니다.');
    if (J.why === 'notfound' || (J.why === 'notmine' && !J.owner)) sum.push('없는 주문에는 404로 답합니다. 같은 서버에서 lee의 주문(2번)을 요청했을 때의 응답과 비교해 보세요. 응답이 다르면 "그 번호의 주문이 있다"는 것이 드러납니다.');
    return { events: ev, summary: sum, j: J, same99: same99, row: [STATUS[J.st], bodyText, WHY[J.why]] };
  },
  render: function (v, sim, t, H, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : null, J = sim.j;
    if (!s) { H.text(v, '실행을 누르면 요청이 서버의 확인을 차례로 지나갑니다.'); return; }
    H.table(v, ['주문 번호', '주인', '내용'], [['1', 'kim', '키보드 · 서울시 가나동 1'], ['2', 'lee', '노트북 · 부산시 다라동 2']].map(function (r) { return { cells: [{ v: r[0], cls: s.look === r[0] ? 'hot' : '' }, { v: r[1], cls: r[1] === J.me ? 'good' : '' }, r[2]] }; }), '서버에 저장된 주문 (99번은 없음)');
  },
  // 그림: 왼쪽의 요청이 가운데 서버의 세 확인(인증, URL 규칙, 컨트롤러의 코드)을 위에서 아래로 지나고, 컨트롤러가 오른쪽 저장소의 주문을 조회한다.
  draw: function (P, sim, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : { req: false, auth: '', url: '', ctl: '', look: '', resp: '', body: '' }, J = sim.j, c = sim.c, n = shown.length;
    P.size(680, 326);
    P.box('req', 16, 44, 172, 78, { cls: s.req ? 'wait' : 'ghost', title: J.me + ' (역할 ' + J.role + ')', sub: ['GET /orders/' + c.target, J.me === 'kim' ? '주문 1번의 주인' : '자기 주문 없음'] });
    P.region('srv', 204, 12, 258, 250, '서버');
    P.box('g1', 216, 44, 234, 54, { cls: (s.auth ? 'good' : 'ghost') + (n === 2 ? ' now' : ''), title: '1. 인증: 누구인가', sub: s.auth ? '확인됨: ' + s.auth : '아직 확인 전' });
    P.box('g2', 216, 116, 234, 54, { cls: (s.url === 'pass' ? 'good' : s.url === 'deny' ? 'bad' : 'ghost') + (n === 3 ? ' now' : ''), title: '2. URL 규칙', sub: !s.url ? '아직 확인 전' : (c.check === 'role' ? 'USER 역할인가: ' : '로그인했는가: ') + (s.url === 'pass' ? '통과' : '거절') });
    P.box('g3', 216, 188, 234, 54, { cls: { '': s.look ? 'hot' : 'ghost', nocheck: J.owner === J.me ? 'plain' : 'bad', notfound: 'plain', owner: 'good', notowner: 'good', notmine: 'good', admin: 'good' }[s.ctl], title: '3. 컨트롤러의 코드', sub: { '': s.resp && !J.ctl ? '실행되지 않음' : s.look ? '주문을 조회함' : '아직 실행 전', nocheck: '주인 확인 없이 돌려줌', notfound: '없는 주문: 404', owner: '주인이 맞음: 허용', notowner: '주인이 아님: 403', notmine: '내 주문 가운데 없음: 404', admin: 'ADMIN 역할이라 허용' }[s.ctl] });
    P.region('db', 478, 12, 186, 250, '주문 저장소');
    [['1', 'kim', '키보드'], ['2', 'lee', '노트북'], ['99', '', '없는 주문']].forEach(function (o, i) {
      var hit = s.look === o[0], shown200 = hit && s.body;
      P.box('o' + o[0], 490, 44 + i * 72, 162, 54, { cls: (!o[1] ? 'ghost' : shown200 ? (s.body === J.me || s.ctl === 'admin' ? 'good' : 'bad') : o[1] === J.me ? 'wait' : 'plain') + (hit ? ' now' : ''), title: o[0] + '번' + (o[1] ? ' · 주인 ' + o[1] : ''), sub: o[2] });
    });
    if (s.req) P.arrow('a0', 'req:r', 'g1:l', {});
    if (s.url) P.arrow('a1', 'g1:b', 'g2:t', {});
    if (s.look) P.arrow('a2', 'g2:b', 'g3:t', {});
    if (s.look) P.arrow('a3', 'g3:r', 'o' + s.look + ':l', { cls: s.body ? (s.body === J.me || s.ctl === 'admin' ? 'good' : 'bad') : 'mut', label: '조회' });
    P.box('res', 16, 276, 648, 38, { cls: !s.resp ? 'ghost' : J.st === 200 ? (J.why === 'nocheck' && J.owner !== J.me ? 'bad' : 'good') : 'plain', title: '응답', right: !s.resp ? '처리 중' : s.resp + (s.body ? ' · ' + s.body + '의 주문이 ' + J.me + '에게 보임' : ' · 주문 내용 없음') });
    P.note('요청은 서버 안에서 위에서 아래로 세 확인을 지납니다. 빨간 주문 상자는 주인이 아닌 사람에게 보인 주문입니다.');
  },
  assume: '서른 가지 조합 모두를 이 PC에서 스프링 부트 4.1.1과 스프링 시큐리티 7.1.1 서버를 127.0.0.1에 띄우고 화면과 같은 구조의 코드로 실행해, 응답 코드와 본문에 담긴 주문의 주인, 컨트롤러가 실행됐는지, 코드의 어느 갈래에서 판단이 났는지를 대조했습니다. 주문 저장소는 데이터베이스 대신 메모리의 표로 만들었고, 로그인 방법은 HTTP Basic을 썼습니다(세션이나 토큰으로 로그인해도 인가의 결과는 같습니다). 로그인하지 않은 요청은 어느 방식에서나 401이 나오는 것을 같은 서버에서 확인했으며, 그 내용은 "시큐리티 필터 체인" 실습에서 다룹니다. 남의 자원에 403 대신 404로 답해 자원이 있다는 사실을 숨길 수 있다는 것은 RFC 9110 15.5.4절(403)과 15.5.5절(404)에 적힌 내용입니다. 403과 404 가운데 무엇이 옳은지는 정해져 있지 않고 서비스가 고르는 것입니다. 실제 서비스에서는 응답 코드 외에 응답 시간의 차이로도 자원이 있는지 드러날 수 있는데, 이 실습에서는 다루지 않았습니다. 소유자 확인을 컨트롤러에 적었지만 서비스 계층에 두거나 메서드 보안(@PreAuthorize, @PostAuthorize)으로 적기도 하며, 그 내용은 "메서드 보안" 실습에서 이어집니다. 주문 번호를 추측하기 어려운 값(UUID 등)으로 바꾸는 것은 번호를 짐작하기 어렵게 할 뿐 소유자 확인을 대신하지 못합니다. 이 문장은 일반적인 보안 권고(OWASP의 Broken Access Control 설명)를 따른 것이며 실행으로 확인한 내용이 아닙니다.',
});

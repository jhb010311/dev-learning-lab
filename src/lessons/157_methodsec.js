Lab.register({
  id: 'methodsec', nav: '메서드 보안', cat: '인증', mode: 'step',
  title: '메서드에 붙인 권한 검사는 언제 실행되고 언제 빠지나',
  intro: '주소(URL)가 아니라 메서드에 "누가 이 메서드를 실행해도 되는가"를 적어 두는 방법이 메서드 보안입니다. @PreAuthorize는 메서드를 실행하기 전에, @PostAuthorize는 메서드가 값을 돌려준 뒤에 식을 계산해 거짓이면 거부합니다. 그런데 이 애노테이션은 붙여 두기만 해서는 동작하지 않을 때가 있습니다. 설정과 부르는 방식, 로그인한 사용자를 바꿔 가며 검사가 실행되는지, 메서드 본문이 실행되는지 확인합니다.',
  terms: ['메서드 보안(@PreAuthorize, @PostAuthorize)', '인증과 인가', '프록시(Proxy)', '자기 호출(Self-invocation)', 'SecurityContext'],
  controls: [
    { id: 'enable', label: '설정 클래스에 @EnableMethodSecurity를 붙였다', type: 'check', value: false },
    { id: 'm', label: '부르는 메서드와 거기에 붙은 애노테이션', type: 'select', value: 'role', options: [['role', 'deleteAll() · @PreAuthorize("hasRole(\'ADMIN\')")'], ['arg', 'ordersOf("kim") · @PreAuthorize("#owner == authentication.name")'], ['post', 'findOrder(1) · @PostAuthorize("returnObject.owner == authentication.name")']], hint: 'findOrder(1)이 돌려주는 주문 1번의 주인은 kim입니다.' },
    { id: 'who', label: '로그인한 사용자', type: 'select', value: 'kim', options: [['kim', 'kim · 역할 USER'], ['lee', 'lee · 역할 USER'], ['admin', 'park · 역할 ADMIN']] },
    { id: 'call', label: '부르는 방식', type: 'select', value: 'ext', options: [['ext', '컨트롤러(다른 빈)에서 직접 부른다'], ['self', '같은 클래스의 다른 메서드를 거쳐서 부른다']] },
  ],
  presets: [
    { t: '처음 설정으로', d: '@PreAuthorize를 붙였는데, USER인 kim이 deleteAll을 실행합니다.', v: { enable: false, m: 'role', who: 'kim', call: 'ext' } },
    { t: '@EnableMethodSecurity를 붙이면', d: '메서드 본문이 실행되기 전에 거부됩니다.', v: { enable: true, m: 'role', who: 'kim', call: 'ext' } },
    { t: 'ADMIN이 부르면', d: '식이 참이라 본문이 실행됩니다.', v: { enable: true, m: 'role', who: 'admin', call: 'ext' } },
    { t: '인자와 로그인한 사용자를 비교', d: 'lee가 kim의 주문 목록을 요청합니다. 본문 실행 전에 거부됩니다.', v: { enable: true, m: 'arg', who: 'lee', call: 'ext' } },
    { t: '돌려줄 값을 보고 판단', d: '본문은 실행되고, 값이 나가기 직전에 거부됩니다.', v: { enable: true, m: 'post', who: 'lee', call: 'ext' } },
    { t: '같은 클래스 안에서 부르면', d: '프록시를 거치지 않아 검사가 빠집니다.', v: { enable: true, m: 'role', who: 'kim', call: 'self' } },
  ],
  M: {
    role: { name: 'deleteAll', call: 'deleteAll()', wrap: 'nightlyCleanUp', wcall: 'nightlyCleanUp()', ann: '@PreAuthorize("hasRole(\'ADMIN\')")', expr: 'hasRole(\'ADMIN\')', ret: '"모두 삭제함"' },
    arg: { name: 'ordersOf', call: 'ordersOf("kim")', wrap: 'summary', wcall: 'summary("kim")', ann: '@PreAuthorize("#owner == authentication.name")', expr: '#owner == authentication.name', ret: '"kim의 주문 목록"' },
    post: { name: 'findOrder', call: 'findOrder(1)', wrap: 'receipt', wcall: 'receipt(1)', ann: '@PostAuthorize("returnObject.owner == authentication.name")', expr: 'returnObject.owner == authentication.name', ret: '주문 1번 (주인 kim)' },
  },
  code: function (c) {
    var m = this.M[c.m], self = c.call === 'self';
    var cfg = '@Configuration\n' + (c.enable ? '@EnableMethodSecurity          // 이것이 있어야 아래의 애노테이션이 동작한다\n' : '// @EnableMethodSecurity 가 없다\n') + 'class SecurityConfig { }\n\n';
    var method = {
      role: '    @PreAuthorize("hasRole(\'ADMIN\')")                 // 메서드를 실행하기 전에 확인\n    public String deleteAll() {\n        orders.clear();\n        return "모두 삭제함";\n    }\n',
      arg: '    @PreAuthorize("#owner == authentication.name")    // 인자와 로그인한 사용자를 비교\n    public String ordersOf(String owner) {\n        return owner + "의 주문 목록";\n    }\n',
      post: '    @PostAuthorize("returnObject.owner == authentication.name")   // 돌려줄 값을 보고 확인\n    public Order findOrder(long id) {\n        return orders.get(id);            // 주문 1번의 주인은 kim\n    }\n',
    }[c.m];
    var wrap = { role: '\n    public String nightlyCleanUp() {          // 애노테이션이 없는 메서드\n        return deleteAll();                   // this.deleteAll() 과 같다\n    }\n', arg: '\n    public String summary(String owner) {     // 애노테이션이 없는 메서드\n        return ordersOf(owner);               // this.ordersOf(owner) 와 같다\n    }\n', post: '\n    public Order receipt(long id) {           // 애노테이션이 없는 메서드\n        return findOrder(id);                 // this.findOrder(id) 와 같다\n    }\n' }[c.m];
    var who = { kim: 'kim (ROLE_USER)', lee: 'lee (ROLE_USER)', admin: 'park (ROLE_ADMIN)' }[c.who];
    return cfg + '@Service\nclass OrderService {\n' + method + (self ? wrap : '') + '}\n\n@RestController\nclass OrderController {\n    private final OrderService orderService;       // 스프링이 넣어 준 빈\n    OrderController(OrderService orderService) { this.orderService = orderService; }\n\n    @GetMapping("/try")\n    Object call() {                                // 지금 로그인한 사용자: ' + who + '\n        return orderService.' + (self ? m.wcall : m.call) + ';\n    }\n}';
  },
  label: function (c) { return (c.enable ? '설정 있음' : '설정 없음') + ' · ' + this.M[c.m].call + ' · ' + { kim: 'kim(USER)', lee: 'lee(USER)', admin: 'park(ADMIN)' }[c.who] + ' · ' + (c.call === 'ext' ? '다른 빈에서' : '같은 클래스 안에서'); },
  columns: ['권한 검사', '메서드 본문', '부른 쪽이 받는 것'],
  // 결과만 계산한다 (실제 스프링 시큐리티 실행과 대조하는 부분)
  judge: function (c) {
    var pass = c.m === 'role' ? c.who === 'admin' : c.who === 'kim';            // 식이 참인가
    var checked = !!c.enable && c.call === 'ext', denied = checked && !pass;
    return { pass: pass, proxy: !!c.enable, checked: checked, denied: denied, body: !denied || c.m === 'post', why: checked ? '' : !c.enable ? 'off' : 'self' };
  },
  simulate: function (c) {
    var J = this.judge(c), m = this.M[c.m], self = c.call === 'self', ev = [], sum = [];
    var me = c.who === 'admin' ? 'park' : c.who, role = c.who === 'admin' ? 'ADMIN' : 'USER';
    var st = { boot: false, called: false, wrap: false, check: '', body: false, got: '' };
    function push(s, k) { ev.push({ s: s, k: k || '', snap: JSON.parse(JSON.stringify(st)) }); }
    var exprWhy = c.m === 'role' ? me + '의 권한은 ROLE_' + role + '입니다. ' + (J.pass ? 'ADMIN 역할이 있으므로 참입니다.' : 'ADMIN 역할이 없으므로 거짓입니다.')
      : c.m === 'arg' ? '#owner는 메서드에 넘어온 인자 owner의 값 "kim"이고, authentication.name은 로그인한 사용자의 이름 "' + me + '"입니다. ' + (J.pass ? '같으므로 참입니다.' : '다르므로 거짓입니다.')
        : 'returnObject는 방금 메서드가 돌려준 주문이고 그 owner는 "kim"입니다. authentication.name은 로그인한 사용자의 이름 "' + me + '"입니다. ' + (J.pass ? '같으므로 참입니다.' : '다르므로 거짓입니다.');
    st.boot = true;
    if (c.enable) push('애플리케이션이 뜰 때: @EnableMethodSecurity가 있으므로, 스프링 시큐리티가 @PreAuthorize나 @PostAuthorize가 붙은 메서드를 가진 빈을 프록시(대리 객체)로 감쌉니다. 컨트롤러가 주입받는 orderService는 실제 객체가 아니라 이 프록시입니다.', 'good');
    else push('애플리케이션이 뜰 때: 설정 클래스에 @EnableMethodSecurity가 없습니다. 애노테이션은 메서드에 붙은 표시일 뿐이고, 그것을 읽어 검사해 줄 것이 없습니다. 프록시는 만들어지지 않고, 컨트롤러는 실제 객체를 그대로 주입받습니다. 오류나 경고는 나오지 않습니다.', 'bad');
    st.called = true;
    push('orderService.' + (self ? m.wcall : m.call) + ': 컨트롤러가 메서드를 부릅니다. 지금 로그인한 사용자는 ' + me + '(역할 ' + role + ')입니다. ' + (c.enable ? '호출은 프록시에 먼저 도착합니다.' : '프록시가 없으므로 호출이 실제 객체의 메서드로 바로 갑니다.'), '');
    if (self) {
      st.wrap = true;
      push(m.wcall + ' 실행: ' + (c.enable ? '프록시가 보니 ' + m.wrap + '에는 애노테이션이 없습니다. 검사할 것이 없으므로 실제 객체의 ' + m.wrap + '에 그대로 넘깁니다. ' : '') + '이 메서드 안에서 ' + m.name + ' 메서드를 부릅니다. 같은 클래스 안의 호출은 this.' + m.name + '(...) 호출과 같고, this는 프록시가 아니라 실제 객체 자신입니다.', '');
      if (c.enable) { st.check = 'skip'; push('this.' + m.name + '(...): 호출이 프록시를 거치지 않고 실제 객체 안에서 바로 넘어갑니다. ' + m.ann + ' 애노테이션을 읽어 검사하는 것은 프록시인데, 프록시가 이 호출을 보지 못합니다. 권한 검사는 실행되지 않습니다.', J.pass ? '' : 'bad'); }
    }
    if (J.checked && c.m !== 'post') {
      st.check = J.pass ? 'pass' : 'deny';
      push('프록시의 검사 (메서드 실행 전): ' + m.ann + '의 식을 계산합니다. ' + exprWhy + (J.pass ? ' 실제 객체의 메서드로 넘깁니다.' : ' 프록시가 AuthorizationDeniedException을 던지고, 실제 객체의 메서드는 부르지 않습니다.'), J.pass ? 'good' : 'bad');
    }
    if (J.checked && c.m === 'post') { st.check = 'wait'; push('프록시: @PostAuthorize는 메서드가 돌려준 값을 보고 판단하므로, 검사하기 전에 먼저 실제 객체의 메서드를 실행합니다.', ''); }
    if (J.body) {
      st.body = true;
      push(m.call + ' 본문 실행: ' + (c.m === 'role' ? '주문을 모두 지우고 "모두 삭제함"을 돌려줍니다.' : c.m === 'arg' ? 'kim의 주문 목록을 만들어 돌려줍니다.' : '주문 1번을 찾아 돌려줍니다. 이 주문의 주인은 kim입니다.') + (!J.checked && !J.pass ? ' 권한 검사를 거치지 않았으므로, 지금 로그인한 사용자가 실행해서는 안 되는 메서드가 그대로 실행됐습니다.' : ''), !J.checked && !J.pass ? 'bad' : '');
    }
    if (J.checked && c.m === 'post') {
      st.check = J.pass ? 'pass' : 'deny';
      push('프록시의 검사 (메서드가 값을 돌려준 뒤): ' + m.ann + '의 식을 계산합니다. ' + exprWhy + (J.pass ? ' 돌려준 값을 그대로 부른 쪽에 넘깁니다.' : ' 프록시가 돌려준 값을 버리고 AuthorizationDeniedException을 던집니다. 주문은 부른 쪽에 전달되지 않지만, 메서드 본문은 이미 실행된 뒤입니다.'), J.pass ? 'good' : 'bad');
    }
    st.got = J.denied ? '예외 AuthorizationDeniedException' : m.ret;
    push('부른 쪽(컨트롤러): ' + (J.denied ? 'AuthorizationDeniedException을 받습니다. 이것은 AccessDeniedException의 한 종류이고, 웹 요청을 처리하는 중이었다면 스프링 시큐리티가 403 응답으로 바꿉니다.' : m.ret + '을 받습니다.' + (!J.checked && !J.pass ? ' 거부됐어야 할 호출이 정상적으로 끝났습니다.' : '')), J.denied ? 'good' : !J.checked && !J.pass ? 'bad' : 'good');
    var checkText = J.checked ? (J.pass ? '실행됨: 통과' : '실행됨: 거부') : J.why === 'off' ? '실행되지 않음 (@EnableMethodSecurity 없음)' : '실행되지 않음 (프록시를 거치지 않음)';
    sum.push('권한 검사는 "' + checkText + '", 메서드 본문은 ' + (J.body ? '실행됐고' : '실행되지 않았고') + ', 부른 쪽은 ' + st.got + '을 받았습니다.');
    if (J.why === 'off') sum.push('@EnableMethodSecurity가 없으면 @PreAuthorize와 @PostAuthorize는 아무 일도 하지 않습니다. 오류도 나지 않으므로, 애노테이션을 붙였다는 것만으로 안심하면 안 됩니다. 권한이 없는 사용자로 실제로 불러 보는 테스트로 확인합니다.' + (J.pass ? ' 지금은 식이 참인 사용자라서 결과만 보면 차이가 없습니다. 로그인한 사용자를 바꿔 보세요.' : ''));
    if (J.why === 'self') sum.push('같은 클래스 안에서 부르면(자기 호출) 프록시를 거치지 않으므로 검사가 빠집니다. @Transactional이 같은 클래스 안의 호출에서 동작하지 않는 것과 같은 원리입니다. 검사가 필요한 메서드는 다른 빈에서 부르게 하거나, 바깥에서 불리는 메서드(' + m.wrap + ')에도 애노테이션을 붙입니다.' + (J.pass ? ' 지금은 식이 참인 사용자라서 결과만 보면 차이가 없습니다.' : ''));
    if (J.checked && c.m === 'role') sum.push('@PreAuthorize는 본문을 실행하기 전에 식을 계산하고, 거짓이면 본문을 한 줄도 실행하지 않습니다. 주소가 아니라 메서드에 걸어 두었으므로, 이 메서드를 어느 컨트롤러에서 부르든 같은 검사를 받습니다.');
    if (J.checked && c.m === 'arg') sum.push('#owner처럼 메서드의 인자를 식에 쓸 수 있어서 "자기 것만"이라는 규칙을 적을 수 있습니다. 주소와 역할만 보는 URL 규칙으로는 적기 어려운 조건입니다. ' + (c.who === 'admin' ? 'ADMIN인 park도 거부된 것은, 이 식이 역할을 묻지 않고 이름만 비교하기 때문입니다.' : '역할이 같은 kim과 lee가 이 식에서는 구별됩니다.'));
    if (J.checked && c.m === 'post') sum.push('@PostAuthorize는 돌려줄 값을 봐야 판단할 수 있을 때 씁니다. 본문이 먼저 실행된다는 점에 주의합니다. 조회하는 메서드에는 괜찮지만, 저장이나 삭제처럼 무언가를 바꾸는 메서드에 쓰면 거부되기 전에 이미 바뀌어 있습니다.');
    return { events: ev, summary: sum, j: J, me: me, role: role, row: [checkText, J.body ? '실행됨' : '실행되지 않음', st.got] };
  },
  render: function (v, sim, t, H, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : null, J = sim.j, c = sim.c, m = this.M[c.m];
    if (!s) { H.text(v, '실행을 누르면 애플리케이션이 뜰 때부터 차례로 진행합니다.'); return; }
    var ln = H.lanes(v);
    H.lane(ln, '서비스 빈', J.proxy ? '프록시로 감싸 둠' : '프록시 없음 (실제 객체 그대로)', J.proxy ? 'good' : 'bad');
    H.lane(ln, '권한 검사', { '': J.checked ? '아직 실행 전' : s.got ? '실행되지 않음' : '아직 실행 전', skip: '실행되지 않음 (프록시를 거치지 않음)', wait: '본문이 끝난 뒤에 실행할 예정', pass: '식이 참: 통과', deny: '식이 거짓: 거부' }[s.check], { '': s.got && !J.checked ? 'hot' : 'none', skip: 'hot', wait: 'wait', pass: 'good', deny: 'bad' }[s.check]);
    H.lane(ln, '메서드 본문', s.body ? '실행됨' : s.got ? '실행되지 않음' : '아직 실행 전', s.body ? (J.pass ? 'good' : 'hot') : 'none');
    H.table(v, ['항목', '값'], [
      { cells: ['로그인한 사용자', sim.me + ' · 권한 ROLE_' + sim.role] },
      { cells: ['검사할 식', m.expr] },
      { cells: ['식의 결과', { v: J.pass ? '참 (허용해야 하는 호출)' : '거짓 (거부해야 하는 호출)', cls: J.pass ? 'good' : 'bad' }] },
    ], '이번 호출');
    H.counters(v, [[s.got || '아직 실행 중', '부른 쪽이 받는 것']]);
  },
  // 그림: 위의 컨트롤러가 아래의 orderService 빈을 부른다. 빈 안의 윗줄이 프록시(권한 검사), 아랫줄이 실제 객체의 메서드다. 같은 클래스 안의 호출은 프록시를 지나지 않고 옆으로 넘어간다.
  draw: function (P, sim, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : { boot: false, called: false, wrap: false, check: '', body: false, got: '' }, J = sim.j, c = sim.c, m = this.M[c.m], self = c.call === 'self', px = self ? 0.17 : 0.7;
    P.size(680, 340);
    P.box('caller', 16, 12, 648, 44, { cls: s.called ? 'wait' : 'ghost', title: '컨트롤러 · 로그인: ' + sim.me + ' (' + sim.role + ')', right: 'orderService.' + (self ? m.wcall : m.call) });
    P.region('bean', 16, 70, 648, 204, 'orderService 빈');
    P.box('proxy', 28, 98, 624, 62, { cls: !s.boot || !J.proxy ? 'ghost' : s.check === 'pass' ? 'good' : s.check === 'deny' ? 'bad' : s.check === 'skip' ? 'hot' : 'plain', title: J.proxy || !s.boot ? '프록시: 호출을 먼저 받아 권한을 검사한다' : '프록시 없음 (@EnableMethodSecurity가 없다)', sub: ['검사할 식  ' + m.expr, !J.proxy && s.boot ? '검사해 줄 것이 없음' : { '': '아직 검사 전', skip: '이 호출을 보지 못함: 검사하지 않음', wait: '본문이 끝난 뒤에 검사', pass: '식이 참: 통과', deny: '식이 거짓: 거부' }[s.check]] });
    if (self) P.box('wrap', 28, 180, 190, 64, { cls: s.wrap ? 'plain' : 'ghost', title: m.wcall, sub: ['애노테이션 없음', s.wrap ? '실행됨' : '아직 실행 전'] });
    P.box('target', 250, 180, 402, 64, { cls: s.body ? (!J.checked && !J.pass ? 'bad' : 'good') : s.got ? 'ghost' : 'plain', title: m.call + ' 본문', sub: [c.m === 'post' ? '@PostAuthorize가 붙음' : '@PreAuthorize가 붙음', s.body ? '실행됨' : s.got ? '실행되지 않음' : '아직 실행 전'] });
    if (s.called) P.arrow('a1', 'caller:b:' + px, 'proxy:t:' + px, { cls: J.proxy ? '' : 'dash' });
    if (self && s.wrap) P.arrow('a2', 'proxy:b:' + px, 'wrap:t', { cls: J.proxy ? '' : 'dash' });
    if (self && s.body) P.arrow('a3', 'wrap:r', 'target:l', { cls: J.pass ? 'mut' : 'bad', label: 'this' });
    if (!self && s.body) P.arrow('a4', 'proxy:b:' + px, 'target:t', { cls: J.proxy ? (J.pass ? 'good' : 'hot') : 'dash' });
    P.box('res', 16, 288, 648, 38, { cls: !s.got ? 'ghost' : J.denied ? 'plain' : !J.checked && !J.pass ? 'bad' : 'good', title: '부른 쪽이 받는 것', right: s.got || '아직 실행 중' });
    P.note('호출은 위에서 아래로 내려갑니다. 프록시가 있고 호출이 프록시를 지나갈 때에만 권한 검사가 실행됩니다. 점선 화살표는 프록시가 없어 그대로 지나간 호출, "this" 화살표는 같은 클래스 안에서 프록시를 거치지 않고 넘어간 호출입니다. 프록시 상자가 빨간색이면 검사에서 거부한 것이고, 본문 상자가 빨간색이면 거부됐어야 하는데 실행된 것입니다.');
  },
  assume: '서른여섯 가지 조합 모두를 이 PC의 스프링 시큐리티 7.1.1(스프링 프레임워크 7.0.9, JDK 21)에서 화면과 같은 구조의 코드로 실행해 대조했습니다. 조합의 대조는 웹 서버 없이 스프링 컨텍스트에서 서비스 빈의 메서드를 직접 불러서 했으며, 로그인한 사용자는 SecurityContext에 직접 넣었습니다. 권한 검사가 실행됐는지는 검사할 때마다 불리는 AuthorizationEventPublisher 빈으로 세었고, 메서드 본문이 실행됐는지, 부른 쪽이 받은 값이나 예외의 종류, 빈이 프록시인지를 함께 확인했습니다. 거부될 때 던져지는 AuthorizationDeniedException이 AccessDeniedException의 한 종류라는 것도 실행으로 확인했습니다. 웹 요청에서 이 예외가 403 응답이 된다는 것은 스프링 부트 4.1.1 서버를 127.0.0.1에 띄워 따로 확인했습니다. 컨트롤러가 deleteAll()을 부르는 주소에 USER인 kim으로 요청하니 403이 나오고 본문은 실행되지 않았으며, ADMIN인 park으로 요청하니 200이 나왔습니다. 식에서 #owner처럼 인자의 이름을 쓰려면 컴파일할 때 -parameters 옵션이 필요합니다. 이 옵션 없이 컴파일해 실행했더니 #owner가 비어 있어 주인인 kim의 호출도 거부됐습니다(스프링 부트의 빌드 도구는 이 옵션을 기본으로 켠다고 문서에 나와 있으나 그 부분은 확인하지 않았습니다). 로그인 정보가 전혀 없는 상태에서 검사가 걸린 메서드를 부르면 AuthorizationDeniedException이 아니라 AuthenticationCredentialsNotFoundException이 나왔습니다. 화면의 본문 코드(orders.clear() 등)는 뜻을 보이려고 줄여 적은 것이며, 실행할 때는 본문이 실행된 횟수를 세었습니다. 스프링 부트가 이 설정을 대신 켜 주지는 않았습니다. 같은 스프링 부트 서버에서 @EnableMethodSecurity만 빼고 실행하니 USER인 kim의 요청에도 200이 나오고 본문이 실행됐습니다. 같은 클래스 안의 호출에서 검사가 빠지는 것은 프록시 방식의 일반적인 한계이고, "프록시와 자기 호출" 실습에서 자세히 다룹니다. @PreFilter, @PostFilter, @Secured, 직접 만든 빈을 식에서 부르는 방법은 다루지 않았습니다.',
});

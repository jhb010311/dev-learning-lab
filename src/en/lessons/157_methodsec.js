Lab.register({
  id: 'methodsec', nav: 'Method security', cat: 'Authentication', mode: 'step',
  title: 'When does an authorization check on a method run, and when is it skipped?',
  intro: 'Method security is a way to write "who may run this method" on a method instead of on a URL. @PreAuthorize evaluates its expression before the method runs, and @PostAuthorize evaluates its expression after the method returns a value. If the expression is false, the call is denied. But these annotations sometimes do nothing just because you added them.',
  terms: ['Method security (@PreAuthorize, @PostAuthorize)', 'Authentication and authorization', 'Proxy', 'Self-invocation', 'SecurityContext'],
  controls: [
    { id: 'enable', label: 'The configuration class has @EnableMethodSecurity', type: 'check', value: false },
    { id: 'm', label: 'The method that is called and the annotation on it', type: 'select', value: 'role', options: [['role', 'deleteAll() · @PreAuthorize("hasRole(\'ADMIN\')")'], ['arg', 'ordersOf("kim") · @PreAuthorize("#owner == authentication.name")'], ['post', 'findOrder(1) · @PostAuthorize("returnObject.owner == authentication.name")']], hint: 'The owner of order #1 that findOrder(1) returns is kim.' },
    { id: 'who', label: 'Logged-in user', type: 'select', value: 'kim', options: [['kim', 'kim · role USER'], ['lee', 'lee · role USER'], ['admin', 'park · role ADMIN']] },
    { id: 'call', label: 'How it is called', type: 'select', value: 'ext', options: [['ext', 'Called directly from a controller (another bean)'], ['self', 'Called through another method of the same class']] },
  ],
  presets: [
    { t: 'Default settings', d: '@PreAuthorize is on the method, but kim, who has the role USER, runs deleteAll.', v: { enable: false, m: 'role', who: 'kim', call: 'ext' } },
    { t: 'With @EnableMethodSecurity', d: 'The call is denied before the method body runs.', v: { enable: true, m: 'role', who: 'kim', call: 'ext' } },
    { t: 'When ADMIN calls', d: 'The expression is true, so the body runs.', v: { enable: true, m: 'role', who: 'admin', call: 'ext' } },
    { t: 'Compare an argument with the logged-in user', d: 'lee asks for the order list of kim. The call is denied before the body runs.', v: { enable: true, m: 'arg', who: 'lee', call: 'ext' } },
    { t: 'Decide from the returned value', d: 'The body runs, and the call is denied just before the value goes out.', v: { enable: true, m: 'post', who: 'lee', call: 'ext' } },
    { t: 'When called inside the same class', d: 'The call does not pass through the proxy, so the check is skipped.', v: { enable: true, m: 'role', who: 'kim', call: 'self' } },
  ],
  M: {
    role: { name: 'deleteAll', call: 'deleteAll()', wrap: 'nightlyCleanUp', wcall: 'nightlyCleanUp()', ann: '@PreAuthorize("hasRole(\'ADMIN\')")', expr: 'hasRole(\'ADMIN\')', ret: '"Deleted all"' },
    arg: { name: 'ordersOf', call: 'ordersOf("kim")', wrap: 'summary', wcall: 'summary("kim")', ann: '@PreAuthorize("#owner == authentication.name")', expr: '#owner == authentication.name', ret: '"kim\'s orders"' },
    post: { name: 'findOrder', call: 'findOrder(1)', wrap: 'receipt', wcall: 'receipt(1)', ann: '@PostAuthorize("returnObject.owner == authentication.name")', expr: 'returnObject.owner == authentication.name', ret: 'order #1 (owner kim)' },
  },
  code: function (c) {
    var m = this.M[c.m], self = c.call === 'self';
    var cfg = '@Configuration\n' + (c.enable ? '@EnableMethodSecurity          // the annotations below work only with this\n' : '// there is no @EnableMethodSecurity\n') + 'class SecurityConfig { }\n\n';
    var method = {
      role: '    @PreAuthorize("hasRole(\'ADMIN\')")                 // check before the method runs\n    public String deleteAll() {\n        orders.clear();\n        return "Deleted all";\n    }\n',
      arg: '    @PreAuthorize("#owner == authentication.name")    // compare the argument with the logged-in user\n    public String ordersOf(String owner) {\n        return owner + "\'s orders";\n    }\n',
      post: '    @PostAuthorize("returnObject.owner == authentication.name")   // check by looking at the returned value\n    public Order findOrder(long id) {\n        return orders.get(id);            // the owner of order #1 is kim\n    }\n',
    }[c.m];
    var wrap = { role: '\n    public String nightlyCleanUp() {          // a method without an annotation\n        return deleteAll();                   // same as this.deleteAll()\n    }\n', arg: '\n    public String summary(String owner) {     // a method without an annotation\n        return ordersOf(owner);               // same as this.ordersOf(owner)\n    }\n', post: '\n    public Order receipt(long id) {           // a method without an annotation\n        return findOrder(id);                 // same as this.findOrder(id)\n    }\n' }[c.m];
    var who = { kim: 'kim (ROLE_USER)', lee: 'lee (ROLE_USER)', admin: 'park (ROLE_ADMIN)' }[c.who];
    return cfg + '@Service\nclass OrderService {\n' + method + (self ? wrap : '') + '}\n\n@RestController\nclass OrderController {\n    private final OrderService orderService;       // the bean that Spring injected\n    OrderController(OrderService orderService) { this.orderService = orderService; }\n\n    @GetMapping("/try")\n    Object call() {                                // the user logged in now: ' + who + '\n        return orderService.' + (self ? m.wcall : m.call) + ';\n    }\n}';
  },
  label: function (c) { return (c.enable ? 'Config present' : 'Config missing') + ' · ' + this.M[c.m].call + ' · ' + { kim: 'kim(USER)', lee: 'lee(USER)', admin: 'park(ADMIN)' }[c.who] + ' · ' + (c.call === 'ext' ? 'From another bean' : 'Inside the same class'); },
  columns: ['Authorization check', 'Method body', 'What the caller receives'],
  // Only the result is calculated (the part checked against real Spring Security execution)
  judge: function (c) {
    var pass = c.m === 'role' ? c.who === 'admin' : c.who === 'kim';            // is the expression true?
    var checked = !!c.enable && c.call === 'ext', denied = checked && !pass;
    return { pass: pass, proxy: !!c.enable, checked: checked, denied: denied, body: !denied || c.m === 'post', why: checked ? '' : !c.enable ? 'off' : 'self' };
  },
  simulate: function (c) {
    var J = this.judge(c), m = this.M[c.m], self = c.call === 'self', ev = [], sum = [];
    var me = c.who === 'admin' ? 'park' : c.who, role = c.who === 'admin' ? 'ADMIN' : 'USER';
    var st = { boot: false, called: false, wrap: false, check: '', body: false, got: '' };
    function push(s, k) { ev.push({ s: s, k: k || '', snap: JSON.parse(JSON.stringify(st)) }); }
    var exprWhy = c.m === 'role' ? me + ' has the authority ROLE_' + role + '. ' + (J.pass ? 'That includes the ADMIN role, so the expression is true.' : 'That does not include the ADMIN role, so the expression is false.')
      : c.m === 'arg' ? '#owner is the value "kim" of the argument owner passed to the method, and authentication.name is the name of the logged-in user, "' + me + '". ' + (J.pass ? 'They are equal, so the expression is true.' : 'They differ, so the expression is false.')
        : 'returnObject is the order the method has just returned, and its owner is "kim". authentication.name is the name of the logged-in user, "' + me + '". ' + (J.pass ? 'They are equal, so the expression is true.' : 'They differ, so the expression is false.');
    st.boot = true;
    if (c.enable) push('When the application starts: @EnableMethodSecurity is present, so Spring Security wraps each bean that has methods with @PreAuthorize or @PostAuthorize in a proxy (a stand-in object). The orderService that the controller receives is not the real object but this proxy.', 'good');
    else push('When the application starts: the configuration class has no @EnableMethodSecurity. An annotation is only a mark on a method, and nothing reads it to do the check. No proxy is created, and the controller receives the real object as it is. No error or warning appears.', 'bad');
    st.called = true;
    push('orderService.' + (self ? m.wcall : m.call) + ': the controller calls the method. The user logged in now is ' + me + ' (role ' + role + '). ' + (c.enable ? 'The call arrives at the proxy first.' : 'There is no proxy, so the call goes straight to the method of the real object.'), '');
    if (self) {
      st.wrap = true;
      push(m.wcall + ' runs: ' + (c.enable ? 'the proxy sees that ' + m.wrap + ' has no annotation. There is nothing to check, so it passes the call as is to ' + m.wrap + ' of the real object. ' : '') + 'Inside this method, it calls the ' + m.name + ' method. A call inside the same class is the same as the call this.' + m.name + '(...), and this is not the proxy but the real object itself.', '');
      if (c.enable) { st.check = 'skip'; push('this.' + m.name + '(...): the call goes straight on inside the real object without passing through the proxy. It is the proxy that reads the ' + m.ann + ' annotation and does the check, and the proxy does not see this call. The authorization check does not run.', J.pass ? '' : 'bad'); }
    }
    if (J.checked && c.m !== 'post') {
      st.check = J.pass ? 'pass' : 'deny';
      push('Proxy check (before the method runs): it evaluates the expression of ' + m.ann + '. ' + exprWhy + (J.pass ? ' It passes the call on to the method of the real object.' : ' The proxy throws AuthorizationDeniedException and does not call the method of the real object.'), J.pass ? 'good' : 'bad');
    }
    if (J.checked && c.m === 'post') { st.check = 'wait'; push('Proxy: @PostAuthorize decides by looking at the value the method returns, so before checking, it first runs the method of the real object.', ''); }
    if (J.body) {
      st.body = true;
      push(m.call + ' body runs: ' + (c.m === 'role' ? 'it deletes all the orders and returns "Deleted all".' : c.m === 'arg' ? 'it builds the order list of kim and returns it.' : 'it finds order #1 and returns it. The owner of this order is kim.') + (!J.checked && !J.pass ? ' The call did not go through an authorization check, so a method that the logged-in user must not run was run as it is.' : ''), !J.checked && !J.pass ? 'bad' : '');
    }
    if (J.checked && c.m === 'post') {
      st.check = J.pass ? 'pass' : 'deny';
      push('Proxy check (after the method returns a value): it evaluates the expression of ' + m.ann + '. ' + exprWhy + (J.pass ? ' It passes the returned value on to the caller as it is.' : ' The proxy discards the returned value and throws AuthorizationDeniedException. The order is not delivered to the caller, but the method body has already been executed.'), J.pass ? 'good' : 'bad');
    }
    st.got = J.denied ? 'Exception AuthorizationDeniedException' : m.ret;
    push('Caller (the controller): ' + (J.denied ? 'it receives AuthorizationDeniedException. This is a kind of AccessDeniedException, and if a web request was being handled, Spring Security turns it into a 403 response.' : 'it receives ' + m.ret + '.' + (!J.checked && !J.pass ? ' A call that should have been denied finished normally.' : '')), J.denied ? 'good' : !J.checked && !J.pass ? 'bad' : 'good');
    var checkText = J.checked ? (J.pass ? 'Executed: passed' : 'Executed: denied') : J.why === 'off' ? 'Not executed (no @EnableMethodSecurity)' : 'Not executed (did not pass through the proxy)';
    if (J.why === 'off') sum.push('Without @EnableMethodSecurity, @PreAuthorize and @PostAuthorize do nothing. No error appears either, so do not feel safe just because you added the annotation. Confirm it with a test that actually calls the method as a user who has no permission.' + (J.pass ? ' Right now the user is one for whom the expression is true, so the result looks the same either way.' : ''));
    if (J.why === 'self') sum.push('If you call a method inside the same class (self-invocation), the call does not pass through the proxy, so the check is skipped. The principle is the same as @Transactional not working on calls inside the same class. Have the method that needs the check called from another bean, or put the annotation on the method that is called from outside (' + m.wrap + ') too.' + (J.pass ? ' Right now the user is one for whom the expression is true, so the result looks the same either way.' : ''));
    if (J.checked && c.m === 'role') sum.push('@PreAuthorize evaluates the expression before the body runs, and if it is false, it does not run a single line of the body. It is attached to the method, not to a URL, so no matter which controller calls this method, the call gets the same check.');
    if (J.checked && c.m === 'arg') sum.push('A method argument such as #owner can be used in the expression, so you can write a rule like "only your own". A URL rule that looks only at the address and the role can hardly express such a condition. ' + (c.who === 'admin' ? 'park, who is an ADMIN, was denied too, because this expression does not ask about the role and compares only the names.' : 'This expression tells kim and lee apart even though they have the same role.'));
    if (J.checked && c.m === 'post') sum.push('@PostAuthorize is used when you can decide only by looking at the returned value. Note that the body runs first. That is fine for a method that reads data, but if you use it on a method that changes something, such as a save or a delete, the change has already been made before the call is denied.');
    return { events: ev, summary: sum, j: J, me: me, role: role, row: [checkText, J.body ? 'Executed' : 'Not executed', st.got] };
  },
  render: function (v, sim, t, H, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : null, J = sim.j, c = sim.c, m = this.M[c.m];
    if (!s) { H.text(v, 'Click Run to go step by step, starting from application startup.'); return; }
    H.table(v, ['Item', 'Value'], [
      { cells: ['Logged-in user', sim.me + ' · authority ROLE_' + sim.role] },
      { cells: ['Expression to evaluate', m.expr] },
      { cells: ['Result of the expression', { v: J.pass ? 'True (a call that should be allowed)' : 'False (a call that should be denied)', cls: J.pass ? 'good' : 'bad' }] },
    ], 'This call');
  },
  // Diagram: the controller above calls the orderService bean below. Inside the bean, the upper row is the proxy (the authorization check) and the lower row is the method of the real object. A call inside the same class does not pass through the proxy but moves sideways.
  draw: function (P, sim, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : { boot: false, called: false, wrap: false, check: '', body: false, got: '' }, J = sim.j, c = sim.c, m = this.M[c.m], self = c.call === 'self', px = self ? 0.17 : 0.7;
    P.size(680, 340);
    P.box('caller', 16, 12, 648, 44, { cls: s.called ? 'wait' : 'ghost', title: 'Controller · logged in: ' + sim.me + ' (' + sim.role + ')', right: 'orderService.' + (self ? m.wcall : m.call) });
    P.region('bean', 16, 70, 648, 204, 'orderService bean');
    P.box('proxy', 28, 98, 624, 62, { cls: !s.boot || !J.proxy ? 'ghost' : s.check === 'pass' ? 'good' : s.check === 'deny' ? 'bad' : s.check === 'skip' ? 'hot' : 'plain', title: J.proxy || !s.boot ? 'Proxy: receives the call first and checks authorization' : 'No proxy (there is no @EnableMethodSecurity)', sub: ['Expression to evaluate  ' + m.expr, !J.proxy && s.boot ? 'Nothing to do the check' : { '': 'Not checked yet', skip: 'Does not see this call: no check', wait: 'Checks after the body finishes', pass: 'Expression true: passed', deny: 'Expression false: denied' }[s.check]] });
    if (self) P.box('wrap', 28, 180, 190, 64, { cls: s.wrap ? 'plain' : 'ghost', title: m.wcall, sub: ['No annotation', s.wrap ? 'Executed' : 'Not executed yet'] });
    P.box('target', 250, 180, 402, 64, { cls: s.body ? (!J.checked && !J.pass ? 'bad' : 'good') : s.got ? 'ghost' : 'plain', title: m.call + ' body', sub: [c.m === 'post' ? 'Has @PostAuthorize' : 'Has @PreAuthorize', s.body ? 'Executed' : s.got ? 'Not executed' : 'Not executed yet'] });
    if (s.called) P.arrow('a1', 'caller:b:' + px, 'proxy:t:' + px, { cls: J.proxy ? '' : 'dash' });
    if (self && s.wrap) P.arrow('a2', 'proxy:b:' + px, 'wrap:t', { cls: J.proxy ? '' : 'dash' });
    if (self && s.body) P.arrow('a3', 'wrap:r', 'target:l', { cls: J.pass ? 'mut' : 'bad', label: 'this' });
    if (!self && s.body) P.arrow('a4', 'proxy:b:' + px, 'target:t', { cls: J.proxy ? (J.pass ? 'good' : 'hot') : 'dash' });
    P.box('res', 16, 288, 648, 38, { cls: !s.got ? 'ghost' : J.denied ? 'plain' : !J.checked && !J.pass ? 'bad' : 'good', title: 'What the caller receives', right: s.got || 'Still running' });
    P.note('The call goes from top to bottom. A dashed arrow is a call that went straight through because there is no proxy, and the "this" arrow is a call inside the same class that went on without passing through the proxy. A red proxy box means the check denied the call, and a red body box means the body ran although the call should have been denied.');
  },
  assume: 'All 36 combinations were run and checked on the PC used to write this lab with Spring Security 7.1.1 (Spring Framework 7.0.9, JDK 21), using code of the same structure as on the screen. The combinations were checked without a web server, by calling the methods of the service bean directly from a Spring context, and the logged-in user was put directly into the SecurityContext. Whether the authorization check ran was counted with an AuthorizationEventPublisher bean, which is called each time a check is made, and whether the method body ran, the value or the kind of exception the caller received, and whether the bean was a proxy were checked together. That AuthorizationDeniedException, which is thrown on denial, is a kind of AccessDeniedException was also checked by execution. That this exception becomes a 403 response in a web request was checked separately by starting a Spring Boot 4.1.1 server on 127.0.0.1. A request as kim, who has USER, to the URL where the controller calls deleteAll() returned 403 and the body did not run, and a request as park, who has ADMIN, returned 200. To use the name of an argument such as #owner in an expression, the -parameters option is needed at compile time. When the code was compiled without this option and run, #owner was empty and even the call by kim, the owner, was denied (the documentation says that the build tools of Spring Boot turn this option on by default, but that part was not verified). When a method with a check is called with no login information at all, AuthenticationCredentialsNotFoundException came out, not AuthorizationDeniedException. The body code on the screen (orders.clear() and so on) is abbreviated to show the meaning, and in the actual run, the number of times the body ran was counted. Spring Boot did not turn this setting on by itself. On the same Spring Boot server, when it was run with only @EnableMethodSecurity removed, even the request from kim with USER got 200 and the body ran. That the check is skipped on a call inside the same class is a general limitation of the proxy approach, and it is covered in detail in the "Proxies and self-invocation" lab. @PreFilter, @PostFilter, @Secured, and calling a bean you made yourself from an expression were not covered.',
});

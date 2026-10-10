Lab.register({
  id: 'aop', nav: 'AOP: advice and pointcuts', cat: 'Spring', mode: 'step',
  title: 'Which methods does advice apply to, and in what order does it run?',
  intro: 'When work that many methods need in the same way, such as logging, is written in one class (an aspect), Spring adds that code before and after the method calls. The code that is added is called advice, and the expression that selects which methods it is added to is called a pointcut. Change the pointcut, the method that is called, the outcome of the method, and the number of aspects to see what runs and in what order.',
  terms: ['Aspect-oriented programming (AOP)', 'Advice', 'Pointcut', 'Aspect and @Order', 'Proxy'],
  controls: [
    { id: 'pc', label: 'Pointcut (the expression that selects which methods the advice applies to)', type: 'select', value: 'cls', options: [['cls', 'execution(* shop.OrderService.*(..))'], ['arg', 'execution(* shop.*.*(String))'], ['noarg', 'execution(* shop.OrderService.cancel())'], ['ann', '@annotation(shop.Audit)']] },
    { id: 'm', label: 'Method called from another bean', type: 'select', value: 'order', options: [['order', 'order(String) of OrderService'], ['cancel', 'cancel(Long) of OrderService · annotated with @Audit'], ['join', 'join(String) of MemberService · annotated with @Audit']] },
    { id: 'out', label: 'Outcome of that method', type: 'select', value: 'ex', options: [['ok', 'Returns a value normally'], ['ex', 'Throws an exception (IllegalStateException)']] },
    { id: 'second', label: 'Number of aspects and @Order', type: 'select', value: 'none', options: [['none', 'Only LogAspect'], ['log1', 'Two: LogAspect @Order(1), TimeAspect @Order(2)'], ['time1', 'Two: TimeAspect @Order(1), LogAspect @Order(2)']], hint: 'TimeAspect is a second aspect that has only a single @Around.' },
  ],
  presets: [
    { t: 'Default settings', d: 'The method throws an exception. The second part of @Around does not run, and @After runs.', v: { pc: 'cls', m: 'order', out: 'ex', second: 'none' } },
    { t: 'When the method returns normally', d: 'Four of the five kinds of advice run in a fixed order.', v: { pc: 'cls', m: 'order', out: 'ok', second: 'none' } },
    { t: 'A pointcut with empty parentheses', d: 'The pointcut says cancel(), and the advice does not apply to cancel(Long).', v: { pc: 'noarg', m: 'cancel', out: 'ok', second: 'none' } },
    { t: 'Selecting by annotation', d: 'If a method is annotated with @Audit, the advice applies to it even in another class.', v: { pc: 'ann', m: 'join', out: 'ok', second: 'none' } },
    { t: 'A method in the same class that the advice does not apply to', d: 'Nothing runs for order, which has no @Audit.', v: { pc: 'ann', m: 'order', out: 'ok', second: 'none' } },
    { t: 'With two aspects', d: 'LogAspect, which has the lower @Order value, wraps on the outside.', v: { pc: 'cls', m: 'order', out: 'ok', second: 'log1' } },
    { t: 'Swapping the @Order values', d: 'TimeAspect becomes the outer aspect. "Time end" is printed even when an exception is thrown.', v: { pc: 'cls', m: 'order', out: 'ex', second: 'time1' } },
  ],
  exprs: { cls: 'execution(* shop.OrderService.*(..))', arg: 'execution(* shop.*.*(String))', noarg: 'execution(* shop.OrderService.cancel())', ann: '@annotation(shop.Audit)' },
  code: function (c) {
    var E = this.exprs[c.pc], lo = c.second === 'log1' ? '@Order(1)\n' : c.second === 'time1' ? '@Order(2)\n' : '', to = c.second === 'log1' ? '@Order(2)' : '@Order(1)';
    var call = { order: 'orderService.order("keyboard");', cancel: 'orderService.cancel(7L);', join: 'memberService.join("kim");' }[c.m];
    function body(name, ret) { return '        System.out.println("' + name + ' body");\n        ' + (c.out === 'ex' && c.m === name ? 'throw new IllegalStateException("failed");' : 'return "' + ret + '";') + '\n'; }
    var log = '@Aspect\n@Component\n' + lo + 'class LogAspect {\n    @Pointcut("' + E + '")\n    void pick() { }                          // selects which methods the advice applies to\n\n' +
      '    @Around("pick()")\n    Object around(ProceedingJoinPoint pjp) throws Throwable {\n        System.out.println("Log @Around before");\n        Object result = pjp.proceed();       // passes the call inward\n        System.out.println("Log @Around after");\n        return result;\n    }\n\n' +
      '    @Before("pick()")\n    void before() { System.out.println("Log @Before"); }\n\n' +
      '    @AfterReturning("pick()")\n    void afterReturning() { System.out.println("Log @AfterReturning"); }\n\n' +
      '    @AfterThrowing("pick()")\n    void afterThrowing() { System.out.println("Log @AfterThrowing"); }\n\n' +
      '    @After("pick()")\n    void after() { System.out.println("Log @After"); }\n}\n\n';
    var time = c.second === 'none' ? '' : '@Aspect\n@Component\n' + to + '\nclass TimeAspect {\n    @Around("' + E + '")\n    Object time(ProceedingJoinPoint pjp) throws Throwable {\n        System.out.println("Time start");\n        try {\n            return pjp.proceed();\n        } finally {\n            System.out.println("Time end");    // runs even when an exception is thrown\n        }\n    }\n}\n\n';
    var svc = '@Service\nclass OrderService {\n    public String order(String item) {\n' + body('order', 'order completed') + '    }\n\n    @Audit\n    public String cancel(Long id) {\n' + body('cancel', 'cancellation completed') + '    }\n}\n\n' +
      '@Service\nclass MemberService {\n    @Audit\n    public String join(String name) {\n' + body('join', 'sign-up completed') + '    }\n}';
    return '// All the classes below are in the shop package\n// @Audit is an annotation written for this example (a marker put on methods)\n// Code that calls the method from another bean: ' + call + '\n\n' + log + time + svc;
  },
  label: function (c) { return { cls: 'OrderService.*(..)', arg: 'shop.*.*(String)', noarg: 'cancel()', ann: '@annotation(Audit)' }[c.pc] + ' · ' + { order: 'order(String)', cancel: 'cancel(Long)', join: 'join(String)' }[c.m] + ' · ' + (c.out === 'ok' ? 'normal' : 'exception') + ' · ' + { none: 'Log only', log1: 'Log outer, Time inner', time1: 'Time outer, Log inner' }[c.second]; },
  columns: ['Does the pointcut match this method?', 'Order of the printed lines', 'What the caller receives'],
  // Which of the three methods the pointcut matches, and whether the bean that contains the called method becomes a proxy
  match: function (c) {
    var T = { cls: { order: 1, cancel: 1, join: 0 }, arg: { order: 1, cancel: 0, join: 1 }, noarg: { order: 0, cancel: 0, join: 0 }, ann: { order: 0, cancel: 1, join: 1 } }[c.pc];
    var bean = c.m === 'join' ? 'MemberService' : 'OrderService', inBean = bean === 'MemberService' ? ['join'] : ['order', 'cancel'], picked = inBean.filter(function (x) { return T[x]; });
    return { hit: !!T[c.m], proxy: picked.length > 0, bean: bean, picked: picked };
  },
  simulate: function (c) {
    var M = this.match(c), ex = c.out === 'ex', ev = [], sum = [], m = c.m;
    var layers = c.second === 'none' ? ['log'] : c.second === 'log1' ? ['log', 'time'] : ['time', 'log'], two = layers.length > 1;
    var sig = { order: 'order(String)', cancel: 'cancel(Long)', join: 'join(String)' }[m], call = { order: 'orderService.order("keyboard")', cancel: 'orderService.cancel(7L)', join: 'memberService.join("kim")' }[m], ret = { order: '"order completed"', cancel: '"cancellation completed"', join: '"sign-up completed"' }[m];
    var st = { pc: '', bean: '', run: [], cur: '', skip: [], body: '', caller: '' };
    function push(s, k) { ev.push({ s: s, k: k, snap: JSON.parse(JSON.stringify(st)) }); }
    function print(line, s, k) { st.run.push(line); st.cur = line; push(s, k || ''); }
    var desc = {
      cls: 'execution(* shop.OrderService.*(..)) matches every method of the shop.OrderService class. The * at the front means any return type, the * in the position of the method name means any name, and (..) means any number of parameters.',
      arg: 'execution(* shop.*.*(String)) matches a method of any class in the shop package, with any name, that takes exactly one String.',
      noarg: 'execution(* shop.OrderService.cancel()) matches only a cancel method of OrderService that takes no parameters. Empty parentheses mean "no parameters", not "any parameters".',
      ann: '@annotation(shop.Audit) matches methods annotated with @Audit. It does not look at the class name or the method name.' }[c.pc];
    var why = {
      cls: { order: 'order is a method of OrderService, so it is matched.', cancel: 'cancel is a method of OrderService, so it is matched.', join: 'join is a method of MemberService, so it is not matched.' },
      arg: { order: 'order(String) takes one String, so it is matched.', cancel: 'cancel(Long) has a Long parameter, so it is not matched.', join: 'join(String) takes one String, so it is matched. The class is different, but being in the shop package is enough.' },
      noarg: { order: 'order is not named cancel, so it is not matched.', cancel: 'The actual method is cancel(Long), which has one parameter, so it is not matched. Having the same name does not help.', join: 'join is not a method of OrderService, so it is not matched.' },
      ann: { order: 'order has no @Audit, so it is not matched.', cancel: 'cancel is annotated with @Audit, so it is matched.', join: 'join is also annotated with @Audit, so it is matched. Which class the method belongs to does not matter.' } }[c.pc][m];
    push('When the application starts: Spring checks the pointcut against each method of the beans, one by one. ' + desc, '');
    st.pc = M.hit ? 'matched' : 'not matched'; st.bean = M.proxy ? 'proxy' : 'original object';
    push(sig + ' checked against the pointcut: ' + why + ' ' + (M.hit ? 'The ' + M.bean + ' bean is wrapped in a proxy (a stand-in object).' : M.proxy ? 'However, the ' + M.picked.join(', ') + ' method of the same class is matched, so the ' + M.bean + ' bean itself is wrapped in a proxy.' : M.bean + ' has no matched method at all, so no proxy is created and the original object stays as the bean. There is no error or warning.'), M.hit ? 'good' : 'bad');
    push(call + ': Another bean calls the method. ' + (M.hit ? 'The call reaches the proxy first. The proxy runs the advice that applies to this method in order, starting from the outside.' : M.proxy ? 'The call reaches the proxy, but the method is not matched, so the proxy adds nothing and passes the call on to the real object.' : 'There is no proxy, so the call goes straight to the method of the real object.'), '');
    if (M.hit) layers.forEach(function (a, i) {
      if (a === 'time') print('Time start', 'The @Around of TimeAspect: ' + (i === 0 ? 'TimeAspect has the lower @Order value, so it is the outer aspect and starts first. ' : 'TimeAspect has the higher @Order value, so it is the inner aspect and starts after the first part of LogAspect finishes. ') + 'It prints "Time start" and passes the call inward with pjp.proceed().');
      else {
        print('Log @Around before', 'The first part of the @Around of LogAspect: ' + (two ? (i === 0 ? 'LogAspect has the lower @Order value, so it is the outer aspect and starts first. ' : 'LogAspect has the higher @Order value, so it is the inner aspect and starts after TimeAspect. ') : '') + 'Within one aspect, @Around starts first. The lines written above pjp.proceed() run.');
        print('Log @Before', 'Call to pjp.proceed() → the @Before of LogAspect: When @Around passes the call inward, the @Before of the same aspect runs. ' + (two && i === 0 ? 'After that, the call moves on to the inner aspect.' : 'After that comes the method body.'));
      }
    });
    st.run.push(m + ' body'); st.cur = m + ' body'; st.body = ex ? 'ex' : 'ok';
    push(sig + ' body runs: It prints "' + m + ' body" and ' + (ex ? 'throws an IllegalStateException.' + (M.hit ? ' The exception goes out from the inside to the outside, back along the path by which the call came in.' : '') : 'returns ' + ret + '.' + (M.hit ? ' The returned value goes out back along the path by which the call came in.' : '')), ex ? 'bad' : '');
    if (M.hit) layers.slice().reverse().forEach(function (a) {
      if (a === 'time') print('Time end', 'The finally of TimeAspect: ' + (ex ? 'An exception came up from pjp.proceed(), but the line inside finally runs even on an exception. It prints "Time end", and the exception goes on outward unchanged.' : 'pjp.proceed() returned a value. It prints "Time end" inside finally and returns the received value outward unchanged.'));
      else if (!ex) {
        print('Log @AfterReturning', 'The @AfterReturning of LogAspect: It runs only when the inside returned a value normally. There was no exception, so @AfterThrowing does not run.', 'good');
        print('Log @After', 'The @After of LogAspect: It always runs, whether the method returned normally or threw an exception. Within the same aspect, it comes after @AfterReturning.');
        print('Log @Around after', 'The second part of the @Around of LogAspect: pjp.proceed() returned a value, so the lines written below it run. The @Around that started first in an aspect finishes last.');
      } else {
        print('Log @AfterThrowing', 'The @AfterThrowing of LogAspect: It runs only when an exception came out of the inside. It does not catch and remove the exception but only observes the exception passing through, so the exception keeps going outward. @AfterReturning does not run.', 'bad');
        print('Log @After', 'The @After of LogAspect: It runs even though an exception was thrown. It is similar to finally in Java. Within the same aspect, it comes after @AfterThrowing.');
        st.skip.push('Log @Around after'); st.cur = '';
        push('The second part of the @Around of LogAspect: pjp.proceed() threw an exception, so the "Log @Around after" line written below it does not run and the exception goes out unchanged. To run that line even on an exception, you must wrap the call in try-finally.', 'bad');
      }
    });
    st.cur = ''; st.caller = ex ? 'IllegalStateException' : ret;
    push('The caller: ' + (ex ? 'It receives an IllegalStateException.' + (M.hit ? ' No advice caught the exception, so the exception is passed on unchanged.' : '') : 'It receives ' + ret + '.' + (M.hit ? ' Advice ran around the call, but the value that comes back is unchanged.' : '')), ex ? 'bad' : 'good');
    var seq = st.run.slice();
    if (M.hit) sum.push('The pointcut matched the ' + sig + ' method, and the console printed ' + seq.length + ' lines in this order: ' + seq.join(' → ') + '. The caller received ' + (ex ? 'an ' : '') + st.caller + '.');
    else sum.push('The pointcut did not match the ' + sig + ' method, so no advice ran at all. The only line printed on the console is "' + m + ' body", and the caller received ' + (ex ? 'an ' : '') + st.caller + '.');
    if (!M.hit && c.pc === 'noarg' && m === 'cancel') sum.push('cancel() with empty parentheses matches only "a cancel that takes no parameters". To match it regardless of the parameters, write cancel(..).');
    if (!M.hit) sum.push('A method that the pointcut does not match runs exactly like an ordinary method call. Even when a mistake in the expression makes it match nothing, there is no error, so you must check that the advice actually runs.');
    if (M.hit && ex) sum.push('When an exception is thrown, @AfterThrowing and @After run, and @AfterReturning and the lines written below pjp.proceed() in @Around do not run. Put work that must be done in every case in @After, or wrap the call in try-finally inside @Around.');
    if (M.hit && !ex) sum.push('The order within one aspect is first part of @Around → @Before → method body → @AfterReturning → @After → second part of @Around. It has nothing to do with the order in which the methods are written in the class.');
    if (M.hit && two) sum.push('The aspect with the lower @Order value is the outer one. The outer aspect runs first on the way in and last on the way out. Right now, ' + (layers[0] === 'log' ? 'LogAspect' : 'TimeAspect') + ' is the outer one.');
    return { events: ev, summary: sum, hit: M.hit, proxy: M.proxy, bean: M.bean, layers: layers, seq: seq, row: [M.hit ? 'Matched' : 'Not matched', seq.join(' → '), st.caller] };
  },
  render: function (v, sim, t, H, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : null;
    if (!s) { H.text(v, 'Click Run to go through one step at a time.'); return; }
    var ln = H.lanes(v);
    H.lane(ln, 'Pointcut', s.pc ? 'Called method: ' + s.pc : 'Checking', s.pc === 'matched' ? 'good' : s.pc ? 'bad' : 'none');
    H.lane(ln, sim.bean + ' bean', s.bean ? (s.bean === 'proxy' ? 'Wrapped in a proxy' : 'No proxy (the original object as it is)') : 'Not decided yet', s.bean === 'proxy' ? 'hot' : s.bean ? 'wait' : 'none');
    H.table(v, ['Order', 'Line printed on the console', 'Printed by'], s.run.map(function (x, i) {
      var who = x.indexOf('Log ') === 0 ? 'LogAspect' : x.indexOf('Time ') === 0 ? 'TimeAspect' : 'Method body';
      return { cells: [String(i + 1), { v: x, cls: x === s.cur ? 'hot' : '' }, who] };
    }).concat(s.skip.map(function (x) { return { cls: 'gone', cells: ['-', { v: x + ' (did not run)', cls: 'bad' }, 'LogAspect'] }; })), 'Console output');
    H.counters(v, [[s.run.length + '', 'Lines printed so far'], [s.caller || 'Still running', 'What the caller receives']]);
  },
  // Diagram: The aspects are drawn as nested boxes. The call enters from the outer box and reaches the method body in the middle, and on the way out it leaves from the inner box first. The left cells are the advice that runs on the way in, and the right cells are the advice that runs on the way out.
  draw: function (P, sim, shown) {
    var c = sim.c, last = shown[shown.length - 1], s = last ? last.snap : { pc: '', bean: '', run: [], cur: '', skip: [], body: '', caller: '' };
    var layers = sim.layers, two = layers.length > 1, L = 8, R = 672, body = c.m + ' body';
    P.size(680, 316);
    function chip(id, x, y, w, line, name) {
      var i = s.run.indexOf(line), cls = i >= 0 ? (s.cur === line ? 'hot now' : 'good') : s.skip.indexOf(line) >= 0 ? 'bad' : 'ghost';
      P.box(id, x, y, w, 30, { cls: cls, title: (i >= 0 ? (i + 1) + '. ' : '') + name, center: true });
    }
    P.text('top', 340, 22, s.pc === 'not matched' ? 'The pointcut does not match this method. No advice runs.' : 'Left runs on the way in, right on the way out. The numbers show the order of execution.', { cls: s.pc === 'not matched' ? 'bad' : 'mut', anchor: 'middle' });
    layers.forEach(function (a, i) {
      var top = 34 + i * 28, h = 228 - i * 36, ord = c.second === 'none' ? '' : (c.second === 'log1') === (a === 'log') ? ' @Order(1) · outer' : ' @Order(2) · inner';
      P.region('lay_' + a, L, top, R - L, h, (a === 'log' ? 'LogAspect' : 'TimeAspect') + ord);
      if (a === 'log') {
        chip('la1', L + 8, 120, 112, 'Log @Around before', '@Around in'); chip('lb', L + 8, 156, 112, 'Log @Before', '@Before');
        chip('lr', R - 160, 84, 152, 'Log @AfterReturning', '@AfterReturning'); chip('lt', R - 160, 120, 152, 'Log @AfterThrowing', '@AfterThrowing');
        chip('lf', R - 160, 156, 152, 'Log @After', '@After'); chip('la2', R - 160, 192, 152, 'Log @Around after', '@Around out');
        L += 128; R -= 168;
      } else {
        chip('t1', L + 8, 138, 96, 'Time start', 'start'); chip('t2', R - 104, 138, 96, 'Time end', 'end');
        L += 112; R -= 112;
      }
    });
    var bi = s.run.indexOf(body);
    P.box('body', L + 8, 112, R - L - 16, 82, { cls: bi < 0 ? 'ghost' : s.cur === body ? (s.body === 'ex' ? 'bad now' : 'hot now') : s.body === 'ex' ? 'bad' : 'good', title: (bi >= 0 ? (bi + 1) + '. ' : '') + body, sub: bi < 0 ? 'Not run yet' : s.body === 'ex' ? 'Exception thrown' : 'Value returned', center: true });
    P.box('res', 8, 274, 664, 34, { cls: !s.caller ? 'ghost' : s.caller.indexOf('Exception') >= 0 ? 'bad' : 'good', title: 'What the caller receives', right: s.caller || 'Still running' });
    P.note('Each dashed box is one aspect. The call passes through the left cells of the outer box first and reaches the method body in the middle, and the result (a value or an exception) passes through the right cells of the inner box first on its way out. A red cell is a line that could not run because of the exception, and a cell that stays faded to the end is advice that does not apply in this case and did not run.');
  },
  assume: 'All 72 combinations were run on Spring Framework 7.0.9 (the version included in Spring Boot 4.1.1, with AspectJ weaver 1.9.25.1 and JDK 21) on this PC, using code with the same structure as on the screen, and these were checked against the results: whether the pointcut matches the method, the order of the lines printed on the console, what the caller receives, and whether the bean is a proxy. It was also confirmed by execution that all 72 results are the same when the advice methods are written in the class in the reverse order, and that the method body does not run when @Around does not call pjp.proceed(). Two things could not be confirmed by execution and follow the Spring documentation. First, the order of execution within one aspect has been defined as it is now since Spring Framework 5.2.7, and in older versions @After sometimes ran before @AfterReturning (this PC has no old version). Second, the order among aspects that have no @Order is undefined. The code on the screen assumes that @EnableAspectJAutoProxy is turned on (for the runs, it was put directly on the configuration class; the documentation says that in Spring Boot it is turned on automatically when the AOP starter is added, but this part was not confirmed by execution). The method is assumed to be called from another bean. When it is called from within the same class, the call does not go through the proxy and the advice does not run, which is covered in the "Proxies and self-invocation" lab. The pointcut method is named pick. On this PC, when it was named target, none of the advice of LogAspect ran, and there was no error (target is a word that has its own use in pointcut expressions).',
});

Lab.register({
  id: 'proxy', nav: 'Proxies and self-invocation', cat: 'Spring', mode: 'step',
  title: 'Why does the annotation have no effect?',
  intro: '@Transactional and @Async do not change the method itself. Spring registers a proxy (a stand-in object) in place of the bean and adds the extra behavior only to calls that come in through the proxy. So depending on where and how the method is called, the same annotation is either applied or ignored.',
  terms: ['Proxy', 'Self-invocation', 'Aspect-oriented programming (AOP)', 'JDK dynamic proxy and CGLIB', '@Async', '@Transactional'], ranks: ['aop', 'txspring'],
  controls: [
    { id: 'feat', label: 'Annotation on the method', type: 'select', value: 'tx', options: [['tx', '@Transactional'], ['async', '@Async']] },
    { id: 'path', label: 'How that method is called', type: 'select', value: 'self', options: [['ext', 'Called from another bean (a controller)'], ['self', 'Called from another method of the same class (this)'], ['priv', 'Called from the same class + the method is private'], ['inject', 'The bean injects itself and calls through that reference'], ['split', 'The method is moved to another bean and called there']] },
  ],
  presets: [
    { t: 'Default settings', q: 'What happens when a @Transactional method is called from another method of the same class (this)?', d: 'A @Transactional method is called from within the same class. No transaction is applied.', v: { feat: 'tx', path: 'self' } },
    { t: 'Calling from another bean', q: 'What if the @Transactional method is called from another bean (a controller)?', d: 'The call goes through the proxy, so the transaction is applied.', v: { feat: 'tx', path: 'ext' } },
    { t: 'Moving the method to another bean', q: 'What if the @Transactional method is moved to another bean and called there?', d: 'This is the most common way to solve the self-invocation problem.', v: { feat: 'tx', path: 'split' } },
    { t: 'Putting it on a private method', q: 'What if the @Transactional method is private and is called from the same class?', d: 'The proxy cannot intercept the call.', v: { feat: 'tx', path: 'priv' } },
    { t: 'Calling @Async from within the class', q: 'What if an @Async method is called from another method of the same class?', d: 'It does not run asynchronously, and the calling thread waits until it finishes.', v: { feat: 'async', path: 'self' } },
    { t: 'Calling @Async from another bean', q: 'What if an @Async method is called from another bean (a controller)?', d: 'It runs on a separate thread, and the caller returns immediately.', v: { feat: 'async', path: 'ext' } },
  ],
  code: function (c) {
    var tx = c.feat === 'tx', ann = tx ? '@Transactional' : '@Async', m = tx ? 'saveAll' : 'sendMail', body = tx ? '        orderDao.insert(a);\n        orderDao.insert(b);\n        throw new IllegalStateException();   // fails partway' : '        mailClient.send(mail);               // takes 3 seconds';
    var acc = c.path === 'priv' ? 'private' : 'public';
    if (c.path === 'ext') return '@RestController class OrderController {\n    private final OrderService orderService;   // what is injected is the proxy\n\n    @PostMapping("/orders")\n    void order() {\n        orderService.' + m + '();              // goes through the proxy\n    }\n}\n\n@Service class OrderService {\n    ' + ann + '\n    public void ' + m + '() {\n' + body + '\n    }\n}';
    if (c.path === 'split') return '@Service class OrderService {\n    private final ' + (tx ? 'OrderWriter writer' : 'MailSender sender') + ';   // another bean (a proxy)\n\n    public void placeOrder() {\n        ' + (tx ? 'writer' : 'sender') + '.' + m + '();                    // goes through the proxy\n    }\n}\n\n@Service class ' + (tx ? 'OrderWriter' : 'MailSender') + ' {\n    ' + ann + '\n    public void ' + m + '() {\n' + body + '\n    }\n}';
    return '@Service class OrderService {\n' + (c.path === 'inject' ? '    @Autowired @Lazy\n    private OrderService self;                 // the proxy of this same bean\n\n' : '') + '    public void placeOrder() {                 // called by the controller\n        ' + (c.path === 'inject' ? 'self.' + m + '();                        // goes through the proxy' : m + '();                             // same as this.' + m + '()') + '\n    }\n\n    ' + ann + '\n    ' + acc + ' void ' + m + '() {\n' + body + '\n    }\n}';
  },
  label: function (c) { return (c.feat === 'tx' ? '@Transactional' : '@Async') + ' · ' + { ext: 'called from another bean', self: 'called from the same class', priv: 'same class + private', inject: 'called after self injection', split: 'moved to another bean' }[c.path]; },
  columns: ['Did the call go through the proxy?', 'Annotation', 'Result'],
  simulate: function (c) {
    var tx = c.feat === 'tx', m = tx ? 'saveAll()' : 'sendMail()', via = c.path === 'ext' || c.path === 'inject' || c.path === 'split', ev = [], sum = [], res;
    var target = c.path === 'split' ? (tx ? 'OrderWriter' : 'MailSender') : 'OrderService';
    function push(s, k, snap) { ev.push({ s: s, k: k, snap: snap }); }
    var S = { caller: '', proxy: 'Waiting', target: 'Waiting', rows: [], thread: '', wait: '' };
    function snap(o) { Object.keys(o).forEach(function (k) { S[k] = o[k]; }); return JSON.parse(JSON.stringify(S)); }
    push('When the application starts, Spring finds a bean that has a method annotated with ' + (tx ? '@Transactional' : '@Async') + ' and registers, as the bean, a proxy that receives the calls in place of the original object. This proxy is what other beans receive by injection. A bean with no such method is registered as the original object itself.', '', snap({ caller: 'Not called yet' }));
    if (c.path === 'ext') push('The controller calls orderService.' + m + '. The reference that the controller holds is the proxy, so the call reaches the proxy first.', '', snap({ caller: 'Controller → proxy.' + m, proxy: 'Received the call' }));
    else {
      if (c.path === 'split') push('The controller calls orderService.placeOrder(). OrderService in this code has no annotated method, so Spring did not create a proxy for it. What the controller received by injection is the real object, and the real object receives the call directly.', '', snap({ caller: 'Controller → OrderService.placeOrder()', target: 'OrderService.placeOrder() running' })); else push('The controller calls orderService.placeOrder(). The proxy receives the call, but placeOrder() has no annotation, so the proxy passes the call on to the real object as it is.', '', snap({ caller: 'Controller → proxy.placeOrder()', proxy: 'Passed it on, nothing added', target: 'OrderService.placeOrder() running' }));
      if (c.path === 'self' || c.path === 'priv') push('Inside the real object, the code calls ' + m + '. This call is this.' + m + '. Here, this is the real object itself, not the proxy, so the call does not go through the proxy.' + (c.path === 'priv' ? ' On top of that, a proxy cannot override a private method, so there is no way to call the method from outside and no way to intercept it.' : ''), 'bad', snap({ caller: 'OrderService(this) → this.' + m, proxy: 'Does not see this call', target: m + ' runs' }));
      if (c.path === 'inject') push('The real object calls self.' + m + ' on the injected self reference. The self reference is the proxy of this same bean, so the call goes through the proxy again.', '', snap({ caller: 'OrderService → self (proxy).' + m, proxy: 'Received the call' }));
      if (c.path === 'split') push('The real object calls a method of another bean, ' + target + ': ' + m + '. The injected ' + target + ' reference is a proxy, so the call goes through the proxy.', '', snap({ caller: 'OrderService → ' + target + ' proxy.' + m, proxy: 'Received the call' }));
    }
    if (tx) {
      if (via) {
        push('Before the method runs, the proxy starts a transaction. Then it calls ' + m + ' of the real object.', '', snap({ proxy: 'Started a transaction', target: m + ' running' }));
        push('Order A and order B have been inserted with INSERT. They are in the same transaction and are not committed yet.', '', snap({ rows: [['Order A', 'Inserted (not committed)', 'hot'], ['Order B', 'Inserted (not committed)', 'hot']] }));
        push('An exception is thrown and goes out of the method. The proxy sees the exception and rolls back the transaction. Both INSERTs are undone.', 'good', snap({ proxy: 'Exception seen → rollback', target: 'Exception thrown', rows: [['Order A', 'Rolled back', 'bad'], ['Order B', 'Rolled back', 'bad']] }));
        res = 'Both rolled back (nothing left in the DB)';
      } else {
        push('No proxy is there to start a transaction. Order A is inserted with INSERT. There is no transaction, so this INSERT is committed as soon as it runs (auto-commit).', 'bad', snap({ rows: [['Order A', 'Committed', 'good']] }));
        push('Order B is inserted with INSERT. It is also committed right away.', '', snap({ rows: [['Order A', 'Committed', 'good'], ['Order B', 'Committed', 'good']] }));
        push('An exception is thrown, but there is no transaction to roll back. Orders A and B, which are already committed, stay in the DB as they are. The data of a failed operation is left half saved.', 'bad', snap({ target: 'Exception thrown', rows: [['Order A', 'Committed (cannot be undone)', 'bad'], ['Order B', 'Committed (cannot be undone)', 'bad']] }));
        res = 'Not rolled back (A and B stay in the DB)';
      }
    } else {
      if (via) {
        push('The proxy does not run the method itself but hands the execution over to a separate thread pool. Then it returns to the caller right away.', '', snap({ proxy: 'Task sent to the thread pool', thread: 'task-1 (separate thread)', wait: '0s' }));
        push('The caller does not wait. It runs the next code and returns the response. The mail is sent separately on the task-1 thread (3 seconds).', 'good', snap({ target: m + ' running (task-1)', wait: '0s' }));
        res = 'Ran asynchronously (caller waited 0s)';
      } else {
        push('No proxy is there to hand the task over to another thread. ' + m + ' is an ordinary method call and runs as it is on the calling thread (http-nio-exec-1).', 'bad', snap({ thread: 'http-nio-exec-1 (request thread)', wait: 'in progress' }));
        push('The request thread is tied up until the 3 seconds of sending the mail are over. The user receives the response 3 seconds late. There is no error and no warning, and the method simply runs synchronously.', 'bad', snap({ wait: '3s' }));
        res = 'Ran synchronously (caller waited 3s)';
      }
    }
    sum.push((via ? 'The call went through the proxy, so ' : 'The call did not go through the proxy, so ') + (tx ? '@Transactional was ' : '@Async was ') + (via ? 'applied.' : 'ignored.') + ' Result: ' + res + '.');
    if (!via) sum.push('A call within the same class does not pass through the proxy. It is easy to miss because the annotation is silently ignored, with no exception and no warning. The most common solution is to move the method to another bean, and another way is to inject the proxy of the bean itself and call through it.');
    if (c.path === 'priv') sum.push('A proxy is created by extending the original class or by implementing the same interfaces, so it cannot intercept a private method. Annotations like these have meaning only on methods that are called through the proxy.');
    if (c.path === 'inject') sum.push('This works, but a bean that injects itself is an awkward structure and looks like a circular dependency. Usually, the choice is to move the method to a separate bean.');
    return { events: ev, summary: sum, tx: tx, row: [via ? 'Went through' : 'Did not go through', via ? 'Applied' : 'Ignored', res] };
  },
  render: function (v, sim, t, H, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : null;
    if (!s) { H.text(v, 'Click Run to start.'); return; }
    H.title(v, 'Path of the call'); var ln = H.lanes(v);
    H.lane(ln, 'Call', s.caller, 'wait');
    H.lane(ln, 'Proxy', s.proxy, s.proxy.indexOf('Does not see') >= 0 ? 'bad' : s.proxy === 'Waiting' ? 'none' : 'hot');
    H.lane(ln, 'Real object', s.target, s.target === 'Waiting' ? 'none' : s.target.indexOf('Exception') >= 0 ? 'bad' : '');
  },
  // Diagram: The proxy (upper) and the real object (lower) are two different objects joined by a reference. A call that comes from outside goes through the proxy, and a call the real object makes with this does not.
  draw: function (P, sim, shown) {
    var c = sim.c, tx = sim.tx, m = tx ? 'saveAll()' : 'sendMail()', last = shown[shown.length - 1], s = last ? last.snap : { caller: '', proxy: 'Waiting', target: 'Waiting', rows: [], thread: '', wait: '' };
    var split = c.path === 'split', other = split ? (tx ? 'OrderWriter' : 'MailSender') : '', called = s.caller && s.caller !== 'Not called yet', at2 = split && s.caller.indexOf(other) >= 0, step = shown.length;
    var pcls = function (x) { return x.indexOf('Does not see') >= 0 ? 'bad' : x === 'Waiting' ? 'plain' : 'hot'; }, tcls = function (x) { return x.indexOf('Exception') >= 0 ? 'bad' : x === 'Waiting' ? 'plain' : 'wait'; }, short = function (x) { return x.replace('OrderService.', '').replace(' (task-1)', ''); };
    P.size(680, 300);
    P.box('ctrl', 16, 42, 104, 50, { cls: called ? 'wait' : 'plain', title: 'Controller', sub: 'another bean' });
    P.box('px1', 170, 36, 230, 62, { cls: split ? 'ghost' : pcls(s.proxy), title: 'OrderService proxy', sub: split ? 'Not created' : s.proxy });
    P.box('tg1', 170, 138, 230, 62, { cls: at2 ? 'wait' : tcls(s.target), title: 'Real OrderService', sub: at2 ? 'placeOrder() running' : short(s.target) });
    if (called) P.arrow('in', 'ctrl:r', split ? 'tg1:l' : 'px1:l', { label: 'call' });
    var entered = c.path === 'ext' ? step >= 3 && s.target !== 'Waiting' : called && step >= 2;
    if (!split) P.arrow('pass', 'px1:b', 'tg1:t', entered ? { label: 'passes on' } : { cls: 'mut', label: 'reference' });
    if ((c.path === 'self' || c.path === 'priv') && step >= 3) P.arrow('self', 'tg1:r:0.3', 'tg1:r:0.75', { cls: 'bad', label: 'this.' + m });
    if (c.path === 'inject' && step >= 3) P.arrow('self', 'tg1:l:0.6', 'px1:l:0.75', { cls: 'good', label: 'self.' + m });
    if (split) {
      P.box('px2', 430, 36, 234, 62, { cls: at2 ? pcls(s.proxy) : 'plain', title: other + ' proxy', sub: at2 ? s.proxy : 'Waiting' });
      P.box('tg2', 430, 138, 234, 62, { cls: at2 ? tcls(s.target) : 'plain', title: 'Real ' + other, sub: at2 && s.target.indexOf('placeOrder') < 0 ? short(s.target) : 'Waiting' });
      if (at2) P.arrow('out', 'tg1:r', 'px2:l:0.6', { cls: 'good', label: m });
      P.arrow('pass2', 'px2:b', 'tg2:t', at2 && step >= 4 ? { label: 'passes on' } : { cls: 'mut', label: 'reference' });
    }
    if (tx) [0, 1].forEach(function (i) { var r = s.rows[i]; P.box('row' + i, 16 + i * 330, 236, 318, 36, r ? { cls: r[2], title: r[0], right: r[1] } : { cls: 'ghost', title: i ? 'Order B' : 'Order A', right: 'None yet' }); });
    else {
      P.box('th', 16, 232, 318, 48, { cls: s.thread ? (s.thread.indexOf('task') === 0 ? 'good' : 'bad') : 'ghost', title: 'Thread that sends the mail', sub: s.thread || 'Not run yet' });
      P.box('wt', 346, 232, 318, 48, { cls: !s.wait ? 'ghost' : s.wait === '0s' ? 'good' : 'bad', title: 'Time the caller waited', sub: s.wait || '-' });
    }
    P.note('The upper box is the proxy, and the lower box is the real object. They are two different objects, and the proxy holds a reference to the real object and passes calls on to it. The red arrow, where the real object calls its own method with this, does not go through the proxy.');
  },
  assume: 'This lab is based on proxy-based AOP, which is the default in Spring (with AspectJ weaving, the annotations can also be applied to self-invocation, but that is uncommon). For @Async, @EnableAsync is assumed to be turned on. That each INSERT is committed right away when there is no transaction follows the auto-commit default of a JDBC connection. All 10 combinations were run and confirmed with @Transactional and @Async beans on a real Spring (Spring Framework 7.0.9). Only in calls that went through the proxy was a transaction open inside the method and no rows were left after the exception, and with self-invocation and with the private method the two rows stayed as they were. For @Async too, only the calls that went through the proxy ran on a separate thread (task-1), and with self-invocation the method ran to the end on the calling thread (the 3 seconds of sending the mail were shortened to 0.3 seconds for the test).',
});

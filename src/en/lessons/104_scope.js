Lab.register({
  id: 'scope', nav: 'Bean scopes', cat: 'Spring', mode: 'step',
  title: 'It is a prototype bean, so why is there only one object?',
  intro: 'A scope determines how many objects of a bean the container creates and how long they are used. Singleton means one per container, prototype means a new one every time the container is asked for the bean, and request means one per HTTP request. But when a singleton bean has a bean of another scope injected into it, something unexpected happens. Cart, OrderService and OrderController in this lab are classes made for this example.',
  terms: ['Bean scope', 'Spring bean', 'ObjectProvider', 'Scoped proxy', 'Proxy'],
  controls: [
    { id: 'scope', label: 'Scope of the Cart bean', type: 'select', value: 'prototype', options: [['singleton', 'singleton (used when no scope is specified)'], ['prototype', 'prototype'], ['request', 'request (HTTP request)']] },
    { id: 'get', label: 'How OrderService, a singleton, obtains the Cart', type: 'select', value: 'inject', options: [['inject', 'Has it injected through the constructor and keeps it in a field'], ['provider', 'Has an ObjectProvider injected and retrieves a Cart on each use'], ['proxy', 'Has a proxy of Cart injected (proxyMode)']] },
  ],
  presets: [
    { t: 'Default settings', q: 'How is the Cart used per request when a singleton OrderService has a prototype Cart injected through the constructor and keeps it in a field?', d: 'A prototype bean is injected into a singleton bean. However many requests you send, it is the same object.', v: { scope: 'prototype', get: 'inject' } },
    { t: 'Retrieving with ObjectProvider', q: 'What if the singleton OrderService has an ObjectProvider injected and retrieves a Cart on each use?', d: 'A new object is created each time one is retrieved.', v: { scope: 'prototype', get: 'provider' } },
    { t: 'With a singleton', q: 'What if you change the scope of the Cart bean to singleton?', d: 'However you obtain it, it is the only object in the container.', v: { scope: 'singleton', get: 'inject' } },
    { t: 'Injecting a request-scoped bean directly', q: 'What if you change the scope of the Cart bean to request and inject it directly through the constructor?', d: 'There is no request at startup, so the bean cannot be created. Startup fails.', v: { scope: 'request', get: 'inject' } },
    { t: 'request scope + ObjectProvider', q: 'What if the Cart bean has request scope and OrderService has an ObjectProvider injected and retrieves a Cart on each use?', d: 'Within the same request it is the same object, and a different request gets a different object.', v: { scope: 'request', get: 'provider' } },
    { t: 'request scope + proxy', q: 'What if the Cart bean has request scope and OrderService has a proxy of Cart injected (proxyMode)?', d: 'The code of OrderService stays as it is, and one object is used per request.', v: { scope: 'request', get: 'proxy' } },
    { t: 'prototype + proxy', q: 'What if the Cart bean is a prototype and OrderService has a proxy of Cart injected (proxyMode)?', d: 'A new object is created every time a method is called.', v: { scope: 'prototype', get: 'proxy' } },
  ],
  code: function (c) {
    var line = c.get === 'proxy' ? '@Scope(value = "' + c.scope + '", proxyMode = ScopedProxyMode.TARGET_CLASS)\n' : c.scope === 'singleton' ? '' : '@Scope("' + c.scope + '")\n';
    var cart = '@Component\n' + line + 'class Cart {' + (c.scope === 'singleton' && c.get !== 'proxy' ? '                         // singleton when no scope is specified' : '') + '\n    private static int created = 0;   // number of Cart objects created so far\n    private final int no;             // which object this is, in order of creation\n\n    Cart() {\n        created++;\n        no = created;\n    }\n\n    public int no() {\n        return no;\n    }\n}';
    var svc = c.get === 'provider'
      ? '@Component\nclass OrderService {                  // singleton, because no scope is specified\n    private final ObjectProvider<Cart> cartProvider;\n\n    OrderService(ObjectProvider<Cart> cartProvider) {\n        this.cartProvider = cartProvider;\n    }\n\n    int cartNo() {\n        Cart cart = cartProvider.getObject();   // asks the container on each use\n        return cart.no();\n    }\n}'
      : '@Component\nclass OrderService {                  // singleton, because no scope is specified\n    private final Cart cart;' + (c.get === 'proxy' ? '          // what comes in is a proxy of Cart' : '') + '\n\n    OrderService(Cart cart) {         // injection happens only once, when OrderService is created\n        this.cart = cart;\n    }\n\n    int cartNo() {\n        return cart.no();\n    }\n}';
    var ctl = '@RestController\nclass OrderController {\n    private final OrderService orderService;\n\n    OrderController(OrderService orderService) {\n        this.orderService = orderService;\n    }\n\n    @GetMapping("/order")\n    String order() {\n        int first = orderService.cartNo();\n        int second = orderService.cartNo();   // used twice within one request\n        return first + "," + second;\n    }\n}';
    return cart + '\n\n' + svc + '\n\n' + ctl;
  },
  label: function (c) { return { singleton: 'singleton', prototype: 'prototype', request: 'request' }[c.scope] + ' · ' + { inject: 'direct injection', provider: 'ObjectProvider', proxy: 'proxy' }[c.get]; },
  columns: ['Startup result', 'Cart objects right after startup', 'Cart objects after two requests', 'Cart used by request 1', 'Cart used by request 2'],
  simulate: function (c) {
    var sc = c.scope, g = c.get, ev = [], sum = [], name = { singleton: 'singleton', prototype: 'prototype', request: 'request' }[sc];
    var st = { phase: 'Starting up', svc: 'none', holds: '', carts: [], req: 0, cur: 0, used: [[], []], result: '' };
    function push(s, k) { ev.push({ s: s, k: k, snap: JSON.parse(JSON.stringify(st)) }); }
    function make(when) { st.carts.push({ no: st.carts.length + 1, when: when, users: [], gone: false }); return st.carts.length; }
    // The number of the object that comes back when the container is asked for a Cart. This is where the scopes differ
    var single = 0, perReq = {}, fresh = false;
    function lookup(r) {
      var before = st.carts.length, no;
      if (sc === 'singleton') { if (!single) single = make('created at startup'); no = single; }
      else if (sc === 'prototype') no = make(r ? 'created in request ' + r : 'created at startup');
      else { if (!perReq[r]) perReq[r] = make('created in request ' + r); no = perReq[r]; }
      fresh = st.carts.length > before;
      return no;
    }
    push('Container startup: The three beans orderController, orderService, and cart are registered. orderController and orderService are singletons, and the scope of cart is ' + name + '.', '');
    var chain = [], atStart = 0, held = 0;
    st.svc = 'being created';
    if (g === 'inject') {
      if (sc === 'request') {
        st.svc = 'failed'; st.result = 'Startup failed'; st.phase = 'Startup failed';
        chain = ['UnsatisfiedDependencyException', 'UnsatisfiedDependencyException', 'ScopeNotActiveException', 'IllegalStateException'];
        push('Creating the orderService bean: The constructor requires a Cart, so the container is asked for a Cart. A request-scoped bean can be created only while an HTTP request is being handled, but the application is starting up now and no request is being handled. A ScopeNotActiveException is thrown and startup fails.', 'bad');
        sum.push('Startup failed: ScopeNotActiveException. OrderService, a singleton, is created at startup, and at that time there is no request in which the request-scoped Cart could be created.');
        sum.push('A longer-lived bean (singleton) cannot hold a shorter-lived bean (request) directly in a field. Either retrieve the bean with ObjectProvider on each use, or have a proxy injected.');
        sum.push('@RequestScope is a request scope annotation whose proxy approach (proxyMode = TARGET_CLASS) is set by default. If you put @RequestScope on Cart instead of @Scope("request"), this code starts up as it is.');
        return { events: ev, summary: sum, chain: chain, holds: '', row: ['Startup failed: ScopeNotActiveException', '-', '-', '-', '-'] };
      }
      held = lookup(0); st.holds = 'Cart #' + held; st.svc = 'created';
      if (sc === 'singleton') push('Creating the orderService bean: The constructor requires a Cart, so the container is asked for a Cart. A singleton bean has only one object in the container. The container passes that one object (Cart #1), and OrderService makes its field point to it.', '');
      else push('Creating the orderService bean: The constructor requires a Cart, so the container is asked for a Cart. A prototype bean is created anew each time it is asked for, so the container creates Cart #1 and passes it. OrderService makes its field point to this object.', '');
    } else {
      st.holds = g === 'provider' ? 'ObjectProvider<Cart>' : 'Cart proxy'; st.svc = 'created';
      if (g === 'provider') push('Creating the orderService bean: The constructor requires an ObjectProvider<Cart>. The container injects not a Cart object but a tool that can retrieve a Cart later. The container is not asked for a Cart at this point, so no Cart object is created.', '');
      else push('Creating the orderService bean: The constructor requires a Cart. Because proxyMode is specified in the @Scope of Cart, the container injects an object that stands in for the Cart (a proxy) instead of the real Cart. Each time one of its methods is called, the proxy looks up the real Cart in the container and passes the call on to it. Creating the proxy does not call the constructor of Cart.', '');
      if (sc === 'singleton') { lookup(0); push('cart is a singleton, so the container creates one object (Cart #1) during startup even though nothing has used it yet.', ''); }
    }
    atStart = st.carts.length; st.phase = 'Startup complete';
    push('Startup is finished. Cart objects created so far: ' + atStart + '.' + (sc !== 'singleton' && atStart === 0 ? ' A bean of the ' + name + ' scope is created when something asks for it.' : ''), '');
    for (var r = 1; r <= 2; r++) {
      st.req = r; st.cur = 0; st.phase = 'Request ' + r + ' being handled';
      push('Request ' + r + ': GET /order comes in. The order() method of OrderController calls orderService.cartNo() twice.', '');
      for (var i = 1; i <= 2; i++) {
        var no, what;
        if (g === 'inject') { no = held; what = 'cartNo() call #' + i + ': It calls no() on Cart #' + no + ', the object the field points to. ' + (sc === 'prototype' ? 'Injection happened only once, when OrderService was created, so no new object is created even though the bean is a prototype.' : 'The bean is a singleton, so it is always the same object.'); }
        else {
          no = lookup(r);
          what = 'cartNo() call #' + i + ': ' + (g === 'provider' ? 'cartProvider.getObject() asks the container for a Cart. ' : 'It calls no() on the proxy the field points to. The proxy asks the container for the real Cart. ');
          what += sc === 'singleton' ? 'The bean is a singleton, so the container returns the only one, Cart #' + no + '.' : sc === 'prototype' ? 'The bean is a prototype, so the container creates Cart #' + no + ' and returns it.' : fresh ? 'This request has no Cart yet, so the container creates Cart #' + no + ' and binds it to this request.' : 'Cart #' + no + ' is already bound to this request, so the container returns it.';
        }
        st.cur = no; st.used[r - 1].push(no);
        var cart = st.carts[no - 1]; if (cart.users.indexOf('Request ' + r) < 0) cart.users.push('Request ' + r);
        var trap = sc === 'prototype' && g === 'inject';
        push(what, trap ? 'bad' : sc === 'singleton' ? '' : 'good');
      }
      st.cur = 0; st.req = 0; st.phase = 'Response to request ' + r + ' sent';
      if (sc === 'request') st.carts[perReq[r] - 1].gone = true;
      push('The response to request ' + r + ' is "' + st.used[r - 1].join(',') + '".' + (sc === 'request' ? ' The request has ended, so Cart #' + perReq[r] + ', which was bound to this request, is discarded.' : ''), '');
    }
    // If we get here, startup and both requests have finished. The status box in the diagram shows st.phase (the current stage).
    var total = st.carts.length, u1 = st.used[0].map(function (n) { return '#' + n; }).join(', '), u2 = st.used[1].map(function (n) { return '#' + n; }).join(', ');
    if (sc === 'singleton') {
      sum.push('A singleton bean has only one object in the container, and it is created at startup. Whether you have it injected directly, retrieve it with ObjectProvider, or go through a proxy, it is always the same object.');
      sum.push('Every bean with no scope specified is a singleton. All requests share one object, so you must not keep a value that differs per request in a field.');
    } else if (sc === 'prototype' && g === 'inject') {
      sum.push('Prototype means that a new object is created "each time the container is asked for the bean". Injection into a singleton bean happens only once, when that bean is created, so the one object received then keeps being used. If you expected a new object on each use, this is a bug.');
      sum.push('If you need a new object on each use, have an ObjectProvider injected and retrieve the object with getObject(). If two singleton beans have a prototype bean injected, each of the two receives a different object.');
    } else if (sc === 'prototype' && g === 'provider') {
      sum.push('Each call to getObject() asks the container for the bean, so a new object is created each time. Two calls within one request make two objects. Prototype does not mean "one per request".');
      sum.push('If you need to keep using the same object within one unit of work, retrieve it only once with getObject() and make a local variable point to it.');
    } else if (sc === 'prototype') {
      sum.push('Each time one of its methods is called, the proxy asks the container for a Cart. The bean is a prototype, so a new object is created for every single method call.');
      sum.push('So if you store a value with one method and read it with the next, the read already goes to a different object, and the stored value is not visible. For a prototype bean, ObjectProvider is a better fit than a proxy.');
    } else {
      sum.push('The request scope has one object per HTTP request. Within the same request, you get the same object however many times you ask, and a different object is created for a different request. When the request ends, that object is discarded, and the destruction callback (@PreDestroy) is called at that point.');
      sum.push(g === 'provider' ? 'ObjectProvider retrieves the bean from the container at the time of use, so no Cart has to be created at startup.' : 'When a proxy is injected, the code of OrderService is the same as with "direct injection". On each method call, the proxy finds the Cart of the request that is being handled now. @RequestScope is a shorthand for this approach.');
    }
    return { events: ev, summary: sum, chain: chain, holds: st.holds, row: ['Startup succeeded', atStart + '', total + '', u1, u2] };
  },
  render: function (v, sim, t, H, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : null;
    if (!s) { H.text(v, 'Click Run to start the server and send two GET /order requests.'); return; }
    H.table(v, ['Cart object', 'When it was created', 'Requests that used it'], s.carts.map(function (x) {
      return { cls: x.gone ? 'gone' : '', cells: [{ v: 'Cart #' + x.no, cls: s.cur === x.no ? 'hot' : '' }, x.when, x.users.length ? x.users.join(', ') + (x.gone ? ' (ended with the request)' : '') : '-'] };
    }), 'Cart objects created so far');
    if (!s.carts.length) H.text(v, s.svc === 'failed' ? 'No Cart object was created.' : 'There are no Cart objects yet.');
  },
  // Diagram: the two HTTP requests on the left, the singleton orderService in the middle, and the Cart objects created so far on the right. One more box appears each time an object is created. Only a singleton Cart, which the container keeps, is inside the container border; prototype and request Carts are outside it.
  draw: function (P, sim, shown) {
    var g = sim.c.get, last = shown[shown.length - 1], s = last ? last.snap : { phase: '', svc: 'none', holds: '', carts: [], req: 0, cur: 0, used: [[], []], result: '' };
    P.size(680, 344);
    [0, 1].forEach(function (i) {
      var u = s.used[i], on = s.req === i + 1;
      P.box('rq' + (i + 1), 16, 60 + i * 84, 186, 56, { cls: on ? 'hot now' : u.length ? 'wait' : 'ghost', title: 'Request ' + (i + 1) + ': GET /order', sub: u.length ? 'Cart used: ' + u.map(function (n) { return '#' + n; }).join(', ') : on ? 'being handled' : 'not received yet' });
    });
    var keep = sim.c.scope === 'singleton';
    P.region('ctx', 218, 16, keep ? 446 : 236, 262, 'Spring container');
    if (!keep) P.text('outl', 564, 34, sim.c.scope === 'prototype' ? 'Not kept by the container' : 'Kept with each request', { cls: 'mut', anchor: 'middle' });
    P.box('svc', 234, 100, 204, 64, { cls: s.svc === 'created' ? 'good' : s.svc === 'failed' ? 'bad' : s.svc === 'none' ? 'ghost' : 'hot', title: 'orderService (singleton)', sub: s.svc === 'created' ? 'Has: ' + s.holds : s.svc === 'none' ? 'not created yet' : s.svc });
    s.carts.forEach(function (x, i) {
      P.box('cart' + x.no, 480, 44 + i * 58, 168, 48, { cls: x.gone ? 'ghost' : s.cur === x.no ? 'hot now' : 'wait', title: 'Cart #' + x.no, sub: x.gone ? 'ended with request' : x.when });
    });
    if (!s.carts.length) P.text('none', 564, 150, s.svc === 'failed' ? 'No Cart object' : 'No Cart object yet', { cls: 'mut', anchor: 'middle' });
    if (g === 'inject' && s.svc === 'created') P.arrow('hold', 'svc:r', 'cart1:l', { cls: 'good', label: 'field' });
    if (g !== 'inject' && s.cur) P.arrow('use', 'svc:r', 'cart' + s.cur + ':l', { cls: 'hot', label: g === 'provider' ? 'getObject()' : 'proxy' });
    if (s.req) P.arrow('call', 'rq' + s.req + ':r', 'svc:l', { label: 'cartNo()' });
    P.box('r1', 16, 294, 320, 38, { cls: s.carts.length ? 'plain' : 'ghost', title: 'Cart objects created', right: s.carts.length + '' });
    P.box('r2', 344, 294, 320, 38, { cls: s.result ? 'bad' : s.phase ? 'plain' : 'ghost', title: 'Status', right: s.result === 'Startup failed' ? 'ScopeNotActiveException' : s.result || s.phase || 'Not started' });
    P.note(g === 'inject' ? 'The green arrow points to the object that the field of OrderService points to.' : g === 'provider' ? 'The yellow arrow points to the object that getObject() returned this time.' : 'The yellow arrow points to the real object to which the proxy passed this method call.');
  },
  assume: 'All 9 combinations were actually run on Spring Boot 4.1.1 (Spring Framework 7.0.9, embedded Tomcat 11) and checked against the results. For each combination, source code with the same structure as on the screen was compiled, the server was started, and two real GET /order requests were sent to read the Cart numbers in the responses. These were compared: the number of times the constructor of Cart was called (right after startup and after the two requests), what the field of OrderService points to (a Cart, an ObjectProvider, or a proxy), and the exception chain of the startup failure (UnsatisfiedDependencyException → UnsatisfiedDependencyException → ScopeNotActiveException → IllegalStateException). The second request was sent after the first one had finished (the "Singleton beans and state" lab covers requests sent at the same time). The following were also confirmed by execution: when two singleton beans have a prototype bean injected, they receive different objects; when a proxy is used with a prototype bean, a value stored with add is not visible in the size call right after it (the result is 0); a bean annotated with @RequestScope starts up even when it is injected directly and has one object per request; and the @PreDestroy method of a request-scoped bean is called each time a request ends. Not covered: the session scope and the application scope, other ways to retrieve a prototype bean (@Lookup, jakarta.inject.Provider), and the proxy mode that uses interfaces (ScopedProxyMode.INTERFACES). The Cart on the screen uses a static variable to count the objects, but real code that receives requests at the same time must not count this way.',
});

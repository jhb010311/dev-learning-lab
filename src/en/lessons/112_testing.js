Lab.register({
  id: 'testing', nav: 'Testing', cat: 'Spring', mode: 'step',
  title: 'When tests run, what goes into the Spring context, and how many times is it created?',
  intro: 'There are several ways to test a single controller. You can create the objects with new and call them without Spring, load all the beans with @SpringBootTest, or load only the web layer with @WebMvcTest. Depending on the approach, different beans go into the context (the container that creates and holds the beans), and unless you fill in the missing beans with mocks, the test cannot even start. Run code in which OrderController → OrderService → OrderRepository depend on each other in that order with two test classes, and check the result of each test and the number of times a context was created.',
  terms: ['Unit tests and integration tests', 'Test double (mock, stub)', '@SpringBootTest and @WebMvcTest', '@MockitoBean', 'Context cache (TestContext framework)'],
  controls: [
    { id: 'kind', label: 'Testing approach', type: 'select', value: 'webmvc', options: [['unit', 'Without Spring: create the objects yourself with new and Mockito'], ['boot', '@SpringBootTest: load all the beans'], ['webmvc', '@WebMvcTest(OrderController.class): load only the web layer']] },
    { id: 'mock', label: 'What to replace with a mock', type: 'select', value: 'none', options: [['none', 'Nothing'], ['svc', 'OrderService (a return value is set)'], ['bare', 'OrderService (no return value is set)'], ['repo', 'OrderRepository (a return value is set)']], hint: 'A test that starts Spring creates the mock with a @MockitoBean field, and a test without Spring creates it with mock(...).' },
    { id: 'next', label: 'Second test class, which runs next', type: 'select', value: 'same', options: [['same', 'Has the same configuration as the first class'], ['mock', 'Has one more @MockitoBean'], ['profile', 'Is annotated with @ActiveProfiles("test")'], ['dirty', 'Has the same configuration, and the first class has @DirtiesContext']], show: function (c) { return c.kind !== 'unit'; }, hint: 'The two classes run one after the other in the same JVM. See whether the context is reused or created again.' },
  ],
  fix: function (c) { return c.kind === 'unit' && c.next !== 'same' ? { next: 'same' } : null; },
  presets: [
    { t: 'Default settings', q: 'What happens when you run two test classes with the same configuration, loading only the web layer with @WebMvcTest and using no mock?', d: 'Only @WebMvcTest is added. The context does not load, so the test cannot even start.', v: { kind: 'webmvc', mock: 'none', next: 'same' } },
    { t: 'Filling in the service with a mock', q: 'What if you replace OrderService with a mock and set a return value?', d: 'With a @MockitoBean OrderService, the context loads and the test passes.', v: { kind: 'webmvc', mock: 'svc', next: 'same' } },
    { t: 'Filling in only the repository with a mock', q: 'What if you replace OrderRepository with a mock and set a return value, instead of OrderService?', d: 'What the controller requires is the service, so the context still does not load.', v: { kind: 'webmvc', mock: 'repo', next: 'same' } },
    { t: 'Setting no return value on the mock', q: 'What if you replace OrderService with a mock but set no return value?', d: 'The context loads, but the mock returns null, so the test fails on the line that checks the value.', v: { kind: 'webmvc', mock: 'bare', next: 'same' } },
    { t: 'Loading everything with @SpringBootTest', q: 'What if you change the testing approach to @SpringBootTest and load all the beans?', d: 'All three beans are registered as real ones, so the test passes even without a mock.', v: { kind: 'boot', mock: 'none', next: 'same' } },
    { t: 'Different @MockitoBean fields', q: 'What if @SpringBootTest has a mock OrderService with a return value set, and the second test class has one more @MockitoBean?', d: 'The second class cannot use the context in the cache and creates a new one.', v: { kind: 'boot', mock: 'svc', next: 'mock' } },
    { t: 'Without Spring, with new', q: 'What if you create the objects yourself with new and Mockito, without Spring, and set a return value for OrderService?', d: 'The test calls the controller method directly without ever creating a context.', v: { kind: 'unit', mock: 'svc', next: 'same' } },
  ],
  // The configuration of one test class: what is replaced with a mock (svc, repo), whether a return value is set (stubSvc, stubRepo), and the profile
  conf: function (c) {
    var m = c.mock, next = c.kind === 'unit' ? 'same' : c.next;
    var a = { svc: m === 'svc' || m === 'bare', repo: m === 'repo', stubSvc: m === 'svc', stubRepo: m === 'repo', profile: false, dirty: next === 'dirty' };
    var b = { svc: a.svc, repo: a.repo, stubSvc: a.stubSvc, stubRepo: a.stubRepo, profile: next === 'profile', dirty: false };
    // "One more @MockitoBean": replaces one more thing that the first class did not replace (OrderRepository, or OrderService if that is already replaced)
    if (next === 'mock') { if (!a.repo) { b.repo = true; b.stubRepo = !a.svc; } else { b.svc = true; b.stubSvc = true; b.stubRepo = false; } }
    return [a, b];
  },
  code: function (c) {
    var unit = c.kind === 'unit', boot = c.kind === 'boot', next = unit ? 'same' : c.next, cf = this.conf(c), A = cf[0], B = cf[1];
    function unitBody(f) {
      var s = '';
      if (f.svc) s += '        OrderService orderService = mock(OrderService.class);   // mock\n' + (f.stubSvc ? '        when(orderService.findName(1L)).thenReturn("keyboard");\n' : '');
      else if (f.repo) s += '        OrderRepository orderRepository = mock(OrderRepository.class);   // mock\n        when(orderRepository.findName(1L)).thenReturn("keyboard");\n        OrderService orderService = new OrderService(orderRepository);\n';
      else s += '        OrderRepository orderRepository = new OrderRepository();\n        OrderService orderService = new OrderService(orderRepository);\n';
      return s + '        OrderController orderController = new OrderController(orderService);\n\n        assertEquals("keyboard", orderController.name(1L));\n';
    }
    function fields(f) {
      var s = '    @Autowired\n    MockMvc mockMvc;                      // a tool that sends requests without a server\n';
      var svcF = '\n    @MockitoBean\n    OrderService orderService;            // adds a mock OrderService as a bean\n', repoF = '\n    @MockitoBean\n    OrderRepository orderRepository;      // adds a mock OrderRepository as a bean\n';
      // The fields that the first class had are written first, and the fields added in the second class are written after them
      return s + (A.repo ? (f.repo ? repoF : '') + (f.svc ? svcF : '') : (f.svc ? svcF : '') + (f.repo ? repoF : ''));
    }
    function mvcBody(f) {
      var stub = f.svc ? (f.stubSvc ? '        when(orderService.findName(1L)).thenReturn("keyboard");\n\n' : '') : f.repo && f.stubRepo ? '        when(orderRepository.findName(1L)).thenReturn("keyboard");\n\n' : '';
      return stub + '        mockMvc.perform(get("/orders/1"))\n               .andExpect(status().isOk())\n               .andExpect(content().string("keyboard"));\n';
    }
    var ann = boot ? '@SpringBootTest\n@AutoConfigureMockMvc                    // makes MockMvc available\n' : '@WebMvcTest(OrderController.class)\n';
    var s = '';
    if (unit) {
      s += '// First test class. It has no Spring annotations\nclass OrderControllerTest {\n\n    @Test\n    void returnsOrderName() {\n' + unitBody(A) + '    }\n}\n\n';
      s += '// Second test class. Its content is the same as the first\nclass OrderControllerSecondTest {\n    // returnsOrderName() is the same as in OrderControllerTest\n}\n';
    } else {
      s += '// First test class\n' + ann + (A.dirty ? '@DirtiesContext                          // discards the context when the class is done\n' : '') + 'class OrderControllerTest {\n\n' + fields(A) + '\n    @Test\n    void returnsOrderName() throws Exception {\n' + mvcBody(A) + '    }\n}\n\n';
      s += '// Second test class, which runs next\n' + ann + (B.profile ? '@ActiveProfiles("test")                  // the profile is different\n' : '') + 'class OrderControllerSecondTest {\n';
      if (next === 'mock') s += '\n' + fields(B) + '\n    @Test\n    void returnsOrderName() throws Exception {\n' + mvcBody(B) + '    }\n}\n';
      else s += '    // The fields and returnsOrderName() are the same as in OrderControllerTest\n}\n';
    }
    s += '\n// ---- Code under test: controller → service → repository ----\n@RestController\nclass OrderController {\n    private final OrderService orderService;\n\n    public OrderController(OrderService orderService) {\n        this.orderService = orderService;\n    }\n\n    @GetMapping("/orders/{id}")\n    public String name(@PathVariable Long id) {\n        return orderService.findName(id);\n    }\n}\n\n' +
      '@Service\nclass OrderService {\n    private final OrderRepository orderRepository;\n\n    public OrderService(OrderRepository orderRepository) {\n        this.orderRepository = orderRepository;\n    }\n\n    public String findName(Long id) {\n        return orderRepository.findName(id);\n    }\n}\n\n' +
      '@Repository\nclass OrderRepository {\n    // A map used in place of a database\n    private final Map<Long, String> db = Map.of(1L, "keyboard");\n\n    public String findName(Long id) {\n        return db.get(id);\n    }\n}';
    return s;
  },
  label: function (c) {
    var unit = c.kind === 'unit';
    return { unit: 'Without Spring', boot: '@SpringBootTest', webmvc: '@WebMvcTest' }[c.kind] + ' · ' + { none: 'no mock', svc: 'mock service', bare: 'mock service (no return value)', repo: 'mock repository' }[c.mock] +
      (unit ? '' : ' · second: ' + { same: 'same configuration', mock: 'one more @MockitoBean', profile: 'different profile', dirty: '@DirtiesContext on first' }[c.next]);
  },
  columns: ['Result of the first class', 'Controller · service · repository of the first class', 'Result of the second class', 'Times a Spring context was created'],
  simulate: function (c) {
    var kind = c.kind, unit = kind === 'unit', boot = kind === 'boot', next = unit ? 'same' : c.next, cf = this.conf(c), A = cf[0], B = cf[1], ev = [], sum = [];
    var PASS = 'Passed', FAIL = 'Failed (unexpected value)', DOWN = 'Context failure', SKIP = 'Context failure (not retried)';
    var CN = ['OrderControllerTest', 'OrderControllerSecondTest'];
    var annS = boot ? '@SpringBootTest' : '@WebMvcTest', annL = boot ? '@SpringBootTest' : '@WebMvcTest(OrderController.class)';
    // Whether the controller, the service, and the repository are each real, a mock, or absent
    function beans(f) {
      if (unit) return ['real', f.svc ? 'mock' : 'real', f.svc ? 'none' : f.repo ? 'mock' : 'real'];
      if (boot) return ['real', f.svc ? 'mock' : 'real', f.repo ? 'mock' : 'real'];
      return ['real', f.svc ? 'mock' : 'none', f.repo ? 'mock' : 'none'];
    }
    function loads(f) { return !(kind === 'webmvc' && !f.svc); }                    // With @WebMvcTest, OrderService must be present, even as a mock, for the controller to be created
    function value(f) { return f.svc ? (f.stubSvc ? 'keyboard' : null) : f.repo ? (f.stubRepo ? 'keyboard' : null) : 'keyboard'; }
    function key(f) { return (f.svc ? 'S' : '') + (f.repo ? 'R' : '') + (f.profile ? 'P' : ''); }     // The cache key: the same when the configuration is the same
    function nMock(f) { return (f.svc ? 1 : 0) + (f.repo ? 1 : 0); }
    function cfgText(f) { return annS + ' · ' + (nMock(f) ? 'mocks: ' + nMock(f) + '' : 'no mocks') + (f.profile ? ' · profile test' : ''); }
    function path(f) {
      if (f.svc) return f.stubSvc ? 'The mock OrderService returns "keyboard", as it was set to.' : 'The mock OrderService was never given a value to return, so it returns null.';
      if (f.repo) return 'The real OrderService calls the mock OrderRepository, and the mock returns "keyboard", as it was set to.';
      return 'The real OrderService finds "keyboard" in the map of the real OrderRepository and returns it.';
    }
    var st = { now: 0, s1: 'Not run yet', s2: 'Not run yet', k1: '', k2: '', ctxs: [], made: 0, got: '', use1: -1, use2: -1, how1: '', how2: '' };
    function push(s, k) { ev.push({ s: s, k: k || '', snap: JSON.parse(JSON.stringify(st)) }); }
    function set(n, text, k) { st['s' + n] = text; st['k' + n] = k || ''; }
    var res = ['', ''], used = [null, null], cache = {}, failed = {}, okCount = 0;

    // ---- Unit test without Spring ----
    function runUnit(n, f) {
      var v = value(f), b = beans(f), ok = v === 'keyboard';
      st.now = n; st.got = '';
      if (n === 2) {
        st.ctxs.push({ n: 2, cfg: '', beans: b, state: 'obj' }); st.use2 = 1; st.how2 = 'created'; st.got = v === null ? 'null' : '"' + v + '"'; set(2, ok ? PASS : FAIL, ok ? 'good' : 'bad');
        push(CN[1] + ' runs: This is the second test class, written in the same way. It creates the objects itself again, calls the same method, and ' + (ok ? 'passes.' : 'fails for the same reason.') + ' No Spring context was created at any point while the two classes ran.', ok ? 'good' : 'bad');
        return ok ? PASS : FAIL;
      }
      set(1, 'Running the test', 'hot');
      push(CN[0] + ' starts: This class has no Spring test annotation such as @SpringBootTest or @WebMvcTest. Spring is not involved, and JUnit calls the test method returnsOrderName right away.');
      var cx = { n: 1, cfg: '', beans: ['none', 'none', 'none'], state: 'obj' }; st.ctxs.push(cx); st.use1 = 0; st.how1 = 'created';
      if (f.svc) {
        cx.beans = ['none', 'mock', 'none'];
        push('mock(OrderService.class) runs: Mockito creates a mock that has the same method signatures as OrderService. It contains none of the code of the real OrderService and only returns the values that it is told to return.');
        if (f.stubSvc) push('when(orderService.findName(1L)).thenReturn("keyboard") runs: This tells the mock OrderService to "return keyboard when findName(1L) is called".');
        cx.beans = b;
        push('new OrderController(orderService) runs: The test passes the mock OrderService to the constructor and creates a real OrderController itself. The service is all that the controller uses, so no OrderRepository is created.');
      } else if (f.repo) {
        cx.beans = ['none', 'none', 'mock'];
        push('mock(OrderRepository.class) runs: Mockito creates a mock that has the same method signatures as OrderRepository. It contains none of the code of the real OrderRepository and only returns the values that it is told to return.');
        push('when(orderRepository.findName(1L)).thenReturn("keyboard") runs: This tells the mock OrderRepository to "return keyboard when findName(1L) is called".');
        cx.beans = b;
        push('new OrderService(orderRepository), new OrderController(orderService) run: The test passes the mock repository to the constructor of a real OrderService, and then passes that service to the constructor of OrderController. The test does the injection that Spring would otherwise do.');
      } else {
        cx.beans = b;
        push('Creating the objects with new: The test method creates OrderRepository, OrderService, and OrderController in turn with new. It connects them by passing each object to the constructor of the next one. The test does the injection that Spring would otherwise do.');
      }
      st.got = v === null ? 'null' : '"' + v + '"';
      push('orderController.name(1L) is called: The test calls the controller method directly, with no HTTP request. The controller calls orderService.findName(1). ' + path(f));
      set(1, ok ? PASS : FAIL, ok ? 'good' : 'bad');
      push(ok ? 'assertEquals("keyboard", ...) check: The returned value is equal to the expected "keyboard". The test passes.' : 'assertEquals("keyboard", ...) check: The returned value is null, which differs from the expected "keyboard". An AssertionFailedError is thrown and the test fails.', ok ? 'good' : 'bad');
      return ok ? PASS : FAIL;
    }

    // ---- Tests that start a Spring context ----
    function build(n, f, k) {
      var b = beans(f), nm = nMock(f), ord = n === 1 ? '' : ' in the second context';
      var cx = { n: st.ctxs.length + 1, cfg: cfgText(f), beans: boot ? ['real', 'real', 'real'] : ['real', 'none', 'none'], state: 'build' };
      st.ctxs.push(cx); st.made++; st['use' + n] = st.ctxs.length - 1; st['how' + n] = 'new';
      return { cx: cx, b: b, nm: nm, ord: ord };
    }
    function register(n, f, w) {
      push('Bean registration' + w.ord + ' (' + annS + '): ' + (boot ? 'Spring does a full component scan, just as when the application is actually started. OrderController, OrderService, and OrderRepository are all registered as beans.' : 'Only what belongs to the web layer is registered. OrderController, which is annotated with @RestController, becomes a bean, and OrderService, which is annotated with @Service, and OrderRepository, which is annotated with @Repository, are not registered.'));
      if (w.nm) {
        w.cx.beans = w.b;
        var what = w.nm === 2 ? 'OrderService and OrderRepository' : f.svc ? 'OrderService' : 'OrderRepository';
        push((w.nm === 2 ? 'Two @MockitoBean fields are handled' + w.ord + ': ' : '@MockitoBean ' + what + ' is handled' + w.ord + ': ') + (boot ? (w.nm === 2 ? 'Mocks created by Mockito take' : 'A mock created by Mockito takes') + ' the place of the registered real ' + what + '. Every injection point for ' + what + ' in this context receives the mock.' : 'The context has no ' + what + ' bean, so ' + (w.nm === 2 ? 'mocks created by Mockito are added as beans.' : 'a mock created by Mockito is added as a bean.')));
      }
    }
    function runCtx(n, f) {
      var k = key(f), v = value(f), ok = v === 'keyboard', w;
      st.now = n; st.got = ''; set(n, 'Preparing context', 'hot');
      if (n === 1) {
        push(CN[0] + ' starts: JUnit runs the first test class. The class is annotated with ' + annL + ', so before the test method is called, Spring prepares the context that this class will use.');
        w = build(1, f, k);
        push('Context cache lookup: Once Spring creates a context for tests, it keeps the context in a cache and hands it out again when a test class with the same configuration comes along. This is the first class, so the cache is empty. Spring starts creating a new context (#1).');
        register(1, f, w);
      } else {
        var same = key(A) === k;
        push(CN[1] + ' starts: The second test class runs next in the same JVM. ' + (next === 'mock' ? 'It has the configuration of the first class plus one more field, @MockitoBean ' + (A.repo ? 'OrderService' : 'OrderRepository') + '.' : next === 'profile' ? 'It is the same as the first class, except that it is annotated with @ActiveProfiles("test").' : 'Its annotations and fields are the same as those of the first class.') + ' This class needs a context too.');
        if (same && k in cache) {
          st.use2 = cache[k]; st.how2 = 'reused'; used[1] = cache[k]; set(2, 'Running the test', 'hot');
          push('Context cache lookup: The configuration is the same as that of the first class, so Spring finds the same context in the cache. It does not create a new one, and the class receives the very context that the first class used.', 'good');
          return test(2, f);
        }
        if (same && failed[k]) {
          st.got = 'Not run'; st.how2 = ''; set(2, SKIP, 'bad');
          push('Context cache lookup: The configuration is the same as that of the first class, but the context for that configuration failed to load, so it is not in the cache. Spring does not try again to create a context that has failed once with the same configuration (the default threshold is 1). Without even starting to create it, Spring fails the test immediately with an IllegalStateException that says "failure threshold (1) exceeded".', 'bad');
          return SKIP;
        }
        w = build(2, f, k);
        push('Context cache lookup: ' + (same ? 'The configuration is the same as that of the first class, but that context was just removed from the cache because of @DirtiesContext. Spring starts creating a context with the same configuration again from the beginning (#' + st.made + ').'
          : (next === 'mock' ? 'When the set of @MockitoBean fields differs, the beans that go into the context differ, so Spring treats it as a different configuration.' : 'When the active profiles differ, the configuration files that are read and the beans that are registered can differ, so Spring treats it as a different configuration.') + ' No context in the cache matches, so Spring starts creating a new one (#' + st.made + ').' + (key(A) in cache ? ' The first context stays in the cache as it is.' : '')));
        register(2, f, w);
      }
      if (!loads(f)) {
        w.cx.state = 'fail'; failed[k] = true; st.got = 'Not run'; set(n, DOWN, 'bad');
        push('OrderController cannot be created: To create the controller, Spring needs the OrderService bean that the constructor requires, but the context does not have one. A NoSuchBeanDefinitionException is thrown and the loading of the context stops.' + (f.repo ? ' A mock OrderRepository was added, but what the controller requires is OrderService, so it does not help.' : ''), 'bad');
        push('returnsOrderName is recorded as failed: There is no context, so the @Autowired MockMvc field cannot be filled. Not a single line of the test method body runs, and the failure is recorded as an IllegalStateException that says "Failed to load ApplicationContext".', 'bad');
        return DOWN;
      }
      w.cx.state = 'up'; cache[k] = st.ctxs.length - 1; used[n - 1] = cache[k]; okCount++; set(n, 'Running the test', 'hot');
      push((n === 1 ? 'OrderController is created: ' : 'The second context finishes loading: ') + 'As Spring creates the controller, it finds the OrderService that the constructor requires in the context and injects it. ' + (f.svc ? 'What is injected is the mock OrderService.' : 'What is injected is the real OrderService, and inside it is the ' + (f.repo ? 'mock' : 'real') + ' OrderRepository.') + ' The context has finished loading and is kept in the cache.', 'good');
      return test(n, f);
    }
    function test(n, f) {
      var v = value(f), ok = v === 'keyboard', stubbed = f.svc ? f.stubSvc : f.repo && f.stubRepo, who = f.svc ? 'orderService' : 'orderRepository', whoK = f.svc ? 'OrderService' : 'OrderRepository';
      if (n === 1) {
        if (stubbed) push('when(' + who + '.findName(1L)).thenReturn("keyboard") runs: This is the first line of the test method. It tells the mock ' + whoK + ' to "return keyboard when findName(1L) is called".');
        st.got = v === null ? 'Empty response' : '"' + v + '"';
        push('mockMvc.perform(get("/orders/1")) runs: MockMvc passes a GET /orders/1 request directly to Spring MVC without starting a server. OrderController.name(1), which matches the path, is called, and the controller calls orderService.findName(1). ' + path(f) + (v === null ? ' So the response body is empty.' : ''));
        set(1, ok ? PASS : FAIL, ok ? 'good' : 'bad');
        push(ok ? 'andExpect(content().string("keyboard")) check: The response status is 200 and the body is "keyboard". The test passes.' : 'andExpect(content().string("keyboard")) check: The response status is 200, but the body is empty, which differs from the expected "keyboard". An AssertionError is thrown and the test fails. The context loaded normally, and what is wrong is the resulting value.', ok ? 'good' : 'bad');
      } else {
        st.got = v === null ? 'Empty response' : '"' + v + '"'; set(2, ok ? PASS : FAIL, ok ? 'good' : 'bad');
        push('returnsOrderName runs (second class): ' + (stubbed ? 'After setting the return value on the mock ' + whoK + ', the test ' : 'The test ') + 'sends a GET /orders/1 request. ' + path(f) + (ok ? ' The response body is "keyboard", so the test passes.' : ' The response body is empty, so the test fails.'), ok ? 'good' : 'bad');
      }
      return ok ? PASS : FAIL;
    }

    if (unit) { res[0] = runUnit(1, A); res[1] = runUnit(2, B); }
    else {
      res[0] = runCtx(1, A);
      if (A.dirty) {
        var k1 = key(A);
        if (k1 in cache) {
          st.ctxs[cache[k1]].state = 'closed'; delete cache[k1]; st.now = 1;
          push(CN[0] + ' ends (@DirtiesContext): This annotation marks that "this class has changed the state of the context, so other tests must not reuse it". When all the tests of the class have finished, Spring closes this context and removes it from the cache.');
        } else push(CN[0] + ' ends (@DirtiesContext): There is no context to close. A context that failed to load was never put into the cache.');
      }
      res[1] = runCtx(2, B);
    }

    var loaded1 = unit || used[0] !== null, loaded2 = unit || used[1] !== null;
    var b1 = loaded1 ? beans(A).join(' · ') : 'not created', b2 = loaded2 ? beans(B).join(' · ') : 'not created';
    var shared = unit || used[0] === null || used[1] === null ? '-' : used[0] === used[1] ? 'same context' : 'different contexts';
    if (unit) {
      if (c.mock === 'bare') sum.push('A mock created with mock() returns null from a method that has not been given a value to return (here, a method whose return type is String). You must set the value with when(...).thenReturn(...).');
      sum.push('A test that uses only new and Mockito, without Spring, does not start a context, so it has the least to prepare. In return, this test does not check the things that Spring does for you, such as request mapping (@GetMapping) and bean injection.');
    } else if (res[0] === DOWN) {
      sum.push(A.repo ? 'What must be filled in with a mock in @WebMvcTest is OrderService, which the controller depends on directly. If only OrderRepository is added as a mock, the OrderService bean is still missing and the context does not load.' : '@WebMvcTest registers only the beans of the web layer, such as controllers. The OrderService that the controller depends on must be filled in by you with @MockitoBean for the context to load.');
      if (res[1] === SKIP) sum.push('Once a context fails to load with a given configuration, Spring does not try to create the context for that configuration again and fails the later tests immediately. Even when several tests appear to have failed, there may be a single cause, so look at the message of the very first failure.');
      else if (res[1] === DOWN) sum.push('The second class has a different configuration, so Spring tried once more to create a context. But the OrderService bean was missing there as well, so it failed in the same way.');
      else sum.push('The second class has a @MockitoBean OrderService, so the context loaded and the test passed. A context is created separately for each configuration, so the load failure of one class does not spread to a class with a different configuration.');
    } else {
      if (boot) sum.push('The context of @SpringBootTest contains the controller, the service, and the repository. ' + (nMock(A) ? 'Only the ones marked with @MockitoBean are replaced with mocks, and the rest are real.' : 'Even without a mock, you can check that the layers really work together. In return, many beans are registered, so the context is large.'));
      else sum.push('The first context, created with @WebMvcTest, has only the real controller and the mock service, and no repository. This test checks the request mapping and the response, and it does not check the real behavior of the service and the repository.');
      if (c.mock === 'bare') sum.push('A mock added with @MockitoBean returns null unless a return value is set. The context loaded without a problem, so this is not a "Context failure". The test fails on the line that checks for the expected value (the assertion).');
      sum.push(next === 'same' ? 'Test classes with the same configuration create the context only once and share it. Even when the number of test classes grows, the number of times a context is started does not grow.'
        : next === 'mock' ? 'A different set of @MockitoBean fields needs a different context. If each class replaces different beans with mocks, a new context is started for every variation, and the whole test run becomes slower.'
        : next === 'profile' ? 'A different @ActiveProfiles needs a different context. Here the beans inside are exactly the same, but the configuration differs, so Spring creates a new one.'
        : '@DirtiesContext closes the context and removes it from the cache, so the next class with the same configuration also creates it again from the beginning. Use it only when a test has really changed the state of the context.');
    }
    return { events: ev, summary: sum, unit: unit, check: [b2, 'Loaded successfully: ' + okCount + '', shared], row: [res[0], b1, res[1], st.made + ''] };
  },
  render: function (v, sim, t, H, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : null;
    if (!s) { H.text(v, 'Click Run to go through the steps one at a time.'); return; }
    var cell = function (x) { return { v: x, cls: x === 'mock' ? 'hot' : x === 'real' ? 'good' : '' }; };
    var stateText = { build: 'Being created', up: 'In the cache', fail: 'Failed to load', closed: 'Closed', obj: '' };
    if (sim.unit) H.table(v, ['Created by', 'Controller', 'Service', 'Repository'], s.ctxs.map(function (x) { return { cells: [x.n === 1 ? 'First test' : 'Second test', cell(x.beans[0]), cell(x.beans[1]), cell(x.beans[2])] }; }), 'Objects that the test methods created directly (no Spring context)');
    else H.table(v, ['Context', 'Controller', 'Service', 'Repository', 'State'], s.ctxs.map(function (x) { return { cls: x.state === 'closed' ? 'gone' : '', cells: ['#' + x.n, cell(x.beans[0]), cell(x.beans[1]), cell(x.beans[2]), { v: stateText[x.state], cls: x.state === 'fail' ? 'bad' : x.state === 'up' ? 'good' : '' }] }; }), 'Contexts created by Spring' + (s.ctxs.length ? '' : ' (none yet)'));
  },
  // Diagram: on the left are the two test classes, which run one after the other, and the dashed region on the right is the context cache. Each long box in the cache is one context, and the three boxes inside it are the controller, service, and repository beans (green for real, yellow for a mock, dashed for absent). The arrow from a test class points to the context that the class uses.
  draw: function (P, sim, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : { now: 0, s1: 'Not run yet', s2: 'Not run yet', k1: '', k2: '', ctxs: [], made: 0, got: '', use1: -1, use2: -1, how1: '', how2: '' };
    var unit = sim.unit, names = ['Controller', 'Service', 'Repository'];
    P.size(680, 302);
    function split(t) { var i = t.indexOf(' ('); return i < 0 ? [t] : [t.slice(0, i), t.slice(i + 2, -1)]; }
    P.box('t1', 10, 44, 156, 72, { cls: (s.k1 || 'plain') + (s.now === 1 ? ' now' : ''), title: 'First test class', sub: split(s.s1) });
    P.box('t2', 10, 148, 156, 72, { cls: (s.k2 || 'plain') + (s.now === 2 ? ' now' : ''), title: 'Second test class', sub: split(s.s2) });
    P.region('cache', 236, 6, 434, 236, unit ? 'No Spring context: objects created by the test method' : 'Context cache (inside the JVM that runs the tests)');
    if (!s.ctxs.length) P.text('empty', 453, 128, unit ? 'No objects created yet' : 'Empty', { cls: 'mut', anchor: 'middle' });
    s.ctxs.forEach(function (x, i) {
      var y = 32 + i * 104, id = 'ctx' + (i + 1);
      P.box(id, 246, y, 414, 96, { cls: x.state === 'fail' ? 'bad' : x.state === 'closed' ? 'ghost' : x.state === 'build' ? 'wait now' : 'plain',
        title: unit ? (i === 0 ? 'First' : 'Second') + ' test: objects created with new and mock' : 'Context #' + x.n, sub: unit ? [] : [x.cfg],
        right: { build: 'Creating', up: 'Cached', fail: 'Load failed', closed: 'Closed', obj: '' }[x.state] });
      x.beans.forEach(function (b, j) {
        P.box(id + 'b' + j, 251 + j * 135, y + 52, 132, 34, { cls: x.state === 'closed' ? 'ghost' : b === 'real' ? 'good' : b === 'mock' ? 'hot' : 'ghost', title: names[j], right: b });
      });
    });
    if (s.use1 >= 0 && s.how1) P.arrow('a1', 't1:r', 'ctx' + (s.use1 + 1) + ':l', { cls: s.ctxs[s.use1].state === 'fail' ? 'bad' : s.ctxs[s.use1].state === 'closed' ? 'mut' : '', label: s.how1 });
    if (s.use2 >= 0 && s.how2) P.arrow('a2', 't2:r', 'ctx' + (s.use2 + 1) + ':l' + (s.use2 === 0 ? ':0.8' : ''), { cls: s.how2 === 'reused' ? 'good' : s.ctxs[s.use2].state === 'fail' ? 'bad' : '', label: s.how2 });
    P.box('cnt', 10, 254, 326, 38, { cls: s.made ? 'hot' : 'ghost', title: 'Times a Spring context was created', right: s.made + '' });
    P.box('got', 344, 254, 326, 38, { cls: s.got === '"keyboard"' ? 'good' : s.got ? 'bad' : 'ghost', title: 'Value this test received', right: s.got || 'None yet' });
    P.note(unit ? 'On the right are the objects that the test method created directly with new and mock(...). Green is a real object, yellow is a mock created by Mockito, and a dashed box is one that was not created.'
      : 'Each long box on the right is one Spring context, and the three boxes inside it are beans. Green is a real bean, yellow is a mock added with @MockitoBean, and a dashed box is one that is not registered. If the arrow from the second class goes to the first context, the context was reused, and if it goes to a new box, a context was created once more.');
  },
  assume: 'All 36 combinations were actually run on this PC and checked against the results (3 testing approaches × 4 mock choices × 4 second-class choices; for a test without Spring, the second-class setting has no meaning, so only 4 are counted). The versions are Spring Boot 4.1.1, Spring Framework and spring-test 7.0.9, JUnit Jupiter 6.0.3, Mockito 5.23.0, and JDK 21. The two test classes were run one after the other with the JUnit Platform Launcher, without Gradle or Maven, and because the context cache lives inside the JVM, a new Java process was started for each combination. What was compared: the results of the two classes (passed, assertion failed, context failed to load, failure that was not retried), whether the controller, service, and repository that each class used were real, Mockito mocks, or absent, the number of times the creation of a context was started (counted as the number of times the constructor of the configuration class was called, including the ones that failed to load), the number of times loading succeeded, and whether the two classes received the same context object. ' +
    'Spring Boot 4 has no @MockBean (it was confirmed that the spring-boot-test jar of 4.1.1 does not contain that class) and uses @MockitoBean of Spring Framework (org.springframework.test.context.bean.override.mockito). @WebMvcTest and @AutoConfigureMockMvc are in the org.springframework.boot.webmvc.test.autoconfigure package of the spring-boot-webmvc-test module. The package names differ from those of 3.x, so take care when you copy import statements. ' +
    'How auto-configuration was controlled: the classpath of this PC also contains Spring Security, H2 and HikariCP, Hibernate, Spring Data JPA, and Actuator. In the check runs, the exclude attribute of @SpringBootApplication left out five Spring Security auto-configurations and the DataSource, Hibernate JPA, and Spring Data JPA repositories auto-configurations. When the lab was run without excluding them, the request of @SpringBootTest was blocked by Spring Security and became 401, and @WebMvcTest passed as before. (This is the result of a separate run made while the lab was being built, and it is not in the saved check output. On this classpath, the list of auto-configurations that @WebMvcTest loads did not include Spring Security. The behavior when the spring-boot-security-test module is present was not verified.) The @SpringBootApplication class is omitted on the screen. ' +
    'Differences between the code on the screen and the code used for the check: in the check code, the test classes have different names, they inherit the same body from an abstract class, and there are additional lines that record whether an object is real or a mock and additional code that counts the contexts. "Has one more @MockitoBean" is the case that replaces one more thing that the first class did not replace (OrderRepository, or OrderService if that is already replaced). The database is replaced with an in-memory map both on the screen and in the runs. ' +
    'The threshold after which a context that has failed once with the same configuration is not created again is spring.test.context.failure.threshold, and its default is 1 (confirmed from the constant in spring-test 7.0.9). For @DirtiesContext, only the default behavior when it is put on a class (the context is closed after the tests of the class finish) is covered. On this PC, the number of bean definitions in the context was 303 for @SpringBootTest and 130 for @WebMvcTest (131 when a mock bean is added), and these numbers change with the classpath and the exclude above. The time taken differs on every run, so it is not in the result table. In one run on this PC, the first class took about 0.7s to 0.9s for the test without Spring (including Mockito setup), about 2.7s for @WebMvcTest, and about 3.4s to 4.4s for @SpringBootTest, and the second class, which reused the context, took 0.05s or less. ' +
    'On JDK 21, Mockito attaches itself as an agent at run time in order to create mocks and prints a warning, but this does not affect the behavior, so it was left as it is. The @Transactional rollback of test methods, other slices such as @DataJpaTest, @MockitoSpyBean, the maximum size of the cache, and the case where a build tool splits the tests across several processes (the cache is separate for each process) are not covered and were not verified by execution either.',
});

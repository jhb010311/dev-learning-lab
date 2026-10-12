Lab.register({
  id: 'testing', nav: '테스트', cat: '스프링', mode: 'step',
  title: '테스트를 실행할 때 스프링 컨텍스트에는 무엇이 들어가고, 몇 번 만들어지나',
  intro: '컨트롤러 하나를 테스트하는 방법은 여러 가지입니다. 스프링 없이 new로 객체를 만들어 부를 수도 있고, @SpringBootTest로 빈을 전부 띄울 수도 있고, @WebMvcTest로 웹 계층만 띄울 수도 있습니다. 방식에 따라 컨텍스트(빈을 만들어 담아 두는 컨테이너)에 들어가는 빈이 다르고, 빠진 빈을 가짜 객체로 채우지 않으면 테스트가 시작도 못 합니다. OrderController → OrderService → OrderRepository 순서로 의존하는 코드를 두 테스트 클래스로 실행하면서, 각 테스트의 결과와 컨텍스트가 만들어진 횟수를 확인합니다.',
  terms: ['단위 테스트와 통합 테스트', '테스트 대역(Mock, Stub)', '@SpringBootTest와 @WebMvcTest', '@MockitoBean', '테스트 컨텍스트 캐시'],
  controls: [
    { id: 'kind', label: '테스트 방식', type: 'select', value: 'webmvc', options: [['unit', '스프링 없이: new와 Mockito로 직접 만든다'], ['boot', '@SpringBootTest: 빈을 전부 띄운다'], ['webmvc', '@WebMvcTest(OrderController.class): 웹 계층만 띄운다']] },
    { id: 'mock', label: '가짜 객체로 바꾸는 것', type: 'select', value: 'none', options: [['none', '없음'], ['svc', 'OrderService (돌려줄 값을 정한다)'], ['bare', 'OrderService (돌려줄 값을 정하지 않는다)'], ['repo', 'OrderRepository (돌려줄 값을 정한다)']], hint: '스프링을 띄우는 테스트에서는 @MockitoBean 필드로, 스프링 없는 테스트에서는 mock(...)으로 만듭니다.' },
    { id: 'next', label: '이어서 실행하는 두 번째 테스트 클래스', type: 'select', value: 'same', options: [['same', '첫 번째 클래스와 설정이 같다'], ['mock', '@MockitoBean이 하나 더 있다'], ['profile', '@ActiveProfiles("test")가 붙어 있다'], ['dirty', '설정은 같고, 첫 번째 클래스에 @DirtiesContext가 있다']], show: function (c) { return c.kind !== 'unit'; }, hint: '두 클래스는 같은 JVM에서 차례로 실행됩니다. 컨텍스트를 다시 쓰는지 새로 만드는지 보세요.' },
  ],
  fix: function (c) { return c.kind === 'unit' && c.next !== 'same' ? { next: 'same' } : null; },
  presets: [
    { t: '처음 설정으로', q: '@WebMvcTest로 웹 계층만 띄우고 가짜 객체 없이 설정이 같은 테스트 클래스 둘을 실행하면 어떻게 되나', d: '@WebMvcTest만 붙였습니다. 컨텍스트가 뜨지 않아 테스트가 시작도 못 합니다.', v: { kind: 'webmvc', mock: 'none', next: 'same' } },
    { t: '서비스를 가짜로 채우면', q: 'OrderService를 가짜로 바꾸고 돌려줄 값을 정하면', d: '@MockitoBean OrderService를 넣으면 컨텍스트가 뜨고 테스트가 통과합니다.', v: { kind: 'webmvc', mock: 'svc', next: 'same' } },
    { t: '리포지토리만 가짜로 채우면', q: 'OrderRepository만 가짜로 바꾸고 돌려줄 값을 정하면', d: '컨트롤러가 요구하는 것은 서비스라서 여전히 뜨지 않습니다.', v: { kind: 'webmvc', mock: 'repo', next: 'same' } },
    { t: '가짜에 돌려줄 값을 정하지 않으면', q: 'OrderService를 가짜로 바꾸되 돌려줄 값을 정하지 않으면', d: '컨텍스트는 뜨지만 가짜가 null을 돌려주어, 값을 확인하는 줄에서 실패합니다.', v: { kind: 'webmvc', mock: 'bare', next: 'same' } },
    { t: '@SpringBootTest로 전부 띄우면', q: '테스트 방식을 @SpringBootTest로 바꿔 빈을 전부 띄우면', d: '세 빈이 모두 진짜로 등록되어 가짜 없이도 통과합니다.', v: { kind: 'boot', mock: 'none', next: 'same' } },
    { t: '@MockitoBean이 서로 다르면', q: '@SpringBootTest에 OrderService 가짜를 두고 두 번째 클래스에 @MockitoBean이 하나 더 있으면', d: '두 번째 클래스는 캐시의 컨텍스트를 못 쓰고 새로 만듭니다.', v: { kind: 'boot', mock: 'svc', next: 'mock' } },
    { t: '스프링 없이 new로', q: '스프링 없이 new와 Mockito로 직접 만들고 OrderService의 돌려줄 값을 정하면', d: '컨텍스트를 한 번도 만들지 않고 컨트롤러의 메서드를 직접 부릅니다.', v: { kind: 'unit', mock: 'svc', next: 'same' } },
  ],
  // 테스트 클래스 하나의 설정: 가짜로 바꾸는 것(svc, repo), 돌려줄 값을 정하는지(stubSvc, stubRepo), 프로필
  conf: function (c) {
    var m = c.mock, next = c.kind === 'unit' ? 'same' : c.next;
    var a = { svc: m === 'svc' || m === 'bare', repo: m === 'repo', stubSvc: m === 'svc', stubRepo: m === 'repo', profile: false, dirty: next === 'dirty' };
    var b = { svc: a.svc, repo: a.repo, stubSvc: a.stubSvc, stubRepo: a.stubRepo, profile: next === 'profile', dirty: false };
    // "@MockitoBean이 하나 더": 첫 번째 클래스가 바꾸지 않은 것 하나를 더 바꾼다 (OrderRepository, 이미 바꿨으면 OrderService)
    if (next === 'mock') { if (!a.repo) { b.repo = true; b.stubRepo = !a.svc; } else { b.svc = true; b.stubSvc = true; b.stubRepo = false; } }
    return [a, b];
  },
  code: function (c) {
    var unit = c.kind === 'unit', boot = c.kind === 'boot', next = unit ? 'same' : c.next, cf = this.conf(c), A = cf[0], B = cf[1];
    function unitBody(f) {
      var s = '';
      if (f.svc) s += '        OrderService orderService = mock(OrderService.class);   // 가짜 객체\n' + (f.stubSvc ? '        when(orderService.findName(1L)).thenReturn("키보드");\n' : '');
      else if (f.repo) s += '        OrderRepository orderRepository = mock(OrderRepository.class);   // 가짜 객체\n        when(orderRepository.findName(1L)).thenReturn("키보드");\n        OrderService orderService = new OrderService(orderRepository);\n';
      else s += '        OrderRepository orderRepository = new OrderRepository();\n        OrderService orderService = new OrderService(orderRepository);\n';
      return s + '        OrderController orderController = new OrderController(orderService);\n\n        assertEquals("키보드", orderController.name(1L));\n';
    }
    function fields(f) {
      var s = '    @Autowired\n    MockMvc mockMvc;                      // 서버 없이 요청을 보내는 도구\n';
      var svcF = '\n    @MockitoBean\n    OrderService orderService;            // 가짜 OrderService를 빈으로 넣는다\n', repoF = '\n    @MockitoBean\n    OrderRepository orderRepository;      // 가짜 OrderRepository를 빈으로 넣는다\n';
      // 첫 번째 클래스에 있던 필드를 먼저 적고, 두 번째 클래스에서 더한 필드를 뒤에 적는다
      return s + (A.repo ? (f.repo ? repoF : '') + (f.svc ? svcF : '') : (f.svc ? svcF : '') + (f.repo ? repoF : ''));
    }
    function mvcBody(f) {
      var stub = f.svc ? (f.stubSvc ? '        when(orderService.findName(1L)).thenReturn("키보드");\n\n' : '') : f.repo && f.stubRepo ? '        when(orderRepository.findName(1L)).thenReturn("키보드");\n\n' : '';
      return stub + '        mockMvc.perform(get("/orders/1"))\n               .andExpect(status().isOk())\n               .andExpect(content().string("키보드"));\n';
    }
    var ann = boot ? '@SpringBootTest\n@AutoConfigureMockMvc                    // MockMvc를 쓸 수 있게 한다\n' : '@WebMvcTest(OrderController.class)\n';
    var s = '';
    if (unit) {
      s += '// 첫 번째 테스트 클래스. 스프링의 애노테이션이 없다\nclass OrderControllerTest {\n\n    @Test\n    void returnsOrderName() {\n' + unitBody(A) + '    }\n}\n\n';
      s += '// 두 번째 테스트 클래스. 내용은 첫 번째와 같다\nclass OrderControllerSecondTest {\n    // returnsOrderName()이 OrderControllerTest와 같다\n}\n';
    } else {
      s += '// 첫 번째 테스트 클래스\n' + ann + (A.dirty ? '@DirtiesContext                          // 끝나면 컨텍스트를 버린다\n' : '') + 'class OrderControllerTest {\n\n' + fields(A) + '\n    @Test\n    void returnsOrderName() throws Exception {\n' + mvcBody(A) + '    }\n}\n\n';
      s += '// 이어서 실행되는 두 번째 테스트 클래스\n' + ann + (B.profile ? '@ActiveProfiles("test")                  // 프로필이 다르다\n' : '') + 'class OrderControllerSecondTest {\n';
      if (next === 'mock') s += '\n' + fields(B) + '\n    @Test\n    void returnsOrderName() throws Exception {\n' + mvcBody(B) + '    }\n}\n';
      else s += '    // 필드와 returnsOrderName()이 OrderControllerTest와 같다\n}\n';
    }
    s += '\n// ---- 테스트 대상: 컨트롤러 → 서비스 → 리포지토리 ----\n@RestController\nclass OrderController {\n    private final OrderService orderService;\n\n    public OrderController(OrderService orderService) {\n        this.orderService = orderService;\n    }\n\n    @GetMapping("/orders/{id}")\n    public String name(@PathVariable Long id) {\n        return orderService.findName(id);\n    }\n}\n\n' +
      '@Service\nclass OrderService {\n    private final OrderRepository orderRepository;\n\n    public OrderService(OrderRepository orderRepository) {\n        this.orderRepository = orderRepository;\n    }\n\n    public String findName(Long id) {\n        return orderRepository.findName(id);\n    }\n}\n\n' +
      '@Repository\nclass OrderRepository {\n    // DB 대신 쓰는 맵\n    private final Map<Long, String> db = Map.of(1L, "키보드");\n\n    public String findName(Long id) {\n        return db.get(id);\n    }\n}';
    return s;
  },
  label: function (c) {
    var unit = c.kind === 'unit';
    return { unit: '스프링 없이', boot: '@SpringBootTest', webmvc: '@WebMvcTest' }[c.kind] + ' · ' + { none: '가짜 없음', svc: '서비스 가짜', bare: '서비스 가짜(값 안 정함)', repo: '리포지토리 가짜' }[c.mock] +
      (unit ? '' : ' · 둘째: ' + { same: '설정 같음', mock: '@MockitoBean 하나 더', profile: '프로필 다름', dirty: '첫째에 @DirtiesContext' }[c.next]);
  },
  columns: ['첫 번째 클래스의 결과', '첫 번째 클래스의 컨트롤러 · 서비스 · 리포지토리', '두 번째 클래스의 결과', '스프링 컨텍스트를 만든 횟수'],
  simulate: function (c) {
    var kind = c.kind, unit = kind === 'unit', boot = kind === 'boot', next = unit ? 'same' : c.next, cf = this.conf(c), A = cf[0], B = cf[1], ev = [], sum = [];
    var PASS = '통과', FAIL = '실패 (기대한 값과 다름)', DOWN = '컨텍스트 기동 실패', SKIP = '컨텍스트 기동 실패 (다시 시도하지 않음)';
    var CN = ['OrderControllerTest', 'OrderControllerSecondTest'];
    var annS = boot ? '@SpringBootTest' : '@WebMvcTest', annL = boot ? '@SpringBootTest' : '@WebMvcTest(OrderController.class)';
    // 컨트롤러, 서비스, 리포지토리가 각각 진짜인지 가짜인지 없는지
    function beans(f) {
      if (unit) return ['진짜', f.svc ? '가짜' : '진짜', f.svc ? '없음' : f.repo ? '가짜' : '진짜'];
      if (boot) return ['진짜', f.svc ? '가짜' : '진짜', f.repo ? '가짜' : '진짜'];
      return ['진짜', f.svc ? '가짜' : '없음', f.repo ? '가짜' : '없음'];
    }
    function loads(f) { return !(kind === 'webmvc' && !f.svc); }                    // @WebMvcTest에는 OrderService가 가짜로라도 있어야 컨트롤러를 만들 수 있다
    function value(f) { return f.svc ? (f.stubSvc ? '키보드' : null) : f.repo ? (f.stubRepo ? '키보드' : null) : '키보드'; }
    function key(f) { return (f.svc ? 'S' : '') + (f.repo ? 'R' : '') + (f.profile ? 'P' : ''); }     // 캐시의 키: 설정이 같으면 같다
    function nMock(f) { return (f.svc ? 1 : 0) + (f.repo ? 1 : 0); }
    function cfgText(f) { return annS + ' · ' + (nMock(f) ? '가짜 빈 ' + nMock(f) + '개' : '가짜 빈 없음') + (f.profile ? ' · 프로필 test' : ''); }
    function path(f) {
      if (f.svc) return f.stubSvc ? '가짜 OrderService가 정해 둔 대로 "키보드"를 돌려줍니다.' : '가짜 OrderService는 돌려줄 값을 정해 둔 적이 없어서 null을 돌려줍니다.';
      if (f.repo) return '진짜 OrderService가 가짜 OrderRepository를 부르고, 가짜가 정해 둔 대로 "키보드"를 돌려줍니다.';
      return '진짜 OrderService가 진짜 OrderRepository의 맵에서 "키보드"를 찾아 돌려줍니다.';
    }
    var st = { now: 0, s1: '아직 실행 전', s2: '아직 실행 전', k1: '', k2: '', ctxs: [], made: 0, got: '', use1: -1, use2: -1, how1: '', how2: '' };
    function push(s, k) { ev.push({ s: s, k: k || '', snap: JSON.parse(JSON.stringify(st)) }); }
    function set(n, text, k) { st['s' + n] = text; st['k' + n] = k || ''; }
    var res = ['', ''], used = [null, null], cache = {}, failed = {}, okCount = 0;

    // ---- 스프링 없이 하는 단위 테스트 ----
    function runUnit(n, f) {
      var v = value(f), b = beans(f), ok = v === '키보드';
      st.now = n; st.got = '';
      if (n === 2) {
        st.ctxs.push({ n: 2, cfg: '', beans: b, state: 'obj' }); st.use2 = 1; st.how2 = '직접 만듦'; st.got = v === null ? 'null' : '"' + v + '"'; set(2, ok ? PASS : FAIL, ok ? 'good' : 'bad');
        push(CN[1] + ' 실행: 같은 방식으로 쓴 두 번째 테스트 클래스입니다. 객체를 다시 직접 만들고 같은 메서드를 불러 ' + (ok ? '통과합니다.' : '같은 이유로 실패합니다.') + ' 두 클래스를 실행하는 동안 스프링 컨텍스트는 한 번도 만들어지지 않았습니다.', ok ? 'good' : 'bad');
        return ok ? PASS : FAIL;
      }
      set(1, '테스트 메서드 실행 중', 'hot');
      push(CN[0] + ' 실행 시작: 이 클래스에는 @SpringBootTest나 @WebMvcTest 같은 스프링의 테스트 애노테이션이 없습니다. 스프링은 관여하지 않고, JUnit이 곧바로 테스트 메서드 returnsOrderName을 부릅니다.');
      var cx = { n: 1, cfg: '', beans: ['없음', '없음', '없음'], state: 'obj' }; st.ctxs.push(cx); st.use1 = 0; st.how1 = '직접 만듦';
      if (f.svc) {
        cx.beans = ['없음', '가짜', '없음'];
        push('mock(OrderService.class) 실행: Mockito가 OrderService와 메서드 모양이 같은 가짜 객체를 만듭니다. 진짜 OrderService의 코드는 들어 있지 않고, 정해 준 값만 돌려주는 객체입니다.');
        if (f.stubSvc) push('when(orderService.findName(1L)).thenReturn("키보드") 실행: 가짜 OrderService에게 "findName(1L)이 불리면 키보드를 돌려주라"고 정해 둡니다.');
        cx.beans = b;
        push('new OrderController(orderService) 실행: 가짜 OrderService를 생성자에 넘겨 진짜 OrderController를 직접 만듭니다. 컨트롤러가 쓰는 것은 서비스뿐이므로 OrderRepository는 만들지 않습니다.');
      } else if (f.repo) {
        cx.beans = ['없음', '없음', '가짜'];
        push('mock(OrderRepository.class) 실행: Mockito가 OrderRepository와 메서드 모양이 같은 가짜 객체를 만듭니다. 진짜 OrderRepository의 코드는 들어 있지 않고, 정해 준 값만 돌려주는 객체입니다.');
        push('when(orderRepository.findName(1L)).thenReturn("키보드") 실행: 가짜 OrderRepository에게 "findName(1L)이 불리면 키보드를 돌려주라"고 정해 둡니다.');
        cx.beans = b;
        push('new OrderService(orderRepository), new OrderController(orderService) 실행: 가짜 리포지토리를 진짜 OrderService의 생성자에 넘기고, 그 서비스를 다시 OrderController의 생성자에 넘깁니다. 스프링이 하던 주입을 직접 하는 것입니다.');
      } else {
        cx.beans = b;
        push('new로 객체 만들기: 테스트 메서드가 OrderRepository, OrderService, OrderController를 차례로 new로 만듭니다. 앞에서 만든 객체를 다음 객체의 생성자에 넘겨 서로 연결합니다. 스프링이 하던 주입을 직접 하는 것입니다.');
      }
      st.got = v === null ? 'null' : '"' + v + '"';
      push('orderController.name(1L) 호출: HTTP 요청 없이 컨트롤러의 메서드를 직접 부릅니다. 컨트롤러는 orderService.findName(1)을 부릅니다. ' + path(f));
      set(1, ok ? PASS : FAIL, ok ? 'good' : 'bad');
      push(ok ? 'assertEquals("키보드", ...) 확인: 돌려받은 값이 기대한 "키보드"와 같습니다. 테스트가 통과합니다.' : 'assertEquals("키보드", ...) 확인: 돌려받은 값이 null이라 기대한 "키보드"와 다릅니다. AssertionFailedError가 나고 테스트가 실패합니다.', ok ? 'good' : 'bad');
      return ok ? PASS : FAIL;
    }

    // ---- 스프링 컨텍스트를 띄우는 테스트 ----
    function build(n, f, k) {
      var b = beans(f), nm = nMock(f), ord = n === 1 ? '' : '두 번째 컨텍스트의 ';
      var cx = { n: st.ctxs.length + 1, cfg: cfgText(f), beans: boot ? ['진짜', '진짜', '진짜'] : ['진짜', '없음', '없음'], state: 'build' };
      st.ctxs.push(cx); st.made++; st['use' + n] = st.ctxs.length - 1; st['how' + n] = '새로 만듦';
      return { cx: cx, b: b, nm: nm, ord: ord };
    }
    function register(n, f, w) {
      push(w.ord + '빈 등록 (' + annS + '): ' + (boot ? '애플리케이션을 실제로 띄울 때처럼 컴포넌트 스캔을 전부 합니다. OrderController, OrderService, OrderRepository가 모두 빈으로 등록됩니다.' : '웹 계층에 속한 것만 등록합니다. @RestController가 붙은 OrderController는 빈이 되고, @Service가 붙은 OrderService와 @Repository가 붙은 OrderRepository는 등록되지 않습니다.'));
      if (w.nm) {
        w.cx.beans = w.b;
        var what = w.nm === 2 ? 'OrderService와 OrderRepository' : f.svc ? 'OrderService' : 'OrderRepository';
        push((w.nm === 2 ? w.ord + '@MockitoBean 필드 두 개 처리: ' : w.ord + '@MockitoBean ' + what + ' 처리: ') + (boot ? '등록된 진짜 ' + what + ' 자리를 Mockito가 만든 가짜 객체가 대신 차지합니다. 이 컨텍스트에서 ' + what + '를 주입받는 곳은 모두 가짜를 받습니다.' : '컨텍스트에 ' + what + ' 빈이 없으므로, Mockito가 만든 가짜 객체가 빈으로 추가됩니다.'));
      }
    }
    function runCtx(n, f) {
      var k = key(f), v = value(f), ok = v === '키보드', w;
      st.now = n; st.got = ''; set(n, '컨텍스트 준비 중', 'hot');
      if (n === 1) {
        push(CN[0] + ' 실행 시작: JUnit이 첫 번째 테스트 클래스를 실행합니다. 클래스에 ' + annL + '가 붙어 있으므로, 테스트 메서드를 부르기 전에 스프링이 이 클래스가 쓸 컨텍스트를 준비합니다.');
        w = build(1, f, k);
        push('컨텍스트 캐시 조회: 스프링은 테스트용 컨텍스트를 한 번 만들면 캐시에 보관해 두고, 설정이 같은 테스트 클래스가 오면 다시 내줍니다. 지금은 첫 클래스라 캐시가 비어 있습니다. 컨텍스트를 새로 만들기 시작합니다(1번째).');
        register(1, f, w);
      } else {
        var same = key(A) === k;
        push(CN[1] + ' 실행 시작: 같은 JVM에서 두 번째 테스트 클래스가 이어서 실행됩니다. ' + (next === 'mock' ? '첫 번째 클래스의 설정에 @MockitoBean ' + (A.repo ? 'OrderService' : 'OrderRepository') + ' 필드가 하나 더 있습니다.' : next === 'profile' ? '첫 번째 클래스와 같은데 @ActiveProfiles("test")가 붙어 있습니다.' : '애노테이션과 필드가 첫 번째 클래스와 같습니다.') + ' 이 클래스에도 컨텍스트가 필요합니다.');
        if (same && k in cache) {
          st.use2 = cache[k]; st.how2 = '다시 씀'; used[1] = cache[k]; set(2, '테스트 메서드 실행 중', 'hot');
          push('컨텍스트 캐시 조회: 설정이 첫 번째 클래스와 같으므로 캐시에서 같은 컨텍스트를 찾습니다. 새로 만들지 않고 첫 번째 클래스가 쓰던 컨텍스트를 그대로 받습니다.', 'good');
          return test(2, f);
        }
        if (same && failed[k]) {
          st.got = '실행되지 않음'; st.how2 = ''; set(2, SKIP, 'bad');
          push('컨텍스트 캐시 조회: 설정이 첫 번째 클래스와 같은데, 그 설정의 컨텍스트는 기동에 실패해서 캐시에 없습니다. 스프링은 같은 설정으로 한 번 실패한 컨텍스트를 다시 만들어 보지 않습니다(기본 한도 1번). 만들기를 시작하지도 않고 "failure threshold (1) exceeded"라는 IllegalStateException으로 테스트를 바로 실패시킵니다.', 'bad');
          return SKIP;
        }
        w = build(2, f, k);
        push('컨텍스트 캐시 조회: ' + (same ? '설정은 첫 번째 클래스와 같지만, 그 컨텍스트는 @DirtiesContext 때문에 방금 캐시에서 빠졌습니다. 같은 설정의 컨텍스트를 처음부터 다시 만들기 시작합니다(' + st.made + '번째).'
          : (next === 'mock' ? '@MockitoBean이 붙은 필드의 구성이 다르면 컨텍스트에 들어갈 빈이 달라지므로, 스프링은 다른 설정으로 봅니다.' : '활성 프로필이 다르면 읽는 설정 파일과 등록되는 빈이 달라질 수 있으므로, 스프링은 다른 설정으로 봅니다.') + ' 캐시에 맞는 컨텍스트가 없어 새로 만들기 시작합니다(' + st.made + '번째).' + (key(A) in cache ? ' 첫 번째 컨텍스트는 캐시에 그대로 남아 있습니다.' : '')));
        register(2, f, w);
      }
      if (!loads(f)) {
        w.cx.state = 'fail'; failed[k] = true; st.got = '실행되지 않음'; set(n, DOWN, 'bad');
        push('OrderController 생성 실패: 스프링이 컨트롤러를 만들려면 생성자가 요구하는 OrderService 빈이 있어야 하는데 컨텍스트에 없습니다. NoSuchBeanDefinitionException이 나고 컨텍스트 기동이 중단됩니다.' + (f.repo ? ' 가짜 OrderRepository를 넣어 두었지만, 컨트롤러가 요구하는 것은 OrderService라서 도움이 되지 않습니다.' : ''), 'bad');
        push('returnsOrderName 실패 처리: 컨텍스트가 없으니 @Autowired MockMvc 필드를 채울 수 없습니다. 테스트 메서드의 본문은 한 줄도 실행되지 않고, "Failed to load ApplicationContext"라는 IllegalStateException으로 실패가 기록됩니다.', 'bad');
        return DOWN;
      }
      w.cx.state = 'up'; cache[k] = st.ctxs.length - 1; used[n - 1] = cache[k]; okCount++; set(n, '테스트 메서드 실행 중', 'hot');
      push((n === 1 ? 'OrderController 생성: ' : '두 번째 컨텍스트 기동 완료: ') + '스프링이 컨트롤러를 만들면서 생성자가 요구하는 OrderService를 컨텍스트에서 찾아 넣습니다. ' + (f.svc ? '들어가는 것은 가짜 OrderService입니다.' : '들어가는 것은 진짜 OrderService이고, 그 안에는 ' + (f.repo ? '가짜' : '진짜') + ' OrderRepository가 들어 있습니다.') + ' 컨텍스트가 다 떴고 캐시에 보관됩니다.', 'good');
      return test(n, f);
    }
    function test(n, f) {
      var v = value(f), ok = v === '키보드', stubbed = f.svc ? f.stubSvc : f.repo && f.stubRepo, who = f.svc ? 'orderService' : 'orderRepository', whoK = f.svc ? 'OrderService' : 'OrderRepository';
      if (n === 1) {
        if (stubbed) push('when(' + who + '.findName(1L)).thenReturn("키보드") 실행: 테스트 메서드의 첫 줄입니다. 가짜 ' + whoK + '에게 "findName(1L)이 불리면 키보드를 돌려주라"고 정해 둡니다.');
        st.got = v === null ? '빈 응답' : '"' + v + '"';
        push('mockMvc.perform(get("/orders/1")) 실행: MockMvc가 서버를 띄우지 않고 GET /orders/1 요청을 스프링 MVC에 직접 넣어 줍니다. 주소에 맞는 OrderController.name(1)이 불리고, 컨트롤러는 orderService.findName(1)을 부릅니다. ' + path(f) + (v === null ? ' 그래서 응답 본문이 비어 있습니다.' : ''));
        set(1, ok ? PASS : FAIL, ok ? 'good' : 'bad');
        push(ok ? 'andExpect(content().string("키보드")) 확인: 응답 상태가 200이고 본문이 "키보드"입니다. 테스트가 통과합니다.' : 'andExpect(content().string("키보드")) 확인: 응답 상태는 200이지만 본문이 비어 있어 기대한 "키보드"와 다릅니다. AssertionError가 나고 테스트가 실패합니다. 컨텍스트는 정상으로 떴고, 틀린 것은 결과 값입니다.', ok ? 'good' : 'bad');
      } else {
        st.got = v === null ? '빈 응답' : '"' + v + '"'; set(2, ok ? PASS : FAIL, ok ? 'good' : 'bad');
        push('returnsOrderName 실행 (두 번째 클래스): ' + (stubbed ? '가짜 ' + whoK + '에 돌려줄 값을 정한 뒤 ' : '') + 'GET /orders/1 요청을 보냅니다. ' + path(f) + (ok ? ' 응답 본문이 "키보드"라서 테스트가 통과합니다.' : ' 응답 본문이 비어 있어 테스트가 실패합니다.'), ok ? 'good' : 'bad');
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
          push(CN[0] + ' 종료 (@DirtiesContext): 이 애노테이션은 "이 클래스가 컨텍스트의 상태를 바꿔 놓았으니 다른 테스트가 다시 쓰면 안 된다"는 표시입니다. 클래스의 테스트가 모두 끝나면 스프링이 이 컨텍스트를 닫고 캐시에서 뺍니다.');
        } else push(CN[0] + ' 종료 (@DirtiesContext): 닫을 컨텍스트가 없습니다. 기동에 실패한 컨텍스트는 캐시에 들어간 적이 없기 때문입니다.');
      }
      res[1] = runCtx(2, B);
    }

    var loaded1 = unit || used[0] !== null, loaded2 = unit || used[1] !== null;
    var b1 = loaded1 ? beans(A).join(' · ') : '만들어지지 않음', b2 = loaded2 ? beans(B).join(' · ') : '만들어지지 않음';
    var shared = unit || used[0] === null || used[1] === null ? '-' : used[0] === used[1] ? '같은 컨텍스트' : '다른 컨텍스트';
    if (unit) {
      if (c.mock === 'bare') sum.push('mock()으로 만든 가짜 객체는 돌려줄 값을 정해 주지 않은 메서드에서 null을 돌려줍니다(여기서는 반환 타입이 String인 메서드). when(...).thenReturn(...)으로 값을 정해 주어야 합니다.');
      sum.push('스프링 없이 new와 Mockito만으로 하는 테스트는 컨텍스트를 띄우지 않아 준비할 것이 가장 적습니다. 대신 주소 매핑(@GetMapping)이나 빈 주입처럼 스프링이 해 주는 일은 이 테스트로 확인되지 않습니다.');
    } else if (res[0] === DOWN) {
      sum.push(A.repo ? '@WebMvcTest에서 가짜로 채워야 하는 것은 컨트롤러가 직접 의존하는 OrderService입니다. OrderRepository만 가짜로 넣으면 OrderService 빈이 여전히 없어서 컨텍스트가 뜨지 않습니다.' : '@WebMvcTest는 컨트롤러 같은 웹 계층의 빈만 등록합니다. 컨트롤러가 의존하는 OrderService는 @MockitoBean으로 직접 채워 주어야 컨텍스트가 뜹니다.');
      if (res[1] === SKIP) sum.push('같은 설정으로 한 번 기동에 실패하면, 스프링은 그 설정의 컨텍스트를 다시 만들어 보지 않고 뒤의 테스트를 바로 실패시킵니다. 실패한 테스트가 여러 개로 보여도 원인은 하나일 수 있으므로, 맨 처음 실패의 메시지를 봅니다.');
      else if (res[1] === DOWN) sum.push('두 번째 클래스는 설정이 달라서 컨텍스트 만들기를 한 번 더 시도했습니다. 하지만 OrderService 빈이 없기는 마찬가지라 똑같이 실패했습니다.');
      else sum.push('두 번째 클래스에는 @MockitoBean OrderService가 있어서 컨텍스트가 뜨고 테스트가 통과했습니다. 컨텍스트는 설정마다 따로 만들어지므로, 한 클래스의 기동 실패가 설정이 다른 클래스로 번지지 않습니다.');
    } else {
      if (boot) sum.push('@SpringBootTest의 컨텍스트에는 컨트롤러, 서비스, 리포지토리가 모두 들어 있습니다. ' + (nMock(A) ? '@MockitoBean을 붙인 것만 가짜로 바뀌고 나머지는 진짜입니다.' : '가짜 없이도 여러 계층이 실제로 이어져 동작하는 것을 확인할 수 있습니다. 대신 등록되는 빈이 많아 컨텍스트가 큽니다.'));
      else sum.push('@WebMvcTest로 만든 첫 번째 컨텍스트에는 진짜 컨트롤러와 가짜 서비스만 있고 리포지토리는 없습니다. 주소 매핑과 응답을 확인하는 테스트이고, 서비스와 리포지토리의 실제 동작은 확인하지 않습니다.');
      if (c.mock === 'bare') sum.push('@MockitoBean으로 넣은 가짜 객체는 돌려줄 값을 정하지 않으면 null을 돌려줍니다. 컨텍스트는 문제없이 떴으므로 "컨텍스트 기동 실패"가 아니라, 기대한 값인지 확인하는 줄(단언)에서 실패합니다.');
      sum.push(next === 'same' ? '설정이 같은 테스트 클래스들은 컨텍스트를 한 번만 만들어 함께 씁니다. 테스트 클래스가 늘어도 컨텍스트를 띄우는 횟수는 늘지 않습니다.'
        : next === 'mock' ? '@MockitoBean의 구성이 다르면 다른 컨텍스트가 필요합니다. 클래스마다 가짜로 바꾸는 빈이 제각각이면 그 가짓수만큼 컨텍스트를 새로 띄우게 되어 전체 테스트가 느려집니다.'
        : next === 'profile' ? '@ActiveProfiles가 다르면 다른 컨텍스트가 필요합니다. 여기서는 들어 있는 빈이 똑같은데도, 설정이 다르므로 스프링은 새로 만듭니다.'
        : '@DirtiesContext는 컨텍스트를 닫고 캐시에서 빼므로, 설정이 같은 다음 클래스도 처음부터 다시 만듭니다. 테스트가 컨텍스트의 상태를 실제로 바꿔 놓았을 때만 씁니다.');
    }
    return { events: ev, summary: sum, unit: unit, check: [b2, '성공 ' + okCount + '번', shared], row: [res[0], b1, res[1], st.made + '번'] };
  },
  render: function (v, sim, t, H, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : null;
    if (!s) { H.text(v, '실행을 누르면 한 단계씩 진행합니다.'); return; }
    var cell = function (x) { return { v: x, cls: x === '가짜' ? 'hot' : x === '진짜' ? 'good' : '' }; };
    var stateText = { build: '만드는 중', up: '캐시에 있음', fail: '기동 실패', closed: '닫힘', obj: '' };
    if (sim.unit) H.table(v, ['만든 곳', '컨트롤러', '서비스', '리포지토리'], s.ctxs.map(function (x) { return { cells: [x.n === 1 ? '첫 번째 테스트' : '두 번째 테스트', cell(x.beans[0]), cell(x.beans[1]), cell(x.beans[2])] }; }), '테스트 메서드가 직접 만든 객체 (스프링 컨텍스트 없음)');
    else H.table(v, ['컨텍스트', '컨트롤러', '서비스', '리포지토리', '상태'], s.ctxs.map(function (x) { return { cls: x.state === 'closed' ? 'gone' : '', cells: [x.n + '번째', cell(x.beans[0]), cell(x.beans[1]), cell(x.beans[2]), { v: stateText[x.state], cls: x.state === 'fail' ? 'bad' : x.state === 'up' ? 'good' : '' }] }; }), '스프링이 만든 컨텍스트' + (s.ctxs.length ? '' : ' (아직 없음)'));
  },
  // 그림: 왼쪽이 차례로 실행되는 두 테스트 클래스, 오른쪽 점선 영역이 컨텍스트 캐시다. 캐시 안의 긴 상자 하나가 컨텍스트 하나이고, 그 안의 세 칸이 컨트롤러·서비스·리포지토리 빈(초록 진짜, 노랑 가짜, 점선 없음)이다. 테스트 클래스에서 나온 화살표가 어느 컨텍스트를 쓰는지 가리킨다.
  draw: function (P, sim, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : { now: 0, s1: '아직 실행 전', s2: '아직 실행 전', k1: '', k2: '', ctxs: [], made: 0, got: '', use1: -1, use2: -1, how1: '', how2: '' };
    var unit = sim.unit, names = ['컨트롤러', '서비스', '리포지토리'];
    P.size(680, 302);
    function split(t) { var i = t.indexOf(' ('); return i < 0 ? [t] : [t.slice(0, i), t.slice(i + 2, -1)]; }
    P.box('t1', 10, 44, 156, 72, { cls: (s.k1 || 'plain') + (s.now === 1 ? ' now' : ''), title: '첫 번째 테스트 클래스', sub: split(s.s1) });
    P.box('t2', 10, 148, 156, 72, { cls: (s.k2 || 'plain') + (s.now === 2 ? ' now' : ''), title: '두 번째 테스트 클래스', sub: split(s.s2) });
    P.region('cache', 236, 6, 434, 236, unit ? '스프링 컨텍스트 없음: 테스트 메서드가 직접 만든 객체' : '컨텍스트 캐시 (테스트를 실행하는 JVM 안에 있음)');
    if (!s.ctxs.length) P.text('empty', 453, 128, unit ? '아직 만든 객체가 없음' : '비어 있음', { cls: 'mut', anchor: 'middle' });
    s.ctxs.forEach(function (x, i) {
      var y = 32 + i * 104, id = 'ctx' + (i + 1);
      P.box(id, 246, y, 414, 96, { cls: x.state === 'fail' ? 'bad' : x.state === 'closed' ? 'ghost' : x.state === 'build' ? 'wait now' : 'plain',
        title: unit ? (i === 0 ? '첫 번째' : '두 번째') + ' 테스트가 new와 mock으로 만든 객체' : x.n + '번째 컨텍스트', sub: unit ? [] : [x.cfg],
        right: { build: '만드는 중', up: '캐시에 보관', fail: '기동 실패', closed: '닫힘', obj: '' }[x.state] });
      x.beans.forEach(function (b, j) {
        P.box(id + 'b' + j, 251 + j * 135, y + 52, 132, 34, { cls: x.state === 'closed' ? 'ghost' : b === '진짜' ? 'good' : b === '가짜' ? 'hot' : 'ghost', title: names[j], right: b });
      });
    });
    if (s.use1 >= 0 && s.how1) P.arrow('a1', 't1:r', 'ctx' + (s.use1 + 1) + ':l', { cls: s.ctxs[s.use1].state === 'fail' ? 'bad' : s.ctxs[s.use1].state === 'closed' ? 'mut' : '', label: s.how1 });
    if (s.use2 >= 0 && s.how2) P.arrow('a2', 't2:r', 'ctx' + (s.use2 + 1) + ':l' + (s.use2 === 0 ? ':0.8' : ''), { cls: s.how2 === '다시 씀' ? 'good' : s.ctxs[s.use2].state === 'fail' ? 'bad' : '', label: s.how2 });
    P.box('cnt', 10, 254, 326, 38, { cls: s.made ? 'hot' : 'ghost', title: '스프링 컨텍스트를 만든 횟수', right: s.made + '번' });
    P.box('got', 344, 254, 326, 38, { cls: s.got === '"키보드"' ? 'good' : s.got ? 'bad' : 'ghost', title: '지금 테스트가 받은 값', right: s.got || '아직 없음' });
    P.note(unit ? '오른쪽은 테스트 메서드가 new와 mock(...)으로 직접 만든 객체입니다. 초록은 진짜 객체, 노랑은 Mockito가 만든 가짜, 점선은 만들지 않은 것입니다.'
      : '오른쪽의 긴 상자 하나가 스프링 컨텍스트 하나이고, 그 안의 세 칸이 빈입니다. 초록은 진짜 빈, 노랑은 @MockitoBean으로 넣은 가짜, 점선은 등록되지 않은 것입니다. 두 번째 클래스의 화살표가 첫 번째 컨텍스트로 가면 다시 쓴 것이고, 새 상자로 가면 한 번 더 만든 것입니다.');
  },
  assume: '서른여섯 가지 조합 모두를 이 PC에서 실제로 실행해 대조했습니다(테스트 방식 셋 × 가짜 객체 넷 × 두 번째 클래스 넷. 스프링 없는 테스트는 두 번째 클래스 설정이 뜻이 없어 네 가지만). 버전은 스프링 부트 4.1.1, 스프링 프레임워크와 spring-test 7.0.9, JUnit Jupiter 6.0.3, Mockito 5.23.0, JDK 21입니다. Gradle이나 Maven 없이 JUnit Platform Launcher로 두 테스트 클래스를 차례로 실행했고, 컨텍스트 캐시가 JVM 안에 있으므로 조합마다 자바 프로세스를 새로 띄웠습니다. 대조한 것은 두 클래스의 결과(통과, 단언 실패, 컨텍스트 기동 실패, 다시 시도하지 않은 실패), 각 클래스가 쓴 컨트롤러·서비스·리포지토리가 진짜인지 Mockito의 가짜인지 없는지, 컨텍스트 만들기를 시작한 횟수(설정 클래스의 생성자가 불린 횟수로 셌고 기동에 실패한 것도 포함), 기동에 성공한 횟수, 두 클래스가 같은 컨텍스트 객체를 받았는지입니다. ' +
    '스프링 부트 4에서는 @MockBean이 없고(4.1.1의 spring-boot-test jar에 그 클래스가 없음을 확인) 스프링 프레임워크의 @MockitoBean(org.springframework.test.context.bean.override.mockito)을 씁니다. @WebMvcTest와 @AutoConfigureMockMvc는 spring-boot-webmvc-test 모듈의 org.springframework.boot.webmvc.test.autoconfigure 패키지에 있습니다. 3.x의 패키지 이름과 다르므로 import 문을 옮겨 적을 때 주의합니다. ' +
    '자동 설정의 통제: 이 PC의 클래스패스에는 스프링 시큐리티, H2와 HikariCP, Hibernate, 스프링 데이터 JPA, 액추에이터가 함께 있습니다. 대조 실행에서는 @SpringBootApplication의 exclude로 시큐리티 자동 설정 다섯 개와 DataSource, Hibernate JPA, 스프링 데이터 JPA 리포지토리 자동 설정을 뺐습니다. 빼지 않고 실행했을 때는 @SpringBootTest의 요청이 시큐리티에 막혀 401이 되었고 @WebMvcTest는 그대로 통과했습니다(실습을 만들면서 따로 실행해 본 결과이며, 저장해 둔 대조 출력에는 들어 있지 않습니다. 이 클래스패스에서 @WebMvcTest가 불러오는 자동 설정 목록에는 시큐리티가 없었습니다. spring-boot-security-test 모듈이 있을 때의 동작은 확인하지 않았습니다). 화면의 @SpringBootApplication 클래스는 생략했습니다. ' +
    '화면의 코드와 대조용 코드의 차이: 대조용 코드는 테스트 클래스의 이름이 다르고, 같은 본문을 abstract 클래스에서 물려받으며, 객체가 진짜인지 가짜인지 적어 두는 줄과 컨텍스트 횟수를 세는 코드가 더 있습니다. "@MockitoBean이 하나 더 있다"는 첫 번째 클래스가 바꾸지 않은 것 하나(OrderRepository, 이미 바꿨으면 OrderService)를 더 바꾼 경우입니다. DB는 화면과 실행 모두 메모리의 맵으로 대신했습니다. ' +
    '같은 설정의 컨텍스트가 한 번 실패하면 다시 만들지 않는 한도는 spring.test.context.failure.threshold이고 기본값이 1입니다(spring-test 7.0.9의 상수로 확인). @DirtiesContext는 클래스에 붙였을 때의 기본 동작(클래스의 테스트가 끝난 뒤 닫음)만 다뤘습니다. 이 PC에서 컨텍스트의 빈 정의 수는 @SpringBootTest가 303개, @WebMvcTest가 130개였고(가짜 빈이 추가되면 131개), 이 수는 클래스패스와 위의 exclude에 따라 달라집니다. 걸린 시간은 실행할 때마다 달라서 결과 표에 넣지 않았습니다. 이 PC의 한 번 실행에서 첫 번째 클래스는 스프링 없는 테스트가 약 0.7~0.9초(Mockito 준비 포함), @WebMvcTest가 약 2.7초, @SpringBootTest가 약 3.4~4.4초였고, 컨텍스트를 다시 쓴 두 번째 클래스는 0.05초 이하였습니다. ' +
    'Mockito는 JDK 21에서 가짜 객체를 만들기 위해 실행 중에 스스로 에이전트를 붙이며 경고를 내는데, 동작에는 지장이 없어 그대로 두었습니다. 테스트 메서드의 @Transactional 롤백, @DataJpaTest 같은 다른 슬라이스, @MockitoSpyBean, 캐시의 최대 크기, 빌드 도구가 테스트를 여러 프로세스로 나눠 실행하는 경우(캐시는 프로세스마다 따로입니다)는 다루지 않았고 실행으로 확인하지도 않았습니다.',
});

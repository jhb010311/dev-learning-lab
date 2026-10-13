Lab.register({
  id: 'scope', nav: '빈 스코프', cat: '스프링', mode: 'step',
  title: '프로토타입 빈인데 왜 객체가 하나뿐인가',
  intro: '스코프는 컨테이너가 빈 객체를 몇 개 만들고 언제까지 쓰는지를 정합니다. 싱글톤은 컨테이너에 하나, 프로토타입은 컨테이너에 달라고 할 때마다 새로 하나, request는 HTTP 요청마다 하나입니다. 그런데 싱글톤 빈이 다른 스코프의 빈을 주입받으면 기대와 다른 일이 생깁니다.',
  terms: ['빈 스코프', '스프링 빈(Bean)', 'ObjectProvider', '스코프 프록시', '프록시(Proxy)'],
  controls: [
    { id: 'scope', label: 'Cart 빈의 스코프', type: 'select', value: 'prototype', options: [['singleton', '싱글톤 (적지 않으면 이것)'], ['prototype', '프로토타입'], ['request', 'request (HTTP 요청)']] },
    { id: 'get', label: '싱글톤인 OrderService가 Cart를 얻는 방법', type: 'select', value: 'inject', options: [['inject', '생성자로 주입받아 필드에 둔다'], ['provider', 'ObjectProvider를 주입받아 쓸 때마다 꺼낸다'], ['proxy', 'Cart의 프록시를 주입받는다 (proxyMode)']] },
  ],
  presets: [
    { t: '처음 설정으로', q: '프로토타입 Cart를 싱글톤 OrderService가 생성자로 주입받아 필드에 두면 요청마다 Cart가 어떻게 쓰이나', d: '프로토타입 빈을 싱글톤 빈에 주입했습니다. 요청을 몇 번 보내도 같은 객체입니다.', v: { scope: 'prototype', get: 'inject' } },
    { t: 'ObjectProvider로 꺼내면', q: '싱글톤 OrderService가 ObjectProvider를 주입받아 쓸 때마다 꺼내면', d: '꺼낼 때마다 새 객체가 만들어집니다.', v: { scope: 'prototype', get: 'provider' } },
    { t: '싱글톤이면', q: 'Cart 빈의 스코프를 싱글톤으로 바꾸면', d: '어떻게 얻든 컨테이너에 하나뿐인 객체입니다.', v: { scope: 'singleton', get: 'inject' } },
    { t: 'request 스코프를 그대로 주입', q: 'Cart 빈의 스코프를 request로 바꾸고 생성자로 그대로 주입하면', d: '기동할 때는 요청이 없어서 만들 수 없습니다. 기동이 실패합니다.', v: { scope: 'request', get: 'inject' } },
    { t: 'request 스코프 + ObjectProvider', q: 'Cart 빈의 스코프를 request로 바꾸고 OrderService가 ObjectProvider를 주입받아 쓸 때마다 꺼내면', d: '같은 요청 안에서는 같은 객체, 다른 요청에는 다른 객체입니다.', v: { scope: 'request', get: 'provider' } },
    { t: 'request 스코프 + 프록시', q: 'Cart 빈의 스코프를 request로 바꾸고 OrderService가 Cart의 프록시(proxyMode)를 주입받으면', d: 'OrderService의 코드는 그대로 두고 요청마다 하나를 씁니다.', v: { scope: 'request', get: 'proxy' } },
    { t: '프로토타입 + 프록시', q: '프로토타입 Cart인데 OrderService가 Cart의 프록시(proxyMode)를 주입받으면', d: '메서드를 부를 때마다 새 객체가 만들어집니다.', v: { scope: 'prototype', get: 'proxy' } },
  ],
  code: function (c) {
    var line = c.get === 'proxy' ? '@Scope(value = "' + c.scope + '", proxyMode = ScopedProxyMode.TARGET_CLASS)\n' : c.scope === 'singleton' ? '' : '@Scope("' + c.scope + '")\n';
    var cart = '@Component\n' + line + 'class Cart {' + (c.scope === 'singleton' && c.get !== 'proxy' ? '                         // 스코프를 적지 않으면 싱글톤' : '') + '\n    private static int created = 0;   // 지금까지 만들어진 Cart 객체 수\n    private final int no;             // 몇 번째로 만들어진 객체인가\n\n    Cart() {\n        created++;\n        no = created;\n    }\n\n    public int no() {\n        return no;\n    }\n}';
    var svc = c.get === 'provider'
      ? '@Component\nclass OrderService {                  // 스코프를 적지 않았으므로 싱글톤\n    private final ObjectProvider<Cart> cartProvider;\n\n    OrderService(ObjectProvider<Cart> cartProvider) {\n        this.cartProvider = cartProvider;\n    }\n\n    int cartNo() {\n        Cart cart = cartProvider.getObject();   // 쓸 때마다 컨테이너에 달라고 한다\n        return cart.no();\n    }\n}'
      : '@Component\nclass OrderService {                  // 스코프를 적지 않았으므로 싱글톤\n    private final Cart cart;' + (c.get === 'proxy' ? '          // 들어오는 것은 Cart의 프록시' : '') + '\n\n    OrderService(Cart cart) {         // 주입은 OrderService가 만들어질 때 한 번뿐\n        this.cart = cart;\n    }\n\n    int cartNo() {\n        return cart.no();\n    }\n}';
    var ctl = '@RestController\nclass OrderController {\n    private final OrderService orderService;\n\n    OrderController(OrderService orderService) {\n        this.orderService = orderService;\n    }\n\n    @GetMapping("/order")\n    String order() {\n        int first = orderService.cartNo();\n        int second = orderService.cartNo();   // 한 요청 안에서 두 번 쓴다\n        return first + "," + second;\n    }\n}';
    return cart + '\n\n' + svc + '\n\n' + ctl;
  },
  label: function (c) { return { singleton: '싱글톤', prototype: '프로토타입', request: 'request' }[c.scope] + ' · ' + { inject: '그대로 주입', provider: 'ObjectProvider', proxy: '프록시' }[c.get]; },
  columns: ['기동 결과', '기동 직후 Cart 객체', '요청 두 번 뒤 Cart 객체', '요청 1이 쓴 Cart', '요청 2가 쓴 Cart'],
  simulate: function (c) {
    var sc = c.scope, g = c.get, ev = [], sum = [], name = { singleton: '싱글톤', prototype: '프로토타입', request: 'request' }[sc];
    var st = { phase: '기동 중', svc: '없음', holds: '', carts: [], req: 0, cur: 0, used: [[], []], result: '' };
    function push(s, k) { ev.push({ s: s, k: k, snap: JSON.parse(JSON.stringify(st)) }); }
    function make(when) { st.carts.push({ no: st.carts.length + 1, when: when, users: [], gone: false }); return st.carts.length; }
    // 컨테이너에 Cart를 달라고 했을 때 돌아오는 객체의 번호. 스코프가 여기서 갈린다
    var single = 0, perReq = {}, fresh = false;
    function lookup(r) {
      var before = st.carts.length, no;
      if (sc === 'singleton') { if (!single) single = make('기동 중에 생성'); no = single; }
      else if (sc === 'prototype') no = make(r ? '요청 ' + r + '에서 생성' : '기동 중에 생성');
      else { if (!perReq[r]) perReq[r] = make('요청 ' + r + '에서 생성'); no = perReq[r]; }
      fresh = st.carts.length > before;
      return no;
    }
    push('컨테이너 시작: orderController, orderService, cart 세 빈을 등록합니다. orderController와 orderService는 싱글톤이고, cart의 스코프는 ' + name + '입니다.', '');
    var chain = [], atStart = 0, held = 0;
    st.svc = '만드는 중';
    if (g === 'inject') {
      if (sc === 'request') {
        st.svc = '실패'; st.result = '기동 실패'; st.phase = '기동 실패';
        chain = ['UnsatisfiedDependencyException', 'UnsatisfiedDependencyException', 'ScopeNotActiveException', 'IllegalStateException'];
        push('orderService 빈 만들기: 생성자가 Cart를 요구해 컨테이너에 Cart를 달라고 합니다. request 스코프의 빈은 HTTP 요청을 처리하는 동안에만 만들 수 있는데, 지금은 기동 중이라 처리 중인 요청이 없습니다. ScopeNotActiveException이 발생하고 기동이 실패합니다.', 'bad');
        sum.push('기동 실패: ScopeNotActiveException. 싱글톤인 OrderService는 기동할 때 만들어지는데, 그때는 request 스코프의 Cart를 만들 요청이 없습니다.');
        sum.push('수명이 긴 빈(싱글톤)이 수명이 짧은 빈(request)을 필드에 직접 붙잡을 수는 없습니다. ObjectProvider로 쓸 때마다 꺼내거나, 프록시를 주입받으면 됩니다.');
        sum.push('@RequestScope는 프록시 방식(proxyMode = TARGET_CLASS)이 들어 있는 request 스코프입니다. Cart에 @Scope("request") 대신 @RequestScope를 붙이면 이 코드 그대로 기동됩니다.');
        return { events: ev, summary: sum, chain: chain, holds: '', row: ['기동 실패: ScopeNotActiveException', '-', '-', '-', '-'] };
      }
      held = lookup(0); st.holds = 'Cart ' + held + '번'; st.svc = '완성';
      if (sc === 'singleton') push('orderService 빈 만들기: 생성자가 Cart를 요구해 컨테이너에 Cart를 달라고 합니다. 싱글톤 빈은 컨테이너에 객체가 하나뿐입니다. 컨테이너가 그 하나(Cart 1번)를 넘기고, OrderService는 필드에 넣어 둡니다.', '');
      else push('orderService 빈 만들기: 생성자가 Cart를 요구해 컨테이너에 Cart를 달라고 합니다. 프로토타입 빈은 달라고 할 때마다 새로 만들므로, 컨테이너가 Cart 1번을 새로 만들어 넘깁니다. OrderService는 이 객체를 필드에 넣어 둡니다.', '');
    } else {
      st.holds = g === 'provider' ? 'ObjectProvider<Cart>' : 'Cart 프록시'; st.svc = '완성';
      if (g === 'provider') push('orderService 빈 만들기: 생성자가 ObjectProvider<Cart>를 요구합니다. 컨테이너는 Cart 객체가 아니라, 나중에 Cart를 꺼낼 수 있는 도구를 넣어 줍니다. 이때는 Cart를 달라고 하지 않으므로 Cart 객체가 만들어지지 않습니다.', '');
      else push('orderService 빈 만들기: 생성자가 Cart를 요구합니다. Cart의 @Scope에 proxyMode를 적었으므로, 컨테이너는 진짜 Cart 대신 Cart를 대신하는 객체(프록시)를 넣어 줍니다. 프록시는 메서드가 불릴 때마다 컨테이너에서 진짜 Cart를 찾아 호출을 넘깁니다. 프록시를 만들 때는 Cart의 생성자가 불리지 않습니다.', '');
      if (sc === 'singleton') { lookup(0); push('cart는 싱글톤이므로, 아직 아무도 쓰지 않았어도 컨테이너가 기동 중에 객체 하나(Cart 1번)를 만들어 둡니다.', ''); }
    }
    atStart = st.carts.length; st.phase = '기동 완료';
    push('기동이 끝났습니다. 지금까지 만들어진 Cart 객체는 ' + atStart + '개입니다.' + (sc !== 'singleton' && atStart === 0 ? ' ' + name + ' 스코프의 빈은 누군가 달라고 할 때 만들어집니다.' : ''), '');
    for (var r = 1; r <= 2; r++) {
      st.req = r; st.cur = 0; st.phase = '요청 ' + r + ' 처리 중';
      push('요청 ' + r + ': GET /order가 들어옵니다. OrderController의 order()가 orderService.cartNo()를 두 번 부릅니다.', '');
      for (var i = 1; i <= 2; i++) {
        var no, what;
        if (g === 'inject') { no = held; what = 'cartNo() ' + i + '번째 호출: 필드에 들어 있는 Cart ' + no + '번의 no()를 부릅니다. ' + (sc === 'prototype' ? '주입은 OrderService를 만들 때 한 번뿐이었으므로, 프로토타입이어도 새 객체가 만들어지지 않습니다.' : '싱글톤이므로 언제나 같은 객체입니다.'); }
        else {
          no = lookup(r);
          what = 'cartNo() ' + i + '번째 호출: ' + (g === 'provider' ? 'cartProvider.getObject()가 컨테이너에 Cart를 달라고 합니다. ' : '필드에 들어 있는 프록시의 no()를 부릅니다. 프록시가 컨테이너에 진짜 Cart를 달라고 합니다. ');
          what += sc === 'singleton' ? '싱글톤이므로 하나뿐인 Cart ' + no + '번을 돌려줍니다.' : sc === 'prototype' ? '프로토타입이므로 Cart ' + no + '번을 새로 만들어 돌려줍니다.' : fresh ? '이 요청에는 아직 Cart가 없으므로 Cart ' + no + '번을 새로 만들어 이 요청에 묶어 둡니다.' : '이 요청에 묶인 Cart ' + no + '번이 이미 있으므로 그것을 돌려줍니다.';
        }
        st.cur = no; st.used[r - 1].push(no);
        var cart = st.carts[no - 1]; if (cart.users.indexOf('요청 ' + r) < 0) cart.users.push('요청 ' + r);
        var trap = sc === 'prototype' && g === 'inject';
        push(what, trap ? 'bad' : sc === 'singleton' ? '' : 'good');
      }
      st.cur = 0; st.req = 0; st.phase = '요청 ' + r + ' 응답 완료';
      if (sc === 'request') st.carts[perReq[r] - 1].gone = true;
      push('요청 ' + r + '의 응답은 "' + st.used[r - 1].join(',') + '"입니다.' + (sc === 'request' ? ' 요청이 끝났으므로 이 요청에 묶여 있던 Cart ' + perReq[r] + '번은 버려집니다.' : ''), '');
    }
    // 여기까지 왔으면 기동과 두 요청이 모두 끝났다. 그림의 상태 상자는 st.phase(진행 단계)를 보여 준다.
    var total = st.carts.length, u1 = st.used[0].map(function (n) { return n + '번'; }).join(', '), u2 = st.used[1].map(function (n) { return n + '번'; }).join(', ');
    if (sc === 'singleton') {
      sum.push('싱글톤 빈은 컨테이너에 객체가 하나뿐이고, 기동할 때 만들어집니다. 그대로 주입받든, ObjectProvider로 꺼내든, 프록시를 거치든 언제나 같은 객체입니다.');
      sum.push('스코프를 따로 적지 않은 빈은 모두 싱글톤입니다. 모든 요청이 한 객체를 함께 쓰므로 요청마다 달라지는 값을 필드에 두면 안 됩니다.');
    } else if (sc === 'prototype' && g === 'inject') {
      sum.push('프로토타입은 "컨테이너에 달라고 할 때마다" 새로 만든다는 뜻입니다. 싱글톤 빈에 주입하는 일은 그 빈을 만들 때 한 번뿐이므로, 그때 받은 객체 하나를 계속 쓰게 됩니다. 쓸 때마다 새 객체를 기대했다면 버그입니다.');
      sum.push('쓸 때마다 새 객체가 필요하면 ObjectProvider를 주입받아 getObject()로 꺼냅니다. 프로토타입 빈을 주입받는 싱글톤 빈이 둘이면, 두 빈은 서로 다른 객체를 하나씩 받습니다.');
    } else if (sc === 'prototype' && g === 'provider') {
      sum.push('getObject()를 부를 때마다 컨테이너에 달라고 하는 것이므로 그때마다 새 객체가 만들어집니다. 한 요청 안에서 두 번 부르면 두 개가 됩니다. 프로토타입은 "요청마다 하나"가 아닙니다.');
      sum.push('한 번의 작업 안에서 같은 객체를 계속 써야 하면 getObject()로 한 번만 꺼내 지역 변수에 담아 씁니다.');
    } else if (sc === 'prototype') {
      sum.push('프록시는 메서드가 불릴 때마다 컨테이너에 Cart를 달라고 합니다. 프로토타입이므로 메서드 호출 한 번마다 새 객체가 만들어집니다.');
      sum.push('그래서 한 메서드로 값을 넣고 다음 메서드로 읽으면, 읽을 때는 이미 다른 객체라서 넣은 값이 보이지 않습니다. 프로토타입 빈에는 프록시보다 ObjectProvider가 맞습니다.');
    } else {
      sum.push('request 스코프는 HTTP 요청마다 객체가 하나입니다. 같은 요청 안에서는 몇 번을 달라고 해도 같은 객체이고, 다른 요청에는 다른 객체가 만들어집니다. 요청이 끝나면 그 객체는 버려지며, 이때 소멸 콜백(@PreDestroy)이 불립니다.');
      sum.push(g === 'provider' ? 'ObjectProvider는 쓰는 시점에 컨테이너에서 꺼내므로, 기동할 때는 Cart를 만들지 않아도 됩니다.' : '프록시를 주입받으면 OrderService의 코드는 "그대로 주입"일 때와 같습니다. 프록시가 메서드 호출마다 지금 처리 중인 요청의 Cart를 찾아 줍니다. @RequestScope가 이 방식을 줄여 쓴 것입니다.');
    }
    return { events: ev, summary: sum, chain: chain, holds: st.holds, row: ['기동 성공', atStart + '개', total + '개', u1, u2] };
  },
  render: function (v, sim, t, H, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : null;
    if (!s) { H.text(v, '실행을 누르면 서버가 뜨고, GET /order 요청이 두 번 들어옵니다.'); return; }
    H.table(v, ['Cart 객체', '만들어진 때', '이 객체를 쓴 요청'], s.carts.map(function (x) {
      return { cls: x.gone ? 'gone' : '', cells: [{ v: 'Cart ' + x.no + '번', cls: s.cur === x.no ? 'hot' : '' }, x.when, x.users.length ? x.users.join(', ') + (x.gone ? ' (요청과 함께 끝남)' : '') : '-'] };
    }), '지금까지 만들어진 Cart 객체');
    if (!s.carts.length) H.text(v, s.svc === '실패' ? 'Cart 객체가 하나도 만들어지지 않았습니다.' : '아직 Cart 객체가 없습니다.');
  },
  // 그림: 왼쪽에 HTTP 요청 둘, 가운데에 싱글톤 orderService, 오른쪽에 만들어진 Cart 객체들. 객체가 만들어질 때마다 상자가 하나씩 늘어난다.
  draw: function (P, sim, shown) {
    var g = sim.c.get, last = shown[shown.length - 1], s = last ? last.snap : { phase: '', svc: '없음', holds: '', carts: [], req: 0, cur: 0, used: [[], []], result: '' };
    P.size(680, 344);
    [0, 1].forEach(function (i) {
      var u = s.used[i], on = s.req === i + 1;
      P.box('rq' + (i + 1), 16, 60 + i * 84, 186, 56, { cls: on ? 'hot now' : u.length ? 'wait' : 'ghost', title: '요청 ' + (i + 1) + ': GET /order', sub: u.length ? '쓴 Cart: ' + u.map(function (n) { return n + '번'; }).join(', ') : on ? '처리 중' : '아직 안 옴' });
    });
    P.region('ctx', 218, 16, 446, 262, '스프링 컨테이너');
    P.box('svc', 234, 100, 204, 64, { cls: s.svc === '완성' ? 'good' : s.svc === '실패' ? 'bad' : s.svc === '없음' ? 'ghost' : 'hot', title: 'orderService (싱글톤)', sub: s.svc === '완성' ? '필드: ' + s.holds : s.svc === '없음' ? '아직 없음' : s.svc });
    s.carts.forEach(function (x, i) {
      P.box('cart' + x.no, 480, 44 + i * 58, 168, 48, { cls: x.gone ? 'ghost' : s.cur === x.no ? 'hot now' : 'wait', title: 'Cart ' + x.no + '번', sub: x.gone ? '요청과 함께 끝남' : sim.c.scope === 'prototype' ? '컨테이너는 보관 안 함' : x.when });
    });
    if (!s.carts.length) P.text('none', 564, 150, s.svc === '실패' ? 'Cart 객체 없음' : '아직 Cart 객체 없음', { cls: 'mut', anchor: 'middle' });
    if (g === 'inject' && s.svc === '완성') P.arrow('hold', 'svc:r', 'cart1:l', { cls: 'good', label: '필드' });
    if (g !== 'inject' && s.cur) P.arrow('use', 'svc:r', 'cart' + s.cur + ':l', { cls: 'hot', label: g === 'provider' ? 'getObject()' : '프록시' });
    if (s.req) P.arrow('call', 'rq' + s.req + ':r', 'svc:l', { label: 'cartNo()' });
    P.box('r1', 16, 294, 320, 38, { cls: s.carts.length ? 'plain' : 'ghost', title: '만들어진 Cart 객체', right: s.carts.length + '개' });
    P.box('r2', 344, 294, 320, 38, { cls: s.result ? 'bad' : s.phase ? 'plain' : 'ghost', title: '상태', right: s.result === '기동 실패' ? 'ScopeNotActiveException' : s.result || s.phase || '시작 전' });
    P.note(g === 'inject' ? '초록 화살표는 OrderService의 필드가 붙잡고 있는 객체입니다.' : g === 'provider' ? '노란 화살표는 getObject()가 이번에 돌려준 객체입니다.' : '노란 화살표는 프록시가 이번 메서드 호출을 넘긴 진짜 객체입니다.');
  },
  assume: '아홉 가지 조합을 이 PC의 스프링 부트 4.1.1(스프링 프레임워크 7.0.9, 내장 톰캣 11)에서 실행해 대조했습니다. 조합마다 화면과 같은 구조의 소스를 컴파일해 서버를 띄우고, 실제로 GET /order 요청을 두 번 보내 응답에 적힌 Cart 번호를 읽었습니다. Cart의 생성자가 불린 횟수(기동 직후, 요청 두 번 뒤), OrderService의 필드에 들어 있는 것(Cart, ObjectProvider, 프록시), 기동 실패의 예외 사슬(UnsatisfiedDependencyException → UnsatisfiedDependencyException → ScopeNotActiveException → IllegalStateException)을 비교했습니다. 요청 두 개는 하나가 끝난 뒤 다음 것을 보냈습니다(동시에 보낸 경우는 "싱글톤 빈과 상태" 실습에서 다룹니다). 다음도 실행으로 확인했습니다: 프로토타입 빈을 주입받는 싱글톤 빈이 둘이면 서로 다른 객체를 받는 것, 프로토타입에 프록시를 쓰면 add로 넣은 값이 바로 다음 size 호출에서 보이지 않는 것(0이 나옴), @RequestScope를 붙인 빈은 그대로 주입받아도 기동되고 요청마다 하나인 것, request 스코프 빈의 @PreDestroy가 요청이 끝날 때마다 불리는 것. 다루지 않은 것: session 스코프와 application 스코프, 프로토타입 빈을 꺼내는 다른 방법(@Lookup, jakarta.inject.Provider), 프록시 방식 가운데 인터페이스를 쓰는 것(ScopedProxyMode.INTERFACES). 화면의 Cart는 객체를 세려고 static 변수를 썼는데, 요청이 동시에 들어오는 실제 코드라면 이렇게 세면 안 됩니다.',
});

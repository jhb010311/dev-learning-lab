Lab.register({
  id: 'di', nav: '빈 생성과 주입', cat: '스프링', mode: 'step',
  title: '스프링은 객체를 어떤 순서로 만들고 연결하나',
  why: '객체가 필요한 객체를 직접 new로 만들면 구현을 바꾸거나 테스트용 가짜 객체로 갈아 끼울 때마다 그 코드를 고쳐야 하고, 어떤 객체를 누가 만드는지가 곳곳에 흩어진다. 스프링의 DI는 필요한 객체를 생성자 인자 등으로 받기만 하게 하고 실제 객체를 만들어 연결하는 일은 컨테이너가 한곳에서 해서, 쓰는 쪽 코드를 고치지 않고 연결을 바꿀 수 있게 한다.',
  use: '스프링 애플리케이션에서 컨트롤러가 서비스를, 서비스가 리포지토리를 받는 연결은 보통 이 방식으로 이뤄진다. 스프링 문서는 꼭 있어야 하는 객체를 생성자로 받는 생성자 주입을 권장하며, 테스트에서는 같은 생성자에 가짜 객체를 넘겨 스프링을 띄우지 않고도 검사한다.',
  intro: '애플리케이션이 뜰 때 스프링 컨테이너가 빈을 하나씩 만들고 서로 연결합니다. 주입 방식에 따라 객체가 만들어지는 순서가 달라지고, 두 빈이 서로를 필요로 하면(순환 참조) 기동이 실패하기도 합니다. 이 실습의 OrderController, OrderService, PaymentService, OrderRepository는 예시로 만든 클래스입니다.',
  terms: ['IoC(제어의 역전)', 'DI(의존성 주입)', '생성자 주입, 세터 주입, 필드 주입', '스프링 빈(Bean)', '빈 생명주기', '순환 참조'], ranks: ['di', 'bean'],
  controls: [
    { id: 'inj', label: '주입 방식', type: 'select', value: 'ctor', options: [['ctor', '생성자 주입'], ['field', '필드 주입 (@Autowired)'], ['setter', '세터 주입']] },
    { id: 'cycle', label: 'OrderService와 PaymentService가 서로를 주입받는다 (순환 참조)', type: 'check', value: false },
    { id: 'allow', label: 'spring.main.allow-circular-references=true로 설정한다', type: 'check', value: false, show: function (c) { return c.cycle; } },
  ],
  presets: [
    { t: '처음 설정으로', q: '생성자 주입으로 OrderController, OrderService, OrderRepository를 기동하면 객체는 어떤 순서로 만들어지나', d: '생성자 주입. 의존 대상이 먼저 완성돼야 다음 객체를 만들 수 있습니다.', v: { inj: 'ctor', cycle: false, allow: false } },
    { t: '필드 주입으로 바꾸면', q: '주입 방식을 @Autowired 필드 주입으로 바꾸면', d: '객체를 먼저 만들고 나중에 채웁니다. 잠깐 동안 필드가 비어 있습니다.', v: { inj: 'field', cycle: false, allow: false } },
    { t: '생성자 주입 + 순환 참조', q: '생성자 주입인데 OrderService와 PaymentService가 서로를 주입받으면', d: '어느 쪽도 먼저 만들 수 없어 기동이 실패합니다.', v: { inj: 'ctor', cycle: true, allow: false } },
    { t: '필드 주입 + 순환 참조', q: '필드 주입인데 OrderService와 PaymentService가 서로를 주입받으면', d: '스프링 부트 기본 설정에서는 이것도 기동 실패입니다.', v: { inj: 'field', cycle: true, allow: false } },
    { t: '순환 참조를 허용하면', q: '필드 주입이고 서로를 주입받는데 spring.main.allow-circular-references=true로 설정하면', d: '필드 주입은 덜 만들어진 객체를 미리 넘겨서 통과합니다.', v: { inj: 'field', cycle: true, allow: true } },
    { t: '허용해도 생성자 주입은 실패', q: '생성자 주입이고 서로를 주입받는데 spring.main.allow-circular-references=true로 설정하면', d: '생성자를 호출하려면 인자가 먼저 있어야 하기 때문입니다.', v: { inj: 'ctor', cycle: true, allow: true } },
  ],
  code: function (c) {
    function cls(name, ann, deps) {
      var f = deps.map(function (d) { return d.charAt(0).toLowerCase() + d.slice(1); });
      if (c.inj === 'ctor') return ann + '\nclass ' + name + ' {\n' + deps.map(function (d, i) { return '    private final ' + d + ' ' + f[i] + ';\n'; }).join('') + (deps.length ? '\n    ' + name + '(' + deps.map(function (d, i) { return d + ' ' + f[i]; }).join(', ') + ') {\n' + f.map(function (x) { return '        this.' + x + ' = ' + x + ';\n'; }).join('') + '    }\n' : '') + '}';
      if (c.inj === 'field') return ann + '\nclass ' + name + ' {\n' + deps.map(function (d, i) { return '    @Autowired\n    private ' + d + ' ' + f[i] + ';\n'; }).join('') + '}';
      return ann + '\nclass ' + name + ' {\n' + deps.map(function (d, i) { return '    private ' + d + ' ' + f[i] + ';\n\n    @Autowired\n    void set' + d + '(' + d + ' ' + f[i] + ') {\n        this.' + f[i] + ' = ' + f[i] + ';\n    }\n'; }).join('') + '}';
    }
    var out = [cls('OrderController', '@RestController', ['OrderService']), cls('OrderService', '@Service', c.cycle ? ['OrderRepository', 'PaymentService'] : ['OrderRepository'])];
    if (c.cycle) out.push(cls('PaymentService', '@Service', ['OrderService']));
    out.push(cls('OrderRepository', '@Repository', []));
    return out.join('\n\n') + (c.cycle && c.allow ? '\n\n// application.properties\n// spring.main.allow-circular-references=true' : '');
  },
  label: function (c) { return { ctor: '생성자 주입', field: '필드 주입', setter: '세터 주입' }[c.inj] + (c.cycle ? ' · 순환 참조' + (c.allow ? ' (허용 설정)' : '') : ''); },
  columns: ['기동 결과', '객체가 만들어진 순서', '완성된 순서'],
  simulate: function (c) {
    var ctor = c.inj === 'ctor', how = { field: '필드', setter: '세터' }[c.inj];
    var deps = { OrderController: ['OrderService'], OrderRepository: [], OrderService: c.cycle ? ['OrderRepository', 'PaymentService'] : ['OrderRepository'] }, order = ['OrderController', 'OrderRepository', 'OrderService'];
    if (c.cycle) { deps.PaymentService = ['OrderService']; order.push('PaymentService'); }
    var st = {}, got = {}, stack = [], made = [], done = [], ev = [], failed = null;
    order.forEach(function (n) { st[n] = '정의만 등록됨'; got[n] = []; });
    function push(s, k) { ev.push({ s: s, k: k, snap: { st: JSON.parse(JSON.stringify(st)), got: JSON.parse(JSON.stringify(got)), stack: stack.slice() } }); }
    push('컴포넌트 스캔: @RestController, @Service, @Repository가 붙은 클래스를 찾아 빈 정의 ' + order.length + '개를 등록했습니다. 아직 객체는 하나도 만들지 않았습니다.', '');
    function create(n, by) {
      if (st[n] === '완성') { push(n + '는 이미 완성된 빈이 있습니다. 새로 만들지 않고 그 객체를 그대로 씁니다(싱글톤).', ''); return true; }
      if (stack.indexOf(n) >= 0) {
        var loop = stack.slice(stack.indexOf(n)).concat([n]).join(' → ');
        if (ctor) { failed = loop; push(by + '를 만들려면 ' + n + '가 필요한데, ' + n + '는 지금 만드는 중이라 아직 객체가 없습니다(' + loop + '). 생성자를 호출하려면 인자가 먼저 있어야 하므로 풀 방법이 없습니다. 예외가 발생하고 애플리케이션 기동이 실패합니다.', 'bad'); return false; }
        if (!c.allow) { failed = loop; push(by + '에 ' + n + '를 주입해야 하는데, ' + n + '는 아직 만드는 중입니다(' + loop + '). 스프링 부트는 기본 설정에서 순환 참조를 금지하므로 예외가 발생하고 기동이 실패합니다.', 'bad'); return false; }
        push(by + '에 ' + n + '를 주입해야 하는데, ' + n + '는 아직 만드는 중입니다. 순환 참조를 허용했으므로, 객체는 이미 만들어져 있으나 주입이 끝나지 않은 ' + n + '의 참조를 미리 꺼내 넘겨줍니다.', 'bad'); return true;
      }
      stack.push(n);
      if (ctor) {
        st[n] = '만드는 중 (생성자 인자 준비)';
        push(n + '를 만들기 시작합니다. ' + (deps[n].length ? '생성자가 ' + deps[n].join(', ') + '를 요구하므로, 그것부터 준비해야 생성자를 호출할 수 있습니다.' : '생성자에 인자가 없습니다.'), '');
        for (var i = 0; i < deps[n].length; i++) { if (!create(deps[n][i], n)) { st[n] = '실패'; return false; } }
        made.push(n); got[n] = deps[n].slice();
      } else {
        made.push(n); st[n] = '객체만 생성됨 (주입 전)';
        push(n + '의 객체를 기본 생성자로 먼저 만듭니다.' + (deps[n].length ? ' ' + how + '로 주입받을 의존성 ' + deps[n].length + '개는 아직 null입니다.' : ' 주입받을 것이 없습니다.'), '');
        for (var j = 0; j < deps[n].length; j++) { if (!create(deps[n][j], n)) { st[n] = '실패'; return false; } got[n].push(deps[n][j]); push(n + '의 ' + how + '에 ' + deps[n][j] + '를 주입했습니다.', ''); }
      }
      st[n] = '완성'; done.push(n); stack.pop();
      push(!ctor && !deps[n].length ? n + '는 주입받을 것이 없으므로 바로 완성됩니다.' : ctor ? n + '의 생성자를 호출해 객체를 만들었습니다.' + (deps[n].length ? ' 인자로 ' + deps[n].join(', ') + '를 넘겼습니다.' : '') + ' 만들어지는 순간 의존성이 모두 채워져 있습니다. 이어서 초기화 콜백(@PostConstruct)이 있으면 호출되고, 빈이 완성됩니다.' : n + '의 주입이 끝났습니다. 초기화 콜백(@PostConstruct)이 있으면 이때 호출되고, 빈이 완성됩니다.', 'good');
      return true;
    }
    for (var k = 0; k < order.length && !failed; k++) if (st[order[k]] !== '완성') create(order[k], '컨테이너');
    var sum = [];
    if (failed) {
      sum.push(ctor ? '생성자 주입은 순환 참조를 기동 시점에 바로 드러냅니다. 설정으로 허용해도 생성자 주입끼리의 순환은 풀리지 않습니다. 해법은 두 빈이 공통으로 쓰는 기능을 제3의 빈으로 빼내서 순환 자체를 없애는 것입니다.' : '스프링 부트 2.6부터 순환 참조는 주입 방식과 관계없이 기본적으로 금지됩니다. 설정으로 허용할 수는 있지만, 순환을 없애도록 설계를 고치는 것이 권장됩니다.');
    } else {
      if (ctor) sum.push('생성자 주입에서는 의존 대상이 완성된 뒤에야 객체를 만들 수 있습니다. 그래서 객체가 존재하는 순간부터 의존성이 빠짐없이 채워져 있고, 필드를 final로 둘 수 있습니다.');
      else sum.push(how + ' 주입에서는 객체가 먼저 만들어지고 의존성은 나중에 채워집니다. 그 사이에 객체는 의존성이 아직 null인 상태로 존재하며, 그 필드에는 final을 쓸 수 없습니다. 테스트에서 스프링 없이 객체를 만들면 의존성이 비어 있는 채로 남습니다.');
      if (c.cycle) sum.push('순환 참조를 허용해 통과했지만, 주입이 끝나지 않은 객체가 다른 빈에 먼저 넘어갔습니다. 두 빈이 서로를 알아야 하는 구조 자체가 설계상 문제일 가능성이 큽니다.');
    }
    return { events: ev, summary: sum, order: order, deps: deps, row: [failed ? '실패' : '성공', made.join(' → ') || '없음', done.join(' → ') || '없음'] };
  },
  render: function (v, sim, t, H, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : null, how = sim.c.inj === 'ctor' ? '생성자 인자' : sim.c.inj === 'field' ? '필드' : '세터';
    if (!s) { H.text(v, '실행을 누르면 컨테이너가 뜨기 시작합니다.'); return; }
    H.table(v, ['빈', '상태', '필요한 의존성', '채워진 의존성'], sim.order.map(function (n) {
      var x = s.st[n], need = sim.deps[n];
      return { cells: [n, { v: x, cls: x === '완성' ? 'good' : x === '실패' ? 'bad' : x === '정의만 등록됨' ? '' : 'hot' }, need.length ? need.join(', ') : '없음', need.length ? (s.got[n].length ? s.got[n].join(', ') : '(아직 없음)') + (s.got[n].length < need.length && x.indexOf('객체만') === 0 ? ' · 나머지는 null' : '') : '-'] };
    }), '스프링 컨테이너가 관리하는 빈 (' + how + '로 주입)');
    H.title(v, '지금 만드는 중인 빈 (바깥 → 안쪽)');
    H.slots(v, s.stack.map(function (n, i) { return [n, i === s.stack.length - 1 ? 'b' : 'q']; }), '없음');
  },
  // 그림: 컨테이너 안의 빈과 "누가 누구를 필요로 하는지" 화살표. 점선은 아직 채워지지 않은 의존성, 실선은 주입이 끝난 것.
  draw: function (P, sim, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : null, pos = { OrderController: [28, 56], OrderService: [240, 56], OrderRepository: [452, 56], PaymentService: [240, 196] };
    P.size(680, 300);
    P.region('ctx', 16, 16, 648, 268, '스프링 컨테이너');
    sim.order.forEach(function (n) {
      var x = s ? s.st[n] : '정의만 등록됨', need = sim.deps[n], got = s ? s.got[n] : [], top = s && s.stack[s.stack.length - 1] === n;
      P.box(n, pos[n][0], pos[n][1], 200, 60, { cls: (x === '완성' ? 'good' : x === '실패' ? 'bad' : x === '정의만 등록됨' ? 'ghost' : 'hot') + (top ? ' now' : ''), title: n, sub: [x, need.length ? '의존성 ' + got.length + ' / ' + need.length + ' 채워짐' : '의존성 없음'] });
      need.forEach(function (d) {
        var filled = got.indexOf(d) >= 0, pair = n + '>' + d, a = n + ':r', b = d + ':l';
        if (pair === 'OrderService>PaymentService') { a = n + ':b:0.3'; b = d + ':t:0.3'; } else if (pair === 'PaymentService>OrderService') { a = n + ':t:0.7'; b = d + ':b:0.7'; }
        P.arrow('d_' + n + '_' + d, a, b, { cls: filled ? 'good' : x === '실패' ? 'bad dash' : 'dash mut' });
      });
    });
    P.note('화살표는 "이 빈이 저 빈을 필요로 한다"는 뜻입니다. 점선은 아직 채워지지 않은 의존성, 초록 실선은 주입이 끝난 의존성입니다. 노란 빈은 지금 만드는 중이고, 굵은 테두리가 가장 안쪽에서 만들고 있는 빈입니다.');
  },
  assume: '빈 네 개만 있는 작은 애플리케이션이며, 컨테이너는 스캔한 순서대로 빈을 만들기 시작한다고 가정했습니다(실제 순서는 클래스 경로와 설정에 따라 달라질 수 있지만, 의존 대상이 먼저 준비돼야 한다는 규칙은 같습니다). 순환 참조를 기본으로 금지하는 것은 스프링 부트 2.6 이후의 동작입니다. 순환 참조를 푸는 다른 방법(@Lazy로 주입 시점 늦추기)은 다루지 않았습니다. 열두 가지 조합 모두를 실제 스프링 부트 4.1.1로 띄워, 기동 성공 여부와 객체가 만들어진 순서(생성자가 불린 순서), 완성된 순서(주입이 끝난 순서)가 화면과 일치하는 것을 확인했습니다. 기동 실패는 모두 BeanCurrentlyInCreationException이었습니다.',
});

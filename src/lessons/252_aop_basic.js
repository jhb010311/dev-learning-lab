Lab.register({
  id: 'aop_basic', nav: 'AOP와 프록시', cat: '기초개념', mode: 'step', basic: true, deep: ['proxy', 'aop'],
  title: '프록시는 무엇이고, 스프링은 어떻게 내 메서드 앞뒤에 끼어드는가',
  intro: '@Transactional 같은 애너테이션을 메서드에 붙이면, 우리가 쓰지 않은 일이 그 메서드를 부를 때 앞뒤에서 일어납니다. 스프링이 우리가 만든 객체를 그대로 쓰지 않고, 그것을 감싼 대리 객체(프록시)를 대신 보관해 두기 때문입니다. 이 실습은 같은 일을 @Transactional 대신 직접 쓴 LogAspect로 보입니다. LogAspect는 @Aspect가 붙은 클래스로, 여러 메서드에 공통으로 끼워 넣을 일(여기서는 로그 한 줄)을 따로 적어 두는 곳입니다. @Before 안의 execution(* OrderService.order(..))는 OrderService 클래스의 order() 메서드를 고르는 식입니다. 이렇게 공통으로 끼워 넣을 일을 따로 적어 두는 방식을 AOP라고 합니다. 부르는 쪽 Caller의 orderService 칸에는 @Autowired가 붙어 있으면 스프링이 보관한 객체가 들어옵니다. 이 실습은 LogAspect를 지우거나 그 칸에 new OrderService()로 직접 만든 객체를 넣어 가며, 같은 order() 호출이 무엇을 찍는지와 호출을 받은 객체가 무엇인지를 봅니다.',
  terms: ['프록시(Proxy)', 'AOP(관점 지향 프로그래밍)', '@Aspect와 @Before', '@Autowired'],
  controls: [
    { id: 'aspect', label: 'LogAspect 클래스(@Aspect)를 둔다', type: 'check', value: true },
    { id: 'how', label: 'orderService 칸에 들어가는 객체', type: 'select', value: 'bean', options: [['bean', '@Autowired로 스프링이 넣어 준 객체'], ['new', 'new OrderService()로 직접 만든 객체']] },
  ],
  // q는 물음 방식의 화면에 보이는 물음, t와 d는 글로만 읽는 본문에 쓰이는 이름과 설명
  presets: [
    { t: '처음 설정으로', q: 'LogAspect는 어떻게 생겼고, orderService.order()를 부르면 무슨 일이 일어나나', d: 'LogAspect가 있고 스프링이 넣어 준 객체로 부릅니다. 부른 객체가 프록시라서 order() 앞에 [로그] 줄이 찍힙니다.', v: { aspect: true, how: 'bean' } },
    { t: 'LogAspect를 지우면', q: 'LogAspect 클래스를 지우면', d: '끼워 넣을 일이 없어 스프링이 프록시를 만들지 않습니다. "주문 처리"만 찍힙니다.', v: { aspect: false, how: 'bean' } },
    { t: 'new로 만든 객체로 부르면', q: '@Autowired 줄을 지우고 new OrderService()로 직접 만든 객체를 쓰면', d: '스프링 안에는 프록시가 있지만 부른 것은 직접 만든 객체라서 [로그] 줄이 찍히지 않습니다.', v: { aspect: true, how: 'new' } },
    { t: '둘 다 바꾸면', q: 'LogAspect도 지우고 new OrderService()로 직접 만든 객체를 쓰면', d: '스프링이 끼어들 곳이 없는 평범한 자바 호출입니다. "주문 처리"만 찍힙니다.', v: { aspect: false, how: 'new' } },
  ],
  // 화면의 코드와 대조 프로그램(verify/spring/src/AopBasicProbe.java)이 실행한 소스는 같은 글이다(대조 스크립트가 글자까지 비교한다).
  code: function (c) {
    var o = [];
    if (c.aspect) o.push('// 끼워 넣는 일: OrderService의 order()를 부를 때마다 실행된다', '@Aspect', '@Component', 'class LogAspect {', '    @Before("execution(* OrderService.order(..))")', '    void log() {', '        System.out.println("[로그] order 호출됨");', '    }', '}', '');
    o.push('@Service', 'class OrderService {', '    public void order() {', '        System.out.println("주문 처리");', '    }', '}', '', '@Component', 'class Caller {');
    if (c.how === 'bean') o.push('    // 스프링이 만들어 둔 빈을 찾아 넣어 준다', '    @Autowired', '    OrderService orderService;');
    else o.push('    // 내가 직접 만든다', '    OrderService orderService = new OrderService();');
    o.push('', '    void run() {', '        orderService.order();', '        System.out.println(orderService.getClass().getSimpleName());', '    }', '}');
    return o.join('\n');
  },
  label: function (c) { return (c.aspect ? 'LogAspect 있음' : 'LogAspect 없음') + ' · ' + (c.how === 'bean' ? '@Autowired로 받은 객체' : 'new로 만든 객체'); },
  columns: ['찍힌 줄', '부른 객체의 클래스', '프록시인가', '스프링이 보관한 빈의 클래스'],
  simulate: function (c) {
    var A = !!c.aspect, bean = c.how === 'bean', ev = [], sum = [];
    var SVC = 'OrderService', PX = 'OrderService$$SpringCGLIB$$0';
    var usedProxy = A && bean, slotName = usedProxy ? PX : SVC, beanName = A ? PX : SVC;
    // 상태: bean은 스프링이 보관한 OrderService 빈(plain 우리 객체 그대로, proxy 프록시), slot은 Caller의 orderService 칸에 든 것, at은 지금 호출이 닿은 곳
    var st = { aspect: A, bean: '', beanName: '', slot: '', slotName: '', at: '', out: [], proxies: 0, mine: false };
    function push(s, k) { ev.push({ s: s, k: k, snap: JSON.parse(JSON.stringify(st)) }); }

    // 1. 스프링이 시작되어 OrderService 객체를 만든다
    st.bean = 'plain'; st.beanName = SVC;
    push('프로그램이 시작되면 스프링이 @Component나 @Service가 붙은 클래스를 찾아(컴포넌트 스캔) 그 클래스의 객체를 만들어 보관합니다. 이렇게 스프링이 만들어 보관하는 객체를 빈이라고 합니다. OrderService 클래스의 객체도 하나 만들어 둡니다. 우리가 쓴 코드에는 new OrderService()라는 줄이 없습니다.' + (A ? ' @Component가 붙은 LogAspect 클래스의 객체도 만들어 둡니다.' : ''), '');

    // 2. 스프링이 프록시가 필요한지 본다
    if (A) {
      st.bean = 'proxy'; st.beanName = PX; st.proxies = 1;
      push('스프링이 @Aspect가 붙은 LogAspect를 찾습니다. @Before 안의 execution(* OrderService.order(..))는 OrderService 클래스의 order() 메서드(매개변수는 몇 개든)를 고르는 식입니다. 방금 만든 OrderService 객체에는 이 식에 맞는 order()가 있습니다. 그래서 스프링은 이 객체를 그대로 빈으로 쓰지 않고, 이 객체를 감싼 대리 객체(프록시)를 만들어 대신 빈으로 보관합니다. 프록시는 OrderService를 상속한 클래스 ' + PX + '의 객체이고, 진짜 OrderService 객체는 그 안에 들어 있습니다. 프록시를 만드는 줄은 우리가 쓴 코드에 없습니다.', 'good');
    } else {
      push('스프링에는 OrderService의 order()에 끼어들겠다는 @Aspect 클래스가 없습니다(코드에 LogAspect 클래스가 없습니다). 끼워 넣을 일이 없으므로 스프링은 프록시를 만들지 않고, 방금 만든 OrderService 객체를 그대로 빈으로 보관합니다.', '');
    }

    // 3. Caller의 orderService 칸이 채워진다
    if (bean) {
      st.slot = 'bean'; st.slotName = beanName;
      push('스프링이 Caller 클래스의 객체도 만듭니다. orderService 칸에는 @Autowired가 붙어 있어서, 스프링이 이 칸에 들어갈 OrderService 타입의 빈을 찾아 넣어 줍니다. 칸에 값을 넣는 줄은 우리가 쓰지 않았습니다. 지금 이 칸에 들어간 것은 ' + (A ? '스프링이 보관한 프록시입니다.' : '스프링이 보관한 OrderService 객체입니다.'), '');
    } else {
      st.slot = 'mine'; st.slotName = SVC; st.mine = true;
      push('스프링이 Caller 클래스의 객체를 만들 때, orderService 칸에는 new OrderService()로 새 OrderService 객체가 만들어져 들어갑니다. 이 객체는 스프링이 만든 것이 아니라 우리 코드가 만든 것이어서, 스프링이 보관한 OrderService 빈과는 다른 객체입니다.' + (A ? ' 스프링이 보관한 프록시는 이 칸에 들어가지 않았고, 아무도 부르지 않은 채 보관만 되어 있습니다.' : ''), '');
    }

    // 4. order() 호출
    if (usedProxy) {
      st.at = 'bean';
      push('Caller의 run()이 orderService.order()를 부릅니다. orderService 칸에 든 것이 프록시이므로, 호출은 진짜 OrderService가 아니라 프록시에 먼저 도착합니다. 프록시는 order()가 LogAspect의 @Before 식에 맞는 메서드라는 것을 알고, 진짜 order()를 부르기 전에 LogAspect의 log()를 먼저 실행합니다.', '');
      st.at = 'asp'; st.out.push('[로그] order 호출됨');
      push('프록시가 LogAspect의 log()를 실행해 "[로그] order 호출됨"을 찍습니다. 이 줄은 order()가 아니라 LogAspect에 적혀 있습니다.', 'good');
      st.at = 'real'; st.out.push('주문 처리');
      push('프록시가 안에 들어 있는 진짜 OrderService 객체의 order()를 부르고, order()가 "주문 처리"를 찍습니다. order() 안에는 로그를 찍는 줄이 없습니다.', '');
    } else {
      st.at = bean ? 'bean' : 'mine'; st.out.push('주문 처리');
      push('Caller의 run()이 orderService.order()를 부릅니다. ' + (bean
        ? 'orderService 칸에는 스프링이 보관한 OrderService 객체가 그대로 들어 있습니다. 호출은 곧바로 order()로 들어가 "주문 처리"를 찍습니다. 스프링이 끼워 넣을 일이 없었으므로 그 앞뒤에서 일어나는 일도 없습니다.'
        : 'orderService 칸에는 우리가 new로 만든 객체가 들어 있습니다. 호출은 곧바로 order()로 들어가 "주문 처리"를 찍습니다. 프록시를 거치지 않았습니다.' + (A ? ' 스프링은 프록시에 도착한 호출에만 끼어들 수 있어서, LogAspect가 있어도 log()는 실행되지 않습니다.' : ' 스프링이 끼어들 곳도 없는 평범한 자바 호출입니다.')), A && !bean ? 'bad' : '');
    }

    // 5. 클래스 이름을 찍는다
    st.at = '';
    st.out.push(slotName);
    push('이어서 run()이 orderService 칸에 든 객체의 클래스 이름을 getSimpleName() 메서드로 찍습니다. 찍힌 이름은 "' + slotName + '"입니다. ' + (usedProxy
      ? 'OrderService가 아니라 스프링이 프로그램이 도는 중에 만든 다른 클래스입니다. 우리가 쓴 코드에는 이 이름이 없습니다. 프록시를 부르고 있다는 표시입니다.'
      : '우리가 쓴 OrderService 클래스 그대로입니다. 프록시가 아닙니다.'), usedProxy ? 'good' : '');

    // 요약: 첫 줄은 물음의 답
    if (A && bean) {
      sum.push('LogAspect는 @Aspect가 붙은 클래스이고, order()에 공통으로 끼워 넣을 일(로그 찍기)을 따로 적어 둔 곳입니다. 스프링이 OrderService 객체를 그대로 빈으로 쓰지 않고 그것을 감싼 프록시를 대신 보관했고, order()를 부르자 프록시가 먼저 받아 [로그]를 찍은 뒤 진짜 order()를 불렀습니다.');
      sum.push('order() 안에는 로그를 찍는 줄이 없습니다. 부른 객체의 클래스 이름이 OrderService가 아니라 ' + PX + '인 것이 프록시를 불렀다는 표시입니다. @Transactional을 붙인 빈의 클래스 이름이 같은 꼴로 바뀌는 것도 같은 일입니다.');
    } else if (!A && bean) {
      sum.push('LogAspect를 지우면 끼워 넣을 일이 없어서 스프링이 프록시를 만들지 않고 OrderService 객체를 그대로 빈으로 썼습니다. order()는 "주문 처리"만 찍었고, 부른 객체의 클래스 이름도 OrderService 그대로입니다.');
      sum.push('프록시는 끼워 넣을 일이 있는 빈에만 만들어집니다. 스프링이 모든 빈을 대리 객체로 바꾸는 것은 아닙니다.');
    } else if (A) {
      sum.push('스프링이 프록시를 만들어 보관했어도, 부르는 쪽이 new OrderService()로 직접 만든 객체를 쓰면 호출이 프록시를 거치지 않아 [로그]가 찍히지 않습니다. 스프링 안에는 ' + PX + ' 객체가 있었지만 아무도 부르지 않았습니다.');
      sum.push('끼어드는 일은 스프링이 넣어 준 빈을 통해 부를 때만 일어납니다. LogAspect가 있는데 로그가 찍히지 않는다면, 부른 객체의 클래스 이름이 OrderService인지 먼저 볼 일입니다.');
    } else {
      sum.push('LogAspect도 없고 직접 만든 객체를 쓰면 스프링이 끼어들 곳이 전혀 없습니다. 평범한 자바 객체의 평범한 메서드 호출이라서 "주문 처리"만 찍혔습니다.');
      sum.push('출력은 LogAspect만 지운 경우와 같습니다. 이 경우 스프링의 빈은 쓰이지 않은 채 보관만 되어 있었습니다.');
    }
    return { events: ev, summary: sum, row: [st.out.slice(0, st.out.length - 1).join(' / '), slotName, usedProxy ? '예' : '아니요', beanName] };
  },
  render: function (v, sim, t, H, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : null;
    if (!s) { H.text(v, '실행을 누르면 스프링이 시작되어 빈을 만드는 것부터 시작합니다.'); return; }
    H.table(v, ['객체', '클래스', '프록시인가'], [
      { cls: s.bean ? '' : 'gone', cells: ['스프링이 보관한 OrderService 빈', s.bean ? s.beanName : '아직 없음', s.bean ? { v: s.bean === 'proxy' ? '예' : '아니요', cls: s.bean === 'proxy' ? 'good' : '' } : ''] },
      { cls: s.slot ? '' : 'gone', cells: ['orderService 칸에 든 객체', s.slot ? s.slotName : '아직 없음', s.slot ? { v: s.slot === 'bean' && s.bean === 'proxy' ? '예' : '아니요', cls: s.slot === 'bean' && s.bean === 'proxy' ? 'good' : '' } : ''] },
    ], '객체');
    var lines = s.out.map(function (x, i) { return { cls: '', cells: [String(i + 1), { v: x, cls: x.indexOf('[로그]') === 0 ? 'good' : '' }] }; });
    H.table(v, ['순서', '화면에 찍힌 줄'], lines.length ? lines : [{ cls: 'gone', cells: ['-', '아직 없음'] }], '찍힌 줄');
    var logs = s.out.filter(function (x) { return x.indexOf('[로그]') === 0; }).length;
    H.counters(v, [[logs, '찍힌 [로그] 줄'], [s.proxies, '스프링이 만든 프록시']]);
  },
  // 그림: 왼쪽에 호출하는 Caller, 가운데 위쪽에 스프링이 보관한 OrderService 빈(프록시면 오른쪽에 그 안의 진짜 객체)과 LogAspect, 아래쪽에 new로 만든 객체. 호출이 어느 객체에 닿는지 화살표로 보인다.
  draw: function (P, sim, shown) {
    var c = sim.c, last = shown[shown.length - 1], s = last ? last.snap : null;
    var A = !!c.aspect, bean = c.how === 'bean';
    P.size(680, 304);
    P.box('caller', 14, 70, 174, 82, { cls: s && s.at === '' && s.slot && s.out.length ? 'good' : 'plain', title: 'Caller.run()', sub: ['orderService 칸:', s && s.slot ? (s.slot === 'bean' && s.bean === 'proxy' ? '프록시' : 'OrderService 객체') : '비어 있음'] });
    P.region('sp', 240, 14, 426, 178, '스프링이 보관하는 객체(빈)');
    var made = s && s.bean, px = s && s.bean === 'proxy';
    P.box('bean', 252, 44, 186, 58, { cls: !made ? 'ghost' : s.at === 'bean' ? 'hot now' : px ? 'wait' : 'plain', title: made ? (px ? 'OrderService 프록시' : 'OrderService 객체') : 'OrderService 빈', sub: !made ? '아직 만들기 전' : px ? '대리 객체 (하위 클래스)' : '우리가 쓴 클래스 그대로' });
    P.box('real', 490, 44, 164, 58, { cls: !px ? 'ghost' : s.at === 'real' ? 'hot now' : 'plain', title: '진짜 OrderService', sub: px ? '프록시 안에 들어 있음' : '프록시가 없어 따로 없음' });
    P.box('asp', 252, 118, 186, 58, { cls: !A ? 'ghost' : s && s.at === 'asp' ? 'hot now' : 'plain', title: 'LogAspect', sub: A ? '@Before: [로그] 찍기' : '클래스를 지움' });
    P.box('mine', 240, 206, 330, 44, { cls: !bean && s && s.mine ? (s.at === 'mine' ? 'hot now' : 'hot') : 'ghost', title: 'new OrderService()로 만든 객체', sub: !bean ? '스프링이 만든 것이 아님' : '이 코드에는 없음' });
    if (s && (s.at === 'bean' || s.at === 'asp')) P.arrow('a1', 'caller:r:0.2', 'bean:l', { cls: 'hot' });
    if (s && s.at === 'asp') P.arrow('a2', 'bean:b', 'asp:t', { cls: 'hot' });
    if (s && s.at === 'real') P.arrow('a3', 'bean:r', 'real:l', { cls: 'hot' });
    if (s && s.at === 'mine') P.arrow('a4', 'caller:r:0.8', 'mine:l', { cls: 'hot' });
    var logs = s ? s.out.filter(function (x) { return x.indexOf('[로그]') === 0; }).length : 0;
    P.box('n1', 14, 262, 322, 34, { cls: logs ? 'good' : 'ghost', title: '찍힌 [로그] 줄', right: logs + '줄' });
    P.box('n2', 344, 262, 322, 34, { cls: s && s.proxies ? 'wait' : 'ghost', title: '스프링이 만든 프록시', right: (s ? s.proxies : 0) + '개' });
  },
  assume: 'Spring Framework 7.0.9(AspectJ weaver 1.9.25.1)를 JDK 21에서 AnnotationConfigApplicationContext로 실행해 대조했습니다. 네 가지 조합을 모두, 화면의 코드와 같은 소스(package와 import 줄만 더함)를 컴파일하고 자식 자바 프로세스를 조합마다 새로 띄워 확인했습니다. 설정 클래스에는 @EnableAspectJAutoProxy와 @ComponentScan을 두었고, 클래스들은 스캔으로 찾게 했습니다(화면에는 이 설정이 보이지 않습니다). 대조한 것은 run()이 화면에 찍은 줄과 그 순서, 부른 객체의 클래스 이름과 AopUtils로 잰 프록시 여부, 스프링 컨테이너에서 꺼낸 OrderService 빈의 클래스와 프록시 여부, 부른 객체와 그 빈이 같은 객체인지, 컨테이너 안의 프록시 개수입니다. 단계 문장이 기대는 사실로, 프록시가 OrderService를 상속한 클래스이고 그 안에 진짜 OrderService 객체가 하나 들어 있다는 것, 스프링이 넣어 준 객체가 컨테이너에 보관된 그 빈과 같다는 것, new로 만든 객체는 그 빈과 다르다는 것도 실행으로 확인했습니다. 프록시의 클래스 이름 OrderService$$SpringCGLIB$$0는 이 PC에서 실제로 찍힌 이름입니다. 문서가 정한 것은 스프링 프레임워크 7.0 문서 Core의 AOP Proxies 절(스프링 AOP가 프록시 기반이라는 것, 인터페이스가 없는 객체는 기본으로 CGLIB로 프록시한다는 것), Understanding AOP Proxies 절(호출이 프록시에 닿아야 어드바이스가 실행된다는 것), Enabling @AspectJ Support 절(aspectjweaver가 클래스패스에 있어야 한다는 것, 어드바이스가 걸린 빈에는 프록시가 자동으로 만들어진다는 것), Declaring an Aspect 절(@Aspect만으로는 스캔되지 않고 @Component가 필요하다는 것)입니다. 다만 "프록시가 안의 진짜 객체를 부르기 전에 @Before를 실행한다"는 순서를 문서가 한 문장으로 쓰고 있지는 않아서, 그 순서는 Probe가 찍은 줄의 순서로 확인한 관찰입니다. 이 실습의 OrderService는 인터페이스가 없는 클래스라서 CGLIB 프록시가 만들어졌습니다. 인터페이스를 구현한 클래스에서 JDK 동적 프록시가 쓰이는 경우, 같은 클래스 안에서 부르는 경우(자기 호출), 여러 메서드와 여러 애스펙트를 다루는 경우는 다루지 않았고, 그림은 화면의 코드만 보여 주기 위해 줄였습니다. 스프링 부트의 자동 설정으로 AOP가 켜지는 경우도 실행하지 않았습니다. 화면의 코드는 package와 import 줄을 줄였습니다. @Before의 정확한 실행 시점과 포인트컷 식의 규칙은 "AOP: 어드바이스와 포인트컷" 실습에서, 자기 호출과 프록시 방식(JDK 동적 프록시, CGLIB)은 "프록시와 자기 호출" 실습에서 다룹니다.',
});

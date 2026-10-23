Lab.register({
  id: 'aop_basic', nav: 'AOP와 프록시', cat: '기초개념', mode: 'step', basic: true, deep: ['proxy', 'aop'],
  title: '프록시는 무엇이고, 스프링은 어떻게 내 메서드 앞뒤에 끼어드는가',
  why: '트랜잭션 시작과 커밋, 로그 남기기 같은 일을 메서드마다 직접 적으면 같은 줄이 여러 곳에 흩어지고, 빠뜨리거나 고칠 때 모두 찾아다녀야 한다. 스프링은 그런 일을 메서드 본문 밖에 두고, 빈 대신 등록한 프록시가 호출을 먼저 받아 앞뒤에 끼워 넣게 해서, 원래 메서드의 코드는 손대지 않게 했다.',
  use: '@Transactional(트랜잭션으로 묶기), @Cacheable(저장해 둔 결과 돌려주기), @Async(다른 스레드에서 실행하기) 같은 스프링 애너테이션이 이 프록시로 동작한다. 애너테이션을 붙였는데 동작하지 않으면 부른 객체의 클래스 이름에 $$SpringCGLIB$$가 있는지, new로 직접 만든 객체를 부르고 있지 않은지부터 본다. 직접 끼워 넣을 일이 있으면 @Aspect로 애스펙트 클래스를 만들어 실행 시간 재기나 호출 기록 남기기에 쓴다.',
  intro: '메서드 위에 @Transactional을 붙이면, 그 메서드를 부를 때 트랜잭션을 시작하고 끝내는 일이 우리가 쓰지 않았는데도 일어납니다. 스프링이 우리가 쓴 클래스의 객체를 그대로 빈으로 쓰지 않고, 그 객체 대신 호출을 먼저 받을 대리 객체(프록시)를 만들어 빈으로 보관하기 때문입니다. 이렇게 여러 메서드에 공통으로 필요한 일(트랜잭션, 로그 등)을 메서드 본문 밖에 따로 두고 호출 앞뒤에 끼워 넣는 방식을 AOP라고 합니다. 화면의 OrderService와 Caller는 이 실습에서 예시로 지은 클래스 이름이고, @Service, @Component, @Autowired, @Transactional, 그리고 TransactionSynchronizationManager 클래스는 스프링이 주는 것입니다. TransactionSynchronizationManager.isActualTransactionActive()는 그 줄이 실행되는 때에 트랜잭션이 진행 중이면 true를 돌려줍니다. 부르는 쪽 Caller의 orderService 칸에 @Autowired가 붙어 있으면, 스프링이 이 칸이 자기가 보관한 OrderService 빈을 가리키게 합니다. 이 실습은 @Transactional을 지우거나 그 칸이 new OrderService()로 직접 만든 객체를 가리키게 바꿔 가며, order()가 찍는 줄과 부른 객체의 클래스 이름을 봅니다. 스프링이 주는 @Transactional 대신, @Aspect를 붙여 직접 만든 클래스(예시로 지은 LogAspect)를 끼워 넣을 수도 있습니다.',
  terms: ['프록시(Proxy)', 'AOP(관점 지향 프로그래밍)', '@Transactional', 'TransactionSynchronizationManager', '@Autowired', '@Aspect와 @Before'],
  controls: [
    { id: 'ann', label: 'OrderService의 order()에 끼워 넣을 일', type: 'select', value: 'tx', options: [['tx', 'order() 위에 @Transactional을 붙인다'], ['none', '아무 애너테이션도 붙이지 않는다'], ['log', '@Transactional 대신 직접 만든 LogAspect(@Aspect)를 둔다']] },
    { id: 'how', label: 'orderService 칸이 가리키는 객체', type: 'select', value: 'bean', options: [['bean', '스프링이 보관한 빈 (@Autowired)'], ['new', 'new OrderService()로 직접 만든 객체']] },
  ],
  // q는 물음 방식의 화면에 보이는 물음, t와 d는 글로만 읽는 본문에 쓰이는 이름과 설명
  presets: [
    { t: '처음 설정으로', q: '@Transactional이 붙은 OrderService 빈의 order()를 부르면 무슨 일이 일어나고, 부른 객체의 클래스는 무엇인가', d: '스프링이 OrderService 대신 프록시(OrderService$$SpringCGLIB$$0)를 빈으로 보관했고, 프록시가 호출을 먼저 받아 트랜잭션을 시작한 뒤 order()를 부릅니다. order()가 본 트랜잭션은 진행 중(true)입니다.', v: { ann: 'tx', how: 'bean' } },
    { t: '@Transactional을 지우면', q: 'order() 위의 @Transactional을 지우면', d: '끼워 넣을 일이 없어 스프링이 프록시를 만들지 않습니다. 부른 객체는 OrderService 그대로이고 트랜잭션은 진행 중이 아닙니다(false).', v: { ann: 'none', how: 'bean' } },
    { t: 'new로 만든 객체로 부르면', q: '@Transactional은 그대로 두고, @Autowired 줄 대신 new OrderService()로 직접 만든 객체를 부르면', d: '스프링은 프록시를 만들어 보관했지만 부른 것은 직접 만든 객체라서 프록시를 거치지 않습니다. @Transactional이 붙어 있어도 트랜잭션은 시작되지 않습니다(false).', v: { ann: 'tx', how: 'new' } },
    { t: '직접 만든 애스펙트를 끼우면', q: '@Transactional 대신 @Aspect를 붙여 직접 만든 LogAspect를 두면', d: '직접 만든 애스펙트가 order()를 고르면 스프링이 같은 방식으로 프록시를 만듭니다. 프록시가 [로그] 줄을 먼저 찍고 order()를 부릅니다. 트랜잭션은 시작되지 않습니다(false).', v: { ann: 'log', how: 'bean' } },
  ],
  // 화면의 코드와 대조 프로그램(verify/spring/src/AopBasicProbe.java)이 실행한 소스는 같은 글이다(대조 스크립트 verify/spring/cmp_aop_basic.js가 글자까지 비교한다).
  code: function (c) {
    var o = ['// … 설정 클래스(@EnableTransactionManagement, H2 DataSource, 트랜잭션 매니저 빈)와 import 줄은 생략', ''];
    if (c.ann === 'log') o.push('// 직접 만든 애스펙트: OrderService의 order()를 부르기 전에 한 줄 찍는다', '@Aspect', '@Component', 'class LogAspect {', '    @Before("execution(* OrderService.order(..))")', '    void log() {', '        System.out.println("[로그] order 호출됨");', '    }', '}', '');
    o.push('@Service', 'class OrderService {');
    if (c.ann === 'tx') o.push('    // 스프링이 주는 애너테이션: 이 메서드를 트랜잭션으로 묶는다', '    @Transactional');
    o.push('    public void order() {', '        // 스프링이 주는 메서드: 지금 트랜잭션이 진행 중이면 true를 돌려준다', '        boolean active = TransactionSynchronizationManager.isActualTransactionActive();', '        System.out.println("트랜잭션 진행 중: " + active);', '    }', '}', '', '@Component', 'class Caller {');
    if (c.how === 'bean') o.push('    // 스프링이 보관한 OrderService 빈을 이 칸이 가리키게 한다', '    @Autowired', '    OrderService orderService;');
    else o.push('    // 내가 직접 만든다', '    OrderService orderService = new OrderService();');
    o.push('', '    void run() {', '        orderService.order();', '        System.out.println(orderService.getClass().getSimpleName());', '    }', '}');
    return o.join('\n');
  },
  label: function (c) { return (c.ann === 'tx' ? '@Transactional 있음' : c.ann === 'log' ? 'LogAspect 있음' : '애너테이션 없음') + ' · ' + (c.how === 'bean' ? '@Autowired로 받은 객체' : 'new로 만든 객체'); },
  columns: ['찍힌 줄', '부른 객체의 클래스', '프록시를 거쳤나', '스프링이 보관한 빈의 클래스'],
  simulate: function (c) {
    var TX = c.ann === 'tx', LOG = c.ann === 'log', PXY = TX || LOG, bean = c.how === 'bean', ev = [], sum = [];
    var SVC = 'OrderService', PX = 'OrderService$$SpringCGLIB$$0';
    var usedProxy = PXY && bean, slotName = usedProxy ? PX : SVC, beanName = PXY ? PX : SVC;
    // 상태: bean은 스프링이 보관한 OrderService 빈(plain 우리 객체 그대로, proxy 프록시), slot은 Caller의 orderService 칸이 가리키는 것,
    // at은 지금 호출이 닿은 곳(bean 빈, tmb 트랜잭션 시작, real 진짜 객체, tmc 커밋, asp LogAspect, mine new로 만든 객체)
    var st = { bean: '', beanName: '', slot: '', slotName: '', at: '', out: [], proxies: 0, begins: 0, commits: 0, mine: false };
    function push(s, k) { ev.push({ s: s, k: k, snap: JSON.parse(JSON.stringify(st)) }); }

    // 1. 스프링이 시작되어 OrderService 객체를 만든다
    st.bean = 'plain'; st.beanName = SVC;
    push('프로그램이 시작되면 스프링이 @Service나 @Component가 붙은 클래스를 찾아(컴포넌트 스캔) 그 클래스의 객체를 만들어 보관합니다. 이렇게 스프링이 만들어 보관하는 객체를 빈이라고 합니다. 스프링이 OrderService 클래스의 객체도 하나 만듭니다. 화면에서 생략한 설정 클래스에 적힌 트랜잭션 매니저(스프링이 주는 DataSourceTransactionManager, H2 DB에 연결)도 빈으로 만들어 둡니다.' + (LOG ? ' @Component가 붙은 LogAspect 클래스의 객체도 만들어 둡니다.' : ''), '');

    // 2. 스프링이 프록시가 필요한지 본다
    if (TX) {
      st.bean = 'proxy'; st.beanName = PX; st.proxies = 1;
      push('스프링이 OrderService의 order() 위에 @Transactional이 붙은 것을 봅니다. 그래서 방금 만든 OrderService 객체를 그대로 빈으로 쓰지 않고, 그 객체 대신 호출을 먼저 받을 대리 객체(프록시)를 만들어 OrderService 빈으로 보관합니다. 프록시는 스프링이 프로그램이 도는 중에 만든 클래스 ' + PX + '의 객체입니다. 이 클래스는 OrderService를 상속했고, 프록시는 진짜 OrderService 객체를 참조로 갖고 있습니다. 둘은 서로 다른 객체입니다. 이 클래스도, 프록시를 만드는 줄도 우리가 쓴 코드에는 없습니다.', 'good');
    } else if (LOG) {
      st.bean = 'proxy'; st.beanName = PX; st.proxies = 1;
      push('스프링이 @Aspect가 붙은 LogAspect를 찾습니다. @Before 괄호 안에 적은 execution(* OrderService.order(..)) 식은 OrderService의 order() 메서드(매개변수는 몇 개든)를 고릅니다. @Transactional이 붙었을 때와 같은 방식으로, 스프링은 OrderService 객체 대신 호출을 먼저 받을 프록시(클래스 ' + PX + ')를 만들어 빈으로 보관합니다. 끼워 넣을 일이 트랜잭션이 아니라 LogAspect의 log()라는 점만 다릅니다.', 'good');
    } else {
      push('OrderService에는 @Transactional이 붙은 메서드도 없고, order()에 끼어들 @Aspect 클래스도 없습니다. 끼워 넣을 일이 없으므로 스프링은 프록시를 만들지 않고, 방금 만든 OrderService 객체를 그대로 빈으로 보관합니다.', '');
    }

    // 3. Caller의 orderService 칸이 채워진다
    if (bean) {
      st.slot = 'bean'; st.slotName = beanName;
      push('스프링이 @Component가 붙은 Caller 클래스의 객체도 만듭니다. orderService 칸에는 @Autowired가 붙어 있어서, 스프링이 OrderService 타입의 빈을 찾아 이 칸이 그 빈을 가리키게 합니다. 이 칸에 값을 대입하는 줄은 우리가 쓰지 않았습니다. 지금 이 칸이 가리키는 것은 ' + (PXY ? '스프링이 보관한 프록시입니다.' : '스프링이 보관한 OrderService 객체입니다.'), '');
    } else {
      st.slot = 'mine'; st.slotName = SVC; st.mine = true;
      push('스프링이 @Component가 붙은 Caller 클래스의 객체를 만들 때, 필드 선언에 적은 new OrderService()가 실행되어 새 OrderService 객체가 만들어지고 orderService 칸이 그 객체를 가리킵니다. 이 객체는 스프링이 아니라 우리 코드가 만든 것이어서, 스프링이 보관한 OrderService 빈과는 다른 객체입니다.' + (PXY ? ' orderService 칸은 스프링이 만든 프록시를 가리키지 않습니다.' : ''), '');
    }

    // 4. order() 호출
    if (TX && bean) {
      st.at = 'bean';
      push('Caller의 run()이 orderService.order()를 부릅니다. orderService 칸이 가리키는 것이 프록시이므로, 호출은 진짜 OrderService가 아니라 프록시에 먼저 도착합니다. 프록시는 order()에 @Transactional이 붙어 있다는 것을 압니다.', '');
      st.at = 'tmb'; st.begins = 1;
      push('프록시가 진짜 order()를 부르기 전에 트랜잭션 매니저에게 트랜잭션을 시작하게 합니다. 트랜잭션 매니저는 H2 DB 연결을 하나 받아 트랜잭션을 시작합니다. 이 일을 하는 줄은 order()에 없습니다.', 'good');
      st.at = 'real'; st.out.push('트랜잭션 진행 중: true');
      push('프록시가 참조로 갖고 있던 진짜 OrderService 객체의 order()를 부릅니다. order()가 isActualTransactionActive()로 지금 트랜잭션이 진행 중인지 묻고, true를 받아 "트랜잭션 진행 중: true"를 찍습니다.', 'good');
      st.at = 'tmc'; st.commits = 1;
      push('order()가 예외 없이 끝나 프록시로 돌아오면, 프록시가 트랜잭션 매니저에게 커밋하게 합니다. 트랜잭션은 여기서 끝납니다. order()가 런타임 예외로 끝났다면 커밋 대신 롤백합니다.', '');
    } else if (LOG && bean) {
      st.at = 'bean';
      push('Caller의 run()이 orderService.order()를 부릅니다. orderService 칸이 가리키는 것이 프록시이므로, 호출은 진짜 OrderService가 아니라 프록시에 먼저 도착합니다. 프록시는 order()가 LogAspect의 @Before 식에 맞는 메서드라는 것을 압니다.', '');
      st.at = 'asp'; st.out.push('[로그] order 호출됨');
      push('프록시가 진짜 order()를 부르기 전에 LogAspect의 log()를 실행해 "[로그] order 호출됨"을 찍습니다. 이 줄은 order()가 아니라 LogAspect에 적혀 있습니다.', 'good');
      st.at = 'real'; st.out.push('트랜잭션 진행 중: false');
      push('프록시가 참조로 갖고 있던 진짜 OrderService 객체의 order()를 부릅니다. 이번에는 트랜잭션을 시작한 곳이 없어서 isActualTransactionActive()가 false를 돌려주고, "트랜잭션 진행 중: false"를 찍습니다. 프록시를 거쳤어도 끼워 넣은 일은 LogAspect의 로그 한 줄뿐입니다.', '');
    } else {
      st.at = bean ? 'bean' : 'mine'; st.out.push('트랜잭션 진행 중: false');
      push('Caller의 run()이 orderService.order()를 부릅니다. ' + (bean
        ? 'orderService 칸은 스프링이 보관한 OrderService 객체를 그대로 가리키므로, 곧바로 그 객체의 order()가 실행됩니다. 트랜잭션을 시작한 곳이 없어서 isActualTransactionActive()가 false를 돌려주고, "트랜잭션 진행 중: false"를 찍습니다.'
        : 'orderService 칸은 우리가 new로 만든 객체를 가리키므로, 프록시를 거치지 않고 곧바로 그 객체의 order()가 실행됩니다. ' + (TX
          ? 'order() 위에 @Transactional이 적혀 있어도, 그 표시를 보고 트랜잭션을 시작하는 것은 프록시입니다. 프록시를 거치지 않았으므로 트랜잭션은 시작되지 않았고, "트랜잭션 진행 중: false"를 찍습니다.'
          : LOG ? 'LogAspect가 있어도 log()를 끼워 넣는 것은 프록시이므로 [로그] 줄은 찍히지 않고, "트랜잭션 진행 중: false"만 찍습니다.'
            : '트랜잭션을 시작한 곳이 없어서 "트랜잭션 진행 중: false"를 찍습니다. 스프링이 끼어들 곳이 없는 평범한 자바 호출입니다.')), PXY && !bean ? 'bad' : '');
    }

    // 5. 클래스 이름을 찍는다
    st.at = '';
    st.out.push(slotName);
    push('run()의 다음 줄이 orderService 칸이 가리키는 객체의 클래스 이름을 찍습니다(getClass()와 getSimpleName()은 자바가 주는 메서드입니다). 찍힌 이름은 "' + slotName + '"입니다. ' + (usedProxy
      ? '우리가 쓴 OrderService가 아니라 스프링이 만든 프록시 클래스입니다. 이름 가운데의 $$SpringCGLIB$$는 스프링이 CGLIB라는 라이브러리로 만든 클래스에 붙이는 표시입니다.'
      : '우리가 쓴 OrderService 클래스 그대로입니다. 프록시가 아닙니다.'), usedProxy ? 'good' : '');

    // 요약: 첫 줄은 물음의 답
    if (TX && bean) {
      sum.push('@Transactional이 붙은 OrderService는 스프링이 그대로 빈으로 쓰지 않고, OrderService를 상속한 프록시(클래스 ' + PX + ')를 만들어 빈으로 보관했습니다. order()를 부르자 프록시가 먼저 받아 트랜잭션을 시작하고, 진짜 order()를 부른 뒤 커밋했습니다. 그래서 order()가 물었을 때 트랜잭션은 진행 중(true)이었습니다.');
      sum.push('order()에는 트랜잭션을 시작하거나 커밋하는 줄이 없습니다. 이렇게 공통으로 필요한 일을 메서드 밖에 두고 호출 앞뒤에 끼워 넣는 방식이 AOP이고, 그 일을 끼워 넣는 것이 프록시입니다.');
    } else if (!PXY && bean) {
      sum.push('@Transactional을 지우면 끼워 넣을 일이 없어서 스프링이 프록시를 만들지 않고 OrderService 객체를 그대로 빈으로 보관했습니다. 부른 객체의 클래스 이름도 OrderService 그대로이고, 트랜잭션은 시작되지 않았습니다(false).');
      sum.push('스프링이 모든 빈을 프록시로 바꾸는 것은 아닙니다. @Transactional처럼 끼워 넣을 일이 있는 빈만 프록시가 됩니다.');
    } else if (TX) {
      sum.push('@Transactional이 붙어 있어도 new OrderService()로 직접 만든 객체를 부르면 프록시를 거치지 않아 트랜잭션이 시작되지 않습니다(false). 스프링은 ' + PX + ' 프록시를 만들어 보관했지만, 이 호출은 그 프록시에 닿지 않았습니다.');
      sum.push('@Transactional은 메서드 위에 적은 표시이고, 그 표시를 보고 트랜잭션을 시작하는 것은 스프링이 만든 프록시입니다. 애너테이션을 붙였는데 동작하지 않으면, 부른 객체의 클래스 이름에 $$SpringCGLIB$$가 있는지 먼저 볼 일입니다.');
    } else if (LOG && bean) {
      sum.push('@Transactional 같은 스프링의 애너테이션이 없어도, @Aspect를 붙여 직접 만든 LogAspect가 order()를 고르면 스프링이 같은 방식으로 프록시(클래스 ' + PX + ')를 만듭니다. 프록시가 호출을 먼저 받아 [로그] 줄을 찍은 뒤 진짜 order()를 불렀습니다.');
      sum.push('끼워 넣은 것은 로그 한 줄뿐이라 트랜잭션은 시작되지 않았습니다(false). 스프링이 @Transactional로 끼워 넣는 일처럼, 직접 만든 애스펙트로 원하는 일을 끼워 넣을 수도 있습니다.');
    } else if (LOG) {
      sum.push('LogAspect가 있어도 new로 직접 만든 객체를 부르면 프록시를 거치지 않아 [로그] 줄이 찍히지 않았습니다. 트랜잭션도 시작되지 않았습니다(false).');
      sum.push('직접 만든 애스펙트도 @Transactional과 마찬가지로 프록시를 거친 호출에만 끼어듭니다.');
    } else {
      sum.push('@Transactional도 없고 직접 만든 객체를 부르면 스프링이 끼어들 곳이 없습니다. 평범한 자바 메서드 호출이라 "트랜잭션 진행 중: false"와 OrderService가 찍혔습니다.');
      sum.push('출력은 @Transactional만 지운 경우와 같습니다. 이 경우 스프링이 보관한 OrderService 빈은 쓰이지 않았습니다.');
    }
    return { events: ev, summary: sum, row: [st.out.slice(0, st.out.length - 1).join(' / '), slotName, usedProxy ? '예' : '아니요', beanName] };
  },
  render: function (v, sim, t, H, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : null;
    if (!s) { H.text(v, '실행을 누르면 스프링이 시작되어 빈을 만드는 것부터 시작합니다.'); return; }
    H.table(v, ['객체', '클래스', '프록시인가'], [
      { cls: s.bean ? '' : 'gone', cells: ['스프링이 보관한 OrderService 빈', s.bean ? s.beanName : '아직 없음', s.bean ? { v: s.bean === 'proxy' ? '예' : '아니요', cls: s.bean === 'proxy' ? 'good' : '' } : ''] },
      { cls: s.slot ? '' : 'gone', cells: ['orderService 칸이 가리키는 객체', s.slot ? s.slotName : '아직 없음', s.slot ? { v: s.slot === 'bean' && s.bean === 'proxy' ? '예' : '아니요', cls: s.slot === 'bean' && s.bean === 'proxy' ? 'good' : '' } : ''] },
    ], '객체');
    var lines = s.out.map(function (x, i) { return { cls: '', cells: [String(i + 1), { v: x, cls: x.indexOf('[로그]') === 0 || /true$/.test(x) ? 'good' : '' }] }; });
    H.table(v, ['순서', '화면에 찍힌 줄'], lines.length ? lines : [{ cls: 'gone', cells: ['-', '아직 없음'] }], '찍힌 줄');
    H.counters(v, [[s.begins, '트랜잭션 시작'], [s.proxies, '스프링이 만든 프록시']]);
  },
  // 그림: 왼쪽에 호출하는 Caller, 가운데 테두리에 스프링이 만든 객체(OrderService 빈, 프록시면 그것이 참조하는 진짜 객체, 트랜잭션 매니저, LogAspect가 있으면 LogAspect), 아래쪽 테두리 밖에 new로 만든 객체. 호출이 어느 객체에 닿는지 화살표로 보인다.
  draw: function (P, sim, shown) {
    var c = sim.c, last = shown[shown.length - 1], s = last ? last.snap : null;
    var LOG = c.ann === 'log', bean = c.how === 'bean';
    P.size(680, 304);
    P.box('caller', 14, 70, 174, 82, { cls: s && s.at === '' && s.slot && s.out.length ? 'good' : 'plain', title: 'Caller.run()', sub: ['orderService 칸:', s && s.slot ? (s.slot === 'bean' && s.bean === 'proxy' ? '프록시' : 'OrderService 객체') : '비어 있음'] });
    P.region('sp', 240, 14, 426, 178, '스프링이 만든 객체(빈)');
    var made = s && s.bean, px = s && s.bean === 'proxy', at = s ? s.at : '';
    P.box('bean', 252, 44, 186, 58, { cls: !made ? 'ghost' : at === 'bean' ? 'hot now' : px ? 'wait' : 'plain', title: made ? (px ? 'OrderService 프록시' : 'OrderService 객체') : 'OrderService 빈', sub: !made ? '아직 만들기 전' : px ? '대리 객체 (하위 클래스)' : '우리가 쓴 클래스 그대로' });
    P.box('real', 490, 44, 164, 58, { cls: !px ? 'ghost' : at === 'real' ? 'hot now' : 'plain', title: '진짜 OrderService', sub: px ? '프록시와 다른 객체' : '프록시가 없어 따로 없음' });
    P.box('tm', 252, 118, 186, 58, { cls: !made ? 'ghost' : at === 'tmb' || at === 'tmc' ? 'hot now' : 'plain', title: '트랜잭션 매니저', sub: at === 'tmb' ? '트랜잭션 시작' : at === 'tmc' ? '커밋' : '설정에서 등록한 빈' });
    if (LOG) P.box('asp', 490, 118, 164, 58, { cls: !made ? 'ghost' : at === 'asp' ? 'hot now' : 'plain', title: 'LogAspect', sub: '@Before: [로그] 찍기' });
    P.box('mine', 240, 206, 330, 44, { cls: !bean && s && s.mine ? (at === 'mine' ? 'hot now' : 'hot') : 'ghost', title: 'new OrderService()로 만든 객체', sub: !bean ? '스프링이 만든 것이 아님' : '이 코드에는 없음' });
    if (s && s.slot === 'bean' && ['bean', 'tmb', 'real', 'tmc', 'asp'].indexOf(at) >= 0) P.arrow('a1', 'caller:r:0.2', 'bean:l', { cls: 'hot' });
    if (at === 'tmb' || at === 'tmc') P.arrow('a2', 'bean:b', 'tm:t', { cls: 'hot', label: at === 'tmb' ? '시작' : '커밋' });
    if (at === 'asp') P.arrow('a5', 'bean:r:0.8', 'asp:l:0.3', { cls: 'hot' });
    if (px) P.arrow('a3', 'bean:r:0.4', 'real:l:0.4', { cls: at === 'real' ? 'hot' : 'mut', label: '참조' });
    if (at === 'mine') P.arrow('a4', 'caller:r:0.8', 'mine:l', { cls: 'hot' });
    P.box('n1', 14, 262, 322, 34, { cls: s && s.begins ? 'good' : 'ghost', title: '트랜잭션 시작', right: (s ? s.begins : 0) + '번' });
    P.box('n2', 344, 262, 322, 34, { cls: s && s.proxies ? 'wait' : 'ghost', title: '스프링이 만든 프록시', right: (s ? s.proxies : 0) + '개' });
  },
  assume: 'Spring Framework 7.0.9(AspectJ weaver 1.9.25.1), H2 2.4.240, HikariCP 7.0.2를 JDK 21에서 AnnotationConfigApplicationContext로 실행해 대조했습니다. 여섯 가지 조합(@Transactional, 아무것도 없음, LogAspect × @Autowired로 받은 빈, new로 만든 객체)을 모두, 화면의 코드와 같은 소스(package와 import 줄만 더함)를 컴파일하고 자식 자바 프로세스를 조합마다 새로 띄워 확인했습니다. 화면에서 생략한 설정 클래스에는 @EnableTransactionManagement, @EnableAspectJAutoProxy, @ComponentScan, H2 메모리 DB에 연결한 DataSource, DataSourceTransactionManager 빈을 두었습니다(트랜잭션 매니저에는 시작·커밋·롤백 횟수와 순서를 세는 줄만 더했습니다). 스프링 부트에서는 이 설정을 자동 설정이 대신 해 주지만, 이 실습은 부트로 실행하지 않았습니다. 대조한 것은 run()이 찍은 줄과 그 순서, 부른 객체의 클래스 이름과 AopUtils로 잰 프록시 여부, 컨테이너에서 꺼낸 OrderService 빈의 클래스와 프록시 여부, 부른 객체와 그 빈이 같은 객체인지, 컨테이너 안의 프록시 개수, 트랜잭션 매니저가 트랜잭션을 시작하고 커밋한 횟수와 그 순서(시작, "트랜잭션 진행 중: true", 커밋)입니다. 단계 문장이 기대는 사실로, 프록시가 OrderService를 상속한 클래스이고 진짜 OrderService 객체 하나를 참조로 갖고 있다는 것, 트랜잭션을 시작할 때 연결한 DB가 H2라는 것, new로 만든 객체는 그 빈과 다르고 프록시가 아니라는 것도 실행으로 확인했습니다. 프록시의 클래스 이름 OrderService$$SpringCGLIB$$0는 이 검증 실행에서 실제로 찍힌 이름입니다. 문서가 정한 것은 스프링 프레임워크 7.0 문서 Data Access의 Using @Transactional 절(기본인 프록시 방식에서는 프록시를 거쳐 들어온 바깥 호출만 가로챈다는 것, 기본으로 RuntimeException과 Error에서 롤백한다는 것), Core의 AOP Proxies 절(인터페이스가 없는 객체는 CGLIB로 프록시한다는 것), Understanding AOP Proxies 절(호출이 프록시에 닿아야 어드바이스가 실행된다는 것), Declaring an Aspect 절(@Aspect만으로는 스캔되지 않고 @Component가 필요하다는 것), 그리고 TransactionSynchronizationManager의 API 문서(isActualTransactionActive()가 지금 스레드에 실제 트랜잭션이 진행 중인지 돌려준다는 것, 이 클래스는 보통의 애플리케이션 코드가 아니라 자원을 관리하는 코드가 쓰라고 만든 것이라는 것)입니다. "런타임 예외로 끝나면 롤백한다"는 문장은 이 실습에서 실행하지 않았고 문서와 "@Transactional" 실습의 실행 결과에 기댑니다. 이 실습의 OrderService는 인터페이스가 없는 클래스라서 CGLIB 프록시가 만들어졌습니다. 인터페이스를 구현한 클래스에서 JDK 동적 프록시가 쓰이는 경우, 같은 클래스 안에서 부르는 경우(자기 호출), @Transactional과 애스펙트를 함께 쓰는 경우는 다루지 않았고, 그림은 화면의 코드만 보여 주기 위해 줄였습니다. 커밋과 롤백이 DB에 남기는 결과는 "@Transactional" 실습에서, @Before의 실행 시점과 포인트컷 식의 규칙은 "AOP: 어드바이스와 포인트컷" 실습에서, 자기 호출과 프록시 방식(JDK 동적 프록시, CGLIB)은 "프록시와 자기 호출" 실습에서 다룹니다.',
});

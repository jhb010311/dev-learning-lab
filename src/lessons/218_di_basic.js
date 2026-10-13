Lab.register({
  id: 'di_basic', nav: '의존성 주입', cat: '기초개념', mode: 'step', basic: true, deep: ['di'],
  title: '의존성 주입은 무엇을 대신해 주는가',
  intro: '의존성 주입은 클래스가 일을 하려고 필요로 하는 객체를 스스로 만들지 않고 밖에서 넣어 받는 것입니다. 여기서 OrderService는 결제를 하려고 PayService 객체가 필요하고, 이것을 "OrderService가 PayService에 의존한다"고 합니다. 스프링에서는 OrderService의 생성자 매개변수에 PayService를 적어 두는 것이 전부이고, 클래스 위의 @Component는 스프링이 그 클래스의 객체(빈)를 만들어 보관하라는 표시입니다. 스프링이 OrderService 객체를 만들 때 보관하던 PayService 빈을 그 생성자에 넣어 줍니다. 이 실습은 PayService를 생성자로 받는 대신 new PayService()로 직접 만들거나 아예 받지도 만들지도 않고, PayService 위의 @Component를 지워 가며 같은 main을 실행해, OrderService가 쓰는 PayService가 어디서 왔는지와 PayService 객체가 몇 개 만들어지는지를 봅니다.',
  terms: ['DI(의존성 주입)', '생성자 주입, 세터 주입, 필드 주입', '의존성', '@Component'],
  controls: [
    { id: 'how', label: 'OrderService가 PayService를 얻는 방법', type: 'select', value: 'inject', options: [['inject', '생성자의 매개변수로 받는다 (주입)'], ['new', 'new PayService()로 직접 만든다'], ['none', '받지도 만들지도 않는다']] },
    { id: 'dep', label: 'PayService 위에 @Component를 적는다', type: 'check', value: true },
  ],
  // q는 물음 방식의 화면에 보이는 물음, t와 d는 글로만 읽는 본문에 쓰이는 이름과 설명
  presets: [
    { t: '처음 설정으로', q: '의존성 주입은 어떻게 생겼고, 스프링은 무엇을 해 주나', d: '생성자의 매개변수로 PayService를 받습니다. 스프링이 보관하던 PayService 빈을 생성자에 넣어 줍니다.', v: { how: 'inject', dep: true } },
    { t: 'new PayService()로 직접 만들면', q: '생성자로 받지 않고 new PayService()로 직접 만들면', d: '결과는 같지만 OrderService가 쓰는 것은 스프링이 넣어 준 빈이 아니라 직접 만든 객체이고, PayService 객체가 2개 만들어집니다.', v: { how: 'new', dep: true } },
    { t: '받지도 만들지도 않으면', q: '받지도 만들지도 않으면', d: 'payService 필드가 비어 있어서, 쓰는 순간 NullPointerException으로 멈춥니다.', v: { how: 'none', dep: true } },
    { t: 'PayService에 @Component가 없으면', q: '생성자로 받는데 PayService에 @Component가 없으면', d: '넣어 줄 PayService 빈이 없어서 스프링이 시작하다가 실패합니다.', v: { how: 'inject', dep: false } },
  ],
  fieldText: { bean: '스프링이 넣어 준 빈', new: '직접 new로 만든 객체', empty: '없음 (비어 있음)' },
  code: function (c) {
    var o = [];
    if (c.dep) o.push('@Component');
    o.push('public class PayService {', '    public String pay() {', '        return "결제 완료";', '    }', '}', '', '@Component', 'public class OrderService {');
    o.push({ inject: '    private final PayService payService;', new: '    private final PayService payService = new PayService();', none: '    private PayService payService;' }[c.how], '');
    if (c.how === 'inject') o.push('    // 주입: 필요한 객체를 생성자의 매개변수로 적어 두면 스프링이 넣어 준다', '    public OrderService(PayService payService) {', '        this.payService = payService;', '    }', '');
    o.push('    public String order() {', '        return payService.pay();', '    }', '}', '', 'public class Main {', '    public static void main(String[] args) {', '        ApplicationContext context =', '                new AnnotationConfigApplicationContext("app");', '        OrderService orderService = context.getBean(OrderService.class);', '        System.out.println(orderService.order());', '    }', '}');
    return o.join('\n');
  },
  label: function (c) { return { inject: '생성자로 받음', new: 'new로 직접 만듦', none: '받지도 만들지도 않음' }[c.how] + ' · ' + (c.dep ? 'PayService에 @Component 있음' : 'PayService에 @Component 없음'); },
  columns: ['실행 결과', 'OrderService가 쓰는 PayService', '만들어진 PayService 객체'],
  simulate: function (c) {
    var how = c.how, inj = how === 'inject', nw = how === 'new', dep = !!c.dep, ev = [], sum = [], order = [], ft = this.fieldText;
    var st = { phase: '', line: '', scanned: false, ps: false, os: '', field: '', ext: false, need: false, made: 0, out: [], exc: '' };
    function push(s, k) { ev.push({ s: s, k: k, snap: JSON.parse(JSON.stringify(st)) }); }
    function newPay(by) { st.made++; order.push('PayService<-' + by); }
    // 1. 스프링 시작
    st.phase = 'start'; st.line = '컨텍스트를 만드는 줄';
    push('main 메서드의 첫 줄이 실행됩니다. new AnnotationConfigApplicationContext("app")이 스프링을 시작합니다. 괄호 안의 "app"은 스프링이 클래스를 찾아볼 패키지의 이름이고, 스프링은 자기가 만든 객체를 보관해 둘 곳을 준비합니다. 스프링이 만들어 보관하는 객체를 빈이라고 부릅니다.', '');
    // 2. 컴포넌트 스캔
    st.phase = 'scan'; st.scanned = true;
    push(dep
      ? '스프링이 app 패키지의 클래스를 훑어 @Component가 붙은 클래스를 찾습니다. PayService와 OrderService에 붙어 있으므로, 이 두 클래스의 객체를 만들어 보관할 대상으로 적어 둡니다.'
      : '스프링이 app 패키지의 클래스를 훑어 @Component가 붙은 클래스를 찾습니다. OrderService에만 붙어 있으므로 보관할 대상은 OrderService 하나입니다. PayService 클래스는 같은 패키지에 있지만 @Component가 없어, 스프링은 이 클래스를 찾지 못했습니다.', '');
    // 3. 이후는 얻는 방법에 따라 갈라진다
    if (inj) {
      st.phase = 'need'; st.need = true;
      push('스프링이 OrderService 객체를 만들려고 합니다. 생성자 OrderService(PayService payService)를 보니 매개변수로 PayService를 받습니다. 그래서 OrderService가 일을 하려면 PayService 객체가 필요하다는 것을 스프링이 알아냅니다. 이것을 "OrderService가 PayService에 의존한다"고 합니다.', '');
      if (dep) {
        st.phase = 'makePay'; st.ps = true; newPay('spring');
        push('OrderService를 만들려면 PayService 객체가 먼저 있어야 하므로, 스프링이 PayService 객체를 먼저 만들어 보관합니다. 이 객체가 PayService 빈입니다. 만들어진 PayService 객체는 1개입니다.', '');
        st.phase = 'makeOrder'; st.os = 'made'; st.field = 'bean'; order.push('OrderService<-spring');
        push('스프링이 OrderService 객체를 만듭니다. 보관하고 있던 PayService 빈을 OrderService 생성자의 payService 매개변수에 넣어 주고, 생성자의 this.payService = payService; 줄이 필드가 그 객체를 가리키게 합니다. 우리가 쓴 코드에는 new OrderService(...)도 new PayService()도 없습니다. 이렇게 필요한 객체를 스프링이 넣어 주는 것이 의존성 주입입니다.', 'good');
      } else {
        st.phase = 'miss';
        push('스프링이 PayService 객체를 넣어 주려고 보관하는 빈을 찾아봅니다. 그런데 PayService에는 @Component가 없어 스프링이 모르는 클래스이고, 보관하는 PayService 빈이 없습니다. 넣어 줄 객체가 없습니다.', 'bad');
        st.phase = 'fail'; st.os = 'fail'; st.exc = 'fail'; st.line = '시작하다 예외';
        push('스프링은 OrderService 객체를 만들지 못하고 UnsatisfiedDependencyException을 일으킵니다. 원인은 NoSuchBeanDefinitionException으로, PayService 타입의 빈이 없다는 뜻입니다. 이 예외가 new AnnotationConfigApplicationContext("app") 줄에서 나므로 main은 그 아래 줄로 가지 못하고 멈춥니다. 만들어진 PayService 객체는 0개이고 OrderService 객체도 만들어지지 않았습니다.', 'bad');
      }
    } else if (nw) {
      st.phase = 'makeOrder'; st.os = 'making'; order.push('OrderService<-spring');
      push('스프링이 OrderService 객체를 만들기 시작합니다. 이 클래스에는 생성자가 없어서 PayService를 받을 매개변수가 없습니다. OrderService는 일을 하려면 PayService 객체가 필요하지만, 스프링이 읽을 수 있는 표시가 없어 그 사실을 알지 못하고 넣어 줄 것도 없습니다.', '');
      st.phase = 'newPay'; st.os = 'made'; st.field = 'new'; st.ext = true; newPay('OrderService.<init>');
      push('OrderService 객체가 만들어지는 중에 private final PayService payService = new PayService(); 필드 줄이 실행됩니다. OrderService가 PayService 객체를 직접 만들어 필드에 담습니다.' + (dep ? ' 이 객체는 스프링이 보관하는 빈이 아니라, 우리가 쓴 코드가 만든 것입니다.' : ' PayService에는 @Component가 없어 스프링이 모르는 클래스이지만, 직접 만드는 데는 상관이 없습니다.') + ' 만들어진 PayService 객체는 1개입니다.', 'hot');
      if (dep) {
        st.phase = 'makePay'; st.ps = true; newPay('spring');
        push('이어서 스프링이 @Component가 붙은 PayService도 객체로 만들어 PayService 빈으로 보관합니다. 이 빈은 OrderService가 직접 만든 객체와 다른 객체입니다. 만들어진 PayService 객체는 2개가 되었습니다.', '');
      }
    } else {
      st.phase = 'makeOrder'; st.os = 'made'; st.field = 'empty'; order.push('OrderService<-spring');
      push('스프링이 OrderService 객체를 만듭니다. 이 클래스에는 생성자가 없어서 PayService를 받을 매개변수가 없고, new PayService()도 없습니다. OrderService는 일을 하려면 PayService 객체가 필요하지만, 받지도 만들지도 않았으므로 필드 payService에는 값이 담기지 않아 비어 있습니다(null).', '');
      if (dep) {
        st.phase = 'makePay'; st.ps = true; newPay('spring');
        push('스프링이 PayService 객체를 만들어 PayService 빈으로 보관합니다. 하지만 OrderService는 이 빈을 받지 않았으므로 두 객체는 이어지지 않습니다. 만들어진 PayService 객체는 1개입니다.', '');
      }
    }
    // 4. main이 이어서 실행된다 (시작에 실패하지 않은 경우)
    if (st.exc !== 'fail') {
      st.phase = 'getBean'; st.line = 'getBean 호출';
      push('컨텍스트를 만드는 줄이 오류 없이 끝나고, main의 다음 줄 context.getBean(OrderService.class)가 실행됩니다. 스프링이 보관하던 OrderService 빈을 main에 줍니다. 객체는 앞 줄에서 이미 만들어졌고, 이 줄에서 새로 만들어진 객체는 없습니다.' + (how === 'none' ? ' payService 필드가 비어 있어도 스프링은 오류를 내지 않았습니다.' : ''), '');
      if (how === 'none') {
        st.phase = 'npe'; st.line = '예외로 멈춤'; st.exc = 'npe';
        push('orderService.order() 메서드가 실행됩니다. order()가 payService.pay()를 부르려는데 payService가 비어 있어(null) 부를 객체가 없습니다. NullPointerException이 일어나고, 처리하는 코드가 없어 프로그램이 멈춥니다. 비어 있다는 것은 쓰는 이 순간에야 드러났습니다.', 'bad');
      } else {
        st.phase = 'pay'; st.line = 'order() 호출';
        push('orderService.order() 메서드가 실행됩니다. order()는 payService.pay()를 부르는데, 이 payService는 ' + (inj ? '스프링이 넣어 준 PayService 빈입니다.' : 'OrderService가 직접 만든 객체입니다.' + (dep ? ' 스프링이 보관하는 PayService 빈은 쓰이지 않습니다.' : '')) + ' pay() 메서드가 "결제 완료"를 돌려줍니다.', 'good');
        st.out.push('결제 완료'); st.phase = 'done'; st.line = '출력: 결제 완료';
        push('System.out.println이 돌려받은 글 "결제 완료"를 출력합니다.', '');
      }
    }
    // 요약: 첫 줄은 이 설정(물음)의 답
    if (inj && dep) {
      sum.push('의존성 주입은 클래스가 필요로 하는 객체를 스스로 만들지 않고 밖에서 넣어 받는 것입니다. 스프링에서는 생성자의 매개변수에 PayService를 적어 두는 것이 전부이고, 일반 클래스와 다른 곳은 스프링이 OrderService를 만들 때 보관하던 PayService 빈을 그 생성자에 넣어 준다는 점입니다.');
      sum.push('스프링은 생성자의 매개변수에서 OrderService가 PayService에 의존한다는 것을 읽고, PayService를 먼저 만든 뒤 그것을 넣어 OrderService를 만들었습니다. 우리 코드에는 두 객체를 만드는 new가 하나도 없고, 만들어진 PayService 객체는 1개입니다.');
    } else if (inj) {
      sum.push('생성자로 받겠다고 적었는데 스프링에 넣어 줄 PayService 빈이 없으면, 스프링은 OrderService를 만들지 못하고 시작하다가 실패합니다. PayService 위에 @Component가 없어서 스프링이 PayService 클래스를 찾지 못했기 때문입니다.');
      sum.push('스프링이 넣어 주는 것은 자기가 보관하는 빈뿐이고, 없는 객체를 대신 new로 만들어 주지는 않습니다. 오류는 쓰는 순간이 아니라 시작할 때 나므로, 만들어진 PayService 객체는 0개이고 main은 첫 줄에서 멈춥니다.');
    } else if (nw && dep) {
      sum.push('new PayService()로 직접 만들면 OrderService가 PayService 객체를 스스로 만들어 쓰므로, 스프링이 넣어 줄 일이 없습니다. 결과는 같은 "결제 완료"이지만, OrderService가 쓴 것은 스프링이 보관하는 빈이 아니라 자기가 만든 객체입니다.');
      sum.push('PayService 객체가 2개 만들어졌습니다. 스프링이 보관하는 PayService 빈과 OrderService가 직접 만든 객체이고, 쓰인 것은 직접 만든 쪽뿐입니다. 스프링이 만든 빈은 아무도 쓰지 않았습니다.');
    } else if (nw) {
      sum.push('new PayService()로 직접 만들면 PayService에 @Component가 없어도 실행됩니다. 스프링이 모르는 클래스이지만 OrderService가 스스로 만들었기 때문이고, 스프링이 넣어 주는 것이 아니라서 빈이 필요하지 않습니다.');
      sum.push('만들어진 PayService 객체는 1개이고, 스프링은 이 객체를 알지 못합니다. 같은 "결제 완료"가 나와도 객체의 출처는 스프링이 아니라 OrderService입니다.');
    } else if (dep) {
      sum.push('받지도 만들지도 않으면 OrderService의 payService 필드는 비어 있습니다. 스프링은 PayService 빈을 만들어 보관했지만 OrderService와 이어 주지 않았고, order()에서 payService.pay()를 부르는 순간 NullPointerException으로 멈췄습니다.');
      sum.push('스프링이 넣어 주는 것은 이 코드처럼 생성자의 매개변수로 필요하다고 적어 둔 경우입니다. 적지 않으면 보관하던 빈이 있어도 넣어 주지 않고, 시작할 때는 오류가 없다가 쓰는 순간에야 드러납니다.');
    } else {
      sum.push('받지도 만들지도 않으면 PayService 빈이 있든 없든 OrderService의 payService 필드는 비어 있고, order()에서 NullPointerException으로 멈춥니다. 여기서는 PayService에 @Component도 없어서 PayService 객체가 하나도 만들어지지 않았습니다.');
      sum.push('같은 @Component가 없는 설정이라도 생성자로 받을 때는 스프링이 시작하다 실패했지만, 여기서는 시작에 성공했습니다. 넣어 달라고 적지 않았으니 스프링이 PayService를 찾지도 않았고, 필요한 객체가 없다는 것이 쓰는 순간에 드러났습니다.');
    }
    var run = st.exc === 'fail' ? '스프링이 시작하다 실패함: PayService 빈이 없음' : st.exc === 'npe' ? 'NullPointerException으로 멈춤' : st.out.join(' / ');
    var used = st.exc === 'fail' ? 'OrderService가 만들어지지 못함' : ft[st.field];
    return { events: ev, summary: sum, order: order, ft: ft, row: [run, used, st.made + '개'] };
  },
  render: function (v, sim, t, H, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : null, dep = sim.c.dep, ft = sim.ft;
    if (!s) { H.text(v, '실행을 누르면 main이 스프링을 시작하는 것부터 시작합니다.'); return; }
    var pay = !s.scanned ? '-' : !dep ? '찾지 못함 (@Component 없음)' : s.ps ? '만들어져 보관됨' : '아직 만들지 않음';
    var ord = { '': s.need ? '만드는 중' : s.scanned ? '아직 만들지 않음' : '-', making: '만드는 중', made: '만들어져 보관됨', fail: '만들지 못함' }[s.os];
    H.table(v, ['스프링이 보관하는 빈', '상태'], [{ cls: !s.scanned || dep ? '' : 'gone', cells: ['PayService', pay] }, { cls: '', cells: ['OrderService', { v: ord, cls: s.os === 'fail' ? 'bad' : '' }] }], '스프링이 보관하는 곳');
    if (s.os === 'made' || s.os === 'making') H.table(v, ['OrderService의 칸', '들어 있는 것'], [{ cls: '', cells: ['payService', s.field ? { v: ft[s.field], cls: s.field === 'bean' ? 'good' : s.field === 'empty' ? 'bad' : 'hot' } : '-'] }], 'OrderService 안');
    if (s.out.length || s.exc) H.table(v, ['실행 결과'], s.out.map(function (o) { return { cls: '', cells: [{ v: o, cls: 'good' }] }; }).concat(s.exc ? [{ cls: '', cells: [{ v: s.exc === 'fail' ? '스프링이 시작하다 실패함: PayService 빈이 없음' : 'NullPointerException으로 멈춤', cls: 'bad' }] }] : []), '출력');
    H.counters(v, [[s.made, '만들어진 PayService 객체']]);
  },
  // 그림: 왼쪽 "스프링이 보관하는 곳" 안에 PayService 빈과 OrderService 빈, 오른쪽에 main과 영역 밖의 직접 만든 객체. OrderService의 payService 칸에서 PayService로 가는 화살표는 스프링이 넣어 준 때만 초록이고, 직접 만든 객체로 가면 영역 밖으로 나가며, 비어 있으면 화살표가 없다. 아래에 만들어진 PayService 객체 수.
  draw: function (P, sim, shown) {
    var c = sim.c, ft = sim.ft, last = shown[shown.length - 1], s = last ? last.snap : null, ph = s ? s.phase : '';
    P.size(680, 232);
    P.region('sp', 14, 16, 466, 150, '스프링이 보관하는 곳');
    // PayService 빈
    var psSub = !s || !s.scanned ? [' '] : !c.dep ? ['@Component 없음', '스프링이 모름'] : s.ps ? ['객체 1개'] : ['아직 만들지 않음'];
    P.box('ps', 28, 52, 168, 30 + psSub.length * 19, { cls: s && s.ps ? ((ph === 'makePay' || (ph === 'pay' && s.field === 'bean')) ? 'good now' : 'good') : 'ghost', title: 'PayService 빈', sub: psSub });
    // OrderService 빈: 상태와 payService 칸
    var st0 = !s ? ' ' : { '': s.need ? '만드는 중' : s.scanned ? '아직 만들지 않음' : ' ', making: '만드는 중', made: '객체 1개', fail: '만들지 못함' }[s.os];
    var osCls = !s || !s.scanned ? 'ghost' : s.os === 'fail' || ph === 'npe' ? 'bad' : ph === 'makeOrder' || ph === 'need' || ph === 'getBean' || ph === 'newPay' ? 'hot now' : s.os === 'made' ? 'good' : 'plain';
    P.box('os', 256, 52, 196, 87, { cls: osCls, title: 'OrderService 빈', sub: [st0, 'payService 칸', s && s.field ? ft[s.field] : '-'] });
    // main과 직접 만든 객체
    P.box('mn', 510, 16, 156, 68, { cls: !s ? 'plain' : (s.exc === 'fail' || ph === 'npe') ? 'bad' : (ph === 'getBean' || ph === 'pay') ? 'hot now' : 'wait', title: 'main', sub: [s && s.line ? s.line : '대기'] });
    P.box('px', 510, 104, 156, 68, { cls: s && s.ext ? (ph === 'pay' ? 'hot now' : 'hot') : 'ghost', title: '직접 만든 객체', sub: [s && s.ext ? 'PayService 1개' : '없음'] });
    // 화살표
    if (s && (ph === 'getBean' || ph === 'pay' || ph === 'npe')) P.arrow('call', 'mn:l:0.3', 'os:r:0.25', { cls: ph === 'npe' ? 'bad' : 'hot' });
    if (s && s.field === 'bean') P.arrow('rf', 'os:l:0.75', 'ps:r:0.75', { cls: 'good' });
    else if (s && s.need && s.field !== 'bean') P.arrow('rf', 'os:l:0.75', 'ps:r:0.75', { cls: s.os === 'fail' ? 'bad' : 'dash' });
    if (s && s.field === 'new') P.arrow('rn', 'os:r:0.8', 'px:l:0.4', { cls: 'hot' });
    P.box('n1', 14, 184, 652, 36, { cls: s && s.made ? 'good' : 'ghost', title: '만들어진 PayService 객체', right: (s ? s.made : 0) + '개' });
  },
  assume: '스프링 프레임워크 7.0.9를 JDK 21.0.12.1에서 실행한 결과입니다. 스프링 부트는 쓰지 않고, 화면의 main이 그대로 쓰는 AnnotationConfigApplicationContext("app")의 컴포넌트 스캔만 썼습니다. 여섯 가지 조합을 모두, 화면의 코드와 같은 소스(패키지 app의 PayService, OrderService, Main)를 javac(-parameters)로 컴파일하고 자식 자바 프로세스로 실행해 확인했습니다. 컴포넌트를 손으로 등록하지 않고 스프링이 클래스를 훑어 찾게 했습니다. 대조용 소스에만 Probe 클래스를 더하고 네 줄을 끼웠습니다. 두 클래스에는 객체가 만들어질 때 그 생성자를 부른 쪽(스프링인지 OrderService의 어느 생성자인지)을 스택에서 읽어 적는 인스턴스 초기화 블록 한 줄씩을, main에는 컨텍스트가 만들어진 뒤와 getBean 뒤에 측정하는 줄을 한 줄씩 더했고, 대조 스크립트는 화면의 코드와 견줄 때 이 줄들을 뺍니다. 대조한 것은 실행 결과(출력, 시작 실패한 예외의 종류와 원인, 멈춘 예외와 그 자리), OrderService가 쓰는 PayService, 만들어진 PayService 객체의 수입니다. "OrderService가 쓰는 PayService"는 짐작이 아니라 실측했습니다. 실행 중에 리플렉션으로 OrderService 객체의 payService 필드를 읽어, 컨텍스트에 있는 PayService 빈과 같은 객체인지(==)와 비어 있는지를 견주었습니다. 객체의 수도 생성자가 불린 횟수를 센 것입니다. 단계 문장이 기대는 사실도 따로 재서 확인했습니다. 컴포넌트 스캔이 찾은 클래스, 객체가 만들어진 순서(생성자 주입에서는 PayService가 먼저, 직접 만들 때는 OrderService가 만들어지는 중에 PayService가 만들어짐), 모든 객체가 컨텍스트를 만드는 줄에서 만들어지고 getBean 줄에서는 새로 만들어지지 않는다는 것, 스프링이 기록한 OrderService의 의존 대상(생성자로 받을 때만 payService), PayService 빈이 없을 때 OrderService가 만들어지지 않고 main이 첫 줄에서 멈춘다는 것, 비어 있는 필드를 쓰다 멈추는 자리가 OrderService의 order() 메서드라는 것, 우리 코드에 new OrderService(...)라는 줄이 없다는 것입니다. 시작에 실패한 조합의 실제 예외는 UnsatisfiedDependencyException이고 원인은 NoSuchBeanDefinitionException(PayService 타입의 빈이 없음)이며, 원문은 Probe 출력에 남겼습니다. 문서가 정한 것은 스프링 프레임워크 문서 Core의 Dependency Injection 절(의존성 주입이 객체가 의존하는 다른 객체를 생성자 인자 등으로만 정하고 컨테이너가 빈을 만들 때 그것을 넣어 주는 과정이라는 것, 생성자 기반 주입이 컨테이너가 각각 의존성을 뜻하는 인자를 가진 생성자를 부르는 것이라는 것), Using @Autowired 절(대상 빈의 생성자가 하나뿐이면 그 생성자에 @Autowired를 붙이지 않아도 된다는 것), Classpath Scanning and Managed Components 절과 @Component, AnnotationConfigApplicationContext의 API 문서(@Component가 붙은 클래스가 자동 탐지의 후보이고, 지정한 패키지를 스캔해 빈 정의를 등록한다는 것)입니다. 같은 실행에서 본 다음 동작은 문서가 정한 것이 아니라 이 버전에서 관찰한 것입니다. 클래스 파일을 훑는 순서에서 OrderService가 PayService보다 먼저 나왔고, 생성자 주입에서는 그 때문에 OrderService를 만들다가 PayService를 먼저 만들었다는 것, new로 직접 만들 때 스프링이 OrderService를 먼저 만들고 PayService 빈을 그다음에 만든다는 것(스캔 순서에 달린 것이어서 클래스 이름이 바뀌면 달라질 수 있음), 비어 있는 필드를 스프링이 오류로 알리지 않는다는 것입니다. 화면의 코드는 package와 import 줄을 줄였습니다. 이 실습은 생성자 주입만 다룹니다. 세터 주입, 필드 주입(@Autowired), 같은 타입의 빈이 여러 개일 때, 순환 의존, 빈의 범위와 생명주기, 인터페이스로 받는 설계는 다루지 않았고, "세부 동작 실습: 빈 생성과 주입"에서 다룹니다.',
});

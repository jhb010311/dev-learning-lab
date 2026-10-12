Lab.register({
  id: 'ioc', nav: '스프링 컨테이너와 빈', cat: '스프링', mode: 'step',
  title: 'new를 쓰지 않았는데 객체는 누가 만들어 넣어 주나',
  intro: '주문 서비스가 할인 정책 객체를 쓰려면 누군가 그 객체를 만들어야 합니다. 직접 new로 만들면 어떤 구현을 쓸지가 주문 서비스의 코드에 박힙니다. 스프링에서는 컨테이너가 객체(빈)를 만들고, 필요한 곳에 골라서 넣어 줍니다.',
  terms: ['IoC(제어의 역전)', '스프링 빈(Bean)', '@Configuration과 @Bean', '@Primary와 @Qualifier', 'NoSuchBeanDefinitionException과 NoUniqueBeanDefinitionException'],
  controls: [
    { id: 'how', label: '할인 정책 객체를 만드는 쪽', type: 'select', value: 'comp', options: [['new', 'OrderService가 직접 new로 만든다'], ['comp', '컨테이너가 만든다 (@Component로 등록)'], ['bean', '컨테이너가 만든다 (@Bean 메서드로 등록)']] },
    { id: 'reg', label: '빈으로 등록한 구현', type: 'select', value: 'two', options: [['one', '쓰려는 구현 하나만'], ['two', '두 구현 모두 (고르는 표시 없음)'], ['primary', '두 구현 모두, 쓰려는 쪽에 @Primary'], ['qualifier', '두 구현 모두, 주입받는 곳에 @Qualifier'], ['none', '하나도 등록하지 않음']], show: function (c) { return c.how !== 'new'; } },
    { id: 'use', label: '쓰려는 구현', type: 'select', value: 'rate', options: [['fixed', 'FixedDiscountPolicy (언제나 1000원 할인)'], ['rate', 'RateDiscountPolicy (10% 할인)']], show: function (c) { return c.how === 'new' || c.reg === 'one' || c.reg === 'primary' || c.reg === 'qualifier'; }, hint: '이 값을 바꿨을 때 코드의 어느 파일이 달라지는지 왼쪽 코드에서 확인해 보세요.' },
  ],
  presets: [
    { t: '처음 설정으로', q: '두 구현을 모두 @Component로 등록하고 고르는 표시 없이 RateDiscountPolicy를 쓰려 하면 기동은 어떻게 되나', d: '두 구현을 모두 @Component로 등록했습니다. 컨테이너가 고르지 못해 기동이 실패합니다.', v: { how: 'comp', reg: 'two', use: 'rate' } },
    { t: '직접 new로 만들면', q: '할인 정책 객체를 OrderService가 직접 new로 만들고 쓰려는 구현을 FixedDiscountPolicy로 바꾸면', d: '어떤 구현을 쓸지가 OrderService 안에 적힙니다. 바꾸려면 OrderService를 고칩니다.', v: { how: 'new', reg: 'two', use: 'fixed' } },
    { t: '구현 하나만 등록', q: '쓰려는 구현 하나만 빈으로 등록하면', d: '컨테이너가 하나뿐인 빈을 찾아 넣어 줍니다. OrderService에는 new가 없습니다.', v: { how: 'comp', reg: 'one', use: 'rate' } },
    { t: '@Primary로 고르기', q: '두 구현 모두 등록하고 쓰려는 쪽에 @Primary를 붙이면', d: '둘 다 등록하고 먼저 쓸 쪽에 표시를 붙입니다.', v: { how: 'comp', reg: 'primary', use: 'rate' } },
    { t: '@Qualifier로 고르기', q: '두 구현 모두 등록하고 주입받는 곳에 @Qualifier로 FixedDiscountPolicy를 고르면', d: '주입받는 쪽에서 빈 이름을 지정합니다.', v: { how: 'comp', reg: 'qualifier', use: 'fixed' } },
    { t: '@Bean 메서드로 등록', q: '할인 정책 객체를 @Bean 메서드로 등록하고 쓰려는 구현 하나만 등록하면', d: '설정 클래스의 메서드가 돌려준 객체가 빈이 됩니다.', v: { how: 'bean', reg: 'one', use: 'rate' } },
    { t: '빈을 등록하지 않으면', q: '구현을 하나도 빈으로 등록하지 않으면', d: '넣어 줄 빈이 없어 기동이 실패합니다.', v: { how: 'comp', reg: 'none', use: 'rate' } },
  ],
  // 설정에서 정해지는 사실: 어느 구현이 빈으로 등록되는지, 무엇이 선택되는지
  facts: function (c) {
    var isNew = c.how === 'new', fixed = c.use === 'fixed', both = c.reg === 'two' || c.reg === 'primary' || c.reg === 'qualifier';
    return {
      isNew: isNew, comp: c.how === 'comp', fixed: fixed, both: both,
      regFixed: !isNew && (both || (c.reg === 'one' && fixed)), regRate: !isNew && (both || (c.reg === 'one' && !fixed)),
      cls: fixed ? 'FixedDiscountPolicy' : 'RateDiscountPolicy', other: fixed ? 'RateDiscountPolicy' : 'FixedDiscountPolicy',
      bean: fixed ? 'fixedDiscountPolicy' : 'rateDiscountPolicy', off: fixed ? 1000 : 2000,
    };
  },
  code: function (c) {
    var f = this.facts(c), primary = c.reg === 'primary';
    function impl(name, body, note, reg, pri) {
      return (f.comp && reg ? '@Component\n' : '') + (f.comp && pri ? '@Primary\n' : '') + 'class ' + name + ' implements DiscountPolicy {\n    public int discount(int price) { return ' + body + '; }   // ' + note + '\n}';
    }
    var out = ['interface DiscountPolicy {\n    int discount(int price);\n}'];
    out.push(impl('FixedDiscountPolicy', '1000', '언제나 1000원', f.regFixed, primary && f.fixed));
    out.push(impl('RateDiscountPolicy', 'price / 10', '10%', f.regRate, primary && !f.fixed));
    var order = '\n    int order(int price) {\n        return price - discountPolicy.discount(price);\n    }\n}';
    if (f.isNew) {
      out.push('class OrderService {\n    private final DiscountPolicy discountPolicy = new ' + f.cls + '();   // 직접 만들고, 직접 고른다\n' + order);
      out.push('// 쓰는 곳\nOrderService orderService = new OrderService();\nint pay = orderService.order(20000);');
      return out.join('\n\n');
    }
    if (c.how === 'bean') {
      var cfg = '@Configuration\nclass AppConfig {';
      if (f.regFixed) cfg += '\n    @Bean\n' + (primary && f.fixed ? '    @Primary\n' : '') + '    DiscountPolicy fixedDiscountPolicy() {       // 메서드 이름이 빈 이름\n        return new FixedDiscountPolicy();\n    }';
      if (f.regRate) cfg += '\n    @Bean\n' + (primary && !f.fixed ? '    @Primary\n' : '') + '    DiscountPolicy rateDiscountPolicy() {\n        return new RateDiscountPolicy();\n    }';
      if (!f.regFixed && !f.regRate) cfg += '\n    // @Bean 메서드가 없다';
      out.push(cfg + '\n}');
    }
    out.push('@Component\nclass OrderService {\n    private final DiscountPolicy discountPolicy;\n\n    OrderService(' + (c.reg === 'qualifier' ? '@Qualifier("' + f.bean + '") ' : '') + 'DiscountPolicy discountPolicy) {   // 컨테이너가 넣어 준다\n        this.discountPolicy = discountPolicy;\n    }\n' + order);
    out.push('// 쓰는 곳: 컨테이너에서 꺼낸다\nOrderService orderService = context.getBean(OrderService.class);\nint pay = orderService.order(20000);');
    return out.join('\n\n');
  },
  label: function (c) {
    if (c.how === 'new') return '직접 new · ' + (c.use === 'fixed' ? 'Fixed' : 'Rate');
    var pick = c.reg === 'one' || c.reg === 'primary' || c.reg === 'qualifier' ? ' · ' + (c.use === 'fixed' ? 'Fixed' : 'Rate') : '';
    return (c.how === 'comp' ? '@Component' : '@Bean') + ' · ' + { one: '하나만 등록', two: '둘 다 등록', primary: '둘 다 + @Primary', qualifier: '둘 다 + @Qualifier', none: '등록 안 함' }[c.reg] + pick;
  },
  columns: ['결과', 'OrderService가 쓰는 구현', '할인 정책 객체를 만든 코드', '구현을 바꿀 때 고치는 파일'],
  simulate: function (c) {
    var f = this.facts(c), ev = [], sum = [], regWord = f.comp ? '@Component' : '@Bean 메서드';
    var st = { svc: '없음', pick: '', off: '', result: '', beans: {
      fixed: { cls: 'FixedDiscountPolicy', name: 'fixedDiscountPolicy', reg: f.regFixed, mark: c.reg === 'primary' && f.fixed, s: 'none' },
      rate: { cls: 'RateDiscountPolicy', name: 'rateDiscountPolicy', reg: f.regRate, mark: c.reg === 'primary' && !f.fixed, s: 'none' } } };
    var mine = st.beans[f.fixed ? 'fixed' : 'rate'], rest = st.beans[f.fixed ? 'rate' : 'fixed'];
    function push(s, k) { ev.push({ s: s, k: k, snap: JSON.parse(JSON.stringify(st)) }); }
    var row, made = 0, fail = '';
    if (f.isNew) {
      st.svc = '만드는 중';
      push('new OrderService(): 쓰는 쪽 코드가 OrderService 객체를 직접 만듭니다. 스프링 컨테이너는 관여하지 않습니다.', '');
      mine.s = 'in'; st.pick = f.cls; st.svc = '완성'; made = 1;
      push('new ' + f.cls + '(): OrderService의 필드 초기화 코드가 실행되어, OrderService가 자기가 쓸 할인 정책 객체를 직접 만듭니다. 어떤 구현을 쓸지도 OrderService의 소스 안에 적혀 있습니다.', '');
      st.off = f.off + '원'; st.result = '정상 실행';
      push('orderService.order(20000): ' + f.cls + '의 discount가 ' + f.off + '원을 돌려주어, 낼 돈은 ' + (20000 - f.off) + '원입니다.', '');
      push('구현을 ' + f.other + '로 바꾸려면: OrderService.java를 열어 new 뒤의 클래스 이름을 고쳐야 합니다. 할인 정책을 쓰는 클래스가 여럿이면 그 클래스를 모두 고쳐야 합니다.', 'bad');
      sum.push('객체를 만드는 코드와 구현을 고르는 코드가 모두 OrderService 안에 있습니다. OrderService는 DiscountPolicy라는 인터페이스 타입으로 필드를 선언했지만, new 뒤에 구현 클래스 이름을 적는 순간 그 구현에 묶입니다.');
      sum.push('구현을 바꿀 때마다 그것을 쓰는 클래스를 고쳐야 합니다.');
      row = ['정상 실행 (컨테이너 없음)', f.cls + ' (' + f.off + '원 할인)', 'OrderService의 new', 'OrderService'];
    } else {
      var names = ['orderService'].concat(f.regFixed ? ['fixedDiscountPolicy'] : [], f.regRate ? ['rateDiscountPolicy'] : []), n = names.length - 1;
      ['fixed', 'rate'].forEach(function (k) { if (st.beans[k].reg) st.beans[k].s = 'def'; });
      st.svc = '등록됨';
      if (f.comp) push('컨테이너 시작: 컨테이너가 클래스들을 훑어 @Component가 붙은 것을 빈으로 등록합니다(컴포넌트 스캔). 등록된 빈은 ' + names.join(', ') + '입니다. 빈의 이름은 클래스 이름의 첫 글자를 소문자로 바꾼 것입니다.' + (n < 2 ? ' @Component가 없는 구현 클래스는 컨테이너가 알지 못합니다.' : ''), '');
      else push('컨테이너 시작: 컨테이너가 @Component가 붙은 OrderService와 @Configuration이 붙은 AppConfig 클래스를 찾습니다. ' + (n ? '그리고 AppConfig 안의 @Bean 메서드 ' + n + '개를 빈으로 등록합니다. @Bean으로 등록한 빈의 이름은 메서드 이름입니다. ' : 'AppConfig 안에는 @Bean 메서드가 없어 더 등록되는 빈이 없습니다. ') + '등록된 빈은 ' + names.join(', ') + '입니다(AppConfig 자신도 빈으로 등록됩니다).', '');
      st.svc = '만드는 중';
      ['fixed', 'rate'].forEach(function (k) { if (st.beans[k].reg) st.beans[k].s = 'cand'; });
      push('orderService 빈 만들기: OrderService의 생성자가 DiscountPolicy 타입의 인자를 요구합니다. 컨테이너가 등록된 빈 가운데 이 타입에 맞는 것을 찾습니다. 후보는 ' + n + '개입니다' + (n ? '(' + names.slice(1).join(', ') + ').' : '.'), '');
      if (n === 0) {
        fail = 'NoSuchBeanDefinitionException'; st.svc = '실패'; st.result = '기동 실패';
        push('넣어 줄 빈이 하나도 없습니다. 컨테이너는 생성자를 호출할 수 없어 NoSuchBeanDefinitionException을 던지고, 애플리케이션 기동이 실패합니다. 구현 클래스가 소스에 있어도 빈으로 등록하지 않았다면 컨테이너에는 없는 것입니다.', 'bad');
        sum.push('필요한 빈이 없으면 주문이 들어왔을 때가 아니라 애플리케이션이 뜨는 시점에 바로 실패합니다. 빠진 등록을 일찍 알 수 있습니다.');
        sum.push(f.comp ? '구현 클래스에 @Component를 붙이면 컨테이너가 찾아 등록합니다.' : 'AppConfig에 @Bean 메서드를 추가하면 그 메서드가 돌려준 객체가 빈으로 등록됩니다.');
      } else if (c.reg === 'two') {
        fail = 'NoUniqueBeanDefinitionException'; st.svc = '실패'; st.result = '기동 실패';
        push('후보가 둘인데 어느 쪽을 넣을지 정할 근거가 없습니다. 컨테이너는 임의로 하나를 고르지 않고 NoUniqueBeanDefinitionException을 던집니다. 애플리케이션 기동이 실패합니다.', 'bad');
        sum.push('컨테이너는 타입으로 빈을 찾습니다. 같은 타입의 빈이 둘 이상이면 무엇을 넣을지 알려 줘야 합니다. 먼저 쓸 빈에 @Primary를 붙이거나, 주입받는 곳에 @Qualifier로 빈 이름을 적습니다.');
        sum.push('구현 클래스를 하나 더 만들어 등록하기만 해도 이 오류가 납니다. 기존 코드를 고치지 않았는데 기동이 실패했다면 같은 타입의 빈이 늘지 않았는지 확인합니다.');
      } else {
        if (c.reg === 'one') push('후보가 ' + f.bean + ' 하나뿐이므로 이것으로 정합니다.', '');
        else if (c.reg === 'primary') { rest.s = 'def'; push('후보가 둘이지만 ' + (f.comp ? f.cls + ' 클래스' : 'AppConfig의 ' + f.bean + '() 메서드') + '에 @Primary가 붙어 있습니다. @Primary는 같은 타입이 여럿일 때 먼저 쓰라는 표시이므로, 컨테이너가 ' + f.bean + '를 고릅니다.', 'good'); }
        else { rest.s = 'def'; push('후보가 둘이지만 생성자 파라미터에 @Qualifier("' + f.bean + '")가 붙어 있습니다. 컨테이너가 이름이 ' + f.bean + '인 빈을 고릅니다.', 'good'); }
        mine.s = 'made';
        push(f.comp ? '컨테이너가 고른 빈의 객체를 준비합니다. 아직 만들지 않았다면 지금 ' + f.cls + '의 생성자를 호출해 만들고, 이미 만들어 두었다면 그 객체를 씁니다. 어느 쪽이든 생성자를 부르는 것은 내 코드가 아니라 컨테이너입니다.' : '컨테이너가 고른 빈의 객체를 준비합니다. 아직 만들지 않았다면 지금 AppConfig의 ' + f.bean + '() 메서드를 호출하고, 그 안의 new ' + f.cls + '()가 돌려준 객체를 빈으로 삼습니다. new는 내가 썼지만 그 메서드를 부르는 것은 컨테이너입니다.', '');
        mine.s = 'in'; st.pick = f.cls; st.svc = '완성'; made = 1;
        push('컨테이너가 OrderService의 생성자를 호출하면서 그 객체를 인자로 넘깁니다(의존성 주입). OrderService의 코드에는 new도, 구현 클래스의 이름도 없습니다.', 'good');
        if (f.both) { rest.s = 'made'; made = 2; push('고르지 않은 ' + rest.name + '도 빈으로 등록돼 있으므로, 기동이 끝날 때까지 컨테이너가 그 객체도 하나 만들어 둡니다. 다만 OrderService에는 들어가지 않습니다.', ''); }
        st.off = f.off + '원'; st.result = '기동 성공';
        push('orderService.order(20000): 주입받은 ' + f.cls + '의 discount가 ' + f.off + '원을 돌려주어, 낼 돈은 ' + (20000 - f.off) + '원입니다.', 'good');
        var where = c.reg === 'qualifier' ? 'OrderService' : f.comp ? 'FixedDiscountPolicy, RateDiscountPolicy' : 'AppConfig';
        push('구현을 ' + f.other + '로 바꾸려면: ' + (c.reg === 'qualifier' ? 'OrderService의 @Qualifier에 적은 빈 이름을 바꿉니다. 주입받는 쪽 파일을 고치게 됩니다.' : c.reg === 'primary' ? (f.comp ? '@Primary를 ' + f.other + ' 클래스로 옮깁니다.' : 'AppConfig에서 @Primary를 다른 @Bean 메서드로 옮깁니다.') + ' OrderService는 고치지 않습니다.' : (f.comp ? '@Component를 ' + f.other + ' 클래스로 옮깁니다.' : 'AppConfig의 @Bean 메서드를 ' + f.other + '를 돌려주는 것으로 바꿉니다.') + ' OrderService는 고치지 않습니다.'), c.reg === 'qualifier' ? '' : 'good');
        if (c.reg === 'one') sum.push('OrderService는 "DiscountPolicy가 필요하다"고 생성자에 적기만 합니다. 객체를 만들고, 어느 구현을 넣을지 정하는 일은 컨테이너가 합니다. 그래서 구현을 바꿔도 OrderService는 그대로입니다.');
        if (c.reg === 'primary') sum.push('@Primary는 등록하는 쪽에 붙이는 표시입니다. 주입받는 클래스가 몇 개든 한 곳만 바꾸면 모두 바뀝니다. 고르지 않은 구현도 빈이므로 객체는 만들어집니다.');
        if (c.reg === 'qualifier') sum.push('@Qualifier는 주입받는 쪽에서 빈 이름을 지정합니다. 주입받는 곳마다 다른 구현을 고를 수 있는 대신, 구현을 바꿀 때 그 클래스를 고쳐야 합니다. 기본으로 쓸 구현은 @Primary로 정하고, 다른 구현이 필요한 곳에만 @Qualifier를 붙일 수도 있습니다.');
        sum.push(f.comp ? '@Component는 내가 만든 클래스에 붙여 "이 클래스를 빈으로 등록해 달라"고 표시하는 방법입니다. 객체는 컨테이너가 생성자를 호출해 만듭니다.' : '@Bean은 설정 클래스의 메서드에 붙이는 방법입니다. 객체를 만드는 코드는 내가 쓰고, 컨테이너가 그 메서드를 호출해 돌려받은 객체를 빈으로 등록합니다. 소스를 고칠 수 없는 라이브러리의 클래스도 이 방법으로 등록할 수 있습니다.');
        row = ['기동 성공', f.cls + ' (' + f.off + '원 할인)', f.comp ? '컨테이너 (생성자를 직접 호출)' : '컨테이너가 호출한 AppConfig의 @Bean 메서드', where];
      }
      if (fail) row = ['기동 실패: ' + fail, '-', '-', '-'];
    }
    return { events: ev, summary: sum, made: made, fail: fail, regWord: regWord, row: row };
  },
  render: function (v, sim, t, H, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : null, c = sim.c, isNew = c.how === 'new';
    if (!s) { H.text(v, isNew ? '실행을 누르면 OrderService를 직접 만듭니다.' : '실행을 누르면 컨테이너가 뜨기 시작합니다.'); return; }
    var word = { none: isNew ? '쓰지 않음 (객체 없음)' : '빈으로 등록되지 않음', def: '빈으로 등록됨', cand: '주입 후보', made: '객체 있음', in: isNew ? 'OrderService가 만든 객체' : 'OrderService에 주입됨' };
    H.table(v, isNew ? ['구현 클래스', '상태'] : ['구현 클래스', '빈 이름', '상태'], ['fixed', 'rate'].map(function (k) {
      var b = s.beans[k], st = { v: word[b.s], cls: b.s === 'in' ? 'good' : b.s === 'cand' ? 'hot' : '' };
      return { cls: b.s === 'none' ? 'gone' : '', cells: isNew ? [b.cls, st] : [b.cls + (b.mark ? ' (@Primary)' : ''), b.reg ? b.name : '-', st] };
    }), isNew ? 'DiscountPolicy의 구현 (컨테이너 없음)' : '스프링 컨테이너가 아는 DiscountPolicy 구현 (' + sim.regWord + '로 등록)');
  },
  // 그림: 왼쪽에 OrderService, 오른쪽에 할인 정책의 두 구현. 컨테이너가 후보를 찾고(점선) 고른 것을 넣어 준다(초록 실선). 직접 new일 때는 OrderService에서 구현으로 화살표가 나간다.
  draw: function (P, sim, shown) {
    var c = sim.c, isNew = c.how === 'new', last = shown[shown.length - 1];
    var s = last ? last.snap : { svc: '없음', pick: '', off: '', result: '', beans: { fixed: { cls: 'FixedDiscountPolicy', name: 'fixedDiscountPolicy', reg: false, mark: false, s: 'none' }, rate: { cls: 'RateDiscountPolicy', name: 'rateDiscountPolicy', reg: false, mark: false, s: 'none' } } };
    P.size(680, 316);
    P.region('ctx', 16, 16, 648, 224, isNew ? '컨테이너 없음: 내 코드가 직접 만든다' : '스프링 컨테이너');
    P.box('svc', 30, 96, 290, 64, { cls: s.svc === '완성' ? 'good' : s.svc === '실패' ? 'bad' : s.svc === '만드는 중' ? 'hot now' : s.svc === '없음' ? 'ghost' : 'plain', title: isNew ? 'OrderService 객체' : 'orderService 빈', sub: [s.svc === '없음' ? '아직 없음' : s.svc, '쓰는 구현: ' + (s.pick || '아직 없음')] });
    [['fixed', 52], ['rate', 148]].forEach(function (p) {
      var b = s.beans[p[0]], y = p[1];
      var sub = isNew ? (b.s === 'in' ? 'OrderService가 new로 만든 객체' : '쓰지 않음 (객체 없음)') : b.s === 'none' ? '빈으로 등록되지 않음' : { def: '빈으로 등록됨', cand: '주입 후보', made: '객체 있음', in: 'OrderService에 주입됨' }[b.s];
      P.box(p[0], 410, y, 240, 64, { cls: b.s === 'in' ? 'good' : b.s === 'cand' ? 'hot' : b.s === 'none' ? 'ghost' : b.s === 'made' ? 'wait' : 'plain', title: !isNew && b.reg ? b.name : b.cls, sub: !isNew && b.reg ? [b.cls + (b.mark ? ' (@Primary)' : ''), sub] : [sub] });
      if (isNew && b.s === 'in') P.arrow('a_' + p[0], 'svc:r', p[0] + ':l', { cls: 'hot', label: 'new' });
      if (!isNew && b.s === 'cand') P.arrow('a_' + p[0], p[0] + ':l', 'svc:r', { cls: s.svc === '실패' ? 'bad dash' : 'dash mut', label: '후보' });
      if (!isNew && b.s === 'in') P.arrow('a_' + p[0], p[0] + ':l', 'svc:r', { cls: 'good', label: '주입' });
    });
    P.box('r1', 16, 258, 320, 40, { cls: !s.result ? 'ghost' : s.result === '기동 실패' ? 'bad' : 'good', title: '결과', right: s.result ? (sim.fail ? sim.fail : s.result) : '진행 중' });
    P.box('r2', 344, 258, 320, 40, { cls: s.off ? 'good' : 'ghost', title: '20000원 주문의 할인', right: s.off || '-' });
    P.note(isNew ? '화살표는 "OrderService가 이 객체를 직접 만들었다"는 뜻입니다.' : '점선은 컨테이너가 찾은 후보, 초록 실선은 컨테이너가 골라서 OrderService에 넣어 준 빈입니다. 흐린 상자는 빈으로 등록되지 않아 컨테이너가 모르는 클래스입니다.');
  },
  assume: '서른 가지 조합을 이 PC의 스프링 부트 4.1.1(스프링 프레임워크 7.0.9)에서 실행해 대조했습니다. 조합마다 화면과 같은 구조의 소스를 컴파일해, 직접 new로 만드는 경우는 그대로 실행하고 컨테이너를 쓰는 경우는 컴포넌트 스캔으로 띄운 뒤, 기동 성공 여부와 예외 이름, OrderService에 들어간 구현, 할인 금액, 구현 객체의 생성자를 부른 쪽(호출 스택으로 확인), 만들어진 구현 객체의 수를 비교했습니다. "구현을 바꿀 때 고치는 파일"은 쓰려는 구현만 바꾼 두 소스에서 내용이 달라진 파일을 대조 프로그램이 직접 비교한 것입니다. 기동 실패에서 맨 안쪽 원인 예외의 이름을 적었으며, 바깥에는 UnsatisfiedDependencyException이 감싸고 있습니다. 화면에서 단순화한 것: 컨테이너가 빈 객체를 만드는 순서는 등록 순서에 따라 달라지므로 단정하지 않았습니다(순서는 "빈 생성과 주입" 실습에서 다룹니다). 두 구현을 모두 등록하고 고르는 표시가 없어도 생성자 파라미터의 이름이 빈 이름과 같으면(예: rateDiscountPolicy) 그 빈이 들어가 기동에 성공하는 것도 실행으로 확인했습니다. 이 실습의 파라미터 이름은 discountPolicy라서 어느 빈 이름과도 같지 않습니다. 필드 주입과 세터 주입, 같은 타입의 빈을 List로 모두 받는 방법은 다루지 않았습니다.',
});

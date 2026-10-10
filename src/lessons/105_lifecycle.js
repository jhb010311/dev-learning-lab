Lab.register({
  id: 'lifecycle', nav: '빈 생명주기 콜백', cat: '스프링', mode: 'step',
  title: '생성자에서 주입받은 필드를 썼더니 왜 null인가',
  intro: '컨테이너는 빈을 정해진 순서로 다룹니다. 생성자로 객체를 만들고, 의존성을 넣고, 초기화 콜백을 부르고, 쓰다가, 컨테이너가 닫힐 때 소멸 콜백을 부릅니다. 가격표를 미리 읽어 두는 PriceCache 빈으로, 준비 작업을 어디에 두어야 하는지와 콜백이 어떤 순서로 불리는지 확인해 보세요.',
  terms: ['빈 생명주기', '@PostConstruct와 @PreDestroy', 'InitializingBean과 DisposableBean', '생성자 주입, 세터 주입, 필드 주입', '@Configuration과 @Bean'],
  controls: [
    { id: 'inj', label: 'PriceRepository를 받는 방법', type: 'select', value: 'field', options: [['field', '필드 주입 (@Autowired)'], ['ctor', '생성자 주입']] },
    { id: 'cb', label: '가격표를 읽고(초기화) 비우는(정리) 곳', type: 'select', value: 'ctor', options: [['ctor', '생성자 안에서 읽는다 (콜백 없음)'], ['anno', '@PostConstruct와 @PreDestroy'], ['iface', 'InitializingBean과 DisposableBean'], ['method', '@Bean의 initMethod와 destroyMethod'], ['all', '세 가지 콜백을 모두 쓴다']] },
    { id: 'scope', label: 'PriceCache 빈의 스코프', type: 'select', value: 'singleton', options: [['singleton', '싱글톤'], ['prototype', '프로토타입']] },
  ],
  presets: [
    { t: '처음 설정으로', d: '필드 주입인데 생성자 안에서 repository를 씁니다. 기동이 실패합니다.', v: { inj: 'field', cb: 'ctor', scope: 'singleton' } },
    { t: '@PostConstruct로 옮기면', d: '주입이 끝난 뒤에 불리므로 repository를 쓸 수 있습니다.', v: { inj: 'field', cb: 'anno', scope: 'singleton' } },
    { t: '생성자 주입이면', d: '생성자 안에서 이미 repository가 들어 있습니다.', v: { inj: 'ctor', cb: 'ctor', scope: 'singleton' } },
    { t: '세 가지 콜백을 모두 쓰면', d: '어느 것이 먼저 불리는지 순서를 봅니다.', v: { inj: 'field', cb: 'all', scope: 'singleton' } },
    { t: '@Bean의 initMethod', d: '클래스에 애너테이션을 붙이지 않고 설정 쪽에서 메서드 이름을 지정합니다.', v: { inj: 'field', cb: 'method', scope: 'singleton' } },
    { t: '프로토타입 빈이면', d: '초기화 콜백은 불리지만 소멸 콜백은 불리지 않습니다.', v: { inj: 'field', cb: 'anno', scope: 'prototype' } },
    { t: 'InitializingBean과 DisposableBean', d: '스프링의 인터페이스를 구현하는 방법입니다.', v: { inj: 'field', cb: 'iface', scope: 'singleton' } },
  ],
  // 설정에서 정해지는 콜백 목록: [기록용 이름, 표에 적는 이름, 문장에 쓰는 이름]
  callbacks: function (c) {
    var anno = c.cb === 'anno' || c.cb === 'all', iface = c.cb === 'iface' || c.cb === 'all', bean = c.cb === 'method' || c.cb === 'all', inits = [], dests = [];
    if (anno) { inits.push(['PostConstruct', '@PostConstruct', '@PostConstruct가 붙은 load() 메서드']); dests.push(['PreDestroy', '@PreDestroy', '@PreDestroy가 붙은 clear() 메서드']); }
    if (iface) { inits.push(['afterPropertiesSet', 'afterPropertiesSet()', 'InitializingBean의 afterPropertiesSet() 메서드']); dests.push(['destroy', 'destroy()', 'DisposableBean의 destroy() 메서드']); }
    if (bean) { inits.push(['init', 'init()', '@Bean의 initMethod로 지정한 init() 메서드']); dests.push(['close', 'close()', '@Bean의 destroyMethod로 지정한 close() 메서드']); }
    return { anno: anno, iface: iface, bean: bean, inits: inits, dests: dests };
  },
  code: function (c) {
    var k = this.callbacks(c), field = c.inj === 'field', proto = c.scope === 'prototype';
    var load = '        prices = repository.findAll();        // 가격표를 미리 읽어 둔다\n', clear = '        prices.clear();\n';
    var s = (k.bean ? '' : '@Component\n' + (proto ? '@Scope("prototype")\n' : '')) + 'class PriceCache' + (k.iface ? ' implements InitializingBean, DisposableBean' : '') + ' {\n';
    s += field ? '    @Autowired\n    private PriceRepository repository;\n' : '    private final PriceRepository repository;\n';
    s += '    private Map<String, Integer> prices;\n\n';
    s += field ? '    PriceCache() {\n' : '    PriceCache(PriceRepository repository) {\n        this.repository = repository;\n';
    s += '        System.out.println("생성자: repository = " + this.repository);\n';
    if (c.cb === 'ctor') s += '        prices = this.repository.findAll();   // 가격표를 미리 읽어 둔다\n';
    s += '    }\n';
    if (k.anno) s += '\n    @PostConstruct\n    void load() {\n        System.out.println("@PostConstruct");\n' + load + '    }\n';
    if (k.iface) s += '\n    @Override\n    public void afterPropertiesSet() {\n        System.out.println("afterPropertiesSet");\n' + (k.anno ? '' : load) + '    }\n';
    if (k.bean) s += '\n    public void init() {\n        System.out.println("init");\n' + (k.anno || k.iface ? '' : load) + '    }\n';
    s += '\n    int price(String name) {\n        return prices.get(name);\n    }\n';
    if (k.anno) s += '\n    @PreDestroy\n    void clear() {\n        System.out.println("@PreDestroy");\n' + clear + '    }\n';
    if (k.iface) s += '\n    @Override\n    public void destroy() {\n        System.out.println("destroy");\n' + (k.anno ? '' : clear) + '    }\n';
    if (k.bean) s += '\n    public void close() {\n        System.out.println("close");\n' + (k.anno || k.iface ? '' : clear) + '    }\n';
    s += '}';
    var out = [s];
    if (k.bean) out.push('@Configuration\nclass AppConfig {\n    @Bean(initMethod = "init", destroyMethod = "close")\n' + (proto ? '    @Scope("prototype")\n' : '') + (field ? '    PriceCache priceCache() {\n        return new PriceCache();\n    }\n' : '    PriceCache priceCache(PriceRepository repository) {\n        return new PriceCache(repository);\n    }\n') + '}');
    out.push('@Component\nclass PriceRepository {\n    Map<String, Integer> findAll() {\n        return new HashMap<>(Map.of("사과", 1000));\n    }\n}');
    out.push('// 쓰는 곳\nPriceCache priceCache = context.getBean(PriceCache.class);\nint price = priceCache.price("사과");\ncontext.close();                              // 컨테이너를 닫는다');
    return out.join('\n\n');
  },
  label: function (c) { return (c.inj === 'field' ? '필드 주입' : '생성자 주입') + ' · ' + { ctor: '생성자에서 초기화', anno: '@PostConstruct', iface: 'InitializingBean', method: 'initMethod', all: '콜백 세 가지' }[c.cb] + (c.scope === 'prototype' ? ' · 프로토타입' : ''); },
  columns: ['결과', '생성자 안에서 본 repository', '초기화 콜백이 불린 순서', '소멸 콜백이 불린 순서'],
  simulate: function (c) {
    var k = this.callbacks(c), field = c.inj === 'field', proto = c.scope === 'prototype', inCtor = c.cb === 'ctor', ev = [], sum = [], seq = [];
    var st = { cur: '', stage: { ctor: '', inject: '', init: '', use: '', destroy: '' }, bad: '', obj: false, repo: '', prices: '', log: [], phase: '기동 중', result: '' };
    function push(s, kind) { ev.push({ s: s, k: kind, snap: JSON.parse(JSON.stringify(st)) }); }
    function mark(tok, word) { seq.push(tok); st.log.push(word); }
    var failed = '', chain = [], price = '-';
    // 컨테이너가 PriceCache 객체 하나를 만들어 초기화까지 마치는 과정. 실패하면 false
    function create() {
      st.cur = 'ctor'; st.obj = true;
      var how = k.bean ? (field ? '컨테이너가 AppConfig의 priceCache() 메서드를 호출하고, 그 안의 new PriceCache()가 생성자를 실행합니다.' : '컨테이너가 PriceRepository 빈을 인자로 넘기며 AppConfig의 priceCache(repository) 메서드를 호출하고, 그 안의 new PriceCache(repository)가 생성자를 실행합니다.') : (field ? '컨테이너가 PriceCache의 생성자를 호출해 객체를 만듭니다.' : '컨테이너가 PriceRepository 빈을 인자로 넘기며 PriceCache의 생성자를 호출합니다.');
      if (field) {
        st.repo = 'null'; st.stage.ctor = 'repository = null'; mark('ctor:null', '생성자 (repository = null)');
        push('생성자: ' + how + ' 필드 주입은 객체가 만들어진 뒤에 이루어지므로, 생성자 안에서 본 repository는 아직 null입니다.', inCtor ? 'bad' : '');
        if (inCtor) {
          failed = 'NullPointerException'; chain = ['BeanCreationException', 'BeanInstantiationException', 'NullPointerException']; st.bad = 'ctor'; st.stage.ctor = 'NullPointerException'; st.obj = false;
          push('생성자 안의 this.repository.findAll(): repository가 null이므로 NullPointerException이 발생합니다. 생성자가 끝나지 못해 객체가 만들어지지 않았고, ' + (proto ? 'getBean이 예외를 던집니다.' : '컨테이너는 기동을 중단합니다.'), 'bad');
          return false;
        }
        st.cur = 'inject'; st.repo = '주입됨'; st.stage.inject = '필드에 넣음';
        push('의존성 주입: 컨테이너가 @Autowired가 붙은 repository 필드에 PriceRepository 빈을 넣습니다. 이제부터 repository를 쓸 수 있습니다.', '');
      } else {
        st.repo = '주입됨'; st.stage.ctor = 'repository를 인자로 받음'; st.stage.inject = '생성자에서 함께 끝남'; mark('ctor:set', '생성자 (repository 있음)');
        push('생성자: ' + how + ' 생성자 주입에서는 객체를 만드는 일과 의존성을 넣는 일이 한 번에 이루어지므로, 생성자 안에서 repository가 이미 들어 있습니다.', 'good');
        if (inCtor) { st.prices = '읽어 둠'; push('생성자 안의 this.repository.findAll(): repository가 들어 있으므로 가격표를 읽어 prices에 담아 둡니다.', 'good'); }
      }
      st.cur = 'init';
      if (!k.inits.length) { st.stage.init = '콜백 없음'; return true; }
      k.inits.forEach(function (cbk, i) {
        mark(cbk[0] + ':set', cbk[1]); st.stage.init = k.inits.slice(0, i + 1).map(function (x) { return x[1]; }).join(' → ');
        if (i === 0) { st.prices = '읽어 둠'; push('초기화 콜백: 컨테이너가 ' + cbk[2] + '를 부릅니다. 의존성 주입이 끝난 뒤에 불리므로 repository를 쓸 수 있습니다. 가격표를 읽어 prices에 담아 둡니다.', 'good'); }
        else push('초기화 콜백: 이어서 ' + cbk[2] + '를 부릅니다.' + (i === 1 ? ' 애너테이션으로 표시한 것이 먼저, 그다음이 인터페이스의 메서드입니다.' : ' @Bean에 이름으로 지정한 메서드가 가장 나중입니다.'), '');
      });
      return true;
    }
    var name = proto ? '프로토타입' : '싱글톤', done = true;
    push('컨테이너 시작: priceRepository와 priceCache 두 빈을 등록합니다. priceCache의 스코프는 ' + name + '입니다.' + (proto ? '' : ' 싱글톤 빈은 기동하는 동안 만들어집니다.'), '');
    if (!proto) {
      done = create();
      if (!done) {
        st.result = '기동 실패'; st.phase = '기동 실패';
        sum.push('기동 실패: NullPointerException. 생성자가 불리는 시점에는 @Autowired 필드가 아직 채워지지 않았습니다.');
      } else {
        st.cur = ''; st.phase = '기동 완료'; mark('STARTED', '기동 완료');
        push('기동이 끝났습니다. PriceCache 빈은 초기화까지 마친 상태로 컨테이너 안에 있습니다.', '');
      }
    } else {
      st.phase = '기동 완료'; mark('STARTED', '기동 완료');
      push('기동이 끝났습니다. 프로토타입 빈은 누군가 달라고 할 때 만들어지므로, PriceCache 객체는 아직 없습니다.', '');
      push('context.getBean(PriceCache.class): 컨테이너가 지금 PriceCache 객체를 새로 만들기 시작합니다.', '');
      done = create();
      if (!done) { st.result = '빈을 꺼낼 때 실패'; sum.push('기동은 성공했지만 빈을 꺼낼 때 실패: NullPointerException. 프로토타입 빈은 기동할 때 만들지 않으므로, 같은 오류가 기동 시점이 아니라 처음 꺼내 쓸 때 드러납니다.'); }
    }
    if (done) {
      st.cur = 'use'; st.stage.use = 'price("사과") = 1000'; price = '1000'; mark('USE', '사용');
      push((proto ? '초기화까지 끝난 객체를 돌려받았습니다. ' : 'context.getBean(PriceCache.class)로 빈을 꺼냅니다. ') + 'priceCache.price("사과"): 미리 읽어 둔 가격표에서 1000을 돌려줍니다.', 'good');
    }
    if (done || proto) {
      st.cur = 'destroy'; st.phase = '종료 중'; mark('CLOSING', '컨테이너 종료 시작');
      if (!done) { st.cur = ''; push('context.close(): 컨테이너가 닫힙니다. 만들어진 PriceCache 객체가 없으므로 불릴 것이 없습니다.', ''); }
      else if (!k.dests.length) { st.stage.destroy = '콜백 없음'; push('context.close(): 컨테이너가 닫힙니다. PriceCache에 소멸 콜백을 정해 두지 않았으므로 불리는 것이 없습니다.', ''); }
      else if (proto) {
        st.stage.destroy = '불리지 않음'; st.bad = 'destroy';
        push('context.close(): 컨테이너가 닫힙니다. 컨테이너는 프로토타입 빈을 만들어 초기화한 뒤 건네주고 나면 더 관리하지 않습니다. 그래서 소멸 콜백(' + k.dests.map(function (x) { return x[1]; }).join(', ') + ')을 정해 두었어도 불리지 않습니다.', 'bad');
      } else {
        k.dests.forEach(function (cbk, i) {
          mark(cbk[0] + ':set', cbk[1]); st.stage.destroy = k.dests.slice(0, i + 1).map(function (x) { return x[1]; }).join(' → ');
          if (i === 0) { st.prices = '비움'; push('context.close(): 컨테이너가 닫히면서 소멸 콜백인 ' + cbk[2] + '를 부릅니다. 가격표를 비웁니다.', 'good'); }
          else push('소멸 콜백: 이어서 ' + cbk[2] + '를 부릅니다. 초기화 때와 같은 순서입니다.', '');
        });
      }
      st.cur = ''; st.phase = '종료'; if (done) st.result = '성공';
    }
    var initCol = !k.inits.length || !done ? '콜백 없음' : k.inits.map(function (x) { return x[1]; }).join(' → ');
    var destCol = !k.dests.length || !done ? '콜백 없음' : proto ? '불리지 않음' : k.dests.map(function (x) { return x[1]; }).join(' → ');
    if (done) {
      sum.push('성공. 불린 순서는 생성자 → ' + (field ? '의존성 주입 → ' : '') + (k.inits.length ? k.inits.map(function (x) { return x[1]; }).join(' → ') + ' → ' : '') + '사용' + (destCol !== '콜백 없음' && !proto ? ' → ' + destCol : '') + '입니다.' + (proto && k.dests.length ? ' 소멸 콜백은 불리지 않았습니다.' : ''));
      if (field) sum.push('필드 주입에서는 객체를 먼저 만들고 그 뒤에 필드를 채웁니다. 그래서 생성자 안에서는 주입받을 필드가 null입니다. 주입받은 것을 쓰는 준비 작업은 생성자가 아니라 초기화 콜백에 둡니다.');
      else sum.push('생성자 주입에서는 생성자 안에서 의존성을 바로 쓸 수 있습니다.' + (inCtor ? ' 이 설정에는 소멸 콜백을 두지 않았으므로 컨테이너가 닫힐 때 불리는 것이 없습니다.' : ' 초기화 콜백은 생성자 다음에 불립니다.'));
      if (c.cb === 'anno') sum.push('@PostConstruct와 @PreDestroy는 메서드에 붙이기만 하면 됩니다. 스프링의 인터페이스를 구현하지 않아도 되며, 스프링 공식 문서가 권하는 방법입니다.');
      if (c.cb === 'iface') sum.push('InitializingBean과 DisposableBean은 스프링의 인터페이스입니다. 메서드 이름이 정해져 있고, 클래스가 스프링 인터페이스를 구현해야 합니다.');
      if (c.cb === 'method') sum.push('@Bean의 initMethod와 destroyMethod는 설정 쪽에서 메서드 이름을 지정합니다. 클래스에는 스프링과 관련된 것을 적지 않아도 되므로, 소스를 고칠 수 없는 라이브러리의 객체에도 쓸 수 있습니다.');
      if (c.cb === 'all') sum.push('세 가지를 모두 쓰면 초기화는 @PostConstruct → afterPropertiesSet() → initMethod, 소멸은 @PreDestroy → destroy() → destroyMethod 순서로 불립니다. 보통은 한 가지만 골라 씁니다.');
      if (proto && k.dests.length) sum.push('프로토타입 빈은 컨테이너가 만들고 초기화까지만 해 줍니다. 건네준 뒤에는 기억하지 않으므로 컨테이너가 닫혀도 소멸 콜백을 부르지 않습니다. 정리할 것이 있으면 꺼내 쓴 쪽에서 직접 정리 메서드를 불러야 합니다.');
    } else {
      sum.push('컨테이너는 생성자로 객체를 만든 다음에 @Autowired 필드를 채웁니다. 생성자 안에서 그 필드를 쓰면 null입니다.');
      sum.push('고치는 방법은 두 가지입니다. 준비 작업을 @PostConstruct 같은 초기화 콜백으로 옮기거나, 생성자 주입으로 바꿔 생성자의 인자로 받습니다.');
    }
    var res = done ? '성공' : proto ? '기동은 성공, 빈을 꺼낼 때 실패: NullPointerException' : '기동 실패: NullPointerException';
    return { events: ev, summary: sum, seq: seq, price: price, chain: chain, row: [res, field ? 'null' : '주입돼 있음', initCol, destCol] };
  },
  render: function (v, sim, t, H, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : null;
    if (!s) { H.text(v, '실행을 누르면 컨테이너가 뜨고, 빈을 한 번 쓴 뒤 컨테이너를 닫습니다.'); return; }
    var names = [['ctor', '1. 생성자'], ['inject', '2. 의존성 주입'], ['init', '3. 초기화 콜백'], ['use', '4. 사용'], ['destroy', '5. 소멸 콜백']];
    H.table(v, ['단계', '일어난 일'], names.map(function (n) {
      var x = s.stage[n[0]];
      return { cells: [{ v: n[1], cls: s.cur === n[0] ? 'hot' : '' }, { v: x || '아직', cls: s.bad === n[0] ? 'bad' : x && x !== '콜백 없음' ? 'good' : '' }] };
    }), 'PriceCache 빈의 생명주기');
    H.title(v, '불린 순서');
    H.slots(v, s.log.map(function (w, i) { return [w, w === '기동 완료' || w === '컨테이너 종료 시작' ? 'q' : i === s.log.length - 1 ? 'b' : 'd']; }), '아직 없음');
    H.counters(v, [[s.repo || '-', 'repository 필드'], [s.prices || '없음', '가격표(prices)'], [s.result || s.phase, '상태']]);
  },
  // 그림: 왼쪽에 생명주기의 다섯 단계를 위에서 아래로, 오른쪽에 컨테이너 안의 PriceRepository 빈과 PriceCache 객체. 지금 단계가 굵은 테두리로 표시된다.
  draw: function (P, sim, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : { cur: '', stage: { ctor: '', inject: '', init: '', use: '', destroy: '' }, bad: '', obj: false, repo: '', prices: '', log: [], phase: '', result: '' };
    var proto = sim.c.scope === 'prototype', names = [['ctor', '1. 생성자'], ['inject', '2. 의존성 주입'], ['init', '3. 초기화 콜백'], ['use', '4. 사용'], ['destroy', '5. 소멸 콜백']];
    P.size(680, 342);
    names.forEach(function (n, i) {
      var x = s.stage[n[0]];
      P.box('s_' + n[0], 16, 16 + i * 54, 364, 46, { cls: (s.bad === n[0] ? 'bad' : !x ? (s.cur === n[0] ? 'hot' : 'ghost') : x === '콜백 없음' ? 'plain' : 'good') + (s.cur === n[0] ? ' now' : ''), title: n[1], sub: x || (s.cur === n[0] ? '진행 중' : '아직') });
      if (i) P.arrow('ar' + i, 's_' + names[i - 1][0] + ':b', 's_' + n[0] + ':t', { cls: 'mut' });
    });
    P.region('ctx', 396, 16, 268, 262, '스프링 컨테이너');
    P.box('repo', 408, 50, 244, 46, { cls: 'wait', title: 'priceRepository 빈', sub: '싱글톤' });
    P.box('cache', 408, 162, 244, 86, { cls: s.bad === 'ctor' ? 'bad' : !s.obj ? 'ghost' : s.prices === '읽어 둠' ? 'good' : 'hot', title: 'PriceCache 객체' + (proto ? ' (프로토타입)' : ''), sub: s.bad === 'ctor' ? ['만들어지지 못함'] : s.obj ? ['repository 필드: ' + s.repo, 'prices: ' + (s.prices || '없음')] : ['아직 없음'] });
    if (s.obj && s.repo === '주입됨') P.arrow('inj', 'repo:b', 'cache:t', { cls: 'good', label: '주입' });
    if (s.obj && s.repo === 'null') P.arrow('inj', 'repo:b', 'cache:t', { cls: 'dash mut', label: '아직 주입 전' });
    P.box('r1', 16, 292, 648, 36, { cls: !s.result ? 'ghost' : s.result === '성공' ? 'good' : 'bad', title: '상태', right: s.result ? (s.result === '성공' ? '성공' : s.result + ': NullPointerException') : s.phase || '시작 전' });
    P.note('컨테이너는 빈 하나를 위에서 아래 순서로 다룹니다. 필드 주입에서는 1번과 2번 사이에 repository가 null인 구간이 있습니다. 프로토타입 빈은 4번까지만 컨테이너가 맡고, 5번은 불리지 않습니다.');
  },
  assume: '스무 가지 조합을 이 PC의 스프링 부트 4.1.1(스프링 프레임워크 7.0.9, jakarta.annotation-api 3.0.0)에서 실행해 대조했습니다. 조합마다 화면과 같은 구조의 소스를 컴파일해 컨테이너를 띄우고, 빈을 꺼내 price("사과")를 한 번 부른 뒤 컨테이너를 닫으면서, 생성자와 각 콜백이 불린 순서와 그때 repository 필드가 null이었는지를 기록해 모형의 순서와 하나하나 비교했습니다. 기동 실패의 예외 사슬은 BeanCreationException → BeanInstantiationException → NullPointerException이었고, 화면에는 맨 안쪽 원인을 적었습니다. 화면에서 단순화한 것: "의존성 주입" 단계는 따로 기록할 수 없어, 생성자에서는 null이고 초기화 콜백에서는 들어 있었다는 것으로 그 사이에 주입이 일어났음을 확인했습니다. 세터 주입과, 컨테이너가 닫힐 때 여러 빈 사이의 소멸 순서는 다루지 않았습니다. @Bean에 destroyMethod를 적지 않아도 public close() 메서드가 있으면 컨테이너가 닫힐 때 불리는 것(프로토타입이면 불리지 않는 것)도 실행으로 확인했습니다. 실행으로 확인하지 않고 스프링 공식 문서의 설명을 따른 것은 두 가지입니다: @PostConstruct와 @PreDestroy가 권장되는 방법이라는 것, 프로세스가 강제로 종료되면 컨테이너가 닫히지 못해 소멸 콜백이 불리지 않는다는 것.',
});

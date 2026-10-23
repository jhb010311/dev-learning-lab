Lab.register({
  id: 'annot', nav: '애너테이션', cat: '자바 언어', mode: 'step',
  title: '@를 붙이기만 하면 정말 무슨 일이 일어나나',
  why: '애너테이션이 없을 때는 "이 메서드는 트랜잭션으로 묶는다", "이 메서드는 테스트다" 같은 정보를 XML 설정 파일처럼 코드와 떨어진 곳에 적거나, test로 시작하는 메서드 이름 같은 규칙으로 나타냈다. 코드를 고칠 때 떨어진 설정을 함께 고치기 어려웠다. 애너테이션은 그 정보를 해당 클래스·메서드 바로 위에 적어 두고, 컴파일러나 프레임워크가 읽어 가게 한다.',
  use: '스프링의 @Transactional, @Component, @GetMapping, JPA의 @Entity, JUnit의 @Test는 프레임워크가 실행 중에 리플렉션으로 읽는다. 자바의 @Override, @FunctionalInterface, @Deprecated는 컴파일러가 읽어 오류나 경고를 낸다. 이런 애너테이션의 선언에는 @Retention과 @Target이 붙어 있어, 표시를 어디까지 남길지와 어디에 붙일 수 있는지가 정해져 있다.',
  intro: '애너테이션(@Transactional, @Test, @Override처럼 @로 시작하는 표시)은 코드에 붙여 두는 표시입니다. 표시 자체는 아무 일도 하지 않습니다. 읽는 쪽이 있어야 의미가 생기고, 읽는 쪽은 크게 둘입니다. 컴파일러(@Override, @FunctionalInterface, @Deprecated)와, 실행 중에 리플렉션으로 읽는 프레임워크(스프링의 @Transactional, JUnit의 @Test)입니다. 애너테이션마다 그 선언에 붙은 @Retention이 표시를 소스 코드까지만(SOURCE), class 파일까지(CLASS), 실행 중까지(RUNTIME) 중 어디까지 남길지 정하고, 그래서 누가 읽을 수 있는지도 정해집니다.',
  terms: ['애너테이션', '리플렉션', '@Retention과 @Target', '@Transactional', '프록시(Proxy)', '@Test', '@Override', '@Deprecated', '@FunctionalInterface'],
  controls: [
    { id: 'topic', label: '무엇을 볼까', type: 'select', value: 'tx', options: [['tx', '스프링 @Transactional: 스프링이 실행 중에 읽음'], ['test', 'JUnit @Test: JUnit이 실행 중에 읽음'], ['retention', '유지 정책 SOURCE·CLASS·RUNTIME 견주기'], ['override', '@Override: 컴파일러가 읽음'], ['deprecated', '@Deprecated: 컴파일러가 class 파일에서 읽음'], ['funcif', '@FunctionalInterface: 컴파일러가 읽음'], ['custom', '직접 만든 애너테이션 @Timed']] },
    { id: 'txAnn', label: 'order()에 @Transactional을 붙였다', type: 'check', value: true, show: function (c) { return c.topic === 'tx'; } },
    { id: 'enable', label: '설정 클래스에 @EnableTransactionManagement를 붙였다', type: 'check', value: true, show: function (c) { return c.topic === 'tx'; } },
    { id: 'get', label: 'service를 얻는 방법', type: 'select', value: 'bean', options: [['bean', 'ctx.getBean으로 스프링에게서 받음'], ['new', 'new OrderService()로 직접 만듦']], show: function (c) { return c.topic === 'tx'; } },
    { id: 'sub', label: 'subtracts()에도 @Test를 붙였다', type: 'check', value: false, show: function (c) { return c.topic === 'test'; } },
    { id: 'misplace', label: '@Transactional을 필드에도 붙였다', type: 'check', value: false, show: function (c) { return c.topic === 'retention'; } },
    { id: 'typo', label: '재정의하려는 메서드의 이름을 잘못 적었다 (sound → sount)', type: 'check', value: true, show: function (c) { return c.topic === 'override'; } },
    { id: 'ov', label: '그 메서드에 @Override를 붙였다', type: 'check', value: false, show: function (c) { return c.topic === 'override'; } },
    { id: 'old', label: 'Integer.valueOf(5) 대신 new Integer(5)를 쓴다', type: 'check', value: true, show: function (c) { return c.topic === 'deprecated'; } },
    { id: 'fi', label: 'PriceRule에 @FunctionalInterface를 붙였다', type: 'check', value: true, show: function (c) { return c.topic === 'funcif'; } },
    { id: 'two', label: 'PriceRule에 추상 메서드 undo를 하나 더 선언했다', type: 'check', value: false, show: function (c) { return c.topic === 'funcif'; } },
    { id: 'ret', label: '@Timed의 @Retention', type: 'select', value: 'none', options: [['none', '적지 않음'], ['RUNTIME', 'RUNTIME: 실행 중까지']], show: function (c) { return c.topic === 'custom'; } },
  ],
  presets: [
    { t: '처음 설정으로', q: '@Transactional을 붙인 order()를 스프링에게서 받은 객체로 호출하면 무슨 일이 일어나나', d: '스프링이 표시를 읽고 프록시를 만들어 두었기 때문에, order()가 트랜잭션 안에서 실행됩니다.', v: { topic: 'tx', txAnn: true, enable: true, get: 'bean', sub: false, misplace: false, typo: true, ov: false, old: true, fi: true, two: false, ret: 'none' } },
    { t: 'new로 직접 만들면', q: '같은 OrderService를 스프링에게서 받지 않고 new로 직접 만들어 order()를 호출하면', d: '표시는 실행 중에도 보이지만, 그것을 읽고 일을 하는 스프링을 거치지 않아 트랜잭션이 없습니다.', v: { topic: 'tx', txAnn: true, enable: true, get: 'new', sub: false, misplace: false, typo: true, ov: false, old: true, fi: true, two: false, ret: 'none' } },
    { t: '읽는 쪽을 등록하지 않으면', q: '설정 클래스에서 @EnableTransactionManagement를 빼면', d: '@Transactional을 읽어 프록시를 만드는 부품이 등록되지 않습니다. 스프링에게서 받은 객체도 OrderService 그대로이고 트랜잭션이 없습니다.', v: { topic: 'tx', txAnn: true, enable: false, get: 'bean', sub: false, misplace: false, typo: true, ov: false, old: true, fi: true, two: false, ret: 'none' } },
    { t: 'JUnit이 찾는 메서드', q: 'JUnit으로 CalcTest를 실행할 때, @Test를 붙이지 않은 subtracts()는 어떻게 되나', d: 'JUnit은 리플렉션으로 @Test가 붙은 메서드만 찾아 실행합니다. subtracts()는 불리지 않고, 오류도 없습니다.', v: { topic: 'test', txAnn: true, enable: true, get: 'bean', sub: false, misplace: false, typo: true, ov: false, old: true, fi: true, two: false, ret: 'none' } },
    { t: '유지 정책 세 가지', q: '@Override(SOURCE), 스프링의 @Contract(CLASS), @Transactional(RUNTIME)을 붙인 메서드를 실행 중에 리플렉션으로 읽으면', d: '실행 중에 보이는 것은 RUNTIME인 @Transactional뿐입니다. @Contract는 class 파일에는 남지만 리플렉션에는 보이지 않습니다.', v: { topic: 'retention', txAnn: true, enable: true, get: 'bean', sub: false, misplace: false, typo: true, ov: false, old: true, fi: true, two: false, ret: 'none' } },
    { t: '@Target이 막는다', q: '클래스와 메서드에만 붙일 수 있는 @Transactional을 필드에 붙이면', d: '컴파일 오류입니다. 컴파일러가 @Transactional의 선언에 적힌 @Target을 읽고 막습니다.', v: { topic: 'retention', txAnn: true, enable: true, get: 'bean', sub: false, misplace: true, typo: true, ov: false, old: true, fi: true, two: false, ret: 'none' } },
    { t: '@Override가 잡아 준다', q: '재정의하려는 메서드의 이름을 sount로 잘못 적은 채 그 메서드에 @Override를 붙이면', d: '컴파일러가 오류로 알려 줍니다. @Override를 떼면 오류 없이 컴파일되고 부모의 메서드가 대신 실행됩니다.', v: { topic: 'override', txAnn: true, enable: true, get: 'bean', sub: false, misplace: false, typo: true, ov: true, old: true, fi: true, two: false, ret: 'none' } },
    { t: '지울 예정인 생성자', q: 'Integer.valueOf(5) 대신 new Integer(5)를 쓰면', d: '컴파일러가 Integer.class에 남아 있는 @Deprecated(forRemoval = true)를 읽고 경고합니다. 컴파일은 됩니다.', v: { topic: 'deprecated', txAnn: true, enable: true, get: 'bean', sub: false, misplace: false, typo: true, ov: false, old: true, fi: true, two: false, ret: 'none' } },
    { t: '추상 메서드가 둘이면', q: '@FunctionalInterface를 붙인 PriceRule에 추상 메서드를 하나 더 선언하면', d: '람다로 쓸 수 없는 인터페이스가 되었다는 것을, 컴파일러가 선언한 자리에서 오류로 알립니다.', v: { topic: 'funcif', txAnn: true, enable: true, get: 'bean', sub: false, misplace: false, typo: true, ov: false, old: true, fi: true, two: true, ret: 'none' } },
    { t: '직접 만든 애너테이션', q: '애너테이션 @Timed를 직접 만들어 @Retention 없이 메서드에 붙이고, 리플렉션으로 읽으면', d: '@Retention을 적지 않으면 CLASS가 되어 실행 중에는 보이지 않습니다. 실행 중에 읽으려면 RUNTIME을 적어야 합니다.', v: { topic: 'custom', txAnn: true, enable: true, get: 'bean', sub: false, misplace: false, typo: true, ov: false, old: true, fi: true, two: false, ret: 'none' } },
  ],
  // 화면의 코드: [선언 부분, main 안의 부분]. 선언이 없는 주제는 첫 칸이 빈 글이다
  parts: function (c) {
    var MAIN = '// 여기부터는 main 안의 코드 (Main 클래스·main 선언과 import는 생략)\n';
    if (c.topic === 'tx') {
      return ['// AppConfig와 OrderService는 예시로 만든 클래스다\n// 애너테이션들과 DriverManagerDataSource 같은 클래스는 스프링이 주는 것이다\n@Configuration\n' + (c.enable ? '@EnableTransactionManagement\n' : '') + 'class AppConfig {\n    @Bean\n    DataSource dataSource() {\n        return new DriverManagerDataSource("jdbc:h2:mem:annot");\n    }\n\n    @Bean\n    PlatformTransactionManager transactionManager(DataSource dataSource) {\n        return new DataSourceTransactionManager(dataSource);\n    }\n\n    @Bean\n    OrderService orderService() {\n        return new OrderService();\n    }\n}\n\nclass OrderService {\n' + (c.txAnn ? '    @Transactional\n' : '') + '    public void order() {\n        boolean inTx = TransactionSynchronizationManager.isActualTransactionActive();\n        System.out.println("order 실행, 트랜잭션 안인가: " + inTx);\n    }\n}',
        MAIN + 'try (AnnotationConfigApplicationContext ctx = new AnnotationConfigApplicationContext(AppConfig.class)) {\n    Method order = OrderService.class.getMethod("order");\n    System.out.println("@Transactional이 보이는가: " + order.isAnnotationPresent(Transactional.class));\n' + (c.get === 'bean' ? '    OrderService service = ctx.getBean(OrderService.class);\n' : '    OrderService service = new OrderService(); // 스프링을 거치지 않고 직접 만든다\n') + '    System.out.println("service의 클래스: " + service.getClass().getSimpleName());\n    service.order();\n}'];
    }
    if (c.topic === 'test') {
      return ['import static org.junit.jupiter.api.Assertions.assertEquals;\n\nimport org.junit.jupiter.api.Test;\n\n// CalcTest는 예시로 만든 테스트 클래스다. @Test와 assertEquals는 JUnit이 주는 것이다\nclass CalcTest {\n    @Test\n    void adds() {\n        System.out.println("adds 실행");\n        assertEquals(5, 2 + 3);\n    }\n\n' + (c.sub ? '    @Test\n' : '') + '    void subtracts() {\n        System.out.println("subtracts 실행");\n        assertEquals(1, 3 - 2);\n    }\n}',
        '// 이 클래스에는 main이 없다. IDE의 테스트 실행 버튼이나 gradle test가 JUnit에게 CalcTest를 넘겨 실행한다'];
    }
    if (c.topic === 'retention') {
      return ['// PriceService는 예시로 만든 클래스다. 붙인 애너테이션 셋은 자바·스프링이 주는 것이고, 선언에 적힌 유지 정책이 서로 다르다\nclass PriceService {\n' + (c.misplace ? '    @Transactional\n    private int count;\n\n' : '') + '    @Override                  // 자바: 선언에 @Retention(RetentionPolicy.SOURCE)\n    public String toString() {\n        return "PriceService";\n    }\n\n    @Contract("null -> fail")  // 스프링: 선언에 @Retention이 없음, 그래서 기본값 CLASS\n    public int round(Integer price) {\n        return price / 100 * 100;\n    }\n\n    @Transactional             // 스프링: 선언에 @Retention(RetentionPolicy.RUNTIME)\n    public void save() {\n    }\n}',
        MAIN + 'Method[] methods = {\n    PriceService.class.getMethod("toString"),\n    PriceService.class.getMethod("round", Integer.class),\n    PriceService.class.getMethod("save")\n};\nfor (Method m : methods) {\n    List<String> names = new ArrayList<>();\n    for (Annotation a : m.getDeclaredAnnotations()) {\n        names.add("@" + a.annotationType().getSimpleName());\n    }\n    System.out.println(m.getName() + ": " + names);\n}'];
    }
    if (c.topic === 'override') {
      return ['// Animal과 Dog는 예시로 만든 클래스다. @Override는 자바가 주는 애너테이션이다\nclass Animal {\n    String sound() {\n        return "...";\n    }\n}\n\nclass Dog extends Animal {\n' + (c.ov ? '    @Override\n' : '') + '    String ' + (c.typo ? 'sount' : 'sound') + '() {\n        return "멍멍";\n    }\n}',
        MAIN + 'Animal a = new Dog();\nSystem.out.println(a.sound());'];
    }
    if (c.topic === 'deprecated') {
      return ['', MAIN + '// Integer는 자바가 주는 클래스다. 생성자 Integer(int)의 선언에는 @Deprecated(since = "9", forRemoval = true)가 붙어 있다\nInteger a = ' + (c.old ? 'new Integer(5)' : 'Integer.valueOf(5)') + ';\nSystem.out.println(a + 1);'];
    }
    if (c.topic === 'funcif') {
      return ['// PriceRule은 예시로 만든 인터페이스다. @FunctionalInterface는 자바가 주는 애너테이션이다\n' + (c.fi ? '@FunctionalInterface\n' : '') + 'interface PriceRule {\n    int apply(int price);\n' + (c.two ? '    int undo(int price);\n' : '') + '}',
        MAIN + 'PriceRule half = price -> price / 2;\nSystem.out.println(half.apply(1000));'];
    }
    return ['// Timed는 직접 만든 애너테이션이고, Service는 예시로 만든 클래스다\n' + (c.ret === 'RUNTIME' ? '@Retention(RetentionPolicy.RUNTIME)\n' : '') + '@Target(ElementType.METHOD)\n@interface Timed { }\n\nclass Service {\n    @Timed\n    void work() {\n        System.out.println("work 실행");\n    }\n}',
      MAIN + 'Service service = new Service();\nMethod m = Service.class.getDeclaredMethod("work");\nboolean found = m.isAnnotationPresent(Timed.class);\nSystem.out.println("@Timed가 보이는가: " + found);\nif (found) System.out.println("[시간 측정 시작]");\nm.invoke(service);\nif (found) System.out.println("[시간 측정 끝]");'];
  },
  code: function (c) { var p = this.parts(c); return p[0] ? p[0] + '\n\n' + p[1] : p[1]; },
  label: function (c) {
    var t = c.topic;
    if (t === 'tx') return '@Transactional · ' + (c.txAnn ? '붙임' : '붙이지 않음') + ' · @EnableTransactionManagement ' + (c.enable ? '있음' : '없음') + ' · ' + (c.get === 'bean' ? '스프링에게서 받음' : 'new로 만듦');
    if (t === 'test') return 'JUnit @Test · subtracts()에 ' + (c.sub ? '붙임' : '붙이지 않음');
    if (t === 'retention') return '유지 정책 견주기' + (c.misplace ? ' · 필드에도 @Transactional' : '');
    if (t === 'override') return '@Override · ' + (c.typo ? '이름 오타' : '이름 맞음') + ' · ' + (c.ov ? '@Override 붙임' : '@Override 없음');
    if (t === 'deprecated') return '@Deprecated · ' + (c.old ? 'new Integer(5)' : 'Integer.valueOf(5)');
    if (t === 'funcif') return '@FunctionalInterface ' + (c.fi ? '붙임' : '없음') + ' · 추상 메서드 ' + (c.two ? '2개' : '1개');
    return '직접 만든 @Timed · Retention ' + (c.ret === 'none' ? '생략' : c.ret);
  },
  mark: function (c) { return { tx: '@Transactional', test: '@Test', retention: '세 애너테이션', override: '@Override', deprecated: '@Deprecated', funcif: '@FunctionalInterface', custom: '@Timed' }[c.topic]; },
  columns: ['컴파일', '실행 중 리플렉션으로 보이는가', '표시를 읽고 일을 한 쪽', '출력'],
  simulate: function (c) {
    var ev = [], sum = [], t = c.topic;
    // 그림의 상태: 표시가 남은 곳(src, cls, run), 읽는 쪽(cc 컴파일러, fw 실행 중에 읽는 쪽), 컴파일·출력
    var st = { src: '', cls: '?', run: '?', srcOn: true, clsOn: false, runOn: false, cc: '아직', ccK: '', ccAt: 'src', fwT: '실행 중에 읽는 쪽', fw: '없음', fwK: 'ghost', fwOn: false, comp: '?', out: [], end: '?' };
    function push(s, k) { ev.push({ s: s, k: k || '', snap: JSON.parse(JSON.stringify(st)) }); }
    function fin(res) { var l = ev[ev.length - 1].snap; l.end = st.end; l.comp = st.comp; l.res = res; }
    function fail(line, msg, reader) { st.comp = '오류'; st.end = '실행 못 함'; fin('실행 못 함'); return { events: ev, summary: sum, errLine: line, msg: msg, row: ['오류', '(컴파일 안 됨)', reader, '(실행 못 함)'] }; }
    function done(vis, reader, comp, res) { st.end = '정상 종료'; fin(res); return { events: ev, summary: sum, errLine: '', msg: '', row: [comp || '성공', vis, reader, st.out.join(' / ')] }; }

    if (t === 'tx') {
      var ann = !!c.txAnn, en = !!c.enable, bean = c.get === 'bean', proxy = ann && en && bean, made = ann && en;
      st.src = ann ? '붙어 있음' : '붙이지 않음'; st.srcOn = ann; st.fwT = '스프링';
      push('AppConfig와 OrderService는 예시로 만든 클래스입니다. ' + (ann ? 'order() 위에 스프링이 주는 @Transactional을 붙였습니다. @Transactional의 실제 선언(spring-tx 7.0.9)에는 @Target({ElementType.TYPE, ElementType.METHOD})와 @Retention(RetentionPolicy.RUNTIME)이 붙어 있습니다. 클래스와 메서드에 붙일 수 있고, 표시가 실행 중까지 남는다는 뜻입니다.' : 'order()에 @Transactional을 붙이지 않았습니다.'), ann ? '' : 'hot');
      st.cc = '붙일 곳 확인: 통과'; st.ccK = 'good'; st.comp = '성공'; st.cls = ann ? '남음 (RUNTIME)' : '없음'; st.clsOn = ann;
      push('javac가 컴파일합니다: ' + (ann ? '컴파일러는 @Transactional이 메서드에 붙여도 되는 애너테이션인지(@Target)만 확인하고 통과시킵니다. 트랜잭션에 관해서는 아무것도 하지 않습니다. RUNTIME이므로 표시는 OrderService.class의 RuntimeVisibleAnnotations(실행 중에도 보여 주는 칸)에 적힙니다.' : 'OrderService.class가 만들어집니다. order()에는 아무 표시도 없습니다.'), ann ? 'good' : '');
      if (en) {
        push('new AnnotationConfigApplicationContext(AppConfig.class): 스프링 컨테이너가 설정 클래스 AppConfig를 읽습니다. @EnableTransactionManagement가 있으므로, @Transactional을 찾아 트랜잭션을 걸어 줄 부품들이 빈으로 등록됩니다. 빈을 만들 때 프록시가 필요한지 살피는 자동 프록시 생성기(InfrastructureAdvisorAutoProxyCreator)와, @Transactional을 읽는 트랜잭션 어드바이저가 그것입니다.', 'good');
        if (ann) { st.fw = bean ? '표시를 찾아 프록시를 만듦' : '프록시를 만들어 둠'; st.fwK = 'good'; st.fwOn = true; st.runOn = true; st.run = '보임'; }
        else { st.fw = '찾지 못해 그대로 둠'; st.fwK = 'plain'; st.fwOn = true; st.run = '없음'; }
        push(ann ? 'orderService 빈을 만들 때, 스프링이 리플렉션으로 OrderService의 메서드에 붙은 애너테이션을 살핍니다. order()에서 @Transactional을 찾았으므로, OrderService를 상속해 만든 프록시 클래스(OrderService$$SpringCGLIB$$0)의 객체를 빈으로 등록합니다. 프록시는 원래의 OrderService 객체를 참조로 갖고 있다가, 메서드 호출을 받으면 앞뒤에 트랜잭션 일을 하고 원래 객체의 메서드를 부릅니다.' : 'orderService 빈을 만들 때, 스프링이 리플렉션으로 OrderService를 살핍니다. @Transactional이 어디에도 없으므로 프록시를 만들 이유가 없어, OrderService 객체를 그대로 빈으로 등록합니다.', ann ? 'good' : '');
      } else {
        st.fw = '부품이 등록되지 않음'; st.fwK = 'bad'; st.run = ann ? '보임' : '없음'; st.runOn = ann;
        push('new AnnotationConfigApplicationContext(AppConfig.class): 스프링 컨테이너가 AppConfig를 읽습니다. @EnableTransactionManagement가 없으므로, @Transactional을 찾아 프록시를 만드는 부품이 등록되지 않습니다. orderService 빈은 OrderService 객체 그대로 등록됩니다. 표시가 붙어 있어도 그것을 읽는 쪽이 없습니다.', ann ? 'bad' : '');
      }
      st.run = ann ? '보임' : '없음'; st.runOn = ann; st.out.push('@Transactional이 보이는가: ' + ann);
      push('order.isAnnotationPresent(Transactional.class) 실행: 리플렉션으로 order()에 @Transactional이 붙어 있는지 직접 묻습니다. 결과는 ' + ann + '입니다. ' + (ann ? 'RUNTIME이라 표시가 실행 중까지 남아 있습니다. 스프링이 빈을 만들며 한 조사도 같은 리플렉션 정보(getDeclaredAnnotations)를 바탕으로 합니다.' : '붙이지 않았으므로 없습니다.'), ann ? 'good' : '');
      var cls = proxy ? 'OrderService$$SpringCGLIB$$0' : 'OrderService';
      st.out.push('service의 클래스: ' + cls);
      push(bean ? 'ctx.getBean(OrderService.class): 스프링에게서 빈을 받습니다. 받은 객체의 클래스는 ' + (proxy ? 'OrderService$$SpringCGLIB$$0, 곧 스프링이 만든 프록시입니다.' : 'OrderService 그대로입니다. 프록시가 아닙니다.') : 'new OrderService(): 스프링을 거치지 않고 직접 객체를 만듭니다. 클래스는 OrderService 그대로입니다.' + (made ? ' 스프링은 컨테이너의 orderService 빈에 대해서만 프록시를 만들었고, 이렇게 따로 만든 객체는 알지 못합니다.' : ''), proxy ? 'good' : (ann ? 'bad' : ''));
      st.out.push('order 실행, 트랜잭션 안인가: ' + proxy);
      if (proxy) push('service.order() 실행: service는 프록시입니다. 프록시가 먼저 트랜잭션 매니저(DataSourceTransactionManager)로 트랜잭션을 시작하고, 원래 OrderService 객체의 order()를 부릅니다. 그 안에서 isActualTransactionActive()는 true입니다. order()가 끝나면 프록시가 커밋합니다.', 'good');
      else push('service.order() 실행: service는 OrderService 객체 그대로이므로 order()가 바로 실행됩니다. 트랜잭션을 시작한 쪽이 없어 isActualTransactionActive()는 false입니다.' + (ann ? ' 소스 코드에도, class 파일에도, 실행 중에도 표시는 분명히 있습니다. 표시를 읽고 일을 하는 쪽을 거치지 않았을 뿐입니다.' : ''), ann ? 'bad' : '');
      if (proxy) sum.push('@Transactional이 스스로 하는 일은 없습니다. 스프링이 빈을 만들 때 리플렉션으로 이 표시를 찾고, 프록시를 만들어 메서드 앞뒤에 트랜잭션 시작과 커밋을 넣습니다. 표시가 실행 중까지 남도록 @Transactional의 선언에는 @Retention(RetentionPolicy.RUNTIME)이 붙어 있습니다.');
      else if (ann && !en) sum.push('@Transactional을 읽어 프록시를 만드는 부품은 @EnableTransactionManagement가 등록합니다. 그것이 없으면 표시가 있어도 읽는 쪽이 없습니다. 스프링 부트를 쓰면 자동 설정이 이 일을 대신 해 주므로 직접 적지 않아도 됩니다.');
      else if (ann) sum.push('스프링이 표시를 읽고 일을 하는 대상은 스프링이 만든 빈뿐입니다. new로 직접 만든 객체는 표시가 붙어 있어도 프록시를 거치지 않아 트랜잭션이 없습니다.');
      else sum.push('표시가 없으면 스프링이 프록시를 만들 이유가 없습니다. 받은 객체는 OrderService 그대로이고 트랜잭션도 없습니다.');
      return done(ann ? '보임' : '(붙이지 않음)', proxy ? '스프링 (프록시로 트랜잭션)' : '없음', '', proxy ? 'order가 트랜잭션 안에서 실행' : 'order가 트랜잭션 없이 실행');
    }

    if (t === 'test') {
      var both = !!c.sub;
      st.src = both ? '두 메서드에 붙음' : 'adds()에만 붙음'; st.fwT = 'JUnit';
      push('CalcTest는 예시로 만든 테스트 클래스입니다. ' + (both ? 'adds()와 subtracts() 모두에' : 'adds()에만') + ' JUnit이 주는 @Test를 붙였습니다. @Test의 실제 선언(junit-jupiter-api 6.0.3)에는 @Target({ElementType.ANNOTATION_TYPE, ElementType.METHOD})와 @Retention(RetentionPolicy.RUNTIME)이 붙어 있습니다.');
      st.cc = '붙일 곳 확인: 통과'; st.ccK = 'good'; st.comp = '성공'; st.cls = '남음 (RUNTIME)'; st.clsOn = true;
      push('javac가 컴파일합니다: 컴파일러는 @Test를 붙일 수 있는 자리인지만 확인합니다. RUNTIME이므로 표시는 CalcTest.class의 RuntimeVisibleAnnotations에 적힙니다. 이 클래스에는 main이 없어서, 컴파일만으로는 아무것도 실행되지 않습니다.', 'good');
      st.run = '보임'; st.runOn = true; st.fw = '찾은 테스트 ' + (both ? 2 : 1) + '개'; st.fwK = 'good'; st.fwOn = true;
      push('JUnit이 CalcTest 클래스를 받아 테스트를 찾습니다: 리플렉션으로 메서드를 하나씩 보고, @Test가 붙은 메서드만 테스트로 고릅니다. 찾은 테스트는 ' + (both ? 'adds()와 subtracts(), 2개입니다.' : 'adds() 1개입니다. subtracts()는 @Test가 없어 고르지 않습니다.'), 'good');
      st.out.push('adds 실행'); if (both) st.out.push('subtracts 실행');
      push('JUnit이 CalcTest 객체를 만들고 찾은 테스트 메서드를 부릅니다: ' + (both ? '"adds 실행"과 "subtracts 실행"이 출력되고, 두 assertEquals가 모두 맞아 2개 모두 통과합니다.' : '"adds 실행"이 출력되고 assertEquals가 맞아 통과합니다. subtracts()는 한 번도 불리지 않습니다. 오류도 경고도 없습니다.'), both ? 'good' : 'hot');
      sum.push('JUnit은 @Test가 붙은 메서드를 실행 중에 리플렉션으로 찾아 테스트로 실행합니다. @Test를 빠뜨린 메서드는 테스트가 아닌 보통 메서드로 남고, 아무도 부르지 않습니다. 그래서 테스트 수가 예상보다 적으면 @Test가 빠지지 않았는지 봅니다.');
      return done('보임', 'JUnit (테스트 ' + (both ? 2 : 1) + '개 실행)', '', '테스트 ' + (both ? 2 : 1) + '개 실행');
    }

    if (t === 'retention') {
      st.src = '셋 다 붙어 있음'; st.fwT = 'main의 리플렉션 코드';
      push('PriceService는 예시로 만든 클래스입니다. 세 메서드에 표준 애너테이션을 하나씩 붙였고, 각 애너테이션의 선언에 적힌 @Retention이 다릅니다. 자바의 @Override는 @Retention(RetentionPolicy.SOURCE), 스프링 7의 @Contract(org.springframework.lang.Contract)는 @Retention을 적지 않아 기본값 CLASS, 스프링의 @Transactional은 @Retention(RetentionPolicy.RUNTIME)입니다. @Contract는 메서드의 입력과 결과의 관계("null을 넣으면 실패한다")를 적어 두어, 정적 분석 도구가 class 파일에서 읽어 쓰라고 만든 애너테이션입니다.');
      if (c.misplace) {
        st.cc = '붙일 곳 확인: 오류'; st.ccK = 'bad';
        var TMSG = 'annotation interface not applicable to this kind of declaration';
        push('필드 count 위에도 @Transactional을 붙였습니다: 컴파일러는 spring-tx의 Transactional.class에서 @Transactional의 선언을 읽습니다. 그 선언의 @Target({ElementType.TYPE, ElementType.METHOD})는 "클래스 같은 타입 선언과 메서드에만 붙일 수 있다"는 뜻인데, 필드에 붙였습니다. 컴파일 오류이고, 컴파일러는 "' + TMSG + '"(이 종류의 선언에는 붙일 수 없는 애너테이션)라고 알립니다.', 'bad');
        push('컴파일이 실패했습니다: class 파일이 만들어지지 않으므로 실행할 수 없습니다. @Target을 읽고 지키게 하는 쪽은 컴파일러이고, 잘못 붙인 채로 "왜 트랜잭션이 안 걸리지" 하고 헤매는 일을 막아 줍니다.', 'bad');
        sum.push('@Target은 애너테이션을 붙일 수 있는 곳을 정합니다. @Transactional은 TYPE과 METHOD, @Override는 METHOD, @Test는 METHOD와 ANNOTATION_TYPE입니다. 맞지 않는 곳에 붙이면 컴파일 오류가 납니다.');
        return fail('@Transactional', TMSG, '컴파일러 (오류로 알림)');
      }
      st.cc = '@Override 확인: 통과'; st.ccK = 'good'; st.comp = '성공';
      push('javac가 컴파일합니다: 컴파일러가 @Override를 읽고, toString()이 상위 타입(Object)의 toString()을 정말로 재정의하는지 확인합니다. 통과입니다. SOURCE이므로 @Override는 이 확인이 끝나면 버려집니다.', 'good');
      st.cls = '@Override만 사라짐'; st.clsOn = true;
      push('만들어진 PriceService.class를 javap -v로 보면: toString()에는 애너테이션 기록이 없습니다. round()에는 @Contract가 RuntimeInvisibleAnnotations(실행 중에는 보여 주지 않는 칸)에, save()에는 @Transactional이 RuntimeVisibleAnnotations(실행 중에도 보여 주는 칸)에 적혀 있습니다. CLASS와 RUNTIME은 둘 다 class 파일에 남지만 적히는 칸이 다릅니다.');
      st.run = '@Transactional만'; st.runOn = true; st.fw = '@Transactional만 찾음'; st.fwK = 'good'; st.fwOn = true;
      st.out.push('toString: []', 'round: []', 'save: [@Transactional]');
      push('getDeclaredAnnotations()로 세 메서드의 애너테이션을 실행 중에 꺼냅니다: toString은 []입니다(SOURCE, class 파일에도 없음). round도 []입니다(CLASS, class 파일에는 있지만 JVM이 리플렉션에 보여 주지 않음). save만 [@Transactional]입니다(RUNTIME). 스프링이 @Transactional을 찾을 수 있는 것은 이 때문입니다.', 'good');
      sum.push('SOURCE는 컴파일러만 읽으면 되는 표시(@Override), CLASS는 class 파일을 읽는 도구를 위한 표시(@Contract), RUNTIME은 실행 중에 프레임워크가 읽을 표시(@Transactional, @Test)에 씁니다. 어느 것인지는 애너테이션을 만든 쪽이 선언에 정해 두므로, 쓰는 쪽은 고를 필요가 없습니다.');
      return done('@Transactional만 보임', 'main의 리플렉션 코드 (읽기만 함)', '', '@Transactional만 보임');
    }

    if (t === 'override') {
      var typo = !!c.typo, has = !!c.ov;
      st.src = has ? '붙어 있음' : '붙이지 않음'; st.srcOn = has; st.fw = '없음 (SOURCE)';
      push('Animal과 Dog는 예시로 만든 클래스입니다. Animal에는 sound() 메서드가 있고, Dog는 Animal을 상속합니다: Dog에서 sound()를 다시 정의(오버라이딩)해 "멍멍"을 돌려주게 하려는 코드입니다.' + (typo ? ' 그런데 Dog의 메서드 이름을 sount로 잘못 적었습니다.' : '') + (has ? ' 자바가 주는 @Override의 실제 선언에는 @Target(ElementType.METHOD)와 @Retention(RetentionPolicy.SOURCE)가 붙어 있습니다.' : ''), typo ? 'hot' : '');
      var MSG = 'method does not override or implement a method from a supertype';
      if (has && typo) {
        st.cc = '재정의 확인: 오류'; st.ccK = 'bad';
        push('컴파일러가 sount() 위의 @Override를 읽습니다: @Override는 "바로 아래 메서드는 상위 타입의 메서드를 재정의한 것이다"라는 표시이고, 컴파일러는 그 말이 맞는지 확인합니다. Animal에는 sount()가 없습니다. 컴파일 오류이고, 컴파일러는 "' + MSG + '"(상위 타입의 메서드를 재정의하지도 구현하지도 않았다)라고 알립니다.', 'good');
        push('컴파일이 실패했습니다: class 파일이 만들어지지 않으므로 프로그램을 실행할 수 없습니다. 이름을 잘못 적은 실수가 실행 전에 드러났습니다.', 'bad');
        sum.push('@Override를 읽는 쪽은 컴파일러입니다. 재정의하려던 메서드의 이름이나 매개변수를 잘못 적으면 컴파일 오류로 알려 줍니다.');
        return fail('@Override', MSG, '컴파일러 (오류로 알림)');
      }
      if (has) { st.cc = '재정의 확인: 통과'; st.ccK = 'good'; push('컴파일러가 sound() 위의 @Override를 읽습니다: 바로 아래 메서드가 상위 타입의 메서드를 정말로 재정의하는지 확인합니다. Animal에 sound()가 있으므로 통과합니다.', 'good'); }
      else if (typo) { st.cc = '확인하지 않음'; st.ccK = 'plain'; push('컴파일러가 Dog의 sount()를 봅니다: @Override가 없으므로 "재정의가 맞는지" 확인하지 않습니다. sount()는 Dog에 새로 추가한, sound()와 상관없는 메서드로 취급되어 그대로 컴파일됩니다. 오류도 경고도 없습니다.', 'bad'); }
      else { st.cc = '확인하지 않음'; st.ccK = 'plain'; push('컴파일러가 Dog의 sound()를 봅니다: 이름과 매개변수가 Animal의 sound()와 같으므로 재정의가 됩니다. @Override가 없어도 재정의는 되지만, 맞게 적었는지 확인해 준 쪽은 없습니다.', ''); }
      st.comp = '성공'; st.cls = has ? '남지 않음' : '없음'; st.run = has ? '보이지 않음' : '없음';
      push('컴파일에 성공했습니다: Dog.class가 만들어집니다.' + (has ? ' @Override는 SOURCE라서, 컴파일러의 확인이 끝나면 class 파일에는 적히지 않습니다(javap -v로 보면 Dog.class에 애너테이션 기록이 없습니다). 실행 중에는 흔적이 없습니다.' : ''), 'good');
      var res = typo ? '...' : '멍멍';
      st.out.push(res);
      push('a.sound() 실행: a가 가리키는 객체는 Dog입니다. ' + (typo ? 'Dog에는 sound()가 없습니다(sount()만 있습니다). 그래서 Animal에게서 물려받은 sound()가 실행되어 "..."를 출력합니다. 오류 없이 의도와 다른 메서드가 실행됐습니다.' : 'Dog가 재정의한 sound()가 실행되어 "멍멍"을 출력합니다.'), typo ? 'bad' : 'good');
      if (typo) sum.push('@Override가 없으면 이름을 잘못 적은 메서드가 "새 메서드"로 조용히 컴파일되고, 재정의하려던 부모의 메서드가 그대로 실행됩니다. @Override를 붙이면 같은 실수가 컴파일 오류가 됩니다.');
      else if (has) sum.push('@Override는 동작을 바꾸지 않습니다. 붙이든 떼든 출력은 같습니다. 하는 일은 하나, "재정의가 맞는지 컴파일러에게 확인시키는 것"입니다. 그래서 재정의하는 메서드에는 항상 붙입니다.');
      else sum.push('이름을 맞게 적었으므로 @Override가 없어도 재정의가 됩니다. 다만 나중에 부모의 메서드 이름이 바뀌면, 이 메서드는 아무 알림 없이 재정의가 아니게 됩니다. @Override를 붙여 두면 그때 컴파일 오류로 알 수 있습니다.');
      return done(has ? '보이지 않음 (SOURCE)' : '(붙이지 않음)', has ? '컴파일러 (확인 통과)' : '없음', '', typo ? 'Animal의 sound 실행' : 'Dog의 sound 실행');
    }

    if (t === 'deprecated') {
      var old = !!c.old;
      st.src = old ? 'JDK의 Integer에 붙어 있음' : '쓰는 곳에 없음'; st.srcOn = old;
      push(old ? 'Integer는 자바가 주는 클래스입니다. 생성자 Integer(int)의 선언에는 @Deprecated(since = "9", forRemoval = true)가 붙어 있습니다. 자바 9부터 쓰지 말라고 했고, 앞으로 지울 예정이라는 뜻입니다. @Deprecated의 선언에는 @Retention(RetentionPolicy.RUNTIME)이 붙어 있습니다.' : 'Integer.valueOf(5)는 자바가 권하는 방법이고, @Deprecated가 붙어 있지 않습니다.');
      st.cls = old ? 'Integer.class에 남음' : '없음'; st.clsOn = old; st.ccAt = 'cls';
      if (old) {
        st.cc = '경고 1개'; st.ccK = 'hot'; st.comp = '성공 (경고)';
        push('javac가 new Integer(5)를 컴파일합니다: 컴파일러는 JDK의 Integer 소스 코드가 아니라 JDK가 class 파일로 주는 Integer.class를 읽어 생성자 정보를 얻고, 거기 남아 있는 @Deprecated(forRemoval = true)를 보고 경고합니다: "warning: [removal] Integer(int) in Integer has been deprecated and marked for removal". 경고일 뿐이라 컴파일은 성공합니다. 표시가 class 파일에 남지 않았다면(SOURCE였다면) 이 경고는 낼 수 없습니다.', 'hot');
      } else {
        st.cc = '경고 없음'; st.ccK = 'good'; st.comp = '성공';
        push('javac가 Integer.valueOf(5)를 컴파일합니다: Integer.class에서 valueOf(int)의 정보를 읽지만 @Deprecated가 없으므로 경고 없이 컴파일됩니다.', 'good');
      }
      st.run = old ? '보임 (RUNTIME)' : '없음'; st.runOn = old; st.out.push('6');
      push('실행합니다: a는 5를 가진 Integer 객체이고, a + 1은 6입니다. ' + (old ? '@Deprecated는 동작을 바꾸지 않습니다. 경고를 무시해도 실행 결과는 같습니다.' : ''));
      if (old) sum.push('@Deprecated를 읽는 쪽은 컴파일러이고, 읽는 곳은 우리 소스가 아니라 라이브러리의 class 파일입니다. 그래서 @Deprecated는 class 파일에 남아야 하고, 실행 중에도 리플렉션으로 확인할 수 있게 RUNTIME으로 선언되어 있습니다. forRemoval = true면 경고가 기본으로 켜져 있어 그냥 컴파일해도 보입니다.');
      else sum.push('@Deprecated가 붙지 않은 API는 경고 없이 컴파일됩니다. Integer는 생성자 대신 Integer.valueOf를 쓰라고 권합니다.');
      return done(old ? '보임 (Integer(int)의 @Deprecated)' : '(붙어 있지 않음)', old ? '컴파일러 (경고)' : '없음', old ? '성공 (경고)' : '성공', '6 출력');
    }

    if (t === 'funcif') {
      var fi = !!c.fi, two = !!c.two;
      st.src = fi ? '붙어 있음' : '붙이지 않음'; st.srcOn = fi;
      push('PriceRule은 예시로 만든 인터페이스이고, 추상 메서드가 ' + (two ? 'apply와 undo 2개입니다.' : 'apply 1개입니다.') + (fi ? ' 그 위에 자바가 주는 @FunctionalInterface를 붙였습니다. "람다로 쓸 인터페이스다", 곧 추상 메서드가 정확히 하나라는 표시입니다. 자바의 Runnable과 Comparator에도 붙어 있습니다.' : ' @FunctionalInterface는 붙이지 않았습니다.'), two ? 'hot' : '');
      var FMSG = 'Unexpected @FunctionalInterface annotation', LMSG = 'incompatible types: PriceRule is not a functional interface';
      if (fi && two) {
        st.cc = '추상 메서드 확인: 오류'; st.ccK = 'bad';
        push('컴파일러가 @FunctionalInterface를 읽고 PriceRule의 추상 메서드 수를 셉니다: 2개이므로 컴파일 오류입니다. 컴파일러는 선언한 자리(@FunctionalInterface 줄)에서 "' + FMSG + '"(PriceRule은 함수형 인터페이스가 아니다, 추상 메서드가 여럿이다)라고 알립니다. 람다를 쓴 줄에도 오류가 하나 더 납니다.', 'good');
        push('컴파일이 실패했습니다: 실행할 수 없습니다.', 'bad');
        sum.push('@FunctionalInterface를 붙이면, 추상 메서드가 하나가 아니게 되는 순간 컴파일러가 인터페이스를 선언한 자리에서 알려 줍니다. 람다를 쓰는 곳이 여러 파일에 흩어져 있어도 원인이 어디인지 바로 보입니다.');
        return fail('@FunctionalInterface', FMSG, '컴파일러 (오류로 알림)');
      }
      if (two) {
        st.cc = '람다 확인: 오류'; st.ccK = 'bad';
        push('@FunctionalInterface가 없으므로 컴파일러는 PriceRule 선언에서는 아무것도 확인하지 않습니다. 대신 람다를 쓴 줄에서 "' + LMSG + '"(PriceRule은 함수형 인터페이스가 아니다) 오류를 냅니다. 오류가 선언이 아니라 쓰는 곳에서 납니다.', 'bad');
        push('컴파일이 실패했습니다: 실행할 수 없습니다.', 'bad');
        sum.push('@FunctionalInterface가 없어도 추상 메서드가 둘이면 람다로 쓸 수 없습니다. 다만 오류가 람다를 쓴 곳마다 나서, 원인인 인터페이스 선언을 찾아가야 합니다.');
        return fail('PriceRule half', LMSG, '(붙이지 않음)');
      }
      st.cc = fi ? '추상 메서드 확인: 통과' : '확인하지 않음'; st.ccK = fi ? 'good' : 'plain'; st.comp = '성공';
      st.cls = fi ? '남음 (RUNTIME)' : '없음'; st.clsOn = fi; st.run = fi ? '보임' : '없음'; st.runOn = fi;
      push(fi ? '컴파일러가 @FunctionalInterface를 읽고 추상 메서드가 apply 하나인지 확인합니다. 통과입니다. @FunctionalInterface의 선언은 @Retention(RetentionPolicy.RUNTIME)이라, 표시는 PriceRule.class에도 남습니다.' : '컴파일러가 람다 price -> price / 2를 PriceRule의 apply로 맞춥니다. 추상 메서드가 하나이므로 @FunctionalInterface가 없어도 람다로 쓸 수 있습니다.', 'good');
      st.out.push('500');
      push('half.apply(1000) 실행: 람다가 1000 / 2를 계산해 500을 출력합니다.');
      sum.push(fi ? '@FunctionalInterface는 동작을 바꾸지 않습니다. 추상 메서드가 하나라는 약속을 컴파일러가 지키게 할 뿐입니다.' : '람다로 쓸 수 있는지는 추상 메서드의 수로 정해집니다. @FunctionalInterface는 그 조건을 선언한 자리에서 확인하게 해 주는 표시입니다.');
      return done(fi ? '보임' : '(붙이지 않음)', fi ? '컴파일러 (확인 통과)' : '없음', '', '500 출력');
    }

    // custom: 직접 만든 @Timed
    var rt = c.ret === 'RUNTIME';
    st.src = '붙어 있음'; st.fwT = 'main의 리플렉션 코드';
    push('@interface Timed는 애너테이션을 직접 만드는 문법이고, Service는 예시로 만든 클래스입니다. ' + (rt ? '@Retention(RetentionPolicy.RUNTIME)을 적었습니다.' : '@Retention을 적지 않았습니다. 적지 않으면 기본값 CLASS가 됩니다.') + ' @Target(ElementType.METHOD)이므로 메서드에만 붙일 수 있습니다.', rt ? '' : 'hot');
    st.cc = '붙일 곳 확인: 통과'; st.ccK = 'good'; st.comp = '성공'; st.cls = rt ? '남음 (RUNTIME)' : '남음 (CLASS)'; st.clsOn = true;
    push('컴파일합니다: @Timed 표시는 Service.class의 ' + (rt ? 'RuntimeVisibleAnnotations(실행 중에도 보여 주는 칸)' : 'RuntimeInvisibleAnnotations(실행 중에는 보여 주지 않는 칸)') + '에 적힙니다.', 'good');
    st.run = rt ? '보임' : '보이지 않음'; st.runOn = rt; st.fw = rt ? '표시를 찾아 앞뒤 출력' : '표시를 찾지 못함'; st.fwK = rt ? 'good' : 'bad'; st.fwOn = true;
    st.out.push('@Timed가 보이는가: ' + rt);
    push('m.isAnnotationPresent(Timed.class) 실행: 결과는 ' + rt + '입니다. ' + (rt ? 'RUNTIME이라 표시가 실행 중까지 남아 있습니다.' : '표시가 class 파일에는 있지만, JVM은 CLASS로 남긴 표시를 리플렉션에 보여 주지 않습니다. 오류도 나지 않습니다.'), rt ? 'good' : 'bad');
    if (rt) st.out.push('[시간 측정 시작]', 'work 실행', '[시간 측정 끝]'); else st.out.push('work 실행');
    push(rt ? 'found가 true이므로, 직접 쓴 읽는 코드가 work 앞뒤에 출력을 덧붙입니다. 스프링이 @Transactional을 읽어 프록시로 앞뒤에 트랜잭션을 거는 일을, 아주 작게 흉내 낸 것입니다.' : 'found가 false이므로 work만 실행됩니다. 소스 코드에는 @Timed가 붙어 있는데도, 읽는 코드에게는 표시가 없는 메서드와 같습니다.', rt ? 'good' : 'bad');
    sum.push(rt ? '애너테이션은 직접 만들 수도 있고, 실행 중에 읽으려면 @Retention(RetentionPolicy.RUNTIME)을 적고 읽는 코드를 직접 써야 합니다. 스프링의 @Transactional과 JUnit의 @Test는 이 두 가지를 이미 갖추고 있습니다.' : '직접 만든 애너테이션에 @Retention을 빠뜨리면 기본값 CLASS가 되어, 실행 중에 읽는 코드가 조용히 아무것도 찾지 못합니다. 실행 중에 읽을 애너테이션에는 RUNTIME을 적습니다.');
    return done(rt ? '보임' : '보이지 않음 (CLASS)', rt ? 'main의 리플렉션 코드' : '없음 (찾지 못함)', '', rt ? 'work 앞뒤에 출력이 붙음' : 'work만 실행');
  },
  render: function (v, sim, t, H, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : null;
    if (!s) { H.text(v, '실행을 누르면 소스 코드, class 파일, 실행 중의 순서로 표시가 어디까지 남고 누가 읽는지 보여 줍니다.'); return; }
    H.title(v, '콘솔 출력');
    v.appendChild(H.el('pre', 'code', s.out.length ? s.out.join('\n') : '(아직 없음)'));
    H.counters(v, [[s.end, '프로그램']]);
  },
  // 그림: 위 줄에 소스 코드, class 파일, 실행 중의 세 단계를 놓고 단계마다 표시가 남아 있는지 적는다. 아래 줄에는 그 표시를 읽는 쪽(컴파일러, 실행 중에 읽는 쪽)을 놓고, 읽은 단계로 화살표를 긋는다.
  draw: function (P, sim, shown) {
    var c = sim.c, mark = this.mark(c), last = shown[shown.length - 1];
    var s = last ? last.snap : { src: '', cls: '?', run: '?', srcOn: false, clsOn: false, runOn: false, cc: '아직', ccK: '', ccAt: 'src', fwT: '실행 중에 읽는 쪽', fw: '아직', fwK: 'ghost', fwOn: false, comp: '?', out: [], end: '?' };
    var err = s.comp === '오류';
    P.size(680, 292);
    P.region('life', 16, 16, 648, 96, mark + ' 표시가 남는 곳');
    P.box('src', 30, 46, 196, 54, { cls: !last ? 'ghost' : s.srcOn ? 'wait' : 'plain', title: '소스 코드 (.java)', sub: s.src || '아직' });
    P.box('cls', 242, 46, 196, 54, { cls: err ? 'plain' : s.clsOn ? 'wait' : s.cls === '?' ? 'ghost' : 'plain', title: 'class 파일 (.class)', sub: err ? '만들어지지 않음' : s.cls === '?' ? '아직' : s.cls });
    P.box('run', 454, 46, 196, 54, { cls: err ? 'plain' : s.runOn ? 'wait' : s.run === '?' ? 'ghost' : 'plain', title: '실행 중 (JVM)', sub: err ? '실행 못 함' : s.run === '?' ? '아직' : s.run });
    P.arrow('c1', 'src:r', 'cls:l', { cls: err ? 'bad' : s.clsOn ? 'good' : 'mut dash' });
    P.arrow('c2', 'cls:r', 'run:l', { cls: s.runOn ? 'good' : 'mut dash' });
    P.region('readers', 16, 126, 648, 96, '표시를 읽는 쪽');
    P.box('rd1', 30, 156, 196, 54, { cls: s.ccK === 'bad' ? 'bad now' : s.ccK === 'good' ? 'good' : s.ccK === 'hot' ? 'wait now' : 'plain', title: '컴파일러', sub: s.cc });
    P.box('rd2', 454, 156, 196, 54, { cls: !s.fwOn ? 'ghost' : s.fwK === 'good' ? 'good now' : s.fwK === 'bad' ? 'bad now' : 'plain', title: s.fwT, sub: s.fw });
    if (s.ccK === 'good' || s.ccK === 'bad' || s.ccK === 'hot') P.arrow('r1', 'rd1:t', (s.ccAt === 'cls' ? 'cls' : 'src') + ':b', { cls: s.ccK === 'bad' ? 'bad' : 'good' });
    if (s.fwOn && (s.fwK === 'good' || s.fwK === 'bad')) P.arrow('r2', 'rd2:t', 'run:b', { cls: s.fwK === 'good' ? 'good' : 'bad' });
    P.box('o1', 16, 238, 320, 36, { cls: s.comp === '?' ? 'ghost' : err ? 'bad' : 'good', title: '컴파일', right: s.comp });
    var result = s.res || '?';
    P.box('o2', 344, 238, 320, 36, { cls: result === '?' ? 'ghost' : err ? 'bad' : 'plain', title: '실행 결과', right: result });
    P.note('위 줄은 표시가 어느 단계까지 남는지(애너테이션 선언의 @Retention이 정합니다), 아래 줄은 그 표시를 누가 읽는지입니다.');
  },
  assume: '스물네 가지 조합(@Transactional 8, @Test 2, 유지 정책 2, @Override 4, @Deprecated 2, @FunctionalInterface 4, 직접 만든 @Timed 2)을 화면의 코드 그대로 JDK 21에서 컴파일하고 실행해 대조했습니다. @Transactional은 스프링 7.0.9와 H2 메모리 DB로 실제 컨테이너를 띄워 실행했고, 받은 객체가 프록시인지, @EnableTransactionManagement가 자동 프록시 생성기를 등록하는지, order() 호출 한 번에 트랜잭션이 몇 번 시작·커밋되는지(트랜잭션 매니저에 단 리스너로 셈)도 확인했습니다. @Test는 JUnit 6.0.3의 Launcher로 실행해 찾은 테스트 수와 통과 수를 확인했습니다. 컴파일러 메시지는 영어로 받았고, class 파일의 어느 칸(RuntimeVisibleAnnotations, RuntimeInvisibleAnnotations)에 애너테이션이 적혔는지는 javap -v로 확인했습니다. 글에 적은 표준 애너테이션의 @Retention·@Target과 Integer(int)의 @Deprecated 값은 같은 버전의 라이브러리에서 리플렉션으로 읽어 대조했습니다. 화면의 코드에는 import 문과 Main 클래스·main 선언이 생략되어 있습니다(@Test 코드는 import까지 보입니다). 스프링이 애너테이션을 찾을 때 자바 리플렉션의 getDeclaredAnnotations를 바탕으로 한다는 것, 스프링의 @Contract는 정적 분석 도구가 읽으라고 만든 것이라는 것, 스프링 부트의 자동 설정이 @EnableTransactionManagement를 대신 한다는 것은 스프링 문서와 소스를 보고 쓴 설명이며 실행해 확인하지는 않았습니다. 컴파일할 때 애너테이션을 읽어 코드를 만들어 내는 도구(애너테이션 프로세서)는 다루지 않았습니다.',
});

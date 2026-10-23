Lab.register({
  id: 'annot', nav: 'Annotations', cat: 'Java language', mode: 'step',
  title: 'What really happens when you just add an @?',
  why: 'Before annotations, information such as "wrap this method in a transaction" or "this method is a test" was written in a place apart from the code, such as an XML configuration file, or was expressed by a rule such as a method name that starts with test. When you changed the code, it was hard to change the separate configuration along with it. An annotation writes that information right above the class or method it concerns, and lets the compiler or a framework read it.',
  use: 'Spring\'s @Transactional, @Component, and @GetMapping, JPA\'s @Entity, and JUnit\'s @Test are read by the framework with reflection while the program runs. Java\'s @Override, @FunctionalInterface, and @Deprecated are read by the compiler, which reports an error or a warning. The declaration of such an annotation carries @Retention and @Target, which decide how far the tag is kept and where it can be put.',
  intro: 'An annotation (a tag that starts with @, such as @Transactional, @Test, or @Override) is a tag that you put on code. The tag itself does nothing. It takes on meaning only when something reads it, and there are two main kinds of readers: the compiler (@Override, @FunctionalInterface, @Deprecated), and frameworks that read it with reflection while the program runs (Spring\'s @Transactional, JUnit\'s @Test). The @Retention on the declaration of each annotation decides how far the tag is kept: only in the source code (SOURCE), up to the class file (CLASS), or until run time (RUNTIME). That also decides who can read it.',
  terms: ['Annotation', 'Reflection', '@Retention and @Target', '@Transactional', 'Proxy', '@Test', '@Override', '@Deprecated', '@FunctionalInterface'],
  controls: [
    { id: 'topic', label: 'What to look at', type: 'select', value: 'tx', options: [['tx', 'Spring @Transactional: Spring reads it at run time'], ['test', 'JUnit @Test: JUnit reads it at run time'], ['retention', 'Comparing the retention policies SOURCE, CLASS, and RUNTIME'], ['override', '@Override: the compiler reads it'], ['deprecated', '@Deprecated: the compiler reads it from the class file'], ['funcif', '@FunctionalInterface: the compiler reads it'], ['custom', 'An annotation we made, @Timed']] },
    { id: 'txAnn', label: 'Add @Transactional to order()', type: 'check', value: true, show: function (c) { return c.topic === 'tx'; } },
    { id: 'enable', label: 'Add @EnableTransactionManagement to the configuration class', type: 'check', value: true, show: function (c) { return c.topic === 'tx'; } },
    { id: 'get', label: 'How to get service', type: 'select', value: 'bean', options: [['bean', 'Get it from Spring with ctx.getBean'], ['new', 'Create it directly with new OrderService()']], show: function (c) { return c.topic === 'tx'; } },
    { id: 'sub', label: 'Add @Test to subtracts() too', type: 'check', value: false, show: function (c) { return c.topic === 'test'; } },
    { id: 'misplace', label: 'Add @Transactional to a field too', type: 'check', value: false, show: function (c) { return c.topic === 'retention'; } },
    { id: 'typo', label: 'Misspell the name of the method that is meant to override (sound → sount)', type: 'check', value: true, show: function (c) { return c.topic === 'override'; } },
    { id: 'ov', label: 'Add @Override to that method', type: 'check', value: false, show: function (c) { return c.topic === 'override'; } },
    { id: 'old', label: 'Use new Integer(5) instead of Integer.valueOf(5)', type: 'check', value: true, show: function (c) { return c.topic === 'deprecated'; } },
    { id: 'fi', label: 'Add @FunctionalInterface to PriceRule', type: 'check', value: true, show: function (c) { return c.topic === 'funcif'; } },
    { id: 'two', label: 'Declare one more abstract method, undo, in PriceRule', type: 'check', value: false, show: function (c) { return c.topic === 'funcif'; } },
    { id: 'ret', label: '@Retention of @Timed', type: 'select', value: 'none', options: [['none', 'Not written'], ['RUNTIME', 'RUNTIME: until run time']], show: function (c) { return c.topic === 'custom'; } },
  ],
  presets: [
    { t: 'Default settings', q: 'What happens when you call order(), which has @Transactional, on an object you got from Spring?', d: 'Spring read the tag and made a proxy, so order() runs inside a transaction.', v: { topic: 'tx', txAnn: true, enable: true, get: 'bean', sub: false, misplace: false, typo: true, ov: false, old: true, fi: true, two: false, ret: 'none' } },
    { t: 'Create it with new', q: 'What if you do not get the same OrderService from Spring, but create it directly with new and call order()?', d: 'The tag can be seen at run time too, but the object did not go through Spring, which reads it and acts, so there is no transaction.', v: { topic: 'tx', txAnn: true, enable: true, get: 'new', sub: false, misplace: false, typo: true, ov: false, old: true, fi: true, two: false, ret: 'none' } },
    { t: 'Without registering the reader', q: 'What if you remove @EnableTransactionManagement from the configuration class?', d: 'The part that reads @Transactional and makes a proxy is not registered. The object you get from Spring is a plain OrderService, and there is no transaction.', v: { topic: 'tx', txAnn: true, enable: false, get: 'bean', sub: false, misplace: false, typo: true, ov: false, old: true, fi: true, two: false, ret: 'none' } },
    { t: 'Methods JUnit finds', q: 'When you run CalcTest with JUnit, what happens to subtracts(), which does not have @Test?', d: 'JUnit uses reflection and finds only the methods that have @Test and runs them. subtracts() is not called, and there is no error.', v: { topic: 'test', txAnn: true, enable: true, get: 'bean', sub: false, misplace: false, typo: true, ov: false, old: true, fi: true, two: false, ret: 'none' } },
    { t: 'Three retention policies', q: 'If you read at run time with reflection a method that has @Override (SOURCE), Spring\'s @Contract (CLASS), and @Transactional (RUNTIME), what do you see?', d: 'The only one you can see at run time is @Transactional, which is RUNTIME. @Contract remains in the class file but is not visible to reflection.', v: { topic: 'retention', txAnn: true, enable: true, get: 'bean', sub: false, misplace: false, typo: true, ov: false, old: true, fi: true, two: false, ret: 'none' } },
    { t: '@Target blocks it', q: 'What if you put @Transactional, which can be put only on classes and methods, on a field?', d: 'It is a compile-time error. The compiler reads the @Target written in the declaration of @Transactional and blocks it.', v: { topic: 'retention', txAnn: true, enable: true, get: 'bean', sub: false, misplace: true, typo: true, ov: false, old: true, fi: true, two: false, ret: 'none' } },
    { t: '@Override catches it', q: 'What if you misspell the name of the method that is meant to override as sount and put @Override on that method?', d: 'The compiler reports it as an error. If you remove @Override, it compiles with no error and the parent\'s method runs instead.', v: { topic: 'override', txAnn: true, enable: true, get: 'bean', sub: false, misplace: false, typo: true, ov: true, old: true, fi: true, two: false, ret: 'none' } },
    { t: 'A constructor marked for removal', q: 'What if you use new Integer(5) instead of Integer.valueOf(5)?', d: 'The compiler reads the @Deprecated(forRemoval = true) that remains in Integer.class and gives a warning. It still compiles.', v: { topic: 'deprecated', txAnn: true, enable: true, get: 'bean', sub: false, misplace: false, typo: true, ov: false, old: true, fi: true, two: false, ret: 'none' } },
    { t: 'Two abstract methods', q: 'What if you declare one more abstract method in PriceRule, which has @FunctionalInterface?', d: 'The compiler reports as an error, at the place of the declaration, that this has become an interface that cannot be used as a lambda.', v: { topic: 'funcif', txAnn: true, enable: true, get: 'bean', sub: false, misplace: false, typo: true, ov: false, old: true, fi: true, two: true, ret: 'none' } },
    { t: 'An annotation we made', q: 'What if you make the annotation @Timed yourself, put it on a method with no @Retention, and read it with reflection?', d: 'If you do not write @Retention, it is CLASS and cannot be seen at run time. To read it at run time, you have to write RUNTIME.', v: { topic: 'custom', txAnn: true, enable: true, get: 'bean', sub: false, misplace: false, typo: true, ov: false, old: true, fi: true, two: false, ret: 'none' } },
  ],
  // The code on the screen: [the declarations, the part inside main]. For a topic with no declarations, the first entry is an empty string
  parts: function (c) {
    var MAIN = '// From here on, the code is inside main (the Main class, the main declaration, and imports are omitted)\n';
    if (c.topic === 'tx') {
      return ['// AppConfig and OrderService are classes made as examples\n// The annotations and classes such as DriverManagerDataSource are provided by Spring\n@Configuration\n' + (c.enable ? '@EnableTransactionManagement\n' : '') + 'class AppConfig {\n    @Bean\n    DataSource dataSource() {\n        return new DriverManagerDataSource("jdbc:h2:mem:annot");\n    }\n\n    @Bean\n    PlatformTransactionManager transactionManager(DataSource dataSource) {\n        return new DataSourceTransactionManager(dataSource);\n    }\n\n    @Bean\n    OrderService orderService() {\n        return new OrderService();\n    }\n}\n\nclass OrderService {\n' + (c.txAnn ? '    @Transactional\n' : '') + '    public void order() {\n        boolean inTx = TransactionSynchronizationManager.isActualTransactionActive();\n        System.out.println("order ran, in a transaction: " + inTx);\n    }\n}',
        MAIN + 'try (AnnotationConfigApplicationContext ctx = new AnnotationConfigApplicationContext(AppConfig.class)) {\n    Method order = OrderService.class.getMethod("order");\n    System.out.println("Is @Transactional visible: " + order.isAnnotationPresent(Transactional.class));\n' + (c.get === 'bean' ? '    OrderService service = ctx.getBean(OrderService.class);\n' : '    OrderService service = new OrderService(); // create it directly, without going through Spring\n') + '    System.out.println("Class of service: " + service.getClass().getSimpleName());\n    service.order();\n}'];
    }
    if (c.topic === 'test') {
      return ['import static org.junit.jupiter.api.Assertions.assertEquals;\n\nimport org.junit.jupiter.api.Test;\n\n// CalcTest is a test class made as an example. @Test and assertEquals are provided by JUnit\nclass CalcTest {\n    @Test\n    void adds() {\n        System.out.println("adds ran");\n        assertEquals(5, 2 + 3);\n    }\n\n' + (c.sub ? '    @Test\n' : '') + '    void subtracts() {\n        System.out.println("subtracts ran");\n        assertEquals(1, 3 - 2);\n    }\n}',
        '// This class has no main. The IDE\'s run-tests button or gradle test hands CalcTest to JUnit to run'];
    }
    if (c.topic === 'retention') {
      return ['// PriceService is a class made as an example. The three annotations are provided by Java and Spring, and the retention policies written in their declarations differ\nclass PriceService {\n' + (c.misplace ? '    @Transactional\n    private int count;\n\n' : '') + '    @Override                  // Java: the declaration has @Retention(RetentionPolicy.SOURCE)\n    public String toString() {\n        return "PriceService";\n    }\n\n    @Contract("null -> fail")  // Spring: the declaration has no @Retention, so the default is CLASS\n    public int round(Integer price) {\n        return price / 100 * 100;\n    }\n\n    @Transactional             // Spring: the declaration has @Retention(RetentionPolicy.RUNTIME)\n    public void save() {\n    }\n}',
        MAIN + 'Method[] methods = {\n    PriceService.class.getMethod("toString"),\n    PriceService.class.getMethod("round", Integer.class),\n    PriceService.class.getMethod("save")\n};\nfor (Method m : methods) {\n    List<String> names = new ArrayList<>();\n    for (Annotation a : m.getDeclaredAnnotations()) {\n        names.add("@" + a.annotationType().getSimpleName());\n    }\n    System.out.println(m.getName() + ": " + names);\n}'];
    }
    if (c.topic === 'override') {
      return ['// Animal and Dog are classes made as examples. @Override is an annotation provided by Java\nclass Animal {\n    String sound() {\n        return "...";\n    }\n}\n\nclass Dog extends Animal {\n' + (c.ov ? '    @Override\n' : '') + '    String ' + (c.typo ? 'sount' : 'sound') + '() {\n        return "Woof";\n    }\n}',
        MAIN + 'Animal a = new Dog();\nSystem.out.println(a.sound());'];
    }
    if (c.topic === 'deprecated') {
      return ['', MAIN + '// Integer is a class provided by Java. The declaration of the constructor Integer(int) has @Deprecated(since = "9", forRemoval = true)\nInteger a = ' + (c.old ? 'new Integer(5)' : 'Integer.valueOf(5)') + ';\nSystem.out.println(a + 1);'];
    }
    if (c.topic === 'funcif') {
      return ['// PriceRule is an interface made as an example. @FunctionalInterface is an annotation provided by Java\n' + (c.fi ? '@FunctionalInterface\n' : '') + 'interface PriceRule {\n    int apply(int price);\n' + (c.two ? '    int undo(int price);\n' : '') + '}',
        MAIN + 'PriceRule half = price -> price / 2;\nSystem.out.println(half.apply(1000));'];
    }
    return ['// Timed is an annotation we made ourselves, and Service is a class made as an example\n' + (c.ret === 'RUNTIME' ? '@Retention(RetentionPolicy.RUNTIME)\n' : '') + '@Target(ElementType.METHOD)\n@interface Timed { }\n\nclass Service {\n    @Timed\n    void work() {\n        System.out.println("work ran");\n    }\n}',
      MAIN + 'Service service = new Service();\nMethod m = Service.class.getDeclaredMethod("work");\nboolean found = m.isAnnotationPresent(Timed.class);\nSystem.out.println("Is @Timed visible: " + found);\nif (found) System.out.println("[Timing starts]");\nm.invoke(service);\nif (found) System.out.println("[Timing ends]");'];
  },
  code: function (c) { var p = this.parts(c); return p[0] ? p[0] + '\n\n' + p[1] : p[1]; },
  label: function (c) {
    var t = c.topic;
    if (t === 'tx') return '@Transactional · ' + (c.txAnn ? 'added' : 'not added') + ' · @EnableTransactionManagement ' + (c.enable ? 'present' : 'absent') + ' · ' + (c.get === 'bean' ? 'got from Spring' : 'created with new');
    if (t === 'test') return 'JUnit @Test · ' + (c.sub ? 'added' : 'not added') + ' on subtracts()';
    if (t === 'retention') return 'Comparing retention policies' + (c.misplace ? ' · @Transactional on a field too' : '');
    if (t === 'override') return '@Override · ' + (c.typo ? 'misspelled name' : 'correct name') + ' · ' + (c.ov ? '@Override added' : 'no @Override');
    if (t === 'deprecated') return '@Deprecated · ' + (c.old ? 'new Integer(5)' : 'Integer.valueOf(5)');
    if (t === 'funcif') return '@FunctionalInterface ' + (c.fi ? 'added' : 'absent') + ' · ' + (c.two ? '2 abstract methods' : '1 abstract method');
    return 'Our own @Timed · Retention ' + (c.ret === 'none' ? 'omitted' : c.ret);
  },
  mark: function (c) { return { tx: '@Transactional', test: '@Test', retention: 'Three annotations', override: '@Override', deprecated: '@Deprecated', funcif: '@FunctionalInterface', custom: '@Timed' }[c.topic]; },
  columns: ['Compile', 'Visible through reflection at run time?', 'Who read the tag and acted', 'Output'],
  simulate: function (c) {
    var ev = [], sum = [], t = c.topic;
    // State for the diagram: where the tag remains (src, cls, run), the readers (cc is the compiler, fw is the reader at run time), and compile and output
    var st = { src: '', cls: '?', run: '?', srcOn: true, clsOn: false, runOn: false, cc: 'Not yet', ccK: '', ccAt: 'src', fwT: 'Reader at run time', fw: 'None', fwK: 'ghost', fwOn: false, comp: '?', out: [], end: '?' };
    function push(s, k) { ev.push({ s: s, k: k || '', snap: JSON.parse(JSON.stringify(st)) }); }
    function fin(res) { var l = ev[ev.length - 1].snap; l.end = st.end; l.comp = st.comp; l.res = res; }
    function fail(line, msg, reader) { st.comp = 'Error'; st.end = 'Cannot run'; fin('Cannot run'); return { events: ev, summary: sum, errLine: line, msg: msg, row: ['Error', '(not compiled)', reader, '(cannot run)'] }; }
    function done(vis, reader, comp, res) { st.end = 'Ended normally'; fin(res); return { events: ev, summary: sum, errLine: '', msg: '', row: [comp || 'Succeeded', vis, reader, st.out.join(' / ')] }; }

    if (t === 'tx') {
      var ann = !!c.txAnn, en = !!c.enable, bean = c.get === 'bean', proxy = ann && en && bean, made = ann && en;
      st.src = ann ? 'Present' : 'Not added'; st.srcOn = ann; st.fwT = 'Spring';
      push('AppConfig and OrderService are classes made as examples. ' + (ann ? 'We added @Transactional, which Spring provides, above order(). The real declaration of @Transactional (spring-tx 7.0.9) has @Target({ElementType.TYPE, ElementType.METHOD}) and @Retention(RetentionPolicy.RUNTIME). That means it can be put on classes and methods, and the tag is kept until run time.' : 'We did not add @Transactional to order().'), ann ? '' : 'hot');
      st.cc = 'Target check: passed'; st.ccK = 'good'; st.comp = 'Succeeded'; st.cls = ann ? 'Kept (RUNTIME)' : 'Absent'; st.clsOn = ann;
      push('javac compiles it: ' + (ann ? 'the compiler only checks that @Transactional is an annotation that may be put on a method (@Target) and passes it. It does nothing about transactions. It is RUNTIME, so the tag is written to RuntimeVisibleAnnotations (the slot that is visible at run time too) of OrderService.class.' : 'OrderService.class is created. order() has no tag.'), ann ? 'good' : '');
      if (en) {
        push('new AnnotationConfigApplicationContext(AppConfig.class): the Spring container reads the configuration class AppConfig. @EnableTransactionManagement is present, so the parts that find @Transactional and apply transactions are registered as beans. They are the auto-proxy creator (InfrastructureAdvisorAutoProxyCreator), which checks whether a proxy is needed when a bean is created, and the transaction advisor, which reads @Transactional.', 'good');
        if (ann) { st.fw = bean ? 'Finds tag, makes proxy' : 'Made a proxy'; st.fwK = 'good'; st.fwOn = true; st.runOn = true; st.run = 'Visible'; }
        else { st.fw = 'Found none, leaves as is'; st.fwK = 'plain'; st.fwOn = true; st.run = 'Absent'; }
        push(ann ? 'When it creates the orderService bean, Spring uses reflection to look at the annotations on the methods of OrderService. It finds @Transactional on order(), so it registers an object of a proxy class made by extending OrderService (OrderService$$SpringCGLIB$$0) as the bean. The proxy holds a reference to the original OrderService object, and when it receives a method call, it does the transaction work before and after and calls the method of the original object.' : 'When it creates the orderService bean, Spring uses reflection to look at OrderService. There is no @Transactional anywhere, so there is no reason to make a proxy, and it registers the OrderService object as the bean as it is.', ann ? 'good' : '');
      } else {
        st.fw = 'Part not registered'; st.fwK = 'bad'; st.run = ann ? 'Visible' : 'Absent'; st.runOn = ann;
        push('new AnnotationConfigApplicationContext(AppConfig.class): the Spring container reads AppConfig. @EnableTransactionManagement is absent, so the part that finds @Transactional and makes a proxy is not registered. The orderService bean is registered as the OrderService object as it is. Even though the tag is there, nothing reads it.', ann ? 'bad' : '');
      }
      st.run = ann ? 'Visible' : 'Absent'; st.runOn = ann; st.out.push('Is @Transactional visible: ' + ann);
      push('order.isAnnotationPresent(Transactional.class) runs: this asks directly, with reflection, whether @Transactional is on order(). The result is ' + ann + '. ' + (ann ? 'It is RUNTIME, so the tag remains until run time. The check Spring made while creating the bean is based on the same reflection information (getDeclaredAnnotations).' : 'We did not add it, so it is absent.'), ann ? 'good' : '');
      var cls = proxy ? 'OrderService$$SpringCGLIB$$0' : 'OrderService';
      st.out.push('Class of service: ' + cls);
      push(bean ? 'ctx.getBean(OrderService.class): you get the bean from Spring. The class of the object you got is ' + (proxy ? 'OrderService$$SpringCGLIB$$0, that is, a proxy that Spring made.' : 'OrderService as it is. It is not a proxy.') : 'new OrderService(): you create the object directly without going through Spring. The class is OrderService as it is.' + (made ? ' Spring made a proxy only for the orderService bean in the container, and it does not know an object created separately like this.' : ''), proxy ? 'good' : (ann ? 'bad' : ''));
      st.out.push('order ran, in a transaction: ' + proxy);
      if (proxy) push('service.order() runs: service is a proxy. The proxy first starts a transaction with the transaction manager (DataSourceTransactionManager) and then calls order() of the original OrderService object. Inside it, isActualTransactionActive() is true. When order() ends, the proxy commits.', 'good');
      else push('service.order() runs: service is the OrderService object as it is, so order() runs right away. Nothing started a transaction, so isActualTransactionActive() is false.' + (ann ? ' The tag is clearly there in the source code, in the class file, and at run time. It is only that the object did not go through the reader that reads the tag and acts.' : ''), ann ? 'bad' : '');
      if (proxy) sum.push('@Transactional does nothing by itself. When Spring creates the bean, it finds this tag with reflection, makes a proxy, and puts the start and commit of a transaction before and after the method. So that the tag remains until run time, the declaration of @Transactional has @Retention(RetentionPolicy.RUNTIME).');
      else if (ann && !en) sum.push('The part that reads @Transactional and makes a proxy is registered by @EnableTransactionManagement. Without it, there is no reader even though the tag is there. If you use Spring Boot, auto-configuration does this for you, so you do not have to write it yourself.');
      else if (ann) sum.push('What Spring reads the tag and acts on is only the beans that Spring made. An object you create directly with new does not go through the proxy even though it has the tag, so there is no transaction.');
      else sum.push('Without the tag, Spring has no reason to make a proxy. The object you get is OrderService as it is, and there is no transaction.');
      return done(ann ? 'Visible' : '(not added)', proxy ? 'Spring (transaction through a proxy)' : 'None', '', proxy ? 'order: in a transaction' : 'order: no transaction');
    }

    if (t === 'test') {
      var both = !!c.sub;
      st.src = both ? 'On both methods' : 'On adds() only'; st.fwT = 'JUnit';
      push('CalcTest is a test class made as an example. We added @Test, which JUnit provides, ' + (both ? 'to both adds() and subtracts().' : 'to adds() only.') + ' The real declaration of @Test (junit-jupiter-api 6.0.3) has @Target({ElementType.ANNOTATION_TYPE, ElementType.METHOD}) and @Retention(RetentionPolicy.RUNTIME).');
      st.cc = 'Target check: passed'; st.ccK = 'good'; st.comp = 'Succeeded'; st.cls = 'Kept (RUNTIME)'; st.clsOn = true;
      push('javac compiles it: the compiler only checks that this is a place where @Test may be put. It is RUNTIME, so the tag is written to RuntimeVisibleAnnotations of CalcTest.class. This class has no main, so compiling alone runs nothing.', 'good');
      st.run = 'Visible'; st.runOn = true; st.fw = 'Tests found: ' + (both ? 2 : 1); st.fwK = 'good'; st.fwOn = true;
      push('JUnit receives the CalcTest class and looks for tests: it uses reflection to look at the methods one at a time and picks only the methods that have @Test as tests. The tests it found are ' + (both ? 'adds() and subtracts(), 2 in all.' : 'adds(), 1 in all. It does not pick subtracts() because it has no @Test.'), 'good');
      st.out.push('adds ran'); if (both) st.out.push('subtracts ran');
      push('JUnit creates a CalcTest object and calls the test methods it found: ' + (both ? '"adds ran" and "subtracts ran" are printed, and both assertEquals are correct, so both pass.' : '"adds ran" is printed and assertEquals is correct, so it passes. subtracts() is never called. There is no error or warning.'), both ? 'good' : 'hot');
      sum.push('JUnit uses reflection at run time to find the methods that have @Test and runs them as tests. A method that is missing @Test stays an ordinary method that is not a test, and nobody calls it. So if the number of tests is smaller than you expected, check that no @Test is missing.');
      return done('Visible', 'JUnit (tests run: ' + (both ? 2 : 1) + ')', '', 'Tests run: ' + (both ? 2 : 1));
    }

    if (t === 'retention') {
      st.src = 'All three present'; st.fwT = 'Reflection code in main';
      push('PriceService is a class made as an example. We put one standard annotation on each of three methods, and the @Retention written in the declaration of each annotation is different. Java\'s @Override is @Retention(RetentionPolicy.SOURCE), Spring 7\'s @Contract (org.springframework.lang.Contract) has no @Retention written, so it takes the default, CLASS, and Spring\'s @Transactional is @Retention(RetentionPolicy.RUNTIME). @Contract is an annotation made so that static analysis tools read from the class file the relationship between the input and the result of a method ("passing null fails").');
      if (c.misplace) {
        st.cc = 'Target check: error'; st.ccK = 'bad';
        var TMSG = 'annotation interface not applicable to this kind of declaration';
        push('We also put @Transactional above the field count: the compiler reads the declaration of @Transactional from Transactional.class in spring-tx. The @Target({ElementType.TYPE, ElementType.METHOD}) in that declaration means "it can be put only on type declarations such as classes, and on methods", but we put it on a field. This is a compile-time error, and the compiler reports "' + TMSG + '" (the annotation cannot be put on this kind of declaration).', 'bad');
        push('Compiling failed: no class file is created, so it cannot run. The one that reads @Target and enforces it is the compiler, and it stops you from putting the tag in the wrong place and then wandering around asking "why is no transaction applied?"', 'bad');
        sum.push('@Target decides where an annotation can be put. @Transactional is TYPE and METHOD, @Override is METHOD, and @Test is METHOD and ANNOTATION_TYPE. Putting it somewhere that does not match is a compile-time error.');
        return fail('@Transactional', TMSG, 'Compiler (reports an error)');
      }
      st.cc = '@Override check: passed'; st.ccK = 'good'; st.comp = 'Succeeded';
      push('javac compiles it: the compiler reads @Override and checks that toString() really overrides toString() of the supertype (Object). It passes. It is SOURCE, so @Override is discarded when this check ends.', 'good');
      st.cls = 'Only @Override is gone'; st.clsOn = true;
      push('Look at the PriceService.class that was created with javap -v: toString() has no annotation record. round() has @Contract in RuntimeInvisibleAnnotations (the slot that is not shown at run time), and save() has @Transactional in RuntimeVisibleAnnotations (the slot that is also shown at run time). CLASS and RUNTIME both remain in the class file, but they are written in different slots.');
      st.run = 'Only @Transactional'; st.runOn = true; st.fw = 'Only @Transactional'; st.fwK = 'good'; st.fwOn = true;
      st.out.push('toString: []', 'round: []', 'save: [@Transactional]');
      push('getDeclaredAnnotations() takes the annotations of the three methods at run time: toString is [] (SOURCE, not in the class file either). round is also [] (CLASS, it is in the class file, but the JVM does not show it to reflection). Only save is [@Transactional] (RUNTIME). This is why Spring can find @Transactional.', 'good');
      sum.push('SOURCE is for a tag that only the compiler needs to read (@Override), CLASS is for a tag for tools that read the class file (@Contract), and RUNTIME is for a tag that a framework reads at run time (@Transactional, @Test). Which one it is gets decided by whoever made the annotation, in the declaration, so the side that uses it does not have to choose.');
      return done('Only @Transactional is visible', 'Reflection code in main (only reads)', '', 'Only @Transactional');
    }

    if (t === 'override') {
      var typo = !!c.typo, has = !!c.ov;
      st.src = has ? 'Present' : 'Not added'; st.srcOn = has; st.fw = 'None (SOURCE)';
      push('Animal and Dog are classes made as examples. Animal has a sound() method, and Dog extends Animal: the code means to redefine (override) sound() in Dog so that it returns "Woof".' + (typo ? ' But the name of the method in Dog is misspelled as sount.' : '') + (has ? ' The real declaration of @Override, which Java provides, has @Target(ElementType.METHOD) and @Retention(RetentionPolicy.SOURCE).' : ''), typo ? 'hot' : '');
      var MSG = 'method does not override or implement a method from a supertype';
      if (has && typo) {
        st.cc = 'Override check: error'; st.ccK = 'bad';
        push('The compiler reads the @Override above sount(): @Override is a tag that says "the method right below it overrides a method of the supertype", and the compiler checks whether that is true. Animal has no sount(). This is a compile-time error, and the compiler reports "' + MSG + '" (it neither overrides nor implements a method of the supertype).', 'good');
        push('Compiling failed: no class file is created, so the program cannot run. The mistake of misspelling the name showed up before running.', 'bad');
        sum.push('What reads @Override is the compiler. If you misspell the name or the parameters of the method you meant to override, it tells you through a compile-time error.');
        return fail('@Override', MSG, 'Compiler (reports an error)');
      }
      if (has) { st.cc = 'Override check: passed'; st.ccK = 'good'; push('The compiler reads the @Override above sound(): it checks whether the method right below really overrides a method of the supertype. Animal has sound(), so it passes.', 'good'); }
      else if (typo) { st.cc = 'Not checked'; st.ccK = 'plain'; push('The compiler looks at sount() of Dog: there is no @Override, so it does not check "whether this is a correct override". sount() is treated as a new method added to Dog, unrelated to sound(), and it compiles as is. There is no error or warning.', 'bad'); }
      else { st.cc = 'Not checked'; st.ccK = 'plain'; push('The compiler looks at sound() of Dog: the name and parameters are the same as sound() of Animal, so it overrides. It overrides even without @Override, but nobody checked that it was written correctly.', ''); }
      st.comp = 'Succeeded'; st.cls = has ? 'Not kept' : 'Absent'; st.run = has ? 'Not visible' : 'Absent';
      push('Compiling succeeded: Dog.class is created.' + (has ? ' @Override is SOURCE, so after the compiler\'s check it is not written to the class file (seen with javap -v, Dog.class has no annotation record). There is no trace at run time.' : ''), 'good');
      var res = typo ? '...' : 'Woof';
      st.out.push(res);
      push('a.sound() runs: the object that a refers to is a Dog. ' + (typo ? 'Dog does not have sound() (it has only sount()). So the sound() inherited from Animal runs and prints "...". A method different from what you intended ran, with no error.' : 'The sound() that Dog overrode runs and prints "Woof".'), typo ? 'bad' : 'good');
      if (typo) sum.push('Without @Override, a method whose name was misspelled compiles quietly as a "new method", and the parent\'s method that you meant to override runs as it is. If you add @Override, the same mistake becomes a compile-time error.');
      else if (has) sum.push('@Override does not change the behavior. The output is the same whether you add it or remove it. It does one thing, "make the compiler check that this is a correct override". That is why you always put it on a method that overrides.');
      else sum.push('The name is written correctly, so it overrides even without @Override. But if the name of the parent\'s method is changed later, this method stops being an override with no notice. If you keep @Override on it, you learn about it then through a compile-time error.');
      return done(has ? 'Not visible (SOURCE)' : '(not added)', has ? 'Compiler (check passed)' : 'None', '', typo ? 'sound of Animal ran' : 'sound of Dog ran');
    }

    if (t === 'deprecated') {
      var old = !!c.old;
      st.src = old ? 'On Integer in the JDK' : 'Absent where used'; st.srcOn = old;
      push(old ? 'Integer is a class provided by Java. The declaration of the constructor Integer(int) has @Deprecated(since = "9", forRemoval = true). It means that from Java 9 you are told not to use it, and that it is planned to be removed. The declaration of @Deprecated has @Retention(RetentionPolicy.RUNTIME).' : 'Integer.valueOf(5) is the way Java recommends, and @Deprecated is not on it.');
      st.cls = old ? 'Kept in Integer.class' : 'Absent'; st.clsOn = old; st.ccAt = 'cls';
      if (old) {
        st.cc = '1 warning'; st.ccK = 'hot'; st.comp = 'Succeeded (warning)';
        push('javac compiles new Integer(5): the compiler does not read the source code of Integer in the JDK; it reads Integer.class, which the JDK provides as a class file, to get the constructor information, sees the @Deprecated(forRemoval = true) that remains there, and warns: "warning: [removal] Integer(int) in Integer has been deprecated and marked for removal". It is only a warning, so compiling succeeds. If the tag had not remained in the class file (if it had been SOURCE), it could not give this warning.', 'hot');
      } else {
        st.cc = 'No warning'; st.ccK = 'good'; st.comp = 'Succeeded';
        push('javac compiles Integer.valueOf(5): it reads the information of valueOf(int) from Integer.class, but @Deprecated is not there, so it compiles with no warning.', 'good');
      }
      st.run = old ? 'Visible (RUNTIME)' : 'Absent'; st.runOn = old; st.out.push('6');
      push('It runs: a is an Integer object that holds 5, and a + 1 is 6. ' + (old ? '@Deprecated does not change the behavior. Even if you ignore the warning, the result of running is the same.' : ''));
      if (old) sum.push('What reads @Deprecated is the compiler, and where it reads it is not our source but the class file of the library. So @Deprecated has to remain in the class file, and it is declared RUNTIME so that you can also check it with reflection at run time. With forRemoval = true the warning is on by default, so you see it even if you just compile.');
      else sum.push('An API that does not have @Deprecated compiles with no warning. For Integer, you are recommended to use Integer.valueOf instead of the constructor.');
      return done(old ? 'Visible (@Deprecated on Integer(int))' : '(not on it)', old ? 'Compiler (warning)' : 'None', old ? 'Succeeded (warning)' : 'Succeeded', 'Prints 6');
    }

    if (t === 'funcif') {
      var fi = !!c.fi, two = !!c.two;
      st.src = fi ? 'Present' : 'Not added'; st.srcOn = fi;
      push('PriceRule is an interface made as an example, and it has ' + (two ? '2 abstract methods, apply and undo.' : '1 abstract method, apply.') + (fi ? ' Above it we added @FunctionalInterface, which Java provides. It is a tag that says "this is an interface to be used as a lambda", that is, that it has exactly one abstract method. Java\'s Runnable and Comparator have it too.' : ' We did not add @FunctionalInterface.'), two ? 'hot' : '');
      var FMSG = 'Unexpected @FunctionalInterface annotation', LMSG = 'incompatible types: PriceRule is not a functional interface';
      if (fi && two) {
        st.cc = 'Method check: error'; st.ccK = 'bad';
        push('The compiler reads @FunctionalInterface and counts the abstract methods of PriceRule: there are 2, so it is a compile-time error. The compiler reports at the place of the declaration (the @FunctionalInterface line) "' + FMSG + '" (PriceRule is not a functional interface; it has several abstract methods). There is one more error on the line that uses the lambda.', 'good');
        push('Compiling failed: it cannot run.', 'bad');
        sum.push('If you add @FunctionalInterface, the moment the interface no longer has exactly one abstract method, the compiler tells you at the place where the interface is declared. Even if the places that use the lambda are scattered over several files, you can see right away where the cause is.');
        return fail('@FunctionalInterface', FMSG, 'Compiler (reports an error)');
      }
      if (two) {
        st.cc = 'Lambda check: error'; st.ccK = 'bad';
        push('There is no @FunctionalInterface, so the compiler checks nothing at the declaration of PriceRule. Instead, it reports the error "' + LMSG + '" (PriceRule is not a functional interface) on the line that uses the lambda. The error appears not at the declaration but at the place of use.', 'bad');
        push('Compiling failed: it cannot run.', 'bad');
        sum.push('Even without @FunctionalInterface, an interface with two abstract methods cannot be used as a lambda. But the error appears at every place that uses a lambda, so you have to go find the declaration of the interface that is the cause.');
        return fail('PriceRule half', LMSG, '(not added)');
      }
      st.cc = fi ? 'Method check: passed' : 'Not checked'; st.ccK = fi ? 'good' : 'plain'; st.comp = 'Succeeded';
      st.cls = fi ? 'Kept (RUNTIME)' : 'Absent'; st.clsOn = fi; st.run = fi ? 'Visible' : 'Absent'; st.runOn = fi;
      push(fi ? 'The compiler reads @FunctionalInterface and checks that apply is the only abstract method. It passes. The declaration of @FunctionalInterface is @Retention(RetentionPolicy.RUNTIME), so the tag remains in PriceRule.class too.' : 'The compiler matches the lambda price -> price / 2 to apply of PriceRule. It has only one abstract method, so it can be used as a lambda even without @FunctionalInterface.', 'good');
      st.out.push('500');
      push('half.apply(1000) runs: the lambda calculates 1000 / 2 and prints 500.');
      sum.push(fi ? '@FunctionalInterface does not change the behavior. It only makes the compiler keep the promise that there is exactly one abstract method.' : 'Whether it can be used as a lambda is decided by the number of abstract methods. @FunctionalInterface is a tag that lets that condition be checked at the place of the declaration.');
      return done(fi ? 'Visible' : '(not added)', fi ? 'Compiler (check passed)' : 'None', '', 'Prints 500');
    }

    // custom: our own @Timed
    var rt = c.ret === 'RUNTIME';
    st.src = 'Present'; st.fwT = 'Reflection code in main';
    push('@interface Timed is the syntax for making an annotation yourself, and Service is a class made as an example. ' + (rt ? 'We wrote @Retention(RetentionPolicy.RUNTIME).' : 'We did not write @Retention. If you do not write it, it takes the default, CLASS.') + ' It is @Target(ElementType.METHOD), so it can be put only on methods.', rt ? '' : 'hot');
    st.cc = 'Target check: passed'; st.ccK = 'good'; st.comp = 'Succeeded'; st.cls = rt ? 'Kept (RUNTIME)' : 'Kept (CLASS)'; st.clsOn = true;
    push('It compiles: the @Timed tag is written to ' + (rt ? 'RuntimeVisibleAnnotations (the slot that is also shown at run time)' : 'RuntimeInvisibleAnnotations (the slot that is not shown at run time)') + ' of Service.class.', 'good');
    st.run = rt ? 'Visible' : 'Not visible'; st.runOn = rt; st.fw = rt ? 'Finds tag, wraps work' : 'Finds no tag'; st.fwK = rt ? 'good' : 'bad'; st.fwOn = true;
    st.out.push('Is @Timed visible: ' + rt);
    push('m.isAnnotationPresent(Timed.class) runs: the result is ' + rt + '. ' + (rt ? 'It is RUNTIME, so the tag remains until run time.' : 'The tag is in the class file, but the JVM does not show a tag kept as CLASS to reflection. There is no error either.'), rt ? 'good' : 'bad');
    if (rt) st.out.push('[Timing starts]', 'work ran', '[Timing ends]'); else st.out.push('work ran');
    push(rt ? 'found is true, so the reading code we wrote adds output before and after work. It is a very small imitation of how Spring reads @Transactional and puts a transaction before and after with a proxy.' : 'found is false, so only work runs. Even though @Timed is on it in the source code, to the reading code it is the same as a method with no tag.', rt ? 'good' : 'bad');
    sum.push(rt ? 'You can make an annotation yourself, and to read it at run time you have to write @Retention(RetentionPolicy.RUNTIME) and write the reading code yourself. Spring\'s @Transactional and JUnit\'s @Test already have both.' : 'If you leave out @Retention on an annotation you made yourself, it takes the default, CLASS, and the code that reads at run time quietly finds nothing. Write RUNTIME on an annotation that will be read at run time.');
    return done(rt ? 'Visible' : 'Not visible (CLASS)', rt ? 'Reflection code in main' : 'None (finds nothing)', '', rt ? 'Output wraps work' : 'Only work ran');
  },
  render: function (v, sim, t, H, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : null;
    if (!s) { H.text(v, 'Click Run to see, in the order source code, class file, and run time, how far the tag remains and who reads it.'); return; }
    H.title(v, 'Console output');
    v.appendChild(H.el('pre', 'code', s.out.length ? s.out.join('\n') : '(nothing yet)'));
    H.counters(v, [[s.end, 'Program']]);
  },
  // Diagram: in the upper row, the three stages source code, class file, and run time, with whether the tag remains at each stage. In the lower row, the readers of that tag (the compiler, and the reader at run time), with an arrow to the stage each one reads.
  draw: function (P, sim, shown) {
    var c = sim.c, mark = this.mark(c), last = shown[shown.length - 1];
    var s = last ? last.snap : { src: '', cls: '?', run: '?', srcOn: false, clsOn: false, runOn: false, cc: 'Not yet', ccK: '', ccAt: 'src', fwT: 'Reader at run time', fw: 'Not yet', fwK: 'ghost', fwOn: false, comp: '?', out: [], end: '?' };
    var err = s.comp === 'Error';
    P.size(680, 292);
    P.region('life', 16, 16, 648, 96, 'Where the ' + mark + ' tag remains');
    P.box('src', 30, 46, 196, 54, { cls: !last ? 'ghost' : s.srcOn ? 'wait' : 'plain', title: 'Source code (.java)', sub: s.src || 'Not yet' });
    P.box('cls', 242, 46, 196, 54, { cls: err ? 'plain' : s.clsOn ? 'wait' : s.cls === '?' ? 'ghost' : 'plain', title: 'Class file (.class)', sub: err ? 'Not created' : s.cls === '?' ? 'Not yet' : s.cls });
    P.box('run', 454, 46, 196, 54, { cls: err ? 'plain' : s.runOn ? 'wait' : s.run === '?' ? 'ghost' : 'plain', title: 'Run time (JVM)', sub: err ? 'Cannot run' : s.run === '?' ? 'Not yet' : s.run });
    P.arrow('c1', 'src:r', 'cls:l', { cls: err ? 'bad' : s.clsOn ? 'good' : 'mut dash' });
    P.arrow('c2', 'cls:r', 'run:l', { cls: s.runOn ? 'good' : 'mut dash' });
    P.region('readers', 16, 126, 648, 96, 'Who reads the tag');
    P.box('rd1', 30, 156, 196, 54, { cls: s.ccK === 'bad' ? 'bad now' : s.ccK === 'good' ? 'good' : s.ccK === 'hot' ? 'wait now' : 'plain', title: 'Compiler', sub: s.cc });
    P.box('rd2', 454, 156, 196, 54, { cls: !s.fwOn ? 'ghost' : s.fwK === 'good' ? 'good now' : s.fwK === 'bad' ? 'bad now' : 'plain', title: s.fwT, sub: s.fw });
    if (s.ccK === 'good' || s.ccK === 'bad' || s.ccK === 'hot') P.arrow('r1', 'rd1:t', (s.ccAt === 'cls' ? 'cls' : 'src') + ':b', { cls: s.ccK === 'bad' ? 'bad' : 'good' });
    if (s.fwOn && (s.fwK === 'good' || s.fwK === 'bad')) P.arrow('r2', 'rd2:t', 'run:b', { cls: s.fwK === 'good' ? 'good' : 'bad' });
    P.box('o1', 16, 238, 320, 36, { cls: s.comp === '?' ? 'ghost' : err ? 'bad' : 'good', title: 'Compile', right: s.comp });
    var result = s.res || '?';
    P.box('o2', 344, 238, 320, 36, { cls: result === '?' ? 'ghost' : err ? 'bad' : 'plain', title: 'Run result', right: result });
    P.note('The upper row shows how far the tag remains (the @Retention of the annotation declaration decides it), and the lower row shows who reads that tag.');
  },
  assume: 'Twenty-four combinations (@Transactional 8, @Test 2, retention policies 2, @Override 4, @Deprecated 2, @FunctionalInterface 4, and our own @Timed 2) were compiled and run on JDK 21 with the code on the screen as it is, and checked. For @Transactional, a real container was started with Spring 7.0.9 and an H2 in-memory database, and I also checked whether the object you get is a proxy, whether @EnableTransactionManagement registers the auto-proxy creator, and how many transactions were started and committed by one call to order() (counted with a listener attached to the transaction manager). @Test was run with the Launcher of JUnit 6.0.3, and the number of tests found and the number that passed were checked. The compiler messages were received in English, and in which slot of the class file (RuntimeVisibleAnnotations or RuntimeInvisibleAnnotations) an annotation was written was checked with javap -v. The @Retention and @Target of the standard annotations mentioned in the text, and the @Deprecated value on Integer(int), were read with reflection from libraries of the same versions and checked. The code on the screen omits the import statements and the Main class and main declaration (the @Test code shows the imports too). That Spring finds annotations based on getDeclaredAnnotations of Java reflection, that Spring\'s @Contract is made for static analysis tools to read, and that Spring Boot\'s auto-configuration takes the place of @EnableTransactionManagement are explanations written after reading the Spring documentation and source, and they were not checked by running. Tools that read annotations at compile time and generate code (annotation processors) are not covered.',
});

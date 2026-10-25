Lab.register({
  id: 'lifecycle', nav: 'Bean lifecycle callbacks', cat: 'Spring', mode: 'step',
  title: 'Why is an injected field null when you use it in the constructor?',
  why: 'If you put preparation work in the constructor, the dependencies that are injected through fields or setters are still empty and cannot be used, and there was also no separate place to clean up resources when the application ends. Bean lifecycle callbacks make the container call methods you designate right after dependency injection is finished and right before the container is closed, so you can do preparation and cleanup at the right time.',
  use: 'You use them for tasks such as reading frequently used code tables or setting values in advance when the application starts, opening a connection to an external server and closing it at shutdown, and stopping a thread pool you created yourself. Usually you use @PostConstruct and @PreDestroy, and for a class from an external library whose source you cannot change, you use initMethod and destroyMethod of @Bean.',
  intro: 'The container handles a bean in a fixed order. It creates the object with the constructor, injects the dependencies, calls the initialization callbacks, lets the bean be used, and calls the destruction callbacks when the container is closed.',
  terms: ['Bean lifecycle', '@PostConstruct and @PreDestroy', 'InitializingBean and DisposableBean', 'Constructor injection, setter injection, and field injection', '@Configuration and @Bean'],
  controls: [
    { id: 'inj', label: 'How PriceCache receives PriceRepository', type: 'select', value: 'field', options: [['field', 'Field injection (@Autowired)'], ['ctor', 'Constructor injection']] },
    { id: 'cb', label: 'Where the price list is read (initialization) and cleared (cleanup)', type: 'select', value: 'ctor', options: [['ctor', 'Read inside the constructor (no callbacks)'], ['anno', '@PostConstruct and @PreDestroy'], ['iface', 'InitializingBean and DisposableBean'], ['method', 'initMethod and destroyMethod of @Bean'], ['all', 'All three kinds of callbacks']] },
    { id: 'scope', label: 'Scope of the PriceCache bean', type: 'select', value: 'singleton', options: [['singleton', 'Singleton'], ['prototype', 'Prototype']] },
  ],
  presets: [
    { t: 'Default settings', q: 'What happens when PriceCache receives PriceRepository through field injection (@Autowired) and reads the price list inside the constructor?', d: 'Field injection, but the constructor uses repository. Startup fails.', v: { inj: 'field', cb: 'ctor', scope: 'singleton' } },
    { t: 'Moving the work to @PostConstruct', q: 'What if you move reading and clearing the price list to @PostConstruct and @PreDestroy?', d: 'It is called after injection finishes, so repository can be used.', v: { inj: 'field', cb: 'anno', scope: 'singleton' } },
    { t: 'With constructor injection', q: 'What if PriceCache receives PriceRepository through constructor injection?', d: 'Inside the constructor, repository is already set.', v: { inj: 'ctor', cb: 'ctor', scope: 'singleton' } },
    { t: 'Using all three kinds of callbacks', q: 'What if you use all three kinds of callbacks for reading and clearing the price list?', d: 'See the order to find out which one is called first.', v: { inj: 'field', cb: 'all', scope: 'singleton' } },
    { t: 'initMethod of @Bean', q: 'What if you use initMethod and destroyMethod of @Bean for reading and clearing the price list?', d: 'The method name is specified in the configuration, with no annotation on the class.', v: { inj: 'field', cb: 'method', scope: 'singleton' } },
    { t: 'With a prototype bean', q: 'What if you use @PostConstruct and @PreDestroy and change the scope of the PriceCache bean to Prototype?', d: 'The initialization callback is called, but the destruction callback is not.', v: { inj: 'field', cb: 'anno', scope: 'prototype' } },
    { t: 'InitializingBean and DisposableBean', q: 'What if you use InitializingBean and DisposableBean for reading and clearing the price list?', d: 'This approach implements interfaces of Spring.', v: { inj: 'field', cb: 'iface', scope: 'singleton' } },
  ],
  // The callback list determined by the settings: [name for the record, name shown in the table, name used in sentences]
  callbacks: function (c) {
    var anno = c.cb === 'anno' || c.cb === 'all', iface = c.cb === 'iface' || c.cb === 'all', bean = c.cb === 'method' || c.cb === 'all', inits = [], dests = [];
    if (anno) { inits.push(['PostConstruct', '@PostConstruct', 'the load() method annotated with @PostConstruct']); dests.push(['PreDestroy', '@PreDestroy', 'the clear() method annotated with @PreDestroy']); }
    if (iface) { inits.push(['afterPropertiesSet', 'afterPropertiesSet()', 'the afterPropertiesSet() method of InitializingBean']); dests.push(['destroy', 'destroy()', 'the destroy() method of DisposableBean']); }
    if (bean) { inits.push(['init', 'init()', 'the init() method specified as the initMethod of @Bean']); dests.push(['close', 'close()', 'the close() method specified as the destroyMethod of @Bean']); }
    return { anno: anno, iface: iface, bean: bean, inits: inits, dests: dests };
  },
  code: function (c) {
    var k = this.callbacks(c), field = c.inj === 'field', proto = c.scope === 'prototype';
    var load = '        prices = repository.findAll();        // reads the price list in advance\n', clear = '        prices.clear();\n';
    var s = (k.bean ? '' : '@Component\n' + (proto ? '@Scope("prototype")\n' : '')) + 'class PriceCache' + (k.iface ? ' implements InitializingBean, DisposableBean' : '') + ' {\n';
    s += field ? '    @Autowired\n    private PriceRepository repository;\n' : '    private final PriceRepository repository;\n';
    s += '    private Map<String, Integer> prices;\n\n';
    s += field ? '    PriceCache() {\n' : '    PriceCache(PriceRepository repository) {\n        this.repository = repository;\n';
    s += '        System.out.println("constructor: repository = " + this.repository);\n';
    if (c.cb === 'ctor') s += '        prices = this.repository.findAll();   // reads the price list in advance\n';
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
    out.push('@Component\nclass PriceRepository {\n    Map<String, Integer> findAll() {\n        return new HashMap<>(Map.of("apple", 1000));\n    }\n}');
    out.push('// Where it is used: only the lines inside a method are shown (the method declaration and the code that gets context omitted)\nPriceCache priceCache = context.getBean(PriceCache.class);\nint price = priceCache.price("apple");\ncontext.close();                              // closes the container');
    return out.join('\n\n');
  },
  label: function (c) { return (c.inj === 'field' ? 'Field injection' : 'Constructor injection') + ' · ' + { ctor: 'initialized in the constructor', anno: '@PostConstruct', iface: 'InitializingBean', method: 'initMethod', all: 'three kinds of callbacks' }[c.cb] + (c.scope === 'prototype' ? ' · prototype' : ''); },
  columns: ['Result', 'repository as seen inside the constructor', 'Order in which the initialization callbacks were called', 'Order in which the destruction callbacks were called'],
  simulate: function (c) {
    var k = this.callbacks(c), field = c.inj === 'field', proto = c.scope === 'prototype', inCtor = c.cb === 'ctor', ev = [], sum = [], seq = [];
    var st = { cur: '', stage: { ctor: '', inject: '', init: '', use: '', destroy: '' }, bad: '', obj: false, repo: '', prices: '', log: [], phase: 'Starting up', result: '' };
    function push(s, kind) { ev.push({ s: s, k: kind, snap: JSON.parse(JSON.stringify(st)) }); }
    function mark(tok, word) { seq.push(tok); st.log.push(word); }
    var failed = '', chain = [], price = '-';
    // How the container creates one PriceCache object and finishes initializing it. Returns false on failure
    function create() {
      st.cur = 'ctor'; st.obj = true;
      var how = k.bean ? (field ? 'The container calls the priceCache() method of AppConfig, and new PriceCache() inside it runs the constructor.' : 'The container calls the priceCache(repository) method of AppConfig, passing the PriceRepository bean as the argument, and new PriceCache(repository) inside it runs the constructor.') : (field ? 'The container calls the constructor of PriceCache to create the object.' : 'The container calls the constructor of PriceCache, passing the PriceRepository bean as the argument.');
      if (field) {
        st.repo = 'null'; st.stage.ctor = 'repository = null'; mark('ctor:null', 'Constructor (repository = null)');
        push('Constructor: ' + how + ' Field injection happens after the object is created, so repository as seen inside the constructor is still null.', inCtor ? 'bad' : '');
        if (inCtor) {
          failed = 'NullPointerException'; chain = ['BeanCreationException', 'BeanInstantiationException', 'NullPointerException']; st.bad = 'ctor'; st.stage.ctor = 'NullPointerException'; st.obj = false;
          push('this.repository.findAll() inside the constructor: repository is null, so a NullPointerException is thrown. The constructor could not finish, so the object was not created, and ' + (proto ? 'getBean throws an exception.' : 'the container aborts startup.'), 'bad');
          return false;
        }
        st.cur = 'inject'; st.repo = 'injected'; st.stage.inject = 'Set in the field';
        push('Dependency injection: The container sets the PriceRepository bean in the repository field, which is annotated with @Autowired. From now on, repository can be used.', '');
      } else {
        st.repo = 'injected'; st.stage.ctor = 'repository received as an argument'; st.stage.inject = 'Finished together in the constructor'; mark('ctor:set', 'Constructor (repository set)');
        push('Constructor: ' + how + ' With constructor injection, creating the object and injecting the dependency happen in one step, so repository is already set inside the constructor.', 'good');
        if (inCtor) { st.prices = 'loaded'; push('this.repository.findAll() inside the constructor: repository is set, so the price list is read, and prices is set to refer to that Map.', 'good'); }
      }
      st.cur = 'init';
      if (!k.inits.length) { st.stage.init = 'No callback'; return true; }
      k.inits.forEach(function (cbk, i) {
        mark(cbk[0] + ':set', cbk[1]); st.stage.init = k.inits.slice(0, i + 1).map(function (x) { return x[1]; }).join(' → ');
        if (i === 0) { st.prices = 'loaded'; push('Initialization callback: The container calls ' + cbk[2] + '. It is called after dependency injection finishes, so repository can be used. The price list is read, and prices is set to refer to that Map.', 'good'); }
        else push('Initialization callback: Next, the container calls ' + cbk[2] + '.' + (i === 1 ? ' The method marked with an annotation comes first, and the interface method comes next.' : ' The method specified by name in @Bean comes last.'), '');
      });
      return true;
    }
    var name = proto ? 'prototype' : 'singleton', done = true;
    push('Container startup: The container registers two beans, priceRepository and priceCache. The scope of priceCache is ' + name + '.' + (proto ? '' : ' Singleton beans are created during startup.'), '');
    if (!proto) {
      done = create();
      if (!done) {
        st.result = 'Startup failed'; st.phase = 'Startup failed';
      } else {
        st.cur = ''; st.phase = 'Startup complete'; mark('STARTED', 'Startup complete');
        push('Startup has finished. The PriceCache bean is in the container, fully initialized.', '');
      }
    } else {
      st.phase = 'Startup complete'; mark('STARTED', 'Startup complete');
      push('Startup has finished. A prototype bean is created when something asks for it, so there is no PriceCache object yet.', '');
      push('context.getBean(PriceCache.class): The container now starts creating a new PriceCache object.', '');
      done = create();
      if (!done) { st.result = 'Failed when the bean was retrieved'; sum.push('Startup succeeded, but retrieving the bean failed: NullPointerException. A prototype bean is not created at startup, so the same error shows up not at startup but when the bean is first retrieved and used.'); }
    }
    if (done) {
      st.cur = 'use'; st.stage.use = 'price("apple") = 1000'; price = '1000'; mark('USE', 'Use');
      push((proto ? 'The object is returned, fully initialized. ' : 'context.getBean(PriceCache.class) retrieves the bean. ') + 'priceCache.price("apple"): It returns 1000 from the price list that was read in advance.', 'good');
    }
    if (done || proto) {
      st.cur = 'destroy'; st.phase = 'Closing'; mark('CLOSING', 'Container starts closing');
      if (!done) { st.cur = ''; push('context.close(): The container is closed. No PriceCache object was created, so there is nothing to call.', ''); }
      else if (!k.dests.length) { st.stage.destroy = 'No callback'; push('context.close(): The container is closed. No destruction callback is defined for PriceCache, so nothing is called.', ''); }
      else if (proto) {
        st.stage.destroy = 'Not called'; st.bad = 'destroy';
        push('context.close(): The container is closed. Once the container has created and initialized a prototype bean and handed it over, it does not manage the bean any further. So the destruction callbacks (' + k.dests.map(function (x) { return x[1]; }).join(', ') + ') are not called even though they are defined.', 'bad');
      } else {
        k.dests.forEach(function (cbk, i) {
          mark(cbk[0] + ':set', cbk[1]); st.stage.destroy = k.dests.slice(0, i + 1).map(function (x) { return x[1]; }).join(' → ');
          if (i === 0) { st.prices = 'cleared'; push('context.close(): As the container closes, it calls the destruction callback, ' + cbk[2] + '. The price list is cleared.', 'good'); }
          else push('Destruction callback: Next, the container calls ' + cbk[2] + '. The order is the same as for initialization.', '');
        });
      }
      st.cur = ''; st.phase = 'Closed'; if (done) st.result = 'Success';
    }
    var initCol = !k.inits.length || !done ? 'No callback' : k.inits.map(function (x) { return x[1]; }).join(' → ');
    var destCol = !k.dests.length || !done ? 'No callback' : proto ? 'Not called' : k.dests.map(function (x) { return x[1]; }).join(' → ');
    if (done) {
      if (field) sum.push('With field injection, the object is created first and the field is set afterward. So inside the constructor, a field that is to be injected is null. Put setup work that uses an injected dependency in an initialization callback, not in the constructor.');
      else sum.push('With constructor injection, the dependency can be used right away inside the constructor.' + (inCtor ? ' These settings define no destruction callback, so nothing is called when the container is closed.' : ' The initialization callback is called after the constructor.'));
      if (c.cb === 'anno') sum.push('@PostConstruct and @PreDestroy only need to be put on a method. You do not have to implement an interface of Spring, and this is the approach that the official Spring documentation recommends.');
      if (c.cb === 'iface') sum.push('InitializingBean and DisposableBean are interfaces of Spring. The method names are fixed, and the class must implement the Spring interfaces.');
      if (c.cb === 'method') sum.push('With initMethod and destroyMethod of @Bean, the method names are specified in the configuration. Nothing related to Spring has to be written in the class, so this also works for objects from a library whose source you cannot edit.');
      if (c.cb === 'all') sum.push('When all three are used, initialization is called in the order @PostConstruct → afterPropertiesSet() → initMethod, and destruction in the order @PreDestroy → destroy() → destroyMethod. Usually you choose just one of them.');
      if (proto && k.dests.length) sum.push('For a prototype bean, the container only creates and initializes it. After handing the bean over, the container keeps no record of it, so it does not call the destruction callback even when the container is closed. If something needs to be cleaned up, the code that retrieved the bean must call the cleanup method itself.');
    } else {
      sum.push('The container creates the object with the constructor and then sets the @Autowired field. If the constructor uses that field, it is null.');
      sum.push('There are two ways to fix this. Move the setup work to an initialization callback such as @PostConstruct, or switch to constructor injection and receive the dependency as a constructor argument.');
    }
    var res = done ? 'Success' : proto ? 'Startup succeeded, failed when the bean was retrieved: NullPointerException' : 'Startup failed: NullPointerException';
    return { events: ev, summary: sum, seq: seq, price: price, chain: chain, row: [res, field ? 'null' : 'Already injected', initCol, destCol] };
  },
  render: function (v, sim, t, H, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : null;
    if (!s) { H.text(v, 'Click Run to start the container, use the bean once, and then close the container.'); return; }
    H.title(v, 'Order of the calls');
    H.slots(v, s.log.map(function (w, i) { return [w, w === 'Startup complete' || w === 'Container starts closing' ? 'q' : i === s.log.length - 1 ? 'b' : 'd']; }), 'None yet');
  },
  // Diagram: The five stages of the lifecycle run from top to bottom on the left, and the PriceRepository bean and the PriceCache object inside the container are on the right. The current stage is marked with a thick border.
  draw: function (P, sim, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : { cur: '', stage: { ctor: '', inject: '', init: '', use: '', destroy: '' }, bad: '', obj: false, repo: '', prices: '', log: [], phase: '', result: '' };
    var proto = sim.c.scope === 'prototype', names = [['ctor', '1. Constructor'], ['inject', '2. Dependency injection'], ['init', '3. Initialization callback'], ['use', '4. Use'], ['destroy', '5. Destruction callback']];
    P.size(680, 342);
    names.forEach(function (n, i) {
      var x = s.stage[n[0]];
      P.box('s_' + n[0], 16, 16 + i * 54, 364, 46, { cls: (s.bad === n[0] ? 'bad' : !x ? (s.cur === n[0] ? 'hot' : 'ghost') : x === 'No callback' ? 'plain' : 'good') + (s.cur === n[0] ? ' now' : ''), title: n[1], sub: x || (s.cur === n[0] ? 'In progress' : 'Not yet') });
      if (i) P.arrow('ar' + i, 's_' + names[i - 1][0] + ':b', 's_' + n[0] + ':t', { cls: 'mut' });
    });
    P.region('ctx', 396, 16, 268, 262, 'Spring container');
    P.box('repo', 408, 50, 244, 46, { cls: 'wait', title: 'priceRepository bean', sub: 'singleton' });
    P.box('cache', 408, 162, 244, 86, { cls: s.bad === 'ctor' ? 'bad' : !s.obj ? 'ghost' : s.prices === 'loaded' ? 'good' : 'hot', title: 'PriceCache object' + (proto ? ' (prototype)' : ''), sub: s.bad === 'ctor' ? ['Could not be created'] : s.obj ? ['repository field: ' + s.repo, 'prices: ' + (s.prices || 'none')].concat(proto ? ['Not kept by the container'] : []) : ['None yet'] });
    if (s.obj && s.repo === 'injected') P.arrow('inj', 'repo:b', 'cache:t', { cls: 'good', label: 'injected' });
    if (s.obj && s.repo === 'null') P.arrow('inj', 'repo:b', 'cache:t', { cls: 'dash mut', label: 'not injected yet' });
    P.box('r1', 16, 292, 648, 36, { cls: !s.result ? 'ghost' : s.result === 'Success' ? 'good' : 'bad', title: 'State', right: s.result ? (s.result === 'Success' ? 'Success' : s.result + ': NullPointerException') : s.phase || 'Not started' });
    P.note('The container handles one bean in order from top to bottom.');
  },
  assume: 'All 20 combinations were run on Spring Boot 4.1.1 (Spring Framework 7.0.9, jakarta.annotation-api 3.0.0) in our test environment and checked against the results. For each combination, source code with the same structure as on the screen was compiled, the container was started, the bean was retrieved and price("apple") was called once, and the container was closed. Along the way, the order in which the constructor and each callback were called, and whether the repository field was null at that moment, were recorded and compared one by one with the order in the model. The exception chain of the startup failure was BeanCreationException → BeanInstantiationException → NullPointerException, and the screen shows the innermost cause. Simplifications on the screen: the "dependency injection" stage cannot be recorded separately, so the fact that the field was null in the constructor and set in the initialization callback was taken as confirmation that injection happened in between. Setter injection, and the destruction order among several beans when the container is closed, are not covered. It was also confirmed by execution that, even when destroyMethod is not written in @Bean, a public close() method is called when the container is closed (and is not called for a prototype bean). Two things were not confirmed by execution and follow the official Spring documentation: that @PostConstruct and @PreDestroy are the recommended approach, and that when the process is forcibly terminated, the container cannot close and the destruction callbacks are not called.',
});

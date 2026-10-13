Lab.register({
  id: 'ioc', nav: 'The Spring container and beans', cat: 'Spring', mode: 'step',
  title: 'You never wrote new, so who creates the object and passes it in?',
  intro: 'For the order service to use a discount policy object, someone has to create that object. If the order service creates it directly with new, the choice of implementation is fixed in the code of the order service. In Spring, the container creates the objects (beans), picks the right one, and injects it wherever it is needed.',
  terms: ['Inversion of Control (IoC)', 'Spring bean', '@Configuration and @Bean', '@Primary and @Qualifier', 'NoSuchBeanDefinitionException and NoUniqueBeanDefinitionException'],
  controls: [
    { id: 'how', label: 'Who creates the discount policy object', type: 'select', value: 'comp', options: [['new', 'OrderService creates it directly with new'], ['comp', 'The container creates it (registered with @Component)'], ['bean', 'The container creates it (registered with a @Bean method)']] },
    { id: 'reg', label: 'Implementations registered as beans', type: 'select', value: 'two', options: [['one', 'Only the implementation you want to use'], ['two', 'Both implementations (nothing marks which to choose)'], ['primary', 'Both implementations, with @Primary on the one you want to use'], ['qualifier', 'Both implementations, with @Qualifier at the injection point'], ['none', 'None registered']], show: function (c) { return c.how !== 'new'; } },
    { id: 'use', label: 'Implementation you want to use', type: 'select', value: 'rate', options: [['fixed', 'FixedDiscountPolicy (always 1000 won off)'], ['rate', 'RateDiscountPolicy (10% off)']], show: function (c) { return c.how === 'new' || c.reg === 'one' || c.reg === 'primary' || c.reg === 'qualifier'; }, hint: 'Change this value and check in the code on the left which file changes.' },
  ],
  presets: [
    { t: 'Default settings', q: 'What happens at startup when both implementations are registered with @Component, with nothing marking which to use, for RateDiscountPolicy?', d: 'Both implementations are registered with @Component. The container cannot choose between them, so startup fails.', v: { how: 'comp', reg: 'two', use: 'rate' } },
    { t: 'Creating it directly with new', q: 'What if OrderService creates the discount policy object directly with new and you want FixedDiscountPolicy?', d: 'The choice of implementation is written inside OrderService. To change it, you edit OrderService.', v: { how: 'new', reg: 'two', use: 'fixed' } },
    { t: 'Only one implementation registered', q: 'What if you register only the implementation you want to use as a bean?', d: 'The container finds the only bean and injects it. OrderService contains no new.', v: { how: 'comp', reg: 'one', use: 'rate' } },
    { t: 'Choosing with @Primary', q: 'What if you register both implementations and put @Primary on the one you want to use?', d: 'Both are registered, and the one to prefer is marked.', v: { how: 'comp', reg: 'primary', use: 'rate' } },
    { t: 'Choosing with @Qualifier', q: 'What if you register both implementations and choose FixedDiscountPolicy with @Qualifier at the injection point?', d: 'The bean name is specified at the injection point.', v: { how: 'comp', reg: 'qualifier', use: 'fixed' } },
    { t: 'Registering with a @Bean method', q: 'What if you register the discount policy with a @Bean method and register only the implementation you want to use?', d: 'The object returned by a method of a configuration class becomes a bean.', v: { how: 'bean', reg: 'one', use: 'rate' } },
    { t: 'With no bean registered', q: 'What if you register no implementation as a bean?', d: 'There is no bean to inject, so startup fails.', v: { how: 'comp', reg: 'none', use: 'rate' } },
  ],
  // Facts determined by the settings: which implementations are registered as beans, and which one is chosen
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
    out.push(impl('FixedDiscountPolicy', '1000', 'always 1000 won', f.regFixed, primary && f.fixed));
    out.push(impl('RateDiscountPolicy', 'price / 10', '10%', f.regRate, primary && !f.fixed));
    var order = '\n    int order(int price) {\n        return price - discountPolicy.discount(price);\n    }\n}';
    if (f.isNew) {
      out.push('class OrderService {\n    private final DiscountPolicy discountPolicy = new ' + f.cls + '();   // creates it and chooses it itself\n' + order);
      out.push('// Where it is used\nOrderService orderService = new OrderService();\nint pay = orderService.order(20000);');
      return out.join('\n\n');
    }
    if (c.how === 'bean') {
      var cfg = '@Configuration\nclass AppConfig {';
      if (f.regFixed) cfg += '\n    @Bean\n' + (primary && f.fixed ? '    @Primary\n' : '') + '    DiscountPolicy fixedDiscountPolicy() {       // the method name is the bean name\n        return new FixedDiscountPolicy();\n    }';
      if (f.regRate) cfg += '\n    @Bean\n' + (primary && !f.fixed ? '    @Primary\n' : '') + '    DiscountPolicy rateDiscountPolicy() {\n        return new RateDiscountPolicy();\n    }';
      if (!f.regFixed && !f.regRate) cfg += '\n    // there are no @Bean methods';
      out.push(cfg + '\n}');
    }
    out.push('@Component\nclass OrderService {\n    private final DiscountPolicy discountPolicy;\n\n    OrderService(' + (c.reg === 'qualifier' ? '@Qualifier("' + f.bean + '") ' : '') + 'DiscountPolicy discountPolicy) {   // the container passes it in\n        this.discountPolicy = discountPolicy;\n    }\n' + order);
    out.push('// Where it is used: retrieved from the container\nOrderService orderService = context.getBean(OrderService.class);\nint pay = orderService.order(20000);');
    return out.join('\n\n');
  },
  label: function (c) {
    if (c.how === 'new') return 'Direct new · ' + (c.use === 'fixed' ? 'Fixed' : 'Rate');
    var pick = c.reg === 'one' || c.reg === 'primary' || c.reg === 'qualifier' ? ' · ' + (c.use === 'fixed' ? 'Fixed' : 'Rate') : '';
    return (c.how === 'comp' ? '@Component' : '@Bean') + ' · ' + { one: 'one registered', two: 'both registered', primary: 'both + @Primary', qualifier: 'both + @Qualifier', none: 'none registered' }[c.reg] + pick;
  },
  columns: ['Result', 'Implementation that OrderService uses', 'Code that created the discount policy object', 'File to edit to change the implementation'],
  simulate: function (c) {
    var f = this.facts(c), ev = [], sum = [], regWord = f.comp ? '@Component' : '@Bean methods';
    var st = { svc: 'none', pick: '', off: '', result: '', beans: {
      fixed: { cls: 'FixedDiscountPolicy', name: 'fixedDiscountPolicy', reg: f.regFixed, mark: c.reg === 'primary' && f.fixed, s: 'none' },
      rate: { cls: 'RateDiscountPolicy', name: 'rateDiscountPolicy', reg: f.regRate, mark: c.reg === 'primary' && !f.fixed, s: 'none' } } };
    var mine = st.beans[f.fixed ? 'fixed' : 'rate'], rest = st.beans[f.fixed ? 'rate' : 'fixed'];
    function push(s, k) { ev.push({ s: s, k: k, snap: JSON.parse(JSON.stringify(st)) }); }
    var row, made = 0, fail = '';
    if (f.isNew) {
      st.svc = 'being created';
      push('new OrderService(): The calling code creates the OrderService object directly. The Spring container is not involved.', '');
      mine.s = 'in'; st.pick = f.cls; st.svc = 'created'; made = 1;
      push('new ' + f.cls + '(): The field initializer of OrderService runs, and OrderService itself creates the discount policy object that it uses. The choice of implementation is also written in the source of OrderService.', '');
      st.off = f.off + ' won'; st.result = 'Ran normally';
      push('orderService.order(20000): The discount method of ' + f.cls + ' returns ' + f.off + ' won, so the amount to pay is ' + (20000 - f.off) + ' won.', '');
      push('To change the implementation to ' + f.other + ': You must open OrderService.java and change the class name after new. If several classes use the discount policy, you must change every one of them.', 'bad');
      sum.push('Both the code that creates the object and the code that chooses the implementation are inside OrderService. OrderService declares the field with the interface type DiscountPolicy, but the moment it names an implementation class after new, it is tied to that implementation.');
      sum.push('Every time the implementation changes, the classes that use it must be edited.');
      row = ['Ran normally (no container)', f.cls + ' (' + f.off + ' won off)', 'new in OrderService', 'OrderService'];
    } else {
      var names = ['orderService'].concat(f.regFixed ? ['fixedDiscountPolicy'] : [], f.regRate ? ['rateDiscountPolicy'] : []), n = names.length - 1;
      ['fixed', 'rate'].forEach(function (k) { if (st.beans[k].reg) st.beans[k].s = 'def'; });
      st.svc = 'registered';
      if (f.comp) push('Container startup: The container scans the classes and registers those annotated with @Component as beans (component scanning). The registered beans are ' + names.join(', ') + '. The name of a bean is the class name with its first letter changed to lowercase.' + (n < 2 ? ' The container does not know about an implementation class that has no @Component.' : ''), '');
      else push('Container startup: The container finds the OrderService class, which is annotated with @Component, and the AppConfig class, which is annotated with @Configuration. ' + (n ? 'It also registers a bean for each @Bean method in AppConfig (number of methods: ' + n + '). The name of a bean registered with @Bean is the method name. ' : 'AppConfig contains no @Bean methods, so no more beans are registered. ') + 'The registered beans are ' + names.join(', ') + ' (AppConfig itself is also registered as a bean).', '');
      st.svc = 'being created';
      ['fixed', 'rate'].forEach(function (k) { if (st.beans[k].reg) st.beans[k].s = 'cand'; });
      push('Creating the orderService bean: The constructor of OrderService requires an argument of type DiscountPolicy. The container looks among the registered beans for those that match this type. Number of candidates: ' + n + (n ? ' (' + names.slice(1).join(', ') + ').' : '.'), '');
      if (n === 0) {
        fail = 'NoSuchBeanDefinitionException'; st.svc = 'failed'; st.result = 'Startup failed';
        push('There is no bean to inject. The container cannot call the constructor, so it throws a NoSuchBeanDefinitionException and the application fails to start. Even when an implementation class exists in the source, it does not exist for the container unless it is registered as a bean.', 'bad');
        sum.push('When a required bean is missing, the failure happens right when the application starts, not when an order comes in. You find out about a missing registration early.');
        sum.push(f.comp ? 'If you put @Component on an implementation class, the container finds it and registers it.' : 'If you add a @Bean method to AppConfig, the object that the method returns is registered as a bean.');
      } else if (c.reg === 'two') {
        fail = 'NoUniqueBeanDefinitionException'; st.svc = 'failed'; st.result = 'Startup failed';
        push('There are two candidates, and nothing tells the container which one to inject. The container does not pick one arbitrarily and throws a NoUniqueBeanDefinitionException. The application fails to start.', 'bad');
        sum.push('The container looks up beans by type. When there are two or more beans of the same type, you must tell it which one to inject. Either put @Primary on the bean to prefer, or write the bean name with @Qualifier at the injection point.');
        sum.push('Just creating and registering one more implementation class causes this error. If startup fails although you did not change the existing code, check whether another bean of the same type has been added.');
      } else {
        if (c.reg === 'one') push('The only candidate is ' + f.bean + ', so the container chooses it.', '');
        else if (c.reg === 'primary') { rest.s = 'def'; push('There are two candidates, but @Primary is on the ' + (f.comp ? f.cls + ' class' : 'AppConfig method ' + f.bean + '()') + '. @Primary marks the bean to prefer when there are several of the same type, so the container chooses ' + f.bean + '.', 'good'); }
        else { rest.s = 'def'; push('There are two candidates, but the constructor parameter is annotated with @Qualifier("' + f.bean + '"). The container chooses the bean named ' + f.bean + '.', 'good'); }
        mine.s = 'made';
        push(f.comp ? 'The container prepares the object of the bean it chose. If the object has not been created yet, the container calls the constructor of ' + f.cls + ' now to create it, and if it has already been created, the container uses that object. Either way, it is the container, not your code, that calls the constructor.' : 'The container prepares the object of the bean it chose. If the object has not been created yet, the container calls the ' + f.bean + '() method of AppConfig now and takes the object returned by new ' + f.cls + '() inside it as the bean. You wrote the new, but it is the container that calls the method.', '');
        mine.s = 'in'; st.pick = f.cls; st.svc = 'created'; made = 1;
        push('The container calls the constructor of OrderService and passes that object as the argument (dependency injection). The code of OrderService contains neither new nor the name of an implementation class.', 'good');
        if (f.both) { rest.s = 'made'; made = 2; push('The bean that was not chosen, ' + rest.name + ', is also registered, so the container creates one object for it as well by the time startup finishes. That object is not injected into OrderService, though.', ''); }
        st.off = f.off + ' won'; st.result = 'Startup succeeded';
        push('orderService.order(20000): The discount method of the injected ' + f.cls + ' returns ' + f.off + ' won, so the amount to pay is ' + (20000 - f.off) + ' won.', 'good');
        var where = c.reg === 'qualifier' ? 'OrderService' : f.comp ? 'FixedDiscountPolicy, RateDiscountPolicy' : 'AppConfig';
        push('To change the implementation to ' + f.other + ': ' + (c.reg === 'qualifier' ? 'Change the bean name written in the @Qualifier of OrderService. You end up editing the file that receives the injection.' : c.reg === 'primary' ? (f.comp ? 'Move @Primary to the ' + f.other + ' class.' : 'In AppConfig, move @Primary to the other @Bean method.') + ' OrderService is not edited.' : (f.comp ? 'Move @Component to the ' + f.other + ' class.' : 'Change the @Bean method of AppConfig so that it returns a ' + f.other + '.') + ' OrderService is not edited.'), c.reg === 'qualifier' ? '' : 'good');
        if (c.reg === 'one') sum.push('OrderService only says "I need a DiscountPolicy" in its constructor. The container does the work of creating the object and deciding which implementation to inject. That is why OrderService stays the same even when the implementation changes.');
        if (c.reg === 'primary') sum.push('@Primary is a mark that goes on the registering side. No matter how many classes receive the injection, changing one place changes all of them. The implementation that was not chosen is also a bean, so its object is still created.');
        if (c.reg === 'qualifier') sum.push('@Qualifier specifies the bean name at the injection point. Each injection point can choose a different implementation, but in return you must edit that class when the implementation changes. You can also set the default implementation with @Primary and put @Qualifier only where a different implementation is needed.');
        sum.push(f.comp ? '@Component goes on a class that you wrote yourself and marks it as "register this class as a bean". The container creates the object by calling the constructor.' : '@Bean goes on a method of a configuration class. You write the code that creates the object, and the container calls that method and registers the returned object as a bean. A class from a library whose source you cannot edit can also be registered this way.');
        row = ['Startup succeeded', f.cls + ' (' + f.off + ' won off)', f.comp ? 'The container (calls the constructor directly)' : 'The @Bean method of AppConfig, called by the container', where];
      }
      if (fail) row = ['Startup failed: ' + fail, '-', '-', '-'];
    }
    return { events: ev, summary: sum, made: made, fail: fail, regWord: regWord, row: row };
  },
  render: function (v, sim, t, H, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : null, c = sim.c, isNew = c.how === 'new';
    if (!s) { H.text(v, isNew ? 'Click Run to create the OrderService object directly.' : 'Click Run to start the container.'); return; }
    var word = { none: isNew ? 'not used (no object)' : 'not registered as a bean', def: 'registered as a bean', cand: 'injection candidate', made: 'object exists', in: isNew ? 'object created by OrderService' : 'injected into OrderService' };
    H.table(v, isNew ? ['Implementation class', 'State'] : ['Implementation class', 'Bean name', 'State'], ['fixed', 'rate'].map(function (k) {
      var b = s.beans[k], st = { v: word[b.s], cls: b.s === 'in' ? 'good' : b.s === 'cand' ? 'hot' : '' };
      return { cls: b.s === 'none' ? 'gone' : '', cells: isNew ? [b.cls, st] : [b.cls + (b.mark ? ' (@Primary)' : ''), b.reg ? b.name : '-', st] };
    }), isNew ? 'Implementations of DiscountPolicy (no container)' : 'DiscountPolicy implementations that the Spring container knows about (registered with ' + sim.regWord + ')');
  },
  // Diagram: OrderService on the left and the two implementations of the discount policy on the right. The container finds the candidates (dashed lines) and injects the one it chose (solid green line). With direct new, an arrow goes from OrderService to the implementation.
  draw: function (P, sim, shown) {
    var c = sim.c, isNew = c.how === 'new', last = shown[shown.length - 1];
    var s = last ? last.snap : { svc: 'none', pick: '', off: '', result: '', beans: { fixed: { cls: 'FixedDiscountPolicy', name: 'fixedDiscountPolicy', reg: false, mark: false, s: 'none' }, rate: { cls: 'RateDiscountPolicy', name: 'rateDiscountPolicy', reg: false, mark: false, s: 'none' } } };
    P.size(680, isNew ? 316 : 392);
    P.region('ctx', 16, 16, 648, 224, isNew ? 'No container: your own code creates the objects' : 'Spring container');
    P.box('svc', 30, 96, 290, 64, { cls: s.svc === 'created' ? 'good' : s.svc === 'failed' ? 'bad' : s.svc === 'being created' ? 'hot now' : s.svc === 'none' ? 'ghost' : 'plain', title: isNew ? 'OrderService object' : 'orderService bean', sub: [s.svc === 'none' ? 'not created yet' : s.svc, 'In use: ' + (s.pick || 'none yet')] });
    [['fixed', 52], ['rate', 148]].forEach(function (p) {
      var b = s.beans[p[0]], y = p[1], out = !isNew && b.s === 'none';
      var sub = isNew ? (b.s === 'in' ? 'created by OrderService (new)' : 'not used (no object)') : b.s === 'none' ? 'outside the container (not a bean)' : { def: 'registered as a bean', cand: 'injection candidate', made: 'object exists', in: 'injected into OrderService' }[b.s];
      P.box(p[0], out ? (p[0] === 'fixed' ? 16 : 348) : 410, out ? 258 : y, out ? 316 : 240, 64, { cls: b.s === 'in' ? 'good' : b.s === 'cand' ? 'hot' : b.s === 'none' ? 'ghost' : b.s === 'made' ? 'wait' : 'plain', title: !isNew && b.reg ? b.name : b.cls, sub: !isNew && b.reg ? [b.cls + (b.mark ? ' (@Primary)' : ''), sub] : [sub] });
      if (isNew && b.s === 'in') P.arrow('a_' + p[0], 'svc:r', p[0] + ':l', { cls: 'hot', label: 'new' });
      if (!isNew && b.s === 'cand') P.arrow('a_' + p[0], p[0] + ':l', 'svc:r', { cls: s.svc === 'failed' ? 'bad dash' : 'dash mut', label: 'candidate' });
      if (!isNew && b.s === 'in') P.arrow('a_' + p[0], p[0] + ':l', 'svc:r', { cls: 'good', label: 'injected' });
    });
    P.box('r1', 16, isNew ? 258 : 340, 320, 40, { cls: !s.result ? 'ghost' : s.result === 'Startup failed' ? 'bad' : 'good', title: 'Result', right: s.result ? (sim.fail ? sim.fail : s.result) : 'In progress' });
    P.box('r2', 344, isNew ? 258 : 340, 320, 40, { cls: s.off ? 'good' : 'ghost', title: 'Discount on a 20000-won order', right: s.off || '-' });
    P.note(isNew ? 'The arrow means "OrderService created this object itself".' : 'A dashed line marks a candidate that the container found, and the solid green line marks the bean that the container chose and injected into OrderService. A faded box is a class that the container does not know about because it is not registered as a bean.');
  },
  assume: 'All 30 combinations were run on Spring Boot 4.1.1 (Spring Framework 7.0.9) on this PC and checked against the results. For each combination, source code with the same structure as on the screen was compiled. The cases that create the object directly with new were run as they are, and the cases that use the container were started with component scanning. Then these were compared: whether startup succeeded, the name of the exception, the implementation injected into OrderService, the discount amount, who called the constructor of the implementation object (confirmed from the call stack), and the number of implementation objects created. The "File to edit to change the implementation" column is what the checking program found by directly comparing which files differ between two sources in which only the implementation to use was changed. For a startup failure, the name shown is that of the innermost cause, and an UnsatisfiedDependencyException wraps it on the outside. Simplifications on the screen: the order in which the container creates the bean objects depends on the registration order, so the lab does not state it (the "Bean creation and injection" lab covers the order). It was also confirmed by execution that, even when both implementations are registered and nothing marks which to choose, startup succeeds if the name of the constructor parameter is the same as a bean name (for example, rateDiscountPolicy), and that bean is injected. The parameter name in this lab is discountPolicy, which is not the same as either bean name. Field injection, setter injection, and receiving all beans of the same type as a List are not covered.',
});

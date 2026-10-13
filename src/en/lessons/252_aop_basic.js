Lab.register({
  id: 'aop_basic', nav: 'AOP and proxies', cat: 'Fundamentals', mode: 'step', basic: true, deep: ['proxy', 'aop'],
  title: 'What is a proxy, and how does Spring step in before and after my method?',
  intro: 'When you put an annotation such as @Transactional on a method, something we did not write happens before and after that method when it is called. This is because Spring does not keep the object we made as it is. It creates a stand-in object (a proxy) that receives the calls in its place, and keeps that. This lab shows the same thing with a LogAspect that we write ourselves, instead of @Transactional. LogAspect is a class with @Aspect, and it is the place where we write separately what to insert into many methods in common (here, one line of log). The execution(* OrderService.order(..)) inside @Before is an expression that selects the order() method of the OrderService class. Writing separately what to insert in common like this is called AOP. If @Autowired is on the orderService field of the calling class Caller, the object that Spring keeps is put in that field. In this lab you remove LogAspect, or put an object made directly with new OrderService() in that field, and see what the same order() call prints and what the object that received the call is.',
  terms: ['Proxy', 'Aspect-oriented programming (AOP)', '@Aspect and @Before', '@Autowired'],
  controls: [
    { id: 'aspect', label: 'Have the LogAspect class (@Aspect)', type: 'check', value: true },
    { id: 'how', label: 'The object that goes into the orderService field', type: 'select', value: 'bean', options: [['bean', 'The object Spring puts in with @Autowired'], ['new', 'An object made directly with new OrderService()']] },
  ],
  // q is the question shown on the question-style screen. t and d are the name and the description used in the text-only reading
  presets: [
    { t: 'Default settings', q: 'What does LogAspect look like, and what happens when you call orderService.order()?', d: 'LogAspect exists, and the call is made on the object Spring put in. The called object is a proxy, so a [log] line is printed before order().', v: { aspect: true, how: 'bean' } },
    { t: 'Removing LogAspect', q: 'What if you remove the LogAspect class?', d: 'There is nothing to insert, so Spring does not create a proxy. Only "Order processed" is printed.', v: { aspect: false, how: 'bean' } },
    { t: 'Calling an object made with new', q: 'What if you remove the @Autowired line and use an object made directly with new OrderService()?', d: 'Spring has a proxy, but the object that was called is the one we made directly, so no [log] line is printed.', v: { aspect: true, how: 'new' } },
    { t: 'Changing both', q: 'What if you remove LogAspect too and use an object made directly with new OrderService()?', d: 'It is an ordinary Java call with no place for Spring to step in. Only "Order processed" is printed.', v: { aspect: false, how: 'new' } },
  ],
  // The code on the screen and the source that the checking program (verify/spring/src/AopBasicProbe.java) ran are the same text (the checking script compares them down to the letter).
  code: function (c) {
    var o = [];
    if (c.aspect) o.push('// Inserted behavior: runs every time order() of OrderService is called', '@Aspect', '@Component', 'class LogAspect {', '    @Before("execution(* OrderService.order(..))")', '    void log() {', '        System.out.println("[log] order called");', '    }', '}', '');
    o.push('@Service', 'class OrderService {', '    public void order() {', '        System.out.println("Order processed");', '    }', '}', '', '@Component', 'class Caller {');
    if (c.how === 'bean') o.push('    // Spring finds the bean it made and puts it here', '    @Autowired', '    OrderService orderService;');
    else o.push('    // I make it myself', '    OrderService orderService = new OrderService();');
    o.push('', '    void run() {', '        orderService.order();', '        System.out.println(orderService.getClass().getSimpleName());', '    }', '}');
    return o.join('\n');
  },
  label: function (c) { return (c.aspect ? 'Has LogAspect' : 'No LogAspect') + ' · ' + (c.how === 'bean' ? 'Object received by @Autowired' : 'Object made with new'); },
  columns: ['Lines printed', 'Class of the called object', 'Is a proxy', 'Class of the bean Spring kept'],
  simulate: function (c) {
    var A = !!c.aspect, bean = c.how === 'bean', ev = [], sum = [];
    var SVC = 'OrderService', PX = 'OrderService$$SpringCGLIB$$0';
    var usedProxy = A && bean, slotName = usedProxy ? PX : SVC, beanName = A ? PX : SVC;
    // State: bean is the OrderService bean Spring kept (plain is our object as it is, proxy is a proxy), slot is what is in the orderService field of Caller, at is where the call has reached now
    var st = { aspect: A, bean: '', beanName: '', slot: '', slotName: '', at: '', out: [], proxies: 0, mine: false };
    function push(s, k) { ev.push({ s: s, k: k, snap: JSON.parse(JSON.stringify(st)) }); }

    // 1. Spring starts and creates the OrderService object
    st.bean = 'plain'; st.beanName = SVC;
    push('When the program starts, Spring finds the classes with @Component or @Service (component scanning), creates an object of each, and keeps it. An object that Spring creates and keeps like this is called a bean. It also creates one object of the OrderService class. The code we wrote has no line new OrderService().' + (A ? ' It also creates an object of the LogAspect class, which has @Component.' : ''), '');

    // 2. Spring checks whether a proxy is needed
    if (A) {
      st.bean = 'proxy'; st.beanName = PX; st.proxies = 1;
      push('Spring finds LogAspect, which has @Aspect. The execution(* OrderService.order(..)) inside @Before is an expression that selects the order() method of the OrderService class (with any number of parameters). The OrderService object that was just created has an order() that matches this expression. So Spring does not use this object as the bean as it is. It creates a stand-in object (a proxy) that receives the calls in place of this object, and keeps that as the bean. The proxy is an object of the class ' + PX + ', which extends OrderService, and it holds a reference to the real OrderService object. They are two different objects. The code we wrote has no line that creates the proxy.', 'good');
    } else {
      push('Spring has no @Aspect class that wants to step into order() of OrderService (there is no LogAspect class in the code). There is nothing to insert, so Spring does not create a proxy and keeps the OrderService object it just created as the bean as it is.', '');
    }

    // 3. The orderService field of Caller is filled
    if (bean) {
      st.slot = 'bean'; st.slotName = beanName;
      push('Spring also creates an object of the Caller class. The orderService field has @Autowired, so Spring looks for a bean of the type OrderService to put in this field, and puts it in. We did not write a line that puts a value in the field. What went into this field now is ' + (A ? 'the proxy that Spring kept.' : 'the OrderService object that Spring kept.'), '');
    } else {
      st.slot = 'mine'; st.slotName = SVC; st.mine = true;
      push('When Spring creates the object of the Caller class, a new OrderService object made with new OrderService() goes into the orderService field. This object was not made by Spring but by our code, so it is a different object from the OrderService bean that Spring kept.' + (A ? ' The proxy that Spring kept did not go into this field, and it is only kept, without anyone calling it.' : ''), '');
    }

    // 4. The call to order()
    if (usedProxy) {
      st.at = 'bean';
      push('run() of Caller calls orderService.order(). What is in the orderService field is the proxy, so the call arrives first at the proxy, not at the real OrderService. The proxy knows that order() is a method that matches the @Before expression of LogAspect, so before it calls the real order(), it first runs log() of LogAspect.', '');
      st.at = 'asp'; st.out.push('[log] order called');
      push('The proxy runs log() of LogAspect and prints "[log] order called". This line is written in LogAspect, not in order().', 'good');
      st.at = 'real'; st.out.push('Order processed');
      push('The proxy calls order() of the real OrderService object that it holds a reference to, and order() prints "Order processed". There is no line that prints a log inside order().', '');
    } else {
      st.at = bean ? 'bean' : 'mine'; st.out.push('Order processed');
      push('run() of Caller calls orderService.order(). ' + (bean
        ? 'The orderService field holds the OrderService object that Spring kept, as it is. The call goes straight into order() and prints "Order processed". Spring had nothing to insert, so nothing happens before or after it.'
        : 'The orderService field holds the object we made with new. The call goes straight into order() and prints "Order processed". It did not go through a proxy.' + (A ? ' Spring can step in only on a call that arrives at the proxy, so even though LogAspect exists, log() does not run.' : ' It is an ordinary Java call, with no place for Spring to step in.')), A && !bean ? 'bad' : '');
    }

    // 5. Print the class name
    st.at = '';
    st.out.push(slotName);
    push('Next, run() prints the class name of the object in the orderService field with the getSimpleName() method. The printed name is "' + slotName + '". ' + (usedProxy
      ? 'It is not OrderService but another class that Spring made while the program was running. This name does not appear in the code we wrote. It is a sign that we are calling a proxy.'
      : 'It is the OrderService class we wrote, as it is. It is not a proxy.'), usedProxy ? 'good' : '');

    // Summary: the first line is the answer to the question
    if (A && bean) {
      sum.push('LogAspect is a class with @Aspect, and it is the place where what to insert in common into order() (printing a log) is written separately. Spring did not use the OrderService object as the bean as it is, and instead created and kept a proxy that receives the calls in its place. When order() was called, the proxy received the call first, printed [log], and then called the real order().');
      sum.push('There is no line that prints a log inside order(). The class name of the called object is ' + PX + ', not OrderService, and this is the sign that we called a proxy. The class name of a bean with @Transactional changes to a name of the same form, and it is the same thing.');
    } else if (!A && bean) {
      sum.push('When LogAspect is removed, there is nothing to insert, so Spring did not create a proxy and used the OrderService object as the bean as it is. order() printed only "Order processed", and the class name of the called object is still OrderService.');
      sum.push('A proxy is created only for a bean that has something to insert. Spring does not replace every bean with a stand-in object.');
    } else if (A) {
      sum.push('Even though Spring created and kept a proxy, if the calling side uses an object made directly with new OrderService(), the call does not go through the proxy, so [log] is not printed. Spring had an object of ' + PX + ', but nobody called it.');
      sum.push('Stepping in happens only when you call through the bean that Spring put in. If LogAspect exists but no log is printed, first check whether the class name of the called object is OrderService.');
    } else {
      sum.push('With no LogAspect and an object made directly, Spring has no place at all to step in. It is an ordinary method call on an ordinary Java object, so only "Order processed" was printed.');
      sum.push('The output is the same as when only LogAspect is removed. In this case the Spring bean was only kept, without being used.');
    }
    return { events: ev, summary: sum, row: [st.out.slice(0, st.out.length - 1).join(' / '), slotName, usedProxy ? 'Yes' : 'No', beanName] };
  },
  render: function (v, sim, t, H, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : null;
    if (!s) { H.text(v, 'Click Run to start from Spring starting up and making the beans.'); return; }
    H.table(v, ['Object', 'Class', 'Is a proxy'], [
      { cls: s.bean ? '' : 'gone', cells: ['OrderService bean kept by Spring', s.bean ? s.beanName : 'Not yet', s.bean ? { v: s.bean === 'proxy' ? 'Yes' : 'No', cls: s.bean === 'proxy' ? 'good' : '' } : ''] },
      { cls: s.slot ? '' : 'gone', cells: ['Object in the orderService field', s.slot ? s.slotName : 'Not yet', s.slot ? { v: s.slot === 'bean' && s.bean === 'proxy' ? 'Yes' : 'No', cls: s.slot === 'bean' && s.bean === 'proxy' ? 'good' : '' } : ''] },
    ], 'Objects');
    var lines = s.out.map(function (x, i) { return { cls: '', cells: [String(i + 1), { v: x, cls: x.indexOf('[log]') === 0 ? 'good' : '' }] }; });
    H.table(v, ['Order', 'Line printed to the screen'], lines.length ? lines : [{ cls: 'gone', cells: ['-', 'None yet'] }], 'Lines printed');
    var logs = s.out.filter(function (x) { return x.indexOf('[log]') === 0; }).length;
    H.counters(v, [[logs, '[log] lines printed'], [s.proxies, 'Proxies made by Spring']]);
  },
  // Diagram: the calling Caller at the left, the OrderService bean that Spring kept at the top center (and, if it is a proxy, the real object that the proxy refers to at the right) with LogAspect, and the object made with new at the bottom. Arrows show which object the call reaches.
  draw: function (P, sim, shown) {
    var c = sim.c, last = shown[shown.length - 1], s = last ? last.snap : null;
    var A = !!c.aspect, bean = c.how === 'bean';
    P.size(680, 304);
    P.box('caller', 14, 70, 174, 82, { cls: s && s.at === '' && s.slot && s.out.length ? 'good' : 'plain', title: 'Caller.run()', sub: ['orderService field:', s && s.slot ? (s.slot === 'bean' && s.bean === 'proxy' ? 'Proxy' : 'OrderService object') : 'Empty'] });
    P.region('sp', 240, 14, 426, 178, 'Objects created by Spring');
    var made = s && s.bean, px = s && s.bean === 'proxy';
    P.box('bean', 252, 44, 186, 58, { cls: !made ? 'ghost' : s.at === 'bean' ? 'hot now' : px ? 'wait' : 'plain', title: made ? (px ? 'OrderService proxy' : 'OrderService object') : 'OrderService bean', sub: !made ? 'Not made yet' : px ? 'Stand-in (subclass)' : 'Our class as written' });
    P.box('real', 490, 44, 164, 58, { cls: !px ? 'ghost' : s.at === 'real' ? 'hot now' : 'plain', title: 'Real OrderService', sub: px ? 'A separate object' : 'No proxy, so none' });
    P.box('asp', 252, 118, 186, 58, { cls: !A ? 'ghost' : s && s.at === 'asp' ? 'hot now' : 'plain', title: 'LogAspect', sub: A ? '@Before: print [log]' : 'Class removed' });
    P.box('mine', 240, 206, 330, 44, { cls: !bean && s && s.mine ? (s.at === 'mine' ? 'hot now' : 'hot') : 'ghost', title: 'Object made with new OrderService()', sub: !bean ? 'Not made by Spring' : 'Not in this code' });
    if (s && (s.at === 'bean' || s.at === 'asp')) P.arrow('a1', 'caller:r:0.2', 'bean:l', { cls: 'hot' });
    if (s && s.at === 'asp') P.arrow('a2', 'bean:b', 'asp:t', { cls: 'hot' });
    if (px) P.arrow('a3', 'bean:r', 'real:l', { cls: s.at === 'real' ? 'hot' : 'mut', label: 'reference' });
    if (s && s.at === 'mine') P.arrow('a4', 'caller:r:0.8', 'mine:l', { cls: 'hot' });
    var logs = s ? s.out.filter(function (x) { return x.indexOf('[log]') === 0; }).length : 0;
    P.box('n1', 14, 262, 322, 34, { cls: logs ? 'good' : 'ghost', title: '[log] lines printed', right: logs + '' });
    P.box('n2', 344, 262, 322, 34, { cls: s && s.proxies ? 'wait' : 'ghost', title: 'Proxies made by Spring', right: (s ? s.proxies : 0) + '' });
  },
  assume: 'Checked against Spring Framework 7.0.9 (AspectJ weaver 1.9.25.1) running on JDK 21 with AnnotationConfigApplicationContext. All four combinations were checked by compiling the same source as the code on the screen (with only the package and import lines added) and starting a new child Java process for each combination. The configuration class had @EnableAspectJAutoProxy and @ComponentScan, and the classes were found by scanning (this configuration is not shown on the screen). What was checked is the lines that run() printed to the screen and their order, the class name of the called object and whether it is a proxy as measured with AopUtils, the class of the OrderService bean taken from the Spring container and whether it is a proxy, whether the called object and that bean are the same object, and the number of proxies in the container. The facts that the step sentences rely on were also checked by execution: that the proxy is a class that extends OrderService and has one real OrderService object inside it, that the object Spring put in is the same as the bean kept in the container, and that an object made with new is different from that bean. The proxy class name OrderService$$SpringCGLIB$$0 is the name that was actually printed on the PC used to write this lab. What the documentation defines comes from the Core chapter of the Spring Framework 7.0 documentation: the AOP Proxies section (that Spring AOP is proxy-based, and that an object without an interface is proxied with CGLIB by default), the Understanding AOP Proxies section (that the advice runs only when the call reaches the proxy), the Enabling @AspectJ Support section (that aspectjweaver must be on the class path, and that a proxy is created automatically for a bean that has advice), and the Declaring an Aspect section (that @Aspect alone is not picked up by scanning and @Component is needed). However, the documentation does not state in one sentence the order in which "the proxy runs @Before before it calls the real object inside", so that order is an observation confirmed by the order of the lines the probe program printed. OrderService in this lab is a class without an interface, so a CGLIB proxy was created. This lab does not cover a class that implements an interface, where a JDK dynamic proxy may be used, a call made inside the same class (self-invocation), or many methods and many aspects, and the diagram is simplified to show only the code on the screen. The case where AOP is turned on by the auto-configuration of Spring Boot was not run either. The code on the screen leaves out the package and import lines. The exact time when @Before runs and the rules of pointcut expressions are covered in the in-depth lab "AOP: advice and pointcuts", and self-invocation and the proxy types (JDK dynamic proxy, CGLIB) are covered in the in-depth lab "Proxies and self-invocation".',
});

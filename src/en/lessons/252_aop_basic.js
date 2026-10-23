Lab.register({
  id: 'aop_basic', nav: 'AOP and proxies', cat: 'Fundamentals', mode: 'step', basic: true, deep: ['proxy', 'aop'],
  title: 'What is a proxy, and how does Spring step in before and after my method?',
  why: 'If tasks such as starting and committing a transaction, or writing logs, are written by hand in every method, the same lines are scattered in many places, and when one is forgotten or needs changing, you have to hunt through all of them. Spring keeps that work outside the body of the method, and a proxy registered in place of the bean receives the call first and inserts that work before and after it, so the code of the original method is left untouched.',
  use: 'Spring annotations such as @Transactional (wrapping a method in a transaction), @Cacheable (returning a stored result), and @Async (running in another thread) work through this proxy. If you put an annotation on and it does not work, first check whether the class name of the object you called has $$SpringCGLIB$$ in it, and whether you are calling an object made directly with new. If you want to insert something of your own, you make an aspect class with @Aspect and use it for things such as measuring execution time or recording calls.',
  intro: 'When you put @Transactional on a method, starting and ending a transaction happens when you call that method, even though we did not write it. This is because Spring does not use the object of the class we wrote as the bean as it is. It creates a stand-in object (a proxy) that receives the calls in its place, and keeps that as the bean. Keeping the work that many methods need in common (transactions, logs, and so on) outside the body of the method and inserting it before and after the call like this is called AOP. OrderService and Caller on the screen are class names made up for this lab as examples, and @Service, @Component, @Autowired, @Transactional, and the class TransactionSynchronizationManager are provided by Spring. TransactionSynchronizationManager.isActualTransactionActive() returns true if a transaction is in progress at the time that line runs. If @Autowired is on the orderService field of the calling class Caller, Spring makes that field refer to the OrderService bean that it keeps. In this lab you remove @Transactional or make that field refer to an object made directly with new OrderService(), and see which lines order() prints and what the class name of the object you called is. Instead of @Transactional, which Spring provides, you can also insert a class that we make ourselves with @Aspect (LogAspect, a name made up for this example).',
  terms: ['Proxy', 'Aspect-oriented programming (AOP)', '@Transactional', 'TransactionSynchronizationManager', '@Autowired', '@Aspect and @Before'],
  controls: [
    { id: 'ann', label: 'What to insert into order() of OrderService', type: 'select', value: 'tx', options: [['tx', 'Put @Transactional above order()'], ['none', 'Put no annotation'], ['log', 'Put LogAspect (@Aspect), which we make ourselves, instead of @Transactional']] },
    { id: 'how', label: 'The object the orderService field refers to', type: 'select', value: 'bean', options: [['bean', 'The bean Spring keeps (@Autowired)'], ['new', 'An object made directly with new OrderService()']] },
  ],
  // q is the question shown on the question-style screen. t and d are the name and the description used in the text-only reading
  presets: [
    { t: 'Default settings', q: 'What happens when you call order() of the OrderService bean that has @Transactional, and what is the class of the object you called?', d: 'Spring kept a proxy (OrderService$$SpringCGLIB$$0) as the bean instead of OrderService, and the proxy receives the call first, starts a transaction, and then calls order(). The transaction that order() saw is active (true).', v: { ann: 'tx', how: 'bean' } },
    { t: 'Removing @Transactional', q: 'What if you remove @Transactional above order()?', d: 'There is nothing to insert, so Spring does not create a proxy. The object you called is OrderService as it is, and no transaction is active (false).', v: { ann: 'none', how: 'bean' } },
    { t: 'Calling an object made with new', q: 'What if you leave @Transactional as it is, and instead of the @Autowired line you call an object made directly with new OrderService()?', d: 'Spring created and kept a proxy, but what you called is the object we made directly, so the call does not go through the proxy. Even with @Transactional, no transaction is started (false).', v: { ann: 'tx', how: 'new' } },
    { t: 'Inserting an aspect we make ourselves', q: 'What if, instead of @Transactional, you put LogAspect, which we make ourselves with @Aspect?', d: 'If the aspect we made selects order(), Spring creates a proxy in the same way. The proxy prints the [log] line first and then calls order(). No transaction is started (false).', v: { ann: 'log', how: 'bean' } },
  ],
  // The code on the screen and the source that the checking program (verify/spring/src/AopBasicProbe.java) ran are the same text (the checking script verify/spring/cmp_aop_basic.js compares them down to the letter).
  code: function (c) {
    var o = ['// … The configuration class (@EnableTransactionManagement, an H2 DataSource, a transaction manager bean) and the import lines are left out', ''];
    if (c.ann === 'log') o.push('// An aspect we make ourselves: prints one line before order() of OrderService is called', '@Aspect', '@Component', 'class LogAspect {', '    @Before("execution(* OrderService.order(..))")', '    void log() {', '        System.out.println("[log] order called");', '    }', '}', '');
    o.push('@Service', 'class OrderService {');
    if (c.ann === 'tx') o.push('    // An annotation provided by Spring: wraps this method in a transaction', '    @Transactional');
    o.push('    public void order() {', '        // A method provided by Spring: returns true if a transaction is in progress now', '        boolean active = TransactionSynchronizationManager.isActualTransactionActive();', '        System.out.println("Transaction active: " + active);', '    }', '}', '', '@Component', 'class Caller {');
    if (c.how === 'bean') o.push('    // Makes this field refer to the OrderService bean that Spring keeps', '    @Autowired', '    OrderService orderService;');
    else o.push('    // I make it myself', '    OrderService orderService = new OrderService();');
    o.push('', '    void run() {', '        orderService.order();', '        System.out.println(orderService.getClass().getSimpleName());', '    }', '}');
    return o.join('\n');
  },
  label: function (c) { return (c.ann === 'tx' ? 'Has @Transactional' : c.ann === 'log' ? 'Has LogAspect' : 'No annotation') + ' · ' + (c.how === 'bean' ? 'Object received by @Autowired' : 'Object made with new'); },
  columns: ['Lines printed', 'Class of the called object', 'Went through the proxy', 'Class of the bean Spring kept'],
  simulate: function (c) {
    var TX = c.ann === 'tx', LOG = c.ann === 'log', PXY = TX || LOG, bean = c.how === 'bean', ev = [], sum = [];
    var SVC = 'OrderService', PX = 'OrderService$$SpringCGLIB$$0';
    var usedProxy = PXY && bean, slotName = usedProxy ? PX : SVC, beanName = PXY ? PX : SVC;
    // State: bean is the OrderService bean Spring kept (plain is our object as it is, proxy is a proxy), slot is what the orderService field of Caller refers to,
    // at is where the call has reached now (bean the bean, tmb transaction start, real the real object, tmc commit, asp LogAspect, mine the object made with new)
    var st = { bean: '', beanName: '', slot: '', slotName: '', at: '', out: [], proxies: 0, begins: 0, commits: 0, mine: false };
    function push(s, k) { ev.push({ s: s, k: k, snap: JSON.parse(JSON.stringify(st)) }); }

    // 1. Spring starts and creates the OrderService object
    st.bean = 'plain'; st.beanName = SVC;
    push('When the program starts, Spring finds the classes with @Service or @Component (component scanning), creates an object of each, and keeps it. An object that Spring creates and keeps like this is called a bean. Spring also creates one object of the OrderService class. It also creates the transaction manager written in the configuration class that the screen leaves out (DataSourceTransactionManager, provided by Spring, connected to an H2 database) as a bean.' + (LOG ? ' It also creates an object of the LogAspect class, which has @Component.' : ''), '');

    // 2. Spring checks whether a proxy is needed
    if (TX) {
      st.bean = 'proxy'; st.beanName = PX; st.proxies = 1;
      push('Spring sees that @Transactional is on order() of OrderService. So it does not use the OrderService object it just created as the bean as it is. It creates a stand-in object (a proxy) that receives the calls in place of that object, and keeps it as the OrderService bean. The proxy is an object of the class ' + PX + ', which Spring made while the program was running. This class extends OrderService, and the proxy holds a reference to the real OrderService object. The two are different objects. Neither this class nor the line that creates the proxy is in the code we wrote.', 'good');
    } else if (LOG) {
      st.bean = 'proxy'; st.beanName = PX; st.proxies = 1;
      push('Spring finds LogAspect, which has @Aspect. The execution(* OrderService.order(..)) inside @Before is an expression that selects the order() method of OrderService (with any number of parameters). In the same way as when @Transactional is on it, Spring creates a proxy (class ' + PX + ') that receives the calls in place of the OrderService object, and keeps it as the bean. The only difference is that what is inserted is not a transaction but log() of LogAspect.', 'good');
    } else {
      push('OrderService has no method with @Transactional, and there is no @Aspect class that steps into order(). There is nothing to insert, so Spring does not create a proxy and keeps the OrderService object it just created as the bean as it is.', '');
    }

    // 3. The orderService field of Caller is filled
    if (bean) {
      st.slot = 'bean'; st.slotName = beanName;
      push('Spring also creates an object of the Caller class, which has @Component. The orderService field has @Autowired, so Spring looks for a bean of the type OrderService and makes this field refer to that bean. We did not write a line that assigns a value to this field. What this field refers to now is ' + (PXY ? 'the proxy that Spring kept.' : 'the OrderService object that Spring kept.'), '');
    } else {
      st.slot = 'mine'; st.slotName = SVC; st.mine = true;
      push('When Spring creates the object of the Caller class, the new OrderService() written in the field declaration runs, a new OrderService object is made, and the orderService field refers to that object. This object was made by our code, not by Spring, so it is a different object from the OrderService bean that Spring kept.' + (PXY ? ' The orderService field does not refer to the proxy that Spring made.' : ''), '');
    }

    // 4. The call to order()
    if (TX && bean) {
      st.at = 'bean';
      push('run() of Caller calls orderService.order(). What the orderService field refers to is the proxy, so the call arrives first at the proxy, not at the real OrderService. The proxy knows that @Transactional is on order().', '');
      st.at = 'tmb'; st.begins = 1;
      push('Before it calls the real order(), the proxy has the transaction manager start a transaction. The transaction manager takes one connection to the H2 database and starts a transaction. The line that does this work is not in order().', 'good');
      st.at = 'real'; st.out.push('Transaction active: true');
      push('The proxy calls order() of the real OrderService object that it holds a reference to. order() asks with isActualTransactionActive() whether a transaction is in progress now, gets true, and prints "Transaction active: true".', 'good');
      st.at = 'tmc'; st.commits = 1;
      push('When order() ends without an exception and control returns to the proxy, the proxy has the transaction manager commit. The transaction ends here. If order() had ended with a runtime exception, it would roll back instead of committing.', '');
    } else if (LOG && bean) {
      st.at = 'bean';
      push('run() of Caller calls orderService.order(). What the orderService field refers to is the proxy, so the call arrives first at the proxy, not at the real OrderService. The proxy knows that order() is a method that matches the @Before expression of LogAspect.', '');
      st.at = 'asp'; st.out.push('[log] order called');
      push('Before it calls the real order(), the proxy runs log() of LogAspect and prints "[log] order called". This line is written in LogAspect, not in order().', 'good');
      st.at = 'real'; st.out.push('Transaction active: false');
      push('The proxy calls order() of the real OrderService object that it holds a reference to. This time nothing started a transaction, so isActualTransactionActive() returns false, and it prints "Transaction active: false". Even though the call went through the proxy, the only thing inserted is the one log line of LogAspect.', '');
    } else {
      st.at = bean ? 'bean' : 'mine'; st.out.push('Transaction active: false');
      push('run() of Caller calls orderService.order(). ' + (bean
        ? 'The orderService field refers to the OrderService object that Spring kept, as it is, so order() of that object runs right away. Nothing started a transaction, so isActualTransactionActive() returns false, and it prints "Transaction active: false".'
        : 'The orderService field refers to the object we made with new, so order() of that object runs right away, without going through a proxy. ' + (TX
          ? 'Even though @Transactional is written above order(), it is the proxy that sees that mark and starts a transaction. The call did not go through the proxy, so no transaction was started, and it prints "Transaction active: false".'
          : LOG ? 'Even though LogAspect exists, it is the proxy that inserts log(), so the [log] line is not printed, and only "Transaction active: false" is printed.'
            : 'Nothing started a transaction, so it prints "Transaction active: false". It is an ordinary Java call with no place for Spring to step in.')), PXY && !bean ? 'bad' : '');
    }

    // 5. Print the class name
    st.at = '';
    st.out.push(slotName);
    push('The next line of run() prints the class name of the object the orderService field refers to (getClass() and getSimpleName() are methods provided by Java). The printed name is "' + slotName + '". ' + (usedProxy
      ? 'It is not the OrderService we wrote but a proxy class that Spring made. The $$SpringCGLIB$$ in the middle of the name is a mark that Spring puts on a class it made with a library called CGLIB.'
      : 'It is the OrderService class we wrote, as it is. It is not a proxy.'), usedProxy ? 'good' : '');

    // Summary: the first line is the answer to the question
    if (TX && bean) {
      sum.push('Spring did not use the OrderService that has @Transactional as the bean as it is. It created a proxy that extends OrderService (class ' + PX + ') and kept it as the bean. When order() was called, the proxy received the call first, started a transaction, called the real order(), and then committed. So when order() asked, a transaction was active (true).');
      sum.push('There is no line in order() that starts or commits a transaction. Keeping work that is needed in common outside the method and inserting it before and after the call like this is AOP, and what inserts it is the proxy.');
    } else if (!PXY && bean) {
      sum.push('When @Transactional is removed, there is nothing to insert, so Spring did not create a proxy and kept the OrderService object as the bean as it is. The class name of the called object is still OrderService, and no transaction was started (false).');
      sum.push('Spring does not turn every bean into a proxy. Only a bean that has something to insert, such as @Transactional, becomes a proxy.');
    } else if (TX) {
      sum.push('Even with @Transactional, if you call an object made directly with new OrderService(), the call does not go through the proxy, so no transaction is started (false). Spring created and kept a ' + PX + ' proxy, but this call did not reach that proxy.');
      sum.push('@Transactional is a mark written above a method, and it is the proxy that Spring made that sees that mark and starts a transaction. If you put an annotation on and it does not work, the first thing to check is whether the class name of the object you called has $$SpringCGLIB$$ in it.');
    } else if (LOG && bean) {
      sum.push('Even without a Spring annotation such as @Transactional, if the LogAspect we made with @Aspect selects order(), Spring creates a proxy (class ' + PX + ') in the same way. The proxy received the call first, printed the [log] line, and then called the real order().');
      sum.push('The only thing inserted was one log line, so no transaction was started (false). Just as Spring inserts work with @Transactional, you can insert the work you want with an aspect you make yourself.');
    } else if (LOG) {
      sum.push('Even though LogAspect exists, when you call an object made directly with new, the call does not go through the proxy, so the [log] line was not printed. No transaction was started either (false).');
      sum.push('An aspect we make ourselves, just like @Transactional, steps in only on a call that goes through the proxy.');
    } else {
      sum.push('With no @Transactional and an object made directly, Spring has no place to step in. It is an ordinary Java method call, so "Transaction active: false" and OrderService were printed.');
      sum.push('The output is the same as when only @Transactional is removed. In this case the OrderService bean that Spring kept was not used.');
    }
    return { events: ev, summary: sum, row: [st.out.slice(0, st.out.length - 1).join(' / '), slotName, usedProxy ? 'Yes' : 'No', beanName] };
  },
  render: function (v, sim, t, H, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : null;
    if (!s) { H.text(v, 'Click Run to start from Spring starting up and making the beans.'); return; }
    H.table(v, ['Object', 'Class', 'Is a proxy'], [
      { cls: s.bean ? '' : 'gone', cells: ['OrderService bean kept by Spring', s.bean ? s.beanName : 'Not yet', s.bean ? { v: s.bean === 'proxy' ? 'Yes' : 'No', cls: s.bean === 'proxy' ? 'good' : '' } : ''] },
      { cls: s.slot ? '' : 'gone', cells: ['Object the orderService field refers to', s.slot ? s.slotName : 'Not yet', s.slot ? { v: s.slot === 'bean' && s.bean === 'proxy' ? 'Yes' : 'No', cls: s.slot === 'bean' && s.bean === 'proxy' ? 'good' : '' } : ''] },
    ], 'Objects');
    var lines = s.out.map(function (x, i) { return { cls: '', cells: [String(i + 1), { v: x, cls: x.indexOf('[log]') === 0 || /true$/.test(x) ? 'good' : '' }] }; });
    H.table(v, ['Order', 'Line printed to the screen'], lines.length ? lines : [{ cls: 'gone', cells: ['-', 'None yet'] }], 'Lines printed');
    H.counters(v, [[s.begins, 'Transactions started'], [s.proxies, 'Proxies made by Spring']]);
  },
  // Diagram: on the left the calling Caller, and in the frame in the middle the objects Spring made (the OrderService bean, the real object the bean refers to if it is a proxy, the transaction manager, and LogAspect if it exists), and below the frame the object made with new. Arrows show which object the call reaches.
  draw: function (P, sim, shown) {
    var c = sim.c, last = shown[shown.length - 1], s = last ? last.snap : null;
    var LOG = c.ann === 'log', bean = c.how === 'bean';
    P.size(680, 304);
    P.box('caller', 14, 70, 174, 82, { cls: s && s.at === '' && s.slot && s.out.length ? 'good' : 'plain', title: 'Caller.run()', sub: ['orderService field:', s && s.slot ? (s.slot === 'bean' && s.bean === 'proxy' ? 'Proxy' : 'OrderService object') : 'Empty'] });
    P.region('sp', 240, 14, 426, 178, 'Objects created by Spring (beans)');
    var made = s && s.bean, px = s && s.bean === 'proxy', at = s ? s.at : '';
    P.box('bean', 252, 44, 186, 58, { cls: !made ? 'ghost' : at === 'bean' ? 'hot now' : px ? 'wait' : 'plain', title: made ? (px ? 'OrderService proxy' : 'OrderService object') : 'OrderService bean', sub: !made ? 'Not made yet' : px ? 'Stand-in (subclass)' : 'Our class as written' });
    P.box('real', 490, 44, 164, 58, { cls: !px ? 'ghost' : at === 'real' ? 'hot now' : 'plain', title: 'Real OrderService', sub: px ? 'A separate object' : 'No proxy, so none' });
    P.box('tm', 252, 118, 186, 58, { cls: !made ? 'ghost' : at === 'tmb' || at === 'tmc' ? 'hot now' : 'plain', title: 'Transaction manager', sub: at === 'tmb' ? 'Transaction start' : at === 'tmc' ? 'Commit' : 'Bean from the config' });
    if (LOG) P.box('asp', 490, 118, 164, 58, { cls: !made ? 'ghost' : at === 'asp' ? 'hot now' : 'plain', title: 'LogAspect', sub: '@Before: print [log]' });
    P.box('mine', 240, 206, 330, 44, { cls: !bean && s && s.mine ? (at === 'mine' ? 'hot now' : 'hot') : 'ghost', title: 'Object made with new OrderService()', sub: !bean ? 'Not made by Spring' : 'Not in this code' });
    if (s && s.slot === 'bean' && ['bean', 'tmb', 'real', 'tmc', 'asp'].indexOf(at) >= 0) P.arrow('a1', 'caller:r:0.2', 'bean:l', { cls: 'hot' });
    if (at === 'tmb' || at === 'tmc') P.arrow('a2', 'bean:b', 'tm:t', { cls: 'hot', label: at === 'tmb' ? 'start' : 'commit' });
    if (at === 'asp') P.arrow('a5', 'bean:r:0.8', 'asp:l:0.3', { cls: 'hot' });
    if (px) P.arrow('a3', 'bean:r:0.4', 'real:l:0.4', { cls: at === 'real' ? 'hot' : 'mut', label: 'reference' });
    if (at === 'mine') P.arrow('a4', 'caller:r:0.8', 'mine:l', { cls: 'hot' });
    P.box('n1', 14, 262, 322, 34, { cls: s && s.begins ? 'good' : 'ghost', title: 'Transactions started', right: String(s ? s.begins : 0) });
    P.box('n2', 344, 262, 322, 34, { cls: s && s.proxies ? 'wait' : 'ghost', title: 'Proxies made by Spring', right: String(s ? s.proxies : 0) });
  },
  assume: 'Checked against Spring Framework 7.0.9 (AspectJ weaver 1.9.25.1), H2 2.4.240, and HikariCP 7.0.2 running on JDK 21 with AnnotationConfigApplicationContext. All six combinations (@Transactional, nothing, LogAspect × the bean received with @Autowired, the object made with new) were checked by compiling the same source as the code on the screen (with only the package and import lines added) and starting a new child Java process for each combination. The configuration class that the screen leaves out had @EnableTransactionManagement, @EnableAspectJAutoProxy, @ComponentScan, a DataSource connected to an H2 in-memory database, and a DataSourceTransactionManager bean (to the transaction manager I added only lines that count the number and the order of starts, commits, and rollbacks). In Spring Boot, auto-configuration does this setup for you, but this lab was not run with Boot. What was checked is the lines that run() printed and their order, the class name of the called object and whether it is a proxy as measured with AopUtils, the class of the OrderService bean taken from the container and whether it is a proxy, whether the called object and that bean are the same object, the number of proxies in the container, and the number of times the transaction manager started and committed a transaction and their order (start, "Transaction active: true", commit). The facts that the step sentences rely on were also checked by execution: that the proxy is a class that extends OrderService and holds a reference to one real OrderService object, that the database connected when the transaction starts is H2, and that an object made with new is different from that bean and is not a proxy. The proxy class name OrderService$$SpringCGLIB$$0 is the name that was actually printed in this checking run. What the documentation defines comes from the section Using @Transactional in Data Access of the Spring Framework 7.0 documentation (that with the default proxy mode only an external call that comes in through the proxy is intercepted, and that by default it rolls back on RuntimeException and Error), the section AOP Proxies in Core (that an object without an interface is proxied with CGLIB), the section Understanding AOP Proxies (that the advice runs only when the call reaches the proxy), the section Declaring an Aspect (that @Aspect alone is not picked up by scanning and @Component is needed), and the API documentation of TransactionSynchronizationManager (that isActualTransactionActive() returns whether an actual transaction is active in the current thread, and that this class is meant to be used by code that manages resources, not by ordinary application code). The sentence "if it ends with a runtime exception, it rolls back" was not run in this lab, and relies on the documentation and on the results of running the lab "@Transactional". OrderService in this lab is a class without an interface, so a CGLIB proxy was created. This lab does not cover a class that implements an interface, where a JDK dynamic proxy may be used, a call made inside the same class (self-invocation), or using @Transactional and an aspect together, and the diagram is simplified to show only the code on the screen. What commits and rollbacks leave in the database is covered in the lab "@Transactional", the time when @Before runs and the rules of pointcut expressions are covered in the lab "AOP: advice and pointcuts", and self-invocation and the proxy types (JDK dynamic proxy, CGLIB) are covered in the lab "Proxies and self-invocation".',
});

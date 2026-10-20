Lab.register({
  id: 'di_basic', nav: 'Dependency injection', cat: 'Fundamentals', mode: 'step', basic: true, deep: ['di'],
  title: 'What does dependency injection do for you?',
  why: 'If each class creates the objects it needs directly with new, an object that several classes could share is created separately wherever it is made, and if the way of creating that object changes, you have to find and fix every place that has a creating line. Dependency injection has a class write only a place to receive what it needs (usually a constructor parameter) and leaves creating and putting it in to the outside, so the class only uses the object it received.',
  use: 'On a Spring server, this is how a controller is connected to a service and a service to a repository. Spring recommends receiving through the constructor, and if there is only one constructor, Spring puts the objects in through it even if you do not write @Autowired, the mark that says "put them in here". In tests, you sometimes pass a fake object straight to the constructor, without Spring, and test a single class on its own.',
  intro: 'Dependency injection means that a class does not create the objects it needs to do its work, but receives them from outside. Here OrderService, a class made up for this example, needs an object of PayService, another class made up for this example, to make a payment, and this is called "OrderService depends on PayService". In Spring, all you do is write PayService as a parameter of the OrderService constructor, and the @Component above a class is a mark that tells Spring to create an object (a bean) of that class and keep it. When Spring creates the OrderService object, it puts the PayService bean it was keeping into that constructor. In this lab you change the constructor to new PayService() or remove it, remove @Component above PayService, and run the same main, to see where the PayService that OrderService uses came from and how many PayService objects are created.',
  terms: ['Dependency injection (DI)', 'Constructor injection, setter injection, and field injection', 'Dependency', '@Component'],
  controls: [
    { id: 'how', label: 'How OrderService gets PayService', type: 'select', value: 'inject', options: [['inject', 'Receive it as a constructor parameter (injection)'], ['new', 'Create it directly with new PayService()'], ['none', 'Neither receive nor create it']] },
    { id: 'dep', label: 'Put @Component above PayService', type: 'check', value: true },
  ],
  // q is the question shown on the question-style screen. t and d are the name and the description used in the text-only reading
  presets: [
    { t: 'Default settings', q: 'What does dependency injection look like, and what does Spring do for you?', d: 'PayService is received as a constructor parameter. Spring puts the PayService bean it was keeping into the constructor.', v: { how: 'inject', dep: true } },
    { t: 'Creating it directly with new PayService()', q: 'What if you create it with new PayService() instead of receiving it in the constructor?', d: 'The result is the same, but what OrderService uses is an object it created itself, not the bean Spring injected, and 2 PayService objects are created.', v: { how: 'new', dep: true } },
    { t: 'Neither receiving nor creating it', q: 'What if you neither receive nor create it?', d: 'The payService field is empty, so the program stops with a NullPointerException the moment it uses it.', v: { how: 'none', dep: true } },
    { t: 'PayService without @Component', q: 'What if you receive it in the constructor but PayService has no @Component?', d: 'There is no PayService bean to inject, so Spring fails while starting.', v: { how: 'inject', dep: false } },
  ],
  fieldText: { bean: 'Bean injected by Spring', new: 'Object made with new', empty: 'None (empty)' },
  code: function (c) {
    // Three files are shown one after another, separated by "// File:" lines. Each file compiles as it is
    // The import line stays even in the combinations without @Component (an unused import still compiles). This is the same as the source the checking program ran
    var o = ['// File: app/PayService.java', 'package app;', '', 'import org.springframework.stereotype.Component;', ''];
    if (c.dep) o.push('@Component');
    o.push('public class PayService {', '    public String pay() {', '        return "Payment complete";', '    }', '}', '', '// File: app/OrderService.java', 'package app;', '', 'import org.springframework.stereotype.Component;', '', '@Component', 'public class OrderService {');
    o.push({ inject: '    private final PayService payService;', new: '    private final PayService payService = new PayService();', none: '    private PayService payService;' }[c.how], '');
    if (c.how === 'inject') o.push('    // Injection: if you write the object you need as a constructor parameter, Spring puts it in', '    public OrderService(PayService payService) {', '        this.payService = payService;', '    }', '');
    o.push('    public String order() {', '        return payService.pay();', '    }', '}', '', '// File: app/Main.java', 'package app;', '', 'import org.springframework.context.ApplicationContext;', 'import org.springframework.context.annotation.AnnotationConfigApplicationContext;', '', 'public class Main {', '    public static void main(String[] args) {', '        ApplicationContext context =', '                new AnnotationConfigApplicationContext("app");', '        OrderService orderService = context.getBean(OrderService.class);', '        System.out.println(orderService.order());', '    }', '}');
    return o.join('\n');
  },
  label: function (c) { return { inject: 'Received in the constructor', new: 'Created directly with new', none: 'Neither received nor created' }[c.how] + ' · ' + (c.dep ? 'PayService has @Component' : 'PayService has no @Component'); },
  columns: ['Result', 'PayService that OrderService uses', 'PayService objects created'],
  simulate: function (c) {
    var how = c.how, inj = how === 'inject', nw = how === 'new', dep = !!c.dep, ev = [], sum = [], order = [], ft = this.fieldText;
    var st = { phase: '', line: '', scanned: false, ps: false, os: '', field: '', ext: false, need: false, made: 0, out: [], exc: '' };
    function push(s, k) { ev.push({ s: s, k: k, snap: JSON.parse(JSON.stringify(st)) }); }
    function newPay(by) { st.made++; order.push('PayService<-' + by); }
    // 1. Spring starts
    st.phase = 'start'; st.line = 'Creating context';
    push('The first line of the main method runs. new AnnotationConfigApplicationContext("app") starts Spring. The "app" in the parentheses is the name of the package where Spring looks for classes, and Spring prepares a place to keep the objects it creates. An object that Spring creates and keeps is called a bean.', '');
    // 2. Component scanning
    st.phase = 'scan'; st.scanned = true;
    push(dep
      ? 'Spring scans the classes in the app package and looks for classes with @Component. It is on PayService and OrderService, so Spring notes down that it will create and keep objects of these two classes.'
      : 'Spring scans the classes in the app package and looks for classes with @Component. It is only on OrderService, so the only thing to keep is OrderService. The PayService class is in the same package, but it has no @Component, so Spring did not find this class.', '');
    // 3. From here it depends on how it gets the object
    if (inj) {
      st.phase = 'need'; st.need = true;
      push('Spring is about to create the OrderService object. It looks at the constructor OrderService(PayService payService) and sees that it receives PayService as a parameter. So Spring finds out that OrderService needs a PayService object to do its work. This is called "OrderService depends on PayService".', '');
      if (dep) {
        st.phase = 'makePay'; st.ps = true; newPay('spring');
        push('To create OrderService, a PayService object has to exist first, so Spring creates a PayService object first and keeps it. This object is the PayService bean. The number of PayService objects created is 1.', '');
        st.phase = 'makeOrder'; st.os = 'made'; st.field = 'bean'; order.push('OrderService<-spring');
        push('Spring creates the OrderService object. It puts the PayService bean it was keeping into the payService parameter of the OrderService constructor, and the line this.payService = payService; in the constructor makes the field point to that object. The code we wrote has neither new OrderService(...) nor new PayService(). Spring putting in the object that is needed like this is dependency injection.', 'good');
      } else {
        st.phase = 'miss';
        push('Spring looks for the PayService bean it keeps, so that it can inject a PayService object. But PayService has no @Component, so it is a class Spring does not know, and there is no PayService bean kept. There is no object to inject.', 'bad');
        st.phase = 'fail'; st.os = 'fail'; st.exc = 'fail'; st.line = 'Startup exception';
        push('Spring cannot create the OrderService object and throws UnsatisfiedDependencyException. The cause is NoSuchBeanDefinitionException, which means there is no bean of type PayService. This exception occurs at the line new AnnotationConfigApplicationContext("app"), so main cannot go on to the lines below and stops. The number of PayService objects created is 0, and no OrderService object was created either.', 'bad');
      }
    } else if (nw) {
      st.phase = 'makeOrder'; st.os = 'making'; order.push('OrderService<-spring');
      push('Spring starts to create the OrderService object. This class has no constructor, so there is no parameter to receive PayService. OrderService needs a PayService object to do its work, but there is no mark that Spring can read, so Spring does not know this and has nothing to inject.', '');
      st.phase = 'newPay'; st.os = 'made'; st.field = 'new'; st.ext = true; newPay('OrderService.<init>');
      push('While the OrderService object is being created, the field line private final PayService payService = new PayService(); runs. OrderService creates a PayService object directly, and the field payService refers to that object.' + (dep ? ' This object is not a bean that Spring keeps. It was created by the code we wrote.' : ' PayService has no @Component, so it is a class Spring does not know, but that does not matter for creating it directly.') + ' The number of PayService objects created is 1.', 'hot');
      if (dep) {
        st.phase = 'makePay'; st.ps = true; newPay('spring');
        push('Next, Spring also creates an object of PayService, which has @Component, and keeps it as the PayService bean. This bean is a different object from the one OrderService created directly. The number of PayService objects created is now 2.', '');
      }
    } else {
      st.phase = 'makeOrder'; st.os = 'made'; st.field = 'empty'; order.push('OrderService<-spring');
      push('Spring creates the OrderService object. This class has no constructor, so there is no parameter to receive PayService, and there is no new PayService() either. OrderService needs a PayService object to do its work, but it neither received nor created one, so the field payService refers to no object and is empty (null).', '');
      if (dep) {
        st.phase = 'makePay'; st.ps = true; newPay('spring');
        push('Spring creates a PayService object and keeps it as the PayService bean. But OrderService did not receive this bean, so the two objects are not connected. The number of PayService objects created is 1.', '');
      }
    }
    // 4. main goes on (when startup did not fail)
    if (st.exc !== 'fail') {
      st.phase = 'getBean'; st.line = 'getBean call';
      push('The line that creates the context ends without an error, and the next line of main, context.getBean(OrderService.class), runs. Spring gives main the OrderService bean it was keeping. The object was already created in the earlier line, and no new object was created in this line.' + (how === 'none' ? ' Spring did not raise an error even though the payService field is empty.' : ''), '');
      if (how === 'none') {
        st.phase = 'npe'; st.line = 'Exception'; st.exc = 'npe';
        push('The orderService.order() method runs. order() tries to call payService.pay(), but payService is empty (null), so there is no object to call. A NullPointerException occurs, and since no code handles it, the program stops. The fact that it was empty showed up only at this moment of use.', 'bad');
      } else {
        st.phase = 'pay'; st.line = 'order() call';
        push('The orderService.order() method runs. order() calls payService.pay(), and this payService is ' + (inj ? 'the PayService bean that Spring injected.' : 'an object that OrderService created directly.' + (dep ? ' The PayService bean that Spring keeps is not used.' : '')) + ' The pay() method returns "Payment complete".', 'good');
        st.out.push('Payment complete'); st.phase = 'done'; st.line = 'Output printed';
        push('System.out.println prints the text it received, "Payment complete".', '');
      }
    }
    // Summary: the first line is the answer to this setting (the question)
    if (inj && dep) {
      sum.push('Dependency injection means that a class does not create the objects it needs, but receives them from outside. In Spring, all you do is write PayService as a constructor parameter, and what differs from an ordinary class is that when Spring creates OrderService, it puts the PayService bean it was keeping into that constructor.');
      sum.push('Spring read from the constructor parameter that OrderService depends on PayService, created PayService first, and then put it in to create OrderService. Our code has no new that creates the two objects, and the number of PayService objects created is 1.');
    } else if (inj) {
      sum.push('If you write that you receive it in the constructor but Spring has no PayService bean to inject, Spring cannot create OrderService and fails while starting. This is because PayService has no @Component, so Spring could not find the PayService class.');
      sum.push('Spring injects only the beans it keeps, and it does not create a missing object with new for you. The error occurs at startup, not at the moment of use, so the number of PayService objects created is 0 and main stops at its first line.');
    } else if (nw && dep) {
      sum.push('If you create it with new PayService(), OrderService creates and uses the PayService object itself, so there is nothing for Spring to inject. The result is the same "Payment complete", but what OrderService used is not the bean Spring keeps but an object it created itself.');
      sum.push('2 PayService objects were created. They are the PayService bean that Spring keeps and the object OrderService created directly, and only the one created directly was used. Nobody used the bean that Spring created.');
    } else if (nw) {
      sum.push('If you create it with new PayService(), it runs even without @Component on PayService. Spring does not know the class, but OrderService created it by itself, and Spring is not injecting it, so no bean is needed.');
      sum.push('The number of PayService objects created is 1, and Spring does not know this object. Even if the same "Payment complete" comes out, the source of the object is OrderService, not Spring.');
    } else if (dep) {
      sum.push('If you neither receive nor create it, the payService field of OrderService is empty. Spring created and kept a PayService bean but did not connect it to OrderService, and the program stopped with a NullPointerException the moment order() called payService.pay().');
      sum.push('Spring injects only when, as in this code, you write that you need it as a constructor parameter. If you do not write it, Spring does not inject it even if it has a bean it was keeping, and there is no error at startup, so the problem shows up only the moment you use it.');
    } else {
      sum.push('If you neither receive nor create it, the payService field of OrderService is empty whether or not there is a PayService bean, and the program stops with a NullPointerException in order(). Here PayService also has no @Component, so no PayService object was created at all.');
      sum.push('Even in the same setting without @Component, Spring failed while starting when the object was received in the constructor, but here startup succeeded. You did not write that you want it injected, so Spring did not even look for PayService, and the fact that a needed object is missing showed up at the moment of use.');
    }
    var run = st.exc === 'fail' ? 'Spring failed while starting: no PayService bean' : st.exc === 'npe' ? 'Stopped by NullPointerException' : st.out.join(' / ');
    var used = st.exc === 'fail' ? 'OrderService could not be created' : ft[st.field];
    return { events: ev, summary: sum, order: order, ft: ft, row: [run, used, st.made + ''] };
  },
  render: function (v, sim, t, H, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : null, dep = sim.c.dep, ft = sim.ft;
    if (!s) { H.text(v, 'Click Run to start from main starting Spring.'); return; }
    var pay = !s.scanned ? '-' : !dep ? 'Not found (no @Component)' : s.ps ? 'Created and kept' : 'Not created yet';
    var ord = { '': s.need ? 'Being created' : s.scanned ? 'Not created yet' : '-', making: 'Being created', made: 'Created and kept', fail: 'Could not be created' }[s.os];
    H.table(v, ['Beans that Spring keeps', 'State'], [{ cls: !s.scanned || dep ? '' : 'gone', cells: ['PayService', pay] }, { cls: '', cells: ['OrderService', { v: ord, cls: s.os === 'fail' ? 'bad' : '' }] }], 'Where Spring keeps beans');
    if (s.os === 'made' || s.os === 'making') H.table(v, ['Field of OrderService', 'What it refers to'], [{ cls: '', cells: ['payService', s.field ? { v: ft[s.field], cls: s.field === 'bean' ? 'good' : s.field === 'empty' ? 'bad' : 'hot' } : '-'] }], 'Field of OrderService');
    if (s.out.length || s.exc) H.table(v, ['Result'], s.out.map(function (o) { return { cls: '', cells: [{ v: o, cls: 'good' }] }; }).concat(s.exc ? [{ cls: '', cells: [{ v: s.exc === 'fail' ? 'Spring failed while starting: no PayService bean' : 'Stopped by NullPointerException', cls: 'bad' }] }] : []), 'Output');
    H.counters(v, [[s.made, 'PayService objects created']]);
  },
  // Diagram: inside the "where Spring keeps beans" area on the left are the PayService bean and the OrderService bean, and on the right are main and an object created directly outside the area. The arrow from the payService field of OrderService to PayService is green only when Spring injected it, goes outside the area if it points to an object created directly, and has no arrow if the field is empty. Below is the number of PayService objects created.
  draw: function (P, sim, shown) {
    var c = sim.c, ft = sim.ft, last = shown[shown.length - 1], s = last ? last.snap : null, ph = s ? s.phase : '';
    P.size(680, 232);
    P.region('sp', 14, 16, 466, 150, 'Where Spring keeps beans');
    // PayService bean
    var psSub = !s || !s.scanned ? [' '] : !c.dep ? ['No @Component', 'Unknown to Spring'] : s.ps ? ['1 object'] : ['Not created yet'];
    P.box('ps', 28, 52, 168, 30 + psSub.length * 19, { cls: s && s.ps ? ((ph === 'makePay' || (ph === 'pay' && s.field === 'bean')) ? 'good now' : 'good') : 'ghost', title: 'PayService bean', sub: psSub });
    // OrderService bean: its state and the payService field
    var st0 = !s ? ' ' : { '': s.need ? 'Being created' : s.scanned ? 'Not created yet' : ' ', making: 'Being created', made: '1 object', fail: 'Could not be created' }[s.os];
    var osCls = !s || !s.scanned ? 'ghost' : s.os === 'fail' || ph === 'npe' ? 'bad' : ph === 'makeOrder' || ph === 'need' || ph === 'getBean' || ph === 'newPay' ? 'hot now' : s.os === 'made' ? 'good' : 'plain';
    P.box('os', 256, 52, 196, 87, { cls: osCls, title: 'OrderService bean', sub: [st0, 'payService field', s && s.field ? ft[s.field] : '-'] });
    // main and the object created directly
    P.box('mn', 510, 16, 156, 68, { cls: !s ? 'plain' : (s.exc === 'fail' || ph === 'npe') ? 'bad' : (ph === 'getBean' || ph === 'pay') ? 'hot now' : 'wait', title: 'main', sub: [s && s.line ? s.line : 'Waiting'] });
    P.box('px', 510, 104, 156, 68, { cls: s && s.ext ? (ph === 'pay' ? 'hot now' : 'hot') : 'ghost', title: 'Object from new', sub: [s && s.ext ? '1 PayService' : 'None'] });
    // Arrows
    if (s && (ph === 'getBean' || ph === 'pay' || ph === 'npe')) P.arrow('call', 'mn:l:0.3', 'os:r:0.25', { cls: ph === 'npe' ? 'bad' : 'hot', label: 'call' });
    if (s && s.field === 'bean') P.arrow('rf', 'os:l:0.75', 'ps:r:0.75', { cls: 'good', label: 'refers' });
    else if (s && s.need && s.field !== 'bean') P.arrow('rf', 'os:l:0.75', 'ps:r:0.75', s.os === 'fail' ? { cls: 'bad', label: 'no bean' } : { cls: 'dash', label: 'needed' });
    if (s && s.field === 'new') P.arrow('rn', 'os:r:0.8', 'px:l:0.4', { cls: 'hot', label: 'refers' });
    P.box('n1', 14, 184, 652, 36, { cls: s && s.made ? 'good' : 'ghost', title: 'PayService objects created', right: (s ? s.made : 0) + '' });
    P.note('The "call" arrow is main calling a method of OrderService, and a "refers" arrow is the payService field of OrderService referring to that PayService object. A green "refers" arrow points to the bean Spring injected, and a yellow one points to the object OrderService created itself. The dashed "needed" arrow means the constructor says it takes a PayService but nothing has been injected yet, and the red "no bean" arrow means it failed because there was no bean to inject. If the field is neither received nor created, it refers to nothing, so there is no "refers" arrow.');
  },
  assume: 'These are the results of running Spring Framework 7.0.9 on JDK 21.0.12.1. Spring Boot was not used, and only the component scanning of AnnotationConfigApplicationContext("app"), which the main on the screen uses as it is, was used. All 6 combinations were checked by compiling a source with the same code as on the screen (PayService, OrderService, and Main in the package app) with javac (-parameters) and running it as a child Java process. Components were not registered by hand, and Spring was made to scan the classes and find them. Only in the source used for checking, a Probe class and four lines were added. One line each was added to the two classes, an instance initializer block that reads from the stack which side called its constructor (Spring, or which constructor of OrderService) when an object is created and records it, and to main, one line each that measures after the context is created and after getBean; the checking script removes these lines when it compares with the code on the screen. What was checked is the result of the run (the output, the kind and cause of the exception when startup failed, and the exception that stopped it and where), the PayService that OrderService uses, and the number of PayService objects created. "The PayService that OrderService uses" was measured, not guessed. During the run, the payService field of the OrderService object was read by reflection, and it was compared with the PayService bean in the context to see whether it is the same object (==) and whether it is empty. The numbers of objects were also counted by the number of times the constructors were called. The facts that the step sentences rely on were also measured separately: the classes that component scanning found; the order in which the objects were created (with constructor injection PayService first, and with direct creation PayService is created while OrderService is being created); that all objects are created at the line that creates the context and no new object is created at the getBean line; the dependencies of OrderService that Spring recorded (payService only when it is received in the constructor); that when there is no PayService bean, OrderService is not created and main stops at its first line; that the place where the program stops using an empty field is the order() method of OrderService; and that our code has no line new OrderService(...). The actual exception in the combination where startup failed is UnsatisfiedDependencyException with the cause NoSuchBeanDefinitionException (no bean of type PayService), and the original text was kept in the Probe output. What the documentation specifies is the following. The Dependency Injection section of the Core part of the Spring Framework documentation (dependency injection is a process in which objects define the other objects they depend on only through constructor arguments and so on, and the container injects them when it creates the bean; and constructor-based injection is the container calling a constructor with arguments that each represent a dependency), the Using @Autowired section (if the target bean has only one constructor, @Autowired does not have to be put on that constructor), the Classpath Scanning and Managed Components section, and the API documentation of @Component and AnnotationConfigApplicationContext (a class with @Component is a candidate for auto-detection, and the specified package is scanned and bean definitions are registered). The following behaviors seen in the same run are not defined by the documentation but were observed on this version. In the order in which the class files are scanned, OrderService came before PayService, and because of that, with constructor injection, PayService was created first while OrderService was being created; with direct creation by new, Spring creates OrderService first and the PayService bean after it (this depends on the scan order, so it could change if the class names change); and Spring does not report an empty field as an error. The code on the screen shows three files one after another, separated by "// File:" lines, and each file compiles as it is, including its package and import lines. This lab covers only constructor injection. Setter injection, field injection (@Autowired), the case where there are several beans of the same type, circular dependencies, the scope and lifecycle of beans, and designs that receive an interface are not covered, and they are covered in the in-depth lab "Bean creation and injection".',
});

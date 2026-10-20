Lab.register({
  id: 'bean_basic', nav: 'Beans', cat: 'Fundamentals', mode: 'step', basic: true, deep: ['ioc'],
  title: 'What is a bean, and how does it differ from an object you just created?',
  why: 'If you create an object with new everywhere you use it, then an object that needs to exist only once in the whole program gets created several times in various places, and the side that uses it also has to create and connect the other objects it uses, one by one. A Spring bean is an object that Spring creates when it starts and hands the same object to every place that needs it, so that Spring, instead of our code, takes care of creating and connecting.',
  use: 'On a Spring server, the controller that receives requests, the service that handles business rules, and the repository objects that work with the DB are usually beans. @Controller, @Service, and @Repository are also annotations built on @Component, so attaching them makes a bean. On the other hand, values that are newly created each time, such as one member read from the DB or an object that received a request body, are not made into beans.',
  intro: 'A bean is an object that Spring creates and keeps. In code it is an ordinary class. If you write @Component above the class, then when Spring starts it scans the app package, finds that class, creates one object, and puts it in a place for keeping objects called the container. We do not use new. Where we need the object, we ask Spring for it with context.getBean(Greeter.class), and however many times we ask, Spring gives us the same one object it was keeping. In this lab you run the same code while removing @Component or creating the object with new Greeter() instead of getBean, and see how many objects Spring created, how many objects our code created with new, and whether a == b is true or false.',
  terms: ['Spring bean', 'IoC container (ApplicationContext)', '@Component', 'Component scanning'],
  controls: [
    { id: 'comp', label: 'Put @Component above Greeter', type: 'check', value: true },
    { id: 'get', label: 'How to get a Greeter object', type: 'select', value: 'bean', options: [['bean', 'Receive it with context.getBean(Greeter.class)'], ['new', 'Create it directly with new Greeter()']] },
  ],
  // q is the question shown on the question-style screen. t and d are the name and the description used in the text-only reading
  presets: [
    { t: 'Default settings', q: 'What does a bean look like, and what happens when you ask Spring for it?', d: 'A Greeter with @Component. Spring creates one object when it starts and keeps it, and gives you that object however many times you ask.', v: { comp: true, get: 'bean' } },
    { t: 'Removing @Component', q: 'What if you remove @Component?', d: 'Spring does not know the Greeter class, so it has no object to keep, and when you ask for one it stops with an exception.', v: { comp: false, get: 'bean' } },
    { t: 'Creating it with new Greeter()', q: 'What if you create it with new Greeter() instead of getBean?', d: 'An object we created with new is not kept by Spring, so it is not a bean, and it is a different object every time you create it.', v: { comp: true, get: 'new' } },
    { t: 'Changing both', q: 'What if you remove @Component and create it with new Greeter()?', d: 'Spring creates no Greeter object at all, and the 2 objects we created are different from each other.', v: { comp: false, get: 'new' } },
  ],
  code: function (c) {
    var g = ['// File: app/Greeter.java', 'package app;', ''], m = ['// File: app/Main.java', 'package app;', '', 'import org.springframework.context.ApplicationContext;', 'import org.springframework.context.annotation.AnnotationConfigApplicationContext;', ''];
    if (c.comp) g.push('import org.springframework.stereotype.Component;', '', '// Mark: Spring creates an object of this class and keeps it', '@Component');
    g.push('public class Greeter {', '    public String hello() {', '        return "Hello";', '    }', '}');
    m.push('public class Main {', '    public static void main(String[] args) {', '        // Start Spring. It scans the app package for @Component', '        ApplicationContext context =', '                new AnnotationConfigApplicationContext("app");');
    if (c.get === 'bean') m.push('        // Ask for the Greeter object that Spring is keeping', '        Greeter a = context.getBean(Greeter.class);', '        Greeter b = context.getBean(Greeter.class);');
    else m.push('        Greeter a = new Greeter();', '        Greeter b = new Greeter();');
    m.push('        System.out.println(a.hello());', '        System.out.println(a == b);', '    }', '}');
    return g.concat(['', ''], m).join('\n');
  },
  label: function (c) { return (c.comp ? 'has @Component' : 'no @Component') + ' · ' + (c.get === 'bean' ? 'received with getBean' : 'created directly with new'); },
  columns: ['Result', 'a == b', 'Greeter objects created by Spring', 'Objects created by our code with new'],
  simulate: function (c) {
    var ev = [], sum = [], via = c.get === 'bean', EXC = 'NoSuchBeanDefinitionException';
    var st = { up: false, bean: false, made: 0, ours: 0, va: '', vb: '', out: [], exc: '', hot: '' };
    function push(s, k) { ev.push({ s: s, k: k, snap: JSON.parse(JSON.stringify(st)) }); }
    // The first line of the main method: start Spring. Spring scans the app package for @Component, and creates and keeps an object of the class it finds
    st.up = true; st.hot = 'ct';
    push('The main method runs, and the line new AnnotationConfigApplicationContext("app") starts Spring. When it starts, the container is created. The container is the place where Spring keeps the objects it creates, and for now it is empty.', '');
    if (c.comp) {
      push('Spring scans the classes in the app package and looks for classes with @Component. It is on the Greeter class.', '');
      st.bean = true; st.made = 1; st.hot = 'bean';
      push('Spring creates one object of the Greeter class and keeps it in the container. An object that Spring creates and keeps like this is a bean. This object is already created when Spring starts, before our code asks for it.' + (via ? ' The code we wrote has no line new Greeter().' : ' It is an object unrelated to the new Greeter() that we write below.'), 'good');
    } else {
      push('Spring scans the classes in the app package and looks for classes with @Component. It finds none. The file of the Greeter class is in the app package, but it has no @Component, so Spring does not recognize this class and does not create an object. The container is empty.', 'bad');
    }
    if (via && c.comp) {
      st.va = 'bean'; st.hot = 'va';
      push('The line Greeter a = context.getBean(Greeter.class); runs. It asks Spring for a Greeter object. Spring does not create a new one and gives us the object it was keeping in the container. The variable a points to that object. The number of objects created by Spring is still 1.', 'good');
      st.vb = 'bean'; st.hot = 'vb';
      push('The line Greeter b = context.getBean(Greeter.class); runs. Even when we ask once more, Spring does not create a new one and gives us the same object. This is because Spring creates only one bean and gives us that one every time we ask. The variable b points to the same object as a.', 'good');
    } else if (via) {
      st.va = 'miss'; st.hot = 'va';
      push('The line Greeter a = context.getBean(Greeter.class); runs. It asks Spring for a Greeter object, but the container is empty. Spring does not know the Greeter class, so it does not create one for us either, and it throws ' + EXC + ', which means "there is no such bean". No code handles this exception, so the program stops at this line.', 'bad');
      st.exc = EXC; st.hot = '';
      push('The program stopped, so the lines below it do not run. Neither the Greeter b line nor the line that prints the value runs, so nothing is printed.', 'bad');
    } else {
      st.ours = 1; st.va = 'o1'; st.hot = 'o1';
      push('The line Greeter a = new Greeter(); runs. Our code directly creates one Greeter object with new, and the variable a points to that object. We did not ask Spring for it, so this is not an object that the container keeps, and Spring does not know this object.' + (c.comp ? ' There is a separate object that Spring created in the container, but a does not point to it.' : ''), 'good');
      st.ours = 2; st.vb = 'o2'; st.hot = 'o2';
      push('The line Greeter b = new Greeter(); runs. Each time new runs, one new object is created, so another object is created this time too, and the variable b points to it. The number of objects our code created with new is now 2.', '');
    }
    if (!st.exc) {
      st.out.push('Hello'); st.hot = 'va';
      push('The line System.out.println(a.hello()); runs. The hello() method of the object that a points to returns "Hello", and this text is printed.' + (via ? '' : ' Even for an object that Spring did not create, the method written in the class runs just as usual.'), '');
      st.out.push(via ? 'true' : 'false'); st.hot = '';
      push('The line System.out.println(a == b); runs. a == b is an expression that compares whether the two variables point to the same object. ' + (via ? 'a and b point to the same object kept in the container, so true is printed.' : 'a and b point to different objects that we created with new, so false is printed.'), via ? 'good' : '');
    }
    // Summary: the first line is the answer to this setting (the question)
    if (c.comp && via) {
      sum.push('A bean is an object that Spring creates and keeps. What differs from an ordinary class is the single @Component above the class, and with it, Spring creates one Greeter object when it starts and keeps it in the container.');
      sum.push('getBean does not create a new object. It takes out the object that was being kept, so with the default setting, however many times we ask, the same object comes back and a == b is true. Our code has no line new Greeter().');
    } else if (via) {
      sum.push('Without @Component, Spring does not recognize the Greeter class, so it does not create and keep an object. The container was empty, so getBean(Greeter.class) threw ' + EXC + ', and the program stopped at that line.');
      sum.push('Spring does not create an object of a class without @Component just because it received a request for one. To become a bean, a class has to be marked so that Spring can find it.');
    } else if (c.comp) {
      sum.push('An object that our code creates directly with new Greeter() is not a bean. Spring created and kept 1 Greeter object when it started, but this code did not ask for it, and it ran new twice and created 2 different objects, so a == b is false.');
      sum.push('Even with @Component, an object created with new is not one that Spring keeps. To use the object Spring created, you have to ask Spring for it, and otherwise the kept object is left unused.');
    } else {
      sum.push('A Greeter object created with new and without @Component is an ordinary object unrelated to Spring. Spring created no Greeter object at all (0), and the 2 we created are different objects, so a == b is false.');
      sum.push('Even though Spring was started, this code ran as usual without any help from Spring. An object that Spring creates and keeps is a bean, and an object that our code creates and uses with new, without handing it to Spring, is not a bean.');
    }
    return { events: ev, summary: sum, row: [st.exc ? 'Stopped by ' + EXC : st.out[0], st.out.length > 1 ? st.out[1] : 'Not run', st.made + '', st.ours + ''] };
  },
  render: function (v, sim, t, H, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : null;
    if (!s) { H.text(v, 'Click Run to start from Spring starting up.'); return; }
    H.table(v, ['Kept object', 'Count'], s.bean ? [{ cls: '', cells: ['Greeter', '1'] }] : [{ cls: 'gone', cells: [s.up ? 'Empty' : 'Before Spring starts', ''] }], 'Where Spring keeps objects (container)');
    var what = { bean: 'Greeter object in the container', o1: 'First object we created with new', o2: 'Second object we created with new', miss: 'Stopped by an exception' };
    if (s.va) H.table(v, ['Variable', 'Points to'], [['a', s.va], ['b', s.vb]].filter(function (r) { return r[1]; }).map(function (r) { return { cls: '', cells: [r[0], { v: what[r[1]], cls: r[1] === 'miss' ? 'bad' : '' }] }; }), 'Variables in main');
    if (s.out.length || s.exc) H.table(v, ['Output'], s.out.map(function (o) { return { cls: '', cells: [{ v: o, cls: 'good' }] }; }).concat(s.exc ? [{ cls: '', cells: [{ v: 'Stopped by ' + s.exc, cls: 'bad' }] }] : []), 'Result');
    H.counters(v, [[s.made, 'Objects created by Spring'], [s.ours, 'Objects created by our code with new']]);
  },
  // Diagram: on the left the variables a and b, in the upper right the place where Spring keeps objects (the container) with the Greeter bean box inside it, and in the lower right the two objects our code created with new outside the container. Arrows from a and b show whether they point to the bean in the container, to an object outside the container (or head toward an empty place and get blocked). At the bottom are two counting boxes.
  draw: function (P, sim, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : null, hot = s ? s.hot : '';
    P.size(680, 316);
    P.region('ct', 250, 16, 416, 118, 'Where Spring keeps objects (container)' + (s && s.up ? '' : ': before start'));
    P.box('bean', 270, 48, 376, 66, { cls: s && s.bean ? (hot === 'bean' ? 'good now' : 'good') : 'ghost', title: 'Greeter bean', sub: s && s.bean ? ['Object created and kept by Spring'] : [s && s.up ? 'Empty' : ' '] });
    P.region('ow', 250, 150, 416, 106, 'Outside the container: objects our code created with new');
    P.box('o1', 270, 172, 376, 34, { cls: s && s.ours > 0 ? (hot === 'o1' ? 'wait now' : 'wait') : 'ghost', title: 'Greeter object (first new)', right: s && s.ours > 0 ? 'Created' : 'Not yet' });
    P.box('o2', 270, 212, 376, 34, { cls: s && s.ours > 1 ? (hot === 'o2' ? 'wait now' : 'wait') : 'ghost', title: 'Greeter object (second new)', right: s && s.ours > 1 ? 'Created' : 'Not yet' });
    var vs = { '': 'Not yet', bean: 'Points to bean', o1: 'First new object', o2: 'Second new object', miss: 'Exception' };
    function vcls(x) { return x === 'miss' ? 'bad' : x ? 'good' : 'ghost'; }
    P.box('va', 14, 52, 150, 58, { cls: vcls(s && s.va) + (hot === 'va' ? ' now' : ''), title: 'Greeter a', sub: vs[s ? s.va : ''] });
    P.box('vb', 14, 146, 150, 58, { cls: vcls(s && s.vb) + (hot === 'vb' ? ' now' : ''), title: 'Greeter b', sub: vs[s ? s.vb : ''] });
    var to = { bean: 'bean:l:', o1: 'o1:l:', o2: 'o2:l:', miss: 'bean:l:' };
    if (s && s.va) P.arrow('ra', 'va:r', to[s.va] + '0.35', { cls: s.va === 'miss' ? 'bad' : 'good' });
    if (s && s.vb) P.arrow('rb', 'vb:r', to[s.vb] + '0.65', { cls: 'good' });
    P.box('n1', 14, 270, 322, 36, { cls: s && s.made ? 'good' : 'ghost', title: 'Greeter objects created by Spring', right: (s ? s.made : 0) + '' });
    P.box('n2', 344, 270, 322, 36, { cls: s && s.ours ? 'wait' : 'ghost', title: 'Objects created by our code with new', right: (s ? s.ours : 0) + '' });
  },
  assume: 'These are the results of running Spring Framework 7.0.9 on JDK 21.0.12.1. Spring Boot was not used, and only AnnotationConfigApplicationContext("app") was used, as in the code on the screen. All 4 combinations were run as they are, by compiling a source with the same structure as the code on the screen (Greeter and Main in the package app) and starting a new Java process. Greeter was not registered by hand, and Spring was made to scan the app package and find @Component. What was checked is the text that the program printed (Hello and the value of a == b), the kind of exception when it stopped with an exception, the number of Greeter objects created by Spring, and the number of objects created by our code with new. The numbers of objects were measured, not guessed. Only in the source used for checking, a line that increases a number each time an object is created was added to the constructor of Greeter, and the count right after Spring started was recorded as the number created by Spring, and the count at the end minus that count was recorded as the number our code created with new. The count right after starting was already 1 (when @Component is present) before getBean was called, so Spring creates the object when Spring starts, not when getBean is called. Calling getBean twice did not increase the count and a == b was true, and in the combinations that use new, the number of Greeter beans that the container keeps was the same at the end as right after starting, so the container did not keep the objects created with new. When @Component was absent, the count right after starting was 0 and there were no registered names in the container (Spring\'s internal ones were excluded), and at the getBean line org.springframework.beans.factory.NoSuchBeanDefinitionException (the message says there is no bean of type app.Greeter) occurred, the process ended with an error code, and nothing was printed. When @Component was present, there was one registered name in the container, greeter, and that bean was a singleton. What the documentation specifies is the following sections of the Core part of the Spring Framework documentation. Introduction to the Spring IoC Container and Beans (a bean is an object that is created, assembled, and managed by the Spring IoC container, and an object that is not is just one of the many objects in the application), Classpath Scanning and Managed Components (@Component is a generic annotation for a component managed by Spring, and @Service, @Controller, and others are specializations of it; Spring finds annotated classes and registers bean definitions; and if no name is given, the class name with its first letter in lowercase is used), Bean Scopes (singleton is the default scope, and the container creates exactly one object for that bean definition and returns that object every time a request comes), and the API documentation of AnnotationConfigApplicationContext(String... basePackages) (it finds components in the given packages, registers bean definitions, and refreshes the context automatically). Unlike what the documentation specifies, that the object is created at startup, that a class without @Component is not created even if getBean is called, and the name of the exception are behaviors observed on this version. The code on the screen shows two files (app/Greeter.java and app/Main.java) one after the other, and both classes are in the app package. We also checked that the screen code of all 4 combinations, split into its files as it is, compiles with javac. The line that closes the container was not used. Besides @Component, there are other ways to register a bean, such as a @Bean method, and @Service and @Controller, which belong to the @Component family, beans whose scope is not singleton, and dependency injection, which connects beans to each other, are not covered. They are covered in the in-depth lab "The Spring container and beans".',
});

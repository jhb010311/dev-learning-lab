Lab.register({
  id: 'annot_basic', nav: 'Annotations', cat: 'Fundamentals', mode: 'step', basic: true, deep: ['annot'],
  title: 'What is an annotation, and who does what when you add one?',
  why: 'Before annotations, information such as "this method is a test" or "Spring creates objects of this class" had to be given through a rule, such as a method name that starts with test, or through an XML configuration file kept apart from the code, so when you changed the code you also had to update the configuration file separately. An annotation lets you write such a mark with @ right above the code it belongs to, so the code and the mark are seen in one place and are changed together.',
  use: '@Override makes the compiler check that you rewrote the parent\'s method correctly. Spring\'s @Service, @Repository, @Controller, and @Component make Spring create an object of that class and register it as a bean, and Spring reads @GetMapping and @Transactional too and acts on them. JUnit\'s @Test makes JUnit run that method as a test. You rarely make annotations yourself, and usually you attach the ones that Java and frameworks have already made.',
  intro: 'An annotation is a tag that starts with @, such as @Service, @Override, or @Test, and that you put above a class or a method. The tag itself contains no code that runs, and what it means is decided by whatever reads it. @Override is read by the compiler, @Service by Spring (it creates objects of the classes it finds by component scanning and registers them as beans), and @Test by JUnit. In this lab you add and remove the three annotations, go through or skip the reader (Spring, JUnit), compile and run the same code, and see what changes. Then you look at the real declarations of @Service and @Override to see how far @Retention keeps a tag, and finally you make an annotation and the code that reads it yourself. OrderService, Order, OrderTest, and Job in the code are classes made as examples for this lab.',
  terms: ['Annotation', '@Override', '@Service and @Repository', 'Component scanning', '@Test', '@Retention and @Target', 'Meta-annotation', '@interface'],
  controls: [
    { id: 'who', label: 'Annotation to look at', type: 'select', value: 'service', options: [['service', '@Service (provided by Spring)'], ['override', '@Override (provided by Java)'], ['test', '@Test (provided by JUnit)'], ['decl', 'Declarations of @Service and @Override (@Retention)'], ['run', '@Run (made by us)']] },
    { id: 'put', label: 'Add the annotation', type: 'check', value: true, show: function (c) { return c.who !== 'decl'; } },
    { id: 'spring', label: 'Start Spring and get the object with getBean (off: create it directly with new)', type: 'check', value: true, show: function (c) { return c.who === 'service'; } },
    { id: 'typo', label: 'Misspell the method name as tostring', type: 'check', value: false, show: function (c) { return c.who === 'override'; } },
    { id: 'junit', label: 'Run with JUnit (off: call it directly from main)', type: 'check', value: true, show: function (c) { return c.who === 'test'; } },
    { id: 'reader', label: 'Use a for loop that finds and calls the methods that have @Run', type: 'check', value: true, show: function (c) { return c.who === 'run'; } },
  ],
  // q is the question shown on the question-style screen; t and d are the name and description used in the text-only body
  presets: [
    { t: 'Default settings', q: 'What does an annotation look like, and who does what when you add @Service?', d: 'Spring reads @Service, creates an object of OrderService, and registers it as a bean. That is why you can get it with getBean.', v: { who: 'service', put: true, spring: true } },
    { t: 'Remove @Service', q: 'What if you remove @Service above OrderService?', d: 'Spring does not make OrderService a bean, so getBean stops with a NoSuchBeanDefinitionException.', v: { who: 'service', put: false, spring: true } },
    { t: 'Create it with new, without Spring', q: 'What if you keep @Service, do not start Spring, and create the object with new OrderService()?', d: 'There is no Spring to read it, so @Service does nothing.', v: { who: 'service', put: true, spring: false } },
    { t: 'Add @Override and misspell the name', q: 'What if you add @Override and misspell toString() as tostring()?', d: 'The compiler, which reads @Override, reports an error that this does not override anything and stops compiling.', v: { who: 'override', put: true, typo: true } },
    { t: 'Add @Test and run with JUnit', q: 'What happens when you run total(), which has @Test, with JUnit?', d: 'JUnit reads @Test, finds total() as a test, and calls it.', v: { who: 'test', put: true, junit: true } },
    { t: '@Retention: how far the tag is kept', q: 'How are @Service and @Override declared, and does the tag remain after compiling?', d: '@Service has @Retention(RUNTIME), so it stays in the class file, and @Override has @Retention(SOURCE), so it is discarded once compiling ends.', v: { who: 'decl' } },
    { t: 'Our own @Run', q: 'What if you make an annotation yourself and also write the code that reads it?', d: '@Run, made with @interface, has no predefined meaning, so we have to write the code that reads it and acts on it.', v: { who: 'run', put: true, reader: true } },
  ],
  code: function (c) {
    var o;
    if (c.who === 'service') {
      o = ['// File: app/OrderService.java', 'package app;', ''];
      if (c.put) o.push('import org.springframework.stereotype.Service;', '', '// OrderService is an example class we made; @Service is an annotation provided by Spring', '@Service');
      else o.push('// OrderService is an example class we made');
      o.push('public class OrderService {', '    public String name() {', '        return "Order service";', '    }', '}', '', '// File: app/Main.java', 'package app;', '');
      if (c.spring) o.push('import org.springframework.context.ApplicationContext;', 'import org.springframework.context.annotation.AnnotationConfigApplicationContext;', '');
      o.push('public class Main {', '    public static void main(String[] args) {');
      if (c.spring) o.push('        // Start Spring. It scans the classes in the app package (component scanning)', '        ApplicationContext context =', '                new AnnotationConfigApplicationContext("app");', '        // Ask for the OrderService object that Spring made', '        OrderService service = context.getBean(OrderService.class);');
      else o.push('        // Do not start Spring; our own code creates it directly with new', '        OrderService service = new OrderService();');
      o.push('        System.out.println(service.name());', '    }', '}');
    } else if (c.who === 'override') {
      o = ['// Order is an example class we made.', '// Every Java class inherits Object, which Java provides, and Object has toString()', 'class Order {'];
      if (c.put) o.push('    @Override');
      o.push('    public String ' + (c.typo ? 'tostring' : 'toString') + '() {', '        return "Order 1";', '    }', '}', '', 'public class Main {', '    public static void main(String[] args) {', '        // println prints the text that the object\'s toString() returns', '        System.out.println(new Order());', '    }', '}');
    } else if (c.who === 'test') {
      o = ['import org.junit.jupiter.api.Test;', '', 'import static org.junit.jupiter.api.Assertions.assertEquals;', '', '// OrderTest is an example test class we made; @Test and assertEquals are provided by JUnit', 'class OrderTest {'];
      if (c.put) o.push('    @Test');
      o.push('    void total() {', '        System.out.println("total ran");', '        assertEquals(3000, 1000 + 2000);', '    }', '}');
      if (c.junit) o.push('', '// JUnit runs it (the ./gradlew test command or the IDE\'s run-tests button)');
      else o.push('', '// Run with java Main, without JUnit', 'public class Main {', '    public static void main(String[] args) {', '        new OrderTest().total();', '    }', '}');
    } else if (c.who === 'decl') {
      o = ['// File: app/OrderService.java', 'package app;', '', 'import org.springframework.stereotype.Service;', '',
        '// Declaration of @Service, provided by Spring (Service.java in spring-context; the element value is omitted)',
        '//     @Target(ElementType.TYPE)', '//     @Retention(RetentionPolicy.RUNTIME)', '//     @Documented', '//     @Component', '//     public @interface Service { … }',
        '@Service', 'public class OrderService {',
        '    // Declaration of @Override, provided by Java (java.lang.Override)', '    //     @Target(ElementType.METHOD)', '    //     @Retention(RetentionPolicy.SOURCE)', '    //     public @interface Override { }',
        '    @Override', '    public String toString() {', '        return "Order service";', '    }', '}', '',
        '// After compiling, look at the class file with the JDK\'s javap', '//     javap -v app/OrderService.class'];
    } else {
      o = ['import java.lang.annotation.ElementType;', 'import java.lang.annotation.Retention;', 'import java.lang.annotation.RetentionPolicy;', 'import java.lang.annotation.Target;'];
      if (c.reader) o.push('import java.lang.reflect.Method;');
      o.push('', '// Run is an annotation we made ourselves. It is declared the same way as @Service and @Test', '@Target(ElementType.METHOD)', '@Retention(RetentionPolicy.RUNTIME)', '@interface Run {', '}', '', '// Job is an example class we made', 'class Job {');
      if (c.put) o.push('    @Run');
      o.push('    public void work() {', '        System.out.println("work ran");', '    }', '', '    public void rest() {', '        System.out.println("rest ran");', '    }', '}', '', 'public class Main {', '    public static void main(String[] args) throws Exception {', '        Job job = new Job();');
      if (c.reader) o.push('        // The reader: call only the methods of Job that have @Run (reflection)', '        for (Method m : Job.class.getDeclaredMethods()) {', '            if (m.isAnnotationPresent(Run.class)) {', '                m.invoke(job);', '            }', '        }');
      o.push('    }', '}');
    }
    return o.join('\n');
  },
  label: function (c) {
    var on = c.put ? 'added' : 'removed';
    if (c.who === 'service') return '@Service ' + on + ' · ' + (c.spring ? 'Spring started, getBean' : 'new, without Spring');
    if (c.who === 'override') return '@Override ' + on + ' · ' + (c.typo ? 'name tostring' : 'name toString');
    if (c.who === 'test') return '@Test ' + on + ' · ' + (c.junit ? 'run with JUnit' : 'called directly from main');
    if (c.who === 'decl') return 'Declarations of @Service and @Override';
    return 'Our own @Run ' + on + ' · ' + (c.reader ? 'reading for loop present' : 'no reading code');
  },
  columns: ['Reader', 'Result', 'What the annotation caused'],
  simulate: function (c) {
    var ev = [], sum = [], row, w = c.who, put = !!c.put;
    var NAMES = { service: '@Service', override: '@Override', test: '@Test', decl: '@Service and @Override', run: '@Run' };
    var READER = { service: 'Spring (component scanning)', override: 'Compiler (javac)', test: 'JUnit', decl: 'Compiler (javac)', run: 'The for loop we wrote' };
    var hasReader = w === 'service' ? !!c.spring : w === 'test' ? !!c.junit : w === 'run' ? !!c.reader : true;
    var st = { hot: '', compile: '', read: '', out: [], exc: '', bean: '', file: '' };
    function push(s, k) { ev.push({ s: s, k: k, snap: JSON.parse(JSON.stringify(st)) }); }

    if (w === 'service') {
      st.hot = 'code';
      push(put ? 'OrderService is a class made as an example for this lab, and the @Service above it is an annotation provided by Spring. An annotation is a tag that starts with @ and that you put above a class or a method. Writing @Service does not by itself create an object or run a method.'
        : 'OrderService is a class made as an example for this lab. This time there is no @Service above the class. That line is the only thing that changed in the code, and the name method is the same.', '');
      st.hot = ''; st.compile = 'ok';
      push(put ? 'javac compiles the two files. The compiler only checks that @Service is an annotation that can be put on a class, and records it in the class file. Spring declared @Service with @Retention(RetentionPolicy.RUNTIME), so it stays as a tag that can be read while the program runs.'
        : 'javac compiles the two files. Without @Service, OrderService is still an ordinary Java class, so compiling succeeds without a problem.', '');
      if (c.spring) {
        st.hot = 'reader';
        push('new AnnotationConfigApplicationContext("app") in main starts Spring. Spring scans the classes in the app package and reads their tags. This is called component scanning. What Spring looks for is @Component, and annotations such as @Service whose declaration has @Component on it.', '');
        if (put) {
          st.read = 'yes'; st.bean = 'orderService'; st.hot = 'code';
          push('OrderService has @Service. Spring creates one OrderService object and registers it as a bean (an object that Spring creates and manages). The bean\'s name is orderService, the class name with the first letter changed to lowercase. What created the object is Spring, not a new in our code.', 'good');
          st.hot = 'result'; st.out.push('Order service');
          push('context.getBean(OrderService.class) asks Spring for the OrderService bean. Spring returns the object it made, and "Order service", which service.name() returned, is printed.', 'good');
        } else {
          st.read = 'no'; st.hot = 'code';
          push('OrderService has no tag. Spring has no reason to make this class a bean, so it creates no object and moves on. There is no OrderService among the registered beans.', 'bad');
          st.hot = 'result'; st.exc = 'NoSuchBeanDefinitionException';
          push('context.getBean(OrderService.class) asks for the OrderService bean, but none is registered. Spring throws a NoSuchBeanDefinitionException, which means there is no such bean, and the message is No qualifying bean of type \'app.OrderService\' available. No code handles this exception, so the program stops at this line and nothing is printed.', 'bad');
        }
      } else {
        st.read = 'none'; st.hot = 'reader';
        push('main does not start Spring, and our own code creates the object directly with new OrderService(). This program has nothing that reads tags. ' + (put ? 'OrderService has @Service, but no Spring is running to read it, so @Service does nothing.' : 'There is no @Service either, so this is an ordinary Java program.'), '');
        st.hot = 'result'; st.out.push('Order service');
        push('"Order service", which service.name() returned, is printed. This object is not a bean managed by Spring; it is an ordinary object that our code created with new.', 'good');
      }
      if (put && c.spring) {
        row = [READER.service, 'Prints "Order service"', 'The OrderService object was registered as a bean'];
        sum.push('An annotation is a tag you put on code, and what it means is decided by whatever reads it. What read @Service was Spring\'s component scanning. Spring created an OrderService object and registered it as a bean, so getBean could get that object.');
        sum.push('@Repository and @Controller also have @Component on their declarations, so they become beans the same way. The following questions show that @Override is read by the compiler and @Test by JUnit.');
      } else if (c.spring) {
        row = [READER.service, 'Stopped by NoSuchBeanDefinitionException', 'None'];
        sum.push('When you removed @Service, Spring did not make OrderService a bean, and getBean stopped with a NoSuchBeanDefinitionException. Only one line of tag changed in the code, but for Spring, which reads it, that line decides whether to make a bean.');
        sum.push('Spring does not make a class without a tag a bean through component scanning. This is true even if it is in the same package.');
      } else if (put) {
        row = ['None (Spring was not started)', 'Prints "Order service"', 'None'];
        sum.push('When you create the object with new without starting Spring, nothing happened even though @Service was on the class. This is because nothing was there to read the tag.');
        sum.push('@Service has meaning only when Spring reads it. The tag itself contains no code that runs.');
      } else {
        row = ['None (Spring was not started)', 'Prints "Order service"', 'None'];
        sum.push('This is an ordinary Java program with neither @Service nor Spring. name() was called on the object made with new, and "Order service" was printed.');
        sum.push('The output is the same as when @Service was added and the object was created with new. With no reader, the result is the same whether or not the tag is there.');
      }
    } else if (w === 'override') {
      st.hot = 'code';
      push('Order is a class made as an example for this lab. Every Java class inherits the Object class that Java provides, and Object has a toString() method that returns an object as text. Order ' + (c.typo ? 'tried to rewrite this method but misspelled the name as tostring() (a lowercase s instead of a capital S).' : 'rewrote (overrode) this method so that it returns "Order 1".') + (put ? ' Above it we added @Override, which Java provides.' : ' We did not add @Override.'), '');
      st.hot = 'reader';
      if (put && c.typo) {
        st.read = 'yes'; st.compile = 'err'; st.exc = 'compile-time error';
        push('While compiling, javac reads @Override and checks whether the parent has tostring(). What Object has is toString(), and there is no tostring(). The compiler reports the error "method does not override or implement a method from a supertype" and stops compiling.', 'bad');
        st.hot = 'result';
        push('Compiling failed, so no class file was created and the program cannot run. The mistake of misspelling the name showed up before you even ran it.', 'bad');
      } else {
        st.compile = 'ok'; st.read = put ? 'yes' : 'no';
        push(put ? 'While compiling, javac reads @Override. @Override is a tag that says "this method rewrites a method of the parent", and the compiler checks whether Object has a toString() with the same name and parameters. It does, so the check passes and compiling succeeds. @Override is declared with @Retention(RetentionPolicy.SOURCE), so it is not kept in the class file after the check ends.'
          : c.typo ? 'javac compiles it. Without @Override, the compiler does not check whether this is an override, and it treats tostring() as a separate method newly added to Order and moves on. It compiles successfully with no error.'
          : 'javac compiles it. Without @Override, the compiler does not separately check that this is a correct override. The name and parameters are written correctly, so toString() is overridden as is, and compiling succeeds.', put ? 'good' : '');
        st.hot = 'result'; st.out.push(c.typo ? 'Order@…' : 'Order 1');
        push('You run it with java Main. System.out.println(new Order()) prints the text that the toString() of the Order object returns. ' + (c.typo ? 'Order does not rewrite toString(), so Object\'s toString() is called, and it prints text made of Order@ followed by a hexadecimal hash value (for example Order@1b6d3586; the number can differ on each run). Even though there is a mistake, a wrong result came out with no error at all.' : 'The toString() that Order rewrote is called, and "Order 1" is printed.'), c.typo ? 'bad' : 'good');
      }
      if (put && c.typo) {
        row = [READER.override, 'Compile-time error (not an override)', 'The compiler found the mistake and stopped compiling'];
        sum.push('What reads @Override is the compiler. When the name was misspelled, the compiler told you right away through an error that this is not an override.');
        sum.push('If you remove @Override and make the same mistake, it compiles with no error and Object\'s toString() runs. What this tag says to the compiler is "check that this is a correct override".');
      } else if (put) {
        row = [READER.override, 'Prints "Order 1"', 'The compiler checked that it is an override (it is)'];
        sum.push('What read @Override was the compiler, and it passed the code after checking that this is an override. The result of running is the same as without @Override.');
        sum.push('@Override does nothing when the program runs and is used only to catch mistakes at compile time. That is why it is declared so that it is not kept in the class file either.');
      } else if (c.typo) {
        row = [READER.override, 'Prints "Order@…" (Object\'s toString)', 'None (the compiler did not check)'];
        sum.push('Without @Override the compiler did not check, and the misspelled tostring() became a new method. The output was the Order@… that Object\'s toString() made.');
        sum.push('No error appears, so the mistake is hard to notice. If you add @Override, the same mistake shows up as a compile-time error.');
      } else {
        row = [READER.override, 'Prints "Order 1"', 'None (the compiler did not check)'];
        sum.push('Even without @Override, a method overrides if its name and parameters match. The compiler passed it without a check, and "Order 1" was printed.');
        sum.push('The result is the same if you add @Override. The difference shows when you misspell the name.');
      }
    } else if (w === 'test') {
      st.hot = 'code';
      push('OrderTest is a test class made as an example for this lab. The total() method prints "total ran" and uses assertEquals, which JUnit provides, to check that 1000 + 2000 is 3000. ' + (put ? 'The @Test above total() is an annotation provided by JUnit.' : 'This time there is no @Test above total().'), '');
      st.hot = ''; st.compile = 'ok';
      push('javac compiles it, and compiling succeeds.' + (put ? ' JUnit declared @Test with @Retention(RetentionPolicy.RUNTIME), so it stays in the class file and JUnit can read it while the program runs.' : ''), '');
      if (c.junit) {
        st.hot = 'reader';
        push('JUnit receives the OrderTest class and runs it. This is what the ./gradlew test command or the IDE\'s run-tests button does. JUnit goes through the methods of the class and counts the ones that have @Test as tests. ' + (put ? 'total() has @Test, so it finds 1 test.' : 'No method has @Test, so the number of tests it finds is 0.'), '');
        st.hot = 'result';
        if (put) {
          st.read = 'yes'; st.out.push('total ran');
          push('JUnit creates an OrderTest object and calls total(). "total ran" is printed, and the two values in assertEquals are equal, so JUnit counts this test as passed. What called total() is JUnit, not our code.', 'good');
        } else {
          st.read = 'no';
          push('JUnit does not call total(). "total ran" is not printed either, and it ends with neither a pass nor a failure. The method is still there, but it has no tag, so JUnit did not treat it as a test.', 'bad');
        }
      } else {
        st.read = 'none'; st.hot = 'reader';
        push('You run it with java Main, without JUnit. main calls total() directly with new OrderTest().total(). ' + (put ? 'total() has @Test, but this program has nothing that reads @Test, so it does nothing.' : 'This is an ordinary method call, with neither @Test nor JUnit.'), '');
        st.hot = 'result'; st.out.push('total ran');
        push('"total ran" is printed, and the two values in assertEquals are equal, so it ends without an exception. Nothing counts passes or failures, so it was not run as a test; it was an ordinary method call.', 'good');
      }
      if (put && c.junit) {
        row = ['JUnit', '1 test run, passed', 'JUnit found total() as a test and called it'];
        sum.push('What read @Test was JUnit. JUnit found total(), which has @Test, called it, and counted it as passed.');
        sum.push('What calls a test method is JUnit, not our code. How a pass and a failure are told apart is covered in the lab "Test code".');
      } else if (c.junit) {
        row = ['JUnit', '0 tests found, nothing ran', 'None'];
        sum.push('When you removed @Test, the number of tests JUnit found became 0, and total() was never called.');
        sum.push('JUnit picks tests by the @Test tag, not by the method name.');
      } else if (put) {
        row = ['None (called directly from main)', 'Prints "total ran"', 'None'];
        sum.push('If you call it directly from main, it is an ordinary method call even though @Test is on it. There is no JUnit to read @Test, so the tag did nothing.');
        sum.push('Even with the same tag, it has no meaning if nothing reads it. It is the same as @Service on an object created with new.');
      } else {
        row = ['None (called directly from main)', 'Prints "total ran"', 'None'];
        sum.push('With neither @Test nor JUnit, total() was called directly from main. The output is the same as with @Test added.');
        sum.push('With no reader, the result is the same whether or not the tag is there.');
      }
    } else if (w === 'decl') {
      st.hot = 'code';
      push('OrderService (a class made as an example) has @Service, which Spring provides, and its toString() has @Override, which Java provides. What is copied into the comments is the real declaration of each of the two annotations. An annotation is declared with @interface, and the @Target and @Retention above the declaration decide the properties of that annotation.', '');
      st.hot = 'decl';
      push('@Target is where it can be put. @Service is ElementType.TYPE (a type declaration such as a class), and @Override is ElementType.METHOD (a method). If you put it somewhere that does not match, for example @Service above a method, the compiler reports an error.', '');
      push('@Retention is how far to keep the tag. @Override is RetentionPolicy.SOURCE, so the compiler reads it, checks, and then discards it. @Service is RetentionPolicy.RUNTIME, so it is recorded in the class file and can be read while the program runs. The annotations made for Spring and JUnit, which read tags while the program runs, are declared with RUNTIME, and @Test is too. If you do not write @Retention, it is CLASS, which stays in the class file but cannot be read while the program runs.', '');
      st.compile = 'ok'; st.file = 'done'; st.hot = 'file';
      push('After compiling with javac, you look at OrderService.class with the JDK\'s javap -v. The list of annotations that can be read at run time (RuntimeVisibleAnnotations) lists org.springframework.stereotype.Service, and Override is nowhere in the class file. This is the result of the compiler looking at the @Retention of each declaration and deciding what to keep and what to discard.', 'good');
      st.hot = 'decl';
      push('The declaration of @Service also has @Component on it. An annotation put on the declaration of an annotation like this is called a meta-annotation. Spring\'s component scanning finds not only @Component but also @Service, @Repository, and @Controller, whose declarations have @Component on them, so every class that has one of these becomes a bean.', '');
      row = ['Compiler (javac) looks at @Retention', 'Only @Service remains in the class file (javap)', '@Override is SOURCE, so it is discarded'];
      sum.push('The @Retention on the declaration of an annotation decides how far the tag is kept. @Override, which only the compiler reads, is SOURCE and did not stay in the class file, and @Service, which Spring reads while the program runs, is RUNTIME and stayed in the class file.');
      sum.push('The reason a class with @Service becomes a bean is the @Component on the declaration of @Service. The annotation does not act by itself; Spring follows the tags down to this declaration, reads it, and acts.');
    } else {
      st.hot = 'code';
      push('Run is an annotation that we made ourselves with @interface, and Job is also a class made as an example. It is declared the same way as @Service and @Test. @Target(ElementType.METHOD) makes it attachable to methods, and since we will read it while the program runs, we wrote @Retention(RetentionPolicy.RUNTIME). ' + (put ? 'We put @Run above work().' : 'This time we did not put @Run on any method.'), '');
      st.hot = ''; st.compile = 'ok';
      push('Compiling succeeds. An annotation we made ourselves has no predefined meaning. Neither Spring nor JUnit knows @Run, so we have to write the code that reads it and acts on it.', '');
      st.hot = 'reader';
      if (c.reader) {
        st.read = put ? 'yes' : 'no';
        push('The for loop in main takes the methods of Job one by one with reflection (a Java feature that examines classes and methods while the program runs), and asks with m.isAnnotationPresent(Run.class) whether @Run is on each. ' + (put ? 'It is true for work() and false for rest().' : 'It is false for both methods.'), '');
        st.hot = 'result';
        if (put) {
          st.out.push('work ran');
          push('Only work(), which is true, is called with m.invoke(job). "work ran" is printed. Spring and JUnit also have code like this that reads tags and acts, written in advance, and we only attach the tags.', 'good');
        } else {
          push('There is no method to call, so nothing is printed and main ends.', '');
        }
      } else {
        st.read = 'none';
        push('main has only the line that creates a Job object and no code that reads @Run. ' + (put ? 'Even though work() has @Run, nothing is called and nothing is printed.' : 'There is neither @Run nor reading code, so this is ordinary code, and nothing is printed.'), '');
      }
      if (put && c.reader) {
        row = [READER.run, 'Prints "work ran"', 'The for loop found work() and called it'];
        sum.push('You can also make an annotation yourself with @interface. But you also have to write the reader that decides its meaning, and here a for loop that uses reflection did that.');
        sum.push('In practice, attaching annotations that Java, Spring, and JUnit provide is far more common than making your own. An annotation you make yourself is sometimes used together with a feature such as Spring AOP that picks the methods that have the tag.');
      } else if (c.reader) {
        row = [READER.run, 'Nothing is printed', 'None'];
        sum.push('No method had @Run, so the for loop called nothing.');
        sum.push('Even with a reader, there is nothing to do if there is no tag.');
      } else if (put) {
        row = ['None', 'Nothing is printed', 'None'];
        sum.push('We put @Run on a method, but there was no reading code, so nothing happened.');
        sum.push('An annotation you make yourself has no meaning if nothing reads it. It is the same as @Service on an OrderService created with new without Spring.');
      } else {
        row = ['None', 'Nothing is printed', 'None'];
        sum.push('With neither @Run nor reading code, nothing ran.');
        sum.push('All that happened was creating a Job object. No line calls a method, so there is no output.');
      }
    }
    return { events: ev, summary: sum, row: row, hasReader: hasReader, name: NAMES[w], readerName: READER[w] };
  },
  render: function (v, sim, t, H, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : null, c = sim.c, w = c.who;
    if (!s) { H.text(v, 'Click Run to start by reading the code.'); return; }
    if (w === 'decl') {
      H.table(v, ['Annotation', 'Provided by', '@Target', '@Retention', 'In the class file'], [
        { cls: '', cells: ['@Service', 'Spring', 'TYPE', 'RUNTIME', { v: s.file ? 'Kept' : '', cls: s.file ? 'good' : '' }] },
        { cls: '', cells: ['@Override', 'Java', 'METHOD', 'SOURCE', { v: s.file ? 'Absent' : '', cls: s.file ? 'bad' : '' }] },
      ], 'Declarations of the two annotations');
      return;
    }
    var readTxt = { yes: 'Reads and acts', no: 'No tag, nothing to do', none: 'No reader', '': '' };
    H.table(v, ['Annotation', 'On the code', 'Reader', 'In this run'], [{ cls: '', cells: [sim.name, c.put ? 'Present' : 'None', sim.hasReader ? sim.readerName : 'None', { v: readTxt[s.read], cls: s.read === 'yes' ? 'good' : s.read ? 'bad' : '' }] }], 'Tag and reader');
    var rows = s.out.map(function (o) { return { cls: '', cells: [o] }; });
    if (s.exc) rows.push({ cls: 'bad', cells: [s.exc === 'compile-time error' ? 'Compile-time error: method does not override or implement a method from a supertype' : 'Stopped by ' + s.exc] });
    H.table(v, ['Output'], rows.length ? rows : [{ cls: 'gone', cells: ['(nothing printed yet)'] }], 'Output');
  },
  // Diagram: on the upper left, our code with the tag on it; on the upper right, the reader of that tag (a dashed box if there is none); an arrow "reads" from the reader to the code; below, the result of running. For the question about declarations, the two declarations and what remains in the class file are placed side by side.
  draw: function (P, sim, shown) {
    var c = sim.c, w = c.who, last = shown[shown.length - 1], s = last ? last.snap : null, hot = s ? s.hot : '';
    P.size(680, 250);
    if (w === 'decl') {
      P.box('ds', 14, 16, 318, 96, { cls: hot === 'decl' ? 'hot now' : 'plain', title: 'Declaration of @Service (Spring)', sub: ['@Target(TYPE)', '@Retention(RUNTIME)', 'Has @Component on it'] });
      P.box('do', 348, 16, 318, 96, { cls: hot === 'decl' ? 'hot now' : 'plain', title: 'Declaration of @Override (Java)', sub: ['@Target(METHOD)', '@Retention(SOURCE)'] });
      P.box('cf', 14, 140, 652, 90, { cls: s && s.file ? 'good' : hot === 'code' ? 'hot now' : 'ghost', title: 'OrderService.class (seen with javap -v)', sub: s && s.file ? ['RuntimeVisibleAnnotations: Service', 'Override: absent (discarded when compiling ends)'] : ['Not compiled yet'] });
      return;
    }
    var tag = { service: '@Service', override: '@Override', test: '@Test', run: '@Run' }[w];
    var on = { service: 'class OrderService', override: (c.typo ? 'tostring()' : 'toString()') + ' of Order', test: 'total() of OrderTest', run: 'work() of Job' }[w];
    P.box('code', 14, 16, 300, 96, { cls: hot === 'code' ? 'hot now' : 'plain', title: 'Our code', sub: [c.put ? tag + ' present' : tag + ' absent', on] });
    var rs = s ? s.read : '';
    if (sim.hasReader) {
      var rsub = rs === 'yes' ? 'Reads the tag and acts' : rs === 'no' ? 'No tag, nothing to do' : w === 'override' ? 'Reads it at compile time' : 'Reads it at run time';
      P.box('reader', 366, 16, 300, 96, { cls: hot === 'reader' ? 'hot now' : rs === 'yes' ? 'good' : 'plain', title: 'Reader: ' + sim.readerName, sub: [rsub, w === 'service' ? 'Provided by Spring' : w === 'override' ? 'Provided by the JDK' : w === 'test' ? 'Provided by JUnit' : 'Code we wrote ourselves'] });
      if (rs === 'yes' || rs === 'no') P.arrow('rd', 'reader:l', 'code:r', { cls: rs === 'yes' ? 'good' : 'dash', label: 'reads' });
    } else {
      P.box('reader', 366, 16, 300, 96, { cls: 'ghost', title: 'Reader: none', sub: [w === 'service' ? 'Spring was not started' : w === 'test' ? 'Called from main, without JUnit' : 'No code reads @Run', 'The tag does nothing'] });
    }
    var res = !s || !s.compile ? 'Not run yet' : s.exc ? (s.exc === 'compile-time error' ? 'Stopped by a compile-time error' : 'Stopped by ' + s.exc) : s.out.length ? 'Output: ' + s.out.join(', ') : 'No output';
    var extra = s && s.bean ? 'Bean registered by Spring: ' + s.bean : ' ';
    P.box('result', 14, 150, 652, 80, { cls: s && s.exc ? 'bad' : s && s.out.length ? 'good' : hot === 'result' ? 'hot now' : 'ghost', title: 'Result of running', sub: [res, extra] });
  },
  assume: 'The compiler and runtime are JDK 21.0.12.1, Spring Framework 7.0.9 (started with AnnotationConfigApplicationContext, without Spring Boot), and JUnit Jupiter 6.0.3 (run with JUnit Platform Launcher 6.0.3). For the seventeen combinations used in the questions (four for each of @Service, @Override, @Test, and our own @Run, plus one question that looks at the declarations), the code shown on the screen was taken as is from the code function of this lab and compiled with javax.tools. Those that compiled were run in a new Java process (the combinations that run @Test with JUnit were run with the Launcher), and the standard output, the exceptions, and the number of tests JUnit found and the number that passed were captured and checked against the result table. Component scanning is a real scan, and OrderService was not registered by hand. I also checked by running that the message of the NoSuchBeanDefinitionException, the compile-time error message for @Override, the bean name orderService, getBean still succeeding when @Repository, @Controller, or @Component is put in place of @Service, the compile-time error when @Service is put above a method, only Service remaining in RuntimeVisibleAnnotations in OrderService.class seen with javap -v while Override is absent, and Override not remaining in Order.class with @Override either. The declarations of @Service and @Override copied into the comments, and the declaration of @Test in a step sentence (@Retention(RUNTIME)), were checked against the meta-annotations and element names read with reflection while running, and the explanatory comments were not included. The hexadecimal number after Order@ that Object\'s toString() returns can differ on each run, so only its form was checked. The sentence that without @Retention it is CLASS and cannot be read while the program runs was not run again this time, and it relies on Section 9.6.4.2 of the Java Language Specification (Java SE 21) and on this lab\'s earlier run record (when a custom annotation has no @Retention, isAnnotationPresent is false). For the documentation, I checked Section 9.6 (@interface declarations), Section 9.6.4.1 (@Target), Section 9.6.4.2 (@Retention), and Section 9.6.4.4 (@Override) of the Java Language Specification, the sections on component scanning and meta-annotations in the Spring Framework reference, and the description of @Test in the JUnit User Guide. The sentence that the ./gradlew test command or the IDE\'s run button calls JUnit was not run in this lab. How Spring reads tags internally during component scanning, and how to use an annotation you made yourself together with Spring AOP, are not covered, and the detailed behavior of annotations is covered in the in-depth lab "Annotations".',
});

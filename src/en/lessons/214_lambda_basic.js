Lab.register({
  id: 'lambda_basic', nav: 'Lambdas', cat: 'Fundamentals', mode: 'step', basic: true, deep: ['lambda'],
  title: 'What does a lambda shorten?',
  why: 'To pass one piece of work to other code, such as the work to hand to a new thread or the rule for sorting a list, before lambdas (up to Java 7) you had to write an anonymous class that implements Runnable or Comparator over several lines, with new and the method declaration, and the one line that mattered was buried among them. Lambdas, which came in Java 8, rely on the fact that if an interface has only one method to implement, the compiler can tell which method the work belongs to, so you write only the parameters and the work, joined by an arrow.',
  use: 'You use it wherever Java takes some work, such as new Thread(() -> ...), which passes the work to hand to a new thread, list.sort((a, b) -> a.compareTo(b)), which passes the rule for sorting a list, list.removeIf(n -> n < 0), which removes the elements that match a condition, and filter and map of a stream. When the work gets long over several lines, you write it separately as a named method and sometimes pass that method with a method reference (::).',
  intro: 'A lambda is a short piece of code written with an arrow (->). () -> System.out.println("Working") is a short way to write "an object that implements an interface with only one method to implement". This lab looks at it through two interfaces that Java provides. Runnable (in the java.lang package) has one method to implement, run(), and what new Thread(…) takes is this Runnable. Comparator (in the java.util package) has one method to implement, compare(a, b), and what list.sort(…) takes as the sorting rule is this Comparator. You compile and run the same code to see whether writing the lambda out as an anonymous class or a named class gives the same result, whether the code after the arrow runs on the line where the lambda is written or when it is called, and who calls that code (r.run() in my code, a new thread, or sort). Finally, you see that a lambda cannot be used when an interface you made yourself has two methods.',
  terms: ['Lambda expression', 'Functional interface', 'Runnable', 'start() and run()', 'Comparable and Comparator', 'Anonymous class'],
  controls: [
    { id: 'to', label: 'Where to pass the lambda', type: 'select', value: 'runnable', options: [['runnable', 'A Runnable variable: Runnable r = …; r.run();'], ['thread', 'A new thread: new Thread(…); th.start();'], ['sort', 'A sorting rule: names.sort(…);'], ['task', 'A Task we made (two methods, run and stop)']] },
    { id: 'form', label: 'How to write the work', type: 'select', value: 'lambda', options: [['lambda', 'Write it as a lambda: () -> …'], ['anon', 'Write it out as an anonymous class: new Interface() { … }'], ['named', 'Write it out as a named class: class … implements Interface']] },
    { id: 'drop', label: 'Delete the calling line (r.run(), th.start(), t.run())', type: 'check', value: false },
  ],
  // For names.sort(…), the line that passes the lambda is also the line that calls sort, so there is no setting to delete it
  fix: function (c) { return c.to === 'sort' && c.drop ? { drop: false } : null; },
  // q is the question shown on the question-style screen; t and d are the name and description used in the text-only body
  presets: [
    { t: 'Default settings', q: 'What does a lambda look like, and when does the code after the arrow run?', d: 'It does not run on the line where the lambda is assigned to a Runnable variable; it runs when r.run() is called. The output is Ready, then Working.', v: { to: 'runnable', form: 'lambda', drop: false } },
    { t: 'Delete r.run()', q: 'What if you delete r.run()?', d: 'The line that writes the lambda only creates an object that holds the work, so "Working" is not printed.', v: { to: 'runnable', form: 'lambda', drop: true } },
    { t: 'Write it out as an anonymous class', q: 'What if you write the lambda out as an anonymous class (new Runnable() { … })?', d: 'It is the same work written at greater length. The output is the same as with the lambda.', v: { to: 'runnable', form: 'anon', drop: false } },
    { t: 'Write it out as a named class', q: 'What if you write it out as a named class (class Work implements Runnable)?', d: 'The Work class, a name chosen for this example, implements Runnable, and the object is created with new. The output is the same as with the lambda.', v: { to: 'runnable', form: 'named', drop: false } },
    { t: 'Pass it to a new thread', q: 'Who calls run when you pass it to new Thread(() -> …)?', d: 'My code has no line that calls run. When th.start() starts a new thread, that thread calls run.', v: { to: 'thread', form: 'lambda', drop: false } },
    { t: 'Pass it as a sorting rule', q: 'What if you pass it to names.sort((a, b) -> a.compareTo(b))?', d: 'The lambda implements compare of Comparator, and sort calls it each time it compares two names. The list is sorted into [Alice, Bob, Carol].', v: { to: 'sort', form: 'lambda', drop: false } },
    { t: 'An interface with two methods', q: 'What if the interface we made, Task, has two methods (run, stop)?', d: 'A lambda cannot decide which method the work belongs to, so it is a compile-time error. An anonymous class or a named class can write both methods.', v: { to: 'task', form: 'lambda', drop: false } },
  ],
  // The error the compiler reports (the real javac diagnostic code compiler.err.prob.found.req, translated)
  errLam: 'Task has two methods to implement, so it cannot be used as a lambda',
  // The comment right above the declaration line
  notes: {
    'runnable-lambda': '// Lambda: write what run should do after the arrow. It does not run on this line',
    'runnable-anon': '// Anonymous class: create a nameless class that implements Runnable and create an object of it with new right away',
    'runnable-named': '// Create a Work object with new and make r refer to it',
    'thread-lambda': '// Pass the lambda to Thread. It does not run on this line',
    'thread-anon': '// Pass an object of the anonymous class to Thread',
    'thread-named': '// Pass a Work object to Thread',
    'sort-lambda': '// Pass the lambda as the sorting rule (Comparator)',
    'sort-anon': '// Pass an object of the anonymous class as the sorting rule',
    'sort-named': '// Pass a ByName object as the sorting rule',
    'task-lambda': '// Lambda: Task has two methods to implement, run and stop',
    'task-anon': '// Anonymous class: write both run and stop',
    'task-named': '// Create a Work object with new and make t refer to it',
  },
  // The line where the lambda (or the code written out in full) starts. Also used to point at the line with the error
  declLine: function (c) {
    if (c.to === 'sort') return { lambda: 'names.sort((a, b) -> a.compareTo(b));', anon: 'names.sort(new Comparator<String>() {', named: 'names.sort(new ByName());' }[c.form];
    if (c.to === 'thread') return { lambda: 'Thread th = new Thread(() -> System.out.println("Working"));', anon: 'Thread th = new Thread(new Runnable() {', named: 'Thread th = new Thread(new Work());' }[c.form];
    var T = c.to === 'task' ? 'Task' : 'Runnable', v = c.to === 'task' ? 't' : 'r';
    return { lambda: T + ' ' + v + ' = () -> System.out.println("Working");', anon: T + ' ' + v + ' = new ' + T + '() {', named: T + ' ' + v + ' = new Work();' }[c.form];
  },
  code: function (c) {
    var sort = c.to === 'sort', task = c.to === 'task', thread = c.to === 'thread', drop = c.drop && !sort, o = [];
    var run = ['public void run()', 'System.out.println("Working");'], stop = ['public void stop()', 'System.out.println("Stopping");'], cmp = ['public int compare(String a, String b)', 'return a.compareTo(b);'];
    function add() { for (var i = 0; i < arguments.length; i++) o = o.concat(arguments[i]); }
    function m(ind, x) { return [ind + x[0] + ' {', ind + '    ' + x[1], ind + '}']; }
    var in2 = '        ', in3 = '            ';
    if (sort) add('import java.util.ArrayList;', c.form === 'lambda' ? [] : 'import java.util.Comparator;', 'import java.util.List;', '');
    if (task) add('// An interface we made ourselves (Task is a name chosen for this example): two methods with no body, run and stop', 'interface Task {', '    void run();', '    void stop();', '}', '');
    if (c.form === 'named') {
      if (sort) add('// A class that implements Comparator<String> (ByName is a name chosen for this example)', 'class ByName implements Comparator<String> {', m('    ', cmp), '}', '');
      else add('// A class that implements ' + (task ? 'Task' : 'Runnable') + ' (Work is a name chosen for this example)', 'class Work implements ' + (task ? 'Task' : 'Runnable') + ' {', m('    ', run), task ? m('    ', stop) : [], '}', '');
    }
    add('public class Main {', '    public static void main(String[] args) {');
    var note = in2 + this.notes[c.to + '-' + c.form];
    if (sort) {
      add(in2 + 'List<String> names = new ArrayList<>(List.of("Carol", "Alice", "Bob"));', in2 + 'System.out.println(names);', note);
      if (c.form === 'anon') add(in2 + 'names.sort(new Comparator<String>() {', m(in3, cmp), in2 + '});');
      else add(in2 + this.declLine(c));
      add(in2 + 'System.out.println(names);');
    } else if (thread) {
      add(note);
      if (c.form === 'anon') add(in2 + 'Thread th = new Thread(new Runnable() {', m(in3, run), in2 + '});');
      else add(in2 + this.declLine(c));
      add(in2 + 'System.out.println("Ready");', drop ? [] : in2 + 'th.start();');
    } else {
      add(note);
      if (c.form === 'anon') add(in2 + this.declLine(c), m(in3, run), task ? m(in3, stop) : [], in2 + '};');
      else add(in2 + this.declLine(c));
      add(in2 + 'System.out.println("Ready");', drop ? [] : in2 + (task ? 't' : 'r') + '.run();');
    }
    add('    }', '}');
    return o.join('\n');
  },
  label: function (c) {
    return { runnable: 'Runnable variable', thread: 'New thread', sort: 'Sorting rule', task: 'Task we made' }[c.to] + ' · ' + { lambda: 'Lambda', anon: 'Anonymous class', named: 'Named class' }[c.form]
      + (c.to === 'sort' ? '' : ' · ' + (c.drop ? { runnable: 'no r.run()', thread: 'no th.start()', task: 'no t.run()' }[c.to] : { runnable: 'r.run() called', thread: 'th.start() called', task: 't.run() called' }[c.to]));
  },
  columns: ['Compile', 'What the compiler reports', 'Output when run'],
  simulate: function (c) {
    var ev = [], sum = [], sort = c.to === 'sort', task = c.to === 'task', thread = c.to === 'thread', drop = c.drop && !sort;
    var lam = c.form === 'lambda', anon = c.form === 'anon';
    var ok = !(task && lam), first = ok ? '' : this.errLam, decl = this.declLine(c);
    var declText = !anon ? decl : sort ? 'names.sort(new Comparator<String>() { … });' : thread ? 'Thread th = new Thread(new Runnable() { … });' : decl + ' … };';
    var I = sort ? 'Comparator' : task ? 'Task' : 'Runnable', M = sort ? 'compare' : 'run', v = task ? 't' : 'r', vI = task ? 't' : 'r';
    var cls = sort ? 'ByName' : 'Work';
    var st = { hot: '', bad: false, compile: '', errs: 0, errText: '', obj: false, phase: '', ran: false, runs: 0, out: [], checks: [], who: '' };
    function push(s, k) { ev.push({ s: s, k: k, snap: JSON.parse(JSON.stringify(st)) }); }

    // 1. Check the interface
    st.hot = 'tk';
    if (sort) {
      st.checks.push(['Method to implement in Comparator<String>', { v: 'compare only', cls: '' }]);
      push('javac compiles it. The sort in names.sort(…) is a method of List, which Java provides, and in the parentheses it takes a Comparator as the sorting rule. Comparator is an interface that Java made in advance in the java.util package, and it has only one method to implement, compare(a, b) (the other methods already have a body, or are equals, which Object also has, so you do not have to implement them). compare takes two values and returns a negative number if a comes first, 0 if they are in the same position, and a positive number if a comes after.', '');
    } else if (task) {
      st.checks.push(['Methods to implement in Task', { v: 'two, run and stop', cls: '' }]);
      push('javac compiles it. As the compiler reads the source from the top, it meets the declaration of interface Task. Task is not provided by Java; it is an interface we made ourselves in this example, and it has two methods with only their names written and no body, run and stop. Whatever implements Task has to write both.', '');
    } else {
      st.checks.push(['Method to implement in Runnable', { v: 'run only', cls: '' }]);
      push('javac compiles it. This code has no interface declaration. Runnable is an interface that Java made in advance in the java.lang package, so you can use it without an import, and it has only one method with its name written and no body, run(). Whatever implements Runnable has to write only run.' + (thread ? ' The type that new Thread(…) takes in its parentheses is this Runnable.' : ''), '');
    }

    // 2. Read where the work is written
    st.hot = 'sr';
    if (lam && ok) {
      st.checks.push(['Lambda ' + (sort ? '(a, b) -> …' : '() -> …'), { v: 'Decided to be the work of ' + M, cls: 'good' }]);
      if (sort) push('The compiler reads the line ' + decl + ' The place in the parentheses of sort has the type Comparator, and names is a list of String, so the lambda is decided to implement compare of Comparator<String>. The (a, b) before the arrow are the two String values that compare takes, and a.compareTo(b) after the arrow is the value that compare will return. You do not have to write the types of a and b, because the compiler knows they are String. The compareTo that String provides returns a negative number if a comes first and a positive number if a comes after, in dictionary order (character code order).', 'good');
      else push('The compiler reads the line ' + decl + ' ' + (thread ? 'The place in the parentheses of new Thread(…) has the type Runnable, so' : 'The type of the variable on the left is Runnable, so') + ' the code after the arrow is read as the work of the method that Runnable has to implement. Runnable has only one method to implement, run, so that code is decided to be the work of run. This is why you do not have to write the method name. The () before the arrow means that run takes no values. Compiling is not running, so the code after the arrow does not run.', 'good');
    } else if (lam) {
      st.bad = true; st.errs = 1; st.errText = first;
      st.checks.push(['Lambda () -> …', { v: 'Error: cannot decide which method the work belongs to', cls: 'bad' }]);
      push('The compiler reads the line ' + decl + ' The code after the arrow is the work of a method that Task has to implement, but Task has two methods to implement, run and stop. A lambda has no place to write a method name, so it cannot decide whether this code is the work of run or of stop. So the compiler reports that Task cannot be used as a lambda (javac: incompatible types: Task is not a functional interface, multiple non-overriding abstract methods found in interface Task). A lambda can be used only with an interface that has just one method to implement (a functional interface), such as Runnable or Comparator.', 'bad');
    } else if (anon) {
      st.checks.push([(task ? 'run, stop' : M) + ' of the anonymous class', { v: 'Written', cls: 'good' }]);
      if (sort) push('The compiler reads the line ' + declText + ' new Comparator<String>() { … } is code that creates a nameless class (an anonymous class) that implements Comparator<String> right there and creates an object of it at once. The compare method is written inside the class, so it passes. What the lambda wrote as (a, b) -> a.compareTo(b) is written here as a method with the declaration public int compare(String a, String b) and a return.', 'good');
      else if (task) push('The compiler reads the line ' + declText + ' new Task() { … } is code that creates a nameless class (an anonymous class) that implements Task right there and creates an object of it at once. Both run and stop, which Task requires, are written, so it passes. Each method is written with its name, so even with two methods, it is clear which body belongs to which method.', 'good');
      else push('The compiler reads the line ' + declText + ' new Runnable() { … } is code that creates a nameless class (an anonymous class) that implements Runnable right there and creates an object of it at once' + (thread ? '. That object is passed to new Thread(…)' : '') + '. The run method that Runnable requires is written inside the class, so it passes. What the lambda wrote as just code after the arrow is written here as a method with the name run and public void.', 'good');
    } else {
      st.checks.push([(task ? 'run, stop' : M) + ' of the ' + cls + ' class', { v: 'Written', cls: 'good' }]);
      if (sort) push('The compiler reads the line class ByName implements Comparator<String>. ByName is a class name chosen for this example, and implements Comparator<String> declares that ByName will write the method that Comparator requires. The compare method is written inside ByName, so it passes. What the lambda wrote as (a, b) -> a.compareTo(b) is written here as the compare method of the ByName class.', 'good');
      else push('The compiler reads the line class Work implements ' + I + '. Work is a class name chosen for this example, and implements ' + I + ' declares that Work will write the methods that ' + I + ' requires. ' + (task ? 'Both run and stop are' : 'The run method is') + ' written inside Work, so it passes. ' + (task ? 'Each method is written with its name, so even with two methods, it is clear which body belongs to which method.' : 'What the lambda wrote as code after the arrow is written here as the body of the run method of the Work class.'), 'good');
      st.checks.push([decl, { v: 'Passes', cls: 'good' }]);
      if (sort) push('The compiler checks the line ' + decl + ' ByName implements Comparator<String>, so a ByName object can be passed where sort takes a Comparator.', 'good');
      else if (thread) push('The compiler checks the line ' + decl + ' Work implements Runnable, so a Work object can be passed where new Thread(…) takes a Runnable.', 'good');
      else push('The compiler checks the line ' + decl + ' Work implements ' + I + ', so the variable ' + vI + ', which has the type ' + I + ', can refer to a Work object.', 'good');
    }

    // 3. Compile result
    st.hot = '';
    if (ok) {
      st.compile = 'ok';
      st.checks.push(['Compile', { v: 'Succeeded', cls: 'good' }]);
      push('Compiling succeeds, and the Main class file to run is created.', 'good');
    } else {
      st.compile = 'err';
      st.checks.push(['Compile', { v: '1 error', cls: 'bad' }]);
      push('Compiling fails. The compiler reported 1 error, and it is "' + first + '". The Main class file to run was not created, so the program cannot run, and ' + (drop ? 'the result is the same even though the t.run() line was deleted.' : 'it cannot run even though the t.run() line is there.') + ' The compiler checks the line that writes the lambda whether or not t.run() is called.', 'bad');
    }

    // 4. Run
    var made = lam ? 'the object the lambda made' : anon ? 'the anonymous class object' : 'the ' + cls + ' object';
    if (ok && sort) {
      st.ran = true; st.hot = 't'; st.out.push('[Carol, Alice, Bob]');
      push('You run it with java Main. names is an ArrayList that holds "Carol", "Alice", and "Bob" in this order, and the first System.out.println(names) prints [Carol, Alice, Bob].', '');
      st.hot = 'ob'; st.obj = true; st.phase = 'call'; st.runs = 4; st.who = 'sort';
      push('The names.sort(…) line runs. ' + (lam ? 'On this line the lambda becomes an object that implements Comparator<String> and is passed to sort' : made + ' is created on this line and passed to sort') + ', and sort does the sorting. Each time sort needs to know the order of two names, it calls compare of the object it was given. On this JDK, when these three names were sorted, compare was called 4 times, and the first call was compare("Alice", "Carol"). A negative number came back, so Alice was decided to come before Carol. How many times and in what order to call it is decided by sort; compare only tells the order of two names.', 'good');
      st.hot = ''; st.phase = ''; st.out.push('[Alice, Bob, Carol]');
      st.checks.push(['Output when run', { v: st.out.join(' / '), cls: 'good' }]);
      push('The second System.out.println(names) prints [Alice, Bob, Carol]. sort did not create a new list; it changed the order of names. My code has no line that calls compare. What called compare is sort.', 'good');
    } else if (ok) {
      st.hot = 'ob'; st.ran = true; st.obj = true; st.phase = 'make';
      if (thread) push('You run it with java Main. main starts, and the line ' + declText + ' runs. ' + (lam ? 'The lambda creates an object that implements Runnable' : made + ' is created') + ', and new Thread(…) creates a Thread object that holds a reference to it. The thread has not been started yet, and ' + (lam ? 'the code after the arrow' : 'the body of run') + ' has not run either, so "Working" has not been printed.', '');
      else if (lam) push('You run it with java Main. main starts, and the line ' + decl + ' runs. This line creates "an object that runs the code after the arrow when run is called" and makes the variable r refer to that object. The code after the arrow does not run on this line, so "Working" has not been printed. What the line that writes the lambda does goes only as far as creating an object that holds the work.', '');
      else push('You run it with java Main. main starts, and the line ' + declText + ' runs. ' + (anon ? 'new ' + I + '() { … } creates an object of the anonymous class' : 'new Work() creates a Work object') + ', and the variable ' + vI + ' refers to that object. Only the object was created and the body of run did not run, so "Working" has not been printed. What one line of lambda did is written out here as ' + (anon ? 'code that creates a nameless class, writes run, and creates an object with new' : 'code that writes the named class Work and creates an object with new') + '.', '');
      st.hot = 't'; st.phase = ''; st.out.push('Ready');
      push('System.out.println("Ready") runs and prints Ready. The object has already been created, but run has not been called even once.', '');
      if (drop) {
        st.hot = '';
        st.checks.push(['Output when run', { v: 'Ready', cls: 'good' }]);
        if (thread) push('main ends. There is no th.start(), so the new thread was not started and nothing called run. Creating a Thread object does not call run, and a thread that was not started does not keep the program from ending. The output is only Ready.', 'good');
        else push('main ends. There is no line that calls ' + v + '.run(), so run was never called. ' + made + ' was created, but the code that prints "Working" never ran, and the output is only Ready.', 'good');
      } else {
        st.hot = 'ob'; st.phase = 'call'; st.runs = 1; st.out.push('Working');
        if (thread) {
          st.who = 'Thread-0';
          push('th.start() runs. This line does not call run directly; it starts a new thread. When the new thread (its name, Thread-0, is given automatically) starts, that thread calls run of ' + made + ', which the Thread object refers to. Then ' + (lam ? 'the code after the arrow' : 'the body of run') + ' System.out.println("Working") runs, and "Working" is printed. What called run is the new thread, not my code (Ready was printed by the main thread, and Working by Thread-0).', 'good');
          st.hot = ''; st.phase = '';
          st.checks.push(['Output when run', { v: st.out.join(' / '), cls: 'good' }]);
          push('main has nothing to do after th.start() and ends, but the program does not end until the started new thread finishes run. The output is Ready, then Working. The thread is started after Ready is printed, so this order does not change.', '');
        } else {
          st.who = 'main';
          push(v + '.run() runs. This is the line where my code (main) calls run directly. run of ' + made + ', which the variable ' + vI + ' refers to, is called, and at that moment ' + (lam ? 'the code after the arrow' : 'the body of the run method') + ' System.out.println("Working") runs. "Working" came after "Ready". It ran at the moment it was called, not where the code was written. There is no new thread; the main thread, which was running main, runs run as it is.', 'good');
          st.hot = ''; st.phase = '';
          st.checks.push(['Output when run', { v: st.out.join(' / '), cls: 'good' }]);
          push('main ends. The output is Ready, then Working.' + (task ? ' stop was written but there is no line that calls it, so it did not run.' : ''), '');
        }
      }
    }

    // Summary: the first line is the answer to this setting (question)
    var out = st.out.join(', ');
    if (!ok) {
      sum.push('When there are two methods to implement, as in the Task we made, a lambda cannot decide which method the work belongs to, so it is a compile-time error. A lambda can be used only with an interface that has just one method to implement, such as Runnable or Comparator.');
      sum.push('If you write the same Task as an anonymous class or a named class, it compiles, because run and stop are written separately with their names.' + (drop ? ' Even if you delete t.run(), the error is the same.' : ''));
    } else if (sort) {
      sum.push('What you passed to names.sort(…) is the work of compare of Comparator, and sort called that compare each time it compared two names (4 times with these three names). The result is [Alice, Bob, Carol].');
      sum.push(lam ? 'The lambda (a, b) -> a.compareTo(b) is a short way to write an object that implements compare(String a, String b).' : 'Writing it out as ' + (anon ? 'an anonymous class' : 'the named class ByName') + ' gives the same result as the lambda. The lambda (a, b) -> a.compareTo(b) is a shorthand for this code.');
    } else if (thread) {
      if (drop) sum.push('If you delete th.start(), no new thread is started and nothing calls run, so "Working" is not printed. The output is only Ready.');
      else sum.push('The work passed to new Thread(…) was run when the new thread (Thread-0) started by th.start() called run. My code has no line that calls run. The output is ' + out + ', in this order.');
      sum.push(lam ? 'The lambda () -> System.out.println("Working") is a short way to write the run of the Runnable that Thread takes.' : 'Passing it written out as ' + (anon ? 'an anonymous class' : 'the named class Work') + ' gives the same result as the lambda.');
    } else if (task) {
      sum.push((anon ? 'The anonymous class' : 'The named class Work') + ' writes run and stop separately with their names, so it can implement a Task that has two methods. The output is ' + out + '.');
      sum.push('If you write the same Task as a lambda, it cannot decide which method the work belongs to, so it is a compile-time error.');
    } else if (lam) {
      if (drop) sum.push('If you delete r.run(), "Working" is not printed. The line that writes the lambda only creates an object that holds the work, and the code after the arrow runs when run is called.');
      else sum.push('The lambda () -> System.out.println("Working") writes what run of Runnable should do. It does not run on the line where it is written; it ran when r.run() was called, and the output was Ready, then Working.');
      sum.push('A lambda is code that creates an object that implements Runnable, and it runs only when something else calls run of that object.');
    } else {
      sum.push('Writing it out as ' + (anon ? 'an anonymous class (new Runnable() { … })' : 'the named class Work') + ' gives the same output as the lambda, ' + out + (drop ? ' ("Working" is missing because r.run() was deleted).' : '.'));
      sum.push('The lambda () -> System.out.println("Working") is ' + (anon ? 'a shorthand in this code for new Runnable() and the method declaration public void run().' : 'a shorthand in this code for the class declaration, new, and the method declaration public void run().'));
    }
    return { events: ev, summary: sum, nerr: ok ? 0 : 1, errAt: ok ? [] : [decl], row: [ok ? 'Succeeded' : 'Error', ok ? 'None' : first, ok ? st.out.join(' / ') : 'Cannot run'] };
  },
  render: function (v, sim, t, H, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : null, c = sim.c;
    if (!s) { H.text(v, 'Click Run to start from the compiler reading the source.'); return; }
    H.table(v, ['What happened', 'Result'], s.checks.map(function (r) { return { cls: '', cells: [r[0], r[1]] }; }), 'Compile and run');
    H.counters(v, [[s.runs, c && c.to === 'sort' ? 'Times compare was called' : 'Times run ran'], [s.errs, 'Errors the compiler reported']]);
  },
  // Diagram: at the top, the interface (Runnable, Comparator, or the Task we made) and the place where the work is written (a lambda, an anonymous class, or the Work or ByName class); at the lower left, the side that receives the work (the variable r, Thread th, names.sort, or the variable t) and the side that calls that work; at the right, the object that was created. When the work is called, the object box turns yellow. At the bottom: the compile result, the output, and the number of times the work ran.
  draw: function (P, sim, shown) {
    var c = sim.c, last = shown[shown.length - 1], s = last ? last.snap : null;
    P.size(680, 372);
    var hot = s ? s.hot : '', bad = s && s.bad, sort = c.to === 'sort', task = c.to === 'task', thread = c.to === 'thread';
    var I = sort ? 'Comparator<String>' : task ? 'Task' : 'Runnable', M = sort ? 'compare' : 'run';
    P.box('tk', 14, 20, 270, 76, { cls: hot === 'tk' ? 'hot now' : 'plain', title: I, sub: ['Interface · ' + (task ? 'made by us' : 'provided by Java'), task ? 'run() · stop() names only' : sort ? 'compare(a, b) name only' : 'run() name only'] });
    P.box('sr', 396, 20, 270, 76, { cls: bad ? 'bad' : hot === 'sr' ? 'hot now' : 'plain', title: { lambda: 'Lambda', anon: 'Anonymous class', named: sort ? 'ByName (class)' : 'Work (class)' }[c.form], sub: { lambda: sort ? '(a, b) -> …' : '() -> …', anon: 'new ' + I + '() { … }', named: 'implements ' + I }[c.form] });
    P.arrow('imp', 'sr:l', 'tk:r', { cls: bad ? 'bad' : hot === 'sr' ? 'hot' : 'mut', label: 'implements' });
    var holder = { runnable: 'Runnable r', thread: 'Thread th', sort: 'names.sort(…)', task: 'Task t' }[c.to];
    var caller = { runnable: 'r.run(): my code calls', thread: 'th.start(): new thread calls', sort: 'sort calls compare', task: 't.run(): my code calls' }[c.to];
    if (c.drop && !sort) caller = { runnable: 'no r.run()', thread: 'no th.start()', task: 'no t.run()' }[c.to];
    P.box('t', 14, 150, 270, 56, { cls: hot === 't' ? 'hot now' : 'plain', title: holder, sub: s && s.who ? 'Called by: ' + (s.who === 'main' ? 'main thread' : s.who === 'sort' ? 'sort' : 'new thread Thread-0') : caller });
    var obCls = s && s.obj ? (hot === 'ob' ? 'hot now' : 'good') : 'ghost';
    var obName = { lambda: 'Object the lambda made', anon: 'Anonymous class object', named: sort ? 'ByName object' : 'Work object' }[c.form];
    P.box('ob', 396, 150, 270, 56, { cls: obCls, title: s && s.obj ? obName : 'Object', sub: s && s.obj ? (sort ? 'Work of compare: a.compareTo(b)' : 'Work of run: print Working') : s && s.compile === 'err' ? 'Not created' : 'Does not exist yet' });
    if (s && s.obj) P.arrow('ref', 't:r', 'ob:l', { cls: s.phase === 'call' ? 'hot' : 'good', label: s.phase === 'call' ? M + '()' : thread ? 'refers' : 'points' });
    var outText = s && s.ran ? (s.out.length ? s.out.join(' / ') : '(nothing printed)') : s && s.compile === 'err' ? 'Cannot run' : '';
    P.box('r1', 14, 222, 652, 52, { cls: s && s.compile === 'ok' ? 'good' : s && s.compile === 'err' ? 'bad' : 'ghost', title: 'Compile', right: s && s.compile ? (s.compile === 'ok' ? 'Succeeded' : 'Error') : '', sub: s && s.errText ? s.errText : '' });
    P.box('r2', 14, 282, 652, 36, { cls: s && s.ran ? 'good' : s && s.compile === 'err' ? 'bad' : 'ghost', title: 'Output when run', right: outText });
    P.box('r3', 14, 326, 652, 36, { cls: s && s.runs ? 'wait' : s && s.compile === 'err' ? 'bad' : 'ghost', title: sort ? 'Times compare was called' : 'Times run ran', right: s && s.compile === 'err' ? 'Cannot run' : '' + (s ? s.runs : 0) });
  },
  assume: 'The compiler and runtime are JDK 21.0.12.1 (javac 21). For all twenty-one combinations (for each of the Runnable variable, the new thread, and the Task we made, 3 ways of writing it and whether the calling line is present or not, and for the sorting rule, 3 ways of writing it), source that is the same as the code on the screen (identical text, line by line) was compiled with javax.tools, and for those that compiled, java Main was run in a separate process and the result was checked against the standard output that was captured. What was checked is whether compilation succeeded, the diagnostic code of the error (the "incompatible types: Task is not a functional interface, multiple non-overriding abstract methods found in interface Task" of compiler.err.prob.found.req is translated as "Task has two methods to implement, so it cannot be used as a lambda"), the number of errors and the line where the error occurred, whether the Main class file was created, and the output when run. The facts that the step sentences rely on were checked separately by running. Runnable is an interface in the java.lang package and Comparator is an interface in the java.util package, and apart from the methods of Object, each has only one method with no body, run and compare respectively, and both have @FunctionalInterface (Comparator also has equals, redeclared with no body). Thread has a constructor that takes a Runnable, and List has a sort that takes a Comparator. Nothing was printed right after the line that writes the lambda, the anonymous class, or Work, and in all three cases the object implemented Runnable (the lambda was a hidden class on this JDK, the anonymous class was Main$1, and Work was an object of the Work class). The name of the thread that ran the work was main for r.run() and Thread-0 for th.start(). When these three names were sorted, sort called compare 4 times, and the first call was compare("Alice", "Carol"). The number of calls and the order are not set by the specification; they were observed in the sorting implementation of this JDK. For the API documentation, I read the documentation attached to the source of the same JDK directly. Runnable is a functional interface whose functional method is run(); the task of Thread(Runnable task) is the object whose run method is called when this thread is started, and if you give no name, a name made of "Thread-" followed by an integer is given automatically; start() makes this thread begin execution, and a thread can be started only once. The virtual machine begins to exit only when all the started non-daemon threads have ended, and a thread that was not started does not prevent the exit (the Thread class documentation). List.sort sorts the list in the order set by the given Comparator, and Comparator.compare returns a negative number if the first argument is less, 0 if they are equal, and a positive number if it is greater. For the language rules, I followed the Java Language Specification (Java SE 21), Section 15.27 (lambda expressions), Section 15.27.3 (a lambda has a functional interface as its target type in an assignment or invocation context), Section 15.27.4 (evaluating a lambda creates an object, and the body runs when its method is called), Section 9.8 (a functional interface is an interface that, apart from the methods of Object, has only one abstract method), and Section 15.9.5 (anonymous classes). I read only part of the relevant sections of the specification, as a summary, and did not read the whole text. The kind of error, the number of errors, and the line where it occurs are not set by the specification; they were observed on this javac. This lab covers only "a lambda is a short way to write an object that implements an interface with only one method to implement" and when and by whom its work is run. How this of a lambda differs from that of an anonymous class, and the rules for using a local variable of the enclosing code inside a lambda, are not covered. Method references and Supplier, Predicate, and Consumer of java.util.function are covered in the in-depth lab "Lambda expressions and functional interfaces", and the difference between calling run() directly and start() is covered in "Creating threads and thread states".',
});

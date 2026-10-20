Lab.register({
  id: 'lambda_basic', nav: 'Lambdas', cat: 'Fundamentals', mode: 'step', basic: true, deep: ['lambda'],
  title: 'What is a lambda a shorter way to write?',
  why: 'To hand one task to other code, in the days before lambdas you had to write an anonymous class that implements an interface over several lines, including new and the method declaration, and the one line that really mattered was buried in between. A lambda uses the fact that, for an interface with only one method, the compiler can tell which method\'s task it is, so you write only the parameters and the task with an arrow.',
  use: 'It is used when you hand a task to other code, as in list.sort((a, b) -> a.compareTo(b)), which passes the rule for sorting a list, list.removeIf(n -> n < 0), which removes the items that match a condition, and new Thread(() -> ...), which passes the work to leave to a new thread. If the task grows long over several lines, you write it separately as a named method, and sometimes pass that method with a method reference (::).',
  intro: 'A lambda is short code written with an arrow (->). () -> System.out.println("Working") is a short way to write "an object that implements an interface with only one method." Here we use a Task interface that has just one method, run, and the code after the arrow is what run does. Written out in full, the same thing is code that creates a class that implements Task and creates an object with new. In this lab you write the lambda out as an anonymous class and as a class with a name and see that the result is the same, and you compile and run the same code to see whether the code after the arrow runs on the line where the lambda is written, what happens if you remove t.run() or call it twice, and what happens if Task has one more method.',
  terms: ['Lambda expression', 'Functional interface', 'Anonymous class', 'Interface'],
  controls: [
    { id: 'form', label: 'How to write what run does', type: 'select', value: 'lambda', options: [['lambda', 'Write it as a lambda: () -> …'], ['anon', 'Write it out as an anonymous class: new Task() { … }'], ['named', 'Write it out as a class with a name: class Work implements Task']] },
    { id: 'call', label: 'Line in main that calls t.run()', type: 'select', value: 'once', options: [['once', 'Call t.run() once'], ['none', 'Remove t.run()'], ['twice', 'Call t.run() twice']] },
    { id: 'two', label: 'Task has one more method (void stop();)', type: 'check', value: false },
  ],
  // q is the question shown on the question-style screen; t and d are the name and description used in the text-only body
  presets: [
    { t: 'Default settings', q: 'What does a lambda look like, and when does the code after the arrow run?', d: 'It does not run on the line where the lambda is written. It runs when you call t.run(). The output is Ready, then Working.', v: { form: 'lambda', call: 'once', two: false } },
    { t: 'Remove t.run()', q: 'What if you remove t.run()?', d: 'A lambda only stores what to do in a variable, so "Working" is not printed.', v: { form: 'lambda', call: 'none', two: false } },
    { t: 'Write it as an anonymous class', q: 'What if you write the lambda out as an anonymous class?', d: 'It does the same job, written in full. The output is the same as the lambda.', v: { form: 'anon', call: 'once', two: false } },
    { t: 'Write it as a class with a name', q: 'What if you write it out as a class with a name?', d: 'You create a Work class and create an object with new. The output is the same as the lambda.', v: { form: 'named', call: 'once', two: false } },
    { t: 'Task has one more method', q: 'What if Task has one more method (void stop();)?', d: 'A lambda cannot tell which method it is the work of, so there is a compile-time error.', v: { form: 'lambda', call: 'once', two: true } },
  ],
  // The kinds of errors the compiler reports (the real javac diagnostic codes, restated)
  errLam: 'Task has more than one method, so it cannot be used as a lambda',
  errStop: 'The stop method of Task was not implemented',
  code: function (c) {
    var o = ['interface Task {', '    void run();'];
    if (c.two) o.push('    void stop();');
    o.push('}', '');
    if (c.form === 'named') o.push('// A class that implements Task: it writes what run does', 'class Work implements Task {', '    public void run() {', '        System.out.println("Working");', '    }', '}', '');
    o.push('public class Main {', '    public static void main(String[] args) {');
    if (c.form === 'lambda') o.push('        // Lambda: stores what run does. It does not run on this line', '        Task t = () -> System.out.println("Working");');
    else if (c.form === 'anon') o.push('        // Anonymous class: creates a class with no name and creates an object of it right away with new', '        Task t = new Task() {', '            public void run() {', '                System.out.println("Working");', '            }', '        };');
    else o.push('        // Create an object of the Work class with new and store it', '        Task t = new Work();');
    o.push('        System.out.println("Ready");');
    if (c.call !== 'none') o.push('        t.run();');
    if (c.call === 'twice') o.push('        t.run();');
    o.push('    }', '}');
    return o.join('\n');
  },
  label: function (c) { return { lambda: 'Lambda', anon: 'Anonymous class', named: 'Class with a name' }[c.form] + ' · ' + { once: 't.run() once', none: 'No t.run()', twice: 't.run() twice' }[c.call] + ' · ' + (c.two ? 'Task has two methods' : 'Task has one method'); },
  columns: ['Compilation', 'What the compiler reports', 'Output when run'],
  simulate: function (c) {
    var ev = [], sum = [], n = { once: 1, none: 0, twice: 2 }[c.call], lam = c.form === 'lambda', anon = c.form === 'anon';
    var ok = !c.two;
    var first = ok ? '' : lam ? this.errLam : this.errStop;
    var errAt = ok ? [] : lam ? ['Task t = () -> System.out.println("Working");'] : anon ? ['Task t = new Task() {'] : ['class Work implements Task {'];
    var st = { hot: '', bad: false, compile: '', errs: 0, errText: '', obj: false, phase: '', ran: false, runs: 0, out: [], checks: [] };
    function push(s, k) { ev.push({ s: s, k: k, snap: JSON.parse(JSON.stringify(st)) }); }
    var name = { lambda: 'the lambda', anon: 'the anonymous class', named: 'the Work class' }[c.form];
    var line = { lambda: 'line Task t = () -> System.out.println("Working");', anon: 'line Task t = new Task() { … };', named: 'line Task t = new Work();' }[c.form];

    // 1. read the interface Task declaration
    st.hot = 'tk';
    st.checks.push(['Methods that Task requires', { v: c.two ? 'run and stop (two)' : 'run (one)', cls: '' }]);
    push('You compile with javac. The compiler reads the source from the top and comes to the interface Task declaration. ' + (c.two ? 'Task has two methods that are written with only a name and no body: run and stop. Whoever implements Task must write both of them.' : 'Task has just one method that is written with only a name and no body: run. Whoever implements Task has to write only run.'), '');

    // 2. read the place that writes what run does
    st.hot = 'sr';
    if (lam) {
      if (ok) {
        st.checks.push(['Lambda () -> …', { v: 'Accepted as what run does', cls: 'good' }]);
        push('The compiler reads the ' + line + ' It reads the code after the arrow as what the method that Task must implement does, and Task has just one method to implement, run, so that code is settled to be what run does. You do not need to write the name separately. Compiling is not running, so the code after the arrow does not run.', 'good');
      } else {
        st.bad = true; st.errs = 1; st.errText = first;
        st.checks.push(['Lambda () -> …', { v: 'Error: cannot tell which method it is the work of', cls: 'bad' }]);
        push('The compiler reads the ' + line + ' The code after the arrow is what the method that Task must implement does, but Task has two methods to implement, run and stop. A lambda has no method name, so it cannot be settled whether this code is the work of run or of stop. So the compiler reports that Task cannot be used as a lambda (javac: incompatible types: Task is not a functional interface). A lambda can be used only with an interface that has just one method to implement.', 'bad');
      }
    } else if (anon) {
      if (ok) {
        st.checks.push(['run of the anonymous class', { v: 'Written', cls: 'good' }]);
        push('The compiler reads the ' + line + ' new Task() { … } is code that creates a class with no name (an anonymous class) that implements Task right there and creates an object of it at once. The class contains the run method that Task requires, so it passes. What the lambda wrote as code only after the arrow is written here as a method that has the name run and public void.', 'good');
      } else {
        st.bad = true; st.errs = 1; st.errText = first;
        st.checks.push(['stop of the anonymous class', { v: 'Missing: error', cls: 'bad' }]);
        push('The compiler reads the ' + line + ' new Task() { … } is code that creates an anonymous class that implements Task, and this class must write all the methods of Task. run is written, but the stop method is missing, so it is an error (javac: <anonymous Main$1> is not abstract and does not override abstract method stop() in Task). You write each method with its name, so you can use it even when there are two methods, but you must write both.', 'bad');
      }
    } else {
      if (ok) {
        st.checks.push(['run of the Work class', { v: 'Written', cls: 'good' }]);
        push('The compiler reads the line class Work implements Task. It is a declaration that Work will write the methods that Task requires. The run method is written inside Work, so it passes. The code that the lambda wrote after the arrow is here inside the body of the run method of the Work class.', 'good');
      } else {
        st.bad = true; st.errs = 1; st.errText = first;
        st.checks.push(['stop of the Work class', { v: 'Missing: error', cls: 'bad' }]);
        push('The compiler reads the line class Work implements Task. Work must write all the methods that Task requires. run is written, but the stop method is missing, so it is an error (javac: Work is not abstract and does not override abstract method stop() in Task).', 'bad');
      }
    }

    // 3. the line that uses Work (only the class with a name has this line separately)
    if (!lam && !anon) {
      st.hot = 'sr';
      if (ok) {
        st.checks.push(['Task t = new Work();', { v: 'Can be stored', cls: 'good' }]);
        push('The compiler checks the ' + line + ' Work implements Task with implements Task, so it is fine to store a Work object in the variable t of type Task.', 'good');
      } else {
        st.checks.push(['Task t = new Work();', { v: 'Not an error', cls: '' }]);
        push('The compiler checks the ' + line + ' This line itself is not an error (the only error javac reported is the 1 above). But compilation fails because of the earlier error.', '');
      }
    }

    // 4. compilation result
    st.hot = '';
    if (ok) {
      st.compile = 'ok';
      st.checks.push(['Compilation', { v: 'Success', cls: 'good' }]);
      push('Compilation succeeds and the Main class file to run is created.', 'good');
    } else {
      st.compile = 'err';
      st.checks.push(['Compilation', { v: '1 error', cls: 'bad' }]);
      push('Compilation fails. The compiler reported 1 error, "' + first + '". The Main class file to run was not created, so the program cannot run, and ' + (n === 0 ? 'the result is the same even though you removed the t.run() line.' : 'even if the t.run() line is there, it cannot run.') + ' The compiler checks the code that implements Task whether or not it calls t.run().', 'bad');
    }

    // 5-. run
    var objText = { lambda: 'the object made by the lambda', anon: 'the object of the anonymous class', named: 'the Work object' }[c.form];
    if (ok) {
      st.hot = 'ob'; st.ran = true; st.obj = true; st.phase = 'make';
      if (lam) push('You run it with java Main. main starts and the ' + line + ' runs. This line creates "an object that runs the code after the arrow when run is called" and stores it in the variable t. The code after the arrow does not run on this line, so "Working" was not printed. All the line that writes the lambda does is store what to do in t.', '');
      else if (anon) push('You run it with java Main. main starts and the ' + line + ' runs. new Task() { … } creates an object of the anonymous class that implements Task and stores it in t. It only created the object, and the body of run written inside the class did not run, so "Working" was not printed. What one line of lambda did is written out as code that creates a class, writes run, and creates an object with new.', '');
      else push('You run it with java Main. main starts and the ' + line + ' runs. new Work() creates an object of the Work class and stores it in the variable t of type Task. It only created the object, and the body of run did not run, so "Working" was not printed. What one line of lambda did is written out as code that writes the Work class, which has a name, and creates an object with new.', '');
      st.hot = 't'; st.phase = ''; st.out.push('Ready');
      push('System.out.println("Ready") runs and prints Ready. This is the only thing printed so far. The object is already stored in t, but run has not been called even once.', '');
      if (n === 0) {
        st.hot = '';
        st.checks.push(['Output when run', { v: 'Ready', cls: 'good' }]);
        push('main ends. There is no line that calls t.run(), so run was never called. ' + objText + ' was created, but the "Working" code inside it never ran, and the output is only Ready.', 'good');
      }
      for (var i = 0; i < n; i++) {
        var head = i === 0;
        st.hot = 'ob'; st.phase = 'call'; st.runs++; st.out.push('Working');
        if (head) push('t.run() runs. The run of the object stored in t is called, and ' + (lam ? 'at that moment the code after the arrow, System.out.println("Working"), runs.' : 'the body of the run method, System.out.println("Working"), runs.') + ' "Working" is printed, and the number of times run has run becomes 1. "Working" came after "Ready." The code ran at the moment it was called, not where it was written.', 'good');
        else push('t.run() runs one more time. The run of the same object is called again and prints "Working" once more, and the number of times run has run becomes 2. No new object was created, and the place where the work is written is the same.', 'good');
      }
      if (n > 0) {
        st.hot = ''; st.phase = '';
        st.checks.push(['Output when run', { v: st.out.join(' / '), cls: 'good' }]);
        push('main ends. The output, in order, is ' + st.out.join(', ') + '.', '');
      }
    }

    // Summary: the first line is the answer to this setting (question)
    if (ok) {
      if (lam && n === 1) {
        sum.push('The lambda () -> System.out.println("Working") is a short way to write an object that implements an interface with only one method (Task). On the line where the lambda is written, the code after the arrow does not run, and that line stores what to do in the variable t. The code after the arrow ran at the moment t.run() was called.');
        sum.push('That is why the output was Ready, then Working. Written out in full, it is the same as code that creates a class that implements Task and creates an object with new. You can check this with the anonymous class and class with a name settings in this lab.');
      } else if (lam && n === 0) {
        sum.push('If you remove t.run(), "Working" is not printed. The line that writes the lambda only stores what to do in t, so if you do not call it, the code after the arrow never runs.');
        sum.push('The output being only Ready is the proof. The line that writes the lambda ran without an error, but all that runs is creating the object and storing it.');
      } else if (lam) {
        sum.push('If you call t.run() twice, the code after the arrow runs each time you call it, and "Working" is printed twice.');
        sum.push('The line that writes the lambda ran once and created one object, and the run of that object was called twice. The place where the work is written is one, but it runs every time you call it.');
      } else {
        var by = anon ? 'Even if you write it out as an anonymous class,' : 'Even if you write it out as a class with a name,';
        var how = anon ? 'On the line new Task() { … }, only the object is created, and the body of run runs when you call t.run(). It is an anonymous class because it is a class with no name that you new right there.' : 'On the line new Work(), only the object is created, and the body of run runs when you call t.run(). The object that a lambda creates is also an object of a class that implements Task. What writes only the code after the arrow, without declaring a class yourself like Work, is a lambda.';
        if (n === 1) sum.push(by + ' the result is the same as the lambda. The output was Ready, then Working. One line of lambda is a short way to write code that creates a class that implements Task and creates an object with new.');
        else if (n === 0) sum.push(by + ' if you remove t.run(), the output is only Ready, the same as the lambda. The line that creates the object does not run the body of run.');
        else sum.push(by + ' if you call t.run() twice, "Working" is printed twice, the same as the lambda. The body of run runs every time you call it.');
        sum.push(how);
      }
    } else if (lam) {
      sum.push('When Task has one more method, the compiler said that Task cannot be used as a lambda, and compilation failed, so it could not run. This is because it cannot be settled whether the code after the arrow is the work of run or of stop.');
      sum.push('A lambda can be used only with an interface that has just one method to implement (a functional interface). ' + (n === 0 ? 'The error is the same even if you remove t.run(). ' : n === 2 ? 'The error is the same no matter how many times you call t.run(). ' : '') + 'If you write the same thing out as an anonymous class or a class with a name, you write the name of each method, so you can use it, but you must write both run and stop.');
    } else {
      sum.push('Task has one more method, but ' + (anon ? 'the anonymous class' : 'the Work class') + ' did not write stop, so compilation failed. When you write it out as a class, you must write all the methods of Task.');
      sum.push('A class writes each method with its name, so you can use it even when there are two methods. If you write the same thing as a lambda, it cannot be told which method it is the work of, and compilation fails. ' + (n === 0 ? 'The error is the same even if you remove t.run().' : ''));
    }
    var out = st.out.join(' / ');
    return { events: ev, summary: sum, nerr: ok ? 0 : 1, errAt: errAt, row: [ok ? 'Success' : 'Error', ok ? 'None' : first, ok ? out : 'Cannot run'] };
  },
  render: function (v, sim, t, H, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : null;
    if (!s) { H.text(v, 'Click Run to start from the compiler reading the source.'); return; }
    H.table(v, ['What happened', 'Result'], s.checks.map(function (r) { return { cls: '', cells: [r[0], r[1]] }; }), 'Compilation and run');
    H.counters(v, [[s.runs, 'Times run ran'], [s.errs, 'Errors reported by the compiler']]);
  },
  // Diagram: at the top, Task (the interface) and the place that writes what run does (lambda, anonymous class, Work class); below, the variable t and the object it refers to. The object box shows what run does after it is created, and turns yellow when t.run() is called. At the bottom, the compilation result, the output, and the number of times run ran.
  draw: function (P, sim, shown) {
    var c = sim.c, last = shown[shown.length - 1], s = last ? last.snap : null;
    P.size(680, 372);
    var hot = s ? s.hot : '', bad = s && s.bad, lam = c.form === 'lambda';
    P.box('tk', 14, 20, 230, 76, { cls: hot === 'tk' ? 'hot now' : 'plain', title: 'Task (interface)', sub: c.two ? 'run() · stop(): no bodies' : 'run(): no body' });
    P.box('sr', 436, 20, 230, 76, { cls: bad ? 'bad' : hot === 'sr' ? 'hot now' : 'plain', title: { lambda: 'Lambda', anon: 'Anonymous class', named: 'Work (class)' }[c.form], sub: { lambda: '() -> …', anon: 'new Task() { … }', named: 'implements Task' }[c.form] });
    P.arrow('imp', 'sr:l', 'tk:r', { cls: bad ? 'bad' : hot === 'sr' ? 'hot' : 'mut', label: lam ? 'implements' : 'implements' });
    P.box('t', 14, 150, 230, 56, { cls: hot === 't' ? 'hot now' : 'plain', title: 'Task t', sub: s && s.obj ? 'Refers to the object' : 'Variable of type Task' });
    var obCls = s && s.obj ? (hot === 'ob' ? 'hot now' : 'good') : 'ghost';
    var obName = { lambda: 'Object made by the lambda', anon: 'Anonymous class object', named: 'Work object' }[c.form];
    P.box('ob', 436, 150, 230, 56, { cls: obCls, title: s && s.obj ? obName : 'Object', sub: s && s.obj ? 'run does: print Working' : s && s.compile === 'err' ? 'Not created' : 'Does not exist yet' });
    if (s && s.obj) P.arrow('ref', 't:r', 'ob:l', { cls: s.phase === 'call' ? 'hot' : 'good', label: s.phase === 'call' ? 'run()' : 'refers to' });
    var outText = s && s.ran ? (s.out.length ? s.out.join(' / ') : '(nothing printed)') : s && s.compile === 'err' ? 'Cannot run' : '';
    P.box('r1', 14, 222, 652, 52, { cls: s && s.compile === 'ok' ? 'good' : s && s.compile === 'err' ? 'bad' : 'ghost', title: 'Compilation', right: s && s.compile ? (s.compile === 'ok' ? 'Success' : 'Error') : '', sub: s && s.errText ? s.errText : '' });
    P.box('r2', 14, 282, 652, 36, { cls: s && s.ran ? 'good' : s && s.compile === 'err' ? 'bad' : 'ghost', title: 'Output when run', right: outText });
    P.box('r3', 14, 326, 652, 36, { cls: s && s.runs ? 'wait' : s && s.compile === 'err' ? 'bad' : 'ghost', title: 'Times run ran', right: s && s.compile === 'err' ? 'Cannot run' : '' + (s ? s.runs : 0) });
  },
  assume: 'The compiler and runtime are JDK 21.0.12.1 (javac 21). For all eighteen combinations, the source that is the same as the code on the screen (identical text, line by line) was compiled with javax.tools, and for those that compiled, the class file was loaded with a new class loader and Main.main was run, and the results were checked against the standard output that was captured. What was checked is whether compilation succeeded, the diagnostic code of the first error (the "Task is not a functional interface, multiple non-overriding abstract methods found in interface Task" of compiler.err.prob.found.req was restated as "Task has more than one method, so it cannot be used as a lambda," and the "does not override abstract method stop() in Task" of compiler.err.does.not.override.abstract was restated as "The stop method of Task was not implemented"), the number of errors and the line where each error occurred, whether the Main class file was created, and the output when run. The facts that the step sentences rely on were checked by running separate source in the same way. Right after the line that stores the object, t is an object of a class that implements Task in all three forms, and "Working" was not printed on that line (the lambda is an object of a hidden class that is created on this JDK, and the anonymous class and the class with a name, Work, were each an object of the class with exactly that name). The documentation was checked by opening the Java Language Specification (Java SE 21) directly. That a lambda expression has a functional interface as its target type in assignment, invocation, and casting contexts is from Section 15.27.3; that evaluating a lambda expression at run time creates a reference to an object of a class that implements the target functional interface, which is different from executing the body of the lambda, and that the body of the lambda is executed when a method of that interface is invoked, is from the introduction of Section 15.27 and Section 15.27.4; that a functional interface is an interface that has just one abstract method (not counting the methods of Object), and that an object of it can also be created with a lambda expression, is from Section 9.8; and that an anonymous class is declared implicitly by a class instance creation expression and can have an interface as its direct superinterface is from Section 15.9.5. Only part of each of those sections came back as a summary, so I could not read the whole original text. The kind of error, the number of errors, and the line where it occurs are not defined by the specification; they were observed on this javac. This lab covers only "a lambda is a short way to write an object that implements an interface with only one method" and when it runs. The object that a lambda creates is not exactly the same as the object of an anonymous class. On this JDK it is created as a hidden class, and it is said to differ in other ways too, such as what this refers to, but this lab did not check that. Lambdas with parameters, lambdas that return a value, method references, built-in functional interfaces such as Runnable and Comparator, and interfaces with default methods or static methods are not covered, and they are covered in the in-depth lab "Lambda expressions and functional interfaces".',
});

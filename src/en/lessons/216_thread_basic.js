Lab.register({
  id: 'thread_basic', nav: 'Threads', cat: 'Fundamentals', mode: 'step', basic: true, deep: ['thread'],
  title: 'What is a thread, and what does start() do?',
  intro: 'A thread is one flow of execution that runs code from top to bottom. A Java program starts with one thread named main, and this thread runs the main method from the top. The part of the code that creates a thread object is new Thread(() -> work()). The () -> work() in the parentheses is code that says "call work()" and is handed to the new flow. This line only creates a Thread object and does not create a new flow. When you call t.start(), a new flow is created at that moment, and the new thread runs the code that was handed to it. t.join() makes main wait until that thread finishes, and Thread.currentThread().getName() tells you the name of the thread that is running this line right now. In this lab you replace the start() line with a call to run() or remove it, and create one more thread, and the same code is compiled and run to show the name of the thread that ran work and the last line, and the number of newly started threads. (What happens when two flows move at the same time is not covered. You only see the shape in which join makes main wait, so the order of the output is fixed.)',
  terms: ['Processes and threads', 'Main thread and thread names', 'start() and run()', 'join()'],
  controls: [
    { id: 'how', label: 'The line that starts the thread', type: 'select', value: 'start', options: [['start', 'Call t.start()'], ['run', 'Call t.run()'], ['none', 'Call neither']] },
    { id: 'two', label: 'Create one more thread (t2)', type: 'check', value: false },
  ],
  // q is the question shown on the question-style screen. t and d are the name and the description used in the text-only reading
  presets: [
    { t: 'Default settings', q: 'How do you create a thread, and who runs work when you call start()?', d: 'When start() is called, a new thread Thread-0 is created and runs work, and main runs the last line.', v: { how: 'start', two: false } },
    { t: 'Calling run() instead of start()', q: 'What if you call run() instead of start()?', d: 'No new thread is created, and main runs work directly.', v: { how: 'run', two: false } },
    { t: 'Removing start()', q: 'What if you remove start()?', d: 'If you only create the thread object and do not start it, work does not run.', v: { how: 'none', two: false } },
    { t: 'Creating one more thread and calling start()', q: 'What if you create one more thread and call start()?', d: 'One more new thread is created, and Thread-0 and Thread-1 run work in turn.', v: { how: 'start', two: true } },
  ],
  // The first look of each box in the diagram. mt, m2, and ml are on the main thread side, and x0 and x1 are on the new thread side
  bx0: function (c) {
    return {
      mt: { cls: 'ghost', title: 'Thread t', sub: ['Not run yet'] },
      m2: { cls: 'ghost', title: 'Thread t2', sub: [c.two ? 'Not run yet' : 'No more threads created'] },
      ml: { cls: 'ghost', title: 'Last line', sub: ['Not run yet'] },
      x0: { cls: 'ghost', title: 'New thread', sub: ['Does not exist yet'] },
      x1: { cls: 'ghost', title: 'New thread', sub: ['Does not exist yet'] },
    };
  },
  code: function (c) {
    var o = ['public class Main {', '    static void work() {', '        String who = Thread.currentThread().getName();', '        System.out.println("Thread that ran work: " + who);', '    }', '', '    public static void main(String[] args) throws Exception {'];
    o.push('        // Create a thread object. No new flow exists yet', '        Thread t = new Thread(() -> work());');
    if (c.how === 'start') o.push('        // start: a new flow is created and runs work', '        t.start();');
    else if (c.how === 'run') o.push('        t.run();');
    o.push('        // join: main waits until that thread finishes', '        t.join();');
    if (c.two) {
      o.push('        // Create one more thread. Handle it the same way as t', '        Thread t2 = new Thread(() -> work());');
      if (c.how === 'start') o.push('        t2.start();');
      else if (c.how === 'run') o.push('        t2.run();');
      o.push('        t2.join();');
    }
    o.push('        String me = Thread.currentThread().getName();', '        System.out.println("Thread that ran this line: " + me);', '    }', '}');
    return o.join('\n');
  },
  label: function (c) { return { start: 'Calls t.start()', run: 'Calls t.run()', none: 'Does not call start' }[c.how] + ' · ' + (c.two ? '2 thread objects (t, t2)' : '1 thread object (t)'); },
  columns: ['Output', 'Thread that ran work', 'Threads newly started'],
  simulate: function (c) {
    var ev = [], sum = [], S = c.how === 'start', R = c.how === 'run', objs = c.two ? ['t', 't2'] : ['t'];
    var st = { hot: '', bx: JSON.parse(JSON.stringify(this.bx0(c))), a: { a0: '', j0: '', a1: '', j1: '' }, started: 0, out: [], names: [], checks: [], fin: false };
    function push(s, k) { ev.push({ s: s, k: k, snap: JSON.parse(JSON.stringify(st)) }); }
    function bx(id, cls, title, sub) { var o = st.bx[id]; o.cls = cls; if (title) o.title = title; o.sub = sub; }

    // 1. The main thread starts
    st.checks.push(['Start of the run', { v: 'One main thread', cls: '' }]);
    push('You run it with java Main. A thread is one flow of execution that runs code from top to bottom, and a Java program starts with one thread named main. This main thread runs the main method from the top. The only flow right now is the main thread.', '');

    objs.forEach(function (v, i) {
      var mid = i ? 'm2' : 'mt', xid = i ? 'x1' : 'x0', nm = 'Thread-' + i, ak = 'a' + i, jk = 'j' + i, first = i === 0;
      var who = 'the new thread (' + nm + ')';

      // 2. Create the Thread object
      st.hot = mid; bx(mid, 'hot now', 'Thread ' + v, ['new Thread(…): object only', 'Name: ' + nm + ' (automatic)']);
      st.checks.push(['Thread ' + v + ' = new Thread(…)', { v: 'Object only, name ' + nm, cls: '' }]);
      push(first
        ? 'The line Thread t = new Thread(() -> work()); new Thread(…) creates a Thread object. The () -> work() in the parentheses is the code to hand to the new flow, and it means "call work()". No name was given, so Java automatically gives the name Thread-0. Only the object exists, and there is no new flow yet. The only flow is the main thread, and the handed code has not run yet.'
        : 'The line Thread t2 = new Thread(() -> work()); creates a second Thread object in the same way as t. The name given automatically is Thread-1. Again only the object exists, and there is no new flow yet.', '');

      if (S) {
        // 3. start
        st.hot = mid; st.started++; st.a[ak] = 'hot';
        bx(mid, 'hot now', null, [v + '.start() called', 'A new thread has started']); bx(xid, 'hot', nm, ['Started']);
        st.checks.push([v + '.start()', { v: 'New thread ' + nm + ' started', cls: 'good' }]);
        push(first
          ? 'The line t.start(); When start() is called, one new flow is created, and the new thread runs the code that was handed to it. The name of the new thread is the Thread-0 given earlier. At this moment there are two flows, and the number of newly started threads is 1. When start() returns, the main thread continues to the next line.'
          : 'The line t2.start(); Again start() creates one new flow, and Thread-1 starts. Thread-0, which took care of t, already finished because of the earlier join, so the number of newly started threads is 2 in all, and the flows that are running now are the main thread and Thread-1.', 'good');
        // 4. join
        st.hot = mid; bx(mid, 'wait', null, [v + '.join(): waiting for', nm + ' to finish']);
        push('The line ' + v + '.join(); When the main thread calls join(), it does not go to the next line and waits until ' + who + ' finishes.', '');
        // 5. The new thread runs work
        st.hot = xid; st.out.push('Thread that ran work: ' + nm); st.names.push(nm);
        bx(xid, 'hot now', nm, ['Runs work()', 'Name: ' + nm]);
        st.checks.push(['work()', { v: 'Run by ' + nm, cls: 'good' }]);
        push('While main waits, ' + who + ' runs the code that was handed to it, () -> work(), and calls work(). Thread.currentThread().getName() inside work is the name of the thread that runs this line, so it is ' + nm + '. Output: Thread that ran work: ' + nm, 'good');
        // 6. It finishes and join returns
        st.hot = mid; st.a[ak] = ''; st.a[jk] = 'good';
        bx(xid, 'good', nm, ['Finished after work']); bx(mid, 'good now', null, [v + '.join() returned']);
        push('The handed code finishes, so ' + who + ' also finishes. ' + v + '.join() of the waiting main thread returns, and main goes to the next line.', '');
      } else if (R) {
        // 3. run: the calling thread (main) runs it directly
        st.hot = mid;
        bx(mid, 'hot now', null, [v + '.run(): main runs', 'work() directly']); bx(xid, 'ghost', 'No new thread', ['No new flow']);
        st.checks.push([v + '.run()', { v: 'No new thread, the caller runs it', cls: 'bad' }]);
        push('The line ' + v + '.run(); run() is an ordinary method call, so no new flow is created. The main thread, which is running this line, runs the handed code () -> work() right there. The number of newly started threads is ' + st.started + ', and the only flow is the main thread.', 'bad');
        st.out.push('Thread that ran work: main'); st.names.push('main');
        st.checks.push(['work()', { v: 'Run by main', cls: '' }]);
        push('The main thread runs work(). Thread.currentThread().getName() inside work is the name of the thread that runs this line, and the thread running it is the main thread, so the name is main. The name of the object ' + v + ' (' + nm + ') does not appear. Output: Thread that ran work: main', '');
        // 4. join: it was never started, so it returns right away
        bx(mid, 'good now', null, [v + '.join(): returns right away']);
        st.checks.push([v + '.join()', { v: 'Never started, so no waiting', cls: '' }]);
        push('The line ' + v + '.join(); ' + v + ' is a Thread object that was never started, so there is no new flow to wait for. join() does not wait and returns right away.', '');
      } else {
        // 3. There is no line that calls start
        st.hot = mid;
        bx(mid, 'hot now', null, ['No line calls start()']); bx(xid, 'ghost', 'No new thread', ['Not called']);
        st.checks.push([v + '.start()', { v: 'No line calls it', cls: 'bad' }]);
        push('No line calls start(). ' + v + ' stays as an object only, and no new flow is created. Nobody runs the handed code () -> work().', 'bad');
        bx(mid, 'good now', null, [v + '.join(): returns right away', 'work did not run']);
        st.checks.push([v + '.join()', { v: 'Never started, so no waiting', cls: '' }]);
        push('The line ' + v + '.join(); ' + v + ' is a Thread object that was never started, so there is no new flow to wait for. join() does not wait and returns right away.', '');
      }
    });

    // The last line
    st.hot = 'ml'; st.out.push('Thread that ran this line: main'); st.fin = true;
    bx('ml', 'good now', null, ['Run by the main thread', 'Name: main']);
    st.checks.push(['Last line', { v: 'Run by main', cls: 'good' }]);
    push('The line String me = Thread.currentThread().getName(); and the println line below it: the main thread continues and runs them. ' + (S ? 'The name is different from that of the new thread that ran the handed code. ' : '') + 'The name of the thread that runs this line is main. Output: Thread that ran this line: main. The main method ends and the program ends. The number of newly started threads was ' + st.started + ' in all.', 'good');

    // Summary: the first line is the answer to this setting (the question)
    if (S && !c.two) {
      sum.push('A thread is one flow of execution that runs code from top to bottom. A Java program starts with one thread named main, and when t.start() was called, one new flow was created and a new thread named Thread-0 ran the handed code. The thread that ran work was Thread-0, and the thread that ran the last line was main.');
      sum.push('new Thread(…) alone does not create a flow. A new flow is created at the moment start() is called, and you can check which thread ran a line with Thread.currentThread().getName().');
    } else if (R && !c.two) {
      sum.push('If you call run() instead of start(), no new thread is created, and the main thread runs the handed code directly. The thread that ran work was also main, and the number of newly started threads was 0.');
      sum.push('run() is an ordinary method call. Calling run() of a Thread object does not create a new flow, and the calling thread runs that code. It is start() that creates a new flow.');
    } else if (!S && !R && !c.two) {
      sum.push('If you remove start(), the handed code does not run. The Thread object t was created, but no new thread started, so work never ran, and the output was only the last line.');
      sum.push('Creating a Thread object does not run any code. join() of a thread that was never started does not wait and returns right away, so the program ended without an error.');
    } else if (S) {
      sum.push('If you create one more thread and call start(), one more new flow is created, so the number of newly started threads was 2 (Thread-0, Thread-1). Each call to start() created one new thread, and the names of the threads that ran work were different too: Thread-0 and Thread-1.');
      sum.push('Java automatically gave names with numbers, such as Thread-0 and Thread-1, to the threads that were not given a name. This code starts t and waits for it to finish with join before it starts t2, so the order of the output is fixed.');
    } else if (R) {
      sum.push('Even if you create two thread objects and call run() on both, no new thread was created. work ran twice, but both times it was the main thread that ran it.');
      sum.push('The number of Thread objects you created and the number of new flows are different. A new flow is created only when start() is called.');
    } else {
      sum.push('Even if you create two objects, if you do not call start(), there are 0 new threads, and work never ran. The output was only the last line.');
      sum.push('What decides the number of new threads is not the number of Thread objects you created but the number of times you called start().');
    }
    return { events: ev, summary: sum, bx0: this.bx0(c), row: [st.out.join(' / '), st.names.length ? st.names.join(', ') : 'Did not run', st.started + ''] };
  },
  render: function (v, sim, t, H, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : null;
    if (!s) { H.text(v, 'Click Run to start from the main thread running the main method from the top.'); return; }
    H.table(v, ['Line run', 'Result'], s.checks.map(function (r) { return { cls: '', cells: [r[0], r[1]] }; }), 'Run');
    if (s.out.length) H.table(v, ['Output'], s.out.map(function (o) { return { cls: '', cells: [{ v: o, cls: 'good' }] }; }), 'Standard output');
    H.counters(v, [[s.started, 'Threads newly started'], [s.out.length, 'Lines printed']]);
  },
  // Diagram: two vertical columns (three if there are two threads). The left one is the main thread, and the right ones are the new threads (Thread-0, Thread-1). In each column the Thread objects t and t2 and the last line are stacked as boxes, and you see which code runs on which line. With start, an arrow goes across from main to the new thread, and with run or none, the new thread column is empty. Below are boxes that count the threads that ran work and the newly started threads.
  draw: function (P, sim, shown) {
    var c = sim.c, last = shown[shown.length - 1], s = last ? last.snap : null, bx = s ? s.bx : sim.bx0, a = s ? s.a : {};
    P.size(680, 356);
    P.region('lm', 14, 8, 250, 252, 'Main thread');
    P.region('l0', 280, 8, 190, 252, 'New thread Thread-0');
    if (c.two) P.region('l1', 486, 8, 180, 252, 'New thread Thread-1');
    function B(id, x, y, w) { var o = bx[id]; P.box(id, x, y, w, 64, { cls: o.cls, title: o.title, sub: o.sub }); }
    B('mt', 22, 34, 234); B('m2', 22, 106, 234); B('ml', 22, 178, 234);
    B('x0', 288, 34, 174);
    if (c.two) B('x1', 494, 106, 164);
    if (a.a0) P.arrow('a0', 'mt:r:0.3', 'x0:l:0.3', { cls: a.a0 });
    if (a.j0) P.arrow('j0', 'x0:l:0.8', 'mt:r:0.8', { cls: a.j0 });
    if (c.two && a.a1) P.arrow('a1', 'm2:r:0.3', 'x1:l:0.3', { cls: a.a1 });
    if (c.two && a.j1) P.arrow('j1', 'x1:l:0.8', 'm2:r:0.8', { cls: a.j1 });
    var names = s && s.names.length ? s.names.join(', ') : '';
    P.box('r1', 14, 270, 652, 36, { cls: names ? 'good' : s && s.fin ? 'plain' : 'ghost', title: 'Thread that ran work', right: names || (s && s.fin ? 'Did not run' : '') });
    P.box('r2', 14, 312, 652, 36, { cls: s && s.started ? 'wait' : 'ghost', title: 'Threads newly started', right: (s ? s.started : 0) + '' });
  },
  assume: 'The compiler and runtime are JDK 21.0.12.1 (javac 21). All 6 combinations were checked against real runs: the same source as the code on the screen (identical line by line) was compiled with javax.tools, and the java of this JDK was started as a child process and actually run 20 times for each combination. In all 120 runs the exit code was 0 and the standard error was empty, and for each combination the standard output was the same in all 20 runs. What was checked is the lines of the standard output (the Output column of the result table), the names of the threads that appear in those lines (the Thread that ran work column), and the number of newly started threads. The number of newly started threads was measured without changing the source on the screen: the start class of the child process read ThreadMXBean.getTotalStartedThreadCount() before and after it called Main.main, and the difference was used (the combinations that call start gave 1 and 2, and the others gave 0, the same in all 20 runs). The facts that the step sentences rely on were checked by running a separately written source 20 times in the same way. Right after a Thread object is created its state is NEW and isAlive() is false, after start() the new thread and main are both alive (the new thread was held in the WAITING state), and after join() returns the state is TERMINATED. When run() is called, main runs the handed code, and even after the call the state of that Thread object is still NEW, and join() of a thread that was never started returns right away without waiting. For the documentation, I opened java.lang.Thread in the Java SE 21 API documentation with WebFetch (I followed the sentences that the excerpts returned and did not read the whole page myself). That a thread is a flow of execution and, once started, is scheduled to run the run method follows the class description; that threads created with Thread() and Thread(Runnable), which are not given a name, are automatically given a name made of "Thread-" and an integer follows the constructor description; that start() schedules the execution of a new thread and it runs separately from the current thread follows the description of start(); that run() is not a method meant to be called directly and, for a thread created with a Runnable, calls the run of that task follows the description of run(); and that join() waits for that thread to finish and returns right away, without waiting, for a thread that has not started follows the descriptions of join() and join(long). That a thread is created as a Thread object and starts when start() of that object is called follows the beginning of chapter 17 of the Java Language Specification (Java SE 21), and that the program starts execution by calling the main method of a class follows section 12.1. However, section 12.1 does not specify the thread that runs main or its name, so the name main for that thread and the numbering order in which the first thread created without a name is Thread-0 and the second is Thread-1 are not defined by the specification but were observed by running on this JDK. The number of newly started threads is the value counted by the JVM and could differ if a thread were started separately inside the JVM, but that did not happen in our test run. The code on the screen uses only classes in java.lang, so it has no import line and has the same form as running with java Main. Every combination starts t and waits for it to finish with join before it starts t2, so the order of the output is fixed, and the order when there is no join or when two threads move at the same time is not covered by this lab and was not checked by execution. Beyond that, implementing Runnable or extending Thread, giving a thread a name, calling start() twice, the state changes of a thread, virtual threads, and thread pools are not covered. The state changes are covered in the in-depth lab "Creating threads and thread states".',
});

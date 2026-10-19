Lab.register({
  id: 'lock_basic', nav: 'Locks (synchronized)', cat: 'Fundamentals', mode: 'step', basic: true, deep: ['race', 'deadlock'],
  title: 'What is a lock, and what happens without one?',
  intro: 'A lock is a mark that says "only one thread runs this section at a time." In this code, the part that sets the lock is the synchronized before the declaration of the add method. What add does is the single line count++, and this one line is three steps: read the value of count, add 1, and write the added value to count. If two threads change the same count at the same time, another thread can change count after one thread has read the value and before it writes, and one thread\'s increment can be lost. When synchronized is attached, a thread must acquire the lock before entering add, and only one thread can hold the lock at a time, so the other thread waits until the previous thread leaves add. In this lab you add and remove synchronized and switch between 2 threads and 1 thread. The same code is compiled and really run, and you see the count printed at the end. (Creating threads and handling them with start and join is covered in the lab "Threads". static is read as meaning that count and add exist only once in the program, and it is not covered in detail here.)',
  terms: ['Locks and monitors', 'synchronized', 'The three steps of count++', 'Race condition'],
  controls: [
    { id: 'sync', label: 'Add the synchronized keyword to the add method', type: 'check', value: true },
    { id: 'threads', label: 'Threads that call add() 100000 times each', type: 'select', value: '2', options: [['2', '2 threads (t1, t2)'], ['1', '1 thread (t1)']] },
  ],
  // q is the question shown on the question-style screen. t and d are the name and the description used in the text-only reading
  presets: [
    { t: 'Default settings', q: 'What does a lock look like, and what does count become when 2 threads each call add() 100000 times?', d: 'add has synchronized and there are 2 threads. Only one thread runs add at a time, so count becomes 200000.', v: { sync: true, threads: '2' } },
    { t: 'Removing synchronized', q: 'What if you remove the synchronized keyword before the add declaration?', d: 'The two threads step in on each other between reading and writing count, so you usually get a value smaller than 200000 (if the threads do not overlap, you can get 200000). The value is different on each run.', v: { sync: false, threads: '2' } },
    { t: 'Using only 1 thread', q: 'What if you use only one thread, t1, without the synchronized keyword?', d: 'There is no other thread to step in, so count is 100000 even without a lock.', v: { sync: false, threads: '1' } },
    { t: 'Adding synchronized with 1 thread', q: 'What if there is only one thread, t1, and you keep the synchronized keyword?', d: 'Even if the thread acquires the lock, no thread is waiting, so the result is the same as without the lock.', v: { sync: true, threads: '1' } },
  ],
  code: function (c) {
    var two = c.threads === '2', o = ['public class Main {', '    // A variable that two threads change together. There is only one in the program', '    static int count = 0;', ''];
    if (c.sync) o.push('    // Lock: with synchronized, only one thread runs at a time');
    o.push('    static ' + (c.sync ? 'synchronized ' : '') + 'void add() {', '        // count++ is three steps: read, add, write', '        count++;', '    }', '',
      '    public static void main(String[] args) throws Exception {', '        // The work of a thread: call add() 100000 times', '        Runnable job = () -> {', '            for (int i = 0; i < 100000; i++) {', '                add();', '            }', '        };', '        Thread t1 = new Thread(job);');
    if (two) o.push('        // The second thread: does the same work', '        Thread t2 = new Thread(job);');
    o.push('        t1.start();');
    if (two) o.push('        t2.start();');
    o.push('        t1.join();');
    if (two) o.push('        t2.join();');
    o.push('        System.out.println(count);', '    }', '}');
    return o.join('\n');
  },
  label: function (c) { return (c.sync ? 'With synchronized' : 'No synchronized') + ' · Threads: ' + c.threads; },
  columns: ['Final value of count', 'Expected value', 'Lost increments'],
  simulate: function (c) {
    var S = c.sync, two = c.threads === '2', expect = two ? 200000 : 100000, ev = [], sum = [];
    var racy = !S && two;
    var last = racy ? 'Usually below 200000 (differs per run)' : String(expect);
    var st = { hot: '', t: [{ cls: 'ghost', sub: ['Not started yet'] }, { cls: 'ghost', sub: [two ? 'Not started yet' : 'Not created'] }], holder: '', inside: [], cnt: null, rd: [null, null], lost: 0, a1: '', a2: '', rw: '', fin: false, res: ['', '', ''], checks: [] };
    function push(s, k) { ev.push({ s: s, k: k, snap: JSON.parse(JSON.stringify(st)) }); }
    var lockLine = 'Because this add has synchronized, a thread that calls it must acquire the lock before going in. The lock of a static method is the single lock that belongs to the Main class, and only one thread can hold a lock at a time. When the thread holding the lock leaves add, the lock is released.';

    // 1. The variable
    st.hot = 'cn'; st.checks.push(['static int count = 0;', 'One count variable, value 0']);
    push('You run it with java Main. The line static int count = 0; at the top creates one variable named count, with the value 0. This variable is the only one, so every thread in the program reads and writes the same count. The main thread runs the main method from the top.', '');

    // 2. Start the threads
    st.hot = '';
    st.t[0] = { cls: 'plain', sub: ['Calling add()', '100000 times'] }; st.a1 = 'hot';
    if (two) { st.t[1] = { cls: 'plain', sub: ['Calling add()', '100000 times'] }; st.a2 = 'hot'; }
    st.checks.push([two ? 't1.start(), t2.start()' : 't1.start()', two ? '2 threads start together' : '1 thread starts']);
    if (two) push('main creates a Runnable job. job is the work "call add() 100000 times." main hands the same job to Thread t1 and t2 and calls t1.start() and t2.start(). Now two threads each start calling add() 100000 times. main waits at t1.join() and t2.join() for both to finish.', '');
    else push('main creates a Runnable job. job is the work "call add() 100000 times." main hands this job to Thread t1 and calls t1.start(). Now one thread, t1, starts calling add() 100000 times. main only waits at t1.join() for t1 to finish and does not touch count.', '');

    // 3. The three steps of count++
    st.hot = 'ad'; st.a1 = ''; st.a2 = '';
    st.checks.push(['count++', 'Read, add, write: three steps']);
    push('The single line count++ inside add() is not one piece but three steps. 1) Read the current value of count. 2) Add 1 to the value you read. 3) Write the added value to count. ' + (S ? lockLine : 'add does not have synchronized, so there is no limit on how many threads can go into add, however many there are.'), '');
    st.hot = '';

    // 4 on. Example scene
    st.cnt = 5;
    if (racy) {
      st.inside = ['t1']; st.rd[0] = 5; st.hot = 't1'; st.rw = 'hot'; st.a1 = 'hot';
      st.t[0] = { cls: 'hot', sub: ['Read count: 5'] };
      st.checks.push(['Example: t1 reads count', '5']);
      push('Follow one case in which a thread steps in (the numbers are an example). Say count is 5 in the middle of the 100000 calls each. t1 goes into add() and reads count, getting 5. It has not written yet.', '');
      st.inside = ['t1', 't2']; st.rd[1] = 5; st.hot = 't2'; st.a2 = 'hot';
      st.t[1] = { cls: 'hot', sub: ['Read count: 5'] };
      st.checks.push(['Example: t2 also reads count', '5']);
      push('Before t1 writes, t2 also goes into add(). There is no lock, so nothing stops it from going in, and t2 also reads count. count is still 5, so t2 also gets 5.', '');
      st.cnt = 6; st.hot = 'cn'; st.a2 = '';
      st.t[0] = { cls: 'plain', sub: ['Adds 1 to 5 it read', 'and writes 6'] };
      st.inside = ['t2']; st.rd[0] = null;
      st.checks.push(['Example: t1 writes 6', 'count = 6']);
      push('t1 adds 1 to the 5 it read and writes the 6 to count. count becomes 6.', '');
      st.hot = 't2'; st.lost = 1; st.inside = []; st.rd[1] = null; st.a1 = ''; st.a2 = 'hot';
      st.t[1] = { cls: 'bad', sub: ['Adds 1 to 5 it read', 'and writes 6'] };
      st.checks.push(['Example: t2 writes 6', { v: 'count = 6, one increment lost', cls: 'bad' }]);
      push('t2 adds 1 to the 5 it read and writes the 6 to count. t2 does not know that t1 raised count to 6 in the meantime, so count stays 6, not 7. One increment was lost.', 'bad');
    } else if (S && two) {
      st.holder = 't1'; st.inside = ['t1']; st.rd[0] = 5; st.hot = 't1'; st.rw = 'hot'; st.a1 = 'hot';
      st.t[0] = { cls: 'hot', sub: ['Holds lock, in add()', 'Read count: 5'] };
      st.checks.push(['Example: t1 holds the lock and reads count', '5']);
      push('Follow one case with the lock (the numbers are an example). Say count is 5 in the middle of the 100000 calls each. t1 calls add() first. The lock is free, so t1 acquires the lock and goes in, and reads count, getting 5.', '');
      st.hot = 't2'; st.a2 = 'dash'; st.rw = '';
      st.t[1] = { cls: 'wait', sub: ['Called add(), but', 'waiting: no lock'] };
      st.checks.push(['Example: t2 calls add()', { v: 'Waits because t1 holds the lock', cls: 'good' }]);
      push('At this moment t2 also calls add(). The lock is held by t1. t2 cannot go into add and waits until the lock is released. It does not even read count.', 'good');
      st.cnt = 6; st.hot = 'cn'; st.holder = ''; st.inside = []; st.rd[0] = null; st.a1 = ''; st.a2 = ''; st.rw = 'hot';
      st.t[0] = { cls: 'plain', sub: ['Writes 6, leaves add()', 'Releases the lock'] };
      st.t[1] = { cls: 'wait', sub: ['Lock released,', 'can acquire it now'] };
      st.checks.push(['Example: t1 writes 6 and leaves', 'count = 6, lock released']);
      push('t1 adds 1 to the 5 it read, writes the 6 to count, and leaves add(). It finished the three steps of read, add, and write with nothing stepping in between, and the lock is released as it leaves. t2, which was waiting, can now acquire the lock.', '');
      st.hot = 't2'; st.holder = 't2'; st.inside = ['t2']; st.rd[1] = 6; st.a2 = 'hot'; st.rw = 'hot';
      st.t[1] = { cls: 'hot', sub: ['Holds lock, in add()', 'Read count: 6'] };
      st.checks.push(['Example: t2 holds the lock and reads count', '6']);
      push('When the lock is released, t2 acquires the lock and goes into add. This time the count it reads is the 6 that t1 wrote.', '');
      st.cnt = 7; st.hot = 'cn'; st.holder = ''; st.inside = []; st.rd[1] = null; st.a2 = ''; st.rw = 'hot';
      st.t[1] = { cls: 'good', sub: ['Writes 7, leaves add()', 'Releases the lock'] };
      st.checks.push(['Example: t2 writes 7 and leaves', { v: 'count = 7, both increments counted', cls: 'good' }]);
      push('t2 adds 1 to the 6 it read, writes the 7 to count, and releases the lock as it leaves add(). Both increments were reflected in count, so it went from 5 to 7.', 'good');
    } else if (S) {
      st.holder = 't1'; st.inside = ['t1']; st.rd[0] = 5; st.hot = 't1'; st.rw = 'hot'; st.a1 = 'hot';
      st.t[0] = { cls: 'hot', sub: ['Holds lock, in add()', 'Read count: 5'] };
      st.checks.push(['Example: t1 holds the lock and reads count', '5']);
      push('Follow one call of add() (the numbers are an example). Say count is 5 in the middle of the 100000 calls. When t1 calls add(), the lock is free, so t1 acquires the lock and goes in. No other thread is trying to acquire the lock, so there is no waiting. t1 reads count and gets 5.', '');
      st.cnt = 6; st.hot = 'cn'; st.holder = ''; st.inside = []; st.rd[0] = null; st.a1 = '';
      st.t[0] = { cls: 'plain', sub: ['Writes 6, leaves add()', 'Releases the lock'] };
      st.checks.push(['Example: t1 writes 6 and leaves', 'count = 6, lock released']);
      push('t1 writes the 6 it got by adding 1 and leaves add(), releasing the lock. At the next call to add() it again acquires and releases the lock, but there is no other thread to compete for the lock.', '');
    } else {
      st.inside = ['t1']; st.rd[0] = 5; st.hot = 't1'; st.rw = 'hot'; st.a1 = 'hot';
      st.t[0] = { cls: 'hot', sub: ['Read count: 5'] };
      st.checks.push(['Example: t1 reads count', '5']);
      push('Follow one call of add() (the numbers are an example). Say count is 5 in the middle of the 100000 calls. t1 goes into add() and reads count, getting 5. The only thread reading or writing count now is t1. main is waiting at join.', '');
      st.cnt = 6; st.hot = 'cn'; st.inside = []; st.rd[0] = null; st.a1 = '';
      st.t[0] = { cls: 'plain', sub: ['Adds 1 to 5 it read', 'and writes 6'] };
      st.checks.push(['Example: t1 writes 6', 'count = 6']);
      push('t1 adds 1 to the 5 it read and writes the 6 to count. No other thread can change count between the read and the write, so the 5 it read is still the value of count at the moment of writing. count becomes 6.', '');
    }

    // The end. Print the result
    st.hot = 'r1'; st.cnt = null; st.lost = 0; st.holder = ''; st.inside = []; st.rd = [null, null]; st.a1 = ''; st.a2 = ''; st.rw = ''; st.fin = true;
    st.t[0] = { cls: 'good', sub: ['100000 calls finished'] };
    if (two) st.t[1] = { cls: 'good', sub: ['100000 calls finished'] };
    st.res = [last, String(expect), racy ? 'Yes (different on each run)' : 'None'];
    st.checks.push(['println(count) after join', { v: last, cls: racy ? 'bad' : 'good' }]);
    if (racy) push('This kind of stepping in happens many times during the 100000 calls each. When it happens differs on every run, so ' + (two ? 'after both threads have finished (t1.join() and t2.join()), ' : '') + 'the value that println(count) prints is usually smaller than 200000 and different on each run. The number of lost increments differs on each run too.', 'bad');
    else if (S && two) push('Each time add() was called, only one thread was inside, so no increment was lost. After both threads finish (t1.join() and t2.join()), println(count) prints 200000. It is the same value however many times you run it. In exchange, the other thread has to wait until the thread holding the lock leaves.', 'good');
    else push('t1 finishes all 100000 calls like this and ends. t1.join() returns, and println(count) prints ' + expect + '. ' + (S ? 'Even with the lock, the result is the same as without the lock.' : 'It was not wrong even without synchronized.') + ' It is the same value however many times you run it.', 'good');

    // Summary: the first line is the answer to this setting (the question)
    if (S && two) {
      sum.push('A call to add() with the lock is run by only one thread at a time, so even when 2 threads each call it 100000 times, count becomes 200000. A lock is a mark that says "only one thread runs this section at a time," and in Java you set it by putting synchronized before the method declaration.');
      sum.push('The read, add, and write of count++ finished inside one thread without being broken up, so no increment was lost. The cost is that the other thread waits until the thread holding the lock leaves.');
    } else if (racy) {
      sum.push('When you remove synchronized, the 2 threads step in on each other inside add(), the final count usually became a value smaller than 200000, and increments were lost. The value was different on each run.');
      sum.push('No error or exception occurs, and only a wrong value comes out, quietly. If another thread changes count between the read, the add, and the write, the thread overwrites it with the stale value it had read, and that increment is as if it never happened.');
    } else if (!S) {
      sum.push('Even without synchronized, count is 100000 if there is only one thread. t1 is the only thread changing count, so there is no thread to step in between the read and the write.');
      sum.push('You need a lock when two or more threads change the same variable. That it was right when you tried it with one thread does not mean it is still right when you add threads.');
    } else {
      sum.push('With only one thread, count is 100000 even if you keep synchronized, and the result is the same as without a lock. There is no other thread to compete for the lock, so no thread waits either.');
      sum.push('A lock does not change a correct result. It prevents a wrong result when several threads overlap. If you change the threads to 2, you see the difference between having a lock and not having one.');
    }
    return { events: ev, summary: sum, expect: expect, row: [last, String(expect), racy ? 'Yes (different on each run)' : 'None'] };
  },
  render: function (v, sim, t, H, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : null;
    if (!s) { H.text(v, 'Click Run to start from creating the count variable.'); return; }
    H.table(v, ['What happened', 'Result'], s.checks.map(function (r) { return { cls: '', cells: [r[0], r[1]] }; }), 'Run');
    if (s.cnt !== null) H.counters(v, [[s.cnt, 'count in the example scene'], [s.lost, 'Increments lost in the example scene']]);
  },
  // Diagram: on the left the threads t1 and t2, in the middle the add method (the section where the lock is set), on the right the count that everyone shares. A dotted arrow going from a thread into add means it is waiting because of the lock. Below are boxes for the final count, the expected value, and the lost increments.
  draw: function (P, sim, shown) {
    var c = sim.c, last = shown[shown.length - 1], s = last ? last.snap : null, two = c.threads === '2';
    P.size(680, 336);
    var hot = s ? s.hot : '';
    function cls(id, base) { return hot === id ? (base === 'plain' ? 'hot now' : base + ' now') : base; }
    var t0 = s ? s.t[0] : { cls: 'ghost', sub: ['Not started yet'] }, t1 = s ? s.t[1] : { cls: 'ghost', sub: [two ? 'Not started yet' : 'Not created'] };
    P.box('t1', 14, 16, 180, 84, { cls: cls('t1', t0.cls), title: 'Thread t1', sub: t0.sub });
    P.box('t2', 14, 112, 180, 84, { cls: cls('t2', t1.cls), title: 'Thread t2', sub: t1.sub });
    var adSub = c.sync ? ['synchronized present', 'Lock held by: ' + (s && s.holder ? s.holder : 'none')] : ['No synchronized', 'Threads inside: ' + (s && s.inside.length ? s.inside.join(', ') : 'none')];
    P.box('ad', 244, 16, 190, 180, { cls: cls('ad', c.sync ? (s && s.holder ? 'wait' : 'plain') : 'plain'), title: 'add() method', sub: adSub });
    var rd = s ? s.rd : [null, null], rdTxt = [];
    if (rd[0] !== null) rdTxt.push('Value t1 read: ' + rd[0]);
    if (rd[1] !== null) rdTxt.push('Value t2 read: ' + rd[1]);
    P.box('cn', 484, 16, 182, 180, { cls: cls('cn', 'plain'), title: 'count', sub: [s && s.cnt !== null ? 'Example value: ' + s.cnt : 'Value: ' + (s && s.fin ? '(finished)' : 0)].concat(rdTxt) });
    if (s && s.a1) P.arrow('a1', 't1:r:0.5', 'ad:l:0.25', { cls: s.a1 });
    if (s && s.a2) P.arrow('a2', 't2:r:0.5', 'ad:l:0.75', { cls: s.a2 });
    if (s && s.rw) P.arrow('rw', 'ad:r:0.5', 'cn:l:0.5', { cls: s.rw });
    var done = s && s.fin;
    P.box('r1', 14, 208, 652, 36, { cls: done ? (c.sync || !two ? 'good' : 'bad') : 'ghost', title: 'Final count (from println)', right: done ? s.res[0] : '' });
    P.box('r2', 14, 250, 652, 36, { cls: done ? 'plain' : 'ghost', title: 'Expected value', right: done ? s.res[1] : '' });
    P.box('r3', 14, 292, 652, 36, { cls: done ? (s.res[2] === 'None' ? 'good' : 'bad') : 'ghost', title: 'Lost increments', right: done ? s.res[2] : '' });
  },
  assume: 'The compiler and runtime are JDK 21.0.12.1 (javac 21). All 4 combinations were checked against real runs: the same source as the code on the screen (identical line by line) was compiled with javax.tools, and the java of this JDK was started as a child process and actually run 30 times for each combination, and the final count that was printed was collected and compared. In all 120 runs the exit code was 0 and the standard error was empty. For the two combinations with synchronized, the output was 200000 in all 30 runs with 2 threads and 100000 in all 30 runs with 1 thread. The combination without synchronized and with 1 thread was also 100000 in all 30 runs. The combination without synchronized and with 2 threads was smaller than 200000 in all 30 runs, and there were 30 different values (between 119684 and 155244). So the result cell for this combination is not a fixed number but "A value smaller than 200000 (different on each run)". This is what was seen in our test run (JDK 21, 12 logical processors), and how many increments are lost can differ between computers and between runs, so the screen does not state the amount lost as a fixed fact. The numbers 5, 6, and 7 in the scenes and the order in which t1 and t2 step in are one example chosen to show the principle, and that order was not observed in a real run. In the real runs, many more increments were lost than in this example\'s single one (44756 to 80316 short of the expected value), and I did not break down separately why that many are lost. What this lab checked is the fact that increments are lost and the fact that the operation is split into three steps, and it did not check how those two facts produce the amount that is lost. The facts that the step sentences rely on were checked with separately written source. First, when I looked at count++ inside add() of the same source with javap, the order was getstatic (read), iconst_1 and iadd (add 1), and putstatic (write). Second, while t1 held the lock inside a static synchronized method and t2 called the same method, the state of t2 was BLOCKED, Thread.holdsLock(Main.class) showed true, which shows that the lock belongs to the Class object of Main, and after both finished, count was 2 (the same in all 30 runs). For the documentation, I opened the Java Language Specification (Java SE 21) myself. That only one thread at a time can hold the lock of a monitor and other threads stop until they can hold it, and that a static method uses the monitor of the Class object, follow section 17.1; that a synchronized method acquires the monitor before it executes, and that a static method uses the monitor of the Class object and an instance method uses the monitor of this, follow section 8.4.3.6; and that the lock is released automatically when the method ends follows the explanation at the beginning of chapter 8. Section 8.4.3.6 itself did not state when the lock is released. That a lock release by one thread is ordered before a later acquisition of the same lock by another thread is the content of section 17.4.5, and this lab did not cover the problem of whether values become visible. That count++ is divided into three steps of getting the value, adding 1, and storing it back, and that when the steps of two threads mix, an update can be lost, I confirmed by opening Thread Interference and Synchronized Methods in the Synchronization part of the Java Tutorials. However, no document specifies how many times it is lost in this code, and that is the value from running it on this JDK. I read the documents through web page summaries and did not read the whole original text myself. The code on the screen uses only classes inside java.lang, so it has no import line. Beyond that, synchronized blocks, the lock that each object has separately (instance methods), volatile and AtomicInteger, the order in which locks are released and fairness, and deadlock, in which threads wait for each other and stop, are not covered. Why increments are lost and a comparison of locks are covered in the in-depth lab "Race condition", and deadlock in "Deadlock".',
});

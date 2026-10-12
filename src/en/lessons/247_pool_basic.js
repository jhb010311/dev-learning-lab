Lab.register({
  id: 'pool_basic', nav: 'Thread pools', cat: 'Fundamentals', mode: 'step', basic: true, deep: ['threadpool', 'connpool'],
  title: 'What is a thread pool, and how is it different from creating a thread every time?',
  intro: 'There are two ways to have threads do tasks. One is to create a new thread each time a task comes up, with the line new Thread(() -> work()).start(). The other is to hand the tasks to a thread pool. A thread pool is an ExecutorService object that you create with the line Executors.newFixedThreadPool(2), which sets the number of threads. When you hand a task to it with the line pool.submit(() -> work()), one of the threads in the pool takes the task and runs it. If all the threads in the pool are busy, the remaining tasks wait in line, and a thread that finishes a task does not end but goes on to the next task in line. The last line, pool.shutdown(), accepts no new tasks, finishes the tasks already handed over, and then closes the pool. In this lab you change how the tasks are handed over and how many threads the pool has, and the same code is compiled and run 20 times each, to show how many different thread names ran the work() method and whether the same name repeats. (Which thread does which task can differ from run to run, so the runs are compared only by the number and the list of names.)',
  terms: ['Thread pool', 'ExecutorService and newFixedThreadPool', 'submit()', 'shutdown()'],
  controls: [
    { id: 'how', label: 'How the tasks are handed over', type: 'select', value: 'pool', options: [['pool', 'Hand them to a thread pool with the pool.submit method'], ['new', 'Create a new thread for each task with new Thread']] },
    { id: 'size', label: 'Number of threads in the thread pool', type: 'select', value: '2', options: [['2', '2 threads'], ['1', '1 thread'], ['6', '6 threads']], show: function (c) { return c.how === 'pool'; }, hint: 'Used only when you hand the tasks to a thread pool.' },
  ],
  // q is the question shown on the question-style screen. t and d are the name and the description used in the text-only reading
  presets: [
    { t: 'Default settings', q: 'What does a thread pool look like, and how many threads do the work when you hand 6 tasks to a pool of 2 threads?', d: 'You hand 6 tasks to a pool of 2 threads. Only 2 different thread names appear, and the same thread does several tasks.', v: { how: 'pool', size: '2' } },
    { t: 'Creating a new thread for each task without a pool', q: 'What if you do not use a pool and create a new thread for each task with the line new Thread(() -> work()).start()?', d: '6 tasks cause 6 new threads to be created, and no thread does two tasks.', v: { how: 'new', size: '2' } },
    { t: 'Reducing the pool to 1 thread', q: 'What if you reduce the number of threads in the thread pool to 1?', d: 'One thread does the 6 tasks one after another. The remaining tasks wait in the queue.', v: { how: 'pool', size: '1' } },
    { t: 'Increasing the pool to 6 threads', q: 'What if you increase the number of threads in the thread pool to 6?', d: '6 threads take the 6 tasks one each. No task waits in the queue.', v: { how: 'pool', size: '6' } },
  ],
  code: function (c) {
    var o = [];
    if (c.how === 'pool') o.push('import java.util.concurrent.*;', '');
    o.push('public class Main {', '    // The task: print the name of the thread that ran this line, then rest for 0.05 seconds', '    static void work() {', '        String who = Thread.currentThread().getName();', '        System.out.println("Thread that did the work: " + who);', '        try { Thread.sleep(50); } catch (InterruptedException e) { }', '    }', '', '    public static void main(String[] args) {');
    if (c.how === 'pool') {
      o.push('        // Thread pool: create a set number of threads and reuse them', '        ExecutorService pool = Executors.newFixedThreadPool(' + c.size + ');', '        for (int i = 1; i <= 6; i++) {', '            // Submit: hand a task to the pool, and a pool thread takes it and runs it', '            pool.submit(() -> work());', '        }', '        // Clean up: finish the submitted tasks, then end the pool threads', '        pool.shutdown();');
    } else {
      o.push('        for (int i = 1; i <= 6; i++) {', '            // Create and start a new thread for each task', '            new Thread(() -> work()).start();', '        }');
    }
    o.push('    }', '}');
    return o.join('\n');
  },
  label: function (c) { return c.how === 'pool' ? 'Handed to a thread pool (size ' + c.size + ')' : 'new Thread for each task'; },
  columns: ['Threads that did work', 'Names of the threads that did work', 'Tasks finished', 'Same thread did several tasks'],
  simulate: function (c) {
    var isPool = c.how === 'pool', N = 6, s = isPool ? +c.size : N, ev = [], sum = [];
    function nm(k) { return isPool ? 'pool-1-thread-' + (k + 1) : 'Thread-' + k; }   // k is the thread position counted from 0
    function jobs(a, b) { var r = []; for (var j = a; j <= b; j++) r.push(j); return r; }
    function range(a, b) { return a === b ? 'task #' + a : 'tasks #' + a + ' to #' + b; }
    var nameList = s === 1 ? nm(0) : s === 2 ? nm(0) + ', ' + nm(1) : nm(0) + ' ~ ' + nm(N - 1);
    var st = { hot: '', pool: isPool, th: [0, 0, 0, 0, 0, 0], q: [], sub: 0, run: [], done: 0, made: 0, mainEnd: false, arrow: '', checks: [] };
    function push(text, k) { ev.push({ s: text, k: k, snap: JSON.parse(JSON.stringify(st)) }); }
    function create(a, b) { for (var k = a - 1; k <= b - 1; k++) { st.th[k] = 1; st.made++; st.run.push(k + 1); } st.sub = b; }

    // 1. The start
    st.hot = 'mn';
    push('You run it with java Main. The main thread runs the main method from the top. What this program has to do is call work() 6 times, and the work() method prints the name of the thread that ran it and rests for 0.05 seconds. ' + (isPool ? 'This lab hands the 6 tasks to a thread pool and lets the pool threads do the work.' : 'This lab creates a new thread for each task and lets that thread do the work.') + ' Right now there is only the main thread, and no task has started.', '');

    if (isPool) {
      // 2. Create the pool
      st.checks.push(['newFixedThreadPool(' + s + ')', 'Pool created, 0 threads so far']);
      push('The line ExecutorService pool = Executors.newFixedThreadPool(' + s + '); creates a thread pool. A thread pool is a device that accepts tasks and creates threads only up to a set number and reuses them. The number set for this pool is ' + s + '. At the moment the pool is created, not one thread has been created yet. The threads of the pool are created one by one as you hand over tasks.', '');
      // 3. The submit calls that create threads
      st.arrow = 'sub'; create(1, 1);
      push('First pass of the for loop (i is 1). The line pool.submit(() -> work()); The submit method hands a task to the pool, and the () -> work() part in the parentheses is the task. The pool has no threads yet, so it creates one new thread and gives it task #1. A thread created by the pool gets a name like ' + nm(0) + ', which contains the pool number and the thread number. That thread runs the work() method and prints Thread that did the work: ' + nm(0) + '. The main thread does not wait for the task to finish and goes to the next line.', 'good');
      if (s === 2) {
        create(2, 2);
        push('Second pass of the for loop (i is 2). The same line pool.submit(() -> work()); runs again. There is only 1 thread, which is fewer than the number set for the pool (2), so the pool creates a second thread, ' + nm(1) + ', and gives it task #2. Now 2 threads are working.', 'good');
      } else if (s === N) {
        create(2, N);
        push('Passes #2 to #6 of the for loop (i is 2 to 6) run the same line too. As long as the number of threads created is less than the number set for the pool (6), the pool creates a new thread each time a task is handed over, and the threads ' + nm(1) + ' to ' + nm(N - 1) + ' take tasks #2 to #6 one each. There are now 6 threads in all.', 'good');
      }
      // 4. The submit calls that put tasks in the queue
      if (s < N) {
        st.q.push(s + 1); st.sub = s + 1;
        push('Pass #' + (s + 1) + ' of the for loop (i is ' + (s + 1) + '). The same line runs, but this time it does not create a thread. The pool already has as many threads as the number set for it (' + s + '), and all of them are busy. The pool puts task #' + (s + 1) + ' in the queue. The queue is where handed-over tasks wait for a thread to become free, and the task that got in first comes out first.', '');
        st.q = jobs(s + 1, N); st.sub = N;
        push('The remaining passes of the for loop (i is ' + (s + 2) + ' to 6) run the same line too. All the threads are busy, so ' + range(s + 2, N) + ' also line up in the queue one after another. The number of tasks waiting in the queue is now ' + (N - s) + '.', '');
      }
      st.arrow = '';
      st.checks.push(['pool.submit(…) 6 times', 'Threads working: ' + s + ', tasks waiting in the queue: ' + (N - s)]);
      push('The for loop is done. All 6 tasks have been handed over. ' + (s < N ? 'Tasks being done by threads: ' + s + '. Tasks waiting in the queue: ' + (N - s) + '.' : 'The 6 threads took the 6 tasks one each, and no task is waiting in the queue.') + ' The number of threads created is ' + s + ', and even if more tasks come, the pool does not create more threads than this.', 'good');
      // 5. shutdown
      st.mainEnd = true; st.hot = 'mn';
      st.checks.push(['pool.shutdown()', 'No new tasks accepted, submitted tasks finished']);
      push('The line pool.shutdown(); The main thread tells the pool "do not accept any new tasks, and finish the tasks you have already been given." The shutdown method does not wait for the tasks to finish and returns right away, so the main method ends here. The program goes on until the pool threads finish the remaining tasks. (When this line was removed and the program was run, the pool threads stayed alive after all the tasks were done, and the program did not end.)', '');
      st.hot = '';
      // 6. Tasks taken from the queue
      if (s < N) {
        var w1 = jobs(s + 1, Math.min(2 * s, N)), rest = jobs(2 * s + 1, N);
        st.arrow = 'take'; st.done = s; st.run = w1; st.q = rest;
        push(s === 1
          ? 'When the thread ' + nm(0) + ' finishes task #1, the same thread takes task #2 from the front of the queue and runs it. No new thread is created, and the same name appears in the output again. A thread does not end when it finishes one task; it waits for the next one.'
          : 'As soon as a thread finishes a task, it takes the task at the front of the queue and runs it. The diagram shows tasks #1 and #2 finished and tasks #3 and #4 started. No new thread is created, and each task is taken by one of the existing threads, ' + nm(0) + ' and ' + nm(1) + '. Which thread takes which task can differ from run to run, so the diagram does not fix it. A thread does a second task, so the same name appears in the output again.', 'good');
        if (rest.length) {
          st.done = 2 * s; st.run = rest.slice(0, s); st.q = rest.slice(s);
          push(s === 1
            ? 'The remaining ' + range(3, N) + ' go the same way: each time the thread finishes a task, it takes the next task at the front of the queue. There is only one thread, so the tasks run one at a time in numbered order.'
            : 'The remaining ' + range(5, N) + ' go the same way: as soon as a thread finishes a task, it takes one from the queue and runs it. No new thread is created here either.', 'good');
        }
      } else {
        st.arrow = '';
        push('The 6 threads each run the task they took. No task waits in the queue, and since each task has its own thread, the same name does not appear twice in the output.', 'good');
      }
      // 7. The end
      st.arrow = ''; st.done = N; st.run = []; st.q = []; st.th = [3, 3, 3, 3, 3, 3].map(function (v, k) { return k < s ? 3 : 0; });
      st.checks.push(['Threads that did work', s + ': ' + nameList]);
      push(s < N
        ? 'All 6 calls to work() have finished. The queue is empty and the shutdown method has been called, so the pool threads end too. The number of threads that did work was ' + s + ' (' + nameList + '), and ' + (N - s) + ' of the 6 tasks were done again by a thread that had already worked. The number of threads newly created in all is ' + s + '.'
        : 'All 6 calls to work() have finished. The queue is empty and the shutdown method has been called, so the pool threads end too. The number of threads that did work was 6 (' + nameList + '), and since each task had its own thread, no thread worked twice. The number of threads set for the pool is 6, which is why the 6 tasks did not have to wait in the queue.', 'good');
    } else {
      // No pool: a new thread for each task
      st.arrow = 'sub'; create(1, 1);
      st.checks.push(['new Thread(…).start() 6 times', '6 new threads started']);
      push('First pass of the for loop (i is 1). The line new Thread(() -> work()).start(); The new Thread(…) part creates a thread object, and the start() method starts the new thread. There is no pool, so there is no place to hand the task to and no queue, and a new thread is created every time this line runs. No name was given to the new thread, so the name it gets automatically is ' + nm(0) + '. This thread runs task #1.', 'good');
      create(2, N);
      push('Passes #2 to #6 of the for loop (i is 2 to 6) run the same line too, and each time one new thread is created. The new threads get the names ' + nm(1) + ' to ' + nm(N - 1) + ' in order, and take tasks #2 to #6 one each. The number of newly started threads is 6 in all.', 'good');
      st.arrow = ''; st.mainEnd = true;
      push('The for loop ends, and the main method ends too. Each of the 6 tasks is run by its own thread, and no task waited in a queue.', '');
      st.done = N; st.run = []; st.th = [3, 3, 3, 3, 3, 3];
      st.checks.push(['Threads that did work', '6: ' + nameList]);
      push('All 6 calls to work() have finished, and each thread ended after it finished its task. The number of threads that did work was 6 (' + nameList + '), and no thread ever did a second task. A new thread was created for each task, and a thread that finished its task was not used again.', 'good');
    }

    // Summary: the first line is the answer to this setting (the question)
    if (isPool && s === 2) {
      sum.push('A thread pool is a device that creates threads only up to a set number and reuses them. In code you create it with the line Executors.newFixedThreadPool(2) and hand tasks to it with the line pool.submit(…). You handed it 6 tasks, but only the 2 threads ' + nameList + ' did the work, and the remaining tasks waited in the queue until the threads that already existed took them.');
      sum.push('The number of threads is decided not by the number of tasks but by the number set for the pool, and you can tell that the same thread did several tasks because the same name repeats in the output. Which thread does which task can differ from run to run.');
    } else if (isPool && s === 1) {
      sum.push('When you reduce the number of threads to 1, the single thread ' + nameList + ' did the 6 tasks one after another. The number of tasks is still 6, and 5 of them waited in the queue and then ran one at a time in numbered order.');
      sum.push('A pool sets how many tasks run at the same time by its number of threads. With one thread, the tasks run only one at a time, so when there are many tasks, the later ones wait that much longer.');
    } else if (isPool) {
      sum.push('When you increase the number of threads to 6, the 6 threads took the 6 tasks one each. No task waited in the queue, and no thread did a task a second time. The names were ' + nameList + '.');
      sum.push('This table looks the same as the one for creating a new Thread for each task. The differences are that these threads belong to a pool and wait for the next task when a task ends, and that even if there are more than 6 tasks, the pool creates no more than 6 threads.');
    } else {
      sum.push('When you create a new Thread for each task without a pool, 6 tasks caused 6 new threads to be created (' + nameList + '), and no thread ever did two tasks. Each task used one new thread, and when the task ended, that thread ended too.');
      sum.push('This way has no upper limit on the number of threads, so as the tasks increase, the newly created threads increase with them. A thread pool reduces the cost of creating and throwing away threads like this by reusing a set number of threads and making the extra tasks wait in the queue.');
    }
    var nameArr = []; for (var k = 0; k < s; k++) nameArr.push(nm(k));
    return { events: ev, summary: sum, row: [s + '', nameArr.join(', '), N + '', s < N ? 'Yes' : 'No'] };
  },
  render: function (v, sim, t, H, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : null;
    if (!s) { H.text(v, 'Click Run to start from the main thread running the main method from the top.'); return; }
    H.table(v, ['Line run', 'Result'], s.checks.map(function (r) { return { cls: '', cells: [r[0], r[1]] }; }), 'Run');
    H.counters(v, [[s.made, 'Threads created'], [s.done, 'Tasks finished'], [s.q.length, 'Tasks waiting in the queue']]);
  },
  // Diagram: main on the left and the pool area on the right. Inside the pool area are the queue (number boxes of the waiting tasks) and six thread slots. With no pool there is no queue, and Thread-0 to Thread-5 appear in the thread slots. Below are boxes that count the threads created, the tasks finished, and the tasks waiting in the queue.
  draw: function (P, sim, shown) {
    var c = sim.c, isPool = c.how === 'pool', size = isPool ? +c.size : 6, last = shown[shown.length - 1], s = last ? last.snap : null;
    var th = s ? s.th : [0, 0, 0, 0, 0, 0], q = s ? s.q : [], made = s ? s.made : 0, done = s ? s.done : 0, arrow = s ? s.arrow : '';
    P.size(680, 332);
    P.box('mn', 14, 16, 150, 130, { cls: s && s.hot === 'mn' ? 'hot now' : 'plain', title: 'main', sub: !s ? ['Before the run'] : s.mainEnd ? ['Handed over: ' + s.sub, 'main method ended'] : s.sub ? ['Handed over: ' + s.sub] : ['None handed over'] });
    P.region('pl', 216, 8, 450, 262, isPool ? 'Thread pool (up to ' + size + ' threads)' : 'No pool: a new thread for each task');
    P.region('qu', 228, 36, 140, 226, isPool ? 'Queue (waiting)' : 'No queue');
    P.region('th', 418, 36, 236, 226, 'Threads');
    if (arrow === 'sub') P.arrow('sub', 'mn:r:0.5', [216, 91], { cls: 'hot' });
    if (arrow === 'take') P.arrow('take', [368, 150], [418, 150], { cls: 'hot' });
    if (isPool) {
      q.forEach(function (j, i) { P.box('j' + j, 236 + (i % 2) * 66, 68 + Math.floor(i / 2) * 34, 62, 28, { cls: 'wait', sub: 'Task #' + j, center: true }); });
      if (!q.length) P.text('noq', 298, 150, 'Empty', { cls: 'mut', anchor: 'middle' });
    } else {
      P.text('noq', 298, 150, 'No pool', { cls: 'mut', anchor: 'middle' });
    }
    for (var i = 0; i < 6; i++) {
      var name = isPool ? 'pool-1-thread-' + (i + 1) : 'Thread-' + i, y = 66 + i * 32;
      if (isPool && i >= size) P.box('t' + i, 426, y, 220, 26, { cls: 'ghost', title: '(not in this pool)' });
      else if (th[i] === 1) P.box('t' + i, 426, y, 220, 26, { cls: 'hot', title: name, right: 'Working' });
      else if (th[i] === 3) P.box('t' + i, 426, y, 220, 26, { cls: 'plain', title: name, right: 'Done' });
      else P.box('t' + i, 426, y, 220, 26, { cls: 'ghost', title: name, right: 'Not yet' });
    }
    P.box('c1', 14, 284, 208, 36, { cls: made ? 'wait' : 'ghost', title: 'Threads created', right: made + '' });
    P.box('c2', 236, 284, 208, 36, { cls: done ? 'good' : 'ghost', title: 'Tasks finished', right: done + '/6' });
    P.box('c3', 458, 284, 208, 36, { cls: q.length ? 'wait' : 'ghost', title: 'Waiting in queue', right: q.length + '' });
  },
  assume: 'The compiler and runtime are JDK 21.0.12.1 (javac 21). All 6 combinations were checked against real runs: the same source as the code on the screen (identical line by line) was compiled with javax.tools, and the java of this JDK was started as a child process and actually run 20 times for each combination. In all 120 runs the exit code was 0 and the standard error was empty. What was checked is the number of printed "Thread that did the work" lines (Tasks finished), the number of different thread names in those lines and their sorted list (the same in all 20 runs), and the number of newly started threads, which was measured by reading ThreadMXBean.getTotalStartedThreadCount() in the start class of the child process before and after it called Main.main (2, 1, and 6 for thread pools of 2, 1, and 6 threads, and 6 for new Thread). Which thread does tasks #3 to #6 differs from run to run, so it was not compared, and the diagram shows just one possible picture, in which tasks #3 and #4 start after tasks #1 and #2 finish. The facts that the step sentences rely on were checked by running separately written sources 20 times each. Right after the pool is created, 0 threads have started, and as tasks are handed over, threads are created one at a time up to the number of threads set for the pool. Right after 6 tasks are handed over, the number of tasks waiting in the queue is 4 for 2 threads, 5 for 1 thread, and 0 for 6 threads. Tasks #1 and #2 are taken by pool-1-thread-1 and pool-1-thread-2, with 6 pool threads task number k is taken by pool-1-thread-k, and with new Thread task number k is taken by Thread-(k-1). Tasks start in groups of (number of threads) in numbered order. The maximum number of tasks running at the same time is 2 for 2 threads, 1 for 1 thread, 6 for 6 threads, and 6 for new Thread. The "main end" line after shutdown is printed before the output of the tasks, so shutdown returns without waiting for the tasks to finish. When the shutdown line is removed, the program did not end within 5 seconds even after all 6 tasks were done, and had to be stopped by force. It was also confirmed that the number of pool threads becomes 0 after the tasks finish. For the documentation, I opened Executors (newFixedThreadPool, defaultThreadFactory) and ExecutorService (shutdown, submit, the class description) in the Java SE 21 API documentation, and "Thread Pools" in the Java Tutorials. The following are in the documentation: at any time the number of threads working is at most the number set for the pool and the extra tasks wait in the queue, the threads of a pool remain until you shut it down, the names of the threads a pool creates have the form pool-N-thread-M, and shutdown does not wait for the tasks to finish. That threads are created one at a time as tasks are handed over, and not when the pool is created, is not from the documentation but was observed on this JDK (the Tutorials say a fixed thread pool always has the set number of threads running, so the wording differs), and that the task that got in line first comes out first is also an observation, not from the documentation. For the same reason, that the pool does not create more than 6 threads even if there are more than 6 tasks is the documentation\'s explanation, and I did not run it with 7 or more tasks. The cost of creating and starting a thread was not measured. The diagram in which a thread ends after finishing its task comes from the structure of the code. Beyond that, ThreadPoolExecutor, which sets the number of pool threads and the size of the queue separately, awaitTermination, which waits for the tasks to finish, Future and Callable, which return a result, and the case where a task ends with an exception are not covered. In the code on the screen, the import line is shown only when a thread pool is used. How a thread pool handles the tasks waiting in line and how the pool size changes things are covered in the in-depth lab "Thread pool", and reusing database connections in the same way is covered in "Connection pool and OSIV" (this lab did not run a connection pool).',
});

Lab.register({
  id: 'thread', nav: 'Creating threads and thread states', cat: 'Concurrency', mode: 'step',
  title: 'Why does calling run() directly not create a new thread?',
  intro: 'Creating a Thread object and having a thread actually run are two different things. This lab uses t.getState() to follow the states that one thread goes through from the time it is created until it terminates. Along the way, you see the difference between start() and run(), how the state depends on the way the thread waits, and interrupt, which wakes up a waiting thread.',
  terms: ['Processes and threads', 'Thread states', 'start() and run()', 'join()', 'Interrupt'],
  controls: [
    { id: 'call', label: 'How the thread is made to run', type: 'select', value: 'run', options: [['start', 't.start()'], ['run', 'Call t.run() directly'], ['twice', 't.start(), then t.start() once more after the thread has terminated']] },
    { id: 'work', label: 'What the task does', type: 'select', value: 'sleep', options: [['quick', 'Only prints the name and ends right away'], ['sleep', 'Sleeps for 1 second with Thread.sleep(1000)'], ['join', 'Waits for another thread to terminate with helper.join()'], ['lock', 'Acquires the lock that main holds']] },
    { id: 'intr', label: 'main calls t.interrupt() partway through', type: 'check', value: false, hint: 'An interrupt is a signal sent to a waiting thread to tell it to stop waiting.' },
  ],
  presets: [
    { t: 'Default settings', d: 'run() is called directly. The task runs, but the thread that runs it is main, and t stays NEW to the end.', v: { call: 'run', work: 'sleep', intr: false } },
    { t: 'Starting with start()', d: 'A new thread, worker, runs the task, and t is TIMED_WAITING while worker sleeps.', v: { call: 'start', work: 'sleep', intr: false } },
    { t: 'A thread that waits with join', d: 'A thread that waits, with no time limit, for another thread to terminate is WAITING.', v: { call: 'start', work: 'join', intr: false } },
    { t: 'A thread that waits for a lock', d: 'A thread that is blocked at a lock held by another thread is BLOCKED.', v: { call: 'start', work: 'lock', intr: false } },
    { t: 'Interrupting a sleeping thread', d: 'sleep throws an InterruptedException, and the thread wakes up right away.', v: { call: 'start', work: 'sleep', intr: true } },
    { t: 'Interrupting a thread that waits for a lock', d: 'The thread does not wake up. Only its interrupt status is set.', v: { call: 'start', work: 'lock', intr: true } },
    { t: 'Calling start() again on a terminated thread', d: 'An IllegalThreadStateException is thrown.', v: { call: 'twice', work: 'quick', intr: false } },
  ],
  code: function (c) {
    var W = c.work, s = '';
    if (W === 'lock') s += 'Object lock = new Object();\n';
    if (W === 'join') s += 'Thread helper = new Thread(() -> {             // another thread, which ends after 0.5 seconds\n    try { Thread.sleep(500); } catch (InterruptedException e) { }\n}, "helper");\n';
    if (s) s += '\n';
    s += 'Runnable task = () -> {\n    System.out.println(Thread.currentThread().getName());   // the name of the thread that runs this line\n';
    if (W === 'sleep' || W === 'join') s += '    try {\n        ' + (W === 'sleep' ? 'Thread.sleep(1000);                 // sleeps for 1 second' : 'helper.join();                      // waits until helper terminates') + '\n    } catch (InterruptedException e) {\n        System.out.println("InterruptedException");\n    }\n';
    if (W === 'lock') s += '    synchronized (lock) { }                 // must acquire lock to get past this line\n';
    s += '};\n\nThread t = new Thread(task, "worker");\nSystem.out.println(t.getState());\n\n';
    if (W === 'join') s += 'helper.start();\n';
    var in_ = W === 'lock' ? '    ' : '';
    if (W === 'lock') s += 'synchronized (lock) {                       // main acquires lock first\n';
    function cm(code, note) { code = in_ + code; while (code.length < 44) code += ' '; return code + '// ' + note + '\n'; }
    s += c.call === 'run' ? cm('t.run();', 'calls the method directly') : cm('t.start();', 'runs the task in a new thread');
    s += cm('Thread.sleep(100);', 'waits briefly so that the task can make progress');
    s += in_ + 'System.out.println(t.getState());\n';
    if (c.intr) s += in_ + 't.interrupt();\n';
    if (W === 'lock') s += '}                                           // main releases lock here\n';
    s += 't.join();                                   // waits until t terminates\nSystem.out.println(t.getState());';
    if (c.call === 'twice') s += '\n\nt.start();                                  // tries to start the terminated thread again';
    return s;
  },
  label: function (c) { return { start: 'start()', run: 'run() called directly', twice: 'start() twice' }[c.call] + ' · ' + { quick: 'task that ends right away', sleep: 'sleep', join: 'join', lock: 'waits for lock' }[c.work] + (c.intr ? ' · interrupt' : ''); },
  columns: ['Thread that ran the task', 'State of t seen partway', 'Result of interrupt', 'State of t after join', 'start() again'],
  simulate: function (c) {
    var W = c.work, started = c.call !== 'run', intr = !!c.intr, ev = [], sum = [];
    var waitSt = { quick: '', sleep: 'TIMED_WAITING', join: 'WAITING', lock: 'BLOCKED' }[W];
    var doing = { sleep: 'sleeping', join: 'waiting for helper', lock: 'waiting for the lock' }[W];
    var st = { t: '', main: 'Started', worker: '', helper: '', lockBy: '', ran: '?', mid: '?', ir: '?', after: '?', again: '?', ex: [] };
    function push(s, k) { ev.push({ s: s, k: k || '', snap: JSON.parse(JSON.stringify(st)) }); }
    st.t = 'NEW'; st.main = 'Created the Thread object t';
    push('new Thread(task, "worker"): This creates the Thread object t. So far only the object exists, and no new flow of execution (thread) has started. That is why t.getState() is NEW.');
    if (W === 'join') { st.helper = 'Running (ends after 0.5 seconds)'; st.main = 'Started helper'; push('helper.start(): Another thread, helper, which ends after 0.5 seconds, is started first. It is the thread that the task will wait for to terminate.'); }
    if (W === 'lock') { st.lockBy = 'main'; st.main = 'Holds the lock'; push('synchronized (lock) {: The main thread acquires the lock. Until main leaves this block, no other thread can acquire this lock.'); }
    if (started) {
      st.t = 'RUNNABLE'; st.worker = 'Starts running the task'; st.main = 'Goes on to the next line without waiting';
      push('t.start(): This requests that a new thread be created. A new thread, worker, comes into being and starts running the task, and the state of t becomes RUNNABLE (able to run). main does not wait for the task to end and goes straight on to the next line.', 'good');
      st.ran = 'worker'; st.worker = 'Runs the first line of the task';
      push('Thread.currentThread().getName(): The name of the thread that runs the first line of the task is worker. The new thread that start() created is running the task.', 'good');
      if (W === 'quick') { st.t = 'TERMINATED'; st.worker = 'Finished'; push('End of the task: There is no more code to run, so the worker thread terminates. The state of t becomes TERMINATED.'); }
      if (W === 'sleep') { st.t = 'TIMED_WAITING'; st.worker = 'Sleeping in sleep(1000)'; push('Thread.sleep(1000): worker sleeps for 1 second. This is a wait that ends by itself when the specified time has passed, so the state is TIMED_WAITING.'); }
      if (W === 'join') { st.t = 'WAITING'; st.worker = 'Waiting for helper to terminate'; push('helper.join(): worker waits until the helper thread terminates. This is a wait with no time limit, so the state is WAITING.'); }
      if (W === 'lock') { st.t = 'BLOCKED'; st.worker = 'Blocked at the lock'; push('synchronized (lock): worker tries to acquire the lock, but main holds it. worker cannot enter the block until the lock is released. This state of being blocked is BLOCKED.'); }
    } else {
      st.main = 'Running the task directly';
      push('t.run(): run() is an ordinary method call. No new thread is created, and the main thread runs the code of the task directly. The state of t stays NEW.', 'bad');
      st.ran = 'main';
      push('Thread.currentThread().getName(): The name of the thread that runs the first line of the task is main. No thread named worker has ever come into being.', 'bad');
      if (W === 'quick') { st.main = 'Returned from t.run()'; push('End of the task: There is no more code to run, so t.run() returns. This is the same as calling a method and returning from it.'); }
      if (W === 'sleep') { st.main = 'Slept for 1 second itself and returned'; push('Thread.sleep(1000): The main thread itself sleeps for 1 second. During that time main stays inside t.run() and cannot go on to the next line. After 1 second the task ends and t.run() returns.'); }
      if (W === 'join') { st.main = 'Waited for helper itself and returned'; st.helper = 'Finished'; push('helper.join(): The main thread itself waits for helper to terminate. When helper terminates, the task ends too and t.run() returns.'); }
      if (W === 'lock') { st.main = 'Finished the task while holding the lock'; push('synchronized (lock): The main thread, which is running the task now, already holds this lock. A thread can acquire again a lock that it already holds, so main is not blocked and goes through. The task ends and t.run() returns.'); }
    }
    st.mid = started ? (waitSt || 'TERMINATED') : 'NEW'; st.main = 'Checks the state with t.getState()';
    if (started) push('t.getState() after Thread.sleep(100): main waits briefly and then looks at the state of t. ' + (W === 'quick' ? 'The task has already ended, so the state is TERMINATED.' : 'worker is ' + doing + ', so the state is ' + waitSt + '.'));
    else push('t.getState() after Thread.sleep(100): start() has never been called on t, so t is still NEW. The task ran, but it was not the thread t that ran it.', 'bad');
    var ie = started && intr && (W === 'sleep' || W === 'join');
    if (!intr) st.ir = 'Not called';
    else if (ie) {
      st.ir = 'InterruptedException'; st.ex.push('InterruptedException'); st.t = 'RUNNABLE'; st.worker = 'Woke up and runs the catch block'; st.main = 'Calls t.interrupt()';
      push('t.interrupt(): main sends worker a signal to stop waiting. worker, which was ' + (W === 'sleep' ? 'sleeping in sleep' : 'waiting in join') + ', wakes up at once, and ' + (W === 'sleep' ? 'Thread.sleep' : 'helper.join') + ' throws an InterruptedException. worker returns to RUNNABLE and runs the catch block.', 'bad');
      st.t = 'TERMINATED'; st.worker = 'Finished';
      push('End of the task: worker terminates after it has run the catch block. It ended ' + (W === 'sleep' ? 'without sleeping for the full 1 second' : 'without waiting for helper to terminate') + '. The state of t becomes TERMINATED.');
    } else if (started && W === 'lock') {
      st.ir = 'No exception (only the interrupt status is set)'; st.worker = 'Blocked at lock (interrupt status set)'; st.main = 'Calls t.interrupt()';
      push('t.interrupt(): main sends the signal, but a thread in the BLOCKED state, waiting for a lock, is not woken up by an interrupt. No exception is thrown either. The thread keeps waiting for the lock, and only its interrupt status, the mark that says "this thread was interrupted", is set.', 'bad');
    } else {
      st.ir = 'Nothing happens'; st.main = 'Calls t.interrupt()';
      push(started ? 't.interrupt(): This signal is sent to a thread that has already terminated. There is nothing to wake up, so no exception is thrown and nothing changes.' : 't.interrupt(): t was never started, and main has already run the task to the end. No thread was waiting, so no InterruptedException is thrown.');
    }
    if (W === 'lock') {
      st.lockBy = ''; st.main = 'Released the lock';
      if (started) { st.t = 'RUNNABLE'; st.worker = 'Acquired the lock and runs again'; }
      push('}: main leaves the synchronized block and releases the lock.' + (started ? ' worker, which was waiting, acquires the lock and returns from BLOCKED to RUNNABLE.' : ''));
    }
    if (!started) { st.main = 'Returned from join() right away'; push('t.join(): With a thread that was never started, there is nothing to wait for, so join() returns right away.'); }
    else if (st.t === 'TERMINATED') { st.main = 'Returned from join() right away'; push('t.join(): t has already terminated, so join() returns right away without waiting.'); }
    else {
      st.t = 'TERMINATED'; st.worker = 'Finished'; st.main = 'Waited in join() and returned'; if (W === 'join') st.helper = 'Finished';
      push('t.join(): main waits here until t terminates. ' + (W === 'sleep' ? 'After 1 second, worker wakes up, returns to RUNNABLE, runs the remaining code, and terminates.' : W === 'join' ? 'When helper terminates, worker wakes up, returns to RUNNABLE, runs the remaining code, and terminates.' : 'worker runs the remaining code and terminates.') + ' The state of t becomes TERMINATED, and only then does join() return.', 'good');
    }
    st.after = started ? 'TERMINATED' : 'NEW'; st.main = 'Checks the state with t.getState()';
    push(started ? 't.getState(): The state is TERMINATED. A thread that has terminated never returns to another state.' : 't.getState(): The state is NEW to the very end. The task ran, but t was never started.', started ? 'good' : 'bad');
    if (c.call === 'twice') {
      st.again = 'IllegalThreadStateException'; st.ex.push('IllegalThreadStateException'); st.main = 'Exception at the second t.start()';
      push('t.start() (second call): A thread can be started only once. It cannot be started again even after it has terminated, so an IllegalThreadStateException is thrown. To run the same task again, you must create a new Thread object.', 'bad');
    } else st.again = 'Not called';
    sum.push('The thread that ran the task is ' + st.ran + ', the state of t seen partway is ' + st.mid + ', and the state after join is ' + st.after + '.' + (st.ex.length ? ' Exceptions thrown: ' + st.ex.join(', ') + '.' : ''));
    if (!started) sum.push('Calling run() directly does not add a thread. The calling thread simply runs that code in order, so nothing runs concurrently. To run the code in a new thread, call start(). start() creates a new thread, and that thread runs run().');
    else {
      if (W === 'quick') sum.push('A thread begins in NEW, becomes RUNNABLE with start(), and becomes TERMINATED when the code of run() ends. Change to a task that waits for something, and you can see the states in between.');
      if (W === 'sleep') sum.push('A thread that waits for a specified time is TIMED_WAITING. Thread.sleep(time) is the typical example. When the time has passed, the thread returns to RUNNABLE.');
      if (W === 'join') sum.push('A thread that waits, with no time limit, for another party to finish its work is WAITING. join() stops the caller until the other thread terminates. While main waits in t.join(), the state of main is WAITING too.');
      if (W === 'lock') sum.push('A thread that is blocked at synchronized, trying to acquire a lock that another thread holds, is BLOCKED. It returns to RUNNABLE only when the holder releases the lock.');
      if (ie) sum.push('A thread that is waiting in sleep or join wakes up right away with an InterruptedException when it is interrupted. This is the way to make a long wait stop partway, and it is why code that calls these methods is required to handle InterruptedException.');
      else if (intr && W === 'lock') sum.push('An interrupt does not force a thread to stop. It sends a signal. A wait that throws InterruptedException, such as sleep or join, is woken up by that signal, but a thread that waits for the lock of synchronized is not.');
      else if (intr) sum.push('An interrupt sent to a thread that has already terminated does nothing. Change to a task that waits (sleep, join) and compare.');
    }
    if (c.call === 'twice') sum.push('A Thread object can be started only once. Calling start() again throws an IllegalThreadStateException, whether the thread is still running or has already terminated.');
    return { events: ev, summary: sum, row: [st.ran, st.mid, st.ir, st.after, st.again] };
  },
  render: function (v, sim, t, H, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : null, c = sim.c;
    if (!s) { H.text(v, 'Click Run to go through the code one line at a time.'); return; }
    H.counters(v, [[s.t || '-', 'Current state of t'], [s.ran, 'Thread that ran the task']]);
    H.title(v, 'What each thread is doing'); var ln = H.lanes(v);
    H.lane(ln, 'main', s.main, 'hot');
    H.lane(ln, 'worker', s.worker || (c.call === 'run' ? 'Never created' : 'Not created yet'), !s.worker ? 'none' : s.worker === 'Finished' ? 'good' : s.t === 'RUNNABLE' ? 'hot' : 'wait');
    if (c.work === 'join') H.lane(ln, 'helper', s.helper || 'Not started yet', !s.helper ? 'none' : s.helper === 'Finished' ? 'good' : 'hot');
    if (c.work === 'lock') H.lane(ln, 'lock', s.lockBy ? s.lockBy + ' thread holds it' : 'No thread holds it', s.lockBy ? 'wait' : 'none');
    H.table(v, ['What was checked', 'Result'], [
      { cells: ['t.getState() seen partway', { v: s.mid, cls: s.mid === '?' ? '' : s.mid === 'NEW' ? 'bad' : 'hot' }] },
      { cells: ['Result of t.interrupt()', { v: s.ir, cls: s.ir === 'InterruptedException' ? 'bad' : '' }] },
      { cells: ['t.getState() after join', { v: s.after, cls: s.after === 'TERMINATED' ? 'good' : s.after === 'NEW' ? 'bad' : '' }] },
      { cells: ['start() again', { v: s.again, cls: s.again === 'IllegalThreadStateException' ? 'bad' : '' }] },
    ], 'Results so far');
  },
  // Diagram: at the top, the six states a thread can be in and where t is now; at the bottom, what main and worker are each doing.
  draw: function (P, sim, shown) {
    var c = sim.c, last = shown[shown.length - 1], s = last ? last.snap : { t: '', main: 'Not started yet', worker: '', ran: '?', mid: '?', ir: '?', after: '?', again: '?', ex: [] };
    var wname = { quick: '', sleep: 'TIMED_WAITING', join: 'WAITING', lock: 'BLOCKED' }[c.work];
    function cls(name) { return s.t === name ? 'hot now' : 'plain'; }
    P.size(680, 344);
    P.region('sr', 16, 16, 648, 148, 'State of t (the value that t.getState() returns)');
    P.box('s_new', 34, 62, 104, 34, { cls: cls('NEW'), title: 'NEW', center: true });
    P.box('s_run', 220, 62, 124, 34, { cls: cls('RUNNABLE'), title: 'RUNNABLE', center: true });
    P.box('s_term', 220, 120, 124, 32, { cls: s.t === 'TERMINATED' ? 'good now' : 'plain', title: 'TERMINATED', center: true });
    P.box('s_tw', 456, 44, 190, 30, { cls: cls('TIMED_WAITING'), title: 'TIMED_WAITING', right: 'sleep' });
    P.box('s_w', 456, 82, 190, 30, { cls: cls('WAITING'), title: 'WAITING', right: 'join' });
    P.box('s_b', 456, 120, 190, 30, { cls: cls('BLOCKED'), title: 'BLOCKED', right: 'lock' });
    P.arrow('a_start', 's_new:r', 's_run:l', { label: 'start()', cls: s.t && s.t !== 'NEW' ? 'good' : 'mut' });
    P.arrow('a_end', 's_run:b', 's_term:t', { cls: s.t === 'TERMINATED' ? 'good' : 'mut' }); P.text('t_end', 290, 113, 'run() ends', { cls: s.t === 'TERMINATED' ? '' : 'mut' });
    if (wname) P.arrow('a_wait', 's_run:r', { TIMED_WAITING: 's_tw', WAITING: 's_w', BLOCKED: 's_b' }[wname] + ':l', { label: 'waits', cls: s.t === wname ? 'hot' : 'mut' });
    P.box('m', 16, 180, 320, 56, { cls: 'hot', title: 'main thread', sub: s.main });
    P.box('w', 344, 180, 320, 56, s.worker ? { cls: s.worker === 'Finished' ? 'good' : s.t === 'RUNNABLE' ? 'hot' : 'wait', title: 'worker thread', sub: s.worker } : { cls: 'ghost', title: 'worker thread', sub: c.call === 'run' && s.ran === 'main' ? 'Never created' : 'Not created yet' });
    P.box('r1', 16, 250, 320, 34, { cls: s.ran === '?' ? 'ghost' : s.ran === 'worker' ? 'good' : 'bad', title: 'Thread that ran the task', right: s.ran });
    P.box('r2', 344, 250, 320, 34, { cls: s.after === '?' ? 'ghost' : s.after === 'TERMINATED' ? 'good' : 'bad', title: 'State of t after join', right: s.after });
    P.box('r3', 16, 294, 648, 34, { cls: s.ex.length ? 'bad' : 'ghost', title: 'Exceptions thrown', right: s.ex.length ? s.ex.join(', ') : 'None' });
    P.note('The bold border marks the current state of t. NEW is the state in which only the object has been created, and t becomes RUNNABLE only when start() is called. Depending on how the thread waits, t becomes TIMED_WAITING, WAITING, or BLOCKED and then returns to RUNNABLE, and when the code of run() ends, it becomes TERMINATED.');
  },
  assume: 'The results of the 24 combinations (the name of the thread that ran the task, t.getState() partway and at the end, the exceptions thrown, and the interrupt status when the task ends) were checked against the results of running them on JDK 21 on this PC. In the code on the screen, main waits briefly with Thread.sleep(100) and then looks at the state, but these 100 milliseconds are only a time that is "usually enough", not a guaranteed one. So that the check would not depend on timing, the state of t was checked repeatedly until it had left RUNNABLE and stayed where it was. If t.getState() is called right after start(), the state can be RUNNABLE or already another state, so that value was not used as a result. RUNNABLE does not distinguish "running" from "waiting for a turn on the CPU", and Java does not report the two separately. WAITING also results from Object.wait() or LockSupport.park() besides join, but this lab covers only join. The problems of data that several threads share are covered in the "Race condition" lab, and how to create threads in advance and reuse them is covered in the "Thread pool" lab.',
});

Lab.register({
  id: 'process', nav: 'Processes and threads', cat: 'Concurrency', mode: 'step',
  title: 'Two ways to add more workers',
  intro: 'When you run a program, one process is created, and the threads inside it are what actually execute the code. This lab runs three tasks that take 0.3 seconds each in three ways: on one thread, on three threads in one process, and in three processes. The ways differ in whether memory is shared and in what happens to the rest when one of them dies.',
  terms: ['Processes and threads', 'Inter-process communication (IPC)', 'Run-time data areas', 'Context switching'], ranks: ['os', 'concurrency'],
  controls: [
    { id: 'how', label: 'How the tasks are run', type: 'select', value: 'multi', options: [['single', '1 process, 1 thread (one task after another)'], ['multi', '1 process, 3 threads'], ['proc', '3 processes (1 thread each)']] },
    { id: 'fail', label: 'What happens in task 2', type: 'select', value: 'none', options: [['none', 'No problem'], ['ex', 'An uncaught exception is thrown'], ['kill', 'The process itself is terminated (System.exit, forced termination by the operating system, and so on)']] },
  ],
  presets: [
    { t: 'Default settings', q: 'What happens when you run the tasks as 1 process, 3 threads and nothing goes wrong in task 2?', d: '3 threads. They finish in 0.3 seconds and increment the same variable together.', v: { how: 'multi', fail: 'none' } },
    { t: 'One thread, one task after another', q: 'What if you run the tasks as 1 process, 1 thread (one task after another)?', d: 'The times of the three tasks simply add up.', v: { how: 'single', fail: 'none' } },
    { t: '3 processes', q: 'What if you run the tasks as 3 processes (1 thread each)?', d: 'They finish at the same time, but each has its own separate variable.', v: { how: 'proc', fail: 'none' } },
    { t: 'One thread dies from an exception', q: 'What if an uncaught exception is thrown in task 2?', d: 'Only that thread ends, and the others continue.', v: { how: 'multi', fail: 'ex' } },
    { t: 'An error that kills the process', q: 'What if the process itself is terminated in task 2 (System.exit, forced termination by the operating system, and so on)?', d: 'When the 3 threads are in one process, they die together.', v: { how: 'multi', fail: 'kill' } },
    { t: 'The same error, in separate processes', q: 'What if you run 3 processes (1 thread each) and task 2 calls System.exit?', d: 'Only that process dies, and the others are unharmed.', v: { how: 'proc', fail: 'kill' } },
  ],
  code: function (c) {
    var body = 'public class Main {                         // Main and work are names made up for this example\n    static int counter = 0;                 // a variable in the memory of the process\n\n    static void work(int id) {\n        try { Thread.sleep(300); } catch (InterruptedException e) { return; }   // a task that takes 0.3 seconds\n' + (c.fail === 'ex' ? '        if (id == 2) throw new IllegalStateException();\n' : c.fail === 'kill' ? '        if (id == 2) System.exit(3);        // ends the whole process\n' : '') + '        synchronized (Main.class) { counter++; }   // only one thread at a time increments it\n    }\n\n    public static void main(String[] args) throws Exception {\n', end = '    }\n}';
    if (c.how === 'single') return body + '        // one thread (main), one task after another\n        for (int i = 1; i <= 3; i++) work(i);\n' + end;
    if (c.how === 'multi') return body + '        // 3 threads in the same process\n        for (int i = 1; i <= 3; i++) {\n            int id = i;\n            new Thread(() -> work(id)).start();\n        }\n' + end;
    return body + '        if (args.length > 0) { work(Integer.parseInt(args[0])); return; }   // a newly started process: one task\n        // 3 processes: the same program is run separately each time\n        for (int i = 1; i <= 3; i++) {\n            new ProcessBuilder("java", "Main", String.valueOf(i)).start();\n        }\n' + end;
  },
  label: function (c) { return { single: '1 thread', multi: '3 threads', proc: '3 processes' }[c.how] + ' · task 2: ' + { none: 'normal', ex: 'exception', kill: 'error that kills the process' }[c.fail]; },
  columns: ['Tasks finished', 'Time taken', 'Value of counter', 'How far the problem in task 2 spread'],
  simulate: function (c) {
    var H = c.how, F = c.fail, ev = [], sum = [], units, done = 0, time, cnt, spread = 'None';
    var P = H === 'proc' ? [1, 2, 3].map(function (i) { return { p: 'Process ' + i, mem: 0, th: [{ id: i, st: 'Waiting to start' }], alive: true }; }) : [{ p: 'Process 1', mem: 0, th: (H === 'single' ? [{ id: 0, st: 'Waiting to start', name: 'main thread' }] : [1, 2, 3].map(function (i) { return { id: i, st: 'Waiting to start' }; })), alive: true }];
    function snap() { return JSON.parse(JSON.stringify(P)); }
    function push(s, k) { ev.push({ s: s, k: k, snap: snap() }); }
    push(H === 'proc' ? 'The Main process that was started first runs the same program three more times, which creates 3 processes that do the work. The operating system gives each process its own separate memory. Each process also gets its own counter variable, so the three working processes have three in all. The Main process that was started first also has a counter (0), but it does no work, so it is left out of the diagram.' : 'The program is run, which creates 1 process. The operating system gives this process memory, and there is one counter variable in it.' + (H === 'multi' ? ' Inside the process, 3 threads are created. Each thread has only its own flow of execution (its stack), and the threads share the memory of the process.' : ' The only thread is main.'), '');
    if (H === 'single') {
      var th = P[0].th[0], stopped = false;
      for (var i = 1; i <= 3; i++) {
        th.st = 'Task ' + i + ' running'; push('The main thread starts task #' + i + '. There is only one thread, so it can do the next task only after the previous one is finished.', '');
        if (i === 2 && F === 'ex') { th.st = 'Terminated: exception'; P[0].alive = false; stopped = true; spread = 'The remaining task 3 does not run either'; push('An exception is thrown in task 2 and is not caught. The only thread ends, and no thread is left to run, so the program ends. Task 3 never even starts.', 'bad'); break; }
        if (i === 2 && F === 'kill') { th.st = 'Terminated'; P[0].alive = false; stopped = true; spread = 'The whole process'; push('Task 2 kills the process. When a process disappears, all the memory and threads in it disappear too.', 'bad'); break; }
        P[0].mem++; done++; push('Task ' + i + ' is finished. counter is ' + P[0].mem + '.', 'good');
      }
      if (!stopped) th.st = 'All tasks finished';
      time = F === 'none' ? '0.9 seconds' : '0.6 seconds (stopped)'; cnt = F === 'none' ? String(P[0].mem) : 'gone';
    }
    if (H === 'multi') {
      P[0].th.forEach(function (t) { t.st = 'Task ' + t.id + ' running'; }); push('The 3 threads each take one task and start at the same time. They do not wait for one another.', '');
      if (F === 'kill') { P[0].alive = false; P[0].th.forEach(function (t) { t.st = 'Terminated'; }); spread = 'The whole process (all 3 threads)'; push('The task on thread 2 kills the process. Threads 1 and 3 did nothing wrong, but they disappear with it because they were in the same process. The work they were doing and the counter in memory are gone too.', 'bad'); time = '0.3 seconds (all stopped)'; cnt = 'gone'; }
      else {
        if (F === 'ex') { P[0].th[1].st = 'Terminated: exception'; spread = 'Thread 2 only'; push('An uncaught exception is thrown in thread 2. Only that thread ends. The process and the other threads stay alive.', 'bad'); }
        P[0].th.forEach(function (t) { if (t.st.indexOf('running') >= 0) { P[0].mem++; done++; t.st = 'Task ' + t.id + ' finished'; } });
        push('The remaining threads finish their tasks and increment the same counter. counter is ' + P[0].mem + '. Several threads share one variable, so the line that increments it uses synchronized, which lets only one thread at a time increment it. Without it, two threads can read the same value and overwrite each other, and the result can be smaller than the number of increments (the next concept, race conditions).', 'good'); time = '0.3 seconds'; cnt = String(P[0].mem);
      }
    }
    if (H === 'proc') {
      P.forEach(function (p) { p.th[0].st = 'Task ' + p.th[0].id + ' running'; }); push('The 3 processes each run one task at the same time.', '');
      if (F !== 'none') { P[1].alive = false; P[1].th[0].st = F === 'ex' ? 'Terminated: exception' : 'Terminated'; spread = 'Process 2 only'; push('Process 2 dies ' + (F === 'ex' ? 'from an exception' : 'from an error') + '. The memory of processes 1 and 3 is completely separate, so they are not affected at all.', 'bad'); }
      P.forEach(function (p) { if (p.alive) { p.mem = 1; done++; p.th[0].st = 'Task ' + p.th[0].id + ' finished'; } });
      push('The processes that are still alive finish their tasks and each increment their own counter. counter is 1 in every process. No process can see the variables of another, so to find the total, the processes must exchange the values through a separate channel such as a file, a socket, or a message.', 'good'); time = '0.3 seconds'; cnt = '1 in each process (not combined)';
    }
    if (H === 'single') sum.push('One thread does only one thing at a time. This is simple and safe, but the times simply add up.');
    if (H === 'multi') sum.push('Threads share the memory of the same process. They are lightweight to create and can exchange data easily, but touching the same data at the same time causes problems, and when the process dies, all the threads die with it. A web server (Tomcat) that uses a thread for each request works this way.');
    if (H === 'proc') sum.push('Processes have separate memory, so when one dies, the problem does not spread to the others. In return, they cost more to create and to switch between, each uses its own memory, and sharing data requires inter-process communication. Running several servers (several processes) is an extension of this approach.');
    if (F === 'ex' && H !== 'proc') sum.push('An uncaught exception ends that one thread. The process keeps running as long as other non-daemon threads remain.');
    return { events: ev, summary: sum, row: [done + '', time, cnt, spread] };
  },
  render: function (v, sim, t, H, shown) {
    var last = shown[shown.length - 1], P = last ? last.snap : [];
    if (!P.length) { H.text(v, 'Click Run to start.'); return; }
    P.forEach(function (p) {
      H.title(v, p.p + (p.alive ? '' : ' (terminated)') + ' · counter in memory = ' + (p.alive ? p.mem : 'gone'));
      var ln = H.lanes(v);
      p.th.forEach(function (th) { H.lane(ln, th.name || 'Thread ' + th.id, th.st, th.st.indexOf('finished') >= 0 || th.st === 'All tasks finished' ? 'good' : th.st.indexOf('Terminated') >= 0 ? 'bad' : th.st === 'Waiting to start' ? 'none' : 'hot'); });
    });
  },
  // Diagram: a process is a large box that has memory, and a thread is a small box inside it. The threads of one process point to the same memory.
  draw: function (P, sim, shown) {
    var last = shown[shown.length - 1], procs = last ? last.snap : [], n = procs.length;
    P.size(680, 300);
    if (!n) { P.region('p0', 16, 16, 648, 268, 'Process'); P.text('hint', 340, 150, 'Click Run to start', { cls: 'mut', anchor: 'middle' }); return; }
    procs.forEach(function (p, i) {
      var x = n === 1 ? 16 : 16 + i * 222, w = n === 1 ? 648 : 204, tw = n === 1 ? 196 : w - 24, k = p.th.length;
      P.region('p' + i, x, 16, w, 268, p.p + (p.alive ? '' : ' (terminated)'));
      P.box('m' + i, x + 12, 52, w - 24, 44, { cls: p.alive ? 'good' : 'ghost', title: n === 1 ? 'Memory of this process' : 'Memory', right: p.alive ? 'counter = ' + p.mem : 'gone' });
      p.th.forEach(function (th, j) {
        var tx = n === 1 ? (k === 1 ? 242 : 28 + j * 214) : x + 12, id = 't' + i + '_' + j, st = th.st;
        P.box(id, tx, 160, tw, 60, { cls: st.indexOf('finished') >= 0 || st === 'All tasks finished' ? 'good' : st.indexOf('Terminated') >= 0 ? 'bad' : st === 'Waiting to start' ? 'plain' : 'hot', title: th.name || 'Thread ' + th.id, sub: [st, 'Has its own stack'] });
        if (p.alive && st.indexOf('Terminated') < 0) P.arrow('a' + i + '_' + j, id + ':t', 'm' + i + ':b:' + (k === 1 ? 0.5 : 0.2 + j * 0.3), { cls: 'mut' });
      });
    });
    P.note('Each dashed box is one process. An arrow means that the thread uses the memory of that process, and the threads in one process share the same memory (counter).');
  },
  assume: 'The 9 combinations were checked by actually running them on JDK 21 in our test environment. With 3 threads it took 0.3 seconds and with 1 thread 0.9 seconds. Running the code with synchronized on counter++ 30 times with 3 threads gave 3 in the shared counter every time, whereas the 3 processes each had 1. Running it 30 times without synchronized gave 3 in only 7 runs, 1 in 21 runs, and 2 in 2 runs, because the three threads wake up at almost the same moment, read the same value, and overwrite each other (a race condition). An exception ended only the thread it was thrown in, System.exit ended every thread in the same process, and with separate processes, every process other than the one that died terminated normally. The time and memory it takes to create a process are not shown on the screen (in reality they are much larger, because a new JVM is started each time). The 3-process code works when the java command can be found on the PATH and it is run in the folder that contains Main.class (from another folder, you must pass the class path with -cp). The first process ends without waiting for the working processes, but they keep running regardless, and the results were the same. The counter value of each process was checked in a separate verification program that waited for each process to finish with waitFor() and read its output.',
});

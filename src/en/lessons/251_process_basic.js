Lab.register({
  id: 'process_basic', nav: 'Processes', cat: 'Fundamentals', mode: 'step', basic: true, deep: ['process', 'container'],
  title: 'What is a process, and what is separate when you run a program twice?',
  intro: 'Counter.class, made by compiling a program, is a file stored on disk. When you run this file with the command java Counter, something that is running comes into being. That is a process. The operating system gives each process a number (PID) and gives it memory that only that process uses. In the code, static int count is a variable in that memory, and add() raises count by 3 and then prints the PID of this process and count. The flow that runs code inside a process is called a thread. In this lab you run the same Counter.class in two terminals, run it again after it ends, or run it once and let threads inside it run add one after another. You see how many processes are created and what count each one saw. (A program such as a web server is also one process when you run it with the java command. static is not covered in this lab.)',
  terms: ['Programs and processes', 'PID (process ID)', 'Memory space of a process', 'Processes and threads'],
  controls: [
    { id: 'how', label: 'How to run java Counter', type: 'select', value: 'procs', options: [['procs', 'Run it separately in several terminals, before the earlier run ends'], ['rerun', 'Run it, then run it again in the same terminal after it ends'], ['threads', 'Run it once, and threads inside it run add one after another']] },
    { id: 'n', label: 'Number of runs (number of threads, for threads)', type: 'select', value: '2', options: [['2', '2'], ['3', '3']] },
  ],
  // q is the question shown on the question-style screen. t and d are the name and the description used in the text-only reading
  presets: [
    { t: 'Default settings', q: 'What does Counter look like, and what happens when you run java Counter in terminal 1 and terminal 2?', d: 'Running the same file twice creates two processes, and count is 3 in each.', v: { how: 'procs', n: '2' } },
    { t: 'Two threads run add', q: 'What if you run java Counter only once, and the threads t1 and t2 inside it run add one after another?', d: 'There is one process, and the threads keep raising the same count.', v: { how: 'threads', n: '2' } },
    { t: 'Running it again after it ends', q: 'What if you run java Counter again in the same terminal after the first java Counter ends?', d: 'The count raised before is not kept, and the count of the new process is 3 again.', v: { how: 'rerun', n: '2' } },
    { t: 'Running it in 3 terminals', q: 'What if you run java Counter in terminals 1, 2, and 3?', d: 'Three processes are created, and count is 3 in the separate memory of each.', v: { how: 'procs', n: '3' } },
    { t: 'With 3 threads', q: 'What if you run java Counter only once, and the threads t1, t2, and t3 inside it run add one after another?', d: 'There is still one process, and count goes on as 3, 6, 9.', v: { how: 'threads', n: '3' } },
  ],
  pids: [4120, 7352, 9081],
  code: function (c) {
    var n = +c.n, o = ['# Counter.java', 'public class Counter {', '    // A variable in the memory of this process', '    static int count = 0;', '',
      '    // Raise count by 3, and print the PID of this process and count', '    static void add() {', '        count++;', '        count++;', '        count++;',
      '        System.out.println("PID " + ProcessHandle.current().pid()', '                + " count " + count);', '    }', '', '    public static void main(String[] args) throws Exception {'];
    if (c.how === 'threads') {
      for (var j = 1; j <= n; j++) {
        if (j === 1) o.push('        // Thread: a flow that runs add (Counter::add) inside this process');
        o.push('        Thread t' + j + ' = new Thread(Counter::add);', '        t' + j + '.start();');
        if (j === 1) o.push('        // Wait until it ends. The threads run one after another');
        o.push('        t' + j + '.join();');
      }
    } else o.push('        add();');
    o.push('        // Keep the run going for 2 seconds', '        Thread.sleep(2000);', '    }', '}', '', '# Terminal', '# Compile: the file Counter.class is created', 'javac Counter.java');
    if (c.how === 'threads') o.push('# Run it', 'java Counter');
    else if (c.how === 'rerun') {
      o.push('# Run it', 'java Counter');
      for (var i = 2; i <= n; i++) o.push('# After the earlier run ends, run it again in the same terminal', 'java Counter');
    } else {
      o.push('# Run it in terminal 1', 'java Counter');
      for (var k = 2; k <= n; k++) o.push('# In terminal ' + k + ', run it before the earlier run ends', 'java Counter');
    }
    return o.join('\n');
  },
  label: function (c) { return { procs: 'Run separately in ' + c.n + ' terminals', rerun: 'Run again after it ends, ' + c.n + ' runs in all', threads: 'Run once, ' + c.n + ' threads' }[c.how]; },
  columns: ['Processes', 'count each one saw', 'Shares memory', 'Processes alive at the same time'],
  simulate: function (c) {
    var n = +c.n, how = c.how, ev = [], sum = [], P = this.pids;
    var st = { hot: '', phase: '', procs: [], made: 0, alive: 0, out: [] };
    function push(s, k) { ev.push({ s: s, k: k, snap: JSON.parse(JSON.stringify(st)) }); }
    function born(i, thr) { st.procs.push({ pid: P[i], count: 0, alive: true, thr: thr }); st.made++; st.alive++; st.hot = 'p' + i; st.phase = 'new'; }
    function addTo(i) { st.procs[i].count += 3; st.out.push('PID ' + st.procs[i].pid + ' count ' + st.procs[i].count); st.hot = 'p' + i; st.phase = 'run'; }
    function endAll() { st.procs.forEach(function (p) { p.alive = false; }); st.alive = 0; st.hot = ''; st.phase = 'end'; }
    var main1 = '1 main thread';
    var seen = [], counts = [];

    st.hot = 'fl';
    push('In the terminal, the command javac Counter.java makes javac read Counter.java and create the file Counter.class. This file is only a file stored on disk, and nothing is running now. A running program is called a process, and a process comes into being only when this file is run.', '');

    if (how === 'procs') {
      for (var i = 0; i < n; i++) {
        born(i, main1);
        push(i === 0 ? 'In terminal 1, the command java Counter makes the operating system create one java (JVM) process, and that JVM reads and runs Counter.class. The number (PID) of this process is ' + P[0] + '. The operating system gives this process memory, and the count variable that we wrote starts at 0 in that memory. The process is created not by the code we wrote but by the java command and the operating system.'
          : 'While the earlier process is still running, you type the command java Counter once more in terminal ' + (i + 1) + '. The file is the same single Counter.class, but the operating system creates one more process and gives it a new number. The PID of this process is ' + P[i] + '. The operating system gives this process its own memory too, so the count of this process also starts at 0.', '');
        addTo(i);
        push(i === 0 ? 'When main calls add(), the three count++ lines inside add run, and count becomes 3 in the memory of this process. println prints "PID ' + P[0] + ' count 3". Then main waits 2 seconds in Thread.sleep(2000), so this process has not ended yet.'
          : 'This process also runs add(). The three count++ lines raise the count in the memory of this process, so it goes from 0 to 3, and "PID ' + P[i] + ' count 3" is printed. The count of the earlier process is still 3. A value raised by one process cannot be seen from another process.', 'good');
      }
      endAll();
      push('After 2 seconds, main of each process ends, and all the processes end. The count of an ended process can no longer be used. ' + n + ' processes were created, but the file Counter.class is still the 1 file it was at the start.', 'good');
      sum.push('A process is a program file that is being run. Counter.class is 1 file, but running it ' + n + ' times created ' + n + ' processes. The operating system gave each process a number (PID) and its own memory, so count was 3 in all of them.');
      sum.push('At the same time, ' + n + ' processes were alive, and their numbers were different from each other. The count raised by one process could not be seen from another process, and running the file did not increase the number of files. A program such as a web server is also one process like these when you run it with the java command.');
    } else if (how === 'rerun') {
      for (var r = 0; r < n; r++) {
        born(r, main1);
        push(r === 0 ? 'In the terminal, the command java Counter makes the operating system create one process. The number (PID) is ' + P[0] + ', and count starts at 0 in the memory that the operating system gave it. The process is created not by the code we wrote but by the java command and the operating system.'
          : 'After the earlier run ends, you type the command java Counter again in the same terminal, and the operating system creates a new process. The number (PID) of this process is ' + P[r] + '. The earlier process has already ended and the memory of this process is new, so count starts at 0, not at the 3 that was raised before.', '');
        addTo(r);
        push('add() runs, count of this process becomes 3, and "PID ' + P[r] + ' count 3" is printed.' + (r === 0 ? ' Then main waits 2 seconds in Thread.sleep(2000).' : ' If the 3 raised before had stayed, 6 would have been printed.'), 'good');
        endAll();
        st.procs[r].alive = false;
        push('After 2 seconds main ends, and the process with PID ' + P[r] + ' ends.' + (r === 0 ? ' The count of an ended process can no longer be used.' : ''), 'good');
      }
      sum.push('After the program ended and was run again, the count raised before was not there. A process exists only while it is running. When you run it again, a new process starts count from 0 in new memory, and it was 3 this time too.');
      sum.push('Each run started after the earlier one ended, so the number of processes alive at the same time was always 1. Even when you run the same file, each run is a separate process.');
    } else {
      born(0, 'main');
      push('The command java Counter makes the operating system create one process. The number (PID) is ' + P[0] + ', and count starts at 0 in the memory of this process. A process has one main thread from the start, and main runs the code.', '');
      for (var j = 1; j <= n; j++) {
        st.procs[0].thr += ', t' + j; st.hot = 'p0'; st.phase = 'thr';
        push(j === 1 ? 'main creates the thread t1 and starts it with start(). A thread does not create a new process. It makes one more flow that runs code inside this process. So the PID stays ' + P[0] + ' and there is still 1 process. main waits with join() for t1 to end.'
          : 'main creates the thread t' + j + ' and starts it. Again no new process is created, and the PID stays ' + P[0] + '.', '');
        addTo(0);
        var cnt = st.procs[0].count;
        push(j === 1 ? 't1 runs add, count in this process becomes 3, and "PID ' + P[0] + ' count 3" is printed. When t1 ends, main continues.'
          : 't' + j + ' runs add. The count that t' + j + ' sees is not 0 but continues from the value the earlier thread raised, and the value after raising is ' + cnt + '. "PID ' + P[0] + ' count ' + cnt + '" is printed. This is because the threads share the memory of this process.', 'good');
      }
      endAll();
      push('After all the threads end, main waits 2 seconds in Thread.sleep(2000), and then main ends and the process ends. There was 1 process from start to end.', 'good');
      var seq = []; for (var q = 1; q <= n; q++) seq.push(3 * q);
      sum.push('A thread does not create a new process. It runs code inside one process. There was only 1 process (one PID), and the threads raised the same count in the same memory, so the values were printed in the order ' + seq.join(', ') + '.');
      sum.push('Processes have separate memory, and threads inside one process share memory. The threads were made to run one after another so that the result is the same every time.');
    }
    var cs = how === 'threads' ? [3, 6, 9].slice(0, n) : Array.apply(null, Array(n)).map(function () { return 3; });
    return { events: ev, summary: sum, row: [(how === 'threads' ? 1 : n) + '', cs.join(', '), how === 'threads' ? 'Yes' : 'No', (how === 'procs' ? n : 1) + ''] };
  },
  render: function (v, sim, t, H, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : null;
    if (!s) { H.text(v, 'Click Run to start from making the file Counter.class with javac Counter.java.'); return; }
    H.table(v, ['PID', 'count in memory', 'State'], s.procs.length ? s.procs.map(function (p) { return { cls: p.alive ? '' : 'gone', cells: ['' + p.pid, p.alive ? '' + p.count : 'Unavailable', p.alive ? 'Running · ' + p.thr : 'Ended'] }; }) : [{ cls: 'gone', cells: ['Not run yet', '', ''] }], 'Processes');
    H.table(v, ['Lines printed to the screen'], s.out.length ? s.out.map(function (o) { return { cls: '', cells: [o] }; }) : [{ cls: 'gone', cells: ['None yet'] }], 'Output');
    H.counters(v, [[s.made, 'Processes created'], [s.alive, 'Processes running now']]);
  },
  // Diagram: the one file Counter.class on disk at the left, and process boxes at the right. Each time you run it, an arrow leaves the file and one process appears, and each box shows the PID of that process and the count in its memory. At the bottom are boxes that count the processes created and the processes running now.
  draw: function (P, sim, shown) {
    var c = sim.c, last = shown[shown.length - 1], s = last ? last.snap : null, slots = c.how === 'threads' ? 1 : +c.n;
    P.size(680, 284);
    P.box('fl', 14, 16, 150, 188, { cls: s && s.hot === 'fl' ? 'hot now' : 'plain', title: 'Counter.class', sub: ['File on disk', 'Still 1 file'] });
    for (var i = 0; i < slots; i++) {
      var p = s && s.procs[i], id = 'p' + i, y = 16 + i * 66;
      if (!p) { P.box(id, 214, y, 452, 56, { cls: 'ghost', title: 'Process', right: 'None yet' }); continue; }
      var cls = !p.alive ? 'ghost' : s.hot === id ? 'hot now' : 'good';
      P.box(id, 214, y, 452, 56, { cls: cls, title: 'PID ' + p.pid, right: p.alive ? 'count = ' + p.count : 'Ended · count unavailable', sub: p.alive ? 'Threads: ' + p.thr : '' });
      P.arrow('a' + i, 'fl:r:' + ((28 + i * 66) / 188).toFixed(3), id + ':l', { cls: s.hot === id && s.phase === 'new' ? 'hot' : 'mut' });
    }
    P.box('n1', 14, 232, 322, 36, { cls: s && s.made ? 'wait' : 'ghost', title: 'Processes created', right: (s ? s.made : 0) + '' });
    P.box('n2', 344, 232, 322, 36, { cls: s && s.alive ? 'good' : 'ghost', title: 'Processes running now', right: (s ? s.alive : 0) + '' });
  },
  assume: "The environment is JDK 21.0.12.1 (javac 21, java 21) on Windows. All six combinations were checked against real execution. For each combination, the same text as the code on the screen (the # Counter.java section and the # Terminal section) was written into an empty folder, the source file and the commands were read from that text, and the real javac program and java program were started as processes, and the results were compared. For each java Counter line in the terminal section, the line directly above it was read as a comment. If it said \"after the earlier run ends\", the check waited for all earlier processes to end before starting it, and otherwise it started it at once without waiting. For \"several terminals\", the check did not open several terminals but started the processes one after another instead. What was checked is the number of processes actually started, the count printed by each process, whether any process ever saw a count larger than 3 (that is, whether memory is shared), the maximum number of live processes counted each time a process was started, whether the PID that was printed equals the process ID seen by the side that ran it, whether the PIDs of the processes alive together are different from each other, the exit code and the standard error, and whether Counter.class is still 1 file after running. The PIDs 4120, 7352, and 9081 on the screen are example numbers, and the real numbers differ on every run. On the PC used to write this lab, the PID of a process that was run again after the earlier one ended was different from all the earlier ones. But the Java SE 21 API documentation of ProcessHandle (the description of pid()) says that the operating system may reuse the number of an ended process and does not fix when it does so, so the screen does not say that \"the number of the process that is run again is always different\". That a program such as a web server is also one process when you run it with the java command was checked by running a small server program that receives requests (com.sun.net.httpserver of the JDK) with the java command and sending it two requests. The PIDs in the two responses were the same and equal to the process ID seen by the side that ran it, and count continued as 1, 2. This server is not shown on the screen, and a real server product such as Tomcat was not run. The documentation was opened and checked directly. From \"Processes and Threads\" in The Java Tutorials, the lab follows that a process has its own execution environment and memory space (the Processes section), that a thread lives inside a process and shares the resources of the process, including memory (the Threads section), and that most implementations of the Java virtual machine run as a single process. The distinction between a program file and a process (the file is on disk and the process is that file being run) is not defined by this document. It is an explanation that follows the execution results above and the general use of the terms. The code on the screen uses a static variable because it is meant to show that the variable count inside a process is in the memory of the process, and it makes the threads run one after another with join() to avoid the problem that occurs when two or more threads raise count at the same time (a race condition). Thread.sleep(2000) is there so that a process does not end at once and several processes are alive at the same time, and a real program does not need it. The code on the screen needs no import lines, so nothing was left out. This lab covers only that the operating system gives each process separate memory on one computer. It does not cover how processes pass values to each other, what it costs to create a process, or what happens to other processes when one process dies. These are covered in the in-depth lab \"Processes and threads\", and containers, which isolate processes and run them as a bundle, are covered in the in-depth lab \"Containers and virtual machines\". What could not be checked by opening the documentation: how the operating system decides a process number (PID), and how the operating system takes back memory when a process ends. The documentation was not opened for these, and the screen does not say anything about them.",
});

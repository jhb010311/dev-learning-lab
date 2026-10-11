Lab.register({
  id: 'ctx', nav: 'Thread count and context switching', cat: 'Concurrency', mode: 'step',
  title: 'Adding threads does not keep making things faster',
  intro: 'A CPU core runs only one thread at any given moment. When more threads want to run than there are cores, the operating system runs them in turn, each for a short time (context switching). Throughput then stops growing, and only the time for one task to finish gets longer. The right number of threads is completely different depending on whether the tasks mostly compute or mostly wait.',
  terms: ['Processes and threads', 'Context switching', 'Thread pool', 'Blocking and non-blocking'], ranks: ['os', 'threadpool', 'concurrency'],
  controls: [
    { id: 'core', label: 'Number of CPU cores', type: 'range', min: 1, max: 8, value: 4, fmt: function (v) { return v + ''; } },
    { id: 'th', label: 'Number of threads', type: 'range', min: 1, max: 80, value: 16, fmt: function (v) { return v + ''; } },
    { id: 'kind', label: 'Kind of task', type: 'select', value: 'cpu', options: [['cpu', 'Mostly computation (image conversion, encryption, and so on): uses the CPU all the time'], ['io', 'Mostly waiting (database and API calls): 90% of the time is spent waiting for a response']] },
  ],
  presets: [
    { t: 'Default settings', d: '4 cores and 16 threads that do computation. Throughput is the same as with 4 threads, and only the time for one task to finish becomes 4 times as long.', v: { core: 4, th: 16, kind: 'cpu' } },
    { t: 'Threads matched to the number of cores', d: 'Throughput is the same, and every task finishes without waiting.', v: { core: 4, th: 4, kind: 'cpu' } },
    { t: 'Mostly waiting, 4 threads', d: 'The threads are waiting most of the time, so the CPU sits idle.', v: { core: 4, th: 4, kind: 'io' } },
    { t: 'Mostly waiting, 40 threads', d: 'While one thread waits, other threads use the CPU, so throughput becomes 10 times as high.', v: { core: 4, th: 40, kind: 'io' } },
    { t: 'Even more threads', d: '80 threads. The CPU is already fully used, so throughput stays the same.', v: { core: 4, th: 80, kind: 'io' } },
  ],
  code: function (c) {
    return 'int cores = Runtime.getRuntime().availableProcessors();   // ' + c.core + '\n\n// ' + (c.kind === 'cpu' ? 'mostly computation: as many threads as cores is enough' : 'mostly waiting: number of cores x (1 + wait time / compute time)') + '\nExecutorService pool = Executors.newFixedThreadPool(' + c.th + ');\n\nfor (Task task : tasks) {\n    pool.submit(() -> ' + (c.kind === 'cpu' ? 'resize(image)' : 'callExternalApi()') + ');\n}';
  },
  label: function (c) { return 'Cores: ' + c.core + ' · threads: ' + c.th + ' · ' + (c.kind === 'cpu' ? 'mostly computation' : 'mostly waiting'); },
  columns: ['Throughput per second', 'CPU usage', 'Time for one task to finish', 'Suitable number of threads for this task'],
  simulate: function (c) {
    var C = c.core, T = c.th, io = c.kind === 'io', cpuFrac = io ? 0.1 : 1, taskCpu = 0.1, waitT = io ? 0.9 : 0, ev = [], sum = [];
    var want = T * cpuFrac, over = want > C + 1e-9, used = Math.min(want, C), tput = Math.round(used / taskCpu), best = Math.round(C / cpuFrac), util = Math.round(used / C * 100);
    var share = over ? want / C : 1, lat = Math.round((taskCpu * share + waitT) * 100) / 100, baseLat = Math.round((taskCpu + waitT) * 100) / 100;
    function push(s, k, stage) { ev.push({ s: s, k: k, snap: { stage: stage } }); }
    push('Cores: ' + C + '. Threads: ' + T + '. ' + (io ? 'Each thread computes for only 10% of the time and waits for an external response for the other 90%. A waiting thread does not use the CPU.' : 'Each thread computes without a break.'), '', 1);
    push('At any given moment, the average number of threads that want the CPU is ' + (Math.round(want * 10) / 10) + ' (' + T + ' × ' + (cpuFrac * 100) + '%). The number of cores is ' + C + ', so ' + (over ? 'there are not enough cores. The operating system puts the threads on the cores in turn, each for a short time.' : want < C - 1e-9 ? 'some cores are left over. They have nothing to do and sit idle.' : 'the two match exactly.'), over ? 'bad' : '', 2);
    if (over) push('Each time the operating system switches threads, it saves the state of the thread that was running and loads the state of the next one. About ' + (Math.round(share * 10) / 10) + ' threads share each core, so each thread is stopped whenever it is not its turn. The total amount of work done stays at what the cores (' + C + ') can do, and only the time for each task to finish gets longer.', 'bad', 3);
    else push('The number of threads that want to run does not exceed the number of cores, so no thread has to wait for another.', 'good', 3);
    push('Result: CPU usage ' + util + '%, tasks handled per second: ' + tput + ', time for one task to finish: ' + lat + 's' + (over ? ' (' + baseLat + 's when it runs alone).' : '.') + (T !== best ? ' With the number of threads set to ' + best + ', the values become ' + Math.round(C / taskCpu) + ' per second and ' + baseLat + 's per task.' : ' This is the most suitable number of threads for this task.'), T === best ? 'good' : '', 4);
    if (!io) sum.push(over ? 'For tasks that mostly compute, having more threads than cores does not increase throughput. The threads share the cores, so each task just finishes later. Each thread also uses memory of its own (its stack), so a number of threads close to the number of cores is appropriate.' : T < C ? 'Some cores are left unused. Increasing the number of threads to the number of cores (' + C + ') increases throughput.' : 'The number of threads equals the number of cores, so every core is used and no thread waits.');
    else sum.push(want < C - 1e-9 ? 'With tasks that mostly wait, most of the threads are waiting, so the cores sit idle. You need far more threads than cores to use the whole CPU. The suitable number is roughly number of cores × (1 + wait time ÷ compute time), which here is ' + C + ' × (1 + 9) = ' + best + '.' : over ? 'The number of threads that want the CPU already exceeds the number of cores. Adding more threads from here leaves throughput unchanged, and only the memory used per thread and the response time grow.' : 'Other threads fill the time that a thread spends waiting, so every core is in use.');
    sum.push('A web server has far more threads for handling requests than it has cores (200 by default in Tomcat) because most of the time spent handling a request goes to waiting for a database or an external response.');
    return { events: ev, summary: sum, k: { want: want, over: over, share: share, used: used, tput: tput, util: util, best: best, lat: lat }, row: [tput + '', util + '%', lat + 's', best + ''] };
  },
  render: function (v, sim, t, H, shown) {
    var c = sim.c, k = sim.k, last = shown[shown.length - 1], st = last ? last.snap.stage : 0;
    H.counters(v, [[st >= 2 ? (Math.round(k.want * 10) / 10) + '' : '?', 'Threads that want the CPU (average)'], [st >= 4 ? k.util + '%' : '?', 'CPU usage'], [st >= 4 ? k.tput + '' : '?', 'Throughput per second'], [st >= 4 ? k.lat + 's' : '?', 'Time for one task to finish']]);
    H.title(v, 'CPU cores'); var ln = H.lanes(v), per = k.want / c.core;
    for (var i = 0; i < c.core; i++) { if (st < 2) { H.lane(ln, 'Core ' + (i + 1), '', 'none'); continue; } var load = Math.min(1, per); H.lane(ln, 'Core ' + (i + 1), per > 1 + 1e-9 ? 'about ' + (Math.round(per * 10) / 10) + ' threads take turns using it' : per >= 0.999 ? '1 thread uses it all the time' : 'usage ' + Math.round(load * 100) + '% (idle the rest of the time)', per > 1 + 1e-9 ? 'bad' : per >= 0.999 ? 'good' : '', load); }
    H.title(v, 'Threads: ' + c.th + ' (their state at one moment)'); var run = Math.min(c.th, Math.round(k.used)), waitCpu = Math.max(0, Math.round(k.want) - run), items = [];
    for (var j = 0; j < c.th; j++) items.push(['', j < run ? 'd' : j < run + waitCpu ? 'r' : 'q']);
    H.slots(v, st >= 2 ? items : [], '', true);
    H.text(v, 'Green is a thread that is running on a core now, red is a thread that wants to run but is waiting for a core, and blue is a thread that is waiting for an external response (it does not need the CPU).');
  },
  assume: 'This model assumes that one task uses the CPU for 0.1s. The trend is the same as in results actually measured on JDK 21 on this PC (12 logical cores). For tasks that mostly compute, throughput was 102 tasks per second with 1 thread, 562 with 6, 768 with 12, 820 with 24, and 826 with 48, so it stopped growing near the number of cores. For tasks that mostly wait (1ms of computation + 9ms of waiting), it was 1,104 with 12 threads, 4,417 with 48, 7,871 with 120, 8,202 with 240, and 8,144 with 480, so it grew up to about 10 times the number of cores and then stopped. Even with far more threads than cores, throughput did not drop noticeably. The cost of the switching itself was too small to show up in this measurement, which is why the model does not include a drop in throughput either. The measured throughput is not exactly proportional to the number of cores because the 12 logical cores share 6 physical cores. The formula for the suitable number of threads is a widely cited guideline in the field of Java concurrency.',
});

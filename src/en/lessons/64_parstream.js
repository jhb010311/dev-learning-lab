Lab.register({
  id: 'parstream', nav: 'Parallel streams and the common pool', cat: 'Concurrency', mode: 'step',
  title: 'Someone else\'s parallel stream slows down my code',
  intro: 'parallelStream() does not create a thread pool of its own. It runs in the single common pool that the whole JVM shares. If some code runs tasks that wait for a long time in it, all the threads of the common pool are occupied, and other parallel streams that have nothing to do with that code slow down too. Change what request A does to see the effect on request B.',
  terms: ['ForkJoinPool and the common pool', 'Stream API', 'Thread pool', 'Blocking and non-blocking'], ranks: ['stream', 'threadpool', 'concurrency'],
  controls: [
    { id: 'a', label: 'What request A does', type: 'select', value: 'block', options: [['none', 'Nothing (only B runs)'], ['block', '8 calls to an external API, 2 seconds each, inside a parallel stream'], ['own', 'The same work, run in a separate thread pool']] },
  ],
  presets: [
    { t: 'Default settings', d: 'A occupies the common pool. B becomes 4 times slower.', v: { a: 'block' } },
    { t: 'When only B runs', d: 'B has the whole common pool to itself, so it is fast.', v: { a: 'none' } },
    { t: 'Moving A to a separate pool', d: 'B becomes fast again.', v: { a: 'own' } },
  ],
  code: function (c) {
    var b = '// Request B: 8 tasks of 0.1 seconds each\nitems.parallelStream().forEach(this::resize);';
    if (c.a === 'none') return b;
    if (c.a === 'block') return '// Request A: calls an external API inside a parallel stream (2 seconds per call)\norders.parallelStream()\n      .forEach(o -> deliveryApi.track(o));      // a thread of the common pool is occupied for 2 seconds each time\n\n' + b;
    return '// Request A: runs in a separate pool\nExecutorService io = Executors.newFixedThreadPool(8);\nvar futures = orders.stream()\n      .map(o -> CompletableFuture.runAsync(() -> deliveryApi.track(o), io))\n      .toList();\nfutures.forEach(CompletableFuture::join);\n\n' + b;
  },
  label: function (c) { return { none: 'Only B runs', block: 'A makes blocking calls in the common pool', own: 'A uses a separate pool' }[c.a]; },
  columns: ['Time B took (measured)', 'Threads available to B', 'Pool A used'],
  simulate: function (c) {
    var ev = [], sum = [], ms = { none: 217, block: 862, own: 218 }[c.a], S = { pool: ['idle', 'idle', 'idle'], b: 'not started', own: '' };
    function push(s, k) { ev.push({ s: s, k: k, snap: JSON.parse(JSON.stringify(S)) }); }
    push('The common pool (ForkJoinPool.commonPool) has 3 worker threads. Its default size is "number of CPU cores - 1", and the thread that calls a parallel stream also takes part in the work itself. Every parallel stream in the JVM shares this one pool.', '');
    if (c.a === 'block') { S.pool = ['A: waiting for the API response (2 seconds)', 'A: waiting for the API response (2 seconds)', 'A: waiting for the API response (2 seconds)']; push('Request A calls an external API inside a parallel stream. All 3 worker threads of the common pool pick up one task of A each and stay stopped for 2 seconds at a time while they wait for the response. They are not computing anything. They are only waiting, and yet the threads are occupied.', 'bad'); }
    if (c.a === 'own') { S.own = '8 threads of the separate pool: waiting for the API responses of A'; push('Request A runs its external API calls in a separate thread pool that it created itself. It does not touch the common pool.', 'good'); }
    S.b = 'parallel stream started (8 tasks)'; push('Request B runs 8 tasks of 0.1 seconds each with parallelStream(). It splits the work and hands it to the common pool.', '');
    if (c.a === 'block') { S.b = 'alone, running the 8 tasks one after another'; push('All the worker threads of the common pool are occupied by A, so there is no thread to take the tasks of B. The thread that called B runs the 8 tasks one by one, alone. It is a parallel stream, but in effect it runs sequentially.', 'bad'); }
    else { S.pool = ['B: running a task', 'B: running a task', 'B: running a task']; S.b = 'calling thread + 3 worker threads = 4 threads running at the same time'; push('The 3 worker threads of the common pool and the thread that called B, 4 threads in all, share the tasks. They finish the 8 tasks in two rounds.', 'good'); }
    S.b = 'done: ' + ms + 'ms'; if (c.a !== 'block') S.pool = ['idle', 'idle', 'idle'];
    push('B has finished. Time taken: ' + ms + 'ms.' + (c.a === 'block' ? ' That is about 4 times as long as when B runs alone (217ms). Not a single line of the code of B has changed.' : ''), c.a === 'block' ? 'bad' : 'good');
    sum.push('Time B took: ' + ms + 'ms (a value actually measured on this PC).');
    if (c.a === 'block') sum.push('The common pool is shared by the whole JVM. If one place puts tasks that wait for a long time into a parallel stream, the parallel streams of other code that knows nothing about it slow down together with it, and so does CompletableFuture (when no pool is specified). The code that causes the problem and the code that slows down are different, so the cause is also hard to find.');
    if (c.a === 'own') sum.push('Run tasks that involve waiting (a database, an external API) in a separate thread pool to keep them apart from the common pool. This divides the resources so that when one side is blocked, the problem does not spread to the other side.');
    sum.push('A parallel stream pays off only when a computation that uses the CPU is applied to a large amount of data. That use is also why the size of the common pool is matched to the number of cores. When there are few elements, when the tasks are light, or when waiting is mixed in, a parallel stream can be slower than a sequential stream. In the request-handling code of a web server, there is almost never a reason to use one.');
    return { events: ev, summary: sum, row: [ms + 'ms', c.a === 'block' ? '1 (only the calling thread)' : '4', { none: '-', block: 'Common pool', own: 'Separate pool' }[c.a]] };
  },
  render: function (v, sim, t, H, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : null;
    if (!s) { H.text(v, 'Click Run to start.'); return; }
    H.title(v, 'Common pool (shared by the whole JVM)'); var ln = H.lanes(v);
    s.pool.forEach(function (x, i) { H.lane(ln, 'Worker ' + (i + 1), x, x.indexOf('A:') === 0 ? 'bad' : x.indexOf('B:') === 0 ? 'good' : 'none'); });
    if (s.own) { H.title(v, 'Separate pool of request A'); H.lane(H.lanes(v), 'Separate pool', s.own, 'wait'); }
    H.title(v, 'Request B'); H.lane(H.lanes(v), 'Request B', s.b, s.b.indexOf('alone') === 0 ? 'bad' : s.b === 'not started' ? 'none' : 'hot');
  },
  assume: 'The three times that B took (217ms, 862ms, 218ms) are values measured by actually running the code on JDK 21 on this PC, with the number of worker threads in the common pool set to 3. The 0.1-second tasks and the 2-second calls were replaced with Thread.sleep. That the default size of the common pool is "number of cores - 1" was checked on JDK 21 on this PC (with 12 processors, the parallelism of the common pool is 11). That parallel streams use the common pool is shown by the measurement above (B slowed down when someone else\'s parallel stream occupied the common pool).',
});

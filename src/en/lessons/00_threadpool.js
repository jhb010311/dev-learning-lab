Lab.register({
  id: 'threadpool', nav: 'Thread pool', cat: 'Concurrency', mode: 'time',
  title: 'What changes when you add more threads',
  why: 'If a new thread is created every time a task arrives, the number of threads grows with the number of requests when many requests come at once. Each thread uses memory, and switching between threads has a cost, so the whole server can slow down or stop. A thread pool reuses threads it has already created and puts an upper limit on their number. Extra tasks wait in a queue or are rejected, so the server handles only as many tasks at the same time as it can bear.',
  use: 'A servlet container such as Tomcat handles incoming requests with a thread pool. In application code, you create a pool with ExecutorService to call several external APIs at the same time and collect the results, or to run long tasks separately. When there are very many tasks that spend most of their time waiting, some applications use no pool and create a virtual thread for each task instead.',
  intro: 'A thread pool reuses the threads it has created, up to a set number, instead of creating and discarding a thread for every request. When a request comes in, one thread handles it from start to finish. When all the core threads are busy, requests wait in a queue; when the queue is full, more threads are created up to the maximum; and requests beyond that are rejected. This lab shows how waiting and rejection change with the number of threads and the size of the queue.',
  terms: ['Thread pool', 'How ThreadPoolExecutor handles a new task', 'Tomcat\'s threading model', 'Blocking and non-blocking'], ranks: ['threadpool', 'was'],
  controls: [
    { id: 'core', label: 'Core pool size', type: 'range', min: 1, max: 8, value: 2, fmt: function (v) { return v + ''; } },
    { id: 'max', label: 'Maximum pool size', type: 'range', min: 1, max: 12, value: 4, fmt: function (v) { return v + ''; } },
    { id: 'cap', label: 'Queue capacity', type: 'range', min: 0, max: 10, value: 2, fmt: function (v, c) { return c.unb ? 'unbounded' : v + ''; } },
    { id: 'unb', label: 'Use an unbounded queue', type: 'check', value: false },
    { id: 'n', label: 'Number of incoming requests', type: 'range', min: 1, max: 30, value: 10, fmt: function (v) { return v + ''; } },
    { id: 'work', label: 'Time to handle one request', type: 'range', min: 0.5, max: 3, step: 0.5, value: 2, fmt: function (v) { return Lab.fmt(v) + 's'; } },
    { id: 'gap', label: 'Interval between incoming requests', type: 'range', min: 0, max: 1, step: 0.1, value: 0.2, fmt: function (v) { return v === 0 ? 'all at once' : Lab.fmt(v) + 's'; } },
  ],
  fix: function (c) { return c.max < c.core ? { max: c.core } : null; },
  presets: [
    { t: 'Default settings', q: 'What happens when 10 requests arrive at a thread pool with core pool size 2, maximum pool size 4, and queue capacity 2?', d: 'Core pool size 2, maximum pool size 4, queue capacity 2, and 10 requests. Some requests are rejected.', v: { core: 2, max: 4, cap: 2, n: 10, work: 2, gap: 0.2, unb: false } },
    { t: 'More threads only', q: 'What if you increase the core pool size to 4 and the maximum pool size to 8?', d: 'Core pool size 4 and maximum pool size 8. See how the rejections and the waiting change.', v: { core: 4, max: 8, cap: 2, n: 10, work: 2, gap: 0.2, unb: false } },
    { t: 'A longer queue only', q: 'What if you keep the thread counts the same and increase only the queue capacity to 10?', d: 'The threads stay the same and only the queue capacity grows to 10. Fewer requests are rejected, but requests wait longer.', v: { core: 2, max: 4, cap: 10, n: 10, work: 2, gap: 0.2, unb: false } },
    { t: 'An unbounded queue', q: 'What if you use an unbounded queue?', d: 'Confirm that the maximum pool size is never used.', v: { core: 2, max: 4, cap: 2, n: 10, work: 2, gap: 0.2, unb: true } },
    { t: 'Requests that finish quickly', q: 'What if you reduce the time to handle one request from 2.0s to 0.5s?', d: 'Each request takes 0.5s. The same number of threads can now keep up.', v: { core: 2, max: 4, cap: 2, n: 10, work: 0.5, gap: 0.2, unb: false } },
  ],
  code: function (c) {
    var q = c.unb ? 'new LinkedBlockingQueue<>());      // unbounded queue' : c.cap === 0 ? 'new SynchronousQueue<>());         // holds no waiting requests' : 'new ArrayBlockingQueue<>(' + c.cap + '));     // queue capacity ' + c.cap + '';
    return '// Only the lines inside main are shown (class, main declaration, imports, and the declaration of the example method handle() omitted)\nExecutorService pool = new ThreadPoolExecutor(\n    ' + c.core + ',                        // core pool size\n    ' + c.max + ',                        // maximum pool size\n    60, TimeUnit.SECONDS,\n    ' + q + '\n\nfor (int i = 1; i <= ' + c.n + '; i++) {\n    pool.execute(() -> handle());   // each request takes ' + Lab.fmt(c.work) + 's\n' +
      (c.gap > 0 ? '    Thread.sleep(' + Math.round(c.gap * 1000) + ');            // a request arrives every ' + Lab.fmt(c.gap) + 's\n' : '') + '}';
  },
  label: function (c) { return 'Core ' + c.core + ' / max ' + c.max + ' / queue ' + (c.unb ? 'unbounded' : c.cap) + ' · requests: ' + c.n + ' · ' + Lab.fmt(c.work) + 's · interval ' + Lab.fmt(c.gap) + 's'; },
  columns: ['Completed', 'Rejected', 'Average wait', 'Longest wait', 'Total time', 'Threads created'],
  // Same order as the Java ThreadPoolExecutor: core threads -> queue -> threads up to the maximum -> rejection
  simulate: function (c) {
    var fmt = Lab.fmt, threads = [], queue = [], log = [], reqs = [], cap = c.unb ? Infinity : c.cap;
    function start(th, r, t) { r.start = t; r.end = t + c.work; th.busyUntil = r.end; th.req = r; th.segs.push(r); }
    function finishUpTo(t) {
      for (;;) {
        var th = null;
        threads.forEach(function (x) { if (x.req && x.busyUntil <= t + 1e-9 && (!th || x.busyUntil < th.busyUntil)) th = x; });
        if (!th) return;
        var done = th.req, at = th.busyUntil; th.req = null;
        if (queue.length) { var nx = queue.shift(); start(th, nx, at); log.push({ t: at, s: 'Thread ' + th.id + ' finishes request ' + done.id + ', takes request ' + nx.id + ' from the head of the queue, and starts handling it. Request ' + nx.id + ' waited ' + fmt(at - nx.at) + 's.' }); }
        else log.push({ t: at, s: 'Thread ' + th.id + ' finishes request ' + done.id + '. No request is waiting, so the thread becomes idle.' });
      }
    }
    for (var i = 1; i <= c.n; i++) {
      var t = Math.round((i - 1) * c.gap * 10) / 10, r = { id: i, at: t };
      reqs.push(r); finishUpTo(t);
      var idle = threads.filter(function (x) { return !x.req; })[0], busy = threads.filter(function (x) { return x.req; }).length, th;
      if (threads.length < c.core) { th = { id: threads.length + 1, created: t, segs: [], req: null }; threads.push(th); start(th, r, t); log.push({ t: t, x: 'new', s: 'Request ' + i + ' arrives. The pool has fewer threads than the core pool size (' + c.core + '), so it creates thread ' + th.id + ', which handles the request right away.' }); }
      else if (idle) { start(idle, r, t); log.push({ t: t, x: 'reuse', s: 'Request ' + i + ' arrives. Thread ' + idle.id + ', which was idle, handles it right away.' }); }
      else if (queue.length < cap) { queue.push(r); r.queued = t; log.push({ t: t, x: 'queue', s: 'Request ' + i + ' arrives. Every thread is busy (' + busy + ' in the pool). Instead of adding a thread, the pool puts the request in the queue (waiting: ' + queue.length + (c.unb ? '' : '/' + c.cap) + ').' }); }
      else if (threads.length < c.max) { th = { id: threads.length + 1, created: t, segs: [], req: null }; threads.push(th); start(th, r, t); log.push({ t: t, x: 'grow', s: 'Request ' + i + ' arrives. The queue is full. Only now does the pool create an additional thread, thread ' + th.id + ', to handle it (up to a maximum of ' + c.max + ').' }); }
      else { r.rejected = true; log.push({ t: t, x: 'rej', k: 'bad', s: 'Request ' + i + ' arrives. Every thread is busy (the maximum, ' + c.max + ') and the queue is also full. The request is rejected.' }); }
    }
    finishUpTo(Infinity);
    var ok = reqs.filter(function (r) { return !r.rejected; }), waits = ok.map(function (r) { return r.start - r.at; });
    var total = ok.reduce(function (m, r) { return Math.max(m, r.end); }, 0), rej = reqs.length - ok.length;
    var avg = waits.length ? waits.reduce(function (a, b) { return a + b; }, 0) / waits.length : 0, mx = waits.length ? Math.max.apply(null, waits) : 0;
    var sum = ['The requests that were handled spent ' + fmt(avg) + 's in the queue on average, and the one that waited longest spent ' + fmt(mx) + 's there.'];
    if (c.unb && threads.length <= c.core && c.max > c.core) sum.push('The queue is unbounded, so it never became full, and that is why the maximum pool size of ' + c.max + ' was never used.');
    if (rej > 0) sum.push('To get rid of the rejections, add threads, make the queue longer (requests then wait longer), or reduce the time it takes to handle a request.');
    if (rej === 0 && mx === 0) sum.push('Every request was handled right away without waiting. There are enough threads for this load.');
    return { total: total, events: log, summary: sum, threads: threads, reqs: reqs,
      row: [ok.length + '', rej + '', fmt(avg) + 's', fmt(mx) + 's', fmt(total) + 's', threads.length + ''] };
  },
  render: function (v, sim, t, H) {
    var c = sim.c, slots = Math.max(c.max, sim.threads.length), rows = [];
    for (var i = 0; i < slots; i++) {
      var th = sim.threads[i];
      if (!th || th.created > t + 1e-9) { rows.push(['Thread ' + (i + 1), i < c.core ? 'not created yet (core thread)' : c.unb ? 'not created (an unbounded queue never fills up)' : 'not created yet (created only when the queue is full)', 'none']); continue; }
      var cur = th.segs.filter(function (r) { return r.start <= t + 1e-9 && r.end > t + 1e-9; })[0];
      if (cur) { rows.push(['Thread ' + (i + 1), 'handling request ' + cur.id + ' · ' + H.fmt(cur.end - t) + 's left', '', (t - cur.start) / c.work]); }
      else rows.push(['Thread ' + (i + 1), 'idle', '']);
    }
    var q = sim.reqs.filter(function (r) { return r.queued !== undefined && r.queued <= t + 1e-9 && r.start > t + 1e-9; });
    H.title(v, 'Threads'); var ln = H.lanes(v); rows.forEach(function (r) { H.lane(ln, r[0], r[1], r[2], r[3]); });
    H.title(v, 'Queue');
    var items = [], capN = c.unb ? Math.max(q.length, 1) : c.cap;
    for (var j = 0; j < capN; j++) items.push(q[j] ? ['Request ' + q[j].id, 'q'] : [c.unb ? 'empty' : 'empty slot', '']);
    if (c.unb) items.push(['… unbounded', '']);
    H.slots(v, items, 'The queue has no capacity. When no thread is idle, the pool immediately adds a thread or rejects the request.');
  },
  // Diagram: the queue and the rejected requests on the left, the threads on the right. A request (a numbered box) moves from the queue to a thread, and goes to the rejected area when there is no room.
  draw: function (P, sim, shown, t) {
    var c = sim.c, slots = Math.max(c.max, sim.threads.length), th = 42 + slots * 28, lh = 362, H = Math.max(th, lh);
    var q = sim.reqs.filter(function (r) { return r.queued !== undefined && r.queued <= t + 1e-9 && r.start > t + 1e-9; }), rj = sim.reqs.filter(function (r) { return r.rejected && r.at <= t + 1e-9; }), doneN = sim.reqs.filter(function (r) { return !r.rejected && r.end <= t + 1e-9; }).length, capN = c.unb ? 10 : c.cap;
    P.size(680, H + 32);
    P.region('qu', 16, 16, 290, 112, 'Queue ' + (c.unb ? '(unbounded)' : '(capacity ' + c.cap + ')') + ' · request numbers');
    P.region('rej', 16, 140, 290, 238, 'Rejected requests');
    P.region('thr', 346, 16, 318, H, 'Threads in the pool (core ' + c.core + ', maximum ' + c.max + ')');
    for (var j = 0; j < capN; j++) if (!q[j]) P.box('qe' + j, 28 + (j % 5) * 54, 50 + Math.floor(j / 5) * 34, 50, 28, { cls: 'ghost' });
    q.slice(0, 10).forEach(function (r, j) { P.box('rq' + r.id, 28 + (j % 5) * 54, 50 + Math.floor(j / 5) * 34, 50, 28, { cls: 'wait', sub: String(r.id), center: true }); });
    if (!capN) P.text('noq', 161, 80, 'The queue has no capacity', { cls: 'mut', anchor: 'middle' });
    rj.forEach(function (r, j) { P.box('rq' + r.id, 28 + (j % 5) * 54, 174 + Math.floor(j / 5) * 34, 50, 28, { cls: 'bad', sub: String(r.id), center: true }); });
    if (!rj.length) P.text('norj', 161, 262, 'None', { cls: 'mut', anchor: 'middle' });
    for (var i = 0; i < slots; i++) {
      var x = sim.threads[i], y = 50 + i * 28, made = x && x.created <= t + 1e-9, cur = made ? x.segs.filter(function (r) { return r.start <= t + 1e-9 && r.end > t + 1e-9; })[0] : null;
      P.box('th' + i, 358, y, 294, 24, { cls: !made ? 'ghost' : cur ? 'hot' : 'plain', title: 'Thread ' + (i + 1), right: !made ? (i < c.core ? 'not created yet' : c.unb ? 'never (unbounded queue)' : 'only if the queue is full') : cur ? '' : 'idle' });
      if (cur) P.box('rq' + cur.id, 540, y + 3, 104, 18, { cls: 'wait', sub: 'Request ' + cur.id + '', center: true, from: 'th' + i });
    }
    P.text('done', 358, H + 8, 'Completed: ' + doneN + '', { cls: 'good' });
    P.note('The blue boxes with numbers are requests.');
  },
  assume: 'While a request is being handled, one thread is tied up for the whole handling time (a request that waits for a slow database or external API). The model assumes that adding threads costs nothing. In reality each thread uses memory, and when more threads want the CPU than there are cores, the cost of switching between them grows. The order in which threads are assigned (core threads → queue → threads up to the maximum → rejection) is the same as the actual rule of the Java ThreadPoolExecutor, and it was checked against real execution. The thread pool that Tomcat uses for handling requests follows a different order: when no thread is idle, it adds threads up to the maximum before putting requests in the queue.',
});

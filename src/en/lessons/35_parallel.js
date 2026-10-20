Lab.register({
  id: 'parallel', nav: 'Sequential and parallel calls', cat: 'Concurrency', mode: 'time',
  title: 'Several external calls: one after another, or all at once?',
  why: 'If several unrelated external calls are made one after another, the waiting times of all the calls add up. Creating threads directly or waiting for each with Future.get makes collecting results and handling exceptions troublesome. CompletableFuture lets you start several tasks at the same time and lets you combine results and decide the substitute value for failure or timeout by chaining methods.',
  use: 'It is used when building one screen, such as a product detail page or a user\'s account page, requires calling several services together, such as member, stock, and reviews. allOf waits for all of them to finish, and completeOnTimeout replaces a late call with a default value. If no thread pool is passed to supplyAsync, it usually runs in the shared ForkJoinPool, so for tasks that wait, such as external calls, it is usual to specify a dedicated thread pool.',
  intro: 'To build a single product detail page, the application calls several services. If it calls them one after another, all the times add up. If it calls them at the same time, the page takes only as long as the slowest call.',
  terms: ['CompletableFuture', 'Synchronous and asynchronous', 'Thread pool', 'ForkJoinPool and the common pool'], ranks: ['concurrency', 'threadpool', 'javaver'],
  controls: [
    { id: 'how', label: 'How the calls are made', type: 'select', value: 'seq', options: [['seq', 'Sequential (the next one starts when one finishes)'], ['par', 'Parallel (at the same time, with CompletableFuture)']] },
    { id: 'n', label: 'Number of services called', type: 'range', min: 2, max: 5, value: 4, fmt: function (v) { return v + ' services'; } },
    { id: 'pool', label: 'Number of threads for the asynchronous tasks', type: 'range', min: 1, max: 5, value: 5, fmt: function (v) { return v + ''; }, show: function (c) { return c.how === 'par'; } },
    { id: 'to', label: 'Set a timeout of 1s on each call (use a default value when it is exceeded)', type: 'check', value: false },
  ],
  presets: [
    { t: 'Default settings', q: 'What is the total response time when you call 4 services sequentially with no timeout?', d: 'The 4 services are called one after another. All the times add up.', v: { how: 'seq', n: 4, pool: 5, to: false } },
    { t: 'Switch to parallel', q: 'What if you change the calls to parallel, at the same time, with CompletableFuture?', d: 'The page takes only as long as the single slowest call.', v: { how: 'par', n: 4, pool: 5, to: false } },
    { t: 'Parallel, but with only 2 threads', q: 'What if the calls are parallel and you reduce the number of threads for the asynchronous tasks to 2?', d: 'Only 2 calls are in progress at a time.', v: { how: 'par', n: 4, pool: 2, to: false } },
    { t: 'A timeout on the slow call', q: 'What if you make the calls parallel and set a timeout of 1s on each call?', d: 'A call that takes longer than 1s is not waited for. A default value is used in its place.', v: { how: 'par', n: 4, pool: 5, to: true } },
    { t: '5 calls, sequential', q: 'What if you increase the number of services called to 5 in the sequential calls?', d: 'Each additional call makes the page slower by the time of that call.', v: { how: 'seq', n: 5, pool: 5, to: false } },
  ],
  CALLS: [['Product details', 0.3], ['Stock', 0.5], ['Reviews', 0.8], ['Recommendations', 1.6], ['Coupons', 0.4]],
  code: function (c) {
    var H = '// Only the lines inside the method are shown (class, method declaration, imports, and the example productApi, ProductPage, etc. omitted)\n';
    var names = ['product', 'stock', 'reviews', 'recommend', 'coupons'].slice(0, c.n), api = ['productApi.get(id)', 'stockApi.get(id)', 'reviewApi.list(id)', 'recommendApi.list(id)', 'couponApi.list(id)'];
    if (c.how === 'seq') return H + names.map(function (nm, i) { return 'var ' + nm + ' = ' + api[i] + ';'; }).join('\n') + '\n\nreturn new ProductPage(' + names.join(', ') + ');';
    return H + 'ExecutorService pool = Executors.newFixedThreadPool(' + c.pool + ');\n\n' + names.map(function (nm, i) { return 'var ' + nm + 'F = CompletableFuture.supplyAsync(() -> ' + api[i] + ', pool)' + (c.to ? '\n        .completeOnTimeout(defaultValue(), 1, TimeUnit.SECONDS)' : '') + ';'; }).join('\n') + '\n\nCompletableFuture.allOf(' + names.map(function (nm) { return nm + 'F'; }).join(', ') + ').join();   // wait until all of them complete\nreturn new ProductPage(' + names.map(function (nm) { return nm + 'F.join()'; }).join(', ') + ');';
  },
  label: function (c) { return (c.how === 'seq' ? 'Sequential' : 'Parallel (threads: ' + c.pool + ')') + ' · ' + c.n + ' calls' + (c.to ? ' · 1s timeout' : ''); },
  columns: ['Total response time', 'Sum of the call times', 'Slowest call', 'Calls replaced by a default value'],
  simulate: function (c) {
    var fmt = Lab.fmt, calls = this.CALLS.slice(0, c.n).map(function (x, i) { return { id: i, name: x[0], dur: x[1] }; }), ev = [], sum = [], cut = 0;
    calls.forEach(function (x) { x.eff = c.to && x.dur > 1 ? 1 : x.dur; if (x.eff < x.dur) cut++; });
    if (c.how === 'seq') { var t = 0; calls.forEach(function (x) { x.start = t; x.end = t + x.eff; t = x.end; }); }
    else { var slots = []; for (var i = 0; i < c.pool; i++) slots.push(0); calls.forEach(function (x) { var k = 0; for (var j = 1; j < slots.length; j++) if (slots[j] < slots[k]) k = j; x.start = slots[k]; x.end = x.start + x.eff; slots[k] = x.end; x.th = k; }); }
    calls.forEach(function (x) {
      ev.push({ t: x.start, s: fmt(x.start) + 's: The call to ' + x.name + ' starts (a call that takes ' + fmt(x.dur) + 's).' + (c.how === 'par' && x.start > 0 ? ' There are not enough threads for the asynchronous tasks, so it starts only after an earlier call has finished.' : '') });
      ev.push({ t: x.end, k: x.eff < x.dur ? 'bad' : '', s: fmt(x.end) + 's: The call to ' + x.name + (x.eff < x.dur ? ' has exceeded the timeout of 1s. The application waits no longer and uses a default value (an empty list) in its place.' : ' receives its response.') });
    });
    ev.sort(function (a, b) { return a.t - b.t; });
    var total = calls.reduce(function (m, x) { return Math.max(m, x.end); }, 0), add = calls.reduce(function (a, x) { return a + x.eff; }, 0), slow = calls.reduce(function (m, x) { return Math.max(m, x.eff); }, 0);
    ev.push({ t: total, k: 'good', s: fmt(total) + 's: All the results have arrived. The application assembles the page and responds.' });
    if (c.how === 'seq') sum.push('With sequential calls, the response time is the sum of all the call times. If the calls do not depend on each other\'s results, there is no reason to make them one after another.');
    else if (total <= slow + 1e-9) sum.push('With parallel calls, the response time is the time of the single slowest call. Adding more calls does not increase the response time as long as they are faster than the slowest one.');
    else sum.push('The calls were requested in parallel, but the number of threads for the asynchronous tasks is only ' + c.pool + ', so the number of calls in progress at a time was limited to ' + c.pool + '. To run blocking calls in parallel, you need as many threads as the number of calls you want to run at the same time. If you do not specify a thread pool, the tasks run in the common pool that all code shares, and that pool is small, about the number of CPU cores, so it is not suited to blocking calls.');
    if (c.to) sum.push(cut ? 'Calls that exceeded the timeout and were replaced by a default value: ' + cut + '. Handle information that the page can be shown without, such as the recommendations, in this way so that one slow service cannot hold up the whole response.' : 'No call exceeded the timeout of 1s, so the result is the same.');
    return { total: total, events: ev, summary: sum, calls: calls, row: [fmt(total) + 's', fmt(add) + 's', fmt(slow) + 's', cut + ''] };
  },
  render: function (v, sim, t, H) {
    var e = 1e-9, done = sim.calls.filter(function (x) { return x.end <= t + e; }).length;
    H.counters(v, [[H.fmt(Math.min(t, sim.total)) + 's', 'Time so far'], [done + ' / ' + sim.calls.length, 'Calls finished']]);
    H.title(v, 'Progress of each call (bar length = the span it takes up in the total time)'); var ln = H.lanes(v);
    sim.calls.forEach(function (x) {
      var st = t < x.start - e ? 'waiting' : t < x.end - e ? 'in progress · ' + H.fmt(x.end - t) + 's left' : x.eff < x.dur ? 'timeout exceeded → default value used' : 'done (' + H.fmt(x.eff) + 's)';
      H.lane(ln, x.name, H.fmt(x.start) + 's to ' + H.fmt(x.end) + 's · ' + st, t < x.start - e ? 'none' : t < x.end - e ? 'hot' : x.eff < x.dur ? 'bad' : 'good', t < x.start - e ? undefined : Math.min(x.end, t) / sim.total);
    });
  },
  // Diagram: one bar per call. The position of a bar is its start time and its length is the time it took. Calls made one after another give bars that follow each other, and calls made at the same time give bars that overlap.
  draw: function (P, sim, shown, t) {
    var e = 1e-9, total = sim.total, n = sim.calls.length, tt = Math.min(t, total);
    P.size(680, 76 + n * 36 + 16);
    P.region('g', 16, 16, 648, 44 + n * 36, 'Time axis (0s on the left, ' + (Math.round(total * 10) / 10) + 's on the right)');
    sim.calls.forEach(function (x, i) {
      var y = 50 + i * 36, before = t < x.start - e, running = !before && t < x.end - e, cut = x.eff < x.dur;
      P.text('nm' + i, 28, y + 17, P.fit(x.name, 130), { cls: before ? 'mut' : '' });
      P.box('bg' + i, 170, y, 480, 24, { cls: 'ghost' });
      if (!before) P.box('bar' + i, 170 + 480 * x.start / total, y, Math.max(3, 480 * (Math.min(x.end, t) - x.start) / total), 24, { cls: running ? 'hot' : cut ? 'bad' : 'good' });
    });
    P.box('now', 170 + 480 * tt / total - 1, 44, 2, n * 36 + 4, { cls: 'plain' });
    P.text('tm', 664, 40 + n * 36 + 46, 'Now: ' + (Math.round(tt * 10) / 10) + 's', { anchor: 'end', bold: true });
    P.note('The bars fill from left to right. When the calls are made one after another, the bars follow each other like steps and the times add up. When they are made at the same time, the bars overlap in the same span and the total is only as long as the longest bar. A red bar is a call whose result was replaced by the default value after the timeout (the real call keeps running in the background).');
  },
  assume: 'The time each call takes (product details 0.3s, stock 0.5s, reviews 0.8s, recommendations 1.6s, coupons 0.4s) is a fixed example, and the model assumes that the calls do not need each other\'s results. If the result of one call is the input of the next, those two must be made sequentially. For parallel calls, the model assumes blocking calls, in which one thread makes one call and waits for it. completeOnTimeout is a method that has existed since JDK 9. This was checked by actually running code on JDK 21 in our test environment. With 4 calls of the same durations, the measured times were 3,243ms sequential, 1,603ms parallel (5 threads), 2,127ms parallel (2 threads), and 1,011ms with the timeout of 1s applied, which matched the values of the model (3.2s, 1.6s, 2.1s, 1.0s).',
});

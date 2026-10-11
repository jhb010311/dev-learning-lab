Lab.register({
  id: 'blocking', nav: 'Blocking, non-blocking, and virtual threads', cat: 'Concurrency', mode: 'time',
  title: 'What a thread does while it waits',
  intro: 'Every request spends some time waiting for a response from a database or an external API. Compare three approaches: holding on to the thread during that time (blocking), releasing the thread and continuing when the response arrives (non-blocking), and virtual threads, where you write the code in the blocking style but the operating system thread is released while the code waits.',
  terms: ['Blocking and non-blocking', 'Synchronous and asynchronous', 'Virtual thread', 'Spring WebFlux and the reactive stack', 'Event loop', 'Tomcat\'s threading model'], ranks: ['webflux', 'was', 'javaver'],
  controls: [
    { id: 'model', label: 'How requests are handled', type: 'select', value: 'pool', options: [['pool', 'One thread per request (Spring MVC)'], ['loop', 'Event loop (Spring WebFlux)'], ['virtual', 'Virtual threads (JDK 21)']] },
    { id: 'th', label: 'Thread pool size', type: 'range', min: 2, max: 10, value: 4, fmt: function (v) { return v + ' threads'; }, show: function (c) { return c.model === 'pool'; } },
    { id: 'n', label: 'Requests that arrive at the same time', type: 'range', min: 1, max: 30, value: 12, fmt: function (v) { return v + ''; } },
    { id: 'w', label: 'Time each request waits for an external response', type: 'select', value: '2', options: [['0.5', '0.5s'], ['1', '1s'], ['2', '2s']] },
    { id: 'block', label: 'Make blocking calls on the event loop (JDBC, for example)', type: 'check', value: false, show: function (c) { return c.model === 'loop'; } },
  ],
  presets: [
    { t: 'Default settings', d: '4 threads and 12 requests. The threads are tied up waiting, so the later requests wait in line.', v: { model: 'pool', th: 4, n: 12, w: '2', block: false } },
    { t: 'With an event loop', d: '2 threads keep all 12 requests in progress at the same time.', v: { model: 'loop', th: 4, n: 12, w: '2', block: false } },
    { t: 'Blocking calls on the event loop', d: 'The 2 threads are tied up, so only 2 requests make progress at a time. This is the worst combination.', v: { model: 'loop', th: 4, n: 12, w: '2', block: true } },
    { t: 'Virtual threads', d: 'The code stays in the blocking style, yet the requests are in progress at the same time.', v: { model: 'virtual', th: 4, n: 12, w: '2', block: false } },
    { t: 'A larger thread pool', d: '10 threads and 30 requests. Even with more threads, requests wait in line just the same when their number grows as much.', v: { model: 'pool', th: 10, n: 30, w: '2', block: false } },
  ],
  code: function (c) {
    if (c.model === 'pool') return '// Spring MVC: one thread handles each request from start to finish\n// server.tomcat.threads.max=' + c.th + '\n@GetMapping("/orders/{id}")\nOrderDto get(@PathVariable long id) {\n    Order order = orderRepository.findById(id);   // the thread stops and waits until the response arrives\n    Delivery d = deliveryClient.track(order);     // (' + c.w + 's)\n    return OrderDto.of(order, d);\n}';
    if (c.model === 'loop') return '// Spring WebFlux: 2 event loop threads\n@GetMapping("/orders/{id}")\nMono<OrderDto> get(@PathVariable long id) {\n' + (c.block ? '    Order order = jdbcRepository.findById(id);    // a blocking call! the event loop stops\n    return Mono.just(OrderDto.of(order));\n' : '    return orderRepository.findById(id)           // does not wait; only registers "what to do next when this completes"\n        .flatMap(order -> deliveryClient.track(order)\n            .map(d -> OrderDto.of(order, d)));\n') + '}';
    return '// spring.threads.virtual.enabled=true  (Spring Boot 3.2+, JDK 21)\n@GetMapping("/orders/{id}")\nOrderDto get(@PathVariable long id) {\n    Order order = orderRepository.findById(id);   // the code stays in the blocking style\n    Delivery d = deliveryClient.track(order);     // the OS thread is released while this waits\n    return OrderDto.of(order, d);\n}';
  },
  label: function (c) { return { pool: 'Thread pool of ' + c.th + ' threads', loop: 'Event loop' + (c.block ? ' + blocking calls' : ''), virtual: 'Virtual threads' }[c.model] + ' · requests: ' + c.n + ' · wait ' + c.w + 's'; },
  columns: ['Total time', 'Average response time', 'OS threads used', 'Requests in progress at once (peak)'],
  simulate: function (c) {
    var w = +c.w, fmt = Lab.fmt, reqs = [], ev = [], osT = c.model === 'pool' ? c.th : 2, serial = c.model === 'pool' || (c.model === 'loop' && c.block), slots = [], sum = [];
    for (var i = 0; i < osT; i++) slots.push(0);
    for (var r = 0; r < c.n; r++) {
      var rq = { id: r + 1 };
      if (serial) { var k = 0; for (var j = 1; j < slots.length; j++) if (slots[j] < slots[k]) k = j; rq.start = slots[k]; rq.end = rq.start + w; rq.th = k; slots[k] = rq.end; }
      else { rq.start = 0; rq.end = w; rq.th = r % osT; }
      reqs.push(rq);
    }
    var total = reqs.reduce(function (m, x) { return Math.max(m, x.end); }, 0), peak = serial ? Math.min(c.n, osT) : c.n;
    if (serial) {
      ev.push({ t: 0, k: c.n > osT ? 'bad' : '', s: '0.0s: Requests arrive (' + c.n + ' in total). ' + (c.model === 'pool' ? (peak === 1 ? 'One thread takes the request.' : peak + ' threads take one request each.') : (peak === 1 ? 'One event loop thread starts handling the request.' : 'The 2 event loop threads each start handling one request.')) + (c.n > osT ? ' The rest (' + (c.n - osT) + ') wait until a thread is free.' : '') });
      ev.push({ t: 0.05, k: c.model === 'loop' ? 'bad' : '', s: '0.1s: Each thread waits for an external response. ' + (c.model === 'pool' ? 'While it waits, the thread does no work, but it cannot take another request either (blocking).' : 'The event loop threads are tied up in blocking calls. An event loop thread is supposed to switch among a great many requests, but while it is stopped, no other request makes any progress.') });
      var waves = []; reqs.forEach(function (x) { if (waves.indexOf(x.end) < 0) waves.push(x.end); });
      waves.forEach(function (t2) { var done = reqs.filter(function (x) { return x.end === t2; }).length, left = reqs.filter(function (x) { return x.start >= t2; }).length; ev.push({ t: t2, s: fmt(t2) + 's: The responses arrive. Requests finished: ' + done + '.' + (left ? ' The freed threads take requests that were waiting (still waiting: ' + Math.max(0, left - done) + ').' : '') }); });
    } else {
      ev.push({ t: 0, s: '0.0s: Requests arrive (' + c.n + ' in total).' + (c.model === 'loop' ? ' The 2 event loop threads quickly take the requests one at a time. For each one, a thread sends the external call, only registers "what to do next when the response arrives", and moves straight on to the next request.' : ' A virtual thread is created for each request. A virtual thread is not an OS thread but a lightweight object managed by the JVM, so even thousands of them are not a burden.') });
      ev.push({ t: 0.05, k: 'good', s: '0.1s: Every request (' + c.n + ' in total) is waiting for an external response. ' + (c.model === 'loop' ? 'The waiting is left to the operating system, so the event loop threads are free.' : 'When a virtual thread stops in a blocking call, the JVM unmounts that virtual thread from its OS thread. The OS thread can then run another virtual thread.') });
      ev.push({ t: w, k: 'good', s: fmt(w) + 's: The responses arrive. ' + (c.model === 'loop' ? 'The event loop runs the next steps that were registered, one after another, and the requests (' : 'The virtual threads are mounted on OS threads again and continue running, and the requests (') + c.n + ' in total) finish at almost the same time.' });
    }
    if (c.model === 'pool') sum.push('In the blocking style, the number of requests that can be handled at the same time cannot exceed the number of threads. The longer the wait, the longer the threads are tied up. The code is simple and easy to debug, which is why most services use this style.');
    if (c.model === 'loop' && !c.block) sum.push('The non-blocking style does not hold a thread while waiting, so a small number of threads keeps many requests in progress. In return, the whole call path (the database driver, the HTTP client) must be non-blocking, and the code becomes a chain of callbacks, which is hard to learn and to debug.');
    if (c.model === 'loop' && c.block) sum.push('There are very few event loop threads, so making a blocking call on one of them is far worse than even the thread pool approach. Calling JDBC or a blocking HTTP client as it is while using WebFlux is a typical mistake.');
    if (c.model === 'virtual') sum.push('Virtual threads keep the simple code structure that gives each request its own thread, and they give up the OS thread while waiting. They are effective for work that waits a lot, and they do not make computation that keeps using the CPU any faster. Because the number of threads can grow into the thousands, another resource such as the database connection pool reaches its limit first.');
    return { total: total, events: ev, summary: sum, reqs: reqs, osT: osT, serial: serial, w: w, row: [fmt(total) + 's', fmt(reqs.reduce(function (a, x) { return a + x.end; }, 0) / reqs.length) + 's', osT + '', peak + ''] };
  },
  render: function (v, sim, t, H) {
    var c = sim.c, e = 1e-9, run = sim.reqs.filter(function (r) { return r.start <= t + e && r.end > t + e; }), done = sim.reqs.filter(function (r) { return r.end <= t + e; }).length, wait = sim.reqs.filter(function (r) { return r.start > t + e; });
    H.counters(v, [[run.length, 'In progress (waiting for a response)'], [wait.length, 'Waiting in line, not even started'], [done, 'Completed']]);
    H.title(v, 'The ' + sim.osT + ' OS threads' + (c.model === 'pool' ? ' (Tomcat thread pool)' : c.model === 'loop' ? ' (event loop)' : ' (the carriers of the virtual threads)')); var ln = H.lanes(v);
    for (var i = 0; i < sim.osT; i++) {
      if (sim.serial) { var r = run.filter(function (x) { return x.th === i; })[0]; if (r) H.lane(ln, 'Thread ' + (i + 1), 'tied up waiting for the response to request ' + r.id + ' · ' + H.fmt(r.end - t) + 's left', c.model === 'loop' ? 'bad' : 'hot', (t - r.start) / sim.w); else H.lane(ln, 'Thread ' + (i + 1), done === c.n ? 'idle' : 'waiting for work', ''); }
      else H.lane(ln, 'Thread ' + (i + 1), run.length ? 'free (the waiting is not done by a thread)' : 'idle', run.length ? 'good' : '');
    }
    if (!sim.serial) { H.title(v, c.model === 'virtual' ? 'Virtual threads (one per request, now unmounted from the OS threads and waiting)' : 'Requests waiting for a response (only registered, holding no thread)'); H.slots(v, run.map(function (r) { return ['Request ' + r.id, 'q']; }), done ? 'All finished' : 'None', true); }
  },
  // Diagram: the position of a request (a numbered box) shows whether it waits while holding an OS thread or waits without a thread.
  draw: function (P, sim, shown, t) {
    var c = sim.c, e = 1e-9, T = sim.osT, H = Math.max(310, 58 + T * 30), run = sim.reqs.filter(function (r) { return r.start <= t + e && r.end > t + e; }), done = sim.reqs.filter(function (r) { return r.end <= t + e; }).length, wait = sim.reqs.filter(function (r) { return r.start > t + e; });
    P.size(680, H + 66);
    P.region('wait', 16, 16, 184, H, 'Requests with no thread yet');
    P.region('thr', 216, 16, 262, H, 'The ' + T + ' OS threads');
    P.region('io', 494, 16, 170, H, 'Waiting without a thread');
    if (sim.serial) wait.slice(0, 30).forEach(function (r, j) { P.box('rq' + r.id, 26 + (j % 3) * 56, 50 + Math.floor(j / 3) * 26, 52, 22, { cls: 'wait', sub: '#' + r.id, center: true }); });
    for (var i = 0; i < T; i++) {
      var y = 50 + i * 30, r = sim.serial ? run.filter(function (x) { return x.th === i; })[0] : null;
      P.box('os' + i, 228, y, 238, 26, { cls: r ? (c.model === 'loop' ? 'bad' : 'hot') : !sim.serial && run.length ? 'good' : 'plain', title: 'Thread ' + (i + 1), right: r ? '' : !sim.serial && run.length ? 'free' : done === c.n ? 'idle' : 'waiting for work' });
      if (r) P.box('rq' + r.id, 318, y + 3, 142, 20, { cls: 'wait', sub: 'Request ' + r.id + ' waiting', center: true });
    }
    if (!sim.serial) run.slice(0, 30).forEach(function (r, j) { P.box('rq' + r.id, 502 + (j % 3) * 52, 50 + Math.floor(j / 3) * 26, 48, 22, { cls: 'good', sub: String(r.id), center: true }); });
    P.box('dn', 16, H + 30, 648, 34, { cls: 'plain', title: 'Completed requests', right: done + ' / ' + c.n + '' });
    P.note(sim.serial ? 'Each request holds one thread while it waits for its response. When every thread is tied up, the remaining requests wait in line on the left.' : 'While a request waits, it releases its thread (the numbers in the area on the right are request numbers).');
  },
  assume: 'This model ignores the CPU time spent in handling a request and assumes that a request consists only of waiting for an external response. The number of OS threads that run the event loop and that carry the virtual threads is fixed at 2 (the real default follows the number of CPU cores). Virtual threads were finalized in JDK 21. In JDK 21 to 23 there was a limitation that a virtual thread waiting inside a synchronized block could not release its OS thread, and this was resolved in JDK 24. The times were actually measured on JDK 21 on this PC, with the wait shortened to 0.2s. With 12 requests, a pool of 4 threads took 619ms (handled in three rounds), blocking on 2 threads took 1,227ms, virtual threads took 216ms on 2 OS threads, and the approach that only registers the wait took 201ms on 2 threads. These are the same ratios as in the model (6s, 12s, 2s, 2s). The measurement did not run Spring WebFlux itself. It reproduced the same principle with the JDK alone.',
});

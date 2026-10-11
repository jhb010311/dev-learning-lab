Lab.register({
  id: 'cache', nav: 'Caching and TTL', cat: 'High traffic', mode: 'time',
  title: 'How much does a cache reduce database queries, and when do requests pile up again?',
  intro: 'One popular product is requested continuously for 30 seconds. If the cache has the value, the request does not go to the database. If it does not, the request reads the value from the database and stores it in the cache (cache-aside). A value disappears from the cache when its TTL passes. Change the TTL, the request rate, and the database query time, and watch the cache hit rate and the requests that rush to the database at the moment the value expires.',
  terms: ['Cache', 'Cache-aside pattern', 'TTL (time to live)', 'Cache stampede', 'Redis', 'Distributed lock'], ranks: ['cache', 'traffic', 'nosql'],
  controls: [
    { id: 'ttl', label: 'Cache TTL', type: 'select', value: '10', options: [['0', 'No cache'], ['5', '5s'], ['10', '10s'], ['30', '30s or more (never expires)']] },
    { id: 'rps', label: 'Requests per second', type: 'range', min: 1, max: 20, value: 5, fmt: function (v) { return v + ''; } },
    { id: 'dbt', label: 'Time for one database query', type: 'select', value: '1', options: [['0.2', '0.2s'], ['1', '1s'], ['2', '2s']] },
    { id: 'lock', label: 'When the cache is empty, let only one request query the database (lock)', type: 'check', value: false, show: function (c) { return c.ttl !== '0'; } },
  ],
  presets: [
    { t: 'Default settings', d: 'TTL 10s. Each time the value expires, several requests go to the database at the same time.', v: { ttl: '10', rps: 5, dbt: '1', lock: false } },
    { t: 'Without a cache', d: 'Every request queries the database.', v: { ttl: '0', rps: 5, dbt: '1', lock: false } },
    { t: 'Many requests and a slow database', d: 'At the moment of expiration, dozens of requests hit the database at the same time (a cache stampede).', v: { ttl: '10', rps: 20, dbt: '2', lock: false } },
    { t: 'Same situation with the lock', d: 'Only one request goes to the database, and the others wait for its result.', v: { ttl: '10', rps: 20, dbt: '2', lock: true } },
    { t: 'Shorten the TTL to 5s', d: 'The data is fresher, but there are more database queries.', v: { ttl: '5', rps: 5, dbt: '1', lock: false } },
    { t: 'A long TTL', d: 'The database is queried only when the cache is first filled. But a change in the source goes unnoticed for a long time.', v: { ttl: '30', rps: 5, dbt: '1', lock: false } },
  ],
  code: function (c) {
    if (c.ttl === '0') return 'public Product getProduct(long id) {\n    return productRepository.findById(id);   // queries the database every time (' + c.dbt + 's)\n}';
    return 'public Product getProduct(long id) {\n    String key = "product:" + id;\n    Product cached = redis.get(key);\n    if (cached != null) return cached;          // cache hit\n\n' + (c.lock && c.ttl !== '0' ? '    if (!lock.tryLock(key)) {                   // if another request is already querying\n        return waitAndReadCache(key);           // wait for its result\n    }\n' : '') + '    Product p = productRepository.findById(id); // database query (' + c.dbt + 's)\n    redis.set(key, p, Duration.ofSeconds(' + c.ttl + '));  // TTL ' + c.ttl + 's\n    return p;\n}';
  },
  label: function (c) { return (c.ttl === '0' ? 'No cache' : 'TTL ' + c.ttl + 's') + ' · ' + c.rps + ' requests/s · DB query ' + c.dbt + 's' + (c.lock && c.ttl !== '0' ? ' · lock' : ''); },
  columns: ['Requests', 'Cache hit rate', 'Database queries', 'Peak simultaneous database queries', 'Average response time'],
  simulate: function (c) {
    var ttl = +c.ttl, dbt = +c.dbt, lock = c.lock && ttl > 0, DUR = 30, fmt = Lab.fmt, reqs = [], ev = [], sets = [], expireAt = -1, has = false, loadDone = -1, grp = null, queries = [];
    function applySets(t) { while (sets.length && sets[0] <= t + 1e-9) { var f = sets.shift(); has = true; expireAt = f + ttl; if (grp) { ev.push({ t: f, k: grp.n > 1 ? 'bad' : '', s: fmt(f) + 's: The value read from the database was stored in the cache (TTL ' + ttl + 's). ' + (grp.n > 1 ? 'Before it was stored, ' + grp.n + ' requests, starting at ' + fmt(grp.start) + 's, all failed to find the value in the cache and each queried the database.' : 'One request queried the database to fill this value.') + (grp.w ? ' Because of the lock, ' + grp.w + (grp.w === 1 ? ' request' : ' requests') + ' did not go to the database and waited for this result.' : '') }); grp = null; } } }
    var total = DUR * c.rps;
    for (var i = 0; i < total; i++) {
      var t = Math.round(i / c.rps * 1000) / 1000, r = { t: t }; reqs.push(r);
      if (ttl === 0) { r.kind = 'db'; r.done = t + dbt; queries.push([t, r.done]); continue; }
      applySets(t);
      if (has && t >= expireAt - 1e-9) { has = false; ev.push({ t: t, s: fmt(t) + 's: The TTL has passed, so the value in the cache was removed. From now on, requests that arrive will not find the value in the cache.' }); }
      if (has) { r.kind = 'hit'; r.done = t + 0.01; continue; }
      if (lock && loadDone > t) { r.kind = 'wait'; r.done = loadDone; if (grp) grp.w = (grp.w || 0) + 1; continue; }
      r.kind = 'db'; r.done = t + dbt; queries.push([t, r.done]); sets.push(r.done); sets.sort(function (a, b) { return a - b; }); loadDone = r.done;
      if (!grp) { grp = { start: t, n: 1 }; ev.push({ t: t, s: fmt(t) + 's: The cache has no value (' + (i === 0 ? 'the first request' : 'right after expiration') + '). The request goes to the database to query it. It takes ' + dbt + 's for the result to come back.' }); } else grp.n++;
    }
    applySets(Infinity);
    var hits = reqs.filter(function (r) { return r.kind === 'hit'; }).length, dbq = queries.length, waits = reqs.filter(function (r) { return r.kind === 'wait'; }).length;
    var peak = 0; queries.forEach(function (q) { var n = queries.filter(function (x) { return x[0] <= q[0] + 1e-9 && x[1] > q[0] + 1e-9; }).length; if (n > peak) peak = n; });
    var avg = reqs.reduce(function (a, r) { return a + (r.done - r.t); }, 0) / reqs.length, rate = Math.round(hits / reqs.length * 100);
    if (ttl === 0) ev.push({ t: 0, s: '0.0s: There is no cache. Every request queries the database.' });
    ev.sort(function (a, b) { return a.t - b.t; });
    var sum = ['Of ' + reqs.length + ' requests, ' + hits + ' (' + rate + '%) were answered directly from the cache, and the database was queried ' + dbq + (dbq === 1 ? ' time' : ' times') + '. The most database queries in flight at one moment was ' + peak + ', and the average response time was ' + (Math.round(avg * 100) / 100) + 's.'];
    if (ttl === 0) sum.push('The same product was requested ' + reqs.length + ' times, and the database was read ' + dbq + ' times. The more often data is read and the less often it changes, the more a cache helps.');
    else if (peak > 1 && !lock) sum.push('At the moment of expiration, all the requests that arrived before the cache was filled again (during ' + dbt + 's) went to the database. The more requests there are and the slower the database query is, the bigger the pile-up. This is a cache stampede. You reduce it with a lock that lets only one request query the database, by refreshing the value before it expires, or by giving each key a slightly different TTL.');
    else if (lock) sum.push('With the lock, only one request queried the database each time the cache became empty. This protected the database from the load, but ' + waits + (waits === 1 ? ' request' : ' requests') + ' had to wait until that query finished. With several servers, you need a distributed lock that all the servers share.');
    if (ttl > 0) sum.push('The longer the TTL, the fewer the database queries, but even when the source data changes, the cache keeps returning the old value for up to the TTL. How old a value you can accept is the criterion for choosing the TTL.');
    return { total: DUR, events: ev, summary: sum, reqs: reqs, queries: queries, sets: null, ttl: ttl, row: [String(reqs.length), rate + '%', String(dbq), String(peak), (Math.round(avg * 100) / 100) + 's'] };
  },
  render: function (v, sim, t, H) {
    var c = sim.c, done = sim.reqs.filter(function (r) { return r.t <= t + 1e-9; }), hits = done.filter(function (r) { return r.kind === 'hit'; }).length, dbq = sim.queries.filter(function (q) { return q[0] <= t + 1e-9; }).length;
    var flying = sim.queries.filter(function (q) { return q[0] <= t + 1e-9 && q[1] > t + 1e-9; }).length;
    H.counters(v, [[done.length, 'Requests received'], [hits, 'Cache hits'], [dbq, 'Database queries'], [done.length ? Math.round(hits / done.length * 100) + '%' : '-', 'Hit rate']]);
    var ln = H.lanes(v), lastHit = done.filter(function (r) { return r.kind === 'hit'; }).pop(), lastReq = done[done.length - 1];
    var cached = lastReq && lastReq.kind === 'hit';
    H.lane(ln, 'Cache', sim.ttl === 0 ? 'Not used' : cached ? 'Has the value · answering requests right away' : flying ? 'No value · waiting for the database result' : done.length ? 'No value' : 'Empty', sim.ttl === 0 ? 'none' : cached ? 'good' : 'bad');
    H.lane(ln, 'DB', flying ? 'Queries in progress: ' + flying : 'Idle', flying > 3 ? 'bad' : flying ? 'hot' : '');
    H.title(v, 'Database queries per second (1 box = 1 second)');
    var items = []; for (var s = 0; s < 30; s++) { var n = sim.queries.filter(function (q) { return q[0] >= s - 1e-9 && q[0] < s + 1 - 1e-9 && q[0] <= t + 1e-9; }).length; items.push([s < t ? String(n) : '', s >= t ? '' : n === 0 ? 'd' : n === 1 ? 'q' : 'r']); }
    H.slots(v, items, null, true);
    H.text(v, 'Green is a second with no database query (all answered from the cache), blue is a second with 1 query, and red is a second when 2 or more queries piled up.');
  },
  // Diagram: A request looks at the cache first and goes to the database only when the value is missing. The row below shows the number of queries that reached the database in each second.
  draw: function (P, sim, shown, t) {
    var c = sim.c, e = 1e-9, done = sim.reqs.filter(function (r) { return r.t <= t + e; }), hits = done.filter(function (r) { return r.kind === 'hit'; }).length, flying = sim.queries.filter(function (q) { return q[0] <= t + e && q[1] > t + e; }).length, lastReq = done[done.length - 1], off = sim.ttl === 0, hit = lastReq && lastReq.kind === 'hit';
    P.size(680, 290);
    P.box('app', 16, 40, 170, 60, { cls: 'wait', title: 'Application', sub: 'Received: ' + done.length });
    P.box('ca', 255, 40, 170, 60, { cls: off ? 'ghost' : hit ? 'good' : done.length ? 'bad' : 'plain', title: off ? 'Cache not used' : 'Cache', sub: off ? ' ' : hit ? 'Has value: replies' : flying ? 'Waiting for DB' : done.length ? 'No value' : 'Empty' });
    P.box('db', 494, 40, 170, 60, { cls: flying > 3 ? 'bad' : flying ? 'hot' : 'plain', title: 'DB', sub: flying ? 'In progress: ' + flying : 'Idle' });
    if (lastReq) { P.arrow('a1', 'app:r', 'ca:l', { cls: hit ? 'good' : '', label: hit ? 'Hit' : '' }); if (!hit && flying) P.arrow('a2', 'ca:r', 'db:l', { cls: flying > 3 ? 'bad' : 'hot', label: 'DB queries: ' + flying }); }
    P.region('sec', 16, 128, 648, 96, 'Queries that reached the database each second (1 box = 1 second)');
    for (var k = 0; k < 30; k++) { var n = sim.queries.filter(function (q) { return q[0] >= k - e && q[0] < k + 1 - e && q[0] <= t + e; }).length, past = k < t; P.box('s' + k, 26 + k * 21, 164, 20, 40, { cls: !past ? 'ghost' : n === 0 ? 'good' : n === 1 ? 'wait' : 'bad', sub: past ? String(n) : undefined, center: true }); }
    P.box('rate', 16, 240, 648, 34, { cls: 'plain', title: 'Cache hit rate', right: done.length ? Math.round(hits / done.length * 100) + '% (' + hits + ' / ' + done.length + ')' : '-' });
    P.note('A request looks at the cache first, and if the value is there, it ends there (green arrow). An arrow to the database appears only when the value is missing. In the row below, green is a second with no database query, and red is a second when several queries piled up.');
  },
  assume: 'Only one key (one popular product) is handled, and requests are assumed to arrive at regular intervals. The cache response time is set to 0.01s. The eviction policy, which removes old keys when the cache is full, is not covered here. With the lock, a waiting request is simplified to receive the value from the cache at the moment the query finishes. The numbers are a model that shows how the behavior works, and they are not values measured on a real Redis.',
});

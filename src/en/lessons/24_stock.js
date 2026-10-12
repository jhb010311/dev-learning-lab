Lab.register({
  id: 'stock', nav: 'Stock decrement and locks', cat: 'Database', mode: 'step',
  title: 'What if many orders arrive at once for 3 items in stock?',
  intro: 'Several requests run "check the stock, subtract 1, create an order" at the same time. With no safeguard, more items are sold than are in stock, or the stock number no longer matches reality. A lock is the typical safeguard against such concurrent changes, and this lab compares the results of several ways of locking and of preventing the problem without a lock.',
  terms: ['Pessimistic locking', 'Optimistic locking (@Version)', 'Shared locks and exclusive locks', 'Distributed lock', 'Race condition'], ranks: ['concurrency', 'traffic', 'dbengine'],
  controls: [
    { id: 'how', label: 'How concurrent updates are handled', type: 'select', value: 'none', options: [['none', 'Nothing (read, then update)'], ['pess', 'Pessimistic locking (SELECT ... FOR UPDATE)'], ['opt', 'Optimistic locking (@Version)'], ['atomic', 'One UPDATE statement with a condition'], ['dist', 'Distributed lock (Redis)']] },
    { id: 's', label: 'Initial stock', type: 'range', min: 1, max: 5, value: 3, fmt: function (v) { return v + (v === 1 ? ' item' : ' items'); } },
    { id: 'n', label: 'Orders arriving at the same time', type: 'range', min: 2, max: 6, value: 4, fmt: function (v) { return v + ' orders'; } },
  ],
  presets: [
    { t: 'Default settings', q: 'What happens when 4 orders arrive at the same time for 3 items in stock, with only a read followed by an update?', d: 'No safeguard. With 3 items in stock, all 4 orders succeed.', v: { how: 'none', s: 3, n: 4 } },
    { t: 'Pessimistic locking', q: 'What if you handle concurrent updates with pessimistic locking?', d: 'Only one request at a time reads and changes the stock row. The others wait in line.', v: { how: 'pess', s: 3, n: 4 } },
    { t: 'Optimistic locking', q: 'What if you handle concurrent updates with optimistic locking?', d: 'Everyone goes ahead, and when saving, a request fails if someone else changed the row first.', v: { how: 'opt', s: 3, n: 4 } },
    { t: 'UPDATE with a condition', q: 'What if you handle concurrent updates with one UPDATE statement with a condition?', d: 'The check and the decrement are combined into one SQL statement.', v: { how: 'atomic', s: 3, n: 4 } },
    { t: 'Many orders with optimistic locking', q: 'What if you use optimistic locking (@Version) with an initial stock of 5 items and 6 orders at the same time?', d: '6 requests compete. Look at the number of retries.', v: { how: 'opt', s: 5, n: 6 } },
  ],
  code: function (c) {
    if (c.how === 'none') return '@Transactional\npublic void order(long productId) {\n    Product p = productRepository.findById(productId).orElseThrow();\n    if (p.getStock() <= 0) throw new SoldOutException();\n    p.setStock(p.getStock() - 1);        // subtract 1 from the value that was read\n    orderRepository.save(new Order(productId));\n}';
    if (c.how === 'pess') return 'interface ProductRepository {\n    @Lock(LockModeType.PESSIMISTIC_WRITE)      // SELECT ... FOR UPDATE\n    @Query("select p from Product p where p.id = :id")\n    Optional<Product> findByIdForUpdate(long id);\n}\n\n@Transactional\npublic void order(long productId) {\n    Product p = productRepository.findByIdForUpdate(productId).orElseThrow();\n    if (p.getStock() <= 0) throw new SoldOutException();\n    p.setStock(p.getStock() - 1);\n    orderRepository.save(new Order(productId));\n}                                              // the lock is released at commit';
    if (c.how === 'opt') return '@Entity class Product {\n    @Id Long id;\n    int stock;\n    @Version Long version;                     // increases by 1 on every update\n}\n\n// The SQL that runs\n// UPDATE product SET stock = ?, version = version + 1\n//  WHERE id = ? AND version = ?   -- the version when it was read\n// If 0 rows were changed, an exception is thrown -> read again and retry';
    if (c.how === 'atomic') return '@Modifying\n@Query("update Product p set p.stock = p.stock - 1 " +\n       "where p.id = :id and p.stock > 0")\nint decrease(long id);                         // returns the number of rows changed\n\n@Transactional\npublic void order(long productId) {\n    if (productRepository.decrease(productId) == 0) {\n        throw new SoldOutException();\n    }\n    orderRepository.save(new Order(productId));\n}';
    return 'public void order(long productId) {\n    RLock lock = redisson.getLock("stock:" + productId);\n    if (!lock.tryLock(3, 5, TimeUnit.SECONDS)) {   // wait 3 seconds, released automatically after 5\n        throw new BusyException();\n    }\n    try {\n        orderService.orderInTx(productId);       // read -> check -> decrease (transaction)\n    } finally {\n        lock.unlock();                           // released after the commit has finished\n    }\n}';
  },
  label: function (c) { return { none: 'No safeguard', pess: 'Pessimistic locking', opt: 'Optimistic locking', atomic: 'Conditional UPDATE', dist: 'Distributed lock' }[c.how] + ' · stock ' + c.s + ' · orders ' + c.n; },
  columns: ['Orders created', 'Stock left in the DB', 'Do stock and orders match?', 'Waits', 'Retries'],
  simulate: function (c) {
    var S = c.s, N = c.n, stock = S, ver = 0, ev = [], st = [], orders = 0, sold = 0, waits = 0, retries = 0, sum = [];
    for (var i = 0; i < N; i++) st.push('Arrived');
    function push(s, k, hot) { ev.push({ s: s, k: k, snap: { stock: stock, ver: ver, st: st.slice(), orders: orders, hot: hot, waits: waits, retries: retries } }); }
    if (c.how === 'none') {
      for (var a = 0; a < N; a++) { st[a] = 'Read stock ' + S; push('Request ' + (a + 1) + ': Reads the stock. It is ' + S + '. This is greater than 0, so the request goes ahead with the order.' + (a > 0 ? ' The earlier requests had not saved yet, so this one read the same value.' : ''), '', a); }
      for (var b = 0; b < N; b++) { stock = S - 1; orders++; st[b] = 'Order placed'; push('Request ' + (b + 1) + ': Saves the value it read (' + S + ') minus 1 (' + (S - 1) + ') as the stock, and creates the order.' + (b > 0 ? ' It overwrote the value that an earlier request saved with the same value. The stock did not go down, but one more order was created.' : ''), b > 0 ? 'bad' : '', b); }
      sum.push(orders + ' orders were created, but the stock in the DB went down by only 1, from ' + S + ' to ' + stock + '.' + (N > S ? ' ' + (N - S) + (N - S === 1 ? ' order was' : ' orders were') + ' sold beyond the stock.' : ' The stock number no longer matches the number of items that will actually go out.'));
      sum.push('This happens because another request can cut in between the read and the update. @Transactional alone does not prevent it. When requests that read the same value overwrite each other\'s changes, some of the changes are lost.');
    }
    if (c.how === 'pess' || c.how === 'dist') {
      var lockName = c.how === 'pess' ? 'the exclusive lock on the stock row' : 'the lock in Redis';
      for (var p = 0; p < N; p++) {
        if (p === 0) { for (var w = 1; w < N; w++) st[w] = 'Waiting for lock'; waits = N - 1; }
        st[p] = 'Holds lock'; push('Request ' + (p + 1) + ': Acquires ' + lockName + '.' + (p === 0 && N > 1 ? ' The other ' + (N - 1) + (N - 1 === 1 ? ' request waits' : ' requests wait') + ' until the lock is released.' : '') + ' Reading the stock gives ' + stock + '.', '', p);
        if (stock > 0) { stock--; orders++; sold++; st[p] = 'Order placed'; push('Request ' + (p + 1) + ': Decreases the stock to ' + stock + ', creates the order, and commits. The lock is released.', 'good', p); }
        else { st[p] = 'Rejected (sold out)'; push('Request ' + (p + 1) + ': The stock is 0, so the request is handled as sold out, and it releases the lock.', '', p); }
      }
      sum.push('Only one request at a time reads and updates, so the stock is accurate. Orders created: ' + orders + ', stock left: ' + stock + (N > S ? ', and the extra orders (' + (N - S) + ') were rejected as sold out.' : '.'));
      sum.push(c.how === 'pess' ? 'Pessimistic locking is reliable when conflicts are frequent. However, a waiting request holds a DB connection while it stands in line, so when orders pile up, the connection pool can run out first, and if locks are acquired in different orders, a deadlock can also occur.' : 'A distributed lock lines requests up outside the DB (in Redis). It works even with several servers, and a waiting request does not use a DB connection. However, if the work takes longer than the automatic release time of the lock, two requests can get in at the same time, and the lock must be released only after the transaction commit has finished.');
    }
    if (c.how === 'opt') {
      var left = []; for (var q = 0; q < N; q++) left.push(q);
      var round = 0;
      while (left.length) {
        round++;
        if (stock <= 0) { left.forEach(function (r) { st[r] = 'Rejected (sold out)'; }); push('Remaining requests (' + left.length + '): Read the stock again, and it is 0. They are rejected as sold out.', '', -1); break; }
        left.forEach(function (r) { st[r] = 'Stock ' + stock + ', version ' + ver; });
        push((round === 1 ? 'All requests (' + left.length + ') read' : 'The requests that failed (' + left.length + ') read') + ' the stock' + (round === 1 ? '' : ' again') + '. The stock is ' + stock + ', and the version is ' + ver + '. No lock is acquired.', '', -1);
        var win = left.shift(), readVer = ver; stock--; ver++; orders++; sold++; st[win] = 'Order placed';
        push('Request ' + (win + 1) + ': Sends an UPDATE that changes the row "only if the version is ' + readVer + '". The version is unchanged, so it succeeds. The stock is ' + stock + ', and the new version is ' + ver + '.', 'good', win);
        if (left.length) { retries += left.length; left.forEach(function (r) { st[r] = 'Save failed → retry'; }); push('The other requests (' + left.length + '): They sent the same UPDATE, but the version had already changed (it is now ' + ver + '), so no row matches the condition (0 rows changed). The request is treated as a conflict, an exception is thrown, and it tries again from the start.', 'bad', -1); }
      }
      sum.push('Optimistic locking does not wait for locks, so it works well when conflicts are rare (for example, one person editing their own information). When requests pile up on the same row, as in this example, most of them fail and retry, so the system actually does more work. You have to write the retry code yourself.');
    }
    if (c.how === 'atomic') {
      for (var u = 0; u < N; u++) {
        if (stock > 0) { stock--; orders++; sold++; st[u] = 'Order placed'; push('Request ' + (u + 1) + ': Sends the UPDATE "decrease by 1 if the stock is greater than 0". The DB locks the row only while it runs this one statement. 1 row was changed, so the request creates the order. Stock: ' + stock + '.', 'good', u); }
        else { st[u] = 'Rejected (sold out)'; push('Request ' + (u + 1) + ': Sends the same UPDATE, but the stock is 0, so the condition does not match. 0 rows were changed, so the request is handled as sold out.', '', u); }
      }
      sum.push('If you put "read, check, and write" into one SQL statement instead of splitting it up in the application, there is no gap for another request to cut into. For a simple increase or decrease, this is the lightest and most reliable method. It is hard to use when the condition to check is complex and spans several tables.');
    }
    var match = orders === S - stock;
    return { events: ev, summary: sum, row: [orders + '', stock + '', match ? 'Yes' : 'No', waits + '', retries + ''] };
  },
  render: function (v, sim, t, H, shown) {
    var c = sim.c, last = shown[shown.length - 1], s = last ? last.snap : { stock: c.s, ver: 0, st: [], orders: 0, hot: -1, waits: 0, retries: 0 };
    H.counters(v, [[c.s - s.orders, 'Initial stock minus orders (what should be left)']]);
    H.title(v, 'Requests'); var ln = H.lanes(v);
    for (var i = 0; i < c.n; i++) { var x = s.st[i] || 'Not arrived'; H.lane(ln, 'Request ' + (i + 1), x, x === 'Order placed' ? 'good' : x.indexOf('Waiting') >= 0 ? 'wait' : x.indexOf('failed') >= 0 ? 'bad' : i === s.hot ? 'hot' : x === 'Not arrived' ? 'none' : ''); }
  },
  // Diagram: At the top is one stock row, and below it are the requests that try to change that row. An arrow goes up from the request that is touching the row right now.
  draw: function (P, sim, shown) {
    var c = sim.c, last = shown[shown.length - 1], s = last ? last.snap : { stock: c.s, ver: 0, st: [], orders: 0, hot: -1, waits: 0, retries: 0 }, n = c.n, w = (648 - (n - 1) * 8) / n, over = s.orders > c.s;
    var two = function (x) { if (P.fit(x, w - 6) === x) return [x, ' ']; var m = x.lastIndexOf(' ', Math.ceil(x.length / 2) + 2); return m > 0 ? [x.slice(0, m), x.slice(m + 1)] : [x, ' ']; };
    P.size(680, 300);
    P.box('row', 200, 16, 280, 60, { cls: s.stock < 0 ? 'bad' : 'wait', title: 'Stock (one row in the DB)', sub: 'Quantity left ' + s.stock + (c.how === 'opt' ? ' · version ' + s.ver : '') });
    for (var i = 0; i < n; i++) {
      var x = s.st[i] || 'Not arrived';
      P.box('rq' + i, 16 + i * (w + 8), 140, w, 72, { cls: x === 'Order placed' ? 'good' : x.indexOf('Waiting') >= 0 ? 'wait' : x.indexOf('failed') >= 0 ? 'bad' : i === s.hot ? 'hot now' : 'plain', title: 'Request ' + (i + 1), sub: two(x), center: true });
      if (i === s.hot) P.arrow('touch', 'rq' + i + ':t', 'row:b', { cls: 'hot' });
    }
    P.box('ord', 16, 240, 318, 40, { cls: over ? 'bad' : 'good', title: 'Orders created', right: s.orders + ' (initial stock ' + c.s + ')' });
    P.box('wt', 346, 240, 318, 40, { cls: 'plain', title: 'Lock waits / retries', right: s.waits + ' / ' + s.retries });
    P.note('Several requests try to read and change the same single row. If the number of orders becomes larger than the initial stock, more items were sold than exist. The thick border and the arrow mark the request that is working on the row right now.');
  },
  assume: 'The model assumes the worst possible overlap of the requests (the order in which everyone reads first and then writes). In practice, only some requests overlap, so how far the result goes wrong is different every time. For optimistic locking, the retries assume that the requests that failed all try again at the same time. All five methods were run on a real MySQL 8.4.11, with a separate session opened for each order, in 45 combinations (stock of 1, 3, and 5 items; 2, 4, and 6 orders), and the number of orders created, the stock left, and the numbers of waits and retries were confirmed to match the screen (the execution order was arranged to produce the same "worst order" as the screen). The distributed lock was run with SET NX on a real Redis. The optimistic locking was run without going through JPA, using the same SQL that @Version produces (WHERE version = ?).',
});

Lab.register({
  id: 'nplus1', nav: 'N+1', cat: 'JPA', mode: 'step',
  title: 'Why are many queries sent when you load the order list only once?',
  intro: 'You load a list of orders and then take the member name from each order. Depending on when and how the associated member is fetched, the number of queries sent to the DB changes.',
  terms: ['N+1 selects problem', 'Lazy fetching and eager fetching', 'Fetch join', '@EntityGraph', 'Batch fetching (batch size)', 'First-level cache'], ranks: ['nplus1', 'jpaorm'],
  controls: [
    { id: 'n', label: 'Number of orders loaded', type: 'range', min: 1, max: 30, value: 10, fmt: function (v) { return v + (v === 1 ? ' order' : ' orders'); } },
    { id: 'm', label: 'Number of members who placed those orders', type: 'range', min: 1, max: 30, value: 10, fmt: function (v) { return v + (v === 1 ? ' member' : ' members'); }, hint: 'If one member has several orders, the number of members is smaller than the number of orders.' },
    { id: 'st', label: 'How the member (associated entity) is fetched', type: 'select', value: 'lazy', options: [['lazy', 'Lazy fetching (LAZY)'], ['eager', 'Eager fetching (EAGER)'], ['fetch', 'Lazy fetching + fetch join'], ['graph', 'Lazy fetching + @EntityGraph'], ['batch', 'Lazy fetching + batch size setting']] },
    { id: 'bs', label: 'Batch size', type: 'range', min: 2, max: 20, value: 5, fmt: function (v) { return v + ' at a time'; }, show: function (c) { return c.st === 'batch'; }, hint: 'A small value is used to make it easy to see. In a real setting, you use a much larger value (for example, 100).' },
    { id: 'use', label: 'Use the member name after loading', type: 'check', value: true },
    { id: 'rt', label: 'DB round-trip time of one query', type: 'range', min: 1, max: 20, value: 5, fmt: function (v) { return v + 'ms'; } },
  ],
  fix: function (c) { return c.m > c.n ? { m: c.n } : null; },
  presets: [
    { t: 'Default settings', d: 'Lazy fetching, 10 orders, 10 members. 1 + 10 queries are sent.', v: { n: 10, m: 10, st: 'lazy', bs: 5, use: true, rt: 5 } },
    { t: 'Does switching to eager fetching solve it?', d: 'The number of queries stays the same, and only the time they are sent moves earlier.', v: { n: 10, m: 10, st: 'eager', bs: 5, use: true, rt: 5 } },
    { t: 'Fetch join', d: 'Fetches the orders and the members in one query.', v: { n: 10, m: 10, st: 'fetch', bs: 5, use: true, rt: 5 } },
    { t: 'Batch size setting', d: 'Fetches the members 5 at a time with an IN query.', v: { n: 10, m: 10, st: 'batch', bs: 5, use: true, rt: 5 } },
    { t: 'When one member has many orders', d: '10 orders, 3 members. A member that has already been read is not queried again.', v: { n: 10, m: 3, st: 'lazy', bs: 5, use: true, rt: 5 } },
    { t: 'When you do not use the member information', d: 'Lazy fetching does not query a member you do not use. Compare it with eager fetching.', v: { n: 10, m: 10, st: 'lazy', bs: 5, use: false, rt: 5 } },
    { t: 'Raise it to 30 orders', d: 'With lazy fetching, the queries grow as the data grows.', v: { n: 30, m: 30, st: 'lazy', bs: 5, use: true, rt: 5 } },
  ],
  code: function (c) {
    var eager = c.st === 'eager';
    var q = c.st === 'fetch' ? '@Query("select o from Order o join fetch o.member")' : c.st === 'graph' ? '@EntityGraph(attributePaths = "member")\n    @Query("select o from Order o")' : '@Query("select o from Order o")';
    return '@Entity class Order {\n    @ManyToOne(fetch = FetchType.' + (eager ? 'EAGER' : 'LAZY') + ')\n    Member member;\n}\n\ninterface OrderRepository {\n    ' + q + '\n    List<Order> findOrders();\n}\n' +
      (c.st === 'batch' ? '\n// application.yml\n// hibernate.default_batch_fetch_size: ' + c.bs + '\n' : '') +
      '\n// Service (inside a transaction)\nList<Order> orders = repo.findOrders();   // ' + c.n + (c.n === 1 ? ' order' : ' orders') + '\nfor (Order o : orders) {\n' + (c.use ? '    names.add(o.getMember().getName());  // uses the member name' : '    total += o.getAmount();              // does not use the member') + '\n}';
  },
  label: function (c) { return { lazy: 'Lazy fetching', eager: 'Eager fetching', fetch: 'Fetch join', graph: '@EntityGraph', batch: 'Batch ' + c.bs + ' at a time' }[c.st] + ' · ' + c.n + (c.n === 1 ? ' order' : ' orders') + ' · ' + c.m + (c.m === 1 ? ' member' : ' members') + ' · name ' + (c.use ? 'used' : 'not used'); },
  columns: ['Number of queries', 'Order queries', 'Member queries', 'DB round-trip time'],
  simulate: function (c) {
    var ev = [], qs = [], loaded = {}, orders = [], cursor = 0;
    for (var i = 1; i <= c.n; i++) orders.push({ id: i, mem: (i - 1) % c.m + 1 });
    function snap() { var l = {}; Object.keys(loaded).forEach(function (k) { l[k] = 1; }); return { qs: qs.slice(), loaded: l, cursor: cursor }; }
    function push(s, k) { ev.push({ s: s, k: k, snap: snap() }); }
    function query(sql, why, kind) { qs.push({ sql: sql, why: why, kind: kind }); }
    var joined = c.st === 'fetch' || c.st === 'graph';
    if (joined) {
      query('select o.*, m.* from orders o ' + (c.st === 'fetch' ? 'join' : 'left join') + ' member m on m.id = o.member_id', 'list query', 'o');
      for (var a = 1; a <= c.m; a++) loaded[a] = 1;
      push('Query 1: Fetches the orders and the members together with a join, in one query. All the orders (' + c.n + ') and all the members (' + c.m + ') are now in memory.', 'good');
    } else {
      query('select o.* from orders o', 'list query', 'o');
      push('Query 1: Fetches the order list (' + c.n + (c.n === 1 ? ' order' : ' orders') + '). The members were not fetched. JPQL becomes SQL that reads only the order table, exactly as written.', '');
    }
    if (c.st === 'eager') {
      orders.forEach(function (o) {
        if (loaded[o.mem]) return;
        loaded[o.mem] = 1; query('select m.* from member m where m.id = ' + o.mem, 'eager fetching', 'm');
        push('Query ' + qs.length + ': The association is set to eager fetching, so before the query result is returned, the member of order ' + o.id + ' (member ' + o.mem + ') is queried right away. It does not matter whether the code uses the member.', 'bad');
      });
    }
    if (!c.use) { cursor = c.n; push('The loop used only the order amounts. It never touched the members, so there are no extra queries.', ''); }
    else orders.forEach(function (o) {
      cursor = o.id;
      if (loaded[o.mem]) { if (c.st === 'lazy' || c.st === 'batch') push('Order ' + o.id + ': Takes the name of member ' + o.mem + '. This member is already in the persistence context (first-level cache), so no query is sent.', ''); return; }
      if (c.st === 'batch') {
        var ids = [o.mem]; orders.forEach(function (x) { if (ids.length < c.bs && !loaded[x.mem] && ids.indexOf(x.mem) < 0) ids.push(x.mem); });
        ids.forEach(function (id) { loaded[id] = 1; });
        query('select m.* from member m where m.id in (' + ids.join(', ') + ')', 'batch fetching', 'm');
        push('Query ' + qs.length + ': Order ' + o.id + ' tries to take the name of member ' + o.mem + '. It fetched up to ' + c.bs + ' members that had not been read yet in a single IN query (' + ids.length + ' fetched).', '');
      } else {
        loaded[o.mem] = 1; query('select m.* from member m where m.id = ' + o.mem, 'lazy fetching', 'm');
        push('Query ' + qs.length + ': At the moment order ' + o.id + ' takes the name of member ' + o.mem + ', a query is sent to fill the empty member object (the proxy).', 'bad');
      }
    });
    if (c.use && (joined || c.st === 'eager')) push('The loop took the member name of every order (' + c.n + ' in total). All the members were already loaded, so there are no extra queries.', '');
    var total = qs.length, mq = total - 1, sum = [];
    if (c.st === 'lazy' && c.use) sum.push('On top of the 1 list query, as many queries as members followed. This is the N+1 selects problem. The number of extra queries is decided not by the number of orders but by the number of distinct members that have not been read yet (' + c.m + ').');
    if (c.st === 'lazy' && !c.use) sum.push('Lazy fetching queries only when the data is actually used, so a screen that does not use the members finishes with 1 query. This is why lazy fetching is used as the default.');
    if (c.st === 'eager') sum.push('Even if you switch to eager fetching, the N+1 selects problem still occurs in a JPQL query. Only the timing moves earlier, to right after the query' + (c.use ? '' : ', and ' + mq + ' extra member queries were sent although the members are not used') + '. Eager fetching is not a solution to the N+1 selects problem.');
    if (c.st === 'fetch') sum.push('A fetch join fetches the associated members in the same query. The join fetch in this example is an inner join, so an order without a member drops out of the result. If you need those orders too, use left join fetch.');
    if (c.st === 'graph') sum.push('@EntityGraph tells JPA to "fetch the member too" without changing the JPQL. With the default mapping in this example, where the member may be missing, it is fetched with a left outer join (if you map it with optional = false, it becomes an inner join).');
    if (c.st === 'batch' && c.use) sum.push('With a batch size, the members are fetched ' + c.bs + ' at a time instead of one at a time. Fetching all of them (' + c.m + ') took ' + mq + ' queries (' + c.m + ' ÷ ' + c.bs + ', rounded up), so the number of queries went down from 1 + ' + c.m + ' to 1 + ' + mq + '.');
    if (c.st === 'batch' && !c.use) sum.push('A batch size setting is also lazy fetching, so if you do not use the members, there are no extra queries.');
    return { events: ev, summary: sum, orders: orders, row: [String(total), '1', String(mq), total * c.rt + 'ms'] };
  },
  render: function (v, sim, t, H, shown) {
    var c = sim.c, last = shown[shown.length - 1], s = last ? last.snap : { qs: [], loaded: {}, cursor: 0 };
    var nl = Object.keys(s.loaded).length;
    H.counters(v, [[s.qs.length, 'Queries sent'], [s.qs.length * c.rt + 'ms', 'DB round-trip time'], [nl + ' / ' + c.m, 'Members loaded']]);
    H.title(v, 'Orders loaded: ' + c.n + ' (order number → member number)');
    H.slots(v, s.qs.length ? sim.orders.map(function (o) { return [o.id + '→' + o.mem, (s.loaded[o.mem] ? 'd' : '') + (o.id === s.cursor && c.use ? ' now' : '')]; }) : [], 'Not loaded yet.', true);
    H.text(v, 'Green means an order whose member information is in memory. Dotted means an order whose member is still an empty object (a proxy).');
    H.table(v, ['#', 'SQL sent to the DB', 'Reason'], s.qs.map(function (q, i) { return { cells: [String(i + 1), { v: q.sql, cls: i === s.qs.length - 1 ? 'hot' : '' }, q.why] }; }), 'Query log');
  },
  assume: 'This lab assumes that an order (Order) refers to a member (Member) with @ManyToOne, and that the loop runs while the transaction (persistence context) is open. If you touch a lazily fetched target after the persistence context is closed, the default setting throws a LazyInitializationException instead of sending a query. The number of queries was confirmed by running 112 combinations (5 methods, 1, 10, or 30 orders, 1, 3, 10, or 30 members, batch sizes 2, 5, or 20, and whether the name is used) on real Hibernate 7.4.5 and an H2 database, and the number of SQL statements actually sent matched the screen. @EntityGraph was run with the same JPA entity graph hint that Spring Data uses internally. The 1 + the number of members for eager fetching is the value when there is no batch setting. Batch fetching follows the way used since Hibernate 6, which splits the ids by the batch size; with the default way in Hibernate 5, more queries may be sent. The shape of the SQL depends on the DB: MySQL uses an IN list, and PostgreSQL uses an array parameter (= any(?)). The round-trip time is simplified to be the same for every query. In reality, one join query can be heavier than one simple query.',
});

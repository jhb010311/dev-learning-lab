Lab.register({
  id: 'connpool', nav: 'Connection pool and OSIV', cat: 'JPA', mode: 'time',
  title: 'Why connections run short even though the queries finish quickly',
  intro: 'A request does its database work, then calls an external API, and then responds. Database connections are borrowed from a pool and returned to it. Depending on when a connection is returned (the Open Session in View setting, OSIV for short), the number of requests that a pool of the same size can withstand differs greatly.',
  terms: ['Connection pool', 'Open Session in View', 'Persistence context', 'Bottleneck'], ranks: ['jpaorm', 'tuning', 'traffic'],
  controls: [
    { id: 'pool', label: 'Connection pool size', type: 'range', min: 1, max: 10, value: 3, fmt: function (v) { return v + ''; } },
    { id: 'n', label: 'Requests that arrive at almost the same time', type: 'range', min: 1, max: 20, value: 8, fmt: function (v) { return v + ''; } },
    { id: 'q', label: 'Time of the database work in one request', type: 'select', value: '0.5', options: [['0.5', '0.5s'], ['1', '1s'], ['2', '2s']] },
    { id: 'ext', label: 'Time of the external API call after the database work', type: 'select', value: '2', options: [['0', 'None'], ['1', '1s'], ['2', '2s'], ['3', '3s']] },
    { id: 'osiv', label: 'OSIV is on (the Spring Boot default)', type: 'check', value: true },
  ],
  presets: [
    { t: 'Default settings', d: 'OSIV on. The database work takes 0.5s, but each request holds a connection for 2.5s.', v: { pool: 3, n: 8, q: '0.5', ext: '2', osiv: true } },
    { t: 'Turning OSIV off', d: 'The connection is returned as soon as the database work ends.', v: { pool: 3, n: 8, q: '0.5', ext: '2', osiv: false } },
    { t: 'When more requests arrive', d: 'OSIV on, 20 requests. Some requests wait 5s and then fail.', v: { pool: 3, n: 20, q: '0.5', ext: '2', osiv: true } },
    { t: 'Making the pool larger', d: 'The same 20 requests with a pool of 10. The pool holds up, but there is a limit to the number of connections the database can accept.', v: { pool: 10, n: 20, q: '0.5', ext: '2', osiv: true } },
    { t: 'When the query itself is slow', d: 'Even with OSIV off, a connection is in use for the 2s of database work.', v: { pool: 3, n: 8, q: '2', ext: '0', osiv: false } },
  ],
  code: function (c) {
    return '# application.yml\nspring.datasource.hikari.maximum-pool-size: ' + c.pool + '\nspring.datasource.hikari.connection-timeout: 5000   # fail after waiting 5s\nspring.jpa.open-in-view: ' + c.osiv + '\n\n// controller\nOrderDto get(long id) {\n    Order order = orderService.find(id);       // @Transactional, database work ' + c.q + 's\n' + (c.ext !== '0' ? '    Delivery d = deliveryApi.track(order);     // external API ' + c.ext + 's (no database use)\n' : '') + '    return OrderDto.of(order' + (c.ext !== '0' ? ', d' : '') + ');\n}';
  },
  label: function (c) { return 'Pool ' + c.pool + ' · requests: ' + c.n + ' · DB ' + c.q + 's + external ' + c.ext + 's · OSIV ' + (c.osiv ? 'on' : 'off'); },
  columns: ['Succeeded', 'Timed out waiting for a connection', 'Average wait', 'Longest wait', 'Time one connection is held'],
  simulate: function (c) {
    var q = +c.q, ext = +c.ext, hold = c.osiv ? q + ext : q, T = 5, fmt = Lab.fmt, conns = [], reqs = [], ev = [];
    for (var i = 0; i < c.pool; i++) conns.push({ id: i + 1, free: 0, segs: [] });
    for (var r = 0; r < c.n; r++) {
      var at = Math.round(r * 0.1 * 10) / 10, cn = conns.reduce(function (a, b) { return b.free < a.free ? b : a; }), start = Math.max(at, cn.free), rq = { id: r + 1, at: at };
      reqs.push(rq);
      if (start - at > T + 1e-9) { rq.fail = at + T; ev.push({ t: at + T, k: 'bad', s: fmt(at + T) + 's: Request ' + rq.id + ' waited 5s for a connection but could not get one. It fails with the exception "Connection is not available, request timed out".' }); if (at < cn.free) ev.push({ t: at, s: fmt(at) + 's: Request ' + rq.id + ' arrives. All connections in the pool (' + c.pool + ') are in use, so it waits.' }); continue; }
      rq.start = start; rq.dbEnd = start + q; rq.rel = start + hold; rq.done = start + q + ext; rq.conn = cn.id; cn.free = rq.rel; cn.segs.push(rq);
      if (start > at + 1e-9) ev.push({ t: at, s: fmt(at) + 's: Request ' + rq.id + ' arrives. All connections in the pool (' + c.pool + ') are in use, so it waits.' });
      ev.push({ t: start, s: fmt(start) + 's: Request ' + rq.id + ' borrows connection ' + cn.id + ' and starts its database work.' + (start > at + 1e-9 ? ' It waited ' + fmt(start - at) + 's.' : '') });
      if (ext > 0) ev.push({ t: rq.dbEnd, k: c.osiv ? 'bad' : 'good', s: fmt(rq.dbEnd) + 's: Request ' + rq.id + ' finishes its database work and starts the external API call. ' + (c.osiv ? 'OSIV is on, so it does not return connection ' + cn.id + ' and holds it until the response is finished.' : 'The transaction has ended, so it returns connection ' + cn.id + ' to the pool right away.') });
      ev.push({ t: rq.done, s: fmt(rq.done) + 's: Request ' + rq.id + ' finishes its response.' + (c.osiv ? ' It now returns connection ' + cn.id + '.' : '') });
    }
    ev.sort(function (a, b) { return a.t - b.t; });
    var ok = reqs.filter(function (x) { return !x.fail; }), waits = ok.map(function (x) { return x.start - x.at; }), fails = reqs.length - ok.length;
    var avg = waits.length ? waits.reduce(function (a, b) { return a + b; }, 0) / waits.length : 0, mx = waits.length ? Math.max.apply(null, waits) : 0, total = reqs.reduce(function (m, x) { return Math.max(m, x.fail || x.done); }, 0);
    var sum = ext > 0 || fails ? [] : ['Requests: ' + c.n + '. Succeeded: ' + ok.length + '. Failed because they could not get a connection: ' + fails + '. The requests that succeeded waited for a connection ' + fmt(avg) + 's on average and ' + fmt(mx) + 's at most.'];
    if (c.osiv && ext > 0) sum.push('When OSIV is on, the persistence context stays open until the response is finished, and the database connection is held along with it for that time. The connection stays occupied even during the wait for the external API, which does not use the database, so on an API server with heavy traffic the connections soon run short. When OSIV is off, the connection is returned when the transaction ends.');
    if (!c.osiv && ext > 0) sum.push('When OSIV is off, the connection is returned as soon as the transaction ends. In exchange, lazy fetching cannot be used outside the transaction (in the controller or the view), so the service layer has to read all the data that is needed in advance.');
    if (fails) sum.push('Simply making the pool larger is not the solution. There is a limit to the number of connections the database can handle, and with more connections they compete with each other on the database side, which makes things slower instead. Reducing the time a connection is held (turning OSIV off, narrowing the transaction scope, improving slow queries) comes first.');
    return { total: total, events: ev, summary: sum, conns: conns, reqs: reqs, hold: hold, row: [ok.length + '', fails + '', fmt(avg) + 's', fmt(mx) + 's', fmt(hold) + 's'] };
  },
  render: function (v, sim, t, H) {
    var c = sim.c, e = 1e-9;
    var waiting = sim.reqs.filter(function (r) { return r.at <= t + e && (r.fail !== undefined ? r.fail > t + e : r.start > t + e); });
    var busy = sim.conns.filter(function (cn) { return cn.segs.some(function (r) { return r.start <= t + e && r.rel > t + e; }); }).length;
    H.counters(v, [[busy + ' / ' + c.pool, 'Connections in use'], [waiting.length, 'Requests waiting for a connection']]);
    H.title(v, 'Connection pool'); var ln = H.lanes(v);
    sim.conns.forEach(function (cn) { var r = cn.segs.filter(function (x) { return x.start <= t + e && x.rel > t + e; })[0];
      if (!r) H.lane(ln, 'Connection ' + cn.id, 'idle in the pool (available to borrow)', 'none');
      else if (t < r.dbEnd - e) H.lane(ln, 'Connection ' + cn.id, 'Request ' + r.id + ' · database work in progress', 'hot', (t - r.start) / sim.hold);
      else H.lane(ln, 'Connection ' + cn.id, 'Request ' + r.id + ' · database work done, held while waiting for the external API', 'bad', (t - r.start) / sim.hold); });
    H.title(v, 'Requests waiting for a connection'); H.slots(v, waiting.map(function (r) { return ['Request ' + r.id + ' (' + H.fmt(t - r.at) + 's so far)', 'q']; }), 'None');
    var out = sim.reqs.filter(function (r) { return !r.fail && r.rel <= t + e && r.done > t + e; });
    if (out.length) { H.title(v, 'Requests waiting for the external API without a connection'); H.slots(v, out.map(function (r) { return ['Request ' + r.id, 'd']; }), ''); }
  },
  // Diagram: a request (a numbered box) waits for a connection, borrows it, and returns it. When requests wait for the external response while holding a connection, the pool runs out.
  draw: function (P, sim, shown, t) {
    var c = sim.c, e = 1e-9, n = sim.conns.length, H = Math.max(300, 58 + n * 30);
    var waiting = sim.reqs.filter(function (r) { return r.at <= t + e && (r.fail !== undefined ? r.fail > t + e : r.start > t + e); }), failed = sim.reqs.filter(function (r) { return r.fail !== undefined && r.fail <= t + e; }), done = sim.reqs.filter(function (r) { return r.done !== undefined && r.done <= t + e; }).length;
    var out = sim.reqs.filter(function (r) { return r.fail === undefined && r.rel <= t + e && r.done > t + e; });
    P.size(680, H + 66);
    P.region('wait', 16, 16, 190, H, 'Waiting for a connection');
    P.region('pool', 222, 16, 262, H, 'Connection pool (' + c.pool + ')');
    P.region('ext', 500, 16, 164, H, 'API wait, no connection');
    waiting.slice(0, 21).forEach(function (r, j) { P.box('rq' + r.id, 28 + (j % 3) * 56, 50 + Math.floor(j / 3) * 28, 52, 24, { cls: 'wait', sub: '#' + r.id, center: true }); });
    sim.conns.forEach(function (cn, i) {
      var y = 50 + i * 30, r = cn.segs.filter(function (x) { return x.start <= t + e && x.rel > t + e; })[0], idle = r && t >= r.dbEnd - e;
      P.box('cn' + cn.id, 234, y, 238, 26, { cls: !r ? 'plain' : idle ? 'bad' : 'hot', title: 'Conn ' + cn.id, right: !r ? 'available' : '' });
      if (r) P.box('rq' + r.id, 306, y + 3, 162, 20, { cls: idle ? 'bad' : 'wait', sub: '#' + r.id + (idle ? ' · external wait' : ' · database work'), center: true });
    });
    out.slice(0, 16).forEach(function (r, j) { P.box('rq' + r.id, 512 + (j % 2) * 72, 50 + Math.floor(j / 2) * 28, 66, 24, { cls: 'good', sub: '#' + r.id, center: true }); });
    P.box('dn', 16, H + 30, 318, 34, { cls: 'good', title: 'Responses finished', right: done + '' });
    P.box('fl', 346, H + 30, 318, 34, { cls: failed.length ? 'bad' : 'ghost', title: 'Failed to get a connection', right: failed.length + '' });
    P.note('The numbered boxes are requests. A yellow connection is doing database work, and a red connection is one whose database work is done but which is still held while the request waits for the external response. The more red connections there are, the longer the waiting line on the left becomes.');
  },
  assume: 'The model assumes that requests arrive 0.1s apart and that there are enough server threads to handle them (200 by default in Tomcat). The limit on waiting for a connection is fixed at 5s (the HikariCP default is 30s). When OSIV is on, the model takes the connection to be borrowed at the first database access and returned when the response is finished, which follows the default behavior of Hibernate in a Spring environment, where it keeps the connection until the session is closed. The numbers are a model meant to show the relationships and are not real measurements.',
});

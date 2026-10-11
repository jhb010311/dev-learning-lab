Lab.register({
  id: 'scale', nav: 'Load balancers and scale out', cat: 'High traffic', mode: 'step',
  title: 'How far does adding servers get you?',
  intro: 'A load balancer distributes requests across several servers, and each request uses the database once.',
  terms: ['Scale up and scale out', 'Load balancer', 'Bottleneck', 'Autoscaling', 'TPS and response time percentiles'], ranks: ['traffic', 'cloud'],
  controls: [
    { id: 'rps', label: 'Requests arriving per second', type: 'range', min: 100, max: 4000, step: 100, value: 1000, fmt: function (v) { return v + ' requests'; } },
    { id: 'n', label: 'Number of application servers', type: 'range', min: 1, max: 8, value: 2, fmt: function (v) { return v + (v === 1 ? ' server' : ' servers'); } },
    { id: 'spec', label: 'Capacity of one server', type: 'select', value: '400', options: [['400', 'Standard spec (400 requests per second)'], ['800', 'Double spec (800 requests per second)']] },
    { id: 'db', label: 'Capacity of the database', type: 'select', value: '2000', options: [['1000', '1,000 requests per second'], ['2000', '2,000 requests per second'], ['4000', '4,000 requests per second']] },
    { id: 'down', label: 'One server dies', type: 'check', value: false },
  ],
  presets: [
    { t: 'Default settings', d: '1,000 requests per second with 2 servers. The servers cannot keep up.', v: { rps: 1000, n: 2, spec: '400', db: '2000', down: false } },
    { t: 'Go to 3 servers (scale out)', d: 'Add one more server of the same spec.', v: { rps: 1000, n: 3, spec: '400', db: '2000', down: false } },
    { t: 'Double the server spec (scale up)', d: 'The number of servers stays at 2; the performance of each one goes up.', v: { rps: 1000, n: 2, spec: '800', db: '2000', down: false } },
    { t: 'Keep adding servers', d: '3,000 requests per second with 8 servers. This time the database becomes the bottleneck.', v: { rps: 3000, n: 8, spec: '400', db: '2000', down: false } },
    { t: '1 of 3 servers fails', d: 'The remaining 2 share the requests. If they have no spare capacity, they overflow together.', v: { rps: 1000, n: 3, spec: '400', db: '2000', down: true } },
    { t: 'Failure with only 1 server', d: 'There is no server left to accept requests, so the whole service stops.', v: { rps: 300, n: 1, spec: '400', db: '2000', down: true } },
  ],
  code: function (c) {
    var s = '# Load balancer settings (nginx example)\nupstream app {\n';
    for (var i = 1; i <= c.n; i++) s += '    server 10.0.0.' + i + ':8080;' + (c.down && i === c.n ? '   # no response -> excluded' : '') + '\n';
    return s + '}\nserver {\n    listen 80;\n    location / { proxy_pass http://app; }   # passes requests to the servers in turn\n}\n\n# One server: handles ' + c.spec + ' requests per second\n# DB: handles ' + c.db + ' requests per second (1 query per request)';
  },
  label: function (c) { return c.rps + ' requests per second · ' + c.n + (c.n === 1 ? ' server' : ' servers') + ' × ' + c.spec + (c.down ? ' (1 down)' : '') + ' · DB ' + c.db; },
  columns: ['Requests handled per second', 'Requests not handled', 'Load on one live server', 'Bottleneck'],
  simulate: function (c) {
    var cap = +c.spec, dbCap = +c.db, alive = c.n - (c.down ? 1 : 0), ev = [], sum = [];
    var per = alive ? c.rps / alive : 0, appOut = Math.min(c.rps, alive * cap), out = Math.min(appOut, dbCap), lost = c.rps - out;
    var load = alive ? Math.round(per / cap * 100) : 0, dbLoad = Math.round(appOut / dbCap * 100);
    var neck = alive === 0 ? 'No server' : appOut < c.rps && appOut <= dbCap ? 'Application server' : out < appOut ? 'DB' : appOut < c.rps ? 'Application server' : 'None';
    function push(s, k, stage) { ev.push({ s: s, k: k, snap: { stage: stage } }); }
    push('Requests arrive at the load balancer at ' + c.rps + ' per second. Users do not know how many servers there are; they know only the one address of the load balancer.', '', 1);
    if (c.down) push(alive ? 'The load balancer periodically checks the state of the servers (a health check), finds that server #' + c.n + ' is not responding, and removes it from its targets. It sends requests only to the remaining ' + alive + (alive === 1 ? ' server.' : ' servers.') : 'The health check shows that the only server is not responding. There is nowhere to send requests.', 'bad', 2);
    if (!alive) { push('Every request fails. When there is only one server, the failure of that one server is a failure of the whole service (a single point of failure).', 'bad', 4); sum.push('Requests handled: 0. You need at least 2 servers for the service to keep running when one dies.'); return { events: ev, summary: sum, calc: { alive: 0, per: 0, cap: cap, appOut: 0, out: 0, lost: c.rps, load: 0, dbLoad: 0, dbCap: dbCap, neck: neck }, row: ['0', c.rps + '', '-', neck] }; }
    push('The load balancer divides the requests evenly among the ' + alive + ' live ' + (alive === 1 ? 'server' : 'servers') + '. Each server receives ' + Math.round(per) + ' requests per second. One server can handle ' + cap + ' requests per second, so its load is ' + load + '%.' + (per > cap ? ' This is over its capacity. The overflowing requests wait and then time out or are rejected.' : ''), per > cap ? 'bad' : '', 3);
    push('The ' + appOut + ' requests per second that the servers handled go on to the database. The database can handle ' + dbCap + ' requests per second, so its load is ' + dbLoad + '%.' + (appOut > dbCap ? ' The database cannot keep up. Even if the servers have room to spare, requests back up while they wait for the database to respond.' : ''), appOut > dbCap ? 'bad' : '', 4);
    push('Result: ' + out + ' requests per second are handled and ' + lost + ' are not. ' + (neck === 'None' ? 'Every stage has room to spare.' : 'Bottleneck: ' + neck + '.'), lost ? 'bad' : 'good', 5);
    sum.push('Of ' + c.rps + ' requests per second, ' + out + ' were handled (' + (lost ? lost + ' over the limit' : 'all handled') + '). The load on one server is ' + load + '%, and the load on the database is ' + dbLoad + '%.');
    if (neck === 'Application server') sum.push('The application servers are the bottleneck. Adding more servers (scale out) or raising their spec (scale up) fixes it. Scale out keeps working when one server dies and can be continued as far as you like, but the servers must not keep things such as login state in their own memory. Scale up needs no change in structure, but it has a limit and the cost rises quickly.');
    if (neck === 'DB') sum.push('The database is the bottleneck. In this state, no matter how many application servers you add, the throughput does not rise. When you fix one bottleneck, it moves to the next weakest part. On the database side, consider these in order: improving indexes and queries, caching, and read replicas.');
    if (neck === 'None' && c.down) sum.push('One server died, but the remaining servers coped. Keep the normal load at a level that survives the loss of one server, so that a failure does not spread to the whole.');
    if (neck === 'None' && !c.down && load < 50 && alive > 1) sum.push('There is spare server capacity. Increasing and decreasing the number of servers automatically to match the load is autoscaling.');
    return { events: ev, summary: sum, calc: { alive: alive, per: per, cap: cap, appOut: appOut, out: out, lost: lost, load: load, dbLoad: dbLoad, dbCap: dbCap, neck: neck }, row: [out + '', lost + '', load + '%', neck] };
  },
  render: function (v, sim, t, H, shown) {
    var c = sim.c, k = sim.calc, last = shown[shown.length - 1], stage = last ? last.snap.stage : 0;
    var ln = H.lanes(v);
    H.lane(ln, 'Load balancer', stage >= 1 ? 'Receiving ' + c.rps + ' requests per second' : 'Waiting', stage >= 1 ? 'wait' : 'none');
    for (var i = 1; i <= c.n; i++) {
      var dead = c.down && i === c.n;
      if (dead) H.lane(ln, 'Server ' + i, stage >= 2 ? 'Not responding · excluded by the load balancer' : 'Failure occurred', 'bad');
      else if (stage >= 3) H.lane(ln, 'Server ' + i, 'Receiving ' + Math.round(k.per) + ' requests per second / can handle ' + k.cap + ' · load ' + k.load + '%', k.per > k.cap ? 'bad' : '', Math.min(1, k.per / k.cap));
      else H.lane(ln, 'Server ' + i, 'Can handle ' + k.cap + ' requests per second', '');
    }
    H.lane(ln, 'DB', stage >= 4 && k.alive ? 'Receiving ' + k.appOut + ' requests per second / can handle ' + k.dbCap + ' · load ' + k.dbLoad + '%' : 'Can handle ' + k.dbCap + ' requests per second', stage >= 4 && k.appOut > k.dbCap ? 'bad' : '', stage >= 4 && k.alive ? Math.min(1, k.appOut / k.dbCap) : undefined);
  },
  // Diagram: the load balancer divides the requests among the servers, and all the servers go to a single database. The part that overflows is the bottleneck.
  draw: function (P, sim, shown) {
    var c = sim.c, k = sim.calc, last = shown[shown.length - 1], stage = last ? last.snap.stage : 0, n = c.n, w = (648 - (n - 1) * 6) / n, fin = stage >= 5 || (!k.alive && stage >= 4), dbOver = stage >= 4 && k.appOut > k.dbCap;
    P.size(680, 316);
    P.box('lb', 190, 16, 300, 44, { cls: stage >= 1 ? 'wait' : 'plain', title: 'Load balancer', right: c.rps + ' per second' });
    for (var i = 1; i <= n; i++) {
      var dead = c.down && i === n, over = stage >= 3 && k.per > k.cap, x = 16 + (i - 1) * (w + 6);
      P.box('s' + i, x, 110, w, 62, { cls: dead ? 'bad' : over ? 'bad' : stage >= 3 ? 'good' : 'plain', center: true, title: 'Server ' + i, sub: dead ? ['Dead', 'Excluded'] : stage >= 3 ? ['Load', k.load + '%'] : ['Capacity', k.cap + ''] });
      if (!(dead && stage >= 2)) { P.arrow('in' + i, 'lb:b:' + (i / (n + 1)), 's' + i + ':t', { cls: stage >= 1 ? '' : 'mut' }); P.arrow('out' + i, 's' + i + ':b', 'db:t:' + (i / (n + 1)), { cls: stage >= 4 ? (dbOver ? 'bad' : '') : 'mut' }); }
    }
    P.box('db', 190, 222, 300, 44, { cls: dbOver ? 'bad' : stage >= 4 ? 'good' : 'plain', title: 'DB (only one)', right: stage >= 4 && k.alive ? 'Load ' + k.dbLoad + '%' : k.dbCap + ' per second' });
    P.text('neck', 340, 296, fin ? 'Bottleneck: ' + k.neck + ' · Handled ' + k.out + ' per second, not handled ' + k.lost : 'The bottleneck is shown as the run proceeds', { anchor: 'middle', bold: fin, cls: fin ? (k.lost ? 'bad' : 'good') : 'mut' });
    P.note('A red box is a place that cannot handle the amount coming in.');
  },
  assume: 'This model simplifies things: every request weighs the same, and one request uses one database query. The load balancer is assumed to divide requests evenly and to have no limit of its own (in practice, load balancers are also made redundant). Requests beyond capacity are only counted as "not handled"; in practice, as the load gets closer to the limit, the waiting time grows sharply first. The numbers are examples to show the relationships, not measured values.',
});

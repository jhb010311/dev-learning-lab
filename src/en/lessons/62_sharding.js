Lab.register({
  id: 'shard', nav: 'Sharding', cat: 'Database', mode: 'step',
  title: 'What happens when you split data across several databases',
  intro: 'When one table grows too big for one database server, the rows are divided among several databases (shards). The shard key and the rule for dividing decide which row goes to which shard.',
  terms: ['Sharding and partitioning', 'Scale up and scale out', 'Replication'], ranks: ['dbengine', 'traffic', 'nosql'],
  controls: [
    { id: 'n', label: 'Number of shards', type: 'range', min: 2, max: 6, value: 4, fmt: function (v) { return v + ' shards'; } },
    { id: 'how', label: 'Rule for dividing', type: 'select', value: 'hash', options: [['hash', 'Hash: member number % number of shards'], ['range', 'Range: by order number range'], ['hot', 'Hash, but one member has an unusually large number of orders']] },
    { id: 'grow', label: 'Add one more shard', type: 'check', value: false },
  ],
  presets: [
    { t: 'Default settings', q: 'How does the data spread across 4 shards when you divide it by member number % number of shards?', d: 'Orders are distributed by the remainder of the member number divided by 4. They spread evenly.', v: { n: 4, how: 'hash', grow: false } },
    { t: 'Dividing by order number range', q: 'What if you change the rule for dividing to range by order number range?', d: 'All new orders go to the last shard.', v: { n: 4, how: 'range', grow: false } },
    { t: 'When a particular member has many orders', q: 'What if you use hashing, but one member has an unusually large number of orders?', d: 'Only the shard that member belongs to grows.', v: { n: 4, how: 'hot', grow: false } },
    { t: 'Adding a shard with hashing', q: 'What if you add one more shard with the hash rule?', d: 'From 4 shards to 5. Most of the data has to move.', v: { n: 4, how: 'hash', grow: true } },
    { t: 'Adding a shard with ranges', q: 'What if the rule for dividing is range by order number range and you add one more shard?', d: 'The existing data stays where it is, and the new shard receives only the new range.', v: { n: 4, how: 'range', grow: true } },
  ],
  code: function (c) {
    if (c.how === 'range') return '// Only the class body is shown (class declaration and imports omitted)\n// The shard is chosen by the order number range\nint shardOf(long orderId) {\n    return (int) ((orderId - 1) / ' + Math.ceil(120 / c.n) + ');     // Orders 1-' + Math.ceil(120 / c.n) + ' go to shard 0, the next ones go to shard 1 …\n}';
    return '// Only the class body is shown (class declaration, List<DataSource> shards field, and imports omitted)\n// The shard is chosen by the remainder of the member number divided by the number of shards\nint shardOf(long memberId) {\n    return (int) (memberId % ' + c.n + ');\n}\n\n// The same calculation finds the shard when querying\nDataSource dataSourceOf(long memberId) {\n    return shards.get(shardOf(memberId));\n}';
  },
  label: function (c) { return c.n + ' shards · ' + { hash: 'hash (member number)', range: 'range (order number)', hot: 'hash + member with many orders' }[c.how] + (c.grow ? ' · shard added' : ''); },
  columns: ['Largest shard / smallest shard', 'Where new orders go', 'Data to move when a shard is added', 'Query for the orders of one member'],
  simulate: function (c) {
    var N = c.n, TOTAL = 120, per = Math.ceil(TOTAL / N), orders = [], ev = [], sum = [], i;
    for (i = 1; i <= TOTAL; i++) orders.push({ id: i, mem: c.how === 'hot' && i % 3 === 0 ? 7 : (i * 7 + 3) % 40 + 1 });
    function place(o, n, perN) { return c.how === 'range' ? Math.min(n - 1, Math.floor((o.id - 1) / perN)) : o.mem % n; }
    function dist(n, perN) { var d = []; for (var k = 0; k < n; k++) d.push(0); orders.forEach(function (o) { d[place(o, n, perN)]++; }); return d; }
    var d1 = dist(N, per), mx = Math.max.apply(null, d1), mn = Math.min.apply(null, d1);
    function push(s, k, d, extra) { ev.push({ s: s, k: k, snap: { d: d, extra: extra || '' } }); }
    push('Divide ' + TOTAL + ' orders among ' + N + ' shards. ' + (c.how === 'range' ? 'The order numbers are cut into ranges of ' + per + ' and assigned to the shards.' : 'The remainder of the member number of the order divided by the number of shards (' + N + ') is the shard number. The orders of the same member always end up on the same shard. The hash rule in this lab is the simplest form, which uses the member number itself as the hash value. In practice, the remainder is often taken from the value you get by passing the key to a hash function, and string keys are turned into numbers that way too.'), '', d1.map(function () { return 0; }));
    push('Distribution result. Largest shard: ' + mx + ' orders. Smallest shard: ' + mn + ' orders.' + (c.how === 'hot' ? ' Member 7 has one third of all the orders, so they are piled onto shard ' + (7 % N) + ', where that member belongs. Hashing spreads keys evenly, but it does not help when one key has a lot of data attached.' : c.how === 'range' ? ' It is even now, but that is based on past data.' : ' The member numbers are spread evenly, so the number of orders per shard is similar.'), mx >= mn * 2 ? 'bad' : 'good', d1);
    var newTo = c.how === 'range' ? 'Last shard only' : 'Spread over all shards by member';
    push(c.how === 'range' ? 'New order numbers keep getting larger, so all new orders go to the last shard, shard ' + (N - 1) + '. The write load piles up on a single shard (a bottleneck), and the other shards sit idle.' : 'New orders are scattered over several shards depending on the member number of the member who ordered. The write load is spread out.', c.how === 'range' ? 'bad' : 'good', d1, c.how === 'range' ? 'New order → shard ' + (N - 1) : 'New order → multiple shards');
    var q = c.how === 'range' ? 'Must ask all shards' : '1 shard';
    push(c.how === 'range' ? '"Orders of member 7" query: the orders are divided by order number, so there is no way to know which shards hold this member\'s orders. All shards must be queried and the results combined. Conversely, "look up order number 50" needs only one shard.' : '"Orders of member 7" query: 7 % ' + N + ' = ' + (7 % N) + '. Only that shard needs to be looked at. Conversely, a query that finds orders without a member number, such as "all orders from yesterday", has to query every shard.', '', d1, 'Query target: ' + q);
    var moved = '-';
    if (c.grow) {
      var N2 = N + 1;
      if (c.how === 'range') { var d2 = d1.concat([0]); moved = '0 (0%)'; push('Add one shard. The existing ranges are left as they are, and only the new orders after order ' + (TOTAL + 1) + ' go to the new shard. There is no data to move. However, the problem that writes pile up on one shard simply moves to the new shard.', 'good', d2); }
      else { var mv = orders.filter(function (o) { return o.mem % N !== o.mem % N2; }).length, d3 = dist(N2, per); moved = mv + ' (' + Math.round(mv / TOTAL * 100) + '%)'; push('Add one shard, making ' + N2 + ' shards. The rule changes from "% ' + N + '" to "% ' + N2 + '", and most of the remainder values change. Of the ' + TOTAL + ' orders, ' + mv + ' (' + Math.round(mv / TOTAL * 100) + '%) have to move to a different shard. That is a very large job to do while the system is running.', 'bad', d3); }
    }
    sum.push('Once chosen, a shard key is very hard to change. The most frequently used query condition should be the shard key, so that a query needs to look at only one shard. Queries without the shard key, and joins and transactions that span shards, become difficult.');
    if (c.grow && c.how !== 'range') sum.push('With the remainder method, almost everything is relocated when the number of shards changes. To reduce this, people use consistent hashing (when a shard is added, only the share that the new shard takes over moves), or divide the key range in advance into many small pieces and move data one piece at a time.');
    sum.push('Sharding is the last resort for dividing writes and data volume. Before it, first consider improving indexes and queries, caching, read-only replicas, and separating old data.');
    return { events: ev, summary: sum, row: [mx + ' / ' + mn, newTo, c.grow ? moved : '-', q] };
  },
  render: function (v, sim, t, H, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : null;
    if (!s) { H.text(v, 'Click Run to start.'); return; }
    var mx = Math.max.apply(null, s.d.concat([1])), ln = H.lanes(v);
    s.d.forEach(function (x, i) { H.lane(ln, 'Shard ' + i, 'Orders: ' + x, x === 0 ? 'none' : x > 120 / s.d.length * 1.3 ? 'bad' : '', x ? x / Math.max(mx, 60) : undefined); });
  },
  // Diagram: the router is on top, and the shards are below. The height of the bar inside a shard is the number of orders it holds.
  draw: function (P, sim, shown) {
    var c = sim.c, last = shown[shown.length - 1], s = last ? last.snap : { d: [], extra: '' }, d = s.d, n = d.length || c.n, w = (648 - (n - 1) * 10) / n, mx = Math.max.apply(null, d.concat([60])), ex = s.extra || '';
    var newAll = ex.indexOf('multiple shards') >= 0, newOne = /New order → shard (\d+)/.exec(ex), qAll = ex.indexOf('all shards') >= 0, qOne = ex.indexOf('1 shard') >= 0 ? 7 % n : -1;
    P.size(680, 330);
    P.box('rt', 160, 16, 360, 40, { cls: 'wait', center: true, title: c.how === 'range' ? 'Router: picks the shard by order number range' : 'Router: picks the shard by member number % ' + n });
    for (var i = 0; i < n; i++) {
      var x = 16 + i * (w + 10), cnt = d[i] || 0, h = Math.max(2, 120 * cnt / mx), on = qAll || qOne === i, hit = newAll || (newOne && +newOne[1] === i);
      P.box('sh' + i, x, 106, w, 184, { cls: 'plain' + (on ? ' now' : ''), title: 'Shard ' + i, sub: 'Orders: ' + cnt, center: true });
      P.box('fill' + i, x + 8, 282 - h, w - 16, h, { cls: cnt > 120 / n * 1.3 ? 'bad' : cnt ? 'good' : 'ghost' });
      P.arrow('ar' + i, 'rt:b:' + ((i + 0.5) / n), 'sh' + i + ':t', { cls: hit ? 'hot' : 'mut' });
    }
    if (ex) P.text('ex', 340, 314, ex + (qOne >= 0 ? ' (shard ' + qOne + ')' : ''), { anchor: 'middle', bold: true });
    P.note('The height of a bar is the number of orders in that shard. A red bar is a shard with far more orders than average. A bold arrow points to the shard that new orders go to, and a bold border marks a shard that has to be queried.');
  },
  assume: 'This is a small example with 120 orders and 40 members. Member numbers were assigned evenly to the orders, and with the "many orders" setting, one in every three orders was given to member 7. The ratio of data that moves when the number of shards changes is a value actually calculated from this data. A setup with replicas for each shard and the router that manages shard locations are left out. For 2 to 6 shards, the number of orders that must move when one shard is added was calculated separately in Java, and it matched the values on the screen.',
});

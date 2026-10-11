Lab.register({
  id: 'joinalgo', nav: 'Join algorithms', cat: 'Database', mode: 'step',
  title: 'How does the database find matching rows when the join column has no index?',
  intro: 'A join reads one table first and, for each of its rows, finds the matching rows in the other table. If an index can be used to find the matches, only the rows needed are read. If not, the whole table must be read. In that case, MySQL 8 uses a different method called a hash join.',
  terms: ['Nested-loop join', 'Hash join', 'Driving table', 'Optimizer', 'Query execution plan (EXPLAIN)'],
  controls: [
    { id: 'idx', label: 'orders.member_id has an index', type: 'check', value: false },
    { id: 'drive', label: 'Table to read first (driving table)', type: 'select', value: 'm', options: [['m', 'member first (fixed with STRAIGHT_JOIN)'], ['o', 'orders first (fixed with STRAIGHT_JOIN)'], ['auto', 'Leave it to the optimizer (JOIN)']] },
    { id: 'hash', label: 'A hash join can be used', type: 'check', value: true, show: function (c) { return !c.idx && c.drive === 'm'; }, hint: 'If you turn it off, the NO_BNL hint is added so that a hash join cannot be used. This setting is for seeing how many rows a nested-loop join without an index reads.' },
  ],
  // The hash join setting means something only when a hash join is chosen (no index, member first)
  fix: function (c) { return !(!c.idx && c.drive === 'm') && !c.hash ? { hash: true } : null; },
  presets: [
    { t: 'Default settings', d: 'The join column has no index. A hash join is chosen instead of a nested-loop join.', v: { idx: false, drive: 'm', hash: true } },
    { t: 'Creating an index on the join column', d: 'It becomes a nested-loop join, which looks up each row through the index.', v: { idx: true, drive: 'm', hash: true } },
    { t: 'No index and no hash join', d: 'For each row of member, the whole of orders is read. That is 10,000,000 rows.', v: { idx: false, drive: 'm', hash: false } },
    { t: 'Reading orders first', d: 'member is looked up one row at a time by primary key.', v: { idx: false, drive: 'o', hash: true } },
    { t: 'Leaving it to the optimizer (no index)', d: 'It sets the order so that the table that can be reached through an index is read later.', v: { idx: false, drive: 'auto', hash: true } },
    { t: 'Leaving it to the optimizer (with an index)', d: 'It reads member, which has fewer rows, first.', v: { idx: true, drive: 'auto', hash: true } },
  ],
  num: function (x) { return String(Math.round(x)).replace(/\B(?=(\d{3})+(?!\d))/g, ','); },
  code: function (c) {
    var from = c.drive === 'm' ? '  FROM member m\n  STRAIGHT_JOIN orders o ON o.member_id = m.id;   -- read the tables in the order written' : c.drive === 'o' ? '  FROM orders o\n  STRAIGHT_JOIN member m ON m.id = o.member_id;   -- read the tables in the order written' : '  FROM member m\n  JOIN orders o ON o.member_id = m.id;            -- the optimizer decides the reading order';
    return '-- member: 1,000 rows (primary key id)\n-- orders: 10,000 rows (10 orders per member)\n' + (c.idx ? 'CREATE INDEX idx_member ON orders (member_id);' : '-- no index on orders.member_id') + '\n\nEXPLAIN FORMAT=TREE\nSELECT ' + (c.hash ? '' : '/*+ NO_BNL() */ ') + 'm.name, o.amount\n' + from;
  },
  label: function (c) { return 'member_id index ' + (c.idx ? 'present' : 'none') + ' · ' + { m: 'member first', o: 'orders first', auto: 'left to the optimizer' }[c.drive] + (c.hash ? '' : ' · hash join off'); },
  columns: ['Table read first', 'Join method', 'How the later table is searched (type / key)', 'Times the later table was read × rows per read', 'Rows read from both tables'],
  NAME: { m: 'member', o: 'orders' },
  // The plan MySQL chooses. If the join column of the table read later has an index, it looks rows up through the index with a nested loop. If not, it uses a hash join (or, if that is blocked, a nested loop that reads the whole table).
  plan: function (c) {
    var idx = !!c.idx, hashOk = !!c.hash, ROWS = { m: 1000, o: 10000 };
    var first = c.drive === 'auto' ? (idx ? 'm' : 'o') : c.drive, second = first === 'm' ? 'o' : 'm';
    var hasIdx = second === 'm' ? true : idx;          // member.id is the primary key, so it always has an index
    var algo = hasIdx ? 'nl' : hashOk ? 'hash' : 'scan';
    var type = second === 'm' ? 'eq_ref' : idx ? 'ref' : 'ALL', key = second === 'm' ? 'PRIMARY' : idx ? 'idx_member' : 'NULL';
    var loops = algo === 'hash' ? 1 : ROWS[first], each = second === 'm' ? 1 : idx ? 10 : 10000;
    var extra2 = algo === 'hash' ? 'Using where; Using join buffer (hash join)' : algo === 'scan' ? 'Using where' : '';
    return { first: first, second: second, algo: algo, type: type, key: key, loops: loops, each: each, firstRows: ROWS[first], total: ROWS[first] + loops * each, extra2: extra2,
      tree: algo === 'hash' ? 'Inner hash join (o.member_id = m.id)' : 'Nested loop inner join' };
  },
  simulate: function (c) {
    var p = this.plan(c), num = this.num, N = this.NAME, ev = [], sum = [], F = N[p.first], S = N[p.second];
    var st = { stage: 0, cur: -1, all: false, loops: 0, phase: '' };
    function push(s, k) { ev.push({ s: s, k: k || '', snap: JSON.parse(JSON.stringify(st)) }); }
    st.stage = 1;
    push('The query: it pairs member and orders by member number and retrieves each member name and order amount. member has 1,000 rows and orders has 10,000 rows, with 10 orders per member. The result is 10,000 rows.');
    st.stage = 2;
    if (c.drive === 'auto') push('Deciding which table to read first: this was left to the optimizer. ' + (c.idx ? 'Whichever order is used, the later table can be reached through an index (member.id is the primary key, and orders.member_id has idx_member). The optimizer calculated that reading member, which has fewer rows, first costs less.' : 'orders.member_id has no index, but member.id is the primary key. The optimizer decided to read orders first so that member, which can be reached through an index, is read later. This is the opposite of the order written in FROM.'));
    else push('Deciding which table to read first: STRAIGHT_JOIN makes the tables be read in the order written, so ' + F + ' is read first. The table that is read first is called the driving table.');
    st.stage = 3;
    if (p.algo === 'nl') push('Deciding how to find matches: the join column of ' + S + ', the table read later, ' + (p.second === 'm' ? 'is id, the primary key.' : 'is member_id, which has the index idx_member.') + ' So a nested-loop join is used. For each row read from ' + F + ', the matching rows in ' + S + ' are looked up through the index. The type in EXPLAIN is ' + p.type + '.', 'good');
    else if (p.algo === 'hash') push('Deciding how to find matches: the join column member_id of orders, the table read later, has no index. With a nested loop, all 10,000 rows of orders would have to be read for every row of member. In this case, MySQL 8 chooses a hash join. The first line of EXPLAIN FORMAT=TREE shows Inner hash join.', '');
    else push('Deciding how to find matches: the join column member_id of orders, the table read later, has no index, and the NO_BNL hint also blocks the hash join. The only method left is a nested-loop join without an index. For each row read from member, the whole of orders is read.', 'bad');
    if (p.algo === 'hash') {
      st.stage = 4; st.phase = 'build';
      push('Hash join step 1, build the hash table: the 1,000 rows of member are read once, and a hash table keyed on id is built in memory. A hash table is a structure in which an entry is put directly into a position calculated from its key value and is found directly from the same calculation.');
      st.stage = 5; st.phase = 'probe'; st.loops = 1; st.all = true;
      push('Hash join step 2, find matches: the 10,000 rows of orders are read once from beginning to end, and for each row, member_id is looked up in the hash table. Each lookup checks only the calculated position instead of scanning a table. Times orders was read: 1.', 'good');
    } else {
      var one = p.second === 'm' ? 'the one row with the same id is found directly in the primary key index.' : p.algo === 'nl' ? 'in the idx_member index, the place where member_id matches is found, and ' + p.each + ' orders are read.' : 'all 10,000 rows of orders are read from beginning to end, the 10 rows with the same member_id are picked out, and the other 9,990 rows are read and then discarded.';
      st.stage = 4; st.cur = 0; st.loops = 1;
      push('Read the first row of ' + F + ' (' + (p.first === 'm' ? 'member 1' : 'order 1, member 1') + '): ' + one, p.algo === 'scan' ? 'bad' : '');
      st.stage = 5; st.cur = 1; st.loops = 2;
      push('Read the second row of ' + F + ' (' + (p.first === 'm' ? 'member 2' : 'order 2, member 2') + '): the same thing is repeated. ' + (p.algo === 'scan' ? 'All 10,000 rows of orders are read again from the start. It does not remember what it read before.' : 'Only the matching rows are read from ' + S + ': ' + p.each + ' per lookup.'), p.algo === 'scan' ? 'bad' : '');
      st.stage = 6; st.cur = -1; st.all = true; st.loops = p.loops;
      push('The same is repeated for the remaining rows of ' + F + ': ' + F + ' has ' + num(p.firstRows) + ' rows, so ' + S + ' is ' + (p.algo === 'scan' ? 'read' : 'looked up') + ' ' + num(p.loops) + ' times. At ' + num(p.each) + ' rows each time. In ' + S + ', ' + num(p.loops * p.each) + ' rows are read in all.', p.algo === 'scan' ? 'bad' : 'good');
    }
    st.stage = 7; st.cur = -1; st.all = true; st.loops = p.loops;
    push('The result, 10,000 rows, is produced. The rows read from the two tables: ' + F + ' ' + num(p.firstRows) + ' rows and ' + S + ' ' + num(p.loops * p.each) + ' rows, ' + num(p.total) + ' rows in total.', p.algo === 'scan' ? 'bad' : 'good');
    if (p.algo === 'nl' && p.second === 'o') sum.push('The amount a nested-loop join reads is "the number of rows in the table read first × the number of rows read per lookup". If the join column of the later table has an index, only the rows needed are read each time. This is why you should create an index on a column that refers to the primary key of another table (here, orders.member_id).');
    if (p.algo === 'nl' && p.second === 'm') sum.push('If orders is read first, member is looked up one row at a time by primary key (type eq_ref). An index on the join column is used only when it is on the table that is read later.' + (c.drive === 'auto' ? ' The optimizer chooses an order that allows lookups through an index like this by itself. But it reads 20,000 rows, which is more than the 11,000 rows read when member is read first with the index on orders.member_id.' : ' In this order, the plan is the same whether or not orders.member_id has an index.'));
    if (c.drive === 'auto' && c.idx) sum.push('When it is left to the optimizer, it looks at statistics and chooses the order with the lower cost. Here it read member, which has fewer rows, first. If the amount and distribution of the data change, the choice can change too.');
    if (p.algo === 'hash') sum.push('A hash join builds a hash table from one table and reads the other table only once. Where a nested-loop join without an index would have read 1,000 × 10,000 = 10,000,000 rows, it finishes with 11,000 rows. In EXPLAIN, the Extra column shows Using join buffer (hash join).');
    if (p.algo === 'hash') sum.push('Even so, indexes do not become unnecessary. A hash join reads the whole of orders, so even if you only look for the orders of 10 members, it reads all 10,000 rows of orders. With an index, it would look up 10 times and read only 100 rows.');
    if (p.algo === 'scan') sum.push('Without an index or a hash join, the whole of the later table is read for every row of the table read first. That is 1,000 × 10,000 = 10,000,000 rows. If each of the two tables becomes 10 times larger, the amount read becomes 100 times larger.');
    return { events: ev, summary: sum, p: p, row: [F, p.algo === 'hash' ? 'Hash join' : 'Nested-loop join', p.type + ' / ' + (p.key === 'NULL' ? 'no index' : p.key), num(p.loops) + ' × ' + num(p.each), num(p.total)] };
  },
  render: function (v, sim, t, H, shown) {
    var p = sim.p, num = this.num, N = this.NAME, last = shown[shown.length - 1], s = last ? last.snap : null;
    if (!s) { H.text(v, 'Click Run to follow the order in which MySQL processes the join.'); return; }
    var ln = H.lanes(v);
    H.lane(ln, 'Driving table', s.stage >= 2 ? N[p.first] + ' (' + num(p.firstRows) + ' rows)' : 'Not decided yet', s.stage >= 2 ? 'hot' : 'none');
    H.lane(ln, 'Join method', s.stage >= 3 ? (p.algo === 'hash' ? 'Hash join' : p.algo === 'nl' ? 'Nested-loop join + index ' + p.key : 'Nested-loop join + full read every time') : 'Not decided yet', s.stage >= 3 ? (p.algo === 'scan' ? 'bad' : 'good') : 'none');
    if (s.stage >= 3) {
      H.table(v, ['table', 'type', 'key', 'Extra'], [
        { cells: [p.first, 'ALL', 'NULL', ''] },
        { cells: [p.second, { v: p.type, cls: p.type === 'ALL' ? 'bad' : 'good' }, p.key, p.extra2] },
      ], 'In EXPLAIN (main columns only, the upper line is read first)');
      H.text(v, 'First line of EXPLAIN FORMAT=TREE: -> ' + p.tree);
    }
    if (s.stage >= 4) {
      var innerRead = p.algo === 'hash' ? (s.phase === 'probe' ? p.each : 0) : s.loops * p.each, firstRead = p.algo === 'hash' ? p.firstRows : s.all ? p.firstRows : s.loops;
      H.counters(v, [[num(firstRead), 'Rows read from ' + N[p.first]], [num(s.loops), 'Times ' + N[p.second] + ' was read'], [num(innerRead), 'Rows read from ' + N[p.second]]]);
    }
  },
  // Diagram: on the left the table that is read first, on the right the table that is read later, and in the middle the means of finding matches (an index or a hash table). It is drawn reduced to 3 members and 6 orders.
  draw: function (P, sim, shown) {
    var p = sim.p, num = this.num, N = this.NAME, last = shown[shown.length - 1], s = last ? last.snap : { stage: 0, cur: -1, all: false, loops: 0, phase: '' };
    var M = [1, 2, 3], O = [[101, 1], [102, 2], [103, 3], [104, 1], [105, 2], [106, 3]], mFirst = p.first === 'm';
    P.size(680, 340);
    P.region('L', 16, 16, 200, 256, (s.stage >= 2 ? 'Read first: ' : '') + N[p.first]);
    P.region('R', 464, 16, 200, 256, (s.stage >= 2 ? 'Read later: ' : '') + N[p.second]);
    function mBox(i, x, cls) { P.box('m' + M[i], x, 64 + i * 62, 172, 40, { cls: cls, title: 'Member ' + M[i] }); }
    function oBox(i, x, cls) { P.box('o' + O[i][0], x, 44 + i * 37, 172, 30, { cls: cls, title: 'Order ' + O[i][0], right: 'Member ' + O[i][1] }); }
    var lx = 30, rx = 478, on = s.stage >= 4;
    // The row(s) of the first table being processed now
    function active(i) { return on && (s.all || s.cur === i); }
    if (p.algo === 'hash') {
      M.forEach(function (m, i) { mBox(i, lx, s.stage >= 4 ? 'good' : 'wait'); });
      O.forEach(function (o, i) { oBox(i, rx, s.phase === 'probe' ? 'good' : 'plain'); });
      P.box('mid', 252, 114, 176, 60, { cls: s.stage >= 4 ? 'hot' : 'ghost', title: 'Hash table (memory)', sub: s.stage >= 4 ? 'Keys: members 1, 2, 3' : 'Not built yet' });
      if (s.stage >= 4) M.forEach(function (m, i) { P.arrow('b' + m, 'm' + m + ':r', 'mid:l:' + (0.25 + i * 0.25), { cls: s.phase === 'build' ? 'hot' : 'mut' }); });
      if (s.phase === 'probe') O.forEach(function (o, i) { P.arrow('q' + o[0], 'o' + o[0] + ':l', 'mid:r:' + (0.1 + i * 0.16), { cls: 'good' }); });
    } else if (mFirst) {
      M.forEach(function (m, i) { mBox(i, lx, active(i) ? 'hot' + (s.cur === i ? ' now' : '') : 'wait'); });
      O.forEach(function (o, i) {
        var match = on && (s.all || M[s.cur] === o[1]), touched = on && p.algo === 'scan';
        oBox(i, rx, match ? 'good' : touched ? 'bad' : 'plain');
      });
      if (p.algo === 'nl') {
        P.box('mid', 252, 114, 176, 60, { cls: on ? 'hot' : 'plain', title: 'Index idx_member', sub: 'Sorted by member_id' });
        M.forEach(function (m, i) { if (active(i)) P.arrow('b' + m, 'm' + m + ':r', 'mid:l:' + (0.25 + i * 0.25), { cls: s.cur === i ? 'hot' : 'mut' }); });
        O.forEach(function (o, i) { if (on && (s.all || M[s.cur] === o[1])) P.arrow('q' + o[0], 'mid:r:' + (0.1 + i * 0.16), 'o' + o[0] + ':l', { cls: 'good' }); });
      } else {
        P.text('noix', 340, 36, 'No index', { cls: 'bad', anchor: 'middle', bold: true });
        P.text('noix2', 340, 54, 'Reads everything each time', { cls: 'bad', anchor: 'middle' });
        if (on && !s.all) O.forEach(function (o, i) { P.arrow('q' + o[0], 'm' + M[s.cur] + ':r', 'o' + o[0] + ':l', { cls: M[s.cur] === o[1] ? 'good' : 'bad' }); });
        if (on && s.all) M.forEach(function (m, i) { P.arrow('b' + m, 'm' + m + ':r', [460, 82 + i * 62], { cls: 'bad', label: 'full read' }); });
      }
    } else {
      O.forEach(function (o, i) { oBox(i, lx, active(i) ? 'hot' + (s.cur === i ? ' now' : '') : 'wait'); });
      M.forEach(function (m, i) { var match = on && (s.all || O[s.cur][1] === m); mBox(i, rx, match ? 'good' : 'plain'); });
      P.box('mid', 252, 114, 176, 60, { cls: on ? 'hot' : 'plain', title: 'Primary key index', sub: 'Finds one row by id' });
      O.forEach(function (o, i) { if (active(i)) P.arrow('q' + o[0], 'o' + o[0] + ':r', 'mid:l:' + (0.1 + i * 0.16), { cls: s.cur === i ? 'hot' : 'mut' }); });
      M.forEach(function (m, i) { if (on && (s.all || O[s.cur][1] === m)) P.arrow('b' + m, 'mid:r:' + (0.25 + i * 0.25), 'm' + m + ':l', { cls: 'good' }); });
    }
    var done = s.stage >= 6 || (p.algo === 'hash' && s.stage >= 5);
    P.box('r1', 16, 288, 320, 36, { cls: s.stage >= 3 ? (p.algo === 'scan' ? 'bad' : 'good') : 'ghost', title: 'Join method', right: s.stage >= 3 ? (p.algo === 'hash' ? 'Hash join' : 'Nested-loop join') : '?' });
    P.box('r2', 344, 288, 320, 36, { cls: done ? (p.algo === 'scan' ? 'bad' : 'good') : 'ghost', title: 'Rows read from both tables', right: done ? num(p.total) : '?' });
    P.note('Drawn reduced to 3 members and 6 orders (the real numbers are based on 1,000 rows in member and 10,000 rows in orders). Green is a row that was read and matched, red is a row that was read and then discarded, and white is a row that was not read. The orders are not laid out in member number order, so without an index there is no way to know where a match is.');
  },
  assume: 'For all seven combinations that can be chosen on the screen, the same tables (member with 1,000 rows and orders with 10,000 rows) were created in MySQL 8.4 on the PC used to write this lab, ANALYZE TABLE was run, and the results were checked against the model. The type, key, and Extra of the table read first and the table read later were checked with EXPLAIN, the join method with the first line of EXPLAIN FORMAT=TREE, and the number of times the later table was read and the rows read each time with loops and rows of EXPLAIN ANALYZE, which counts while it actually runs the query. In the five cases where the hash join setting is hidden, it was also confirmed that adding the NO_BNL hint does not change the plan. The order chosen when the choice is left to the optimizer is the result of a cost calculation, so it can differ depending on the amount and distribution of the data. "Rows read" is the number of rows taken out of the tables or indexes. It does not include the cost of descending an index, the cost of building and searching a hash table, or the time taken. Hash joins were introduced in MySQL 8.0.18, and from 8.0.20 they replace the block nested-loop join that was used for joins without an index. If the hash table does not fit in memory (join_buffer_size), disk is used as well. These two points were not confirmed by running them; they follow the explanation of hash join optimization in the MySQL documentation. The diagram is reduced to 3 members and 6 orders.',
});

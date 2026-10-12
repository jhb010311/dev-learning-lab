Lab.register({
  id: 'index', nav: 'Indexes and full table scans', cat: 'Database', mode: 'step',
  title: 'Why is the index not used even though it exists?',
  intro: 'There are two ways to find the rows that match a condition: read the table from beginning to end (a full table scan), or find the positions in an index and read only those rows. Which one is cheaper depends on the share of rows the condition matches, and the optimizer chooses by looking at statistics.',
  terms: ['Index', 'B-tree index', 'Full table scan', 'Query execution plan (EXPLAIN)', 'Optimizer', 'Cardinality and selectivity'], ranks: ['index', 'tuning', 'dbengine'],
  controls: [
    { id: 'rows', label: 'Rows in the table', type: 'select', value: '100000', options: [['1000', '1,000 rows'], ['100000', '100,000 rows'], ['10000000', '10,000,000 rows']] },
    { id: 'sel', label: 'Share of rows that match the condition', type: 'select', value: '0.1', options: [['0.1', '0.1%'], ['1', '1%'], ['10', '10%'], ['20', '20%'], ['30', '30%'], ['50', '50%']] },
    { id: 'idx', label: 'The condition column has an index', type: 'check', value: true },
    { id: 'force', label: 'Force the index to be used (FORCE INDEX)', type: 'check', value: false, show: function (c) { return c.idx; } },
  ],
  presets: [
    { t: 'Default settings', q: 'Which method reads a table of 100,000 rows when 0.1% of the rows match the condition and the condition column has an index?', d: 'Of 100,000 rows, only 0.1% match the condition. The index reads only 100 rows.', v: { rows: '100000', sel: '0.1', idx: true, force: false } },
    { t: 'Same query, no index', q: 'What if you remove the index on the condition column for the same query?', d: 'To find 100 rows, it reads all 100,000 rows.', v: { rows: '100000', sel: '0.1', idx: false, force: false } },
    { t: 'When half the rows match', q: 'What if the share of rows that match the condition is 50%?', d: 'Even with an index, the optimizer chooses a full table scan.', v: { rows: '100000', sel: '50', idx: true, force: false } },
    { t: 'Forcing the index anyway', q: 'What if 50% of the rows match the condition and you force the index to be used with FORCE INDEX?', d: 'It actually costs more.', v: { rows: '100000', sel: '50', idx: true, force: true } },
    { t: 'Near the boundary: 20% and 30%', q: 'What if the share of rows that match the condition is 20%?', d: 'Run it at 20%, then change to 30% and compare.', v: { rows: '100000', sel: '20', idx: true, force: false } },
    { t: 'No index on 10,000,000 rows', q: 'What if the table has 10,000,000 rows and the condition column has no index?', d: 'It gets slower in proportion to the extra rows.', v: { rows: '10000000', sel: '0.1', idx: false, force: false } },
  ],
  code: function (c) {
    return (c.idx ? 'CREATE INDEX idx_orders_status ON orders (status);\n\n' : '-- no index on the status column\n\n') + 'SELECT *\n  FROM orders' + (c.idx && c.force ? ' FORCE INDEX (idx_orders_status)' : '') + "\n WHERE status = 'CANCELED';   -- " + c.sel + '% of all rows';
  },
  label: function (c) { return this.num(+c.rows) + ' rows · ' + c.sel + '% match · index ' + (c.idx ? 'present' + (c.force ? ' (forced)' : '') : 'none'); },
  num: function (x) { return String(Math.round(x)).replace(/\B(?=(\d{3})+(?!\d))/g, ','); },
  columns: ['Method chosen', 'Rows read', 'Result rows', 'Rows discarded', 'Relative cost'],
  simulate: function (c) {
    var N = +c.rows, matched = Math.max(1, Math.round(N * (+c.sel) / 100)), W = 4, h = Math.max(1, Math.ceil(Math.log(N) / Math.log(500))), num = this.num, ev = [];
    var costFull = N, costIdx = matched * W + h, useIdx = c.idx && (c.force || costIdx < costFull), plan = useIdx ? 'index' : 'full';
    function push(s, k, stage) { ev.push({ s: s, k: k, snap: { stage: stage } }); }
    push('The query arrives. The optimizer looks at statistics to decide how to run it. The table has about ' + num(N) + ' rows, and the optimizer expects the condition status = \'CANCELED\' to match about ' + num(matched) + ' rows (' + c.sel + '%).', '', 1);
    push('Method 1, full table scan: read the table from beginning to end, in order, and check the condition on each row. It reads ' + num(N) + ' rows. Reading in order is cheap per row. Estimated cost: ' + num(costFull) + '.', '', 2);
    if (c.idx) push('Method 2, index: find the positions of the ' + num(matched) + ' matching entries in the index, then go to the table one entry at a time to read the other columns. It reads fewer rows, but each one means jumping to a different place in the table, so the cost per row is higher (assumed here to be 4 times as much). Estimated cost: ' + num(costIdx) + '.', '', 3);
    else push('Method 2 is not available. There is no index on the status column, so a full table scan is the only choice.', 'bad', 3);
    if (c.idx && c.force && costIdx >= costFull) push('By the optimizer\'s calculation, a full table scan is cheaper, but the FORCE INDEX hint is present, so the index is used.', 'bad', 4);
    else if (c.idx) push('The optimizer chooses the method with the lower cost: ' + (useIdx ? 'the index' : 'a full table scan') + '.' + (useIdx ? '' : ' It judged that not using the index, even though one exists, is cheaper.'), useIdx ? 'good' : '', 4);
    if (useIdx) {
      push('Starting from the root of the index (a B-tree), it goes down ' + h + ' levels to find the first position that matches the condition. At each level, it narrows the range among the sorted keys. Even with ' + num(N) + ' rows, ' + h + ' levels are enough to get there.', '', 5);
      push('From that position, it reads along the index to collect the ' + num(matched) + ' matching entries, and for each entry it reads the row from the table. The rows that do not match the condition were never read.', 'good', 6);
    } else {
      push('It reads all ' + num(N) + ' rows, from the first row of the table to the last. For each row it checks status, keeps only ' + num(matched) + ' rows, and discards the other ' + num(N - matched) + ' rows after reading them.', c.idx ? '' : 'bad', 6);
    }
    var read = useIdx ? matched : N, cost = useIdx ? costIdx : costFull, sum = [];
    if (!c.idx) sum.push('Without an index, the whole table must be read however many rows match. If the number of rows grows 10 times, the amount read grows 10 times. If there had been an index, the estimated cost would have been ' + num(costIdx) + ', ' + (costIdx < costFull ? 'about ' + (Math.round(costFull / costIdx) >= 2 ? '1/' + Math.round(costFull / costIdx) : 'half') + ' of the full table scan.' : 'which is higher than the full table scan. An index does not help with this condition.'));
    else if (useIdx && !(c.force && costIdx >= costFull)) sum.push('The lower the share of matching rows (the better the selectivity), the greater the benefit of the index. A full table scan would have cost ' + num(costFull) + ', about ' + Math.max(1, Math.round(costFull / costIdx)) + ' times as much.');
    else if (useIdx) sum.push('Forcing the index made the cost ' + num(costIdx) + ', which is higher than the full table scan (' + num(costFull) + '). The optimizer\'s judgment was right. Use a hint only when you have evidence that the statistics are wrong.');
    else sum.push('When too many rows match the condition, the total cost of looking rows up one at a time exceeds the cost of reading the whole table in order. That is why a full table scan is chosen even though an index exists. It is also why an index on a single column with few distinct values, such as gender or a status value, helps little.');
    return { events: ev, summary: sum, k: { N: N, matched: matched, costFull: costFull, costIdx: costIdx, useIdx: useIdx, h: h, read: read, cost: cost }, row: [useIdx ? 'Index' : 'Full table scan', num(read), num(matched), num(read - matched), num(cost)] };
  },
  render: function (v, sim, t, H, shown) {
    var c = sim.c, k = sim.k, num = this.num, last = shown[shown.length - 1], st = last ? last.snap.stage : 0, mx = Math.max(k.costFull, c.idx ? k.costIdx : 0);
    H.title(v, 'Estimated cost of the two methods the optimizer compares'); var ln = H.lanes(v);
    H.lane(ln, 'Full table scan', st >= 2 ? num(k.N) + ' rows read × 1 per row = ' + num(k.costFull) : 'Not calculated yet', st >= 4 && !k.useIdx ? 'good' : st >= 2 ? '' : 'none', st >= 2 ? k.costFull / mx : undefined);
    H.lane(ln, 'Index', !c.idx ? 'No index' : st >= 3 ? num(k.matched) + ' rows read × 4 per row + tree descent ' + k.h + ' = ' + num(k.costIdx) : 'Not calculated yet', !c.idx ? 'bad' : st >= 4 && k.useIdx ? 'good' : st >= 3 ? '' : 'none', c.idx && st >= 3 ? k.costIdx / mx : undefined);
    if (st >= 4) H.table(v, ['type', 'key', 'rows', 'Extra'], [{ cells: [k.useIdx ? 'ref' : 'ALL', k.useIdx ? 'idx_orders_status' : 'NULL', num(k.useIdx ? k.matched : k.N), k.useIdx ? '' : 'Using where'] }], 'In EXPLAIN (main columns only)');
    if (st >= 6) H.counters(v, [[num(k.read), 'Rows read'], [num(k.matched), 'Result rows'], [num(k.read - k.matched), 'Rows read and discarded']]);
  },
  // Diagram: the index (B-tree) on the left and the table on the right. Both are drawn reduced to 20 cells.
  // In the leaf of the index, the matching entries sit together, but the table rows they point to are scattered.
  draw: function (P, sim, shown) {
    var c = sim.c, k = sim.k, last = shown[shown.length - 1], st = last ? last.snap.stage : 0, m = Math.max(1, Math.round(20 * (+c.sel) / 100));
    var perm = [3, 17, 8, 12, 0, 15, 6, 19, 10, 5], hit = {}, done = st >= 6, viaIdx = k.useIdx; perm.slice(0, m).forEach(function (r) { hit[r] = 1; });
    P.size(680, 330);
    P.region('ix', 16, 16, 340, 298, c.idx ? 'Index (sorted by status value)' : 'Index');
    P.region('tb', 400, 16, 264, 298, 'orders table (in stored order)');
    for (var j = 0; j < 20; j++) P.box('r' + j, 416 + (j % 4) * 60, 56 + Math.floor(j / 4) * 48, 52, 36, { cls: hit[j] ? (done ? 'good' : 'wait') : done && !viaIdx ? 'bad' : 'plain', sub: hit[j] ? 'match' : '', center: true });
    if (!c.idx) P.text('noix', 186, 160, 'No index on the status column', { cls: 'bad', anchor: 'middle' });
    else {
      var on = viaIdx && st >= 5;
      P.box('root', 136, 50, 100, 26, { cls: on ? 'hot' : 'plain', sub: 'Root', center: true });
      P.box('brL', 46, 104, 110, 26, { cls: on ? 'hot' : 'plain', sub: 'Internal', center: true });
      P.box('brR', 216, 104, 110, 26, { cls: 'plain', sub: 'Internal', center: true });
      P.arrow('a1', 'root:b:0.3', 'brL:t', { cls: on ? 'hot' : 'mut' }); P.arrow('a2', 'root:b:0.7', 'brR:t', { cls: 'mut' });
      P.text('lfl', 30, 166, 'Leaf: entries in value order', { cls: 'mut' });
      for (var i = 0; i < 20; i++) P.box('l' + i, 30 + i * 15.6, 176, 13, 24, { cls: i < m ? (viaIdx && done ? 'good' : on ? 'hot' : 'wait') : 'plain' });
      P.arrow('a3', 'brL:b', 'l4:t', { cls: on ? 'hot' : 'mut' }); P.arrow('a4', 'brR:b', 'l15:t', { cls: 'mut' });
      if (viaIdx && done) for (var q = 0; q < m; q++) P.arrow('p' + q, 'l' + q + ':b', 'r' + perm[q] + ':l', { cls: 'good' });
      if (!viaIdx && st >= 4) P.text('skip', 186, 260, 'The index exists but is not used', { cls: 'mut', anchor: 'middle' });
    }
    P.note('The table and the index are drawn reduced to 20 cells each. Blue cells are rows that match the condition, green cells are rows that were read and became part of the result, red cells are rows that were read and then discarded, and white cells are rows that were not read. In the leaf of the index, the matching entries sit together in one place, but the table rows they point to are scattered, so each one must be looked up separately.');
  },
  assume: 'The costs are a simple model made to show the relationship. The cost of reading one row in order is assumed to be 1, and the cost of reading one row from the table through the index is assumed to be 4. With this ratio, a full table scan becomes better when more than about 25% of the rows match, which is fitted to the rule of thumb often given in books about MySQL that a full table scan is better when more than 20 to 25% of all rows match. The real optimizer calculates in more detail, using the number of pages, the share that is already in memory, column statistics, and so on, so the boundary differs from case to case. The number of B-tree levels is calculated by assuming that a node holds 500 keys. If you select only columns that are in the index instead of SELECT *, the query does not need to go to the table, and the calculation changes. This is covered in the "Composite and covering indexes" lab.',
});

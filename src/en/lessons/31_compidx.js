Lab.register({
  id: 'compidx', nav: 'Composite and covering indexes', cat: 'Database', mode: 'step',
  title: 'A composite index can be used only in column order',
  intro: 'An index on several columns is sorted by the first column, then by the next column, and so on. So the WHERE conditions must start from the first column to narrow the search range, and once a range condition is reached, the columns after it cannot be used to narrow the range. When every column the query reads is in the index, so that the table does not have to be visited, the index is called a covering index for that query.',
  terms: ['Composite index and leftmost prefix', 'Covering index', 'Clustered index and secondary index', 'Cardinality and selectivity', 'Query execution plan (EXPLAIN)'], ranks: ['index', 'tuning'],
  controls: [
    { id: 'ord', label: 'Column order of the index', type: 'select', value: 'msc', options: [['msc', '(member_id, status, created_at)'], ['mcs', '(member_id, created_at, status)']] },
    { id: 'm', label: 'WHERE member_id = 7', type: 'check', value: true },
    { id: 's', label: "WHERE status = 'PAID'", type: 'check', value: true },
    { id: 'd', label: "WHERE created_at >= '2026-09-01' (range condition)", type: 'check', value: true },
    { id: 'sel', label: 'Columns selected', type: 'select', value: 'star', options: [['star', 'SELECT * (all columns)'], ['cov', 'SELECT member_id, status, created_at (only columns in the index)']] },
  ],
  presets: [
    { t: 'Default settings', q: 'How is the index read when its column order is (member_id, status, created_at) and all three conditions are used with SELECT *?', d: 'The three conditions match the index order, so all three columns narrow the range.', v: { ord: 'msc', m: true, s: true, d: true, sel: 'star' } },
    { t: 'Leaving out the first-column condition', q: 'What if you turn off the WHERE member_id = 7 condition?', d: 'Without a member_id condition, this index cannot narrow the range.', v: { ord: 'msc', m: false, s: true, d: true, sel: 'star' } },
    { t: 'Leaving out the middle-column condition', q: 'What if you turn off the WHERE status = \'PAID\' condition?', d: 'Only the first column is used, and the date condition filters entries while the index is being read.', v: { ord: 'msc', m: true, s: false, d: true, sel: 'star' } },
    { t: 'Range-condition column in the middle', q: 'What if you change the column order of the index to (member_id, created_at, status)?', d: '(member_id, created_at, status). The status after the range cannot narrow the range.', v: { ord: 'mcs', m: true, s: true, d: true, sel: 'star' } },
    { t: 'Selecting only columns in the index', q: 'What if you select only member_id, status, and created_at?', d: 'The query reads only the index and never goes to the table (covering index).', v: { ord: 'msc', m: true, s: true, d: true, sel: 'cov' } },
    { t: 'Selecting only index columns, with no first-column condition', q: 'What if you turn off the member_id and created_at conditions and select only member_id, status, and created_at?', d: 'It cannot narrow the range, but it scans the whole index instead of the table.', v: { ord: 'msc', m: false, s: true, d: false, sel: 'cov' } },
  ],
  COLS: { m: ['member_id', 'member_id = 7', 0.001, 'eq'], s: ['status', "status = 'PAID'", 0.5, 'eq'], d: ['created_at', "created_at >= '2026-09-01'", 0.1, 'range'] },
  order: function (c) { return c.ord === 'msc' ? ['m', 's', 'd'] : ['m', 'd', 's']; },
  code: function (c) {
    var C = this.COLS, w = ['m', 's', 'd'].filter(function (k) { return c[k]; }).map(function (k) { return C[k][1]; });
    return 'CREATE INDEX idx_orders ON orders (' + this.order(c).map(function (k) { return C[k][0]; }).join(', ') + ');\n\nSELECT ' + (c.sel === 'star' ? '*' : 'member_id, status, created_at') + '\n  FROM orders' + (w.length ? '\n WHERE ' + w.join('\n   AND ') : '') + ';';
  },
  label: function (c) { var C = this.COLS; return '(' + this.order(c).map(function (k) { return C[k][0]; }).join(', ') + ') · conditions ' + (['m', 's', 'd'].filter(function (k) { return c[k]; }).map(function (k) { return C[k][0]; }).join(', ') || 'none') + ' · ' + (c.sel === 'star' ? 'SELECT *' : 'index columns only'); },
  num: function (x) { return String(Math.round(x)).replace(/\B(?=(\d{3})+(?!\d))/g, ','); },
  columns: ['Columns that narrowed the range', 'type', 'Index entries read', 'Table rows read', 'Extra'],
  plan: function (c) {
    var C = this.COLS, ord = this.order(c), N = 1000000, used = [], filt = [], stop = false, scan = N, out = N;
    ord.forEach(function (k) { if (!c[k]) { stop = true; return; } if (stop) { filt.push(k); return; } used.push(k); if (C[k][3] === 'range') stop = true; });
    used.forEach(function (k) { scan *= C[k][2]; }); ['m', 's', 'd'].forEach(function (k) { if (c[k]) out *= C[k][2]; });
    var cov = c.sel === 'cov', type = used.length ? (used.some(function (k) { return C[k][3] === 'range'; }) ? 'range' : 'ref') : cov ? 'index' : 'ALL';
    var afterFilter = scan; filt.forEach(function (k) { afterFilter *= C[k][2]; });
    var idxRead = type === 'ALL' ? 0 : scan, tblRead = type === 'ALL' ? N : cov ? 0 : afterFilter;
    var extra = type === 'ALL' ? 'Using where' : cov ? (filt.length || type === 'index' || type === 'range' ? 'Using where; Using index' : 'Using index') : filt.length || type === 'range' ? 'Using index condition' : '';
    if (!c.m && !c.s && !c.d) extra = cov ? 'Using index' : '';
    return { used: used, filt: filt, type: type, idxRead: idxRead, tblRead: tblRead, out: out, extra: extra, cov: cov, N: N };
  },
  simulate: function (c) {
    var C = this.COLS, p = this.plan(c), ord = this.order(c), num = this.num, ev = [], sum = [];
    function push(s, k, stage) { ev.push({ s: s, k: k, snap: { stage: stage } }); }
    push('The orders table has 1,000,000 rows. The index is sorted in the order ' + ord.map(function (k) { return C[k][0]; }).join(' → ') + '. Entries with the same first column are grouped together, within that group they are in order of the second column, and within that in order of the third column.', '', 1);
    ord.forEach(function (k, i) {
      var name = C[k][0];
      if (p.used.indexOf(k) >= 0) push('Column #' + (i + 1) + ' (' + name + '): there is the condition ' + C[k][1] + (i ? ', and the columns before it are all fixed, so' : ', and it is the first column of the index, so') + ' this condition narrows the range to read.' + (C[k][3] === 'range' && i < ord.length - 1 ? ' But it is a range condition, so within this range the next column is not sorted. The columns after it cannot be used to narrow the range.' : ''), 'good', 2 + i);
      else if (p.filt.indexOf(k) >= 0 && p.type !== 'ALL') push('Column #' + (i + 1) + ' (' + name + '): there is a condition, but the order was broken earlier, so it cannot be used to narrow the range. Instead, the index entries are checked against this value as they are read, and the ones that do not match are filtered out.', 'bad', 2 + i);
      else if (!c[k]) push('Column #' + (i + 1) + ' (' + name + '): this column has no condition.' + (i < 2 ? ' The order is broken here. The columns after it are not sorted across the whole index, so they cannot be used to narrow the range.' : ''), i < 2 ? 'bad' : '', 2 + i);
      else push('Column #' + (i + 1) + ' (' + name + '): there is a condition, but the order is broken from the first column on, so this index cannot be used to find a starting position.', 'bad', 2 + i);
    });
    if (p.type === 'ALL') push('This index cannot be used to find a starting position, and the columns being selected are not all in the index either. All 1,000,000 table rows are read, and the conditions are checked as they are read (a full table scan).', 'bad', 5);
    else if (p.type === 'index') push('It cannot narrow the range, but every column needed is inside the index. The index, which is smaller than the table, is read from beginning to end (the whole index is scanned). ' + num(p.idxRead) + ' index entries are read.', '', 5);
    else push(num(p.idxRead) + ' index entries in the narrowed range are read.' + (p.filt.length ? ' While reading, the remaining conditions are checked, and only ' + num(p.idxRead * p.filt.reduce(function (a, k) { return a * C[k][2]; }, 1)) + ' entries are kept.' : ''), '', 5);
    if (p.type !== 'ALL') push(p.cov ? 'Every column being selected is in the index, so the query finishes without going to the table (covering index). Table rows read: 0.' : 'SELECT * needs columns that are not in the index too. For each of the remaining ' + num(p.tblRead) + ' entries, the query goes to the table (the clustered index) and reads the whole row.', p.cov ? 'good' : '', 6);
    var usedNames = p.used.map(function (k) { return C[k][0]; }).join(', ') || 'none';
    if (!p.used.length) sum.push('A composite index usually cannot be used for searching when there is no condition on its first column (there are exceptions, such as the skip scan in MySQL). Put the columns of the conditions you use often first, and among them the columns used with "=".');
    else if (p.filt.length) sum.push('The conditions after the order was broken (' + p.filt.map(function (k) { return C[k][0]; }).join(', ') + ') could not narrow the range, so more index entries were read than necessary. If you put the "=" condition columns first and the range condition column after them, every column that has a condition narrows the range.');
    else if (p.used.length === 3) sum.push('The conditions continue in index order without a gap, so all three columns narrowed the range. The order in which you write the conditions in WHERE does not matter; the column order of the index decides.');
    if (p.cov && p.type !== 'ALL') sum.push('A secondary index holds only the index columns and the primary key, so if another column is needed, the query must go to the table one more time. If every needed column is in the index, that extra trip disappears. Such an index is called a covering index, and it appears as Using index in the Extra column of EXPLAIN. This is one reason to avoid SELECT *.');
    if (!sum.length) sum.push('Columns used to narrow the range: ' + usedNames + '. The query read ' + num(p.idxRead) + ' index entries and ' + num(p.tblRead) + ' table rows, and got about ' + num(Math.max(1, p.out)) + ' results.');
    return { events: ev, summary: sum, p: p, row: [usedNames, p.type, num(p.idxRead), num(p.tblRead), p.extra || '(none)'] };
  },
  render: function (v, sim, t, H, shown) {
    var p = sim.p, num = this.num, last = shown[shown.length - 1], st = last ? last.snap.stage : 0;
    if (st >= 5) { H.counters(v, [[num(p.idxRead), 'Index entries read'], [st >= 6 || p.type === 'ALL' ? num(p.tblRead) : '?', 'Table rows read'], [num(Math.max(1, p.out)), 'Result rows (approx.)']]);
      H.table(v, ['type', 'key', 'Extra'], [{ cells: [p.type, p.type === 'ALL' ? 'NULL' : 'idx_orders', p.extra || ''] }], 'In EXPLAIN (main columns only)'); }
  },
  // Diagram: the whole index is drawn as a long strip, showing how the range to read narrows (or fails to narrow) as each column is passed.
  draw: function (P, sim, shown) {
    var c = sim.c, p = sim.p, C = this.COLS, ord = this.order(c), num = this.num, last = shown[shown.length - 1], st = last ? last.snap.stage : 0, lo = 0, hi = 1;
    P.size(680, 330);
    P.region('ix', 16, 16, 648, 204, 'The whole index idx_orders (sorted column by column, from the left)');
    ord.forEach(function (k, i) {
      var y = 50 + i * 54, on = st >= 2 + i, used = p.used.indexOf(k) >= 0, filt = p.filt.indexOf(k) >= 0 && p.type !== 'ALL', w = hi - lo;
      P.text('n' + i, 28, y + 17, (i + 1) + '. ' + C[k][0], { bold: true });
      P.box('bar' + i, 150, y, 500, 24, { cls: 'ghost' });
      if (!on) { P.text('d' + i, 150, y + 40, c[k] ? 'Condition: ' + C[k][1] : 'No condition', { cls: 'mut' }); return; }
      if (used) { if (k === 'm') { lo = lo + w * 0.4; hi = lo + w * 0.2; } else if (k === 's') lo = lo + w * 0.5; else lo = hi - w * 0.4; }
      P.box('seg' + i, 150 + 500 * lo, y, Math.max(6, 500 * (hi - lo)), 24, { cls: used ? 'good' : filt || c[k] ? 'bad' : 'wait' });
      P.text('d' + i, 150, y + 40, used ? C[k][1] + ' narrows the range' : filt ? C[k][1] + ' cannot narrow the range; filtered as read' : c[k] ? C[k][1] + ' cannot be used' : 'No condition. Range unchanged', { cls: used ? 'good' : filt || c[k] ? 'bad' : 'mut' });
    });
    P.region('rd', 16, 232, 648, 82, 'Amount read');
    var all = p.type === 'ALL';
    P.box('ir', 28, 264, 280, 36, st >= 5 ? { cls: all ? 'bad' : 'wait', title: all ? 'Position not found in index' : 'Index entries read', right: num(p.idxRead) } : { cls: 'ghost', title: 'Index entries read', right: '?' });
    P.box('tr', 372, 264, 280, 36, st >= 6 || (all && st >= 5) ? { cls: p.cov && !all ? 'good' : all ? 'bad' : 'wait', title: p.cov && !all ? 'Table not accessed' : 'Table rows read', right: num(p.tblRead) } : { cls: 'ghost', title: 'Table rows read', right: '?' });
    if (st >= 6 && !all && !p.cov) P.arrow('go', 'ir:r', 'tr:l', { label: 'for each' });
    P.note('One horizontal strip is the whole index. The green part is the range that has to be read once the conditions up to that column are applied, and the red part is a condition that exists but could not narrow the range. The widths only show the narrowing and are not the real proportions.');
  },
  assume: 'This is a calculation that assumes that, in a table of 1,000,000 rows, member_id = 7 matches 0.1% of all rows, status = \'PAID\' matches 50%, and the date condition matches 10%. The rules that index columns must be used from the left and that the columns after a range condition cannot narrow the search range follow the description of composite indexes in the official MySQL documentation. Filtering conditions at the index stage after the order has been broken (Using index condition) is the index condition pushdown behavior of MySQL. The real optimizer may choose a different plan depending on statistics, and here it is assumed that this index is used. This was not checked against the EXPLAIN output of a real database.',
});

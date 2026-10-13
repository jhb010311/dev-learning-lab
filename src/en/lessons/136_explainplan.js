Lab.register({
  id: 'explainplan', nav: 'Reading the execution plan', cat: 'Database', mode: 'step',
  title: 'What should you read in one line of EXPLAIN?',
  intro: 'Put EXPLAIN in front of a query and the database shows the plan it has made for running that query. One line has many columns, but if you can read just four of them (type, key, rows, and Extra), you can find the cause of most slow queries.',
  terms: ['Query execution plan (EXPLAIN)', 'EXPLAIN join types (type column)', 'EXPLAIN Extra information (Extra column)', 'Full table scan', 'Covering index'],
  controls: [
    { id: 'w', label: 'Shape of the WHERE condition', type: 'select', value: 'func', options: [['none', 'No condition'], ['pk', 'id = 500 (primary key)'], ['eq', "name = 'user00123' (indexed column, one value)"], ['prefix', "name LIKE 'user001%' (LIKE with a fixed beginning)"], ['suffix', "name LIKE '%00123' (LIKE with a leading %)"], ['func', "LEFT(name, 7) = 'user001' (function on an indexed column)"], ['noidx', 'age = 30 (column without an index)'], ['join', 'Join: orders and member, connected by the primary key']] },
    { id: 'sel', label: 'Columns selected', type: 'select', value: 'star', options: [['star', 'SELECT * (all columns)'], ['cov', 'SELECT id, name (only columns in the index)']], show: function (c) { return c.w !== 'join' && c.tail !== 'gage'; } },
    { id: 'tail', label: 'Clause at the end', type: 'select', value: 'none', options: [['none', 'None'], ['oname', 'ORDER BY name (sort by an indexed column)'], ['oage', 'ORDER BY age (sort by a column without an index)'], ['gage', 'GROUP BY age (count of people per age)']], show: function (c) { return c.w !== 'join'; } },
  ],
  // The join example has a fixed query, and choosing GROUP BY fixes the selected columns to age, COUNT(*)
  fix: function (c) { return c.w === 'join' ? { sel: 'star', tail: 'none' } : c.tail === 'gage' ? { sel: 'star' } : null; },
  presets: [
    { t: 'Default settings', q: 'What should you read in the one EXPLAIN line for SELECT * with the condition LEFT(name, 7) = \'user001\'?', d: 'The column has an index, but a function is applied to it, so type is ALL.', v: { w: 'func', sel: 'star', tail: 'none' } },
    { t: 'Writing the same meaning with LIKE', q: 'What if you change the WHERE condition to name LIKE \'user001%\'?', d: "LIKE 'user001%'. type changes to range.", v: { w: 'prefix', sel: 'star', tail: 'none' } },
    { t: 'One row by primary key', q: 'What if you change the WHERE condition to id = 500 (primary key)?', d: 'type const. This is the case that reads the least.', v: { w: 'pk', sel: 'star', tail: 'none' } },
    { t: 'LIKE with a leading %, selecting only indexed columns', q: 'What if you select only id, name and filter with name LIKE \'%00123\'?', d: 'type index. Despite its name, it reads the whole index.', v: { w: 'suffix', sel: 'cov', tail: 'none' } },
    { t: 'Find with the index, sort separately', q: 'What if you filter with name = \'user00123\' and use ORDER BY age, a column without an index?', d: 'type is ref, but Using filesort appears in Extra.', v: { w: 'eq', sel: 'star', tail: 'oage' } },
    { t: 'GROUP BY', q: 'What if you use no WHERE condition and count the people per age with GROUP BY age?', d: 'Using temporary appears in Extra.', v: { w: 'none', sel: 'star', tail: 'gage' } },
    { t: 'Join', q: 'What if you change it to a join of orders and member, connected by the primary key?', d: 'Two lines appear, and the type of the second line is eq_ref.', v: { w: 'join', sel: 'star', tail: 'none' } },
  ],
  WHERE: { none: '', pk: 'id = 500', eq: "name = 'user00123'", prefix: "name LIKE 'user001%'", suffix: "name LIKE '%00123'", func: "LEFT(name, 7) = 'user001'", noidx: 'age = 30' },
  // Number of rows that actually match the condition (counted by Probe on the same data)
  MATCH: { none: 20000, pk: 1, eq: 2, prefix: 200, suffix: 2, func: 200, noidx: 400 },
  code: function (c) {
    if (c.w === 'join') return '-- member: 20,000 rows (primary key id)\n-- orders: 20,000 rows (no index on member_id)\n\nEXPLAIN\nSELECT o.id, o.amount, m.name\n  FROM orders o\n  JOIN member m ON m.id = o.member_id;';
    var cols = c.tail === 'gage' ? 'age, COUNT(*)' : c.sel === 'cov' ? 'id, name' : '*', w = this.WHERE[c.w];
    return '-- member table: 20,000 rows\n-- primary key id, index idx_name (name)\n-- no index on the age column\n\nEXPLAIN\nSELECT ' + cols + '\n  FROM member' + (w ? '\n WHERE ' + w : '') + { none: '', oname: '\n ORDER BY name', oage: '\n ORDER BY age', gage: '\n GROUP BY age' }[c.tail] + ';';
  },
  label: function (c) {
    if (c.w === 'join') return 'Join (orders, member)';
    return (this.WHERE[c.w] || 'no condition') + ' · ' + (c.tail === 'gage' ? 'age, COUNT(*)' : c.sel === 'cov' ? 'id, name' : 'SELECT *') + { none: '', oname: ' · ORDER BY name', oage: ' · ORDER BY age', gage: ' · GROUP BY age' }[c.tail];
  },
  columns: ['type', 'possible_keys', 'key', 'rows (estimated number of rows)', 'Extra'],
  // Each column of the execution plan. One line is one table.
  plan: function (c) {
    if (c.w === 'join') return [{ table: 'o', type: 'ALL', pkeys: 'NULL', key: 'NULL', ref: 'NULL', rows: 'all', extra: [] }, { table: 'm', type: 'eq_ref', pkeys: 'PRIMARY', key: 'PRIMARY', ref: 'o.member_id', rows: 'one', extra: [] }];
    var w = c.w, grp = c.tail === 'gage', star = !grp && c.sel === 'star';
    // If every column this query needs is in the idx_name index (name and the primary key id), the table does not have to be read
    var cover = !(star || grp || c.tail === 'oage' || w === 'noidx');
    var type, pkeys = 'NULL', key = 'NULL', rows = 'all', extra = [];
    if (w === 'pk') { type = 'const'; pkeys = key = 'PRIMARY'; rows = 'one'; }
    else if (w === 'eq') { type = 'ref'; pkeys = key = 'idx_name'; rows = 'few'; }
    else if (w === 'prefix') { type = 'range'; pkeys = key = 'idx_name'; rows = 'few'; }
    else if (w === 'noidx') type = 'ALL';
    else { type = cover ? 'index' : 'ALL'; if (cover) key = 'idx_name'; }
    if (type !== 'const') {
      var ageFixed = w === 'noidx';   // With WHERE age = 30, age is a single value, so neither sorting nor grouping is needed
      if (w === 'prefix') extra.push(cover ? 'Using where' : 'Using index condition');
      if (w === 'suffix' || w === 'func' || w === 'noidx') extra.push('Using where');
      if (cover) extra.push('Using index');
      if (grp && !ageFixed) extra.push('Using temporary');
      if (c.tail === 'oage' && !ageFixed) extra.push('Using filesort');
      if (c.tail === 'oname' && type === 'ALL') extra.push('Using filesort');
    }
    return [{ table: 'member', type: type, pkeys: pkeys, key: key, ref: type === 'const' || type === 'ref' ? 'const' : 'NULL', rows: rows, extra: extra, cover: cover }];
  },
  rowsText: function (c, r) { return r.rows === 'one' ? '1' : r.rows === 'few' ? (c.w === 'eq' ? 'about 2' : 'about 200') : 'about 20,000'; },
  rowsCol: function (c, r) { return r.rows === 'one' ? '1 row' : r.rows === 'few' ? 'Some (' + (c.w === 'eq' ? 'about 2 rows' : 'about 200 rows') + ')' : 'The whole table (about 20,000 rows)'; },
  TYPE: {
    const: 'This is the case where a primary key or unique index is given one value with "=", so at most one matching row is guaranteed. Once the row is found, it is done, so this is the fastest access.',
    ref: 'This is the case where "=" is applied to a non-unique index. Several rows can have the same value, so the query finds the place in the index where that value starts and reads for as long as the same value continues.',
    range: 'Only one range of the index is read. Because the index is sorted, the start and the end of the range can be found. BETWEEN, comparison operators, IN, and LIKE with a fixed beginning fall here.',
    index: 'The whole of one index is read from beginning to end (the whole index is scanned). Despite its name, it does not mean that the index narrowed the range. It is the same as ALL in that everything is read, and differs only in that it reads an index, which is smaller, instead of the table.',
    ALL: 'Every row of the table is read from beginning to end (a full table scan). When ALL appears for a query that looks for a few rows in a table with many rows, it is the first place to suspect.',
  },
  EXTRA: {
    'Using where': 'It means that the rows that were read are checked one by one against the WHERE condition, and the ones that do not match are filtered out.',
    'Using index': 'It means that the query finishes by reading only the index, without going to the table (a covering index). It does not mean "an index was used" but "only the index was read", and it appears when every column needed is in the index.',
    'Using index condition': 'It means that the entries read from the index are first checked against the condition, using the values in the index, before the query goes to the table for the row (index condition pushdown). This reduces the number of trips to the table.',
    'Using filesort': 'It means that a separate sort operation is performed to return the result in ORDER BY order. Despite the name, it does not always use a file and can finish in memory, but it becomes a burden when many rows must be sorted.',
    'Using temporary': 'It means that a temporary table is created to process GROUP BY. It is a workspace for collecting the rows that were read by value and counting them.',
  },
  simulate: function (c) {
    var p = this.plan(c), ev = [], sum = [], self = this, st = { a: 0, b: 0, ex: 0, cur: '', line: 0 };
    function push(s, k) { ev.push({ s: s, k: k || '', snap: JSON.parse(JSON.stringify(st)) }); }
    function col(f) { return p.length > 1 ? p.map(function (r) { return r.table + ': ' + f(r); }).join(' / ') : f(p[0]); }
    var row = [col(function (r) { return r.type; }), col(function (r) { return r.pkeys; }), col(function (r) { return r.key; }), col(function (r) { return self.rowsCol(c, r); }), col(function (r) { return r.extra.join('; ') || '(none)'; })];
    if (c.w === 'join') {
      push('Run it with EXPLAIN: it returns only the execution plan, without actually running the query. Two tables are joined, so two lines appear. The table on the upper line is read first, and for each of its rows the table on the lower line is looked up.');
      st.a = 3; st.cur = 'type';
      push('The type column of the first line (orders, alias o) is ALL: ' + this.TYPE.ALL + ' orders has no condition, so all 20,000 rows are read. key is NULL and rows is about 20,000.');
      st.b = 1; st.line = 1;
      push('The type column of the second line (member, alias m) is eq_ref: for each row of the previous table, exactly one row is looked up in this table. m.id in the join condition is the primary key, so each order is guaranteed to match at most one member. This repeats the "find one row" of const for each row of the previous table, and it is the best type in a join.', 'good');
      st.b = 3; st.cur = 'key';
      push('The key column of the second line is PRIMARY, the ref column is o.member_id, and the rows column is 1: it uses the primary key index, the value to look up is member_id of the previous table o, and one row is read per lookup.');
      st.a = 4; st.b = 4; st.cur = 'extra';
      push('The Extra column is empty on both lines: there is nothing to add. How the two tables are paired is covered in the "Join algorithms" lab.');
      st.cur = '';
      sum.push('Read the EXPLAIN of a join from top to bottom. If the type of a lower line is eq_ref or ref, the table is reached through an index. If it is ALL, the lower table is read in full for each row of the earlier table, or a hash join is used.');
      sum.push('Roughly, the amount read grows in the order const, eq_ref, ref, range, index, ALL. The leftmost one is not always the one you must get. What you check is whether the number of rows read (rows) is too large compared with the number of rows you need.');
      return { events: ev, summary: sum, p: p, match: 20000, row: row };
    }
    var r = p[0], w = c.w, W = this.WHERE[w], match = this.MATCH[w], rt = this.rowsText(c, r);
    push('Run it with EXPLAIN: it returns only the execution plan, without actually running the query. The query reads one table, so one line appears. The member table has 20,000 rows' + (w === 'none' ? ', and there is no condition, so every row is in the result.' : ', and the number of rows that actually match this condition is ' + match + '.'));
    var why = w === 'none' ? (r.type === 'index' ? 'There is no condition, so every row has to be read, but all the columns needed (id, name) are in the idx_name index, so the index is read instead of the table. In InnoDB, an index also holds the primary key value.' : 'There is no WHERE condition, so every row is needed, and this result is only natural here.')
      : w === 'pk' ? 'id is the primary key, and one value was given.'
      : w === 'eq' ? 'idx_name is a non-unique index, and one value was given to name with "=".'
      : w === 'prefix' ? "'user001%' means names that start with user001, so it becomes one range in the index, which is sorted by name."
      : w === 'suffix' ? "name has an index, but it could not be used to narrow the range. The index is sorted by name from the first character on, and '%00123' can start with anything, so the place to start reading cannot be decided." + (r.type === 'index' ? ' But all the columns needed are in the index, so the whole index is read instead of the table.' : '')
      : w === 'func' ? "name has an index, but it could not be used to narrow the range. The index holds only the original values of name, not the results of computing LEFT(name, 7). The function would have to be computed for each row, so the range to read cannot be decided." + (r.type === 'index' ? ' But all the columns needed are in the index, so the whole index is read instead of the table.' : '')
      : 'The age column has no index, so there is no way except to read every row and check age.';
    st.a = 1; st.cur = 'type';
    push('The type column is ' + r.type + ': ' + this.TYPE[r.type] + ' ' + why, r.type === 'ALL' && w !== 'none' ? 'bad' : r.type === 'index' || r.type === 'ALL' ? '' : 'good');
    st.a = 2; st.cur = 'key';
    push('The possible_keys column and the key column: possible_keys lists the indexes that were considered usable for the condition, and key is the index that was actually chosen. ' + (r.key === 'NULL' ? 'Both are NULL, so no index is used.' + (w === 'suffix' || w === 'func' ? ' Although name has an index, it did not even make it onto the candidate list.' : '') : r.pkeys === 'NULL' ? 'possible_keys is NULL, but key is idx_name. It means that there is no candidate for finding rows by the condition, but this index was chosen as the thing to read instead of the table.' : 'Both are ' + r.key + (r.key === 'PRIMARY' ? ' (the primary key)' : '') + '.'));
    st.a = 3; st.cur = 'rows';
    var whole = r.type === 'index' ? 'the whole index' : 'the whole table';
    push('The rows column is ' + rt + ': the number of rows expected to be read. ' + (r.rows === 'one' ? 'Only one row is read.' : 'It is an estimate from statistics, not a counted value, so it can differ slightly. ' + (r.rows === 'all' ? (w === 'none' ? 'It reads ' + whole + '.' : 'The result has ' + match + ' rows, but it reads ' + whole + '. Most of the rows are read and then discarded.') : 'Of the 20,000 rows, only the part that matches the condition is read.')), r.rows === 'all' && w !== 'none' ? 'bad' : '');
    st.a = 4; st.cur = 'extra';
    if (!r.extra.length) push('The Extra column is empty: there is nothing to add.' + (r.type === 'const' ? ' Only one row is read, so neither filtering nor sorting is needed.' : ''));
    r.extra.forEach(function (x, i) {
      st.ex = i + 1;
      var more = '';
      if (x === 'Using where' && (r.type === 'ALL' || r.type === 'index')) more = ' It signals that there is a condition that could not narrow the range using an index. If this appears when type is ' + r.type + ', it means "everything is read, and then the rows that do not match the condition are discarded."';
      if (x === 'Using where' && r.type === 'range') more = ' Here it means that the entries read from one range of the index are checked once more against the condition, so the amount read does not increase.';
      if (x === 'Using filesort' && c.tail === 'oage') more = ' age has no index, so the rows that were read must be sorted by age directly.';
      if (x === 'Using filesort' && c.tail === 'oname') more = ' name has an index, but reading in index order would require going to the table for each of the 20,000 index entries. The optimizer judged that it is cheaper to scan the table once and sort separately.';
      if (x === 'Using temporary') more = ' If the grouping were by name, which has an index, the rows could be counted while being read in index order, and no temporary table would be needed.';
      push('In the Extra column, ' + x + ': ' + self.EXTRA[x] + more, x === 'Using index' ? 'good' : (x === 'Using filesort' || x === 'Using temporary') && r.rows === 'all' ? 'bad' : '');
    });
    // When there is an ORDER BY or GROUP BY but no sort or temporary table is shown, the reason
    var sortTag = c.tail === 'gage' ? 'Using temporary' : 'Using filesort';
    if (c.tail !== 'none' && r.extra.indexOf(sortTag) < 0) {
      var reason = r.type === 'const' ? 'The result is only one row, so there is nothing to ' + (c.tail === 'gage' ? 'group' : 'sort') + '.'
        : c.tail === 'oname' ? (w === 'eq' ? 'name is fixed to one value in WHERE, so there is nothing to sort.' : 'The idx_name index is already sorted by name, so the order in which the index is read is the sorted order.')
        : c.tail === 'oage' ? 'age is a single value because of WHERE age = 30, so there is nothing to sort.' : 'age is a single value because of WHERE age = 30, so there is only one group.';
      push({ oname: 'ORDER BY name', oage: 'ORDER BY age', gage: 'GROUP BY age' }[c.tail] + ' is present, but Extra has no ' + sortTag + ': ' + reason + ' ' + (c.tail === 'gage' ? 'No temporary table is created.' : 'No separate sort is done.'), 'good');
    }
    st.cur = '';
    if (w === 'func') sum.push("A column that has an index cannot have its range narrowed by the index if a function or a calculation is applied to it. The rule is to leave the column as it is and change the value you compare it with. Here, name LIKE 'user001%' means the same thing and gives type range.");
    if (w === 'suffix') sum.push("A LIKE with a leading % cannot use the sort order of the index. The index can find \"starts with\", but \"ends with\" and \"contains\" are known only by reading everything.");
    if (w === 'prefix') sum.push('A LIKE with a fixed beginning becomes one range of the index and is read with type range. Of the 20,000 rows, only 200 are read.');
    if (w === 'eq') sum.push('An "=" condition on a non-unique index gives type ref. If the same condition is on a primary key or a unique index, it becomes const.');
    if (w === 'pk') sum.push('One value on the primary key gives type const. Only one row is read, so nothing appears in Extra even when ORDER BY or GROUP BY is added.');
    if (w === 'noidx') sum.push('If the column used in the condition has no index, type ALL comes with Using where. To get 400 rows, 20,000 rows are read. If it is a condition you use often, consider creating an index on that column.');
    if (r.type === 'index') sum.push('Type index does not mean "the index worked well" but "the whole index was read". You can tell from rows, which is close to the whole table. If you change the selected columns to SELECT *, the index alone is not enough and type becomes ALL.');
    if (r.extra.indexOf('Using filesort') >= 0) sum.push('Using filesort is a sign that a separate sort operation is needed. Sorting a few rows is no problem, but if rows is large and filesort appears, all the rows that pass the WHERE condition are sorted.');
    if (r.extra.indexOf('Using temporary') >= 0) sum.push('Using temporary is a sign that a temporary table is created. It commonly appears when GROUP BY is done on a column without an index.');
    sum.push('Order of reading: look at type to see how widely it reads, check key to see which index is used, estimate the amount read with rows, and then look in Extra for added work such as filtering, sorting, and temporary tables.');
    return { events: ev, summary: sum, p: p, match: match, row: row };
  },
  render: function (v, sim, t, H, shown) {
    var c = sim.c, p = sim.p, self = this, last = shown[shown.length - 1], s = last ? last.snap : null, join = c.w === 'join';
    if (!s) { H.text(v, 'Click Run to read the EXPLAIN result one column at a time.'); return; }
    function cell(lv, need, key, val) { return { v: lv >= need ? val : '?', cls: lv >= need && s.cur === key ? 'hot' : '' }; }
    var rows = p.map(function (r, i) {
      var lv = i === 0 ? s.a : s.b, here = !join || s.line === i || s.cur === 'extra';
      function cl(need, key, val) { var x = cell(lv, need, key, val); if (!here) x.cls = ''; return x; }
      var ex = lv >= 4 ? (join ? '' : r.extra.slice(0, s.ex).join('; ')) : '?';
      return { cells: [r.table, cl(1, 'type', r.type), cl(2, 'key', r.pkeys), cl(2, 'key', r.key)].concat(join ? [cl(2, 'key', r.ref)] : []).concat([cl(3, 'rows', self.rowsText(c, r)), { v: ex, cls: lv >= 4 && s.cur === 'extra' ? 'hot' : '' }]) };
    });
    if (join) H.table(v, ['table', 'type', 'possible_keys', 'key'].concat(join ? ['ref'] : []).concat(['rows', 'Extra']), rows, 'EXPLAIN result (main columns only)');
    if (!join && s.a >= 3) H.counters(v, [[String(sim.match).replace(/\B(?=(\d{3})+(?!\d))/g, ','), 'Rows that actually match the condition'], [this.rowsText(c, p[0]), 'Rows expected to be read (rows)']]);
    if (join && s.b >= 3) H.counters(v, [['about 20,000', 'Rows read from o'], ['1', 'Rows read from m for each row of o']]);
    H.text(v, 'rows is an estimate from statistics, so it can differ slightly each time you run it. The numbers shown here are rounded from the values seen on the PC used to write this lab.');
  },
  // Diagram: at the top, the line that EXPLAIN returned is laid out as boxes, one per column, and the column being read is highlighted. At the bottom, the type values are lined up from the one that reads the least to the one that reads the most, and the type of this query is marked.
  draw: function (P, sim, shown) {
    var c = sim.c, p = sim.p, self = this, last = shown[shown.length - 1], s = last ? last.snap : { a: -1, b: -1, ex: 0, cur: '', line: 0 }, join = c.w === 'join';
    P.size(680, 320);
    P.region('ex', 16, 16, 648, 150, join ? 'EXPLAIN result, two lines (the table on the upper line is read first)' : 'EXPLAIN result, one line');
    var X = [28, 130, 232, 372, 512], Wd = [96, 96, 134, 134, 140];
    function cells(r, lv, y, tag, here) {
      var names = join ? ['table', 'type', 'key', 'ref', 'rows'] : ['table', 'type', 'possible_keys', 'key', 'rows'];
      var vals = join ? [r.table, r.type, r.key, r.ref, self.rowsText(c, r)] : [r.table, r.type, r.pkeys, r.key, self.rowsText(c, r)];
      var need = join ? [0, 1, 2, 2, 3] : [0, 1, 2, 2, 3], keyOf = join ? ['', 'type', 'key', 'key', 'rows'] : ['', 'type', 'key', 'key', 'rows'];
      names.forEach(function (n, i) {
        var on = lv >= need[i], cur = on && here && keyOf[i] && s.cur === keyOf[i] && lv === need[i];
        var bad = n === 'type' && (r.type === 'ALL') && c.w !== 'none' && !join, good = n === 'type' && ['const', 'eq_ref', 'ref', 'range'].indexOf(r.type) >= 0;
        P.box(tag + i, X[i], y, Wd[i], 48, { cls: (!on ? 'ghost' : cur ? (bad ? 'bad' : 'hot') : i === 0 ? 'plain' : bad ? 'bad' : good ? 'good' : 'wait') + (cur ? ' now' : ''), title: n, sub: on ? vals[i] : '?' });
      });
    }
    cells(p[0], s.a, 46, 'a', !join || s.line === 0);
    if (join) cells(p[1], s.b, 104, 'b', s.line === 1);
    else {
      var r = p[0], on = s.a >= 4, txt = on ? (r.extra.slice(0, s.ex).join('; ') || '(empty)') : '?', warn = on && r.extra.slice(0, s.ex).some(function (x) { return x === 'Using filesort' || x === 'Using temporary'; });
      P.box('extra', 28, 104, 624, 48, { cls: (!on ? 'ghost' : s.cur === 'extra' ? 'hot' : warn ? 'hot' : 'wait') + (on && s.cur === 'extra' ? ' now' : ''), title: 'Extra', sub: txt });
    }
    P.region('sc', 16, 180, 648, 124, 'Access method (type): the further left, the less is usually read');
    var types = [['const', 'one row'], ['eq_ref', 'one per row'], ['ref', 'same values'], ['range', 'one range'], ['index', 'whole index'], ['ALL', 'whole table']];
    types.forEach(function (tp, i) {
      var mine = p.some(function (r, ri) { return r.type === tp[0] && (ri === 0 ? s.a : s.b) >= 1; });
      P.box('t' + tp[0], 28 + i * 105, 212, 99, 48, { cls: mine ? (i >= 5 ? 'bad' : i === 4 ? 'hot' : 'good') + ' now' : 'plain', title: tp[0], sub: tp[1] });
    });
    P.text('lo', 28, 284, 'Reads less', { cls: 'mut' });
    P.text('hi', 652, 284, 'Reads more', { cls: 'mut', anchor: 'end' });
    P.arrow('ax', [100, 280], [580, 280], { cls: 'mut' });
    P.note(join ? 'The top shows the main columns taken from the two lines that EXPLAIN returned. The bottom lines up the values that type can have, from the one that reads the least to the one that reads the most, and marks the two types that appear in this plan.' : 'The top shows the main columns taken from the one line that EXPLAIN returned. The bottom lines up the values that type can have, from the one that reads the least to the one that reads the most, and marks the type of this query. eq_ref appears only in joins.');
  },
  assume: 'For all 50 combinations, the SQL shown on the screen was run with EXPLAIN on MySQL 8.4 on the PC used to write this lab, and type, possible_keys, key, and Extra were compared character for character. The tables held 20,000 rows in member (two rows for each name) and 20,000 rows in orders, and ANALYZE TABLE was run before the queries. rows is a value estimated from statistics and differs slightly from run to run (on this PC, between 19,700 and 20,400 for a full scan), so only whether it is 1 row, some of the rows, or close to the whole table was compared. The number of rows that actually match the condition was also counted on the same data. An execution plan is chosen by the optimizer by calculating costs, so with a different number of rows or a different distribution of values, the same query can get a different plan. For example, in a table with only a few rows, or when a very large number of rows match the condition, ALL can be chosen even if an index exists (the explanation of full table scans in the MySQL documentation). The sentences that explain why nothing is shown in Extra (it is a single value, so no sort is needed, and so on) follow the explanation of ORDER BY optimization in the MySQL documentation. The id, select_type, partitions, key_len, and filtered columns are left out of the display.',
});

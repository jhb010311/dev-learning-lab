Lab.register({
  id: 'selectorder', nav: 'SELECT processing order', cat: 'Database', mode: 'step',
  title: 'Why can\'t you use an alias or an aggregate function in WHERE?',
  intro: 'You can think of a SELECT statement as being processed not in the order it is written but in the order FROM → WHERE → GROUP BY → HAVING → SELECT → ORDER BY → LIMIT. Which names you can use depends on where in this order a clause comes.',
  terms: ['Logical processing order of the SELECT statement', 'GROUP BY, WHERE, HAVING', 'Column alias (AS)', 'Aggregate function'],
  controls: [
    { id: 'cond', label: 'Condition to filter by', type: 'select', value: 'alias', options: [['grpcol', "member <> 'Carol' (the column you group by)"], ['rowcol', 'amount >= 300 (the amount of a single order)'], ['agg', 'SUM(amount) >= 300 (an aggregate function)'], ['alias', 'total >= 300 (an alias given in SELECT)']] },
    { id: 'at', label: 'Where to write the condition', type: 'select', value: 'where', options: [['where', 'WHERE clause'], ['having', 'HAVING clause']] },
    { id: 'galias', label: 'Use the SELECT alias (name) in GROUP BY', type: 'check', value: false },
    { id: 'tail', label: 'Sorting and limiting', type: 'select', value: 'none', options: [['none', 'None'], ['limit', 'ORDER BY total DESC LIMIT 1 (the one row with the largest total)']] },
  ],
  presets: [
    { t: 'Default settings', d: 'The alias total is used in WHERE. Error 1054 occurs.', v: { cond: 'alias', at: 'where', galias: false, tail: 'none' } },
    { t: 'The same alias in HAVING', d: 'It runs in MySQL. It is an extension that standard SQL does not have.', v: { cond: 'alias', at: 'having', galias: false, tail: 'none' } },
    { t: 'An aggregate function in WHERE', d: 'There are no groups yet, so error 1111 occurs.', v: { cond: 'agg', at: 'where', galias: false, tail: 'none' } },
    { t: 'An aggregate function in HAVING', d: 'The 2 members whose total is 300 or more come out.', v: { cond: 'agg', at: 'having', galias: false, tail: 'none' } },
    { t: '"300 or more" in WHERE', d: 'Orders are filtered one by one, so Alice\'s total becomes 300.', v: { cond: 'rowcol', at: 'where', galias: false, tail: 'none' } },
    { t: 'A row column in HAVING', d: 'After grouping, there is no single amount, so error 1054 occurs.', v: { cond: 'rowcol', at: 'having', galias: false, tail: 'none' } },
    { t: 'Grouping by an alias, sorting, and limiting', d: 'Aliases in GROUP BY and ORDER BY, and LIMIT at the very end.', v: { cond: 'grpcol', at: 'where', galias: true, tail: 'limit' } },
  ],
  O: [[1, 'Alice', 300], [2, 'Alice', 150], [3, 'Bob', 120], [4, 'Bob', 200], [5, 'Carol', 250], [6, 'Dave', 80]],
  COND: { grpcol: "member <> 'Carol'", rowcol: 'amount >= 300', agg: 'SUM(amount) >= 300', alias: 'total >= 300' },
  STAGES: ['FROM', 'WHERE', 'GROUP BY', 'HAVING', 'SELECT', 'ORDER BY', 'LIMIT'],
  // SQL shared by the code shown on the screen and the checking program (verify/mysql/selectorder_probe.js)
  plan: function (c) {
    var cond = this.COND[c.cond];
    var q = 'SELECT member' + (c.galias ? ' AS name' : '') + ', SUM(amount) AS total\n  FROM orders' + (c.at === 'where' ? '\n WHERE ' + cond : '') + '\n GROUP BY ' + (c.galias ? 'name' : 'member') + (c.at === 'having' ? '\nHAVING ' + cond : '') + (c.tail === 'limit' ? '\n ORDER BY total DESC\n LIMIT 1' : '');
    return { ddl: ['CREATE TABLE orders (\n  id     INT PRIMARY KEY,\n  member VARCHAR(20) NOT NULL,\n  amount INT NOT NULL\n)'],
      seed: ['INSERT INTO orders (id, member, amount) VALUES\n' + this.O.map(function (o) { return '  (' + o[0] + ", '" + o[1] + "', " + o[2] + ')'; }).join(',\n')],
      query: q, count: 'SELECT COUNT(*) FROM orders' + (c.at === 'where' ? ' WHERE ' + cond : '') };
  },
  code: function (c) { var p = this.plan(c); return p.ddl[0] + ';\n\n' + p.seed[0] + ';\n\n-- Processing order: FROM → WHERE → GROUP BY → HAVING → SELECT → ORDER BY → LIMIT\n' + p.query + ';'; },
  label: function (c) { return this.COND[c.cond] + ' · ' + (c.at === 'where' ? 'WHERE' : 'HAVING') + (c.galias ? ' · GROUP BY alias' : '') + (c.tail === 'limit' ? ' · sort, then LIMIT 1' : ''); },
  columns: ['Result', 'Rows that passed WHERE', 'Final result', 'What MySQL accepts that standard SQL does not'],
  simulate: function (c) {
    var self = this, O = this.O, cond = this.COND[c.cond], W = c.at === 'where', ga = !!c.galias, lim = c.tail === 'limit', gname = ga ? 'name' : 'member', ev = [], sum = [];
    var used = { FROM: true, WHERE: W, 'GROUP BY': true, HAVING: !W, SELECT: true, 'ORDER BY': lim, LIMIT: lim };
    var stat = this.STAGES.map(function (n) { return { name: n, k: used[n] ? 'wait' : 'none', n: used[n] ? '' : 'None' }; }), view = { title: '', head: [], rows: [] }, names = '', err = null;
    function at(name, k, n) { stat.forEach(function (s) { if (s.k === 'now') s.k = 'done'; }); var s = stat[self.STAGES.indexOf(name)]; s.k = k; s.n = n; }
    function push(s, k) { ev.push({ s: s, k: k, snap: JSON.parse(JSON.stringify({ stat: stat, view: view, names: names, err: err })) }); }
    function rowView(list, drop) { return list.map(function (o) { return { id: 'r' + o[0], t: '#' + o[0] + ' ' + o[1], right: 'amount ' + o[2], cells: [String(o[0]), o[1], String(o[2])], cls: drop && drop(o) ? 'gone' : '' }; }); }
    function grpView(gs, drop, done) { return gs.map(function (g) { return { id: 'g' + g.i, t: g.member, right: done ? 'total ' + g.total : 'amount ' + g.amounts.join(', '), cells: done ? [g.member, String(g.total)] : [g.member, g.amounts.join(', '), String(g.total)], cls: drop && drop(g) ? 'gone' : '' }; }); }
    function fail(no, msg) { err = { no: no, msg: msg }; }
    var rows = O.slice(), whereN = null, groups = [], final = null;
    // 1. FROM
    names = 'table columns id, member, amount';
    at('FROM', 'now', 'Rows: 6'); view = { title: 'Rows that passed FROM', head: ['id', 'member', 'amount'], rows: rowView(rows) };
    push('FROM orders: This is processed first. It takes all 6 rows of the orders table. At this point the only names you can use are the table columns id, member, and amount.', '');
    // 2. WHERE
    if (W) {
      if (c.cond === 'agg') { fail(1111, 'Invalid use of group function'); at('WHERE', 'err', 'Error 1111'); push('WHERE SUM(amount) >= 300: WHERE is processed before the rows are grouped, and it looks at one row at a time. There are no groups yet, so SUM(amount), "the total of a group", cannot be computed. MySQL rejects the statement with error 1111 (Invalid use of group function).', 'bad'); }
      else if (c.cond === 'alias') { fail(1054, "Unknown column 'total' in 'where clause'"); at('WHERE', 'err', 'Error 1054'); push("WHERE total >= 300: total is an alias that SELECT gives to SUM(amount), but SELECT is processed after WHERE. At this point the name total does not exist yet, so MySQL rejects the statement with error 1054 (Unknown column 'total' in 'where clause').", 'bad'); }
      else {
        var keep = c.cond === 'grpcol' ? function (o) { return o[1] !== 'Carol'; } : function (o) { return o[2] >= 300; }, kept = rows.filter(keep);
        at('WHERE', 'now', 'Rows: ' + kept.length); view = { title: 'Rows that passed WHERE (rows with a line through them are removed)', head: ['id', 'member', 'amount'], rows: rowView(rows, function (o) { return !keep(o); }) };
        push(c.cond === 'grpcol' ? "WHERE member <> 'Carol': It checks the rows one at a time, before they are grouped. member is a table column, so you can use it. Carol's 1 order row is removed, and 5 rows remain." : 'WHERE amount >= 300: It checks the rows one at a time, before they are grouped. Only the rows where the amount of a single order is 300 or more remain. Only 1 row, order #1 (300), remains, and 5 rows are removed. Alice\'s order of 150 was also removed here, before any total was computed.', '');
        rows = kept; whereN = kept.length;
      }
    }
    // 3. GROUP BY
    if (!err) {
      rows.forEach(function (o) { var g = groups.filter(function (x) { return x.member === o[1]; })[0]; if (!g) { g = { i: groups.length, member: o[1], amounts: [], total: 0 }; groups.push(g); } g.amounts.push(o[2]); g.total += o[2]; });
      names = 'grouping column member, aggregate functions (SUM, COUNT)';
      at('GROUP BY', 'now', 'Groups: ' + groups.length); view = { title: 'Groups made by GROUP BY', head: ['member', 'amounts in the group', 'SUM(amount)'], rows: grpView(groups) };
      push((ga ? 'GROUP BY name: name is an alias that SELECT gives to member. SELECT has not been processed yet, but MySQL looks for the alias in the SELECT list and reads it as member (this is a MySQL extension that standard SQL does not have). ' : 'GROUP BY member: ') + 'The rows with the same member are put together. Rows left: ' + rows.length + '. Groups made: ' + groups.length + '. From here on you work with groups, not rows. You can use only what has a single value for each group: the grouping column member, and aggregate functions such as SUM(amount).', '');
    }
    // 4. HAVING
    if (!err && !W) {
      if (c.cond === 'rowcol') { fail(1054, "Unknown column 'amount' in 'having clause'"); at('HAVING', 'err', 'Error 1054'); push("HAVING amount >= 300: HAVING checks the groups that were made by grouping. One group holds several amount values (Alice's group holds 300 and 150), so there is no way to decide which one to compare. MySQL rejects the statement with error 1054 (Unknown column 'amount' in 'having clause').", 'bad'); }
      else {
        var keepG = c.cond === 'grpcol' ? function (g) { return g.member !== 'Carol'; } : function (g) { return g.total >= 300; }, keptG = groups.filter(keepG);
        at('HAVING', 'now', 'Groups: ' + keptG.length); view = { title: 'Groups that passed HAVING (groups with a line through them are removed)', head: ['member', 'amounts in the group', 'SUM(amount)'], rows: grpView(groups, function (g) { return !keepG(g); }) };
        push(c.cond === 'grpcol' ? "HAVING member <> 'Carol': It checks the groups one at a time, after grouping. member is the grouping column and has one value for each group, so you can use it. Carol's group is removed, and 3 groups remain." : c.cond === 'agg' ? 'HAVING SUM(amount) >= 300: It checks the groups one at a time, after grouping. It computes the total amount of each group and keeps only the groups where it is 300 or more. Alice (450) and Bob (320) remain: 2 groups.' : 'HAVING total >= 300: total is an alias that SELECT gives to SUM(amount). SELECT has not been processed yet, and standard SQL does not allow an alias in HAVING, but MySQL reads total as SUM(amount). Alice (450) and Bob (320), whose totals are 300 or more, remain: 2 groups.', '');
        groups = keptG;
      }
    }
    if (err) {
      push('A statement that fails returns no rows at all, and the later steps are not processed. MySQL raises this error while it analyzes the statement, before it starts executing it, so in practice it stops before it even reads the table.', 'bad');
    } else {
      // 5. SELECT
      final = groups.map(function (g) { return { i: g.i, member: g.member, total: g.total, amounts: g.amounts }; });
      names = 'result columns and the aliases ' + gname + ', total';
      at('SELECT', 'now', 'Rows: ' + final.length); view = { title: 'Rows made by SELECT', head: [gname, 'total'], rows: grpView(final, null, true) };
      push('SELECT member' + (ga ? ' AS name' : '') + ', SUM(amount) AS total: It makes one result row for each remaining group. It computes the total of the group and attaches the alias' + (ga ? 'es total and name' : ' total') + '. The alias is created only at this step, so ORDER BY, which is processed after it, can use the alias.', lim ? '' : 'good');
      if (lim) {
        final.sort(function (a, b) { return b.total - a.total; });
        at('ORDER BY', 'now', 'Rows: ' + final.length); view = { title: 'Rows sorted by ORDER BY', head: [gname, 'total'], rows: grpView(final, null, true) };
        push('ORDER BY total DESC: It sorts the rows made by SELECT, starting from the largest total. ORDER BY is processed after SELECT, so it can use the alias total. Standard SQL allows this too.', '');
        var cut = final.slice(0, 1);
        at('LIMIT', 'now', 'Rows: ' + cut.length); view = { title: 'Rows left after LIMIT (rows with a line through them are removed)', head: [gname, 'total'], rows: grpView(final, function (g) { return g !== final[0]; }, true) };
        push('LIMIT 1: This is processed last. It keeps only the first row of the sorted result. ' + (final.length > 1 ? 'Rows removed: ' + (final.length - 1) + '.' : 'The result already has 1 row, so no row is removed.'), 'good');
        final = cut;
      }
    }
    var list = final ? final.map(function (g) { return g.member + ' ' + g.total; }) : null, ext = [];
    if (!err && ga) ext.push('GROUP BY');
    if (!err && !W && c.cond === 'alias') ext.push('HAVING');
    var extText = err ? '-' : ext.length ? 'Alias in ' + ext.join(' and ') : 'None';
    if (!err && !lim) sum.push('There is no ORDER BY, so the order in which the rows come out is not defined.');
    sum.push({ grpcol: 'A condition on the grouping column gives the same result whether you write it in WHERE or in HAVING. But WHERE cuts down the rows before they are grouped, while HAVING throws groups away after everything has been grouped. As a rule, write a condition that can be checked without grouping in WHERE.',
      rowcol: W ? 'WHERE discards rows before the total is computed. That is why Alice\'s total came out as 300, not 450. This result means "pick only the orders of 300 or more, then add them up by member". If you wanted "the members whose total is 300 or more", you have to write HAVING SUM(amount) >= 300, and then Alice 450 and Bob 320 come out.' : 'After grouping, you can use only the grouping column and aggregate functions. A condition that filters on the value of each single row must be written in WHERE, which is processed before grouping.',
      agg: W ? 'A condition that filters on an aggregate function is written in HAVING, which is processed after grouping. When WHERE is processed, there are no groups yet.' : 'The same words "300 or more" mean different things: WHERE amount >= 300 filters single orders, and HAVING SUM(amount) >= 300 filters the totals by member.',
      alias: W ? 'An alias is attached at the SELECT step, so it cannot be used in WHERE, which is processed earlier. This is true in standard SQL as well as in MySQL. To filter on an alias for an aggregate, move the condition to HAVING.' : 'MySQL accepts an alias from SELECT in HAVING. This is an extension that standard SQL does not have, so it can cause an error in other databases. To write it so that it works everywhere, write the expression itself, as in HAVING SUM(amount) >= 300.' }[c.cond]);
    if (!err && ga) sum.push('Using an alias in GROUP BY is also a MySQL extension. In the processing order, GROUP BY comes before SELECT, so in standard SQL you write the original column or expression instead of the alias.');
    if (!err && lim) sum.push('ORDER BY and LIMIT are processed last. So LIMIT 1 means "the one row with the largest total in the filtered and grouped result". If you use LIMIT without ORDER BY, which row is left is not defined.');
    return { events: ev, summary: sum, err: err, list: list, ordered: lim, whereN: whereN,
      row: [err ? 'Error ' + err.no : 'Success', err ? '-' : W ? 'Rows: ' + whereN + ' of 6' : 'No WHERE', err ? '-' : 'Rows: ' + list.length + ' (' + list.join(', ') + ')', extText] };
  },
  render: function (v, sim, t, H, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : null;
    if (!s) { H.text(v, 'Click Run to go through the steps one at a time, in the order they are processed.'); return; }
    H.table(v, s.view.head, s.view.rows.map(function (r) { return { cls: r.cls, cells: r.cells }; }), s.view.title);
  },
  // Diagram: The seven steps are placed from left to right in the order they are processed, and below them are the rows (or groups) that passed the current step.
  draw: function (P, sim, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : null, c = sim.c, self = this;
    P.size(680, 332);
    this.STAGES.forEach(function (n, i) {
      var x = 16 + i * 94, st = s ? s.stat[i] : null, usedNow = { WHERE: c.at === 'where', HAVING: c.at === 'having', 'ORDER BY': c.tail === 'limit', LIMIT: c.tail === 'limit' }[n];
      var k = st ? st.k : usedNow === false ? 'none' : 'wait';
      P.text('n' + i, x + 42, 26, '#' + (i + 1), { cls: 'mut', anchor: 'middle' });
      P.box('s' + i, x, 34, 84, 48, { cls: k === 'now' ? 'hot now' : k === 'done' ? 'good' : k === 'err' ? 'bad now' : k === 'none' ? 'ghost' : 'plain', title: n, sub: st && st.n ? st.n : k === 'none' ? 'None' : '', center: true });
      if (i) P.arrow('a' + i, 's' + (i - 1) + ':r', 's' + i + ':l', { cls: 'mut' });
    });
    P.box('names', 16, 96, 648, 34, { cls: !s ? 'ghost' : s.err ? 'bad' : 'wait', title: 'Usable names', right: s ? s.names : '?' });
    P.region('data', 16, 142, 648, 178, s ? s.view.title : 'Rows that passed the current step');
    if (!s) { P.text('hint', 340, 230, 'Click Run to start', { cls: 'mut', anchor: 'middle' }); return; }
    s.view.rows.forEach(function (r, i) { P.box(r.id, 28 + (i % 2) * 318, 172 + Math.floor(i / 2) * 42, 306, 34, { cls: r.cls === 'gone' ? 'ghost' : r.id.charAt(0) === 'g' ? 'wait' : 'plain', title: r.t + (r.cls === 'gone' ? ' (removed)' : ''), right: r.right }); });
    if (s.err) P.text('errt', 340, 311, 'Error ' + s.err.no + ': ' + s.err.msg, { cls: 'bad', anchor: 'middle' });
    P.note('The seven boxes at the top are the clauses of the SELECT statement, placed in the order they are processed. This differs from the order in which you write them (SELECT comes first). A dotted box is a clause that this statement does not have, and a red box is the step where the error occurred. Below are the rows that passed that step. From GROUP BY on, you work with groups, not rows.');
  },
  assume: 'This is a small example with 6 orders. For all 32 combinations (4 conditions × 2 places to write them × the GROUP BY alias × sorting and limiting), the SQL shown on the screen was run as is on a real MySQL 8.4.11 (default sql_mode, including ONLY_FULL_GROUP_BY), and the error numbers and messages, every row of the final result, and the number of rows counted with the WHERE condition alone were checked against the model and matched. For combinations without ORDER BY, the order in which the rows come out is not guaranteed, so only the contents of the rows were compared, not their order. The seven steps are a logical order: the result is the same as if the statement were processed in this order. Real MySQL raises an error in the analysis phase, before it executes the statement, if it cannot find a name, so for a statement that raises an error, the earlier steps are not executed either. The optimizer may also change the actual execution order, but the result is the same as processing in the logical order. That GROUP BY and HAVING accept the alias from SELECT was checked by running it on MySQL. That this is an extension that standard SQL does not have follows not from running it but from the sections "MySQL Handling of GROUP BY" and "Problems with Column Aliases" of the MySQL 8.4 Reference Manual. What happens in other databases was not run on the PC used to write this lab. DISTINCT and window functions inside the SELECT clause, and the place where JOIN is processed, are not covered in this lab (the results of JOIN and GROUP BY are covered in the "JOIN and GROUP BY" lab).',
});

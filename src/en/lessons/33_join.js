Lab.register({
  id: 'join', nav: 'JOIN and GROUP BY', cat: 'Database', mode: 'step',
  title: 'Do you put the condition in ON or in WHERE?',
  intro: 'Join 3 members and 4 orders. The join type, the place where you write the condition, and the way you aggregate all change which rows come out. Logically, SQL processes FROM/JOIN → WHERE → GROUP BY → HAVING in this order, and if you follow the rows that are left after each step, you can see why.',
  terms: ['JOIN (INNER, OUTER)', 'GROUP BY, WHERE, HAVING', 'Primary key, unique key, foreign key'], ranks: ['join', 'tuning'],
  controls: [
    { id: 'join', label: 'Join type', type: 'select', value: 'LEFT', options: [['INNER', 'INNER JOIN'], ['LEFT', 'LEFT JOIN (LEFT OUTER JOIN)']] },
    { id: 'cond', label: "Where to write the status = 'PAID' condition", type: 'select', value: 'where', options: [['none', 'No condition'], ['on', 'ON clause (together with the join condition)'], ['where', 'WHERE clause']] },
    { id: 'agg', label: 'Aggregation', type: 'select', value: 'none', options: [['none', 'No aggregation (rows as they are)'], ['count', 'Number of orders per member (GROUP BY)'], ['having', 'Only members with 2 or more orders (HAVING)']] },
  ],
  presets: [
    { t: 'Default settings', q: 'With a LEFT JOIN and the status = \'PAID\' condition in the WHERE clause, what happens to Carol, the member with no orders?', d: 'A LEFT JOIN, but the condition is in WHERE. The member with no orders disappears.', v: { join: 'LEFT', cond: 'where', agg: 'none' } },
    { t: 'Moving the same condition to ON', q: 'What if you move the status = \'PAID\' condition to the ON clause?', d: 'The member with no orders stays, together with NULLs.', v: { join: 'LEFT', cond: 'on', agg: 'none' } },
    { t: 'INNER JOIN', q: 'What if you change the join type to INNER JOIN and remove the status condition?', d: 'Only the rows that have a match on both sides come out.', v: { join: 'INNER', cond: 'none', agg: 'none' } },
    { t: 'LEFT JOIN, no condition', q: 'What if you remove the status condition from the LEFT JOIN?', d: 'The member with no orders comes out as one row filled with NULL.', v: { join: 'LEFT', cond: 'none', agg: 'none' } },
    { t: 'Paid orders per member', q: 'What if you put the status = \'PAID\' condition in the ON clause and count the orders per member with GROUP BY?', d: 'With a LEFT JOIN and the condition in ON, a member with 0 orders is counted too.', v: { join: 'LEFT', cond: 'on', agg: 'count' } },
    { t: 'Only members with 2 or more', q: 'What if you put the status = \'PAID\' condition in the ON clause and keep only members with 2 or more orders using HAVING?', d: 'HAVING filters after the rows are grouped.', v: { join: 'LEFT', cond: 'on', agg: 'having' } },
  ],
  M: [[1, 'Alice'], [2, 'Bob'], [3, 'Carol']],
  O: [[101, 1, 'PAID'], [102, 1, 'CANCELED'], [103, 2, 'PAID'], [104, 1, 'PAID']],
  code: function (c) {
    var agg = c.agg !== 'none';
    return 'SELECT m.name, ' + (agg ? 'COUNT(o.id) AS cnt' : 'o.id, o.status') + '\n  FROM member m\n  ' + (c.join === 'LEFT' ? 'LEFT JOIN' : 'INNER JOIN') + ' orders o\n    ON o.member_id = m.id' + (c.cond === 'on' ? "\n   AND o.status = 'PAID'" : '') + (c.cond === 'where' ? "\n WHERE o.status = 'PAID'" : '') + (agg ? '\n GROUP BY m.name' : '') + (c.agg === 'having' ? '\nHAVING COUNT(o.id) >= 2' : '') + ';';
  },
  label: function (c) { return c.join + ' JOIN · condition: ' + { none: 'none', on: 'ON', where: 'WHERE' }[c.cond] + ' · ' + { none: 'no aggregation', count: 'GROUP BY', having: 'HAVING' }[c.agg]; },
  columns: ['Rows right after the join', 'Final rows', 'Member with no orders (Carol)'],
  simulate: function (c) {
    var M = this.M, O = this.O, ev = [], sum = [], rows = [];
    function tab(rs) { return rs.map(function (r) { return { cells: [r.name, r.oid === null ? { v: 'NULL', cls: 'hot' } : String(r.oid), r.st === null ? { v: 'NULL', cls: 'hot' } : r.st] }; }); }
    function push(s, k, title, head, body) { ev.push({ s: s, k: k, snap: { title: title, head: head, body: body } }); }
    M.forEach(function (m) {
      var match = O.filter(function (o) { return o[1] === m[0] && (c.cond !== 'on' || o[2] === 'PAID'); });
      if (match.length) match.forEach(function (o) { rows.push({ name: m[1], oid: o[0], st: o[2] }); });
      else if (c.join === 'LEFT') rows.push({ name: m[1], oid: null, st: null });
    });
    var afterJoin = rows.length, hasPark = function (rs) { return rs.some(function (r) { return r.name === 'Carol'; }); };
    push('Step 1, FROM and JOIN: for each member, find the orders that satisfy the ON condition (' + (c.cond === 'on' ? "same member ID and status is 'PAID'" : 'same member ID') + ') and attach them. ' + (c.join === 'LEFT' ? 'A member with no match is not thrown away: one row is kept, with the order columns filled with NULL.' : 'A member with no match is dropped from the result.') + ' Rows now: ' + afterJoin + '.', '', 'Right after the join', ['m.name', 'o.id', 'o.status'], tab(rows));
    if (c.cond === 'where') {
      var before = rows.length, hadPark = hasPark(rows); rows = rows.filter(function (r) { return r.st === 'PAID'; });
      push("Step 2, WHERE: from the joined result, keep only the rows where o.status = 'PAID'. Rows removed: " + (before - rows.length) + '.' + (hadPark ? " Carol's row has NULL in o.status, so it does not satisfy the condition and disappears too. The reason for keeping her with a LEFT JOIN is gone, and the result becomes the same as with an INNER JOIN." : ''), hadPark ? 'bad' : '', 'After WHERE', ['m.name', 'o.id', 'o.status'], tab(rows));
    }
    var final = rows, fhead = ['m.name', 'o.id', 'o.status'], fbody;
    if (c.agg !== 'none') {
      var g = []; rows.forEach(function (r) { var x = g.filter(function (y) { return y.name === r.name; })[0]; if (!x) { x = { name: r.name, cnt: 0 }; g.push(x); } if (r.oid !== null) x.cnt++; });
      push('GROUP BY: group the remaining rows by member name and count COUNT(o.id). COUNT(column) does not count NULL, so a member with no orders, whose o.id is NULL, gets 0.', '', 'After GROUP BY', ['m.name', 'cnt'], g.map(function (x) { return { cells: [x.name, { v: String(x.cnt), cls: x.cnt === 0 ? 'hot' : '' }] }; }));
      if (c.agg === 'having') { g = g.filter(function (x) { return x.cnt >= 2; }); push('HAVING: from the grouped result, keep only the groups where cnt is 2 or more. WHERE filters the rows before grouping, and HAVING filters the groups after grouping. You cannot filter on an aggregate result in WHERE.', '', 'After HAVING', ['m.name', 'cnt'], g.map(function (x) { return { cells: [x.name, String(x.cnt)] }; })); }
      final = g; fhead = ['m.name', 'cnt']; fbody = g.map(function (x) { return { cells: [x.name, String(x.cnt)] }; });
    } else fbody = tab(rows);
    var park = hasPark(final);
    push('Final result. Rows: ' + final.length + '.', park || c.join === 'INNER' ? 'good' : '', 'Final result', fhead, fbody);
    if (c.join === 'LEFT' && c.cond === 'where') sum.push('If you put a WHERE condition on a column of the right table after a LEFT JOIN, and the condition is not true for NULL (for example, only status PAID), the rows filled with NULL are filtered out, and the result becomes the same as with an INNER JOIN. If you want to keep the rows with no match and attach only the orders that satisfy the condition, write the condition in ON.');
    if (c.join === 'LEFT' && c.cond === 'on') sum.push('The condition in ON only decides which orders get attached. It does not remove rows of the left table (member). A member with no paid orders still stays, together with NULL.');
    if (c.join === 'INNER') sum.push('With an INNER JOIN, the result is the same whether you write the condition in ON or in WHERE. The difference appears only with an outer join.');
    if (c.agg !== 'none') sum.push('The processing order is FROM/JOIN → WHERE → GROUP BY → HAVING → SELECT. That is why an alias given in SELECT (cnt) cannot be used in WHERE.');
    if (!sum.length) sum.push('Rows right after the join: ' + afterJoin + '. Final rows: ' + final.length + '. Carol, the member with no orders, is ' + (park ? 'included in the result.' : 'not in the result.'));
    return { events: ev, summary: sum, row: [afterJoin + '', final.length + '', park ? 'Included' : 'Missing'] };
  },
  render: function (v, sim, t, H, shown) {
    var last = shown[shown.length - 1];
    H.table(v, ['id', 'name'], this.M.map(function (m) { return { cells: [String(m[0]), m[1]] }; }), 'member table');
    H.table(v, ['id', 'member_id', 'status'], this.O.map(function (o) { return { cells: [String(o[0]), String(o[1]), o[2]] }; }), 'orders table');
    if (last) { if (last.snap.body.length) H.table(v, last.snap.head, last.snap.body, 'Result of the current step: ' + last.snap.title); else { H.title(v, 'Result of the current step: ' + last.snap.title); H.text(v, 'No rows are left.'); } }
  },
  assume: 'This is a small example with 3 members and 4 orders. The results were calculated by hand, following the logical processing order of standard SQL. A real database may change the order internally (for example, by applying the WHERE condition before the join), but the result must be the same as if it were processed in this order. For all 18 combinations, the SQL shown on the screen was run as is on a real SQL engine (SQLite), and the final rows matched the results of the model.',
});

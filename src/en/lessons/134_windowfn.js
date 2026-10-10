Lab.register({
  id: 'windowfn', nav: 'Window functions', cat: 'Database', mode: 'step',
  title: 'How do you add a rank and a running total without reducing the rows?',
  intro: 'GROUP BY combines many rows into one row to compute a total. A window function leaves the rows as they are and adds one value, such as a rank or a running total, next to each row. Change the function and the data, and see what value the tied rows get.',
  terms: ['Window function', 'ROW_NUMBER, RANK, DENSE_RANK', 'PARTITION BY', 'LAG and LEAD', 'GROUP BY, WHERE, HAVING'],
  controls: [
    { id: 'fn', label: 'Calculation', type: 'select', value: 'rank', options: [['group', 'Total with GROUP BY (for comparison)'], ['rownum', 'ROW_NUMBER() row number'], ['rank', 'RANK() rank'], ['dense', 'DENSE_RANK() rank'], ['sum', 'SUM(pts) OVER running total'], ['lag', 'LAG(pts) value of the previous row']] },
    { id: 'part', label: 'Calculate separately for each team', type: 'check', value: false, hint: 'This puts PARTITION BY team inside OVER. When you choose GROUP BY, it becomes GROUP BY team.' },
    { id: 'tie', label: 'Score data', type: 'select', value: 'yes', options: [['yes', 'With ties (two people at 90 points, two at 70)'], ['no', 'No ties (all scores are different)']] },
  ],
  presets: [
    { t: 'Default settings', d: 'RANK. If two people have 90 points, both are ranked 1 and there is no rank 2.', v: { fn: 'rank', part: false, tie: 'yes' } },
    { t: 'Switching to DENSE_RANK', d: 'The rank after a tie is not skipped.', v: { fn: 'dense', part: false, tie: 'yes' } },
    { t: 'Switching to ROW_NUMBER', d: 'The numbers do not repeat, even for a tie.', v: { fn: 'rownum', part: false, tie: 'yes' } },
    { t: 'Compare with GROUP BY', d: 'The 6 rows shrink to 2 rows (one per team), and the names disappear.', v: { fn: 'group', part: true, tie: 'yes' } },
    { t: 'Rank by team', d: 'PARTITION BY team. Each team is ranked from 1 again.', v: { fn: 'rank', part: true, tie: 'yes' } },
    { t: 'A running total with ties', d: 'The two tied rows get the same running total.', v: { fn: 'sum', part: false, tie: 'yes' } },
    { t: 'Getting the previous row\'s value', d: 'LAG. The first row of a team has no previous row, so the value is NULL.', v: { fn: 'lag', part: true, tie: 'no' } },
  ],
  FN: { rownum: ['ROW_NUMBER()', 'num'], rank: ['RANK()', 'rnk'], dense: ['DENSE_RANK()', 'rnk'], sum: ['SUM(pts)', 'running'], lag: ['LAG(pts)', 'prev'] },
  rowsOf: function (c) {
    var t = c.tie === 'yes';
    return [[1, 'Alice', 'A', 90], [2, 'Bob', 'A', t ? 90 : 85], [3, 'Carol', 'A', 70], [4, 'Dave', 'B', 80], [5, 'Eve', 'B', t ? 70 : 75], [6, 'Frank', 'B', 60]].map(function (r) { return { id: r[0], name: r[1], team: r[2], pts: r[3] }; });
  },
  code: function (c) {
    var head = '-- score table (6 rows)\n-- name  team  pts\n' + this.rowsOf(c).map(function (r) { return '-- ' + r.name + '   ' + r.team + '     ' + r.pts; }).join('\n') + '\n\n';
    if (c.fn === 'group') return head + (c.part ? 'SELECT team, SUM(pts) AS total\n  FROM score\n GROUP BY team\n ORDER BY team;' : 'SELECT SUM(pts) AS total\n  FROM score;');
    var f = this.FN[c.fn];
    return head + 'SELECT name, team, pts,\n       ' + f[0] + ' OVER (' + (c.part ? 'PARTITION BY team ' : '') + 'ORDER BY pts DESC) AS ' + f[1] + '\n  FROM score\n ORDER BY ' + (c.part ? 'team, ' : '') + 'pts DESC;';
  },
  label: function (c) { return (c.fn === 'group' ? 'GROUP BY' : this.FN[c.fn][0]) + (c.part ? ' · by team' : ' · all rows') + (c.tie === 'yes' ? ' · with ties' : ' · no ties'); },
  columns: ['Result rows', 'Computed values (highest score first)', 'Values of the two tied rows'],
  // The actual calculation. In each partition, line the rows up from the highest score and compute the value as the function is defined.
  calc: function (c) {
    var rows = this.rowsOf(c), part = !!c.part, fn = c.fn, out = [];
    var parts = part ? ['A', 'B'].map(function (t) { return rows.filter(function (r) { return r.team === t; }); }) : [rows.slice()];
    parts.forEach(function (p) { p.sort(function (a, b) { return b.pts - a.pts || a.id - b.id; }); });
    function total(list) { return list.reduce(function (a, x) { return a + x.pts; }, 0); }
    if (fn === 'group') return { parts: parts, groups: parts.map(function (p) { return { team: part ? p[0].team : '', n: p.length, v: total(p) }; }), out: [] };
    parts.forEach(function (p, pi) {
      p.forEach(function (r, i) {
        var higher = p.filter(function (x) { return x.pts > r.pts; }), upto = p.filter(function (x) { return x.pts >= r.pts; }), kinds = {};
        higher.forEach(function (x) { kinds[x.pts] = 1; });
        var v = fn === 'rownum' ? i + 1 : fn === 'rank' ? higher.length + 1 : fn === 'dense' ? Object.keys(kinds).length + 1 : fn === 'sum' ? total(upto) : i > 0 ? p[i - 1].pts : null;
        out.push({ id: r.id, name: r.name, team: r.team, pts: r.pts, v: v, i: i, pi: pi, higher: higher.length, kinds: Object.keys(kinds).length, add: upto.map(function (x) { return x.pts; }),
          rowsFrame: fn === 'sum' ? total(p.slice(0, i + 1)) : null, prev: i > 0 ? p[i - 1] : null, tiePrev: i > 0 && p[i - 1].pts === r.pts, tieNext: i < p.length - 1 && p[i + 1].pts === r.pts });
      });
    });
    return { parts: parts, groups: [], out: out };
  },
  show1: function (c, v) { return v === null ? 'NULL' : c.fn === 'rank' || c.fn === 'dense' ? '#' + v : c.fn === 'rownum' ? '#' + v : String(v); },
  simulate: function (c) {
    var k = this.calc(c), part = !!c.part, fn = c.fn, ev = [], sum = [], st = { stage: 'read', done: 0 };
    function push(s, kind) { ev.push({ s: s, k: kind || '', snap: JSON.parse(JSON.stringify(st)) }); }
    var rw = function (n) { return n + (n === 1 ? ' row' : ' rows'); }; push('FROM score: The 6 rows of the score table are read. Each row is one person\'s score.' + (c.tie === 'yes' ? ' Two people have 90 points (Alice and Bob), and two have 70 points (Carol and Eve).' : ' All the scores are different.'));
    if (fn === 'group') {
      st.stage = 'over';
      push(part ? 'GROUP BY team: Rows with the same team value are put into one group. This makes two groups: 3 rows for team A and 3 rows for team B.' : 'SUM(pts) is used without GROUP BY. In that case the whole table is one group.');
      st.stage = 'end'; st.done = k.groups.length;
      push('SUM(pts): One total is computed for each group. ' + k.groups.map(function (g) { return (g.team ? 'Team ' + g.team + ' ' : 'All rows ') + g.v + ' points'; }).join(', ') + '. Each group becomes one row of the result, so the 6 rows shrank to ' + rw(k.groups.length) + '. Who scored how many points is not kept in the result.', '');
      sum.push('The result has ' + rw(k.groups.length) + '. ' + k.groups.map(function (g) { return (g.team ? 'Team ' + g.team + ' ' : 'All rows ') + 'total ' + g.v; }).join(', ') + '.');
      sum.push('GROUP BY turns each group into one row of the result. You get the totals, but each row\'s name and score are gone. If you want to see a rank or a running total next to each person\'s score, you need a window function, which does not reduce the rows. Change the calculation to RANK or SUM OVER to compare.');
      return { events: ev, summary: sum, k: k, row: [rw(k.groups.length), k.groups.map(function (g) { return (g.team ? 'Team ' + g.team + ' ' : '') + g.v; }).join(' / '), 'Not applicable'] };
    }
    var f = this.FN[fn], show1 = this.show1;
    st.stage = 'over';
    push('OVER (' + (part ? 'PARTITION BY team ' : '') + 'ORDER BY pts DESC): This decides how the rows are laid out when each value is computed. ' + (part ? 'First the rows are divided by team, and then the rows in each team are lined up from the highest score.' : 'All 6 rows are lined up from the highest score.') + ' The rows are only put in a line. They are not combined.');
    k.out.forEach(function (r, n) {
      var who = (part ? 'Team ' + r.team + ', ' : '') + r.name + ' (' + r.pts + ' pts): ', s = '', restart = part && r.i === 0 && r.pi > 0;
      if (fn === 'rownum') s = r.i === 0 ? (restart ? 'The team changed, so the numbering starts again from 1.' : 'ROW_NUMBER() numbers the rows from 1 in the order they line up. This is the first row, so the number is 1.') : 'Row #' + (r.i + 1) + ' gets the number ' + (r.i + 1) + '.' + (r.tiePrev ? ' The score is the same as the previous row, but the numbers do not repeat. Which of the tied rows gets the lower number is not defined.' : '');
      else if (fn === 'rank') s = (r.higher === 0 ? (r.i > 0 ? 'No row has a higher score than this one, so the rank is 1.' : restart ? 'The team changed, so rows are compared only within this team. No row has a higher score than this one, so the rank is 1.' : 'RANK() adds 1 to the number of rows with a higher score. No row has a higher score than this one, so the rank is 1.') : 'The number of rows with a higher score is ' + r.higher + ', so the rank is ' + r.v + '.') + (r.tiePrev ? ' The score ties with the previous row, so the rank is the same.' : r.i > 0 && k.out[n - 1].v !== r.v - 1 ? ' The two tied rows before this one took two places, so rank ' + (r.v - 1) + ' is skipped.' : '');
      else if (fn === 'dense') s = (r.kinds === 0 ? (r.i > 0 ? 'No score is higher than this one, so the rank is 1.' : restart ? 'The team changed, so rows are compared only within this team. No score is higher than this one, so the rank is 1.' : 'DENSE_RANK() counts how many distinct scores are higher than this one and adds 1. No score is higher than this one, so the rank is 1.') : 'There are ' + r.kinds + ' distinct scores higher than this one, so the rank is ' + r.v + '.') + (r.tiePrev ? ' The score ties with the previous row, so the rank is the same.' : r.i > 0 && k.out[n - 1].tiePrev ? ' There was a tie before this row, but the rank is not skipped.' : '');
      else if (fn === 'sum') s = (r.i === 0 ? (restart ? 'The team changed, so the running total starts over. ' : 'A SUM with an ORDER BY adds up the rows from the first row through the current row. ') : '') + (r.add.length === 1 ? 'This is the first row, so the total is just its own score, ' + r.v + '.' : r.add.join(' + ') + ' = ' + r.v + '.') + (r.tieNext ? ' The next row has the same score in the ORDER BY column, so it is a peer of this row and is added together with it.' : r.tiePrev ? ' The score ties with the previous row, so the same rows are added and the running total is the same.' : '');
      else s = r.i === 0 ? (restart ? 'The team changed, so this is the first row of this team. There is no previous row, so the value is NULL.' : 'LAG(pts) fetches the pts of the row just before this one in the line. The first row has no previous row, so the value is NULL.') : 'It fetches the score of the row just before, ' + r.prev.name + ', which is ' + r.prev.pts + ' points.';
      st.stage = 'row'; st.done = n + 1;
      push(who + s, fn === 'rownum' && r.tiePrev ? 'bad' : fn === 'sum' && (r.tiePrev || r.tieNext) ? 'bad' : '');
    });
    st.stage = 'end';
    push('ORDER BY ' + (part ? 'team, ' : '') + 'pts DESC: The result is returned. The 6 rows are still 6 rows, and each row now has one value in the ' + f[1] + ' column.', 'good');
    var vals = k.parts.map(function (p, pi) { return (part ? 'Team ' + p[0].team + ' ' : '') + k.out.filter(function (r) { return r.pi === pi; }).map(function (r) { return r.v === null ? 'NULL' : r.v; }).join(', '); }).join(' / ');
    var tied = k.out.filter(function (r) { return r.tiePrev; }), tieCol = !tied.length ? 'No ties' : tied.every(function (r) { return r.v === k.out[k.out.indexOf(r) - 1].v; }) ? 'The same' : 'Different';
    sum.push('The 6 rows came out as 6 rows. The values added by ' + f[0] + ' are ' + vals + '.');
    if (fn === 'rownum' || fn === 'rank' || fn === 'dense') sum.push(c.tie === 'yes' ? 'How ties are handled is the difference among the three functions. For the scores 90, 90, 80, ROW_NUMBER gives 1, 2, 3 (different numbers even for a tie), RANK gives 1, 1, 3 (the tied rows share a rank, and the next rank is skipped), and DENSE_RANK gives 1, 1, 2 (the tied rows share a rank, and no rank is skipped).' : 'When there are no ties, ROW_NUMBER, RANK, and DENSE_RANK give the same result. The difference shows only when there are ties. Change the score data to "With ties".');
    if (fn === 'rownum' && c.tie === 'yes') sum.push('ROW_NUMBER is often used to "pick one row per group" (for example, the top scorer of each team). But the order of tied rows is not defined, so if you need the same result every time, add a column whose values are unique to ORDER BY.');
    if (fn === 'sum') sum.push(c.tie === 'yes' ? 'In a running total, tied rows get the same value. This is because, when you write only ORDER BY, the default frame also includes the rows that have the same ORDER BY value as the current row. To add up one row at a time, write ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW inside OVER. Then the running totals for this data become ' + k.parts.map(function (p, pi) { return (part ? 'Team ' + p[0].team + ' ' : '') + k.out.filter(function (r) { return r.pi === pi; }).map(function (r) { return r.rowsFrame; }).join(', '); }).join(' / ') + '.' : 'Adding OVER (ORDER BY ...) to SUM gives not the grand total but the total from the first row through the current row, that is, a running total. It is used for calculations such as a running total of sales by date.');
    if (fn === 'lag') sum.push('LAG brings a value from another row next to the current row. It lets you compare neighboring rows, such as the difference between yesterday\'s value and today\'s, without joining the same table to itself again. The first row, which has no previous row, gets NULL.');
    if (part) sum.push('PARTITION BY team only divides the range of the calculation by team. It does not combine rows. When the team changes, the number, rank, running total, and previous row all start over from the beginning.');
    return { events: ev, summary: sum, k: k, row: ['6 rows', vals, tieCol] };
  },
  render: function (v, sim, t, H, shown) {
    var c = sim.c, k = sim.k, last = shown[shown.length - 1], s = last ? last.snap : null, show1 = this.show1;
    if (!s) { H.text(v, 'Click Run to go one step at a time.'); return; }
    if (c.fn === 'group') {
      H.table(v, ['name', 'team', 'pts'], this.rowsOf(c).map(function (r) { return { cls: s.stage === 'end' ? 'gone' : '', cells: [r.name, r.team, String(r.pts)] }; }), 'score table (6 rows read)');
      if (s.stage === 'end') H.table(v, c.part ? ['team', 'total'] : ['total'], k.groups.map(function (g) { return { cells: c.part ? [g.team, { v: String(g.v), cls: 'hot' }] : [{ v: String(g.v), cls: 'hot' }] }; }), 'Result');
      H.counters(v, [['6', 'Rows read'], [s.stage === 'end' ? String(k.groups.length) : '?', 'Result rows']]);
      return;
    }
    var list = s.stage === 'read' ? this.rowsOf(c).map(function (r) { return { name: r.name, team: r.team, pts: r.pts, v: undefined }; }) : k.out;
    H.table(v, ['name', 'team', 'pts', this.FN[c.fn][1]], list.map(function (r, n) {
      var done = s.stage !== 'read' && n < s.done, cur = s.stage === 'row' && n === s.done - 1;
      return { cells: [r.name, r.team, String(r.pts), { v: done ? (r.v === null ? 'NULL' : String(r.v)) : '?', cls: cur ? 'hot' : done ? 'good' : '' }] };
    }), s.stage === 'read' ? 'score table (6 rows read)' : 'The 6 rows in line, with their values');
    H.counters(v, [['6', 'Rows read'], ['6', 'Result rows'], [s.stage === 'read' ? '0' : String(s.done), 'Rows with a value']]);
  },
  // Diagram: On the left are the 6 rows of the score table, and on the right is the result. With GROUP BY, many rows gather into one box. With a window function, each row gets its own box with a value.
  draw: function (P, sim, shown) {
    var c = sim.c, k = sim.k, last = shown[shown.length - 1], s = last ? last.snap : { stage: 'none', done: 0 }, show1 = this.show1, part = !!c.part;
    var sorted = s.stage !== 'none' && s.stage !== 'read', order = sorted ? [].concat.apply([], k.parts) : this.rowsOf(c);
    P.size(680, 300);
    P.region('src', 16, 16, 250, 268, 'score table');
    P.region('dst', 414, 16, 250, 268, c.fn === 'group' ? 'Result (one row per group)' : 'Result (each row gets a value)');
    function y(n, r) { return 48 + n * 36 + (sorted && part && r.team === 'B' ? 10 : 0); }
    order.forEach(function (r, n) {
      var cur = s.stage === 'row' && n === s.done - 1;
      P.box('s' + r.id, 30, y(n, r), 222, 30, { cls: (r.team === 'A' ? 'wait' : 'hot') + (cur ? ' now' : ''), title: r.name + ' · Team ' + r.team, right: r.pts + ' pts' });
    });
    if (c.fn === 'group') {
      k.groups.forEach(function (g, gi) {
        var on = s.stage === 'end', mid = part ? 48 + (gi * 3 + 1) * 36 + (gi ? 10 : 0) : 48 + 2.5 * 36;
        P.box('g' + gi, 428, mid, 222, 30, on ? { cls: 'good', title: (g.team ? 'Team ' + g.team + ' ' : 'All rows ') + 'total', right: String(g.v) } : { cls: 'ghost', title: s.stage === 'over' ? (g.team ? 'Team ' + g.team + ' group' : 'One group, all rows') : '?' });
        if (sorted) k.parts[gi].forEach(function (r) { P.arrow('a' + r.id, 's' + r.id + ':r', 'g' + gi + ':l', { cls: on ? 'good' : 'mut' }); });
      });
      P.text('fn', 340, 36, part ? 'GROUP BY team' : 'SUM(pts)', { anchor: 'middle', bold: true });
      P.note('The 6 rows on the left shrink to ' + k.groups.length + (k.groups.length === 1 ? ' row' : ' rows') + ' on the right. Blue boxes are team A, and yellow boxes are team B. GROUP BY keeps only one row per group, so who scored how many points disappears from the result.');
      return;
    }
    order.forEach(function (r, n) {
      var o = k.out.filter(function (x) { return x.id === r.id; })[0], done = sorted && k.out.indexOf(o) < s.done, cur = s.stage === 'row' && k.out.indexOf(o) === s.done - 1;
      P.box('d' + r.id, 428, y(n, r), 222, 30, done ? { cls: 'good' + (cur ? ' now' : ''), title: r.name + ' ' + r.pts + ' pts', right: show1(c, o.v) } : { cls: 'ghost', title: sorted ? r.name + ' ' + r.pts + ' pts' : '?', right: sorted ? '?' : '' });
      if (done) P.arrow('a' + r.id, 's' + r.id + ':r', 'd' + r.id + ':l', { cls: cur ? 'hot' : 'mut' });
    });
    P.text('fn', 340, 36, this.FN[c.fn][0], { anchor: 'middle', bold: true });
    P.note('Each row on the left leads straight to one row on the right. The number of rows does not shrink, and only a value is added to each. Blue boxes are team A, and yellow boxes are team B' + (part ? '. The gap between the teams is the boundary made by PARTITION BY.' : '. The teams are not divided, and all the rows are lined up in one line.'));
  },
  assume: 'For all 24 combinations, the same SQL statement as the one on the screen was run on MySQL 8.4 on the PC used to write this lab, and the number of result rows and the value added to each row were checked against the screen. The values with ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW in the running total were checked the same way. SQL does not define which of the tied rows is placed first (see the ROW_NUMBER description in the MySQL documentation), so the order of the two tied people on the screen is just one example, and the check was made on the team, the score, and the added value, not on the names. Window functions are available from MySQL 8.0. The way the step sentences calculate (for example, adding 1 to the number of rows with a higher score) is a plain-words version of each function\'s definition. A real database sorts the rows and then makes one pass over them to compute the values.',
});

Lab.register({
  id: 'groupby_basic', nav: 'GROUP BY and aggregation', cat: 'Fundamentals', mode: 'step', basic: true, deep: ['join', 'windowfn', 'selectorder'],
  title: 'What does GROUP BY group, and what do COUNT and SUM count?',
  why: 'To find the number of orders and the total for each member, fetching all rows into Java and adding them up for each member with a loop means that the more rows there are, the more data is moved, and the code also gets longer. GROUP BY and aggregate functions finish this calculation in the DB and return only one line per group.',
  use: 'It is used to produce numbers for statistics or admin screens, such as the daily sales total, the number of units sold per product, and the number of posts per board. To put a condition on the grouped result, such as choosing only members with 3 or more orders, HAVING is used rather than WHERE.',
  intro: 'COUNT(*) and SUM(price) are aggregate functions that reduce many rows to one value. COUNT(*) returns how many rows there are, and SUM(price) returns the total when you add up all the prices. GROUP BY member is added after a SELECT statement, and it puts the rows that have the same member value into one group and makes the aggregation run once for each group. One group becomes one line of the result. In this lab you run the same aggregation on an orders table that holds 5 orders, and you remove GROUP BY member, add the ungrouped column id to SELECT, and add a WHERE condition, and you see how many lines the result has and what shape it takes.',
  terms: ['GROUP BY clause', 'Aggregate function', 'COUNT and SUM', 'Nonaggregated columns and ONLY_FULL_GROUP_BY'],
  controls: [
    { id: 'group', label: 'Use GROUP BY member', type: 'check', value: true },
    { id: 'extra', label: 'What to add to SELECT and WHERE', type: 'select', value: 'none', options: [['none', 'Add nothing'], ['col', 'Write the ungrouped column id in SELECT'], ['where', 'Add the condition WHERE price >= 1000']] },
  ],
  // q is the question shown on the question-style screen. t and d are the name and the description used in the text-only reading
  presets: [
    { t: 'Default settings', q: 'What does GROUP BY member look like, and what happens when you get COUNT(*) and SUM(price) for the 5 order rows?', d: 'The rows with the same member form three groups, and one line comes out for each group, so there are 3 rows.', v: { group: true, extra: 'none' } },
    { t: 'If you remove GROUP BY', q: 'What if you remove GROUP BY member and also remove member from SELECT?', d: 'The whole table is the only group, so the result is one row.', v: { group: false, extra: 'none' } },
    { t: 'If you also write id in SELECT', q: 'What if you also write the column id, which is not written in GROUP BY, in SELECT?', d: 'id is neither a grouped column nor an aggregate, so it cannot be written, and an error occurs.', v: { group: true, extra: 'col' } },
    { t: 'If you add a WHERE condition', q: 'What if you add the condition WHERE price >= 1000?', d: 'Rows are filtered out before grouping, so the count and the total of the lee group change.', v: { group: true, extra: 'where' } },
    { t: 'If you write id without GROUP BY', q: 'What if you remove GROUP BY and also write id in SELECT?', d: 'If you write id together with an aggregate, an error occurs even though there is only one group.', v: { group: false, extra: 'col' } },
    { t: 'If you add only WHERE without GROUP BY', q: 'What if you remove GROUP BY and add the condition WHERE price >= 1000?', d: 'The 4 rows that were filtered become one group, so the result is one row.', v: { group: false, extra: 'where' } },
  ],
  // The code on the screen and the checking program (verify/spring/src/GroupByBasicProbe.java) run the same text. The checking script compares them down to the letter.
  base: [{ id: 1, m: 'kim', p: 1000 }, { id: 2, m: 'kim', p: 2000 }, { id: 3, m: 'lee', p: 500 }, { id: 4, m: 'lee', p: 1500 }, { id: 5, m: 'park', p: 3000 }],
  cols: function (c) { return (c.group ? 'member, ' : '') + (c.extra === 'col' ? 'id, ' : '') + 'COUNT(*), SUM(price)'; },
  code: function (c) {
    var g = !!c.group, ex = c.extra;
    var l = ['CREATE TABLE orders (id INT PRIMARY KEY, member VARCHAR(20), price INT);',
      "INSERT INTO orders VALUES (1, 'kim', 1000), (2, 'kim', 2000),",
      "    (3, 'lee', 500), (4, 'lee', 1500), (5, 'park', 3000);", '',
      'SELECT ' + this.cols(c), 'FROM orders' + (ex === 'where' || g ? '' : ';')];
    if (ex === 'where') l.push('-- WHERE: keep only the rows that meet the condition', 'WHERE price >= 1000' + (g ? '' : ';'));
    if (g) l.push('-- GROUP BY: rows with the same member value form one group', 'GROUP BY member', 'ORDER BY member;');
    return l.join('\n');
  },
  label: function (c) { return (c.group ? 'GROUP BY member' : 'No GROUP BY') + ' · ' + { none: 'Nothing added', col: 'id added to SELECT', where: 'WHERE price >= 1000' }[c.extra]; },
  columns: ['Rows in result', 'Result', 'Error'],
  simulate: function (c) {
    var grp = !!c.group, ex = c.extra, col = ex === 'col', wh = ex === 'where', ev = [], sum = [];
    var base = this.base, kept = wh ? base.filter(function (r) { return r.p >= 1000; }) : base.slice();
    var st = { rows: base.map(function (r) { return { id: r.id, m: r.m, p: r.p, s: '', g: -1, k: 0, cur: false }; }), gs: [], res: [], err: '', n: null };
    function push(s, k) { ev.push({ s: s, k: k, snap: JSON.parse(JSON.stringify(st)) }); }
    function ids(rs) { return rs.map(function (r) { return r.id; }).join(', '); }
    function total(rs) { return rs.reduce(function (a, r) { return a + r.p; }, 0); }
    function plus(rs) { return rs.length > 1 ? rs.map(function (r) { return r.p; }).join(' + ') + ' = ' + total(rs) : String(total(rs)); }
    function line(g) { return '(' + (grp ? g.key + ', ' : '') + g.rs.length + ', ' + total(g.rs) + ')'; }
    // Groups: with GROUP BY, one for each member; without it, all the rows that meet the condition form one
    var keys = []; kept.forEach(function (r) { if (keys.indexOf(r.m) < 0) keys.push(r.m); });
    var G = grp ? keys.map(function (k) { return { key: k, rs: kept.filter(function (r) { return r.m === k; }) }; }) : [{ key: '', rs: kept }];
    function addGroup(i) {
      var g = G[i];
      st.gs.push({ key: g.key, ids: g.rs.map(function (r) { return r.id; }), n: null, sum: null, hot: false, amb: false });
      st.rows.forEach(function (r) { if (g.rs.some(function (x) { return x.id === r.id; })) { r.g = i; r.k = g.rs.indexOf(g.rs.filter(function (x) { return x.id === r.id; })[0]); } });
    }
    var sel = 'SELECT ' + this.cols(c) + ' FROM orders' + (wh ? ' WHERE price >= 1000' : '') + (grp ? ' GROUP BY member' : '');
    var cond = wh ? 'Of the rows of orders, it picks only the rows whose price is 1000 or more, and ' : '';

    // 1. Setup
    push('CREATE TABLE and INSERT: the database creates the orders table and puts in 5 rows. The columns are id (order number), member (who placed the order), and price (amount). kim placed 2 orders, lee placed 2, and park placed 1. The statement below reads these 5 rows.', '');

    // 2. What the statement does
    if (grp) {
      push(sel + ': ' + (wh ? cond + 'it groups those rows ' : 'This statement groups the rows of orders ') + 'by equal member values, and for each group ' + (col ? 'it asks to show four things, member, id, COUNT(*), and SUM(price), ' : 'it calculates the two aggregates COUNT(*) and SUM(price) once, and ') + (col ? 'on one line. But id is neither a column written in GROUP BY nor an aggregate such as COUNT or SUM.' : 'shows them one line at a time. COUNT(*) is the number of rows in the group, and SUM(price) is the total of the prices in the group. We did not write code that groups and counts. The database receives this statement and does it.'), '');
    } else {
      push(sel + ': ' + (wh ? cond + 'it gets, for those rows, ' : 'This statement gets, for the rows of orders, ') + (col ? 'three things, id, COUNT(*), and SUM(price). This statement has no GROUP BY. COUNT(*) and SUM(price) are aggregate functions, and if you use an aggregate function and do not write GROUP BY, the database treats all the rows as one group and calculates only once. But id is not an aggregate function.' : 'two things, COUNT(*) and SUM(price). This statement has no GROUP BY. If you use an aggregate function and do not write GROUP BY, the database treats all the rows as one group and calculates only once. COUNT(*) is the number of rows in the group, and SUM(price) is the total of the prices in the group.'), '');
    }

    // 3. WHERE
    if (wh) {
      st.rows.forEach(function (r) { r.s = r.p >= 1000 ? 'keep' : 'drop'; });
      push('WHERE price >= 1000: the database looks at the rows one by one and checks whether price is 1000 or more. The row with id 3 (lee, 500) is less than 1000, so it is removed, and the rows with id ' + ids(kept) + ' remain, ' + kept.length + ' in all. WHERE decides ' + (grp ? 'which rows to group, before grouping' : 'which rows to aggregate, before aggregating') + '.', '');
    }

    // 4. The error case: id is neither a grouped column nor an aggregate
    if (col) {
      G.forEach(function (g, i) { addGroup(i); });
      st.gs.forEach(function (g) { g.amb = true; });
      var kimIds = G[0].rs;
      var first = grp
        ? 'The database examines the columns written in SELECT one by one. member is a column written in GROUP BY, and COUNT(*) and SUM(price) are aggregates that give one value per group. id is neither of the two. One group becomes one line of the result, but the kim group has two ids, ' + ids(kimIds).replace(', ', ' and ') + ', so it cannot be decided what to write in the id column of that one line. The same is true of the lee group. The park group has only one id, 5.'
        : 'The database examines the columns written in SELECT one by one. COUNT(*) and SUM(price) treat all the rows as one group and give one value. So the result is one line, but id is not an aggregate. It is a column whose value differs from row to row, so the group has five values (' + ids(kept) + '). It cannot be decided what to write in the id column of that one line.';
      push(first, 'bad');
      st.err = grp ? 'id is neither grouped nor aggregated' : 'id is not an aggregate'; st.n = 'Error';
      push('The database cannot make a result and returns an error. The error that H2 returned means that the id column must be in the GROUP BY list. Not a single result row was made.' + (grp ? ' H2 gave the error when a group contained different ids. Even the same statement ran without an error if each group had only one id.' : ''), 'bad');
      sum.push(grp
        ? 'The column id, which is not written in GROUP BY and is not an aggregate, cannot be written in SELECT. One group becomes one line of the result, but the kim group has two ids, 1 and 2, so it cannot be decided what to write on one line, and the database gave an error.'
        : 'Even without GROUP BY, if you write the column id, which is not an aggregate, together with aggregates, an error occurs. All the rows are one group, so the result is one line, but it cannot be decided which of the ids from 1 to 5 to write in the id column of that line.');
      sum.push('To write in SELECT a column that has several values in a group, you have to reduce it to one value by putting it inside an aggregate function, as in MAX(id). On H2, the statement with MAX(id) ran without an error.');
      return { events: ev, summary: sum, G: G, kept: kept, row: ['-', '-', st.err] };
    }

    // 5. Grouping
    if (grp) {
      G.forEach(function (g, i) { addGroup(i); });
      st.rows.forEach(function (r) { r.cur = false; });
      push('GROUP BY member: the database groups ' + (wh ? 'the remaining ' + kept.length + ' rows' : 'the 5 rows') + ' by equal member values. ' + G.map(function (g) { return 'The rows whose member is ' + g.key + ' (id ' + ids(g.rs) + ')'; }).join(', ') + ' each become one group, so there are ' + G.length + ' groups. The order of the rows inside a group and the way of grouping are decided by the database.', '');
    } else {
      addGroup(0);
      push('There is no GROUP BY, so ' + (wh ? 'the remaining ' + kept.length + ' rows' : 'the 5 rows') + ' (id ' + ids(kept) + ') are all one group. There is 1 group.', '');
    }

    // 6. Aggregate for each group
    G.forEach(function (g, i) {
      var s = st.gs[i];
      s.n = g.rs.length; s.sum = total(g.rs);
      st.gs.forEach(function (x) { x.hot = false; }); s.hot = true;
      st.rows.forEach(function (r) { r.cur = r.g === i; });
      st.res.push(line(g));
      var head = i === 0;
      var name = grp ? g.key + ' group' : 'The group';
      push(head
        ? name + (grp ? ' (id ' + ids(g.rs) + ')' : '') + ': COUNT(*) is the number of rows in the group, ' + g.rs.length + ', and SUM(price) is the total of the prices, ' + plus(g.rs) + '. ' + (grp ? 'One line comes out for each group, so it puts the one line ' + line(g) + ' in the result.' : 'There is only one group, so the one line ' + line(g) + ' is the whole result.')
        : name + ' (id ' + ids(g.rs) + '): COUNT(*) is ' + g.rs.length + ' and SUM(price) is ' + plus(g.rs) + '. It puts the one line ' + line(g) + ' in the result.', 'good');
    });

    // 7. Result
    st.gs.forEach(function (x) { x.hot = false; }); st.rows.forEach(function (r) { r.cur = false; });
    st.n = st.res.length;
    var fin = grp
      ? 'The result is ' + st.n + ' rows. ' + (wh ? 'The condition was met by ' + kept.length + ' of the 5 rows' : 'There were 5 orders') + (wh ? ', but ' : ', but ') + 'the number of rows in the result is the number of groups, not the number of rows. Because of ORDER BY member, they come out in member order.'
      : 'The result is 1 row. ' + (wh ? 'The condition was met by ' + kept.length + ' of the 5 rows' : 'There were 5 orders') + (wh ? ', but ' : ', but ') + 'there is only one group, so the result is one line. You cannot tell the values for kim, lee, and park from this result.';
    push('Result of SELECT: ' + fin, 'good');

    // Summary: the first line is the answer to the question
    if (grp && !wh) {
      sum.push('GROUP BY member puts the rows with the same member value into one group, calculates COUNT(*) and SUM(price) once for each group, and gives one line per group. The 5 order rows become three groups, kim, lee, and park, so the result is 3 rows.');
      sum.push('The number of rows in the result is the number of groups, not the number of original rows. One line comes out for each group, so in SELECT you write the grouped column (member) and the aggregates that give one value per group (COUNT, SUM).');
    } else if (grp) {
      sum.push('WHERE price >= 1000 filters rows before grouping. The row with id 3, whose price is 500, is removed, so only id 4 is left in the lee group, and COUNT(*) changed from 2 to 1 and SUM(price) from 2000 to 1500.');
      sum.push('WHERE decides which rows to group, and GROUP BY groups the rows that remain. In this data, all three people have an order of 1000 or more, so there are still 3 groups.');
    } else if (!wh) {
      sum.push('If you remove GROUP BY, the whole table becomes one group, and COUNT(*) and SUM(price) are calculated only once for all 5 rows. The result is one row, (5, 8000).');
      sum.push('An aggregate function reduces many rows to one value. GROUP BY divides the range of that reduction, so that it is not the whole table but the rows with the same member value.');
    } else {
      sum.push('Without GROUP BY, the 4 rows that remain after WHERE become one group, and the result is one row, (4, 7500). It is the total 8000 minus the 500 of the row with id 3.');
      sum.push('WHERE picks the rows to aggregate, and GROUP BY divides the range that is aggregated. The two do different jobs.');
    }
    return { events: ev, summary: sum, G: G, kept: kept, row: [st.n + '', st.res.join(', '), 'None'] };
  },
  render: function (v, sim, t, H, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : null, grp = !!sim.c.group;
    if (!s) { H.text(v, 'Click Run to start from creating the table.'); return; }
    function gname(i) { var g = s.gs[i]; return g.key ? g.key + ' group' : 'Whole table as one group'; }
    H.table(v, ['id', 'member', 'price', 'Status'], s.rows.map(function (r) { return { cls: r.s === 'drop' ? 'gone' : '', cells: [String(r.id), r.m, String(r.p), r.s === 'drop' ? 'Removed: does not meet WHERE' : r.g >= 0 ? gname(r.g) : r.s === 'keep' ? 'Meets WHERE' : ''] }; }), 'orders table');
    if (s.gs.length) H.table(v, ['Group', 'Row ids', 'COUNT(*)', 'SUM(price)'], s.gs.map(function (g) { return { cls: '', cells: [{ v: g.key ? g.key : 'All', cls: g.hot ? 'hot' : '' }, g.ids.join(', '), g.n === null ? '' : String(g.n), g.sum === null ? '' : String(g.sum)] }; }), 'Groups');
    if (s.err) H.text(v, 'Error: ' + s.err);
    else if (s.res.length) H.table(v, [(grp ? 'member, ' : '') + 'COUNT(*), SUM(price)'], s.res.map(function (r) { return { cls: '', cells: [r] }; }), 'Result of SELECT');
    H.counters(v, [[s.gs.length, 'Number of groups'], [s.n === null ? '-' : s.n, 'Rows in result']]);
  },
  // Diagram: on the left, the 5 rows of orders (rows filtered out by WHERE are shown faintly); on the right, the group boxes (arrows go from rows to groups); below, the result lines that were made and the number of groups and result rows. When id is written, the box of a group that has several ids in it is shown in red.
  draw: function (P, sim, shown) {
    var c = sim.c, grp = !!c.group, G = sim.G, last = shown[shown.length - 1], s = last ? last.snap : null;
    P.size(680, 440);
    P.region('ro', 14, 16, 300, 262, 'orders table (id, member, price)');
    P.region('rg', 364, 16, 302, 262, grp ? 'Groups (same member value)' : 'Groups (no GROUP BY: one group)');
    var rowsAll = s ? s.rows : [{ id: 1, m: 'kim', p: 1000 }, { id: 2, m: 'kim', p: 2000 }, { id: 3, m: 'lee', p: 500 }, { id: 4, m: 'lee', p: 1500 }, { id: 5, m: 'park', p: 3000 }];
    rowsAll.forEach(function (r, i) {
      var cls = r.s === 'drop' ? 'ghost' : r.cur ? 'hot now' : r.g >= 0 ? 'wait' : r.s === 'keep' ? 'hot' : 'plain';
      P.box('r' + i, 26, 44 + i * 42, 276, 34, { cls: cls, title: 'id ' + r.id + ' · ' + r.m + ' · ' + r.p, right: r.s === 'drop' ? 'Removed' : ' ' });
    });
    var gs = s ? s.gs : [];
    gs.forEach(function (g, i) {
      var y = grp ? 44 + i * 78 : 44, h = grp ? 68 : 224;
      var sub1 = 'id ' + g.ids.join(', ');
      var sub2 = g.amb ? (g.ids.length > 1 ? 'id column: ' + g.ids.join(' or ') + '?' : 'id column: ' + g.ids[0]) : g.n === null ? ' ' : 'COUNT(*) = ' + g.n + ' · SUM(price) = ' + g.sum;
      var cls = g.amb ? (g.ids.length > 1 ? 'bad' : 'wait') : g.hot ? 'hot now' : g.n !== null ? 'good' : 'wait';
      P.box('g' + i, 376, y, 278, h, { cls: cls, title: g.key ? g.key + ' group' : 'The whole table is one group', sub: [sub1, sub2] });
    });
    rowsAll.forEach(function (r, i) {
      if (r.g < 0 || !s) return;
      var n = s.rows.filter(function (x) { return x.g === r.g; }).length;
      P.arrow('a' + i, 'r' + i + ':r', 'g' + r.g + ':l:' + ((r.k + 1) / (n + 1)).toFixed(2), { cls: r.cur ? 'hot' : 'mut' });
    });
    P.region('rr', 14, 290, 652, 92, 'Result that was made' + (grp ? ' (member, COUNT(*), SUM(price))' : ' (COUNT(*), SUM(price))'));
    var res = s ? s.res : [];
    if (s && s.err) P.text('te', 30, 330, 'Error: ' + s.err, { cls: 'bad', anchor: 'start', bold: true });
    else if (!res.length) P.text('re', 340, 340, s ? 'No result yet' : 'Waiting', { cls: 'mut', anchor: 'middle' });
    res.forEach(function (r, k) { P.text('t' + k, 30, 330 + k * 20, r, k === res.length - 1 && last && last.k === 'good' ? { cls: 'good', anchor: 'start' } : { anchor: 'start' }); });
    P.box('n1', 14, 394, 322, 36, { cls: gs.length ? 'wait' : 'ghost', title: 'Number of groups', right: gs.length + '' });
    P.box('n2', 344, 394, 322, 36, { cls: s && s.err ? 'bad' : s && s.n !== null ? 'good' : 'ghost', title: 'Rows in result', right: s && s.n !== null ? (s.err ? 'Error' : s.n + '') : '-' });
  },
  assume: 'This was checked against real execution on H2 2.4.240 (in-memory database, JDBC). All 6 combinations were run, one statement at a time, with the whole SQL on the screen exactly as it is (CREATE TABLE, INSERT, SELECT, and the comment lines), and the number of rows that SELECT returned, the values of all the rows, whether an error occurred, and the kind of that error were checked against the model. The two combinations that caused an error gave H2 error code 90016 (a message saying that the id column must be in the GROUP BY list), and the screen shows only that kind, in English words. The values that the step sentences rely on were also checked separately on H2: the number of rows, 5, and the total, 8000, the ids of the rows whose price is 1000 or more (1, 2, 4, 5), the list of ids for each name (1 and 2 for kim, 3 and 4 for lee, 5 for park) and the list when WHERE is added (only 4 for lee), the number of different ids for each name, that there are 3 groups, and that the statement with MAX(id) runs without an error. What was different from what I expected: H2 did not give an error at the stage where it parses the statement with id written in it (prepareStatement), and gave the error while running, when there were different ids inside one group. So if only the park row was left, or if rows were left so that each group had only one id (ids 1, 3, 5), a statement of the same shape ran without an error. The sentences of the error step on the screen were written following this observation. The definitions and rules were checked by opening the documentation. In section 14.19.1 Aggregate Function Descriptions of the MySQL 8.4 documentation, it says that aggregate functions operate on sets of values, that using one without GROUP BY is equivalent to grouping all the rows, and that COUNT(*) counts the number of rows even if there are NULL values. In section 14.19.3 MySQL Handling of GROUP BY, it says that the SQL mode ONLY_FULL_GROUP_BY is enabled by default, that it rejects a statement that uses in SELECT a column that is not written in GROUP BY and is not functionally dependent on it, and that this is the same for a statement that uses an aggregate function without GROUP BY. In section 15.2.13 SELECT Statement, it says that the rows that meet the WHERE condition are selected, and that an aggregate function cannot be used in WHERE. The H2 grammar page (grammar.html) has no description of SELECT, so I opened SELECT on the Commands page. It says that GROUP BY groups the result by expressions, that if an aggregate function is used without GROUP BY all the rows are grouped together, and that in the logical order of execution WHERE comes before GROUP BY. All four documents were opened with a tool that summarizes web pages, and the original text was not checked letter by letter. The run was not checked against MySQL. So whether MySQL gives the same result and error for the same statements was not confirmed by running them, and according to the documentation, MySQL does not look at how many values id has but rejects the statement by looking only at the kind of the column written in it, so the conditions under which it gives an error differ from H2. The INSERT on the screen shows all 5 rows as they are. ORDER BY member at the end of SELECT was added so that the groups appear in member order, and if you remove GROUP BY member, the result has no member, so ORDER BY member was removed together with it. The step sentences explain, in order, the principle by which the result is made. How the database actually groups the rows is decided by the database, and what was confirmed by running is the result. This lab does not cover HAVING, grouping by two or more columns, columns that contain NULL, COUNT(column) and AVG, aggregation together with a join, or ANY_VALUE. HAVING, which sets a condition after aggregation, and the order in which SELECT is processed are covered in "SELECT processing order", how to rank rows without merging them in "Window functions", and aggregating the result of a join in "JOIN and GROUP BY".',
});

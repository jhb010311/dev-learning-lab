Lab.register({
  id: 'subquery', nav: 'Subqueries', cat: 'Database', mode: 'step',
  title: 'Why does NOT IN return no rows at all?',
  intro: 'A subquery is another SELECT placed inside a SELECT statement, in parentheses. There are several kinds: one that returns a single value, one that returns a list (IN), one that only checks whether a row exists (EXISTS), and one that is run again for every outer row (a correlated subquery). Run each one on the member and orders tables, and see how NOT IN and NOT EXISTS differ when one of the orders has a NULL.',
  terms: ['Subquery', 'Scalar subquery', 'Correlated subquery', 'IN and EXISTS', 'NULL and three-valued logic'],
  controls: [
    { id: 'kind', label: 'Shape of the subquery', type: 'select', value: 'notin', options: [['scalar', 'A single value: WHERE id = (SELECT ...)'], ['corr', 'Correlated subquery: count the orders of each member'], ['in', 'IN (SELECT ...): members who have orders'], ['exists', 'EXISTS (SELECT ...): members who have orders'], ['notin', 'NOT IN (SELECT ...): members who have no orders'], ['notexists', 'NOT EXISTS (SELECT ...): members who have no orders']] },
    { id: 'nul', label: 'Add one order whose member_id is NULL (a guest order)', type: 'check', value: true },
    { id: 'pick', label: 'Item the subquery looks for', type: 'select', value: 'one', options: [['one', "monitor (1 order → 1 row from the subquery)"], ['two', "keyboard (2 orders → 2 rows from the subquery)"], ['zero', "desk (no orders → 0 rows from the subquery)"]], show: function (c) { return c.kind === 'scalar'; } },
  ],
  presets: [
    { t: 'Default settings', d: 'The NOT IN list contains a NULL. The result is 0 rows.', v: { kind: 'notin', nul: true, pick: 'one' } },
    { t: 'The same thing with NOT EXISTS', d: 'Even with the NULL, the members with no orders come out correctly.', v: { kind: 'notexists', nul: true, pick: 'one' } },
    { t: 'NOT IN when there is no NULL', d: 'As expected, the 1 member with no orders comes out.', v: { kind: 'notin', nul: false, pick: 'one' } },
    { t: 'Two rows where one value is expected', d: 'The subquery returns 2 rows, so error 1242 occurs.', v: { kind: 'scalar', nul: false, pick: 'two' } },
    { t: 'Zero rows where one value is expected', d: 'It becomes NULL without an error, so the result is 0 rows.', v: { kind: 'scalar', nul: false, pick: 'zero' } },
    { t: 'Correlated subquery', d: 'The subquery is run again for each of the 4 outer rows.', v: { kind: 'corr', nul: false, pick: 'one' } },
    { t: 'IN and NULL', d: 'With IN, the result is the same even if the list contains a NULL.', v: { kind: 'in', nul: true, pick: 'one' } },
  ],
  M: [[1, 'Alice'], [2, 'Bob'], [3, 'Carol'], [4, 'Dave']],
  orders: function (c) { var o = [[101, 1, 'keyboard'], [102, 1, 'mouse'], [103, 2, 'keyboard'], [104, 3, 'monitor']]; if (c.nul) o.push([105, null, 'chair']); return o; },
  PICK: { one: 'monitor', two: 'keyboard', zero: 'desk' },
  CORR: { scalar: false, corr: true, in: false, exists: true, notin: false, notexists: true },
  // The statement made of only the subquery inside the parentheses
  inner: function (c) {
    if (c.kind === 'scalar') return "SELECT member_id FROM orders WHERE item = '" + this.PICK[c.pick] + "'";
    if (c.kind === 'corr') return 'SELECT COUNT(*) FROM orders o WHERE o.member_id = m.id';
    if (c.kind === 'in' || c.kind === 'notin') return 'SELECT member_id FROM orders';
    return 'SELECT 1 FROM orders o WHERE o.member_id = m.id';
  },
  sql: function (c) {
    if (c.kind === 'scalar') return "SELECT name\n  FROM member\n WHERE id = (SELECT member_id\n               FROM orders\n              WHERE item = '" + this.PICK[c.pick] + "')\n ORDER BY id";
    if (c.kind === 'corr') return 'SELECT name,\n       (SELECT COUNT(*)\n          FROM orders o\n         WHERE o.member_id = m.id) AS cnt\n  FROM member m\n ORDER BY m.id';
    if (c.kind === 'in' || c.kind === 'notin') { var k = c.kind === 'in' ? 'IN' : 'NOT IN'; return 'SELECT name\n  FROM member\n WHERE id ' + k + ' (SELECT member_id\n' + (c.kind === 'in' ? '                FROM orders)' : '                    FROM orders)') + '\n ORDER BY id'; }
    var e = c.kind === 'exists' ? 'EXISTS' : 'NOT EXISTS', pad = c.kind === 'exists' ? '' : '    ';
    return 'SELECT name\n  FROM member m\n WHERE ' + e + ' (SELECT 1\n' + pad + '                 FROM orders o\n' + pad + '                WHERE o.member_id = m.id)\n ORDER BY m.id';
  },
  // SQL shared by the code shown on the screen and the checking program (verify/mysql/subquery_probe.js)
  plan: function (c) {
    function lit(x) { return x === null ? 'NULL' : typeof x === 'number' ? String(x) : "'" + x + "'"; }
    function ins(t, cols, rows) { return 'INSERT INTO ' + t + ' (' + cols + ') VALUES\n' + rows.map(function (r) { return '  (' + r.map(lit).join(', ') + ')'; }).join(',\n'); }
    return { ddl: ['CREATE TABLE member (\n  id   INT PRIMARY KEY,\n  name VARCHAR(20) NOT NULL\n)', 'CREATE TABLE orders (\n  id        INT PRIMARY KEY,\n  member_id INT,\n  item      VARCHAR(30) NOT NULL\n)'],
      seed: [ins('member', 'id, name', this.M), ins('orders', 'id, member_id, item', this.orders(c))], query: this.sql(c), inner: this.inner(c) };
  },
  code: function (c) { var p = this.plan(c); return p.ddl.join(';\n') + ';\n\n' + p.seed.join(';\n') + ';\n\n' + p.query + ';'; },
  label: function (c) { return { scalar: 'A single value (' + this.PICK[c.pick] + ')', corr: 'Correlated subquery', in: 'IN', exists: 'EXISTS', notin: 'NOT IN', notexists: 'NOT EXISTS' }[c.kind] + ' · ' + (c.nul ? 'NULL order present' : 'No NULL order'); },
  columns: ['Result', 'Result rows', 'When the subquery is run alone', 'select_type in EXPLAIN'],
  simulate: function (c) {
    var self = this, M = this.M, O = this.orders(c), kind = c.kind, corr = this.CORR[kind], ev = [], sum = [], err = null, out = [], loops = null;
    var st = { sub: '', verdict: {}, cur: 0, hit: [], res: '', exp: '' };
    function push(s, k) { ev.push({ s: s, k: k, snap: JSON.parse(JSON.stringify(st)) }); }
    function nul(x) { return x === null ? 'NULL' : String(x); }
    // The Korean text needs the particle that follows a number to be chosen; English does not use this, and the function is kept so that the lines stay the same
    function jo(n, a, b) { return n + ([0, 1, 3, 6, 7, 8].indexOf(n % 10) >= 0 ? a : b); }
    var innerSql = this.inner(c), innerText, type;
    push('CREATE TABLE, INSERT: There are 4 members and ' + O.length + ' orders. Alice placed 2 orders, Bob and Carol placed 1 each, and Dave has no orders.' + (c.nul ? ' Order 105 is a guest order, so its member_id is NULL.' : ''), '');
    if (kind === 'scalar') {
      var item = this.PICK[c.pick], got = O.filter(function (o) { return o[2] === item; });
      innerText = got.length ? 'Rows: ' + got.length + ' (' + got.map(function (o) { return nul(o[1]); }).join(', ') + ')' : 'Rows: 0';
      st.sub = innerText; st.hit = got.map(function (o) { return o[0]; });
      push('(' + innerSql + '): The subquery in parentheses does not use any value from the outer query, so it can be run by itself. Orders whose item is ' + item + ': ' + (got.length ? got.length + ' (member_id ' + got.map(function (o) { return o[1]; }).join(' and ') + ').' : 'none. The result of the subquery is 0 rows.'), '');
      if (got.length > 1) { err = { no: 1242, msg: 'Subquery returns more than 1 row' }; st.res = 'Error 1242'; push('WHERE id = (...): Only one value can appear on the right side of =. The subquery returned ' + got.length + ' rows, so MySQL rejects the statement with error 1242 (Subquery returns more than 1 row).', 'bad'); }
      else if (!got.length) { M.forEach(function (m) { st.verdict[m[0]] = ['unknown', 'unk']; }); st.res = 'Rows: 0'; push('WHERE id = (...): If the subquery returns 0 rows, the value in its place becomes NULL. id = NULL is not true for any row ("unknown"), so the result is 0 rows. No error occurs.', 'bad'); }
      else { M.forEach(function (m) { var ok = m[0] === got[0][1]; st.verdict[m[0]] = [ok ? 'true' : 'false', ok ? 'in' : 'out']; if (ok) out.push(m[1]); }); st.res = 'Rows: ' + out.length; push('WHERE id = (...): The subquery returned the single value ' + got[0][1] + ', so the condition is the same as WHERE id = ' + got[0][1] + '. Rows in the result: ' + out.length + ' (' + out.join(', ') + ').', 'good'); }
      type = err ? '-' : 'SUBQUERY'; st.exp = type;
      push(err ? 'EXPLAIN: Even if you put EXPLAIN in front of this statement to see the execution plan, you get the same error 1242.' : 'EXPLAIN: The select_type of the subquery row is SUBQUERY. It means a subquery that is run without depending on the value of the outer row.', '');
    } else if (kind === 'corr') {
      innerText = 'Error 1054 (needs the outer m.id)'; st.sub = 'Run again for each outer row';
      push('(' + innerSql + '): The subquery contains the column m.id of the outer query. The value of m.id differs for each outer row, so this subquery cannot be run by itself. It is run again, with that value, every time an outer row is fixed. This kind of subquery is called a correlated subquery.', '');
      M.forEach(function (m) {
        var mine = O.filter(function (o) { return o[1] === m[0]; });
        st.cur = m[0]; st.hit = mine.map(function (o) { return o[0]; }); st.verdict[m[0]] = ['cnt ' + mine.length, 'in']; out.push(m[1] + ' ' + mine.length);
        push('Outer row ' + m[1] + ' (id ' + m[0] + '): Put ' + m[0] + ' in place of m.id and run the subquery. Orders with member_id ' + m[0] + ': ' + mine.length + ', so cnt is ' + mine.length + '.', '');
      });
      st.cur = 0; st.hit = []; st.res = 'Rows: ' + out.length; type = 'DEPENDENT SUBQUERY'; st.exp = type; loops = M.length;
      push('EXPLAIN: The select_type of the subquery row is DEPENDENT SUBQUERY. It means a subquery that depends on the value of the outer row. If you look at the actual execution with EXPLAIN ANALYZE, loops for the subquery part is ' + M.length + ': it was run once for each of the ' + M.length + ' outer rows.', 'good');
    } else if (kind === 'in' || kind === 'notin') {
      var list = O.map(function (o) { return o[1]; }), hasNull = list.indexOf(null) >= 0, shown = list.map(nul).join(', '), not = kind === 'notin';
      innerText = 'Rows: ' + list.length + ' (' + shown + ')'; st.sub = 'List: ' + shown;
      push('(' + innerSql + '): The subquery in parentheses does not use any value from the outer query, so it can be run by itself. It returns the list ' + shown + ', which is the member_id of each order.' + (hasNull ? ' The list contains a NULL because of the guest order.' : ''), '');
      M.forEach(function (m) {
        var found = list.indexOf(m[0]) >= 0, v = found ? 'T' : hasNull ? 'U' : 'F';   // the value of IN: true, unknown, false
        if (not) v = v === 'T' ? 'F' : v === 'F' ? 'T' : 'U';
        st.cur = m[0]; st.hit = O.filter(function (o) { return o[1] === m[0] || (!found && o[1] === null); }).map(function (o) { return o[0]; });
        st.verdict[m[0]] = [v === 'T' ? 'true' : v === 'F' ? 'false' : 'unknown', v === 'T' ? 'in' : v === 'F' ? 'out' : 'unk'];
        if (v === 'T') out.push(m[1]);
        var head = m[1] + ' (id ' + m[0] + ') ' + (not ? 'NOT IN' : 'IN') + ' (' + shown + '): ';
        if (!not) push(head + (found ? 'The list contains ' + m[0] + ', so the result is true. The row goes into the result.' : hasNull ? 'The list has no value equal to ' + m[0] + '. But it is not known whether ' + m[0] + ' is equal to NULL, so the result is "unknown", not false. WHERE keeps only the rows for which the condition is true, so the row is removed either way.' : 'The list does not contain ' + m[0] + ', so the result is false. The row is removed.'), found ? 'good' : '');
        else push(head + (found ? 'The list contains ' + m[0] + ', so IN is true and NOT IN is false. The row is removed.' : hasNull ? 'NOT IN means "different from every value in the list". The value ' + m[0] + ' is different from 1, 2, and 3, but it is not known whether it is different from NULL. If even one comparison is unknown, the whole condition becomes "unknown", and WHERE keeps only the rows for which it is true, so ' + m[1] + ', who has no orders, is removed too.' : 'The value ' + m[0] + ' is different from every value in the list, so the condition is true. The row goes into the result.'), found ? '' : hasNull ? 'bad' : 'good');
      });
      st.cur = 0; st.hit = []; st.res = 'Rows: ' + out.length;
      type = not ? 'SUBQUERY' : 'SIMPLE (run as a join)'; st.exp = type;
      push(not ? 'EXPLAIN: The select_type of the subquery row is SUBQUERY. It does not depend on the outer row, so the list is built only once, and each outer row is compared with that list.' : 'EXPLAIN: The select_type of the row that reads member is SIMPLE, and there is no SUBQUERY or DEPENDENT SUBQUERY row. MySQL 8.4 does not run this IN subquery as a subquery. It rewrites it as a join of member and orders (a semijoin) and runs that. The result is the same as the one worked out above.', '');
    } else {
      var notE = kind === 'notexists';
      innerText = 'Error 1054 (needs the outer m.id)'; st.sub = 'Check for a row for each outer row';
      push('(' + innerSql + '): This is a correlated subquery that contains the column m.id of the outer query. EXISTS is true if the subquery returns even one row, and false if it returns 0 rows. It does not look at what the returned value is, so the subquery is written as SELECT 1.', '');
      M.forEach(function (m) {
        var mine = O.filter(function (o) { return o[1] === m[0]; }), ex = mine.length > 0, v = notE ? !ex : ex;
        st.cur = m[0]; st.hit = mine.map(function (o) { return o[0]; }); st.verdict[m[0]] = [v ? 'true' : 'false', v ? 'in' : 'out'];
        if (v) out.push(m[1]);
        push('Outer row ' + m[1] + ' (id ' + m[0] + '): ' + (ex ? 'Orders with member_id ' + m[0] + ': ' + mine.length + '. The subquery returns rows, so EXISTS is true' + (notE ? ' and NOT EXISTS is false. The row is removed.' : '. The row goes into the result.') : 'There are no orders with member_id ' + m[0] + '. The subquery returns 0 rows, so EXISTS is false' + (notE ? ' and NOT EXISTS is true. The row goes into the result.' : '. The row is removed.') + (c.nul ? ' The order whose member_id is NULL does not pass the condition o.member_id = ' + m[0] + ', so it simply does not appear in the result of the subquery. The value of EXISTS is always true or false, never "unknown".' : '')), v ? 'good' : '');
      });
      st.cur = 0; st.hit = []; st.res = 'Rows: ' + out.length;
      type = 'SIMPLE (run as a join)'; st.exp = type;
      push('EXPLAIN: The select_type of the row that reads member is SIMPLE, and there is no SUBQUERY or DEPENDENT SUBQUERY row. The statement looks like a correlated subquery, but MySQL 8.4 rewrites it as a join of member and orders (' + (notE ? 'an antijoin' : 'a semijoin') + ') and runs that, so it does not appear as DEPENDENT SUBQUERY. The result is the same as the one worked out above.', '');
    }
    var resText = err ? '-' : out.length ? 'Rows: ' + out.length + ' (' + out.join(', ') + ')' : 'Rows: 0';
    sum.push(err ? 'The statement was rejected with error 1242.' : 'Result: ' + resText + '. The select_type in EXPLAIN is ' + type + '.');
    if (kind === 'scalar') sum.push({ one: 'A subquery that returns a single value (a scalar subquery) can be used like a value on one side of a comparison such as =, <, or >. It must return exactly one column and at most one row.', two: 'You cannot be sure that one row will keep coming out just because the current data gives one. The moment the data grows and gives two rows, an error occurs. Where several rows can come out, use IN instead of = (in this example, Alice and Bob come out). If you need a single value, write the condition so that the subquery always returns only one row.', zero: 'When the subquery returns 0 rows, the value becomes NULL, not an error. A comparison with NULL is never true, so the result quietly becomes 0 rows. With two rows you are told by an error, but with 0 rows you are not.' }[c.pick]);
    if (kind === 'corr') sum.push('A correlated subquery can be run again as many times as there are outer rows. With 4 outer rows that is 4 times, but with 100,000 outer rows it is 100,000 times. The same result as in this example can also be obtained with LEFT JOIN and GROUP BY.');
    if (kind === 'in') sum.push('IN asks "is there at least one equal value in the list?" Even if the list contains a NULL, a row that finds an equal value is true. A row that does not find one is removed whether its value is false or unknown, so the result does not change. The trouble starts with NOT IN.');
    if (kind === 'exists') sum.push('EXISTS does not compare values. It only looks at "is there a row that satisfies the condition?" In this example IN and EXISTS gave the same result, and MySQL 8.4 ran both as joins. Which one is faster is decided not by the shape of the statement but by looking at the execution plan.');
    if (kind === 'notin') sum.push(c.nul ? 'If the NOT IN list contains even one NULL, the result is always 0 rows. An empty result comes out with no error and no warning, so it is hard to notice. Add WHERE member_id IS NOT NULL to the subquery (then Dave comes out), or rewrite the statement with NOT EXISTS.' : 'When the list has no NULL, NOT IN works as expected. Turn on "Add one order whose member_id is NULL" and run it again.');
    if (kind === 'notexists') sum.push('NOT EXISTS only asks, for each outer row, "is there a matching row?", so the result does not change when a NULL is mixed in. NOT EXISTS is the safe choice for "finding what is missing".');
    if (kind === 'in' || kind === 'exists' || kind === 'notexists') sum.push('The select_type came out as SIMPLE because the MySQL optimizer rewrote the subquery as a join. Depending on the amount of data, EXPLAIN may also show an additional MATERIALIZED row.');
    return { events: ev, summary: sum, err: err, out: out, innerText: innerText, type: type, loops: loops, row: [err ? 'Error ' + err.no : 'Success', resText, innerText, type] };
  },
  render: function (v, sim, t, H, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : null, c = sim.c;
    if (!s) { H.text(v, 'Click Run to go through the steps one at a time.'); return; }
    var ln = H.lanes(v);
    H.lane(ln, 'Subquery', s.sub || 'Not run yet', s.sub ? 'hot' : 'none');
    H.lane(ln, 'Result', s.res || 'Not decided yet', !s.res ? 'none' : /Error|^Rows: 0/.test(s.res) ? 'bad' : 'good');
    H.lane(ln, 'select_type', s.exp || 'Not checked yet', s.exp ? 'wait' : 'none');
    H.table(v, ['id', 'name', c.kind === 'corr' ? 'Value of the subquery' : 'Value of the WHERE condition'], this.M.map(function (m) { var vd = s.verdict[m[0]]; return { cells: [String(m[0]), m[1], vd ? { v: vd[0], cls: vd[1] === 'in' ? 'good' : vd[1] === 'unk' ? 'bad' : '' } : (s.cur === m[0] ? { v: 'Checking', cls: 'hot' } : '')] }; }), 'member table (outer query)');
    H.table(v, ['id', 'member_id', 'item'], this.orders(c).map(function (o) { var hit = s.hit.indexOf(o[0]) >= 0; return { cells: [String(o[0]), { v: o[1] === null ? 'NULL' : String(o[1]), cls: o[1] === null ? 'bad' : hit ? 'hot' : '' }, { v: o[2], cls: hit ? 'hot' : '' }] }; }), 'orders table (subquery)');
  },
  // Diagram: On the left are the rows of the outer query (members), and on the right are the rows that the subquery reads (orders). Each member gets the value of the condition (true, false, unknown).
  draw: function (P, sim, shown) {
    var c = sim.c, last = shown[shown.length - 1], s = last ? last.snap : null, O = this.orders(c), corr = this.CORR[c.kind];
    P.size(680, 306);
    P.region('rm', 16, 14, 300, 176, 'member (outer query)');
    P.region('ro', 364, 14, 300, 196, 'orders (subquery)');
    this.M.forEach(function (m, i) {
      var vd = s ? s.verdict[m[0]] : null, now = s && s.cur === m[0];
      P.box('m' + m[0], 28, 46 + i * 34, 276, 28, { cls: (vd ? (vd[1] === 'in' ? 'good' : vd[1] === 'unk' ? 'bad' : 'plain') : 'wait') + (now ? ' now' : ''), title: 'id ' + m[0] + ' ' + m[1], right: vd ? vd[0] : '' });
    });
    O.forEach(function (o, i) {
      var hit = s && s.hit.indexOf(o[0]) >= 0;
      P.box('o' + o[0], 376, 46 + i * 31, 276, 26, { cls: hit ? (o[1] === null ? 'bad' : 'hot') : o[1] === null ? 'plain now' : 'plain', title: o[0] + ' ' + o[2], right: 'member_id ' + (o[1] === null ? 'NULL' : o[1]) });
      if (hit && s.cur && corr) P.arrow('h' + o[0], 'm' + s.cur + ':r', 'o' + o[0] + ':l', { cls: 'hot' });
    });
    P.box('sub', 16, 218, 648, 32, { cls: s && s.sub ? 'hot' : 'ghost', title: corr ? 'Subquery' : 'Result of the subquery', right: s && s.sub ? s.sub : '?' });
    if (s && s.cur && !corr) P.arrow('cmp', 'm' + s.cur + ':b', 'sub:t:0.25', { cls: 'hot', label: 'compare' });
    P.box('res', 16, 260, 250, 34, { cls: !s || !s.res ? 'ghost' : /Error|^Rows: 0/.test(s.res) ? 'bad' : 'good', title: 'Result', right: s && s.res ? s.res : '?' });
    P.box('exp', 278, 260, 386, 34, { cls: s && s.exp ? 'wait' : 'ghost', title: 'select_type', right: s && s.exp ? s.exp : '?' });
    P.note(corr ? 'A correlated subquery looks up the orders again, using the id of the outer row, every time an outer row is fixed. The yellow arrow goes from the outer row being looked at to its matching orders. The order with a thick border is the one whose member_id is NULL.' : 'A subquery that is not correlated is run once, and its result (a single value or a list) is kept. Each outer row is then compared with that result one by one. The text to the right of each member is the value of the WHERE condition. WHERE keeps only the rows whose value is "true", and "unknown" is removed too.');
  },
  assume: 'This is a small example with 4 members and 4 or 5 orders. For all 36 combinations (6 shapes × with or without the NULL order × 3 items to look for; the item to look for changes the statement only in the "single value" shape), the SQL shown on the screen was run as is on a real MySQL 8.4.11, and the error numbers and messages, every row of the result, the result of running only the subquery in parentheses on its own, and the select_type in EXPLAIN were checked against the model and matched. That a correlated subquery is run for every outer row was confirmed by the loops of the subquery part in EXPLAIN ANALYZE being equal to the number of outer rows (4), and that the subquery of NOT IN is run only once was confirmed by "run only once" being shown in EXPLAIN ANALYZE. The steps on the screen are a logical explanation that follows the meaning of the condition, and they may differ from how MySQL actually runs the statement. The MySQL 8.4 optimizer ran IN and EXISTS subqueries as semijoins and NOT EXISTS as an antijoin, which is why select_type came out as SIMPLE. This rewriting depends on the version, the settings (optimizer_switch), and the amount of data, and the EXPLAIN of the same statement sometimes also showed a MATERIALIZED row. When the members and orders were increased to 1,000 rows each, the select_type classification was the same. Versions before MySQL 8.0.16 do not rewrite EXISTS subqueries as semijoins, so they may show DEPENDENT SUBQUERY (this part follows the MySQL documentation, not execution). NOT IN came out as SUBQUERY instead of being rewritten as a join because member_id is a column that allows NULL. For a table where member_id was declared NOT NULL, the same NOT IN statement came out as SIMPLE (antijoin), which was confirmed by running it. Apart from select_type, the result rows and errors follow the definition of SQL, so they are the same in other databases. Among the contents of the summary, "if you use IN instead of =, Alice and Bob come out", "LEFT JOIN and GROUP BY give the same result", and "if you add IS NOT NULL to the subquery, Dave comes out" were also run separately on the same MySQL and confirmed. That a subquery in the place of a single value becomes NULL when it returns 0 rows agrees between the explanation in the MySQL documentation and the execution result (0 rows, no error).',
});

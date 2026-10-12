Lab.register({
  id: 'where_basic', nav: 'WHERE', cat: 'Fundamentals', mode: 'step', basic: true, deep: ['selectorder'],
  title: 'What does WHERE decide, and what happens without it?',
  intro: 'WHERE is the "WHERE condition" that you add after an SQL statement. It decides which of the rows in a table an UPDATE, DELETE, or SELECT applies to. The database looks at the rows one by one, checks whether the condition is met, and applies the statement to, or reads, only the rows that match. In this lab you change the kind of statement and the WHERE condition and run the same SQL on the same table each time. You see how many rows the statement applies to and which rows are left at the end. You also see what happens when you remove WHERE.',
  terms: ['WHERE clause', 'UPDATE and DELETE', 'Rows and columns'],
  controls: [
    { id: 'stmt', label: 'Statement that gets WHERE', type: 'select', value: 'update', options: [['update', "UPDATE member SET name = 'Withdrawn'"], ['delete', 'DELETE FROM member'], ['select', 'SELECT * FROM member (read only)']] },
    { id: 'cond', label: 'WHERE condition', type: 'select', value: 'one', options: [['one', 'WHERE id = 2'], ['many', 'WHERE age = 30'], ['zero', 'WHERE id = 9 (a condition that matches no row)'], ['none', 'Do not write WHERE']] },
  ],
  // q is the question shown on the question-style screen. t and d are the name and the description used in the text-only reading
  presets: [
    { t: 'Default settings', q: 'What does WHERE look like, and which rows change when you add it to an UPDATE?', d: 'An UPDATE with WHERE id = 2. Only the row with id 2, which matches the condition, changes.', v: { stmt: 'update', cond: 'one' } },
    { t: 'Removing WHERE', q: 'What if you remove WHERE?', d: 'With no condition, every row is a target, so the UPDATE changes all three rows.', v: { stmt: 'update', cond: 'none' } },
    { t: 'Changing the condition to age = 30', q: 'What if you change the condition to age = 30?', d: 'When two rows match, the statement is applied to both.', v: { stmt: 'update', cond: 'many' } },
    { t: 'A condition that matches no row', q: 'What if the condition matches no row (id = 9)?', d: 'When no row matches, no row changes, and it is not an error.', v: { stmt: 'update', cond: 'zero' } },
    { t: 'Removing WHERE from a DELETE', q: 'What if you remove WHERE from a DELETE?', d: 'A DELETE without WHERE deletes every row of the table.', v: { stmt: 'delete', cond: 'none' } },
  ],
  // The code on the screen and the check program (verify/spring/src/WhereBasicProbe.java) run the same text. The check script compares it character by character.
  head: { update: "UPDATE member SET name = 'Withdrawn'", 'delete': 'DELETE FROM member', select: 'SELECT * FROM member' },
  whereOf: { one: 'WHERE id = 2', many: 'WHERE age = 30', zero: 'WHERE id = 9', none: '' },
  stmtLine: function (c) { return this.head[c.stmt] + (c.cond === 'none' ? '' : ' ' + this.whereOf[c.cond]) + ';'; },
  code: function (c) {
    var l = ['CREATE TABLE member (', '    id   INT PRIMARY KEY,', '    name VARCHAR(20),', '    age  INT', ');',
      "INSERT INTO member VALUES (1, 'Alice', 20);", "INSERT INTO member VALUES (2, 'Bob', 30);", "INSERT INTO member VALUES (3, 'Carol', 30);", ''];
    if (c.cond !== 'none') l.push('-- WHERE: apply this statement only to the rows that match the condition');
    l.push(this.stmtLine(c), 'SELECT * FROM member ORDER BY id;');
    return l.join('\n');
  },
  label: function (c) { return { update: 'UPDATE', 'delete': 'DELETE', select: 'SELECT' }[c.stmt] + ' · ' + (c.cond === 'none' ? 'No WHERE' : this.whereOf[c.cond]); },
  columns: ['Rows the statement applied to', 'Rows left at the end'],
  simulate: function (c) {
    var stmt = c.stmt, cond = c.cond, ev = [], sum = [];
    var base = [{ id: 1, name: 'Alice', age: 20 }, { id: 2, name: 'Bob', age: 30 }, { id: 3, name: 'Carol', age: 30 }];
    var test = { one: function (r) { return r.id === 2; }, many: function (r) { return r.age === 30; }, zero: function (r) { return r.id === 9; }, none: function () { return true; } }[cond];
    var qtext = { one: 'Is id = 2', many: 'Is age = 30', zero: 'Is id = 9' }[cond];
    var field = { one: 'id', many: 'age', zero: 'id' }[cond], wantSub = { one: '2', many: '30', zero: '9' }[cond];
    var ord = ['first', 'second', 'third'];
    var sline = this.stmtLine(c).replace(/;$/, '');
    function ids(a) { return a.map(function (r) { return r.id; }); }
    function idList(a) { return 'id ' + ids(a).join(', '); }
    function rowText(r) { return '(' + r.id + ', ' + r.name + ', ' + r.age + ')'; }
    var st = { rows: base.map(function (r) { return { id: r.id, name: r.name, age: r.age, m: 'wait', cur: false, vt: '', vr: '', del: false }; }), stmt: 'CREATE TABLE, INSERT (3 times)', cnt: null };
    function push(s, k) { ev.push({ s: s, k: k, snap: JSON.parse(JSON.stringify(st)) }); }
    var hit = base.filter(test), miss = base.filter(function (r) { return !test(r); });
    var all = cond === 'none';
    var verbDo = { update: 'changes', 'delete': 'deletes', select: 'reads' }[stmt];

    // 1. Preparation
    push('CREATE TABLE and INSERT: The database creates the member table and adds three rows (Alice, Bob, and Carol). A table is made of columns (id, name, age) and rows (one line of information about one person). These three rows are all the rows that the statement below can apply to.', '');

    // 2. Running the statement
    st.stmt = sline;
    if (all) {
      st.rows.forEach(function (r) { r.m = 'yes'; r.vt = 'No condition'; r.vr = 'Target'; });
      push(sline + ': This statement has no WHERE. There is no condition to check, so the database takes every row of the table as the target. All three rows become ' + (stmt === 'select' ? 'rows to read' : 'rows to apply the statement to') + '.', stmt === 'select' ? '' : 'bad');
    } else {
      push(sline + ': This statement has a WHERE condition (' + this.whereOf[cond] + '). The condition after WHERE decides "' + (stmt === 'select' ? 'which rows to read' : 'which rows to apply this statement to') + '." The database looks at the rows of the member table one by one and checks whether ' + qtext.replace(/^Is /, '') + ' is true. We did not write the code that does this check. The database does it by itself for every statement.', '');
      base.forEach(function (r, i) {
        var yes = test(r), s = st.rows[i], v = r[field];
        st.rows.forEach(function (x) { x.cur = false; });
        s.cur = true; s.m = yes ? 'yes' : 'no'; s.vt = qtext; s.vr = yes ? 'Yes' : 'No';
        var lead = i === 0 ? 'The database looks at the ' + ord[i] + ' row (' + rowText(r).slice(1, -1) + '): ' : 'The ' + ord[i] + ' row (' + rowText(r).slice(1, -1) + '): ';
        var ans = yes
          ? 'The ' + field + ' of this row is ' + v + ', so the answer is "Yes." This row matches the condition.'
          : 'The ' + field + ' of this row is ' + v + ', not ' + wantSub + ', so the answer is "No." This row does not match the condition, so the statement is not applied to it.';
        push(lead + qtext + '? ' + ans, '');
      });
      st.rows.forEach(function (x) { x.cur = false; });
    }

    // 3. Applying
    var n = hit.length, hitText = n ? idList(hit) : '', missText = miss.length ? idList(miss) : '';
    st.cnt = n;
    st.rows.forEach(function (r, i) {
      if (!test(base[i])) return;
      r.cur = false;
      if (stmt === 'update') { r.name = 'Withdrawn'; r.m = 'done'; r.vr = 'Yes · changed'; if (all) r.vr = 'Changed'; }
      else if (stmt === 'delete') { r.del = true; r.vr = all ? 'Deleted' : 'Yes · deleted'; }
      else { r.m = 'done'; r.vr = all ? 'Read' : 'Yes · read'; }
    });
    var ap;
    if (n === 0) {
      ap = 'No row matched. ' + (stmt === 'select' ? 'There are no rows to read, so the database returns an empty result (0 rows).' : 'There are no rows to apply the statement to, so the database does not ' + (stmt === 'update' ? 'change' : 'delete') + ' any row, and the value it returns (the number of rows ' + (stmt === 'update' ? 'changed' : 'deleted') + ') is 0.') + ' It is not an error even if no row matches. The statement finishes normally.';
    } else if (all) {
      ap = stmt === 'update' ? 'Every row is a target, so the database ' + verbDo + ' the name of all 3 rows to Withdrawn. The value it returns (the number of rows changed) is 3. Without WHERE, the database does not filter rows.'
        : stmt === 'delete' ? 'Every row is a target, so the database ' + verbDo + ' all 3 rows. The value it returns (the number of rows deleted) is 3. The table is still there, but it has no rows.'
        : 'Every row is a target, so the database ' + verbDo + ' all 3 rows. The number of rows read is 3, and the data does not change because the statement only reads.';
    } else {
      ap = 'The statement is applied only to the rows that matched (' + hitText + '). ' + (stmt === 'update' ? 'The database changes the name of ' + (n > 1 ? 'those ' + n + ' rows' : 'that row') + ' to Withdrawn. The value it returns (the number of rows changed) is ' + n + '. ' : stmt === 'delete' ? 'The database deletes ' + (n > 1 ? 'those ' + n + ' rows' : 'that row') + '. The value it returns (the number of rows deleted) is ' + n + '. ' : 'The database reads only ' + (n > 1 ? 'those rows' : 'that row') + '. The number of rows read is ' + n + ', and the data does not change because the statement only reads. ') + 'The rows that did not match (' + missText + ') stay as they are.' + (n > 1 ? ' If several rows match, the statement is applied to all of them.' : '');
    }
    push(sline + ': ' + ap, n === 0 ? '' : (all && stmt !== 'select') ? 'bad' : n > 1 && stmt !== 'select' ? 'bad' : 'good');

    // 4. The last SELECT
    var left = st.rows.filter(function (r) { return !r.del; });
    var finalText = left.length ? left.map(function (r) { return rowText(r); }).join(', ') : '(no rows)';
    st.stmt = 'SELECT * FROM member ORDER BY id';
    st.rows.forEach(function (r) { r.cur = false; if (r.m === 'done' && stmt !== 'update') r.m = 'plain'; });
    st.cnt = n;
    var remark = stmt === 'select' ? 'SELECT only read, so the three rows are as they were at the start.'
      : n === 0 ? 'No row was ' + (stmt === 'update' ? 'changed' : 'deleted') + ', so the three rows are as they were at the start.'
      : all ? (stmt === 'update' ? 'The name of all three rows has been changed to Withdrawn.' : 'All the rows were deleted, so there is nothing to read. The table is still there, and there is no error.')
      : stmt === 'update' ? 'The names in the rows that matched (' + hitText + ') were changed to Withdrawn, and the rest are as they were.'
      : 'The rows that matched (' + hitText + ') were deleted, and the rest are left.';
    push('SELECT * FROM member ORDER BY id: This SELECT has no WHERE, so it reads all the rows left in the table. The result is ' + finalText + '. ' + remark, all && stmt !== 'select' ? 'bad' : n > 1 && stmt !== 'select' ? 'bad' : 'good');

    // Summary: the first line is the answer to the question
    var S1, S2, S = stmt, nm = { update: 'UPDATE', 'delete': 'DELETE', select: 'SELECT' }[S];
    var did = { update: 'changed the name to Withdrawn', 'delete': 'deleted', select: 'read' }[S];
    if (cond === 'one') {
      S1 = 'WHERE is a condition that you add after a statement to decide "which rows this statement applies to." The ' + nm + ' with "WHERE id = 2" ' + (S === 'update' ? 'changed' : S === 'delete' ? 'deleted' : 'read') + ' only the row with id 2, which matches the condition.';
      S2 = 'The database checks the condition for each row and applies the statement only to the rows that match. The other two rows do not match the condition, so ' + (S === 'select' ? 'they were not read.' : 'they are as they were.');
    } else if (cond === 'many') {
      S1 = 'When two rows match the condition (id 2 and 3), the statement is applied to both. The ' + nm + ' with WHERE age = 30 ' + (S === 'update' ? 'changed' : S === 'delete' ? 'deleted' : 'read') + ' both rows.';
      S2 = 'WHERE is not a way to pick one row. It is a way to pick every row that matches the condition. To pick just one row, write the condition on a column like id, whose value differs in every row.';
    } else if (cond === 'zero') {
      S1 = 'When no row matches, no row is ' + (S === 'update' ? 'changed' : S === 'delete' ? 'deleted' : 'read') + ', and it is not an error. No row has id 9, so the ' + nm + ' was applied to 0 rows.';
      S2 = S === 'select' ? 'A SELECT also returns an empty result (0 rows) without an error. "Not found" is not an error. It is a result of 0 rows.' : 'A statement that finishes without an error does not mean that a row was changed. You can tell from the number of rows ' + (S === 'update' ? 'changed' : 'deleted') + ' being 0.';
    } else {
      S1 = 'If you remove WHERE, there is no condition to check, so every row is a target. ' + (S === 'update' ? 'The UPDATE changed the name of all three rows to Withdrawn.' : S === 'delete' ? 'The DELETE deleted every row of the table.' : 'The SELECT read all three rows.');
      S2 = S === 'update' ? 'Even an UPDATE that was meant to change one person changes everyone if it has no WHERE. The statement finishes without an error, so the database does not warn you.'
        : S === 'delete' ? 'A DELETE without WHERE empties the table. The statement finishes without an error, so the database does not warn you.'
        : 'A SELECT only reads, so the data is as it was. The same thing changes everyone in an UPDATE and empties the table in a DELETE.';
    }
    sum.push(S1, S2);
    var appliedText = n === 0 ? '0' : all ? '3 (all rows)' : n + ' (' + hitText + ')';
    return { events: ev, summary: sum, matched: ids(hit), row: [appliedText, finalText] };
  },
  render: function (v, sim, t, H, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : null;
    if (!s) { H.text(v, 'Click Run to start from creating the table and go one statement at a time.'); return; }
    var live = s.rows.filter(function (r) { return !r.del; });
    H.table(v, ['id', 'name', 'age', 'Condition'], live.length ? live.map(function (r) { var k = r.m === 'done' ? 'good' : r.m === 'yes' ? 'hot' : ''; return { cls: r.m === 'no' ? 'gone' : '', cells: [{ v: String(r.id), cls: k }, { v: r.name, cls: k }, { v: String(r.age), cls: k }, r.vr ? r.vt + (r.vt ? ': ' : '') + r.vr : ''] }; }) : [{ cls: 'gone', cells: ['No rows', '', '', ''] }], 'member table');
    H.counters(v, [[live.length, 'Rows in the table'], [s.cnt === null ? '-' : s.cnt, 'Rows the statement applied to']]);
  },
  // Diagram: the statement that is running at the top, the three rows of the member table with the condition check for each row in the middle (a matching row is yellow, green after it changes, and a deleted row disappears), and the number of rows the statement applied to at the bottom.
  draw: function (P, sim, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : null;
    P.size(680, 300);
    P.box('st', 14, 10, 652, 54, { cls: s ? 'hot' : 'ghost', title: 'Statement running now', sub: s ? [s.stmt] : [' '] });
    P.region('tb', 14, 76, 652, 166, 'member table (id, name, age)');
    [0, 1, 2].forEach(function (i) {
      var r = s ? s.rows[i] : null, y = 114 + i * 42;
      if (r && !r.del) {
        var cls = r.m === 'done' ? 'good' : r.m === 'yes' ? 'hot' : r.m === 'no' ? 'ghost' : r.m === 'wait' ? 'wait' : 'plain';
        P.box('r' + i, 26, y, 380, 34, { cls: cls + (r.cur ? ' now' : ''), title: 'id ' + r.id + ' · ' + r.name + ' · ' + r.age });
      }
      if (r && r.vt) P.box('v' + i, 422, y, 232, 34, { cls: r.m === 'no' ? 'ghost' : 'hot', title: r.vt, right: r.vr });
    });
    P.box('n1', 14, 254, 652, 36, { cls: s && s.cnt !== null ? (s.cnt === 0 ? 'wait' : 'good') : 'ghost', title: 'Rows the statement applied to', right: s && s.cnt !== null ? s.cnt + '' : '-' });
  },
  assume: 'The model was checked against real execution on H2 2.4.240 (an in-memory database, through JDBC). For all 12 combinations, the whole SQL on the screen (including the comment line) was run character by character, one statement at a time, and the following were checked against the model: the number of rows the statement applied to and which rows they were (the rows whose name changed for UPDATE, the rows that disappeared for DELETE, and the rows that were read for SELECT), whether an error occurred, and the result of the last SELECT. That a condition that matches no row (WHERE id = 9) and an UPDATE or DELETE without WHERE finish without an error on H2, and that the table remains after a DELETE without WHERE so that the last SELECT returns an empty result, were checked in this execution. I opened the MySQL 8.4 documentation directly and checked the rules in the UPDATE statement (section 15.2.17: with WHERE, only the rows that match the condition are updated, and without it all rows are updated), the DELETE statement (section 15.2.2: without WHERE, all rows are deleted), and the SELECT statement (section 15.2.13: without WHERE, all rows are selected). I also checked in the MySQL documentation (Using Safe-Updates Mode in the tips for the mysql client) that MySQL has a safe-updates mode that prevents an UPDATE or DELETE where WHERE was forgotten. When this mode is on, an UPDATE or DELETE whose WHERE has no key condition gives an error, and this lab does not cover that mode. The check by execution on MySQL was not done. So the rule above rests on the documentation and the H2 execution agreeing, and it was not verified by execution whether MySQL gives the same result for the same SQL. The screen is drawn as the database looking at the rows one by one and checking the condition. A real database may find the matching rows in another way, depending on the implementation, for example by using an index. What was checked by execution is which rows the statement was applied to, not the order of checking. The "number of rows applied to" that a statement returns was the same as the number of changed rows in this lab, because the names of all the matched rows were different from before in the UPDATE. How a database counts a row whose new value is already the same can differ with the database and the driver settings, so this lab does not cover it. The condition is only one equality (=) comparison. AND and OR, ranges, LIKE, and comparisons with NULL are not covered.',
});

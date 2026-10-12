Lab.register({
  id: 'table_basic', nav: 'Tables, rows, and columns', cat: 'Fundamentals', mode: 'step', basic: true, deep: ['constraints'],
  title: 'What does a table look like, and what are rows and columns?',
  intro: 'A relational database keeps data in tables. CREATE TABLE is the statement that makes a table and decides its columns (the vertical slots). Each column has a name and a type, which decide what it holds, as in "the id column holds an integer and the name column holds text". INSERT is the statement that puts in one row (a horizontal line, the information of one person), and a row must match the number and the types of the columns. SELECT is the statement that reads the values of chosen columns from the rows. This lab runs the same SQL while you remove CREATE TABLE or change the shape of the second row and the column that is read, and shows which statements the database accepts and which it rejects.',
  terms: ['Table', 'Rows and columns', 'Column data type', 'CREATE TABLE, INSERT, SELECT'],
  controls: [
    { id: 'create', label: 'The CREATE TABLE statement is there', type: 'check', value: true },
    { id: 'second', label: 'The row in the second INSERT', type: 'select', value: 'ok', options: [['ok', "Second row: (2, 'Bob')"], ['text', "Second row: ('two', 'Bob') text in the id column"], ['more', "Second row: (2, 'Bob', 30) three values"], ['less', 'Second row: (2) one value']] },
    { id: 'col', label: 'The column that SELECT reads', type: 'select', value: 'name', options: [['name', 'SELECT name FROM member'], ['age', 'SELECT age FROM member (a column that does not exist)']] },
  ],
  // q is the question shown on the question-style screen. t and d are the name and the description used in the text-only reading
  presets: [
    { t: 'Default settings', q: 'What does a table look like, and what happens when you put in rows and read them?', d: 'It puts two rows into a member table with two columns and reads the name column. Both INSERT statements fit the columns and go in.', v: { create: true, second: 'ok', col: 'name' } },
    { t: 'Removing CREATE TABLE', q: 'What if you remove CREATE TABLE?', d: 'There is no member table, so both INSERT and SELECT give an error.', v: { create: false, second: 'ok', col: 'name' } },
    { t: "Putting the text 'two' in the id column", q: "What if you put the text 'two' in the id column?", d: 'The type of the id column is integer, so the database rejects the second INSERT.', v: { create: true, second: 'text', col: 'name' } },
    { t: 'Putting in three values', q: 'What if you put in three values for two columns?', d: 'The number of values differs from the number of columns, so the database rejects the second INSERT.', v: { create: true, second: 'more', col: 'name' } },
    { t: 'Reading the column age that does not exist', q: 'What if you read the column age that does not exist?', d: 'Both rows go in, but SELECT gives an error because it tries to read a column that the member table does not have.', v: { create: true, second: 'ok', col: 'age' } },
  ],
  // The code on the screen and the checking program (verify/spring/src/TableBasicProbe.java) run the same text. The checking script compares them character by character.
  row2: { ok: "(2, 'Bob')", text: "('two', 'Bob')", more: "(2, 'Bob', 30)", less: '(2)' },
  sub2: { ok: '(2, Bob)', text: '(two, Bob)', more: '(2, Bob, 30)', less: '(2)' },
  code: function (c) {
    var l = [];
    if (c.create) l.push('-- Table: make a table named member and decide two columns (id, name)', 'CREATE TABLE member (', '    id   INT,', '    name VARCHAR(20)', ');', '');
    l.push('-- Row: put in one line with the information of one person', "INSERT INTO member VALUES (1, 'Alice');", 'INSERT INTO member VALUES ' + this.row2[c.second] + ';', '', 'SELECT ' + c.col + ' FROM member;');
    return l.join('\n');
  },
  label: function (c) { return (c.create ? 'has CREATE TABLE' : 'no CREATE TABLE') + ' · second row ' + this.sub2[c.second] + ' · SELECT ' + c.col; },
  columns: ['Second INSERT', 'Rows in the table', 'SELECT result'],
  simulate: function (c) {
    var cr = !!c.create, sec = c.second, col = c.col, ev = [], sum = [], sub2 = this.sub2[sec];
    var q2 = 'INSERT INTO member VALUES ' + this.row2[sec];
    var okIns = cr && sec === 'ok';
    var res2 = !cr ? 'Rejected: no member table' : sec === 'ok' ? 'Went in' : sec === 'text' ? 'Rejected: the id column can hold only integers' : 'Rejected: number of values differs from number of columns';
    var CH = ['Count, types', 'fit columns?'];
    // State: the incoming statement (inc), the DB check box (chk), the arrow (flow: in means the statement reaches the DB, pass means it reaches the row, block means it is stopped at the check, read means it reads the column), the rows of the table
    var st = { made: false, rows: [], log: [], inc: null, chk: { cls: 'ghost', title: 'DB', sub: [' '] }, flow: '', to: [], hotCol: '', rd: null, miss: false };
    function push(s, k) { ev.push({ s: s, k: k, snap: JSON.parse(JSON.stringify(st)) }); }
    function cool() { st.rows.forEach(function (r) { r.hot = false; }); st.to = []; st.hotCol = ''; }

    if (cr) {
      // 1. CREATE TABLE
      st.made = true;
      st.inc = { title: 'CREATE TABLE', sub: ['member', '(id, name)'] };
      st.chk = { cls: 'plain', title: 'DB remembers', sub: ['Column names', 'and types'] }; st.flow = 'in';
      st.log.push(['CREATE TABLE member', 'Table made', 'good']);
      push('CREATE TABLE: the database makes an empty table named member and remembers the names and types of the columns. There are two columns, id (INT, a column that holds integers) and name (VARCHAR(20), a column that holds text), and there are no rows yet.', '');

      // 2. The first INSERT
      cool();
      st.inc = { title: 'INSERT', sub: ['(1, Alice)'] };
      st.rows.push({ id: '1', name: 'Alice', hot: true });
      st.chk = { cls: 'good', title: 'DB check', sub: CH }; st.flow = 'pass'; st.to = [0];
      st.log.push(['INSERT (1, Alice)', 'Went in', 'good']);
      push("INSERT INTO member VALUES (1, 'Alice'): the two values go into the two columns in order. The first value, 1, goes into the id column, and the second value, 'Alice', goes into the name column, and the line filled in this way is one row. The table has 1 row now.", '');

      // 3. The second INSERT: the check
      cool();
      st.inc = { title: 'INSERT', sub: [sub2] };
      st.chk = { cls: 'hot now', title: 'DB check', sub: CH }; st.flow = 'in';
      var look = sec === 'ok' ? 'There are two values, and 2 is an integer and \'Bob\' is text, so the count and the types both match the two columns.'
        : sec === 'text' ? "There are two values, but the first value, which goes into the id column, is the text 'two', not an integer."
        : sec === 'more' ? 'There are three values but only two columns.' : 'There is only one value but there are two columns.';
      push(q2 + ': it tries to put in the second row. Before it puts in a row, the database checks whether the number of values is the same as the number of columns, and whether each value matches the type of its column (an integer for the id column, text for the name column). We did not write the code that does this check. The database does it by itself each time an INSERT arrives. ' + look, '');

      // 4. The second INSERT: the result
      if (okIns) {
        st.rows.push({ id: '2', name: 'Bob', hot: true });
        st.chk = { cls: 'good', title: 'DB check', sub: CH }; st.flow = 'pass'; st.to = [1];
        st.log.push(['INSERT ' + sub2, res2, 'good']);
        push('Result of the DB check: it passes. The Bob row went in, and the table now has 2 rows.', 'good');
      } else {
        st.chk = { cls: 'bad', title: 'DB check', sub: CH }; st.flow = 'block';
        st.log.push(['INSERT ' + sub2, res2, 'bad']);
        push(sec === 'text'
          ? "Result of the DB check: the text 'two' cannot be converted to INT (integer), the type of the id column. The database rejects this INSERT and returns an error of the kind \"the value cannot be converted to the column type\". The Bob row did not go in, and the table is still the 1 row it was before the INSERT."
          : sec === 'more'
            ? 'Result of the DB check: there are three values but two columns, so the counts do not match. There is no column to put 30 in. The database rejects this INSERT and returns an error of the kind "the number of values does not match the number of columns". The Bob row did not go in, and the table is still the 1 row it was before the INSERT.'
            : 'Result of the DB check: there is only one value but there are two columns, so the counts do not match. The database does not accept it by leaving the missing column empty. It rejects this INSERT and returns an error of the kind "the number of values does not match the number of columns". The Bob row did not go in, and the table is still the 1 row it was before the INSERT.', 'good');
      }
    } else {
      // 1. There is no CREATE TABLE
      push('This code has no CREATE TABLE statement. The database has never made a table named member, so it remembers neither a table nor the names and types of columns.', 'bad');

      // 2. The first INSERT
      st.inc = { title: 'INSERT', sub: ['(1, Alice)'] };
      st.chk = { cls: 'bad', title: 'DB check', sub: ['Does member', 'exist?'] }; st.flow = 'block';
      st.log.push(['INSERT (1, Alice)', 'Rejected: no member table', 'bad']);
      push("INSERT INTO member VALUES (1, 'Alice'): the database looks for the member table to put the values in, but there is none. There are no columns to put the two values in either, so the database rejects this INSERT and returns an error of the kind \"there is no such table\". Even if one statement fails, the next statement keeps running.", 'bad');

      // 3. The second INSERT
      st.inc = { title: 'INSERT', sub: [sub2] };
      st.log.push(['INSERT ' + sub2, res2, 'bad']);
      push(q2 + ': the database cannot find the member table this time either, so it rejects this. ' + (sec === 'ok' ? 'The values (2, \'Bob\') have a shape that fits the columns, but there is no table, so there is nowhere to put them.'
        : sec === 'text' ? "This INSERT puts text in the id column, but there is no id column whose type could be checked, so the error is not a type error but \"there is no such table\"."
        : 'Even if it tried to check whether the number of values matches the number of columns, there are no columns, so the error is not a count error but "there is no such table".') + ' Whether the values fit the columns can be checked only when there is a table.', 'bad');
    }

    // Last. SELECT
    cool();
    var names = st.rows.map(function (r) { return r.name; }).join(', ');
    var selText;
    st.inc = { title: 'SELECT', sub: [col] };
    if (!cr) {
      st.chk = { cls: 'bad', title: 'DB check', sub: ['Does member', 'exist?'] }; st.flow = 'block'; st.rd = 'err';
      selText = 'Error: no member table';
      st.log.push(['SELECT ' + col, selText, 'bad']);
      push('SELECT ' + col + ' FROM member: the database looks for the member table, but there is none, so it returns an error. ' + (col === 'name' ? 'name is a column name that you could read if there had been a CREATE TABLE, but without a table there is nothing to read from.' : 'Without a table, it is stopped before it checks whether a column named age exists, so the error is not "there is no such column" but "there is no such table".'), 'bad');
    } else if (col === 'age') {
      st.chk = { cls: 'bad', title: 'DB check', sub: ['Is there a', 'column age?'] }; st.flow = 'block'; st.rd = 'err'; st.miss = true;
      selText = 'Error: no column named age';
      st.log.push(['SELECT age', selText, 'bad']);
      push('SELECT age FROM member: the database looks for age among the columns of the member table. The columns that CREATE TABLE decided are only id and name, so it cannot find age, and it returns an error of the kind "there is no such column". The ' + st.rows.length + ' rows of the table are unchanged.', 'bad');
    } else {
      st.rows.forEach(function (r) { r.hot = true; });
      st.hotCol = 'name'; st.chk = { cls: 'good', title: 'DB reads', sub: ['Every row,', 'name only'] }; st.flow = 'read'; st.rd = st.rows.length;
      selText = names;
      st.log.push(['SELECT name', selText, 'good']);
      push('SELECT name FROM member: the database reads only the values of the name column from all the rows of the table and returns them. It does not read the id column. It read ' + st.rows.length + ' rows, and the result is ' + names + '.' + (okIns ? '' : ' The row of the rejected INSERT is not in the table, so it was not read.'), 'good');
    }

    // Summary: the first line is the answer to the question
    if (!cr) {
      sum.push('Without CREATE TABLE, the database has no table named member, so both INSERT and SELECT give an error. A table must be made first with CREATE TABLE before you can use it.');
      sum.push(sec === 'ok' ? 'The values of the second INSERT had a shape that fits the columns, but it was rejected because there was no table to put them in.' + (col === 'age' ? '' : ' The name in SELECT name is also a correct column name, but you cannot read it without a table.')
        : 'The values of the second INSERT had a shape ' + (sec === 'text' ? 'whose types do not match' : 'whose count does not match') + ', but the error was not that one but that there was no table. Whether the values fit the columns can be checked only when there is a table.');
      if (col === 'age') sum[1] += ' SELECT age also gave an error that there was no table, not an error that there was no column.';
    } else {
      if (sec === 'ok' && col === 'name') {
        sum.push('A table is a grid made of columns (vertical slots) and rows (horizontal lines). CREATE TABLE decides the names and types of the columns (id is an integer, name is text), INSERT puts in rows one by one, and SELECT reads the values of chosen columns from the rows.');
        sum.push('We did not write code that checks, for each INSERT, whether the number and the types of the values match the columns. The database did it by itself. Both INSERT statements matched, so there were 2 rows, and SELECT name read only the name values of the two rows.');
      } else if (sec === 'ok') {
        sum.push('SELECT age is an error. The only columns of the member table are id and name, which CREATE TABLE decided, and there is no column named age.');
        sum.push('Both INSERT statements went in, so there are still 2 rows. Only the reading failed, and the contents of the table did not change. You cannot read a column that the table does not have.');
      } else {
        sum.push(sec === 'text' ? "The database rejects an INSERT that puts the text 'two' in the id column. The type of the id column is INT (integer), so it cannot hold text."
          : sec === 'more' ? 'The database rejects an INSERT that puts three values into two columns. Each value must go into one column, and there is no column for the third value.'
            : 'The database rejects an INSERT that puts only one value into two columns. The number of values must be the same as the number of columns, and it did not accept it by leaving the missing column empty.');
        sum.push(col === 'name' ? 'The rejected INSERT made no row, so only the Alice row is left in the table, and SELECT name also read the value of that one row. The number and the types of the columns are decided in CREATE TABLE, and rows must match them.'
          : 'The rejected INSERT made no row, so only the Alice row is left in the table. The SELECT age in this setting gives a separate error because the table has no column named age.');
      }
    }
    var cnt = !cr ? 'No table' : st.rows.length + '';
    return { events: ev, summary: sum, row: [res2, cnt, selText] };
  },
  render: function (v, sim, t, H, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : null;
    if (!s) { H.text(v, 'Click Run to go on one statement at a time from the first statement.'); return; }
    H.table(v, ['id', 'name'], s.made ? (s.rows.length ? s.rows.map(function (r) { var k = r.hot ? 'hot' : ''; return { cls: '', cells: [{ v: r.id, cls: s.hotCol === 'name' ? '' : k }, { v: r.name, cls: k }] }; }) : [{ cls: 'gone', cells: ['No rows', ''] }]) : [{ cls: 'gone', cells: ['No table', ''] }], 'member table');
    H.table(v, ['Statement run', 'Result'], s.log.map(function (r) { return { cls: '', cells: [r[0], { v: r[1], cls: r[2] }] }; }), 'Statements and results');
    H.counters(v, [[s.made ? s.rows.length : 'No table', 'Rows in the table'], [s.rd === null ? '-' : s.rd === 'err' ? 'Error' : s.rd, 'Rows read by SELECT']]);
  },
  // Diagram: on the left the incoming statement, in the middle the DB check, on the right the member table (column names and types on top, rows below). Only a statement that passes the check reaches the rows, and if it is rejected, the arrow breaks at the check.
  draw: function (P, sim, shown) {
    var c = sim.c, last = shown[shown.length - 1], s = last ? last.snap : null;
    P.size(680, 292);
    P.text('lb', 79, 62, 'Incoming SQL', { cls: 'mut', anchor: 'middle' });
    P.box('in', 14, 73, 130, 70, { cls: !s || !s.inc ? 'ghost' : s.flow === 'block' ? 'wait' : 'hot', title: s && s.inc ? s.inc.title : 'Waiting', sub: s && s.inc ? s.inc.sub : [' '] });
    P.box('chk', 194, 60, 110, 96, { cls: s ? s.chk.cls : 'ghost', title: s ? s.chk.title : 'DB', sub: s ? s.chk.sub : [' '] });
    P.region('tb', 354, 16, 312, 208, s && !s.made ? 'member table: none' : 'member table');
    if (s && s.made) {
      P.box('h0', 364, 46, 88, 44, { cls: 'plain', title: 'id', sub: 'INT' });
      P.box('h1', 458, 46, 198, 44, { cls: s.hotCol === 'name' ? 'hot' : 'plain', title: 'name', sub: 'VARCHAR(20)' });
      if (s.rows.length === 0) P.text('emp', 510, 128, 'No rows', { cls: 'mut', anchor: 'middle' });
    } else if (s) {
      P.text('em1', 510, 112, 'There is no CREATE TABLE,', { cls: 'mut', anchor: 'middle' });
      P.text('em2', 510, 134, 'so no member table', { cls: 'mut', anchor: 'middle' });
    }
    if (s && s.flow) P.arrow('rq', 'in:r', 'chk:l', { cls: s.flow === 'block' ? 'bad' : 'hot' });
    (s ? s.rows : []).forEach(function (r, i) {
      P.box('c' + i + '_0', 364, 98 + i * 44, 88, 38, { cls: r.hot && s.hotCol !== 'name' ? 'hot' : 'wait', title: r.id });
      P.box('c' + i + '_1', 458, 98 + i * 44, 198, 38, { cls: r.hot ? 'hot' : 'wait', title: r.name });
      if (s.flow === 'pass' && s.to.indexOf(i) >= 0) P.arrow('ar' + i, 'chk:r', 'c' + i + '_0:l', { cls: 'good' });
    });
    if (s && s.flow === 'read') P.arrow('rd', 'chk:r', 'h0:l', { cls: 'hot' });
    if (s && s.flow === 'block') { P.arrow('stop', 'chk:r', [334, 108], { cls: 'bad' }); P.text('x', 344, 113, '×', { cls: 'bad', anchor: 'middle', bold: true }); }
    P.box('n1', 14, 242, 322, 36, { cls: s && s.made && s.rows.length ? 'wait' : 'ghost', title: 'Rows in the table', right: !s ? '0' : s.made ? s.rows.length + '' : 'No table' });
    P.box('n2', 344, 242, 322, 36, { cls: s && typeof s.rd === 'number' ? 'good' : s && s.rd === 'err' ? 'bad' : 'ghost', title: 'Rows read by SELECT', right: !s || s.rd === null ? '-' : s.rd === 'err' ? 'Error' : s.rd + '' });
    if (s && s.miss) P.note('The member table has only the columns id and name. There is no column named age, so it cannot be read.');
  },
  assume: 'This was checked against real execution on H2 2.4.240 (in-memory database, JDBC). All 16 combinations were checked: the whole SQL on the screen (including the comment lines) was run exactly as it is, one statement at a time, and even if one statement failed, the next statement kept running. What was checked against the run is whether the second INSERT went in or was rejected and the kind of error (H2 SQLSTATE 22018 the value cannot be converted to the type, 21S02 the number of values differs from the number of columns, 42S04 no table, 42S22 no column), the number of rows after the two INSERT statements, and the values the last SELECT read. That the number of rows right after CREATE TABLE is 0 and that the database remembers the names and types of the columns (id integer, name text of 20 characters) was checked by reading the metadata. H2 rejected an INSERT that has two columns but only one value, and this is behavior observed on H2, not something defined by the documentation. In the tutorial of the MySQL 8.4 documentation, Creating a Table (CREATE TABLE decides the names and types of the columns, and VARCHAR is text of variable length), Loading Data into a Table (the values of INSERT go in in the order in which the columns were written in CREATE TABLE, and NULL can be put in directly), Selecting All Data and Selecting Particular Columns (SELECT * gives all rows and columns, and writing column names gives only those columns), and the opening of Chapter 13 Data Types (the types are of five kinds: numeric, date and time, string, spatial, and JSON) were opened directly and checked. But the rule that an INSERT whose types or count do not match is rejected is not something these documents define, and it was checked by running H2. A check against execution on MySQL was not done. The text of the error messages, and how strictly a value that does not match is rejected, may differ by database and settings. The screen shows only the kind of error, and the error numbers and the original text of the messages exist only in the output of the checking program. This lab covers only the two types INT and VARCHAR, and it does not cover constraints such as a primary key, multiple tables, or WHERE conditions.',
});

Lab.register({
  id: 'pk_basic', nav: 'Primary keys', cat: 'Fundamentals', mode: 'step', basic: true, deep: ['constraints'],
  title: 'What is a primary key, and what changes without one?',
  intro: 'A primary key is what you get when you write PRIMARY KEY on one column while creating a table. It is a promise to the database that the value in that column must be different in every row and cannot be empty (NULL), so the database rejects any INSERT that breaks the promise. That is why "the row with id 1" always points to exactly one row. In this lab you remove PRIMARY KEY, or change the id of the second row you insert, and run the same SQL each time. You see whether the database accepts the INSERT and how many rows the UPDATE changes.',
  terms: ['Primary key, unique key, foreign key', 'Constraint', 'NULL and three-valued logic', 'Rows and columns'],
  controls: [
    { id: 'pk', label: 'Write PRIMARY KEY on the id column', type: 'check', value: true },
    { id: 'second', label: 'The id in the second INSERT', type: 'select', value: 'same', options: [['same', 'Second row has id 1 (same as the first row)'], ['diff', 'Second row has id 2'], ['null', 'Second row has an empty id (NULL)']] },
  ],
  // q is the question shown on the question-style screen. t and d are the name and the description used in the text-only reading
  presets: [
    { t: 'Default settings', q: 'What does a primary key look like, and what happens if you insert the same id a second time?', d: 'A table with PRIMARY KEY. The database rejects the INSERT that uses the same id again.', v: { pk: true, second: 'same' } },
    { t: 'Removing PRIMARY KEY', q: 'What if you remove PRIMARY KEY?', d: 'Two rows with the same id get in, and the UPDATE changes both of them.', v: { pk: false, second: 'same' } },
    { t: 'Changing the id of the second row to 2', q: 'What if you change the id of the second row to 2?', d: 'When the ids are different, both rows get in even with PRIMARY KEY.', v: { pk: true, second: 'diff' } },
    { t: 'Leaving the id empty', q: 'What if you insert the second row with an empty id (NULL)?', d: 'The database also rejects an INSERT with an empty id. The reason is different from the same-id case.', v: { pk: true, second: 'null' } },
    { t: 'Removing PRIMARY KEY and leaving the id empty', q: 'What if you remove PRIMARY KEY and insert with an empty id?', d: 'A row with an empty id gets in, and you cannot point to that row by id.', v: { pk: false, second: 'null' } },
  ],
  // The code on the screen and the check program (verify/spring/src/PkBasicProbe.java) run the same text. The check script compares it character by character.
  idOf: { same: '1', diff: '2', 'null': 'NULL' },
  code: function (c) {
    var l = ['CREATE TABLE member ('];
    if (c.pk) l.push('    -- Primary key: the value in this column must differ in every row and cannot be empty');
    l.push('    id   INT' + (c.pk ? ' PRIMARY KEY' : '') + ',', '    name VARCHAR(20)', ');', '',
      "INSERT INTO member VALUES (1, 'Alice');",
      "INSERT INTO member VALUES (" + this.idOf[c.second] + ", 'Bob');", '',
      "UPDATE member SET name = 'Carol' WHERE id = 1;",
      'SELECT * FROM member ORDER BY id;');
    return l.join('\n');
  },
  label: function (c) { return (c.pk ? 'With PRIMARY KEY' : 'No PRIMARY KEY') + ' · id of the second row: ' + { same: '1', diff: '2', 'null': 'NULL' }[c.second]; },
  columns: ['Second INSERT', 'Rows in the table', 'Rows changed by UPDATE', 'Rows left at the end'],
  simulate: function (c) {
    var pk = !!c.pk, sec = c.second, id2 = this.idOf[sec], ev = [], sum = [];
    var verdict = !pk ? 'ok' : sec === 'same' ? 'dup' : sec === 'null' ? 'empty' : 'ok';
    var q2 = "INSERT INTO member VALUES (" + id2 + ", 'Bob')";
    // State: the incoming statement (inc), the check box of the database (chk), the arrow (flow: in means the statement reaches the database, pass means it reaches a row, block means it is cut at the check), and the rows of the table
    var st = { rows: [], log: [], upd: null, inc: null, chk: { cls: 'ghost', sub: [' '] }, flow: '', to: [] };
    function push(s, k) { ev.push({ s: s, k: k, snap: JSON.parse(JSON.stringify(st)) }); }
    function cool() { st.rows.forEach(function (r) { r.hot = false; }); st.to = []; }

    // 1. CREATE TABLE
    st.inc = { title: 'CREATE TABLE', sub: ['member (id, name)'] };
    st.chk = pk ? { cls: 'plain', sub: ['Is the id already used?', 'Is it empty?'] } : { cls: 'ghost', sub: ['No promise to check'] };
    st.log.push(['CREATE TABLE member', 'Table created', '']);
    push('CREATE TABLE: The database creates a table named member. A table is made of columns (id and name) and rows (one line of information about one person), and right now it has no rows. ' + (pk ? 'PRIMARY KEY is written on the id column, so the database remembers a promise: "the value in this column must be different in every row and cannot be empty."' : 'Only the type INT (integer) is written on the id column, so the database has no promise to remember.'), '');

    // 2. First INSERT
    cool();
    st.inc = { title: 'INSERT', sub: ["(1, Alice)"] };
    st.rows.push({ id: '1', name: 'Alice', hot: true, bad: false });
    st.chk = pk ? { cls: 'good', sub: ['Is the id already used?', 'Is it empty?'] } : { cls: 'ghost', sub: ['No promise to check'] };
    st.flow = 'pass'; st.to = [0];
    st.log.push(["INSERT (1, Alice)", 'Inserted', 'good']);
    push("INSERT INTO member VALUES (1, 'Alice'): " + (pk ? 'Before it adds the row, the database checks the promise. The table is empty, so no row has the same id, and the id is not empty. The row passes, and the Alice row is inserted.' : 'The database adds the row with id 1 and the name Alice to the table. There is no promise to check, so it goes in as it is.'), '');

    // 3. Second INSERT
    cool();
    st.inc = { title: 'INSERT', sub: ["(" + id2 + ", Bob)"] };
    var res2 = verdict === 'ok' ? 'Inserted' : verdict === 'dup' ? 'Rejected: the id already exists' : 'Rejected: the id cannot be empty';
    if (pk) {
      st.chk = { cls: 'hot now', sub: ['Is the id already used?', 'Is it empty?'] }; st.flow = 'in';
      push(q2 + ': This tries to insert the second row. Before it adds the row, the database checks the promise of the primary key. ' + (sec === 'null' ? 'It looks at whether the id is non-empty and whether a row with the same id already exists.' : 'It looks at whether a row with id ' + id2 + ' already exists in the table and whether the id is non-empty.') + ' We did not write the code that does this check. The database does it by itself every time an INSERT arrives.', '');
      if (verdict === 'ok') {
        st.rows.push({ id: id2, name: 'Bob', hot: true, bad: false }); st.chk = { cls: 'good', sub: ['Is the id already used?', 'Is it empty?'] }; st.flow = 'pass'; st.to = [1];
        st.log.push([q2.replace('INSERT INTO member VALUES ', 'INSERT '), res2, 'good']);
        push('Result of the check: No row with id 2 exists yet, and the id is not empty, so the promise is kept and the row passes. The Bob row is inserted, and the table now has 2 rows.', 'good');
      } else {
        st.chk = { cls: 'bad', sub: ['Is the id already used?', 'Is it empty?'] }; st.flow = 'block';
        st.log.push([q2.replace('INSERT INTO member VALUES ', 'INSERT '), res2, 'bad']);
        push(verdict === 'dup'
          ? 'Result of the check: The table already has a row with id 1 (Alice). That breaks the promise, so the database rejects this INSERT and returns an error of the kind "this value already exists." The Bob row was not added to the table, and the table is exactly as it was before the INSERT.'
          : 'Result of the check: The id is empty (NULL). A primary key column cannot be empty, so the database rejects this INSERT and returns an error of the kind "this column cannot be empty." This is a different kind of error from the same-id case. The Bob row was not added, and the table is exactly as it was before the INSERT.', 'good');
      }
    } else {
      st.rows.push({ id: id2, name: 'Bob', hot: true, bad: false }); st.flow = 'pass'; st.to = [1];
      st.log.push([q2.replace('INSERT INTO member VALUES ', 'INSERT '), res2, 'good']);
      push(q2 + ': The database has no promise to check, so it adds the Bob row as it is. ' + (sec === 'same' ? 'There are now two rows with id 1 (Alice and Bob).' : sec === 'diff' ? 'The table now has two rows with different ids.' : 'A row with an empty (NULL) id was inserted.'), '');
    }
    var count = st.rows.length;

    // 4. UPDATE
    cool();
    var hit = []; st.rows.forEach(function (r, i) { if (r.id === '1') hit.push(i); });
    hit.forEach(function (i) { st.rows[i].name = 'Carol'; st.rows[i].hot = true; });
    st.to = hit.slice(); st.flow = 'pass'; st.upd = hit.length;
    st.inc = { title: 'UPDATE', sub: ['name = Carol', 'WHERE id = 1'] };
    st.chk = { cls: 'hot now', sub: ['Finds every row', 'where id is 1'] };
    st.log.push(['UPDATE ... WHERE id = 1', 'Rows changed: ' + hit.length, hit.length > 1 ? 'bad' : 'good']);
    push("UPDATE member SET name = 'Carol' WHERE id = 1: What we want to do is change the name of the one person whose id is 1. The database finds every row that matches the WHERE condition and changes it. " + (hit.length === 1 ? 'There is only one row with id 1, so the name of that row changes to Carol. Rows changed: 1.' + (count > 1 ? ' The Bob row does not match the condition, so it stays as it is.' : '') : 'There are two rows with id 1, Alice and Bob, so the database changes both rows. Rows changed: 2. We meant to change only one person, but two rows with the same id cannot be told apart by id, so both changed.'), hit.length > 1 ? 'bad' : 'good');

    // 5. SELECT
    cool();
    var sorted = st.rows.map(function (r, i) { return { r: r, i: i }; }).sort(function (a, b) { var x = a.r.id === 'NULL' ? -1 : +a.r.id, y = b.r.id === 'NULL' ? -1 : +b.r.id; return x - y || a.i - b.i; }).map(function (o) { return o.r; });
    var finalText = sorted.map(function (r) { return '(' + r.id + ', ' + r.name + ')'; }).join(', ');
    var ids = {}; st.rows.forEach(function (r) { ids[r.id] = (ids[r.id] || 0) + 1; });
    var anyBad = false;
    st.rows.forEach(function (r) { r.bad = r.id === 'NULL' || ids[r.id] > 1; if (r.bad) anyBad = true; });
    st.inc = { title: 'SELECT', sub: ['ORDER BY id'] };
    st.chk = { cls: 'plain', sub: ['Reads the remaining', 'rows in id order'] }; st.flow = 'in';
    st.log.push(['SELECT * ... ORDER BY id', finalText, anyBad ? 'bad' : 'good']);
    var after = pk
      ? (sec === 'diff' ? 'Ids 1 and 2 each point to exactly one row. The UPDATE changed only the row with id 1, and the Bob row is as it was.' : 'What is left is one row with id 1. The Bob row was rejected and not added, and the name in the Alice row was changed to Carol. "The row with id 1" is always this one row.')
      : (sec === 'same' ? 'There are two rows with id 1 and the name Carol. The name Bob is gone, and you cannot tell the two rows apart by id.' : sec === 'diff' ? 'The result is the same as with PRIMARY KEY. But the ids differ only because we inserted different ones, not because the database enforced it. If we had inserted the same id, the database would have accepted it.' : 'The row with an empty id (Bob) comes first. In ORDER BY id, empty values come first. This row has no id, so it did not match WHERE id = 1, and the UPDATE did not touch it.');
    push('SELECT * FROM member ORDER BY id: This reads the rows left in the table in order of id. The result is ' + finalText + '. ' + after, anyBad ? 'bad' : 'good');

    // 6. (No PRIMARY KEY, empty id) A row with an empty id cannot even be found. This is the result of a statement that is not in this code, run separately
    if (!pk && sec === 'null') {
      cool();
      st.inc = { title: 'SELECT', sub: ['COUNT(*) WHERE', 'id = NULL'] };
      st.chk = { cls: 'plain', sub: ['The result is 0'] }; st.flow = 'in';
      push('As a side note, we run a statement that is not in this code, separately. SELECT COUNT(*) FROM member WHERE id = NULL returns 0. NULL means "no value," so you cannot find it by comparing with =. To pick a row whose id is empty, you have to write WHERE id IS NULL separately, and that condition picks every row whose id is empty. The database does not stop you from inserting another row with an empty id, so even this way you cannot point to just one row.', 'bad');
    }

    // Summary: the first line is the answer to the question
    var S = {
      'true|same': ['A primary key is what you get when you write PRIMARY KEY on one column while creating a table. It is a promise to the database that the value in that column must be different in every row and cannot be empty, and the database rejected the INSERT that used the same id again.', 'We did not write the code that checks this. The database checked it by itself at every INSERT. So "the row with id 1" is always exactly one row, and an UPDATE by that id changes only one person.'],
      'false|same': ['Without PRIMARY KEY, the database does not reject the second INSERT with the same id. There are now two rows with id 1, and the UPDATE with WHERE id = 1 changed both of them.', 'Rows with the same id cannot be told apart by id, so even if you mean to change one person, you cannot pick just one row by id. If you do not write the promise down, the database does not keep it.'],
      'true|diff': ['If you change the id of the second row to 2, the INSERT goes in even with PRIMARY KEY. A primary key is a promise that ids differ. It does not block every INSERT.', 'The two rows have different ids, so there was only one row with id 1, and the UPDATE changed only that one row.'],
      'false|diff': ['Even without PRIMARY KEY, if you insert different ids, the result is the same as with it.', 'The difference is that the database did not keep the ids different. We just happened to insert different ones. If you insert the same id, a table without PRIMARY KEY accepts it as it is.'],
      'true|null': ['The INSERT with an empty id (NULL) was also rejected by the database. A primary key column cannot be empty, and the error was a different kind from the same-id case.', 'A primary key blocks both an id that repeats and an id that is empty. So every row left in the table has an id, and you can point to one row by id.'],
      'false|null': ['Without PRIMARY KEY, a row with an empty id gets in too. You cannot find this row with WHERE id = 1 or with id = NULL.', 'A row whose id is empty can be picked only by writing IS NULL separately, and the database does not stop several such rows from getting in, so you cannot point to just one row by id.']
    };
    S[pk + '|' + sec].forEach(function (x) { sum.push(x); });
    return { events: ev, summary: sum, row: [res2, count + '', hit.length + '', finalText] };
  },
  render: function (v, sim, t, H, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : null;
    if (!s) { H.text(v, 'Click Run to start from CREATE TABLE and go one statement at a time.'); return; }
    H.table(v, ['id', 'name'], s.rows.length ? s.rows.map(function (r) { var k = r.bad ? 'bad' : r.hot ? 'hot' : ''; return { cls: '', cells: [{ v: r.id, cls: k }, { v: r.name, cls: k }] }; }) : [{ cls: 'gone', cells: ['No rows', ''] }], 'member table');
    H.table(v, ['Statement run', 'Result'], s.log.map(function (r) { return { cls: '', cells: [r[0], { v: r[1], cls: r[2] }] }; }), 'Statements and results');
    H.counters(v, [[s.rows.length, 'Rows in the table'], [s.upd === null ? '-' : s.upd, 'Rows changed by UPDATE']]);
  },
  // Diagram: the incoming statement on the left, the check by the database in the middle, and the rows of the member table on the right. A statement has to pass the check to reach a row, and when it is rejected the arrow is cut at the check.
  draw: function (P, sim, shown) {
    var c = sim.c, last = shown[shown.length - 1], s = last ? last.snap : null;
    P.size(680, 292);
    P.text('lb', 89, 62, 'Incoming SQL statement', { cls: 'mut', anchor: 'middle' });
    P.box('in', 14, 73, 150, 70, { cls: !s || !s.inc ? 'ghost' : s.flow === 'block' ? 'wait' : 'hot', title: s && s.inc ? s.inc.title : 'Waiting', sub: s && s.inc ? s.inc.sub : [' '] });
    P.box('chk', 214, 60, 200, 96, { cls: s ? s.chk.cls : 'ghost', title: 'Database check', sub: s ? s.chk.sub : [' '] });
    P.region('tb', 464, 16, 202, 208, 'member table');
    if (s && s.flow) P.arrow('rq', 'in:r', 'chk:l', { cls: s.flow === 'block' ? 'bad' : 'hot' });
    if (s && s.rows.length === 0) P.text('emp', 565, 126, 'No rows', { cls: 'mut', anchor: 'middle' });
    (s ? s.rows : []).forEach(function (r, i) {
      P.box('r' + i, 476, 50 + i * 56, 178, 40, { cls: r.bad ? 'bad' : r.hot ? 'hot' : 'wait', title: 'id ' + r.id + ' · ' + r.name });
      if (s.flow === 'pass' && s.to.indexOf(i) >= 0) P.arrow('ar' + i, 'chk:r', 'r' + i + ':l', { cls: 'good' });
    });
    if (s && s.flow === 'block') { P.arrow('stop', 'chk:r', [442, 108], { cls: 'bad' }); P.text('x', 452, 113, '×', { cls: 'bad', anchor: 'middle', bold: true }); }
    P.box('n1', 14, 242, 322, 36, { cls: s && s.rows.length ? 'wait' : 'ghost', title: 'Rows in the table', right: (s ? s.rows.length : 0) + '' });
    P.box('n2', 344, 242, 322, 36, { cls: s && s.upd !== null ? (s.upd > 1 ? 'bad' : 'good') : 'ghost', title: 'Rows changed by UPDATE', right: s && s.upd !== null ? s.upd + '' : '-' });
    if (s && s.rows.some(function (r) { return r.bad; })) P.note('A red box is a row whose id is repeated or empty, so id cannot point to just one row.');
  },
  assume: 'The model was checked against real execution on H2 2.4.240 (an in-memory database, through JDBC). For all 6 combinations, the whole SQL on the screen (including the comment line) was run character by character, one statement at a time, and the following were checked against the model: whether the second INSERT went in or was rejected and the kind of error (H2 SQLSTATE 23505 for a duplicate and 23502 for NULL not allowed), the number of rows after the two INSERTs, the number of changed rows that the UPDATE returned, and the result of the last SELECT. The values in the last step that looks for the row with the empty id (id = NULL gives 0 rows, and id IS NULL gives every row with an empty id) were checked by running a statement that is not in the code on the screen, separately on H2. The rule that a primary key accepts neither a repeated value nor NULL is the same in MySQL, and I opened the MySQL 8.4 documentation directly to check the CREATE TABLE statement (a PRIMARY KEY is a unique index whose key columns are all NOT NULL), section 1.7.3.1 PRIMARY KEY and UNIQUE Index Constraints (an INSERT or UPDATE that violates a primary key or unique key is an error), and section 5.3.4.6 Working with NULL Values (NULL cannot be compared with =, you use IS NULL, and in ascending ORDER BY, NULL comes first). The error numbers and the wording of the messages differ from database to database, so the screen shows only the kind of error. The check by execution on MySQL has not been done yet. So the rule above rests on the documentation and the H2 execution agreeing, and it was not verified by execution whether MySQL gives the same result for the same SQL. That a table without PRIMARY KEY accepts the same id or NULL is behavior observed on H2. This lab covers PRIMARY KEY only, and it does not cover unique keys, foreign keys, or automatic increment (AUTO_INCREMENT).',
});

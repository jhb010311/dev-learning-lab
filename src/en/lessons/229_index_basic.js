Lab.register({
  id: 'index_basic', nav: 'Indexes', cat: 'Fundamentals', mode: 'step', basic: true, deep: ['index'],
  title: 'What is an index, and what changes when there is none?',
  intro: 'An index is a list that keeps the values of a column in order and points to the rows that hold each value. The database builds it separately from the table, and it works like the index at the back of a book. CREATE INDEX idx_name ON member(name) is the statement that builds an index on the name column. Without an index, the database has to read the rows of the table from the first to the last to find the rows that match a condition. With an index, it looks up the value in the index and reads only the rows it needs. In this lab, you remove CREATE INDEX or change the column you search by, run the same SELECT, and see how the number of rows the database reads changes even though the rows it finds stay the same. This lab does not cover how an index organizes its values or what it costs to build one.',
  terms: ['Index', 'CREATE INDEX', 'Full table scan', 'Query execution plan (EXPLAIN)'],
  controls: [
    { id: 'idx', label: 'Run CREATE INDEX idx_name ON member(name)', type: 'check', value: true },
    { id: 'cond', label: 'Search condition', type: 'select', value: 'name', options: [['name', "WHERE name = 'user777'"], ['city', "WHERE city = 'Busan' (a column with no index)"], ['id', 'WHERE id = 777 (the primary key)']] },
  ],
  // q is the question shown on the question-style screen. t and d are the name and the description used in the text-only reading
  presets: [
    { t: 'Default settings', q: 'What does an index look like, and how does the database find a row when there is one?', d: 'A table with an index on name. The database looks up user777 in the index and reads only that 1 row.', v: { idx: true, cond: 'name' } },
    { t: 'Removing CREATE INDEX', q: 'What if you remove CREATE INDEX?', d: 'It finds the same 1 row, but the database reads all 1000 rows of the table.', v: { idx: false, cond: 'name' } },
    { t: 'Searching by a column with no index', q: 'What if you search by a column with no index (city)?', d: 'idx_name is an index on the name values, so it is not used when you search by city, and the database reads all 1000 rows.', v: { idx: true, cond: 'city' } },
    { t: 'Searching by the primary key', q: 'What if you search by the primary key (id) without CREATE INDEX?', d: 'You did not use CREATE INDEX, but the primary key already has an index, so the database reads only 1 row.', v: { idx: false, cond: 'id' } },
  ],
  // The code on the screen and the verification program (verify/spring/src/IndexBasicProbe.java) ran the same text. The verification script compares them character by character.
  // At the line "-- Insert 1000 members", the verification program inserts 1000 members (the INSERT statements are omitted on the screen).
  wh: { name: "WHERE name = 'user777'", city: "WHERE city = 'Busan'", id: 'WHERE id = 777' },
  how: { index: 'Looked up in the name index (idx_name)', pk: 'Looked up in the primary key index', full: 'Read the rows of the table from first to last' },
  code: function (c) {
    var l = ['CREATE TABLE member (', '    id   INT PRIMARY KEY,', '    name VARCHAR(20),', '    city VARCHAR(20)', ');',
      '-- Insert 1000 members (user1 to user1000. The INSERT statements are omitted on the screen)', ''];
    if (c.idx) l.push('-- Index: build an index so that rows can be found quickly by the name value', 'CREATE INDEX idx_name ON member(name);', '');
    l.push('SELECT * FROM member ' + this.wh[c.cond] + ';');
    return l.join('\n');
  },
  label: function (c) { return (c.idx ? 'CREATE INDEX present' : 'CREATE INDEX absent') + ' · ' + this.wh[c.cond]; },
  columns: ['Rows found', 'How the database found the rows', 'Rows the database read'],
  simulate: function (c) {
    var idx = !!c.idx, cond = c.cond, ev = [], sum = [];
    var how = cond === 'id' ? 'pk' : (cond === 'name' && idx) ? 'index' : 'full';
    var found = cond === 'city' ? 250 : 1, read = how === 'full' ? 1000 : 1;
    var q = 'SELECT * FROM member ' + this.wh[cond];
    // State: the index boxes (id index, name index), the number of rows in the table, what the database is doing now (mode), the number of rows read, the number of rows found, the index that is new in this step
    var st = { ixId: false, ixName: false, fresh: '', rows: 0, mode: 'idle', read: null, found: null };
    function push(s, k) { ev.push({ s: s, k: k, snap: JSON.parse(JSON.stringify(st)) }); }

    // 1. CREATE TABLE
    st.ixId = true; st.fresh = 'id';
    push('CREATE TABLE: The database creates a table named member. It has three columns, id, name, and city, and for now it has no rows. PRIMARY KEY is written on the id column, so the database also builds an index for finding rows by id. An index is a list that keeps the values of a column in order and points to the rows that hold each value, and it works like the index at the back of a book. This index exists even if you do not use CREATE INDEX.', '');

    // 2. 1000 members
    st.rows = 1000; st.fresh = '';
    push('Inserting 1000 members (1000 INSERT statements that the screen omits): The database inserts ids 1 to 1000, names user1 to user1000, and cities in turn from Seoul, Busan, Daegu, and Gwangju. The table now has 1000 rows, and each city has 250 rows.', '');

    // 3. CREATE INDEX
    if (idx) {
      st.ixName = true; st.fresh = 'name';
      push('CREATE INDEX idx_name ON member(name): The database builds an index of the values of the name column in order, separately from the table. The index holds the name values (…, user776, user777, user778, …) and information that points to the row that has each value. The table still has 1000 rows. Building an index does not change the rows.', '');
    }

    // 4. SELECT: check whether there is an index it can use
    st.fresh = ''; st.mode = 'look';
    var detail = how === 'index' ? 'The name column has the index idx_name that CREATE INDEX built, so the database decides to search with this index.'
      : how === 'pk' ? 'The id column has the index that PRIMARY KEY created, so the database decides to search with this index.' + (idx ? ' The name index idx_name is of no use for searching by id.' : ' This index exists even though you did not use CREATE INDEX.')
      : cond === 'name' ? 'There is no index for the name column. The only index in this table is the one on the id column. So the database decides to read the rows of the table directly to find it.'
      : 'There is no index for the city column. ' + (idx ? 'The name index idx_name keeps the name values in order, so it cannot be used for searching by city.' : 'The only index in this table is the one on the id column.') + ' So the database decides to read the rows of the table directly to find it.';
    st.look = how;
    push(q + ': The database first checks whether there is an index for the ' + cond + ' column used in the condition. ' + detail, '');

    // 5. Search
    st.read = read;
    if (how === 'index') {
      st.mode = 'target';
      push('The database finds user777 in the name index and follows the information attached to that value straight to the row with id 777 in the table. It did not read the other 999 rows of the table. The database read 1 row.', 'good');
    } else if (how === 'pk') {
      st.mode = 'target';
      push('The database finds 777 in the id index and goes straight to the row with id 777 in the table. ' + (idx ? '' : 'You did not use CREATE INDEX, but the index that PRIMARY KEY created does the same job. ') + 'It did not read the other 999 rows of the table. The database read 1 row.', 'good');
    } else {
      st.mode = 'scan';
      push('The database looks at the rows of the member table one by one, from the first row to the last, to check ' + (cond === 'name' ? "whether name is 'user777'" : "whether city is 'Busan'") + '. ' + (cond === 'name' ? 'Even after it meets the user777 row (id 777), it cannot know whether another row has the same name, so it reads to the last row. ' : 'Many rows are in Busan, so it has to read to the last row to find them all. ') + 'The database read 1000 rows.' + (cond === 'name' ? ' It read every row of the table although only one row matches.' : ''), '');
    }

    // 6. Result
    st.found = found; st.mode = 'found';
    var tail = how === 'index' ? ' If you run the same SELECT on a table without CREATE INDEX, it finds exactly the same row. The difference is that the database then reads 1000 rows.'
      : cond === 'name' ? ' If you run the same SELECT on a table with CREATE INDEX idx_name, it finds exactly the same row. The difference is that the database then reads 1 row.'
      : cond === 'city' ? ' With or without CREATE INDEX, the database reads the same 1000 rows.'
      : ' With or without CREATE INDEX, the database reads the same 1 row.';
    push('Result of the SELECT: ' + (cond === 'city' ? "It returns the 250 rows where city is 'Busan' (ids 2, 6, 10, …). Of the 1000 rows the database read, 250 matched the condition." : 'It returns 1 row, the user777 row with id 777.') + tail, how === 'full' ? '' : 'good');

    // Summary: the first line is the answer to the question
    var S = {
      'true|name': ['An index is a list, built separately from the table, that keeps the values of a column in order and points to the rows that hold each value. Because the name index exists, the database went straight to the user777 row and read only 1 of the 1000 rows.', 'The rows found are exactly the same as without the index. What an index changes is not the result but the amount the database reads.'],
      'false|name': ['If you remove CREATE INDEX, there is no index on the name column, so the database read all 1000 rows from the first to the last and only then found the user777 row.', 'The row found is the same 1 row as with the index. Without an index, the result is the same and only the amount read grows. When the table gets more rows, this amount grows with it.'],
      'true|city': ['An index is useful only for the column it was built on. idx_name is an index on the name values, so it was not used when searching by city, and the database read all 1000 rows to find the 250 rows in Busan.', 'Even in a table with CREATE INDEX, searching by a column with no index reads the same amount as having no index at all. To search quickly by city, the city column needs its own index.'],
      'false|city': ['This table has no index on the city column, so the database read all 1000 rows to find the 250 rows in Busan.', 'When you search by a column with no index, the amount the database reads is the same whether or not the name index exists.'],
      'true|id': ['The primary key (id) already has an index even if you do not build one. So the database found 777 in the id index and read only 1 row, and the name index idx_name was not used.', 'Each column has its own index. The database decides which index to use by looking at the column in the condition.'],
      'false|id': ['You did not write a single CREATE INDEX, yet searching by id read only 1 row. This is because the database builds an index on a column with PRIMARY KEY.', 'If you need an index on a column that is not the primary key, you have to build it yourself with CREATE INDEX.']
    };
    S[idx + '|' + cond].forEach(function (x) { sum.push(x); });
    return { events: ev, summary: sum, how: how, row: [String(found), this.how[how], String(read)] };
  },
  render: function (v, sim, t, H, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : null;
    if (!s) { H.text(v, 'Click Run to go through the statements one at a time, starting with CREATE TABLE.'); return; }
    var ix = [];
    if (s.ixId) ix.push({ cls: s.fresh === 'id' ? 'hot' : '', cells: ['id index', 'Created because PRIMARY KEY is written'] });
    if (s.ixName) ix.push({ cls: s.fresh === 'name' ? 'hot' : '', cells: ['name index (idx_name)', 'Built with CREATE INDEX'] });
    H.table(v, ['Index', 'How it was created'], ix, 'Indexes of the member table');
    if (s.found !== null) H.table(v, ['Rows found', 'How the database found the rows', 'Rows the database read'], [{ cls: '', cells: [String(s.found), sim.how === 'full' ? { v: sim.row[1], cls: 'hot' } : { v: sim.row[1], cls: 'good' }, String(s.read)] }], 'Result of the SELECT');
    H.counters(v, [[s.rows, 'Rows in the table'], [s.read === null ? '-' : s.read, 'Rows the database read'], [s.found === null ? '-' : s.found, 'Rows found']]);
  },
  // Diagram: index boxes on the left (the name index only when it was built) and a few rows of the member table on the right. When it searches by an index, an arrow goes from the index to one row; when it reads everything, every row of the table is colored yellow. Below, it counts the rows the database read.
  draw: function (P, sim, shown) {
    var c = sim.c, last = shown[shown.length - 1], s = last ? last.snap : null;
    P.size(680, 292);
    P.region('ix', 14, 16, 250, 208, 'Indexes');
    P.region('tb', 414, 16, 252, 208, 'member table');
    var hasName = s && s.ixName, tgt = s && s.mode === 'target';
    if (hasName) P.box('ixn', 24, 44, 230, 76, { cls: s.fresh === 'name' ? 'hot' : tgt && s.look === 'index' ? 'hot now' : s.mode === 'look' && s.look === 'index' ? 'hot now' : 'plain', title: 'name index idx_name', sub: ['…, user776, user777,', 'user778, …'] });
    if (s && s.ixId) P.box('ixi', 24, 136, 230, 76, { cls: s.fresh === 'id' ? 'hot' : (tgt || s.mode === 'look') && s.look === 'pk' ? 'hot now' : 'plain', title: 'id index (primary key)', sub: ['…, 776, 777, 778, …'] });
    // A few rows of the table: the matching rows depend on the condition (for name and id it is row 777, for city it is row 2 in Busan)
    var rowsDef = [['r1', 1, 'Seoul', 42], ['r2', 2, 'Busan', 74], ['r777', 777, 'Seoul', 134], ['r1000', 1000, 'Gwangju', 190]];
    var matchOf = function (id, city) { return c.cond === 'city' ? city === 'Busan' : id === 777; };
    if (s && s.rows) {
      rowsDef.forEach(function (r) {
        var m = matchOf(r[1], r[2]), cls = 'plain';
        if (s.mode === 'scan') cls = 'hot';
        else if (s.mode === 'target') cls = r[1] === 777 ? 'hot now' : 'plain';
        else if (s.mode === 'found') cls = m ? 'good' : 'plain';
        P.box(r[0], 424, r[3], 232, 28, { cls: cls, title: 'id ' + r[1] + ', user' + r[1] + ', ' + r[2] });
      });
      P.text('d1', 540, 122, '⋮', { cls: 'mut', anchor: 'middle' });
      P.text('d2', 540, 180, '⋮  (1000 rows in all)', { cls: 'mut', anchor: 'middle' });
    } else P.text('emp', 540, 126, 'No rows', { cls: 'mut', anchor: 'middle' });
    if (tgt) {
      if (s.look === 'index') P.arrow('ar', 'ixn:r', 'r777:l', { cls: 'hot', label: 'user777' });
      else P.arrow('ar', 'ixi:r', 'r777:l', { cls: 'hot', label: '777' });
    }
    P.box('n1', 14, 242, 322, 36, { cls: s && s.read !== null ? (s.read > 1 ? 'hot' : 'good') : 'ghost', title: 'Rows the database read', right: s && s.read !== null ? String(s.read) : '-' });
    P.box('n2', 344, 242, 322, 36, { cls: s && s.found !== null ? 'good' : 'ghost', title: 'Rows found', right: s && s.found !== null ? String(s.found) : '-' });
  },
  assume: 'It was run and checked against H2 2.4.240 (in-memory database, JDBC). It ran all 6 combinations, and it ran the whole SQL on the screen, including the comment lines, exactly as written. At the "Insert 1000 members" comment line on the screen, the verification program inserted 1000 members (ids 1 to 1000, names user1 to user1000, and 250 members each for the cities Seoul, Busan, Daegu, and Gwangju, in turn), and the INSERT statements are omitted on the screen. What it checked is the number of rows the SELECT returned, how H2 EXPLAIN said it would search (the name index IDX_NAME, the primary key index PRIMARY_KEY, and tableScan with no index), the scanCount that EXPLAIN ANALYZE reported, and the facts that the step sentences rely on. The facts they rely on are that the index on the id column exists automatically right after CREATE TABLE, that CREATE INDEX built an index with the name column in order, that the table still has 1000 rows before and after CREATE INDEX, and that the SELECT returns the same rows with and without an index. The "Rows the database read" on the screen is scanCount minus 1. The H2 documentation does not define what scanCount means, and in this version the scanCount we observed is 1 more than the number of rows read (it looks like one more is added to confirm that there are no more rows to read). The evidence is this. When we read a table with 0, 10, and 1000 rows from start to finish, scanCount was 1, 11, and 1001. When we forced a full read by using a function that counts how many times it is called per row in the condition, the function was called 1000 times and scanCount was 1001. When we looked up a value that does not exist by an index, scanCount was 1, and for a value that exists, it was 2. Following this observation, the "1 row" for a search by index is also the value with 1 subtracted in the same way, and it equals the number of rows found. The database decides how to search by looking at the amount and distribution of the data, so on another database or with other data it may not use an index even if there is one. This is the result observed with this data in H2 on the PC used to write this lab. We opened the H2 documentation, on the performance page, "How Data is Stored and How Indexes Work" (an index is like a table with the indexed columns and the row number) and "Statement Execution Plans (EXPLAIN)" (EXPLAIN ANALYZE shows the rows read, tableScan means that no index was used, and an index is created automatically for a primary key and a unique constraint), and checked against it. We opened the MySQL 8.4 documentation, section 10.3.1 How MySQL Uses Indexes (without an index, it has to read the whole table from the first row), section 15.1.15 CREATE INDEX Statement (it adds an index to an existing table), section 10.3.2 Primary Key Optimization (a primary key has an index attached), and the PRIMARY KEY item of the CREATE TABLE statement, and checked against them. However, we did not check against execution on MySQL. Also, this screen draws the index of the primary key as a box like the name index, but H2 and MySQL (InnoDB) use an integer primary key as the sort order of the table data itself, so the index of the primary key is not a list separate from the table like the name index. We did not cover the structure of an index (B-tree and so on), or the cost that comes from INSERT, UPDATE, and DELETE having to update the index as well when an index exists. The in-depth lab "Indexes and full table scans" covers them.',
});

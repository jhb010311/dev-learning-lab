Lab.register({
  id: 'jdbctmpl', nav: 'JdbcTemplate and exception translation', cat: 'Spring', mode: 'step',
  title: 'What does JdbcTemplate do for you, and what does it translate exceptions to?',
  intro: 'When you use JDBC directly, running one line of SQL means writing the code that gets a connection, closes it, and handles SQLException every time. JdbcTemplate does this repeated work for you, and it translates the SQLException thrown by the JDBC driver into a Spring exception (one from the DataAccessException hierarchy).',
  terms: ['JdbcTemplate', 'Exception translation and DataAccessException', 'Connection pool', 'Checked and unchecked exceptions', 'Template Method pattern'],
  controls: [
    { id: 'how', label: 'How the database is accessed', type: 'select', value: 'plain', options: [['plain', 'JDBC directly: close() called on the last line'], ['twr', 'JDBC directly: closed with try-with-resources'], ['tmpl', 'JdbcTemplate']] },
    { id: 'op', label: 'Operation to run', type: 'select', value: 'dup', options: [['one', 'Query: the result has 1 row'], ['zero', 'Query: the result has 0 rows'], ['two', 'Query: the result has 2 rows'], ['dup', 'Insert: an id that already exists (duplicate primary key)'], ['nul', 'Insert: null into a NOT NULL column'], ['bad', 'Query: a typo in a column name in the SQL']] },
  ],
  presets: [
    { t: 'Default settings', q: 'What happens when you use JDBC directly, call close() on the last line, and insert an id that already exists (duplicate primary key)?', d: 'JDBC is used directly, with close() on the last line. When an exception is thrown, the connection is not returned.', v: { how: 'plain', op: 'dup' } },
    { t: 'Closing with try-with-resources', q: 'What if you close the connection with try-with-resources instead of calling close() on the last line?', d: 'The connection is returned. But what the caller gets is still an SQLException and a code.', v: { how: 'twr', op: 'dup' } },
    { t: 'Switching to JdbcTemplate', q: 'What if you access the database with JdbcTemplate instead?', d: 'The code becomes one line, and the exception is translated to DuplicateKeyException.', v: { how: 'tmpl', op: 'dup' } },
    { t: 'A typo in the SQL', q: 'What if you use JdbcTemplate and run a query with a typo in a column name in the SQL?', d: 'The exception is translated to BadSqlGrammarException.', v: { how: 'tmpl', op: 'bad' } },
    { t: 'queryForObject with 0 rows', q: 'What if you use queryForObject of JdbcTemplate for a query whose result has 0 rows?', d: 'You get an exception, not null.', v: { how: 'tmpl', op: 'zero' } },
    { t: '2 rows with JDBC directly', q: 'What if you use JDBC directly and run a query whose result has 2 rows?', d: 'Only the first row is returned, and the fact that there were 2 rows is lost.', v: { how: 'plain', op: 'two' } },
    { t: 'queryForObject with 2 rows', q: 'What if you use queryForObject of JdbcTemplate for a query whose result has 2 rows?', d: 'Compare this with the example just above. An exception tells you about it.', v: { how: 'tmpl', op: 'two' } },
  ],
  code: function (c) {
    var q = c.op === 'one' || c.op === 'zero' || c.op === 'two' || c.op === 'bad', city = { one: 'Busan', zero: 'Jeju', two: 'Seoul', bad: 'Busan' }[c.op];
    var head = '// member table (id is the primary key, name is NOT NULL)\n//   (1, kim, Seoul), (2, lee, Busan), (3, park, Seoul)\n// Call: ' + (q ? 'memberRepository.findName("' + city + '");' : c.op === 'dup' ? 'memberRepository.insert(1L, "choi", "Daejeon");' : 'memberRepository.insert(4L, null, "Daejeon");') + '\n\n';
    var sql = q ? '"select ' + (c.op === 'bad' ? 'nmae' : 'name') + ' from member where city = ? order by id"' : '"insert into member(id, name, city) values (?, ?, ?)"';
    if (c.how === 'tmpl') return head + (q ? 'public String findName(String city) {\n    return jdbcTemplate.queryForObject(\n        ' + sql + ',\n        String.class, city);\n}' : 'public int insert(Long id, String name, String city) {\n    return jdbcTemplate.update(\n        ' + sql + ',\n        id, name, city);\n}');
    if (c.how === 'plain') return head + (q ? 'public String findName(String city) throws SQLException {\n    Connection con = dataSource.getConnection();           // get a connection\n    PreparedStatement ps = con.prepareStatement(\n        ' + sql + ');\n    ps.setString(1, city);\n    ResultSet rs = ps.executeQuery();                       // run the SQL\n    String name = rs.next() ? rs.getString("name") : null;  // read the result\n    rs.close();\n    ps.close();\n    con.close();                                            // return the connection\n    return name;\n}'
      : 'public int insert(Long id, String name, String city) throws SQLException {\n    Connection con = dataSource.getConnection();           // get a connection\n    PreparedStatement ps = con.prepareStatement(\n        ' + sql + ');\n    ps.setLong(1, id);\n    ps.setString(2, name);\n    ps.setString(3, city);\n    int rows = ps.executeUpdate();                          // run the SQL\n    ps.close();\n    con.close();                                            // return the connection\n    return rows;\n}');
    return head + (q ? 'public String findName(String city) throws SQLException {\n    try (Connection con = dataSource.getConnection();      // get a connection\n         PreparedStatement ps = con.prepareStatement(\n             ' + sql + ')) {\n        ps.setString(1, city);\n        try (ResultSet rs = ps.executeQuery()) {            // run the SQL\n            return rs.next() ? rs.getString("name") : null; // read the result\n        }\n    }                                                       // closed automatically here\n}'
      : 'public int insert(Long id, String name, String city) throws SQLException {\n    try (Connection con = dataSource.getConnection();      // get a connection\n         PreparedStatement ps = con.prepareStatement(\n             ' + sql + ')) {\n        ps.setLong(1, id);\n        ps.setString(2, name);\n        ps.setString(3, city);\n        return ps.executeUpdate();                          // run the SQL\n    }                                                       // closed automatically here\n}');
  },
  label: function (c) { return { plain: 'JDBC directly (close() last)', twr: 'JDBC directly (try-with-resources)', tmpl: 'JdbcTemplate' }[c.how] + ' · ' + { one: 'query, 1 row', zero: 'query, 0 rows', two: 'query, 2 rows', dup: 'duplicate primary key', nul: 'NOT NULL violation', bad: 'SQL typo' }[c.op]; },
  columns: ['What the caller gets', 'Kind of exception', 'Connection'],
  simulate: function (c) {
    var raw = c.how !== 'tmpl', plain = c.how === 'plain', op = c.op, q = op === 'one' || op === 'zero' || op === 'two' || op === 'bad', ev = [], sum = [];
    var n = { one: 1, zero: 0, two: 2 }[op], city = { one: 'Busan', zero: 'Jeju', two: 'Seoul', bad: 'Busan' }[op];
    // Errors reported by the database: the SQLState, what the error is, and the exception that Spring translates it to
    var err = { dup: ['23505', 'A row with id 1 already exists, so the primary key would be duplicated', 'DuplicateKeyException', 'a duplicate key', 'a duplicate key'], nul: ['23502', 'The name column is NOT NULL, but the statement tries to insert null into it', 'DataIntegrityViolationException', 'a constraint violation', 'a constraint violation'], bad: ['42S22', 'The member table has no column named nmae', 'BadSqlGrammarException', 'invalid SQL', 'invalid SQL'] }[op];
    var call = q ? 'findName("' + city + '")' : op === 'dup' ? 'insert(1L, "choi", "Daejeon")' : 'insert(4L, null, "Daejeon")';
    var steps = raw ? (q ? ['Get a connection', 'Run the SQL', 'Read the result', plain ? 'Call close()' : 'Automatic close'] : ['Get a connection', 'Run the SQL', plain ? 'Call close()' : 'Automatic close']) : ['Get a connection', 'Run the SQL', 'Close (return to the pool)', err ? 'Translate the exception' : 'Check row count'];
    var st = { con: 'in the pool', db: '', at: -1, st: steps.map(function () { return ''; }), ex: '', caller: '' };
    function push(s, k) { ev.push({ s: s, k: k || '', snap: JSON.parse(JSON.stringify(st)) }); }
    function step(i, mark) { st.at = i; st.st[i] = mark; }
    var caller, kind, conn = 'returned';
    push('memberRepository.' + call + ' is called: ' + (raw ? 'This method uses JDBC directly. Everything from getting a connection to closing it is written out in this method.' : 'This method uses JdbcTemplate. All that is written by hand is the SQL and the values to put into it' + (q ? ', plus the type of the result (String.class)' : '') + '.'));
    step(0, 'done'); st.con = 'in use';
    push((raw ? 'dataSource.getConnection(): ' : (q ? 'jdbcTemplate.queryForObject(...)' : 'jdbcTemplate.update(...)') + ' internally: ') + 'One connection is borrowed from the connection pool. ' + (raw ? 'A borrowed connection must be closed (close) after use so that it is returned to the pool.' : 'JdbcTemplate does this for you.'));
    if (!err) {
      step(1, 'done'); st.db = 'Rows returned: ' + n;
      push((raw ? 'ps.executeQuery(): ' : 'JdbcTemplate runs the SQL: ') + 'The value that goes in place of the question mark is "' + city + '". The number of members whose city is ' + city + ' is ' + (n ? n + ',' : '0,') + ' so the database returns ' + n + (n === 1 ? ' row' : ' rows') + '. To the database, neither 0 rows nor 2 rows is an error.');
      if (raw) {
        step(2, n === 1 ? 'done' : 'caution');
        push('rs.next() ? rs.getString("name") : null: ' + (n === 0 ? 'There is no first row, so rs.next() is false and the result is null. What to return when there are 0 rows is also something this code had to decide and write out.' : n === 1 ? 'The cursor moves to the first row, and the value "lee" is read from the name column.' : 'The cursor moves to the first row, and the value "kim" is read from the name column. The second row (park) is not read. The fact that the result had 2 rows is not kept anywhere.'), n === 2 ? 'bad' : '');
        step(3, 'done'); st.con = 'returned';
        push(plain ? 'rs.close(), ps.close(), con.close(): The code closes all three itself. con.close() returns the connection to the pool.' : 'End of the try block: Java calls close() on rs, ps, and con automatically. The connection goes back to the pool.', 'good');
        caller = n === 0 ? 'null' : n === 1 ? '"lee"' : '"kim"'; kind = 'no exception';
        st.at = -1; st.caller = caller;
        push('The caller gets ' + (n === 0 ? 'null' : n === 1 ? '"lee"' : '"kim"') + '. ' + (n === 0 ? 'If the caller uses the value without checking whether it is null, a NullPointerException is thrown.' : n === 2 ? 'Two members live in Seoul, but the caller got the name of only one of them, and nothing signals that there is a problem.' : 'The caller got the value without an exception.'), n === 1 ? 'good' : 'bad');
      } else {
        step(2, 'done'); st.con = 'returned';
        push('JdbcTemplate reads the result and closes: After reading all the rows that came back, it closes the ResultSet and the PreparedStatement and returns the connection to the pool. You did not write any code to close them.', 'good');
        if (n === 1) { step(3, 'done'); caller = '"lee"'; kind = 'no exception'; push('queryForObject checks the row count: queryForObject is a method whose result must be exactly 1 row. There is 1 row, so it returns that value, "lee".', 'good'); }
        else {
          step(3, 'exception'); caller = n === 0 ? 'EmptyResultDataAccessException' : 'IncorrectResultSizeDataAccessException'; kind = 'unchecked exception'; st.ex = caller;
          push('queryForObject checks the row count: queryForObject is a method whose result must be exactly 1 row. The row count is ' + n + ', so it throws ' + caller + '. This is not an error reported by the database. It is an exception that Spring throws after looking at the row count.', 'bad');
        }
        st.at = -1; st.caller = caller;
        push('The caller gets ' + (n === 1 ? '"lee".' : caller + '. It is an unchecked exception, so the code compiles without throws or try-catch. ' + (n === 0 ? 'If 0 rows can be a normal result for this query, catch this exception and handle it, or use query(...), which returns multiple rows, and check whether the list is empty.' : 'A query that must return 1 row returned 2, and this is not passed over silently. The exception tells you.')), n === 1 ? 'good' : 'bad');
      }
    } else {
      step(1, 'exception'); st.db = 'Error (SQLState ' + err[0] + ')'; st.ex = 'SQLException';
      push((raw ? (op === 'bad' ? 'The SQL is sent to the database: ' : 'ps.executeUpdate(): ') : 'JdbcTemplate runs the SQL: ') + 'The database reports an error. ' + err[1] + '. The JDBC driver throws this as an SQLException, and what the error is can be found in the SQLState code inside it (' + err[0] + ').', 'bad');
      if (raw) {
        if (q) st.st[2] = 'skipped';
        if (plain) {
          st.st[steps.length - 1] = 'skipped'; st.at = steps.length - 1; st.con = 'not returned'; conn = 'not returned';
          push('The exception leaves the method: The calls written below the line where the exception was thrown, ' + (q ? 'rs.close(), ps.close(), con.close()' : 'ps.close(), con.close()') + ', do not run. The borrowed connection does not go back to the pool. When this keeps happening, the pool runs out of connections and other requests cannot get one.', 'bad');
        } else {
          st.st[steps.length - 1] = 'done'; st.at = steps.length - 1; st.con = 'returned';
          push('The exception leaves the try block: With try-with-resources, close() is called automatically when the block is exited, even when an exception is thrown. The connection goes back to the pool.', 'good');
        }
        caller = 'SQLException (SQLState ' + err[0] + ')'; kind = 'checked exception';
        st.at = -1; st.caller = caller;
        push('The caller gets SQLException (or one of its subclasses). It is a checked exception, so every method that calls this method must either declare throws SQLException or catch it with try-catch. To find out whether the problem is ' + err[3] + ', you often have to check a code such as SQLState ' + err[0] + ' yourself.', 'bad');
      } else {
        step(2, 'done'); st.con = 'returned';
        push('JdbcTemplate catches the SQLException: First, it closes the PreparedStatement and returns the connection to the pool. JdbcTemplate also does the cleanup when an exception is thrown.', 'good');
        step(3, 'done'); caller = err[2]; kind = 'unchecked exception'; st.ex = caller;
        push('Exception translation: JdbcTemplate looks at the kind of SQLException and at the SQLState code ' + err[0] + ', which mean ' + err[4] + ', and it translates the exception to ' + err[2] + ' and throws that. The original SQLException is kept inside the new exception as its cause, so it is not lost.', '');
        st.at = -1; st.caller = caller;
        push('The caller gets ' + err[2] + '. It is an unchecked exception, so no throws clause is needed, and if you want to handle only this case separately, you catch it by the name of the exception class, not by a code number.', 'bad');
      }
    }
    if (plain && err) sum.push('When close() is at the end of the method, the connection cannot be closed if an exception is thrown partway through. When you use JDBC directly, you have to close with try-with-resources (or finally), and you have to write this in every method without missing one.');
    if (c.how === 'twr' && err) sum.push('With try-with-resources, the connection is returned. Even so, what JDBC throws is SQLException (and its subclasses), which is a checked exception, and to tell the cause you often have to look at a code number that differs from one database to another.');
    if (raw && !err && n !== 1) sum.push('When you use JDBC directly, you also have to decide yourself what to do when there are 0 rows or 2 rows. If you read only the first row without deciding, the problem passes silently. The queryForObject method of JdbcTemplate throws an exception in the same situation.');
    if (raw && !err && n === 1) sum.push('The result is correct, but to run one line of SQL you wrote everything yourself: getting a connection, setting the values, running the SQL, reading the result, and closing. The same code is repeated in every method.');
    if (!raw && err) sum.push('JdbcTemplate translates an SQLException to an exception in the DataAccessException hierarchy. All of them are unchecked exceptions, and the class name tells you the kind of problem. Even when the database product changes, you can catch the same exception class.' + (op === 'dup' ? ' DuplicateKeyException is a subclass of DataIntegrityViolationException.' : ''));
    if (!raw && !err && n === 1) sum.push('You did not write a single line of code to get or close a connection. All you wrote was the SQL, the values to put into it, and the type of the result.');
    if (!raw && !err && n === 0) sum.push('When the result has 0 rows, queryForObject does not return null. It throws EmptyResultDataAccessException. This exception is a subclass of IncorrectResultSizeDataAccessException.');
    if (!raw && !err && n === 2) sum.push('When the result has 2 or more rows, queryForObject throws IncorrectResultSizeDataAccessException. For a query that can return multiple rows, use query(...) or queryForList(...), which return a list.');
    return { events: ev, summary: sum, steps: steps, raw: raw, n: n, city: city, row: [caller, kind, conn] };
  },
  render: function (v, sim, t, H, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : null, c = sim.c;
    if (!s) { H.text(v, 'Click Run to go through one step at a time.'); return; }
    var q = sim.city !== undefined;
    H.table(v, ['id', 'name', 'city'], [['1', 'kim', 'Seoul'], ['2', 'lee', 'Busan'], ['3', 'park', 'Seoul']].map(function (r) { var hit = q && c.op !== 'bad' && r[2] === sim.city && s.db; return { cells: [r[0], r[1], { v: r[2], cls: hit ? 'hot' : '' }] }; }), 'member table');
    H.title(v, sim.raw ? 'What the hand-written code does' : 'What JdbcTemplate does for you'); var ln = H.lanes(v);
    sim.steps.forEach(function (name, i) { var m = s.st[i]; H.lane(ln, name, m || 'not yet', m === 'done' ? 'good' : m === 'exception' || m === 'skipped' ? 'bad' : m === 'caution' ? 'hot' : 'none'); });  },
  // Diagram: in the middle, the work needed for one database operation is laid out from top to bottom (the hand-written code, or what JdbcTemplate does for you). On the right are the connection pool and the database, and at the bottom is what the caller gets.
  draw: function (P, sim, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : { con: 'in the pool', db: '', at: -1, st: sim.steps.map(function () { return ''; }), ex: '', caller: '' };
    var n = sim.steps.length, gap = n === 4 ? 48 : 62;
    P.size(680, 318);
    P.box('caller', 12, 104, 124, 56, { cls: shown.length ? 'wait' : 'plain', title: 'Caller', sub: 'service code' });
    P.region('code', 142, 14, 270, 244, sim.raw ? 'Hand-written code' : 'What JdbcTemplate does for you');
    sim.steps.forEach(function (name, i) {
      var m = s.st[i], cls = !m ? 'ghost' : m === 'done' ? 'good' : m === 'caution' ? 'hot' : 'bad';
      P.box('s' + i, 154, 48 + i * gap, 246, 38, { cls: cls + (s.at === i ? ' now' : ''), title: (i + 1) + '. ' + name, right: m === 'skipped' ? 'skipped' : m === 'exception' ? 'exception' : '' });
    });
    P.box('pool', 478, 44, 190, 62, { cls: s.con === 'not returned' ? 'bad' : s.con === 'in use' ? 'hot' : s.con === 'returned' ? 'good' : 'plain', title: 'Connection pool', sub: 'Connection ' + s.con });
    P.box('db', 478, 150, 190, 62, { cls: !s.db ? 'plain' : s.db.indexOf('Error') === 0 ? 'bad' : 'wait', title: 'DB (member table)', sub: s.db || 'not run yet' });
    if (shown.length) P.arrow('in', 'caller:r', [142, 132], {});
    if (s.con === 'in use' || s.con === 'not returned') P.arrow('con', 's0:r', 'pool:l:0.4', { cls: s.con === 'not returned' ? 'bad' : '', label: s.con === 'not returned' ? 'unreturned' : 'borrowed' });
    if (s.st[1]) P.arrow('sql', 's1:r', 'db:l', { cls: s.st[1] === 'exception' ? 'bad' : '', label: s.st[1] === 'exception' ? 'error' : 'SQL' });
    P.box('res', 12, 274, 656, 36, { cls: !s.caller ? 'ghost' : s.caller.indexOf('Exception') >= 0 ? 'bad' : s.caller === 'null' || sim.n === 2 ? 'hot' : 'good', title: 'What the caller gets', right: s.caller || 'still running' });
    P.note('The arrow to the connection pool is shown only while the connection is borrowed. The work in the middle boxes is repeated in exactly the same way every time an SQL statement is run.');
  },
  assume: 'All 18 combinations were run on this PC with code of the same structure as on the screen, using the JdbcTemplate of Spring Framework 7.0.9 (the version included in Spring Boot 4.1.1), the HikariCP connection pool, and H2 2.4.240, and three things were checked against the results: what the caller gets, whether the exception is a checked exception, and whether any connection is left unreturned to the pool after the call ends. Execution also confirmed that DuplicateKeyException is a subclass of DataIntegrityViolationException, that EmptyResultDataAccessException is a subclass of IncorrectResultSizeDataAccessException, that the cause of the translated exception holds the original SQLException, and that the connection has already been returned at the point where JdbcTemplate translates the exception. The SQLState values (23505, 23502, 42S22) are the values that H2 gave. That the codes can differ in other database products, and that Spring still translates them to the same exceptions, are statements that follow the Spring documentation, because execution on this PC used only H2. The order of the steps, in which queryForObject checks the row count after it has read the whole result and returned the connection, follows the Spring source code (execution confirmed only that the connection has been returned after the call ends). H2 reports a typo in the SQL when the PreparedStatement is created, but some databases report it only when the SQL is run. The screen does not distinguish the two and draws this as the "Run the SQL" step. Inside a transaction managed by Spring, JdbcTemplate does not return the connection to the pool right away. It returns it when the transaction ends. Only the case without a transaction is covered here.',
});

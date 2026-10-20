Lab.register({
  id: 'jdbc_basic', nav: 'JDBC', cat: 'Fundamentals', mode: 'step', basic: true, deep: ['jdbctmpl', 'connpool', 'ormwhy'],
  title: 'How does Java code send SQL to the database?',
  why: 'If each DB had a different way of exchanging data with a Java program, moving to another DB would mean rewriting all of the code that connects and sends SQL. JDBC lets connecting, sending SQL, and reading results be done with the same methods defined by Java, and leaves the parts that differ between DBs to a driver (a jar file) made for that DB.',
  use: 'In the build.gradle of a Spring project, mysql-connector-j is the JDBC driver for MySQL, and the jdbc:mysql:// address written in spring.datasource.url is a JDBC connection address. Code is often written with JdbcTemplate or JPA, but these two also send SQL with JDBC underneath, so knowing this flow helps when you look for the cause of a DB error.',
  intro: 'A database is a program that works separately from the Java program. (A database such as MySQL is a completely different program. H2, used in this lab, runs inside the Java program, but what the code does is the same.) For Java code to have the database do work, it does three things, following the convention called JDBC. First, it makes a connection (Connection) to the database. Second, it sends SQL as text over that connection. Third, it reads the returned result (ResultSet) one row at a time. Without a connection, SQL cannot be sent, and if the SQL text is wrong, the database answers with an error, which becomes a SQLException in Java (an exception, a signal that an error occurred). In this lab you add a conn.close() line to code that reads the name of the member whose id is 1 from the member table, or change the SQL text, and see the SQL the database received, the value Java printed, and the exception. (The code on the screen is treated as being inside the main method, so the import lines and the main declaration are left out. JdbcTemplate and JPA, which write this repeated code for you, are covered in the in-depth labs.)',
  terms: ['JDBC', 'Connection and DriverManager', 'Statement and executeQuery', 'ResultSet and SQLException'],
  controls: [
    { id: 'conn', label: 'conn (the connection made with the database)', type: 'select', value: 'open', options: [['open', 'Make the connection and send SQL right away'], ['closed', 'Close the connection with the conn.close() line, then send SQL']] },
    { id: 'sql', label: 'SQL written in executeQuery', type: 'select', value: 'ok', options: [['ok', 'Correct SQL: FROM member WHERE id = 1'], ['typo', 'A table that does not exist: FROM memberr'], ['none', 'A condition that matches no row: WHERE id = 99']] },
  ],
  // q is the question shown on the question-style screen. t and d are the name and the description used in the text-only reading
  presets: [
    { t: 'Default settings', q: 'What does the Java code that reads the name of the member whose id is 1 look like, and what happens when you run it?', d: 'It makes a connection, sends SQL, and reads the result one row at a time. The database receives one SQL statement, runs it, and returns the value kim.', v: { conn: 'open', sql: 'ok' } },
    { t: 'Sending after closing the connection', q: 'What if you add the conn.close() line to close the connection, and then send the SQL?', d: 'SQL cannot reach the database over a closed connection, and a SQLException occurs.', v: { conn: 'closed', sql: 'ok' } },
    { t: 'A table name that does not exist', q: 'What if you write a name that does not exist (memberr) in the table name place of the SQL?', d: 'While reading the SQL, the database answers with an error saying the table does not exist, and in Java it becomes a SQLException.', v: { conn: 'open', sql: 'typo' } },
    { t: 'No matching row', q: 'What if no row matches the condition (WHERE id = 99)?', d: 'It is not an error, and an empty result comes back. The call rs.next() gives the value false, and if you try to read a value anyway, an exception occurs.', v: { conn: 'open', sql: 'none' } },
    { t: 'Closed connection and a wrong table name', q: 'What if you also add the conn.close() line and the table name is a name that does not exist (memberr)?', d: 'The closed-connection error comes first. The database never got to read the wrong SQL.', v: { conn: 'closed', sql: 'typo' } },
  ],
  // The code on the screen and the source that the checking program (verify/spring/src/JdbcBasicProbe.java) compiled and ran are the same text. The checking script compares them down to the letter.
  code: function (c) {
    var l = ['// Only the lines inside main are shown (class, main declaration, and imports omitted)', '// The member table holds one row: (id 1, name kim)', '// Connect: make a connection to the database that the URL points to', 'Connection conn = DriverManager.getConnection("jdbc:h2:mem:shop");', '// Tool: the object that sends SQL over this connection', 'Statement st = conn.createStatement();'];
    if (c.conn === 'closed') l.push('// Close: cut the connection to the database', 'conn.close();');
    l.push('// Send: send the SQL text to the database and receive the result', 'ResultSet rs = st.executeQuery("' + this.sqlText(c) + '");', '// Read: move to the next row. true if there is a row', 'boolean found = rs.next();', 'System.out.println(found);', 'System.out.println(rs.getString("name"));');
    return l.join('\n');
  },
  sqlText: function (c) { return 'SELECT name FROM ' + (c.sql === 'typo' ? 'memberr' : 'member') + ' WHERE id = ' + (c.sql === 'none' ? '99' : '1'); },
  label: function (c) { return (c.conn === 'open' ? 'Connected, then sent' : 'Sent after closing the connection') + ' · ' + { ok: 'Correct SQL', typo: 'Table name that does not exist', none: 'Condition that matches no row' }[c.sql]; },
  // The error codes of the real H2, put into the wording written on the screen (the checking script uses the same table)
  errName: { closed: 'SQLException: tried to send SQL on a closed connection', typo: 'SQLException: table not found', none: 'SQLException: tried to read a value when there is no row to read' },
  columns: ['SQL the database received', 'Value printed', 'Exception'],
  simulate: function (c) {
    var closed = c.conn === 'closed', typo = c.sql === 'typo', none = c.sql === 'none', S = this.sqlText(c);
    var ev = [], sum = [], outs = [], recv = 0, excKind = '';
    // State: cn the connection (none before it is made, open, closed), se the place on the database side, sm Statement, sq the SQL arrow (go arrived, blocked stopped), ans the answer of the database, rs ResultSet (none, before in front of the first row, row has a current row, after has no current row),
    //       n the number of rows in the result, hot the place that is moving now, log what has happened so far, outs the printed values, exc the exception
    var st = { cn: 'none', se: false, sm: false, sq: '', ans: '', rs: 'none', n: 0, hot: '', log: [], outs: [], exc: '', recv: 0 };
    function push(s, k) { ev.push({ s: s, k: k, snap: JSON.parse(JSON.stringify(st)) }); }

    // 1. Connect
    st.cn = 'open'; st.se = true; st.hot = 'cn'; st.log.push(['DriverManager.getConnection', { v: 'Connection made', cls: 'good' }]);
    push('DriverManager.getConnection("jdbc:h2:mem:shop"): the Java program makes a connection to the database. The jdbc in the URL means the convention for Java to connect to a database (JDBC), h2 is the kind of database, and mem:shop is a database named shop that lives in memory. When the connection is made, one place that handles this connection (a session) appears on the database side, and a Connection object that represents the connection appears in Java, and the variable conn refers to that object. The member table holds one row, (1, kim). Not a single line of SQL has been sent yet.', '');

    // 2. Statement
    st.sm = true; st.hot = 'sm'; st.log.push(['conn.createStatement', { v: 'Made a tool for sending SQL', cls: '' }]);
    push('conn.createStatement(): makes a tool (a Statement object) that sends SQL over the connection that conn refers to, and makes the variable st refer to that object. Only the tool was made, so no SQL has gone to the database yet.', '');

    // 3. Close
    if (closed) {
      st.cn = 'closed'; st.se = false; st.hot = 'cn'; st.log.push(['conn.close', { v: 'Closed the connection', cls: 'bad' }]);
      push('conn.close(): cuts the connection. The place on the database side that handled this connection disappears, and the Connection object that conn refers to becomes a closed connection. The Statement that st refers to is a tool that was made from that connection, which was just closed.', 'bad');
    }

    // 4. Send
    st.hot = 'sm';
    if (closed) {
      st.sq = 'blocked'; st.ans = 'none'; st.exc = this.errName.closed; excKind = 'closed';
      st.log.push(['st.executeQuery', { v: 'Could not send', cls: 'bad' }]);
      push('st.executeQuery("' + S + '"): tries to send the SQL, but the connection that conn refers to is already closed. Before this line reaches the database, the JDBC driver notices that the connection is closed and throws a SQLException. The database has never received this SQL. ' +
        (typo ? 'Whether the table name is wrong can be known only when the database reads the SQL, so the closed-connection error comes first and the wrong name is never found out. ' : none ? 'The condition WHERE id = 99 has never been read by the database either. ' : '') +
        'There is no code that handles the exception, so the program stops at this line and the lines below it do not run.', 'bad');
    } else if (typo) {
      st.sq = 'go'; st.ans = 'err'; st.exc = this.errName.typo; excKind = 'typo'; recv = 1; st.recv = 1;
      st.log.push(['st.executeQuery', { v: 'Database answered with an error', cls: 'bad' }]);
      push('st.executeQuery("' + S + '"): st sends the SQL text to the database. While reading the text it received, the database looks for the table memberr after FROM, but there is no such table. The database answers with the error "table not found" instead of a result, and JDBC in Java turns this error into a SQLException and throws it. When compiling, the SQL was just text and the wrong line was not noticed. It was found out only now, when the database read it. There is no code that handles the exception, so the program stops at this line and the lines below it do not run.', 'bad');
    } else {
      st.sq = 'go'; st.ans = none ? 'rows0' : 'rows1'; st.rs = 'before'; st.n = none ? 0 : 1; recv = 1; st.recv = 1;
      st.log.push(['st.executeQuery', { v: 'Database ran it and returned the result (rows: ' + st.n + ')', cls: 'good' }]);
      push('st.executeQuery("' + S + '"): st sends the SQL text to the database. The database reads the text it received and looks in the member table for ' + (none ? 'the row whose id is 99, but there is no such row. The run succeeded, and the result is a table with 0 rows. This is not an error. ' : 'the row whose id is 1, and makes the result. The result is a table with 1 row. ') +
        'Java receives this result as a ResultSet object, and the variable rs refers to that object. A ResultSet starts standing in front of the first row, so it has not read any row yet.', 'good');
    }
    if (!closed && !typo) {
      // 5. next
      st.hot = 'rs'; st.rs = none ? 'after' : 'row';
      st.log.push(['rs.next', { v: none ? 'false: no row to move to' : 'true: moved to the first row', cls: none ? 'bad' : 'good' }]);
      push('rs.next(): moves one step to the next row in the result, and returns true if there is a row at the place it moved to, and false if not. ' + (none
        ? 'The result has 0 rows, so there is no row to move to, and the value false goes into the variable found. rs is in a state with no current row.'
        : 'It moves to the first row, and the value true goes into the variable found. If you try to read a value before calling the next() method, a SQLException occurs saying there is no row to read.'), none ? 'bad' : 'good');
      // 6. println(found)
      outs.push(none ? 'false' : 'true'); st.outs = outs.slice(); st.hot = '';
      push('System.out.println(found): prints the value ' + (none ? 'false' : 'true') + ' held in the variable found to the screen.', '');
      // 7. getString
      if (none) {
        st.exc = this.errName.none; excKind = 'none'; st.hot = 'rs';
        st.log.push(['rs.getString', { v: 'Exception: no current row', cls: 'bad' }]);
        push('rs.getString("name"): tries to take the value of the name column from the current row, but rs has no current row. JDBC throws a SQLException saying there is no data to read, and the program stops at this line. The variable found was false on the previous line, and this error happened because the code did not check it and tried to read anyway.', 'bad');
      } else {
        outs.push('kim'); st.outs = outs.slice(); st.hot = 'rs';
        st.log.push(['rs.getString', { v: 'kim', cls: 'good' }]);
        push('rs.getString("name"): takes the value of the name column from the current row as text and prints the value kim. The program ran to the last line of main and ended. The database received one SQL statement, and there was no exception.', 'good');
      }
    } else { st.outs = []; }

    if (closed) {
      sum.push('After the connection is closed, SQL cannot be sent. A SQLException occurred at the executeQuery line, and the database did not receive this SQL.');
      sum.push(typo ? 'Whether the SQL is wrong can be known only when the database reads it, but a closed connection cannot reach the database, so the closed-connection error came out instead of the wrong table name.' : 'The connection is the path for sending SQL. Before asking whether the SQL is right or wrong, the path has to be open.');
    } else if (typo) {
      sum.push('If the SQL text is wrong, the database answers with an error, and in Java it becomes a SQLException. The database received and read the SQL, but it could not run it because the table memberr does not exist, and Java has no value that it read.');
      sum.push('To Java, SQL is just text (a string). Compiling succeeded, and what was wrong was found out only at run time, when the database read it.');
    } else if (none) {
      sum.push('No row matching the condition is not an error. The database runs the SQL and returns an empty result, and the call rs.next() tells you this with the value false. If you read a value without checking this signal, a SQLException occurs.');
      sum.push('You check whether there is a row with the true and false values that the next() method returns. Looking at that value before reading is the job of the code.');
    } else {
      sum.push('Java code reads a value from the database in this order: making a connection, making a tool to send with, sending SQL, and reading the result one row at a time. The database received and ran one SQL statement, and Java read the value kim.');
      sum.push('The Java side has no code that runs SQL. SQL is made as text and sent to the database, the database runs it, and Java only receives the returned result as a ResultSet and reads it.');
    }
    var out = outs.length ? outs.join(' / ') : '(Nothing was printed)';
    return { events: ev, summary: sum, recvCount: recv, excKind: excKind, row: [recv ? S : 'None (did not receive the SQL)', out, excKind ? this.errName[excKind] : 'None'] };
  },
  render: function (v, sim, t, H, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : null;
    if (!s) { H.text(v, 'Click Run to start from making the connection.'); return; }
    H.table(v, ['Line run', 'What happened'], s.log.map(function (r) { return { cls: '', cells: [r[0], r[1]] }; }), 'What happened between Java and the database');
    H.counters(v, [[s.recv, 'SQL statements received by the database'], [s.exc ? 1 : 0, 'Exceptions thrown']]);
  },
  // Diagram: at the left, the three objects of the Java program (conn, st, rs), and at the right, the places on the database side (the place for the connection, the member table, the answer of the database). Arrows for the connection, the SQL, and the result show whether they reach the database or break off, and at the bottom are boxes for the SQL the database received, the printed value, and the exception.
  draw: function (P, sim, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : null;
    P.size(680, 340);
    P.region('jv', 14, 12, 290, 178, 'Java program');
    P.region('db', 376, 12, 290, 178, 'DB (H2)');
    var cnSub = !s || s.cn === 'none' ? 'Not yet' : s.cn === 'open' ? 'Connection to the database' : 'Closed connection';
    P.box('cn', 24, 40, 270, 40, { cls: s && s.cn === 'closed' ? 'bad' : s && s.hot === 'cn' ? 'hot now' : s && s.cn === 'open' ? 'plain' : 'ghost', title: 'conn', sub: cnSub });
    P.box('sm', 24, 92, 270, 40, { cls: s && s.hot === 'sm' ? 'hot now' : s && s.sm ? 'plain' : 'ghost', title: 'st', sub: s && s.sm ? 'Tool that sends SQL' : 'Not yet' });
    var rsSub = !s || s.rs === 'none' ? 'Not yet' : s.rs === 'before' ? 'Rows: ' + s.n + ' · before the first row' : s.rs === 'row' ? 'Current row: kim' : 'No current row';
    P.box('rs', 24, 144, 270, 40, { cls: s && s.rs === 'after' ? 'bad' : s && s.hot === 'rs' ? 'hot now' : s && s.rs !== 'none' ? 'plain' : 'ghost', title: 'rs', sub: rsSub });
    P.box('se', 386, 40, 270, 40, { cls: s && s.se ? 'good' : 'ghost', title: 'Place for this connection', sub: s && s.se ? 'Yes' : 'None' });
    P.box('tb', 386, 92, 270, 40, { cls: s && s.sq === 'go' && s.ans !== 'err' ? 'hot now' : 'plain', title: 'member table', sub: '(1, kim)' });
    var an = !s || !s.ans ? 'No answer yet' : s.ans === 'rows1' ? 'Result: 1 row' : s.ans === 'rows0' ? 'Result: 0 rows' : s.ans === 'err' ? 'Error: table not found' : 'SQL not received, no answer';
    P.box('an', 386, 144, 270, 40, { cls: s && s.ans === 'err' ? 'bad' : s && (s.ans === 'rows1' || s.ans === 'rows0') ? 'good' : 'ghost', title: 'Answer of the database', sub: an });
    if (s && s.cn === 'open') P.arrow('lk', 'cn:r', 'se:l', { cls: 'good' });
    if (s && s.sq === 'go') P.arrow('sq', 'sm:r', 'tb:l', { cls: s.ans === 'err' ? 'bad' : 'hot' });
    if (s && s.sq === 'blocked') P.arrow('sq', 'sm:r', [338, 112], { cls: 'bad' });
    if (s && (s.ans === 'rows1' || s.ans === 'rows0')) P.arrow('rt', 'an:l', 'rs:r', { cls: 'good' });
    var recv = s && s.recv ? sim.row[0] : s && s.sq === 'blocked' ? 'None (did not receive the SQL)' : '';
    P.box('r1', 14, 204, 652, 36, { cls: s && s.recv ? 'wait' : s && s.sq === 'blocked' ? 'bad' : 'ghost', title: 'SQL the database received', right: recv });
    P.box('r2', 14, 248, 652, 36, { cls: s && s.outs.length ? 'good' : 'ghost', title: 'Value printed', right: s && s.outs.length ? s.outs.join(' / ') : '' });
    P.box('r3', 14, 292, 652, 36, { cls: s && s.exc ? 'bad' : 'ghost', title: 'Exception', right: s && s.exc ? s.exc : '' });
  },
  assume: 'Checked against real execution on JDK 21.0.12.1 and H2 2.4.240 (an in-memory database). It was not checked against execution on MySQL. All six combinations were checked by putting the code on the screen into a Main.java that has a main method (only import java.sql.* and the main declaration were added), compiling it with javax.tools, and running it in a new Java process for each combination. Before the run, the same process made the member table (id INT as the primary key, name VARCHAR(20)) and one row, (1, kim), and this preparation code is left out on the screen. The database is H2 running inside the Java process, so in reality it is in the same process, and it is not a separate program like MySQL. The order of connecting, sending SQL, and reading the result is the same, but that what travels between them is network communication was not checked in this lab. What was checked is the three items of the result table, that is, the SQL the database received, the value printed, and the exception. The SQL the database received was judged by whether that SELECT remained in INFORMATION_SCHEMA.QUERY_STATISTICS of H2 (the execution log), or the exception came from the parser of the database engine (org.h2.command.Parser) and the error message quoted that SQL. With the closed connection, neither was the case, and the exception came from JdbcConnection.checkClosed. The kind of exception is the SQLState and the error code of H2 (42102 table not found, 2000 no data to read, 90007 already closed object) put into the wording on the screen, and these codes are those of H2, so they may be different on MySQL. All three exceptions are subclasses of SQLException. The facts that the step sentences rely on were also checked by execution: that making a connection adds one session on the database side and closing it removes one, that createStatement alone leaves no SELECT in the execution log of the database and a SELECT is left after executeQuery, that calling getString before calling the next() method gives a SQLException, and that calling the next() method one more time gives false. The session count includes the one connection that the preparation code opened before the run. The execution log (QUERY_STATISTICS) did not show new records after it was read once (the cause was not checked), so a separate database was made for each point in time and read only once. To keep the code short, the code on the screen does not write the lines that close the connection and the ResultSet or the code that handles exceptions. Because the exception is not handled, the program stops at the line where the exception occurred and the lines below it do not run, and this was checked by the fact that the values of the later lines are not in the output. The Java SE 21 API documentation was opened and checked directly. The lab follows the java.sql package description (that DriverManager makes a connection, Statement sends SQL, and ResultSet receives the result), the description of Connection (that SQL is run inside a connection and the result comes back, and that createStatement throws a SQLException on a closed connection), Statement.executeQuery (that it returns a ResultSet and throws a SQLException on a closed Statement), the description of ResultSet (that the cursor is at first in front of the first row, that next moves one step and returns false if there is no row, and that a method that needs a current row throws a SQLException then), the description of SQLException (that it is an exception that carries the SQLState and an error code), and DriverManager.getConnection (that the URL has the form jdbc:subprotocol:name). From the H2 documentation (the features page), it was checked that jdbc:h2:mem:name points to one in-memory database with that name inside the same JVM, and that the in-memory database disappears when the last connection is closed. That H2 gives an error when a Statement made from a closed connection is used is not defined by the documentation but is a behavior observed on this H2 (the Statement documentation says only that it throws an exception on a closed Statement). This lab does not cover PreparedStatement and how to put values into SQL, SQL that changes data (executeUpdate), transactions, or the right way to close a connection (try-with-resources). JdbcTemplate, which reduces the repeated code, is covered in the in-depth lab "JdbcTemplate and exception translation", borrowing a connection instead of making a new one every time is covered in "Connection pool and OSIV", and JPA, which connects objects and tables, is covered in "What JPA solves".',
});

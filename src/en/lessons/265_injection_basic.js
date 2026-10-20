Lab.register({
  id: 'injection_basic', nav: 'Input and injection', cat: 'Fundamentals', mode: 'step', basic: true, deep: ['webattack', 'jdbctmpl'],
  title: 'What happens when text typed by a user is read as code?',
  why: 'If SQL is built by joining input directly onto the SQL text, a single quotation mark in a name is enough to break the SQL, and deliberately crafted input can become a command that pulls out other people\'s rows too. Finding and fixing each dangerous character in the input is easy to get wrong. PreparedStatement fixes the shape of the SQL first with ?, and passes the values separately, so that whatever the input is, it is never read as SQL syntax.',
  use: 'It is the basic way to put values sent by users, such as search terms, IDs, and order numbers, into SQL in Java. Spring\'s JdbcTemplate also takes SQL with ? and the values separately and runs it with PreparedStatement. However, a table name or a column name used as the sort key cannot be passed with ?, so the choice is limited to a list decided in advance.',
  intro: 'SQL is a command sent to the database as text. To find a member by the name a user typed into an input box, that name has to go somewhere in the SQL, and this lab compares two ways to do it in Java code. One is to attach the input to the SQL text ("… name = \'" + input + "\'"). The other is to leave a ? in the SQL where the value goes and pass the input separately through a PreparedStatement (a tool that takes values separately). When you attach it, characters in the input such as a quote also become part of the SQL text, so the database reads them as SQL syntax. Then the input is no longer a value but a command. This is SQL injection. When you pass it with ?, even a quote or OR in the input is only part of the value to look for. In this lab, you put into each of the two ways an ordinary name, a text with a quote and OR, and an ordinary name with a quote, and see the SQL the database received and the rows that came back. (The code on the screen is shown as if it were inside the main method, and the import lines and the main declaration are left out. There is no input box; the text is written in the input variable. Web attacks in general and JdbcTemplate are covered in the in-depth labs.)',
  terms: ['Statement and executeQuery', 'PreparedStatement and bind variables', 'SQL string literals and quotes', 'SQL injection'],
  controls: [
    { id: 'how', label: 'How input is put into the SQL', type: 'select', value: 'bind', options: [['bind', 'Write ? in sql and pass the value separately with ps.setString'], ['concat', 'Attach input to the sql text and send it with st.executeQuery(sql)']] },
    { id: 'input', label: 'Text input refers to', type: 'select', value: 'kim', options: [['kim', 'kim'], ['or', '\' OR \'1\'=\'1'], ['oneil', 'O\'Neil (an ordinary name with a quote)']] },
  ],
  // q is the question shown on the question-style screen. t and d are the name and the description used in the text-only reading
  presets: [
    { t: 'Default settings', q: 'If you pass input with ?, how is the SQL that looks for kim run?', d: 'The SQL keeps the ?, and kim goes separately as a value. One row, kim, comes back.', v: { how: 'bind', input: 'kim' } },
    { t: 'Attaching, and kim', q: 'What if you attach input to the SQL text and type kim?', d: 'The attached SQL also returns one row, kim. From the result alone, you cannot tell the two ways apart.', v: { how: 'concat', input: 'kim' } },
    { t: 'Attaching, and OR', q: 'What if you attach input and type \' OR \'1\'=\'1 as the input?', d: 'The input is read as a condition of the SQL, so all three rows come back.', v: { how: 'concat', input: 'or' } },
    { t: 'Passing with ?, and OR', q: 'What if you pass the same \' OR \'1\'=\'1 with ?', d: 'The input is handled only as a value, so no row has that name and 0 rows come back.', v: { how: 'bind', input: 'or' } },
    { t: 'Attaching, and O\'Neil', q: 'What if you attach input and type the name O\'Neil, which has a quote?', d: 'Even though it is an ordinary name, the SQL syntax breaks and an error occurs.', v: { how: 'concat', input: 'oneil' } },
    { t: 'Passing with ?, and O\'Neil', q: 'What if you pass O\'Neil with ?', d: 'Even with the quote, one row, O\'Neil, comes back without a problem.', v: { how: 'bind', input: 'oneil' } },
  ],
  // The code on the screen and the checking program (verify/spring/src/InjectionBasicProbe.java) compile and run the same text. The checking script compares it down to the characters.
  inp: { kim: 'kim', or: '\' OR \'1\'=\'1', oneil: 'O\'Neil' },
  code: function (c) {
    var l = ['// Only the lines inside main are shown (class, main declaration, and imports omitted)', '// The member table has three rows (name: kim, lee, O\'Neil)', '// Connection: connect to the database that the address points to', 'Connection conn = DriverManager.getConnection("jdbc:h2:mem:shop");', '// Input: let us say this is the text a user typed into an input box', 'String input = "' + this.inp[c.input] + '";'];
    if (c.how === 'bind') l.push('// SQL: leave the place for the value as ?', 'String sql = "SELECT name FROM member WHERE name = ?";', '// Send: pass the SQL text and the value separately', 'PreparedStatement ps = conn.prepareStatement(sql);', 'ps.setString(1, input);', 'ResultSet rs = ps.executeQuery();');
    else l.push('// SQL: attach the characters of input as they are between the characters of the SQL', 'String sql = "SELECT name FROM member WHERE name = \'" + input + "\'";', '// Send: send the SQL text completed by attaching, as a whole', 'Statement st = conn.createStatement();', 'ResultSet rs = st.executeQuery(sql);');
    l.push('// Read: print the name of each returned row', 'while (rs.next()) {', '    System.out.println(rs.getString("name"));', '}');
    return l.join('\n');
  },
  // The SQL text that goes to the database. With ?, the ? stays as it is; with attaching, input is mixed into the text
  sqlText: function (c) { return c.how === 'bind' ? 'SELECT name FROM member WHERE name = ?' : 'SELECT name FROM member WHERE name = \'' + this.inp[c.input] + '\''; },
  // The names of the rows that come back (values from the real run); err is an SQL syntax error
  outcome: function (c) {
    if (c.how === 'bind') return { err: false, names: { kim: ['kim'], or: [], oneil: ['O\'Neil'] }[c.input] };
    return c.input === 'oneil' ? { err: true, names: [] } : { err: false, names: c.input === 'kim' ? ['kim'] : ['kim', 'lee', 'O\'Neil'] };
  },
  label: function (c) { return (c.how === 'bind' ? 'Value passed separately with ?' : 'Attached to the text') + ' · Input ' + this.inp[c.input]; },
  errName: 'SQLException: SQL syntax error',
  columns: ['SQL the database received', 'Rows returned', 'How the input was handled'],
  simulate: function (c) {
    var bind = c.how === 'bind', k = c.input, I = this.inp[k], S = this.sqlText(c), o = this.outcome(c);
    var ev = [], sum = [], outs = [];
    // State: inp whether the input variable was made, sql the sql variable (''/made), tool the tool (none/ps/st), val whether a value was passed to the ? place, sent whether the SQL went to the database (''/go),
    //        ans the answer of the database (''/rows/err), n number of returned rows, hot the place that is moving now, log what has happened so far, outs the output, exc the exception
    var st = { inp: false, sql: '', tool: 'none', val: false, sent: '', ans: '', n: 0, hot: '', log: [], outs: [], exc: '', recv: 0 };
    function push(s, kk) { ev.push({ s: s, k: kk, snap: JSON.parse(JSON.stringify(st)) }); }
    var kind = { kim: 'It is an ordinary name.', or: 'It is a text with a quote and OR.', oneil: 'It is an ordinary name with a quote.' }[k];

    // 1. input
    st.inp = true; st.hot = 'in'; st.log.push(['String input', { v: 'Refers to the text: ' + I, cls: '' }]);
    push('String input = "' + I + '": the input variable refers to the text "' + I + '". ' + kind + ' In this lab, we take this to be the text a user typed into an input box, and instead of an input box we wrote the text in the code. The member table of the database has three rows: kim, lee, and O\'Neil.', '');

    // 2. the sql variable
    st.sql = 'made'; st.hot = '';
    if (bind) {
      st.log.push(['String sql', { v: 'SQL text with ? for the value', cls: '' }]);
      push('String sql = "SELECT name FROM member WHERE name = ?": the sql variable refers to the SQL text. The place for the value is left as ?, and the text of input does not go into this text. Nothing has been sent to the database yet.', '');
    } else {
      st.log.push(['String sql', { v: 'SQL text with input mixed in', cls: k === 'kim' ? '' : 'hot' }]);
      push('String sql = "SELECT name FROM member WHERE name = \'" + input + "\'": Java attaches the characters to complete the SQL text, and the sql variable refers to that text. The text is "' + S + '". ' +
        (k === 'kim' ? 'The text "kim" went into the place of input as it is.' : 'To Java, the quote that the writer of the SQL put in and the quote inside input are the same character, so it attaches them as they are without telling them apart.') +
        ' Nothing has been sent to the database yet.', k === 'kim' ? '' : 'bad');
    }

    // 3. the tool
    st.hot = 'tl';
    if (bind) {
      st.tool = 'ps'; st.log.push(['conn.prepareStatement', { v: 'ps created (1 ? place)', cls: '' }]);
      push('conn.prepareStatement(sql): creates a PreparedStatement object that holds the sql text, and ps refers to that object. The SQL that ps holds has 1 ? place and no value yet. This SELECT is not in the execution record of the database yet either.', '');
      // 4. the value
      st.val = true; st.hot = 'in';
      st.log.push(['ps.setString', { v: 'Value of the 1st ? place was set', cls: 'good' }]);
      push('ps.setString(1, input): passes the text of input as the value of the 1st ? place. ps holds the SQL text (as it is, with the ? place) and the value of place 1 separately. The text of input is not put into the SQL text.', 'good');
    } else {
      st.tool = 'st'; st.log.push(['conn.createStatement', { v: 'Tool for sending SQL created', cls: '' }]);
      push('conn.createStatement(): creates the tool (a Statement object) that sends SQL, and st refers to that object. Only the tool was created, so no SQL has gone to the database yet.', '');
    }

    // 5. send
    st.sent = 'go'; st.recv = 1; st.hot = 'tl';
    var tbl = 'name is "' + I + '"';
    if (bind) {
      st.ans = 'rows'; st.n = o.names.length;
      st.log.push(['ps.executeQuery', { v: 'Database ran it and returned a result (rows: ' + st.n + ')', cls: 'good' }]);
      push('ps.executeQuery(): ps handles the value separately from the SQL text, so the value is not read as SQL syntax. The SQL that the database ran is "' + S + '", and the text of input is nowhere in it. The database looks in the member table for rows whose name equals the value. ' +
        (k === 'or' ? 'The value is the whole text "' + I + '", and there are no rows where ' + tbl + ', so the result has 0 rows. The quote and OR in the value are not read as SQL syntax; they are just part of the name.'
          : k === 'oneil' ? 'There is 1 row where ' + tbl + '. The quote in the value is just part of the name, so it does not end or break the SQL.'
          : 'There is 1 row where ' + tbl + '.') +
        ' Java receives the result as ResultSet rs.', 'good');
    } else if (o.err) {
      st.ans = 'err'; st.exc = this.errName;
      st.log.push(['st.executeQuery', { v: 'Database answered with a syntax error', cls: 'bad' }]);
      push('st.executeQuery(sql): st sends the text of the sql variable to the database as a whole. The SQL that the database received is "' + S + '". While reading this text, the database reads the second quote, in \'O\' after name =, as the end of the string, and reads Neil as characters outside the string. The last quote opens a new string, but there is no closing quote. To put a quote inside a string, you have to write it twice, like \'\', but attached text has no such distinction. The database answers with a syntax error instead of a result (the error position is right after Neil), and JDBC turns this into an SQLException and throws it. There is no code to handle the exception, so the program stops at this line and the lines below do not run. Even though it was an ordinary name, the input became part of the SQL and broke it.', 'bad');
    } else {
      st.ans = 'rows'; st.n = o.names.length;
      st.log.push(['st.executeQuery', { v: 'Database ran it and returned a result (rows: ' + st.n + ')', cls: k === 'or' ? 'bad' : 'good' }]);
      push('st.executeQuery(sql): st sends the text of the sql variable to the database as a whole. The SQL that the database received is "' + S + '". The database reads this text from the start as SQL syntax and runs it. ' +
        (k === 'or' ? 'The quote in input is read as a quote of the SQL, so the condition becomes two conditions, name = \'\' and \'1\'=\'1\', joined by OR. There is no row whose name is an empty text, but \'1\'=\'1\' is true for every row, and OR counts a row as a match if either side is true, so every row becomes a result whatever its name. The result has 3 rows. The text the user wrote was read not as a value but as a command, a condition.'
          : 'It finds the rows where ' + tbl + ', and the result has 1 row.') +
        ' Java receives the result as ResultSet rs.', k === 'or' ? 'bad' : 'good');
    }

    // 6. read
    if (!o.err) {
      st.hot = 'rs'; st.outs = o.names.slice(); outs = st.outs;
      st.log.push(['while (rs.next())', { v: o.names.length ? 'Printed: ' + o.names.join(' / ') : 'No rows to loop over, so nothing printed', cls: k === 'or' && !bind ? 'bad' : '' }]);
      push(o.names.length
        ? 'while (rs.next()): reads the rows of rs one by one and prints name. The output is ' + o.names.join(', ') + '.' + (!bind && k === 'or' ? ' The code was meant to find one name, but the whole member table came out.' : '')
        : 'while (rs.next()): rs.next() is false from the start, so it does not enter the loop and there is no line to print. This is not an error; it is an empty result.', !bind && k === 'or' ? 'bad' : '');
    }

    // Summary: the first line is the answer to the question
    var key = c.how + '|' + k;
    var S2 = {
      'bind|kim': ['If you pass input with ?, the SQL text goes to the database as SELECT name FROM member WHERE name = ? as it is, and kim goes separately as a value, so one row, kim, comes back.', 'With one ordinary input, you cannot see what passing with ? prevents. Comparing it with the attaching way while changing the input is what the following questions do.'],
      'concat|kim': ['Even if you attach input and type kim, one row, kim, comes back. The result is the same as when you pass it with ?.', 'With an ordinary input, the results of the two ways are the same, so from the result alone you cannot tell which way was used. The difference is in the SQL text the database received. In the attached one, kim is mixed into the text.'],
      'concat|or': ['If you attach input, the input is read not as a value but as a condition of the SQL, and the SQL that finds one name becomes an SQL that returns every row. All three rows came back.', 'Text written by the user acting as an SQL command is SQL injection. If the code has a line that attaches the sql text, the shape of the SQL changes with the input.'],
      'bind|or': ['Even the same input is handled only as a value when you pass it with ?, so it looks for rows whose name is exactly that text, finds none, and 0 rows come back.', 'A value passed with ? is not read as SQL syntax even if it contains a quote and OR. The SQL text the database receives stays the same when the input changes.'],
      'concat|oneil': ['If you attach input, even the ordinary name O\'Neil, which has a quote, breaks the SQL syntax and causes an error.', 'Trouble happens even with ordinary input that is not an attack. It comes from the same cause: characters inside the input are read as characters of the SQL.'],
      'bind|oneil': ['If you pass O\'Neil with ?, one row, O\'Neil, comes back without a problem even though it has a quote.', 'Text passed as a value does not affect the SQL syntax even if it has a quote. The input that caused an error when attached is handled normally here.'],
    };
    S2[key].forEach(function (x) { sum.push(x); });
    var rowsText = o.err ? this.errName + ' (no rows returned)' : 'Rows: ' + o.names.length + (o.names.length ? ' (' + o.names.join(', ') + ')' : '');
    var way = bind ? 'Handled only as a value (not put into the SQL text)'
      : { kim: 'Becomes part of the SQL text (it is an ordinary text, so the result is the same)', or: 'Becomes part of the SQL text (the OR condition is read as SQL and runs)', oneil: 'Becomes part of the SQL text (the quote ends the string and breaks the syntax)' }[k];
    return { events: ev, summary: sum, outcome: o, row: [bind ? S + ' (value: ' + I + ')' : S, rowsText, way] };
  },
  render: function (v, sim, t, H, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : null;
    if (!s) { H.text(v, 'Click Run to start with the input variable being made to refer to the text.'); return; }
    H.table(v, ['Line run', 'What happened'], s.log.map(function (r) { return { cls: '', cells: [r[0], r[1]] }; }), 'What happened between Java and the database');
    H.counters(v, [[s.recv, 'SQL statements the database received'], [s.n, 'Rows returned'], [s.exc ? 1 : 0, 'Exceptions thrown']]);
  },
  // Diagram: on the left, three boxes of the Java program (input, the tool (ps or st), rs); on the right, the value box, the SQL text box, and the answer box of the database. With ?, there are separate paths from input to the value box of the database and to the SQL text; with attaching, input is mixed into the SQL text and goes along one path only.
  draw: function (P, sim, shown) {
    var c = sim.c, bind = c.how === 'bind', last = shown[shown.length - 1], s = last ? last.snap : null;
    P.size(680, 340);
    P.region('jv', 14, 12, 290, 178, 'Java program');
    P.region('db', 376, 12, 290, 178, 'DB (H2)');
    var I = this.inp[c.input];
    P.box('in', 24, 40, 270, 40, { cls: s && s.hot === 'in' ? 'hot now' : s && s.inp ? 'plain' : 'ghost', title: 'input', sub: s && s.inp ? I : 'Not yet' });
    var tsub = !s || s.tool === 'none' ? (s && s.sql ? 'Only the sql text was made' : 'Not yet') : s.tool === 'ps' ? (s.val ? '1 ? place · value passed' : '1 ? place · no value yet') : 'Tool that sends SQL';
    P.box('tl', 24, 92, 270, 40, { cls: s && s.hot === 'tl' ? 'hot now' : s && s.tool !== 'none' ? 'plain' : 'ghost', title: bind ? 'ps' : 'st', sub: tsub });
    var rsSub = !s || !s.ans ? 'Not yet' : s.ans === 'err' ? 'Not received' : s.n ? 'Rows in result: ' + s.n : 'Rows in result: 0';
    P.box('rs', 24, 144, 270, 40, { cls: s && s.ans === 'err' ? 'bad' : s && s.hot === 'rs' ? 'hot now' : s && s.ans ? 'plain' : 'ghost', title: 'rs', sub: rsSub });
    var vsub = !s || !s.sent ? 'Not yet' : bind ? '1 value arrived' : 'None (no separate value)';
    P.box('vl', 386, 40, 270, 40, { cls: s && s.sent && bind ? 'good' : 'ghost', title: 'Value the database received', sub: vsub });
    var csub = !s || !s.sent ? 'Not yet' : bind ? 'Text with a ? place' : 'Text with input mixed in';
    P.box('rc', 386, 92, 270, 40, { cls: s && s.ans === 'err' ? 'bad' : s && s.sent ? (bind ? 'wait' : (c.input === 'kim' ? 'wait' : 'hot')) : 'ghost', title: 'SQL text the database received', sub: csub });
    var an = !s || !s.ans ? 'No answer yet' : s.ans === 'err' ? 'Error: SQL syntax error' : 'Result: rows ' + s.n;
    P.box('an', 386, 144, 270, 40, { cls: s && s.ans === 'err' ? 'bad' : s && s.ans === 'rows' ? (!bind && c.input === 'or' ? 'bad' : 'good') : 'ghost', title: 'Answer of the database', sub: an });
    if (s && s.sent) {
      P.arrow('sq', 'tl:r', 'rc:l', { cls: s.ans === 'err' ? 'bad' : 'hot' });
      if (bind) P.arrow('vv', 'in:r', 'vl:l', { cls: 'good' });
    }
    if (s && s.ans === 'rows') P.arrow('rt', 'an:l', 'rs:r', { cls: !bind && c.input === 'or' ? 'bad' : 'good' });
    var recv = s && s.recv ? sim.row[0] : '';
    P.box('r1', 14, 204, 652, 36, { cls: s && s.recv ? (s.ans === 'err' ? 'bad' : 'wait') : 'ghost', title: 'SQL received', right: recv });
    P.box('r2', 14, 248, 652, 36, { cls: s && s.outs.length ? (!bind && c.input === 'or' ? 'bad' : 'good') : 'ghost', title: 'Printed values', right: s && s.outs.length ? s.outs.join(' / ') : '' });
    P.box('r3', 14, 292, 652, 36, { cls: s && s.exc ? 'bad' : 'ghost', title: 'Exception', right: s && s.exc ? s.exc : '' });
  },
  assume: 'We ran and checked this on JDK 21.0.12.1 and H2 2.4.240 (in-memory database), and we did not check by running on MySQL. For all six combinations, we put the code on the screen into Main.java, which has a main method (we added only import java.sql.* and the main declaration), compiled it with javax.tools, and ran each combination in a new Java process. Before the run, in the same process, we created the member table (id INT primary key, name VARCHAR(20)) and the three rows (1, kim), (2, lee), (3, O\'Neil); the screen leaves this preparation code out. We did not make an input box and wrote the text in the input variable. What we checked against is the three items of the result table. The SQL the database received is the SELECT left in H2\'s INFORMATION_SCHEMA.QUERY_STATISTICS (the execution record), and for the combination that could not run because of a syntax error, we judged that the error came from the parser of the database engine and that the error message quoted that SQL (the execution record was empty). The returned rows are the names the code printed, and the way the input was handled was obtained from the actual values. If the text of input is in the SQL the database received, it is "part of the SQL text", and if it is not, it is "handled only as a value"; what is in the parentheses was decided by whether an error occurred and whether more rows than the rows whose name equals input came back. In the first item of the result table, the value of the combination passed with ? is the text passed with setString in the code. That ps holds this value separately from the SQL text was checked from the form in which H2 shows ps as a string (the SQL text followed by {1: value}). In this form, the single quote inside the value is written twice because that is how H2 shows a value as an SQL text value, and it does not mean the value was put into the SQL text. As facts that the step sentences rely on, we also checked by running that this SELECT is not in the execution record of the database at the point after prepareStatement and setString and at the point after createStatement, and that ps has 1 ? place while the attached SQL has 0 ? places (the execution record shows no new record once it has been read, so we created a separate database for each point and read it only once). The error of the combination that attached O\'Neil is H2\'s SQLState 42000 (syntax error), the error position in the message was right after Neil, and the place where the error occurred was H2\'s reading of a string (Tokenizer.readCharacterString). The explanation on the screen ("the second quote ends the string, and the last quote opens a string that is not closed") is an interpretation fitted to this observation and to the H2 documentation that a quote inside a string must be written twice, and we did not trace directly how H2 splits the text. This error code is H2\'s, so it may differ on MySQL. How the SQL text is left in a real database log, and the order of the result rows (an order the database decides because there is no ORDER BY), are only what we saw in H2. We opened the documents directly. We followed the OWASP SQL Injection Prevention Cheat Sheet on these points: attaching strings and building queries from user input is dangerous (What Is a SQL Injection Attack?); with prepared statements the SQL is decided first and the values are passed later, and the database tells code and data apart whatever the input is (Defense Option 1); and the Java example uses ? in the SELECT and passes the value with setString, and an input such as tom\' or \'1\'=\'1 only looks for a name equal to that whole text (Safe Java Prepared Statement Example). In PreparedStatement of the Java SE 21 API documentation, we checked the explanation that it is a precompiled SQL statement, that the setter methods set the value of a ? place (an IN parameter), and that the place numbers start from 1; and in Statement, that it is an object used for executing a static SQL statement and that executeQuery(String) returns one ResultSet. The PreparedStatement documentation does not say how setString handles quotes, so the fact that the value is handled regardless of quotes is not something the documentation decides but a behavior we observed on this H2. On the grammar page of the H2 documentation we checked that a string value starts and ends with a single quote and that a single quote inside it is written twice, and in String Literals of the MySQL 8.4 documentation we checked the same rule (MySQL also allows putting \\ before the quote). We read all the opened documents through the summaries that the tool returned, and we did not read the whole original text. To keep the code on the screen short, it does not have the lines that close the connection and the ResultSet or the code that handles exceptions, and that the program stops at the line where the exception occurred and the lines below do not run was checked from the output being empty. This lab covers only SQL injection, and it does not cover input validation, escaping on output, permissions of the database account, other techniques used in real attacks, or cases where input is read as code in places other than SQL (HTML, commands, and so on). Web attacks in general (including XSS and CSRF) are covered in "Three web attacks", and JdbcTemplate, which reduces the repeated code of JDBC where you write SQL directly, in "JdbcTemplate and exception translation".',
});

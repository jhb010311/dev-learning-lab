Lab.register({
  id: 'durable_basic', nav: 'Storage and durability', cat: 'Fundamentals', mode: 'step', basic: true, deep: ['undoredo', 'bufferpool'],
  title: 'Does committed data stay after the server is turned off?',
  intro: 'A database is a program that stores data and gives it back when asked, and it usually stores the data in files on disk (as this lab shows, it can also be set to keep the data only in memory). The variables of a Java program are gone when the program ends, but data that went through COMMIT must still be there even if the database program stops suddenly and starts again. This property is called durability. In the code of this lab, two things decide it (depending on the database, a setting that writes the committed data to disk right away is also needed). One is COMMIT, the statement that makes the changes in a transaction final so that they are kept. The other is where the data is kept: if the connection address starts with the text jdbc:h2:file:, the data is kept in a file on disk, and if it starts with the text jdbc:h2:mem:, it is kept only in memory. In this lab you remove the COMMIT line or change where the data is kept, run the same INSERT, end the database program without any cleanup, start it again, and read the memo table (a name chosen for this lab). (This lab uses H2 in embedded mode, in which the Java program loads H2 and runs it in its own process. So "the database program stops" means that the Java program ends. A database such as MySQL is usually run as a separate program (a server), and in that case it is the database server program that stops. How a database keeps this promise (the log and the buffer) is covered in the in-depth labs.)',
  terms: ['Durability', 'Persistent and in-memory databases', 'Commit and rollback', 'H2 write delay (WRITE_DELAY)'],
  controls: [
    { id: 'commit', label: 'Write a COMMIT; line after the INSERT', type: 'check', value: true },
    { id: 'where', label: 'Where to keep the data (connection address)', type: 'select', value: 'file', options: [['file', 'A database that stores data in a file on disk (jdbc:h2:file:)'], ['mem', 'A database that keeps data only in memory (jdbc:h2:mem:)']] },
  ],
  // q is the question shown on the question-style screen. t and d are the name and the description used in the text-only reading
  presets: [
    { t: 'Default settings', q: 'What does an INSERT that goes through COMMIT look like, and what happens to that row if the database program stops suddenly and starts again?', d: 'In a database that stores data in a file, a row that went through COMMIT is still there after the database program stops suddenly and starts again.', v: { commit: true, where: 'file' } },
    { t: 'Removing COMMIT', q: 'What if you remove the COMMIT; line?', d: 'A row that was not committed is not there after the restart. The table is still there.', v: { commit: false, where: 'file' } },
    { t: 'A database that keeps data only in memory', q: 'What if you change the connection address to one for a database that keeps data only in memory (jdbc:h2:mem:shop)?', d: 'Even though COMMIT was done, after the restart even the table is gone.', v: { commit: true, where: 'mem' } },
    { t: 'No COMMIT and memory only', q: 'What if you also remove the COMMIT; line and use a database that keeps data only in memory?', d: 'The result is the same as with COMMIT. This database disappears as a whole, whether or not there is a COMMIT.', v: { commit: false, where: 'mem' } },
  ],
  // The code on the screen and the verification program (verify/spring/src/DurableBasicProbe.java) ran the same text. The verification script compares them character by character.
  code: function (c) {
    var l = [c.where === 'file' ? '-- Connect to a database that stores data in a file (jdbc:h2:file:./shop;WRITE_DELAY=0), and' : '-- Connect to a database that keeps data only in memory (jdbc:h2:mem:shop), and',
      'CREATE TABLE memo (id INT PRIMARY KEY, text VARCHAR(20));', '', '-- Start: treat everything from here as one transaction', 'BEGIN;', "INSERT INTO memo VALUES (1, 'hello');"];
    if (c.commit) l.push('-- Final: tell the database to keep the changes made so far', 'COMMIT;');
    l.push('', '-- After the database program stops suddenly and starts again, connect with the same address, and', 'SELECT * FROM memo;');
    return l.join('\n');
  },
  label: function (c) { return (c.commit ? 'COMMIT present' : 'COMMIT absent') + ' · ' + (c.where === 'file' ? 'Database stored in a file' : 'Memory-only database'); },
  columns: ['Rows of memo after the restart', 'COMMIT', 'Where it is stored'],
  simulate: function (c) {
    var file = c.where === 'file', k = !!c.commit, ev = [], sum = [], facts = {};
    // State: ps is the database program (off before start, on running, dead stopped suddenly, on2 started again), mt is whether the memo table is in the program, mn is the number of rows in it, mok is whether those rows are final,
    //       df is whether the database file is on disk, dt is whether the memo table is in that file, dn is the number of final rows in the file, wr is what was written to disk in this step,
    //       pre is the row this connection read before the stop, post is the result read after the restart
    var st = { ps: 'off', mt: 0, mn: 0, mok: false, df: false, dt: 0, dn: 0, wr: false, pre: '', post: '', log: [] };
    function push(s, kind) { ev.push({ s: s, k: kind, snap: JSON.parse(JSON.stringify(st)) }); }
    function calm() { st.wr = false; }

    // 1. Connect
    st.ps = 'on';
    st.log.push(['Connect', file ? 'Database stored in a file' : 'Memory-only database', '']);
    push(file
      ? 'Connect to the database. In the address, jdbc:h2:file:./shop means to store the content of the database in a file named ./shop (H2 makes it as a file called shop.mv.db). The WRITE_DELAY=0 setting at the end means to write what was committed to the file right away without putting it off. With the default settings, H2 puts off writing to the file after a COMMIT for up to 0.5 seconds (H2 documentation), so to test a sudden stop we made it write right away.'
      : 'Connect to the database. In the address, jdbc:h2:mem:shop means to keep the content of the database only in the memory of the computer, not in a file (mem means memory). This connection did not create a file.', '');

    // 2. CREATE TABLE
    calm(); st.mt = 1;
    if (file) { st.df = true; st.dt = 1; st.wr = true; }
    st.log.push(['CREATE TABLE', file ? 'Final right away, written to the file' : 'Final right away, in memory only', '']);
    push('CREATE TABLE memo: The database creates the memo table, which has two columns, id and text. There is no BEGIN yet, so this statement becomes final as soon as it runs (autocommit). ' +
      (file ? 'The content that became final is written to the database file on disk.' : 'It is final, but this database is memory only, so the table exists only in the memory of the database program.'), '');

    // 3. BEGIN
    calm();
    st.log.push(['BEGIN', 'Transaction starts', '']);
    push('BEGIN: The database starts treating the statements from now until COMMIT as one transaction. Autocommit is turned off, so changes inside this transaction are not final until they meet COMMIT.', '');

    // 4. INSERT
    calm(); st.mn = 1; st.mok = false; st.pre = '1 row';
    st.log.push(['INSERT', 'Inside the transaction, not final yet', 'hot']);
    push("INSERT INTO memo: The database puts the row (1, 'hello') into the memo table. It is a change inside the transaction, so it is not final yet. If you read the memo table on this connection, you see 1 row.", '');

    // 5. COMMIT or no COMMIT
    calm();
    if (k) {
      st.mok = true;
      if (file) { st.dn = 1; st.wr = true; }
      st.log.push(['COMMIT', file ? 'Final, also written to the file' : 'Final, in memory only', 'good']);
      push(file
        ? 'COMMIT: The database makes the transaction final. Because of the WRITE_DELAY=0 setting, it writes the final change to the database file right away. Now the 1 row is in the memory of the program and also in the file on disk. Autocommit is turned on again.'
        : 'COMMIT: The database makes the transaction final. But this database is memory only, so the final row also exists only in the memory of the program, and nothing is written to disk. Autocommit is turned on again.', 'good');
    } else {
      st.log.push(['(No COMMIT)', 'Transaction not ended', 'bad']);
      push('This code has no COMMIT line, so the transaction did not end and the INSERT stays not final. If you read on this connection, you still see 1 row, but ' + (file ? 'the database file on disk has no final row.' : 'this database is memory only anyway.'), 'bad');
    }

    // 6. Stops suddenly
    calm(); st.ps = 'dead'; st.mt = 0; st.mn = 0; st.mok = false;
    st.log.push(['Database program stopped suddenly', 'Memory content is gone', 'bad']);
    push('This is not in the code. The database program stops suddenly. The program ends right away without closing the connection or going through a shutdown procedure (in the experiment we ended it with the Java method Runtime.halt). The memo table and rows that were in the memory of the program are all gone.' +
      (file ? ' The database file on disk stays.' : ' This database wrote nothing to disk.') + ' (We tested the case where only the program ends, not a power loss.)', 'bad');

    // 7. Starts again
    calm(); st.ps = 'on2';
    var fin; // the result for memo after the restart
    if (file) {
      st.mt = st.dt; st.mn = st.dn; st.mok = st.dn > 0;
      st.log.push(['Database program started again', 'Opened the file', '']);
      push('The database program starts again and connects with the same address. The ./shop file stays on disk, so the database opens that file and can read its content. Even though the connection was not closed when it stopped, the file opened without an error.', '');
      fin = st.dn ? '1 row (1, hello)' : '0 rows (the memo table exists)';
    } else {
      st.log.push(['Database program started again', 'Starts as an empty database', '']);
      push('The database program starts again and connects with the same address. A memory-only database starts from empty memory every time it starts. Even with the same name, the earlier database disappeared with the memory, and there is no file on disk to read. The database is empty now.', '');
      fin = 'Error: the memo table does not exist';
    }

    // 8. SELECT
    calm(); st.post = file ? (st.dn ? '1 row (1, hello)' : '0 rows') : 'Error: no table';
    var good = file && k;
    st.log.push(['SELECT', fin, good ? 'good' : 'bad']);
    if (file && k) push('SELECT * FROM memo: The result is 1 row (1, hello). The row made final by COMMIT was in the file on disk, so it is still there after the database program stopped suddenly and started again.', 'good');
    else if (file) push('SELECT * FROM memo: The result is 0 rows. The memo table is still there, because CREATE TABLE was already final before BEGIN and was written to the file. But the row of the INSERT that was not made final by COMMIT cannot be seen in the restarted database.', 'bad');
    else push('SELECT * FROM memo: The database answers with an error. It is not that there are 0 rows; the error says that the memo table itself does not exist (the message says the database is empty). Everything from CREATE TABLE to INSERT was only in memory and disappeared together.' + (k ? ' It is the same even though COMMIT was done.' : ' The result would have been the same even if there had been a COMMIT line.'), 'bad');

    // Summary: the first line is the answer to the question
    if (file && k) {
      sum.push('The row that was made final with COMMIT was still there after the database program stopped suddenly and started again. This is because the row was in a file on disk. Unlike memory, which is lost when a program ends, a file on disk stays when the program stops, and COMMIT is the statement that makes a change final so that it is kept in that file.');
      sum.push('This property, that a change made final by COMMIT stays after a shutdown, is called durability. In this lab we added the WRITE_DELAY=0 setting to the address so that the data is written to the file together with COMMIT. Without it, with the H2 default settings, when we stopped right after COMMIT, none of the five runs had the committed row, and when we waited 1.5 seconds before stopping, it stayed in both runs. How a database keeps this promise (the log and the buffer) is covered in the in-depth labs.');
    } else if (file) {
      sum.push('If you remove the COMMIT line, the inserted row was not there after the restart (0 rows). The memo table was still there.');
      sum.push('Even when the database file is on disk, only what was made final stays. Creating the table was already final before BEGIN, so it stayed, and the INSERT inside the transaction did not stay because there was no COMMIT.');
    } else if (k) {
      sum.push('With a memory-only database, even after COMMIT, the memo table did not exist at all after the restart.');
      sum.push('COMMIT is the statement that makes a change final, and where it is stored depends on where the database keeps it. A memory-only database has no file, so like a variable in a Java program it is gone when the program ends. Durability needs both COMMIT and a file.');
    } else {
      sum.push('With no COMMIT line and a memory-only database, the memo table did not exist at all after the restart. The result is the same as with COMMIT.');
      sum.push('This database had all its content only in memory, whether or not there was a COMMIT. In the four combinations of this lab, the result after the restart depended on COMMIT only when the database was stored in a file.');
    }
    facts.pre = '1'; facts.autoAfterBegin = 'false'; facts.autoAfterCommit = k ? 'true' : undefined;
    facts.files1 = file ? 'shop.mv.db' : ''; facts.files2 = file ? 'shop.mv.db' : '';
    facts.opened = 'true'; facts.errKind = file ? '' : 'table';
    return { events: ev, summary: sum, facts: facts, row: [fin, k ? 'Present' : 'Absent', file ? 'File on disk (shop.mv.db)' : 'Memory only (no file)'] };
  },
  render: function (v, sim, t, H, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : null;
    if (!s) { H.text(v, 'Click Run to start with connecting to the database.'); return; }
    var ps = { off: 'Before start', on: 'Running', dead: 'Stopped suddenly', on2: 'Started again' }[s.ps];
    H.table(v, ['Place', 'Content'], [
      { cls: '', cells: ['Database program', { v: ps, cls: s.ps === 'dead' ? 'bad' : '' }] },
      { cls: '', cells: ['Memory of the program', s.mt ? 'memo table · ' + s.mn + (s.mn === 1 ? ' row' : ' rows') + (s.mn && !s.mok ? ' (not final yet)' : '') : 'Empty'] },
      { cls: '', cells: ['Database file on disk', sim.c.where === 'mem' ? 'None' : !s.df ? 'Not yet' : s.dt ? 'memo table · final rows: ' + s.dn : 'Empty'] },
    ], 'Where the data is');
    H.table(v, ['Statement run', 'Result'], s.log.map(function (r) { return { cls: '', cells: [r[0], { v: r[1], cls: r[2] }] }; }), 'What happened');
    H.counters(v, [[s.mn, 'Rows in the memory of the program'], [s.dn, 'Final rows in the file on disk']]);
  },
  // Diagram: the top is the state of the database program, the left is memory, which is lost when it stops, and the right is the database file on disk, which stays even when it stops. When the transaction is made final, an arrow appears toward the file, and when it stops, the left is emptied. The bottom is the rows read before the stop and after the restart.
  draw: function (P, sim, shown) {
    var c = sim.c, file = c.where === 'file', last = shown[shown.length - 1], s = last ? last.snap : null;
    P.size(680, 290);
    var ps = !s ? 'Before start' : { off: 'Before start', on: 'Running', dead: 'Stopped suddenly', on2: 'Started again' }[s.ps];
    P.box('ps', 14, 12, 652, 36, { cls: s && s.ps === 'dead' ? 'bad' : s && s.ps !== 'off' ? 'good' : 'ghost', title: 'Database program', right: ps });
    P.region('rm', 14, 64, 280, 130, 'Memory (lost when it stops)');
    P.region('rd', 386, 64, 280, 130, file ? 'Disk (stays when it stops)' : 'Disk (not used with this setting)');
    var mt = s ? s.mt : 0, mn = s ? s.mn : 0;
    P.box('m1', 26, 98, 256, 58, { cls: !mt ? 'ghost' : mn && !s.mok ? 'hot' : 'wait', title: 'memo table', sub: !mt ? 'None' : mn ? 'Rows: ' + mn + ' · ' + (s.mok ? 'final' : 'not final yet') : 'Rows: 0' });
    if (file) {
      var dsub = !s || !s.df ? 'Not yet' : s.dt ? 'memo table · final rows: ' + s.dn : 'Empty';
      P.box('d1', 398, 98, 256, 58, { cls: s && s.wr ? 'good now' : s && s.df ? 'plain' : 'ghost', title: 'shop.mv.db', sub: dsub });
    } else P.box('d1', 398, 98, 256, 58, { cls: 'ghost', title: 'No file', sub: 'Memory-only database' });
    if (file && s && s.wr) P.arrow('wr', 'm1:r', 'd1:l', { cls: 'good' });
    P.box('n1', 14, 214, 322, 36, { cls: s && s.pre ? 'wait' : 'ghost', title: 'Read before the stop', right: s ? s.pre : '' });
    P.box('n2', 344, 214, 322, 36, { cls: s && s.post ? (s.post.indexOf('1 row') === 0 ? 'good' : 'bad') : 'ghost', title: 'Read after restart', right: s ? s.post : '' });
  },
  assume: 'It was run and checked against H2 2.4.240 (JDK 21.0.12.1), and it was checked against H2, not MySQL. For all 4 combinations, it ran the whole SQL on the screen, including the comment lines, exactly as written. It connected with the address written in the comment on the first line, and it sent each comment line to the database together with the statement that follows it. First, a new Java process ran the statements up to the line "After the database program stops suddenly" one statement at a time, and then it ended the process right away with the Runtime.halt method, without closing the connection or running any shutdown procedure (exit code 7). After that, another new Java process connected with the same address and ran the SELECT after that line. The address ./shop of the file database is a file in a folder made separately for each combination. What it checked is the three items of the result table, that is, the rows read after the restart (the number of rows and the values, or the kind of the error), whether the COMMIT line is there, and the files made in the folder. The file database was opened again after the stop without any cleanup, and of the 4 combinations, only the one with a COMMIT on the file database kept its row. The memory database made no file in the folder, and on the restarted connection there was an error that the memo table does not exist (H2 error code 42104, with "this database is empty" in the message). The original text of the error is in the Probe output, and the screen shows only the kind of the error. As the facts the step sentences rely on, it also checked by execution that autocommit is off after BEGIN and on again after COMMIT, that reading on the same connection right before the stop shows 1 row, and that CREATE TABLE is final before BEGIN, so the table stays even after a stop without COMMIT. The code on the screen has no query for this checking, and the column name text of the memo table could be used in H2. An important point: we added ;WRITE_DELAY=0 to the address of the file database in this lab. The H2 documentation (the SET WRITE_DELAY entry on the Commands page) says that it sets the maximum delay between a COMMIT and writing the log to the file in milliseconds, that the default is 500, and that it can be added to the database address as ;WRITE_DELAY=0. With the H2 default settings, without this setting, when the process was ended right after COMMIT on a file database, none of the five runs had the memo table or the row after the restart (the database file was there but empty), and when the process was ended after waiting 1.5 seconds after COMMIT, the row stayed in both runs. So the "it stays if you COMMIT" in this lab is a result observed with the WRITE_DELAY=0 setting. The H2 documentation (Durability Problems on the Advanced page) also explains that by default H2 puts off writing committed content to the file, that if the power goes off, a bit more than one second of committed content can be lost, and that complete durability is hard because hard disks often do not obey fsync. And this lab ended only the process and did not cut the power; because file writes that the operating system has accepted stay even when a process ends, durability when the power goes off was not checked by execution. That a memory database disappears when its last connection is closed (or when the program ends) follows the H2 documentation (In-Memory Databases on the Features page), and in this lab the case where the process ended was checked by execution. The MySQL 8.4 documentation page "InnoDB and the ACID Model" says that durability is a property decided together by the MySQL software and hardware settings, and lists innodb_flush_log_at_trx_commit, sync_binlog, fsync() support, and the write buffer of the storage device as related factors, and the ACID entry of the glossary says that when a commit succeeds, the changes are safe from power failures and system crashes, and that durability usually means writing to disk. We opened these documents directly and checked them, but we did not run to see whether MySQL gives the same result. This lab covers only the outward look of durability, that is, whether data stays after a stop and restart depending on COMMIT and where the data is stored. How the log and the buffer pool keep this is covered in the in-depth labs "Undo and redo logs" and "Buffer pool and pages", and the transaction itself in "Transactions".',
});

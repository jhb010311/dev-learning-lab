Lab.register({
  id: 'dblock_basic', nav: 'Row locks', cat: 'Fundamentals', mode: 'step', basic: true, deep: ['iso', 'stock', 'dbdeadlock', 'gaplock'],
  title: 'What happens when two transactions try to change the same row?',
  why: 'If two requests change the balance of the same account almost at the same time, one can overwrite the value changed by the other, so that money seems to disappear or increase. A DB row lock makes other transactions that try to change the same row wait until the transaction that changed it first ends, so that a row is changed by only one at a time.',
  use: 'The DB takes the lock by itself where several requests change the same row, such as reducing stock, subtracting a balance, and reserving a seat. When you need to read a value and then change it based on what you read, the row is sometimes locked from the moment of reading with SELECT ... FOR UPDATE. If a transaction is kept open for a long time, other requests wait one after another, so nothing that takes a long time is done while a lock is held.',
  intro: 'Many connections can work with a database at the same time. When one connection changes a row with UPDATE, the database puts a lock on that row. A lock is a mark that says "I am changing this row, so other connections must not change it." The SQL we write has no statement for this; the database takes the lock by itself when it receives the UPDATE. The lock is not released until the transaction of that connection ends with COMMIT or ROLLBACK. If another connection tries to change the same row, the database makes that UPDATE wait until the lock is released, and if it waits too long, the database ends it with an error. In this lab you change the row that connection B updates and remove the COMMIT of connection A, run the same SQL, and see when the UPDATE of B runs and what the final balances are.',
  terms: ['Row locks', 'Transaction', 'Shared locks and exclusive locks', 'Lock wait timeout'],
  controls: [
    { id: 'row', label: 'Row that B updates', type: 'select', value: 'same', options: [['same', 'The row with id 1 (the same row that A changes)'], ['other', 'The row with id 2 (not the row that A changes)']] },
    { id: 'end', label: 'How A ends its transaction', type: 'select', value: 'commit', options: [['commit', 'End with COMMIT'], ['hold', 'Do not write COMMIT and keep holding the transaction']] },
  ],
  // q is the question shown on the question-style screen. t and d are the name and the description used in the text-only reading
  presets: [
    { t: 'Default settings', q: 'What does code that changes the same row from two connections look like, and what happens if B also runs UPDATE on the id 1 row that A changed, before A runs COMMIT?', d: 'The same row. The UPDATE of B waits until A runs COMMIT, and runs after that.', v: { row: 'same', end: 'commit' } },
    { t: 'B changes a different row', q: 'What if B runs UPDATE on the row with id 2 instead of id 1?', d: 'The other row has no lock, so the UPDATE of B runs right away, before the COMMIT of A.', v: { row: 'other', end: 'commit' } },
    { t: 'Removing the COMMIT of A', q: 'What if you remove the COMMIT of A?', d: 'A does not release the lock, so the UPDATE of B waits and then ends with a timeout error.', v: { row: 'same', end: 'hold' } },
    { t: 'Removing the COMMIT of A and B changes a different row', q: 'What if you remove the COMMIT of A and B runs UPDATE on the row with id 2?', d: 'Even though A holds the id 1 row, B changes a different row, so it does not wait.', v: { row: 'other', end: 'hold' } },
  ],
  // The code on the screen and the verification program (verify/spring/src/DbLockBasicProbe.java) ran the same text. The verification script compares them character by character.
  code: function (c) {
    var l = ['CREATE TABLE account (id INT PRIMARY KEY, balance INT);', 'INSERT INTO account VALUES (1, 1000), (2, 1000);', '',
      '-- Connection A (runs first)', 'BEGIN;', '-- The row being changed gets a lock, and it is kept until this transaction ends',
      'UPDATE account SET balance = balance - 100 WHERE id = 1;'];
    if (c.end === 'commit') l.push('-- End: make the transaction final and release the lock', 'COMMIT;');
    l.push('', '-- Connection B (runs after the UPDATE of A)', 'BEGIN;', '-- The database first checks whether another connection holds a lock on the row to be changed',
      'UPDATE account SET balance = balance + 50 WHERE id = ' + (c.row === 'same' ? '1' : '2') + ';', 'COMMIT;');
    return l.join('\n');
  },
  label: function (c) { return 'B changes the id ' + (c.row === 'same' ? '1' : '2') + ' row · ' + (c.end === 'commit' ? 'A ended with COMMIT' : 'A did not end'); },
  columns: ['UPDATE of B', 'Final balances', 'Why it waited'],
  simulate: function (c) {
    var same = c.row === 'same', commit = c.end === 'commit', tgt = same ? 1 : 2, ti = tgt - 1, ev = [], sum = [];
    // State: r is the two rows of account (bal final balance, lock the connection that holds the lock, pend value before it is final, wait B is waiting, hot just made final),
    //       a and b are the boxes of the two connections, fl.b is the UPDATE arrow of B (wait waiting, stop ended with an error, pass ran), log is the statements run
    var st = { r: [{ bal: 1000, lock: '', pend: null, wait: false, hot: false }, { bal: 1000, lock: '', pend: null, wait: false, hot: false }],
      a: { cls: 'ghost', sub: ['Not started'] }, b: { cls: 'ghost', sub: ['Not started'] }, fl: { b: '' }, log: [], waiting: 0 };
    function push(s, k) { ev.push({ s: s, k: k, snap: JSON.parse(JSON.stringify(st)) }); }
    function calm() { st.r.forEach(function (r) { r.hot = false; }); st.fl.b = ''; }
    function locked() { return st.r.filter(function (r) { return r.lock; }).length; }
    function rowsText() { return '(1, ' + st.r[0].bal + '), (2, ' + st.r[1].bal + ')'; }
    var idTxt = 'the id ' + tgt + ' row';

    // 1. Prepare the table
    st.log.push(['CREATE TABLE, INSERT', 'Accounts 1 and 2 have balance 1000', '']);
    push('CREATE TABLE and INSERT: The database creates the account table and puts a balance of 1000 in each of account 1 and account 2. The path a program uses to reach the database is called a connection, and many connections can be attached to a database at the same time. In the code on the screen, the "Connection A" and "Connection B" parts are the SQL that one connection each sends, and the two connections write to the same table at the same time. We follow it one statement at a time in time order, not in the order of the parts, starting from the next step.', '');

    // 2. A: BEGIN
    calm(); st.a = { cls: 'plain', sub: ['Transaction in progress'] };
    st.log.push(['A: BEGIN', 'Transaction starts', '']);
    push('BEGIN (connection A): Connection A starts a transaction. This transaction continues until it meets COMMIT or ROLLBACK.', '');

    // 3. A: UPDATE account 1
    calm(); st.r[0].lock = 'A'; st.r[0].pend = 900; st.a = { cls: 'hot', sub: ['Changing the id 1 row', 'Not final: 900'] };
    st.log.push(['A: UPDATE id 1', 'Changed to 900 · lock acquired', '']);
    push('UPDATE account SET balance = balance - 100 WHERE id = 1 (connection A): The database changes the balance of the id 1 row from 1000 to 900. At this moment the database puts a lock on this row. There is no statement in the SQL we wrote that takes the lock; the database does it by itself when it receives the UPDATE. The lock is not released until this transaction ends with COMMIT or ROLLBACK. 900 is not final yet, so if another connection reads this row, it sees 1000.', '');

    // 4. B: BEGIN
    calm(); st.b = { cls: 'plain', sub: ['Transaction in progress'] };
    st.log.push(['B: BEGIN', 'Transaction starts', '']);
    push('BEGIN (connection B): Connection B also starts its own transaction. A and B are different connections, so their transactions are separate too.', '');

    // 5. B: UPDATE
    calm();
    var q5 = 'UPDATE account SET balance = balance + 50 WHERE id = ' + tgt + ' (connection B): ';
    if (same) {
      st.r[0].wait = true; st.waiting = 1; st.fl.b = 'wait'; st.b = { cls: 'wait now', sub: ['UPDATE is waiting', 'Row id 1 is locked'] };
      st.log.push(['B: UPDATE id 1', 'Waiting', 'bad']);
      push(q5 + 'B tries to change the same id 1 row as A. The database first checks whether another connection holds a lock on this row. The lock of A is on it, so the UPDATE of B cannot run and waits. B stops at this statement and cannot go on to the next one. (Only a statement that changes the row waits. When another connection read this row with SELECT at the same time, it did not wait and read 1000 right away. Checked on H2.)', 'bad');
    } else {
      st.r[1].lock = 'B'; st.r[1].pend = 1050; st.fl.b = 'pass'; st.b = { cls: 'hot', sub: ['Changing the id 2 row', 'Not final: 1050'] };
      st.log.push(['B: UPDATE id 2', 'Changed to 1050 · lock acquired', 'good']);
      push(q5 + 'B tries to change the id 2 row, which is different from the row of A. The database first checks whether another connection holds a lock on this row. The only row A has locked is the id 1 row, and the id 2 row has no lock, so the UPDATE of B does not wait and runs right away, and the balance goes from 1000 to 1050. The database puts the lock of B on this row.', 'good');
    }

    // 6. A ends (or does not end)
    var bRan = 'none';
    if (commit) {
      calm(); st.r[0].bal = 900; st.r[0].pend = null; st.r[0].lock = ''; st.r[0].hot = true; st.a = { cls: 'good', sub: ['Final with COMMIT', 'Lock released'] };
      st.log.push(['A: COMMIT', '900 made final · lock released', 'good']);
      if (same) {
        st.r[0].wait = false; st.waiting = 0; st.b = { cls: 'wait', sub: ['A released its lock', 'Its UPDATE runs next'] };
        push('COMMIT (connection A): A makes its transaction final. The 900 in the id 1 row is now final and can be read from other connections, and the lock that A held is released. B was waiting, so the database right away continues the UPDATE of B.', 'good');
        // 7. The UPDATE of B continues
        calm(); st.r[0].wait = false; st.waiting = 0; st.r[0].lock = 'B'; st.r[0].pend = 950; st.fl.b = 'pass'; st.b = { cls: 'hot', sub: ['Changing the id 1 row', 'Not final: 950'] };
        st.log.push(['B: UPDATE id 1', 'Ran after the COMMIT of A · 950', 'good']);
        push('The UPDATE of B continues. The database reads the current balance of the id 1 row and adds 50. It adds to the 900 that A made final, so the balance becomes 950, and the change of A is not erased. Now the lock of B is on this row.', 'good');
        bRan = 'after';
      } else {
        push('COMMIT (connection A): A makes its transaction final. The 900 in the id 1 row is now final and can be read from other connections, and the lock that A held is released. No connection was waiting. B had already finished its UPDATE.', 'good');
        bRan = 'before';
      }
    } else if (same) {
      calm(); st.r[0].wait = false; st.waiting = 0; st.fl.b = 'stop'; st.a = { cls: 'hot', sub: ['Not ended, still holding', 'Lock is not released'] }; st.b = { cls: 'bad', sub: ['UPDATE ended: error', 'Timed out while waiting'] };
      st.log.push(['B: UPDATE id 1', 'Timed out while waiting: error', 'bad']);
      push('Time passes, but A runs neither COMMIT nor ROLLBACK. This is because the code has no COMMIT. The lock of A is not released, and B cannot get the lock even after waiting for the time the database has set. Then the database ends the UPDATE of B with an error. It is the error for timing out while waiting for a lock. B could not change the id 1 row. Only this UPDATE statement ended with the error, and the transaction of B stays open.', 'bad');
      bRan = 'timeout';
    } else {
      calm(); st.a = { cls: 'hot', sub: ['Not ended, still holding', 'Lock is not released'] };
      st.log.push(['A: (no COMMIT)', 'Still holding the lock', 'hot']);
      push('A runs neither COMMIT nor ROLLBACK. Because the code has no COMMIT, A keeps holding the lock on the id 1 row. B changed a different row, so it was not affected.', '');
      bRan = 'before';
    }

    // 8. B: COMMIT
    calm();
    var bFixed = (same && bRan === 'timeout') ? false : true;
    if (bFixed) {
      st.r[ti].bal = st.r[ti].pend; st.r[ti].pend = null; st.r[ti].lock = ''; st.r[ti].hot = true;
      st.b = { cls: 'good', sub: ['Final with COMMIT', 'Lock released'] };
      st.log.push(['B: COMMIT', 'id ' + tgt + ' row ' + st.r[ti].bal + ' made final', 'good']);
      var tail = same ? ' Now the id 1 row has both the -100 of A and the +50 of B applied and is 950, and the lock of B is released too.'
        : ' The lock of B is released.' + (commit ? ' A and B changed different rows, so neither waited for the other.' : ' A has still not ended and holds the lock on the id 1 row.');
      push('COMMIT (connection B): B makes its transaction final. The ' + st.r[ti].bal + ' in the id ' + tgt + ' row is now final and can be read from other connections.' + tail, 'good');
    } else {
      st.b = { cls: 'plain', sub: ['Ended with COMMIT', 'Nothing was changed'] };
      st.log.push(['B: COMMIT', 'No change to make final', '']);
      push('COMMIT (connection B): B ends its transaction. B could not change anything, so there is no change to make final.', '');
    }

    // 9. Read on a new connection
    calm();
    var fin = rowsText();
    st.log.push(['Read on a new connection', fin, '']);
    var after = same && commit ? 'The -100 of A and the +50 of B were applied in order.'
      : !same && commit ? 'The id 1 row that A changed and the id 2 row that B changed were each applied.'
      : same ? 'The change of A is not final, so it is not read, and the change of B did not run, so the values are still the first ones. Even while A holds the lock, this read did not wait and finished right away. Reading after closing the connection of A gave the same result (checked on H2).'
      : 'The id 2 row that B changed is final and is 1050, and the id 1 row that A changed is not final and is 1000. The change of A is not read, and this read did not wait either.';
    push('After all the statements have ended, we read the accounts on a new connection. The result is ' + fin + '. ' + after, same && !commit ? 'bad' : '');

    // Summary: the first line is the answer to the question
    var key = c.row + '|' + c.end;
    var S = {
      'same|commit': ['A row lock is a mark that the database puts on a row when an UPDATE changes it. It is not released until the transaction ends, so the UPDATE of B on the same row waited until A ran COMMIT, and ran after that.', 'The lock is taken not by the SQL we wrote but by the database that received the UPDATE. B added 50 to the 900 that A made final and got 950, so the two changes did not overwrite each other.'],
      'other|commit': ['When B changes a different row (id 2), it does not wait. When a row is found by its primary key and changed, the lock is put only on that row, so the UPDATE of B ran right away, before the COMMIT of A.', 'Even though the two connections changed the same table, they did not block each other because the rows were different. In this lab, waiting happened only when both changed the same row at the same time.'],
      'same|hold': ['If A keeps holding the transaction without COMMIT or ROLLBACK, the lock is not released, and the UPDATE of B on the same row waits and then ends with a timeout error.', 'B changed nothing, and the balances are still the first ones. If you leave a transaction open without ending it, another connection that tries to change that row can wait and get the same error.'],
      'other|hold': ['Even if A does not end and keeps holding the lock, it makes no difference when B changes a different row (id 2). The UPDATE of B ran right away, and it finished with COMMIT, so 1050 in the id 2 row became final.', 'The only row that was held is the id 1 row that A changed. Only a connection that tries to change this row has to wait.']
    };
    S[key].forEach(function (x) { sum.push(x); });

    var upd = bRan === 'timeout' ? 'Timed out while waiting' : bRan === 'after' ? 'Ran after the COMMIT of A' : 'Ran right away';
    var why = same ? (commit ? 'The lock of A was on the same row' : 'A did not release the lock on the same row') : 'Did not wait: a different row, so no lock';
    return { events: ev, summary: sum, row: [upd, fin, why] };
  },
  render: function (v, sim, t, H, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : null;
    if (!s) { H.text(v, 'Click Run to go through the statements one at a time, starting with CREATE TABLE.'); return; }
    H.table(v, ['Account', 'Final balance (the value other connections read)', 'Lock'], s.r.map(function (r, i) {
      var lk = r.lock ? (r.lock + ' holds the lock' + (r.wait ? ' · B is waiting' : '')) : 'None';
      return { cls: '', cells: ['Account ' + (i + 1), { v: String(r.bal), cls: r.hot ? 'good' : '' }, { v: lk, cls: r.wait ? 'bad' : r.lock ? 'hot' : '' }] };
    }), 'account table');
    H.table(v, ['Statement run', 'Result'], s.log.map(function (r) { return { cls: '', cells: [r[0], { v: r[1], cls: r[2] }] }; }), 'Statements and results');
    var n = s.r.filter(function (r) { return r.lock; }).length;
    H.counters(v, [[n, 'Rows with a lock'], [s.waiting, 'Connections waiting']]);
  },
  // Diagram: connection A and connection B on the left, the two rows of the account table on the right. A row with a lock is yellow (A) or blue (B), and the UPDATE arrow of B is cut off before it reaches the row when it waits or ends with an error.
  draw: function (P, sim, shown) {
    var c = sim.c, last = shown[shown.length - 1], s = last ? last.snap : null, ti = c.row === 'same' ? 0 : 1;
    P.size(680, 322);
    P.box('ca', 14, 20, 200, 96, { cls: s ? s.a.cls : 'ghost', title: 'Connection A', sub: s ? s.a.sub : ['Not started'] });
    P.box('cb', 14, 150, 200, 96, { cls: s ? s.b.cls : 'ghost', title: 'Connection B', sub: s ? s.b.sub : ['Not started'] });
    P.region('tb', 380, 10, 286, 236, 'account table');
    [0, 1].forEach(function (i) {
      var r = s ? s.r[i] : { bal: 1000, lock: '', pend: null, wait: false, hot: false };
      var sub = r.lock ? r.lock + ' has lock' + (r.pend !== null ? ' · not final ' + r.pend : '') : 'No lock';
      P.box('r' + i, 392, 36 + i * 100, 262, 80, { cls: r.hot ? 'good' : r.lock === 'A' ? 'hot' : r.lock === 'B' ? 'wait' : 'plain', title: 'Account ' + (i + 1) + ' · final balance ' + r.bal, sub: r.wait ? [sub, 'B is waiting'] : [sub] });
    });
    if (s && s.r[0].lock === 'A') P.arrow('aa', 'ca:r', 'r0:l:0.3', { cls: 'hot' });
    if (s && (s.fl.b || s.r[ti].lock === 'B')) {
      if (s.fl.b === 'wait' || s.fl.b === 'stop') {
        P.arrow('ab', 'cb:r', [368, 100], { cls: s.fl.b === 'stop' ? 'bad' : 'dash' });
        P.text('x', 374, 104, '×', { cls: 'bad', anchor: 'middle', bold: true });
      } else P.arrow('ab', 'cb:r', 'r' + ti + ':l:0.7', { cls: s.fl.b === 'pass' ? 'good' : 'hot' });
    }
    var n = s ? s.r.filter(function (r) { return r.lock; }).length : 0, w = s ? s.waiting : 0;
    P.box('n1', 14, 266, 322, 36, { cls: n ? 'hot' : 'ghost', title: 'Rows with a lock', right: String(n) });
    P.box('n2', 344, 266, 322, 36, { cls: w ? 'bad' : 'ghost', title: 'Connections waiting', right: String(w) });
    if (s && s.fl.b === 'wait') P.note('The dashed arrow cut off at × means that the UPDATE of B cannot reach the row because of the lock of A, and is waiting.');
    else if (s && s.fl.b === 'stop') P.note('The red arrow means that the UPDATE of B waited and then ended with an error.');
  },
  assume: 'It was run and checked against H2 2.4.240 (in-memory database, JDBC), and it was not checked against execution on MySQL. For all 4 combinations, it built the whole SQL on the screen (including the comment lines), split it into the "Connection A" and "Connection B" parts, and ran each part exactly as written, with connection A (the main thread) and connection B (a thread). The order of execution is the BEGIN and UPDATE of A, the BEGIN of B, the UPDATE attempt of B, the COMMIT of A (if there is one), and the COMMIT of B. It created a new in-memory database with a name (DB_CLOSE_DELAY=-1) for each combination so that the two connections look at the same database, and it left the isolation level at the H2 default, READ COMMITTED. What it checked is the three items of the result table. They are whether the UPDATE of B was still not finished after 0.4 seconds and whether it finished later than the time of the COMMIT of A (the times were recorded and compared), the kind of error if there was one (the SQLSTATE of H2 is HYT00, the error code is 50200, and the first line of the message is Timeout trying to lock table "ACCOUNT"; H2 writes the table name in the message even for a row lock), and the balances read on a new connection after all the statements ended. For the combinations that did not end, the read was also made while A held the lock, and the value read after closing the connection of A was the same. The time to wait for a lock was shortened to 1 second on connection B with SET LOCK_TIMEOUT 1000 (the H2 default is 2 seconds, and this setting is not in the code on the screen). The screen shows no time numbers, and the default of MySQL InnoDB is innodb_lock_wait_timeout of 50 seconds. As the facts the step sentences rely on, it also checked by execution the value that another connection read right after A\'s UPDATE (1000, because it is not final yet), that while B was waiting, a SELECT from another connection did not wait and read 1000 right away (that reads do not wait in H2 was measured separately, and the screen mentions it in only one sentence), that after B waited and ended with an error, auto-commit of B is still off so the transaction is still open, and that the UPDATE of B that ran afterward added 50 to the 900 that A made final and got 950. From the MySQL 8.4 documentation, we opened and checked section 17.7.1 InnoDB Locking (an exclusive lock lets a transaction change or delete the row, and when one transaction holds an exclusive lock on a row, a request by another transaction for a lock on the same row cannot be granted at once and must wait), section 17.7.3 Locks Set by Different SQL Statements in InnoDB (UPDATE ... WHERE sets an exclusive lock on the records it meets in the search, and if it finds one row with a unique index, an index record lock is enough; InnoDB locks are released when the transaction commits or aborts), and innodb_lock_wait_timeout on the page for InnoDB startup options and system variables (innodb-parameters) (default 50 seconds, error 1205 after waiting, and only the statement is rolled back, not the whole transaction). From the H2 documentation, we checked the Advanced page, Multi-Version Concurrency Control (a connection sees only the final data and its own changes, and if connections try to lock or change the same row at the same time, it waits until the lock timeout) and Lock Timeout (an error if the lock cannot be got, and it can be set for each connection). Section 17.7.3 does not directly state in a sentence when the lock of an UPDATE is released; we read it from the general sentence in the same section (InnoDB locks are released when the transaction commits or aborts). We did not check by execution whether MySQL gives the same result for the same SQL. This lab covers only the exclusive lock and the waiting on one row, and does not cover read locks (SELECT ... FOR UPDATE), the differences by isolation level (iso), its use in stock decrement (stock), deadlocks where connections wait for each other (dbdeadlock), or locks on the empty gaps between rows (gaplock).',
});

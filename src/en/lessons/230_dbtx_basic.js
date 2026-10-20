Lab.register({
  id: 'dbtx_basic', nav: 'Transactions', cat: 'Fundamentals', mode: 'step', basic: true, deep: ['tx'],
  title: 'What does a transaction group together, and what do COMMIT and ROLLBACK do?',
  why: 'If the program stops with an error between two statements, or the server\'s power goes off, then without a transaction only the change of the first statement remains in the database. To undo it, the program must remember what it changed and change it back in reverse, but a program that has already stopped cannot even do that. A transaction lets the database cancel changes that are not confirmed by itself, so the database takes on this cleanup.',
  use: 'Use it where several statements must succeed together, such as recording a payment while using points, or reducing inventory while placing an order. In a Java program built with Spring, you usually do not write BEGIN and COMMIT directly; you attach @Transactional to a method and Spring does the same work before and after it.',
  intro: 'Taking 300 out of account 1 and adding 300 to account 2 takes two UPDATE statements. If only one of them is applied, money disappears or appears. A transaction turns several statements like these into one unit that is "either all applied or none applied". In code, the statement BEGIN starts the unit, and COMMIT or ROLLBACK ends it. COMMIT makes everything done in the unit final so that other connections can see it, and ROLLBACK cancels everything done in the unit. Changes that are not yet final cannot be seen from other connections. (In MySQL, the standard way is to write START TRANSACTION instead of BEGIN, and it means the same. H2, the database this lab was checked against, does not accept START TRANSACTION, so we wrote BEGIN.) In this lab, you remove BEGIN, change COMMIT to ROLLBACK, or remove the statement that ends the transaction, run the same two UPDATEs, and see how the balance read from another connection changes.',
  terms: ['Transaction', 'Commit and rollback', 'Autocommit', 'BEGIN, COMMIT, and ROLLBACK statements'],
  controls: [
    { id: 'begin', label: 'Write BEGIN', type: 'check', value: true },
    { id: 'end', label: 'How the transaction ends', type: 'select', value: 'commit', options: [['commit', 'End with COMMIT'], ['rollback', 'End with ROLLBACK'], ['none', 'Do not end it (the connection drops with neither COMMIT nor ROLLBACK)']] },
  ],
  // q is the question shown on the question-style screen. t and d are the name and the description used in the text-only reading
  presets: [
    { t: 'Default settings', q: 'What does a transaction look like, and what happens when you COMMIT two UPDATEs together?', d: 'A transaction that starts with BEGIN and ends with COMMIT. The two changes become final together at COMMIT, and before that other connections cannot see them.', v: { begin: true, end: 'commit' } },
    { t: 'Ending with ROLLBACK', q: 'What if you ROLLBACK instead of COMMIT?', d: 'Everything done in the transaction is canceled, and both accounts go back to their first values.', v: { begin: true, end: 'rollback' } },
    { t: 'Removing BEGIN', q: 'What if you remove BEGIN?', d: 'There is no transaction, so each UPDATE becomes final as soon as it runs. Right after the first UPDATE, another connection already sees the changed value.', v: { begin: false, end: 'commit' } },
    { t: 'Removing BEGIN and using ROLLBACK', q: 'What if you remove BEGIN and use ROLLBACK?', d: 'An UPDATE that is already final cannot be undone by ROLLBACK.', v: { begin: false, end: 'rollback' } },
    { t: 'The connection drops without COMMIT or ROLLBACK', q: 'What if the connection drops without COMMIT or ROLLBACK?', d: 'A transaction that was not ended does not become final. In H2, it was canceled when the connection dropped.', v: { begin: true, end: 'none' } },
  ],
  // The code on the screen and the verification program (verify/spring/src/DbTxBasicProbe.java) ran the same text. The verification script compares them character by character.
  code: function (c) {
    var l = ['CREATE TABLE account (id INT PRIMARY KEY, balance INT);', 'INSERT INTO account VALUES (1, 1000), (2, 0);', ''];
    if (c.begin) l.push('-- Start: treat the statements from here on as one transaction', 'BEGIN;');
    l.push('UPDATE account SET balance = balance - 300 WHERE id = 1;', 'UPDATE account SET balance = balance + 300 WHERE id = 2;');
    if (c.end === 'commit') l.push(c.begin ? '-- End: make the whole transaction final' : '-- No transaction, so there is nothing to commit (both UPDATEs are already final)', 'COMMIT;');
    else if (c.end === 'rollback') l.push(c.begin ? '-- End: cancel everything done in the transaction' : '-- No transaction, so there is nothing to cancel (both UPDATEs are already final)', 'ROLLBACK;');
    l.push('', 'SELECT * FROM account ORDER BY id;');
    return l.join('\n');
  },
  label: function (c) { return (c.begin ? 'BEGIN present' : 'BEGIN absent') + ' · ' + { commit: 'ended with COMMIT', rollback: 'ended with ROLLBACK', none: 'not ended' }[c.end]; },
  columns: ['Account 1 as seen from the other connection right after the first UPDATE', 'Account 1 after the end', 'Account 2 after the end'],
  simulate: function (c) {
    var begin = !!c.begin, end = c.end, ev = [], sum = [];
    // State: a is the balance read by the connection that runs the SQL on the screen, t is the final value (the value the other connection reads), u is the state of the two UPDATEs (none not run yet, pending inside the transaction, done final, gone canceled),
    //       bs is the state of the transaction, tx is whether a transaction is in progress, chg is the account whose t changed in this step, mv is the UPDATE that became final in this step
    var st = { a: [1000, 0], t: [1000, 0], u: ['none', 'none'], bs: '', tx: false, chg: [false, false], mv: [false, false], log: [] };
    var facts = {};
    function push(s, k) { ev.push({ s: s, k: k, snap: JSON.parse(JSON.stringify(st)) }); }
    function calm() { st.chg = [false, false]; st.mv = [false, false]; }
    function both(x) { return x[0] + ',' + x[1]; }
    function pair(x) { return 'Account 1 is ' + x[0] + ' and account 2 is ' + x[1]; }

    // 1. Prepare the table: no transaction has started, so each statement is final right away
    facts.bSetup = both(st.t);
    st.log.push(['CREATE TABLE, INSERT', 'Final right away', '']);
    push('CREATE TABLE and INSERT: The database creates the account table and inserts account 1 (balance 1000) and account 2 (balance 0). The SQL on the screen runs on one connection to the database (this connection). It is not in the code, but to check the result we also open one more connection to the same database (the other connection), and each time this connection runs a statement, we read the account balances. ' +
      (begin ? 'No transaction has started yet, so these two statements become final as soon as they run, and even when read from the other connection, account 1 is 1000 and account 2 is 0.' : 'There is no statement that starts a transaction, so every statement becomes final as soon as it runs (autocommit). Even when read from the other connection, account 1 is 1000 and account 2 is 0.'), '');

    // 2. BEGIN
    if (begin) {
      calm(); st.tx = true; st.bs = 'open'; facts.autoBegin = !st.tx;
      st.log.push(['BEGIN', 'Transaction starts', '']);
      push('BEGIN: The database starts treating the statements sent from this connection as one transaction. It pauses the mode in which every statement became final right away (autocommit) until this transaction ends, so from now on nothing becomes final until it meets COMMIT or ROLLBACK.', '');
    }

    // 3. First UPDATE
    calm(); st.a[0] = 700; st.u[0] = begin ? 'pending' : 'done';
    if (!begin) { st.t[0] = 700; st.chg[0] = true; st.mv[0] = true; }
    facts.aUpd1 = both(st.a); facts.bUpd1 = both(st.t);
    st.log.push(['UPDATE: take 300 out of account 1', 'This connection ' + st.a[0] + ' · other connection ' + st.t[0], begin ? '' : 'bad']);
    push('UPDATE account SET balance = balance - 300 WHERE id = 1: The database changes the balance of account 1 from 1000 to 700. ' + (begin
      ? 'This is work inside the transaction, so it is not final yet. Read from this connection it is 700, but read from the other connection it is still 1000. Counting only the final values, the total of the two accounts is still 1000.'
      : 'There is no transaction, so the database makes this statement final as soon as it runs (autocommit). Even read from the other connection, it is 700. 300 has not been added to account 2 yet, so the total of the two accounts as the other connection sees it has dropped to 700.'), begin ? '' : 'bad');

    // 4. Second UPDATE
    calm(); st.a[1] = 300; st.u[1] = begin ? 'pending' : 'done';
    if (!begin) { st.t[1] = 300; st.chg[1] = true; st.mv[1] = true; }
    facts.aUpd2 = both(st.a); facts.bUpd2 = both(st.t);
    st.log.push(['UPDATE: add 300 to account 2', 'This connection ' + st.a[1] + ' · other connection ' + st.t[1], '']);
    push('UPDATE account SET balance = balance + 300 WHERE id = 2: The database changes the balance of account 2 from 0 to 300. ' + (begin
      ? 'This is also inside the transaction, so it is not final. This connection sees 700 and 300, but the other connection still sees 1000 and 0. The two changes are piled up in one transaction.'
      : 'There is no transaction, so this one also becomes final right away. Read from the other connection, it is now 700 and 300, and the total is 1000 again. Between the two statements, a state with a total of 700 was final, and if the other connection had read then, it would have seen those values.'), '');

    // 5. The statement that ends it
    if (end === 'commit') {
      calm();
      if (begin) {
        st.t = st.a.slice(); st.chg = [true, true]; st.mv = [true, true]; st.u = ['done', 'done']; st.bs = 'committed'; st.tx = false; facts.autoEnd = !st.tx;
        st.log.push(['COMMIT', 'Both changes became final together', 'good']);
        push('COMMIT: The database makes the two changes piled up in the transaction final together. Now even when read from the other connection, account 1 is 700 and account 2 is 300. Making them final happens once for the whole transaction, so in this lab the values the other connection read were only 1000 and 0, or 700 and 300, and never a value with only one side changed. The transaction has ended, so this connection goes back to making every statement final right away.', 'good');
      } else {
        st.log.push(['COMMIT', 'No transaction to commit', '']);
        push('COMMIT: There is no transaction to commit. The two UPDATEs were already final as soon as they ran, so COMMIT changes nothing, and the values the other connection reads stay at 700 and 300.', '');
      }
      facts.aEnd = both(st.a); facts.bEnd = both(st.t);
    } else if (end === 'rollback') {
      calm();
      if (begin) {
        st.a = st.t.slice(); st.u = ['gone', 'gone']; st.bs = 'rolled'; st.tx = false; facts.autoEnd = !st.tx;
        st.log.push(['ROLLBACK', 'Everything done in the transaction was canceled', 'good']);
        push('ROLLBACK: The database cancels everything done in the transaction. Both the 700 of account 1 and the 300 of account 2 are as if they never happened, and both on this connection and on the other connection the values are 1000 and 0. These changes were never final, so the other connection never saw a changed value from start to finish. The transaction has ended, so this connection goes back to making every statement final right away.', 'good');
      } else {
        st.log.push(['ROLLBACK', 'No transaction to cancel', 'bad']);
        push('ROLLBACK: There is no transaction to cancel. The two UPDATEs were already final as soon as they ran, so they are not canceled, and no error occurs. The values the other connection reads stay at 700 and 300.', 'bad');
      }
      facts.aEnd = both(st.a); facts.bEnd = both(st.t);
    }

    // 6. SELECT
    calm();
    var rows = '(1, ' + st.a[0] + '), (2, ' + st.a[1] + ')';
    facts.aSelect = rows; facts.bSelect = both(st.t); facts.autoLast = !st.tx;
    var open = begin && end === 'none';
    st.log.push(['SELECT * FROM account', rows, open ? 'hot' : '']);
    var tail = open
      ? 'The transaction has not ended yet, but this connection can read its own changes, so it sees 700 and 300. Read from the other connection, it is still 1000 and 0.'
      : begin && end === 'rollback' ? 'The transaction was canceled, so these are the first values.'
      : begin ? 'These are the same as the final values.'
      : end === 'none' ? 'There is no statement that ends it, but there was no transaction either, so these are all values that are already final.'
      : 'These are values that are already final.';
    push('SELECT * FROM account ORDER BY id: This connection reads the accounts. The result is ' + rows + '. ' + tail, '');

    // 7. (When it was not ended) the connection drops. This is not in the code
    if (end === 'none') {
      calm();
      if (begin) {
        st.a = st.t.slice(); st.u = ['gone', 'gone']; st.bs = 'dropped'; st.tx = false;
        st.log.push(['Connection dropped', 'The transaction that was not final was canceled', 'bad']);
        push('This is not in the code. This connection drops with neither COMMIT nor ROLLBACK. When the connection that had a transaction that was not ended dropped, H2 canceled that transaction. The two changes are as if they never happened. (This is the behavior observed when a JDBC connection was closed in H2.)', 'bad');
      } else {
        st.log.push(['Connection dropped', 'No transaction to cancel', '']);
        push('This is not in the code. This connection drops. There was no transaction, so there is nothing to cancel, and the two UPDATEs stay, already final.', '');
      }
    }

    // 8. Read on a new connection
    calm();
    facts.final = both(st.t);
    var total = st.t[0] + st.t[1];
    var why = begin && end === 'commit' ? 'The whole transaction was applied.'
      : begin && end === 'rollback' ? 'The whole transaction was undone.'
      : begin ? 'A transaction that was not ended was not applied.'
      : 'Each statement was already final, so the result is the same ' + (end === 'commit' ? 'even though you wrote COMMIT.' : end === 'rollback' ? 'even though you wrote ROLLBACK.' : 'even without a statement that ends it.');
    st.log.push(['Read on a new connection', pair(st.t), '']);
    push('After everything has ended, we read the accounts on a new connection. ' + pair(st.t) + ', and the total is ' + total + '. ' + why, '');

    // Summary: the first line is the answer to the question
    var key = begin + '|' + end;
    var S = {
      'true|commit': ['A transaction is a group of statements that starts with BEGIN and ends with COMMIT. The two UPDATEs became final together at COMMIT, and before that the other connection saw account 1 as 1000.', 'The BEGIN and COMMIT we wrote are what start the transaction and make it final. The two changes are seen together or not seen together, so the other connection never saw the moment when money disappeared or appeared.'],
      'true|rollback': ['If you use ROLLBACK instead of COMMIT, everything done in the transaction is canceled. Account 1 is 1000 and account 2 is 0, as if the two UPDATEs never happened.', 'The cancel is possible because nothing was final yet. The other connection never saw a changed value, so the in-between state did not show outside.'],
      'false|commit': ['If you remove BEGIN, there is no transaction, so each UPDATE becomes final as soon as it runs. Right after the first UPDATE, the other connection already saw account 1 as 700, and COMMIT had nothing to change.', 'Between the two UPDATEs, a state with a total of 700 was final. BEGIN is what groups the statements, and writing only COMMIT does not group them.'],
      'false|rollback': ['ROLLBACK without BEGIN cancels nothing. The two UPDATEs were already final, so account 1 stays at 700 and account 2 at 300.', 'ROLLBACK is the statement that cancels a transaction in progress. If you did not start a transaction, there is nothing to undo, and a statement that autocommit already made final cannot be undone.'],
      'true|none': ['If the connection drops with neither COMMIT nor ROLLBACK, in H2 the transaction that was not final was canceled, and account 1 stays at 1000 and account 2 at 0.', 'A transaction becomes final only when it meets COMMIT, so changes that were not ended are not final. This connection\'s SELECT showed 700 and 300, but the other connection never saw them. (This is the behavior observed when a JDBC connection was closed in H2.)'],
      'false|none': ['With neither BEGIN nor a statement that ends it, each of the two UPDATEs becomes final as soon as it runs, and account 1 stays at 700 and account 2 at 300.', 'Even if the connection drops, there was no transaction, so there is nothing to cancel. A statement that did not start a transaction becomes final by itself, so it is final even if you do not write COMMIT.']
    };
    S[key].forEach(function (x) { sum.push(x); });
    return { events: ev, summary: sum, facts: facts, row: [String(facts.bUpd1.split(',')[0]), String(st.t[0]), String(st.t[1])] };
  },
  render: function (v, sim, t, H, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : null;
    if (!s) { H.text(v, 'Click Run to go through the statements one at a time, starting with CREATE TABLE.'); return; }
    H.table(v, ['Account', 'If this connection reads', 'If the other connection reads'], [0, 1].map(function (i) {
      var k = s.a[i] !== s.t[i] ? 'hot' : '';
      return { cls: '', cells: ['Account ' + (i + 1), { v: String(s.a[i]), cls: k }, { v: String(s.t[i]), cls: s.chg[i] ? 'good' : '' }] };
    }), 'Balances in the account table');
    H.table(v, ['Statement run', 'Result'], s.log.map(function (r) { return { cls: '', cells: [r[0], { v: r[1], cls: r[2] }] }; }), 'Statements and results');
    H.counters(v, [[s.t[0] + s.t[1], 'Total of the two accounts as the other connection sees it'], [s.t[0], 'Account 1 as the other connection sees it']]);
  },
  // Diagram: on the left, the two UPDATEs of this connection (with BEGIN, a transaction area around them); on the right, the final account table (what the other connection sees). When they become final, an arrow changes the value on the right; when they are canceled, the box on the left is emptied.
  draw: function (P, sim, shown) {
    var c = sim.c, last = shown[shown.length - 1], s = last ? last.snap : null;
    P.size(680, 252);
    var bt = 'Transaction of this connection' + (s && s.bs === 'open' ? ' · in progress' : s && s.bs === 'committed' ? ' · committed' : s && s.bs === 'rolled' ? ' · rolled back' : s && s.bs === 'dropped' ? ' · canceled by the drop' : '');
    if (c.begin && s && s.bs) P.region('bd', 14, 12, 330, 160, bt);
    else P.text('hd', 26, 28, c.begin ? 'UPDATEs sent by this connection (before BEGIN)' : 'UPDATEs sent by this connection (no transaction)', { cls: 'mut', anchor: 'start' });
    P.region('tb', 380, 12, 286, 160, 'Final account table');
    var lab = [['First UPDATE', 'Account 1: 1000 → 700'], ['Second UPDATE', 'Account 2: 0 → 300']];
    var cls = { none: 'ghost', pending: 'wait', done: 'good', gone: 'ghost' };
    var st = { none: 'not run', pending: 'not final', done: 'final', gone: 'canceled' };
    [0, 1].forEach(function (i) {
      var u = s ? s.u[i] : 'none';
      P.box('u' + i, 26, 44 + i * 60, 306, 52, { cls: cls[u], title: lab[i][0], sub: lab[i][1] + ' (' + st[u] + ')' });
      var chg = s && s.chg[i];
      P.box('a' + (i + 1), 392, 44 + i * 60, 262, 52, { cls: chg ? 'hot' : 'plain', title: 'Account ' + (i + 1) + ' · balance ' + (s ? s.t[i] : (i ? 0 : 1000)), sub: chg ? 'Value that just became final' : 'Value the other connection reads' });
      if (s && s.mv[i]) P.arrow('ar' + i, 'u' + i + ':r', 'a' + (i + 1) + ':l', { cls: 'good' });
    });
    var total = s ? s.t[0] + s.t[1] : 1000;
    P.box('n1', 14, 192, 322, 36, { cls: total === 1000 ? 'good' : 'bad', title: 'Other connection: total of both', right: String(total) });
    P.box('n2', 344, 192, 322, 36, { cls: s && s.a[0] !== s.t[0] ? 'wait' : 'plain', title: 'This connection: account 1', right: String(s ? s.a[0] : 1000) });
    if (s && total !== 1000) P.note('A red box means that only one side is final, so the total of the two accounts is wrong.');
    else if (s && (s.u[0] === 'pending' || s.u[1] === 'pending')) P.note('A blue box is a change that exists only inside the transaction of this connection. It is not yet visible in the table on the right, as other connections see it.');
  },
  assume: 'It was run and checked against H2 2.4.240 (in-memory database, JDBC), and it was not checked against execution on MySQL. It ran all 6 combinations, and it ran the whole SQL on the screen, including the comment lines, exactly as written, one statement at a time on one connection (this connection). It created a new in-memory database with a name (DB_CLOSE_DELAY=-1) for each combination so that the two connections look at the same database, and it left the isolation level at the H2 default, READ COMMITTED. What it checked is the three items of the result table, that is, the value that another connection, opened separately, read with SELECT balance FROM account WHERE id = 1 right after the first UPDATE, and the values of the two accounts read on a new connection after everything had ended (for the combination that was not ended, after this connection was closed). This checking query is not in the code on the screen, and there was no case where the query of the other connection waited or failed (it ran with a time limit of 3 seconds). As the facts the step sentences rely on, it also checked by execution the values of the two accounts that this connection and the other connection read at each statement, that autocommit is turned off after BEGIN and turned on again after COMMIT or ROLLBACK (getAutoCommit of JDBC), and the value that the last SELECT showed this connection. That closing the connection without ending the transaction cancels the changes that are not final is behavior observed when a JDBC connection was closed in H2, and we did not run other ways for a connection to drop (a network break, a server shutdown). The details that change with the isolation level (which values another connection can see, and whether it waits) were not covered, and are only the result seen with the H2 default. For the statement that starts a transaction, we wrote BEGIN because H2 2.4.240 does not accept START TRANSACTION (a syntax error). BEGIN ran on H2 2.4.240, but we could not find it on the Commands page of the H2 documentation. COMMIT, ROLLBACK, and SET AUTOCOMMIT are on that page. In section 15.3.1 START TRANSACTION, COMMIT, and ROLLBACK Statements of the MySQL 8.4 documentation, it is written that BEGIN and BEGIN WORK are other names for START TRANSACTION (and that START TRANSACTION is standard SQL and is recommended), that inside a stored program BEGIN is read as the start of a BEGIN ... END block, so you must use START TRANSACTION, that during START TRANSACTION autocommit is off and returns to its previous state after COMMIT or ROLLBACK, that autocommit is on by default so each statement is final and cannot be undone with ROLLBACK, and that COMMIT makes changes permanent and ROLLBACK cancels changes. In section 17.7.2.2 autocommit, Commit, and Rollback (InnoDB), it is written that a new connection starts with autocommit on, and that if a session with autocommit off ends without committing its last transaction, MySQL rolls that transaction back. We opened the two sections above directly and checked them, but we did not check by execution that MySQL gives the same values for the same SQL. The code on the screen is the whole thing, including CREATE TABLE and INSERT, and the query of the other connection and the closing of the connection are not shown. This lab covers only the start and the end of one transaction, and does not cover isolation levels, locks, nested transactions, or Spring\'s @Transactional.',
});

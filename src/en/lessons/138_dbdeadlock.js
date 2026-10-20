Lab.register({
  id: 'dbdeadlock', nav: 'Deadlocks in the database', cat: 'Database', mode: 'step',
  title: 'When two transactions wait for each other, how does the database end it?',
  why: 'When two transactions each wait for a row that the other has locked, neither can resolve the wait by itself. Both connections stay stopped until the lock wait timeout runs out, and they also hold up other requests. InnoDB\'s deadlock detection finds the moment a cycle forms in the waiting relationships, rolls back one transaction that has less to roll back, and returns an error, so that the other transaction can go on right away.',
  use: 'In places that change several rows in one transaction, such as an account transfer or an inventory decrease, add a retry so that the transaction runs again from the beginning when it receives a deadlock error. In Spring, this error is converted and thrown as an exception of the PessimisticLockingFailureException family. To prevent a cycle from forming at all, lock multiple rows in the same order every time, for example starting with the lower account number.',
  intro: 'Transaction A moves 100 from account 1 to account 2, and transaction B moves 50 from account 2 to account 1. If the two lock the rows in opposite orders, they end up waiting for each other. Java threads in this situation would simply stop forever, but MySQL InnoDB detects the situation by itself, rolls one side back, and returns an error.',
  terms: ['Deadlock', 'Deadlock detection and the victim', 'Lock wait timeout', 'Shared locks and exclusive locks', 'Transaction'],
  controls: [
    { id: 'sit', label: 'Order in which the two transactions lock the rows', type: 'select', value: 'rev', options: [['rev', 'Opposite (A: 1 → 2, B: 2 → 1)'], ['same', 'Same order (both 1 → 2)'], ['hold', 'Opposite, but A stops for a long time holding only the first row']] },
    { id: 'heavy', label: 'Amount of work done before the deadlock', type: 'select', value: 'eq', options: [['eq', 'Equal (each changes one row)'], ['b', 'B first changes 50 other rows']], show: function (c) { return c.sit === 'rev'; }, hint: 'This is what InnoDB looks at when it chooses which side to roll back.' },
    { id: 'after', label: 'What the side that got the error does', type: 'select', value: 'giveup', options: [['giveup', 'Rolls back and stops'], ['retry', 'Rolls back and tries again from the start'], ['commit', 'Ignores the error and runs COMMIT']], show: function (c) { return c.sit !== 'same'; } },
  ],
  // Settings that are not shown go back to their default values (settings that do not affect the result)
  fix: function (c) {
    var f = {};
    if (c.sit !== 'rev' && c.heavy !== 'eq') f.heavy = 'eq';
    if (c.sit === 'same' && c.after !== 'giveup') f.after = 'giveup';
    return f.heavy || f.after ? f : null;
  },
  presets: [
    { t: 'Default settings', q: 'How does the database end the two transactions when A locks rows 1 → 2 and B locks rows 2 → 1?', d: 'Opposite orders. The database detects the deadlock and rolls one side back, and that transfer is lost.', v: { sit: 'rev', heavy: 'eq', after: 'giveup' } },
    { t: 'If the rolled-back side tries again', q: 'What if the side that got the error rolls back and tries again from the start?', d: 'It runs again from the start, and both transfers are applied.', v: { sit: 'rev', heavy: 'eq', after: 'retry' } },
    { t: 'If the rows are locked in the same order', q: 'What if both transactions lock the rows in the same order (both 1 → 2)?', d: 'One side just waits for a moment, and both finish without an error.', v: { sit: 'same', heavy: 'eq', after: 'giveup' } },
    { t: 'If B had done more work', q: 'What if the lock order is opposite and B first changes 50 other rows?', d: 'This time A is rolled back. The side with less to undo is chosen.', v: { sit: 'rev', heavy: 'b', after: 'giveup' } },
    { t: 'A long wait that is not a deadlock', q: 'What if the lock order is opposite, but A stops for a long time holding only the first row?', d: 'With no cycle, nothing is detected. After waiting until the time limit, the side that waits gets error 1205.', v: { sit: 'hold', heavy: 'eq', after: 'giveup' } },
    { t: 'If the timeout is ignored and committed', q: 'What if A stops for a long time holding only the first row and the side that got the error ignores the error and runs COMMIT?', d: 'Only the earlier statement is applied, and 50 disappears.', v: { sit: 'hold', heavy: 'eq', after: 'commit' } },
  ],
  code: function (c) {
    var U = 'UPDATE account SET balance = balance ';
    return '-- account table (columns id, balance, memo): accounts 1 and 2 each have a balance of 1000\n' + (c.sit === 'rev' && c.heavy === 'b' ? '-- it also has rows unrelated to the transfers (id 101 to 250)\n' : '') + '\n-- Transaction A: moves 100 from account 1 to account 2\nSTART TRANSACTION;\n' + U + '- 100 WHERE id = 1;\n' + (c.sit === 'hold' ? '-- (it stops for a long time without sending the next statement)\n' : '') + U + '+ 100 WHERE id = 2;\nCOMMIT;\n\n-- Transaction B: moves 50 from account 2 to account 1 (runs at the same time as A)\nSTART TRANSACTION;\n'
      + (c.sit === 'rev' && c.heavy === 'b' ? "UPDATE account SET memo = 'B' WHERE id BETWEEN 201 AND 250;   -- 50 other rows\n" : '')
      + (c.sit === 'same' ? '-- lock the account with the smaller number first\n' + U + '+ 50 WHERE id = 1;\n' + U + '- 50 WHERE id = 2;' : U + '- 50 WHERE id = 2;\n' + U + '+ 50 WHERE id = 1;') + '\nCOMMIT;'
      + (c.sit === 'same' ? '' : '\n\n-- What the side that got the error does\n' + { giveup: 'ROLLBACK;                          -- and stops', retry: 'ROLLBACK;                          -- then runs again from START TRANSACTION', commit: 'COMMIT;                            -- ignores the error and commits as it is' }[c.after]);
  },
  label: function (c) { return { rev: 'Opposite order', same: 'Same order', hold: 'Opposite order + A stops for a long time' }[c.sit] + (c.sit === 'rev' ? ' · ' + (c.heavy === 'b' ? 'B changes 50 more rows' : 'same amount of work') : '') + (c.sit === 'same' ? '' : ' · ' + { giveup: 'rolls back and stops', retry: 'tries again', commit: 'ignores the error and commits' }[c.after]); },
  columns: ['What happened', 'Side that got the error', 'That transaction right after the error', 'Final balances (account 1 / account 2)'],
  // The settings decide the result. pick is the side (A or B) that is actually rolled back in the deadlock; if it is not given, the side seen in the MySQL used for the check is used.
  plan: function (c, pick) {
    var sit = c.sit, v = sit === 'rev' ? (pick || (c.heavy === 'b' ? 'A' : 'B')) : sit === 'hold' ? 'B' : '', code = sit === 'rev' ? 1213 : sit === 'hold' ? 1205 : 0;
    var aDone = sit !== 'rev' || v !== 'A' || c.after === 'retry', bDone = sit === 'same' || c.after === 'retry' || (sit === 'rev' && v !== 'B'), half = sit === 'hold' && c.after === 'commit';
    var b1 = 1000 + (aDone ? -100 : 0) + (bDone ? 50 : 0), b2 = 1000 + (aDone ? 100 : 0) + (bDone || half ? -50 : 0);
    return { victim: v, code: code, aDone: aDone, bDone: bDone, half: half, b1: b1, b2: b2,
      row: [{ rev: 'Deadlock detected', same: 'Waited, then proceeded', hold: 'Lock wait timeout' }[sit], v ? v + ': error ' + code + (sit === 'rev' && c.heavy === 'eq' ? ' (could also be ' + (v === 'B' ? 'A' : 'B') + ')' : '') : 'None', sit === 'rev' ? 'Whole transaction rolled back' : sit === 'hold' ? 'Only the statement canceled, transaction still alive' : '-', b1 + ' / ' + b2] };
  },
  simulate: function (c) {
    var p = this.plan(c), sit = c.sit, V = p.victim, S = V === 'A' ? 'B' : 'A', ev = [], sum = [];
    var st = { own: { 1: '', 2: '' }, wait: { A: 0, B: 0 }, ph: { A: 'pre', B: 'pre' }, msg: { A: ['Not started', ' '], B: ['Not started', ' '] }, bal: { 1: 1000, 2: 1000 }, det: 'No transaction is waiting', cyc: false };
    function push(s, k) { ev.push({ s: s, k: k, snap: JSON.parse(JSON.stringify(st)) }); }
    function set(t, ph, a, b) { st.ph[t] = ph; st.msg[t] = [a, b || ' ']; }
    var first = { A: 1, B: sit === 'same' ? 1 : 2 }, second = { A: 2, B: sit === 'same' ? 2 : 1 }, amt = { A: 100, B: 50 };
    function sql(t, n) { var r = n === 1 ? first[t] : second[t], minus = (t === 'A') === (r === 1); return 'UPDATE … ' + (minus ? '- ' : '+ ') + amt[t] + ' WHERE id = ' + r; }
    function commit(t) { st.bal[1] += t === 'A' ? -100 : 50; st.bal[2] += t === 'A' ? 100 : -50; st.own[1] = st.own[1] === t ? '' : st.own[1]; st.own[2] = st.own[2] === t ? '' : st.own[2]; set(t, 'done', 'Committed', 'Transfer applied'); }
    var what = { A: '100 from account 1 to account 2', B: '50 from account 2 to account 1' };

    if (sit === 'rev' && c.heavy === 'b') { set('B', 'hold', 'Changed 50 other rows'); push("B: UPDATE account SET memo = 'B' WHERE id BETWEEN 201 AND 250: Transaction B first changes 50 other rows that have nothing to do with accounts 1 and 2. These rows are unrelated to the deadlock, but the amount of work B has done so far becomes much larger than that of A.", ''); }
    st.own[1] = 'A'; set('A', 'hold', 'Holds lock on account 1');
    push('A: ' + sql('A', 1) + ': Transaction A subtracts 100 from account 1. To change a row, it must take an exclusive lock on that row, and this lock is not released until A commits or rolls back.', '');

    if (sit === 'same') {
      st.wait.B = 1; set('B', 'wait', 'Holds no lock', 'Waiting for account 1'); st.det = 'B waits for A. No cycle';
      push('B: ' + sql('B', 1) + ': Transaction B also tries to change account 1 first, following the fixed order. A holds the lock on that row, so B waits. B does not hold any lock yet.', '');
      st.own[2] = 'A'; set('A', 'hold', 'Holds locks on 1 and 2');
      push('A: ' + sql('A', 2) + ': A adds 100 to account 2. B does not hold account 2, so A is not blocked. The waiting goes in only one direction, from B to A, so no cycle forms.', '');
      commit('A'); st.det = 'No transaction is waiting';
      push('A: COMMIT: The transfer of A is applied, and all the locks that A held are released. The balance is 900 for account 1 and 1100 for account 2.', 'good');
      st.wait.B = 0; st.own[1] = 'B'; set('B', 'hold', 'Holds lock on account 1');
      push('B: The statement that was waiting (' + sql('B', 1) + ') now runs, because the lock has been released. B did not get an error. It only waited for a moment.', '');
      st.own[2] = 'B'; set('B', 'hold', 'Holds locks on 1 and 2');
      push('B: ' + sql('B', 2) + ': B subtracts 50 from account 2. There is no one to wait for.', '');
      commit('B');
      push('B: COMMIT: The transfer of B is applied too. The balance is 950 for account 1 and 1050 for account 2.', 'good');
    } else {
      st.own[2] = 'B'; set('B', 'hold', 'Holds lock on account 2');
      push('B: ' + sql('B', 1) + ': Transaction B subtracts 50 from account 2. It takes an exclusive lock on the row of account 2. The two are different rows so far, so nobody is waiting yet.', '');
      if (sit === 'rev') {
        st.wait.A = 2; set('A', 'wait', 'Holds lock on account 1', 'Waiting for account 2'); st.det = 'A waits for B. No cycle';
        push('A: ' + sql('A', 2) + ': A tries to add 100 to account 2. B holds the lock on that row, so A waits. A waits while holding the lock on account 1.', '');
        st.wait.B = 1; set('B', 'wait', 'Holds lock on account 2', 'Waiting for account 1'); st.cyc = true; st.det = 'A → B → A. Cycle found';
        push('B: ' + sql('B', 2) + ': B tries to add 50 to account 1. A holds the lock on that row, but A is waiting for B to finish. A waits for B and B waits for A, so a cycle has formed. If nothing is done, neither can ever proceed.', 'bad');
        st.det = 'Cycle found. Rolling back ' + V;
        push('Deadlock detection in InnoDB: When a transaction has to wait for a lock, InnoDB follows who is waiting for whom and checks whether there is a cycle. It found a cycle, so it chooses one of the two and rolls it back. ' + (c.heavy === 'b' ? 'InnoDB tries to choose the small transaction, the one with less to undo. B changed 51 rows and A changed 1 row, so it chooses A.' : 'The documentation does not say which side is chosen when the two transactions have done the same amount of work. This screen shows the case where B is chosen. In the MySQL used for the check, it was B, which started waiting later, all 30 times.'), '');
        st.own[first[V]] = ''; st.wait[V] = 0; st.cyc = false; set(V, 'err', 'Error 1213', 'Rolled back, no locks'); st.det = V + ' rolled back, cycle broken';
        push(V + ': Gets error 1213 (Deadlock found when trying to get lock; try restarting transaction). Not only the statement that was waiting but the whole transaction of ' + V + ' is rolled back. The change made earlier to the balance of account ' + first[V] + ' is canceled too, and all the locks it held are released. This happens right away, without waiting for the lock wait timeout (default 50 seconds).', 'bad');
        st.wait[S] = 0; st.own[second[S]] = S; set(S, 'hold', 'Holds locks on 1 and 2'); st.det = 'No transaction is waiting';
        push(S + ': The statement that was waiting (' + sql(S, 2) + ') runs. The locks were released when ' + V + ' was rolled back. ' + S + ' did not get an error and does not even know that there was a deadlock.', '');
        commit(S);
        push(S + ': COMMIT: The transfer of ' + S + ' (' + what[S] + ') is applied. The balance is ' + st.bal[1] + ' for account 1 and ' + st.bal[2] + ' for account 2.', 'good');
        if (c.after === 'giveup') { set(V, 'err', 'Rolled back and stopped', 'Transfer not applied'); push(V + ': Sends ROLLBACK and stops. InnoDB has already rolled it back, so there is nothing more to cancel. The transfer of ' + V + ' (' + what[V] + ') was not applied anywhere. One request from a user has simply disappeared.', 'bad'); }
        else if (c.after === 'commit') { set(V, 'err', 'Ignored error, committed', 'Nothing was applied'); push(V + ': Ignores the error and sends COMMIT. The COMMIT itself finishes without an error, but the transaction has already been rolled back as a whole, so there is nothing to apply. The transfer of ' + V + ' is missing, yet in code that swallowed the error it looks like a success.', 'bad'); }
        else {
          st.own[1] = V; st.own[2] = V; set(V, 'hold', 'Trying again', 'Holds locks on 1 and 2');
          push(V + ': Sends ROLLBACK, and then runs the transaction again from the start. It sends the two UPDATE statements again. ' + S + ' has already finished, so this time there is nothing to wait for.', '');
          commit(V);
          push(V + ': COMMIT: The transfer of ' + V + ' that was tried again (' + what[V] + ') is applied. The balance is ' + st.bal[1] + ' for account 1 and ' + st.bal[2] + ' for account 2.', 'good');
        }
      } else {
        set('A', 'hold', 'Holds lock on account 1', 'Next statement not sent');
        push('A: Stops without sending the next UPDATE. This is the case where a transaction is kept open while doing something else (for example, waiting for the response of an external service). It still holds the lock on account 1.', '');
        st.wait.B = 1; set('B', 'wait', 'Holds lock on account 2', 'Waiting for account 1'); st.det = 'B waits for A. No cycle';
        push('B: ' + sql('B', 2) + ': A holds the lock on account 1, so B waits. This time A is not waiting for B. There is no cycle, so this is not a deadlock, and the deadlock detection of InnoDB does nothing.', '');
        st.wait.B = 0; set('B', 'err', 'Error 1205', 'Statement canceled only'); st.det = 'Not a deadlock. B exceeded the time limit';
        push('The lock wait timeout (innodb_lock_wait_timeout, default 50 seconds) has passed. B gets error 1205 (Lock wait timeout exceeded; try restarting transaction). Unlike a deadlock, only the one statement that was waiting is canceled. The transaction of B is still alive, and the change that subtracted 50 from account 2 and the lock on that row are still there.', 'bad');
        if (c.after === 'commit') {
          st.bal[2] -= 50; st.own[2] = ''; set('B', 'err', 'Ignored error, committed', 'Only 50 subtracted'); st.det = 'No transaction is waiting';
          push('B: Ignores the error and sends COMMIT. The transaction was still alive, so the change that was left, "50 subtracted from account 2", is applied as it is. The statement that adds 50 to account 1 was canceled, so 50 has disappeared.', 'bad');
        } else {
          st.own[2] = ''; set('B', 'err', 'Rolled back', c.after === 'retry' ? 'Will try again shortly' : 'Transfer not applied'); st.det = 'No transaction is waiting';
          push('B: ROLLBACK: Only now is the change to account 2 canceled and the lock on that row released. Whoever gets error 1205 has to roll back directly like this.' + (c.after === 'giveup' ? ' The transfer of B (' + what.B + ') was not applied.' : ''), c.after === 'giveup' ? 'bad' : '');
        }
        st.own[2] = 'A'; set('A', 'hold', 'Holds locks on 1 and 2');
        push('A: Runs the next statement (' + sql('A', 2) + ') late. The lock on account 2 has been released, so it runs right away.', '');
        commit('A');
        push('A: COMMIT: The transfer of A is applied. The balance is ' + st.bal[1] + ' for account 1 and ' + st.bal[2] + ' for account 2.', c.after === 'commit' ? '' : 'good');
        if (c.after === 'retry') {
          st.own[1] = 'B'; st.own[2] = 'B'; set('B', 'hold', 'Trying again', 'Holds locks on 1 and 2');
          push('B: After A has finished, runs the transaction again from the start. It sends the two UPDATE statements again. If B had tried again right away, while A still held the lock, it would have had to wait again.', '');
          commit('B');
          push('B: COMMIT: The transfer of B that was tried again is applied. The balance is ' + st.bal[1] + ' for account 1 and ' + st.bal[2] + ' for account 2.', 'good');
        }
      }
    }
    if (sit === 'rev') {
      sum.push('InnoDB detects the deadlock by itself, rolls one transaction back as a whole, and returns error 1213. The side that survives proceeds as if nothing had happened. The database ends the deadlock, but doing the rolled-back work again is up to the application.');
      sum.push(c.after === 'retry' ? 'When you get error 1213, run the transaction again from the start. It has to be from the start, not from the middle, because everything changed earlier was canceled too.' : c.after === 'giveup' ? 'If it does not try again, that request disappears without being applied.' : 'A COMMIT after a rollback caused by a deadlock applies nothing. Code that ignores the error makes a failure look like a success.');
      sum.push(c.heavy === 'b' ? 'InnoDB tries to choose the small transaction that changed fewer rows to roll back, because it costs less to undo. So which side gets the error depends not on the order but on the amount of work done up to that point.' : 'Your code cannot decide which side is rolled back. So prepare for the possibility that both transactions can get error 1213.');
    } else if (sit === 'same') {
      sum.push('When every transaction locks in the same order (the account with the smaller number first), the waiting goes in only one direction and no cycle is created. This is the most basic way to reduce deadlocks.');
      sum.push('Even so, unexpected deadlocks can happen because of indexes or gap locks, so keep the code that tries again when it gets error 1213.');
    } else {
      sum.push('A lock wait timeout (error 1205) is not a deadlock. The other side is only holding a lock for a long time and there is no cycle, so InnoDB lets the statement wait until the set time and then cancels only that statement.');
      sum.push(c.after === 'commit' ? 'Even after error 1205 the transaction is still alive, so if you commit as it is, only the earlier statements are applied and a half-finished result remains. When you get the error, roll back first.' : 'A transaction that got error 1205 is not finished. The earlier changes and locks are still there, so you must run ROLLBACK yourself. And the fundamental fix is not to keep a transaction open while doing something that takes a long time.');
    }
    return { events: ev, summary: sum, victim: V, row: p.row };
  },
  render: function (v, sim, t, H, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : null;
    if (!s) { H.text(v, 'Press Run to go through it one step at a time.'); return; }
    H.counters(v, [[String(s.bal[1] + s.bal[2]), 'Total of the two accounts']]);
  },
  // Diagram: Transactions A and B are on the two sides, and the two rows are in the middle. A solid line from a row to a transaction means "holds the lock", and a dotted line from a transaction to a row means "waits". Below are the deadlock detection of InnoDB and the committed balances.
  draw: function (P, sim, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : { own: { 1: '', 2: '' }, wait: { A: 0, B: 0 }, ph: { A: 'pre', B: 'pre' }, msg: { A: ['Not started', ' '], B: ['Not started', ' '] }, bal: { 1: 1000, 2: 1000 }, det: 'No transaction is waiting', cyc: false };
    var cls = { pre: 'plain', hold: 'hot', wait: 'wait', err: 'bad', done: 'good' };
    P.size(680, 318);
    ['A', 'B'].forEach(function (x) { P.box('T' + x, x === 'A' ? 16 : 464, 92, 200, 70, { cls: s.cyc && s.ph[x] === 'wait' ? 'bad' : cls[s.ph[x]], title: x + (x === 'A' ? ' moves 100 (1 → 2)' : ' moves 50 (2 → 1)'), sub: s.msg[x] }); });
    [1, 2].forEach(function (r) {
      P.box('R' + r, 252, r === 1 ? 16 : 190, 176, 48, { cls: s.own[r] ? 'hot' : 'plain', title: 'Account ' + r + ' row', sub: s.own[r] ? s.own[r] + ' holds the lock' : 'No lock', right: String(s.bal[r]) });
      ['A', 'B'].forEach(function (x) {
        var side = x === 'A' ? 'l' : 'r', ts = r === 1 ? 't' : 'b';
        if (s.own[r] === x) P.arrow('e' + x + r, 'R' + r + ':' + side, 'T' + x + ':' + ts, { cls: 'hot', label: 'holds lock' });
        else if (s.wait[x] === r) P.arrow('e' + x + r, 'T' + x + ':' + ts, 'R' + r + ':' + side, { cls: s.cyc ? 'bad dash' : 'dash', label: 'waits' });
      });
    });
    P.box('det', 16, 262, 440, 40, { cls: s.cyc ? 'bad' : s.det.indexOf('broken') >= 0 ? 'good' : 'plain', title: 'Deadlock detection in InnoDB', sub: s.det });
    P.box('bal', 464, 262, 200, 40, { cls: s.bal[1] + s.bal[2] !== 2000 ? 'bad' : 'plain', title: 'Balances', right: s.bal[1] + ' / ' + s.bal[2] });
    P.note('A solid arrow means the transaction holds the lock on that row, and a dotted arrow means it waits for that lock. If you follow the arrows and come back to where you started, a cycle has formed, and that is a deadlock. The number on the right of a row is the committed balance.');
  },
  assume: 'Ten combinations (the settings that make sense for each of the three orders) were run in the same order as shown on the screen, with two sessions, on MySQL 8.4.11 in our test run (InnoDB, isolation level REPEATABLE READ, innodb_deadlock_detect on, innodb_rollback_on_timeout off). The lab was checked against these runs: which side gets which error code, whether the changes and locks remain in that transaction right after the error, and the final balances all match the screen. In the deadlock, error 1213 arrived within a few milliseconds (with the lock wait timeout set to 20 seconds), and when the session that got the error read again the row it had changed, it saw the original value 1000 and held 0 record locks. For the lock wait timeout, instead of waiting for the default 50 seconds, innodb_lock_wait_timeout of that session was reduced to 2 seconds, and even after error 1205 arrived 2 seconds later, the value 950 that the session had changed and 1 record lock were still there. Which side is rolled back in a deadlock with equal amounts of work is not set by the documentation, so the lab does not state it as a fact. Over 30 repetitions, B, which started waiting later, was rolled back all 30 times, and when B first changed 50 other rows, A was rolled back all 30 times. The statements that InnoDB tries to choose a small transaction, and that a deadlock rolls back the whole transaction while a lock wait timeout rolls back only that statement, also agree with the explanations in 17.7.5.2 Deadlock Detection and 17.20.5 InnoDB Error Handling of the MySQL 8.4 Reference Manual. What changes when the server settings are changed (when deadlock detection is turned off, or innodb_rollback_on_timeout is turned on) is not covered. The lab assumes that the two transactions interleave in exactly this order; in practice, depending on the timing, they more often pass without a deadlock.',
});

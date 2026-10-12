Lab.register({
  id: 'tx', nav: 'Transaction basics', cat: 'Database', mode: 'step',
  title: 'What if the withdrawal went through but the deposit did not?',
  intro: 'A transfer that takes 1,000 won out of account A and adds 1,000 won to account B is two SQL statements. If an error occurs or the server crashes between the two statements, money can disappear. A transaction groups several statements so that either all of them take effect or none of them do. This lab compares the result when the two statements are not grouped with the result when they are.',
  terms: ['Transaction', 'ACID', 'Undo log and redo log', '@Transactional'], ranks: ['dbengine', 'txspring', 'isolation'],
  controls: [
    { id: 'mode', label: 'How the statements are run', type: 'select', value: 'auto', options: [['auto', 'Without a transaction (each statement is made permanent right away)'], ['tx', 'The two statements are grouped in a transaction']] },
    { id: 'fail', label: 'What happens between the withdrawal and the deposit', type: 'select', value: 'ex', options: [['none', 'Nothing happens'], ['ex', 'An error (exception) occurs in the application'], ['crash', 'The server crashes']] },
    { id: 'peek', label: 'Another user queries the total of the two accounts partway through', type: 'check', value: false },
  ],
  presets: [
    { t: 'Default settings', q: 'Without a transaction, what happens when an error (exception) occurs in the application between the withdrawal and the deposit?', d: 'An error partway through, without a transaction. 1,000 won disappears.', v: { mode: 'auto', fail: 'ex', peek: false } },
    { t: 'Grouping the statements in a transaction', q: 'What if you group the two statements in a transaction?', d: 'With the same error, the withdrawal is undone too.', v: { mode: 'tx', fail: 'ex', peek: false } },
    { t: 'A server crash with a transaction', q: 'What if you group the two statements in a transaction and the server crashes between the withdrawal and the deposit?', d: 'Changes that were not committed do not remain.', v: { mode: 'tx', fail: 'crash', peek: false } },
    { t: 'When nothing goes wrong', q: 'What if you group the two statements in a transaction and nothing happens between the withdrawal and the deposit?', d: 'The result is the same either way.', v: { mode: 'tx', fail: 'none', peek: false } },
    { t: 'When someone else queries partway through', q: 'What if nothing happens between the withdrawal and the deposit, and another user queries the total of the two accounts partway through?', d: 'Without a transaction: a moment when the total is 1,000 won short is visible.', v: { mode: 'auto', fail: 'none', peek: true } },
    { t: 'A query partway through a transaction', q: 'What if you group the two statements in a transaction, nothing happens, and another user queries the total partway through?', d: 'Changes that are not committed yet are not visible to others.', v: { mode: 'tx', fail: 'none', peek: true } },
  ],
  code: function (c) {
    var w = "UPDATE account SET balance = balance - 1000 WHERE id = 'A';   -- withdrawal\n", d = "UPDATE account SET balance = balance + 1000 WHERE id = 'B';   -- deposit\n", gap = c.fail === 'ex' ? '-- (an application error occurs here)\n' : c.fail === 'crash' ? '-- (the server crashes here)\n' : '', skip = "-- UPDATE account SET balance = balance + 1000 WHERE id = 'B';   -- deposit: never runs";
    if (c.mode === 'auto') return '-- Autocommit: each statement is made permanent as soon as it finishes\n' + w + gap + (c.fail === 'none' ? d : skip);
    return 'START TRANSACTION;\n' + w + gap + (c.fail === 'none' ? d + 'COMMIT;      -- both are made permanent together here' : skip + '\n' + (c.fail === 'ex' ? 'ROLLBACK;    -- the error is detected and everything done so far is undone' : '-- COMMIT is never reached → the DB undoes the changes on its own'));
  },
  label: function (c) { return (c.mode === 'auto' ? 'No transaction' : 'Transaction') + ' · ' + { none: 'no problem', ex: 'error partway through', crash: 'server crash partway through' }[c.fail] + (c.peek ? ' · query partway through' : ''); },
  columns: ['Final A', 'Final B', 'Total (6,000 at first)', 'Total that someone else saw partway through'],
  // Pure calculation used to check the model against the results of real execution
  result: function (c) { var auto = c.mode === 'auto', ok = c.fail === 'none'; return { mid: auto ? 'A=4000, B=1000' : 'A=5000, B=1000', final: ok ? 'A=4000, B=2000' : auto ? 'A=4000, B=1000' : 'A=5000, B=1000' }; },
  simulate: function (c) {
    var auto = c.mode === 'auto', ev = [], sum = [], S = { A: 5000, B: 1000, pA: null, pB: null, tx: auto ? 'None (autocommit)' : 'Not started', seen: '' };
    function push(s, k) { ev.push({ s: s, k: k, snap: JSON.parse(JSON.stringify(S)) }); }
    push('Account A has 5,000 won, and account B has 1,000 won. The total is 6,000 won. 1,000 won is transferred from A to B.', '');
    if (!auto) { S.tx = 'In progress'; push('START TRANSACTION: This tells the DB to treat the changes from now on as one group. The changes are not made permanent until the group ends.', ''); }
    if (auto) { S.A = 4000; push('Withdrawal: A is changed to 4,000 won. There is no transaction, so this statement is made permanent (committed) as soon as it runs. It cannot be undone.', ''); }
    else { S.pA = 4000; push('Withdrawal: A is changed to 4,000 won. The change is not permanent yet. A shows 4,000 won only inside this transaction, and the value that is permanent in the DB is still 5,000 won.', ''); }
    var midSum = auto ? 5000 : 6000;
    if (c.peek) { S.seen = 'Seen by another user: A=' + (auto ? 4000 : 5000) + ', B=1000, total ' + midSum; push('At this moment, another user queries the two accounts. ' + (auto ? 'The withdrawal is already permanent and the deposit has not happened yet, so the total appears as 5,000 won. A moment in which 1,000 won is nowhere has been exposed to the outside.' : 'Uncommitted changes are not visible to other users. The values from before the transfer are seen as they were, with a total of 6,000 won.'), auto ? 'bad' : 'good'); }
    if (c.fail === 'none') {
      if (auto) { S.B = 2000; push('Deposit: B is changed to 2,000 won. This is also made permanent right away. The total is 6,000 won again.', 'good'); }
      else { S.pB = 2000; push('Deposit: B is changed to 2,000 won. The change is not permanent yet.', ''); S.A = 4000; S.B = 2000; S.pA = null; S.pB = null; S.tx = 'Committed'; push('COMMIT: The two changes are made permanent together. From this moment, other users also see the new values. What has been committed remains even if the server crashes.', 'good'); }
    } else {
      var what = c.fail === 'ex' ? 'An error occurred in the application, so the deposit statement could not run.' : 'The server crashed, so the deposit statement could not run.';
      if (auto) push(what + ' The withdrawal is already permanent. 1,000 won was taken out of A but did not go into B. 1,000 won has disappeared.', 'bad');
      else { S.pA = null; S.tx = c.fail === 'ex' ? 'Rolled back' : 'Rolled back (on restart)'; push(what + (c.fail === 'ex' ? ' The application sends ROLLBACK.' : ' COMMIT was never reached, so when the DB starts again, it finds the unfinished transaction and undoes it.') + ' It is as if the withdrawal never happened. A is still 5,000 won.', 'good'); }
    }
    var total = S.A + S.B;
    if (auto && c.fail !== 'none') sum.push('Several statements must be "all or nothing", but only some of them were applied. A transaction is the mechanism that guarantees this (atomicity).');
    if (!auto && c.fail !== 'none') sum.push('With the statements grouped in a transaction, changes that are not committed do not remain, whatever happens partway through. On an error, the transaction is rolled back, and if the server crashed, the DB undoes the changes as it recovers.');
    if (c.peek) sum.push(auto ? 'Without a transaction, the intermediate state is visible to other users as it is.' : 'Uncommitted changes are not visible to other transactions (isolation). How strictly they are hidden is set by the isolation level, which is covered in the "Isolation levels" lab.');
    sum.push('The four properties of a transaction (ACID): all or nothing (atomicity), the data stays in a state that follows the rules (consistency), changes in progress are not visible to each other (isolation), and what is committed remains (durability). The @Transactional of Spring sends START TRANSACTION at the start of the method, COMMIT when it ends normally, and ROLLBACK on an exception, on your behalf.');
    return { events: ev, summary: sum, row: [S.A + ' won', S.B + ' won', total + ' won' + (total !== 6000 ? ' (1,000 won missing)' : ''), c.peek ? midSum + ' won' : 'Not queried'] };
  },
  render: function (v, sim, t, H, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : { A: 5000, B: 1000, pA: null, pB: null, tx: '', seen: '' };
    H.counters(v, [[s.tx || '-', 'Transaction state']]);
  },
  // Diagram: On the left are the values that are permanent in the DB and that everyone sees, and on the right are the values that are visible only inside this transaction and are not permanent yet.
  draw: function (P, sim, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : { A: 5000, B: 1000, pA: null, pB: null, tx: '', seen: '' }, total = s.A + s.B, auto = sim.c.mode === 'auto';
    P.size(680, 300);
    P.region('db', 16, 16, 392, 200, 'Values made permanent in the DB (visible to everyone)');
    P.box('A', 28, 54, 178, 60, { cls: s.A === 5000 ? 'plain' : 'hot', title: 'Account A', sub: s.A + ' won' });
    P.box('B', 218, 54, 178, 60, { cls: s.B === 1000 ? 'plain' : 'hot', title: 'Account B', sub: s.B + ' won' });
    P.text('sum', 28, 148, 'Total ' + total + ' won' + (total !== 6000 ? ' (1,000 won is nowhere)' : ''), { cls: total !== 6000 ? 'bad' : 'good' });
    P.region('tx', 432, 16, 232, 200, auto ? 'No transaction (autocommit)' : 'Values seen only in this transaction');
    P.box('pA', 444, 54, 208, 38, { cls: s.pA === null ? 'ghost' : 'hot', title: 'A', right: s.pA === null ? '-' : s.pA + ' won (uncommitted)' });
    P.box('pB', 444, 98, 208, 38, { cls: s.pB === null ? 'ghost' : 'hot', title: 'B', right: s.pB === null ? '-' : s.pB + ' won (uncommitted)' });
    P.text('txs', 444, 170, 'State: ' + (s.tx || '-'), { cls: s.tx.indexOf('Rolled back') >= 0 ? 'bad' : s.tx.indexOf('Committed') >= 0 ? 'good' : 'mut' });
    if (s.tx === 'Committed') P.arrow('cm', 'tx:l', 'db:r', { cls: 'good', label: 'commit' });
    P.box('seen', 16, 232, 648, 40, { cls: !s.seen ? 'ghost' : s.seen.indexOf('5000') >= 0 && s.seen.indexOf('total 5000') >= 0 ? 'bad' : 'good', title: 'Values that another user saw partway through', right: s.seen ? s.seen.replace('Seen by another user: ', '') : 'Not queried' });
    P.note('With a transaction, changes first accumulate only on the right, and at the moment of the commit they move to the left all at once. Without one, each statement is applied to the left immediately, so stopping partway through leaves a half-changed state.');
  },
  assume: 'The final balances and the results of the query partway through were confirmed for all 12 combinations by running them on a real SQL engine (SQLite) with two connections. "The server crashes" was reproduced by closing the connection without committing. That uncommitted values are not visible to the query partway through is the behavior under the default settings of most DBs, and at the lowest isolation level they can be visible.',
});

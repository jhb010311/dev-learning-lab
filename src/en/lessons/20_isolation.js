Lab.register({
  id: 'iso', nav: 'Isolation levels', cat: 'Database', mode: 'step',
  title: 'How does data that another transaction is changing look to me?',
  why: 'Lining up all concurrently running transactions in one line and running them one after another is the safest, but it greatly reduces the amount that can be processed at the same time. The transaction isolation level sets in steps how far to allow phenomena such as reading a value before it is committed, a value changing when it is read again, and a row appearing that was not there, so that it blocks only as much as needed and lets the rest run concurrently.',
  use: 'Usually you use the database\'s default isolation level as it is, and in Spring you change it with @Transactional(isolation = ...) only for the transactions that really need it. Consider the isolation level when values read several times in one transaction must agree with each other, as in settlement or statistics. A problem where the same row is changed concurrently, such as an inventory decrease, is prevented with a lock or an UPDATE with a condition rather than by relying on the isolation level.',
  intro: 'While transaction A runs a query, transaction B changes the same data. Depending on the isolation level, A may or may not see the changes made by B.',
  terms: ['Transaction isolation level', 'Dirty read', 'Non-repeatable read', 'Phantom read', 'MVCC (multiversion concurrency control)', 'Undo log and redo log', 'Shared locks and exclusive locks'], ranks: ['isolation', 'dbengine'],
  controls: [
    { id: 'sc', label: 'Situation', type: 'select', value: 'nonrep', options: [['dirty', 'A queries a value that B has changed but not yet committed'], ['nonrep', 'B changes a value and commits between the two queries of A'], ['phantom', 'B adds a new row and commits between the two queries of A']] },
    { id: 'lv', label: 'Isolation level of transaction A', type: 'select', value: 'RC', options: [['RU', 'READ UNCOMMITTED'], ['RC', 'READ COMMITTED'], ['RR', 'REPEATABLE READ (MySQL default)'], ['SER', 'SERIALIZABLE']] },
  ],
  presets: [
    { t: 'Default settings', q: 'How do the two queries of A look when A uses READ COMMITTED and B changes a value and commits between them?', d: 'READ COMMITTED. A runs the same query twice and gets different values.', v: { sc: 'nonrep', lv: 'RC' } },
    { t: 'Raising it to REPEATABLE READ', q: 'What if you change the isolation level of transaction A to REPEATABLE READ?', d: 'The second query sees the same value as the first.', v: { sc: 'nonrep', lv: 'RR' } },
    { t: 'Reading an uncommitted value', q: 'What if A queries with READ UNCOMMITTED a value that B has changed but not yet committed?', d: 'READ UNCOMMITTED. A reads a value that will be rolled back and disappear.', v: { sc: 'dirty', lv: 'RU' } },
    { t: 'The same situation, READ COMMITTED', q: 'What if A queries with READ COMMITTED a value that B has changed but not yet committed?', d: 'The value from before the commit is not visible.', v: { sc: 'dirty', lv: 'RC' } },
    { t: 'A row that did not exist appears', q: 'What if B adds a new row and commits between the two queries of A, which uses READ COMMITTED?', d: 'READ COMMITTED. The row count goes up in the second query.', v: { sc: 'phantom', lv: 'RC' } },
    { t: 'SERIALIZABLE', q: 'What if you change the isolation level of transaction A to SERIALIZABLE?', d: 'There are no anomalies, but B waits for A.', v: { sc: 'nonrep', lv: 'SER' } },
  ],
  NAMES: { RU: 'READ UNCOMMITTED', RC: 'READ COMMITTED', RR: 'REPEATABLE READ', SER: 'SERIALIZABLE' },
  code: function (c) {
    var q = c.sc === 'phantom' ? 'SELECT COUNT(*) FROM orders WHERE amount >= 100;' : 'SELECT balance FROM account WHERE id = 1;', w = c.sc === 'phantom' ? 'INSERT INTO orders (amount) VALUES (200);' : 'UPDATE account SET balance = 500 WHERE id = 1;';
    var head = '-- Session A\nSET TRANSACTION ISOLATION LEVEL ' + this.NAMES[c.lv] + ';\nSTART TRANSACTION;\n';
    if (c.sc === 'dirty') return head + '\n-- Session B\nSTART TRANSACTION;\n' + w + '\n\n-- Session A\n' + q + '\n\n-- Session B\nROLLBACK;\n\n-- Session A\nCOMMIT;';
    return head + q + '   -- first query\n\n-- Session B\nSTART TRANSACTION;\n' + w + '\nCOMMIT;\n\n-- Session A\n' + q + '   -- second query\nCOMMIT;';
  },
  label: function (c) { return { dirty: 'Query of an uncommitted value', nonrep: 'Change between queries', phantom: 'Insert between queries' }[c.sc] + ' · ' + this.NAMES[c.lv]; },
  columns: ['First query of A', 'Second query of A', 'Anomaly', 'Lock wait'],
  simulate: function (c) {
    var L = c.lv, ev = [], tl = [], ver = [], first = '-', second = '-', anomaly = 'None', waited = 'None', sum = [], ph = c.sc === 'phantom';
    function push(a, b, s, k) { tl.push({ a: a, b: b, k: k }); ev.push({ s: s, k: k, snap: { tl: tl.slice(), ver: ver.slice(), first: first, second: second } }); }
    var committed = ph ? '3' : '1000', changed = ph ? '4' : '500';
    ver = ph ? [['Committed rows', 'orders with amount ≥ 100: 3', '']] : [['Current value', '1000 (committed)', '']];
    if (c.sc === 'dirty') {
      push('START TRANSACTION', 'START TRANSACTION', 'The two transactions start. The balance of account 1 is 1000.', '');
      ver = [['Latest version', '500 (changed by B, not committed yet)', 'hot'], ['Earlier version (undo log)', '1000 (last committed value)', '']];
      push('', 'UPDATE ... balance = 500', 'B changed the balance to 500. It has not committed yet. The DB keeps the value from before the change, 1000, in the undo log. B holds an exclusive lock on the row.', '');
      if (L === 'RU') { first = '500'; push('SELECT → 500', '', 'A runs the query. READ UNCOMMITTED reads the latest version as it is, whether or not it has been committed. A sees 500.', 'bad'); }
      else if (L === 'SER') { waited = 'A waits'; push('SELECT → (waiting)', '', 'A runs the query. At SERIALIZABLE, a query also takes a shared lock. But B holds an exclusive lock on that row, so A waits until B finishes.', ''); }
      else { first = '1000'; push('SELECT → 1000', '', 'A runs the query. The latest version is an uncommitted value, so A reads the last committed version, 1000, from the undo log. It does not wait for a lock (MVCC).', 'good'); }
      ver = [['Current value', '1000 (the change by B was canceled)', '']];
      push('', 'ROLLBACK', 'B rolls back. The balance returns to 1000. The value 500 was never made permanent in the DB.', '');
      if (L === 'RU') { anomaly = 'Dirty Read'; push('(keeps working with 500)', '', 'A read the value 500, which never existed. If A used this value for a calculation or a decision, the result is wrong. This is a dirty read.', 'bad'); }
      if (L === 'SER') { first = '1000'; push('SELECT → 1000', '', 'B has finished and its lock is released. The query of A that was waiting runs and reads 1000.', 'good'); }
      push('COMMIT', '', 'A commits.', '');
    } else {
      first = committed;
      push('START TRANSACTION', '', 'A starts a transaction.', '');
      push('SELECT → ' + committed, '', 'This is the first query of A. ' + (ph ? 'There are 3 orders with an amount of 100 or more.' : 'The balance is 1000.') + (L === 'RR' ? ' REPEATABLE READ remembers the state of the data at this point (the snapshot) and reads from it until the transaction ends.' : L === 'SER' ? ' At SERIALIZABLE, a shared lock is placed on the queried ' + (ph ? 'range' : 'row') + '.' : ''), '');
      if (L === 'SER') {
        waited = 'B waits';
        push('', (ph ? 'INSERT' : 'UPDATE') + ' → (waiting)', 'B tries ' + (ph ? 'to insert a new row into that range' : 'to change that row') + '. Because of the lock that A holds, B waits until A finishes.', '');
        second = committed; push('SELECT → ' + committed, '(waiting)', 'This is the second query of A. B has not been able to change anything yet, so the result is the same as the first.', 'good');
        push('COMMIT', '(waiting)', 'A commits and releases its locks.', '');
        ver = ph ? [['Committed rows', 'orders with amount ≥ 100: 4', 'hot']] : [['Current value', '500 (committed)', 'hot']];
        push('', (ph ? 'INSERT' : 'UPDATE') + ' runs, COMMIT', 'B, which was waiting, now runs and commits. The result is the same as if the two transactions had run one after the other.', '');
      } else {
        ver = ph ? [['Committed rows', 'orders with amount ≥ 100: 3', ''], ['Row added by B', '1 order (amount 200, not committed)', 'hot']] : [['Latest version', '500 (changed by B, not committed)', 'hot'], ['Earlier version (undo log)', '1000', '']];
        push('', ph ? 'INSERT ... amount = 200' : 'UPDATE ... balance = 500', 'B ' + (ph ? 'inserts a new order with an amount of 200.' : 'changes the balance to 500.') + ' The query of A took no locks, so B does not have to wait.', '');
        ver = ph ? [['Committed rows', 'orders with amount ≥ 100: 4', 'hot']] : [['Latest version', '500 (committed)', 'hot'], ['Earlier version (undo log)', L === 'RR' ? '1000 (the value at the time of the snapshot of A)' : '1000 (the value A read first)', '']];
        push('', 'COMMIT', 'B commits. ' + (ph ? 'The committed count in the DB is now 4' : 'The committed balance in the DB is now 500') + '.', '');
        if (L === 'RR') { second = committed; push('SELECT → ' + committed, '', 'This is the second query of A. A reads from the snapshot taken at the first query, so it does not see the change that B committed afterward. ' + (ph ? 'The count is still 3.' : 'It follows the earlier version in the undo log and reads 1000.'), 'good'); }
        else { second = changed; anomaly = ph ? 'Phantom Read' : 'Non-repeatable Read'; push('SELECT → ' + changed, '', 'This is the second query of A. ' + (L === 'RC' ? 'READ COMMITTED reads the latest data committed at the time of each query.' : 'READ UNCOMMITTED reads the latest version as it is.') + ' The same query in the same transaction ' + (ph ? 'now shows a row that did not exist before, and the count went from 3 to 4. This is a phantom read.' : 'now returns 500 instead of 1000. This is a non-repeatable read.'), 'bad'); }
        push('COMMIT', '', 'A commits.', '');
      }
    }
    sum.push('Isolation level ' + this.NAMES[L] + ': first query of A ' + first + (second !== '-' ? ', second query ' + second : '') + '. Anomaly: ' + anomaly + '.');
    if (anomaly !== 'None') sum.push(anomaly === 'Dirty Read' ? 'Reading uncommitted data is not acceptable in almost any business application, so READ UNCOMMITTED is not used in practice.' : anomaly === 'Non-repeatable Read' ? 'If a transaction follows a flow such as "query, calculate, query again", the value can change in the middle and throw off the calculation. It is prevented at REPEATABLE READ and above.' : 'The set of rows that match the condition changed in the middle. This is a problem in logic that counts rows and then acts on the result.');
    if (L === 'RR' && ph) sum.push('The SQL standard defines that a phantom read can occur at REPEATABLE READ. But a plain SELECT in MySQL InnoDB reads the snapshot, so the new row is not visible. This lab follows the behavior of InnoDB.');
    if (L === 'RR' && !ph && c.sc !== 'dirty') sum.push('A consistent value can be read without taking locks because the value from before the change is kept in the undo log, so several versions are maintained (MVCC). Reads and writes do not block each other.');
    if (L === 'SER') sum.push('SERIALIZABLE prevents all anomalies, but it also places locks on queries and makes other transactions wait. Concurrent throughput drops sharply and deadlocks increase, so it is rarely used in ordinary services.');
    if (L === 'RC' && c.sc === 'dirty') sum.push('At READ COMMITTED and above, only committed values are read. Even when reading a row that is being changed, the query does not wait for a lock. It reads the earlier version from the undo log.');
    return { events: ev, summary: sum, row: [first, second, anomaly, waited] };
  },
  render: function (v, sim, t, H, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : { tl: [], ver: [], first: '-', second: '-' };
    H.table(v, ['Step', 'Transaction A', 'Transaction B'], s.tl.map(function (r, i) { var on = i === s.tl.length - 1; return { cells: [String(i + 1), { v: r.a, cls: r.a && (r.k === 'bad' ? 'bad' : r.k === 'good' ? 'good' : on ? 'hot' : '') }, { v: r.b, cls: r.b && on ? 'hot' : '' }] }; }), 'In time order (top to bottom)');
  },
  // Diagram: The order in which transactions A and B take turns sending commands to the DB in the middle. What matters is how the value that A read changes.
  draw: function (P, sim, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : { tl: [], ver: [], first: '-', second: '-' }, msgs = [];
    s.tl.forEach(function (r) { if (r.a) msgs.push({ f: 'A', t: 'D', s: r.a, cls: r.k === 'bad' ? 'bad' : r.k === 'good' ? 'good' : '' }); if (r.b) msgs.push({ f: 'B', t: 'D', s: r.b }); });
    var end = P.seq([['A', 'Transaction A', 'wait'], ['D', 'DB', 'plain'], ['B', 'Transaction B', 'wait']], msgs, { keep: 7 }), y = end + 14, diff = s.first !== '-' && s.second !== '-' && s.first !== s.second;
    P.box('r1', 16, y, 318, 40, { cls: s.first === '-' ? 'ghost' : 'plain', title: 'First query of A', right: s.first });
    P.box('r2', 346, y, 318, 40, { cls: s.second === '-' ? 'ghost' : diff ? 'bad' : 'good', title: 'Second query of A', right: s.second });
    s.ver.slice(0, 3).forEach(function (v, i) { P.box('v' + i, 16, y + 50 + i * 34, 648, 28, { cls: v[2] || 'plain', title: v[0], right: v[1] }); });
    P.size(680, y + 50 + Math.max(1, Math.min(3, s.ver.length)) * 34 + 10);
    P.note('This is the order in which the two transactions send commands to the DB in the middle. The two boxes below show the values A saw when it ran the same query twice, and below them are the values (versions) actually stored in the DB.');
  },
  assume: 'The lab follows the behavior of MySQL InnoDB. What each isolation level allows follows the definitions in the SQL standard and the MySQL documentation. That a phantom read is not seen at REPEATABLE READ applies only to plain SELECT statements that take no locks; a statement that works on the latest data, such as SELECT ... FOR UPDATE or UPDATE, can give a different result. That a query takes shared locks at SERIALIZABLE is how InnoDB implements it; other databases such as PostgreSQL work differently. All 12 combinations (3 situations × 4 isolation levels) were run on a real MySQL 8.4.11 with two sessions, and the values that A read and the lock waits were confirmed to match the screen.',
});

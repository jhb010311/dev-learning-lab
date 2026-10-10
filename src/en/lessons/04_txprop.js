Lab.register({
  id: 'txprop', nav: 'Transaction propagation', cat: 'Spring', mode: 'step',
  title: 'How far does a rollback reach when an exception is thrown?',
  intro: 'A method that saves an order calls a method of another bean that saves a log. Both are @Transactional. Which of the two, the order and the log, stays in the database depends on the propagation setting, on where the exception is thrown and what kind it is, and on whether the exception is caught.',
  terms: ['@Transactional', 'Transaction propagation', 'Rollback rules and rollbackFor', 'Savepoint', 'Checked and unchecked exceptions'], ranks: ['txspring', 'exception'],
  controls: [
    { id: 'prop', label: 'Propagation setting of the inner method (saveLog)', type: 'select', value: 'REQUIRED', options: [['REQUIRED', 'REQUIRED (default: joins an existing transaction)'], ['REQUIRES_NEW', 'REQUIRES_NEW (always starts a new one)'], ['NESTED', 'NESTED (savepoint)']] },
    { id: 'ex', label: 'Where the exception is thrown', type: 'select', value: 'inner', options: [['none', 'No exception'], ['inner', 'Inside the inner method (saveLog)'], ['outer', 'In the outer method, after the inner call returns']] },
    { id: 'type', label: 'Kind of exception', type: 'select', value: 'rt', options: [['rt', 'Unchecked exception (IllegalStateException)'], ['chk', 'Checked exception (IOException)']], show: function (c) { return c.ex !== 'none'; } },
    { id: 'catch', label: 'The outer method wraps the inner call in try-catch', type: 'check', value: false, show: function (c) { return c.ex === 'inner'; } },
    { id: 'rf', label: 'Specify rollbackFor = Exception.class', type: 'check', value: false, show: function (c) { return c.ex !== 'none' && c.type === 'chk'; } },
  ],
  presets: [
    { t: 'Default settings', d: 'REQUIRED, with an unchecked exception in the inner method. The order and the log are rolled back together.', v: { prop: 'REQUIRED', ex: 'inner', type: 'rt', catch: false, rf: false } },
    { t: 'Rolled back even though the exception is caught', d: 'With REQUIRED, catch the exception from the inner method.', v: { prop: 'REQUIRED', ex: 'inner', type: 'rt', catch: true, rf: false } },
    { t: 'Keeping a log failure from ruining the order', d: 'Separate the log with REQUIRES_NEW and catch the exception.', v: { prop: 'REQUIRES_NEW', ex: 'inner', type: 'rt', catch: true, rf: false } },
    { t: 'Keeping the log even when the order fails', d: 'With REQUIRES_NEW, the outer method fails.', v: { prop: 'REQUIRES_NEW', ex: 'outer', type: 'rt', catch: false, rf: false } },
    { t: 'How NESTED differs', d: 'When the outer method fails, the inner work is rolled back with it. Compare this with the example just above.', v: { prop: 'NESTED', ex: 'outer', type: 'rt', catch: false, rf: false } },
    { t: 'A checked exception does not cause a rollback', d: 'The exception leaves the method, yet the order and the log are committed.', v: { prop: 'REQUIRED', ex: 'inner', type: 'chk', catch: false, rf: false } },
    { t: 'Specifying rollbackFor', d: 'The transaction is rolled back on a checked exception too.', v: { prop: 'REQUIRED', ex: 'inner', type: 'chk', catch: false, rf: true } },
  ],
  code: function (c) {
    var chk = c.ex !== 'none' && c.type === 'chk', rf = chk && c.rf, E = chk ? 'IOException' : 'IllegalStateException', ct = c.ex === 'inner' && c.catch;
    var call = ct ? '        try {\n            logService.saveLog();\n        } catch (Exception e) {\n            // ignore a failure to save the log\n        }\n' : '        logService.saveLog();\n';
    return '@Service class OrderService {\n    @Transactional' + (rf ? '(rollbackFor = Exception.class)' : '') + '\n    public void placeOrder()' + (chk && !ct ? ' throws IOException' : chk && c.ex === 'outer' ? ' throws IOException' : '') + ' {\n        orderDao.insert(order);            // save the order\n' + call +
      (c.ex === 'outer' ? '        throw new ' + E + '();\n' : '') + '    }\n}\n\n@Service class LogService {\n    @Transactional(propagation = Propagation.' + c.prop + (rf ? ',\n                   rollbackFor = Exception.class' : '') + ')\n    public void saveLog()' + (chk && c.ex === 'inner' ? ' throws IOException' : '') + ' {\n        logDao.insert(log);                // save the log\n' +
      (c.ex === 'inner' ? '        throw new ' + E + '();\n' : '') + '    }\n}';
  },
  label: function (c) { var s = c.prop + ' · ' + { none: 'no exception', inner: 'inner: ', outer: 'outer: ' }[c.ex]; if (c.ex !== 'none') s += (c.type === 'rt' ? 'unchecked exception' : 'checked exception' + (c.rf ? ' (rollbackFor)' : '')) + (c.ex === 'inner' ? (c.catch ? ' · caught' : ' · not caught') : ''); return s; },
  columns: ['Order', 'Log', 'What the caller gets', 'Connections in use at once'],
  simulate: function (c) {
    var chk = c.ex !== 'none' && c.type === 'chk', trig = c.ex !== 'none' && (!chk || c.rf), ct = c.ex === 'inner' && c.catch, E = chk ? 'IOException' : 'IllegalStateException';
    var A = 'none', ro = false, B = null, SP = null, order = 'none', log = 'none', caller = 'still running', ev = [], P = c.prop;
    function push(s, k) { ev.push({ s: s, k: k, snap: { A: A, ro: ro, B: B, SP: SP, order: order, log: log, caller: caller } }); }
    function endA(commit, why) {
      if (commit && ro) { A = 'rolled back'; if (order === 'uncommitted') order = 'rolled back'; if (log === 'uncommitted') log = 'rolled back'; caller = 'UnexpectedRollbackException'; push('placeOrder() returns normally, so the proxy tries to commit transaction A. But A is marked rollback-only. The proxy does not commit. It rolls everything back and then throws an UnexpectedRollbackException. This is why the order is not saved even though the exception was caught.', 'bad'); return; }
      if (commit) { A = 'committed'; if (order === 'uncommitted') order = 'committed'; if (log === 'uncommitted') log = 'committed'; push(why + 'The proxy commits transaction A.', 'good'); }
      else { A = 'rolled back'; if (order === 'uncommitted') order = 'rolled back'; if (log === 'uncommitted') log = 'rolled back'; push(why + 'The proxy rolls back transaction A. All the work done in A is undone.', 'bad'); }
    }
    A = 'active'; push('placeOrder() is called. Before running the method, the proxy starts transaction A (using 1 connection).', '');
    order = 'uncommitted'; push('The order is inserted with an INSERT. It is not committed yet, so it is visible only inside transaction A.', '');
    if (P === 'REQUIRED') push('saveLog() is called. Its propagation setting is REQUIRED and transaction A is already active, so it does not start a new transaction and joins A.', '');
    if (P === 'REQUIRES_NEW') { A = 'suspended'; B = 'active'; push('saveLog() is called. Its propagation setting is REQUIRES_NEW, so the proxy suspends transaction A, gets one more connection, and starts a separate transaction B.', ''); }
    if (P === 'NESTED') { SP = 'set'; push('saveLog() is called. Its propagation setting is NESTED, so the proxy sets a savepoint (a point to roll back to) inside transaction A. There is still only one transaction and one connection: A.', ''); }
    log = 'uncommitted'; push('The log is inserted with an INSERT. ' + (P === 'REQUIRES_NEW' ? 'It belongs to transaction B.' : 'It belongs to transaction A.'), '');
    if (c.ex === 'inner') {
      push('Inside saveLog(), an ' + E + ' is thrown and propagates out of the method.', 'bad');
      var rule = trig ? (chk ? 'This exception is specified in rollbackFor, so it results in a rollback. ' : 'An unchecked exception results in a rollback. ') : 'A checked exception does not result in a rollback in the default configuration. ';
      if (P === 'REQUIRED') { if (trig) { ro = true; push('Proxy of saveLog(): ' + rule + 'But this method only joined A, so it cannot roll back by itself. Instead, it marks A as rollback-only and rethrows the exception.', 'bad'); } else push('Proxy of saveLog(): ' + rule + 'It leaves no mark and just rethrows the exception.', ''); }
      if (P === 'REQUIRES_NEW') { if (trig) { B = 'rolled back'; log = 'rolled back'; A = 'active'; push('Proxy of saveLog(): ' + rule + 'It rolls back transaction B. The INSERT of the log is undone. The suspended transaction A is not affected and resumes.', 'bad'); } else { B = 'committed'; log = 'committed'; A = 'active'; push('Proxy of saveLog(): ' + rule + 'It commits transaction B even though an exception was thrown. The log is now permanent. A resumes.', ''); } }
      if (P === 'NESTED') { if (trig) { SP = 'rolled back to here'; log = 'rolled back'; push('Proxy of saveLog(): ' + rule + 'It rolls back only to the savepoint. The INSERT of the log is undone, and the INSERT of the order, which ran before it, stays. A is not marked rollback-only.', 'bad'); } else { SP = 'released'; push('Proxy of saveLog(): ' + rule + 'It releases the savepoint and just rethrows the exception. The INSERT of the log remains part of A.', ''); } }
      if (ct) { push('placeOrder() catches the exception with catch. The method runs to the end and returns normally.', ''); caller = 'normal return'; endA(true, 'placeOrder() returned normally. '); }
      else { caller = E; endA(!trig, 'placeOrder() does not catch the exception, so the ' + E + ' propagates out as it is. Proxy of placeOrder(): ' + rule); }
    } else {
      if (P === 'REQUIRED') push('saveLog() returns normally. It only joined the transaction, so nothing is committed here. The commit happens when placeOrder(), which started A, ends.', '');
      if (P === 'REQUIRES_NEW') { B = 'committed'; log = 'committed'; A = 'active'; push('saveLog() returns normally. The proxy commits transaction B. The log is now permanent, and whatever happens to A afterward, it cannot be undone. The suspended transaction A resumes.', 'good'); }
      if (P === 'NESTED') { SP = 'released'; push('saveLog() returns normally. The proxy releases the savepoint. The INSERT of the log remains part of A, and whether it becomes permanent depends on the commit of A.', ''); }
      if (c.ex === 'outer') { push('In placeOrder(), an ' + E + ' is thrown and propagates out of the method.', 'bad'); caller = E; endA(!trig, 'Proxy of placeOrder(): ' + (trig ? (chk ? 'This exception is specified in rollbackFor, so it results in a rollback. ' : 'An unchecked exception results in a rollback. ') : 'A checked exception does not result in a rollback in the default configuration. The exception still propagates to the caller. ')); }
      else { caller = 'normal return'; endA(true, 'placeOrder() returned normally. '); }
    }
    var txt = function (x) { return x === 'committed' ? 'saved' : 'not saved'; }, sum = ['Order: ' + txt(order) + '. Log: ' + txt(log) + '. The caller ' + (caller === 'normal return' ? 'got the result back without an exception.' : 'got an ' + caller + '.')];
    if (caller === 'UnexpectedRollbackException') sum.push('When an exception that results in a rollback leaves an inner method that joined with REQUIRED, the whole transaction is already rollback-only, even if the outer method catches that exception. To separate an inner failure from the outer method, split the boundary with REQUIRES_NEW or NESTED, or handle the exception inside the inner method.');
    if (c.ex !== 'none' && !trig) sum.push('A checked exception does not cause a rollback in the default configuration. An exception was thrown, yet the work done up to that point was committed. To roll back on checked exceptions too, specify rollbackFor.');
    if (P === 'REQUIRES_NEW') sum.push('REQUIRES_NEW is a completely separate transaction, so a commit or a rollback on one side does not affect the other. In exchange, A keeps holding its connection while it is suspended, so 2 connections are in use at the same time. When many requests arrive at once, the connection pool can be exhausted first.');
    if (P === 'NESTED') sum.push('NESTED is a partial rollback inside the same transaction. The inner part can be rolled back on its own, but if the outer transaction is rolled back, the inner part disappears with it. This is the difference from REQUIRES_NEW.');
    if (P === 'REQUIRED' && c.ex !== 'none' && trig && caller !== 'UnexpectedRollbackException') sum.push('REQUIRED ties both into one transaction, so the order and the log are rolled back together no matter which side fails.');
    return { events: ev, summary: sum, row: [txt(order), txt(log), caller, P === 'REQUIRES_NEW' ? '2' : '1'], fin: { order: order, log: log, caller: caller } };
  },
  render: function (v, sim, t, H, shown) {
    var c = sim.c, last = shown[shown.length - 1], s = last ? last.snap : { A: 'none', ro: false, B: null, SP: null, order: 'none', log: 'none', caller: 'not called yet' };
    var cls = function (x) { return x === 'committed' ? 'good' : x === 'rolled back' ? 'bad' : x === 'active' ? 'hot' : x === 'suspended' ? 'wait' : 'none'; };
    H.title(v, 'Transactions'); var ln = H.lanes(v);
    H.lane(ln, 'A', s.A + (s.ro ? ' · marked rollback-only' : '') + ' (started by placeOrder)', s.ro && s.A === 'active' ? 'bad' : cls(s.A));
    if (c.prop === 'REQUIRES_NEW') H.lane(ln, 'B', s.B ? s.B + ' (started by saveLog, separate connection)' : 'none yet', s.B ? cls(s.B) : 'none');
    if (c.prop === 'NESTED') H.lane(ln, 'Savepoint', s.SP ? s.SP + ' (a point inside A to roll back to)' : 'none yet', s.SP === 'rolled back to here' ? 'bad' : s.SP === 'set' ? 'wait' : 'none');
    var st = function (x) { return x === 'none' ? 'none yet' : x === 'uncommitted' ? 'inserted (not committed)' : x === 'committed' ? 'committed (stays in the DB)' : 'rolled back (gone)'; };
    var cc = function (x) { return x === 'committed' ? 'good' : x === 'rolled back' ? 'bad' : x === 'uncommitted' ? 'hot' : ''; };
    H.table(v, ['Data', 'Transaction it belongs to', 'State'], [
      { cells: ['Order (1 row)', 'A', { v: st(s.order), cls: cc(s.order) }] },
      { cells: ['Log (1 row)', c.prop === 'REQUIRES_NEW' ? 'B' : c.prop === 'NESTED' ? 'A (after the savepoint)' : 'A', { v: st(s.log), cls: cc(s.log) }] },
    ], 'Database tables');
    H.counters(v, [[s.caller, 'What the caller of placeOrder() gets']]);
  },
  // Diagram: each transaction is drawn as a box, and the data that belongs to it is placed inside the box. The color of the box is the fate of the data inside it.
  draw: function (P, sim, shown) {
    var c = sim.c, last = shown[shown.length - 1], s = last ? last.snap : { A: 'none', ro: false, B: null, SP: null, order: 'none', log: 'none', caller: 'not called yet' }, rn = c.prop === 'REQUIRES_NEW', ne = c.prop === 'NESTED';
    var tc = function (x) { return x === 'committed' ? 'good' : x === 'rolled back' ? 'bad' : x === 'active' ? 'hot' : x === 'suspended' ? 'wait' : 'ghost'; }, dc = function (x) { return x === 'committed' ? 'good' : x === 'rolled back' ? 'bad' : x === 'uncommitted' ? 'hot' : 'ghost'; };
    var st = function (x) { return x === 'none' ? 'none yet' : x === 'uncommitted' ? 'inserted (not committed)' : x === 'committed' ? 'committed (stays in the DB)' : 'rolled back (gone)'; };
    P.size(680, 300);
    P.box('A', 16, 30, rn ? 320 : 648, 180, { cls: s.ro && s.A === 'active' ? 'bad' : tc(s.A), title: 'Transaction A (started by placeOrder)', sub: s.A + (s.ro ? ' · marked rollback-only' : '') });
    P.box('ord', 32, 100, rn ? 288 : 290, 60, { cls: dc(s.order), title: 'Order (1 row)', sub: st(s.order) });
    if (rn) P.box('B', 352, 30, 312, 180, { cls: s.B ? tc(s.B) : 'ghost', title: 'Transaction B (saveLog, connection 2)', sub: s.B || 'none yet' });
    if (ne) P.box('SP', 340, 82, 310, 112, { cls: s.SP === 'rolled back to here' ? 'bad' : s.SP ? 'wait' : 'ghost', title: 'After the savepoint (a section of A)', sub: s.SP || 'none yet' });
    P.box('log', rn ? 368 : ne ? 354 : 342, ne ? 128 : 100, rn ? 280 : ne ? 282 : 306, ne ? 54 : 60, { cls: dc(s.log), title: 'Log (1 row)', sub: st(s.log) });
    P.box('caller', 16, 232, 648, 40, { cls: s.caller === 'not called yet' ? 'ghost' : s.caller.indexOf('Exception') >= 0 ? 'bad' : 'good', title: 'What the caller of placeOrder() gets', right: s.caller });
    P.note('A large box is a transaction, and the small boxes inside it are the data that belongs to that transaction. When a transaction is rolled back, the data inside it disappears with it. Which box the log is in is the difference between the propagation settings.');
  },
  assume: 'saveLog() is a method of another bean, so it is called through the proxy (when it is called from inside the same class, the inner @Transactional does not apply; the "Proxies and self-invocation" lab covers that case). The rules follow the default behavior of the Spring Framework. A transaction is rolled back only on unchecked exceptions and Error, and when an exception that results in a rollback leaves a participating transaction, the whole transaction is marked rollback-only. NESTED is implemented with JDBC savepoints and works with DataSourceTransactionManager, which JdbcTemplate and MyBatis use. With JPA (JpaTransactionManager + Hibernate), using NESTED throws a NestedTransactionNotSupportedException. This is because a savepoint applies only to the JDBC connection and not to the persistence context. All 72 combinations were run on a real Spring setup (Spring Framework 7.0.9, DataSourceTransactionManager, the H2 database), and it was confirmed that whether the order and the log stay in the database, what the caller gets, and the number of connections in use at once match the screen.',
});

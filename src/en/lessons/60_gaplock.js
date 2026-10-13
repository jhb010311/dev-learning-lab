Lab.register({
  id: 'gaplock', nav: 'Gap locks and next-key locks', cat: 'Database', mode: 'step',
  title: 'Why is an INSERT blocked when I queried a row that does not exist?',
  intro: 'Transaction A locks rows with SELECT ... FOR UPDATE. MySQL InnoDB does not lock only the rows. Depending on the condition, it also locks the gaps between rows, so that other transactions cannot insert a new row in between.',
  terms: ['Record locks, gap locks, and next-key locks', 'Shared locks and exclusive locks', 'Transaction isolation level', 'Phantom read', 'Pessimistic locking', 'Deadlock'], ranks: ['dbengine', 'isolation'],
  controls: [
    { id: 'q', label: 'Query condition of transaction A', type: 'select', value: 'range', options: [['hit', 'id = 20 (one row that exists)'], ['miss', 'id = 25 (a row that does not exist)'], ['range', 'id BETWEEN 20 AND 30 (a range)']] },
    { id: 'lv', label: 'Isolation level', type: 'select', value: 'RR', options: [['RR', 'REPEATABLE READ (MySQL default)'], ['RC', 'READ COMMITTED']] },
    { id: 'ins', label: 'Row that transaction B tries to insert', type: 'select', value: '25', options: [['25', 'id = 25 (between 20 and 30)'], ['45', 'id = 45 (after 40)']] },
  ],
  presets: [
    { t: 'Default settings', q: 'Under REPEATABLE READ, what happens when transaction A queries id BETWEEN 20 AND 30 and transaction B inserts id = 25?', d: 'A range query. An INSERT that tries to squeeze in between 20 and 30 waits.', v: { q: 'range', lv: 'RR', ins: '25' } },
    { t: 'Querying a row that does not exist', q: 'What if transaction A queries id = 25 (a row that does not exist)?', d: 'There is no row to lock, yet the gap at that place is locked.', v: { q: 'miss', lv: 'RR', ins: '25' } },
    { t: 'Querying exactly one existing row', q: 'What if transaction A queries id = 20 (one row that exists)?', d: 'Only that row is locked. The gaps next to it are free.', v: { q: 'hit', lv: 'RR', ins: '25' } },
    { t: 'Lowering it to READ COMMITTED', q: 'What if you change the isolation level to READ COMMITTED?', d: 'The gaps are not locked. The INSERT goes through right away.', v: { q: 'range', lv: 'RC', ins: '25' } },
    { t: 'Inserting outside the range', q: 'What if transaction B tries to insert id = 45 (after 40)?', d: 'That place is not locked, so B does not wait.', v: { q: 'range', lv: 'RR', ins: '45' } },
  ],
  code: function (c) {
    var w = { hit: 'id = 20', miss: 'id = 25', range: 'id BETWEEN 20 AND 30' }[c.q];
    return '-- The ids (primary key) in the table: 10, 20, 30, 40, and rows far away from them\n-- (the queried range is a small part of the table, so only that range is scanned)\n\n-- Transaction A\nSET TRANSACTION ISOLATION LEVEL ' + (c.lv === 'RR' ? 'REPEATABLE READ' : 'READ COMMITTED') + ';\nSTART TRANSACTION;\nSELECT * FROM coupon WHERE ' + w + ' FOR UPDATE;\n\n-- Transaction B (A has not committed yet)\nINSERT INTO coupon (id) VALUES (' + c.ins + ');';
  },
  label: function (c) { return { hit: 'id = 20', miss: 'id = 25 (no such row)', range: 'ids 20~30' }[c.q] + ' · ' + c.lv + ' · B inserts ' + c.ins; },
  columns: ['Locked rows', 'Locked gaps', 'INSERT of B', 'Can a new row slip in?'],
  simulate: function (c) {
    var RR = c.lv === 'RR', ev = [], sum = [], rec = [], gaps = [], ins = +c.ins;
    if (c.q === 'hit') rec = [20];
    if (c.q === 'range') rec = [20, 30];
    if (RR && (c.q === 'miss' || c.q === 'range')) gaps = [[20, 30]];
    var blocked = gaps.some(function (g) { return ins > g[0] && ins < g[1]; });
    function push(s, k, stage) { ev.push({ s: s, k: k, snap: { stage: stage } }); }
    push('The coupon table has rows with ids 10, 20, 30, and 40, and also rows with much larger ids. In the index, there are gaps between the rows, such as (10~20), (20~30), (30~40), and (after 40).', '', 0);
    if (c.q === 'hit') push('Transaction A queries the row with id = 20 using FOR UPDATE. The primary key finds exactly one row, so the lock is placed on that row only (a record lock). It is guaranteed that this is the only row that will ever match the condition, so there is no need to lock a gap.', '', 1);
    else if (c.q === 'miss') push('Transaction A queries id = 25 using FOR UPDATE. There is no such row. ' + (RR ? 'Because there is no row to lock, InnoDB locks the gap between 20 and 30, where 25 would go (a gap lock). This is to make sure that what does not exist now still does not exist until my transaction ends.' : 'At READ COMMITTED, the gap is not locked. There is no row to lock either, so no lock is taken at all.'), '', 1);
    else push('Transaction A queries ids 20 through 30 using FOR UPDATE. It locks rows 20 and 30, which match the condition. ' + (RR ? 'It also locks the gap (20~30) between them. A lock on a row together with the lock on the gap before it is called a next-key lock.' : 'At READ COMMITTED, the gap is not locked, only the rows that were found.'), '', 1);
    push('Transaction B tries to insert the row with id = ' + ins + '. An INSERT checks whether the gap where the new row would go is locked.', '', 2);
    if (blocked) push('The place where id ' + ins + ' goes is the gap (20~30), and A has locked that gap. The INSERT of B waits until A commits or rolls back. If it waits too long, it fails with a lock wait timeout error.', 'bad', 3);
    else push('The place where id ' + ins + ' goes is not locked. The INSERT of B runs right away.' + (!RR && ins > 20 && ins < 30 && c.q !== 'hit' ? ' If A runs the query with the same condition again, the row with id 25, which did not exist at first, appears (a phantom read).' : ''), !RR && ins === 25 && c.q !== 'hit' ? 'bad' : 'good', 3);
    if (blocked) push('When A commits, its locks are released, and only then does the INSERT of B that was waiting run.', '', 4);
    var phantom = !RR && c.q !== 'hit' && ins === 25;
    if (RR && gaps.length) sum.push('At REPEATABLE READ, InnoDB locks the gap to stop new rows from slipping into the range (phantoms). As a cost, an INSERT of a value that the query did not match can also be blocked if it falls inside a locked gap.');
    if (c.q === 'miss' && RR) sum.push('This often causes trouble in an "insert if it does not exist" pattern. If two transactions each query a row that does not exist with FOR UPDATE, both get a gap lock on the same gap (gap locks do not block each other). If both then try to INSERT, each is blocked by the gap lock of the other, and a deadlock occurs.');
    if (c.q === 'hit') sum.push('When a unique index finds exactly one existing row, only a record lock is placed. To keep the range of locks narrow, it is important that the condition uses an index precisely. If it cannot use an index, a much wider range is locked.');
    if (!RR) sum.push('At READ COMMITTED, queries do not use gap locks, so INSERTs are blocked less often and deadlocks also decrease. In return, phantom reads are allowed.' + (phantom ? ' In this run, a new row actually slipped in.' : ''));
    return { events: ev, summary: sum, rec: rec, gaps: gaps, blocked: blocked, row: [rec.length ? rec.join(', ') : 'None', gaps.length ? '(20~30)' : 'None', blocked ? 'Waits until A finishes' : 'Runs right away', phantom ? 'Yes (phantom occurs)' : blocked ? 'No' : c.q === 'hit' || ins === 45 ? 'Outside the queried range' : 'No'] };
  },
  render: function (v, sim, t, H, shown) {
    var c = sim.c, last = shown[shown.length - 1], st = last ? last.snap.stage : -1, ins = +c.ins, items = [], ids = [10, 20, 30, 40];
    if (st < 0) { H.text(v, 'Press Run to start.'); return; }
    function gapCell(a, b, label) { var locked = st >= 1 && sim.gaps.some(function (g) { return g[0] === a; }), here = st >= 2 && ins > a && ins < b; return [label + (here ? (st >= 3 ? (sim.blocked ? ' ← ' + ins + ' waits' : ' ← ' + ins + ' inserted') : ' ← ' + ins + ' tried') : '') + (locked ? ' [locked]' : ''), (locked ? 'r' : '') + (here ? ' now' : '')]; }
    items.push(gapCell(-1, 10, '(before 10)'));
    ids.forEach(function (id, i) { var locked = st >= 1 && sim.rec.indexOf(id) >= 0; items.push(['Row ' + id + (locked ? ' [locked]' : ''), locked ? 'b' : 'd']); var nx = ids[i + 1] || 999; items.push(gapCell(id, nx, nx === 999 ? '(after 40)' : '(' + id + '~' + nx + ')')); });
    H.title(v, 'id index (smaller values on the left)'); H.slots(v, items, '');
    H.text(v, 'Green is a row, yellow is a row locked by A, red is a gap locked by A, and a dotted line is an unlocked gap.');
  },
  // Diagram: The id index is drawn like a number line. Rows (boxes) and the gaps between them (dotted) alternate, and the places that A locked and the place that B tries to insert are marked.
  draw: function (P, sim, shown) {
    var c = sim.c, last = shown[shown.length - 1], st = last ? last.snap.stage : -1, ins = +c.ins, ids = [10, 20, 30, 40], x = 16, target = ins < 30 ? 2 : 4, waiting = sim.blocked && st === 3, done = st >= 3 && !waiting;
    P.size(680, 300);
    P.box('txa', 16, 16, 440, 46, { cls: st >= 1 ? 'hot' : 'plain', title: 'Transaction A', sub: st >= 4 ? 'Committed. Locks released' : st >= 1 ? 'SELECT ... FOR UPDATE executed, not committed yet' : 'Not started' });
    P.text('ixl', 16, 112, 'id index (smaller values on the left)', { cls: 'mut' });
    for (var k = 0; k <= 4; k++) {
      var lo = k ? ids[k - 1] : 0, gLocked = st >= 1 && st < 4 && sim.gaps.some(function (g) { return g[0] === lo; }), here = k === target && st >= 2;
      P.box('g' + k, x, 124, 80, 52, { cls: gLocked ? 'bad' : here && done ? 'good' : 'ghost', center: true, sub: [k === 0 ? 'Before 10' : k === 4 ? 'After 40' : lo + ' ~ ' + ids[k], gLocked ? 'Gap locked' : here && done ? ins + ' added' : 'Gap'] });
      if (gLocked) P.arrow('la' + k, 'txa:b:' + (0.2 + k * 0.15), 'g' + k + ':t', { cls: 'bad' });
      x += 83;
      if (k < 4) { var id = ids[k], rLocked = st >= 1 && st < 4 && sim.rec.indexOf(id) >= 0; P.box('r' + id, x, 124, 56, 52, { cls: rLocked ? 'hot' : 'wait', center: true, title: 'Row ' + id, sub: rLocked ? 'Locked' : ' ' }); if (rLocked) P.arrow('lr' + id, 'txa:b:' + (0.25 + k * 0.15), 'r' + id + ':t', { cls: 'hot' }); x += 59; }
    }
    P.box('txb', 224, 236, 440, 46, { cls: st >= 3 ? (waiting ? 'bad' : 'good') : st >= 2 ? 'wait' : 'plain', title: 'Transaction B', sub: st >= 3 ? (waiting ? 'INSERT id = ' + ins + ' waiting (for a lock)' : 'INSERT id = ' + ins + ' executed') : st >= 2 ? 'INSERT id = ' + ins + ' attempted' : 'Not started' });
    if (st >= 2) P.arrow('ib', 'txb:t:0.3', 'g' + target + ':b', { cls: waiting ? 'bad dash' : done ? 'good' : 'mut', label: waiting ? 'blocked' : done ? 'insert' : '' });
    P.note('A blue box is a row, and a dotted box is a gap between rows. The yellow rows and the red gap are what transaction A has locked. If the value that B tries to insert falls inside the red gap, B has to wait until A finishes.');
  },
  assume: 'The lab is based on queries by primary key (a unique index) in MySQL InnoDB. The following follow the explanation in the MySQL documentation (InnoDB Locking): when a unique index finds exactly one existing row, only a record lock is placed, and when the query looks for a row that does not exist or for a range, a gap lock is placed as well; and at READ COMMITTED, queries do not use gap locks. The boundary of the gap that is actually locked by a range query can be wider than shown here, depending on the index type and the MySQL version (the gap after the end of the range may also be locked). All 12 combinations were run on a real MySQL 8.4.11 with two sessions, and the locks that A held (the record locks, gap locks, and next-key locks recorded in performance_schema.data_locks) and whether the INSERT of B waits were confirmed to match the screen. However, this result is for the case where the range query scans only that range of the index. InnoDB locks the index records that it scans while it searches, not the rows that match the condition. When the test was run with a table that had only the four rows 10, 20, 30, and 40, MySQL chose a plan that scans the entire index, so all the rows and all the gaps were locked, and even the INSERT of id = 45, which is outside the range, waited. The same result as on the screen appeared only after 500 more rows far away from these were inserted, so that the queried range became a small part of the table.',
});

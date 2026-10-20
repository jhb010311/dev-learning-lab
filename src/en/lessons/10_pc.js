Lab.register({
  id: 'pc', nav: 'Persistence context', cat: 'JPA', mode: 'step',
  title: 'When does JPA send SQL?',
  why: 'When you work with JDBC directly, every time you change an object\'s value you have to write and run an UPDATE statement, and if you read the same row twice, two queries are sent and two different objects are created. The persistence context manages the entities read during one transaction, one for each id, and compares them with their state when first read. It sends an UPDATE by itself for an entity whose value changed, and it does not go to the database when you look up the same entity by id again.',
  use: 'In a service that uses Spring Data JPA, when a @Transactional method loads an entity and only changes a value, an UPDATE is sent at commit without calling save, and this behavior is the reason. When you insert or modify a lot of data at once, the number of managed entities keeps growing, so you call flush and clear from time to time, or use JdbcTemplate or a bulk UPDATE query instead.',
  intro: 'JPA keeps entities in an in-memory space called the persistence context. It does not send SQL at the moment a line of code runs. It collects the SQL and sends it when it is needed.',
  terms: ['Persistence context', 'First-level cache', 'Dirty checking', 'Transactional write-behind and flush', 'Entity'], ranks: ['jpaorm'],
  controls: [
    { id: 'sc', label: 'Code to try', type: 'select', value: 'update', options: [['find2', 'Load the same member twice'], ['update', 'Load a member, then change only the name (no save call)'], ['persist', 'Save 3 new members'], ['jpql', 'Change the name, then run a JPQL query']] },
    { id: 'tx', label: 'The method has @Transactional', type: 'check', value: true, show: function (c) { return c.sc === 'update'; } },
    { id: 'gen', label: 'Primary key generation strategy', type: 'select', value: 'IDENTITY', options: [['IDENTITY', 'IDENTITY (database auto increment)'], ['SEQUENCE', 'SEQUENCE (database sequence)']], show: function (c) { return c.sc === 'persist'; } },
  ],
  presets: [
    { t: 'Default settings', q: 'When is the UPDATE sent if a method with @Transactional loads a member and changes only the name, without a save call?', d: 'Only the name is changed, yet an UPDATE is sent at commit (dirty checking).', v: { sc: 'update', tx: true, gen: 'IDENTITY' } },
    { t: 'Without @Transactional', q: 'What if you turn off @Transactional on the method and run the same code?', d: 'It is the same code, but no UPDATE is sent.', v: { sc: 'update', tx: false, gen: 'IDENTITY' } },
    { t: 'Load the same member twice', q: 'What if you change the code to try to load the same member twice?', d: 'The second load does not go to the database (first-level cache).', v: { sc: 'find2', tx: true, gen: 'IDENTITY' } },
    { t: 'Save: IDENTITY strategy', q: 'What if you save 3 new members with the IDENTITY primary key generation strategy?', d: 'An INSERT is sent right away on every persist call.', v: { sc: 'persist', tx: true, gen: 'IDENTITY' } },
    { t: 'Save: SEQUENCE strategy', q: 'What if you save 3 new members and change the primary key generation strategy to SEQUENCE?', d: 'The INSERTs are collected and sent together at commit (transactional write-behind).', v: { sc: 'persist', tx: true, gen: 'SEQUENCE' } },
    { t: 'JPQL query after a change', q: 'What if you change the name of a loaded member and then run a JPQL query?', d: 'Even before the commit, an UPDATE is sent just before the JPQL query runs.', v: { sc: 'jpql', tx: true, gen: 'IDENTITY' } },
  ],
  lines: function (c) {
    if (c.sc === 'find2') return ['Member a = em.find(Member.class, 1L);', 'Member b = em.find(Member.class, 1L);', 'System.out.println(a == b);'];
    if (c.sc === 'update') return ['Member m = memberRepository.findById(1L).orElseThrow();', 'm.setName("Bob");', '// The method ends without calling save()'];
    if (c.sc === 'persist') return ['em.persist(new Member("Carol"));', 'em.persist(new Member("Dave"));', 'em.persist(new Member("Erin"));'];
    return ['Member m = em.find(Member.class, 1L);', 'm.setName("Bob");', 'List<Member> list = em.createQuery(', '    "select m from Member m where m.name = \'Bob\'", Member.class)', '    .getResultList();'];
  },
  code: function (c) {
    var tx = c.sc !== 'update' || c.tx, head = c.sc === 'persist' ? '@Entity class Member {\n    @Id @GeneratedValue(strategy = GenerationType.' + c.gen + ')\n    Long id;\n    String name;   // constructors omitted\n}\n\n' : '';
    return head + '// Only a method in the class body is shown (class declaration, field declarations, and imports omitted)\n' + (tx ? '@Transactional\n' : '') + 'public void run() {\n' + this.lines(c).map(function (l) { return '    ' + l; }).join('\n') + '\n}' + (tx ? '   // the commit happens when the method ends' : '   // ends without a transaction');
  },
  label: function (c) { return { find2: 'Load twice', update: 'Name change' + (c.tx ? '' : ' · no @Transactional'), persist: 'Save 3 members · ' + c.gen, jpql: 'JPQL after a change' }[c.sc]; },
  columns: ['SQL sent to the DB', 'When the write SQL was sent', 'Result in the DB'],
  simulate: function (c) {
    var ev = [], cache = [], pending = [], sent = [], db = [{ id: 1, name: 'Alice' }], when = 'Not applicable', result = '', sum = [];
    function snap(line) { return { line: line, cache: cache.map(function (e) { return { id: e.id, name: e.name, snap: e.snap, st: e.st }; }), pending: pending.slice(), sent: sent.slice(), db: db.map(function (r) { return { id: r.id, name: r.name, cls: r.cls }; }) }; }
    function push(line, s, k) { ev.push({ s: s, k: k, snap: snap(line) }); }
    function send(sql, at) { sent.push({ sql: sql, at: at }); }
    var L = this.lines(c);
    if (c.sc === 'find2') {
      send('select * from member where id = 1', 'Line 1'); cache.push({ id: 1, name: 'Alice', snap: 'Alice', st: 'Managed' });
      push(0, 'Line 1: The first-level cache of the persistence context does not have member 1. JPA sends a SELECT to the database to read it, and keeps the loaded entity in the first-level cache. It also keeps the values as they were when first read (the snapshot).', '');
      push(1, 'Line 2: The first-level cache already has member 1. JPA does not go to the database and returns the stored object as it is. No SQL was sent.', 'good');
      push(2, 'Line 3: a and b are the same object, so a == b is true. Within the same persistence context, entities with the same identifier are guaranteed to be the same instance.', '');
      push(-1, 'Method ends, commit: JPA compared the current values of the entity with the snapshot, and nothing changed. There is no SQL to send.', '');
      result = 'No change'; sum.push('Although em.find was called twice, the SELECT was sent only once. Within the same transaction, an entity that was already read is taken from the first-level cache.', 'The first-level cache lives only within one transaction (one persistence context). It disappears when the request ends, so its purpose is different from that of a cache that many requests share, such as Redis.');
    }
    if (c.sc === 'update') {
      send('select * from member where id = 1', 'Line 1');
      if (c.tx) {
        cache.push({ id: 1, name: 'Alice', snap: 'Alice', st: 'Managed' });
        push(0, 'Line 1: A SELECT reads member 1 and keeps it in the persistence context. The value at the time it was read, "Alice", is kept as the snapshot.', '');
        cache[0].name = 'Bob'; push(1, 'Line 2: Only the name of the Java object was changed. No SQL goes to the database at this moment. Inside the persistence context, the current value (Bob) now differs from the snapshot (Alice).', '');
        push(2, 'Line 3: The method ends without calling save.', '');
        send("update member set name = 'Bob' where id = 1", 'Just before commit'); db[0].name = 'Bob'; db[0].cls = 'hot'; cache[0].snap = 'Bob'; when = 'Just before commit';
        push(-1, 'Method ends, commit: A flush happens just before the commit. JPA compares the current values of the managed entities with their snapshots, finds that member 1 has changed, builds an UPDATE, sends it to the database, and then commits. This is dirty checking.', 'good');
        result = 'Changed to Bob'; sum.push('An UPDATE was sent even though no update method or save was called. For an entity managed by the persistence context, if you only change a value, JPA compares it with the snapshot at commit time and builds the SQL for you.');
      } else {
        cache.push({ id: 1, name: 'Alice', snap: 'Alice', st: 'Detached (no longer managed)' });
        push(0, 'Line 1: findById sends its SELECT inside its own transaction and ends. The method has no @Transactional, so after the read is finished there is no transaction to apply changes of this entity to the database.', '');
        cache[0].name = 'Bob'; push(1, 'Line 2: The name of the Java object was changed. Only the value in memory changed.', '');
        push(2, 'Line 3: The method ends without calling save.', '');
        push(-1, 'Method ends: There is no commit, so there is no flush either. The point at which the current values would be compared with the snapshot never arrives, so no UPDATE is sent. The name in the DB is still "Alice".', 'bad');
        result = 'Still Alice (not applied)'; when = 'Not sent'; sum.push('Dirty checking happens in the flush when the transaction commits. Without @Transactional, changing a value does not reach the database. No exception is thrown either, so it is easy to miss.');
      }
    }
    if (c.sc === 'persist') {
      ['Carol', 'Dave', 'Erin'].forEach(function (nm, i) {
        var id = i + 2, ins = "insert into member (name) values ('" + nm + "')";
        if (c.gen === 'IDENTITY') { send(ins, 'Line ' + (i + 1)); db.push({ id: id, name: nm, cls: 'hot' }); cache.push({ id: id, name: nm, snap: nm, st: 'Managed' }); push(i, 'Line ' + (i + 1) + ': With the IDENTITY strategy, the id is decided only when the database executes the INSERT. JPA needs the id to keep the entity in the persistence context, so as soon as persist is called, it sends the INSERT and gets id ' + id + ' back.', 'bad'); }
        else { send("select nextval('member_seq')", 'Line ' + (i + 1)); pending.push("insert into member (id, name) values (" + id + ", '" + nm + "')"); cache.push({ id: id, name: nm, snap: nm, st: 'Managed' }); push(i, 'Line ' + (i + 1) + ': JPA first gets id ' + id + ' from the sequence. Once the id is known, it keeps the entity in the persistence context. It does not send the INSERT. It queues it in the write-behind queue.', ''); }
      });
      if (c.gen === 'IDENTITY') { when = 'On every persist call'; push(-1, 'Method ends, commit: All the INSERTs have already been sent, so there is nothing to flush. Only the commit happens.', ''); sum.push('With the IDENTITY strategy, every persist call sends one INSERT right away. The INSERTs cannot be collected and sent together, so JDBC batching cannot be applied to them.'); }
      else { pending.forEach(function (q) { send(q, 'Just before commit'); }); pending = []; ['Carol', 'Dave', 'Erin'].forEach(function (nm, i) { db.push({ id: i + 2, name: nm, cls: 'hot' }); }); when = 'All together, just before commit'; push(-1, 'Method ends, commit: A flush happens and sends the 3 INSERTs queued in the write-behind queue to the database, and then the commit happens.', 'good'); sum.push('With the SEQUENCE strategy, the id can be obtained first, so the INSERTs are postponed until commit (transactional write-behind). The queued INSERTs can be sent together as a JDBC batch.'); }
      result = '3 members added';
    }
    if (c.sc === 'jpql') {
      send('select * from member where id = 1', 'Line 1'); cache.push({ id: 1, name: 'Alice', snap: 'Alice', st: 'Managed' });
      push(0, 'Line 1: A SELECT reads member 1 and keeps it in the persistence context.', '');
      cache[0].name = 'Bob'; push(1, 'Line 2: Only the name of the object was changed. No SQL is sent. The database still has "Alice".', '');
      send("update member set name = 'Bob' where id = 1", 'Line 3 (just before the JPQL query runs)'); db[0].name = 'Bob'; db[0].cls = 'hot'; cache[0].snap = 'Bob'; when = 'Just before the JPQL query runs';
      push(2, 'Lines 3-5: JPQL sends SQL directly to the database, not to the first-level cache. If the query ran as it is, the database would not have the name you just changed, and the result would not match. So an automatic flush happens just before the JPQL query runs, and the UPDATE is sent first. This is not a commit yet.', 'bad');
      send("select * from member where name = 'Bob'", 'Line 3'); push(4, 'After the UPDATE, the SELECT of the JPQL query is sent. It is in the same transaction, so the result of the UPDATE just sent is visible, and member 1 is found.', 'good');
      push(-1, 'Method ends, commit: The changes have already been flushed, so there is no more SQL to send. When the commit happens, the change becomes visible to other transactions too.', '');
      result = 'Changed to Bob'; sum.push('A flush means sending the collected SQL to the database, and it is not the same as a commit. It happens automatically not only at commit but also just before a JPQL query runs.', 'In contrast, em.find looks in the first-level cache first, so it does not trigger a flush.');
    }
    return { events: ev, summary: sum, L: L, row: [String(sent.length), when, result] };
  },
  render: function (v, sim, t, H, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : { line: -2, cache: [], pending: [], sent: [], db: [{ id: 1, name: 'Alice' }] };
    H.table(v, ['Line', 'Code', ''], sim.L.map(function (l, i) { var on = i === s.line; return { cells: [String(i + 1), { v: l, cls: on ? 'hot' : '' }, on ? '← now' : ''] }; }).concat([{ cells: ['', { v: '(method ends)', cls: s.line === -1 ? 'hot' : '' }, s.line === -1 ? '← now' : ''] }]), 'Running code');
    if (s.pending.length) H.table(v, ['Queued SQL'], s.pending.map(function (q) { return { cells: [q] }; }), 'Write-behind queue');
    if (s.sent.length) H.table(v, ['#', 'SQL', 'Sent at'], s.sent.map(function (q, i) { return { cells: [String(i + 1), q.sql, q.at] }; }), 'SQL actually sent to the DB');
  },
  // Diagram: the persistence context (the first-level cache and the write-behind queue) on the left, the DB on the right. An arrow appears only in a step where SQL is actually sent.
  draw: function (P, sim, shown) {
    var last = shown[shown.length - 1], prev = shown[shown.length - 2], s = last ? last.snap : { cache: [], pending: [], sent: [], db: [{ id: 1, name: 'Alice' }] }, before = prev ? prev.snap.sent.length : 0, fresh = s.sent.slice(before);
    P.size(680, 330);
    P.region('pc', 16, 16, 400, 298, 'Persistence context (kept for the transaction here)');
    P.region('db', 470, 16, 194, 298, 'member table in the DB');
    P.text('c1', 28, 58, 'First-level cache: managed entities', { cls: 'mut' });
    if (!s.cache.length) P.box('none', 28, 66, 376, 46, { cls: 'ghost', sub: 'Empty', center: true });
    s.cache.forEach(function (e, i) { var gone = e.st.indexOf('Detached') === 0; P.box('e' + e.id, 28, 66 + i * 52, 376, 46, { cls: gone ? 'ghost' : e.name !== e.snap ? 'hot' : 'good', title: 'Member ' + e.id + (gone ? ' (detached: removed from the context)' : ''), sub: 'Current: ' + e.name + '  ·  Snapshot: ' + e.snap }); });
    P.box('pend', 28, 250, 376, 48, { cls: s.pending.length ? 'wait' : 'ghost', title: 'Write-behind queue', sub: s.pending.length ? 'INSERTs queued, not sent: ' + s.pending.length : 'No queued SQL' });
    s.db.forEach(function (r, i) { P.box('r' + r.id, 482, 52 + i * 40, 170, 32, { cls: r.cls === 'hot' ? 'hot' : 'plain', title: 'id ' + r.id, right: r.name }); });
    if (fresh.length) { var kinds = {}; fresh.forEach(function (q) { var k = q.sql.split(' ')[0].toUpperCase(); kinds[k] = (kinds[k] || 0) + 1; }); P.arrow('sql', 'pc:r', 'db:l', { cls: 'hot', label: Object.keys(kinds).map(function (k) { return k + (kinds[k] > 1 ? ' ×' + kinds[k] : ''); }).join(', ') }); }
    P.text('cnt', 482, 300, 'SQL sent to the DB: ' + s.sent.length, { cls: 'mut' });
    P.note('A yellow entity has a current value that differs from its snapshot, so it becomes an UPDATE target at commit. The arrow in the middle means that SQL was sent to the DB in this step. In a step without an arrow, things happened only in memory.');
  },
  assume: 'This lab assumes that the code runs inside a single persistence context. For the sequence strategy, it simplifies the model to one sequence query per persist call. With the actual default setting (allocationSize 50), ids are fetched in blocks, so far fewer sequence queries are sent. In the "Without @Transactional" example, it assumes that the query method of a Spring Data repository runs in its own transaction and then ends. With the default open-in-view setting of Spring Boot, the entity may remain in the managed state, but there is still no commit, so no UPDATE is sent and the result is the same. All 6 scenarios were run on real Hibernate 7.4.5 with an H2 database, and the number of SQL statements sent, the time at which the write SQL was sent, and the values left in the DB were confirmed to match the screen (for the sequence strategy, they were run with allocationSize set to 1 to match the simplification on the screen).',
});

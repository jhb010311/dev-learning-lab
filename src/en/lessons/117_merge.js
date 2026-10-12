Lab.register({
  id: 'merge', nav: 'Detached entities and merge', cat: 'JPA', mode: 'step',
  title: 'Why were other values erased when I only fixed the name with merge?',
  intro: 'A detached object, which is outside the persistence context, is not applied to the DB even if you change its values. There are two ways to apply it. One is the merge operation, where you pass the whole object to em.merge. The other is dirty checking, where you load the entity again and put in only the values to change.',
  terms: ['Detached entity', 'Merge operation', 'Dirty checking', 'Persistence context', 'The four entity states'],
  controls: [
    { id: 'src', label: 'How the detached object m was obtained', type: 'select', value: 'form', options: [['form', 'new from the values received from the screen (only id and name filled in)'], ['loaded', 'An object loaded in an earlier request (all fields filled in)']] },
    { id: 'how', label: 'How to apply the change after changing the name', type: 'select', value: 'merge', options: [['merge', 'Merge with em.merge(m)'], ['none', 'Do nothing and commit'], ['dirty', 'Load again and move only the name (dirty checking)']] },
    { id: 'after', label: 'If you change city to "Busan" after the merge', type: 'select', value: 'none', options: [['none', 'Do not change it'], ['arg', 'Change it on the object m that you passed to merge'], ['ret', 'Change it on the object r that merge returned']], show: function (c) { return c.how === 'merge'; } },
  ],
  presets: [
    { t: 'Default settings', q: 'What happens to city when you merge, with em.merge(m), an object m that was created with new and has only id and name filled in?', d: 'You merge an object with only the name filled in. city becomes NULL.', v: { src: 'form', how: 'merge', after: 'none' } },
    { t: 'Load again and move only the name', q: 'What if you load the member again with em.find and move only the name, instead of calling em.merge(m)?', d: 'city stays as it is (dirty checking).', v: { src: 'form', how: 'dirty', after: 'none' } },
    { t: 'Do nothing', q: 'What if you do nothing and commit, instead of calling em.merge(m)?', d: 'Changing only the values of a detached object does not apply them.', v: { src: 'form', how: 'none', after: 'none' } },
    { t: 'Merge a loaded object', q: 'What if m is an object loaded in an earlier request, with all fields filled in, and you merge it?', d: 'All fields are filled in, so city is kept.', v: { src: 'loaded', how: 'merge', after: 'none' } },
    { t: 'Fix the passed object after merge', q: 'What if you merge an object loaded in an earlier request and then change city to "Busan" on the object m that you passed to merge?', d: 'The passed object is still detached, so the change is not applied.', v: { src: 'loaded', how: 'merge', after: 'arg' } },
    { t: 'Fix the returned object after merge', q: 'What if you merge an object loaded in an earlier request and then change city to "Busan" on the object r that merge returned?', d: 'The returned object is managed, so the change is applied.', v: { src: 'loaded', how: 'merge', after: 'ret' } },
  ],
  // The lines of code for the settings. k is the kind of work the line does, and pre marks the line before which the code is shown (it is not a step)
  lines: function (c) {
    var L = c.src === 'form' ? [{ k: 'new', code: 'Member m = new Member();  m.setId(1L);' }] : [{ k: 'find1', code: 'Member m = em1.find(Member.class, 1L);' }, { k: 'close1', code: 'em1.close();' }];
    L.push({ k: 'set', code: 'm.setName("Bob");' });
    var first = L.length;
    if (c.how === 'merge') { L.push({ k: 'merge', code: 'Member r = em.merge(m);' }); if (c.after === 'arg') L.push({ k: 'setArg', code: 'm.setCity("Busan");' }); if (c.after === 'ret') L.push({ k: 'setRet', code: 'r.setCity("Busan");' }); L.push({ k: 'contains', code: 'System.out.println(em.contains(m) + ", " + em.contains(r));' }); }
    else if (c.how === 'dirty') L.push({ k: 'find', code: 'Member f = em.find(Member.class, 1L);' }, { k: 'copy', code: 'f.setName(m.getName());' }, { k: 'contains', code: 'System.out.println(em.contains(m) + ", " + em.contains(f));' });
    else L.push({ k: 'contains', code: 'System.out.println(em.contains(m));' });
    L.push({ k: 'commit', code: 'em.getTransaction().commit();' });
    L[first].pre = true;
    return L;
  },
  code: function (c) {
    var head = c.src === 'form' ? '// An object built from the values received from the screen. city was not received\n' : '// An object loaded in an earlier request\nEntityManager em1 = emf.createEntityManager();\n';
    return head + this.lines(c).map(function (l) { return (l.pre ? '\nEntityManager em = emf.createEntityManager();\nem.getTransaction().begin();\n' : '') + l.code.replace(';  ', ';\n'); }).join('\n');
  },
  label: function (c) { return (c.src === 'form' ? 'new from screen values' : 'loaded object') + ' · ' + { merge: 'merge', none: 'do nothing', dirty: 'dirty checking' }[c.how] + (c.how === 'merge' && c.after !== 'none' ? ' · then change city of ' + (c.after === 'arg' ? 'm' : 'r') : ''); },
  columns: ['em.contains(m)', 'Managed object', 'SQL sent in this transaction', 'Value left in the DB (name · city)'],
  simulate: function (c) {
    var L = this.lines(c), ev = [], sum = [], trace = [], PRE = { 'new': 1, find1: 1, close1: 1, set: 1 };
    // m: the detached object. r: the managed entity of this transaction (r returned by merge, or f loaded again). snap: the value the persistence context remembers from when it first read
    var st = { line: -1, m: null, mState: '', r: null, rName: '', snap: null, sent: [], db: { name: 'Alice', city: 'Seoul' }, cm: '?', cr: '?', flow: '', dbCls: '' };
    function push(s, k) { ev.push({ s: s, k: k, snap: JSON.parse(JSON.stringify(st)) }); st.flow = ''; }
    function send(kind, sql) { trace[trace.length - 1][1].push(kind); st.sent.push({ sql: sql, at: PRE[L[st.line].k] ? 'Earlier request' : L[st.line].k === 'commit' ? 'At commit' : L[st.line].code, pre: !!PRE[L[st.line].k] }); st.flow = kind; }
    function show(x) { return x === null ? 'null' : x; }
    L.forEach(function (ln, i) {
      st.line = i; if (ln.k !== 'contains') trace.push([ln.k, []]);
      var m = st.m, r = st.r;
      if (ln.k === 'new') {
        st.m = { name: null, city: null }; st.mState = 'Detached';
        push('new Member() and setId(1L): You created a new object to hold the values received from the screen, and put in 1, the id of the member to fix. name and city are still null. It has the id of a row that already exists in the DB, but the persistence context does not manage it, so it is treated as detached.', '');
      } else if (ln.k === 'find1') {
        send('select', 'select ... from member where id = 1'); st.m = { name: 'Alice', city: 'Seoul' }; st.mState = 'Managed in em1';
        push('em1.find(Member.class, 1L): In an earlier request, member 1 was read with another EntityManager (em1). name is Alice and city is Seoul. At this point it is managed by em1.', '');
      } else if (ln.k === 'close1') {
        st.mState = 'Detached';
        push('em1.close(): Closes em1, and its persistence context ends. m becomes detached. The Java object remains with all of its fields filled in.', '');
      } else if (ln.k === 'set') {
        m.name = 'Bob';
        push('m.setName("Bob"): Changed the name of the detached object. Only the value in memory changes, and no SQL is sent. No persistence context is watching this object.', '');
      } else if (ln.k === 'merge') {
        send('select', 'select ... from member where id = 1'); st.r = { name: st.db.name, city: st.db.city }; st.rName = 'r'; st.snap = { name: st.db.name, city: st.db.city };
        push('First step of em.merge(m): It looks for a managed entity with the id of m (1). The newly opened persistence context has nothing, so it reads the entity from the DB with a SELECT (Alice, Seoul). This is the SELECT that is sent during merge.', '');
        st.r.name = m.name; st.r.city = m.city; st.flow = 'copyAll';
        push('Second step of em.merge(m): It overwrites that managed entity with the values of all the fields of m. name becomes Bob, and city is ' + (m.city === null ? 'overwritten with the null that m had left empty' : 'overwritten with the value "' + m.city + '" that m has (it is the same value, so nothing changes)') + '. merge returns this managed entity as r. The object m that you passed stays detached.', m.city === null ? 'bad' : '');
      } else if (ln.k === 'setArg') {
        m.city = 'Busan';
        push('m.setCity("Busan"): Changed the value of the object m that you passed to merge. m is still detached after merge, so nothing is watching this change. The city of the managed entity r stays as it was.', 'bad');
      } else if (ln.k === 'setRet') {
        r.city = 'Busan';
        push('r.setCity("Busan"): Changed the value of the object r that merge returned. r is managed, so this value is applied at commit as well.', 'good');
      } else if (ln.k === 'find') {
        send('select', 'select ... from member where id = 1'); st.r = { name: st.db.name, city: st.db.city }; st.rName = 'f'; st.snap = { name: st.db.name, city: st.db.city };
        push('em.find(Member.class, 1L): A SELECT reads member 1, and you get the managed object f (Alice, Seoul). It is a different object from m.', '');
      } else if (ln.k === 'copy') {
        r.name = m.name; st.flow = 'copyName';
        push('f.setName(m.getName()): Moves only the name, the value you want to change, to f. You did not touch city, so the city of f stays "Seoul".', 'good');
      } else if (ln.k === 'contains') {
        st.cm = 'false'; st.cr = r ? 'true' : '-';
        push(r ? 'The result of em.contains(m) is false, and the result of em.contains(' + st.rName + ') is true. They are different objects, and what the persistence context manages is ' + st.rName + '.' :'em.contains(m) is false. m is a detached object, and this persistence context has no managed entity at all.', '');
      } else if (ln.k === 'commit') {
        if (r && (r.name !== st.snap.name || r.city !== st.snap.city)) {
          send('update', "update member set city = " + (r.city === null ? 'null' : "'" + r.city + "'") + ", name = '" + r.name + "' where id = 1"); st.db = { name: r.name, city: r.city }; st.dbCls = r.city === null ? 'bad' : 'good';
          push('commit: In the flush just before the commit, the values of the managed entity ' + st.rName + ' are compared with the values first read (Alice, Seoul), and an UPDATE is sent. In row 1 of the DB, name is ' + r.name + ' and city ' + (r.city === null ? 'became NULL. You meant to fix only the name, but city was erased.' : (r.city === 'Seoul' ? 'stayed ' : 'became ') + r.city + '.'), r.city === null ? 'bad' : 'good');
        } else push('commit: This persistence context has no managed entity. There is nothing to compare, so no UPDATE is sent. The name in the DB is still "Alice", and no exception is thrown.', 'bad');
      }
    });
    var cnt = {}, order = [];
    trace.forEach(function (t) { if (PRE[t[0]]) return; t[1].forEach(function (k) { var w = k.toUpperCase(); if (!cnt[w]) { cnt[w] = 0; order.push(w); } cnt[w]++; }); });
    var sqlText = order.length ? order.map(function (w) { return w + ': ' + cnt[w]; }).join(', ') : 'none', dbText = st.db.name + ' · ' + (st.db.city === null ? 'NULL' : st.db.city);
    if (c.how === 'none') sum.push('Committing the transaction after changing the values of a detached object does not apply them. To apply them, pass the object to em.merge, or load the entity again and move the values.');
    if (c.how === 'merge') {
      if (c.src === 'form' && st.db.city === null) sum.push('merge does not pick only the changed fields. It overwrites with all the fields of the object you passed. An object built from just the name received from the screen has a null city, so the city in the DB becomes NULL too. This is how accidents happen where fields that are not on the edit screen get erased.');
      if (c.src === 'loaded' && c.after === 'none') sum.push('An object that was loaded earlier has all its fields filled in, so city remains after merge. However, merge overwrites with all the values that m has, so if someone else changed city after you loaded m, that change goes back to the old value of m.');
      if (c.after === 'arg') sum.push('The object you passed to merge is still detached after merge. em.merge(m) does not make m managed. It returns another object that is managed. You have to do the later work with the returned object.');
      if (c.after === 'ret') sum.push('The object r that merge returned is managed, so if you change its values, they are applied by dirty checking.' + (c.src === 'form' ? ' The city that merge overwrote with null was changed to "Busan" on r afterward, so it was saved as Busan.' : ''));
      sum.push('merge sends one SELECT to get a managed entity. If an entity with the same id is already in the persistence context, it overwrites that entity without a SELECT, and if the id is not in the DB, it confirms with a SELECT that there is none and then sends an INSERT.');
    }
    if (c.how === 'dirty') { sum.push('You put only the values to change into the reloaded managed entity, so the other fields keep the values first read. The SQL sent is the same as with merge: one SELECT and one UPDATE. When you fix only some fields, this approach is safer.'); if (c.src !== 'form') sum.push('Even if you have a loaded object, in a new transaction the basic approach is to load the entity again and move the values onto it.'); }
    return { events: ev, summary: sum, L: L, trace: trace.map(function (t) { return t[0] + ':' + t[1].join(','); }).join(' '), row: [st.cm, st.r ? st.rName + ' (a different object from m)' : 'none', sqlText, dbText] };
  },
  render: function (v, sim, t, H, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : { line: -1, m: null, r: null, sent: [], db: { name: 'Alice', city: 'Seoul' }, cm: '?', cr: '?' };
    H.table(v, ['Line', 'Code', ''], sim.L.map(function (l, i) { var on = i === s.line; return { cells: [String(i + 1), { v: l.code, cls: on ? 'hot' : '' }, on ? '← now' : ''] }; }), 'Running code');
    H.counters(v, [[s.sent.filter(function (q) { return !q.pre; }).length, 'SQL sent in this transaction']]);
    if (s.sent.length) H.table(v, ['#', 'SQL', 'Sent at'], s.sent.map(function (q, i) { return { cells: [String(i + 1), q.sql, q.at] }; }), 'SQL sent to the DB');
  },
  // Diagram: the detached object m on the left, the persistence context of this transaction and its managed entity in the middle, the row of the DB on the right. In a step where a SELECT, a copy of values, or an UPDATE happens, that arrow appears.
  draw: function (P, sim, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : { m: null, mState: '', r: null, rName: '', snap: null, sent: [], db: { name: 'Alice', city: 'Seoul' }, cm: '?', cr: '?', flow: '', dbCls: '' };
    function show(x) { return x === null ? 'null' : x; }
    P.size(680, 310);
    P.region('out', 16, 16, 200, 150, 'Outside the persistence context');
    P.region('pc', 240, 16, 200, 150, 'Persistence context');
    P.region('db', 464, 16, 200, 150, 'member table in the DB');
    P.box('m', 34, 52, 164, 74, s.m ? { cls: s.mState === 'Detached' ? 'hot' : 'good', title: 'm (' + s.mState + ')', sub: ['name: ' + show(s.m.name), 'city: ' + show(s.m.city)] } : { cls: 'ghost', title: 'm', sub: 'None yet' });
    P.box('r', 258, 52, 164, 74, s.r ? { cls: s.r.city === null ? 'bad' : 'good', title: s.rName + ' (managed)', sub: ['name: ' + show(s.r.name), 'city: ' + show(s.r.city)] } : { cls: 'ghost', title: 'Managed entity', sub: 'None' });
    P.box('row', 482, 52, 164, 74, { cls: s.dbCls === 'bad' ? 'bad' : s.dbCls === 'good' ? 'hot' : 'plain', title: 'Row 1', sub: ['name: ' + s.db.name, 'city: ' + (s.db.city === null ? 'NULL' : s.db.city)] });
    if (s.flow === 'select' && s.r) P.arrow('fl', 'row:l', 'r:r', { cls: 'hot', label: 'SELECT' });
    if (s.flow === 'copyAll') P.arrow('fl', 'm:r', 'r:l', { cls: 'hot', label: 'All fields' });
    if (s.flow === 'copyName') P.arrow('fl', 'm:r', 'r:l', { cls: 'hot', label: 'name only' });
    if (s.flow === 'update') P.arrow('fl', 'r:r', 'row:l', { cls: 'hot', label: 'UPDATE' });
    P.box('c1', 16, 186, 320, 36, { cls: s.cm === '?' ? 'ghost' : 'plain', title: 'em.contains(m)', right: s.cm });
    P.box('c2', 344, 186, 320, 36, { cls: s.cr === '?' || s.cr === '-' ? 'ghost' : 'good', title: 'em.contains(' + (s.rName || 'r') + ')', right: s.cr === '-' ? 'Not applicable' : s.cr });
    P.box('c3', 16, 230, 648, 36, { cls: s.dbCls === 'bad' ? 'bad' : s.dbCls === 'good' ? 'good' : 'plain', title: 'Value left in the DB (name · city)', right: s.db.name + ' · ' + (s.db.city === null ? 'NULL' : s.db.city) });
    P.note('Merge overwrites the object in the middle with all the fields of the object on the left, and the dirty checking approach moves only the value to change.');
  },
  assume: 'All 18 combinations were run on real Hibernate 7.4.5 and an H2 database, and the kind of SQL sent on each line, the result of em.contains, whether the object returned by merge is different from the one you passed, and the name and city left in the DB were confirmed to match the screen. The setting "If you change city to Busan after the merge" has meaning only when merge is chosen. The "SQL sent in this transaction" does not include the SELECT that loaded m in the earlier request. The following facts stated in the summaries were also run separately and confirmed: if you merge an object whose id is not in the DB, an INSERT is sent after the SELECT; if you merge a loaded object without changing its values, only the SELECT is sent and there is no UPDATE; if an entity with the same id is already managed, merge does not send a SELECT; even if city in the DB was changed to another value after you loaded the object, merge overwrites it with the old value of m. The id of the member is set directly in the code, and no @Version field is used. With @Version, an attempt to overwrite with an old value can be stopped by an exception. By default, Hibernate puts all the columns in the UPDATE statement for both merge and dirty checking, so the difference between the two ways is not in the shape of the UPDATE statement but in the values it carries. The SQL statements on the screen are shortened to be easy to read. The save method of Spring Data JPA calls merge internally when it decides that the entity is not new (this is based on the official documentation and was not run here).',
});

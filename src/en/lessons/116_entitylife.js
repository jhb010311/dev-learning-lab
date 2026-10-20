Lab.register({
  id: 'entitylife', nav: 'The lifecycle of an entity', cat: 'JPA', mode: 'step',
  title: 'Why is the same setName sometimes not applied to the DB?',
  why: 'With JDBC, after changing an object\'s value you had to write and send an UPDATE statement yourself, and the developer also had to remember what was changed. The JPA persistence context holds the entities that you loaded or persisted and compares them with their original state, and at commit it finds the changed entities and sends UPDATE. So you have to think in terms of states about which objects are managed this way right now.',
  use: 'Update code that loads an entity in a service method, only changes a value with a setter, and does not call a save method works because of this management. On the other hand, a change made after the transaction ends, or a change to an object created with new from request values, is not applied, so you write updates so that they load the entity in a service method with a transaction and change it there.',
  intro: 'An entity object is in one of four states: new, managed, detached, or removed (Hibernate calls the new state transient). JPA watches the changes of values and applies them to the DB only when the object is in the managed state. Member in this lab is an entity class made for this example.',
  terms: ['The four entity states', 'Detached entity', 'Persistence context', 'Dirty checking', 'Transactional write-behind and flush'],
  controls: [
    { id: 'st', label: 'Path the entity takes', type: 'select', value: 'detach', options: [['new', 'Only new (state: new)'], ['persist', 'new, then em.persist (state: managed)'], ['find', 'Load with em.find (state: managed)'], ['detach', 'Load, then em.detach (state: detached)'], ['clear', 'Load, then em.clear (state: detached)'], ['close', 'Load, commit, then em.close (state: detached)'], ['remove', 'Load, then em.remove (state: removed)']] },
    { id: 'when', label: 'When the name is changed', type: 'select', value: 'after', options: [['after', 'After the state changes'], ['before', 'Just before the state changes']], show: function (c) { return ['persist', 'detach', 'clear', 'close'].indexOf(c.st) >= 0; }, hint: 'Choose whether to change the name before or after the line that changes the state (persist, detach, clear, commit and close).' },
  ],
  presets: [
    { t: 'Default settings', q: 'What is left in the DB if you detach a loaded entity with em.detach and then change its name?', d: 'You change the name of a detached object. It is not applied, and there is no error.', v: { st: 'detach', when: 'after' } },
    { t: 'Changing it while managed', q: 'What if you only load the entity with em.find, without em.detach, and change the name while it is managed?', d: 'Even if you only change the name of a loaded object, an UPDATE is sent at commit.', v: { st: 'find', when: 'after' } },
    { t: 'em.clear after the change', q: 'What if you load the entity, call em.clear, and change the name just before the state changes?', d: 'You changed it while the object was managed, yet the change is lost. This is because it had not been sent to the DB yet.', v: { st: 'clear', when: 'before' } },
    { t: 'Forgetting persist after new', q: 'What if you change the name of an entity that you created with new but did not pass to em.persist?', d: 'No SQL is sent at all.', v: { st: 'new', when: 'after' } },
    { t: 'Changing it after persist', q: 'What if you change the name of an entity after new and em.persist?', d: 'An UPDATE is sent once more after the INSERT.', v: { st: 'persist', when: 'after' } },
    { t: 'Changing it after closing em', q: 'What if you load the entity, commit, close it with em.close, and then change the name?', d: 'This is a common mistake: modifying an entity outside the transaction.', v: { st: 'close', when: 'after' } },
    { t: 'Changing it after remove', q: 'What if you load the entity, call em.remove, and then change the name?', d: 'Only a DELETE is sent, and it is sent at commit.', v: { st: 'remove', when: 'after' } },
  ],
  // The lines of code for the settings. k is the kind of work the line does, and simulate runs the lines one at a time in this order
  lines: function (c) {
    var nw = c.st === 'new' || c.st === 'persist', before = c.when === 'before' && ['persist', 'detach', 'clear', 'close'].indexOf(c.st) >= 0;
    var mk = nw ? { k: 'new', code: 'Member m = new Member(2L, "Carol");' } : { k: 'find', code: 'Member m = em.find(Member.class, 1L);' };
    var set = { k: 'set', code: 'm.setName("' + (nw ? 'Diana' : 'Bob') + '");' }, con = { k: 'contains', code: 'System.out.println(em.contains(m));' }, commit = { k: 'commit', code: 'em.getTransaction().commit();' };
    if (c.st === 'new' || c.st === 'find') return [mk, set, con, commit];
    if (c.st === 'close') { var cl = { k: 'close', code: 'em.close();' }, cx = { k: 'contains', code: '// calling em.contains(m) here throws IllegalStateException' }; return before ? [mk, set, commit, cl, cx] : [mk, commit, cl, set, cx]; }
    var mid = { k: c.st, code: { persist: 'em.persist(m);', detach: 'em.detach(m);', clear: 'em.clear();', remove: 'em.remove(m);' }[c.st] };
    return before ? [mk, set, mid, con, commit] : [mk, mid, set, con, commit];
  },
  code: function (c) {
    return '// Only the lines inside a method are shown (class and method declarations, the code that creates emf, the example Member entity, and imports omitted)\nEntityManager em = emf.createEntityManager();\nem.getTransaction().begin();\n\n' + this.lines(c).map(function (l) { return l.code; }).join('\n');
  },
  label: function (c) { return { new: 'new only', persist: 'persist', find: 'find', detach: 'detach', clear: 'clear', close: 'close after commit', remove: 'remove' }[c.st] + (['persist', 'detach', 'clear', 'close'].indexOf(c.st) >= 0 ? ' · name changed ' + (c.when === 'before' ? 'just before' : 'after') : ''); },
  columns: ['em.contains(m)', 'SQL sent to the DB', 'When the write SQL was sent', 'Value left in the DB'],
  stateName: { none: 'None yet', 'new': 'New', managed: 'Managed', detached: 'Detached', removed: 'Removed' },
  simulate: function (c) {
    var L = this.lines(c), ev = [], sum = [], trace = [];
    // o: the Java object m. snap: the value the persistence context remembers (the value when it was first read or persisted). ins: whether there is an INSERT that has not been sent yet. open: whether em is open
    var st = { line: -1, o: null, snap: null, ins: false, open: true, sent: [], db: [{ id: 1, name: 'Alice' }], contains: '?', moved: '', flow: '' };
    function push(s, k) { ev.push({ s: s, k: k, snap: JSON.parse(JSON.stringify(st)) }); st.moved = ''; st.flow = ''; }
    function send(kind, sql) { trace[trace.length - 1][1].push(kind); st.sent.push({ sql: sql, at: L[st.line].k === 'commit' ? 'At commit' : L[st.line].code }); st.flow = st.flow ? st.flow + ', ' + kind.toUpperCase() : kind.toUpperCase(); }
    var lost = false;   // whether a value changed while managed was lost because the object was detached before it reached the DB
    L.forEach(function (ln, i) {
      st.line = i; trace.push([ln.k, []]);
      var o = st.o;
      if (ln.k === 'new') {
        st.o = { id: 2, name: 'Carol', state: 'new' };
        push('new Member(2L, "Carol"): This only created a Java object. Neither the persistence context nor the DB knows this object. This state is called new.', '');
      } else if (ln.k === 'find') {
        send('select', 'select ... from member where id = 1'); st.o = { id: 1, name: 'Alice', state: 'managed' }; st.snap = 'Alice'; st.moved = 'find';
        push('em.find(Member.class, 1L): A SELECT reads member 1 and keeps it in the persistence context. From now on, m is in the managed state. The persistence context remembers the value it first read (Alice) and watches m for changes.', '');
      } else if (ln.k === 'persist') {
        o.state = 'managed'; st.snap = o.name; st.ins = true; st.moved = 'persist';
        push('em.persist(m): hands m over to the persistence context. It changed from new to managed. No SQL is sent on this line, and the INSERT is postponed until commit.' + (o.name === 'Diana' ? ' The value to save is the name "Diana" that was already set.' : ''), '');
      } else if (ln.k === 'set') {
        var nm = o.id === 2 ? 'Diana' : 'Bob'; o.name = nm;
        if (o.state === 'new') push('m.setName("' + nm + '"): Changed the name of a new object. Only the value in memory changes. Nobody is watching this object, so it has nothing to do with SQL.', '');
        else if (o.state === 'managed') push('m.setName("' + nm + '"): Changed the name of a managed object. No SQL is sent on this line. The value that the persistence context remembers (' + st.snap + ') and the current value are now different.', '');
        else if (o.state === 'removed') push('m.setName("' + nm + '"): Changed the name of a removed object. The Java object is still in memory, so the value changes. But the entity is going to be deleted, so it is not a target of an UPDATE.', '');
        else push('m.setName("' + nm + '"): Changed the name of a detached object. The value of the Java object changes, but the persistence context no longer watches this object. No error occurs either.', 'bad');
      } else if (ln.k === 'detach' || ln.k === 'clear') {
        lost = o.name !== st.snap; o.state = 'detached'; st.snap = null; st.moved = 'detach';
        push((ln.k === 'detach' ? 'em.detach(m): Takes m out of the persistence context.' : 'em.clear(): Empties the whole persistence context. All the entities that the persistence context was managing become detached.') + ' m changed from managed to detached. No SQL is sent.' + (lost ? ' The name changed earlier had not been sent to the DB yet. The persistence context that would compare it with the remembered value let go of m, so nothing is left to send this change to the DB.' : ''), lost ? 'bad' : '');
      } else if (ln.k === 'remove') {
        o.state = 'removed'; st.moved = 'remove';
        push('em.remove(m): Marks m as an entity to delete. It changed from managed to removed. The DELETE is not sent on this line and is postponed until commit.', '');
      } else if (ln.k === 'close') {
        st.open = false; o.state = 'detached'; st.snap = null; st.moved = 'detach';
        push('em.close(): Closes the EntityManager, and the persistence context ends. m, which the persistence context was managing, becomes detached. The Java object remains in memory.', '');
      } else if (ln.k === 'contains') {
        if (!st.open) { st.contains = 'Exception (em closed)'; push('If you call em.contains(m): em is already closed, so an IllegalStateException is thrown. You cannot ask a closed em what it manages.', ''); }
        else {
          st.contains = String(o.state === 'managed');
          push('em.contains(m) is ' + st.contains + '. ' + { 'new': 'This is because m is a new object that has never been handed over to the persistence context.', managed: 'It means that the persistence context is managing m.', detached: 'It means that the persistence context no longer manages m.', removed: 'em.contains does not count an entity marked for deletion as managed. Still, the persistence context remembers this entity until the commit, so that it can send the DELETE then.' }[o.state], o.state === 'managed' ? 'good' : '');
        }
      } else if (ln.k === 'commit') {
        if (o.state === 'managed' && st.ins) {
          send('insert', "insert into member (name, id) values ('" + st.snap + "', 2)"); st.db.push({ id: 2, name: o.name, cls: 'hot' }); st.ins = false;
          if (o.name !== st.snap) { send('update', "update member set name = '" + o.name + "' where id = 2"); st.snap = o.name; push('commit: A flush happens just before the commit. The postponed INSERT is sent with the value from the time of persist (Carol), and after that the changed name is sent once more as an UPDATE. SQL was sent twice.', 'good'); }
          else push('commit: A flush happens just before the commit and sends the postponed INSERT. The name was already "' + o.name + '" at the time of persist, so one INSERT is enough.', 'good');
        } else if (o.state === 'managed' && o.name !== st.snap) {
          send('update', "update member set name = '" + o.name + "' where id = 1"); st.db[0].name = o.name; st.db[0].cls = 'hot'; st.snap = o.name;
          push('commit: A flush happens just before the commit. JPA compares the current value of the managed m with the remembered value, finds what changed, and builds and sends the UPDATE (dirty checking).', 'good');
        } else if (o.state === 'removed') {
          send('delete', 'delete from member where id = 1'); st.db[0].cls = 'gone';
          push('commit: A flush happens just before the commit and sends the postponed DELETE. Row 1 was deleted. The name changed in the removed state is not applied anywhere.', '');
        } else if (o.state === 'managed') push('commit: A flush happens just before the commit, but the value of m is the same as the remembered value, so there is no SQL to send.', '');
        else if (o.state === 'new') push('commit: The persistence context has no managed entity at all. There is no SQL to send. Member 2 was not created in the DB.', 'bad');
        else push('commit: A flush happens just before the commit, but m is not managed, so it is not compared. No UPDATE is sent, and the name in the DB is still "Alice".', 'bad');
      }
    });
    var cnt = {}, order = [], wr = [];
    trace.forEach(function (t) { t[1].forEach(function (k) { var w = k.toUpperCase(); if (!cnt[w]) { cnt[w] = 0; order.push(w); } cnt[w]++; if (k !== 'select') wr.push(t[0]); }); });
    var sqlText = order.length ? order.map(function (w) { return w + ': ' + cnt[w]; }).join(', ') : 'none';
    var whenText = !wr.length ? 'Not sent' : wr.every(function (k) { return k === 'commit'; }) ? 'At commit' : 'Right on that line';
    var left = st.db.filter(function (r) { return r.cls !== 'gone'; }), dbText = left.length ? left.map(function (r) { return 'id ' + r.id + ' (' + r.name + ')'; }).join(', ') : 'no rows';
    var o = st.o, changed = o.id === 1 ? left.length && left[0].name === 'Bob' : left.length === 2;
    if (c.st === 'new') sum.push('An object created with new has nothing to do with JPA until you pass it to em.persist. No matter how often you change its values or commit the transaction, no SQL is sent. When something is not saved, first check whether you called persist (or save, if you use Spring Data JPA).');
    if (c.st === 'persist') sum.push(cnt.UPDATE ? 'If you change the value after persist, dirty checking kicks in, and one more UPDATE is sent after the INSERT. The result is correct, but it costs one more SQL statement. If you persist after filling in all the values, one INSERT is enough.' : 'You persisted after filling in all the values, so one INSERT was enough. If you change the value after persist, one more UPDATE is sent.', 'The INSERT was not sent on the line that called persist because the id was set directly in the code. With the IDENTITY strategy, where the DB decides the id, the INSERT is sent right on the persist line (see the "Persistence context" lab).');
    if (c.st === 'find') sum.push('In the managed state, you only need to change the value. At commit, the persistence context compares it with the remembered value and builds the UPDATE for you. Compare it with the other states, and you will see that this happens only in the managed state.');
    if ((c.st === 'detach' || c.st === 'clear') && !lost) sum.push('A detached object is like an ordinary Java object. If you change its values, no exception is thrown, and the change is not applied to the DB. If you load the same id again with em.find after detaching, the SELECT is sent again and you get a new object that is different from m.', c.st === 'clear' ? 'em.clear() makes all the entities that the persistence context was managing detached at once. em.detach(m) detaches only m.' : 'To apply the changes of a detached object to the DB, you have to copy its values into a managed object with merge. Merge is covered in the next lab.');
    if ((c.st === 'detach' || c.st === 'clear') && lost) sum.push('Even a value changed while the object was managed disappears if you detach the object before the value is sent to the DB (flush).', 'If you call em.flush() before detaching, the UPDATE is sent at that time, so the change is applied. When you call em.clear() to free memory while processing a lot of data, put em.flush() before it.');
    if (c.st === 'close' && !changed) sum.push('An entity after the transaction has ended and em is closed is detached. This is the case when the controller modifies an entity returned by a service method after the transaction has ended (when OSIV is turned off). The value changes, but it is not applied to the DB, and no exception is thrown.');
    if (c.st === 'close' && changed) sum.push('A commit causes a flush just before it. So a value changed before the commit is sent as an UPDATE, and then em is closed. Compare this with detach or clear, where the same "change just before" makes the value disappear. Those detach the object without a flush.');
    if (c.st === 'remove') sum.push('em.remove does not send a DELETE on that line. It only marks the entity as "to be deleted". The DELETE is sent at commit. Even if you change a value in the removed state, no UPDATE is sent.', 'Even after the row in the DB is deleted, the Java object m stays in memory, and you can read its values. If you call em.persist(m) again before the commit, the deletion is canceled and the object returns to the managed state.');
    return { events: ev, summary: sum, L: L, trace: trace.map(function (t) { return t[0] + ':' + t[1].join(','); }).join(' '), row: [st.contains, sqlText, whenText, dbText] };
  },
  render: function (v, sim, t, H, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : { line: -1, o: null, snap: null, sent: [], db: [{ id: 1, name: 'Alice' }], contains: '?' }, SN = this.stateName;
    H.table(v, ['Line', 'Code', ''], sim.L.map(function (l, i) { var on = i === s.line; return { cells: [String(i + 1), { v: l.code, cls: on ? 'hot' : '' }, on ? '← now' : ''] }; }), 'Running code');
    if (s.o) H.table(v, ['Object', 'Current value', 'Value remembered by the persistence context', 'State'], [{ cells: ['m (member ' + s.o.id + ')', { v: s.o.name, cls: s.snap !== null && s.o.name !== s.snap ? 'hot' : '' }, s.snap === null || s.o.state !== 'managed' ? '(not watched)' : s.snap, { v: SN[s.o.state], cls: s.o.state === 'managed' ? 'good' : s.o.state === 'new' ? '' : 'bad' }] }], 'Java object m');
    if (s.sent.length) H.table(v, ['#', 'SQL', 'Sent at'], s.sent.map(function (q, i) { return { cells: [String(i + 1), q.sql, q.at] }; }), 'SQL sent to the DB');  },
  // Diagram: the four states are boxes, and the state where the object m is now is shown in bold. In a step that changes the state, that arrow is highlighted, and in a step where SQL is sent, the arrow to the DB is highlighted.
  draw: function (P, sim, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : { o: null, sent: [], db: [{ id: 1, name: 'Alice' }], contains: '?', moved: '', flow: '' };
    var cur = s.o ? s.o.state : 'none', who = s.o ? 'm: id ' + s.o.id + ' ' + s.o.name : '';
    function box(id, x, y, w, state, title, idle, cls) { P.box(id, x, y, w, 56, cur === state ? { cls: cls + ' now', title: title, sub: who } : { cls: 'ghost', title: title, sub: idle }); }
    P.size(680, 330);
    P.region('pc', 198, 16, 220, 112, 'Persistence context');
    P.region('db', 536, 16, 128, 240, 'member table');
    box('sNew', 16, 52, 138, 'new', 'New', 'Only created', 'wait');
    box('sMan', 210, 52, 196, 'managed', 'Managed', 'Watched by JPA', 'good');
    box('sDet', 16, 200, 176, 'detached', 'Detached', 'Taken out of em', 'hot');
    box('sRem', 210, 200, 196, 'removed', 'Removed', 'Marked for deletion', 'bad');
    P.arrow('aPersist', 'sNew:r', 'sMan:l', { cls: s.moved === 'persist' ? 'hot' : 'mut', label: 'persist' });
    P.arrow('aDetach', 'sMan:b:0.2', 'sDet:t:0.8', { cls: s.moved === 'detach' ? 'hot' : 'mut', label: 'detach · clear · close' });
    P.arrow('aRemove', 'sMan:b:0.7', 'sRem:t:0.7', { cls: s.moved === 'remove' ? 'hot' : 'mut', label: 'remove' });
    s.db.forEach(function (r, i) { P.box('r' + r.id, 546, 52 + i * 44, 108, 34, { cls: r.cls === 'gone' ? 'ghost' : r.cls === 'hot' ? 'hot' : 'plain', title: 'id ' + r.id, right: r.cls === 'gone' ? 'deleted' : r.name }); });
    if (s.moved === 'find') P.arrow('sql', 'db:l', 'sMan:r', { cls: 'hot', label: 'SELECT (find)' });
    else if (s.flow) P.arrow('sql', cur === 'removed' ? 'sRem:r' : 'sMan:r', 'db:l', { cls: 'hot', label: s.flow });
    P.box('c1', 16, 278, 300, 36, { cls: s.contains === '?' ? 'ghost' : s.contains === 'true' ? 'good' : 'plain', title: 'em.contains(m)', right: s.contains });
    P.box('c2', 324, 278, 340, 36, { cls: s.sent.length ? 'plain' : 'ghost', title: 'SQL sent to the DB', right: String(s.sent.length) });
    P.note('The bold border is the current state of the object m. Only the managed state, for which em.contains is true, is inside the "persistence context" border. For a removed entity em.contains is false, but the persistence context remembers it until the commit, so that it can send the DELETE then. In a step without an arrow to the DB, no SQL was sent.');
  },
  assume: 'All 14 combinations (7 paths, each with two choices for when the name is changed) were run on real Hibernate 7.4.5 and an H2 database, and the kind of SQL sent on each line, the result of em.contains, and the rows left in the DB were confirmed to match the screen. The setting "When the name is changed" is hidden for the paths where it does not affect the result: only new, load only, and remove. The following facts stated in the summaries were also run separately and confirmed: if you call em.flush() after changing a value and then detach, the change is applied; if you load the same id again after detaching, the SELECT is sent again and a different object comes back; if you call persist again on a removed object before the commit, no DELETE is sent; the values of the Java object can still be read after it was deleted; if you change a value after persist, the INSERT contains the value from the time of persist. The id of the member is set directly in the code. With the IDENTITY strategy, where the DB decides the id, the INSERT is sent right on the persist line. The SQL statements on the screen are shortened to be easy to read. In Spring, the begin, commit, and close here happen on your behalf when a @Transactional method starts and ends (in a web request with Open Session in View (OSIV) turned on, em is closed when the request ends).',
});

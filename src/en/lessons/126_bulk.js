Lab.register({
  id: 'bulk', nav: 'Bulk update and delete operations', cat: 'JPA', mode: 'step',
  title: 'After one UPDATE changes many rows, why does the entity still have the old value?',
  intro: 'An UPDATE or DELETE run with executeUpdate (a bulk update or delete operation) changes many rows with one SQL statement. But this SQL runs directly on the database without going through the persistence context. So an entity that you already loaded does not know that the database has changed. See what you get depending on how you read the value after the bulk operation.',
  terms: ['Bulk update and delete operations', 'em.clear and em.refresh', 'Persistence context', 'First-level cache', 'Transactional write-behind and flush'],
  controls: [
    { id: 'op', label: 'How to change the price', type: 'select', value: 'update', options: [['update', 'Bulk UPDATE (price + 500 for all items)'], ['delete', 'Bulk DELETE (delete all items)'], ['each', 'Change the entities one by one with setPrice (dirty checking)']] },
    { id: 'after', label: 'How to read item 1 after the bulk operation', type: 'select', value: 'none', options: [['none', 'Read the entity you already hold as it is'], ['find', 'Load it again with em.find'], ['jpql', 'Query the list again with JPQL'], ['clear', 'em.find after em.clear()'], ['refresh', 'em.refresh(first)']], show: function (c) { return c.op !== 'each'; } },
    { id: 'dirty', label: 'Before that, the price of item 1 was changed to 5000', type: 'check', value: false, hint: 'Only setPrice has been called. It is a change that has not been sent to the database yet.' },
    { id: 'n', label: 'Number of items', type: 'range', min: 2, max: 8, value: 3, step: 1, fmt: function (v) { return v + ' items'; } },
  ],
  presets: [
    { t: 'Default settings', d: 'After a bulk UPDATE, reading the entity gives the old value, 1000.', v: { op: 'update', after: 'none', dirty: false, n: 3 } },
    { t: 'Old value even after querying again', d: 'Even if you read it again with JPQL, the entity you already hold is returned as it is.', v: { op: 'update', after: 'jpql', dirty: false, n: 3 } },
    { t: 'Query after em.clear()', d: 'If you empty the persistence context, you read the new value from the database.', v: { op: 'update', after: 'clear', dirty: false, n: 3 } },
    { t: 'em.refresh', d: 'It overwrites only that one entity with the value in the database.', v: { op: 'update', after: 'refresh', dirty: false, n: 3 } },
    { t: 'With an unflushed change', d: 'The change is sent to the database first, just before the bulk operation.', v: { op: 'update', after: 'none', dirty: true, n: 3 } },
    { t: 'Changing them one by one', d: 'With 8 items, 8 UPDATEs are sent. A bulk operation sends 1.', v: { op: 'each', after: 'none', dirty: false, n: 8 } },
    { t: 'em.find after a bulk DELETE', d: 'An item that was deleted from the database still comes back from em.find.', v: { op: 'delete', after: 'find', dirty: false, n: 3 } },
  ],
  code: function (c) {
    var sel = 'em.createQuery("select i from Item i order by i.id", Item.class).getResultList()';
    var s = '@Entity\nclass Item {\n    @Id Long id;\n    String name;\n    int price;\n    int getPrice() { return price; }\n    void setPrice(int price) { this.price = price; }\n}\n\n// Inside a transaction. The DB has ' + c.n + ' items (item 1 costs 1000, item 2 costs 2000, ...)\nList<Item> items = ' + sel + ';\nItem first = items.get(0);                 // item 1\n';
    if (c.dirty) s += 'first.setPrice(5000);                      // no SQL is sent yet\n';
    s += '\n';
    if (c.op === 'update') s += 'int count = em.createQuery("update Item i set i.price = i.price + 500")\n        .executeUpdate();                  // bulk UPDATE\n';
    if (c.op === 'delete') s += 'int count = em.createQuery("delete from Item i")\n        .executeUpdate();                  // bulk DELETE\n';
    if (c.op === 'each') s += 'for (Item i : items) {\n    i.setPrice(i.getPrice() + 500);        // change the entities one by one\n}\n\nSystem.out.println(first.getPrice());\n';
    else {
      var nul = c.op === 'delete';
      s += '\n' + { none: 'System.out.println(first.getPrice());', find: 'Item again = em.find(Item.class, 1L);\nSystem.out.println(again.getPrice());', jpql: 'List<Item> again = ' + sel + ';\nSystem.out.println(' + (nul ? 'again.size()' : 'again.get(0).getPrice()') + ');', clear: 'em.clear();                                // empty the persistence context\nItem again = em.find(Item.class, 1L);\nSystem.out.println(' + (nul ? 'again' : 'again.getPrice()') + ');', refresh: nul ? 'try {\n    em.refresh(first);                     // read it again from the DB and overwrite\n    System.out.println(first.getPrice());\n} catch (RuntimeException e) {\n    System.out.println(e.getClass().getSimpleName());\n}' : 'em.refresh(first);                         // read it again from the DB and overwrite\nSystem.out.println(first.getPrice());' }[c.after] + '\n';
    }
    return s + '// commit when the method ends';
  },
  label: function (c) { return { update: 'Bulk UPDATE', delete: 'Bulk DELETE', each: 'Changed one by one' }[c.op] + (c.op === 'each' ? '' : ' · ' + { none: 'read as it is', find: 'em.find', jpql: 'JPQL query again', clear: 'find after clear', refresh: 'refresh' }[c.after]) + (c.dirty ? ' · unflushed change' : '') + ' · ' + c.n + ' items'; },
  columns: ['Read SQL', 'Write SQL', 'Price of item 1 that was read', 'Item 1 in the DB'],
  simulate: function (c) {
    var op = c.op, after = op === 'each' ? 'none' : c.after, dirty = !!c.dirty, n = +c.n, ev = [], sum = [];
    var seq = { op: [], read: [], commit: [] }, phase = 'load';
    // items: mem = the price of the entity in the persistence context (null if it is not managed), db = the price in the DB (null if there is no row), pend = there is a change that has not been sent to the DB yet
    var st = { items: [], sent: [], fresh: [], hot: {}, read: '', err: '', cleared: false };
    for (var i = 1; i <= n; i++) st.items.push({ id: i, mem: null, db: 1000 * i });
    function push(s, k) { ev.push({ s: s, k: k, snap: JSON.parse(JSON.stringify(st)) }); st.fresh = []; st.hot = {}; }
    function send(tok, sql, at) { st.sent.push({ sql: sql, at: at }); st.fresh.push(sql.split(' ')[0].toUpperCase()); if (phase !== 'load') seq[phase].push(tok); }
    var first = st.items[0], selAll = 'select * from item order by id', sel1 = 'select * from item where id = 1';
    send('S', selAll, 'Initial query');
    st.items.forEach(function (it) { it.mem = it.db; });
    push('getResultList(): One SELECT reads ' + n + ' items and keeps them in the persistence context. The price of item 1 is 1000.', '');
    if (dirty) { first.mem = 5000; first.pend = true; push('first.setPrice(5000): Only the price of item 1 in memory changes to 5000. No SQL has been sent yet. This is an "unflushed change" that will be sent as an UPDATE at commit.', ''); }
    phase = 'op';
    if (op === 'each') {
      st.items.forEach(function (it) { it.mem += 500; it.pend = true; });
      push('Loop: The price of each of the ' + n + ' entities is raised by 500, one by one. Only the values in memory changed, and no SQL was sent.', '');
      st.read = first.mem + '';
      push('first.getPrice(): Reads the value ' + first.mem + ' from the entity in memory. You changed the entity directly, so the value in memory is the latest value.', 'good');
      phase = 'commit';
      st.items.forEach(function (it) { send('U1', "update item set name = 'Item" + it.id + "', price = " + it.mem + ' where id = ' + it.id, 'At commit'); it.db = it.mem; it.pend = false; }); st.hot.db = 1;
      push('The method ends and commits: A flush happens, and dirty checking finds the ' + n + ' entities whose values changed. One UPDATE is sent for each entity, ' + n + ' in all.', 'bad');
    } else {
      if (dirty) {
        send('U1', "update item set name = 'Item1', price = 5000 where id = 1", 'Just before executeUpdate (flush)'); first.db = 5000; first.pend = false; st.hot.d1 = 1;
        push('Just before executeUpdate(): A bulk operation runs directly on the database, so Hibernate first sends the unflushed change to the database (flush). The UPDATE that changes item 1 to 5000 goes first. This is not the commit.', '');
      }
      if (op === 'update') {
        send('UB', 'update item set price = price + 500', 'executeUpdate'); st.items.forEach(function (it) { it.db += 500; }); st.hot.db = 1;
        push('executeUpdate(): One UPDATE statement raises the price of ' + n + ' rows in the database by 500 at once. The return value is the number of rows changed, ' + n + '. This SQL does not go through the persistence context, so the entities it holds stay as they are. Item 1 is ' + first.db + ' in the database and ' + first.mem + ' in memory.', 'bad');
      } else {
        send('DB', 'delete from item', 'executeUpdate'); st.items.forEach(function (it) { it.db = null; }); st.hot.db = 1;
        push('executeUpdate(): One DELETE statement deletes ' + n + ' rows from the database at once. The return value is the number of rows deleted, ' + n + '. This SQL does not go through the persistence context, so the ' + n + ' entities it holds remain, not knowing that the rows were deleted.', 'bad');
      }
      phase = 'read';
      var gone = op === 'delete';
      if (after === 'none') {
        st.read = first.mem + '';
        push('first.getPrice(): Reads ' + first.mem + ' from the entity you already hold. ' + (gone ? 'It is an item that no longer exists in the database.' : 'It differs from the value in the database, ' + first.db + '.'), 'bad');
      }
      if (after === 'find') {
        st.read = first.mem + '';
        push('em.find(Item.class, 1L): The persistence context (first-level cache) has item 1, so it returns that object without going to the database. No SQL was sent, and the value is still ' + first.mem + '.' + (gone ? ' Even though the item was deleted from the database, an object comes back, not null.' : ''), 'bad');
      }
      if (after === 'jpql') {
        send('S', selAll, 'Queried again');
        if (gone) { st.read = 'Query returned 0 rows'; push('Querying again with JPQL: A SELECT is sent to the database. All the rows were deleted, so the result is 0 rows. But the entity that the variable first refers to is still in the persistence context.', ''); }
        else { st.read = first.mem + ''; push('Querying again with JPQL: A SELECT is sent to the database, and the database returns the new value (' + first.db + '). But if the persistence context already has an entity with the same identifier, Hibernate throws away the value it just read and returns the entity it holds. The value read is still ' + first.mem + '.', 'bad'); }
      }
      if (after === 'clear') {
        st.items.forEach(function (it) { it.mem = null; }); st.cleared = true;
        push('em.clear(): Empties the persistence context. All the entities it held become detached. The objects with old values are gone from the first-level cache.', '');
        send('S', sel1, 'em.find');
        if (gone) { st.read = 'null'; push('em.find(Item.class, 1L): The first-level cache is empty, so a SELECT is sent to the database. There is no row, so null is returned. You can now see the actual state of the database.', 'good'); }
        else { first.mem = first.db; st.read = first.mem + ''; push('em.find(Item.class, 1L): The first-level cache is empty, so a SELECT is sent to the database. A new entity is created, and you see the new value in the database, ' + first.mem + '.', 'good'); }
      }
      if (after === 'refresh') {
        send('S', sel1, 'em.refresh');
        if (gone) { st.err = 'UnresolvableObjectException'; st.read = st.err; first.mem = null; push('em.refresh(first): A SELECT is sent to read this entity again from the database. But the row was deleted and is gone. It cannot be read again, so an UnresolvableObjectException is thrown.', 'bad'); }
        else { first.mem = first.db; st.read = first.mem + ''; push('em.refresh(first): Reads this one entity again from the database and overwrites it. One SELECT is sent, and item 1 becomes ' + first.mem + '.' + (n > 1 ? ' The other ' + (n - 1) + (n === 2 ? ' item still has its old value.' : ' items still have their old values.') : ''), 'good'); }
      }
      phase = 'commit';
      push('The method ends and commits: ' + (st.err ? 'The exception was caught and handled, so the transaction continues. ' : '') + 'There is no more SQL to send.' + (dirty ? ' The unflushed change was already sent just before the bulk operation.' : '') + ' It commits as it is.', '');
    }
    var sels = st.sent.filter(function (x) { return x.sql.indexOf('select') === 0; }).length;
    var write = op === 'each' ? 'UPDATE: ' + n + ' (one per item)' : op === 'update' ? (dirty ? 'UPDATE: 2 (1 unflushed change + 1 bulk)' : 'UPDATE: 1 (bulk)') : (dirty ? 'UPDATE: 1 (unflushed change), DELETE: 1 (bulk)' : 'DELETE: 1 (bulk)');
    var dbText = first.db === null ? 'no row' : first.db + '';
    var readText = st.read;
    if (/^\d+$/.test(st.read)) readText += first.db === null ? ' (no such row in the DB)' : st.read === dbText ? ' (same as the DB)' : ' (the DB has ' + dbText + ')';
    sum.push('Write SQL sent: ' + write + '. ' + (st.err ? 'The moment it tried to read item 1, ' + st.err + ' was thrown.' : st.read === 'Query returned 0 rows' ? 'Querying again returned 0 rows.' : 'The value read is ' + readText + '.') + ' After it ended, ' + (first.db === null ? 'the DB has no row for item 1.' : 'item 1 is ' + dbText + ' in the DB.'));
    if (op === 'each') sum.push('When you change the entities one by one, memory and the database never disagree, but as many UPDATEs are sent as there are items. With ' + n + ' items, ' + n + ' UPDATEs are sent, and with 10000 items, 10000 are sent. A bulk UPDATE does the same job with 1 SQL statement.' + (dirty ? ' Item 1, which was first changed to 5000, gets 500 added to become 5500, and only one UPDATE is sent for it.' : ''));
    if (op !== 'each' && dirty) sum.push('The unflushed change was flushed before the bulk operation ran. So in the database, item 1 was changed to 5000 first, and then ' + (op === 'update' ? '500 was added to make 5500. If the order had been reversed, 5000 would have remained.' : 'the row was deleted.'));
    if (op === 'update' && (after === 'none' || after === 'find' || after === 'jpql')) sum.push('A bulk operation does not go through the persistence context, so an entity you already loaded keeps its old value. ' + (after === 'find' ? 'em.find looks in the first-level cache first, so calling it again does not help.' : after === 'jpql' ? 'Even if you query again with JPQL and read the new value from the database, an entity with the same identifier that already exists takes priority.' : 'If you keep calculating with this value, the result will be wrong.'), 'After a bulk operation, empty the persistence context with em.clear(), or run the bulk operation before you load the entities. In Spring Data JPA, @Modifying(clearAutomatically = true) does this for you.');
    if (op === 'update' && after === 'clear') sum.push('If you empty the persistence context with em.clear(), later queries read fresh values from the database. This is the method used most often after a bulk operation. But the object you held before emptying (first) is no longer managed, so do not use it any more.');
    if (op === 'update' && after === 'refresh') sum.push('em.refresh overwrites only the one entity you specify with the value in the database. If the bulk operation changed several entities, em.clear() is simpler than refreshing them one by one.');
    if (op === 'delete') sum.push(after === 'clear' ? 'Only after you empty the persistence context can you see the real state of the database: "there are no items".' : after === 'refresh' ? 'Refreshing the entity of a deleted row throws an exception. After a bulk DELETE, empty the persistence context with em.clear() so that you do not use those entities any more.' : after === 'jpql' ? 'A JPQL query goes to the database, so you can see that the items are gone, but the entities of the deleted items are still in the persistence context. em.find still returns that object.' : 'The entities of the rows deleted by the bulk DELETE remain in the persistence context, so you end up treating deleted items as if they exist. After a bulk operation, empty the persistence context with em.clear().');
    if (op === 'delete') sum.push('A bulk DELETE does not go through entities, so it does not follow cascade or orphanRemoval settings either. When a parent with cascade = ALL and orphanRemoval = true was deleted with a bulk DELETE in the same environment, the children were not deleted, and it failed with a foreign key constraint violation.');
    return { events: ev, summary: sum, seq: { op: seq.op.join(',') || '-', read: seq.read.join(',') || '-', commit: seq.commit.join(',') || '-' }, contains: !(st.cleared || st.err), row: ['SELECT: ' + sels, write, readText, dbText] };
  },
  blank: function (c) { var items = []; for (var i = 1; i <= +c.n; i++) items.push({ id: i, mem: null, db: 1000 * i }); return { items: items, sent: [], fresh: [], hot: {}, read: '', err: '', cleared: false }; },
  render: function (v, sim, t, H, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : this.blank(sim.c);
    H.counters(v, [[s.sent.length, 'SQL sent to the DB'], [s.sent.filter(function (x) { return x.sql.indexOf('select') !== 0; }).length, 'Of those, write SQL'], [s.err ? 'Exception' : s.read || '-', 'Price of item 1 that was read']]);
    H.table(v, ['Item', 'Entity price (memory)', 'Price in the DB row', 'Status'], s.items.map(function (it) {
      var diff = it.mem !== null && it.mem !== it.db;
      return { cells: ['Item ' + it.id, { v: it.mem === null ? '(none)' : it.mem + '', cls: it.pend ? 'hot' : diff ? 'bad' : it.mem === null ? '' : 'good' }, it.db === null ? '(no row)' : it.db + '', it.mem === null ? '' : it.pend ? 'Not sent yet' : diff ? 'Old value' : 'Same'] };
    }), 'Memory and DB');
    if (s.sent.length) H.table(v, ['#', 'SQL', 'Sent at'], s.sent.map(function (x, i) { return { cells: [String(i + 1), { v: x.sql, cls: i >= s.sent.length - s.fresh.length ? 'hot' : '' }, x.at] }; }), 'SQL sent to the DB'); else { H.title(v, 'SQL sent to the DB'); H.text(v, 'None yet.'); }
    if (s.err) H.text(v, 'Exception: ' + s.err);
  },
  // Diagram: on the left, the item entities held by the persistence context, and on the right, the rows of the DB at the same height. An entity that does not know the DB changed is red, and a change not yet sent is yellow.
  draw: function (P, sim, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : this.blank(sim.c), n = s.items.length;
    var rh = 44 + n * 29;                                  // height of the area, to fit the number of items
    P.size(680, rh + 72);
    P.region('pc', 16, 16, 290, rh, s.cleared ? 'Persistence context (after emptying)' : 'Persistence context (entities held)');
    P.region('db', 374, 16, 290, rh, 'The item table in the DB');
    s.items.forEach(function (it, i) {
      var y = 50 + i * 29, diff = it.mem !== null && it.mem !== it.db;
      P.box('m' + it.id, 30, y, 262, 25, { cls: it.mem === null ? 'ghost' : it.pend ? 'hot' : diff ? 'bad' : 'good', title: 'Item ' + it.id, right: it.mem === null ? 'none' : it.mem + '' });
      P.box('d' + it.id, 388, y, 262, 25, { cls: it.db === null ? 'ghost' : s.hot.db || (s.hot.d1 && it.id === 1) ? 'hot' : 'plain', title: 'id ' + it.id, right: it.db === null ? 'no row' : it.db + '' });
    });
    if (s.fresh.length) { var kinds = {}; s.fresh.forEach(function (k) { kinds[k] = (kinds[k] || 0) + 1; }); P.arrow('sql', 'pc:r', 'db:l', { cls: 'hot', label: Object.keys(kinds).map(function (k) { return k + (kinds[k] > 1 ? ' ×' + kinds[k] : ''); }).join(', ') }); }
    P.box('res', 16, rh + 26, 648, 34, { cls: s.err ? 'bad' : s.read ? 'plain' : 'ghost', title: s.err ? 'Exception' : 'Price of item 1 that was read', right: s.err || s.read || 'Not read yet' });
    P.note('On the same line, the left and the right are the same item, and the numbers are prices. Green means the entity in memory has the same value as the DB, yellow means there is a change not yet sent to the DB, and red means the entity holds an old value because it does not know that the DB changed. The arrow in the middle shows that SQL was sent to the DB in this step. The arrow of a bulk operation changes only the DB on the right, not the entities on the left.');
  },
  assume: 'This lab assumes one simple entity, Item, whose id is set directly in the code, run in one transaction and one persistence context. All 66 combinations of 3 methods, 5 ways of reading, whether there is an unflushed change, and the item counts 2, 3, and 8 (the "read" setting is not used for "Change the entities one by one") were run on real Hibernate 7.4.5 and an H2 database, and the kind and order of the SQL sent, the return value of executeUpdate, the value read, the value in the DB after it ended, and the exception were confirmed to match the screen. The SQL on the screen is shortened to be easy to read. The flush just before the bulk operation is the behavior under the default setting (FlushMode AUTO). The exception when refreshing a deleted row was Hibernate\'s UnresolvableObjectException in this environment (the JPA documentation lists EntityNotFoundException for this case). Spring Data JPA\'s @Modifying(clearAutomatically = true) was not run in this environment, and the explanation follows the documentation. A bulk UPDATE on an entity with @Version, the relationship between bulk operations and the second-level cache, and bulk operations run as native SQL are not covered.',
});

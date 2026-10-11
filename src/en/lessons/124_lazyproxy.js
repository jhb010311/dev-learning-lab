Lab.register({
  id: 'lazyproxy', nav: 'Proxies and lazy fetching', cat: 'JPA', mode: 'step',
  title: 'Is an object received through lazy fetching a real entity?',
  intro: 'A member object you get from em.getReference or from lazy fetching may not be a real Member. It may be a proxy (a stand-in object) that knows only the identifier. A proxy queries the DB only at the moment the real data is needed.',
  terms: ['Entity proxy', 'LazyInitializationException', 'Lazy fetching and eager fetching', 'Persistence context', 'First-level cache'],
  controls: [
    { id: 'how', label: 'How to get the member object m', type: 'select', value: 'ref', options: [['ref', 'em.getReference(Member.class, 1L)'], ['lazy', 'Load an order, then order.getMember() (lazy fetching)'], ['find', 'em.find(Member.class, 1L)'], ['findref', 'Read with em.find first, then em.getReference'], ['reffind', 'Call em.getReference first, then em.find']] },
    { id: 'use', label: 'What you do with m', type: 'select', value: 'name', options: [['id', 'm.getId() (read the identifier)'], ['name', 'm.getName() (read the name)'], ['cls', 'Compare m.getClass() == Member.class'], ['closed', 'Close the persistence context, then m.getName()']] },
  ],
  presets: [
    { t: 'Default settings', d: 'No SQL is sent when you get it with getReference, and a SELECT is sent when you read the name.', v: { how: 'ref', use: 'name' } },
    { t: 'Reading only the identifier', d: 'The proxy already knows that value, so no SQL is sent.', v: { how: 'ref', use: 'id' } },
    { t: 'A member received through lazy fetching', d: 'What order.getMember() returns is a proxy, too.', v: { how: 'lazy', use: 'name' } },
    { t: 'After the persistence context is closed', d: 'There is no way to fill the empty proxy, so an exception is thrown.', v: { how: 'lazy', use: 'closed' } },
    { t: 'Comparing with getClass()', d: 'The class of the proxy is not Member, so the result is false.', v: { how: 'ref', use: 'cls' } },
    { t: 'When a member was already read', d: 'getReference returns the real entity, not a proxy.', v: { how: 'findref', use: 'cls' } },
    { t: 'When you got the proxy first', d: 'The em.find called later returns that proxy, too.', v: { how: 'reffind', use: 'cls' } },
  ],
  lines: function (c) {
    var a = { ref: ['Member m = em.getReference(Member.class, 1L);'], lazy: ['Order order = em.find(Order.class, 1L);', 'Member m = order.getMember();'], find: ['Member m = em.find(Member.class, 1L);'], findref: ['Member found = em.find(Member.class, 1L);', 'Member m = em.getReference(Member.class, 1L);'], reffind: ['Member ref = em.getReference(Member.class, 1L);', 'Member m = em.find(Member.class, 1L);'] }[c.how];
    var b = { id: ['Long id = m.getId();'], name: ['String name = m.getName();'], cls: ['boolean same = m.getClass() == Member.class;', 'boolean isMember = m instanceof Member;'], closed: ['em.close();', 'String name = m.getName();'] }[c.use];
    return a.concat(b);
  },
  code: function (c) {
    var ent = '@Entity\nclass Member {\n    @Id Long id;\n    String name;\n    Long getId() { return id; }\n    String getName() { return name; }\n}\n' + (c.how === 'lazy' ? '\n@Entity\n@Table(name = "orders")\nclass Order {\n    @Id Long id;\n    @ManyToOne(fetch = FetchType.LAZY)\n    Member member;\n    Member getMember() { return member; }\n}\n' : '');
    return ent + '\n// The DB has member 1 "Alice"' + (c.how === 'lazy' ? ' and order 1 of that member' : '') + '\n' + this.lines(c).map(function (l) { return l === 'em.close();' ? 'em.close();                     // ends the transaction and closes the persistence context' : l; }).join('\n');
  },
  label: function (c) { return { ref: 'getReference', lazy: 'Lazily fetched association', find: 'em.find', findref: 'getReference after find', reffind: 'find after getReference' }[c.how] + ' · ' + { id: 'getId()', name: 'getName()', cls: 'getClass() comparison', closed: 'getName() after closing' }[c.use]; },
  columns: ['What m is', 'Queries on the member table', 'Result of the last line'],
  simulate: function (c) {
    var how = c.how, use = c.use, ev = [], sum = [], L = this.lines(c), n = 0, when = '', same = '-';
    // m: none not there yet, proxy a proxy, entity a real entity. init: whether the proxy is connected to the real data. real: whether the real Member is in memory
    var st = { line: -1, order: false, m: 'none', init: false, real: false, open: true, sent: [], fresh: 0, out: '', err: '' };
    function push(s, k) { st.line = n++; ev.push({ s: s, k: k, snap: JSON.parse(JSON.stringify(st)) }); st.fresh = 0; }
    function send(sql, at) { st.sent.push({ sql: sql, at: at }); st.fresh++; }
    var selM = 'select * from member where id = 1';
    if (how === 'ref') {
      st.m = 'proxy';
      push('em.getReference(Member.class, 1L): Does not query the DB and returns a proxy object that holds only the identifier 1. A proxy is an object of a class that Hibernate creates at run time as a subclass of Member, and the rest of its contents, such as the name, is still empty.', '');
    }
    if (how === 'lazy') {
      st.order = true; st.m = 'proxy'; send('select * from orders where id = 1', 'When em.find(Order) is called');
      push('em.find(Order.class, 1L): A SELECT reads order 1. The order row holds only the identifier of the member (member_id = 1). The member field is LAZY, so the member table is not queried, and a proxy that knows only the identifier 1 is put in its place.', '');
      push('order.getMember(): Returns the proxy that was in the field as it is. No SQL has been sent to the member table yet.', '');
    }
    if (how === 'find') {
      st.m = 'entity'; st.real = true; send(selM, 'When em.find is called'); when = 'When em.find is called';
      push('em.find(Member.class, 1L): Sends a SELECT right away and reads member 1. The m you get back is not a proxy but a real Member object with all its contents filled in.', '');
    }
    if (how === 'findref') {
      st.real = true; send(selM, 'When em.find is called'); when = 'When em.find is called';
      push('em.find(Member.class, 1L): Sends a SELECT and reads member 1. The real Member object is kept in the persistence context (first-level cache).', '');
      st.m = 'entity'; same = 'true';
      push('em.getReference(Member.class, 1L): The persistence context already has member 1. There is no reason to create a new proxy, so it returns the real entity it is holding as it is. found == m is true.', 'good');
    }
    if (how === 'reffind') {
      st.m = 'proxy';
      push('em.getReference(Member.class, 1L): Does not query the DB and creates and returns a proxy that holds only the identifier 1. This proxy is registered in the persistence context as member 1.', '');
      st.init = true; st.real = true; same = 'true'; send(selM, 'When em.find is called'); when = 'When em.find is called';
      push('em.find(Member.class, 1L): Sends a SELECT and reads the data of member 1. But what it returns is not a new object but the proxy created earlier (ref == m is true). This is because, within one persistence context, the same identifier must be the same object. The proxy is now connected to the real data.', '');
    }
    var proxy = st.m === 'proxy', empty = proxy && !st.init, res = '';
    if (use === 'id') {
      res = '1'; st.out = 'id = 1';
      push('m.getId(): ' + (empty ? 'A proxy holds the identifier from the moment it is created. It returns 1 without going to the DB. The rest of the proxy\'s contents is still empty.' : proxy ? 'Returns the identifier 1 that the proxy holds. No SQL is sent.' : 'Returns the value 1 of the id field of the real entity. No SQL is sent.'), empty ? 'good' : '');
    }
    if (use === 'name') {
      if (empty) {
        st.init = true; st.real = true; send(selM, 'When getName is called'); when = 'When getName is called';
        push('m.getName(): The proxy holds only the identifier, so it cannot know the name. At this moment, it sends a SELECT to read the real Member (initializing the proxy), and the proxy is connected to that object.', 'bad');
        res = 'Alice'; st.out = 'name = "Alice"';
        push('The proxy calls getName() of the real Member on its behalf and returns "Alice". A proxy that has been initialized once does not query again.', '');
      } else {
        res = 'Alice'; st.out = 'name = "Alice"';
        push('m.getName(): ' + (proxy ? 'This proxy is already connected to the real data. It gets the value from the real Member without SQL and returns "Alice".' : 'Returns the value "Alice" of the name field of the real entity. No SQL is sent.'), '');
      }
    }
    if (use === 'cls') {
      st.out = 'same = ' + !proxy;
      push('m.getClass() == Member.class: ' + (proxy ? 'The actual class of m is not Member but a proxy class that extends Member (Member$HibernateProxy). The two classes differ, so the result is false.' + (empty ? ' getClass() does not initialize the proxy, so no SQL is sent either.' : ' The class of a proxy does not change even after it is initialized.') : 'm is a real Member object, so the result is true.'), proxy ? 'bad' : 'good');
      res = 'getClass() comparison ' + !proxy + ' · instanceof true'; st.out += ', isMember = true';
      push('m instanceof Member: ' + (proxy ? 'The proxy class is a subclass of Member, so the result is true. If you use instanceof instead of getClass() to compare types, you do not need to tell proxies and real entities apart.' : 'The result is true.'), proxy ? 'good' : '');
    }
    if (use === 'closed') {
      st.open = false;
      push('em.close(): Ends the transaction and closes the persistence context. The Java object m remains in memory, but it is no longer connected to a persistence context (detached).', '');
      if (empty) {
        res = 'LazyInitializationException'; st.err = res;
        push('m.getName(): To fill an empty proxy, you must query the DB through the persistence context. But the persistence context is already closed. It cannot send SQL, and a LazyInitializationException is thrown.', 'bad');
      } else {
        res = 'Alice'; st.out = 'name = "Alice"';
        push('m.getName(): ' + (proxy ? 'This proxy was already connected to the real data before the close. It does not need to go to the DB, so it returns "Alice".' : 'A real entity already has all its data. It returns "Alice" even after the persistence context is closed.'), 'good');
      }
    }
    var sel = st.sent.filter(function (q) { return q.sql === selM; }).length;
    if (how === 'ref' || how === 'lazy') {
      if (use === 'id') sum.push('A proxy is born with its identifier, so getId() does not initialize it. When you need only the identifier (for example, when you set a relationship by supplying only the foreign key value), you do not have to query the DB.');
      if (use === 'name') sum.push('The query SQL is sent not at the moment you receive the object but at the moment you first use a value other than the identifier. This is lazy fetching.' + (how === 'lazy' ? ' If there are many orders and this happens for each order, it becomes the problem you saw in the "N+1" lab.' : ''));
      if (use === 'cls') sum.push('If you write your own equals and compare types with getClass() != o.getClass(), a proxy and a real entity are judged to be different objects. Use instanceof to compare the types of entities, and read fields through getters.');
      if (use === 'closed') sum.push('An uninitialized proxy can be filled only while the persistence context is open. Read the values you need outside the transaction in advance inside the transaction, or fetch them together from the start with a fetch join.');
    }
    if (how === 'find') sum.push('em.find queries the DB as soon as you call it and returns a real entity.' + (use === 'closed' ? ' It already has the data, so you can read the values even after the persistence context is closed.' : use === 'cls' ? ' So the getClass() comparison is true as well.' : ''));
    if (how === 'findref') sum.push('If the persistence context already has a real entity, getReference returns that entity, not a proxy. The result of getReference is not always a proxy.');
    if (how === 'reffind') sum.push('If a proxy was created first, the em.find after it returns the same proxy. You cannot assume that what you got from em.find is an object of the real Member class.' + (use === 'cls' ? ' That is why the getClass() comparison is false even though it is the result of em.find.' : use === 'closed' ? ' However, em.find sent a SELECT and initialized the proxy, so you can read the values even after the close.' : ''));
    return { events: ev, summary: sum, L: L, proxy: proxy, same: same, init: st.m === 'entity' || st.init, row: [proxy ? 'Proxy' : 'Real entity', sel ? sel + ' (' + when + ')' : '0', res] };
  },
  blank: function () { return { line: -1, order: false, m: 'none', init: false, real: false, open: true, sent: [], fresh: 0, out: '', err: '' }; },
  render: function (v, sim, t, H, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : this.blank(), cur = Math.min(s.line, sim.L.length - 1);   // One line can be split into two steps (proxy initialization)
    H.table(v, ['Line', 'Code', ''], sim.L.map(function (l, i) { return { cells: [String(i + 1), { v: l, cls: i === cur ? 'hot' : '' }, i === cur ? '← now' : ''] }; }), 'Running code');
    H.counters(v, [[s.sent.filter(function (q) { return q.sql.indexOf('from member') > 0; }).length, 'Queries on the member table']]);
    var ln = H.lanes(v);
    H.lane(ln, 'Class of m', s.m === 'none' ? 'None yet' : s.m === 'proxy' ? 'Member$HibernateProxy (a proxy that extends Member)' : 'Member', s.m === 'proxy' ? 'hot' : s.m === 'entity' ? 'good' : 'none');
    if (s.sent.length) H.table(v, ['#', 'SQL', 'Sent at'], s.sent.map(function (q, i) { return { cells: [String(i + 1), { v: q.sql, cls: i >= s.sent.length - s.fresh ? 'hot' : '' }, q.at] }; }), 'SQL sent to the DB'); else { H.title(v, 'SQL sent to the DB'); H.text(v, 'None yet.'); }
  },
  // Diagram: on the left, inside the persistence context, are the proxy and the real Member (and the order if it is lazy fetching), and on the right is the DB. When the proxy is initialized, an arrow to the real object appears.
  draw: function (P, sim, shown) {
    var c = sim.c, last = shown[shown.length - 1], s = last ? last.snap : this.blank(), lazy = c.how === 'lazy';
    P.size(680, 300);
    P.region('pc', 16, 16, 430, 214, s.open ? 'Persistence context (open)' : 'Persistence context (closed)');
    P.region('db', 496, 16, 168, 214, 'DB');
    if (lazy) {
      P.box('order', 30, 48, 190, 46, { cls: s.order ? 'plain' : 'ghost', title: 'Order 1', sub: s.order ? 'member field → proxy' : 'Not read yet' });
      P.box('do', 508, 48, 144, 46, { cls: 'plain', title: 'orders', sub: 'id 1, member_id 1' });
    }
    var hasProxy = c.how !== 'find' && c.how !== 'findref';
    if (hasProxy) P.box('proxy', 30, 118, 190, 56, { cls: s.m !== 'proxy' ? 'ghost' : s.err ? 'bad now' : s.init ? 'hot' : 'wait now', title: 'Member proxy', sub: s.m !== 'proxy' ? 'None yet' : s.init ? 'id 1 · initialized' : 'id 1 · no contents' });
    P.box('real', hasProxy ? 262 : 30, 118, 170, 56, { cls: s.real ? 'good' : 'ghost', title: 'Real Member', sub: s.real ? 'id 1 · Alice' : 'Not read yet' });
    P.box('dm', 508, 118, 144, 56, { cls: 'plain', title: 'member', sub: 'id 1, Alice' });
    if (lazy && s.order) P.arrow('o2p', 'order:b', 'proxy:t', { cls: 'mut' });
    if (hasProxy && s.m === 'proxy' && s.init) P.arrow('p2r', 'proxy:r', 'real:l', { cls: 'good', label: 'calls' });
    P.box('var', 30, 186, 402, 34, { cls: s.m === 'none' ? 'ghost' : 'plain', title: 'Variable m', right: s.m === 'none' ? 'None yet' : s.m === 'proxy' ? 'Points to the proxy' : 'Points to the real Member' });
    if (s.fresh) P.arrow('sql', 'pc:r', 'db:l', { cls: 'hot', label: 'SELECT' });
    P.box('res', 16, 244, 648, 36, { cls: s.err ? 'bad' : s.out ? 'good' : 'ghost', title: s.err ? 'Exception' : 'Result', right: s.err || s.out || 'None yet' });
    P.note('A blue proxy is empty and knows only the identifier. A yellow proxy is connected to the real Member (initialized). The arrow in the middle means that a query SQL was sent to the DB in this step. Even after it is initialized, a proxy does not turn into the real object; it passes the calls it receives on to the real object.');
  },
  assume: 'All 20 combinations (5 ways to get the object and 4 things to do with it) were run on real Hibernate 7.4.5 and an H2 database, and whether m is a proxy, when and how many times the member table was queried, and the value or exception on the last line were confirmed to match the screen. This is based on an ordinary mapping where @Id is placed on the entity\'s field and getters are provided, and on a single persistence context. The name of the proxy class was Member$HibernateProxy in this environment, and depending on the version, a suffix may be added after it. The following were also confirmed in the same environment. If you read a field of the proxy directly without going through a getter (m.name), the proxy is not initialized and you get null. If you call getReference with an identifier that is not in the DB, there is no exception at that point, and an exception (ObjectNotFoundException) is thrown after the query is sent when you first read a value. Even after the persistence context is closed, getId() of a proxy returns its value. In a Spring Boot web request, the default OSIV setting keeps the persistence context open until the response ends, so this exception may show up late, but that part was not verified by execution. The documentation says that in an environment that uses bytecode enhancement, lazy fetching may work in another way instead of through proxies, but this was not run either.',
});

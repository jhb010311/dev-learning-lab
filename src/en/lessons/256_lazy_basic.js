Lab.register({
  id: 'lazy_basic', nav: 'Lazy fetching', cat: 'Fundamentals', mode: 'step', basic: true, deep: ['lazyproxy', 'nplus1'],
  title: 'When is an associated object read from the database?',
  intro: 'An order (Order) points to the member (Member) who placed it (Order and Member are entity classes written for this lab as examples). In code, the member field of Order points to that member. In the database, the order row in the orders table holds only the number of the member (member_id). So when you read one order with em.find, JPA has to decide: should it read the member that the order points to at the same time, or should it read the member at the moment the code actually uses its values? You write this in @ManyToOne(fetch = ...) above the member field. FetchType.EAGER is the way that reads the member together with the order when the order is read (eager fetching), and FetchType.LAZY is the way that puts it off until the member is used (lazy fetching). While it is put off, the member field refers to a proxy, an empty stand-in object that knows only the number of member 1. At the moment the code takes a value of the member, such as the name, JPA sends a SELECT statement that reads the member table and fills the proxy. The code on the screen has no SQL at all, yet SQL is sent, and when it is sent depends on the setting. In this lab you change the fetch setting and delete the order.getMember().getName() line, and read the same order each time, and you see which table each line sent a SELECT for.',
  terms: ['Lazy fetching and eager fetching', '@ManyToOne', 'Entity proxy', 'FetchType'],
  controls: [
    { id: 'fetch', label: 'Marker above the member field', type: 'select', value: 'lazy', options: [['lazy', '@ManyToOne(fetch = FetchType.LAZY)'], ['eager', '@ManyToOne(fetch = FetchType.EAGER)']] },
    { id: 'use', label: 'Write the order.getMember().getName() line', type: 'check', value: true },
  ],
  // q is the question shown on the question-style screen. t and d are the name and the description used in the text-only reading
  presets: [
    { t: 'Default settings', q: 'What does a member marked FetchType.LAZY look like, and when is SQL sent if you read the order with em.find and then run the order.getMember().getName() line?', d: 'With LAZY, the find line reads only the orders table, and the SELECT that reads the member table is sent on the getName line, which takes the name of the member.', v: { fetch: 'lazy', use: true } },
    { t: 'If you do not use the name', q: 'What if you delete the order.getMember().getName() line, so that the name of the member is not used?', d: 'With LAZY, if the values of the member are not used, the SELECT that reads the member table is never sent.', v: { fetch: 'lazy', use: false } },
    { t: 'If you change to EAGER', q: 'What if you change FetchType.LAZY to FetchType.EAGER?', d: 'With EAGER, the find line reads the order and the member together with one SELECT that joins them, and no SQL is sent on the getName line.', v: { fetch: 'eager', use: true } },
    { t: 'If you do not use the name with EAGER', q: 'What if you change to FetchType.EAGER and also delete the order.getMember().getName() line?', d: 'With EAGER, the find line reads the member too, even if the name is not used.', v: { fetch: 'eager', use: false } },
  ],
  // The code on the screen and the source that the checking program (verify/spring/src/LazyBasicProbe.java) compiled and ran are the same text (the checking script compares them down to the letter).
  code: function (c) {
    var l = ['@Entity', 'public class Member {', '    @Id', '    private Long id;', '    private String name;', '', '    public String getName() { return name; }', '}', '',
      '@Entity', '@Table(name = "orders")', 'public class Order {', '    @Id', '    private Long id;', '',
      '    // Link: decides when to read the member that this order points to',
      '    @ManyToOne(fetch = FetchType.' + (c.fetch === 'lazy' ? 'LAZY' : 'EAGER') + ')',
      '    private Member member;', '', '    public Member getMember() { return member; }', '}', '',
      '// The side that queries: lines inside a method (em, class, and method declarations and imports omitted)',
      '// The database holds order 10 and member 1 (Alice), who placed that order',
      'Order order = em.find(Order.class, 10L);'];
    if (c.use) l.push('// Use: actually use a value (the name) of the member', 'String name = order.getMember().getName();');
    return l.join('\n');
  },
  label: function (c) { return (c.fetch === 'lazy' ? 'FetchType.LAZY' : 'FetchType.EAGER') + (c.use ? ' · uses the name' : ' · does not use the name'); },
  columns: ['SQL sent on the find line', 'SQL sent on the getName line', 'When the member was read'],
  simulate: function (c) {
    var lazy = c.fetch === 'lazy', use = !!c.use, ev = [], sum = [];
    // State: cur is the line being run now (l1 find, l2 getMember/getName), ob is whether the Order object has been created, mb is the object on the member side (none: nothing, empty: a proxy whose name is empty, filled: filled in with the name),
    // kind is the kind of the object on the member side (proxy: a proxy, real: a real Member), n is the number of SELECTs sent, when is when the member was read, ro and rm are whether this step read the orders and member tables, end is whether the code has finished
    var st = { cur: '', ob: false, mb: 'none', kind: lazy ? 'proxy' : 'real', n: 0, when: '', ro: false, rm: false, end: false, log: [] };
    function push(s, k) { ev.push({ s: s, k: k, snap: JSON.parse(JSON.stringify(st)) }); }
    function step() { st.ro = false; st.rm = false; }

    // 0. Setup
    step();
    push('The database setup: before the code runs, the orders table in the database holds one order row (id 10, member_id 1), and the member table holds one member row (id 1, Alice). member_id is the column that holds the number of the member who placed this order. These rows were put in beforehand, outside the code on the screen. Order and Member are Java classes (entities) that each correspond to a table (one object of the class is one row), and em in the code is the EntityManager that reads entities from the database. Nothing has been read yet.', '');

    // 1. find
    step();
    st.cur = 'l1'; st.ob = true; st.ro = true; st.n = 1;
    if (lazy) {
      st.mb = 'empty';
      st.log.push(['find', '1 SELECT (orders table only)', '']);
      push('Order order = em.find(Order.class, 10L): em looks for the order whose id is 10. JPA (Hibernate) builds and sends 1 SELECT statement (SQL that reads rows from the database) that reads the orders table, and builds an Order object from the row it read. This row holds only the member number, member_id = 1. LAZY is written above the member field, so the member table is not read, and the member field is made to refer to a proxy that knows only the number of member 1. The name of the proxy is still empty. This SELECT is not in the code we wrote. JPA built and sent it.', '');
    } else {
      st.mb = 'filled'; st.rm = true; st.when = 'On the find line';
      st.log.push(['find', '1 SELECT (joins orders and member)', 'hot']);
      push('Order order = em.find(Order.class, 10L): em looks for the order whose id is 10. JPA (Hibernate) builds and sends 1 SELECT statement (SQL that reads rows from the database) and builds an Order object from the row it read. EAGER is written above the member field, so this one SELECT joins the orders table and the member table (it links the two tables by number and reads them at once) and reads the row of member 1 as well. So the member field refers to a real Member object that is filled in even with the name (Alice). This SELECT is not in the code we wrote. JPA built and sent it.', 'hot');
    }

    if (use) {
      // 2. getMember()
      step();
      st.cur = 'l2';
      if (lazy) push('order.getMember(): returns as it is the proxy that the member field of the Order object referred to. Up to this line, no SQL has been sent for the member table, and the name of the proxy that was returned is still empty.', '');
      else push('order.getMember(): returns as it is the Member object that the member field of the Order object referred to. It was already filled in even with the name on the find line, so no SQL is sent.', '');

      // 3. getName()
      step();
      if (lazy) {
        st.mb = 'filled'; st.rm = true; st.n = 2; st.when = 'On the getName line';
        st.log.push(['getName', '1 SELECT (member table only)', 'hot']);
        push('.getName(): the proxy holds only the number of the member, so it does not know the name. At this moment, JPA (Hibernate) sends a SELECT statement that reads the member table, reads the row of member 1, fills in the proxy, and returns the name Alice. The SELECT was sent on this line, where a value of the member was taken for the first time, and this SELECT is not in the code we wrote either.', 'hot');
      } else {
        st.log.push(['getName', 'None', '']);
        push('.getName(): returns the name Alice of the Member object that was already filled in on the find line. There is no need to go to the database again, so no SQL is sent.', '');
      }
    }

    // 4. End
    step();
    st.cur = ''; st.end = true;
    if (lazy && use) push('The code has finished. SELECT statements sent in total: 2. 1 was sent on the find line that reads the order, and 1 on the getName line that takes the name of the member. The member was read on the getName line, where the name was actually used.', '');
    else if (lazy) push('The code has finished. There is no line that uses the name of the member, so the SELECT that reads the member table was never sent. SELECT statements sent: only 1, on the find line, and the member field was left referring to a proxy whose name is empty.', 'good');
    else if (use) push('The code has finished. SELECT statements sent: only 1, on the find line. The member had already been read on the find line that reads the order, before its name was used.', '');
    else push('The code has finished. There is no line that uses the name of the member, yet the 1 SELECT that was sent read the member too. With EAGER, the member is read on the find line whether it is used or not.', 'bad');

    // Summary: the first line is the answer to the question
    var key = (lazy ? 'lazy' : 'eager') + '|' + (use ? 1 : 0);
    var S = {
      'lazy|1': ['A member marked FetchType.LAZY means "the member is read when it is used." The find line that reads the order read only the orders table, and the SELECT that reads the member was sent on the getName line that took the name (SELECT statements in total: 2).', 'The code has no SQL at all, yet SQL was sent twice. No SQL is sent up to order.getMember(); it is sent at the moment a value of the member is used.'],
      'lazy|0': ['If the name of the member is not used, the SELECT that reads the member table is never sent (SELECT statements in total: 1). LAZY means that a member that is not used is not read.', 'In the meantime, the member field only refers to a proxy that knows only the number of the member and whose name is empty.'],
      'eager|1': ['If you change to FetchType.EAGER, the member is read together on the find line that reads the order. In this code it was read with one SELECT that joins the order and the member, and no SQL was sent on the getName line (SELECT statements in total: 1).', 'What changed is the time of reading. The member is read at the moment the order is read, before it is used.'],
      'eager|0': ['With EAGER, the find line reads the member too, even if the name is not used. It read a member that would not be used.', 'With LAZY, this code would never have read the member table at all. When em.find is called, it cannot be known whether the code will use the member, so with EAGER the member is read when the order is read, whether it is used or not (in this lab, with one SELECT that uses a join).']
    };
    S[key].forEach(function (x) { sum.push(x); });
    var nameCol = !use ? '(no such line)' : lazy ? '1 SELECT (member)' : 'None';
    return { events: ev, summary: sum, row: [lazy ? '1 SELECT (orders)' : '1 SELECT (joins orders and member)', nameCol, lazy ? (use ? 'On the getName line' : 'Not read') : 'On the find line'] };
  },
  render: function (v, sim, t, H, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : null;
    if (!s) { H.text(v, 'Click Run to start from the database holding order 10 and member 1.'); return; }
    H.table(v, ['Line of code', 'SQL sent on that line'], s.log.length ? s.log.map(function (r) { return { cls: '', cells: [r[0], { v: r[1], cls: r[2] }] }; }) : [{ cls: 'gone', cells: ['None yet', ''] }], 'SQL sent');
    H.counters(v, [[s.n, 'SELECT statements sent'], [s.mb === 'filled' ? 1 : 0, 'Members read with the name']]);
  },
  // Diagram: on the left, the two lines of code (read the order, use the name of the member); in the middle, the Order object in memory and the object on the member side that its member field points to (a proxy or a real Member); on the right, the orders and member tables in the database. When SQL is sent, an arrow appears from the object to the table.
  draw: function (P, sim, shown) {
    var c = sim.c, lazy = c.fetch === 'lazy', use = !!c.use, last = shown[shown.length - 1], s = last ? last.snap : null;
    P.size(680, 290);
    P.region('code', 14, 12, 200, 206, 'Code');
    P.region('mem', 264, 12, 200, 206, 'Objects in memory');
    P.region('db', 514, 12, 152, 206, 'Tables in the database');
    function line(id, y, title, sub, on) {
      var cur = s && s.cur === id;
      P.box(id, 26, y, 176, 60, { cls: !on ? 'ghost' : cur ? 'hot now' : 'plain', title: title, sub: sub });
    }
    line('l1', 40, '1. Read the order', 'em.find(Order.class)', true);
    line('l2', 124, '2. Use the name', use ? 'getMember().getName()' : '(no such line)', use);
    P.box('ob', 276, 40, 176, 60, { cls: s && s.ob ? (s.ro ? 'hot' : 'plain') : 'ghost', title: 'Order object', sub: s && s.ob ? ['id 10', 'member → object below'] : 'Not yet' });
    var mt = 'Member object', msub = 'Not yet', mcls = 'ghost';
    if (s && s.mb !== 'none') {
      mt = s.kind === 'proxy' ? 'Proxy' : 'Member object';
      msub = ['id 1', s.mb === 'filled' ? 'name: Alice' : 'name: empty'];
      mcls = s.rm ? 'hot' : s.mb === 'filled' ? 'good' : 'wait';
    }
    P.box('mb', 276, 124, 176, 60, { cls: mcls, title: mt, sub: msub });
    P.box('dt1', 526, 40, 128, 60, { cls: s && s.ro ? 'hot' : 'plain', title: 'orders', sub: ['id 10', 'member_id 1'] });
    P.box('dt2', 526, 124, 128, 60, { cls: s && s.rm ? 'hot' : 'plain', title: 'member', sub: ['id 1', 'Alice'] });
    if (s && s.cur === 'l1') P.arrow('a1', 'l1:r', 'ob:l', { cls: 'mut' });
    if (s && s.cur === 'l2') P.arrow('a2', 'l2:r', 'mb:l', { cls: 'mut' });
    if (s && s.ob) P.arrow('am', 'ob:b', 'mb:t', { cls: 'mut' });
    if (s && s.ro) P.arrow('s1', 'ob:r', 'dt1:l', { cls: 'hot' });
    if (s && s.rm) P.arrow('s2', 'mb:r', 'dt2:l', { cls: 'hot' });
    P.box('n1', 14, 236, 322, 40, { cls: s && s.n ? 'wait' : 'ghost', title: 'SELECT statements sent', right: (s ? s.n : 0) + '' });
    P.box('n2', 344, 236, 322, 40, { cls: s && s.when ? 'good' : 'ghost', title: 'Member read', right: s && s.when ? s.when : s && s.end ? 'Not read' : 'Not yet' });
  },
  assume: 'This was checked against real execution on Hibernate 7.4.5 and H2 2.4.240 (in-memory database). A SessionFactory was built directly without Spring, on JDK 21. All 4 combinations were compiled and run with the two entity classes on the screen (Member and Order) and the lines of code that read, exactly as they are (including the comment lines). What was left out of the screen is only the package and import lines, and what does not appear on the screen is the code that gets and closes the EntityManager. For each combination, the database and the SessionFactory were created anew, the tables were created by Hibernate, and before the run, member (1, Alice) and order (10, member_id 1) were put into the database with JDBC. The SQL of this setup was not counted, and the code that reads was run in an EntityManager different from the one used for the setup, with an empty persistence context. The code that reads has no line that starts a transaction, and it was run with em left open. What was checked against the run is the SQL that was captured with Hibernate\'s StatementInspector, split by line of code (the line that sent it was found from the call stack, and the original SQL and the lines were kept in the output of the checking run). In this environment, LAZY sent 1 SELECT that reads only the orders table on the find line and 1 SELECT that reads only the member table on the getName line, and EAGER sent 1 SELECT that does a left join of orders and member on the find line and sent none on the getName line. When there was no line that uses the name, LAZY sent no SELECT that reads the member table at all. The facts that the step sentences rely on were also measured in a second run that inserts a measuring line right below each line of code and splits getMember() and getName() into two lines. With LAZY, right after find, the object in the member field is an object of a proxy class that Hibernate made (Member$HibernateProxy), it is not initialized, and it knows the identifier 1. Right after order.getMember() was called, the SQL did not increase and it was still not initialized. Right after getName(), one SELECT was added and it was initialized. With EAGER, right after find, the object in the member field is a real Member object and not a proxy, it is initialized, and the SQL did not increase after getMember() and getName(). Also, when the same code was run without writing fetch in @ManyToOne, the member was read by 1 joined SELECT on the find line, the same as EAGER (this was not put into the settings on the screen, and was used only as the evidence for the glossary). What the documentation defines is in the Jakarta Persistence 3.2 API documentation: FetchType (EAGER is a requirement that data must be eagerly fetched, and LAZY is a hint that data may be fetched when it is first accessed, and the implementation may eagerly fetch data marked LAZY) and the fetch element of ManyToOne (the default is EAGER if it is not written). The Fetching chapter of the Hibernate User Guide could not be opened at the relevant part of the page, so it was not read, and how a proxy is put in and how EAGER is read with a join are not defined by the documentation but are behavior observed on Hibernate 7.4.5. By the specification, LAZY is a hint, and whether to read EAGER with a join or with a separate SELECT is decided by the implementation, so the screen shows only the SQL that was sent in this environment. This lab deals only with the time while em is open. It does not cover the LazyInitializationException that occurs when you try to fill a proxy after em is closed, the N+1 problem in which the number of SELECTs grows with the number of orders when there are many orders, JPQL queries, or the loading of collections (@OneToMany). The details of proxies are covered in the lab "Proxies and lazy fetching", and N+1 in the lab "N+1". The run was not checked against MySQL.',
});

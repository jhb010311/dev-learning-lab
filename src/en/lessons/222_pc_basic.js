Lab.register({
  id: 'pc_basic', nav: 'Persistence context', cat: 'Fundamentals', mode: 'step', basic: true, deep: ['pc'],
  title: 'What is a persistence context, and what does it do for you?',
  intro: 'A persistence context is the place where the EntityManager (em in the code) holds entity objects and watches them. An entity is a Java object that corresponds to one row in the database, and here it is Member. An entity that you read from the database with em.find goes into the persistence context (an entity passed to em.persist, which you use to save a new entity, goes in too, but this lab does not use it). JPA watches the entities inside it, so if you only change a value, JPA builds an UPDATE statement and sends it when the transaction commits. If you call find again with the same id, it does not go to the database and gives you the object it was holding. On the other hand, an object you create yourself with new, or one you removed with em.detach, is an ordinary Java object that is not in the persistence context, so changing its values does not reach the database. This lab changes how you get the Member and runs the same code (change name to Bob and commit), and shows the name in the database after the commit and the number of UPDATE and SELECT statements that were sent.',
  terms: ['Persistence context', 'Dirty checking', 'First-level cache', 'Detached entity'],
  controls: [
    { id: 'how', label: 'Code that gets the Member', type: 'select', value: 'find', options: [['find', 'Get it with em.find'], ['new', 'Create it yourself with new Member(1L, "Alice")'], ['detach', 'Get it with em.find, then remove it with em.detach(m)']] },
    { id: 'again', label: 'Call find once more with the same id', type: 'check', value: false },
  ],
  // q is the question shown on the question-style screen. t and d are the name and the description used in the text-only reading
  presets: [
    { t: 'Default settings', q: 'What is a persistence context, and what happens if you change the value of an entity you got with find?', d: 'You only changed the name of the Member you got with find, but when you commit, JPA sends an UPDATE statement and the database now has Bob.', v: { how: 'find', again: false } },
    { t: 'Creating it yourself with new', q: 'What if you change the value of an object you created yourself with new instead of find?', d: 'An object made with new is an ordinary object that is not in the persistence context, so changing it sends no UPDATE and the database stays Alice.', v: { how: 'new', again: false } },
    { t: 'Removing it with detach after find', q: 'What if you get it with find and then remove it with em.detach(m)?', d: 'Even if you got it with find, once you remove it, it is an ordinary object that is not watched, so changing it sends no UPDATE.', v: { how: 'detach', again: false } },
    { t: 'Calling find once more with the same id', q: 'What if you call find once more with the same id?', d: 'The second find does not go to the database and gives you the object it was holding, so there is 1 SELECT and m == m2 is true.', v: { how: 'find', again: true } },
  ],
  // The code on the screen and the code that the checking program (verify/spring/src/PcBasicProbe.java) ran are the same text (the checking script compares them character by character).
  code: function (c) {
    var l = ['// Only lines inside a method are shown (declarations, em setup, the Member entity, and imports omitted)', 'em.getTransaction().begin();'];
    if (c.how === 'new') l.push('Member m = new Member(1L, "Alice");');
    else {
      l.push('// find: the entity read from the database goes into the persistence context', 'Member m = em.find(Member.class, 1L);');
      if (c.how === 'detach') l.push('em.detach(m);');
    }
    l.push('m.setName("Bob");');
    if (c.again) l.push('Member m2 = em.find(Member.class, 1L);', 'System.out.println(m == m2);');
    l.push('em.getTransaction().commit();');
    return l.join('\n');
  },
  label: function (c) { return { find: 'Got with em.find', 'new': 'Created with new', detach: 'Got with find, then removed with detach' }[c.how] + (c.again ? ' · find called once more with the same id' : ''); },
  columns: ['name in the database after the commit', 'UPDATE statements sent', 'SELECT statements sent', 'm == m2'],
  simulate: function (c) {
    var how = c.how, again = !!c.again, managed = how === 'find', ev = [], sum = [];
    // State: o1 is the object that m points to, o2 is the object that m2 read separately (may not exist). inn is whether it is inside the persistence context, first is the first value that JPA remembers.
    // mv and m2v are the objects the variables point to, sel and upd are the SQL arrows in this step, hot is the object that changed in this step
    var st = { o1: null, o2: null, mv: '', m2v: '', db: 'Alice', ns: 0, nu: 0, sel: false, upd: false, hot: '', fin: '' };
    function push(s, k) { ev.push({ s: s, k: k, snap: JSON.parse(JSON.stringify(st)) }); }
    function step() { st.sel = false; st.upd = false; st.hot = ''; }

    // Setup: the row in the database
    push('Setup in the database: before the code runs, the member table in the database already holds one row with id 1, (1, Alice). This row was put in ahead of time, outside the code on the screen. em in the code is an EntityManager object, and the place where em holds entities (Java objects that correspond to one row in the database, here Member) and watches them is the persistence context. It is empty now.', '');

    // begin
    step();
    push('em.getTransaction().begin(): starts a transaction. From here to commit is one unit of work.', '');

    // get m
    step();
    if (how === 'new') {
      st.o1 = { inn: false, name: 'Alice', first: '' }; st.mv = 'o1'; st.hot = 'o1';
      push('Member m = new Member(1L, "Alice"): we create a Member object with new. No line puts this object into the persistence context, so it is an ordinary Java object outside the persistence context. Even though it has the same id 1, em does not know this object, and no SQL was sent.', '');
    } else {
      st.o1 = { inn: true, name: 'Alice', first: 'Alice' }; st.mv = 'o1'; st.hot = 'o1'; st.sel = true; st.ns++;
      push('Member m = em.find(Member.class, 1L): em looks for the Member with id 1. It is not in the persistence context yet, so JPA builds a SELECT statement and sends it to the database, makes a Member object from the values it read, and puts it into the persistence context. JPA also remembers the values at this moment (Alice). m points to this object. The line with the SELECT is not in the code we wrote. JPA made it and sent it.', '');
    }

    // detach
    if (how === 'detach') {
      step();
      st.o1.inn = false; st.o1.first = ''; st.hot = 'o1';
      push('em.detach(m): em removes the object that m points to from the persistence context. The object itself stays as it was (name is Alice), but now it is an ordinary Java object outside the persistence context. The first values that JPA remembered for this object are gone too.', '');
    }

    // setName
    step();
    st.o1.name = 'Bob'; st.hot = 'o1';
    if (managed) push('m.setName("Bob"): only the name of the Java object changes to Bob. No SQL is sent on this line, and the name in the database is still Alice. The object inside the persistence context now has a current value (Bob) that differs from the first value that JPA remembers (Alice).', '');
    else push('m.setName("Bob"): the name of the object that m points to changes to Bob. This object is outside the persistence context, so JPA does not know about this change, and no SQL is sent.' + (how === 'detach' ? ' Before it was removed, it was an object that JPA watched, but now it is not.' : ''), '');

    // find once more
    if (again) {
      step();
      if (managed) {
        st.m2v = 'o1'; st.hot = 'o1';
        push('Member m2 = em.find(Member.class, 1L): it looks for the same id 1 once more. The persistence context already holds an object with id 1, so JPA does not go to the database (it does not send a SELECT) and gives you the object it was holding. m2 points to the same object as m, and this object\'s name is already Bob even though the commit has not happened yet.', 'good');
        step();
        push('System.out.println(m == m2): prints true, because m and m2 point to the same object.', '');
      } else {
        st.o2 = { inn: true, name: 'Alice', first: 'Alice' }; st.m2v = 'o2'; st.hot = 'o2'; st.sel = true; st.ns++;
        push('Member m2 = em.find(Member.class, 1L): it looks for the same id 1 once more, but ' + (how === 'new' ? 'the persistence context has no object with id 1 (m is not in the persistence context).' : 'you removed m with em.detach(m), so the persistence context has no object with id 1.') + ' JPA sends a SELECT statement ' + (how === 'new' ? '' : 'once more ') + 'to the database, makes a new Member object from the database values, puts it into the persistence context, and m2 points to it. This object\'s name is Alice, the value that was in the database.', '');
        step();
        push('System.out.println(m == m2): prints false, because ' + (how === 'new' ? 'm is the object we created with new' : 'm is the object we removed') + ' and m2 is a different object that is in the persistence context. Both have id 1, but their names differ (Bob, Alice).', '');
      }
    }

    // commit
    step();
    if (managed) {
      st.upd = true; st.nu++; st.db = 'Bob'; st.o1.first = 'Bob'; st.hot = 'o1';
      push('em.getTransaction().commit(): at commit, JPA compares the current values of the entities held in the persistence context with the first values it remembered. The name changed from Alice to Bob, so JPA builds an UPDATE statement and sends it to the database. The code we wrote has no UPDATE and no call that says to save. The UPDATE was sent not on the m.setName line but on this commit line.' + (again ? ' The two variables point to the same object, so the UPDATE is sent only once.' : ''), 'good');
    } else {
      var who = how === 'new' ? 'm created with new' : 'the removed m';
      push('em.getTransaction().commit(): at commit, JPA compares only the entities that are in the persistence context. ' + (again ? 'The object that m2 points to is in it, but its values are the same as at first, and the object that ' + who + ' points to is not in it. Nothing differs, so no UPDATE statement is sent.' : 'The persistence context holds no entities, so there is nothing to compare, and no UPDATE statement is sent. The name of the object that m points to has been changed to Bob, but JPA does not look at it.'), 'bad');
    }

    // Database check
    step();
    st.fin = st.db; st.hot = '';
    push('After the commit finishes, if you query the member table in the database through another connection, the name of the row with id 1 is ' + st.db + '. (This query is only for checking, so it is not counted in the number of SELECT statements sent.)' + (managed ? '' : ' The code changed the name of m to Bob, but the database did not receive the change.'), managed ? 'good' : 'bad');

    // Summary: the first line is the answer to the question
    var S = {
      'find|0': ['A persistence context is the place where the EntityManager holds entity objects and watches them. The Member you got with em.find is in it, so when you only changed the name, JPA built 1 UPDATE statement at commit and sent it, and the name in the database became Bob.', 'The code we wrote has no UPDATE and no call that says to save. If you change the value of an entity inside the persistence context, the change reaches the database at commit.'],
      'new|0': ['A Member created with new is an ordinary Java object that is not in the persistence context, so changing the name sends no UPDATE and the name in the database stays Alice.', 'Even with the same class and the same id, JPA watches only the objects inside the persistence context. No exception occurs either, so it is easy to miss.'],
      'detach|0': ['A Member removed with em.detach(m) is an ordinary Java object that is not watched any more, even though you got it with find, so changing the name sends no UPDATE and the name in the database stays Alice.', 'Whether an object is in the persistence context depends on whether it is in it now, not on where you got it. The 1 SELECT that was sent came from the find before it was removed.'],
      'find|1': ['If you call find once more with the same id, it does not go to the database and gives you the object the persistence context was holding. There is still 1 SELECT, and m == m2 is true.', 'The object m2 received already has the name Bob, even though the commit has not happened yet. It received the object that the persistence context holds, not the value in the database, and because there is one object, only 1 UPDATE was sent.'],
      'new|1': ['m, created with new, is not in the persistence context, so find went to the database (1 SELECT) and brought back a new Member object. m == m2 is false, the name of m is Bob, and the name of m2 is Alice.', 'Even with the same id 1, m is an ordinary object outside the persistence context and m2 is an object inside it. Only m was changed, so there were 0 UPDATE statements, and the name in the database stays Alice.'],
      'detach|1': ['After you remove it, the persistence context has no object with id 1, so calling find with the same id goes to the database again (2 SELECT). m == m2 is false.', 'm is the removed object (Bob) and m2 is the object that was newly read (Alice). m2, which is inside the persistence context, did not change, so there were 0 UPDATE statements, and the name in the database stays Alice.']
    };
    S[how + '|' + (again ? 1 : 0)].forEach(function (x) { sum.push(x); });
    return { events: ev, summary: sum, row: [st.db, st.nu + '', st.ns + '', again ? (managed ? 'true' : 'false') : '(not looked up again)'] };
  },
  render: function (v, sim, t, H, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : null, c = sim.c, again = !!c.again;
    if (!s) { H.text(v, 'Click Run to start from the state where the database holds (1, Alice).'); return; }
    var rows = [];
    function vr(name, key) {
      var o = key ? s[key] : null;
      rows.push({ cls: '', cells: [name, o ? o.name : '-', o ? { v: o.inn ? 'In it' : 'Not in it', cls: o.inn ? 'good' : 'bad' } : '-'] });
    }
    vr('m', s.mv);
    if (again) vr('m2', s.m2v);
    H.table(v, ['Variable', 'name of the object it points to', 'In the persistence context'], rows, 'Variables in the code');
    H.table(v, ['member table in the database', 'name'], [{ cls: '', cells: ['id 1', { v: s.db, cls: s.db === 'Bob' ? 'good' : '' }] }], 'Database');
    H.counters(v, [[s.nu, 'UPDATE statements sent'], [s.ns, 'SELECT statements sent']]);
  },
  // Diagram: on the left the variable m (and m2) in the code, in the middle the persistence context area, on the right the member row in the database. An object box is inside the area if it is in it and outside (below) if not, and the variable arrow points to that object.
  draw: function (P, sim, shown) {
    var c = sim.c, again = !!c.again, last = shown[shown.length - 1], s = last ? last.snap : null;
    P.size(680, 292);
    P.text('lv', 62, 32, 'Variables', { cls: 'mut', anchor: 'middle' });
    P.box('vm', 14, 46, 96, 44, { cls: s && s.mv ? 'plain' : 'ghost', title: 'm', sub: s && s.mv ? ' ' : 'Not yet' });
    if (again) P.box('vm2', 14, 102, 96, 44, { cls: s && s.m2v ? 'plain' : 'ghost', title: 'm2', sub: s && s.m2v ? ' ' : 'Not yet' });
    P.region('ctx', 150, 14, 280, 118, 'Persistence context');
    P.region('db', 482, 14, 184, 118, 'member table in the DB');
    P.box('row', 494, 48, 160, 66, { cls: s && s.upd ? 'hot' : 'wait', title: 'id 1', sub: ['name: ' + (s ? s.db : 'Alice')] });
    var outside = false, pos = {};
    ['o1', 'o2'].forEach(function (k) {
      var o = s ? s[k] : null;
      if (!o) return;
      if (!o.inn) outside = true;
      P.box(k, 162, o.inn ? 48 : 158, 256, 66, { cls: s.hot === k ? 'hot' : o.inn ? 'wait' : 'plain', title: 'Member object', sub: ['name: ' + o.name, 'First value kept: ' + (o.first || 'none')] });
    });
    if (outside) P.text('out', 290, 150, 'Outside the persistence context', { cls: 'mut', anchor: 'middle' });
    if (s && s.mv) P.arrow('am', 'vm:r', s.mv + ':l:0.3', {});
    if (s && s.m2v) P.arrow('am2', 'vm2:r', s.m2v + ':l:0.7', {});
    var tgt = s && s.o2 && s.o2.inn ? 'o2' : 'o1';
    if (s && s.sel) P.arrow('sel', 'row:l:0.3', tgt + ':r:0.3', { cls: 'hot' });
    if (s && s.upd) P.arrow('upd', 'o1:r:0.7', 'row:l:0.7', { cls: 'good' });
    P.box('n1', 14, 242, 322, 36, { cls: s && s.nu ? 'good' : 'ghost', title: 'UPDATE statements sent', right: (s ? s.nu : 0) + '' });
    P.box('n2', 344, 242, 322, 36, { cls: s && s.ns ? 'wait' : 'ghost', title: 'SELECT statements sent', right: (s ? s.ns : 0) + '' });
    if (s && s.o1 && !s.o1.inn && s.o1.name === 'Bob') P.note('JPA does not know when the name of an object outside the persistence context changes.');
  },
  assume: 'This was checked against real execution on Hibernate 7.4.5 and H2 2.4.240 (in-memory database). A SessionFactory was built directly without Spring, on JDK 21. All 6 combinations were compiled and run with the lines of code on the screen exactly as they are (including the comment line). For each combination, the database and the SessionFactory were created anew, and one row (1, Alice) was put into the database with JDBC before the run. The SQL of this setup was not counted. What does not appear on the screen is the Member entity (with @Entity, an id with @Id, a name, a constructor, setName and getName) and the code that gets and closes the EntityManager, and the transaction was started and committed directly on em. What was checked against the run is the name read through another connection (plain JDBC) after the commit, the number of UPDATE and SELECT statements counted with Hibernate\'s StatementInspector (the SQL text and the lines that sent it were kept in the output of the checking run), and the m == m2 that the code printed on the screen. The facts that the step sentences rely on were also measured in a second run that inserts a measuring line right below each line of code. They are em.contains(m) (true after find, and false for an object created with new and after detach), that the UPDATE is sent not on the m.setName line but on the commit line, that when find is called again with the same id, the find combination does not add a SELECT and receives the same object whose name is already Bob even though the commit has not happened yet (and that the new and detach combinations add a SELECT and receive a new object whose name is Alice), and that Hibernate separately remembers the values from the time it read them (seen through an internal API, [Alice] after the read and no memory after detach). It was also run separately that if you change the name to Bob and then change it back to Alice before the commit, no UPDATE is sent, and this was used as the evidence that it compares with the first values, not with whether a changing call was made. It was also run that if you pass an object created with new to em.persist, em.contains becomes true and an INSERT is sent at commit. What the documentation defines is in the Jakarta Persistence 3.2 specification: Section 3.1 (each EntityManager has a persistence context, and it holds only one entity instance for any given identifier), Section 3.3 (the lifecycle of an entity instance: managed is the state of belonging to a persistence context, and detached is the state of not belonging or no longer belonging), Section 3.3.2 (becoming managed with persist), Section 3.3.4 (the state of a persistent entity is synchronized to the database at transaction commit), and Sections 3.3.6 and 3.3.7 (an instance removed from the persistence context lives on outside it). The specification page came back only as a summary, so the full original text of these sections was not read. The way of remembering the first values and comparing them, and the shape of the SQL that is sent, are not defined by the specification but are behavior observed on Hibernate 7.4.5, so the screen shows only the counts, not the SQL text. This lab has the shape of creating em directly, so it does not cover using it with Spring\'s @Transactional (where the persistence context is created and ended together with the transaction), write-behind, the flush just before a query runs, or saving a new entity with em.persist, and the details are covered in the lab "When does JPA send SQL?". A check against execution on MySQL was not done.',
});

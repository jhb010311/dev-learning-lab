Lab.register({
  id: 'ormwhy', nav: 'What JPA solves', cat: 'JPA', mode: 'step',
  title: 'When you write the SQL yourself, what do you have to fill in by hand?',
  intro: 'Java objects are linked to each other by references, while the rows of a table are linked by numbers (foreign keys). Because the shapes differ, someone has to write the code that moves the rows of a table into objects. Do the same job by writing the SQL yourself (JDBC) and with JPA (Jakarta Persistence), and compare where the two differ.',
  terms: ['ORM', 'JDBC', 'Object/relational impedance mismatch', 'JPA, Hibernate, Spring Data JPA', 'First-level cache'],
  controls: [
    { id: 'sc', label: 'Task to try', type: 'select', value: 'nav', options: [['same', 'Load the same order twice'], ['nav', 'Go from the order to its member'], ['field', 'Add one field (grade) to the member']] },
    { id: 'how', label: 'How you work with the DB', type: 'select', value: 'jdbc', options: [['jdbc', 'JDBC: you write the SQL'], ['jpa', 'JPA: you only write the mapping']] },
    { id: 'fix', label: 'I filled in the missing part with code myself', type: 'check', value: false, show: function (c) { return c.how === 'jdbc'; }, hint: 'Load twice: the code that keeps the objects already read. Go to the member: the SQL that reads the member. Add a field: changes to the SQL and to the code that moves values.' },
  ],
  presets: [
    { t: 'Default settings', d: 'The order was read with JDBC, but order.getMember() is null.', v: { sc: 'nav', how: 'jdbc', fix: false } },
    { t: 'Write the SQL that reads the member yourself', d: 'It works, but the amount of SQL and of code that moves values doubles.', v: { sc: 'nav', how: 'jdbc', fix: true } },
    { t: 'Go to the member with JPA', d: 'You wrote no SQL, yet the member name appears.', v: { sc: 'nav', how: 'jpa', fix: false } },
    { t: 'Load twice: JDBC', d: 'It is the same row, but two different objects are created.', v: { sc: 'same', how: 'jdbc', fix: false } },
    { t: 'Load twice: JPA', d: 'One SELECT, and one object.', v: { sc: 'same', how: 'jpa', fix: false } },
    { t: 'Add a field: SQL unchanged', d: 'It was saved as VIP, but the value disappears without an error.', v: { sc: 'field', how: 'jdbc', fix: false } },
    { t: 'Add a field: JPA', d: 'You only add one line to the entity.', v: { sc: 'field', how: 'jpa', fix: false } },
  ],
  code: function (c) {
    var jdbc = c.how === 'jdbc', fix = jdbc && c.fix;
    if (c.sc === 'same') {
      if (!jdbc) return '@Entity\n@Table(name = "orders")\nclass Order {\n    @Id Long id;\n    int amount;\n    @ManyToOne(fetch = FetchType.LAZY) Member member;\n}\n\n// Runs inside a transaction. We wrote no SQL at all\nOrder a = em.find(Order.class, 1L);\nOrder b = em.find(Order.class, 1L);\nSystem.out.println(a == b);';
      return 'class OrderDao {\n    Connection conn;\n' + (fix ? '    Map<Long, Order> loaded = new HashMap<>();   // keeps the objects it has read (code we added ourselves)\n' : '') + '\n    Order findById(long id) throws SQLException {\n' + (fix ? '        if (loaded.containsKey(id)) return loaded.get(id);   // code we added ourselves\n' : '') +
        '        PreparedStatement ps = conn.prepareStatement(\n            "select id, amount, member_id from orders where id = ?");\n        ps.setLong(1, id);\n        ResultSet rs = ps.executeQuery();\n        rs.next();\n        Order o = new Order();               // creates a new object on every call\n        o.setId(rs.getLong("id"));\n        o.setAmount(rs.getInt("amount"));\n' + (fix ? '        loaded.put(id, o);                   // code we added ourselves\n' : '') + '        return o;\n    }\n}\n\nOrder a = orderDao.findById(1L);\nOrder b = orderDao.findById(1L);\nSystem.out.println(a == b);';
    }
    if (c.sc === 'nav') {
      if (!jdbc) return '@Entity\n@Table(name = "orders")\nclass Order {\n    @Id Long id;\n    int amount;\n    @ManyToOne(fetch = FetchType.LAZY)   // connects the member_id column to the member object\n    Member member;\n}\n\n// Runs inside a transaction. We wrote no SQL at all\nOrder order = em.find(Order.class, 1L);\nSystem.out.println(order.getMember().getName());';
      return 'class Order {\n    Long id;\n    int amount;\n    Member member;        // in an object, we want to point to the member object directly\n}\n\nclass OrderDao {\n    Connection conn;\n\n    Order findById(long id) throws SQLException {\n        PreparedStatement ps = conn.prepareStatement(\n            "select id, amount, member_id from orders where id = ?");\n        ps.setLong(1, id);\n        ResultSet rs = ps.executeQuery();\n        rs.next();\n        Order o = new Order();\n        o.setId(rs.getLong("id"));\n        o.setAmount(rs.getInt("amount"));\n        long memberId = rs.getLong("member_id");   // the table has only the member number\n' +
        (fix ? '        PreparedStatement ps2 = conn.prepareStatement(\n            "select id, name from member where id = ?");   // SQL we wrote in addition\n        ps2.setLong(1, memberId);\n        ResultSet rs2 = ps2.executeQuery();\n        rs2.next();\n        Member m = new Member();\n        m.setId(rs2.getLong("id"));\n        m.setName(rs2.getString("name"));\n        o.setMember(m);                            // turns the number into an object and links it\n' : '        // There is no code that creates a member object and sets it. o.member stays null\n') +
        '        return o;\n    }\n}\n\nOrder order = orderDao.findById(1L);\nSystem.out.println(order.getMember().getName());';
    }
    var use = '\n\nMember m = new Member();\nm.setId(2L);\nm.setName("Carol");\nm.setGrade("VIP");\n';
    if (!jdbc) return '@Entity\nclass Member {\n    @Id Long id;\n    String name;\n    String grade;         // the newly added field. This one line is all we changed\n}' + use + 'em.persist(m);\nem.getTransaction().commit();\nem.close();\n\nEntityManager em2 = emf.createEntityManager();   // read again from the DB with a new em\nMember r = em2.find(Member.class, 2L);\nSystem.out.println(r.getGrade());';
    return 'class Member {\n    Long id;\n    String name;\n    String grade;         // the newly added field (we also added a grade column to the table)\n}\n\nclass MemberDao {\n    Connection conn;\n\n    void save(Member m) throws SQLException {\n        PreparedStatement ps = conn.prepareStatement(\n' +
      (fix ? '            "insert into member (id, name, grade) values (?, ?, ?)");   // change #1\n' : '            "insert into member (id, name) values (?, ?)");   // unchanged from before the field was added\n') + '        ps.setLong(1, m.getId());\n        ps.setString(2, m.getName());\n' + (fix ? '        ps.setString(3, m.getGrade());                                  // change #2\n' : '') + '        ps.executeUpdate();\n    }\n\n    Member findById(long id) throws SQLException {\n        PreparedStatement ps = conn.prepareStatement(\n' +
      (fix ? '            "select id, name, grade from member where id = ?");         // change #3\n' : '            "select id, name from member where id = ?");      // unchanged from before the field was added\n') + '        ps.setLong(1, id);\n        ResultSet rs = ps.executeQuery();\n        rs.next();\n        Member m = new Member();\n        m.setId(rs.getLong("id"));\n        m.setName(rs.getString("name"));\n' + (fix ? '        m.setGrade(rs.getString("grade"));                              // change #4\n' : '') + '        return m;\n    }\n}' + use + 'memberDao.save(m);\nMember r = memberDao.findById(2L);\nSystem.out.println(r.getGrade());';
  },
  label: function (c) { return { same: 'Load twice', nav: 'Go to the member', field: 'Add a field' }[c.sc] + ' · ' + (c.how === 'jpa' ? 'JPA' : 'JDBC' + (c.fix ? ' (filled in by hand)' : '')); },
  columns: ['SQL written in the code', 'SQL sent to the DB', 'What was checked', 'Result'],
  simulate: function (c) {
    var jdbc = c.how === 'jdbc', fix = jdbc && !!c.fix, ev = [], sum = [], trace = [], written = 0;
    var st = { objs: [], refs: [], sent: [], rows: [{ id: 'o1', t: 'orders row 1', r: 'member_id = 1' }, { id: 'm1', t: 'member row 1', r: 'name = Alice' }], flow: null, res: '?' };
    var by = jdbc ? 'Written by hand' : 'Generated by JPA';
    function push(s, k) { ev.push({ s: s, k: k, snap: JSON.parse(JSON.stringify(st)) }); st.flow = null; }
    function line(key) { trace.push([key, []]); }
    // kind: the kind of the SQL and its table, as in 'select orders'. text is the SQL shown on the screen
    function send(kind, text) { trace[trace.length - 1][1].push(kind); st.sent.push({ sql: text, by: by }); st.flow = { label: kind.split(' ')[0].toUpperCase() + ' (' + (jdbc ? 'by hand' : 'by JPA') + ')', to: kind.split(' ')[1] === 'orders' ? 'o1' : c.sc === 'field' ? 'm2' : 'm1', write: kind.indexOf('insert') === 0 }; }
    var check, res;
    if (c.sc === 'same') {
      check = 'a == b'; written = jdbc ? 1 : 0;
      line('find1'); send('select orders', 'select ... from orders where id = 1'); st.objs.push({ id: 'a', t: 'a → Order object', s: 'id 1 · amount 30000', cls: 'wait' });
      if (jdbc) push('orderDao.findById(1L) #1: ' + (fix ? 'There is no stored object yet, so ' : '') + 'it sends the SELECT we wrote and reads row 1 of orders. It copies the values it read, one by one, into an object created with new Order(), and returns it as a.' + (fix ? ' Before returning it, it also puts the object in a Map named loaded.' : ''), '');
      else push('em.find(Order.class, 1L) #1: JPA builds a SELECT and sends it, creates an Order object from the row it read, and returns it as a. This object is also kept in the persistence context (the first-level cache).', '');
      line('find2');
      if (jdbc && !fix) {
        send('select orders', 'select ... from orders where id = 1'); st.objs.push({ id: 'b', t: 'b → another Order object', s: 'id 1 · amount 30000', cls: 'bad' });
        push('orderDao.findById(1L) #2: The same SELECT is sent once more. findById calls new Order() every time, so a second object b is created from the same row.', 'bad');
      } else {
        st.objs[0].t = 'a, b → the same Order object'; st.objs[0].cls = 'good';
        push(jdbc ? 'orderDao.findById(1L) #2: The Map named loaded already has order 1, so it sends no SQL and returns the stored object as it is. This is the work of the code we added ourselves.' : 'em.find(Order.class, 1L) #2: Order 1 is already in the persistence context. It sends no SQL and returns the stored object as it is.', 'good');
      }
      res = String(!(jdbc && !fix)); st.res = res;
      push('a == b is ' + res + '. ' + (res === 'true' ? 'a and b point to the same object in memory. If you change the amount through a, the changed value is also visible when you read it through b.' : 'Both are order 1, but memory holds separate objects. If you change the amount through a, b keeps the old value, and the code itself has to keep track of which one is correct.'), res === 'true' ? 'good' : 'bad');
      if (jdbc && !fix) sum.push('In a table, rows with the same primary key are the same row. An object is a different object each time you use new. When you write the code that moves rows into objects yourself, this difference shows up as it is.');
      if (fix) sum.push('You added code that keeps the objects you have read in a Map, and got the same result as JPA. But you have to decide and manage everything yourself: when to empty this Map, and whether to put the same code in the DAOs of the other tables too.');
      if (!jdbc) sum.push('Within one persistence context, JPA always returns the same object for entities with the same primary key. It is as if JPA already has the storage that you had to build yourself with JDBC.');
    }
    if (c.sc === 'nav') {
      check = 'order.getMember().getName()'; written = jdbc ? (fix ? 2 : 1) : 0;
      line('find'); send('select orders', 'select ... from orders where id = 1');
      st.objs.push({ id: 'a', t: 'order → Order object', s: jdbc ? 'member: null' : 'member → member 1 (not read yet)', cls: 'wait' });
      if (jdbc) push('orderDao.findById(1L): The SELECT we wrote reads row 1 of orders and copies id and amount into the object. The row has only the number of the member (member_id = 1), not the name of the member.' + (fix ? '' : ' There is no code that creates a member object and sets it, so the member field of order stays null.'), fix ? '' : 'bad');
      else push('em.find(Order.class, 1L): JPA builds a SELECT and reads row 1 of orders. The fetching is lazy (LAZY), so it does not read the member yet. It puts an empty object (a proxy) that stands for "member 1" in the member field.', '');
      if (fix) {
        send('select member', 'select id, name from member where id = 1'); st.objs[0].s = 'member → Member object'; st.objs.push({ id: 'b', t: 'Member object', s: 'id 1 · name Alice', cls: 'wait' }); st.refs.push(['a', 'b']);
        push('Inside the same findById: The second SELECT we wrote reads row 1 of member. It copies the values into new Member() and links it to the order object with o.setMember(m). The code itself did the work of turning a number into an object reference.', '');
      }
      line('name');
      if (jdbc && !fix) {
        res = 'NullPointerException'; st.res = res;
        push('order.getMember().getName(): getMember() returns null. getName() was called on null, so a NullPointerException is thrown.', 'bad');
        sum.push('Objects are navigated by references such as order.getMember(), while tables are linked by numbers such as member_id. When you write the SQL yourself, an object is filled in only as far as the SQL you read. To use the member too, you have to write more SQL that reads the member and more code that moves the values.');
      } else {
        if (!jdbc) { send('select member', 'select ... from member where id = 1'); st.objs[0].s = 'member → Member object'; st.objs.push({ id: 'b', t: 'Member object', s: 'id 1 · name Alice', cls: 'good' }); st.refs.push(['a', 'b']); }
        res = 'Alice'; st.res = res;
        push(jdbc ? 'order.getMember().getName(): findById has already filled in the member object, so "Alice" appears. No SQL is sent on this line.' : 'order.getMember().getName(): At the moment the name is needed, JPA builds and sends a SELECT that reads the member, and fills in the empty object. "Alice" appears.', 'good');
        if (jdbc) sum.push('You solved it with one more SQL statement and more code to move values. But now findById always sends two SELECTs, even for a screen that does not need the member. You end up making separate methods depending on whether to read the member, and this kind of code grows as the number of associated objects grows.');
        else sum.push('You only told JPA with one line, @ManyToOne, that "the member_id column is connected to the Member object", and when you follow the reference, JPA builds and sends the SQL that is needed. JPA takes care of the conversion between a foreign key (a number) and an object reference.', 'The SQL has not disappeared. It is only sent where you cannot see it, so if you take the members of many orders one after another, that many SELECTs are sent (the N+1 lab covers this).');
      }
    }
    if (c.sc === 'field') {
      check = 'grade read back'; written = jdbc ? 2 : 0;
      var saved = !jdbc || fix;
      st.objs.push({ id: 'a', t: 'm → Member object', s: 'id 2 · Carol · grade VIP', cls: 'wait' });
      push('new Member() and the setters: A member object m was created in memory. "VIP" was put in the newly added field grade. Nothing has happened with the DB yet.', '');
      if (jdbc) {
        line('save'); send('insert member', fix ? "insert into member (id, name, grade) values (2, 'Carol', 'VIP')" : "insert into member (id, name) values (2, 'Carol')");
        st.rows.push({ id: 'm2', t: 'member row 2', r: 'grade = ' + (fix ? 'VIP' : 'NULL'), cls: fix ? 'good' : 'bad' });
        push('memberDao.save(m): ' + (fix ? 'The changed INSERT sends grade too. This is because you changed two places: the SQL statement and the ps.setString(3, ...) line.' : 'The INSERT statement is exactly as it was before the field was added, so it sends only id and name. The grade value "VIP" of the object cannot reach the DB, and the grade column becomes NULL. No error occurs.'), fix ? '' : 'bad');
        line('read'); send('select member', fix ? 'select id, name, grade from member where id = 2' : 'select id, name from member where id = 2');
        st.objs.push({ id: 'b', t: 'r → Member object read again', s: 'id 2 · Carol · grade ' + (fix ? 'VIP' : 'null'), cls: fix ? 'good' : 'bad' });
        push('memberDao.findById(2L): ' + (fix ? 'The changed SELECT also reads the grade column, and m.setGrade(...) moves it into the object.' : 'The SELECT statement is also unchanged, so it reads only id and name. Nobody fills in the grade of the new object r, so it is null.'), fix ? '' : 'bad');
      } else {
        line('persist');
        push('em.persist(m): hands m over to the persistence context. No SQL is sent on this line.', '');
        line('commit'); send('insert member', "insert into member (grade, name, id) values ('VIP', 'Carol', 2)"); st.rows.push({ id: 'm2', t: 'member row 2', r: 'grade = VIP', cls: 'good' });
        push('commit: JPA looks at the list of fields of the Member entity and builds the INSERT. Because the grade field was added, the INSERT contains grade too.', '');
        line('read'); send('select member', 'select id, grade, name from member where id = 2'); st.objs.push({ id: 'b', t: 'r → Member object read again', s: 'id 2 · Carol · grade VIP', cls: 'good' });
        push('em2.find(Member.class, 2L): Reads again from the DB with a new EntityManager. The SELECT that JPA built also contains grade, and the value it read is filled into the grade field of the object.', '');
      }
      res = saved ? 'VIP' : 'null (also NULL in the DB)'; st.res = saved ? 'VIP' : 'null';
      push('r.getGrade(): ' + (saved ? '"VIP" appears.' : 'null appears. The "VIP" that you put in when saving remains nowhere.'), saved ? 'good' : 'bad');
      if (jdbc && !fix) sum.push('Even if you add a field to the class, the SQL does not change by itself. SQL that you did not change keeps working without an error, but without that field, so the value silently disappears. It is hard to notice unless you check with a test.');
      if (fix) sum.push('While adding one field, you changed four more places: the INSERT statement, the line that sets the value, the SELECT statement, and the line that reads the value. If there is an UPDATE statement or another query method, the places to change grow accordingly. If you miss even one, the value disappears, as when "I filled in the missing part with code myself" is off.');
      if (!jdbc) sum.push('JPA builds the INSERT and the SELECT from the list of fields of the entity. So when you add a field, it goes into the SQL by itself. The places to change shrink to one line in the entity.', 'Adding the grade column to the table has to be done separately in either approach.');
    }
    var cnt = {}, order = [];
    trace.forEach(function (t) { t[1].forEach(function (k) { var w = k.split(' ')[0].toUpperCase(); if (!cnt[w]) { cnt[w] = 0; order.push(w); } cnt[w]++; }); });
    var sentText = order.map(function (w) { return w + ': ' + cnt[w]; }).join(', ');
    sum.unshift('SQL statements written in the code: ' + written + '. SQL statements sent to the DB: ' + sentText + '. Result of ' + check + ': ' + res + '.');
    return { events: ev, summary: sum, written: written, trace: trace.map(function (t) { return t[0] + ':' + t[1].join(','); }).join('; '), row: [String(written), sentText, check, res] };
  },
  render: function (v, sim, t, H, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : null;
    if (!s) { H.text(v, 'Press Run to go one line at a time.'); return; }
    H.counters(v, [[sim.written, 'SQL written in the code'], [s.sent.length, 'SQL sent to the DB'], [s.res, sim.row[2]]]);
    H.table(v, ['Variable → object', 'Value it holds'], s.objs.map(function (o) { return { cells: [o.t, { v: o.s, cls: o.cls === 'bad' ? 'bad' : o.cls === 'good' ? 'good' : '' }] }; }), 'Java objects in memory');
    if (s.sent.length) H.table(v, ['#', 'SQL', 'Written by'], s.sent.map(function (q, i) { return { cells: [String(i + 1), { v: q.sql, cls: i === s.sent.length - 1 && s.flow ? 'hot' : '' }, q.by] }; }), 'SQL sent to the DB');
    else { H.title(v, 'SQL sent to the DB'); H.text(v, 'None yet.'); }
    H.table(v, ['Row', 'Value'], s.rows.map(function (r) { return { cells: [r.t, { v: r.r, cls: r.cls || '' }] }; }), 'Tables in the DB');
  },
  // Diagram: the Java objects in memory on the left, the rows of the DB tables on the right. An arrow appears in the middle only in a step where SQL is sent, and it says who wrote that SQL.
  draw: function (P, sim, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : { objs: [], refs: [], sent: [], rows: [{ id: 'o1', t: 'orders row 1', r: 'member_id = 1' }, { id: 'm1', t: 'member row 1', r: 'name = Alice' }], flow: null, res: '?' };
    P.size(680, 300);
    P.region('heap', 16, 16, 284, 200, 'Java objects in memory');
    P.region('db', 444, 16, 220, 200, 'Tables in the DB');
    if (!s.objs.length) P.box('none', 28, 52, 260, 50, { cls: 'ghost', sub: 'No objects yet', center: true });
    s.objs.forEach(function (o, i) { P.box('obj_' + o.id, 28, 52 + i * 90, 260, 50, { cls: o.cls, title: o.t, sub: o.s }); });
    s.refs.forEach(function (r, i) { P.arrow('ref' + i, 'obj_' + r[0] + ':b', 'obj_' + r[1] + ':t', { cls: 'good', label: 'reference' }); });
    s.rows.forEach(function (r, i) { P.box('row_' + r.id, 456, 52 + i * 52, 196, 40, { cls: r.cls || 'plain', title: r.t, sub: r.r }); });
    if (s.flow) P.arrow('sql', s.flow.write ? 'heap:r' : 'row_' + s.flow.to + ':l', s.flow.write ? 'row_' + s.flow.to + ':l' : 'heap:r', { cls: 'hot', label: s.flow.label });
    P.box('r1', 16, 236, 210, 40, { cls: sim.written ? 'hot' : 'good', title: 'SQL you wrote', right: String(sim.written) });
    P.box('r2', 234, 236, 430, 40, { cls: s.res === '?' ? 'ghost' : /^(false|null|NullPointerException)$/.test(s.res) ? 'bad' : 'good', title: sim.row[2], right: s.res });
    P.note('The arrow in the middle means that SQL was sent to the DB in this step, and it also says who wrote that SQL. A row in a table points to another row by a number (member_id), and an object points to another object by a reference. The difference between the two approaches is whether you write the code that bridges this gap yourself or leave it to JPA.');
  },
  assume: 'All 12 combinations were actually run and checked on the PC used to write this lab (the JDBC side ran DAO code with the same structure as on the screen against an H2 database, and the JPA side ran on Hibernate 7.4.5 and H2). What was checked: the number of SQL statements written in the code, the kind and the table of the SQL sent on each line, the value of a == b, the member name or the exception, and the grade read back and the grade left in the DB. The "filled in by hand" setting has meaning only for JDBC, and for JPA it does not affect the result. The SQL statements on the screen are shortened to be easy to read, and the statements that Hibernate actually builds differ in column order and aliases. The @ManyToOne of JPA was set to lazy fetching (LAZY). With the default, eager fetching (EAGER), a single em.find reads the order and the member together. The amount of JDBC code is based on the DAO in this example. If you use Spring\'s JdbcTemplate or MyBatis, the repeated code shrinks, but it stays the same that you write the SQL yourself and have to change the SQL together when a field changes. "Four places to change" is counted in the code on the screen.',
});

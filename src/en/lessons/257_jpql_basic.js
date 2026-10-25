Lab.register({
  id: 'jpql_basic', nav: 'JPQL', cat: 'Fundamentals', mode: 'step', basic: true, deep: ['fetchjoin', 'bulk', 'dynquery'],
  title: 'What is JPQL, and how is it different from SQL?',
  why: 'If you write SQL directly as text, table and column names spread throughout the code, and moving the returned rows into objects must be done by hand. JPQL lets you write conditions with the entity class and field names used in Java code, and JPA takes care of converting to SQL and of making entity objects from the results.',
  use: 'It is used for queries other than finding a single record by its ID, such as finding a list that matches a condition, sorting, and counting. In Spring Data JPA, JPQL is written in the @Query annotation above a repository method. When a feature that exists only in a particular DB is truly needed, nativeQuery = true is added to @Query and SQL is written directly.',
  intro: 'em.find finds only one entity, by one primary key. To find several by a condition, such as all members who are 20 or older, you have to write a query (text that asks the database), and in JPA you write that query in a language called JPQL. JPQL looks like SQL, but you write it with the names of entity classes and fields, not tables and columns. The Member class on the screen is paired with the member_tbl table by @Table, and its name field is paired with the user_name column by @Column, so the two names are different. When em.createQuery passes to JPA the text that the jpql variable refers to, JPA reads that text. When you call query.getResultList(), JPA turns the JPQL into SQL, sends it to the database, builds Member objects from the rows that come back, and returns a list of those objects. In this lab you change the name that you write in JPQL from an entity name to a table name and to a column name, run the same code each time, and see the SQL that was sent to the database, what came back in list, and the error.',
  terms: ['JPQL', 'em.createQuery and getResultList', 'Entity names and field names', '@Table'],
  controls: [
    { id: 'q', label: 'JPQL assigned to the jpql variable', type: 'select', value: 'ok', options: [
      ['ok', 'select m from Member m where m.age >= 20'],
      ['table', 'select m from member_tbl m where m.age >= 20 (uses the table name)'],
      ['col', "select m from Member m where m.user_name = 'kim' (uses the column name)"],
      ['field', "select m from Member m where m.name = 'kim' (uses the field name)"]] },
  ],
  // q is the question shown on the question-style screen. t and d are the name and the description used in the text-only reading
  presets: [
    { t: 'Default settings', q: 'What does JPQL look like, and when you look for members who are 20 or older, what is sent to the database and what comes back?', d: 'JPQL that uses Member and age. JPA turns it into SQL and sends it to the database, and builds 2 Member objects from the rows that come back.', v: { q: 'ok' } },
    { t: 'If you write the table name', q: 'What if you write the table name (member_tbl) after from, instead of the entity name Member?', d: 'JPA cannot find an entity called member_tbl, so an error occurs on the createQuery line. Nothing is sent to the database.', v: { q: 'table' } },
    { t: 'If you write the column name', q: "What if you write the column name (user_name) in the condition, instead of the field name?", d: 'Member has no field called user_name, so an error occurs on the createQuery line.', v: { q: 'col' } },
    { t: 'If you write the field name', q: "What if you write the field name (name) in the condition, instead of the column name?", d: 'JPA turns the name field into the user_name column and builds the SQL. The one member, kim, who meets the condition comes back as a Member object.', v: { q: 'field' } },
  ],
  // The code on the screen and the source that the checking program (verify/spring/src/JpqlBasicProbe.java) compiled and ran are the same text (the checking script compares them down to the letter).
  code: function (c) {
    var j = { ok: 'select m from Member m where m.age >= 20', table: 'select m from member_tbl m where m.age >= 20', col: "select m from Member m where m.user_name = 'kim'", field: "select m from Member m where m.name = 'kim'" }[c.q];
    return ['@Entity', '// Table: one Member class is paired with one member_tbl table', '@Table(name = "member_tbl")', 'public class Member {', '    @Id', '    private Long id;', '',
      '    // Column: the name field is paired with the user_name column', '    @Column(name = "user_name")', '    private String name;', '', '    private int age;', '}', '',
      '// The side that queries: lines inside a method (em, class, and method declarations and imports omitted)', '// JPQL: the query text that JPA reads', 'String jpql = "' + j + '";', 'TypedQuery<Member> query = em.createQuery(jpql, Member.class);', 'List<Member> list = query.getResultList();'].join('\n');
  },
  label: function (c) { return { ok: 'Member, m.age (entity and field names)', table: 'member_tbl (table name)', col: 'm.user_name (column name)', field: 'm.name (field name)' }[c.q]; },
  columns: ['SQL sent to the database', 'What came back', 'Error'],
  // Values obtained by real execution in this setting (Hibernate 7.4.5, H2): the SQL that was sent, the members that came back, and the kind and first part of the message of the error
  facts: {
    ok: { sql: 'select m1_0.id,m1_0.age,m1_0.user_name from member_tbl m1_0 where m1_0.age>=20', got: ['kim', 'park'] },
    field: { sql: "select m1_0.id,m1_0.age,m1_0.user_name from member_tbl m1_0 where m1_0.user_name='kim'", got: ['kim'] },
    table: { ex: 'UnknownEntityException', msg: "Could not resolve root entity 'member_tbl'" },
    col: { ex: 'UnknownPathException', msg: "Could not resolve attribute 'user_name' of 'Member'" },
  },
  simulate: function (c) {
    var q = c.q, f = this.facts[q], ev = [], sum = [], bad = q === 'table' || q === 'col';
    var rows = [{ id: 1, n: 'kim', a: 25 }, { id: 2, n: 'lee', a: 17 }, { id: 3, n: 'park', a: 30 }];
    var jtext = { ok: 'select m from Member m where m.age >= 20', table: 'select m from member_tbl m where m.age >= 20', col: "select m from Member m where m.user_name = 'kim'", field: "select m from Member m where m.name = 'kim'" }[q];
    // State: cur is the line being run now (l1 to l3), done is the lines that have finished running, jl is the text of the JPA box, jc is its color, sent is whether SQL was sent, back is the ids of the rows that came back, nsql is the number of SQL statements sent, nobj is the number of objects received in list, err is whether an error occurred
    var st = { cur: '', done: { l1: false, l2: false, l3: false }, jl: ['(Hibernate)', 'Waiting'], jc: '', sent: false, back: [], nsql: 0, nobj: 0, err: false, madeq: false };
    function push(s, k) { ev.push({ s: s, k: k, snap: JSON.parse(JSON.stringify(st)) }); }

    // 0. Setup
    push('The database setup: before the code runs, the database has a member_tbl table, and it holds three rows: (id 1, user_name kim, age 25), (id 2, user_name lee, age 17), and (id 3, user_name park, age 30). The Member class on the screen is paired with this table. @Table sets the table name member_tbl, and @Column sets the column name user_name for the name field. em in the code is an EntityManager, the object that gives work to JPA. The em.find method finds only one row by one primary key (id), so to find several by a condition, such as all members who are 20 or older, you have to use a query.', '');

    // 1. The jpql variable
    st.cur = 'l1'; st.done.l1 = true;
    var what = q === 'ok' ? 'In this text, Member is the name of the class we wrote, and m.age is the age field of that class.'
      : q === 'table' ? 'In this text, what is written after from is not the class name Member but the table name member_tbl of the database.'
      : q === 'col' ? 'In the condition of this text, what is written is not the field name of the Member class but the column name user_name of the database.'
      : 'In this text, Member is the name of the class we wrote, and m.name is the name field of that class.';
    push('String jpql = "' + jtext + '": the query written in JPQL is written as text, and the jpql variable refers to that text. It is still only text, so neither JPA nor the database has read this text, and no SQL has been sent. ' + what, '');

    // 2. createQuery
    st.cur = 'l2'; st.done.l2 = true;
    if (bad) {
      st.err = true; st.jc = 'bad'; st.jl = ['(Hibernate)', 'Reading the text', 'Error'];
      push('TypedQuery<Member> query = em.createQuery(jpql, Member.class): em passes the jpql text to JPA, and while reading the text, JPA checks the names that are written. ' + (q === 'table'
        ? 'It looks up whether member_tbl after from is the name of an entity that JPA knows, and there is no such entity. The name of an entity is by default the class name, so it is Member, and the table name member_tbl is not a name that JPQL recognizes.'
        : 'It looks up whether m.user_name in the condition is a field of the Member class, and Member has no field called user_name. user_name is the column name of the database that the name field is paired with, and a column name is not a name that JPQL recognizes.')
        + ' An IllegalArgumentException is thrown, and the message of ' + f.ex + ', attached as its cause, begins with ' + f.msg + '. The error occurred on this line, not on a line that sends SQL to the database, and nothing was sent to the database.', 'bad');
      st.cur = '';
      push('An exception was thrown, so the next line, List<Member> list = query.getResultList(), is not run. Neither the query variable nor the list variable received a value. SQL statements sent: 0, and Member objects received in list: 0.', 'bad');
    } else {
      st.jc = 'hot'; st.jl = ['(Hibernate)', 'Reading the text', 'Checking names'];
      st.madeq = true;
      push('TypedQuery<Member> query = em.createQuery(jpql, Member.class): em passes the jpql text to JPA, and while reading the text, JPA checks the names that are written. Member is the name of an entity that JPA knows (the name of an entity is by default the class name), and ' + (q === 'ok' ? 'm.age is a field of that entity' : 'm.name is a field of that entity') + '. All the names are right, so JPA makes a query object, and the variable query refers to it. SQL statements sent up to this line: 0. A query object was made, and the database has not been asked yet.', '');

      // 3. getResultList: SQL is sent
      st.cur = 'l3'; st.done.l3 = true; st.sent = true; st.nsql = 1; st.jl = ['(Hibernate)', 'Making SQL', 'Sending to DB']; st.jc = 'hot';
      push('List<Member> list = query.getResultList(): now JPA turns the JPQL into SQL and sends it to the database. The SQL that Hibernate 7.4.5 built and sent in this run is "' + f.sql + '". Member in the JPQL has become the table name member_tbl, and ' + (q === 'ok' ? 'm.age in the condition has become the column name age' : 'm.name in the condition has become the column name user_name') + '. This SQL is not in the code we wrote, and JPA did the work of turning JPQL into SQL. The text of the SQL can differ by Hibernate version.', '');

      // 4. The rows come back as objects
      var want = f.got, ids = rows.filter(function (r) { return want.indexOf(r.n) >= 0; }).map(function (r) { return r.id; });
      st.back = ids; st.nobj = ids.length; st.jl = ['(Hibernate)', 'Building', 'Member objects']; st.jc = 'good'; st.cur = '';
      push('The database returns the rows that meet the condition, ' + ids.length + ' in all (' + want.join(', ') + '), and for each row JPA builds a Member object and fills the values of the columns into the fields. The value of the user_name column goes into the name field. A list of these objects comes back, and the variable list refers to it. What came back is not rows but objects of the Member class (' + ids.length + ' in all), and in this run the class of every object received in list was Member.' + (q === 'ok' ? ' lee, who is 17, does not meet the condition and did not come back.' : ' lee and park, who do not meet the condition, did not come back.'), 'good');
    }

    // Summary: the first line is the answer to the question
    if (q === 'ok') {
      sum.push('JPQL is a query that looks like SQL but is written with the names of an entity class (Member) and its field (age), not tables and columns. JPA turned this text into SQL and sent it to the database, and the 2 rows that came back became 2 Member objects and were put in list.');
      sum.push('Unlike em.find, it found several by a condition. Member, written in the query, became member_tbl in the SQL. The name that you write in a query can differ from the name in the database, and what links the two is @Table and @Column.');
    } else if (q === 'table') {
      sum.push('If you write the table name member_tbl in JPQL, JPA cannot find an entity of that name, and an error occurs. The error occurred not on the line that asks the database but on the createQuery line that makes the query, and no SQL was ever sent to the database.');
      sum.push('After from in JPQL, you write an entity name, not a table name. The entity name is by default the class name, Member. In SQL, from member_tbl is right, but in JPQL it is wrong.');
    } else if (q === 'col') {
      sum.push('If you write the column name user_name in JPQL, an error occurs because Member has no such field. The error occurred on the createQuery line, and no SQL was ever sent to the database.');
      sum.push('In the condition of JPQL, you write a field name, not a column name. user_name is the name of the column in the database, and the name by which the Java class calls it is name. When the two differ, a name that is right in SQL is wrong in JPQL.');
    } else {
      sum.push('If you write the field name name in the condition of JPQL, it runs without an error. JPA turned the name field into the column name user_name and built the SQL and sent it to the database, and the 1 row that came back (kim) became 1 Member object and was put in list.');
      sum.push('Unlike user_name, which caused an error earlier, name is the name of a field of the Member class. In JPQL you write the Java-side name, and JPA does the work of changing it into the column name.');
    }
    var row;
    if (bad) row = ['Not sent', 'Nothing (list could not be made)', 'IllegalArgumentException on the createQuery line (' + (q === 'table' ? 'no entity called member_tbl was found' : 'Member has no field called user_name') + ')'];
    else row = [f.sql, 'Member objects: ' + f.got.length + ' (' + f.got.join(', ') + ')', 'None'];
    return { events: ev, summary: sum, row: row, rows: rows };
  },
  render: function (v, sim, t, H, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : null;
    if (!s) { H.text(v, 'Click Run to start from the member_tbl table in the database holding three rows.'); return; }
    H.table(v, ['Name written in JPQL', 'Name it becomes in SQL'], [
      { cls: '', cells: ['Member (entity name)', 'member_tbl (table name)'] },
      { cls: '', cells: ['name (field name)', 'user_name (column name)'] },
      { cls: '', cells: ['age (field name)', 'age (column name)'] }], 'Paired names');
    H.table(v, ['member_tbl in the database', 'user_name', 'age', 'Came back in list'], sim.rows.map(function (r) {
      var back = s.back.indexOf(r.id) >= 0;
      return { cls: '', cells: ['id ' + r.id, r.n, String(r.a), back ? { v: 'Member object', cls: 'good' } : (s.nobj || s.err ? { v: 'Did not come back', cls: '' } : '-')] };
    }), 'Rows in the database');
    H.counters(v, [[s.nsql, 'SQL statements sent'], [s.nobj, 'Member objects received in list']]);
  },
  // Diagram: on the left, the three lines of code (the jpql variable, createQuery, getResultList); in the middle, JPA; on the right, the three rows in the database. When an error occurs, it stops before JPA and the arrow to the database side does not appear. When SQL is sent, an arrow appears from JPA to the database, and an arrow from the returned rows to JPA.
  draw: function (P, sim, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : null;
    P.size(680, 292);
    P.region('lc', 14, 12, 206, 218, 'Code we wrote');
    P.region('rc', 460, 12, 206, 218, 'member_tbl table in the database');
    function line(id, y, title, sub) {
      var cur = s && s.cur === id, done = s && s.done[id], failed = s && s.err && id === 'l2';
      P.box(id, 24, y, 186, 54, { cls: cur ? (failed ? 'bad now' : 'hot now') : failed ? 'bad' : done ? 'good' : 'plain', title: title, sub: sub });
    }
    line('l1', 36, '1. JPQL text', 'String jpql');
    line('l2', 96, '2. Make the query', 'em.createQuery');
    line('l3', 156, '3. Run the query', 'query.getResultList');
    P.box('jpa', 280, 36, 140, 174, { cls: !s ? 'ghost' : s.jc || 'plain', title: 'JPA', sub: s ? s.jl : [' '] });
    sim.rows.forEach(function (r, i) {
      var back = s && s.back.indexOf(r.id) >= 0;
      P.box('r' + r.id, 470, 36 + i * 60, 186, 54, { cls: back ? 'good' : 'plain', title: 'id ' + r.id + ' · ' + r.n, sub: 'age ' + r.a });
    });
    if (s && s.cur === 'l2') P.arrow('a2', 'l2:r', 'jpa:l:0.4', { cls: s.err ? 'bad' : 'hot' });
    if (s && s.cur === 'l3') P.arrow('a3', 'l3:r', 'jpa:l:0.75', { cls: 'hot' });
    if (s && s.sent) P.arrow('sql', 'jpa:r:0.15', 'r1:l:0.5', { cls: 'hot' });
    if (s) s.back.forEach(function (id, i) { P.arrow('ret' + id, 'r' + id + ':l:0.5', 'jpa:r:' + (0.45 + i * 0.3), { cls: 'good' }); });
    P.box('n1', 14, 244, 322, 36, { cls: s && s.nsql ? 'wait' : 'ghost', title: 'SQL sent to the DB', right: (s ? s.nsql : 0) + '' });
    P.box('n2', 344, 244, 322, 36, { cls: s && s.nobj ? 'good' : 'ghost', title: 'Member objects received in list', right: (s ? s.nobj : 0) + '' });
  },
  assume: 'This was checked against real execution with JDK 21 on Hibernate 7.4.5 and H2 2.4.240 (in-memory database). Spring was not used, and Hibernate was started directly in code (the classes were registered in Configuration, and the tables were created with hbm2ddl.auto=create-drop). All 4 combinations were compiled and run with the code on the screen exactly as it is. The Member class on the screen was made into Member.java with only the import lines added, and the four lines of "The side that queries" were put in as the body of a method that receives an EntityManager. What does not appear on the screen is the import lines, the database connection settings, and the code that gets and closes the EntityManager, and since this lab only reads, no transaction was started. For each combination, the database was created anew, and before the run, three rows ((1, kim, 25), (2, lee, 17), (3, park, 30)) were put into member_tbl with JDBC. The SQL of this setup was not counted. What was checked is whether an error occurred and on which line (the line of code was found from the stack trace), the kind and the message of the exception, the text and the number of the SQL captured with Hibernate\'s StatementInspector and the line that sent that SQL, and the size of the list that came back and the class and the values of its elements. The facts that the step sentences rely on were also measured in a second run that inserts a measuring line right below each line of code. They are that the SQL sent was 0 after passing the jpql variable and the createQuery line and 1 after passing the getResultList line, that in the two combinations that cause an error, the error occurs on the createQuery line, the next line is not run, and no SQL is ever sent, and that the class of the objects that came back is Member as it is. What the documentation defines is section 4.1 of the Jakarta Persistence 3.2 specification (JPQL is the language of dynamic queries written as strings), section 4.3 (the targets of a query are the abstract schema types of entities and embeddables), section 4.3.1 (in a query string an entity is referred to by its entity name, and the name is the name of @Entity, and the default is the unqualified name of the entity class), the API documentation of EntityManager.createQuery, TypedQuery.getResultList, Table, and EntityManager.find (createQuery throws IllegalArgumentException if the query string is wrong, getResultList runs a SELECT query and returns a list, the name of @Table defaults to the entity name, and find finds one by the primary key), and section 1.1 of the Hibernate Query Language guide (in HQL and JPQL you cannot refer to tables and columns directly, and you refer to entity classes and their fields). The specification page came back only as a summary, so only the sentences of the relevant sections were checked, and the sections were not read in full. What the documentation does not define and was observed in this version is that reading the JPQL and checking the names happens on the createQuery line (the error occurred on that line), that the SQL is sent on the getResultList line, the kind and the message of the exception of the error, and the text of the SQL that was sent (the alias m1_0 and so on). These texts can differ by Hibernate version. The run was not checked against MySQL. This lab does not cover joins and fetch joins, bulk queries that do UPDATE and DELETE, dynamic queries whose conditions change, parameter binding, or the several ways to receive results, and these are covered in the Learn-tab labs "JPQL and fetch joins", "Bulk update and delete operations", and "Dynamic queries: Specification and Querydsl".',
});

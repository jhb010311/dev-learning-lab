Lab.register({
  id: 'entity_basic', nav: 'Entities', cat: 'Fundamentals', mode: 'step', basic: true, deep: ['mapping'],
  title: 'What is an entity, and how does it differ from an ordinary class?',
  intro: 'An entity is a Java class that is paired with a database table, and one object of it is paired with one row of the table. In code, it is an ordinary Java class declared with class, and it differs from an ordinary class in two places. @Entity above the class is a marker that objects of this class are stored in a table, and @Id above a field is a marker that this field is the primary key (the column that tells rows apart). With these two, JPA (Jakarta Persistence, here Hibernate) looks at the fields of the class and pairs them with the columns of the table, and when you pass an object to em.persist, it builds the INSERT statement for you and runs it at commit. We do not write SQL. Here, em is the EntityManager object that makes JPA do the saving. In this lab, you remove the two markers one at a time and run the same saving code, to see whether the table is created and whether an INSERT statement is sent.',
  terms: ['Entity', '@Entity', '@Id', 'JPA, Hibernate, Spring Data JPA'],
  controls: [
    { id: 'ent', label: 'Put @Entity above Member', type: 'check', value: true },
    { id: 'idf', label: 'Put @Id above the id field', type: 'check', value: true },
    { id: 'extra', label: 'Add one more field, email', type: 'check', value: false },
  ],
  // q is the question shown on the question-style screen. t and d are the name and the description used in the text-only reading
  presets: [
    { t: 'Default settings', q: 'What does an entity look like, and what happens when you pass it to em.persist?', d: 'An entity that has both @Entity and @Id. JPA creates the table and sends an INSERT statement at commit.', v: { ent: true, idf: true, extra: false } },
    { t: 'Removing @Entity', q: 'What if you remove @Entity?', d: 'JPA does not accept this class as an entity, so em.persist fails with an error.', v: { ent: false, idf: true, extra: false } },
    { t: 'Removing @Id', q: 'What if you remove @Id?', d: 'JPA cannot find a field to use as the primary key, so it stops while starting.', v: { ent: true, idf: false, extra: false } },
    { t: 'Adding an email field', q: 'What if you add one more field (email)?', d: 'The field is paired with one column, so the table gets an email column and it goes into the INSERT statement too.', v: { ent: true, idf: true, extra: true } },
  ],
  // The code on the screen and the source that the verification program (verify/spring/src/EntityBasicProbe.java) runs are the same text. The verification script compares them character by character.
  code: function (c) {
    var l = [];
    if (c.ent) l.push('// Marker: objects of this class are stored as one row of a table', '@Entity');
    l.push('public class Member {');
    if (c.idf) l.push('    // Marker: this field is the primary key', '    @Id');
    l.push('    private Long id;', '    private String name;');
    if (c.extra) l.push('    private String email;');
    l.push('', '    protected Member() { }', '', '    public Member(Long id, String name) {', '        this.id = id;', '        this.name = name;', '    }', '}', '',
      '// The side that saves', 'em.getTransaction().begin();', 'em.persist(new Member(1L, "Alice"));', 'em.getTransaction().commit();');
    return l.join('\n');
  },
  label: function (c) { return (c.ent ? 'has @Entity' : 'no @Entity') + ' · ' + (c.idf ? 'has @Id' : 'no @Id') + ' · ' + (c.extra ? 'fields id, name, email' : 'fields id, name'); },
  columns: ['Result', 'Table JPA made from the class', 'INSERT statements sent', 'Rows in the table'],
  simulate: function (c) {
    var ev = [], sum = [], ok = c.ent && c.idf, cols = c.extra ? ['id', 'email', 'name'] : ['id', 'name'];
    var ins = c.extra ? 'insert into Member (email,name,id) values (?,?,?)' : 'insert into Member (name,id) values (?,?)';
    var fields = c.extra ? 'id, name, email' : 'id, name';
    // State: jpa (state of the JPA box), jl (text of the JPA box), rd (for each field, whether the marker reaches JPA: pass, cut), table (the columns made), row (the row that went in), ins (INSERTs sent), rows (row count)
    var st = { phase: '', jpa: 'idle', jl: ['(Hibernate)', 'Not started'], rd: { ce: '', id: '', name: '', email: '' }, table: null, row: null, ins: 0, rows: null, err: '' };
    function push(s, k) { ev.push({ s: s, k: k, snap: JSON.parse(JSON.stringify(st)) }); }

    // 1. JPA starts and reads the Member class
    st.phase = 'read'; st.jpa = 'read'; st.jl = ['(Hibernate)', 'Reading', 'Member'];
    push('When the program starts, it tells JPA (here, Hibernate) about the Member class, and JPA reads this class. The line that registers it and the settings that connect to the database are left out of the screen. None of the code we wrote has a line that pairs fields with columns. JPA does the pairing by looking at the markers on the class.', '');

    if (!c.ent) {
      // 2. No @Entity: it is not accepted as an entity (the start succeeds)
      st.rd = { ce: 'cut', id: 'cut', name: 'cut', email: c.extra ? 'cut' : '' };
      st.jpa = 'plain'; st.jl = ['(Hibernate)', 'Member unknown', 'Start finished'];
      push('JPA looks for @Entity above the Member class. It is not there, so JPA does not accept this class as a class to store. No error occurs, and JPA finishes starting without knowing Member. ' + (c.idf ? 'Even if @Id is on the id field, the result is the same, because the class was not accepted as an entity. ' : '') + 'JPA made no table.', 'bad');
      st.phase = 'begin';
      push('em.getTransaction().begin(): starts the saving work. A transaction is a unit that handles work as one group, and it is covered separately. No INSERT statement has been sent yet.', '');
      st.phase = 'new';
      push('new Member(1L, "Alice"): makes an object from the Member class. This object is an ordinary Java object, and JPA does not know it yet.', '');
      st.phase = 'persist'; st.jpa = 'bad'; st.jl = ['(Hibernate)', 'persist refused', '(error)']; st.err = 'persist';
      push('em.persist(...): JPA tries to take the object and checks whether the Member class is an entity it knows. It is not. An IllegalArgumentException is thrown, and the message is Unknown entity type \'app.Member\' (\'Member\' is not annotated \'@Entity\'). The app in front is the name of the package in which Member was put in this experiment. Because of the error, the next line, commit, does not run, and no INSERT statement was ever sent. There is no table, so there is no row either.', 'bad');
      sum.push('Without @Entity, JPA does not accept this class as a class to store. JPA started without an error, but when the object was passed to em.persist, an IllegalArgumentException was thrown, and there was no table and no INSERT statement.');
      sum.push((c.idf ? '@Id did not help. @Id is a marker that has meaning inside a class with @Entity. ' : 'If you remove both markers, it becomes an ordinary class of the same shape. ') + 'The error occurred not when JPA started but on the line that calls persist.' + (c.extra ? ' Adding the email field does not change the result.' : ''));
    } else if (!c.idf) {
      // 2. @Entity but no @Id: it fails while starting
      st.rd = { ce: 'pass', id: 'cut', name: 'pass', email: c.extra ? 'pass' : '' };
      st.jpa = 'bad'; st.jl = ['(Hibernate)', 'No primary', 'key found'];
      push('JPA looks for @Entity above the Member class. It is there, so JPA accepts it as a class to store. Next it looks for a field to use as the primary key, but no field has @Id. Even if there is a field named id, JPA finds the primary key by the @Id marker, not by the name.', 'bad');
      st.phase = 'fail'; st.err = 'start'; st.jl = ['(Hibernate)', 'Start failed', '(error)'];
      push('JPA stops starting with an AnnotationException. The message starts with Entity \'app.Member\' has no identifier, which means that every @Entity class must have at least one property with @Id. No table was made. The program does not even reach the saving code, so neither persist nor commit runs, and no INSERT statement was sent.', 'bad');
      sum.push('Without @Id, JPA does not know which field to use to tell rows apart, so it stops while starting. @Entity made it accept the class as a class to store, but it could not find a field to use as the primary key.');
      sum.push('This time the error occurred when JPA started, not on the persist line. Even if the field is named id, without the @Id marker it is not the primary key.' + (c.extra ? ' Adding the email field does not change the result. Without a primary key, JPA cannot start no matter how many fields would become columns.' : ''));
    } else {
      // 2. Normal: accept it as an entity, pair fields with columns, and create the table
      st.rd = { ce: 'pass', id: 'pass', name: 'pass', email: c.extra ? 'pass' : '' };
      st.jpa = 'ok'; st.jl = ['(Hibernate)', 'Entity: Member', 'Primary key: id'];
      push('JPA looks for @Entity above the Member class. It is there, so JPA accepts it as a class to store. Next it reads the fields, takes id, which has @Id, as the primary key, and takes the other fields (' + (c.extra ? 'name, email' : 'name') + ') as columns that are not the primary key.', 'good');
      st.phase = 'table'; st.table = cols.slice(); st.rows = 0; st.jl = ['(Hibernate)', 'Entity: Member', 'Table created'];
      push('JPA creates a table in the H2 database following this pairing. The table name follows the class name, Member, and the columns are one per field: ' + cols.join(', ') + '.' + (c.extra ? ' In this run, the columns were created in the order id, email, name, unlike the order in which the fields are written (id, name, email).' : '') + ' This lab sets JPA to create the table when it starts (hibernate.hbm2ddl.auto=create-drop), and we did not write CREATE TABLE either. There are no rows yet.', 'good');
      st.phase = 'begin';
      push('em.getTransaction().begin(): starts the saving work. A transaction is a unit that handles work as one group, and it is covered separately. No INSERT statement has been sent yet.', '');
      st.phase = 'new';
      push('new Member(1L, "Alice"): makes an object from the Member class. This object is still an ordinary Java object, and JPA does not know it.', '');
      st.phase = 'persist'; st.jl = ['(Hibernate)', 'Object received', 'INSERTs: 0'];
      push('em.persist(...): JPA receives this object. At the moment this line ends, the number of INSERT statements sent is still 0. Passing the object does not write it to the database right away. When the INSERT is sent is covered in the "Persistence context" lab.', '');
      st.phase = 'commit'; st.ins = 1; st.jl = ['(Hibernate)', 'Builds and sends', 'the INSERT'];
      push('em.getTransaction().commit(): JPA builds an INSERT statement and sends it to the database. The statement that Hibernate 7.4.5 built in this run is "' + ins + '". Into each ?, the values of the fields of the object go in the order of the column names before it. The code we wrote has no word INSERT. The text of the statement may differ by Hibernate version.', 'good');
      st.phase = 'done'; st.rows = 1; st.row = { id: '1', name: 'Alice', email: 'NULL' };
      push('A row was created in the Member table. id is 1 and name is Alice' + (c.extra ? ', and email is NULL. We never put a value in the email field, so it was stored empty' : '') + '. One object became one row of the table.', 'good');
      if (c.extra) {
        sum.push('If you add one more field, JPA pairs it with a column too, so the table gets an email column and it goes into the column list of the INSERT statement too. Adding a column is a matter of writing a field, not SQL.');
        sum.push('The constructor stayed the same, so no value was put in email, and the email column was stored as NULL. Every field of an entity becomes a column, whether it has a value or not.');
      } else {
        sum.push('An entity is a Java class that is paired with one row of a table. It differs from an ordinary class in @Entity above the class (the marker that it is a class to store) and @Id above a field (the marker that it is the primary key), and with these two, JPA pairs the fields with columns and creates the table.');
        sum.push('We did not write a single line of SQL. JPA built both the table and the INSERT statement by looking at the shape of the class, and the INSERT was sent not on the persist line but on the commit line.');
      }
    }
    var result = ok ? 'Saved' : !c.ent ? 'Cannot save: the class is not an entity' : 'JPA failed while starting: no field to use as the primary key';
    var tab = ok ? 'Member (' + cols.join(', ') + ')' : 'Not created';
    return { events: ev, summary: sum, cols: cols, ins: ins, row: [result, tab, (ok ? 1 : 0) + '', ok ? '1' : 'No table'] };
  },
  render: function (v, sim, t, H, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : null;
    if (!s) { H.text(v, 'Click Run to start from JPA starting and reading the Member class.'); return; }
    if (s.table) H.table(v, ['Column', 'Value'], s.table.map(function (n) { return { cls: '', cells: [n, s.row ? { v: s.row[n], cls: 'good' } : ''] }; }), 'Member table made by JPA');
    else H.table(v, ['Column', 'Value'], [{ cls: 'gone', cells: ['No table', ''] }], 'Member table made by JPA');
    if (s.ins) H.table(v, ['INSERT statement sent'], [{ cls: '', cells: [{ v: sim.ins, cls: 'good' }] }], 'Statement built by Hibernate');
    H.counters(v, [[s.ins, 'INSERTs sent'], [s.table ? s.rows : '-', 'Rows in the table']]);
  },
  // Diagram: the Member class (markers and fields) on the left, JPA in the middle, and the table (columns and row) on the right. A marker and a field have to reach JPA to be paired with a column, and if you remove a marker, the arrow breaks in front of JPA.
  draw: function (P, sim, shown) {
    var c = sim.c, last = shown[shown.length - 1], s = last ? last.snap : null, cols = sim.cols;
    P.size(680, 326);
    var ph = s ? s.phase : '';
    P.region('lc', 14, 16, 190, 242, 'Classes we wrote');
    P.box('ce', 24, 40, 170, 46, { cls: ph === 'new' ? 'hot now' : s && s.rd.ce === 'pass' ? 'wait' : 'plain', title: 'Member', sub: ph === 'new' ? '1 object created' : c.ent ? '@Entity marker' : 'No @Entity marker' });
    P.box('f1', 24, 94, 170, 46, { cls: c.idf ? 'wait' : 'plain', title: c.idf ? '@Id  id' : 'id', sub: 'Long' });
    P.box('f2', 24, 148, 170, 46, { cls: 'plain', title: 'name', sub: 'String' });
    if (c.extra) P.box('f3', 24, 202, 170, 46, { cls: 'plain', title: 'email', sub: 'String' });
    var jcls = !s ? 'ghost' : s.jpa === 'bad' ? 'bad' : s.jpa === 'ok' ? 'good' : ph === 'persist' || ph === 'commit' ? 'hot now' : s.jpa === 'read' ? 'hot now' : 'plain';
    P.box('jpa', 270, 40, 140, 208, { cls: jcls, title: 'JPA', sub: s ? s.jl : [' '] });
    // From the left to JPA: if the marker reaches, an arrow; if it breaks, it stops in front of JPA
    var ys = { ce: 63, id: 117, name: 171, email: 225 }, fr = { ce: 0.11, id: 0.37, name: 0.63, email: 0.89 }, bx = { ce: 'ce', id: 'f1', name: 'f2', email: 'f3' };
    ['ce', 'id', 'name', 'email'].forEach(function (k) {
      if (!s || !s.rd[k]) return;
      if (s.rd[k] === 'pass') P.arrow('in_' + k, bx[k] + ':r', 'jpa:l:' + fr[k], { cls: 'good' });
      else { P.arrow('in_' + k, bx[k] + ':r', [244, ys[k]], { cls: 'bad' }); P.text('x_' + k, 256, ys[k] + 5, '×', { cls: 'bad', anchor: 'middle', bold: true }); }
    });
    // Table: id is made first, and the others in name order (observed in execution)
    P.region('rc', 466, 16, 200, 242, 'Table in H2');
    var made = !!(s && s.table);
    P.box('tt', 476, 40, 180, 46, { cls: made ? 'plain' : 'ghost', title: made ? 'Member table' : 'No table', sub: made ? ('Rows: ' + s.rows) : ' ' });
    cols.forEach(function (n, i) {
      var y = 94 + i * 54;
      P.box('c' + i, 476, y, 180, 46, { cls: !made ? 'ghost' : s.row ? 'good' : ph === 'table' ? 'hot' : 'wait', title: made ? n : ' ', sub: made ? (s.row ? s.row[n] : 'No value') : ' ' });
      if (made) {
        var from = n === 'id' ? 'id' : n === 'name' ? 'name' : 'email';
        P.arrow('out_' + n, 'jpa:r:' + fr[from], 'c' + i + ':l', { cls: ph === 'table' ? 'hot' : 'good' });
      }
    });
    P.box('n1', 14, 276, 322, 36, { cls: s && s.ins ? 'good' : 'ghost', title: 'INSERTs sent', right: (s ? s.ins : 0) + '' });
    P.box('n2', 344, 276, 322, 36, { cls: s && s.rows ? 'good' : 'ghost', title: 'Rows in the table', right: !s ? '-' : s.table ? s.rows + '' : 'No table' });
  },
  assume: 'This was checked against real execution on Hibernate 7.4.5 and H2 2.4.240 (an in-memory database). Spring was not used, and Hibernate was started directly in code (the class was registered in Configuration, without persistence.xml). For all 8 combinations, the same text as the Member source on the screen (with only the package and import lines added) was compiled, and a new Java process was started each time. In the combinations without @Entity, Member was registered in the same way. The three "side that saves" lines on the screen are actually code inside main, and the line that gets the EntityManager (em), the line that catches and records the exception, and the lines that measure were left out of the screen. What was checked is whether JPA fails while starting and the kind of exception, the tables and columns in H2 right after starting and after the run (INFORMATION_SCHEMA.COLUMNS), the number and text of the INSERT statements captured with a StatementInspector (when the persist line ended and when the commit line ended), and the number of rows and the content of the table after the run. H2 stores the table name as MEMBER and the column names as ID, NAME, and EMAIL, and the screen shows the table name with only the first letter capitalized and the column names in lowercase to make them easier to read. The columns were not created in the order in which the fields are written (in this run the order was id, email, name). The rule that decides the order was not checked. What the documentation defines is section 2.1 of the Jakarta Persistence 3.2 specification (an entity class must have @Entity, must have a public or protected constructor with no arguments, and must not be final) and section 2.4 (every entity must have a primary key, and a simple primary key is declared by putting @Id on a field), and items 3.4.1, 3.4.3, 3.4.5, and 3.4.6 of section 3.4 (Entity types) of the Hibernate ORM 7.0 User Guide (the table name follows the entity name by default, and putting @Id on a field makes it field access). These documents were opened with WebFetch, and what came back was a summary, not the original text, so I could not check each sentence against the original. For the specification, only the first part was read (the first 100,000 characters, which contain sections 2.1 and 2.4). The following are not what the documentation defines but behaviors observed on this version. When a class without @Entity is registered, JPA finishes starting without an error (there is no entity that JPA knows), and em.persist throws an IllegalArgumentException, and the result is the same even if @Id is there. With @Entity but without @Id, an AnnotationException is thrown when starting and no table is made (item 3.4.5 of the Hibernate 7.0 User Guide says that omitting the identifier used to be allowed but is deprecated, but on 7.4.5 it was an error). The table is created not at persist or commit but when JPA starts (with the setting hibernate.hbm2ddl.auto=create-drop), and the INSERT statement was sent not on the persist line but on the commit line. The statement has the shape insert into Member (name,id) values (?,?), its text may differ by Hibernate version, and details such as whether that INSERT is sent at persist or at commit are covered in the "Persistence context" lab. What the code on the screen leaves out is the package and import lines, and only the fields id, name, and email were covered. @Table and @Column, which change the pairing of names and columns, @GeneratedValue, which makes primary key values automatically, accessor methods, and the rest of the conditions on an entity class (it must not be final, and so on) were not covered. It was not checked against execution on MySQL.',
});

Lab.register({
  id: 'relation_basic', nav: 'Associations', cat: 'Fundamentals', mode: 'step', basic: true, deep: ['owner'],
  title: 'What is an association, and what does @ManyToOne do for you?',
  why: 'A table points to another row by writing a number, and a Java object points directly to another object. Without something that connects the two, we must write code that takes out the number from the object each time we save and, each time we read, uses that number to find the other side again and attach it. An association marker such as @ManyToOne leaves this translating work to JPA, so that in Java code you only follow objects.',
  use: 'It is commonly used for relationships where "many point to one," such as an order and the member who placed it, a post and its author, and a comment and the post it is attached to. If you want to see a list from the opposite side, use @OneToMany together. Something that JPA cannot find directly, such as an object in another service\'s database, keeps only the number as a field.',
  intro: 'An order needs to know who placed it. In tables, the order row writes the number of the member in one column (a foreign key) and points to the member. In Java objects, Order points directly to a Member object through a field (Order and Member are example entity classes made for this lab). When an entity points to another entity like this, it is an association. If you write @ManyToOne above that field, JPA connects the two. When it saves, it takes the id out of the Member object and puts it in the foreign key column, and when it reads, it uses that number to make a Member object and has the field point to it. So you can just follow the objects, as in order.getMember().getName(). This lab runs the same code, which saves an order and reads it again, on a database where (1, Kim) is already in the member table, and changes only the field declaration. You see what happens if you remove @ManyToOne, and what changes if you keep only a number (Long memberId) in the field instead of an object.',
  terms: ['Association', '@ManyToOne', '@JoinColumn', 'Primary key, unique key, foreign key'],
  controls: [
    { id: 'how', label: 'The member field of Order', type: 'select', value: 'ref', options: [
      ['ref', '@ManyToOne private Member member;'],
      ['named', 'Add @JoinColumn(name = "buyer_id") to @ManyToOne'],
      ['noanno', 'Remove @ManyToOne: private Member member;'],
      ['idonly', 'Keep only a number instead of an object: private Long memberId;'],
    ] },
  ],
  // q is the question shown on the question-style screen. t and d are the name and the description used in the text-only reading
  presets: [
    { t: 'Default settings', q: 'What does an association look like, and how do you get the member when you save an order and read it again?', d: 'The member field with @ManyToOne. JPA takes the number out of the object and puts it in the foreign key column, and when it reads, it uses the number to make a Member object and has the field point to it.', v: { how: 'ref' } },
    { t: 'Removing @ManyToOne', q: 'What if you remove @ManyToOne?', d: 'JPA does not know how to put a field of the Member type into a column, so it cannot start.', v: { how: 'noanno' } },
    { t: 'Keeping only a number instead of an object', q: 'What if you keep only the member number (Long memberId) instead of a Member object?', d: 'It is saved, but no foreign key constraint is created, and to get the member you have to find it again yourself with the number.', v: { how: 'idonly' } },
    { t: 'Adding @JoinColumn', q: 'What if you add @JoinColumn(name = "buyer_id")?', d: 'Only the name of the foreign key column changes from member_id to buyer_id, and the result of saving and reading is the same.', v: { how: 'named' } },
  ],
  // The code on the screen and the source that the checking program (verify/spring/src/RelationBasicProbe.java) compiled and ran are the same text (the checking script compares them character by character).
  code: function (c) {
    var l = ['// Only the needed parts are kept (the Member entity, Order\'s constructors and getters, em setup, and imports omitted)', '@Entity', '@Table(name = "orders")', 'public class Order {', '    @Id', '    private Long id;'];
    if (c.how === 'ref' || c.how === 'named') l.push('    // Association: point to the member who placed this order as an object', '    @ManyToOne');
    if (c.how === 'named') l.push('    @JoinColumn(name = "buyer_id")');
    l.push(c.how === 'idonly' ? '    private Long memberId;' : '    private Member member;', '}', '',
      '// Calling side: save an order, read it again, and look at the name of the member who placed it');
    if (c.how === 'idonly') l.push('em.persist(new Order(10L, 1L));');
    else l.push('Member kim = em.find(Member.class, 1L);', 'em.persist(new Order(10L, kim));');
    l.push('// After saving (commit) is done, read it again from the database with a new EntityManager (em2)', 'Order o = em2.find(Order.class, 10L);');
    if (c.how === 'idonly') l.push('Member m = em2.find(Member.class, o.getMemberId());', 'System.out.println(m.getName());');
    else l.push('System.out.println(o.getMember().getName());');
    return l.join('\n');
  },
  label: function (c) { return { ref: '@ManyToOne private Member member;', named: '@ManyToOne + @JoinColumn(name = "buyer_id")', noanno: 'No @ManyToOne: private Member member;', idonly: 'Number only: private Long memberId;' }[c.how]; },
  columns: ['Result', 'orders table made by JPA', 'Foreign key constraint', 'Order row saved'],
  simulate: function (c) {
    var ev = [], sum = [], how = c.how, obj = how === 'ref' || how === 'named', fail = how === 'noanno';
    var col = how === 'named' ? 'buyer_id' : 'member_id', cols = how === 'named' ? 'buyer_id, id' : 'id, member_id';
    var selM = 'select m1_0.id,m1_0.name from member m1_0 where m1_0.id=?';
    var insO = 'insert into orders (' + col + ',id) values (?,?)';
    var readJoin = 'select o1_0.id,m1_0.id,m1_0.name from orders o1_0 left join member m1_0 on m1_0.id=o1_0.' + col + ' where o1_0.id=?';
    var readO = 'select o1_0.id,o1_0.member_id from orders o1_0 where o1_0.id=?';
    var rowText = 'id 10, ' + col + ' 1';
    // State: jpa (state of the JPA box), jl (text of the JPA box), ann (whether the mark on the member field reaches JPA: pass, cut), tbl (whether the table was made), mrow (member row),
    // oo (Order object: new made, read read in), mo (Member object), link (whether Order points to a Member object), orow (orders row), fk (foreign key constraint), sql (SQL sent), out (text printed)
    var st = { phase: '', jpa: 'idle', jl: 'Before start', ann: '', tbl: false, mrow: false, oo: '', mo: false, mby: '', link: false, orow: false, fk: false, ins: 0, sel: 0, sql: [], out: '' };
    function push(s, k) { ev.push({ s: s, k: k, snap: JSON.parse(JSON.stringify(st)) }); }

    // 1. JPA reads Order when it starts
    st.phase = 'read'; st.jpa = 'read'; st.jl = 'Reading the Order class';
    if (fail) {
      st.ann = 'cut';
      push('When the program starts, it tells JPA (here, Hibernate) about the Order and Member classes, and JPA reads the classes. The line that registers them and the settings that connect to the database are shortened on the screen. JPA looks at the member field of Order, and its type is Member, which is another entity. But there is no mark such as @ManyToOne above the field. JPA treats a field with no mark as a value to put in one column, like a number or a text, and tries to decide the type of the column, but Member is not such a value.', 'bad');
      st.phase = 'fail'; st.jpa = 'bad'; st.jl = 'Start failed (error)';
      push('JPA throws a MappingException error and stops starting. The message begins with Incorrect use of entity type \'app.Member\' (possibly due to missing association mapping annotation), which means the mark that shows an association seems to be missing. The inner cause is that it could not decide the column type that fits the Java type \'app.Member\'. The app at the front is the name of the package where Member was put in this experiment. Not one table was created. The program does not even reach the code that uses it, so neither find nor persist ran, and no SQL was sent even once.', 'bad');
      sum.push('If you remove @ManyToOne, JPA does not know how to put a field of the Member type into a column, so it cannot start. The field lost its mark as an association, so for JPA it became a value that it cannot find a way to store.');
      sum.push('This time the error occurred when JPA started, not at the find or persist line, and not one table was created. A field of an entity type needs an association mark to be connected to a foreign key column.');
    } else if (obj) {
      st.ann = 'pass';
      push('When the program starts, it tells JPA (here, Hibernate) about the Order and Member classes, and JPA reads the classes. The line that registers them and the settings that connect to the database are shortened on the screen. JPA looks at the member field of Order, and its type is Member, which is another entity, and @ManyToOne is above it. So JPA accepts this field as "a field that points to another entity".' + (how === 'named' ? ' The @JoinColumn(name = "buyer_id") below it is a mark that says to name the column that holds the number it points to buyer_id.' : ''), 'good');
      st.phase = 'table'; st.tbl = true; st.fk = true; st.mrow = true; st.jpa = 'ok'; st.jl = 'Made the orders table';
      push('JPA makes the orders table in the H2 database following this mapping. The columns are ' + cols + ', and column ' + col + ' holds the id of Member. A foreign key constraint is also made, so the value of this column must be a number that exists in the id of the member table. ' + (how === 'named' ? 'The column name is buyer_id, which @JoinColumn decided. If we had not written it, it would have been member_id, which joins the field name member, an underscore, and the name of the column it points to, id (the default rule of the JPA specification). ' : 'The column name member_id joins the field name member, an underscore, and the name of the column it points to, id (the default rule of the JPA specification when @JoinColumn is not written). ') + 'This lab is set so that JPA creates the table when it starts (hibernate.hbm2ddl.auto=create-drop), and we did not write CREATE TABLE. The member table already has the row (1, Kim) that the lab put in ahead of time. The line that puts in this row is left out of the code on the screen.', 'good');
    } else {
      st.ann = 'pass';
      push('When the program starts, it tells JPA (here, Hibernate) about the Order and Member classes, and JPA reads the classes. The line that registers them and the settings that connect to the database are shortened on the screen. JPA looks at the memberId field of Order, and its type is Long, an ordinary number. A number can just be put in one column, so there is no problem without @ManyToOne. But JPA does not know that this number is the number of a member.', 'good');
      st.phase = 'table'; st.tbl = true; st.mrow = true; st.jpa = 'ok'; st.jl = 'Made the orders table';
      push('JPA makes the orders table in the H2 database following this mapping. The columns are id and member_id, and member_id is one column that matches the field memberId. This lab is set with a rule that puts an _ before each capital letter of a field name to make the column name (the same as the default rule of Spring Boot). No foreign key constraint was created. member_id is just a column that holds a number, so the database does not connect this value to the member table. The member table already has the row (1, Kim) that the lab put in ahead of time. The line that puts in this row is left out of the code on the screen.', 'good');
    }

    if (!fail) {
      // 2. Calling side
      if (obj) {
        st.phase = 'findm'; st.mo = true; st.mby = 'em'; st.sel = 1; st.sql = [selM]; st.jl = 'Found the Member and made kim';
        push('Member kim = em.find(Member.class, 1L): JPA reads the row with id 1 from the member table and makes the Member object kim. In this run, 1 SELECT was sent. kim is an ordinary object that has id 1 and the name Kim.', '');
        st.phase = 'persist'; st.oo = 'new'; st.link = true; st.ins = 1; st.orow = true; st.sql = [selM, insO]; st.jl = 'Sent an INSERT';
        push('em.persist(new Order(10L, kim)): it creates an order object and has the member field point to the kim object, not the number 1. While this order is passed to JPA and the saving finishes, 1 INSERT is sent. In this run, the statement that Hibernate 7.4.5 made is "' + insO + '". JPA took the id 1 out of the kim object and put it in the place of ' + col + '. We did not take out the number and write it. A row (' + rowText + ') now exists in the orders table.', 'good');
      } else {
        st.phase = 'persist'; st.oo = 'new'; st.ins = 1; st.orow = true; st.sql = [insO]; st.jl = 'Sent an INSERT';
        push('em.persist(new Order(10L, 1L)): it creates an order object and we write the member number 1 into it ourselves. There is no Member object such as kim. While this order is passed to JPA and the saving finishes, 1 INSERT is sent. In this run, the statement that Hibernate 7.4.5 made is "' + insO + '". The number we put in went into the column as it is, and a row (' + rowText + ') now exists in the orders table.', 'good');
      }
      // 3. Read it again
      if (obj) {
        st.phase = 'readorder'; st.oo = 'read'; st.mby = 'em2'; st.sel = 2; st.sql = [selM, insO, readJoin]; st.jl = 'Made a new Member object with number 1';
        push('Order o = em2.find(Order.class, 10L): it reads the order with em2, which is a different em from the one used for saving. The separately made em2 does not know the earlier objects, so it reads from the database. 1 SELECT was sent on this line, and that statement read not only the orders table but the member table too. JPA uses the member row that matches the value 1 of ' + col + ' in the row to make a new Member object, and has the member field of o point to it. This Member object was made by em2, and it is a different object from the kim used for saving. We did not call a separate find to look for the Member.', 'good');
        st.phase = 'print'; st.out = 'Kim'; st.jl = 'Just follow the objects';
        push('System.out.println(o.getMember().getName()): o.getMember() is the Member object that the member field of o points to (the one em2 made), and getName() returns the name of that object. Kim is printed on the screen. We did not handle a number. We only followed the objects.', 'good');
        if (how === 'ref') {
          sum.push('An association is one entity pointing to another entity. In tables, the orders row points to the member by writing the member number in the member_id column (a foreign key), and in Java objects, Order points to a Member object through a field. @ManyToOne above the field connects the two.');
          sum.push('When it saved, JPA took the id out of the kim object and put it in member_id, and when it read, it used that number to make a Member object and had the member field point to it. So you get the name of the member by following the objects, as in o.getMember().getName().');
        } else {
          sum.push('@JoinColumn decides only the name of the foreign key column. The column name changed from member_id to buyer_id and nothing else, and the result of saving and reading is the same as with @ManyToOne alone. The foreign key constraint was made as before.');
          sum.push('The code that gets the member from the order never writes the column name. o.getMember().getName() is the same whatever the column name is, and the column name appears only when JPA builds the SQL and when you look at the table in the database.');
        }
      } else {
        st.phase = 'readorder'; st.oo = 'read'; st.sel = 1; st.sql = [insO, readO]; st.jl = 'Read only the order';
        push('Order o = em2.find(Order.class, 10L): it reads the order with em2, which is a different em from the one used for saving. 1 SELECT was sent on this line, and it read only the orders table. o holds the member_id value only as the number 1 that getMemberId() returns, and there is no Member object.', 'good');
        st.phase = 'findm'; st.mo = true; st.mby = 'em2'; st.sel = 2; st.sql = [insO, readO, selM]; st.jl = 'The find we called';
        push('Member m = em2.find(Member.class, o.getMemberId()): to get the member, we have to write one more line ourselves that finds the Member with this number. 1 more SELECT is sent on this line and reads the row with id 1 from the member table.', 'good');
        st.phase = 'print'; st.out = 'Kim'; st.jl = 'One more line to find it is needed';
        push('System.out.println(m.getName()): m is the Member object that we just found, and Kim is printed on the screen. The result is the same, but the way from o to m was not connected by JPA. We found it with the number.', 'good');
        sum.push('Even if you keep only a number instead of an object, it is saved and you get the name of the member. But JPA treated member_id as just a number column and created no foreign key constraint, and to get the member we had to call find one more time ourselves with the number.');
        sum.push('With an association, the way is one line, o.getMember().getName(). With only a number, it is two lines that you connect yourself, find and getMemberId(). The difference is whether JPA or we do the connecting.');
      }
    }
    var result = fail ? 'JPA failed while starting: a field of an entity type has no association annotation' : 'Kim';
    var tab = fail ? 'Not created' : 'orders (' + cols + ')';
    var fkText = fail ? 'No table' : obj ? 'Yes: ' + col + ' → id of Member' : 'None';
    var rowOut = fail ? 'No table' : rowText;
    return { events: ev, summary: sum, col: col, cols: cols, sql: { selM: selM, insO: insO, readJoin: readJoin, readO: readO }, row: [result, tab, fkText, rowOut] };
  },
  render: function (v, sim, t, H, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : null;
    if (!s) { H.text(v, 'Click Run to start from JPA reading the Order class as it starts.'); return; }
    var col = sim.col;
    if (s.tbl) H.table(v, ['Column', 'Value'], sim.cols.split(', ').map(function (n) { return { cls: '', cells: [n, s.orow ? { v: n === 'id' ? '10' : '1', cls: 'good' } : ''] }; }), 'orders table made by JPA');
    else H.table(v, ['Column', 'Value'], [{ cls: 'gone', cells: ['No table', ''] }], 'orders table made by JPA');
    if (s.sql.length) H.table(v, ['SQL statements sent'], s.sql.map(function (q) { return { cls: '', cells: [{ v: q, cls: 'good' }] }; }), 'Statements made by Hibernate');
    H.counters(v, [[s.ins, 'INSERT sent'], [s.sel, 'SELECT sent']]);
  },
  // Diagram: at the top the world of objects (the Order object and the Member object. Each box title says what made that object. After reading again, both boxes are new objects made by em2), at the bottom the world of tables (the orders row and the member row), and in the middle JPA, which connects them. If there is an association, an arrow runs from the Order object to the Member object and from the orders row to the member row.
  draw: function (P, sim, shown) {
    var c = sim.c, how = c.how, obj = how === 'ref' || how === 'named', col = sim.col, last = shown[shown.length - 1], s = last ? last.snap : null;
    P.size(680, 396);
    var ph = s ? s.phase : '';
    P.region('wo', 14, 12, 652, 108, 'World of objects: Java objects');
    var osub = !s || !s.oo ? 'No object' : how === 'idonly' ? ['id = 10', 'memberId = 1'] : ['id = 10', 'member = ' + (s.link ? 'Member object' : 'empty')];
    P.box('oo', 24, 38, 270, 70, { cls: !s || !s.oo ? 'ghost' : ph === 'persist' || ph === 'readorder' ? 'hot now' : 'wait', title: !s || !s.oo ? 'Order object' : s.oo === 'read' ? 'Order object o (made by em2)' : 'Order object (made with new)', sub: osub });
    P.box('mo', 386, 38, 270, 70, { cls: !s || !s.mo ? 'ghost' : (ph === 'findm' || (obj && ph === 'readorder')) ? 'hot now' : 'wait', title: !s || !s.mby ? 'Member object' : s.mby === 'em' ? 'Member object kim (made by em)' : how === 'idonly' ? 'Member object m (made by em2)' : 'New Member object (made by em2)', sub: s && s.mo ? ['id = 1', 'name = Kim'] : 'No object' });
    if (obj && s && s.link) P.arrow('lk', 'oo:r', 'mo:l', { cls: 'good' });
    var jcls = !s ? 'ghost' : s.jpa === 'bad' ? 'bad' : s.jpa === 'ok' ? 'good' : 'hot now';
    P.box('jpa', 24, 150, 632, 62, { cls: jcls, title: 'JPA (Hibernate)', sub: s ? s.jl : 'Before start' });
    // Upper arrows: whether the mark on the class reaches JPA, and whether the objects go back and forth with JPA
    if (s && s.ann === 'cut') { P.arrow('a_o', 'oo:b:0.3', [120, 130], { cls: 'bad' }); P.text('x_o', 120, 142, '×', { cls: 'bad', anchor: 'middle', bold: true }); }
    else if (s && s.ann === 'pass') P.arrow('a_o', 'oo:b:0.3', 'jpa:t:0.1', { cls: ph === 'read' ? 'good' : 'mut' });
    if (s && s.mo) P.arrow('a_m', 'mo:b:0.7', 'jpa:t:0.9', { cls: ph === 'findm' || (obj && ph === 'readorder') ? 'hot' : 'mut' });
    P.region('wt', 14, 232, 652, 104, 'World of tables: H2 database');
    var made = !!(s && s.tbl);
    P.box('to', 24, 258, 270, 70, { cls: !made ? 'ghost' : ph === 'table' ? 'hot' : ph === 'persist' || ph === 'readorder' ? 'hot now' : 'wait', title: made ? 'orders table' : 'No table', sub: made ? [sim.cols, s.orow ? 'id 10 · ' + col + ' 1' : 'No rows'] : ' ' });
    P.box('tm', 386, 258, 270, 70, { cls: !made ? 'ghost' : ph === 'findm' ? 'hot now' : 'wait', title: made ? 'member table' : 'No table', sub: made ? ['id, name', '1 · Kim'] : ' ' });
    if (made && obj) P.arrow('fk', 'to:r', 'tm:l', { cls: 'good' });
    if (s && s.tbl) {
      P.arrow('a_t', 'jpa:b:0.1', 'to:t:0.3', { cls: ph === 'table' || ph === 'persist' || ph === 'readorder' ? 'hot' : 'mut' });
      P.arrow('a_u', 'jpa:b:0.9', 'tm:t:0.7', { cls: ph === 'findm' ? 'hot' : 'mut' });
    }
    P.box('n1', 14, 350, 322, 36, { cls: s && s.ins ? 'good' : 'ghost', title: 'INSERT sent', right: (s ? s.ins : 0) + '' });
    P.box('n2', 344, 350, 322, 36, { cls: s && s.out ? 'good' : 'ghost', title: 'Text printed', right: s && s.out ? s.out : '-' });
  },
  assume: 'This was checked against real execution on Hibernate 7.4.5 and H2 2.4.240 (in-memory database). Spring was not used, and Hibernate was started directly in code (the Member and Order classes were registered in a Configuration, without persistence.xml). All 4 combinations were checked: the same text as the Order source on the screen (with only the package and import lines, a constructor, and getters added) was compiled together with the Member source, and a new Java process was started. What the screen shortens is the package and import lines, the constructor and getters of Order, the Member entity (an ordinary entity with the fields id and name), and the lines that get the EntityManagers em and em2. The "calling side" on the screen is really code inside main, and the part that saves with em is between the lines that start and end (commit) a transaction. Those lines are shortened on the screen. The reading line was run after saving finished, with the newly made em2. If you read with the same EntityManager, it gives back the object you just saved from memory, not from the database, and the reading step could not be shown. (1, Kim) in the member table was put in directly with JDBC right after JPA started and made the tables. The column names are set with a rule that puts an _ before each capital letter of a field name (hibernate.physical_naming_strategy=PhysicalNamingStrategySnakeCaseImpl). This is the same class that the spring-boot-hibernate jar of Spring Boot 4.1.1 points to as its default naming rule (this was checked by the class name inside the jar, and Spring Boot was not actually started), and what the column name becomes without this setting was not checked. What was checked against the run is whether JPA fails while starting and the kind and first line of the message of the exception, the tables and columns in H2 right after the start and after the run (INFORMATION_SCHEMA.COLUMNS), the foreign key constraint (INFORMATION_SCHEMA.REFERENTIAL_CONSTRAINTS and KEY_COLUMN_USAGE), the SQL caught with StatementInspector (the number and text of SELECT and INSERT, split into the saving step and the reading step), the text printed on the screen, and the rows of the orders table after the run. H2 stores table names in capital letters, but the screen writes them in lowercase, and the member table that the foreign key points to is written as Member, following the entity name. The order of the columns is as seen in H2 and is not the same as the order in which the fields are written (when buyer_id was set with @JoinColumn, buyer_id came before id). What the documentation defines is Section 2.11 of the Jakarta Persistence 3.2 specification (a field that shows an association gets one of @OneToOne, @OneToMany, @ManyToOne, and @ManyToMany), Section 2.12 (the default mapping of associations) and Section 2.12.3.2 (for a unidirectional ManyToOne, a foreign key column that points to the primary key of the other table is placed in the table of this entity, and the name of that column joins the field name, an underscore, and the name of the other side\'s primary key column), and the API documentation of ManyToOne and JoinColumn (the default naming rule when the name of JoinColumn is not written). The body of the specification has no separate description of the annotations, so these two were read from the API documentation. These documents were opened with WebFetch, and what came back was a summary, not the original text, so each sentence could not be checked against the original. The following is not defined by the documentation but is behavior observed on this version. If you remove @ManyToOne, JPA throws a MappingException when it starts (the first line of the message is Incorrect use of entity type \'app.Member\' (possibly due to missing association mapping annotation), and the inner cause is that it could not decide the JdbcType that fits the Java type \'app.Member\'), and not one table is created. The member table is not created either, so the row (1, Kim) that is put in ahead of time does not exist. When there is an association, the SELECT that reads the order again was 1, and it was a statement that read the member table together (left join). When only a number was kept, it was 2 in all: 1 SELECT that read the order and 1 SELECT of the Member find that we called. The details of when and how these SELECT statements are sent are covered in the labs on the study side. The text of a statement may differ by Hibernate version, so the screen says "In this run, the statement that Hibernate 7.4.5 made". The @Table that sets the table name to orders was added because order is a reserved word in SQL, and it is not the topic of this lab. Only the fields id and member (or memberId) were covered, and the opposite direction (a bidirectional association where Member has a list of orders), the owning side of an association, lazy loading, the case where the other side does not exist (optional), and cascade were not covered. The association in this lab is unidirectional: it points only from Order to Member. A check against execution on MySQL was not done.',
});

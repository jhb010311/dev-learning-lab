Lab.register({
  id: 'mapping', nav: 'Entity mapping and primary keys', cat: 'JPA', mode: 'step',
  title: 'How do the annotations on an entity change the table and the values that are stored?',
  intro: 'JPA reads the fields and annotations of an entity class and pairs them with the columns of a table. This is called mapping. Change the annotations and see how the table that Hibernate creates (the create table statement) and the values that are actually stored in the database change.',
  terms: ['@Column', '@Enumerated', '@Transient', 'Primary key generation strategy (@GeneratedValue)', 'Entity'],
  controls: [
    { id: 'col', label: 'name field', type: 'select', value: 'none', options: [['none', 'No @Column'], ['nn', '@Column(nullable = false)'], ['uq', '@Column(unique = true)'], ['len', '@Column(length = 20)']] },
    { id: 'en', label: 'grade field (enum)', type: 'select', value: 'ORDINAL', options: [['ORDINAL', '@Enumerated(EnumType.ORDINAL)'], ['STRING', '@Enumerated(EnumType.STRING)'], ['ORDINAL_ADD', 'ORDINAL + after saving, add a value at the front of the enum'], ['STRING_ADD', 'STRING + after saving, add a value at the front of the enum']], hint: 'A member with the VIP grade is saved. The enum starts out as BASIC, VIP, in that order.' },
    { id: 'tr', label: 'Put @Transient on the memo field', type: 'check', value: false },
    { id: 'pk', label: 'Primary key id', type: 'select', value: 'assigned', options: [['assigned', '@Id only: the code sets 100 itself'], ['auto', '@GeneratedValue(IDENTITY): the database assigns it'], ['forgot', '@Id only, and no value was set']] },
  ],
  presets: [
    { t: 'Default settings', d: 'Almost no annotations are used. VIP is stored as the number 1.', v: { col: 'none', en: 'ORDINAL', tr: false, pk: 'assigned' } },
    { t: 'Adding a value at the front of the enum', d: 'The VIP member that was saved is read back as BASIC.', v: { col: 'none', en: 'ORDINAL_ADD', tr: false, pk: 'assigned' } },
    { t: 'Storing as STRING', d: 'Even if the order of the enum changes, the member is still read back as VIP.', v: { col: 'none', en: 'STRING_ADD', tr: false, pk: 'assigned' } },
    { t: 'nullable = false on name', d: 'The table that is created gets not null.', v: { col: 'nn', en: 'STRING', tr: false, pk: 'assigned' } },
    { t: '@Transient on memo', d: 'No memo column is created, and the value is not stored.', v: { col: 'none', en: 'STRING', tr: true, pk: 'assigned' } },
    { t: 'Letting the database choose the primary key', d: 'Even if you do not set id, the database assigns 1.', v: { col: 'none', en: 'STRING', tr: true, pk: 'auto' } },
    { t: 'Without setting id', d: 'If you leave a field that has only @Id empty, saving throws an exception.', v: { col: 'none', en: 'STRING', tr: true, pk: 'forgot' } },
  ],
  code: function (c) {
    var ord = c.en.indexOf('ORDINAL') === 0, add = /_ADD$/.test(c.en), id = c.pk === 'auto' ? '1L' : '100L';
    return 'enum Grade { BASIC, VIP }\n\n@Entity\nclass Member {\n    @Id\n' + (c.pk === 'auto' ? '    @GeneratedValue(strategy = GenerationType.IDENTITY)\n' : '') + '    Long id;\n\n' +
      { none: '', nn: '    @Column(nullable = false)\n', uq: '    @Column(unique = true)\n', len: '    @Column(length = 20)\n' }[c.col] + '    String name;\n\n    @Enumerated(EnumType.' + (ord ? 'ORDINAL' : 'STRING') + ')\n    Grade grade;\n\n' + (c.tr ? '    @Transient\n' : '') + '    String memo;\n}\n\n' +
      '// Save one member\nMember m = new Member();\n' + (c.pk === 'assigned' ? 'm.setId(100L);\n' : c.pk === 'forgot' ? '// m.setId(...) was not called\n' : '') + 'm.setName("Alice");\nm.setGrade(Grade.VIP);\nm.setMemo("joined today");\n' + (c.pk === 'forgot' ? 'em.persist(m);            // id is null, so an exception is thrown here. The lines below do not run\n' : 'em.persist(m);\n') + 'em.getTransaction().commit();\n\n' +
      (add ?'// Later the enum was changed like this and redeployed (the table and the data are unchanged)\n// enum Grade { GUEST, BASIC, VIP }\n\n' : '') + '// Read it from the database again with a new em\nMember r = em2.find(Member.class, ' + id + ');\nSystem.out.println(r.getGrade() + ", " + r.getMemo());';
  },
  label: function (c) { return { none: 'No @Column', nn: 'nullable=false', uq: 'unique=true', len: 'length=20' }[c.col] + ' · ' + { ORDINAL: 'ORDINAL', STRING: 'STRING', ORDINAL_ADD: 'ORDINAL+value added', STRING_ADD: 'STRING+value added' }[c.en] + (c.tr ? ' · @Transient' : '') + ' · id ' + { assigned: 'set by code', auto: 'automatic', forgot: 'not set' }[c.pk]; },
  columns: ['name column', 'Value stored in grade', 'grade read back', 'memo column exists', 'Saved id'],
  // What was actually observed when values that break a constraint were inserted (after saving one member, a second member was saved with a name of null, the same name, and 21 characters). sent tells whether that INSERT reached the database
  viol: {
    none: { 'null': ['ok', 1], dup: ['ok', 1], 'long': ['ok', 1] },
    nn: { 'null': ['PropertyValueException', 0], dup: ['ok', 1], 'long': ['ok', 1] },
    uq: { 'null': ['ok', 1], dup: ['ConstraintViolationException', 1], 'long': ['ok', 1] },
    len: { 'null': ['ok', 1], dup: ['ok', 1], 'long': ['DataException', 1] },
  },
  simulate: function (c) {
    var ord = c.en.indexOf('ORDINAL') === 0, add = /_ADD$/.test(c.en), ev = [], sum = [];
    // The column definitions that Hibernate 7.4.5 generated for H2 (checked against the create table statement that was actually generated)
    var ddl = {
      id: c.pk === 'auto' ? 'bigint generated by default as identity' : 'bigint not null',
      name: { none: 'varchar(255)', nn: 'varchar(255) not null', uq: 'varchar(255) unique', len: 'varchar(20)' }[c.col],
      grade: ord ? 'tinyint check ((grade between 0 and 1))' : "enum ('BASIC','VIP')",
    };
    if (!c.tr) ddl.memo = 'varchar(255)';
    var st = { cols: [], row: null, en: ['BASIC', 'VIP'], read: null, err: '', step: '' };
    function push(s, k) { ev.push({ s: s, k: k, snap: JSON.parse(JSON.stringify(st)) }); }
    st.step = 'ddl';
    st.cols.push({ n: 'id', d: ddl.id, from: c.pk === 'auto' ? '@Id @GeneratedValue(IDENTITY)' : '@Id', pic: c.pk === 'auto' ? 'id bigint (auto-increment)' : 'id bigint not null', pk: true });
    push('When the application starts: Hibernate reads the Member class and generates the create table statement (when the application is set to create tables automatically). The id field marked with @Id becomes the primary key column. ' + (c.pk === 'auto' ? 'Because of @GeneratedValue(IDENTITY), "generated by default as identity" is added to the column. It means that the database assigns the number when the row is inserted.' : 'Because there is only @Id, it is an ordinary not null column. The code must supply the value.'), '');
    st.cols.push({ n: 'name', d: ddl.name, from: { none: '(no annotation)', nn: '@Column(nullable = false)', uq: '@Column(unique = true)', len: '@Column(length = 20)' }[c.col], pic: 'name ' + ddl.name, hot: c.col !== 'none' });
    push('name field: ' + { none: 'There is no @Column, so the column is created with the default settings. The length is 255 characters, and both null and duplicates are allowed.', nn: 'Because of nullable = false, not null is added to the column definition. You cannot put null in this column.', uq: 'Because of unique = true, unique is added to the column definition. You cannot insert two rows that have the same name.', len: 'Because of length = 20, the column is created as varchar(20) instead of varchar(255). A name longer than 20 characters does not fit.' }[c.col], '');
    st.cols.push({ n: 'grade', d: ddl.grade, from: '@Enumerated(EnumType.' + (ord ? 'ORDINAL' : 'STRING') + ')', pic: ord ? 'grade tinyint (only 0 to 1)' : "grade enum ('BASIC','VIP')" });
    push('grade field: ' + (ord ? 'ORDINAL stores the ordinal of the constant (its position in the enum declaration, counting from 0), so the column becomes a small integer column (tinyint). BASIC is 0 and VIP is 1. A condition (check) that the number is between 0 and 1 is also added.' : 'STRING stores the name of the enum constant as text, letter for letter. In this run, it was created as a column of an enum type that accepts only "BASIC" and "VIP".'), '');
    st.cols.push({ n: 'memo', d: c.tr ? '' : ddl.memo, from: c.tr ? '@Transient' : '(no annotation)', pic: c.tr ? '' : 'memo varchar(255)', hot: c.tr });
    push('memo field: ' + (c.tr ? 'It has @Transient, so it is left out of the mapping. No memo column is created in the table.' : 'There is no annotation, but a column is still created. Every field of an entity is paired with a column unless you leave it out with @Transient.'), '');
    st.step = 'save';
    var saved = c.pk !== 'forgot', id = c.pk === 'auto' ? 1 : 100, raw = ord ? '1' : 'VIP', idText, readGrade = 'Not saved', readMemo = '';
    if (!saved) {
      st.err = 'IdentifierGenerationException'; idText = 'Exception: IdentifierGenerationException';
      push('em.persist(m): id is null. A field that has only @Id must get its value from the code before it is saved, and no value was set, so IdentifierGenerationException is thrown. No INSERT was sent, and the table is empty.', 'bad');
    } else {
      st.row = { id: String(id), name: 'Alice', grade: raw }; if (!c.tr) st.row.memo = 'joined today';
      idText = c.pk === 'auto' ? '1 (assigned by the database)' : '100';
      push('em.persist(m) and commit: An INSERT is sent and one row is saved. ' + (c.pk === 'auto' ? 'The code did not set id, but the database assigned 1, and Hibernate fills that value into the id field of m.' : 'id is 100, exactly as the code set it.'), '');
      push('Values stored in the database: the grade column contains ' + (ord ? 'the number 1. This is because Grade.VIP is the second constant in the enum (ordinal 1). The text "VIP" does not appear anywhere in the database.' : 'the text "VIP" as it is.') + (c.tr ? ' The memo value "joined today" was not stored, because there is no column for it.' : ' The memo column contains "joined today".'), ord ? '' : 'good');
      if (add) {
        st.step = 'enum'; st.en = ['GUEST', 'BASIC', 'VIP'];
        push('Changing the enum and redeploying: GUEST was added at the front of Grade. The ordinals are now GUEST 0, BASIC 1, VIP 2. The values stored in the database did not change. The grade column still contains ' + (ord ? '1' : '"VIP"') + '.', '');
      }
      st.step = 'read';
      readGrade = ord && add ? 'BASIC' : 'VIP'; readMemo = c.tr ? 'null' : 'joined today';
      st.read = { grade: readGrade, memo: readMemo };
      push('em2.find(Member.class, ' + id + 'L): It is read from the database again. ' + (ord ? 'When the 1 in the grade column is converted to the constant whose ordinal is 1 in the current enum, the result is ' + readGrade + '.' + (add ? ' The member that was saved as VIP is read back as BASIC. No error is raised.' : '') : 'When "VIP" is converted to the constant that has the same name, the result is VIP.' + (add ? ' Changing the order of the enum has no effect.' : '')) + ' memo is ' + (c.tr ? 'null, because it was never stored.' : '"joined today".'), ord && add ? 'bad' : 'good');
    }
    sum.push('The name column was created as "' + ddl.name + '". ' + (saved ? 'The value stored in the grade column is ' + raw + ', and the grade read back is ' + readGrade + '. The memo column ' + (c.tr ? 'does not exist' : 'exists') + ', and the saved id is ' + id + '.' : 'Because id was not set, an exception was thrown when saving, and no row was saved.'));
    var tips = [];
    if (!saved) tips.push('If you add only @Id, the code must set the primary key value itself. To let the database assign the number, add @GeneratedValue as well. Conversely, if you add @GeneratedValue and then call persist with an id that you set yourself, an exception is thrown in that case too (EntityExistsException).');
    if (saved && c.en === 'ORDINAL') tips.push('ORDINAL stores the ordinal of the constant, that is, its position in the enum declaration. A number takes little space, but what the number means depends on the order in which the constants are written in the enum. Change the setting to "ORDINAL + after saving, add a value at the front of the enum".');
    if (saved && c.en === 'ORDINAL_ADD') tips.push('If the order of the enum changes after you save with ORDINAL, the number in the database stays the same, but the constant that the number points to changes. The member is read back with the wrong grade and no exception is thrown, so the problem is hard to notice. This is why STRING is recommended for @Enumerated. Also remember that the default when you do not add @Enumerated is ORDINAL.');
    if (saved && c.en === 'STRING') tips.push('STRING stores the name of the constant. It takes more space because it stores the letters of the name, but you can tell what a value means just by looking at it in the database, and the order of the enum does not matter.');
    if (saved && c.en === 'STRING_ADD') tips.push('STRING stores the name, so values that are already stored are read back correctly even if you add a value to the enum or change the order. If you do the same thing with ORDINAL, VIP is read back as BASIC.');
    if (c.col === 'nn') tips.push('nullable = false appears as not null in the table that is created. If you try to save a member whose name is null, it fails. In this run, Hibernate threw PropertyValueException before it sent the INSERT.');
    if (c.col === 'uq') tips.push('unique = true appears as unique in the table that is created. If you save one more member with the same name, the INSERT reaches the database and the database rejects it (ConstraintViolationException). Java does not check unique in advance. The constraint on the table prevents the duplicate.');
    if (c.col === 'len') tips.push('length = 20 appears as varchar(20) in the table that is created. If you save a name that is 21 characters long, the INSERT reaches the database and the database rejects it (DataException). If Hibernate does not create the table and you use a table that already exists, length and unique do nothing.');
    if (c.tr) tips.push('A field with @Transient has no column, and it is neither saved nor read. Use it for fields that do not need to be in the database, such as a value that is only displayed on screen or used during a calculation.');
    if (saved && c.pk === 'auto') tips.push('@GeneratedValue(IDENTITY) creates the primary key with the auto-increment feature of the database. After persist finishes, you can read the value that the database chose with m.getId(). With this strategy, if you set the id yourself and call persist, an exception is thrown (EntityExistsException).');
    if (c.col === 'none') tips.push('A string field without @Column is varchar(255) and allows null and duplicates. If a value is required or has a length limit, write it in @Column so that it appears as a constraint on the table.');
    if (!c.tr) tips.push('A field without any annotation also becomes a column. Add @Transient to a field that you do not want to store.');
    tips.slice(0, 3).forEach(function (x) { sum.push(x); });
    return { events: ev, summary: sum, ddl: ddl, readMemo: readMemo, row: [ddl.name, saved ? raw : 'Not saved', readGrade, c.tr ? 'No' : 'Yes', idText] };
  },
  render: function (v, sim, t, H, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : null;
    if (!s) { H.text(v, 'Click Run to move the fields into columns of the table, one at a time.'); return; }
    H.table(v, ['Annotation on the field', 'Column', 'Column definition created by Hibernate'], s.cols.map(function (k) { return { cls: k.d ? '' : 'gone', cells: [{ v: k.from, cls: k.hot ? 'hot' : '' }, k.n, k.d ? { v: k.d + (k.pk ? ' · primary key (id)' : ''), cls: k.hot ? 'hot' : '' } : '(no column)'] }; }), 'create table member (...)');
    var names = s.cols.filter(function (k) { return k.d; }).map(function (k) { return k.n; });
    if (s.row) H.table(v, names, [{ cells: names.map(function (n) { return n === 'grade' ? { v: s.row[n], cls: 'hot' } : s.row[n] === undefined ? '' : s.row[n]; }) }], 'Row stored in the database');
    else if (s.err) { H.title(v, 'Row stored in the database'); H.text(v, 'There is none. ' + s.err + ' was thrown.'); }
    var ln = H.lanes(v);
    H.lane(ln, 'enum Grade', s.en.map(function (g, i) { return g + '(' + i + ')'; }).join(', '), s.en.length === 3 ? 'hot' : 'none');
    H.lane(ln, 'Object read back', s.read ? 'grade = ' + s.read.grade + ', memo = ' + s.read.memo : s.err ? 'No row was saved' : 'Not read yet', s.read ? (s.read.grade === 'VIP' ? 'good' : 'bad') : s.err ? 'bad' : 'none');
  },
  // Diagram: the four fields of the entity are on the left and the columns of the table are on the right. For each field, it connects the column that is created (or not created) with the value stored in that column.
  draw: function (P, sim, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : { cols: [], row: null, en: ['BASIC', 'VIP'], read: null, err: '', step: '' }, c = sim.c;
    var ord = c.en.indexOf('ORDINAL') === 0;
    var fields = [
      { n: 'id', a: c.pk === 'auto' ? '@Id @GeneratedValue(IDENTITY)' : '@Id', f: 'Long id' },
      { n: 'name', a: { none: '(no annotation)', nn: '@Column(nullable = false)', uq: '@Column(unique = true)', len: '@Column(length = 20)' }[c.col], f: 'String name' },
      { n: 'grade', a: '@Enumerated(EnumType.' + (ord ? 'ORDINAL' : 'STRING') + ')', f: 'Grade grade' },
      { n: 'memo', a: c.tr ? '@Transient' : '(no annotation)', f: 'String memo' },
    ];
    P.size(680, 340);
    P.region('ent', 16, 16, 290, 252, 'Entity class Member');
    P.region('tbl', 374, 16, 290, 252, 'member table');
    fields.forEach(function (f, i) {
      var k = s.cols[i], y = 50 + i * 53;
      P.box('f_' + f.n, 28, y, 266, 46, { cls: k ? 'wait' : 'plain', title: f.a, sub: f.f });
      if (!k) { P.box('c_' + f.n, 386, y, 266, 46, { cls: 'ghost', sub: 'Not created yet', center: true }); return; }
      if (!k.d) { P.box('c_' + f.n, 386, y, 266, 46, { cls: 'ghost', title: 'No column', sub: 'Not stored' }); return; }
      var val = s.row ? (f.n === 'grade' ? 'Stored value: ' + s.row.grade : 'Stored value: ' + s.row[f.n]) : s.err ? 'No stored value' : 'Not stored yet';
      P.box('c_' + f.n, 386, y, 266, 46, { cls: s.row && f.n === 'grade' ? 'hot' : s.row ? 'good' : 'plain', title: k.pic, sub: val });
      P.arrow('a_' + f.n, 'f_' + f.n + ':r', 'c_' + f.n + ':l', { cls: s.cols.length === i + 1 && s.step === 'ddl' ? 'hot' : 'mut' });
    });
    P.box('r1', 16, 284, 300, 40, { cls: s.en.length === 3 ? 'hot' : 'plain', title: 'enum Grade', right: s.en.map(function (g, i) { return g + ' ' + i; }).join(', ') });
    P.box('r2', 324, 284, 340, 40, { cls: s.read ? (s.read.grade === 'VIP' ? 'good' : 'bad') : s.err ? 'bad' : 'ghost', title: 'grade read back', right: s.read ? s.read.grade : s.err ? 'Save failed (exception)' : '?' });
    P.note('Each field on the left is paired with one column on the right. The annotations decide what shape the column is created in and what value is stored in it. The column definitions in the diagram are shortened. The definitions that were actually created are in the table on the right.');
  },
  assume: 'For each of the 96 combinations, an entity class was generated as source code, compiled, run on real Hibernate 7.4.5 with an H2 database, and checked against the results. What was checked: all the column definitions in the create table statement that Hibernate generated, the values in the row stored in the database, grade and memo read back with a new em, and the saved id or the kind of exception. The following facts stated in the summary were also run and confirmed separately: an enum field without @Enumerated is created and stored exactly like ORDINAL; whether saving succeeds or fails for a member whose name is null, a duplicate name, or 21 characters (the kind of exception, and whether the INSERT reached the database); that unique and length do nothing when Hibernate does not create the table; and that an exception is thrown when you set the id yourself with the automatic generation strategy. Column definitions differ by database type (dialect) and Hibernate version. The tinyint and check condition, the enum type column, and "generated by default as identity" shown here were generated by Hibernate 7.4.5 for H2. On MySQL, for example, the automatic increment is written as auto_increment. The MySQL notation, and the fact that older Hibernate (5.x) created STRING as varchar(255), follow the documentation and were not run here. Even so, the point that "ORDINAL stores the ordinal and STRING stores the name" is the same. In the real create table statement, the columns appear in a different order from the screen, and unless you use Spring Boot, the table name is written exactly as the class name (Member). Only IDENTITY was covered for automatic generation, and the difference in when the INSERT is sent is covered in the persistence context lab. In production, the setting that creates tables automatically is usually not used, and then unique and length in @Column serve only as documentation.',
});

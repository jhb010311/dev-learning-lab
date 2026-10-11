Lab.register({
  id: 'inheritmap', nav: 'Inheritance mapping', cat: 'JPA', mode: 'step',
  title: 'In how many tables, and how, are inherited classes stored?',
  intro: 'Java has inheritance, but the tables of a relational database do not. So you have to choose how to store a superclass Item and its subclasses Book, Album, and Movie in tables. JPA has three strategies, and the one you choose changes the number and shape of the tables, the number of INSERTs when you save, and the shape of the queries when you load.',
  terms: ['Inheritance mapping', 'Joined subclass strategy (JOINED)', 'Single table per class hierarchy strategy (SINGLE_TABLE)', 'Table per concrete class strategy (TABLE_PER_CLASS)', 'JOIN (INNER, OUTER)'],
  controls: [
    { id: 'st', label: 'Inheritance mapping strategy', type: 'select', value: 'JOINED', options: [['JOINED', 'Joined subclass strategy (JOINED)'], ['SINGLE_TABLE', 'Single table per class hierarchy strategy (SINGLE_TABLE)'], ['TABLE_PER_CLASS', 'Table per concrete class strategy (TABLE_PER_CLASS)']] },
    { id: 'op', label: 'What to do', type: 'select', value: 'save', options: [['save', 'Save one Book'], ['findc', 'Find by the subclass type: em.find(Book.class, 1L)'], ['findp', 'Find by the superclass type: em.find(Item.class, 1L)']] },
    { id: 'kids', label: 'Number of subclasses', type: 'range', min: 1, max: 3, value: 3, step: 1, fmt: function (v) { return v + (v === 1 ? ' subclass' : ' subclasses'); }, hint: 'With 1, there is only Book. With 2, there are Book and Album. With 3, Movie is included too.' },
  ],
  presets: [
    { t: 'Default settings', d: 'You save one Book with the joined subclass strategy. There is one object, but 2 INSERTs are sent.', v: { st: 'JOINED', op: 'save', kids: 3 } },
    { t: 'Joined subclass: find by the superclass type', d: 'It does not know which subclass the row belongs to, so it joins all the subclass tables.', v: { st: 'JOINED', op: 'findp', kids: 3 } },
    { t: 'Single table: save', d: 'One INSERT into one table. The columns of the other subclasses are left as null.', v: { st: 'SINGLE_TABLE', op: 'save', kids: 3 } },
    { t: 'Single table: find by the superclass type', d: 'It reads only one table, with no join.', v: { st: 'SINGLE_TABLE', op: 'findp', kids: 3 } },
    { t: 'Table per concrete class: save', d: 'There is no superclass table, and one INSERT goes into the subclass table.', v: { st: 'TABLE_PER_CLASS', op: 'save', kids: 3 } },
    { t: 'Table per concrete class: find by the superclass type', d: 'It combines all the subclass tables with UNION to search them.', v: { st: 'TABLE_PER_CLASS', op: 'findp', kids: 3 } },
    { t: 'Joined subclass: find by the subclass type', d: 'It joins only the subclass table and the superclass table.', v: { st: 'JOINED', op: 'findc', kids: 3 } },
  ],
  KIDS: [['Book', 'author'], ['Album', 'artist'], ['Movie', 'actor']],
  // The tables that are created for the strategy and the number of subclasses: [{ name, cols }]
  tablesOf: function (st, kids) {
    var ks = this.KIDS.slice(0, kids);
    if (st === 'JOINED') return [{ name: 'item', cols: ['id', 'name', 'price'] }].concat(ks.map(function (k) { return { name: k[0].toLowerCase(), cols: ['id', k[1]] }; }));
    if (st === 'SINGLE_TABLE') return [{ name: 'item', cols: ['dtype', 'id', 'name', 'price'].concat(ks.map(function (k) { return k[1]; })) }];
    return ks.map(function (k) { return { name: k[0].toLowerCase(), cols: ['id', 'name', 'price', k[1]] }; });
  },
  code: function (c) {
    var ks = this.KIDS.slice(0, +c.kids);
    var s = '@Entity\n@Inheritance(strategy = InheritanceType.' + c.st + ')\nabstract class Item {\n    @Id\n    Long id;\n    String name;\n    int price;\n}\n';
    ks.forEach(function (k) { s += '\n@Entity\nclass ' + k[0] + ' extends Item {\n    String ' + k[1] + ';\n}\n'; });
    s += '// Constructors are omitted\n\n';
    if (c.op === 'save') return s + '// Inside a transaction\nBook book = new Book(1L, "Java", 20000, "Alice");\nem.persist(book);\n// Transaction commit';
    return s + '// A Book with id 1 is stored\n' + (c.op === 'findc' ? 'Book book = em.find(Book.class, 1L);        // find by the subclass type' : 'Item item = em.find(Item.class, 1L);        // find by the superclass type');
  },
  label: function (c) { return { JOINED: 'Joined subclass', SINGLE_TABLE: 'Single table', TABLE_PER_CLASS: 'Table per concrete class' }[c.st] + ' · ' + { save: 'Save a Book', findc: 'Find as Book', findp: 'Find as Item' }[c.op] + ' · ' + (+c.kids) + (+c.kids === 1 ? ' subclass' : ' subclasses'); },
  columns: ['Tables created', 'SQL sent', 'Tables read or written', 'Join / UNION'],
  simulate: function (c) {
    var st = c.st, op = c.op, kids = +c.kids, ks = this.KIDS.slice(0, kids), tables = this.tablesOf(st, kids), ev = [], sum = [];
    var kidNames = ks.map(function (k) { return k[0].toLowerCase(); }), others = kidNames.slice(1);
    // The rows of each table when one Book has been saved
    var full = {};
    tables.forEach(function (t) { full[t.name] = []; });
    if (st === 'JOINED') { full.item = [['1', 'Java', '20000']]; full.book = [['1', 'Alice']]; }
    if (st === 'SINGLE_TABLE') full.item = [['Book', '1', 'Java', '20000', 'Alice'].concat(others.map(function () { return 'null'; }))];
    if (st === 'TABLE_PER_CLASS') full.book = [['1', 'Java', '20000', 'Alice']];
    var s = { line: -2, obj: '', rows: {}, sent: [], hot: [], how: '', found: '' };
    tables.forEach(function (t) { s.rows[t.name] = op === 'save' ? [] : full[t.name]; });
    var init = JSON.parse(JSON.stringify(s));
    function push(line, text, k) { s.line = line; ev.push({ s: text, k: k, snap: JSON.parse(JSON.stringify(s)) }); }
    function send(kind, tbls, sql, when) { s.sent.push({ kind: kind, tables: tbls, sql: sql, at: when }); s.hot = tbls; }
    var touched = [], joins = 0, innerJoins = 0, unions = 0, dtypeInWhere = false, L, before = '-';
    var names = tables.map(function (t) { return t.name; });

    if (op === 'save') {
      L = ['Book book = new Book(1L, "Java", 20000, "Alice");', 'em.persist(book);'];
      s.obj = 'new';
      push(0, 'new Book(1L, "Java", 20000, "Alice"): Creates one Book object. The id, name, and price inherited from the superclass Item and the author declared by Book are all together in this one object.', '');
      s.obj = 'managed';
      push(1, 'em.persist(book): Hands the object to the persistence context. You set the id in the code yourself, so there is nothing to ask the DB, and the INSERT is not sent right away. It is postponed until commit.', '');
      before = '0';
      if (st === 'JOINED') {
        s.rows.item = full.item; send('insert', ['item'], "insert into item (id, name, price) values (1, 'Java', 20000)", 'Just before commit');
        push(-1, 'Transaction commit, first INSERT: With the joined subclass strategy, the fields of the superclass (id, name, price) go into the superclass table item. First, one row is inserted into item.', '');
        s.rows.book = full.book; send('insert', ['book'], "insert into book (id, author) values (1, 'Alice')", 'Just before commit');
        push(-1, 'Second INSERT: The field that only Book has (author) goes into the subclass table book. The id of book is both its primary key and a foreign key that points to the id of item. Saving one object took 2 INSERTs.', 'bad');
        touched = ['item', 'book'];
        sum.push('The joined subclass strategy creates a separate table for the superclass and for each subclass, and splits one object between two tables. The tables are tidy, because no value is written twice and there are no empty cells, but saving costs 2 INSERTs.');
      } else if (st === 'SINGLE_TABLE') {
        s.rows.item = full.item; send('insert', ['item'], "insert into item (dtype, id, name, price, author) values ('Book', 1, 'Java', 20000, 'Alice')", 'Just before commit');
        push(-1, 'Transaction commit, INSERT: The single table strategy has only one table, item. All the fields go into one row, and the discriminator column dtype records which subclass the row belongs to, here "Book".' + (others.length ? ' The columns of the other subclasses (' + ks.slice(1).map(function (k) { return k[1]; }).join(', ') + ') have no values to insert, so they are left as null.' : ''), others.length ? '' : 'good');
        touched = ['item'];
        sum.push('The single table strategy finishes with one INSERT. ' + (others.length ? 'In exchange, the columns of all the subclasses are in one table, so the columns that do not belong to a row are null. That is why the columns of the subclasses must allow null.' : 'Right now Book is the only subclass, so there are no empty cells. Increase the number of subclasses and you will see the columns of the other subclasses left as null.'));
      } else {
        s.rows.book = full.book; send('insert', ['book'], "insert into book (id, name, price, author) values (1, 'Java', 20000, 'Alice')", 'Just before commit');
        push(-1, 'Transaction commit, INSERT: This strategy has no superclass table item. The subclass table book has all the fields as columns, including those of the superclass (id, name, price), so inserting one row into book is enough.', 'good');
        touched = ['book'];
        sum.push('The table per concrete class strategy creates only the subclass tables, and it repeats the superclass columns in every subclass table. Saving finishes with one INSERT. The weakness of this strategy shows when you find by the superclass type.');
      }
    } else if (op === 'findc') {
      L = ['Book book = em.find(Book.class, 1L);'];
      if (st === 'JOINED') {
        push(0, 'em.find(Book.class, 1L): To fill a Book object, you need id, name, price, and author. With the joined subclass strategy, the first three are in the item table and author is in the book table.', '');
        send('select', ['book', 'item'], 'select b.id, i.name, i.price, b.author from book b join item i on b.id = i.id where b.id = 1', 'Line 1'); s.how = 'join'; s.found = 'Book';
        push(0, 'One SELECT: Reads book and item together by joining them on id. There is no need to look at the other subclass tables, so there is 1 join. A Book object is created.', '');
        touched = ['book', 'item']; joins = 1; innerJoins = 1;
        sum.push('When you find by a subclass type with the joined subclass strategy, only that subclass table and the superclass table are joined. No matter how many subclasses there are, there is 1 join.');
      } else if (st === 'SINGLE_TABLE') {
        push(0, 'em.find(Book.class, 1L): With the single table strategy, all the fields of Book are in one place, the item table. However, rows of other subclasses may also be mixed into this table.', '');
        send('select', ['item'], "select id, name, price, author from item where dtype = 'Book' and id = 1", 'Line 1'); s.how = 'one'; s.found = 'Book';
        push(0, 'One SELECT: Reads only the item table. There is no join. In addition to the id condition, a discriminator column condition (dtype is "Book") is added, so a row that is not a Book is filtered out even if its id is 1.', 'good');
        touched = ['item']; dtypeInWhere = true;
        sum.push('The single table strategy reads one table with no join. When you find by a subclass type, a condition on the discriminator column (dtype) selects only the rows of that subclass.');
      } else {
        push(0, 'em.find(Book.class, 1L): With this strategy, all the fields of Book, including the ones inherited from the superclass, are in one place, the book table.', '');
        send('select', ['book'], 'select id, name, price, author from book where id = 1', 'Line 1'); s.how = 'one'; s.found = 'Book';
        push(0, 'One SELECT: Reads only the book table. It needs neither a join nor a discriminator column.', 'good');
        touched = ['book'];
        sum.push('With the table per concrete class strategy, finding by a subclass type needs to read only the one table of that subclass. It is a simple query with neither a join nor a discriminator column condition.');
      }
    } else {
      L = ['Item item = em.find(Item.class, 1L);'];
      var kidClasses = ks.map(function (k) { return k[0]; }).join(', ');
      push(0, kids > 1 ? 'em.find(Item.class, 1L): Item is an abstract class, so the actual object is one of the subclasses (' + kidClasses + '). But JPA does not yet know which subclass has id 1.' : 'em.find(Item.class, 1L): Item is an abstract class, so the actual object is an object of a subclass. Right now Book is the only subclass.', '');
      if (st === 'JOINED') {
        send('select', ['item'].concat(kidNames), 'select i.*, ' + kidNames.map(function (k) { return k.charAt(0) + '.*'; }).join(', ') + ' from item i ' + kidNames.map(function (k) { return 'left join ' + k + ' ' + k.charAt(0) + ' on i.id = ' + k.charAt(0) + '.id'; }).join(' ') + ' where i.id = 1', 'Line 1'); s.how = 'join';
        push(0, kids > 1 ? 'One SELECT: It does not know which subclass, so it reads item with all ' + kids + ' subclass tables attached by left join. That is ' + kids + ' joins.' : 'One SELECT: Reads item with the subclass table book attached by left join. That is 1 join. If you add subclasses, the number of joins grows by the same amount.', kids > 1 ? 'bad' : '');
        s.found = 'Book';
        push(0, 'Checking the result: Among the subclass tables, only book has a row attached for id 1. Based on that, it creates a Book object and returns it. The type of the variable is Item, but the actual object is a Book.', '');
        touched = ['item'].concat(kidNames); joins = kids;
        sum.push('When you find by the superclass type with the joined subclass strategy, all the subclass tables are joined. There are ' + kids + (kids === 1 ? ' subclass' : ' subclasses') + ', so there ' + (kids === 1 ? 'is ' : 'are ') + kids + (kids === 1 ? ' join' : ' joins') + '. If you add subclasses, the number of joins grows by the same amount.');
      } else if (st === 'SINGLE_TABLE') {
        send('select', ['item'], 'select * from item where id = 1', 'Line 1'); s.how = 'one';
        push(0, 'One SELECT: All the subclasses are in the one item table, so it reads using only the id condition. There is no join, and no discriminator column condition is added either.', 'good');
        s.found = 'Book';
        push(0, 'Checking the result: The dtype of the row it read is "Book". Based on that, it creates a Book object and returns it. The type of the variable is Item, but the actual object is a Book.', '');
        touched = ['item'];
        sum.push('With the single table strategy, finding by the superclass type also reads just one table. Which subclass it is gets decided from the discriminator column (dtype) of the row it read. When there are several subclasses, this is the only strategy for which finding by the superclass type needs neither a join nor a UNION.');
      } else {
        unions = kids - 1;
        send('select', kidNames, 'select * from (' + kidNames.map(function (k) { return 'select ... from ' + k; }).join(' union all ') + ') where id = 1', 'Line 1'); s.how = kids > 1 ? 'union' : 'one';
        push(0, kids > 1 ? 'One SELECT: There is no superclass table, so there is no way to know which subclass table has id 1. It chains all ' + kids + ' subclass tables together with UNION ALL and then looks for id 1 in the result.' : 'One SELECT: Book is the only subclass, so reading the book table is enough. If there are two or more subclasses, it has to chain all the subclass tables together with UNION ALL.', kids > 1 ? 'bad' : '');
        s.found = 'Book';
        push(0, 'Checking the result: ' + (kids > 1 ? 'Among the chained rows, the one that came from book has id 1. ' : '') + 'It creates a Book object and returns it. The type of the variable is Item, but the actual object is a Book.', '');
        touched = kidNames;
        sum.push(kids > 1 ? 'When you find by the superclass type with the table per concrete class strategy, all ' + kids + ' subclass tables have to be combined with UNION ALL. If you add subclasses, the number of tables to combine grows by the same amount. If you ever need to find by the superclass type, it is better to avoid this strategy.' : 'With only one subclass, no UNION is needed.');
      }
    }
    var kindText = op === 'save' ? 'INSERT: ' + s.sent.length : 'SELECT: ' + s.sent.length;
    var shapeText = op === 'save' ? 'Not applicable' : joins ? 'Joins: ' + joins : unions ? 'UNION ALL: ' + unions + ' (' + kids + ' tables)' : 'None';
    return { events: ev, summary: sum, L: L, init: init, tables: tables, sent: s.sent, before: before, touched: touched, joins: joins, innerJoins: innerJoins, unions: unions, dtypeInWhere: dtypeInWhere, found: op === 'save' ? '-' : 'Book', rows: full, kidList: ks, fks: st === 'JOINED' ? kidNames.map(function (k) { return [k, 'id', 'item']; }) : [],
      row: [names.join(', ') + ' (' + names.length + (names.length === 1 ? ' table' : ' tables') + (st === 'SINGLE_TABLE' ? ', ' + tables[0].cols.length + ' columns' : '') + ')', kindText, touched.join(', '), shapeText] };
  },
  render: function (v, sim, t, H, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : sim.init, c = sim.c;
    H.table(v, ['Line', 'Code', ''], sim.L.map(function (l, i) { var on = i === s.line; return { cells: [String(i + 1), { v: l, cls: on ? 'hot' : '' }, on ? '← now' : ''] }; }).concat(c.op === 'save' ? [{ cells: ['', { v: '(transaction commit)', cls: s.line === -1 ? 'hot' : '' }, s.line === -1 ? '← now' : ''] }] : []), 'Running code');
    if (c.op !== 'save') H.counters(v, [[s.found || '?', 'Type of the returned object']]);
    if (s.sent.length) H.table(v, ['#', 'SQL', 'Sent at'], s.sent.map(function (q, i) { return { cells: [String(i + 1), q.sql, q.at] }; }), 'SQL sent to the DB');
  },
  // Diagram: at the top is the Java inheritance (the superclass Item and its subclasses), and at the bottom are the tables created for the strategy. The tables that SQL touched are shown in yellow.
  draw: function (P, sim, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : sim.init, c = sim.c, ks = sim.kidList, n = ks.length, st = c.st;
    P.size(680, 316);
    P.region('cl', 8, 8, 664, 104, 'Java classes');
    P.box('c_item', 240, 28, 200, 26, { cls: 'plain', title: 'Item (id, name, price)', center: true });
    var cx = n === 1 ? [264] : n === 2 ? [150, 378] : [72, 264, 456];
    ks.forEach(function (k, i) {
      P.box('c_' + k[0], cx[i], 76, 152, 26, { cls: i === 0 && s.obj ? 'wait' : 'plain', title: k[0] + ' (' + k[1] + ')', center: true });
      P.arrow('ex_' + k[0], 'c_' + k[0] + ':t', 'c_item:b', { cls: 'mut' });
    });
    P.region('db', 8, 120, 664, 128, 'DB tables · ' + { JOINED: 'Joined subclass strategy', SINGLE_TABLE: 'Single table per class hierarchy strategy', TABLE_PER_CLASS: 'Table per concrete class strategy' }[st]);
    var pos;
    if (st === 'SINGLE_TABLE') pos = [[110, 460]];
    else if (st === 'JOINED') pos = n === 1 ? [[150, 170], [360, 170]] : n === 2 ? [[60, 170], [255, 170], [450, 170]] : [[16, 156], [180, 156], [344, 156], [508, 156]];
    else pos = n === 1 ? [[234, 212]] : n === 2 ? [[110, 212], [358, 212]] : [[16, 212], [234, 212], [452, 212]];
    sim.tables.forEach(function (tb, i) {
      var rows = s.rows[tb.name] || [], hot = s.hot.indexOf(tb.name) >= 0;
      P.box('t_' + tb.name, pos[i][0], 152, pos[i][1], 82, { cls: hot ? 'hot' : rows.length ? 'plain' : 'ghost', title: tb.name + ' table', sub: [tb.cols.join(' · ')].concat(rows.length ? rows.map(function (r) { return r.join(' · '); }) : ['(no rows)']) });
    });
    var how = { join: 'Joins ' + s.hot.length + ' yellow tables on id', union: 'Combines ' + s.hot.length + ' yellow tables with UNION ALL', one: 'Reads one yellow table only' }[s.how] || '';
    var ins = s.sent.filter(function (q) { return q.kind === 'insert'; }).length;
    P.box('res', 16, 258, 648, 38, c.op === 'save' ? { cls: ins > 1 ? 'bad' : ins ? 'good' : 'ghost', title: 'INSERTs sent when saving one Book', right: String(ins) } : { cls: !how ? 'ghost' : s.how === 'one' ? 'good' : s.hot.length > 2 ? 'bad' : 'plain', title: c.op === 'findc' ? 'Query for em.find(Book.class, 1L)' : 'Query for em.find(Item.class, 1L)', right: how || 'Not run yet' });
    P.note('The top shows the Java class inheritance and the bottom shows the tables created to store it. A yellow table is one where the SQL of this step inserted or read rows.');
  },
  assume: 'This lab assumes that the superclass Item is an abstract class and that each subclass has only one field. The primary key is set directly in the code, because the IDENTITY strategy cannot be used with the table per concrete class strategy (it was confirmed that Hibernate 7.4.5 throws a MappingException at startup). All 27 combinations (3 strategies, 3 things to do, and 1, 2, or 3 subclasses) were run on Hibernate 7.4.5 and an H2 database with code of the same structure, and the following were confirmed to match the screen: the tables and columns that were created, the foreign keys from the subclass tables to the superclass table, the kinds of SQL sent and how many times for each table, the tables read by the find query and the number of joins and UNIONs, whether a discriminator column condition is added, the type of the returned object, and the rows left in the DB. With the joined subclass strategy and the table per concrete class strategy, Hibernate also creates temporary tables (their names start with ht_ or hte_) for bulk update queries. They have nothing to do with the mapping, so they are left out of the screen. That the joined subclass strategy has no discriminator column (DTYPE) is Hibernate\'s default behavior, and it was also confirmed by running that adding @DiscriminatorColumn creates a dtype column in the item table. It was also confirmed that if you do not write @Inheritance at all, the same table as the single table strategy is created. The SQL statements on the screen are shortened to be easy to read, so they are not letter-for-letter the same as the actual statements. In the actual SQL, a find by the superclass type tells the subclasses apart with a CASE expression in the joined subclass strategy, and with a number attached to each subclass in the table per concrete class strategy. The order of the columns inside a table may also differ from the actual one.',
});

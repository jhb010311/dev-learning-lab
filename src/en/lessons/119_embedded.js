Lab.register({
  id: 'embedded', nav: 'Value types and embeddable types', cat: 'JPA', mode: 'step',
  title: 'How is a class that groups an address stored in a table, and why make it immutable?',
  intro: 'Values that always go together, such as a city and a street, are easier to handle when you group them in a class like Address. A class like this has no id, and the values it holds are all there is to it, so it is called a value type. Unlike an entity, a value type does not have its own table. It is stored as part of the entity that holds it. Here you see three scenes: what shape the table takes, what happens when two entities share the same Address object, and what SQL is sent when you change a collection that holds several value types.',
  terms: ['Value type', 'Embeddable type (@Embeddable)', 'Element collection (@ElementCollection)', 'Immutable object', 'Dirty checking'],
  controls: [
    { id: 'sc', label: 'Scene to view', type: 'select', value: 'share', options: [['table', 'How an embeddable type is stored in the table'], ['share', 'When two members share the same address object'], ['coll', 'When you change one address in an element collection']] },
    { id: 'tb', label: 'How to hold the address in Member', type: 'select', value: 'emb', options: [['emb', 'Group the address into the embeddable type Address'], ['plain', 'Do not group it; keep the city and street fields as they are'], ['nul', 'Group it into Address, and save a member whose address is null'], ['two', 'Use Address twice (home address, work address)'], ['twoov', 'Use Address twice and rename the columns with @AttributeOverride']], show: function (c) { return c.sc === 'table'; } },
    { id: 'sh', label: 'How to put the address into the two members and change it', type: 'select', value: 'same', options: [['same', 'Put in the same object and change it with setCity'], ['copy', 'Put in a copied object and change it with setCity'], ['fixed', 'Immutable value type: put in the same object and replace it with a new object']], show: function (c) { return c.sc === 'share'; } },
    { id: 'ct', label: 'Kind of element collection', type: 'select', value: 'list', options: [['list', 'List<Address>'], ['set', 'Set<Address>'], ['setnn', 'Set<Address>, and all the columns are NOT NULL'], ['order', 'List<Address> with @OrderColumn']], show: function (c) { return c.sc === 'coll'; } },
    { id: 'op', label: 'What to do to the collection', type: 'select', value: 'mod', options: [['mod', 'Change one address (remove Boston and add Portland)'], ['add', 'Add one address (Portland)'], ['del', 'Remove one address (Boston)']], show: function (c) { return c.sc === 'coll'; } },
    { id: 'n', label: 'Number of addresses already stored', type: 'range', min: 2, max: 5, value: 3, step: 1, fmt: function (v) { return v + ''; }, show: function (c) { return c.sc === 'coll'; } },
  ],
  presets: [
    { t: 'Default settings', d: 'The city was changed only for Alice, but Bob\'s row is UPDATEd as well.', v: { sc: 'share', tb: 'emb', sh: 'same', ct: 'list', op: 'mod', n: 3 } },
    { t: 'Putting in a copy', d: 'The objects are separate, so only Alice\'s row is UPDATEd.', v: { sc: 'share', tb: 'emb', sh: 'copy', ct: 'list', op: 'mod', n: 3 } },
    { t: 'Making the value type immutable', d: 'There is no setter, so there is no way to change the shared object.', v: { sc: 'share', tb: 'emb', sh: 'fixed', ct: 'list', op: 'mod', n: 3 } },
    { t: 'Table of an embeddable type', d: 'No Address table is created. The fields become columns of the member table.', v: { sc: 'table', tb: 'emb', sh: 'same', ct: 'list', op: 'mod', n: 3 } },
    { t: 'Using the same value type twice', d: 'The column names collide, so an exception is thrown at startup.', v: { sc: 'table', tb: 'two', sh: 'same', ct: 'list', op: 'mod', n: 3 } },
    { t: 'Changing only one value in an element collection', d: 'All the addresses of that member are deleted and inserted again.', v: { sc: 'coll', tb: 'emb', sh: 'same', ct: 'list', op: 'mod', n: 3 } },
    { t: 'With a Set and all columns NOT NULL', d: 'Only the changed row is deleted and inserted.', v: { sc: 'coll', tb: 'emb', sh: 'same', ct: 'setnn', op: 'mod', n: 3 } },
  ],
  CITY: ['Boston', 'Denver', 'Chicago', 'Austin', 'Seattle'],
  // The lines of code that run in each scene
  lines: function (c) {
    if (c.sc === 'table') {
      var first = c.tb === 'plain' ? 'Member member = new Member("Alice", "Boston", "Main St");' : c.tb === 'nul' ? 'Member member = new Member("Alice", null);' : c.tb === 'emb' ? 'Member member = new Member("Alice", new Address("Boston", "Main St"));' : 'Member member = new Member("Alice", new Address("Boston", "Main St"), new Address("Dallas", "Oak Ave"));';
      var L = ['// When the application starts, Hibernate creates the table', first, 'em.persist(member);', '// Transaction commit'];
      if (c.tb === 'emb' || c.tb === 'nul') L.push('Member found = em.find(Member.class, 1L);    // In a new transaction', 'Address address = found.getAddress();');
      return L;
    }
    if (c.sc === 'share') return ['Address addr = new Address("Boston", "Main St");', 'Member member1 = new Member("Alice", addr);',
      c.sh === 'copy' ? 'Member member2 = new Member("Bob", new Address(addr.getCity(), addr.getStreet()));' : 'Member member2 = new Member("Bob", addr);',
      'em.persist(member1);', 'em.persist(member2);',
      c.sh === 'fixed' ? 'member1.setAddress(new Address("Denver", addr.getStreet()));' : 'member1.getAddress().setCity("Denver");', '// Transaction commit'];
    var out = ['Member member = em.find(Member.class, 1L);'];
    if (c.op !== 'add') out.push('member.getHistory().remove(new Address("Boston", "1 Main St"));');
    if (c.op !== 'del') out.push('member.getHistory().add(new Address("Portland", "9 Main St"));');
    out.push('// Transaction commit');
    return out;
  },
  code: function (c) {
    var id = '    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)\n    Long id;\n    String name;\n', run = this.lines(c).join('\n'), s;
    if (c.sc === 'table') {
      if (c.tb === 'plain') return '@Entity\nclass Member {\n' + id + '    String city;                 // the address is not grouped; the fields stay as they are\n    String street;\n}\n// Constructors are omitted\n\n' + run;
      s = '@Embeddable                      // value type. It has no table of its own\nclass Address {\n    String city;\n    String street;\n}\n\n@Entity\nclass Member {\n' + id + '\n';
      if (c.tb === 'emb' || c.tb === 'nul') s += '    @Embedded\n    Address address;\n';
      else s += '    @Embedded\n    Address homeAddress;         // home address\n\n    @Embedded\n' + (c.tb === 'twoov' ? '    @AttributeOverrides({\n        @AttributeOverride(name = "city", column = @Column(name = "work_city")),\n        @AttributeOverride(name = "street", column = @Column(name = "work_street"))\n    })\n' : '') + '    Address workAddress;         // work address' + (c.tb === 'two' ? ' (the column names were not changed)' : '') + '\n';
      return s + '}\n// Constructors and getters are omitted\n\n' + run;
    }
    if (c.sc === 'share') {
      s = '@Embeddable\nclass Address {\n    String city;\n    String street;\n' + (c.sh === 'fixed' ? '    // There is no setter. To change a value, you have to create a new object (immutable)\n' : '\n    void setCity(String city) { this.city = city; }   // the value can be changed\n') + '}\n\n@Entity\nclass Member {\n' + id + '\n    @Embedded\n    Address address;\n}\n// Constructors and getters' + (c.sh === 'fixed' ? ' (and setAddress of Member)' : '') + ' are omitted\n\n// Inside a transaction\n';
      return s + run;
    }
    var nn = c.ct === 'setnn', set = c.ct === 'set' || nn;
    s = '@Embeddable\nclass Address {\n' + (nn ? '    @Column(nullable = false)\n    String city;\n    @Column(nullable = false)\n    String street;\n' : '    String city;\n    String street;\n') + '    // equals and hashCode are overridden to compare city and street\n}\n\n@Entity\nclass Member {\n' + id + '\n    @ElementCollection\n    @CollectionTable(name = "address_history",\n            joinColumns = @JoinColumn(name = "member_id"))\n' + (c.ct === 'order' ? '    @OrderColumn(name = "idx")   // stores the position in the list as a column\n' : '') + (set ? '    Set<Address> history = new HashSet<>();\n' : '    List<Address> history = new ArrayList<>();\n') + '}\n// Constructors and getters are omitted\n\n';
    return s + '// Member 1 already has ' + (+c.n) + ' addresses (' + this.CITY.slice(0, +c.n).join(', ') + ') stored\n// Inside a transaction\n' + run;
  },
  label: function (c) {
    if (c.sc === 'table') return 'Table shape · ' + { emb: 'Embeddable type', plain: 'Not grouped', nul: 'Address is null', two: 'Address twice', twoov: 'Address twice + columns renamed' }[c.tb];
    if (c.sc === 'share') return 'Sharing · ' + { same: 'Same object + setCity', copy: 'Copied object + setCity', fixed: 'Immutable + replace with a new object' }[c.sh];
    return 'Collection · ' + { list: 'List', set: 'Set', setnn: 'Set + NOT NULL', order: 'List + @OrderColumn' }[c.ct] + ' · ' + { mod: 'Change one', add: 'Add one', del: 'Remove one' }[c.op] + ' · Addresses: ' + (+c.n);
  },
  columns: ['Table created', 'Write SQL sent', 'Values left in the database'],
  kinds: function (sent) {
    var m = {}, order = [];
    sent.forEach(function (q) { if (q.kind === 'select') return; var k = q.kind.toUpperCase(); if (!m[k]) { m[k] = 0; order.push(k); } m[k]++; });
    return order.length ? order.map(function (k) { return k + ': ' + m[k]; }).join(', ') : 'None';
  },
  simulate: function (c) { return c.sc === 'table' ? this.simTable(c) : c.sc === 'share' ? this.simShare(c) : this.simColl(c); },
  simTable: function (c) {
    var tb = c.tb, L = this.lines(c), ev = [], sum = [], two = tb === 'two' || tb === 'twoov', emb = tb === 'emb' || tb === 'nul';
    var cols = tb === 'twoov' ? ['id', 'name', 'city', 'street', 'work_city', 'work_street'] : ['id', 'name', 'city', 'street'];
    var st = { line: -2, made: false, err: '', obj: false, db: [], sent: [], read: '', hot: false };
    function push(line, s, k) { st.line = line; ev.push({ s: s, k: k, snap: JSON.parse(JSON.stringify(st)) }); st.hot = false; }
    var readSent = [], loaded = '-';
    if (tb === 'two') {
      push(0, 'Application startup, reading the mapping: Both homeAddress and workAddress are of type Address. The fields of an embeddable type are spread out as columns of the entity\'s table, so both of them try to create columns named city and street in the member table.', '');
      st.err = 'MappingException';
      push(0, 'The column names collide: a table cannot have two columns named city. Hibernate throws MappingException, and the application cannot start. The table is not created either, and the code below does not run.', 'bad');
      sum.push('MappingException is thrown at startup. The table is not created.', 'An embeddable type brings its column names with it. To use the same value type twice in one entity, you have to rename the columns of one of them with @AttributeOverride. Change the setting to "Use Address twice and rename the columns".');
      return { events: ev, summary: sum, L: L, tables: [], sent: [], readSent: [], error: 'MappingException', loaded: '-', dbRow: [], cols: cols, row: ['Not created', 'None', 'MappingException at startup (the city column is duplicated)'] };
    }
    st.made = true;
    push(0, tb === 'plain' ? 'Application startup, creating the table: The four fields of Member (id, name, city, street) become the four columns of the member table as they are.'
      : emb ? 'Application startup, creating the table: Address has @Embeddable, not @Entity. So no table named address is created, and city and street inside Address are spread out as columns of the member table. The only table is member.'
      : 'Application startup, creating the table: The fields of homeAddress become the columns city and street, and the fields of workAddress become the columns work_city and work_street, as written in @AttributeOverride. The names do not collide, so six columns are created in the single member table.', emb || two ? 'good' : '');
    st.obj = true;
    push(1, tb === 'plain' ? 'new Member("Alice", "Boston", "Main St"): Creates one Member object. The name, the city, and the street are all fields of Member.'
      : tb === 'nul' ? 'new Member("Alice", null): Creates a Member object and passes null in the place of the address. No Address object is created.'
      : tb === 'emb' ? 'new Member("Alice", new Address("Boston", "Main St")): In Java, a Member object and an Address object are created separately, and Member points to the Address with its address field.'
      : 'new Member(...): Creates one Member object and two Address objects (home address and work address).', '');
    var row = tb === 'nul' ? ['1', 'Alice', 'null', 'null'] : tb === 'twoov' ? ['1', 'Alice', 'Boston', 'Main St', 'Dallas', 'Oak Ave'] : ['1', 'Alice', 'Boston', 'Main St'];
    st.db = [row]; st.hot = true; st.sent.push({ kind: 'insert', table: 'member', sql: 'insert into member (' + cols.slice(1).join(', ') + ') values (' + row.slice(1).map(function (x) { return x === 'null' ? 'null' : "'" + x + "'"; }).join(', ') + ')', at: 'line 3' });
    push(2, 'em.persist(member): One INSERT is sent. ' + (tb === 'plain' ? 'The values of the four columns go into one row of the member table.' : tb === 'nul' ? 'address is null, so null goes into the city and street columns.' : tb === 'emb' ? 'The name of the member and the city and street of the Address go into one row of the member table together. There is no separate INSERT for Address.' : 'The name of the member and the values of the two addresses go into one row of the member table together.'), tb === 'nul' ? '' : 'good');
    push(3, 'Transaction commit: The primary key uses the IDENTITY strategy, so the INSERT was already sent. There is no more SQL to send.', '');
    if (emb) {
      readSent.push({ kind: 'select', table: 'member' }); st.sent.push({ kind: 'select', table: 'member', sql: 'select * from member where id = 1', at: 'line 5' });
      push(4, 'em.find(Member.class, 1L): In a new transaction, one SELECT reads one row of the member table. There is no join, because the address is in the same row.', '');
      loaded = tb === 'nul' ? 'null' : 'Boston/Main St'; st.read = tb === 'nul' ? 'null' : 'Boston, Main St';
      push(5, tb === 'nul' ? 'found.getAddress(): In the row that was read, the columns of the embeddable type (city, street) are all null. In that case, Hibernate does not create an empty Address object, and it leaves the address field itself null. If you call a method on the result right away, as in found.getAddress().getCity(), NullPointerException is thrown.' : 'found.getAddress(): Creates an Address object again from the city and street values of the row that was read, and puts it in the address field. It holds Boston and Main St.', tb === 'nul' ? 'bad' : 'good');
    }
    sum.push('One member table with ' + cols.length + ' columns (' + cols.join(', ') + ') is created, and a single INSERT stores one row.');
    if (tb === 'emb') sum.push('An embeddable type is a class that is grouped only on the Java side. In the table, it is just columns of the entity. If you change the setting to "Do not group it; keep the city and street fields as they are", the table and the SQL are exactly the same. In code, you can gather the values and methods related to the address in one place, which makes the code easier to read.');
    if (tb === 'plain') sum.push('This is the case where the fields are kept as they are. Compare it with "Group the address into the embeddable type Address": the table shape and the SQL that is sent are the same. An embeddable type tidies up only the Java code and does not change the table.');
    if (tb === 'nul') sum.push('If a field of an embeddable type is null, all of its columns are stored as null. When the row is read again, all the columns are null, so the address field comes back as null. For an entity whose address may be absent, check whether the result of getAddress() is null.');
    if (tb === 'twoov') sum.push('When you use the same value type twice, rename the columns of one of them with @AttributeOverride. There is still only one member table, and only the columns increase.');
    return { events: ev, summary: sum, L: L, tables: [{ name: 'member', cols: cols }], sent: st.sent.filter(function (q) { return q.kind !== 'select'; }), before: 1, readSent: readSent, error: '', loaded: loaded, dbRow: row, cols: cols,
      row: ['member (' + cols.join(', ') + ')', this.kinds(st.sent), row.slice(1).join(', ') + (tb === 'nul' ? ' (address is null when it is read again)' : '')] };
  },
  simShare: function (c) {
    var sh = c.sh, L = this.lines(c), ev = [], sum = [], cols = ['id', 'name', 'city', 'street'];
    // objs: the Address objects in memory. m1, m2: the name of the object that each member points to
    var st = { line: -2, objs: [], m1: '', m2: '', has1: false, has2: false, db: [], sent: [], hot: [] };
    function push(line, s, k) { st.line = line; ev.push({ s: s, k: k, snap: JSON.parse(JSON.stringify(st)) }); st.hot = []; }
    function obj(n) { for (var i = 0; i < st.objs.length; i++) if (st.objs[i].n === n) return st.objs[i]; }
    st.objs.push({ n: 'A', city: 'Boston', street: 'Main St', y: sh === 'copy' ? 50 : 100 });
    push(0, 'new Address("Boston", "Main St"): Creates one Address object. The variable addr points to this object.', '');
    st.has1 = true; st.m1 = 'A';
    push(1, 'new Member("Alice", addr): The address field of Alice points to the same object as addr. The object was not copied. There is just one more reference to the same object.', '');
    st.has2 = true;
    if (sh === 'copy') {
      st.objs.push({ n: 'B', city: 'Boston', street: 'Main St', y: 150 }); st.m2 = 'B';
      push(2, 'new Member("Bob", new Address(...)): Takes the values of addr, creates one more new Address object, and gives it to Bob. The values are the same, but they are different objects.', 'good');
    } else {
      st.m2 = 'A';
      push(2, 'new Member("Bob", addr): The address field of Bob also points to the same object. Now two members share one Address object.', sh === 'same' ? 'bad' : '');
    }
    st.db.push(['1', 'Alice', 'Boston', 'Main St']); st.hot = [0]; st.sent.push({ kind: 'insert', table: 'member', sql: "insert into member (name, city, street) values ('Alice', 'Boston', 'Main St')", at: 'line 4' });
    push(3, 'em.persist(member1): An INSERT is sent and the row of Alice is stored. The values of the address go into the city and street columns of the member table.', '');
    st.db.push(['2', 'Bob', 'Boston', 'Main St']); st.hot = [1]; st.sent.push({ kind: 'insert', table: 'member', sql: "insert into member (name, city, street) values ('Bob', 'Boston', 'Main St')", at: 'line 5' });
    push(4, 'em.persist(member2): An INSERT is sent and the row of Bob is stored. In the table, the two rows each hold their own city and street values. The fact that the object is shared is not recorded in the table.', '');
    if (sh === 'fixed') {
      st.objs.push({ n: 'C', city: 'Denver', street: 'Main St', y: 50 }); st.m1 = 'C';
      push(5, 'member1.setAddress(new Address("Denver", ...)): Address has no setCity, so you cannot change the values in it. To change the city, you have to create a new Address object and replace the whole address of member1. Bob still points to the old object (Boston).', 'good');
    } else {
      obj('A').city = 'Denver';
      push(5, sh === 'same' ? 'member1.getAddress().setCity("Denver"): This is code that tries to change only Alice\'s address. But what it changes is the object that the two members share. member2.getAddress().getCity() is now "Denver" as well.' : 'member1.getAddress().setCity("Denver"): Only the city of the object that member1 points to changes. Bob points to a different object, so it is still "Boston".', sh === 'same' ? 'bad' : '');
    }
    st.db[0][2] = 'Denver'; st.hot = [0]; st.sent.push({ kind: 'update', table: 'member', sql: "update member set city = 'Denver', street = 'Main St' where id = 1", at: 'just before commit' });
    push(6, 'Transaction commit, dirty checking: Just before commit, JPA compares the current values of the entities it manages with the values that were first stored. The city of Alice changed from Boston to Denver, so an UPDATE is sent for the row of Alice.', '');
    if (sh === 'same') {
      st.db[1][2] = 'Denver'; st.hot = [1]; st.sent.push({ kind: 'update', table: 'member', sql: "update member set city = 'Denver', street = 'Main St' where id = 2", at: 'just before commit' });
      push(6, 'It compares Bob too: The address of Bob points to the same object, so its city has changed to Denver as well. An UPDATE is sent for the row of Bob too. Only Alice\'s city was meant to change, but the address of Bob changed as well.', 'bad');
    } else push(6, 'It compares Bob too: The address of Bob still has the same values (Boston). Nothing changed, so no UPDATE is sent.', 'good');
    var upd = sh === 'same' ? 2 : 1;
    sum.push('After the 2 INSERTs, ' + upd + ' UPDATE' + (upd === 1 ? ' was' : 's were') + ' sent. The city left in the database is Denver for Alice and ' + st.db[1][2] + ' for Bob.');
    if (sh === 'same') sum.push('When two entities point to the same value type object, a value changed through one of them is also seen through the other. JPA sees both entities as changed and sends 2 UPDATEs. There is no compile error and no exception, so it becomes a bug that is hard to find.', 'In Java, when you put an object in a variable or pass it on, the object is not copied. Only the reference is copied. So simply "being careful not to share" is hard to rely on.');
    if (sh === 'copy') sum.push('If you copy the values into a new object, the two members point to different objects, so this is safe. But if someone forgets to copy and passes in the same object, the compiler does not stop it. To make the mistake impossible, make the value type immutable.');
    if (sh === 'fixed') sum.push('If a value type has no setters (an immutable object), there is no problem even if several entities point to the same object, because nobody can change it. To change a value, you create a new object and swap it in, and only the row of the entity that was swapped is UPDATEd.', 'This is why a value type should be immutable as a rule. Set the values only through the constructor, and do not write setters.');
    var shared = st.m1 === st.m2;
    return { events: ev, summary: sum, L: L, tables: [{ name: 'member', cols: cols }], sent: st.sent, before: 2, shared: shared, db: st.db, cols: cols,
      row: ['member (' + cols.join(', ') + ')', this.kinds(st.sent), 'Alice: ' + st.db[0][2] + ', Bob: ' + st.db[1][2]] };
  },
  simColl: function (c) {
    var ct = c.ct, op = c.op, n = +c.n, L = this.lines(c), ev = [], sum = [], order = ct === 'order', recreate = ct === 'list' || ct === 'set', CITY = this.CITY, i;
    var cols = order ? ['member_id', 'idx', 'city', 'street'] : ['member_id', 'city', 'street'];
    var list = []; for (i = 0; i < n; i++) list.push({ k: 'v' + i, city: CITY[i], street: (i + 1) + ' Main St' });
    // db: the rows of address_history { k, idx, city, street }. mem: the collection in memory (null before it is read)
    var st = { line: -2, mem: null, db: list.map(function (a, j) { return { k: order ? 'i' + j : a.k, idx: j, city: a.city, street: a.street }; }), sent: [], hot: [] };
    var init = JSON.parse(JSON.stringify(st));
    function push(line, s, k) { st.line = line; ev.push({ s: s, k: k, snap: JSON.parse(JSON.stringify(st)) }); st.hot = []; }
    function send(kind, table, sql, when, all) { st.sent.push({ kind: kind, table: table, sql: sql, at: when, all: !!all }); }
    var last = L.length - 1;
    send('select', 'member', 'select * from member where id = 1', 'line 1');
    push(0, 'em.find(Member.class, 1L): Reads member 1 with a SELECT. An element collection is fetched lazily by default, so the list of addresses (the address_history table) has not been read yet.', '');
    send('select', 'address_history', 'select * from address_history where member_id = 1', 'line 2');
    st.mem = list.map(function (a) { return { k: a.k, city: a.city, street: a.street }; });
    push(1, 'member.getHistory(): The moment you first use the collection, a SELECT is sent and reads the ' + n + ' addresses of this member from the address_history table.', '');
    var line = 1;
    if (op !== 'add') {
      st.mem.shift(); list.shift();
      push(line, 'remove(new Address("Boston", "1 Main St")): Removes the address that has the same values from the collection in memory. A value type has no id, so equals is used to find the one with the same values and remove it. No SQL has been sent yet.', '');
      line++;
    }
    if (op !== 'del') {
      st.mem.push({ k: 'v9', city: 'Portland', street: '9 Main St' }); list.push({ k: 'v9', city: 'Portland', street: '9 Main St' });
      push(line, 'add(new Address("Portland", "9 Main St")): Puts the new address into the collection in memory. ' + (op === 'mod' ? 'You change a value type by removing the old value and putting in a new one, not by editing the value it holds. ' : '') + 'No SQL has been sent yet.', '');
    }
    var before = st.sent.length, size = list.length, what = { mod: 'You changed only one address, but', add: 'You only added one address, but', del: 'You only removed one address, but' }[op];
    function dbFromList(hot) { st.db = list.map(function (a, j) { return { k: order ? 'i' + j : a.k, idx: j, city: a.city, street: a.street }; }); st.hot = hot ? st.db.map(function (r) { return r.k; }) : []; }
    if (recreate) {
      st.db = []; send('delete', 'address_history', 'delete from address_history where member_id = 1', 'just before commit', true);
      push(last, 'Transaction commit, DELETE: ' + (ct === 'list' ? 'A value type has no id, and a List has no column that records the order. There is no way to point at which row in the database is the changed address.' : 'This is a Set, but the city and street columns allow null. With values that may be null, you cannot build a condition that points to exactly "this row".') + ' So the only condition is member_id, and all the address rows of this member are deleted.', 'bad');
      for (i = 0; i < size; i++) send('insert', 'address_history', "insert into address_history (member_id, city, street) values (1, '" + list[i].city + "', '" + list[i].street + "')", 'just before commit');
      dbFromList(true);
      push(last, 'INSERTs (' + size + '): All ' + size + ' addresses that are in the collection now are inserted again, one by one. ' + what + ' the SQL sent was DELETE: 1 and INSERT: ' + size + '.', 'bad');
    } else if (ct === 'setnn') {
      if (op !== 'add') {
        st.db = st.db.filter(function (r) { return r.city !== 'Boston'; }); send('delete', 'address_history', "delete from address_history where member_id = 1 and city = 'Boston' and street = '1 Main St'", 'just before commit');
        push(last, 'Transaction commit, DELETE: The city and street columns are both NOT NULL, so the three values (member_id, city, street) can point to exactly one row. Only the one row "Boston, 1 Main St of member 1" is deleted.', 'good');
      }
      if (op !== 'del') {
        send('insert', 'address_history', "insert into address_history (member_id, city, street) values (1, 'Portland', '9 Main St')", 'just before commit'); dbFromList(false); st.hot = ['v9'];
        push(last, (op === 'add' ? 'Transaction commit, ' : '') + 'One INSERT: Only the newly added row "Portland 9 Main St" is inserted. The other rows are not touched.', 'good');
      }
    } else {
      // With an order column, a row is pointed to by (member_id, idx): if the list gets shorter, the idx values at the end are deleted, a row whose contents differ at the same idx is UPDATEd, and an idx that was added is INSERTed
      var old = st.db.slice(), changed = [], removed = [];
      for (i = size; i < old.length; i++) removed.push(i);
      for (i = 0; i < Math.min(size, old.length); i++) if (old[i].city !== list[i].city) changed.push(i);
      if (removed.length) {
        removed.forEach(function (x) { send('delete', 'address_history', 'delete from address_history where member_id = 1 and idx = ' + x, 'just before commit'); });
        st.db = st.db.slice(0, size);
        push(last, 'Transaction commit, DELETE: Because there is an order column idx, a row can be pointed to by (member_id, idx). The list got one shorter, so the row with the last idx, ' + removed[0] + ', is deleted. It is not the row with idx 0, where Boston was. The contents of the rows are set right by the UPDATE in the next step.', '');
      }
      if (changed.length) {
        changed.forEach(function (x) { send('update', 'address_history', "update address_history set city = '" + list[x].city + "', street = '" + list[x].street + "' where member_id = 1 and idx = " + x, 'just before commit'); });
        dbFromList(false); st.hot = changed.map(function (x) { return 'i' + x; });
        push(last, (removed.length ? '' : 'Transaction commit, ') + 'UPDATEs (' + changed.length + '): ' + (removed.length ? '' : 'Because there is an order column idx, a row can be pointed to by (member_id, idx). ') + 'When Boston at the front was removed, the addresses after it each moved forward by one place' + (op === 'mod' ? ' (Portland takes the last place)' : '') + '. ' + (changed.length > 1 ? 'For each row from idx ' + changed[0] + ' to idx ' + changed[changed.length - 1] + ',' : 'For the row with idx ' + changed[0] + ',') + ' the address that should be in it has changed, so the contents are corrected with UPDATE.', 'bad');
      }
      if (size > old.length) {
        send('insert', 'address_history', "insert into address_history (member_id, idx, city, street) values (1, " + (size - 1) + ", 'Portland', '9 Main St')", 'just before commit'); dbFromList(false); st.hot = ['i' + (size - 1)];
        push(last, 'Transaction commit, one INSERT: Because there is an order column idx, the rows can be told apart. "Portland 9 Main St", which was added at the end, is inserted as a single row with idx ' + (size - 1) + '.', 'good');
      }
    }
    var wr = this.kinds(st.sent), tables = [{ name: 'member', cols: ['id', 'name'] }, { name: 'address_history', cols: cols }];
    sum.push('The write SQL sent was ' + wr + '. The database was left with ' + size + ' addresses (' + list.map(function (a) { return a.city; }).join(', ') + ').');
    if (recreate) sum.push('An element collection held as a ' + (ct === 'list' ? 'List' : 'Set') + ' deletes all the rows of that entity (DELETE: 1) and inserts everything that exists now again (INSERT: ' + size + '), even if only one element changed. If you increase the number of addresses, the INSERTs increase by the same amount.' + (ct === 'set' ? ' Even if you change to a Set, the result is the same as with a List when the columns allow null.' : ''), 'Use an element collection when there are only a few values and they rarely change. If they change often or there are many of them, make the address an entity that has an id and solve it with a one-to-many relationship.');
    if (ct === 'setnn') sum.push('With a Set whose value type has all columns NOT NULL, a row can be pinpointed by the values of all the columns, so only the rows that changed are deleted and inserted. Compare it with a List, or with a Set whose columns allow null.');
    if (order) sum.push(op === 'add' ? 'With @OrderColumn, rows can be told apart by (member_id, idx), so adding at the end takes just one INSERT.' : 'With @OrderColumn, the rows are not all deleted. But if you remove the address at the front, all the later addresses shift forward by one place, and an UPDATE is sent for every row whose contents changed (this time: ' + st.sent.filter(function (q) { return q.kind === 'update'; }).length + '). If you increase the number of addresses, the UPDATEs increase too.');
    return { events: ev, summary: sum, L: L, init: init, tables: tables, seed: [{ kind: 'insert', table: 'member', n: 1 }, { kind: 'insert', table: 'address_history', n: n }], sent: st.sent, afterFind: 1, before: before, order: order, final: st.db, cols: cols,
      row: ['member (id, name), address_history (' + cols.join(', ') + ')', wr, list.map(function (a) { return a.city; }).join(', ')] };
  },
  codeTable: function (v, H, L, line) {
    H.table(v, ['Line', 'Code', ''], L.map(function (l, i) { var on = i === line; return { cells: [String(i + 1), { v: l, cls: on ? 'hot' : '' }, on ? '← now' : ''] }; }), 'Code being run');
  },
  sqlTable: function (v, H, sent) {
    if (sent.length) H.table(v, ['#', 'SQL', 'When it was sent'], sent.map(function (q, i) { return { cells: [String(i + 1), { v: q.sql, cls: q.kind === 'delete' || q.kind === 'update' ? 'hot' : '' }, q.at] }; }), 'SQL sent to the database');
  },
  render: function (v, sim, t, H, shown) {
    var c = sim.c, last = shown[shown.length - 1], s;
    if (c.sc === 'table') {
      s = last ? last.snap : { line: -2, made: false, err: '', obj: false, db: [], sent: [], read: '' };
      this.codeTable(v, H, sim.L, s.line);
      H.counters(v, [[s.err ? 'Failed' : s.made ? '1' : '?', 'Tables created'], [s.sent.filter(function (q) { return q.kind === 'insert'; }).length, 'INSERT'], [s.read || '?', 'address read back']].slice(0, c.tb === 'emb' || c.tb === 'nul' ? 3 : 2));
      if (s.err) { H.title(v, 'Application failed to start'); H.text(v, 'MappingException: the city column was mapped twice in the member table.'); return; }
      this.sqlTable(v, H, s.sent);
      if (s.made) H.table(v, sim.cols, s.db.map(function (r) { return { cells: r.map(function (x) { return x === 'null' ? { v: 'null', cls: 'bad' } : x; }) }; }), 'member table in the database');
      else H.text(v, 'Click Run to go step by step, starting with the creation of the table.');
      return;
    }
    if (c.sc === 'share') {
      s = last ? last.snap : { line: -2, objs: [], m1: '', m2: '', has1: false, has2: false, db: [], sent: [], hot: [] };
      this.codeTable(v, H, sim.L, s.line);
      var ups = s.sent.filter(function (q) { return q.kind === 'update'; }).length;
      H.counters(v, [[s.sent.length - ups, 'INSERT'], [ups, 'UPDATE'], [s.db[1] ? s.db[1][2] : '?', 'city of Bob in the database']]);
      var val = function (n) { var o = s.objs.filter(function (x) { return x.n === n; })[0]; return o ? 'Object ' + n + ' (' + o.city + ', ' + o.street + ')' : '(not yet)'; };
      H.table(v, ['Reference', 'Address object it points to'], [{ cells: ['member1.address', s.has1 ? val(s.m1) : '(not yet)'] }, { cells: ['member2.address', s.has2 ? { v: val(s.m2), cls: s.m1 === s.m2 && s.has2 ? 'hot' : '' } : '(not yet)'] }], 'Java objects (the same object name means the object is shared)');
      this.sqlTable(v, H, s.sent);
      H.table(v, sim.cols, s.db.map(function (r, i) { return { cells: r.map(function (x, j) { return j === 2 && s.hot.indexOf(i) >= 0 ? { v: x, cls: 'hot' } : x; }) }; }), 'member table in the database');
      return;
    }
    s = last ? last.snap : sim.init;
    this.codeTable(v, H, sim.L, s.line);
    var cnt = function (k) { return s.sent.filter(function (q) { return q.kind === k; }).length; };
    H.counters(v, [[cnt('delete'), 'DELETE'], [cnt('insert'), 'INSERT'], [cnt('update'), 'UPDATE']]);
    H.title(v, 'Collection in memory: member.getHistory()');
    H.slots(v, s.mem ? s.mem.map(function (a) { return [a.city + ' ' + a.street, a.k === 'v9' ? 'b' : 'q']; }) : [], 'Not read yet (lazy fetching).');
    this.sqlTable(v, H, s.sent);
    H.table(v, sim.cols, s.db.map(function (r) { var hot = s.hot.indexOf(r.k) >= 0, cells = ['1']; if (sim.order) cells.push(String(r.idx)); cells.push(hot ? { v: r.city, cls: 'hot' } : r.city, hot ? { v: r.street, cls: 'hot' } : r.street); return { cells: cells }; }), 'address_history table in the database (yellow cells are rows that were inserted or changed in this step)');
  },
  // Diagram: it differs by scene. The left side is Java objects and the right side is the database. (1) Address spread out as columns of the member table (2) The Address objects that the two members point to, and the rows that are UPDATEd (3) The collection in memory and the rows of address_history
  draw: function (P, sim, shown) {
    var c = sim.c, last = shown[shown.length - 1], s;
    if (c.sc === 'table') {
      s = last ? last.snap : { made: false, err: '', obj: false, db: [], sent: [], read: '' };
      var tb = c.tb, plain = tb === 'plain', two = tb === 'two' || tb === 'twoov';
      P.size(680, 300);
      P.region('mem', 16, 16, 300, 200, 'Java objects (memory)');
      P.box('o_member', 32, 46, 268, 158, s.obj ? { cls: 'plain', title: 'member (Member object)', sub: plain ? ['name = Alice', 'city = Boston', 'street = Main St'] : ['name = Alice'] } : { cls: 'ghost', title: 'member (Member object)', sub: 'Not yet' });
      if (!plain && s.obj) {
        if (two) {
          P.box('o_addr', 48, 98, 236, 44, { cls: 'wait', title: 'homeAddress (Address object)', sub: 'city Boston · street Main St' });
          P.box('o_addr2', 48, 150, 236, 44, { cls: 'wait', title: 'workAddress (Address object)', sub: 'city Dallas · street Oak Ave' });
        } else if (tb === 'nul') P.box('o_addr', 48, 106, 236, 44, { cls: 'ghost', title: 'address = null', sub: 'No Address object' });
        else P.box('o_addr', 48, 106, 236, 44, { cls: 'wait', title: 'address (Address object)', sub: 'city Boston · street Main St' });
      }
      P.region('db', 364, 16, 300, 200, 'DB');
      var row = s.db[0], six = tb === 'twoov';
      if (s.err) P.box('t_member', 380, 46, 268, 96, { cls: 'bad', title: 'Could not create member table', sub: ['The city column appears twice', '(homeAddress and workAddress)', 'MappingException'] });
      else P.box('t_member', 380, 46, 268, 96, { cls: !s.made ? 'ghost' : s.hot ? 'hot' : 'plain', title: 'member table', sub: !s.made ? ['Not created yet'] : (six ? ['id · name · city · street', '· work_city · work_street'] : ['id · name · city · street']).concat(row ? (six ? [row.slice(0, 4).join(' · '), '· ' + row.slice(4).join(' · ')] : [row.join(' · ')]) : ['(no rows)']) });
      if (!plain) P.box('t_addr', 380, 154, 268, 46, { cls: 'ghost', title: 'address table', sub: 'Not created (value type)' });
      if (!plain && s.obj && s.made && tb !== 'nul' && row) P.arrow('spread', 'o_addr:r', 't_member:l', { cls: 'good', label: 'as columns' });
      P.box('r1', 16, 232, 320, 38, { cls: s.err ? 'bad' : s.made ? 'good' : 'ghost', title: 'Table created', right: s.err ? 'Startup failed' : s.made ? 'member' : '?' });
      P.box('r2', 344, 232, 320, 38, tb === 'emb' || tb === 'nul' ? { cls: !s.read ? 'ghost' : s.read === 'null' ? 'bad' : 'good', title: 'Address read back', right: s.read || '?' } : { cls: s.sent.length ? 'plain' : 'ghost', title: 'INSERTs sent', right: s.sent.length + '' });
      P.note('The left side is Java objects and the right side is the database. The embeddable type (blue box) is a separate object in Java, but in the database it has no table of its own and goes into the columns of the member table.');
      return;
    }
    if (c.sc === 'share') {
      s = last ? last.snap : { objs: [], m1: '', m2: '', has1: false, has2: false, db: [], sent: [], hot: [] };
      var shared = s.has2 && s.m1 === s.m2;
      P.size(680, 300);
      P.region('mem', 16, 16, 340, 200, 'Java objects (memory)');
      P.box('m1', 32, 50, 124, 44, s.has1 ? { cls: 'plain', title: 'member1', sub: 'Alice' } : { cls: 'ghost', title: 'member1', sub: 'Not yet' });
      P.box('m2', 32, 150, 124, 44, s.has2 ? { cls: 'plain', title: 'member2', sub: 'Bob' } : { cls: 'ghost', title: 'member2', sub: 'Not yet' });
      s.objs.forEach(function (o) { var both = shared && o.n === s.m1; P.box('a' + o.n, 200, o.y, 140, 44, { cls: both && c.sh === 'same' ? (o.city === 'Denver' ? 'bad' : 'hot') : 'wait', title: 'Address object ' + o.n, sub: o.city + ' · ' + o.street }); });
      if (s.has1) P.arrow('p1', 'm1:r', 'a' + s.m1 + ':l', { cls: shared && c.sh === 'same' ? 'hot' : '' });
      if (s.has2) P.arrow('p2', 'm2:r', 'a' + s.m2 + ':l', { cls: shared && c.sh === 'same' ? 'hot' : '' });
      P.region('db', 384, 16, 280, 200, 'member table in the database');
      [0, 1].forEach(function (i) { var r = s.db[i]; P.box('d' + (i + 1), 400, i ? 150 : 50, 248, 44, r ? { cls: s.hot.indexOf(i) >= 0 ? 'hot' : 'plain', title: 'id ' + r[0] + ' · ' + r[1], sub: 'city ' + r[2] + ' · street ' + r[3] } : { cls: 'ghost', title: (i ? 'Bob' : 'Alice') + '\'s row', sub: 'Not yet' }); });
      var ups = s.sent.filter(function (q) { return q.kind === 'update'; }).length, c2 = s.db[1] ? s.db[1][2] : '?';
      P.box('r1', 16, 232, 320, 38, { cls: ups > 1 ? 'bad' : ups ? 'good' : 'ghost', title: 'UPDATEs sent', right: ups + '' });
      P.box('r2', 344, 232, 320, 38, { cls: c2 === '?' ? 'ghost' : c2 === 'Denver' ? 'bad' : 'good', title: 'city of Bob in the database', right: c2 });
      P.note('The arrows show which Address object the address field of each member points to. If the two arrows meet at one object, that object is shared. In the database, the two rows each hold their own address values, so when the shared object changes, both rows are UPDATEd.');
      return;
    }
    s = last ? last.snap : sim.init;
    var order = sim.order;
    P.size(680, 318);
    P.region('mem', 16, 16, 250, 240, 'Memory: member.getHistory()');
    if (!s.mem) P.box('lazy', 32, 48, 218, 30, { cls: 'ghost', title: 'Not read yet (lazy)', center: true });
    else s.mem.forEach(function (a, i) { P.box('m_' + a.k, 32, 48 + i * 32, 218, 26, { cls: a.k === 'v9' ? 'hot' : 'wait', title: a.city + ' ' + a.street, center: true }); });
    P.region('db', 300, 16, 364, 240, 'address_history table in the database');
    P.text('head', 316, 56, sim.cols.join(' · '), { cls: 'mut' });
    if (!s.db.length) P.box('empty', 316, 64, 332, 26, { cls: 'ghost', title: '(this member has no rows at all)', center: true });
    s.db.forEach(function (r, i) { P.box('d_' + r.k, 316, 64 + i * 31, 332, 26, { cls: s.hot.indexOf(r.k) >= 0 ? 'hot' : 'plain', title: (order ? '1 · ' + r.idx + ' · ' : '1 · ') + r.city + ' · ' + r.street }); });
    var cnt = function (k) { return s.sent.filter(function (q) { return q.kind === k; }).length; }, del = cnt('delete'), ins = cnt('insert'), upd = cnt('update');
    P.box('q_del', 16, 268, 210, 36, { cls: del ? 'bad' : 'ghost', title: 'DELETE', right: del + '' });
    P.box('q_ins', 236, 268, 210, 36, { cls: ins > 1 ? 'bad' : ins ? 'plain' : 'ghost', title: 'INSERT', right: ins + '' });
    P.box('q_upd', 456, 268, 208, 36, { cls: upd ? 'bad' : 'ghost', title: 'UPDATE', right: upd + '' });
    P.note('The left side is the collection in memory, and the right side is the rows of the table where it is stored. An element collection is stored not in the member table but in a separately created address_history table. Yellow rows are rows that were inserted or changed in this step.');
  },
  assume: 'All 56 combinations (5 table shapes, 3 ways of sharing, and for element collections 4 kinds x 3 operations x 2, 3, 4, or 5 addresses) were run on Hibernate 7.4.5 and an H2 database with code of the same structure. They were checked against the screen for the following: the tables and columns that were created, the kinds of SQL that were sent and the count per table, the SQL that was sent before commit, whether the DELETE is a statement that deletes all the rows of that member, the values left in the database, whether the address that was read back is null, and the exception at startup. The results for element collections are the behavior of Hibernate 7.4.5 and may differ by version. In particular, the fact that a Set whose columns allow null deletes everything and inserts it again, like a List, was confirmed by running it. Which row numbers are deleted and changed with @OrderColumn was confirmed from the conditions of the real SQL statements (member_id and idx) and the rows left after the run. The primary key uses the IDENTITY strategy, so the INSERT is sent as soon as persist is called. The sharing scene is what happens inside one transaction that saves two new members. Entities that are read from the database each get their own newly created value type objects, so this problem occurs only when the code itself puts in the same object. The SQL statements on the screen are shortened to be easy to read, so they are not letter for letter the same as the real statements. The order of the columns in the table may also differ from the real one.',
});

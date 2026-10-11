Lab.register({
  id: 'relations', nav: 'Many-to-one, one-to-many, one-to-one, many-to-many', cat: 'JPA', mode: 'step',
  title: 'How do the tables and foreign keys change depending on the kind of relationship?',
  intro: 'The relationships between entities include many-to-one, one-to-many, one-to-one, and many-to-many. Which one you choose changes the number of tables that are created, the table that holds the foreign key, and the SQL that is sent when you save.',
  terms: ['Many-to-one and one-to-many relationships', 'One-to-one relationship', 'Many-to-many relationships and join tables', 'Owning side and mappedBy', 'Primary key, unique key, foreign key'],
  controls: [
    { id: 'rel', label: 'Kind of relationship', type: 'select', value: 'o2m', options: [['m2o', 'Many-to-one: the member points to the team (@ManyToOne)'], ['o2m', 'Unidirectional one-to-many: the team holds a list of members (@OneToMany + @JoinColumn)'], ['o2mjt', 'Unidirectional one-to-many without @JoinColumn'], ['o2o', 'One-to-one: a member and a locker (@OneToOne)'], ['m2m', 'Many-to-many: members and products (@ManyToMany)']] },
    { id: 'fk', label: 'Table that holds the foreign key in the one-to-one', type: 'select', value: 'main', options: [['main', 'Member table (member.locker_id)'], ['target', 'Locker table (locker.member_id)']], show: function (c) { return c.rel === 'o2o'; } },
    { id: 'n', label: 'Number of related rows to save together', type: 'range', min: 1, max: 3, value: 2, step: 1, fmt: function (v) { return v + ''; }, show: function (c) { return c.rel !== 'o2o'; }, hint: 'In many-to-one and one-to-many, it is the number of members that belong to one team. In many-to-many, it is the number of products that one member picked.' },
  ],
  presets: [
    { t: 'Default settings', d: 'Unidirectional one-to-many. After the INSERTs, as many UPDATEs as there are members are sent to fill in the foreign key.', v: { rel: 'o2m', fk: 'main', n: 2 } },
    { t: 'Many-to-one', d: 'The tables are the same, but INSERT alone is enough.', v: { rel: 'm2o', fk: 'main', n: 2 } },
    { t: 'Removing @JoinColumn from the one-to-many', d: 'A join table is created instead of a foreign key.', v: { rel: 'o2mjt', fk: 'main', n: 2 } },
    { t: 'Many-to-many', d: 'The join table member_product is created automatically in the middle.', v: { rel: 'm2m', fk: 'main', n: 2 } },
    { t: 'One-to-one: foreign key in the member table', d: 'A foreign key and a unique constraint are created on member.locker_id.', v: { rel: 'o2o', fk: 'main', n: 2 } },
    { t: 'One-to-one: foreign key in the locker table', d: 'The foreign key moves to locker.member_id.', v: { rel: 'o2o', fk: 'target', n: 2 } },
    { t: 'One-to-many with 3 members', d: 'The UPDATEs increase to 3 as well.', v: { rel: 'o2m', fk: 'main', n: 3 } },
  ],
  // For each kind of relationship, this fixes the tables, the foreign keys, the entity code, and the code that saves
  spec: function (c) {
    var n = +c.n, key = c.rel === 'o2o' ? (c.fk === 'target' ? 'o2otarget' : 'o2omain') : c.rel;
    var id = '    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)\n    Long id;\n    String name;\n';
    var loop = 'for (int i = 1; i <= ' + n + '; i++) {';
    if (key === 'm2o') return { key: key, n: n, owner: 'Member.team', tables: [['team', ['id', 'name']], ['member', ['id', 'name', 'team_id']]], fks: [['member', 'team_id', 'team', false]],
      ent: '@Entity\nclass Team {\n' + id + '}\n\n@Entity\nclass Member {\n' + id + '\n    @ManyToOne                          // many members belong to one team\n    @JoinColumn(name = "team_id")       // the foreign key is in my table (member)\n    Team team;\n}',
      lines: ['Team team = new Team("Engineering");', 'em.persist(team);', loop, '    Member member = new Member("user" + i);', '    member.setTeam(team);', '    em.persist(member);', '}'] };
    if (key === 'o2m') return { key: key, n: n, owner: 'Team.members', tables: [['team', ['id', 'name']], ['member', ['id', 'name', 'team_id']]], fks: [['member', 'team_id', 'team', false]],
      ent: '@Entity\nclass Team {\n' + id + '\n    @OneToMany                          // one team has many members\n    @JoinColumn(name = "team_id")       // the foreign key is in the other table (member)\n    List<Member> members = new ArrayList<>();\n}\n\n@Entity\nclass Member {\n' + id + '}                                       // there is no field that points to the team',
      lines: ['Team team = new Team("Engineering");', 'em.persist(team);', loop, '    Member member = new Member("user" + i);', '    em.persist(member);', '    team.getMembers().add(member);', '}'] };
    if (key === 'o2mjt') return { key: key, n: n, owner: 'Team.members', tables: [['team', ['id', 'name']], ['team_member', ['team_id', 'members_id']], ['member', ['id', 'name']]], fks: [['team_member', 'team_id', 'team', false], ['team_member', 'members_id', 'member', true]],
      ent: '@Entity\nclass Team {\n' + id + '\n    @OneToMany                          // @JoinColumn was not written\n    List<Member> members = new ArrayList<>();\n}\n\n@Entity\nclass Member {\n' + id + '}',
      lines: ['Team team = new Team("Engineering");', 'em.persist(team);', loop, '    Member member = new Member("user" + i);', '    em.persist(member);', '    team.getMembers().add(member);', '}'] };
    if (key === 'm2m') return { key: key, n: n, owner: 'Member.products', tables: [['member', ['id', 'name']], ['member_product', ['member_id', 'products_id']], ['product', ['id', 'name']]], fks: [['member_product', 'member_id', 'member', false], ['member_product', 'products_id', 'product', false]],
      ent: '@Entity\nclass Product {\n' + id + '}\n\n@Entity\nclass Member {\n' + id + '\n    @ManyToMany                         // many members, and many products as well\n    List<Product> products = new ArrayList<>();\n}',
      lines: ['Member member = new Member("user1");', 'em.persist(member);', loop, '    Product product = new Product("item" + i);', '    em.persist(product);', '    member.getProducts().add(product);', '}'] };
    if (key === 'o2omain') return { key: key, n: 1, owner: 'Member.locker', tables: [['locker', ['id', 'name']], ['member', ['id', 'name', 'locker_id']]], fks: [['member', 'locker_id', 'locker', true]],
      ent: '@Entity\nclass Locker {\n' + id + '}\n\n@Entity\nclass Member {\n' + id + '\n    @OneToOne                           // one member has one locker\n    @JoinColumn(name = "locker_id")     // the foreign key is placed in the member table\n    Locker locker;\n}',
      lines: ['Locker locker = new Locker("Locker 101");', 'em.persist(locker);', 'Member member = new Member("user1");', 'member.setLocker(locker);', 'em.persist(member);'] };
    return { key: key, n: 1, owner: 'Locker.member', tables: [['member', ['id', 'name']], ['locker', ['id', 'name', 'member_id']]], fks: [['locker', 'member_id', 'member', true]],
      ent: '@Entity\nclass Locker {\n' + id + '\n    @OneToOne\n    @JoinColumn(name = "member_id")     // the foreign key is placed in the locker table\n    Member member;\n}\n\n@Entity\nclass Member {\n' + id + '\n    @OneToOne(mappedBy = "member")      // not the owning side. It is read-only\n    Locker locker;\n}',
      lines: ['Member member = new Member("user1");', 'em.persist(member);', 'Locker locker = new Locker("Locker 101");', 'locker.setMember(member);', 'em.persist(locker);'] };
  },
  code: function (c) {
    var sp = this.spec(c);
    return sp.ent + '\n// Constructors, getters, and setters are omitted\n\n// Inside a transaction\n' + sp.lines.join('\n') + '\n// Transaction commit';
  },
  label: function (c) { return c.rel === 'o2o' ? 'One-to-one · foreign key in the ' + (c.fk === 'target' ? 'locker table' : 'member table') : { m2o: 'Many-to-one', o2m: 'Unidirectional one-to-many', o2mjt: 'Unidirectional one-to-many · no @JoinColumn', m2m: 'Many-to-many' }[c.rel] + ' · ' + (c.rel === 'm2m' ? 'Products: ' : 'Members: ') + (+c.n); },
  columns: ['Tables created', 'Where the foreign key is', 'SQL sent when saving'],
  simulate: function (c) {
    var sp = this.spec(c), key = sp.key, n = sp.n, ev = [], sum = [], i;
    var st = { line: -2, rows: {}, sent: [], hot: '' };
    sp.tables.forEach(function (t) { st.rows[t[0]] = []; });
    function push(line, s, k) { st.line = line; ev.push({ s: s, k: k, snap: JSON.parse(JSON.stringify(st)) }); st.hot = ''; }
    function send(kind, table, sql, when) { st.sent.push({ kind: kind, table: table, sql: sql, at: when }); st.hot = table; }
    var before;
    if (key === 'm2o' || key === 'o2m' || key === 'o2mjt') {
      st.rows.team.push(['1', 'Engineering']); send('insert', 'team', "insert into team (name) values ('Engineering')", 'line 2');
      push(1, 'em.persist(team): Saves the team. The primary key uses the IDENTITY strategy, so the INSERT is sent right away and the id 1 comes back.', '');
      for (i = 1; i <= n; i++) {
        if (key === 'm2o') {
          st.rows.member.push([String(i), 'user' + i, '1']); send('insert', 'member', "insert into member (name, team_id) values ('user" + i + "', 1)", 'line 6 (iteration #' + i + ')');
          push(5, 'Iteration #' + i + ', em.persist(member): The member object points to the team because of member.setTeam(team) on the line just before. The field that manages the foreign key is inside Member, so team_id 1 goes in together with a single INSERT.', 'good');
        } else if (key === 'o2m') {
          st.rows.member.push([String(i), 'user' + i, 'null']); send('insert', 'member', "insert into member (name) values ('user" + i + "')", 'line 5 (iteration #' + i + ')');
          push(4, 'Iteration #' + i + ', em.persist(member): The Member class has no field that points to the team. So team_id is not in the INSERT statement, and team_id of this row is left as null.', 'bad');
          push(5, 'Iteration #' + i + ', team.getMembers().add(member): Adds the member to the list of the team. The foreign key team_id is in the member table, but what manages it is this list in Team. For now, only the list in memory has changed.', '');
        } else {
          st.rows.member.push([String(i), 'user' + i]); send('insert', 'member', "insert into member (name) values ('user" + i + "')", 'line 5 (iteration #' + i + ')');
          push(4, 'Iteration #' + i + ', em.persist(member): Saves the member. The member table has no column that points to the team at all.', '');
          push(5, 'Iteration #' + i + ', team.getMembers().add(member): Adds the member to the list of the team. There is no @JoinColumn, so this list is stored in the join table team_member. For now, only the list in memory has changed.', '');
        }
      }
      before = st.sent.length;
      if (key === 'm2o') push(-1, 'Transaction commit: The foreign key already went in with the INSERTs, so there is no more SQL to send.', 'good');
      else if (key === 'o2m') {
        push(-1, 'Transaction commit: A flush happens just before commit. When JPA looks at the members list of the team, it holds ' + n + (n === 1 ? ' member' : ' members') + '. It now has to fill in the team_id that could not be put in at INSERT time.', '');
        for (i = 1; i <= n; i++) {
          st.rows.member[i - 1][2] = '1'; send('update', 'member', 'update member set team_id = 1 where id = ' + i, 'just before commit');
          push(-1, 'The UPDATE that fills in the foreign key of user' + i + ' is sent. team_id changes from null to 1. This is SQL that would not have been sent with many-to-one.', 'bad');
        }
      } else {
        push(-1, 'Transaction commit: A flush happens just before commit. When JPA looks at the members list of the team, it holds ' + n + (n === 1 ? ' member' : ' members') + '. The contents of this list have to be put in the join table.', '');
        for (i = 1; i <= n; i++) {
          st.rows.team_member.push(['1', String(i)]); send('insert', 'team_member', 'insert into team_member (team_id, members_id) values (1, ' + i + ')', 'just before commit');
          push(-1, 'An INSERT is sent that puts the row "user' + i + ' belongs to team 1" in the join table team_member.', '');
        }
      }
    } else if (key === 'm2m') {
      st.rows.member.push(['1', 'user1']); send('insert', 'member', "insert into member (name) values ('user1')", 'line 2');
      push(1, 'em.persist(member): Saves the member. The primary key uses the IDENTITY strategy, so the INSERT is sent right away and the id 1 comes back.', '');
      for (i = 1; i <= n; i++) {
        st.rows.product.push([String(i), 'item' + i]); send('insert', 'product', "insert into product (name) values ('item" + i + "')", 'line 5 (iteration #' + i + ')');
        push(4, 'Iteration #' + i + ', em.persist(product): Saves the product. Neither the product table nor the member table has a column that points to the other.', '');
        push(5, 'Iteration #' + i + ', member.getProducts().add(product): Adds the product to the product list of the member. This list is stored in the join table member_product. For now, only the list in memory has changed.', '');
      }
      before = st.sent.length;
      push(-1, 'Transaction commit: A flush happens just before commit. When JPA looks at the products list of the member, it holds ' + n + (n === 1 ? ' product' : ' products') + '. The contents of this list have to be put in the join table.', '');
      for (i = 1; i <= n; i++) {
        st.rows.member_product.push(['1', String(i)]); send('insert', 'member_product', 'insert into member_product (member_id, products_id) values (1, ' + i + ')', 'just before commit');
        push(-1, 'An INSERT is sent that puts the row "user1 picked item' + i + '" in the join table member_product.', '');
      }
    } else if (key === 'o2omain') {
      st.rows.locker.push(['1', 'Locker 101']); send('insert', 'locker', "insert into locker (name) values ('Locker 101')", 'line 2');
      push(1, 'em.persist(locker): Saves the locker first. The INSERT is sent right away and the id 1 comes back.', '');
      push(3, 'member.setLocker(locker): The locker field of the member object points to the locker. This field has @JoinColumn(name = "locker_id"), so the foreign key is placed in the member table.', '');
      st.rows.member.push(['1', 'user1', '1']); send('insert', 'member', "insert into member (name, locker_id) values ('user1', 1)", 'line 5');
      push(4, 'em.persist(member): With a single INSERT, locker_id 1 goes in together.', 'good');
      before = st.sent.length;
      push(-1, 'Transaction commit: There is no more SQL to send.', '');
    } else {
      st.rows.member.push(['1', 'user1']); send('insert', 'member', "insert into member (name) values ('user1')", 'line 2');
      push(1, 'em.persist(member): Saves the member first. The INSERT is sent right away and the id 1 comes back. The member table has no column that points to the locker.', '');
      push(3, 'locker.setMember(member): The member field of the locker object points to the member. This field has @JoinColumn(name = "member_id"), so the foreign key is placed in the locker table. The locker field of Member has mappedBy, so it is read-only.', '');
      st.rows.locker.push(['1', 'Locker 101', '1']); send('insert', 'locker', "insert into locker (name, member_id) values ('Locker 101', 1)", 'line 5');
      push(4, 'em.persist(locker): With a single INSERT, member_id 1 goes in together.', 'good');
      before = st.sent.length;
      push(-1, 'Transaction commit: There is no more SQL to send.', '');
    }
    var ins = st.sent.filter(function (q) { return q.kind === 'insert'; }).length, upd = st.sent.length - ins;
    var sqlText = 'INSERT: ' + ins + (upd ? ', UPDATE: ' + upd : '');
    var fkText = sp.fks.map(function (f) { return f[0] + '.' + f[1] + (f[3] ? ' (unique)' : ''); }).join(', ');
    var names = sp.tables.map(function (t) { return t[0]; });
    if (key === 'm2o') sum.push('In a many-to-one, the foreign key is in the table of the "many" side (member), and the field that manages that foreign key (Member.team) is in the same entity. So the foreign key goes in together with a single INSERT. This is the most basic mapping.');
    if (key === 'o2m') sum.push('In a unidirectional one-to-many, the foreign key is in the member table too. This is because in a table, the foreign key always sits on the "many" side. But what manages it is the list in the entity on the other side, Team. When Member is INSERTed, it cannot know the team, so the foreign key is filled in later with an UPDATE. One more UPDATE was sent for each member (' + n + ' in all).', 'The table shape is exactly the same as in a many-to-one, but more SQL is sent. So a common approach is to use many-to-one first, and if the team needs a list of its members, to make the relationship bidirectional by adding mappedBy.');
    if (key === 'o2mjt') sum.push('If you leave out @JoinColumn in a unidirectional one-to-many, a join table (team_member) is created instead of a foreign key. One more table is created, and for each member, one more INSERT is sent to the join table.', 'The members_id column of the join table has a unique constraint, so one member cannot belong to two teams. Thanks to this constraint, it stays one-to-many even though it uses a join table.');
    if (key === 'm2m') sum.push('A many-to-many cannot be expressed with two tables alone, because you cannot put several values in one cell. So a join table (member_product) is created automatically in the middle, and each relationship is stored as one row.', 'The join table created automatically has only two foreign keys, one for each side. There is no place for values such as a quantity or an order date. If you need such values, make the join table an entity of its own and solve it with a one-to-many and a many-to-one.');
    if (key === 'o2omain') sum.push('In a one-to-one, you can put the foreign key in either table. Here it is in the member table. A unique constraint is placed on the foreign key locker_id as well, so two members cannot point to one locker. This unique constraint is the difference from many-to-one.');
    if (key === 'o2otarget') sum.push('The foreign key is in the locker table. The entity of the table that holds the foreign key (Locker) becomes the owning side of the relationship, and the locker field of Member is read-only because of mappedBy. The number of tables and the number of INSERTs are the same. Only the position of the foreign key and the order of saving (member first, locker second) changed.');
    var tables = sp.tables.map(function (t) { return { name: t[0], cols: t[1] }; });
    return { events: ev, summary: sum, L: sp.lines, key: key, tables: tables, fks: sp.fks, owner: sp.owner, sent: st.sent, before: before, rows: st.rows, fkInInsert: key === 'o2mjt' || key === 'm2m' ? '-' : String(key !== 'o2m'),
      row: [names.join(', '), fkText, sqlText] };
  },
  render: function (v, sim, t, H, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : { line: -2, rows: {}, sent: [], hot: '' };
    H.table(v, ['Line', 'Code', ''], sim.L.map(function (l, i) { var on = i === s.line; return { cells: [String(i + 1), { v: l, cls: on ? 'hot' : '' }, on ? '← now' : ''] }; }).concat([{ cells: ['', { v: '(Transaction commit)', cls: s.line === -1 ? 'hot' : '' }, s.line === -1 ? '← now' : ''] }]), 'Code being run');
    if (s.sent.length) H.table(v, ['#', 'SQL', 'When it was sent'], s.sent.map(function (q, i) { return { cells: [String(i + 1), { v: q.sql, cls: q.kind === 'update' ? 'bad' : '' }, q.at] }; }), 'SQL sent to the database');
  },
  // Diagram: it draws the tables that were created as boxes, and draws an arrow from the table that holds a foreign key to the table that it points to. Below are the numbers of SQL statements that were sent.
  draw: function (P, sim, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : { line: -2, rows: {}, sent: [], hot: '' };
    var three = sim.tables.length === 3, pos = three ? [[16, 150], [210, 260], [514, 150]] : [[36, 250], [394, 250]];
    P.size(680, 262);
    P.region('tb', 8, 10, 664, 154, 'Tables created in the database');
    sim.tables.forEach(function (tb, i) {
      var rows = s.rows[tb.name] || [], fk = sim.fks.filter(function (x) { return x[0] === tb.name; });
      var head = tb.cols.map(function (col) { return fk.some(function (x) { return x[1] === col; }) ? col + '(FK)' : col; }).join(' · ');
      var sub = [head].concat(rows.length ? rows.map(function (r) { return r.join(' · '); }) : ['(no rows)']);
      fk.forEach(function (x) { if (x[3]) sub.push('(unique on ' + x[1] + ')'); });
      P.box('t_' + tb.name, pos[i][0], 42, pos[i][1], 110, { cls: s.hot === tb.name ? 'hot' : fk.length ? 'wait' : 'plain', title: tb.name + ' table', sub: sub });
    });
    sim.fks.forEach(function (x) { P.arrow('fk_' + x[0] + '_' + x[1], 't_' + x[0], 't_' + x[2], { cls: 'good', label: three ? '' : x[1] }); });
    var ins = s.sent.filter(function (q) { return q.kind === 'insert'; }).length, upd = s.sent.length - ins;
    P.box('q_ins', 16, 178, 150, 40, { cls: ins ? 'plain' : 'ghost', title: 'INSERT', right: ins + '' });
    P.box('q_upd', 176, 178, 150, 40, { cls: upd ? 'bad' : 'ghost', title: 'UPDATE', right: upd + '' });
    P.box('q_own', 336, 178, 328, 40, { cls: 'plain', title: 'Manages the foreign key', right: sim.owner });
    P.note('The blue boxes are the tables that have a foreign key (FK), and the green arrows point to the tables that the foreign keys refer to. The yellow box is the table to which SQL was sent in this step.');
  },
  assume: 'Each entity has only the fields id and name, and the primary key uses the IDENTITY strategy, so the INSERT is sent as soon as persist is called. The one-to-many and many-to-many relationships were made unidirectional, in which only one side points to the other. All 14 combinations (many-to-one, one-to-many, one-to-many without @JoinColumn, and many-to-many, each with 1, 2, or 3 counterparts, and one-to-one with two positions of the foreign key) were run on Hibernate 7.4.5 and an H2 database with code of the same structure, and the following were checked to match the screen: the tables and columns that were created, the columns that have a foreign key constraint and the unique constraints, the kinds of SQL that were sent and the count per table, the SQL that was sent before commit, and the values left in the foreign key columns. It was also confirmed from the real SQL that team_id is not in the INSERT statement of a unidirectional one-to-many. The names of the join tables and their columns (team_member, members_id, member_product, products_id) were chosen by Hibernate 7.4.5 by its default rules, and they can be changed with @JoinTable. The SQL statements on the screen are shortened to be easy to read, so they are not letter for letter the same as the real statements. The order of the columns in the table may also differ from the real one.',
});

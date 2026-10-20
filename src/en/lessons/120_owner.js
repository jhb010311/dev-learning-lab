Lab.register({
  id: 'owner', nav: 'The owning side of a relationship', cat: 'JPA', mode: 'step',
  title: 'You added a member to the team\'s list, so why is the foreign key in the database empty?',
  why: 'An object can have two references that point to each other, such as the team of a member and the members of a team, but in the table, what represents this connection is one foreign key. If you do not decide which side to follow when the values of the two references disagree, the same connection would be stored separately in two places. mappedBy marks one of the references as read-only, so that exactly one side is the one that writes the foreign key.',
  use: 'When you want to get the list of members from a team, or the list of order items from an order, you make a bidirectional relationship with @OneToMany(mappedBy = ...). You set the value on the @ManyToOne side that holds the foreign key, and it is common to add a convenience method for the relationship that also puts it into the list side. If the list on the other side is not really needed, keep only the unidirectional @ManyToOne and query the list with JPQL.',
  intro: 'When a team and a member point to each other, the Java objects have two references (the team of the member, and the members of the team). In the database, however, the only thing that links them is one foreign key, team_id in the member table. JPA looks at only one of the two references when it writes the foreign key. That side is called the owning side of the relationship.',
  terms: ['Owning side and mappedBy', 'Unidirectional and bidirectional relationships', 'Primary key, unique key, foreign key', 'First-level cache', 'Transactional write-behind and flush'],
  controls: [
    { id: 'set', label: 'Which side do you set', type: 'select', value: 'inverse', options: [['inverse', 'The team side only: team.getMembers().add(member)'], ['owner', 'The member side only: member.setTeam(team)'], ['both', 'Both sides']] },
    { id: 'clear', label: 'Call em.flush() and em.clear() before reading the list', type: 'check', value: false, hint: 'When on, the team is read again from the database. When off, the objects in memory are used as they are.' },
    { id: 'mp', label: 'Team.members has mappedBy = "team"', type: 'check', value: true, hint: 'When off, it is the case of a bidirectional relationship in which mappedBy was left out.' },
  ],
  presets: [
    { t: 'Default settings', q: 'With mappedBy = "team", what happens to member.team_id when you add the member only to the team\'s list and save?', d: 'You add the member only to the team\'s list. There is no exception, but team_id in the database is null.', v: { set: 'inverse', clear: false, mp: true } },
    { t: 'Setting the member side only', q: 'What if you leave the team\'s list alone and set the team only on the member side with member.setTeam(team)?', d: 'team_id is stored, but the list of the team that is read in the same transaction is empty.', v: { set: 'owner', clear: false, mp: true } },
    { t: 'Setting both sides', q: 'What if you set both sides, the team\'s list and member.setTeam(team)?', d: 'The foreign key in the database and the list in memory are both correct.', v: { set: 'both', clear: false, mp: true } },
    { t: 'Setting the team side only, then reading again from the database', q: 'What if you set only the team side and call em.flush() and em.clear() before reading the list?', d: 'The list had 1 member in memory, but when it is read again from the database, it has 0.', v: { set: 'inverse', clear: true, mp: true } },
    { t: 'Setting the member side only, then reading again from the database', q: 'What if you set only the member side and call em.flush() and em.clear() before reading the list?', d: 'The foreign key was stored, so the list that is read again has 1 member.', v: { set: 'owner', clear: true, mp: true } },
    { t: 'Leaving out mappedBy', q: 'What if you set both sides and leave out mappedBy in Team.members?', d: 'A separate join table team_member is created, and one more INSERT is sent.', v: { set: 'both', clear: false, mp: false } },
  ],
  // The lines of code that run, depending on the settings. k is the name that points to the line.
  lines: function (c) {
    var L = [['newTeam', 'Team team = new Team("Engineering");'], ['persistTeam', 'em.persist(team);'], ['newMember', 'Member member = new Member("Alice");']];
    if (c.set !== 'inverse') L.push(['setTeam', 'member.setTeam(team);']);
    if (c.set !== 'owner') L.push(['add', 'team.getMembers().add(member);']);
    L.push(['persistMember', 'em.persist(member);']);
    if (c.clear) L.push(['flush', 'em.flush();'], ['clear', 'em.clear();']);
    L.push(['find', 'Team found = em.find(Team.class, team.getId());'], ['size', 'int size = found.getMembers().size();']);
    return L;
  },
  code: function (c) {
    var note = { setTeam: '                 // set on the owning side', add: '        // set on the side that is not the owning side', flush: '                           // sends the collected SQL to the database', clear: '                           // empties the first-level cache' };
    if (!c.mp) note.add = '        // without mappedBy, this side also becomes an owning side of its own';
    return '@Entity\nclass Team {\n    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)\n    Long id;\n    String name;\n\n' +
      (c.mp ? '    @OneToMany(mappedBy = "team")          // not the owning side. It is read-only\n' : '    @OneToMany                             // mappedBy was left out\n') +
      '    List<Member> members = new ArrayList<>();\n}\n\n@Entity\nclass Member {\n    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)\n    Long id;\n    String name;\n\n    @ManyToOne(fetch = FetchType.LAZY)\n    @JoinColumn(name = "team_id")          // the owning side. It manages the foreign key team_id\n    Team team;\n}\n// Constructors, getters, and setters are omitted\n\n// Inside a transaction\n' +
      this.lines(c).map(function (l) { return l[1] + (note[l[0]] || ''); }).join('\n') + '\n// Transaction commit';
  },
  label: function (c) { return { inverse: 'Team side only', owner: 'Member side only', both: 'Both sides' }[c.set] + (c.clear ? ' · Read again from the database' : ' · Read the objects in memory') + (c.mp ? '' : ' · No mappedBy'); },
  columns: ['member.team_id in the database', 'team.getMembers().size()', 'SQL sent', 'Tables created'],
  simulate: function (c) {
    var own = c.set !== 'inverse', inv = c.set !== 'owner', mp = !!c.mp, clear = !!c.clear, L = this.lines(c), ev = [], sum = [];
    var st = { line: -2, team: '', teamList: '', member: '', ref: false, link: false, sent: [], dbTeam: false, dbMember: false, fk: '?', join: 0, size: '?' };
    function at(k) { for (var i = 0; i < L.length; i++) if (L[i][0] === k) return i; return -1; }
    function push(k, s, cls) { st.line = k === 'commit' ? -1 : at(k); ev.push({ s: s, k: cls, snap: JSON.parse(JSON.stringify(st)) }); }
    function send(kind, table, sql, when) { st.sent.push({ kind: kind, table: table, sql: sql, at: when }); }
    function ln(k) { return 'line ' + (at(k) + 1); }

    st.team = 'new'; st.teamList = '[ ]';
    push('newTeam', 'new Team("Engineering"): Creates a team object. It exists only in Java memory so far, and the members list is empty.', '');
    st.team = 'managed'; st.dbTeam = true; send('insert', 'team', "insert into team (name) values ('Engineering')", ln('persistTeam'));
    push('persistTeam', 'em.persist(team): The primary key is created with the IDENTITY strategy, so the INSERT is sent right away and the id 1 chosen by the database comes back.', '');
    st.member = 'new';
    push('newMember', 'new Member("Alice"): Creates a member object. Its team field is still null.', '');
    if (own) {
      st.ref = true;
      push('setTeam', 'member.setTeam(team): The team field of the member object points to the team. This field has @JoinColumn(name = "team_id"), so JPA reads the value to put in the foreign key team_id from here. This side is the owning side of the relationship.', 'good');
    }
    if (inv) {
      st.link = true; st.teamList = '[member]';
      if (mp) push('add', 'team.getMembers().add(member): The member goes into the members list of the team object. But this list has mappedBy = "team". It means "the foreign key is managed by the team field of Member, and I only read", so JPA does not look at this list when it builds SQL.', own ? '' : 'bad');
      else push('add', 'team.getMembers().add(member): The member goes into the members list of the team object. Without mappedBy, JPA sees this list as another relationship that has nothing to do with the team field of Member. The contents of this list are stored in the join table team_member. For now, only the list in memory has changed.', '');
    }
    st.member = 'managed'; st.dbMember = true; st.fk = own ? '1' : 'null';
    send('insert', 'member', "insert into member (name, team_id) values ('Alice', " + st.fk + ')', ln('persistMember'));
    push('persistMember', 'em.persist(member): An INSERT is sent right away. The team_id column gets the value that is read from the team field of the member object. ' + (own ? 'The team field points to the team with id 1, so team_id is 1.' : 'The team field is null, so team_id is null too. Adding the member to the list of the team had no effect on this value.'), own ? 'good' : 'bad');
    var joinPending = !mp && inv, afterPersist = st.sent.length;
    if (clear) {
      if (joinPending) {
        st.join = 1; send('insert', 'team_member', 'insert into team_member (team_id, members_id) values (1, 1)', ln('flush')); joinPending = false;
        push('flush', 'em.flush(): Sends the collected changes to the database. The members list of the team holds one member, so an INSERT that puts a row in the join table team_member is sent.', '');
      } else push('flush', 'em.flush(): A command that sends the collected changes to the database. The two INSERTs have already been sent' + (mp && inv ? ', and a list with mappedBy produces no SQL' : '') + ', so there is no more SQL to send.', '');
      st.team = 'gone'; st.member = 'gone';
      push('clear', 'em.clear(): Empties the persistence context (the first-level cache). The team and member objects used until now become detached. They are no longer managed.', '');
      st.team = 'found'; st.teamList = 'Not read yet'; send('select', 'team', 'select * from team where id = 1', ln('find'));
      push('find', 'em.find(Team.class, team.getId()): The first-level cache is empty, so the team is read again from the database with a SELECT. found is a newly created object, and its members list has not been read yet.', '');
      if (mp) {
        st.size = own ? '1' : '0'; st.teamList = own ? '[Alice]' : '[ ]'; send('select', 'member', 'select * from member where team_id = 1', ln('size'));
        push('size', 'found.getMembers().size(): A SELECT is sent the first time members is used. Because of mappedBy = "team", it looks for the rows of the member table whose team_id is 1. ' + (own ? 'There is one, so the result is 1.' : 'team_id was stored as null, so there are none, and the result is 0.'), own ? 'good' : 'bad');
      } else {
        st.size = inv ? '1' : '0'; st.teamList = inv ? '[Alice]' : '[ ]'; send('select', 'team_member', 'select * from team_member tm join member m on m.id = tm.members_id where tm.team_id = 1', ln('size'));
        push('size', 'found.getMembers().size(): A SELECT is sent the first time members is used. There is no mappedBy, so it looks for the rows of this team not in member.team_id but in the join table team_member. ' + (inv ? 'There is one, so the result is 1.' : 'Nothing was put in the join table, so the result is 0, even though member.team_id holds 1.'), inv ? '' : 'bad');
      }
    } else {
      push('find', 'em.find(Team.class, team.getId()): The first-level cache has the team with id 1, so it returns that object without going to the database. found and team are the same object.', '');
      st.size = inv ? '1' : '0';
      var tail = '', cls = '';
      if (mp && inv && !own) { tail = ' In the database, team_id is null, but in memory it looks as if the team has a member.'; cls = 'bad'; }
      if (mp && !inv) { tail = ' In the database, team_id was stored as 1, but the list in memory is empty.'; cls = 'bad'; }
      if (mp && inv && own) { tail = ' The team_id in the database and the list in memory agree with each other.'; cls = 'good'; }
      push('size', 'found.getMembers().size(): found is the team object that was created first, so it returns the number of elements in the Java list as it is. It does not ask the database. ' + (inv ? 'A member was put in the list, so the result is 1.' : 'Nothing was put in the list, so the result is 0.') + tail, cls);
    }
    var beforeCommit = st.sent.length;
    if (joinPending) {
      st.join = 1; send('insert', 'team_member', 'insert into team_member (team_id, members_id) values (1, 1)', 'just before commit');
      push('commit', 'Commit: In the flush just before commit, JPA looks at the members list of the team, and an INSERT that puts a row in the join table team_member is sent.', '');
    } else push('commit', 'Commit: There is no more SQL to send.' + (mp && !own ? ' The member that was added to the list of the team never reached the database. No exception is thrown either.' : ''), mp && !own ? 'bad' : '');

    var kinds = {}, order = [];
    st.sent.forEach(function (q) { var k = q.kind.toUpperCase(); if (!kinds[k]) { kinds[k] = 0; order.push(k); } kinds[k]++; });
    var sqlText = order.map(function (k) { return k + ': ' + kinds[k]; }).join(', ');
    var tables = [{ name: 'member', cols: ['id', 'name', 'team_id'] }, { name: 'team', cols: ['id', 'name'] }];
    if (!mp) tables.push({ name: 'team_member', cols: ['members_id', 'team_id'] });
    if (mp && !own) sum.push('If you set the value only on the side that is not the owning side (Team.members, which has mappedBy), the foreign key is not stored. No exception is thrown, so it is easy to think it was saved.' + (clear ? ' If you read it again from the database, the list of the team is empty.' : ' Inside the same transaction, the member is visible in the list in memory, so it is even harder to notice.'));
    if (mp && own && !inv) sum.push('You set the value on the owning side (Member.team), so the foreign key is stored.' + (clear ? ' If you read it again from the database, the list of the team is filled in correctly too. But code does not always go through flush and clear, so it is safer to set both sides.' : ' But you did not add the member to the list of the team object, so if you read team.getMembers() in the same transaction, it is empty. The database and memory are in different states.'));
    if (mp && own && inv) sum.push('If you set both sides, the foreign key in the database and the list in memory are both correct. What stores the foreign key is member.setTeam(team), and team.getMembers().add(member) is for reading the objects inside the same transaction.', 'Many people write a helper method that also calls team.getMembers().add(this) inside setTeam, so that they do not forget either one of the two.');
    if (!mp) sum.push('In a bidirectional relationship, if you leave out mappedBy, JPA treats the two references as two relationships that have nothing to do with each other. Member.team is stored in the foreign key team_id, and Team.members is stored in the join table team_member. An unintended extra table is created.', inv && own ? 'The same fact is stored in two places (team_id and team_member), and one more INSERT was sent.' : inv ? 'What you added to the list of the team was stored only in the join table, and member.team_id was left as null.' : 'member.team_id was stored, but the join table is empty, so even if you read it again from the database, the list of the team is empty.');
    return { events: ev, summary: sum, L: L.map(function (l) { return l[1]; }), tables: tables, sent: st.sent, afterPersist: afterPersist, beforeCommit: beforeCommit, same: !clear, fk: st.fk, join: st.join, size: st.size,
      row: [st.fk, st.size, sqlText, 'team, member' + (mp ? '' : ', team_member')] };
  },
  blank: function () { return { line: -2, team: '', teamList: '', member: '', ref: false, link: false, sent: [], dbTeam: false, dbMember: false, fk: '?', join: 0, size: '?' }; },
  render: function (v, sim, t, H, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : this.blank();
    H.table(v, ['Line', 'Code', ''], sim.L.map(function (l, i) { var on = i === s.line; return { cells: [String(i + 1), { v: l, cls: on ? 'hot' : '' }, on ? '← now' : ''] }; }).concat([{ cells: ['', { v: '(Transaction commit)', cls: s.line === -1 ? 'hot' : '' }, s.line === -1 ? '← now' : ''] }]), 'Code being run');
    H.counters(v, [[s.sent.length, 'SQL statements sent']]);
    if (s.sent.length) H.table(v, ['#', 'SQL', 'When it was sent'], s.sent.map(function (q, i) { return { cells: [String(i + 1), q.sql, q.at] }; }), 'SQL sent to the database');
  },
  // Diagram: the two Java objects and the two references that point to each other are on the left, and the tables of the database are on the right. Only the reference on the owning side is connected to the foreign key.
  draw: function (P, sim, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : this.blank(), mp = !!sim.c.mp;
    P.size(680, 312);
    P.region('mem', 16, 16, 306, 226, 'Java objects (memory)');
    var tGone = s.team === 'gone', mGone = s.member === 'gone', found = s.team === 'found';
    P.box('team', 36, 48, 266, 56, !s.team ? { cls: 'ghost', title: 'team', sub: 'Not yet' } : { cls: tGone ? 'ghost' : 'wait', title: found ? 'found (team read again)' : tGone ? 'team (detached)' : 'team (Engineering)', sub: 'members = ' + s.teamList });
    P.box('member', 36, 166, 266, 56, !s.member ? { cls: 'ghost', title: 'member', sub: 'Not yet' } : { cls: mGone ? 'ghost' : 'wait', title: mGone ? 'member (detached)' : 'member (Alice)', sub: 'team = ' + (s.ref ? 'team' : 'null') });
    var live = s.team && s.member && !tGone && !mGone && !found;
    if (live && s.ref) P.arrow('own', 'member:t:0.25', 'team:b:0.25', { cls: 'good', label: 'team (owning side)' });
    if (live && s.link) P.arrow('inv', 'team:b:0.75', 'member:t:0.75', { cls: mp ? 'dash' : 'hot', label: mp ? 'members (read-only)' : 'members' });
    P.region('db', 358, 16, 306, 226, 'DB');
    P.box('dteam', 374, 42, 274, 44, s.dbTeam ? { cls: 'plain', title: 'team table', sub: 'id 1 · name Engineering' } : { cls: 'ghost', title: 'team table', sub: 'No rows' });
    P.box('dmember', 374, 124, 274, 44, s.dbMember ? { cls: s.fk === 'null' ? 'bad' : 'good', title: 'member table', sub: 'id 1 · name Alice · team_id ' + s.fk } : { cls: 'ghost', title: 'member table', sub: 'No rows' });
    if (!mp) P.box('djoin', 374, 186, 274, 44, s.join ? { cls: 'hot', title: 'team_member table', sub: 'team_id 1 · members_id 1' } : { cls: 'ghost', title: 'team_member table', sub: 'No rows' });
    if (s.dbMember && s.fk === '1') P.arrow('fk', 'dmember:t', 'dteam:b', { cls: 'good', label: 'foreign key' });
    var sizeBad = s.size !== '?' && mp && s.size !== (s.fk === '1' ? '1' : '0');
    P.box('r1', 16, 258, 320, 38, { cls: s.fk === '?' ? 'ghost' : s.fk === 'null' ? 'bad' : 'good', title: 'member.team_id in the database', right: s.fk });
    P.box('r2', 344, 258, 320, 38, { cls: s.size === '?' ? 'ghost' : sizeBad ? 'bad' : 'plain', title: 'team.getMembers().size()', right: s.size === '?' ? '?' : s.size });
    P.note('The green arrow (the team field of member) is the owning side. JPA looks at only this reference when it writes the foreign key team_id. ' + (mp ? 'The dashed arrow (the members list of team) is the side that has mappedBy. It is used when you read (query), but adding to or removing from it is not reflected in INSERT or UPDATE.' : 'Without mappedBy, the members list of team is stored separately too, but the place where it is stored is not a foreign key but the join table team_member.'));
  },
  assume: 'This lab covers only the case of saving one new team and one new member. The case of changing the team of a member that is already saved (the case in which an UPDATE is sent) is not covered. The primary key uses the IDENTITY strategy, so the INSERT is sent as soon as persist is called. All 12 combinations were run on Hibernate 7.4.5 and an H2 database with code of the same structure, and the following were checked to match the screen: the tables and columns that were created, the kinds of SQL that were sent and the count per table, whether that SQL was sent at persist or just before commit, the value of member.team_id in the database, the number of rows in the join table, and team.getMembers().size(). The names of the join table and its columns (team_member, team_id, members_id) were chosen by Hibernate 7.4.5 by its default rules, and they can be changed with @JoinTable. The SQL statements on the screen are shortened to be easy to read, so they are not letter for letter the same as the real statements. In the SQL log, an alias follows each table name, and question marks stand in the place of values.',
});

Lab.register({
  id: 'dtoquery', nav: 'Querying directly into a DTO', cat: 'JPA', mode: 'step',
  title: 'What is the difference between querying entities and copying them, and querying directly into a DTO?',
  intro: 'To show only the name and age of each member on a screen, querying entities reads every column of the member and then copies only the values you need into a DTO. With new in JPQL, you can pick only the values you need and receive them directly as a DTO.',
  terms: ['DTO', 'JPQL constructor expression', 'Persistence context', 'Dirty checking', 'N+1 selects problem'],
  controls: [
    { id: 'how', label: 'How to query', type: 'select', value: 'entity', options: [['entity', 'Query entities, then copy them into DTOs'], ['fetch', 'Query entities with a fetch join, then copy them into DTOs'], ['dto', 'Query directly into DTOs with new in JPQL']] },
    { id: 'team', label: 'Put the team name in the DTO too', type: 'check', value: true, hint: 'The team is another entity that the member refers to (lazy fetching).' },
    { id: 'mod', label: 'Change the name of the object you queried', type: 'check', value: false },
  ],
  presets: [
    { t: 'Default settings', q: 'How many SELECT statements and columns are sent when you query entities and copy them, with the team name, into DTOs?', d: 'Query entities and copy them, including the team name. 3 SELECT statements are sent.', v: { how: 'entity', team: true, mod: false } },
    { t: 'Query directly into a DTO', q: 'What if you query directly into DTOs with new in JPQL?', d: 'One SELECT that reads only 3 columns.', v: { how: 'dto', team: true, mod: false } },
    { t: 'When only name and age are needed: entity', q: 'What if you query entities and copy only the name and age into DTOs, leaving out the team name?', d: 'Only 2 values are used, but all 6 columns are read.', v: { how: 'entity', team: false, mod: false } },
    { t: 'When only name and age are needed: DTO', q: 'What if you query only the name and age directly into DTOs with new in JPQL?', d: 'Only 2 columns are read, and no entities are managed.', v: { how: 'dto', team: false, mod: false } },
    { t: 'Changing a value of the entity', q: 'What if you query entities, copy only the name and age, and change the name of an entity with setName?', d: 'Even without calling save, an UPDATE is sent at commit.', v: { how: 'entity', team: false, mod: true } },
    { t: 'Changing a value of the DTO', q: 'What if you query name and age directly into DTOs with new in JPQL and change the name of a DTO with setName?', d: 'The same setName, but no UPDATE is sent.', v: { how: 'dto', team: false, mod: true } },
    { t: 'Query with a fetch join', q: 'What if you query entities with a fetch join and then copy them into DTOs?', d: 'There is one SELECT, but it reads 8 columns, including the team columns.', v: { how: 'fetch', team: true, mod: false } },
  ],
  // 4 members and 2 teams. The same data that the probe inserts
  data: [[1, 'Alice', 30, 1], [2, 'Bob', 25, 1], [3, 'Carol', 41, 2], [4, 'Dave', 19, 2]],
  teams: { 1: 'Dev team', 2: 'Ops team' },
  jpql: function (c) {
    if (c.how === 'dto') return c.team ? ['"select new dtoquery.MemberDto(m.name, m.age, t.name)" +', '" from Member m join m.team t"'] : ['"select new dtoquery.MemberDto(m.name, m.age)" +', '" from Member m"'];
    return [c.how === 'fetch' ? '"select m from Member m join fetch m.team"' : '"select m from Member m"'];
  },
  code: function (c) {
    var ent = '@Entity\nclass Member {\n    @Id Long id;\n    String name;\n    int age;\n    String email;\n    String city;\n    @ManyToOne(fetch = FetchType.LAZY)\n    Team team;             // the Team entity (left out) has id, name, and region\n    // Getters and setters (getName, getAge, getTeam, setName, ...) are left out\n}\n\n';
    var dto = '// A class that holds only the values to send to the screen. It is not an entity (the package is dtoquery)\npublic class MemberDto {\n    private String name;\n    private int age;\n' + (c.team ? '    private String teamName;\n    public MemberDto(String name, int age, String teamName) {\n        this.name = name; this.age = age; this.teamName = teamName;\n    }\n' : '    public MemberDto(String name, int age) {\n        this.name = name; this.age = age;\n    }\n') + '    public void setName(String name) { this.name = name; }\n}\n\n';
    var q = this.jpql(c), body;
    if (c.how === 'dto') body = '    List<MemberDto> dtos = em.createQuery(\n        ' + q.join('\n        ') + ', MemberDto.class)\n        .getResultList();\n' + (c.mod ? '\n    dtos.get(0).setName("Erin");      // change the name of the DTO we queried\n' : '');
    else body = '    List<Member> members = em.createQuery(\n        ' + q[0] + ', Member.class)\n        .getResultList();\n\n    List<MemberDto> dtos = new ArrayList<>();\n    for (Member m : members) {\n        dtos.add(new MemberDto(m.getName(), m.getAge()' + (c.team ? ', m.getTeam().getName()' : '') + '));\n    }\n' + (c.mod ? '\n    members.get(0).setName("Erin");   // change the name of the entity we queried\n' : '');
    return ent + dto + '@Transactional\npublic List<MemberDto> list() {\n' + body + '    return dtos;\n}   // commit when the method ends';
  },
  label: function (c) { return { entity: 'Entity → DTO', fetch: 'Entity (fetch join) → DTO', dto: 'Query directly into a DTO' }[c.how] + ' · team name ' + (c.team ? 'included' : 'not included') + ' · name ' + (c.mod ? 'changed' : 'not changed'); },
  columns: ['SELECT statements sent to the DB', 'Columns in the first SELECT', 'Entities managed by the persistence context', 'UPDATE at commit'],
  simulate: function (c) {
    var self = this, ev = [], sum = [], D = this.data, T = this.teams, isDto = c.how === 'dto';
    var st = { members: [], teams: [], dtos: [], sqls: [], sel: 0, upd: 0, cols: 0, managed: 0, dbName: 'Alice', arrow: '', sql: '' };
    function push(s, k) { ev.push({ s: s, k: k || '', snap: JSON.parse(JSON.stringify(st)) }); }
    function send(sql, why) { st.sqls.push({ sql: sql, why: why }); st.sql = sql; if (sql.indexOf('select') === 0) st.sel++; else st.upd++; }
    function dtoText(d) { return { t: d[1] + ' · ' + d[2], r: c.team ? T[d[3]] : '', cls: 'wait' }; }
    var teamQ = 0;

    if (isDto) {
      st.cols = c.team ? 3 : 2; st.arrow = 'direct';
      send(c.team ? 'select m.name, m.age, t.name from member m join team t' : 'select m.name, m.age from member m', 'JPQL constructor expression');
      push('em.createQuery("select new dtoquery.MemberDto(…) …"): After new, you write the name of the DTO class and the values to pass to its constructor. The SELECT clause of the SQL contains only the ' + st.cols + ' columns for those values' + (c.team ? ' (the name and age of the member, and the name of the team). The team name is in the team table, so it is fetched with a join in the same query.' : ' (the name and age of the member).') + ' There is one query.', 'good');
      st.arrow = ''; st.dtos = D.map(dtoText);
      push('Building the result: For each row that comes back, Hibernate calls the constructor of MemberDto and creates 4 DTOs. It does not create Member entities. So nothing goes into the persistence context, and there is no snapshot that remembers the initial values.', 'good');
      if (c.mod) { st.dtos[0] = { t: 'Erin · 30', r: st.dtos[0].r, cls: 'hot' }; push('dtos.get(0).setName("Erin"): The name in the DTO was changed. A DTO is a plain Java object without @Entity. The persistence context does not know about this object.'); }
      push('End of the method, commit: No entities are managed by the persistence context, so there is nothing to compare and no SQL to send.' + (c.mod ? ' The name in the DTO changed to Erin, but no UPDATE was sent, and the name in the DB is still Alice.' : ''), c.mod ? 'bad' : '');
    } else {
      var fetch = c.how === 'fetch';
      st.cols = fetch ? 8 : 6; st.arrow = 'in';
      send(fetch ? 'select 5 member columns, 3 team columns from member m join team t' : 'select 6 member columns from member m', 'Entity query');
      st.members = D.map(function (d) { return { name: d[1], cls: 'good' }; });
      st.teams = [1, 2].map(function (id) { return { name: T[id], loaded: fetch }; });
      st.managed = fetch ? 6 : 4;
      if (fetch) push('em.createQuery("select m from Member m join fetch m.team"): The members and the teams are queried together with a join, in one query. The SELECT clause has 8 columns: 5 columns of the member and 3 columns of the team (the member\'s team_id has the same value as the team\'s id, so it was not read separately). The 4 members and 2 teams that were read are made into entity objects and kept in the persistence context, and their initial values are saved as snapshots.');
      else push('em.createQuery("select m from Member m"): The whole Member entity is queried. The SELECT clause has all 6 columns of the member (id, name, age, email, city, team_id). The 4 members that were read are made into entity objects and kept in the persistence context, and their initial values are saved as snapshots. The team uses lazy fetching, so it has not been read yet.');
      st.arrow = 'conv';
      if (c.team && !fetch) {
        D.forEach(function (d) {
          var t = st.teams[d[3] - 1];
          st.dtos.push(dtoText(d));
          if (!t.loaded) {
            t.loaded = true; teamQ++; st.managed++; send('select 3 team columns from team where id = ' + d[3], 'Lazy fetching'); st.arrow = 'lazy';
            push('Copying member ' + d[0] + ' into a DTO: At the moment m.getTeam().getName() gets the team name, a separate SELECT is sent for team ' + d[3] + ', which has not been read yet (lazy fetching). The team that was read is also managed by the persistence context.', 'bad');
          } else { st.arrow = 'conv'; push('Copying member ' + d[0] + ' into a DTO: Team ' + d[3] + ' of this member was read earlier and is in the persistence context, so no query is sent.'); }
        });
      } else {
        st.dtos = D.map(dtoText);
        push('Copying into DTOs: The code goes through the 4 members and creates 4 DTOs with new MemberDto(…). ' + (c.team ? 'The teams were already read by the fetch join, so m.getTeam().getName() sends no more queries. ' : '') + 'Of the ' + st.cols + ' columns that were read, only ' + (c.team ? '3 (name, age, and team name)' : '2 (name and age)') + ' went into the DTO.' + (fetch && !c.team ? ' The team is not used at all, but it was joined and read.' : ''));
      }
      st.arrow = '';
      if (c.mod) { st.members[0] = { name: 'Erin', cls: 'hot' }; push('members.get(0).setName("Erin"): The name of the entity was changed. This object is managed by the persistence context, so its current value (Erin) now differs from the snapshot (Alice). No SQL has been sent yet.'); }
      if (c.mod) { send('update member set … where id = 1', 'Dirty checking'); st.dbName = 'Erin'; st.arrow = 'upd'; st.members[0].cls = 'good'; push('End of the method, commit: Just before the commit, the ' + st.managed + ' managed entities are compared with their snapshots. The name of member 1 differs, so an UPDATE is sent. Although save was not called, the name in the DB changed to Erin.', 'good'); }
      else push('End of the method, commit: Just before the commit, the ' + st.managed + ' managed entities are compared with their snapshots. Nothing differs, so there is no SQL to send. Even for a screen that only displays data, the work of making snapshots and comparing them still happens.');
    }
    var row = [st.sel + (teamQ ? ' (1 for members + ' + teamQ + ' for teams)' : ''), st.cols + '', st.managed + '', !c.mod ? '0 (no value was changed)' : st.upd ? '1 (the name in the DB changed to Erin)' : '0 (only the DTO changed; the DB is unchanged)'];
    if (isDto) {
      sum.push('When you query with new in JPQL, only the columns you need are read, and the results are plain objects, not entities. The persistence context does not manage them, so there is no snapshot and no comparison at commit. This suits screens that only display data, such as lists and statistics.');
      sum.push(c.mod ? 'Changing a value of the DTO does not change the DB. To modify data by dirty checking, you have to query entities (a DTO is not managed by the persistence context).' : 'On the other hand, if the goal is to modify data, you have to query entities. Changing a DTO does not change the DB.');
      sum.push('This query is tailored to the values this one screen needs. The downside is that you have to write a separate DTO and query each time the screen changes.');
    } else {
      if (teamQ) sum.push('The list was queried once, but as many extra SELECT statements as there are teams were sent to read the teams. This is the N+1 selects problem. It often occurs when you query entities and then put associated values into a DTO.');
      if (c.how === 'fetch') sum.push('With a fetch join, the number of SELECT statements drops to one, but all the columns of the member and the team are read (8).' + (c.team ? ' Only 3 values go into the DTO.' : ' The team does not go into the DTO either, so in this case the join is not needed.'));
      else if (!teamQ) sum.push('When you query entities, even the columns you do not use are all read. The difference gets large when there are dozens of columns or a column that holds long text.');
      sum.push(c.mod ? 'The entity you queried is managed by the persistence context, so when you change a value, an UPDATE is sent at commit (dirty checking). When the goal is to modify data, this approach is the right one.' : 'The entity you queried is managed by the persistence context. When you change a value, an UPDATE is sent at commit, so when the goal is to modify data, this approach is the right one. When you only display data, making snapshots and comparing them is wasted work.');
    }
    return { events: ev, summary: sum, row: row };
  },
  render: function (v, sim, t, H, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : null;
    if (!s) { H.text(v, 'Click Run to go step by step from the query to the commit.'); return; }
    H.counters(v, [[s.cols + '', 'Columns in the first SELECT'], [s.managed + '', 'Managed entities']]);
    H.table(v, ['#', 'SQL sent to the DB', 'Reason'], s.sqls.map(function (q, i) { return { cells: [String(i + 1), { v: q.sql, cls: i === s.sqls.length - 1 ? 'hot' : '' }, q.why] }; }), 'SQL log');
  },
  // Diagram: On the left is the DB, in the middle is the persistence context (managed entities), and on the right is the DTO list. An entity query goes through the middle, and a DTO query goes straight from the DB to the DTOs.
  draw: function (P, sim, shown) {
    var c = sim.c, last = shown[shown.length - 1];
    var s = last ? last.snap : { members: [], teams: [], dtos: [], sel: 0, upd: 0, cols: 0, managed: 0, dbName: 'Alice', arrow: '', sql: '' };
    P.size(680, 324);
    P.region('db', 16, 16, 176, 236, 'DB');
    P.box('tm', 26, 48, 156, 46, { cls: s.dbName === 'Erin' ? 'hot' : 'plain', title: 'member table', sub: 'id 1 name: ' + s.dbName });
    P.box('tt', 26, 102, 156, 46, { cls: 'plain', title: 'team table', sub: 'Dev team, Ops team' });
    P.box('sel', 26, 166, 156, 30, { cls: s.sel > 1 ? 'bad' : s.sel ? 'good' : 'ghost', title: 'SELECT', right: s.sel + '' });
    P.box('upd', 26, 204, 156, 30, { cls: s.upd ? 'hot' : 'ghost', title: 'UPDATE', right: s.upd + '' });
    P.region('pc', 202, 16, 256, 236, 'Persistence context (managed entities)');
    if (c.how === 'dto') P.box('none', 212, 110, 236, 44, { cls: 'ghost', title: 'Empty', sub: 'No entities are created', center: true });
    else if (!s.members.length) P.box('none', 212, 110, 236, 44, { cls: 'ghost', title: 'Empty', sub: 'Nothing queried yet', center: true });
    s.members.forEach(function (m, i) { P.box('m' + i, 212, 48 + i * 34, 150, 28, { cls: m.cls, title: 'Member ' + (i + 1), right: m.name }); });
    s.teams.forEach(function (tm, i) { P.box('t' + i, 370, 48 + i * 68, 80, 28, { cls: tm.loaded ? 'good' : 'ghost', title: tm.loaded ? tm.name : 'Team ' + (i + 1), center: true }); });
    P.region('dto', 468, 16, 196, 236, 'DTO list (values to send)');
    if (!s.dtos.length) P.box('nodto', 478, 110, 176, 44, { cls: 'ghost', title: 'None yet', center: true });
    s.dtos.forEach(function (d, i) { P.box('d' + i, 478, 48 + i * 34, 176, 28, { cls: d.cls, title: d.t, right: d.r }); });
    if (s.arrow === 'in') P.arrow('a1', 'db:r', 'pc:l', { cls: 'hot', label: 'SELECT ' + s.cols + ' columns' });
    if (s.arrow === 'lazy') P.arrow('a1', 'db:r:0.4', 'pc:l:0.4', { cls: 'bad', label: 'SELECT team' });
    if (s.arrow === 'upd') P.arrow('a1', 'pc:l', 'db:r', { cls: 'hot', label: 'UPDATE' });
    if (s.arrow === 'conv' || s.arrow === 'lazy') P.arrow('a2', 'pc:r', 'dto:l', { cls: 'mut', label: 'copy' });
    if (s.arrow === 'direct') P.arrow('a1', 'db:r:0.08', 'dto:l:0.08', { cls: 'good', label: 'SELECT ' + s.cols + ' columns → DTO' });
    P.box('q', 16, 264, 648, 46, { cls: s.sql ? 'plain' : 'ghost', title: 'Last SQL sent to the DB', sub: s.sql || 'None yet', mono: true });
    P.note('Only the objects that enter the middle area are managed by the persistence context. A DTO exists only in the right area, so changing it does not change the DB. A dashed team is one that has not been read yet (a proxy).');
  },
  assume: 'Twelve combinations were actually run with Hibernate 7.4.5 and an H2 database, using code with the same structure as the screen, and the number of SELECT statements sent and their target tables, the number of columns in the first SELECT, the number of entities managed by the persistence context, the number of UPDATE statements sent at commit, and the name left in the DB were checked against the screen. All the code was assumed to run inside one transaction (one persistence context). The SQL on the screen is shortened to be easier to read, and the actual shape of the statements and the order of the columns differ depending on the Hibernate version. The fetch join reads 8 columns, not 9, because Hibernate 7.4.5 did not read the member\'s team_id separately, and this may differ depending on the version. The number of extra queries that read the teams equals the number of different teams that had not been read yet (2 in this example), and this is the value when no batch size is set. The JPA standard requires the class name after new to include the package name. When I ran it on Hibernate 7.4.5, passing MemberDto.class as the result type to createQuery made it work even without the package name, and writing only the class name without a result type made it fail to find the class and throw an exception (SemanticException). Leaving out the package name is not behavior that the standard guarantees. The feature of Spring Data JPA that lets you receive only the values you need through an interface or a record (projections) is not covered in this lab.',
});

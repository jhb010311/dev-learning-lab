Lab.register({
  id: 'repo_basic', nav: 'Repositories', cat: 'Fundamentals', mode: 'step', basic: true, deep: ['datajpa'],
  title: 'What is a repository, and who creates the implementation?',
  why: 'With JPA alone, without Spring Data JPA, you make a separate class for each entity, such as one for members and one for orders, to save, find, and delete, and you must write almost the same EntityManager code over and over, changing only the entity type. For queries that find by a condition, you also write the query text yourself in every method. A Spring Data JPA repository has Spring fill in these repeated parts, so that we only decide the name and shape of the methods.',
  use: 'In a project that uses Spring Data JPA, you keep one repository interface per entity, and a service class has it injected to save and find. For queries with one or two conditions, such as finding a member by email or finding orders by status, naming the method according to the rules is enough. For queries with long and complex conditions, you write the query yourself with @Query or use a tool such as Querydsl together.',
  intro: 'A repository in Spring Data JPA is an interface that gathers the methods that save and find entities. If you only declare interface MemberRepository extends JpaRepository<Member, Long> (MemberRepository and Member are names made up for this example, and JpaRepository is an interface provided by Spring Data JPA), Spring creates an object that implements this interface when it starts, and registers it as a bean. That is why you can call the save method even though you did not implement it. save is declared in CrudRepository (JpaRepository inherits CrudRepository through ListCrudRepository), and MemberRepository inherits it through JpaRepository. If you declare a method that follows a fixed naming rule (findBy followed by a field name), such as findByName, Spring reads that name and creates the query for you too. This lab changes extends JpaRepository and the declaration of the finder method, compiles the same code and starts Spring, and shows whether the implementation object is created and which SQL is sent.',
  terms: ['Repository', 'JpaRepository', 'Query method', 'JPA, Hibernate, Spring Data JPA'],
  controls: [
    { id: 'ext', label: 'Write extends JpaRepository<Member, Long> in the MemberRepository declaration', type: 'check', value: true },
    { id: 'method', label: 'Declaration of the finder method', type: 'select', value: 'name', options: [['name', 'Declare findByName(String name)'], ['none', 'Declare no finder method'], ['nick', 'Declare findByNickname(String nickname) (a field that Member does not have)']] },
  ],
  // q is the question shown on the question-style screen. t and d are the name and the description used in the text-only reading
  presets: [
    { t: 'Default settings', q: 'What does a repository look like, and what happens when you call save and findByName, which you did not implement?', d: 'An interface that is only declared. Spring creates the implementation object, so save and findByName run and SQL is sent.', v: { ext: true, method: 'name' } },
    { t: 'Removing extends JpaRepository', q: 'What if you remove extends JpaRepository<Member, Long>?', d: 'It becomes an ordinary interface with no save, and compiling fails. Spring does not create an implementation object either.', v: { ext: false, method: 'name' } },
    { t: 'Removing the findByName declaration', q: 'What if you remove the findByName declaration?', d: 'Even with no declared method, the inherited save and count run.', v: { ext: true, method: 'none' } },
    { t: 'Declaring it with a field Member does not have', q: 'What if you declare findByNickname with a field that Member does not have?', d: 'Spring cannot create the query, so it fails while starting.', v: { ext: true, method: 'nick' } },
  ],
  // The finder method in this setting: the declaration ('' if none) and the line the calling side calls
  find: function (c) {
    if (c.method === 'name') return { decl: 'findByName(String name)', call: 'findByName("Alice")', short: 'findByName' };
    if (c.method === 'nick') return { decl: 'findByNickname(String nickname)', call: 'findByNickname("Ali")', short: 'findByNickname' };
    return { decl: '', call: '', short: '' };
  },
  // The code on the screen and the source that the checking program (verify/spring/src/RepoBasicProbe.java) compiled are the same text (the checking script compares them character by character).
  code: function (c) {
    var f = this.find(c), o = [];
    if (c.ext) o.push('// Only declare it. You do not write an implementation class; Spring creates the implementation object');
    o.push('public interface MemberRepository' + (c.ext ? ' extends JpaRepository<Member, Long>' : '') + ' {');
    if (f.decl) o.push('    // Spring reads the naming rule (findBy + field name) and creates the query', '    List<Member> ' + f.decl + ';');
    o.push('}', '', '// Calling side', '// Only the lines inside the main method are kept (the lines that start Spring and get memberRepository are omitted).', 'memberRepository.save(new Member(1L, "Alice"));');
    if (f.decl) o.push('List<Member> found = memberRepository.' + f.call + ';', 'System.out.println(found.size());');
    else o.push('System.out.println(memberRepository.count());');
    return o.join('\n');
  },
  label: function (c) { return (c.ext ? 'has extends JpaRepository' : 'no extends JpaRepository') + ' · ' + { name: 'declares findByName', none: 'declares no finder method', nick: 'declares findByNickname (a field Member does not have)' }[c.method]; },
  columns: ['Result', 'Implementation object made by Spring', 'SQL sent'],
  simulate: function (c) {
    var f = this.find(c), ev = [], sum = [], none = c.method === 'none', nick = c.method === 'nick';
    var SEL_ID = 'select m1_0.id,m1_0.name from member m1_0 where m1_0.id=?', INS = 'insert into member (name,id) values (?,?)';
    var SEL_NAME = 'select m1_0.id,m1_0.name from member m1_0 where m1_0.name=?', SEL_CNT = 'select count(*) from member m1_0';
    // State: impl is the implementation object (0 none, 1 made, -1 failed while making), sql is the SQL sent [kind, statement], rows is the rows of the member table, phase is what is happening now
    var st = { phase: '', impl: 0, rows: 0, sql: [], out: '', status: '', errs: 0, errText: '', hot: '' };
    function push(s, k) { ev.push({ s: s, k: k, snap: JSON.parse(JSON.stringify(st)) }); }
    function send(text) { st.sql.push([text.split(' ')[0].toUpperCase(), text]); }
    var kindText = function () { var n = { INSERT: 0, SELECT: 0 }; st.sql.forEach(function (r) { n[r[0]]++; }); return n; };

    if (!c.ext) {
      // Compile error: there is no save (and no count)
      st.phase = 'compile'; st.hot = 'if';
      push('The compiler reads MemberRepository.java. The interface MemberRepository declaration has no extends, so it is an ordinary interface that inherits nothing. The methods this interface has are ' + (none ? 'none at all (the inside is empty).' : f.decl + ' is the only one.'), '');
      st.phase = 'fail'; st.errs = 1; st.errText = 'MemberRepository has no save method';
      push('The compiler checks the line memberRepository.save(new Member(1L, "Alice")) on the calling side. MemberRepository has no save method. save is a method that JpaRepository inherits from CrudRepository through ListCrudRepository, and this interface does not inherit JpaRepository. The error occurs on this line (javac: cannot find symbol, method save(Member)).', 'bad');
      if (none) {
        st.errs = 2;
        push('It checks the next line, System.out.println(memberRepository.count()), too. count is also a method that JpaRepository inherits from CrudRepository, so this interface does not have it, and the same kind of error occurs once more (javac: cannot find symbol, method count()). javac reported 2 errors in all.', 'bad');
      } else {
        push('The line memberRepository.' + f.call + ' on the calling side calls a method that is declared in this interface, so it is not an error. The compiler checks only whether the method is declared, not who implements it. javac reported only 1 error, on the save line.', '');
      }
      push('Compiling fails. The compiler reported ' + st.errs + ' errors, and the first error is "' + st.errText + '". The Main class file was not created, so the program cannot run, and Spring cannot start either.', 'bad');
      st.phase = 'plain';
      push('What happens if you give the same interface to Spring, without the calling side, was run and checked separately. Spring starts successfully, but it does not create an implementation object of MemberRepository (0 of them). What Spring Data looks for is an interface that extends a repository interface such as JpaRepository, and it does not look for an ordinary interface. We did not write a class to implement it, so this interface has no implementation anywhere.', '');
      sum.push('If you remove extends JpaRepository, MemberRepository is an ordinary interface. save was a method that JpaRepository inherits from CrudRepository, so this interface does not have it, and the compiler said it could not find save, so compiling failed.' + (none ? ' count is the same, so there were 2 errors.' : ' The line of ' + f.short + ', which we declared ourselves, has a declaration and was not an error.'));
      sum.push('Spring creates an implementation only for an interface that extends a Spring Data repository interface such as JpaRepository. This interface does not extend it, so even if you avoid the compile error, Spring made 0 implementation objects.');
      return { events: ev, summary: sum, f: f, row: ['Compile error: MemberRepository has no save method', 'None', 'None'] };
    }

    // 1. Compile
    st.phase = 'compile'; st.hot = 'if';
    push('The compiler checks MemberRepository.java and the calling side. The interface declares extends JpaRepository<Member, Long> and inherits the methods of JpaRepository, so the line that calls the save method, which we did not declare, is not an error either.' + (none ? ' count is an inherited method too.' : nick ? ' The ' + f.short + ' method on the calling side is one we declared, so it is not an error. The compiler checks only whether the method is declared, and does not read what the name means.' : ' The ' + f.short + ' method is one we declared.') + ' Compiling succeeds.', 'good');

    // 2. When Spring starts, it finds the interface
    st.phase = 'scan'; st.hot = 'if';
    push('main starts Spring with SpringApplication.run. Spring Data looks in the app package, where the start class is, for interfaces that extend a repository interface such as JpaRepository. It finds MemberRepository, which has extends JpaRepository. The code we wrote has no class that implements MemberRepository and no line that creates an implementation.', '');

    if (nick) {
      st.phase = 'parse'; st.hot = 'if';
      push('While Spring Data creates the implementation object of MemberRepository, it reads the name of the declared method findByNickname. The rule is that findBy means "find", and the Nickname after it is the nickname field of Member. But Member has only id and name and has no nickname field, so Spring cannot create the query (PropertyReferenceException: No property "nickname" found for type "Member").', 'bad');
      st.phase = 'fail'; st.impl = -1; st.hot = '';
      push('It cannot create the query, so making the implementation object fails, and Spring stops while starting. The exception comes out of main at the line that starts Spring (the part shortened on the screen), and the program stops. Not one line of the calling side ran, including memberRepository.save, and no SQL went to the database. Spring reported at startup a mistake in the name that the compiler did not notice.', 'bad');
      sum.push('If you declare findByNickname with a field that Member does not have, Spring cannot turn the name into a query, so Spring fails while starting. Not one line of the calling side ran.');
      sum.push('A method name is a rule that Spring reads, so Spring tells you at startup, not the compiler, that a name does not follow the rule. This failure happens even if you never call findByNickname.');
      return { events: ev, summary: sum, f: f, row: ['Spring failed while starting: Member has no nickname field', 'None', 'None'] };
    }

    // 3. Make the implementation object and register it as a bean
    st.phase = 'make'; st.impl = 1; st.hot = 'im';
    push('Spring Data makes an object that implements MemberRepository and registers it as a bean. This object is not a class we wrote. Spring made it while running, and you can use it as the MemberRepository type. This object runs inherited methods such as save.' + (none ? ' There is no declared method, so there is no name to read.' : ''), 'good');
    if (!none) {
      st.phase = 'parse';
      push('At this time Spring Data reads the name of the findByName method. Following the rule that findBy means "find" and the Name after it is the name field of Member, it prepares "a query that finds by name". Member has a name field, so it passes. If a name does not follow the rule, it fails here.', '');
    }
    st.phase = 'get'; st.hot = 'if';
    push('main gets a bean of the MemberRepository type from Spring and puts it in memberRepository (the part shortened on the screen). What it holds is the implementation object that Spring has just made. It is not an object made with new. SQL is counted from here on.', '');

    // 4. save
    st.phase = 'save'; st.hot = 'im';
    send(SEL_ID);
    push('memberRepository.save(new Member(1L, "Alice")) runs. We have no code that wrote the save method. The implementation object that Spring made runs the one inherited from JpaRepository. The id of the Member is already set to 1, so inside save, a SELECT first goes out to check whether a row with id 1 already exists (SELECT 1). There is no such row.', '');
    send(INS); st.rows = 1;
    push('No row was found, so the implementation object sends an INSERT and saves the row with id 1, Alice, in the member table (INSERT 1). We wrote not one line of SQL.', 'good');

    // 5. Find
    st.phase = 'find';
    if (none) {
      send(SEL_CNT);
      push('The count method in System.out.println(memberRepository.count()) runs. count is also a method inherited from JpaRepository, and the implementation object sends ' + SEL_CNT + '. The member table has 1 row.', 'good');
      st.out = '1'; st.phase = 'done';
      push('println prints the 1 that count returned.', 'good');
    } else {
      send(SEL_NAME);
      push('memberRepository.findByName("Alice") runs. The implementation object sends a SELECT following the naming rule that it read at startup: ' + SEL_NAME + ' (the "Alice" we passed goes in the place of name=?). We wrote no query. The 1 row it found becomes a Member object and goes into the List.', 'good');
      st.out = '1'; st.phase = 'done';
      push('println prints found.size(). It found 1 Member, so it is 1. All we wrote were the two declaration lines of the interface (the interface declaration and the findByName line).', 'good');
    }

    if (!none) {
      sum.push('A repository is an interface that gathers the methods that save and find entities. If you declare extends JpaRepository<Member, Long>, Spring creates an implementation object of this interface when it starts and registers it as a bean, and that is why you could call save, which we did not implement.');
      sum.push('save is a method inherited from JpaRepository, and findByName is a SELECT that Spring made by reading the naming rule (findBy + field name). All we wrote was the interface declaration, with no implementation class and no SQL.');
    } else {
      sum.push('Even if you remove the findByName declaration, the repository works as before. Even with no declared method at all, you could use the inherited save and count, and the implementation object that Spring made sent the SQL.');
      sum.push('Declaring a finder method adds a lookup you need. The condition for getting an implementation object is not findByName but extending a repository interface such as JpaRepository.');
    }
    var n = kindText();
    return { events: ev, summary: sum, f: f, row: ['1', 'Yes', 'INSERT ' + n.INSERT + ', SELECT ' + n.SELECT + ''] };
  },
  render: function (v, sim, t, H, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : null;
    if (!s) { H.text(v, 'Click Run to start from the compiler checking the code.'); return; }
    H.table(v, ['SQL sent', 'Kind'], s.sql.length ? s.sql.map(function (r) { return { cls: '', cells: [r[1], r[0]] }; }) : [{ cls: 'gone', cells: ['None yet', ''] }], 'SQL sent to the database');
    H.table(v, ['member table', ''], s.rows ? [{ cls: '', cells: ['id 1', 'Alice'] }] : [{ cls: 'gone', cells: ['No rows', ''] }], 'State of the database');
    var n = { INSERT: 0, SELECT: 0 }; s.sql.forEach(function (r) { n[r[0]]++; });
    H.counters(v, [[s.impl === 1 ? 1 : 0, 'Implementation objects made by Spring'], [n.INSERT + n.SELECT, 'SQL sent']]);
  },
  // Diagram: on the left the MemberRepository (interface) that we wrote, in the middle the implementation object that Spring made, on the right the member table in the database. Arrows show whether the call reaches the database through the implementation object. If there is no implementation object, the arrow breaks there.
  draw: function (P, sim, shown) {
    var c = sim.c, f = sim.f, last = shown[shown.length - 1], s = last ? last.snap : null, ph = s ? s.phase : '';
    P.size(680, 292);
    P.region('cl', 10, 12, 226, 212, 'What we wrote');
    var sub = ['Just an interface', f.decl ? f.short + '() declared' : 'No declared method', c.ext ? 'Inherits save, count' : 'No inherited methods'];
    P.box('if', 20, 44, 206, 94, { cls: ph === 'fail' && s.errs ? 'bad' : s && s.hot === 'if' ? 'hot now' : 'plain', title: 'MemberRepository', sub: sub });
    P.region('sp', 286, 12, 190, 212, 'What Spring made');
    var im = s ? s.impl : 0;
    P.box('im', 296, 44, 170, 94, { cls: im === 1 ? (s.hot === 'im' ? 'hot now' : 'good') : im === -1 ? 'bad' : 'ghost', title: 'Implementation', sub: im === 1 ? ['Made at run time', 'Not a class we wrote'] : im === -1 ? ['Failed while making'] : [s && (ph === 'fail' || ph === 'plain') ? 'Not made' : 'Not yet'] });
    P.region('db', 526, 12, 144, 212, 'DB');
    P.box('tb', 536, 44, 124, 94, { cls: s && s.rows ? 'good' : 'ghost', title: 'member', sub: s && s.rows ? ['id 1 · Alice'] : ['No rows'] });
    if (ph === 'make' || ph === 'parse' || ph === 'scan') P.arrow('mk', 'if:r:0.5', 'im:l:0.5', { cls: ph === 'scan' ? 'dash' : 'hot' });
    if (ph === 'save' || ph === 'find') { P.arrow('call', 'if:r:0.5', 'im:l:0.5', { cls: 'hot' }); P.arrow('sql', 'im:r:0.5', 'tb:l:0.5', { cls: 'hot' }); }
    if (ph === 'fail') P.arrow('x', 'if:r:0.5', 'im:l:0.5', { cls: 'bad' });
    var n = { INSERT: 0, SELECT: 0 }; if (s) s.sql.forEach(function (r) { n[r[0]]++; });
    P.box('n1', 14, 242, 322, 36, { cls: s && s.impl === 1 ? 'wait' : 'ghost', title: 'Implementation objects made by Spring', right: (s && s.impl === 1 ? 1 : 0) + '' });
    P.box('n2', 344, 242, 322, 36, { cls: n.INSERT + n.SELECT ? 'good' : 'ghost', title: 'SQL sent', right: 'INSERT ' + n.INSERT + ' · SELECT ' + n.SELECT });
  },
  assume: 'This was checked against real execution on Spring Boot 4.1.1 (Spring Data JPA 4.1.1, Hibernate 7.4.5, Spring Framework 7.0.9) on JDK 21 and an H2 2.4.240 in-memory database, and a check against execution on MySQL was not done. All 6 combinations were checked. The same source as the code on the screen (MemberRepository in the package app, and a Main that has the calling side, with only measuring lines marked PROBE at the end added) was compiled with javax.tools, and the ones that compiled successfully were run in a new Java process. The start class has @SpringBootConfiguration and @EnableAutoConfiguration, and no web server was started. The entity Member (id is Long, name is String) and MemberRepository are in the same package as the start class, and the repository was not registered by hand: Spring Data scanned the package, found the interface, and created the implementation object. What was checked against the run is the text printed, the javac diagnostic code and line of the compile error (cant.resolve.location.args, with save as the first error and, if there is count, as the second error), the chain of exceptions when Spring failed while starting (BeanCreationException, QueryCreationException, PropertyReferenceException), the number of MemberRepository beans in the Spring context, whether that object is a class we wrote (it is a JDK dynamic proxy, and there is no class of ours that implements MemberRepository), and the number of each kind of SQL and the statements sent to the database after startup ended (caught with Hibernate\'s StatementInspector). The three combinations without extends JpaRepository fail to compile, so Spring was started separately with the same interface and without the calling side, and it was confirmed that there were 0 implementation objects. In the combinations where compiling failed, the Main class file was not created. The documentation was opened directly and checked. The section Creating Repository Instances of the Spring Data Commons documentation says that Spring Data finds all interfaces that extend a repository sub-interface under the configured packages, creates a bean object for each of them, and creates a proxy that handles calls to the query methods. The section Core concepts of the Spring Data JPA documentation says that Repository is the central interface and that store-specific interfaces such as JpaRepository extend CrudRepository, and the section Defining Repository Interfaces says that an interface must extend Repository and that an interface that extends JpaRepository is a target of the Spring Data JPA module. Query Creation and Property Expressions in the section Query Methods explain that the part of a method name up to the first By is the subject and what comes after it is the condition, and that when the query is created, it checks whether the parsed name is a property of the managed entity. That this check happens when Spring starts and makes the startup fail, and the names of the exceptions, are not defined by the documentation but are behavior observed on this version. That the real class of the implementation object is a JDK proxy, that save sends one SELECT before the INSERT for an entity that has an id, and the shape and number of the SQL sent are also observed on this version and these settings, and they may differ by version. The code on the screen shortens the package and import lines, and it does not show the Member entity, the lines of main that start Spring and get the implementation object, or the database settings. This lab covers only findBy and one field name among the naming rules of query methods, and it does not cover @Query, condition keywords (And, GreaterThan, and so on), return types, page requests, or transactions. These are covered in the in-depth lab "Spring Data JPA".',
});

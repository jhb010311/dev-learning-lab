Lab.register({
  id: 'fetchjoin', nav: 'JPQL and fetch joins', cat: 'JPA', mode: 'step',
  title: 'What is the difference between join and join fetch?',
  intro: 'JPQL is a query language written against entities, not tables. When you load posts together with their comments, a plain join and a join fetch differ in which columns are read from the database and in which queries are sent afterward.',
  terms: ['JPQL', 'Fetch join', 'Collection fetch joins and pagination', 'MultipleBagFetchException', 'Cartesian product'],
  controls: [
    { id: 'q', label: 'JPQL to run', type: 'select', value: 'join', options: [['plain', 'select p from Post p (no join)'], ['table', 'select p from posts p (uses the table name)'], ['join', '… join p.comments c (plain join)'], ['fetch', '… join fetch p.comments (fetch join)'], ['fetchsort', '… join fetch p.comments c order by c.id desc (sorted by comment)'], ['two', '… join fetch p.comments join fetch p.files (two collections)']] },
    { id: 'page', label: 'Pagination: setFirstResult(0).setMaxResults(1)', type: 'check', value: false, hint: 'Asks for only 1 result, starting from the first.' },
  ],
  presets: [
    { t: 'Default settings', q: 'What are the result list and the follow-up comment queries when you run select p from Post p join p.comments c?', d: 'A plain join. Even though it joins, the comment queries are still sent separately for each post.', v: { q: 'join', page: false } },
    { t: 'join fetch', q: 'What if you change the plain join to join fetch p.comments?', d: 'It reads the comment columns in one go, so no queries follow.', v: { q: 'fetch', page: false } },
    { t: 'Query without a join', q: 'What if you run select p from Post p with no join?', d: 'It reads only the posts and queries the comments each time they are used.', v: { q: 'plain', page: false } },
    { t: 'Using the table name', q: 'What if you write a table name after from, as in select p from posts p?', d: 'In JPQL, an entity name must follow from.', v: { q: 'table', page: false } },
    { t: 'Pagination with a fetch join', q: 'What if you turn on pagination with setFirstResult(0).setMaxResults(1) for join fetch p.comments?', d: 'Hibernate 7.4.5 first cuts the posts in a subquery.', v: { q: 'fetch', page: true } },
    { t: 'A case that cuts in memory', q: 'What if you sort by comment with join fetch p.comments c order by c.id desc and turn on pagination?', d: 'If you sort by comment, it reads everything, cuts the results in memory, and logs a warning.', v: { q: 'fetchsort', page: true } },
    { t: 'Fetch join two collections', q: 'What if you fetch join two collections with join fetch p.comments join fetch p.files?', d: 'It is rejected with an exception before it runs.', v: { q: 'two', page: false } },
  ],
  jpql: function (c) {
    return { plain: 'select p from Post p order by p.id', table: 'select p from posts p order by p.id', join: 'select p from Post p join p.comments c order by p.id', fetch: 'select p from Post p join fetch p.comments order by p.id', fetchsort: 'select p from Post p join fetch p.comments c order by c.id desc', two: 'select p from Post p join fetch p.comments join fetch p.files order by p.id' }[c.q];
  },
  code: function (c) {
    var ent = '@Entity\n@Table(name = "posts")\nclass Post {\n    @Id Long id;\n    String title;\n\n    @OneToMany(mappedBy = "post")\n    List<Comment> comments = new ArrayList<>();\n\n    @OneToMany(mappedBy = "post")\n    List<Attachment> files = new ArrayList<>();     // attachments\n}\n\n@Entity\n@Table(name = "comments")\nclass Comment {\n    @Id Long id;\n    String text;\n\n    @ManyToOne(fetch = FetchType.LAZY)\n    Post post;\n}\n\n';
    return ent + '// DB: post 1 "Notice" has 3 comments, post 2 "Question" has 2 comments\nList<Post> posts = em.createQuery(\n        "' + this.jpql(c) + '",\n        Post.class)\n' + (c.page ? '    .setFirstResult(0)\n    .setMaxResults(1)\n' : '') + '    .getResultList();\n\nfor (Post p : posts) {\n    p.getComments().size();        // use the comments of each post\n}';
  },
  label: function (c) { return { plain: 'No join', table: 'Uses the table name', join: 'Plain join', fetch: 'join fetch', fetchsort: 'join fetch + sorted by comment', two: 'join fetch on two collections' }[c.q] + (c.page ? ' · pagination: 1 result' : ''); },
  columns: ['Result list', 'What the SQL read', 'Row limit', 'Follow-up comment queries', 'Warning or exception'],
  simulate: function (c) {
    var q = c.q, page = !!c.page, ev = [], sum = [], jp = this.jpql(c);
    var fetch = q === 'fetch' || q === 'fetchsort', joined = fetch || q === 'join';
    // rows: the rows the DB returned (p = post number, c = comment number, off = a row discarded in memory). list: the result list (n = number of comments filled in, how = how the comments were read)
    var st = { rows: [], list: [], sent: [], fresh: 0, warn: '', err: '', made: false, cut: false };
    function push(s, k) { ev.push({ s: s, k: k, snap: JSON.parse(JSON.stringify(st)) }); st.fresh = 0; }
    function send(sql, why) { st.sent.push({ sql: sql, why: why }); st.fresh++; }
    var title = { 1: 'Notice', 2: 'Question' }, count = { 1: 3, 2: 2 };
    var all = [{ p: 1, c: 1 }, { p: 1, c: 2 }, { p: 1, c: 3 }, { p: 2, c: 4 }, { p: 2, c: 5 }];
    function fail(exName, at) { return { events: ev, summary: sum, jp: jp, facts: { exAt: at, loaded: false, firstN: -1 }, row: ['None (exception)', '-', '-', '-', 'IllegalArgumentException (cause: ' + exName + ')'] }; }
    if (q === 'table') {
      st.err = 'UnknownEntityException';
      push('em.createQuery("… from posts p …"): In JPQL, an entity name must follow from, not a table name. posts is the table name written in @Table, and there is no entity with that name. When the query is created, an IllegalArgumentException (cause: UnknownEntityException) is thrown. Nothing was sent to the database.', 'bad');
      sum.push('JPQL is written with entity names (Post) and field names (p.title, p.comments). Hibernate fills in the table names (posts) and column names when it translates the query into SQL. So a table name written as is gets rejected, as in this query.' + (page ? ' The pagination setting applies after the query is created, so it does not affect the result.' : ''));
      return fail('UnknownEntityException', 'createQuery');
    }
    push('em.createQuery(…): JPQL is written against entities, not tables. Post in from Post p is the entity name (the class name unless you set another one)' + (q === 'plain' ? '' : ', and p.comments is a field name of Post') + '. Hibernate translates this into SQL that queries the posts' + (q === 'plain' ? ' table' : q === 'two' ? ', comments, and files tables' : ' and comments tables') + '.', '');
    if (page) push('setFirstResult(0).setMaxResults(1): Asks for only 1 element of the result list, starting from the first. No SQL has been sent yet.', '');
    if (q === 'two') {
      st.err = 'MultipleBagFetchException';
      push('getResultList(): Hibernate rejects the query at the moment it tries to run it. comments and files are both Lists, and if you fetch two Lists with one SQL statement, the rows multiply to the product of the two list sizes, so you cannot tell which rows are duplicates. An IllegalArgumentException (cause: MultipleBagFetchException) is thrown, and no SQL is sent.', 'bad');
      sum.push('You cannot fetch join two collections declared as List together. If you change files to a Set, the exception goes away, but when this was run in the same environment, the database returned 8 rows (post 1 has 3 comments × 2 attachments = 6 rows), and the comments list of post 1 (the one that stayed a List) contained the same comments repeated, 6 in total.', 'Fetch join only one collection, and fetch the rest separately by using lazy fetching together with a batch size setting.' + (page ? ' It is the same exception whether or not you add pagination.' : ''));
      return fail('MultipleBagFetchException', 'getResultList');
    }
    // Where the results are cut: sql = the end of the outer query, sub = a subquery, mem = memory
    var lim = !page ? 'none' : q === 'fetch' ? 'sub' : q === 'fetchsort' ? 'mem' : 'sql';
    var base = 'from posts p' + (joined ? ' join comments c on c.post_id = p.id' : ''), cols = fetch ? 'select p.*, c.*' : 'select p.*', order = q === 'fetchsort' ? ' order by c.id desc' : ' order by p.id';
    var sql = lim === 'sub' ? cols + ' from (select * from posts p where exists (select 1 from comments c where c.post_id = p.id) order by p.id limit 1) p join comments c on c.post_id = p.id order by p.id' : cols + ' ' + base + order + (lim === 'sql' ? ' limit 1' : '');
    var rows = q === 'plain' ? [{ p: 1 }, { p: 2 }] : q === 'fetchsort' ? all.slice().reverse() : all.slice();
    if (lim === 'sql') rows = rows.slice(0, 1);
    if (lim === 'sub') rows = rows.filter(function (r) { return r.p === 1; });
    st.rows = rows; send(sql, 'List query');
    var what = q === 'plain' ? 'It queries only the posts table.' : q === 'join' ? 'It joins the comments table, but the select clause has only the post columns. The comments are used only in the join condition.' : 'It joins the comments table and also puts the comment columns in the select clause.';
    var cnt = lim === 'sql' ? 'A row limit is added to the end of the SQL, so the database returns only 1 row.' + (q === 'join' ? ' This limit applies to the rows multiplied by the join, not to the posts.' : '')
      : lim === 'sub' ? 'Hibernate 7.4.5 first cuts the posts down to 1 in the inner subquery and then joins the comments only to that post. The database returns 3 rows, as many as the comments of post 1.'
      : lim === 'mem' ? 'But the SQL has no row limit. This is because the sort key is the comment, so the posts cannot be cut first. The database returns all 5 rows.'
      : q === 'plain' ? 'The database returns 2 rows, one per post.' : 'Post 1 has 3 comments, so it takes 3 rows, and post 2 takes 2 rows, so the database returns 5 rows in all.' + (q === 'fetchsort' ? ' The comment ids are in descending order, so the rows of post 2 come first.' : '');
    push('getResultList(): The SQL is sent. ' + what + ' ' + cnt, lim === 'mem' ? 'bad' : '');
    var ids = []; rows.forEach(function (r) { if (ids.indexOf(r.p) < 0) ids.push(r.p); });
    st.list = ids.map(function (id) { return { id: id, title: title[id], n: fetch ? count[id] : -1, how: fetch ? 'fetch' : '' }; }); st.made = true;
    push(rows.length + (rows.length === 1 ? ' row is' : ' rows are') + ' converted to Post objects. ' + (rows.length > ids.length ? 'The same post appears in several rows, but Hibernate holds it only once, so the result list has ' + ids.length + (ids.length === 1 ? ' post. ' : ' posts. ') : 'The result list has ' + ids.length + (ids.length === 1 ? ' post. ' : ' posts. ')) + (fetch ? 'The comments list of each post is also filled in from the comment columns in each row.' : 'The comments list is still empty (not loaded) because the comment columns were not read.'), fetch ? 'good' : '');
    if (lim === 'mem') {
      var keep = ids[0]; st.list = st.list.slice(0, 1); st.rows.forEach(function (r) { if (r.p !== keep) r.off = true; }); st.cut = true; st.warn = 'HHH90003004'; ids = [keep];
      push('Of the 2 posts that were read, only the first 1 is kept and the rest are discarded. The cutting was done in the memory of the application, not in the database. Hibernate writes the warning HHH90003004 (firstResult/maxResults specified with collection fetch; applying in memory) to the log.', 'bad');
    }
    var extra = 0;
    if (fetch) push('In the loop, the code uses the comments of ' + (ids.length > 1 ? 'each post' : 'the post') + '. The comments list is already filled in, so no additional query is sent.', 'good');
    else st.list.forEach(function (p) {
      extra++; p.n = count[p.id]; p.how = 'lazy'; send('select * from comments where post_id = ' + p.id, 'Comments of post ' + p.id + ' (lazy fetching)');
      push('Loop, post ' + p.id + ': The moment p.getComments().size() is called, a separate comment query is sent to fill in the empty list.', 'bad');
    });
    if (q === 'plain') sum.push('The related comments were not fetched, so a comment query is sent separately for each post. As the number of posts grows, the number of queries grows with it (see the "N+1" lab).' + (page ? ' Pagination on a query that does not fetch join a collection is handled in the SQL as it is.' : ''));
    if (q === 'join') sum.push('A plain join only puts a join into the SQL. It does not read the columns of the associated entity. It is useful when you filter by comments, but you have to query again to use the comments. To fetch them together, use join fetch.', page ? 'Note that the row limit applies to the rows multiplied by the join. When the second page (setFirstResult(1)) was requested in the same environment, post 1 came again instead of post 2, because the second row is also a row of post 1.' : 'The database returned 5 rows, but the result list had 2 posts. For a query that returns a single entity, Hibernate 7.4.5 holds the same entity only once. It was also confirmed in the same environment that if you query values (p.title) instead of entities, 5 items come out as they are.');
    if (q === 'fetch' && !page) sum.push('join fetch reads even the columns of the associated comments with one SQL statement and fills in the comments list. So no queries follow.', 'If you join a collection, the rows grow to 5, but the result list is 2 posts. The documentation says that up to Hibernate 5, the same post appeared in the result as many times as it had comments, so you had to add select distinct (an older version could not be run in this environment).');
    if (q === 'fetch' && page) sum.push('When you add pagination to a collection fetch join, Hibernate 7.4.5 builds SQL that first cuts the posts in a subquery and joins only the comments of that post. It cuts in the database, so it reads only the 3 rows it needs.', 'The documentation says that older versions (such as Hibernate 6, which Spring Boot 3 uses) read everything without a row limit and cut in memory in this case. Even in the current version, there are cases where this still happens.');
    if (q === 'fetchsort' && !page) sum.push('Even if you change the sort key to the comment, the result of the fetch join is the same. The rows with a larger comment id come first, so only the order of the result list changed, to post 2 and then post 1.');
    if (lim === 'mem') sum.push('If you add pagination to a collection fetch join and the SQL has no row limit, it read all the matching rows and then cut them in memory. Here it is 5 rows, but if there were hundreds of thousands of posts, all of them would be loaded into memory.', 'Hibernate 7.4.5 cuts in the database when it can, such as when sorting by post, but it cuts in memory when the sort key is on the collection side, as in this example. The documentation says that older versions always handled the pagination of a collection fetch join this way. If you see the warning HHH90003004, stop fetch joining the collection and change it to fetch the collection with a batch size setting.');
    var limText = { none: 'No pagination', sql: 'At the end of the SQL', sub: 'Inside the subquery', mem: 'Not in the SQL (cut in memory)' }[lim];
    return { events: ev, summary: sum, jp: jp, facts: { exAt: 'none', loaded: fetch, firstN: count[ids[0]] }, row: [ids.length + (ids.length === 1 ? ' post' : ' posts') + ' (ids ' + ids.join(', ') + ')', (fetch ? 'Posts + comment columns' : 'Post columns only') + ' · ' + rows.length + (rows.length === 1 ? ' row' : ' rows'), limText, extra + '', st.warn ? st.warn + ' warning' : 'none'] };
  },
  blank: function () { return { rows: [], list: [], sent: [], fresh: 0, warn: '', err: '', made: false, cut: false }; },
  render: function (v, sim, t, H, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : this.blank();
    if (s.sent.length) H.table(v, ['#', 'SQL', 'Reason'], s.sent.map(function (x, i) { return { cells: [String(i + 1), { v: x.sql, cls: i >= s.sent.length - s.fresh ? 'hot' : '' }, x.why] }; }), 'SQL sent to the DB');
    if (s.warn) H.text(v, 'Warning ' + s.warn + ': firstResult/maxResults specified with collection fetch; applying in memory');
    if (s.err) H.text(v, 'Exception: IllegalArgumentException (cause: ' + s.err + ')');
  },
  // Diagram: the JPQL is at the top, the rows returned by the DB are on the left, and the result list made from those rows (the post objects and the state of their comments lists) is on the right. A row discarded in memory turns into a dashed box.
  draw: function (P, sim, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : this.blank(), loaded = sim.facts.loaded;
    P.size(680, 330);
    P.box('jpql', 16, 12, 648, 32, { cls: s.err ? 'bad' : 'plain', title: sim.jp, center: true });
    P.region('rs', 16, 58, 290, 212, 'Rows returned by the DB');
    P.region('list', 374, 58, 290, 212, 'Result list List<Post>');
    if (!s.rows.length) P.box('r0', 30, 92, 262, 30, { cls: 'ghost', sub: s.err ? 'No SQL sent' : 'Not queried yet', center: true });
    s.rows.forEach(function (r, i) { P.box('r' + (i + 1), 30, 90 + i * 34, 262, 28, { cls: r.off ? 'ghost' : r.p === 1 ? 'wait' : 'plain', title: 'Post ' + r.p, right: r.c ? 'Comment ' + r.c + (loaded ? '' : ' (join only)') : '' }); });
    if (!s.made) P.box('p0', 388, 92, 262, 30, { cls: 'ghost', sub: s.err ? 'No result (exception)' : 'None yet', center: true });
    s.list.forEach(function (p, i) { P.box('p' + p.id, 388, 90 + i * 66, 262, 52, { cls: p.n < 0 ? 'plain' : p.how === 'fetch' ? 'good' : 'hot', title: 'Post ' + p.id + ' "' + p.title + '"', sub: p.n < 0 ? 'comments: not loaded yet' : 'comments: ' + p.n + (p.how === 'fetch' ? ' (loaded together)' : ' (extra query)') }); });
    if (s.made) P.arrow('conv', 'rs:r', 'list:l', { cls: s.cut ? 'bad' : 'hot', label: 'rows ' + s.rows.length + ' → posts ' + s.list.length });
    var extra = Math.max(0, s.sent.length - 1);
    P.box('res', 16, 282, 648, 36, { cls: s.err || s.warn ? 'bad' : extra ? 'hot' : s.made ? 'good' : 'ghost', title: s.err ? 'Exception: ' + s.err : s.warn ? 'Warning ' + s.warn + ' (cut in memory)' : 'SQL sent to the DB', right: s.err ? 'SQL: 0' : s.sent.length ? '1 list query' + (extra ? ' + ' + extra + (extra === 1 ? ' comment query' : ' comment queries') : '') : 'None yet' });
    P.note('On the left are the rows returned by the list query SQL (the rows of post 1 are blue), and on the right is the result list that Hibernate made from those rows. A green post had its comments read together with it, and a yellow post had its comments read by an additional query. A row that turned dashed was read but discarded in memory.');
  },
  assume: 'With 3 comments on post 1 and 2 comments on post 2, all 12 combinations (6 JPQL queries, each with and without pagination) were run on real Hibernate 7.4.5 and an H2 database, and the size and order of the result list, the number of rows the database returned, whether the SQL contains the comment columns and a row limit and where, the number of follow-up queries, and the warnings and exceptions were confirmed to match the screen. The SQL on the screen is shortened to be easy to read. The row limit is written as limit 1, but the statement actually sent on H2 was offset ? rows fetch first ? rows only, and it differs by database. The result for this topic differs by version. Cutting in the database with a subquery when you add pagination to a fetch join, and holding the same entity only once in the result of a plain join, are results of running 7.4.5. The statements "older versions always cut in memory" and "up to Hibernate 5, distinct was needed" follow the documentation, and they were not verified by execution because no older version is installed on the PC used to write this lab. The comparison was done with the application freshly started for each combination (a new SessionFactory was created). This is because, in the same environment, when the same fetch join JPQL was first run without pagination and then run with pagination in the same SessionFactory, the SQL without a row limit was reused, and the whole result came back. Also, when a where condition was placed on the fetch-joined comments and pagination was applied, an SQL syntax error occurred in this environment. Code that uses a collection fetch join together with pagination needs its actual SQL checked on the version you use. A plain join and a join fetch are inner joins, so posts without comments drop out of the result, but the data of this lab has no such post.',
});

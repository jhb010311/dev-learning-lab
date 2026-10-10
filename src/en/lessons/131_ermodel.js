Lab.register({
  id: 'ermodel', nav: 'ER modeling', cat: 'Database', mode: 'step',
  title: 'How do you turn the relationships between entities into tables?',
  intro: 'You turn three relationships into tables: members and posts (one-to-many), posts and tags (many-to-many), and members and profiles (one-to-one). For each relationship, a common design is placed next to a design that looks plausible but goes wrong. Give both the same job (finding what is connected, or connecting one more), and the query results differ.',
  terms: ['Entity-relationship model (entities, attributes, relationships)', 'Types of relationships (one-to-one, one-to-many, many-to-many)', 'Associative table', 'Primary key, unique key, foreign key'],
  controls: [
    { id: 'design', label: 'Relationship and table design', type: 'select', value: 'm2m_csv', options: [['o2m_many', 'One-to-many (member-post): foreign key on the post, the "many" side'], ['o2m_one', 'One-to-many (member-post): foreign key on the member, the "one" side'], ['m2m_link', 'Many-to-many (post-tag): associative table post_tag'], ['m2m_csv', 'Many-to-many (post-tag): a string column joined with commas'], ['m2m_cols', 'Many-to-many (post-tag): columns tag1, tag2, tag3'], ['o2o_uq', 'One-to-one (member-profile): foreign key + unique'], ['o2o_fk', 'One-to-one (member-profile): foreign key only (no unique)']] },
    { id: 'task', label: 'Task to try', type: 'select', value: 'find', options: [['find', 'Find what is connected'], ['add', 'Connect one more']], hint: 'In one-to-one, "connect one more" means trying to insert a second profile, which must not be allowed.' },
  ],
  presets: [
    { t: 'Default settings', d: 'Finds the java tag in the comma-separated string. The javascript post comes back too.', v: { design: 'm2m_csv', task: 'find' } },
    { t: 'Finding with an associative table', d: 'Exactly the 2 posts with the java tag come back.', v: { design: 'm2m_link', task: 'find' } },
    { t: 'A fourth tag in tag1~tag3', d: 'There is no column to put it in, so an error occurs.', v: { design: 'm2m_cols', task: 'add' } },
    { t: 'One more tag in the associative table', d: 'Inserting one row into the associative table is all it takes.', v: { design: 'm2m_link', task: 'add' } },
    { t: 'Foreign key on the "one" side', d: 'Of the 2 posts that the member wrote, only 1 is found.', v: { design: 'o2m_one', task: 'find' } },
    { t: 'One-to-one without a unique constraint', d: 'Two profiles go in for one member.', v: { design: 'o2o_fk', task: 'add' } },
    { t: 'One-to-one with a unique constraint', d: 'The second profile is blocked with error 1062.', v: { design: 'o2o_uq', task: 'add' } },
  ],
  // The table definitions (CREATE TABLE) and the initial data for each design. The model and the INSERT statements on the screen are made from the same data.
  base: function (design) {
    var member = ['member', ['id', 'name'], [[1, 'Alice'], [2, 'Bob'], [3, 'Carol']]], post = ['post', ['id', 'title'], [[1, 'Spring 101'], [2, 'Java Basics'], [3, 'Building UIs']]];
    var cm = 'CREATE TABLE member (\n  id   INT PRIMARY KEY,\n  name VARCHAR(20) NOT NULL\n)', cp = 'CREATE TABLE post (\n  id    INT PRIMARY KEY,\n  title VARCHAR(50) NOT NULL\n)';
    if (design === 'o2m_many') return { rel: 'o2m', ddl: [cm, 'CREATE TABLE post (\n  id        INT PRIMARY KEY,\n  title     VARCHAR(50) NOT NULL,\n  member_id INT NOT NULL,\n  FOREIGN KEY (member_id) REFERENCES member (id)\n)'], t: [member, ['post', ['id', 'title', 'member_id'], [[1, 'Spring 101', 1], [2, 'Java Basics', 1], [3, 'Building UIs', 2]]]] };
    if (design === 'o2m_one') return { rel: 'o2m', ddl: [cp, 'CREATE TABLE member (\n  id      INT PRIMARY KEY,\n  name    VARCHAR(20) NOT NULL,\n  post_id INT,\n  FOREIGN KEY (post_id) REFERENCES post (id)\n)'], t: [post, ['member', ['id', 'name', 'post_id'], [[1, 'Alice', 1], [2, 'Bob', 3], [3, 'Carol', null]]]] };
    if (design === 'm2m_link') return { rel: 'm2m', ddl: [cp, 'CREATE TABLE tag (\n  id   INT PRIMARY KEY,\n  name VARCHAR(20) NOT NULL UNIQUE\n)', 'CREATE TABLE post_tag (\n  post_id INT NOT NULL,\n  tag_id  INT NOT NULL,\n  PRIMARY KEY (post_id, tag_id),\n  FOREIGN KEY (post_id) REFERENCES post (id),\n  FOREIGN KEY (tag_id) REFERENCES tag (id)\n)'], t: [post, ['tag', ['id', 'name'], [[1, 'java'], [2, 'spring'], [3, 'jpa'], [4, 'javascript'], [5, 'docker']]], ['post_tag', ['post_id', 'tag_id'], [[1, 1], [1, 2], [1, 3], [2, 1], [3, 4]]]] };
    if (design === 'm2m_csv') return { rel: 'm2m', ddl: ['CREATE TABLE post (\n  id    INT PRIMARY KEY,\n  title VARCHAR(50) NOT NULL,\n  tags  VARCHAR(100)\n)'], t: [['post', ['id', 'title', 'tags'], [[1, 'Spring 101', 'java,spring,jpa'], [2, 'Java Basics', 'java'], [3, 'Building UIs', 'javascript']]]] };
    if (design === 'm2m_cols') return { rel: 'm2m', ddl: ['CREATE TABLE post (\n  id    INT PRIMARY KEY,\n  title VARCHAR(50) NOT NULL,\n  tag1  VARCHAR(20),\n  tag2  VARCHAR(20),\n  tag3  VARCHAR(20)\n)'], t: [['post', ['id', 'title', 'tag1', 'tag2', 'tag3'], [[1, 'Spring 101', 'java', 'spring', 'jpa'], [2, 'Java Basics', 'java', null, null], [3, 'Building UIs', 'javascript', null, null]]]] };
    return { rel: 'o2o', ddl: [cm, 'CREATE TABLE profile (\n  id        INT PRIMARY KEY,\n  member_id INT NOT NULL' + (design === 'o2o_uq' ? ' UNIQUE' : '') + ',\n  bio       VARCHAR(50),\n  FOREIGN KEY (member_id) REFERENCES member (id)\n)'], t: [member, ['profile', ['id', 'member_id', 'bio'], [[1, 1, 'Backend developer'], [2, 2, 'Designer']]]] };
  },
  WRITE: {
    o2m_many: ["INSERT INTO post (id, title, member_id)\nVALUES (4, 'Docker 101', 1)"],
    o2m_one: ["INSERT INTO post (id, title)\nVALUES (4, 'Docker 101')", 'UPDATE member SET post_id = 4\n WHERE id = 1'],
    m2m_link: ['INSERT INTO post_tag (post_id, tag_id)\nVALUES (1, 5)'],
    m2m_csv: ["UPDATE post SET tags = CONCAT(tags, ',docker')\n WHERE id = 1"],
    m2m_cols: ["UPDATE post SET tag4 = 'docker'\n WHERE id = 1"],
    o2o_uq: ["INSERT INTO profile (id, member_id, bio)\nVALUES (3, 1, 'Second bio')"],
    o2o_fk: ["INSERT INTO profile (id, member_id, bio)\nVALUES (3, 1, 'Second bio')"],
  },
  // Queries: in one-to-many and one-to-one, finding and checking are the same query, and in many-to-many, finding (posts with java) and checking (the tags of post 1) are different
  QUERY: {
    o2m_many: ['SELECT id, title\n  FROM post\n WHERE member_id = 1\n ORDER BY id'],
    o2m_one: ['SELECT p.id, p.title\n  FROM member m\n  JOIN post p ON p.id = m.post_id\n WHERE m.id = 1\n ORDER BY p.id'],
    m2m_link: ["SELECT p.id, p.title\n  FROM post p\n  JOIN post_tag pt ON pt.post_id = p.id\n  JOIN tag t ON t.id = pt.tag_id\n WHERE t.name = 'java'\n ORDER BY p.id", 'SELECT t.name\n  FROM post_tag pt\n  JOIN tag t ON t.id = pt.tag_id\n WHERE pt.post_id = 1\n ORDER BY t.id'],
    m2m_csv: ["SELECT id, title\n  FROM post\n WHERE tags LIKE '%java%'\n ORDER BY id", 'SELECT tags\n  FROM post\n WHERE id = 1'],
    m2m_cols: ["SELECT id, title\n  FROM post\n WHERE tag1 = 'java'\n    OR tag2 = 'java'\n    OR tag3 = 'java'\n ORDER BY id", 'SELECT tag1, tag2, tag3\n  FROM post\n WHERE id = 1'],
    o2o_uq: ['SELECT id, bio\n  FROM profile\n WHERE member_id = 1\n ORDER BY id'],
    o2o_fk: ['SELECT id, bio\n  FROM profile\n WHERE member_id = 1\n ORDER BY id'],
  },
  // What should come back from the query for this relationship (the correct answer in concept)
  EXPECT: { o2m: { find: ['1', '2'], add: ['1', '2', '4'] }, m2m: { find: ['1', '2'], add: ['java', 'spring', 'jpa', 'docker'] }, o2o: { find: ['1'], add: ['1'] } },
  NOUN: { o2m: { find: 'post IDs', add: 'post IDs' }, m2m: { find: 'post IDs', add: 'tag names' }, o2o: { find: 'profile IDs', add: 'profile IDs' } },
  // Picks the list of "what is connected" out of the rows of the query result. For the comma-separated string and tag1~tag3, it takes several items out of one row.
  items: function (c, rows) {
    if (c.task === 'add' && c.design === 'm2m_csv') return rows.length ? String(rows[0][0]).split(',') : [];
    if (c.task === 'add' && c.design === 'm2m_cols') return rows.length ? rows[0].filter(function (x) { return x !== 'NULL'; }) : [];
    return rows.map(function (r) { return r[0]; });
  },
  query: function (c) { var q = this.QUERY[c.design]; return c.task === 'add' && q[1] ? q[1] : q[0]; },
  // SQL that is used by both the code on the screen and the checking program (verify/mysql/ermodel_probe.js)
  plan: function (c) {
    var b = this.base(c.design);
    function lit(x) { return x === null ? 'NULL' : typeof x === 'number' ? String(x) : "'" + x + "'"; }
    var seed = b.t.map(function (t) { return 'INSERT INTO ' + t[0] + ' (' + t[1].join(', ') + ') VALUES\n' + t[2].map(function (r) { return '  (' + r.map(lit).join(', ') + ')'; }).join(',\n'); });
    return { tables: b.t.map(function (t) { return { name: t[0], head: t[1] }; }), ddl: b.ddl, seed: seed, write: c.task === 'add' ? this.WRITE[c.design] : [], query: this.query(c) };
  },
  code: function (c) {
    var p = this.plan(c);
    return '-- Tables\n' + p.ddl.join(';\n') + ';\n\n-- Initial data\n' + p.seed.join(';\n') + ';\n' + (p.write.length ? '\n-- Connect one more\n' + p.write.join(';\n') + ';\n' : '') + '\n-- ' + (c.task === 'find' ? 'Find what is connected' : 'Check query') + '\n' + p.query + ';';
  },
  label: function (c) { return { o2m_many: 'One-to-many · foreign key on the post', o2m_one: 'One-to-many · foreign key on the member', m2m_link: 'Many-to-many · associative table', m2m_csv: 'Many-to-many · comma-separated string', m2m_cols: 'Many-to-many · tag1~tag3', o2o_uq: 'One-to-one · foreign key + unique', o2o_fk: 'One-to-one · foreign key only' }[c.design] + ' · ' + (c.task === 'find' ? 'Find' : 'Connect one more'); },
  columns: ['Result of the write statement', 'Rows returned', 'Comparison with what should come back'],
  simulate: function (c) {
    var self = this, d = c.design, add = c.task === 'add', b = this.base(d), ev = [], sum = [], T = {}, hl = {}, wr = '', res = null;
    b.t.forEach(function (t) { T[t[0]] = t[2].map(function (r) { return r.slice(); }); });
    function nul(x) { return x === null ? 'NULL' : String(x); }
    function snap() { return { t: b.t.map(function (t) { return { name: t[0], head: t[1], rows: T[t[0]].map(function (r) { return r.map(nul); }) }; }), hl: JSON.parse(JSON.stringify(hl)), wr: wr, res: res ? JSON.parse(JSON.stringify(res)) : null }; }
    function push(s, k) { ev.push({ s: s, k: k, snap: snap() }); }
    function flat(q) { return q.replace(/\s*\n\s*/g, ' '); }
    push({ o2m_many: 'CREATE TABLE, INSERT: This is a one-to-many relationship in which one member writes many posts. The post table, the "many" side, has a member_id column (a foreign key). Each post row points to the one member who wrote it. Alice wrote posts 1 and 2, and Bob wrote post 3.',
      o2m_one: 'CREATE TABLE, INSERT: This tries to express a one-to-many relationship in which one member writes many posts by putting a post_id column (a foreign key) in the member table, the "one" side. A single cell can hold only one value, so a member row can point to only one post. Alice wrote posts 1 and 2, but only 1 is written in post_id, and there is no place to record who wrote post 2.',
      m2m_link: 'CREATE TABLE, INSERT: This is a many-to-many relationship in which a post has many tags and a tag is attached to many posts. The associative table post_tag sits between post and tag. The single fact that "post 1 has the java tag" is one row (1, 1) of post_tag.',
      m2m_csv: 'CREATE TABLE, INSERT: This stores the many-to-many relationship between posts and tags without an associative table, by joining the tag names with commas in the tags column of the post table. To the DB, tags is just one cell that holds characters, and it does not know how many tags are inside.',
      m2m_cols: 'CREATE TABLE, INSERT: This stores the many-to-many relationship between posts and tags without an associative table, by putting the columns tag1, tag2, and tag3 in the post table. A post can have at most three tags, and for a post with fewer tags, the remaining cells are NULL.',
      o2o_uq: 'CREATE TABLE, INSERT: This is a one-to-one relationship in which a member has only one profile. The profile table has a member_id foreign key together with a unique constraint. There cannot be two profile rows that point to the same member.',
      o2o_fk: 'CREATE TABLE, INSERT: This is a one-to-one relationship in which a member must have only one profile. The profile table has a member_id foreign key, but no unique constraint. The shape of the table is exactly the same as one-to-many (one member with many profiles).' }[d], '');
    // Connect one more
    var w = { err: null, affected: 0 };
    if (add) {
      if (d === 'o2m_many') { T.post.push([4, 'Docker 101', 1]); w.affected = 1; hl.p4 = 'hot'; wr = 'Success (1 row)'; push(flat(this.WRITE[d][0]) + ': Inserts a new post written by Alice into post. Writing 1 in member_id of the new row finishes the connection. The member table is not touched.', 'good'); }
      if (d === 'o2m_one') {
        T.post.push([4, 'Docker 101']); hl.p4 = 'hot'; wr = 'Success (1 row)'; push(flat(this.WRITE[d][0]) + ': Inserts a new post into post. post has no cell that points to a member, so who wrote it is not recorded anywhere yet.', '');
        T.member[0][2] = 4; w.affected = 1; hl.m1 = 'hot'; hl.p1 = 'bad'; push(flat(this.WRITE[d][1]) + ': Changes post_id of Alice to 4. There is only one cell, so the 1 that was written there is erased. The fact that Alice wrote post 1 has disappeared from the tables.', 'bad');
      }
      if (d === 'm2m_link') { T.post_tag.push([1, 5]); w.affected = 1; hl.l1_5 = 'hot'; wr = 'Success (1 row)'; push(flat(this.WRITE[d][0]) + ': Attaches the docker tag (id 5) to post 1. Inserting one row (1, 5) into the associative table is all it takes. The rows of post and tag do not change.', 'good'); }
      if (d === 'm2m_csv') { T.post[0][2] = T.post[0][2] + ',docker'; w.affected = 1; hl.p1 = 'hot'; wr = 'Success (1 row)'; push(flat(this.WRITE[d][0]) + ': Appends ",docker" to the tags string of post 1. This writes a whole new value over the string, and the DB does not check whether the appended characters are a tag, or a tag that already exists.', ''); }
      if (d === 'm2m_cols') { w.err = { no: 1054, msg: "Unknown column 'tag4' in 'field list'" }; hl.x4 = 'bad'; wr = 'Error 1054'; push(flat(this.WRITE[d][0]) + ': tag1, tag2, and tag3 of post 1 are all full, so the fourth tag would have to go into tag4. There is no such column, so it is rejected with error 1054 (' + w.err.msg + '). To add one, you would first have to change the shape of the table with ALTER TABLE.', 'bad'); }
      if (d === 'o2o_uq') { w.err = { no: 1062, msg: "Duplicate entry '1' for key 'profile.member_id'" }; wr = 'Error 1062'; push(flat(this.WRITE[d][0]) + ': Tries to insert a second profile that points to member 1. The unique constraint on member_id does not accept the same value 1, so it is rejected with error 1062 (' + w.err.msg + ').', 'good'); }
      if (d === 'o2o_fk') { T.profile.push([3, 1, 'Second bio']); w.affected = 1; wr = 'Success (1 row)'; hl.f3 = 'bad'; push(flat(this.WRITE[d][0]) + ': Tries to insert a second profile that points to member 1. A foreign key checks only "does member 1 actually exist", so it passes. 1 row was inserted.', 'bad'); }
    }
    // Query
    var rows = [], q = flat(this.query(c)), nounOf = this.NOUN[b.rel][c.task], want = this.EXPECT[b.rel][c.task];
    function finish(text, extra) {
      var items = self.items(c, rows), same = items.slice().sort().join('|') === want.slice().sort().join('|');
      res = { n: rows.length, items: items, same: same, text: rows.length + (rows.length === 1 ? ' row' : ' rows') + ': ' + (items.length ? nounOf + ' ' + items.join(', ') : 'none') };
      push(q + ': ' + text + ' ' + (same ? 'This is the same as what should come back (' + nounOf + ' ' + want.join(', ') + ').' : 'What should come back is ' + nounOf + ' ' + want.join(', ') + ', but the result is different.') + (extra ? ' ' + extra : ''), same ? 'good' : 'bad');
    }
    if (d === 'o2m_many') { rows = T.post.filter(function (p) { return p[2] === 1; }).map(function (p) { hl['p' + p[0]] = 'good'; return [nul(p[0]), p[1]]; }); finish('Selects the rows of post whose member_id is 1. Returns ' + rows.length + (rows.length === 1 ? ' row.' : ' rows.'), add ? '' : 'These are all the posts that Alice wrote.'); }
    if (d === 'o2m_one') { var pid = T.member[0][2]; rows = T.post.filter(function (p) { return p[0] === pid; }).map(function (p) { hl['p' + p[0]] = 'good'; return [nul(p[0]), p[1]]; }); finish('Fetches the post that post_id of member 1 points to. There is only one cell, so there is always at most 1 row.', add ? 'The only post that the tables now show as written by Alice is post 4.' : 'The fact that Alice also wrote post 2 is nowhere in the tables, so no query can find it.'); }
    if (d === 'o2o_uq' || d === 'o2o_fk') { rows = T.profile.filter(function (f) { return f[1] === 1; }).map(function (f) { if (hl['f' + f[0]] !== 'bad') hl['f' + f[0]] = 'good'; return [nul(f[0]), f[2]]; }); finish('Selects the rows of profile whose member_id is 1. Returns ' + rows.length + (rows.length === 1 ? ' row.' : ' rows.'), rows.length > 1 ? 'One member now has two profiles. It is not one-to-one any more but one-to-many.' : add ? 'The second profile was blocked, so one-to-one is kept.' : ''); }
    if (d === 'm2m_link' && !add) {
      var tg = T.tag.filter(function (t) { return t[1] === 'java'; })[0]; hl['t' + tg[0]] = 'hot';
      push("WHERE t.name = 'java': Looks for the row in the tag table whose name is java. It is the row with id 1. A tag is one row of the tag table, so the comparison is on the whole name. javascript (id 4) is a different row.", '');
      var lk = T.post_tag.filter(function (l) { return l[1] === tg[0]; }); lk.forEach(function (l) { hl['l' + l[0] + '_' + l[1]] = 'hot'; });
      push('JOIN post_tag: Looks for the rows in the associative table whose tag_id is 1. They are (1, 1) and (2, 1), 2 rows. They mean "java is on post 1" and "java is on post 2".', '');
      rows = lk.map(function (l) { var p = T.post.filter(function (x) { return x[0] === l[0]; })[0]; hl['p' + p[0]] = 'good'; return [nul(p[0]), p[1]]; });
      finish('Uses the post_id of the rows that were found to fetch the rows of post. Returns 2 rows.', '');
    }
    if (d === 'm2m_link' && add) { rows = T.post_tag.filter(function (l) { return l[0] === 1; }).map(function (l) { var t = T.tag.filter(function (x) { return x[0] === l[1]; })[0]; hl['t' + t[0]] = 'good'; return [t[1]]; }); finish('Looks for the rows of the associative table whose post_id is 1, and fetches the names of their tags. Each tag is one row, so 4 rows come back.', ''); }
    if (d === 'm2m_csv' && !add) {
      T.post.forEach(function (p) {
        var hit = p[2].indexOf('java') >= 0, tags = p[2].split(','), real = tags.indexOf('java') >= 0;
        if (hit) rows.push([nul(p[0]), p[1]]);
        hl['p' + p[0]] = hit ? (real ? 'good' : 'bad') : '';
        push("Tags '" + p[2] + "' of post " + p[0] + " LIKE '%java%': " + (hit ? (real ? 'The string contains the characters java, so it matches the condition. This post really does have the java tag.' : 'The string contains the characters java, so it matches the condition. But the tag of this post is javascript. LIKE only looks at whether the characters are inside, and does not look at whether it equals one of the tags split at the commas.') : 'The string does not contain the characters java, so it does not match the condition.'), hit && !real ? 'bad' : '');
      });
      finish('3 rows matched the condition.', 'Post 3, which does not have the java tag, got mixed in.');
    }
    if (d === 'm2m_csv' && add) { rows = [[T.post[0][2]]]; hl.p1 = 'good'; finish('Reads the tags of post 1. There are four tags, but they come back as 1 row, one string. To use the tags one by one, the program that receives it has to split it at the commas.', ''); }
    if (d === 'm2m_cols' && !add) {
      T.post.forEach(function (p) { var k = [2, 3, 4].filter(function (i) { return p[i] === 'java'; })[0]; if (k) { rows.push([nul(p[0]), p[1]]); hl['p' + p[0]] = 'good'; hl['c' + p[0] + '_' + (k - 1)] = 'good'; } });
      finish('For each post, compares the three cells tag1, tag2, and tag3 in turn with java, and picks the post if any one is equal. It compares the whole value, so javascript is not matched. Returns 2 rows.', 'The result is right, but you cannot know which cell the tag will be in, so you have to write as many ORs as there are columns.');
    }
    if (d === 'm2m_cols' && add) { rows = [T.post[0].slice(2).map(nul)]; finish('Reads tag1, tag2, and tag3 of post 1. They are the original three tags, unchanged.', 'The docker tag was not attached.'); }
    var wres = !add ? 'Query only' : w.err ? 'Error ' + w.err.no : 'Success (' + w.affected + (w.affected === 1 ? ' row)' : ' rows)');
    sum.push((add ? 'The write statement ' + (w.err ? 'was rejected with error ' + w.err.no : 'succeeded') + ', and the ' : 'The ') + 'query result is ' + res.text + '. It is ' + (res.same ? 'the same as' : 'different from') + ' what should come back (' + nounOf + ' ' + want.join(', ') + ').');
    sum.push({ o2m_many: add ? 'To write one more post, you only insert one row into post. However many posts a member writes, the shape of the table stays the same and only the rows increase.' : 'In one-to-many, the foreign key goes in the table on the "many" side. A post row has only one author, so one cell is enough, and however many posts a member writes, the rows of post just increase.',
      o2m_one: add ? 'When the new post was connected, the connection to the earlier post was overwritten. There is only one cell, so "connect one more" becomes "replace". If you put the foreign key on the post, the "many" side, this does not happen.' : 'If you put the foreign key on the "one" side, one cell holds only one value, so it cannot hold "many". That is why in one-to-many the foreign key goes in the table on the "many" side.',
      m2m_link: add ? 'Attaching one more tag is inserting one row into the associative table. The shape of the tables does not change however many tags there are. The primary key (post_id, tag_id) prevents attaching the same tag twice, and the foreign keys prevent attaching a tag that does not exist.' : 'A many-to-many relationship cannot be expressed with foreign keys between two tables alone, so you put an associative table in the middle. From the associative table, it is one-to-many with the post and also one-to-many with the tag. One many-to-many relationship has been broken down into two one-to-many relationships.',
      m2m_csv: add ? 'Appending itself works. But the DB does not know those characters are a tag, so it does not stop you from appending the same tag again, a tag that does not exist, or a typo. And the problem shows up in "find what is connected".' : "When you put several values in one cell, the DB cannot handle them one by one. If you search for java with LIKE, javascript is matched too. If you use MySQL's FIND_IN_SET('java', tags), it compares with the pieces split at the commas, so only posts 1 and 2 come back, but because the condition puts the column into a function, even if tags has an index, it cannot be used, and every row is read.",
      m2m_cols: add ? 'The limit on the number of tags is built into the shape of the table. If you add tag4 with ALTER TABLE, you must also add an OR tag4 = ... condition to every query that searches for tags.' : 'The condition for finding a tag gets as long as the number of columns, and every time a column is added, all the SQL that uses this query has to be fixed. Try "connect one more" and you will see a bigger problem.',
      o2o_uq: add ? 'One-to-one is a one-to-many foreign key plus a unique constraint. The unique constraint blocks a second row that points to the same member, so "one profile per member" is kept.' : 'One-to-one is a one-to-many foreign key plus a unique constraint. The foreign key can go in either of the two tables, and if the information is always queried together, the two are sometimes merged into one table.',
      o2o_fk: add ? 'Without a unique constraint, two profiles that point to the same member can go in. This is because the structure of the table is the same as one-to-many. A program that was built on the belief that "the profile of a member is one row" breaks here.' : 'Just by querying, you cannot see a difference from the design with a unique constraint. Try "connect one more" and it changes.' }[d]);
    var dump = {}; b.t.forEach(function (t) { dump[t[0]] = T[t[0]].map(function (r) { return r.map(nul); }); });
    return { events: ev, summary: sum, rel: b.rel, werr: w.err, rows: rows, same: res.same, dump: dump, row: [wres, res.text, res.same ? 'Same' : 'Different'] };
  },
  render: function (v, sim, t, H, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : null, c = sim.c;
    if (!s) { H.text(v, 'Click Run to go step by step.'); return; }
    var ln = H.lanes(v);
    if (c.task === 'add') H.lane(ln, 'Write statement', s.wr || 'Not run yet', !s.wr ? 'none' : /Error/.test(s.wr) ? 'wait' : 'hot');
    H.lane(ln, 'Query result', s.res ? s.res.text + (s.res.same ? ' (same as what should come back)' : ' (different from what should come back)') : 'Not queried yet', !s.res ? 'none' : s.res.same ? 'good' : 'bad');
    var key = { member: 'm', post: 'p', tag: 't', profile: 'f' };
    s.t.forEach(function (tb) {
      H.table(v, tb.head, tb.rows.map(function (r) { var id = tb.name === 'post_tag' ? 'l' + r[0] + '_' + r[1] : key[tb.name] + r[0], k = s.hl[id]; return { cells: r.map(function (x) { return { v: x, cls: k === 'hot' ? 'hot' : k === 'good' ? 'good' : k === 'bad' ? 'bad' : '' }; }) }; }), tb.name + ' table');
    });
    H.text(v, 'Yellow rows are rows that just went in or changed, green rows are rows that came back correctly from the query, and red rows are rows that have a problem.');
  },
  // Diagram: One region per table, one box per row. An arrow points to the row that a foreign key refers to. The two boxes at the bottom are the result of the write statement and of the query.
  draw: function (P, sim, shown) {
    var c = sim.c, d = c.design, last = shown[shown.length - 1], s = last ? last.snap : null;
    P.size(680, 304);
    var name = { o2m_many: ['member ("one" side)', 'post ("many" side, foreign key member_id)'], o2m_one: ['member ("one" side, foreign key post_id)', 'post ("many" side)'], o2o_uq: ['member', 'profile (foreign key member_id + unique)'], o2o_fk: ['member', 'profile (foreign key member_id)'] }[d];
    if (d === 'm2m_link') { P.region('r1', 16, 14, 206, 232, 'post'); P.region('r2', 237, 14, 206, 232, 'post_tag (associative table)'); P.region('r3', 458, 14, 206, 232, 'tag'); }
    else if (d === 'm2m_csv') P.region('r1', 16, 14, 648, 232, 'post (tags joined with commas in one column)');
    else if (d === 'm2m_cols') P.region('r1', 16, 14, 648, 232, 'post (columns tag1, tag2, tag3)');
    else { P.region('r1', 16, 14, 280, 232, name[0]); P.region('r2', 364, 14, 300, 232, name[1]); }
    var wr = s ? s.wr : '', res = s ? s.res : null;
    P.box('wr', 16, 256, 230, 36, { cls: c.task === 'find' || !wr ? 'ghost' : /Error/.test(wr) ? 'wait' : 'hot', title: 'Write', right: c.task === 'find' ? 'None (query only)' : wr || '?' });
    P.box('res', 258, 256, 406, 36, { cls: !res ? 'ghost' : res.same ? 'good' : 'bad', title: 'Result', right: res ? res.text : '?' });
    if (!s) { P.text('hint', 340, 136, 'Click Run to start', { cls: 'mut', anchor: 'middle' }); return; }
    var T = {}; s.t.forEach(function (tb) { T[tb.name] = tb.rows; });
    function k(id, base) { var h = s.hl[id]; return h === 'hot' ? 'hot' : h === 'good' ? 'good' : h === 'bad' ? 'bad' : base; }
    function y(i) { return 46 + i * 32; }
    if (d === 'o2m_many' || d === 'o2o_uq' || d === 'o2o_fk') {
      var child = d === 'o2m_many' ? T.post : T.profile, pre = d === 'o2m_many' ? 'p' : 'f';
      T.member.forEach(function (m, i) { P.box('m' + m[0], 28, y(i), 256, 26, { cls: k('m' + m[0], 'wait'), title: 'Member ' + m[0] + ' ' + m[1] }); });
      child.forEach(function (r, i) {
        var mid = d === 'o2m_many' ? r[2] : r[1];
        P.box(pre + r[0], 376, y(i), 276, 26, { cls: k(pre + r[0], 'plain'), title: (d === 'o2m_many' ? 'Post ' + r[0] + ' ' + r[1] : 'Profile ' + r[0]), right: 'member_id ' + mid });
        P.arrow('a' + pre + r[0], pre + r[0] + ':l', 'm' + mid + ':r', { cls: s.hl[pre + r[0]] === 'bad' ? 'bad' : 'mut' });
      });
    }
    if (d === 'o2m_one') {
      var used = {}; T.member.forEach(function (m) { if (m[2] !== 'NULL') used[m[2]] = 1; });
      T.member.forEach(function (m, i) { P.box('m' + m[0], 28, y(i), 256, 26, { cls: k('m' + m[0], 'wait'), title: 'Member ' + m[0] + ' ' + m[1], right: 'post_id ' + m[2] }); });
      T.post.forEach(function (p, i) { P.box('p' + p[0], 376, y(i), 276, 26, { cls: s.hl['p' + p[0]] === 'good' ? 'good' : used[p[0]] ? k('p' + p[0], 'plain') : 'bad', title: 'Post ' + p[0] + ' ' + p[1], right: used[p[0]] ? '' : 'author unknown' }); });
      T.member.forEach(function (m) { if (m[2] !== 'NULL') P.arrow('am' + m[0], 'm' + m[0] + ':r', 'p' + m[2] + ':l', { cls: s.hl['m' + m[0]] === 'hot' ? 'hot' : 'mut' }); });
    }
    if (d === 'm2m_link') {
      T.post.forEach(function (p, i) { P.box('p' + p[0], 28, y(i), 182, 26, { cls: k('p' + p[0], 'wait'), title: 'Post ' + p[0] + ' ' + p[1] }); });
      T.tag.forEach(function (t, i) { P.box('t' + t[0], 470, y(i), 182, 26, { cls: k('t' + t[0], 'wait'), title: 'Tag ' + t[0] + ' ' + t[1] }); });
      T.post_tag.forEach(function (l, i) {
        var id = 'l' + l[0] + '_' + l[1];
        P.box(id, 249, y(i), 182, 26, { cls: k(id, 'plain'), title: '(' + l[0] + ', ' + l[1] + ')', center: true });
        P.arrow('x' + id, id + ':l', 'p' + l[0] + ':r', { cls: s.hl[id] ? 'hot' : 'mut' }); P.arrow('z' + id, id + ':r', 't' + l[1] + ':l', { cls: s.hl[id] ? 'hot' : 'mut' });
      });
    }
    if (d === 'm2m_csv') T.post.forEach(function (p, i) { P.box('p' + p[0], 28, y(i), 624, 26, { cls: k('p' + p[0], 'plain'), title: 'Post ' + p[0] + ' ' + p[1], right: "tags = '" + p[2] + "'" }); });
    if (d === 'm2m_cols') {
      T.post.forEach(function (p, i) {
        P.box('p' + p[0], 28, y(i), 200, 26, { cls: k('p' + p[0], 'wait'), title: 'Post ' + p[0] + ' ' + p[1] });
        [2, 3, 4].forEach(function (j) { var id = 'c' + p[0] + '_' + (j - 1); P.box(id, 236 + (j - 2) * 106, y(i), 100, 26, { cls: p[j] === 'NULL' ? 'ghost' : k(id, 'plain'), title: p[j] === 'NULL' ? 'NULL' : p[j], center: true }); });
      });
      if (s.hl.x4) P.box('x4', 554, y(0), 98, 26, { cls: 'bad', title: 'no tag4', center: true });
    }
    P.note({ o2m_many: 'An arrow points to the member that member_id of a post refers to. Only one arrow leaves each row on the "many" side, and several arrows can arrive at a row on the "one" side.', o2m_one: 'An arrow points to the post that post_id of a member refers to. Only one arrow can leave a member row, so it cannot hold the many posts that one member wrote. A red post is a post whose author cannot be known from the tables.', m2m_link: 'One row of the associative table in the middle is one connection: "this tag is attached to this post". From each row, one arrow goes to the post and one goes to the tag.', m2m_csv: 'The tags are only characters inside the tags cell, so there are no arrows to draw. The DB does not know these characters are tags. A red row is a post that matched the condition but should not have come back.', m2m_cols: 'Each post has three cells fixed for writing tags. A dashed cell is an empty cell that is NULL.', o2o_uq: 'An arrow points to the member that member_id of a profile refers to. Because of the unique constraint, only one arrow can reach a member.', o2o_fk: 'An arrow points to the member that member_id of a profile refers to. There is no unique constraint, so several arrows can reach one member.' }[d]);
  },
  assume: 'This is a small example with 3 members, 3 posts, and 5 tags. For all 14 combinations (7 designs × 2 tasks), the SQL on the screen was run as it is on a real MySQL 8.4.11 (InnoDB), and the error number and number of rows changed of the write statement, all the rows of the query result, and all the rows of each table afterwards were checked to be the same as in the model. "What should come back" is a fact decided in this example (Alice wrote posts 1 and 2, the java tag is on posts 1 and 2, and a member has one profile), and it is not a value the DB tells you. The following points in the summaries were also confirmed by running them separately on the same MySQL. With FIND_IN_SET on the comma-separated string, only posts 1 and 2 come back. Even when an index is created on tags and 2,000 rows are inserted, the execution plan of the FIND_IN_SET condition does not use the index and reads every row (type is ALL). In the comma-separated string, adding a tag that is already there is accepted as it is. In the associative table, inserting the same connection once more is rejected with error 1062, and connecting to a tag that does not exist is rejected with error 1452. That LIKE also matches javascript is the same in any database, but FIND_IN_SET is a MySQL function. The error numbers and messages are also MySQL\'s. The design that puts the foreign key of a one-to-many relationship on the "one" side is an example made to show a mistake. Which table to put the foreign key in for a one-to-one relationship, and whether to merge the tables, is a design decision that depends on how the data is queried, and this lab does not go as far as that comparison. Normalization and anomalies are covered in the "Normalization" lab.',
});

Lab.register({
  id: 'cascade', nav: 'Cascade and orphan removal', cat: 'JPA', mode: 'step',
  title: 'What happens to the children when you save or delete only the parent?',
  intro: 'A post (the parent) has two comments (the children). Whether the comments are saved and deleted together when you persist or remove only the post is decided by cascade and orphanRemoval on @OneToMany.',
  terms: ['Cascade', 'Orphan removal (orphanRemoval)', 'Persistence context', 'Transactional write-behind and flush', 'Entity'],
  controls: [
    { id: 'act', label: 'Action to try', type: 'select', value: 'persist', options: [['persist', 'Persist only the post, which holds two comments'], ['remove', 'Remove the post'], ['orphan', 'Take one comment out of the comment list']] },
    { id: 'cas', label: 'cascade of @OneToMany', type: 'select', value: 'none', options: [['none', 'Not written'], ['PERSIST', 'CascadeType.PERSIST'], ['REMOVE', 'CascadeType.REMOVE'], ['ALL', 'CascadeType.ALL']] },
    { id: 'orphan', label: 'orphanRemoval = true', type: 'check', value: false, hint: 'This setting tells JPA to also delete from the DB a child that has been disconnected from its parent.' },
  ],
  presets: [
    { t: 'Default settings', d: 'Persist only the post, with no cascade. There is no exception, but only the comments are left out of the save.', v: { act: 'persist', cas: 'none', orphan: false } },
    { t: 'CascadeType.PERSIST', d: 'The persist is passed on to the comments, so 3 INSERTs are sent.', v: { act: 'persist', cas: 'PERSIST', orphan: false } },
    { t: 'Remove the post without cascade', d: 'The comments point to the post, so the DB refuses the deletion.', v: { act: 'remove', cas: 'none', orphan: false } },
    { t: 'Remove with CascadeType.REMOVE', d: 'It deletes the comments first and then the post.', v: { act: 'remove', cas: 'REMOVE', orphan: false } },
    { t: 'ALL, but you only take one out of the list', d: 'Even with CascadeType.ALL, no DELETE is sent.', v: { act: 'orphan', cas: 'ALL', orphan: false } },
    { t: 'orphanRemoval = true', d: 'A DELETE is sent for the comment you took out of the list.', v: { act: 'orphan', cas: 'ALL', orphan: true } },
    { t: 'Only orphanRemoval on, and remove the post', d: 'The comments are deleted together even though you did not write cascade.', v: { act: 'remove', cas: 'none', orphan: true } },
  ],
  code: function (c) {
    var opt = 'mappedBy = "post"' + (c.cas !== 'none' ? ', cascade = CascadeType.' + c.cas : '') + (c.orphan ? ', orphanRemoval = true' : '');
    var ent = '@Entity\nclass Post {\n    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)\n    Long id;\n    String title;\n\n    @OneToMany(' + opt + ')\n    List<Comment> comments = new ArrayList<>();\n\n    void addComment(String text) {     // sets both sides together\n        Comment c = new Comment(text);\n        c.post = this;\n        comments.add(c);\n    }\n}\n\n@Entity\nclass Comment {\n    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)\n    Long id;\n    String text;\n\n    @ManyToOne(fetch = FetchType.LAZY)\n    Post post;                         // foreign key post_id\n}\n\n';
    var run = c.act === 'persist' ? 'Post post = new Post("Notice");\npost.addComment("First comment");\npost.addComment("Second comment");\nem.persist(post);                      // persists only the post'
      : c.act === 'remove' ? '// The DB already has post 1 and its two comments\nPost post = em.find(Post.class, 1L);\nem.remove(post);                       // removes only the post'
      : '// The DB already has post 1 and its two comments\nPost post = em.find(Post.class, 1L);\npost.getComments().remove(0);          // takes the first comment out of the list';
    return ent + '// Runs inside a transaction\n' + run + '\n// The commit happens when the method ends';
  },
  label: function (c) { return { persist: 'Persist only the post', remove: 'Remove the post', orphan: 'Take a comment out of the list' }[c.act] + ' · cascade ' + (c.cas === 'none' ? 'none' : c.cas) + (c.orphan ? ' · orphanRemoval' : ''); },
  columns: ['Read SQL', 'Write SQL', 'Exception', 'Rows left in the DB after it ends'],
  simulate: function (c) {
    var cp = c.cas === 'PERSIST' || c.cas === 'ALL', cr = c.cas === 'REMOVE' || c.cas === 'ALL', orph = !!c.orphan, seeded = c.act !== 'persist';
    var ev = [], sum = [], call = [], commit = [], ex = '';
    // State of the objects in memory: none not there yet, new New, lazy not read yet, managed managed, removed marked for removal, out taken out of the list, deleted deleted
    var st = { post: 'none', c1: seeded ? 'lazy' : 'none', c2: seeded ? 'lazy' : 'none', db: { post: seeded, c1: seeded, c2: seeded }, hot: {}, sent: [], fresh: [], ex: '' };
    function push(s, k) { ev.push({ s: s, k: k, snap: JSON.parse(JSON.stringify(st)) }); st.fresh = []; st.hot = {}; }
    function send(tok, sql, at) { st.sent.push({ sql: sql, at: at }); st.fresh.push(sql.split(' ')[0].toUpperCase()); (at === 'At commit' ? commit : call).push(tok); }
    var selPost = 'select * from post where id = 1', selCom = 'select * from comment where post_id = 1';
    if (c.act === 'persist') {
      st.post = 'new'; st.c1 = 'new'; st.c2 = 'new';
      push('new Post, addComment twice: Created one post object and two comment objects and connected them to each other. They are still ordinary Java objects that JPA does not know about (New). The DB has nothing.', '');
      st.post = 'managed'; st.db.post = true; st.hot.post = 1;
      send('I:post', "insert into post (title) values ('Notice')", 'When em.persist(post) is called');
      push('em.persist(post): The post comes under the management of the persistence context. The primary key uses the IDENTITY strategy, so the INSERT is sent right away to get the id.', '');
      if (cp) {
        st.c1 = 'managed'; st.c2 = 'managed'; st.db.c1 = true; st.db.c2 = true; st.hot.c1 = 1; st.hot.c2 = 1;
        send('I:comment', "insert into comment (text, post_id) values ('First comment', 1)", 'When em.persist(post) is called'); send('I:comment', "insert into comment (text, post_id) values ('Second comment', 1)", 'When em.persist(post) is called');
        push('Cascade: Because cascade includes PERSIST, the persist you called on the post is also passed on to the two comments in the comments list. One INSERT is sent for each comment.', 'good');
        push('Method ends, commit: All the SQL to send has already been sent. It just commits.', '');
      } else {
        push('Because cascade does not have PERSIST, the persist stops at the post. The two comments in the list are still New objects that JPA does not know about.', '');
        push('Method ends, commit: It commits without an exception. comments is the side with mappedBy, so it does not manage the foreign key, and Hibernate does not complain even if this list holds objects that have not been saved. The comment INSERTs were never sent.', 'bad');
      }
    }
    if (c.act === 'remove') {
      var withKids = cr || orph;
      st.post = 'managed'; send('S:post', selPost, 'When em.find is called');
      push('em.find(Post.class, 1L): A SELECT reads post 1. The comments list is fetched lazily, so it has not been read yet.', '');
      if (withKids) {
        st.c1 = 'managed'; st.c2 = 'managed'; send('S:comment', selCom, 'When em.remove(post) is called');
        push('em.remove(post): ' + (cr ? 'Because cascade includes REMOVE,' : 'Because orphanRemoval = true includes the meaning "delete the children too when the parent is deleted",') + ' it has to know which comments to pass the deletion on to. First, it reads the comment list with a SELECT.', '');
        st.post = 'removed'; st.c1 = 'removed'; st.c2 = 'removed';
        push('The post and both comments are marked for removal. No DELETE has been sent yet (transactional write-behind).', '');
        send('D:comment', 'delete from comment where id = 1', 'At commit'); send('D:comment', 'delete from comment where id = 2', 'At commit'); send('D:post', 'delete from post where id = 1', 'At commit');
        st.post = 'deleted'; st.c1 = 'deleted'; st.c2 = 'deleted'; st.db = { post: false, c1: false, c2: false }; st.hot = { post: 1, c1: 1, c2: 1 };
        push('Method ends, commit: A flush happens and 3 DELETEs are sent. To avoid breaking the foreign key constraint, it deletes the two comments first and the post last. It does not delete the comments in one statement; it sends one DELETE for each.', 'good');
      } else {
        st.post = 'removed';
        push('em.remove(post): Only the post is marked for removal. Cascade does not have REMOVE, so nothing is passed on to the comments, and the comment list is not even read.', '');
        send('D:post', 'delete from post where id = 1', 'At commit'); ex = 'ConstraintViolationException'; st.ex = ex;
        push('Method ends, commit: A flush happens and the DELETE for the post is sent. But the DB still has two comments that point to this post, so the DB rejects it with a foreign key constraint violation. A ConstraintViolationException is thrown and the transaction is rolled back.', 'bad');
      }
    }
    if (c.act === 'orphan') {
      st.post = 'managed'; send('S:post', selPost, 'When em.find is called');
      push('em.find(Post.class, 1L): A SELECT reads post 1. The comments list is fetched lazily, so it has not been read yet.', '');
      st.c1 = 'managed'; st.c2 = 'managed'; send('S:comment', selCom, 'When getComments().remove(0) is called');
      push('post.getComments().remove(0): This is the first time the list is touched, so a SELECT reads the two comments (lazy fetching).', '');
      st.c1 = 'out';
      push('It takes the first comment out of the list that was read. Only the list of the Java object changed. One comment is left in the list in memory.', '');
      if (orph) {
        send('D:comment', 'delete from comment where id = 1', 'At commit'); st.c1 = 'deleted'; st.db.c1 = false; st.hot.c1 = 1;
        push('Method ends, commit: At the flush, Hibernate compares the list with how it was when first read and finds the comment that was taken out of the list and lost its parent (an orphaned entity). Because orphanRemoval = true, a DELETE is sent for that comment.', 'good');
      } else {
        push('Method ends, commit: No SQL is sent at all. comments is the side with mappedBy, so taking a comment out of the list does not change the foreign key, and without orphanRemoval it is not deleted either. The DB still has two comments.', 'bad');
      }
    }
    var sel = call.concat(commit).filter(function (t) { return t.charAt(0) === 'S'; }).length, ins = call.concat(commit).filter(function (t) { return t.charAt(0) === 'I'; }).length, del = call.concat(commit).filter(function (t) { return t.charAt(0) === 'D'; }).length;
    var np = st.db.post ? 1 : 0, nc = (st.db.c1 ? 1 : 0) + (st.db.c2 ? 1 : 0);
    var write = ins ? 'INSERT: ' + ins : del ? 'DELETE: ' + del + (ex ? ' (failed)' : '') : 'None';
    if (c.act === 'persist' && !cp) sum.push('Without PERSIST (or ALL) in cascade, the persist you call on the parent is not passed on to the children. As in this example, with a list that has mappedBy, no exception is thrown either, so it is easy to miss that the comments were not saved.' + (c.cas === 'REMOVE' ? ' CascadeType.REMOVE passes on only deletion, so it has no effect on saving.' : '') + (orph ? ' orphanRemoval has nothing to do with saving either.' : ''));
    if (c.act === 'persist' && cp) sum.push('Thanks to CascadeType.PERSIST' + (c.cas === 'ALL' ? ' (which ALL includes)' : '') + ', calling em.persist once on the post saves the comments as well. Cascade is just a convenience that does to the children what you did to the parent. It is not a feature that sets up the relationship. The value of the foreign key is decided by the post field of the comment.');
    if (c.act === 'remove' && ex) sum.push('The DB does not let you delete a parent that still has children (foreign key constraint). To delete the parent and the children together, put REMOVE (or ALL) in cascade, or turn on orphanRemoval = true.' + (c.cas === 'PERSIST' ? ' CascadeType.PERSIST passes on only saving, so it has no effect on deletion.' : ''));
    if (c.act === 'remove' && !ex) sum.push(cr ? 'CascadeType.REMOVE' + (c.cas === 'ALL' ? ' (which ALL includes)' : '') + ' passes the remove you call on the parent on to the children. Note that if there are many children, that many DELETEs are sent.' : 'The comments were deleted together even though you did not write cascade. orphanRemoval = true means "delete a child that has no parent", so it deletes the children when the parent is deleted, too.');
    if (c.act === 'remove' && !ex) sum.push('A setting that deletes them together like this is for when only this one parent owns the children. If another entity also refers to the child, the deletion is not what you intended.');
    if (c.act === 'orphan' && orph) sum.push('With orphanRemoval = true, taking a child out of the collection is itself a deletion. A DELETE was sent although you did not call em.remove(comment).' + (c.cas === 'none' || c.cas === 'PERSIST' ? ' This behavior works independently of the cascade setting.' : ''));
    if (c.act === 'orphan' && !orph) sum.push('You only took the comment out of the list, so the comment in the DB is unchanged. ' + (cr ? 'The REMOVE of CascadeType.' + c.cas + ' only means "when you remove the parent, remove the children too". It is not a feature that deletes a child that was taken out of the list. ' : '') + 'The list in memory (1) and the DB (2) are now out of step, and if you load it again later, there are two comments again. If you want taking a comment out of the list to be enough to delete it, turn on orphanRemoval = true.');
    return { events: ev, summary: sum, sql: { call: call.join(',') || '-', commit: commit.join(',') || '-' }, row: [String(sel), write, ex || 'None', 'Posts: ' + np + ' · Comments: ' + nc] };
  },
  stName: function (k) { return { none: 'None yet', 'new': 'New (unknown to JPA)', lazy: 'Not read yet', managed: 'Managed', removed: 'Removed', out: 'Taken out of the list', deleted: 'Deleted' }[k]; },
  blank: function (c) { var s = c.act !== 'persist'; return { post: 'none', c1: s ? 'lazy' : 'none', c2: s ? 'lazy' : 'none', db: { post: s, c1: s, c2: s }, hot: {}, sent: [], fresh: [], ex: '' }; },
  render: function (v, sim, t, H, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : this.blank(sim.c);
    if (s.sent.length) H.table(v, ['#', 'SQL', 'Sent at'], s.sent.map(function (q, i) { return { cells: [String(i + 1), { v: q.sql, cls: i >= s.sent.length - s.fresh.length ? 'hot' : '' }, q.at] }; }), 'SQL sent to the DB'); else { H.title(v, 'SQL sent to the DB'); H.text(v, 'None yet.'); }
    if (s.ex) H.text(v, 'Exception: ' + s.ex + ' (foreign key constraint violation). The transaction was rolled back, so the DB is as it was at the start.');
  },
  // Diagram: on the left are the Java objects (the post and the two comments in its list) and their states, and on the right are the rows in the DB. The arrow in the middle appears only in a step where SQL is sent.
  draw: function (P, sim, shown) {
    var self = this, last = shown[shown.length - 1], s = last ? last.snap : this.blank(sim.c);
    function cls(k) { return { none: 'ghost', 'new': 'plain', lazy: 'ghost', managed: 'good', removed: 'bad', out: 'hot', deleted: 'ghost' }[k]; }
    P.size(680, 300);
    P.region('mem', 16, 16, 330, 226, 'Java objects (memory)');
    P.box('post', 30, 50, 302, 48, { cls: cls(s.post), title: 'Post "Notice"', sub: self.stName(s.post) });
    P.box('c1', 76, 116, 256, 48, { cls: cls(s.c1), title: 'First comment', sub: self.stName(s.c1) });
    P.box('c2', 76, 180, 256, 48, { cls: cls(s.c2), title: 'Second comment', sub: self.stName(s.c2) });
    if (s.c1 !== 'none' && s.c1 !== 'out' && s.c1 !== 'deleted') P.arrow('l1', 'post:b:0.07', 'c1:l', { cls: 'mut' });
    if (s.c2 !== 'none' && s.c2 !== 'deleted') P.arrow('l2', 'post:b:0.07', 'c2:l', { cls: 'mut' });
    P.region('db', 420, 16, 244, 226, 'DB');
    P.box('dp', 434, 50, 216, 48, { cls: s.db.post ? (s.hot.post ? 'hot' : 'plain') : 'ghost', title: 'post table', sub: s.db.post ? 'id 1 "Notice"' : s.hot.post ? 'Row deleted' : 'No row' });
    P.box('d1', 434, 116, 216, 48, { cls: s.db.c1 ? (s.hot.c1 ? 'hot' : 'plain') : 'ghost', title: 'comment table', sub: s.db.c1 ? 'id 1, post_id 1' : s.hot.c1 ? 'Row deleted' : 'No row' });
    P.box('d2', 434, 180, 216, 48, { cls: s.db.c2 ? (s.hot.c2 ? 'hot' : 'plain') : 'ghost', title: 'comment table', sub: s.db.c2 ? 'id 2, post_id 1' : s.hot.c2 ? 'Row deleted' : 'No row' });
    if (s.fresh.length) { var kinds = {}; s.fresh.forEach(function (k) { kinds[k] = (kinds[k] || 0) + 1; }); P.arrow('sql', 'mem:r', 'db:l', { cls: s.ex ? 'bad' : 'hot', label: Object.keys(kinds).map(function (k) { return k + (kinds[k] > 1 ? ' ×' + kinds[k] : ''); }).join(', ') }); }
    P.box('res', 16, 254, 648, 34, { cls: s.ex ? 'bad' : 'plain', title: s.ex ? 'Exception: ' + s.ex : 'SQL sent to the DB: ' + s.sent.length, right: s.ex ? 'Rolled back' : '' });
    P.note('An arrow on the left means that the comment is in the comments list of the post. Green is an object managed by the persistence context, red is marked for removal, and yellow is a comment taken out of the list. The arrow in the middle means that SQL was sent to the DB in this step.');
  },
  assume: 'This lab assumes a bidirectional relationship (@OneToMany(mappedBy) and @ManyToOne), a primary key with the IDENTITY strategy, and execution inside a single transaction. All 24 combinations (4 cascade settings, 2 orphanRemoval settings, and 3 actions) were run on real Hibernate 7.4.5 and an H2 database, and the number and order of the SQL statements sent, the exception, and the number of rows left in the DB after it ended were confirmed to match the screen. The SQL statements on the screen are shortened to be easy to read and are not letter-for-letter the same as the actual statements. The result that "if you persist only the parent without cascade, the children are left out without an exception" holds for this mapping, where the comment list has mappedBy. In the same environment, it was confirmed that if you change it to a unidirectional @OneToMany(@JoinColumn), where the list side manages the foreign key directly, and run the same code, a TransientPropertyValueException is thrown at commit and the post is not saved either. The opposite case, persisting only a comment that points to a post that has not been saved, is not covered in this lab. If the primary key uses the SEQUENCE strategy, the INSERTs are sent at commit, not when you call persist (this is covered in the "Persistence context" lab). Setting ON DELETE CASCADE on the foreign key in the DB is a different feature from cascade in JPA and is not covered here.',
});

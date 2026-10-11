Lab.register({
  id: 'cascade', nav: '영속성 전이와 고아 객체', cat: 'JPA', mode: 'step',
  title: '부모만 저장하거나 지우면 자식은 어떻게 되나',
  intro: '게시글(부모) 하나에 댓글(자식) 둘이 달려 있습니다. 게시글만 persist하거나 remove했을 때 댓글까지 함께 저장되고 지워지는지는 @OneToMany에 적는 cascade와 orphanRemoval이 정합니다.',
  terms: ['영속성 전이(cascade)', '고아 객체 제거(orphanRemoval)', '영속성 컨텍스트', '쓰기 지연과 flush', '엔티티'],
  controls: [
    { id: 'act', label: '해 볼 동작', type: 'select', value: 'persist', options: [['persist', '댓글 둘을 담은 게시글만 persist'], ['remove', '게시글을 remove'], ['orphan', '댓글 목록에서 댓글 하나를 뺌']] },
    { id: 'cas', label: '@OneToMany의 cascade', type: 'select', value: 'none', options: [['none', '적지 않음'], ['PERSIST', 'CascadeType.PERSIST'], ['REMOVE', 'CascadeType.REMOVE'], ['ALL', 'CascadeType.ALL']] },
    { id: 'orphan', label: 'orphanRemoval = true', type: 'check', value: false, hint: '부모와 연결이 끊긴 자식을 DB에서도 지우라는 설정입니다.' },
  ],
  presets: [
    { t: '처음 설정으로', d: 'cascade 없이 게시글만 persist. 예외도 없이 댓글만 저장에서 빠집니다.', v: { act: 'persist', cas: 'none', orphan: false } },
    { t: 'CascadeType.PERSIST', d: 'persist가 댓글에게 전달되어 INSERT가 3번 나갑니다.', v: { act: 'persist', cas: 'PERSIST', orphan: false } },
    { t: 'cascade 없이 게시글 삭제', d: '댓글이 게시글을 가리키고 있어서 DB가 삭제를 거절합니다.', v: { act: 'remove', cas: 'none', orphan: false } },
    { t: 'CascadeType.REMOVE로 삭제', d: '댓글을 먼저 지우고 게시글을 지웁니다.', v: { act: 'remove', cas: 'REMOVE', orphan: false } },
    { t: 'ALL인데 목록에서 빼기만 하면', d: 'CascadeType.ALL이어도 DELETE가 나가지 않습니다.', v: { act: 'orphan', cas: 'ALL', orphan: false } },
    { t: 'orphanRemoval = true', d: '목록에서 뺀 댓글에 DELETE가 나갑니다.', v: { act: 'orphan', cas: 'ALL', orphan: true } },
    { t: 'orphanRemoval만 켜고 게시글 삭제', d: 'cascade를 적지 않았는데도 댓글이 함께 지워집니다.', v: { act: 'remove', cas: 'none', orphan: true } },
  ],
  code: function (c) {
    var opt = 'mappedBy = "post"' + (c.cas !== 'none' ? ', cascade = CascadeType.' + c.cas : '') + (c.orphan ? ', orphanRemoval = true' : '');
    var ent = '@Entity\nclass Post {\n    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)\n    Long id;\n    String title;\n\n    @OneToMany(' + opt + ')\n    List<Comment> comments = new ArrayList<>();\n\n    void addComment(String text) {     // 양쪽을 함께 맞춘다\n        Comment c = new Comment(text);\n        c.post = this;\n        comments.add(c);\n    }\n}\n\n@Entity\nclass Comment {\n    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)\n    Long id;\n    String text;\n\n    @ManyToOne(fetch = FetchType.LAZY)\n    Post post;                         // 외래 키 post_id\n}\n\n';
    var run = c.act === 'persist' ? 'Post post = new Post("공지");\npost.addComment("첫째 댓글");\npost.addComment("둘째 댓글");\nem.persist(post);                      // 게시글만 persist한다'
      : c.act === 'remove' ? '// DB에는 게시글 1과 그 댓글 둘이 이미 있다\nPost post = em.find(Post.class, 1L);\nem.remove(post);                       // 게시글만 remove한다'
      : '// DB에는 게시글 1과 그 댓글 둘이 이미 있다\nPost post = em.find(Post.class, 1L);\npost.getComments().remove(0);          // 목록에서 첫째 댓글을 뺀다';
    return ent + '// 트랜잭션 안에서 실행\n' + run + '\n// 메서드가 끝나면 커밋';
  },
  label: function (c) { return { persist: '게시글만 persist', remove: '게시글 remove', orphan: '목록에서 댓글 빼기' }[c.act] + ' · cascade ' + (c.cas === 'none' ? '없음' : c.cas) + (c.orphan ? ' · orphanRemoval' : ''); },
  columns: ['조회 SQL', '쓰기 SQL', '예외', '끝난 뒤 DB에 남은 행'],
  simulate: function (c) {
    var cp = c.cas === 'PERSIST' || c.cas === 'ALL', cr = c.cas === 'REMOVE' || c.cas === 'ALL', orph = !!c.orphan, seeded = c.act !== 'persist';
    var ev = [], sum = [], call = [], commit = [], ex = '';
    // 메모리의 객체 상태: none 아직 없음, new 비영속, lazy 아직 읽지 않음, managed 관리 중, removed 삭제 예정, out 목록에서 빠짐, deleted 삭제됨
    var st = { post: 'none', c1: seeded ? 'lazy' : 'none', c2: seeded ? 'lazy' : 'none', db: { post: seeded, c1: seeded, c2: seeded }, hot: {}, sent: [], fresh: [], ex: '' };
    function push(s, k) { ev.push({ s: s, k: k, snap: JSON.parse(JSON.stringify(st)) }); st.fresh = []; st.hot = {}; }
    function send(tok, sql, at) { st.sent.push({ sql: sql, at: at }); st.fresh.push(sql.split(' ')[0].toUpperCase()); (at === '커밋할 때' ? commit : call).push(tok); }
    var selPost = 'select * from post where id = 1', selCom = 'select * from comment where post_id = 1';
    if (c.act === 'persist') {
      st.post = 'new'; st.c1 = 'new'; st.c2 = 'new';
      push('new Post, addComment 두 번: 게시글 객체 하나와 댓글 객체 둘을 만들고 서로 연결했습니다. 아직 JPA가 모르는 보통의 자바 객체입니다(비영속). DB에는 아무것도 없습니다.', '');
      st.post = 'managed'; st.db.post = true; st.hot.post = 1;
      send('I:post', "insert into post (title) values ('공지')", 'em.persist(post)를 부를 때');
      push('em.persist(post): 게시글이 영속성 컨텍스트의 관리를 받게 됩니다. 기본 키가 IDENTITY 전략이라 id를 받아 오려고 INSERT가 바로 나갑니다.', '');
      if (cp) {
        st.c1 = 'managed'; st.c2 = 'managed'; st.db.c1 = true; st.db.c2 = true; st.hot.c1 = 1; st.hot.c2 = 1;
        send('I:comment', "insert into comment (text, post_id) values ('첫째 댓글', 1)", 'em.persist(post)를 부를 때'); send('I:comment', "insert into comment (text, post_id) values ('둘째 댓글', 1)", 'em.persist(post)를 부를 때');
        push('영속성 전이: cascade에 PERSIST가 들어 있으므로, 게시글에 한 persist가 comments 목록에 든 댓글 둘에게도 전달됩니다. 댓글마다 INSERT가 한 번씩 나갑니다.', 'good');
        push('메서드 종료, 커밋: 보낼 SQL은 이미 다 나갔습니다. 그대로 커밋합니다.', '');
      } else {
        push('cascade에 PERSIST가 없으므로 persist는 게시글에서 멈춥니다. 목록에 담겨 있는 댓글 둘은 여전히 JPA가 모르는 비영속 객체입니다.', '');
        push('메서드 종료, 커밋: 예외 없이 커밋됩니다. comments는 mappedBy가 붙은 쪽이라 외래 키를 관리하지 않으므로, Hibernate는 이 목록에 저장되지 않은 객체가 들어 있어도 문제 삼지 않습니다. 댓글 INSERT는 끝내 나가지 않았습니다.', 'bad');
      }
    }
    if (c.act === 'remove') {
      var withKids = cr || orph;
      st.post = 'managed'; send('S:post', selPost, 'em.find를 부를 때');
      push('em.find(Post.class, 1L): SELECT로 게시글 1을 읽어 옵니다. comments 목록은 지연 로딩이라 아직 읽지 않았습니다.', '');
      if (withKids) {
        st.c1 = 'managed'; st.c2 = 'managed'; send('S:comment', selCom, 'em.remove(post)를 부를 때');
        push('em.remove(post): ' + (cr ? 'cascade에 REMOVE가 들어 있으므로' : 'orphanRemoval = true는 부모가 지워질 때 자식도 지우라는 뜻을 포함하므로') + ', 삭제를 전달할 댓글이 무엇인지 알아야 합니다. 먼저 댓글 목록을 SELECT로 읽어 옵니다.', '');
        st.post = 'removed'; st.c1 = 'removed'; st.c2 = 'removed';
        push('게시글과 댓글 둘이 모두 삭제 예정으로 표시됩니다. DELETE는 아직 나가지 않았습니다(쓰기 지연).', '');
        send('D:comment', 'delete from comment where id = 1', '커밋할 때'); send('D:comment', 'delete from comment where id = 2', '커밋할 때'); send('D:post', 'delete from post where id = 1', '커밋할 때');
        st.post = 'deleted'; st.c1 = 'deleted'; st.c2 = 'deleted'; st.db = { post: false, c1: false, c2: false }; st.hot = { post: 1, c1: 1, c2: 1 };
        push('메서드 종료, 커밋: flush가 일어나 DELETE 3번이 나갑니다. 외래 키 제약을 어기지 않도록 댓글 둘을 먼저 지우고 게시글을 마지막에 지웁니다. 댓글은 한 번에 지우지 않고 하나씩 DELETE합니다.', 'good');
      } else {
        st.post = 'removed';
        push('em.remove(post): 게시글만 삭제 예정으로 표시됩니다. cascade에 REMOVE가 없으므로 댓글에게는 아무 일도 전달되지 않고, 댓글 목록을 읽지도 않습니다.', '');
        send('D:post', 'delete from post where id = 1', '커밋할 때'); ex = 'ConstraintViolationException'; st.ex = ex;
        push('메서드 종료, 커밋: flush가 일어나 게시글 DELETE가 나갑니다. 그런데 DB에는 이 게시글을 가리키는 댓글 둘이 남아 있어서, DB가 외래 키 제약 위반으로 거절합니다. ConstraintViolationException이 나고 트랜잭션은 롤백됩니다.', 'bad');
      }
    }
    if (c.act === 'orphan') {
      st.post = 'managed'; send('S:post', selPost, 'em.find를 부를 때');
      push('em.find(Post.class, 1L): SELECT로 게시글 1을 읽어 옵니다. comments 목록은 지연 로딩이라 아직 읽지 않았습니다.', '');
      st.c1 = 'managed'; st.c2 = 'managed'; send('S:comment', selCom, 'getComments().remove(0)을 부를 때');
      push('post.getComments().remove(0): 목록을 처음 건드리는 순간이므로 SELECT로 댓글 둘을 읽어 옵니다(지연 로딩).', '');
      st.c1 = 'out';
      push('읽어 온 목록에서 첫째 댓글을 뺍니다. 자바 객체의 목록만 바뀌었습니다. 메모리의 목록에는 댓글이 하나 남았습니다.', '');
      if (orph) {
        send('D:comment', 'delete from comment where id = 1', '커밋할 때'); st.c1 = 'deleted'; st.db.c1 = false; st.hot.c1 = 1;
        push('메서드 종료, 커밋: flush 때 Hibernate가 목록을 처음 읽었을 때와 비교해, 목록에서 빠져 부모를 잃은 댓글(고아 객체)을 찾아냅니다. orphanRemoval = true이므로 그 댓글에 DELETE가 나갑니다.', 'good');
      } else {
        push('메서드 종료, 커밋: SQL이 하나도 나가지 않습니다. comments는 mappedBy가 붙은 쪽이라 목록에서 빼는 것만으로는 외래 키가 바뀌지 않고, orphanRemoval이 없으므로 지우지도 않습니다. DB에는 댓글이 그대로 둘입니다.', 'bad');
      }
    }
    var sel = call.concat(commit).filter(function (t) { return t.charAt(0) === 'S'; }).length, ins = call.concat(commit).filter(function (t) { return t.charAt(0) === 'I'; }).length, del = call.concat(commit).filter(function (t) { return t.charAt(0) === 'D'; }).length;
    var np = st.db.post ? 1 : 0, nc = (st.db.c1 ? 1 : 0) + (st.db.c2 ? 1 : 0);
    var write = ins ? 'INSERT ' + ins + '번' : del ? 'DELETE ' + del + '번' + (ex ? ' (실패)' : '') : '없음';
    if (c.act === 'persist' && !cp) sum.push('cascade에 PERSIST(또는 ALL)가 없으면 부모에게 한 persist가 자식에게 전달되지 않습니다. 이 예처럼 mappedBy가 붙은 목록에서는 예외도 나지 않아서, 댓글이 저장되지 않은 것을 놓치기 쉽습니다.' + (c.cas === 'REMOVE' ? ' CascadeType.REMOVE는 삭제만 전달하므로 저장에는 영향이 없습니다.' : '') + (orph ? ' orphanRemoval도 저장과는 관계가 없습니다.' : ''));
    if (c.act === 'persist' && cp) sum.push('CascadeType.PERSIST' + (c.cas === 'ALL' ? '를 포함하는 ALL' : '') + ' 덕분에 em.persist를 게시글에 한 번만 불러도 댓글까지 저장됩니다. 영속성 전이는 "부모에게 한 일을 자식에게도 똑같이 해 준다"는 편의 기능일 뿐, 연관관계를 맺어 주는 기능은 아닙니다. 외래 키 값은 댓글의 post 필드가 정합니다.');
    if (c.act === 'remove' && ex) sum.push('자식이 남아 있는 부모는 DB가 지우지 못하게 막습니다(외래 키 제약). 부모와 자식을 함께 지우려면 cascade에 REMOVE(또는 ALL)를 넣거나 orphanRemoval = true를 켭니다.' + (c.cas === 'PERSIST' ? ' CascadeType.PERSIST는 저장만 전달하므로 삭제에는 영향이 없습니다.' : ''));
    if (c.act === 'remove' && !ex) sum.push(cr ? 'CascadeType.REMOVE' + (c.cas === 'ALL' ? '를 포함하는 ALL' : '') + '은 부모에게 한 remove를 자식에게 전달합니다. 자식이 많으면 DELETE도 그만큼 나간다는 점에 주의합니다.' : 'cascade를 적지 않았는데도 댓글이 함께 지워졌습니다. orphanRemoval = true는 "부모가 없는 자식은 지운다"는 뜻이므로, 부모가 지워질 때도 자식을 지웁니다.');
    if (c.act === 'remove' && !ex) sum.push('이렇게 함께 지우는 설정은 자식을 이 부모 하나만 소유할 때 씁니다. 다른 엔티티도 그 자식을 참조하고 있다면 의도하지 않은 삭제가 됩니다.');
    if (c.act === 'orphan' && orph) sum.push('orphanRemoval = true이면 컬렉션에서 빼는 것이 곧 삭제입니다. em.remove(comment)를 부르지 않았는데 DELETE가 나갔습니다.' + (c.cas === 'none' || c.cas === 'PERSIST' ? ' 이 동작은 cascade 설정과 따로 움직입니다.' : ''));
    if (c.act === 'orphan' && !orph) sum.push('목록에서 뺐을 뿐이므로 DB의 댓글은 그대로입니다. ' + (cr ? 'CascadeType.' + c.cas + '의 REMOVE는 "부모를 remove할 때 자식도 remove"일 뿐, 목록에서 빠진 자식을 지우는 기능이 아닙니다. ' : '') + '메모리의 목록(1개)과 DB(2개)가 어긋났고, 다음에 다시 조회하면 댓글은 다시 둘입니다. 목록에서 뺀 것만으로 지우고 싶다면 orphanRemoval = true를 켭니다.');
    return { events: ev, summary: sum, sql: { call: call.join(',') || '-', commit: commit.join(',') || '-' }, row: [sel + '번', write, ex || '없음', '게시글 ' + np + '개 · 댓글 ' + nc + '개'] };
  },
  stName: function (k) { return { none: '아직 없음', 'new': '비영속 (JPA가 모름)', lazy: '아직 읽지 않음', managed: '관리 중', removed: '삭제 예정', out: '목록에서 빠짐', deleted: '삭제됨' }[k]; },
  blank: function (c) { var s = c.act !== 'persist'; return { post: 'none', c1: s ? 'lazy' : 'none', c2: s ? 'lazy' : 'none', db: { post: s, c1: s, c2: s }, hot: {}, sent: [], fresh: [], ex: '' }; },
  render: function (v, sim, t, H, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : this.blank(sim.c);
    if (s.sent.length) H.table(v, ['#', 'SQL', '나간 때'], s.sent.map(function (q, i) { return { cells: [String(i + 1), { v: q.sql, cls: i >= s.sent.length - s.fresh.length ? 'hot' : '' }, q.at] }; }), 'DB로 나간 SQL'); else { H.title(v, 'DB로 나간 SQL'); H.text(v, '아직 없습니다.'); }
    if (s.ex) H.text(v, '예외: ' + s.ex + ' (외래 키 제약 위반). 트랜잭션이 롤백되어 DB는 처음 그대로입니다.');
  },
  // 그림: 왼쪽에 자바 객체(게시글과 그 목록에 담긴 댓글 둘)와 상태, 오른쪽에 DB의 행. SQL이 나간 단계에만 가운데 화살표가 생긴다.
  draw: function (P, sim, shown) {
    var self = this, last = shown[shown.length - 1], s = last ? last.snap : this.blank(sim.c);
    function cls(k) { return { none: 'ghost', 'new': 'plain', lazy: 'ghost', managed: 'good', removed: 'bad', out: 'hot', deleted: 'ghost' }[k]; }
    P.size(680, 300);
    P.region('mem', 16, 16, 330, 226, '자바 객체 (메모리)');
    P.box('post', 30, 50, 302, 48, { cls: cls(s.post), title: '게시글 "공지"', sub: self.stName(s.post) });
    P.box('c1', 76, 116, 256, 48, { cls: cls(s.c1), title: '첫째 댓글', sub: self.stName(s.c1) });
    P.box('c2', 76, 180, 256, 48, { cls: cls(s.c2), title: '둘째 댓글', sub: self.stName(s.c2) });
    if (s.c1 !== 'none' && s.c1 !== 'out' && s.c1 !== 'deleted') P.arrow('l1', 'post:b:0.07', 'c1:l', { cls: 'mut' });
    if (s.c2 !== 'none' && s.c2 !== 'deleted') P.arrow('l2', 'post:b:0.07', 'c2:l', { cls: 'mut' });
    P.region('db', 420, 16, 244, 226, 'DB');
    P.box('dp', 434, 50, 216, 48, { cls: s.db.post ? (s.hot.post ? 'hot' : 'plain') : 'ghost', title: 'post 테이블', sub: s.db.post ? 'id 1 "공지"' : s.hot.post ? '행이 지워짐' : '행 없음' });
    P.box('d1', 434, 116, 216, 48, { cls: s.db.c1 ? (s.hot.c1 ? 'hot' : 'plain') : 'ghost', title: 'comment 테이블', sub: s.db.c1 ? 'id 1, post_id 1' : s.hot.c1 ? '행이 지워짐' : '행 없음' });
    P.box('d2', 434, 180, 216, 48, { cls: s.db.c2 ? (s.hot.c2 ? 'hot' : 'plain') : 'ghost', title: 'comment 테이블', sub: s.db.c2 ? 'id 2, post_id 1' : s.hot.c2 ? '행이 지워짐' : '행 없음' });
    if (s.fresh.length) { var kinds = {}; s.fresh.forEach(function (k) { kinds[k] = (kinds[k] || 0) + 1; }); P.arrow('sql', 'mem:r', 'db:l', { cls: s.ex ? 'bad' : 'hot', label: Object.keys(kinds).map(function (k) { return k + (kinds[k] > 1 ? ' ×' + kinds[k] : ''); }).join(', ') }); }
    P.box('res', 16, 254, 648, 34, { cls: s.ex ? 'bad' : 'plain', title: s.ex ? '예외: ' + s.ex : 'DB로 나간 SQL ' + s.sent.length + '건', right: s.ex ? '롤백됨' : '' });
    P.note('왼쪽의 화살표는 게시글의 comments 목록에 그 댓글이 들어 있다는 뜻입니다. 초록은 영속성 컨텍스트가 관리하는 객체, 빨강은 삭제 예정, 노랑은 목록에서 빠진 댓글입니다. 가운데 화살표는 이번 단계에서 DB로 SQL이 나갔다는 표시입니다.');
  },
  assume: '양방향 연관관계(@OneToMany(mappedBy)와 @ManyToOne), 기본 키는 IDENTITY 전략, 하나의 트랜잭션 안에서 실행한다고 보았습니다. 스물네 가지 조합(cascade 넷, orphanRemoval 둘, 동작 셋)을 모두 실제 Hibernate 7.4.5와 H2 데이터베이스에서 실행해, 나간 SQL의 수와 순서, 예외, 끝난 뒤 DB에 남은 행 수가 화면과 일치하는 것을 확인했습니다. 화면의 SQL 문장은 읽기 쉽게 줄인 것이며 실제 문장의 글자와는 다릅니다. "cascade 없이 부모만 persist하면 예외 없이 자식이 빠진다"는 결과는 댓글 목록에 mappedBy가 붙은 이 매핑에서의 결과입니다. 목록 쪽이 외래 키를 직접 관리하는 단방향 @OneToMany(@JoinColumn)로 바꿔 같은 코드를 실행하면 커밋할 때 TransientPropertyValueException이 나고 게시글도 저장되지 않는 것을 같은 환경에서 확인했습니다. 반대로 저장되지 않은 게시글을 가리키는 댓글만 persist하는 경우는 이 실습에서 다루지 않았습니다. 기본 키가 SEQUENCE 전략이면 INSERT가 persist를 부를 때가 아니라 커밋할 때 나갑니다(이 부분은 "영속성 컨텍스트" 실습에서 다룹니다). DB의 외래 키에 ON DELETE CASCADE를 걸어 두는 방법은 JPA의 cascade와 다른 기능이며 여기서는 다루지 않았습니다.',
});

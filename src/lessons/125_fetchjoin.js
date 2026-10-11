Lab.register({
  id: 'fetchjoin', nav: 'JPQL과 페치 조인', cat: 'JPA', mode: 'step',
  title: 'join과 join fetch는 무엇이 다른가',
  intro: 'JPQL은 테이블이 아니라 엔티티를 대상으로 쓰는 쿼리입니다. 게시글을 조회하면서 댓글을 그냥 join할 때와 join fetch할 때, DB에서 읽어 오는 컬럼과 그 뒤에 따라 나가는 조회가 달라집니다.',
  terms: ['JPQL', 'fetch join', '컬렉션 페치 조인과 페이징', 'MultipleBagFetchException', '카테시안 곱'],
  controls: [
    { id: 'q', label: '실행할 JPQL', type: 'select', value: 'join', options: [['plain', 'select p from Post p (조인 없음)'], ['table', 'select p from posts p (테이블 이름을 씀)'], ['join', '… join p.comments c (그냥 조인)'], ['fetch', '… join fetch p.comments (페치 조인)'], ['fetchsort', '… join fetch p.comments c order by c.id desc (댓글 기준 정렬)'], ['two', '… join fetch p.comments join fetch p.files (컬렉션 두 개)']] },
    { id: 'page', label: '페이징: setFirstResult(0).setMaxResults(1)', type: 'check', value: false, hint: '결과를 처음부터 1개만 달라고 요청합니다.' },
  ],
  presets: [
    { t: '처음 설정으로', d: '그냥 join. 조인을 했는데도 댓글 조회가 게시글마다 따로 나갑니다.', v: { q: 'join', page: false } },
    { t: 'join fetch', d: '댓글 컬럼까지 한 번에 읽어 와서 뒤따르는 조회가 없습니다.', v: { q: 'fetch', page: false } },
    { t: '조인 없이 조회', d: '게시글만 읽고, 댓글은 쓸 때마다 조회합니다.', v: { q: 'plain', page: false } },
    { t: '테이블 이름으로 쓰면', d: 'JPQL의 from 뒤에는 엔티티 이름이 와야 합니다.', v: { q: 'table', page: false } },
    { t: '페치 조인에 페이징', d: 'Hibernate 7.4.5는 서브쿼리에서 게시글을 먼저 자릅니다.', v: { q: 'fetch', page: true } },
    { t: '메모리에서 자르는 경우', d: '댓글 기준으로 정렬하면 전부 읽어 온 뒤 메모리에서 자르고 경고를 냅니다.', v: { q: 'fetchsort', page: true } },
    { t: '컬렉션 두 개를 페치 조인', d: '실행하기 전에 예외로 거절됩니다.', v: { q: 'two', page: false } },
  ],
  jpql: function (c) {
    return { plain: 'select p from Post p order by p.id', table: 'select p from posts p order by p.id', join: 'select p from Post p join p.comments c order by p.id', fetch: 'select p from Post p join fetch p.comments order by p.id', fetchsort: 'select p from Post p join fetch p.comments c order by c.id desc', two: 'select p from Post p join fetch p.comments join fetch p.files order by p.id' }[c.q];
  },
  code: function (c) {
    var ent = '@Entity\n@Table(name = "posts")\nclass Post {\n    @Id Long id;\n    String title;\n\n    @OneToMany(mappedBy = "post")\n    List<Comment> comments = new ArrayList<>();\n\n    @OneToMany(mappedBy = "post")\n    List<Attachment> files = new ArrayList<>();     // 첨부 파일\n}\n\n@Entity\n@Table(name = "comments")\nclass Comment {\n    @Id Long id;\n    String text;\n\n    @ManyToOne(fetch = FetchType.LAZY)\n    Post post;\n}\n\n';
    return ent + '// DB: 게시글 1 "공지"에 댓글 3개, 게시글 2 "질문"에 댓글 2개\nList<Post> posts = em.createQuery(\n        "' + this.jpql(c) + '",\n        Post.class)\n' + (c.page ? '    .setFirstResult(0)\n    .setMaxResults(1)\n' : '') + '    .getResultList();\n\nfor (Post p : posts) {\n    p.getComments().size();        // 게시글마다 댓글을 사용한다\n}';
  },
  label: function (c) { return { plain: '조인 없음', table: '테이블 이름을 씀', join: '그냥 join', fetch: 'join fetch', fetchsort: 'join fetch + 댓글 기준 정렬', two: '컬렉션 두 개 join fetch' }[c.q] + (c.page ? ' · 페이징 1개' : ''); },
  columns: ['결과 목록', 'SQL이 읽어 온 것', '행 수 제한', '뒤따른 댓글 조회', '경고·예외'],
  simulate: function (c) {
    var q = c.q, page = !!c.page, ev = [], sum = [], jp = this.jpql(c);
    var fetch = q === 'fetch' || q === 'fetchsort', joined = fetch || q === 'join';
    // rows: DB가 돌려준 행(p 게시글 번호, c 댓글 번호, off 메모리에서 버린 행). list: 결과 목록(n 채워진 댓글 수, how 댓글을 어떻게 읽었는가)
    var st = { rows: [], list: [], sent: [], fresh: 0, warn: '', err: '', made: false, cut: false };
    function push(s, k) { ev.push({ s: s, k: k, snap: JSON.parse(JSON.stringify(st)) }); st.fresh = 0; }
    function send(sql, why) { st.sent.push({ sql: sql, why: why }); st.fresh++; }
    var title = { 1: '공지', 2: '질문' }, count = { 1: 3, 2: 2 };
    var all = [{ p: 1, c: 1 }, { p: 1, c: 2 }, { p: 1, c: 3 }, { p: 2, c: 4 }, { p: 2, c: 5 }];
    function fail(exName, at) { return { events: ev, summary: sum, jp: jp, facts: { exAt: at, loaded: false, firstN: -1 }, row: ['없음 (예외)', '-', '-', '-', 'IllegalArgumentException (원인 ' + exName + ')'] }; }
    if (q === 'table') {
      st.err = 'UnknownEntityException';
      push('em.createQuery("… from posts p …"): JPQL의 from 뒤에는 테이블 이름이 아니라 엔티티 이름이 와야 합니다. posts는 @Table에 적은 테이블 이름이고, 그런 이름의 엔티티는 없습니다. 쿼리를 만드는 단계에서 IllegalArgumentException(원인은 UnknownEntityException)이 납니다. DB에는 아무것도 가지 않았습니다.', 'bad');
      sum.push('JPQL은 엔티티 이름(Post)과 필드 이름(p.title, p.comments)으로 씁니다. 테이블 이름(posts)과 컬럼 이름은 Hibernate가 SQL로 바꿀 때 채워 넣습니다. 그래서 테이블 이름을 그대로 쓰면 이 쿼리처럼 거절됩니다.' + (page ? ' 페이징 설정은 쿼리가 만들어진 뒤의 일이라 결과에 영향이 없습니다.' : ''));
      return fail('UnknownEntityException', 'createQuery');
    }
    push('em.createQuery(…): JPQL은 테이블이 아니라 엔티티를 대상으로 씁니다. from Post p의 Post는 클래스 이름이고' + (q === 'plain' ? '' : ', p.comments는 Post의 필드 이름') + '입니다. Hibernate가 이것을 posts' + (q === 'plain' ? ' 테이블을' : q === 'two' ? ', comments, files 테이블을' : '와 comments 테이블을') + ' 조회하는 SQL로 바꿉니다.', '');
    if (page) push('setFirstResult(0).setMaxResults(1): 결과 목록을 처음부터 1개만 달라고 요청합니다. 아직 SQL은 나가지 않았습니다.', '');
    if (q === 'two') {
      st.err = 'MultipleBagFetchException';
      push('getResultList(): 실행하려는 순간 Hibernate가 거절합니다. comments와 files가 둘 다 List이고, List 두 개를 한 SQL로 함께 가져오면 행이 두 목록 크기의 곱으로 늘어나 어느 행이 중복인지 가려낼 수 없기 때문입니다. IllegalArgumentException(원인은 MultipleBagFetchException)이 나고 SQL은 나가지 않습니다.', 'bad');
      sum.push('List로 선언한 컬렉션 두 개는 함께 페치 조인할 수 없습니다. 한쪽을 Set으로 바꾸면 예외는 사라지지만, 같은 환경에서 실행해 보니 DB가 8행(게시글 1은 댓글 3 × 첨부 2 = 6행)을 돌려주었고 게시글 1의 comments 목록에는 같은 댓글이 겹쳐 6개가 들어 있었습니다.', '컬렉션은 하나만 페치 조인하고, 나머지는 지연 로딩에 배치 크기 설정을 더해 따로 가져오는 방법을 씁니다.' + (page ? ' 페이징을 걸었는지와 상관없이 같은 예외입니다.' : ''));
      return fail('MultipleBagFetchException', 'getResultList');
    }
    // 어디에서 자르는가: sql 바깥 쿼리 끝, sub 서브쿼리, mem 메모리
    var lim = !page ? 'none' : q === 'fetch' ? 'sub' : q === 'fetchsort' ? 'mem' : 'sql';
    var base = 'from posts p' + (joined ? ' join comments c on c.post_id = p.id' : ''), cols = fetch ? 'select p.*, c.*' : 'select p.*', order = q === 'fetchsort' ? ' order by c.id desc' : ' order by p.id';
    var sql = lim === 'sub' ? cols + ' from (select * from posts p where exists (select 1 from comments c where c.post_id = p.id) order by p.id limit 1) p join comments c on c.post_id = p.id order by p.id' : cols + ' ' + base + order + (lim === 'sql' ? ' limit 1' : '');
    var rows = q === 'plain' ? [{ p: 1 }, { p: 2 }] : q === 'fetchsort' ? all.slice().reverse() : all.slice();
    if (lim === 'sql') rows = rows.slice(0, 1);
    if (lim === 'sub') rows = rows.filter(function (r) { return r.p === 1; });
    st.rows = rows; send(sql, '목록 조회');
    var what = q === 'plain' ? 'posts 테이블만 조회합니다.' : q === 'join' ? 'comments 테이블을 조인하지만, select 절에는 게시글 컬럼만 있습니다. 댓글은 조인 조건에만 쓰였습니다.' : 'comments 테이블을 조인하고, select 절에 댓글 컬럼까지 넣었습니다.';
    var cnt = lim === 'sql' ? 'SQL 끝에 행 수 제한이 붙어 DB가 1행만 돌려줍니다.' + (q === 'join' ? ' 이 제한은 게시글이 아니라 조인으로 늘어난 행에 걸립니다.' : '')
      : lim === 'sub' ? 'Hibernate 7.4.5는 안쪽 서브쿼리에서 게시글을 먼저 1개로 자른 뒤, 그 게시글에만 댓글을 조인합니다. DB가 게시글 1의 댓글 수만큼 3행을 돌려줍니다.'
      : lim === 'mem' ? '그런데 SQL에 행 수 제한이 없습니다. 정렬 기준이 댓글이라서 게시글만 먼저 잘라 낼 수 없기 때문입니다. DB가 5행을 전부 돌려줍니다.'
      : q === 'plain' ? 'DB가 게시글 수만큼 2행을 돌려줍니다.' : '게시글 1은 댓글이 3개라 3행, 게시글 2는 2행이 되어 DB가 모두 5행을 돌려줍니다.' + (q === 'fetchsort' ? ' 댓글 id가 큰 것부터이므로 게시글 2의 행이 먼저 옵니다.' : '');
    push('getResultList(): SQL이 나갑니다. ' + what + ' ' + cnt, lim === 'mem' ? 'bad' : '');
    var ids = []; rows.forEach(function (r) { if (ids.indexOf(r.p) < 0) ids.push(r.p); });
    st.list = ids.map(function (id) { return { id: id, title: title[id], n: fetch ? count[id] : -1, how: fetch ? 'fetch' : '' }; }); st.made = true;
    push(rows.length + '행을 Post 객체로 바꿉니다. ' + (rows.length > ids.length ? '같은 게시글이 여러 행에 나오지만 Hibernate가 한 번만 담아서 결과 목록은 ' + ids.length + '개입니다. ' : '결과 목록은 ' + ids.length + '개입니다. ') + (fetch ? '행마다 들어 있는 댓글 컬럼으로 각 게시글의 comments 목록도 채웠습니다.' : 'comments 목록은 댓글 컬럼을 읽어 오지 않았으므로 아직 비어 있는(읽지 않은) 상태입니다.'), fetch ? 'good' : '');
    if (lim === 'mem') {
      var keep = ids[0]; st.list = st.list.slice(0, 1); st.rows.forEach(function (r) { if (r.p !== keep) r.off = true; }); st.cut = true; st.warn = 'HHH90003004'; ids = [keep];
      push('읽어 온 2개 가운데 첫 1개만 남기고 나머지를 버립니다. 자르는 일을 DB가 아니라 애플리케이션의 메모리에서 한 것입니다. Hibernate가 경고 HHH90003004(firstResult/maxResults specified with collection fetch; applying in memory)를 로그에 남깁니다.', 'bad');
    }
    var extra = 0;
    if (fetch) push('반복문에서 게시글' + (ids.length > 1 ? '마다' : '의') + ' 댓글을 사용합니다. comments 목록이 이미 채워져 있으므로 추가 조회가 나가지 않습니다.', 'good');
    else st.list.forEach(function (p) {
      extra++; p.n = count[p.id]; p.how = 'lazy'; send('select * from comments where post_id = ' + p.id, '게시글 ' + p.id + '의 댓글 (지연 로딩)');
      push('반복문, 게시글 ' + p.id + ': p.getComments().size()를 부르는 순간 비어 있던 목록을 채우려고 댓글 조회 SQL이 따로 나갑니다.', 'bad');
    });
    if (q === 'plain') sum.push('연관된 댓글은 가져오지 않았으므로 게시글마다 댓글 조회가 따로 나갑니다. 게시글이 많아지면 조회도 그만큼 늘어납니다("N+1" 실습 참고).' + (page ? ' 컬렉션을 페치 조인하지 않은 쿼리의 페이징은 SQL에서 그대로 처리됩니다.' : ''));
    if (q === 'join') sum.push('그냥 join은 SQL에 조인을 넣을 뿐, 연관 엔티티의 컬럼을 읽어 오지 않습니다. 댓글로 조건을 걸 때는 쓸모가 있지만, 댓글을 쓰려면 다시 조회해야 합니다. 함께 가져오려면 join fetch를 씁니다.', page ? '행 수 제한이 조인으로 늘어난 행에 걸린다는 점에 주의합니다. 같은 환경에서 두 번째 페이지(setFirstResult(1))를 요청했더니 게시글 2가 아니라 게시글 1이 또 나왔습니다. 두 번째 행도 게시글 1의 행이기 때문입니다.' : 'DB는 5행을 돌려주었지만 결과 목록은 2개였습니다. Hibernate 7.4.5는 엔티티 하나를 조회하는 쿼리에서 같은 엔티티를 한 번만 담습니다. 엔티티가 아니라 값(p.title)을 조회하면 5개가 그대로 나오는 것도 같은 환경에서 확인했습니다.');
    if (q === 'fetch' && !page) sum.push('join fetch는 연관된 댓글의 컬럼까지 한 SQL로 읽어 와 comments 목록을 채워 둡니다. 그래서 뒤따르는 조회가 없습니다.', '컬렉션을 조인하면 행은 5개로 늘지만 결과 목록은 게시글 2개입니다. Hibernate 5까지는 같은 게시글이 댓글 수만큼 결과에 들어 있어 select distinct를 붙여야 했다고 문서에 나와 있습니다(이 환경에서 예전 버전을 실행해 보지는 못했습니다).');
    if (q === 'fetch' && page) sum.push('Hibernate 7.4.5는 컬렉션 페치 조인에 페이징을 걸면, 서브쿼리에서 게시글을 먼저 자르고 그 게시글의 댓글만 조인하는 SQL을 만듭니다. DB에서 자르므로 필요한 3행만 읽어 옵니다.', '예전 버전(스프링 부트 3이 쓰는 Hibernate 6 등)은 이 경우 행 수 제한 없이 전부 읽어 와 메모리에서 잘랐다고 문서에 나와 있습니다. 지금 버전에서도 그렇게 되는 경우가 남아 있습니다.');
    if (q === 'fetchsort' && !page) sum.push('정렬 기준을 댓글로 바꿔도 페치 조인의 결과는 같습니다. 댓글 id가 큰 행이 먼저 오므로 결과 목록의 순서만 게시글 2, 게시글 1로 바뀌었습니다.');
    if (lim === 'mem') sum.push('컬렉션 페치 조인에 페이징을 걸었는데 SQL에 행 수 제한이 없으면, 조건에 맞는 행을 전부 읽어 온 뒤 메모리에서 자른 것입니다. 지금은 5행이지만 게시글이 수십만 건이면 전부 메모리에 올라옵니다.', 'Hibernate 7.4.5는 게시글 기준 정렬처럼 가능한 경우에는 DB에서 자르지만, 이 예처럼 정렬 기준이 컬렉션 쪽이면 메모리에서 자릅니다. 예전 버전은 컬렉션 페치 조인의 페이징을 늘 이 방식으로 처리했다고 문서에 나와 있습니다. 경고 HHH90003004가 보이면 컬렉션은 페치 조인하지 말고 배치 크기 설정으로 가져오도록 바꿉니다.');
    var limText = { none: '페이징 안 함', sql: 'SQL 끝에 있음', sub: '서브쿼리 안에 있음', mem: 'SQL에 없음 (메모리에서 자름)' }[lim];
    return { events: ev, summary: sum, jp: jp, facts: { exAt: 'none', loaded: fetch, firstN: count[ids[0]] }, row: [ids.length + '개 (게시글 ' + ids.join(', ') + ')', (fetch ? '게시글 + 댓글 컬럼' : '게시글 컬럼만') + ' · ' + rows.length + '행', limText, extra + '번', st.warn ? st.warn + ' 경고' : '없음'] };
  },
  blank: function () { return { rows: [], list: [], sent: [], fresh: 0, warn: '', err: '', made: false, cut: false }; },
  render: function (v, sim, t, H, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : this.blank();
    if (s.sent.length) H.table(v, ['#', 'SQL', '이유'], s.sent.map(function (x, i) { return { cells: [String(i + 1), { v: x.sql, cls: i >= s.sent.length - s.fresh ? 'hot' : '' }, x.why] }; }), 'DB로 나간 SQL');
    if (s.warn) H.text(v, '경고 ' + s.warn + ': firstResult/maxResults specified with collection fetch; applying in memory');
    if (s.err) H.text(v, '예외: IllegalArgumentException (원인 ' + s.err + ')');
  },
  // 그림: 위에 JPQL, 왼쪽에 DB가 돌려준 행, 오른쪽에 그 행들로 만든 결과 목록(게시글 객체와 comments 목록의 상태). 메모리에서 버린 행은 점선으로 바뀐다.
  draw: function (P, sim, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : this.blank(), loaded = sim.facts.loaded;
    P.size(680, 330);
    P.box('jpql', 16, 12, 648, 32, { cls: s.err ? 'bad' : 'plain', title: sim.jp, center: true });
    P.region('rs', 16, 58, 290, 212, 'DB가 돌려준 행');
    P.region('list', 374, 58, 290, 212, '결과 목록 List<Post>');
    if (!s.rows.length) P.box('r0', 30, 92, 262, 30, { cls: 'ghost', sub: s.err ? 'SQL이 나가지 않음' : '아직 조회 전', center: true });
    s.rows.forEach(function (r, i) { P.box('r' + (i + 1), 30, 90 + i * 34, 262, 28, { cls: r.off ? 'ghost' : r.p === 1 ? 'wait' : 'plain', title: '게시글 ' + r.p, right: r.c ? '댓글 ' + r.c + (loaded ? '' : ' (조인만)') : '' }); });
    if (!s.made) P.box('p0', 388, 92, 262, 30, { cls: 'ghost', sub: s.err ? '예외로 결과 없음' : '아직 없음', center: true });
    s.list.forEach(function (p, i) { P.box('p' + p.id, 388, 90 + i * 66, 262, 52, { cls: p.n < 0 ? 'plain' : p.how === 'fetch' ? 'good' : 'hot', title: '게시글 ' + p.id + ' "' + p.title + '"', sub: p.n < 0 ? 'comments: 아직 읽지 않음' : 'comments: 댓글 ' + p.n + '개' + (p.how === 'fetch' ? ' (함께 읽음)' : ' (추가 조회)') }); });
    if (s.made) P.arrow('conv', 'rs:r', 'list:l', { cls: s.cut ? 'bad' : 'hot', label: s.rows.length + '행 → ' + s.list.length + '개' });
    var extra = Math.max(0, s.sent.length - 1);
    P.box('res', 16, 282, 648, 36, { cls: s.err || s.warn ? 'bad' : extra ? 'hot' : s.made ? 'good' : 'ghost', title: s.err ? '예외: ' + s.err : s.warn ? '경고 ' + s.warn + ' (메모리에서 자름)' : 'DB로 나간 SQL', right: s.err ? 'SQL 0번' : s.sent.length ? '목록 조회 1번' + (extra ? ' + 댓글 조회 ' + extra + '번' : '') : '아직 없음' });
    P.note('왼쪽은 목록 조회 SQL이 돌려준 행(게시글 1의 행은 파랑), 오른쪽은 Hibernate가 그 행들로 만든 결과 목록입니다. 초록 게시글은 댓글까지 한 번에 읽은 것, 노란 게시글은 댓글을 추가 조회로 읽은 것입니다. 점선으로 바뀐 행은 읽어 왔지만 메모리에서 버린 행입니다.');
  },
  assume: '게시글 1에 댓글 3개, 게시글 2에 댓글 2개가 있는 상태에서 열두 가지 조합(JPQL 여섯, 페이징 여부)을 모두 실제 Hibernate 7.4.5와 H2 데이터베이스에서 실행해, 결과 목록의 크기와 순서, DB가 돌려준 행 수, SQL에 댓글 컬럼과 행 수 제한이 들어 있는지와 그 위치, 뒤따른 조회 수, 경고와 예외가 화면과 일치하는 것을 확인했습니다. 화면의 SQL은 읽기 쉽게 줄인 것입니다. 행 수 제한을 limit 1로 적었지만 H2에서 실제로 나간 문장은 offset ? rows fetch first ? rows only이고 DB 종류에 따라 다릅니다. 이 주제는 버전에 따라 결과가 달라집니다. 페치 조인에 페이징을 걸었을 때 서브쿼리로 DB에서 자르는 것, 그냥 join의 결과에서 같은 엔티티가 한 번만 담기는 것은 7.4.5에서 실행한 결과입니다. "예전 버전은 늘 메모리에서 잘랐다", "Hibernate 5까지는 distinct가 필요했다"는 설명은 문서를 따른 것이며 이 PC에는 예전 버전이 없어 실행으로 확인하지 못했습니다. 대조는 조합마다 애플리케이션을 새로 시작한 상태(SessionFactory를 새로 만듦)에서 했습니다. 같은 SessionFactory에서 같은 페치 조인 JPQL을 페이징 없이 먼저 실행한 뒤 페이징을 걸어 실행했더니, 행 수 제한이 붙지 않은 SQL이 다시 쓰여 전체가 돌아오는 것을 이 환경에서 보았기 때문입니다. 또 페치 조인한 댓글에 where 조건을 걸고 페이징하면 이 환경에서는 SQL 문법 오류가 났습니다. 컬렉션 페치 조인과 페이징을 함께 쓰는 코드는 쓰는 버전에서 실제 SQL을 확인해야 합니다. 그냥 join과 join fetch는 내부 조인이라 댓글이 없는 게시글은 결과에서 빠지는데, 이 실습의 자료에는 그런 게시글이 없습니다.',
});

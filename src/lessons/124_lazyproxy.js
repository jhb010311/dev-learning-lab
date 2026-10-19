Lab.register({
  id: 'lazyproxy', nav: '프록시와 지연 로딩', cat: 'JPA', mode: 'step',
  title: '지연 로딩으로 받은 객체는 진짜 엔티티인가',
  intro: 'em.getReference나 지연 로딩으로 받은 회원 객체는 진짜 Member가 아니라, 식별자만 알고 있는 프록시(대리 객체)일 수 있습니다. 프록시는 진짜 데이터가 필요해지는 순간에야 DB를 조회합니다.',
  terms: ['엔티티 프록시', 'LazyInitializationException', '지연 로딩과 즉시 로딩', '영속성 컨텍스트', '1차 캐시'],
  controls: [
    { id: 'how', label: '회원 객체 m을 얻는 방법', type: 'select', value: 'ref', options: [['ref', 'em.getReference(Member.class, 1L)'], ['lazy', '주문을 조회한 뒤 order.getMember() (지연 로딩)'], ['find', 'em.find(Member.class, 1L)'], ['findref', 'em.find로 먼저 읽은 뒤 em.getReference'], ['reffind', 'em.getReference를 먼저 한 뒤 em.find']] },
    { id: 'use', label: '얻은 m으로 하는 일', type: 'select', value: 'name', options: [['id', 'm.getId() (식별자를 읽음)'], ['name', 'm.getName() (이름을 읽음)'], ['cls', 'm.getClass() == Member.class 비교'], ['closed', '영속성 컨텍스트를 닫은 뒤 m.getName()']] },
  ],
  presets: [
    { t: '처음 설정으로', q: 'em.getReference로 얻은 회원 m의 이름을 읽으면 m은 무엇이고 SELECT는 언제 나가나', d: 'getReference로 받을 때는 SQL이 없고, 이름을 읽을 때 SELECT가 나갑니다.', v: { how: 'ref', use: 'name' } },
    { t: '식별자만 읽으면', q: 'm의 이름 대신 식별자 getId만 읽으면', d: '프록시가 이미 알고 있는 값이라 SQL이 나가지 않습니다.', v: { how: 'ref', use: 'id' } },
    { t: '지연 로딩으로 받은 회원', q: 'em.getReference 대신 주문을 조회한 뒤 order.getMember로 지연 로딩된 회원을 얻으면', d: 'order.getMember()가 돌려주는 것도 프록시입니다.', v: { how: 'lazy', use: 'name' } },
    { t: '영속성 컨텍스트를 닫은 뒤', q: '지연 로딩으로 얻은 회원 m의 이름을 영속성 컨텍스트를 닫은 뒤 읽으면', d: '비어 있는 프록시를 채울 길이 없어 예외가 납니다.', v: { how: 'lazy', use: 'closed' } },
    { t: 'getClass()로 비교하면', q: 'm의 getClass를 Member.class와 ==로 비교하면', d: '프록시의 클래스는 Member가 아니라서 false입니다.', v: { how: 'ref', use: 'cls' } },
    { t: '이미 읽어 둔 회원이 있으면', q: 'em.find로 먼저 읽은 뒤 em.getReference로 얻은 m의 getClass를 Member.class와 비교하면', d: 'getReference가 프록시가 아니라 진짜 엔티티를 돌려줍니다.', v: { how: 'findref', use: 'cls' } },
    { t: '프록시를 먼저 받았다면', q: 'em.getReference를 먼저 한 뒤 em.find로 얻은 m의 getClass를 Member.class와 비교하면', d: '뒤에 부른 em.find도 그 프록시를 돌려줍니다.', v: { how: 'reffind', use: 'cls' } },
  ],
  lines: function (c) {
    var a = { ref: ['Member m = em.getReference(Member.class, 1L);'], lazy: ['Order order = em.find(Order.class, 1L);', 'Member m = order.getMember();'], find: ['Member m = em.find(Member.class, 1L);'], findref: ['Member found = em.find(Member.class, 1L);', 'Member m = em.getReference(Member.class, 1L);'], reffind: ['Member ref = em.getReference(Member.class, 1L);', 'Member m = em.find(Member.class, 1L);'] }[c.how];
    var b = { id: ['Long id = m.getId();'], name: ['String name = m.getName();'], cls: ['boolean same = m.getClass() == Member.class;', 'boolean isMember = m instanceof Member;'], closed: ['em.close();', 'String name = m.getName();'] }[c.use];
    return a.concat(b);
  },
  code: function (c) {
    var ent = '@Entity\nclass Member {\n    @Id Long id;\n    String name;\n    public Long getId() { return id; }\n    public String getName() { return name; }\n}\n' + (c.how === 'lazy' ? '\n@Entity\n@Table(name = "orders")\nclass Order {\n    @Id Long id;\n    @ManyToOne(fetch = FetchType.LAZY)\n    Member member;\n    public Member getMember() { return member; }\n}\n' : '');
    return ent + '\n// DB에는 회원 1 "김철수"' + (c.how === 'lazy' ? '와 그 회원의 주문 1이' : '가') + ' 있다\n' + this.lines(c).map(function (l) { return l === 'em.close();' ? 'em.close();                     // 영속성 컨텍스트를 닫는다' : l; }).join('\n');
  },
  label: function (c) { return { ref: 'getReference', lazy: '지연 로딩 연관 객체', find: 'em.find', findref: 'find 뒤 getReference', reffind: 'getReference 뒤 find' }[c.how] + ' · ' + { id: 'getId()', name: 'getName()', cls: 'getClass() 비교', closed: '닫은 뒤 getName()' }[c.use]; },
  columns: ['m의 정체', '회원 테이블 조회', '마지막 줄의 결과'],
  simulate: function (c) {
    var how = c.how, use = c.use, ev = [], sum = [], L = this.lines(c), n = 0, when = '', same = '-';
    // m: none 아직 없음, proxy 프록시, entity 진짜 엔티티. init: 프록시가 진짜 데이터와 연결됐는가. real: 진짜 Member가 메모리에 있는가
    var st = { line: -1, order: false, m: 'none', init: false, real: false, open: true, sent: [], fresh: 0, out: '', err: '' };
    function push(s, k) { st.line = n++; ev.push({ s: s, k: k, snap: JSON.parse(JSON.stringify(st)) }); st.fresh = 0; }
    function send(sql, at) { st.sent.push({ sql: sql, at: at }); st.fresh++; }
    var selM = 'select * from member where id = 1';
    if (how === 'ref') {
      st.m = 'proxy';
      push('em.getReference(Member.class, 1L): DB를 조회하지 않고, 식별자 1만 담은 프록시 객체를 만들어 돌려줍니다. 프록시는 Hibernate가 Member를 상속해 실행 중에 만든 클래스의 객체이고, 이름 같은 나머지 내용은 아직 비어 있습니다.', '');
    }
    if (how === 'lazy') {
      st.order = true; st.m = 'proxy'; send('select * from orders where id = 1', 'em.find(Order)를 부를 때');
      push('em.find(Order.class, 1L): SELECT로 주문 1을 읽어 옵니다. 주문 행에는 회원의 식별자(member_id = 1)만 들어 있습니다. member 필드가 LAZY이므로 회원 테이블은 조회하지 않고, 그 자리에 식별자 1만 아는 프록시를 넣어 둡니다.', '');
      push('order.getMember(): 필드에 들어 있던 프록시를 그대로 돌려줍니다. 회원 테이블에는 아직 SQL이 나가지 않았습니다.', '');
    }
    if (how === 'find') {
      st.m = 'entity'; st.real = true; send(selM, 'em.find를 부를 때'); when = 'em.find를 부를 때';
      push('em.find(Member.class, 1L): 바로 SELECT를 보내 회원 1을 읽어 옵니다. 돌려받은 m은 프록시가 아니라 내용이 다 채워진 진짜 Member 객체입니다.', '');
    }
    if (how === 'findref') {
      st.real = true; send(selM, 'em.find를 부를 때'); when = 'em.find를 부를 때';
      push('em.find(Member.class, 1L): SELECT를 보내 회원 1을 읽어 옵니다. 진짜 Member 객체가 영속성 컨텍스트(1차 캐시)에 보관됩니다.', '');
      st.m = 'entity'; same = 'true';
      push('em.getReference(Member.class, 1L): 영속성 컨텍스트에 회원 1이 이미 있습니다. 프록시를 새로 만들 이유가 없으므로 보관 중인 진짜 엔티티를 그대로 돌려줍니다. found == m은 true입니다.', 'good');
    }
    if (how === 'reffind') {
      st.m = 'proxy';
      push('em.getReference(Member.class, 1L): DB를 조회하지 않고, 식별자 1만 담은 프록시를 만들어 돌려줍니다. 이 프록시가 영속성 컨텍스트에 회원 1로 등록됩니다.', '');
      st.init = true; st.real = true; same = 'true'; send(selM, 'em.find를 부를 때'); when = 'em.find를 부를 때';
      push('em.find(Member.class, 1L): SELECT를 보내 회원 1의 데이터를 읽어 옵니다. 그런데 돌려주는 것은 새 객체가 아니라 앞에서 만든 그 프록시입니다(ref == m이 true). 한 영속성 컨텍스트 안에서 같은 식별자는 같은 객체여야 하기 때문입니다. 프록시는 이제 진짜 데이터와 연결된 상태입니다.', '');
    }
    var proxy = st.m === 'proxy', empty = proxy && !st.init, res = '';
    if (use === 'id') {
      res = '1'; st.out = 'id = 1';
      push('m.getId(): ' + (empty ? '프록시는 만들어질 때부터 식별자를 갖고 있습니다. DB에 가지 않고 1을 돌려줍니다. 프록시의 나머지 내용은 여전히 비어 있습니다.' : proxy ? '프록시가 갖고 있는 식별자 1을 돌려줍니다. SQL은 나가지 않습니다.' : '진짜 엔티티의 id 필드 값 1을 돌려줍니다. SQL은 나가지 않습니다.'), empty ? 'good' : '');
    }
    if (use === 'name') {
      if (empty) {
        st.init = true; st.real = true; send(selM, 'getName을 부를 때'); when = 'getName을 부를 때';
        push('m.getName(): 프록시가 가진 것은 식별자뿐이라 이름을 알 수 없습니다. 이 순간 SELECT를 보내 진짜 Member를 읽어 오고(프록시 초기화), 프록시는 그 객체와 연결됩니다.', 'bad');
        res = '김철수'; st.out = 'name = "김철수"';
        push('프록시가 진짜 Member의 getName()을 대신 불러 "김철수"를 돌려줍니다. 한번 초기화된 프록시는 다시 조회하지 않습니다.', '');
      } else {
        res = '김철수'; st.out = 'name = "김철수"';
        push('m.getName(): ' + (proxy ? '이 프록시는 이미 진짜 데이터와 연결돼 있습니다. SQL 없이 진짜 Member의 값을 받아 "김철수"를 돌려줍니다.' : '진짜 엔티티의 name 필드 값 "김철수"를 돌려줍니다. SQL은 나가지 않습니다.'), '');
      }
    }
    if (use === 'cls') {
      st.out = 'same = ' + !proxy;
      push('m.getClass() == Member.class: ' + (proxy ? 'm의 실제 클래스는 Member가 아니라 Member를 상속한 프록시 클래스(Member$HibernateProxy)입니다. 두 클래스가 다르므로 false입니다.' + (empty ? ' getClass()는 프록시를 초기화하지 않아서 SQL도 나가지 않습니다.' : ' 프록시는 초기화된 뒤에도 클래스가 바뀌지 않습니다.') : 'm은 진짜 Member 객체이므로 true입니다.'), proxy ? 'bad' : 'good');
      res = 'getClass() 비교 ' + !proxy + ' · instanceof true'; st.out += ', isMember = true';
      push('m instanceof Member: ' + (proxy ? '프록시 클래스는 Member의 자식 클래스이므로 true입니다. 타입을 비교할 때 getClass() 대신 instanceof를 쓰면 프록시와 진짜 엔티티를 가리지 않습니다.' : 'true입니다.'), proxy ? 'good' : '');
    }
    if (use === 'closed') {
      st.open = false;
      push('em.close(): 영속성 컨텍스트를 닫습니다. 자바 객체 m은 메모리에 남아 있지만, 이제 영속성 컨텍스트와 이어져 있지 않습니다(준영속).', '');
      if (empty) {
        res = 'LazyInitializationException'; st.err = res;
        push('m.getName(): 비어 있는 프록시를 채우려면 영속성 컨텍스트를 통해 DB를 조회해야 합니다. 그런데 영속성 컨텍스트가 이미 닫혔습니다. SQL을 보내지 못하고 LazyInitializationException이 납니다.', 'bad');
      } else {
        res = '김철수'; st.out = 'name = "김철수"';
        push('m.getName(): ' + (proxy ? '이 프록시는 닫히기 전에 이미 진짜 데이터와 연결됐습니다. DB에 갈 필요가 없으므로 "김철수"를 돌려줍니다.' : '진짜 엔티티는 데이터를 이미 다 갖고 있습니다. 영속성 컨텍스트가 닫혀도 "김철수"를 돌려줍니다.'), 'good');
      }
    }
    var sel = st.sent.filter(function (q) { return q.sql === selM; }).length;
    if (how === 'ref' || how === 'lazy') {
      if (use === 'id') sum.push('프록시는 식별자를 갖고 태어나므로 getId()로는 초기화되지 않습니다. 식별자만 필요할 때(예: 외래 키 값만 넣어 연관관계를 맺을 때)는 DB를 조회하지 않아도 됩니다.');
      if (use === 'name') sum.push('조회 SQL은 객체를 받는 순간이 아니라, 식별자가 아닌 값을 처음 쓰는 순간에 나갑니다. 이것이 지연 로딩입니다.' + (how === 'lazy' ? ' 주문이 여러 건이고 주문마다 이 일이 일어나면 "N+1" 실습에서 본 문제가 됩니다.' : ''));
      if (use === 'cls') sum.push('equals를 직접 만들 때 getClass() != o.getClass()로 타입을 비교하면, 프록시와 진짜 엔티티가 서로 다른 객체로 판정됩니다. 엔티티의 타입 비교에는 instanceof를 쓰고, 필드는 게터로 읽습니다.');
      if (use === 'closed') sum.push('초기화되지 않은 프록시는 영속성 컨텍스트가 열려 있는 동안에만 채울 수 있습니다. 트랜잭션 밖에서 쓸 값은 트랜잭션 안에서 미리 읽어 두거나, 처음부터 fetch join으로 함께 가져옵니다.');
    }
    if (how === 'find') sum.push('em.find는 부르는 즉시 DB를 조회해 진짜 엔티티를 돌려줍니다.' + (use === 'closed' ? ' 데이터를 이미 갖고 있으므로 영속성 컨텍스트가 닫힌 뒤에도 값을 읽을 수 있습니다.' : use === 'cls' ? ' 그래서 getClass() 비교도 true입니다.' : ''));
    if (how === 'findref') sum.push('영속성 컨텍스트에 이미 진짜 엔티티가 있으면 getReference도 프록시가 아니라 그 엔티티를 돌려줍니다. getReference의 결과가 언제나 프록시인 것은 아닙니다.');
    if (how === 'reffind') sum.push('프록시가 먼저 만들어졌다면 그 뒤의 em.find도 같은 프록시를 돌려줍니다. em.find로 받았다고 해서 진짜 Member 클래스의 객체라고 단정할 수 없습니다.' + (use === 'cls' ? ' 그래서 em.find의 결과인데도 getClass() 비교가 false입니다.' : use === 'closed' ? ' 다만 em.find가 SELECT를 보내면서 프록시를 초기화했으므로, 닫힌 뒤에도 값을 읽을 수 있습니다.' : ''));
    return { events: ev, summary: sum, L: L, proxy: proxy, same: same, init: st.m === 'entity' || st.init, row: [proxy ? '프록시' : '진짜 엔티티', sel ? sel + '번 (' + when + ')' : '0번', res] };
  },
  blank: function () { return { line: -1, order: false, m: 'none', init: false, real: false, open: true, sent: [], fresh: 0, out: '', err: '' }; },
  render: function (v, sim, t, H, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : this.blank(), cur = Math.min(s.line, sim.L.length - 1);   // 한 줄이 두 단계로 나뉘는 경우(프록시 초기화)가 있다
    H.table(v, ['줄', '코드', ''], sim.L.map(function (l, i) { return { cells: [String(i + 1), { v: l, cls: i === cur ? 'hot' : '' }, i === cur ? '← 지금' : ''] }; }), '실행 중인 코드');
    H.counters(v, [[s.sent.filter(function (q) { return q.sql.indexOf('from member') > 0; }).length, '회원 테이블 조회']]);
    var ln = H.lanes(v);
    H.lane(ln, 'm의 클래스', s.m === 'none' ? '아직 없음' : s.m === 'proxy' ? 'Member$HibernateProxy (Member를 상속한 프록시)' : 'Member', s.m === 'proxy' ? 'hot' : s.m === 'entity' ? 'good' : 'none');
    if (s.sent.length) H.table(v, ['#', 'SQL', '나간 때'], s.sent.map(function (q, i) { return { cells: [String(i + 1), { v: q.sql, cls: i >= s.sent.length - s.fresh ? 'hot' : '' }, q.at] }; }), 'DB로 나간 SQL'); else { H.title(v, 'DB로 나간 SQL'); H.text(v, '아직 없습니다.'); }
  },
  // 그림: 왼쪽 영속성 컨텍스트 안에 프록시와 진짜 Member(지연 로딩이면 주문도), 오른쪽에 DB. 프록시가 초기화되면 진짜 객체로 가는 화살표가 생긴다.
  draw: function (P, sim, shown) {
    var c = sim.c, last = shown[shown.length - 1], s = last ? last.snap : this.blank(), lazy = c.how === 'lazy';
    P.size(680, 316);
    P.region('pc', 16, 16, 430, 176, s.open ? '영속성 컨텍스트 (열려 있음)' : '영속성 컨텍스트 (닫힘)');
    P.region('db', 496, 16, 168, 176, 'DB');
    if (lazy) {
      P.box('order', 30, 48, 190, 46, { cls: s.order ? 'plain' : 'ghost', title: '주문 1', sub: s.order ? 'member 필드 → 프록시' : '아직 읽지 않음' });
      P.box('do', 508, 48, 144, 46, { cls: 'plain', title: 'orders', sub: 'id 1, member_id 1' });
    }
    var hasProxy = c.how !== 'find' && c.how !== 'findref';
    if (hasProxy) P.box('proxy', 30, 118, 190, 56, { cls: s.m !== 'proxy' ? 'ghost' : s.err ? 'bad now' : s.init ? 'hot' : 'wait now', title: 'Member 프록시', sub: s.m !== 'proxy' ? '아직 없음' : s.init ? 'id 1 · 초기화됨' : 'id 1 · 내용 없음' });
    P.box('real', hasProxy ? 262 : 30, 118, 170, 56, { cls: s.real ? 'good' : 'ghost', title: '진짜 Member', sub: s.real ? 'id 1 · 김철수' : '아직 읽지 않음' });
    P.box('dm', 508, 118, 144, 56, { cls: 'plain', title: 'member', sub: 'id 1, 김철수' });
    if (lazy && s.order) P.arrow('o2p', 'order:b', 'proxy:t', { cls: 'mut' });
    if (hasProxy && s.m === 'proxy' && s.init) P.arrow('p2r', 'proxy:r', 'real:l', { cls: 'good', label: '넘김' });
    P.box('var', 30, 210, 402, 34, { cls: s.m === 'none' ? 'ghost' : 'plain', title: '변수 m', right: s.m === 'none' ? '아직 없음' : s.m === 'proxy' ? '프록시를 가리킴' : '진짜 Member를 가리킴' });
    if (s.m !== 'none') P.arrow('m2o', 'var:t', s.m === 'proxy' ? 'proxy:b' : 'real:b', { cls: 'mut' }); if (s.fresh) P.arrow('sql', 'pc:r', 'db:l', { cls: 'hot', label: 'SELECT' });
    P.box('res', 16, 262, 648, 36, { cls: s.err ? 'bad' : s.out ? 'good' : 'ghost', title: s.err ? '예외' : '결과', right: s.err || s.out || '아직 없음' });
    P.note('파란 프록시는 식별자만 알고 있는 빈 상태, 노란 프록시는 진짜 Member와 연결된(초기화된) 상태입니다. 가운데 화살표는 이번 단계에서 DB로 조회 SQL이 나갔다는 표시입니다. 프록시는 초기화된 뒤에도 진짜 객체로 바뀌지 않고, 받은 호출을 진짜 객체에게 넘겨 줍니다.');
  },
  assume: '스무 가지 조합(얻는 방법 다섯, 하는 일 넷)을 모두 실제 Hibernate 7.4.5와 H2 데이터베이스에서 실행해, m이 프록시인지, 회원 테이블 조회가 언제 몇 번 나갔는지, 마지막 줄의 값이나 예외가 화면과 일치하는 것을 확인했습니다. 엔티티의 필드에 @Id를 붙이고 public 게터를 둔 보통의 매핑, 하나의 영속성 컨텍스트 기준입니다. 같은 코드에서 게터의 public만 빼고 실행하면 getId()를 불러도 프록시가 초기화되어 SELECT가 한 번 나갔습니다. 프록시의 클래스 이름은 이 환경에서 Member$HibernateProxy였고, 버전에 따라 뒤에 꼬리표가 더 붙기도 합니다. 같은 환경에서 다음도 확인했습니다. 게터를 거치지 않고 프록시의 필드를 직접 읽으면(m.name) 초기화되지 않고 null이 나옵니다. DB에 없는 식별자로 getReference를 하면 그때는 예외가 없고, 값을 처음 읽을 때 조회가 나간 뒤 예외(ObjectNotFoundException)가 납니다. 영속성 컨텍스트를 닫은 뒤에도 프록시의 getId()는 값을 돌려줍니다. 스프링 부트의 웹 요청에서는 OSIV 기본 설정 때문에 응답이 끝날 때까지 영속성 컨텍스트가 열려 있어 이 예외가 늦게 드러날 수 있는데, 그 부분은 실행으로 확인하지 않았습니다. 바이트코드 강화(enhancement)를 쓰는 환경에서는 프록시 대신 다른 방식으로 지연 로딩이 될 수 있다고 문서에 나와 있으나, 이것도 실행해 보지는 않았습니다.',
});

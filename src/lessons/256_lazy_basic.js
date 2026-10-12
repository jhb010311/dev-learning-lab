Lab.register({
  id: 'lazy_basic', nav: '지연 로딩', cat: '기초개념', mode: 'step', basic: true, deep: ['lazyproxy', 'nplus1'],
  title: '연관된 객체는 언제 DB에서 읽어 오는가',
  intro: '주문(Order)은 그 주문을 한 회원(Member)을 가리킵니다. 코드에서는 Order의 member 필드가 그 회원을 가리키고, DB에서는 orders 테이블의 주문 행이 회원의 번호(member_id)만 적어 둡니다. 그래서 em.find로 주문 하나를 읽어 올 때 JPA는 정해야 합니다. 그 주문이 가리키는 회원도 지금 같이 읽어 올 것인가, 회원은 코드가 그 값을 실제로 쓰는 순간에 읽어 올 것인가. 이것을 member 필드 위의 @ManyToOne(fetch = ...)에 적습니다. FetchType.EAGER는 회원도 주문을 읽을 때 함께 읽어 오는 방식(즉시 로딩)이고, FetchType.LAZY는 회원을 쓰는 순간까지 미루는 방식(지연 로딩)입니다. 미루는 동안 member 필드에는 회원 1의 번호만 아는 비어 있는 대리 객체(프록시)가 들어 있다가, 이름처럼 회원의 값을 꺼내는 순간에 JPA가 member 테이블을 읽는 SELECT 문을 보내 채웁니다. 화면의 코드에는 SQL이 한 줄도 없는데도 SQL이 나가고, 나가는 때가 설정에 따라 달라집니다. 이 실습은 fetch 설정을 바꾸고 order.getMember().getName() 줄을 지워 가며 같은 주문을 읽어, 줄마다 어느 테이블을 읽는 SELECT가 나갔는지 봅니다.',
  terms: ['지연 로딩과 즉시 로딩', '@ManyToOne', '엔티티 프록시', 'FetchType'],
  controls: [
    { id: 'fetch', label: 'member 필드 위의 표시', type: 'select', value: 'lazy', options: [['lazy', '@ManyToOne(fetch = FetchType.LAZY)'], ['eager', '@ManyToOne(fetch = FetchType.EAGER)']] },
    { id: 'use', label: 'order.getMember().getName() 줄을 적는다', type: 'check', value: true },
  ],
  // q는 물음 방식의 화면에 보이는 물음, t와 d는 글로만 읽는 본문에 쓰이는 이름과 설명
  presets: [
    { t: '처음 설정으로', q: 'FetchType.LAZY로 적은 member는 어떻게 생겼고, em.find로 주문을 읽은 뒤 order.getMember().getName() 줄을 실행하면 SQL은 언제 나가나', d: 'LAZY이면 find 줄에서는 orders 테이블만 읽고, 회원의 이름을 꺼내는 getName 줄에서 member 테이블을 읽는 SELECT가 나갑니다.', v: { fetch: 'lazy', use: true } },
    { t: '이름을 쓰지 않으면', q: 'order.getMember().getName() 줄을 지워 회원의 이름을 쓰지 않으면', d: 'LAZY에서 회원의 값을 쓰지 않으면 member 테이블을 읽는 SELECT는 끝까지 나가지 않습니다.', v: { fetch: 'lazy', use: false } },
    { t: 'EAGER로 바꾸면', q: 'FetchType.LAZY를 FetchType.EAGER로 바꾸면', d: 'EAGER이면 find 줄에서 주문과 회원을 조인한 SELECT 하나로 함께 읽고, getName 줄에서는 SQL이 나가지 않습니다.', v: { fetch: 'eager', use: true } },
    { t: 'EAGER에서 이름을 쓰지 않으면', q: 'FetchType.EAGER로 바꾸고 order.getMember().getName() 줄도 지우면', d: 'EAGER이면 회원의 이름을 쓰지 않아도 find 줄에서 회원까지 읽어 옵니다.', v: { fetch: 'eager', use: false } },
  ],
  // 화면의 코드와 대조 프로그램(verify/spring/src/LazyBasicProbe.java)이 컴파일하고 실행한 소스는 같은 글이다(대조 스크립트가 글자까지 비교한다).
  code: function (c) {
    var l = ['@Entity', 'public class Member {', '    @Id', '    private Long id;', '    private String name;', '', '    public String getName() { return name; }', '}', '',
      '@Entity', '@Table(name = "orders")', 'public class Order {', '    @Id', '    private Long id;', '',
      '    // 연결: 이 주문이 가리키는 회원을 언제 읽어 올지 정한다',
      '    @ManyToOne(fetch = FetchType.' + (c.fetch === 'lazy' ? 'LAZY' : 'EAGER') + ')',
      '    private Member member;', '', '    public Member getMember() { return member; }', '}', '',
      '// DB에는 주문 10과, 그 주문을 한 회원 1(김철수)이 들어 있다',
      'Order order = em.find(Order.class, 10L);'];
    if (c.use) l.push('// 사용: 회원의 값(이름)을 실제로 쓴다', 'String name = order.getMember().getName();');
    return l.join('\n');
  },
  label: function (c) { return (c.fetch === 'lazy' ? 'FetchType.LAZY' : 'FetchType.EAGER') + (c.use ? ' · 이름을 씀' : ' · 이름을 쓰지 않음'); },
  columns: ['find 줄에서 나간 SQL', 'getName 줄에서 나간 SQL', '회원을 읽은 때'],
  simulate: function (c) {
    var lazy = c.fetch === 'lazy', use = !!c.use, ev = [], sum = [];
    // 상태: cur는 지금 실행 중인 줄(l1 find, l2 getMember/getName), ob는 Order 객체가 만들어졌는가, mb는 회원 쪽 객체(none 없음, empty 이름이 비어 있는 대리 객체, filled 이름까지 채워짐),
    // kind는 회원 쪽 객체의 종류(proxy 대리 객체, real 진짜 Member), n은 나간 SELECT 수, when은 회원을 읽은 때, ro와 rm은 이 단계에서 orders와 member 테이블을 읽었는가, end는 코드가 끝났는가
    var st = { cur: '', ob: false, mb: 'none', kind: lazy ? 'proxy' : 'real', n: 0, when: '', ro: false, rm: false, end: false, log: [] };
    function push(s, k) { ev.push({ s: s, k: k, snap: JSON.parse(JSON.stringify(st)) }); }
    function step() { st.ro = false; st.rm = false; }

    // 0. 준비
    step();
    push('DB의 준비: 코드가 실행되기 전에 DB의 orders 테이블에는 주문 한 행(id 10, member_id 1)이, member 테이블에는 회원 한 행(id 1, 김철수)이 들어 있습니다. member_id는 이 주문을 한 회원의 번호를 적은 칸입니다. 이 행들은 화면의 코드 바깥에서 미리 넣어 두었습니다. Order와 Member는 각각 테이블의 한 행에 대응하는 자바 클래스(엔티티)이고, 코드에 나오는 em은 DB에서 엔티티를 읽어 오는 EntityManager입니다. 지금은 아직 아무것도 읽어 오지 않았습니다.', '');

    // 1. find
    step();
    st.cur = 'l1'; st.ob = true; st.ro = true; st.n = 1;
    if (lazy) {
      st.mb = 'empty';
      st.log.push(['find', 'SELECT 1번 (orders 테이블만)', '']);
      push('Order order = em.find(Order.class, 10L): em이 id가 10인 주문을 찾습니다. JPA(Hibernate)가 orders 테이블을 읽는 SELECT 문(DB에서 행을 읽어 오는 SQL)을 1번 만들어 보내고, 읽어 온 행으로 Order 객체를 만듭니다. 이 행에는 회원의 번호 member_id = 1만 적혀 있습니다. member 필드 위에 LAZY가 적혀 있으므로 member 테이블은 읽지 않고, member 필드에는 회원 1의 번호만 아는 대리 객체(프록시)를 넣어 둡니다. 대리 객체의 이름은 아직 비어 있습니다. 이 SELECT는 우리가 쓴 코드에 없고, JPA가 만들어 보냈습니다.', '');
    } else {
      st.mb = 'filled'; st.rm = true; st.when = 'find 줄에서';
      st.log.push(['find', 'SELECT 1번 (orders와 member를 조인)', 'hot']);
      push('Order order = em.find(Order.class, 10L): em이 id가 10인 주문을 찾습니다. JPA(Hibernate)가 SELECT 문(DB에서 행을 읽어 오는 SQL)을 1번 만들어 보내고, 읽어 온 행으로 Order 객체를 만듭니다. member 필드 위에 EAGER가 적혀 있으므로, 이 SELECT 하나가 orders 테이블과 member 테이블을 조인(두 테이블을 번호로 이어 붙여 한 번에 읽는 것)해서 회원 1의 행까지 함께 읽어 옵니다. 그래서 member 필드에는 이름(김철수)까지 채워진 진짜 Member 객체가 들어갑니다. 이 SELECT는 우리가 쓴 코드에 없고, JPA가 만들어 보냈습니다.', 'hot');
    }

    if (use) {
      // 2. getMember()
      step();
      st.cur = 'l2';
      if (lazy) push('order.getMember(): Order 객체의 member 필드에 들어 있던 대리 객체를 그대로 돌려줍니다. 이 줄까지는 member 테이블에 SQL이 나가지 않았고, 돌려받은 대리 객체의 이름은 아직 비어 있습니다.', '');
      else push('order.getMember(): Order 객체의 member 필드에 들어 있던 Member 객체를 그대로 돌려줍니다. find 줄에서 이미 이름까지 채워져 있으므로 SQL은 나가지 않습니다.', '');

      // 3. getName()
      step();
      if (lazy) {
        st.mb = 'filled'; st.rm = true; st.n = 2; st.when = 'getName 줄에서';
        st.log.push(['getName', 'SELECT 1번 (member 테이블만)', 'hot']);
        push('.getName(): 대리 객체가 가진 것은 회원의 번호뿐이라 이름을 알 수 없습니다. 이 순간 JPA(Hibernate)가 member 테이블을 읽는 SELECT 문을 보내 회원 1의 행을 읽어 오고, 대리 객체를 채워 이름 김철수를 돌려줍니다. 회원의 값을 처음 꺼낸 이 줄에서 SELECT가 나갔고, 이 SELECT도 우리가 쓴 코드에 없습니다.', 'hot');
      } else {
        st.log.push(['getName', '없음', '']);
        push('.getName(): 이미 find 줄에서 채워져 있는 Member 객체의 이름 김철수를 돌려줍니다. DB에 다시 갈 일이 없으므로 SQL은 나가지 않습니다.', '');
      }
    }

    // 4. 끝
    step();
    st.cur = ''; st.end = true;
    if (lazy && use) push('코드가 끝났습니다. 나간 SELECT는 모두 2번입니다. 주문을 읽는 find 줄에서 1번, 회원의 이름을 꺼내는 getName 줄에서 1번 나갔고, 회원을 읽은 때는 이름을 실제로 쓴 getName 줄입니다.', '');
    else if (lazy) push('코드가 끝났습니다. 회원의 이름을 쓰는 줄이 없으므로 member 테이블을 읽는 SELECT는 끝까지 나가지 않았습니다. 나간 SELECT는 find 줄의 1번뿐이고, member 필드에는 이름이 비어 있는 대리 객체가 들어 있는 채로 남았습니다.', 'good');
    else if (use) push('코드가 끝났습니다. 나간 SELECT는 find 줄의 1번뿐입니다. 회원은 이름을 쓰기 전에, 주문을 읽는 find 줄에서 이미 읽혀 있었습니다.', '');
    else push('코드가 끝났습니다. 회원의 이름을 쓰는 줄이 없는데도 나간 SELECT 1번이 회원까지 읽었습니다. EAGER이면 회원을 쓰든 쓰지 않든 find 줄에서 읽어 옵니다.', 'bad');

    // 요약: 첫 줄은 물음의 답
    var key = (lazy ? 'lazy' : 'eager') + '|' + (use ? 1 : 0);
    var S = {
      'lazy|1': ['FetchType.LAZY로 적은 member는 "회원은 쓰는 순간에 읽어 온다"는 뜻입니다. 주문을 읽는 find 줄에서는 orders 테이블만 읽었고, 회원을 읽는 SELECT는 이름을 꺼낸 getName 줄에서 나갔습니다(SELECT 모두 2번).', '코드에는 SQL이 한 줄도 없는데 SQL이 두 번 나갔습니다. order.getMember()까지는 SQL이 나가지 않고, 회원의 값을 쓰는 순간에 나갑니다.'],
      'lazy|0': ['회원의 이름을 쓰지 않으면 member 테이블을 읽는 SELECT는 끝까지 나가지 않습니다(SELECT 모두 1번). LAZY는 쓰지 않는 회원은 읽지 않는다는 뜻입니다.', '그동안 member 필드에는 회원의 번호만 아는, 이름이 비어 있는 대리 객체가 들어 있을 뿐입니다.'],
      'eager|1': ['FetchType.EAGER로 바꾸면 회원이 주문을 읽는 find 줄에서 함께 읽힙니다. 이 코드에서는 주문과 회원을 조인한 SELECT 하나로 읽었고, getName 줄에서는 SQL이 나가지 않았습니다(SELECT 모두 1번).', '달라진 것은 읽는 때입니다. 회원을 쓰기 전에, 주문을 읽는 순간에 이미 읽어 옵니다.'],
      'eager|0': ['EAGER이면 회원의 이름을 쓰지 않아도 find 줄에서 회원까지 읽어 옵니다. 쓰지 않을 회원까지 읽은 것입니다.', 'LAZY였다면 이 코드에서는 member 테이블을 읽는 일이 아예 없었습니다. 코드가 회원을 쓸지는 em.find를 부르는 때 알 수 없어서, EAGER는 늘 함께 읽어 둡니다.']
    };
    S[key].forEach(function (x) { sum.push(x); });
    var nameCol = !use ? '(그 줄이 없음)' : lazy ? 'SELECT 1번 (member)' : '없음';
    return { events: ev, summary: sum, row: [lazy ? 'SELECT 1번 (orders)' : 'SELECT 1번 (orders와 member를 조인)', nameCol, lazy ? (use ? 'getName 줄에서' : '읽지 않음') : 'find 줄에서'] };
  },
  render: function (v, sim, t, H, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : null;
    if (!s) { H.text(v, '실행을 누르면 DB에 주문 10과 회원 1이 들어 있는 것부터 시작합니다.'); return; }
    H.table(v, ['코드 줄', '그 줄에서 나간 SQL'], s.log.length ? s.log.map(function (r) { return { cls: '', cells: [r[0], { v: r[1], cls: r[2] }] }; }) : [{ cls: 'gone', cells: ['아직 없음', ''] }], '나간 SQL');
    H.counters(v, [[s.n, '나간 SELECT 문'], [s.mb === 'filled' ? 1 : 0, '이름까지 읽어 온 회원']]);
  },
  // 그림: 왼쪽에 코드의 두 줄(주문 읽기, 회원의 이름 쓰기), 가운데에 메모리의 Order 객체와 그 member 필드가 가리키는 회원 쪽 객체(대리 객체이거나 진짜 Member), 오른쪽에 DB의 orders와 member 테이블. SQL이 나가면 객체에서 테이블로 가는 화살표가 생긴다.
  draw: function (P, sim, shown) {
    var c = sim.c, lazy = c.fetch === 'lazy', use = !!c.use, last = shown[shown.length - 1], s = last ? last.snap : null;
    P.size(680, 290);
    P.region('code', 14, 12, 200, 206, '코드');
    P.region('mem', 264, 12, 200, 206, '메모리의 객체');
    P.region('db', 514, 12, 152, 206, 'DB의 테이블');
    function line(id, y, title, sub, on) {
      var cur = s && s.cur === id;
      P.box(id, 26, y, 176, 60, { cls: !on ? 'ghost' : cur ? 'hot now' : 'plain', title: title, sub: sub });
    }
    line('l1', 40, '1. 주문 읽기', 'em.find(Order.class)', true);
    line('l2', 124, '2. 이름 쓰기', use ? 'getMember().getName()' : '(이 줄이 없음)', use);
    P.box('ob', 276, 40, 176, 60, { cls: s && s.ob ? (s.ro ? 'hot' : 'plain') : 'ghost', title: 'Order 객체', sub: s && s.ob ? ['id 10', 'member 필드 → 아래 객체'] : '아직 없음' });
    var mt = 'Member 객체', msub = '아직 없음', mcls = 'ghost';
    if (s && s.mb !== 'none') {
      mt = s.kind === 'proxy' ? '대리 객체 (프록시)' : 'Member 객체';
      msub = ['id 1', s.mb === 'filled' ? '이름: 김철수' : '이름: 비어 있음'];
      mcls = s.rm ? 'hot' : s.mb === 'filled' ? 'good' : 'wait';
    }
    P.box('mb', 276, 124, 176, 60, { cls: mcls, title: mt, sub: msub });
    P.box('dt1', 526, 40, 128, 60, { cls: s && s.ro ? 'hot' : 'plain', title: 'orders', sub: ['id 10', 'member_id 1'] });
    P.box('dt2', 526, 124, 128, 60, { cls: s && s.rm ? 'hot' : 'plain', title: 'member', sub: ['id 1', '김철수'] });
    if (s && s.cur === 'l1') P.arrow('a1', 'l1:r', 'ob:l', { cls: 'mut' });
    if (s && s.cur === 'l2') P.arrow('a2', 'l2:r', 'mb:l', { cls: 'mut' });
    if (s && s.ob) P.arrow('am', 'ob:b', 'mb:t', { cls: 'mut' });
    if (s && s.ro) P.arrow('s1', 'ob:r', 'dt1:l', { cls: 'hot' });
    if (s && s.rm) P.arrow('s2', 'mb:r', 'dt2:l', { cls: 'hot' });
    P.box('n1', 14, 236, 322, 40, { cls: s && s.n ? 'wait' : 'ghost', title: '나간 SELECT 문', right: (s ? s.n : 0) + '번' });
    P.box('n2', 344, 236, 322, 40, { cls: s && s.when ? 'good' : 'ghost', title: '회원을 읽은 때', right: s && s.when ? s.when : s && s.end ? '읽지 않음' : '아직 없음' });
  },
  assume: 'Hibernate 7.4.5와 H2 2.4.240(메모리 DB)에서 실행해 대조했습니다. 스프링 없이 SessionFactory를 직접 만들었고, JDK 21입니다. 네 가지 조합을 모두, 화면의 엔티티 두 클래스(Member와 Order)와 읽는 코드 줄을 글자 그대로(주석 줄 포함) 컴파일해 실행했습니다. 화면에서 줄인 것은 package와 import 줄뿐이고, 화면에 보이지 않는 것은 EntityManager를 얻고 닫는 코드입니다. 조합마다 DB와 SessionFactory를 새로 만들고, 테이블은 Hibernate가 만들게 했으며, DB에는 실행 전에 JDBC로 회원 (1, 김철수)와 주문 (10, member_id 1)을 미리 넣었습니다. 이 준비의 SQL은 세지 않았고, 읽는 코드는 그 준비와 다른 EntityManager에서 영속성 컨텍스트가 빈 상태로 실행했습니다. 읽는 코드에는 트랜잭션을 시작하는 줄이 없고 em을 열어 둔 채 실행했습니다. 대조한 것은 Hibernate의 StatementInspector로 잡은 SQL을 코드 줄마다 나눈 것입니다(어느 줄에서 나갔는지는 호출 스택으로 알아냈고, 나간 SQL 원문과 줄은 대조 출력에 남겼습니다). 이 환경에서 LAZY는 find 줄에서 orders 테이블만 읽는 SELECT 1번이, getName 줄에서 member 테이블만 읽는 SELECT 1번이 나갔고, EAGER는 find 줄에서 orders와 member를 left join한 SELECT 1번이 나가고 getName 줄에서는 나가지 않았습니다. 이름을 쓰는 줄이 없으면 LAZY는 member 테이블을 읽는 SELECT가 전혀 나가지 않았습니다. 단계 문장이 기대는 사실도 줄마다 바로 아래에 측정 줄을 끼우고 getMember()와 getName()을 두 줄로 나눈 두 번째 실행에서 쟀습니다. LAZY에서 find 직후 member 필드의 객체는 Hibernate가 만든 프록시 클래스의 객체(Member$HibernateProxy)이고 초기화되지 않았으며 식별자 1을 알고 있다는 것, order.getMember()를 부른 직후에도 SQL이 늘지 않고 여전히 초기화되지 않았다는 것, getName() 직후에 SELECT가 한 번 늘고 초기화되었다는 것, EAGER에서는 find 직후 member 필드가 프록시가 아닌 진짜 Member 객체이고 초기화되어 있으며 getMember()와 getName() 뒤에도 SQL이 늘지 않았다는 것입니다. 또 @ManyToOne에 fetch를 적지 않고 같은 코드를 실행하면 EAGER와 같게 find 줄에서 조인한 SELECT 1번으로 회원까지 읽혔습니다(화면의 설정에는 넣지 않았고, 용어 설명의 근거로만 썼습니다). 문서가 정한 것은 Jakarta Persistence 3.2 API 문서의 FetchType(EAGER는 데이터를 반드시 즉시 읽어야 한다는 요구이고, LAZY는 처음 접근할 때 읽어도 된다는 힌트이며 구현체는 LAZY로 적힌 데이터를 미리 읽어도 된다는 것)과 ManyToOne의 fetch(적지 않으면 기본값이 EAGER라는 것)입니다. Hibernate 사용자 안내서(User Guide)의 Fetching 장은 페이지에서 해당 부분을 열지 못해 읽지 못했으므로, 대리 객체를 넣어 두는 방식과 EAGER를 조인으로 읽는 방식은 문서가 아니라 Hibernate 7.4.5에서 관찰한 동작입니다. 명세상 LAZY는 힌트이고 EAGER를 조인으로 읽을지 별도 SELECT로 읽을지는 구현이 정하므로, 화면에는 이 환경에서 나간 SQL만 적었습니다. 이 실습은 em이 열려 있는 동안만 다루며, em을 닫은 뒤 대리 객체를 채우려 할 때 나는 LazyInitializationException, 주문이 여러 개일 때 SELECT가 주문 수만큼 늘어나는 N+1 문제, JPQL 조회, 컬렉션(@OneToMany)의 로딩은 다루지 않습니다. 대리 객체의 세부는 "프록시와 지연 로딩" 실습에서, N+1은 "N+1 문제" 실습에서 다룹니다. MySQL에서의 실행 대조는 하지 않았습니다.',
});

Lab.register({
  id: 'relation_basic', nav: '연관관계', cat: '기초개념', mode: 'step', basic: true, deep: ['owner'],
  title: '연관관계는 무엇이고, @ManyToOne은 무엇을 해 주는가',
  intro: '주문은 누가 주문했는지를 알아야 합니다. 테이블에서는 주문 행이 회원의 번호를 열 하나(외래 키)에 적어 회원을 가리킵니다. 자바 객체에서는 Order가 Member 객체를 필드로 직접 가리킵니다(Order와 Member는 이 실습에서 예시로 만든 엔티티 클래스입니다). 이렇게 엔티티가 다른 엔티티를 가리키는 것이 연관관계입니다. 그 필드 위에 @ManyToOne을 적으면 JPA가 둘 사이를 이어 줍니다. 저장할 때는 Member 객체에서 id를 꺼내 외래 키 열에 넣고, 읽을 때는 그 번호로 Member 객체를 만들어 필드가 가리키게 해 줍니다. 그래서 order.getMember().getName()처럼 객체를 따라가면 됩니다. 이 실습은 member 테이블에 (1, 김철수)가 미리 들어 있는 DB에서, 주문을 저장했다가 다시 읽는 같은 코드를 필드 선언만 바꿔 실행합니다. @ManyToOne을 지우면 어떻게 되는지, 객체 대신 번호(Long memberId)만 필드로 두면 무엇이 달라지는지를 봅니다.',
  terms: ['연관관계', '@ManyToOne', '@JoinColumn', '기본 키, 유니크 키, 외래 키'],
  controls: [
    { id: 'how', label: 'Order의 member 필드', type: 'select', value: 'ref', options: [
      ['ref', '@ManyToOne private Member member;'],
      ['named', '@ManyToOne에 @JoinColumn(name = "buyer_id")를 더한다'],
      ['noanno', '@ManyToOne을 지운다: private Member member;'],
      ['idonly', '객체 대신 번호만 둔다: private Long memberId;'],
    ] },
  ],
  // q는 물음 방식의 화면에 보이는 물음, t와 d는 글로만 읽는 본문에 쓰이는 이름과 설명
  presets: [
    { t: '처음 설정으로', q: '연관관계는 어떻게 생겼고, 주문을 저장했다가 다시 읽으면 회원을 어떻게 얻나', d: '@ManyToOne이 붙은 member 필드. JPA가 객체에서 번호를 꺼내 외래 키 열에 넣고, 읽을 때는 번호로 Member 객체를 만들어 필드가 가리키게 해 줍니다.', v: { how: 'ref' } },
    { t: '@ManyToOne을 지우면', q: '@ManyToOne을 지우면', d: 'Member 타입의 필드를 열에 어떻게 담을지 몰라 JPA가 시작하지 못합니다.', v: { how: 'noanno' } },
    { t: '객체 대신 번호만 두면', q: 'Member 객체 대신 회원 번호(Long memberId)만 두면', d: '저장은 되지만 외래 키 제약은 만들어지지 않고, 회원을 얻으려면 번호로 우리가 다시 찾아야 합니다.', v: { how: 'idonly' } },
    { t: '@JoinColumn을 더하면', q: '@JoinColumn(name = "buyer_id")를 더하면', d: '외래 키 열의 이름만 member_id에서 buyer_id로 바뀌고, 저장하고 읽는 결과는 같습니다.', v: { how: 'named' } },
  ],
  // 화면의 코드와 대조 프로그램(verify/spring/src/RelationBasicProbe.java)이 컴파일하고 실행한 소스는 같은 글이다(대조 스크립트가 글자까지 비교한다).
  code: function (c) {
    var l = ['@Entity', '@Table(name = "orders")', 'public class Order {', '    @Id', '    private Long id;'];
    if (c.how === 'ref' || c.how === 'named') l.push('    // 연관관계: 이 주문을 한 회원을 객체로 가리킨다', '    @ManyToOne');
    if (c.how === 'named') l.push('    @JoinColumn(name = "buyer_id")');
    l.push(c.how === 'idonly' ? '    private Long memberId;' : '    private Member member;', '}', '',
      '// 쓰는 쪽: 주문을 저장하고, 다시 읽어서 주문한 회원의 이름을 본다');
    if (c.how === 'idonly') l.push('em.persist(new Order(10L, 1L));');
    else l.push('Member kim = em.find(Member.class, 1L);', 'em.persist(new Order(10L, kim));');
    l.push('// 저장(commit)을 마친 뒤, 새 EntityManager(em2)로 DB에서 다시 읽는다', 'Order o = em2.find(Order.class, 10L);');
    if (c.how === 'idonly') l.push('Member m = em2.find(Member.class, o.getMemberId());', 'System.out.println(m.getName());');
    else l.push('System.out.println(o.getMember().getName());');
    return l.join('\n');
  },
  label: function (c) { return { ref: '@ManyToOne private Member member;', named: '@ManyToOne + @JoinColumn(name = "buyer_id")', noanno: '@ManyToOne 없음: private Member member;', idonly: '번호만: private Long memberId;' }[c.how]; },
  columns: ['결과', 'JPA가 만든 orders 테이블', '외래 키 제약', '저장된 주문 행'],
  simulate: function (c) {
    var ev = [], sum = [], how = c.how, obj = how === 'ref' || how === 'named', fail = how === 'noanno';
    var col = how === 'named' ? 'buyer_id' : 'member_id', cols = how === 'named' ? 'buyer_id, id' : 'id, member_id';
    var selM = 'select m1_0.id,m1_0.name from member m1_0 where m1_0.id=?';
    var insO = 'insert into orders (' + col + ',id) values (?,?)';
    var readJoin = 'select o1_0.id,m1_0.id,m1_0.name from orders o1_0 left join member m1_0 on m1_0.id=o1_0.' + col + ' where o1_0.id=?';
    var readO = 'select o1_0.id,o1_0.member_id from orders o1_0 where o1_0.id=?';
    var rowText = 'id 10, ' + col + ' 1';
    // 상태: jpa(JPA 상자의 상태), jl(JPA 상자의 글), ann(member 필드의 표시가 JPA에 닿는가: pass, cut), tbl(테이블이 만들어졌나), mrow(member 행),
    // oo(Order 객체: new 새로 만듦, read 읽어 옴), mo(Member 객체), link(Order가 Member 객체를 가리키는가), orow(orders 행), fk(외래 키 제약), sql(나간 SQL), out(찍힌 글)
    var st = { phase: '', jpa: 'idle', jl: '시작 전', ann: '', tbl: false, mrow: false, oo: '', mo: false, mby: '', link: false, orow: false, fk: false, ins: 0, sel: 0, sql: [], out: '' };
    function push(s, k) { ev.push({ s: s, k: k, snap: JSON.parse(JSON.stringify(st)) }); }

    // 1. JPA가 시작하면서 Order를 읽는다
    st.phase = 'read'; st.jpa = 'read'; st.jl = 'Order 클래스를 읽는 중';
    if (fail) {
      st.ann = 'cut';
      push('프로그램이 시작되면서 JPA(여기서는 Hibernate)에 Order와 Member 클래스를 알려 주고, JPA가 클래스를 읽습니다. 이 등록하는 줄과 DB에 연결하는 설정은 화면에서 줄였습니다. JPA가 Order의 member 필드를 보니 타입이 Member, 곧 다른 엔티티입니다. 그런데 필드 위에 @ManyToOne 같은 표시가 없습니다. JPA는 표시가 없는 필드를 숫자나 글자처럼 열 하나에 담을 값으로 보고 열의 타입을 정하려 하는데, Member는 그런 값이 아닙니다.', 'bad');
      st.phase = 'fail'; st.jpa = 'bad'; st.jl = '시작 실패 (오류 발생)';
      push('JPA가 MappingException 오류를 내며 시작을 멈춥니다. 메시지는 Incorrect use of entity type \'app.Member\' (possibly due to missing association mapping annotation)으로 시작하고, 연관관계를 나타내는 표시가 빠진 것 같다는 뜻입니다. 안쪽 원인은 Java 타입 \'app.Member\'에 맞는 열의 타입을 정하지 못했다는 것입니다. 앞의 app은 이 실험에서 Member를 넣은 패키지 이름입니다. 테이블은 하나도 만들어지지 않았습니다. 프로그램은 쓰는 코드에 이르지도 못하므로 find도 persist도 실행되지 않았고, SQL은 한 번도 나가지 않았습니다.', 'bad');
      sum.push('@ManyToOne을 지우면 JPA는 Member 타입의 필드를 열에 어떻게 담을지 몰라 시작하지 못합니다. 이 필드는 연관관계라는 표시를 잃어, JPA에게는 담을 방법을 알 수 없는 값이 되었습니다.');
      sum.push('이번 오류는 find나 persist 줄이 아니라 JPA가 시작할 때 났고, 테이블이 하나도 만들어지지 않았습니다. 엔티티 타입의 필드는 연관관계 표시가 있어야 외래 키 열로 이어집니다.');
    } else if (obj) {
      st.ann = 'pass';
      push('프로그램이 시작되면서 JPA(여기서는 Hibernate)에 Order와 Member 클래스를 알려 주고, JPA가 클래스를 읽습니다. 이 등록하는 줄과 DB에 연결하는 설정은 화면에서 줄였습니다. JPA가 Order의 member 필드를 보니 타입이 Member, 곧 다른 엔티티이고 위에 @ManyToOne이 붙어 있습니다. 그래서 JPA는 이 필드를 "다른 엔티티를 가리키는 필드"로 받아들입니다.' + (how === 'named' ? ' 그 아래의 @JoinColumn(name = "buyer_id")는 가리키는 번호를 담을 열의 이름을 buyer_id로 하라는 표시입니다.' : ''), 'good');
      st.phase = 'table'; st.tbl = true; st.fk = true; st.mrow = true; st.jpa = 'ok'; st.jl = 'orders 테이블을 만듦';
      push('JPA가 이 짝짓기대로 H2 DB에 orders 테이블을 만듭니다. 열은 ' + cols + '이고, 열 ' + col + '에는 Member의 id를 담습니다. 외래 키 제약도 함께 만들어져, 이 열의 값은 member 테이블의 id에 있는 번호여야 합니다. ' + (how === 'named' ? '열 이름은 @JoinColumn이 정한 buyer_id입니다. 적지 않았다면 필드 이름 member에 _와 가리키는 열 이름 id를 이은 member_id가 되었을 것입니다(JPA 명세의 기본 규칙). ' : '열 이름 member_id는 필드 이름 member에 _와 가리키는 열 이름 id를 이은 것입니다(@JoinColumn을 적지 않았을 때의 JPA 명세의 기본 규칙). ') + '이 실습은 JPA가 시작할 때 테이블을 만들도록 설정했고(hibernate.hbm2ddl.auto=create-drop), 우리는 CREATE TABLE을 쓰지 않았습니다. member 테이블에는 실습이 미리 넣어 둔 행 (1, 김철수)이 있습니다. 이 행을 넣는 줄은 화면의 코드에서 줄였습니다.', 'good');
    } else {
      st.ann = 'pass';
      push('프로그램이 시작되면서 JPA(여기서는 Hibernate)에 Order와 Member 클래스를 알려 주고, JPA가 클래스를 읽습니다. 이 등록하는 줄과 DB에 연결하는 설정은 화면에서 줄였습니다. JPA가 Order의 memberId 필드를 보니 타입이 Long, 평범한 숫자입니다. 숫자는 열 하나에 그대로 담으면 되므로 @ManyToOne이 없어도 문제가 없습니다. 다만 JPA는 이 숫자가 회원의 번호라는 것을 알지 못합니다.', 'good');
      st.phase = 'table'; st.tbl = true; st.mrow = true; st.jpa = 'ok'; st.jl = 'orders 테이블을 만듦';
      push('JPA가 이 짝짓기대로 H2 DB에 orders 테이블을 만듭니다. 열은 id와 member_id이고, member_id는 필드 memberId에 맞춘 열 하나입니다. 이 실습은 필드 이름의 대문자 앞에 _를 넣어 열 이름으로 쓰는 규칙(Spring Boot의 기본 규칙과 같음)을 설정했습니다. 외래 키 제약은 만들어지지 않았습니다. member_id는 그냥 숫자를 담는 열이어서 DB가 이 값을 member 테이블과 이어 주지 않습니다. member 테이블에는 실습이 미리 넣어 둔 행 (1, 김철수)이 있습니다. 이 행을 넣는 줄은 화면의 코드에서 줄였습니다.', 'good');
    }

    if (!fail) {
      // 2. 쓰는 쪽
      if (obj) {
        st.phase = 'findm'; st.mo = true; st.mby = 'em'; st.sel = 1; st.sql = [selM]; st.jl = 'Member를 찾아 kim을 만듦';
        push('Member kim = em.find(Member.class, 1L): JPA가 member 테이블에서 id가 1인 행을 읽어 Member 객체 kim을 만듭니다. 이 실행에서 SELECT가 1번 나갔습니다. kim은 id 1과 name 김철수를 가진 평범한 객체입니다.', '');
        st.phase = 'persist'; st.oo = 'new'; st.link = true; st.ins = 1; st.orow = true; st.sql = [selM, insO]; st.jl = 'INSERT를 보냄';
        push('em.persist(new Order(10L, kim)): 주문 객체를 만들면서 member 필드가 번호 1이 아니라 kim 객체를 가리키게 합니다. 이 주문을 JPA에 넘기고 저장을 마치는 과정에서 INSERT가 1번 나갑니다. 이 실행에서 Hibernate 7.4.5가 만든 문장은 "' + insO + '"입니다. JPA가 kim 객체에서 id 1을 꺼내 ' + col + ' 자리에 넣었습니다. 우리는 번호를 꺼내 적지 않았습니다. orders 테이블에 행 (' + rowText + ')이 생겼습니다.', 'good');
      } else {
        st.phase = 'persist'; st.oo = 'new'; st.ins = 1; st.orow = true; st.sql = [insO]; st.jl = 'INSERT를 보냄';
        push('em.persist(new Order(10L, 1L)): 주문 객체를 만들면서 회원 번호 1을 우리가 직접 적어 넣습니다. kim 같은 Member 객체는 없습니다. 이 주문을 JPA에 넘기고 저장을 마치는 과정에서 INSERT가 1번 나갑니다. 이 실행에서 Hibernate 7.4.5가 만든 문장은 "' + insO + '"입니다. 넣은 숫자가 그대로 열에 들어가, orders 테이블에 행 (' + rowText + ')이 생겼습니다.', 'good');
      }
      // 3. 다시 읽는다
      if (obj) {
        st.phase = 'readorder'; st.oo = 'read'; st.mby = 'em2'; st.sel = 2; st.sql = [selM, insO, readJoin]; st.jl = '번호 1로 Member 객체를 새로 만듦';
        push('Order o = em2.find(Order.class, 10L): 저장할 때 쓴 em과 다른 em2로 주문을 읽습니다. 따로 만든 em2는 앞의 객체를 모르기 때문에 DB에서 읽어 옵니다. 이 줄에서 SELECT가 1번 나갔고, 그 문장이 orders 테이블뿐 아니라 member 테이블까지 함께 읽었습니다. JPA가 행의 ' + col + ' 값 1에 맞는 member 행으로 Member 객체를 새로 만들고, o의 member 필드가 그 객체를 가리키게 합니다. 이 Member 객체는 em2가 만든 것으로, 저장할 때 쓴 kim과는 다른 객체입니다. Member를 찾는 find를 우리가 따로 부르지 않았습니다.', 'good');
        st.phase = 'print'; st.out = '김철수'; st.jl = '객체를 따라가면 됨';
        push('System.out.println(o.getMember().getName()): o.getMember()는 o의 member 필드가 가리키는 Member 객체(em2가 만든 것)이고, getName()은 그 객체의 이름을 돌려줍니다. 화면에 김철수가 찍힙니다. 우리는 번호를 다루지 않고 객체를 따라가기만 했습니다.', 'good');
        if (how === 'ref') {
          sum.push('연관관계는 한 엔티티가 다른 엔티티를 가리키는 것입니다. 테이블에서는 orders 행이 회원의 번호를 member_id 열(외래 키)에 적어 가리키고, 자바 객체에서는 Order가 Member 객체를 필드로 가리킵니다. 필드 위의 @ManyToOne이 둘을 이어 줍니다.');
          sum.push('저장할 때 JPA가 kim 객체에서 id를 꺼내 member_id에 넣었고, 읽을 때는 그 번호로 Member 객체를 만들어 member 필드가 가리키게 해 주었습니다. 그래서 o.getMember().getName()처럼 객체를 따라가면 회원의 이름을 얻습니다.');
        } else {
          sum.push('@JoinColumn은 외래 키 열의 이름만 정합니다. 열 이름이 member_id에서 buyer_id로 바뀌었을 뿐, 저장하고 읽는 결과는 @ManyToOne만 쓸 때와 같습니다. 외래 키 제약도 그대로 만들어졌습니다.');
          sum.push('주문에서 회원을 꺼내는 코드는 열 이름을 한 번도 쓰지 않습니다. o.getMember().getName()은 열 이름이 무엇이든 같고, 열 이름은 JPA가 SQL을 만들 때와 DB에서 테이블을 볼 때만 나타납니다.');
        }
      } else {
        st.phase = 'readorder'; st.oo = 'read'; st.sel = 1; st.sql = [insO, readO]; st.jl = '주문만 읽음';
        push('Order o = em2.find(Order.class, 10L): 저장할 때 쓴 em과 다른 em2로 주문을 읽습니다. 이 줄에서 SELECT가 1번 나갔고, orders 테이블만 읽었습니다. o에는 member_id 값이 getMemberId()가 돌려주는 숫자 1로 들어 있을 뿐이고, Member 객체는 없습니다.', 'good');
        st.phase = 'findm'; st.mo = true; st.mby = 'em2'; st.sel = 2; st.sql = [insO, readO, selM]; st.jl = '우리가 부른 find';
        push('Member m = em2.find(Member.class, o.getMemberId()): 회원을 얻으려면 이 번호로 Member를 찾는 줄을 우리가 한 줄 더 써야 합니다. 이 줄에서 SELECT가 한 번 더 나가 member 테이블에서 id가 1인 행을 읽습니다.', 'good');
        st.phase = 'print'; st.out = '김철수'; st.jl = '찾는 줄이 하나 더 필요';
        push('System.out.println(m.getName()): m은 방금 우리가 찾은 Member 객체이고, 화면에 김철수가 찍힙니다. 결과는 같지만 o에서 m으로 가는 길은 JPA가 이어 준 것이 아니라 우리가 번호로 찾은 것입니다.', 'good');
        sum.push('객체 대신 번호만 두어도 저장은 되고 회원의 이름도 얻습니다. 하지만 JPA는 member_id를 그냥 숫자 열로 보아 외래 키 제약을 만들지 않았고, 회원을 얻으려면 번호로 find를 우리가 한 번 더 불러야 했습니다.');
        sum.push('연관관계를 쓰면 o.getMember().getName() 한 줄로 가는 길이, 번호만 두면 find와 getMemberId()를 직접 이어야 하는 두 줄이 됩니다. 이어 주는 일을 JPA가 하느냐 우리가 하느냐의 차이입니다.');
      }
    }
    var result = fail ? 'JPA가 시작하다 실패함: 엔티티 타입의 필드에 연관관계 표시가 없음' : '김철수';
    var tab = fail ? '만들어지지 않음' : 'orders (' + cols + ')';
    var fkText = fail ? '테이블 없음' : obj ? '있음: ' + col + ' → Member의 id' : '없음';
    var rowOut = fail ? '테이블 없음' : rowText;
    return { events: ev, summary: sum, col: col, cols: cols, sql: { selM: selM, insO: insO, readJoin: readJoin, readO: readO }, row: [result, tab, fkText, rowOut] };
  },
  render: function (v, sim, t, H, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : null;
    if (!s) { H.text(v, '실행을 누르면 JPA가 시작하면서 Order 클래스를 읽는 것부터 시작합니다.'); return; }
    var col = sim.col;
    if (s.tbl) H.table(v, ['열', '값'], sim.cols.split(', ').map(function (n) { return { cls: '', cells: [n, s.orow ? { v: n === 'id' ? '10' : '1', cls: 'good' } : ''] }; }), 'JPA가 만든 orders 테이블');
    else H.table(v, ['열', '값'], [{ cls: 'gone', cells: ['테이블 없음', ''] }], 'JPA가 만든 orders 테이블');
    if (s.sql.length) H.table(v, ['나간 SQL 문'], s.sql.map(function (q) { return { cls: '', cells: [{ v: q, cls: 'good' }] }; }), 'Hibernate가 만든 문장');
    H.counters(v, [[s.ins, '나간 INSERT'], [s.sel, '나간 SELECT']]);
  },
  // 그림: 위쪽에 객체 세계(Order 객체와 Member 객체. 상자 이름에 그 객체를 만든 쪽을 적는다. 다시 읽은 뒤의 두 상자는 em2가 새로 만든 객체다), 아래쪽에 테이블 세계(orders 행과 member 행), 가운데에 둘을 이어 주는 JPA. 연관관계가 있으면 Order 객체에서 Member 객체로, orders 행에서 member 행으로 화살표가 이어진다.
  draw: function (P, sim, shown) {
    var c = sim.c, how = c.how, obj = how === 'ref' || how === 'named', col = sim.col, last = shown[shown.length - 1], s = last ? last.snap : null;
    P.size(680, 396);
    var ph = s ? s.phase : '';
    P.region('wo', 14, 12, 652, 108, '객체 세계: 자바 객체');
    var osub = !s || !s.oo ? '객체 없음' : how === 'idonly' ? ['id = 10', 'memberId = 1'] : ['id = 10', 'member = ' + (s.link ? 'Member 객체' : '비어 있음')];
    P.box('oo', 24, 38, 270, 70, { cls: !s || !s.oo ? 'ghost' : ph === 'persist' || ph === 'readorder' ? 'hot now' : 'wait', title: !s || !s.oo ? 'Order 객체' : s.oo === 'read' ? 'Order 객체 o (em2가 만듦)' : 'Order 객체 (new로 만듦)', sub: osub });
    P.box('mo', 386, 38, 270, 70, { cls: !s || !s.mo ? 'ghost' : (ph === 'findm' || (obj && ph === 'readorder')) ? 'hot now' : 'wait', title: !s || !s.mby ? 'Member 객체' : s.mby === 'em' ? 'Member 객체 kim (em이 만듦)' : how === 'idonly' ? 'Member 객체 m (em2가 만듦)' : 'Member 객체 (em2가 새로 만듦)', sub: s && s.mo ? ['id = 1', 'name = 김철수'] : '객체 없음' });
    if (obj && s && s.link) P.arrow('lk', 'oo:r', 'mo:l', { cls: 'good' });
    var jcls = !s ? 'ghost' : s.jpa === 'bad' ? 'bad' : s.jpa === 'ok' ? 'good' : 'hot now';
    P.box('jpa', 24, 150, 632, 62, { cls: jcls, title: 'JPA (Hibernate)', sub: s ? s.jl : '시작 전' });
    // 위쪽 화살표: 클래스의 표시가 JPA에 닿는가, 객체가 JPA와 오가는가
    if (s && s.ann === 'cut') { P.arrow('a_o', 'oo:b:0.3', [120, 130], { cls: 'bad' }); P.text('x_o', 120, 142, '×', { cls: 'bad', anchor: 'middle', bold: true }); }
    else if (s && s.ann === 'pass') P.arrow('a_o', 'oo:b:0.3', 'jpa:t:0.1', { cls: ph === 'read' ? 'good' : 'mut' });
    if (s && s.mo) P.arrow('a_m', 'mo:b:0.7', 'jpa:t:0.9', { cls: ph === 'findm' || (obj && ph === 'readorder') ? 'hot' : 'mut' });
    P.region('wt', 14, 232, 652, 104, '테이블 세계: H2 DB');
    var made = !!(s && s.tbl);
    P.box('to', 24, 258, 270, 70, { cls: !made ? 'ghost' : ph === 'table' ? 'hot' : ph === 'persist' || ph === 'readorder' ? 'hot now' : 'wait', title: made ? 'orders 테이블' : '테이블 없음', sub: made ? [sim.cols, s.orow ? 'id 10 · ' + col + ' 1' : '행 없음'] : ' ' });
    P.box('tm', 386, 258, 270, 70, { cls: !made ? 'ghost' : ph === 'findm' ? 'hot now' : 'wait', title: made ? 'member 테이블' : '테이블 없음', sub: made ? ['id, name', '1 · 김철수'] : ' ' });
    if (made && obj) P.arrow('fk', 'to:r', 'tm:l', { cls: 'good' });
    if (s && s.tbl) {
      P.arrow('a_t', 'jpa:b:0.1', 'to:t:0.3', { cls: ph === 'table' || ph === 'persist' || ph === 'readorder' ? 'hot' : 'mut' });
      P.arrow('a_u', 'jpa:b:0.9', 'tm:t:0.7', { cls: ph === 'findm' ? 'hot' : 'mut' });
    }
    P.box('n1', 14, 350, 322, 36, { cls: s && s.ins ? 'good' : 'ghost', title: '나간 INSERT', right: (s ? s.ins : 0) + '번' });
    P.box('n2', 344, 350, 322, 36, { cls: s && s.out ? 'good' : 'ghost', title: '찍힌 글', right: s && s.out ? s.out : '-' });
  },
  assume: 'Hibernate 7.4.5와 H2 2.4.240(메모리 DB)에서 실행해 대조했습니다. 스프링은 쓰지 않고 Hibernate를 코드로 직접 시작했습니다(persistence.xml 없이 Configuration에 Member와 Order 클래스를 등록). 네 가지 조합을 모두, 화면의 Order 소스와 같은 글(package와 import 줄, 생성자와 getter만 더함)을 Member 소스와 함께 컴파일하고 자바 프로세스를 새로 띄워 확인했습니다. 화면에서 줄인 것은 package와 import 줄, Order의 생성자와 getter, Member 엔티티(id와 name 필드를 가진 평범한 엔티티), 그리고 EntityManager em과 em2를 얻는 줄입니다. 화면의 "쓰는 쪽"은 실제로는 main 안의 코드이고, em으로 저장하는 부분은 트랜잭션을 시작하고 끝내는(commit) 줄 사이에 있습니다. 그 줄은 화면에서 줄였습니다. 읽는 줄은 저장이 끝난 뒤, 새로 만든 em2로 실행했습니다. 같은 EntityManager로 읽으면 방금 저장한 객체를 DB가 아니라 메모리에서 돌려주어, 읽는 단계를 보일 수 없기 때문입니다. member 테이블의 (1, 김철수)는 JPA가 시작하면서 테이블을 만든 직후 JDBC로 직접 넣었습니다. 열 이름은 필드 이름의 대문자 앞에 _를 넣어 정하는 규칙(hibernate.physical_naming_strategy=PhysicalNamingStrategySnakeCaseImpl)을 설정했습니다. 스프링 부트 4.1.1의 spring-boot-hibernate jar가 기본 이름 규칙으로 가리키는 클래스와 같은 것이며(jar 안의 클래스 이름으로 확인했고 스프링 부트를 실제로 띄워 보지는 않았습니다), 이 설정이 없을 때 열 이름이 어떻게 되는지는 확인하지 않았습니다. 대조한 것은 JPA가 시작하다 실패하는지와 예외의 종류와 메시지 첫 줄, 시작 직후와 실행 뒤 H2에 있는 테이블과 열(INFORMATION_SCHEMA.COLUMNS), 외래 키 제약(INFORMATION_SCHEMA.REFERENTIAL_CONSTRAINTS와 KEY_COLUMN_USAGE), StatementInspector로 잡은 SQL(저장 단계와 읽기 단계로 나눠 SELECT와 INSERT의 수와 글), 화면에 찍힌 글, 실행 뒤 orders 테이블의 행입니다. 테이블 이름은 H2가 대문자로 저장하는데 화면에는 소문자로 적었고, 외래 키가 가리키는 member 테이블은 엔티티 이름을 따라 Member로 적었습니다. 열의 차례는 H2에서 본 그대로이며 필드를 적은 순서와 같지 않습니다(@JoinColumn으로 buyer_id를 정하면 buyer_id가 id보다 앞에 놓였습니다). 문서가 정한 것은 Jakarta Persistence 3.2 명세 2.11절(연관관계를 나타내는 필드에는 @OneToOne, @OneToMany, @ManyToOne, @ManyToMany 가운데 하나를 붙인다), 2.12절(연관관계의 기본 매핑)과 2.12.3.2항(단방향 ManyToOne은 이 엔티티의 테이블에 상대 테이블의 기본 키를 가리키는 외래 키 열이 놓이고, 그 열의 이름은 필드 이름, 밑줄, 상대의 기본 키 열 이름을 이은 것), 그리고 ManyToOne과 JoinColumn의 API 문서(JoinColumn의 name을 적지 않았을 때의 기본 이름 규칙)입니다. 명세 본문에는 애너테이션 설명이 따로 없어 이 둘은 API 문서에서 읽었습니다. 이 문서들은 WebFetch로 열었고, 돌려받은 것은 원문이 아니라 요약이어서 문장을 하나하나 원문과 대조하지는 못했습니다. 아래는 문서가 정한 것이 아니라 이 버전에서 관찰한 동작입니다. @ManyToOne을 지우면 JPA는 시작할 때 MappingException을 내고(메시지 첫 줄은 Incorrect use of entity type \'app.Member\' (possibly due to missing association mapping annotation)이고, 안쪽 원인은 Java 타입 \'app.Member\'에 맞는 JdbcType을 정하지 못했다는 것) 테이블이 하나도 만들어지지 않습니다. 이때 member 테이블도 만들어지지 않으므로 미리 넣는 행 (1, 김철수)도 없습니다. 연관관계가 있을 때 주문을 다시 읽는 SELECT는 1번이었고 member 테이블을 함께 읽는 문장(left join)이었으며, 번호만 두었을 때는 주문을 읽는 SELECT 1번과 우리가 부른 Member find의 SELECT 1번으로 모두 2번이었습니다. 이 SELECT가 언제 어떻게 나가는지의 세부는 공부 쪽 실습에서 다룹니다. 문장은 Hibernate 버전에 따라 글자가 다를 수 있어 화면에는 "이 실행에서 Hibernate 7.4.5가 만든 문장"이라고 밝혔습니다. 테이블 이름을 orders로 정한 @Table은 order가 SQL의 예약어이기 때문에 붙였고, 이 실습의 주제가 아닙니다. 필드는 id와 member(또는 memberId)만 다뤘고, 반대 방향(Member가 주문 목록을 가지는 양방향), 연관관계의 주인, 지연 로딩, 상대가 없는 경우(optional), cascade는 다루지 않았습니다. 이 실습의 연관관계는 Order에서 Member 쪽으로만 가리키는 단방향입니다. MySQL에서의 실행 대조는 하지 않았습니다.',
});

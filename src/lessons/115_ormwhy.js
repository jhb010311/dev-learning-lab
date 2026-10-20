Lab.register({
  id: 'ormwhy', nav: 'JPA가 푸는 문제', cat: 'JPA', mode: 'step',
  title: 'SQL을 직접 쓰면 무엇을 손으로 채워야 하나',
  why: 'JDBC로 직접 다루면 조회한 행의 컬럼을 하나씩 꺼내 객체의 필드에 옮기고, 이어진 객체는 SQL을 더 써서 채우고, 필드가 하나 늘면 그 필드가 지나가는 SQL을 모두 찾아 고쳐야 했다. JPA는 클래스와 테이블의 대응을 한 번 적어 두면 이 옮기는 코드와 SQL을 대신 만들고, 한 트랜잭션에서는 같은 행을 같은 객체로 돌려준다.',
  use: '스프링으로 만드는 웹 서비스에서는 Spring Data JPA로 엔티티를 저장하고 조회하는 방식이 흔하다. 회원, 주문, 게시글처럼 객체 하나를 읽어 고치고 저장하는 일이 많은 곳에 잘 맞는다. 여러 테이블을 묶는 통계나 대량 수정처럼 SQL의 모양이 중요한 일은 JdbcTemplate이나 MyBatis처럼 SQL을 직접 쓰는 도구와 함께 쓴다.',
  intro: '자바 객체는 참조로 서로 이어지고, 테이블의 행은 번호(외래 키)로 이어집니다. 모양이 다르므로 테이블의 행을 객체로 옮겨 담는 코드를 누군가는 써야 합니다.',
  terms: ['ORM', 'JDBC', '객체와 테이블의 불일치', 'JPA, Hibernate, Spring Data JPA', '1차 캐시'],
  controls: [
    { id: 'sc', label: '해 볼 일', type: 'select', value: 'nav', options: [['same', '같은 주문을 두 번 조회'], ['nav', '주문에서 회원으로 넘어가기'], ['field', '회원에 필드(grade) 하나 추가']] },
    { id: 'how', label: 'DB를 다루는 방식', type: 'select', value: 'jdbc', options: [['jdbc', 'JDBC: SQL을 직접 쓴다'], ['jpa', 'JPA: 매핑만 적는다']] },
    { id: 'fix', label: '빠진 부분을 코드로 직접 채웠다', type: 'check', value: false, show: function (c) { return c.how === 'jdbc'; }, hint: '두 번 조회: 읽은 객체를 보관하는 코드. 회원으로 넘어가기: 회원을 읽는 SQL. 필드 추가: SQL과 값을 옮겨 담는 코드 수정.' },
  ],
  presets: [
    { t: '처음 설정으로', q: '주문에서 회원으로 넘어가려는데 JDBC로 주문을 읽는 SQL만 직접 쓰면 어떻게 되나', d: 'JDBC로 주문을 읽었는데 order.getMember()가 null입니다.', v: { sc: 'nav', how: 'jdbc', fix: false } },
    { t: '회원을 읽는 SQL을 직접 더 쓰면', q: 'JDBC에서 회원을 읽는 SQL을 직접 더 써서 빠진 부분을 채우면', d: '되기는 합니다. SQL과 옮겨 담는 코드가 두 배가 됩니다.', v: { sc: 'nav', how: 'jdbc', fix: true } },
    { t: 'JPA로 회원 쪽으로 넘어가기', q: 'DB를 다루는 방식을 JPA로 바꿔 매핑만 적으면', d: 'SQL을 쓰지 않았는데 회원 이름이 나옵니다.', v: { sc: 'nav', how: 'jpa', fix: false } },
    { t: '두 번 조회: JDBC', q: 'JDBC로 같은 주문을 두 번 조회하면', d: '같은 행인데 서로 다른 객체가 둘 생깁니다.', v: { sc: 'same', how: 'jdbc', fix: false } },
    { t: '두 번 조회: JPA', q: 'JPA로 같은 주문을 두 번 조회하면', d: 'SELECT는 한 번, 객체도 하나입니다.', v: { sc: 'same', how: 'jpa', fix: false } },
    { t: '필드 추가: SQL은 그대로', q: 'JDBC에서 회원에 필드 grade를 하나 추가하고 SQL은 그대로 두면', d: 'VIP로 저장했는데 오류 없이 사라집니다.', v: { sc: 'field', how: 'jdbc', fix: false } },
    { t: '필드 추가: JPA', q: 'JPA에서 회원에 필드 grade를 하나 추가하면', d: '엔티티에 한 줄만 추가하면 됩니다.', v: { sc: 'field', how: 'jpa', fix: false } },
  ],
  code: function (c) {
    var jdbc = c.how === 'jdbc', fix = jdbc && c.fix;
    if (c.sc === 'same') {
      if (!jdbc) return '@Entity\n@Table(name = "orders")\nclass Order {\n    @Id Long id;\n    int amount;\n}\n\n// 트랜잭션 안에서 실행 (메서드 선언과 em을 얻는 코드는 생략). SQL은 한 줄도 쓰지 않았다\nOrder a = em.find(Order.class, 1L);\nOrder b = em.find(Order.class, 1L);\nSystem.out.println(a == b);';
      return 'class Order {\n    Long id;\n    int amount;\n    void setId(Long id) { this.id = id; }\n    void setAmount(int amount) { this.amount = amount; }\n}\n\nclass OrderDao {\n    Connection conn;\n' + (fix ? '    Map<Long, Order> loaded = new HashMap<>();   // 읽은 객체를 보관한다 (직접 넣은 코드)\n' : '') + '\n    Order findById(long id) throws SQLException {\n' + (fix ? '        if (loaded.containsKey(id)) return loaded.get(id);   // 직접 넣은 코드\n' : '') +
        '        PreparedStatement ps = conn.prepareStatement(\n            "select id, amount from orders where id = ?");\n        ps.setLong(1, id);\n        ResultSet rs = ps.executeQuery();\n        rs.next();\n        Order o = new Order();               // 부를 때마다 새 객체를 만든다\n        o.setId(rs.getLong("id"));\n        o.setAmount(rs.getInt("amount"));\n' + (fix ? '        loaded.put(id, o);                   // 직접 넣은 코드\n' : '') + '        return o;\n    }\n}\n\n// 메서드 안의 줄만 보임 (메서드 선언과 orderDao를 얻는 코드는 생략)\nOrder a = orderDao.findById(1L);\nOrder b = orderDao.findById(1L);\nSystem.out.println(a == b);';
    }
    if (c.sc === 'nav') {
      if (!jdbc) return '@Entity\n@Table(name = "orders")\nclass Order {\n    @Id Long id;\n    int amount;\n    @ManyToOne(fetch = FetchType.LAZY)   // member_id 컬럼과 회원 객체를 이어 준다\n    Member member;\n    public Member getMember() { return member; }\n}\n\n@Entity\nclass Member {\n    @Id Long id;\n    String name;\n    public String getName() { return name; }\n}\n\n// 트랜잭션 안에서 실행 (메서드 선언과 em을 얻는 코드는 생략). SQL은 한 줄도 쓰지 않았다\nOrder order = em.find(Order.class, 1L);\nSystem.out.println(order.getMember().getName());';
      return 'class Order {\n    Long id;\n    int amount;\n    Member member;        // 객체에서는 회원 객체를 바로 가리키고 싶다\n    void setId(Long id) { this.id = id; }\n    void setAmount(int amount) { this.amount = amount; }\n    void setMember(Member member) { this.member = member; }\n    Member getMember() { return member; }\n}\n\nclass Member {\n    Long id;\n    String name;\n    void setId(Long id) { this.id = id; }\n    void setName(String name) { this.name = name; }\n    String getName() { return name; }\n}\n\nclass OrderDao {\n    Connection conn;\n\n    Order findById(long id) throws SQLException {\n        PreparedStatement ps = conn.prepareStatement(\n            "select id, amount, member_id from orders where id = ?");\n        ps.setLong(1, id);\n        ResultSet rs = ps.executeQuery();\n        rs.next();\n        Order o = new Order();\n        o.setId(rs.getLong("id"));\n        o.setAmount(rs.getInt("amount"));\n        long memberId = rs.getLong("member_id");   // 테이블에는 회원 번호만 있다\n' +
        (fix ? '        PreparedStatement ps2 = conn.prepareStatement(\n            "select id, name from member where id = ?");   // 직접 더 쓴 SQL\n        ps2.setLong(1, memberId);\n        ResultSet rs2 = ps2.executeQuery();\n        rs2.next();\n        Member m = new Member();\n        m.setId(rs2.getLong("id"));\n        m.setName(rs2.getString("name"));\n        o.setMember(m);                            // 번호를 객체로 바꿔 이어 준다\n' : '        // 회원 객체를 만들어 넣는 코드가 없다. o.member는 null로 남는다\n') +
        '        return o;\n    }\n}\n\n// 메서드 안의 줄만 보임 (메서드 선언과 orderDao를 얻는 코드는 생략)\nOrder order = orderDao.findById(1L);\nSystem.out.println(order.getMember().getName());';
    }
    var use = '\n\nMember m = new Member();\nm.setId(2L);\nm.setName("이영희");\nm.setGrade("VIP");\n';
    if (!jdbc) return '@Entity\nclass Member {\n    @Id Long id;\n    String name;\n    String grade;         // 새로 추가한 필드. 고친 곳은 이 한 줄이다\n    // 게터와 세터(setId, setGrade, getGrade 등)는 줄였다. JDBC 쪽에도 똑같이 있다\n}\n\n// 메서드 안의 줄만 보임 (메서드 선언과 em·emf를 얻는 코드는 생략)' + use.slice(1) + 'em.persist(m);\nem.getTransaction().commit();\nem.close();\n\nEntityManager em2 = emf.createEntityManager();   // 새 em으로 DB에서 다시 읽는다\nMember r = em2.find(Member.class, 2L);\nSystem.out.println(r.getGrade());';
    return 'class Member {\n    Long id;\n    String name;\n    String grade;         // 새로 추가한 필드 (테이블에도 grade 컬럼을 추가했다)\n    // 게터와 세터(setId, setGrade, getGrade 등)는 줄였다. JPA 쪽에도 똑같이 있다\n}\n\nclass MemberDao {\n    Connection conn;\n\n    void save(Member m) throws SQLException {\n        PreparedStatement ps = conn.prepareStatement(\n' +
      (fix ? '            "insert into member (id, name, grade) values (?, ?, ?)");   // 고친 곳 1\n' : '            "insert into member (id, name) values (?, ?)");   // 필드를 추가하기 전 그대로\n') + '        ps.setLong(1, m.getId());\n        ps.setString(2, m.getName());\n' + (fix ? '        ps.setString(3, m.getGrade());                                  // 고친 곳 2\n' : '') + '        ps.executeUpdate();\n    }\n\n    Member findById(long id) throws SQLException {\n        PreparedStatement ps = conn.prepareStatement(\n' +
      (fix ? '            "select id, name, grade from member where id = ?");         // 고친 곳 3\n' : '            "select id, name from member where id = ?");      // 필드를 추가하기 전 그대로\n') + '        ps.setLong(1, id);\n        ResultSet rs = ps.executeQuery();\n        rs.next();\n        Member m = new Member();\n        m.setId(rs.getLong("id"));\n        m.setName(rs.getString("name"));\n' + (fix ? '        m.setGrade(rs.getString("grade"));                              // 고친 곳 4\n' : '') + '        return m;\n    }\n}\n\n// 메서드 안의 줄만 보임 (메서드 선언과 memberDao를 얻는 코드는 생략)' + use.slice(1) + 'memberDao.save(m);\nMember r = memberDao.findById(2L);\nSystem.out.println(r.getGrade());';
  },
  label: function (c) { return { same: '두 번 조회', nav: '회원으로 넘어가기', field: '필드 추가' }[c.sc] + ' · ' + (c.how === 'jpa' ? 'JPA' : 'JDBC' + (c.fix ? ' (직접 채움)' : '')); },
  columns: ['코드에 직접 쓴 SQL', 'DB로 나간 SQL', '확인한 것', '결과'],
  simulate: function (c) {
    var jdbc = c.how === 'jdbc', fix = jdbc && !!c.fix, ev = [], sum = [], trace = [], written = 0;
    var st = { objs: [], refs: [], sent: [], rows: [{ id: 'o1', t: 'orders 1번 행', r: 'member_id = 1' }, { id: 'm1', t: 'member 1번 행', r: 'name = 김철수' }], flow: null, res: '?' };
    var by = jdbc ? '직접 쓴 SQL' : 'JPA가 만든 SQL';
    function push(s, k) { ev.push({ s: s, k: k, snap: JSON.parse(JSON.stringify(st)) }); st.flow = null; }
    function line(key) { trace.push([key, []]); }
    // kind: 'select orders'처럼 SQL의 종류와 테이블. text는 화면에 보일 SQL
    function send(kind, text) { trace[trace.length - 1][1].push(kind); st.sent.push({ sql: text, by: by }); st.flow = { label: kind.split(' ')[0].toUpperCase() + ' (' + (jdbc ? '직접 씀' : 'JPA가 만듦') + ')', to: kind.split(' ')[1] === 'orders' ? 'o1' : c.sc === 'field' ? 'm2' : 'm1', write: kind.indexOf('insert') === 0 }; }
    var check, res;
    if (c.sc === 'same') {
      check = 'a == b'; written = jdbc ? 1 : 0;
      line('find1'); send('select orders', 'select ... from orders where id = 1'); st.objs.push({ id: 'a', t: 'a → Order 객체', s: 'id 1 · amount 30000', cls: 'wait' });
      if (jdbc) push('orderDao.findById(1L) 첫 번째: ' + (fix ? '보관해 둔 객체가 없으므로 ' : '') + '직접 쓴 SELECT를 보내 orders의 1번 행을 읽습니다. 읽은 값을 new Order()로 만든 객체에 하나씩 옮겨 담아 a로 돌려줍니다.' + (fix ? ' 돌려주기 전에 loaded라는 Map에도 넣어 둡니다.' : ''), '');
      else push('em.find(Order.class, 1L) 첫 번째: JPA가 SELECT를 만들어 보내고, 읽은 행으로 Order 객체를 만들어 a로 돌려줍니다. 이 객체는 영속성 컨텍스트(1차 캐시)에도 보관됩니다.', '');
      line('find2');
      if (jdbc && !fix) {
        send('select orders', 'select ... from orders where id = 1'); st.objs.push({ id: 'b', t: 'b → 또 다른 Order 객체', s: 'id 1 · amount 30000', cls: 'bad' });
        push('orderDao.findById(1L) 두 번째: 같은 SELECT가 한 번 더 나갑니다. findById는 부를 때마다 new Order()를 하므로, 같은 행에서 또 하나의 객체 b가 만들어집니다.', 'bad');
      } else {
        st.objs[0].t = 'a, b → 같은 Order 객체'; st.objs[0].cls = 'good';
        push(jdbc ? 'orderDao.findById(1L) 두 번째: loaded에 1번 주문이 있으므로 SQL을 보내지 않고 보관해 둔 객체를 그대로 돌려줍니다. 직접 넣은 코드가 한 일입니다.' : 'em.find(Order.class, 1L) 두 번째: 1번 주문이 영속성 컨텍스트에 이미 있습니다. SQL을 보내지 않고 보관 중인 객체를 그대로 돌려줍니다.', 'good');
      }
      res = String(!(jdbc && !fix)); st.res = res;
      push('a == b: ' + res + '입니다. ' + (res === 'true' ? 'a와 b는 메모리의 같은 객체를 가리킵니다. a의 금액을 바꾸면 b로 읽어도 바뀐 값이 보입니다.' : '둘 다 1번 주문인데 메모리에는 객체가 따로 있습니다. a의 금액을 바꿔도 b에는 예전 값이 남아, 어느 쪽이 맞는 값인지 코드가 스스로 챙겨야 합니다.'), res === 'true' ? 'good' : 'bad');
      if (jdbc && !fix) sum.push('테이블에서는 기본 키가 같으면 같은 행입니다. 객체는 new를 할 때마다 다른 객체입니다. 행을 객체로 옮겨 담는 코드를 직접 쓰면 이 차이가 그대로 드러납니다.');
      if (fix) sum.push('읽은 객체를 Map에 보관하는 코드를 직접 넣어 JPA와 같은 결과를 만들었습니다. 다만 이 Map을 언제 비울지, 다른 테이블의 DAO에도 똑같이 넣을지를 모두 직접 정하고 관리해야 합니다.');
      if (!jdbc) sum.push('JPA는 한 영속성 컨텍스트 안에서 같은 기본 키의 엔티티를 항상 같은 객체로 돌려줍니다. JDBC에서는 직접 만들어야 했던 보관 장소를 JPA가 가지고 있는 셈입니다.');
    }
    if (c.sc === 'nav') {
      check = 'order.getMember().getName()'; written = jdbc ? (fix ? 2 : 1) : 0;
      line('find'); send('select orders', 'select ... from orders where id = 1');
      st.objs.push({ id: 'a', t: 'order → Order 객체', s: jdbc ? 'member: null' : 'member → 회원 1 (아직 읽지 않음)', cls: 'wait' });
      if (jdbc) push('orderDao.findById(1L): 직접 쓴 SELECT로 orders의 1번 행을 읽어 id와 amount를 객체에 옮겨 담습니다. 행에는 회원의 번호(member_id = 1)만 있고 회원의 이름은 없습니다.' + (fix ? '' : ' 회원 객체를 만들어 넣는 코드가 없으므로 order의 member 필드는 null로 남습니다.'), fix ? '' : 'bad');
      else push('em.find(Order.class, 1L): JPA가 SELECT를 만들어 orders의 1번 행을 읽습니다. 지연 로딩(LAZY)이므로 회원은 아직 읽지 않고, member 필드가 "1번 회원"을 대신하는 빈 객체(프록시)를 가리키게 해 둡니다.', '');
      if (fix) {
        send('select member', 'select id, name from member where id = 1'); st.objs[0].s = 'member → Member 객체'; st.objs.push({ id: 'b', t: 'Member 객체', s: 'id 1 · name 김철수', cls: 'wait' }); st.refs.push(['a', 'b']);
        push('같은 findById 안에서: 직접 더 쓴 두 번째 SELECT로 member의 1번 행을 읽습니다. new Member()에 값을 옮겨 담고 o.setMember(m)으로 주문 객체에 이어 줍니다. 번호를 객체 참조로 바꾸는 일을 코드가 직접 했습니다.', '');
      }
      line('name');
      if (jdbc && !fix) {
        res = 'NullPointerException'; st.res = res;
        push('order.getMember().getName(): getMember()가 null을 돌려줍니다. null에 getName()을 불렀으므로 NullPointerException이 납니다.', 'bad');
        sum.push('객체는 order.getMember()처럼 참조를 따라 넘어가고, 테이블은 member_id 같은 번호로 이어집니다. SQL을 직접 쓰는 방식에서는 SQL로 읽어 온 만큼만 객체가 채워집니다. 회원까지 쓰려면 회원을 읽는 SQL과 옮겨 담는 코드를 더 써야 합니다.');
      } else {
        if (!jdbc) { send('select member', 'select ... from member where id = 1'); st.objs[0].s = 'member → Member 객체'; st.objs.push({ id: 'b', t: 'Member 객체', s: 'id 1 · name 김철수', cls: 'good' }); st.refs.push(['a', 'b']); }
        res = '김철수'; st.res = res;
        push(jdbc ? 'order.getMember().getName(): findById가 회원 객체를 이미 채워 두었으므로 "김철수"가 나옵니다. 이 줄에서는 SQL이 나가지 않습니다.' : 'order.getMember().getName(): 이름이 필요해진 이 순간에 JPA가 member를 읽는 SELECT를 만들어 보내고, 빈 객체를 채웁니다. "김철수"가 나옵니다.', 'good');
        if (jdbc) sum.push('SQL 하나와 옮겨 담는 코드를 더 써서 해결했습니다. 그런데 이제 findById는 회원이 필요 없는 화면에서도 항상 SELECT를 두 번 보냅니다. 회원을 읽을지 말지에 따라 메서드를 따로 만들게 되고, 연관된 객체가 늘어날수록 이런 코드가 불어납니다.');
        else sum.push('@ManyToOne 한 줄로 "member_id 컬럼이 Member 객체와 이어진다"고 알려 주었을 뿐인데, 참조를 따라가면 JPA가 필요한 SQL을 만들어 보냅니다. 외래 키(번호)와 객체 참조 사이의 변환을 JPA가 맡습니다.', 'SQL이 사라진 것은 아닙니다. 눈에 보이지 않게 나갈 뿐이므로, 주문 여러 건의 회원을 차례로 꺼내면 SELECT가 그만큼 나갑니다(N+1 실습에서 다룹니다).');
      }
    }
    if (c.sc === 'field') {
      check = '다시 읽은 grade'; written = jdbc ? 2 : 0;
      var saved = !jdbc || fix;
      st.objs.push({ id: 'a', t: 'm → Member 객체', s: 'id 2 · 이영희 · grade VIP', cls: 'wait' });
      push('new Member()와 setter들: 메모리에 회원 객체 m을 만들었습니다. 새로 추가한 필드 grade에 "VIP"를 넣었습니다. 아직 DB와는 아무 일도 없습니다.', '');
      if (jdbc) {
        line('save'); send('insert member', fix ? "insert into member (id, name, grade) values (2, '이영희', 'VIP')" : "insert into member (id, name) values (2, '이영희')");
        st.rows.push({ id: 'm2', t: 'member 2번 행', r: 'grade = ' + (fix ? 'VIP' : 'NULL'), cls: fix ? 'good' : 'bad' });
        push('memberDao.save(m): ' + (fix ? '고친 INSERT가 grade까지 보냅니다. SQL 문장과 ps.setString(3, ...) 두 곳을 고쳤기 때문입니다.' : 'INSERT 문은 필드를 추가하기 전에 쓴 그대로라서 id와 name만 보냅니다. 객체의 grade 값 "VIP"는 DB로 가지 못하고, grade 컬럼은 NULL이 됩니다. 오류는 나지 않습니다.'), fix ? '' : 'bad');
        line('read'); send('select member', fix ? 'select id, name, grade from member where id = 2' : 'select id, name from member where id = 2');
        st.objs.push({ id: 'b', t: 'r → 다시 읽은 Member 객체', s: 'id 2 · 이영희 · grade ' + (fix ? 'VIP' : 'null'), cls: fix ? 'good' : 'bad' });
        push('memberDao.findById(2L): ' + (fix ? '고친 SELECT가 grade 컬럼도 읽고, m.setGrade(...)로 객체에 옮겨 담습니다.' : 'SELECT 문도 예전 그대로라서 id와 name만 읽습니다. 새 객체 r의 grade는 아무도 채우지 않아 null입니다.'), fix ? '' : 'bad');
      } else {
        line('persist');
        push('em.persist(m): m을 영속성 컨텍스트에 맡깁니다. 이 줄에서는 SQL이 나가지 않습니다.', '');
        line('commit'); send('insert member', "insert into member (grade, name, id) values ('VIP', '이영희', 2)"); st.rows.push({ id: 'm2', t: 'member 2번 행', r: 'grade = VIP', cls: 'good' });
        push('commit: JPA가 Member 엔티티의 필드 목록을 보고 INSERT를 만들어 보냅니다. grade 필드를 추가했으므로 INSERT에도 grade가 들어 있습니다.', '');
        line('read'); send('select member', 'select id, grade, name from member where id = 2'); st.objs.push({ id: 'b', t: 'r → 다시 읽은 Member 객체', s: 'id 2 · 이영희 · grade VIP', cls: 'good' });
        push('em2.find(Member.class, 2L): 새 EntityManager로 DB에서 다시 읽습니다. JPA가 만든 SELECT에도 grade가 들어 있고, 읽은 값이 객체의 grade 필드에 채워집니다.', '');
      }
      res = saved ? 'VIP' : 'null (DB에도 NULL)'; st.res = saved ? 'VIP' : 'null';
      push('r.getGrade(): ' + (saved ? '"VIP"가 나옵니다.' : 'null이 나옵니다. 저장할 때 넣은 "VIP"는 어디에도 남지 않았습니다.'), saved ? 'good' : 'bad');
      if (jdbc && !fix) sum.push('클래스에 필드를 추가해도 SQL은 저절로 바뀌지 않습니다. 고치지 않은 SQL은 오류 없이 그 필드를 빼고 동작하므로, 값이 조용히 사라집니다. 테스트로 확인하지 않으면 알아차리기 어렵습니다.');
      if (fix) sum.push('필드 한 줄을 추가하면서 INSERT 문, 값을 넣는 줄, SELECT 문, 값을 읽는 줄까지 네 곳을 더 고쳤습니다. UPDATE 문이나 다른 조회 메서드가 있다면 그만큼 고칠 곳이 늘어납니다. 하나라도 빠뜨리면 "빠진 부분을 코드로 직접 채웠다"를 끈 경우처럼 값이 사라집니다.');
      if (!jdbc) sum.push('JPA는 엔티티의 필드 목록을 보고 INSERT와 SELECT를 만듭니다. 그래서 필드를 추가하면 SQL에도 저절로 들어갑니다. 고칠 곳이 엔티티 한 줄로 줄어듭니다.', '테이블에 grade 컬럼을 추가하는 일은 어느 방식에서든 따로 해야 합니다.');
    }
    var cnt = {}, order = [];
    trace.forEach(function (t) { t[1].forEach(function (k) { var w = k.split(' ')[0].toUpperCase(); if (!cnt[w]) { cnt[w] = 0; order.push(w); } cnt[w]++; }); });
    var sentText = order.map(function (w) { return w + ' ' + cnt[w] + '번'; }).join(', ');
    return { events: ev, summary: sum, written: written, trace: trace.map(function (t) { return t[0] + ':' + t[1].join(','); }).join('; '), row: [written + '개', sentText, check, res] };
  },
  render: function (v, sim, t, H, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : null;
    if (!s) { H.text(v, '실행을 누르면 한 줄씩 진행합니다.'); return; }
    if (s.sent.length) H.table(v, ['#', 'SQL', '누가 썼나'], s.sent.map(function (q, i) { return { cells: [String(i + 1), { v: q.sql, cls: i === s.sent.length - 1 && s.flow ? 'hot' : '' }, q.by] }; }), 'DB로 나간 SQL');
    else { H.title(v, 'DB로 나간 SQL'); H.text(v, '아직 없습니다.'); }
  },
  // 그림: 왼쪽에 메모리의 자바 객체, 오른쪽에 DB 테이블의 행. SQL이 나간 단계에만 가운데 화살표가 생기고, 누가 쓴 SQL인지 적힌다.
  draw: function (P, sim, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : { objs: [], refs: [], sent: [], rows: [{ id: 'o1', t: 'orders 1번 행', r: 'member_id = 1' }, { id: 'm1', t: 'member 1번 행', r: 'name = 김철수' }], flow: null, res: '?' };
    P.size(680, 300);
    P.region('heap', 16, 16, 284, 200, '메모리의 자바 객체');
    P.region('db', 444, 16, 220, 200, 'DB의 테이블');
    if (!s.objs.length) P.box('none', 28, 52, 260, 50, { cls: 'ghost', sub: '아직 객체가 없음', center: true });
    s.objs.forEach(function (o, i) { P.box('obj_' + o.id, 28, 52 + i * 90, 260, 50, { cls: o.cls, title: o.t, sub: o.s }); });
    s.refs.forEach(function (r, i) { P.arrow('ref' + i, 'obj_' + r[0] + ':b', 'obj_' + r[1] + ':t', { cls: 'good', label: '참조' }); });
    s.rows.forEach(function (r, i) { P.box('row_' + r.id, 456, 52 + i * 52, 196, 40, { cls: r.cls || 'plain', title: r.t, sub: r.r }); });
    if (s.flow) P.arrow('sql', s.flow.write ? 'heap:r' : 'row_' + s.flow.to + ':l', s.flow.write ? 'row_' + s.flow.to + ':l' : 'heap:r', { cls: 'hot', label: s.flow.label });
    P.box('r1', 16, 236, 210, 40, { cls: sim.written ? 'hot' : 'good', title: '코드에 직접 쓴 SQL', right: sim.written + '개' });
    P.box('r2', 234, 236, 430, 40, { cls: s.res === '?' ? 'ghost' : /^(false|null|NullPointerException)$/.test(s.res) ? 'bad' : 'good', title: sim.row[2], right: s.res });
    P.note('가운데 화살표는 이번 단계에서 SQL로 주고받은 방향입니다(INSERT는 DB로, SELECT 결과는 메모리로). 그 SQL을 누가 썼는지가 함께 적힙니다.');
  },
  assume: '열두 가지 조합을 실제로 실행해 대조했습니다(JDBC 쪽은 화면과 같은 구조의 DAO 코드를 H2 데이터베이스에, JPA 쪽은 Hibernate 7.4.5와 H2에 실행). 대조한 것은 코드에 적은 SQL 문장의 수, 줄마다 나간 SQL의 종류와 테이블, a == b의 값, 회원 이름 또는 예외, 다시 읽은 grade와 DB에 남은 grade입니다. "직접 채웠다"는 설정은 JDBC에서만 뜻이 있고, JPA에서는 결과에 영향이 없습니다. 화면의 SQL 문장은 읽기 쉽게 줄여 적은 것이며, Hibernate가 실제로 만드는 문장은 컬럼 순서와 별칭이 다릅니다. JPA의 @ManyToOne은 지연 로딩(LAZY)으로 두었습니다. 기본값인 즉시 로딩(EAGER)이면 em.find 한 번에 주문과 회원을 함께 읽습니다. JDBC 쪽의 코드 양은 이 예제의 DAO를 기준으로 한 것입니다. 스프링의 JdbcTemplate이나 MyBatis를 쓰면 반복되는 코드는 줄지만, SQL을 직접 쓰고 필드가 바뀔 때 SQL을 함께 고쳐야 한다는 점은 같습니다. "고친 곳 네 곳"은 화면의 코드에서 센 것입니다.',
});

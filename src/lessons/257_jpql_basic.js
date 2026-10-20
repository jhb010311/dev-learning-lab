Lab.register({
  id: 'jpql_basic', nav: 'JPQL', cat: '기초개념', mode: 'step', basic: true, deep: ['fetchjoin', 'bulk', 'dynquery'],
  title: 'JPQL은 무엇이고, SQL과 무엇이 다른가',
  why: 'SQL을 글자로 직접 쓰면 테이블과 열 이름이 코드 곳곳에 퍼지고, 돌아온 행을 객체로 옮기는 일도 손으로 해야 한다. JPQL은 자바 코드에서 쓰는 엔티티 클래스와 필드 이름으로 조건을 적게 하고, SQL로 바꾸는 일과 결과를 엔티티 객체로 만드는 일은 JPA가 맡는다.',
  use: '조건에 맞는 목록 찾기, 정렬, 개수 세기처럼 번호 하나로 한 건을 찾는 것 말고 다른 조회에 쓴다. 스프링 데이터 JPA에서는 리포지토리 메서드 위의 @Query 애너테이션에 JPQL을 적는다. 특정 DB에만 있는 기능이 꼭 필요하면 @Query에 nativeQuery = true를 붙여 SQL을 직접 적는다.',
  intro: 'em.find는 기본 키 하나로 엔티티 하나만 찾습니다. 나이가 20 이상인 회원 모두처럼 조건으로 여럿을 찾으려면 쿼리(DB에 묻는 글)를 써야 하고, JPA에서는 그 쿼리를 JPQL이라는 글로 적습니다. JPQL은 SQL과 모양이 비슷하지만 테이블과 열이 아니라 엔티티 클래스와 필드의 이름으로 씁니다. 화면의 Member 클래스는 @Table로 member_tbl 테이블과, @Column으로 name 필드와 user_name 열과 짝이 되어 있어서 두 이름이 다릅니다. 코드의 jpql 변수에 담은 글을 em.createQuery가 JPA에 넘기면 JPA가 그 글을 읽고, query.getResultList()를 부르면 JPA가 JPQL을 SQL로 바꿔 DB에 보내고, 돌아온 행을 Member 객체로 만들어 list에 담습니다. 이 실습은 JPQL에 적는 이름을 엔티티 이름에서 테이블 이름, 열 이름으로 바꿔 가며 같은 코드를 실행해, DB에 나간 SQL과 list에 돌아온 것, 그리고 오류를 봅니다.',
  terms: ['JPQL', 'em.createQuery와 getResultList', '엔티티 이름과 필드 이름', '@Table'],
  controls: [
    { id: 'q', label: 'jpql 변수에 담는 JPQL', type: 'select', value: 'ok', options: [
      ['ok', 'select m from Member m where m.age >= 20'],
      ['table', 'select m from member_tbl m where m.age >= 20 (테이블 이름을 씀)'],
      ['col', "select m from Member m where m.user_name = 'kim' (열 이름을 씀)"],
      ['field', "select m from Member m where m.name = 'kim' (필드 이름을 씀)"]] },
  ],
  // q는 물음 방식의 화면에 보이는 물음, t와 d는 글로만 읽는 본문에 쓰이는 이름과 설명
  presets: [
    { t: '처음 설정으로', q: 'JPQL은 어떻게 생겼고, 나이가 20 이상인 회원을 찾으면 DB에는 무엇이 나가고 무엇이 돌아오나', d: 'Member와 age를 쓴 JPQL. JPA가 SQL로 바꿔 DB에 보내고, 돌아온 행을 Member 객체 2개로 만들어 줍니다.', v: { q: 'ok' } },
    { t: '테이블 이름을 적으면', q: 'from 뒤에 엔티티 이름 Member 대신 테이블 이름(member_tbl)을 적으면', d: 'JPA가 member_tbl이라는 엔티티를 찾지 못해, createQuery 줄에서 오류가 납니다. DB에는 아무것도 나가지 않습니다.', v: { q: 'table' } },
    { t: '열 이름을 적으면', q: "조건에 필드 이름 대신 열 이름(user_name)을 적으면", d: 'Member에 user_name이라는 필드가 없어서, createQuery 줄에서 오류가 납니다.', v: { q: 'col' } },
    { t: '필드 이름을 적으면', q: "조건에 열 이름 대신 필드 이름(name)을 적으면", d: 'JPA가 name 필드를 user_name 열로 바꿔 SQL을 만듭니다. 조건에 맞는 kim 한 명이 Member 객체로 돌아옵니다.', v: { q: 'field' } },
  ],
  // 화면의 코드와 대조 프로그램(verify/spring/src/JpqlBasicProbe.java)이 컴파일해 실행한 소스는 같은 글이다(대조 스크립트가 글자까지 비교한다).
  code: function (c) {
    var j = { ok: 'select m from Member m where m.age >= 20', table: 'select m from member_tbl m where m.age >= 20', col: "select m from Member m where m.user_name = 'kim'", field: "select m from Member m where m.name = 'kim'" }[c.q];
    return ['@Entity', '// 테이블: Member 클래스 하나가 member_tbl 테이블 하나와 짝이 된다', '@Table(name = "member_tbl")', 'public class Member {', '    @Id', '    private Long id;', '',
      '    // 열: name 필드는 user_name 열과 짝이 된다', '    @Column(name = "user_name")', '    private String name;', '', '    private int age;', '}', '',
      '// 조회하는 쪽: 메서드 안의 줄만 보임 (em 선언, 클래스·메서드 선언과 import는 생략)', '// JPQL: JPA가 읽는 쿼리 글', 'String jpql = "' + j + '";', 'TypedQuery<Member> query = em.createQuery(jpql, Member.class);', 'List<Member> list = query.getResultList();'].join('\n');
  },
  label: function (c) { return { ok: 'Member, m.age (엔티티와 필드 이름)', table: 'member_tbl (테이블 이름)', col: 'm.user_name (열 이름)', field: 'm.name (필드 이름)' }[c.q]; },
  columns: ['DB에 나간 SQL', '돌아온 것', '오류'],
  // 이 설정에서 실제 실행으로 얻은 값(Hibernate 7.4.5, H2): 나간 SQL, 돌아온 회원, 오류의 종류와 메시지 앞부분
  facts: {
    ok: { sql: 'select m1_0.id,m1_0.age,m1_0.user_name from member_tbl m1_0 where m1_0.age>=20', got: ['kim', 'park'] },
    field: { sql: "select m1_0.id,m1_0.age,m1_0.user_name from member_tbl m1_0 where m1_0.user_name='kim'", got: ['kim'] },
    table: { ex: 'UnknownEntityException', msg: "Could not resolve root entity 'member_tbl'" },
    col: { ex: 'UnknownPathException', msg: "Could not resolve attribute 'user_name' of 'Member'" },
  },
  simulate: function (c) {
    var q = c.q, f = this.facts[q], ev = [], sum = [], bad = q === 'table' || q === 'col';
    var rows = [{ id: 1, n: 'kim', a: 25 }, { id: 2, n: 'lee', a: 17 }, { id: 3, n: 'park', a: 30 }];
    var jtext = { ok: 'select m from Member m where m.age >= 20', table: 'select m from member_tbl m where m.age >= 20', col: "select m from Member m where m.user_name = 'kim'", field: "select m from Member m where m.name = 'kim'" }[q];
    // 상태: cur는 지금 실행 중인 줄(l1~l3), done은 실행을 마친 줄, jl은 JPA 상자의 글, jc는 그 색, sent는 SQL이 나갔는가, back은 돌아온 행의 id, nsql은 나간 SQL 수, nobj는 list에 담긴 객체 수, err는 오류가 났는가
    var st = { cur: '', done: { l1: false, l2: false, l3: false }, jl: ['(Hibernate)', '대기 중'], jc: '', sent: false, back: [], nsql: 0, nobj: 0, err: false, madeq: false };
    function push(s, k) { ev.push({ s: s, k: k, snap: JSON.parse(JSON.stringify(st)) }); }

    // 0. 준비
    push('DB의 준비: 코드가 실행되기 전에 DB에는 member_tbl 테이블이 있고, 행이 세 개 들어 있습니다. (id 1, user_name kim, age 25), (id 2, user_name lee, age 17), (id 3, user_name park, age 30)입니다. 화면의 Member 클래스는 이 테이블과 짝이 됩니다. @Table이 테이블 이름 member_tbl을 정하고, @Column이 name 필드의 열 이름 user_name을 정합니다. 코드의 em은 EntityManager이고 JPA에 일을 시키는 객체입니다. em.find 메서드는 기본 키(id) 하나로 행 하나만 찾아 주므로, 나이가 20 이상인 회원 모두처럼 조건으로 여럿을 찾으려면 쿼리를 써야 합니다.', '');

    // 1. jpql 변수
    st.cur = 'l1'; st.done.l1 = true;
    var what = q === 'ok' ? '이 글에서 Member는 우리가 쓴 클래스의 이름이고 m.age는 그 클래스의 age 필드입니다.'
      : q === 'table' ? '이 글에서 from 뒤에는 클래스 이름 Member가 아니라 DB의 테이블 이름 member_tbl을 적었습니다.'
      : q === 'col' ? '이 글의 조건에는 Member 클래스의 필드 이름이 아니라 DB의 열 이름 user_name을 적었습니다.'
      : '이 글에서 Member는 우리가 쓴 클래스의 이름이고 m.name은 그 클래스의 name 필드입니다.';
    push('String jpql = "' + jtext + '": JPQL로 쓴 쿼리를 글자로 적어 jpql 변수에 담습니다. 아직 글자일 뿐이라서 JPA도 DB도 이 글을 읽지 않았고, SQL은 나가지 않았습니다. ' + what, '');

    // 2. createQuery
    st.cur = 'l2'; st.done.l2 = true;
    if (bad) {
      st.err = true; st.jc = 'bad'; st.jl = ['(Hibernate)', '글을 읽다가', '오류'];
      push('TypedQuery<Member> query = em.createQuery(jpql, Member.class): em이 jpql 글을 JPA에 넘기고, JPA가 글을 읽으면서 적힌 이름을 확인합니다. ' + (q === 'table'
        ? 'from 뒤의 member_tbl이 JPA가 아는 엔티티의 이름인지 찾아보는데, 그런 엔티티가 없습니다. 엔티티의 이름은 기본으로 클래스 이름이어서 Member이고, 테이블 이름 member_tbl은 JPQL이 알아보는 이름이 아닙니다.'
        : '조건의 m.user_name이 Member 클래스의 필드인지 찾아보는데, Member에는 user_name이라는 필드가 없습니다. user_name은 name 필드가 짝이 된 DB의 열 이름이고, 열 이름은 JPQL이 알아보는 이름이 아닙니다.')
        + ' IllegalArgumentException이 던져지고, 원인으로 붙은 ' + f.ex + '의 메시지는 ' + f.msg + '로 시작합니다. 오류는 SQL을 DB에 보내는 줄이 아니라 이 줄에서 났고, DB에는 아무것도 나가지 않았습니다.', 'bad');
      st.cur = '';
      push('예외가 던져져서 다음 줄 List<Member> list = query.getResultList()는 실행되지 않습니다. query 변수도 list 변수도 값이 담기지 않았고, 나간 SQL은 0번, list에 담긴 Member 객체는 0개입니다.', 'bad');
    } else {
      st.jc = 'hot'; st.jl = ['(Hibernate)', '글을 읽음', '이름을 확인'];
      st.madeq = true;
      push('TypedQuery<Member> query = em.createQuery(jpql, Member.class): em이 jpql 글을 JPA에 넘기고, JPA가 글을 읽으면서 적힌 이름을 확인합니다. Member는 JPA가 아는 엔티티의 이름이고(엔티티의 이름은 기본으로 클래스 이름입니다), ' + (q === 'ok' ? 'm.age는 그 엔티티의 필드입니다' : 'm.name은 그 엔티티의 필드입니다') + '. 이름이 모두 맞으므로 JPA가 쿼리 객체를 만들어 query에 담습니다. 이 줄까지 나간 SQL은 0번입니다. 쿼리 객체를 만든 것이지 아직 DB에 묻지 않았습니다.', '');

      // 3. getResultList: SQL이 나간다
      st.cur = 'l3'; st.done.l3 = true; st.sent = true; st.nsql = 1; st.jl = ['(Hibernate)', 'SQL로 바꿔', 'DB에 보냄']; st.jc = 'hot';
      push('List<Member> list = query.getResultList(): 이제 JPA가 JPQL을 SQL로 바꿔 DB에 보냅니다. 이 실행에서 Hibernate 7.4.5가 만들어 보낸 SQL은 "' + f.sql + '"입니다. JPQL의 Member가 테이블 이름 member_tbl로, ' + (q === 'ok' ? '조건의 m.age가 열 이름 age로' : '조건의 m.name이 열 이름 user_name으로') + ' 바뀌어 있습니다. 우리가 쓴 코드에는 이 SQL이 없고, JPQL을 SQL로 옮기는 일은 JPA가 했습니다. SQL의 글자는 Hibernate 버전에 따라 다를 수 있습니다.', '');

      // 4. 행이 객체가 되어 돌아온다
      var want = f.got, ids = rows.filter(function (r) { return want.indexOf(r.n) >= 0; }).map(function (r) { return r.id; });
      st.back = ids; st.nobj = ids.length; st.jl = ['(Hibernate)', '행을 Member', '객체로 만듦']; st.jc = 'good'; st.cur = '';
      push('DB가 조건에 맞는 행 ' + ids.length + '개(' + want.join(', ') + ')를 돌려주고, JPA가 행마다 Member 객체를 만들어 열의 값을 필드에 채웁니다. user_name 열의 값은 name 필드로 들어갑니다. 이 객체들이 list에 담겨 돌아옵니다. 돌아온 것은 행이 아니라 Member 클래스의 객체 ' + ids.length + '개이고, 이 실행에서 list에 담긴 객체의 클래스는 모두 Member였습니다.' + (q === 'ok' ? ' 나이가 17인 lee는 조건에 맞지 않아 돌아오지 않았습니다.' : ' 조건에 맞지 않는 lee와 park은 돌아오지 않았습니다.'), 'good');
    }

    // 요약: 첫 줄은 물음의 답
    if (q === 'ok') {
      sum.push('JPQL은 SQL과 모양이 비슷하지만 테이블과 열이 아니라 엔티티 클래스(Member)와 그 필드(age)의 이름으로 쓰는 쿼리입니다. JPA가 이 글을 SQL로 바꿔 DB에 보냈고, 돌아온 행 2개는 Member 객체 2개가 되어 list에 담겼습니다.');
      sum.push('em.find와 달리 조건으로 여러 개를 찾았습니다. 쿼리에 적은 Member는 SQL에서 member_tbl이 되었습니다. 쿼리에 적는 이름과 DB의 이름이 다를 수 있고, 둘을 이어 주는 것이 @Table과 @Column입니다.');
    } else if (q === 'table') {
      sum.push('JPQL에 테이블 이름 member_tbl을 적으면 JPA가 그런 이름의 엔티티를 찾지 못해 오류가 납니다. 오류는 DB에 묻는 줄이 아니라 쿼리를 만드는 createQuery 줄에서 났고, DB에는 SQL이 한 번도 나가지 않았습니다.');
      sum.push('JPQL의 from 뒤에는 테이블 이름이 아니라 엔티티 이름을 씁니다. 엔티티 이름은 기본으로 클래스 이름 Member입니다. SQL에서는 from member_tbl이 맞지만 JPQL에서는 틀립니다.');
    } else if (q === 'col') {
      sum.push('JPQL에 열 이름 user_name을 적으면 Member에 그런 필드가 없어서 오류가 납니다. 오류는 createQuery 줄에서 났고, DB에는 SQL이 한 번도 나가지 않았습니다.');
      sum.push('JPQL의 조건에는 열 이름이 아니라 필드 이름을 씁니다. user_name은 DB에서의 열 이름이고, 자바 클래스에서 부르는 이름은 name입니다. 둘이 다르면 SQL에서 맞는 이름이 JPQL에서는 틀립니다.');
    } else {
      sum.push('JPQL의 조건에 필드 이름 name을 쓰면 오류 없이 실행됩니다. JPA가 name 필드를 열 이름 user_name으로 바꿔 SQL을 만들어 DB에 보냈고, 돌아온 행 1개(kim)가 Member 객체 1개가 되어 list에 담겼습니다.');
      sum.push('앞에서 오류가 난 user_name과 달리 name은 Member 클래스의 필드 이름입니다. JPQL에는 자바 쪽의 이름을 쓰고, 열 이름으로 바꾸는 일은 JPA가 합니다.');
    }
    var row;
    if (bad) row = ['나가지 않음', '없음 (list를 만들지 못함)', 'createQuery 줄에서 IllegalArgumentException (' + (q === 'table' ? 'member_tbl이라는 엔티티를 찾지 못함' : 'Member에 user_name이라는 필드가 없음') + ')'];
    else row = [f.sql, 'Member 객체 ' + f.got.length + '개 (' + f.got.join(', ') + ')', '없음'];
    return { events: ev, summary: sum, row: row, rows: rows };
  },
  render: function (v, sim, t, H, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : null;
    if (!s) { H.text(v, '실행을 누르면 DB의 member_tbl 테이블에 행이 세 개 들어 있는 것부터 시작합니다.'); return; }
    H.table(v, ['JPQL에 적는 이름', 'SQL로 바뀐 이름'], [
      { cls: '', cells: ['Member (엔티티 이름)', 'member_tbl (테이블 이름)'] },
      { cls: '', cells: ['name (필드 이름)', 'user_name (열 이름)'] },
      { cls: '', cells: ['age (필드 이름)', 'age (열 이름)'] }], '이름의 짝');
    H.table(v, ['DB의 member_tbl', 'user_name', 'age', 'list로 돌아옴'], sim.rows.map(function (r) {
      var back = s.back.indexOf(r.id) >= 0;
      return { cls: '', cells: ['id ' + r.id, r.n, String(r.a), back ? { v: 'Member 객체', cls: 'good' } : (s.nobj || s.err ? { v: '돌아오지 않음', cls: '' } : '-')] };
    }), 'DB의 행');
    H.counters(v, [[s.nsql, '나간 SQL'], [s.nobj, 'list에 담긴 Member 객체']]);
  },
  // 그림: 왼쪽에 코드 세 줄(jpql 변수, createQuery, getResultList), 가운데에 JPA, 오른쪽에 DB의 행 세 개. 오류가 나면 JPA 앞에서 멈추고 DB 쪽 화살표가 생기지 않는다. SQL이 나가면 JPA에서 DB로, 돌아온 행에서 JPA로 화살표가 생긴다.
  draw: function (P, sim, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : null;
    P.size(680, 292);
    P.region('lc', 14, 12, 206, 218, '우리가 쓴 코드');
    P.region('rc', 460, 12, 206, 218, 'DB의 member_tbl 테이블');
    function line(id, y, title, sub) {
      var cur = s && s.cur === id, done = s && s.done[id], failed = s && s.err && id === 'l2';
      P.box(id, 24, y, 186, 54, { cls: cur ? (failed ? 'bad now' : 'hot now') : failed ? 'bad' : done ? 'good' : 'plain', title: title, sub: sub });
    }
    line('l1', 36, '1. JPQL 글', 'String jpql');
    line('l2', 96, '2. 쿼리 만들기', 'em.createQuery');
    line('l3', 156, '3. 쿼리 실행', 'query.getResultList');
    P.box('jpa', 280, 36, 140, 174, { cls: !s ? 'ghost' : s.jc || 'plain', title: 'JPA', sub: s ? s.jl : [' '] });
    sim.rows.forEach(function (r, i) {
      var back = s && s.back.indexOf(r.id) >= 0;
      P.box('r' + r.id, 470, 36 + i * 60, 186, 54, { cls: back ? 'good' : 'plain', title: 'id ' + r.id + ' · ' + r.n, sub: 'age ' + r.a });
    });
    if (s && s.cur === 'l2') P.arrow('a2', 'l2:r', 'jpa:l:0.4', { cls: s.err ? 'bad' : 'hot' });
    if (s && s.cur === 'l3') P.arrow('a3', 'l3:r', 'jpa:l:0.75', { cls: 'hot' });
    if (s && s.sent) P.arrow('sql', 'jpa:r:0.15', 'r1:l:0.5', { cls: 'hot' });
    if (s) s.back.forEach(function (id, i) { P.arrow('ret' + id, 'r' + id + ':l:0.5', 'jpa:r:' + (0.45 + i * 0.3), { cls: 'good' }); });
    P.box('n1', 14, 244, 322, 36, { cls: s && s.nsql ? 'wait' : 'ghost', title: 'DB에 나간 SQL', right: (s ? s.nsql : 0) + '번' });
    P.box('n2', 344, 244, 322, 36, { cls: s && s.nobj ? 'good' : 'ghost', title: 'list에 담긴 Member 객체', right: (s ? s.nobj : 0) + '개' });
  },
  assume: 'Hibernate 7.4.5와 H2 2.4.240(메모리 DB)에서 JDK 21로 실행해 대조했습니다. 스프링은 쓰지 않고 Hibernate를 코드로 직접 시작했습니다(Configuration에 클래스를 등록, hbm2ddl.auto=create-drop으로 테이블을 만듦). 네 가지 조합을 모두, 화면의 코드를 글자 그대로 컴파일해 실행했습니다. 화면의 Member 클래스는 import 줄만 더해 Member.java로, "조회하는 쪽" 네 줄은 EntityManager를 받는 메서드의 본문으로 넣었습니다. 화면에 보이지 않는 것은 import 줄, DB 연결 설정, EntityManager를 얻고 닫는 코드이고, 이 실습은 읽기만 하므로 트랜잭션은 시작하지 않았습니다. 조합마다 DB를 새로 만들고, 실행 전에 JDBC로 member_tbl에 세 행((1, kim, 25), (2, lee, 17), (3, park, 30))을 미리 넣었습니다. 이 준비의 SQL은 세지 않았습니다. 대조한 것은 오류가 났는지와 어느 줄에서 났는지(코드 줄을 스택 트레이스로 찾음), 예외의 종류와 메시지, Hibernate의 StatementInspector로 잡은 SQL의 글자와 수와 그 SQL이 나간 줄, 돌아온 list의 크기와 원소의 클래스와 값입니다. 단계 문장이 기대는 사실도 코드 줄마다 바로 아래에 측정 줄을 끼운 두 번째 실행에서 쟀습니다. jpql 변수와 createQuery 줄을 지난 시점에 나간 SQL은 0번이고 getResultList 줄을 지난 뒤 1번이라는 것, 오류가 나는 두 조합에서는 오류가 createQuery 줄에서 나고 다음 줄은 실행되지 않으며 SQL이 한 번도 나가지 않는다는 것, 돌아온 객체의 클래스가 Member 그대로라는 것입니다. 문서가 정한 것은 Jakarta Persistence 3.2 명세 4.1절(JPQL은 문자열로 쓰는 동적 쿼리의 언어), 4.3절(쿼리의 대상은 엔티티와 임베더블의 추상 스키마 타입), 4.3.1절(쿼리 문자열에서는 엔티티를 엔티티 이름으로 가리키며, 이름은 @Entity의 name이고 기본은 엔티티 클래스의 비한정 이름)과 EntityManager.createQuery, TypedQuery.getResultList, Table, EntityManager.find의 API 문서(createQuery는 질의 문자열이 잘못되면 IllegalArgumentException을 던지고, getResultList는 SELECT 질의를 실행해 목록을 돌려주며, @Table의 name은 기본이 엔티티 이름, find는 기본 키로 하나를 찾는다는 것), Hibernate Query Language 안내서 1.1절(HQL과 JPQL에서는 테이블과 열을 직접 가리킬 수 없고 엔티티 클래스와 그 필드를 가리킨다는 것)입니다. 명세 페이지는 요약으로만 돌아와 해당 절의 문장만 확인했고 절 전체를 읽지는 못했습니다. 문서가 정하지 않고 이 버전에서 관찰한 것은 JPQL을 읽어 이름을 확인하는 일이 createQuery 줄에서 일어난다는 것(오류가 그 줄에서 난 것)과, SQL이 getResultList 줄에서 나간다는 것, 오류의 예외 종류와 메시지, 나간 SQL의 글자(별칭 m1_0 등)입니다. 이 글자들은 Hibernate 버전에 따라 다를 수 있습니다. MySQL에서의 실행 대조는 하지 않았습니다. 이 실습은 조인과 페치 조인, UPDATE와 DELETE를 하는 벌크 쿼리, 조건이 바뀌는 동적 쿼리, 파라미터 바인딩, 결과를 받는 여러 방법은 다루지 않으며, 공부 탭의 "JPQL과 페치 조인", "벌크 연산", "동적 쿼리와 Querydsl" 실습에서 다룹니다.',
});

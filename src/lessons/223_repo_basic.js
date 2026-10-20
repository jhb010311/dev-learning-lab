Lab.register({
  id: 'repo_basic', nav: '리포지토리', cat: '기초개념', mode: 'step', basic: true, deep: ['datajpa'],
  title: '리포지토리는 무엇이고, 구현은 누가 만드는가',
  why: '스프링 데이터 JPA 없이 JPA만 쓰면 회원용, 주문용처럼 엔티티마다 저장하고 찾고 지우는 클래스를 따로 만들어, 거의 같은 EntityManager 코드를 엔티티 타입만 바꿔 되풀이해 적어야 한다. 조건으로 찾는 조회도 메서드마다 쿼리 글을 직접 쓴다. 스프링 데이터 JPA의 리포지토리는 이 되풀이되는 부분을 스프링이 채우게 해서, 우리는 메서드의 이름과 모양만 정하면 된다.',
  use: '스프링 데이터 JPA를 쓰는 프로젝트에서는 엔티티마다 리포지토리 인터페이스를 하나씩 두고, 서비스 클래스가 그것을 주입받아 저장하고 찾는다. 이메일로 회원 찾기, 상태로 주문 찾기처럼 조건이 한두 개인 조회는 메서드 이름 규칙만으로 해결한다. 조건이 길고 복잡한 조회는 @Query로 쿼리를 직접 적거나 Querydsl 같은 도구를 함께 쓴다.',
  intro: '스프링 데이터 JPA의 리포지토리는 엔티티를 저장하고 찾는 메서드를 모아 둔 인터페이스입니다. interface MemberRepository extends JpaRepository<Member, Long>이라고 선언만 하면(MemberRepository와 Member는 이 예제에서 지은 이름이고, JpaRepository는 스프링 데이터 JPA가 주는 인터페이스입니다), 스프링이 시작할 때 이 인터페이스를 구현한 객체를 대신 만들어 빈으로 등록합니다. 그래서 우리가 한 줄도 구현하지 않은 save 메서드를 부를 수 있습니다. save는 CrudRepository에 선언된 메서드이고(JpaRepository는 ListCrudRepository를 거쳐 CrudRepository를 물려받습니다), MemberRepository는 그것을 JpaRepository를 거쳐 물려받습니다. findByName처럼 정해진 이름 규칙(findBy 뒤에 필드 이름)에 맞춰 메서드를 선언하면, 스프링이 그 이름을 읽어 쿼리까지 만들어 줍니다. 이 실습은 extends JpaRepository와 찾는 메서드의 선언을 바꿔 가며 같은 코드를 컴파일하고 스프링을 시작해, 구현 객체가 만들어지는지와 어떤 SQL이 나가는지를 봅니다.',
  terms: ['리포지토리', 'JpaRepository', '쿼리 메서드', 'JPA, Hibernate, Spring Data JPA'],
  controls: [
    { id: 'ext', label: 'MemberRepository 선언에 extends JpaRepository<Member, Long>을 쓴다', type: 'check', value: true },
    { id: 'method', label: '찾는 메서드의 선언', type: 'select', value: 'name', options: [['name', 'findByName(String name)을 선언한다'], ['none', '찾는 메서드를 선언하지 않는다'], ['nick', 'findByNickname(String nickname)을 선언한다 (Member에 없는 필드)']] },
  ],
  // q는 물음 방식의 화면에 보이는 물음, t와 d는 글로만 읽는 본문에 쓰이는 이름과 설명
  presets: [
    { t: '처음 설정으로', q: '리포지토리는 어떻게 생겼고, 구현하지 않은 save와 findByName을 부르면 무슨 일이 일어나나', d: '선언만 한 인터페이스. 스프링이 구현 객체를 만들어 주어 save와 findByName이 실행되고 SQL이 나갑니다.', v: { ext: true, method: 'name' } },
    { t: 'extends JpaRepository를 지우면', q: 'extends JpaRepository<Member, Long>을 지우면', d: '평범한 인터페이스가 되어 save가 없고, 컴파일에 실패합니다. 스프링도 구현 객체를 만들지 않습니다.', v: { ext: false, method: 'name' } },
    { t: 'findByName 선언을 지우면', q: 'findByName 선언을 지우면', d: '선언한 메서드가 없어도 물려받은 save와 count가 실행됩니다.', v: { ext: true, method: 'none' } },
    { t: 'Member에 없는 필드로 선언하면', q: 'Member에 없는 필드로 findByNickname을 선언하면', d: '스프링이 쿼리를 만들지 못해 시작하다가 실패합니다.', v: { ext: true, method: 'nick' } },
  ],
  // 이 설정에서 찾는 메서드: 선언(없으면 ''), 쓰는 쪽에서 부르는 줄
  find: function (c) {
    if (c.method === 'name') return { decl: 'findByName(String name)', call: 'findByName("김철수")', short: 'findByName' };
    if (c.method === 'nick') return { decl: 'findByNickname(String nickname)', call: 'findByNickname("철수")', short: 'findByNickname' };
    return { decl: '', call: '', short: '' };
  },
  // 화면의 코드와 대조 프로그램(verify/spring/src/RepoBasicProbe.java)이 컴파일한 소스는 같은 글이다(대조 스크립트가 글자까지 비교한다).
  code: function (c) {
    var f = this.find(c), o = [];
    if (c.ext) o.push('// 선언만 한다. 구현 클래스는 쓰지 않고, 스프링이 구현 객체를 만들어 준다');
    o.push('public interface MemberRepository' + (c.ext ? ' extends JpaRepository<Member, Long>' : '') + ' {');
    if (f.decl) o.push('    // 이름의 규칙(findBy + 필드 이름)을 보고 스프링이 쿼리를 만든다', '    List<Member> ' + f.decl + ';');
    o.push('}', '', '// 쓰는 쪽', '// main 메서드 안의 줄만 남겼다(스프링을 시작하고 memberRepository를 받는 줄은 줄임).', 'memberRepository.save(new Member(1L, "김철수"));');
    if (f.decl) o.push('List<Member> found = memberRepository.' + f.call + ';', 'System.out.println(found.size());');
    else o.push('System.out.println(memberRepository.count());');
    return o.join('\n');
  },
  label: function (c) { return (c.ext ? 'extends JpaRepository 있음' : 'extends JpaRepository 없음') + ' · ' + { name: 'findByName 선언', none: '찾는 메서드 선언 없음', nick: 'findByNickname 선언 (Member에 없는 필드)' }[c.method]; },
  columns: ['결과', '스프링이 만든 구현 객체', '나간 SQL'],
  simulate: function (c) {
    var f = this.find(c), ev = [], sum = [], none = c.method === 'none', nick = c.method === 'nick';
    var SEL_ID = 'select m1_0.id,m1_0.name from member m1_0 where m1_0.id=?', INS = 'insert into member (name,id) values (?,?)';
    var SEL_NAME = 'select m1_0.id,m1_0.name from member m1_0 where m1_0.name=?', SEL_CNT = 'select count(*) from member m1_0';
    // 상태: impl은 구현 객체(0 없음, 1 만들어짐, -1 만들다 실패), sql은 나간 SQL [종류, 문장], rows는 member 테이블의 행, phase는 지금 하는 일
    var st = { phase: '', impl: 0, rows: 0, sql: [], out: '', status: '', errs: 0, errText: '', hot: '' };
    function push(s, k) { ev.push({ s: s, k: k, snap: JSON.parse(JSON.stringify(st)) }); }
    function send(text) { st.sql.push([text.split(' ')[0].toUpperCase(), text]); }
    var kindText = function () { var n = { INSERT: 0, SELECT: 0 }; st.sql.forEach(function (r) { n[r[0]]++; }); return n; };

    if (!c.ext) {
      // 컴파일 오류: save(그리고 count)가 없다
      st.phase = 'compile'; st.hot = 'if';
      push('컴파일러가 MemberRepository.java를 읽습니다. interface MemberRepository 선언에 extends가 없으므로 아무것도 물려받지 않는 평범한 인터페이스입니다. 이 인터페이스가 가진 메서드는 ' + (none ? '하나도 없습니다(안이 비어 있습니다).' : f.decl + ' 하나뿐입니다.'), '');
      st.phase = 'fail'; st.errs = 1; st.errText = 'MemberRepository에 save 메서드가 없음';
      push('컴파일러가 쓰는 쪽의 memberRepository.save(new Member(1L, "김철수")) 줄을 확인합니다. MemberRepository에는 save 메서드가 없습니다. save는 JpaRepository가 ListCrudRepository를 거쳐 CrudRepository에서 물려받은 메서드인데, 이 인터페이스는 JpaRepository를 물려받지 않았기 때문입니다. 이 줄에서 오류가 납니다(javac: cannot find symbol, method save(Member)).', 'bad');
      if (none) {
        st.errs = 2;
        push('다음 줄 System.out.println(memberRepository.count())도 확인합니다. count도 JpaRepository가 CrudRepository에서 물려받은 메서드라 이 인터페이스에는 없어서, 같은 종류의 오류가 한 번 더 납니다(javac: cannot find symbol, method count()). javac가 알린 오류는 모두 2개입니다.', 'bad');
      } else {
        push('쓰는 쪽의 memberRepository.' + f.call + ' 줄은 이 인터페이스에 선언돼 있는 메서드를 부르므로 오류가 아닙니다. 컴파일러는 메서드가 선언돼 있는지만 보고, 누가 구현하는지는 보지 않습니다. javac가 알린 오류는 save 줄의 1개뿐입니다.', '');
      }
      push('컴파일이 실패합니다. 컴파일러가 알린 오류는 ' + st.errs + '개이고, 첫 번째 오류는 "' + st.errText + '"입니다. 실행할 Main 클래스 파일이 만들어지지 않았으므로 프로그램을 실행할 수 없고, 스프링도 시작하지 못합니다.', 'bad');
      st.phase = 'plain';
      push('같은 인터페이스를 쓰는 쪽 없이 스프링에 맡기면 어떻게 되는지는 따로 실행해 확인했습니다. 스프링은 시작에는 성공하지만 MemberRepository의 구현 객체를 만들지 않았습니다(0개). 스프링 데이터가 찾는 것은 JpaRepository 같은 리포지토리 인터페이스를 상속한 인터페이스이고, 평범한 인터페이스는 찾지 않기 때문입니다. 구현할 클래스를 우리가 쓰지 않았으니, 이 인터페이스의 구현은 어디에도 없습니다.', '');
      sum.push('extends JpaRepository를 지우면 MemberRepository는 평범한 인터페이스입니다. save는 JpaRepository가 CrudRepository에서 물려받은 메서드라 이 인터페이스에는 없고, 컴파일러가 save를 찾을 수 없다고 알려 주어 컴파일에 실패했습니다.' + (none ? ' count도 마찬가지여서 오류는 2개였습니다.' : ' 직접 선언한 ' + f.short + ' 줄은 선언이 있어 오류가 아니었습니다.'));
      sum.push('스프링은 JpaRepository 같은 스프링 데이터의 리포지토리 인터페이스를 상속한 인터페이스에만 구현을 만들어 줍니다. 이 인터페이스는 상속하지 않았으므로, 컴파일 오류를 피하더라도 스프링이 만든 구현 객체는 0개입니다.');
      return { events: ev, summary: sum, f: f, row: ['컴파일 오류: MemberRepository에 save 메서드가 없음', '없음', '없음'] };
    }

    // 1. 컴파일
    st.phase = 'compile'; st.hot = 'if';
    push('컴파일러가 MemberRepository.java와 쓰는 쪽을 확인합니다. 인터페이스가 extends JpaRepository<Member, Long>을 선언해 JpaRepository의 메서드를 물려받으므로, 우리가 선언하지 않은 save 메서드를 부르는 줄도 오류가 아닙니다.' + (none ? ' count도 물려받은 메서드입니다.' : nick ? ' 쓰는 쪽의 ' + f.short + ' 메서드는 우리가 선언한 것이라 오류가 아닙니다. 컴파일러는 메서드가 선언돼 있는지만 보고, 이름이 무슨 뜻인지는 읽지 않습니다.' : ' ' + f.short + ' 메서드는 우리가 선언한 것입니다.') + ' 컴파일에 성공합니다.', 'good');

    // 2. 스프링이 시작하면서 인터페이스를 찾는다
    st.phase = 'scan'; st.hot = 'if';
    push('main이 SpringApplication.run으로 스프링을 시작합니다. 스프링 데이터가 시작 클래스가 있는 app 패키지에서 JpaRepository 같은 리포지토리 인터페이스를 상속한 인터페이스를 찾습니다. extends JpaRepository가 붙은 MemberRepository가 찾아집니다. 우리가 쓴 코드에는 MemberRepository를 구현한 클래스도, 구현을 만드는 줄도 없습니다.', '');

    if (nick) {
      st.phase = 'parse'; st.hot = 'if';
      push('스프링 데이터가 MemberRepository의 구현 객체를 만들면서, 선언된 findByNickname 메서드의 이름을 읽습니다. findBy는 "찾는다", 그 뒤의 Nickname은 Member의 nickname 필드라는 규칙입니다. 그런데 Member에는 id와 name만 있고 nickname 필드가 없어서, 스프링은 쿼리를 만들지 못합니다(PropertyReferenceException: No property "nickname" found for type "Member").', 'bad');
      st.phase = 'fail'; st.impl = -1; st.hot = '';
      push('쿼리를 만들지 못해 구현 객체를 만드는 데 실패하고, 스프링이 시작하다 멈춥니다. 예외는 스프링을 시작하는 줄(화면에서는 줄여 둔 부분)에서 main 밖으로 나와 프로그램이 멈춥니다. memberRepository.save를 비롯해 쓰는 쪽은 한 줄도 실행되지 않았고, DB로 나간 SQL도 없습니다. 컴파일러가 알아채지 못한 이름의 잘못을 스프링이 시작할 때 알려 준 것입니다.', 'bad');
      sum.push('Member에 없는 필드로 findByNickname을 선언하면 스프링이 이름을 쿼리로 바꾸지 못해, 스프링이 시작하다가 실패합니다. 쓰는 쪽은 한 줄도 실행되지 못했습니다.');
      sum.push('메서드 이름은 스프링이 읽는 규칙이어서, 규칙에 맞지 않는다는 것은 컴파일러가 아니라 스프링이 시작할 때 알려 줍니다. 이 실패는 findByNickname을 한 번도 부르지 않아도 납니다.');
      return { events: ev, summary: sum, f: f, row: ['스프링이 시작하다 실패함: Member에 nickname 필드가 없음', '없음', '없음'] };
    }

    // 3. 구현 객체를 만들어 빈으로 등록한다
    st.phase = 'make'; st.impl = 1; st.hot = 'im';
    push('스프링 데이터가 MemberRepository를 구현한 객체를 만들어 빈으로 등록합니다. 이 객체는 우리가 쓴 클래스가 아니라 스프링이 실행 중에 만든 것이고, MemberRepository 타입으로 쓸 수 있습니다. save 같은 물려받은 메서드는 이 객체가 실행합니다.' + (none ? ' 선언한 메서드가 없으므로 읽을 이름도 없습니다.' : ''), 'good');
    if (!none) {
      st.phase = 'parse';
      push('이때 스프링 데이터가 findByName 메서드의 이름을 읽습니다. findBy는 "찾는다", 그 뒤의 Name은 Member의 name 필드라는 규칙에 따라 "name으로 찾는 쿼리"를 준비합니다. Member에 name 필드가 있어서 통과합니다. 이름이 규칙에 맞지 않으면 여기서 실패합니다.', '');
    }
    st.phase = 'get'; st.hot = 'if';
    push('main이 스프링에서 MemberRepository 타입의 빈을 받아 memberRepository에 담습니다(화면에서는 줄여 둔 부분). 담긴 것은 방금 스프링이 만든 구현 객체입니다. new로 만든 객체가 아닙니다. 이 뒤에 나가는 SQL부터 셉니다.', '');

    // 4. save
    st.phase = 'save'; st.hot = 'im';
    send(SEL_ID);
    push('memberRepository.save(new Member(1L, "김철수"))가 실행됩니다. save 메서드를 구현한 코드는 우리에게 없고, JpaRepository에서 물려받은 것을 스프링이 만든 구현 객체가 실행합니다. Member의 id가 1로 이미 정해져 있어서, save 안에서 먼저 id가 1인 행이 이미 있는지 SELECT로 찾아봅니다(SELECT 1번). 그런 행은 없습니다.', '');
    send(INS); st.rows = 1;
    push('찾은 행이 없으므로 구현 객체가 INSERT를 보내 member 테이블에 id 1, 김철수 행을 저장합니다(INSERT 1번). 우리가 쓴 SQL은 한 줄도 없습니다.', 'good');

    // 5. 찾기
    st.phase = 'find';
    if (none) {
      send(SEL_CNT);
      push('System.out.println(memberRepository.count())의 count 메서드가 실행됩니다. count도 JpaRepository에서 물려받은 메서드이고, 구현 객체가 ' + SEL_CNT + '을 보냅니다. member 테이블의 행은 1개입니다.', 'good');
      st.out = '1'; st.phase = 'done';
      push('println이 count가 돌려준 1을 출력합니다.', 'good');
    } else {
      send(SEL_NAME);
      push('memberRepository.findByName("김철수")가 실행됩니다. 구현 객체가 시작할 때 읽어 둔 이름 규칙대로 SELECT를 보냅니다: ' + SEL_NAME + ' (name=? 자리에는 넘긴 "김철수"가 들어갑니다). 우리가 쓴 쿼리는 없습니다. 찾은 행 1개가 Member 객체가 되어 List에 담깁니다.', 'good');
      st.out = '1'; st.phase = 'done';
      push('println이 found.size()를 출력합니다. 찾은 Member가 1개이므로 1입니다. 우리가 쓴 것은 인터페이스의 선언 두 줄(인터페이스 선언과 findByName 한 줄)뿐이었습니다.', 'good');
    }

    if (!none) {
      sum.push('리포지토리는 엔티티를 저장하고 찾는 메서드를 모아 둔 인터페이스입니다. extends JpaRepository<Member, Long>을 선언하면 스프링이 시작할 때 이 인터페이스의 구현 객체를 대신 만들어 빈으로 등록하고, 그래서 우리가 구현하지 않은 save를 부를 수 있었습니다.');
      sum.push('save는 JpaRepository에서 물려받은 메서드이고, findByName은 이름의 규칙(findBy + 필드 이름)을 스프링이 읽어 SELECT를 만든 것입니다. 우리가 쓴 것은 인터페이스의 선언뿐이고, 구현 클래스도 SQL도 쓰지 않았습니다.');
    } else {
      sum.push('findByName 선언을 지워도 리포지토리는 그대로 동작합니다. 선언한 메서드가 하나도 없어도 JpaRepository에서 물려받은 save와 count를 쓸 수 있었고, 스프링이 만든 구현 객체가 SQL을 보냈습니다.');
      sum.push('찾는 메서드를 선언하는 것은 필요한 조회를 더하는 일입니다. 구현 객체를 얻는 조건은 findByName이 아니라 JpaRepository 같은 리포지토리 인터페이스를 상속하는 것입니다.');
    }
    var n = kindText();
    return { events: ev, summary: sum, f: f, row: ['1', '있음', 'INSERT ' + n.INSERT + '번, SELECT ' + n.SELECT + '번'] };
  },
  render: function (v, sim, t, H, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : null;
    if (!s) { H.text(v, '실행을 누르면 컴파일러가 코드를 확인하는 것부터 시작합니다.'); return; }
    H.table(v, ['나간 SQL', '종류'], s.sql.length ? s.sql.map(function (r) { return { cls: '', cells: [r[1], r[0]] }; }) : [{ cls: 'gone', cells: ['아직 없음', ''] }], 'DB로 나간 SQL');
    H.table(v, ['member 테이블', ''], s.rows ? [{ cls: '', cells: ['id 1', '김철수'] }] : [{ cls: 'gone', cells: ['행 없음', ''] }], 'DB의 상태');
    var n = { INSERT: 0, SELECT: 0 }; s.sql.forEach(function (r) { n[r[0]]++; });
    H.counters(v, [[s.impl === 1 ? 1 : 0, '스프링이 만든 구현 객체'], [n.INSERT + n.SELECT, '나간 SQL']]);
  },
  // 그림: 왼쪽에 우리가 쓴 MemberRepository(인터페이스), 가운데에 스프링이 만든 구현 객체, 오른쪽에 DB의 member 테이블. 호출이 구현 객체를 거쳐 DB에 닿는지를 화살표로 보인다. 구현 객체가 없으면 화살표가 거기서 끊긴다.
  draw: function (P, sim, shown) {
    var c = sim.c, f = sim.f, last = shown[shown.length - 1], s = last ? last.snap : null, ph = s ? s.phase : '';
    P.size(680, 292);
    P.region('cl', 10, 12, 226, 212, '우리가 쓴 것');
    var sub = ['인터페이스 (구현 없음)', f.decl ? f.short + '()를 선언함' : '선언한 메서드 없음', c.ext ? 'save, count 등: 물려받음' : '물려받은 메서드 없음'];
    P.box('if', 20, 44, 206, 94, { cls: ph === 'fail' && s.errs ? 'bad' : s && s.hot === 'if' ? 'hot now' : 'plain', title: 'MemberRepository', sub: sub });
    P.region('sp', 286, 12, 190, 212, '스프링이 만든 것');
    var im = s ? s.impl : 0;
    P.box('im', 296, 44, 170, 94, { cls: im === 1 ? (s.hot === 'im' ? 'hot now' : 'good') : im === -1 ? 'bad' : 'ghost', title: '구현 객체', sub: im === 1 ? ['스프링이 실행 중에 만듦', '우리가 쓴 클래스가 아님'] : im === -1 ? ['만들다 실패'] : [s && (ph === 'fail' || ph === 'plain') ? '만들어지지 않음' : '아직 없음'] });
    P.region('db', 526, 12, 144, 212, 'DB');
    P.box('tb', 536, 44, 124, 94, { cls: s && s.rows ? 'good' : 'ghost', title: 'member', sub: s && s.rows ? ['id 1 · 김철수'] : ['행 없음'] });
    if (ph === 'make' || ph === 'parse' || ph === 'scan') P.arrow('mk', 'if:r:0.5', 'im:l:0.5', { cls: ph === 'scan' ? 'dash' : 'hot' });
    if (ph === 'save' || ph === 'find') { P.arrow('call', 'if:r:0.5', 'im:l:0.5', { cls: 'hot' }); P.arrow('sql', 'im:r:0.5', 'tb:l:0.5', { cls: 'hot' }); }
    if (ph === 'fail') P.arrow('x', 'if:r:0.5', 'im:l:0.5', { cls: 'bad' });
    var n = { INSERT: 0, SELECT: 0 }; if (s) s.sql.forEach(function (r) { n[r[0]]++; });
    P.box('n1', 14, 242, 322, 36, { cls: s && s.impl === 1 ? 'wait' : 'ghost', title: '스프링이 만든 구현 객체', right: (s && s.impl === 1 ? 1 : 0) + '개' });
    P.box('n2', 344, 242, 322, 36, { cls: n.INSERT + n.SELECT ? 'good' : 'ghost', title: '나간 SQL', right: 'INSERT ' + n.INSERT + ' · SELECT ' + n.SELECT });
  },
  assume: '스프링 부트 4.1.1(스프링 데이터 JPA 4.1.1, Hibernate 7.4.5, 스프링 프레임워크 7.0.9)을 JDK 21에서, H2 2.4.240 메모리 DB에서 실행해 대조했고 MySQL에서의 실행 대조는 하지 않았습니다. 여섯 가지 조합을 모두, 화면의 코드와 같은 소스(패키지 app의 MemberRepository와 쓰는 쪽을 가진 Main, 끝에 PROBE 표시를 붙인 측정 줄만 더함)를 javax.tools로 컴파일하고, 컴파일에 성공한 것은 자바 프로세스를 새로 띄워 실행했습니다. 시작 클래스는 @SpringBootConfiguration과 @EnableAutoConfiguration을 붙였고 웹 서버는 띄우지 않았습니다. 엔티티 Member(id는 Long, name은 String)와 MemberRepository는 시작 클래스와 같은 패키지에 두고, 리포지토리를 손으로 등록하지 않고 스프링 데이터가 패키지를 훑어 인터페이스를 찾아 구현 객체를 만들게 했습니다. 대조한 것은 출력한 글, 컴파일 오류의 javac 진단 코드와 줄(cant.resolve.location.args, 첫 오류가 save이고 count가 있으면 둘째 오류), 스프링이 시작하다 실패한 예외의 사슬(BeanCreationException, QueryCreationException, PropertyReferenceException), 스프링 컨텍스트에 있는 MemberRepository 빈의 수, 그 객체가 우리가 쓴 클래스인지 아닌지(JDK 동적 프록시이고 MemberRepository를 구현한 우리 클래스는 없음), 시작이 끝난 뒤 DB로 나간 SQL의 종류별 수와 문장(Hibernate의 StatementInspector로 잡음)입니다. extends JpaRepository가 없는 세 조합은 컴파일이 실패하므로, 쓰는 쪽을 뺀 같은 인터페이스로 스프링을 따로 띄워 구현 객체가 0개인 것을 확인했습니다. 컴파일이 실패한 조합에서는 Main 클래스 파일이 만들어지지 않았습니다. 문서는 직접 열어 확인했습니다. 스프링 데이터 커먼즈 문서의 Creating Repository Instances 절은 스프링 데이터가 설정된 패키지 아래에서 리포지토리 하위 인터페이스를 상속한 인터페이스를 모두 찾아 그것마다 빈 객체를 만들고, 쿼리 메서드 호출을 처리하는 프록시를 만든다고 하며, 스프링 데이터 JPA 문서의 Core concepts 절은 Repository가 중심 인터페이스이고 JpaRepository 같은 저장 기술별 인터페이스가 CrudRepository를 확장한다고, Defining Repository Interfaces 절은 인터페이스가 Repository를 상속해야 하고 JpaRepository를 상속한 인터페이스가 스프링 데이터 JPA 모듈의 대상이라고 합니다. Query Methods 절의 Query Creation과 Property Expressions는 메서드 이름의 첫 By까지가 주제이고 그 뒤가 조건이라는 것, 쿼리를 만드는 때에 파싱한 이름이 관리하는 엔티티의 프로퍼티인지 확인한다는 것을 설명합니다. 그 확인이 스프링을 시작할 때 일어나 시작을 실패시킨다는 것과 예외의 이름은 문서가 정한 것이 아니라 이 버전에서 관찰한 동작입니다. 구현 객체의 실제 클래스가 JDK 프록시인 것, save가 id가 있는 엔티티에 대해 INSERT에 앞서 SELECT를 한 번 보내는 것, 나간 SQL의 모양과 개수도 이 버전과 설정에서 관찰한 것으로, 버전에 따라 다를 수 있습니다. 화면의 코드는 package와 import 줄을 줄였고, Member 엔티티, 스프링을 시작하고 구현 객체를 받는 main의 줄, DB 설정은 보이지 않습니다. 이 실습은 쿼리 메서드의 이름 규칙 가운데 findBy와 필드 이름 하나만 다루며, @Query, 조건 키워드(And, GreaterThan 등), 반환 타입, 페이지 요청, 트랜잭션은 다루지 않습니다. 이것들은 "세부 동작 실습: 스프링 데이터 JPA"에서 다룹니다.',
});

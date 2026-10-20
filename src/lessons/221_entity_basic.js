Lab.register({
  id: 'entity_basic', nav: '엔티티', cat: '기초개념', mode: 'step', basic: true, deep: ['mapping'],
  title: '엔티티는 무엇이고, 일반 클래스와 무엇이 다른가',
  why: '엔티티 없이 자바 객체를 DB에 저장하려면 INSERT 문을 직접 쓰고, 필드 값을 하나씩 꺼내 문장에 채워 넣어야 한다. 읽을 때도 결과의 칸마다 값을 꺼내 객체에 하나씩 넣어야 하고, 필드를 하나 늘리면 관련된 SQL을 모두 고쳐야 한다. 엔티티는 클래스와 테이블의 짝을 표시로 알려 두어, 이렇게 옮겨 적는 일을 JPA가 맡게 한다.',
  use: '스프링으로 DB를 쓰는 프로그램에서 회원, 주문, 상품, 게시글처럼 테이블에 저장할 대상을 엔티티 클래스로 만든다. 보통 스프링 데이터 JPA의 리포지토리와 함께 써서 저장하고 찾는다. 여러 테이블을 엮는 통계처럼 SQL을 직접 다듬어야 하는 곳에서는 MyBatis나 JdbcTemplate으로 SQL을 직접 쓰기도 한다.',
  intro: '엔티티는 데이터베이스 테이블과 짝이 되는 자바 클래스이고, 그 객체 하나가 테이블의 한 행과 짝이 됩니다. 코드로 보면 class로 선언한 평범한 자바 클래스인데, 일반 클래스와 다른 곳은 두 군데입니다. 클래스 위의 @Entity는 이 클래스의 객체를 테이블에 저장한다는 표시이고, 필드 위의 @Id는 그 필드가 기본 키(행을 구별하는 열)라는 표시입니다. 이 둘이 있으면 JPA(여기서는 Hibernate)가 클래스의 필드를 보고 테이블의 열과 짝을 짓고, em.persist로 객체를 넘겨 두면 커밋할 때 INSERT 문을 대신 만들어 실행합니다. 우리가 SQL을 쓰지 않습니다. 여기서 em은 JPA에 저장을 시키는 EntityManager 객체입니다. 이 실습은 두 표시를 하나씩 지워 가며 같은 저장 코드를 실행해, 테이블이 만들어지는지와 INSERT 문이 나가는지를 봅니다.',
  terms: ['엔티티', '@Entity', '@Id', 'JPA, Hibernate, Spring Data JPA'],
  controls: [
    { id: 'ent', label: 'Member 위에 @Entity를 적는다', type: 'check', value: true },
    { id: 'idf', label: 'id 필드 위에 @Id를 적는다', type: 'check', value: true },
    { id: 'extra', label: 'email 필드를 하나 더 적는다', type: 'check', value: false },
  ],
  // q는 물음 방식의 화면에 보이는 물음, t와 d는 글로만 읽는 본문에 쓰이는 이름과 설명
  presets: [
    { t: '처음 설정으로', q: '엔티티는 어떻게 생겼고, em.persist로 넘기면 무슨 일이 일어나나', d: '@Entity와 @Id가 다 있는 엔티티. JPA가 테이블을 만들고, commit 때 INSERT 문을 보냅니다.', v: { ent: true, idf: true, extra: false } },
    { t: '@Entity를 지우면', q: '@Entity를 지우면', d: 'JPA가 이 클래스를 엔티티로 받아들이지 않아, em.persist에서 오류가 납니다.', v: { ent: false, idf: true, extra: false } },
    { t: '@Id를 지우면', q: '@Id를 지우면', d: '기본 키로 쓸 필드를 찾지 못해, JPA가 시작하다가 멈춥니다.', v: { ent: true, idf: false, extra: false } },
    { t: 'email 필드를 하나 더 적으면', q: 'email 필드를 하나 더 적으면', d: '필드가 열 하나로 짝지어져, 테이블에 email 열이 생기고 INSERT 문에도 들어갑니다.', v: { ent: true, idf: true, extra: true } },
  ],
  // 화면의 코드와 대조 프로그램(verify/spring/src/EntityBasicProbe.java)이 실행하는 소스가 같은 글이다. 대조 스크립트가 글자까지 비교한다.
  code: function (c) {
    var l = [];
    if (c.ent) l.push('// 표시: 이 클래스의 객체는 테이블의 한 행으로 저장된다', '@Entity');
    l.push('public class Member {');
    if (c.idf) l.push('    // 표시: 이 필드가 기본 키다', '    @Id');
    l.push('    private Long id;', '    private String name;');
    if (c.extra) l.push('    private String email;');
    l.push('', '    protected Member() { }', '', '    public Member(Long id, String name) {', '        this.id = id;', '        this.name = name;', '    }', '}', '',
      '// 저장하는 쪽 (메서드 안의 줄만 보임. 그 메서드의 선언, em을 만드는 코드, import는 생략)', 'em.getTransaction().begin();', 'em.persist(new Member(1L, "김철수"));', 'em.getTransaction().commit();');
    return l.join('\n');
  },
  label: function (c) { return (c.ent ? '@Entity 있음' : '@Entity 없음') + ' · ' + (c.idf ? '@Id 있음' : '@Id 없음') + ' · ' + (c.extra ? '필드 id, name, email' : '필드 id, name'); },
  columns: ['결과', 'JPA가 클래스를 보고 만든 테이블', '나간 INSERT 문', '테이블의 행'],
  simulate: function (c) {
    var ev = [], sum = [], ok = c.ent && c.idf, cols = c.extra ? ['id', 'email', 'name'] : ['id', 'name'];
    var ins = c.extra ? 'insert into Member (email,name,id) values (?,?,?)' : 'insert into Member (name,id) values (?,?)';
    var fields = c.extra ? 'id, name, email' : 'id, name';
    // 상태: jpa(JPA 상자의 상태), jl(JPA 상자의 글), rd(필드마다 표시가 JPA에 닿는가: pass, cut), table(만들어진 열), row(들어간 행), ins(나간 INSERT), rows(행 수)
    var st = { phase: '', jpa: 'idle', jl: ['(Hibernate)', '시작 전'], rd: { ce: '', id: '', name: '', email: '' }, table: null, row: null, ins: 0, rows: null, err: '' };
    function push(s, k) { ev.push({ s: s, k: k, snap: JSON.parse(JSON.stringify(st)) }); }

    // 1. JPA가 시작하면서 Member 클래스를 읽는다
    st.phase = 'read'; st.jpa = 'read'; st.jl = ['(Hibernate)', 'Member를', '읽는 중'];
    push('프로그램이 시작되면서 JPA(여기서는 Hibernate)에 Member 클래스를 알려 주고, JPA가 이 클래스를 읽습니다. 이 등록하는 줄과 DB에 연결하는 설정은 화면에서 줄였습니다. 우리가 쓴 코드 가운데 필드를 열에 짝짓는 줄은 없습니다. 짝짓기는 JPA가 클래스의 표시를 보고 합니다.', '');

    if (!c.ent) {
      // 2. @Entity가 없다: 엔티티로 받아들이지 않는다(시작은 성공한다)
      st.rd = { ce: 'cut', id: 'cut', name: 'cut', email: c.extra ? 'cut' : '' };
      st.jpa = 'plain'; st.jl = ['(Hibernate)', 'Member를 모름', '시작은 끝남'];
      push('JPA가 Member 클래스 위에서 @Entity를 찾습니다. 없으므로 JPA는 이 클래스를 저장할 클래스로 받아들이지 않습니다. 오류는 나지 않고, JPA는 Member를 모르는 채 시작을 마칩니다. ' + (c.idf ? 'id 필드 위에 @Id가 붙어 있어도 결과가 같습니다. 클래스가 엔티티로 받아들여지지 않았기 때문입니다. ' : '') + 'JPA가 만든 테이블은 없습니다.', 'bad');
      st.phase = 'begin';
      push('em.getTransaction().begin(): 저장 작업을 시작합니다. 트랜잭션은 작업을 한 묶음으로 처리하는 단위이고, 자세한 것은 따로 다룹니다. 아직 INSERT 문은 나가지 않았습니다.', '');
      st.phase = 'new';
      push('new Member(1L, "김철수"): Member 클래스로 객체를 만듭니다. 이 객체는 평범한 자바 객체이고, JPA는 아직 이 객체를 모릅니다.', '');
      st.phase = 'persist'; st.jpa = 'bad'; st.jl = ['(Hibernate)', 'persist 거부', '(오류 발생)']; st.err = 'persist';
      push('em.persist(...): JPA가 객체를 넘겨받으려 하며 Member 클래스가 자기가 아는 엔티티인지 살핍니다. 아닙니다. IllegalArgumentException 오류가 나고, 메시지는 Unknown entity type \'app.Member\' (\'Member\' is not annotated \'@Entity\')입니다. 앞의 app은 이 실험에서 Member를 넣은 패키지 이름입니다. 오류가 났으므로 다음 줄 commit은 실행되지 않고, INSERT 문은 한 번도 나가지 않았습니다. 테이블이 없으니 행도 없습니다.', 'bad');
      sum.push('@Entity가 없으면 JPA는 이 클래스를 저장할 클래스로 받아들이지 않습니다. JPA는 오류 없이 시작했지만 em.persist에 객체를 넘기자 IllegalArgumentException 오류가 났고, 테이블도 INSERT 문도 없었습니다.');
      sum.push((c.idf ? '@Id가 있어도 소용이 없었습니다. @Id는 @Entity가 붙은 클래스 안에서 뜻이 있는 표시입니다. ' : '두 표시를 다 지우면 같은 모양의 일반 클래스가 됩니다. ') + '오류는 JPA가 시작할 때가 아니라 persist를 부르는 줄에서 났습니다.' + (c.extra ? ' email 필드를 더 적어도 결과는 같습니다.' : ''));
    } else if (!c.idf) {
      // 2. @Entity는 있으나 @Id가 없다: 시작하다가 실패한다
      st.rd = { ce: 'pass', id: 'cut', name: 'pass', email: c.extra ? 'pass' : '' };
      st.jpa = 'bad'; st.jl = ['(Hibernate)', '기본 키를', '찾지 못함'];
      push('JPA가 Member 클래스 위에서 @Entity를 찾습니다. 있으므로 저장할 클래스로 받아들입니다. 이어서 기본 키로 쓸 필드를 찾는데, @Id가 붙은 필드가 하나도 없습니다. id라는 이름의 필드가 있어도 JPA는 이름이 아니라 @Id 표시를 보고 기본 키를 찾습니다.', 'bad');
      st.phase = 'fail'; st.err = 'start'; st.jl = ['(Hibernate)', '시작 실패', '(오류 발생)'];
      push('JPA가 AnnotationException 오류를 내며 시작을 멈춥니다. 메시지는 Entity \'app.Member\' has no identifier로 시작하고, 모든 @Entity 클래스에는 @Id가 붙은 속성이 하나 이상 있어야 한다는 뜻입니다. 테이블은 만들어지지 않았습니다. 프로그램은 저장하는 코드에 이르지도 못하므로 persist도 commit도 실행되지 않고, INSERT 문은 나가지 않았습니다.', 'bad');
      sum.push('@Id가 없으면 JPA는 어느 필드로 행을 구별할지 몰라 시작하다가 멈춥니다. @Entity가 있어 저장할 클래스로는 받아들였지만, 기본 키로 쓸 필드를 찾지 못했습니다.');
      sum.push('이번 오류는 persist 줄이 아니라 JPA가 시작할 때 났습니다. 필드 이름이 id여도 @Id 표시가 없으면 기본 키가 아닙니다.' + (c.extra ? ' email 필드를 더 적어도 결과는 같습니다. 기본 키가 없으면 열이 될 필드가 몇 개든 JPA는 시작하지 못합니다.' : ''));
    } else {
      // 2. 정상: 엔티티로 받아들이고 필드와 열을 짝짓고 테이블을 만든다
      st.rd = { ce: 'pass', id: 'pass', name: 'pass', email: c.extra ? 'pass' : '' };
      st.jpa = 'ok'; st.jl = ['(Hibernate)', '엔티티: Member', '기본 키: id'];
      push('JPA가 Member 클래스 위에서 @Entity를 찾습니다. 있으므로 저장할 클래스로 받아들입니다. 이어서 필드를 읽어, @Id가 붙은 id를 기본 키로 삼고 나머지 필드(' + (c.extra ? 'name, email' : 'name') + ')를 기본 키가 아닌 열로 삼습니다.', 'good');
      st.phase = 'table'; st.table = cols.slice(); st.rows = 0; st.jl = ['(Hibernate)', '엔티티: Member', '테이블 만듦'];
      push('JPA가 이 짝짓기대로 H2 DB에 테이블을 만듭니다. 테이블 이름은 클래스 이름을 따라 Member이고, 열은 필드마다 하나씩 ' + cols.join(', ') + '입니다.' + (c.extra ? ' 이번 실행에서는 필드를 적은 순서(id, name, email)와 달리 id, email, name 순서로 열이 만들어졌습니다.' : '') + ' 이 실습은 JPA가 시작할 때 테이블을 만들도록 설정했고(hibernate.hbm2ddl.auto=create-drop), 우리는 CREATE TABLE도 쓰지 않았습니다. 아직 행은 하나도 없습니다.', 'good');
      st.phase = 'begin';
      push('em.getTransaction().begin(): 저장 작업을 시작합니다. 트랜잭션은 작업을 한 묶음으로 처리하는 단위이고, 자세한 것은 따로 다룹니다. 아직 INSERT 문은 나가지 않았습니다.', '');
      st.phase = 'new';
      push('new Member(1L, "김철수"): Member 클래스로 객체를 만듭니다. 이 객체는 아직 평범한 자바 객체이고, JPA는 이 객체를 모릅니다.', '');
      st.phase = 'persist'; st.jl = ['(Hibernate)', '객체를 받음', 'INSERT 0번'];
      push('em.persist(...): JPA가 이 객체를 넘겨받습니다. 이 줄이 끝난 시점에 나간 INSERT 문은 아직 0번입니다. 객체를 넘겼다고 바로 DB에 쓰이는 것은 아닙니다. INSERT가 언제 나가는지는 "영속성 컨텍스트" 실습에서 다룹니다.', '');
      st.phase = 'commit'; st.ins = 1; st.jl = ['(Hibernate)', 'INSERT 문을', '만들어 보냄'];
      push('em.getTransaction().commit(): JPA가 INSERT 문을 만들어 DB에 보냅니다. 이 실행에서 Hibernate 7.4.5가 만든 문장은 "' + ins + '"입니다. 각 ?에는 앞의 열 이름 순서대로 객체의 필드 값이 들어갑니다. 우리가 쓴 코드에는 INSERT라는 글자가 없습니다. 문장의 글자는 Hibernate 버전에 따라 다를 수 있습니다.', 'good');
      st.phase = 'done'; st.rows = 1; st.row = { id: '1', name: '김철수', email: 'NULL' };
      push('Member 테이블에 행이 하나 생겼습니다. id는 1, name은 김철수' + (c.extra ? '이고, email은 NULL입니다. 우리가 email 필드에 값을 넣은 적이 없어서 비어 있는 채로 저장됐습니다' : '입니다') + '. 객체 하나가 테이블의 한 행이 되었습니다.', 'good');
      if (c.extra) {
        sum.push('필드를 하나 더 적으면 JPA가 그것도 열로 짝지어, 테이블에 email 열이 생기고 INSERT 문의 열 목록에도 들어갑니다. 열을 늘리는 일이 SQL이 아니라 필드를 적는 일입니다.');
        sum.push('생성자는 그대로여서 email에는 값을 넣지 않았고, 그래서 email 열은 NULL로 저장됐습니다. 엔티티의 필드는 값이 있든 없든 모두 열이 됩니다.');
      } else {
        sum.push('엔티티는 테이블과 짝이 되는 자바 클래스이고, 그 객체 하나가 테이블의 한 행과 짝이 됩니다. 일반 클래스와 다른 곳은 클래스 위의 @Entity(저장되는 클래스라는 표시)와 필드 위의 @Id(기본 키라는 표시)이고, 이 둘이 있으면 JPA가 필드를 열과 짝지어 테이블을 만듭니다.');
        sum.push('우리는 SQL을 한 줄도 쓰지 않았습니다. 테이블도 INSERT 문도 JPA가 클래스의 모양을 보고 만들었고, INSERT는 persist 줄이 아니라 commit 줄에서 나갔습니다.');
      }
    }
    var result = ok ? '저장됨' : !c.ent ? '저장할 수 없음: 엔티티가 아닌 클래스' : 'JPA가 시작하다가 실패함: 기본 키로 쓸 필드가 없음';
    var tab = ok ? 'Member (' + cols.join(', ') + ')' : '만들어지지 않음';
    return { events: ev, summary: sum, cols: cols, ins: ins, row: [result, tab, (ok ? 1 : 0) + '번', ok ? '1행' : '테이블 없음'] };
  },
  render: function (v, sim, t, H, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : null;
    if (!s) { H.text(v, '실행을 누르면 JPA가 시작하면서 Member 클래스를 읽는 것부터 시작합니다.'); return; }
    if (s.table) H.table(v, ['열', '값'], s.table.map(function (n) { return { cls: '', cells: [n, s.row ? { v: s.row[n], cls: 'good' } : ''] }; }), 'JPA가 만든 Member 테이블');
    else H.table(v, ['열', '값'], [{ cls: 'gone', cells: ['테이블 없음', ''] }], 'JPA가 만든 Member 테이블');
    if (s.ins) H.table(v, ['나간 INSERT 문'], [{ cls: '', cells: [{ v: sim.ins, cls: 'good' }] }], 'Hibernate가 만든 문장');
    H.counters(v, [[s.ins, '나간 INSERT'], [s.table ? s.rows : '-', '테이블의 행']]);
  },
  // 그림: 왼쪽에 Member 클래스(표시와 필드), 가운데에 JPA, 오른쪽에 테이블(열과 행). 표시와 필드가 JPA에 닿아야 열로 짝지어지고, 표시를 지우면 화살표가 JPA 앞에서 끊긴다.
  draw: function (P, sim, shown) {
    var c = sim.c, last = shown[shown.length - 1], s = last ? last.snap : null, cols = sim.cols;
    P.size(680, 326);
    var ph = s ? s.phase : '';
    P.region('lc', 14, 16, 190, 242, '우리가 작성한 클래스');
    P.box('ce', 24, 40, 170, 46, { cls: ph === 'new' ? 'hot now' : s && s.rd.ce === 'pass' ? 'wait' : 'plain', title: 'Member', sub: ph === 'new' ? '객체 1개 만듦' : c.ent ? '@Entity 표시' : '@Entity 표시 없음' });
    P.box('f1', 24, 94, 170, 46, { cls: c.idf ? 'wait' : 'plain', title: c.idf ? '@Id  id' : 'id', sub: 'Long' });
    P.box('f2', 24, 148, 170, 46, { cls: 'plain', title: 'name', sub: 'String' });
    if (c.extra) P.box('f3', 24, 202, 170, 46, { cls: 'plain', title: 'email', sub: 'String' });
    var jcls = !s ? 'ghost' : s.jpa === 'bad' ? 'bad' : s.jpa === 'ok' ? 'good' : ph === 'persist' || ph === 'commit' ? 'hot now' : s.jpa === 'read' ? 'hot now' : 'plain';
    P.box('jpa', 270, 40, 140, 208, { cls: jcls, title: 'JPA', sub: s ? s.jl : [' '] });
    // 왼쪽에서 JPA로: 표시가 닿으면 화살표, 끊기면 JPA 앞에서 멈춘다
    var ys = { ce: 63, id: 117, name: 171, email: 225 }, fr = { ce: 0.11, id: 0.37, name: 0.63, email: 0.89 }, bx = { ce: 'ce', id: 'f1', name: 'f2', email: 'f3' };
    ['ce', 'id', 'name', 'email'].forEach(function (k) {
      if (!s || !s.rd[k]) return;
      if (s.rd[k] === 'pass') P.arrow('in_' + k, bx[k] + ':r', 'jpa:l:' + fr[k], { cls: 'good' });
      else { P.arrow('in_' + k, bx[k] + ':r', [244, ys[k]], { cls: 'bad' }); P.text('x_' + k, 256, ys[k] + 5, '×', { cls: 'bad', anchor: 'middle', bold: true }); }
    });
    // 테이블: 열은 id가 먼저, 나머지는 이름 순으로 만들어진다(실행에서 관찰)
    P.region('rc', 466, 16, 200, 242, 'H2의 테이블');
    var made = !!(s && s.table);
    P.box('tt', 476, 40, 180, 46, { cls: made ? 'plain' : 'ghost', title: made ? 'Member 테이블' : '테이블 없음', sub: made ? (s.rows + '행') : ' ' });
    cols.forEach(function (n, i) {
      var y = 94 + i * 54;
      P.box('c' + i, 476, y, 180, 46, { cls: !made ? 'ghost' : s.row ? 'good' : ph === 'table' ? 'hot' : 'wait', title: made ? n : ' ', sub: made ? (s.row ? s.row[n] : '값 없음') : ' ' });
      if (made) {
        var from = n === 'id' ? 'id' : n === 'name' ? 'name' : 'email';
        P.arrow('out_' + n, 'jpa:r:' + fr[from], 'c' + i + ':l', { cls: ph === 'table' ? 'hot' : 'good' });
      }
    });
    P.box('n1', 14, 276, 322, 36, { cls: s && s.ins ? 'good' : 'ghost', title: '나간 INSERT', right: (s ? s.ins : 0) + '번' });
    P.box('n2', 344, 276, 322, 36, { cls: s && s.rows ? 'good' : 'ghost', title: '테이블의 행', right: !s ? '-' : s.table ? s.rows + '행' : '테이블 없음' });
  },
  assume: 'Hibernate 7.4.5와 H2 2.4.240(메모리 DB)에서 실행해 대조했습니다. 스프링은 쓰지 않고 Hibernate를 코드로 직접 시작했습니다(persistence.xml 없이 Configuration에 클래스를 등록). 여덟 가지 조합을 모두, 화면의 Member 소스와 같은 글(package와 import 줄만 더함)을 컴파일하고 자바 프로세스를 새로 띄워 확인했습니다. @Entity가 없는 조합에서도 같은 방식으로 Member를 등록했습니다. 화면의 "저장하는 쪽" 세 줄은 실제로는 main 안의 코드이고, EntityManager(em)를 얻는 줄, 예외를 잡아 기록하는 줄, 측정하는 줄은 화면에서 줄였습니다. 대조한 것은 JPA가 시작하다가 실패하는지와 예외의 종류, 시작 직후와 실행 뒤 H2에 있는 테이블과 열(INFORMATION_SCHEMA.COLUMNS), StatementInspector로 잡은 INSERT 문의 수와 글(persist 줄이 끝난 때와 commit 줄이 끝난 때), 실행 뒤 테이블의 행 수와 내용입니다. 테이블 이름은 H2가 MEMBER로, 열 이름은 ID, NAME, EMAIL로 저장하는데, 화면에는 읽기 쉽게 테이블 이름은 첫 글자만 대문자로, 열 이름은 소문자로 적었습니다. 열은 필드를 적은 순서대로 만들어지지 않았습니다(이 실행에서는 id, email, name 순서). 순서를 정하는 규칙은 확인하지 않았습니다. 문서가 정한 것은 Jakarta Persistence 3.2 명세 2.1절(엔티티 클래스는 @Entity를 갖고 public 또는 protected의 인자 없는 생성자를 가져야 하며 final이 아니어야 한다)과 2.4절(모든 엔티티에는 기본 키가 있어야 하고 단순한 기본 키는 필드에 @Id를 붙여 선언한다), Hibernate ORM 7.0 사용자 가이드 3.4절(Entity types)의 3.4.1, 3.4.3, 3.4.5, 3.4.6항(테이블 이름은 기본으로 엔티티 이름을 따르고, 필드에 @Id를 붙이면 필드 접근이다)입니다. 이 문서들은 WebFetch로 열었고, 돌려받은 것은 원문이 아니라 요약이어서 문장을 하나하나 원문과 대조하지는 못했습니다. 명세는 앞부분만(2.1절과 2.4절이 있는 앞 10만 자) 읽었습니다. 아래는 문서가 정한 것이 아니라 이 버전에서 관찰한 동작입니다. @Entity가 없는 클래스를 등록하면 오류 없이 시작을 마치고(JPA가 아는 엔티티는 없음) em.persist에서 IllegalArgumentException이 나며, 이때 @Id가 있어도 결과가 같습니다. @Entity는 있고 @Id가 없으면 시작할 때 AnnotationException이 나서 테이블이 만들어지지 않습니다(Hibernate 7.0 사용자 가이드 3.4.5항은 식별자를 생략하는 것이 예전에는 허용됐으나 폐지 예정이라고 하는데, 7.4.5에서는 오류였습니다). 테이블은 persist나 commit 때가 아니라 JPA가 시작할 때 만들어지며(hibernate.hbm2ddl.auto=create-drop 설정), INSERT 문은 persist 줄이 아니라 commit 줄에서 나갔습니다. 문장은 insert into Member (name,id) values (?,?) 모양이고 Hibernate 버전에 따라 글자가 다를 수 있으며, 그 INSERT가 persist 때 나가는지 commit 때 나가는지 같은 세부는 "영속성 컨텍스트" 실습에서 다룹니다. 화면의 코드에서 줄인 것은 package와 import 줄이고, 필드는 id, name, email만 다뤘습니다. 이름과 열의 짝을 바꾸는 @Table, @Column, 기본 키 값을 자동으로 만드는 @GeneratedValue, 접근자 메서드, 엔티티 클래스의 나머지 조건(final이 아니어야 한다 등)은 다루지 않았습니다. MySQL에서의 실행 대조는 하지 않았습니다.',
});

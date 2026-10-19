Lab.register({
  id: 'embedded', nav: '값 타입과 임베디드 타입', cat: 'JPA', mode: 'step',
  title: '주소를 묶은 클래스는 테이블에 어떻게 저장되고, 왜 불변으로 만드나',
  intro: '도시와 거리처럼 늘 함께 다니는 값은 Address 같은 클래스로 묶어 두면 다루기 쉽습니다. 이런 클래스는 id가 없고 들어 있는 값이 전부여서 값 타입이라고 부릅니다. 값 타입은 엔티티와 달리 혼자서는 저장되지 않고, 그것을 가진 엔티티에 딸려서 저장됩니다. 값 하나는 엔티티의 테이블에 컬럼으로 들어가고, 여러 개를 담은 컬렉션은 그 엔티티의 id를 외래 키로 가진 별도 테이블에 들어갑니다. 여기에서 생기는 세 가지 장면을 봅니다. 테이블이 어떤 모양이 되는지, 같은 값 객체를 두 엔티티가 함께 쓰면 무슨 일이 생기는지, 값 타입을 여러 개 담은 컬렉션을 고치면 어떤 SQL이 나가는지입니다. 이 실습의 Address와 Member는 예시로 만든 클래스입니다.',
  terms: ['값 타입', '임베디드 타입(@Embeddable)', '값 타입 컬렉션(@ElementCollection)', '불변 객체', '변경 감지(Dirty Checking)'],
  controls: [
    { id: 'sc', label: '볼 장면', type: 'select', value: 'share', options: [['table', '임베디드 타입이 테이블에 저장되는 모습'], ['share', '같은 주소 객체를 두 회원이 함께 쓸 때'], ['coll', '값 타입 컬렉션에서 주소 하나를 바꿀 때']] },
    { id: 'tb', label: 'Member에 주소를 두는 방법', type: 'select', value: 'emb', options: [['emb', '주소를 임베디드 타입 Address로 묶음'], ['plain', '묶지 않고 city, street 필드를 그대로 둠'], ['nul', 'Address로 묶고, 주소가 null인 회원을 저장'], ['two', 'Address를 두 번 씀 (집 주소, 회사 주소)'], ['twoov', 'Address를 두 번 쓰고 @AttributeOverride로 컬럼 이름을 바꿈']], show: function (c) { return c.sc === 'table'; } },
    { id: 'sh', label: '두 회원에게 주소를 넣고 고치는 방법', type: 'select', value: 'same', options: [['same', '같은 객체를 넣고 setCity로 고침'], ['copy', '복사한 객체를 넣고 setCity로 고침'], ['fixed', '불변 값 타입: 같은 객체를 넣고 새 객체로 갈아 끼움']], show: function (c) { return c.sc === 'share'; } },
    { id: 'ct', label: '값 타입 컬렉션의 종류', type: 'select', value: 'list', options: [['list', 'List<Address>'], ['set', 'Set<Address>'], ['setnn', 'Set<Address>이고 컬럼이 모두 NOT NULL'], ['order', 'List<Address>에 @OrderColumn']], show: function (c) { return c.sc === 'coll'; } },
    { id: 'op', label: '컬렉션에 하는 일', type: 'select', value: 'mod', options: [['mod', '주소 하나를 바꿈 (서울을 빼고 제주를 넣음)'], ['add', '주소 하나를 더함 (제주)'], ['del', '주소 하나를 뺌 (서울)']], show: function (c) { return c.sc === 'coll'; } },
    { id: 'n', label: '이미 저장돼 있는 주소의 수', type: 'range', min: 2, max: 5, value: 3, step: 1, fmt: function (v) { return v + '개'; }, show: function (c) { return c.sc === 'coll'; } },
  ],
  presets: [
    { t: '처음 설정으로', q: '같은 Address 객체를 두 회원에게 넣고 setCity로 고치면 DB의 행은 어떻게 되나', d: '회원1의 도시만 고쳤는데 회원2의 행까지 UPDATE됩니다.', v: { sc: 'share', tb: 'emb', sh: 'same', ct: 'list', op: 'mod', n: 3 } },
    { t: '복사해서 넣으면', q: '같은 객체 대신 복사한 객체를 넣고 setCity로 고치면', d: '객체가 따로이므로 회원1의 행만 UPDATE됩니다.', v: { sc: 'share', tb: 'emb', sh: 'copy', ct: 'list', op: 'mod', n: 3 } },
    { t: '값 타입을 불변으로 만들면', q: 'Address를 불변으로 만들고 member1.setAddress에 새 Address 객체를 갈아 끼우면', d: '필드가 private이고 setter가 없어서, Address 밖의 코드는 함께 쓰는 객체를 고칠 방법이 없습니다.', v: { sc: 'share', tb: 'emb', sh: 'fixed', ct: 'list', op: 'mod', n: 3 } },
    { t: '임베디드 타입의 테이블', q: '임베디드 타입 Address를 가진 김철수를 persist하면', d: 'Address 테이블은 생기지 않고 member 테이블의 컬럼이 됩니다.', v: { sc: 'table', tb: 'emb', sh: 'same', ct: 'list', op: 'mod', n: 3 } },
    { t: '같은 값 타입을 두 번 쓰면', q: 'Address를 homeAddress와 workAddress로 두 번 쓰고 컬럼 이름을 바꾸지 않으면', d: '컬럼 이름이 겹쳐서 시작할 때 예외가 납니다.', v: { sc: 'table', tb: 'two', sh: 'same', ct: 'list', op: 'mod', n: 3 } },
    { t: '값 타입 컬렉션에서 하나만 바꾸면', q: '이미 주소 3개가 저장된 값 타입 컬렉션 List에서 서울을 빼고 제주를 넣으면', d: '그 회원의 주소를 전부 지우고 다시 넣습니다.', v: { sc: 'coll', tb: 'emb', sh: 'same', ct: 'list', op: 'mod', n: 3 } },
    { t: 'Set이고 컬럼이 모두 NOT NULL이면', q: '컬렉션이 List가 아니라 컬럼이 모두 NOT NULL인 Set인데 서울을 빼고 제주를 넣으면', d: '바뀐 행 하나만 지우고 넣습니다.', v: { sc: 'coll', tb: 'emb', sh: 'same', ct: 'setnn', op: 'mod', n: 3 } },
  ],
  CITY: ['서울', '부산', '대구', '광주', '인천'],
  // 장면마다 실행되는 코드 줄
  lines: function (c) {
    if (c.sc === 'table') {
      var first = c.tb === 'plain' ? 'Member member = new Member("김철수", "서울", "강남대로");' : c.tb === 'nul' ? 'Member member = new Member("김철수", null);' : c.tb === 'emb' ? 'Member member = new Member("김철수", new Address("서울", "강남대로"));' : 'Member member = new Member("김철수", new Address("서울", "강남대로"), new Address("성남", "판교로"));';
      var L = ['// 애플리케이션이 시작할 때 Hibernate가 테이블을 만든다', first, 'em.persist(member);', '// 트랜잭션 커밋'];
      if (c.tb === 'emb' || c.tb === 'nul') L.push('Member found = em.find(Member.class, 1L);    // 새 트랜잭션에서', 'Address address = found.getAddress();');
      return L;
    }
    if (c.sc === 'share') return ['Address addr = new Address("서울", "강남대로");', 'Member member1 = new Member("회원1", addr);',
      c.sh === 'copy' ? 'Member member2 = new Member("회원2", new Address(addr.getCity(), addr.getStreet()));' : 'Member member2 = new Member("회원2", addr);',
      'em.persist(member1);', 'em.persist(member2);',
      c.sh === 'fixed' ? 'member1.setAddress(new Address("부산", addr.getStreet()));' : 'member1.getAddress().setCity("부산");', '// 트랜잭션 커밋'];
    var out = ['Member member = em.find(Member.class, 1L);'];
    if (c.op !== 'add') out.push('member.getHistory().remove(new Address("서울", "1번길"));');
    if (c.op !== 'del') out.push('member.getHistory().add(new Address("제주", "9번길"));');
    out.push('// 트랜잭션 커밋');
    return out;
  },
  code: function (c) {
    var id = '    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)\n    Long id;\n    String name;\n', run = this.lines(c).join('\n'), s;
    if (c.sc === 'table') {
      if (c.tb === 'plain') return '@Entity\nclass Member {\n' + id + '    String city;                 // 주소를 묶지 않고 그대로 둔다\n    String street;\n}\n// 생성자는 줄였습니다\n\n' + run;
      s = '@Embeddable                      // 값 타입. 자기 테이블이 없다\nclass Address {\n    String city;\n    String street;\n}\n\n@Entity\nclass Member {\n' + id + '\n';
      if (c.tb === 'emb' || c.tb === 'nul') s += '    @Embedded\n    Address address;\n';
      else s += '    @Embedded\n    Address homeAddress;         // 집 주소\n\n    @Embedded\n' + (c.tb === 'twoov' ? '    @AttributeOverrides({\n        @AttributeOverride(name = "city", column = @Column(name = "work_city")),\n        @AttributeOverride(name = "street", column = @Column(name = "work_street"))\n    })\n' : '') + '    Address workAddress;         // 회사 주소' + (c.tb === 'two' ? ' (컬럼 이름을 바꾸지 않았다)' : '') + '\n';
      return s + '}\n// 생성자와 getter는 줄였습니다\n\n' + run;
    }
    if (c.sc === 'share') {
      s = '@Embeddable\nclass Address {\n' + (c.sh === 'fixed' ? '    private String city;      // 필드는 private이고 setter가 없다\n    private String street;\n    // 값을 바꾸려면 새 객체를 만들어야 한다 (불변)\n' : '    String city;\n    String street;\n\n    void setCity(String city) { this.city = city; }   // 값을 고칠 수 있다\n') + '}\n\n@Entity\nclass Member {\n' + id + '\n    @Embedded\n    Address address;\n}\n// 생성자와 getter' + (c.sh === 'fixed' ? ', Member의 setAddress는' : '는') + ' 줄였습니다\n\n// 트랜잭션 안에서\n';
      return s + run;
    }
    var nn = c.ct === 'setnn', set = c.ct === 'set' || nn;
    s = '@Embeddable\nclass Address {\n' + (nn ? '    @Column(nullable = false)\n    String city;\n    @Column(nullable = false)\n    String street;\n' : '    String city;\n    String street;\n') + '    // equals와 hashCode는 city와 street를 비교하도록 재정의했습니다\n}\n\n@Entity\nclass Member {\n' + id + '\n    @ElementCollection\n    @CollectionTable(name = "address_history",\n            joinColumns = @JoinColumn(name = "member_id"))\n' + (c.ct === 'order' ? '    @OrderColumn(name = "idx")   // 목록에서의 순서를 컬럼으로 저장한다\n' : '') + (set ? '    Set<Address> history = new HashSet<>();\n' : '    List<Address> history = new ArrayList<>();\n') + '}\n// 생성자와 getter는 줄였습니다\n\n';
    return s + '// 회원 1에게 주소 ' + (+c.n) + '개(' + this.CITY.slice(0, +c.n).join(', ') + ')가 저장돼 있습니다\n// 트랜잭션 안에서\n' + run;
  },
  label: function (c) {
    if (c.sc === 'table') return '테이블 모양 · ' + { emb: '임베디드 타입', plain: '묶지 않음', nul: '주소가 null', two: 'Address 두 번', twoov: 'Address 두 번 + 컬럼 이름 바꿈' }[c.tb];
    if (c.sc === 'share') return '함께 쓰기 · ' + { same: '같은 객체 + setCity', copy: '복사한 객체 + setCity', fixed: '불변 + 새 객체로 교체' }[c.sh];
    return '컬렉션 · ' + { list: 'List', set: 'Set', setnn: 'Set + NOT NULL', order: 'List + @OrderColumn' }[c.ct] + ' · ' + { mod: '하나 바꿈', add: '하나 더함', del: '하나 뺌' }[c.op] + ' · 주소 ' + (+c.n) + '개';
  },
  columns: ['만들어진 테이블', '나간 쓰기 SQL', 'DB에 남은 값'],
  kinds: function (sent) {
    var m = {}, order = [];
    sent.forEach(function (q) { if (q.kind === 'select') return; var k = q.kind.toUpperCase(); if (!m[k]) { m[k] = 0; order.push(k); } m[k]++; });
    return order.length ? order.map(function (k) { return k + ' ' + m[k] + '번'; }).join(', ') : '없음';
  },
  simulate: function (c) { return c.sc === 'table' ? this.simTable(c) : c.sc === 'share' ? this.simShare(c) : this.simColl(c); },
  simTable: function (c) {
    var tb = c.tb, L = this.lines(c), ev = [], sum = [], two = tb === 'two' || tb === 'twoov', emb = tb === 'emb' || tb === 'nul';
    var cols = tb === 'twoov' ? ['id', 'name', 'city', 'street', 'work_city', 'work_street'] : ['id', 'name', 'city', 'street'];
    var st = { line: -2, made: false, err: '', obj: false, db: [], sent: [], read: '', hot: false };
    function push(line, s, k) { st.line = line; ev.push({ s: s, k: k, snap: JSON.parse(JSON.stringify(st)) }); st.hot = false; }
    var readSent = [], loaded = '-';
    if (tb === 'two') {
      push(0, '애플리케이션 시작, 매핑 읽기: homeAddress도 workAddress도 Address 타입입니다. 임베디드 타입의 필드는 엔티티의 테이블에 컬럼으로 펼쳐지므로, 둘 다 member 테이블에 city와 street라는 컬럼을 만들려고 합니다.', '');
      st.err = 'MappingException';
      push(0, '컬럼 이름이 겹칩니다: 한 테이블에 city라는 컬럼이 두 번 나올 수 없습니다. Hibernate가 MappingException을 던지고 애플리케이션은 시작되지 못합니다. 테이블도 만들어지지 않고, 아래 코드는 실행되지 않습니다.', 'bad');
      sum.push('임베디드 타입은 컬럼 이름까지 함께 가져옵니다. 같은 값 타입을 한 엔티티에 두 번 쓰려면 한쪽의 컬럼 이름을 @AttributeOverride로 바꿔 주어야 합니다.');
      return { events: ev, summary: sum, L: L, tables: [], sent: [], readSent: [], error: 'MappingException', loaded: '-', dbRow: [], cols: cols, row: ['만들어지지 않음', '없음', '시작할 때 MappingException (city 컬럼이 겹침)'] };
    }
    st.made = true;
    push(0, tb === 'plain' ? '애플리케이션 시작, 테이블 만들기: Member의 필드 네 개(id, name, city, street)가 그대로 member 테이블의 컬럼 네 개가 됩니다.'
      : emb ? '애플리케이션 시작, 테이블 만들기: Address에는 @Entity가 아니라 @Embeddable이 붙어 있습니다. 그래서 address라는 테이블은 만들어지지 않고, Address의 city와 street 필드가 member 테이블의 컬럼으로 펼쳐집니다. 테이블은 member 하나뿐입니다.'
      : '애플리케이션 시작, 테이블 만들기: homeAddress의 필드는 city와 street 컬럼이 되고, workAddress의 필드는 @AttributeOverride에 적은 대로 work_city와 work_street 컬럼이 됩니다. 이름이 겹치지 않으므로 member 테이블 하나에 컬럼 여섯 개가 만들어집니다.', emb || two ? 'good' : '');
    st.obj = true;
    push(1, tb === 'plain' ? 'new Member("김철수", "서울", "강남대로"): Member 객체 하나를 만듭니다. 이름과 도시, 거리가 모두 Member의 필드입니다.'
      : tb === 'nul' ? 'new Member("김철수", null): Member 객체를 만들면서 주소 자리에 null을 넣습니다. Address 객체는 만들어지지 않았습니다.'
      : tb === 'emb' ? 'new Member("김철수", new Address("서울", "강남대로")): 자바에서는 Member 객체와 Address 객체가 따로 만들어지고, Member가 address 필드로 Address를 가리킵니다.'
      : 'new Member(...): Member 객체 하나와 Address 객체 둘(집 주소, 회사 주소)이 만들어집니다.', '');
    var row = tb === 'nul' ? ['1', '김철수', 'null', 'null'] : tb === 'twoov' ? ['1', '김철수', '서울', '강남대로', '성남', '판교로'] : ['1', '김철수', '서울', '강남대로'];
    st.db = [row]; st.hot = true; st.sent.push({ kind: 'insert', table: 'member', sql: 'insert into member (' + cols.slice(1).join(', ') + ') values (' + row.slice(1).map(function (x) { return x === 'null' ? 'null' : "'" + x + "'"; }).join(', ') + ')', at: '3번째 줄' });
    push(2, 'em.persist(member): INSERT가 한 번 나갑니다. ' + (tb === 'plain' ? '네 컬럼의 값이 member 테이블의 한 행으로 들어갑니다.' : tb === 'nul' ? 'address가 null이므로 city와 street 컬럼에는 null이 들어갑니다.' : tb === 'emb' ? '회원의 이름과 Address의 city, street가 member 테이블의 한 행으로 함께 들어갑니다. Address를 위한 INSERT는 따로 없습니다.' : '회원의 이름과 두 주소의 값이 member 테이블의 한 행으로 함께 들어갑니다.'), tb === 'nul' ? '' : 'good');
    push(3, '트랜잭션 커밋: 기본 키가 IDENTITY 전략이어서 INSERT는 이미 나갔습니다. 더 보낼 SQL이 없습니다.', '');
    if (emb) {
      readSent.push({ kind: 'select', table: 'member' }); st.sent.push({ kind: 'select', table: 'member', sql: 'select * from member where id = 1', at: '5번째 줄' });
      push(4, 'em.find(Member.class, 1L): 새 트랜잭션에서 SELECT 한 번으로 member 테이블의 한 행을 읽습니다. 조인은 없습니다. 주소가 같은 행에 들어 있기 때문입니다.', '');
      loaded = tb === 'nul' ? 'null' : '서울/강남대로'; st.read = tb === 'nul' ? 'null' : 'Address(서울, 강남대로)';
      push(5, tb === 'nul' ? 'found.getAddress(): 읽어 온 행에서 임베디드 타입의 컬럼(city, street)이 모두 null입니다. 이럴 때 Hibernate는 빈 Address 객체를 만들지 않고 address 필드 자체를 null로 둡니다. found.getAddress().getCity()처럼 바로 이어서 부르면 NullPointerException이 납니다.' : 'found.getAddress(): 읽어 온 행의 city와 street 값으로 Address 객체를 다시 만들고, address 필드가 그 객체를 가리키게 합니다. 그 객체의 값은 서울, 강남대로입니다.', tb === 'nul' ? 'bad' : 'good');
    }
    if (tb === 'emb') sum.push('임베디드 타입은 자바에서만 따로 묶인 클래스이고, 테이블에서는 엔티티의 컬럼일 뿐입니다. "묶지 않고 그대로 둠"으로 바꿔 보면 테이블과 SQL이 똑같습니다. 코드에서는 주소와 관련된 값과 메서드를 한곳에 모을 수 있어서 읽기 쉬워집니다.');
    if (tb === 'plain') sum.push('필드를 그대로 둔 경우입니다. "임베디드 타입 Address로 묶음"과 비교해 보면 테이블 모양과 나가는 SQL이 똑같습니다. 임베디드 타입은 테이블을 바꾸지 않고 자바 쪽 코드만 정리해 줍니다.');
    if (tb === 'nul') sum.push('임베디드 타입 필드가 null이면 그 컬럼들이 모두 null로 저장됩니다. 다시 읽을 때는 컬럼이 모두 null이므로 address 필드가 null로 돌아옵니다. 주소가 없을 수 있는 엔티티에서는 getAddress()의 결과가 null인지 확인해야 합니다.');
    if (tb === 'twoov') sum.push('같은 값 타입을 두 번 쓸 때는 @AttributeOverride로 한쪽의 컬럼 이름을 바꿉니다. 그래도 테이블은 여전히 member 하나이고, 컬럼만 늘어납니다.');
    return { events: ev, summary: sum, L: L, tables: [{ name: 'member', cols: cols }], sent: st.sent.filter(function (q) { return q.kind !== 'select'; }), before: 1, readSent: readSent, error: '', loaded: loaded, dbRow: row, cols: cols,
      row: ['member (' + cols.join(', ') + ')', this.kinds(st.sent), row.slice(1).join(', ') + (tb === 'nul' ? ' (다시 읽으면 address가 null)' : '')] };
  },
  simShare: function (c) {
    var sh = c.sh, L = this.lines(c), ev = [], sum = [], cols = ['id', 'name', 'city', 'street'];
    // objs: 메모리의 Address 객체들. m1, m2: 각 회원이 가리키는 객체의 이름
    var st = { line: -2, objs: [], m1: '', m2: '', has1: false, has2: false, db: [], sent: [], hot: [] };
    function push(line, s, k) { st.line = line; ev.push({ s: s, k: k, snap: JSON.parse(JSON.stringify(st)) }); st.hot = []; }
    function obj(n) { for (var i = 0; i < st.objs.length; i++) if (st.objs[i].n === n) return st.objs[i]; }
    st.objs.push({ n: 'A', city: '서울', street: '강남대로', y: sh === 'copy' ? 50 : 100 });
    push(0, 'new Address("서울", "강남대로"): 주소 값 객체를 하나 만듭니다. 변수 addr이 이 객체를 가리킵니다.', '');
    st.has1 = true; st.m1 = 'A';
    push(1, 'new Member("회원1", addr): 회원1의 address 필드가 addr과 같은 객체를 가리킵니다. 객체가 복사된 것이 아니라, 같은 객체를 가리키는 참조가 하나 더 생긴 것입니다.', '');
    st.has2 = true;
    if (sh === 'copy') {
      st.objs.push({ n: 'B', city: '서울', street: '강남대로', y: 150 }); st.m2 = 'B';
      push(2, 'new Member("회원2", new Address(...)): addr의 값을 꺼내 새 Address 객체를 하나 더 만들어 회원2에게 줍니다. 값은 같지만 서로 다른 객체입니다.', 'good');
    } else {
      st.m2 = 'A';
      push(2, 'new Member("회원2", addr): 회원2의 address 필드도 같은 객체를 가리킵니다. 이제 주소 객체 하나를 두 회원이 함께 쓰고 있습니다.', sh === 'same' ? 'bad' : '');
    }
    st.db.push(['1', '회원1', '서울', '강남대로']); st.hot = [0]; st.sent.push({ kind: 'insert', table: 'member', sql: "insert into member (name, city, street) values ('회원1', '서울', '강남대로')", at: '4번째 줄' });
    push(3, 'em.persist(member1): INSERT가 나가 회원1의 행이 저장됩니다. 주소의 값은 member 테이블의 city, street 컬럼에 들어갑니다.', '');
    st.db.push(['2', '회원2', '서울', '강남대로']); st.hot = [1]; st.sent.push({ kind: 'insert', table: 'member', sql: "insert into member (name, city, street) values ('회원2', '서울', '강남대로')", at: '5번째 줄' });
    push(4, 'em.persist(member2): INSERT가 나가 회원2의 행이 저장됩니다. 테이블에서는 두 행이 각자 city와 street 값을 따로 가지고 있습니다. 객체를 함께 쓴다는 사실은 테이블에 남지 않습니다.', '');
    if (sh === 'fixed') {
      st.objs.push({ n: 'C', city: '부산', street: '강남대로', y: 50 }); st.m1 = 'C';
      push(5, 'member1.setAddress(new Address("부산", ...)): Address에는 setCity가 없고 필드도 private이어서, Address 밖의 코드는 그 객체의 값을 고칠 수 없습니다. 도시를 바꾸려면 새 Address 객체를 만들어 회원1의 address를 통째로 갈아 끼워야 합니다. 회원2는 여전히 예전 객체(서울)를 가리킵니다.', 'good');
    } else {
      obj('A').city = '부산';
      push(5, sh === 'same' ? 'member1.getAddress().setCity("부산"): 회원1의 주소만 바꾸려는 코드입니다. 하지만 고친 것은 두 회원이 함께 쓰는 그 객체입니다. member2.getAddress().getCity()도 이제 "부산"입니다.' : 'member1.getAddress().setCity("부산"): 회원1이 가리키는 객체의 city만 바뀝니다. 회원2는 다른 객체를 가리키므로 그대로 "서울"입니다.', sh === 'same' ? 'bad' : '');
    }
    st.db[0][2] = '부산'; st.hot = [0]; st.sent.push({ kind: 'update', table: 'member', sql: "update member set city = '부산', street = '강남대로' where id = 1", at: '커밋 직전' });
    push(6, '트랜잭션 커밋, 변경 감지: 커밋 직전에 JPA가 관리 중인 엔티티의 현재 값을 처음 저장한 값과 비교합니다. 회원1의 city가 서울에서 부산으로 달라졌으므로 회원1의 행에 UPDATE가 나갑니다.', '');
    if (sh === 'same') {
      st.db[1][2] = '부산'; st.hot = [1]; st.sent.push({ kind: 'update', table: 'member', sql: "update member set city = '부산', street = '강남대로' where id = 2", at: '커밋 직전' });
      push(6, '회원2도 비교합니다: 회원2의 address가 가리키는 객체도 같은 객체이므로 city가 부산으로 달라져 있습니다. 회원2의 행에도 UPDATE가 나갑니다. 고치려던 것은 회원1뿐인데 회원2의 주소까지 바뀌었습니다.', 'bad');
    } else push(6, '회원2도 비교합니다: 회원2의 address는 값이 그대로(서울)입니다. 달라진 것이 없으므로 UPDATE가 나가지 않습니다.', 'good');
    if (sh === 'same') sum.push('값 타입 객체 하나를 두 엔티티가 함께 가리키면, 한쪽에서 고친 값이 다른 쪽에도 그대로 보입니다. JPA는 두 엔티티가 모두 달라졌다고 보고 UPDATE를 2번 보냅니다. 컴파일 오류도 예외도 없어서 찾기 어려운 버그가 됩니다.', '자바에서는 객체를 변수에 넣거나 넘길 때 객체가 복사되지 않고 참조만 복사됩니다. 그래서 "함께 쓰지 않도록 조심한다"는 것만으로는 막기 어렵습니다.');
    if (sh === 'copy') sum.push('값을 복사해 새 객체를 만들어 넣으면 두 회원이 서로 다른 객체를 가리키므로 안전합니다. 하지만 누군가 복사를 빠뜨리고 같은 객체를 넣어도 컴파일러는 막아 주지 않습니다. 실수할 수 없게 하려면 값 타입을 불변으로 만듭니다.');
    if (sh === 'fixed') sum.push('값 타입의 필드를 private으로 두고 setter를 만들지 않으면(불변 객체) 같은 객체를 여러 엔티티가 함께 가리켜도 문제가 없습니다. Address 밖의 코드는 그 객체를 고칠 수 없기 때문입니다. 값을 바꾸려면 새 객체를 만들어 갈아 끼우게 되고, 갈아 끼운 엔티티의 행만 UPDATE됩니다.', '그래서 값 타입은 불변으로 만드는 것이 원칙입니다. 필드는 private으로 두고, 생성자로만 값을 넣고, setter는 만들지 않습니다.');
    var shared = st.m1 === st.m2;
    return { events: ev, summary: sum, L: L, tables: [{ name: 'member', cols: cols }], sent: st.sent, before: 2, shared: shared, db: st.db, cols: cols,
      row: ['member (' + cols.join(', ') + ')', this.kinds(st.sent), '회원1 ' + st.db[0][2] + ', 회원2 ' + st.db[1][2]] };
  },
  simColl: function (c) {
    var ct = c.ct, op = c.op, n = +c.n, L = this.lines(c), ev = [], sum = [], order = ct === 'order', recreate = ct === 'list' || ct === 'set', CITY = this.CITY, i;
    var cols = order ? ['member_id', 'idx', 'city', 'street'] : ['member_id', 'city', 'street'];
    var list = []; for (i = 0; i < n; i++) list.push({ k: 'v' + i, city: CITY[i], street: (i + 1) + '번길' });
    // db: address_history의 행 { k, idx, city, street }. mem: 메모리의 컬렉션(읽기 전에는 null)
    var st = { line: -2, mem: null, db: list.map(function (a, j) { return { k: order ? 'i' + j : a.k, idx: j, city: a.city, street: a.street }; }), sent: [], hot: [] };
    var init = JSON.parse(JSON.stringify(st));
    function push(line, s, k) { st.line = line; ev.push({ s: s, k: k, snap: JSON.parse(JSON.stringify(st)) }); st.hot = []; }
    function send(kind, table, sql, when, all) { st.sent.push({ kind: kind, table: table, sql: sql, at: when, all: !!all }); }
    var last = L.length - 1;
    send('select', 'member', 'select * from member where id = 1', '1번째 줄');
    push(0, 'em.find(Member.class, 1L): SELECT로 회원 1을 읽습니다. 값 타입 컬렉션은 지연 로딩이 기본이어서, 주소 목록(address_history 테이블)은 아직 읽지 않았습니다.', '');
    send('select', 'address_history', 'select * from address_history where member_id = 1', '2번째 줄');
    st.mem = list.map(function (a) { return { k: a.k, city: a.city, street: a.street }; });
    push(1, 'member.getHistory(): 컬렉션을 처음 쓰는 순간 SELECT가 나가 address_history 테이블에서 이 회원의 주소 ' + n + '개를 읽어 옵니다.', '');
    var line = 1;
    if (op !== 'add') {
      st.mem.shift(); list.shift();
      push(line, 'remove(new Address("서울", "1번길")): 메모리의 컬렉션에서 값이 같은 주소를 뺍니다. 값 타입에는 id가 없으므로 "값이 같은 것"을 equals로 찾아서 뺍니다. SQL은 아직 나가지 않습니다.', '');
      line++;
    }
    if (op !== 'del') {
      st.mem.push({ k: 'v9', city: '제주', street: '9번길' }); list.push({ k: 'v9', city: '제주', street: '9번길' });
      push(line, 'add(new Address("제주", "9번길")): 메모리의 컬렉션에 새 주소를 넣습니다. ' + (op === 'mod' ? '값 타입은 들어 있는 값을 고치는 대신, 예전 값을 빼고 새 값을 넣는 식으로 바꿉니다. ' : '') + 'SQL은 아직 나가지 않습니다.', '');
    }
    var before = st.sent.length, size = list.length, what = { mod: '바꾼 것은 주소 하나인데', add: '주소 하나를 더했을 뿐인데', del: '주소 하나를 뺐을 뿐인데' }[op];
    function dbFromList(hot) { st.db = list.map(function (a, j) { return { k: order ? 'i' + j : a.k, idx: j, city: a.city, street: a.street }; }); st.hot = hot ? st.db.map(function (r) { return r.k; }) : []; }
    if (recreate) {
      st.db = []; send('delete', 'address_history', 'delete from address_history where member_id = 1', '커밋 직전', true);
      push(last, '트랜잭션 커밋, DELETE: ' + (ct === 'list' ? '값 타입에는 id가 없고 List에는 순서를 적어 둔 컬럼도 없습니다. DB의 어느 행이 바뀐 주소인지 집어낼 방법이 없습니다.' : 'Set이지만 city와 street 컬럼이 null을 허용합니다. null일 수 있는 값으로는 "이 행"이라고 정확히 집어내는 조건을 만들 수 없습니다.') + ' 그래서 조건을 member_id 하나만 두고, 이 회원의 주소 행을 전부 지웁니다.', 'bad');
      for (i = 0; i < size; i++) send('insert', 'address_history', "insert into address_history (member_id, city, street) values (1, '" + list[i].city + "', '" + list[i].street + "')", '커밋 직전');
      dbFromList(true);
      push(last, 'INSERT ' + size + '번: 지금 컬렉션에 들어 있는 주소 ' + size + '개를 하나씩 전부 다시 넣습니다. ' + what + ' DELETE 1번과 INSERT ' + size + '번이 나갔습니다.', 'bad');
    } else if (ct === 'setnn') {
      if (op !== 'add') {
        st.db = st.db.filter(function (r) { return r.city !== '서울'; }); send('delete', 'address_history', "delete from address_history where member_id = 1 and city = '서울' and street = '1번길'", '커밋 직전');
        push(last, '트랜잭션 커밋, DELETE: city와 street가 모두 NOT NULL이므로 (member_id, city, street) 세 값으로 행 하나를 정확히 집어낼 수 있습니다. "회원 1의 서울 1번길" 행 하나만 지웁니다.', 'good');
      }
      if (op !== 'del') {
        send('insert', 'address_history', "insert into address_history (member_id, city, street) values (1, '제주', '9번길')", '커밋 직전'); dbFromList(false); st.hot = ['v9'];
        push(last, (op === 'add' ? '트랜잭션 커밋, ' : '') + 'INSERT 1번: 새로 넣은 "제주 9번길" 한 행만 넣습니다. 나머지 행은 건드리지 않습니다.', 'good');
      }
    } else {
      // 순서 컬럼이 있으면 (member_id, idx)로 행을 집어낸다: 길이가 줄면 뒤쪽 idx를 지우고, 같은 idx에서 내용이 달라진 행은 UPDATE, 늘어난 idx는 INSERT
      var old = st.db.slice(), changed = [], removed = [];
      for (i = size; i < old.length; i++) removed.push(i);
      for (i = 0; i < Math.min(size, old.length); i++) if (old[i].city !== list[i].city) changed.push(i);
      if (removed.length) {
        removed.forEach(function (x) { send('delete', 'address_history', 'delete from address_history where member_id = 1 and idx = ' + x, '커밋 직전'); });
        st.db = st.db.slice(0, size);
        push(last, '트랜잭션 커밋, DELETE: 순서 컬럼 idx가 있어서 (member_id, idx)로 행 하나를 집어낼 수 있습니다. 목록이 하나 짧아졌으므로 맨 뒤 번호인 idx ' + removed[0] + '번 행을 지웁니다. 서울이 들어 있던 idx 0번 행을 지우는 것이 아닙니다. 행의 내용은 다음 단계의 UPDATE로 맞춥니다.', '');
      }
      if (changed.length) {
        changed.forEach(function (x) { send('update', 'address_history', "update address_history set city = '" + list[x].city + "', street = '" + list[x].street + "' where member_id = 1 and idx = " + x, '커밋 직전'); });
        dbFromList(false); st.hot = changed.map(function (x) { return 'i' + x; });
        push(last, (removed.length ? '' : '트랜잭션 커밋, ') + 'UPDATE ' + changed.length + '번: ' + (removed.length ? '' : '순서 컬럼 idx가 있어서 (member_id, idx)로 행 하나를 집어낼 수 있습니다. ') + '맨 앞의 서울을 빼자 뒤의 주소들이 한 칸씩 앞으로 당겨졌습니다' + (op === 'mod' ? '(맨 뒤 자리에는 제주가 들어갑니다)' : '') + '. ' + (changed.length > 1 ? 'idx ' + changed[0] + '번부터 ' + changed[changed.length - 1] + '번까지 행마다' : 'idx ' + changed[0] + '번 행에') + ' 들어 있어야 할 주소가 달라졌으므로, UPDATE로 내용을 고칩니다.', 'bad');
      }
      if (size > old.length) {
        send('insert', 'address_history', "insert into address_history (member_id, idx, city, street) values (1, " + (size - 1) + ", '제주', '9번길')", '커밋 직전'); dbFromList(false); st.hot = ['i' + (size - 1)];
        push(last, '트랜잭션 커밋, INSERT 1번: 순서 컬럼 idx가 있어서 행을 구분할 수 있습니다. 맨 뒤에 붙은 "제주 9번길"을 idx ' + (size - 1) + '번 행으로 하나만 넣습니다.', 'good');
      }
    }
    var wr = this.kinds(st.sent), tables = [{ name: 'member', cols: ['id', 'name'] }, { name: 'address_history', cols: cols }];
    if (recreate) sum.push((ct === 'list' ? 'List로' : 'Set으로') + ' 둔 값 타입 컬렉션은 하나만 바뀌어도 그 엔티티의 행을 모두 지우고(DELETE 1번) 지금 있는 것을 전부 다시 넣습니다(INSERT ' + size + '번). 주소의 수를 늘려 보면 INSERT도 그만큼 늘어납니다.' + (ct === 'set' ? ' Set으로 바꿔도 컬럼이 null을 허용하면 List와 결과가 같습니다.' : ''), '값 타입 컬렉션은 값이 몇 개 안 되고 잘 바뀌지 않을 때 씁니다. 자주 바뀌거나 개수가 많으면 주소를 id가 있는 엔티티로 만들어 일대다 관계로 푸는 방법을 씁니다.');
    if (ct === 'setnn') sum.push('Set이고 값 타입의 모든 컬럼이 NOT NULL이면, 행 하나를 모든 컬럼의 값으로 집어낼 수 있어서 바뀐 행만 지우고 넣습니다.');
    if (order) sum.push(op === 'add' ? '@OrderColumn이 있으면 (member_id, idx)로 행을 구분할 수 있어서, 맨 뒤에 더할 때는 INSERT 한 번으로 끝납니다.' : '@OrderColumn이 있으면 전부 지우지는 않습니다. 하지만 맨 앞의 주소를 빼면 뒤의 주소들이 모두 한 칸씩 당겨져서, 내용이 달라진 행마다 UPDATE가 나갑니다(이번에는 ' + st.sent.filter(function (q) { return q.kind === 'update'; }).length + '번). 주소의 수를 늘리면 UPDATE도 늘어납니다.');
    return { events: ev, summary: sum, L: L, init: init, tables: tables, seed: [{ kind: 'insert', table: 'member', n: 1 }, { kind: 'insert', table: 'address_history', n: n }], sent: st.sent, afterFind: 1, before: before, order: order, final: st.db, cols: cols,
      row: ['member (id, name), address_history (' + cols.join(', ') + ')', wr, list.map(function (a) { return a.city; }).join(', ')] };
  },
  codeTable: function (v, H, L, line) {
    H.table(v, ['줄', '코드', ''], L.map(function (l, i) { var on = i === line; return { cells: [String(i + 1), { v: l, cls: on ? 'hot' : '' }, on ? '← 지금' : ''] }; }), '실행 중인 코드');
  },
  sqlTable: function (v, H, sent) {
    if (sent.length) H.table(v, ['#', 'SQL', '나간 시점'], sent.map(function (q, i) { return { cells: [String(i + 1), { v: q.sql, cls: q.kind === 'delete' || q.kind === 'update' ? 'hot' : '' }, q.at] }; }), 'DB로 나간 SQL');
  },
  render: function (v, sim, t, H, shown) {
    var c = sim.c, last = shown[shown.length - 1], s;
    if (c.sc === 'table') {
      s = last ? last.snap : { line: -2, made: false, err: '', obj: false, db: [], sent: [], read: '' };
      this.codeTable(v, H, sim.L, s.line);
      if (c.tb === 'emb' || c.tb === 'nul') H.counters(v, [[s.sent.filter(function (q) { return q.kind === 'insert'; }).length, 'INSERT']]);
      if (s.err) return;
      this.sqlTable(v, H, s.sent);
      if (!s.made) H.text(v, '실행을 누르면 테이블이 만들어지는 것부터 한 단계씩 진행합니다.');
      return;
    }
    if (c.sc === 'share') {
      s = last ? last.snap : { line: -2, objs: [], m1: '', m2: '', has1: false, has2: false, db: [], sent: [], hot: [] };
      this.codeTable(v, H, sim.L, s.line);
      var ups = s.sent.filter(function (q) { return q.kind === 'update'; }).length;
      H.counters(v, [[s.sent.length - ups, 'INSERT']]);
      this.sqlTable(v, H, s.sent);
      return;
    }
    s = last ? last.snap : sim.init;
    this.codeTable(v, H, sim.L, s.line);
    this.sqlTable(v, H, s.sent);
  },
  // 그림: 장면마다 다르다. 왼쪽은 자바 객체, 오른쪽은 DB. (1) Address가 member 테이블의 컬럼으로 펼쳐지는 모습 (2) 두 회원이 가리키는 Address 객체와 UPDATE되는 행 (3) 메모리의 컬렉션과 address_history의 행
  draw: function (P, sim, shown) {
    var c = sim.c, last = shown[shown.length - 1], s;
    if (c.sc === 'table') {
      s = last ? last.snap : { made: false, err: '', obj: false, db: [], sent: [], read: '' };
      var tb = c.tb, plain = tb === 'plain', two = tb === 'two' || tb === 'twoov';
      P.size(680, 300);
      P.region('mem', 16, 16, 300, 200, '자바 객체 (메모리)');
      P.box('o_member', 32, 46, 268, plain ? 158 : 46, s.obj ? { cls: 'plain', title: 'member (Member 객체)', sub: plain ? ['name = 김철수', 'city = 서울', 'street = 강남대로'] : ['name = 김철수'] } : { cls: 'ghost', title: 'member (Member 객체)', sub: '아직 없음' });
      if (!plain && s.obj) {
        if (two) {
          P.box('o_addr', 32, 132, 132, 70, { cls: 'wait', title: 'homeAddress', sub: ['Address 객체', 'city = 서울', 'street = 강남대로'] }); P.arrow('ref1', 'o_member:b:0.246', 'o_addr:t', { label: '참조' });
          P.box('o_addr2', 168, 132, 132, 70, { cls: 'wait', title: 'workAddress', sub: ['Address 객체', 'city = 성남', 'street = 판교로'] }); P.arrow('ref2', 'o_member:b:0.754', 'o_addr2:t', { label: '참조' });
        } else if (tb === 'nul') P.box('o_addr', 48, 132, 236, 44, { cls: 'ghost', title: 'address = null', sub: 'Address 객체가 없음' });
        else { P.box('o_addr', 48, 132, 236, 44, { cls: 'wait', title: 'address (Address 객체)', sub: 'city = 서울 · street = 강남대로' }); P.arrow('ref1', 'o_member:b', 'o_addr:t', { label: '참조' }); }
      }
      P.region('db', 364, 16, 300, 200, 'DB');
      var row = s.db[0], six = tb === 'twoov';
      if (s.err) P.box('t_member', 380, 46, 268, 96, { cls: 'bad', title: 'member 테이블을 만들지 못함', sub: ['city 컬럼이 두 번 나옴', '(homeAddress와 workAddress)', 'MappingException'] });
      else P.box('t_member', 380, 46, 268, 96, { cls: !s.made ? 'ghost' : s.hot ? 'hot' : 'plain', title: 'member 테이블', sub: !s.made ? ['아직 만들어지기 전'] : (six ? ['id · name · city · street', '· work_city · work_street'] : ['id · name · city · street']).concat(row ? (six ? [row.slice(0, 4).join(' · '), '· ' + row.slice(4).join(' · ')] : [row.join(' · ')]) : ['(행 없음)']) });
      if (!plain) P.box('t_addr', 380, 154, 268, 46, { cls: 'ghost', title: 'address 테이블', sub: '만들어지지 않음 (값 타입)' });
      if (!plain && s.obj && s.made && tb !== 'nul' && row) P.arrow('spread', two ? 'o_addr2:r' : 'o_addr:r', 't_member:l', { cls: 'good', label: '컬럼으로' });
      P.box('r1', 16, 232, 320, 38, { cls: s.err ? 'bad' : s.made ? 'good' : 'ghost', title: '만들어진 테이블', right: s.err ? '시작 실패' : s.made ? 'member 1개' : '?' });
      P.box('r2', 344, 232, 320, 38, tb === 'emb' || tb === 'nul' ? { cls: !s.read ? 'ghost' : s.read === 'null' ? 'bad' : 'good', title: '다시 읽은 address', right: s.read || '?' } : { cls: s.sent.length ? 'plain' : 'ghost', title: '나간 INSERT', right: s.sent.length + '번' });
      P.note('왼쪽은 자바 객체, 오른쪽은 DB입니다. 임베디드 타입(파란 상자)은 자바에서는 따로 있는 객체지만, DB에서는 자기 테이블 없이 member 테이블의 컬럼으로 들어갑니다.');
      return;
    }
    if (c.sc === 'share') {
      s = last ? last.snap : { objs: [], m1: '', m2: '', has1: false, has2: false, db: [], sent: [], hot: [] };
      var shared = s.has2 && s.m1 === s.m2;
      P.size(680, 300);
      P.region('mem', 16, 16, 340, 200, '자바 객체 (메모리)');
      P.box('m1', 32, 50, 124, 44, s.has1 ? { cls: 'plain', title: 'member1', sub: '회원1' } : { cls: 'ghost', title: 'member1', sub: '아직 없음' });
      P.box('m2', 32, 150, 124, 44, s.has2 ? { cls: 'plain', title: 'member2', sub: '회원2' } : { cls: 'ghost', title: 'member2', sub: '아직 없음' });
      s.objs.forEach(function (o) { var both = shared && o.n === s.m1; P.box('a' + o.n, 200, o.y, 140, 44, { cls: both && c.sh === 'same' ? (o.city === '부산' ? 'bad' : 'hot') : 'wait', title: 'Address 객체 ' + o.n, sub: o.city + ' · ' + o.street }); });
      if (s.has1) P.arrow('p1', 'm1:r', 'a' + s.m1 + ':l', { cls: shared && c.sh === 'same' ? 'hot' : '' });
      if (s.has2) P.arrow('p2', 'm2:r', 'a' + s.m2 + ':l', { cls: shared && c.sh === 'same' ? 'hot' : '' });
      P.region('db', 384, 16, 280, 200, 'DB의 member 테이블');
      [0, 1].forEach(function (i) { var r = s.db[i]; P.box('d' + (i + 1), 400, i ? 150 : 50, 248, 44, r ? { cls: s.hot.indexOf(i) >= 0 ? 'hot' : 'plain', title: 'id ' + r[0] + ' · ' + r[1], sub: 'city ' + r[2] + ' · street ' + r[3] } : { cls: 'ghost', title: '회원' + (i + 1) + '의 행', sub: '아직 없음' }); });
      var ups = s.sent.filter(function (q) { return q.kind === 'update'; }).length, c2 = s.db[1] ? s.db[1][2] : '?';
      P.box('r1', 16, 232, 320, 38, { cls: ups > 1 ? 'bad' : ups ? 'good' : 'ghost', title: '나간 UPDATE', right: ups + '번' });
      P.box('r2', 344, 232, 320, 38, { cls: c2 === '?' ? 'ghost' : c2 === '부산' ? 'bad' : 'good', title: 'DB에서 회원2의 city', right: c2 });
      P.note('화살표는 회원의 address 필드가 어느 Address 객체를 가리키는지입니다. 두 화살표가 한 객체로 모이면 그 객체를 함께 쓰는 것입니다.');
      return;
    }
    s = last ? last.snap : sim.init;
    var order = sim.order;
    P.size(680, 318);
    P.region('mem', 16, 16, 250, 240, '메모리: member.getHistory()');
    if (!s.mem) P.box('lazy', 32, 48, 218, 30, { cls: 'ghost', title: '아직 읽지 않음 (지연 로딩)', center: true });
    else s.mem.forEach(function (a, i) { P.box('m_' + a.k, 32, 48 + i * 32, 218, 26, { cls: a.k === 'v9' ? 'hot' : 'wait', title: a.city + ' ' + a.street, center: true }); });
    P.region('db', 300, 16, 364, 240, 'DB의 address_history 테이블');
    P.text('head', 316, 56, sim.cols.join(' · '), { cls: 'mut' });
    if (!s.db.length) P.box('empty', 316, 64, 332, 26, { cls: 'ghost', title: '(이 회원의 행이 하나도 없음)', center: true });
    s.db.forEach(function (r, i) { P.box('d_' + r.k, 316, 64 + i * 31, 332, 26, { cls: s.hot.indexOf(r.k) >= 0 ? 'hot' : 'plain', title: (order ? '1 · ' + r.idx + ' · ' : '1 · ') + r.city + ' · ' + r.street }); });
    var cnt = function (k) { return s.sent.filter(function (q) { return q.kind === k; }).length; }, del = cnt('delete'), ins = cnt('insert'), upd = cnt('update');
    P.box('q_del', 16, 268, 210, 36, { cls: del ? 'bad' : 'ghost', title: 'DELETE', right: del + '번' });
    P.box('q_ins', 236, 268, 210, 36, { cls: ins > 1 ? 'bad' : ins ? 'plain' : 'ghost', title: 'INSERT', right: ins + '번' });
    P.box('q_upd', 456, 268, 208, 36, { cls: upd ? 'bad' : 'ghost', title: 'UPDATE', right: upd + '번' });
    P.note('왼쪽은 메모리의 컬렉션이고 오른쪽은 그것이 저장된 테이블의 행입니다. 노란 행은 이번 단계에서 새로 넣거나 내용을 고친 행입니다.');
  },
  assume: '쉰여섯 가지 조합(테이블 모양 다섯 가지, 함께 쓰기 세 가지, 값 타입 컬렉션은 종류 네 가지 × 하는 일 세 가지 × 주소 2·3·4·5개) 모두를 Hibernate 7.4.5와 H2 데이터베이스에서 같은 구조의 코드로 실행해, 만들어진 테이블과 컬럼, 나간 SQL의 종류와 테이블별 횟수, 커밋 전까지 나간 SQL, DELETE가 그 회원의 행 전부를 지우는 문장인지, DB에 남은 값, 다시 읽은 address가 null인지, 시작할 때의 예외가 화면과 일치하는 것을 확인했습니다. 값 타입 컬렉션의 결과는 Hibernate 7.4.5의 동작이며 버전에 따라 다를 수 있습니다. 특히 Set에서 컬럼이 null을 허용하면 List처럼 전부 지우고 다시 넣는다는 점은 실행해서 확인한 것입니다. @OrderColumn에서 어느 번호의 행을 지우고 고치는지는 실제 SQL 문장의 조건(member_id와 idx)과 실행 뒤에 남은 행으로 확인했습니다. 기본 키는 IDENTITY 전략이어서 persist를 부를 때 INSERT가 바로 나갑니다. 함께 쓰기 장면은 두 회원을 새로 저장하는 한 트랜잭션 안의 일입니다. DB에서 읽어 온 엔티티들은 각자 새로 만들어진 값 객체를 가지므로, 코드에서 같은 객체를 직접 넣어 줄 때만 이 문제가 생깁니다. 화면의 SQL 문장은 읽기 쉽게 줄여 쓴 것이어서 실제 문장과 글자가 같지는 않습니다. 테이블 안의 컬럼 순서도 실제와 다를 수 있습니다.',
});

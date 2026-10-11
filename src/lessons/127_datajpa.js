Lab.register({
  id: 'datajpa', nav: '스프링 데이터 JPA', cat: 'JPA', mode: 'step',
  title: '구현 클래스가 없는데 리포지토리는 어떻게 동작하나',
  intro: '스프링 데이터 JPA에서는 리포지토리를 인터페이스로만 선언합니다. 구현은 애플리케이션이 뜰 때 스프링 데이터가 만들어 주고, findByName 같은 메서드는 이름을 읽어 쿼리로 바꿉니다. 메서드 이름이 어떤 쿼리가 되는지, 페이지를 요청하면 쿼리가 몇 번 나가는지, save()가 INSERT 앞에 SELECT를 먼저 보내는 때가 언제인지 실행해 보세요.',
  terms: ['JPA, Hibernate, Spring Data JPA', '쿼리 메서드', 'Pageable과 Page', 'save()와 merge', '엔티티'],
  controls: [
    { id: 'sc', label: '해 볼 것', type: 'select', value: 'name', options: [['name', '메서드 이름으로 조회'], ['page', 'Pageable로 페이지 요청'], ['save', 'save() 호출']] },
    { id: 'mt', label: '리포지토리에 선언한 메서드', type: 'select', value: 'findByNameAndAgeGreaterThan', options: [['findByName', 'findByName'], ['findByNameAndAgeGreaterThan', 'findByNameAndAgeGreaterThan'], ['findByNameContainingOrderByAgeDesc', 'findByNameContainingOrderByAgeDesc'], ['countByAgeGreaterThan', 'countByAgeGreaterThan'], ['findByNickname', 'findByNickname (엔티티에 없는 이름)'], ['findByAgeGreaterThen', 'findByAgeGreaterThen (Than을 Then으로 잘못 씀)']], show: function (c) { return c.sc === 'name'; }, hint: 'Member 엔티티의 프로퍼티는 id, name, age 세 개입니다.' },
    { id: 'ret', label: '돌려받는 타입', type: 'select', value: 'page', options: [['page', 'Page (전체 건수까지 앎)'], ['slice', 'Slice (다음이 있는지만 앎)']], show: function (c) { return c.sc === 'page'; } },
    { id: 'pg', label: '요청할 페이지 번호', type: 'select', value: '2', options: [['0', '0 (첫 페이지)'], ['1', '1'], ['2', '2 (마지막 페이지)'], ['3', '3 (없는 페이지)']], show: function (c) { return c.sc === 'page'; }, hint: '회원은 7명이고 한 페이지는 3건입니다. 페이지 번호는 0부터 셉니다.' },
    { id: 'ent', label: 'save()에 넘기는 객체', type: 'select', value: 'assigned', options: [['new', '새 회원 (id가 null)'], ['change', 'id 1을 넣은 회원, 이름이 DB와 다름'], ['same', 'id 1을 넣은 회원, 값이 DB와 같음'], ['gone', 'id 999를 넣은 회원 (DB에 없는 id)'], ['assigned', '새 쿠폰 (id를 코드에서 직접 정하는 엔티티)']], show: function (c) { return c.sc === 'save'; } },
  ],
  presets: [
    { t: '처음 설정으로', d: '본문이 없는 메서드인데 이름만으로 조건 두 개짜리 쿼리가 나갑니다.', v: { sc: 'name', mt: 'findByNameAndAgeGreaterThan', ret: 'page', pg: '2', ent: 'assigned' } },
    { t: '엔티티에 없는 이름을 쓰면', d: '메서드를 부르기도 전에, 애플리케이션이 뜨다가 실패합니다.', v: { sc: 'name', mt: 'findByNickname', ret: 'page', pg: '2', ent: 'assigned' } },
    { t: '키워드를 잘못 쓰면', d: 'GreaterThen은 키워드가 아니라서 프로퍼티 이름으로 읽힙니다.', v: { sc: 'name', mt: 'findByAgeGreaterThen', ret: 'page', pg: '2', ent: 'assigned' } },
    { t: '페이지 요청: 쿼리 두 번', d: '내용을 읽는 쿼리와 전체 건수를 세는 쿼리가 따로 나갑니다.', v: { sc: 'page', mt: 'findByNameAndAgeGreaterThan', ret: 'page', pg: '0', ent: 'assigned' } },
    { t: '마지막 페이지에서는', d: '전체 건수를 계산할 수 있어서 개수 쿼리를 보내지 않습니다.', v: { sc: 'page', mt: 'findByNameAndAgeGreaterThan', ret: 'page', pg: '2', ent: 'assigned' } },
    { t: 'Slice로 받으면', d: '개수 쿼리가 없는 대신 한 건을 더 읽어 다음이 있는지 봅니다.', v: { sc: 'page', mt: 'findByNameAndAgeGreaterThan', ret: 'slice', pg: '0', ent: 'assigned' } },
    { t: 'save: 새 엔티티인데 SELECT가 먼저', d: 'id를 직접 정하는 엔티티는 INSERT 앞에 SELECT가 한 번 더 나갑니다.', v: { sc: 'save', mt: 'findByNameAndAgeGreaterThan', ret: 'page', pg: '2', ent: 'assigned' } },
  ],
  // 회원 7명 (id, 이름, 나이). Probe가 넣는 데이터와 같다
  members: [[1, '김철수', 30], [2, '김철수', 17], [3, '이영희', 25], [4, '박민수', 41], [5, '김영수', 22], [6, '최지우', 19], [7, '이철민', 35]],
  methods: {
    findByName: { ret: 'List<Member>', params: 'String name', call: '"김철수"', args: ['김철수'] },
    findByNameAndAgeGreaterThan: { ret: 'List<Member>', params: 'String name, int age', call: '"김철수", 20', args: ['김철수', 20] },
    findByNameContainingOrderByAgeDesc: { ret: 'List<Member>', params: 'String part', call: '"철"', args: ['철'] },
    countByAgeGreaterThan: { ret: 'long', params: 'int age', call: '20', args: [20] },
    findByNickname: { ret: 'List<Member>', params: 'String nickname', call: '"철수"', args: ['철수'] },
    findByAgeGreaterThen: { ret: 'List<Member>', params: 'int age', call: '20', args: [20] },
  },
  saves: {
    'new': { make: 'new Member("박새로", 20)', note: 'id는 null' },
    change: { make: 'new Member(1L, "김영수", 30)', note: 'id 1을 직접 넣음. DB의 id 1은 김철수' },
    same: { make: 'new Member(1L, "김철수", 30)', note: 'id 1을 직접 넣음. DB의 id 1과 값이 같음' },
    gone: { make: 'new Member(999L, "없는회원", 30)', note: 'id 999는 DB에 없음' },
    assigned: { make: 'new Coupon("SUMMER", "여름 할인")', note: 'id인 code를 직접 정함' },
  },
  // 메서드 이름을 조각으로 나눈다. 스프링 데이터가 이름을 읽는 순서를 따라 한 것이다
  parse: function (name) {
    var types = { id: 'Long', name: 'String', age: 'int' }, low = function (s) { return s.charAt(0).toLowerCase() + s.slice(1); };
    var m = /^(find|count)By(.*)$/.exec(name), rest = m[2], order = '', oi = rest.indexOf('OrderBy');
    if (oi >= 0) { order = rest.slice(oi + 7); rest = rest.slice(0, oi); }
    var parts = [{ text: m[1] + '…By', kind: 'subject', sql: m[1] === 'count' ? 'select count' : 'select …' }];
    rest.split(/And(?=[A-Z])/).forEach(function (seg, i) {
      var kw = '', op = '= ?';
      [['GreaterThan', '> ?'], ['Containing', 'like ?']].forEach(function (k) { if (seg.slice(-k[0].length) === k[0]) { kw = k[0]; op = k[1]; } });
      var pn = kw ? seg.slice(0, -kw.length) : seg, prop = low(pn), p = { text: (i ? 'And ' : '') + seg, kind: 'cond', and: i > 0, kw: kw, op: op, prop: prop };
      if (types[prop]) p.sql = prop + ' ' + op;
      else {
        // 없는 이름이면 낱말 경계에서 잘라 "앞 프로퍼티 안의 뒤 프로퍼티"로도 찾아본다
        var words = pn.match(/[A-Z][a-z0-9]*/g) || [pn];
        p.msg = "No property '" + prop + "' found for type 'Member'";
        for (var k = words.length - 1; k >= 1; k--) { var head = low(words.slice(0, k).join('')); if (types[head]) { p.head = head; p.tail = low(words.slice(k).join('')); p.headType = types[head]; p.msg = "No property '" + p.tail + "' found for type '" + types[head] + "'; Traversed path: Member." + head; break; } }
      }
      parts.push(p);
    });
    if (order) { var om = /^(.*?)(Asc|Desc)$/.exec(order); parts.push({ text: 'OrderBy' + order, kind: 'order', prop: low(om[1]), dir: om[2].toLowerCase(), sql: 'order by ' + low(om[1]) + ' ' + om[2].toLowerCase() }); }
    return parts;
  },
  code: function (c) {
    var member = '@Entity\nclass Member {\n    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)\n    Long id;\n    String name;\n    int age;\n    // 생성자와 getter는 줄였다\n}\n\n';
    if (c.sc === 'name') {
      var d = this.methods[c.mt];
      return member + '// 구현 클래스는 만들지 않는다. 인터페이스만 선언한다\ninterface MemberRepository extends JpaRepository<Member, Long> {\n    ' + d.ret + ' ' + c.mt + '(' + d.params + ');\n}\n\n// 서비스\n' + d.ret + ' result = memberRepository.' + c.mt + '(' + d.call + ');';
    }
    if (c.sc === 'page') {
      var req = 'Pageable pageable = PageRequest.of(' + c.pg + ', 3, Sort.by("id"));   // 페이지 번호 ' + c.pg + ', 한 페이지 3건\n';
      return member + 'interface MemberRepository extends JpaRepository<Member, Long> {\n    // Page<Member> findAll(Pageable pageable)은 JpaRepository에 이미 있다\n    Slice<Member> findSliceBy(Pageable pageable);\n}\n\n// 서비스\n' + req +
        (c.ret === 'slice' ? 'Slice<Member> slice = memberRepository.findSliceBy(pageable);\nslice.getContent();   // 이 페이지의 회원들\nslice.hasNext();      // 다음 페이지가 있는가' : 'Page<Member> page = memberRepository.findAll(pageable);\npage.getContent();         // 이 페이지의 회원들\npage.getTotalElements();   // 전체 건수\npage.hasNext();            // 다음 페이지가 있는가');
    }
    var s = this.saves[c.ent];
    if (c.ent === 'assigned') return '@Entity\nclass Coupon {\n    @Id\n    String code;      // @GeneratedValue가 없다. id를 코드에서 직접 정한다\n    String title;\n    // 생성자는 줄였다\n}\n\ninterface CouponRepository extends JpaRepository<Coupon, String> { }\n\n// 서비스\nCoupon coupon = ' + s.make + ';   // ' + s.note + '\nCoupon saved = couponRepository.save(coupon);';
    return member + 'interface MemberRepository extends JpaRepository<Member, Long> { }\n\n// 서비스\nMember member = ' + s.make + ';   // ' + s.note + '\nMember saved = memberRepository.save(member);';
  },
  label: function (c) {
    if (c.sc === 'name') return c.mt;
    if (c.sc === 'page') return (c.ret === 'slice' ? 'Slice' : 'Page') + ' · 페이지 번호 ' + c.pg;
    return 'save · ' + { 'new': '새 회원', change: 'id 1, 이름 다름', same: 'id 1, 값 같음', gone: 'id 999 (DB에 없음)', assigned: '새 쿠폰 (id 직접 지정)' }[c.ent];
  },
  columns: ['애플리케이션 기동', 'DB로 나간 SQL', 'SQL의 내용', '결과'],
  simulate: function (c) {
    var self = this, ev = [], sum = [], sent = [], coupon = c.sc === 'save' && c.ent === 'assigned';
    var st = { boot: 'ing', call: '', called: false, steps: [], out: { t: '결과', s: '아직 없음', cls: 'ghost' }, sent: sent, tbl: coupon ? 'coupon' : 'member',
      rows: coupon ? [{ k: 'WELCOME', v: '가입 축하', cls: '' }] : this.members.map(function (m) { return { k: 'id ' + m[0], v: m[1] + ' · ' + m[2] + '세', cls: '' }; }) };
    function push(s, k) { ev.push({ s: s, k: k || '', snap: JSON.parse(JSON.stringify(st)) }); }
    function send(sql, why) { sent.push({ sql: sql, why: why }); }
    var row, msg = '', order = '';

    if (c.sc === 'name') {
      var d = this.methods[c.mt], parts = this.parse(c.mt), bad = null;
      st.call = c.mt + '(' + d.call + ')';
      st.steps = parts.map(function (p) { return { t: p.text, r: '', cls: 'ghost' }; });
      push('애플리케이션 시작: 스프링 데이터 JPA가 JpaRepository를 상속한 인터페이스 MemberRepository를 찾습니다. 구현 클래스를 만든 적이 없지만, 스프링 데이터가 이 인터페이스의 구현 객체(프록시)를 대신 만들어 빈으로 등록합니다.');
      for (var i = 0; i < parts.length && !bad; i++) {
        var p = parts[i];
        if (p.kind === 'subject') {
          st.steps[i] = { t: p.text, r: p.sql === 'select count' ? '개수를 센다' : '조회한다', cls: 'good' };
          push('메서드 이름 해석: ' + c.mt + ' 메서드에는 사람이 쓴 본문이 없습니다. 스프링 데이터가 이름을 잘라 읽어 쿼리를 만듭니다. 맨 앞의 ' + p.text + '는 ' + (p.sql === 'select count' ? '"조건에 맞는 것의 개수를 센다"' : '"조건에 맞는 것을 조회한다"') + '는 뜻이고, By 뒤가 조건입니다.');
        } else if (p.kind === 'cond' && p.sql) {
          st.steps[i] = { t: p.text, r: (p.and ? 'and ' : '') + p.sql, cls: 'good' };
          push(p.text + ': ' + (p.and ? 'And는 앞의 조건과 and로 잇는다는 뜻입니다. ' : '') + (p.kw === 'GreaterThan' ? '끝에 붙은 키워드(GreaterThan)는 "보다 크다"는 뜻입니다. ' : p.kw === 'Containing' ? '끝에 붙은 키워드(Containing)는 "이 글자가 들어 있다"는 뜻입니다. ' : '키워드가 붙지 않았으므로 "같다"는 조건입니다. ') + 'Member 엔티티에 이 이름(' + p.prop + ')의 프로퍼티가 있는지 확인합니다. 있으므로 쿼리의 조건은 "' + p.sql + '"입니다. 물음표는 호출할 때 넘기는 값이 들어갈 자리입니다.', 'good');
        } else if (p.kind === 'cond') {
          bad = p; msg = p.msg;
          st.steps[i] = { t: p.text, r: '프로퍼티 없음', cls: 'bad' };
          if (p.head) push(p.text.replace('And ', '') + ': 스프링 데이터가 아는 키워드는 GreaterThan입니다. GreaterThen은 키워드가 아니므로 이 조각 전체를 프로퍼티 이름으로 읽습니다. Member에 그런 프로퍼티가 없자, 낱말 경계에서 잘라 "' + p.head + ' 안의 ' + p.tail + '"이라는 뜻으로도 찾아봅니다. ' + p.head + ' 프로퍼티는 있지만 그 타입(' + p.headType + ') 안에 "' + p.tail + '" 프로퍼티는 없습니다.', 'bad');
          else push(p.text.replace('And ', '') + ': 키워드가 붙지 않았으므로 "같다"는 조건으로 읽습니다. 그런데 Member 엔티티에는 이 이름(' + p.prop + ')의 프로퍼티가 없습니다. id, name, age뿐입니다. 조건을 걸 대상이 없어 쿼리를 만들 수 없습니다.', 'bad');
        } else {
          st.steps[i] = { t: p.text, r: p.sql, cls: 'good' };
          push(p.text + ': OrderBy 뒤는 정렬 기준입니다. Member 엔티티의 ' + p.prop + ' 값으로 ' + (p.dir === 'desc' ? '큰 것부터(Desc)' : '작은 것부터(Asc)') + ' 정렬합니다.', 'good');
        }
      }
      if (bad) {
        st.boot = 'fail'; st.out = { t: 'PropertyReferenceException', s: msg.split(';')[0], cls: 'bad' };
        push('애플리케이션 기동 실패: 쿼리를 만들지 못해 PropertyReferenceException이 났고, 리포지토리 빈을 만들 수 없으므로 애플리케이션이 뜨지 않습니다. 오류 메시지는 "' + msg + '"입니다. 이 메서드를 한 번도 부르지 않았는데도 시작할 때 드러납니다.', 'bad');
        row = ['실패 (PropertyReferenceException)', '0번', '없음', '메서드를 부를 수 없음'];
        sum.push('애플리케이션이 뜨지 못했습니다. 메서드 이름에 Member 엔티티에 없는 프로퍼티 이름이 들어 있기 때문입니다.');
        sum.push(bad.head ? '키워드의 철자가 틀리면 "모르는 키워드"라고 알려 주지 않습니다. 틀린 부분까지 프로퍼티 이름으로 읽으려다 실패하므로, 오류 메시지의 낱말(' + bad.tail + ')이 낯설어 보입니다. 메시지에 나온 낱말이 키워드를 잘못 쓴 것이 아닌지 먼저 보세요.' : '메서드 이름 속의 프로퍼티 이름은 컬럼 이름이 아니라 엔티티 클래스의 필드 이름과 맞아야 합니다.');
        sum.push('이름을 쿼리로 바꾸는 일은 애플리케이션이 뜰 때 미리 합니다. 그래서 잘못된 이름은 실제 요청이 들어오기 전에 발견됩니다.');
      } else {
        var q = parts.map(function (x) { return x.kind === 'cond' ? (x.and ? 'and ' : 'where ') + x.sql : x.sql; }).join(' ');
        st.boot = 'ok'; st.out = { t: '준비된 쿼리', s: q, cls: 'wait' };
        push('애플리케이션 기동 완료: 이름 해석이 끝나 쿼리가 준비됐습니다. 이 해석과 프로퍼티 검사는 메서드를 부를 때가 아니라 애플리케이션이 뜰 때 미리 합니다.', 'good');
        var conds = parts.filter(function (x) { return x.kind === 'cond'; }), ord = parts.filter(function (x) { return x.kind === 'order'; })[0], idx = { id: 0, name: 1, age: 2 };
        var hit = this.members.filter(function (m) { return conds.every(function (x, j) { var v = m[idx[x.prop]], a = d.args[j]; return x.op === '= ?' ? v === a : x.op === '> ?' ? v > a : String(v).indexOf(a) >= 0; }); });
        if (ord) { hit.sort(function (a, b) { return (a[idx[ord.prop]] - b[idx[ord.prop]]) * (ord.dir === 'desc' ? -1 : 1); }); order = hit.map(function (m) { return m[idx[ord.prop]]; }).join(' '); }
        var like = conds.some(function (x) { return x.kw === 'Containing'; });
        st.called = true; send(q, '메서드 호출');
        hit.forEach(function (m) { st.rows[m[0] - 1].cls = 'good'; });
        push('memberRepository.' + c.mt + '(' + d.call + ') 호출: 구현 객체가 준비해 둔 쿼리의 물음표 자리에 넘긴 값을 넣어 SELECT를 한 번 보냅니다.' + (like ? ' Containing은 값의 앞뒤에 %를 붙여 %철%로 like 조건을 겁니다.' : ''));
        var count = parts[0].sql === 'select count';
        st.out = { t: '돌려준 값', s: count ? '숫자 ' + hit.length : '회원 ' + hit.length + '건' + (ord ? ' (' + ord.prop + ' ' + order.split(' ').join(', ') + ' 순)' : ''), cls: 'good' };
        push('결과: ' + (count ? '조건에 맞는 회원이 ' + hit.length + '명이므로 숫자 ' + hit.length + '를 돌려줍니다.' : '조건에 맞는 회원 ' + hit.length + '건을 Member 객체의 목록으로 돌려줍니다.' + (ord ? ' ' + ord.prop + ' 값은 ' + order.split(' ').join(', ') + ' 순서입니다.' : '')), 'good');
        row = ['성공', '1번', q, count ? '숫자 ' + hit.length + ' (개수)' : '회원 ' + hit.length + '건'];
        sum.push('본문이 없는 메서드를 불렀는데 "' + q + '" 쿼리가 한 번 나갔습니다. 메서드 이름이 곧 쿼리입니다.');
        sum.push('규칙: find…By나 count…By 뒤에 엔티티의 프로퍼티 이름을 쓰고, 조건의 종류(GreaterThan, Containing 등)는 프로퍼티 이름 뒤에 붙이며, 여러 조건은 And나 Or로 잇습니다. 매개변수는 이름이 아니라 순서대로 조건에 들어갑니다.');
        sum.push('조건이 서너 개를 넘으면 이름이 너무 길어집니다. 그때는 @Query에 JPQL을 직접 적는 편이 읽기 쉽습니다.');
      }
    }

    if (c.sc === 'page') {
      var pg = +c.pg, size = 3, slice = c.ret === 'slice', off = pg * size, ask = slice ? size + 1 : size, all = this.members.length;
      var got = this.members.slice(off, off + ask), content = got.slice(0, size);
      st.call = (slice ? 'findSliceBy' : 'findAll') + '(PageRequest.of(' + pg + ', 3, Sort.by("id")))';
      st.steps = [{ t: 'PageRequest.of(' + pg + ', 3, …)', r: '', cls: 'ghost' }, { t: '내용 쿼리', r: '', cls: 'ghost' }, { t: slice ? '다음이 있는지 판단' : '개수 쿼리', r: '', cls: 'ghost' }];
      st.boot = 'ok';
      push('애플리케이션 시작: 스프링 데이터 JPA가 MemberRepository 인터페이스의 구현 객체(프록시)를 만들어 빈으로 등록합니다. ' + (slice ? '직접 선언한 findSliceBy는 이름을 읽어 "조건 없이 전부 조회"하는 쿼리로 준비됩니다.' : 'findAll(Pageable)처럼 JpaRepository에 이미 있는 메서드는 스프링 데이터 안의 SimpleJpaRepository 클래스가 처리합니다.'));
      st.steps[0] = { t: st.steps[0].t, r: off + '건 건너뛰고 3건', cls: 'good' };
      push('PageRequest.of(' + pg + ', 3, Sort.by("id")): 페이지 번호 ' + pg + ', 한 페이지 3건을 id 순서로 달라는 요청입니다. 페이지 번호는 0부터 세므로 ' + (pg + 1) + '번째 페이지입니다. 앞에서 건너뛸 건수는 ' + pg + ' × 3 = ' + off + '건입니다.');
      st.called = true; send('select … order by id (' + off + '건 건너뛰고 ' + ask + '건)', '내용 조회');
      got.forEach(function (m, j) { st.rows[m[0] - 1].cls = j < size ? 'good' : 'wait'; });
      st.steps[1] = { t: '내용 쿼리', r: ask + '건 요청 → ' + got.length + '건', cls: 'good' };
      push('내용 쿼리: ' + (slice ? 'Slice는 다음 페이지가 있는지만 알면 됩니다. 그래서 3건이 아니라 한 건 많은 4건을 요청합니다. ' : '') + off + '건을 건너뛰고 ' + ask + '건까지 읽는 SELECT를 보냅니다. ' + (got.length ? '회원이 7명이므로 ' + got.length + '건이 돌아옵니다.' : '회원이 7명뿐이라 한 건도 돌아오지 않습니다.'));
      var hasNext, counted = false, total = all;
      if (slice) {
        hasNext = got.length > size;
        st.steps[2] = { t: '다음이 있는지 판단', r: hasNext ? '4건이 옴 → 있음' : got.length + '건만 옴 → 없음', cls: 'good' };
        push('다음이 있는지 판단: ' + (hasNext ? '4건을 요청해 4건이 왔으므로 다음 페이지가 있습니다. 넘치는 한 건(파란색)은 버리고 3건만 돌려줍니다.' : '4건을 요청했는데 ' + got.length + '건만 왔으므로 다음 페이지가 없습니다.') + ' 전체 건수는 세지 않으므로 개수 쿼리가 나가지 않습니다.', 'good');
      } else {
        var skip = content.length < size && (off === 0 || content.length > 0);
        if (skip) {
          st.steps[2] = { t: '개수 쿼리', r: '보내지 않음 (' + off + ' + ' + content.length + ' = ' + all + ')', cls: 'plain' };
          push('개수 쿼리 생략: 돌아온 것이 ' + content.length + '건으로 한 페이지 크기 3건보다 적습니다. 여기가 마지막 페이지라는 뜻이므로, 전체 건수를 건너뛴 ' + off + '건 + 읽은 ' + content.length + '건 = ' + all + '건으로 계산할 수 있습니다. 개수 쿼리를 보내지 않습니다.', 'good');
        } else {
          counted = true; send('select count … (전체 건수)', '개수 조회');
          st.steps[2] = { t: '개수 쿼리', r: 'select count → ' + all + '건', cls: 'hot' };
          push('개수 쿼리: ' + (content.length ? '3건이 꽉 차서 돌아왔으므로 뒤에 더 있는지, 전체가 몇 건인지 이 결과만으로는 알 수 없습니다.' : '한 건도 돌아오지 않아 전체가 몇 건인지 계산할 근거가 없습니다.') + ' Page는 전체 건수를 알아야 하므로 select count 쿼리를 한 번 더 보냅니다. ' + all + '건입니다.');
        }
        hasNext = off + size < total;
      }
      var res = content.length + '건 · ' + (slice ? '전체 건수 모름' : '전체 ' + total + '건') + ' · 다음 ' + (hasNext ? '있음' : '없음');
      st.out = { t: slice ? '돌려준 Slice' : '돌려준 Page', s: res, cls: 'good' };
      push('결과: ' + (slice ? 'slice.getContent()는 ' + content.length + '건, slice.hasNext()는 ' + hasNext + '입니다. 전체가 몇 건인지, 모두 몇 페이지인지는 Slice로는 알 수 없습니다.' : 'page.getContent()는 ' + content.length + '건, page.getTotalElements()는 ' + total + ', page.getTotalPages()는 ' + Math.ceil(total / size) + ', page.hasNext()는 ' + hasNext + '입니다.'), 'good');
      row = ['성공', sent.length + '번', '내용 조회 (' + off + '건 건너뛰고 ' + ask + '건 요청)' + (counted ? ' + 개수 조회' : ''), res];
      if (slice) sum.push('Slice는 개수 쿼리를 보내지 않습니다. 대신 한 건을 더 읽어 다음이 있는지만 알아냅니다. "더 보기" 버튼이나 무한 스크롤처럼 전체 페이지 수가 필요 없는 화면에 맞습니다.');
      else if (counted) sum.push('Page로 받으면 내용 쿼리와 별도로 전체 건수를 세는 쿼리가 나갑니다. 데이터가 많은 테이블에서는 이 개수 쿼리가 내용 쿼리보다 느릴 수 있습니다. 전체 건수가 필요 없으면 Slice로 받는 방법이 있습니다.');
      else sum.push('마지막 페이지처럼 돌아온 건수가 페이지 크기보다 적으면 스프링 데이터가 전체 건수를 계산해 내므로 개수 쿼리를 생략합니다. 그래서 같은 코드인데도 페이지에 따라 쿼리 수가 다릅니다.');
      if (!content.length) sum.push('없는 페이지를 요청해도 예외는 나지 않고 빈 내용이 돌아옵니다.');
    }

    if (c.sc === 'save') {
      var e = c.ent, sv = this.saves[e], repo = coupon ? 'couponRepository' : 'memberRepository', isNew = e === 'new';
      st.call = 'save(' + sv.make + ')';
      st.steps = [{ t: '새 엔티티인가 (id가 null인가)', r: '', cls: 'ghost' }, { t: 'merge가 먼저 조회 (SELECT)', r: '', cls: 'ghost' }, { t: '쓰기 SQL', r: '', cls: 'ghost' }];
      st.boot = 'ok';
      push('애플리케이션 시작: 스프링 데이터 JPA가 ' + (coupon ? 'CouponRepository' : 'MemberRepository') + ' 인터페이스의 구현 객체(프록시)를 만들어 빈으로 등록합니다. save처럼 JpaRepository에 이미 있는 메서드는 스프링 데이터 안의 SimpleJpaRepository 클래스가 처리합니다.');
      push(sv.make + ': 자바 객체를 하나 만들었습니다. ' + (isNew ? 'id를 넣지 않았으므로 id는 null입니다. id는 저장할 때 DB가 정해 줍니다.' : e === 'assigned' ? 'Coupon은 id인 code를 코드에서 직접 정하는 엔티티라서, 만들 때부터 id(SUMMER)가 들어 있습니다. DB에는 아직 없는 쿠폰입니다.' : e === 'gone' ? 'id에 999를 직접 넣었습니다. DB에 id 999인 회원은 없습니다.' : 'id에 1을 직접 넣었습니다. DB에서 읽어 온 객체가 아니라 new로 만든 객체입니다.'));
      st.called = true;
      st.steps[0] = { t: st.steps[0].t, r: isNew ? '예 → persist' : '아니오 → merge', cls: 'good' };
      push(repo + '.save(…) 호출: save는 먼저 "새 엔티티인가"를 판단합니다. 기본 규칙은 id가 null이면 새 엔티티라는 것입니다. ' + (isNew ? 'id가 null이므로 새 엔티티로 보고 em.persist를 부릅니다.' : 'id가 들어 있으므로 새 엔티티가 아니라고 보고 em.merge를 부릅니다.' + (e === 'assigned' ? ' 실제로는 처음 저장하는 쿠폰인데도 그렇게 판단합니다.' : '')));
      if (isNew) {
        st.steps[1] = { t: st.steps[1].t, r: '조회하지 않음', cls: 'plain' };
        send('insert into member …', 'persist'); st.rows.push({ k: 'id 8', v: '박새로 · 20세', cls: 'hot' });
        st.steps[2] = { t: '쓰기 SQL', r: 'INSERT', cls: 'hot' };
        push('INSERT: 조회 없이 바로 INSERT를 보냅니다. id를 DB가 정하는 IDENTITY 전략이라, INSERT를 실행하고 DB가 정한 id 8을 받아 객체에 채웁니다.', 'good');
        st.out = { t: '돌려준 객체', s: '넘긴 객체 그대로 (id 8이 채워짐)', cls: 'good' };
        push('결과: save가 돌려준 객체는 넘긴 객체와 같은 객체입니다. 회원은 8명이 됐습니다.', 'good');
        row = ['성공', '1번', 'INSERT', '회원 8명이 됨 · 돌려준 객체는 넘긴 객체와 같음'];
        sum.push('새 엔티티(id가 null)는 SELECT 없이 INSERT 한 번으로 저장됩니다.');
        sum.push('save는 "새 엔티티면 persist, 아니면 merge"로 나뉩니다. 새 엔티티인지는 기본적으로 id가 null인지로 판단합니다.');
      } else {
        var found = e === 'change' || e === 'same', key = coupon ? 'code = SUMMER' : 'id = ' + (e === 'gone' ? 999 : 1);
        send('select … where ' + key.replace(/= .*/, '= ?'), 'merge');
        st.steps[1] = { t: st.steps[1].t, r: found ? '있음' : '없음', cls: 'hot' };
        if (found) st.rows[0].cls = 'wait';
        push('SELECT: merge는 넘긴 객체를 그대로 저장하지 않습니다. 먼저 같은 id의 행을 DB에서 조회합니다(' + key + '). ' + (found ? 'id 1인 회원 김철수가 있으므로 그 내용으로 관리되는 객체를 따로 만들고, 넘긴 객체의 값을 그 위에 덮어씁니다.' : '그런 행은 없습니다.'));
        if (e === 'change') {
          send('update member … where id = ?', '변경 감지'); st.rows[0] = { k: 'id 1', v: '김영수 · 30세', cls: 'hot' };
          st.steps[2] = { t: '쓰기 SQL', r: 'UPDATE', cls: 'hot' };
          push('UPDATE: 덮어쓰고 나니 이름이 조회한 값(김철수)과 달라졌습니다(김영수). save의 트랜잭션이 커밋될 때 달라진 것을 찾아 UPDATE를 보냅니다.', 'good');
          st.out = { t: '돌려준 객체', s: '넘긴 객체가 아닌, 관리되는 다른 객체', cls: 'good' };
          push('결과: DB의 id 1은 김영수가 됐습니다. save가 돌려준 객체는 넘긴 객체가 아니라 merge가 만든 관리되는 객체입니다.', 'good');
          row = ['성공', '2번', 'SELECT → UPDATE', 'DB의 이름이 김영수로 바뀜 · 돌려준 객체는 넘긴 객체와 다름'];
          sum.push('id가 들어 있는 객체를 save하면 SELECT로 먼저 조회하고, 값이 달라졌을 때 UPDATE가 나갑니다.');
          sum.push('save가 돌려준 객체와 넘긴 객체는 서로 다른 객체입니다. 저장 뒤에 이어서 쓸 때는 돌려받은 객체를 써야 합니다.');
        } else if (e === 'same') {
          st.steps[2] = { t: '쓰기 SQL', r: '보낼 것 없음', cls: 'plain' };
          push('쓰기 SQL 없음: 덮어썼지만 조회한 값과 달라진 것이 없습니다. 트랜잭션이 커밋될 때 보낼 UPDATE가 없습니다.');
          st.out = { t: '돌려준 객체', s: '넘긴 객체가 아닌, 관리되는 다른 객체', cls: 'good' };
          push('결과: SELECT 한 번만 나갔고 DB는 그대로입니다. save를 불렀다고 해서 항상 INSERT나 UPDATE가 나가는 것은 아닙니다.', 'good');
          row = ['성공', '1번', 'SELECT', 'DB 변화 없음 · 돌려준 객체는 넘긴 객체와 다름'];
          sum.push('save를 불렀지만 쓰기 SQL은 나가지 않았습니다. merge는 조회한 값과 비교해 달라진 것이 있을 때만 UPDATE를 보냅니다.');
          sum.push('반대로, 트랜잭션 안에서 조회한 엔티티는 값만 바꾸면 커밋 때 UPDATE가 나가므로 save를 다시 부를 필요가 없습니다(변경 감지).');
        } else if (e === 'gone') {
          send('select … where id = ?', 'merge (다시 확인)');
          st.steps[1] = { t: st.steps[1].t, r: '없음 (두 번 조회)', cls: 'hot' };
          st.steps[2] = { t: '쓰기 SQL', r: '없음 (예외)', cls: 'bad' };
          st.out = { t: 'ObjectOptimisticLockingFailureException', s: 'INSERT도 UPDATE도 하지 않음', cls: 'bad' };
          push('예외: Member는 id를 DB가 정해 주는 엔티티입니다. 그런 엔티티에 id가 들어 있다면 전에 저장된 적이 있는 객체라는 뜻인데, DB에는 그 행이 없습니다. Hibernate는 "있던 행을 그사이 누군가 지웠다"고 보고 예외를 던집니다. 이 PC의 Hibernate 7.4.5에서는 같은 SELECT가 한 번 더 나간 뒤 ObjectOptimisticLockingFailureException이 났습니다. 새 행으로 INSERT해 주지 않습니다.', 'bad');
          row = ['성공', '2번', 'SELECT → SELECT', '예외 (ObjectOptimisticLockingFailureException) · DB 변화 없음'];
          sum.push('id를 DB가 정하는 엔티티에 없는 id를 넣어 save하면 저장되지 않고 예외가 납니다. 새로 저장할 객체에는 id를 넣지 않습니다.');
          sum.push('이 동작은 Hibernate 버전에 따라 다릅니다. Hibernate 6.6의 마이그레이션 안내에는, 그 전 버전에서는 이런 경우 예외 없이 INSERT가 나갔다고 적혀 있습니다(예전 버전은 실행해 보지 않았습니다).');
        } else {
          send('insert into coupon …', '새 행으로 저장'); st.rows.push({ k: 'SUMMER', v: '여름 할인', cls: 'hot' });
          st.steps[2] = { t: '쓰기 SQL', r: 'INSERT', cls: 'hot' };
          push('INSERT: 조회해 보니 없는 행이므로 그제야 새 행으로 저장합니다. 트랜잭션이 커밋될 때 INSERT가 나갑니다. 새 쿠폰 하나를 저장하는 데 SELECT와 INSERT 두 번이 들었습니다.', 'bad');
          st.out = { t: '돌려준 객체', s: '넘긴 객체가 아닌, 관리되는 다른 객체', cls: 'good' };
          push('결과: 쿠폰은 2장이 됐습니다. save가 돌려준 객체는 넘긴 객체가 아니라 merge가 만든 관리되는 객체입니다.', 'good');
          row = ['성공', '2번', 'SELECT → INSERT', '쿠폰 2장이 됨 · 돌려준 객체는 넘긴 객체와 다름'];
          sum.push('id를 코드에서 직접 정하는 엔티티는 처음 저장할 때도 id가 들어 있습니다. save는 "새 엔티티가 아니다"라고 보고 SELECT를 먼저 보냅니다. 많이 저장하면 그 수만큼 SELECT가 더 나갑니다.');
          sum.push('이럴 때는 엔티티가 Persistable 인터페이스를 구현해 새 엔티티인지를 직접 알려 주거나, @Version 필드를 둡니다. Persistable로 새 엔티티라고 알려 주면 SELECT 없이 INSERT 한 번만 나가는 것을 이 PC에서 실행해 확인했습니다.');
        }
      }
    }
    sum.unshift('애플리케이션 기동은 ' + (row[0] === '성공' ? '성공' : '실패') + ', DB로 나간 SQL은 ' + row[1] + '입니다' + (row[2] !== '없음' ? ' (' + row[2] + ').' : '.'));
    return { events: ev, summary: sum, row: row, msg: msg, order: order };
  },
  render: function (v, sim, t, H, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : null, c = sim.c;
    if (!s) { H.text(v, '실행을 누르면 애플리케이션이 뜨는 것부터 한 단계씩 진행합니다.'); return; }
    var ln = H.lanes(v);
    H.lane(ln, '애플리케이션', s.boot === 'fail' ? '기동 실패' : s.boot === 'ok' ? '기동 완료' : '시작하는 중', s.boot === 'fail' ? 'bad' : s.boot === 'ok' ? 'good' : 'wait');
    H.lane(ln, '호출', s.called ? s.call : s.boot === 'fail' ? '부를 수 없음' : '아직 부르기 전', s.called ? 'hot' : 'none');
    H.table(v, ['단계', '내용'], s.steps.map(function (x) { return { cells: [x.t, { v: x.r || '아직', cls: x.cls === 'bad' ? 'bad' : x.cls === 'hot' ? 'hot' : x.cls === 'good' ? 'good' : '' }] }; }), c.sc === 'name' ? '메서드 이름을 조각으로 읽기' : c.sc === 'page' ? '페이지 요청을 처리하는 순서' : 'save가 하는 일');
    H.counters(v, [[s.sent.length, 'DB로 나간 SQL'], [s.out.cls === 'ghost' ? '아직 없음' : s.out.s, s.out.t]]);
    if (s.sent.length) H.table(v, ['#', 'SQL', '이유'], s.sent.map(function (q, i) { return { cells: [String(i + 1), { v: q.sql, cls: i === s.sent.length - 1 ? 'hot' : '' }, q.why] }; }), 'DB로 나간 SQL');
    H.table(v, s.tbl === 'coupon' ? ['code', 'title'] : ['id', '이름 · 나이'], s.rows.map(function (r) { return { cells: [r.k.replace('id ', ''), { v: r.v, cls: r.cls === 'wait' ? '' : r.cls }] }; }), 'DB의 ' + s.tbl + ' 테이블');
  },
  // 그림: 위에 호출한 메서드와 기동 상태, 왼쪽에 스프링 데이터가 만든 구현이 거치는 단계, 오른쪽에 DB의 행. SQL이 나간 단계에만 화살표가 생긴다.
  draw: function (P, sim, shown) {
    var c = sim.c, last = shown[shown.length - 1], prev = shown[shown.length - 2], first = sim.events[0].snap;
    var s = last ? last.snap : { boot: '', call: first.call, called: false, steps: first.steps, out: first.out, sent: [], rows: first.rows, tbl: first.tbl };
    var fresh = s.sent.slice(prev ? prev.snap.sent.length : 0);
    P.size(680, 340);
    P.box('call', 16, 12, 440, 40, { cls: s.called ? 'hot' : s.boot === 'fail' ? 'ghost' : 'plain', title: s.call, sub: s.called ? '호출함' : s.boot === 'fail' ? '부를 수 없음' : '아직 부르기 전' });
    P.box('boot', 464, 12, 200, 40, { cls: s.boot === 'fail' ? 'bad' : s.boot === 'ok' ? 'good' : s.boot === 'ing' ? 'wait' : 'ghost', title: '애플리케이션', right: s.boot === 'fail' ? '기동 실패' : s.boot === 'ok' ? '기동 완료' : s.boot === 'ing' ? '시작하는 중' : '시작 전' });
    P.region('impl', 16, 64, 440, 264, '스프링 데이터가 만든 구현 (프록시)');
    s.steps.forEach(function (x, i) { P.box('p' + i, 28, 96 + i * 40, 416, 34, { cls: x.cls, title: x.t, right: x.r }); });
    P.box('out', 28, 264, 416, 52, { cls: s.out.cls, title: s.out.t, sub: s.out.s });
    P.region('db', 464, 64, 200, 264, 'DB의 ' + s.tbl + ' 테이블');
    s.rows.forEach(function (r, i) { P.box('r' + i, 474, 94 + i * 28, 180, 24, { cls: r.cls || 'plain', title: r.k, right: r.v }); });
    if (fresh.length) P.arrow('sql', 'impl:r', 'db:l', { cls: 'hot', label: fresh.map(function (q) { return q.sql.split(' ')[0].toUpperCase(); }).join(', ') });
    P.note(c.sc === 'name' ? '왼쪽 상자는 메서드 이름을 잘라 읽은 조각이고, 오른쪽 글자는 그 조각이 쿼리에서 맡는 부분입니다. select 뒤의 …은 회원의 모든 컬럼을 뜻합니다. 초록색 행은 조건에 맞아 조회된 회원입니다.' : c.sc === 'page' ? '초록색 행이 이번 페이지로 돌려주는 회원입니다. 파란색 행은 Slice가 다음이 있는지 보려고 한 건 더 읽은 것으로, 돌려주지는 않습니다.' : '가운데 화살표는 이번 단계에서 DB로 SQL이 나갔다는 뜻입니다. 노란색 행은 새로 생기거나 값이 바뀐 행, 파란색 행은 merge가 조회한 행입니다.');
  },
  assume: '모든 장면(메서드 이름 여섯 가지, 페이지 요청 여덟 가지, save 다섯 가지)을 이 PC에서 스프링 부트 4.1.1의 자동 설정으로 스프링 데이터 JPA 4.1.1, Hibernate 7.4.5, H2 데이터베이스를 실제로 띄워 실행하고, 기동 성공 여부와 예외 이름과 메시지, DB로 나간 SQL의 수와 종류, where와 order by의 모양, 건너뛴 건수와 요청한 건수, 돌려받은 결과를 화면과 대조했습니다. 리포지토리의 구현이 프록시이고 그 뒤에 SimpleJpaRepository가 있다는 것도 실행으로 확인했습니다. 화면의 SQL은 읽기 쉽게 줄인 것입니다. 실제 SQL에는 테이블 별칭이 붙고 like 조건에는 escape 절이 덧붙으며, 문장의 모양은 Hibernate 버전과 DB에 따라 다릅니다. 잘못된 메서드 이름 두 가지는 그 메서드만 가진 리포지토리를 따로 띄워 확인했습니다. 결과 요약에서 말한 Or 같은 다른 키워드는 스프링 데이터 JPA 문서의 키워드 표를 따른 것이고 실행해 보지는 않았습니다. save의 "새 엔티티인가" 판단은 스프링 데이터 JPA 문서의 Entity State-detection Strategies 절을 따랐고, @Version 필드가 있는 엔티티는 id가 아니라 그 필드가 null인지로 판단합니다. id 999의 예에서 SELECT가 두 번 나가고 예외가 나는 것은 Hibernate 7.4.5에서 본 결과이며 버전에 따라 다릅니다. id를 직접 정하는 엔티티가 Persistable을 구현해 새 엔티티라고 알려 주면 SELECT 없이 INSERT 한 번만 나가는 것도 실행으로 확인했습니다(@Version 필드를 두는 방법은 실행해 보지 않았습니다). save는 바깥에 트랜잭션이 없는 상태에서 불렀으므로 save 자신의 트랜잭션이 끝날 때 UPDATE와 INSERT가 나갑니다. 바깥에 @Transactional이 있으면 그 트랜잭션이 커밋될 때 나갑니다.',
});

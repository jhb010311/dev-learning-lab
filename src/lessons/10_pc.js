Lab.register({
  id: 'pc', nav: '영속성 컨텍스트', cat: 'JPA', mode: 'step',
  title: 'JPA는 SQL을 언제 보내나',
  intro: 'JPA는 엔티티를 영속성 컨텍스트라는 메모리 공간에 보관하고, SQL을 코드가 실행되는 순간이 아니라 필요한 시점에 모아서 보냅니다.',
  terms: ['영속성 컨텍스트', '1차 캐시', '변경 감지(Dirty Checking)', '쓰기 지연과 flush', '엔티티'], ranks: ['jpaorm'],
  controls: [
    { id: 'sc', label: '해 볼 코드', type: 'select', value: 'update', options: [['find2', '같은 회원을 두 번 조회'], ['update', '조회한 뒤 이름만 바꿈 (save 호출 없음)'], ['persist', '새 회원 3명 저장'], ['jpql', '이름을 바꾼 뒤 JPQL로 조회']] },
    { id: 'tx', label: '메서드에 @Transactional이 있다', type: 'check', value: true, show: function (c) { return c.sc === 'update'; } },
    { id: 'gen', label: '기본 키 생성 전략', type: 'select', value: 'IDENTITY', options: [['IDENTITY', 'IDENTITY (DB의 auto increment)'], ['SEQUENCE', 'SEQUENCE (DB 시퀀스)']], show: function (c) { return c.sc === 'persist'; } },
  ],
  presets: [
    { t: '처음 설정으로', q: '@Transactional이 있는 메서드에서 회원을 조회해 이름만 바꾸고 save를 부르지 않으면 UPDATE는 언제 나가나', d: '이름만 바꿨는데 커밋할 때 UPDATE가 나갑니다(변경 감지).', v: { sc: 'update', tx: true, gen: 'IDENTITY' } },
    { t: '@Transactional이 없으면', q: '메서드의 @Transactional을 끄고 같은 코드를 실행하면', d: '같은 코드인데 UPDATE가 나가지 않습니다.', v: { sc: 'update', tx: false, gen: 'IDENTITY' } },
    { t: '같은 회원을 두 번 조회', q: '해 볼 코드를 같은 회원 두 번 조회로 바꾸면', d: '두 번째는 DB에 가지 않습니다(1차 캐시).', v: { sc: 'find2', tx: true, gen: 'IDENTITY' } },
    { t: '저장: IDENTITY 전략', q: '기본 키 생성 전략이 IDENTITY인데 새 회원 3명을 저장하면', d: 'persist를 부를 때마다 INSERT가 바로 나갑니다.', v: { sc: 'persist', tx: true, gen: 'IDENTITY' } },
    { t: '저장: SEQUENCE 전략', q: '새 회원 3명을 저장하는데 기본 키 생성 전략을 SEQUENCE로 바꾸면', d: 'INSERT를 모아 두었다가 커밋할 때 한꺼번에 보냅니다(쓰기 지연).', v: { sc: 'persist', tx: true, gen: 'SEQUENCE' } },
    { t: '변경 뒤 JPQL 조회', q: '조회한 회원의 이름을 바꾼 뒤 JPQL로 조회하면', d: '커밋 전인데도 JPQL 실행 직전에 UPDATE가 먼저 나갑니다.', v: { sc: 'jpql', tx: true, gen: 'IDENTITY' } },
  ],
  lines: function (c) {
    if (c.sc === 'find2') return ['Member a = em.find(Member.class, 1L);', 'Member b = em.find(Member.class, 1L);', 'System.out.println(a == b);'];
    if (c.sc === 'update') return ['Member m = memberRepository.findById(1L).orElseThrow();', 'm.setName("김영수");', '// save()를 부르지 않고 메서드가 끝난다'];
    if (c.sc === 'persist') return ['em.persist(new Member("회원A"));', 'em.persist(new Member("회원B"));', 'em.persist(new Member("회원C"));'];
    return ['Member m = em.find(Member.class, 1L);', 'm.setName("김영수");', 'List<Member> list = em.createQuery(', '    "select m from Member m where m.name = \'김영수\'", Member.class)', '    .getResultList();'];
  },
  code: function (c) {
    var tx = c.sc !== 'update' || c.tx, head = c.sc === 'persist' ? '@Entity class Member {\n    @Id @GeneratedValue(strategy = GenerationType.' + c.gen + ')\n    Long id;\n    String name;\n}\n\n' : '';
    return head + (tx ? '@Transactional\n' : '') + 'public void run() {\n' + this.lines(c).map(function (l) { return '    ' + l; }).join('\n') + '\n}' + (tx ? '   // 메서드가 끝나면 커밋' : '   // 트랜잭션 없이 끝남');
  },
  label: function (c) { return { find2: '두 번 조회', update: '이름 변경' + (c.tx ? '' : ' · @Transactional 없음'), persist: '3명 저장 · ' + c.gen, jpql: '변경 뒤 JPQL' }[c.sc]; },
  columns: ['DB로 나간 SQL', '쓰기 SQL이 나간 시점', 'DB에 반영된 결과'],
  simulate: function (c) {
    var ev = [], cache = [], pending = [], sent = [], db = [{ id: 1, name: '김철수' }], when = '해당 없음', result = '', sum = [];
    function snap(line) { return { line: line, cache: cache.map(function (e) { return { id: e.id, name: e.name, snap: e.snap, st: e.st }; }), pending: pending.slice(), sent: sent.slice(), db: db.map(function (r) { return { id: r.id, name: r.name, cls: r.cls }; }) }; }
    function push(line, s, k) { ev.push({ s: s, k: k, snap: snap(line) }); }
    function send(sql, at) { sent.push({ sql: sql, at: at }); }
    var L = this.lines(c);
    if (c.sc === 'find2') {
      send('select * from member where id = 1', '1번째 줄'); cache.push({ id: 1, name: '김철수', snap: '김철수', st: '관리 중' });
      push(0, '1번째 줄: 영속성 컨텍스트의 1차 캐시에 회원 1이 없습니다. DB에 SELECT를 보내 읽어 오고, 읽은 엔티티를 1차 캐시에 보관합니다. 처음 읽었을 때의 값(스냅샷)도 함께 남겨 둡니다.', '');
      push(1, '2번째 줄: 1차 캐시에 회원 1이 이미 있습니다. DB에 가지 않고 보관 중인 객체를 그대로 돌려줍니다. SQL이 나가지 않았습니다.', 'good');
      push(2, '3번째 줄: a와 b는 같은 객체입니다. a == b는 true입니다. 한 트랜잭션 안에서는 같은 식별자의 엔티티가 항상 같은 인스턴스임이 보장됩니다.', '');
      push(-1, '메서드 종료, 커밋: 엔티티의 현재 값과 스냅샷을 비교했지만 달라진 것이 없습니다. 보낼 SQL이 없습니다.', '');
      result = '변화 없음'; sum.push('em.find를 두 번 불렀지만 SELECT는 한 번만 나갔습니다. 같은 트랜잭션 안에서 이미 읽은 엔티티는 1차 캐시에서 꺼냅니다.', '1차 캐시는 트랜잭션(영속성 컨텍스트) 하나 안에서만 살아 있습니다. 요청이 끝나면 사라지므로, 여러 요청이 함께 쓰는 Redis 같은 캐시와는 목적이 다릅니다.');
    }
    if (c.sc === 'update') {
      send('select * from member where id = 1', '1번째 줄');
      if (c.tx) {
        cache.push({ id: 1, name: '김철수', snap: '김철수', st: '관리 중' });
        push(0, '1번째 줄: SELECT로 회원 1을 읽어 영속성 컨텍스트에 보관합니다. 읽은 시점의 값 "김철수"를 스냅샷으로 남깁니다.', '');
        cache[0].name = '김영수'; push(1, '2번째 줄: 자바 객체의 이름만 바꿨습니다. 이 순간 DB에는 아무 SQL도 가지 않습니다. 영속성 컨텍스트 안에서 현재 값(김영수)과 스냅샷(김철수)이 달라졌습니다.', '');
        push(2, '3번째 줄: save를 부르지 않고 메서드가 끝납니다.', '');
        send("update member set name = '김영수' where id = 1", '커밋 직전'); db[0].name = '김영수'; db[0].cls = 'hot'; cache[0].snap = '김영수'; when = '커밋 직전';
        push(-1, '메서드 종료, 커밋: 커밋 직전에 flush가 일어납니다. 관리 중인 엔티티의 현재 값을 스냅샷과 비교해 달라진 회원 1을 찾아내고, UPDATE를 만들어 DB로 보낸 뒤 커밋합니다. 이것이 변경 감지입니다.', 'good');
        result = '김영수로 변경됨'; sum.push('update나 save를 호출하지 않았는데 UPDATE가 나갔습니다. 영속성 컨텍스트가 관리하는 엔티티는 값만 바꾸면, 커밋 시점에 스냅샷과 비교해 SQL을 만들어 줍니다.');
      } else {
        cache.push({ id: 1, name: '김철수', snap: '김철수', st: '준영속 (관리 끝남)' });
        push(0, '1번째 줄: findById는 자기 자신의 트랜잭션 안에서 SELECT를 보내고 끝납니다. 메서드에 @Transactional이 없으므로, 조회가 끝난 뒤에는 이 엔티티의 변경을 DB에 반영해 줄 트랜잭션이 없습니다.', '');
        cache[0].name = '김영수'; push(1, '2번째 줄: 자바 객체의 이름을 바꿨습니다. 메모리 안의 값만 바뀌었습니다.', '');
        push(2, '3번째 줄: save를 부르지 않고 메서드가 끝납니다.', '');
        push(-1, '메서드 종료: 커밋이 없으므로 flush도 없습니다. 현재 값과 스냅샷을 비교해 주는 시점 자체가 오지 않아 UPDATE가 나가지 않습니다. DB의 이름은 그대로 "김철수"입니다.', 'bad');
        result = '김철수 그대로 (반영 안 됨)'; when = '나가지 않음'; sum.push('변경 감지는 트랜잭션이 커밋될 때의 flush에서 일어납니다. @Transactional이 없으면 값을 바꿔도 DB에 반영되지 않습니다. 예외도 나지 않아서 놓치기 쉽습니다.');
      }
    }
    if (c.sc === 'persist') {
      ['회원A', '회원B', '회원C'].forEach(function (nm, i) {
        var id = i + 2, ins = "insert into member (name) values ('" + nm + "')";
        if (c.gen === 'IDENTITY') { send(ins, (i + 1) + '번째 줄'); db.push({ id: id, name: nm, cls: 'hot' }); cache.push({ id: id, name: nm, snap: nm, st: '관리 중' }); push(i, (i + 1) + '번째 줄: IDENTITY 전략은 DB가 INSERT를 실행해야 id가 정해집니다. 영속성 컨텍스트에 보관하려면 id가 필요하므로, persist를 부르는 즉시 INSERT를 보내 id ' + id + '번을 받아 옵니다.', 'bad'); }
        else { send("select nextval('member_seq')", (i + 1) + '번째 줄'); pending.push("insert into member (id, name) values (" + id + ", '" + nm + "')"); cache.push({ id: id, name: nm, snap: nm, st: '관리 중' }); push(i, (i + 1) + '번째 줄: 시퀀스에서 id ' + id + '번을 먼저 받아 옵니다. id를 알았으므로 엔티티를 영속성 컨텍스트에 보관하고, INSERT는 보내지 않고 쓰기 지연 저장소에 쌓아 둡니다.', ''); }
      });
      if (c.gen === 'IDENTITY') { when = 'persist를 부를 때마다'; push(-1, '메서드 종료, 커밋: INSERT는 이미 다 나갔으므로 flush할 것이 없습니다. 커밋만 합니다.', ''); sum.push('IDENTITY 전략에서는 persist 호출마다 INSERT가 한 건씩 바로 나갑니다. INSERT를 모아 보낼 수 없어서 JDBC 배치 INSERT가 적용되지 않습니다.'); }
      else { pending.forEach(function (q) { send(q, '커밋 직전'); }); pending = []; ['회원A', '회원B', '회원C'].forEach(function (nm, i) { db.push({ id: i + 2, name: nm, cls: 'hot' }); }); when = '커밋 직전에 한꺼번에'; push(-1, '메서드 종료, 커밋: flush가 일어나 쓰기 지연 저장소에 쌓인 INSERT 3건을 DB로 보내고 커밋합니다.', 'good'); sum.push('SEQUENCE 전략에서는 id를 먼저 받아 올 수 있어서 INSERT를 커밋 시점까지 미룹니다(쓰기 지연). 모아 둔 INSERT는 JDBC 배치로 묶어 보낼 수 있습니다.'); }
      result = '회원 3명 추가';
    }
    if (c.sc === 'jpql') {
      send('select * from member where id = 1', '1번째 줄'); cache.push({ id: 1, name: '김철수', snap: '김철수', st: '관리 중' });
      push(0, '1번째 줄: SELECT로 회원 1을 읽어 영속성 컨텍스트에 보관합니다.', '');
      cache[0].name = '김영수'; push(1, '2번째 줄: 객체의 이름만 바꿨습니다. SQL은 나가지 않습니다. DB에는 아직 "김철수"입니다.', '');
      send("update member set name = '김영수' where id = 1", '3번째 줄 (JPQL 실행 직전)'); db[0].name = '김영수'; db[0].cls = 'hot'; cache[0].snap = '김영수'; when = 'JPQL 실행 직전';
      push(2, '3~5번째 줄: JPQL은 1차 캐시가 아니라 DB에 직접 SQL을 보냅니다. 이대로 조회하면 방금 바꾼 이름이 DB에 없어서 결과가 어긋납니다. 그래서 JPQL을 실행하기 직전에 자동으로 flush가 일어나 UPDATE가 먼저 나갑니다. 아직 커밋은 아닙니다.', 'bad');
      send("select * from member where name = '김영수'", '3번째 줄'); push(4, 'UPDATE에 이어 JPQL의 SELECT가 나갑니다. 같은 트랜잭션 안이므로 방금 보낸 UPDATE의 결과가 보이고, 회원 1이 조회됩니다.', 'good');
      push(-1, '메서드 종료, 커밋: 변경 사항은 이미 flush됐으므로 더 보낼 SQL이 없습니다. 커밋하면 다른 트랜잭션에도 변경이 보이게 됩니다.', '');
      result = '김영수로 변경됨'; sum.push('flush는 "모아 둔 SQL을 DB로 보내는 것"이고 커밋과는 다릅니다. 커밋 때뿐 아니라 JPQL을 실행하기 직전에도 자동으로 일어납니다.', '반대로 em.find는 1차 캐시를 먼저 보기 때문에 flush를 일으키지 않습니다.');
    }
    return { events: ev, summary: sum, L: L, row: [sent.length + '건', when, result] };
  },
  render: function (v, sim, t, H, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : { line: -2, cache: [], pending: [], sent: [], db: [{ id: 1, name: '김철수' }] };
    H.table(v, ['줄', '코드', ''], sim.L.map(function (l, i) { var on = i === s.line; return { cells: [String(i + 1), { v: l, cls: on ? 'hot' : '' }, on ? '← 지금' : ''] }; }).concat([{ cells: ['', { v: '(메서드 종료)', cls: s.line === -1 ? 'hot' : '' }, s.line === -1 ? '← 지금' : ''] }]), '실행 중인 코드');
    if (s.pending.length) H.table(v, ['쌓아 둔 SQL'], s.pending.map(function (q) { return { cells: [q] }; }), '쓰기 지연 저장소');
    if (s.sent.length) H.table(v, ['#', 'SQL', '나간 시점'], s.sent.map(function (q, i) { return { cells: [String(i + 1), q.sql, q.at] }; }), 'DB로 실제 나간 SQL');
  },
  // 그림: 왼쪽에 영속성 컨텍스트(1차 캐시와 쓰기 지연 저장소), 오른쪽에 DB. SQL이 실제로 나가는 단계에만 화살표가 생긴다.
  draw: function (P, sim, shown) {
    var last = shown[shown.length - 1], prev = shown[shown.length - 2], s = last ? last.snap : { cache: [], pending: [], sent: [], db: [{ id: 1, name: '김철수' }] }, before = prev ? prev.snap.sent.length : 0, fresh = s.sent.slice(before);
    P.size(680, 330);
    P.region('pc', 16, 16, 400, 298, '영속성 컨텍스트 (트랜잭션 동안만 있음)');
    P.region('db', 470, 16, 194, 298, 'DB의 member 테이블');
    P.text('c1', 28, 58, '1차 캐시: 관리 중인 엔티티', { cls: 'mut' });
    if (!s.cache.length) P.box('none', 28, 66, 376, 46, { cls: 'ghost', sub: '비어 있음', center: true });
    s.cache.forEach(function (e, i) { var gone = e.st.indexOf('준영속') === 0; P.box('e' + e.id, 28, 66 + i * 52, 376, 46, { cls: gone ? 'ghost' : e.name !== e.snap ? 'hot' : 'good', title: '회원 ' + e.id + (gone ? ' (관리 끝남)' : ''), sub: '현재 값: ' + e.name + '  ·  스냅샷: ' + e.snap }); });
    P.box('pend', 28, 250, 376, 48, { cls: s.pending.length ? 'wait' : 'ghost', title: '쓰기 지연 저장소', sub: s.pending.length ? 'INSERT ' + s.pending.length + '건을 보내지 않고 쌓아 둠' : '쌓아 둔 SQL 없음' });
    s.db.forEach(function (r, i) { P.box('r' + r.id, 482, 52 + i * 40, 170, 32, { cls: r.cls === 'hot' ? 'hot' : 'plain', title: 'id ' + r.id, right: r.name }); });
    if (fresh.length) { var kinds = {}; fresh.forEach(function (q) { var k = q.sql.split(' ')[0].toUpperCase(); kinds[k] = (kinds[k] || 0) + 1; }); P.arrow('sql', 'pc:r', 'db:l', { cls: 'hot', label: Object.keys(kinds).map(function (k) { return k + (kinds[k] > 1 ? ' ×' + kinds[k] : ''); }).join(', ') }); }
    P.text('cnt', 482, 300, 'DB로 나간 SQL ' + s.sent.length + '건', { cls: 'mut' });
    P.note('노란 엔티티는 현재 값이 스냅샷과 달라진 것으로, 커밋할 때 UPDATE 대상이 됩니다. 가운데 화살표는 이번 단계에서 DB로 SQL이 나갔다는 뜻입니다. 화살표가 없는 단계에서는 메모리 안에서만 일이 일어난 것입니다.');
  },
  assume: '코드가 하나의 영속성 컨텍스트 안에서 실행된다고 보았습니다. 시퀀스 전략은 persist마다 시퀀스를 한 번 조회하는 것으로 단순화했습니다. 실제 기본 설정(allocationSize 50)에서는 id를 묶음으로 받아 두기 때문에 시퀀스 조회가 훨씬 적게 나갑니다. "@Transactional이 없으면" 예에서는 스프링 데이터 리포지토리의 조회 메서드가 자체 트랜잭션으로 실행되고 끝난다고 가정했습니다. 스프링 부트의 open-in-view 기본 설정에서는 엔티티가 관리 상태로 남기도 하지만, 커밋 시점이 없으므로 UPDATE가 나가지 않는 결과는 같습니다. 여섯 장면 모두를 실제 Hibernate 7.4.5와 H2 데이터베이스에서 실행해, 나간 SQL의 수와 쓰기 SQL이 나간 시점, DB에 남은 값이 화면과 일치하는 것을 확인했습니다(시퀀스 전략은 화면의 단순화에 맞춰 allocationSize를 1로 두고 실행).',
});

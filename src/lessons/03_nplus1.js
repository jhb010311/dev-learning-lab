Lab.register({
  id: 'nplus1', nav: 'N+1', cat: 'JPA', mode: 'step',
  title: '주문 목록 한 번 조회했는데 쿼리는 왜 여러 번 나가나',
  intro: '주문 목록을 조회한 뒤 주문마다 회원 이름을 꺼냅니다. 연관된 회원을 언제, 어떻게 가져오느냐에 따라 DB로 나가는 쿼리 수가 달라집니다. 로딩 전략을 바꿔 가며 쿼리 로그를 비교해 보세요.',
  terms: ['N+1 문제', '지연 로딩과 즉시 로딩', 'fetch join', '@EntityGraph', '배치 페치(Batch Size)', '1차 캐시'], ranks: ['nplus1', 'jpaorm'],
  controls: [
    { id: 'n', label: '조회되는 주문 건수', type: 'range', min: 1, max: 30, value: 10, fmt: function (v) { return v + '건'; } },
    { id: 'm', label: '그 주문들을 한 회원 수', type: 'range', min: 1, max: 30, value: 10, fmt: function (v) { return v + '명'; }, hint: '같은 회원의 주문이 여러 건이면 회원 수가 주문 건수보다 적습니다.' },
    { id: 'st', label: '회원(연관 엔티티)을 가져오는 방법', type: 'select', value: 'lazy', options: [['lazy', '지연 로딩 (LAZY)'], ['eager', '즉시 로딩 (EAGER)'], ['fetch', '지연 로딩 + fetch join'], ['graph', '지연 로딩 + @EntityGraph'], ['batch', '지연 로딩 + 배치 크기 설정']] },
    { id: 'bs', label: '배치 크기', type: 'range', min: 2, max: 20, value: 5, fmt: function (v) { return v + '개씩'; }, show: function (c) { return c.st === 'batch'; }, hint: '보기 쉽게 작은 값으로 두었습니다. 실제 설정에서는 훨씬 큰 값(예: 100)을 씁니다.' },
    { id: 'use', label: '조회한 뒤 회원 이름을 사용한다', type: 'check', value: true },
    { id: 'rt', label: '쿼리 한 번의 DB 왕복 시간', type: 'range', min: 1, max: 20, value: 5, fmt: function (v) { return v + 'ms'; } },
  ],
  fix: function (c) { return c.m > c.n ? { m: c.n } : null; },
  presets: [
    { t: '처음 설정으로', d: '지연 로딩, 주문 10건, 회원 10명. 쿼리가 1 + 10번 나갑니다.', v: { n: 10, m: 10, st: 'lazy', bs: 5, use: true, rt: 5 } },
    { t: '즉시 로딩으로 바꾸면 해결될까', d: '쿼리 수는 그대로이고 나가는 시점만 앞당겨집니다.', v: { n: 10, m: 10, st: 'eager', bs: 5, use: true, rt: 5 } },
    { t: 'fetch join', d: '주문과 회원을 한 쿼리로 가져옵니다.', v: { n: 10, m: 10, st: 'fetch', bs: 5, use: true, rt: 5 } },
    { t: '배치 크기 설정', d: '회원을 5명씩 묶어서 IN 쿼리로 가져옵니다.', v: { n: 10, m: 10, st: 'batch', bs: 5, use: true, rt: 5 } },
    { t: '같은 회원의 주문이 많을 때', d: '주문 10건, 회원 3명. 이미 읽은 회원은 다시 조회하지 않습니다.', v: { n: 10, m: 3, st: 'lazy', bs: 5, use: true, rt: 5 } },
    { t: '회원 정보를 쓰지 않을 때', d: '지연 로딩은 쓰지 않는 회원을 조회하지 않습니다. 즉시 로딩과 비교해 보세요.', v: { n: 10, m: 10, st: 'lazy', bs: 5, use: false, rt: 5 } },
    { t: '주문 30건으로 늘리면', d: '지연 로딩에서는 데이터가 늘어난 만큼 쿼리도 늘어납니다.', v: { n: 30, m: 30, st: 'lazy', bs: 5, use: true, rt: 5 } },
  ],
  code: function (c) {
    var eager = c.st === 'eager';
    var q = c.st === 'fetch' ? '@Query("select o from Order o join fetch o.member")' : c.st === 'graph' ? '@EntityGraph(attributePaths = "member")\n    @Query("select o from Order o")' : '@Query("select o from Order o")';
    return '@Entity class Order {\n    @ManyToOne(fetch = FetchType.' + (eager ? 'EAGER' : 'LAZY') + ')\n    Member member;\n}\n\ninterface OrderRepository {\n    ' + q + '\n    List<Order> findOrders();\n}\n' +
      (c.st === 'batch' ? '\n// application.yml\n// hibernate.default_batch_fetch_size: ' + c.bs + '\n' : '') +
      '\n// 서비스 (트랜잭션 안)\nList<Order> orders = repo.findOrders();   // 주문 ' + c.n + '건\nfor (Order o : orders) {\n' + (c.use ? '    names.add(o.getMember().getName());  // 회원 이름 사용' : '    total += o.getAmount();              // 회원은 쓰지 않음') + '\n}';
  },
  label: function (c) { return { lazy: '지연 로딩', eager: '즉시 로딩', fetch: 'fetch join', graph: '@EntityGraph', batch: '배치 ' + c.bs + '개씩' }[c.st] + ' · 주문 ' + c.n + '건 · 회원 ' + c.m + '명 · 이름 ' + (c.use ? '사용' : '사용 안 함'); },
  columns: ['쿼리 수', '주문 조회', '회원 조회', 'DB 왕복 시간'],
  simulate: function (c) {
    var ev = [], qs = [], loaded = {}, orders = [], cursor = 0;
    for (var i = 1; i <= c.n; i++) orders.push({ id: i, mem: (i - 1) % c.m + 1 });
    function snap() { var l = {}; Object.keys(loaded).forEach(function (k) { l[k] = 1; }); return { qs: qs.slice(), loaded: l, cursor: cursor }; }
    function push(s, k) { ev.push({ s: s, k: k, snap: snap() }); }
    function query(sql, why, kind) { qs.push({ sql: sql, why: why, kind: kind }); }
    var joined = c.st === 'fetch' || c.st === 'graph';
    if (joined) {
      query('select o.*, m.* from orders o ' + (c.st === 'fetch' ? 'join' : 'left join') + ' member m on m.id = o.member_id', '목록 조회', 'o');
      for (var a = 1; a <= c.m; a++) loaded[a] = 1;
      push('쿼리 1번: 주문과 회원을 조인해서 한 번에 가져왔습니다. 주문 ' + c.n + '건과 회원 ' + c.m + '명이 모두 메모리에 올라왔습니다.', 'good');
    } else {
      query('select o.* from orders o', '목록 조회', 'o');
      push('쿼리 1번: 주문 ' + c.n + '건을 가져왔습니다. 회원은 가져오지 않았습니다. JPQL은 적힌 그대로 주문 테이블만 조회하는 SQL이 됩니다.', '');
    }
    if (c.st === 'eager') {
      orders.forEach(function (o) {
        if (loaded[o.mem]) return;
        loaded[o.mem] = 1; query('select m.* from member m where m.id = ' + o.mem, '즉시 로딩', 'm');
        push('쿼리 ' + qs.length + '번: 즉시 로딩으로 설정돼 있어서, 조회 결과를 돌려주기 전에 주문 ' + o.id + '의 회원 ' + o.mem + '을 바로 조회합니다. 코드에서 회원을 쓰는지와 상관없습니다.', 'bad');
      });
    }
    if (!c.use) { cursor = c.n; push('반복문에서 주문 금액만 사용했습니다. 회원에는 손대지 않았으므로 추가 쿼리는 없습니다.', ''); }
    else orders.forEach(function (o) {
      cursor = o.id;
      if (loaded[o.mem]) { if (c.st === 'lazy' || c.st === 'batch') push('주문 ' + o.id + ': 회원 ' + o.mem + '의 이름을 꺼냅니다. 이 회원은 이미 영속성 컨텍스트(1차 캐시)에 있어서 쿼리가 나가지 않습니다.', ''); return; }
      if (c.st === 'batch') {
        var ids = [o.mem]; orders.forEach(function (x) { if (ids.length < c.bs && !loaded[x.mem] && ids.indexOf(x.mem) < 0) ids.push(x.mem); });
        ids.forEach(function (id) { loaded[id] = 1; });
        query('select m.* from member m where m.id in (' + ids.join(', ') + ')', '배치 로딩', 'm');
        push('쿼리 ' + qs.length + '번: 주문 ' + o.id + '에서 회원 ' + o.mem + '의 이름을 꺼내려 합니다. 아직 읽지 않은 회원을 최대 ' + c.bs + '명까지 묶어 IN 쿼리 한 번으로 가져왔습니다(' + ids.length + '명).', '');
      } else {
        loaded[o.mem] = 1; query('select m.* from member m where m.id = ' + o.mem, '지연 로딩', 'm');
        push('쿼리 ' + qs.length + '번: 주문 ' + o.id + '에서 회원 ' + o.mem + '의 이름을 꺼내는 순간, 비어 있던 회원 객체(프록시)를 채우려고 조회 쿼리가 나갑니다.', 'bad');
      }
    });
    if (c.use && (joined || c.st === 'eager')) push('반복문에서 주문 ' + c.n + '건의 회원 이름을 꺼냈습니다. 회원이 이미 전부 로딩돼 있어서 추가 쿼리는 없습니다.', '');
    var total = qs.length, mq = total - 1, sum = ['쿼리가 모두 ' + total + '번 나갔습니다(주문 조회 1번 + 회원 조회 ' + mq + '번). DB 왕복에 ' + total * c.rt + 'ms를 썼습니다.'];
    if (c.st === 'lazy' && c.use) sum.push('목록 1번에 더해 회원 수만큼 쿼리가 따라 나갔습니다. 이것이 N+1 문제입니다. 추가 쿼리 수는 주문 건수가 아니라 아직 읽지 않은 서로 다른 회원 수(' + c.m + '명)로 정해집니다.');
    if (c.st === 'lazy' && !c.use) sum.push('지연 로딩은 실제로 쓸 때만 조회하므로, 회원을 쓰지 않는 화면에서는 쿼리 1번으로 끝납니다. 지연 로딩을 기본으로 두는 이유입니다.');
    if (c.st === 'eager') sum.push('즉시 로딩으로 바꿔도 JPQL 조회에서는 N+1이 그대로 발생합니다. 시점만 조회 직후로 당겨지고' + (c.use ? '' : ', 회원을 쓰지 않는데도 ' + mq + '번을 더 조회했습니다') + '. 즉시 로딩은 N+1의 해법이 아닙니다.');
    if (c.st === 'fetch') sum.push('fetch join은 연관된 회원까지 한 쿼리로 가져옵니다. 이 예의 join fetch는 내부 조인이라 회원이 없는 주문은 결과에서 빠집니다. 그런 주문도 필요하면 left join fetch를 씁니다.');
    if (c.st === 'graph') sum.push('@EntityGraph는 JPQL을 고치지 않고 "회원도 같이 가져오라"고 지정합니다. 이 예처럼 회원이 없을 수도 있는 기본 매핑에서는 left outer join으로 가져옵니다(optional = false로 매핑하면 inner join이 됩니다).');
    if (c.st === 'batch' && c.use) sum.push('배치 크기를 주면 회원을 한 명씩이 아니라 ' + c.bs + '명씩 묶어 가져옵니다. 회원 ' + c.m + '명을 ' + mq + '번(' + c.m + ' ÷ ' + c.bs + ' 올림)에 가져와서 쿼리 수가 1 + ' + c.m + '에서 1 + ' + mq + '로 줄었습니다.');
    if (c.st === 'batch' && !c.use) sum.push('배치 크기 설정도 지연 로딩이므로, 회원을 쓰지 않으면 추가 쿼리가 없습니다.');
    return { events: ev, summary: sum, orders: orders, row: [total + '번', '1번', mq + '번', total * c.rt + 'ms'] };
  },
  render: function (v, sim, t, H, shown) {
    var c = sim.c, last = shown[shown.length - 1], s = last ? last.snap : { qs: [], loaded: {}, cursor: 0 };
    var nl = Object.keys(s.loaded).length;
    H.counters(v, [[s.qs.length, '나간 쿼리'], [s.qs.length * c.rt + 'ms', 'DB 왕복 시간'], [nl + ' / ' + c.m, '로딩된 회원']]);
    H.title(v, '조회한 주문 ' + c.n + '건 (주문 번호 → 회원 번호)');
    H.slots(v, s.qs.length ? sim.orders.map(function (o) { return [o.id + '→' + o.mem, (s.loaded[o.mem] ? 'd' : '') + (o.id === s.cursor && c.use ? ' now' : '')]; }) : [], '아직 조회 전입니다.', true);
    H.text(v, '초록은 회원 정보까지 메모리에 올라온 주문, 점선은 회원이 아직 빈 객체(프록시)인 주문입니다.');
    H.table(v, ['#', 'DB로 나간 SQL', '이유'], s.qs.map(function (q, i) { return { cells: [String(i + 1), { v: q.sql, cls: i === s.qs.length - 1 ? 'hot' : '' }, q.why] }; }), '쿼리 로그');
  },
  assume: '주문(Order)이 회원(Member)을 @ManyToOne으로 참조하고, 반복문은 트랜잭션(영속성 컨텍스트)이 열려 있는 동안 실행된다고 가정했습니다. 영속성 컨텍스트가 닫힌 뒤에 지연 로딩 대상을 건드리면 기본 설정에서는 쿼리 대신 LazyInitializationException이 납니다. 쿼리 수는 실제 Hibernate 7.4.5와 H2 데이터베이스로 112가지 조합(다섯 가지 방법, 주문 1·10·30건, 회원 1·3·10·30명, 배치 크기 2·5·20, 이름 사용 여부)을 실행해, 실제로 나간 SQL의 수가 화면과 일치하는 것을 확인했습니다. @EntityGraph는 스프링 데이터가 내부에서 쓰는 것과 같은 JPA 엔티티 그래프 힌트로 실행했습니다. 즉시 로딩의 1 + 회원 수는 배치 설정이 없을 때의 값입니다. 배치 로딩은 묶음 크기대로 나누는 Hibernate 6 이후의 방식 기준이며, Hibernate 5의 기본 방식에서는 쿼리가 더 나갈 수 있습니다. SQL 모양은 DB에 따라 달라서 MySQL은 IN 목록을, PostgreSQL은 배열 파라미터(= any(?))를 씁니다. 왕복 시간은 쿼리마다 같다고 단순화했습니다. 실제로는 조인 쿼리 한 번이 단순 조회 한 번보다 무거울 수 있습니다.',
});

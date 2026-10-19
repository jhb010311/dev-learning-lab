Lab.register({
  id: 'stock', nav: '재고 차감과 락', cat: '데이터베이스', mode: 'step',
  title: '재고 3개에 주문이 동시에 몰리면',
  intro: '여러 요청이 동시에 "재고 확인 → 1 감소 → 주문 생성"을 합니다. 아무 장치가 없으면 재고보다 많이 팔리거나 재고 숫자가 실제와 어긋납니다. 이런 동시 수정을 막는 대표적인 장치가 락이며, 락을 거는 여러 방법과 락 없이 막는 방법의 결과를 비교합니다.',
  terms: ['비관적 락', '낙관적 락(@Version)', '공유 락과 배타 락', '분산 락', '경쟁 상태(Race Condition)'], ranks: ['concurrency', 'traffic', 'dbengine'],
  controls: [
    { id: 'how', label: '동시 수정을 다루는 방법', type: 'select', value: 'none', options: [['none', '아무것도 안 함 (조회 후 수정)'], ['pess', '비관적 락 (SELECT ... FOR UPDATE)'], ['opt', '낙관적 락 (@Version)'], ['atomic', '조건을 넣은 UPDATE 한 문장'], ['dist', '분산 락 (Redis)']] },
    { id: 's', label: '처음 재고', type: 'range', min: 1, max: 5, value: 3, fmt: function (v) { return v + '개'; } },
    { id: 'n', label: '동시에 들어오는 주문', type: 'range', min: 2, max: 6, value: 4, fmt: function (v) { return v + '건'; } },
  ],
  presets: [
    { t: '처음 설정으로', q: '조회 후 수정만 하고 아무 장치 없이 재고 3개에 주문 4건이 동시에 들어오면 어떻게 되나', d: '장치 없음. 재고 3개에 주문 4건이 전부 성공합니다.', v: { how: 'none', s: 3, n: 4 } },
    { t: '비관적 락', q: '비관적 락으로 동시 수정을 다루면', d: '한 번에 하나씩만 재고 행을 읽고 고칩니다. 나머지는 줄을 섭니다.', v: { how: 'pess', s: 3, n: 4 } },
    { t: '낙관적 락', q: '낙관적 락으로 동시 수정을 다루면', d: '일단 진행하고, 저장할 때 누가 먼저 바꿨으면 실패시킵니다.', v: { how: 'opt', s: 3, n: 4 } },
    { t: '조건을 넣은 UPDATE', q: '조건을 넣은 UPDATE 한 문장으로 동시 수정을 다루면', d: '확인과 감소를 SQL 한 문장으로 합칩니다.', v: { how: 'atomic', s: 3, n: 4 } },
    { t: '낙관적 락에 주문이 몰리면', q: '낙관적 락을 쓰고 재고 5개에 주문 6건이 동시에 들어오면', d: '6건이 경쟁합니다. 재시도 횟수를 보세요.', v: { how: 'opt', s: 5, n: 6 } },
  ],
  code: function (c) {
    if (c.how === 'none') return '// 서비스 클래스의 메서드만 보임 (클래스 선언·필드·import와 예시로 만든 Product·Order·SoldOutException의 선언은 생략)\n@Transactional\npublic void order(long productId) {\n    Product p = productRepository.findById(productId).orElseThrow();\n    if (p.getStock() <= 0) throw new SoldOutException();\n    p.setStock(p.getStock() - 1);        // 읽은 값에서 1을 뺀다\n    orderRepository.save(new Order(productId));\n}';
    if (c.how === 'pess') return '// 리포지토리와 서비스 메서드만 보임 (서비스 클래스 선언·필드·import와 예시로 만든 Product·Order·SoldOutException의 선언은 생략)\ninterface ProductRepository extends JpaRepository<Product, Long> {\n    @Lock(LockModeType.PESSIMISTIC_WRITE)      // SELECT ... FOR UPDATE\n    @Query("select p from Product p where p.id = :id")\n    Optional<Product> findByIdForUpdate(long id);\n}\n\n@Transactional\npublic void order(long productId) {\n    Product p = productRepository.findByIdForUpdate(productId).orElseThrow();\n    if (p.getStock() <= 0) throw new SoldOutException();\n    p.setStock(p.getStock() - 1);\n    orderRepository.save(new Order(productId));\n}                                              // 커밋할 때 락이 풀린다';
    if (c.how === 'opt') return '@Entity class Product {\n    @Id Long id;\n    int stock;\n    @Version Long version;                     // 수정할 때마다 1 증가\n}\n\n// 실행되는 SQL\n// UPDATE product SET stock = ?, version = version + 1\n//  WHERE id = ? AND version = ?   -- 읽었을 때의 버전\n// 바뀐 행이 0건이면 예외 -> 다시 읽고 재시도';
    if (c.how === 'atomic') return '// 리포지토리 메서드와 서비스 메서드만 보임 (두 타입의 선언·필드·import와 예시로 만든 Order·SoldOutException의 선언은 생략)\n@Modifying\n@Query("update Product p set p.stock = p.stock - 1 " +\n       "where p.id = :id and p.stock > 0")\nint decrease(long id);                         // 바뀐 행 수를 돌려준다\n\n@Transactional\npublic void order(long productId) {\n    if (productRepository.decrease(productId) == 0) {\n        throw new SoldOutException();\n    }\n    orderRepository.save(new Order(productId));\n}';
    return '// 서비스 클래스의 메서드만 보임 (클래스 선언·필드·import와 예시로 만든 BusyException의 선언은 생략)\npublic void order(long productId) throws InterruptedException {\n    RLock lock = redisson.getLock("stock:" + productId);\n    if (!lock.tryLock(3, 5, TimeUnit.SECONDS)) {   // 3초 대기, 5초 뒤 자동 해제\n        throw new BusyException();\n    }\n    try {\n        orderService.orderInTx(productId);       // 조회 -> 확인 -> 감소 (트랜잭션)\n    } finally {\n        lock.unlock();                           // 커밋이 끝난 뒤에 푼다\n    }\n}';
  },
  label: function (c) { return { none: '장치 없음', pess: '비관적 락', opt: '낙관적 락', atomic: '조건부 UPDATE', dist: '분산 락' }[c.how] + ' · 재고 ' + c.s + '개 · 주문 ' + c.n + '건'; },
  columns: ['만들어진 주문', 'DB에 남은 재고', '재고와 주문이 맞는가', '대기', '재시도'],
  simulate: function (c) {
    var S = c.s, N = c.n, stock = S, ver = 0, ev = [], st = [], orders = 0, sold = 0, waits = 0, retries = 0, sum = [];
    for (var i = 0; i < N; i++) st.push('도착');
    function push(s, k, hot) { ev.push({ s: s, k: k, snap: { stock: stock, ver: ver, st: st.slice(), orders: orders, hot: hot, waits: waits, retries: retries } }); }
    if (c.how === 'none') {
      for (var a = 0; a < N; a++) { st[a] = '재고 ' + S + '개로 읽음'; push('요청 ' + (a + 1) + ': 재고를 조회합니다. ' + S + '개입니다. 0보다 크므로 주문을 진행합니다.' + (a > 0 ? ' 앞 요청들이 아직 저장하기 전이라 같은 값을 읽었습니다.' : ''), '', a); }
      for (var b = 0; b < N; b++) { stock = S - 1; orders++; st[b] = '주문 성공'; push('요청 ' + (b + 1) + ': 자기가 읽은 ' + S + '에서 1을 뺀 값(' + (S - 1) + ')을 재고로 저장하고 주문을 만들었습니다.' + (b > 0 ? ' 앞 요청이 저장한 값을 같은 값으로 덮어썼습니다. 재고는 줄지 않았는데 주문은 하나 더 생겼습니다.' : ''), b > 0 ? 'bad' : '', b); }
      sum.push('주문은 ' + orders + '건 만들어졌는데 DB의 재고는 ' + S + '개에서 ' + stock + '개로 1만 줄었습니다.' + (N > S ? ' 재고보다 ' + (N - S) + '건이 더 팔렸습니다.' : ' 실제로 나갈 물건 수와 재고 숫자가 맞지 않습니다.'));
      sum.push('조회와 수정 사이에 다른 요청이 끼어들 수 있기 때문입니다. @Transactional만으로는 막아지지 않습니다. 같은 값을 읽은 요청들이 서로의 수정을 덮어쓰는 것을 갱신 손실이라고 합니다.');
    }
    if (c.how === 'pess' || c.how === 'dist') {
      var lockName = c.how === 'pess' ? '재고 행의 배타 락' : 'Redis의 락';
      for (var p = 0; p < N; p++) {
        if (p === 0) { for (var w = 1; w < N; w++) st[w] = '락 대기'; waits = N - 1; }
        st[p] = '락 보유'; push('요청 ' + (p + 1) + ': ' + lockName + '을 얻었습니다.' + (p === 0 && N > 1 ? ' 나머지 ' + (N - 1) + '건은 락이 풀릴 때까지 기다립니다.' : '') + ' 재고를 조회하니 ' + stock + '개입니다.', '', p);
        if (stock > 0) { stock--; orders++; sold++; st[p] = '주문 성공'; push('요청 ' + (p + 1) + ': 재고를 ' + stock + '개로 줄이고 주문을 만든 뒤 커밋합니다. 락이 풀립니다.', 'good', p); }
        else { st[p] = '품절로 거절'; push('요청 ' + (p + 1) + ': 재고가 0이므로 품절 처리하고 락을 풉니다.', '', p); }
      }
      sum.push('한 번에 한 요청만 조회와 수정을 하므로 재고가 정확합니다. 주문 ' + orders + '건, 남은 재고 ' + stock + '개' + (N > S ? ', 초과한 ' + (N - S) + '건은 품절로 거절됐습니다.' : '.'));
      sum.push(c.how === 'pess' ? '비관적 락은 충돌이 잦을 때 확실합니다. 대신 기다리는 요청이 DB 커넥션을 쥔 채 서 있으므로, 주문이 몰리면 커넥션 풀이 먼저 바닥날 수 있고 락 순서가 엇갈리면 교착 상태도 생깁니다.' : '분산 락은 DB 밖(Redis)에서 줄을 세웁니다. 서버가 여러 대여도 동작하고 기다리는 동안 DB 커넥션을 쓰지 않습니다. 대신 락의 자동 해제 시간보다 작업이 길어지면 두 요청이 동시에 들어갈 수 있고, 락은 반드시 트랜잭션 커밋이 끝난 뒤에 풀어야 합니다.');
    }
    if (c.how === 'opt') {
      var left = []; for (var q = 0; q < N; q++) left.push(q);
      var round = 0;
      while (left.length) {
        round++;
        if (stock <= 0) { left.forEach(function (r) { st[r] = '품절로 거절'; }); push('남은 요청 ' + left.length + '건: 다시 조회하니 재고가 0입니다. 품절로 거절합니다.', '', -1); break; }
        left.forEach(function (r) { st[r] = '재고 ' + stock + ', 버전 ' + ver + ' 읽음'; });
        push((round === 1 ? '요청 ' + left.length + '건이 모두' : '실패했던 ' + left.length + '건이 다시') + ' 재고를 조회합니다. 재고는 ' + stock + '개, 버전은 ' + ver + '입니다. 락은 걸지 않습니다.', '', -1);
        var win = left.shift(), readVer = ver; stock--; ver++; orders++; sold++; st[win] = '주문 성공';
        push('요청 ' + (win + 1) + ': "버전이 ' + readVer + '일 때만 수정"하는 UPDATE를 보냅니다. 버전이 그대로여서 성공합니다. 재고는 ' + stock + '개, 새 버전은 ' + ver + '입니다.', 'good', win);
        if (left.length) { retries += left.length; left.forEach(function (r) { st[r] = '저장 실패 → 재시도'; }); push('나머지 ' + left.length + '건: 같은 UPDATE를 보냈지만 버전이 이미 바뀌어(현재 ' + ver + ') 조건에 맞는 행이 없습니다(0건 수정). 충돌로 판단해 예외가 발생하고, 처음부터 다시 시도합니다.', 'bad', -1); }
      }
      sum.push('낙관적 락은 조회할 때 락을 잡고 기다리지 않아서 충돌이 드문 경우(예: 한 사람이 자기 정보를 수정)에 유리합니다. 이 실습처럼 같은 행에 요청이 몰리면 대부분이 실패하고 재시도하느라 오히려 일을 더 많이 합니다. 재시도 코드는 직접 만들어야 합니다.');
    }
    if (c.how === 'atomic') {
      for (var u = 0; u < N; u++) {
        if (stock > 0) { stock--; orders++; sold++; st[u] = '주문 성공'; push('요청 ' + (u + 1) + ': "재고가 0보다 크면 1 감소" UPDATE를 보냅니다. 재고 확인과 감소가 이 한 문장 안에서 한꺼번에 일어나므로 그 사이에 다른 요청이 끼어들지 못합니다(이 행의 락은 트랜잭션이 끝날 때 풀립니다). 1건이 수정됐으므로 주문을 만듭니다. 재고 ' + stock + '개.', 'good', u); }
        else { st[u] = '품절로 거절'; push('요청 ' + (u + 1) + ': 같은 UPDATE를 보냈지만 재고가 0이라 조건에 맞지 않습니다. 수정된 행이 0건이므로 품절로 처리합니다.', '', u); }
      }
      sum.push('"읽고, 확인하고, 쓰기"를 애플리케이션에서 나눠 하지 않고 SQL 한 문장에 넣으면, 끼어들 틈 자체가 없어집니다. 단순한 증감에는 가장 가볍고 확실한 방법입니다. 확인할 조건이 여러 테이블에 걸쳐 복잡하면 쓰기 어렵습니다.');
    }
    var match = orders === S - stock;
    return { events: ev, summary: sum, row: [orders + '건', stock + '개', match ? '맞음' : '어긋남', waits + '번', retries + '번'] };
  },
  render: function (v, sim, t, H, shown) {
    var c = sim.c, last = shown[shown.length - 1], s = last ? last.snap : { stock: c.s, ver: 0, st: [], orders: 0, hot: -1, waits: 0, retries: 0 };
    H.counters(v, [[c.s - s.orders, '재고에서 주문을 뺀 값 (실제 남아야 할 수)']]);
    H.title(v, '요청'); var ln = H.lanes(v);
    for (var i = 0; i < c.n; i++) { var x = s.st[i] || '도착 전'; H.lane(ln, '요청 ' + (i + 1), x, x === '주문 성공' ? 'good' : x.indexOf('대기') >= 0 ? 'wait' : x.indexOf('실패') >= 0 ? 'bad' : i === s.hot ? 'hot' : x === '도착 전' ? 'none' : ''); }
  },
  // 그림: 위에 재고 한 행, 아래에 그 행을 고치려는 요청들. 지금 그 행을 건드리는 요청에서 화살표가 올라간다.
  draw: function (P, sim, shown) {
    var c = sim.c, last = shown[shown.length - 1], s = last ? last.snap : { stock: c.s, ver: 0, st: [], orders: 0, hot: -1, waits: 0, retries: 0 }, n = c.n, w = (648 - (n - 1) * 8) / n, over = s.orders > c.s;
    var two = function (x) { if (P.fit(x, w - 6) === x) return [x, ' ']; var m = x.lastIndexOf(' ', Math.ceil(x.length / 2) + 2); return m > 0 ? [x.slice(0, m), x.slice(m + 1)] : [x, ' ']; };
    P.size(680, 300);
    P.box('row', 200, 16, 280, 60, { cls: s.stock < 0 ? 'bad' : 'plain', title: '재고 (DB의 한 행)', sub: '남은 수량 ' + s.stock + (c.how === 'opt' ? ' · 버전 ' + s.ver : '') });
    for (var i = 0; i < n; i++) {
      var x = s.st[i] || '도착 전';
      P.box('rq' + i, 16 + i * (w + 8), 140, w, 72, { cls: x === '주문 성공' ? 'good' : x.indexOf('대기') >= 0 ? 'wait' : x.indexOf('실패') >= 0 ? 'bad' : i === s.hot ? 'hot now' : 'plain', title: '요청 ' + (i + 1), sub: two(x), center: true });
      if (i === s.hot) P.arrow('touch', 'rq' + i + ':t', 'row:b', { cls: 'hot' });
    }
    P.box('ord', 16, 240, 318, 40, { cls: over ? 'bad' : 'good', title: '만들어진 주문', right: s.orders + '건 (처음 재고 ' + c.s + '개)' });
    P.box('wt', 346, 240, 318, 40, { cls: 'plain', title: '락 대기 / 재시도', right: s.waits + '번 / ' + s.retries + '번' });
    P.note('여러 요청이 같은 행 하나를 읽고 고치려 합니다. 주문 수가 처음 재고보다 많아지면 초과 판매입니다. 굵은 테두리와 화살표가 지금 그 행을 다루는 요청입니다.');
  },
  assume: '요청들이 가장 나쁘게 겹치는 순서(모두가 먼저 읽고 나서 쓰는 순서)를 가정했습니다. 실제로는 일부만 겹치므로 어긋나는 정도가 매번 다릅니다. 낙관적 락의 재시도는 실패한 요청이 한꺼번에 다시 시도한다고 보았습니다. 다섯 가지 방법 모두를 실제 MySQL 8.4.11에서 주문마다 세션을 따로 열어 45가지 조합(재고 1·3·5개, 주문 2·4·6건)으로 실행해, 만들어진 주문 수와 남은 재고, 대기와 재시도 횟수가 화면과 일치하는 것을 확인했습니다(화면과 같은 "가장 나쁜 순서"가 되도록 실행 순서를 맞춤). 분산 락은 실제 Redis의 SET NX로 실행했습니다. 낙관적 락은 JPA를 거치지 않고 @Version이 만들어 내는 것과 같은 SQL(WHERE version = ?)로 실행했습니다.',
});

Lab.register({
  id: 'cache', nav: '캐시와 TTL', cat: '대용량 트래픽', mode: 'time',
  title: '캐시를 두면 DB 조회가 얼마나 줄고, 언제 다시 몰리나',
  why: '같은 상품 정보를 볼 때마다 DB에서 다시 읽으면 결과가 매번 같은데도 DB가 같은 일을 되풀이하고, 요청이 늘면 DB가 먼저 버티지 못한다. 캐시는 한 번 읽은 결과를 메모리 저장소에 잠시 남겨 두고 다음 요청부터 거기서 돌려주게 해서, DB까지 가는 요청을 줄인다.',
  use: '상품 상세, 인기 게시글 목록, 공통 코드처럼 자주 읽고 가끔 바뀌는 데이터를 Redis나 애플리케이션 메모리에 두고, 스프링에서는 @Cacheable로 메서드 결과를 저장해 두는 방식을 흔히 쓴다. 결제 직전의 재고나 잔액처럼 늘 최신이어야 하는 값은 캐시를 거치지 않고 DB에서 읽는다.',
  intro: '인기 상품 하나를 30초 동안 계속 조회합니다. 캐시에 값이 있으면 DB에 가지 않고, 없으면 DB에서 읽어 캐시에 넣어 둡니다(Cache-Aside). 값은 TTL이 지나면 사라집니다.',
  terms: ['캐시', 'Cache-Aside 패턴', 'TTL(Time To Live)', '캐시 스탬피드', 'Redis', '분산 락'], ranks: ['cache', 'traffic', 'nosql'],
  controls: [
    { id: 'ttl', label: '캐시 TTL', type: 'select', value: '10', options: [['0', '캐시 없음'], ['5', '5초'], ['10', '10초'], ['30', '30초 이상 (만료 없음)']] },
    { id: 'rps', label: '초당 요청 수', type: 'range', min: 1, max: 20, value: 5, fmt: function (v) { return v + '건'; } },
    { id: 'dbt', label: 'DB 조회 한 번에 걸리는 시간', type: 'select', value: '1', options: [['0.2', '0.2초'], ['1', '1초'], ['2', '2초']] },
    { id: 'lock', label: '캐시가 비었을 때 한 요청만 DB를 조회하게 한다 (락)', type: 'check', value: false, show: function (c) { return c.ttl !== '0'; } },
  ],
  presets: [
    { t: '처음 설정으로', q: '캐시 TTL이 10초이고 초당 5건 요청에 DB 조회가 1초 걸리면 요청은 DB로 어떻게 가나', d: 'TTL 10초. 만료될 때마다 여러 요청이 한꺼번에 DB로 갑니다.', v: { ttl: '10', rps: 5, dbt: '1', lock: false } },
    { t: '캐시가 없다면', q: '캐시를 없애면', d: '모든 요청이 DB를 조회합니다.', v: { ttl: '0', rps: 5, dbt: '1', lock: false } },
    { t: '요청이 많고 DB가 느릴 때', q: '초당 요청 수를 20건으로, DB 조회에 걸리는 시간을 2초로 바꾸면', d: '만료 순간 수십 개의 요청이 동시에 DB를 때립니다(캐시 스탬피드).', v: { ttl: '10', rps: 20, dbt: '2', lock: false } },
    { t: '같은 상황에 락 적용', q: '초당 20건에 DB 조회가 2초 걸리는데 캐시가 비었을 때 한 요청만 DB를 조회하게 하면', d: '한 요청만 DB에 가고 나머지는 그 결과를 기다립니다.', v: { ttl: '10', rps: 20, dbt: '2', lock: true } },
    { t: 'TTL을 5초로 줄이면', q: '캐시 TTL을 5초로 바꾸면', d: '데이터는 더 최신이지만 DB 조회가 늘어납니다.', v: { ttl: '5', rps: 5, dbt: '1', lock: false } },
    { t: 'TTL을 길게', q: '캐시 TTL을 30초 이상으로 늘려 만료되지 않게 하면', d: 'DB 조회는 처음 캐시를 채울 때뿐입니다. 대신 원본이 바뀌어도 오래 모릅니다.', v: { ttl: '30', rps: 5, dbt: '1', lock: false } },
  ],
  code: function (c) {
    var head = '// 메서드 하나만 보임 (클래스·필드 선언, import, 예시로 만든 타입과 메서드의 선언은 생략)\n';
    if (c.ttl === '0') return head + 'public Product getProduct(long id) {\n    return productRepository.findById(id);   // 매번 DB 조회 (' + c.dbt + '초)\n}';
    var top = head + 'public Product getProduct(long id) {\n    String key = "product:" + id;\n    Product cached = redis.get(key);\n    if (cached != null) return cached;          // 캐시 적중\n\n';
    if (c.lock) return top + '    if (!lock.tryLock(key)) {                   // 다른 요청이 조회 중이면\n        return waitAndReadCache(key);           // 그 결과를 기다린다\n    }\n    try {\n        cached = redis.get(key);                // 락을 얻는 사이 다른 요청이 채웠을 수 있다\n        if (cached != null) return cached;\n        Product p = productRepository.findById(id); // DB 조회 (' + c.dbt + '초)\n        redis.set(key, p, Duration.ofSeconds(' + c.ttl + '));  // TTL ' + c.ttl + '초\n        return p;\n    } finally {\n        lock.unlock(key);                       // 락을 푼다\n    }\n}';
    return top + '    Product p = productRepository.findById(id); // DB 조회 (' + c.dbt + '초)\n    redis.set(key, p, Duration.ofSeconds(' + c.ttl + '));  // TTL ' + c.ttl + '초\n    return p;\n}';
  },
  label: function (c) { return (c.ttl === '0' ? '캐시 없음' : 'TTL ' + c.ttl + '초') + ' · 초당 ' + c.rps + '건 · DB ' + c.dbt + '초' + (c.lock && c.ttl !== '0' ? ' · 락' : ''); },
  columns: ['요청', '캐시 적중률', 'DB 조회', '동시에 몰린 DB 조회', '평균 응답 시간'],
  simulate: function (c) {
    var ttl = +c.ttl, dbt = +c.dbt, lock = c.lock && ttl > 0, DUR = 30, fmt = Lab.fmt, reqs = [], ev = [], sets = [], expireAt = -1, has = false, loadDone = -1, grp = null, queries = [];
    function applySets(t) { while (sets.length && sets[0] <= t + 1e-9) { var f = sets.shift(); has = true; expireAt = f + ttl; if (grp) { ev.push({ t: f, k: grp.n > 1 ? 'bad' : '', s: fmt(f) + '초: DB에서 읽은 값을 캐시에 저장했습니다(TTL ' + ttl + '초). ' + (grp.n > 1 ? '저장되기 전까지 ' + fmt(grp.start) + '초부터 요청 ' + grp.n + '건이 모두 캐시에서 값을 찾지 못해 각자 DB를 조회했습니다.' : '이 값을 채우려고 요청 1건이 DB를 조회했습니다.') + (sets.length ? ' 나머지 요청도 조회가 끝나는 대로 같은 값을 다시 저장하므로, TTL은 마지막 저장(' + fmt(sets[sets.length - 1]) + '초)부터 셉니다.' : '') + (grp.w ? ' 락 때문에 ' + grp.w + '건은 DB에 가지 않고 이 결과를 기다렸습니다.' : '') }); grp = null; } } }
    var total = DUR * c.rps;
    for (var i = 0; i < total; i++) {
      var t = Math.round(i / c.rps * 1000) / 1000, r = { t: t }; reqs.push(r);
      if (ttl === 0) { r.kind = 'db'; r.done = t + dbt; queries.push([t, r.done]); continue; }
      applySets(t);
      if (has && t >= expireAt - 1e-9) { has = false; ev.push({ t: t, s: fmt(t) + '초: TTL이 지나 캐시의 값이 사라졌습니다. 이제부터 오는 요청은 캐시에서 값을 찾지 못합니다.' }); }
      if (has) { r.kind = 'hit'; r.done = t + 0.01; continue; }
      if (lock && loadDone > t) { r.kind = 'wait'; r.done = loadDone; if (grp) grp.w = (grp.w || 0) + 1; continue; }
      r.kind = 'db'; r.done = t + dbt; queries.push([t, r.done]); sets.push(r.done); sets.sort(function (a, b) { return a - b; }); loadDone = r.done;
      if (!grp) { grp = { start: t, n: 1 }; ev.push({ t: t, s: fmt(t) + '초: 캐시에 값이 없습니다(' + (i === 0 ? '첫 요청' : '만료 직후') + '). 요청이 DB를 조회하러 갑니다. 결과가 오기까지 ' + dbt + '초가 걸립니다.' }); } else grp.n++;
    }
    applySets(Infinity);
    var hits = reqs.filter(function (r) { return r.kind === 'hit'; }).length, dbq = queries.length, waits = reqs.filter(function (r) { return r.kind === 'wait'; }).length;
    var peak = 0; queries.forEach(function (q) { var n = queries.filter(function (x) { return x[0] <= q[0] + 1e-9 && x[1] > q[0] + 1e-9; }).length; if (n > peak) peak = n; });
    var avg = reqs.reduce(function (a, r) { return a + (r.done - r.t); }, 0) / reqs.length, rate = Math.round(hits / reqs.length * 100);
    if (ttl === 0) ev.push({ t: 0, s: '0.0초: 캐시가 없습니다. 모든 요청이 DB를 조회합니다.' });
    ev.sort(function (a, b) { return a.t - b.t; });
    var sum = [];
    if (ttl === 0) sum.push('같은 상품을 ' + reqs.length + '번 조회하는 데 DB를 ' + dbq + '번 읽었습니다. 자주 읽히고 잘 바뀌지 않는 데이터일수록 캐시의 효과가 큽니다.');
    else if (peak > 1 && !lock) sum.push('캐시가 비어 있는 순간부터 다시 채워지기 전까지(' + dbt + '초 동안) 들어온 요청들이 모두 DB로 갔습니다. 요청이 많고 DB 조회가 느릴수록 몰림이 커집니다. 이것이 캐시 스탬피드입니다. 한 요청만 조회하게 하는 락이나 만료 전에 미리 갱신하기로 줄입니다. 여러 키가 한꺼번에 만료되는 경우에는 키마다 TTL에 약간의 차이를 줍니다.');
    else if (lock) sum.push('락으로 캐시가 빌 때마다 한 요청만 DB를 조회했습니다. ' + (waits ? 'DB로 몰리는 것은 막았지만, ' + waits + '건은 그 조회가 끝날 때까지 기다렸습니다.' : '이 설정에서는 조회가 끝나기 전에 들어온 요청이 없어 기다린 요청도 없었습니다.') + ' 서버가 여러 대라면 서버들이 함께 쓰는 분산 락이어야 합니다.');
    if (ttl > 0) sum.push('TTL이 길수록 DB 조회는 줄지만, 원본 데이터가 바뀌어도 최대 TTL만큼 옛 값을 돌려줍니다. 얼마나 오래된 값까지 허용할 수 있는지가 TTL을 정하는 기준입니다.');
    return { total: DUR, events: ev, summary: sum, reqs: reqs, queries: queries, sets: null, ttl: ttl, row: [reqs.length + '건', rate + '%', dbq + '번', peak + '건', (Math.round(avg * 100) / 100) + '초'] };
  },
  render: function (v, sim, t, H) {
    var c = sim.c, done = sim.reqs.filter(function (r) { return r.t <= t + 1e-9; }), hits = done.filter(function (r) { return r.kind === 'hit'; }).length, dbq = sim.queries.filter(function (q) { return q[0] <= t + 1e-9; }).length;
    H.counters(v, [[done.length, '들어온 요청'], [hits, '캐시 적중'], [dbq, 'DB 조회'], [done.length ? Math.round(hits / done.length * 100) + '%' : '-', '적중률']]);
  },
  // 그림: 요청이 캐시를 먼저 보고, 없을 때만 DB로 간다. 아래 줄은 초마다 DB까지 간 조회 수다.
  draw: function (P, sim, shown, t) {
    var c = sim.c, e = 1e-9, done = sim.reqs.filter(function (r) { return r.t <= t + e; }), hits = done.filter(function (r) { return r.kind === 'hit'; }).length, flying = sim.queries.filter(function (q) { return q[0] <= t + e && q[1] > t + e; }).length, lastReq = done[done.length - 1], off = sim.ttl === 0, hit = lastReq && lastReq.kind === 'hit';
    P.size(680, 320);
    P.box('app', 16, 70, 170, 60, { cls: 'wait', title: '애플리케이션', sub: '요청 ' + done.length + '건 받음' });
    P.box('ca', 255, 70, 170, 60, { cls: off ? 'ghost' : hit ? 'good' : done.length ? 'bad' : 'plain', title: off ? '캐시 사용 안 함' : '캐시', sub: off ? ' ' : hit ? '값 있음: 바로 응답' : flying ? '값 없음: DB를 기다림' : done.length ? '값 없음' : '비어 있음' });
    P.box('db', 494, 70, 170, 60, { cls: flying > 3 ? 'bad' : flying ? 'hot' : 'plain', title: 'DB', sub: flying ? '조회 ' + flying + '건 처리 중' : '한가함' });
    if (lastReq) { if (!off) P.arrow('a1', 'app:r', 'ca:l', { cls: hit ? 'good' : '', label: hit ? '적중' : '' }); if (!hit && flying) P.arrow('a2', 'app:t:0.7', 'db:t:0.3', { cls: flying > 3 ? 'bad' : 'hot', label: 'DB 조회 ' + flying + '건' }); }
    P.region('sec', 16, 158, 648, 96, '초마다 DB까지 간 조회 수 (1칸 = 1초)');
    for (var k = 0; k < 30; k++) { var n = sim.queries.filter(function (q) { return q[0] >= k - e && q[0] < k + 1 - e && q[0] <= t + e; }).length, past = k < t; P.box('s' + k, 26 + k * 21, 194, 20, 40, { cls: !past ? 'ghost' : n === 0 ? 'good' : n === 1 ? 'wait' : 'bad', sub: past ? String(n) : undefined, center: true }); }
    P.box('rate', 16, 270, 648, 34, { cls: 'plain', title: '캐시 적중률', right: done.length ? Math.round(hits / done.length * 100) + '% (' + hits + ' / ' + done.length + ')' : '-' });
    P.note('요청은 캐시를 먼저 보고, 값이 있으면 거기서 끝납니다(초록 화살표). 캐시에 없을 때만 애플리케이션이 DB를 조회하는 화살표가 생깁니다. 아래 줄에서 초록은 DB 조회가 없던 초, 빨강은 조회가 여러 건 몰린 초입니다.');
  },
  assume: '한 개의 키(인기 상품 하나)만 다루고, 요청은 일정한 간격으로 들어온다고 가정했습니다. 캐시 응답 시간은 0.01초로 두었습니다. 캐시 크기가 가득 차서 오래된 키를 밀어내는 제거(eviction) 정책은 여기서 다루지 않습니다. 락을 건 경우 기다리는 요청은 조회가 끝나는 순간 캐시의 값을 받는다고 단순화했습니다. 숫자는 동작 방식을 보이기 위한 모형이며 실제 Redis를 측정한 값이 아닙니다.',
});

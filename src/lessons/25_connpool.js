Lab.register({
  id: 'connpool', nav: '커넥션 풀과 OSIV', cat: 'JPA', mode: 'time',
  title: '쿼리는 금방 끝났는데 커넥션이 모자란 이유',
  intro: '요청은 DB 작업을 하고 나서 외부 API를 호출한 뒤 응답합니다. DB 커넥션은 풀에서 빌려 쓰고 돌려줍니다. 커넥션을 언제 돌려주느냐(OSIV 설정)에 따라, 같은 풀 크기로 버틸 수 있는 요청 수가 크게 달라집니다.',
  terms: ['커넥션 풀', 'OSIV(Open Session In View)', '영속성 컨텍스트', '병목(Bottleneck)'], ranks: ['jpaorm', 'tuning', 'traffic'],
  controls: [
    { id: 'pool', label: '커넥션 풀 크기', type: 'range', min: 1, max: 10, value: 3, fmt: function (v) { return v + '개'; } },
    { id: 'n', label: '거의 동시에 들어오는 요청', type: 'range', min: 1, max: 20, value: 8, fmt: function (v) { return v + '건'; } },
    { id: 'q', label: '요청 하나의 DB 작업 시간', type: 'select', value: '0.5', options: [['0.5', '0.5초'], ['1', '1초'], ['2', '2초']] },
    { id: 'ext', label: 'DB 작업 뒤 외부 API 호출 시간', type: 'select', value: '2', options: [['0', '없음'], ['1', '1초'], ['2', '2초'], ['3', '3초']] },
    { id: 'osiv', label: 'OSIV가 켜져 있다 (스프링 부트 기본값)', type: 'check', value: true },
  ],
  presets: [
    { t: '처음 설정으로', d: 'OSIV 켜짐. DB 작업은 0.5초인데 커넥션을 2.5초씩 쥐고 있습니다.', v: { pool: 3, n: 8, q: '0.5', ext: '2', osiv: true } },
    { t: 'OSIV를 끄면', d: 'DB 작업이 끝나는 즉시 커넥션을 돌려줍니다.', v: { pool: 3, n: 8, q: '0.5', ext: '2', osiv: false } },
    { t: '요청이 더 몰리면', d: 'OSIV 켜짐, 20건. 5초를 기다리다 실패하는 요청이 나옵니다.', v: { pool: 3, n: 20, q: '0.5', ext: '2', osiv: true } },
    { t: '풀을 늘리면', d: '같은 20건에 풀 10개. 버티지만 DB가 받을 수 있는 연결 수에는 한계가 있습니다.', v: { pool: 10, n: 20, q: '0.5', ext: '2', osiv: true } },
    { t: '쿼리 자체가 느리면', d: 'OSIV를 꺼도 DB 작업 2초 동안은 커넥션을 씁니다.', v: { pool: 3, n: 8, q: '2', ext: '0', osiv: false } },
  ],
  code: function (c) {
    return '# application.yml\nspring.datasource.hikari.maximum-pool-size: ' + c.pool + '\nspring.datasource.hikari.connection-timeout: 5000   # 5초 기다리다 실패\nspring.jpa.open-in-view: ' + c.osiv + '\n\n// 컨트롤러\nOrderDto get(long id) {\n    Order order = orderService.find(id);       // @Transactional, DB 작업 ' + c.q + '초\n' + (c.ext !== '0' ? '    Delivery d = deliveryApi.track(order);     // 외부 API ' + c.ext + '초 (DB 안 씀)\n' : '') + '    return OrderDto.of(order' + (c.ext !== '0' ? ', d' : '') + ');\n}';
  },
  label: function (c) { return '풀 ' + c.pool + '개 · 요청 ' + c.n + '건 · DB ' + c.q + '초 + 외부 ' + c.ext + '초 · OSIV ' + (c.osiv ? '켜짐' : '꺼짐'); },
  columns: ['성공', '커넥션 대기 시간 초과', '평균 대기', '가장 긴 대기', '커넥션 1개를 쥐는 시간'],
  simulate: function (c) {
    var q = +c.q, ext = +c.ext, hold = c.osiv ? q + ext : q, T = 5, fmt = Lab.fmt, conns = [], reqs = [], ev = [];
    for (var i = 0; i < c.pool; i++) conns.push({ id: i + 1, free: 0, segs: [] });
    for (var r = 0; r < c.n; r++) {
      var at = Math.round(r * 0.1 * 10) / 10, cn = conns.reduce(function (a, b) { return b.free < a.free ? b : a; }), start = Math.max(at, cn.free), rq = { id: r + 1, at: at };
      reqs.push(rq);
      if (start - at > T + 1e-9) { rq.fail = at + T; ev.push({ t: at + T, k: 'bad', s: fmt(at + T) + '초: 요청 ' + rq.id + '번이 커넥션을 5초 동안 기다렸지만 얻지 못했습니다. "Connection is not available, request timed out" 예외로 실패합니다.' }); if (at < cn.free) ev.push({ t: at, s: fmt(at) + '초: 요청 ' + rq.id + ' 도착. 커넥션 ' + c.pool + '개가 모두 사용 중이라 기다립니다.' }); continue; }
      rq.start = start; rq.dbEnd = start + q; rq.rel = start + hold; rq.done = start + q + ext; rq.conn = cn.id; cn.free = rq.rel; cn.segs.push(rq);
      if (start > at + 1e-9) ev.push({ t: at, s: fmt(at) + '초: 요청 ' + rq.id + ' 도착. 커넥션 ' + c.pool + '개가 모두 사용 중이라 기다립니다.' });
      ev.push({ t: start, s: fmt(start) + '초: 요청 ' + rq.id + '번이 커넥션 ' + cn.id + '번을 빌려 DB 작업을 시작합니다.' + (start > at + 1e-9 ? ' ' + fmt(start - at) + '초를 기다렸습니다.' : '') });
      if (ext > 0) ev.push({ t: rq.dbEnd, k: c.osiv ? 'bad' : 'good', s: fmt(rq.dbEnd) + '초: 요청 ' + rq.id + '번의 DB 작업이 끝나고 외부 API 호출을 시작합니다. ' + (c.osiv ? 'OSIV가 켜져 있어 커넥션 ' + cn.id + '번을 돌려주지 않고 응답이 끝날 때까지 쥐고 있습니다.' : '트랜잭션이 끝났으므로 커넥션 ' + cn.id + '번을 바로 풀에 돌려줍니다.') });
      ev.push({ t: rq.done, s: fmt(rq.done) + '초: 요청 ' + rq.id + ' 응답 완료.' + (c.osiv ? ' 이제 커넥션 ' + cn.id + '번을 돌려줍니다.' : '') });
    }
    ev.sort(function (a, b) { return a.t - b.t; });
    var ok = reqs.filter(function (x) { return !x.fail; }), waits = ok.map(function (x) { return x.start - x.at; }), fails = reqs.length - ok.length;
    var avg = waits.length ? waits.reduce(function (a, b) { return a + b; }, 0) / waits.length : 0, mx = waits.length ? Math.max.apply(null, waits) : 0, total = reqs.reduce(function (m, x) { return Math.max(m, x.fail || x.done); }, 0);
    var sum = ['요청 ' + c.n + '건 중 ' + ok.length + '건 성공, ' + fails + '건은 커넥션을 얻지 못해 실패했습니다. 성공한 요청은 커넥션을 평균 ' + fmt(avg) + '초, 최대 ' + fmt(mx) + '초 기다렸습니다.', '요청 하나가 커넥션을 쥐고 있는 시간은 ' + fmt(hold) + '초입니다(DB 작업 ' + c.q + '초' + (c.osiv && ext > 0 ? ' + 외부 API ' + c.ext + '초' : '') + ').'];
    if (c.osiv && ext > 0) sum.push('OSIV가 켜져 있으면 영속성 컨텍스트가 응답이 끝날 때까지 열려 있고, 그동안 DB 커넥션도 함께 붙잡혀 있습니다. DB를 쓰지 않는 외부 API 대기 시간까지 커넥션을 점유하므로, 트래픽이 많은 API 서버에서는 커넥션이 금방 모자랍니다. 끄면 트랜잭션이 끝날 때 커넥션을 돌려줍니다.');
    if (!c.osiv && ext > 0) sum.push('OSIV를 끄면 트랜잭션이 끝나는 즉시 커넥션을 돌려줍니다. 대신 트랜잭션 밖(컨트롤러, 뷰)에서는 지연 로딩을 쓸 수 없으므로, 필요한 데이터를 서비스 계층에서 미리 다 읽어 두어야 합니다.');
    if (fails) sum.push('풀을 무작정 늘리는 것은 해법이 아닙니다. DB가 감당할 수 있는 연결 수에 한계가 있고, 연결이 많아지면 DB 쪽에서 서로 경쟁해 오히려 느려집니다. 커넥션을 쥐는 시간을 줄이는 것(OSIV 끄기, 트랜잭션 범위 줄이기, 느린 쿼리 개선)이 먼저입니다.');
    return { total: total, events: ev, summary: sum, conns: conns, reqs: reqs, hold: hold, row: [ok.length + '건', fails + '건', fmt(avg) + '초', fmt(mx) + '초', fmt(hold) + '초'] };
  },
  render: function (v, sim, t, H) {
    var c = sim.c, e = 1e-9, done = sim.reqs.filter(function (r) { return r.done !== undefined && r.done <= t + e; }).length, failed = sim.reqs.filter(function (r) { return r.fail !== undefined && r.fail <= t + e; }).length;
    var waiting = sim.reqs.filter(function (r) { return r.at <= t + e && (r.fail !== undefined ? r.fail > t + e : r.start > t + e); });
    var busy = sim.conns.filter(function (cn) { return cn.segs.some(function (r) { return r.start <= t + e && r.rel > t + e; }); }).length;
    H.counters(v, [[busy + ' / ' + c.pool, '사용 중인 커넥션'], [waiting.length, '커넥션을 기다리는 요청'], [done, '응답 완료'], [failed, '대기 시간 초과로 실패']]);
    H.title(v, '커넥션 풀'); var ln = H.lanes(v);
    sim.conns.forEach(function (cn) { var r = cn.segs.filter(function (x) { return x.start <= t + e && x.rel > t + e; })[0];
      if (!r) H.lane(ln, '커넥션 ' + cn.id, '풀에서 대기 (빌려줄 수 있음)', 'none');
      else if (t < r.dbEnd - e) H.lane(ln, '커넥션 ' + cn.id, '요청 ' + r.id + ' · DB 작업 중', 'hot', (t - r.start) / sim.hold);
      else H.lane(ln, '커넥션 ' + cn.id, '요청 ' + r.id + ' · DB 작업은 끝남, 외부 API를 기다리며 점유 중', 'bad', (t - r.start) / sim.hold); });
    H.title(v, '커넥션을 기다리는 요청'); H.slots(v, waiting.map(function (r) { return ['요청 ' + r.id + ' (' + H.fmt(t - r.at) + '초째)', 'q']; }), '없음');
    var out = sim.reqs.filter(function (r) { return !r.fail && r.rel <= t + e && r.done > t + e; });
    if (out.length) { H.title(v, '커넥션 없이 외부 API를 기다리는 요청'); H.slots(v, out.map(function (r) { return ['요청 ' + r.id, 'd']; }), ''); }
  },
  // 그림: 요청(번호 상자)이 커넥션을 기다리고, 빌려 쓰고, 돌려준다. 커넥션을 쥔 채 외부 응답을 기다리면 풀이 바닥난다.
  draw: function (P, sim, shown, t) {
    var c = sim.c, e = 1e-9, n = sim.conns.length, H = Math.max(300, 58 + n * 30);
    var waiting = sim.reqs.filter(function (r) { return r.at <= t + e && (r.fail !== undefined ? r.fail > t + e : r.start > t + e); }), failed = sim.reqs.filter(function (r) { return r.fail !== undefined && r.fail <= t + e; }), done = sim.reqs.filter(function (r) { return r.done !== undefined && r.done <= t + e; }).length;
    var out = sim.reqs.filter(function (r) { return r.fail === undefined && r.rel <= t + e && r.done > t + e; });
    P.size(680, H + 66);
    P.region('wait', 16, 16, 190, H, '커넥션을 기다리는 요청');
    P.region('pool', 222, 16, 262, H, '커넥션 풀 (' + c.pool + '개)');
    P.region('ext', 500, 16, 164, H, '커넥션 없이 외부 대기');
    waiting.slice(0, 21).forEach(function (r, j) { P.box('rq' + r.id, 28 + (j % 3) * 56, 50 + Math.floor(j / 3) * 28, 52, 24, { cls: 'wait', sub: '요청 ' + r.id, center: true }); });
    sim.conns.forEach(function (cn, i) {
      var y = 50 + i * 30, r = cn.segs.filter(function (x) { return x.start <= t + e && x.rel > t + e; })[0], idle = r && t >= r.dbEnd - e;
      P.box('cn' + cn.id, 234, y, 238, 26, { cls: !r ? 'plain' : idle ? 'bad' : 'hot', title: '커넥션 ' + cn.id, right: !r ? '빌려줄 수 있음' : '' });
      if (r) P.box('rq' + r.id, 306, y + 3, 162, 20, { cls: idle ? 'bad' : 'wait', sub: '요청 ' + r.id + (idle ? ' · 외부 대기 중' : ' · DB 작업'), center: true });
    });
    out.slice(0, 16).forEach(function (r, j) { P.box('rq' + r.id, 512 + (j % 2) * 72, 50 + Math.floor(j / 2) * 28, 66, 24, { cls: 'good', sub: '요청 ' + r.id, center: true }); });
    P.box('dn', 16, H + 30, 318, 34, { cls: 'good', title: '응답 완료', right: done + '건' });
    P.box('fl', 346, H + 30, 318, 34, { cls: failed.length ? 'bad' : 'ghost', title: '커넥션을 못 얻어 실패', right: failed.length + '건' });
    P.note('번호 상자가 요청입니다. 노란 커넥션은 DB 작업 중이고, 빨간 커넥션은 DB 작업이 끝났는데도 외부 응답을 기다리며 붙잡혀 있는 것입니다. 빨간 커넥션이 많을수록 왼쪽 대기 줄이 길어집니다.');
  },
  assume: '요청은 0.1초 간격으로 들어오고, 요청을 처리할 서버 스레드는 충분하다고 가정했습니다(톰캣 기본 200개). 커넥션을 얻지 못하고 기다리는 한도는 5초로 고정했습니다(HikariCP의 기본값은 30초입니다). OSIV가 켜져 있을 때 커넥션은 처음 DB에 접근하는 순간 빌려서 응답이 끝날 때 돌려준다고 보았고, 이것은 Hibernate가 스프링 환경에서 커넥션을 세션이 닫힐 때까지 유지하는 기본 동작에 따른 것입니다. 숫자는 관계를 보이기 위한 모형이며 실제 측정값이 아닙니다.',
});

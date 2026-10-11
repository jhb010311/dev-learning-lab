Lab.register({
  id: 'blocking', nav: '블로킹·논블로킹·가상 스레드', cat: '동시성', mode: 'time',
  title: '기다리는 동안 스레드는 무엇을 하나',
  intro: '요청마다 DB나 외부 API의 응답을 기다리는 시간이 있습니다. 그 시간에 스레드를 붙잡아 두는 방식(블로킹), 스레드를 놓아주고 응답이 오면 이어서 처리하는 방식(논블로킹), 그리고 블로킹처럼 코드를 쓰지만 기다릴 때 운영체제 스레드를 놓아주는 가상 스레드를 비교해 보세요.',
  terms: ['블로킹과 논블로킹', '동기와 비동기', '가상 스레드(Virtual Thread)', 'Spring WebFlux와 리액티브', '이벤트 루프', '톰캣의 스레드 모델'], ranks: ['webflux', 'was', 'javaver'],
  controls: [
    { id: 'model', label: '처리 방식', type: 'select', value: 'pool', options: [['pool', '요청 하나에 스레드 하나 (스프링 MVC)'], ['loop', '이벤트 루프 (스프링 WebFlux)'], ['virtual', '가상 스레드 (JDK 21)']] },
    { id: 'th', label: '스레드 풀 크기', type: 'range', min: 2, max: 10, value: 4, fmt: function (v) { return v + '개'; }, show: function (c) { return c.model === 'pool'; } },
    { id: 'n', label: '동시에 들어오는 요청', type: 'range', min: 1, max: 30, value: 12, fmt: function (v) { return v + '건'; } },
    { id: 'w', label: '요청마다 외부 응답을 기다리는 시간', type: 'select', value: '2', options: [['0.5', '0.5초'], ['1', '1초'], ['2', '2초']] },
    { id: 'block', label: '이벤트 루프 안에서 블로킹 호출을 한다 (JDBC 등)', type: 'check', value: false, show: function (c) { return c.model === 'loop'; } },
  ],
  presets: [
    { t: '처음 설정으로', d: '스레드 4개에 요청 12건. 스레드가 기다리느라 묶여 뒤 요청이 줄을 섭니다.', v: { model: 'pool', th: 4, n: 12, w: '2', block: false } },
    { t: '이벤트 루프로', d: '스레드 2개로 12건을 동시에 진행합니다.', v: { model: 'loop', th: 4, n: 12, w: '2', block: false } },
    { t: '이벤트 루프에서 블로킹 호출', d: '스레드 2개가 묶이면 전체가 멈춥니다. 가장 나쁜 조합입니다.', v: { model: 'loop', th: 4, n: 12, w: '2', block: true } },
    { t: '가상 스레드', d: '코드는 블로킹 방식 그대로인데 동시에 진행됩니다.', v: { model: 'virtual', th: 4, n: 12, w: '2', block: false } },
    { t: '스레드 풀을 키우면', d: '스레드 10개. 나아지지만 요청이 더 늘면 다시 줄을 섭니다.', v: { model: 'pool', th: 10, n: 30, w: '2', block: false } },
  ],
  code: function (c) {
    if (c.model === 'pool') return '// 스프링 MVC: 요청마다 스레드 하나가 끝까지 맡는다\n// server.tomcat.threads.max=' + c.th + '\n@GetMapping("/orders/{id}")\nOrderDto get(@PathVariable long id) {\n    Order order = orderRepository.findById(id);   // 응답이 올 때까지 스레드가 멈춰 기다림\n    Delivery d = deliveryClient.track(order);     // (' + c.w + '초)\n    return OrderDto.of(order, d);\n}';
    if (c.model === 'loop') return '// 스프링 WebFlux: 이벤트 루프 스레드 2개\n@GetMapping("/orders/{id}")\nMono<OrderDto> get(@PathVariable long id) {\n' + (c.block ? '    Order order = jdbcRepository.findById(id);    // 블로킹 호출! 이벤트 루프가 멈춘다\n    return Mono.just(OrderDto.of(order));\n' : '    return orderRepository.findById(id)           // 기다리지 않고 "끝나면 이어서 할 일"만 등록\n        .flatMap(order -> deliveryClient.track(order)\n            .map(d -> OrderDto.of(order, d)));\n') + '}';
    return '// spring.threads.virtual.enabled=true  (스프링 부트 3.2+, JDK 21)\n@GetMapping("/orders/{id}")\nOrderDto get(@PathVariable long id) {\n    Order order = orderRepository.findById(id);   // 코드는 블로킹 방식 그대로\n    Delivery d = deliveryClient.track(order);     // 기다리는 동안 OS 스레드는 반납됨\n    return OrderDto.of(order, d);\n}';
  },
  label: function (c) { return { pool: '스레드 풀 ' + c.th + '개', loop: '이벤트 루프' + (c.block ? ' + 블로킹 호출' : ''), virtual: '가상 스레드' }[c.model] + ' · 요청 ' + c.n + '건 · 대기 ' + c.w + '초'; },
  columns: ['전체 소요', '평균 응답 시간', '쓴 OS 스레드', '동시에 진행된 요청(최대)'],
  simulate: function (c) {
    var w = +c.w, fmt = Lab.fmt, reqs = [], ev = [], osT = c.model === 'pool' ? c.th : 2, serial = c.model === 'pool' || (c.model === 'loop' && c.block), slots = [], sum = [];
    for (var i = 0; i < osT; i++) slots.push(0);
    for (var r = 0; r < c.n; r++) {
      var rq = { id: r + 1 };
      if (serial) { var k = 0; for (var j = 1; j < slots.length; j++) if (slots[j] < slots[k]) k = j; rq.start = slots[k]; rq.end = rq.start + w; rq.th = k; slots[k] = rq.end; }
      else { rq.start = 0; rq.end = w; rq.th = r % osT; }
      reqs.push(rq);
    }
    var total = reqs.reduce(function (m, x) { return Math.max(m, x.end); }, 0), peak = serial ? Math.min(c.n, osT) : c.n;
    if (serial) {
      ev.push({ t: 0, k: c.n > osT ? 'bad' : '', s: '0.0초: 요청 ' + c.n + '건이 들어옵니다. ' + (c.model === 'pool' ? '스레드 ' + peak + '개가 요청을 하나씩 맡습니다.' : '이벤트 루프 스레드 ' + peak + '개가 요청을 하나씩 처리하기 시작합니다.') + (c.n > osT ? ' 나머지 ' + (c.n - osT) + '건은 스레드가 빌 때까지 기다립니다.' : '') });
      ev.push({ t: 0.05, k: c.model === 'loop' ? 'bad' : '', s: '0.1초: 각 스레드가 외부 응답을 기다립니다. ' + (c.model === 'pool' ? '기다리는 동안 스레드는 아무 일도 하지 않지만 다른 요청을 맡을 수도 없습니다(블로킹).' : '이벤트 루프 스레드가 블로킹 호출에 묶였습니다. 이 스레드는 수많은 요청을 번갈아 처리해야 하는데, 멈춰 있는 동안 다른 요청은 전혀 진행되지 않습니다.') });
      var waves = []; reqs.forEach(function (x) { if (waves.indexOf(x.end) < 0) waves.push(x.end); });
      waves.forEach(function (t2) { var done = reqs.filter(function (x) { return x.end === t2; }).length, left = reqs.filter(function (x) { return x.start >= t2; }).length; ev.push({ t: t2, s: fmt(t2) + '초: 응답이 도착해 요청 ' + done + '건이 끝났습니다.' + (left ? ' 풀려난 스레드가 기다리던 요청을 맡습니다(남은 대기 ' + Math.max(0, left - done) + '건).' : '') }); });
    } else {
      ev.push({ t: 0, s: '0.0초: 요청 ' + c.n + '건이 들어옵니다.' + (c.model === 'loop' ? ' 이벤트 루프 스레드 2개가 요청을 하나씩 빠르게 받아, 외부 호출을 보내 놓고 "응답이 오면 이어서 할 일"만 등록한 뒤 바로 다음 요청으로 넘어갑니다.' : ' 요청마다 가상 스레드가 하나씩 만들어집니다. 가상 스레드는 OS 스레드가 아니라 JVM이 관리하는 가벼운 객체라서 수천 개도 부담이 없습니다.') });
      ev.push({ t: 0.05, k: 'good', s: '0.1초: ' + c.n + '건 모두 외부 응답을 기다리는 중입니다. ' + (c.model === 'loop' ? '기다림은 운영체제에 맡겨 두었으므로 이벤트 루프 스레드는 한가합니다.' : '가상 스레드가 블로킹 호출에서 멈추면, JVM이 그 가상 스레드를 OS 스레드에서 내려놓습니다. OS 스레드는 다른 가상 스레드를 실행할 수 있습니다.') });
      ev.push({ t: w, k: 'good', s: fmt(w) + '초: 응답이 도착합니다. ' + (c.model === 'loop' ? '이벤트 루프가 등록해 둔 다음 작업을 차례로 실행해 ' : '가상 스레드들이 다시 OS 스레드에 올라가 이어서 실행되고 ') + c.n + '건이 거의 동시에 끝납니다.' });
    }
    if (c.model === 'pool') sum.push('블로킹 방식에서는 동시에 처리할 수 있는 요청 수가 스레드 수를 넘지 못합니다. 기다리는 시간이 길수록 스레드가 오래 묶입니다. 코드가 단순하고 디버깅이 쉬워서 대부분의 서비스가 이 방식을 씁니다.');
    if (c.model === 'loop' && !c.block) sum.push('논블로킹 방식은 기다리는 동안 스레드를 붙잡지 않아서 적은 스레드로 많은 요청을 진행합니다. 대신 호출 경로 전체(DB 드라이버, HTTP 클라이언트)가 논블로킹이어야 하고, 코드가 콜백의 연결 형태가 되어 익히고 디버깅하기 어렵습니다.');
    if (c.model === 'loop' && c.block) sum.push('이벤트 루프 스레드는 개수가 매우 적으므로, 그 안에서 블로킹 호출을 하면 스레드 풀 방식보다도 훨씬 나쁩니다. WebFlux를 쓰면서 JDBC나 블로킹 HTTP 클라이언트를 그대로 호출하는 것이 대표적인 실수입니다.');
    if (c.model === 'virtual') sum.push('가상 스레드는 요청마다 스레드를 하나씩 주는 단순한 코드 구조를 유지하면서, 기다리는 동안 OS 스레드를 내어 줍니다. 기다림이 많은 작업에 효과적이고, CPU를 계속 쓰는 계산 작업은 빨라지지 않습니다. 스레드가 수천 개로 늘 수 있으므로 DB 커넥션 풀 같은 다른 자원이 먼저 한계에 닿습니다.');
    return { total: total, events: ev, summary: sum, reqs: reqs, osT: osT, serial: serial, w: w, row: [fmt(total) + '초', fmt(reqs.reduce(function (a, x) { return a + x.end; }, 0) / reqs.length) + '초', osT + '개', peak + '건'] };
  },
  render: function (v, sim, t, H) {
    var c = sim.c, e = 1e-9, run = sim.reqs.filter(function (r) { return r.start <= t + e && r.end > t + e; }), done = sim.reqs.filter(function (r) { return r.end <= t + e; }).length, wait = sim.reqs.filter(function (r) { return r.start > t + e; });
    H.counters(v, [[run.length, '진행 중 (응답 대기)'], [wait.length, '시작도 못 하고 줄 선 요청'], [done, '완료']]);
    H.title(v, 'OS 스레드 ' + sim.osT + '개' + (c.model === 'pool' ? ' (톰캣 스레드 풀)' : c.model === 'loop' ? ' (이벤트 루프)' : ' (가상 스레드를 실어 나르는 스레드)')); var ln = H.lanes(v);
    for (var i = 0; i < sim.osT; i++) {
      if (sim.serial) { var r = run.filter(function (x) { return x.th === i; })[0]; if (r) H.lane(ln, '스레드 ' + (i + 1), '요청 ' + r.id + '의 응답을 기다리며 묶여 있음 · ' + H.fmt(r.end - t) + '초 남음', c.model === 'loop' ? 'bad' : 'hot', (t - r.start) / sim.w); else H.lane(ln, '스레드 ' + (i + 1), done === c.n ? '쉬는 중' : '대기', ''); }
      else H.lane(ln, '스레드 ' + (i + 1), run.length ? '한가함 (기다림은 스레드가 하지 않음)' : '쉬는 중', run.length ? 'good' : '');
    }
    if (!sim.serial) { H.title(v, c.model === 'virtual' ? '가상 스레드 (요청마다 하나, 지금은 OS 스레드에서 내려와 대기 중)' : '응답을 기다리는 요청 (스레드 없이 등록만 돼 있음)'); H.slots(v, run.map(function (r) { return ['요청 ' + r.id, 'q']; }), done ? '모두 끝남' : '없음', true); }
  },
  // 그림: 요청(번호 상자)이 OS 스레드를 붙잡고 기다리는지, 스레드 없이 기다리는지를 자리로 보인다.
  draw: function (P, sim, shown, t) {
    var c = sim.c, e = 1e-9, T = sim.osT, H = Math.max(310, 58 + T * 30), run = sim.reqs.filter(function (r) { return r.start <= t + e && r.end > t + e; }), done = sim.reqs.filter(function (r) { return r.end <= t + e; }).length, wait = sim.reqs.filter(function (r) { return r.start > t + e; });
    P.size(680, H + 66);
    P.region('wait', 16, 16, 184, H, '스레드를 못 얻고 줄 선 요청');
    P.region('thr', 216, 16, 262, H, 'OS 스레드 ' + T + '개');
    P.region('io', 494, 16, 170, H, '스레드 없이 응답 대기');
    if (sim.serial) wait.slice(0, 30).forEach(function (r, j) { P.box('rq' + r.id, 26 + (j % 3) * 56, 50 + Math.floor(j / 3) * 26, 52, 22, { cls: 'wait', sub: '요청 ' + r.id, center: true }); });
    for (var i = 0; i < T; i++) {
      var y = 50 + i * 30, r = sim.serial ? run.filter(function (x) { return x.th === i; })[0] : null;
      P.box('os' + i, 228, y, 238, 26, { cls: r ? (c.model === 'loop' ? 'bad' : 'hot') : !sim.serial && run.length ? 'good' : 'plain', title: '스레드 ' + (i + 1), right: r ? '' : !sim.serial && run.length ? '한가함' : done === c.n ? '쉬는 중' : '대기' });
      if (r) P.box('rq' + r.id, 318, y + 3, 142, 20, { cls: 'wait', sub: '요청 ' + r.id + ' · 응답 대기', center: true });
    }
    if (!sim.serial) run.slice(0, 30).forEach(function (r, j) { P.box('rq' + r.id, 502 + (j % 3) * 52, 50 + Math.floor(j / 3) * 26, 48, 22, { cls: 'good', sub: String(r.id), center: true }); });
    P.box('dn', 16, H + 30, 648, 34, { cls: 'plain', title: '완료한 요청', right: done + ' / ' + c.n + '건' });
    P.note(sim.serial ? '요청 하나가 스레드 하나를 붙잡고 응답을 기다립니다. 스레드가 모두 묶이면 나머지 요청은 왼쪽에서 줄을 섭니다.' : '기다리는 동안 요청은 스레드를 놓아줍니다(오른쪽 칸의 숫자가 요청 번호).');
  },
  assume: '요청 처리에서 CPU를 쓰는 시간은 무시하고, 외부 응답을 기다리는 시간만 있다고 단순화했습니다. 이벤트 루프와 가상 스레드를 실어 나르는 OS 스레드는 2개로 고정했습니다(실제 기본값은 CPU 코어 수에 맞춰집니다). 가상 스레드는 JDK 21에서 정식 기능이 됐으며, JDK 21~23에서는 synchronized 블록 안에서 기다리면 OS 스레드를 내려놓지 못하는 제약이 있었고 JDK 24에서 해소됐습니다. 이 PC의 JDK 21에서 기다리는 시간을 0.2초로 줄여 실제로 쟀습니다. 요청 12건 기준으로 스레드 4개 풀은 619ms(세 번에 나눠 처리), 스레드 2개에서 블로킹하면 1,227ms, 가상 스레드는 OS 스레드 2개로 216ms, 스레드 2개에서 기다림을 등록만 하는 방식은 201ms였습니다. 모형의 비율(6초, 12초, 2초, 2초)과 같습니다. 스프링 WebFlux 자체를 띄운 것은 아니고 같은 원리를 JDK만으로 재현한 측정입니다.',
});

Lab.register({
  id: 'threadpool', nav: '스레드 풀', cat: '동시성', mode: 'time',
  title: '스레드를 늘리면 무엇이 달라지나',
  intro: '요청이 들어오면 스레드 하나가 그 요청을 끝까지 맡습니다. 스레드가 모자라면 요청은 대기 줄에 서고, 줄도 꽉 차면 거절됩니다.',
  terms: ['스레드 풀', 'ThreadPoolExecutor의 동작 순서', '톰캣의 스레드 모델', '블로킹과 논블로킹'], ranks: ['threadpool', 'was'],
  controls: [
    { id: 'core', label: '기본 스레드 수', type: 'range', min: 1, max: 8, value: 2, fmt: function (v) { return v + '개'; } },
    { id: 'max', label: '최대 스레드 수', type: 'range', min: 1, max: 12, value: 4, fmt: function (v) { return v + '개'; } },
    { id: 'cap', label: '대기 큐 칸 수', type: 'range', min: 0, max: 10, value: 2, fmt: function (v, c) { return c.unb ? '무제한' : v + '칸'; } },
    { id: 'unb', label: '대기 큐를 무제한으로', type: 'check', value: false },
    { id: 'n', label: '들어오는 요청 수', type: 'range', min: 1, max: 30, value: 10, fmt: function (v) { return v + '개'; } },
    { id: 'work', label: '요청 하나의 처리 시간', type: 'range', min: 0.5, max: 3, step: 0.5, value: 2, fmt: function (v) { return Lab.fmt(v) + '초'; } },
    { id: 'gap', label: '요청이 들어오는 간격', type: 'range', min: 0, max: 1, step: 0.1, value: 0.2, fmt: function (v) { return v === 0 ? '한꺼번에' : Lab.fmt(v) + '초'; } },
  ],
  fix: function (c) { return c.max < c.core ? { max: c.core } : null; },
  presets: [
    { t: '처음 설정으로', d: '기본 2, 최대 4, 큐 2칸에 요청 10개. 일부가 거절됩니다.', v: { core: 2, max: 4, cap: 2, n: 10, work: 2, gap: 0.2, unb: false } },
    { t: '스레드만 늘려 보기', d: '기본 4, 최대 8로. 거절과 대기가 어떻게 변하는지 봅니다.', v: { core: 4, max: 8, cap: 2, n: 10, work: 2, gap: 0.2, unb: false } },
    { t: '대기 줄만 늘려 보기', d: '스레드는 그대로, 큐만 10칸으로. 거절은 줄지만 기다림이 길어집니다.', v: { core: 2, max: 4, cap: 10, n: 10, work: 2, gap: 0.2, unb: false } },
    { t: '대기 줄을 무제한으로', d: '최대 스레드 수가 쓰이지 않는 것을 확인합니다.', v: { core: 2, max: 4, cap: 2, n: 10, work: 2, gap: 0.2, unb: true } },
    { t: '요청이 빨리 끝나게', d: '처리 시간을 0.5초로. 같은 스레드 수로도 버팁니다.', v: { core: 2, max: 4, cap: 2, n: 10, work: 0.5, gap: 0.2, unb: false } },
  ],
  code: function (c) {
    var q = c.unb ? 'new LinkedBlockingQueue<>());      // 대기 큐 무제한' : c.cap === 0 ? 'new SynchronousQueue<>());         // 대기 칸 없음' : 'new ArrayBlockingQueue<>(' + c.cap + '));     // 대기 큐 ' + c.cap + '칸';
    return 'ExecutorService pool = new ThreadPoolExecutor(\n    ' + c.core + ',                        // 기본 스레드 수\n    ' + c.max + ',                        // 최대 스레드 수\n    60, TimeUnit.SECONDS,\n    ' + q + '\n\nfor (int i = 1; i <= ' + c.n + '; i++) {\n    pool.execute(() -> handle());   // 요청 하나에 ' + Lab.fmt(c.work) + '초\n' +
      (c.gap > 0 ? '    Thread.sleep(' + Math.round(c.gap * 1000) + ');            // ' + Lab.fmt(c.gap) + '초마다 도착\n' : '') + '}';
  },
  label: function (c) { return '기본 ' + c.core + ' / 최대 ' + c.max + ' / 큐 ' + (c.unb ? '무제한' : c.cap) + ' · 요청 ' + c.n + '개 · ' + Lab.fmt(c.work) + '초 · 간격 ' + Lab.fmt(c.gap) + '초'; },
  columns: ['완료', '거절', '평균 대기', '가장 긴 대기', '전체 소요', '만든 스레드'],
  // 자바 ThreadPoolExecutor와 같은 순서: 기본 스레드 -> 대기 큐 -> 최대 스레드 -> 거절
  simulate: function (c) {
    var fmt = Lab.fmt, threads = [], queue = [], log = [], reqs = [], cap = c.unb ? Infinity : c.cap;
    function start(th, r, t) { r.start = t; r.end = t + c.work; th.busyUntil = r.end; th.req = r; th.segs.push(r); }
    function finishUpTo(t) {
      for (;;) {
        var th = null;
        threads.forEach(function (x) { if (x.req && x.busyUntil <= t + 1e-9 && (!th || x.busyUntil < th.busyUntil)) th = x; });
        if (!th) return;
        var done = th.req, at = th.busyUntil; th.req = null;
        if (queue.length) { var nx = queue.shift(); start(th, nx, at); log.push({ t: at, s: '스레드 ' + th.id + '이 요청 ' + done.id + '을 끝내고, 대기 줄 맨 앞의 요청 ' + nx.id + '을 꺼내 처리하기 시작합니다. 요청 ' + nx.id + '은 ' + fmt(at - nx.at) + '초를 기다렸습니다.' }); }
        else log.push({ t: at, s: '스레드 ' + th.id + '이 요청 ' + done.id + '을 끝냈습니다. 대기 중인 요청이 없어 쉽니다.' });
      }
    }
    for (var i = 1; i <= c.n; i++) {
      var t = Math.round((i - 1) * c.gap * 10) / 10, r = { id: i, at: t };
      reqs.push(r); finishUpTo(t);
      var idle = threads.filter(function (x) { return !x.req; })[0], busy = threads.filter(function (x) { return x.req; }).length, th;
      if (threads.length < c.core) { th = { id: threads.length + 1, created: t, segs: [], req: null }; threads.push(th); start(th, r, t); log.push({ t: t, x: 'new', s: '요청 ' + i + ' 도착. 스레드가 기본 수(' + c.core + '개)보다 적으므로 스레드 ' + th.id + '을 새로 만들어 바로 처리합니다.' }); }
      else if (idle) { start(idle, r, t); log.push({ t: t, x: 'reuse', s: '요청 ' + i + ' 도착. 쉬고 있던 스레드 ' + idle.id + '이 바로 처리합니다.' }); }
      else if (queue.length < cap) { queue.push(r); r.queued = t; log.push({ t: t, x: 'queue', s: '요청 ' + i + ' 도착. 스레드 ' + busy + '개가 모두 일하는 중입니다. 스레드를 늘리지 않고 대기 줄에 세웁니다(대기 ' + queue.length + (c.unb ? '' : '/' + c.cap) + ').' }); }
      else if (threads.length < c.max) { th = { id: threads.length + 1, created: t, segs: [], req: null }; threads.push(th); start(th, r, t); log.push({ t: t, x: 'grow', s: '요청 ' + i + ' 도착. 대기 줄이 꽉 찼습니다. 이제서야 스레드 ' + th.id + '을 추가로 만들어 처리합니다(최대 ' + c.max + '개까지).' }); }
      else { r.rejected = true; log.push({ t: t, x: 'rej', k: 'bad', s: '요청 ' + i + ' 도착. 스레드 ' + c.max + '개가 모두 일하는 중이고 대기 줄도 꽉 찼습니다. 요청을 거절합니다.' }); }
    }
    finishUpTo(Infinity);
    var ok = reqs.filter(function (r) { return !r.rejected; }), waits = ok.map(function (r) { return r.start - r.at; });
    var total = ok.reduce(function (m, r) { return Math.max(m, r.end); }, 0), rej = reqs.length - ok.length;
    var avg = waits.length ? waits.reduce(function (a, b) { return a + b; }, 0) / waits.length : 0, mx = waits.length ? Math.max.apply(null, waits) : 0;
    var sum = ['처리된 요청은 평균 ' + fmt(avg) + '초, 가장 오래 기다린 요청은 ' + fmt(mx) + '초를 대기 줄에서 보냈습니다.'];
    if (c.unb && threads.length <= c.core && c.max > c.core) sum.push('대기 줄이 무제한이라 꽉 찰 일이 없었고, 그래서 최대 스레드 수 ' + c.max + '개는 한 번도 쓰이지 않았습니다.');
    if (rej > 0) sum.push('거절을 없애려면 스레드를 늘리거나, 대기 줄을 늘리거나(대신 기다리는 시간이 길어짐), 요청 처리 시간을 줄여야 합니다.');
    if (rej === 0 && mx === 0) sum.push('모든 요청이 기다리지 않고 바로 처리됐습니다. 이 부하에는 스레드가 충분합니다.');
    return { total: total, events: log, summary: sum, threads: threads, reqs: reqs,
      row: [ok.length + '개', rej + '개', fmt(avg) + '초', fmt(mx) + '초', fmt(total) + '초', threads.length + '개'] };
  },
  render: function (v, sim, t, H) {
    var c = sim.c, slots = Math.max(c.max, sim.threads.length), rows = [];
    for (var i = 0; i < slots; i++) {
      var th = sim.threads[i];
      if (!th || th.created > t + 1e-9) { rows.push(['스레드 ' + (i + 1), i < c.core ? '아직 만들지 않음(기본)' : '아직 만들지 않음(큐가 꽉 차야 만듦)', 'none']); continue; }
      var cur = th.segs.filter(function (r) { return r.start <= t + 1e-9 && r.end > t + 1e-9; })[0];
      if (cur) { rows.push(['스레드 ' + (i + 1), '요청 ' + cur.id + ' 처리 중 · ' + H.fmt(cur.end - t) + '초 남음', '', (t - cur.start) / c.work]); }
      else rows.push(['스레드 ' + (i + 1), '쉬는 중', '']);
    }
    var q = sim.reqs.filter(function (r) { return r.queued !== undefined && r.queued <= t + 1e-9 && r.start > t + 1e-9; });
    H.title(v, '스레드'); var ln = H.lanes(v); rows.forEach(function (r) { H.lane(ln, r[0], r[1], r[2], r[3]); });
    H.title(v, '대기 큐');
    var items = [], capN = c.unb ? Math.max(q.length, 1) : c.cap;
    for (var j = 0; j < capN; j++) items.push(q[j] ? ['요청 ' + q[j].id, 'q'] : [c.unb ? '비어 있음' : '빈 칸', '']);
    if (c.unb) items.push(['… 무제한', '']);
    H.slots(v, items, '대기 칸이 없습니다. 쉬는 스레드가 없으면 바로 스레드를 늘리거나 거절합니다.');
  },
  // 그림: 왼쪽에 대기 큐와 거절된 요청, 오른쪽에 스레드. 요청(번호 상자)이 큐에서 스레드로 옮겨 가고, 자리가 없으면 거절 칸으로 간다.
  draw: function (P, sim, shown, t) {
    var c = sim.c, slots = Math.max(c.max, sim.threads.length), th = 42 + slots * 28, lh = 362, H = Math.max(th, lh);
    var q = sim.reqs.filter(function (r) { return r.queued !== undefined && r.queued <= t + 1e-9 && r.start > t + 1e-9; }), rj = sim.reqs.filter(function (r) { return r.rejected && r.at <= t + 1e-9; }), doneN = sim.reqs.filter(function (r) { return !r.rejected && r.end <= t + 1e-9; }).length, capN = c.unb ? 10 : c.cap;
    P.size(680, H + 32);
    P.region('qu', 16, 16, 290, 112, '대기 큐 ' + (c.unb ? '(무제한)' : c.cap + '칸') + ' · 숫자는 요청 번호');
    P.region('rej', 16, 140, 290, 238, '거절된 요청');
    P.region('thr', 346, 16, 318, H, '스레드 (기본 ' + c.core + '개, 최대 ' + c.max + '개)');
    for (var j = 0; j < capN; j++) if (!q[j]) P.box('qe' + j, 28 + (j % 5) * 54, 50 + Math.floor(j / 5) * 34, 50, 28, { cls: 'ghost' });
    q.slice(0, 10).forEach(function (r, j) { P.box('rq' + r.id, 28 + (j % 5) * 54, 50 + Math.floor(j / 5) * 34, 50, 28, { cls: 'wait', sub: String(r.id), center: true }); });
    if (!capN) P.text('noq', 161, 80, '대기 칸이 없습니다', { cls: 'mut', anchor: 'middle' });
    rj.forEach(function (r, j) { P.box('rq' + r.id, 28 + (j % 5) * 54, 174 + Math.floor(j / 5) * 34, 50, 28, { cls: 'bad', sub: String(r.id), center: true }); });
    if (!rj.length) P.text('norj', 161, 262, '없음', { cls: 'mut', anchor: 'middle' });
    for (var i = 0; i < slots; i++) {
      var x = sim.threads[i], y = 50 + i * 28, made = x && x.created <= t + 1e-9, cur = made ? x.segs.filter(function (r) { return r.start <= t + 1e-9 && r.end > t + 1e-9; })[0] : null;
      P.box('th' + i, 358, y, 294, 24, { cls: !made ? 'ghost' : cur ? 'hot' : 'plain', title: '스레드 ' + (i + 1), right: !made ? (i < c.core ? '아직 안 만듦' : '큐가 꽉 차야 만듦') : cur ? '' : '쉬는 중' });
      if (cur) P.box('rq' + cur.id, 540, y + 3, 104, 18, { cls: 'wait', sub: '요청 ' + cur.id + ' 처리 중', center: true, from: 'th' + i });
    }
    P.text('done', 358, H + 8, '처리 완료 ' + doneN + '개', { cls: 'good' });
    P.note('번호가 적힌 파란 상자가 요청입니다.');
  },
  assume: '요청 하나를 처리하는 동안 스레드 하나가 처리 시간만큼 통째로 묶입니다(응답이 느린 DB나 외부 API를 기다리는 요청). 스레드를 늘려도 비용이 들지 않는다고 가정했습니다. 실제로는 스레드마다 메모리를 쓰고, CPU를 쓰려는 스레드가 코어 수보다 많아지면 교대하는 비용이 늘어납니다. 스레드를 배정하는 순서(기본 스레드 → 대기 큐 → 최대 스레드 → 거절)는 자바 ThreadPoolExecutor의 실제 규칙과 같고, 실제 실행 결과와 대조했습니다.',
});

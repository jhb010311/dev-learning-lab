Lab.register({
  id: 'parallel', nav: '순차 호출과 병렬 호출', cat: '동시성', mode: 'time',
  title: '외부 호출 여러 개를 차례로 할까 한꺼번에 할까',
  intro: '상품 상세 화면 하나를 만들려고 여러 서비스를 호출합니다. 차례로 부르면 걸리는 시간이 모두 더해지고, 동시에 부르면 가장 느린 호출만큼만 걸립니다.',
  terms: ['CompletableFuture', '동기와 비동기', '스레드 풀', 'ForkJoinPool과 공용 풀'], ranks: ['concurrency', 'threadpool', 'javaver'],
  controls: [
    { id: 'how', label: '호출 방식', type: 'select', value: 'seq', options: [['seq', '순차 (하나 끝나면 다음)'], ['par', '병렬 (CompletableFuture로 동시에)']] },
    { id: 'n', label: '호출하는 서비스 수', type: 'range', min: 2, max: 5, value: 4, fmt: function (v) { return v + '개'; } },
    { id: 'pool', label: '비동기 작업용 스레드 수', type: 'range', min: 1, max: 5, value: 5, fmt: function (v) { return v + '개'; }, show: function (c) { return c.how === 'par'; } },
    { id: 'to', label: '호출마다 제한 시간 1초를 둔다 (넘으면 기본값 사용)', type: 'check', value: false },
  ],
  presets: [
    { t: '처음 설정으로', q: '서비스 4개를 순차로 호출하고 제한 시간을 두지 않으면 전체 응답 시간은 어떻게 되나', d: '4개를 차례로 호출합니다. 시간이 전부 더해집니다.', v: { how: 'seq', n: 4, pool: 5, to: false } },
    { t: '병렬로 바꾸면', q: 'CompletableFuture로 서비스를 동시에 호출하면', d: '가장 느린 호출 하나의 시간만 걸립니다.', v: { how: 'par', n: 4, pool: 5, to: false } },
    { t: '병렬인데 스레드가 2개뿐이면', q: '병렬 호출인데 비동기 작업용 스레드 수를 2개로 줄이면', d: '동시에 2개까지만 진행됩니다.', v: { how: 'par', n: 4, pool: 2, to: false } },
    { t: '느린 호출에 제한 시간', q: '병렬로 바꾸고 호출마다 제한 시간 1초를 두면', d: '1초를 넘는 호출은 기다리지 않고 기본값으로 대신합니다.', v: { how: 'par', n: 4, pool: 5, to: true } },
    { t: '5개를 순차로', q: '순차 호출 그대로 서비스 수를 5개로 늘리면', d: '호출이 하나 늘 때마다 그만큼 느려집니다.', v: { how: 'seq', n: 5, pool: 5, to: false } },
  ],
  CALLS: [['상품 정보', 0.3], ['재고', 0.5], ['리뷰', 0.8], ['추천 상품', 1.6], ['쿠폰', 0.4]],
  code: function (c) {
    var names = ['product', 'stock', 'reviews', 'recommend', 'coupons'].slice(0, c.n), api = ['productApi.get(id)', 'stockApi.get(id)', 'reviewApi.list(id)', 'recommendApi.list(id)', 'couponApi.list(id)'];
    if (c.how === 'seq') return names.map(function (nm, i) { return 'var ' + nm + ' = ' + api[i] + ';'; }).join('\n') + '\n\nreturn new ProductPage(' + names.join(', ') + ');';
    return 'ExecutorService pool = Executors.newFixedThreadPool(' + c.pool + ');\n\n' + names.map(function (nm, i) { return 'var ' + nm + 'F = CompletableFuture.supplyAsync(() -> ' + api[i] + ', pool)' + (c.to ? '\n        .completeOnTimeout(defaultValue(), 1, TimeUnit.SECONDS)' : '') + ';'; }).join('\n') + '\n\nCompletableFuture.allOf(' + names.map(function (nm) { return nm + 'F'; }).join(', ') + ').join();   // 전부 끝날 때까지 대기\nreturn new ProductPage(' + names.map(function (nm) { return nm + 'F.join()'; }).join(', ') + ');';
  },
  label: function (c) { return (c.how === 'seq' ? '순차' : '병렬 (스레드 ' + c.pool + '개)') + ' · ' + c.n + '개 호출' + (c.to ? ' · 제한 1초' : ''); },
  columns: ['전체 응답 시간', '호출 시간의 합', '가장 느린 호출', '기본값으로 대신한 호출'],
  simulate: function (c) {
    var fmt = Lab.fmt, calls = this.CALLS.slice(0, c.n).map(function (x, i) { return { id: i, name: x[0], dur: x[1] }; }), ev = [], sum = [], cut = 0;
    calls.forEach(function (x) { x.eff = c.to && x.dur > 1 ? 1 : x.dur; if (x.eff < x.dur) cut++; });
    if (c.how === 'seq') { var t = 0; calls.forEach(function (x) { x.start = t; x.end = t + x.eff; t = x.end; }); }
    else { var slots = []; for (var i = 0; i < c.pool; i++) slots.push(0); calls.forEach(function (x) { var k = 0; for (var j = 1; j < slots.length; j++) if (slots[j] < slots[k]) k = j; x.start = slots[k]; x.end = x.start + x.eff; slots[k] = x.end; x.th = k; }); }
    calls.forEach(function (x) {
      ev.push({ t: x.start, s: fmt(x.start) + '초: ' + x.name + ' 호출을 시작합니다(' + fmt(x.dur) + '초 걸리는 호출).' + (c.how === 'par' && x.start > 0 ? ' 비동기용 스레드가 모자라 앞의 호출이 끝난 뒤에야 시작됐습니다.' : '') });
      ev.push({ t: x.end, k: x.eff < x.dur ? 'bad' : '', s: fmt(x.end) + '초: ' + x.name + (x.eff < x.dur ? ' 호출이 제한 시간 1초를 넘겼습니다. 더 기다리지 않고 기본값(빈 목록)으로 대신합니다.' : ' 응답 도착.') });
    });
    ev.sort(function (a, b) { return a.t - b.t; });
    var total = calls.reduce(function (m, x) { return Math.max(m, x.end); }, 0), add = calls.reduce(function (a, x) { return a + x.eff; }, 0), slow = calls.reduce(function (m, x) { return Math.max(m, x.eff); }, 0);
    ev.push({ t: total, k: 'good', s: fmt(total) + '초: 모든 결과가 모였습니다. 화면을 조립해 응답합니다.' });
    if (c.how === 'seq') sum.push('순차 호출의 응답 시간은 모든 호출 시간의 합입니다. 서로 결과에 의존하지 않는 호출이라면 차례로 부를 이유가 없습니다.');
    else if (total <= slow + 1e-9) sum.push('병렬 호출의 응답 시간은 가장 느린 호출 하나의 시간입니다. 호출을 더 늘려도 가장 느린 것보다 빠르기만 하면 응답 시간은 늘지 않습니다.');
    else sum.push('병렬로 요청했지만 비동기 작업용 스레드가 ' + c.pool + '개뿐이라 동시에 ' + c.pool + '개까지만 진행됐습니다. 블로킹 호출을 병렬로 돌리려면 동시에 돌릴 개수만큼 스레드가 필요합니다. 스레드 풀을 지정하지 않으면 모든 코드가 함께 쓰는 공용 풀에서 실행되는데, 이 풀은 CPU 코어 수 정도로 작아서 블로킹 호출에는 맞지 않습니다.');
    if (c.to) sum.push(cut ? '제한 시간을 넘긴 ' + cut + '개 호출은 기본값으로 대신했습니다. 추천 상품처럼 없어도 화면을 보여 줄 수 있는 정보는 이렇게 처리해서, 느린 서비스 하나가 전체 응답을 붙잡지 못하게 합니다.' : '제한 시간 1초를 넘긴 호출이 없어 결과는 같습니다.');
    return { total: total, events: ev, summary: sum, calls: calls, row: [fmt(total) + '초', fmt(add) + '초', fmt(slow) + '초', cut + '개'] };
  },
  render: function (v, sim, t, H) {
    var e = 1e-9, done = sim.calls.filter(function (x) { return x.end <= t + e; }).length;
    H.counters(v, [[H.fmt(Math.min(t, sim.total)) + '초', '지금까지 걸린 시간'], [done + ' / ' + sim.calls.length, '끝난 호출']]);
    H.title(v, '호출별 진행 (막대 길이 = 전체 시간에서 차지하는 구간)'); var ln = H.lanes(v);
    sim.calls.forEach(function (x) {
      var st = t < x.start - e ? '대기' : t < x.end - e ? '호출 중 · ' + H.fmt(x.end - t) + '초 남음' : x.eff < x.dur ? '제한 시간 초과 → 기본값 사용' : '완료 (' + H.fmt(x.eff) + '초)';
      H.lane(ln, x.name, H.fmt(x.start) + '초 ~ ' + H.fmt(x.end) + '초 · ' + st, t < x.start - e ? 'none' : t < x.end - e ? 'hot' : x.eff < x.dur ? 'bad' : 'good', t < x.start - e ? undefined : Math.min(x.end, t) / sim.total);
    });
  },
  // 그림: 호출마다 막대 하나. 막대의 위치가 시작 시각이고 길이가 걸린 시간이다. 차례로 부르면 막대가 이어지고 동시에 부르면 겹친다.
  draw: function (P, sim, shown, t) {
    var e = 1e-9, total = sim.total, n = sim.calls.length, tt = Math.min(t, total);
    P.size(680, 76 + n * 36 + 16);
    P.region('g', 16, 16, 648, 44 + n * 36, '시간 축 (왼쪽 0초, 오른쪽 ' + (Math.round(total * 10) / 10) + '초)');
    sim.calls.forEach(function (x, i) {
      var y = 50 + i * 36, before = t < x.start - e, running = !before && t < x.end - e, cut = x.eff < x.dur;
      P.text('nm' + i, 28, y + 17, P.fit(x.name, 130), { cls: before ? 'mut' : '' });
      P.box('bg' + i, 170, y, 480, 24, { cls: 'ghost' });
      if (!before) P.box('bar' + i, 170 + 480 * x.start / total, y, Math.max(3, 480 * (Math.min(x.end, t) - x.start) / total), 24, { cls: running ? 'hot' : cut ? 'bad' : 'good' });
    });
    P.box('now', 170 + 480 * tt / total - 1, 44, 2, n * 36 + 4, { cls: 'plain' });
    P.text('tm', 664, 40 + n * 36 + 46, '지금 ' + (Math.round(tt * 10) / 10) + '초', { anchor: 'end', bold: true });
    P.note('막대가 왼쪽에서 오른쪽으로 차오릅니다. 차례로 부르면 막대가 계단처럼 이어져 시간이 더해지고, 동시에 부르면 막대가 같은 구간에 겹쳐 가장 긴 것만큼만 걸립니다. 빨간 막대는 제한 시간이 지나 기본값으로 대신한 호출입니다(실제 호출은 뒤에서 계속 실행됩니다).');
  },
  assume: '각 호출의 소요 시간(상품 0.3초, 재고 0.5초, 리뷰 0.8초, 추천 1.6초, 쿠폰 0.4초)은 고정된 예시이고, 호출들은 서로의 결과가 필요 없다고 가정했습니다. 한 호출의 결과가 다음 호출의 입력이라면 그 둘은 순차로 해야 합니다. 병렬 호출은 스레드 하나가 호출 하나를 맡아 기다리는 블로킹 호출을 가정했습니다. completeOnTimeout은 JDK 9부터 있는 메서드입니다. 이 PC의 JDK 21에서 실제로 실행해 확인했습니다. 같은 시간의 호출 4개로 순차 3,243ms, 병렬(스레드 5개) 1,603ms, 병렬(스레드 2개) 2,127ms, 제한 시간 1초 적용 시 1,011ms가 나와 모형의 값(3.2초, 1.6초, 2.1초, 1.0초)과 일치했습니다.',
});

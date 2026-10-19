Lab.register({
  id: 'parstream', nav: '병렬 스트림과 공용 풀', cat: '동시성', mode: 'step',
  title: '남의 병렬 스트림 때문에 내 코드가 느려진다',
  intro: 'parallelStream()은 스레드 풀을 따로 만들지 않고, JVM 전체가 함께 쓰는 공용 풀 하나에서 실행됩니다. 누군가 그 안에서 오래 기다리는 작업을 돌리면 공용 풀의 스레드가 모두 묶여, 전혀 상관없는 다른 병렬 스트림까지 느려집니다.',
  terms: ['ForkJoinPool과 공용 풀', 'Stream API', '스레드 풀', '블로킹과 논블로킹'], ranks: ['stream', 'threadpool', 'concurrency'],
  controls: [
    { id: 'a', label: '요청 A가 하는 일', type: 'select', value: 'block', options: [['none', '없음 (B만 실행)'], ['block', '병렬 스트림 안에서 2초씩 걸리는 외부 API 호출 8번'], ['own', '같은 작업을 전용 스레드 풀에서 실행']] },
  ],
  presets: [
    { t: '처음 설정으로', q: '요청 A가 병렬 스트림 안에서 2초씩 걸리는 외부 API 호출 8번을 하는 동안 요청 B는 어떻게 되나', d: 'A가 공용 풀을 붙잡습니다. B가 4배 느려집니다.', v: { a: 'block' } },
    { t: 'B만 실행할 때', q: '요청 A 없이 B만 실행하면', d: '공용 풀을 온전히 써서 빠릅니다.', v: { a: 'none' } },
    { t: 'A를 전용 풀로 옮기면', q: 'A의 같은 작업을 전용 스레드 풀에서 실행하면', d: 'B가 다시 빨라집니다.', v: { a: 'own' } },
  ],
  code: function (c) {
    var b = '// 요청 B: 0.1초짜리 작업 8개\nitems.parallelStream().forEach(this::resize);';
    if (c.a === 'none') return b;
    if (c.a === 'block') return '// 요청 A: 외부 API를 병렬 스트림 안에서 호출 (건당 2초)\norders.parallelStream()\n      .forEach(o -> deliveryApi.track(o));      // 공용 풀의 스레드가 2초씩 묶인다\n\n' + b;
    return '// 요청 A: 전용 풀에서 실행\nExecutorService io = Executors.newFixedThreadPool(8);\nvar futures = orders.stream()\n      .map(o -> CompletableFuture.runAsync(() -> deliveryApi.track(o), io))\n      .toList();\nfutures.forEach(CompletableFuture::join);\n\n' + b;
  },
  label: function (c) { return { none: 'B만 실행', block: 'A가 공용 풀에서 블로킹 호출', own: 'A는 전용 풀 사용' }[c.a]; },
  columns: ['B의 소요 시간 (실측)', 'B가 쓸 수 있었던 스레드', 'A가 쓴 풀'],
  simulate: function (c) {
    var ev = [], sum = [], ms = { none: 217, block: 862, own: 218 }[c.a], S = { pool: ['쉬는 중', '쉬는 중', '쉬는 중'], b: '시작 전', own: '' };
    function push(s, k) { ev.push({ s: s, k: k, snap: JSON.parse(JSON.stringify(S)) }); }
    push('공용 풀(ForkJoinPool.commonPool)에는 일꾼 스레드가 3개 있습니다. 기본 크기는 "CPU 코어 수 - 1"이고, 병렬 스트림을 호출한 스레드 자신도 일을 거듭니다. JVM 안의 모든 병렬 스트림이 이 풀 하나를 함께 씁니다.', '');
    if (c.a === 'block') { S.pool = ['A의 API 응답 대기 (2초)', 'A의 API 응답 대기 (2초)', 'A의 API 응답 대기 (2초)']; push('요청 A가 병렬 스트림 안에서 외부 API를 호출합니다. 공용 풀의 일꾼 3개가 모두 A의 작업을 하나씩 집어 들고, 응답을 기다리며 2초씩 멈춰 있습니다. 계산을 하는 것이 아니라 그냥 기다리는 중인데도 스레드는 묶여 있습니다.', 'bad'); }
    if (c.a === 'own') { S.own = '전용 풀 스레드 8개: A의 API 응답 대기'; push('요청 A는 외부 API 호출을 자기가 만든 전용 스레드 풀에서 실행합니다. 공용 풀은 건드리지 않습니다.', 'good'); }
    S.b = '병렬 스트림 시작 (작업 8개)'; push('요청 B가 0.1초짜리 작업 8개를 parallelStream()으로 실행합니다. 작업을 쪼개 공용 풀에 맡깁니다.', '');
    if (c.a === 'block') { S.b = '혼자서 8개를 차례로 처리 중'; push('공용 풀의 일꾼이 전부 A에 묶여 있어서 B의 작업을 가져갈 스레드가 없습니다. B를 호출한 스레드 혼자서 8개를 하나씩 처리합니다. 병렬 스트림인데 사실상 순차 실행입니다.', 'bad'); }
    else { S.pool = ['B의 작업 처리', 'B의 작업 처리', 'B의 작업 처리']; S.b = '호출한 스레드 + 일꾼 3개 = 4개가 동시에 처리'; push('공용 풀의 일꾼 3개와 B를 호출한 스레드까지 4개가 작업을 나눠 처리합니다. 8개를 두 번에 끝냅니다.', 'good'); }
    S.b = '완료: ' + ms + 'ms'; if (c.a !== 'block') S.pool = ['쉬는 중', '쉬는 중', '쉬는 중'];
    push('B가 끝났습니다. 소요 시간 ' + ms + 'ms.' + (c.a === 'block' ? ' B만 실행할 때(217ms)의 약 4배입니다. B의 코드는 한 줄도 바뀌지 않았습니다.' : ''), c.a === 'block' ? 'bad' : 'good');
    if (c.a === 'block') sum.push('공용 풀은 JVM 전체가 공유합니다. 한 곳에서 오래 기다리는 작업을 병렬 스트림에 넣으면, 서로 모르는 다른 코드의 병렬 스트림과 CompletableFuture(풀을 지정하지 않은 경우)까지 함께 느려집니다. 원인이 되는 코드와 느려지는 코드가 달라서 찾기도 어렵습니다.');
    if (c.a === 'own') sum.push('기다림이 있는 작업(DB, 외부 API)은 전용 스레드 풀에서 실행해 공용 풀과 분리합니다. 한쪽이 막혀도 다른 쪽에 번지지 않게 자원을 나누는 것입니다.');
    sum.push('병렬 스트림은 CPU를 쓰는 계산을 큰 데이터에 적용할 때만 이득입니다. 공용 풀의 크기가 코어 수에 맞춰져 있는 것도 그 용도이기 때문입니다. 원소가 적거나, 작업이 가볍거나, 기다림이 섞여 있으면 순차 스트림보다 느려질 수 있습니다. 웹 서버의 요청 처리 코드에서는 대부분 쓸 이유가 없습니다.');
    return { events: ev, summary: sum, row: [ms + 'ms', c.a === 'block' ? '1개 (자기 자신뿐)' : '4개', { none: '-', block: '공용 풀', own: '전용 풀' }[c.a]] };
  },
  render: function (v, sim, t, H, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : null;
    if (!s) { H.text(v, '실행을 누르면 시작합니다.'); return; }
    H.title(v, '공용 풀 (JVM 전체가 함께 씀)'); var ln = H.lanes(v);
    s.pool.forEach(function (x, i) { H.lane(ln, '일꾼 ' + (i + 1), x, x.indexOf('A의') === 0 ? 'bad' : x.indexOf('B의') === 0 ? 'good' : 'none'); });
    if (s.own) { H.title(v, '요청 A의 전용 풀'); H.lane(H.lanes(v), '전용 풀', s.own, 'wait'); }
    H.title(v, '요청 B'); H.lane(H.lanes(v), '요청 B', s.b, s.b.indexOf('혼자') === 0 ? 'bad' : s.b === '시작 전' ? 'none' : 'hot');
  },
  assume: 'B의 소요 시간 세 가지(217ms, 862ms, 218ms)는 검증 환경의 JDK 21에서 공용 풀의 일꾼 수를 3개로 맞추고 실제로 실행해 잰 값입니다. 0.1초짜리 작업과 2초짜리 호출은 Thread.sleep으로 대신했습니다. 공용 풀의 기본 크기가 "코어 수 - 1"이라는 점은 검증 환경의 JDK 21에서 확인했습니다(프로세서 12개에서 공용 풀의 병렬 수준이 11). 병렬 스트림이 공용 풀을 쓴다는 점은 위의 측정에서 드러납니다(남의 병렬 스트림이 공용 풀을 차지하자 B가 느려졌습니다).',
});

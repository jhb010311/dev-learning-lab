Lab.register({
  id: 'ctx', nav: '스레드 수와 컨텍스트 스위칭', cat: '동시성', mode: 'step',
  title: '스레드를 늘린다고 계속 빨라지지는 않는다',
  intro: 'CPU 코어 하나는 한순간에 스레드 하나만 실행합니다. 실행하려는 스레드가 코어보다 많으면 운영체제가 짧은 시간씩 번갈아 실행시킵니다(컨텍스트 스위칭). 그러면 처리량은 더 늘지 않고 작업 하나가 끝나는 시간만 길어집니다. 작업이 계산 위주인지 기다림 위주인지에 따라 적당한 스레드 수가 완전히 달라집니다.',
  terms: ['프로세스와 스레드', '컨텍스트 스위칭', '스레드 풀', '블로킹과 논블로킹'], ranks: ['os', 'threadpool', 'concurrency'],
  controls: [
    { id: 'core', label: 'CPU 코어 수', type: 'range', min: 1, max: 8, value: 4, fmt: function (v) { return v + '개'; } },
    { id: 'th', label: '스레드 수', type: 'range', min: 1, max: 80, value: 16, fmt: function (v) { return v + '개'; } },
    { id: 'kind', label: '작업의 성격', type: 'select', value: 'cpu', options: [['cpu', '계산 위주 (이미지 변환, 암호화 등): 계속 CPU를 씀'], ['io', '기다림 위주 (DB·API 호출): 시간의 90%는 응답 대기']] },
  ],
  presets: [
    { t: '처음 설정으로', q: 'CPU 코어 4개에 계산 위주 작업을 스레드 16개로 돌리면 어떻게 되나', d: '코어 4개에 계산 작업 스레드 16개. 처리량은 4개일 때와 같고, 작업 하나가 끝나는 시간만 4배가 됩니다.', v: { core: 4, th: 16, kind: 'cpu' } },
    { t: '스레드를 코어 수에 맞추면', q: '계산 위주 작업은 그대로 두고 스레드 수를 4개로 바꾸면', d: '처리량은 같고 작업마다 기다림 없이 끝납니다.', v: { core: 4, th: 4, kind: 'cpu' } },
    { t: '기다림 위주 작업, 스레드 4개', q: '기다림 위주 작업을 스레드 4개로 돌리면', d: '스레드가 대부분 기다리고 있어 CPU가 놉니다.', v: { core: 4, th: 4, kind: 'io' } },
    { t: '기다림 위주 작업, 스레드 40개', q: '기다림 위주 작업을 스레드 40개로 돌리면', d: '기다리는 동안 다른 스레드가 CPU를 써서 처리량이 10배가 됩니다.', v: { core: 4, th: 40, kind: 'io' } },
    { t: '그보다 더 늘리면', q: '기다림 위주 작업을 스레드 80개로 돌리면', d: '80개. CPU가 이미 꽉 차서 처리량은 그대로입니다.', v: { core: 4, th: 80, kind: 'io' } },
  ],
  code: function (c) {
    return 'int cores = Runtime.getRuntime().availableProcessors();   // ' + c.core + '\n\n// ' + (c.kind === 'cpu' ? '계산 위주: 코어 수만큼이면 충분' : '기다림 위주: 코어 수 x (1 + 대기 시간 / 계산 시간)') + '\nExecutorService pool = Executors.newFixedThreadPool(' + c.th + ');\n\n' + (c.kind === 'cpu' ? 'for (Photo photo : photos) {\n    pool.submit(() -> resize(photo));' : 'for (Order order : orders) {\n    pool.submit(() -> callExternalApi(order));') + '\n}\n// ' + (c.kind === 'cpu' ? 'Photo, photos, resize()' : 'Order, orders, callExternalApi()') + '는 예시로 만든 이름 (필요한 부분만 남김)';
  },
  label: function (c) { return '코어 ' + c.core + ' · 스레드 ' + c.th + ' · ' + (c.kind === 'cpu' ? '계산 위주' : '기다림 위주'); },
  columns: ['초당 처리량', 'CPU 사용률', '작업 하나가 끝나는 시간', '이 작업에 알맞은 스레드 수'],
  simulate: function (c) {
    var C = c.core, T = c.th, io = c.kind === 'io', cpuFrac = io ? 0.1 : 1, taskCpu = 0.1, waitT = io ? 0.9 : 0, ev = [], sum = [];
    var want = T * cpuFrac, over = want > C + 1e-9, used = Math.min(want, C), tput = Math.round(used / taskCpu), best = Math.round(C / cpuFrac), util = Math.round(used / C * 100);
    var busy = over ? T - tput * waitT : want, share = over ? busy / C : 1, lat = Math.round((taskCpu * share + waitT) * 100) / 100, baseLat = Math.round((taskCpu + waitT) * 100) / 100;
    function push(s, k, stage) { ev.push({ s: s, k: k, snap: { stage: stage } }); }
    push('코어 ' + C + '개, 스레드 ' + T + '개입니다. ' + (io ? '각 스레드는 시간의 10%만 계산하고 90%는 외부 응답을 기다립니다. 기다리는 스레드는 CPU를 쓰지 않습니다.' : '각 스레드는 쉬지 않고 계산합니다.'), '', 1);
    push((io && over ? '코어가 넉넉하다면 ' : '') + '어느 순간에 CPU를 쓰려는 스레드는 평균 ' + (Math.round(want * 10) / 10) + '개입니다(' + T + '개 × ' + (cpuFrac * 100) + '%). 코어는 ' + C + '개이므로 ' + (over ? '코어가 모자랍니다. 운영체제가 스레드들을 짧은 시간씩 번갈아 코어에 올립니다.' : want < C - 1e-9 ? '코어가 남습니다. 남은 코어는 할 일이 없어 놉니다.' : '딱 맞습니다.'), over ? 'bad' : '', 2);
    if (over) push('스레드를 교대할 때마다 운영체제는 하던 스레드의 상태를 저장하고 다음 스레드의 상태를 불러옵니다. ' + (io ? '처리량이 코어 ' + C + '개 분량(초당 ' + tput + '건)에서 멈추므로, 외부 응답을 기다리는 스레드는 평균 ' + Math.round(tput * waitT) + '개뿐이고 나머지 ' + Math.round(busy) + '개는 CPU를 쓰려는 상태(코어에서 실행 중이거나 차례를 기다림)입니다. ' : '') + '코어 하나를 스레드 약 ' + (Math.round(share * 10) / 10) + '개가 나눠 쓰므로, 각 스레드는 자기 차례가 아닌 동안 멈춰 있습니다. 전체가 하는 일의 양은 코어 ' + C + '개 분량 그대로이고, 각자의 작업이 끝나는 시간만 길어집니다.', 'bad', 3);
    else push('실행하려는 스레드가 코어 수 이하라서 서로 기다릴 일이 없습니다.', 'good', 3);
    push('결과: CPU 사용률 ' + util + '%, 초당 ' + tput + '건 처리, 작업 하나는 ' + lat + '초 만에 끝납니다' + (over ? '(혼자 실행하면 ' + baseLat + '초).' : '.') + (T !== best ? ' 스레드를 ' + best + '개로 맞추면 초당 ' + Math.round(C / taskCpu) + '건, 작업 하나 ' + baseLat + '초입니다.' : ' 이 작업에 가장 알맞은 스레드 수입니다.'), T === best ? 'good' : '', 4);
    if (!io) sum.push(over ? '계산 위주 작업은 코어 수보다 스레드를 많이 둬도 처리량이 늘지 않습니다. 코어를 나눠 쓰느라 작업 하나하나가 늦게 끝날 뿐입니다. 스레드마다 메모리(스택)도 따로 쓰므로, 스레드 수는 코어 수 근처가 적당합니다.' : T < C ? '코어가 남아 있습니다. 스레드를 코어 수(' + C + '개)까지 늘리면 처리량이 늘어납니다.' : '스레드 수가 코어 수와 같아 모든 코어를 기다림 없이 씁니다.');
    else sum.push(want < C - 1e-9 ? '기다림 위주 작업에서는 스레드가 대부분 대기 중이라 코어가 놉니다. 스레드를 코어 수보다 훨씬 많이 둬야 CPU를 다 씁니다. 적정 수는 대략 코어 수 × (1 + 대기 시간 ÷ 계산 시간), 여기서는 ' + C + ' × (1 + 9) = ' + best + '개입니다.' : over ? 'CPU를 쓰려는 스레드가 이미 코어 수를 넘었습니다. 여기서 더 늘려도 처리량은 그대로이고 스레드당 메모리와 응답 시간만 늘어납니다.' : '기다리는 시간을 다른 스레드가 채워 모든 코어가 쓰이고 있습니다.');
    sum.push('웹 서버의 요청 처리 스레드가 코어 수보다 훨씬 많은(스프링 부트의 내장 톰캣은 기본 설정에서 최대 200개, server.tomcat.threads.max) 이유는 요청 처리의 대부분이 DB나 외부 응답을 기다리는 시간이기 때문입니다.');
    return { events: ev, summary: sum, k: { want: busy, over: over, share: share, used: used, tput: tput, util: util, best: best, lat: lat }, row: [tput + '건', util + '%', lat + '초', best + '개'] };
  },
  render: function (v, sim, t, H, shown) {
    var c = sim.c, k = sim.k, last = shown[shown.length - 1], st = last ? last.snap.stage : 0;
    H.counters(v, [[st >= 2 ? (Math.round(k.want * 10) / 10) + '개' : '?', 'CPU를 쓰려는 스레드 (평균)'], [st >= 4 ? k.util + '%' : '?', 'CPU 사용률'], [st >= 4 ? k.tput + '건' : '?', '초당 처리량'], [st >= 4 ? k.lat + '초' : '?', '작업 하나가 끝나는 시간']]);
    H.title(v, 'CPU 코어'); var ln = H.lanes(v), per = k.want / c.core;
    for (var i = 0; i < c.core; i++) { if (st < 2) { H.lane(ln, '코어 ' + (i + 1), '', 'none'); continue; } var load = Math.min(1, per); H.lane(ln, '코어 ' + (i + 1), per > 1 + 1e-9 ? '스레드 약 ' + (Math.round(per * 10) / 10) + '개가 번갈아 사용' : per >= 0.999 ? '스레드 1개가 계속 사용' : '사용률 ' + Math.round(load * 100) + '% (나머지는 놀고 있음)', per > 1 + 1e-9 ? 'bad' : per >= 0.999 ? 'good' : '', load); }
    H.title(v, '스레드 ' + c.th + '개의 상태 (한순간의 모습)'); var run = Math.min(c.th, Math.round(k.used)), waitCpu = Math.max(0, Math.round(k.want) - run), items = [];
    for (var j = 0; j < c.th; j++) items.push(['', j < run ? 'd' : j < run + waitCpu ? 'r' : 'q']);
    H.slots(v, st >= 2 ? items : [], '', true);
    H.text(v, '초록은 지금 코어에서 실행 중, 빨강은 실행하고 싶지만 코어를 기다리는 중, 파랑은 외부 응답을 기다리는 중(CPU 불필요)인 스레드입니다.');
  },
  assume: '작업 하나가 CPU를 0.1초 쓴다고 가정한 모형입니다. 검증 환경(논리 코어 12개)의 JDK 21에서 실제로 잰 결과와 방향이 같습니다. 계산 위주 작업은 스레드 1개 초당 102건, 6개 562건, 12개 768건, 24개 820건, 48개 826건으로 코어 수 부근에서 더 늘지 않았습니다. 기다림 위주 작업(계산 1ms + 대기 9ms)은 스레드 12개 1,104건, 48개 4,417건, 120개 7,871건, 240개 8,202건, 480개 8,144건으로 코어 수의 10배 부근까지 늘다가 멈췄습니다. 스레드가 코어보다 훨씬 많아도 처리량이 눈에 띄게 줄지는 않았습니다. 교대 자체의 비용은 이 측정에서 드러나지 않을 만큼 작았고, 그래서 모형에도 처리량 감소를 넣지 않았습니다. 실측에서 코어 수만큼 정확히 비례하지 않는 것은 논리 코어 12개가 물리 코어 6개를 나눠 쓰기 때문입니다. 적정 스레드 수의 식은 자바 동시성 분야에서 널리 인용되는 기준입니다.',
});

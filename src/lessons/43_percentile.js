Lab.register({
  id: 'pct', nav: '평균과 백분위', cat: '모니터링', mode: 'step',
  title: '평균 응답 시간은 멀쩡한데 왜 느리다는 불만이 오나',
  intro: '요청 1,000건의 응답 시간을 모았습니다. 대부분은 0.1초 안팎이지만 일부가 아주 느립니다. 느린 요청의 비율과 정도를 바꿔 가며, 평균과 백분위(p50, p95, p99)가 각각 무엇을 보여 주고 무엇을 숨기는지 확인하세요.',
  terms: ['TPS와 응답 시간 백분위', '부하 테스트', 'APM', '관측성(로그, 지표, 추적)'], ranks: ['monitor', 'tuning', 'traffic'],
  controls: [
    { id: 'ratio', label: '느린 요청의 비율', type: 'select', value: '2', options: [['0', '없음'], ['0.5', '0.5% (1,000건 중 5건)'], ['2', '2% (20건)'], ['6', '6% (60건)'], ['20', '20% (200건)']] },
    { id: 'slow', label: '느린 요청 하나의 응답 시간', type: 'select', value: '3', options: [['1', '1초'], ['3', '3초'], ['10', '10초']], show: function (c) { return c.ratio !== '0'; } },
  ],
  presets: [
    { t: '처음 설정으로', d: '2%가 3초. 평균은 0.16초로 괜찮아 보이지만 p99는 3초입니다.', v: { ratio: '2', slow: '3' } },
    { t: '느린 요청이 없을 때', d: '평균, 중앙값, p99가 거의 같습니다.', v: { ratio: '0', slow: '3' } },
    { t: '0.5%만 느릴 때', d: 'p99에도 잡히지 않습니다. 최댓값이나 p99.9를 봐야 보입니다.', v: { ratio: '0.5', slow: '10' } },
    { t: '6%가 느릴 때', d: 'p95부터 튀어 오릅니다.', v: { ratio: '6', slow: '3' } },
    { t: '20%가 10초', d: '평균이 2초가 됐지만, 그런 응답을 받은 사용자는 한 명도 없습니다.', v: { ratio: '20', slow: '10' } },
  ],
  code: function () {
    return '// Micrometer: 응답 시간의 백분위를 함께 기록\nTimer.builder("http.server.requests")\n    .publishPercentiles(0.5, 0.95, 0.99)\n    .register(registry);\n\n# application.yml\nmanagement.metrics.distribution.percentiles:\n  http.server.requests: 0.5, 0.95, 0.99';
  },
  label: function (c) { return c.ratio === '0' ? '느린 요청 없음' : '느린 요청 ' + c.ratio + '% · ' + c.slow + '초'; },
  columns: ['평균', 'p50 (중앙값)', 'p95', 'p99', '최댓값'],
  simulate: function (c) {
    var N = 1000, nSlow = Math.round(N * (+c.ratio) / 100), slow = +c.slow, data = [], ev = [], sum = [];
    for (var i = 0; i < N - nSlow; i++) data.push(0.08 + 0.04 * (i / Math.max(1, N - nSlow - 1)));   // 0.08초 ~ 0.12초
    for (var j = 0; j < nSlow; j++) data.push(slow);
    data.sort(function (a, b) { return a - b; });
    function pct(q) { return data[Math.max(0, Math.ceil(q * N) - 1)]; }
    var mean = data.reduce(function (a, b) { return a + b; }, 0) / N, k = { mean: mean, p50: pct(0.5), p95: pct(0.95), p99: pct(0.99), p999: pct(0.999), max: data[N - 1], nSlow: nSlow, slow: slow };
    var f = function (x) { return (Math.round(x * 100) / 100).toFixed(2) + '초'; };
    function push(s, kd, stage) { ev.push({ s: s, k: kd, snap: { stage: stage } }); }
    push('요청 1,000건의 응답 시간을 모았습니다. ' + (N - nSlow) + '건은 0.08~0.12초, ' + nSlow + '건은 ' + slow + '초입니다.', '', 1);
    push('평균: 모든 응답 시간을 더해 1,000으로 나누면 ' + f(mean) + '입니다.' + (nSlow ? ' 빠른 요청이 훨씬 많아서 느린 요청의 존재가 평균에 묻힙니다. 그리고 실제로 ' + f(mean) + '만에 응답받은 요청은 하나도 없습니다.' : ''), nSlow ? 'bad' : '', 2);
    push('p50(중앙값): 응답 시간을 빠른 순으로 줄 세웠을 때 500번째 값은 ' + f(k.p50) + '입니다. "절반의 요청은 이 시간 안에 끝났다"는 뜻입니다. 보통의 사용자가 겪는 속도입니다.', '', 3);
    push('p95: 950번째 값은 ' + f(k.p95) + '입니다. "95%의 요청은 이 시간 안에 끝났고, 나머지 5%는 이보다 느렸다"는 뜻입니다.', k.p95 > 0.5 ? 'bad' : '', 4);
    push('p99: 990번째 값은 ' + f(k.p99) + '입니다. "99%의 요청은 이 시간 안에 끝났고, 가장 느린 1%만 이보다 느렸다"는 뜻입니다.' + (k.p99 > 0.5 ? ' 평균으로는 보이지 않던 느린 요청이 여기서 드러납니다.' : nSlow ? ' 느린 요청이 전체의 1%보다 적어서 p99에도 잡히지 않았습니다.' : ''), k.p99 > 0.5 ? 'bad' : '', 5);
    push('최댓값은 ' + f(k.max) + ', p99.9(999번째 값)는 ' + f(k.p999) + '입니다. 하루 요청이 100만 건이라면 ' + (nSlow ? '이 비율로 약 ' + String(Math.round(1e6 * nSlow / N)).replace(/\B(?=(\d{3})+(?!\d))/g, ',') + '건이 ' + slow + '초씩 걸린다는 뜻입니다.' : '느린 요청은 없습니다.'), nSlow ? 'bad' : 'good', 6);
    sum.push('평균 ' + f(mean) + ', p50 ' + f(k.p50) + ', p95 ' + f(k.p95) + ', p99 ' + f(k.p99) + ', 최댓값 ' + f(k.max) + '.');
    if (nSlow) sum.push('평균은 소수의 느린 요청을 가립니다. 응답 시간은 대부분 빠르고 일부만 매우 느린 치우친 분포라서, 평균이 "대표적인 경험"을 나타내지 못합니다. 그래서 성능 목표는 "평균 0.2초"가 아니라 "p99가 1초 이하"처럼 백분위로 정합니다.');
    if (nSlow && k.p99 < 0.5) sum.push('느린 요청이 1% 미만이면 p99도 조용합니다. 요청이 많은 서비스에서는 0.5%도 큰 숫자이므로 p99.9나 최댓값도 함께 봅니다.');
    sum.push('사용자 한 명이 화면 하나를 볼 때 여러 API를 호출하므로, 그중 하나라도 느린 쪽에 걸릴 확률은 개별 요청의 비율보다 높습니다. 꼬리 쪽 지연이 체감 속도를 좌우하는 이유입니다.');
    return { events: ev, summary: sum, k: k, row: [f(mean), f(k.p50), f(k.p95), f(k.p99), f(k.max)] };
  },
  render: function (v, sim, t, H, shown) {
    var k = sim.k, last = shown[shown.length - 1], st = last ? last.snap.stage : 0, mx = Math.max(k.max, 0.2), f = function (x) { return (Math.round(x * 100) / 100).toFixed(2) + '초'; };
    H.title(v, '응답 시간 분포 (1칸 = 요청 20건, 빠른 순)'); var it = [];
    for (var i = 0; i < 50; i++) { var slowIn = Math.max(0, Math.min(20, (i + 1) * 20 - (1000 - k.nSlow))); it.push([slowIn ? String(k.slow) : '0.1', slowIn >= 10 ? 'r' : slowIn > 0 ? 'b' : 'd']); }
    H.slots(v, st >= 1 ? it : [], '실행을 누르면 채워집니다.', true);
    H.text(v, '초록은 빠른 요청, 빨강은 느린 요청이 대부분인 칸, 노랑은 느린 요청이 일부 섞인 칸입니다.');
    var ln = H.lanes(v), rows = [['평균', k.mean, 2], ['p50', k.p50, 3], ['p95', k.p95, 4], ['p99', k.p99, 5], ['최댓값', k.max, 6]];
    rows.forEach(function (r) { if (st >= r[2]) H.lane(ln, r[0], f(r[1]), r[1] > 0.5 ? 'bad' : 'good', Math.max(0.01, r[1] / mx)); else H.lane(ln, r[0], '?', 'none'); });
  },
  assume: '요청 1,000건의 고정된 가상 데이터입니다. 백분위는 값을 작은 순으로 줄 세워 해당 순번의 값을 취하는 방식(최근접 순위법)으로 계산했습니다. 실제 모니터링 도구는 모든 값을 저장하지 않고 구간별 개수로 근사하므로 약간의 오차가 있고, 여러 서버의 백분위를 평균 내는 것은 올바른 계산이 아닙니다. 같은 데이터로 평균과 백분위를 자바에서 따로 계산해 화면의 값과 일치하는 것을 확인했습니다.',
});

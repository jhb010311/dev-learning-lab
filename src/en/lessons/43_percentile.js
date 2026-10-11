Lab.register({
  id: 'pct', nav: 'Averages and percentiles', cat: 'Monitoring', mode: 'step',
  title: 'The average response time looks fine, so why do users complain that it is slow?',
  intro: 'The response times of 1,000 requests were collected. Most take about 0.1 seconds, but a few are very slow. The average is the sum of all the values divided by their number, and a percentile is the value at a given percentage point when the values are lined up in order (p99 is the value at the 99% point). This lab shows the same data as an average and as percentiles, and which of them reveals the slow requests.',
  terms: ['TPS and response time percentiles', 'Load testing', 'APM', 'Observability (logs, metrics, traces)'], ranks: ['monitor', 'tuning', 'traffic'],
  controls: [
    { id: 'ratio', label: 'Share of slow requests', type: 'select', value: '2', options: [['0', 'None'], ['0.5', '0.5% (5 of 1,000 requests)'], ['2', '2% (20 requests)'], ['6', '6% (60 requests)'], ['20', '20% (200 requests)']] },
    { id: 'slow', label: 'Response time of each slow request', type: 'select', value: '3', options: [['1', '1 second'], ['3', '3 seconds'], ['10', '10 seconds']], show: function (c) { return c.ratio !== '0'; } },
  ],
  presets: [
    { t: 'Default settings', d: '2% take 3s. The average looks fine at 0.16s, but p99 is 3s.', v: { ratio: '2', slow: '3' } },
    { t: 'When there are no slow requests', d: 'The average, the median, and p99 are almost the same.', v: { ratio: '0', slow: '3' } },
    { t: 'When only 0.5% are slow', d: 'Not even p99 catches them. You have to look at the maximum or p99.9 to see them.', v: { ratio: '0.5', slow: '10' } },
    { t: 'When 6% are slow', d: 'p95 is the first to jump.', v: { ratio: '6', slow: '3' } },
    { t: '20% take 10s', d: 'The average becomes 2s, but not a single user received a response like that.', v: { ratio: '20', slow: '10' } },
  ],
  code: function () {
    return '// Micrometer: also record percentiles of the response time\nTimer.builder("http.server.requests")\n    .publishPercentiles(0.5, 0.95, 0.99)\n    .register(registry);\n\n# application.yml\nmanagement.metrics.distribution.percentiles:\n  http.server.requests: 0.5, 0.95, 0.99';
  },
  label: function (c) { return c.ratio === '0' ? 'No slow requests' : 'Slow requests: ' + c.ratio + '% · ' + c.slow + 's'; },
  columns: ['Average', 'p50 (median)', 'p95', 'p99', 'Maximum'],
  simulate: function (c) {
    var N = 1000, nSlow = Math.round(N * (+c.ratio) / 100), slow = +c.slow, data = [], ev = [], sum = [];
    for (var i = 0; i < N - nSlow; i++) data.push(0.08 + 0.04 * (i / Math.max(1, N - nSlow - 1)));   // 0.08s to 0.12s
    for (var j = 0; j < nSlow; j++) data.push(slow);
    data.sort(function (a, b) { return a - b; });
    function pct(q) { return data[Math.max(0, Math.ceil(q * N) - 1)]; }
    var mean = data.reduce(function (a, b) { return a + b; }, 0) / N, k = { mean: mean, p50: pct(0.5), p95: pct(0.95), p99: pct(0.99), p999: pct(0.999), max: data[N - 1], nSlow: nSlow, slow: slow };
    var f = function (x) { return (Math.round(x * 100) / 100).toFixed(2) + 's'; };
    function push(s, kd, stage) { ev.push({ s: s, k: kd, snap: { stage: stage } }); }
    push('The response times of 1,000 requests were collected. Of these, ' + (N - nSlow) + ' took 0.08s to 0.12s, and ' + nSlow + ' took ' + slow + 's.', '', 1);
    push('Average: adding up all the response times and dividing by 1,000 gives ' + f(mean) + '.' + (nSlow ? ' There are far more fast requests, so the slow ones are buried in the average. And not a single request actually got its response in ' + f(mean) + '.' : ''), nSlow ? 'bad' : '', 2);
    push('p50 (median): when the response times are lined up from fastest to slowest, the 500th value is ' + f(k.p50) + '. It means "half of the requests finished within this time". This is the speed a typical user experiences.', '', 3);
    push('p95: the 950th value is ' + f(k.p95) + '. It means "95% of the requests finished within this time, and the other 5% were slower".', k.p95 > 0.5 ? 'bad' : '', 4);
    push('p99: the 990th value is ' + f(k.p99) + '. It means "99% of the requests finished within this time, and only the slowest 1% were slower".' + (k.p99 > 0.5 ? ' The slow requests that the average could not show appear here.' : nSlow ? ' The slow requests are less than 1% of the total, so even p99 did not catch them.' : ''), k.p99 > 0.5 ? 'bad' : '', 5);
    push('The maximum is ' + f(k.max) + ', and p99.9 (the 999th value) is ' + f(k.p999) + '. If there are 1,000,000 requests a day, ' + (nSlow ? 'about ' + String(Math.round(1e6 * nSlow / N)).replace(/\B(?=(\d{3})+(?!\d))/g, ',') + ' of them would take ' + slow + 's each at this ratio.' : 'there are no slow requests.'), nSlow ? 'bad' : 'good', 6);
    if (nSlow) sum.push('The average hides a small number of slow requests. Response times follow a skewed distribution, where most are fast and only a few are very slow, so the average does not represent the "typical experience". That is why performance goals are set with percentiles, such as "p99 is 1s or less", instead of "an average of 0.2s".');
    if (nSlow && k.p99 < 0.5) sum.push('When fewer than 1% of the requests are slow, p99 stays quiet too. In a service with many requests, even 0.5% is a large number, so also look at p99.9 and the maximum.');
    sum.push('A user looking at one screen triggers several API calls, so the chance of hitting a slow one among them is higher than the share of slow individual requests. That is why the delay in the tail decides how fast the service feels.');
    return { events: ev, summary: sum, k: k, row: [f(mean), f(k.p50), f(k.p95), f(k.p99), f(k.max)] };
  },
  render: function (v, sim, t, H, shown) {
    var k = sim.k, last = shown[shown.length - 1], st = last ? last.snap.stage : 0, mx = Math.max(k.max, 0.2), f = function (x) { return (Math.round(x * 100) / 100).toFixed(2) + 's'; };
    H.title(v, 'Response time distribution (1 cell = 20 requests, fastest first)'); var it = [];
    for (var i = 0; i < 50; i++) { var slowIn = Math.max(0, Math.min(20, (i + 1) * 20 - (1000 - k.nSlow))); it.push([slowIn ? String(k.slow) : '0.1', slowIn >= 10 ? 'r' : slowIn > 0 ? 'b' : 'd']); }
    H.slots(v, st >= 1 ? it : [], 'Click Run to fill it in.', true);
    H.text(v, 'Green cells are fast requests, red cells are mostly slow requests, and yellow cells have some slow requests mixed in.');
    var ln = H.lanes(v), rows = [['Average', k.mean, 2], ['p50', k.p50, 3], ['p95', k.p95, 4], ['p99', k.p99, 5], ['Maximum', k.max, 6]];
    rows.forEach(function (r) { if (st >= r[2]) H.lane(ln, r[0], f(r[1]), r[1] > 0.5 ? 'bad' : 'good', Math.max(0.01, r[1] / mx)); else H.lane(ln, r[0], '?', 'none'); });
  },
  assume: 'This is fixed, made-up data of 1,000 requests. Percentiles were calculated by lining the values up from smallest to largest and taking the value at that rank (the nearest-rank method). Real monitoring tools do not store every value but approximate with counts per range, so there is a small error, and averaging the percentiles of several servers is not a correct calculation. The average and the percentiles were calculated separately in Java from the same data, and they were confirmed to match the values on the screen.',
});

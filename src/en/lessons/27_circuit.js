Lab.register({
  id: 'circuit', nav: 'Circuit breaker', cat: 'Microservices', mode: 'step',
  title: 'If you keep calling a dead service, you go down too',
  intro: 'The order service calls the payment service once per second. Partway through, the payment service stops responding for a while. When the failure rate goes over a set level, a circuit breaker blocks the calls themselves. This stops threads from being tied up waiting for a service that does not respond.',
  terms: ['Circuit breaker', 'Monolithic architecture and microservice architecture', 'Bottleneck'], ranks: ['msa', 'traffic'],
  controls: [
    { id: 'use', label: 'Use a circuit breaker', type: 'check', value: true },
    { id: 'th', label: 'Failure rate threshold (based on the last 10 calls)', type: 'select', value: '50', options: [['30', '30%'], ['50', '50%'], ['80', '80%']], show: function (c) { return c.use; } },
    { id: 'wait', label: 'How long the circuit stays open', type: 'select', value: '5', options: [['3', '3s'], ['5', '5s'], ['10', '10s']], show: function (c) { return c.use; } },
    { id: 'dur', label: 'How long the payment service outage lasts', type: 'select', value: '15', options: [['5', '5s'], ['15', '15s'], ['25', '25s']] },
  ],
  presets: [
    { t: 'Default settings', d: 'A 15s outage. When failures pile up, calls are blocked, and the circuit periodically tests whether the service has recovered.', v: { use: true, th: '50', wait: '5', dur: '15' } },
    { t: 'Without a circuit breaker', d: 'For the whole outage, every call waits 3s and then fails.', v: { use: false, th: '50', wait: '5', dur: '15' } },
    { t: 'Lower the threshold', d: '30%. It blocks calls sooner.', v: { use: true, th: '30', wait: '5', dur: '15' } },
    { t: 'A long open duration', d: '10s. Calls stay blocked for a while even after the outage ends.', v: { use: true, th: '50', wait: '10', dur: '15' } },
    { t: 'A short outage', d: '5s. See whether it reaches the threshold.', v: { use: true, th: '80', wait: '5', dur: '5' } },
  ],
  code: function (c) {
    if (!c.use) return 'PaymentResult pay(Order order) {\n    return paymentClient.pay(order);     // times out after 3s if there is no response\n}';
    return '# application.yml (Resilience4j)\nresilience4j.circuitbreaker.instances.payment:\n  slidingWindowSize: 10                 # decide from the results of the last 10 calls\n  minimumNumberOfCalls: 10\n  failureRateThreshold: ' + c.th + '              # open the circuit when the failure rate is at or above this value\n  waitDurationInOpenState: ' + c.wait + 's          # how long the circuit stays open\n  permittedNumberOfCallsInHalfOpenState: 3\n\n@CircuitBreaker(name = "payment", fallbackMethod = "payLater")\nPaymentResult pay(Order order) {\n    return paymentClient.pay(order);     // times out after 3s if there is no response\n}\n\nPaymentResult payLater(Order order, Throwable t) {\n    return PaymentResult.pending();      // runs instead when calls are blocked\n}';
  },
  label: function (c) { return (c.use ? 'enabled · threshold ' + c.th + '% · open ' + c.wait + 's' : 'no circuit breaker') + ' · outage ' + c.dur + 's'; },
  columns: ['Successes', 'Failures (waited 3s each)', 'Blocked (immediate fallback)', 'Time spent waiting', 'State transitions'],
  simulate: function (c) {
    var N = 40, downFrom = 11, downTo = 10 + (+c.dur), th = +c.th, wait = +c.wait, ev = [], calls = [], state = 'CLOSED', win = [], openedAt = 0, trial = [], trans = [], okN = 0, failN = 0, blockN = 0;
    function snap() { return { calls: calls.slice(), state: state, rate: win.length ? Math.round(win.filter(function (x) { return !x; }).length / win.length * 100) : 0, wn: win.length }; }
    function push(s, k) { ev.push({ s: s, k: k, snap: snap() }); }
    for (var t = 1; t <= N; t++) {
      var down = t >= downFrom && t <= downTo, msg = t + 's: ';
      if (c.use && state === 'OPEN' && t - openedAt >= wait) { state = 'HALF_OPEN'; trial = []; trans.push('HALF_OPEN'); msg += 'It has been ' + wait + 's since the calls were blocked. To check whether the service has recovered, a few calls are let through as a trial (HALF_OPEN). '; }
      if (c.use && state === 'OPEN') { blockN++; calls.push('q'); push(msg + 'The circuit is open (OPEN). The call is not sent to the payment service, and a fallback response is returned immediately. There is no waiting time.', ''); continue; }
      var ok = !down; if (ok) okN++; else failN++; calls.push(ok ? 'd' : 'r');
      msg += ok ? 'The call to the payment service succeeded.' : 'The payment service does not respond. The call waits 3s and fails with a timeout. During that time, one request thread was tied up.';
      if (!c.use) { push(msg, ok ? '' : 'bad'); continue; }
      if (state === 'HALF_OPEN') {
        trial.push(ok);
        if (trial.length === 3) { var fr = trial.filter(function (x) { return !x; }).length / 3 * 100;
          if (fr >= th) { state = 'OPEN'; openedAt = t; trans.push('OPEN'); push(msg + ' The failure rate of the 3 trial calls is ' + Math.round(fr) + '%, at or above the threshold. The service is judged not recovered yet, so calls are blocked again (OPEN).', 'bad'); }
          else { state = 'CLOSED'; win = []; trans.push('CLOSED'); push(msg + ' The failure rate of the 3 trial calls is ' + Math.round(fr) + '%, below the threshold. The service is judged recovered, and the circuit returns to the normal state (CLOSED).', 'good'); }
        } else push(msg + ' Trial call ' + trial.length + '/3.', ok ? '' : 'bad');
        continue;
      }
      win.push(ok); if (win.length > 10) win.shift();
      var rate = win.filter(function (x) { return !x; }).length / win.length * 100;
      if (win.length >= 10 && rate >= th) { state = 'OPEN'; openedAt = t; trans.push('OPEN'); push(msg + ' Among the last 10 calls, the failure rate became ' + Math.round(rate) + '%, at or above the threshold of ' + th + '%. The circuit opens (OPEN). For the next ' + wait + 's, calls to the payment service are blocked.', 'bad'); }
      else push(msg + (win.length >= 10 || !ok ? ' Calls in the window: ' + win.length + ', failure rate ' + Math.round(rate) + '%.' : ''), ok ? '' : 'bad');
    }
    var waitT = failN * 3, sum = [];
    if (!c.use) sum.push('While the outage lasted, every call held a thread for 3s. With many requests, the thread pool runs out quickly, and even features unrelated to payment can no longer respond. The failure of one service spreads to the service that calls it.');
    else if (!trans.length) sum.push('The failure rate never reached the threshold, so the circuit never opened. This happens when the outage is short or the threshold is high.');
    else sum.push('The state changed in the order ' + ['CLOSED'].concat(trans).join(' → ') + '. While the circuit is open, calls are not made and a fallback response is returned right away, so no threads are tied up. The failing service is not put under extra load either, which gives it room to recover. After a set time, only a few calls are sent to check whether it has recovered.');
    if (c.use && blockN) sum.push('If the open duration is long, normal calls stay blocked for a while even after the service has recovered. If it is short, you test a service that has not recovered too often. Adjust the threshold and the open duration to the characteristics of the service.');
    return { events: ev, summary: sum, downFrom: downFrom, downTo: downTo, row: [String(okN), String(failN), String(blockN), waitT + 's', trans.length ? ['CLOSED'].concat(trans).join(' → ') : 'None'] };
  },
  render: function (v, sim, t, H, shown) {
    var c = sim.c, last = shown[shown.length - 1], s = last ? last.snap : { calls: [], state: 'CLOSED', rate: 0, wn: 0 }, n = s.calls.length;
    var cnt = function (k) { return s.calls.filter(function (x) { return x === k; }).length; };
    H.counters(v, [[c.use ? s.state : '(none)', 'Circuit state'], [cnt('d'), 'Successes'], [cnt('r'), 'Failures (3s wait)'], [cnt('q'), 'Blocked (immediate)'], [cnt('r') * 3 + 's', 'Time waited']]);
    var ln = H.lanes(v), down = n >= sim.downFrom && n <= sim.downTo;
    H.lane(ln, 'Payment service', n === 0 ? 'Normal' : down ? 'Outage (no response)' : 'Normal', down ? 'bad' : 'good');
    if (c.use) H.lane(ln, 'Circuit', s.state === 'CLOSED' ? 'CLOSED: lets calls pass through · calls in the window: ' + s.wn + ', failure rate ' + s.rate + '%' : s.state === 'OPEN' ? 'OPEN: blocks calls and returns a fallback right away' : 'HALF_OPEN: lets only a few trial calls through', s.state === 'OPEN' ? 'bad' : s.state === 'HALF_OPEN' ? 'hot' : '', s.state === 'CLOSED' ? s.rate / 100 : undefined);
    H.text(v, 'Green is a success, red is a call that waited 3s and failed, and blue is a call that the circuit blocked with an immediate fallback response. The outage runs from second ' + sim.downFrom + ' to second ' + sim.downTo + '.');
  },
  // Diagram: The circuit sits between the order service and the payment service. When it is closed, calls pass through, and when it is open, calls turn back at the circuit.
  draw: function (P, sim, shown) {
    var c = sim.c, last = shown[shown.length - 1], s = last ? last.snap : { calls: [], state: 'CLOSED', rate: 0, wn: 0 }, n = s.calls.length, k = s.calls[n - 1], down = n >= sim.downFrom && n <= sim.downTo;
    P.size(680, 300);
    P.box('a', 16, 30, 170, 60, { cls: 'wait', title: 'Order service', sub: 'Calls payment' });
    P.box('cb', 255, 30, 170, 60, c.use ? { cls: s.state === 'OPEN' ? 'bad' : s.state === 'HALF_OPEN' ? 'hot' : 'good', title: 'Circuit: ' + s.state, sub: s.state === 'OPEN' ? 'Blocking calls' : s.state === 'HALF_OPEN' ? 'Trial calls only' : 'Failure rate ' + s.rate + '%' } : { cls: 'ghost', title: 'No circuit breaker', sub: 'Calls pass through' });
    P.box('p', 494, 30, 170, 60, { cls: down ? 'bad' : 'good', title: 'Payment service', sub: down ? 'Outage: no response' : 'Normal' });
    if (k) { P.arrow('c1', 'a:r', 'cb:l', { cls: k === 'd' ? 'good' : 'bad', label: k === 'q' ? 'Immediate fallback' : '' }); if (k !== 'q') P.arrow('c2', 'cb:r', 'p:l', { cls: k === 'd' ? 'good' : 'bad', label: k === 'r' ? '3s wait, then failure' : 'Success' }); }
    P.region('tl', 16, 118, 648, 104, 'Results of the 40 calls (1 box = 1 call per second)');
    for (var i = 0; i < 40; i++) { var x = s.calls[i]; P.box('call' + i, 28 + (i % 20) * 31.2, 152 + Math.floor(i / 20) * 30, 27, 24, { cls: (x === 'd' ? 'good' : x === 'r' ? 'bad' : x === 'q' ? 'wait' : 'ghost') + (i === n - 1 ? ' now' : ''), sub: String(i + 1), center: true }); }
    var wait = s.calls.filter(function (x) { return x === 'r'; }).length * 3;
    P.box('w', 16, 238, 648, 34, { cls: wait > 15 ? 'bad' : 'plain', title: 'Time spent waiting for failures', right: wait + 's' });
    P.note('Green is a success, red is a call that waited 3s and failed, and blue is a call that the circuit blocked and answered with an immediate fallback response. When the circuit is open, the arrow does not go all the way to the payment service. It turns back at the circuit.');
  },
  assume: 'This follows the behavior of Resilience4j with a count-based sliding window (the last 10 calls). All 27 combinations that use the circuit breaker were fed, in the same call order, to a real Resilience4j 2.4.0 circuit breaker (advancing the clock by 1 second at a time), and the numbers of successes, failures, and blocked calls and the order of state transitions were confirmed to match the screen. There is one difference. Resilience4j lets calls through as trial calls only after the wait duration has fully passed, so a call that arrives at exactly the same moment as the end of the wait duration is still blocked. The screen shows the result of treating the call as arriving a tiny bit after that moment. The circuit opens when the failure rate is at or above the threshold, and after the set time, the results of 3 trial calls decide whether to close it or open it again. It is simplified so that calls are made once per second and a service in an outage always fails with a 3s timeout. In real use, you can also use the slow call rate as a criterion, and there is a time-based sliding window too.',
});

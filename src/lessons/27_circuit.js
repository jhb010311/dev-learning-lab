Lab.register({
  id: 'circuit', nav: '서킷 브레이커', cat: 'MSA', mode: 'step',
  title: '죽은 서비스를 계속 부르면 나까지 죽는다',
  intro: '주문 서비스가 결제 서비스를 1초에 한 번씩 호출합니다. 도중에 결제 서비스가 한동안 응답하지 않습니다. 서킷 브레이커는 실패가 일정 비율을 넘으면 호출 자체를 막아서, 응답 없는 서비스를 기다리느라 스레드가 묶이는 것을 끊어 줍니다.',
  terms: ['서킷 브레이커', '모놀리식과 MSA(마이크로서비스)', '병목(Bottleneck)'], ranks: ['msa', 'traffic'],
  controls: [
    { id: 'use', label: '서킷 브레이커를 쓴다', type: 'check', value: true },
    { id: 'th', label: '실패율 임계치 (최근 10번 기준)', type: 'select', value: '50', options: [['30', '30%'], ['50', '50%'], ['80', '80%']], show: function (c) { return c.use; } },
    { id: 'wait', label: '차단을 유지하는 시간', type: 'select', value: '5', options: [['3', '3초'], ['5', '5초'], ['10', '10초']], show: function (c) { return c.use; } },
    { id: 'dur', label: '결제 서비스 장애가 이어지는 시간', type: 'select', value: '15', options: [['5', '5초'], ['15', '15초'], ['25', '25초']] },
  ],
  presets: [
    { t: '처음 설정으로', d: '장애 15초. 실패가 쌓이면 차단하고, 주기적으로 회복됐는지 떠봅니다.', v: { use: true, th: '50', wait: '5', dur: '15' } },
    { t: '서킷 브레이커가 없다면', d: '장애 내내 매 호출이 3초씩 기다리다 실패합니다.', v: { use: false, th: '50', wait: '5', dur: '15' } },
    { t: '임계치를 낮추면', d: '30%. 더 빨리 차단합니다.', v: { use: true, th: '30', wait: '5', dur: '15' } },
    { t: '차단 시간을 길게', d: '10초. 장애가 풀린 뒤에도 한동안 막혀 있습니다.', v: { use: true, th: '50', wait: '10', dur: '15' } },
    { t: '짧은 장애', d: '5초. 임계치에 닿는지 보세요.', v: { use: true, th: '80', wait: '5', dur: '5' } },
  ],
  code: function (c) {
    if (!c.use) return 'PaymentResult pay(Order order) {\n    return paymentClient.pay(order);     // 응답이 없으면 3초 뒤 타임아웃\n}';
    return '# application.yml (Resilience4j)\nresilience4j.circuitbreaker.instances.payment:\n  slidingWindowSize: 10                 # 최근 10번의 결과로 판단\n  minimumNumberOfCalls: 10\n  failureRateThreshold: ' + c.th + '              # 실패율이 이 값 이상이면 차단\n  waitDurationInOpenState: ' + c.wait + 's          # 차단 유지 시간\n  permittedNumberOfCallsInHalfOpenState: 3\n\n@CircuitBreaker(name = "payment", fallbackMethod = "payLater")\nPaymentResult pay(Order order) {\n    return paymentClient.pay(order);     // 응답이 없으면 3초 뒤 타임아웃\n}\n\nPaymentResult payLater(Order order, Throwable t) {\n    return PaymentResult.pending();      // 차단됐을 때 대신 실행\n}';
  },
  label: function (c) { return (c.use ? '사용 · 임계치 ' + c.th + '% · 차단 ' + c.wait + '초' : '서킷 브레이커 없음') + ' · 장애 ' + c.dur + '초'; },
  columns: ['성공', '실패 (3초씩 기다림)', '차단 (즉시 대체 응답)', '기다리는 데 쓴 시간', '상태 전환'],
  simulate: function (c) {
    var N = 40, downFrom = 11, downTo = 10 + (+c.dur), th = +c.th, wait = +c.wait, ev = [], calls = [], state = 'CLOSED', win = [], openedAt = 0, trial = [], trans = [], okN = 0, failN = 0, blockN = 0;
    function snap() { return { calls: calls.slice(), state: state, rate: win.length ? Math.round(win.filter(function (x) { return !x; }).length / win.length * 100) : 0, wn: win.length }; }
    function push(s, k) { ev.push({ s: s, k: k, snap: snap() }); }
    for (var t = 1; t <= N; t++) {
      var down = t >= downFrom && t <= downTo, msg = t + '초: ';
      if (c.use && state === 'OPEN' && t - openedAt >= wait) { state = 'HALF_OPEN'; trial = []; trans.push('HALF_OPEN'); msg += '차단한 지 ' + wait + '초가 지났습니다. 회복됐는지 확인하려고 호출을 몇 번만 시험 삼아 통과시킵니다(HALF_OPEN). '; }
      if (c.use && state === 'OPEN') { blockN++; calls.push('q'); push(msg + '서킷이 열려 있습니다(OPEN). 결제 서비스를 호출하지 않고 즉시 대체 응답을 돌려줍니다. 기다리는 시간이 없습니다.', ''); continue; }
      var ok = !down; if (ok) okN++; else failN++; calls.push(ok ? 'd' : 'r');
      msg += ok ? '결제 서비스 호출 성공.' : '결제 서비스가 응답하지 않습니다. 3초를 기다리다 타임아웃으로 실패합니다. 그동안 요청 스레드 하나가 묶여 있었습니다.';
      if (!c.use) { push(msg, ok ? '' : 'bad'); continue; }
      if (state === 'HALF_OPEN') {
        trial.push(ok);
        if (trial.length === 3) { var fr = trial.filter(function (x) { return !x; }).length / 3 * 100;
          if (fr >= th) { state = 'OPEN'; openedAt = t; trans.push('OPEN'); push(msg + ' 시험 호출 3번의 실패율이 ' + Math.round(fr) + '%로 임계치 이상입니다. 아직 회복되지 않았다고 보고 다시 차단합니다(OPEN).', 'bad'); }
          else { state = 'CLOSED'; win = []; trans.push('CLOSED'); push(msg + ' 시험 호출 3번의 실패율이 ' + Math.round(fr) + '%로 임계치보다 낮습니다. 회복됐다고 보고 정상 상태로 돌아갑니다(CLOSED).', 'good'); }
        } else push(msg + ' 시험 호출 ' + trial.length + '/3.', ok ? '' : 'bad');
        continue;
      }
      win.push(ok); if (win.length > 10) win.shift();
      var rate = win.filter(function (x) { return !x; }).length / win.length * 100;
      if (win.length >= 10 && rate >= th) { state = 'OPEN'; openedAt = t; trans.push('OPEN'); push(msg + ' 최근 10번 중 실패율이 ' + Math.round(rate) + '%로 임계치 ' + th + '% 이상이 됐습니다. 서킷을 엽니다(OPEN). 이제부터 ' + wait + '초 동안 결제 서비스 호출을 막습니다.', 'bad'); }
      else push(msg + (win.length >= 10 || !ok ? ' 최근 ' + win.length + '번의 실패율 ' + Math.round(rate) + '%.' : ''), ok ? '' : 'bad');
    }
    var waitT = failN * 3, sum = ['호출 40번 중 성공 ' + okN + '번, 3초씩 기다리다 실패 ' + failN + '번, 차단되어 즉시 대체 응답 ' + blockN + '번. 응답 없는 서비스를 기다리는 데 쓴 시간은 합계 ' + waitT + '초입니다.'];
    if (!c.use) sum.push('장애가 이어지는 동안 모든 호출이 3초씩 스레드를 붙잡았습니다. 요청이 많으면 스레드 풀이 금방 바닥나고, 결제와 무관한 기능까지 응답하지 못하게 됩니다. 한 서비스의 장애가 호출하는 쪽으로 번지는 것입니다.');
    else if (!trans.length) sum.push('실패율이 임계치에 닿지 않아 서킷이 한 번도 열리지 않았습니다. 장애가 짧거나 임계치가 높으면 이렇게 됩니다.');
    else sum.push('상태가 ' + ['CLOSED'].concat(trans).join(' → ') + ' 순으로 바뀌었습니다. 열려 있는 동안에는 호출하지 않고 바로 대체 응답을 주므로 스레드가 묶이지 않고, 장애 난 서비스에도 부하를 주지 않아 회복할 틈을 줍니다. 일정 시간 뒤에는 소수의 호출만 보내 회복 여부를 확인합니다.');
    if (c.use && blockN) sum.push('차단 시간이 길면 서비스가 회복된 뒤에도 한동안 정상 호출까지 막힙니다. 짧으면 회복되지 않은 서비스를 자주 떠보게 됩니다. 임계치와 차단 시간은 서비스 특성에 맞춰 조정합니다.');
    return { events: ev, summary: sum, downFrom: downFrom, downTo: downTo, row: [okN + '번', failN + '번', blockN + '번', waitT + '초', trans.length ? ['CLOSED'].concat(trans).join(' → ') : '없음'] };
  },
  render: function (v, sim, t, H, shown) {
    var c = sim.c, last = shown[shown.length - 1], s = last ? last.snap : { calls: [], state: 'CLOSED', rate: 0, wn: 0 }, n = s.calls.length;
    var cnt = function (k) { return s.calls.filter(function (x) { return x === k; }).length; };
    H.counters(v, [[c.use ? s.state : '(없음)', '서킷 상태'], [cnt('d'), '성공'], [cnt('r'), '실패 (3초 대기)'], [cnt('q'), '차단 (즉시 응답)'], [cnt('r') * 3 + '초', '기다린 시간']]);
    var ln = H.lanes(v), down = n >= sim.downFrom && n <= sim.downTo;
    H.lane(ln, '결제 서비스', n === 0 ? '정상' : down ? '장애 (응답 없음)' : '정상', down ? 'bad' : 'good');
    if (c.use) H.lane(ln, '서킷', s.state === 'CLOSED' ? 'CLOSED: 호출을 그대로 통과시킴 · 최근 ' + s.wn + '번 실패율 ' + s.rate + '%' : s.state === 'OPEN' ? 'OPEN: 호출을 막고 즉시 대체 응답' : 'HALF_OPEN: 시험 호출 몇 번만 통과', s.state === 'OPEN' ? 'bad' : s.state === 'HALF_OPEN' ? 'hot' : '', s.state === 'CLOSED' ? s.rate / 100 : undefined);
    H.title(v, '호출 40번의 결과 (1칸 = 1초에 1번)'); var items = [];
    for (var i = 0; i < 40; i++) items.push([String(i + 1), (s.calls[i] || '') + (i === n - 1 ? ' now' : '')]);
    H.slots(v, items, null, true);
    H.text(v, '초록은 성공, 빨강은 3초를 기다리다 실패, 파랑은 서킷이 막아서 즉시 대체 응답. 장애 구간은 ' + sim.downFrom + '초부터 ' + sim.downTo + '초까지입니다.');
  },
  // 그림: 주문 서비스와 결제 서비스 사이에 놓인 서킷. 닫혀 있으면 호출이 지나가고, 열리면 서킷에서 바로 되돌아온다.
  draw: function (P, sim, shown) {
    var c = sim.c, last = shown[shown.length - 1], s = last ? last.snap : { calls: [], state: 'CLOSED', rate: 0, wn: 0 }, n = s.calls.length, k = s.calls[n - 1], down = n >= sim.downFrom && n <= sim.downTo;
    P.size(680, 300);
    P.box('a', 16, 30, 170, 60, { cls: 'wait', title: '주문 서비스', sub: '결제를 호출하는 쪽' });
    P.box('cb', 255, 30, 170, 60, c.use ? { cls: s.state === 'OPEN' ? 'bad' : s.state === 'HALF_OPEN' ? 'hot' : 'good', title: '서킷: ' + s.state, sub: s.state === 'OPEN' ? '호출을 막는 중' : s.state === 'HALF_OPEN' ? '시험 호출만 통과' : '실패율 ' + s.rate + '% (최근 ' + s.wn + '번)' } : { cls: 'ghost', title: '서킷 브레이커 없음', sub: '호출이 그대로 지나감' });
    P.box('p', 494, 30, 170, 60, { cls: down ? 'bad' : 'good', title: '결제 서비스', sub: down ? '장애 (응답 없음)' : '정상' });
    if (k) { P.arrow('c1', 'a:r', 'cb:l', { cls: k === 'd' ? 'good' : 'bad', label: k === 'q' ? '즉시 대체 응답' : '' }); if (k !== 'q') P.arrow('c2', 'cb:r', 'p:l', { cls: k === 'd' ? 'good' : 'bad', label: k === 'r' ? '3초 대기 후 실패' : '성공' }); }
    P.region('tl', 16, 118, 648, 104, '호출 40번의 결과 (1칸 = 1초에 1번)');
    for (var i = 0; i < 40; i++) { var x = s.calls[i]; P.box('call' + i, 28 + (i % 20) * 31.2, 152 + Math.floor(i / 20) * 30, 27, 24, { cls: (x === 'd' ? 'good' : x === 'r' ? 'bad' : x === 'q' ? 'wait' : 'ghost') + (i === n - 1 ? ' now' : ''), sub: String(i + 1), center: true }); }
    var wait = s.calls.filter(function (x) { return x === 'r'; }).length * 3;
    P.box('w', 16, 238, 648, 34, { cls: wait > 15 ? 'bad' : 'plain', title: '실패를 기다리느라 쓴 시간', right: wait + '초' });
    P.note('초록은 성공, 빨강은 3초를 기다리다 실패, 파랑은 서킷이 막아 즉시 대체 응답을 준 호출입니다. 서킷이 열리면 화살표가 결제 서비스까지 가지 않고 서킷에서 바로 되돌아옵니다.');
  },
  assume: '호출 횟수 기준 슬라이딩 윈도(최근 10번)를 쓰는 Resilience4j의 동작을 따랐습니다. 서킷 브레이커를 쓰는 27가지 조합 모두를 실제 Resilience4j 2.4.0 서킷 브레이커에 같은 호출 순서로 넣어(시계를 1초씩 돌리는 방식), 성공·실패·차단 횟수와 상태 전환 순서가 화면과 일치하는 것을 확인했습니다. 한 가지 차이가 있습니다. Resilience4j는 차단 시간이 완전히 지난 뒤의 호출부터 시험 호출로 통과시키므로, 호출이 차단 시간과 정확히 같은 시각에 맞물리면 그 호출까지는 차단됩니다. 화면은 호출이 그 시각보다 아주 조금 뒤에 온다고 본 결과입니다. 실패율이 임계치 이상이면 열리고, 정해진 시간 뒤 시험 호출 3번의 결과로 닫을지 다시 열지 정합니다. 호출은 1초에 한 번, 장애 중인 서비스는 항상 3초 타임아웃으로 실패한다고 단순화했습니다. 실제로는 느린 응답 비율도 기준으로 삼을 수 있고, 시간 기준 윈도도 있습니다.',
});

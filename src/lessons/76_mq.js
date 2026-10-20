Lab.register({
  id: 'mq', nav: '메시지 큐 기본', cat: '메시지 큐', mode: 'step',
  title: '직접 부르지 않고 쪽지를 남긴다',
  why: '한 서버가 다른 서버를 직접 호출해 끝날 때까지 기다리면, 상대가 느린 만큼 응답이 늦어지고 상대가 멈춰 있으면 요청까지 실패한다. 메시지 큐는 두 서버 사이에 메시지를 쌓아 두는 곳을 두어, 보내는 쪽은 결과를 기다리지 않고 응답하고 받는 쪽은 멈췄다가 살아난 뒤에 밀린 메시지부터 처리하게 한다.',
  use: '주문 뒤 확인 메일 보내기, 올린 이미지의 썸네일 만들기처럼 응답에 바로 필요하지 않은 뒷일을 넘길 때 쓰며, RabbitMQ, Kafka, Amazon SQS 같은 도구가 이 일을 한다. 한 사건을 여러 서비스가 각자 받아 처리해야 할 때도 쓴다. 결제 승인처럼 결과를 받아야 다음 단계로 갈 수 있는 일은 직접 호출을 그대로 쓴다.',
  intro: '주문이 들어오면 확인 메일을 보내야 합니다. 주문 서버가 메일 서버를 직접 호출해 끝날 때까지 기다릴 수도 있고, "메일 보내 주세요"라는 메시지를 큐에 넣어 두고 바로 응답할 수도 있습니다.',
  terms: ['메시지 큐', '동기와 비동기', 'Pub/Sub', '메시지 전달 보장', '최종 일관성(Eventual Consistency)'], ranks: ['mq', 'msa'],
  controls: [
    { id: 'how', label: '메일 서버에 일을 넘기는 방식', type: 'select', value: 'direct', options: [['direct', '직접 호출하고 끝날 때까지 기다림'], ['queue', '메시지 큐에 넣고 바로 응답']] },
    { id: 'n', label: '연달아 들어오는 주문', type: 'range', min: 1, max: 5, step: 1, value: 3, fmt: function (v) { return v + '건'; } },
    { id: 'work', label: '메일 한 통을 보내는 데 걸리는 시간', type: 'select', value: '1000', options: [['200', '0.2초'], ['1000', '1초'], ['3000', '3초']] },
    { id: 'state', label: '메일 서버 상태', type: 'select', value: 'ok', options: [['ok', '정상'], ['down', '죽어 있다가 나중에 복구됨']] },
  ],
  presets: [
    { t: '처음 설정으로', q: '메일 한 통에 1초 걸리는 메일 서버를 직접 호출하고 끝날 때까지 기다리면 주문 3건은 어떻게 되나', d: '직접 호출. 주문 응답이 메일 발송 시간만큼 늦어집니다.', v: { how: 'direct', n: 3, work: '1000', state: 'ok' } },
    { t: '큐에 넣으면', q: '메일 발송을 메시지 큐에 넣고 바로 응답하면', d: '주문은 바로 응답하고 메일은 뒤에서 차례로 나갑니다.', v: { how: 'queue', n: 3, work: '1000', state: 'ok' } },
    { t: '메일 서버가 죽었을 때 직접 호출', q: '직접 호출 방식 그대로 메일 서버가 죽어 있다가 나중에 복구되면', d: '메일 때문에 주문까지 실패합니다.', v: { how: 'direct', n: 3, work: '1000', state: 'down' } },
    { t: '메일 서버가 죽었을 때 큐', q: '메시지 큐에 넣고 바로 응답하는 방식인데 메일 서버가 죽어 있다가 나중에 복구되면', d: '주문은 성공하고 메시지는 쌓였다가 복구 뒤 처리됩니다.', v: { how: 'queue', n: 3, work: '1000', state: 'down' } },
    { t: '메일이 아주 느릴 때', q: '메시지 큐에 넣고 바로 응답하는데 연달아 들어오는 주문이 5건이고 메일 한 통을 보내는 데 3초가 걸리면', d: '3초짜리 작업. 두 방식의 주문 응답 시간을 비교해 보세요.', v: { how: 'queue', n: 5, work: '3000', state: 'ok' } },
  ],
  code: function (c) {
    var H = '// 메서드만 보임 (클래스 선언, import, 예시로 만든 Order·OrderDto·orderService 등의 선언은 생략)\n';
    if (c.how === 'direct') return H + '@PostMapping("/orders")\nOrderDto order(@RequestBody OrderRequest req) {\n    Order order = orderService.save(req);          // 0.05초\n    mailClient.sendConfirm(order);                 // 메일 서버를 직접 호출하고 기다린다\n    return OrderDto.of(order);                     // 메일이 끝나야 응답\n}';
    return H + '@PostMapping("/orders")\nOrderDto order(@RequestBody OrderRequest req) {\n    Order order = orderService.save(req);          // 0.05초\n    queue.send("order-created", order.getId());    // 메시지만 넣고 기다리지 않는다\n    return OrderDto.of(order);                     // 바로 응답\n}\n\n// 메일 서버 쪽: 큐에서 하나씩 꺼내 처리한다\n@RabbitListener(queues = "order-created")\nvoid onOrder(long orderId) {\n    mailSender.sendConfirm(orderId);\n}';
  },
  label: function (c) { return (c.how === 'direct' ? '직접 호출' : '메시지 큐') + ' · ' + c.n + '건 · 메일 ' + (+c.work / 1000) + '초 · ' + (c.state === 'ok' ? '정상' : '메일 서버 죽음'); },
  columns: ['주문 성공', '주문 한 건의 응답 시간', '보낸 메일', '큐에 가장 많이 쌓인 수'],
  simulate: function (c) {
    var n = +c.n, work = +c.work / 1000, save = 0.05, direct = c.how === 'direct', down = c.state === 'down', ev = [], sum = [];
    var S = { orders: [], q: [], mail: down ? '죽어 있음' : '대기 중', sent: 0 }, okCount = 0, maxQ = 0, resp, timeout = 3;
    function push(s, k) { ev.push({ s: s, k: k, snap: JSON.parse(JSON.stringify(S)) }); }
    function f(x) { return (Math.round(x * 100) / 100) + '초'; }
    push('주문 ' + n + '건이 차례로 들어옵니다. 주문을 DB에 저장하는 데 0.05초, 확인 메일 한 통을 보내는 데 ' + f(work) + '가 걸립니다.' + (down ? ' 메일 서버는 지금 죽어 있습니다.' : ''), '');
    var i;
    if (direct) {
      for (i = 1; i <= n; i++) {
        if (down) { resp = save + timeout; S.orders.push(['주문 ' + i, f(resp), '실패 (500)', '메일 서버가 응답하지 않음']); push('주문 ' + i + ': 저장한 뒤 메일 서버를 호출했지만 응답이 없습니다. 3초를 기다리다 타임아웃이 나고, 예외가 올라가 주문 요청 자체가 실패로 끝납니다. 메일이라는 부가 기능 때문에 주문 요청이 실패 응답으로 끝났습니다(이미 저장된 주문이 남을 수 있습니다).', 'bad'); }
        else { resp = save + work; S.sent++; okCount++; S.mail = '주문 ' + i + '의 메일 발송 완료'; S.orders.push(['주문 ' + i, f(resp), '성공', '응답 전에 메일까지 보냄']); push('주문 ' + i + ': 저장(0.05초)한 뒤 메일 서버를 호출하고 끝날 때까지 기다립니다(' + f(work) + '). 사용자는 ' + f(resp) + ' 뒤에야 응답을 받습니다.', work >= 1 ? 'bad' : ''); }
      }
    } else {
      resp = save + 0.01;
      for (i = 1; i <= n; i++) { S.q.push('주문 ' + i); maxQ = Math.max(maxQ, S.q.length); okCount++; S.orders.push(['주문 ' + i, f(resp), '성공', '메일은 아직 안 나감']); push('주문 ' + i + ': 저장한 뒤 "주문 ' + i + ' 확인 메일" 메시지를 큐에 넣고 바로 응답합니다(' + f(resp) + '). 메일 서버가 어떤 상태인지 주문 서버는 알 필요가 없습니다.', 'good'); }
      if (down) { push('메일 서버가 죽어 있어 아무도 큐에서 꺼내 가지 않습니다. 메시지 ' + n + '건은 큐에 그대로 남아 있습니다. 주문은 이미 모두 성공으로 응답했습니다.', ''); S.mail = '복구됨'; push('메일 서버가 복구됐습니다. 큐에 쌓여 있던 메시지를 앞에서부터 꺼내 가기 시작합니다.', ''); }
      for (i = 1; i <= n; i++) { S.q.shift(); S.sent++; S.mail = '주문 ' + i + '의 메일 발송 완료'; S.orders[i - 1] = ['주문 ' + i, f(resp), '성공', '메일 발송됨 (응답 뒤에)']; push('메일 서버가 큐에서 "주문 ' + i + '" 메시지를 꺼내 메일을 보냅니다(' + f(work) + '). 자기 속도대로 하나씩 처리합니다.', ''); }
    }
    if (direct && down) sum.push('직접 호출하면 호출받는 쪽의 장애가 호출하는 쪽으로 번집니다. 메일 서버가 죽자 주문 요청까지 실패했습니다.');
    if (direct && !down) sum.push('직접 호출하면 응답 시간에 상대의 처리 시간이 그대로 더해집니다. 메일이 느려지면 주문도 느려집니다. 대신 응답을 받은 시점에 메일까지 끝났다는 것이 확실합니다.');
    if (!direct) sum.push('큐를 사이에 두면 주문 서버는 메시지를 넣는 것까지만 책임집니다. 메일 서버가 느리거나 죽어 있어도 주문의 응답 시간과 성공 여부는 그대로입니다. 큐가 그 사이의 완충 역할을 합니다.');
    if (!direct) sum.push('대가도 있습니다. 주문 응답을 받은 시점에 메일은 아직 안 나갔을 수 있습니다(시간이 지나면 맞춰지는 최종 일관성). 또 메시지가 두 번 전달되거나 처리 도중 실패할 수 있어, 받는 쪽은 같은 메시지를 두 번 받아도 문제없게 만들어야 합니다. 이 내용은 "멱등성"과 "Kafka" 실습에서 이어집니다.');
    sum.push('큐가 어울리는 일은 "응답에 결과가 필요 없고 조금 늦어도 되는 일"입니다. 메일, 알림, 통계 집계가 대표적입니다. 결제 승인처럼 결과를 받아야 다음으로 갈 수 있는 일은 직접 호출합니다.');
    return { events: ev, summary: sum, row: [okCount + ' / ' + n + '건', f(resp), S.sent + '통', direct ? '큐 없음' : maxQ + '건'] };
  },
  render: function (v, sim, t, H, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : { orders: [], q: [], mail: '', sent: 0 };
    H.counters(v, [[s.sent + '통', '보낸 메일']]);
  },
  // 그림: 주문 서버와 메일 서버. 직접 부르면 둘이 화살표로 묶이고, 큐를 두면 그 사이에 메시지가 쌓인다.
  draw: function (P, sim, shown) {
    var c = sim.c, direct = c.how === 'direct', last = shown[shown.length - 1], s = last ? last.snap : { orders: [], q: [], mail: '', sent: 0 }, dead = s.mail === '죽어 있음';
    P.size(680, 232 + Math.max(1, s.orders.length) * 30 + 16);
    P.box('os', 16, 60, 180, 60, { cls: 'wait', title: '주문 서버', sub: '주문을 저장하고 응답' });
    P.box('ms', 484, 60, 180, 60, { cls: dead ? 'bad' : s.mail ? 'good' : 'plain', title: '메일 서버', sub: s.mail || '대기' });
    if (direct) P.arrow('call', 'os:r', 'ms:l', { cls: dead ? 'bad' : s.orders.length ? 'hot' : 'mut', label: dead ? '응답 없음 → 주문도 실패' : '직접 호출하고 끝날 때까지 기다림' });
    else {
      P.region('qu', 240, 16, 200, 190, '메시지 큐');
      s.q.forEach(function (x, j) { P.box('m_' + x, 252, 50 + j * 30, 176, 26, { cls: 'wait', sub: x + ' 메일 요청', center: true }); });
      if (!s.q.length) P.text('qe', 340, 116, '비어 있음', { cls: 'mut', anchor: 'middle' });
      P.arrow('in', 'os:r', 'qu:l', { cls: 'good', label: '넣기' }); P.arrow('out', 'qu:r', 'ms:l', { cls: dead ? 'bad dash' : 'mut', label: dead ? '꺼내 가는 쪽 없음' : '꺼내 감' });
    }
    s.orders.forEach(function (r, i) { P.box('o' + i, 16, 226 + i * 30, 648, 26, { cls: r[2] === '성공' ? 'good' : 'bad', title: r[0] + ' · 응답까지 ' + r[1], right: r[2] + ' · ' + r[3] }); });
    if (!s.orders.length) P.text('none', 340, 244, '아직 들어온 주문이 없습니다', { cls: 'mut', anchor: 'middle' });
    P.note(direct ? '두 서버가 화살표 하나로 묶여 있습니다.' : '가운데 큐가 완충 역할을 합니다.');
  },
  assume: '개념을 설명하기 위한 모델이며 실제 메시지 큐를 실행해 확인한 결과는 아닙니다. 시간 값(저장 0.05초, 큐에 넣기 0.01초, 타임아웃 3초)은 예시입니다. 직접 호출에서도 타임아웃과 예외 처리를 넣어 주문 실패를 막을 수 있고, 큐 자체가 죽는 경우와 메시지 유실, 중복 전달, 순서 문제는 여기서 다루지 않았습니다. 코드의 @RabbitListener는 RabbitMQ를 쓸 때의 예시입니다.',
});

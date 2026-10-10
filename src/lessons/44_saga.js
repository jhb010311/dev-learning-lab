Lab.register({
  id: 'saga', nav: 'Saga와 Outbox', cat: 'MSA', mode: 'step',
  title: '서비스마다 DB가 따로일 때 "전부 성공 아니면 전부 취소"를 어떻게 하나',
  intro: '주문, 결제, 재고, 배송이 각자의 DB를 가진 서비스로 나뉘어 있으면 하나의 DB 트랜잭션으로 묶을 수 없습니다. 중간에 실패하면 이미 끝난 단계를 되돌리는 작업을 따로 실행해야 합니다(Saga). 또 DB 저장과 메시지 발행 사이에 서버가 죽으면 둘이 어긋납니다(Outbox가 해결하는 문제).',
  terms: ['분산 트랜잭션과 Saga 패턴', '보상 트랜잭션', 'Transactional Outbox 패턴', '메시지 전달 보장', '최종 일관성(Eventual Consistency)'], ranks: ['msa', 'mq', 'txspring'],
  controls: [
    { id: 'part', label: '볼 내용', type: 'select', value: 'saga', options: [['saga', 'Saga: 중간 단계가 실패하면'], ['outbox', 'Outbox: 저장과 메시지 발행 사이에 서버가 죽으면']] },
    { id: 'fail', label: '실패하는 단계', type: 'select', value: 'stock', options: [['none', '실패 없음'], ['pay', '결제'], ['stock', '재고 차감'], ['ship', '배송 요청']], show: function (c) { return c.part === 'saga'; } },
    { id: 'pub', label: '메시지를 발행하는 방식', type: 'select', value: 'after', options: [['after', 'DB 커밋 후에 메시지 발행'], ['before', '메시지 발행 후에 DB 커밋'], ['outbox', 'Outbox 테이블에 함께 저장 (나중에 발행)']], show: function (c) { return c.part === 'outbox'; } },
  ],
  presets: [
    { t: '처음 설정으로', d: '재고 차감에서 실패. 결제와 주문을 거꾸로 되돌립니다.', v: { part: 'saga', fail: 'stock', pub: 'after' } },
    { t: '마지막 단계에서 실패', d: '배송 요청 실패. 되돌릴 것이 세 개입니다.', v: { part: 'saga', fail: 'ship', pub: 'after' } },
    { t: '실패 없음', d: '네 단계가 차례로 성공합니다.', v: { part: 'saga', fail: 'none', pub: 'after' } },
    { t: '커밋 후 발행하다 서버가 죽으면', d: '주문은 저장됐는데 이벤트가 나가지 않습니다.', v: { part: 'outbox', fail: 'stock', pub: 'after' } },
    { t: '발행 후 커밋하다 서버가 죽으면', d: '이벤트는 나갔는데 주문이 없습니다.', v: { part: 'outbox', fail: 'stock', pub: 'before' } },
    { t: 'Outbox 테이블 사용', d: '주문과 "보낼 메시지"를 한 트랜잭션에 저장합니다.', v: { part: 'outbox', fail: 'stock', pub: 'outbox' } },
  ],
  code: function (c) {
    if (c.part === 'saga') return '// 각 단계는 자기 서비스의 로컬 트랜잭션으로 커밋된다\n1. 주문 서비스   주문 생성 (PENDING)      보상: 주문 취소\n2. 결제 서비스   결제 승인                보상: 결제 취소(환불)\n3. 재고 서비스   재고 차감                보상: 재고 복구\n4. 배송 서비스   배송 요청                (마지막 단계)\n\n// 단계가 실패하면 "실패" 이벤트를 발행하고,\n// 앞선 단계들이 그 이벤트를 받아 자기 보상 작업을 실행한다';
    if (c.pub === 'outbox') return '@Transactional\npublic void placeOrder(Order order) {\n    orderRepository.save(order);\n    outboxRepository.save(new OutboxMessage("OrderCreated", order));   // 같은 트랜잭션\n}\n\n// 별도의 릴레이가 주기적으로 실행\n@Scheduled(fixedDelay = 1000)\nvoid relay() {\n    for (OutboxMessage m : outboxRepository.findUnsent()) {\n        kafka.send(m.topic(), m.payload());\n        m.markSent();                    // 보낸 뒤 표시\n    }\n}';
    return c.pub === 'after' ? '@Transactional\npublic void placeOrder(Order order) {\n    orderRepository.save(order);\n}                                        // 여기서 DB 커밋\n\n// 커밋이 끝난 뒤 발행\nkafka.send("orders", new OrderCreated(order));' : '@Transactional\npublic void placeOrder(Order order) {\n    orderRepository.save(order);\n    kafka.send("orders", new OrderCreated(order));   // 커밋 전에 발행\n}                                        // 여기서 DB 커밋';
  },
  label: function (c) { return c.part === 'saga' ? 'Saga · ' + { none: '실패 없음', pay: '결제에서 실패', stock: '재고에서 실패', ship: '배송에서 실패' }[c.fail] : 'Outbox · ' + { after: '커밋 후 발행', before: '발행 후 커밋', outbox: 'Outbox 테이블' }[c.pub]; },
  columns: ['최종 상태', '실행된 보상', 'DB와 메시지가 맞는가'],
  simulate: function (c) {
    var ev = [], sum = [];
    if (c.part === 'saga') {
      var steps = [['order', '주문 서비스', '주문 생성', '주문 취소'], ['pay', '결제 서비스', '결제 승인', '결제 취소(환불)'], ['stock', '재고 서비스', '재고 차감', '재고 복구'], ['ship', '배송 서비스', '배송 요청', '']], st = ['대기', '대기', '대기', '대기'], comp = 0;
      var push = function (s, k) { ev.push({ s: s, k: k, snap: { st: st.slice() } }); };
      push('사용자가 주문합니다. 네 서비스가 각자 자기 DB에 작업을 커밋하고, 끝나면 다음 서비스에 이벤트로 알립니다. 전체를 감싸는 하나의 트랜잭션은 없습니다.', '');
      var failed = -1;
      for (var i = 0; i < 4; i++) {
        if (steps[i][0] === c.fail) { st[i] = '실패'; failed = i; push((i + 1) + '단계 ' + steps[i][1] + ': ' + steps[i][2] + '에 실패했습니다. 이 서비스의 로컬 트랜잭션은 롤백되지만, 앞 단계들은 이미 각자의 DB에 커밋된 상태입니다. DB 롤백으로는 되돌릴 수 없습니다.', 'bad'); break; }
        st[i] = '완료(커밋됨)'; push((i + 1) + '단계 ' + steps[i][1] + ': ' + steps[i][2] + ' 완료. 자기 DB에 커밋하고 다음 단계를 위한 이벤트를 발행합니다.', 'good');
      }
      if (failed >= 0) {
        for (var j = failed - 1; j >= 0; j--) { st[j] = '보상 완료: ' + steps[j][3]; comp++; push('보상 ' + comp + ': ' + steps[j][1] + '가 실패 이벤트를 받아 ' + steps[j][3] + '를 실행합니다. 이미 커밋된 작업을 "취소하는 새 작업"으로 되돌리는 것입니다. 실행한 순서의 반대로 진행합니다.', ''); }
        push('모든 보상이 끝났습니다. 주문은 취소 상태가 됐고 데이터는 다시 앞뒤가 맞습니다. 다만 보상이 끝나기 전까지는 "결제는 됐는데 주문은 실패"처럼 어긋난 상태가 잠시 존재했습니다.', '');
        sum.push(steps[failed][1] + '에서 실패해 보상 ' + comp + '개를 역순으로 실행했습니다. 최종적으로 주문은 취소됐습니다.');
        sum.push('Saga는 긴 트랜잭션을 서비스별 로컬 트랜잭션의 연속으로 나누고, 실패하면 보상 트랜잭션으로 되돌립니다. DB의 롤백처럼 "없던 일"이 되는 것이 아니라 취소 기록이 남는 새 작업입니다. 그래서 중간 상태가 외부에 보일 수 있고(격리되지 않음), 보상 작업 자체도 실패할 수 있어 재시도와 멱등성이 필요합니다.');
      } else { push('네 단계가 모두 성공했습니다. 주문이 확정됩니다.', 'good'); sum.push('실패 없이 네 서비스의 로컬 트랜잭션이 차례로 커밋됐습니다.'); sum.push('각 단계가 커밋되는 사이에는 "결제는 됐는데 재고는 아직"인 상태가 존재합니다. 모든 단계가 끝나야 일관된 상태가 됩니다(최종 일관성).'); }
      return { events: ev, summary: sum, steps: steps, part: 'saga', row: [failed >= 0 ? '주문 취소' : '주문 확정', comp + '개', '-'] };
    }
    var S = { db: '없음', ob: '없음', mq: '없음', other: '대기' }, pushO = function (s, k) { ev.push({ s: s, k: k, snap: JSON.parse(JSON.stringify(S)) }); }, okAll;
    pushO('주문 서비스가 주문을 저장하고, 다른 서비스들이 알 수 있도록 "주문 생성됨" 메시지를 Kafka에 발행해야 합니다. DB와 Kafka는 서로 다른 시스템이라 하나의 트랜잭션으로 묶을 수 없습니다.', '');
    if (c.pub === 'after') {
      S.db = '주문 저장됨 (커밋)'; pushO('주문을 DB에 저장하고 커밋했습니다.', 'good');
      pushO('메시지를 발행하려는 순간 서버가 죽었습니다(배포, 장애, 네트워크 단절 등).', 'bad');
      S.other = '주문이 생긴 줄 모름'; pushO('서버가 다시 떠도 "보내야 했던 메시지"가 있었다는 기록이 어디에도 없습니다. 주문은 DB에 있는데 결제와 재고 서비스는 영영 알지 못합니다. 주문이 멈춘 채 남습니다.', 'bad');
      okAll = false; sum.push('DB에는 주문이 있지만 메시지는 유실됐습니다. 커밋과 발행은 별개의 동작이라 그 사이에 실패하면 둘이 어긋납니다.');
    } else if (c.pub === 'before') {
      S.db = '주문 INSERT (커밋 전)'; pushO('주문을 INSERT했습니다. 아직 커밋 전입니다.', '');
      S.mq = '"주문 생성됨" 발행됨'; S.other = '메시지를 받아 결제 진행 중'; pushO('커밋하기 전에 메시지를 먼저 발행했습니다. 다른 서비스들이 메시지를 받아 처리를 시작합니다.', '');
      S.db = '롤백됨 (주문 없음)'; pushO('커밋하려는 순간 서버가 죽어 트랜잭션이 롤백됐습니다. 주문은 DB에 없습니다. 그런데 메시지는 이미 나갔고 되돌릴 수 없습니다. 존재하지 않는 주문에 대해 결제가 진행됩니다.', 'bad');
      okAll = false; sum.push('메시지는 나갔는데 주문은 없습니다. 순서를 바꿔도 문제의 방향만 달라질 뿐 해결되지 않습니다.');
    } else {
      S.db = '주문 저장됨 (커밋)'; S.ob = '"주문 생성됨" 1건 (미발송)'; pushO('주문과 함께 "보낼 메시지"를 같은 DB의 outbox 테이블에 저장하고, 둘을 하나의 트랜잭션으로 커밋합니다. 같은 DB이므로 둘 다 저장되거나 둘 다 저장되지 않습니다.', 'good');
      pushO('이 시점에 서버가 죽어도 괜찮습니다. 보낼 메시지가 DB에 남아 있습니다.', '');
      S.mq = '"주문 생성됨" 발행됨'; S.other = '메시지를 받아 처리'; pushO('별도의 릴레이가 outbox 테이블에서 아직 보내지 않은 메시지를 읽어 Kafka에 발행합니다.', 'good');
      S.ob = '"주문 생성됨" 1건 (발송 완료)'; pushO('발행에 성공한 메시지를 "발송 완료"로 표시합니다. 만약 발행 직후, 표시하기 전에 릴레이가 죽으면 같은 메시지를 한 번 더 보내게 됩니다. 그래서 받는 쪽은 중복 메시지를 처리해도 결과가 같도록 만들어야 합니다.', '');
      okAll = true; sum.push('주문과 메시지가 반드시 함께 저장되므로 유실이 없습니다. 메시지는 잠시 뒤에 나가고(최종 일관성), 드물게 중복으로 나갈 수 있습니다(최소 한 번 전달).');
    }
    sum.push('이 문제를 "이중 쓰기"라고 합니다. Outbox 패턴은 메시지 발행을 DB 쓰기로 바꿔서 한 트랜잭션에 넣는 방법입니다. outbox 테이블을 주기적으로 읽는 대신 DB의 변경 로그를 읽어 발행하는 방식(CDC)도 같은 목적으로 씁니다.');
    return { events: ev, summary: sum, part: 'outbox', row: [okAll ? '주문과 메시지 모두 전달' : '어긋남', '-', okAll ? '맞음' : '어긋남'] };
  },
  render: function (v, sim, t, H, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : null;
    if (!s) { H.text(v, '실행을 누르면 시작합니다.'); return; }
    if (sim.part === 'saga') H.table(v, ['단계', '서비스 (각자 DB를 가짐)', '작업', '상태'], sim.steps.map(function (x, i) { var z = s.st[i]; return { cells: [String(i + 1), x[1], x[2], { v: z, cls: z === '실패' ? 'bad' : z.indexOf('보상') === 0 ? 'hot' : z === '대기' ? '' : 'good' }] }; }), '주문 처리의 네 단계');
    else { var ln = H.lanes(v); H.lane(ln, '주문 DB', 'orders 테이블: ' + s.db, s.db.indexOf('롤백') >= 0 ? 'bad' : s.db === '없음' ? 'none' : 'good'); if (sim.c.pub === 'outbox') H.lane(ln, '주문 DB', 'outbox 테이블: ' + s.ob, s.ob === '없음' ? 'none' : 'wait'); H.lane(ln, 'Kafka', s.mq, s.mq === '없음' ? 'none' : 'good'); H.lane(ln, '다른 서비스', s.other, s.other.indexOf('모름') >= 0 ? 'bad' : s.other === '대기' ? 'none' : ''); }
  },
  // 그림: 서비스마다 DB가 따로 있는 네 단계. 앞으로 가는 화살표는 다음 단계 호출, 뒤로 가는 화살표는 보상(되돌리기).
  draw: function (P, sim, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : null;
    P.size(680, 300);
    if (sim.part === 'saga') {
      var st = s ? s.st : ['대기', '대기', '대기', '대기'];
      sim.steps.forEach(function (x, i) {
        var z = st[i], comp = z.indexOf('보상') === 0, px = 16 + i * 166;
        P.box('sv' + i, px, 44, 150, 78, { cls: z === '실패' ? 'bad' : comp ? 'hot' : z === '대기' ? 'ghost' : 'good', title: x[1], sub: [x[2], comp ? '되돌림:' : z, comp ? x[3] : ' '] });
        P.box('db' + i, px + 20, 150, 110, 30, { cls: 'plain', sub: x[1].replace(' 서비스', '') + ' DB', center: true });
        P.arrow('own' + i, 'sv' + i + ':b', 'db' + i + ':t', { cls: 'mut' });
        if (i && st[i] !== '대기') P.arrow('fw' + i, 'sv' + (i - 1) + ':r', 'sv' + i + ':l', { cls: st[i] === '실패' ? 'bad' : 'good' });
        if (i < 3 && comp) P.arrow('cp' + i, 'sv' + (i + 1) + ':t:0.3', 'sv' + i + ':t:0.7', { cls: 'hot', label: '보상' });
      });
      P.text('t', 340, 226, 'DB가 따로라서 ROLLBACK 한 번으로 전부 되돌릴 수 없습니다', { anchor: 'middle', cls: 'mut' });
      P.note('초록은 이미 커밋된 단계, 빨강은 실패한 단계, 노랑은 보상 작업으로 되돌린 단계입니다. 실패하면 앞 단계들을 거꾸로 하나씩 되돌립니다.');
    } else {
      var o = s || { db: '없음', ob: '없음', mq: '없음', other: '대기' }, box = sim.c.pub === 'outbox';
      P.region('dbr', 16, 30, 300, 190, '주문 서비스의 DB (한 트랜잭션)');
      P.box('ord', 28, 66, 276, 56, { cls: o.db.indexOf('롤백') >= 0 ? 'bad' : o.db === '없음' ? 'ghost' : 'good', title: 'orders 테이블', sub: o.db });
      if (box) P.box('ob', 28, 140, 276, 56, { cls: o.ob === '없음' ? 'ghost' : 'wait', title: 'outbox 테이블', sub: o.ob });
      P.box('mq', 372, 44, 292, 56, { cls: o.mq === '없음' ? 'ghost' : 'good', title: 'Kafka', sub: o.mq });
      P.box('oth', 372, 150, 292, 56, { cls: o.other.indexOf('모름') >= 0 ? 'bad' : o.other === '대기' ? 'ghost' : 'good', title: '다른 서비스', sub: o.other });
      if (o.mq !== '없음') { P.arrow('pub', (box ? 'ob' : 'ord') + ':r', 'mq:l', { cls: 'good', label: '발행' }); P.arrow('dl', 'mq:b', 'oth:t', { cls: 'good' }); }
      P.note('DB 저장과 메시지 발행은 서로 다른 시스템이라 한 번에 묶을 수 없습니다. Outbox는 "보낼 메시지"를 주문과 같은 트랜잭션으로 DB에 적어 두고, 나중에 그것을 읽어 발행합니다.');
    }
  },
  assume: 'Saga는 서비스들이 이벤트를 주고받으며 진행하는 방식(코레오그래피)으로 그렸습니다. 중앙의 조정자가 각 단계를 지시하는 방식(오케스트레이션)도 있으며 보상의 원리는 같습니다. 보상 작업은 항상 성공한다고 단순화했습니다. Outbox 예에서는 서버가 죽는 시점을 가장 문제가 되는 순간으로 고정했습니다. 패턴의 정의는 마이크로서비스 패턴 문헌(microservices.io)의 설명을 따랐습니다.',
});

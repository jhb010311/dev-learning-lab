Lab.register({
  id: 'gateway', nav: '게이트웨이와 점진적 전환', cat: 'MSA', mode: 'step',
  title: '거대한 서버를 멈추지 않고 조금씩 떼어 내기',
  intro: '모든 기능이 한 덩어리인 기존 서버(모놀리스) 앞에 게이트웨이를 두고, 경로별로 요청을 새 서비스로 조금씩 넘깁니다. 사용자가 보는 주소는 그대로입니다.',
  terms: ['API 게이트웨이', 'Strangler Fig 패턴', '모놀리식과 MSA(마이크로서비스)', '리버스 프록시', '롤링, 블루-그린, 카나리 배포'], ranks: ['msa', 'design', 'deploy'],
  controls: [
    { id: 'stage', label: '전환 단계', type: 'select', value: '1', options: [['0', '0단계: 전부 기존 서버'], ['1', '1단계: 주문만 새 서비스로'], ['2', '2단계: 주문과 결제를 새 서비스로'], ['3', '3단계: 전부 새 서비스로 (기존 서버 종료)']] },
    { id: 'ratio', label: '주문 요청 중 새 서비스로 보내는 비율', type: 'select', value: '100', options: [['10', '10% (나머지는 기존 서버)'], ['50', '50%'], ['100', '100%']], show: function (c) { return c.stage === '1'; } },
    { id: 'auth', label: '로그인 토큰이 없는 요청이 섞여 있다', type: 'check', value: false },
  ],
  presets: [
    { t: '처음 설정으로', q: '전환 단계 1단계(주문만 새 서비스로)에서 주문 요청을 100% 새 서비스로 보낼 때 요청은 어디로 가나', d: '주문 경로만 새 서비스로 넘겼습니다.', v: { stage: '1', ratio: '100', auth: false } },
    { t: '주문의 10%만 먼저', q: '주문 요청의 10%만 새 서비스로 보내고 나머지는 기존 서버로 보내면', d: '새 서비스를 실제 요청 일부로 검증합니다.', v: { stage: '1', ratio: '10', auth: false } },
    { t: '전환 전', q: '전부 기존 서버로 보내는 0단계로 바꾸면', d: '모든 요청이 기존 서버로 갑니다.', v: { stage: '0', ratio: '100', auth: false } },
    { t: '전환 완료', q: '전부 새 서비스로 보내고 기존 서버를 종료하는 3단계로 바꾸면', d: '기존 서버로 가는 요청이 없어 종료할 수 있습니다.', v: { stage: '3', ratio: '100', auth: false } },
    { t: '토큰 없는 요청', q: '주문과 결제를 새 서비스로 보내는 2단계로 바꾸고 로그인 토큰이 없는 요청까지 섞으면', d: '게이트웨이가 입구에서 걸러 냅니다.', v: { stage: '2', ratio: '100', auth: true } },
  ],
  code: function (c) {
    var r = [];
    if (+c.stage >= 1) r.push('        - id: order\n          uri: http://order-service\n          predicates:\n            - Path=/orders/**' + (c.stage === '1' && c.ratio !== '100' ? '\n            - Weight=order, ' + c.ratio + '        # ' + c.ratio + '%만 새 서비스로' : ''));
    if (+c.stage >= 2) r.push('        - id: payment\n          uri: http://payment-service\n          predicates:\n            - Path=/payments/**');
    if (+c.stage >= 3) r.push('        - id: member\n          uri: http://member-service\n          predicates:\n            - Path=/members/**');
    if (+c.stage < 3) r.push('        - id: legacy                   # 나머지는 전부 기존 서버로\n          uri: http://legacy-monolith\n          predicates:\n            - Path=/**');
    return '# Spring Cloud Gateway\nspring.cloud.gateway:\n  routes:\n' + r.join('\n') + '\n\n# 공통 필터: 토큰 검증, 요청 로그, 요청 수 제한';
  },
  label: function (c) { return ['전환 전', '주문만 이전' + (c.ratio !== '100' ? ' (' + c.ratio + '%)' : ''), '주문·결제 이전', '전부 이전'][+c.stage] + (c.auth ? ' · 토큰 없는 요청 포함' : ''); },
  columns: ['기존 서버로 간 요청', '새 서비스로 간 요청', '게이트웨이에서 거절', '기존 서버 종료 가능'],
  simulate: function (c) {
    var st = +c.stage, ratio = +c.ratio, ev = [], rows = [], sum = [], old = 0, neu = 0, rej = 0;
    var reqs = [['GET /orders/1', 'orders'], ['POST /payments', 'payments'], ['GET /members/me', 'members'], ['POST /orders', 'orders'], ['GET /orders/2', 'orders'], ['GET /members/7', 'members'], ['POST /orders', 'orders'], ['GET /payments/9', 'payments'], ['GET /orders/3', 'orders'], ['GET /orders/4', 'orders']];
    function push(s, k) { ev.push({ s: s, k: k, snap: { rows: rows.slice(), old: old, neu: neu, rej: rej } }); }
    push('사용자의 모든 요청은 게이트웨이 한 곳으로 들어옵니다. 게이트웨이는 공통 작업(토큰 검증, 로그, 요청 수 제한)을 처리한 뒤, 경로를 보고 뒤쪽의 어느 서버로 넘길지 정합니다. 사용자는 뒤에 서버가 몇 개 있는지 알지 못합니다.', '');
    var orderSeen = 0;
    reqs.forEach(function (r, i) {
      var noAuth = c.auth && (i === 2 || i === 6), to, why;
      if (noAuth) { rej++; rows.push({ cells: [r[0], '(토큰 없음)', { v: '게이트웨이가 401로 거절', cls: 'bad' }] }); push(r[0] + ': 토큰이 없습니다. 게이트웨이가 뒤로 넘기지 않고 바로 401로 응답합니다. 뒤쪽 서비스들은 각자 토큰 검증 코드를 가질 필요가 없습니다.', 'bad'); return; }
      var moved = (r[1] === 'orders' && st >= 1) || (r[1] === 'payments' && st >= 2) || (r[1] === 'members' && st >= 3);
      if (moved && r[1] === 'orders' && st === 1 && ratio < 100) { orderSeen++; moved = ratio === 50 ? orderSeen % 2 === 0 : orderSeen === 5; why = moved ? ' 비율 설정에 따라 이 요청은 새 서비스로 갑니다.' : ' 비율 설정에 따라 이 요청은 아직 기존 서버로 갑니다.'; }
      to = moved ? { orders: '주문 서비스 (새)', payments: '결제 서비스 (새)', members: '회원 서비스 (새)' }[r[1]] : '기존 서버 (모놀리스)';
      if (moved) neu++; else old++;
      rows.push({ cells: [r[0], moved ? '/' + r[1] + '/**' : '/**', { v: to, cls: moved ? 'good' : '' }] });
      push(r[0] + ': 경로가 /' + r[1] + '로 시작합니다. ' + (why || (moved ? '이 경로는 새 서비스로 넘기도록 설정돼 있습니다.' : '따로 지정된 경로가 아니므로 기존 서버로 갑니다.')) + ' → ' + to, moved ? 'good' : '');
    });
    if (st === 0) sum.push('아직 아무것도 옮기지 않았습니다. 게이트웨이를 먼저 세워 두는 것이 전환의 첫 단계입니다. 이후에는 설정만 바꿔 경로를 하나씩 넘길 수 있습니다.');
    if (st === 1 || st === 2) sum.push('기능을 한 번에 다 옮기지 않고 경로 단위로 떼어 냅니다. 새 서비스에 문제가 생기면 설정을 되돌려 다시 기존 서버로 보내면 됩니다. 기존 시스템을 조금씩 감싸며 대체해 간다고 해서 Strangler Fig(교살자 무화과) 패턴이라고 부릅니다.');
    if (st === 1 && ratio < 100) sum.push('경로를 넘길 때도 일부 비율만 먼저 보내 실제 요청으로 검증합니다. 이때 같은 데이터를 두 서버가 함께 다루므로 DB를 어떻게 나눌지가 가장 어려운 문제입니다.');
    if (st === 3) sum.push('기존 서버로 가는 요청이 0건이 됐습니다. 이제 기존 서버를 내릴 수 있습니다.');
    if (c.auth) sum.push('게이트웨이가 인증, 로그, 요청 수 제한 같은 공통 관심사를 입구에서 처리합니다. 대신 게이트웨이가 죽으면 전체가 멈추므로 여러 대로 띄우고, 업무 로직은 넣지 않습니다.');
    return { events: ev, summary: sum, row: [old + '건', neu + '건', rej + '건', old === 0 ? '예' : '아니오'] };
  },
  render: function (v, sim, t, H, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : { rows: [], old: 0, neu: 0, rej: 0 };
    if (s.rows.length) H.table(v, ['요청', '맞은 경로 규칙', '넘겨진 곳'], s.rows, '게이트웨이의 라우팅'); else H.text(v, '아직 들어온 요청이 없습니다.');
  },
  // 그림: 모든 요청이 게이트웨이를 지나 기존 서버나 새 서비스로 간다.
  draw: function (P, sim, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : { rows: [], old: 0, neu: 0, rej: 0 };
    var msgs = s.rows.map(function (r) { var req = P.v(r.cells[0]), to = P.v(r.cells[2]); return to.indexOf('거절') >= 0 ? { f: 'c', t: 'g', s: req + ': 401로 거절', cls: 'bad' } : { f: 'c', t: to.indexOf('새') >= 0 ? 'n' : 'o', s: req, cls: to.indexOf('새') >= 0 ? 'good' : '' }; });
    var end = P.seq([['c', '클라이언트', 'wait'], ['g', 'API 게이트웨이', 'hot'], ['o', '기존 서버 (모놀리스)'], ['n', '새 서비스들', 'good']], msgs, { keep: 8 });
    P.box('co', 16, end + 14, 208, 34, { cls: 'plain', title: '기존 서버로', right: s.old + '건' });
    P.box('cn', 236, end + 14, 208, 34, { cls: 'good', title: '새 서비스로', right: s.neu + '건' });
    P.box('cr', 456, end + 14, 208, 34, { cls: s.rej ? 'bad' : 'ghost', title: '입구에서 거절', right: s.rej + '건' });
    P.size(680, end + 64);
    P.note('모든 화살표는 게이트웨이의 선을 지나갑니다.');
  },
  assume: '요청 10건의 고정된 예입니다. 비율 설정은 10건 안에서 차이가 보이도록 단순하게 배정했습니다(50%는 주문 요청을 번갈아, 10%는 다섯 번째 주문 요청 하나). 설정 예시는 Spring Cloud Gateway의 경로·가중치 조건을 따랐습니다. 기능을 옮길 때 가장 어려운 데이터 분리와 두 시스템 사이의 동기화는 다루지 않았습니다.',
});

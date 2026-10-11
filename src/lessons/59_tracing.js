Lab.register({
  id: 'trace', nav: '분산 추적', cat: '모니터링', mode: 'step',
  title: '요청 하나가 느린데 어느 서비스 탓인가',
  intro: '주문 요청 하나가 게이트웨이, 주문 서비스, 결제 서비스, 외부 결제사를 차례로 거칩니다. 로그는 서비스마다 따로 쌓이므로, 같은 요청의 로그를 묶을 공통 번호가 없으면 어디서 시간이 걸렸는지 찾기 어렵습니다.',
  terms: ['분산 추적(Trace ID, Span)', '관측성(로그, 지표, 추적)', 'MDC', 'APM', '모놀리식과 MSA(마이크로서비스)'], ranks: ['monitor', 'msa'],
  controls: [
    { id: 'slow', label: '느린 구간', type: 'select', value: 'pg', options: [['none', '없음'], ['db', '주문 서비스의 DB 조회'], ['pay', '결제 서비스 내부 처리'], ['pg', '외부 결제사 API']] },
    { id: 'prop', label: '추적 번호(Trace ID)를 서비스 사이에 전달한다', type: 'check', value: true },
  ],
  presets: [
    { t: '처음 설정으로', d: '외부 결제사가 느립니다. 추적 화면에서 한눈에 보입니다.', v: { slow: 'pg', prop: true } },
    { t: '추적 번호가 없다면', d: '서비스마다 로그는 있지만 같은 요청끼리 이을 수 없습니다.', v: { slow: 'pg', prop: false } },
    { t: 'DB 조회가 느릴 때', d: '느린 구간이 주문 서비스 안쪽으로 옮겨집니다.', v: { slow: 'db', prop: true } },
    { t: '결제 서비스 내부가 느릴 때', d: '결제 서비스의 시간에서 외부 호출 시간을 뺀 부분이 깁니다.', v: { slow: 'pay', prop: true } },
  ],
  code: function (c) {
    return c.prop ? '// build.gradle: Micrometer Tracing\nimplementation \'io.micrometer:micrometer-tracing-bridge-otel\'\n\n# 서비스끼리 호출할 때 자동으로 붙는 헤더 (W3C Trace Context)\ntraceparent: 00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01\n#               └─ trace id (요청 전체에서 동일)      └─ span id (구간마다 다름)\n\n# 로그 패턴에 추적 번호를 넣는다 (MDC에서 꺼냄)\nlogging.pattern.level: "%5p [%X{traceId:-},%X{spanId:-}]"' : '// 추적 설정 없음\n// 각 서비스는 자기 로그만 남긴다\n\nlog.info("주문 처리 시작 orderId={}", orderId);';
  },
  label: function (c) { return '느린 구간: ' + { none: '없음', db: '주문 DB', pay: '결제 서비스 내부', pg: '외부 결제사' }[c.slow] + (c.prop ? '' : ' · 추적 번호 없음'); },
  columns: ['전체 응답 시간', '가장 오래 걸린 구간', '원인을 찾는 방법'],
  simulate: function (c) {
    var d = { gw: 5, order: 20, db: c.slow === 'db' ? 1800 : 30, pay: c.slow === 'pay' ? 1500 : 40, pg: c.slow === 'pg' ? 2000 : 150 }, ev = [], sum = [];
    var payTotal = d.pay + d.pg, orderTotal = d.order + d.db + payTotal, total = d.gw + orderTotal;
    var spans = [['게이트웨이', 0, total, d.gw], ['주문 서비스', d.gw, orderTotal, d.order], ['주문 DB 조회', d.gw + 10, d.db, d.db], ['결제 서비스', d.gw + d.order + d.db, payTotal, d.pay], ['외부 결제사 API', d.gw + d.order + d.db + d.pay, d.pg, d.pg]];
    var own = spans.map(function (s) { return s[3]; }), mi = own.indexOf(Math.max.apply(null, own)), TID = '4bf92f35';
    var ids = c.prop ? [TID, TID, TID, TID, TID] : ['-', '-', '-', '-', '-'];
    var logs = [['게이트웨이', 'POST /orders 수신'], ['주문 서비스', '주문 처리 시작 orderId=1024'], ['주문 서비스', '주문 조회 쿼리 실행'], ['결제 서비스', '결제 요청 amount=30000'], ['결제 서비스', '외부 결제사 호출']];
    function push(s, k, n) { ev.push({ s: s, k: k, snap: { n: n } }); }
    push(c.prop ? '요청이 게이트웨이에 도착합니다. 추적 번호가 없는 요청이므로 새 Trace ID(' + TID + '…)를 만듭니다. 이 요청이 끝날 때까지 이 번호가 따라다닙니다. 게이트웨이의 처리 구간이 첫 번째 스팬입니다.' : '요청이 게이트웨이에 도착합니다. 게이트웨이는 자기 로그를 남기고 주문 서비스를 호출합니다.', '', 1);
    push(c.prop ? '게이트웨이가 주문 서비스를 호출할 때 HTTP 헤더에 Trace ID와 자기 스팬 ID를 실어 보냅니다. 주문 서비스는 같은 Trace ID를 이어받고, 자신의 구간을 새 스팬으로 기록합니다(부모는 게이트웨이의 스팬).' : '주문 서비스가 요청을 받아 처리합니다. 누가 보낸 어떤 요청의 일부인지는 알지 못합니다.', '', 2);
    push('주문 서비스가 DB를 조회합니다(' + d.db + 'ms).' + (c.prop ? ' 이 쿼리도 하나의 스팬으로 기록됩니다.' : ''), d.db > 500 ? 'bad' : '', 3);
    push('주문 서비스가 결제 서비스를 호출합니다.' + (c.prop ? ' 이번에도 헤더로 Trace ID가 전달됩니다. 로그를 남길 때마다 MDC에 들어 있는 Trace ID가 자동으로 함께 찍힙니다.' : ' 결제 서비스의 로그에는 주문 서비스와 이어 줄 단서가 없습니다.'), '', 4);
    push('결제 서비스가 외부 결제사 API를 호출합니다(' + d.pg + 'ms). 응답이 돌아오면 거꾸로 결제 서비스, 주문 서비스, 게이트웨이 순으로 스팬이 닫힙니다. 전체 ' + total + 'ms.', d.pg > 500 ? 'bad' : '', 5);
    if (c.prop) push('추적 시스템(Zipkin, Tempo 등)에서 Trace ID 하나로 조회하면 다섯 구간이 시간 축 위에 계단 모양으로 그려집니다. ' + (c.slow === 'none' ? '모든 구간이 짧습니다.' : '가장 긴 막대가 "' + spans[mi][0] + '"입니다. 어디가 느린지 바로 보입니다.'), 'good', 6);
    else push('로그는 세 서비스에 각각 남아 있습니다. 같은 시각에 수백 건의 요청이 섞여 있어서, 이 요청의 로그가 어느 것인지 시각과 주문 번호로 짐작해 맞춰 봐야 합니다. 구간별 소요 시간도 직접 계산해야 합니다.', 'bad', 6);
    sum.push(c.prop ? 'Trace ID는 요청 하나 전체에 붙는 번호이고, 스팬은 그 안의 한 구간(서비스 하나의 처리, 쿼리 하나, 외부 호출 하나)입니다. 스팬마다 부모 스팬을 기록하므로 호출 관계가 트리로 복원됩니다.' : '서비스가 나뉘면 요청 하나의 흔적도 여러 곳에 흩어집니다. 공통 번호를 헤더로 전달하고 모든 로그에 찍는 것이 분산 추적의 출발점입니다.');
    sum.push('로그는 "무슨 일이 있었나", 지표는 "전체적으로 얼마나", 추적은 "이 요청이 어디서 얼마나"를 알려 줍니다. 로그에도 Trace ID를 찍어 두면 추적 화면에서 느린 구간을 찾은 뒤 그 번호로 로그를 검색할 수 있습니다.');
    return { events: ev, summary: sum, spans: spans, total: total, ids: ids, logs: logs, mi: mi, row: [total + 'ms', spans[mi][0] + ' (' + own[mi] + 'ms)', c.prop ? 'Trace ID 하나로 조회' : '서비스별 로그를 시각으로 맞춰 봄'] };
  },
  render: function (v, sim, t, H, shown) {
    var c = sim.c, last = shown[shown.length - 1], n = last ? last.snap.n : 0;
    H.table(v, ['서비스', '로그의 추적 번호', '로그 내용'], sim.logs.slice(0, Math.min(n, 5)).map(function (l, i) { return { cells: [l[0], { v: sim.ids[i], cls: c.prop ? 'good' : 'bad' }, l[1]] }; }), '각 서비스에 남은 로그');  },
  // 그림: 요청 하나가 거친 구간을 시간 순서의 막대로 그린다. 막대의 길이가 그 구간이 차지한 시간이다.
  draw: function (P, sim, shown) {
    var c = sim.c, last = shown[shown.length - 1], n = last ? last.snap.n : 0, total = sim.spans[0][2];
    P.size(680, 260);
    P.region('tr', 16, 16, 648, 228, c.prop ? '추적 화면: 같은 Trace ID로 묶인 구간들' : '추적 번호가 전달되지 않아 로그에 번호가 없음');
    sim.spans.forEach(function (sp, i) {
      var y = 50 + i * 36, on = i < n, slow = n >= 6 && i === sim.mi && c.slow !== 'none';
      P.text('nm' + i, 28, y + 17, sp[0], { cls: on ? '' : 'mut' });
      if (c.prop) { if (on) P.box('bar' + i, 170 + 480 * sp[1] / total, y, Math.max(4, 480 * sp[2] / total), 24, { cls: slow ? 'bad' : 'wait' }); P.text('ms' + i, 652, y + 17, on ? sp[2] + 'ms (자체 ' + sp[3] + 'ms)' : '', { anchor: 'end', cls: slow ? 'bad' : 'mut' }); }
      else if (on) P.box('id' + i, 170, y, 240, 24, { cls: 'bad', sub: '추적 번호 ' + sim.ids[i], mono: true, center: true });
    });
    P.note(c.prop ? '막대의 위치가 시작 시각, 길이가 걸린 시간입니다. 안쪽 구간은 바깥 구간의 시간에 포함됩니다. 빨간 막대가 실제로 시간을 쓴 구간이며, "자체" 시간이 큰 곳이 원인입니다.' : '추적 번호가 없어서 이 로그들이 같은 요청의 것인지 알 수 없습니다. 구간을 한 줄로 이어 볼 수 없으므로 어디가 느린지도 찾기 어렵습니다.');
  },
  assume: '서비스 네 개를 차례로 호출하는 단순한 구조이고 시간은 예시 값입니다. Trace ID와 스팬, 헤더로 전파하는 방식은 W3C Trace Context 표준과 OpenTelemetry, Micrometer Tracing 문서의 설명을 따랐습니다. 실제로는 모든 요청을 기록하지 않고 일부만 표본으로 수집하는 경우가 많습니다.',
});

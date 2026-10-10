Lab.register({
  id: 'shard', nav: '샤딩', cat: '데이터베이스', mode: 'step',
  title: '데이터를 여러 DB에 나누면 생기는 일',
  intro: '테이블 하나가 DB 한 대로 감당할 수 없을 만큼 커지면, 행을 여러 DB(샤드)에 나눠 담습니다. 어느 행이 어느 샤드로 갈지는 샤드 키와 나누는 규칙이 정합니다. 주문 120건을 나눠 담으며 규칙에 따라 쏠림이 어떻게 달라지는지, 샤드를 늘릴 때 무슨 일이 생기는지 보세요.',
  terms: ['샤딩과 파티셔닝', '스케일 업과 스케일 아웃', '레플리케이션(복제)'], ranks: ['dbengine', 'traffic', 'nosql'],
  controls: [
    { id: 'n', label: '샤드 수', type: 'range', min: 2, max: 6, value: 4, fmt: function (v) { return v + '개'; } },
    { id: 'how', label: '나누는 규칙', type: 'select', value: 'hash', options: [['hash', '해시: 회원 번호 % 샤드 수'], ['range', '범위: 주문 번호 구간별'], ['hot', '해시인데 한 회원의 주문이 유독 많다']] },
    { id: 'grow', label: '샤드를 하나 더 늘린다', type: 'check', value: false },
  ],
  presets: [
    { t: '처음 설정으로', d: '회원 번호를 4로 나눈 나머지로 분배. 고르게 퍼집니다.', v: { n: 4, how: 'hash', grow: false } },
    { t: '주문 번호 구간으로 나누면', d: '새 주문은 전부 마지막 샤드로 갑니다.', v: { n: 4, how: 'range', grow: false } },
    { t: '특정 회원의 주문이 많으면', d: '그 회원이 속한 샤드만 커집니다.', v: { n: 4, how: 'hot', grow: false } },
    { t: '해시 방식에서 샤드 추가', d: '4개에서 5개로. 대부분의 데이터가 이사해야 합니다.', v: { n: 4, how: 'hash', grow: true } },
    { t: '범위 방식에서 샤드 추가', d: '기존 데이터는 그대로 두고 새 구간만 받습니다.', v: { n: 4, how: 'range', grow: true } },
  ],
  code: function (c) {
    if (c.how === 'range') return '// 주문 번호 구간으로 샤드를 정한다\nint shardOf(long orderId) {\n    return (int) ((orderId - 1) / ' + Math.ceil(120 / c.n) + ');     // 1~' + Math.ceil(120 / c.n) + '번은 샤드 0, 그다음은 샤드 1 …\n}';
    return '// 회원 번호를 샤드 수로 나눈 나머지로 샤드를 정한다\nint shardOf(long memberId) {\n    return (int) (memberId % ' + c.n + ');\n}\n\n// 조회할 때도 같은 계산으로 샤드를 찾는다\nDataSource ds = shards.get(shardOf(memberId));';
  },
  label: function (c) { return '샤드 ' + c.n + '개 · ' + { hash: '해시(회원 번호)', range: '범위(주문 번호)', hot: '해시 + 주문 많은 회원' }[c.how] + (c.grow ? ' · 샤드 추가' : ''); },
  columns: ['가장 큰 샤드 / 가장 작은 샤드', '새 주문이 들어가는 곳', '샤드 추가 시 옮길 데이터', '회원 한 명의 주문 조회'],
  simulate: function (c) {
    var N = c.n, TOTAL = 120, per = Math.ceil(TOTAL / N), orders = [], ev = [], sum = [], i;
    for (i = 1; i <= TOTAL; i++) orders.push({ id: i, mem: c.how === 'hot' && i % 3 === 0 ? 7 : (i * 7 + 3) % 40 + 1 });
    function place(o, n, perN) { return c.how === 'range' ? Math.min(n - 1, Math.floor((o.id - 1) / perN)) : o.mem % n; }
    function dist(n, perN) { var d = []; for (var k = 0; k < n; k++) d.push(0); orders.forEach(function (o) { d[place(o, n, perN)]++; }); return d; }
    var d1 = dist(N, per), mx = Math.max.apply(null, d1), mn = Math.min.apply(null, d1);
    function push(s, k, d, extra) { ev.push({ s: s, k: k, snap: { d: d, extra: extra || '' } }); }
    push('주문 ' + TOTAL + '건을 샤드 ' + N + '개에 나눠 담습니다. ' + (c.how === 'range' ? '주문 번호 ' + per + '개씩 구간을 잘라 샤드에 배정합니다.' : '주문의 회원 번호를 샤드 수(' + N + ')로 나눈 나머지가 샤드 번호입니다. 같은 회원의 주문은 항상 같은 샤드에 모입니다.'), '', d1.map(function () { return 0; }));
    push('분배 결과입니다. 가장 많은 샤드 ' + mx + '건, 가장 적은 샤드 ' + mn + '건.' + (c.how === 'hot' ? ' 회원 7번의 주문이 전체의 3분의 1이라서, 그 회원이 속한 샤드 ' + (7 % N) + '번에 몰렸습니다. 해시는 키를 고르게 나누지만, 키 하나에 딸린 데이터가 많으면 소용이 없습니다.' : c.how === 'range' ? ' 지금은 고르지만 이것은 과거 데이터 기준입니다.' : ' 회원 번호가 고르게 퍼져 있어 샤드별 건수가 비슷합니다.'), mx > mn * 2 ? 'bad' : 'good', d1);
    var newTo = c.how === 'range' ? '마지막 샤드 한 곳' : '회원에 따라 모든 샤드에 분산';
    push(c.how === 'range' ? '새 주문은 번호가 계속 커지므로 전부 마지막 샤드 ' + (N - 1) + '번으로 들어갑니다. 쓰기 부하가 샤드 하나에 몰리고(핫스팟), 나머지 샤드는 한가합니다.' : '새 주문은 주문한 회원의 번호에 따라 여러 샤드로 흩어집니다. 쓰기 부하가 분산됩니다.', c.how === 'range' ? 'bad' : 'good', d1, c.how === 'range' ? '새 주문 → 샤드 ' + (N - 1) : '새 주문 → 여러 샤드');
    var q = c.how === 'range' ? '모든 샤드에 물어봐야 함' : '샤드 1곳';
    push(c.how === 'range' ? '"회원 7번의 주문 목록" 조회: 주문 번호로 나눴으므로 이 회원의 주문이 어느 샤드에 있는지 알 수 없습니다. 모든 샤드에 질의해 결과를 합쳐야 합니다. 반대로 "주문 번호 50번 조회"는 한 샤드만 보면 됩니다.' : '"회원 7번의 주문 목록" 조회: 7 % ' + N + ' = ' + (7 % N) + '번 샤드만 보면 됩니다. 반대로 "어제 주문 전체"처럼 회원 번호 없이 찾는 조회는 모든 샤드에 질의해야 합니다.', '', d1, '조회 대상: ' + q);
    var moved = '-';
    if (c.grow) {
      var N2 = N + 1;
      if (c.how === 'range') { var d2 = d1.concat([0]); moved = '0건 (0%)'; push('샤드를 하나 추가합니다. 기존 구간은 그대로 두고, ' + (TOTAL + 1) + '번 이후의 새 주문만 새 샤드가 받습니다. 옮길 데이터가 없습니다. 다만 쓰기가 한 샤드에 몰리는 문제는 그대로 새 샤드로 옮겨 갑니다.', 'good', d2); }
      else { var mv = orders.filter(function (o) { return o.mem % N !== o.mem % N2; }).length, d3 = dist(N2, per); moved = mv + '건 (' + Math.round(mv / TOTAL * 100) + '%)'; push('샤드를 하나 추가해 ' + N2 + '개가 됩니다. 규칙이 "% ' + N + '"에서 "% ' + N2 + '"로 바뀌면서 나머지 값이 대부분 달라집니다. ' + TOTAL + '건 중 ' + mv + '건(' + Math.round(mv / TOTAL * 100) + '%)이 다른 샤드로 이사해야 합니다. 운영 중에 하기에는 매우 큰 작업입니다.', 'bad', d3); }
    }
    sum.push('샤드별 건수: ' + d1.join(', ') + '. 새 주문이 들어가는 곳: ' + newTo + '. 회원 한 명의 주문 조회: ' + q + '.' + (c.grow ? ' 샤드 추가 시 옮길 데이터: ' + moved + '.' : ''));
    sum.push('샤드 키는 한 번 정하면 바꾸기 매우 어렵습니다. 가장 자주 쓰는 조회 조건이 샤드 키여야 한 샤드만 보고 끝납니다. 샤드 키가 없는 조회, 샤드에 걸친 조인과 트랜잭션은 어려워집니다.');
    if (c.grow && c.how !== 'range') sum.push('나머지 연산 방식은 샤드 수가 바뀌면 거의 전부 재배치됩니다. 이를 줄이려고 일관된 해싱(샤드를 추가해도 그 샤드가 맡을 몫만 이동)이나, 키 범위를 미리 많은 조각으로 나눠 두고 조각 단위로 옮기는 방식을 씁니다.');
    sum.push('샤딩은 쓰기와 데이터 양을 나누는 마지막 수단입니다. 그 전에 인덱스와 쿼리 개선, 캐시, 읽기 전용 복제본, 오래된 데이터 분리를 먼저 검토합니다.');
    return { events: ev, summary: sum, row: [mx + '건 / ' + mn + '건', newTo, c.grow ? moved : '-', q] };
  },
  render: function (v, sim, t, H, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : null;
    if (!s) { H.text(v, '실행을 누르면 시작합니다.'); return; }
    var mx = Math.max.apply(null, s.d.concat([1])), ln = H.lanes(v);
    s.d.forEach(function (x, i) { H.lane(ln, '샤드 ' + i, x + '건', x === 0 ? 'none' : x > 120 / s.d.length * 1.5 ? 'bad' : '', x ? x / Math.max(mx, 60) : undefined); });
    if (s.extra) H.text(v, s.extra);
  },
  // 그림: 위에 라우터, 아래에 샤드들. 샤드 안의 막대 높이가 담긴 주문 건수다.
  draw: function (P, sim, shown) {
    var c = sim.c, last = shown[shown.length - 1], s = last ? last.snap : { d: [], extra: '' }, d = s.d, n = d.length || c.n, w = (648 - (n - 1) * 10) / n, mx = Math.max.apply(null, d.concat([60])), ex = s.extra || '';
    var newAll = ex.indexOf('여러 샤드') >= 0, newOne = /새 주문 → 샤드 (\d+)/.exec(ex), qAll = ex.indexOf('모든 샤드') >= 0, qOne = ex.indexOf('샤드 1곳') >= 0 ? 7 % n : -1;
    P.size(680, 330);
    P.box('rt', 160, 16, 360, 40, { cls: 'wait', center: true, title: c.how === 'range' ? '라우터: 주문 번호 구간으로 샤드를 고름' : '라우터: 회원 번호 % ' + n + ' 로 샤드를 고름' });
    for (var i = 0; i < n; i++) {
      var x = 16 + i * (w + 10), cnt = d[i] || 0, h = Math.max(2, 120 * cnt / mx), on = qAll || qOne === i, hit = newAll || (newOne && +newOne[1] === i);
      P.box('sh' + i, x, 106, w, 184, { cls: 'plain' + (on ? ' now' : ''), title: '샤드 ' + i, sub: cnt + '건', center: true });
      P.box('fill' + i, x + 8, 282 - h, w - 16, h, { cls: cnt > 120 / n * 1.5 ? 'bad' : cnt ? 'good' : 'ghost' });
      P.arrow('ar' + i, 'rt:b:' + ((i + 0.5) / n), 'sh' + i + ':t', { cls: hit ? 'hot' : 'mut' });
    }
    if (ex) P.text('ex', 340, 314, ex + (qOne >= 0 ? ' (샤드 ' + qOne + ')' : ''), { anchor: 'middle', bold: true });
    P.note('막대의 높이가 그 샤드에 담긴 주문 건수입니다. 빨간 막대는 평균보다 훨씬 많이 몰린 샤드입니다. 굵은 화살표는 새 주문이 들어가는 샤드, 굵은 테두리는 조회할 때 물어봐야 하는 샤드입니다.');
  },
  assume: '주문 120건, 회원 40명의 작은 예입니다. 회원 번호는 주문에 고르게 배정했고, "주문 많은 회원" 설정에서는 주문 세 건 중 한 건을 회원 7번의 것으로 두었습니다. 샤드 수가 바뀔 때 이동하는 비율은 이 데이터로 실제 계산한 값입니다. 샤드마다 복제본을 두는 구성이나 샤드 위치를 관리하는 라우터는 생략했습니다. 샤드 수 2~6개에서 하나를 늘릴 때 옮겨야 하는 건수를 자바에서 따로 계산해 화면의 값과 일치하는 것을 확인했습니다.',
});

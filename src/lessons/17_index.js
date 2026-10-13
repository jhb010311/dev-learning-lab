Lab.register({
  id: 'index', nav: '인덱스와 풀 스캔', cat: '데이터베이스', mode: 'step',
  title: '인덱스가 있는데 왜 안 탈까',
  intro: '조건에 맞는 행을 찾는 방법은 두 가지입니다. 테이블을 처음부터 끝까지 읽는 방법(풀 스캔)과, 인덱스에서 위치를 찾아 그 행만 읽는 방법입니다. 어느 쪽이 싼지는 조건에 걸리는 행의 비율에 달려 있고, 옵티마이저가 통계를 보고 고릅니다.',
  terms: ['인덱스', 'B-트리 인덱스', '풀 테이블 스캔', '실행 계획(EXPLAIN)', '옵티마이저', '카디널리티와 선택도'], ranks: ['index', 'tuning', 'dbengine'],
  controls: [
    { id: 'rows', label: '테이블 행 수', type: 'select', value: '100000', options: [['1000', '1천 행'], ['100000', '10만 행'], ['10000000', '1천만 행']] },
    { id: 'sel', label: '조건에 걸리는 행의 비율', type: 'select', value: '0.1', options: [['0.1', '0.1%'], ['1', '1%'], ['10', '10%'], ['20', '20%'], ['30', '30%'], ['50', '50%']] },
    { id: 'idx', label: '조건 컬럼에 인덱스가 있다', type: 'check', value: true },
    { id: 'force', label: '인덱스를 강제로 쓰게 한다 (FORCE INDEX)', type: 'check', value: false, show: function (c) { return c.idx; } },
  ],
  presets: [
    { t: '처음 설정으로', q: '10만 행 테이블에서 조건에 걸리는 행이 0.1%이고 조건 컬럼에 인덱스가 있으면 어떤 방법으로 읽나', d: '10만 행 중 0.1%만 조건에 맞습니다. 인덱스로 100행만 읽습니다.', v: { rows: '100000', sel: '0.1', idx: true, force: false } },
    { t: '같은 쿼리, 인덱스 없음', q: '같은 쿼리에서 조건 컬럼의 인덱스를 없애면', d: '100행을 찾으려고 10만 행을 다 읽습니다.', v: { rows: '100000', sel: '0.1', idx: false, force: false } },
    { t: '절반이 조건에 맞을 때', q: '조건에 걸리는 행의 비율을 50%로 바꾸면', d: '인덱스가 있어도 옵티마이저는 풀 스캔을 고릅니다.', v: { rows: '100000', sel: '50', idx: true, force: false } },
    { t: '그래도 인덱스를 강제하면', q: '조건에 걸리는 행이 50%인데 FORCE INDEX로 인덱스를 강제로 쓰게 하면', d: '오히려 더 비쌉니다.', v: { rows: '100000', sel: '50', idx: true, force: true } },
    { t: '경계 근처: 20%와 30%', q: '조건에 걸리는 행의 비율을 20%로 바꾸면', d: '20%에서 실행해 보고 30%로 바꿔 비교해 보세요.', v: { rows: '100000', sel: '20', idx: true, force: false } },
    { t: '1천만 행에서 인덱스 없이', q: '테이블 행 수를 1천만 행으로 늘리고 조건 컬럼의 인덱스를 없애면', d: '행이 늘어난 만큼 그대로 느려집니다.', v: { rows: '10000000', sel: '0.1', idx: false, force: false } },
  ],
  code: function (c) {
    return (c.idx ? 'CREATE INDEX idx_orders_status ON orders (status);\n\n' : '-- status 컬럼에 인덱스 없음\n\n') + 'SELECT *\n  FROM orders' + (c.idx && c.force ? ' FORCE INDEX (idx_orders_status)' : '') + "\n WHERE status = 'CANCELED';   -- 전체의 " + c.sel + '%';
  },
  label: function (c) { return this.num(+c.rows) + '행 · 조건 ' + c.sel + '% · 인덱스 ' + (c.idx ? '있음' + (c.force ? ' (강제)' : '') : '없음'); },
  num: function (x) { return String(Math.round(x)).replace(/\B(?=(\d{3})+(?!\d))/g, ','); },
  columns: ['선택된 방법', '읽은 행', '결과 행', '버린 행', '상대 비용'],
  simulate: function (c) {
    var N = +c.rows, matched = Math.max(1, Math.round(N * (+c.sel) / 100)), W = 4, h = Math.max(1, Math.ceil(Math.log(N) / Math.log(500))), num = this.num, ev = []; var J = function (v, a, b) { var s = String(v), ch = s.charCodeAt(s.length - 1), k = ch >= 0xAC00 && ch <= 0xD7A3 ? (ch - 0xAC00) % 28 : [1, 8, 0, 1, 0, 0, 1, 8, 8, 0]['0123456789'.indexOf(s.slice(-1))] || 0; return s + (a === '으로' ? (k && k !== 8 ? a : b) : k ? a : b); };   // 값 뒤에 붙일 조사를 고른다
    var costFull = N, costIdx = matched * W + h, useIdx = c.idx && (c.force || costIdx < costFull), plan = useIdx ? 'index' : 'full';
    function push(s, k, stage) { ev.push({ s: s, k: k, snap: { stage: stage } }); }
    push('쿼리가 도착했습니다. 옵티마이저가 실행 방법을 정하려고 통계 정보를 봅니다. 테이블은 약 ' + num(N) + '행이고, status = \'CANCELED\' 조건에는 약 ' + num(matched) + '행(' + c.sel + '%)이 걸릴 것으로 예상합니다.', '', 1);
    push('방법 1, 풀 스캔: 테이블을 처음부터 끝까지 순서대로 읽으며 조건을 확인합니다. ' + num(N) + '행을 읽습니다. 순서대로 읽는 것은 한 건당 비용이 쌉니다. 예상 비용 ' + num(costFull) + '.', '', 2);
    if (c.idx) push('방법 2, 인덱스: 인덱스에서 조건에 맞는 ' + num(matched) + '건의 위치를 찾고, 한 건씩 테이블로 가서 나머지 컬럼을 읽습니다. 읽는 행은 적지만 한 건마다 테이블의 여기저기를 찾아가야 해서 건당 비용이 비쌉니다(여기서는 4배로 가정). 예상 비용 ' + num(costIdx) + '.', '', 3);
    else push('방법 2는 없습니다. status 컬럼에 인덱스가 없어서 풀 스캔 외에는 선택지가 없습니다.', 'bad', 3);
    if (c.idx && c.force && costIdx >= costFull) push('옵티마이저의 계산으로는 풀 스캔이 더 싸지만, FORCE INDEX 지시가 있어 인덱스를 씁니다.', 'bad', 4);
    else if (c.idx) push('옵티마이저가 비용이 더 낮은 ' + (useIdx ? '인덱스를' : '풀 스캔을') + ' 고릅니다.' + (useIdx ? '' : ' 인덱스가 있어도 쓰지 않는 것이 더 싸다고 판단했습니다.'), useIdx ? 'good' : '', 4);
    if (useIdx) {
      push('인덱스(B-트리)의 루트에서 출발해 ' + h + '단계를 내려가 조건에 맞는 첫 위치를 찾습니다. 각 단계에서는 정렬된 키 사이에서 범위를 좁혀 갑니다. 행이 ' + num(N) + '개여도 ' + h + '단계면 도착합니다.', '', 5);
      push('찾은 위치부터 인덱스를 옆으로 읽어 나가며 조건에 맞는 ' + num(matched) + '건을 얻고, 건마다 테이블에서 해당 행을 읽어 옵니다. 조건에 맞지 않는 행은 읽지 않았습니다.', 'good', 6);
    } else {
      push('테이블의 첫 행부터 마지막 행까지 ' + num(N) + '행을 모두 읽습니다. 행마다 status를 확인해 ' + num(matched) + '행만 남기고 ' + num(N - matched) + '행은 읽고 나서 버립니다.', c.idx ? '' : 'bad', 6);
    }
    var read = useIdx ? matched : N, cost = useIdx ? costIdx : costFull, sum = [];
    if (!c.idx) sum.push('인덱스가 없으면 결과가 몇 건이든 테이블 전체를 읽어야 합니다. 행이 10배가 되면 읽는 양도 10배가 됩니다. 인덱스가 있었다면 예상 비용은 ' + J(num(costIdx), '으로', '로') + ' ' + (costIdx < costFull ? '풀 스캔의 약 ' + (Math.round(costFull / costIdx) >= 2 ? Math.round(costFull / costIdx) + '분의 1' : Math.round(costIdx / costFull * 100) + '% 수준') + '이었을 것입니다.' : '오히려 풀 스캔보다 비쌌을 것입니다. 이 조건에는 인덱스가 도움이 되지 않습니다.'));
    else if (useIdx && !(c.force && costIdx >= costFull)) sum.push('조건에 걸리는 비율이 낮을수록(선택도가 좋을수록) 인덱스의 효과가 큽니다. 풀 스캔이었다면 비용은 ' + num(costFull) + '으로 약 ' + (Math.round(costFull / costIdx) >= 2 ? Math.round(costFull / costIdx) : (Math.round(costFull / costIdx * 10) / 10)) + '배였습니다.');
    else if (useIdx) sum.push('인덱스를 강제했더니 비용이 ' + J(num(costIdx), '으로', '로') + ', 풀 스캔(' + num(costFull) + ')보다 비쌉니다. 옵티마이저의 판단이 맞았습니다. 힌트는 통계가 틀렸다는 근거가 있을 때만 씁니다.');
    else sum.push('조건에 걸리는 행이 너무 많으면, 한 건씩 찾아가는 비용의 합이 전체를 순서대로 읽는 비용을 넘습니다. 그래서 인덱스가 있어도 풀 스캔이 선택됩니다. 성별처럼 값의 종류가 적고 고르게 퍼진 컬럼은 어느 값을 찾아도 걸리는 행이 많아서 인덱스 효과가 작은 이유입니다.');
    return { events: ev, summary: sum, k: { N: N, matched: matched, costFull: costFull, costIdx: costIdx, useIdx: useIdx, h: h, read: read, cost: cost }, row: [useIdx ? '인덱스' : '풀 스캔', num(read) + '행', num(matched) + '행', num(read - matched) + '행', num(cost)] };
  },
  render: function (v, sim, t, H, shown) {
    var c = sim.c, k = sim.k, num = this.num, last = shown[shown.length - 1], st = last ? last.snap.stage : 0, mx = Math.max(k.costFull, c.idx ? k.costIdx : 0);
    H.title(v, '옵티마이저가 비교하는 두 방법의 예상 비용'); var ln = H.lanes(v);
    H.lane(ln, '풀 스캔', st >= 2 ? num(k.N) + '행 읽음 × 건당 1 = ' + num(k.costFull) : '계산 전', st >= 4 && !k.useIdx ? 'good' : st >= 2 ? '' : 'none', st >= 2 ? k.costFull / mx : undefined);
    H.lane(ln, '인덱스', !c.idx ? '인덱스 없음' : st >= 3 ? num(k.matched) + '행 읽음 × 건당 4 + 탐색 ' + k.h + ' = ' + num(k.costIdx) : '계산 전', !c.idx ? 'bad' : st >= 4 && k.useIdx ? 'good' : st >= 3 ? '' : 'none', c.idx && st >= 3 ? k.costIdx / mx : undefined);
    if (st >= 4) H.table(v, ['type', 'key', 'rows', 'Extra'], [{ cells: [k.useIdx ? 'ref' : 'ALL', k.useIdx ? 'idx_orders_status' : 'NULL', num(k.useIdx ? k.matched : k.N), k.useIdx ? '' : 'Using where'] }], 'EXPLAIN으로 보면 (주요 컬럼만)');
    if (st >= 6) H.counters(v, [[num(k.read), '읽은 행'], [num(k.matched), '결과 행'], [num(k.read - k.matched), '읽고 버린 행']]);
  },
  // 그림: 왼쪽에 인덱스(B-트리), 오른쪽에 테이블. 둘 다 20칸으로 줄여 그린다.
  // 인덱스의 잎에서는 조건에 맞는 항목이 붙어 있지만, 그것이 가리키는 테이블 행은 흩어져 있다.
  draw: function (P, sim, shown) {
    var c = sim.c, k = sim.k, last = shown[shown.length - 1], st = last ? last.snap.stage : 0, m = Math.max(1, Math.round(20 * (+c.sel) / 100));
    var perm = [3, 17, 8, 12, 0, 15, 6, 19, 10, 5], hit = {}, done = st >= 6, viaIdx = k.useIdx; perm.slice(0, m).forEach(function (r) { hit[r] = 1; });
    P.size(680, 330);
    P.region('ix', 16, 16, 340, 298, c.idx ? '인덱스 (status 값 순서로 정렬)' : '인덱스');
    P.region('tb', 400, 16, 264, 298, 'orders 테이블 (저장된 순서)');
    for (var j = 0; j < 20; j++) P.box('r' + j, 416 + (j % 4) * 60, 56 + Math.floor(j / 4) * 48, 52, 36, { cls: hit[j] ? (done ? 'good' : 'wait') : done && !viaIdx ? 'bad' : 'plain', sub: hit[j] ? '맞음' : '', center: true });
    if (!c.idx) P.text('noix', 186, 160, 'status 컬럼에 인덱스가 없습니다', { cls: 'bad', anchor: 'middle' });
    else {
      var on = viaIdx && st >= 5;
      P.box('root', 136, 50, 100, 26, { cls: on ? 'hot' : 'plain', sub: '루트', center: true });
      P.box('brL', 46, 104, 110, 26, { cls: on ? 'hot' : 'plain', sub: '가지', center: true });
      P.box('brR', 216, 104, 110, 26, { cls: 'plain', sub: '가지', center: true });
      P.arrow('a1', 'root:b:0.3', 'brL:t', { cls: on ? 'hot' : 'mut' }); P.arrow('a2', 'root:b:0.7', 'brR:t', { cls: 'mut' });
      P.text('lfl', 30, 166, '잎: 값 순서로 놓인 항목', { cls: 'mut' });
      for (var i = 0; i < 20; i++) P.box('l' + i, 30 + i * 15.6, 176, 13, 24, { cls: i < m ? (viaIdx && done ? 'good' : on ? 'hot' : 'wait') : 'plain' });
      P.arrow('a3', 'brL:b', 'l4:t', { cls: on ? 'hot' : 'mut' }); P.arrow('a4', 'brR:b', 'l15:t', { cls: 'mut' });
      if (viaIdx && done) for (var q = 0; q < m; q++) P.arrow('p' + q, 'l' + q + ':b', 'r' + perm[q] + ':l', { cls: 'good' });
      if (!viaIdx && st >= 4) P.text('skip', 186, 260, '인덱스가 있지만 쓰지 않습니다', { cls: 'mut', anchor: 'middle' });
    }
    P.note('테이블과 인덱스를 20칸으로 줄여 그렸습니다. 파란 칸은 조건에 맞는 행, 초록은 읽어서 결과가 된 행, 빨강은 읽고 나서 버린 행, 흰 칸은 읽지 않은 행입니다. 인덱스의 잎에서는 조건에 맞는 항목이 한곳에 모여 있지만, 그것이 가리키는 테이블 행은 여기저기 흩어져 있어 한 건씩 찾아가야 합니다.');
  },
  assume: '비용은 관계를 보이기 위한 단순한 모형입니다. 순서대로 읽는 한 건의 비용을 1, 인덱스를 거쳐 테이블에서 한 건을 읽는 비용을 4로 가정했습니다. 이 비율이면 조건에 걸리는 행이 약 25%를 넘을 때 풀 스캔이 유리해지는데, MySQL 관련 서적에서 흔히 말하는 "전체의 20~25%를 넘으면 풀 스캔이 낫다"는 경험칙에 맞춘 값입니다. 실제 옵티마이저는 페이지 수, 메모리에 올라와 있는 비율, 컬럼 통계 등을 더 세밀하게 계산하므로 경계는 상황마다 다릅니다. B-트리 단계 수는 한 노드에 키가 500개 들어간다고 보고 계산했습니다. SELECT *가 아니라 인덱스에 있는 컬럼만 조회하면 테이블에 가지 않아도 되어 계산이 달라지며, 이 내용은 "복합·커버링 인덱스" 실습에서 다룹니다.',
});

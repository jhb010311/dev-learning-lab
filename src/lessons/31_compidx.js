Lab.register({
  id: 'compidx', nav: '복합·커버링 인덱스', cat: '데이터베이스', mode: 'step',
  title: '복합 인덱스는 컬럼 순서대로만 쓸 수 있다',
  intro: '여러 컬럼을 묶은 인덱스는 첫 컬럼부터 차례로 정렬돼 있습니다. 그래서 WHERE 조건이 앞 컬럼부터 채워져야 탐색 범위를 좁힐 수 있고, 범위 조건을 만나면 그 뒤 컬럼은 범위를 좁히는 데 쓰이지 못합니다.',
  terms: ['복합 인덱스와 Leftmost Prefix', '커버링 인덱스', '클러스터드 인덱스와 세컨더리 인덱스', '카디널리티와 선택도', '실행 계획(EXPLAIN)'], ranks: ['index', 'tuning'],
  controls: [
    { id: 'ord', label: '인덱스의 컬럼 순서', type: 'select', value: 'msc', options: [['msc', '(member_id, status, created_at)'], ['mcs', '(member_id, created_at, status)']] },
    { id: 'm', label: 'WHERE member_id = 7', type: 'check', value: true },
    { id: 's', label: "WHERE status = 'PAID'", type: 'check', value: true },
    { id: 'd', label: "WHERE created_at >= '2026-09-01' (범위 조건)", type: 'check', value: true },
    { id: 'sel', label: '조회하는 컬럼', type: 'select', value: 'star', options: [['star', 'SELECT * (모든 컬럼)'], ['cov', 'SELECT member_id, status, created_at (인덱스에 있는 컬럼만)']] },
  ],
  presets: [
    { t: '처음 설정으로', d: '세 조건이 인덱스 순서와 맞아 세 컬럼 모두 범위를 좁힙니다.', v: { ord: 'msc', m: true, s: true, d: true, sel: 'star' } },
    { t: '첫 컬럼 조건을 빼면', d: 'member_id 조건이 없으면 이 인덱스로는 범위를 좁힐 수 없습니다.', v: { ord: 'msc', m: false, s: true, d: true, sel: 'star' } },
    { t: '가운데 컬럼 조건을 빼면', d: '첫 컬럼까지만 쓰이고, 날짜 조건은 인덱스를 읽으면서 걸러냅니다.', v: { ord: 'msc', m: true, s: false, d: true, sel: 'star' } },
    { t: '범위 조건 컬럼이 가운데 있으면', d: '(member_id, created_at, status). 범위 뒤의 status는 범위를 좁히지 못합니다.', v: { ord: 'mcs', m: true, s: true, d: true, sel: 'star' } },
    { t: '인덱스에 있는 컬럼만 조회', d: '테이블에 가지 않고 인덱스만 읽고 끝납니다(커버링 인덱스).', v: { ord: 'msc', m: true, s: true, d: true, sel: 'cov' } },
    { t: '첫 컬럼 조건 없이 인덱스 컬럼만 조회', d: '범위는 못 좁히지만 테이블 대신 인덱스 전체를 훑습니다.', v: { ord: 'msc', m: false, s: true, d: false, sel: 'cov' } },
  ],
  COLS: { m: ['member_id', 'member_id = 7', 0.001, 'eq'], s: ['status', "status = 'PAID'", 0.5, 'eq'], d: ['created_at', "created_at >= '2026-09-01'", 0.1, 'range'] },
  order: function (c) { return c.ord === 'msc' ? ['m', 's', 'd'] : ['m', 'd', 's']; },
  code: function (c) {
    var C = this.COLS, w = ['m', 's', 'd'].filter(function (k) { return c[k]; }).map(function (k) { return C[k][1]; });
    return 'CREATE INDEX idx_orders ON orders (' + this.order(c).map(function (k) { return C[k][0]; }).join(', ') + ');\n\nSELECT ' + (c.sel === 'star' ? '*' : 'member_id, status, created_at') + '\n  FROM orders' + (w.length ? '\n WHERE ' + w.join('\n   AND ') : '') + ';';
  },
  label: function (c) { var C = this.COLS; return '(' + this.order(c).map(function (k) { return C[k][0]; }).join(', ') + ') · 조건 ' + (['m', 's', 'd'].filter(function (k) { return c[k]; }).map(function (k) { return C[k][0]; }).join(', ') || '없음') + ' · ' + (c.sel === 'star' ? 'SELECT *' : '인덱스 컬럼만'); },
  num: function (x) { return String(Math.round(x)).replace(/\B(?=(\d{3})+(?!\d))/g, ','); },
  columns: ['범위를 좁힌 컬럼', 'type', '인덱스에서 읽은 항목', '테이블에서 읽은 행', 'Extra'],
  plan: function (c) {
    var C = this.COLS, ord = this.order(c), N = 1000000, used = [], filt = [], stop = false, scan = N, out = N;
    ord.forEach(function (k) { if (!c[k]) { stop = true; return; } if (stop) { filt.push(k); return; } used.push(k); if (C[k][3] === 'range') stop = true; });
    used.forEach(function (k) { scan *= C[k][2]; }); ['m', 's', 'd'].forEach(function (k) { if (c[k]) out *= C[k][2]; });
    var cov = c.sel === 'cov', type = used.length ? (used.some(function (k) { return C[k][3] === 'range'; }) ? 'range' : 'ref') : cov ? 'index' : 'ALL';
    var afterFilter = scan; filt.forEach(function (k) { afterFilter *= C[k][2]; });
    var idxRead = type === 'ALL' ? 0 : scan, tblRead = type === 'ALL' ? N : cov ? 0 : afterFilter;
    var extra = type === 'ALL' ? 'Using where' : cov ? (filt.length || type === 'index' || type === 'range' ? 'Using where; Using index' : 'Using index') : filt.length || type === 'range' ? 'Using index condition' : '';
    if (!c.m && !c.s && !c.d) extra = cov ? 'Using index' : '';
    return { used: used, filt: filt, type: type, idxRead: idxRead, tblRead: tblRead, out: out, extra: extra, cov: cov, N: N };
  },
  simulate: function (c) {
    var C = this.COLS, p = this.plan(c), ord = this.order(c), num = this.num, ev = [], sum = [];
    function push(s, k, stage) { ev.push({ s: s, k: k, snap: { stage: stage } }); }
    push('orders 테이블에는 100만 행이 있습니다. 인덱스는 ' + ord.map(function (k) { return C[k][0]; }).join(' → ') + ' 순서로 정렬돼 있습니다. 첫 컬럼이 같은 것끼리 모여 있고, 그 안에서 둘째 컬럼 순, 다시 그 안에서 셋째 컬럼 순입니다.', '', 1);
    ord.forEach(function (k, i) {
      var name = C[k][0];
      if (p.used.indexOf(k) >= 0) push((i + 1) + '번째 컬럼 ' + name + ': 조건 ' + C[k][1] + '이 있고, 앞 컬럼들이 모두 정해져 있으므로 이 조건으로 읽을 범위를 좁힙니다.' + (C[k][3] === 'range' ? ' 다만 범위 조건이라서, 이 범위 안에서는 다음 컬럼이 정렬돼 있지 않습니다. 뒤 컬럼은 범위를 좁히는 데 쓸 수 없습니다.' : ''), 'good', 2 + i);
      else if (p.filt.indexOf(k) >= 0 && p.type !== 'ALL') push((i + 1) + '번째 컬럼 ' + name + ': 조건은 있지만 앞에서 순서가 끊겨 범위를 좁히는 데는 쓰지 못합니다. 대신 인덱스 항목을 읽으면서 이 값을 확인해 걸러냅니다.', 'bad', 2 + i);
      else if (!c[k]) push((i + 1) + '번째 컬럼 ' + name + ': 이 컬럼에는 조건이 없습니다.' + (i < 2 ? ' 여기서 순서가 끊깁니다. 이 뒤의 컬럼은 전체에 걸쳐 정렬돼 있지 않으므로 범위를 좁히는 데 쓸 수 없습니다.' : ''), i < 2 ? 'bad' : '', 2 + i);
      else push((i + 1) + '번째 컬럼 ' + name + ': 조건은 있지만 첫 컬럼부터 순서가 끊겨 이 인덱스로 위치를 찾을 수 없습니다.', 'bad', 2 + i);
    });
    if (p.type === 'ALL') push('이 인덱스로는 시작 위치를 찾을 수 없고, 조회 컬럼이 인덱스에 다 들어 있지도 않습니다. 테이블 100만 행을 모두 읽으며 조건을 확인합니다(풀 스캔).', 'bad', 5);
    else if (p.type === 'index') push('범위를 좁히지는 못하지만, 필요한 컬럼이 모두 인덱스 안에 있습니다. 테이블보다 작은 인덱스를 처음부터 끝까지 읽습니다(인덱스 풀 스캔). 항목 ' + num(p.idxRead) + '개를 읽습니다.', '', 5);
    else push('인덱스에서 좁혀진 범위의 항목 ' + num(p.idxRead) + '개를 읽습니다.' + (p.filt.length ? ' 읽으면서 나머지 조건을 확인해 ' + num(p.idxRead * p.filt.reduce(function (a, k) { return a * C[k][2]; }, 1)) + '개만 남깁니다.' : ''), '', 5);
    if (p.type !== 'ALL') push(p.cov ? '조회하는 컬럼이 전부 인덱스에 들어 있으므로 테이블에 가지 않고 끝냅니다(커버링 인덱스). 테이블에서 읽은 행은 0입니다.' : 'SELECT *는 인덱스에 없는 컬럼도 필요합니다. 남은 ' + num(p.tblRead) + '건마다 테이블(클러스터드 인덱스)로 가서 행 전체를 읽어 옵니다.', p.cov ? 'good' : '', 6);
    var usedNames = p.used.map(function (k) { return C[k][0]; }).join(', ') || '없음';
    if (!p.used.length) sum.push('복합 인덱스는 첫 컬럼의 조건이 없으면 탐색에 쓸 수 없습니다. 자주 쓰는 조건의 컬럼, 그중에서도 "=" 조건으로 쓰이는 컬럼을 앞에 둡니다.');
    else if (p.filt.length) sum.push('순서가 끊긴 뒤의 조건(' + p.filt.map(function (k) { return C[k][0]; }).join(', ') + ')은 범위를 좁히지 못해, 필요한 것보다 많은 인덱스 항목을 읽었습니다. "=" 조건 컬럼을 앞에, 범위 조건 컬럼을 맨 뒤에 두면 세 컬럼 모두 범위를 좁힙니다.');
    else if (p.used.length === 3) sum.push('조건이 인덱스 순서대로 빠짐없이 이어져 세 컬럼 모두 범위를 좁혔습니다. WHERE에 적는 순서는 상관없고, 인덱스의 컬럼 순서가 기준입니다.');
    if (p.cov && p.type !== 'ALL') sum.push('세컨더리 인덱스에는 인덱스 컬럼과 기본 키만 들어 있어, 다른 컬럼이 필요하면 테이블을 한 번 더 찾아가야 합니다. 필요한 컬럼이 인덱스에 다 있으면 그 왕복이 사라집니다. SELECT *를 피하라는 이유 중 하나입니다.');
    if (!sum.length) sum.push('범위를 좁히는 데 쓰인 컬럼: ' + usedNames + '. 인덱스 항목 ' + num(p.idxRead) + '개, 테이블 행 ' + num(p.tblRead) + '개를 읽어 결과 약 ' + num(Math.max(1, p.out)) + '건을 얻었습니다.');
    return { events: ev, summary: sum, p: p, row: [usedNames, p.type, num(p.idxRead) + '개', num(p.tblRead) + '행', p.extra || '(없음)'] };
  },
  render: function (v, sim, t, H, shown) {
    var p = sim.p, num = this.num, last = shown[shown.length - 1], st = last ? last.snap.stage : 0;
    if (st >= 5) { H.counters(v, [[num(p.idxRead), '인덱스에서 읽은 항목'], [st >= 6 || p.type === 'ALL' ? num(p.tblRead) : '?', '테이블에서 읽은 행'], [num(Math.max(1, p.out)), '결과 행 (약)']]);
      H.table(v, ['type', 'key', 'Extra'], [{ cells: [p.type, p.type === 'ALL' ? 'NULL' : 'idx_orders', p.extra || ''] }], 'EXPLAIN으로 보면 (주요 컬럼만)'); }
  },
  // 그림: 인덱스 전체를 긴 띠로 보고, 컬럼을 하나 지날 때마다 읽을 범위가 어떻게 좁아지는지(또는 못 좁히는지) 그린다.
  draw: function (P, sim, shown) {
    var c = sim.c, p = sim.p, C = this.COLS, ord = this.order(c), num = this.num, last = shown[shown.length - 1], st = last ? last.snap.stage : 0, lo = 0, hi = 1;
    P.size(680, 330);
    P.region('ix', 16, 16, 648, 204, '인덱스 idx_orders 전체 (왼쪽 컬럼부터 차례로 정렬됨)');
    ord.forEach(function (k, i) {
      var y = 50 + i * 54, on = st >= 2 + i, used = p.used.indexOf(k) >= 0, filt = p.filt.indexOf(k) >= 0 && p.type !== 'ALL', w = hi - lo;
      P.text('n' + i, 28, y + 17, (i + 1) + '. ' + C[k][0], { bold: true });
      P.box('bar' + i, 150, y, 500, 24, { cls: 'ghost' });
      if (!on) { P.text('d' + i, 150, y + 40, c[k] ? '조건: ' + C[k][1] : '조건 없음', { cls: 'mut' }); return; }
      if (used) { if (k === 'm') { lo = lo + w * 0.4; hi = lo + w * 0.2; } else if (k === 's') lo = lo + w * 0.5; else lo = hi - w * 0.4; }
      P.box('seg' + i, 150 + 500 * lo, y, Math.max(6, 500 * (hi - lo)), 24, { cls: used ? 'good' : filt || c[k] ? 'bad' : 'wait' });
      P.text('d' + i, 150, y + 40, used ? C[k][1] + ' 조건으로 범위를 좁힘' : filt ? C[k][1] + ' 조건은 범위를 못 좁힘. 읽으면서 걸러냄' : c[k] ? C[k][1] + ' 조건을 쓰지 못함' : '조건 없음. 범위 그대로', { cls: used ? 'good' : filt || c[k] ? 'bad' : 'mut' });
    });
    P.region('rd', 16, 232, 648, 82, '읽은 양');
    var all = p.type === 'ALL';
    P.box('ir', 28, 264, 280, 36, st >= 5 ? { cls: all ? 'bad' : 'wait', title: all ? '인덱스로 위치를 못 찾음' : '인덱스에서 읽은 항목', right: num(p.idxRead) + '개' } : { cls: 'ghost', title: '인덱스에서 읽은 항목', right: '?' });
    P.box('tr', 372, 264, 280, 36, st >= 6 || (all && st >= 5) ? { cls: p.cov && !all ? 'good' : all ? 'bad' : 'wait', title: p.cov && !all ? '테이블에 가지 않음' : '테이블에서 읽은 행', right: num(p.tblRead) + '행' } : { cls: 'ghost', title: '테이블에서 읽은 행', right: '?' });
    if (st >= 6 && !all && !p.cov) P.arrow('go', 'ir:r', 'tr:l', { label: '건마다' });
    P.note('가로 띠 하나가 인덱스 전체입니다. 초록 부분이 그 컬럼까지 적용했을 때 읽어야 하는 범위이고, 빨간 부분은 조건이 있어도 범위를 좁히지 못한 것입니다. 폭은 좁혀지는 모습을 보이기 위한 것이며 실제 비율과는 다릅니다.');
  },
  assume: '100만 행 테이블에서 member_id = 7은 전체의 0.1%, status = \'PAID\'는 50%, 날짜 조건은 10%가 해당한다고 가정한 계산입니다. 인덱스 컬럼을 왼쪽부터 써야 하고 범위 조건 뒤의 컬럼은 탐색 범위를 좁히지 못한다는 규칙은 MySQL 공식 문서의 복합 인덱스 설명을 따랐습니다. 순서가 끊긴 뒤의 조건을 인덱스 단계에서 걸러내는 것(Using index condition)은 MySQL의 인덱스 컨디션 푸시다운 동작입니다. 실제 옵티마이저는 통계에 따라 다른 계획을 고를 수 있으며, 여기서는 이 인덱스를 쓴다고 전제했습니다. 실제 DB의 EXPLAIN 결과와 대조한 것은 아닙니다.',
});

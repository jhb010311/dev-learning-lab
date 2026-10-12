Lab.register({
  id: 'join', nav: 'JOIN과 GROUP BY', cat: '데이터베이스', mode: 'step',
  title: '조건을 ON에 쓰느냐 WHERE에 쓰느냐',
  intro: '회원 3명과 주문 4건을 조인합니다. 조인 종류, 조건을 쓰는 위치, 집계 방식에 따라 결과 행이 달라집니다. SQL은 FROM/JOIN → WHERE → GROUP BY → HAVING 순으로 처리되며, 단계마다 남는 행을 따라가 보면 이유가 보입니다.',
  terms: ['JOIN (INNER, OUTER)', 'GROUP BY, WHERE, HAVING', '기본 키, 유니크 키, 외래 키'], ranks: ['join', 'tuning'],
  controls: [
    { id: 'join', label: '조인 종류', type: 'select', value: 'LEFT', options: [['INNER', 'INNER JOIN'], ['LEFT', 'LEFT JOIN (LEFT OUTER JOIN)']] },
    { id: 'cond', label: "status = 'PAID' 조건을 쓰는 곳", type: 'select', value: 'where', options: [['none', '조건 없음'], ['on', 'ON 절 (조인 조건에 함께)'], ['where', 'WHERE 절']] },
    { id: 'agg', label: '집계', type: 'select', value: 'none', options: [['none', '집계 없음 (행 그대로)'], ['count', '회원별 주문 수 (GROUP BY)'], ['having', '주문이 2건 이상인 회원만 (HAVING)']] },
  ],
  presets: [
    { t: '처음 설정으로', q: 'LEFT JOIN인데 status = \'PAID\' 조건을 WHERE 절에 쓰면 주문 없는 회원 박민수는 어떻게 되나', d: 'LEFT JOIN인데 WHERE에 조건을 썼습니다. 주문 없는 회원이 사라집니다.', v: { join: 'LEFT', cond: 'where', agg: 'none' } },
    { t: '같은 조건을 ON으로 옮기면', q: 'status = \'PAID\' 조건을 ON 절로 옮기면', d: '주문 없는 회원도 NULL과 함께 남습니다.', v: { join: 'LEFT', cond: 'on', agg: 'none' } },
    { t: 'INNER JOIN', q: 'INNER JOIN을 쓰고 status 조건을 없애면', d: '양쪽에 짝이 있는 행만 나옵니다.', v: { join: 'INNER', cond: 'none', agg: 'none' } },
    { t: 'LEFT JOIN, 조건 없음', q: 'LEFT JOIN에서 status 조건을 없애면', d: '주문 없는 회원이 NULL로 채워져 한 줄 나옵니다.', v: { join: 'LEFT', cond: 'none', agg: 'none' } },
    { t: '회원별 결제 주문 수', q: 'status = \'PAID\' 조건을 ON 절에 쓰고 GROUP BY로 회원별 주문 수를 세면', d: 'LEFT JOIN + ON 조건이면 0건인 회원도 셉니다.', v: { join: 'LEFT', cond: 'on', agg: 'count' } },
    { t: '2건 이상인 회원만', q: 'status = \'PAID\' 조건을 ON 절에 쓰고 HAVING으로 주문이 2건 이상인 회원만 거르면', d: 'HAVING은 그룹으로 묶은 뒤에 걸러냅니다.', v: { join: 'LEFT', cond: 'on', agg: 'having' } },
  ],
  M: [[1, '김철수'], [2, '이영희'], [3, '박민수']],
  O: [[101, 1, 'PAID'], [102, 1, 'CANCELED'], [103, 2, 'PAID'], [104, 1, 'PAID']],
  code: function (c) {
    var agg = c.agg !== 'none';
    return 'SELECT m.name, ' + (agg ? 'COUNT(o.id) AS cnt' : 'o.id, o.status') + '\n  FROM member m\n  ' + (c.join === 'LEFT' ? 'LEFT JOIN' : 'INNER JOIN') + ' orders o\n    ON o.member_id = m.id' + (c.cond === 'on' ? "\n   AND o.status = 'PAID'" : '') + (c.cond === 'where' ? "\n WHERE o.status = 'PAID'" : '') + (agg ? '\n GROUP BY m.name' : '') + (c.agg === 'having' ? '\nHAVING COUNT(o.id) >= 2' : '') + ';';
  },
  label: function (c) { return c.join + ' JOIN · 조건 ' + { none: '없음', on: 'ON', where: 'WHERE' }[c.cond] + ' · ' + { none: '집계 없음', count: 'GROUP BY', having: 'HAVING' }[c.agg]; },
  columns: ['조인 직후 행 수', '최종 행 수', '주문 없는 회원(박민수)'],
  simulate: function (c) {
    var M = this.M, O = this.O, ev = [], sum = [], rows = [];
    function tab(rs) { return rs.map(function (r) { return { cells: [r.name, r.oid === null ? { v: 'NULL', cls: 'hot' } : String(r.oid), r.st === null ? { v: 'NULL', cls: 'hot' } : r.st] }; }); }
    function push(s, k, title, head, body) { ev.push({ s: s, k: k, snap: { title: title, head: head, body: body } }); }
    M.forEach(function (m) {
      var match = O.filter(function (o) { return o[1] === m[0] && (c.cond !== 'on' || o[2] === 'PAID'); });
      if (match.length) match.forEach(function (o) { rows.push({ name: m[1], oid: o[0], st: o[2] }); });
      else if (c.join === 'LEFT') rows.push({ name: m[1], oid: null, st: null });
    });
    var afterJoin = rows.length, hasPark = function (rs) { return rs.some(function (r) { return r.name === '박민수'; }); };
    push('1단계 FROM과 JOIN: 회원마다 ON 조건(' + (c.cond === 'on' ? "회원 번호가 같고 status가 'PAID'" : '회원 번호가 같음') + ')에 맞는 주문을 찾아 붙입니다. ' + (c.join === 'LEFT' ? '짝이 없는 회원도 버리지 않고, 주문 쪽 컬럼을 NULL로 채워 한 줄 남깁니다.' : '짝이 없는 회원은 결과에서 빠집니다.') + ' ' + afterJoin + '행이 됐습니다.', '', '조인 직후', ['m.name', 'o.id', 'o.status'], tab(rows));
    if (c.cond === 'where') {
      var before = rows.length, hadPark = hasPark(rows); rows = rows.filter(function (r) { return r.st === 'PAID'; });
      push("2단계 WHERE: 조인이 끝난 결과에서 o.status = 'PAID'인 행만 남깁니다. " + (before - rows.length) + '행이 빠졌습니다.' + (hadPark ? ' 박민수의 행은 o.status가 NULL이라 조건에 맞지 않아 함께 사라졌습니다. LEFT JOIN으로 남겨 둔 의미가 없어져 INNER JOIN과 같은 결과가 됩니다.' : ''), hadPark ? 'bad' : '', 'WHERE 적용 후', ['m.name', 'o.id', 'o.status'], tab(rows));
    }
    var final = rows, fhead = ['m.name', 'o.id', 'o.status'], fbody;
    if (c.agg !== 'none') {
      var g = []; rows.forEach(function (r) { var x = g.filter(function (y) { return y.name === r.name; })[0]; if (!x) { x = { name: r.name, cnt: 0 }; g.push(x); } if (r.oid !== null) x.cnt++; });
      push('GROUP BY: 남은 행을 회원 이름별로 묶고 COUNT(o.id)를 셉니다. COUNT(컬럼)은 NULL을 세지 않으므로, 주문이 없어 o.id가 NULL인 회원은 0이 됩니다.', '', 'GROUP BY 후', ['m.name', 'cnt'], g.map(function (x) { return { cells: [x.name, { v: String(x.cnt), cls: x.cnt === 0 ? 'hot' : '' }] }; }));
      if (c.agg === 'having') { g = g.filter(function (x) { return x.cnt >= 2; }); push('HAVING: 묶은 결과에서 cnt가 2 이상인 그룹만 남깁니다. WHERE는 묶기 전의 행을, HAVING은 묶은 뒤의 그룹을 걸러냅니다. 집계 결과로는 WHERE에서 걸러낼 수 없습니다.', '', 'HAVING 적용 후', ['m.name', 'cnt'], g.map(function (x) { return { cells: [x.name, String(x.cnt)] }; })); }
      final = g; fhead = ['m.name', 'cnt']; fbody = g.map(function (x) { return { cells: [x.name, String(x.cnt)] }; });
    } else fbody = tab(rows);
    var park = hasPark(final);
    push('최종 결과: ' + final.length + '행.', park || c.join === 'INNER' ? 'good' : '', '최종 결과', fhead, fbody);
    if (c.join === 'LEFT' && c.cond === 'where') sum.push('LEFT JOIN 뒤에 오른쪽 테이블의 컬럼으로 WHERE 조건을 걸면, NULL로 채워진 행이 걸러져 INNER JOIN과 같아집니다. "짝이 없는 쪽도 남기되 조건에 맞는 것만 붙이고 싶다"면 조건을 ON에 써야 합니다.');
    if (c.join === 'LEFT' && c.cond === 'on') sum.push('ON의 조건은 "어떤 주문을 붙일지"를 정할 뿐, 왼쪽 테이블(회원)의 행을 없애지 않습니다. 결제된 주문이 없는 회원도 NULL과 함께 남습니다.');
    if (c.join === 'INNER') sum.push('INNER JOIN에서는 조건을 ON에 쓰든 WHERE에 쓰든 결과가 같습니다. 차이는 OUTER JOIN에서만 생깁니다.');
    if (c.agg !== 'none') sum.push('처리 순서는 FROM/JOIN → WHERE → GROUP BY → HAVING → SELECT입니다. 그래서 SELECT에서 붙인 별칭(cnt)은 WHERE에서 쓸 수 없습니다.');
    if (!sum.length) sum.push('조인 직후 ' + afterJoin + '행, 최종 ' + final.length + '행입니다. 주문이 없는 회원 박민수는 결과에 ' + (park ? '포함됐습니다.' : '없습니다.'));
    return { events: ev, summary: sum, row: [afterJoin + '행', final.length + '행', park ? '포함' : '빠짐'] };
  },
  render: function (v, sim, t, H, shown) {
    var last = shown[shown.length - 1];
    H.table(v, ['id', 'name'], this.M.map(function (m) { return { cells: [String(m[0]), m[1]] }; }), 'member 테이블');
    H.table(v, ['id', 'member_id', 'status'], this.O.map(function (o) { return { cells: [String(o[0]), String(o[1]), o[2]] }; }), 'orders 테이블');
    if (last) { if (last.snap.body.length) H.table(v, last.snap.head, last.snap.body, '지금 단계의 결과: ' + last.snap.title); else { H.title(v, '지금 단계의 결과: ' + last.snap.title); H.text(v, '남은 행이 없습니다.'); } }
  },
  assume: '회원 3명, 주문 4건의 작은 예입니다. 결과는 표준 SQL의 논리적 처리 순서에 따라 직접 계산한 것입니다. 실제 DB는 내부적으로 순서를 바꿔 실행하기도 하지만(예: WHERE 조건을 조인보다 먼저 적용) 결과는 이 순서로 처리한 것과 같아야 합니다. 18가지 조합 모두, 화면에 나오는 SQL을 실제 SQL 엔진(SQLite)에서 그대로 실행한 결과와 최종 행이 일치하는 것을 확인했습니다.',
});

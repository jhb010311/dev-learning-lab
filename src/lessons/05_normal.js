Lab.register({
  id: 'normal', nav: '정규화', cat: '데이터베이스', mode: 'step',
  title: '테이블을 나누지 않으면 무슨 일이 생기나',
  intro: '주문 테이블에 회원 이름과 주소까지 같이 넣어 둔 설계와, 회원과 주문을 나눈 설계가 있습니다. 같은 작업을 양쪽에서 해 보면 한 테이블에 몰아넣었을 때만 데이터가 어긋나거나 사라집니다.',
  terms: ['정규화와 반정규화', '함수 종속', '기본 키, 유니크 키, 외래 키'], ranks: ['normal'],
  controls: [
    { id: 'form', label: '테이블 설계', type: 'select', value: 'flat', options: [['flat', '정규화 전 (주문 테이블 하나에 전부)'], ['norm', '정규화 후 (회원 / 주문으로 분리)']] },
    { id: 'op', label: '해 볼 작업', type: 'select', value: 'update', options: [['update', '회원 김철수의 주소를 서울에서 부산으로 변경'], ['insert', '아직 주문이 없는 신규 회원 등록'], ['delete', '회원 이영희의 하나뿐인 주문 삭제'], ['read', '주문 목록을 회원 이름과 함께 조회']] },
    { id: 'k', label: '김철수의 주문 건수', type: 'range', min: 1, max: 5, value: 3, fmt: function (v) { return v + '건'; }, show: function (c) { return c.op === 'update'; } },
    { id: 'miss', label: '수정할 때 조건을 잘못 줘서 한 행만 고친다', type: 'check', value: false, show: function (c) { return c.op === 'update' && c.form === 'flat'; } },
  ],
  presets: [
    { t: '처음 설정으로', q: '주문 테이블 하나에 전부 담은 정규화 전 설계에서 김철수의 주문 3건이 있을 때 주소를 서울에서 부산으로 변경하면 어떻게 되나', d: '정규화 전 테이블에서 주소 변경. 주문 건수만큼 행을 고쳐야 합니다.', v: { form: 'flat', op: 'update', k: 3, miss: false } },
    { t: '한 행만 고치는 실수', q: '같은 주소 변경에서 수정할 때 조건을 잘못 줘서 한 행만 고치면', d: '같은 회원의 주소가 두 가지가 됩니다(갱신 이상).', v: { form: 'flat', op: 'update', k: 3, miss: true } },
    { t: '같은 변경을 정규화 후에', q: '같은 주소 변경을 회원과 주문으로 분리한 정규화 후 설계에서 하면', d: '주소가 한 곳에만 있어서 한 행만 고치면 끝납니다.', v: { form: 'norm', op: 'update', k: 3, miss: false } },
    { t: '주문 없는 회원 등록', q: '아직 주문이 없는 신규 회원을 등록하면', d: '정규화 전에는 넣을 자리가 없습니다(삽입 이상).', v: { form: 'flat', op: 'insert', k: 3, miss: false } },
    { t: '마지막 주문 삭제', q: '회원 이영희의 하나뿐인 주문을 삭제하면', d: '정규화 전에는 회원 정보까지 사라집니다(삭제 이상).', v: { form: 'flat', op: 'delete', k: 3, miss: false } },
    { t: '정규화의 비용', q: '정규화 후 설계에서 주문 목록을 회원 이름과 함께 조회하면', d: '정규화 후에는 조회할 때 조인이 필요합니다.', v: { form: 'norm', op: 'read', k: 3, miss: false } },
  ],
  code: function (c) {
    var ddl = c.form === 'flat'
      ? '-- 정규화 전: 주문과 회원 정보를 한 테이블에\nCREATE TABLE orders (\n  order_id    INT PRIMARY KEY,\n  member_id   INT,\n  member_name VARCHAR(20),   -- member_id가 정함\n  member_addr VARCHAR(50),   -- member_id가 정함\n  item        VARCHAR(30),\n  amount      INT\n);\n'
      : '-- 정규화 후: 회원 정보는 회원 테이블에 한 번만\nCREATE TABLE member (\n  member_id INT PRIMARY KEY,\n  name      VARCHAR(20),\n  addr      VARCHAR(50)\n);\nCREATE TABLE orders (\n  order_id  INT PRIMARY KEY,\n  member_id INT REFERENCES member(member_id),\n  item      VARCHAR(30),\n  amount    INT\n);\n';
    return ddl + '\n' + this.sql(c);
  },
  sql: function (c) {
    var f = c.form === 'flat';
    if (c.op === 'update') return f ? (c.miss && c.k > 1 ? "UPDATE orders SET member_addr = '부산'\n WHERE order_id = 1;          -- 한 행만 고침" : "UPDATE orders SET member_addr = '부산'\n WHERE member_id = 1;") : "UPDATE member SET addr = '부산'\n WHERE member_id = 1;";
    if (c.op === 'insert') return f ? "INSERT INTO orders (order_id, member_id, member_name, member_addr)\nVALUES (NULL, 4, '박신규', '대전');  -- 주문 번호가 없다" : "INSERT INTO member (member_id, name, addr)\nVALUES (4, '박신규', '대전');";
    if (c.op === 'delete') return 'DELETE FROM orders\n WHERE order_id = ' + this.yhOrder(c) + ';';
    return f ? 'SELECT order_id, member_name, item\n  FROM orders;' : 'SELECT o.order_id, m.name, o.item\n  FROM orders o\n  JOIN member m ON m.member_id = o.member_id;';
  },
  yhOrder: function (c) { return (c.op === 'update' ? c.k : 3) + 1; },
  label: function (c) { return (c.form === 'flat' ? '정규화 전' : '정규화 후') + ' · ' + { update: '주소 변경(주문 ' + c.k + '건)' + (c.form === 'flat' && c.miss && c.k > 1 ? ' · 한 행만' : ''), insert: '주문 없는 회원 등록', delete: '마지막 주문 삭제', read: '이름과 함께 조회' }[c.op]; },
  columns: ['바뀐 행', '이상 현상', '조회할 때 읽는 테이블'],
  simulate: function (c) {
    var flat = c.form === 'flat', k = c.op === 'update' ? c.k : 3, miss = flat && c.op === 'update' && c.miss && k > 1, ev = [], self = this;
    var items = ['키보드', '마우스', '모니터', '의자', '책상', '헤드셋', '웹캠', '충전기'], members = [{ id: 1, name: '김철수', addr: '서울' }, { id: 2, name: '이영희', addr: '인천' }, { id: 3, name: '최민수', addr: '광주' }], orders = [];
    for (var i = 0; i < k; i++) orders.push({ id: orders.length + 1, mid: 1 });
    orders.push({ id: orders.length + 1, mid: 2 }); orders.push({ id: orders.length + 1, mid: 3 }); orders.push({ id: orders.length + 1, mid: 3 });
    orders.forEach(function (o, i) { o.item = items[i % items.length]; o.amount = (3 + (i * 7) % 9) * 10000; o.addr = members[o.mid - 1].addr; o.name = members[o.mid - 1].name; });
    var mark = {}, gone = {}, extra = null, mmark = {}, result = null;
    function tables() {
      var t = [];
      if (flat) {
        var rows = orders.map(function (o) { return { cls: gone[o.id] ? 'gone' : '', cells: [String(o.id), String(o.mid), o.name, { v: o.addr, cls: mark[o.id] || '' }, o.item, String(o.amount)] }; });
        if (extra) rows.push({ cells: extra });
        t.push({ name: 'orders (주문 + 회원 정보)', head: ['주문번호(PK)', '회원ID', '회원이름', '회원주소', '상품', '금액'], rows: rows });
      } else {
        var mr = members.map(function (m) { return { cells: [String(m.id), m.name, { v: m.addr, cls: mmark[m.id] || '' }] }; });
        t.push({ name: 'member (회원)', head: ['회원ID(PK)', '이름', '주소'], rows: mr });
        t.push({ name: 'orders (주문)', head: ['주문번호(PK)', '회원ID(FK)', '상품', '금액'], rows: orders.map(function (o) { return { cls: gone[o.id] ? 'gone' : '', cells: [String(o.id), String(o.mid), o.item, String(o.amount)] }; }) });
      }
      if (result) t.push(result);
      return t;
    }
    function push(s, kd) { ev.push({ s: s, k: kd, snap: tables() }); }
    var changed = 0, anomaly = '없음', readT = flat ? 1 : 2, sum = [];
    push(flat ? '처음 상태입니다. 주문 한 건마다 회원 이름과 주소가 같이 적혀 있습니다. 김철수는 주문이 ' + k + '건이라 주소 "서울"이 ' + k + '번 저장돼 있습니다. 주문번호가 회원ID를 정하고 회원ID가 이름과 주소를 정하는 구조입니다(이행 함수 종속).' : '처음 상태입니다. 회원 정보는 member 테이블에 회원당 한 행씩만 있고, orders 테이블은 회원ID로 회원을 가리킵니다. 김철수의 주소 "서울"은 한 곳에만 저장돼 있습니다.', '');
    if (c.op === 'update') {
      if (flat && !miss) { orders.forEach(function (o) { if (o.mid === 1) { o.addr = '부산'; mark[o.id] = 'hot'; changed++; } }); push('회원ID가 1인 행을 전부 찾아 주소를 바꿨습니다. ' + changed + '행을 고쳤습니다. 주문이 늘수록 고쳐야 할 행도 늘어납니다.', ''); push('김철수의 주소를 다시 조회하면 모든 행에서 "부산"입니다. 이번에는 빠짐없이 고쳐서 어긋나지 않았습니다.', 'good'); sum.push('회원 한 명의 주소를 바꾸는데 ' + changed + '행을 고쳐야 했습니다. ' + (changed > 1 ? '같은 사실이 여러 행에 중복 저장돼 있기 때문입니다.' : '지금은 주문이 1건뿐이지만, 주문이 늘면 같은 주소가 행마다 중복 저장됩니다.') + ' 한 행이라도 빠뜨리면 데이터가 어긋납니다.'); }
      else if (flat) { orders[0].addr = '부산'; mark[1] = 'hot'; changed = 1; orders.forEach(function (o) { if (o.mid === 1 && o.id !== 1) mark[o.id] = 'bad'; }); push('주문번호 1번 행만 주소가 바뀌었습니다. 김철수의 나머지 주문 ' + (k - 1) + '건에는 여전히 "서울"이 적혀 있습니다.', ''); anomaly = '갱신 이상'; push('김철수의 주소를 조회하면 "부산"과 "서울" 두 가지가 나옵니다. 어느 쪽이 맞는지 DB만 봐서는 알 수 없습니다. 이것이 갱신 이상입니다.', 'bad'); sum.push('같은 회원의 주소가 행마다 다르게 됐습니다(갱신 이상). 중복 저장된 값을 일부만 고치면 생기는 문제입니다.'); }
      else { members[0].addr = '부산'; mmark[1] = 'hot'; changed = 1; push('member 테이블에서 김철수의 한 행만 고쳤습니다. orders 테이블은 건드리지 않았습니다.', ''); push('김철수의 주문 ' + k + '건은 모두 회원ID 1을 가리키므로, 어느 주문에서 조회해도 주소는 "부산"입니다. 고칠 곳이 한 곳뿐이라 어긋날 수가 없습니다.', 'good'); sum.push('주소가 한 곳에만 저장돼 있어서 주문이 몇 건이든 1행만 고치면 됩니다.'); }
    }
    if (c.op === 'insert') {
      if (flat) { extra = [{ v: 'NULL', cls: 'bad' }, '4', '박신규', '대전', { v: 'NULL', cls: 'bad' }, { v: 'NULL', cls: 'bad' }]; push('신규 회원 박신규를 넣으려면 orders 테이블에 행을 만들어야 합니다. 그런데 아직 주문이 없어서 기본 키인 주문번호에 넣을 값이 없습니다.', ''); extra = null; anomaly = '삽입 이상'; push('기본 키는 NULL일 수 없으므로 INSERT가 거부됩니다. 가짜 주문을 만들지 않는 한 주문 없는 회원을 저장할 방법이 없습니다. 이것이 삽입 이상입니다.', 'bad'); sum.push('회원 정보를 저장하려면 주문이 있어야만 합니다(삽입 이상). 회원과 주문이라는 서로 다른 사실이 한 테이블에 묶여 있기 때문입니다.'); }
      else { members.push({ id: 4, name: '박신규', addr: '대전' }); mmark[4] = 'hot'; changed = 1; push('member 테이블에 박신규 한 행을 넣었습니다. 주문이 없어도 회원은 따로 저장됩니다.', 'good'); sum.push('회원과 주문이 다른 테이블이라, 주문이 없는 회원도 문제없이 등록됩니다.'); }
    }
    if (c.op === 'delete') {
      var oid = this.yhOrder(c); gone[oid] = 1; changed = 1;
      if (flat) { push('주문번호 ' + oid + '번 행을 삭제했습니다. 이 행은 이영희의 하나뿐인 주문이었습니다.', ''); anomaly = '삭제 이상'; push('이영희의 이름과 주소는 그 행에만 적혀 있었습니다. 주문 하나를 지웠을 뿐인데 이영희라는 회원이 있었다는 사실 자체가 DB에서 사라졌습니다. 이것이 삭제 이상입니다.', 'bad'); sum.push('주문을 지웠는데 회원 정보까지 함께 사라졌습니다(삭제 이상).'); }
      else { push('orders 테이블에서 주문번호 ' + oid + '번 행을 삭제했습니다.', ''); push('member 테이블의 이영희 행은 그대로 남아 있습니다. 주문이 없어져도 회원 정보는 유지됩니다.', 'good'); sum.push('주문만 사라지고 회원 정보는 남았습니다.'); }
    }
    if (c.op === 'read') {
      result = { name: '조회 결과', head: ['주문번호', '회원이름', '상품'], rows: orders.map(function (o) { return { cells: [String(o.id), o.name, o.item] }; }) };
      if (flat) { push('orders 테이블 하나만 읽으면 회원 이름까지 나옵니다. 조인이 필요 없습니다.', 'good'); sum.push('조회만 놓고 보면 정규화 전 테이블은 조인이 없어 더 단순합니다. 읽기 성능 때문에 일부러 중복을 허용하는 것을 반정규화라고 하며, 그 대가로 위의 이상 현상을 애플리케이션이 직접 막아야 합니다.'); }
      else { push('주문에는 회원ID만 있으므로, 이름을 얻으려면 member 테이블과 조인해야 합니다. 테이블 두 개를 읽습니다.', ''); sum.push('정규화의 비용은 조회 시 조인입니다. 그래도 일반적인 서비스에서는 정규화를 기본으로 하고, 조회 성능이 실제로 문제가 될 때만 반정규화를 검토합니다.'); }
    }
    if (flat && anomaly === '없음' && c.op !== 'read') sum.push('이번에는 문제가 드러나지 않았지만, 구조가 문제를 막아 주는 것이 아니라 작업하는 쪽이 조심해서 피한 것입니다.');
    return { events: ev, summary: sum, row: [changed + '행', anomaly, readT + '개'] };
  },
  render: function (v, sim, t, H, shown) {
    var last = shown[shown.length - 1], tabs = last ? last.snap : [];
    H.title(v, '실행한 SQL'); var pre = H.el('pre', 'code', this.sql(sim.c)); v.appendChild(pre);
    tabs.forEach(function (tb) { H.table(v, tb.head, tb.rows, tb.name); });
    H.text(v, '노란 칸은 방금 바뀐 값, 빨간 칸은 문제가 있는 값, 줄이 그어진 행은 삭제된 행입니다.');
  },
  // 그림: 정규화 전에는 주문 행마다 회원 정보가 반복해서 붙어 있고, 정규화 후에는 주문이 회원 행 하나를 화살표로 가리킨다.
  draw: function (P, sim, shown) {
    var last = shown[shown.length - 1], tabs = last ? last.snap : [], val = function (x) { return typeof x === 'object' ? x.v : x; }, cl = function (x) { return typeof x === 'object' ? x.cls : ''; };
    var flat = tabs.filter(function (t) { return t.name.indexOf('orders (주문 +') === 0; })[0], mem = tabs.filter(function (t) { return t.name.indexOf('member') === 0; })[0], ord = tabs.filter(function (t) { return t.name === 'orders (주문)'; })[0];
    P.size(680, 330);
    if (!last) { P.region('t', 16, 16, 648, 298, '테이블'); P.text('hint', 340, 170, '실행을 누르면 시작합니다', { cls: 'mut', anchor: 'middle' }); return; }
    if (flat) {
      P.region('t', 16, 16, 648, 298, 'orders 테이블 하나: 주문 정보 옆에 회원 정보가 행마다 반복됨');
      flat.rows.forEach(function (r, i) {
        var c = r.cells, y = 50 + i * 29, gone = r.cls === 'gone', isNull = val(c[0]) === 'NULL', a = cl(c[3]);
        P.box('fo' + i, 28, y, 250, 25, { cls: gone ? 'ghost' : isNull ? 'bad' : 'plain', title: isNull ? '주문번호 없음 (NULL)' : '주문 ' + val(c[0]), right: isNull ? '' : val(c[4]) });
        P.box('fm' + i, 286, y, 366, 25, { cls: gone ? 'ghost' : a === 'hot' ? 'hot' : a === 'bad' ? 'bad' : 'wait', title: '회원 ' + val(c[1]) + ' ' + val(c[2]), right: '주소 ' + val(c[3]) });
      });
    } else if (mem && ord) {
      P.region('tm', 16, 16, 270, 298, 'member 테이블: 회원당 한 행');
      P.region('to', 384, 16, 280, 298, 'orders 테이블: 회원ID로 회원을 가리킴');
      mem.rows.forEach(function (r, i) { var c = r.cells, a = cl(c[2]); P.box('m' + val(c[0]), 28, 56 + i * 46, 246, 34, { cls: a === 'hot' ? 'hot' : 'wait', title: '회원 ' + val(c[0]) + ' ' + val(c[1]), right: '주소 ' + val(c[2]) }); });
      ord.rows.forEach(function (r, i) {
        var c = r.cells, gone = r.cls === 'gone', id = 'o' + val(c[0]);
        P.box(id, 396, 50 + i * 29, 256, 25, { cls: gone ? 'ghost' : 'plain', title: '주문 ' + val(c[0]) + (gone ? ' (삭제됨)' : ''), right: '회원ID ' + val(c[1]) });
        if (!gone) P.arrow('fk' + val(c[0]), id + ':l', 'm' + val(c[1]) + ':r', { cls: 'mut' });
      });
    }
    P.note(flat ? '파란 상자가 회원 정보입니다. 노란 상자는 방금 바뀐 값, 빨간 상자는 어긋나거나 넣을 수 없는 값입니다.' : '화살표는 주문이 회원ID로 회원 행을 가리키는 것입니다.');
  },
  assume: '회원 3명과 주문 몇 건으로 줄인 예입니다. 정규화 전 테이블은 주문번호 → 회원ID → 회원이름·주소로 이어지는 이행 함수 종속이 있어 제3정규형을 만족하지 못합니다. 정규화 후에는 외래 키로 회원을 참조합니다. 이상 현상의 정의는 관계형 데이터베이스 이론의 표준 설명을 따랐습니다. 같은 구조의 테이블을 실제 SQL 엔진(SQLite)에 만들어 확인했습니다. 한 행만 고치자 같은 회원의 주소가 두 가지로 조회됐고, 주문 번호 없이 회원만 넣는 INSERT는 거부됐으며, 마지막 주문을 지우자 그 회원의 정보가 남은 행이 0건이 됐습니다. 테이블을 나눈 쪽에서는 세 경우 모두 문제가 없었습니다.',
});

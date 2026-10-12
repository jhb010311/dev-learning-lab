Lab.register({
  id: 'nosql', nav: 'NoSQL과 문서 모델', cat: '데이터베이스', mode: 'step',
  title: '주문을 테이블 셋에 나눌까, 문서 하나에 담을까',
  intro: '같은 데이터(주문과 주문 항목)를 두 가지 방식으로 저장해 봅니다. 관계형은 상품, 주문, 주문 항목을 테이블 셋에 나눠 두고 읽을 때 조인합니다. 문서 모델은 MongoDB 같은 문서 DB가 쓰는 방식으로, 주문 하나를 문서 하나로 보고 그 안에 항목 배열과 상품 이름까지 함께 담습니다.',
  terms: ['NoSQL', '문서 모델(문서 데이터베이스)', '고정 스키마와 유연한 스키마', '정규화와 반정규화', 'JOIN (INNER, OUTER)'],
  controls: [
    { id: 'model', label: '저장 방식', type: 'select', value: 'doc', options: [['doc', '문서: 주문 하나에 항목까지 담는다'], ['rel', '관계형: 테이블 셋으로 나누고 조인한다']] },
    { id: 'op', label: '하는 일', type: 'select', value: 'rename', options: [['read', '주문 하나를 읽는다'], ['rename', '상품 이름을 바꾼다 (키보드 → 기계식 키보드)'], ['newfield', '새 주문에 없던 항목(선물 포장 여부)을 넣는다'], ['typo', '수량의 이름을 qty 대신 quantity로 잘못 써서 넣는다']] },
    { id: 'n', label: '주문 수 (모든 주문에 키보드가 들어 있음)', type: 'range', min: 2, max: 5, value: 3, step: 1, fmt: function (v) { return v + '건'; }, show: function (c) { return c.op !== 'read'; } },
  ],
  // 주문 하나를 읽는 일은 주문 수와 상관이 없으므로 기본값으로 둔다
  fix: function (c) { return c.op === 'read' && +c.n !== 3 ? { n: 3 } : null; },
  presets: [
    { t: '처음 설정으로', q: '주문 하나에 항목까지 담은 문서 모델에서 키보드가 든 주문 3건의 상품 이름을 기계식 키보드로 바꾸면 어떻게 되나', d: '문서 모델에서 상품 이름을 바꾸려면 그 상품이 든 문서를 모두 고쳐야 합니다.', v: { model: 'doc', op: 'rename', n: 3 } },
    { t: '관계형에서 이름을 바꾸면', q: '저장 방식을 테이블 셋으로 나누고 조인하는 관계형으로 바꾸면', d: '주문이 몇 건이든 product 테이블의 한 행만 고칩니다.', v: { model: 'rel', op: 'rename', n: 3 } },
    { t: '문서로 주문 하나 읽기', q: '문서 모델에서 하는 일을 주문 하나 읽기로 바꾸면', d: '조인 없이 문서 하나로 끝납니다.', v: { model: 'doc', op: 'read', n: 3 } },
    { t: '관계형으로 주문 하나 읽기', q: '관계형으로 주문 하나를 읽으면', d: '테이블 셋을 조인해야 주문 하나가 완성됩니다.', v: { model: 'rel', op: 'read', n: 3 } },
    { t: '문서에 새 항목 넣기', q: '문서 모델에서 새 주문에 없던 항목인 선물 포장 여부를 넣으면', d: '구조를 바꾸지 않고 바로 저장됩니다. 대신 문서마다 모양이 달라집니다.', v: { model: 'doc', op: 'newfield', n: 3 } },
    { t: '관계형에 없는 컬럼을 넣으면', q: '관계형인데 새 주문에 선물 포장 여부 항목을 넣으면', d: '오류 1054로 거절됩니다. 먼저 테이블 구조를 바꿔야 합니다.', v: { model: 'rel', op: 'newfield', n: 3 } },
    { t: '문서에서 필드 이름을 틀리면', q: '문서 모델에서 수량의 이름을 qty 대신 quantity로 잘못 써서 넣으면', d: '오류 없이 저장되고, 수량 합계가 조용히 틀려집니다.', v: { model: 'doc', op: 'typo', n: 3 } },
  ],
  code: function (c) {
    var n = +c.n, x = n + 1, rel = c.model === 'rel';
    var head = rel ? 'CREATE TABLE product (id INT PRIMARY KEY, name VARCHAR(50) NOT NULL);\nCREATE TABLE orders (id INT PRIMARY KEY, member VARCHAR(20) NOT NULL);\nCREATE TABLE order_item (\n  order_id INT NOT NULL, product_id INT NOT NULL, qty INT NOT NULL,\n  PRIMARY KEY (order_id, product_id)\n);\n-- 주문마다 키보드(상품 1) 1개와 마우스(상품 2) 2개\n\n'
      : '-- 문서 모델을 MySQL의 JSON 컬럼으로 재현한 것. 행 하나가 문서 하나다\nCREATE TABLE order_doc (id INT PRIMARY KEY, doc JSON NOT NULL);\n-- 문서의 예 (주문 1번)\n-- {"member": "kim",\n--  "items": [{"product_id": 1, "name": "키보드", "qty": 1},\n--            {"product_id": 2, "name": "마우스", "qty": 2}]}\n\n';
    var F = "JSON_SEARCH(doc, 'one', '키보드', NULL, '$.items[*].name')";
    var body = {
      read: rel ? 'SELECT o.id, o.member, p.name, i.qty\nFROM orders o\nJOIN order_item i ON i.order_id = o.id\nJOIN product p ON p.id = i.product_id\nWHERE o.id = 1;' : 'SELECT doc FROM order_doc WHERE id = 1;',
      rename: rel ? "UPDATE product SET name = '기계식 키보드' WHERE id = 1;" : "-- 문서마다 items 배열에서 '키보드'가 있는 자리를 찾아 그 자리의 name을 바꾼다\nUPDATE order_doc\nSET doc = JSON_SET(doc, JSON_UNQUOTE(" + F + "), '기계식 키보드')\nWHERE " + F + ' IS NOT NULL;',
      newfield: rel ? "INSERT INTO orders (id, member, gift) VALUES (" + x + ", 'han', TRUE);" : 'INSERT INTO order_doc VALUES (' + x + ', \'{"member": "han", "gift": true,\n  "items": [{"product_id": 2, "name": "마우스", "qty": 1}]}\');',
      typo: rel ? 'INSERT INTO order_item (order_id, product_id, quantity) VALUES (' + x + ', 1, 3);\n\nSELECT SUM(qty) FROM order_item;' : 'INSERT INTO order_doc VALUES (' + x + ', \'{"member": "han",\n  "items": [{"product_id": 1, "name": "키보드", "quantity": 3}]}\');\n\n-- 모든 문서의 items 배열을 펼쳐 qty를 더한다\nSELECT SUM(j.qty)\nFROM order_doc, JSON_TABLE(doc, \'$.items[*]\' COLUMNS (qty INT PATH \'$.qty\')) j;',
    }[c.op];
    return head + body;
  },
  label: function (c) { return (c.model === 'rel' ? '관계형' : '문서') + ' · ' + { read: '주문 하나 읽기', rename: '상품 이름 바꾸기', newfield: '새 항목 넣기', typo: '필드 이름 오타' }[c.op] + (c.op === 'read' ? '' : ' · 주문 ' + c.n + '건'); },
  columns: ['DB의 반응', '읽거나 고친 범위', '실행 뒤 확인한 것'],
  rowOf: function (c) {
    var n = +c.n, rel = c.model === 'rel';
    if (c.op === 'read') return ['성공', rel ? '테이블 3개를 조인, 결과 2행' : '문서 1개, 조인 없음', '주문 1건과 그 항목 2개를 얻음'];
    if (c.op === 'rename') return ['성공', rel ? '1행 수정 (product 테이블)' : '문서 ' + n + '개 수정', '새 이름으로 보이는 주문: ' + n + '건 중 ' + n + '건'];
    if (c.op === 'newfield') return rel ? ['오류 1054 (없는 컬럼)', '저장 안 됨', 'gift가 있는 주문: ' + n + '건 중 0건'] : ['성공', '문서 1개 추가', 'gift가 있는 주문: ' + (n + 1) + '건 중 1건'];
    return rel ? ['오류 1054 (없는 컬럼)', '저장 안 됨', '수량 합계 ' + 3 * n + ' (실제 주문량 ' + 3 * n + ')'] : ['성공', '문서 1개 추가', '수량 합계 ' + 3 * n + ' (실제 주문량 ' + (3 * n + 3) + ')'];
  },
  simulate: function (c) {
    var n = +c.n, x = n + 1, rel = c.model === 'rel', op = c.op, row = this.rowOf(c), ev = [], sum = [], WHO = ['kim', 'lee', 'park', 'choi', 'jung'];
    var st = { tabs: null, docs: null, hot: [], bad: '', res: '아직 실행 전', chk: '-', k: '' };
    function push(s, k) { st.k = k; ev.push({ s: s, k: k, snap: JSON.parse(JSON.stringify(st)) }); }
    if (rel) {
      st.tabs = { p1: '키보드', orders: n, items: 2 * n };
      push('관계형으로 저장한 상태입니다. product 테이블에 상품 2개, orders 테이블에 주문 ' + n + '건, order_item 테이블에 주문 항목 ' + 2 * n + '개가 있습니다. 상품 이름은 product 테이블 한 곳에만 있고, 주문 항목은 상품 번호(product_id)로 그것을 가리킵니다.', '');
    } else {
      st.docs = []; for (var i = 1; i <= n; i++) st.docs.push({ id: i, who: WHO[i - 1], a: '키보드 1개', b: '마우스 2개', cls: '' });
      push('문서 모델로 저장한 상태입니다. order_doc 테이블에 문서 ' + n + '개가 있고, 문서 하나가 주문 한 건입니다. 문서 안에 주문한 사람과 항목 배열(items)이 통째로 들어 있으며, 항목마다 상품 이름이 복사되어 있습니다.', '');
    }
    if (op === 'read') {
      st.res = row[1];
      if (rel) { st.hot = ['to', 'ti', 'tp']; push('SELECT … FROM orders o JOIN order_item i … JOIN product p … WHERE o.id = 1: orders에서 주문 1번을 찾고, order_item에서 그 주문의 항목 2개를 찾고, 항목마다 product에서 상품 이름을 찾아 붙입니다. 테이블 세 개를 조인해야 주문 하나가 완성됩니다. 조인을 쓰지 않는다면 테이블마다 한 번씩 쿼리를 세 번 보내야 합니다.', ''); st.chk = row[2]; push('결과는 2행입니다. 항목 하나가 한 행이고, 주문 번호와 주문한 사람은 행마다 되풀이됩니다. 애플리케이션이 이 행들을 다시 주문 하나로 묶어 씁니다.', 'good'); }
      else { st.docs[0].cls = 'hot'; push('SELECT doc FROM order_doc WHERE id = 1: 기본 키로 문서 하나를 찾습니다. 주문한 사람, 항목 2개, 상품 이름이 모두 그 문서 안에 들어 있어 다른 곳을 찾아갈 필요가 없습니다.', ''); st.chk = row[2]; push('결과는 문서 1개이고, 그 안의 items 배열에 항목 2개가 들어 있습니다. 함께 읽는 데이터를 함께 저장해 두었기 때문에 한 번에 읽힙니다. 문서 모델이 가장 잘하는 일입니다.', 'good'); }
      sum.push(rel ? '관계형은 데이터를 겹치지 않게 나눠 두고 읽을 때 조인으로 합칩니다. 읽을 때 할 일이 더 많지만, 같은 값이 한 곳에만 있어 고치기 쉽습니다.' : '문서 모델은 함께 읽는 데이터를 함께 저장합니다. 주문 화면처럼 "주문 하나와 거기에 딸린 것 전부"를 자주 읽는다면 조인 없이 한 번에 읽힙니다. 그 대가는 "상품 이름을 바꾼다"에서 드러납니다.');
    } else if (op === 'rename') {
      st.res = row[1];
      if (rel) { st.tabs.p1 = '기계식 키보드'; st.hot = ['tp']; push("UPDATE product SET name = '기계식 키보드' WHERE id = 1: product 테이블의 한 행만 고칩니다. 상품 이름이 그 한 곳에만 저장되어 있기 때문입니다. 주문이 몇 건이든 고치는 곳은 하나입니다.", 'good'); st.hot = ['to', 'ti', 'tp']; st.chk = row[2]; push('주문을 다시 조회하면 ' + n + '건 모두 새 이름으로 나옵니다. 주문 항목은 상품 번호만 갖고 있고, 이름은 조회할 때마다 product 테이블에서 가져오기 때문입니다.', 'good'); }
      else { st.docs.forEach(function (d) { d.a = '기계식 키보드 1개'; d.cls = 'hot'; }); push("UPDATE order_doc SET doc = JSON_SET(…) WHERE …: items 배열에 '키보드'가 든 문서를 모두 찾아, 문서마다 그 자리의 이름을 바꿉니다. 고친 문서는 " + n + '개입니다. 상품 이름이 주문 문서마다 복사되어 있기 때문에, 그 상품이 든 문서 수만큼 고쳐야 합니다.', 'bad'); st.chk = row[2]; push('이번에는 ' + n + '개를 모두 고쳤으므로 모든 주문이 새 이름으로 보입니다. 하지만 일부만 고치고 멈추면 같은 상품이 문서마다 다른 이름으로 남습니다. 이 값들이 서로 같아야 한다는 것을 DB는 알지 못합니다.', ''); }
      sum.push(rel ? '같은 값을 한 곳에만 두는 것(정규화)의 이점입니다. 한 행만 고치면 모든 주문에 반영되고, 값이 서로 어긋날 일이 없습니다.' : '문서에 복사해 둔 값은 바뀔 때마다 복사본을 모두 찾아 고쳐야 합니다. 읽기를 쉽게 만든 대가입니다. 그래서 문서 모델에서는 잘 바뀌지 않는 값만 복사해 넣거나, 상품 번호만 넣어 두고 이름은 따로 조회합니다.');
      if (!rel) sum.push('다만 주문 당시의 상품 이름과 가격을 기록으로 남겨야 한다면, 복사해 둔 값이 나중에 바뀌지 않는 것이 오히려 맞는 동작입니다. 복사가 늘 나쁜 것은 아닙니다.');
    } else if (op === 'newfield') {
      st.res = row[1];
      if (rel) { st.hot = ['to']; st.bad = 'to'; push("INSERT INTO orders (id, member, gift) VALUES (" + x + ", 'han', TRUE): 오류 1054 (Unknown column 'gift' in 'field list')가 나고 저장되지 않습니다. orders 테이블에는 gift라는 컬럼이 없습니다. 관계형 테이블의 행은 미리 정해 둔 컬럼만 가질 수 있습니다.", 'bad'); st.chk = row[2]; push('새 항목을 저장하려면 먼저 ALTER TABLE orders ADD COLUMN gift …로 테이블의 구조를 바꿔야 합니다. 그러면 같은 INSERT가 들어가고, 기존 주문 ' + n + '건에도 gift 칸이 함께 생깁니다. 번거롭지만 모든 행의 모양이 같다는 것이 보장됩니다.', ''); }
      else { st.docs.push({ id: x, who: 'han', a: 'gift: true', b: '마우스 1개', cls: 'good' }); push('INSERT INTO order_doc VALUES (' + x + ', \'{"member": "han", "gift": true, "items": […]}\'): 그대로 저장됩니다. 문서에는 미리 정해 둔 컬럼 목록이 없어서, 이 문서에만 gift라는 항목이 있어도 됩니다. 테이블 구조를 바꾸는 작업이 필요 없습니다.', 'good'); st.chk = row[2]; push('이제 문서 ' + x + '개 가운데 gift가 있는 것은 1개뿐입니다. 나머지 문서에서 gift를 읽으면 NULL이 나옵니다. 문서마다 모양이 다를 수 있으므로, 읽는 코드가 "이 항목이 없을 수도 있다"를 늘 처리해야 합니다.', ''); }
      sum.push(rel ? '관계형은 구조(스키마)를 먼저 정하고 그에 맞는 데이터만 받습니다. 구조를 바꾸려면 ALTER TABLE이 필요하지만, 저장된 모든 행이 같은 모양이라는 것을 믿고 쿼리를 쓸 수 있습니다.' : '문서마다 모양이 달라도 되는 것을 유연한 스키마라고 합니다. 구조가 자주 바뀌거나 종류마다 항목이 다른 데이터에 편리합니다. 대신 "모든 문서에 이 항목이 있다"를 DB가 보장하지 않으므로, 그 확인이 애플리케이션 코드의 일이 됩니다.');
    } else {
      st.res = row[1];
      if (rel) { st.hot = ['ti']; st.bad = 'ti'; push("INSERT INTO order_item (order_id, product_id, quantity) VALUES (" + x + ", 1, 3): 오류 1054 (Unknown column 'quantity' in 'field list')가 나고 저장되지 않습니다. 컬럼 이름은 qty인데 quantity라고 잘못 썼습니다. 잘못된 이름을 DB가 그 자리에서 걸러 냅니다.", 'good'); st.bad = ''; st.chk = row[2]; push('SELECT SUM(qty) FROM order_item: 수량 합계는 ' + 3 * n + '입니다. 잘못된 행이 들어가지 않았으므로 합계가 실제 주문량과 같습니다.', 'good'); }
      else { st.docs.push({ id: x, who: 'han', a: '키보드 quantity: 3', b: 'qty라는 항목이 없음', cls: 'bad' }); push('INSERT INTO order_doc VALUES (' + x + ', \'{… "items": [{"product_id": 1, "name": "키보드", "quantity": 3}]}\'): 그대로 저장됩니다. qty가 맞는 이름이고 quantity가 틀린 이름이라는 것을 DB는 알지 못합니다. 오류도 경고도 없습니다.', 'bad'); st.chk = row[2]; push('SELECT SUM(j.qty) FROM order_doc, JSON_TABLE(…) j: 모든 문서의 qty를 더한 수량 합계는 ' + 3 * n + '입니다. 실제로 주문된 수량은 ' + (3 * n + 3) + '인데, 새 문서에는 qty가 없어서 빠졌습니다. 조회도 오류 없이 끝나므로 틀린 줄 모르고 지나가기 쉽습니다.', 'bad'); }
      sum.push(rel ? '컬럼 이름, 자료형, NOT NULL 같은 약속을 DB가 지켜 주므로, 잘못된 데이터는 들어오는 순간에 드러납니다.' : '모양을 검사하지 않는다는 것은 잘못된 모양도 받아 준다는 뜻입니다. 그래서 문서 모델에서는 저장하기 전에 애플리케이션이 검사하거나, DB가 제공하는 스키마 검사 기능을 켭니다. MySQL의 JSON 컬럼에도 CHECK (JSON_SCHEMA_VALID(…)) 제약을 걸 수 있고, 그러면 이 INSERT는 오류 3819로 거절됩니다.');
    }
    sum.push('NoSQL은 관계형이 아닌 DB를 통틀어 부르는 말이고, 문서 모델은 그 가운데 하나입니다. 어느 쪽이 더 좋다기보다, 무엇을 자주 함께 읽고 무엇이 자주 바뀌는지에 따라 고릅니다.');
    return { events: ev, summary: sum, row: row };
  },
  render: function (v, sim, t, H, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : null;
    if (!s) { H.text(v, '실행을 누르면 한 단계씩 진행합니다.'); return; }
    function cl(id) { return s.bad === id ? 'bad' : s.hot.indexOf(id) >= 0 ? 'hot' : ''; }
    if (s.tabs) H.table(v, ['테이블', '행 수', '내용'], [
      { cells: [{ v: 'product', cls: cl('tp') }, '2행', '1: ' + s.tabs.p1 + ', 2: 마우스'] },
      { cells: [{ v: 'orders', cls: cl('to') }, s.tabs.orders + '행', '컬럼: id, member'] },
      { cells: [{ v: 'order_item', cls: cl('ti') }, s.tabs.items + '행', '컬럼: order_id, product_id, qty'] },
    ], '관계형: 테이블 셋');
    else H.table(v, ['문서', '주문한 사람', 'items 배열'], s.docs.map(function (d) { return { cells: [{ v: '문서 ' + d.id, cls: d.cls === 'bad' ? 'bad' : d.cls === 'good' ? 'good' : d.cls === 'hot' ? 'hot' : '' }, d.who, d.a + ', ' + d.b] }; }), '문서: order_doc 테이블');
  },
  // 그림: 관계형이면 테이블 셋과 그 사이의 참조, 문서 모델이면 주문마다 문서 상자 하나. 건드린 곳이 노랗게, 문제가 생긴 곳이 빨갛게 보인다.
  draw: function (P, sim, shown) {
    var c = sim.c, n = +c.n, rel = c.model === 'rel', last = shown[shown.length - 1], s = last ? last.snap : null, WHO = ['kim', 'lee', 'park', 'choi', 'jung'];
    if (!s) { s = { tabs: rel ? { p1: '키보드', orders: n, items: 2 * n } : null, docs: null, hot: [], bad: '', res: '아직 실행 전', chk: '-', k: '' }; if (!rel) { s.docs = []; for (var i = 1; i <= n; i++) s.docs.push({ id: i, who: WHO[i - 1], a: '키보드 1개', b: '마우스 2개', cls: '' }); } }
    P.size(680, 326);
    if (rel) {
      var cl = function (id) { return s.bad === id ? 'bad now' : s.hot.indexOf(id) >= 0 ? 'hot now' : 'wait'; };
      P.region('db', 16, 12, 648, 204, '관계형: 테이블 셋');
      P.box('to', 30, 44, 196, 66, { cls: cl('to'), title: 'orders', sub: ['주문 ' + s.tabs.orders + '건', 'id, member'] });
      P.box('tp', 454, 44, 196, 66, { cls: cl('tp'), title: 'product', sub: ['1: ' + s.tabs.p1, '2: 마우스'] });
      P.box('ti', 224, 136, 232, 66, { cls: cl('ti'), title: 'order_item', sub: ['항목 ' + s.tabs.items + '개', 'order_id, product_id, qty'] });
      P.arrow('f1', 'ti:l', 'to:b', { cls: 'mut', label: 'order_id' });
      P.arrow('f2', 'ti:r', 'tp:b', { cls: 'mut', label: 'product_id' });
    } else {
      P.region('db', 16, 12, 648, 204, '문서: order_doc 테이블 하나, 주문마다 문서 하나');
      s.docs.forEach(function (d, k) { P.box('d' + d.id, 30 + (k % 3) * 212, 44 + Math.floor(k / 3) * 84, 204, 76, { cls: d.cls === 'bad' ? 'bad now' : d.cls === 'good' ? 'good now' : d.cls === 'hot' ? 'hot now' : 'wait', title: '문서 ' + d.id + ' (' + d.who + ')', sub: [d.a, d.b] }); });
    }
    P.box('res', 16, 228, 648, 38, { cls: s.k === 'bad' ? 'bad' : s.k === 'good' ? 'good' : 'plain', title: '읽거나 고친 범위', right: s.res });
    P.box('chk', 16, 272, 648, 38, { cls: 'plain', title: '실행 뒤 확인한 것', right: s.chk });
    P.note(rel ? '읽을 때는 화살표를 따라 테이블을 조인합니다.' : '이 화면의 문서는 MySQL의 JSON 컬럼으로 재현한 것입니다.');
  },
  assume: '문서 모델은 MySQL의 JSON 컬럼으로 재현했습니다. 스무 가지 조합(저장 방식 둘, 하는 일 넷, 주문 수 2건, 3건, 5건)을 이 PC의 MySQL 8.4.11에서 화면과 같은 문장으로 실행해, 오류 코드, EXPLAIN에 나오는 테이블 수와 결과 행 수, UPDATE가 고친 행(문서) 수, gift가 있는 문서 수, 수량 합계가 화면과 일치하는 것을 확인했습니다. 설명에 쓴 다음 사실도 실행으로 확인했습니다. 조인 없이 읽으면 테이블마다 한 번씩 쿼리 세 번이 필요합니다. ALTER TABLE로 컬럼을 추가한 뒤에는 같은 INSERT가 들어가고 기존 행에도 그 칸이 생깁니다. 문서 하나만 고치면 같은 상품의 이름이 두 가지로 남습니다. JSON_SCHEMA_VALID 제약을 건 뒤에는 필드 이름을 틀린 문서가 오류 3819로 거절됩니다. 전용 문서 DB(MongoDB 등)는 이 PC에 없어 실행하지 못했습니다. 그래서 여기서 보인 것은 "주문을 문서 하나로 담았을 때의 읽기와 쓰기의 모양"이며, 문서 DB 제품의 동작 그대로는 아닙니다. 쿼리 문법, 배열 안의 값을 고치는 방법, 스키마 검사 기능, 여러 문서에 걸친 트랜잭션과 조인 지원은 제품과 버전에 따라 다릅니다. 어느 방식이 더 빠른지는 데이터의 양과 인덱스, 제품에 따라 달라지므로 다루지 않았고, 화면의 결과는 속도가 아니라 읽거나 고치는 곳의 수입니다. 키-값 저장소, 와이드 컬럼 저장소, 그래프 DB 같은 다른 종류의 NoSQL은 다루지 않았습니다.',
});

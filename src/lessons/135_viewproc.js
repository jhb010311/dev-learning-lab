Lab.register({
  id: 'viewproc', nav: '뷰, 프로시저, 트리거', cat: '데이터베이스', mode: 'step',
  title: 'INSERT 한 줄을 실행했는데 왜 재고가 줄었나',
  intro: 'DB 안에는 테이블 말고도 저장해 둘 수 있는 것이 있습니다. 뷰는 저장해 둔 SELECT 문이고, 프로시저는 이름으로 부르는 여러 문장이며, 트리거는 INSERT나 UPDATE가 일어날 때 DB가 자동으로 실행하는 문장입니다. 주문 하나를 넣으면서 애플리케이션 코드에 보이지 않는 곳에서 무슨 일이 일어나는지 따라가 보세요.',
  terms: ['뷰(View)', '저장 프로시저', '트리거', 'CHECK 제약', '트랜잭션'],
  controls: [
    { id: 'how', label: '애플리케이션이 주문을 넣는 방법', type: 'select', value: 'insert', options: [['insert', 'INSERT INTO orders 한 문장'], ['proc', 'CALL place_order (프로시저 호출)']] },
    { id: 'trig', label: 'orders 테이블에 트리거가 걸려 있다', type: 'check', value: true, hint: '주문이 들어오면 재고를 줄이고 로그를 남기는 트리거입니다. 누군가 예전에 만들어 둔 것이라고 생각해 보세요.' },
    { id: 'qty', label: '주문 수량 (재고는 10개)', type: 'select', value: '3', options: [['3', '3개'], ['6', '6개'], ['12', '12개 (재고보다 많음)']] },
  ],
  presets: [
    { t: '처음 설정으로', d: 'INSERT 한 문장인데 재고가 줄고 로그가 생깁니다.', v: { how: 'insert', trig: true, qty: '3' } },
    { t: '트리거가 없으면', d: '같은 INSERT인데 재고는 그대로입니다.', v: { how: 'insert', trig: false, qty: '3' } },
    { t: '프로시저로 주문', d: 'CALL 한 번으로 DB 안의 세 문장이 실행됩니다.', v: { how: 'proc', trig: false, qty: '3' } },
    { t: '프로시저와 트리거가 둘 다', d: '서로를 모르면 재고가 두 번 줄어듭니다.', v: { how: 'proc', trig: true, qty: '3' } },
    { t: '재고보다 많이 주문', d: 'orders에 넣었는데 product의 제약 오류가 납니다.', v: { how: 'insert', trig: true, qty: '12' } },
    { t: '둘 다 있고 6개 주문', d: '주문은 실패했는데 재고만 줄어듭니다.', v: { how: 'proc', trig: true, qty: '6' } },
  ],
  code: function (c) {
    var s = "-- product 테이블: (1, '키보드', stock 10)\n-- stock 컬럼에는 CHECK (stock >= 0) 제약이 있다\n\nCREATE VIEW v_stock AS            -- 뷰: SELECT 문만 저장\n  SELECT name, stock FROM product;\nCREATE TABLE stock_copy AS        -- 복사본: 지금의 결과를 행으로 저장\n  SELECT name, stock FROM product;\n";
    if (c.how === 'proc') s += "\nCREATE PROCEDURE place_order(IN p_product INT, IN p_qty INT)\nBEGIN\n  UPDATE product SET stock = stock - p_qty WHERE id = p_product;\n  INSERT INTO orders (product_id, qty) VALUES (p_product, p_qty);\n  INSERT INTO stock_log (product_id, change_qty, memo)\n    VALUES (p_product, -p_qty, '프로시저');\nEND;\n";
    if (c.trig) s += "\nCREATE TRIGGER trg_order_stock AFTER INSERT ON orders FOR EACH ROW\nBEGIN\n  UPDATE product SET stock = stock - NEW.qty WHERE id = NEW.product_id;\n  INSERT INTO stock_log (product_id, change_qty, memo)\n    VALUES (NEW.product_id, -NEW.qty, '트리거');\nEND;\n";
    else s += '\n-- orders 테이블에 트리거 없음\n';
    s += '\n-- 애플리케이션이 실행하는 문장은 이것 하나\n' + (c.how === 'proc' ? 'CALL place_order(1, ' + c.qty + ');' : 'INSERT INTO orders (product_id, qty) VALUES (1, ' + c.qty + ');');
    return s + '\n\nSELECT stock FROM v_stock;        -- 뷰로 조회\nSELECT stock FROM stock_copy;     -- 복사본으로 조회';
  },
  label: function (c) { return (c.how === 'proc' ? 'CALL 프로시저' : 'INSERT 한 문장') + ' · 트리거 ' + (c.trig ? '있음' : '없음') + ' · ' + c.qty + '개 주문'; },
  columns: ['주문 문장의 결과', 'orders 행 수', '실제 재고 (product)', 'stock_log 행 수', '뷰 / 복사본으로 본 재고'],
  simulate: function (c) {
    var q = +c.qty, proc = c.how === 'proc', trig = !!c.trig, ev = [], sum = [];
    var st = { stock: 10, orders: 0, logs: [], view: '?', copy: '?', did: {}, err: false, cur: 'init' };
    function push(s, k, cur) { st.cur = cur; ev.push({ s: s, k: k || '', snap: JSON.parse(JSON.stringify(st)) }); }
    var CHK = 'CHECK (stock >= 0) 제약';
    push('준비: product 테이블에 키보드 한 행이 있고 재고는 10개입니다. v_stock 뷰와 stock_copy 복사본 테이블을 만들어 두었습니다. 뷰에는 SELECT 문만 저장되고, 복사본에는 지금의 결과(재고 10개)가 행으로 저장됩니다.', '', 'init');
    // orders에 한 행을 넣는다. 트리거가 실패하면 넣은 행까지 취소된다(문장 단위 취소). 성공 여부를 돌려준다.
    function insertOrder(first) {
      st.orders++; st.did[proc ? 'procIns' : 'appIns'] = 1;
      push(first + 'orders에 주문 한 행(수량 ' + q + '개)이 들어갑니다.', '', 'ins');
      if (!trig) { if (!proc) push('orders 테이블에 걸린 트리거가 없으므로 이 문장이 한 일은 여기까지입니다. 재고를 줄이는 문장은 어디에서도 실행되지 않았습니다.' + (q > 10 ? ' 재고가 10개인데 12개 주문이 그대로 들어갔습니다.' : ''), q > 10 ? 'bad' : '', 'ins'); return true; }
      st.did.trg = 1;
      if (st.stock - q < 0) {
        st.orders--; st.err = true; st.did.trgFail = 1; delete st.did[proc ? 'procIns' : 'appIns'];
        push('트리거 trg_order_stock: orders에 INSERT가 일어났으므로 DB가 트리거를 자동으로 실행합니다. 트리거의 UPDATE가 재고 ' + st.stock + '개에서 ' + q + '개를 빼려다 ' + CHK + '에 걸려 실패합니다. 트리거가 실패하면 트리거를 일으킨 INSERT도 함께 취소되어, 방금 넣은 주문 행이 사라집니다.', 'bad', 'trg');
        return false;
      }
      var before = st.stock; st.stock -= q; st.did.trgUpd = 1;
      push('트리거 trg_order_stock: orders에 INSERT가 일어났으므로 DB가 트리거를 자동으로 실행합니다. 트리거의 UPDATE가 재고를 ' + before + '개에서 ' + st.stock + '개로 줄입니다.' + (proc ? ' 프로시저가 이미 한 번 줄였는데, 트리거가 같은 일을 한 번 더 했습니다.' : ' 애플리케이션 코드에는 이 UPDATE가 어디에도 없습니다.'), proc ? 'bad' : '', 'trg');
      st.logs.push('트리거'); st.did.trgLog = 1;
      push('트리거의 둘째 문장: stock_log에 "트리거"라는 메모와 함께 변경 기록 한 행을 넣습니다. 여기까지가 INSERT 한 문장 안에서 일어난 일입니다.', '', 'trg');
      return true;
    }
    var ok = true;
    if (!proc) ok = insertOrder('INSERT INTO orders ... VALUES (1, ' + q + '): 애플리케이션이 실행한 문장은 이것 하나입니다. ');
    else {
      st.did.call = 1;
      push('CALL place_order(1, ' + q + '): 애플리케이션은 프로시저의 이름과 값만 보냅니다. DB 안에 저장해 둔 세 문장이 차례로 실행됩니다.', '', 'call');
      if (st.stock - q < 0) {
        ok = false; st.err = true; st.did.procFail = 1;
        push('프로시저의 첫 문장 UPDATE product: 재고 10개에서 ' + q + '개를 빼려다 ' + CHK + '에 걸려 실패합니다. 프로시저는 실패한 문장에서 멈추고, 뒤의 INSERT 두 개는 실행되지 않습니다.', 'bad', 'p1');
      } else {
        st.stock -= q; st.did.procUpd = 1;
        push('프로시저의 첫 문장 UPDATE product: 재고를 10개에서 ' + st.stock + '개로 줄입니다.', '', 'p1');
        ok = insertOrder('프로시저의 둘째 문장 INSERT INTO orders: ');
        if (!ok) push('프로시저는 실패한 문장에서 멈추고, 셋째 문장(로그 기록)은 실행되지 않습니다. 그런데 첫 문장이 줄여 놓은 재고(10개에서 ' + st.stock + '개)는 되돌아가지 않았습니다. 자동 커밋 상태에서는 프로시저 안의 문장도 하나씩 따로 확정되기 때문입니다. 주문은 없는데 재고만 줄었습니다.', 'bad', 'p2');
        else { st.logs.push('프로시저'); st.did.procLog = 1; push('프로시저의 셋째 문장 INSERT INTO stock_log: "프로시저"라는 메모와 함께 변경 기록 한 행을 넣습니다.', '', 'p3'); }
      }
    }
    if (!ok) push('애플리케이션은 오류 3819(Check constraint \'chk_stock\' is violated)를 받습니다.' + (proc && !st.did.trg ? '' : ' 실행한 문장은 ' + (proc ? 'CALL' : 'orders에 대한 INSERT') + '인데, 오류 메시지는 트리거가 건드린 product 테이블의 제약을 말합니다.'), 'bad', 'err');
    var changed = st.stock !== 10;
    st.view = String(st.stock); st.did.view = 1;
    push('SELECT stock FROM v_stock: 뷰에는 데이터가 없고 SELECT 문만 저장돼 있습니다. 조회하는 지금 product를 읽어 ' + st.stock + '개를 돌려줍니다.' + (changed ? ' 뷰를 고친 적은 없지만 원본 테이블이 바뀌었으므로 결과도 바뀌었습니다.' : ' 원본 테이블이 바뀌지 않았으므로 처음과 같습니다.'), changed ? 'good' : '', 'view');
    st.copy = '10'; st.did.copy = 1;
    push('SELECT stock FROM stock_copy: 복사본 테이블은 만들 때의 결과를 자기 행으로 저장해 두었습니다. product가 바뀌어도 따라 바뀌지 않으므로 10개 그대로입니다.' + (changed ? ' 실제 재고와 어긋난 값입니다.' : ''), changed ? 'bad' : '', 'copy');
    sum.push('주문 문장은 ' + (ok ? '성공했습니다' : '오류로 끝났습니다') + '. orders ' + st.orders + '행, 실제 재고 ' + st.stock + '개, stock_log ' + st.logs.length + '행입니다. 뷰로 본 재고는 ' + st.view + '개, 복사본의 재고는 10개입니다.');
    if (!proc && trig && ok) sum.push('애플리케이션 코드에는 INSERT 한 줄뿐인데 테이블 세 개가 바뀌었습니다. 트리거는 빠뜨릴 수 없다는 점에서 편리하지만 코드를 읽는 사람에게 보이지 않습니다. 재고가 왜 줄었는지 찾으려면 DB에 걸려 있는 트리거까지 알아야 합니다.');
    if (!proc && trig && !ok) sum.push('orders에 INSERT를 했는데 product 테이블의 제약 오류가 났습니다. 트리거가 있다는 것을 모르면 원인을 찾기 어렵습니다. 트리거가 실패하면 원래 문장도 취소되므로 주문 행은 남지 않았습니다.');
    if (!proc && !trig) sum.push('트리거가 없으면 INSERT는 orders에 행을 넣는 일만 합니다. 재고를 줄이고 기록을 남기는 일은 애플리케이션이 직접 문장을 보내거나 프로시저에 맡겨야 합니다.' + (q > 10 ? ' 재고를 확인하는 곳이 없어서 재고보다 많은 주문이 들어갔습니다.' : ''));
    if (proc && !trig) sum.push(ok ? '프로시저는 여러 문장을 DB 안에 저장해 두고 이름으로 부르는 것입니다. 애플리케이션은 CALL 한 줄만 보내면 됩니다. 대신 주문 처리 규칙이 애플리케이션 코드가 아니라 DB 안에 있게 되어, 코드만 읽어서는 무슨 일이 일어나는지 알 수 없습니다.' : '프로시저의 첫 문장이 재고를 먼저 줄이려다 실패했으므로 아무것도 바뀌지 않았습니다. 재고 확인이 맨 앞에 있어서 주문 행이 생기기 전에 멈췄습니다.');
    if (proc && trig && ok) sum.push('재고가 ' + q + '개가 아니라 ' + (q * 2) + '개 줄었고 로그도 두 줄입니다. 프로시저를 만든 사람은 재고를 직접 줄였고, 트리거도 같은 일을 했습니다. 트리거는 호출하는 쪽에서 보이지 않기 때문에, 서로의 존재를 모르면 같은 변경이 두 번 일어납니다.');
    if (proc && trig && !ok && st.did.trg) sum.push('주문은 실패했는데 재고는 ' + st.stock + '개로 줄어 있습니다. 여러 문장이 함께 성공하거나 함께 취소되게 하려면 트랜잭션으로 묶어야 합니다. 같은 CALL을 트랜잭션 안에서 실행하고 오류가 났을 때 ROLLBACK하면 재고가 10개로 돌아옵니다.');
    if (proc && trig && !ok && !st.did.trg) sum.push('프로시저의 첫 문장에서 실패해 트리거까지 가지도 않았습니다. 아무것도 바뀌지 않았습니다.');
    sum.push(changed ? '뷰는 데이터를 따로 저장하지 않는 "저장해 둔 쿼리"입니다. 조회할 때마다 원본 테이블을 읽으므로 재고가 바뀌자 뷰의 결과도 ' + st.view + '개로 바뀌었습니다. 결과를 테이블로 복사해 둔 쪽은 10개에 머물러 있습니다.' : '이번에는 재고가 바뀌지 않아 뷰와 복사본의 값이 같습니다. 재고가 바뀌는 설정으로 실행하면 뷰만 따라 바뀌는 것을 볼 수 있습니다.');
    return { events: ev, summary: sum, row: [ok ? '성공' : '오류 3819 (CHECK 제약 위반)', st.orders + '행', st.stock + '개', st.logs.length + '행' + (st.logs.length ? ' (' + st.logs.join(', ') + ')' : ''), st.view + '개 / 10개'] };
  },
  render: function (v, sim, t, H, shown) {
    var c = sim.c, last = shown[shown.length - 1], s = last ? last.snap : null, q = +c.qty;
    if (!s) { H.text(v, '실행을 누르면 한 문장씩 진행합니다.'); return; }
    H.table(v, ['id', 'name', 'stock'], [{ cells: ['1', '키보드', { v: String(s.stock), cls: s.stock !== 10 ? 'hot' : '' }] }], 'product 테이블');
    if (s.orders) H.table(v, ['id', 'product_id', 'qty'], [{ cells: ['1', '1', String(q)] }], 'orders 테이블');
    else { H.title(v, 'orders 테이블'); H.text(v, s.err ? '행이 없습니다 (넣으려던 주문이 취소됨).' : '행이 없습니다.'); }
    if (s.logs.length) H.table(v, ['id', 'product_id', 'change_qty', 'memo'], s.logs.map(function (m, i) { return { cells: [String(i + 1), '1', String(-q), m] }; }), 'stock_log 테이블');
    else { H.title(v, 'stock_log 테이블'); H.text(v, '행이 없습니다.'); }
    var ln = H.lanes(v);
    H.lane(ln, '애플리케이션', s.cur === 'init' ? '아직 실행 전' : (c.how === 'proc' ? 'CALL place_order(1, ' + q + ')' : 'INSERT INTO orders 한 문장') + (s.err ? ' → 오류 3819' : ''), s.cur === 'init' ? 'none' : s.err ? 'bad' : 'hot');
    H.lane(ln, '트리거', !c.trig ? '없음' : s.did.trgFail ? '자동 실행됨 → 제약 위반으로 실패' : s.did.trgUpd ? '자동 실행됨: 재고 감소' + (s.did.trgLog ? ', 로그 기록' : '') : '아직 실행되지 않음', !c.trig ? 'none' : s.did.trgFail ? 'bad' : s.did.trgUpd ? 'hot' : 'none');
    H.lane(ln, 'v_stock (뷰)', s.view === '?' ? '아직 조회 전' : '재고 ' + s.view + '개 (지금의 product를 읽음)', s.view === '?' ? 'none' : 'good');
    H.lane(ln, 'stock_copy (복사본)', s.copy === '?' ? '아직 조회 전' : '재고 10개 (만들 때의 값)', s.copy === '?' ? 'none' : s.stock !== 10 ? 'bad' : 'wait');
  },
  // 그림: 왼쪽에 애플리케이션, 오른쪽 DB 안에 프로시저·트리거와 테이블 셋, 아래에 뷰와 복사본. 누가 어느 테이블을 고쳤는지 화살표로 잇는다.
  draw: function (P, sim, shown) {
    var c = sim.c, last = shown[shown.length - 1], s = last ? last.snap : { stock: 10, orders: 0, logs: [], view: '?', copy: '?', did: {}, err: false, cur: 'none' }, d = s.did, proc = c.how === 'proc', q = +c.qty;
    P.size(680, 330);
    P.box('app', 16, 44, 124, 52, { cls: s.cur === 'none' || s.cur === 'init' ? 'plain' : s.err ? 'bad' : 'hot', title: '애플리케이션', sub: proc ? 'CALL 한 번' : 'INSERT 한 문장' });
    P.region('db', 156, 16, 508, 298, 'MySQL 안');
    if (proc) P.box('proc', 170, 48, 174, 44, { cls: d.procFail ? 'bad' : d.call ? 'hot' : 'plain', title: '프로시저 place_order', sub: '저장해 둔 문장 3개' });
    P.box('trg', 170, 126, 174, 44, c.trig ? { cls: (d.trgFail ? 'bad' : d.trg ? 'hot' : 'plain') + (s.cur === 'trg' ? ' now' : ''), title: '트리거 (orders에 걸림)', sub: 'INSERT 때 자동 실행' } : { cls: 'ghost', title: '트리거 없음' });
    P.box('orders', 476, 48, 172, 44, { cls: s.orders ? 'good' : d.trgFail ? 'bad' : 'plain', title: 'orders', right: s.orders + '행', sub: d.trgFail ? '넣은 행이 취소됨' : s.orders ? '수량 ' + q + '개' : '' });
    P.box('product', 476, 126, 172, 44, { cls: s.stock !== 10 ? 'hot' : 'plain', title: 'product', right: '재고 ' + s.stock + '개', sub: '키보드' });
    P.box('slog', 476, 204, 172, 44, { cls: s.logs.length ? 'good' : 'plain', title: 'stock_log', right: s.logs.length + '행', sub: s.logs.join(', ') });
    P.box('view', 170, 260, 174, 44, { cls: s.view === '?' ? 'plain' : 'good', title: 'v_stock (뷰)', right: s.view === '?' ? '' : s.view + '개', sub: 'SELECT 문만 저장' });
    P.box('copy', 16, 260, 130, 44, { cls: s.copy === '?' ? 'plain' : s.stock !== 10 ? 'bad' : 'wait', title: 'stock_copy', right: s.copy === '?' ? '' : '10개', sub: '복사해 둔 행' });
    if (d.appIns || (!proc && d.trgFail)) P.arrow('aIns', 'app:r', 'orders:l', { cls: d.trgFail ? 'bad' : 'hot', label: 'INSERT' });
    if (d.call) P.arrow('aCall', 'app:r', 'proc:l', { cls: d.procFail ? 'bad' : 'hot' });
    if (d.procIns || (proc && d.trgFail)) P.arrow('pIns', 'proc:r:0.3', 'orders:l:0.4', { cls: d.trgFail ? 'bad' : 'hot', label: 'INSERT' });
    if (d.procUpd || d.procFail) P.arrow('pUpd', 'proc:r:0.75', 'product:l:0.2', d.procFail ? { cls: 'bad', label: '실패' } : { cls: 'hot' });
    if (d.procLog) P.arrow('pLog', 'proc:r:0.95', 'slog:l:0.25', { cls: 'hot' });
    if (d.trg) P.arrow('tRun', 'orders:l:0.85', 'trg:r:0.15', { cls: 'dash' });
    if (d.trgUpd || d.trgFail) P.arrow('tUpd', 'trg:r:0.65', 'product:l:0.7', d.trgFail ? { cls: 'bad', label: '실패' } : { cls: 'bad' });
    if (d.trgLog) P.arrow('tLog', 'trg:b:0.85', 'slog:l:0.6', { cls: 'bad' });
    if (d.view) P.arrow('vRead', 'view:r', 'product:b:0.12', { cls: 'good' });
    P.note('노란 화살표는 애플리케이션이나 프로시저가 실행한 문장이고, 빨간 화살표는 트리거가 한 일입니다. 점선은 orders에 INSERT가 일어나 트리거가 자동으로 실행됐다는 표시입니다. 트리거가 한 일은 애플리케이션이 보낸 문장에 적혀 있지 않습니다. 초록 화살표처럼 뷰는 조회할 때마다 product를 읽고, 왼쪽 아래의 복사본 테이블은 만들 때 복사해 둔 값을 그대로 갖고 있습니다.');
  },
  assume: '열두 가지 조합 모두, 화면의 SQL과 같은 테이블, 뷰, 프로시저, 트리거를 이 PC의 MySQL 8.4(InnoDB, 자동 커밋 켜짐)에 만들고 주문 문장을 실행해 오류 여부, 각 테이블의 행 수, 재고, 뷰와 복사본의 값을 대조했습니다. 뷰가 데이터를 저장하지 않는다는 것은 information_schema에서 v_stock이 저장 엔진이 없는 VIEW로, stock_copy가 InnoDB 테이블로 나오는 것으로 확인했습니다. "트랜잭션으로 묶고 ROLLBACK하면 재고가 돌아온다"는 것도 같은 DB에서 한 번 실행해 확인했습니다. 트리거가 실패했을 때 원래 문장이 함께 취소되는 것은 InnoDB처럼 트랜잭션을 지원하는 엔진에서의 동작입니다. 프로시저 안에서 오류가 났을 때 어디까지 남는지는 자동 커밋 설정, 프로시저 안의 START TRANSACTION과 오류 처리기(HANDLER)에 따라 달라지며, 여기서는 그런 장치가 없는 가장 단순한 프로시저를 썼습니다. 재고가 모자랄 때의 오류는 CHECK 제약(MySQL 8.0.16부터 실제로 검사)에서 나오게 했습니다.',
});

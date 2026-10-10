Lab.register({
  id: 'viewproc', nav: 'Views, stored procedures, and triggers', cat: 'Database', mode: 'step',
  title: 'Why did the stock go down when you ran one INSERT line?',
  intro: 'A database can store more than tables. A view is a stored SELECT statement, a stored procedure is a set of statements that you call by name, and a trigger is a statement that the database runs automatically when an INSERT or UPDATE happens. Follow what happens, out of sight of the application code, when one order is inserted.',
  terms: ['View', 'Stored procedure', 'Trigger', 'CHECK constraint', 'Transaction'],
  controls: [
    { id: 'how', label: 'How the application inserts the order', type: 'select', value: 'insert', options: [['insert', 'One INSERT INTO orders statement'], ['proc', 'CALL place_order (call the procedure)']] },
    { id: 'trig', label: 'A trigger is defined on the orders table', type: 'check', value: true, hint: 'This trigger reduces the stock and writes a log row when an order comes in. Imagine that someone created it a long time ago.' },
    { id: 'qty', label: 'Order quantity (the stock is 10)', type: 'select', value: '3', options: [['3', '3 items'], ['6', '6 items'], ['12', '12 items (more than the stock)']] },
  ],
  presets: [
    { t: 'Default settings', d: 'It is one INSERT statement, yet the stock goes down and a log row appears.', v: { how: 'insert', trig: true, qty: '3' } },
    { t: 'Without the trigger', d: 'The same INSERT, but the stock stays the same.', v: { how: 'insert', trig: false, qty: '3' } },
    { t: 'Ordering with the procedure', d: 'One CALL runs three statements inside the database.', v: { how: 'proc', trig: false, qty: '3' } },
    { t: 'Both the procedure and the trigger', d: 'If they do not know about each other, the stock is reduced twice.', v: { how: 'proc', trig: true, qty: '3' } },
    { t: 'Ordering more than the stock', d: 'You insert into orders, but you get a constraint error from product.', v: { how: 'insert', trig: true, qty: '12' } },
    { t: 'Both, and an order of 6', d: 'The order fails, but the stock still goes down.', v: { how: 'proc', trig: true, qty: '6' } },
  ],
  code: function (c) {
    var s = "-- product table: (1, 'keyboard', stock 10)\n-- The stock column has a CHECK (stock >= 0) constraint\n\nCREATE VIEW v_stock AS            -- View: stores only the SELECT statement\n  SELECT name, stock FROM product;\nCREATE TABLE stock_copy AS        -- Copy: stores the current result as rows\n  SELECT name, stock FROM product;\n";
    if (c.how === 'proc') s += "\nCREATE PROCEDURE place_order(IN p_product INT, IN p_qty INT)\nBEGIN\n  UPDATE product SET stock = stock - p_qty WHERE id = p_product;\n  INSERT INTO orders (product_id, qty) VALUES (p_product, p_qty);\n  INSERT INTO stock_log (product_id, change_qty, memo)\n    VALUES (p_product, -p_qty, 'proc');\nEND;\n";
    if (c.trig) s += "\nCREATE TRIGGER trg_order_stock AFTER INSERT ON orders FOR EACH ROW\nBEGIN\n  UPDATE product SET stock = stock - NEW.qty WHERE id = NEW.product_id;\n  INSERT INTO stock_log (product_id, change_qty, memo)\n    VALUES (NEW.product_id, -NEW.qty, 'trigger');\nEND;\n";
    else s += '\n-- No trigger on the orders table\n';
    s += '\n-- The application runs only this one statement\n' + (c.how === 'proc' ? 'CALL place_order(1, ' + c.qty + ');' : 'INSERT INTO orders (product_id, qty) VALUES (1, ' + c.qty + ');');
    return s + '\n\nSELECT stock FROM v_stock;        -- Query through the view\nSELECT stock FROM stock_copy;     -- Query the copy';
  },
  label: function (c) { return (c.how === 'proc' ? 'CALL procedure' : 'One INSERT statement') + ' · trigger ' + (c.trig ? 'present' : 'absent') + ' · order of ' + c.qty; },
  columns: ['Result of the order statement', 'Rows in orders', 'Actual stock (product)', 'Rows in stock_log', 'Stock seen through the view / the copy'],
  simulate: function (c) {
    var q = +c.qty, proc = c.how === 'proc', trig = !!c.trig, ev = [], sum = [];
    var st = { stock: 10, orders: 0, logs: [], view: '?', copy: '?', did: {}, err: false, cur: 'init' };
    function push(s, k, cur) { st.cur = cur; ev.push({ s: s, k: k || '', snap: JSON.parse(JSON.stringify(st)) }); }
    var CHK = 'CHECK (stock >= 0) constraint';
    push('Setup: The product table has one row for the keyboard, and its stock is 10. The v_stock view and the stock_copy table have been created. The view stores only a SELECT statement, and the copy stores the current result (a stock of 10) as rows.', '', 'init');
    // Insert one row into orders. If the trigger fails, the inserted row is undone too (the whole statement is rolled back). Returns whether it succeeded.
    function insertOrder(first) {
      st.orders++; st.did[proc ? 'procIns' : 'appIns'] = 1;
      push(first + 'One order row (quantity ' + q + ') is inserted into orders.', '', 'ins');
      if (!trig) { if (!proc) push('There is no trigger on the orders table, so this statement did nothing more than that. No statement that reduces the stock was run anywhere.' + (q > 10 ? ' The stock is 10, but an order for 12 went in as it was.' : ''), q > 10 ? 'bad' : '', 'ins'); return true; }
      st.did.trg = 1;
      if (st.stock - q < 0) {
        st.orders--; st.err = true; st.did.trgFail = 1; delete st.did[proc ? 'procIns' : 'appIns'];
        push('Trigger trg_order_stock: An INSERT happened on orders, so the database activates the trigger automatically. The UPDATE in the trigger tries to subtract ' + q + ' from a stock of ' + st.stock + ', but it violates the ' + CHK + ' and fails. When a trigger fails, the INSERT that activated it is rolled back too, so the order row that was just inserted disappears.', 'bad', 'trg');
        return false;
      }
      var before = st.stock; st.stock -= q; st.did.trgUpd = 1;
      push('Trigger trg_order_stock: An INSERT happened on orders, so the database activates the trigger automatically. The UPDATE in the trigger reduces the stock from ' + before + ' to ' + st.stock + '.' + (proc ? ' The procedure had already reduced it once, and the trigger did the same thing one more time.' : ' This UPDATE appears nowhere in the application code.'), proc ? 'bad' : '', 'trg');
      st.logs.push('trigger'); st.did.trgLog = 1;
      push('Second statement of the trigger: A row recording the change is inserted into stock_log, with the memo "trigger". Everything up to here happened inside the one INSERT statement.', '', 'trg');
      return true;
    }
    var ok = true;
    if (!proc) ok = insertOrder('INSERT INTO orders ... VALUES (1, ' + q + '): The application ran only this one statement. ');
    else {
      st.did.call = 1;
      push('CALL place_order(1, ' + q + '): The application sends only the name of the procedure and the values. The three statements stored inside the database run one after another.', '', 'call');
      if (st.stock - q < 0) {
        ok = false; st.err = true; st.did.procFail = 1;
        push('First statement of the procedure, UPDATE product: It tries to subtract ' + q + ' from a stock of 10, but it violates the ' + CHK + ' and fails. The procedure stops at the failed statement, and the two INSERT statements after it do not run.', 'bad', 'p1');
      } else {
        st.stock -= q; st.did.procUpd = 1;
        push('First statement of the procedure, UPDATE product: It reduces the stock from 10 to ' + st.stock + '.', '', 'p1');
        ok = insertOrder('Second statement of the procedure, INSERT INTO orders: ');
        if (!ok) push('The procedure stops at the failed statement, and the third statement (writing the log) does not run. But the stock that the first statement reduced (from 10 to ' + st.stock + ') was not restored. This is because, with autocommit on, each statement inside a procedure is also committed on its own. There is no order, but the stock went down.', 'bad', 'p2');
        else { st.logs.push('proc'); st.did.procLog = 1; push('Third statement of the procedure, INSERT INTO stock_log: A row recording the change is inserted, with the memo "proc".', '', 'p3'); }
      }
    }
    if (!ok) push('The application receives error 3819 (Check constraint \'chk_stock\' is violated).' + (proc && !st.did.trg ? '' : ' The statement it ran was ' + (proc ? 'the CALL' : 'the INSERT into orders') + ', but the error message names the constraint on the product table, which the trigger touched.'), 'bad', 'err');
    var changed = st.stock !== 10;
    st.view = String(st.stock); st.did.view = 1;
    push('SELECT stock FROM v_stock: The view holds no data, only a SELECT statement. It reads product at the moment you query it and returns a stock of ' + st.stock + '.' + (changed ? ' The view itself was never changed, but the base table changed, so the result changed too.' : ' The base table did not change, so the value is the same as at the start.'), changed ? 'good' : '', 'view');
    st.copy = '10'; st.did.copy = 1;
    push('SELECT stock FROM stock_copy: The copy table stored the result from when it was created, as its own rows. It does not change when product changes, so it is still 10.' + (changed ? ' This value no longer matches the actual stock.' : ''), changed ? 'bad' : '', 'copy');
    sum.push('The order statement ' + (ok ? 'succeeded' : 'ended with an error') + '. Rows in orders: ' + st.orders + ', actual stock: ' + st.stock + ', rows in stock_log: ' + st.logs.length + '. The stock seen through the view is ' + st.view + ', and the stock in the copy is 10.');
    if (!proc && trig && ok) sum.push('The application code has just one INSERT line, but three tables changed. A trigger is convenient because it cannot be forgotten, but it is invisible to the person reading the code. To find out why the stock went down, you have to know about the triggers defined in the database.');
    if (!proc && trig && !ok) sum.push('You ran an INSERT on orders, but you got an error about a constraint on the product table. If you do not know a trigger exists, it is hard to find the cause. A failed trigger also makes the original statement fail, so no order row was left.');
    if (!proc && !trig) sum.push('Without a trigger, the INSERT does nothing but insert a row into orders. Reducing the stock and recording the change is left to the application, which must send those statements itself, or to a procedure.' + (q > 10 ? ' Nothing checks the stock, so an order for more than the stock went in.' : ''));
    if (proc && !trig) sum.push(ok ? 'A procedure stores several statements in the database and runs them by name. The application only has to send one CALL line. In exchange, the order-handling rules live in the database rather than in the application code, so you cannot tell what happens just by reading the code.' : 'The first statement of the procedure tried to reduce the stock first and failed, so nothing changed. The stock check comes first, so it stopped before any order row was created.');
    if (proc && trig && ok) sum.push('The stock went down by ' + (q * 2) + ', not ' + q + ', and there are two log rows. The person who wrote the procedure reduced the stock directly, and the trigger did the same thing. Because a trigger is invisible to the caller, if the two do not know about each other, the same change happens twice.');
    if (proc && trig && !ok && st.did.trg) sum.push('The order failed, but the stock is down to ' + st.stock + '. To make several statements succeed together or be rolled back together, you have to group them in a transaction. If you run the same CALL inside a transaction and run ROLLBACK when an error occurs, the stock returns to 10.');
    if (proc && trig && !ok && !st.did.trg) sum.push('It failed at the first statement of the procedure and never reached the trigger. Nothing changed.');
    sum.push(changed ? 'A view is a "stored query" that does not store data separately. It reads the base table every time you query it, so when the stock changed, the result of the view changed to ' + st.view + ' as well. The copy, where the result was copied into a table, is still at 10.' : 'The stock did not change this time, so the view and the copy show the same value. If you run a setting where the stock changes, you can see that only the view changes along with it.');
    return { events: ev, summary: sum, row: [ok ? 'Success' : 'Error 3819 (CHECK constraint violated)', String(st.orders), String(st.stock), st.logs.length + (st.logs.length ? ' (' + st.logs.join(', ') + ')' : ''), st.view + ' / 10'] };
  },
  render: function (v, sim, t, H, shown) {
    var c = sim.c, last = shown[shown.length - 1], s = last ? last.snap : null, q = +c.qty;
    if (!s) { H.text(v, 'Click Run to go one statement at a time.'); return; }
    H.table(v, ['id', 'name', 'stock'], [{ cells: ['1', 'keyboard', { v: String(s.stock), cls: s.stock !== 10 ? 'hot' : '' }] }], 'product table');
    if (s.orders) H.table(v, ['id', 'product_id', 'qty'], [{ cells: ['1', '1', String(q)] }], 'orders table');
    else { H.title(v, 'orders table'); H.text(v, s.err ? 'No rows (the order that was being inserted was rolled back).' : 'No rows.'); }
    if (s.logs.length) H.table(v, ['id', 'product_id', 'change_qty', 'memo'], s.logs.map(function (m, i) { return { cells: [String(i + 1), '1', String(-q), m] }; }), 'stock_log table');
    else { H.title(v, 'stock_log table'); H.text(v, 'No rows.'); }
    var ln = H.lanes(v);
    H.lane(ln, 'Application', s.cur === 'init' ? 'Not run yet' : (c.how === 'proc' ? 'CALL place_order(1, ' + q + ')' : 'One INSERT INTO orders statement') + (s.err ? ' → error 3819' : ''), s.cur === 'init' ? 'none' : s.err ? 'bad' : 'hot');
    H.lane(ln, 'Trigger', !c.trig ? 'None' : s.did.trgFail ? 'Activated automatically → failed on a constraint violation' : s.did.trgUpd ? 'Activated automatically: reduced the stock' + (s.did.trgLog ? ', wrote the log' : '') : 'Not activated yet', !c.trig ? 'none' : s.did.trgFail ? 'bad' : s.did.trgUpd ? 'hot' : 'none');
    H.lane(ln, 'v_stock (view)', s.view === '?' ? 'Not queried yet' : 'Stock ' + s.view + ' (read from product just now)', s.view === '?' ? 'none' : 'good');
    H.lane(ln, 'stock_copy (copy)', s.copy === '?' ? 'Not queried yet' : 'Stock 10 (the value when it was created)', s.copy === '?' ? 'none' : s.stock !== 10 ? 'bad' : 'wait');
  },
  // Diagram: On the left is the application. On the right, inside the database, are the procedure, the trigger, and three tables, with the view and the copy below. Arrows connect who changed which table.
  draw: function (P, sim, shown) {
    var c = sim.c, last = shown[shown.length - 1], s = last ? last.snap : { stock: 10, orders: 0, logs: [], view: '?', copy: '?', did: {}, err: false, cur: 'none' }, d = s.did, proc = c.how === 'proc', q = +c.qty;
    P.size(680, 330);
    P.box('app', 16, 44, 124, 52, { cls: s.cur === 'none' || s.cur === 'init' ? 'plain' : s.err ? 'bad' : 'hot', title: 'Application', sub: proc ? 'One CALL' : 'One INSERT' });
    P.region('db', 156, 16, 508, 298, 'Inside MySQL');
    if (proc) P.box('proc', 170, 48, 174, 44, { cls: d.procFail ? 'bad' : d.call ? 'hot' : 'plain', title: 'Procedure', sub: '3 statements' });
    P.box('trg', 170, 126, 174, 44, c.trig ? { cls: (d.trgFail ? 'bad' : d.trg ? 'hot' : 'plain') + (s.cur === 'trg' ? ' now' : ''), title: 'Trigger (on orders)', sub: 'Runs on INSERT' } : { cls: 'ghost', title: 'No trigger' });
    P.box('orders', 476, 48, 172, 44, { cls: s.orders ? 'good' : d.trgFail ? 'bad' : 'plain', title: 'orders', right: 'Rows: ' + s.orders, sub: d.trgFail ? 'Rolled back' : s.orders ? 'Quantity ' + q : '' });
    P.box('product', 476, 126, 172, 44, { cls: s.stock !== 10 ? 'hot' : 'plain', title: 'product', right: 'Stock: ' + s.stock, sub: 'keyboard' });
    P.box('slog', 476, 204, 172, 44, { cls: s.logs.length ? 'good' : 'plain', title: 'stock_log', right: 'Rows: ' + s.logs.length, sub: s.logs.join('/') });
    P.box('view', 170, 260, 174, 44, { cls: s.view === '?' ? 'plain' : 'good', title: 'v_stock (view)', right: s.view === '?' ? '' : s.view, sub: 'SELECT only' });
    P.box('copy', 16, 260, 130, 44, { cls: s.copy === '?' ? 'plain' : s.stock !== 10 ? 'bad' : 'wait', title: 'stock_copy', right: s.copy === '?' ? '' : '10', sub: 'Copied rows' });
    if (d.appIns || (!proc && d.trgFail)) P.arrow('aIns', 'app:r', 'orders:l', { cls: d.trgFail ? 'bad' : 'hot', label: 'INSERT' });
    if (d.call) P.arrow('aCall', 'app:r', 'proc:l', { cls: d.procFail ? 'bad' : 'hot' });
    if (d.procIns || (proc && d.trgFail)) P.arrow('pIns', 'proc:r:0.3', 'orders:l:0.4', { cls: d.trgFail ? 'bad' : 'hot', label: 'INSERT' });
    if (d.procUpd || d.procFail) P.arrow('pUpd', 'proc:r:0.75', 'product:l:0.2', d.procFail ? { cls: 'bad', label: 'failed' } : { cls: 'hot' });
    if (d.procLog) P.arrow('pLog', 'proc:r:0.95', 'slog:l:0.25', { cls: 'hot' });
    if (d.trg) P.arrow('tRun', 'orders:l:0.85', 'trg:r:0.15', { cls: 'dash' });
    if (d.trgUpd || d.trgFail) P.arrow('tUpd', 'trg:r:0.65', 'product:l:0.7', d.trgFail ? { cls: 'bad', label: 'failed' } : { cls: 'bad' });
    if (d.trgLog) P.arrow('tLog', 'trg:b:0.85', 'slog:l:0.6', { cls: 'bad' });
    if (d.view) P.arrow('vRead', 'view:r', 'product:b:0.12', { cls: 'good' });
    P.note('Yellow arrows are statements run by the application or the procedure, and red arrows are what the trigger did. The dotted line shows that an INSERT on orders activated the trigger automatically. What the trigger did is not written in the statement the application sent. As the green arrow shows, the view reads product every time you query it, while the copy table at the lower left keeps the values that were copied when it was created.');
  },
  assume: 'For all 12 combinations, the same tables, view, procedure, and trigger as the ones on the screen were created on MySQL 8.4 (InnoDB, autocommit on) on the PC used to write this lab, and the order statement was run. The error or success, the number of rows in each table, the stock, and the values from the view and the copy were checked against the screen. That the view stores no data was checked in information_schema, where v_stock shows up as a VIEW with no storage engine and stock_copy shows up as an InnoDB table. That the stock returns when the statements are grouped in a transaction and rolled back was also checked by running it once on the same database. That the original statement is rolled back together with a failed trigger is the behavior on an engine that supports transactions, such as InnoDB. How much remains after an error inside a procedure depends on the autocommit setting, START TRANSACTION inside the procedure, and handlers (DECLARE ... HANDLER), and here the simplest procedure without any of these was used. The error when the stock is short was produced by a CHECK constraint (which MySQL actually enforces from 8.0.16).',
});

Lab.register({
  id: 'nosql', nav: 'NoSQL and the document model', cat: 'Database', mode: 'step',
  title: 'Split an order into three tables, or put it in one document?',
  intro: 'Store the same data (orders and order items) in two ways. The relational way splits products, orders, and order items into three tables and joins them when reading. The document model is the way used by document databases such as MongoDB: it treats one order as one document and puts the array of items and even the product names inside it.',
  terms: ['NoSQL', 'Document model (document database)', 'Fixed schema and flexible schema', 'Normalization and denormalization', 'JOIN (INNER, OUTER)'],
  controls: [
    { id: 'model', label: 'How to store', type: 'select', value: 'doc', options: [['doc', 'Document: one order holds its items too'], ['rel', 'Relational: split into three tables and join']] },
    { id: 'op', label: 'What to do', type: 'select', value: 'rename', options: [['read', 'Read one order'], ['rename', 'Rename a product (keyboard → mechanical keyboard)'], ['newfield', 'Add a field that did not exist (gift wrapping) to a new order'], ['typo', 'Insert an order, misspelling the quantity field as quantity instead of qty']] },
    { id: 'n', label: 'Number of orders (all orders contain a keyboard)', type: 'range', min: 2, max: 5, value: 3, step: 1, fmt: function (v) { return v + ' orders'; }, show: function (c) { return c.op !== 'read'; } },
  ],
  // Reading one order does not depend on the number of orders, so it is left at the default value
  fix: function (c) { return c.op === 'read' && +c.n !== 3 ? { n: 3 } : null; },
  presets: [
    { t: 'Default settings', q: 'What happens when you rename a product from keyboard to mechanical keyboard in the document model, with 3 orders that contain a keyboard?', d: 'In the document model, renaming a product means fixing every document that contains it.', v: { model: 'doc', op: 'rename', n: 3 } },
    { t: 'Renaming in the relational model', q: 'What if you store the data relationally, split into three tables and joined?', d: 'However many orders there are, only one row of the product table is changed.', v: { model: 'rel', op: 'rename', n: 3 } },
    { t: 'Reading one order as a document', q: 'What if you read one order in the document model?', d: 'It ends with a single document, with no join.', v: { model: 'doc', op: 'read', n: 3 } },
    { t: 'Reading one order relationally', q: 'What if you read one order in the relational model?', d: 'You have to join three tables to complete one order.', v: { model: 'rel', op: 'read', n: 3 } },
    { t: 'Adding a new field to a document', q: 'What if you add a field that did not exist (gift wrapping) to a new order in the document model?', d: 'It is stored right away without changing the structure. In return, documents end up with different shapes.', v: { model: 'doc', op: 'newfield', n: 3 } },
    { t: 'Inserting a column that does not exist in the relational model', q: 'What if you add the gift wrapping field to a new order in the relational model?', d: 'It is rejected with error 1054. You first have to change the table structure.', v: { model: 'rel', op: 'newfield', n: 3 } },
    { t: 'Misspelling a field name in a document', q: 'What if you insert an order in the document model, misspelling the quantity field as quantity instead of qty?', d: 'It is stored without an error, and the quantity total becomes quietly wrong.', v: { model: 'doc', op: 'typo', n: 3 } },
  ],
  code: function (c) {
    var n = +c.n, x = n + 1, rel = c.model === 'rel';
    var head = rel ? 'CREATE TABLE product (id INT PRIMARY KEY, name VARCHAR(50) NOT NULL);\nCREATE TABLE orders (id INT PRIMARY KEY, member VARCHAR(20) NOT NULL);\nCREATE TABLE order_item (\n  order_id INT NOT NULL, product_id INT NOT NULL, qty INT NOT NULL,\n  PRIMARY KEY (order_id, product_id)\n);\n-- Each order has 1 keyboard (product 1) and 2 mice (product 2)\n\n'
      : '-- The document model, reproduced with a MySQL JSON column. One row is one document\nCREATE TABLE order_doc (id INT PRIMARY KEY, doc JSON NOT NULL);\n-- Example of a document (order 1)\n-- {"member": "kim",\n--  "items": [{"product_id": 1, "name": "keyboard", "qty": 1},\n--            {"product_id": 2, "name": "mouse", "qty": 2}]}\n\n';
    var F = "JSON_SEARCH(doc, 'one', 'keyboard', NULL, '$.items[*].name')";
    var body = {
      read: rel ? 'SELECT o.id, o.member, p.name, i.qty\nFROM orders o\nJOIN order_item i ON i.order_id = o.id\nJOIN product p ON p.id = i.product_id\nWHERE o.id = 1;' : 'SELECT doc FROM order_doc WHERE id = 1;',
      rename: rel ? "UPDATE product SET name = 'mechanical keyboard' WHERE id = 1;" : "-- In each document, find the position of 'keyboard' in the items array and change the name at that position\nUPDATE order_doc\nSET doc = JSON_SET(doc, JSON_UNQUOTE(" + F + "), 'mechanical keyboard')\nWHERE " + F + ' IS NOT NULL;',
      newfield: rel ? "INSERT INTO orders (id, member, gift) VALUES (" + x + ", 'han', TRUE);" : 'INSERT INTO order_doc VALUES (' + x + ', \'{"member": "han", "gift": true,\n  "items": [{"product_id": 2, "name": "mouse", "qty": 1}]}\');',
      typo: rel ? 'INSERT INTO order_item (order_id, product_id, quantity) VALUES (' + x + ', 1, 3);\n\nSELECT SUM(qty) FROM order_item;' : 'INSERT INTO order_doc VALUES (' + x + ', \'{"member": "han",\n  "items": [{"product_id": 1, "name": "keyboard", "quantity": 3}]}\');\n\n-- Unfold the items array of every document and add up qty\nSELECT SUM(j.qty)\nFROM order_doc, JSON_TABLE(doc, \'$.items[*]\' COLUMNS (qty INT PATH \'$.qty\')) j;',
    }[c.op];
    return head + body;
  },
  label: function (c) { return (c.model === 'rel' ? 'Relational' : 'Document') + ' · ' + { read: 'read one order', rename: 'rename a product', newfield: 'add a new field', typo: 'misspelled field name' }[c.op] + (c.op === 'read' ? '' : ' · ' + c.n + ' orders'); },
  columns: ['Database reaction', 'Scope read or changed', 'What was checked after running'],
  rowOf: function (c) {
    var n = +c.n, rel = c.model === 'rel';
    if (c.op === 'read') return ['Success', rel ? '3 tables joined, 2 rows in the result' : '1 document, no join', 'Got 1 order and its 2 items'];
    if (c.op === 'rename') return ['Success', rel ? '1 row changed (product table)' : n + ' documents changed', 'Orders showing the new name: ' + n + ' of ' + n];
    if (c.op === 'newfield') return rel ? ['Error 1054 (unknown column)', 'Not saved', 'Orders with gift: 0 of ' + n] : ['Success', '1 document added', 'Orders with gift: 1 of ' + (n + 1)];
    return rel ? ['Error 1054 (unknown column)', 'Not saved', 'Quantity total ' + 3 * n + ' (actual ordered quantity ' + 3 * n + ')'] : ['Success', '1 document added', 'Quantity total ' + 3 * n + ' (actual ordered quantity ' + (3 * n + 3) + ')'];
  },
  simulate: function (c) {
    var n = +c.n, x = n + 1, rel = c.model === 'rel', op = c.op, row = this.rowOf(c), ev = [], sum = [], WHO = ['kim', 'lee', 'park', 'choi', 'jung'];
    var st = { tabs: null, docs: null, hot: [], bad: '', res: 'Not run yet', chk: '-', k: '' };
    function push(s, k) { st.k = k; ev.push({ s: s, k: k, snap: JSON.parse(JSON.stringify(st)) }); }
    if (rel) {
      st.tabs = { p1: 'keyboard', orders: n, items: 2 * n };
      push('The data is stored relationally. The product table has 2 products, the orders table has ' + n + ' orders, and the order_item table has ' + 2 * n + ' order items. The product name is only in the product table, and the order items point to it by the product number (product_id).', '');
    } else {
      st.docs = []; for (var i = 1; i <= n; i++) st.docs.push({ id: i, who: WHO[i - 1], a: 'keyboard x1', b: 'mouse x2', cls: '' });
      push('The data is stored with the document model. The order_doc table has ' + n + ' documents, and one document is one order. Each document holds the person who ordered and the array of items (items) as a whole, and the product name is copied into each item.', '');
    }
    if (op === 'read') {
      st.res = row[1];
      if (rel) { st.hot = ['to', 'ti', 'tp']; push('SELECT … FROM orders o JOIN order_item i … JOIN product p … WHERE o.id = 1: It finds order 1 in orders, finds the 2 items of that order in order_item, and for each item finds the product name in product and attaches it. You have to join three tables to complete one order. If you did not use a join, you would have to send three queries, one for each table.', ''); st.chk = row[2]; push('The result is 2 rows. One item is one row, and the order number and the person who ordered are repeated in every row. The application groups these rows back into one order.', 'good'); }
      else { st.docs[0].cls = 'hot'; push('SELECT doc FROM order_doc WHERE id = 1: It finds one document by the primary key. The person who ordered, the 2 items, and the product names are all inside that document, so there is no need to go anywhere else.', ''); st.chk = row[2]; push('The result is 1 document, and the items array in it holds 2 items. Because the data that is read together was stored together, it is read in one go. This is what the document model does best.', 'good'); }
      sum.push(rel ? 'The relational model divides data so that nothing overlaps and puts it together with joins when reading. There is more to do when reading, but the same value is in only one place, so it is easy to change.' : 'The document model stores together the data that is read together. If you often read "one order and everything attached to it," as on an order screen, it is read in one go without joins. The cost shows up in "Rename a product."');
    } else if (op === 'rename') {
      st.res = row[1];
      if (rel) { st.tabs.p1 = 'mechanical keyboard'; st.hot = ['tp']; push("UPDATE product SET name = 'mechanical keyboard' WHERE id = 1: Only one row of the product table is changed, because the product name is stored in that one place only. However many orders there are, there is just one place to change.", 'good'); st.hot = ['to', 'ti', 'tp']; st.chk = row[2]; push('If you query the orders again, all ' + n + ' appear with the new name. This is because the order items have only the product number, and the name is fetched from the product table at every query.', 'good'); }
      else { st.docs.forEach(function (d) { d.a = 'mechanical keyboard x1'; d.cls = 'hot'; }); push("UPDATE order_doc SET doc = JSON_SET(…) WHERE …: It finds every document whose items array contains 'keyboard' and changes the name at that position in each document. The number of documents changed is " + n + '. Because the product name is copied into every order document, you have to change as many documents as contain that product.', 'bad'); st.chk = row[2]; push('This time all ' + n + ' were changed, so every order shows the new name. But if you stop after changing only some, the same product is left with different names in different documents. The database does not know that these values must be the same.', ''); }
      sum.push(rel ? 'This is the advantage of keeping the same value in one place only (normalization). Changing one row is reflected in every order, and the values cannot get out of step.' : 'A value copied into documents has to be found and changed in every copy each time it changes. This is the cost of making reads easy. So in the document model, you either copy only values that rarely change, or keep only the product number and look up the name separately.');
      if (!rel) sum.push('However, if you must keep a record of the product name and price at the time of the order, it is actually correct behavior that the copied value does not change later. Copying is not always bad.');
    } else if (op === 'newfield') {
      st.res = row[1];
      if (rel) { st.hot = ['to']; st.bad = 'to'; push("INSERT INTO orders (id, member, gift) VALUES (" + x + ", 'han', TRUE): error 1054 (Unknown column 'gift' in 'field list') occurs and nothing is saved. The orders table has no column called gift. A row of a relational table can have only the columns decided in advance.", 'bad'); st.chk = row[2]; push('To store the new field, you first have to change the table structure with ALTER TABLE orders ADD COLUMN gift …. Then the same INSERT goes in, and the existing ' + n + ' orders also get a gift column. It is troublesome, but it is guaranteed that every row has the same shape.', ''); }
      else { st.docs.push({ id: x, who: 'han', a: 'gift: true', b: 'mouse x1', cls: 'good' }); push('INSERT INTO order_doc VALUES (' + x + ', \'{"member": "han", "gift": true, "items": […]}\'): It is stored as it is. A document has no list of columns decided in advance, so it is fine for only this document to have a gift field. There is no need to change the table structure.', 'good'); st.chk = row[2]; push('Now only 1 of the ' + x + ' documents has gift. Reading gift from the other documents gives NULL. Documents can have different shapes, so the code that reads them must always handle "this field may be missing."', ''); }
      sum.push(rel ? 'The relational model decides the structure (schema) first and accepts only data that fits it. Changing the structure needs ALTER TABLE, but you can write queries trusting that every stored row has the same shape.' : 'It is called a flexible schema when documents are allowed to have different shapes. It is convenient for data whose structure changes often or whose fields differ by kind. In return, the database does not guarantee that "every document has this field," so checking that becomes the job of the application code.');
    } else {
      st.res = row[1];
      if (rel) { st.hot = ['ti']; st.bad = 'ti'; push("INSERT INTO order_item (order_id, product_id, quantity) VALUES (" + x + ", 1, 3): error 1054 (Unknown column 'quantity' in 'field list') occurs and nothing is saved. The column name is qty, but quantity was written by mistake. The database catches the wrong name on the spot.", 'good'); st.bad = ''; st.chk = row[2]; push('SELECT SUM(qty) FROM order_item: the quantity total is ' + 3 * n + '. The wrong row was not inserted, so the total equals the actual ordered quantity.', 'good'); }
      else { st.docs.push({ id: x, who: 'han', a: 'keyboard quantity: 3', b: 'no field named qty', cls: 'bad' }); push('INSERT INTO order_doc VALUES (' + x + ', \'{… "items": [{"product_id": 1, "name": "keyboard", "quantity": 3}]}\'): It is stored as it is. The database does not know that qty is the right name and quantity is the wrong one. There is no error and no warning.', 'bad'); st.chk = row[2]; push('SELECT SUM(j.qty) FROM order_doc, JSON_TABLE(…) j: the quantity total, adding up qty in all documents, is ' + 3 * n + '. The quantity actually ordered is ' + (3 * n + 3) + ', but the new document has no qty, so it was left out. The query also finishes without an error, so it is easy to miss that the total is wrong.', 'bad'); }
      sum.push(rel ? 'The database keeps the promises such as column names, data types, and NOT NULL, so wrong data shows up the moment it comes in.' : 'Not checking the shape also means accepting a wrong shape. So in the document model, the application checks before saving, or you turn on the schema validation feature that the database provides. In a MySQL JSON column, too, you can add a CHECK (JSON_SCHEMA_VALID(…)) constraint, and then this INSERT is rejected with error 3819.');
    }
    sum.push('NoSQL is a general name for databases that are not relational, and the document model is one of them. Rather than one being better, you choose according to what you often read together and what changes often.');
    return { events: ev, summary: sum, row: row };
  },
  render: function (v, sim, t, H, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : null;
    if (!s) { H.text(v, 'Click Run to go one step at a time.'); return; }
    function cl(id) { return s.bad === id ? 'bad' : s.hot.indexOf(id) >= 0 ? 'hot' : ''; }
    if (s.tabs) H.table(v, ['Table', 'Rows', 'Contents'], [
      { cells: [{ v: 'product', cls: cl('tp') }, '2', '1: ' + s.tabs.p1 + ', 2: mouse'] },
      { cells: [{ v: 'orders', cls: cl('to') }, String(s.tabs.orders), 'Columns: id, member'] },
      { cells: [{ v: 'order_item', cls: cl('ti') }, String(s.tabs.items), 'Columns: order_id, product_id, qty'] },
    ], 'Relational: three tables');
    else H.table(v, ['Document', 'Person who ordered', 'items array'], s.docs.map(function (d) { return { cells: [{ v: 'Document ' + d.id, cls: d.cls === 'bad' ? 'bad' : d.cls === 'good' ? 'good' : d.cls === 'hot' ? 'hot' : '' }, d.who, d.a + ', ' + d.b] }; }), 'Documents: order_doc table');
  },
  // Diagram: for the relational model, three tables and the references between them. For the document model, one box per order. The place that was touched is yellow, and the place where a problem occurred is red.
  draw: function (P, sim, shown) {
    var c = sim.c, n = +c.n, rel = c.model === 'rel', last = shown[shown.length - 1], s = last ? last.snap : null, WHO = ['kim', 'lee', 'park', 'choi', 'jung'];
    if (!s) { s = { tabs: rel ? { p1: 'keyboard', orders: n, items: 2 * n } : null, docs: null, hot: [], bad: '', res: 'Not run yet', chk: '-', k: '' }; if (!rel) { s.docs = []; for (var i = 1; i <= n; i++) s.docs.push({ id: i, who: WHO[i - 1], a: 'keyboard x1', b: 'mouse x2', cls: '' }); } }
    P.size(680, 326);
    if (rel) {
      var cl = function (id) { return s.bad === id ? 'bad now' : s.hot.indexOf(id) >= 0 ? 'hot now' : 'wait'; };
      P.region('db', 16, 12, 648, 204, 'Relational: three tables');
      P.box('to', 30, 44, 196, 66, { cls: cl('to'), title: 'orders', sub: ['Orders: ' + s.tabs.orders, 'id, member'] });
      P.box('tp', 454, 44, 196, 66, { cls: cl('tp'), title: 'product', sub: ['1: ' + s.tabs.p1, '2: mouse'] });
      P.box('ti', 224, 136, 232, 66, { cls: cl('ti'), title: 'order_item', sub: ['Items: ' + s.tabs.items, 'order_id, product_id, qty'] });
      P.arrow('f1', 'ti:l', 'to:b', { cls: 'mut', label: 'order_id' });
      P.arrow('f2', 'ti:r', 'tp:b', { cls: 'mut', label: 'product_id' });
    } else {
      P.region('db', 16, 12, 648, 204, 'Documents: one order_doc table, one document per order');
      s.docs.forEach(function (d, k) { P.box('d' + d.id, 30 + (k % 3) * 212, 44 + Math.floor(k / 3) * 84, 204, 76, { cls: d.cls === 'bad' ? 'bad now' : d.cls === 'good' ? 'good now' : d.cls === 'hot' ? 'hot now' : 'wait', title: 'Document ' + d.id + ' (' + d.who + ')', sub: [d.a, d.b] }); });
    }
    P.box('res', 16, 228, 648, 38, { cls: s.k === 'bad' ? 'bad' : s.k === 'good' ? 'good' : 'plain', title: 'Scope read or changed', right: s.res });
    P.box('chk', 16, 272, 648, 38, { cls: 'plain', title: 'What was checked after running', right: s.chk });
    P.note(rel ? 'When reading, you follow the arrows and join the tables.' : 'The documents on this screen are reproduced with a MySQL JSON column.');
  },
  assume: 'The document model was reproduced with a MySQL JSON column. I ran twenty combinations (two ways of storing, four things to do, and 2, 3, and 5 orders) with the same statements as on the screen on MySQL 8.4.11 on the PC used to write this lab, and checked that the following matched the screen: the error code; the number of tables and the number of result rows shown by EXPLAIN; the number of rows (documents) changed by UPDATE; the number of documents with gift; and the quantity total. I also confirmed the following facts used in the explanations by execution. Reading without a join needs three queries, one for each table. After a column is added with ALTER TABLE, the same INSERT goes in, and the existing rows also get that column. If only one document is changed, the same product is left with two different names. After a JSON_SCHEMA_VALID constraint is added, a document with a misspelled field name is rejected with error 3819. A dedicated document database (MongoDB and others) is not on this PC, so I could not run one. So what is shown here is "the shape of reads and writes when an order is stored as one document," not the exact behavior of a document database product. Query syntax, how to change a value inside an array, the schema validation feature, and support for transactions and joins across several documents differ by product and version. Which way is faster depends on the data volume, the indexes, and the product, so it is not covered, and the results on the screen are the number of places read or changed, not the speed. Other kinds of NoSQL, such as key-value stores, wide-column stores, and graph databases, are not covered.',
});

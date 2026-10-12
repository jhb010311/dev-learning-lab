Lab.register({
  id: 'normal', nav: 'Normalization', cat: 'Database', mode: 'step',
  title: 'What happens if you do not split the table?',
  intro: 'Here are two designs. In one, the member name and address are stored in the orders table as well. In the other, members and orders are split into separate tables. Do the same operations on both, and you will see that data goes out of step or is lost only when everything is packed into one table.',
  terms: ['Normalization and denormalization', 'Functional dependency', 'Primary key, unique key, foreign key'], ranks: ['normal'],
  controls: [
    { id: 'form', label: 'Table design', type: 'select', value: 'flat', options: [['flat', 'Before normalization (everything in one orders table)'], ['norm', 'After normalization (split into member and orders)']] },
    { id: 'op', label: 'Operation to try', type: 'select', value: 'update', options: [['update', 'Change the address of member Alice from Seoul to Busan'], ['insert', 'Register a new member who has no orders yet'], ['delete', 'Delete the only order of member Bob'], ['read', 'List the orders together with the member name']] },
    { id: 'k', label: 'Number of orders Alice has', type: 'range', min: 1, max: 5, value: 3, fmt: function (v) { return v + (v === 1 ? ' order' : ' orders'); }, show: function (c) { return c.op === 'update'; } },
    { id: 'miss', label: 'Use the wrong condition in the update, so that only one row is changed', type: 'check', value: false, show: function (c) { return c.op === 'update' && c.form === 'flat'; } },
  ],
  presets: [
    { t: 'Default settings', q: 'What happens when you change the address of Alice, who has 3 orders, from Seoul to Busan in the design before normalization?', d: 'Changing an address in the table before normalization. You must change as many rows as there are orders.', v: { form: 'flat', op: 'update', k: 3, miss: false } },
    { t: 'A mistake that changes only one row', q: 'What if you use the wrong condition in the same address update, so that only one row is changed?', d: 'The same member ends up with two different addresses (an update anomaly).', v: { form: 'flat', op: 'update', k: 3, miss: true } },
    { t: 'The same change after normalization', q: 'What if you make the same address change in the design after normalization (split into member and orders)?', d: 'The address is stored in only one place, so changing one row is enough.', v: { form: 'norm', op: 'update', k: 3, miss: false } },
    { t: 'A member with no orders', q: 'What if the operation is registering a new member who has no orders yet?', d: 'Before normalization, there is no place to put the member (an insertion anomaly).', v: { form: 'flat', op: 'insert', k: 3, miss: false } },
    { t: 'Deleting the last order', q: 'What if the operation is deleting the only order of member Bob?', d: 'Before normalization, the member information is lost as well (a deletion anomaly).', v: { form: 'flat', op: 'delete', k: 3, miss: false } },
    { t: 'The cost of normalization', q: 'What if you list the orders together with the member name in the design after normalization?', d: 'After normalization, reading the data needs a join.', v: { form: 'norm', op: 'read', k: 3, miss: false } },
  ],
  code: function (c) {
    var ddl = c.form === 'flat'
      ? '-- Before normalization: order and member data in one table\nCREATE TABLE orders (\n  order_id    INT PRIMARY KEY,\n  member_id   INT,\n  member_name VARCHAR(20),   -- determined by member_id\n  member_addr VARCHAR(50),   -- determined by member_id\n  item        VARCHAR(30),\n  amount      INT\n);\n'
      : '-- After normalization: member data goes in the member table, once\nCREATE TABLE member (\n  member_id INT PRIMARY KEY,\n  name      VARCHAR(20),\n  addr      VARCHAR(50)\n);\nCREATE TABLE orders (\n  order_id  INT PRIMARY KEY,\n  member_id INT REFERENCES member(member_id),\n  item      VARCHAR(30),\n  amount    INT\n);\n';
    return ddl + '\n' + this.sql(c);
  },
  sql: function (c) {
    var f = c.form === 'flat';
    if (c.op === 'update') return f ? (c.miss && c.k > 1 ? "UPDATE orders SET member_addr = 'Busan'\n WHERE order_id = 1;          -- only one row is changed" : "UPDATE orders SET member_addr = 'Busan'\n WHERE member_id = 1;") : "UPDATE member SET addr = 'Busan'\n WHERE member_id = 1;";
    if (c.op === 'insert') return f ? "INSERT INTO orders (order_id, member_id, member_name, member_addr)\nVALUES (NULL, 4, 'Erin', 'Daejeon');  -- there is no order ID" : "INSERT INTO member (member_id, name, addr)\nVALUES (4, 'Erin', 'Daejeon');";
    if (c.op === 'delete') return 'DELETE FROM orders\n WHERE order_id = ' + this.yhOrder(c) + ';';
    return f ? 'SELECT order_id, member_name, item\n  FROM orders;' : 'SELECT o.order_id, m.name, o.item\n  FROM orders o\n  JOIN member m ON m.member_id = o.member_id;';
  },
  yhOrder: function (c) { return (c.op === 'update' ? c.k : 3) + 1; },
  label: function (c) { return (c.form === 'flat' ? 'Before normalization' : 'After normalization') + ' · ' + { update: 'Address change (orders: ' + c.k + ')' + (c.form === 'flat' && c.miss && c.k > 1 ? ' · one row only' : ''), insert: 'Register a member with no orders', delete: 'Delete the last order', read: 'Read with the name' }[c.op]; },
  columns: ['Rows changed', 'Anomaly', 'Tables read'],
  simulate: function (c) {
    var flat = c.form === 'flat', k = c.op === 'update' ? c.k : 3, miss = flat && c.op === 'update' && c.miss && k > 1, ev = [], self = this;
    var items = ['keyboard', 'mouse', 'monitor', 'chair', 'desk', 'headset', 'webcam', 'charger'], members = [{ id: 1, name: 'Alice', addr: 'Seoul' }, { id: 2, name: 'Bob', addr: 'Incheon' }, { id: 3, name: 'Carol', addr: 'Gwangju' }], orders = [];
    for (var i = 0; i < k; i++) orders.push({ id: orders.length + 1, mid: 1 });
    orders.push({ id: orders.length + 1, mid: 2 }); orders.push({ id: orders.length + 1, mid: 3 }); orders.push({ id: orders.length + 1, mid: 3 });
    orders.forEach(function (o, i) { o.item = items[i % items.length]; o.amount = (3 + (i * 7) % 9) * 10000; o.addr = members[o.mid - 1].addr; o.name = members[o.mid - 1].name; });
    var mark = {}, gone = {}, extra = null, mmark = {}, result = null;
    function tables() {
      var t = [];
      if (flat) {
        var rows = orders.map(function (o) { return { cls: gone[o.id] ? 'gone' : '', cells: [String(o.id), String(o.mid), o.name, { v: o.addr, cls: mark[o.id] || '' }, o.item, String(o.amount)] }; });
        if (extra) rows.push({ cells: extra });
        t.push({ name: 'orders (order + member data)', head: ['Order ID (primary key)', 'Member ID', 'Member name', 'Member address', 'Item', 'Amount'], rows: rows });
      } else {
        var mr = members.map(function (m) { return { cells: [String(m.id), m.name, { v: m.addr, cls: mmark[m.id] || '' }] }; });
        t.push({ name: 'member (member data)', head: ['Member ID (primary key)', 'Name', 'Address'], rows: mr });
        t.push({ name: 'orders (order data)', head: ['Order ID (primary key)', 'Member ID (foreign key)', 'Item', 'Amount'], rows: orders.map(function (o) { return { cls: gone[o.id] ? 'gone' : '', cells: [String(o.id), String(o.mid), o.item, String(o.amount)] }; }) });
      }
      if (result) t.push(result);
      return t;
    }
    function push(s, kd) { ev.push({ s: s, k: kd, snap: tables() }); }
    var changed = 0, anomaly = 'None', readT = flat ? 1 : 2, sum = [];
    push(flat ? 'This is the initial state. Every order row also holds the member name and address. Alice has ' + (k === 1 ? '1 order' : k + ' orders') + ', so the address "Seoul" is stored ' + (k === 1 ? 'once' : k + ' times') + '. The order ID determines the member ID, and the member ID determines the name and address (a chain of functional dependencies).' : 'This is the initial state. The member table has exactly one row for each member, and the orders table points to a member by member ID. Alice\'s address "Seoul" is stored in only one place.', '');
    if (c.op === 'update') {
      if (flat && !miss) { orders.forEach(function (o) { if (o.mid === 1) { o.addr = 'Busan'; mark[o.id] = 'hot'; changed++; } }); push('Found every row whose member ID is 1 and changed its address. Rows changed: ' + changed + '. The more orders there are, the more rows you have to change.', ''); push('Querying Alice\'s address again shows "Busan" in every row. This time no row was missed, so nothing went out of step.', 'good'); sum.push('Changing the address of one member meant changing ' + (changed === 1 ? '1 row' : changed + ' rows') + '. This is because the same fact is stored in several rows. If even one row is missed, the data goes out of step.'); }
      else if (flat) { orders[0].addr = 'Busan'; mark[1] = 'hot'; changed = 1; orders.forEach(function (o) { if (o.mid === 1 && o.id !== 1) mark[o.id] = 'bad'; }); push('Only the row for order 1 got the new address. Alice\'s other orders (' + (k - 1) + ') still say "Seoul".', ''); anomaly = 'Update anomaly'; push('Querying Alice\'s address now returns both "Busan" and "Seoul". The database alone cannot tell which one is correct. This is an update anomaly.', 'bad'); sum.push('The same member now has different addresses in different rows (an update anomaly). It happens when you change only some of the copies of a value that is stored more than once.'); }
      else { members[0].addr = 'Busan'; mmark[1] = 'hot'; changed = 1; push('Changed only Alice\'s one row in the member table. The orders table was not touched.', ''); push('Alice\'s orders (' + k + ') all point to member ID 1, so whichever order you query from, the address is "Busan". There is only one place to change, so the copies cannot disagree.', 'good'); sum.push('The address is stored in only one place, so you change just 1 row, however many orders there are.'); }
    }
    if (c.op === 'insert') {
      if (flat) { extra = [{ v: 'NULL', cls: 'bad' }, '4', 'Erin', 'Daejeon', { v: 'NULL', cls: 'bad' }, { v: 'NULL', cls: 'bad' }]; push('To add the new member Erin, you have to create a row in the orders table. But she has no orders yet, so there is no value to put in the order ID, which is the primary key.', ''); extra = null; anomaly = 'Insertion anomaly'; push('A primary key cannot be NULL, so the INSERT is rejected. Unless you create a fake order, there is no way to store a member who has no orders. This is an insertion anomaly.', 'bad'); sum.push('An order has to exist before you can store member information (an insertion anomaly). This is because two different facts, members and orders, are tied together in one table.'); }
      else { members.push({ id: 4, name: 'Erin', addr: 'Daejeon' }); mmark[4] = 'hot'; changed = 1; push('Added one row for Erin to the member table. Members are stored separately, so a member can be saved even without orders.', 'good'); sum.push('Members and orders are in different tables, so a member with no orders can be registered without any problem.'); }
    }
    if (c.op === 'delete') {
      var oid = this.yhOrder(c); gone[oid] = 1; changed = 1;
      if (flat) { push('Deleted the row for order ' + oid + '. This row was Bob\'s only order.', ''); anomaly = 'Deletion anomaly'; push('Bob\'s name and address were written only in that row. Deleting one order also erased the fact that a member named Bob ever existed in the database. This is a deletion anomaly.', 'bad'); sum.push('Deleting the order also deleted the member information (a deletion anomaly).'); }
      else { push('Deleted the row for order ' + oid + ' from the orders table.', ''); push('Bob\'s row in the member table is still there. The member information stays even though the order is gone.', 'good'); sum.push('Only the order disappeared, and the member information remained.'); }
    }
    if (c.op === 'read') {
      result = { name: 'Query result', head: ['Order ID', 'Member name', 'Item'], rows: orders.map(function (o) { return { cells: [String(o.id), o.name, o.item] }; }) };
      if (flat) { push('Reading just the orders table gives you the member name too. No join is needed.', 'good'); sum.push('For reading alone, the table before normalization is simpler and faster. Allowing duplicates on purpose for read performance is called denormalization, and the price is that the application itself has to prevent the anomalies shown above.'); }
      else { push('An order holds only the member ID, so to get the name you have to join with the member table. Two tables are read.', ''); sum.push('The cost of normalization is a join when you read. Even so, a typical service starts from a normalized design and considers denormalization only when read performance becomes a real problem.'); }
    }
    if (flat && anomaly === 'None' && c.op !== 'read') sum.push('No problem showed up this time, but that is not because the structure prevents it. The person doing the work avoided it by being careful.');
    return { events: ev, summary: sum, row: [String(changed), anomaly, String(readT)] };
  },
  render: function (v, sim, t, H, shown) {
    var last = shown[shown.length - 1], tabs = last ? last.snap : [];
    H.title(v, 'SQL that was run'); var pre = H.el('pre', 'code', this.sql(sim.c)); v.appendChild(pre);
    tabs.forEach(function (tb) { H.table(v, tb.head, tb.rows, tb.name); });
    H.text(v, 'Yellow cells are values that just changed, red cells are values with a problem, and rows with a line through them are deleted rows.');
  },
  // Diagram: Before normalization, the member data is repeated in every order row. After normalization, each order points to one member row with an arrow.
  draw: function (P, sim, shown) {
    var last = shown[shown.length - 1], tabs = last ? last.snap : [], val = function (x) { return typeof x === 'object' ? x.v : x; }, cl = function (x) { return typeof x === 'object' ? x.cls : ''; };
    var flat = tabs.filter(function (t) { return t.name.indexOf('orders (order +') === 0; })[0], mem = tabs.filter(function (t) { return t.name.indexOf('member') === 0; })[0], ord = tabs.filter(function (t) { return t.name === 'orders (order data)'; })[0];
    P.size(680, 330);
    if (!last) { P.region('t', 16, 16, 648, 298, 'Tables'); P.text('hint', 340, 170, 'Click Run to start', { cls: 'mut', anchor: 'middle' }); return; }
    if (flat) {
      P.region('t', 16, 16, 648, 298, 'One orders table: the member data is repeated in every row next to the order');
      flat.rows.forEach(function (r, i) {
        var c = r.cells, y = 50 + i * 29, gone = r.cls === 'gone', isNull = val(c[0]) === 'NULL', a = cl(c[3]);
        P.box('fo' + i, 28, y, 250, 25, { cls: gone ? 'ghost' : isNull ? 'bad' : 'plain', title: isNull ? 'No order ID (NULL)' : 'Order ' + val(c[0]), right: isNull ? '' : val(c[4]) });
        P.box('fm' + i, 286, y, 366, 25, { cls: gone ? 'ghost' : a === 'hot' ? 'hot' : a === 'bad' ? 'bad' : 'wait', title: 'Member ' + val(c[1]) + ' ' + val(c[2]), right: 'Address ' + val(c[3]) });
      });
    } else if (mem && ord) {
      P.region('tm', 16, 16, 270, 298, 'member table: one row per member');
      P.region('to', 384, 16, 280, 298, 'orders table: points to a member');
      mem.rows.forEach(function (r, i) { var c = r.cells, a = cl(c[2]); P.box('m' + val(c[0]), 28, 56 + i * 46, 246, 34, { cls: a === 'hot' ? 'hot' : 'wait', title: 'Member ' + val(c[0]) + ' ' + val(c[1]), right: 'Address ' + val(c[2]) }); });
      ord.rows.forEach(function (r, i) {
        var c = r.cells, gone = r.cls === 'gone', id = 'o' + val(c[0]);
        P.box(id, 396, 50 + i * 29, 256, 25, { cls: gone ? 'ghost' : 'plain', title: 'Order ' + val(c[0]) + (gone ? ' (deleted)' : ''), right: 'Member ID ' + val(c[1]) });
        if (!gone) P.arrow('fk' + val(c[0]), id + ':l', 'm' + val(c[1]) + ':r', { cls: 'mut' });
      });
    }
    P.note(flat ? 'The blue boxes are member data. Yellow boxes are values that just changed, and red boxes are values that went out of step or cannot be inserted.' : 'Each arrow shows an order pointing to a member row by member ID.');
  },
  assume: 'This is a small example reduced to 3 members and a few orders. The table before normalization has a chain of functional dependencies, order ID → member ID → member name and address, so it does not satisfy third normal form. After normalization, orders refer to members through a foreign key. The definitions of the anomalies follow the standard explanation in relational database theory. Tables with the same structure were created in a real SQL engine (SQLite) and checked. When only one row was changed, the same member\'s address was returned as two different values; an INSERT of a member without an order ID was rejected; and after the last order was deleted, the number of rows still holding that member\'s information was 0. With the tables split, none of the three cases caused a problem.',
});

Lab.register({
  id: 'join_basic', nav: 'Joins', cat: 'Fundamentals', mode: 'step', basic: true, deep: ['join'],
  title: 'What does a join attach, and what does ON decide?',
  intro: 'A join is a SELECT that attaches the rows of two tables side by side. The orders table in this lab holds only the number of the member who placed the order (member_id), and the name is in the member table. So to see the item that was ordered together with the name of the person who ordered it, you have to connect the two tables. JOIN member m decides which table to attach, and ON o.member_id = m.id decides "which rows are a pair." For each order row, the database finds the member row that matches the ON condition and attaches it on the same line. In this lab you remove JOIN, remove the ON condition, or add an order that has no matching member, and run the same SQL each time. You see how many lines the result has and what shape it takes.',
  terms: ['JOIN (INNER, OUTER)', 'ON clause', 'Table alias', 'Cartesian product'],
  controls: [
    { id: 'how', label: 'How to read orders', type: 'select', value: 'join', options: [['join', 'JOIN member m ON o.member_id = m.id'], ['none', 'Do not use JOIN (read only orders)'], ['cross', 'Connect without an ON condition: CROSS JOIN member m']] },
    { id: 'orphan', label: 'Add one more order whose member does not exist: (13, 9, Headset)', type: 'check', value: false },
  ],
  // q is the question shown on the question-style screen. t and d are the name and the description used in the text-only reading
  presets: [
    { t: 'Default settings', q: 'What does a join look like, and what comes out when you join orders and members?', d: 'For each order row, the member row that matches the ON condition is attached, and the item and the name of the member come out on one line.', v: { how: 'join', orphan: false } },
    { t: 'Removing JOIN and reading only orders', q: 'What if you remove JOIN and read only orders?', d: 'Only the member_id numbers are read, not the names.', v: { how: 'none', orphan: false } },
    { t: 'Joining without an ON condition', q: 'What if you join without an ON condition?', d: 'Pairs are not sorted out, and every member is attached to every order.', v: { how: 'cross', orphan: false } },
    { t: 'An order has no matching member', q: 'What if an order has no matching member?', d: 'An order with no member does not appear in the result of the JOIN.', v: { how: 'join', orphan: true } },
  ],
  // The code on the screen and the check program (verify/spring/src/JoinBasicProbe.java) run the same text. The check script compares it character by character.
  members: [{ id: 1, name: 'Alice' }, { id: 2, name: 'Bob' }],
  ordersOf: function (c) {
    var o = [{ id: 10, mid: 1, item: 'Keyboard' }, { id: 11, mid: 1, item: 'Mouse' }, { id: 12, mid: 2, item: 'Monitor' }];
    if (c.orphan) o.push({ id: 13, mid: 9, item: 'Headset' });
    return o;
  },
  code: function (c) {
    var l = ['CREATE TABLE member (id INT PRIMARY KEY, name VARCHAR(20));',
      'CREATE TABLE orders (id INT PRIMARY KEY, member_id INT, item VARCHAR(20));',
      "INSERT INTO member VALUES (1, 'Alice'), (2, 'Bob');",
      "INSERT INTO orders VALUES (10, 1, 'Keyboard'), (11, 1, 'Mouse'),",
      "    (12, 2, 'Monitor')" + (c.orphan ? ", (13, 9, 'Headset');" : ';'), ''];
    if (c.how === 'none') l.push('SELECT o.item, o.member_id', 'FROM orders o', 'ORDER BY o.id;');
    else {
      l.push('-- Join: attach the rows of member next to the rows of orders', 'SELECT o.item, m.name', 'FROM orders o');
      if (c.how === 'join') l.push('-- ON: rows are a pair when member_id equals the id of the member', 'JOIN member m ON o.member_id = m.id', 'ORDER BY o.id;');
      else l.push('CROSS JOIN member m', 'ORDER BY o.id, m.id;');
    }
    return l.join('\n');
  },
  label: function (c) { return { join: 'JOIN ... ON', none: 'No JOIN', cross: 'CROSS JOIN without ON' }[c.how] + ' · ' + (c.orphan ? 'An order has no member' : 'Every order has a member'); },
  columns: ['Rows in the result', 'Result read'],
  // If the result is long, it is shortened to the first four rows and the total number of rows. The check script uses the same rule.
  shorten: function (rows) {
    var t = rows.slice(0, 4).join(', ');
    return rows.length > 4 ? t + ', … (' + rows.length + ' rows in all)' : t;
  },
  simulate: function (c) {
    var how = c.how, orph = !!c.orphan, ms = this.members, os = this.ordersOf(c), ev = [], sum = [];
    // State: cur is the order being looked at, links is the member (position) attached to each order that was handled, miss means the current order has no pair, res is the result lines made, and fresh is the number of lines just added
    var st = { cur: -1, links: [], res: [], fresh: 0, miss: false };
    function push(s, k) { ev.push({ s: s, k: k, snap: JSON.parse(JSON.stringify(st)) }); }
    function memIdx(mid) { for (var i = 0; i < ms.length; i++) if (ms[i].id === mid) return i; return -1; }
    function line(o, mi) { return [o.item, how === 'none' ? String(o.mid) : ms[mi].name]; }
    function ot(o) { return 'the order ' + o.id + ' row (member_id ' + o.mid + ', ' + o.item + ')'; }
    function q(a) { return '"' + a[0] + ', ' + a[1] + '"'; }
    var sel = how === 'none' ? 'SELECT o.item, o.member_id FROM orders o' : how === 'join' ? 'SELECT o.item, m.name FROM orders o JOIN member m ON o.member_id = m.id' : 'SELECT o.item, m.name FROM orders o CROSS JOIN member m';

    // 1. Preparing the tables and rows
    push('CREATE TABLE and INSERT: The database creates the two tables member and orders and adds rows. member has 2 members (id 1 Alice, id 2 Bob), and orders has ' + os.length + ' orders (' + os.map(function (o) { return '#' + o.id + ' ' + o.item; }).join(', ') + '). orders says who placed each order only by the number in the member_id column (the member_id of order 10 is 1). The name for that number is only in the member table.', '');

    // 2. What the SELECT does
    if (how === 'join') push(sel + ': This SELECT reads the item that was ordered together with the name of the member. FROM orders o means read the orders table (o is a short name for orders), JOIN member m means attach the member table (m is a short name for member), and ON o.member_id = m.id means that an order row and a member row are a pair when the member_id of the order equals the id of the member. If we write out in order how the result is made, the database finds, for each row of orders, the member row that matches the ON condition and attaches it next to it. Which table the database actually starts from and how it finds the rows is up to the database.', '');
    else if (how === 'none') push(sel + ': FROM has only orders, and there is no JOIN. So the only table the database reads is orders, and it does not read the member table. The database reads the rows of orders one by one and takes out the values of the two columns item and member_id that the SELECT names.', '');
    else push(sel + ': This joins orders and member with CROSS JOIN. This SELECT has no ON condition. There is no condition that says which rows are a pair, so, if we write out how the result is made, the database attaches every row of member to each row of orders.', '');

    // 3. For each order row
    os.forEach(function (o, i) {
      var head = i === 0, mi = memIdx(o.mid);
      st.cur = i; st.fresh = 0; st.miss = false;
      if (how === 'none') {
        st.links[i] = []; st.res.push(line(o, 0)); st.fresh = 1;
        var prior = os.slice(0, i).some(function (p) { return p.mid === o.mid; });
        push(head ? 'The database first reads ' + ot(o) + ' from orders, takes out item and member_id, and puts the one line ' + q(line(o, 0)) + ' into the result. member_id 1 is only the number of a member. The name for that number is in the member table, but this SELECT does not read member, so the result cannot show the name.'
          : mi < 0 ? 'The database reads ' + ot(o) + ' and puts the one line ' + q(line(o, 0)) + ' into the result. Without JOIN, no pair is looked for, so this order appears in the result even though member has no member with id ' + o.mid + '.'
          : 'The database reads ' + ot(o) + ' and puts the one line ' + q(line(o, 0)) + ' into the result.' + (prior ? ' Only the member_id number is read, so you have to look at the numbers yourself to know whether this is the same member as an earlier order.' : ''), mi < 0 ? 'bad' : '');
      } else if (how === 'join') {
        if (mi < 0) {
          st.links[i] = []; st.miss = true;
          push('The database looks at ' + ot(o) + '. It looks for the member row that matches the ON condition, but no member has an id equal to member_id ' + o.mid + ', so there is no row to attach. This order does not appear in the result.', 'bad');
        } else if (head) {
          st.links[i] = [mi];
          push('The database first looks at ' + ot(o) + ' in orders. It looks for the member row that matches the ON condition o.member_id = m.id. The member_id of this order is ' + o.mid + ', so the row with id ' + o.mid + ', the ' + ms[mi].name + ' row, is its pair.', '');
          st.res.push(line(o, mi)); st.fresh = 1;
          push('The database attaches the order ' + o.id + ' row and the ' + ms[mi].name + ' row side by side. From the attached row it takes out o.item (' + o.item + ') and m.name (' + ms[mi].name + ') that the SELECT names, and puts the one line ' + q(line(o, mi)) + ' into the result. A name that orders did not have has appeared on the same line. This is a join.', 'good');
        } else {
          st.links[i] = [mi]; st.res.push(line(o, mi)); st.fresh = 1;
          var again = os.slice(0, i).some(function (p) { return p.mid === o.mid; });
          push('The database finds the row with id ' + o.mid + ', ' + ms[mi].name + ', as the pair of ' + ot(o) + ', attaches it, and puts the one line ' + q(line(o, mi)) + ' into the result.' + (again ? ' The same ' + ms[mi].name + ' row was attached to an earlier order too. One member row can be attached to many orders.' : ''), 'good');
        }
      } else {
        st.links[i] = ms.map(function (m, j) { return j; });
        ms.forEach(function (m, j) { st.res.push(line(o, j)); }); st.fresh = ms.length;
        var pair = ms.map(function (m, j) { return q(line(o, j)); }).join(' and ');
        push(head ? 'The database first looks at ' + ot(o) + '. There is no condition, so it does not look at member_id and attaches both member rows (Alice and Bob). The two lines ' + pair + ' go into the result. The person who placed this order is Alice, but the Bob row was attached too.'
          : mi < 0 ? 'The database looks at ' + ot(o) + '. There is no condition, so it attaches both member rows whether or not a member matches member_id ' + o.mid + ', and puts the two lines ' + pair + ' into the result.'
          : 'The database attaches both member rows to ' + ot(o) + ' too, and puts the two lines ' + pair + ' into the result.', head || mi < 0 ? 'bad' : '');
      }
    });

    // 4. The result
    st.cur = -1; st.fresh = 0; st.miss = false;
    var n = st.res.length, texts = st.res.map(function (r) { return r[0] + '·' + r[1]; });
    var fin = how === 'none' ? 'The database read every row of orders. Rows in the result: ' + n + '. The member shows only as a number, not a name.'
      : how === 'join' ? 'The database looked at every row of orders. Rows in the result: ' + n + '.' + (orph ? ' There are 4 orders, but order 13, which has no pair, is missing.' : ' One line was made for each of the 3 orders.')
      : 'The database looked at every row of orders. Rows in the result: ' + n + '. As many lines were made as ' + os.length + ' orders times 2 members.';
    push('Result of the SELECT: ' + fin, how === 'cross' ? 'bad' : how === 'join' ? 'good' : '');

    // Summary: the first line is the answer to the question
    var S = {
      'join|false': ['A join attaches the rows of two tables side by side. JOIN decides which table to attach and ON decides which rows are a pair, and for each order row the database found the member row that matches the ON condition and attached it on one line. So the item that was ordered and the name of the member came out on one line.', '3 orders became 3 rows in the result. The Alice row was attached to two orders, because a row that matches the ON condition can be attached to many orders.'],
      'join|true': ['Order 13, which has no matching member, did not appear in the result of the JOIN. No member has an id equal to member_id 9, so no row matched the ON condition.', 'orders has 4 rows, but the result has 3 rows. This JOIN keeps only the rows that have a pair. A join that also keeps orders without a pair (LEFT JOIN) is not covered in this lab.'],
      'none|false': ['If you do not use JOIN, only what is written in the orders table is read. The member shows not as a name but as the member_id numbers (1, 1, 2).', 'The name is in the member table, and orders has only the number. To see the name of the person who placed the order together with it, you have to connect the two tables with JOIN.'],
      'none|true': ['Without JOIN, no pair is looked for, so order 13, which has no member, also appears in the result. The lines read are the 4 rows of orders as they are.', 'The number member_id 9 is read, but this SELECT does not check whether a member with that number exists. With JOIN, an order without a pair drops out of the result.'],
      'cross|false': ['If you connect without an ON condition, the database does not sort out pairs and attaches every member to every order. 3 orders and 2 members became 6 rows.', 'Only Alice ordered the keyboard, but a line that pairs it with Bob also came out. ON is what decides which rows are a pair, and without ON the lines grow by the product of the numbers of rows in the two tables.'],
      'cross|true': ['If you connect without an ON condition, every member is attached even to order 13, which has no member. 4 orders and 2 members became 8 rows.', 'Without ON, member_id is not looked at, so an order without a pair does not drop out either, and lines with wrong pairs come out together. ON is what sorts out the pairs.'],
    };
    S[how + '|' + orph].forEach(function (x) { sum.push(x); });
    return { events: ev, summary: sum, row: [n + '', this.shorten(texts)], ords: os, ms: ms };
  },
  render: function (v, sim, t, H, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : null, c = sim.c, os = sim.ords, ms = sim.ms;
    if (!s) { H.text(v, 'Click Run to start from creating the tables.'); return; }
    H.table(v, ['id', 'member_id', 'item'], os.map(function (o, i) { var k = i === s.cur ? (s.miss ? 'bad' : 'hot') : ''; return { cls: '', cells: [{ v: String(o.id), cls: k }, { v: String(o.mid), cls: k }, { v: o.item, cls: k }] }; }), 'orders table');
    H.table(v, ['id', 'name'], ms.map(function (m, j) { var k = s.cur >= 0 && (s.links[s.cur] || []).indexOf(j) >= 0 ? 'hot' : ''; return { cls: '', cells: [{ v: String(m.id), cls: k }, { v: m.name, cls: k }] }; }), 'member table' + (c.how === 'none' ? ' (not read)' : ''));
    H.table(v, ['item', c.how === 'none' ? 'member_id' : 'name'], s.res.length ? s.res.map(function (r, k) { var f = k >= s.res.length - s.fresh ? 'good' : ''; return { cls: '', cells: [{ v: r[0], cls: f }, { v: r[1], cls: f }] }; }) : [{ cls: 'gone', cells: ['No result', ''] }], 'Result of the SELECT');
    H.counters(v, [[s.res.length, 'Rows in the result']]);
  },
  // Diagram: the orders table on the left, the member table on the right, a line from the order row being looked at to the member row that is its pair (cut if there is no pair), and the result lines made and the number of rows below. When there is a JOIN, the lines of the orders seen earlier are also left faintly.
  draw: function (P, sim, shown) {
    var c = sim.c, os = sim.ords, ms = sim.ms, last = shown[shown.length - 1], s = last ? last.snap : null, none = c.how === 'none';
    P.size(680, 424);
    P.region('ro', 14, 16, 252, 218, 'orders table');
    P.region('rm', 414, 16, 252, 218, 'member table' + (none ? ': not read' : ''));
    os.forEach(function (o, i) {
      var cur = s && i === s.cur, cls = cur ? (s.miss ? 'bad now' : 'hot now') : s && s.links[i] ? 'wait' : 'plain';
      P.box('o' + i, 26, 46 + i * 46, 228, 42, { cls: cls, title: 'Order ' + o.id + ' · ' + o.item, sub: 'member_id ' + o.mid });
    });
    ms.forEach(function (m, j) {
      var on = s && s.cur >= 0 && (s.links[s.cur] || []).indexOf(j) >= 0;
      P.box('m' + j, 426, 70 + j * 70, 228, 42, { cls: none ? 'ghost' : on ? 'hot' : 'plain', title: 'id ' + m.id + ' · ' + m.name, sub: none ? 'Not read by this SELECT' : ' ' });
    });
    if (s) os.forEach(function (o, i) {
      var cur = i === s.cur, ls = s.links[i];
      if (!ls) return;
      if (cur && s.miss) { var y = 46 + i * 46 + 21; P.arrow('stop', 'o' + i + ':r', [340, y], { cls: 'bad' }); P.text('x', 352, y + 6, '×', { cls: 'bad', anchor: 'middle', bold: true }); return; }
      if (!cur && c.how !== 'join') return;
      ls.forEach(function (j) { P.arrow('a' + i + '_' + j, 'o' + i + ':r', 'm' + j + ':l', { cls: cur ? 'hot' : 'mut' }); });
    });
    P.region('rr', 14, 246, 652, 114, 'Result made');
    var res = s ? s.res : [];
    if (!res.length) P.text('re', 340, 306, s ? 'No result yet' : 'Waiting', { cls: 'mut', anchor: 'middle' });
    res.forEach(function (r, k) {
      var o = { anchor: 'start' };
      if (k >= res.length - s.fresh) o.cls = 'good';
      P.text('t' + k, 30 + Math.floor(k / 4) * 320, 284 + (k % 4) * 20, r[0] + ' · ' + r[1], o);
    });
    P.box('n1', 14, 374, 652, 36, { cls: res.length ? 'wait' : 'ghost', title: 'Rows in the result', right: res.length + '' });
  },
  assume: 'The model was checked against real execution on H2 2.4.240 (an in-memory database, through JDBC). For all 6 combinations, the whole SQL on the screen (including the comment lines) was run character by character, one statement at a time, and the number of rows that the SELECT returned and the values of all the rows (item and name, or member_id) were checked against the model. If the result had more than four rows, it was shortened to the first four rows and the total number of rows, and the same rule was used when checking. Besides this, the values that the step sentences rely on were also checked separately on H2: the number of rows in orders, that no member with id 9 exists in member, the id of the member that is the pair, and that the number of rows of a CROSS JOIN without ON is the product of the numbers of rows of the two tables. The definitions and rules were checked by opening the MySQL 8.4 documentation. In section 15.2.13.2 JOIN Clause, MySQL treats JOIN, CROSS JOIN, and INNER JOIN as the same thing that can be used in place of each other (standard SQL calls it INNER JOIN if there is ON and CROSS JOIN if there is not), a Cartesian product of the two tables is made when there is no condition, and the ON condition is a conditional expression that can be used in WHERE and is usually used to decide how to connect the tables. Table aliases follow the same section and the FROM description in section 15.2.13 SELECT Statement (tbl_name AS alias_name or tbl_name alias_name). However, the two documents do not separately say that a row without a pair does not appear in the result of an INNER JOIN, so that behavior was checked by execution on H2. I opened the documentation with a tool that summarizes a web page, and I did not check the original text character by character. The check by execution on MySQL was not done. The step sentences write out in order how the result is made. Which table the database actually reads first and how it finds the pairs is decided by the database, and the order of the lines in the result is decided by the ORDER BY on the screen. LEFT JOIN, which also keeps rows without a pair, is not covered, and it is covered in the lab "JOIN and GROUP BY" in the study section.',
});

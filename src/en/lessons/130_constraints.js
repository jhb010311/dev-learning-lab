Lab.register({
  id: 'constraints', nav: 'Tables, keys, and constraints', cat: 'Database', mode: 'step',
  title: 'What data gets in when there are no constraints?',
  intro: 'Insert wrong values into the member table and the orders table, or delete a member who still has orders. A table that has constraints rejects those statements with an error, and a table without constraints accepts them as they are. Run the same statement on both and check how the data differs afterwards.',
  terms: ['Constraint', 'Primary key, unique key, foreign key', 'NOT NULL and CHECK', 'Foreign key referential actions (ON DELETE)'],
  controls: [
    { id: 'op', label: 'Statement to run', type: 'select', value: 'fkdel', options: [['pkdup', 'INSERT: add a member with an id that already exists'], ['pknull', 'INSERT: add a member whose id is NULL'], ['uqdup', 'INSERT: add a member with an email that already exists'], ['uqnull', 'INSERT: add one more member whose email is NULL'], ['nnull', 'UPDATE: change the name of a member to NULL'], ['check', 'UPDATE: change the age of a member to -5'], ['fkins', 'INSERT: add an order for a member that does not exist (member 99)'], ['fkdel', 'DELETE: delete a member who has 2 orders']] },
    { id: 'con', label: 'Constraints', type: 'select', value: 'off', options: [['off', 'Not applied (only column names and types)'], ['on', 'Applied (primary key, unique, NOT NULL, CHECK, foreign key)']] },
    { id: 'act', label: 'ON DELETE action of the foreign key', type: 'select', value: 'restrict', options: [['restrict', 'RESTRICT (reject the delete if a child exists)'], ['cascade', 'CASCADE (delete the children too)'], ['setnull', 'SET NULL (set the foreign key of the children to NULL)']], hint: 'This decides what happens to the children (orders) that point to a parent (member) when you delete that parent.', show: function (c) { return c.op === 'fkdel' && c.con === 'on'; } },
  ],
  presets: [
    { t: 'Default settings', d: 'A member is deleted with no constraints. 2 orders with no owner remain.', v: { op: 'fkdel', con: 'off', act: 'restrict' } },
    { t: 'Foreign key RESTRICT', d: 'A member who still has orders cannot be deleted (error 1451).', v: { op: 'fkdel', con: 'on', act: 'restrict' } },
    { t: 'Foreign key CASCADE', d: 'When you delete the member, the orders of that member are deleted too.', v: { op: 'fkdel', con: 'on', act: 'cascade' } },
    { t: 'Foreign key SET NULL', d: 'The orders remain, and only the column that pointed to the member becomes NULL.', v: { op: 'fkdel', con: 'on', act: 'setnull' } },
    { t: 'The same id twice', d: 'Without a primary key, there are two members with id 1.', v: { op: 'pkdup', con: 'off', act: 'restrict' } },
    { t: 'An order for a missing member', d: 'A foreign key blocks an order that points to a parent that does not exist (error 1452).', v: { op: 'fkins', con: 'on', act: 'restrict' } },
    { t: 'Unique and NULL', d: 'Even with a unique constraint, NULL can go into several rows.', v: { op: 'uqnull', con: 'on', act: 'restrict' } },
  ],
  ACT: { restrict: 'RESTRICT', cascade: 'CASCADE', setnull: 'SET NULL' },
  STMT: {
    pkdup: "INSERT INTO member (id, email, name, age)\nVALUES (1, 'choi@lab.example', 'Choi', 22)",
    pknull: "INSERT INTO member (id, email, name, age)\nVALUES (NULL, 'choi@lab.example', 'Choi', 22)",
    uqdup: "INSERT INTO member (id, email, name, age)\nVALUES (4, 'kim@lab.example', 'Choi', 22)",
    uqnull: "INSERT INTO member (id, email, name, age)\nVALUES (4, NULL, 'Choi', 22)",
    nnull: 'UPDATE member SET name = NULL WHERE id = 2',
    check: 'UPDATE member SET age = -5 WHERE id = 2',
    fkins: "INSERT INTO orders (id, member_id, item)\nVALUES (104, 99, 'chair')",
    fkdel: 'DELETE FROM member WHERE id = 1',
  },
  // Check query: [SQL, what it counts, unit, the data is wrong if the count is at least this number]
  CHECK: {
    pkdup: ['SELECT COUNT(*) FROM member WHERE id = 1', 'Members with id 1:', '', 2],
    pknull: ['SELECT COUNT(*) FROM member WHERE id IS NULL', 'Members with id NULL:', '', 1],
    uqdup: ["SELECT COUNT(*) FROM member WHERE email = 'kim@lab.example'", 'Members with the same email:', '', 2],
    uqnull: ['SELECT COUNT(*) FROM member WHERE email IS NULL', 'Members with email NULL:', '', 99],
    nnull: ['SELECT COUNT(*) FROM member WHERE name IS NULL', 'Members with name NULL:', '', 1],
    check: ['SELECT COUNT(*) FROM member WHERE age < 0', 'Members with a negative age:', '', 1],
    fk: ['SELECT COUNT(*)\n  FROM orders o\n  LEFT JOIN member m ON m.id = o.member_id\n WHERE o.member_id IS NOT NULL AND m.id IS NULL', 'Orders without a member:', '', 1],
  },
  chk: function (c) { return this.CHECK[c.op === 'fkins' || c.op === 'fkdel' ? 'fk' : c.op]; },
  // SQL that is used by both the code on the screen and the checking program (verify/mysql/constraints_probe.js). The checking program runs these statements as they are on a real MySQL.
  plan: function (c) {
    var on = c.con === 'on';
    var ddl = on
      ? ['CREATE TABLE member (\n  id    INT PRIMARY KEY,\n  email VARCHAR(50) UNIQUE,\n  name  VARCHAR(20) NOT NULL,\n  age   INT CHECK (age >= 0)\n)',
         'CREATE TABLE orders (\n  id        INT PRIMARY KEY,\n  member_id INT,\n  item      VARCHAR(30) NOT NULL,\n  FOREIGN KEY (member_id) REFERENCES member (id)\n    ON DELETE ' + this.ACT[c.act] + '\n)']
      : ['CREATE TABLE member (\n  id    INT,\n  email VARCHAR(50),\n  name  VARCHAR(20),\n  age   INT\n)',
         'CREATE TABLE orders (\n  id        INT,\n  member_id INT,\n  item      VARCHAR(30)\n)'];
    var seed = ["INSERT INTO member (id, email, name, age) VALUES\n  (1, 'kim@lab.example', 'Kim', 30),\n  (2, 'lee@lab.example', 'Lee', 25),\n  (3, NULL, 'Park', 41)",
                "INSERT INTO orders (id, member_id, item) VALUES\n  (101, 1, 'desk'),\n  (102, 1, 'mouse'),\n  (103, 2, 'monitor')"];
    return { ddl: ddl, seed: seed, stmt: this.STMT[c.op], check: this.chk(c)[0] };
  },
  code: function (c) {
    var p = this.plan(c);
    return (c.con === 'on' ? '-- Tables with constraints\n' : '-- Tables without constraints\n') + p.ddl.join(';\n') + ';\n\n-- Initial data\n' + p.seed.join(';\n') + ';\n\n-- Statement to run\n' + p.stmt + ';\n\n-- Check query\n' + p.check + ';';
  },
  label: function (c) { return { pkdup: 'Add the same id', pknull: 'Add id NULL', uqdup: 'Add the same email', uqnull: 'Add email NULL', nnull: 'Name to NULL', check: 'Age to -5', fkins: 'Order for a missing member', fkdel: 'Delete a member with orders' }[c.op] + ' · ' + (c.con === 'on' ? 'Constraints on' + (c.op === 'fkdel' ? ' (' + this.ACT[c.act] + ')' : '') : 'No constraints'); },
  columns: ['Result of the statement', 'Rows changed', 'Rows after the statement', 'Check query'],
  // Applies one statement to the tables. If there are constraints, it rejects the statement with the same error number as MySQL.
  run: function (c) {
    var on = c.con === 'on', M = [[1, 'kim@lab.example', 'Kim', 30], [2, 'lee@lab.example', 'Lee', 25], [3, null, 'Park', 41]], O = [[101, 1, 'desk'], [102, 1, 'mouse'], [103, 2, 'monitor']];
    var r = { err: null, rule: '', affected: 0, mark: {}, gone: {}, kids: [] };
    function fail(no, msg, rule) { r.err = { no: no, msg: msg }; r.rule = rule; }
    function checkMember(row, self) {
      if (!on) return true;
      if (row[0] === null) { fail(1048, "Column 'id' cannot be null", 'PRIMARY KEY (id)'); return false; }
      if (row[2] === null) { fail(1048, "Column 'name' cannot be null", 'NOT NULL (name)'); return false; }
      if (row[3] !== null && row[3] < 0) { fail(3819, "Check constraint 'member_chk_1' is violated.", 'CHECK (age >= 0)'); return false; }
      if (M.some(function (m) { return m !== self && m[0] === row[0]; })) { fail(1062, "Duplicate entry '" + row[0] + "' for key 'member.PRIMARY'", 'PRIMARY KEY (id)'); return false; }
      if (row[1] !== null && M.some(function (m) { return m !== self && m[1] === row[1]; })) { fail(1062, "Duplicate entry '" + row[1] + "' for key 'member.email'", 'UNIQUE (email)'); return false; }
      return true;
    }
    function insMember(row) { if (checkMember(row, null)) { M.push(row); r.affected = 1; r.mark['m' + (M.length - 1)] = 1; } }
    function updMember(id, col, val) { var t = M.filter(function (m) { return m[0] === id; })[0], n = t.slice(); n[col] = val; if (checkMember(n, t)) { t[col] = val; r.affected = 1; r.mark['m' + M.indexOf(t) + ':' + col] = 1; } }
    if (c.op === 'pkdup') { r.rule = 'PRIMARY KEY (id)'; insMember([1, 'choi@lab.example', 'Choi', 22]); }
    if (c.op === 'pknull') { r.rule = 'PRIMARY KEY (id)'; insMember([null, 'choi@lab.example', 'Choi', 22]); }
    if (c.op === 'uqdup') { r.rule = 'UNIQUE (email)'; insMember([4, 'kim@lab.example', 'Choi', 22]); }
    if (c.op === 'uqnull') { r.rule = 'UNIQUE (email)'; insMember([4, null, 'Choi', 22]); }
    if (c.op === 'nnull') { r.rule = 'NOT NULL (name)'; updMember(2, 2, null); }
    if (c.op === 'check') { r.rule = 'CHECK (age >= 0)'; updMember(2, 3, -5); }
    if (c.op === 'fkins') {
      r.rule = 'FOREIGN KEY (member_id)';
      if (on && !M.some(function (m) { return m[0] === 99; })) fail(1452, 'Cannot add or update a child row: a foreign key constraint fails', r.rule);
      else { O.push([104, 99, 'chair']); r.affected = 1; r.mark.o3 = 1; }
    }
    if (c.op === 'fkdel') {
      r.rule = 'FOREIGN KEY (member_id)';
      O.forEach(function (o, i) { if (o[1] === 1) r.kids.push(i); });
      if (on && c.act === 'restrict' && r.kids.length) fail(1451, 'Cannot delete or update a parent row: a foreign key constraint fails', r.rule);
      else {
        r.gone.m0 = 1; r.affected = 1;
        if (on && c.act === 'cascade') r.kids.forEach(function (i) { r.gone['o' + i] = 1; });
        if (on && c.act === 'setnull') r.kids.forEach(function (i) { O[i][1] = null; r.mark['o' + i + ':1'] = 1; });
      }
    }
    r.M = M; r.O = O;
    r.liveM = M.filter(function (m, i) { return !r.gone['m' + i]; }); r.liveO = O.filter(function (o, i) { return !r.gone['o' + i]; });
    return r;
  },
  count: function (c, M, O) {
    var f = { pkdup: function (m) { return m[0] === 1; }, pknull: function (m) { return m[0] === null; }, uqdup: function (m) { return m[1] === 'kim@lab.example'; }, uqnull: function (m) { return m[1] === null; }, nnull: function (m) { return m[2] === null; }, check: function (m) { return m[3] !== null && m[3] < 0; } }[c.op];
    if (f) return M.filter(f).length;
    return O.filter(function (o) { return o[1] !== null && !M.some(function (m) { return m[0] === o[1]; }); }).length;
  },
  simulate: function (c) {
    var on = c.con === 'on', self = this, r = this.run(c), ck = this.chk(c), ev = [], sum = [], first = this.STMT[c.op].replace(/\n/g, ' ');
    var before = this.run({ op: 'none', con: c.con, act: c.act });
    function nul(x) { return x === null ? 'NULL' : String(x); }
    function view(res, phase) {
      // phase 0: the initial state, 1: the statement has arrived (not applied yet), 2: after it is applied
      var src = phase === 2 ? res : before;
      return { m: src.M.map(function (m, i) { return { cells: m.map(nul), gone: phase === 2 && !!res.gone['m' + i], isNew: phase === 2 && !!res.mark['m' + i], hot: m.map(function (x, j) { return phase === 2 && !!res.mark['m' + i + ':' + j]; }) }; }),
               o: src.O.map(function (o, i) { return { cells: o.map(nul), gone: phase === 2 && !!res.gone['o' + i], isNew: phase === 2 && !!res.mark['o' + i], hot: o.map(function (x, j) { return phase === 2 && !!res.mark['o' + i + ':' + j]; }) }; }) };
    }
    var st = { stmt: '', gate: '', gateK: '', chk: '', chkBad: false };
    function push(s, k, phase) { var v = view(r, phase); ev.push({ s: s, k: k, snap: { m: v.m, o: v.o, stmt: st.stmt, gate: st.gate, gateK: st.gateK, chk: st.chk, chkBad: st.chkBad } }); }
    push(on ? 'CREATE TABLE, INSERT: Two tables are created, and 3 members and 3 orders are inserted. The member table has a primary key (id), a unique constraint (email), NOT NULL (name), and CHECK (age >= 0), and the orders table has a primary key (id) and a foreign key (member_id) that points to the id of member.' : 'CREATE TABLE, INSERT: Two tables are created, and 3 members and 3 orders are inserted. Only the names and types of the columns are defined, and no constraint is applied at all. That member_id in orders is a member number is known only to people, and the DB does not know it.', '', 0);
    var what = { pkdup: 'Tries to insert member Choi with id 1. Kim already uses id 1.', pknull: 'Tries to insert member Choi with the id left empty (NULL).', uqdup: 'Tries to insert member Choi with the email kim@lab.example. Kim already uses this email.', uqnull: 'Tries to insert member Choi with the email left empty (NULL). The email of Park is already NULL too.', nnull: 'Tries to change the name of member 2 (Lee) to NULL.', check: 'Tries to change the age of member 2 (Lee) to -5. This makes no sense as an age.', fkins: 'Tries to insert an order for member 99. There is no member with id 99 in the member table.', fkdel: 'Tries to delete member 1 (Kim). In orders, there are 2 orders (101 and 102) that point to member 1.' }[c.op];
    st.stmt = 'wait';
    push(first + ': ' + what, '', 1);
    var okWhy = { pkdup: '1 row was inserted.', pknull: '1 row was inserted.', uqdup: '1 row was inserted.', uqnull: '1 row was inserted.', nnull: '1 row was changed.', check: '1 row was changed.', fkins: '1 row was inserted.', fkdel: '1 row was deleted from member. orders was not touched.' }[c.op];
    if (!on) {
      st.stmt = 'ok'; st.gate = 'No check, because there are no constraints'; st.gateK = 'none';
      push('There is no constraint to check: The DB only looks at whether the values fit the types, and runs the statement as it is. ' + okWhy, c.op === 'uqnull' ? '' : 'bad', 2);
    } else if (r.err) {
      st.stmt = 'err'; st.gate = 'Rejected: error ' + r.err.no; st.gateK = 'block';
      var why = { pkdup: 'A primary key must have a different value in every row. Id 1 already exists, so', pknull: 'A primary key cannot be empty (a primary key also implies NOT NULL). The id is NULL, so', uqdup: 'The same value cannot be inserted twice into a column with a unique constraint. The same email already exists, so', nnull: 'A column with NOT NULL cannot be left empty, so', check: 'The condition age >= 0 written in the CHECK becomes false, so', fkins: 'The value of a foreign key must be an id that actually exists in the parent table (member). Member 99 does not exist, so', fkdel: 'ON DELETE RESTRICT blocks the deletion of a parent (member) that still has children (orders). There are 2 orders that point to member 1, so' }[c.op];
      push(r.rule + ' check: ' + why + ' the DB rejects the statement and returns error ' + r.err.no + ' (' + r.err.msg + '). Not a single row of the tables changed.', 'good', 2);
    } else if (c.op === 'uqnull') {
      st.stmt = 'ok'; st.gate = 'Passed'; st.gateK = 'pass';
      push('UNIQUE (email) check: The email to insert is NULL. NULL means "no value", and a unique constraint does not treat NULLs as the same value. It is not a duplicate, so it passes, and 1 row was inserted.', '', 2);
    } else {
      st.stmt = 'ok'; st.gate = 'ON DELETE ' + this.ACT[c.act] + ' applied'; st.gateK = 'pass';
      push(c.act === 'cascade' ? 'FOREIGN KEY (member_id) check: 2 orders point to member 1. Because it is ON DELETE CASCADE, deleting member 1 also deletes those 2 orders (101 and 102).' : 'FOREIGN KEY (member_id) check: 2 orders point to member 1. Because it is ON DELETE SET NULL, deleting member 1 sets member_id of those 2 orders (101 and 102) to NULL. The order rows remain.', '', 2);
      push('The number of changed rows that MySQL reports: 1 row. It counts only the member row that the DELETE deleted directly. The 2 rows of orders that were ' + (c.act === 'cascade' ? 'deleted' : 'changed') + ' together because of the foreign key are not included in this number.', '', 2);
    }
    var n = this.count(c, r.liveM, r.liveO), bad = n >= ck[3];
    st.chk = ck[1] + ' ' + n + ck[2]; st.chkBad = bad;
    var mean;
    if (c.op === 'uqnull') mean = (on ? 'Although email has a unique constraint, NULL went into two rows. A unique constraint prevents only duplicates of non-NULL values.' : 'Without constraints, of course it goes in. Compare it with the side that has constraints.');
    else if (bad) mean = { pkdup: 'Looking up members by id 1 returns two. Now an id can no longer point to exactly one member.', pknull: 'A member without an id now exists. You can neither find this member by id nor point to it from an order.', uqdup: 'Two members use the same email. If you look up a member by email, you cannot decide who it is.', nnull: 'A member without a name now exists.', check: 'A member with a negative age now exists. The type INT alone cannot prevent a negative number.', fkins: 'Order 104 says it belongs to member 99, but there is no such member. It is a row whose owner cannot be known.', fkdel: 'Orders 101 and 102 still have member_id 1, but member 1 no longer exists. 2 orders without an owner remain.' }[c.op];
    else if (c.op === 'fkdel' && !r.err) mean = c.act === 'cascade' ? 'No order points to a missing member. Instead, 2 orders disappeared together.' : 'No order points to a missing member. An order whose member_id is NULL is regarded as an "order that points to no member", and it does not violate the foreign key.';
    else mean = 'The statement was rejected, so the data is exactly as it was at first.';
    push(ck[0].replace(/\s*\n\s*/g, ' ') + ' (check query). ' + ck[1] + ' ' + n + ck[2] + '. ' + mean, bad ? 'bad' : c.op === 'uqnull' ? '' : 'good', 2);
    sum.push((r.err ? 'The statement was rejected with error ' + r.err.no + '.' : 'The statement ran, and ' + r.affected + (r.affected === 1 ? ' row was' : ' rows were') + ' changed.') + ' Afterwards, member has ' + r.liveM.length + (r.liveM.length === 1 ? ' row' : ' rows') + ' and orders has ' + r.liveO.length + (r.liveO.length === 1 ? ' row' : ' rows') + '. ' + ck[1] + ' ' + n + ck[2] + '.');
    if (!on && c.op !== 'uqnull') sum.push('Without constraints, the DB accepts even wrong values without an error. The statement "succeeded" but the data is wrong, and that only becomes visible when you query it later. Constraints stop such values at the moment they try to enter the table.');
    if (on && r.err) sum.push({ pkdup: 'A primary key is a promise that "this value can point to exactly one row". So it accepts neither duplicates nor NULL.', pknull: 'A primary key combines a unique constraint and NOT NULL. It accepts neither duplicates nor NULL, and a table can have only one.', uqdup: 'A unique constraint keeps values from overlapping even in a column that is not the primary key. You put it on values that must differ for every person, such as an email or a national ID number.', nnull: 'NOT NULL stops a value that must exist from being saved as missing.', check: 'CHECK is a constraint where you write down a range or condition for values that a type alone cannot express.', fkins: 'A foreign key makes sure that a child row points only to a parent row that really exists. It rejects an INSERT or UPDATE that points to a missing parent.', fkdel: 'RESTRICT is the safest choice. As long as children remain, the parent cannot be deleted, so you have to clean up the orders first before you can delete the member. In MySQL, the behavior when you do not write ON DELETE is the same.' }[c.op]);
    if (c.op === 'uqnull') sum.push('"It may be empty, but if it has a value, it must not overlap" is what a unique constraint means. To block NULL as well, you also need NOT NULL, and a primary key is exactly the combination of the two.');
    if (on && c.op === 'fkdel' && c.act === 'cascade') sum.push('CASCADE deletes the children along with the parent. It is convenient, but one DELETE line also deletes rows of another table, so use it only for data that really may disappear together.');
    if (on && c.op === 'fkdel' && c.act === 'setnull') sum.push('SET NULL keeps the child rows and empties only the column that pointed to the parent. You use it, for example, when you must keep the order history of a member who left, and the foreign key column must be able to accept NULL.');
    return { events: ev, summary: sum, err: r.err, affected: r.affected, n: n, bad: bad,
      dump: { member: r.liveM.map(function (m) { return m.map(nul).join(','); }).sort().join(';'), orders: r.liveO.map(function (o) { return o.map(nul).join(','); }).sort().join(';') },
      row: [r.err ? 'Error ' + r.err.no : 'Success', r.err ? 'None' : r.affected + '', 'member ' + r.liveM.length + (r.liveM.length === 1 ? ' row' : ' rows') + ', orders ' + r.liveO.length + (r.liveO.length === 1 ? ' row' : ' rows'), ck[1] + ' ' + n + ck[2]] };
  },
  render: function (v, sim, t, H, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : null, c = sim.c;
    if (!s) { H.text(v, 'Click Run to go step by step.'); return; }
    function rows(list) { return list.map(function (r) { return { cls: r.gone ? 'gone' : '', cells: r.cells.map(function (x, j) { return { v: x, cls: r.hot[j] || r.isNew ? 'hot' : '' }; }) }; }); }
    var ln = H.lanes(v);
    H.lane(ln, 'Statement', this.STMT[c.op].replace(/\n/g, ' '), s.stmt === 'ok' ? 'hot' : s.stmt === 'err' ? 'wait' : 'none');
    H.lane(ln, 'Constraint check', s.gate || 'Not run yet', s.gateK === 'block' ? 'good' : s.gateK === 'pass' ? 'hot' : 'none');
    H.lane(ln, 'Check query', s.chk || 'Not queried yet', !s.chk ? 'none' : s.chkBad ? 'bad' : 'good');
    H.table(v, ['id', 'email', 'name', 'age'], rows(s.m), 'member table');
    H.table(v, ['id', 'member_id', 'item'], rows(s.o), 'orders table');
    H.text(v, 'Yellow cells are values that just went in or changed, and a row with a line through it is a deleted row.');
  },
  // Diagram: At the top are the statement to run and the constraint check, and below are the rows of member and orders. An arrow from an order to a member is where member_id points.
  draw: function (P, sim, shown) {
    var c = sim.c, last = shown[shown.length - 1], s = last ? last.snap : null, on = c.con === 'on';
    P.size(680, 340);
    P.box('stmt', 16, 14, 648, 36, { cls: !s || !s.stmt ? 'ghost' : s.stmt === 'ok' ? 'hot' : s.stmt === 'err' ? 'wait' : 'plain now', title: this.label(c).split(' · ')[0], right: !s || !s.stmt ? '' : s.stmt === 'ok' ? 'Executed' : s.stmt === 'err' ? 'Rejected' : 'Statement to run' });
    P.box('gate', 16, 62, 648, 32, { cls: !s || !s.gate ? 'ghost' : s.gateK === 'block' ? 'good' : s.gateK === 'pass' ? 'plain' : 'ghost', title: on ? 'Constraint check' : 'No constraint check', right: s && s.gate ? s.gate : on ? '' : 'Only the column types are checked' });
    P.arrow('a1', 'stmt:b', 'gate:t', { cls: s && s.stmt ? 'hot' : 'mut' });
    P.region('tm', 16, 106, 372, 180, 'member (parent)');
    P.region('to', 404, 106, 260, 180, 'orders (child)');
    if (!s) { P.text('hint', 340, 200, 'Click Run to start', { cls: 'mut', anchor: 'middle' }); return; }
    var alive = {};
    s.m.forEach(function (r, i) {
      var x = r.cells, changed = r.isNew || r.hot.some(Boolean);
      if (!r.gone && alive[x[0]] === undefined) alive[x[0]] = i;
      P.box('m' + i, 28, 138 + i * 35, 348, 29, { cls: r.gone ? 'ghost' : changed ? (sim.bad ? 'bad' : 'hot') : 'wait', title: 'id ' + x[0] + ' · ' + x[2] + ' · age ' + x[3], right: r.gone ? '(deleted)' : x[1] });
    });
    s.o.forEach(function (r, i) {
      var x = r.cells, target = x[1] === 'NULL' ? undefined : alive[x[1]], orphan = !r.gone && x[1] !== 'NULL' && target === undefined;
      P.box('o' + i, 416, 138 + i * 35, 236, 29, { cls: r.gone ? 'ghost' : orphan ? 'bad' : r.isNew || r.hot.some(Boolean) ? 'hot' : 'plain', title: x[0] + ' ' + x[2] + (r.gone ? ' (deleted)' : ''), right: orphan ? 'no member ' + x[1] : 'member ' + x[1] });
      if (!r.gone && target !== undefined) P.arrow('fk' + i, 'o' + i + ':l', 'm' + target + ':r', { cls: on ? 'mut' : 'dash' });
    });
    P.box('chk', 16, 296, 648, 32, { cls: !s.chk ? 'ghost' : s.chkBad ? 'bad' : 'good', title: 'Check query: ' + this.chk(c)[1].replace(/:$/, ''), right: s.chk ? s.chk.slice(this.chk(c)[1].length + 1) : '?' });
    P.note(on ? 'An arrow points to the member that member_id of an order refers to. A foreign key is applied, so the DB makes sure that a member really exists at the end of this arrow. A green check box means a constraint blocked the statement.' : 'An arrow points to the member that member_id of an order refers to. There is no foreign key, so the arrow is dashed. The DB does not know that this value is a member number, and it does not stop you even if there is no member at the end of the arrow. A red box is data that has gone wrong.');
  },
  assume: 'This is a small example with 3 members and 3 orders. For all 48 combinations (8 statements × with or without constraints × 3 ON DELETE actions), the SQL on the screen was run as it is on a real MySQL 8.4.11 (InnoDB, default sql_mode), and the error number and error message, the number of rows changed, all the rows of the two tables afterwards, and the result of the check query were checked to be the same as in the model. The error numbers and messages are those of MySQL, and they differ in other databases. That an UPDATE that changes a NOT NULL column to NULL is rejected with error 1048 holds in strict SQL mode (the default in MySQL 8), and when the same UPDATE is run in a session with strict mode turned off, it saves an empty string without an error. That NULL can go into a unique column several times is behavior that was confirmed by running it on MySQL, and some databases, such as SQL Server, allow NULL only once (this comparison followed the documentation and was not checked by execution). When you do not write ON DELETE, MySQL behaves the same as RESTRICT (NO ACTION), and in InnoDB there is no difference between the two. That the child rows deleted together by CASCADE are not included in the number of rows changed is also MySQL behavior that was confirmed by running it. It was also confirmed by running it that when you write only REFERENCES right after a column definition (member_id INT REFERENCES member(id)), MySQL accepts it without an error but does not create a foreign key. That is why the screen writes a separate FOREIGN KEY clause. The foreign keys are for InnoDB, and this lab covers only the case where one statement is run at a time.',
});

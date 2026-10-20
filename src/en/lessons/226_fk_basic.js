Lab.register({
  id: 'fk_basic', nav: 'Foreign keys', cat: 'Fundamentals', mode: 'step', basic: true, deep: ['constraints'],
  title: 'What is a foreign key, and what changes without one?',
  why: 'Without a foreign key, the program code must check by itself every time it saves whether "that member really exists." If even one place of code misses the check, or if a person runs SQL directly on the database, an order with no owner is created. A foreign key leaves this check to the database, so that the same rule is kept whichever program writes by whichever path.',
  use: 'Put it where a row of one table points to a row of another table, such as an order and a member, or a comment and a post. To delete the child rows together when you delete the parent row, add ON DELETE CASCADE. In places where there are very many writes and speed matters, or where tables are divided across several database servers, the program sometimes does the check without foreign keys.',
  intro: 'The member_id column of the orders table holds "the number of the member who placed this order." When you write the line FOREIGN KEY (member_id) REFERENCES member(id) for this column, it becomes a foreign key. It is a promise to the database that the value in member_id must be an id that really exists in the member table, so the database rejects any INSERT or DELETE that breaks the promise. In this lab you remove that line, or change the member_id of the second order, and run the same SQL each time. You see whether the database accepts each statement and whether an order that points to a missing member is left at the end.',
  terms: ['Primary key, unique key, foreign key', 'Constraint', 'Referential integrity', 'Parent table and child table'],
  controls: [
    { id: 'fk', label: 'Write the line FOREIGN KEY (member_id) REFERENCES member(id) in orders', type: 'check', value: true },
    { id: 'who', label: 'member_id of the second order', type: 'select', value: 'none', options: [['none', 'member_id of the second order is 99 (a member that does not exist)'], ['exist', 'member_id of the second order is 1 (a member that exists)'], ['null', 'member_id of the second order is left empty (NULL)']] },
  ],
  // q is the question shown on the question-style screen. t and d are the name and the description used in the text-only reading
  presets: [
    { t: 'Default settings', q: 'What does a foreign key look like, and what happens if you insert an order with a member number that does not exist?', d: 'An orders table with a foreign key. The database rejects the INSERT of an order for the missing member number 99, and it also rejects the DELETE of the member that an order points to.', v: { fk: true, who: 'none' } },
    { t: 'Removing the FOREIGN KEY line', q: 'What if you remove the line FOREIGN KEY (member_id) REFERENCES member(id)?', d: 'member_id is just a number column. An order for a missing member gets in, and the member can be deleted, so orders that point to a missing member are left.', v: { fk: false, who: 'none' } },
    { t: 'Changing member_id of the second order to 1', q: 'What if you change member_id of the second order to 1, a member number that exists?', d: 'A member number that exists goes in even with a foreign key. The DELETE of that member is rejected.', v: { fk: true, who: 'exist' } },
    { t: 'Leaving member_id empty', q: 'What if you insert the second order with an empty member_id (NULL)?', d: 'NULL goes in even with a foreign key, because it says that the order points to no member.', v: { fk: true, who: 'null' } },
    { t: 'Removing the FOREIGN KEY line and changing member_id to 1', q: 'What if you remove the FOREIGN KEY line and change member_id of the second order to 1?', d: 'The DELETE of member 1 is not rejected, so both orders point to a deleted member.', v: { fk: false, who: 'exist' } },
    { t: 'Removing the FOREIGN KEY line and leaving member_id empty', q: 'What if you remove the FOREIGN KEY line and insert the second order with an empty member_id?', d: 'Only the first order points to a deleted member. An order with NULL says that it points to no member.', v: { fk: false, who: 'null' } },
  ],
  // The code on the screen and the check program (verify/spring/src/FkBasicProbe.java) run the same text. The check script compares it character by character.
  m2Of: { none: '99', exist: '1', 'null': 'NULL' },
  code: function (c) {
    var l = ['CREATE TABLE member (', '    id   INT PRIMARY KEY,', '    name VARCHAR(20)', ');',
      'CREATE TABLE orders (', '    id        INT PRIMARY KEY,', '    member_id INT' + (c.fk ? ',' : '')];
    if (c.fk) l.push('    -- Foreign key: the value in member_id must be an id that exists in the member table', '    FOREIGN KEY (member_id) REFERENCES member(id)');
    l.push(');', '',
      "INSERT INTO member VALUES (1, 'Alice');",
      'INSERT INTO orders VALUES (10, 1);',
      'INSERT INTO orders VALUES (11, ' + this.m2Of[c.who] + ');', '',
      'DELETE FROM member WHERE id = 1;',
      'SELECT * FROM orders ORDER BY id;');
    return l.join('\n');
  },
  label: function (c) { return (c.fk ? 'With foreign key' : 'No foreign key') + ' · member_id of the second order: ' + { none: '99', exist: '1', 'null': 'NULL' }[c.who]; },
  columns: ['INSERT of the second order', 'DELETE of member 1', 'Orders left at the end', 'Orders pointing to a missing member'],
  simulate: function (c) {
    var fk = !!c.fk, who = c.who, m2 = this.m2Of[who], ev = [], sum = [];
    var insRej = fk && who === 'none';
    var q2 = 'INSERT INTO orders VALUES (11, ' + m2 + ')';
    // State: the rows of the two tables, the log of statements and results, the rejected statements (rej: the INSERT of the second order, delrej: the DELETE), and the number of orders that point to a missing member (orph)
    var st = { members: [], orders: [], log: [], rej: null, delrej: false, orph: 0 };
    function push(s, k) { ev.push({ s: s, k: k, snap: JSON.parse(JSON.stringify(st)) }); }
    function alive(id) { for (var i = 0; i < st.members.length; i++) if (!st.members[i].gone && st.members[i].id === id) return true; return false; }
    function refresh() {
      st.orph = 0;
      st.orders.forEach(function (o) { o.bad = o.m !== 'NULL' && !alive(o.m); if (o.bad) st.orph++; });
    }
    function cool() { st.members.forEach(function (r) { r.hot = false; }); st.orders.forEach(function (o) { o.hot = false; }); st.rej = null; st.delrej = false; }

    // 1. Two CREATE TABLE statements
    push('CREATE TABLE: The database creates two tables, member and orders. Right now they have no rows. The member_id column of orders holds "the number of the member who placed this order." ' + (fk ? 'orders has the line FOREIGN KEY (member_id) REFERENCES member(id), so the database remembers a promise: "the value in member_id must be an id that really exists in the member table." This is a foreign key.' : 'Only the type INT (integer) is written on the member_id column, so the database has no promise to remember, and member_id is just a column that holds a number.'), '');

    // 2. Member 1 in member
    cool();
    st.members.push({ id: '1', name: 'Alice', gone: false, hot: true });
    st.log.push(["INSERT member (1, Alice)", 'Inserted', 'good']);
    push("INSERT INTO member VALUES (1, 'Alice'): The database adds the row with id 1 and the name Alice to the member table. There is now one member.", '');

    // 3. Order 10 (member 1)
    cool();
    st.orders.push({ id: '10', m: '1', hot: true, bad: false });
    refresh();
    st.log.push(['INSERT orders (10, 1)', 'Inserted', 'good']);
    push('INSERT INTO orders VALUES (10, 1): This adds order 10. The 1 in member_id is "the number of the member who placed this order," and it points to the row with id 1 in the member table (Alice). ' + (fk ? 'Before it adds the row, the database checks the promise of the foreign key. It looks for the row with id 1 in the member table, finds it, and so the check passes and order 10 goes in. We did not write the code that does this check. The database does it by itself every time an INSERT arrives.' : 'There is no promise to check, so the database adds order 10 as it is.'), '');

    // 4. Order 11
    cool();
    var res2 = insRej ? 'Rejected: no such member number in member' : 'Inserted';
    var shortQ = 'INSERT orders (11, ' + m2 + ')';
    if (fk) {
      push(q2 + ': This tries to insert the second order. Before it adds the row, the database ' + (who === 'null' ? 'looks at member_id. member_id is empty (NULL), so there is no member number to look up.' : 'looks for the row with id ' + m2 + ' in the member table.') + ' The database does this check by itself, too.', '');
      if (insRej) {
        st.rej = { m: m2 }; st.log.push([shortQ, res2, 'bad']);
        push('Result of the check: The member table has no row with id 99. That breaks the promise, so the database rejects this INSERT and returns an error of the kind "the referenced row does not exist." Order 11 was not added to orders, and the table is exactly as it was before the INSERT.', 'bad');
      } else {
        st.orders.push({ id: '11', m: m2, hot: true, bad: false }); refresh(); st.log.push([shortQ, res2, 'good']);
        push(who === 'null'
          ? 'Result of the check: NULL means "points to no member," so the database has no member to look up, and it does not reject this INSERT. Order 11 went in. NULL can go in even with a foreign key.'
          : 'Result of the check: A row with id 1 exists, so the promise is kept and the row passes. Order 11 went in, and orders 10 and 11 point to the same member 1. One member can place many orders, so the same number may be written in many orders.', 'good');
      }
    } else {
      st.orders.push({ id: '11', m: m2, hot: true, bad: false }); refresh(); st.log.push([shortQ, res2, who === 'none' ? 'bad' : 'good']);
      push(q2 + ': This adds the second order. The database has no promise to check, so it adds the row as it is. ' + (who === 'none' ? 'The member table has no row with id 99, but member_id is just a number column, so 99 goes in. Order 11 points to a member that does not exist.' : who === 'exist' ? 'This time member_id holds the member number 1, which exists, so orders 10 and 11 point to the same member 1.' : 'Order 11, whose member_id is empty (NULL), went in.'), who === 'none' ? 'bad' : '');
    }

    // 5. DELETE
    cool();
    var refs = ['10']; if (who === 'exist') refs.push('11');
    var refText = refs.length === 1 ? 'order 10' : 'orders 10 and 11';
    var res3 = fk ? 'Rejected: an order points to this member' : 'Deleted';
    if (fk) {
      push('DELETE FROM member WHERE id = 1: This tries to delete member 1 (Alice). Before it deletes the row, the database looks in the orders table for orders whose member_id is 1. It finds ' + refText + '.', '');
      st.delrej = true; st.members[0].hot = true; st.log.push(['DELETE member (id = 1)', res3, 'bad']);
      push('Result of the check: Orders that point to this member are still there, so the database rejects this DELETE and returns an error of the kind "another table references this row." Member 1 was not deleted, and the member table is exactly as it was before the DELETE. So a member that an order points to never disappears.', 'bad');
    } else {
      st.members[0].gone = true; refresh();
      st.log.push(['DELETE member (id = 1)', res3, 'bad']);
      push('DELETE FROM member WHERE id = 1: This deletes member 1 (Alice). The database has no promise to check, so the row with id 1 is deleted from member as it is. The member_id values written in orders do not change, so ' + (refs.length === 1 ? 'order 10, whose member_id is 1, remains' : 'orders 10 and 11, whose member_id is 1, remain') + ', but the member that number pointed to no longer exists.', 'bad');
    }

    // 6. SELECT
    cool();
    var finalText = st.orders.map(function (o) { return '(' + o.id + ', ' + o.m + ')'; }).join(', ');
    var after;
    if (fk) after = who === 'none' ? 'Order 11 was rejected and not added, and the remaining order 10 points to member 1, who is in member.' : who === 'exist' ? 'Both orders point to member 1, and member 1 was not deleted, so it is still in member.' : 'Order 11 has NULL in member_id, so it points to no member, and order 10 points to member 1, who is still in member.';
    else after = who === 'none' ? 'Member 1, whom order 10 points to, has just been deleted, and member 99, whom order 11 points to, never existed. Both orders point to a missing member.' : who === 'exist' ? 'Orders 10 and 11 both point to member 1, but member 1 was deleted. Both orders point to a missing member.' : 'Order 10 points to the deleted member 1. Order 11 has NULL in member_id, so it says that it points to no member.';
    st.log.push(['SELECT * FROM orders', finalText, st.orph ? 'bad' : 'good']);
    push('SELECT * FROM orders ORDER BY id: This reads the orders left in orders, in order of id. The result is ' + finalText + '. ' + after, st.orph ? 'bad' : 'good');

    // 7. A SELECT for checking. The result of a statement that is not in the code on the screen, run separately
    st.log.push(['(Check) SELECT that counts missing members', 'Orders: ' + st.orph, st.orph ? 'bad' : 'good']);
    push('As a side note, we run a separate statement for checking that is not in this code. SELECT COUNT(*) FROM orders o LEFT JOIN member m ON o.member_id = m.id WHERE o.member_id IS NOT NULL AND m.id IS NULL looks in member for a match for every order in orders, and counts the orders that have no match. The result is ' + st.orph + '.' + (who === 'null' ? ' An order with NULL in member_id says that it points to no member, so it is not counted.' : '') + (st.orph === 0 ? ' Because of the foreign key, not a single order without a match could appear.' : ' There is no foreign key, so the database did not stop it, and orders without a match are left.'), st.orph ? 'bad' : 'good');

    // Summary: the first line is the answer to the question
    var S = {
      'true|none': ['A foreign key is what you get when you write FOREIGN KEY (member_id) REFERENCES member(id) in orders while creating the table. It is a promise to the database that the value in member_id must be an id that really exists in the member table, and the database rejected the INSERT of an order for the missing member number 99.', 'The database also rejected the DELETE of the member that an order points to. We did not write the code that checks this. The database checked it by itself at every statement, so the number of orders that point to a missing member is 0.'],
      'false|none': ['Without the FOREIGN KEY line, member_id is just a number column. An order for the missing member number 99 went in, and member 1, who still has an order, was deleted.', 'Both orders now point to a member that is not in member (2 orders). If you do not write the promise down, the database does not keep the relationship between orders and members.'],
      'true|exist': ['If you change member_id of the second order to the existing member number 1, the INSERT goes in even with a foreign key. A foreign key does not block every INSERT. It is a promise that blocks only numbers that are not in member.', 'Two orders may point to the same member 1. The DELETE of member 1 was rejected because these orders point to it, and the number of orders that point to a missing member is 0.'],
      'false|exist': ['Even without the FOREIGN KEY line, the INSERT with an existing member number goes in. What differs comes after that. The DELETE of member 1 was not rejected, so both orders now point to a deleted member.', 'We just happened to insert a number that exists, and the database did not keep it that way. The database also did not stop the deletion of a member who still has orders (2 orders).'],
      'true|null': ['The INSERT with an empty member_id (NULL) goes in even with a foreign key. NULL means "points to no member," so the database has no member to look up, and a foreign key does not reject NULL.', 'The DELETE of member 1 was rejected because order 10 points to it. An order with NULL in member_id is not counted as an order that points to a missing member, so the count is 0.'],
      'false|null': ['Without the FOREIGN KEY line, both the order with an empty member_id and the DELETE of member 1 pass. The remaining order 10 points to the deleted member 1 (1 order).', 'Order 11 has NULL in member_id, so it says that it points to no member, and it is not counted as an order that points to a missing member. NULL goes in whether or not there is a foreign key.']
    };
    S[fk + '|' + who].forEach(function (x) { sum.push(x); });
    return { events: ev, summary: sum, row: [res2, res3, finalText, st.orph + ''] };
  },
  render: function (v, sim, t, H, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : null;
    if (!s) { H.text(v, 'Click Run to start from CREATE TABLE and go one statement at a time.'); return; }
    H.table(v, ['id', 'name'], s.members.length ? s.members.map(function (r) { return { cls: r.gone ? 'gone' : '', cells: [{ v: r.id, cls: r.hot ? 'hot' : '' }, { v: r.gone ? r.name + ' (deleted)' : r.name, cls: r.hot ? 'hot' : '' }] }; }) : [{ cls: 'gone', cells: ['No rows', ''] }], 'member table');
    H.table(v, ['id', 'member_id'], s.orders.length ? s.orders.map(function (o) { var k = o.bad ? 'bad' : o.hot ? 'hot' : ''; return { cls: '', cells: [{ v: o.id, cls: k }, { v: o.m, cls: k }] }; }) : [{ cls: 'gone', cells: ['No rows', ''] }], 'orders table');
    H.table(v, ['Statement run', 'Result'], s.log.map(function (r) { return { cls: '', cells: [r[0], { v: r[1], cls: r[2] }] }; }), 'Statements and results');
    H.counters(v, [[s.orph, 'Orders pointing to a missing member'], [s.orders.length, 'Rows in orders']]);
  },
  // Diagram: the member table on the left and the orders table on the right. An arrow goes from the member_id of an order row to the member row it points to, and an order that points to a missing member shows a cut red arrow. The number of such orders is at the bottom.
  draw: function (P, sim, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : null;
    P.size(680, 292);
    P.region('mt', 14, 16, 222, 208, 'member table');
    P.region('ot', 404, 16, 262, 208, 'orders table');
    if (s && s.members.length === 0) P.text('emp', 125, 126, 'No rows', { cls: 'mut', anchor: 'middle' });
    if (s && s.orders.length === 0 && !s.rej) P.text('emo', 535, 126, 'No rows', { cls: 'mut', anchor: 'middle' });
    if (s && s.members.length) {
      var m = s.members[0];
      P.box('m0', 26, 90, 198, 40, { cls: m.gone ? 'ghost' : m.hot ? 'hot' : 'wait', title: 'id ' + m.id + ' · ' + m.name + (m.gone ? ' (deleted)' : '') });
      if (s.delrej) P.text('dl', 125, 156, 'DELETE rejected, row stays', { cls: 'bad', anchor: 'middle', bold: true });
    }
    (s ? s.orders : []).forEach(function (o, i) {
      var y = 50 + i * 56;
      P.box('o' + i, 416, y, 238, 40, { cls: o.bad ? 'bad' : o.hot ? 'hot' : 'wait', title: 'id ' + o.id + ' · member_id ' + o.m });
      if (o.m !== 'NULL') {
        if (o.bad) { P.arrow('ar' + i, 'o' + i + ':l', [310, y + 20], { cls: 'bad' }); P.text('x' + i, 302, y + 25, '×', { cls: 'bad', anchor: 'middle', bold: true }); }
        else P.arrow('ar' + i, 'o' + i + ':l', 'm0:r', { cls: 'good' });
      }
    });
    if (s && s.rej) {
      var yr = 50 + s.orders.length * 56;
      P.box('o' + s.orders.length, 416, yr, 238, 40, { cls: 'ghost', title: 'Rejected · member_id ' + s.rej.m });
      P.arrow('arj', 'o' + s.orders.length + ':l', [310, yr + 20], { cls: 'bad' }); P.text('xj', 302, yr + 25, '×', { cls: 'bad', anchor: 'middle', bold: true });
    }
    P.box('n1', 14, 242, 652, 36, { cls: s ? (s.orph ? 'bad' : 'good') : 'ghost', title: 'Orders pointing to a missing member', right: (s ? s.orph : 0) + '' });
    if (s && s.orders.some(function (o) { return o.m === 'NULL'; })) P.note('An order with NULL in member_id says that it points to no member, so it is not counted as pointing to a missing member.');
    else if (s && s.orph) P.note('A red box is an order whose member_id points to a member that is not in member. Its arrow is cut.');
  },
  assume: 'The model was checked against real execution on H2 2.4.240 (an in-memory database, through JDBC). For all 6 combinations, the whole SQL on the screen (including the comment line) was run character by character, one statement at a time, and when one statement was rejected, the next statement was still run. The following were checked against the model: whether the INSERT of the second order and the DELETE of member 1 were accepted or rejected and the kind of error (H2 SQLSTATE 23506 means the INSERT breaks the foreign key, and 23503 means the DELETE tries to delete a referenced row), and the result of the last SELECT. "Orders pointing to a missing member" is the value that the Probe counted at the end by separately running the checking statement SELECT COUNT(*) FROM orders o LEFT JOIN member m ON o.member_id = m.id WHERE o.member_id IS NOT NULL AND m.id IS NULL, which is not in the code on the screen. The code on the screen does not put only REFERENCES next to the column definition. It writes a separate FOREIGN KEY (member_id) REFERENCES member(id) line. This is because the MySQL 8.4 documentation (section 1.7.2.3 FOREIGN KEY Constraint Differences and the Indexes, Foreign Keys, and CHECK Constraints part of section 15.1.20 CREATE TABLE) says that MySQL only parses and then ignores a REFERENCES written next to a column definition, and accepts only one written in a separate FOREIGN KEY line. I separately checked that H2 accepts both forms as a foreign key. I opened section 15.1.20.5 FOREIGN KEY Constraints of the MySQL 8.4 documentation directly and checked the following: a foreign key constraint is defined on the child table; an INSERT or UPDATE that creates a value in the child table with no matching value in the parent table is rejected; and when ON DELETE is not written, the default action is NO ACTION, which in InnoDB is the same as RESTRICT and immediately rejects the deletion of the parent row. That an INSERT is possible when the foreign key column is NULL, even if the parent has no match, follows section 15.1.20 and the MATCH description in section 1.7.2.3 (MATCH SIMPLE allows a NULL foreign key). The error numbers and the wording of the messages differ from database to database, so the screen shows only the kind of error. The check by execution on MySQL was not done. So the rule above rests on the documentation and the H2 execution agreeing, and it was not verified by execution whether MySQL gives the same result for the same SQL. That a table without a FOREIGN KEY line accepts a member number that does not exist and does not stop the deletion of a member is behavior observed on H2. This lab covers only the default behavior of a foreign key (rejection), and it does not cover referential actions such as ON DELETE CASCADE, UPDATE, NOT NULL, or composite foreign keys.',
});

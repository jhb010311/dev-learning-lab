Lab.register({
  id: 'tx_basic', nav: '@Transactional', cat: 'Fundamentals', mode: 'step', basic: true, deep: ['tx', 'txprop'],
  title: 'What does @Transactional group together?',
  intro: '@Transactional is a marker (an annotation) that you put above a method. The order() method in this lab saves to the database twice with jdbc.update (an order in the orders table and a payment in the payment table). Between the two saves there is a stock check, and if stock is 0, it throws an exception. With no marker, the database applies each save as it receives it, so even if an exception occurs, the earlier save stays. If you put @Transactional above order(), Spring treats the saves inside that method as one unit (a transaction). If the method ends normally, it applies all of them (commit), and if it ends with an exception, it cancels all of them (rollback). We do not write the code that starts the unit and applies or cancels it. Spring does it before and after it calls order(). In this lab, you remove @Transactional or change the value put in stock, call the same order(), and look at the rows left in the two tables after the call ends.',
  terms: ['@Transactional', 'Transaction', 'Commit and rollback', 'Proxy'],
  controls: [
    { id: 'tx', label: 'Put @Transactional above order()', type: 'check', value: true },
    { id: 'stock', label: 'The value put in stock', type: 'select', value: 'zero', options: [['zero', 'Put 0 in stock (an exception occurs between the two saves)'], ['five', 'Put 5 in stock (no exception occurs)']] },
  ],
  // q is the question shown on the question-style screen. t and d are the name and the description used in the text-only reading
  presets: [
    { t: 'Default settings', q: 'What does @Transactional look like, and what happens when an exception occurs between the two saves?', d: 'order() with @Transactional. An exception occurs between the two saves, so Spring cancels the whole transaction and both tables have 0 rows.', v: { tx: true, stock: 'zero' } },
    { t: 'Removing @Transactional', q: 'What if you remove @Transactional?', d: 'The earlier save has already been applied, so a half-finished state is left: there is an order but no payment.', v: { tx: false, stock: 'zero' } },
    { t: 'Putting 5 in stock', q: 'What if you put 5 in stock so that no exception occurs?', d: 'If no exception occurs, Spring applies the whole transaction, and each table is left with 1 row.', v: { tx: true, stock: 'five' } },
    { t: 'Removing it and putting 5 in stock', q: 'What if you remove @Transactional and also no exception occurs?', d: 'If there is no exception, the tables end up the same even without @Transactional. Each save is applied immediately.', v: { tx: false, stock: 'five' } },
  ],
  // The code on the screen and the source that the verification program (verify/spring/src/TxBasicProbe.java) ran are the same text (the verification script compares them character by character).
  code: function (c) {
    var o = ['@Service', 'public class OrderService {', '    private final JdbcTemplate jdbc;', '', '    public OrderService(JdbcTemplate jdbc) {', '        this.jdbc = jdbc;', '    }', ''];
    if (c.tx) o.push('    // Unit: the saves inside this method are all applied or all canceled', '    @Transactional');
    o.push('    public void order() {',
      "        jdbc.update(\"INSERT INTO orders VALUES (1, 'keyboard')\");",
      '        int stock = ' + (c.stock === 'zero' ? '0' : '5') + ';',
      '        if (stock == 0) {',
      '            throw new IllegalStateException("Out of stock");',
      '        }',
      '        jdbc.update("INSERT INTO payment VALUES (1, 30000)");',
      '    }', '}');
    return o.join('\n');
  },
  label: function (c) { return (c.tx ? 'has @Transactional' : 'no @Transactional') + ' · ' + (c.stock === 'zero' ? '0' : '5') + ' in stock'; },
  columns: ['How order() ended', 'Rows in the orders table', 'Rows in the payment table'],
  simulate: function (c) {
    var tx = !!c.tx, zero = c.stock === 'zero', ev = [], sum = [];
    // State: od and pm are the rows of the two tables ('' none, pending not final inside the transaction, saved applied to the database, gone canceled and removed), txs is the state of the transaction, cur is the line running now
    var st = { tx: tx, od: '', pm: '', txs: '', cur: '', done: { l1: false, l2: false, l3: false }, fail: false, half: false, log: [] };
    function push(s, k) { ev.push({ s: s, k: k, snap: JSON.parse(JSON.stringify(st)) }); }

    // 1. main calls order()
    push('The main of the program calls the order() method of the OrderService object that Spring created. ' + (tx
      ? 'This object is not the class we wrote as it is but an object of another class that Spring made (a proxy), so the call goes through the code of Spring before it reaches the first line of order().'
      : 'This object is the OrderService class we wrote, as it is, so the call goes straight into the first line of order().') + ' The two tables, orders and payment, have no rows yet.', '');

    // 2. (If there is @Transactional) Spring starts the transaction
    if (tx) {
      st.txs = 'open'; st.log.push(['Transaction start', 'Started by Spring before order()', '']);
      push('Before it enters the order() method, Spring starts a transaction. That is because order() has @Transactional above it. From now on, the saves made inside order() belong to one transaction, and they are not final in the database until the transaction ends. The line that starts the transaction is not in the code we wrote.', '');
    }

    // 3. The first INSERT: save the order
    st.cur = 'l1'; st.done.l1 = true; st.od = tx ? 'pending' : 'saved';
    st.log.push(['INSERT orders', tx ? 'In the transaction: not final yet' : 'Applied immediately', tx ? 'wait' : 'good']);
    push('jdbc.update saves one row of an order (1, keyboard) to the orders table. ' + (tx
      ? 'This save is inside the transaction, so it is not final yet. If you open a separate connection to the same database and count orders, it has 0 rows.'
      : 'There is no transaction, so this save is applied to the database immediately. If you open a separate connection to the same database and count orders, it has 1 row.'), '');

    // 4. Stock check
    st.cur = 'l2'; st.done.l2 = true;
    if (zero) {
      st.fail = true; st.log.push(['Stock check', 'Throws an exception (out of stock)', 'bad']);
      push('With int stock = 0, the condition of the next line, if (stock == 0), is true, so IllegalStateException("Out of stock") is thrown. The order() method ends with the exception without running the line that saves the payment.', 'bad');
    } else {
      st.log.push(['Stock check', 'Passed', '']);
      push('stock holds 5, so the condition if (stock == 0) is false, and the method moves on to the next line without an exception.', '');
    }

    // 5. The second INSERT: save the payment (only if there is no exception)
    if (!zero) {
      st.cur = 'l3'; st.done.l3 = true; st.pm = tx ? 'pending' : 'saved';
      st.log.push(['INSERT payment', tx ? 'In the transaction: not final yet' : 'Applied immediately', tx ? 'wait' : 'good']);
      push('jdbc.update saves one row of a payment (1, 30000) to the payment table. ' + (tx ? 'This save is also inside the transaction, so it is not final until the transaction ends.' : 'There is no transaction, so this save is also applied to the database as soon as it is sent.'), '');
    }

    // 6. order() ends: Spring cancels or applies the transaction
    st.cur = '';
    if (tx && zero) {
      st.txs = 'rolled'; st.od = 'gone';
      st.log.push(['Transaction end', 'Canceled (rollback)', 'good']);
      push('Spring sees that order() ended with an exception and cancels (rolls back) the whole transaction. The order row saved earlier is also undone and disappears from orders. IllegalStateException is a RuntimeException, so Spring canceled it by its default rule. The line that cancels is not in the code we wrote either, and the exception is passed on as it is to main, which called order().', 'good');
    } else if (tx) {
      st.txs = 'committed'; st.od = 'saved'; st.pm = 'saved';
      st.log.push(['Transaction end', 'Applied (commit)', 'good']);
      push('Spring sees that order() ended normally and applies (commits) the whole transaction. The order row and the payment row that were waiting are now final in the database. The line that applies is not in the code we wrote either.', 'good');
    } else if (zero) {
      st.half = true;
      push('The exception is passed on as it is to main, which called order(). Spring has no transaction to cancel, so the order row that was already applied stays.', 'bad');
    } else {
      push('order() ends normally. The two saves were each already applied when they were sent, so there is nothing more to do at the end, and Spring did not start or apply a transaction.', '');
    }

    // 7. Query the tables and look at the row counts
    var no = st.od === 'saved' ? 1 : 0, np = st.pm === 'saved' ? 1 : 0;
    var tail = tx && zero ? ' Neither the order nor the payment is left.' : zero ? ' A half-finished state is left in the database: there is an order but no payment.' : ' Both the order and the payment are left.';
    push('After order() ends, main queries the two tables. Rows in orders: ' + no + '. Rows in payment: ' + np + '.' + tail, st.half ? 'bad' : '');

    // Summary: the first line is the answer to the question
    if (tx && zero) {
      sum.push('@Transactional is a marker that you put above a method, and with it Spring treats the saves inside that method as one unit (a transaction). An exception occurred between the two saves, so even the earlier order save was canceled (rolled back), and orders and payment both have 0 rows.');
      sum.push('We wrote neither the code that starts the transaction nor the code that cancels it. Spring did it before and after calling order(). So a state with "an order but no payment" is not left.');
    } else if (zero) {
      sum.push('If you remove @Transactional, the earlier save stays in the database. After the exception, orders has 1 row and payment has 0 rows, a half-finished state with an order but no payment.');
      sum.push('Without a transaction, a save is applied to the database as soon as it is sent, and it can no longer be canceled later. The fact that the method ended with an exception does not undo the earlier save.');
    } else if (tx) {
      sum.push('If no exception occurs, Spring applies (commits) the whole transaction, and orders and payment have 1 row each. The two saves piled up inside the transaction and became final when order() ended normally.');
      sum.push('@Transactional makes no visible difference on the path that ends normally, and it decides the result when an exception occurs. If you remove @Transactional and put 5 in stock, the tables end up the same.');
    } else {
      sum.push('Even without @Transactional, if no exception occurs, the two saves are each applied immediately, and orders and payment have 1 row each. The tables end up the same as with @Transactional.');
      sum.push('The result is the same, but the process is different. Here each save was applied on the spot, and Spring did not start or apply a transaction. What separates the two is the case where an exception occurs between the two saves.');
    }
    return { events: ev, summary: sum, row: [zero ? 'Ended with an exception (out of stock)' : 'Ended normally', no + '', np + ''] };
  },
  render: function (v, sim, t, H, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : null;
    if (!s) { H.text(v, 'Click Run to start from main calling order().'); return; }
    H.table(v, ['What happened inside order()', 'Result'], s.log.length ? s.log.map(function (r) { return { cls: '', cells: [r[0], { v: r[1], cls: r[2] }] }; }) : [{ cls: 'gone', cells: ['Nothing yet', ''] }], 'After calling order()');
    H.counters(v, [[s.od === 'saved' ? 1 : 0, 'Rows applied to orders'], [s.pm === 'saved' ? 1 : 0, 'Rows applied to payment']]);
  },
  // Diagram: on the left, the three lines of order() (save the order, check stock, save the payment) from top to bottom, and if there is @Transactional, a transaction area around them. On the right, the rows of the orders and payment tables appear and then disappear if canceled.
  draw: function (P, sim, shown) {
    var c = sim.c, last = shown[shown.length - 1], s = last ? last.snap : null;
    P.size(680, 292);
    var tt = 'Transaction' + (s && s.txs === 'open' ? ' · in progress' : s && s.txs === 'rolled' ? ' · rolled back' : s && s.txs === 'committed' ? ' · committed' : '');
    if (c.tx) P.region('tx', 14, 12, 330, 214, tt);
    else P.text('hd', 26, 28, 'Lines of the order() method', { cls: 'mut', anchor: 'start' });
    P.region('db', 380, 12, 286, 214, 'Tables in the database');
    function line(id, y, title, sub, k, failed) {
      var cur = s && s.cur === id, done = s && s.done[id];
      P.box(id, 26, y, 306, 52, { cls: cur ? (failed ? 'bad now' : 'hot now') : failed && done ? 'bad' : done ? 'good' : 'plain', title: title, sub: sub });
    }
    line('l1', 40, '1. Save the order', 'INSERT INTO orders', 0, false);
    line('l2', 98, '2. Check stock', 'Exception if stock is 0', 0, !!(s && s.fail));
    line('l3', 156, '3. Save the payment', 'INSERT INTO payment', 0, false);
    function tbl(id, y, name, row, state, bad) {
      var sub = state === 'pending' ? row + ' (not final)' : state === 'saved' ? row + (bad ? ' (stays applied)' : ' (applied)') : state === 'gone' ? 'Canceled, no row' : 'No row';
      P.box(id, 392, y, 262, 52, { cls: state === 'pending' ? 'wait' : state === 'saved' ? (bad ? 'bad' : 'good') : 'ghost', title: name, sub: sub });
    }
    tbl('od', 40, 'orders table', '1 · keyboard', s ? s.od : '', !!(s && s.half));
    tbl('pm', 156, 'payment table', '1 · 30000', s ? s.pm : '', false);
    if (s && s.cur === 'l1') P.arrow('a1', 'l1:r', 'od:l', { cls: 'hot' });
    if (s && s.cur === 'l3') P.arrow('a3', 'l3:r', 'pm:l', { cls: 'hot' });
    var n1 = s && s.od === 'saved' ? 1 : 0, n2 = s && s.pm === 'saved' ? 1 : 0;
    P.box('n1', 14, 242, 322, 36, { cls: n1 ? (s.half ? 'bad' : 'good') : 'ghost', title: 'Rows applied to orders', right: n1 + '' });
    P.box('n2', 344, 242, 322, 36, { cls: n2 ? 'good' : 'ghost', title: 'Rows applied to payment', right: n2 + '' });
    if (s && s.half) P.note('The red box is the half-finished state: only the order save was applied, and the payment save could not be done.');
  },
  assume: 'This was checked against real execution of Spring Framework 7.0.9 on JDK 21, connected by JDBC to H2 2.4.240 (an in-memory database), and it was not checked against execution on MySQL. For all 4 combinations, the same source as the OrderService on the screen (with only the package and import lines and two measurement lines marked PROBE at the end added) was compiled, and a new Java process was started for each combination. The configuration class had @EnableTransactionManagement, which AnnotationConfigApplicationContext reads, an H2 DataSource (HikariCP), JdbcTemplate, and DataSourceTransactionManager (a subclass with only lines added to count starts, commits, and rollbacks), and OrderService was marked @Service so that Spring finds it by component scanning. Auto-commit was left at the JDBC default (on), and the database and the two tables (orders, payment) were created anew for each combination. What was checked is how order() ended (IllegalStateException and its message, or normal) and the number of rows in orders and payment counted by a separate query after the call ended. The facts that the step sentences rely on were also checked by execution: whether a transaction is active inside order() (active only when there is @Transactional), the class of the OrderService bean that main received (a CGLIB proxy class made by Spring when there is @Transactional, and the class we wrote as it is when there is not), the number of rows in orders counted over a separately connected database connection right after the first save (0 rows with @Transactional, 1 row without it), and the number of times the transaction manager started, committed, and rolled back (1 start and 1 rollback if it ended with an exception, 1 start and 1 commit if it ended normally, and all 0 without @Transactional). That the second save is not final inside the transaction, and that it is applied immediately without one, were derived from the value measured after the first save and from the final row counts, and the moment right after the second save was not measured separately. What the documentation defines is the Declarative Transaction Management section of Data Access in the Spring Framework 7.0 documentation (that declarative transactions are done through AOP), the section Understanding the Spring Framework\'s Declarative Transaction Implementation (that TransactionInterceptor and the transaction manager drive the transaction around the method call), the section Using @Transactional (that it must be turned on with @EnableTransactionManagement and that the default is the proxy mode, and that by default RuntimeException and Error are rolled back while checked exceptions are not), and the section Rolling Back a Declarative Transaction (that in the default settings only runtime exceptions are marked for rollback). However, the documentation does not describe in one paragraph the order of starting before the method, committing if normal, and rolling back if an exception, so that order is an observation based on the counts and the row numbers that the Probe measured. The code on the screen leaves out the package and import lines, and it does not show the main that calls order(), the CREATE TABLE that creates the tables, the database connection, and the Spring configuration. This lab covers only one exception, a RuntimeException being thrown, and does not cover checked exceptions, calls from inside the same class, or readOnly. Checked exceptions, rollbackFor, and propagation are covered in the "Transaction propagation" lab, and transactions themselves (including isolation levels) are covered in the "Transaction basics" lab.',
});

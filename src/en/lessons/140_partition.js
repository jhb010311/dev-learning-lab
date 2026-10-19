Lab.register({
  id: 'partition', nav: 'Partitioning', cat: 'Database', mode: 'step',
  title: 'When a table is cut into pieces, which pieces does a query read?',
  intro: 'Partitioning stores one big table in several pieces (partitions) inside the same server. You can divide it by a range, such as the year of the order date (RANGE), or by a calculation, such as the remainder of the member number divided by 4 (HASH). Depending on how you write the condition, a query reads only the partitions it needs or reads all of them.',
  terms: ['Sharding and partitioning', 'RANGE partitioning and HASH partitioning', 'Partition pruning', 'Query execution plan (EXPLAIN)', 'Primary key, unique key, foreign key'],
  controls: [
    { id: 'how', label: 'How to divide', type: 'select', value: 'range', options: [['range', 'RANGE: by the year of the order date'], ['hash', 'HASH: by the remainder of the member number divided by 4']] },
    { id: 'pk', label: 'Primary key', type: 'select', value: 'with', options: [['with', '(id, partitioning key column)'], ['only', '(id) only']] },
    { id: 'ins', label: 'Row to insert', type: 'select', value: 'in', options: [['in', 'An order in June 2025, member 7'], ['out', 'An order in January 2026, member 9']] },
    { id: 'q', label: 'Query condition', type: 'select', value: 'func', options: [['key', 'Partitioning key column = value'], ['range', 'A range on the partitioning key column'], ['func', 'A function or calculation applied to the partitioning key column'], ['other', 'A condition without the partitioning key (id = 100)']] },
  ],
  presets: [
    { t: 'Default settings', q: 'Which partitions does a query with YEAR(ordered_at) = 2024 read on a table divided by RANGE: by the year of the order date?', d: 'The table is divided by year, but a search with YEAR(ordered_at) = 2024 reads all three partitions.', v: { how: 'range', pk: 'with', ins: 'in', q: 'func' } },
    { t: 'Comparing the column as it is', q: 'What if the query condition is the partitioning key column = value?', d: 'It reads only the one partition that the date would be in.', v: { how: 'range', pk: 'with', ins: 'in', q: 'key' } },
    { t: 'A range that spans two years', q: 'What if the query condition is a range on the partitioning key column?', d: 'It reads only the two partitions it spans and skips the rest.', v: { how: 'range', pk: 'with', ins: 'in', q: 'range' } },
    { t: 'A condition without the partitioning key', q: 'What if the query condition has no partitioning key (id = 100)?', d: 'Even though it searches by the first column of the primary key, it reads all the partitions.', v: { how: 'range', pk: 'with', ins: 'in', q: 'other' } },
    { t: 'Inserting a date outside the range', q: 'What if you insert an order in January 2026 from member 9 and query with the partitioning key column = value?', d: 'There is no partition to accept it, so the INSERT fails with error 1526.', v: { how: 'range', pk: 'with', ins: 'out', q: 'key' } },
    { t: 'When the primary key lacks the partitioning key', q: 'What if the primary key is (id) only and you query with the partitioning key column = value?', d: 'Error 1503 occurs when the table is created.', v: { how: 'range', pk: 'only', ins: 'in', q: 'key' } },
    { t: 'Dividing with a hash', q: 'What if you divide with HASH, insert an order in January 2026 from member 9, and query a range on the partitioning key column?', d: 'Any value has a place to go, but a range query reads all the partitions.', v: { how: 'hash', pk: 'with', ins: 'out', q: 'range' } },
  ],
  where: function (c) {
    if (c.q === 'other') return 'id = 100';
    if (c.how === 'range') return { key: "ordered_at = '2024-03-05'", range: "ordered_at BETWEEN '2024-11-01' AND '2025-02-28'", func: 'YEAR(ordered_at) = 2024' }[c.q];
    return { key: 'member_id = 7', range: 'member_id BETWEEN 1 AND 100', func: 'member_id % 4 = 3' }[c.q];
  },
  values: function (c) { return c.ins === 'in' ? "(1001, 7, '2025-06-01', 5000)" : "(1002, 9, '2026-01-10', 5000)"; },
  code: function (c) {
    var R = c.how === 'range';
    return 'CREATE TABLE orders (\n  id BIGINT NOT NULL,\n  member_id INT NOT NULL,\n  ordered_at DATE NOT NULL,\n  amount INT NOT NULL,\n  PRIMARY KEY (' + (c.pk === 'with' ? 'id, ' + (R ? 'ordered_at' : 'member_id') : 'id') + ')\n)\n'
      + (R ? 'PARTITION BY RANGE (YEAR(ordered_at)) (\n  PARTITION p2023 VALUES LESS THAN (2024),\n  PARTITION p2024 VALUES LESS THAN (2025),\n  PARTITION p2025 VALUES LESS THAN (2026)\n);' : 'PARTITION BY HASH (member_id) PARTITIONS 4;')
      + '\n\n-- 300 orders are already in the table, and one more is inserted\n-- Column order: id, member_id, ordered_at, amount\nINSERT INTO orders VALUES ' + this.values(c) + ';\n\n-- Which partitions this query reads appears in the partitions column of EXPLAIN\nEXPLAIN SELECT * FROM orders WHERE ' + this.where(c) + ';';
  },
  label: function (c) { return (c.how === 'range' ? 'RANGE(year)' : 'HASH(member number)') + ' · primary key ' + (c.pk === 'with' ? '(id, partitioning key)' : '(id)') + ' · ' + (c.ins === 'in' ? 'insert a 2025 order' : 'insert a 2026 order') + ' · ' + { key: 'key = value', range: 'range on key', func: 'function on key', other: 'query by id' }[c.q]; },
  columns: ['CREATE TABLE', 'INSERT', 'Partitions read by the query', 'Number of partitions read'],
  // How many of the 300 orders go into each partition: the member number of order n is n % 40 + 1, and the order date is 3n days after 2023-01-01
  spread: function (how) {
    var d = how === 'range' ? [0, 0, 0] : [0, 0, 0, 0];
    for (var n = 1; n <= 300; n++) { if (how === 'range') d[new Date(Date.UTC(2023, 0, 1) + n * 3 * 86400000).getUTCFullYear() - 2023]++; else d[(n % 40 + 1) % 4]++; }
    return d;
  },
  simulate: function (c) {
    var R = c.how === 'range', names = R ? ['p2023', 'p2024', 'p2025'] : ['p0', 'p1', 'p2', 'p3'], N = names.length, ev = [], sum = [], keycol = R ? 'ordered_at' : 'member_id', W = this.where(c);
    var st = { made: 0, rows: names.map(function () { return 0; }), ins: -1, insErr: false, read: null, stage: '', res: '' };
    function push(s, k) { ev.push({ s: s, k: k, snap: JSON.parse(JSON.stringify(st)) }); }
    if (c.pk === 'only') {
      st.made = -1; st.stage = 'create'; st.res = 'Error 1503: the table was not created';
      push('CREATE TABLE … PRIMARY KEY (id) … PARTITION BY ' + (R ? 'RANGE (YEAR(ordered_at))' : 'HASH (member_id)') + ': error 1503 occurs and the table is not created. The message is "A PRIMARY KEY must include all columns in the table\'s partitioning function". This is because the primary key (id) does not include the ' + keycol + ' column, the column the table is divided by.', 'bad');
      st.stage = 'why';
      push('The reason for this restriction: in MySQL, each partition has its own indexes. A primary key and a unique key must check whether the same value already exists. If the key includes the ' + keycol + ' column, MySQL can decide by looking at only the one partition the row goes to. If it does not, MySQL cannot know whether the same id exists in another partition. That is why the partitioning key column has to be in the primary key and in every unique key. Here, changing it to PRIMARY KEY (id, ' + keycol + ') fixes it.', '');
      sum.push('In a partitioned table, the primary key and every unique key must include the partitioning key column. If you partition a table that is already in operation later, you may have to change the primary key first, so decide this at design time.');
      sum.push('Because of this restriction, the database cannot guarantee that "id alone is unique." If the primary key is (id, ' + keycol + '), two rows with the same id and a different ' + keycol + ' can be inserted.');
      return { events: ev, summary: sum, names: names, w: W, vals: this.values(c), row: ['Error 1503', '-', '-', '-'] };
    }
    st.made = 1; st.stage = 'create'; st.res = 'Created ' + N + ' partitions';
    push(R ? 'CREATE TABLE … PARTITION BY RANGE (YEAR(ordered_at)): The orders table is created in three pieces (p2023, p2024, p2025) according to the year of the order date. Each of these pieces is a partition. To whoever writes queries, it still looks like one orders table, and all three partitions are in the same MySQL server.' : 'CREATE TABLE … PARTITION BY HASH (member_id) PARTITIONS 4: The orders table is created in four pieces (p0, p1, p2, p3). Each of these pieces is a partition. Which partition a row goes to is decided by the remainder of the member number divided by 4. To whoever writes queries, it still looks like one orders table, and all four partitions are in the same MySQL server.', '');
    st.rows = this.spread(c.how); st.stage = 'data'; st.res = '300 orders divided among the partitions';
    push('300 orders are inserted. The inserting side does not specify a partition. For each row, MySQL chooses the partition it goes into ' + (R ? 'by looking at the year of the order date' : 'by calculating the remainder of the member number divided by 4') + '. Rows per partition: ' + st.rows.map(function (x, i) { return names[i] + ': ' + x; }).join(', ') + '.', '');
    var to = R ? (c.ins === 'in' ? 2 : -1) : (c.ins === 'in' ? 3 : 1), V = this.values(c);
    st.stage = 'ins';
    if (to < 0) {
      st.insErr = true; st.res = 'Error 1526: no partition for the year 2026';
      push('INSERT … VALUES ' + V + ': error 1526 (Table has no partition for value 2026) occurs and the row is not inserted. The year of the order date is 2026, but the partitions that were created accept values only below 2026. In a RANGE partitioned table without a MAXVALUE partition, a value that does not belong to any range cannot be inserted.', 'bad');
    } else {
      st.ins = to; st.rows[to]++; st.res = 'Stored in partition ' + names[to];
      push('INSERT … VALUES ' + V + ': ' + (R ? 'The year of the order date is 2025, so the row goes into partition p2025, which accepts "less than 2026".' : 'The remainder of the member number (' + (c.ins === 'in' ? 7 : 9) + ') divided by 4 is ' + to + ', so the row goes into partition p' + to + '. A HASH partition has nothing like "out of range". Any value has a place to go, decided by the remainder calculation.'), 'good');
    }
    var read, why, k;
    if (c.q === 'other') { read = names.map(function (x, i) { return i; }); why = 'The condition does not have the ' + keycol + ' column, which is the partitioning key. There is no way to know in advance which partition the row with id 100 is in, so all partitions are read. Since id is the first column of the primary key, the row is found directly by the index inside a partition, but that lookup is repeated as many times as there are partitions.'; k = 'bad'; }
    else if (R) {
      if (c.q === 'key') { read = [1]; why = 'The condition has the ordered_at column, the partitioning key, with the value 2024-03-05. MySQL knows that the only place a row with this date can be is partition p2024, and it does not even open the other two partitions. This is called partition pruning.'; k = 'good'; }
      else if (c.q === 'range') { read = [1, 2]; why = 'From 2024-11-01 to 2025-02-28 spans the years 2024 and 2025. It reads only the two partitions p2024 and p2025 and skips partition p2023. A RANGE partition suits queries that look for a continuous range like this.'; k = 'good'; }
      else { read = [0, 1, 2]; why = 'The condition is applied not to the ordered_at column itself but to YEAR(ordered_at). Even though this is exactly the expression the table is partitioned by, MySQL cannot pick partitions from a condition that wraps the column in a function, so it reads all three partitions. If you leave the column as it is and write a range, as in ordered_at >= \'2024-01-01\' AND ordered_at < \'2025-01-01\', it reads only partition p2024.'; k = 'bad'; }
    } else {
      if (c.q === 'key') { read = [3]; why = 'The condition has the member_id column, the partitioning key, with the value 7. The remainder of 7 divided by 4 is 3, so it reads only partition p3 and does not even open the other three partitions. This is called partition pruning.'; k = 'good'; }
      else if (c.q === 'range') { read = [0, 1, 2, 3]; why = 'Member numbers 1 to 100 contain values with remainders 0, 1, 2, and 3 all mixed together, so all four partitions must be read. A HASH partition scatters values on purpose, so a range condition can hardly reduce the partitions to read. As an exception, a very short range with only a few values, such as BETWEEN 5 AND 6, is calculated value by value, and only partitions p1 and p2 are read.'; k = 'bad'; }
      else { read = [0, 1, 2, 3]; why = 'The condition is applied not to the member_id column itself but to member_id % 4. Even though it is the same expression as the calculation that decides the partition, MySQL cannot pick partitions from a condition that applies a calculation to the column, so it reads all four partitions.'; k = 'bad'; }
    }
    st.read = read; st.stage = 'sel'; st.ins = -1; st.res = 'Partitions read: ' + read.length + ' of ' + N;
    var list = read.map(function (i) { return names[i]; }).join(',');
    push('EXPLAIN SELECT * FROM orders WHERE ' + W + ': ' + why + ' The partitions column of EXPLAIN: ' + list + '.', k);
    var cnt = read.length + ' of ' + N + (read.length === N ? ' (all)' : '');
    sum.push('Partitioning stores one table in pieces inside a single server. Unlike sharding, which divides data among several servers, it lets you use joins, transactions, and queries as they are. In return, it does not let you go past the limit of one server. Its purpose is to reduce the range that is read and deleted at one time.');
    if (read.length < N) sum.push('If the condition contains the partitioning key column as it is, MySQL picks and reads only the partitions it needs. However big the table is, the range that is read shrinks to those partitions.');
    else sum.push(c.q === 'other' ? 'A query without the partitioning key reads all the partitions, so it can even create more work than before the table was partitioned. Choose as the partitioning key the column that is in the most frequently used query condition.' : c.q === 'func' ? 'If you apply a function or a calculation to the partitioning key column, pruning does not happen. It is the same principle as an index not being usable when a function is applied to the indexed column. Leave the column as it is and change the value you compare it with.' : 'A HASH partition is used to scatter rows evenly, and it suits queries that look up a single value. If you often search by range, as with dates, a RANGE partition is the better fit.');
    if (R) sum.push(to < 0 ? 'With a RANGE partition, you have to add the partition for the next period in advance (ALTER TABLE … ADD PARTITION). After you add it, the same INSERT goes in. If you forget, INSERTs start failing on the day the year changes.' : 'A big advantage of a RANGE partition is that old data can be dropped as a whole. ALTER TABLE orders DROP PARTITION p2023 removes that partition as a piece, instead of deleting its rows one by one.');
    return { events: ev, summary: sum, names: names, w: W, vals: V, row: ['Success', to < 0 ? 'Error 1526' : 'Stored in ' + names[to], list, cnt] };
  },
  render: function (v, sim, t, H, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : null, names = sim.names;
    if (!s) { H.text(v, 'Click Run to go one step at a time.'); return; }
    if (s.made < 0) { H.text(v, 'The orders table was not created (error 1503).'); H.counters(v, [['Failed', 'CREATE TABLE']]); return; }
    H.counters(v, [[s.insErr ? 'Error 1526' : s.stage === 'ins' || s.stage === 'sel' ? 'Success' : '-', 'INSERT'], [s.read ? s.read.length + ' of ' + names.length : '-', 'Partitions read by the query']]);
  },
  // Diagram: at the top is the statement being run, and below it is the orders table inside one server with its partitions. The partitions that the query reads are yellow, and the ones it skips are dashed.
  draw: function (P, sim, shown) {
    var c = sim.c, last = shown[shown.length - 1], R = c.how === 'range', names = sim.names, N = names.length, s = last ? last.snap : { made: 0, rows: names.map(function () { return 0; }), ins: -1, insErr: false, read: null, stage: '', res: 'Before running' };
    var w = N === 3 ? 200 : 147, step = w + 10, st = s.stage, sel = st === 'sel';
    P.size(680, 312);
    P.box('q', 100, 14, 480, 46, { cls: st === 'create' && s.made < 0 || s.insErr && st === 'ins' ? 'bad' : st ? 'wait' : 'plain', title: st === 'create' || st === 'why' ? 'CREATE TABLE orders … PARTITION BY ' + (R ? 'RANGE' : 'HASH') : st === 'data' ? 'INSERT (300 orders)' : st === 'ins' ? 'INSERT INTO orders VALUES' : sel ? 'SELECT * FROM orders' : 'Statement to run', sub: st === 'ins' ? sim.vals : sel ? 'WHERE ' + sim.w : st === 'create' || st === 'why' ? 'PRIMARY KEY (' + (c.pk === 'with' ? 'id, ' + (R ? 'ordered_at' : 'member_id') : 'id') + ')' : ' ' });
    P.region('srv', 16, 84, 648, 160, 'One MySQL server · one orders table');
    for (var i = 0; i < N; i++) {
      var on = sel && s.read.indexOf(i) >= 0, got = st === 'ins' && s.ins === i;
      P.box('p' + i, 30 + i * step, 116, w, 114, { cls: s.made <= 0 ? 'ghost' : got ? 'good now' : sel ? (on ? 'hot now' : 'ghost') : 'wait', title: names[i], sub: [R ? 'Orders of ' + (2023 + i) : 'member_id % 4 = ' + i, s.made < 0 ? 'Not created' : s.made === 0 ? 'Not created yet' : 'Rows: ' + s.rows[i], got ? 'New row inserted' : sel ? (on ? 'Read' : 'Skipped') : ' '] });
      if (on) P.arrow('a' + i, 'q:b:' + ((i + 0.5) / N), 'p' + i + ':t', { cls: 'hot' });
      if (got) P.arrow('a' + i, 'q:b:' + ((i + 0.5) / N), 'p' + i + ':t', { cls: 'good', label: 'Stored' });
    }
    P.box('res', 16, 258, 648, 38, { cls: s.made < 0 || (s.insErr && st === 'ins') ? 'bad' : sel ? (s.read.length < N ? 'good' : 'hot') : 'plain', title: 'Result', right: s.res });
    P.note('In the query step, a yellow partition is one that is actually read, and a dashed partition is one that is skipped without being opened.');
  },
  assume: 'All 32 combinations were run with the same statements as on the screen on MySQL 8.4.11 (InnoDB) in our test run, and checked against the screen. For each combination I created the table anew and confirmed that the following matched the screen: whether CREATE TABLE succeeded and its error code; the number of rows of the 300 orders in each partition (SELECT COUNT(*) … PARTITION (name)); the partition that the new row went into, or the error code of the INSERT; and the partitions column of EXPLAIN. The error messages written on the screen are the real messages too. I also confirmed the following facts used in the explanations by execution. Error 1503 occurs even when a unique key does not have the partitioning key. A table with neither a primary key nor a unique key is not subject to the restriction. If the date condition is written as a range on the column (>= and <), only p2024 is read. In HASH, BETWEEN 5 AND 6 reads only p1 and p2. After a 2026 partition is added with ADD PARTITION, the same INSERT succeeds. DROP PARTITION p2023 removes the 121 rows of that partition. When the primary key is (id, ordered_at), two rows with the same id and different dates can be inserted. Which partitions are read is decided by the condition and has nothing to do with the number of rows or statistics, but whether an index is used inside a partition and the estimated number of rows depend on the data, so I did not treat them as results. The restriction on the partitioning key and the primary key and the form of conditions that allow pruning also agree with the explanations in the MySQL 8.4 Reference Manual, 26.6.1 Partitioning Keys, Primary Keys, and Unique Keys and 26.4 Partition Pruning. That each partition has its own indexes was confirmed by seeing that the partition set is stored in InnoDB as separate tables and data files, and that a separate PRIMARY index is listed for each partition in the index statistics (mysql.innodb_index_stats). LIST and KEY partitioning, subpartitions, and the cost when there are a very large number of partitions are not covered. Other database products sometimes allow a unique index without the partitioning key, so this restriction is MySQL-specific.',
});

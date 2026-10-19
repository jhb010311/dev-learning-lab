Lab.register({
  id: 'kafka', nav: 'Kafka partitions and consumers', cat: 'Message queues', mode: 'step',
  title: 'I added consumers, so why is the throughput the same?',
  intro: 'A topic is split into partitions, and the consumers of a consumer group divide the partitions among themselves. Within a group, a partition can be read by only one consumer.',
  terms: ['Kafka topics, partitions, and offsets', 'Consumer groups and rebalancing', 'Consumer lag', 'Message delivery guarantees', 'Message queue', 'Idempotency and idempotency keys'], ranks: ['mq', 'msa'],
  controls: [
    { id: 'p', label: 'Partitions', type: 'range', min: 1, max: 6, value: 3, fmt: function (v) { return v + (v === 1 ? ' partition' : ' partitions'); } },
    { id: 'c', label: 'Consumers (same group)', type: 'range', min: 1, max: 6, value: 2, fmt: function (v) { return v + (v === 1 ? ' consumer' : ' consumers'); } },
    { id: 'r', label: 'Messages arriving per second', type: 'range', min: 30, max: 300, step: 30, value: 120, fmt: function (v) { return v + ''; } },
    { id: 'k', label: 'Messages one consumer processes per second', type: 'range', min: 10, max: 100, step: 10, value: 50, fmt: function (v) { return v + ''; } },
    { id: 'commit', label: 'When to commit the offset', type: 'select', value: 'after', options: [['after', 'Commit after processing the messages'], ['before', 'Commit before processing the messages']] },
    { id: 'crash', label: 'One consumer dies while processing', type: 'check', value: false },
  ],
  presets: [
    { t: 'Default settings', q: 'What happens with 3 partitions and 2 consumers when 120 messages arrive per second and one consumer processes 50 per second?', d: '2 consumers for 3 partitions. The processing capacity is too low, so messages pile up.', v: { p: 3, c: 2, r: 120, k: 50, commit: 'after', crash: false } },
    { t: 'With 3 consumers', q: 'What if you increase the consumers to 3?', d: 'Each partition gets one consumer, and the pile-up disappears.', v: { p: 3, c: 3, r: 120, k: 50, commit: 'after', crash: false } },
    { t: 'Even with 6 consumers', q: 'What if you keep 3 partitions and increase to 6 consumers and 240 messages per second?', d: 'There are only 3 partitions, so 3 consumers have nothing to do.', v: { p: 3, c: 6, r: 240, k: 50, commit: 'after', crash: false } },
    { t: 'With 6 partitions too', q: 'What if you also increase the partitions to 6, with 6 consumers and 240 messages per second?', d: 'Now all 6 consumers work.', v: { p: 6, c: 6, r: 240, k: 50, commit: 'after', crash: false } },
    { t: 'A consumer dies while processing (commit after)', q: 'With 3 consumers and the offset committed after processing, what if one consumer dies while processing?', d: 'Another consumer takes over, and it processes some messages again.', v: { p: 3, c: 3, r: 120, k: 50, commit: 'after', crash: true } },
    { t: 'A consumer dies while processing (commit before)', q: 'What if one of 3 consumers dies while processing and the offset is committed before processing the messages?', d: 'Messages that were already committed are skipped without being processed.', v: { p: 3, c: 3, r: 120, k: 50, commit: 'before', crash: true } },
  ],
  code: function (c) {
    return '// Only the lines inside a method are shown (consumer setup, the example Order and handle declarations, class, and imports omitted)\n// Topic orders: ' + c.p + ' partitions\n// Consumer group order-service: ' + c.c + ' consumers\n\nwhile (true) {\n    ConsumerRecords<String, Order> records = consumer.poll(Duration.ofMillis(500));\n' + (c.commit === 'before' ? '    consumer.commitSync();               // first, record "read up to here"\n    for (var r : records) {\n        handle(r.value());               // then process\n    }\n' : '    for (var r : records) {\n        handle(r.value());               // first, process\n    }\n    consumer.commitSync();               // then, record "read up to here"\n') + '}';
  },
  label: function (c) { return 'Partitions ' + c.p + ' · consumers ' + c.c + ' · inflow ' + c.r + '/s · processing ' + c.k + '/s · ' + (c.commit === 'after' ? 'commit after processing' : 'commit before processing') + (c.crash ? ' · failure' : ''); },
  columns: ['Throughput per second', 'Messages waiting after 10s', 'Idle consumers', 'Duplicate processing', 'Lost'],
  assign: function (P, cons) { var own = []; for (var i = 0; i < P; i++) own.push(cons[i % cons.length]); return own; },
  calc: function (c, cons) {
    var own = this.assign(c.p, cons), per = c.r / c.p, parts = [], total = 0, lag = 0;
    for (var i = 0; i < c.p; i++) { var n = own.filter(function (x) { return x === own[i]; }).length, done = Math.min(per, c.k / n); parts.push({ id: i, own: own[i], inflow: per, done: done, lag: Math.round((per - done) * 10) }); total += done; lag += Math.round((per - done) * 10); }
    var idle = cons.filter(function (x) { return own.indexOf(x) < 0; });
    return { parts: parts, total: Math.round(total), lag: lag, idle: idle, cons: cons.slice() };
  },
  simulate: function (c) {
    var ev = [], cons = [], sum = [], dup = 0, lost = 0;
    for (var i = 1; i <= c.c; i++) cons.push(i);
    var A = this.calc(c, cons), cur = A, note = '';
    function push(s, k, stage) { ev.push({ s: s, k: k, snap: { st: cur, stage: stage, note: note } }); }
    push(c.c + (c.c === 1 ? ' consumer subscribes' : ' consumers subscribe') + ' to the topic as one group. The ' + c.p + (c.p === 1 ? ' partition is' : ' partitions are') + ' divided among the consumers (the group coordinator coordinates the assignment). Within a group, a partition is handled by only one consumer.' + (A.idle.length ? ' There are more consumers than partitions, so ' + (A.idle.length === 1 ? 'consumer ' : 'consumers ') + A.idle.join(', ') + (A.idle.length === 1 ? ' has' : ' have') + ' no partition to handle.' : ''), A.idle.length ? 'bad' : '', 1);
    push('Messages arrive at ' + c.r + ' per second, and ' + Math.round(c.r / c.p) + ' per second go into each partition (assuming the keys are spread evenly). Each consumer processes ' + c.k + ' messages per second, and a consumer that handles several partitions shares that capacity among them. The throughput of the whole group is ' + A.total + ' messages per second.', A.total < c.r ? 'bad' : 'good', 2);
    push('10 seconds have passed. ' + (A.lag ? 'Processing cannot keep up with the inflow, so ' + A.lag + ' messages are waiting unread (consumer lag). If this continues, the lag grows without limit.' : 'Every partition is processed as fast as messages arrive, so no messages are waiting.'), A.lag ? 'bad' : 'good', 3);
    if (c.crash) {
      var dead = cons[0], after = c.commit === 'after';
      note = 'Consumer ' + dead + ': fetched five messages (offsets 100-104). Died after processing 100, 101, and 102. Committed offset: ' + (after ? '100 (not committed yet)' : '105 (already committed before processing)');
      push('Consumer ' + dead + ' fetched five messages (offsets 100-104) and died right after processing three of them. ' + (after ? 'It was going to commit after finishing all the processing, so the position recorded on the broker is still 100.' : 'It committed before processing, so the broker has already recorded that it read up to 105.'), 'bad', 4);
      var rest = cons.slice(1);
      if (!rest.length) { cur = { parts: A.parts.map(function (p) { return { id: p.id, own: null, inflow: p.inflow, done: 0, lag: Math.round(p.inflow * 10) }; }), total: 0, lag: c.r * 10, idle: [], cons: [] }; push('No consumers are left. Nobody reads, so messages just keep piling up on the broker. Messages do not disappear. They are kept for the retention period, so when a consumer starts again, it continues reading.', 'bad', 5); }
      else { cur = this.calc(c, rest); push('The broker detects that consumer ' + dead + ' has stopped responding and divides the partitions again (rebalancing). During a rebalance, consumption stops for a short time (how much stops depends on the assignment strategy). The remaining consumers (' + rest.length + ') share the partitions, so the throughput becomes ' + cur.total + ' messages per second.', cur.total < c.r ? 'bad' : '', 5); }
      if (after) { dup = 3; push('The consumer that takes over the partition reads again from the last committed position, 100. Messages 100, 101, and 102 were already processed, but they are processed one more time. Nothing is lost, but 3 duplicates occurred (at-least-once delivery).', 'bad', 6); }
      else { lost = 2; push('The consumer that takes over the partition reads from the committed position, 105. Messages 103 and 104 were committed but never processed, and nobody reads them again. There are no duplicates, but 2 messages were lost (at-most-once delivery).', 'bad', 6); }
    }
    if (A.idle.length) sum.push('The number of consumers that can work at the same time in a group cannot exceed the number of partitions. To raise the throughput further, you must increase the partitions first. You can add partitions but cannot reduce them, and adding them can change which partition messages with the same key go to.');
    else if (A.lag) sum.push('Lag builds up. You must increase the consumers up to the number of partitions, or make each consumer process faster. Lag is the key metric that shows whether the consumers are keeping up.');
    if (c.crash) sum.push(c.commit === 'after' ? 'Committing after processing does not lose messages, but it can process the same message twice. In practice most systems use this approach, and make the consumer idempotent so that a duplicate gives the same result (for example, record the IDs of processed messages and filter out repeats).' : 'Committing before processing has no duplicates, but it can lose messages. Use it only for logs or statistics where a small loss is acceptable.');
    sum.push('Order is guaranteed only within the same partition. If the events of the same order must be processed in order, give the order ID as the key so that they go to the same partition.');
    return { events: ev, summary: sum, row: [String(A.total), String(A.lag), String(A.idle.length), String(dup), String(lost)] };
  },
  render: function (v, sim, t, H, shown) {
    var c = sim.c, last = shown[shown.length - 1], s = last ? last.snap : null;
    if (!s) { H.text(v, 'Click Run to start with the partition assignment.'); return; }
    var st = s.st, show = s.stage >= 2, lagOn = s.stage >= 3;
    H.table(v, ['Partition', 'Assigned consumer', 'Inflow per second', 'Processed per second', 'Messages waiting after 10s'], st.parts.map(function (p) { return { cells: ['Partition ' + p.id, { v: p.own ? 'Consumer ' + p.own : 'None', cls: p.own ? '' : 'bad' }, show ? String(Math.round(p.inflow)) : '-', show ? String(Math.round(p.done)) : '-', { v: lagOn ? String(p.lag) : '-', cls: lagOn && p.lag ? 'bad' : lagOn ? 'good' : '' }] }; }), 'Topic orders');
    H.title(v, 'Consumer group'); var ln = H.lanes(v);
    for (var i = 1; i <= c.c; i++) { var mine = st.parts.filter(function (p) { return p.own === i; }), alive = st.cons.indexOf(i) >= 0;
      if (!alive) H.lane(ln, 'Consumer ' + i, 'Dead', 'bad');
      else if (!mine.length) H.lane(ln, 'Consumer ' + i, 'No partition assigned (waiting)', 'none');
      else { var inflow = mine.length * c.r / c.p; H.lane(ln, 'Consumer ' + i, 'Handles ' + (mine.length === 1 ? 'partition ' : 'partitions ') + mine.map(function (p) { return p.id; }).join(', ') + (show ? ' · inflow ' + Math.round(inflow) + ' / capacity ' + c.k : ''), show && inflow > c.k ? 'bad' : '', show ? Math.min(1, inflow / c.k) : undefined); } }
    if (s.note) H.text(v, s.note);
  },
  // Diagram: The topic's partitions are on the left, and the consumer group is on the right. An arrow means "this consumer handles this partition".
  draw: function (P, sim, shown) {
    var c = sim.c, last = shown[shown.length - 1], s = last ? last.snap : null, st = s ? s.st : { parts: [], cons: [] }, stage = s ? s.stage : 0, rows = Math.max(c.p, c.c), rh = 42 + rows * 42;
    P.size(680, rh + 32);
    P.region('topic', 16, 16, 340, rh, 'Topic orders (' + c.p + (c.p === 1 ? ' partition)' : ' partitions)'));
    P.region('group', 430, 16, 234, rh, 'Consumer group');
    if (!s) { P.text('hint', 186, 16 + rh / 2, 'Click Run to assign the partitions', { cls: 'mut', anchor: 'middle' }); }
    st.parts.forEach(function (p, i) {
      P.box('pt' + p.id, 28, 52 + i * 42, 316, 34, { cls: !p.own ? 'bad' : stage >= 3 && p.lag ? 'bad' : 'wait', title: 'Partition ' + p.id, right: !p.own ? 'No consumer reads it' : stage >= 3 ? (p.lag ? 'Messages waiting: ' + p.lag : 'No messages waiting') : stage >= 2 ? 'Inflow: ' + Math.round(p.inflow) + '/s' : '' });
      if (p.own) P.arrow('own' + p.id, 'pt' + p.id + ':r', 'cs' + p.own + ':l', { cls: 'mut' });
    });
    for (var j = 1; j <= c.c; j++) {
      var alive = st.cons.indexOf(j) >= 0, mine = st.parts.filter(function (p) { return p.own === j; }), load = mine.length * c.r / c.p;
      P.box('cs' + j, 442, 52 + (j - 1) * 42, 210, 34, { cls: s && !alive ? 'bad' : !mine.length ? 'ghost' : stage < 2 ? 'wait' : load > c.k ? 'hot' : 'good', title: 'Consumer ' + j, right: s && !alive ? 'Dead' : !mine.length ? 'No partition' : stage >= 2 ? c.k + ' per second' : 'Handles ' + mine.length });
    }
    P.note('Arrows point to the consumer that handles each partition. A partition is handled by only one consumer, so when there are more consumers than partitions, the extra consumers (dashed) have nothing to do. A yellow consumer is falling behind because more messages arrive than it can process.');
  },
  assume: 'It is assumed that the message keys are spread evenly so that each partition receives the same amount, and partitions are simplified to be assigned to the consumers one by one in turn (the actual assignment strategy depends on the configuration). The time a rebalance takes and the delay during it are not given as numbers. The example of the dead consumer (three of five messages processed) is a fixed situation to show the difference made by the commit timing. The rule that only one consumer in a group reads a partition and the definitions of the delivery guarantees follow the official Kafka documentation.',
});

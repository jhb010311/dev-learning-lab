Lab.register({
  id: 'saga', nav: 'Saga and outbox', cat: 'Microservices', mode: 'step',
  title: 'When every service has its own database, how do you get "all succeed or all cancel"?',
  why: 'With one DB, one transaction can achieve "all succeed or all cancel", but if each service has a different DB, a single rollback cannot undo another service\'s commit. A saga gets the result consistent not by a rollback but by running, in reverse, operations that cancel the steps already finished, and an outbox stores the message to send in the same transaction as the business data, so that saving and publishing do not fall out of step.',
  use: 'In a trip booking where separate services handle flights, hotels, and payment, or in a shopping mall where the DB is split per service, functions that undo a step, such as payment cancellation and seat return, are built in advance and used. The outbox table is read periodically by a separate job and sent to a message broker such as Kafka, or a CDC tool such as Debezium reads the DB\'s change log and sends it. For services that share one DB, an ordinary transaction is enough.',
  intro: 'When ordering, payment, inventory, and shipping are split into services that each have their own database, you cannot wrap them in one database transaction. If a step fails partway through, you must run separate actions that undo the steps that already finished (the saga pattern). Also, if the server dies between saving to the database and publishing a message, the two get out of sync (the problem that the transactional outbox pattern solves).',
  terms: ['Distributed transactions and the saga pattern', 'Compensating transaction', 'Transactional outbox pattern', 'Message delivery guarantees', 'Eventual consistency'], ranks: ['msa', 'mq', 'txspring'],
  controls: [
    { id: 'part', label: 'What to show', type: 'select', value: 'saga', options: [['saga', 'Saga: when a middle step fails'], ['outbox', 'Outbox: when the server dies between saving and publishing the message']] },
    { id: 'fail', label: 'Step that fails', type: 'select', value: 'stock', options: [['none', 'No failure'], ['pay', 'Payment'], ['stock', 'Inventory deduction'], ['ship', 'Shipping request']], show: function (c) { return c.part === 'saga'; } },
    { id: 'pub', label: 'How the message is published', type: 'select', value: 'after', options: [['after', 'Publish the message after the DB commit'], ['before', 'Commit to the DB after publishing the message'], ['outbox', 'Save it together in an outbox table (publish later)']], show: function (c) { return c.part === 'outbox'; } },
  ],
  presets: [
    { t: 'Default settings', q: 'What happens in the order flow when the inventory deduction step fails?', d: 'It fails at the inventory deduction. Payment and the order are undone in reverse.', v: { part: 'saga', fail: 'stock', pub: 'after' } },
    { t: 'Failure at the last step', q: 'What if the step that fails is the shipping request?', d: 'The shipping request fails. There are three things to undo.', v: { part: 'saga', fail: 'ship', pub: 'after' } },
    { t: 'No failure', q: 'What if no step fails?', d: 'The four steps succeed one after another.', v: { part: 'saga', fail: 'none', pub: 'after' } },
    { t: 'The server dies while publishing after the commit', q: 'What if you publish the message after the DB commit and the server dies in between?', d: 'The order is saved, but the event is not sent.', v: { part: 'outbox', fail: 'stock', pub: 'after' } },
    { t: 'The server dies while committing after publishing', q: 'What if you publish the message first, commit to the DB afterward, and the server dies in between?', d: 'The event is sent, but there is no order.', v: { part: 'outbox', fail: 'stock', pub: 'before' } },
    { t: 'Using an outbox table', q: 'What if you save the order and the message together in an outbox table, publish later, and the server dies?', d: 'The order and the "message to send" are saved in one transaction.', v: { part: 'outbox', fail: 'stock', pub: 'outbox' } },
  ],
  code: function (c) {
    if (c.part === 'saga') return '// Not Java code: a list of the steps and their compensations\n// Each step is committed as a local transaction of its own service\n1. Order service       Create order (PENDING)      Compensation: cancel the order\n2. Payment service     Approve payment             Compensation: cancel the payment (refund)\n3. Inventory service   Deduct inventory            Compensation: restore the inventory\n4. Shipping service    Request shipping            (last step)\n\n// When a step fails, it publishes a "failed" event,\n// and the earlier steps receive that event and run their own compensations';
    if (c.pub === 'outbox') return '// Only the needed parts (field declarations left out; the names are examples)\n@Transactional\npublic void placeOrder(Order order) {\n    orderRepository.save(order);\n    outboxRepository.save(new OutboxMessage("OrderCreated", order));   // same transaction\n}\n\n// A separate relay runs periodically\n@Scheduled(fixedDelay = 1000)\nvoid relay() {\n    for (OutboxMessage m : outboxRepository.findUnsent()) {\n        kafka.send(m.topic(), m.payload());\n        m.markSent();                    // mark it after sending\n        outboxRepository.save(m);        // and save that mark\n    }\n}';
    return c.pub === 'after' ? '// Only the needed parts (field declarations left out; the names are examples)\n@Transactional\npublic void placeOrder(Order order) {\n    orderRepository.save(order);\n}                                        // the DB commits here\n\n// The caller: a method of another bean\npublic void order(Order order) {\n    orderService.placeOrder(order);      // already committed when it returns\n    kafka.send("orders", new OrderCreated(order));   // published after the commit\n}' : '// Only the needed parts (field declarations left out; the names are examples)\n@Transactional\npublic void placeOrder(Order order) {\n    orderRepository.save(order);\n    kafka.send("orders", new OrderCreated(order));   // published before the commit\n}                                        // the DB commits here';
  },
  label: function (c) { return c.part === 'saga' ? 'Saga · ' + { none: 'no failure', pay: 'fails at payment', stock: 'fails at inventory', ship: 'fails at shipping' }[c.fail] : 'Outbox · ' + { after: 'publish after commit', before: 'commit after publish', outbox: 'outbox table' }[c.pub]; },
  columns: ['Final state', 'Compensations run', 'Do the DB and the message match?'],
  simulate: function (c) {
    var ev = [], sum = [];
    if (c.part === 'saga') {
      var steps = [['order', 'Order service', 'Create order', 'Cancel order'], ['pay', 'Payment service', 'Approve payment', 'Refund payment'], ['stock', 'Inventory service', 'Deduct inventory', 'Restore inventory'], ['ship', 'Shipping service', 'Request shipping', '']], st = ['Waiting', 'Waiting', 'Waiting', 'Waiting'], comp = 0;
      var push = function (s, k) { ev.push({ s: s, k: k, snap: { st: st.slice() } }); };
      push('The user places an order. Each of the four services commits its work to its own database, and when it finishes, it notifies the next service with an event. There is no single transaction that wraps the whole thing.', '');
      var failed = -1;
      for (var i = 0; i < 4; i++) {
        if (steps[i][0] === c.fail) { st[i] = 'Failed'; failed = i; push('Step ' + (i + 1) + ' ' + steps[i][1] + ': ' + steps[i][2] + ' failed. The local transaction of this service is rolled back, but the earlier steps are already committed in their own databases. A database rollback cannot undo them.', 'bad'); break; }
        st[i] = 'Done (committed)'; push('Step ' + (i + 1) + ' ' + steps[i][1] + ': ' + steps[i][2] + ' completed. ' + (i < 3 ? 'It commits to its own database and publishes an event for the next step.' : 'It commits to its own database. This is the last step.'), 'good');
      }
      if (failed >= 0) {
        for (var j = failed - 1; j >= 0; j--) { st[j] = 'Compensated: ' + steps[j][3]; comp++; push('Compensation ' + comp + ': ' + steps[j][1] + ' receives the failure event and runs the compensation: ' + steps[j][3] + '. This undoes the work that was already committed with a new action that cancels it. It proceeds in the reverse of the order in which the steps ran.', ''); }
        push('All the compensations are finished. The order is in the canceled state, and the data is consistent again. But until the compensations finished, an inconsistent state such as "payment went through but the order failed" existed for a short time.', '');
        sum.push('A saga splits a long transaction into a sequence of local transactions, one per service, and when a step fails, it undoes the work with compensating transactions. Unlike a database rollback, this does not make the work "never happen". It is a new action that leaves a record of the cancellation. So intermediate states can be visible from outside (there is no isolation), and a compensation can fail too, so retries and idempotency are needed.');
      } else { push('All four steps succeeded. The order is confirmed.', 'good'); sum.push('Between the commits of the steps, there is a state like "payment is done but inventory is not yet". The state becomes consistent only after all the steps finish (eventual consistency).'); }
      return { events: ev, summary: sum, steps: steps, part: 'saga', row: [failed >= 0 ? 'Order canceled' : 'Order confirmed', String(comp), '-'] };
    }
    var S = { db: 'None', ob: 'None', mq: 'None', other: 'Waiting' }, pushO = function (s, k) { ev.push({ s: s, k: k, snap: JSON.parse(JSON.stringify(S)) }); }, okAll;
    pushO('The order service saves the order, and it must publish an "Order created" message to Kafka so that the other services can know. The database and Kafka are separate systems, so they cannot be wrapped in one transaction.', '');
    if (c.pub === 'after') {
      S.db = 'Order saved (committed)'; pushO('The order was saved to the database and committed.', 'good');
      pushO('Just as it tried to publish the message, the server died (a deployment, a failure, a network disconnection, and so on).', 'bad');
      S.other = 'Does not know about the order'; pushO('Even when the server comes back up, there is no record anywhere that there was a message that had to be sent. The order is in the database, but the payment and inventory services never find out. The order stays stuck.', 'bad');
      okAll = false; sum.push('The order is in the database, but the message was lost. Commit and publish are separate operations, so if one fails between them, the two get out of sync.');
    } else if (c.pub === 'before') {
      S.db = 'Order inserted (not committed yet)'; pushO('The order was saved. It is not committed yet.', '');
      S.mq = '"Order created" published'; S.other = 'Got the message, processing payment'; pushO('The message was published before the commit. The other services receive the message and start processing.', '');
      S.db = 'Rolled back (no order)'; pushO('Just as it tried to commit, the server died and the transaction was rolled back. The order is not in the database. But the message has already gone out and cannot be taken back. Payment proceeds for an order that does not exist.', 'bad');
      okAll = false; sum.push('The message went out, but there is no order. Swapping the order of the two only changes the direction of the problem and does not solve it.');
    } else {
      S.db = 'Order saved (committed)'; S.ob = '1 "Order created" (not sent)'; pushO('The order and the "message to send" are saved in the outbox table of the same database, and both are committed as one transaction. Because it is the same database, either both are saved or neither is.', 'good');
      pushO('It is fine if the server dies at this point. The message to send remains in the database.', '');
      S.mq = '"Order created" published'; S.other = 'Got the message, processing'; pushO('A separate message relay reads the messages that have not been sent from the outbox table and publishes them to Kafka.', 'good');
      S.ob = '1 "Order created" (sent)'; pushO('The message that was published successfully is marked as "sent". If the relay dies right after publishing and before marking, the same message is sent once more. So the receiving side must be built to get the same result when it handles a duplicate message.', '');
      okAll = true; sum.push('Because the order and the message are always saved together, nothing is lost. The message goes out a little later (eventual consistency), and in rare cases it can go out twice (at-least-once delivery).');
    }
    sum.push('This problem is called the dual write problem. The outbox pattern turns publishing a message into a database write and puts it in the same transaction. Instead of reading the outbox table periodically, you can also read the change log of the database and publish from it (change data capture, CDC) for the same purpose.');
    return { events: ev, summary: sum, part: 'outbox', row: [okAll ? 'Order and message both delivered' : 'Out of sync', '-', okAll ? 'In sync' : 'Out of sync'] };
  },
  render: function (v, sim, t, H, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : null;
    if (!s) { H.text(v, 'Click Run to start.'); return; }
    if (sim.part === 'saga') H.table(v, ['Step', 'Service (has its own database)', 'Action', 'State'], sim.steps.map(function (x, i) { var z = s.st[i]; return { cells: [String(i + 1), x[1], x[2], { v: z, cls: z === 'Failed' ? 'bad' : z.indexOf('Compensated') === 0 ? 'hot' : z === 'Waiting' ? '' : 'good' }] }; }), 'The four steps of order processing');
    else { var ln = H.lanes(v); H.lane(ln, 'Order database', 'orders table: ' + s.db, s.db.indexOf('Rolled back') >= 0 ? 'bad' : s.db === 'None' ? 'none' : 'good'); if (sim.c.pub === 'outbox') H.lane(ln, 'Order database', 'outbox table: ' + s.ob, s.ob === 'None' ? 'none' : 'wait'); H.lane(ln, 'Kafka', s.mq, s.mq === 'None' ? 'none' : 'good'); H.lane(ln, 'Other services', s.other, s.other.indexOf('Does not know') >= 0 ? 'bad' : s.other === 'Waiting' ? 'none' : ''); }
  },
  // Diagram: Four steps, where each service has its own database. An arrow going forward is the event that goes to the next step, and an arrow going backward is a compensation (an undo).
  draw: function (P, sim, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : null;
    P.size(680, 300);
    if (sim.part === 'saga') {
      var st = s ? s.st : ['Waiting', 'Waiting', 'Waiting', 'Waiting'];
      sim.steps.forEach(function (x, i) {
        var z = st[i], comp = z.indexOf('Compensated') === 0, px = 16 + i * 166;
        P.box('sv' + i, px, 44, 150, 78, { cls: z === 'Failed' ? 'bad' : comp ? 'hot' : z === 'Waiting' ? 'ghost' : 'good', title: x[1], sub: [x[2], comp ? 'Undone:' : z, comp ? x[3] : ' '] });
        P.box('db' + i, px + 20, 150, 110, 30, { cls: 'plain', sub: x[1].replace(' service', '') + ' DB', center: true });
        P.arrow('own' + i, 'sv' + i + ':b', 'db' + i + ':t', { cls: 'mut' });
        if (i && st[i] !== 'Waiting') P.arrow('fw' + i, 'sv' + (i - 1) + ':r', 'sv' + i + ':l', { cls: st[i] === 'Failed' ? 'bad' : 'good' });
        if (i < 3 && comp) P.arrow('cp' + i, 'sv' + (i + 1) + ':t:0.3', 'sv' + i + ':t:0.7', { cls: 'hot', label: 'Undo' });
      });
      P.text('t', 340, 226, 'The databases are separate, so one ROLLBACK cannot undo everything', { anchor: 'middle', cls: 'mut' });
      P.note('Green is a step that was already committed, red is the step that failed, and yellow is a step that was undone by a compensation.');
    } else {
      var o = s || { db: 'None', ob: 'None', mq: 'None', other: 'Waiting' }, box = sim.c.pub === 'outbox';
      P.region('dbr', 16, 30, 300, 190, 'Database of the order service (one transaction)');
      P.box('ord', 28, 66, 276, 56, { cls: o.db.indexOf('Rolled back') >= 0 ? 'bad' : o.db === 'None' ? 'ghost' : 'good', title: 'orders table', sub: o.db });
      if (box) P.box('ob', 28, 140, 276, 56, { cls: o.ob === 'None' ? 'ghost' : 'wait', title: 'outbox table', sub: o.ob });
      P.box('mq', 372, 44, 292, 56, { cls: o.mq === 'None' ? 'ghost' : 'good', title: 'Kafka', sub: o.mq });
      P.box('oth', 372, 150, 292, 56, { cls: o.other.indexOf('Does not know') >= 0 ? 'bad' : o.other === 'Waiting' ? 'ghost' : 'good', title: 'Other services', sub: o.other });
      if (o.mq !== 'None') { P.arrow('pub', (box ? 'ob' : 'ord') + ':r', 'mq:l', { cls: 'good', label: 'Publish' }); P.arrow('dl', 'mq:b', 'oth:t', { cls: 'good' }); }
      P.note('Saving to the database and publishing a message happen in separate systems, so they cannot be tied together at once. The outbox pattern writes the "message to send" to the database in the same transaction as the order, and reads and publishes it later.');
    }
  },
  assume: 'The saga is drawn in the style where the services exchange events to move forward (choreography). There is also a style where a central orchestrator tells each step what to do (orchestration), and the principle of the compensations is the same. It is simplified so that a compensation always succeeds. In the outbox example, the moment when the server dies is fixed at the most problematic point. The definitions of the patterns follow the explanations in the microservices pattern literature (microservices.io).',
});

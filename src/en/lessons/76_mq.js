Lab.register({
  id: 'mq', nav: 'Message queue basics', cat: 'Message queues', mode: 'step',
  title: 'Leave a note instead of calling directly',
  why: 'If one server calls another server directly and waits until it finishes, the response is delayed as much as the other side is slow, and if the other side is stopped, the request fails too. A message queue puts a place between the two servers where messages are stored, so the sending side responds without waiting for the result, and the receiving side, after stopping and coming back, processes the backed-up messages starting with the oldest.',
  use: 'It is used to hand off follow-up work that the response does not immediately need, such as sending a confirmation email after an order or creating a thumbnail of an uploaded image, and tools such as RabbitMQ, Kafka, and Amazon SQS do this job. It is also used when several services must each receive and process one event. For work where you must receive the result before going to the next step, such as payment approval, a direct call is kept.',
  intro: 'When an order comes in, you must send a confirmation email. The order server can call the email server directly and wait until it finishes, or it can put a message that says "send the email" in a queue and respond right away.',
  terms: ['Message queue', 'Synchronous and asynchronous', 'Pub/Sub', 'Message delivery guarantees', 'Eventual consistency'], ranks: ['mq', 'msa'],
  controls: [
    { id: 'how', label: 'How the work is handed to the email server', type: 'select', value: 'direct', options: [['direct', 'Call it directly and wait until it finishes'], ['queue', 'Put it in a message queue and respond right away']] },
    { id: 'n', label: 'Orders arriving in a row', type: 'range', min: 1, max: 5, step: 1, value: 3, fmt: function (v) { return v + (v === 1 ? ' order' : ' orders'); } },
    { id: 'work', label: 'Time to send one email', type: 'select', value: '1000', options: [['200', '0.2s'], ['1000', '1s'], ['3000', '3s']] },
    { id: 'state', label: 'Email server state', type: 'select', value: 'ok', options: [['ok', 'Normal'], ['down', 'Down, then recovered later']] },
  ],
  presets: [
    { t: 'Default settings', q: 'What happens to 3 orders when you call an email server that takes 1s per email directly and wait until it finishes?', d: 'Direct call. The order response is delayed by the time it takes to send the email.', v: { how: 'direct', n: 3, work: '1000', state: 'ok' } },
    { t: 'With a queue', q: 'What if you put the work in a message queue and respond right away?', d: 'The order responds right away, and the emails go out one after another in the background.', v: { how: 'queue', n: 3, work: '1000', state: 'ok' } },
    { t: 'Direct call while the email server is down', q: 'What if you keep the direct call and the email server is Down, then recovered later?', d: 'Because of the email, even the order fails.', v: { how: 'direct', n: 3, work: '1000', state: 'down' } },
    { t: 'Queue while the email server is down', q: 'What if you put the work in a message queue and respond right away, and the email server is Down, then recovered later?', d: 'The order succeeds, and the messages pile up and are handled after the recovery.', v: { how: 'queue', n: 3, work: '1000', state: 'down' } },
    { t: 'When email is very slow', q: 'What if you use a message queue, 5 orders arrive in a row, and one email takes 3s to send?', d: 'A 3s job. Compare the order response time of the two approaches.', v: { how: 'queue', n: 5, work: '3000', state: 'ok' } },
  ],
  code: function (c) {
    var H = '// Only the methods are shown (class declarations, imports, and the example Order, OrderDto, orderService, etc. omitted)\n';
    if (c.how === 'direct') return H + '@PostMapping("/orders")\nOrderDto order(@RequestBody OrderRequest req) {\n    Order order = orderService.save(req);          // 0.05s\n    mailClient.sendConfirm(order);                 // calls the email server directly and waits\n    return OrderDto.of(order);                     // responds only after the email is done\n}';
    return H + '// rabbitTemplate: the RabbitTemplate that Spring AMQP provides (a bean that Spring Boot creates)\n@PostMapping("/orders")\nOrderDto order(@RequestBody OrderRequest req) {\n    Order order = orderService.save(req);          // 0.05s\n    // only puts the message in the order-created queue, does not wait\n    rabbitTemplate.convertAndSend("order-created", order.getId());\n    return OrderDto.of(order);                     // responds right away\n}\n\n// On the email server side: takes messages from the queue one at a time and handles them\n@RabbitListener(queues = "order-created")\nvoid onOrder(long orderId) {\n    mailSender.sendConfirm(orderId);\n}';
  },
  label: function (c) { return (c.how === 'direct' ? 'Direct call' : 'Message queue') + ' · ' + c.n + (c.n === 1 ? ' order' : ' orders') + ' · email ' + (+c.work / 1000) + 's · ' + (c.state === 'ok' ? 'normal' : 'email server down'); },
  columns: ['Orders succeeded', 'Response time of one order', 'Emails sent', 'Most messages in the queue'],
  simulate: function (c) {
    var n = +c.n, work = +c.work / 1000, save = 0.05, direct = c.how === 'direct', down = c.state === 'down', ev = [], sum = [];
    var S = { orders: [], q: [], mail: down ? 'Down' : 'Waiting', sent: 0 }, okCount = 0, maxQ = 0, resp, timeout = 3;
    function push(s, k) { ev.push({ s: s, k: k, snap: JSON.parse(JSON.stringify(S)) }); }
    function f(x) { return (Math.round(x * 100) / 100) + 's'; }
    push(n + (n === 1 ? ' order arrives.' : ' orders arrive one after another.') + ' Saving an order to the database takes 0.05s, and sending one confirmation email takes ' + f(work) + '.' + (down ? ' The email server is down right now.' : ''), '');
    var i;
    if (direct) {
      for (i = 1; i <= n; i++) {
        if (down) { resp = save + timeout; S.orders.push(['Order ' + i, f(resp), 'Failed (500)', 'The email server did not respond']); push('Order ' + i + ': After saving, the order server calls the email server but gets no response. It waits 3s until a timeout occurs, the exception propagates up, and the order request itself fails. Because of the email, a side feature, the order request ended in a failure response (an order that was already saved may remain).', 'bad'); }
        else { resp = save + work; S.sent++; okCount++; S.mail = 'Email for order ' + i + ' sent'; S.orders.push(['Order ' + i, f(resp), 'Success', 'Sent the email before responding']); push('Order ' + i + ': After saving (0.05s), the order server calls the email server and waits until it finishes (' + f(work) + '). The user gets a response only after ' + f(resp) + '.', work >= 1 ? 'bad' : ''); }
      }
    } else {
      resp = save + 0.01;
      for (i = 1; i <= n; i++) { S.q.push('Order ' + i); maxQ = Math.max(maxQ, S.q.length); okCount++; S.orders.push(['Order ' + i, f(resp), 'Success', 'Email not sent yet']); push('Order ' + i + ': After saving, the order server puts an "Order ' + i + ' confirmation email" message in the queue and responds right away (' + f(resp) + '). The order server does not need to know what state the email server is in.', 'good'); }
      if (down) { push('The email server is down, so nothing takes messages out of the queue. They stay in the queue as they are (' + n + (n === 1 ? ' message' : ' messages') + '). All the orders were already answered as successful.', ''); S.mail = 'Recovered'; push('The email server has recovered. It starts taking the messages that piled up in the queue, from the front.', ''); }
      for (i = 1; i <= n; i++) { S.q.shift(); S.sent++; S.mail = 'Email for order ' + i + ' sent'; S.orders[i - 1] = ['Order ' + i, f(resp), 'Success', 'Email sent (after the response)']; push('The email server takes the "Order ' + i + '" message from the queue and sends the email (' + f(work) + '). It handles them one at a time, at its own pace.', ''); }
    }
    if (direct && down) sum.push('With a direct call, a failure in the service being called spreads to the caller. When the email server went down, order requests failed too.');
    if (direct && !down) sum.push('With a direct call, the other side\'s processing time is added to your response time as it is. If email gets slow, orders get slow too. In return, when the response arrives, you can be sure the email is already sent.');
    if (!direct) sum.push('With a queue in between, the order server is responsible only for putting the message in. Even if the email server is slow or down, the response time and the success of the order stay the same. The queue works as a buffer between the two.');
    if (!direct) sum.push('There is a cost too. When you get the order response, the email may not have gone out yet (eventual consistency, where the states match after some time). Also, a message can be delivered twice or fail partway through processing, so the receiving side must be built so that receiving the same message twice causes no problem. This continues in the "Retries and idempotency" and "Kafka partitions and consumers" labs.');
    sum.push('A queue suits work that does not need a result in the response and can be a little late. Email, notifications, and aggregating statistics are typical examples. Work where you need the result before you can go on, such as payment approval, is done with a direct call.');
    return { events: ev, summary: sum, row: [okCount + ' / ' + n, f(resp), String(S.sent), direct ? 'No queue' : String(maxQ)] };
  },
  render: function (v, sim, t, H, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : { orders: [], q: [], mail: '', sent: 0 };
    H.counters(v, [[s.sent, 'Emails sent']]);
  },
  // Diagram: The order server and the email server. A direct call ties them together with an arrow, and with a queue, messages pile up between them.
  draw: function (P, sim, shown) {
    var c = sim.c, direct = c.how === 'direct', last = shown[shown.length - 1], s = last ? last.snap : { orders: [], q: [], mail: '', sent: 0 }, dead = s.mail === 'Down';
    P.size(680, 232 + Math.max(1, s.orders.length) * 30 + 16);
    P.box('os', 16, 60, 180, 60, { cls: 'wait', title: 'Order server', sub: 'Saves and responds' });
    P.box('ms', 484, 60, 180, 60, { cls: dead ? 'bad' : s.mail ? 'good' : 'plain', title: 'Email server', sub: s.mail || 'Waiting' });
    if (direct) P.arrow('call', 'os:r', 'ms:l', { cls: dead ? 'bad' : s.orders.length ? 'hot' : 'mut', label: dead ? 'No response → the order fails too' : 'Direct call, waits until done' });
    else {
      P.region('qu', 240, 16, 200, 190, 'Message queue');
      s.q.forEach(function (x, j) { P.box('m_' + x, 252, 50 + j * 30, 176, 26, { cls: 'wait', sub: x + ' email request', center: true }); });
      if (!s.q.length) P.text('qe', 340, 116, 'Empty', { cls: 'mut', anchor: 'middle' });
      P.arrow('in', 'os:r', 'qu:l', { cls: 'good', label: 'Put in' }); P.arrow('out', 'qu:r', 'ms:l', { cls: dead ? 'bad dash' : 'mut', label: dead ? 'Nothing takes them out' : 'Taken out' });
    }
    s.orders.forEach(function (r, i) { P.box('o' + i, 16, 226 + i * 30, 648, 26, { cls: r[2] === 'Success' ? 'good' : 'bad', title: r[0] + ' · response in ' + r[1], right: r[2] + ' · ' + r[3] }); });
    if (!s.orders.length) P.text('none', 340, 244, 'No orders have arrived yet', { cls: 'mut', anchor: 'middle' });
    P.note(direct ? 'The two servers are tied together by one arrow.' : 'The queue in the middle works as a buffer.');
  },
  assume: 'This is a model to explain the concept, and it is not the result of running a real message queue. The time values (0.05s to save, 0.01s to put in the queue, 3s timeout) are examples. Even with a direct call, you can add a timeout and exception handling to keep the order from failing, and the cases where the queue itself goes down, message loss, duplicate delivery, and ordering problems are not covered here. rabbitTemplate.convertAndSend (Spring AMQP\'s RabbitTemplate) and @RabbitListener in the code are examples for when you use RabbitMQ, and they were not run. These two places were verified only to the extent that they compile together with a stand-in that copies just the official Spring AMQP signatures (verify/spring/cmp_mq.js).',
});

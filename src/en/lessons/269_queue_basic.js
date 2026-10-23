Lab.register({
  id: 'queue_basic', nav: 'Message queues', cat: 'Fundamentals', mode: 'step', basic: true, deep: ['mq', 'kafka', 'saga'],
  title: 'What is a message queue, and how is it different from calling a server directly?',
  why: 'If one server gives work directly to another server, it has to wait until the other finishes, and if the other is down, the work fails and is not processed unless someone sends it again. A message queue holds the work to be done as messages between the two servers, so that the sending side can hand off work regardless of whether the receiving side is running now or how busy it is.',
  use: 'It is used to hand off work that takes time but need not be answered right away, such as a notification email or text message sent after an order is finished, or the conversion of an uploaded video. In real services, a message broker such as RabbitMQ or Kafka runs the queue. In Spring, with RabbitMQ you send with RabbitTemplate and receive with @RabbitListener, and with Kafka you use KafkaTemplate and @KafkaListener. Sometimes several servers that do the work are run and take messages from the same queue, dividing them among themselves. For work that can go on to the next step only after its result is received right away, such as payment approval, the request is sent directly instead of through a queue.',
  intro: 'A message queue is a line, placed between the server that asks for work and the server that does the work, in which the work to be done is written down. In real services, a message broker such as RabbitMQ or Kafka (a server that receives messages, holds them, and passes them on) runs the queue, and in Spring you use a RabbitMQ queue with RabbitTemplate and @RabbitListener, which Spring AMQP provides. The code on the screen is the code of the two servers. QueueConfig in the order server creates a queue named order-created in RabbitMQ (Queue is a class that Spring AMQP provides). The order method of OrderService, an example class we made, puts the order number in the queue order-created with rabbitTemplate.convertAndSend each time an order comes in, and returns right away. The short piece of data put in the queue like this is called a message, and order is the side that sends messages. In Notifier, an example class we made for the notification server, the handle method that has @RabbitListener(queues = "order-created") is called by Spring when a message arrives in the queue (the side that receives messages). In this lab you remove the queue so that the order server sends the request straight to the notification server with RestClient, which Spring provides (the notification server then receives it in a @PostMapping("/notify") method), or you keep the notification server stopped while the 3 orders are sent and start it later, and you see the result the order server gets and how the notifications are handled. RabbitMQ is not installed on the PC used to write this lab, so the runs that use the queue were done with a small model for running that plays the role of RabbitMQ. The direct calls were really run on Spring Boot.',
  terms: ['Message queue', 'Message broker', 'RabbitTemplate', '@RabbitListener', 'Producers and consumers', 'ResourceAccessException'],
  controls: [
    { id: 'via', label: 'How the order server asks for a notification', type: 'select', value: 'queue', options: [['queue', 'Put it in the queue order-created with rabbitTemplate.convertAndSend'], ['direct', 'Remove the queue and send straight to the notification server with RestClient']] },
    { id: 'consumer', label: 'State of the notification server', type: 'select', value: 'up', options: [['up', 'Running'], ['late', 'Stopped while the 3 orders are sent, then starts later']] },
  ],
  // q is the question shown on the question-style screen. t and d are the name and the description used in the text-only reading
  presets: [
    { t: 'Default settings', q: 'What does a message queue look like, and what happens to the notifications for 3 orders when a RabbitMQ queue sits between the order server and the notification server?', d: 'convertAndSend in the order server puts the message in the queue and returns right away. After that, the @RabbitListener method of the notification server receives the messages and handles them in the order they were put in.', v: { via: 'queue', consumer: 'up' } },
    { t: 'Calling directly without a queue', q: 'What if you remove the queue and the order server sends requests straight to the notification server with RestClient?', d: 'The order server waits until the notification server has finished handling the request, and only then gets the result.', v: { via: 'direct', consumer: 'up' } },
    { t: 'Calling directly while the notification server is stopped', q: 'What if you send directly with RestClient and the notification server is stopped while the 3 orders are sent and starts later?', d: 'All 3 requests fail with ResourceAccessException, and even after the notification server starts there is no notification to handle.', v: { via: 'direct', consumer: 'late' } },
    { t: 'Using the queue while the notification server is stopped', q: 'What if you put messages in the queue with convertAndSend and the notification server is stopped while the 3 orders are sent and starts later?', d: 'The 3 orders succeed, and the messages stay in the queue and are handled after the notification server starts.', v: { via: 'queue', consumer: 'late' } },
  ],
  msg: function (i) { return 'Notify order ' + i; },
  code: function (c) {
    var q = c.via === 'queue', L = [];
    L.push('// Code of the order server (import lines and the main class omitted)');
    if (q) L.push(
      '// Creates the queue: Queue is a class that Spring AMQP provides',
      '@Configuration',
      'class QueueConfig {',
      '    @Bean',
      '    Queue orderCreatedQueue() {',
      '        // Creates a queue named order-created in RabbitMQ',
      '        return new Queue("order-created");',
      '    }',
      '}');
    L.push('',
      '// An order service we made as an example',
      '@Service',
      'class OrderService {');
    if (q) L.push(
      '    // The tool that sends messages: RabbitTemplate, which Spring AMQP provides',
      '    @Autowired',
      '    RabbitTemplate rabbitTemplate;');
    else L.push(
      '    // The tool that sends requests: RestClient, which Spring provides',
      '    RestClient restClient = RestClient.create();');
    L.push('',
      '    // Called each time an order comes in (this lab sends orders 1, 2, and 3 in turn)',
      '    void order(int no) {');
    if (q) L.push(
      '        // Puts the order number in the queue order-created as a message and returns right away',
      '        rabbitTemplate.convertAndSend("order-created", no);');
    else L.push(
      '        // Sends the order number to the notification server and waits for the reply (8081 is an example number)',
      '        restClient.post().uri("http://localhost:8081/notify")',
      '                .body(no).retrieve().toBodilessEntity();');
    L.push('    }', '}', '',
      '// Code of the notification server (import lines and the main class omitted)');
    if (c.consumer === 'late') L.push('// The notification server is stopped while the 3 orders are sent, then starts later');
    L.push('// A class we made as an example for sending notifications');
    L.push(q ? '@Component' : '@RestController');
    L.push('class Notifier {');
    if (q) L.push(
      '    // Receiving: when a message arrives in the queue order-created, Spring calls this method',
      '    @RabbitListener(queues = "order-created")',
      '    void handle(int no) {');
    else L.push(
      '    // Receiving: when a POST /notify request arrives, Spring calls this method',
      '    @PostMapping("/notify")',
      '    void handle(@RequestBody int no) {');
    L.push(
      '        // Sends the notification (instead of sending an email or text message, prints to the screen)',
      '        System.out.println("Notification sent for order " + no);',
      '    }',
      '}');
    return L.join('\n');
  },
  label: function (c) { return (c.via === 'queue' ? 'Message put in the queue' : 'Request sent straight to the notification server') + ' · ' + (c.consumer === 'up' ? 'Notification server running' : 'Notification server starts later'); },
  columns: ['Result the order server got', 'Handled notifications', 'Messages in the queue when the notification server starts'],
  simulate: function (c) {
    var ev = [], sum = [], q = c.via === 'queue', late = c.consumer === 'late', N = 3, i;
    var st = { os: 'plain', ost: ['Waiting'], ns: late ? 'ghost' : 'plain', nst: late ? ['Stopped'] : ['Running'], qn: [], cur: '', a1: '', a2: '', a3: '', res: [], done: [] };
    function push(s, k) { ev.push({ s: s, k: k, snap: JSON.parse(JSON.stringify(st)) }); }
    function mq(n) { return 'Order number ' + n; }
    // (The Korean version picks a particle here, so no helper is needed in English)
    var devs = [];
    if (!q) devs.push('QueueConfig is gone, OrderService sends straight to the notification server with RestClient instead of RabbitTemplate, and Notifier receives with @PostMapping("/notify") instead of @RabbitListener');
    if (late) devs.push('a comment line saying that the notification server is stopped and starts later was added');
    var note = devs.length ? ' What differs in the code from the default settings: ' + devs.join('; ') + '.' : '';
    // Step 1: the start
    if (q) {
      push('The order server receives the ' + N + ' orders one after another. Each time an order comes in, the order method of OrderService is called, and order sends the work for the notification server with rabbitTemplate.convertAndSend("order-created", no). What it sends is one order number, and this short piece of data is called a message. The message goes not to the notification server but to the RabbitMQ queue order-created. The queue keeps messages in the order they were put in, and in the notification server the handle method that has @RabbitListener(queues = "order-created") receives the messages of the queue one at a time. It is not our code but Spring that calls handle. ' + (late ? 'The notification server is stopped now, and it starts after all ' + N + ' orders have been sent. The queue order-created was created by QueueConfig in the order server, so it exists even while the notification server is stopped.' : 'The notification server is running now, and the queue was empty when it started. In this run, handling one notification was made to take 0.3s.') + note, '');
    } else {
      push('The order server receives the ' + N + ' orders one after another. This code has no queue. Each time an order comes in, the order method sends a POST request straight to the /notify address of the notification server with RestClient, and the body of the request is the order number. In the notification server, the handle method that has @PostMapping("/notify") receives that request. ' + (late ? 'The notification server is stopped now, and it starts after all ' + N + ' orders have been sent.' : 'The notification server is running now. In this run, handling one notification was made to take 0.3s.') + ' The next order comes in after the order method for the previous order has finished.' + note, '');
    }
    // Sending the orders
    for (i = 1; i <= N; i++) {
      var m = mq(i), al = this.msg(i), head = i === 1;
      if (q) {
        st.qn.push(m); st.res.push(['Order ' + i, 'Success']); st.os = 'wait'; st.ost = ['Order ' + i + ' result', 'Success']; st.a1 = 'good'; st.a2 = 'good';
        if (!late && head) { st.cur = m; st.ns = 'hot'; st.nst = ['"' + al + '"', 'Handling']; st.a3 = 'hot'; } else st.a3 = '';
        push(head
          ? 'order(1) sends order number 1 to the queue order-created with convertAndSend, and the queue keeps this message at the tail. convertAndSend returns right after sending the message, so order finishes without waiting for the notification to be handled, and the result of this order is success. This result means that the message was sent to the queue. It does not mean that the notification was handled.' + (late ? ' Even though the notification server is stopped, it does not matter, because the message went to the queue. The number of messages piled up in the queue is 1.' : ' The queue hands this message at once to handle in the notification server, which was waiting, and handle starts handling "' + al + '". A message is not removed from the queue until the confirmation that handling is done arrives, so the number of messages in the queue is 1.')
          : 'order(' + i + ') sends order number ' + i + ' to the queue and finishes right away, and it gets the result of this order (success). The number of messages in the queue is ' + i + '.', 'good');
      } else if (late) {
        st.res.push(['Order ' + i, 'Failure']); st.os = 'bad'; st.ost = ['Order ' + i + ' result', 'Failure']; st.a1 = 'bad'; st.a2 = '';
        push(head
          ? 'order(1) sends order number 1 straight to the notification server with RestClient. The notification server is stopped, so no program is waiting at that number (the port) and the connection is refused, and RestClient throws ResourceAccessException. order ends with this exception, and the result of this order is failure. The code on the screen has no line that sends again, and there is no place anywhere that keeps this request.'
          : 'order(' + i + ') also sends straight to the notification server, but the connection is refused again and it ends with ResourceAccessException, and the result is failure. No place keeps it.', 'bad');
      } else {
        st.os = 'hot'; st.ost = ['Order ' + i, 'Awaiting reply']; st.ns = 'hot'; st.nst = ['"' + al + '"', 'Handling']; st.a1 = 'hot'; st.a2 = '';
        push(head
          ? 'order(1) sends order number 1 straight to the notification server with RestClient and waits for the reply of the notification server. In the notification server, Spring calls handle, and handle starts handling "' + al + '".'
          : 'order(' + i + ') sends order number ' + i + ' straight and waits for the reply. The handle of the notification server starts handling it.', '');
        st.done.push(al); st.res.push(['Order ' + i, 'Success']); st.os = 'wait'; st.ost = ['Order ' + i + ' result', 'Success']; st.ns = 'plain'; st.nst = ['Running', 'Handled: ' + i]; st.a1 = ''; st.a2 = 'good';
        push(head
          ? 'handle finishes handling "' + al + '" (it took 0.3s), and the notification server sends its reply. The call of RestClient ends only after it gets this reply, and only then does order end and get the result of this order (success). Only after that does it move on to the next order.'
          : 'Only after handle finishes handling "' + al + '" and replies does order end and get the result (success). It waited 0.3s this time too.', 'good');
      }
    }
    // After all the orders are sent
    if (q) {
      st.a1 = ''; st.a2 = ''; st.a3 = ''; st.os = 'good'; st.ost = [N + ' orders', 'All succeeded'];
      if (late) {
        push('The order server has got the results of all ' + N + ' orders. The notification server is stopped, so no one receives messages from the queue, and the ' + N + ' messages (order numbers 1, 2, and 3) stay in the queue as they are. No notification has been handled yet.', '');
        st.cur = st.qn[0]; st.ns = 'hot'; st.nst = ['"' + this.msg(1) + '"', 'Handling']; st.a3 = 'hot';
        push('The notification server starts. When it started, ' + N + ' messages were piled up in the queue. @RabbitListener starts receiving from the queue order-created, and the queue hands over messages to handle from the front, starting with order number 1. handle starts handling "' + this.msg(1) + '".', '');
      } else {
        push('The order server has got the results of all ' + N + ' orders. At that moment, not one notification has been handled yet. "' + this.msg(1) + '" is being handled by handle (0.3s), and order numbers 2 and 3 are waiting for their turn in the queue. The order server cannot know when these notifications will finish.', '');
      }
      for (i = 1; i <= N; i++) {
        var aa = this.msg(i);
        st.qn.shift(); st.done.push(aa); st.cur = st.qn.length ? st.qn[0] : '';
        st.ns = i === N ? 'good' : 'hot'; st.nst = i === N ? [N + ' notifications', 'All handled'] : ['"' + this.msg(i + 1) + '"', 'Handling']; st.a3 = i === N ? '' : 'hot';
        push(i === 1
          ? 'handle finishes handling "' + aa + '" (0.3s). When handle ends without an exception, Spring tells RabbitMQ that handling is done (the confirmation), and only then is the message for order number 1 removed from the queue. The queue hands over the next message, order number 2, and ' + st.qn.length + ' are left in the queue. Messages come out in the order they were put in.'
          : 'handle finishes handling "' + aa + '", and the message for order number ' + i + ' is removed from the queue.' + (i === N ? ' The queue is empty.' : ' ' + st.qn.length + ' are left in the queue.') + (i === N ? ' All ' + N + ' notifications have been handled. The order in which they were handled is order 1, order 2, and order 3, the same as the order they were put in.' : ' The queue hands over the next message, the one for order number ' + (i + 1) + '.'), i === N ? 'good' : '');
      }
    } else if (late) {
      st.os = 'bad'; st.ost = [N + ' orders', 'All failed']; st.a1 = '';
      push('The order server got the result that all ' + N + ' requests failed. The requests sent while the notification server was stopped are kept nowhere.', 'bad');
      st.ns = 'plain'; st.nst = ['Started', 'Nothing to do'];
      push('The notification server starts. But there is not one notification to handle. The earlier ' + N + ' requests were lost because no one received them, and in this run, while watching for 1s after the server started, handle was never called. This is because the order server does not send them again.', 'bad');
    } else {
      st.os = 'good'; st.ost = [N + ' orders', 'All succeeded']; st.ns = 'good'; st.nst = [N + ' notifications', 'All handled']; st.a2 = '';
      push('The order server has got the results of all ' + N + ' orders. The notification server handled ' + N + ' notifications. The order server waited 0.3s each time a notification finished.', 'good');
    }
    // Summary
    if (q && !late) {
      sum.push('A message queue is a line, placed between the order server and the notification server, in which the work to be done is written down. In the code, rabbitTemplate.convertAndSend("order-created", no) on the sending side and @RabbitListener(queues = "order-created") on the receiving side are connected by the same queue name, and the code of the order server has no address of the notification server. The order server only sent messages to the queue and got the result at once, and the notification server took them in the order they were put in, at its own speed, and handled them.');
      sum.push('In exchange, when the order server got the result, not one notification had been handled yet. Success only means that the message was sent to the queue, so the order server cannot know right away when the notification will finish.');
    } else if (q) {
      sum.push('If you put the messages in the queue, all ' + N + ' orders succeed even while the notification server is stopped, and the ' + N + ' messages stay in the queue and are handled in the order they were put in after the notification server starts. In the same situation, the requests sent directly all ' + N + ' failed (the earlier question).');
      sum.push('What kept the messages while the notification server was stopped was the queue of RabbitMQ. The queue used in place of RabbitMQ when this lab was run is a small server written in Node.js. All it does is keep messages in the order they were put in, hand them over from the front, and remove a message when it gets the confirmation that handling is done. That is about as small as you can make what a queue does, and a broker such as RabbitMQ adds to this things such as keeping messages on disk and dividing them among several receivers.');
    } else if (!late) {
      sum.push('If you call the notification server directly with RestClient without a queue, the order server waits until the notification server finishes handling the request, and only then gets the result. All ' + N + ' notifications were handled.');
      sum.push('You can know from the result right away that the notification has finished, but if the notification server is slow, the order server waits just as long. When you put messages in the queue, there was no such waiting (the earlier question).');
    } else {
      sum.push('If you send directly while the notification server is stopped, all ' + N + ' requests fail with ResourceAccessException, and even if the notification server starts later, not one notification is handled.');
      sum.push('If the receiving side is not there, a request sent directly is kept nowhere. The code on the screen does not send a failed request again, so those notifications were lost.');
    }
    var qNote = !q ? 'No queue' : late ? N + ' (order numbers 1, 2, and 3)' : '0 (the notification server was already running)';
    return { events: ev, summary: sum, row: [q ? 'All ' + N + ' succeeded (got the result at once, without waiting for the notifications to be handled)' : late ? 'All ' + N + ' failed (ResourceAccessException: could not connect to the notification server)' : 'All ' + N + ' succeeded (got the result after the notification server finished handling)', (!q && late) ? '0 (no notification was handled even after the notification server started)' : N + ' notifications: order 1 → order 2 → order 3', qNote] };
  },
  render: function (v, sim, t, H, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : null, q = sim.c.via === 'queue';
    if (!s) { H.text(v, 'Click Run to start from the order server receiving orders.'); return; }
    H.table(v, ['Order', 'Result the order server got'], s.res.length ? s.res.map(function (r) { return { cls: '', cells: [r[0], { v: r[1], cls: r[1] === 'Success' ? 'good' : 'bad' }] }; }) : [{ cls: 'gone', cells: ['None yet', ''] }], 'Result the order server got');
    H.table(v, ['Handling order', 'Notification the notification server handled'], s.done.length ? s.done.map(function (m, j) { return { cls: '', cells: ['#' + (j + 1), m] }; }) : [{ cls: 'gone', cells: ['None yet', ''] }], 'Handled notifications');
    if (q) H.counters(v, [[s.qn.length, 'Messages in the queue']]);
  },
  // Diagram: on the left the order server, in the middle the RabbitMQ queue order-created (the box where messages pile up), on the right the notification server. With a queue, the path is order server -> queue -> notification server; without it, order server -> notification server directly.
  // A message being handled stays in the first slot of the queue as "Handling" until the confirmation that handling is done arrives, and disappears when the confirmation is received. A stopped notification server is dotted and a failure is red. Below are three result boxes.
  draw: function (P, sim, shown) {
    var c = sim.c, q = c.via === 'queue', last = shown[shown.length - 1], s = last ? last.snap : null, late = c.consumer === 'late';
    function ac(x) { return x === 'plain' ? '' : x; }
    P.size(680, 336);
    P.box('os', 14, 82, 140, 84, { cls: s ? s.os : 'plain', title: 'Order server', sub: s ? s.ost : ['Waiting'] });
    P.region('qu', 254, 16, 172, 214, q ? 'Queue order-created' : 'Queue (removed)');
    if (q) {
      var qn = s ? s.qn : [];
      qn.forEach(function (m, j) { var busy = s && j === 0 && s.cur === m; P.box('m_' + m, 264, 52 + j * 44, 152, 36, { cls: busy ? 'hot' : 'wait', sub: busy ? m.replace('Order ', '') + ' · Handling' : m, center: true }); });
      if (!qn.length) P.text('qe', 340, 128, 'Empty', { cls: 'mut', anchor: 'middle' });
    }
    P.box('ns', 526, 82, 140, 84, { cls: s ? s.ns : (late ? 'ghost' : 'plain'), title: 'Notification', sub: ['server'].concat(s ? s.nst : (late ? ['Stopped'] : ['Running'])) });
    if (q) {
      if (s && s.a1) P.arrow('a1', [154, 108], [254, 108], { cls: ac(s.a1) });
      if (s && s.a2) P.arrow('a2', [254, 140], [154, 140], { cls: ac(s.a2) });
      if (s && s.a3) P.arrow('a3', [426, 124], [526, 124], { cls: ac(s.a3) });
    } else {
      if (s && s.a1) P.arrow('a1', [154, 104], [526, 104], { cls: ac(s.a1), label: 'Direct request' });
      if (s && s.a2) P.arrow('a2', [526, 146], [154, 146], { cls: ac(s.a2), label: 'Reply: handled' });
    }
    var okc = s ? s.res.filter(function (r) { return r[1] === 'Success'; }).length : 0, bad = s ? s.res.length - okc : 0;
    P.box('n1', 14, 246, 322, 36, { cls: s && s.res.length ? (bad ? 'bad' : 'good') : 'ghost', title: 'Result the order server got', right: s && s.res.length ? (bad ? bad + ' failed' : okc + ' succeeded') : 'None yet' });
    P.box('n2', 344, 246, 322, 36, { cls: s && s.done.length ? 'good' : 'ghost', title: 'Handled notifications', right: String(s ? s.done.length : 0) });
    P.box('n3', 14, 290, 652, 36, { cls: q && s && s.qn.length ? 'wait' : 'ghost', title: 'Messages in the queue', right: q ? String(s ? s.qn.length : 0) : 'No queue' });
  },
  assume: 'Verification was done in two ways. First, the two combinations that remove the queue and call directly were really run on Spring Boot 4.1.1 (embedded Tomcat) and Spring Framework 7.0.9 on JDK 21.0.12.1. The same source as the code on the screen (with only the package and import lines added, and the 8081 in localhost:8081 replaced with an empty port number) was compiled with javac, and then the notification server started Notifier with Spring Boot on 127.0.0.1, and the order server called order(1), order(2), and order(3) of the OrderService bean in turn. In the combination where the notification server is running, every time order ended only after handle printed "Notification sent for order N", and in the combination where it is stopped, order ended all three times with ResourceAccessException (cause java.net.ConnectException), and even when I started the notification server on the same port number and watched for 1s, handle was never called. Because handle in this run ends right away without waiting, the 0.3s of a direct call is the value measured in the model for running described below. Second, the two combinations that use the queue did not run RabbitMQ. The PC used to write this lab has neither RabbitMQ nor the Spring AMQP library, and they were not downloaded. Queue, RabbitTemplate.convertAndSend(String, Object), and @RabbitListener(queues = …) on the screen were only compiled with javac, together with a stand-in that copies just the names, arguments, and types from the Spring AMQP 4.1.2 API documentation and official source. The behavior was run inside 127.0.0.1 with a model for running that plays the role of RabbitMQ (a small http server of Node.js 24.18.0). The model was made to follow only the behavior that the documentation specifies. When the order server first connects, it creates the queue of QueueConfig, convertAndSend("order-created", no) goes through the default exchange into the queue that has the same name, and the sending side returns without waiting for the handling. The queue hands over messages in the order they were put in to the receiving side that is waiting (the queue side hands them over, rather than the receiving side looking into the queue), and it removes a message only when the confirmation arrives that handle ended without an exception. The receiving side of the model takes only one message at a time, while the default setting of Spring AMQP (prefetch 250) takes several in advance and handles them one by one. The order of handling and what counts toward the number of messages in the queue before the confirmation are the same. The 0.3s for one notification is a value chosen for this lab. What I compared in the model is the three columns of the result table, that the order of putting in, handing over, and removing was the same, that when the order server had got all the results the queue held 3 messages (including the 1 being handled), and that nothing was handed over before the notification server started. That handle(int no) receives the order number, which arrives as an Integer, as an int was not run, and I confirmed only, from the Spring AMQP source, that the default converter restores numbers and strings without a separate allowed list. What I checked against documentation: the RabbitMQ AMQP 0-9-1 Model Explained (https://www.rabbitmq.com/tutorials/amqp-concepts: the default exchange binds every queue with a routing key equal to the queue name, it recommends the way in which the queue hands messages to the receiving side, the broker removes a message from the queue completely only after it gets an acknowledgement, and a message that cannot go to any queue is dropped or returned to the sender), the Spring AMQP version of RabbitMQ tutorial 1 (an example that sends with convertAndSend and receives with @RabbitListener(queues = "hello")), the Spring AMQP 4.1.2 API (convertAndSend(String routingKey, Object message) sends to the default exchange with that routing key, Queue(String name) is durable, non-exclusive, and non auto-delete, and the queues attribute of @RabbitListener) and, in the reference documentation, Message Listener Container Configuration (acknowledgeMode is AUTO by default, and the container sends the acknowledgement if the listener does not throw an exception, and prefetchCount is 250 by default), the AMQP section of Messaging in the Spring Boot reference documentation (a Queue bean is used to create that queue in RabbitMQ, and a bean that has @RabbitListener becomes a listener), and the RabbitAutoConfiguration API (it registers RabbitTemplate as a bean). I checked them through the content that WebFetch returned on 2026-10-23 (I did not read the whole pages myself). KafkaTemplate and @KafkaListener are not covered in this lab. What was shortened on the screen: the import lines of the two servers and the main class (the class that has @SpringBootApplication), and the settings that connect to RabbitMQ (spring.rabbitmq.host and so on) are not shown. What this lab did not look at: keeping the queue on disk and the case where RabbitMQ itself stops, handing a message over again when the receiving side stopped before the confirmation, the case where a message is delivered twice, the order and distribution when there are several receiving sides, redoing a failed handling, and the timeout of RestClient. Such details are covered in the in-depth labs "Message queue basics", "Kafka partitions and consumers", and "Saga and outbox". This lab also did not judge the standard that separates the jobs a queue suits from the jobs that suit a direct call (whether the result is needed right away).',
});

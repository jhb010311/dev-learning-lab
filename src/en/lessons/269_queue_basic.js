Lab.register({
  id: 'queue_basic', nav: 'Message queues', cat: 'Fundamentals', mode: 'step', basic: true, deep: ['mq', 'kafka', 'saga'],
  title: 'What is a message queue, and how is it different from calling a server directly?',
  intro: 'A message queue is a line, placed between the server that asks for work and the server that does the work, in which the work is written down. The code box has three lines. In the first line, the order server writes the work for the notification server as a short text (a message) called "Notify order N" and puts it in the queue, and when it gets the result it moves straight on to the next job (the side that sends messages). In the second line, the queue keeps the messages in the order they were put in. In the third line, the notification server takes messages out of the queue one at a time and handles them (the side that receives messages). In this lab you remove the queue line so that the order server sends requests straight to the notification server, or you keep the notification server stopped while the 3 orders are sent and start it later, and you see the result the order server gets and how the notifications are handled. The code box is not the source of a program that was run. It is text that says what does what, and the queue used in the runs is a very small queue server written for this lab (it is not a real product such as Kafka or RabbitMQ).',
  terms: ['Message queue', 'Producers and consumers', 'Message broker'],
  controls: [
    { id: 'via', label: 'How the order server asks for a notification', type: 'select', value: 'queue', options: [['queue', 'Put a "Notify order N" message in the queue'], ['direct', 'Remove the queue line and send the request straight to the notification server']] },
    { id: 'consumer', label: 'State of the notification server', type: 'select', value: 'up', options: [['up', 'Running'], ['late', 'Stopped while the 3 orders are sent, then starts later']] },
  ],
  // q is the question shown on the question-style screen. t and d are the name and the description used in the text-only reading
  presets: [
    { t: 'Default settings', q: 'What happens to the notifications for 3 orders when a queue sits between the order server and the notification server?', d: 'The order server puts messages in the queue and gets the result at once. After that, the notification server takes them out and handles them in the order they were put in.', v: { via: 'queue', consumer: 'up' } },
    { t: 'Calling directly without a queue', q: 'What if you remove the queue line and the order server sends requests straight to the notification server?', d: 'The order server waits until the notification server has finished handling the request, and only then gets the result.', v: { via: 'direct', consumer: 'up' } },
    { t: 'Calling directly while the notification server is stopped', q: 'What if you send requests directly and the notification server is stopped while the 3 orders are sent and starts later?', d: 'All 3 requests fail, and even after the notification server starts there is no notification to handle.', v: { via: 'direct', consumer: 'late' } },
    { t: 'Using the queue while the notification server is stopped', q: 'What if you put messages in the queue and the notification server is stopped while the 3 orders are sent and starts later?', d: 'The 3 orders succeed, and the messages stay in the queue and are handled after the notification server starts.', v: { via: 'queue', consumer: 'late' } },
  ],
  msg: function (i) { return 'Notify order ' + i; },
  code: function (c) {
    var out = [];
    if (c.via === 'queue') out.push('# Order server: for each of the 3 orders, puts a "Notify order N" message in the queue', '# Queue: keeps the messages in the order they were put in', '# Notification server: takes them out of the queue one at a time and handles them');
    else out.push('# Order server: for each of the 3 orders, sends a "Notify order N" request straight to the notification server', '# Notification server: handles the requests it receives one at a time');
    if (c.consumer === 'late') out.push('# Notification server: stopped while the 3 orders are sent, then starts later');
    return out.join('\n');
  },
  label: function (c) { return (c.via === 'queue' ? 'Message put in the queue' : 'Request sent straight to the notification server') + ' · ' + (c.consumer === 'up' ? 'Notification server running' : 'Notification server starts later'); },
  columns: ['Result the order server got', 'Handled notifications', 'Messages in the queue when the notification server starts'],
  simulate: function (c) {
    var ev = [], sum = [], q = c.via === 'queue', late = c.consumer === 'late', self = this, N = 3, i;
    var st = { os: 'plain', ost: ['Waiting'], ns: late ? 'ghost' : 'plain', nst: late ? ['Stopped'] : ['Running'], qn: [], a1: '', a2: '', a3: '', res: [], done: [] };
    function push(s, k) { ev.push({ s: s, k: k, snap: JSON.parse(JSON.stringify(st)) }); }
    var devs = [];
    if (!q) devs.push('the queue line is gone and the lines for the order server and the notification server are now about sending and receiving directly');
    if (late) devs.push('a line was added saying that the notification server is stopped and starts later');
    var note = devs.length ? ' What changed in the code box from the default settings is that ' + devs.join(', and that ') + '.' : '';
    var okN = function () { return st.res.filter(function (r) { return r[1] === 'Success'; }).length; };
    // Step 1: the start
    if (q) {
      push('The order server receives the ' + N + ' orders one after another. As the first line of the code box says, each time the order server receives an order, it writes the work for the notification server as a short text, "Notify order N", and puts it in the queue. This short text is called a message. The queue is a line that keeps messages in the order they were put in, and the notification server takes messages out of the queue and handles them. ' + (late ? 'The notification server is stopped now, and it starts after all ' + N + ' orders have been sent. The order server does not send requests to the notification server. It sends only to the queue.' : 'The notification server is running now, and the queue was empty when it started. The notification server looks into the queue every 0.1s and takes out a message if there is one. In this run, handling one notification was made to take 0.3s.') + note, '');
    } else {
      push('The order server receives the ' + N + ' orders one after another. The code box has no queue line. Each time the order server receives an order, it sends a "Notify order N" request straight to the notification server, and the notification server handles the requests it receives one at a time. ' + (late ? 'The notification server is stopped now, and it starts after all ' + N + ' orders have been sent.' : 'The notification server is running now. In this run, handling one notification was made to take 0.3s.') + ' The order server in this lab sends the next order after it gets the result of the previous order.' + note, '');
    }
    // Sending the orders
    for (i = 1; i <= N; i++) {
      var m = this.msg(i), head = i === 1;
      if (q) {
        st.qn.push(m); st.res.push(['Order ' + i, 'Success']); st.os = 'wait'; st.ost = ['Order ' + i + ' result', 'Success']; st.a1 = 'good'; st.a2 = 'good';
        push(head
          ? 'The order server sends a request to put the message "' + m + '" in the queue. The queue keeps the message at the tail and replies "put." The moment the order server gets this reply, it gets the result of this order (success) and moves on to the next order. This reply does not say whether the notification server has handled the message.' + (late ? ' Even if the notification server is stopped, it does not matter, because the order server sent its request to the queue.' : ' The number of messages piled up in the queue is 1.')
          : 'The order server puts the message "' + m + '" in the queue, and as soon as the queue replies "put," it gets the result (success). The number of messages piled up in the queue is ' + i + '.', 'good');
      } else if (late) {
        st.res.push(['Order ' + i, 'Failure (connection refused)']); st.os = 'bad'; st.ost = ['Order ' + i + ' result', 'Failure']; st.a1 = 'bad'; st.a2 = '';
        push(head
          ? 'The order server sends the request "' + m + '" straight to the notification server. The notification server is stopped, so no program is waiting at that port number and the connection is refused (a connection refused error), and the result the order server gets is failure. The order server in this lab does not send again even when a request fails. There is no place anywhere that keeps this request.'
          : 'The order server sends the request "' + m + '" straight to the notification server, but the connection is refused again, so the result is failure. There is no place that keeps it.', 'bad');
      } else {
        st.os = 'hot'; st.ost = ['Order ' + i, 'Awaiting reply']; st.ns = 'hot'; st.nst = ['"' + m + '"', 'Handling']; st.a1 = 'hot'; st.a2 = '';
        push(head
          ? 'The order server sends the request "' + m + '" straight to the notification server and waits for the reply of the notification server. The notification server receives the request and starts handling it.'
          : 'The order server sends the request "' + m + '" straight to the notification server and waits for the reply. The notification server starts handling it.', '');
        st.done.push(m); st.res.push(['Order ' + i, 'Success']); st.os = 'wait'; st.ost = ['Order ' + i + ' result', 'Success']; st.ns = 'plain'; st.nst = ['Running', 'Handled: ' + i]; st.a1 = ''; st.a2 = 'good';
        push(head
          ? 'The notification server finishes handling "' + m + '" and replies "handled" (it took 0.3s). Only after the order server gets this reply does it get the result of this order (success), and only then does it move on to the next order.'
          : 'The order server gets the result (success) only after the notification server finishes handling "' + m + '" and replies. It waited 0.3s this time too.', 'good');
      }
    }
    // After all the orders are sent
    if (q) {
      st.a1 = ''; st.a2 = ''; st.os = 'good'; st.ost = [N + ' orders', 'All succeeded'];
      if (late) {
        push('The order server has got the results of all ' + N + ' orders. The notification server is stopped, so no one takes messages out of the queue, and the ' + N + ' messages (for orders 1, 2, and 3) stay in the queue as they are. No notification has been handled yet.', '');
        st.ns = 'hot'; st.nst = ['Started', N + ' in the queue'];
        push('The notification server starts. When it started, ' + N + ' messages were piled up in the queue. The notification server looks into the queue every 0.1s and takes out a message if there is one.', '');
      } else {
        push('The order server has got the results of all ' + N + ' orders. The notification server is running, but it looks into the queue every 0.1s, and handling one notification takes 0.3s. So when the order server has got all the results, not one notification has been handled yet, and ' + N + ' messages are waiting for their turn in the queue. The order server cannot know when these notifications will finish.', '');
      }
      for (i = 1; i <= N; i++) {
        var mm = this.msg(i);
        st.qn.shift(); st.done.push(mm); st.ns = i === N ? 'good' : 'hot'; st.nst = ['"' + mm + '"', i === N ? 'All handled' : 'Handled']; st.a3 = 'hot';
        push(i === 1
          ? 'The notification server takes the message at the head of the queue, "' + mm + '," and handles it (0.3s). ' + st.qn.length + ' are left in the queue. Messages are taken out in the order they were put in.'
          : 'The notification server takes the next message from the queue, "' + mm + '," and handles it. ' + st.qn.length + ' are left in the queue.' + (i === N ? ' All ' + N + ' notifications have been handled. The order in which they were handled is orders 1, 2, and 3, the same as the order they were put in.' : ''), i === N ? 'good' : '');
      }
    } else if (late) {
      st.os = 'bad'; st.ost = [N + ' orders', 'All failed']; st.a1 = '';
      push('The order server got the result that all ' + N + ' requests failed. The requests sent while the notification server was stopped are kept nowhere.', 'bad');
      st.ns = 'plain'; st.nst = ['Started', 'Nothing to do'];
      push('The notification server starts. But there is not one notification to handle. The earlier ' + N + ' requests were lost because no one received them, and in this run, while watching for 1s after the server started, 0 notifications were handled. This is because the order server does not send them again.', 'bad');
    } else {
      st.os = 'good'; st.ost = [N + ' orders', 'All succeeded']; st.ns = 'good'; st.nst = [N + ' notifications', 'All handled']; st.a2 = '';
      push('The order server has got the results of all ' + N + ' orders. The notification server handled ' + N + ' notifications. The order server waited 0.3s each time a notification finished.', 'good');
    }
    // Summary
    if (q && !late) {
      sum.push('A message queue is a line, placed between the order server and the notification server, in which work is written down. The order server only put messages in the queue and got the result at once, and the notification server took them out of the queue in the order they were put in, at its own speed, and handled them.');
      sum.push('In exchange, when the order server got the results, not one notification had been handled yet. Success only means that the message was put in the queue, so the order server cannot know right away when the notification will finish.');
    } else if (q) {
      sum.push('If you put the messages in the queue, all ' + N + ' orders succeed even while the notification server is stopped, and the ' + N + ' messages stay in the queue and are handled in the order they were put in after the notification server starts.');
      sum.push('What kept the messages while the notification server was stopped was the queue. In the same situation, the requests sent directly all ' + N + ' failed (the earlier question). However, the success the order server got does not mean the notification went out. It means the message went into the queue.');
    } else if (!late) {
      sum.push('If you call the notification server directly without a queue, the order server waits until the notification server finishes handling the request, and only then gets the result. All ' + N + ' notifications were handled.');
      sum.push('You can know from the result right away that the notification has finished, but if the notification server is slow, the order server waits just as long. When you put messages in the queue, there was no such waiting (the earlier question).');
    } else {
      sum.push('If you send directly while the notification server is stopped, all ' + N + ' requests fail, and even if the notification server starts later, not one notification is handled.');
      sum.push('If the receiving side is not there, a request sent directly is kept nowhere. The order server in this lab did not send again, so those notifications were lost.');
    }
    var qNote = !q ? 'No queue' : late ? N + ' (for orders 1, 2, and 3)' : '0 (the notification server was already running)';
    return { events: ev, summary: sum, row: [q ? 'All ' + N + ' succeeded (got the result at once, without waiting for the notifications to be handled)' : late ? 'All ' + N + ' failed (could not connect to the notification server)' : 'All ' + N + ' succeeded (got the result after the notification server finished handling)', (!q && late) ? '0 (no notification was handled even after the notification server started)' : N + ' notifications: order 1 → order 2 → order 3', qNote] };
  },
  render: function (v, sim, t, H, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : null, q = sim.c.via === 'queue';
    if (!s) { H.text(v, 'Click Run to start from the order server receiving orders.'); return; }
    H.table(v, ['Order', 'Result the order server got'], s.res.length ? s.res.map(function (r) { return { cls: '', cells: [r[0], { v: r[1], cls: r[1] === 'Success' ? 'good' : 'bad' }] }; }) : [{ cls: 'gone', cells: ['None yet', ''] }], 'Result the order server got');
    H.table(v, ['Handling order', 'Notification the notification server handled'], s.done.length ? s.done.map(function (m, j) { return { cls: '', cells: ['#' + (j + 1), m] }; }) : [{ cls: 'gone', cells: ['None yet', ''] }], 'Handled notifications');
    if (q) H.counters(v, [[s.qn.length, 'Messages in the queue']]);
  },
  // Diagram: on the left the order server, in the middle the queue (the box where messages pile up), on the right the notification server. With a queue, the path is order server -> queue -> notification server; without it, order server -> notification server directly. A stopped notification server is dotted and a failure is red. Below are three result boxes.
  draw: function (P, sim, shown) {
    var c = sim.c, q = c.via === 'queue', last = shown[shown.length - 1], s = last ? last.snap : null, late = c.consumer === 'late';
    function ac(x) { return x === 'plain' ? '' : x; }
    P.size(680, 336);
    P.box('os', 14, 82, 140, 84, { cls: s ? s.os : 'plain', title: 'Order server', sub: s ? s.ost : ['Waiting'] });
    P.region('qu', 254, 16, 172, 214, q ? 'Queue' : 'Queue (removed)');
    if (q) {
      var qn = s ? s.qn : [];
      qn.forEach(function (m, j) { P.box('m_' + m, 264, 52 + j * 44, 152, 36, { cls: 'wait', sub: m, center: true }); });
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
  assume: 'In our test run, I ran all four combinations for real, only inside 127.0.0.1, and checked them against the model. I did not connect to any outside network, and nothing new was downloaded. The queue used in the runs is a very small queue server written for this lab as an http server of Node.js 24.18.0. It puts messages in one array in memory and accepts only two kinds of requests, one that puts a message in and one that takes the message at the head out, and it is not a real message queue product such as Kafka or RabbitMQ (our test run did not install or use such a product). So what this lab shows is the simplest shape of "what a queue does," and it is not a check of how a real product behaves. The program that plays the order server sends the 3 orders one after another, sending the next order after it gets the result of the previous one. In the combinations that use the queue, it sends a put request to the queue server and takes the reply as the result, and in the combinations that call directly, it sends a request to the notification server and takes the reply after handling is finished as the result. The notification server is either an http server that receives direct requests (the direct combinations) or a loop that takes one message at a time from the queue server every 0.1s and handles it (the queue combinations), and either way handling one notification was made to take 0.3s and it handles one at a time. The 0.1s and the 0.3s are values chosen for this lab. In the combinations where the notification server is stopped and starts later, I started the notification server after the results of all 3 orders had been received, and while it was stopped there was no program waiting at that port number. The program that ran made the same text as the code on the screen and read it (how many, whether there is a queue line, how the notification server receives, whether it is stopped and starts later) and started things according to that content. What I compared is the result the order server got (success or failure, and whether it got the result after the notification handling finished or before it finished, judged from the record of the order in which events happened), the handled notifications and their order, and the number of messages in the queue when the notification server starts. I also confirmed that the order of taking out from the queue was the same as the order of putting in, that a request sent directly to the stopped notification server failed every time with a connection refused error (ECONNREFUSED), and that even when I watched for 1s after the notification server started, no notification was handled. In the combination that puts messages in the queue, the queue held 3 messages when the order server got all the results, and this is because of the structure of this run, in which the notification server looks into the queue every 0.1s even when it is running. That the queue was empty when the notification server started is because in this run the notification server was started before the orders. What I checked against documentation is the Introduction of RabbitMQ tutorial 1 (Hello World) (a program that sends messages is a producer, a program that mostly waits to receive messages is a consumer, a queue is like a post box and is in effect a large message buffer, and RabbitMQ is a message broker that accepts and forwards messages) and the Introduction page of the Apache Kafka documentation (https://kafka.apache.org/intro, Main Concepts and Terminology: a producer is a client application that writes events, a consumer is the side that reads and processes events, and the two are fully decoupled and agnostic of each other). I checked the documents through the quotations that WebFetch returned (I did not read the whole pages myself), and there are no section numbers. Much was shortened on the screen. Putting a message in the queue and the queue keeping it were shortened to one request and one reply, and that the reply tells only "it was kept" and not whether the notification was handled is behavior that comes from how this small queue server was made. A real product deals with acknowledgements, with which the side that handled a message tells that it has handled it, keeping the queue on disk, the case where the queue itself stops, the case where a message is lost or delivered twice, the order and distribution when there are several consumers, and redoing a failed handling, and this lab did not look at any of them. Such details are covered in the in-depth labs "Message queue basics", "Kafka partitions and consumers", and "Saga and outbox". This lab also did not judge the standard that separates the jobs a queue suits from the jobs that suit a direct call (whether the result is needed right away). I did not use a browser, and I had only one notification server and one order server.',
});

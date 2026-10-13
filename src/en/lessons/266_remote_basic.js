Lab.register({
  id: 'remote_basic', nav: 'Calling another server', cat: 'Fundamentals', mode: 'step', basic: true, deep: ['restclient', 'circuit', 'saga', 'gateway'],
  title: 'How is a server calling another server different from calling a method?',
  intro: 'A large service sometimes splits its features among several servers. If the order server that takes orders and the payment server that handles payments are different programs that run separately, the order server has to send a request (POST /pay) to the payment server over the network to make a payment. When you call a method in the same program, the one you call is always in the same program and the call finishes right away. But when you call a server across a network, the other side may be off and refuse the connection, or the other side may be slow and you may have to wait. So the code of the order server has to decide how long to wait for an answer (a timeout) and what to answer the client with when the call fails. In this lab, you change the state of the payment server and whether the waiting time is set, and see the response the client receives, the time it took, and what happened to the order server. The code box is not a program but a list of who sends what to whom, and the real run started an order server and a payment server with these settings and exchanged requests between them.',
  terms: ['Remote call', 'Connect timeout and read timeout', '502 Bad Gateway', '504 Gateway Timeout'],
  controls: [
    { id: 'pay', label: 'Payment server', type: 'select', value: 'ok', options: [['ok', 'Payment server: replies "Payment complete" after 0.1s'], ['down', 'Payment server: off'], ['slow', 'Payment server: replies "Payment complete" after 3s']] },
    { id: 'timeout', label: 'Write (waits up to 1s) on the order server → payment server line', type: 'check', value: true },
  ],
  // q is the question shown on the question-style screen. t and d are the name and the description used in the text-only reading
  presets: [
    { t: 'Default settings', q: 'What does the code that calls another server look like, and what happens when the order server sends POST /pay to the payment server?', d: 'The payment server is on and replies after 0.1s. The order server receives the reply and answers the client with 200.', v: { pay: 'ok', timeout: true } },
    { t: 'Payment server off', q: 'What if the payment server is off?', d: 'The connection is refused, and the order server answers 502 right away.', v: { pay: 'down', timeout: true } },
    { t: 'Payment server replies after 3s', q: 'What if the payment server replies after 3s instead of 0.1s?', d: 'When 1s is exceeded, the order server stops waiting and answers 504.', v: { pay: 'slow', timeout: true } },
    { t: 'Removing the waiting time', q: 'What if you remove "(waits up to 1s)" and the payment server replies after 3s?', d: 'There is no limit, so it waits the full 3s, and the client also receives the response after 3s.', v: { pay: 'slow', timeout: false } },
    { t: 'Removing the waiting time, with the server off', q: 'What if you remove "(waits up to 1s)" and the payment server is off?', d: 'There is nothing to wait for, so the result is the same as with the limit.', v: { pay: 'down', timeout: false } },
  ],
  LINE3: { ok: 'replies "Payment complete" after 0.1s', down: 'off', slow: 'replies "Payment complete" after 3s' },
  code: function (c) {
    return ['# Client → order server (8080): POST /orders',
      '# Order server → payment server (9000): POST /pay' + (c.timeout ? '  (waits up to 1s)' : ''),
      '# Payment server: ' + this.LINE3[c.pay],
      '# Order server: answers 502 for a connection failure and 504 for a timeout'].join('\n');
  },
  label: function (c) { return { ok: 'Payment server replies after 0.1s', down: 'Payment server off', slow: 'Payment server replies after 3s' }[c.pay] + ' · ' + (c.timeout ? 'Waits up to 1s' : 'Waiting time not set'); },
  columns: ['Response the client received', 'Time it took', 'What happened to the order server'],
  simulate: function (c) {
    var ev = [], sum = [], pay = c.pay, tm = !!c.timeout;
    var st = { at: '0s', cl: ['plain', ['Idle']], od: ['plain', ['Idle']], py: [pay === 'down' ? 'ghost' : 'plain', pay === 'down' ? ['Off'] : ['Idle']], a1: null, a2: null, a3: null, a4: null, got: 'Not yet', took: 'Not yet', payEnd: 'Not yet', payEndCls: '', rows: [] };
    function push(s, k) { ev.push({ s: s, k: k, snap: JSON.parse(JSON.stringify(st)) }); }
    var devs = [];
    if (pay === 'down') devs.push('the "off" on line 3');
    if (pay === 'slow') devs.push('the "after 3s" on line 3');
    if (!tm) devs.push('(waits up to 1s) missing from line 2');
    var note = devs.length ? ' In the code box, what differs from the default settings is ' + devs.join(', ') + '.' : '';
    // Step 1: the client calls the order server
    st.cl = ['wait', ['Sent request', 'Awaiting reply']]; st.od = ['plain', ['Got request']]; st.a1 = ['hot', 'POST /orders'];
    st.rows.push(['0s', 'Client → order server', 'POST /orders']);
    push('The client sends a POST /orders request to the order server. The service in this lab is split into the order server that takes orders and the payment server that handles payments, and the two are different programs that run separately. The # lines in the code box are not a program but a list of who sends what to whom.' + note, '');
    // Step 2: the order server calls the payment server
    st.od = ['hot', ['Calling the', 'payment server']]; st.a2 = ['hot', 'POST /pay'];
    st.rows.push(['0s', 'Order server → payment server', 'POST /pay']);
    push('While handling the order, the order server has to make a payment. The feature that makes payments is not inside the order server but in the payment server. If a feature is in the same program, you can just call a method, but a feature of another server can only be called by sending a POST /pay request to that server over the network. ' + (tm ? 'The order server is set to wait for the answer to this request for up to 1s only.' : 'The order server has nothing that sets how long to wait for the answer to this request.'), '');
    var row, S = [];
    if (pay === 'ok') {
      st.py = ['wait', ['Got request', 'Processing']]; st.od = ['wait', ['Awaiting reply']];
      push('The payment server receives the POST /pay request and processes the payment. This payment server takes 0.1s to process. Meanwhile, the order server waits for the answer.', '');
      st.at = '0.1s'; st.py = ['good', ['Paid']]; st.a3 = ['good', '200']; st.od = ['hot', ['Got reply']]; st.payEnd = 'Yes (after 0.1s)'; st.payEndCls = 'good';
      st.rows.push(['0.1s', 'Payment server → order server', '200 Payment complete']);
      push('The payment server answers "Payment complete" with a 200 response. The order server receives this answer and knows the payment is done.' + (tm ? ' The answer came before the 1s that was set, so the waiting did not hit the limit.' : ' The waiting time was not set, but the answer came soon, so there was no long wait.'), 'good');
      st.od = ['good', ['Order done']]; st.a4 = ['good', '200'];
      st.rows.push(['0.1s', 'Order server → client', '200 Order complete']);
      push('The order server returns "Order complete" to the client with a 200 response.', 'good');
      st.cl = ['good', ['Got 200']]; st.got = '200 Order complete'; st.took = 'About 0.1s';
      push('The client received the 200 response in about 0.1s. The result looks the same as calling one method, but in between there was a step of exchanging text with another server. For this step to go well, the payment server had to be on and had to answer in time.', 'good');
      row = ['200 Order complete', 'About 0.1s', 'The payment server replied in 0.1s'];
      sum.push('A server calling another server means sending a request over the network and waiting for the answer. The order server sent POST /pay to the payment server, received a 200 answer after 0.1s, and answered the client with 200 "Order complete".');
      sum.push(tm ? 'What differs from a method call is that the other side is a server that runs separately. This time the payment server was on and answered quickly, so the 1s limit was not used. The cases where it is off or answers late are in the next questions.' : 'The answer came in 0.1s, so the fact that the waiting time was not set does not show in the result. It shows when the other side is off or answers late.');
    } else if (pay === 'down') {
      st.od = ['bad', ['Failed:', 'ECONNREFUSED']]; st.a2 = ['bad', 'refused'];
      st.rows.push(['0s', 'What happened to the order server', 'Connection failed (ECONNREFUSED)']);
      push('The order server tries to connect to the payment server, but the payment server program is off, so no program is receiving connections at that address. The connection is not made, and the code of the order server gets an error named ECONNREFUSED. The payment server never received a request. A method call has no step called connecting, so it has no such failure.', 'bad');
      st.od = ['hot', ['Answered 502']]; st.a4 = ['bad', '502'];
      st.rows.push(['0s', 'Order server → client', '502 Could not connect to the payment server']);
      push('The code of the order server is written to see this error and return a 502 Bad Gateway response to the client. 502 is a status code for when a server could not get a valid answer from the server it called (here, the payment server). What to answer when an error occurs is decided by the code of the order server.' + (tm ? ' The waiting limit (1s) was not used. The connection was refused right away, so there was nothing to wait for.' : ''), 'bad');
      st.cl = ['bad', ['Got 502']]; st.got = '502 Bad Gateway'; st.took = 'Immediately (within 0.1s)'; st.payEnd = 'No (it never got the request)'; st.payEndCls = 'bad';
      push('The client received the 502 response right away. The payment did not happen, and the client knows that from the 502.' + (tm ? '' : ' Even though the waiting time was not set, the connection is refused right away, so the result is the same.'), 'bad');
      row = ['502 Bad Gateway', 'Immediately (within 0.1s)', 'Connection failed (ECONNREFUSED)'];
      sum.push('If the payment server is off, the connection is refused, and the order server does not wait but answers 502 right away.' + (tm ? '' : ' The result is the same whether or not the waiting time is set.'));
      sum.push('Unlike a method call, the other side across a network can be off. What to answer the client then has to be written in the code of the order server, and this code is written to answer 502.' + (tm ? ' A waiting limit does not help with a failure where the connection is refused, because there is nothing to wait for.' : ''));
    } else if (tm) {
      st.py = ['wait', ['Got request', 'Takes 3s']]; st.od = ['wait', ['Awaiting reply', '(up to 1s)']];
      push('The payment server received the POST /pay request. This payment server takes 3s to process. The order server waits for the answer, and the client also waits without having received a response.', '');
      st.at = '1s'; st.od = ['bad', ['1s passed', 'Gave up']]; st.a2 = ['bad', 'cut off'];
      st.rows.push(['1s', 'What happened to the order server', 'Timed out (TimeoutError)']);
      push('1s has passed, but the answer from the payment server has not come. The limit that was set is used up, so the order server cuts off the request it sent to the payment server and stops waiting. The code of the order server gets a timeout error (TimeoutError).', 'bad');
      st.od = ['hot', ['Answered 504']]; st.a4 = ['bad', '504'];
      st.rows.push(['1s', 'Order server → client', '504 The payment server did not answer in time']);
      push('The code of the order server is written to see this error and return a 504 Gateway Timeout response to the client. 504 is a status code for when a server could not get an answer in time from the server it called (here, the payment server).', 'bad');
      st.cl = ['bad', ['Got 504']]; st.got = '504 Gateway Timeout'; st.took = 'About 1s';
      push('The client received the 504 response in about 1s. If the order server had waited 3s for the answer of the payment server, the client would have waited 3s too.', 'bad');
      st.at = '3s'; st.py = ['good', ['Finished', 'processing']]; st.payEnd = 'Yes (after 3s, after the 504)'; st.payEndCls = 'bad';
      st.rows.push(['3s', 'Payment server side', 'Finished processing (the connection was already cut off)']);
      push('But at 3s the payment server finished processing the payment. This payment server is written to finish what it was doing even if the connection is cut off, and the connection of the order server that was to receive the answer was already cut off. The order server answered 504 without knowing whether the payment went through, and the client received a 504 even though the payment was made.', 'bad');
      row = ['504 Gateway Timeout', 'About 1s', 'Gave up after waiting 1s with no answer (timeout)'];
      sum.push('If the payment server replies after 3s, the order server, which is set to wait for 1s at most, stops waiting at 1s and answers 504. The client received a response in about 1s.');
      sum.push('Stopping the waiting and cancelling the work of the other side are different things. In this run the payment server finished the payment after 3s, so the client received a 504, but the payment was made. So after a 504, the order server has to find out separately whether the payment went through.');
    } else {
      st.py = ['wait', ['Got request', 'Takes 3s']]; st.od = ['wait', ['Awaiting reply', '(no limit)']];
      push('The payment server received the POST /pay request. This payment server takes 3s to process. The order server waits for the answer, and the client also waits without having received a response.', '');
      st.at = '1s'; st.od = ['wait', ['Still waiting', 'after 1s']];
      push('1s has passed, but the answer from the payment server has not come. The waiting time was not set, so the code of the order server does not give up and waits until the answer comes.', 'bad');
      st.at = '3s'; st.py = ['good', ['Paid']]; st.a3 = ['good', '200']; st.od = ['hot', ['Got reply']]; st.payEnd = 'Yes (after 3s)'; st.payEndCls = 'good';
      st.rows.push(['3s', 'Payment server → order server', '200 Payment complete']);
      push('At 3s, the payment server answers "Payment complete" with a 200 response. Only then does the order server receive the answer.', '');
      st.od = ['good', ['Order done']]; st.a4 = ['good', '200'];
      st.rows.push(['3s', 'Order server → client', '200 Order complete']);
      push('The order server returns "Order complete" to the client with a 200 response.', 'good');
      st.cl = ['good', ['Got 200']]; st.got = '200 Order complete'; st.took = 'About 3s';
      push('The client received the 200 response in about 3s. This time the payment server answered after 3s, so it ended. But when we made the payment server receive the request and never answer, and waited 4s, this order server did not give up and the client did not receive a response. We did not wait any longer than that.', 'bad');
      row = ['200 Order complete', 'About 3s', 'Waited until the payment server answered after 3s'];
      sum.push('The order server, which had no waiting time set, waited until the payment server answered after 3s, and the client received 200 in about 3s.');
      sum.push('If the payment server does not answer and there is no time limit, this order server keeps waiting until a response comes (here we watched it up to 4s). Only if you set the waiting time does your own server not get stuck because of a slow or stopped partner.');
    }
    return { events: ev, summary: sum, row: row };
  },
  render: function (v, sim, t, H, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : null;
    if (!s) { H.text(v, 'Click Run to start with the client calling the order server.'); return; }
    H.table(v, ['Time', 'Exchanged', 'Content'], s.rows.map(function (r) { return { cls: '', cells: [r[0], r[1], r[2]] }; }), 'What was exchanged');
    H.table(v, ['Item', 'Value'], [
      { cls: s.got === 'Not yet' ? 'gone' : '', cells: ['Response the client received', s.got === 'Not yet' ? 'Not yet' : { v: s.got, cls: s.got.indexOf('200') === 0 ? 'good' : 'bad' }] },
      { cls: s.took === 'Not yet' ? 'gone' : '', cells: ['Time it took', s.took] },
      { cls: s.payEnd === 'Not yet' ? 'gone' : '', cells: ['Payment server finished the payment', s.payEnd === 'Not yet' ? 'Not yet' : { v: s.payEnd, cls: s.payEndCls }] },
    ], 'Result');
  },
  // Diagram: the client on the left, the order server in the middle, the payment server on the right. The request arrows are on the top and the answer arrows on the bottom. When the connection is refused or the waiting is given up, the arrow between the order server and the payment server turns red. At the very bottom are the response the client received, the time it took, and whether the payment server finished the payment.
  draw: function (P, sim, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : null;
    P.size(680, 330);
    P.text('clk', 340, 26, 'Time passed ' + (s ? s.at : '0s'), { anchor: 'middle', bold: true });
    P.box('cl', 14, 52, 124, 100, { cls: s ? s.cl[0] : 'plain', title: 'Client', sub: s ? s.cl[1] : ['Idle'] });
    P.box('od', 278, 52, 124, 100, { cls: s ? s.od[0] : 'plain', title: 'Order server', sub: s ? s.od[1] : ['Idle'] });
    P.box('py', 542, 52, 124, 100, { cls: s ? s.py[0] : (sim.c.pay === 'down' ? 'ghost' : 'plain'), title: 'Payment server', sub: s ? s.py[1] : (sim.c.pay === 'down' ? ['Off'] : ['Idle']) });
    if (s && s.a1) P.arrow('a1', 'cl:r:0.3', 'od:l:0.3', { cls: s.a1[0], label: s.a1[1] });
    if (s && s.a2) P.arrow('a2', 'od:r:0.3', 'py:l:0.3', { cls: s.a2[0], label: s.a2[1] });
    if (s && s.a3) P.arrow('a3', 'py:l:0.75', 'od:r:0.75', { cls: s.a3[0], label: s.a3[1] });
    if (s && s.a4) P.arrow('a4', 'od:l:0.75', 'cl:r:0.75', { cls: s.a4[0], label: s.a4[1] });
    P.box('n1', 14, 190, 652, 36, { cls: s && s.got !== 'Not yet' ? (s.got.indexOf('200') === 0 ? 'good' : 'bad') : 'ghost', title: 'Response the client received', right: s ? s.got : 'Not yet' });
    P.box('n2', 14, 234, 652, 36, { cls: s && s.took !== 'Not yet' ? 'wait' : 'ghost', title: 'Time it took', right: s ? s.took : 'Not yet' });
    P.box('n3', 14, 278, 652, 36, { cls: s && s.payEnd !== 'Not yet' ? (s.payEndCls || 'plain') : 'ghost', title: 'Payment server finished the payment', right: s ? s.payEnd : 'Not yet' });
  },
  assume: 'The code box is not a program that was run. It is text that lists what the client, the order server, and the payment server exchanged. The real run started the order server and the payment server separately on 127.0.0.1 with the http module of Node.js 24.18.0 (the ports were free ports chosen by the operating system, and 8080 and 9000 on the screen are example numbers), and made the client send POST /orders to the order server. The order server sends POST /pay to the payment server (it does not reuse connections), and we wrote it to answer 200 "Order complete" when the payment server answers, 502 on a connection failure (ECONNREFUSED), and 504 on a timeout. The payment server answers 200 "Payment complete" after 0.1s or after 3s, and a payment server that is off was imitated by starting a server and closing it to make a port that nobody listens to. Waiting for up to 1s was implemented by giving AbortSignal.timeout(1000) as the signal of http.request, and not setting it was implemented by not giving a signal. We ran all six combinations and checked against the model the response the client received and the time it took, the kind of error the order server met, whether the payment server received the request and when it finished processing the payment, and whether the connection was already cut off at that time; for each combination we also checked that the code on the screen is the same text as the text made from the request line the servers actually received, the waiting limit set on the order server, the delay setting of the payment server, and the status code for each error. The time it took is written on the screen as a rough value, and the values measured on the PC used to write this lab were about 0.1s (0.117s), immediately (0.003s or less), about 1s (1.01s), and about 3s (3.02s). When the payment server was off, the same result came out whether or not the waiting time was set. When a payment server that replies after 3s was given a 1s limit, this payment server finished processing the payment after 3s even after the order server stopped waiting. This payment server was written for this lab to finish processing without checking whether the connection was cut off, which does not mean that every server behaves like that. When the waiting time was not set and the payment server received the request but never answered, the order server did not give up even after 4s and the client did not receive a response either, but we did not look at what happens if you wait any longer. These are behaviors observed in this version of Node.js. What we checked against the documentation is section 3.3 of RFC 9110 (the definitions of client and server, and that the same program can be both), section 15.6.3 (502 is for when a server acting as a gateway or proxy receives an invalid response from an inbound server), and section 15.6.5 (504 is for when a server acting as a gateway or proxy does not receive a timely response from an inbound server), and http.request in the Node.js documentation (the signal option aborts a request in progress, while the timeout option does not abort the request and only adds a timeout event). Strictly speaking, the order server is not a proxy but a server doing its own work, so using 502 for a connection failure and 504 for a timeout is a choice of this code that follows the use defined by the specification in a broad way, and some servers may answer with another status code (for example, 503). That a method call in the same program has no step called connecting is an explanation that we did not measure by running. The screen covered only the simplest case of calling once, and it did not cover sending a failed call again, skipping a server that keeps failing instead of calling it, or undoing work that spans several servers. The difference between a connect timeout and a read timeout is covered in the in-depth lab "Calling external APIs and timeouts", a device that protects against a failing server in "Circuit breaker", how to undo the work of several servers in "Saga and outbox", and how to receive requests in one place and split them in "Gateway and gradual migration".',
});

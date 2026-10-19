Lab.register({
  id: 'lb_basic', nav: 'Load balancers', cat: 'Fundamentals', mode: 'step', basic: true, deep: ['scale', 'deploy', 'k8s'],
  title: 'If you run several servers, which server does a request go to?',
  intro: 'When there are more requests than one server can handle, you start the same server program on several machines. But it is inconvenient if the client (the side that sends requests) has to know several server addresses. So the client connects to one address only, and the load balancer that receives requests at that address spreads them across the servers. The load balancer in this lab sends requests to server A and server B in turn, and skips a server whose connection is refused. The code box is not Java code. It is a configuration that says which program runs at which address and what it does (lines that start with # are comments). Each server counts the requests it has received in its own memory and replies like "I am A, request #1". In this lab you remove the load balancer, and you stop the server A program after 3 requests, and you see how the replies the client receives change.',
  terms: ['Load balancer', 'Round robin', 'Skipping a failed server', 'Connection refused error'],
  controls: [
    { id: 'servers', label: 'Server setup', type: 'select', value: 'lb', options: [['lb', 'Servers A and B with a load balancer'], ['one', 'Server A only (connect directly, no load balancer)']] },
    { id: 'down', label: 'Stop the server A program after sending 3 requests', type: 'check', value: false },
  ],
  // q is the question shown on the question-style screen. t and d are the name and the description used in the text-only reading
  presets: [
    { t: 'Default settings', q: 'What does a load balancer look like, and where do the 6 requests go when it sits in front of server A and server B?', d: 'A load balancer in front of two servers. Requests go to A and B in turn.', v: { servers: 'lb', down: false } },
    { t: 'Stopping the server A program', q: 'What if you stop the server A program after sending 3 requests?', d: 'The load balancer skips server A, and the client gets replies without any failure.', v: { servers: 'lb', down: true } },
    { t: 'One server without a load balancer', q: 'What if you remove the load balancer and connect directly to the single server A?', d: 'There is only one server, so that server receives every request.', v: { servers: 'one', down: false } },
    { t: 'Stopping the only server', q: 'What if there is only server A and you stop the server A program after sending 3 requests?', d: 'No server is left to receive requests, so every later request fails.', v: { servers: 'one', down: true } },
  ],
  CODE1: '# Client: 6 requests to http://localhost:8080/',
  code: function (c) {
    var out = [this.CODE1];
    if (c.servers === 'lb') out.push('# 8080: load balancer (sends to server A and server B in turn)', '# Server A (9001), server B (9002): reply "I am A" and "I am B"', '#   The reply also includes the number of requests the server has received');
    else out.push('# 8080: server A. The client connects directly, with no load balancer', '# Server A: replies "I am A"', '#   The reply also includes the number of requests the server has received');
    if (c.down) out.push('# After sending 3 requests, stop the server A program');
    return out.join('\n');
  },
  label: function (c) { return (c.servers === 'lb' ? '2 servers and a load balancer' : '1 server, direct connection') + ' · ' + (c.down ? 'Server A stopped after request #3' : 'Server A kept running'); },
  columns: ['Replies from A', 'Replies from B', 'Failed requests'],
  simulate: function (c) {
    var lb = c.servers === 'lb', down = !!c.down, N = 6, K = 3;
    var ev = [], sum = [], trace = [];
    var st = { n: 0, aUp: true, cntA: 0, cntB: 0, ansA: 0, ansB: 0, fail: 0, to: '', ref: '', say: '', err: false, phase: 'up', rows: [] };
    function push(s, k) { ev.push({ s: s, k: k, snap: JSON.parse(JSON.stringify(st)) }); }
    var up = { A: true, B: true }, marked = {}, rr = 0;
    // Step 1: the servers start
    push(lb ? 'The servers start. Two copies of the same server program start separately as server A and server B. Each one counts the requests it has received in its own memory, and when a request arrives it replies "I am A" or "I am B" together with that count. A load balancer starts in front of them. The client does not know how many servers there are. It knows only one address, localhost:8080. The program that receives requests at this address is the load balancer.'
      : 'The server starts. One server (server A) waits for requests at address 8080. Server A counts the requests it has received in its own memory, and when a request arrives it replies "I am A" together with that count. There is no load balancer in front, so the client connects to this server directly at localhost:8080.', '');
    for (var i = 1; i <= N; i++) {
      if (down && i === K + 1) {
        up.A = false; st.aUp = false; st.phase = 'kill'; st.to = ''; st.ref = '';
        push(lb ? 'After request #' + K + ', the server A program is stopped (the last line of the code box). Server A no longer accepts connections. Server B is still running. The load balancer in this lab learns that a server is stopped only when it tries to connect and the connection is refused, so it does not yet know that server A is stopped.'
          : 'After request #' + K + ', the server A program is stopped (the last line of the code box). Server A is the only server.', 'bad');
      }
      st.n = i; st.to = ''; st.ref = ''; st.say = ''; st.err = false;
      var ans = null, refused = [], skipped = [], turn = '';
      if (lb) {
        var order = (rr++ % 2 === 0) ? ['A', 'B'] : ['B', 'A']; turn = order[0];
        for (var j = 0; j < order.length; j++) {
          var nm = order[j];
          if (marked[nm]) { skipped.push(nm); continue; }
          if (!up[nm]) { refused.push(nm); marked[nm] = true; continue; }
          ans = nm; break;
        }
      } else if (up.A) ans = 'A';
      // The first request is shown in two steps ("sent" and "answered"), so in that case it is counted at the answer step
      var answer = function () {
        if (ans) { if (ans === 'A') { st.cntA++; st.ansA++; } else { st.cntB++; st.ansB++; } st.say = 'I am ' + ans + ', request #' + (ans === 'A' ? st.cntA : st.cntB); }
        else { st.fail++; st.err = true; }
        var rowWhere = lb ? (refused.length ? 'Server ' + refused.join(', ') + ' refused the connection → ' : '') + (skipped.length ? 'Server ' + skipped.join(', ') + ' skipped → ' : '') + 'Server ' + ans : 'Server A';
        st.rows.push(['Request #' + i, rowWhere, ans ? st.say : 'Connection refused error']);
        trace.push(ans ? ans + '#' + (ans === 'A' ? st.cntA : st.cntB) + (refused.length ? '<' + refused.join(',') + ' refused>' : '') : 'error ECONNREFUSED');
      };
      if (!(lb && i === 1)) answer();
      var hd = 'The client sends request #' + i + ', GET /. ';
      if (lb) {
        st.to = ans; st.ref = refused.length ? refused[0] : '';
        if (i === 1) {
          st.phase = 'sent'; st.to = turn; st.say = ''; var keepSay = 'I am ' + ans + ', request #1';
          push(hd + 'What receives the request at address 8080 is not a server but the load balancer. The load balancer passes this request to server ' + turn + ', the first server in its list.', '');
          answer(); st.phase = 'answer'; st.say = keepSay; st.to = ans;
          push('Server ' + ans + ' adds one to the number of received requests it keeps in its own memory and replies "' + keepSay + '". The load balancer returns this reply to the client unchanged. The text the client receives says which server replied.', 'good');
        } else if (refused.length) {
          st.phase = 'req';
                    push(hd + 'This time it is the turn of server ' + turn + ', so the load balancer tries to connect to server ' + turn + ', but the server ' + turn + ' program has been stopped, so the connection is refused (a connection refused error). The load balancer skips server ' + turn + ' and sends the same request to the next server, server ' + ans + '. Server ' + ans + ' adds one to the count it keeps in its own memory and replies "' + st.say + '", and the load balancer returns this reply. The client does not experience the refusal and gets a normal reply.', 'good');
        } else {
          st.phase = 'req';
          var extra = '';
          if (i === 2) extra = ' Server A has already replied once, but server B\'s count starts at "request #1". Each server counts the requests it has received separately, in its own memory.';
          if (skipped.length) extra = ' Server ' + skipped[0] + ' is skipped because its connection was refused earlier.';
          push(hd + 'The load balancer sends requests in turn, so this time it is the turn of server ' + ans + '. Server ' + ans + ' adds one to the count it keeps in its own memory and replies "' + st.say + '", and the load balancer returns this reply.' + extra, 'good');
        }
      } else {
        st.to = ans || ''; st.phase = 'req';
        if (ans) push(hd + (i === 1 ? 'There is no load balancer in front, so this request reaches server A directly. ' : 'This request also reaches server A directly. ') + 'Server A adds one to the number of received requests it keeps in its own memory and replies "' + st.say + '".', 'good');
        else if (i === K + 1) push(hd + 'The server A program has been stopped, so no program accepts connections at address 8080, and the client gets a connection refused error. The request did not reach a server and there is no reply. There is no load balancer in front, so there is no other server to take over.', 'bad');
        else push(hd + 'For the same reason, a connection refused error occurs. There is no reply.', 'bad');
      }
    }
    // Last step
    st.phase = 'end'; st.to = ''; st.ref = '';
    var tail = lb ? 'Server A replied ' + st.ansA + ' times and server B replied ' + st.ansB + ' times' : 'Server A replied ' + st.ansA + ' times';
    push('The ' + N + ' requests are finished. ' + tail + ', and ' + st.fail + ' requests failed. The count of received requests kept by server A is ' + st.cntA + (lb ? ', and the count kept by server B is ' + st.cntB : '') + '.', st.fail ? 'bad' : 'good');
    // Summary
    if (lb && !down) {
      sum.push('The load balancer receives requests at the one address the client connects to and sends them to server A and server B in turn. Of the 6 requests, server A replied to 3 and server B replied to 3.');
      sum.push('Each server counts received requests separately in its own memory. The first request server B received was "request #1", even though server A had already replied, and each of the two servers counted 3. A value kept in a server\'s memory exists only in that server\'s memory, and the other server does not know it.');
    } else if (lb && down) {
      sum.push('Even though the server A program was stopped after 3 requests, all 6 requests got a reply and 0 requests failed. The load balancer skipped server A, whose connection was refused, and sent the requests to the remaining server B.');
      sum.push('If one server stops and another is left, the service continues. But server B has to take all the rest by itself, so the count server B kept went on as request #2, #3, and #4, and reached 4.');
    } else if (!down) {
      sum.push('When you connect directly to the single server A without a load balancer, server A replied to all 6 requests. The count of received requests kept by server A also continued on one server, from request #1 to request #6.');
      sum.push('While the server is alive, there is no problem. When there was a load balancer, this count was kept separately for each server.');
    } else {
      sum.push('When server A is the only server and you stop the server A program after 3 requests, the 3 requests before that get replies, but the 3 requests after that (the 4th to the 6th) all fail with a connection refused error. After the stop, the client never got a reply.');
      sum.push('No other server is there to take over. If you depend on a single server without a load balancer, the whole service stops the moment that one server stops.');
    }
    return { events: ev, summary: sum, trace: trace, row: [String(st.ansA), lb ? String(st.ansB) : 'No server B', String(st.fail) + (st.fail ? ' (connection refused error)' : '')] };
  },
  render: function (v, sim, t, H, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : null;
    if (!s) { H.text(v, 'Click Run to start from the servers starting.'); return; }
    if (s.rows.length) H.table(v, ['Request', 'Sent to', 'What the client received'], s.rows.map(function (r) { return { cls: '', cells: [r[0], r[1], { v: r[2], cls: r[2].indexOf('I am') === 0 ? 'good' : 'bad' }] }; }), 'Requests and replies');
    H.counters(v, [[s.ansA, 'Replies from A'], [sim.c.servers === 'lb' ? s.ansB : '-', 'Replies from B'], [s.fail, 'Failed requests']]);
  },
  // Diagram: on the left the client, in the middle the load balancer (dotted when absent), on the right servers A and B. Arrows show which server a request reaches and where the connection is refused.
  draw: function (P, sim, shown) {
    var c = sim.c, lb = c.servers === 'lb', last = shown[shown.length - 1], s = last ? last.snap : null;
    var sending = s && (s.phase === 'sent' || s.phase === 'answer' || s.phase === 'req');
    P.size(680, 292);
    P.region('cl', 10, 16, 150, 206, 'Client');
    var cs;
    if (!s || !s.n) cs = ['Request 0 of 6', 'Waiting'];
    else if (s.phase === 'sent') cs = ['Request ' + s.n + ' of 6', 'Awaiting reply'];
    else if (s.phase === 'kill') cs = ['Request ' + s.n + ' of 6', 'Next not sent'];
    else if (s.err) cs = ['Request ' + s.n + ' of 6', 'Connection', 'refused', 'error'];
    else cs = ['Request ' + s.n + ' of 6', 'Reply received:'].concat(s.say.split(', '));
    P.box('c', 20, 44, 130, 162, { cls: s && s.err && sending ? 'bad' : sending ? 'wait' : 'plain', title: 'Requests', sub: cs });
    P.box('lb', 220, 95, 120, 62, { cls: lb ? (sending ? 'hot' : 'plain') : 'ghost', title: 'Load balancer', sub: lb ? ['Address 8080'] : ['(none)'] });
    P.region('sv', 440, 16, 230, 206, 'Servers');
    var aOn = s && sending && s.to === 'A', bOn = s && sending && s.to === 'B';
    P.box('a', 450, 36, 210, 70, { cls: s && !s.aUp ? 'bad' : aOn ? (s.phase === 'sent' ? 'hot now' : 'good now') : 'plain', title: 'Server A', sub: ['Requests received: ' + (s ? s.cntA : 0), s && !s.aUp ? 'Stopped' : 'Running'] });
    P.box('b', 450, 132, 210, 70, { cls: lb ? (bOn ? (s.phase === 'sent' ? 'hot now' : 'good now') : 'plain') : 'ghost', title: 'Server B', sub: lb ? ['Requests received: ' + (s ? s.cntB : 0), 'Running'] : ['(none)'] });
    if (sending) {
      if (lb) {
        P.arrow('rq', 'c:r:0.5', 'lb:l', {});
        if (s.to) P.arrow('fw', 'lb:r:' + (s.to === 'A' ? '0.25' : '0.75'), (s.to === 'A' ? 'a' : 'b') + ':l:0.5', { cls: 'good' });
        if (s.ref) P.arrow('rf', 'lb:r:' + (s.ref === 'A' ? '0.25' : '0.75'), (s.ref === 'A' ? 'a' : 'b') + ':l:0.5', { cls: 'bad' });
      } else {
        P.arrow('rq', 'c:r:0.2', 'a:l:0.5', { cls: s.err ? 'bad' : 'good' });
      }
    }
    P.box('n1', 14, 240, 214, 36, { cls: s && s.ansA ? 'good' : 'ghost', title: 'Replies from A', right: String(s ? s.ansA : 0) });
    P.box('n2', 233, 240, 214, 36, { cls: lb && s && s.ansB ? 'good' : 'ghost', title: 'Replies from B', right: lb ? String(s ? s.ansB : 0) : 'None' });
    P.box('n3', 452, 240, 214, 36, { cls: s && s.fail ? 'bad' : 'ghost', title: 'Failed requests', right: String(s ? s.fail : 0) });
  },
  assume: 'Server A (and server B) is an http server of Node.js 24.18.0, and each server counts the requests it has received in its own variable and replies like "I am A, request #1". The load balancer is not a product such as NGINX but one built by hand as an http server of the same Node.js. For each request it moves the starting position in the server list by one (A, B, A, B...), forwards the request to that server on a new connection, skips a server whose connection is refused and sends the same request to the next server, and does not try a server again after it has refused once. The client sent a GET / request 6 times in a row with the http module, on a new connection for each request. Stopping server A was done by closing that server\'s listening socket and its open connections instead of ending the process, and after it was closed, a connection from the client or the load balancer gave ECONNREFUSED (a connection refused error). I ran all four combinations and checked against the model the number of replies from server A and server B, the number of failed requests, which server replied to each of the 6 requests and as which request number, the counts the servers kept in memory, the requests and servers for which the load balancer had its connection refused, and the request text the server received. I also checked for each combination that the code on the screen has the same content as that setup. The code on the screen is a description of that setup, not the program that was run, and 8080, 9001, and 9002 on the screen are example addresses; the real runs used free ports. These are behaviors observed in this implementation. What I checked against documentation is RFC 9110 section 3.7 (the definition that a gateway, that is a reverse proxy, is an intermediary that forwards received requests to another server or to several servers inside) and the NGINX documentation (ngx_http_upstream_module at nginx.org: requests are distributed among the servers by weighted round robin by default, and max_fails with a default of 1 and fail_timeout with a default of 10 seconds make a failed server be considered unavailable for that time; ngx_http_proxy_module: the default of proxy_next_upstream is error timeout, and error includes an error that occurred while establishing a connection with the server). In our test run, we did not run NGINX itself. The load balancer in this lab was only built to act in the same spirit as NGINX, and it was not checked against the real behavior of NGINX. Not covered: the case where the load balancer itself stops, the case where a stopped server starts again and comes back, health checks that check the state of servers periodically, servers with different processing power or weights, sending requests from the same user to the same server, and the limit a server can bear when there are very many requests. How far throughput grows when you add servers is covered in the in-depth lab "Load balancers and scale out", how to replace servers one at a time in a deployment is covered in "Deployment strategies", and automatically starting a dead server again is covered in "Kubernetes self-healing".',
});

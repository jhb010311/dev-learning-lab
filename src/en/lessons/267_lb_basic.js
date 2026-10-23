Lab.register({
  id: 'lb_basic', nav: 'Load balancers', cat: 'Fundamentals', mode: 'step', basic: true, deep: ['scale', 'deploy', 'k8s'],
  title: 'Where does a request go when you run several servers?',
  why: 'If there is only one server, that one server has to receive every request even when requests increase, and if it goes down, the whole service stops. Just starting several servers does not decide which server receives which request, or how to avoid a server that is down. A load balancer makes one entrance for incoming requests and sends them on to the servers that are alive, so even when you add servers or one of them goes down, clients keep using the same address.',
  use: 'A web service with many users starts the same Spring Boot server on several machines and puts a load balancer in front of them. The most common one is nginx: you write the server addresses in the upstream block of the nginx configuration and pass requests to that group with proxy_pass. Load balancers that cloud companies provide do the same job, and they are also used to take servers out and put them back one at a time when you switch to a new version. A value that must continue across requests, such as a login state, is not kept only in the memory of one server; it is usually kept in a place that several servers look at together, such as Redis or a database.',
  intro: 'When there are more requests than one server can handle, you start the same server program on several machines. But it is inconvenient if the client (the side that sends requests) has to know several server addresses. So the client connects to just one address, and a load balancer that receives requests at that address sends them on to the servers. This lab compares a setup where the client connects directly to one server with a setup that puts a load balancer in front of two servers. For the load balancer it uses nginx, the most common one. The code box has three parts: the nginx configuration (the upstream block lists the addresses of server A and server B, and proxy_pass passes requests to that group), the commands that start the servers (the same app.jar is started twice with only the port changed), and the Spring Boot controller of each server. A line that starts with # is an explanation. The controller counts the requests it received in its own memory and answers like "I am A, request #1". You remove the load balancer and stop server A after 3 requests, and see how the answers the client receives change.',
  terms: ['Load balancer', 'nginx upstream and proxy_pass', 'Round robin', 'Skipping a failed server', 'Spring Boot command line arguments (--server.port)', 'Connection refused error'],
  controls: [
    { id: 'servers', label: 'Server setup', type: 'select', value: 'lb', options: [['lb', 'Servers A and B, with nginx in front'], ['one', 'Server A only (connect directly, without nginx)']] },
    { id: 'down', label: 'Stop server A after sending 3 requests', type: 'check', value: false },
  ],
  // q is the question shown on the question-style screen. t and d are the name and the description used in the text-only reading
  presets: [
    { t: 'Default settings', q: 'What does the setup that puts nginx in front of server A and server B as a load balancer look like, and where do the 6 requests go?', d: 'It lists the two servers in upstream and passes requests with proxy_pass. Requests go to A and B in turn.', v: { servers: 'lb', down: false } },
    { t: 'If server A is stopped', q: 'If server A is stopped after 3 requests, where does nginx send the requests?', d: 'nginx skips server A, whose connection is refused, and the client gets answers with no failure.', v: { servers: 'lb', down: true } },
    { t: 'One server without a load balancer', q: 'What if you remove nginx and connect directly to the one server A?', d: 'There is only one server, so it receives every request.', v: { servers: 'one', down: false } },
    { t: 'One server, and it is stopped', q: 'With only the one server A, what if you stop server A after 3 requests?', d: 'There is no server to receive them, so every request after that fails.', v: { servers: 'one', down: true } },
  ],
  // The check program (verify/net/lb_basic_probe_boot.js) reads the code on the screen as it is:
  // it compiles the Java part as it is and starts it as Spring Boot, starts the servers with the arguments of the java -jar lines, and reads the upstream, listen, and proxy_pass of the nginx configuration and gives them to the model that stands in for nginx.
  code: function (c) {
    var o = [], lb = c.servers === 'lb';
    if (lb) {
      o.push('# nginx configuration (put it in the http { } block of nginx.conf. It receives on port 8080 and splits requests between server A and server B)',
        'upstream app {',
        '    server 127.0.0.1:8081;    # server A',
        '    server 127.0.0.1:8082;    # server B');
      if (c.down) o.push('    # not written, but each server has max_fails=1 fail_timeout=10s by default');
      o.push('}',
        '',
        'server {',
        '    listen 8080;',
        '',
        '    location / {',
        '        proxy_pass http://app;    # splits requests among the servers of upstream app');
      if (c.down) o.push('        # not written, but proxy_next_upstream error timeout; is the default');
      o.push('    }',
        '}',
        '',
        '# Start server A and server B: start the same app.jar twice, changing only the port and the name',
        '# --server.port is a setting that Spring Boot defines (the port the server opens), --app.name is a setting chosen for this example (the name of the server)',
        'java -jar app.jar --server.port=8081 --app.name=A',
        'java -jar app.jar --server.port=8082 --app.name=B');
    } else {
      o.push('# No nginx: server A alone receives directly on port 8080',
        '# --server.port is a setting that Spring Boot defines (the port the server opens), --app.name is a setting chosen for this example (the name of the server)',
        'java -jar app.jar --server.port=8080 --app.name=A');
    }
    o.push('',
      '# Client: curl http://localhost:8080/ sends 6 requests');
    if (c.down) o.push('# After request #3, server A is stopped (Ctrl+C in the window where server A was started)');
    o.push('',
      '// HelloController.java  (HelloController is a controller made for this example. @RestController, @GetMapping, and @Value come from Spring,',
      '// and AtomicInteger comes from Java. The start class annotated with @SpringBootApplication is omitted)',
      'import java.util.concurrent.atomic.AtomicInteger;',
      'import org.springframework.beans.factory.annotation.Value;',
      'import org.springframework.web.bind.annotation.GetMapping;',
      'import org.springframework.web.bind.annotation.RestController;',
      '',
      '@RestController',
      'public class HelloController {',
      '    @Value("${app.name}")',
      '    private String name;                                       // the --app.name value given at startup (A or B)',
      '',
      '    private final AtomicInteger count = new AtomicInteger();  // the number of requests this server received (it exists only in the memory of this server)',
      '',
      '    @GetMapping("/")',
      '    public String hello() {',
      '        return "I am " + name + ", request #" + count.incrementAndGet();',
      '    }',
      '}');
    return o.join('\n');
  },
  label: function (c) { return (c.servers === 'lb' ? '2 servers and nginx' : '1 server, direct connection') + ' · ' + (c.down ? 'server A stopped after request #3' : 'server A stays on'); },
  columns: ['Replies from A', 'Replies from B', 'Failed requests'],
  simulate: function (c) {
    var lb = c.servers === 'lb', down = !!c.down, N = 6, K = 3;
    var ev = [], sum = [], trace = [];
    var st = { n: 0, aUp: true, cntA: 0, cntB: 0, ansA: 0, ansB: 0, fail: 0, to: '', ref: '', say: '', err: false, phase: 'up', rows: [] };
    function push(s, k) { ev.push({ s: s, k: k, snap: JSON.parse(JSON.stringify(st)) }); }
    // Behavior from the nginx documentation: round robin with equal weights (A, B, A, B...), on a connection error go to the next server (proxy_next_upstream error),
    // a server that failed max_fails=1 time is not used for fail_timeout=10 seconds (the 6 requests finish within 10 seconds)
    var up = { A: true, B: true }, marked = {}, rr = 0;
    // Step 1: the servers start
    push(lb ? 'The servers start. The same app.jar is started twice with java -jar, so the same Spring Boot program runs separately as server A (port 8081, --app.name=A) and server B (port 8082, --app.name=B). The HelloController of each server counts the requests it received in its own count field. In front of them, nginx waits for requests on port 8080 as the line listen 8080 says. The client does not know how many servers there are and knows only the one address, localhost:8080. What receives requests at this address is nginx.'
      : 'The server starts. One server A waits for requests on port 8080 as the argument --server.port=8080 says. The HelloController of server A counts the requests it received in its count field. There is no nginx in front, so the client connects directly to this server at the address localhost:8080.', '');
    for (var i = 1; i <= N; i++) {
      if (down && i === K + 1) {
        up.A = false; st.aUp = false; st.phase = 'kill'; st.to = ''; st.ref = '';
        push(lb ? 'After sending ' + K + ' requests, server A is stopped (the Ctrl+C line in the code box). Server A no longer accepts connections. Server B stays on. This setup has no mechanism that checks the state of the servers beforehand, so nginx does not know that server A is down until it tries to connect to it.'
          : 'After sending ' + K + ' requests, server A is stopped (the Ctrl+C line in the code box). The only server is server A.', 'bad');
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
      // The first request is shown in two steps, "sent" and "answered", so in that case it is counted in the answering step
      var answer = function () {
        if (ans) { if (ans === 'A') { st.cntA++; st.ansA++; } else { st.cntB++; st.ansB++; } st.say = 'I am ' + ans + ', request #' + (ans === 'A' ? st.cntA : st.cntB); }
        else { st.fail++; st.err = true; }
        var rowWhere = lb ? 'nginx → ' + (refused.length ? 'server ' + refused.join(', ') + ' connection refused → ' : '') + (skipped.length ? 'server ' + skipped.join(', ') + ' skipped → ' : '') + 'server ' + ans : 'Server A (direct)';
        st.rows.push(['Request #' + i, rowWhere, ans ? st.say : 'Connection refused error']);
        trace.push(ans ? ans + '#' + (ans === 'A' ? st.cntA : st.cntB) + (refused.length ? '<' + refused.join(',') + ' refused>' : '') : 'error ECONNREFUSED');
      };
      if (!(lb && i === 1)) answer();
      var hd = 'The client sends a GET / request (request #' + i + '). ';
      if (lb) {
        st.to = ans; st.ref = refused.length ? refused[0] : '';
        if (i === 1) {
          st.phase = 'sent'; st.to = turn; st.say = ''; var keepSay = 'I am ' + ans + ', request #1';
          push(hd + 'What receives this request on port 8080 is not a Spring Boot server but nginx. Following the line proxy_pass http://app; in location /, nginx passes the request to one of the servers listed in upstream app. No method of splitting was written, so it uses the default method, round robin (going around in turn, one server at a time), and the first request goes to the first server in the list, server ' + turn + ' (port 8081).', '');
          answer(); st.phase = 'answer'; st.say = keepSay; st.to = ans;
          push('The hello() method of server ' + ans + ' adds 1 to count and returns "' + keepSay + '". nginx returns this answer to the client as it is. The text the client received says which server answered.', 'good');
        } else if (refused.length) {
          st.phase = 'req';
          push(hd + 'By round robin it is the turn of server ' + turn + ', so nginx tries to connect to server ' + turn + ' (port 8081), but server ' + turn + ' was stopped, so the connection is refused (a connection refused error). Following the default error of proxy_next_upstream, nginx passes the same request to the next server, server ' + ans + '. Also, since the default of max_fails is 1, this one failure marks server ' + turn + ' as a server not to be used for fail_timeout (10 seconds by default). Server ' + ans + ' adds 1 to count and returns "' + st.say + '", and nginx returns this answer. The client does not know about the refusal and receives a normal answer.', 'good');
        } else {
          st.phase = 'req';
          var extra = '';
          if (i === 2) extra = ' Server A has already replied once, but the count of server B starts at "request #1". This is because each server has its own count in its own memory.';
          if (skipped.length) extra = ' By round robin it is the turn of server ' + skipped[0] + ', but it is a server that is not used for 10 seconds because its connection was refused earlier, so nginx skips it without even trying to connect.';
          var outs = Object.keys(marked).filter(function (x) { return x !== ans && skipped.indexOf(x) < 0; });
          if (outs.length) extra += ' Server ' + outs.join(', ') + ' is a server that is not used for 10 seconds because of an earlier failure, so it is out of the candidates nginx picks from.';
          push(hd + (skipped.length ? 'nginx passes this request to server ' + ans + '. ' : 'nginx passes requests going around in turn, so this time it is the turn of server ' + ans + '. ') + 'Server ' + ans + ' adds 1 to count and returns "' + st.say + '", and nginx returns this answer.' + extra, 'good');
        }
      } else {
        st.to = ans || ''; st.phase = 'req';
        if (ans) push(hd + (i === 1 ? 'There is no nginx in front, so this request reaches server A directly. ' : 'This request also reaches server A directly. ') + 'The hello() method of server A adds 1 to count and returns "' + st.say + '".', 'good');
        else if (i === K + 1) push(hd + 'Server A was stopped, so no program accepts connections on port 8080, and the client gets a connection refused error. The request did not reach a server and there is no answer. There is no load balancer in front, so there is no other server to receive it either.', 'bad');
        else push(hd + 'For the same reason, a connection refused error occurs. There is no answer.', 'bad');
      }
    }
    // Last step
    st.phase = 'end'; st.to = ''; st.ref = '';
    var tail = lb ? 'Replies from server A: ' + st.ansA + ', from server B: ' + st.ansB : 'Replies from server A: ' + st.ansA;
    push('All ' + N + ' requests are finished. ' + tail + '. Failed requests: ' + st.fail + '. The count of server A is ' + st.cntA + (lb ? ', and the count of server B is ' + st.cntB : '') + '.', st.fail ? 'bad' : 'good');
    // Summary
    if (lb && !down) {
      sum.push('If you list two servers in upstream app in the nginx configuration and pass requests with proxy_pass http://app;, nginx receives requests at the one address the client connects to (port 8080) and sends them to server A and server B in turn (round robin, the default method). Of the 6 requests, server A replied to 3 and server B replied to 3.');
      sum.push('Each server counts the requests it received separately in its own count, in its own memory. The first request server B received was "request #1" even though server A had already replied, and the count of each server is 3. A value kept in the memory of one server is unknown to the other server.');
    } else if (lb && down) {
      sum.push('Even though server A was stopped after 3 requests, all 6 requests got an answer and 0 requests failed. With the defaults that apply even when not written (proxy_next_upstream error timeout, max_fails=1, fail_timeout=10s), nginx skipped server A, whose connection was refused, passed the same request to server B, and marked server A as not to be used for 10 seconds.');
      sum.push('Even if one server goes down, the service continues as long as another server remains. But server B had to take all the rest by itself, so the answers of server B continued as request #2, #3, and #4.');
    } else if (!down) {
      sum.push('If you connect directly to the one server A without nginx, server A replied to all 6 requests. The count of server A also continued from #1 to #6 in the one server.');
      sum.push('While the server is alive, there is no problem. With nginx in front of two servers, the requests were split between the two servers and each server counted separately.');
    } else {
      sum.push('If you stop server A when it is the only server, after request #3, the 3 requests before stopping get answers, but the 3 requests after stopping (#4 to #6) all fail with a connection refused error. After stopping, the client never got an answer.');
      sum.push('There is no server to receive them instead. If you rely on one server without a load balancer, the whole service stops the moment that one server goes down. In the setup with nginx in front of two servers, stopping server A at the same point left 0 failed requests.');
    }
    return { events: ev, summary: sum, trace: trace, row: [String(st.ansA), lb ? String(st.ansB) : 'No server B', String(st.fail) + (st.fail ? ' (connection refused error)' : '')] };
  },
  render: function (v, sim, t, H, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : null;
    if (!s) { H.text(v, 'Click Run to start with the servers starting.'); return; }
    if (s.rows.length) H.table(v, ['Request', 'Sent to', 'What the client received'], s.rows.map(function (r) { return { cls: '', cells: [r[0], r[1], { v: r[2], cls: r[2].indexOf('I am') === 0 ? 'good' : 'bad' }] }; }), 'Requests and replies');
    H.counters(v, [[s.ansA, 'Replies from A'], [sim.c.servers === 'lb' ? s.ansB : '-', 'Replies from B'], [s.fail, 'Failed requests']]);
  },
  // Diagram: the client on the left, nginx in the middle (faded if absent), and servers A and B on the right. Arrows show which server a request reaches and where the connection is refused.
  draw: function (P, sim, shown) {
    var c = sim.c, lb = c.servers === 'lb', last = shown[shown.length - 1], s = last ? last.snap : null;
    var sending = s && (s.phase === 'sent' || s.phase === 'answer' || s.phase === 'req');
    P.size(680, 292);
    P.region('cl', 10, 16, 150, 206, 'Client');
    var cs;
    if (!s || !s.n) cs = ['Request 0 of 6', 'Waiting'];
    else if (s.phase === 'sent') cs = ['Request ' + s.n + ' of 6', 'Awaiting reply'];
    else if (s.phase === 'kill') cs = ['Request ' + s.n + ' of 6', 'Next not sent'];
    else if (s.err) cs = ['Request ' + s.n + ' of 6', 'Connection', 'refused error'];
    else cs = ['Request ' + s.n + ' of 6', 'Reply received:'].concat(s.say.split(', '));
    P.box('c', 20, 44, 130, 162, { cls: s && s.err && sending ? 'bad' : sending ? 'wait' : 'plain', title: 'Requests', sub: cs });
    P.box('lb', 220, 88, 120, 76, { cls: lb ? (sending ? 'hot' : 'plain') : 'ghost', title: 'nginx', sub: lb ? ['Load balancer', 'Port 8080'] : ['(none)'] });
    P.region('sv', 440, 16, 230, 206, 'Spring Boot servers');
    var aOn = s && sending && s.to === 'A', bOn = s && sending && s.to === 'B';
    P.box('a', 450, 36, 210, 70, { cls: s && !s.aUp ? 'bad' : aOn ? (s.phase === 'sent' ? 'hot now' : 'good now') : 'plain', title: 'Server A (port ' + (lb ? '8081' : '8080') + ')', sub: ['count ' + (s ? s.cntA : 0), s && !s.aUp ? 'Stopped' : 'Running'] });
    P.box('b', 450, 132, 210, 70, { cls: lb ? (bOn ? (s.phase === 'sent' ? 'hot now' : 'good now') : 'plain') : 'ghost', title: 'Server B' + (lb ? ' (port 8082)' : ''), sub: lb ? ['count ' + (s ? s.cntB : 0), 'Running'] : ['(none)'] });
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
  assume: 'Server A and server B are real Spring Boot 4.1.1 (Spring 7.0.9, embedded Tomcat 11.0.24, JDK 21). The HelloController on the screen was compiled as it is, and the servers were started with the --server.port and --app.name arguments written in the java -jar lines on the screen, given as they are. However, instead of packing them into a jar, they were started from the compiled classes, and the start class that the screen omits was kept separately for the test. nginx is not on this computer, so it was not run. Instead, a model for running that stands in for nginx (a small program written in Node.js 24.18.0) read the server lines of upstream, listen, and proxy_pass from the nginx configuration on the screen, and passed requests on as the nginx documentation describes. It picks servers by round robin with equal weights, passes the same request to the next server on a connection error or timeout (the default of proxy_next_upstream, error timeout), and does not pick a server that failed max_fails (default 1) times for fail_timeout (default 10 seconds). That the first request goes to the first server in the list (server A) is not written in the documentation, so it was decided by carrying over the way the nginx source (ngx_http_upstream_round_robin.c) picks servers (the server earlier in the list when the weights are equal). The client sent the GET / request 6 times in turn, each time on a new connection. Stopping server A was done by ending the process of server A instead of Ctrl+C, and connecting after that gave ECONNREFUSED (a connection refused error). The ports 8080, 8081, and 8082 on the screen were replaced in the run with other free ports (18270 to 18272). All four combinations were run, and we checked against the model the number of replies from server A and server B, the number of failed requests, which server answered each of the 6 requests and as its how-manyth answer, the text the client received, the count of the servers, and the requests whose connection was refused. So the answers of the Spring Boot servers are real run results, while the splitting of requests and the skipping of a stopped server are results of a model built to follow the documentation, and were not checked with real nginx. The nginx configuration was checked against the nginx.org documentation. ngx_http_upstream_module: upstream goes in the http block, the default distribution is weighted round robin, the default of max_fails is 1, and the default of fail_timeout is 10 seconds. ngx_http_proxy_module: the name of a server group (upstream) can be used in proxy_pass, the default of proxy_next_upstream is error timeout, and error is an error that occurs while making a connection with the server, passing a request to it, or reading the response header. The round robin turn is counted separately by each nginx worker process (the default of worker_processes is 1, and if you put a zone in upstream, the worker processes count together). With several worker processes, the order A, B, A, B may differ from this lab. Not covered: the case where nginx itself stops, the case where the stopped server starts again and comes back after 10 seconds, health checks that check the state of the servers periodically, giving each server a different share with weight, other ways of splitting such as least_conn and ip_hash, the case where a server stops while sending an answer, and the limit a server can hold out when there are very many requests. You can also write a load balancer yourself as a program. The model used to run this lab is such an example, and in a few dozen lines you can try round robin and skipping a failed server. But in a real service you use nginx or a cloud load balancer. How far throughput grows when you add servers is covered in the in-depth lab "Load balancers and scale out", how to deploy by replacing servers one at a time in "Deployment strategies", and automatically restarting a dead server in "Kubernetes self-healing".',
});

Lab.register({
  id: 'restclient', nav: 'Calling external APIs and timeouts', cat: 'Spring', mode: 'step',
  title: 'When a call to another server gets no answer, how long does it wait?',
  intro: 'The order server calls the API of the payment server. The calling thread stops and waits until the result comes back, and a timeout sets how long it waits before giving up. There are two timeouts. The connect timeout measures the time until the connection is established, and the read timeout is the limit on how long it waits, after the connection is established, while no data arrives. If you do not set them, the client never gives up on its own. Change the state of the remote server and the timeouts to see which timeout expires and when. The 2 seconds, 3 seconds, and 10 seconds on the screen are example values.',
  terms: ['Connect timeout and read timeout', 'RestClient', 'Tomcat\'s threading model', 'Three-way handshake', 'HTTP status codes'],
  controls: [
    { id: 'server', label: 'State of the remote server (the payment server)', type: 'select', value: 'slow', options: [['ok', 'Normal: responds with 200 right away'], ['slow', 'Slow: accepts the connection but responds after 10 seconds'], ['noanswer', 'No answer to the connection request (the machine is off or a firewall drops the request)'], ['refused', 'Connection refused (the server program is not running)'], ['e404', 'Responds with 404 right away'], ['e500', 'Responds with 500 right away']] },
    { id: 'ct', label: 'Set a connect timeout (2 seconds)', type: 'check', value: true },
    { id: 'rt', label: 'Set a read timeout (3 seconds)', type: 'check', value: false },
  ],
  presets: [
    { t: 'Default settings', q: 'What happens when you call a server that accepts the connection but responds after 10 seconds, with only a 2-second connect timeout set?', d: 'Only the connect timeout is set. It does not cover a slow response, so the thread waits 10 seconds.', v: { server: 'slow', ct: true, rt: false } },
    { t: 'Setting the read timeout as well', q: 'What if you also set a read timeout of 3 seconds?', d: 'If the response does not arrive within 3 seconds, the thread stops waiting.', v: { server: 'slow', ct: true, rt: true } },
    { t: 'Server that does not answer, no timeouts', q: 'What if the server gives no answer to the connection request and you set no connect timeout?', d: 'The thread stays occupied until the operating system gives up.', v: { server: 'noanswer', ct: false, rt: false } },
    { t: 'Server that does not answer, read timeout only', q: 'What if the server gives no answer to the connection request, and you set no connect timeout but set a 3-second read timeout?', d: 'The read timeout is of no use during the connection phase.', v: { server: 'noanswer', ct: false, rt: true } },
    { t: 'Server that does not answer, connect timeout', q: 'What if the server gives no answer to the connection request, and you set a 2-second connect timeout and a 3-second read timeout?', d: 'The call gives up after 2 seconds and releases the thread.', v: { server: 'noanswer', ct: true, rt: true } },
    { t: 'When the server program is not running', q: 'What if the server program is not running and refuses the connection, and you also set a 3-second read timeout?', d: 'The refusal comes back right away, so the call does not wait for a timeout.', v: { server: 'refused', ct: true, rt: true } },
    { t: 'When a 404 or 500 comes back', q: 'What if the server responds with 404 right away and a 3-second read timeout is set?', d: 'The response arrived, but in the calling code it shows up as an exception.', v: { server: 'e404', ct: true, rt: true } },
  ],
  code: function (c) {
    return '// Only the lines inside main are shown (class, main declaration, and imports omitted)\nSimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();\n'
      + (c.ct ? 'factory.setConnectTimeout(Duration.ofSeconds(2));   // connect timeout\n' : '// no connect timeout is set (waits until the operating system gives up)\n')
      + (c.rt ? 'factory.setReadTimeout(Duration.ofSeconds(3));      // read timeout\n' : '// no read timeout is set (waits with no limit)\n')
      + '\nRestClient client = RestClient.builder()\n        .requestFactory(factory)\n        .build();\n\ntry {\n    String body = client.get()\n            .uri("http://pay-server/payments/1")\n            .retrieve()\n            .body(String.class);            // this thread waits here until the result comes back\n} catch (HttpClientErrorException e) {      // 4xx response\n} catch (HttpServerErrorException e) {      // 5xx response\n} catch (ResourceAccessException e) {       // connection failure, timeout\n}';
  },
  label: function (c) { return { ok: 'Normal server', slow: 'Slow server (10s)', noanswer: 'Server that does not answer', refused: 'Connection refused', e404: '404 response', e500: '500 response' }[c.server] + ' · Connect timeout: ' + (c.ct ? '2s' : 'none') + ' · Read timeout: ' + (c.rt ? '3s' : 'none'); },
  columns: ['Result', 'Exception the calling code received', 'Time the calling thread waited', 'Handling by the remote server'],
  simulate: function (c) {
    var S = c.server, ct = !!c.ct, rt = !!c.rt, ev = [], sum = [];
    var st = { thread: 'Before the call', waited: '0s', conn: '', req: false, resp: '', ctS: ct ? 'Counts from the connection attempt' : 'Not set: until the OS gives up', ctK: ct ? 'plain' : 'ghost', rtS: rt ? 'Counts after the connection is made' : 'Not set: waits with no limit', rtK: rt ? 'plain' : 'ghost', srv: S === 'refused' ? 'Server program not running' : S === 'noanswer' ? 'No answer' : 'Waiting for a request', result: '', ex: '' };
    function push(s, k) { ev.push({ s: s, k: k || '', snap: JSON.parse(JSON.stringify(st)) }); }
    var result = '', ex = 'None', wait = 'right away', served = 'Handled the request', cause = '-', ms = 0, status = '-';
    function finish(r, e) { result = r; ex = e; st.result = r; st.ex = e; st.thread = 'Released'; if (st.waited === '0s') st.waited = 'Almost none'; }

    st.thread = 'Call started';
    push('Calling client.get() ... body(String.class): One thread of the order server starts calling the payment server. RestClient holds this thread until the result comes back, so during that time the thread cannot handle other requests.');

    st.thread = 'Waiting to connect'; st.conn = 'try'; if (ct) { st.ctS = 'Counting now'; st.ctK = 'hot now'; }
    push('Connection attempt: Before the HTTP request can be sent, a TCP connection to the payment server must be established. The connection request is sent.' + (ct ? ' The 2-second connect timeout starts counting from this point.' : ' No connect timeout is set.'));

    if (S === 'refused') {
      st.conn = 'refused'; served = 'Request did not arrive'; cause = 'ConnectException'; if (ct) { st.ctS = 'Not used: the refusal came first'; st.ctK = 'plain'; } if (rt) st.rtS = 'Never started: no connection';
      finish('Could not connect (connection refused)', 'ResourceAccessException');
      push('Connection refused: The payment server machine is on, but no program is listening on that port. The operating system of the remote machine returns a "refusal" right away, so there is nothing to wait for. Regardless of the timeout settings, a ResourceAccessException is thrown immediately (the cause is a ConnectException).');
    } else if (S === 'noanswer') {
      st.conn = 'silent'; served = 'Request did not arrive';
      push('No answer: Neither an acceptance nor a refusal comes back for the connection request. This happens when the remote machine is off or when a firewall in between silently drops the request. The thread is stopped, waiting for an answer.');
      if (rt) st.rtS = 'Never started: no connection';
      if (ct) {
        st.conn = 'timeout'; st.waited = '2s'; st.ctS = 'Stopped the wait after 2s'; st.ctK = 'bad'; wait = '2s'; ms = 200; cause = 'SocketTimeoutException';
        finish('Could not connect (connect timeout)', 'ResourceAccessException');
        push('Connect timeout (2 seconds): The connection was not established within 2 seconds. The wait is stopped and a ResourceAccessException is thrown (the cause is a SocketTimeoutException). The thread is released after 2 seconds.' + (rt ? ' The read timeout starts counting only after the connection is established, so it was not used this time.' : ''));
      } else {
        st.conn = 'osfail'; st.waited = 'Until the OS gave up'; wait = 'until the operating system gave up'; ms = -1; cause = 'ConnectException';
        finish('Could not connect (the operating system gave up)', 'ResourceAccessException');
        push('No connect timeout: Nothing stops the wait.' + (rt ? ' The read timeout (3 seconds) counts only while the caller waits for the response after the connection is established, so it is of no use here.' : '') + ' The thread stays occupied until the operating system gives up on the connection, and only then does it receive a ResourceAccessException (the cause is a ConnectException). On the PC used for the check (Windows 11), this took about 21 seconds, and the time differs depending on the operating system and its settings.', 'bad');
      }
    } else {
      st.conn = 'ok'; if (ct) { st.ctS = 'Done: the connection is established'; st.ctK = 'plain'; }
      push('Connection established: The payment server accepts the connection right away.' + (ct ? ' The job of the connect timeout ends here. However long things take after this, the connect timeout does not expire.' : ''));

      st.req = true; st.thread = 'Waiting for a response'; st.srv = S === 'slow' ? 'Handling the request (10s)' : 'Handling the request'; if (rt) { st.rtS = 'Counting now'; st.rtK = 'hot now'; }
      push('GET /payments/1 sent: The request is sent over the established connection, and the thread waits for the response.' + (rt ? ' The 3-second read timeout starts counting from this point.' : ' No read timeout is set.'));

      if (S === 'slow' && rt) {
        st.waited = '3s'; st.rtS = 'Stopped the wait after 3s'; st.rtK = 'bad'; st.resp = 'none'; wait = '3s'; ms = 300; cause = 'SocketTimeoutException';
        finish('No response received (read timeout)', 'ResourceAccessException');
        push('Read timeout (3 seconds): No response arrived within 3 seconds. The wait is stopped and a ResourceAccessException is thrown (the cause is a SocketTimeoutException). The thread is released after 3 seconds.');
        st.srv = 'Finished handling (after 10s)';
        push('On the payment server: It does not know that the caller gave up, so it keeps handling the request and finishes after 10 seconds. A timeout means "the response was not received", not "the request was not handled".');
      } else if (S === 'slow') {
        st.waited = '10s'; wait = '10s'; ms = 1000; status = '200';
        push('No read timeout: Nothing stops the wait.' + (ct ? ' The job of the connect timeout (2 seconds) ended when the connection was established, so it is of no use here.' : '') + ' The thread stays occupied for 10 seconds, until the response arrives.', 'bad');
        st.resp = '200'; st.srv = 'Finished and responded';
        finish('200 response received', 'None');
        push('Response arrives: After 10 seconds, the payment server sends a 200 response. RestClient converts the body to a string and returns it. The result is a success, but one thread could do no other work for 10 seconds.');
      } else {
        var code = S === 'ok' ? '200' : S === 'e404' ? '404' : '500'; status = code;
        st.resp = code; st.srv = 'Finished and responded'; if (rt) { st.rtS = 'Not used: the response came first'; st.rtK = 'plain'; }
        if (S === 'ok') {
          finish('200 response received', 'None');
          push('Response arrives: The payment server sends a 200 response right away. RestClient converts the body to a string and returns it, and the thread is released.', 'good');
        } else {
          push('Response arrives: The payment server sends a ' + code + ' response right away. The response arrived in time, so it has nothing to do with timeouts.');
          finish(code + ' response received', S === 'e404' ? 'HttpClientErrorException' : 'HttpServerErrorException');
          push('Status code check: ' + (S === 'e404' ? 'When RestClient receives a 4xx response, it throws an HttpClientErrorException instead of returning the body.' : 'When RestClient receives a 5xx response, it throws an HttpServerErrorException instead of returning the body.') + ' The response arrived normally, but in the calling code it shows up as an exception. The status code that was received is available from getStatusCode() of the exception.');
        }
      }
    }
    if (S === 'slow' && !rt) sum.push('If you do not set a read timeout, the wait has no limit. When the payment server slows down, the threads of the order server stay occupied for that long, and when many requests come in at once, all the threads in the thread pool become occupied and the order server itself can no longer respond.' + (ct ? ' The connect timeout alone does not protect against a slow response. The two timeouts measure different intervals, so you must set both.' : ''));
    if (S === 'slow' && rt) sum.push('The read timeout released the thread after 3 seconds. However, the payment server handled that request to the end. If you send the same request again because a timeout occurred, it can be handled twice (the "Retries and idempotency" lab covers this).');
    if (S === 'noanswer' && ct) sum.push('The connect timeout expires when the connection is not established. Normally a connection is established very quickly, so the connect timeout is usually set shorter than the read timeout.');
    if (S === 'noanswer' && !ct) sum.push('If you do not set a connect timeout, the thread stays occupied until the operating system gives up.' + (rt ? ' Even if a read timeout is set, it is not used during the connection phase.' : '') + ' Because of one server that does not answer, a thread becomes unavailable for that long on every call.');
    if (S === 'refused') sum.push('When the server program is not running, the refusal comes back right away, so the call fails immediately without waiting for a timeout. A timeout expires when there is no answer at all (connect timeout) or when the response is late (read timeout).');
    if (S === 'e404' || S === 'e500') sum.push('4xx and 5xx mean that a response arrived, so they have nothing to do with timeouts. RestClient turns such a response into an exception and throws it, so the calling code catches it with try-catch and handles it. 4xx is an HttpClientErrorException (a problem with the request that was sent), and 5xx is an HttpServerErrorException (a problem on the remote server).');
    if (S === 'ok') sum.push('When the remote server is normal, the result is the same whether or not you set timeouts. Timeouts are a safeguard for when the remote server is slow or does not answer.');
    return { events: ev, summary: sum, cause: cause, ms: ms, status: status, row: [result, ex, wait, served] };
  },
  render: function (v, sim, t, H, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : null;
    if (!s) { H.text(v, 'Click Run to see, one step at a time, how a thread of the order server calls the payment server and receives the result.'); return; }
    var ln = H.lanes(v), connText = { '': 'Not yet', try: 'Connection request sent', ok: 'Connected', refused: 'Refused by the remote server', silent: 'No answer', timeout: 'Gave up: connect timeout', osfail: 'The operating system gave up' }[s.conn];
    H.lane(ln, 'Connection', connText, s.conn === 'ok' ? 'good' : s.conn === 'try' || s.conn === 'silent' ? 'wait' : s.conn ? 'bad' : 'none');
    H.lane(ln, 'Response', !s.req ? (s.result ? 'Request could not be sent' : 'Not yet') : s.resp === 'none' ? 'Not received' : s.resp ? s.resp + ' response received' : 'Waiting', !s.req ? 'none' : s.resp === 'none' ? 'bad' : s.resp === '200' ? 'good' : s.resp ? 'bad' : 'wait');
  },
  // Diagram: the thread of the calling order server on the left and the payment server on the right. Between them are the connection, request, and response arrows. Below are when each of the two timeouts counts time, and the result.
  draw: function (P, sim, shown) {
    var c = sim.c, last = shown[shown.length - 1], s = last ? last.snap : { thread: 'Before the call', waited: '0s', conn: '', req: false, resp: '', ctS: c.ct ? 'Counts from the connection attempt' : 'Not set: until the OS gives up', ctK: c.ct ? 'plain' : 'ghost', rtS: c.rt ? 'Counts after the connection is made' : 'Not set: waits with no limit', rtK: c.rt ? 'plain' : 'ghost', srv: c.server === 'refused' ? 'Server program not running' : c.server === 'noanswer' ? 'No answer' : 'Waiting for a request', result: '', ex: '' };
    var waiting = s.thread === 'Waiting to connect' || s.thread === 'Waiting for a response', dead = c.server === 'refused' || c.server === 'noanswer';
    P.size(680, 268);
    P.box('me', 16, 16, 240, 92, { cls: s.thread === 'Released' ? 'good' : waiting ? 'hot now' : 'plain', title: 'Order server (caller)', sub: ['Thread: ' + s.thread, 'Waited: ' + s.waited] });
    P.box('srv', 424, 16, 240, 92, { cls: dead ? 'ghost' : s.req && !s.resp ? 'hot' : s.resp && s.resp !== 'none' ? 'wait' : 'plain', title: 'Payment server (remote)', sub: [{ ok: 'Responds right away', slow: 'Responds after 10 seconds', noanswer: 'No answer when connecting', refused: 'Server program is not running', e404: 'Responds with 404', e500: 'Responds with 500' }[c.server], s.srv] });
    if (s.conn) P.arrow('a_conn', 'me:r:0.2', 'srv:l:0.2', { cls: s.conn === 'ok' ? 'good' : s.conn === 'try' ? 'hot' : s.conn === 'silent' ? 'dash' : 'bad', label: { try: '1. Connection request', ok: '1. Connected', refused: '1. Connection refused', silent: '1. Request, no answer', timeout: '1. Gave up connecting', osfail: '1. Gave up connecting' }[s.conn] });
    if (s.req) P.arrow('a_req', 'me:r:0.55', 'srv:l:0.55', { cls: s.resp ? 'mut' : 'hot', label: '2. Request' });
    if (s.resp && s.resp !== 'none') P.arrow('a_res', 'srv:l:0.9', 'me:r:0.9', { cls: s.resp === '200' ? 'good' : 'bad', label: '3. Response ' + s.resp });
    P.box('tc', 16, 122, 320, 46, { cls: s.ctK, title: 'Connect timeout', right: c.ct ? '2s' : 'None', sub: s.ctS });
    P.box('tr', 344, 122, 320, 46, { cls: s.rtK, title: 'Read timeout', right: c.rt ? '3s' : 'None', sub: s.rtS });
    P.box('out', 16, 182, 648, 58, { cls: !s.result ? 'ghost' : s.ex === 'None' ? 'good' : 'bad', title: 'What the calling code received', sub: s.result ? [s.result, 'Exception: ' + s.ex] : ['No result yet', ' '], right: s.result ? 'Waited: ' + s.waited : '' });
    P.note('The connect timeout counts time only until "1. Connection" is established, and the read timeout counts time only while the caller waits for the response after "2. Request" is sent.');
  },
  assume: 'All 24 combinations were actually called with the RestClient of Spring Framework 7.0.9 (the request factory is SimpleClientHttpRequestFactory, on JDK 21), and it was confirmed that the result, the kind of exception, the cause of the exception, the time waited, and whether the remote server handled the request match the screen. The remote server is a Spring Boot 4.1.1 server (embedded Tomcat) started on 127.0.0.1 of the same PC, with a URL that responds late on purpose. The times on the screen are examples. The real check was run with the times reduced to one hundredth (connect timeout 200ms, read timeout 300ms, slow response 1000ms), and the time waited was checked to come out in that proportion. "Connection refused" was checked with a port on 127.0.0.1 that no program is listening on. "No answer to the connection request" cannot be produced with 127.0.0.1, so it was checked with 192.0.2.1 (RFC 5737), an address that is reserved for documentation and is not assigned to any machine. These 4 combinations can give different results depending on the network the PC is on (if the network is disconnected, the call fails right away). The roughly 21 seconds that the operating system took to give up when there was no connect timeout is the value seen on Windows 11, and it differs depending on the operating system and its settings. That the wait has no limit when no timeout is set follows the java.net.URLConnection documentation (a timeout of 0 means infinite), and execution confirmed only that the call waits until the response arrives. The read timeout is not a limit on the time the whole response takes but a limit on the time spent waiting with no data arriving, so it may not expire for a response that keeps arriving a little at a time (this follows the same documentation and was not verified by execution). How timeouts are set and what their defaults are differ depending on the kind of request factory. The check was done one call at a time, so the situation where requests pile up and the thread pool runs out was not verified by execution. The model is simplified to the case where a new connection is established for every call, and it does not cover a connection pool that reuses connections and its wait time, retries, or circuit breakers.',
});

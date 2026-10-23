Lab.register({
  id: 'remote_basic', nav: 'Calling another server', cat: 'Fundamentals', mode: 'step', basic: true, deep: ['restclient', 'circuit', 'saga', 'gateway'],
  title: 'How is a server calling another server different from calling a method?',
  why: 'If all features are in one program, changing only the payment part means restarting the whole program, and features run by another company, such as card payment or sending text messages, cannot be done by my program alone. A remote call hands such features to a separately running server, sends a request over the network, and receives the result, so that different programs can divide the work among themselves.',
  use: 'It is used when a shopping mall server asks the server of a payment company to process a payment, or asks the server of another service for information such as maps or weather. In a service whose features are split across several servers, it is common for the order server to call the member server or the stock server. In Spring, you send the request with the RestClient that Spring provides, set a connect timeout and a read timeout on the request factory, and handle the ResourceAccessException that comes from a connection failure or a timeout. To keep the thread that sent the request from standing still while it waits for the answer, you use WebClient, and work whose answer need not be received right away is sometimes passed to a message queue.',
  intro: 'A large service sometimes splits its features among several servers. If the order server and the payment server are different programs that run separately, then instead of calling a method to make a payment, the code of the order server has to send a request (POST /pay) to the payment server over the network. In Spring, this request is sent with the RestClient that Spring provides. The code on the screen has two versions. If the payment feature is in the same program, you call the method of a PayService object (a class made for this example) with payService.pay(), and if it is on another server, you call the payment server with restClient.post().uri(...).retrieve().body(String.class). Both get a String, "Payment done", back, but when you call a server across a network, the other side may be off and refuse the connection, and if the other side is slow, you have to wait for the answer. So when you create the RestClient you decide how long to wait for an answer (the timeout), and you catch the ResourceAccessException that comes when the call fails. The result was made by compiling the code on the screen as it is and running it, with a small server standing in for the payment server started separately.',
  terms: ['Remote call', 'Method invocation', 'RestClient', 'Connect timeout and read timeout', 'ResourceAccessException'],
  controls: [
    { id: 'where', label: 'Where the payment feature is', type: 'select', value: 'remote', options: [['remote', 'On another server (the payment server): called with RestClient'], ['local', 'In PayService of the same program: called as a method']] },
    { id: 'pay', label: 'State of the payment side', type: 'select', value: 'ok', options: [['ok', 'Returns "Payment done" after 0.1s'], ['down', 'The payment server is off'], ['slow', 'Returns "Payment done" after 3s']] },
    { id: 'timeout', label: 'Set timeouts on RestClient (connect 1s, read 1s)', type: 'check', value: true },
  ],
  // q is the question shown on the question-style screen. t and d are the name and the description used in the text-only reading
  presets: [
    { t: 'Default settings', q: 'What does the code that calls another server look like, and what does it get back when the payment server answers after 0.1s?', d: 'It sends POST /pay to the payment server with RestClient and gets "Payment done" back as a String after about 0.1s.', v: { where: 'remote', pay: 'ok', timeout: true } },
    { t: 'If it is a method of the same program', q: 'If the payment feature is in PayService of the same program, not on another server, what is different in the code?', d: 'You call it with the one line payService.pay(), and there is no address, no connection, and no timeout. What you get back is the same "Payment done".', v: { where: 'local', pay: 'ok', timeout: true } },
    { t: 'If the payment server is off', q: 'What if the payment server is off?', d: 'The connection is refused and a ResourceAccessException occurs right away, and the cause is ConnectException.', v: { where: 'remote', pay: 'down', timeout: true } },
    { t: 'Can only the payment side be off in the same program?', q: 'If the payment feature is a method of the same program, can "only the payment side is off" happen?', d: 'It cannot. While the order code is running, pay can be called too, so you get "Payment done" as in the default settings.', v: { where: 'local', pay: 'down', timeout: true } },
    { t: 'If the payment server answers after 3s', q: 'What if the payment server answers after 3s, not after 0.1s?', d: 'The read timeout of 1s is reached and a ResourceAccessException occurs, but the payment server finishes the payment after 3s.', v: { where: 'remote', pay: 'slow', timeout: true } },
    { t: 'If you do not set a timeout', q: 'What if you create it with RestClient.create(), with no timeout, and the payment server answers after 3s?', d: 'It waits the whole 3s and receives "Payment done".', v: { where: 'remote', pay: 'slow', timeout: false } },
    { t: 'If a method of the same program takes 3s', q: 'What if pay of the same program takes 3s?', d: 'A method call also waits the 3s. During that time this thread is running the body of pay, and there is no place to set a timeout.', v: { where: 'local', pay: 'slow', timeout: true } },
  ],
  DELAY: { ok: 100, down: 100, slow: 3000 },
  // The code on the screen and the source that the check program (verify/spring/src/RemoteBasicProbe.java) compiled and ran are the same text (only port 9000 is replaced with a free port).
  code: function (c) {
    var o = [];
    if (c.where === 'local') {
      var ms = this.DELAY[c.pay];
      o.push('// The payment also runs in the same program as the order code. OrderApp and PayService are names chosen for this example.',
        'public class OrderApp {',
        '    public static void main(String[] args) throws InterruptedException {',
        '        PayService payService = new PayService();');
      if (c.timeout) o.push('        // The line that calls a method has no place to set how long to wait (a timeout)');
      o.push('        String result = payService.pay();       // calls a method of the same program',
        '        System.out.println(result);',
        '    }',
        '}',
        '',
        'class PayService {',
        '    String pay() throws InterruptedException {',
        '        Thread.sleep(' + ms + ');' + (ms < 1000 ? ' ' : '') + '                     // pretend the payment takes ' + (ms / 1000) + ' seconds',
        '        return "Payment done";',
        '    }',
        '}');
      return o.join('\n');
    }
    o.push('// Code of the order server. Payment is handled by a separately running payment server. OrderApp is a name chosen for this example.');
    if (c.timeout) o.push('import java.time.Duration;', '', 'import org.springframework.http.client.SimpleClientHttpRequestFactory;');
    o.push('import org.springframework.web.client.ResourceAccessException;',
      'import org.springframework.web.client.RestClient;',
      '',
      'public class OrderApp {',
      '    public static void main(String[] args) {');
    if (c.timeout) o.push('        // The wait time (timeout) is set on the request factory, which actually makes the connection and sends the request',
      '        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();',
      '        factory.setConnectTimeout(Duration.ofSeconds(1));  // up to 1 second to make the connection',
      '        factory.setReadTimeout(Duration.ofSeconds(1));     // after connecting, waits up to 1 second for the answer',
      '        RestClient restClient = RestClient.builder()',
      '                .requestFactory(factory)',
      '                .build();');
    else o.push('        RestClient restClient = RestClient.create();   // sets no timeout');
    o.push('',
      '        try {',
      '            String result = restClient.post()',
      '                    .uri("http://localhost:9000/pay")    // address of the payment server (9000 is an example number)',
      '                    .retrieve()',
      '                    .body(String.class);                 // receives the body of the answer as a String',
      '            System.out.println(result);',
      '        } catch (ResourceAccessException e) {           // connection failure or timeout',
      '            System.out.println("Call failed: " + e.getCause());',
      '        }',
      '    }',
      '}');
    return o.join('\n');
  },
  label: function (c) {
    if (c.where === 'local') return 'Method of the same program · pay takes ' + (c.pay === 'slow' ? '3s' : '0.1s') + (c.pay === 'down' ? ' (the payment side alone cannot be off)' : '');
    return 'Another server · ' + { ok: 'answers after 0.1s', down: 'is off', slow: 'answers after 3s' }[c.pay] + ' · ' + (c.timeout ? 'timeout 1s' : 'no timeout');
  },
  columns: ['Result of the call', 'Time taken', 'Did the payment finish?'],
  simulate: function (c) {
    var ev = [], sum = [], pay = c.pay, tm = !!c.timeout, local = c.where === 'local', row;
    var st = { at: '0s', od: ['plain', ['Idle']], py: [!local && pay === 'down' ? 'ghost' : 'plain', !local && pay === 'down' ? ['Off'] : ['Idle']], req: null, res: null, got: 'Not yet', took: 'Not yet', payEnd: 'Not yet', payEndCls: '', rows: [] };
    function push(s, k) { ev.push({ s: s, k: k, snap: JSON.parse(JSON.stringify(st)) }); }
    if (local) {
      var ms = pay === 'slow' ? 3000 : 100, secTxt = pay === 'slow' ? '3s' : '0.1s', lnote = '';
      if (pay === 'down') lnote = ' You chose "The payment server is off" for the state of the payment side, but if the payment feature is a method of the same program, that cannot happen. When the program stops, the order code stops with it, so pay alone cannot be off while the order code is running. So the code is the same as in the default settings, and pay returns after 0.1s.';
      if (tm) lnote += ' You chose to set a timeout, but the line that calls a method has no place to set how long to wait, so only one comment line was added to the code.';
      st.od = ['hot', ['main is running']]; st.py = ['plain', ['new PayService()']];
      st.rows.push(['0s', 'Object created with new PayService()']);
      push('main creates a PayService object with new PayService(). PayService is a class made for this example, declared in the same code as OrderApp and run in the same program as the order code (one Java process).' + lnote, '');
      st.od = ['wait', ['Called pay()']]; st.py = ['hot', ['pay body is running', 'Thread.sleep(' + ms + ')']]; st.req = ['hot', 'pay() call'];
      st.rows.push(['0s', 'Called payService.pay()']);
      push('It calls payService.pay(). This is a call to a method of the same program, so there is no address and no connection, and execution goes straight into the body of pay. The thread that was running main runs the body of pay as it is. Thread.sleep(' + ms + ') in the body is a line put in on the assumption that the payment takes ' + secTxt + '.' + (pay === 'slow' ? ' During that time this thread is running the body of pay, so it does nothing else.' : ''), '');
      st.at = secTxt; st.py = ['good', ['return "Payment done"']]; st.res = ['good', '"Payment done"']; st.od = ['good', ['result = "Payment done"']];
      st.got = 'Received "Payment done"'; st.took = 'About ' + secTxt; st.payEnd = 'Yes (after ' + secTxt + ')'; st.payEndCls = 'good';
      st.rows.push([secTxt, 'pay returns "Payment done", and println prints it']);
      push('After ' + secTxt + ', pay returns the String with return "Payment done", and it is assigned to result. System.out.println(result) prints "Payment done". The time taken is about ' + secTxt + '.', 'good');
      if (pay === 'slow') {
        push('A method call also waits as long as its body takes. But while waiting, this thread was doing that very work (the body of pay), and the result came back when the body finished. When you call another server, another program does the work and this thread only waits for the answer, so if the other side is late or stops, you decide with a timeout when to stop waiting.', 'good');
        row = ['Received "Payment done"', 'About 3s', 'Yes (after 3s)'];
        sum.push('If pay of the same program takes 3s, main also gets "Payment done" back after 3s. During those 3s, this thread was running the body of pay.');
        sum.push('The line that calls a method has no place to set a timeout. When you call another server, this thread only waits and the payment server does the work, so you set the wait time on the request factory of RestClient. You can compare this with the question where the payment server answers after 3s.');
      } else {
        push('What came back is the same "Payment done" as when you call the payment server. The difference is that there is no network in between. In this call, the other side cannot be off and refuse the connection, and the wait cannot be cut off because the answer is late, so this code has neither a timeout setting nor a catch for ResourceAccessException.', 'good');
        row = ['Received "Payment done"', 'About 0.1s', 'Yes (after 0.1s)'];
        sum.push(pay === 'down' ? 'If the payment feature is a method of the same program, there is no case where only the payment side is off. pay returned "Payment done" after 0.1s, as in the default settings.' : 'A method of the same program is called with one line, payService.pay(), execution goes straight into the body of pay, and "Payment done" comes back after 0.1s.');
        sum.push('Compared with the code that calls another server, the address (uri), RestClient and the request factory, the timeout, and the catch for ResourceAccessException are all missing. With no network in between, a connection failure or cutting off the wait does not happen.');
      }
      return { events: ev, summary: sum, row: row };
    }
    // Calling another server
    st.od = ['hot', ['Created RestClient']];
    st.rows.push(['0s', tm ? 'Set a timeout of 1s on the request factory and created the RestClient' : 'Created it with RestClient.create() (no timeout)']);
    push('The main of the order server creates a RestClient. RestClient is the HTTP client that Spring (spring-web) provides, and it sends HTTP requests to other servers and receives the answers. OrderApp is a class name chosen for this example. ' + (tm ? 'First it creates the SimpleClientHttpRequestFactory that Spring provides (the request factory: the part that actually makes the connection and sends the request), and uses setConnectTimeout to allow up to 1 second to make the connection and setReadTimeout to wait up to 1 second for the answer after connecting. Then it passes this factory to RestClient.builder() to create the RestClient.' : 'It was created with RestClient.create(), and the wait time (timeout) was not set.') + (pay === 'down' && tm ? ' The code is the same as in the default settings, and the only difference is that the payment server program is off.' : ''), '');
    st.od = ['wait', ['Sent POST /pay']]; st.req = ['hot', 'POST /pay (network)'];
    st.rows.push(['0s', 'Sent POST /pay to the payment server (localhost:9000)']);
    push('The statement restClient.post().uri("http://localhost:9000/pay").retrieve().body(String.class) runs. It looks like chained method calls, but what this statement does is make a connection to the payment server, send a POST /pay request over the network, and receive the answer. The code that makes the payment is not in this program; it is in the payment server program that runs separately. post() sets the HTTP method, uri(...) sets the address to send to, and body(String.class) converts the body of the answer into a String and returns it.', '');
    if (pay === 'down') {
      st.od = ['bad', ['Connection refused']]; st.req = ['bad', 'Refused'];
      st.rows.push(['0s', 'The connection is refused (the payment server did not receive the request)']);
      push('The order server tries to connect to the payment server, but the payment server program is off, so no program at that port accepts connections. The operating system refuses the connection right away, and the payment server does not receive the request. A method call has no connection step, so it has no such failure.', 'bad');
      st.od = ['bad', ['Moved to catch']]; st.got = 'ResourceAccessException (cause: ConnectException)'; st.took = 'Right away (within 0.1s)'; st.payEnd = 'No (the request was not received)'; st.payEndCls = 'bad';
      st.rows.push(['0s', 'ResourceAccessException is thrown, and catch prints "Call failed: java.net.ConnectException…"']);
      push('RestClient throws this failure as a ResourceAccessException (an exception that Spring provides: thrown when no response could be obtained, as with a connection failure or a timeout), and its cause (getCause()) is java.net.ConnectException, which Java provides. Nothing is assigned to result, and execution moves to the catch block and prints "Call failed: java.net.ConnectException…".' + (tm ? ' The timeout you set was not used, because the connection was refused right away and there was nothing to wait for.' : ' Even though no timeout was set, the result is the same because the connection is refused right away.'), 'bad');
      row = ['ResourceAccessException (cause: ConnectException)', 'Right away (within 0.1s)', 'No (the request was not received)'];
      sum.push('If the payment server is off, the connection is refused, and the statement that runs through body(...) throws ResourceAccessException right away. The cause is java.net.ConnectException, and the payment server did not receive the request.' + (tm ? '' : ' The result is the same whether or not you set a timeout.'));
      sum.push('Unlike a method call, the other side across a network may be off. So the code that calls another server decides what to do when it catches ResourceAccessException (here, printing "Call failed").');
      return { events: ev, summary: sum, row: row };
    }
    var dTxt = pay === 'slow' ? '3s' : '0.1s';
    st.py = ['wait', ['Got POST /pay', 'Processing (' + dTxt + ')']]; st.od = ['wait', ['Waiting for the answer']];
    st.rows.push(['0s', 'The payment server received POST /pay and processed the payment']);
    push('The payment server receives the POST /pay request and processes the payment. This payment server takes ' + dTxt + ' to process it. Meanwhile, the main thread of the order server just waits for the answer at this statement, and the payment server program does the work of making the payment.', '');
    if (pay === 'ok') {
      st.at = '0.1s'; st.py = ['good', ['200 "Payment done"']]; st.res = ['good', '200 Payment done']; st.od = ['good', ['result = "Payment done"']];
      st.got = 'Received "Payment done"'; st.took = 'About 0.1s'; st.payEnd = 'Yes (after 0.1s)'; st.payEndCls = 'good';
      st.rows.push(['0.1s', 'The payment server answers 200 "Payment done", and println prints it']);
      push('After 0.1s the payment server sends a 200 response with the body "Payment done". body(String.class) returns this body as a String, and it is assigned to result. System.out.println(result) prints "Payment done".' + (tm ? ' The answer came sooner than the 1s you set, so the timeout was not used.' : ' No timeout was set, but the answer came soon, so it does not show in the result.'), 'good');
      row = ['Received "Payment done"', 'About 0.1s', 'Yes (after 0.1s)'];
      sum.push('Calling another server means sending a request over the network and waiting for the answer. The order server sent POST /pay to the payment server with RestClient and received "Payment done" as a String after about 0.1s.');
      sum.push('What comes back is the same String as when you call a method of the same program, but to get this result the payment server had to be on and had to answer in time. ' + (tm ? 'You will see the cases where it is off or answers late in the next questions.' : 'Not setting a timeout shows up when the other side answers late.'));
      return { events: ev, summary: sum, row: row };
    }
    if (tm) {
      st.at = '1s'; st.od = ['bad', ['Read timeout', 'Stopped waiting']]; st.req = ['bad', 'Cut off'];
      st.got = 'ResourceAccessException (cause: SocketTimeoutException)'; st.took = 'About 1s';
      st.rows.push(['1s', 'The read timeout throws ResourceAccessException, and catch prints "Call failed: java.net.SocketTimeoutException: Read timed out"']);
      push('One second passes after connecting without an answer, and the read timeout (the 1s of setReadTimeout) is reached. The request factory cuts off the wait, and RestClient throws ResourceAccessException. Its cause is java.net.SocketTimeoutException (Read timed out), which Java provides. Execution moves to the catch block and prints "Call failed: java.net.SocketTimeoutException: Read timed out". The time taken is about 1s.', 'bad');
      st.at = '3s'; st.py = ['good', ['Finished the payment']]; st.payEnd = 'Yes (after 3s, after the order server gave up)'; st.payEndCls = 'bad';
      st.rows.push(['3s', 'The payment server finishes the payment (the order server has already closed the connection)']);
      push('But at 3s the payment server finished the payment. The order server had already stopped waiting at 1s and closed the connection. The code of the order server treated it as a failure without knowing whether the payment was made, but the payment was made. This payment server is the one used in this lab, built to finish processing without checking whether the connection was closed.', 'bad');
      row = ['ResourceAccessException (cause: SocketTimeoutException)', 'About 1s', 'Yes (after 3s, after the order server gave up)'];
      sum.push('If the payment server answers after 3s, a RestClient with the read timeout set to 1s cuts off the wait at 1s and throws ResourceAccessException. The cause is java.net.SocketTimeoutException.');
      sum.push('Stopping the wait is not the same as cancelling the other side\'s work. The payment server finished the payment after 3s, so the order server treated it as a failure but the payment was made. So after a timeout, you have to find out separately whether the payment was made. A method call has no case where the caller gives up but the callee keeps doing its work.');
    } else {
      st.at = '1s'; st.od = ['wait', ['Still waiting', 'after 1s']];
      st.rows.push(['1s', 'No answer, but it keeps waiting (no timeout)']);
      push('One second has passed, but the answer of the payment server has not come. No timeout was set, so RestClient does not give up and keeps waiting.', 'bad');
      st.at = '3s'; st.py = ['good', ['200 "Payment done"']]; st.res = ['good', '200 Payment done']; st.od = ['good', ['result = "Payment done"']];
      st.got = 'Received "Payment done"'; st.took = 'About 3s'; st.payEnd = 'Yes (after 3s)'; st.payEndCls = 'good';
      st.rows.push(['3s', 'The payment server answers 200 "Payment done", and println prints it']);
      push('At 3s the payment server sends "Payment done" in a 200 response, and body(String.class) returns that String. println prints "Payment done". The result is a success, but for 3s the main thread did nothing but wait for the answer.', 'bad');
      row = ['Received "Payment done"', 'About 3s', 'Yes (after 3s)'];
      sum.push('The RestClient with no timeout set (RestClient.create()) waited until the payment server answered after 3s, and received "Payment done" after about 3s.');
      sum.push('In a separate run that is not on the screen, the payment server was made to receive the request and never answer, and this RestClient with no timeout did not give up even after 4s (we did not watch beyond that). Setting a timeout keeps the thread of your own server from standing still because of a slow or stopped other side.');
    }
    return { events: ev, summary: sum, row: row };
  },
  render: function (v, sim, t, H, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : null;
    if (!s) { H.text(v, 'Click Run to start with main beginning.'); return; }
    H.table(v, ['Time', 'What happened'], s.rows.map(function (r) { return { cls: '', cells: [r[0], r[1]] }; }), 'What happened');
    H.table(v, ['Item', 'Value'], [
      { cls: s.got === 'Not yet' ? 'gone' : '', cells: ['Result of the call', s.got === 'Not yet' ? 'Not yet' : { v: s.got, cls: s.got.indexOf('Payment done') >= 0 ? 'good' : 'bad' }] },
      { cls: s.took === 'Not yet' ? 'gone' : '', cells: ['Time taken', s.took] },
      { cls: s.payEnd === 'Not yet' ? 'gone' : '', cells: ['Did the payment finish?', s.payEnd === 'Not yet' ? 'Not yet' : { v: s.payEnd, cls: s.payEndCls }] },
    ], 'Result');
  },
  // Diagram: the caller (main of the order code) on the left, the callee (a PayService object in the same program, or the payment server if it is another server) on the right. At the top center it says whether the two are one program or two programs run separately. The calling arrow is on top and the returning arrow is below. When the connection is refused or the wait is cut off, the calling arrow turns red. At the bottom it shows the result of the call, the time taken, and whether the payment finished.
  draw: function (P, sim, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : null, local = sim.c.where === 'local', down = !local && sim.c.pay === 'down';
    P.size(680, 318);
    P.text('clk', 340, 22, 'Elapsed time ' + (s ? s.at : '0s'), { anchor: 'middle', bold: true });
    P.text('kind', 340, 48, local ? 'One program (one Java process): a method call' : 'Two programs (run separately): a call over the network', { anchor: 'middle' });
    P.box('od', 14, 62, 200, 100, { cls: s ? s.od[0] : 'plain', title: local ? 'main (order code)' : 'main (order server)', sub: s ? s.od[1] : ['Idle'] });
    P.box('py', 466, 62, 200, 100, { cls: s ? s.py[0] : (down ? 'ghost' : 'plain'), title: local ? 'PayService object' : 'Payment server', sub: s ? s.py[1] : (down ? ['Off'] : ['Idle']) });
    if (s && s.req) P.arrow('req', 'od:r:0.3', 'py:l:0.3', { cls: s.req[0], label: s.req[1] });
    if (s && s.res) P.arrow('res', 'py:l:0.75', 'od:r:0.75', { cls: s.res[0], label: s.res[1] });
    P.box('n1', 14, 190, 652, 36, { cls: s && s.got !== 'Not yet' ? (s.got.indexOf('Payment done') >= 0 ? 'good' : 'bad') : 'ghost', title: 'Result of the call', right: s ? s.got : 'Not yet' });
    P.box('n2', 14, 234, 652, 36, { cls: s && s.took !== 'Not yet' ? 'wait' : 'ghost', title: 'Time taken', right: s ? s.took : 'Not yet' });
    P.box('n3', 14, 278, 652, 36, { cls: s && s.payEnd !== 'Not yet' ? (s.payEndCls || 'plain') : 'ghost', title: 'Did the payment finish?', right: s ? s.payEnd : 'Not yet' });
  },
  assume: 'The behavior was checked by running the RestClient of Spring Framework 7.0.9 (spring-web) on JDK 21.0.12.1 (Windows 11). For all twelve combinations (two places for the payment feature, three states of the payment side, and two for whether a timeout was set), the same text as the code on the screen was written as OrderApp.java, compiled with javac, and run. In the code that calls another server, only the 9000 of the address was replaced with a free port that was actually opened (9000 is an example number). The role of the payment server was played by a small HTTP server that the check program (verify/spring/src/RemoteBasicProbe.java) started on 127.0.0.1 with the ServerSocket of Java; when it receives POST /pay, it sends, after 0.1s or 3s, a 200 response with the body "Payment done" (text/plain, UTF-8). A payment server that is off was imitated by opening a port and then closing it, so that nobody listens on it. This payment server was built for this lab to finish processing without checking whether the order side had closed the connection, which does not mean that every server behaves that way. For each combination, we checked against the model the text that main printed, the time taken, the request line the payment server received (POST /pay HTTP/1.1), when the payment server finished processing, and whether the connection of the order side was already closed at that time, and we also confirmed that the code on the screen is the same text as the source that was run (verify/spring/cmp_remote_basic.js). The time taken is written roughly on the screen; the values measured in the run were 0.10 to 0.21s for about 0.1s, 0.06s or less for right away, 1.01s for about 1s, and 3.01 to 3.08s for about 3s. We made the same call once more in the check program and confirmed that the exception caught by catch is exactly org.springframework.web.client.ResourceAccessException and that the causes are java.net.ConnectException (connection refused) and java.net.SocketTimeoutException (Read timed out). The explanation after ConnectException in the text that catch prints differed with the request factory. The SimpleClientHttpRequestFactory with a timeout set added "Connection refused: getsockopt", and the one created with RestClient.create() printed only the class name with no explanation. In the library setup of this run (no Apache HttpClient, Jetty, or Reactor Netty), RestClient.create() chose JdkClientHttpRequestFactory, which uses the HttpClient of the JDK, and it set no timeout. With other libraries present, it may choose a different request factory. When the payment server was made to receive the request and never answer, the RestClient created with RestClient.create() waited past 4s (we did not watch beyond that), and the RestClient with a 1s timeout ended at about 1s with ResourceAccessException (cause SocketTimeoutException). PayService of the same program (a class made for this example) imitated the time the payment takes with Thread.sleep, and since "only the payment side is off" cannot happen to a method, it was run with 0.1s, the same as the default settings. That a method call has no connection step, and that the thread that called the method runs the body as it is, are explanations of how the Java language works and were not measured separately. A method call can also be handed to another thread and waited for with Future.get with a time limit, but this lab covers only the line that simply calls a method. The screen covers only the simplest case of one call; the cases where the connect timeout actually fires (a peer that gives no answer at all to the connection request) and 404 and 500 responses are covered in "Calling external APIs and timeouts", a device that shields you from failing servers in "Circuit breaker", ways to undo the work of several servers in "Saga and outbox", and receiving requests in one place and splitting them in "Gateway and gradual migration".',
});

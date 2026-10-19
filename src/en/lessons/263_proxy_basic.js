Lab.register({
  id: 'proxy_basic', nav: 'Proxy servers', cat: 'Fundamentals', mode: 'step', basic: true, deep: ['revproxy', 'scale', 'cdn'],
  title: 'What is a proxy server, and what changes when it sits in between?',
  intro: 'A proxy server is a server that stands between a client (the program that sends requests) and the origin server (the server that really produces the response) and passes requests on for it. The code box lists three things. First, the address the client connects to (http://localhost:8080/hello). The 8080 in the middle of the address is a port number, a door number given to each program on one computer. Second, the proxy server waiting on port 8080, which passes the request it receives to the server on 9000. Third, the origin server waiting on port 9000, which returns "Hello". So the client connects to the proxy server, and the proxy server connects again to the origin server, passes the request on, and returns the response. The proxy server in this lab stands in front of the server, and the client connects to it believing it is the server (a reverse proxy). In this lab, you change the address the client connects to, or remove the line of the proxy server or the origin server (that server is not running), send the same request each time, and see what the client receives and who the origin server sees. The code box is not the source of a program that was run. It lists what is waiting on which port, and 8080 and 9000 are example numbers. Load balancers, CDNs, and API gateways are also servers that stand between a client and a server.',
  terms: ['Proxy server', 'Origin server', '502 Bad Gateway', 'Reverse proxy'],
  controls: [
    { id: 'via', label: 'Address the client connects to', type: 'select', value: 'proxy', options: [['proxy', 'http://localhost:8080/hello (the port of the proxy server)'], ['direct', 'http://localhost:9000/hello (the port of the origin server)']] },
    { id: 'up', label: 'What is running', type: 'select', value: 'both', options: [['both', 'The proxy server on 8080 and the origin server on 9000 are both running'], ['noproxy', 'The proxy server on 8080 is not running (its line is removed)'], ['noserver', 'The origin server on 9000 is not running (its line is removed)']] },
  ],
  // q is the question shown on the question-style screen. t and d are the name and the description used in the text-only reading
  presets: [
    { t: 'Default settings', q: 'When a request goes through a proxy server, what path does it take, and who does the origin server see?', d: 'The client connects to the proxy server, and the proxy server connects again to the origin server. The origin server sees the proxy server.', v: { via: 'proxy', up: 'both' } },
    { t: 'Connecting directly to the origin server', q: 'What if you change the address to port 9000 and connect directly to the origin server?', d: 'The request does not pass through the proxy server, and the origin server sees the client.', v: { via: 'direct', up: 'both' } },
    { t: 'Turning off the proxy server', q: 'What if you turn off the proxy server on 8080 (remove its line)?', d: 'Even though the origin server is running, the client does not receive a response.', v: { via: 'proxy', up: 'noproxy' } },
    { t: 'Turning off the origin server', q: 'What if you turn off the origin server on 9000 (remove its line)?', d: 'The client receives an error response sent by the proxy server.', v: { via: 'proxy', up: 'noserver' } },
    { t: 'Connecting directly with the proxy server off', q: 'What if you connect directly to the origin server on port 9000 while the proxy server on 8080 is off?', d: 'A request that does not pass through the proxy server is not affected when the proxy server is off.', v: { via: 'direct', up: 'noproxy' } },
    { t: 'Connecting directly with the origin server off', q: 'What if you connect directly to port 9000 while the origin server on 9000 is off?', d: 'The request does not pass through a proxy server that could answer for it, so the client receives a connection refused error.', v: { via: 'direct', up: 'noserver' } },
  ],
  GOT: { ok: '200 OK, body "Hello"', refuse: 'Connection refused error (nothing waiting on that port)', bad: '502 Bad Gateway (sent by the proxy server)' },
  SEEN: { proxy: 'Proxy server', client: 'Client', none: 'None (no request arrived)' },
  code: function (c) {
    var out = ['# The address the client connects to', 'http://localhost:' + (c.via === 'proxy' ? '8080' : '9000') + '/hello'];
    if (c.up !== 'noproxy') out.push('# On 8080: the proxy server (passes the request it receives to the server on 9000)');
    if (c.up !== 'noserver') out.push('# On 9000: the origin server (returns "Hello")');
    return out.join('\n');
  },
  label: function (c) { return { proxy: 'Connects to 8080 (proxy server)', direct: 'Connects directly to 9000 (origin server)' }[c.via] + ' · ' + { both: 'Both running', noproxy: 'Proxy server not running', noserver: 'Origin server not running' }[c.up]; },
  columns: ['What the client received', 'Who the origin server saw', 'Path the request took'],
  simulate: function (c) {
    var ev = [], sum = [], viaP = c.via === 'proxy', pOn = c.up !== 'noproxy', sOn = c.up !== 'noserver', addr = viaP ? '8080' : '9000';
    var st = { cl: 'plain', clt: ['Idle'], px: pOn ? 'plain' : 'ghost', pxt: pOn ? ['Waiting on 8080'] : ['Not running'], sv: sOn ? 'plain' : 'ghost', svt: sOn ? ['Waiting on 9000'] : ['Not running'], aq1: '', aq2: '', ar2: '', ar1: '', dq: '', dr: '', got: '', gotc: '', seen: '', seenc: '', way: '', wayc: '' };
    function push(s, k) { ev.push({ s: s, k: k, snap: JSON.parse(JSON.stringify(st)) }); }
    var devs = [];
    if (!viaP) devs.push('the port 9000 in the address the client connects to');
    if (!pOn) devs.push('the removed line of the proxy server on 8080');
    if (!sOn) devs.push('the removed line of the origin server on 9000');
    var note = devs.length ? ' In the code box, what differs from the default settings is ' + devs.join(', ') + '.' : '';
    var G = this.GOT, S = this.SEEN;
    // Step 1: the client connects
    if (viaP) st.aq1 = 'plain'; else st.dq = 'plain';
    st.cl = 'hot'; st.clt = ['Connecting', 'to ' + addr];
    var who = viaP ? (pOn ? 'The code box lists the proxy server as the one waiting on this port. The address the client uses does not contain the origin server\'s port, 9000.' : 'The code box lists nothing as waiting on this port. The line of the proxy server has been removed.') : ('The code box lists ' + (sOn ? 'the origin server as waiting on this port.' : 'nothing as waiting on this port. The line of the origin server has been removed.') + (pOn ? ' The proxy server is running, but the client does not use its port, 8080.' : ''));
    push('The client (the program that sends requests) connects to the address in the code box and sends a GET /hello request. The ' + addr + ' in the middle of the address is a port number, a door number given to each program on one computer. The client tries to connect to the program waiting on port ' + addr + '. ' + who + note, '');
    if (viaP && !pOn) {
      // The proxy server is off and the client connects to the proxy
      st.cl = 'bad'; st.clt = ['Refused']; st.aq1 = 'bad'; st.got = G.refuse; st.gotc = 'bad'; st.way = 'Client → proxy (refused)'; st.wayc = 'bad';
      push('No program is waiting on port 8080, so the connection is not made, and the client receives a connection refused error. The request reached neither the proxy server nor the origin server.', 'bad');
      st.seen = S.none; st.seenc = 'bad';
      push('The origin server on port 9000 ' + (sOn ? 'is running and waiting, but it has never received a request. In this run, no peer connected to the server at all, because the client did not connect to port 9000.' : 'is not running.') + ' The origin server saw no peer.', 'bad');
      sum.push('If the proxy server is off, the client receives a connection refused error. Even though the origin server is running, nothing is waiting on port 8080, the port the client connects to, so the request could not reach the server.');
      sum.push('In a setup where the client connects only to the address of the proxy server, the proxy server is the only door to the origin server. When the door is closed, it does not help that the server behind it is fine.');
      return { events: ev, summary: sum, row: [G.refuse, S.none, st.way] };
    }
    if (viaP) {
      // The client connects to the proxy server, and the proxy server is running
      st.aq1 = 'hot'; st.px = 'hot'; st.pxt = ['Got request']; st.way = 'Client → proxy';
      if (sOn) {
        st.pxt = ['Got it, passed', 'it to 9000']; st.aq2 = 'hot'; st.sv = 'hot'; st.svt = ['Got request']; st.way = 'Client → proxy → origin server';
        push('The proxy server received the request. The proxy server is set to pass the request it receives to the origin server waiting on port 9000 (the proxy server line in the code box). So the proxy server makes a new connection to the origin server and sends the same GET /hello request. This connection is separate from the one the client made. The client did not make this connection, and it did not use the number 9000.', '');
        st.seen = S.proxy; st.seenc = 'good'; st.svt = ['Saw the proxy'];
        push('The origin server receives the request and returns "Hello" as the response, as written in the code box. The peer the server sees at this moment is the proxy server. The port of the peer that the server saw was different from the port the client used, and it was the same as the port the proxy server used when it connected to the server (in this run the three programs were on one computer, so all the addresses were 127.0.0.1, and we told them apart by port). The only peer that connected to the origin server was the proxy server.', 'good');
        st.ar2 = 'good'; st.ar1 = 'good'; st.got = G.ok; st.gotc = 'good'; st.cl = 'good'; st.clt = ['Got response']; st.px = 'plain'; st.pxt = ['Sent back']; st.sv = 'plain'; st.svt = ['Sent response'];
        push('The proxy server receives the response of the origin server and returns it to the client as it is. What the client received is 200 OK and the body "Hello". The client talked only with the proxy server it connected to.', 'good');
        sum.push('A proxy server is a server that stands between the client and the origin server and passes requests on for it. The client connects to the proxy server, and the proxy server connects again to the origin server, passes the same request on, and returns the response.');
        sum.push('So the origin server sees the proxy server, not the client. The client could connect without knowing the origin server\'s port (9000). Load balancers, CDNs, and API gateways are also servers that stand between a client and a server in this way.');
        return { events: ev, summary: sum, row: [G.ok, S.proxy, st.way] };
      }
      // The origin server is off
      st.pxt = ['Got request'];
      push('The proxy server received the request. The proxy server is set to pass the request it receives to the origin server waiting on port 9000, so it tries to connect to the origin server.', '');
      st.aq2 = 'bad'; st.pxt = ['Refused']; st.px = 'bad'; st.way = 'Client → proxy → origin server (refused)'; st.wayc = 'bad';
      push('No program is waiting on port 9000, so the proxy server receives a connection refused error. The request could not reach the origin server.', 'bad');
      st.ar1 = 'bad'; st.got = G.bad; st.gotc = 'bad'; st.cl = 'bad'; st.clt = ['Got a 502'];
      push('The proxy server returns a 502 Bad Gateway response to the client. 502 is a status code that tells that, while a proxy server was passing a request on for the client, something went wrong with the server behind it. This response was made by the proxy server, not by the origin server. The proxy server of this lab is built to return 502 when it cannot connect to the origin server.', 'bad');
      st.seen = S.none; st.seenc = 'bad';
      push('The client received a response, not a connection refused error. This is because the proxy server, the peer the client connected to, is running. The origin server is not running, so it never received a request, and the origin server saw no peer.', 'bad');
      sum.push('If the origin server is off, the client does not receive a connection refused error. It receives a 502 Bad Gateway response sent by the proxy server. This is because the proxy server the client connected to is running.');
      sum.push('Even for the same server failure, what the client sees differs when a proxy server is in between. The 502 is a response made by the proxy server, not by the server, and it means "I tried to pass the request on, but could not reach the server behind me."');
      return { events: ev, summary: sum, row: [G.bad, S.none, st.way] };
    }
    // Connecting directly to the origin server
    if (!sOn) {
      st.cl = 'bad'; st.clt = ['Refused']; st.dq = 'bad'; st.got = G.refuse; st.gotc = 'bad'; st.way = 'Client → origin server (refused)'; st.wayc = 'bad';
      push('No program is waiting on port 9000, so the connection is not made, and the client receives a connection refused error.' + (pOn ? ' The proxy server is running, but this request did not go to port 8080, so it does not pass through the proxy server.' : ''), 'bad');
      st.seen = S.none; st.seenc = 'bad';
      push('The origin server is not running, so it never received a request, and the origin server saw no peer. The request did not pass through a proxy server that could answer for it, so the client did not receive a response such as 502. It received a connection refused error.', 'bad');
      sum.push('If the client connects directly without a proxy server and the origin server is off, the client receives a connection refused error. There is no proxy server in between to answer for it, so there is no response such as 502 either.');
      sum.push('In the same situation through a proxy server, the client received 502 Bad Gateway (the earlier question). What the client receives when the server is down depends on whether there is a proxy server in between.');
      return { events: ev, summary: sum, row: [G.refuse, S.none, st.way] };
    }
    st.dq = 'hot'; st.sv = 'hot'; st.svt = ['Got request'];
    st.way = 'Client → origin server';
    push('The origin server receives the request and returns "Hello" as the response, as written in the code box. The peer the server sees at this moment is the client itself. The port of the peer that the server saw was the same as the port the client used.' + (pOn ? ' The proxy server is running, but it never received this request (the number of requests the proxy server received: 0).' : ' The proxy server is not running, but this request does not pass through the proxy server anyway, so it makes no difference.'), 'good');
    st.seen = S.client; st.seenc = 'good'; st.dr = 'good'; st.got = G.ok; st.gotc = 'good'; st.cl = 'good'; st.clt = ['Got response']; st.sv = 'plain'; st.svt = ['Sent response'];
    push('The client receives the response of the origin server directly. What it received is 200 OK and the body "Hello". No server in between passed it on.', 'good');
    if (pOn) {
      sum.push('If you connect to the origin server\'s port (9000) without going through the proxy server, the request goes straight to the server, and the server sees the client itself.');
      sum.push('Even when the proxy server is running, a request does not pass through it unless the client connects to its port. In this lab, whether the request goes through the proxy server was decided by which port the client connects to.');
    } else {
      sum.push('Even when the proxy server is off, a client that connects directly to the origin server is not affected. This request does not pass through the proxy server in the first place.');
      sum.push('What is blocked when the proxy server goes down is the requests that connect to the proxy server\'s port (8080).');
    }
    return { events: ev, summary: sum, row: [G.ok, S.client, st.way] };
  },
  render: function (v, sim, t, H, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : null;
    if (!s) { H.text(v, 'Click Run to start with the client connecting to the address in the code box.'); return; }
    H.table(v, ['Item', 'Value'], [
      { cls: s.got ? '' : 'gone', cells: ['What the client received', s.got ? { v: s.got, cls: s.gotc } : 'Not yet'] },
      { cls: s.seen ? '' : 'gone', cells: ['Who the origin server saw', s.seen ? { v: s.seen, cls: s.seenc } : 'Not yet'] },
      { cls: s.way ? '' : 'gone', cells: ['Path the request took', s.way ? { v: s.way, cls: s.wayc || 'good' } : 'Not yet'] },
    ], 'Result');
  },
  // Diagram: the client at the lower left, the proxy server at the top center, the origin server at the lower right. Through the proxy, the arrows bend client -> proxy -> origin server; when connecting directly, the arrow passes under the proxy and goes straight. A server that is off is a dashed box and a refused place is red. Three result boxes below.
  draw: function (P, sim, shown) {
    var c = sim.c, last = shown[shown.length - 1], s = last ? last.snap : null, pOn = c.up !== 'noproxy', sOn = c.up !== 'noserver';
    P.size(680, 340);
    P.box('cl', 14, 110, 140, 72, { cls: s ? s.cl : 'plain', title: 'Client', sub: s ? s.clt : ['Idle'] });
    P.box('px', 270, 30, 140, 72, { cls: s ? s.px : (pOn ? 'plain' : 'ghost'), title: 'Proxy server', sub: s ? s.pxt : (pOn ? ['Waiting on 8080'] : ['Not running']) });
    P.box('sv', 526, 110, 140, 72, { cls: s ? s.sv : (sOn ? 'plain' : 'ghost'), title: 'Origin server', sub: s ? s.svt : (sOn ? ['Waiting on 9000'] : ['Not running']) });
    function ac(x) { return x === 'plain' ? '' : x; }
    if (s && s.aq1) P.arrow('aq1', [154, 122], [270, 78], { cls: ac(s.aq1) });
    if (s && s.aq2) P.arrow('aq2', [410, 78], [526, 122], { cls: ac(s.aq2) });
    if (s && s.ar2) P.arrow('ar2', [526, 140], [410, 92], { cls: ac(s.ar2) });
    if (s && s.ar1) P.arrow('ar1', [270, 92], [154, 140], { cls: ac(s.ar1) });
    if (s && s.dq) P.arrow('dq', [154, 150], [526, 150], { cls: ac(s.dq) });
    if (s && s.dr) P.arrow('dr', [526, 168], [154, 168], { cls: ac(s.dr) });
    P.box('n1', 14, 206, 652, 36, { cls: s && s.got ? s.gotc || 'wait' : 'ghost', title: 'What the client received', right: s && s.got ? s.got : 'Not yet' });
    P.box('n2', 14, 248, 652, 36, { cls: s && s.seen ? s.seenc || 'wait' : 'ghost', title: 'Who the origin server saw', right: s && s.seen ? s.seen : 'Not yet' });
    P.box('n3', 14, 290, 652, 36, { cls: s && s.way ? s.wayc || 'wait' : 'ghost', title: 'Path the request took', right: s && s.way ? s.way : 'Not yet' });
  },
  assume: 'In our test run, we ran all six combinations for real, only on 127.0.0.1 of a single computer, and checked them against the model. We did not connect to any external network. The origin server and the proxy server are Node.js 24.18.0 http servers, and the client is http.request of the same Node.js (it does not reuse connections). The origin server answers GET /hello with 200 and the text written in the code box, "Hello", and it recorded the port of the peer that connected to it. The proxy server opened a new connection to the server whose port is written in the code box, passed the request it received on as it was, returned the response to the client, and recorded its own port used on that connection. The test program built the same text as the code on the screen, read it (which port has what written on it), and showed it as it was. A server whose line was removed was not started, and connecting to its port meant trying to connect to a free port that nothing was waiting on (a port that had just been closed). 8080 and 9000 on the screen are example numbers and free ports were used in the real run, and the code box is not the source of the programs that were run but a list of what is waiting on which port. What we checked against is what the client received (the status code and body, or the kind of error), who the origin server saw, and the path the request took; who the origin server saw was decided by comparing whether the peer port the server recorded was the same as the client\'s port or the same as the port the proxy server used when connecting to the server. The three programs were on one computer, so the peer address the server saw was 127.0.0.1 in every combination, and that is why we told them apart by port. In the combinations that went through the proxy server, the only peer that connected to the origin server was one (the proxy server), and in the combinations that connected directly, the proxy server received 0 requests. When nothing was waiting on 8080 (or 9000), the client received a connection refused error (ECONNREFUSED), and when the origin server was down and the request went through the proxy server, the proxy server got the same connection refused error and then returned 502. This 502 is a behavior that comes from how the proxy server of this lab was written, and we did not check what real proxy products return when they cannot connect. What we checked against the documentation is section 3.6 of RFC 9110 (an origin server is a program that can originate authoritative responses for a given target resource), section 3.7 (among intermediaries, a proxy is one that the client chooses by its configuration, and a gateway, also called a reverse proxy, acts as an origin server for the outbound connection and passes the requests it receives on to the inbound server), and section 15.6.3 (502 is the code used when a server acting as a gateway or proxy receives an invalid response from an inbound server). For section 15.6.3, we confirmed the first sentence word for word and the rest from a summary. The proxy server in this lab is the kind the client connects to believing it is the server, so in RFC terms it is closer to a gateway (reverse proxy), and we did not cover the difference from a forward proxy that the client chooses on purpose. We did not examine whether using 502 when the connection itself is refused fits the RFC sentence exactly. The sentence that load balancers, CDNs, and API gateways are also servers that stand between a client and a server is a general explanation, and it was not checked by this run or by the documentation. This lab leaves out many things. We did not look at headers such as X-Forwarded-For that pass the original client\'s address to the server, a setup that decrypts HTTPS at the proxy server, timeouts and 504 for slow responses, splitting requests among several servers, and keeping copies of responses. The first two are covered in the in-depth lab "Proxies and reverse proxies", splitting among servers in the in-depth lab "Load balancers and scale out", and keeping copies of responses in the in-depth lab "CDN". We did not use a browser, and we sent only one request, GET /hello.',
});

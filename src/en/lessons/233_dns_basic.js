Lab.register({
  id: 'dns_basic', nav: 'DNS', cat: 'Fundamentals', mode: 'step', basic: true, deep: ['dns'],
  title: 'What does DNS turn a name into?',
  intro: 'Computers connect to each other by IP address (a number), but people use names like shop.example. DNS is the service that turns a name into an IP address, and a DNS server is a computer that holds a table listing each name with its IP address. The code box on the screen has two parts. The upper part is what is registered on the DNS server (name → IP address), and the lower part is the address the client tries to reach. A client that connects by name first asks the DNS server for the IP address of that name, before it connects to the server, and then connects to the IP address it got in the answer. In this lab you leave the name unregistered, register it with a different IP address, or write an IP address directly in the address instead of a name, and make the same connection each time, to see how many times the DNS server is asked and which computer is reached. The 8080 on the screen is a port number written as an example.',
  terms: ['DNS', 'Domain names', 'IP address (IPv4)', 'NXDOMAIN response'],
  controls: [
    { id: 'reg', label: 'What is registered on the DNS server', type: 'select', value: 'one', options: [['one', 'shop.example is registered as 127.0.0.1'], ['two', 'shop.example is registered as 127.0.0.2 (acting as a different computer)'], ['none', 'shop.example is not registered']] },
    { id: 'target', label: 'The address the client tries to reach', type: 'select', value: 'name', options: [['name', 'It connects to http://shop.example:8080/'], ['ip', 'It connects to http://127.0.0.1:8080/ (the IP address is written directly)']] },
  ],
  // q is the question shown on the question-style screen. t and d are the name and the description used in the text-only reading
  presets: [
    { t: 'Default settings', q: 'What is DNS, and what happens when you connect by name?', d: 'The name is registered. The client first asks the DNS server, and then connects to the IP address it got.', v: { reg: 'one', target: 'name' } },
    { t: 'Leaving the name unregistered', q: 'What if shop.example is not registered in DNS?', d: 'The DNS server answers that there is no such name, so the client does not get an IP address. Even if the server is running, the client cannot start a connection.', v: { reg: 'none', target: 'name' } },
    { t: 'Registering a different IP address', q: 'What if the same name is registered with a different IP address (127.0.0.2)?', d: 'The client connects with the same name, but the DNS answer is different, so it reaches a different computer.', v: { reg: 'two', target: 'name' } },
    { t: 'Writing the IP address directly', q: 'What if you write an IP address instead of a name?', d: 'It is not a name, so the client does not ask the DNS server and connects straight to that IP address.', v: { reg: 'one', target: 'ip' } },
  ],
  IP: { one: '127.0.0.1', two: '127.0.0.2' },
  code: function (c) {
    var reg = c.reg === 'none' ? '(no names registered)' : 'shop.example    ' + this.IP[c.reg];
    return ['# Registered on the DNS server (name → IP address)', reg, '', '# The address the client tries to reach', c.target === 'name' ? 'http://shop.example:8080/' : 'http://127.0.0.1:8080/'].join('\n');
  },
  label: function (c) { return { one: 'registered as 127.0.0.1', two: 'registered as 127.0.0.2', none: 'not registered' }[c.reg] + ' · ' + (c.target === 'name' ? 'connects by name' : 'connects by IP address'); },
  columns: ['Times the DNS server was asked', 'DNS server\'s answer', 'IP address connected to', 'Response'],
  simulate: function (c) {
    var ev = [], sum = [], name = c.target === 'name', host = name ? 'shop.example' : '127.0.0.1';
    var dest = name ? { one: '127.0.0.1', two: '127.0.0.2', none: null }[c.reg] : '127.0.0.1';
    var who = dest === '127.0.0.2' ? 'c2' : 'c1', body = dest === '127.0.0.2' ? 'This is the second computer' : 'This is the first computer';
    var port = '8080 is the port number, the number of the door that a server program waits at inside that computer.';
    var st = { asked: 0, cl: 'plain', clt: ['Waiting'], dn: 'plain', ask: false, rep: '', go: '', back: false, c1: 'plain', c1t: ['Server running'], c2: 'plain', c2t: ['Server running'], ans: '', ip: '', resp: '' };
    function push(s, k) { ev.push({ s: s, k: k, snap: JSON.parse(JSON.stringify(st)) }); }
    // Step 1: look at the host part of the address
    st.cl = 'hot'; st.clt = ['Reading host'];
    if (name) {
      push('The client (a program, like a browser, that connects to a server) looks at the host part of the address it wants to reach, http://shop.example:8080/. The host is the part of the address that says which computer to connect to, and here it is shop.example. This is a name, not an IP address. Computers connect to each other by IP address, so before it connects, the client has to find out the IP address of this name.', '');
      // Step 2: ask the DNS server
      st.ask = true; st.asked = 1; st.dn = 'hot'; st.clt = ['Asking the', 'DNS server'];
      push('The client asks the DNS server, "What is the IP address of shop.example?" The DNS server is a computer that holds a table listing each name with its IP address (the "Registered" part at the top of the screen) and turns a name into an IP address. This question goes out before the client connects to the server.', '');
      // Step 3: the DNS server answers
      if (dest) {
        st.rep = 'good'; st.dn = 'good'; st.cl = 'plain'; st.ans = dest; st.clt = ['Got IP address', dest];
        push('The DNS server finds shop.example in its table and answers. The IP address of shop.example is ' + dest + '.' + (c.reg === 'two' ? ' In this table, shop.example is registered as 127.0.0.2. 127.0.0.2 is a different address from 127.0.0.1 (both point to this computer, but this lab treats them as two different computers).' : '') + ' Now the client knows where to connect.', 'good');
        // Step 4: connect
        st.go = who; st.ip = dest; st.dn = 'plain'; st.cl = 'hot'; st[who] = 'hot'; st.clt = ['Connecting to', dest + ':8080'];
        push('The client connects to port 8080 of the IP address it got in the answer, ' + dest + ', and sends a GET / request. ' + port + ' The name shop.example written in the address is not used for the connection. The place it connects to is the IP address that DNS gave.', '');
        // Step 5: the server's response
        st.back = true; st[who] = 'good'; st[who + 't'] = ['Replied with 200']; st.resp = '200 ' + body;
        push('The server that was running on the computer at IP address ' + dest + ' receives the request and sends back a 200 response. The body is "' + body + '". The DNS server did not take part in this connection.', 'good');
        st.cl = 'good'; st.clt = ['Got 200'];
        push('The client receives the 200 response. The body is "' + body + '".', 'good');
        if (c.reg === 'one') {
          sum.push('DNS is the service that turns a name into an IP address. A client that connects by name first asks the DNS server for the IP address of shop.example before it connects, and it connected to 127.0.0.1, the IP address it got in the answer.');
          sum.push('What connects to a server is an IP address, not a name. A name is for people to use, and just before the connection it is turned into an IP address through DNS.');
        } else {
          sum.push('When the same name shop.example is registered as 127.0.0.2, the DNS server answers 127.0.0.2, so the client reached a different computer (the second computer). Not a single character of the address it was given changed.');
          sum.push('Which computer a name points to is decided by the table on the DNS server. If you change only the IP address in the table, the same name connects to a different computer.');
        }
      } else {
        st.rep = 'bad'; st.cl = 'bad'; st.ans = 'No such name'; st.clt = ['Could not get', 'an IP address'];
        push('The DNS server looks for shop.example in its table, but no names are registered in the table at all. So it answers that there is no such name. The client did not get an IP address.', 'bad');
        st.c1t = ['No request']; st.c2t = ['No request']; st.clt = ['Could not start', 'the connection'];
        push('The client does not know where to connect, so it cannot start a connection, and it ends here. The servers on the two computers are running without any problem, but they did not even receive a request. What is blocked is not the server but the step that turns the name into an IP address.', 'bad');
        st.resp = 'Could not connect: the address of the name is unknown';
        push('The client reports that it could not connect: the address of the name is unknown.', 'bad');
        sum.push('When shop.example is not registered in DNS, the DNS server answers that there is no such name, and the client does not get an IP address, so it cannot even start a connection.');
        sum.push('It is the same even if the server is running without any problem. When you connect by name, getting the IP address from DNS is the first step, and if it is blocked there, you never get as far as the server.');
      }
    } else {
      st.dn = 'ghost';
      var regNote = { one: ' shop.example is registered on the DNS server, but this address does not contain shop.example, so the entry is not used.', two: ' shop.example is registered as 127.0.0.2 on the DNS server, but this address does not contain shop.example, so the entry is not used.', none: ' It does not matter that no names are registered on the DNS server.' }[c.reg];
      push('The client looks at the host part of the address it wants to reach, http://127.0.0.1:8080/. The host is the part of the address that says which computer to connect to, and here it is 127.0.0.1. This is an IP address, not a name. An IP address can be used for a connection as it is, so the client does not ask the DNS server.' + regNote, '');
      st.go = 'c1'; st.ip = '127.0.0.1'; st.c1 = 'hot'; st.clt = ['Connecting to', '127.0.0.1:8080'];
      push('The client connects to port 8080 of 127.0.0.1 and sends a GET / request. ' + port, '');
      st.back = true; st.c1 = 'good'; st.c1t = ['Replied with 200']; st.resp = '200 ' + body;
      push('The server that was running on the computer at IP address 127.0.0.1 receives the request and sends back a 200 response. The body is "' + body + '".', 'good');
      st.cl = 'good'; st.clt = ['Got 200'];
      push('The client receives the 200 response. The body is "' + body + '". It never asked the DNS server.', 'good');
      sum.push('When you write an IP address directly in the address instead of a name, the client does not ask the DNS server and connects straight to that IP address.');
      sum.push({ one: 'Even though shop.example is registered on the DNS server, it was not used. DNS takes part only when the address contains a name.', two: 'shop.example was registered as 127.0.0.2 on the DNS server, but it was not used, so the client connected to the first computer at 127.0.0.1. This is because the address contained an IP address, not a name.', none: 'It connected even though no names were registered in DNS. DNS is needed only when a name is turned into an IP address.' }[c.reg]);
    }
    return { events: ev, summary: sum, row: ['' + st.asked, st.ans || '(not asked)', st.ip || '(not connected)', st.resp] };
  },
  render: function (v, sim, t, H, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : null, host = sim.c.target === 'name' ? 'shop.example' : '127.0.0.1';
    if (!s) { H.text(v, 'Click Run to start with the client looking at the host part of the address.'); return; }
    var ok = s.resp.indexOf('200') === 0;
    H.table(v, ['Item', 'Value'], [
      { cls: '', cells: ['Host to connect to', host] },
      { cls: '', cells: ['Times the DNS server was asked', '' + s.asked] },
      { cls: s.ans || s.dn === 'ghost' ? '' : 'gone', cells: ['DNS server\'s answer', s.ans ? { v: s.ans, cls: s.rep === 'bad' ? 'bad' : 'good' } : (sim.c.target === 'ip' ? '(not asked)' : 'Not yet')] },
      { cls: s.ip ? '' : 'gone', cells: ['IP address connected to', s.ip || 'Not yet'] },
      { cls: s.resp ? '' : 'gone', cells: ['Response', s.resp ? { v: s.resp, cls: ok ? 'good' : 'bad' } : 'Not yet'] },
    ], 'Progress');
  },
  // Diagram: the client on the left, the DNS server (name → IP address table) at the top center, and two computers with servers running (127.0.0.1, 127.0.0.2) on the right. With a name, a question and an answer go to and from the DNS server and the client connects to the computer named in the answer. When an IP address is written directly, there is no arrow to the DNS server. If the answer is "no such name", no connection arrow appears.
  draw: function (P, sim, shown) {
    var c = sim.c, last = shown[shown.length - 1], s = last ? last.snap : null;
    var table = c.reg === 'none' ? '(no names registered)' : 'shop.example → ' + { one: '127.0.0.1', two: '127.0.0.2' }[c.reg];
    P.size(680, 332);
    P.box('cl', 14, 116, 130, 72, { cls: s ? s.cl : 'plain', title: 'Client', sub: s ? s.clt : ['Waiting'] });
    P.box('dn', 215, 14, 240, 72, { cls: s ? s.dn : 'plain', title: 'DNS server', sub: ['Name → IP address table', table] });
    P.box('c1', 486, 100, 180, 62, { cls: s ? s.c1 : 'plain', title: 'Pretend PC 127.0.0.1', sub: s ? s.c1t : ['Server running'] });
    P.box('c2', 486, 190, 180, 62, { cls: s ? s.c2 : 'plain', title: 'Pretend PC 127.0.0.2', sub: s ? s.c2t : ['Server running'] });
    if (s && s.ask) P.arrow('ask', 'cl:t:0.3', 'dn:l:0.35', { cls: 'hot' });
    if (s && s.rep) P.arrow('rep', 'dn:l:0.8', 'cl:t:0.75', { cls: s.rep });
    if (s && s.go) P.arrow('go', 'cl:r:0.4', s.go + ':l:0.5', { cls: 'hot' });
    if (s && s.back) P.arrow('back', s.go + ':l:0.8', 'cl:r:0.85', { cls: 'good' });
    P.box('n1', 14, 282, 322, 36, { cls: s && s.asked ? 'wait' : 'ghost', title: 'Times the DNS server was asked', right: '' + (s ? s.asked : 0) });
    P.box('n2', 344, 282, 322, 36, { cls: s && s.resp ? (s.resp.indexOf('200') === 0 ? 'good' : 'bad') : 'ghost', title: 'Response', right: s && s.resp ? s.resp.split(' ')[0] === '200' ? '200' : 'Failed' : 'Not yet' });
  },
  assume: 'All 6 combinations were checked against real execution, entirely within the 127.0.0.x addresses of the test machine. No outside network and no actual DNS settings of our test environment were asked. The DNS server is a small server started with dgram in Node.js 24.18.0 on a free UDP port of 127.0.0.1. Its messages were built by hand in the format of RFC 1035 section 4.1 (a 12-byte header, a question, and an answer). It answers an A query for a name in its registration table with that IP address, and it answers a name that is not in the table with RCODE 3 (Name Error, section 4.1.1). The client reads the two parts of the code box as written. If the host of the address is not an IP address according to net.isIP, it asks with resolve4 of a dns.Resolver whose only server is set to the server above with setServers, and it sends an HTTP request to the IP address it received. If the host is an IP address, it sends the request directly without calling the Resolver. The flow shown on the screen, "ask first if it is a name, and do not ask if it is an IP address", was made the same as the flow of this probe. The name resolution order of the operating system, the hosts file, the caches of browsers and operating systems, and recursive resolvers were not covered, and it was not checked whether a real browser works in the same order as this probe. Those details are covered in the in-depth lab "DNS". As servers, two HTTP servers were started on 127.0.0.1 and 127.0.0.2 with the same port number. The 8080 on the screen is an example number and a free port was actually used, and 127.0.0.2 imitates a "different computer" but is actually a different loopback address of the same PC. In our test run (Windows), the server bound to 127.0.0.2 right away. What was checked against is the number and kind of queries the DNS server received, the RCODE of the no-such-name answer, the answer the client received, the destination IP address of the connections the servers received, the status and body of the response, the order in which the query comes before the connection in the combinations with a name, and the fact that neither server received a connection or a request when the answer was no such name. "Times the DNS server was asked" is the number of A queries the DNS server received. This Resolver sent no queries of a kind other than A, and it did not ask again after receiving the no-such-name answer, so the number of queries and the number of A queries were the same. This is what was observed with the default settings of this Node.js version. That Node.js reports the no-such-name answer as an ENOTFOUND error is also observed behavior. The DNS server is not an independent implementation but one made for this lab, and what read its answers is dns.Resolver (c-ares) of Node.js, so it is checked against the outside only in the sense that the DNS messages were read by an independent implementation, and it was not checked against a DNS server that is actually in operation. What was checked against the documentation is RFC 1034 section 5.2.1 (a request to turn a host name into a host address becomes a request for an A record, and a name error is returned if the name does not exist), section 3.6 (resource records), section 4.3.1 (the response saying that the name does not exist), RFC 1035 section 3.4.1 (an A record is a 32-bit internet address), sections 4.1 and 4.1.1 (message format, RCODE 3 Name Error), and RFC 6761 section 6.5 (names ending in .example are reserved for documentation and are not registered). Registering several IP addresses for one name and using AAAA records were not covered, and the server code on the screen is not shown.',
});

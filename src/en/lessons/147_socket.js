Lab.register({
  id: 'socket', nav: 'Sockets and ports', cat: 'Networking', mode: 'step',
  title: 'Of the several programs on one computer, which one receives this data?',
  intro: 'An IP address leads only to one computer. Which of the programs running on that computer receives the data is decided by the port number. A program creates a socket and binds it to a port number, and the operating system passes data that arrives for that port to that socket. This lab shows which program a connection reaches, depending on the ports the servers listen on and the port the client connects to.',
  terms: ['Port', 'Socket', 'Ephemeral port', 'TCP and UDP'],
  controls: [
    { id: 'srv', label: 'Servers to start', type: 'select', value: 'same', options: [['ab', 'Server A on port 9000, Server B on port 9001'], ['same', 'Server A on port 9000, Server B also on port 9000'], ['a', 'Only Server A, on port 9000']] },
    { id: 'to', label: 'Port the clients connect to', type: 'select', value: '9000', options: [['9000', 'Port 9000'], ['9001', 'Port 9001'], ['9002', 'Port 9002 (a port nobody uses)']] },
    { id: 'n', label: 'Number of clients', type: 'select', value: '3', options: [['1', '1 client'], ['2', '2 clients'], ['3', '3 clients']], hint: 'All the clients connect without closing the earlier connections.' },
  ],
  presets: [
    { t: 'Default settings', q: 'What happens when Server A and Server B both start on port 9000 and 3 clients connect to port 9000?', d: 'Two servers cannot share one port, but three clients can connect to one port together.', v: { srv: 'same', to: '9000', n: '3' } },
    { t: 'Choosing the program by port', q: 'What if Server A is on port 9000, Server B is on port 9001, and 1 client connects to port 9001?', d: 'Same computer, but sending to port 9001 reaches Server B.', v: { srv: 'ab', to: '9001', n: '1' } },
    { t: 'A port with no server listening', q: 'What if Server A is on port 9000, Server B is on port 9001, and 1 client connects to port 9002, a port nobody uses?', d: 'Even though the computer is on, the connection is refused.', v: { srv: 'ab', to: '9002', n: '1' } },
    { t: 'Port 9001 after Server B failed to start', q: 'What if Server A and Server B are both on port 9000 and 2 clients connect to port 9001?', d: 'B did not get port 9000, and nobody is on port 9001.', v: { srv: 'same', to: '9001', n: '2' } },
    { t: 'One server, one client', q: 'What if you start only Server A on port 9000 and use 1 client?', d: 'Start with the simplest case.', v: { srv: 'a', to: '9000', n: '1' } },
  ],
  code: function (c) {
    var n = +c.n, bport = c.srv === 'same' ? 9000 : 9001;
    var s = '// Node.js (net module). Both the servers and the clients run on this computer (127.0.0.1)\nconst net = require(\'net\');\n\nconst serverA = net.createServer(conn => conn.on(\'data\', d => conn.write(\'A\')));\nserverA.listen(9000, \'127.0.0.1\');             // start listening on port 9000\n';
    if (c.srv !== 'a') s += '\nconst serverB = net.createServer(conn => conn.on(\'data\', d => conn.write(\'B\')));\nserverB.on(\'error\', e => console.log(e.code));  // if it fails, the error name is printed\nserverB.listen(' + bport + ', \'127.0.0.1\');' + (c.srv === 'same' ? '             // the port that Server A already uses' : '') + '\n';
    s += '\nfor (let i = 1; i <= ' + n + '; i++) {\n  const socket = net.connect(' + c.to + ', \'127.0.0.1\');   // write only the destination port. The source port is not written\n  socket.on(\'connect\', () => {\n    console.log(socket.localPort);              // the source port chosen by the operating system\n    socket.write(\'c\' + i);\n  });\n  socket.on(\'data\', d => console.log(d.toString()));   // which server received it\n  socket.on(\'error\', e => console.log(e.code));\n}';
    return s;
  },
  label: function (c) { return { ab: 'A on 9000, B on 9001', same: 'A and B both on 9000', a: 'Only A, on 9000' }[c.srv] + ' · connecting to port ' + c.to + ' · Clients: ' + c.n; },
  columns: ['Listen of Server B', 'Connections of the clients', 'Server that received the data', 'Connections the server saw'],
  // Who is listening on each port: the server that calls listen on the same port a second time fails
  owners: function (c) {
    var own = { 9000: 'A' }, b = 'none';
    if (c.srv === 'ab') { own[9001] = 'B'; b = 'ok'; }
    if (c.srv === 'same') b = 'EADDRINUSE';
    return { own: own, b: b };
  },
  simulate: function (c) {
    var o = this.owners(c), n = +c.n, to = +c.to, who = o.own[to] || '', ev = [], sum = [];
    var st = { ports: {}, b: '', conns: [], fails: [], sent: false };
    function push(s, k) { ev.push({ s: s, k: k, snap: JSON.parse(JSON.stringify(st)) }); }
    st.ports[9000] = 'A';
    push('serverA.listen(9000): Server A creates a socket, binds it to port 9000, and registers with the operating system: "Give the connections that arrive on port 9000 to this socket." Port 9000 was free, so this succeeds. Server A now waits for connections.', '');
    if (c.srv === 'ab') { st.ports[9001] = 'B'; st.b = 'ok'; push('serverB.listen(9001): Server B registers a different number, 9001. The port is free, so this succeeds. Two programs on one computer wait for connections on different ports.', 'good'); }
    if (c.srv === 'same') { st.b = 'EADDRINUSE'; push('serverB.listen(9000): Server B also tries to register port 9000. Server A is already using it, so the operating system refuses, and Server B receives an EADDRINUSE (address already in use) error. With the default settings, without special socket options, only one program can receive the connections that arrive on a port, because otherwise the operating system could not decide whom to give them to.', 'bad'); }
    for (var i = 1; i <= n; i++) {
      var cp = 50000 + i;
      if (who) {
        st.conns.push({ c: i, cp: cp, sp: to, who: who });
        push('Client ' + i + ' calls net.connect(' + to + '): ' + (i === 1 ? 'The code gives only the destination port. The operating system picks one of the free numbers (here ' + cp + ') as the source port. Server ' + who + ' is listening on port ' + to + ', so the connection is established.' : 'This time the operating system picks ' + cp + ' as the source port. Server ' + who + ' is listening, so the connection is established. The destination port is the same ' + to + ' as in the earlier connection, and only the source port differs.' + (i === 2 ? ' The operating system treats connections as different if even one of the four values (source IP, source port, destination IP, destination port) differs.' : ' The earlier two connections are not closed and stay open.')), 'good');
      } else {
        st.fails.push({ c: i, to: to });
        push('Client ' + i + ' calls net.connect(' + to + '): ' + (i === 1 ? 'No program is listening on port ' + to + '. The operating system on the receiving side sends back an answer that means "refused," and the client receives an ECONNREFUSED (connection refused) error. Even if the computer is on and the IP address is correct, a connection cannot be made when no program is listening on that port.' + (c.srv === 'same' && to === 9001 ? ' Server B only failed to get port 9000. It is not listening on port 9001.' : '') : 'It receives an ECONNREFUSED error for the same reason. No matter how many times it tries, it cannot connect until a program starts listening on that port.'), 'bad');
      }
    }
    if (who) {
      st.sent = true;
      push('socket.write: ' + (n > 1 ? 'Each of the ' + n + ' clients sends its data. All of it goes to port ' + to + ', but the operating system looks at the source port to tell which connection the data belongs to, and passes it to Server ' + who + ' separately for each connection, because each connection has its own socket.' : 'The client sends its data. The destination port is ' + to + ', so the operating system passes it to the socket of Server ' + who + '.') + (c.srv === 'ab' ? ' Nothing goes to Server ' + (who === 'A' ? 'B' : 'A') + ' on the same computer.' : ''), 'good');
    }
    var bRow = { ok: 'Succeeded (port 9001)', EADDRINUSE: 'Failed (EADDRINUSE)', none: 'Not started' }[o.b];
    if (c.srv === 'same') sum.push('Starting a server on a port that is already in use fails with EADDRINUSE. If you meet a "port already in use" error during development, most often the server you started earlier is still alive. End that program or use another port.');
    if (who && n > 1) sum.push('Several clients can connect to one server port at the same time. Even when connections increase, the server side has only one port, ' + to + ', and connections are told apart by the set of four values (source IP, source port, destination IP, destination port). A web server receiving many users on the single port 443 works on the same principle.');
    if (who && n === 1) sum.push('A client decides only the destination port, and the operating system picks the source port temporarily.');
    if (!who) sum.push('ECONNREFUSED means "the connection reached that computer, but no program is listening on that port." First check whether the server is running and whether the port number is right. It is a different error from a timeout, which ends after waiting when there is no response at all.');
    if (c.srv === 'ab' && who) sum.push('Even with the same IP address, a different port means the data goes to a different socket. Here server A listens on 9000 and server B on 9001, so the receiving program differed by port. One program can also listen on several ports, so a different port does not always mean a different program. This is why the destination is written together as "IP:port".');
    return { events: ev, summary: sum, own: o.own, who: who,
      row: [bRow, who ? 'Succeeded: ' + n : 'Refused: ' + n + ' (ECONNREFUSED)', who ? 'Server ' + who : 'None', who ? 'Connections: ' + n + ' · One server-side port (' + to + ') · Client-side ephemeral ports: ' + n : 'Connections: 0'] };
  },
  render: function (v, sim, t, H, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : null;
    if (!s) { H.text(v, 'Click Run to go through the steps one at a time, starting from the servers.'); return; }
    if (s.conns.length) H.table(v, ['Client', 'Source IP', 'Source port', 'Destination IP', 'Destination port', 'Receiving program'], s.conns.map(function (k) { return { cells: [String(k.c), '127.0.0.1', { v: String(k.cp), cls: 'hot' }, '127.0.0.1', String(k.sp), 'Server ' + k.who] }; }), 'Established connections (two connections are the same only if all four values are the same)');
    if (s.fails.length) H.table(v, ['Client', 'Port it tried to connect to', 'Result'], s.fails.map(function (k) { return { cells: [String(k.c), k.to + '', { v: 'ECONNREFUSED', cls: 'bad' }] }; }), 'Refused connections');  },
  // Diagram: the clients on the left, and the three ports of the server computer on the right. If the port an arrow reaches has a program listening, the connection is made, and if not, it is refused.
  draw: function (P, sim, shown) {
    var c = sim.c, n = +c.n, last = shown[shown.length - 1], s = last ? last.snap : { ports: {}, b: '', conns: [], fails: [], sent: false };
    P.size(680, 316);
    P.region('cl', 16, 16, 232, 236, 'Clients (127.0.0.1)');
    P.region('sv', 330, 16, 334, 236, 'Ports of the server computer (127.0.0.1)');
    [9000, 9001, 9002].forEach(function (p, k) {
      var who = s.ports[p], cnt = s.conns.filter(function (x) { return x.sp === p; }).length, refused = s.fails.some(function (x) { return x.to === p; });
      P.box('p' + p, 346, 52 + k * 66, 302, 52, { cls: who ? (cnt ? 'good' : 'wait') : refused ? 'bad' : 'ghost', title: 'Port ' + p, sub: who ? 'Listening: ' + who + (p === 9000 && s.b === 'EADDRINUSE' ? ' (B failed)' : '') : 'No program listening', right: cnt ? 'Connections: ' + cnt : '' });
    });
    for (var i = 1; i <= n; i++) {
      var ok = s.conns.filter(function (x) { return x.c === i; })[0], bad = s.fails.filter(function (x) { return x.c === i; })[0];
      P.box('c' + i, 30, 52 + (i - 1) * 66, 204, 52, { cls: ok ? 'good' : bad ? 'bad' : 'ghost', title: 'Client ' + i, sub: ok ? 'Source port ' + ok.cp : bad ? 'ECONNREFUSED' : 'Not connected yet' });
      if (ok || bad) P.arrow('a' + i, 'c' + i + ':r', 'p' + (ok ? ok.sp : bad.to) + ':l:' + (0.25 * i), { cls: ok ? 'good' : 'bad', label: ok ? (s.sent ? 'data' : 'connect') : 'refused' });
    }
    P.box('rb', 16, 268, 320, 34, { cls: !s.b ? 'ghost' : s.b === 'ok' ? 'good' : 'bad', title: 'Listen of Server B', right: !s.b ? (c.srv === 'a' ? 'Not started' : 'Not yet') : s.b === 'ok' ? 'Succeeded' : 'EADDRINUSE' });
    P.box('rc', 344, 268, 320, 34, { cls: s.conns.length ? 'good' : s.fails.length ? 'bad' : 'ghost', title: 'Connections', right: 'Succeeded ' + s.conns.length + ' · Refused ' + s.fails.length });
    P.note('Each box on the right is one port. The client-side source ports (such as 50001) are examples for the explanation. In reality, the operating system picks a different number each time you run it.');
  },
  assume: 'The 27 combinations were actually run with the net module on 127.0.0.1 in our test run (Windows, Node.js 24) and checked against the results. What was checked: the result of the listen call of Server B (success or EADDRINUSE), the number of successful and refused client connections (ECONNREFUSED), the server that received the data, the number of connections the server saw, whether the ports of the server-side sockets were all the same as the one listening port, and whether the client-side ports were different from each other. In the runs, three ports that were free at the time were used instead of 9000, 9001, and 9002, and because the client-side port numbers (such as 50001 on the screen) change on every run, only the fact that they are "different from each other" was used as a result. The range from which an operating system picks ephemeral ports depends on the operating system and its settings (the range that IANA recommends is 49152 to 65535, Section 6 of RFC 6335). That a connection is identified by the IP addresses and ports on both sides is the definition in the TCP specification (the entries for connection and socket in the glossary in Section 4 of RFC 9293). Not covered: clients on another computer, and special socket options (such as SO_REUSEPORT) that let several programs share the same port.',
});

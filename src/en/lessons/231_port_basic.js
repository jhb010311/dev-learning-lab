Lab.register({
  id: 'port_basic', nav: 'IP addresses and ports', cat: 'Fundamentals', mode: 'step', basic: true, deep: ['socket'],
  title: 'What do an IP address and a port each point to?',
  intro: 'To connect to another program over a network, you need to know two things. An IP address is a number that points to "which computer", and a port is a number that points to "which of the programs running on that computer". In the code box, the server program asks the operating system for port 8080 with new ServerSocket(8080), opens it, and waits for a connection, and the client program connects with new Socket("127.0.0.1", 8080) to port 8080 of the computer 127.0.0.1 (this computer itself). In this lab, you do not start the server program, or connect to port 9090 that nobody has opened, or let another program open port 8080 that is already open, and you see what happens to the connection. The server and the client are different programs, so the code box shows the code of both programs together.',
  terms: ['IP address (IPv4)', 'Port', 'Socket', '127.0.0.1 (localhost)'],
  controls: [
    { id: 'server', label: 'The server program has opened port 8080', type: 'check', value: true },
    { id: 'port', label: 'Port the client connects to', type: 'select', value: 'same', options: [['same', 'The client connects to port 8080'], ['other', 'The client connects to port 9090 (a port that nobody has opened)']] },
    { id: 'second', label: 'Another program tries to open port 8080 once more', type: 'check', value: false },
  ],
  // q is the question shown on the question-style screen. t and d are the name and the description used in the text-only reading
  presets: [
    { t: 'Default settings', q: 'How are the IP address and the port used, and what happens when the client connects to the port the server opened?', d: 'The server has opened port 8080 and the client connects to the same port. The operating system hands the connection to the server, and the client receives the text.', v: { server: true, port: 'same', second: false } },
    { t: 'Connecting without the server program', q: 'What if you connect without starting the server program?', d: 'No program has opened port 8080, so the operating system refuses the connection.', v: { server: false, port: 'same', second: false } },
    { t: 'Connecting to port 9090', q: 'What if you connect to port 9090, which the server did not open?', d: 'The server opened only port 8080, so a connection to port 9090 is refused.', v: { server: true, port: 'other', second: false } },
    { t: 'Opening the same port again', q: 'What if another program tries to open the same port 8080 again?', d: 'The server has already opened that port, so the second program cannot open it. The communication between the server and the client stays the same.', v: { server: true, port: 'same', second: true } },
  ],
  // The code on the screen: the server program, the program that tries to open the same port again, and the client program, in this order
  SERVER: ['// Server program: open port 8080 and wait for a connection', 'ServerSocket server = new ServerSocket(8080);', 'Socket fromClient = server.accept();', 'fromClient.getOutputStream().write("Hello".getBytes("UTF-8"));', 'fromClient.close();'],
  SECOND: ['// Another program: try to open the same port 8080', 'ServerSocket another = new ServerSocket(8080);'],
  code: function (c) {
    var parts = [];
    if (c.server) parts.push(this.SERVER.join('\n'));
    if (c.second) parts.push(this.SECOND.join('\n'));
    parts.push(['// Client program: connect to 127.0.0.1 (this computer)', 'Socket socket = new Socket("127.0.0.1", ' + (c.port === 'same' ? '8080' : '9090') + ');', 'String text = new String(socket.getInputStream().readAllBytes(), "UTF-8");', 'System.out.println(text);'].join('\n'));
    return parts.join('\n\n');
  },
  label: function (c) { return (c.server ? 'Server program opens port 8080' : 'No server program') + ' · Client connects to port ' + (c.port === 'same' ? '8080' : '9090') + (c.second ? ' · Another program tries to open port 8080 again' : ''); },
  columns: ['Client connection', 'Text the client received', 'Program that tried to open the same port again'],
  simulate: function (c) {
    var ev = [], sum = [], same = c.port === 'same', P = same ? '8080' : '9090';
    var st = { o8: '', pass: '', ask: '', phase: '', back: '', cli: ['Waiting'], clc: 'plain', srvSub: c.server ? ['Not started'] : ['Not launched'], srvc: c.server ? 'plain' : 'ghost', secSub: c.second ? ['Not started'] : ['Not launched'], secc: c.second ? 'plain' : 'ghost', tried: '', r1: '', r2: '', r3: '' };
    function push(s, k) { ev.push({ s: s, k: k, snap: JSON.parse(JSON.stringify(st)) }); }
    // Server program
    if (c.server) {
      st.o8 = 'srv'; st.srvc = 'hot'; st.srvSub = ['Opened port 8080'];
      push('The server program starts and runs the line new ServerSocket(8080). This line asks the operating system, "give me the connections that come to port 8080". The operating system accepts the request, so now the program that has opened port 8080 on this computer is the server program.', '');
      st.srvc = 'wait'; st.srvSub = ['Waiting at accept'];
      push('It runs the line server.accept(). accept is a method that waits until a connection comes, so the server program stops at this line and waits for a connection.', '');
    } else {
      push('The server program is not started. No program on this computer has opened port 8080 or port 9090.', '');
    }
    // The program that tries to open the same port again
    if (c.second) {
      st.secc = 'hot'; st.secSub = ['Trying to open port 8080']; st.phase = 'try';
      if (c.server) {
        st.secc = 'bad'; st.secSub = ['Could not open', 'BindException']; st.tried = 'fail';
        push('Another program starts and runs the line new ServerSocket(8080). It is a request to open the same port 8080, but this port is already open by the server program. The operating system does not accept the request, and Java throws java.net.BindException ("Address already in use: bind" in our test run on Windows 11). This code has no line that handles the exception, so this program stops at this line. A port can be opened by only one program at a time.', 'bad');
      } else {
        st.o8 = 'sec'; st.secc = 'good'; st.secSub = ['Opened port 8080', 'Does not call accept']; st.tried = 'ok';
        push('Another program starts and runs the line new ServerSocket(8080). Nobody has opened port 8080 yet, so the operating system accepts the request, and now the program that has opened port 8080 on this computer is this program. The code of this program has no line that calls accept. It opened the port, but it has no code that accepts the connections that come.', '');
      }
    }
    // Client
    st.phase = 'ask'; st.ask = P; st.clc = 'wait'; st.cli = ['Connecting to', 'port ' + P];
    push('The client program runs the line new Socket("127.0.0.1", ' + P + '). 127.0.0.1 is the address that points to the computer this code is running on (the name localhost means this address), and ' + P + ' is the port number of the program on that computer that it wants to connect to. An IP address points to which computer and a port points to which program on that computer, so the client asks to connect to port ' + P + ' of this computer.', '');
    var owner = same ? st.o8 : '';
    if (!owner) {
      st.phase = 'back'; st.back = 'bad'; st.clc = 'bad'; st.cli = ['Refused'];
      push('The operating system looks for the program that has opened port ' + P + '. No program has opened it, so the operating system refuses the connection, and Java throws java.net.ConnectException ("Connection refused: connect" in our test run on Windows 11) at the new Socket line. It is the operating system that refused, not the code of the server program.' + (!same && st.o8 ? ' There is a program that has opened port 8080, but if the port number is different, it is a different port.' : ''), 'bad');
      if (c.server && !same) { st.srvc = 'wait'; push('The server program did not receive this connection request. The server program opened only port 8080, so the request that went to port 9090 did not reach the server program, and the server program keeps waiting at accept.', ''); }
      push('This code has no line that handles the exception, so the client program stops at the new Socket line. The line that reads text was not run, so there is no text received.', 'bad');
    } else {
      st.phase = 'pass'; st.pass = owner; st.clc = 'good'; st.cli = ['Connected'];
      if (owner === 'srv') {
        st.srvc = 'good'; st.srvSub = ['Connection accepted'];
        push('The operating system looks for the program that has opened port 8080. The server program opened it, so the operating system hands the connection to the server program. The server\'s server.accept() line finishes, and it returns a socket object for exchanging text over this connection, and the variable fromClient refers to that object.', 'good');
      } else {
        st.secSub = ['Opened port 8080', 'Ignores connections'];
        push('The operating system looks for the program that has opened port 8080. Another program opened it, so the operating system takes the connection request as that program\'s. According to the ServerSocket documentation, connection requests that have not been accepted yet pile up in a queue of the operating system (length 50). The client\'s new Socket line finishes without an error, so from the client\'s side it is connected.', 'good');
      }
      push('The socket on the client side also has a port number of its own. The code never set it, yet it had a number different from the server\'s port (all the numbers we saw in the checking runs were 49152 or higher). One connection is told apart by the pair of IP addresses and ports at its two ends.', '');
      if (owner === 'srv') {
        st.srvSub = ['Sent text, closed it'];
        push('The server program writes "Hello" to fromClient (write) and closes this connection with fromClient.close().', '');
        st.phase = 'back'; st.back = 'good'; st.cli = ['Text received:', 'Hello'];
        push('The client\'s readAllBytes reads all the text that comes until the connection is closed. The variable text refers to the string "Hello" made from the text that was read, and println prints it.', 'good');
      } else {
        st.cli = ['Awaiting text']; st.clc = 'wait'; st.back = '';
        push('The client\'s readAllBytes line waits until text comes and until the connection is closed. But the other program has no line that calls accept and no line that sends text. We watched for 3 seconds, no text came, and the client did not get past this line.', 'bad');
      }
    }
    // Result row
    var conn = !owner ? 'Refused: no program has opened that port' : owner === 'srv' ? 'Connected' : 'Connected (waiting for text because no code accepts it)';
    var text = owner === 'srv' ? 'Hello' : !owner ? 'None' : 'None (waiting for text to arrive)';
    var again = !c.second ? '(none)' : c.server ? 'Could not open: another program already uses the port' : 'Opened';
    st.r1 = conn; st.r2 = text; st.r3 = again;
    // Show the results in the last step's picture (before this, every step showed them as not yet known)
    if (ev.length) { var lastSnap = ev[ev.length - 1].snap; lastSnap.r1 = conn; lastSnap.r2 = text; lastSnap.r3 = again; }
    // Summary
    var secLine = c.second && c.server ? ' The attempt of another program to open port 8080 again failed, regardless of this connection.' : c.second ? ' Another program opened port 8080, but the client connected to port 9090, so the connection is refused.' : '';
    if (c.server && same && !c.second) {
      sum.push('An IP address is a number that points to "which computer", and a port is a number that points to "which of the programs running on that computer". While the server program had opened port 8080 and was waiting, the client connected to port 8080 of 127.0.0.1 (this computer), and the operating system handed the connection to the server program and the text was received.');
      sum.push('The client code does not have the name of the server program, only the address and the port. It is the operating system that finds the program that opened the port and hands the connection to it.');
    } else if (c.server && same) {
      sum.push('If another program tries to open port 8080, which the server program has already opened, it cannot open it (BindException). The server and the client exchanged text without being affected.');
      sum.push('A port can be opened by only one program at a time. So the one program that gets the connections coming to port 8080 is decided.');
    } else if (c.server) {
      sum.push('The port the server program opened is 8080, but if the client connects to port 9090, no program has opened port 9090, so the operating system refuses the connection. The server program does not receive this request and keeps waiting at accept.' + secLine);
      sum.push('Even if the server is running on the same computer, a different port number does not reach it. It is the IP address that finds the computer, and it is the port that finds the program inside that computer.');
    } else if (same && !c.second) {
      sum.push('If you connect without starting the server program, no program has opened port 8080, so the operating system refuses the connection (ConnectException). There is no text received either.');
      sum.push('Even if 127.0.0.1 points to the right computer, the connection fails if no program has opened that port. It is the operating system that refuses, not the code of the server program.');
    } else if (same) {
      sum.push('If another program opens port 8080 without the server program, the client\'s connection succeeds, but no code accepts it, so no text comes and the client waits.');
      sum.push('Opening a port (new ServerSocket) and accepting a connection (accept) are different lines. The operating system takes a connection as the share of the program that opened the port, but sending text is the code of that program.');
    } else {
      sum.push('There is no server program and no program has opened port 9090, so the operating system refuses the client\'s connection (ConnectException).' + secLine);
      sum.push(c.second ? 'Ports are opened one number at a time. Even if some program opened port 8080, port 9090 is not open.' : 'If you connect to a port that nobody has opened, you get the same result on any computer you go to. For the connection to succeed, a program must have opened that port.');
    }
    return { events: ev, summary: sum, row: [conn, text, again] };
  },
  render: function (v, sim, t, H, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : null;
    if (!s) { H.text(v, 'Click Run to start with the server program opening the port.'); return; }
    var who = { srv: 'Server program', sec: 'Another program' };
    H.table(v, ['Port', 'Program that opened the port'], [
      { cls: s.o8 ? '' : 'gone', cells: ['8080', s.o8 ? { v: who[s.o8], cls: 'good' } : '(none)'] },
      { cls: 'gone', cells: ['9090', '(none)'] },
    ], 'Ports open on this computer (127.0.0.1)');
    H.table(v, ['Item', 'Value'], [
      { cls: s.r1 ? '' : 'gone', cells: ['Client connection', s.r1 ? { v: s.r1, cls: s.r1 === 'Connected' ? 'good' : 'bad' } : 'Not yet'] },
      { cls: s.r2 ? '' : 'gone', cells: ['Text the client received', s.r2 ? { v: s.r2, cls: s.r2 === 'Hello' ? 'good' : 'bad' } : 'Not yet'] },
      { cls: s.r3 ? '' : 'gone', cells: ['Program that tried to open the same port again', s.r3 ? { v: s.r3, cls: s.r3 === 'Opened' ? 'good' : s.r3.indexOf('Could not open') === 0 ? 'bad' : '' } : 'Not yet'] },
    ], 'Result');
  },
  // Diagram: inside the area of the computer where all three programs run (127.0.0.1), the client on the left, doors with port numbers (8080, 9090) in the middle, and the program boxes behind them on the right (the server program, another program). The connection arrow shows whether it passes through a door and reaches a program or is refused at the door, and the result boxes are below.
  draw: function (P, sim, shown) {
    var c = sim.c, last = shown[shown.length - 1], s = last ? last.snap : null;
    P.size(680, 336);
    P.region('pc', 4, 16, 672, 214, 'The computer where all three programs run (127.0.0.1)');
    P.box('cl', 14, 84, 130, 66, { cls: s ? s.clc : 'plain', title: 'Client', sub: s ? s.cli : ['Waiting'] });
    var o8 = s ? s.o8 : '';
    var door = function (n) { var on = s && s.ask === n, st = s && s.phase === 'back' && on ? s.back : ''; return st === 'bad' ? 'bad' : st === 'good' ? 'good' : on ? 'hot now' : (n === '8080' && o8) ? 'plain' : 'ghost'; };
    P.box('d1', 212, 46, 150, 66, { cls: door('8080'), title: 'Port 8080', sub: o8 === 'srv' ? ['Opened by the', 'server program'] : o8 === 'sec' ? ['Opened by', 'another program'] : ['Not opened'] });
    P.box('d2', 212, 130, 150, 66, { cls: door('9090'), title: 'Port 9090', sub: ['Not opened'] });
    P.box('srv', 440, 46, 212, 66, { cls: s ? s.srvc : (c.server ? 'plain' : 'ghost'), title: 'Server program', sub: s ? s.srvSub : (c.server ? ['Not started'] : ['Not launched']) });
    P.box('sec', 440, 130, 212, 66, { cls: s ? s.secc : (c.second ? 'plain' : 'ghost'), title: 'Another program', sub: s ? s.secSub : (c.second ? ['Not started'] : ['Not launched']) });
    if (s && s.tried === 'fail') P.arrow('try', 'sec:l:0.25', 'd1:r:0.8', { cls: 'bad dash' });
    else if (s && s.phase === 'try') P.arrow('try', 'sec:l:0.25', 'd1:r:0.8', { cls: 'hot' });
    if (s && s.ask) P.arrow('ask', 'cl:r:0.3', (s.ask === '8080' ? 'd1' : 'd2') + ':l:0.3', {});
    if (s && s.pass) P.arrow('pass', 'd1:r:0.3', s.pass + ':l:0.5', { cls: 'hot' });
    if (s && s.back) P.arrow('back', (s.ask === '8080' ? 'd1' : 'd2') + ':l:0.75', 'cl:r:0.75', { cls: s.back });
    P.box('n1', 14, 244, 322, 36, { cls: s && s.r1 ? (s.r1 === 'Connected' ? 'good' : 'bad') : 'ghost', title: 'Client connection', right: s && s.r1 ? s.r1.split(':')[0].split(' (')[0] : 'Not yet' });
    P.box('n2', 344, 244, 322, 36, { cls: s && s.r2 ? (s.r2 === 'Hello' ? 'good' : 'bad') : 'ghost', title: 'Text received', right: s && s.r2 ? s.r2.split(' (')[0] : 'Not yet' });
    P.box('n3', 14, 290, 652, 36, { cls: s && s.r3 ? (s.r3 === 'Opened' ? 'good' : s.r3 === '(none)' ? 'ghost' : 'bad') : 'ghost', title: 'Program that tried to open the same port again', right: s && s.r3 ? s.r3.split(':')[0] : 'Not yet' });
  },
  assume: 'Java is JDK 21.0.12.1 and the operating system is Windows 11. For all 8 combinations, we made the sources of the server program, another program, and the client program from the same text as the code on the screen, compiled them, started the java of this JDK as separate processes, and checked against the result of actually connecting on 127.0.0.1. What we checked is whether the client\'s connection succeeded and the kind of exception thrown, the text the client received, and whether the program that tried to open the port again opened it and the kind of exception thrown. 8080 and 9090 on the screen are example numbers, and in the actual check we picked two other numbers that were free in our test run for each combination and used them in the 8080 slot and the 9090 slot (for the 9090 slot, we tried to connect and confirmed that nobody had opened it). The code on the screen leaves out the import lines, the main method, and the exception handling (passed on with throws Exception), and the real programs have one more output line that tells that the process is ready. The only connection between the server and the client that we really made was on 127.0.0.1, and we did not connect to an external network. However, new ServerSocket(port) opens in a form that accepts connections on all addresses of this computer (netstat also showed 0.0.0.0), so during the check the server program was not bound to 127.0.0.1 only for a few seconds. The connection refusal and the "port already in use" error were returned by the operating system (Windows 11), and Java reported them as exceptions. When the connection was refused, what Java threw was java.net.ConnectException (message Connection refused: connect), and when it opened an already open port again, what it threw was java.net.BindException (message Address already in use: bind), and these messages were observed in our test run (Windows 11) and may differ from one operating system to another. What we checked by execution is that right after the server opens the port, the list of the operating system (netstat) shows that port as belonging to the server process, that the own port of the client-side socket is a number of 49152 or higher different from the server port, that if only another program opens the port without the server, the client\'s connection succeeds but no text comes within 3 seconds and the client does not finish (we did not look at what happens after 3 seconds), and that even if the client connects to a port the server did not open, the server process keeps waiting. We did not capture packets, so we could not check with which signal the operating system actually refused the TCP connection request. For the documents, we opened the following directly and checked them. Section 2.2 of RFC 9293 (TCP) says that TCP tells application services apart by port numbers, section 3.1 says that the header has a source port and a destination port, section 3.4.1 says that a connection is identified by a pair of sockets (the two ends), and section 3.10.7.1 says that in the state with no connection (CLOSED), when a segment that does not carry RST arrives, it responds with RST (we could not confirm whether the refusal above is this). Section 3.2.1.3 (g) of RFC 1122 sets addresses that start with 127 as the internal host loopback address and says that they must not appear outside the host, and Table 4 in section 2.2.2 of RFC 6890 lists 127.0.0.0/8 as Loopback and marks it as an address that is not forwarded. Section 6.3 of RFC 6761 recommends that the name localhost be resolved to the loopback address (when we resolved localhost in our test run, we got 127.0.0.1 and ::1, the IPv6 loopback address, and this lab dealt with 127.0.0.1 only). The java.net.ServerSocket documentation (Java SE 21) says that it creates a server socket with a port number, that the queue length for connection requests that have not been accepted yet is 50, and that accept blocks until a connection comes. This documentation has no explanation of BindException or of a port already in use, and the constructor description in the java.net.Socket documentation does not mention ConnectException either, so the two exceptions are observations from our test run. A port here is a port for connecting over TCP, and we did not cover UDP, IPv6, a computer with several IP addresses, or connecting to another computer on the internet. The details of sockets and ports (ephemeral ports, the range of port numbers and well-known numbers, and so on) are covered in the in-depth lab "Sockets and ports".',
});

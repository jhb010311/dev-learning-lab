Lab.register({
  id: 'tcp_basic', nav: 'TCP connections', cat: 'Fundamentals', mode: 'step', basic: true, deep: ['tcp', 'udp'],
  title: 'What does it mean to open a connection, and what happens if you send without one?',
  intro: 'TCP and UDP are two sets of rules for two programs to send text (bytes) to each other over a network. To send with TCP, the sending program must first run a line that says "connect to port 9000 of 127.0.0.1" and open a connection to the receiving program. The connection is opened only when the receiving program has that port open and is waiting, and the text sent after that arrives in the order it was sent. UDP has no line for connecting. Each line that sends text names where to send it and just throws it out. In this lab you switch the way of sending between TCP and UDP, add or remove the receiving program, and see what the sender gets and what the receiver gets. The code box is not a real program; it describes in words what the two programs do, and the number 9000 is an example. A port is a number that tells programs apart inside one computer, and the address 127.0.0.1 points to this computer itself.',
  terms: ['TCP and UDP', 'TCP connection', 'Connection refused error', 'Sending with UDP and delivery confirmation'],
  controls: [
    { id: 'proto', label: 'How to send', type: 'select', value: 'tcp', options: [['tcp', 'Connect with TCP, then send'], ['udp', 'Send with UDP, without a connection']] },
    { id: 'listen', label: 'The receiving program waits on port 9000', type: 'check', value: true },
  ],
  // q is the question shown on the question-style screen. t and d are the name and the description used in the text-only reading
  presets: [
    { t: 'Default settings', q: 'What does a TCP connection look like in code, and what happens when you send "A", "B", "C" while the receiver waits on port 9000?', d: 'The receiver is waiting, so the connection is opened, and the text arrives in the order it was sent.', v: { proto: 'tcp', listen: true } },
    { t: 'The receiver is not waiting', q: 'What if you remove the receiving program, so no program waits on port 9000, and connect with TCP?', d: 'The connection is not opened, and the sender gets a connection refused error right away.', v: { proto: 'tcp', listen: false } },
    { t: 'Sending with UDP', q: 'What if you change TCP to UDP?', d: 'The line for connecting is gone. The text arrives at the receiver, but the sender sees only "no error".', v: { proto: 'udp', listen: true } },
    { t: 'Sending with UDP and no receiver', q: 'What if you remove the receiving program and send with UDP?', d: 'The sender finishes without an error, and the text reaches nowhere.', v: { proto: 'udp', listen: false } },
  ],
  LETTERS: ['A', 'B', 'C'],
  // The code on the screen: the receiving program (only when it waits) and the sending program. They are not real programs; they describe what the programs do.
  code: function (c) {
    var tcp = c.proto === 'tcp', out = [];
    if (c.listen) out.push('# Receiving program', 'Open port 9000 with ' + (tcp ? 'TCP' : 'UDP') + ' and wait', '');
    out.push('# Sending program');
    if (tcp) out.push('Connect to port 9000 of 127.0.0.1 with TCP');
    this.LETTERS.forEach(function (x) { out.push(tcp ? 'Send text: "' + x + '"' : 'Send text to port 9000 of 127.0.0.1: "' + x + '"'); });
    return out.join('\n');
  },
  label: function (c) { return c.proto.toUpperCase() + ' · receiving program ' + (c.listen ? 'present' : 'absent'); },
  columns: ['What the sender got', 'Text the receiver got', 'Does the sender know whether anyone is there'],
  simulate: function (c) {
    var tcp = c.proto === 'tcp', on = !!c.listen, ev = [], sum = [], P = tcp ? 'TCP' : 'UDP';
    var st = {
      sndSub: ['Waiting'], sndc: 'plain', doorSub: ['No program', 'has opened it'], doorc: 'ghost', rcvSub: on ? ['Not started'] : ['Not launched'], rcvc: on ? 'plain' : 'ghost',
      a1: '', a2: '', a3: '', conn: 'Not yet', connc: 'ghost', n1: 'Not yet', n1c: 'ghost', n2: 'Not yet', n2c: 'ghost', log: []
    };
    function push(s, k) { ev.push({ s: s, k: k, snap: JSON.parse(JSON.stringify(st)) }); }
    function log(who, what) { st.log.push([who, what]); }
    var r1, r1s, r2, r3;
    // The receiving program
    if (on) {
      st.doorc = 'good'; st.doorSub = ['Port 9000', 'Open with ' + P]; st.rcvc = 'hot'; st.rcvSub = ['Waiting on', 'port 9000'];
      log('Receiver', 'Opened port 9000 with ' + P);
      push('The receiving program runs the line "Open port 9000 with ' + P + ' and wait". This line asks the operating system, "When ' + (tcp ? 'a TCP connection' : 'UDP text') + ' comes to port 9000 of this computer, give it to me." The sending program has not done anything yet.', '');
    } else {
      push('The receiving program was not launched. No program on this computer has opened port 9000.', '');
    }
    if (tcp) {
      // TCP: connect
      st.sndc = 'hot'; st.sndSub = ['Asking port 9000', 'for a connection'], st.a1 = 'hot'; st.conn = 'Opening the connection'; st.connc = 'hot';
      log('Sender', 'Asked for a TCP connection to port 9000 of 127.0.0.1');
      push('The sending program runs the line "Connect to port 9000 of 127.0.0.1 with TCP". The address 127.0.0.1 points to this computer itself, and port 9000 is the number that a receiving program opened on that computer. TCP first opens a connection like this before it sends text. The three letters A, B, C have not been sent yet.', '');
      if (on) {
        st.a2 = 'good'; st.conn = 'TCP connection opened'; st.connc = 'good'; st.sndc = 'good'; st.sndSub = ['Connected'], st.rcvSub = ['Got 1 connection'];
        log('Receiver', 'Got a connection (1 connection)');
        push('A program has opened port 9000, so the connection is opened. The receiving program got one connection, and the sending program is told that the connection succeeded. Now there is one path between the two programs, and the text sent next goes through this path. The exchange of confirmations between the two operating systems when they open a connection is covered in the in-depth lab "TCP connections and retransmission".', 'good');
        st.sndSub = ['Sent A, B, C', 'one after another']; st.sndc = 'hot'; st.a1 = 'good';
        log('Sender', 'Sent text: A, B, C (no error all 3 times)');
        push('The sending program runs the three lines "Send text" one after another and sends the three letters A, B, C through the connection. All three were sent without an error.', '');
        st.rcvSub = ['Text received:', 'ABC']; st.rcvc = 'good'; st.sndc = 'good'; st.sndSub = ['Sent A, B, C', 'all done']; st.n2 = 'ABC'; st.n2c = 'good';
        log('Receiver', 'Text received: ABC');
        push('The receiving program gets the text that came through this connection. The text it got is ABC, exactly in the order it was sent. TCP takes care that the bytes sent through a connection arrive in the order they were sent.', 'good');
        r1 = 'Connected, sent 3 times (no error)'; r1s = 'Connected, no error'; r2 = 'ABC'; r3 = 'Yes (the connection was opened, so someone is there)';
        st.n1 = r1s; st.n1c = 'good';
        push('What the sender saw is "connected" and "no error". With TCP, if no one is there, it fails at the connecting step, so an opened connection means that the receiving program is there.', 'good');
        sum.push('A TCP connection is the path that the line "Connect to port 9000 with TCP" in the sending code opens with the receiver. The receiver had port 9000 open and was waiting, so the connection was opened, and the three letters A, B, C sent through it arrived in the order they were sent, so the text the receiver got was ABC.');
        sum.push('HTTP, which a web browser and a server use to talk, also goes over a TCP connection like this by default (RFC 9112 section 9). In the checking run, when we connected with TCP and wrote an HTTP request, the server answered 200 OK.');
      } else {
        st.a1 = 'bad'; st.a3 = 'bad'; st.conn = 'TCP connection failed'; st.connc = 'bad'; st.sndc = 'bad'; st.sndSub = ['Connection refused', 'ECONNREFUSED']; st.doorc = 'bad'; st.doorSub = ['No program', 'has opened it'];
        log('Operating system', 'Refused the connection');
        push('No program has opened port 9000, so the connection is not opened. The one that refused the connection is not the receiving program (there is none) but the operating system of this computer. The sending program does not wait; it gets a connection refused error right away. The code of this error is ECONNREFUSED.', 'bad');
        r1 = 'Connection refused error (ECONNREFUSED), could not send'; r1s = 'ECONNREFUSED'; r2 = 'None (could not send)'; r3 = 'Yes (the connection refused error tells it at once that no one is there)';
        st.n1 = r1s; st.n1c = 'bad'; st.n2 = 'None'; st.n2c = 'bad';
        log('Sender', 'Could not send text');
        push('The sending program fails to connect and stops. The three lines that send text were not run, and none of the three letters A, B, C went out. Without a connection, there is no path to carry the text.', 'bad');
        sum.push('If the receiver is not waiting on port 9000, the TCP connection is not opened, and the sender gets a connection refused error right away (the error code is ECONNREFUSED). Not a single letter was sent.');
        sum.push('With TCP, you learn by an error that no one is receiving even before you send the text.');
      }
    } else {
      // UDP: throw it without a connection
      st.sndc = 'hot'; st.sndSub = ['Sent A, B, C', 'no connection']; st.a1 = 'hot'; st.conn = 'UDP does not open a connection'; st.connc = 'plain';
      log('Sender', 'Sent text: A, B, C (no error all 3 times)');
      push('The sending program has no line for connecting. Each line that sends text names where to send it (port 9000 of 127.0.0.1), so when the line runs, the text goes out at once. There is no step to check whether the receiver is ready. It ran the three lines one after another, sent the three letters A, B, C, and all three finished without an error.', '');
      if (on) {
        st.a1 = 'good'; st.a2 = 'good'; st.rcvSub = ['Text received:', 'ABC']; st.rcvc = 'good'; st.sndc = 'good'; st.sndSub = ['Sent A, B, C', 'all done']; st.n2 = 'ABC'; st.n2c = 'good';
        log('Receiver', 'Text received: ABC');
        push('The receiving program gets the text that came to port 9000. The text it got is ABC. In the checking run on the PC used to write this lab, it arrived in the order it was sent, but UDP does not guarantee that the text arrives, or in what order.', 'good');
        r1 = 'No error, sent 3 times'; r1s = 'No error'; r2 = 'ABC'; r3 = 'No (what the sender sees is the same whether the receiver got it or not)';
        st.n1 = r1s; st.n1c = 'plain';
        push('All the sender saw is "no error". This only means that the text left this computer; it does not mean that the receiver got it. When there was no receiver, the sender saw exactly the same thing (checked in the checking run).', '');
        sum.push('When you change TCP to UDP, the line "connect" disappears from the sending code, and each line that sends text names where to send it. The receiver was waiting, so the three letters A, B, C arrived and the text it got is ABC.');
        sum.push('All the sender saw is "no error", so the sender cannot know whether the receiver got it. When there is no receiver, it is the same "no error".');
      } else {
        st.a1 = 'dash bad'; st.sndc = 'plain'; st.sndSub = ['Sent A, B, C', 'all done']; st.n2 = 'None'; st.n2c = 'bad'; st.doorc = 'bad';
        log('Receiver', 'No text received (no program to take it)');
        push('No program has opened port 9000, so there is no place to take the text that was sent. The text was not delivered anywhere. But the sending program got neither an error nor any other notice.', 'bad');
        r1 = 'No error, sent 3 times'; r1s = 'No error'; r2 = 'None (no receiver)'; r3 = 'No (what the sender sees is the same whether the receiver got it or not)';
        st.n1 = r1s; st.n1c = 'plain';
        push('What the sender saw is the same "no error" as when the receiver was there. So the sending program finishes sending without being able to tell whether the text arrived or disappeared.', 'bad');
        sum.push('Even when there is no receiver, sending with UDP finishes without an error. The text reached nowhere, but the sender did not get any error.');
        sum.push('TCP fails at the connecting step, but UDP has no step for making a connection, so even if nobody is receiving, no failure shows up on the sending side. Sending without an error and the other side receiving are different things.');
      }
    }
    return { events: ev, summary: sum, row: [r1, r2, r3] };
  },
  render: function (v, sim, t, H, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : null;
    if (!s) { H.text(v, 'Click Run to start with the receiving program opening the port.'); return; }
    if (s.log.length) H.table(v, ['Who', 'What happened'], s.log.map(function (r) { return { cls: '', cells: [r[0], r[1]] }; }), 'What has happened so far');
    H.table(v, ['Item', 'Value'], [
      { cls: s.n1c === 'ghost' ? 'gone' : '', cells: ['What the sender got', s.n1c === 'ghost' ? 'Not yet' : { v: s.n1, cls: s.n1c === 'bad' ? 'bad' : s.n1c === 'good' ? 'good' : '' }] },
      { cls: s.n2c === 'ghost' ? 'gone' : '', cells: ['Text the receiver got', s.n2c === 'ghost' ? 'Not yet' : { v: s.n2, cls: s.n2c === 'bad' ? 'bad' : 'good' }] },
    ], 'Result');
  },
  // Diagram: the sending program on the left, port 9000 in the middle, and the receiving program on the right. The arrows show whether the text sent passes the port and reaches the receiver, whether it is refused at the port and comes back (red), or whether it disappears with no receiver (red dashed line). Below are the state of the connection and the result boxes.
  draw: function (P, sim, shown) {
    var c = sim.c, last = shown[shown.length - 1], s = last ? last.snap : null, on = !!c.listen, tcp = c.proto === 'tcp';
    P.size(680, 290);
    P.region('sr', 6, 16, 170, 162, 'Sender');
    P.region('rr', 472, 16, 202, 162, 'Receiver');
    P.box('snd', 16, 44, 150, 112, { cls: s ? s.sndc : 'plain', title: 'Program', sub: s ? s.sndSub : ['Waiting'] });
    P.box('door', 232, 44, 170, 112, { cls: s ? s.doorc : (on ? 'ghost' : 'ghost'), title: 'Port 9000', sub: s ? s.doorSub : ['No program', 'has opened it'] });
    P.box('rcv', 482, 44, 180, 112, { cls: s ? s.rcvc : (on ? 'plain' : 'ghost'), title: 'Program', sub: s ? s.rcvSub : (on ? ['Not started'] : ['Not launched']) });
    if (s && s.a1) P.arrow('a1', 'snd:r:0.3', 'door:l:0.3', { cls: s.a1 });
    if (s && s.a2) P.arrow('a2', 'door:r:0.3', 'rcv:l:0.3', { cls: s.a2 });
    if (s && s.a3) P.arrow('a3', 'door:l:0.75', 'snd:r:0.75', { cls: s.a3 });
    P.box('conn', 16, 190, 650, 34, { cls: s ? s.connc : 'ghost', title: 'Connection', right: s ? s.conn : 'Not yet' });
    P.box('n1', 16, 238, 322, 36, { cls: s ? s.n1c : 'ghost', title: 'What the sender got', right: s ? s.n1 : 'Not yet' });
    P.box('n2', 344, 238, 322, 36, { cls: s ? s.n2c : 'ghost', title: 'Text the receiver got', right: s ? s.n2 : 'Not yet' });
  },
  assume: 'The sending program and the receiving program were made with the net module (TCP) and the dgram module (UDP) of Node.js 24.18.0 (Windows 11), and they were actually run on 127.0.0.1. The code box is not the source of these programs; it describes in words what each program does, and what was checked is whether those lines are the same as the actions that were actually run (whether the receiver opened the port and which protocol, whether there was a call that connects, and the order of the text sent). All 4 combinations were run 5 times each, and the results of the 5 runs were the same. What was checked is what the sender got (whether the connection succeeded, the error code, and the number of sends that finished without an error), the text the receiver got and the number of connections it got, and the time from the connection request until the result came out. The 9000 on the screen is an example, and in the actual runs a different free number was chosen for each combination (for the combinations with no receiver, the text was sent to a number that had just been closed, and with TCP, that nobody actually had it open is confirmed by the connection refused). The sender sent A, B, C at intervals of 0.05 seconds. When the connection failed in TCP, the program was written to stop there and not run the sending lines. The error code ECONNREFUSED, and that there was no error in UDP, are what was observed on the PC used to write this lab (Windows 11), and they can differ by operating system. The result of the connection request (whether the connection succeeded or was refused) came out within 2 milliseconds at most on this PC, and this value is small because it is inside the same computer. Whether the sender knows that someone is there was decided in the same way, by whether what the sender saw is the same or different when the receiver was there and when it was not. TCP was different, a successful connection against a refused connection, and UDP was the same, because it sent three times without an error in both cases. However, whether an opened TCP connection also means a confirmation that the receiving program read the text that was sent was not covered in this lab, and the box on the screen says only whether someone is there. The text ABC that the receiver got was in the order it was sent for both protocols on this PC, but the standard fixes the order only for TCP (for UDP this was observed in a run inside the same computer on this PC, and the case of crossing the Internet was not looked at). How many reads the receiver uses to read the text sent with TCP was not covered (in this run it was read in three pieces, but we did not use that in any sentence). As a separate check, when we connected with TCP to the http server of Node.js and wrote an HTTP request by hand, the server received one request and answered 200 OK, and when we sent the same text with UDP, send finished without an error but the server did not receive the request. Whether the operating system actually sent a refusal signal (RST) when it refused the connection, and what signal the operating system sent back when there was no receiver in UDP, were not confirmed because we did not capture packets. From the documents, we opened and checked the following. Section 2.2 of RFC 9293 (TCP) says that TCP is connection-oriented and provides a reliable, in-order, byte-stream service, section 3.5 says that the procedure for opening a connection is the 3-way handshake, and section 3.5.2 says that a reset signal (RST) is sent to a request that comes with no connection (we could not open section 3.10 and after). The introduction of RFC 768 (UDP) says that delivery and duplicate protection are not guaranteed in UDP. Section 9 of RFC 9112 says that HTTP assumes reliable, in-order delivery and that the default connection for an http address is TCP. The Node.js documentation for net says that if there is a problem with the connection, an error event comes instead of the connect event, but we could not confirm the name ECONNREFUSED in the parts we opened, and the documentation for dgram says only that the callback of send reports a DNS error and tells when the buffer that holds the text can be written again, and does not say that it is a confirmation that the receiver got it. This lab covers only one TCP connection and sending with UDP. It does not cover the procedure for opening and closing a connection (3-way handshake, FIN), retransmission when text is lost, putting text back in order, or flow control and congestion control, which are covered in the in-depth labs "TCP connections and retransmission" and "TCP and UDP". There is also a way to call connect on a UDP socket, but it does not open a connection as TCP does, and it was not used here.',
});

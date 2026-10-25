Lab.register({
  id: 'tcp_basic', nav: 'TCP connections', cat: 'Fundamentals', mode: 'step', basic: true, deep: ['tcp', 'udp'],
  title: 'What does it mean to open a connection, and what happens if you send without one?',
  why: 'Data sent over a network can be lost on the way or arrive out of order. TCP first opens a connection to check that the other side is ready to receive, gets an acknowledgment for each piece sent and resends the piece if there is none, and puts the pieces in order by the numbers attached to them. So the program does not have to do these checks itself.',
  use: 'A browser sending a request to a Spring Boot server on port 8080, and a Java program connecting to MySQL on port 3306 through the JDBC driver, both happen over a TCP connection. Developers rarely use Socket directly, but under what these libraries do lie the opening of a connection and the exchange of data that you see in this lab. So when a Connection refused error appears, first check whether no program is waiting on that port. Where it matters more that data arrives quickly even if a little of it is lost, as in online games or video calls, UDP is sometimes used.',
  intro: 'TCP and UDP are two sets of rules for two programs to exchange bytes over a network, and Java provides both as classes in the java.net package. You use TCP with ServerSocket and Socket. The receiving side opens port 9000 with new ServerSocket(9000) and waits for a connection with accept(), and the sending side opens a connection with new Socket("localhost", 9000) and then writes bytes to the output stream it gets from getOutputStream(). The connection is opened only when the receiving program is waiting on that port, and the bytes sent over the opened connection arrive in the order they were sent. You use UDP with DatagramSocket and DatagramPacket. There is no line that connects; for each letter, you just send out a DatagramPacket that names where to send it, with send. In this lab you switch the way of sending between TCP and UDP, start or do not start the receiving program, and see what the two programs print. The code box shows only the lines of the main method of each program (the class and main declarations and the imports are left out), and the number 9000 is an example. localhost is a name that points to this computer itself. Port numbers and connection refusal themselves are covered in the lab "IP addresses and ports", and this lab looks at the difference between TCP, which opens a connection and then sends, and UDP, which sends without a connection.',
  terms: ['TCP and UDP', 'TCP connection', 'ServerSocket and Socket', 'DatagramSocket and DatagramPacket', 'Connection refused error', 'Sending with UDP and delivery confirmation'],
  controls: [
    { id: 'proto', label: 'How to send', type: 'select', value: 'tcp', options: [['tcp', 'Connect with TCP, then send (ServerSocket and Socket)'], ['udp', 'Send with UDP, without a connection (DatagramSocket)']] },
    { id: 'listen', label: 'The receiving program waits on port 9000', type: 'check', value: true },
  ],
  // q is the question shown on the question-style screen. t and d are the name and the description used in the text-only reading
  presets: [
    { t: 'Default settings', q: 'What does a TCP connection look like in Java code, and what happens when you send A, B, C while the receiver waits on port 9000?', d: 'The connection is opened by accept() on the receiving side and new Socket on the sending side, and the A, B, C that were sent arrive in the order they were sent, so the receiver prints "Received: ABC".', v: { proto: 'tcp', listen: true } },
    { t: 'The receiver is not waiting', q: 'What if you do not start the receiving program, so no program waits on port 9000, and connect with TCP?', d: 'The line new Socket gets a java.net.ConnectException (Connection refused) right away, and not a single letter is sent.', v: { proto: 'tcp', listen: false } },
    { t: 'Sending with UDP', q: 'What if you change Socket to DatagramSocket and send with UDP, without a connection?', d: 'Each letter is sent with send, with no line for connecting, and the receiver gets one letter with each receive. The sender prints only "Done sending".', v: { proto: 'udp', listen: true } },
    { t: 'Sending with UDP and no receiver', q: 'What if you do not start the receiving program and send with UDP?', d: 'The sender prints "Done sending" without an exception and finishes. The output is the same as when the receiver is there, so the sender cannot know whether the text arrived.', v: { proto: 'udp', listen: false } },
  ],
  // The code on the screen: the receiving program (only when it is started) and the sending program. verify/net/TcpBasicProbe.java compiles and runs this text as it is.
  TCP_RECEIVER: ['// Receiving program: open port 9000 with TCP and wait for a connection', 'ServerSocket server = new ServerSocket(9000);', 'Socket conn = server.accept();', 'String text = new String(conn.getInputStream().readAllBytes(), "UTF-8");', 'System.out.println("Received: " + text);'],
  TCP_SENDER: ['// Sending program: connect to port 9000 of localhost with TCP, then send', 'Socket socket = new Socket("localhost", 9000);', 'OutputStream out = socket.getOutputStream();', 'out.write("A".getBytes("UTF-8"));', 'out.write("B".getBytes("UTF-8"));', 'out.write("C".getBytes("UTF-8"));', 'socket.close();', 'System.out.println("Done sending");'],
  UDP_RECEIVER: ['// Receiving program: open port 9000 with UDP and wait for text', 'DatagramSocket server = new DatagramSocket(9000);', 'for (int i = 0; i < 3; i++) {', '    DatagramPacket packet = new DatagramPacket(new byte[100], 100);', '    server.receive(packet);', '    System.out.println("Received: " + new String(packet.getData(), 0, packet.getLength(), "UTF-8"));', '}'],
  UDP_SENDER: ['// Sending program: without connecting, send text one letter at a time to port 9000 of localhost', 'DatagramSocket socket = new DatagramSocket();', 'InetSocketAddress to = new InetSocketAddress("localhost", 9000);', 'socket.send(new DatagramPacket("A".getBytes("UTF-8"), 1, to));', 'socket.send(new DatagramPacket("B".getBytes("UTF-8"), 1, to));', 'socket.send(new DatagramPacket("C".getBytes("UTF-8"), 1, to));', 'socket.close();', 'System.out.println("Done sending");'],
  code: function (c) {
    var tcp = c.proto === 'tcp', parts = ['// Only the lines of the main method of each program are shown (the class and main declarations and the imports are left out)'];
    if (c.listen) parts.push((tcp ? this.TCP_RECEIVER : this.UDP_RECEIVER).join('\n'));
    parts.push((tcp ? this.TCP_SENDER : this.UDP_SENDER).join('\n'));
    return parts.join('\n\n');
  },
  label: function (c) { return c.proto.toUpperCase() + ' · receiving program ' + (c.listen ? 'present' : 'absent'); },
  columns: ['What the sender got', 'Receiver output', 'Does the sender know whether a receiver is there'],
  simulate: function (c) {
    var tcp = c.proto === 'tcp', on = !!c.listen, ev = [], sum = [], P = tcp ? 'TCP' : 'UDP';
    var st = {
      sndSub: ['Not started'], sndc: 'plain', doorSub: ['No program', 'has opened it'], doorc: 'ghost', rcvSub: on ? ['Not started'] : ['Not launched'], rcvc: on ? 'plain' : 'ghost',
      a1: '', a2: '', a3: '', conn: 'Not yet', connc: 'ghost', n1: 'Not yet', n1c: 'ghost', n2: 'Not yet', n2c: 'ghost', log: []
    };
    function push(s, k) { ev.push({ s: s, k: k, snap: JSON.parse(JSON.stringify(st)) }); }
    function log(who, what) { st.log.push([who, what]); }
    var r1, r2, r3, KNOW = 'No (the output is the same whether or not a receiver is there)';
    // The receiving program
    if (on) {
      st.doorc = 'good'; st.doorSub = ['Port 9000', 'Open with ' + P]; st.rcvc = 'hot';
      if (tcp) {
        st.rcvSub = ['ServerSocket', 'opens 9000'];
        log('Receiver', 'new ServerSocket(9000): opens port 9000 with TCP');
        push('The receiving program runs the line new ServerSocket(9000). ServerSocket is a class provided by Java (java.net.ServerSocket), and this line asks the operating system, "When a TCP connection comes to port 9000 of this computer, give it to me." The sending program has not done anything yet.', '');
        st.rcvc = 'wait'; st.rcvSub = ['Waiting in', 'accept()'];
        log('Receiver', 'server.accept(): waits until a connection comes');
        push('It runs the line server.accept(). accept is a method that waits until one connection comes, so the receiving program stops at this line and waits for a connection. The TCP receiver takes in a connection before it takes in any letters.', '');
      } else {
        st.rcvSub = ['DatagramSocket', 'opens 9000'];
        log('Receiver', 'new DatagramSocket(9000): opens port 9000 with UDP');
        push('The receiving program runs the line new DatagramSocket(9000). DatagramSocket is a class for UDP provided by Java (java.net.DatagramSocket), and this line asks the operating system, "When UDP text comes to port 9000, give it to me." Unlike ServerSocket in TCP, there is no accept(). This is because UDP has no step for taking in a connection.', '');
        st.rcvc = 'wait'; st.rcvSub = ['Waiting in', 'receive()'];
        log('Receiver', 'server.receive(packet): waits until text comes');
        push('In the first pass of the for loop, it runs the line server.receive(packet). DatagramPacket is also a class provided by Java, and here it was created together with a 100-byte array in which to write the text it receives. receive is a method that waits until one piece of text comes, so the receiving program stops at this line.', '');
      }
    } else {
      push('The receiving program was not started. No program on this computer has opened port 9000 with ' + P + '.', '');
    }
    if (tcp) {
      st.sndc = 'hot'; st.sndSub = ['new Socket', 'asks to connect'], st.a1 = 'hot'; st.conn = 'Opening the connection'; st.connc = 'hot';
      log('Sender', 'new Socket("localhost", 9000): asks for a TCP connection');
      push('The sending program runs the line new Socket("localhost", 9000). Socket is a class provided by Java (java.net.Socket), and this line is a request to open a TCP connection with port 9000 of localhost (this computer itself, which was 127.0.0.1 in the checking run). The line does not finish until the connection is opened or fails. None of A, B, C has been sent yet.', '');
      if (on) {
        st.a2 = 'good'; st.conn = 'TCP connection opened'; st.connc = 'good'; st.sndc = 'good'; st.sndSub = ['Connected']; st.rcvc = 'good'; st.rcvSub = ['accept() done', 'Got 1 connection']; st.doorc = 'good';
        log('Receiver', 'accept() finished, and conn refers to one connection');
        push('A program is waiting on port 9000, so the connection is opened. The line server.accept() of the receiving side finishes and returns a Socket object for exchanging data over this connection, and the variable conn refers to that object. The line new Socket of the sending side also finishes without an exception, and the variable socket refers to the connected Socket object. Now there is one TCP connection between the two programs. The exchange of confirmations between the two operating systems when they open a connection is covered in the in-depth lab "TCP connections and retransmission".', 'good');
        st.sndc = 'hot'; st.sndSub = ['Writes A, B, C', 'one after another']; st.a1 = 'good';
        log('Sender', 'wrote A, B, C to getOutputStream(), closed the connection with close()');
        push('The sending side gets the output stream of this connection with socket.getOutputStream(), and writes A, B, C one after another with three write lines. It does not name the receiver on each line, because the other side was already decided when the connection was opened. All three finished without an exception, and after closing the connection with socket.close(), it prints "Done sending".', '');
        st.rcvSub = ['Received: ABC']; st.n2 = 'Received: ABC'; st.n2c = 'good'; st.sndc = 'good'; st.sndSub = ['Done sending'];
        log('Receiver', 'getInputStream().readAllBytes(): read ABC');
        push('The receiving side reads the bytes that came over this connection with conn.getInputStream().readAllBytes(). readAllBytes is a method that reads all the bytes that come until the other side closes the connection. The text it read is ABC, exactly in the order it was sent, and it prints "Received: ABC". TCP takes care that the bytes sent over a connection arrive in the order they were sent with none missing, and it resends a piece that is lost on the way (this lab did not cause any resending).', 'good');
        r1 = 'Done sending'; r2 = 'Received: ABC'; r3 = 'Yes (the connection was opened, so a receiver is there)';
        st.n1 = r1; st.n1c = 'good';
        push('What the sender got is "Done sending". With TCP, if there is no receiver, the line new Socket fails, so the fact that this line finished without an exception means that a receiving program was waiting on port 9000.', 'good');
        sum.push('You use TCP with ServerSocket and Socket. accept() on the receiving side and new Socket("localhost", 9000) on the sending side met, one connection was opened, and the A, B, C written to the output stream of that connection arrived in the order they were sent, so the receiver printed "Received: ABC".');
        sum.push('HTTP, which a web browser and a Spring Boot server use to talk, also goes over a TCP connection like this (RFC 9112 section 9). In the checking run, when we connected with Socket and wrote an HTTP request, the HTTP server of the JDK answered HTTP/1.1 200 OK.');
      } else {
        st.a1 = 'bad'; st.a3 = 'bad'; st.conn = 'TCP connection failed'; st.connc = 'bad'; st.sndc = 'bad'; st.sndSub = ['ConnectException']; st.doorc = 'bad';
        log('Operating system', 'refused the connection');
        log('Sender', 'ConnectException at the line new Socket, the program stops');
        push('No program has opened port 9000 with TCP, so the operating system refuses the connection. Java throws a java.net.ConnectException at the line new Socket, and in the check on Windows 11 it said "Connection refused: connect". The one that refused is not the receiving program (there is none) but the operating system of this computer, and the exception came right away, without waiting.', 'bad');
        r1 = 'java.net.ConnectException: Connection refused: connect ("Done sending" is not printed)'; r2 = 'None (the receiving program was not started)'; r3 = 'Yes (the connection refused exception tells it at once that no receiver is there)';
        st.n1 = 'ConnectException'; st.n1c = 'bad'; st.n2 = 'None'; st.n2c = 'bad';
        push('This code has no line that handles the exception, so the sending program stops at the line new Socket. getOutputStream() and the three write lines were not run, none of A, B, C went out, and "Done sending" was not printed either. With TCP, you cannot send letters without a connection.', 'bad');
        sum.push('If the receiver is not waiting on port 9000, the TCP connection is not opened, and the sender gets a java.net.ConnectException (Connection refused) at the line new Socket right away. Not a single letter was sent.');
        sum.push('With TCP, you learn by an exception that no one is receiving even before you send any letters.');
      }
    } else {
      // UDP: send without a connection
      st.sndc = 'hot'; st.sndSub = ['DatagramSocket', 'created']; st.conn = 'UDP does not open a connection'; st.connc = 'plain';
      log('Sender', 'new DatagramSocket(): no line for connecting');
      push('The sending program runs the line new DatagramSocket(). It gave no port number, so the operating system assigns a free number. InetSocketAddress on the next line is a class provided by Java; it stands for where to send (port 9000 of localhost), and the variable to refers to it. Unlike new Socket in TCP, there is no line that opens a connection with the other side, and no step to check whether the receiver is ready.', '');
      st.a1 = 'hot'; st.sndSub = ['send() 3 times', 'no exception'];
      log('Sender', 'sent A, B, C with send() 3 times (no exception all 3 times), "Done sending"');
      push('It runs the three socket.send lines one after another and sends A, B, C. Because there is no connection, each DatagramPacket names where to send it, to. The 1 is the length of the text to send (1 byte). All three finished without an exception, and after socket.close(), it prints "Done sending".', '');
      r1 = 'Done sending'; r3 = KNOW;
      if (on) {
        st.a1 = 'good'; st.a2 = 'good'; st.rcvSub = ['Received: A', 'Received: B', 'Received: C']; st.rcvc = 'good'; st.sndc = 'good'; st.sndSub = ['Done sending']; st.n2 = 'A, B, C separately'; st.n2c = 'good';
        log('Receiver', 'receive() 3 times: got A, B, C one by one');
        push('Each time the receive of the receiving side gets one piece of text, it finishes, and the for loop runs three passes and prints "Received: A", "Received: B", "Received: C" separately. With UDP, the one piece of text sent by one send arrives as one piece with one receive. In the checking run they arrived in the order they were sent, but the DatagramSocket documentation says that several packets can arrive in any order, and UDP does not guarantee delivery itself either.', 'good');
        r2 = 'Received: A / Received: B / Received: C';
        st.n1 = r1; st.n1c = 'plain';
        push('All the sender got is "Done sending". This only means that the text left this computer; it does not mean that the receiver got it. When there was no receiver, what the sender printed was exactly the same (checked in the checking run).', '');
        sum.push('When you change TCP to UDP, you use DatagramSocket instead of Socket, the line for connecting disappears, and you send a DatagramPacket that names where to send each letter with send. The receiver was waiting, so A, B, C arrived one by one with three receives.');
        sum.push('All the sender got is "Done sending", so the sender cannot know whether the receiver got it. When there is no receiver, it is the same "Done sending".');
      } else {
        st.a1 = 'dash bad'; st.sndc = 'plain'; st.sndSub = ['Done sending']; st.n2 = 'None'; st.n2c = 'bad'; st.doorc = 'bad';
        log('Receiver', 'no text received (no receiving program)');
        push('No program has opened port 9000 with UDP, so there is no program to receive the text that was sent. A, B, C were not delivered anywhere. But the three send lines of the sender finished without an exception, and no other notice came either.', 'bad');
        r2 = 'None (the receiving program was not started)';
        st.n1 = r1; st.n1c = 'plain';
        push('What the sender got is the same "Done sending" as when the receiver was there. So the sending program finishes without being able to tell whether the text arrived or disappeared.', 'bad');
        sum.push('Even when there is no receiver, send of DatagramSocket finishes without an exception and "Done sending" is printed. The text reached nowhere, but the sender did not get any exception.');
        sum.push('TCP fails at the line new Socket, but UDP has no step for opening a connection, so even if nobody is receiving, no failure shows up on the sending side. To confirm delivery with UDP, you have to write code yourself in which the receiver sends back an answer and the sender waits for it.');
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
      { cls: s.n2c === 'ghost' ? 'gone' : '', cells: ['Receiver output', s.n2c === 'ghost' ? 'Not yet' : { v: s.n2, cls: s.n2c === 'bad' ? 'bad' : 'good' }] },
    ], 'Result');
  },
  // Diagram: the sending program on the left, port 9000 in the middle, and the receiving program on the right. The arrows show whether the text sent passes the port and reaches the receiver, whether it is refused at the port and comes back (red), or whether it disappears with no receiver (red dashed line). Below are the state of the connection and the result boxes.
  draw: function (P, sim, shown) {
    var c = sim.c, last = shown[shown.length - 1], s = last ? last.snap : null, on = !!c.listen;
    P.size(680, 290);
    P.region('sr', 6, 16, 170, 162, 'Sender');
    P.region('rr', 472, 16, 202, 162, 'Receiver');
    P.box('snd', 16, 44, 150, 112, { cls: s ? s.sndc : 'plain', title: 'Program', sub: s ? s.sndSub : ['Not started'] });
    P.box('door', 232, 44, 170, 112, { cls: s ? s.doorc : 'ghost', title: 'Port 9000', sub: s ? s.doorSub : ['No program', 'has opened it'] });
    P.box('rcv', 482, 44, 180, 112, { cls: s ? s.rcvc : (on ? 'plain' : 'ghost'), title: 'Program', sub: s ? s.rcvSub : (on ? ['Not started'] : ['Not launched']) });
    if (s && s.a1) P.arrow('a1', 'snd:r:0.3', 'door:l:0.3', { cls: s.a1 });
    if (s && s.a2) P.arrow('a2', 'door:r:0.3', 'rcv:l:0.3', { cls: s.a2 });
    if (s && s.a3) P.arrow('a3', 'door:l:0.75', 'snd:r:0.75', { cls: s.a3 });
    P.box('conn', 16, 190, 650, 34, { cls: s ? s.connc : 'ghost', title: 'Connection', right: s ? s.conn : 'Not yet' });
    P.box('n1', 16, 238, 322, 36, { cls: s ? s.n1c : 'ghost', title: 'What the sender got', right: s ? s.n1 : 'Not yet' });
    P.box('n2', 344, 238, 322, 36, { cls: s ? s.n2c : 'ghost', title: 'Receiver output', right: s ? s.n2 : 'Not yet' });
  },
  assume: 'The code on the screen was compiled as it is with JDK 21.0.12.1 (Windows 11) and actually run (verify/net/TcpBasicProbe.java). The receiving program and the sending program are separate Java processes; the lines on the screen were left as they are inside the main method, and only import java.io.OutputStream and import java.net.* were added. One line of output saying that it is ready was added to the receiving program, and the sending program was started after the receiver opened the port (this line was left out of the results). The 9000 on the screen is an example, and in the actual runs a different free number was chosen for each run, for both TCP and UDP; before starting, connecting to that number with TCP was refused every time, which confirmed that nobody had it open. The 4 combinations were run 5 times each, and the results of the 5 runs were all the same. What was checked is the standard output and the first line of the standard error and the exit code of the sender, and the standard output and the exit code of the receiver. localhost was resolved to 127.0.0.1 with InetAddress.getByName in this run. The message "Connection refused: connect" of the connection refused exception is what we saw on Windows 11, and we did not check whether the end of the message is the same on other operating systems. When new Socket("localhost", port) was run 5 times inside the same process against a port that nobody had open, ConnectException came within 1 millisecond every time, and this is short because it is inside the same computer. Whether the sender knows that a receiver is there was decided in the same way, by whether what the sender got is the same or different when the receiver was there and when it was not. TCP was different, "Done sending" against ConnectException, and UDP was the same, because it was "Done sending" in both cases. However, an opened TCP connection does not also mean a confirmation that the receiving program read the letters that were sent, and the box on the screen says only whether a receiver is there. That the letters the receiver got were in the order they were sent was observed in the checking run (inside one computer) for both ways, and the standard fixes the order only for TCP. That TCP resends when text is lost on the way was not caused in this run. As a separate check, when we started the HTTP server provided by the JDK (com.sun.net.httpserver.HttpServer), connected with Socket, and wrote the request text "GET /hello", the server received one request and answered HTTP/1.1 200 OK, and when we sent the same text to the same port with DatagramSocket, send finished without an exception but the server did not receive a request. The old version of this lab ran the same 4 combinations with net and dgram of Node.js 24.18.0 (verify/net/tcp_basic_probe.js), and then too the result was the same: for TCP a connection refused error (ECONNREFUSED), and for UDP no error even when there is no receiver. Whether the operating system actually sent a refusal signal (RST) when it refused the connection, and what signal the operating system sent back when there was no receiver in UDP, were not confirmed because we did not capture packets. From the documents, we opened and checked the following. In the API documentation of the JDK 21 source, ConnectException is an error that occurred while connecting, and it says this is usually a case where the connection was refused because no process is waiting at the remote address and port, and DatagramSocket says that each packet is sent with its own address and that several packets can arrive in any order. It says that DatagramSocket.send can throw PortUnreachableException only when the socket is connected to the other side with connect, and that even that is not guaranteed, and the sending program of this lab did not call connect. Section 2.2 of RFC 9293 (TCP) says that TCP is connection oriented and provides a reliable, in-order, byte-stream service, section 3.5 says that the procedure for opening a connection is the 3-way handshake, and section 3.5.2 says that a reset signal (RST) is sent to a request that comes with no connection. The introduction of RFC 768 (UDP) says that delivery and duplicate protection are not guaranteed in UDP. Section 9 of RFC 9112 says that HTTP assumes reliable, in-order delivery and that the default connection for an http address is TCP. This lab covers only one TCP connection and sending with UDP. It does not cover the procedure for opening and closing a connection (3-way handshake, FIN), retransmission when text is lost, putting text back in order, or flow control and congestion control. Opening a connection, retransmission, ordering, flow control, and congestion control are covered in the in-depth labs "TCP connections and retransmission" and "TCP and UDP", and closing a connection (FIN) appears there only as a single step. DatagramSocket also has a connect method, but it does not open a connection as TCP does, and it was not used here.',
});

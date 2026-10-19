Lab.register({
  id: 'udp', nav: 'TCP and UDP', cat: 'Networking', mode: 'step',
  title: 'If you send data in three pieces, does it arrive in three pieces?',
  intro: 'TCP and UDP are two ways of carrying the data of one program to another program. TCP first establishes a connection and delivers the bytes in order and without gaps, but it does not tell the receiver where the sender split the data. UDP sends each piece as it is, with no connection, and takes no responsibility for whether it arrives.',
  terms: ['TCP and UDP', 'Byte stream and datagram', 'Socket', 'Port', 'Three-way handshake'],
  controls: [
    { id: 'proto', label: 'Protocol', type: 'select', value: 'tcp', options: [['tcp', 'TCP'], ['udp', 'UDP']] },
    { id: 'recv', label: 'The receiving program is waiting on port 9000', type: 'check', value: true },
    { id: 'net', label: 'What happens on the way', type: 'select', value: 'ok', options: [['ok', 'Nothing happens'], ['loss', 'The second one sent is lost'], ['reorder', 'The second one arrives later than the third']], show: function (c) { return !!c.recv; } },
  ],
  fix: function (c) { return !c.recv && c.net !== 'ok' ? { net: 'ok' } : null; },
  presets: [
    { t: 'Default settings', q: 'When the receiving program is waiting on port 9000 and you send data in three pieces over TCP, does the receiver read three pieces?', d: 'TCP. The data is sent in three pieces, but the receiver reads it as one piece.', v: { proto: 'tcp', recv: true, net: 'ok' } },
    { t: 'The same data with UDP', q: 'What if you change the protocol to UDP?', d: 'Three pieces arrive, exactly as they were sent.', v: { proto: 'udp', recv: true, net: 'ok' } },
    { t: 'UDP with no receiving program', q: 'What if you use UDP and no receiving program is waiting on port 9000?', d: 'All three sends succeed. The data disappears.', v: { proto: 'udp', recv: false, net: 'ok' } },
    { t: 'TCP with no receiving program', q: 'What if you use TCP and no receiving program is waiting on port 9000?', d: 'The connection fails first, so nothing can be sent.', v: { proto: 'tcp', recv: false, net: 'ok' } },
    { t: 'When UDP loses one', q: 'What if you use UDP and the second one sent is lost on the way?', d: 'The receiver gets it with a piece missing, and the sender does not know.', v: { proto: 'udp', recv: true, net: 'loss' } },
    { t: 'When UDP reorders', q: 'What if you use UDP and the second one arrives later than the third?', d: 'The pieces are received in the order they arrived.', v: { proto: 'udp', recv: true, net: 'reorder' } },
    { t: 'When TCP loses one', q: 'What if you use TCP and the second one sent is lost on the way?', d: 'The operating system sends it again and fills the gap. The program does not know.', v: { proto: 'tcp', recv: true, net: 'loss' } },
  ],
  code: function (c) {
    if (c.proto === 'tcp') return '// Node.js (net module): TCP\nconst socket = net.connect(9000, \'127.0.0.1\');   // establish the connection first\nsocket.on(\'connect\', async () => {               // data can be sent only after it is connected\n  socket.write(\'AB\');  await sleep(50);           // three times, at 0.05-second intervals\n  socket.write(\'CD\');  await sleep(50);\n  socket.write(\'EF\');\n});\nsocket.on(\'error\', e => console.log(e.code));    // a connection failure arrives here\n\n' + (c.recv ? '// Receiving program: starts reading after all three have arrived\nnet.createServer({ pauseOnConnect: true }, conn => {\n  conn.on(\'data\', d => console.log(d.toString()));\n  setTimeout(() => conn.resume(), 500);\n}).listen(9000, \'127.0.0.1\');' : '// The receiving program was not started (no program is listening on port 9000)');
    return '// Node.js (dgram module): UDP\nconst socket = dgram.createSocket(\'udp4\');       // there is no code that connects\nconst done = err => console.log(err);            // null means it was sent without an error\nsocket.send(\'AB\', 9000, \'127.0.0.1\', done);  await sleep(50);\nsocket.send(\'CD\', 9000, \'127.0.0.1\', done);  await sleep(50);\nsocket.send(\'EF\', 9000, \'127.0.0.1\', done);\n\n' + (c.recv ? '// Receiving program (another thread): opens the port, pauses for 0.4 seconds, then reads. The operating system keeps what arrives meanwhile\nconst receiver = dgram.createSocket(\'udp4\');\nreceiver.on(\'message\', m => console.log(m.toString()));\nreceiver.bind(9000, \'127.0.0.1\', () => Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 400));' : '// The receiving program was not started (no program is listening on port 9000)');
  },
  label: function (c) { return c.proto.toUpperCase() + ' · Receiving program ' + (c.recv ? 'running' : 'not running') + (c.recv ? ' · ' + { ok: 'Nothing happens', loss: 'Second one lost', reorder: 'Second one arrives late' }[c.net] : ''); },
  columns: ['Connection before sending', 'Result the sender saw', 'What the receiving program read', 'Compared with what was sent'],
  PARTS: ['AB', 'CD', 'EF'],
  // The pieces the receiving program ends up reading. TCP joins the bytes into one piece; UDP gives the datagrams as they arrived.
  received: function (c) {
    if (!c.recv) return [];
    if (c.proto === 'tcp') return [this.PARTS.join('')];
    return c.net === 'loss' ? ['AB', 'EF'] : c.net === 'reorder' ? ['AB', 'EF', 'CD'] : ['AB', 'CD', 'EF'];
  },
  simulate: function (c) {
    var tcp = c.proto === 'tcp', on = !!c.recv, net = on ? c.net : 'ok', P = this.PARTS, got = this.received({ proto: c.proto, recv: on, net: net }), ev = [], sum = [];
    var st = { conn: '', sent: [0, 0, 0], buf: [], held: '', read: [], late: false };   // sent: 0 not yet, 1 arrived, 2 lost, 3 in flight
    function push(s, k) { ev.push({ s: s, k: k, snap: JSON.parse(JSON.stringify(st)) }); }
    function put(x) { if (tcp) st.buf = [(st.buf[0] || '') + x]; else st.buf.push(x); }
    var call = function (i) { return tcp ? 'socket.write(\'' + P[i] + '\')' : 'socket.send(\'' + P[i] + '\', 9000, \'127.0.0.1\')'; };
    if (tcp) {
      if (!on) {
        st.conn = 'fail';
        push('net.connect(9000, \'127.0.0.1\'): TCP establishes a connection before it sends any data. But no program is waiting on port 9000, so the connection is refused, and the sender receives an ECONNREFUSED error.', 'bad');
        push('socket.write is never run. The code sends only after the \'connect\' event arrives, and the connection was not established. The sender learns that there is nobody to receive the data before it sends anything.', '');
      } else {
        st.conn = 'ok';
        push('net.connect(9000, \'127.0.0.1\'): TCP establishes a connection before it sends any data (the three-way handshake). A program is waiting on port 9000, so this succeeds. From now on, the operating systems on both sides number the bytes that travel over this connection and keep track of them.', 'good');
      }
    } else {
      st.conn = 'none';
      push('dgram.createSocket(\'udp4\'): UDP has no procedure for establishing a connection. As soon as the socket is created, you can send, and UDP does not check whether the receiver is ready.', '');
    }
    if (!tcp || on) {
      for (var i = 0; i < 3; i++) {
        var what = tcp ? '2 bytes' : 'one datagram (2 bytes)';
        if (!on) { st.sent[i] = 2; push(call(i) + ': ' + (i === 0 ? 'It sends ' + what + '. The callback of send reports no error. But no program is listening on port 9000, so the receiver\'s operating system discards this datagram. "No error" means only that the operating system sent it out, not that the other side received it.' : 'The same thing happens again. The send finishes without an error, and the datagram is discarded at the receiver.'), 'bad'); continue; }
        if (i === 1 && net === 'loss') {
          st.sent[i] = 2;
          push(call(i) + ': It sends ' + what + ', but the data is lost on the way. ' + (tcp ? 'The write of the sending program still succeeds. Noticing the loss and dealing with it is the job of TCP in the operating system, not of the program.' : 'The callback of send reports no error. UDP does not exchange acknowledgments, so the sender does not know that it was lost.'), 'bad'); continue;
        }
        if (i === 1 && net === 'reorder') { st.sent[i] = 3; push(call(i) + ': It sends ' + what + ', but the data has not arrived yet because the path is held up. On the internet, something sent later sometimes takes another path and arrives first.', ''); continue; }
        st.sent[i] = 1;
        var behind = i === 2 && net !== 'ok';
        if (tcp && behind) {
          st.held = P[i];
          push(call(i) + ': the 2 bytes arrive. But the receiver\'s operating system can tell from the sequence numbers that the earlier 2 bytes (\'CD\') have not arrived yet. So it only holds \'EF\' aside and does not put it where the program can read it.', '');
        } else {
          put(P[i]);
          push(call(i) + ': ' + (tcp ? 'the 2 bytes arrive at the receiver\'s operating system and are added to the receive buffer. ' : 'the datagram arrives at the receiver\'s operating system and is added to the receive buffer. ') + (i === 0 ? 'The receiving program has not read yet, so the operating system holds it. ' : '') + (tcp ? (i === 0 ? 'The TCP buffer is a single line in which bytes pile up one after another.' : i === 1 ? 'They follow right after the earlier bytes. Where one write ended and the next began is not recorded.' : 'They also follow the earlier bytes, so the buffer holds 6 bytes in a single line.') :(i === 0 ? 'The UDP buffer holds each datagram separately.' : behind && net === 'reorder' ? 'It arrived before the second one, so it is placed after \'AB\'.' : 'It is held separately and is not mixed with the earlier datagrams.')), '');
        }
      }
      if (on && net === 'loss' && tcp) { st.sent[1] = 1; st.buf = ['ABCDEF']; st.held = ''; push('Sending operating system: no acknowledgment has arrived for \'CD\', so it sends \'CD\' again (retransmission). The receiver\'s operating system fills the gap and appends the \'EF\' it was holding. The code of the program does nothing during this process.', 'good'); }
      if (on && net === 'reorder') {
        st.sent[1] = 1; st.late = true;
        if (tcp) { st.buf = ['ABCDEF']; st.held = ''; push('The delayed \'CD\' arrives. The receiver\'s operating system places \'CD\' after \'AB\' in sequence number order, and appends the \'EF\' it was holding after it.', 'good'); }
        else { st.buf.push('CD'); push('The delayed \'CD\' arrives. UDP has no number that shows order, so the receiver\'s operating system adds it after \'EF\', in the order of arrival.', 'bad'); }
      }
      if (on) {
        st.read = got.slice();
        if (tcp) push('The receiving program reads: a single \'data\' event delivers all 6 bytes, "ABCDEF". There is no trace of the data having been sent in three writes. What TCP delivers is a stream of bytes in the correct order, not the boundaries between pieces.', 'good');
        else push('The receiving program reads: the \'message\' event fires ' + got.length + ' times, and each time it delivers one datagram (' + got.map(function (x) { return '\'' + x + '\''; }).join(', ') + '). Even if several were piled up in the buffer together, they are not merged.' + (net === 'loss' ? ' \'CD\' never arrives. UDP does not send it again.' : net === 'reorder' ? ' They come in the order they arrived, not the order they were sent.' : ''), net === 'ok' ? 'good' : 'bad');
      } else push('There is no receiving program, so all three datagrams were lost. The sending program did not receive a single error, so it usually does not know this (the operating system sometimes reports it with an ICMP error).', 'bad');
    }
    var q = function (a) { return a.map(function (x) { return '"' + x + '"'; }).join(', '); };
    var same = !on ? (tcp ? 'Nothing was sent' : 'All lost') : tcp ? 'Same content and order, boundaries gone' : { ok: 'Exactly as sent', loss: 'One is missing', reorder: 'Order changed' }[net];
    var row = [tcp ? (on ? 'Established (success)' : 'Failed (ECONNREFUSED)') : 'None', tcp ? (on ? '3 writes succeeded' : 'Could not send') : 'All 3 sends: no error', got.length ? q(got) + ' (' + got.length + (got.length === 1 ? ' piece)' : ' pieces)') : 'None', same];
    if (tcp && on) sum.push('TCP is a stream of bytes. It keeps the order and the content, but it does not tell the receiver how many writes the data was split into. So a program that exchanges messages over TCP has to decide for itself "where one message ends." It writes the length first (as HTTP does with Content-Length) or uses a delimiter such as a newline.');
    if (tcp && on && net === 'ok') sum.push('In this lab, the receiving program reads late. If it reads as soon as the data arrives, the data may be read in three separate pieces, as it was sent, but there is no guarantee of that. Code that assumes "one write is one read" works on your own computer and then breaks in a real environment.');
    if (tcp && on && net !== 'ok') sum.push('With TCP, even if data is lost or reordered on the way, the operating system corrects it with sequence numbers and acknowledgments before handing it to the program. What the program reads is the same as when nothing went wrong. In exchange, the data that came later has to wait until the gap is filled. You can see the detailed process of retransmission in the "TCP connections and retransmission" lab. This case could not be created in our test environment, so it was not verified by execution, and it follows the description in the TCP specification.');
    if (tcp && !on) sum.push('With TCP, the sender finds out that nobody is there while it is establishing the connection.');
    if (!tcp && on && net === 'ok') sum.push('UDP keeps the boundaries of the pieces that were sent (datagrams). One send is one message on the receiving side. However, this is true only when nothing happens on the way.');
    if (!tcp && on && net !== 'ok') sum.push('UDP does not send lost data again and does not put data in order. If needed, the program has to add numbers, acknowledge, and resend by itself. QUIC, which HTTP/3 uses, is an example that built such features on top of UDP.');
    if (!tcp && !on) sum.push('A UDP send succeeding means only that the operating system sent the datagram out. Even if the other program does not exist, or the datagram is lost on the way, the sender usually does not know (the operating system sometimes reports it with an ICMP error).');
    sum.push(tcp ? 'TCP is used where nothing may be lost or reordered. The web (HTTP/1.1, HTTP/2), database connections, file transfer, and email run on TCP.' : 'UDP is used where losing a little is acceptable and late arrival is worse, or where one short question and answer is enough. Real-time voice and video, games, and DNS lookups are typical.');
    return { events: ev, summary: sum, row: row };
  },
  render: function (v, sim, t, H, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : null, P = this.PARTS;
    if (!s) { H.text(v, 'Click Run to go through it one step at a time.'); return; }
    H.table(v, ['Sent', 'What happened'], P.map(function (x, i) { var z = s.sent[i]; return { cells: ['"' + x + '"', z === 0 ? 'Not sent yet' : z === 1 ? { v: 'Arrived at the receiver\'s OS', cls: 'good' } : z === 2 ? { v: 'Lost', cls: 'bad' } : { v: 'In flight (delayed)', cls: 'hot' }] }; }), 'The three pieces the sender sent');
  },
  // Diagram: on the left, the three pieces the sending program sent; in the middle, the receive buffer of the receiver's operating system; on the right, what the receiving program read. TCP joins them into one line in the middle, and UDP keeps them separate.
  draw: function (P, sim, shown) {
    var c = sim.c, tcp = c.proto === 'tcp', on = !!c.recv, last = shown[shown.length - 1], s = last ? last.snap : { conn: '', sent: [0, 0, 0], buf: [], held: '', read: [], late: false }, parts = this.PARTS;
    P.size(680, 318);
    P.region('sd', 16, 16, 176, 236, 'Sending program');
    P.region('os', 262, 16, 196, 236, on ? 'Receive buffer' : 'Receiver\'s computer');
    P.region('ap', 504, 16, 160, 236, 'Receiving program');
    parts.forEach(function (x, i) {
      var z = s.sent[i];
      P.box('s' + i, 30, 52 + i * 64, 148, 50, { cls: z === 0 ? 'ghost' : z === 1 ? 'wait' : z === 2 ? 'bad' : 'hot', title: (tcp ? 'write' : 'send') + ' "' + x + '"', sub: z === 0 ? 'Not yet' : z === 1 ? 'Arrived' : z === 2 ? 'Lost' : 'In flight' });
    });
    if (!on) {
      P.box('none', 276, 100, 168, 60, { cls: s.conn === 'fail' || s.sent[0] === 2 ? 'bad' : 'ghost', title: 'Port 9000', sub: 'No program listening' });
      P.text('noapp', 584, 136, 'Not running', { cls: 'mut', anchor: 'middle' });
      parts.forEach(function (x, i) { if (s.sent[i] === 2) P.arrow('a' + i, 's' + i + ':r', 'none:l:' + (0.25 * (i + 1)), { cls: 'bad dash', label: 'Discarded' }); });
      if (s.conn === 'fail') P.arrow('cf', 's0:r', 'none:l', { cls: 'bad dash', label: 'Refused' });
    } else if (tcp) {
      var str = s.buf[0] || '';
      P.box('buf', 276, 52, 168, 60, { cls: str ? 'wait' : 'ghost', title: str ? '"' + str + '"' : '(empty)', sub: str ? str.length + ' bytes in one line' : 'Bytes pile up here' });
      if (s.held) P.box('held', 276, 136, 168, 50, { cls: 'hot', title: '"' + s.held + '"', sub: 'Held, gap before it' });
      parts.forEach(function (x, i) { var z = s.sent[i]; if (z === 1) P.arrow('a' + i, 's' + i + ':r', (s.held === x ? 'held' : 'buf') + ':l' + (s.held === x ? '' : ':' + (0.25 * (i + 1)))); if (z === 2) P.arrow('a' + i, [178, 77 + i * 64], [228, 77 + i * 64], { cls: 'bad dash', label: 'Lost' }); });
      if (s.read.length) { P.box('r0', 518, 52, 132, 60, { cls: 'good', title: '"' + s.read[0] + '"', sub: 'One read' }); P.arrow('rd', 'buf:r', 'r0:l', { cls: 'good' }); }
    } else {
      s.buf.forEach(function (x, k) { P.box('d' + x, 276, 52 + k * 64, 168, 50, { cls: 'wait', title: '"' + x + '"', sub: 'Datagram ' + (k + 1) }); });
      if (!s.buf.length) P.box('emp', 276, 52, 168, 50, { cls: 'ghost', title: '(empty)', sub: 'Datagrams go here' });
      parts.forEach(function (x, i) { var z = s.sent[i]; if (z === 1) P.arrow('a' + i, 's' + i + ':r', 'd' + x + ':l'); if (z === 2) P.arrow('a' + i, [178, 77 + i * 64], [228, 77 + i * 64], { cls: 'bad dash', label: 'Lost' }); });
      s.read.forEach(function (x, k) { P.box('r' + x, 518, 52 + k * 64, 132, 50, { cls: 'good', title: '"' + x + '"', sub: 'Read #' + (k + 1) }); P.arrow('rd' + x, 'd' + x + ':r', 'r' + x + ':l', { cls: 'good' }); });
    }
    if (on && !s.read.length) P.text('noread', 584, 136, 'Not read yet', { cls: 'mut', anchor: 'middle' });
    P.box('cn', 16, 268, 320, 34, { cls: s.conn === 'ok' ? 'good' : s.conn === 'fail' ? 'bad' : s.conn === 'none' ? 'plain' : 'ghost', title: 'Connection before sending', right: { '': 'Not yet', ok: 'Established', fail: 'ECONNREFUSED', none: 'None (UDP)' }[s.conn] });
    P.box('rs', 344, 268, 320, 34, { cls: s.read.length ? (sim.row[3] === 'Exactly as sent' || tcp ? 'good' : 'bad') : 'ghost', title: 'Number of reads', right: s.read.length ? s.read.length + '' : '0' });
    if (!on) { P.note(tcp ? 'TCP sets up a connection before it sends data. No program was listening on port 9000, so the connection was refused, and the sending program sent nothing.' : 'UDP sends without a connection, so all three sends finish without an error. But no program is listening on port 9000, so the receiving computer discards every datagram that arrives.'); return; }
    P.note(tcp ? 'With TCP, the bytes form one line in the receive buffer, so nothing is left of how many pieces the sender split the data into. The operating system corrects the order and any gaps by using the numbers.' : 'With UDP, each datagram that was sent arrives separately and is read separately. Even if one is lost or the order changes along the way, what arrives is delivered as it is.');
  },
  assume: 'This is a case in which "AB", "CD", and "EF" are sent at 0.05-second intervals and the receiving program reads after all three have arrived. Six of the eight combinations were actually run with the net and dgram modules on 127.0.0.1 in our test run (Windows, Node.js 24) and checked against the model (each combination was run five times, with the same result every time). The loss and the reordering of UDP were created by placing a relay program between the sender and the receiver that drops or delays datagrams, and it was confirmed that the UDP sockets at both ends do not correct this. The two combinations in which TCP has a loss or a reordering could not be created in our test environment and were not run; following the TCP specification (RFC 9293, sequence numbers in section 3.4, and acknowledgments and retransmission in section 3.8), the lab states that "what the program reads is the same as when nothing went wrong." That all 6 bytes came out in a single read with TCP is the result seen in our test run, and what the specification guarantees is only the order and the content of the bytes. How many reads the data is divided into varies with the circumstances. That UDP delivers in units of datagrams and does not guarantee arrival is stated in RFC 768 and in RFC 1122 section 4.1. The UDP header has no number that shows order (RFC 768), and the IP below it does not keep order either (RFC 791 section 1.2). The operating system sometimes reports with an ICMP message that no receiving program exists, but in this run nothing came back as a result of send or as an error event. The case in which data is discarded because the buffer of the operating system is full is not covered.',
});

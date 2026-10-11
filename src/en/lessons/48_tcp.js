Lab.register({
  id: 'tcp', nav: 'TCP connections and retransmission', cat: 'Networking', mode: 'step',
  title: 'When a packet is lost, who notices and sends it again?',
  intro: 'TCP establishes a connection before it sends data, and it receives acknowledgments that tell it how far the data has been received. If no acknowledgment arrives, it sends the data again. UDP sends without any of that procedure.',
  terms: ['TCP and UDP', 'Three-way handshake', 'Flow control and congestion control'], ranks: ['network', 'os'],
  controls: [
    { id: 'proto', label: 'Protocol', type: 'select', value: 'tcp', options: [['tcp', 'TCP'], ['udp', 'UDP']] },
    { id: 'loss', label: 'Packet lost on the way', type: 'select', value: 'none', options: [['none', 'None'], ['syn', 'Connection request (SYN)'], ['data', 'Second data packet']] },
  ],
  fix: function (c) { return c.proto === 'udp' && c.loss === 'syn' ? { loss: 'none' } : null; },
  presets: [
    { t: 'Default settings', d: 'TCP, no loss. It establishes a connection, sends the data, and receives acknowledgments.', v: { proto: 'tcp', loss: 'none' } },
    { t: 'A lost data packet', d: 'No acknowledgment arrives, so the data is sent again.', v: { proto: 'tcp', loss: 'data' } },
    { t: 'A lost connection request', d: 'With no reply, the sender waits and then tries again.', v: { proto: 'tcp', loss: 'syn' } },
    { t: 'The same loss with UDP', d: 'The lost datagram stays lost.', v: { proto: 'udp', loss: 'data' } },
  ],
  code: function (c) {
    if (c.proto === 'udp') return '// UDP: send right away, without a connection\nDatagramSocket socket = new DatagramSocket();\nfor (byte[] part : parts) {\n    socket.send(new DatagramPacket(part, part.length, address, 9000));\n}   // there is no way to know whether it arrived';
    return '// TCP: connect first, then send\nSocket socket = new Socket("shop.example", 443);   // the three-way handshake happens here\nOutputStream out = socket.getOutputStream();\nout.write(data);                               // the operating system splits it into segments and\n                                               // handles acknowledgment, retransmission, and ordering\nsocket.close();                                // close the connection';
  },
  label: function (c) { return c.proto.toUpperCase() + ' · ' + { none: 'No loss', syn: 'SYN lost', data: 'Data packet lost' }[c.loss]; },
  columns: ['Data that reached the receiver', 'Retransmissions', 'Round trip to establish the connection'],
  simulate: function (c) {
    var ev = [], rows = [], sum = [], got = [], re = 0;
    function step(dir, what, s, k) { rows.push({ cells: [dir, { v: what, cls: k === 'bad' ? 'bad' : k === 'good' ? 'good' : k === 'hot' ? 'hot' : '' }] }); ev.push({ s: s, k: k === 'hot' ? '' : k, snap: { rows: rows.slice(), got: got.slice() } }); }
    if (c.proto === 'udp') {
      step('Sender', 'No connection setup', 'UDP does not establish a connection. It sends right away, without checking whether the other side is ready to receive.', '');
      step('Sender → Receiver', 'Datagram 1 "Hello,"', 'It sends the first datagram.', ''); got.push('Hello,'); ev[ev.length - 1].snap.got = got.slice();
      if (c.loss === 'data') step('Sender → (lost)', 'Datagram 2 " world"', 'The second datagram was lost in the network. The sender does not wait for an acknowledgment, so it does not know that it was lost.', 'bad');
      else { step('Sender → Receiver', 'Datagram 2 " world"', 'It sends the second datagram.', ''); got.push(' world'); ev[ev.length - 1].snap.got = got.slice(); }
      step('Sender → Receiver', 'Datagram 3 "!!!"', 'It sends the third datagram.', ''); got.push('!!!'); ev[ev.length - 1].snap.got = got.slice();
      sum.push('Data that reached the receiver: "' + got.join('') + '".' + (c.loss === 'data' ? ' The middle is missing, but UDP neither reports it nor sends it again.' : ''));
      sum.push('UDP has no connection, acknowledgment, retransmission, or guaranteed order, and in return it is lightweight and has little delay. It is used where losing a little is acceptable and late arrival is worse (real-time voice and video, games, DNS lookups). If reliability is needed, the application implements it itself (QUIC, the basis of HTTP/3, is an example).');
      return { events: ev, summary: sum, row: ['"' + got.join('') + '"', '0', 'None'] };
    }
    if (c.loss === 'syn') { step('Client → (lost)', 'SYN', 'The client sent a connection request (SYN), but it was lost on the way.', 'bad'); re++; step('Client', 'No reply → retransmit after about 1 second', 'There is no reply from the server. The client waits for a set time and then sends the SYN again. If that fails too, it doubles the waiting time each time and tries a few more times. This is why a connection can be established "slowly."', 'hot'); }
    step('Client → Server', 'SYN (seq=100)', 'Step 1: the client sends a SYN, which says "I want to connect." It announces the starting number (100) that it will use.', '');
    step('Server → Client', 'SYN + ACK (seq=300, ack=101)', 'Step 2: the server answers, "Received (ACK), and I will connect too (SYN)." ack=101 means "I have received up to 100, so send 101 next."', '');
    step('Client → Server', 'ACK (ack=301)', 'Step 3: the client acknowledges the SYN of the server. Both sides have now confirmed that "what I send arrives, and what the other side sends reaches me." The connection is established.', 'good');
    step('Client → Server', 'Segment 1 "Hello," (seq=101, 6 bytes)', 'It splits the data into segments, numbers them, and sends them.', ''); got.push('Hello,'); ev[ev.length - 1].snap.got = got.slice();
    step('Server → Client', 'ACK (ack=107)', 'The server acknowledges: "I have received up to 106, so send 107 next."', '');
    if (c.loss === 'data') {
      step('Client → (lost)', 'Segment 2 " world" (seq=107)', 'The second segment was lost in the network.', 'bad');
      step('Client → Server', 'Segment 3 "!!!" (seq=113, 3 bytes)', 'The third segment arrived. The server expects 107 but received 113, so it is out of order. It keeps this segment and does not pass it to the application.', '');
      step('Server → Client', 'ACK (ack=107) again', 'The server sends the same acknowledgment again, saying "I am still waiting for 107."', '');
      re++; step('Client → Server', 'Segment 2 " world" retransmitted (seq=107)', 'The client sees that no acknowledgment for 107 has arrived, or that the same acknowledgment keeps arriving, and concludes that segment 2 was lost, so it sends it again.', 'hot'); got.push(' world'); got.push('!!!'); ev[ev.length - 1].snap.got = got.slice();
      step('Server → Client', 'ACK (ack=116)', 'The server joins the segment that was missing to the segment 3 it kept, and acknowledges: "I have received everything up to 115." The application is given the complete data, in order.', 'good');
    } else {
      step('Client → Server', 'Segment 2 " world" (seq=107, 6 bytes)', 'It sends the second segment.', ''); got.push(' world'); ev[ev.length - 1].snap.got = got.slice();
      step('Client → Server', 'Segment 3 "!!!" (seq=113, 3 bytes)', 'It sends the third segment.', ''); got.push('!!!'); ev[ev.length - 1].snap.got = got.slice();
      step('Server → Client', 'ACK (ack=116)', 'The server acknowledges: "I have received everything up to 115."', 'good');
    }
    step('Both', 'Exchange FIN / ACK to close the connection', 'When there is nothing left to send, each side sends "I am finished (FIN)," has it acknowledged, and closes the connection.', '');
    sum.push('TCP detects a loss from the sequence numbers and acknowledgments and sends the data again, and even if segments arrive in the wrong order, it puts them in order by number before passing them to the application. The application never learns about the loss. The price is the round trip to establish the connection and, when a loss happens, the delay of also waiting for the data that follows.');
    sum.push('Flow control adjusts the sending so that it does not exceed what the receiver can handle, and congestion control slows the sending down when the network is congested. When a loss occurs, TCP assumes the network is congested and lowers its sending rate.');
    return { events: ev, summary: sum, row: ['"' + got.join('') + '"', re + '', '1 (SYN → SYN+ACK → ACK)'] };
  },
  render: function (v, sim, t, H, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : { rows: [], got: [] };
    if (s.rows.length) H.table(v, ['Direction', 'Packet'], s.rows, 'Packets exchanged (top to bottom)'); else H.text(v, 'Click Run to start.');
  },
  // Diagram: packets going back and forth between two computers. A packet that is lost on the way is drawn as a broken arrow.
  draw: function (P, sim, shown) {
    var udp = sim.c.proto === 'udp', last = shown[shown.length - 1], s = last ? last.snap : { rows: [], got: [] }, ids = { 'Client': 'c', 'Server': 's', 'Sender': 'c', 'Receiver': 's' };
    var msgs = s.rows.map(function (r) { var m = P.dir(P.v(r.cells[0]), ids); m.s = P.v(r.cells[1]); m.cls = P.c(r.cells[1]); return m; });
    var end = P.seq([['c', udp ? 'Sender' : 'Client', 'wait'], ['s', udp ? 'Receiver' : 'Server', 'wait']], msgs);
    P.box('got', 16, end + 14, 648, 34, { cls: s.got.length ? 'good' : 'ghost', title: 'Data delivered to the receiving application', right: '"' + s.got.join('') + '"' });
    P.size(680, end + 64);
    P.note('Each arrow is one packet, and time flows from top to bottom. A red dashed line is a packet that was lost on the way.');
  },
  assume: 'This is a small example in which "Hello, world!!!" is split into three pieces and sent. The numbers (seq, ack) are arbitrary values chosen to make the example easier to follow, and each character is counted as 1 byte (ASCII text), so the three pieces are 6, 6, and 3 bytes. The timing of retransmission is simplified. Besides the timer expiring, real TCP also retransmits right away when the same acknowledgment arrives three times in a row (three duplicate ACKs). The principles of the three-way handshake and of retransmission follow the TCP specification (RFC 9293).',
});

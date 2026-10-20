Lab.register({
  id: 'layers', nav: 'Layers and encapsulation', cat: 'Networking', mode: 'step',
  title: 'You send 1500 bytes, so why do 1616 bytes cross the wire?',
  why: 'One communication mixes jobs of different kinds: carrying signals, finding a route to the destination, resending missing data, and exchanging web pages. If it is built as one block, changing one part means changing everything. A layered structure divides these jobs into layers and fixes only the form of what passes between layers, so that even if you replace a network cable with Wi-Fi, the IP, TCP, and HTTP above it are used as they are, without changes.',
  use: 'Use it as a standard for checking from the lowest layer up when a connection fails: "Are the network cable and Wi-Fi connected? Are the IP address and route right? Is the port open? What is the HTTP response?" Layer numbers are also used to say whether a device sees only up to the IP address and port or up to the HTTP path and headers, as in "L4 load balancer" and "L7 load balancer."',
  intro: 'A network divides its work into layers. On the sending side, data moves down from the upper layers to the lower layers, and each layer adds a header in front of the data that holds the information that layer needs for its own job. This is called encapsulation. The receiving side removes the headers one at a time in the reverse order.',
  terms: ['OSI model', 'TCP/IP model', 'Encapsulation and decapsulation', 'Segment, packet, and frame', 'MTU and MSS'],
  controls: [
    { id: 'size', label: 'Size of the HTTP message to send', type: 'select', value: '1500', options: [['300', '300 bytes (one short request)'], ['1460', '1460 bytes'], ['1500', '1500 bytes'], ['4000', '4000 bytes'], ['10000', '10000 bytes (uploading a long text)']] },
    { id: 'mtu', label: 'Largest size that fits in one frame (MTU)', type: 'select', value: '1500', options: [['1500', '1500 bytes (Ethernet default)'], ['1400', '1400 bytes (example of a narrower link)']], hint: 'The MTU is the largest IP packet that the link layer can carry in one frame.' },
  ],
  presets: [
    { t: 'Default settings', q: 'How many bytes cross the wire when you send a 1500-byte HTTP message over a link with an MTU of 1500 bytes?', d: '1500 bytes with an MTU of 1500. Even though the size equals the MTU, the message becomes two pieces.', v: { size: '1500', mtu: '1500' } },
    { t: 'Exactly one piece', q: 'What if you change the size of the HTTP message to send to 1460 bytes?', d: '1460 bytes become exactly 1500 bytes once the headers are added.', v: { size: '1460', mtu: '1500' } },
    { t: 'Short request', q: 'What if you change the size of the HTTP message to send to 300 bytes?', d: '300 bytes. It is not split; only the headers are added.', v: { size: '300', mtu: '1500' } },
    { t: 'Long data', q: 'What if you change the size of the HTTP message to send to 10000 bytes?', d: '10000 bytes is split into 7 pieces, and each piece gets its own headers.', v: { size: '10000', mtu: '1500' } },
    { t: 'A smaller MTU', q: 'What if the message is 1460 bytes and you change the MTU to 1400 bytes?', d: 'The same 1460 bytes now become two pieces.', v: { size: '1460', mtu: '1400' } },
  ],
  TCP: 20, IP: 20, ETH: 14, FCS: 4,
  code: function (c) {
    return '// Node.js. Build each header as a chunk of bytes of that size and attach them in order (the content is left empty; only the sizes matter).\nconst mtu = ' + c.mtu + ';\nconst message = Buffer.alloc(' + c.size + ');' + ' '.repeat(Math.max(1, 25 - c.size.length)) + '// HTTP message (application layer)\nconst tcpHeader = Buffer.alloc(20);                     // port numbers, sequence number, and so on\nconst ipHeader = Buffer.alloc(20);                      // IP addresses, and so on\nconst ethHeader = Buffer.alloc(14);                     // MAC addresses, and so on\nconst fcs = Buffer.alloc(4);                            // frame check sequence (at the end of the frame)\n\nconst mss = mtu - ipHeader.length - tcpHeader.length;   // data that fits in one piece\nlet total = 0;\nfor (let at = 0; at < message.length; at += mss) {\n    const data = message.subarray(at, at + mss);                // one piece\n    const segment = Buffer.concat([tcpHeader, data]);           // transport layer: segment\n    const packet = Buffer.concat([ipHeader, segment]);          // internet layer: packet\n    const frame = Buffer.concat([ethHeader, packet, fcs]);      // link layer: frame\n    console.log(data.length, segment.length, packet.length, frame.length);\n    total += frame.length;\n}\nconsole.log(total);                                     // total size that went out on the wire';
  },
  label: function (c) { return 'HTTP message ' + c.size + ' bytes · MTU ' + c.mtu; },
  columns: ['Data that fits in one piece (MSS)', 'Pieces', 'Data in the last piece', 'Header and FCS bytes added', 'Total size on the wire'],
  // sizes of the pieces made by splitting the data into MSS-sized chunks
  split: function (c) {
    var size = +c.size, mss = +c.mtu - this.IP - this.TCP, segs = [], left = size;
    while (left > 0) { segs.push(Math.min(left, mss)); left -= mss; }
    return { size: size, mtu: +c.mtu, mss: mss, segs: segs, per: this.TCP + this.IP + this.ETH + this.FCS };
  },
  simulate: function (c) {
    var k = this.split(c), T = this.TCP, I = this.IP, E = this.ETH, F = this.FCS, n = k.segs.length, first = k.segs[0], lastSeg = k.segs[n - 1], over = k.per * n, total = k.size + over, ev = [], sum = [];
    var A = { cp: '51000', sp: '80', cip: '192.168.0.10', sip: '192.168.0.20', cmac: '00:00:5e:00:53:0a', smac: '00:00:5e:00:53:14' };
    var st = { stage: 0, at: '', eth: false, ip: false, tcp: false, data: 0, name: '', bytes: 0, split: false, sent: false, done: false };
    function push(s, kind) { st.stage++; ev.push({ s: s, k: kind || '', snap: JSON.parse(JSON.stringify(st)) }); }
    st.at = 's0'; st.data = k.size; st.name = 'HTTP message'; st.bytes = k.size;
    push('Application layer (HTTP): The browser creates the HTTP message to send to the server. Its size is ' + k.size + ' bytes. This layer only decides "what content is exchanged" and leaves how it reaches the other side to the layers below.');
    st.at = 's1'; st.split = true; st.data = first; st.name = n > 1 ? 'First piece' : 'Data (not split)'; st.bytes = first;
    push('Transport layer (TCP): First, work out how much can be sent at one time. The MTU, the largest size the link layer carries in one frame, is ' + k.mtu + ' bytes, and the ' + I + '-byte IP header and the ' + T + '-byte TCP header must fit inside it, so one piece can carry up to ' + k.mss + ' bytes of data (the MSS). ' + (n > 1 ? 'The ' + k.size + ' bytes of data to send are larger than that, so the data is split into ' + n + ' pieces (' + (n <= 3 ? k.segs.join(', ') : first + ' bytes x ' + (n - 1) + ', then ' + lastSeg) + ' bytes).' : 'The ' + k.size + ' bytes of data to send fit in this, so the data is not split.'), n > 1 ? 'bad' : 'good');
    st.tcp = true; st.name = 'Segment'; st.bytes = first + T;
    push('Transport layer (TCP): ' + (n > 1 ? 'The first piece' : 'The data') + ' gets a ' + T + '-byte TCP header in front. Wrapping the data with a header like this is encapsulation. The header holds the port numbers that identify the sending program and the receiving program (' + A.cp + ' → ' + A.sp + ') and a sequence number that tells which byte of the whole data this piece starts at. Data wrapped like this is called a segment. It is now ' + (first + T) + ' bytes.');
    st.at = 's2'; st.ip = true; st.name = 'Packet'; st.bytes = first + T + I;
    push('Internet layer (IP): A ' + I + '-byte IP header is placed in front of the segment. The header holds the IP addresses of the sending computer and the receiving computer (' + A.cip + ' → ' + A.sip + '). Data wrapped like this is called a packet. It is now ' + (first + T + I) + ' bytes.' + (first + T + I === k.mtu ? ' This fills the MTU of ' + k.mtu + ' bytes exactly.' : ''));
    st.at = 's3'; st.eth = true; st.name = 'Frame'; st.bytes = first + k.per;
    push('Link layer (Ethernet): A ' + E + '-byte Ethernet header is placed in front of the packet, and a ' + F + '-byte frame check sequence (FCS) for error checking is placed after it. The header holds the MAC addresses of the two devices that exchange this data within the same network (' + A.cmac + ' → ' + A.smac + '). Data wrapped like this is called a frame. ' + (first + k.per) + ' bytes go out on the wire.');
    st.sent = true;
    push(n > 1 ? 'The remaining pieces are wrapped in the same order. The headers are added to each piece separately. With ' + n + ' frames and ' + k.per + ' bytes added to each, ' + over + ' bytes were added in all. Counting the ' + k.size + ' bytes of data, ' + total + ' bytes went out on the wire.' : 'There is only one piece, so there is only one frame. The ' + k.size + ' bytes of data got ' + k.per + ' bytes of headers and FCS added, so ' + total + ' bytes went out on the wire.', n > 1 ? 'bad' : '');
    st.at = 'r3'; st.eth = false; st.name = 'Packet'; st.bytes = first + T + I;
    push('Receiving side, link layer: It takes in the frame and checks that the destination MAC address is its own and that the check value in the FCS is correct. If both are fine, it removes the Ethernet header and the FCS and passes the packet inside up to the next layer. What was added last when sending is removed first.');
    st.at = 'r2'; st.ip = false; st.name = 'Segment'; st.bytes = first + T;
    push('Receiving side, internet layer: It checks that the destination IP address in the IP header (' + A.sip + ') is its own. If it is, it removes the IP header and passes the segment inside up to TCP.');
    st.at = 'r1'; st.tcp = false; st.data = k.size; st.name = 'HTTP message'; st.bytes = k.size;
    push('Receiving side, transport layer: It looks at the destination port ' + A.sp + ' in the TCP header to decide which program (the web server) the data is for. ' + (n > 1 ? 'It uses the sequence numbers to join the ' + n + ' pieces in order and then removes the header.' : 'It removes the TCP header.'));
    st.at = 'r0'; st.done = true;
    push('Receiving side, application layer: The web server receives the original HTTP message of ' + k.size + ' bytes exactly as it was. It does not know how many pieces the message was split into on the way, or which headers were added and removed.', 'good');
    if (n > 1 && k.size <= k.mtu) sum.push('The MTU is a limit on the size of the packet, which includes the IP header and the TCP header, not on the size of the data. So one piece carries only up to ' + k.mss + ' bytes of data (the MSS), which is the MTU minus 40 bytes. This is why data that is equal to the MTU, or slightly smaller, still becomes two pieces.');
    if (n > 2) sum.push('When the data is large, headers are added again for every piece. TCP on the receiving side joins the pieces using the sequence numbers, so the program reads them as continuous data without having to care about the pieces.');
    if (n === 1) sum.push('Even if the data is not split, the ' + k.per + ' bytes of headers and FCS are always added. The smaller the data, the larger the share of the total that the headers take up.');
    sum.push('Each layer looks at a different address. The transport layer uses a port number to identify a program, the internet layer uses an IP address to identify a computer, and the link layer uses a MAC address to identify the next device on the same network. Each layer reads only its own header and treats everything inside it as content, so you can change the technology of one layer (wired to wireless, or HTTP to another protocol) and keep using the other layers as they are.');
    return { events: ev, summary: sum, k: k, addr: A, wire: total, over: over, row: [k.mss + ' bytes', n + '', lastSeg + ' bytes', over + ' bytes (' + k.per + ' bytes x ' + n + ')', total + ' bytes'] };
  },
  render: function (v, sim, t, H, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : { stage: 0, at: '' }, k = sim.k, T = this.TCP, I = this.IP, E = this.ETH, F = this.FCS, A = sim.addr;
    var on = function (lv) { return s.at.charAt(1) === String(lv) ? 'hot' : ''; };
    H.table(v, ['OSI model', 'TCP/IP model', 'Example in this lab', 'Name of the data', 'Address in the header'], [
      { cells: ['7 Application · 6 Presentation · 5 Session', { v: 'Application', cls: on(0) }, 'HTTP', 'Message', '-'] },
      { cells: ['4 Transport', { v: 'Transport', cls: on(1) }, 'TCP (header ' + T + ' bytes)', 'Segment', 'Port number ' + A.cp + ' → ' + A.sp] },
      { cells: ['3 Network', { v: 'Internet', cls: on(2) }, 'IP (header ' + I + ' bytes)', 'Packet', 'IP address ' + A.cip + ' → ' + A.sip] },
      { cells: ['2 Data link · 1 Physical', { v: 'Link', cls: on(3) }, 'Ethernet (header ' + E + ' + FCS ' + F + ' bytes)', 'Frame', 'MAC address ' + A.cmac + ' → ' + A.smac] },
    ], 'How the layers correspond (the yellow cell is the layer working now)');
    if (!s.stage) { H.text(v, 'Click Run and the data goes down one step at a time, starting from the top layer on the sending side.'); return; }
    H.counters(v, [[s.split ? k.mss + ' bytes' : '?', 'Data that fits in one piece']]);
    if (s.split) H.table(v, ['Piece', 'Data', '+ TCP ' + T + ' = segment', '+ IP ' + I + ' = packet', '+ Ethernet ' + E + ' + FCS ' + F + ' = frame'], k.segs.map(function (d, i) {
      var cur = i === 0 || s.sent, sh = function (x, need) { return cur && need ? String(x) : '-'; };
      return { cells: ['#' + (i + 1), d + ' bytes', sh(d + T, s.stage >= 3), sh(d + T + I, s.stage >= 4), { v: sh(d + T + I + E + F, s.stage >= 5), cls: cur && s.stage >= 5 ? 'hot' : '' }] };
    }), 'Headers added to each piece (unit: bytes)');
  },
  // Diagram: four layers are stacked on each side, and the current block of data is drawn in the middle. A header box is added in front one at a time on the way down and removed one at a time on the way up. The split pieces are laid out below.
  draw: function (P, sim, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : { stage: 0, at: '', eth: false, ip: false, tcp: false, data: sim.k.size, name: '', bytes: 0, split: false, sent: false, done: false }, k = sim.k, A = sim.addr, n = k.segs.length, i;
    var names = [['App', 'HTTP'], ['Transport', 'TCP'], ['Internet', 'IP'], ['Link', 'Ethernet']];
    P.size(680, 340);
    P.region('snd', 8, 8, 150, 212, 'Sending computer');
    P.region('rcv', 522, 8, 150, 212, 'Receiving computer');
    for (i = 0; i < 4; i++) {
      P.box('s' + i, 16, 36 + i * 45, 134, 38, { cls: s.at === 's' + i ? 'hot now' : 'plain', title: names[i][0], right: names[i][1], sub: i === 0 ? 'Browser' : '' });
      P.box('r' + i, 530, 36 + i * 45, 134, 38, { cls: s.at === 'r' + i ? (s.done ? 'good now' : 'hot now') : 'plain', title: names[i][0], right: names[i][1], sub: i === 0 ? 'Web server' : '' });
    }
    P.text('un', 340, 30, s.stage ? 'Current data: ' + s.name + ' (' + s.bytes + ' bytes)' : 'Click Run to send the data down the layers', { anchor: 'middle', bold: true });
    if (s.eth) P.box('eth', 168, 42, 58, 46, { cls: 'wait', title: 'Eth', sub: String(this.ETH), center: true });
    if (s.ip) P.box('ip', 228, 42, 48, 46, { cls: 'wait', title: 'IP', sub: String(this.IP), center: true });
    if (s.tcp) P.box('tcp', 278, 42, 52, 46, { cls: 'wait', title: 'TCP', sub: String(this.TCP), center: true });
    P.box('data', 332, 42, 124, 46, { cls: s.stage ? (s.done ? 'good' : 'hot') : 'ghost', title: 'HTTP data', sub: String(s.data), center: true });
    if (s.eth) P.box('fcs', 458, 42, 54, 46, { cls: 'wait', title: 'FCS', sub: String(this.FCS), center: true });
    P.text('lg', 340, 104, 'The number in each box is its size in bytes', { anchor: 'middle', cls: 'mut' });
    if (s.tcp) P.text('a1', 340, 124, 'Port ' + A.cp + ' → ' + A.sp, { anchor: 'middle' });
    if (s.ip) P.text('a2', 340, 142, 'IP ' + A.cip + ' → ' + A.sip, { anchor: 'middle' });
    if (s.eth) P.text('a3', 340, 160, 'MAC ' + A.cmac + ' → ' + A.smac, { anchor: 'middle' });
    if (s.sent) P.arrow('wire', 's3:r', 'r3:l', { cls: 'hot', label: n + (n === 1 ? ' frame' : ' frames') });
    for (i = 0; i < n; i++) P.box('g' + i, 16 + i * 81, 234, 77, 42, { cls: !s.split ? 'ghost' : s.done ? 'good' : i === 0 && !s.sent ? 'hot now' : s.sent ? 'wait' : 'plain', title: 'Piece ' + (i + 1), sub: s.split ? String(k.segs[i]) : '', center: true });
    if (n <= 4) P.text('gt', 664, 260, s.split ? (n > 1 ? 'Data split into ' + n + ' pieces' : 'Not split') : 'Not split yet', { anchor: 'end', cls: 'mut' });
    P.box('tot', 16, 290, 648, 34, { cls: s.sent ? (n > 1 ? 'hot' : 'good') : 'ghost', title: 'Total size on the wire', right: s.sent ? sim.wire + ' bytes = data ' + k.size + ' + added ' + sim.over : 'Not sent yet' });
    P.note('The block in the middle is the data as it is now. Each time the sender moves down one layer, a blue header is added in front, and each time the receiver moves up one layer, headers come off, outermost first. The middle shows only the first piece; the boxes in the bottom row are the split pieces.');
  },
  assume: 'The header sizes are the default sizes without options. The 20-byte TCP header follows RFC 9293 section 3.1, the 20-byte IPv4 header follows RFC 791 section 3.1, the 14-byte Ethernet header (destination MAC 6 + source MAC 6 + type 2) and the 4-byte FCS follow IEEE 802.3, the Ethernet MTU of 1500 bytes follows RFC 894, and the rule that the MSS is the MTU minus 40 bytes follows RFC 9293 section 3.7.1. The four layers of TCP/IP and the names segment, packet (IP datagram), and frame are in RFC 1122 sections 1.1.3 and 1.3.3. The correspondence with the seven OSI layers is not set by a standard; it is a pairing widely used in textbooks. What was checked by execution is the calculation: for each of 10 combinations, on Node.js 24, the text of a real HTTP request was built, the TCP, IPv4, and Ethernet headers and the check value were built as bytes in the positions the standards specify and attached, and the number of pieces and their sizes were measured and checked against the model. The frames were also unpacked and joined again to confirm that the result equals the original message, and the same message was sent over a TCP connection on 127.0.0.1 to confirm that the receiving program gets the same bytes. The frames that the operating system actually puts on the wire were not captured and inspected. In practice, the two sides tell each other their MSS when the connection is set up; when TCP options (such as a 12-byte timestamp) are present, the data in one piece shrinks by that amount; and in settings where the network card does the splitting instead, packet capture tools may show the large block from before the split. Packet capture tools usually show frames without the FCS, so the largest frame appears as 1514 bytes. The 8 bytes of synchronization signal before a frame and the gaps between frames are not counted. A piece with fewer than 6 bytes of data would get extra padding bytes to reach the Ethernet minimum frame size, and only sizes that do not produce such a piece were chosen. The two computers are assumed to be on the same network. If they were on different networks, the destination MAC address would be that of the default gateway, and at each router only the Ethernet header would be replaced. With HTTPS, the HTTP message is encrypted with TLS before TCP carries it. Port 51000 and the addresses in the MAC address range 00-00-5E-00-53-xx reserved for documentation (RFC 7042, now RFC 9542) are examples.',
});

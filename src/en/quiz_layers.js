// Quiz questions for the layers lab. The first entry of a is the correct answer; when sim is present, the answer is checked against the result of the lab model.
Lab.quiz([
  { lv: 1, id: 'layers', q: 'Which is the correct order in which headers are added to an HTTP message on the sending side?',
    a: ['The TCP header, then the IP header, then the Ethernet header', 'The IP header, then the TCP header, then the Ethernet header', 'The Ethernet header, then the IP header, then the TCP header', 'All three headers are added at once in one layer'],
    why: 'As the data goes down from the application layer to the transport layer (TCP), the internet layer (IP), and the link layer (Ethernet), each layer adds one header. The Ethernet header, added last, is outermost, and the receiving side removes it first.' },
  { lv: 2, id: 'layers', q: 'The TCP header contains port numbers, the IP header contains IP addresses, and the Ethernet header contains MAC addresses. Why does each layer have its own address?',
    a: ['Because they point to different things: a program, a computer, and the next device on the same network', 'Because the same address is written in three formats so that it can be recovered if one is damaged', 'Because the port number and the MAC address are encrypted forms of the IP address, and both are needed to decode it', 'Because only the one of the three addresses that arrives first is chosen for use'],
    why: 'A port number identifies which program on a computer, an IP address identifies which computer on the internet, and a MAC address identifies the next device to receive the data within the same network. Each layer has a different job, so each needs a different address.' },
  { lv: 3, id: 'layers', q: 'An HTTP message of 1500 bytes is sent with TCP over Ethernet with an MTU of 1500 bytes. When the TCP and IP headers are the default size (20 bytes each), into how many pieces is the data split?',
    a: ['2 pieces', '1 piece', '3 pieces', '1500 pieces'],
    why: 'The MTU of 1500 bytes is the limit on the packet size, which includes the IP header and the TCP header. Subtracting the 40 bytes of headers leaves 1460 bytes of data that fit in one piece (the MSS), so 1500 bytes becomes two pieces, of 1460 bytes and 40 bytes.',
    sim: { c: { size: '1500', mtu: '1500' }, col: 1, has: '2' } },
  { lv: 2, id: 'layers', q: 'Can the web server program on the receiving side tell how many pieces the HTTP message was split into?',
    a: ['No. TCP joins the pieces in order, removes the header, and then passes the data up', 'Yes. The start line of the HTTP message is attached again to each piece', 'Yes. The Ethernet header is not removed and is passed all the way to the program', 'No. When a message is split, the receiving side discards it and requests it again'],
    why: 'The receiving side removes the headers in the order link layer, internet layer, transport layer, and TCP joins the pieces using the sequence numbers. The program at the application layer receives only the joined data, so it does not know what happened in the layers below.',
    sim: { c: { size: '10000', mtu: '1500' }, col: 1, has: '7' } },
]);

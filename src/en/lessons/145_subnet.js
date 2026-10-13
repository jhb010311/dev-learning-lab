Lab.register({
  id: 'subnet', nav: 'IP addresses and subnets', cat: 'Networking', mode: 'step',
  title: 'Are two IP addresses with the same first three numbers on the same network?',
  intro: 'An IP address is divided into a front part that shows "which network" and a back part that shows "which device within it". A number after the address, such as /24, decides where the front part ends. A computer uses this number to judge whether the destination is on the same network, and so decides whether to send the data directly or to hand it to the default gateway (a home router or another router).',
  terms: ['IP address (IPv4)', 'Subnet mask and CIDR', 'Network address and broadcast address', 'Private IP address', 'NAT'],
  controls: [
    { id: 'ip', label: 'IP address of my PC', type: 'select', value: '192.168.0.10', options: [['192.168.0.10', '192.168.0.10'], ['192.168.0.130', '192.168.0.130'], ['10.20.30.42', '10.20.30.42']] },
    { id: 'prefix', label: 'Length of the network part (CIDR)', type: 'select', value: '25', options: [['16', '/16 (subnet mask 255.255.0.0)'], ['23', '/23 (255.255.254.0)'], ['24', '/24 (255.255.255.0)'], ['25', '/25 (255.255.255.128)'], ['26', '/26 (255.255.255.192)'], ['30', '/30 (255.255.255.252)']], hint: 'The larger the number, the longer the network part, and the fewer devices a network can hold.' },
    { id: 'dest', label: 'Destination to send data to', type: 'select', value: '192.168.0.200', options: [['192.168.0.200', '192.168.0.200'], ['192.168.1.5', '192.168.1.5'], ['10.20.31.7', '10.20.31.7'], ['203.0.113.7', '203.0.113.7 (a server on the internet)']] },
  ],
  presets: [
    { t: 'Default settings', q: 'Are 192.168.0.10 and 192.168.0.200, which share the first three numbers, treated as the same network with /25?', d: 'From 192.168.0.10/25 to 192.168.0.200. The first three numbers are the same, but they are on different networks.', v: { ip: '192.168.0.10', prefix: '25', dest: '192.168.0.200' } },
    { t: 'Changing to /24', q: 'What if you change the length of the network part to /24?', d: 'The same two addresses are now on the same network, so the data is sent directly.', v: { ip: '192.168.0.10', prefix: '24', dest: '192.168.0.200' } },
    { t: 'Different third number, same network', q: 'What if you change the length of the network part to /23 and the destination to 192.168.1.5?', d: 'With /23, 192.168.0.x and 192.168.1.x are one network.', v: { ip: '192.168.0.10', prefix: '23', dest: '192.168.1.5' } },
    { t: 'To a server on the internet', q: 'What if the length of the network part is /24 and the destination is 203.0.113.7, a server on the internet?', d: 'The gateway replaces the source address with a public address (NAT).', v: { ip: '192.168.0.10', prefix: '24', dest: '203.0.113.7' } },
    { t: 'A network of only two devices', q: 'What if the IP address of my PC is 192.168.0.130 and the length of the network part is /30?', d: 'With /30, the host part is 2 bits, so there are 2 usable addresses.', v: { ip: '192.168.0.130', prefix: '30', dest: '192.168.0.200' } },
    { t: 'A big network, /16', q: 'What if the IP address of my PC is 10.20.30.42, the length is /16, and the destination is 10.20.31.7?', d: 'There are 65534 usable addresses.', v: { ip: '10.20.30.42', prefix: '16', dest: '10.20.31.7' } },
  ],
  code: function (c) {
    return '// JavaScript. Paste it into the console of the browser developer tools to run it.\nconst toNumber = ip => ip.split(\'.\').reduce((n, part) => n * 256 + Number(part), 0);   // the address as a 32-bit number\nconst toText = n => [n >>> 24, (n >>> 16) & 255, (n >>> 8) & 255, n & 255].join(\'.\');\n\nconst prefix = ' + c.prefix + ';\nconst mask = (0xFFFFFFFF << (32 - prefix)) >>> 0;                 // subnet mask in which only the first ' + c.prefix + ' bits are 1\nconst network = (toNumber(\'' + c.ip + '\') & mask) >>> 0;' + ' '.repeat(Math.max(1, 22 - c.ip.length)) + '// host part all 0\nconst broadcast = (network | ~mask) >>> 0;                        // host part all 1\n\nconsole.log(toText(mask), toText(network), toText(broadcast));\nconsole.log(2 ** (32 - prefix) - 2);                              // number of usable hosts\n\n// apply the same mask to the destination and see whether the network addresses are the same\nconsole.log(((toNumber(\'' + c.dest + '\') & mask) >>> 0) === network);';
  },
  label: function (c) { return c.ip + '/' + c.prefix + ' → ' + c.dest; },
  columns: ['Network address', 'Broadcast address', 'Usable hosts', 'Same network as the destination?', 'How it is sent'],
  // address text to number, and number to address text
  num: function (ip) { var p = ip.split('.'); return (+p[0]) * 16777216 + (+p[1]) * 65536 + (+p[2]) * 256 + (+p[3]); },
  str: function (n) { return [Math.floor(n / 16777216), Math.floor(n / 65536) % 256, Math.floor(n / 256) % 256, n % 256].join('.'); },
  // the 32 bits as an array of 0s and 1s
  bits: function (n) { var a = [], i; for (i = 0; i < 32; i++) a.push(Math.floor(n / Math.pow(2, 31 - i)) % 2); return a; },
  // binary text. A dot after every 8 bits, and a | between the network part and the host part
  bin: function (n, p) { var b = this.bits(n), s = '', i; for (i = 0; i < 32; i++) { if (i === p) s += ' | '; else if (i && i % 8 === 0) s += '.'; s += b[i]; } return s; },
  // private address ranges (RFC 1918): 10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16
  isPrivate: function (ip) { var p = ip.split('.'), a = +p[0], b = +p[1]; return a === 10 || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168); },
  calc: function (c) {
    var p = +c.prefix, size = Math.pow(2, 32 - p), me = this.num(c.ip), net = Math.floor(me / size) * size, dn = this.num(c.dest), dnet = Math.floor(dn / size) * size;
    return { p: p, h: 32 - p, size: size, me: me, mask: 4294967296 - size, net: net, bc: net + size - 1, hosts: size - 2, first: net + 1, last: net + size - 2, dn: dn, dnet: dnet, same: dnet === net, gw: net + 1, dpriv: this.isPrivate(c.dest) };
  },
  simulate: function (c) {
    var k = this.calc(c), S = this.str, ev = [], sum = [], st = { stage: 0 }, self = this;
    function push(s, kind) { st.stage++; ev.push({ s: s, k: kind || '', snap: JSON.parse(JSON.stringify(st)) }); }
    var netS = S(k.net), bcS = S(k.bc), gwS = S(k.gw), dnetS = S(k.dnet), a3 = c.ip.split('.').slice(0, 3).join('.'), d3 = c.dest.split('.').slice(0, 3).join('.');
    var nat = !k.same && !k.dpriv, route = k.same ? 'Delivered directly' : nat ? 'Passed to the gateway + NAT' : 'Passed to the gateway (no address translation)';
    var pub = '198.51.100.7', other = k.hosts > 2 ? S(k.net + 2 === k.me ? k.net + 3 : k.net + 2) : '';
    push('The address of my PC is ' + c.ip + '/' + k.p + '. An IP address (IPv4) is a 32-bit number, and to make it easy for people to read, it is cut into 8-bit groups and written as four decimal numbers. Written in binary, it is ' + this.bin(k.me, -1) + '.');
    push('/' + k.p + ': This means that the first ' + k.p + ' bits are the network part, also called the network prefix (CIDR notation). The remaining ' + k.h + ' bits are the host part. The number made by filling the network part with 1s and the host part with 0s is the subnet mask, and written in decimal it is ' + S(k.mask) + '.');
    push('Network address: The address made by changing all ' + k.h + ' host-part bits of my address to 0, which is ' + netS + '. It points to the network itself, so it is not given to a device.');
    push('Broadcast address: The address made by changing the host part to all 1s, which is ' + bcS + '. It is used to send to all devices on this network at once, so it too is not given to a device.');
    push('Usable hosts: The host part of ' + k.h + ' bits can make 2 to the power of ' + k.h + ' addresses, which is ' + k.size + '. Subtracting the network address and the broadcast address leaves ' + k.hosts + '. The range is ' + S(k.first) + ' to ' + S(k.last) + '.', k.hosts <= 2 ? 'bad' : '');
    var seem = k.same ? (a3 !== d3 ? ' In decimal, the first three numbers differ, but only the first ' + k.p + ' bits are compared, and that part is the same.' : '') : (a3 === d3 ? ' In decimal, the first three numbers are the same, but what is compared is the first ' + k.p + ' bits, and there is a difference within them.' : '');
    push('Is the destination (' + c.dest + ') on the same network? Apply my subnet mask to the destination address too and keep only the first ' + k.p + ' bits, and the result is ' + dnetS + '. Compared with my network address (' + netS + '), it is ' + (k.same ? 'the same. It is the same network.' : 'different. It is a different network.') + seem, k.same ? 'good' : 'bad');
    if (k.same) push('Because it is the same network, the data is sent directly to the destination without going through the gateway. Within the same network, the MAC address of the other device (the address attached to each network card) is found out, and the data is delivered straight to that device.', 'good');
    else push('Because it is a different network, the data cannot be sent directly. It is handed to the default gateway, the exit of my network (in this example ' + gwS + ', usually a home router or another router). The destination IP address stays as the final destination in the packet, and the gateway is only asked to deliver it.', '');
    if (nat) {
      push('The destination is a public address on the internet, and my address (' + c.ip + ') is a private address. A private address is not routed on the internet, so if the packet were sent out as it is, the response could not come back. So the gateway replaces the source address and port with its own public address before sending it out (NAT): ' + c.ip + ':51000 → ' + pub + ':40001.', '');
      push('The gateway writes the replaced pair in the translation table. When the response from the server comes back addressed to ' + pub + ':40001, it looks at the table, changes the destination back to ' + c.ip + ':51000, and delivers it to my PC.' + (other ? ' Packets sent out by another device on the same network (' + other + ') get a different port, 40002, so several devices can share one public address.' : ' This network has only my PC and the gateway, but even if there were more devices, each would get a different port, and they would share one public address.'), 'good');
    } else if (!k.same) push('The destination is also a private address. In a place where several private networks are connected by routers, such as the internal network of a company, the gateway passes the packet on without changing the address. A private address does not work on the internet, so this destination can be reached only if it is inside the internal network of the same organization.', '');
    if (!k.same && a3 === d3) sum.push('Whether two addresses are on the same network is decided not by the leading decimal numbers but by the first ' + k.p + ' bits that the subnet mask picks out. With a prefix longer than /24 (/25, /26, /30), the networks split even within the last number. If you enter the wrong subnet mask, data that should go to the device right next to you goes to the gateway, or the other way around.');
    if (k.same && a3 !== d3) sum.push('With a prefix shorter than /24 (/23, /16), two addresses can be on the same network even when the third number differs. The judgment is always "is the result of applying the same mask the same?"');
    if (k.same && a3 === d3) sum.push('Devices on the same network do not go through the gateway.');
    if (k.hosts <= 2) sum.push('With /30, the host part is only 2 bits, so only 2 of the 4 addresses can be used. It is used where there are only two devices, such as a link between two routers.');
    if (nat) sum.push('10.0.0.0/8, 172.16.0.0/12, and 192.168.0.0/16 are the private address ranges that anyone can use freely inside their own network. When data goes out to the internet, the gateway lends it a public address with NAT, and because devices are told apart by port number, several devices in a home use the internet through one public address. Conversely, unless you set up the router separately (port forwarding), the internet side cannot start a connection to my PC first, because the translation table has no pair for it.');
    if (!k.same && !nat) sum.push('NAT is needed when data goes from a private address out to a public address. In an internal network where private addresses talk to each other, a router only forwards the data and does not change the addresses.');
    return { events: ev, summary: sum, k: k, nat: nat, other: other, pub: pub, route: route, row: [netS + '/' + k.p, bcS, k.hosts + '', k.same ? 'Same network' : 'Different network', route] };
  },
  render: function (v, sim, t, H, shown) {
    var last = shown[shown.length - 1], n = last ? last.snap.stage : 0, k = sim.k, c = sim.c, S = this.str, self = this;
    if (!n) { H.text(v, 'Click Run to unpack the address into binary and calculate it one step at a time.'); return; }
    var rows = [{ cells: ['My address', c.ip, self.bin(k.me, n >= 2 ? k.p : -1)] }];
    if (n >= 2) rows.push({ cells: ['Subnet mask', S(k.mask), self.bin(k.mask, k.p)] });
    if (n >= 3) rows.push({ cells: ['Network address', { v: S(k.net), cls: 'hot' }, self.bin(k.net, k.p)] });
    if (n >= 4) rows.push({ cells: ['Broadcast address', { v: S(k.bc), cls: 'hot' }, self.bin(k.bc, k.p)] });
    if (n >= 6) rows.push({ cells: ['Destination', c.dest, self.bin(k.dn, k.p)] }, { cells: ['Destination with the mask applied', { v: S(k.dnet), cls: k.same ? 'good' : 'bad' }, self.bin(k.dnet, k.p)] });
    H.table(v, ['What', 'Decimal', 'Binary (network part | host part)'], rows, 'The addresses unpacked into binary');
    H.counters(v, [[n >= 5 ? k.hosts + '' : '?', 'Usable hosts']]);
    var ln = H.lanes(v);
    H.lane(ln, 'Judgment', n < 6 ? 'Not compared yet' : k.same ? 'Same network: ' + S(k.dnet) + ' = ' + S(k.net) : 'Different network: ' + S(k.dnet) + ' ≠ ' + S(k.net), n < 6 ? 'none' : k.same ? 'good' : 'wait');
    if (sim.nat && n >= 8) {
      var nr = [{ cells: [c.ip + ':51000', sim.pub + ':40001', c.dest + ':443'] }];
      if (n >= 9 && sim.other) nr.push({ cells: [sim.other + ':51000', sim.pub + ':40002', c.dest + ':443'] });
      H.table(v, ['Inside (private address:port)', 'Outside (public address:port)', 'Peer'], nr, 'NAT translation table of the gateway');
    }
  },
  // Diagram: at the top, the 32 bits of my address are split into the network part (blue) and the host part (yellow), and below are my PC, the gateway, the destination, and the path the data takes.
  draw: function (P, sim, shown) {
    var last = shown[shown.length - 1], n = last ? last.snap.stage : 0, k = sim.k, c = sim.c, S = this.str, b = this.bits(k.me), i;
    P.size(680, 336);
    P.text('bt', 16, 28, n ? '32 bits of my address ' + c.ip : '32 bits of my address (filled in when you click Run)', { bold: true });
    for (i = 0; i < 32; i++) P.box('b' + i, 16 + i * 20 + Math.floor(i / 8) * 3, 38, 18, 26, { cls: !n ? 'ghost' : n < 2 ? 'plain' : i < k.p ? 'wait' : 'hot', title: n ? String(n === 4 && i >= k.p ? 1 : n === 3 && i >= k.p ? 0 : b[i]) : '', center: true });
    if (n >= 2) { P.text('tn', 16, 82, 'Network part ' + k.p + ' bits (blue)', { cls: 'mut' }); P.text('th', 664, 82, (n === 3 ? 'Host part all 0 → network address' : n === 4 ? 'Host part all 1 → broadcast address' : 'Host part ' + k.h + ' bits (yellow)'), { cls: 'mut', anchor: 'end' }); }
    P.region('net', 8, 98, 436, 172, n >= 3 ? 'My network ' + S(k.net) + '/' + k.p : 'My network');
    P.box('me', 22, 128, 190, 52, { cls: 'wait', title: 'My PC', sub: c.ip });
    P.box('gw', 240, 204, 190, 52, { cls: n >= 7 && !k.same ? 'hot' : 'plain', title: 'Gateway (router)', sub: n >= 3 ? S(k.gw) : '' });
    var inside = n >= 6 && k.same;
    P.box('dst', inside ? 240 : 474, 128, 190, 52, { cls: n < 6 ? 'plain' : k.same ? 'good' : 'bad', title: 'Destination', sub: c.dest });
    if (n >= 7 && k.same) P.arrow('send', 'me:r', 'dst:l', { cls: 'good', label: 'Direct' });
    if (n >= 7 && !k.same) { P.arrow('send', 'me:b', 'gw:l', { cls: 'hot', label: 'Handed off' }); P.arrow('fwd', 'gw:r', 'dst:b', { cls: sim.nat && n >= 8 ? 'hot' : '', label: sim.nat && n >= 8 ? 'Forwarded with the address changed by NAT' : 'Forwarded' }); }
    P.box('res', 16, 286, 648, 34, { cls: n < 7 ? 'ghost' : k.same ? 'good' : 'hot', title: 'How it is sent', right: n < 7 ? (n >= 6 ? (k.same ? 'Same network' : 'Different network') : 'Not decided yet') : sim.route });
    P.note('The blue cells are the network part and the yellow cells are the host part. In this example, the address of the gateway is set to the first address of the network.');
  },
  assume: 'The network address, the broadcast address, the number of usable hosts, and the judgment of whether two addresses are on the same network were recalculated and checked for all 72 combinations. Three methods different from the model were used for the check: the values from running the bit-operation code shown on the screen on Node.js 24, the values obtained by cutting and joining a 32-character binary string, and the two ends and the count of the range found by putting my address and the length into net.BlockList in Node.js and asking about the addresses one by one. The rule "if the results of applying the same mask are the same, send directly; if not, send to the gateway" follows RFC 1122 section 3.3.1.1, and the private address ranges follow RFC 1918 section 3. NAT was not verified by execution on the PC used to write this lab; it was written following the address and port translation (NAPT) described in RFC 3022 (sections 2.2 and 4.1). The public address 198.51.100.7, the ports 40001 and 40002, and placing the gateway at the first address of the network are examples for explanation. A destination that is a private address is assumed to be in the internal network of the same organization. 203.0.113.7 is an address reserved for documentation, and it is used here as an example of a public address. Prefix lengths such as /31 and /32, for which the rule "subtract 2 addresses" does not hold (RFC 3021), and IPv6 are not covered.',
});

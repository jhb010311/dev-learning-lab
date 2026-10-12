Lab.register({
  id: 'routing', nav: 'Switches and routers', cat: 'Networking', mode: 'step',
  title: 'If the destination IP is the server, why is the frame sent to the router\'s MAC address?',
  intro: 'A frame for a device on the same network is sent directly to that device\'s MAC address, and a switch uses that address to deliver it. A device on another network cannot be reached directly, so the sender hands the frame to its gateway (a router). Each time the packet passes a router, the MAC addresses in the frame are written anew, but the IP addresses stay the same and the TTL goes down by 1.',
  terms: ['MAC address and ARP', 'Switch and router', 'Default gateway', 'TTL of an IP packet', 'OSI model'],
  controls: [
    { id: 'dst', label: 'Where PC A (192.168.1.10) sends the packet', type: 'select', value: 'c', options: [['b', 'PC B on the same network (192.168.1.20)'], ['c', 'Server C, one router away (192.168.2.30)'], ['d', 'Server D, two routers away (192.168.3.40)']] },
    { id: 'ttl', label: 'Initial TTL of the packet', type: 'select', value: '64', options: [['64', '64 (a common default)'], ['2', '2'], ['1', '1']] },
    { id: 'arp', label: 'The devices already know the MAC addresses they need (ARP cache)', type: 'check', value: false },
  ],
  presets: [
    { t: 'Default settings', q: 'When PC A sends a packet to Server C (192.168.2.30), one router away, whose MAC address is the destination MAC of the first frame?', d: 'Sends to Server C. The destination IP is Server C, but the destination MAC of the first frame is the router.', v: { dst: 'c', ttl: '64', arp: false } },
    { t: 'Within the same network', q: 'What if PC A sends the packet to PC B on the same network (192.168.1.20)?', d: 'The frame is delivered by MAC address alone, without passing a router.', v: { dst: 'b', ttl: '64', arp: false } },
    { t: 'Across two routers', q: 'What if PC A sends the packet to Server D, two routers away (192.168.3.40)?', d: 'The MAC addresses change twice and the TTL goes down by 2.', v: { dst: 'd', ttl: '64', arp: false } },
    { t: 'Not enough TTL', q: 'What if the packet goes to Server D, two routers away, and the initial TTL is 2?', d: 'With an initial TTL of 2, the packet is discarded at the second router.', v: { dst: 'd', ttl: '2', arp: false } },
    { t: 'TTL 1 on the same network', q: 'What if the packet goes to PC B on the same network and the initial TTL is 1?', d: 'The packet passes no router, so it arrives even with a TTL of 1.', v: { dst: 'b', ttl: '1', arp: false } },
    { t: 'MAC addresses already known', q: 'What if the devices already know the MAC addresses they need (ARP cache)?', d: 'The frame is sent right away, with no ARP request.', v: { dst: 'c', ttl: '64', arp: true } },
  ],
  DEV: { A: { name: 'PC A', ip: '192.168.1.10' }, B: { name: 'PC B', ip: '192.168.1.20' }, C: { name: 'Server C', ip: '192.168.2.30' }, D: { name: 'Server D', ip: '192.168.3.40' }, R1: { name: 'Router R1' }, R2: { name: 'Router R2' } },
  // The hops that each destination goes through. sm and dm are the source MAC and the destination MAC of the frame on that hop (last two digits), and ask is the IP address asked about with ARP on that hop.
  HOPS: {
    b: [{ f: 'A', t: 'B', sm: '0A', dm: '0B', ask: '192.168.1.20', net: 'A' }],
    c: [{ f: 'A', t: 'R1', sm: '0A', dm: '11', ask: '192.168.1.1', net: 'A' }, { f: 'R1', t: 'C', sm: '12', dm: '0C', ask: '192.168.2.30', net: 'B' }],
    d: [{ f: 'A', t: 'R1', sm: '0A', dm: '11', ask: '192.168.1.1', net: 'A' }, { f: 'R1', t: 'R2', sm: '12', dm: '21', ask: '192.168.2.2', net: 'B' }, { f: 'R2', t: 'D', sm: '22', dm: '0D', ask: '192.168.3.40', net: 'C' }],
  },
  code: function (c) {
    var to = this.DEV[c.dst.toUpperCase()];
    return '// Network settings of PC A\nconst me      = \'192.168.1.10\';\nconst mask    = \'255.255.255.0\';   // the first three numbers, where the mask is 255, identify the network\nconst gateway = \'192.168.1.1\';     // the door to other networks (router R1)\n\n// The IP packet to send\nconst packet = { from: \'192.168.1.10\', to: \'' + to.ip + '\', ttl: ' + c.ttl + ' };   // sent to ' + to.name + '\n\n// Rule of the sending computer: whose MAC address should this frame be sent to?\nconst nextHop = sameNetwork(me, packet.to, mask) ? packet.to : gateway;\nconst frame = { toMac: arp(nextHop), fromMac: myMac, payload: packet };\n\n// Rule of a router: when it receives a packet that is going somewhere else\npacket.ttl -= 1;\nif (packet.ttl === 0) discardAndReportTimeExceeded(packet);   // discard it and tell the sender\nelse forwardInNewFrame(packet);    // write only new MAC addresses and send it on to the next hop. The IP addresses stay the same';
  },
  label: function (c) { return this.DEV[c.dst.toUpperCase()].name + ' · initial TTL ' + c.ttl + ' · ARP cache: ' + (c.arp ? 'filled' : 'empty'); },
  columns: ['Decision of the sender', 'Destination MAC of the first frame', 'ARP requests', 'Result at arrival', 'Times the MAC addresses changed'],
  simulate: function (c) {
    var D = this.DEV, hops = this.HOPS[c.dst], to = D[c.dst.toUpperCase()], ttl0 = +c.ttl, ttl = ttl0, cached = !!c.arp, ev = [], sum = [], frames = [], self = this;
    var st = { at: '', seen: [], frames: [], arpTab: [], arpN: 0, arp: null, sw: false, ttl: ttl0, end: '', endAt: '' };
    var mac = function (x) { return '…:' + x; }, full = function (x) { return '00:00:5E:00:53:' + x; };
    function push(s, k) { ev.push({ s: s, k: k, snap: JSON.parse(JSON.stringify(st)) }); st.arp = null; }
    function learn(h) { st.arpTab.push({ dev: D[h.f].name, ip: h.ask, mac: full(h.dm), old: cached }); }
    var direct = c.dst === 'b';
    st.at = 'A'; st.seen.push('A');
    push('Decision of PC A: it compares the destination IP ' + to.ip + ' with its own IP 192.168.1.10 using the subnet mask 255.255.255.0. ' + (direct ? 'The first three numbers, where the mask is 255, are the same in both (192.168.1), so they are on the same network. PC A decides to send directly to PC B without going through a router.' : 'The first three numbers, where the mask is 255, differ (PC A is on 192.168.1 and the destination is on 192.168.' + (c.dst === 'c' ? 2 : 3) + '), so they are on different networks. PC A cannot reach it directly, so it decides to hand the packet to the default gateway in its settings, 192.168.1.1 (router R1).'), '');
    for (var i = 0; i < hops.length; i++) {
      var h = hops[i], fn = D[h.f].name, tn = D[h.t].name, last = i === hops.length - 1;
      if (i > 0) {
        st.at = h.f; st.seen.push(h.f); st.sw = false;
        push(fn + ' receives it: the destination MAC address of the frame is its own, so it accepts the frame and removes the outer part that holds the MAC addresses. The destination IP of the IP packet inside (' + to.ip + ') is not its own address. This is a packet that has to be forwarded elsewhere.' + (i === 1 ? ' A switch passes frames on by looking only at the MAC address, but a router looks at the IP address like this to choose the path.' : ''), '');
        if (ttl - 1 <= 0) {
          ttl = 0; st.ttl = 0; st.end = 'drop'; st.endAt = h.f;
          push(fn + ' handles the TTL: before forwarding, it decreases the TTL by 1, but the current value is 1, so it would become 0. A packet whose TTL reaches 0 is not forwarded any further and is discarded. The router also sends an ICMP "Time Exceeded" message back to the sender (192.168.1.10). The packet did not get as far as ' + to.name + '.', 'bad');
          break;
        }
        ttl -= 1; st.ttl = ttl;
        push(fn + ' handles the TTL: before forwarding, it decreases the TTL by 1 (' + (ttl + 1) + ' → ' + ttl + ').' + (i === 1 ? ' The TTL is a limit on the number of routers a packet can pass. Even if a wrong path setting makes a packet circle between routers, the TTL eventually reaches 0 and the packet disappears.' : ' It goes down by 1 each time the packet passes a router.'), '');
        var route = last ? 'In its routing table, the router finds that 192.168.' + (h.net === 'B' ? 2 : 3) + '.0/24, which contains the destination IP, is network ' + h.net + ', directly connected to this router. It can hand the packet straight to ' + tn + '.' : 'In its routing table, the router finds that packets for 192.168.3.0/24 are to be handed to 192.168.2.2 (router R2).';
        learn(h);
        if (cached) push(fn + ' finds the way: ' + route + ' The MAC address of ' + h.ask + ' (' + mac(h.dm) + ') is already in the ARP cache.', '');
        else { st.arpN++; st.arp = { f: h.f, t: h.t, kind: 'both' }; push(fn + ' finds the way and uses ARP: ' + route + ' It sends an ARP request on network ' + h.net + ' to find the MAC address of ' + h.ask + ' (' + mac(h.dm) + ').', ''); }
      } else if (cached) {
        learn(h);
        push('ARP cache of PC A: to send a frame, it needs the MAC address of the device that will take the frame over. The MAC address of ' + h.ask + ' (' + full(h.dm) + ') is already written in the cache. This means PC A communicated with it a short while ago. It builds the frame right away, without an ARP request.', '');
      } else {
        st.arpN++; st.arp = { f: 'A', t: h.t, kind: 'req' };
        push('ARP request from PC A: to send a frame, it needs the MAC address of the device that will take the frame over, but PC A does not know the MAC address of ' + h.ask + ' yet. It sends an ARP request that says "Whoever owns IP address ' + h.ask + ', tell me your MAC address," with the destination MAC set to "everyone" (broadcast). The switch sends it out to every device on network A.' + (direct ? '' : ' The IP address being asked about is not that of ' + to.name + ' but that of the gateway. An ARP request cannot cross a router, so the MAC address of a device on another network cannot be found, and there is no need to find it.'), '');
        learn(h); st.arp = { f: h.t, t: 'A', kind: 'rep' };
        push('ARP reply: only ' + tn + ', the owner of that IP address, answers PC A. The content of the answer is "My MAC address is ' + full(h.dm) + '." ' + (direct ? 'Router R1' : 'PC B') + ' also received the request, but it does not answer because the IP address is not its own. PC A writes the address it found in its ARP cache and does not ask again for a while.', '');
      }
      st.frames.push({ seg: fn + ' → ' + tn, f: h.f, t: h.t, sm: h.sm, dm: h.dm, sip: '192.168.1.10', dip: to.ip, ttl: ttl });
      frames.push(h.f + '>' + h.t + ' ' + h.sm + '>' + h.dm + ' ttl' + ttl);
      if (i === 0) {
        push('PC A sends the frame: in the frame header it writes the destination MAC ' + mac(h.dm) + ' (' + tn + ') and the source MAC ' + mac(h.sm) + ' (PC A), and inside the frame it puts the IP packet (source IP 192.168.1.10, destination IP ' + to.ip + ', TTL ' + ttl + ').' + (direct ? ' The destination IP and the destination MAC both point to PC B.' : ' The destination IP is that of ' + to.name + ', but the destination MAC is that of router R1. The IP address points to the final recipient, and the MAC address points to the device that takes the frame over on this hop.'), direct ? '' : 'good');
        st.sw = true; st.at = 'SW'; st.seen.push('SW');
        push('Switch: it looks only at the destination MAC address of the frame and sends it out only through the port to which that device (' + tn + ') is connected. It does not open the IP packet inside, and it does not modify the frame.' + (direct ? ' Delivery within one network ends here, using the MAC address alone.' : ''), '');
      } else {
        push(fn + ' forwards it: it puts the same IP packet in a new frame. In the frame header, both addresses have changed: the destination MAC is ' + mac(h.dm) + ' (' + tn + ') and the source MAC is ' + mac(h.sm) + ' (' + h.f + ', network ' + h.net + ' side). The source IP 192.168.1.10 and the destination IP ' + to.ip + ' inside are unchanged, and only the TTL is now ' + ttl + '.', 'good');
      }
      if (last) {
        st.at = h.t; st.seen.push(h.t); st.end = 'ok'; st.endAt = h.t; st.sw = false;
        var routers = hops.length - 1;
        push(tn + ' receives it: the destination MAC address of the frame is its own, and the destination IP of the packet inside is its own address too. The packet has arrived. The TTL on arrival is ' + ttl + '.' + (routers === 0 ? ' The packet did not pass a router, so the TTL is still the initial value.' : ' After passing ' + routers + (routers === 1 ? ' router' : ' routers') + ', the TTL went down by ' + routers + ' from the initial value ' + ttl0 + '.') + (ttl === 1 && routers > 0 ? ' A receiving computer accepts a packet even if its TTL is 1. Decreasing the TTL and checking whether it reached 0 is the job of the routers that forward the packet.' : ''), 'good');
      }
    }
    var ok = st.end === 'ok', changed = frames.length - 1;
    if (!ok) sum.push('The TTL reached 0 at ' + D[st.endAt].name + ' and the packet was discarded. To reach ' + to.name + ', the packet has to pass ' + (hops.length - 1) + (hops.length === 2 ? ' router' : ' routers') + ', so the initial TTL must be at least ' + hops.length + '.');
    if (direct) sum.push('Within the same network, the sender finds the MAC address of the receiving device with ARP and sends to it directly. The switch forwards by MAC address only and no router is involved, so the TTL does not go down either.' + (ttl0 === 1 ? ' That is why the packet arrives even with a TTL of 1.' : ''));
    else sum.push('When sending to another network, what PC A asks about with ARP is not the receiving device but the MAC address of the gateway. This is why, if the default gateway setting is wrong, communication works inside the same network but cannot get out.');
    if (changed > 0) sum.push('Each router the packet passed built a new frame, so the MAC addresses changed ' + changed + (changed === 1 ? ' time' : ' times') + '. The source IP and the destination IP stayed the same from start to finish. A MAC address is used only within one hop, and an IP address is used all the way from the source to the destination.');
    if (!ok) sum.push('The tool that makes use of the fact that the router that discards a packet sends back "Time Exceeded" is traceroute (tracert on Windows). It sends packets with the TTL raised to 1, 2, 3, and so on, and writes down the routers that responded, in order, to find the path.');
    if (!cached && ok && !direct) sum.push('ARP requests: one on each hop, ' + st.arpN + ' in total. A MAC address that has been found stays in the cache, so the packets that follow are sent without asking.');
    return { events: ev, summary: sum, frames: frames.join('; '),
      row: [direct ? 'Same network: sent directly' : 'Other network: sent to the gateway', D[hops[0].t].name + ' (' + mac(hops[0].dm) + ')', st.arpN + '', ok ? 'Arrived (TTL ' + ttl + ')' : 'Dropped at ' + D[st.endAt].name + ' (TTL 0)', changed + ''] };
  },
  render: function (v, sim, t, H, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : null;
    if (!s) { H.text(v, 'Click Run to go through the steps one at a time, starting from the decision made by PC A.'); return; }
    H.counters(v, [[s.arpN + '', 'ARP requests'], [s.frames.length + '', 'Frames built']]);
    if (s.frames.length) H.table(v, ['Hop', 'Source MAC', 'Destination MAC', 'Source IP', 'Destination IP', 'TTL'], s.frames.map(function (f, k) { var cur = k === s.frames.length - 1; return { cells: [f.seg, { v: '…:' + f.sm, cls: cur ? 'hot' : '' }, { v: '…:' + f.dm, cls: cur ? 'hot' : '' }, f.sip, f.dip, String(f.ttl)] }; }), 'Frame on each hop (the MAC addresses change and the IP addresses stay the same. Only the last two digits of each MAC address are shown)');
    else H.text(v, 'No frame has been sent yet.');
    if (s.arpTab.length) H.table(v, ['Device', 'IP address', 'MAC address'], s.arpTab.map(function (a) { return { cells: [a.dev, a.ip, a.mac + (a.old ? ' (already known)' : '')] }; }), 'ARP cache (MAC addresses found from IP addresses)');
    if (s.end === 'drop') H.text(v, 'The TTL reached 0 and the packet was discarded. The router sends an ICMP "Time Exceeded" message back to the sender.');
  },
  // Diagram: from the left, network A (PC A, PC B, switch), router R1, network B (server C), router R2, and network C (server D). The arrows are the hops the frame has passed, and the two boxes at the bottom are the frame header (MAC addresses) and the IP packet inside it (IP addresses, TTL) of the current frame.
  draw: function (P, sim, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : { at: '', seen: [], frames: [], arpTab: [], arpN: 0, arp: null, sw: false, ttl: +sim.c.ttl, end: '', endAt: '' };
    function cls(id) { if (s.end && s.endAt === id) return (s.end === 'ok' ? 'good' : 'bad') + ' now'; if (s.at === id) return 'hot now'; return s.seen.indexOf(id) >= 0 ? 'wait' : 'plain'; }
    P.size(680, 330);
    P.region('na', 16, 16, 222, 196, 'Network A 192.168.1.0/24');
    P.region('nb', 334, 16, 130, 196, 'Network B');
    P.region('nc', 550, 16, 114, 196, 'Network C');
    P.text('nbt', 399, 200, '192.168.2.0/24', { cls: 'mut', anchor: 'middle' });
    P.text('nct', 607, 200, '192.168.3.0/24', { cls: 'mut', anchor: 'middle' });
    P.box('A', 24, 48, 106, 50, { cls: cls('A'), title: 'PC A', sub: '192.168.1.10' });
    P.box('B', 24, 146, 106, 50, { cls: cls('B'), title: 'PC B', sub: '192.168.1.20' });
    P.box('SW', 152, 97, 76, 50, { cls: cls('SW'), title: 'Switch', sub: 'MAC only' });
    P.box('R1', 250, 97, 72, 50, { cls: cls('R1'), title: 'R1', sub: 'Router' });
    P.box('C', 343, 44, 112, 50, { cls: cls('C'), title: 'Server C', sub: '192.168.2.30' });
    P.box('R2', 476, 97, 64, 50, { cls: cls('R2'), title: 'R2', sub: 'Router' });
    P.box('D', 554, 97, 106, 50, { cls: cls('D'), title: 'Server D', sub: '192.168.3.40' });
    var ends = { 'A>SW': ['A:r', 'SW:l'], 'SW>B': ['SW:l:0.8', 'B:r'], 'SW>R1': ['SW:r', 'R1:l'], 'R1>C': ['R1:r:0.25', 'C:b'], 'R1>R2': ['R1:r:0.6', 'R2:l:0.6'], 'R2>D': ['R2:r', 'D:l'] };
    s.frames.forEach(function (f, k) {
      var cur = k === s.frames.length - 1 && !s.end, lab = '…:' + f.sm + ' → …:' + f.dm;
      if (k === 0) {
        P.arrow('h0a', ends['A>SW'][0], ends['A>SW'][1], { cls: cur ? 'hot' : 'mut' });
        if (s.seen.indexOf('SW') >= 0) { var e = ends['SW>' + f.t]; P.arrow('h0b', e[0], e[1], { cls: cur ? 'hot' : 'mut' }); }
      } else { var g = ends[f.f + '>' + f.t]; P.arrow('h' + k, g[0], g[1], { cls: cur ? 'hot' : 'mut' }); }
    });
    if (s.arp) {
      if (s.arp.kind === 'req') { P.arrow('q2', 'A:r:0.8', 'SW:t', { cls: 'dash' }); P.arrow('q1', 'SW:b', 'B:r:0.2', { cls: 'dash' }); P.arrow('q3', 'SW:t:0.8', 'R1:t', { cls: 'dash' }); P.text('qt', 190, 64, 'ARP request', { anchor: 'middle' }); }
      else if (s.arp.kind === 'rep') { if (s.arp.f === 'B') P.arrow('q1', 'B:r:0.2', 'SW:b', { cls: 'dash' }); else P.arrow('q3', 'R1:t', 'SW:t:0.8', { cls: 'dash' }); P.arrow('q2', 'SW:t', 'A:r:0.8', { cls: 'dash' }); P.text('qt', 190, 64, 'ARP reply', { anchor: 'middle' }); }
      else { var a = ends[s.arp.f + '>' + s.arp.t]; P.arrow('q1', a[0], a[1], { cls: 'dash', label: 'ARP' }); }
    }
    var f = s.frames[s.frames.length - 1], to = this.DEV[sim.c.dst.toUpperCase()];
    P.box('fr', 16, 228, 648, 40, { cls: f ? 'hot' : 'ghost', title: 'Frame header (rewritten on each hop)', right: f ? 'Source MAC …:' + f.sm + ' → destination MAC …:' + f.dm : 'None yet' });
    P.box('ip', 16, 276, 648, 40, { cls: s.end === 'drop' ? 'bad' : s.end === 'ok' ? 'good' : 'wait', title: 'IP packet (unchanged to the end)', right: '192.168.1.10 → ' + to.ip + ' · TTL ' + s.ttl + (s.end === 'drop' ? ' · discarded' : '') });
    P.note('Solid arrows show the hops the frame has passed, and dotted arrows show ARP. Only the last two digits of each MAC address are shown (the leading part is 00:00:5E:00:53 in all of them). A router has one IP address and one MAC address for each network it connects to. R1 has 192.168.1.1 (…:11) on the network A side and 192.168.2.1 (…:12) on the network B side, and R2 has 192.168.2.2 (…:21) on the network B side and 192.168.3.1 (…:22) on the network C side.');
  },
  assume: 'This is a conceptual model that puts the rules of the standards documents into code, not the result of running real equipment. This one PC cannot build a path through a switch and two routers, so it could not be checked by execution. Instead, the results of the model were checked against a calculation that applies the same rules in a different way (each device holds an IP address, a mask, a routing table, and an ARP table, and the packet is handed from device to device) in 18 combinations. The documents used as the basis: that the sending computer uses the mask to decide whether the destination is on the same network and then sends directly or via the gateway is Section 3.3.1.1 of RFC 1122; ARP, which finds a MAC address from an IP address, is RFC 826; the meaning of TTL is Section 3.2 of RFC 791; that a router decreases the TTL when it forwards a packet, discards the packet when it reaches 0, and sends an ICMP Time Exceeded message is Section 5.3.1 of RFC 1812 and RFC 792; and that a receiving computer accepts a packet even if its TTL is small is Section 3.2.1.7 of RFC 1122. The way a switch forwards by MAC address is what IEEE 802.1D describes. Simplifications: networks B and C also have switches, but they are not drawn; how a switch learns which MAC address is behind which port, the router recalculating the checksum of the IP header after it decreases the TTL, and network address translation (NAT) are not covered. When a packet passes a home router, the source IP address also changes because of NAT. The IP addresses are in the private range (192.168.x.x), and the MAC addresses are values from the range reserved for documentation (RFC 7042, now RFC 9542), not addresses of real devices. The initial TTL differs from one operating system to another.',
});

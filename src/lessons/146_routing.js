Lab.register({
  id: 'routing', nav: '스위치와 라우터', cat: '네트워크', mode: 'step',
  title: '받는 IP는 서버인데 왜 라우터의 MAC 주소로 보내나',
  intro: '같은 네트워크 안의 기기에게는 그 기기의 MAC 주소로 직접 보내고, 스위치가 그 주소를 보고 전달합니다. 다른 네트워크의 기기에게는 직접 닿을 수 없으므로 게이트웨이(라우터)에게 맡깁니다. 라우터를 하나 지날 때마다 프레임의 MAC 주소는 새로 쓰이지만 IP 주소는 그대로이고, TTL은 1씩 줄어듭니다.',
  terms: ['MAC 주소와 ARP', '스위치와 라우터', '기본 게이트웨이', 'IP 패킷의 TTL', 'OSI 7계층'],
  controls: [
    { id: 'dst', label: 'PC A(192.168.1.10)가 패킷을 보내는 곳', type: 'select', value: 'c', options: [['b', '같은 네트워크의 PC B (192.168.1.20)'], ['c', '라우터 하나 건너의 서버 C (192.168.2.30)'], ['d', '라우터 둘 건너의 서버 D (192.168.3.40)']] },
    { id: 'ttl', label: '패킷의 처음 TTL', type: 'select', value: '64', options: [['64', '64 (흔히 쓰는 기본값)'], ['2', '2'], ['1', '1']] },
    { id: 'arp', label: '기기들이 필요한 MAC 주소를 이미 알고 있다 (ARP 캐시)', type: 'check', value: false },
  ],
  presets: [
    { t: '처음 설정으로', d: '서버 C에게 보냅니다. 받는 IP는 서버 C인데 첫 프레임의 받는 MAC은 라우터입니다.', v: { dst: 'c', ttl: '64', arp: false } },
    { t: '같은 네트워크 안에서', d: '라우터를 거치지 않고 MAC 주소만으로 전달됩니다.', v: { dst: 'b', ttl: '64', arp: false } },
    { t: '라우터 둘을 건너', d: 'MAC 주소는 두 번 바뀌고 TTL은 2 줄어듭니다.', v: { dst: 'd', ttl: '64', arp: false } },
    { t: 'TTL이 모자라면', d: '처음 TTL이 2면 둘째 라우터에서 버려집니다.', v: { dst: 'd', ttl: '2', arp: false } },
    { t: 'TTL 1로 같은 네트워크에', d: '라우터를 지나지 않으므로 TTL 1로도 도착합니다.', v: { dst: 'b', ttl: '1', arp: false } },
    { t: 'MAC 주소를 이미 알면', d: 'ARP 요청 없이 바로 보냅니다.', v: { dst: 'c', ttl: '64', arp: true } },
  ],
  DEV: { A: { name: 'PC A', ip: '192.168.1.10' }, B: { name: 'PC B', ip: '192.168.1.20' }, C: { name: '서버 C', ip: '192.168.2.30' }, D: { name: '서버 D', ip: '192.168.3.40' }, R1: { name: '라우터 R1' }, R2: { name: '라우터 R2' } },
  // 받는 쪽마다 거치는 구간. sm과 dm은 그 구간 프레임의 보내는 MAC과 받는 MAC(끝 두 자리), ask는 그 구간에서 ARP로 묻는 IP 주소.
  HOPS: {
    b: [{ f: 'A', t: 'B', sm: '0A', dm: '0B', ask: '192.168.1.20', net: 'A' }],
    c: [{ f: 'A', t: 'R1', sm: '0A', dm: '11', ask: '192.168.1.1', net: 'A' }, { f: 'R1', t: 'C', sm: '12', dm: '0C', ask: '192.168.2.30', net: 'B' }],
    d: [{ f: 'A', t: 'R1', sm: '0A', dm: '11', ask: '192.168.1.1', net: 'A' }, { f: 'R1', t: 'R2', sm: '12', dm: '21', ask: '192.168.2.2', net: 'B' }, { f: 'R2', t: 'D', sm: '22', dm: '0D', ask: '192.168.3.40', net: 'C' }],
  },
  code: function (c) {
    var to = this.DEV[c.dst.toUpperCase()];
    return '// PC A의 네트워크 설정\nconst me      = \'192.168.1.10\';\nconst mask    = \'255.255.255.0\';   // 255인 앞의 세 칸이 네트워크를 나타낸다\nconst gateway = \'192.168.1.1\';     // 다른 네트워크로 나가는 문 (라우터 R1)\n\n// 보내려는 IP 패킷\nconst packet = { from: \'192.168.1.10\', to: \'' + to.ip + '\', ttl: ' + c.ttl + ' };   // ' + to.name + '에게\n\n// 보내는 컴퓨터의 규칙: 이번 프레임을 누구의 MAC 주소로 보낼까\nconst nextHop = sameNetwork(me, packet.to, mask) ? packet.to : gateway;\nconst frame = { toMac: arp(nextHop), fromMac: myMac, payload: packet };\n\n// 라우터의 규칙: 다른 곳으로 가는 패킷을 받으면\npacket.ttl -= 1;\nif (packet.ttl === 0) discardAndReportTimeExceeded(packet);   // 버리고 보낸 쪽에 알린다\nelse forwardInNewFrame(packet);    // MAC 주소만 새로 써서 다음 구간으로. IP 주소는 그대로';
  },
  label: function (c) { return this.DEV[c.dst.toUpperCase()].name + '에게 · 처음 TTL ' + c.ttl + ' · ARP 캐시 ' + (c.arp ? '있음' : '비어 있음'); },
  columns: ['보내는 쪽의 판단', '첫 프레임의 받는 MAC', 'ARP 요청', '도착 결과', 'MAC 주소가 바뀐 횟수'],
  simulate: function (c) {
    var D = this.DEV, hops = this.HOPS[c.dst], to = D[c.dst.toUpperCase()], ttl0 = +c.ttl, ttl = ttl0, cached = !!c.arp, ev = [], sum = [], frames = [], self = this;
    var st = { at: '', seen: [], frames: [], arpTab: [], arpN: 0, arp: null, sw: false, ttl: ttl0, end: '', endAt: '' };
    var mac = function (x) { return '…:' + x; }, full = function (x) { return '00:00:5E:00:53:' + x; };
    function push(s, k) { ev.push({ s: s, k: k, snap: JSON.parse(JSON.stringify(st)) }); st.arp = null; }
    function learn(h) { st.arpTab.push({ dev: D[h.f].name, ip: h.ask, mac: full(h.dm), old: cached }); }
    var direct = c.dst === 'b';
    st.at = 'A'; st.seen.push('A');
    push('PC A의 판단: 받는 IP ' + to.ip + '과 자기 IP 192.168.1.10을 서브넷 마스크 255.255.255.0으로 견줍니다. ' + (direct ? '마스크가 255인 앞의 세 칸이 둘 다 192.168.1로 같으므로 같은 네트워크입니다. 라우터를 거치지 않고 PC B에게 직접 보내기로 합니다.' : '마스크가 255인 앞의 세 칸이 서로 다르므로(PC A는 192.168.1, 받는 쪽은 192.168.' + (c.dst === 'c' ? 2 : 3) + ') 다른 네트워크입니다. PC A가 직접 닿을 수 없는 곳이므로, 설정에 적힌 기본 게이트웨이 192.168.1.1(라우터 R1)에게 맡기기로 합니다.'), '');
    for (var i = 0; i < hops.length; i++) {
      var h = hops[i], fn = D[h.f].name, tn = D[h.t].name, last = i === hops.length - 1;
      if (i > 0) {
        st.at = h.f; st.seen.push(h.f); st.sw = false;
        push(fn + '의 수신: 프레임의 받는 MAC 주소가 자기 것이므로 받아들이고, MAC 주소가 적힌 겉을 벗겨 냅니다. 안에 든 IP 패킷의 받는 IP(' + to.ip + ')는 자기 주소가 아닙니다. 다른 곳으로 전달해야 할 패킷입니다.' + (i === 1 ? ' 스위치는 MAC 주소만 보고 넘기지만, 라우터는 이렇게 IP 주소를 보고 길을 정합니다.' : ''), '');
        if (ttl - 1 <= 0) {
          ttl = 0; st.ttl = 0; st.end = 'drop'; st.endAt = h.f;
          push(fn + '의 TTL 처리: 전달하기 전에 TTL을 1 줄이는데, 지금 값이 1이라서 줄이면 0이 됩니다. TTL이 0이 된 패킷은 더 전달하지 않고 버립니다. 그리고 보낸 쪽(192.168.1.10)에게 "시간 초과"를 알리는 ICMP 메시지를 돌려보냅니다. 패킷은 ' + to.name + '까지 가지 못했습니다.', 'bad');
          break;
        }
        ttl -= 1; st.ttl = ttl;
        push(fn + '의 TTL 처리: 전달하기 전에 TTL을 1 줄입니다(' + (ttl + 1) + ' → ' + ttl + ').' + (i === 1 ? ' TTL은 패킷이 지날 수 있는 라우터 수의 한도입니다. 길이 잘못 설정돼 패킷이 라우터 사이를 맴돌더라도 언젠가 0이 되어 사라지게 하는 장치입니다.' : ' 라우터를 지날 때마다 1씩 줄어듭니다.'), '');
        var route = last ? '라우팅 표를 보니 받는 IP가 속한 192.168.' + (h.net === 'B' ? 2 : 3) + '.0/24는 이 라우터에 직접 연결된 네트워크 ' + h.net + '입니다. ' + tn + '에게 바로 건넬 수 있습니다.' : '라우팅 표를 보니 192.168.3.0/24로 가는 패킷은 192.168.2.2(라우터 R2)에게 넘기라고 적혀 있습니다.';
        learn(h);
        if (cached) push(fn + '의 길 찾기: ' + route + ' ' + h.ask + '의 MAC 주소(' + mac(h.dm) + ')는 ARP 캐시에 이미 있습니다.', '');
        else { st.arpN++; st.arp = { f: h.f, t: h.t, kind: 'both' }; push(fn + '의 길 찾기와 ARP: ' + route + ' 네트워크 ' + h.net + '에 ARP 요청을 보내 ' + h.ask + '의 MAC 주소(' + mac(h.dm) + ')를 알아냅니다.', ''); }
      } else if (cached) {
        learn(h);
        push('PC A의 ARP 캐시: 프레임을 보내려면 건네받을 기기의 MAC 주소가 필요합니다. ' + h.ask + '의 MAC 주소(' + full(h.dm) + ')가 캐시에 이미 적혀 있습니다. 얼마 전에 통신한 적이 있다는 뜻입니다. ARP 요청 없이 바로 프레임을 만듭니다.', '');
      } else {
        st.arpN++; st.arp = { f: 'A', t: h.t, kind: 'req' };
        push('PC A의 ARP 요청: 프레임을 보내려면 건네받을 기기의 MAC 주소가 필요한데, PC A는 ' + h.ask + '의 MAC 주소를 아직 모릅니다. "IP 주소 ' + h.ask + '의 주인은 MAC 주소를 알려 달라"는 ARP 요청을, 받는 MAC을 "모두"(브로드캐스트)로 해서 보냅니다. 스위치는 이것을 네트워크 A의 모든 기기에게 내보냅니다.' + (direct ? '' : ' 묻는 IP가 ' + to.name + '의 것이 아니라 게이트웨이의 것입니다. ARP 요청은 라우터를 넘어가지 못하므로, 다른 네트워크에 있는 기기의 MAC 주소는 알아낼 수 없고 알 필요도 없습니다.'), '');
        learn(h); st.arp = { f: h.t, t: 'A', kind: 'rep' };
        push('ARP 응답: 그 IP 주소의 주인인 ' + tn + '만 PC A에게 답합니다. 답의 내용은 "내 MAC 주소는 ' + full(h.dm) + '"입니다. ' + (direct ? '라우터 R1' : 'PC B') + '도 요청을 받았지만 자기 IP 주소가 아니므로 답하지 않습니다. PC A는 알아낸 주소를 ARP 캐시에 적어 두고 한동안 다시 묻지 않습니다.', '');
      }
      st.frames.push({ seg: fn + ' → ' + tn, f: h.f, t: h.t, sm: h.sm, dm: h.dm, sip: '192.168.1.10', dip: to.ip, ttl: ttl });
      frames.push(h.f + '>' + h.t + ' ' + h.sm + '>' + h.dm + ' ttl' + ttl);
      if (i === 0) {
        push('PC A가 프레임을 보냅니다: 겉에는 받는 MAC ' + mac(h.dm) + '(' + tn + '), 보내는 MAC ' + mac(h.sm) + '(PC A)를 적고, 그 안에 IP 패킷(보내는 IP 192.168.1.10, 받는 IP ' + to.ip + ', TTL ' + ttl + ')을 넣습니다.' + (direct ? ' 받는 IP와 받는 MAC이 모두 PC B를 가리킵니다.' : ' 받는 IP는 ' + to.name + '의 것인데 받는 MAC은 라우터 R1의 것입니다. IP 주소는 마지막에 받을 곳을, MAC 주소는 이번 구간에서 건네받을 기기를 가리킵니다.'), direct ? '' : 'good');
        st.sw = true; st.at = 'SW'; st.seen.push('SW');
        push('스위치: 프레임의 받는 MAC 주소만 보고, 그 주소의 기기(' + tn + ')가 연결된 포트로만 내보냅니다. 안에 든 IP 패킷은 열어 보지 않고, 프레임을 고치지도 않습니다.' + (direct ? ' 같은 네트워크 안의 전달은 이렇게 MAC 주소만으로 끝납니다.' : ''), '');
      } else {
        push(fn + '의 전달: 같은 IP 패킷을 새 프레임에 담아 보냅니다. 겉의 받는 MAC은 ' + mac(h.dm) + '(' + tn + '), 보내는 MAC은 ' + mac(h.sm) + '(' + h.f + '의 네트워크 ' + h.net + ' 쪽)로 둘 다 바뀌었습니다. 안의 보내는 IP 192.168.1.10과 받는 IP ' + to.ip + '은 그대로이고, TTL만 ' + ttl + '입니다.', 'good');
      }
      if (last) {
        st.at = h.t; st.seen.push(h.t); st.end = 'ok'; st.endAt = h.t; st.sw = false;
        var routers = hops.length - 1;
        push(tn + '의 수신: 프레임의 받는 MAC 주소가 자기 것이고, 안에 든 패킷의 받는 IP도 자기 주소입니다. 도착했습니다. 도착했을 때의 TTL은 ' + ttl + '입니다.' + (routers === 0 ? ' 라우터를 지나지 않았으므로 처음 값 그대로입니다.' : ' 라우터 ' + routers + '개를 지나 처음 값 ' + ttl0 + '에서 ' + routers + '만큼 줄었습니다.') + (ttl === 1 && routers > 0 ? ' TTL이 1인 패킷도 받는 컴퓨터는 그대로 받습니다. TTL을 줄이고 0이 됐는지 보는 것은 전달하는 라우터입니다.' : ''), 'good');
      }
    }
    var ok = st.end === 'ok', changed = frames.length - 1;
    if (!ok) sum.push(D[st.endAt].name + '에서 TTL이 0이 되어 버려졌습니다. ' + to.name + '까지 가려면 라우터 ' + (hops.length - 1) + '개를 지나야 하므로 처음 TTL이 ' + hops.length + ' 이상이어야 합니다.');
    if (direct) sum.push('같은 네트워크 안에서는 받는 기기의 MAC 주소를 ARP로 알아내 직접 보냅니다. 스위치는 MAC 주소만 보고 전달하고, 라우터는 관여하지 않으므로 TTL도 줄지 않습니다.' + (ttl0 === 1 ? ' 그래서 TTL이 1이어도 도착합니다.' : ''));
    else sum.push('다른 네트워크로 보낼 때 PC A가 ARP로 묻는 것은 받는 기기가 아니라 게이트웨이의 MAC 주소입니다. 기본 게이트웨이 설정이 틀리면 같은 네트워크 안에서는 통신이 되는데 바깥으로는 나가지 못하는 까닭입니다.');
    if (changed > 0) sum.push('라우터를 지날 때마다 프레임은 새로 만들어져 MAC 주소가 ' + changed + '번 바뀌었습니다. 보내는 IP와 받는 IP는 처음부터 끝까지 같았습니다. MAC 주소는 한 구간 안에서만 쓰이는 주소이고, IP 주소는 출발지에서 목적지까지 쓰이는 주소입니다.');
    if (!ok) sum.push('버린 라우터가 "시간 초과"를 돌려보내는 성질을 이용한 도구가 traceroute(윈도의 tracert)입니다. TTL을 1, 2, 3으로 늘려 가며 보내서, 응답한 라우터를 차례로 적어 길을 알아냅니다.');
    if (!cached && ok && !direct) sum.push('ARP 요청은 구간마다 한 번씩, 모두 ' + st.arpN + '번 있었습니다. 한 번 알아낸 MAC 주소는 캐시에 남으므로 이어지는 패킷은 묻지 않고 보냅니다.');
    return { events: ev, summary: sum, frames: frames.join('; '),
      row: [direct ? '같은 네트워크: 직접 보냄' : '다른 네트워크: 게이트웨이로 보냄', D[hops[0].t].name + ' (' + mac(hops[0].dm) + ')', st.arpN + '번', ok ? '도착 (TTL ' + ttl + ')' : D[st.endAt].name + '에서 버려짐 (TTL 0)', changed + '번'] };
  },
  render: function (v, sim, t, H, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : null;
    if (!s) { H.text(v, '실행을 누르면 PC A의 판단부터 한 단계씩 진행합니다.'); return; }
    H.counters(v, [[s.arpN + '번', 'ARP 요청'], [s.frames.length + '개', '만들어진 프레임']]);
    if (s.frames.length) H.table(v, ['구간', '보내는 MAC', '받는 MAC', '보내는 IP', '받는 IP', 'TTL'], s.frames.map(function (f, k) { var cur = k === s.frames.length - 1; return { cells: [f.seg, { v: '…:' + f.sm, cls: cur ? 'hot' : '' }, { v: '…:' + f.dm, cls: cur ? 'hot' : '' }, f.sip, f.dip, String(f.ttl)] }; }), '구간마다의 프레임 (MAC 주소는 바뀌고 IP 주소는 그대로. MAC 주소는 끝의 두 자리만 적음)');
    else H.text(v, '아직 프레임을 보내지 않았습니다.');
    if (s.arpTab.length) H.table(v, ['기기', 'IP 주소', 'MAC 주소'], s.arpTab.map(function (a) { return { cells: [a.dev, a.ip, a.mac + (a.old ? ' (이미 알고 있었음)' : '')] }; }), 'ARP 캐시 (IP 주소로 알아낸 MAC 주소)');
    if (s.end === 'drop') H.text(v, 'TTL이 0이 되어 버려졌습니다. 라우터가 보낸 쪽에 ICMP "시간 초과"를 돌려보냅니다.');
  },
  // 그림: 왼쪽부터 네트워크 A(PC A, PC B, 스위치), 라우터 R1, 네트워크 B(서버 C), 라우터 R2, 네트워크 C(서버 D). 화살표가 프레임이 지나간 구간이고, 아래 두 상자가 지금 프레임의 겉(MAC)과 안(IP, TTL)이다.
  draw: function (P, sim, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : { at: '', seen: [], frames: [], arpTab: [], arpN: 0, arp: null, sw: false, ttl: +sim.c.ttl, end: '', endAt: '' };
    function cls(id) { if (s.end && s.endAt === id) return (s.end === 'ok' ? 'good' : 'bad') + ' now'; if (s.at === id) return 'hot now'; return s.seen.indexOf(id) >= 0 ? 'wait' : 'plain'; }
    P.size(680, 330);
    P.region('na', 16, 16, 222, 196, '네트워크 A 192.168.1.0/24');
    P.region('nb', 334, 16, 130, 196, '네트워크 B');
    P.region('nc', 550, 16, 114, 196, '네트워크 C');
    P.text('nbt', 399, 200, '192.168.2.0/24', { cls: 'mut', anchor: 'middle' });
    P.text('nct', 607, 200, '192.168.3.0/24', { cls: 'mut', anchor: 'middle' });
    P.box('A', 24, 48, 106, 50, { cls: cls('A'), title: 'PC A', sub: '192.168.1.10' });
    P.box('B', 24, 146, 106, 50, { cls: cls('B'), title: 'PC B', sub: '192.168.1.20' });
    P.box('SW', 152, 97, 76, 50, { cls: cls('SW'), title: '스위치', sub: 'MAC만 봄' });
    P.box('R1', 250, 97, 72, 50, { cls: cls('R1'), title: 'R1', sub: '라우터' });
    P.box('C', 343, 44, 112, 50, { cls: cls('C'), title: '서버 C', sub: '192.168.2.30' });
    P.box('R2', 476, 97, 64, 50, { cls: cls('R2'), title: 'R2', sub: '라우터' });
    P.box('D', 554, 97, 106, 50, { cls: cls('D'), title: '서버 D', sub: '192.168.3.40' });
    var ends = { 'A>SW': ['A:r', 'SW:l'], 'SW>B': ['SW:l:0.8', 'B:r'], 'SW>R1': ['SW:r', 'R1:l'], 'R1>C': ['R1:r:0.25', 'C:b'], 'R1>R2': ['R1:r:0.6', 'R2:l:0.6'], 'R2>D': ['R2:r', 'D:l'] };
    s.frames.forEach(function (f, k) {
      var cur = k === s.frames.length - 1 && !s.end, lab = '…:' + f.sm + ' → …:' + f.dm;
      if (k === 0) {
        P.arrow('h0a', ends['A>SW'][0], ends['A>SW'][1], { cls: cur ? 'hot' : 'mut' });
        if (s.seen.indexOf('SW') >= 0) { var e = ends['SW>' + f.t]; P.arrow('h0b', e[0], e[1], { cls: cur ? 'hot' : 'mut' }); }
      } else { var g = ends[f.f + '>' + f.t]; P.arrow('h' + k, g[0], g[1], { cls: cur ? 'hot' : 'mut' }); }
    });
    if (s.arp) {
      if (s.arp.kind === 'req') { P.arrow('q2', 'A:r:0.8', 'SW:t', { cls: 'dash' }); P.arrow('q1', 'SW:b', 'B:r:0.2', { cls: 'dash' }); P.arrow('q3', 'SW:t:0.8', 'R1:t', { cls: 'dash' }); P.text('qt', 190, 64, 'ARP 요청', { anchor: 'middle' }); }
      else if (s.arp.kind === 'rep') { if (s.arp.f === 'B') P.arrow('q1', 'B:r:0.2', 'SW:b', { cls: 'dash' }); else P.arrow('q3', 'R1:t', 'SW:t:0.8', { cls: 'dash' }); P.arrow('q2', 'SW:t', 'A:r:0.8', { cls: 'dash' }); P.text('qt', 190, 64, 'ARP 응답', { anchor: 'middle' }); }
      else { var a = ends[s.arp.f + '>' + s.arp.t]; P.arrow('q1', a[0], a[1], { cls: 'dash', label: 'ARP' }); }
    }
    var f = s.frames[s.frames.length - 1], to = this.DEV[sim.c.dst.toUpperCase()];
    P.box('fr', 16, 228, 648, 40, { cls: f ? 'hot' : 'ghost', title: '프레임의 겉 (구간마다 새로 씀)', right: f ? '보내는 MAC …:' + f.sm + ' → 받는 MAC …:' + f.dm : '아직 없음' });
    P.box('ip', 16, 276, 648, 40, { cls: s.end === 'drop' ? 'bad' : s.end === 'ok' ? 'good' : 'wait', title: 'IP 패킷 (끝까지 그대로)', right: '192.168.1.10 → ' + to.ip + ' · TTL ' + s.ttl + (s.end === 'drop' ? ' · 버려짐' : '') });
    P.note('실선 화살표는 프레임이 지나간 구간, 점선은 ARP입니다. MAC 주소는 끝의 두 자리만 적었습니다(앞부분은 모두 00:00:5E:00:53). 라우터는 연결된 네트워크마다 IP 주소와 MAC 주소를 하나씩 가집니다. R1은 네트워크 A 쪽이 192.168.1.1(…:11), B 쪽이 192.168.2.1(…:12)이고, R2는 B 쪽이 192.168.2.2(…:21), C 쪽이 192.168.3.1(…:22)입니다.');
  },
  assume: '실제 장비로 실행한 결과가 아니라 표준 문서의 규칙을 옮긴 개념 모형입니다. 이 PC 한 대로는 스위치와 라우터 두 대를 거치는 길을 만들 수 없어 실행으로 대조하지 못했습니다. 그 대신 모형의 결과를, 같은 규칙을 다른 방법(기기마다 IP 주소, 마스크, 라우팅 표, ARP 표를 두고 패킷을 넘겨 가는 계산)으로 옮긴 계산과 열여덟 가지 조합에서 대조했습니다. 근거로 삼은 문서: 보내는 컴퓨터가 마스크로 같은 네트워크인지 판단해 직접 보내거나 게이트웨이로 보내는 것은 RFC 1122 3.3.1.1절, IP 주소로 MAC 주소를 알아내는 ARP는 RFC 826, TTL의 뜻은 RFC 791 3.2절, 라우터가 전달할 때 TTL을 줄이고 0이 되면 버리며 ICMP 시간 초과를 보내는 것은 RFC 1812 5.3.1절과 RFC 792, 받는 컴퓨터는 TTL이 작아도 받는다는 것은 RFC 1122 3.2.1.7절입니다. 스위치가 MAC 주소로 전달하는 방식은 IEEE 802.1D의 내용입니다. 단순화한 것: 네트워크 B와 C에도 스위치가 있지만 그리지 않았고, 스위치가 어느 포트에 어느 MAC 주소가 있는지 배우는 과정, 라우터가 TTL을 줄인 뒤 IP 헤더의 체크섬을 다시 계산하는 일, 주소 변환(NAT)은 다루지 않았습니다. 집에서 쓰는 공유기를 지날 때는 NAT 때문에 보내는 IP 주소도 바뀝니다. IP 주소는 사설 대역(192.168.x.x), MAC 주소는 문서용으로 예약된 대역(RFC 7042, 지금은 RFC 9542)의 값이며 실제 기기의 주소가 아닙니다. 처음 TTL은 운영체제마다 다릅니다.',
});

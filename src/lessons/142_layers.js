Lab.register({
  id: 'layers', nav: '계층 구조와 캡슐화', cat: '네트워크', mode: 'step',
  title: '1500바이트를 보냈는데 왜 전선에는 1616바이트가 지나갈까',
  why: '통신 하나에는 신호를 실어 보내는 일, 목적지까지 길을 찾는 일, 빠진 데이터를 다시 보내는 일, 웹 페이지를 주고받는 일처럼 성격이 다른 일이 섞여 있어서, 한 덩어리로 만들면 하나를 바꿀 때 전부를 고쳐야 한다. 계층 구조는 이 일을 층으로 나누고 층 사이에 주고받는 모양만 정해 두어, 랜선을 와이파이로 바꿔도 그 위의 IP, TCP, HTTP를 고치지 않고 그대로 쓰게 한다.',
  use: '접속이 안 될 때 "랜선과 와이파이는 연결됐나, IP 주소와 경로는 맞나, 포트는 열려 있나, HTTP 응답은 무엇인가"처럼 아래 층부터 차례로 확인하는 기준으로 쓴다. "L4 로드 밸런서", "L7 로드 밸런서"처럼 장비가 IP 주소와 포트까지만 보는지, HTTP의 경로와 헤더까지 보는지를 말할 때도 계층 번호를 쓴다.',
  intro: '네트워크는 일을 계층으로 나눠 맡습니다. 보내는 쪽에서는 데이터가 위 계층에서 아래 계층으로 내려가며, 계층마다 자기 일에 필요한 정보를 적은 머리말(헤더)을 앞에 붙입니다. 이것을 캡슐화라고 합니다. 받는 쪽은 반대 순서로 머리말을 하나씩 떼어 냅니다.',
  terms: ['OSI 7계층', 'TCP/IP 4계층', '캡슐화와 역캡슐화', '세그먼트, 패킷, 프레임', 'MTU와 MSS'],
  controls: [
    { id: 'size', label: '보낼 HTTP 메시지의 크기', type: 'select', value: '1500', options: [['300', '300바이트 (짧은 요청 하나)'], ['1460', '1460바이트'], ['1500', '1500바이트'], ['4000', '4000바이트'], ['10000', '10000바이트 (긴 글 올리기)']] },
    { id: 'mtu', label: '한 프레임에 실을 수 있는 크기 (MTU)', type: 'select', value: '1500', options: [['1500', '1500바이트 (이더넷의 기본값)'], ['1400', '1400바이트 (더 좁은 구간의 예)']], hint: 'MTU는 링크 계층이 한 번에 실어 줄 수 있는 IP 패킷의 최대 크기입니다.' },
  ],
  presets: [
    { t: '처음 설정으로', q: 'HTTP 메시지 1500바이트를 MTU 1500바이트 구간으로 보내면 전선에는 얼마가 지나가나', d: '1500바이트를 MTU 1500으로. MTU와 같은 크기인데도 두 조각이 됩니다.', v: { size: '1500', mtu: '1500' } },
    { t: '딱 한 조각', q: '보낼 HTTP 메시지의 크기를 1460바이트로 바꾸면', d: '1460바이트는 TCP와 IP 머리말을 붙이면 정확히 1500바이트가 됩니다.', v: { size: '1460', mtu: '1500' } },
    { t: '짧은 요청', q: '보낼 HTTP 메시지의 크기를 300바이트로 바꾸면', d: '300바이트. 나누지 않고 머리말만 붙습니다.', v: { size: '300', mtu: '1500' } },
    { t: '긴 데이터', q: '보낼 HTTP 메시지의 크기를 10000바이트로 바꾸면', d: '10000바이트는 일곱 조각으로 나뉘고 조각마다 머리말이 붙습니다.', v: { size: '10000', mtu: '1500' } },
    { t: 'MTU가 더 작으면', q: '메시지가 1460바이트인데 MTU를 1400바이트로 바꾸면', d: '같은 1460바이트가 이번에는 두 조각이 됩니다.', v: { size: '1460', mtu: '1400' } },
  ],
  TCP: 20, IP: 20, ETH: 14, FCS: 4,
  code: function (c) {
    return '// Node.js. 머리말을 그 크기의 바이트 덩어리로 만들어 차례로 붙여 봅니다 (내용은 비워 두고 크기만 봅니다).\nconst mtu = ' + c.mtu + ';\nconst message = Buffer.alloc(' + c.size + ');' + ' '.repeat(Math.max(1, 25 - c.size.length)) + '// HTTP 메시지 (응용 계층)\nconst tcpHeader = Buffer.alloc(20);                     // 포트 번호, 순서 번호 등\nconst ipHeader = Buffer.alloc(20);                      // IP 주소 등\nconst ethHeader = Buffer.alloc(14);                     // MAC 주소 등\nconst fcs = Buffer.alloc(4);                            // 오류 검사값 (프레임의 맨 뒤)\n\nconst mss = mtu - ipHeader.length - tcpHeader.length;   // 한 조각에 실을 수 있는 데이터\nlet total = 0;\nfor (let at = 0; at < message.length; at += mss) {\n    const data = message.subarray(at, at + mss);                // 조각 하나\n    const segment = Buffer.concat([tcpHeader, data]);           // 전송 계층: 세그먼트\n    const packet = Buffer.concat([ipHeader, segment]);          // 인터넷 계층: 패킷\n    const frame = Buffer.concat([ethHeader, packet, fcs]);      // 링크 계층: 프레임\n    console.log(data.length, segment.length, packet.length, frame.length);\n    total += frame.length;\n}\nconsole.log(total);                                     // 전선으로 나간 전체 크기';
  },
  label: function (c) { return 'HTTP 메시지 ' + c.size + '바이트 · MTU ' + c.mtu; },
  columns: ['한 조각에 실을 수 있는 데이터 (MSS)', '조각 수', '마지막 조각의 데이터', '덧붙은 머리말과 꼬리말', '전선으로 나간 전체 크기'],
  // 데이터를 MSS 크기로 나눈 조각들의 크기
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
    st.at = 's0'; st.data = k.size; st.name = 'HTTP 메시지'; st.bytes = k.size;
    push('응용 계층(HTTP): 브라우저가 서버에 보낼 HTTP 메시지를 만듭니다. 크기는 ' + k.size + '바이트입니다. 이 계층은 "무슨 내용을 주고받을지"만 정하고, 그것이 상대에게 어떻게 닿을지는 아래 계층에 맡깁니다.');
    st.at = 's1'; st.split = true; st.data = first; st.name = n > 1 ? '첫 조각' : '나누지 않은 데이터'; st.bytes = first;
    push('전송 계층(TCP): 먼저 한 번에 실어 보낼 수 있는 크기를 따집니다. 링크 계층이 한 번에 실어 주는 크기(MTU)가 ' + k.mtu + '바이트이고, 그 안에 IP 머리말 ' + I + '바이트와 TCP 머리말 ' + T + '바이트도 들어가야 하므로 데이터는 한 조각에 ' + k.mss + '바이트까지 실립니다(MSS). ' + (n > 1 ? '보낼 데이터 ' + k.size + '바이트는 이보다 크므로 ' + n + '조각으로 나눕니다(' + (n <= 3 ? k.segs.join(', ') : first + '바이트짜리 ' + (n - 1) + '개와 ' + lastSeg) + '바이트).' : '보낼 데이터 ' + k.size + '바이트는 이 안에 들어가므로 나누지 않습니다.'), n > 1 ? 'bad' : 'good');
    st.tcp = true; st.name = '세그먼트'; st.bytes = first + T;
    push('전송 계층(TCP): ' + (n > 1 ? '첫 조각' : '데이터') + ' 앞에 TCP 머리말 ' + T + '바이트를 붙입니다. 이렇게 데이터 앞에 머리말을 붙여 감싸는 것이 캡슐화입니다. 머리말에는 보내는 프로그램과 받는 프로그램을 가리키는 포트 번호(' + A.cp + ' → ' + A.sp + ')와, 이 조각이 전체에서 몇 번째 바이트부터인지 알려 주는 순서 번호가 들어 있습니다. 이렇게 싸인 것을 세그먼트라고 부릅니다. ' + (first + T) + '바이트가 됐습니다.');
    st.at = 's2'; st.ip = true; st.name = '패킷'; st.bytes = first + T + I;
    push('인터넷 계층(IP): 세그먼트 앞에 IP 머리말 ' + I + '바이트를 붙입니다. 머리말에는 보내는 컴퓨터와 받는 컴퓨터의 IP 주소(' + A.cip + ' → ' + A.sip + ')가 들어 있습니다. 이렇게 싸인 것을 패킷이라고 부릅니다. ' + (first + T + I) + '바이트가 됐습니다.' + (first + T + I === k.mtu ? ' MTU ' + k.mtu + '바이트를 꽉 채운 크기입니다.' : ''));
    st.at = 's3'; st.eth = true; st.name = '프레임'; st.bytes = first + k.per;
    push('링크 계층(이더넷): 패킷 앞에 이더넷 머리말 ' + E + '바이트를, 뒤에 오류 검사용 꼬리말(FCS) ' + F + '바이트를 붙입니다. 머리말에는 같은 네트워크 안에서 이 데이터를 주고받는 두 장비의 MAC 주소(' + A.cmac + ' → ' + A.smac + ')가 들어 있습니다. 이렇게 싸인 것을 프레임이라고 부릅니다. ' + (first + k.per) + '바이트가 전선으로 나갑니다.');
    st.sent = true;
    push(n > 1 ? '나머지 조각도 같은 순서로 쌉니다. 머리말은 조각마다 따로 붙습니다. 프레임 ' + n + '개에 ' + k.per + '바이트씩, 모두 ' + over + '바이트가 덧붙었습니다. 전선으로 나간 것은 데이터 ' + k.size + '바이트를 합쳐 ' + total + '바이트입니다.' : '조각이 하나이므로 프레임도 하나입니다. 데이터 ' + k.size + '바이트에 머리말과 꼬리말 ' + k.per + '바이트가 덧붙어, 전선으로 나간 것은 ' + total + '바이트입니다.', n > 1 ? 'bad' : '');
    st.at = 'r3'; st.eth = false; st.name = '패킷'; st.bytes = first + T + I;
    push('받는 쪽 링크 계층: 프레임을 받아 목적지 MAC 주소가 자기 것인지, 꼬리말의 검사값이 맞는지 확인합니다. 맞으면 이더넷 머리말과 꼬리말을 떼어 내고 안에 든 패킷을 위 계층으로 올립니다. 보낼 때 마지막에 붙인 것을 가장 먼저 뗍니다.');
    st.at = 'r2'; st.ip = false; st.name = '세그먼트'; st.bytes = first + T;
    push('받는 쪽 인터넷 계층: IP 머리말의 목적지 IP 주소(' + A.sip + ')가 자기 것인지 확인합니다. 맞으면 IP 머리말을 떼어 내고 안에 든 세그먼트를 TCP에 올립니다.');
    st.at = 'r1'; st.tcp = false; st.data = k.size; st.name = 'HTTP 메시지'; st.bytes = k.size;
    push('받는 쪽 전송 계층: TCP 머리말의 목적지 포트 ' + A.sp + '번을 보고 어느 프로그램(웹 서버)에 줄 데이터인지 정합니다. ' + (n > 1 ? '순서 번호를 보고 조각 ' + n + '개를 차례대로 이어 붙인 뒤 머리말을 떼어 냅니다.' : 'TCP 머리말을 떼어 냅니다.'));
    st.at = 'r0'; st.done = true;
    push('받는 쪽 응용 계층: 웹 서버가 처음의 HTTP 메시지 ' + k.size + '바이트를 그대로 받습니다. 중간에 몇 조각으로 나뉘었는지, 어떤 머리말이 붙었다 떨어졌는지는 알지 못합니다.', 'good');
    if (n > 1 && k.size <= k.mtu) sum.push('MTU는 데이터의 크기가 아니라 IP 머리말과 TCP 머리말까지 합친 패킷의 크기에 대한 한도입니다. 그래서 데이터는 MTU에서 40바이트를 뺀 ' + k.mss + '바이트(MSS)까지만 한 조각에 실립니다. MTU와 같거나 조금 작은 데이터도 두 조각이 되는 이유입니다.');
    if (n > 2) sum.push('데이터가 크면 조각 수만큼 머리말이 되풀이해 붙습니다. 받는 쪽 TCP가 순서 번호로 이어 붙여 주므로, 프로그램은 조각을 신경 쓰지 않고 이어진 데이터로 읽습니다.');
    if (n === 1) sum.push('나뉘지 않아도 머리말 ' + k.per + '바이트는 반드시 붙습니다. 데이터가 작을수록 전체에서 머리말이 차지하는 몫이 커집니다.');
    sum.push('계층마다 보는 주소가 다릅니다. 전송 계층은 포트 번호로 프로그램을, 인터넷 계층은 IP 주소로 컴퓨터를, 링크 계층은 MAC 주소로 같은 네트워크 안의 바로 다음 장비를 가리킵니다. 각 계층은 자기 머리말만 읽고 그 안쪽은 내용물로만 취급하므로, 한 계층의 기술을 바꿔도(유선을 무선으로, HTTP를 다른 프로토콜로) 나머지 계층은 그대로 쓸 수 있습니다.');
    return { events: ev, summary: sum, k: k, addr: A, wire: total, over: over, row: [k.mss + '바이트', n + '개', lastSeg + '바이트', over + '바이트 (' + k.per + '바이트 x ' + n + ')', total + '바이트'] };
  },
  render: function (v, sim, t, H, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : { stage: 0, at: '' }, k = sim.k, T = this.TCP, I = this.IP, E = this.ETH, F = this.FCS, A = sim.addr;
    var on = function (lv) { return s.at.charAt(1) === String(lv) ? 'hot' : ''; };
    H.table(v, ['OSI 7계층', 'TCP/IP 4계층', '이 실습의 예', '데이터를 부르는 이름', '머리말에 적는 주소'], [
      { cells: ['7 응용 · 6 표현 · 5 세션', { v: '응용', cls: on(0) }, 'HTTP', '메시지', '-'] },
      { cells: ['4 전송', { v: '전송', cls: on(1) }, 'TCP (머리말 ' + T + '바이트)', '세그먼트', '포트 번호 ' + A.cp + ' → ' + A.sp] },
      { cells: ['3 네트워크', { v: '인터넷', cls: on(2) }, 'IP (머리말 ' + I + '바이트)', '패킷', 'IP 주소 ' + A.cip + ' → ' + A.sip] },
      { cells: ['2 데이터 링크 · 1 물리', { v: '링크', cls: on(3) }, '이더넷 (머리말 ' + E + ' + 꼬리말 ' + F + '바이트)', '프레임', 'MAC 주소 ' + A.cmac + ' → ' + A.smac] },
    ], '계층의 대응 (노란 칸이 지금 일하는 계층)');
    if (!s.stage) { H.text(v, '실행을 누르면 보내는 쪽의 위 계층부터 한 단계씩 내려갑니다.'); return; }
    H.counters(v, [[s.split ? k.mss + '바이트' : '?', '한 조각에 실을 수 있는 데이터']]);
    if (s.split) H.table(v, ['조각', '데이터', '+ TCP ' + T + ' = 세그먼트', '+ IP ' + I + ' = 패킷', '+ 이더넷 ' + E + ' + FCS ' + F + ' = 프레임'], k.segs.map(function (d, i) {
      var cur = i === 0 || s.sent, sh = function (x, need) { return cur && need ? String(x) : '-'; };
      return { cells: [(i + 1) + '번', d + '바이트', sh(d + T, s.stage >= 3), sh(d + T + I, s.stage >= 4), { v: sh(d + T + I + E + F, s.stage >= 5), cls: cur && s.stage >= 5 ? 'hot' : '' }] };
    }), '조각마다 붙는 머리말 (단위: 바이트)');
  },
  // 그림: 양쪽에 네 계층을 쌓아 두고, 가운데에는 지금의 데이터 덩어리를 그린다. 내려갈 때 머리말 상자가 앞에 하나씩 붙고 올라갈 때 하나씩 떨어진다. 아래에는 나뉜 조각을 늘어놓는다.
  draw: function (P, sim, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : { stage: 0, at: '', eth: false, ip: false, tcp: false, data: sim.k.size, name: '', bytes: 0, split: false, sent: false, done: false }, k = sim.k, A = sim.addr, n = k.segs.length, i;
    var names = [['응용', 'HTTP'], ['전송', 'TCP'], ['인터넷', 'IP'], ['링크', '이더넷']];
    P.size(680, 340);
    P.region('snd', 8, 8, 150, 212, '보내는 쪽 컴퓨터');
    P.region('rcv', 522, 8, 150, 212, '받는 쪽 컴퓨터');
    for (i = 0; i < 4; i++) {
      P.box('s' + i, 16, 36 + i * 45, 134, 38, { cls: s.at === 's' + i ? 'hot now' : 'plain', title: names[i][0], right: names[i][1], sub: i === 0 ? '브라우저' : '' });
      P.box('r' + i, 530, 36 + i * 45, 134, 38, { cls: s.at === 'r' + i ? (s.done ? 'good now' : 'hot now') : 'plain', title: names[i][0], right: names[i][1], sub: i === 0 ? '웹 서버' : '' });
    }
    P.text('un', 340, 30, s.stage ? '지금의 데이터: ' + s.name + ' (' + s.bytes + '바이트)' : '실행을 누르면 데이터가 계층을 따라 내려갑니다', { anchor: 'middle', bold: true });
    if (s.eth) P.box('eth', 168, 42, 58, 46, { cls: 'wait', title: '이더넷', sub: String(this.ETH), center: true });
    if (s.ip) P.box('ip', 228, 42, 48, 46, { cls: 'wait', title: 'IP', sub: String(this.IP), center: true });
    if (s.tcp) P.box('tcp', 278, 42, 52, 46, { cls: 'wait', title: 'TCP', sub: String(this.TCP), center: true });
    P.box('data', 332, 42, 124, 46, { cls: s.stage ? (s.done ? 'good' : 'hot') : 'ghost', title: 'HTTP 데이터', sub: String(s.data), center: true });
    if (s.eth) P.box('fcs', 458, 42, 54, 46, { cls: 'wait', title: 'FCS', sub: String(this.FCS), center: true });
    P.text('lg', 340, 104, '상자 안의 숫자는 바이트 수', { anchor: 'middle', cls: 'mut' });
    if (s.tcp) P.text('a1', 340, 124, '포트 ' + A.cp + ' → ' + A.sp, { anchor: 'middle' });
    if (s.ip) P.text('a2', 340, 142, 'IP ' + A.cip + ' → ' + A.sip, { anchor: 'middle' });
    if (s.eth) P.text('a3', 340, 160, 'MAC ' + A.cmac + ' → ' + A.smac, { anchor: 'middle' });
    if (s.sent) P.arrow('wire', 's3:r', 'r3:l', { cls: 'hot', label: '프레임 ' + n + '개' });
    for (i = 0; i < n; i++) P.box('g' + i, 16 + i * 81, 234, 77, 42, { cls: !s.split ? 'ghost' : s.done ? 'good' : i === 0 && !s.sent ? 'hot now' : s.sent ? 'wait' : 'plain', title: '조각 ' + (i + 1), sub: s.split ? String(k.segs[i]) : '', center: true });
    if (n <= 4) P.text('gt', 664, 260, s.split ? (n > 1 ? '데이터를 ' + n + '조각으로 나눔' : '나누지 않음') : '아직 나누기 전', { anchor: 'end', cls: 'mut' });
    P.box('tot', 16, 290, 648, 34, { cls: s.sent ? (n > 1 ? 'hot' : 'good') : 'ghost', title: '전선으로 나간 전체 크기', right: s.sent ? sim.wire + '바이트 = 데이터 ' + k.size + ' + 덧붙은 것 ' + sim.over : '아직 보내기 전' });
    P.note('가운데가 지금의 데이터 덩어리입니다. 보내는 쪽에서 한 계층 내려갈 때마다 파란 머리말이 앞에 붙고, 받는 쪽에서 한 계층 올라갈 때마다 바깥쪽 것부터 떨어집니다. 가운데 그림은 첫 조각 하나를 따라가며, 아래 줄의 상자가 나뉜 조각들입니다.');
  },
  assume: '머리말의 크기는 옵션이 없을 때의 기본 크기입니다. TCP 머리말 20바이트는 RFC 9293 3.1절, IPv4 머리말 20바이트는 RFC 791 3.1절, 이더넷 머리말 14바이트(목적지 MAC 6 + 출발지 MAC 6 + 종류 2)와 꼬리말 FCS 4바이트는 IEEE 802.3, 이더넷의 MTU 1500바이트는 RFC 894, MSS가 MTU에서 40바이트를 뺀 값이라는 것은 RFC 9293 3.7.1절을 따랐습니다. TCP/IP의 네 계층과 세그먼트, 패킷(IP 데이터그램), 프레임이라는 이름은 RFC 1122 1.1.3절과 1.3.3절에 있고, OSI 7계층과의 대응은 표준이 정한 것이 아니라 교재에서 널리 쓰는 짝짓기입니다. 실행으로 확인한 것은 계산입니다: 열 가지 조합마다 Node.js 24에서 실제 HTTP 요청 글자를 만들고, 표준의 자리 배치대로 TCP, IPv4, 이더넷 머리말과 검사값을 바이트로 만들어 붙인 뒤 조각 수와 크기를 재어 대조했으며, 그 프레임들을 다시 풀어 이어 붙인 것이 원래 메시지와 같은지, 같은 메시지를 127.0.0.1의 TCP 연결로 보냈을 때 받는 프로그램이 같은 바이트를 받는지도 확인했습니다. 운영체제가 실제로 전선에 내보내는 프레임을 잡아서 본 것은 아닙니다. 실제로는 연결을 맺을 때 양쪽이 MSS를 서로 알려 주고, TCP 옵션(시간 기록 12바이트 등)이 붙으면 한 조각의 데이터가 그만큼 줄며, 랜카드가 조각내기를 대신하는 설정에서는 패킷 분석 도구에 나누기 전의 큰 덩어리가 보이기도 합니다. 패킷 분석 도구는 보통 FCS를 빼고 보여 주므로 가장 큰 프레임이 1514바이트로 보입니다. 프레임 앞의 동기 신호 8바이트와 프레임 사이의 간격은 세지 않았습니다. 데이터가 6바이트보다 작은 조각에는 이더넷의 최소 크기를 채우는 바이트가 더 붙는데, 그런 조각이 생기지 않는 크기만 골랐습니다. 두 컴퓨터는 같은 네트워크에 있다고 두었습니다. 다른 네트워크라면 목적지 MAC 주소는 게이트웨이의 것이 되고, 라우터를 지날 때마다 이더넷 머리말만 새로 바뀝니다. HTTPS라면 HTTP 메시지가 TLS로 암호화된 뒤 TCP에 실립니다. 포트 51000과 문서용으로 예약된 MAC 주소 대역 00-00-5E-00-53-xx(RFC 7042, 지금은 RFC 9542)의 주소는 예시입니다.',
});

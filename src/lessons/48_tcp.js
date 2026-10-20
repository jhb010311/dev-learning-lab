Lab.register({
  id: 'tcp', nav: 'TCP 연결과 재전송', cat: '네트워크', mode: 'step',
  title: '패킷이 사라지면 누가 알아채고 다시 보내나',
  why: 'IP 네트워크는 패킷을 최선을 다해 전달할 뿐이라, 도중에 사라지거나 순서가 바뀌거나 겹쳐 도착해도 알려 주지 않는다. TCP는 번호 매기기, 확인 응답, 재전송, 순서 맞추기를 운영체제가 맡아 처리하게 해서, 애플리케이션은 유실을 챙기지 않고 파일을 읽고 쓰듯 데이터를 주고받을 수 있게 한다.',
  use: '자바에서 Socket을 열거나 JDBC로 DB에 접속하거나 RestClient로 다른 서버를 부를 때 그 아래에서 TCP 연결이 맺어진다. 연결을 맺는 데 왕복 시간이 들어서 커넥션 풀이나 keep-alive로 맺어 둔 연결을 다시 쓴다. 조금 빠지는 것보다 늦게 오는 것이 더 나쁜 음성 통화나 실시간 대전 게임은 주로 UDP를 쓴다.',
  intro: 'TCP는 데이터를 보내기 전에 연결을 맺고, 보낸 데이터를 어디까지 받았는지 확인을 받습니다. 확인이 오지 않으면 다시 보냅니다. UDP는 그런 절차 없이 그냥 보냅니다.',
  terms: ['TCP와 UDP', '3-way handshake', '흐름 제어와 혼잡 제어'], ranks: ['network', 'os'],
  controls: [
    { id: 'proto', label: '프로토콜', type: 'select', value: 'tcp', options: [['tcp', 'TCP'], ['udp', 'UDP']] },
    { id: 'loss', label: '도중에 사라지는 패킷', type: 'select', value: 'none', options: [['none', '없음'], ['syn', '연결 요청 (SYN)'], ['data', '두 번째 데이터 조각']] },
  ],
  fix: function (c) { return c.proto === 'udp' && c.loss === 'syn' ? { loss: 'none' } : null; },
  presets: [
    { t: '처음 설정으로', q: 'TCP로 패킷 유실 없이 데이터를 보내면 연결 맺기와 확인은 어떻게 오가나', d: 'TCP, 유실 없음. 연결을 맺고 데이터를 보내고 확인받습니다.', v: { proto: 'tcp', loss: 'none' } },
    { t: '데이터 조각이 사라지면', q: 'TCP에서 두 번째 데이터 조각이 도중에 사라지면', d: '확인이 오지 않아 다시 보냅니다.', v: { proto: 'tcp', loss: 'data' } },
    { t: '연결 요청이 사라지면', q: 'TCP에서 연결 요청 SYN이 도중에 사라지면', d: '응답이 없으면 기다렸다가 다시 시도합니다.', v: { proto: 'tcp', loss: 'syn' } },
    { t: '같은 유실을 UDP로', q: 'UDP로 보내는데 두 번째 데이터 조각이 사라지면', d: '사라진 조각은 그대로 사라집니다.', v: { proto: 'udp', loss: 'data' } },
  ],
  code: function (c) {
    if (c.proto === 'udp') return '// UDP: 연결 없이 바로 보낸다 (메서드 안의 줄만 보임. 클래스·메서드 선언, import, parts·address 준비는 생략)\nDatagramSocket socket = new DatagramSocket();\nfor (byte[] part : parts) {\n    socket.send(new DatagramPacket(part, part.length, address, 9000));\n}   // 도착했는지 알 수 없다';
    return '// TCP: 연결을 맺은 뒤 보낸다 (메서드 안의 줄만 보임. 클래스·메서드 선언, import, data 준비는 생략)\nSocket socket = new Socket("shop.example", 443);   // 여기서 3-way handshake\nOutputStream out = socket.getOutputStream();\nout.write(data);                               // 운영체제가 조각내어 보내고\n                                               // 확인, 재전송, 순서 맞추기를 처리\nsocket.close();                                // 연결 종료';
  },
  label: function (c) { return c.proto.toUpperCase() + ' · ' + { none: '유실 없음', syn: 'SYN 유실', data: '데이터 조각 유실' }[c.loss]; },
  columns: ['받은 쪽에 도착한 데이터', '재전송', '연결을 맺는 왕복'],
  simulate: function (c) {
    var ev = [], rows = [], sum = [], got = [], re = 0;
    function step(dir, what, s, k) { rows.push({ cells: [dir, { v: what, cls: k === 'bad' ? 'bad' : k === 'good' ? 'good' : k === 'hot' ? 'hot' : '' }] }); ev.push({ s: s, k: k === 'hot' ? '' : k, snap: { rows: rows.slice(), got: got.slice() } }); }
    if (c.proto === 'udp') {
      step('보내는 쪽', '연결 절차 없음', 'UDP는 연결을 맺지 않습니다. 상대가 받을 준비가 됐는지 확인하지 않고 바로 보냅니다.', '');
      step('보내는 쪽 → 받는 쪽', '조각 1 "안녕"', '첫 번째 조각을 보냅니다.', ''); got.push('안녕'); ev[ev.length - 1].snap.got = got.slice();
      if (c.loss === 'data') step('보내는 쪽 → (유실)', '조각 2 "하세"', '두 번째 조각이 네트워크에서 사라졌습니다. 보내는 쪽은 확인을 기다리지 않으므로 사라진 줄 모릅니다.', 'bad');
      else { step('보내는 쪽 → 받는 쪽', '조각 2 "하세"', '두 번째 조각을 보냅니다.', ''); got.push('하세'); ev[ev.length - 1].snap.got = got.slice(); }
      step('보내는 쪽 → 받는 쪽', '조각 3 "요"', '세 번째 조각을 보냅니다.', ''); got.push('요'); ev[ev.length - 1].snap.got = got.slice();
      sum.push('받은 쪽에 도착한 데이터: "' + got.join('') + '".' + (c.loss === 'data' ? ' 가운데가 빠졌지만 UDP는 알려 주지도 다시 보내지도 않습니다.' : ''));
      sum.push('UDP는 연결, 확인, 재전송, 순서 보장이 없는 대신 가볍고 지연이 적습니다. 조금 빠져도 되고 늦게 오는 것이 더 나쁜 경우(실시간 음성·영상, 게임)에 씁니다. 작은 질의 하나로 끝나는 DNS 조회도 UDP를 쓰되, 응답이 없으면 다시 묻습니다. 신뢰성이 필요하면 애플리케이션이 직접 구현합니다(HTTP/3의 기반인 QUIC이 그 예입니다).');
      return { events: ev, summary: sum, row: ['"' + got.join('') + '"', '0번', '없음'] };
    }
    if (c.loss === 'syn') { step('클라이언트 → (유실)', 'SYN', '클라이언트가 연결 요청(SYN)을 보냈지만 도중에 사라졌습니다.', 'bad'); re++; step('클라이언트', '응답 없음 → 약 1초 뒤 재전송', '서버의 응답이 없습니다. 클라이언트는 일정 시간을 기다린 뒤 SYN을 다시 보냅니다. 또 실패하면 기다리는 시간을 두 배씩 늘려 가며 몇 번 더 시도합니다. 연결이 "느리게" 맺어지는 원인입니다.', 'hot'); }
    step('클라이언트 → 서버', 'SYN (seq=100)', '3-way handshake의 첫 번째 메시지입니다. 클라이언트가 "연결하고 싶다"는 SYN을 보냅니다. 자신이 쓸 시작 번호(100)를 알립니다.', '');
    step('서버 → 클라이언트', 'SYN + ACK (seq=300, ack=101)', '두 번째 메시지입니다. 서버가 "받았다(ACK), 나도 연결하겠다(SYN)"고 답합니다. ack=101은 "100번까지 받았으니 다음은 101번을 달라"는 뜻입니다.', '');
    step('클라이언트 → 서버', 'ACK (ack=301)', '세 번째 메시지입니다. 클라이언트가 서버의 SYN을 확인합니다. 양쪽 모두 "내가 보낸 것이 도착하고, 상대가 보낸 것이 나에게 온다"는 것을 확인했습니다. 연결이 맺어졌습니다.', 'good');
    step('클라이언트 → 서버', '조각 1 "안녕" (seq=101, 6바이트)', '데이터를 조각내어 번호를 붙여 보냅니다.', ''); got.push('안녕'); ev[ev.length - 1].snap.got = got.slice();
    step('서버 → 클라이언트', 'ACK (ack=107)', '서버가 "106번까지 받았다, 다음은 107번"이라고 확인합니다.', '');
    if (c.loss === 'data') {
      step('클라이언트 → (유실)', '조각 2 "하세" (seq=107, 6바이트)', '두 번째 조각이 네트워크에서 사라졌습니다.', 'bad');
      step('클라이언트 → 서버', '조각 3 "요" (seq=113, 3바이트)', '세 번째 조각은 도착했습니다. 서버는 107번이 와야 하는데 113번이 왔으므로 순서가 맞지 않습니다. 이 조각은 보관해 두고 애플리케이션에 넘기지 않습니다.', '');
      step('서버 → 클라이언트', 'ACK (ack=107) 다시', '서버가 "아직도 107번을 기다린다"는 같은 확인을 다시 보냅니다.', '');
      re++; step('클라이언트 → 서버', '조각 2 "하세" 재전송 (seq=107)', '클라이언트는 107번에 대한 확인이 오지 않거나 같은 확인이 거듭 오는 것을 보고, 조각 2가 사라졌다고 판단해 다시 보냅니다.', 'hot'); got.push('하세'); got.push('요'); ev[ev.length - 1].snap.got = got.slice();
      step('서버 → 클라이언트', 'ACK (ack=116)', '서버가 빠진 조각을 받아 보관해 둔 조각 3과 이어 붙이고, "115번까지 다 받았다"고 확인합니다. 애플리케이션에는 순서대로 온전한 데이터가 전달됩니다.', 'good');
    } else {
      step('클라이언트 → 서버', '조각 2 "하세" (seq=107, 6바이트)', '두 번째 조각을 보냅니다.', ''); got.push('하세'); ev[ev.length - 1].snap.got = got.slice();
      step('클라이언트 → 서버', '조각 3 "요" (seq=113, 3바이트)', '세 번째 조각을 보냅니다.', ''); got.push('요'); ev[ev.length - 1].snap.got = got.slice();
      step('서버 → 클라이언트', 'ACK (ack=116)', '서버가 "115번까지 다 받았다"고 확인합니다.', 'good');
    }
    step('양쪽', 'FIN / ACK를 주고받아 연결 종료', '보낼 것이 끝나면 양쪽이 각각 "나는 끝났다(FIN)"를 보내고 확인받아 연결을 닫습니다.', '');
    sum.push('TCP는 번호와 확인 응답으로 유실을 감지해 다시 보내고, 순서가 뒤바뀌어 도착해도 번호대로 맞춰서 애플리케이션에 넘깁니다. 애플리케이션은 유실을 전혀 모릅니다. 그 대가로 연결을 맺는 왕복과, 유실 시 뒤따르는 데이터까지 기다리게 되는 지연이 있습니다.');
    sum.push('받는 쪽이 처리할 수 있는 만큼만 보내도록 조절하는 것이 흐름 제어, 네트워크가 막히면 보내는 속도를 줄이는 것이 혼잡 제어입니다. 유실이 생기면 TCP는 네트워크가 막혔다고 보고 속도를 낮춥니다.');
    return { events: ev, summary: sum, row: ['"' + got.join('') + '"', re + '번', '1번 (SYN → SYN+ACK → ACK)'] };
  },
  render: function (v, sim, t, H, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : { rows: [], got: [] };
    if (s.rows.length) H.table(v, ['방향', '패킷'], s.rows, '오간 패킷 (위에서 아래로)'); else H.text(v, '실행을 누르면 시작합니다.');
  },
  // 그림: 두 컴퓨터 사이를 오가는 패킷. 중간에 사라진 패킷은 끊긴 화살표로 그린다.
  draw: function (P, sim, shown) {
    var udp = sim.c.proto === 'udp', last = shown[shown.length - 1], s = last ? last.snap : { rows: [], got: [] }, ids = { '클라이언트': 'c', '서버': 's', '보내는 쪽': 'c', '받는 쪽': 's' };
    var msgs = s.rows.map(function (r) { var m = P.dir(P.v(r.cells[0]), ids); m.s = P.v(r.cells[1]); m.cls = P.c(r.cells[1]); return m; });
    var end = P.seq([['c', udp ? '보내는 쪽' : '클라이언트', 'wait'], ['s', udp ? '받는 쪽' : '서버', 'wait']], msgs);
    P.box('got', 16, end + 14, 648, 34, { cls: s.got.length ? 'good' : 'ghost', title: '받는 쪽 애플리케이션에 전달된 데이터', right: '"' + s.got.join('') + '"' });
    P.size(680, end + 64);
    P.note('화살표 하나가 패킷 하나이고, 위에서 아래로 시간이 흐릅니다. 빨간 점선은 가는 도중에 사라진 패킷입니다.');
  },
  assume: '"안녕하세요"를 세 조각으로 나눠 보내는 작은 예입니다. 번호(seq, ack)는 이해를 돕기 위한 임의의 값이고 한글 한 글자를 3바이트로 계산했습니다. 재전송 시점은 단순화했습니다. 실제 TCP는 타이머 만료 외에 같은 확인 응답이 세 번 거듭 오면 바로 재전송하는 방식도 함께 씁니다. 3-way handshake와 재전송의 원리는 TCP 표준(RFC 9293)을 따랐습니다.',
});

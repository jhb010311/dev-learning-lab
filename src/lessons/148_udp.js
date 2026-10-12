Lab.register({
  id: 'udp', nav: 'TCP와 UDP', cat: '네트워크', mode: 'step',
  title: '세 번에 나눠 보낸 데이터는 세 번에 나뉘어 도착하나',
  intro: 'TCP와 UDP는 프로그램의 데이터를 상대 프로그램까지 실어 나르는 두 가지 방식입니다. TCP는 먼저 연결을 맺고 바이트를 순서대로 빠짐없이 전하지만, 어디서 끊어 보냈는지는 전해 주지 않습니다. UDP는 연결 없이 덩어리째 그냥 보내고, 도착했는지는 책임지지 않습니다.',
  terms: ['TCP와 UDP', '바이트 스트림과 데이터그램', '소켓', '포트', '3-way handshake'],
  controls: [
    { id: 'proto', label: '보내는 방식', type: 'select', value: 'tcp', options: [['tcp', 'TCP'], ['udp', 'UDP']] },
    { id: 'recv', label: '받는 프로그램이 9000번 포트에서 기다리고 있다', type: 'check', value: true },
    { id: 'net', label: '가는 길에 생기는 일', type: 'select', value: 'ok', options: [['ok', '아무 일 없음'], ['loss', '두 번째로 보낸 것이 사라짐'], ['reorder', '두 번째 것이 세 번째 것보다 늦게 도착']], show: function (c) { return !!c.recv; } },
  ],
  fix: function (c) { return !c.recv && c.net !== 'ok' ? { net: 'ok' } : null; },
  presets: [
    { t: '처음 설정으로', q: '받는 프로그램이 9000번 포트에서 기다릴 때 TCP로 세 번에 나눠 보내면 받는 쪽도 세 번에 나뉘어 읽나', d: 'TCP. 세 번에 나눠 보냈는데 받는 쪽은 한 덩어리로 읽습니다.', v: { proto: 'tcp', recv: true, net: 'ok' } },
    { t: '같은 것을 UDP로', q: '보내는 방식을 UDP로 바꾸면', d: '보낸 덩어리 그대로 세 개가 도착합니다.', v: { proto: 'udp', recv: true, net: 'ok' } },
    { t: '받는 프로그램 없이 UDP로', q: '보내는 방식을 UDP로 바꾸고 9000번 포트에서 기다리던 받는 프로그램을 없애면', d: '보내기는 세 번 다 성공합니다. 데이터는 사라집니다.', v: { proto: 'udp', recv: false, net: 'ok' } },
    { t: '받는 프로그램 없이 TCP로', q: 'TCP인데 9000번 포트에서 기다리던 받는 프로그램을 없애면', d: '연결부터 실패해서 아무것도 보내지 못합니다.', v: { proto: 'tcp', recv: false, net: 'ok' } },
    { t: 'UDP에서 하나가 사라지면', q: 'UDP로 보내는데 가는 길에서 두 번째로 보낸 것이 사라지면', d: '빠진 채로 받고, 보낸 쪽은 모릅니다.', v: { proto: 'udp', recv: true, net: 'loss' } },
    { t: 'UDP에서 순서가 바뀌면', q: 'UDP로 보내는데 두 번째 것이 세 번째 것보다 늦게 도착하면', d: '도착한 순서대로 받습니다.', v: { proto: 'udp', recv: true, net: 'reorder' } },
    { t: 'TCP에서 하나가 사라지면', q: 'TCP인데 가는 길에서 두 번째로 보낸 것이 사라지면', d: '운영체제가 다시 보내서 채웁니다. 프로그램은 모릅니다.', v: { proto: 'tcp', recv: true, net: 'loss' } },
  ],
  code: function (c) {
    if (c.proto === 'tcp') return '// Node.js (net 모듈): TCP\nconst socket = net.connect(9000, \'127.0.0.1\');   // 먼저 연결을 맺는다\nsocket.on(\'connect\', async () => {               // 연결된 뒤에야 보낼 수 있다\n  socket.write(\'AB\');  await sleep(50);           // 0.05초 간격으로 세 번\n  socket.write(\'CD\');  await sleep(50);\n  socket.write(\'EF\');\n});\nsocket.on(\'error\', e => console.log(e.code));    // 연결 실패는 여기로 온다\n\n' + (c.recv ? '// 받는 프로그램: 세 번이 다 도착한 뒤에 읽기 시작한다\nnet.createServer({ pauseOnConnect: true }, conn => {\n  conn.on(\'data\', d => console.log(d.toString()));\n  setTimeout(() => conn.resume(), 500);\n}).listen(9000, \'127.0.0.1\');' : '// 받는 프로그램은 띄우지 않았다 (9000번 포트를 듣는 프로그램이 없다)');
    return '// Node.js (dgram 모듈): UDP\nconst socket = dgram.createSocket(\'udp4\');       // 연결하는 코드가 없다\nconst done = err => console.log(err);            // null이면 오류 없이 보냈다는 뜻\nsocket.send(\'AB\', 9000, \'127.0.0.1\', done);  await sleep(50);\nsocket.send(\'CD\', 9000, \'127.0.0.1\', done);  await sleep(50);\nsocket.send(\'EF\', 9000, \'127.0.0.1\', done);\n\n' + (c.recv ? '// 받는 프로그램: 세 번이 다 도착한 뒤에 읽기 시작한다\nconst receiver = dgram.createSocket(\'udp4\');\nreceiver.on(\'message\', m => console.log(m.toString()));\nreceiver.bind(9000, \'127.0.0.1\');' : '// 받는 프로그램은 띄우지 않았다 (9000번 포트를 듣는 프로그램이 없다)');
  },
  label: function (c) { return c.proto.toUpperCase() + ' · 받는 프로그램 ' + (c.recv ? '있음' : '없음') + (c.recv ? ' · ' + { ok: '아무 일 없음', loss: '두 번째 것 유실', reorder: '두 번째 것이 늦게 도착' }[c.net] : ''); },
  columns: ['보내기 전 연결', '보내는 쪽이 본 결과', '받는 프로그램이 읽은 것', '보낸 것과 비교'],
  PARTS: ['AB', 'CD', 'EF'],
  // 받는 프로그램이 읽게 되는 덩어리들. TCP는 바이트가 이어져 한 덩어리, UDP는 도착한 데이터그램 그대로.
  received: function (c) {
    if (!c.recv) return [];
    if (c.proto === 'tcp') return [this.PARTS.join('')];
    return c.net === 'loss' ? ['AB', 'EF'] : c.net === 'reorder' ? ['AB', 'EF', 'CD'] : ['AB', 'CD', 'EF'];
  },
  simulate: function (c) {
    var tcp = c.proto === 'tcp', on = !!c.recv, net = on ? c.net : 'ok', P = this.PARTS, got = this.received({ proto: c.proto, recv: on, net: net }), ev = [], sum = [];
    var st = { conn: '', sent: [0, 0, 0], buf: [], held: '', read: [], late: false };   // sent: 0 아직, 1 도착, 2 사라짐, 3 가는 중
    function push(s, k) { ev.push({ s: s, k: k, snap: JSON.parse(JSON.stringify(st)) }); }
    function put(x) { if (tcp) st.buf = [(st.buf[0] || '') + x]; else st.buf.push(x); }
    var call = function (i) { return tcp ? 'socket.write(\'' + P[i] + '\')' : 'socket.send(\'' + P[i] + '\', 9000, \'127.0.0.1\')'; };
    if (tcp) {
      if (!on) {
        st.conn = 'fail';
        push('net.connect(9000, \'127.0.0.1\'): TCP는 데이터를 보내기 전에 먼저 연결을 맺습니다. 그런데 9000번 포트에서 기다리는 프로그램이 없어 연결이 거절되고, 보내는 쪽은 ECONNREFUSED 오류를 받습니다.', 'bad');
        push('socket.write는 실행되지 않습니다. 코드에서 \'connect\' 이벤트가 온 뒤에 보내도록 했는데 연결이 맺어지지 않았기 때문입니다. 받을 상대가 없다는 것을 보내기 전에 알게 됩니다.', '');
      } else {
        st.conn = 'ok';
        push('net.connect(9000, \'127.0.0.1\'): TCP는 데이터를 보내기 전에 먼저 연결을 맺습니다(3-way handshake). 받는 프로그램이 9000번 포트에서 기다리고 있으므로 성공합니다. 이제 양쪽 운영체제가 이 연결로 오가는 바이트에 번호를 붙여 관리합니다.', 'good');
      }
    } else {
      st.conn = 'none';
      push('dgram.createSocket(\'udp4\'): UDP에는 연결을 맺는 절차가 없습니다. 소켓을 만들기만 하면 바로 보낼 수 있고, 받는 쪽이 준비됐는지는 확인하지 않습니다.', '');
    }
    if (!tcp || on) {
      for (var i = 0; i < 3; i++) {
        var what = tcp ? '2바이트' : '데이터그램 하나(2바이트)';
        if (!on) { st.sent[i] = 2; push(call(i) + ': ' + (i === 0 ? what + '를 보냅니다. send의 콜백에는 오류가 없다고 나옵니다. 그런데 9000번 포트를 듣는 프로그램이 없어, 받는 쪽 운영체제가 이 데이터그램을 버립니다. "오류 없음"은 운영체제가 내보냈다는 뜻일 뿐, 상대가 받았다는 뜻이 아닙니다.' : '같은 일이 되풀이됩니다. 보내기는 오류 없이 끝나고, 데이터그램은 받는 쪽에서 버려집니다.'), 'bad'); continue; }
        if (i === 1 && net === 'loss') {
          st.sent[i] = 2;
          push(call(i) + ': ' + what + '를 보냈지만 가는 길에 사라졌습니다. ' + (tcp ? '보내는 프로그램의 write는 그대로 성공합니다. 사라진 것을 알아채고 처리하는 일은 프로그램이 아니라 운영체제의 TCP가 맡습니다.' : 'send의 콜백에는 오류가 없다고 나옵니다. UDP는 받았다는 확인을 주고받지 않으므로 보내는 쪽은 사라진 줄 모릅니다.'), 'bad'); continue;
        }
        if (i === 1 && net === 'reorder') { st.sent[i] = 3; push(call(i) + ': ' + what + '를 보냈는데, 가는 길이 막혀 아직 도착하지 않았습니다. 인터넷에서는 뒤에 보낸 것이 다른 길로 먼저 도착하기도 합니다.', ''); continue; }
        st.sent[i] = 1;
        var behind = i === 2 && net !== 'ok';
        if (tcp && behind) {
          st.held = P[i];
          push(call(i) + ': 2바이트가 도착했습니다. 그런데 받는 쪽 운영체제는 번호를 보고 앞의 2바이트(\'CD\')가 아직 오지 않았다는 것을 압니다. 그래서 \'EF\'를 따로 보관만 하고, 프로그램이 읽을 수 있는 자리에는 넣지 않습니다.', '');
        } else {
          put(P[i]);
          push(call(i) + ': ' + what + '가 받는 쪽 운영체제에 도착해 수신 버퍼에 쌓입니다. ' + (i === 0 ? '받는 프로그램은 아직 읽지 않았으므로 운영체제가 맡아 둡니다. ' : '') + (tcp ? (i === 0 ? 'TCP의 버퍼는 바이트가 차례로 쌓이는 한 줄입니다.' : i === 1 ? '앞의 바이트 바로 뒤에 이어 붙습니다. 어디까지가 한 번의 write였는지는 기록되지 않습니다.' : '역시 앞의 바이트 뒤에 이어 붙어, 버퍼에는 6바이트가 한 줄로 놓입니다.') :(i === 0 ? 'UDP의 버퍼에는 데이터그램이 하나씩 따로 담깁니다.' : behind && net === 'reorder' ? '두 번째 것보다 먼저 도착했으므로 \'AB\' 다음 자리에 담깁니다.' : '앞의 데이터그램과 섞이지 않고 따로 담깁니다.')), '');
        }
      }
      if (on && net === 'loss' && tcp) { st.sent[1] = 1; st.buf = ['ABCDEF']; st.held = ''; push('보내는 쪽 운영체제: \'CD\'를 받았다는 확인 응답이 오지 않자 \'CD\'를 다시 보냅니다(재전송). 받는 쪽 운영체제는 빈자리를 채우고 보관해 둔 \'EF\'를 이어 붙입니다. 이 과정에서 프로그램의 코드는 아무 일도 하지 않습니다.', 'good'); }
      if (on && net === 'reorder') {
        st.sent[1] = 1; st.late = true;
        if (tcp) { st.buf = ['ABCDEF']; st.held = ''; push('늦게 출발한 \'CD\'가 도착했습니다. 받는 쪽 운영체제가 번호 순서대로 \'AB\' 뒤에 \'CD\'를 놓고, 보관해 둔 \'EF\'를 그 뒤에 이어 붙입니다.', 'good'); }
        else { st.buf.push('CD'); push('늦게 출발한 \'CD\'가 도착했습니다. UDP에는 순서를 나타내는 번호가 없으므로, 받는 쪽 운영체제는 도착한 순서대로 \'EF\' 뒤에 담습니다.', 'bad'); }
      }
      if (on) {
        st.read = got.slice();
        if (tcp) push('받는 프로그램이 읽습니다: \'data\' 이벤트 한 번에 6바이트 "ABCDEF"가 모두 나옵니다. 세 번에 나눠 보냈다는 흔적은 없습니다. TCP가 전하는 것은 순서가 맞는 바이트의 흐름이지, 덩어리의 경계가 아닙니다.', 'good');
        else push('받는 프로그램이 읽습니다: \'message\' 이벤트가 ' + got.length + '번 오고, 한 번에 데이터그램 하나씩(' + got.map(function (x) { return '\'' + x + '\''; }).join(', ') + ') 나옵니다. 여러 개가 버퍼에 함께 쌓여 있었어도 서로 합쳐지지 않습니다.' + (net === 'loss' ? ' \'CD\'는 끝내 오지 않습니다. UDP는 다시 보내 주지 않습니다.' : net === 'reorder' ? ' 보낸 순서가 아니라 도착한 순서입니다.' : ''), net === 'ok' ? 'good' : 'bad');
      } else push('받는 프로그램이 없으므로 세 데이터그램은 모두 사라졌습니다. 보내는 쪽 프로그램은 오류를 하나도 받지 못했으므로 이 사실을 알 방법이 없습니다.', 'bad');
    }
    var q = function (a) { return a.map(function (x) { return '"' + x + '"'; }).join(', '); };
    var same = !on ? (tcp ? '아무것도 보내지 않음' : '모두 사라짐') : tcp ? '내용과 순서는 같고 경계는 사라짐' : { ok: '보낸 그대로', loss: '하나가 빠짐', reorder: '순서가 바뀜' }[net];
    var row = [tcp ? (on ? '맺음 (성공)' : '실패 (ECONNREFUSED)') : '없음', tcp ? (on ? 'write 3번 성공' : '보내지 못함') : 'send 3번 모두 오류 없음', got.length ? q(got) + ' ' + ['', '한', '두', '세'][got.length] + ' 덩어리' : '없음', same];
    if (tcp && on) sum.push('TCP는 바이트의 흐름(스트림)입니다. 순서와 내용은 지켜 주지만 write를 몇 번에 나눠 했는지는 전하지 않습니다. 그래서 TCP 위에서 메시지를 주고받는 프로그램은 "어디까지가 메시지 하나인지"를 스스로 정합니다. 길이를 먼저 적어 보내거나(HTTP의 Content-Length), 줄바꿈 같은 구분 글자를 씁니다.');
    if (tcp && on && net === 'ok') sum.push('이 실습은 받는 프로그램이 늦게 읽는 경우입니다. 도착하자마자 읽으면 보낸 대로 세 번에 나뉘어 읽히기도 하지만, 그렇게 된다는 보장은 없습니다. "write 한 번이 read 한 번"이라고 가정한 코드는 내 컴퓨터에서는 돌다가 실제 환경에서 깨집니다.');
    if (tcp && on && net !== 'ok') sum.push('TCP에서는 가는 길에 사라지거나 순서가 바뀌어도 운영체제가 번호와 확인 응답으로 바로잡은 뒤에 프로그램에 넘깁니다. 프로그램이 읽는 결과는 아무 일 없을 때와 같습니다. 그 대신 빈자리가 채워질 때까지 뒤에 온 데이터도 기다려야 합니다. 재전송의 자세한 과정은 "TCP 연결과 재전송" 실습에서 볼 수 있습니다. 이 경우는 이 PC에서 일부러 만들 수 없어 실행으로 확인하지 못했고, TCP 표준의 설명을 따랐습니다.');
    if (tcp && !on) sum.push('TCP는 연결을 맺는 단계에서 상대가 없다는 것을 알게 됩니다.');
    if (!tcp && on && net === 'ok') sum.push('UDP는 보낸 덩어리(데이터그램)의 경계를 지킵니다. send 한 번이 받는 쪽의 message 한 번입니다. 다만 이것은 가는 길에 아무 일이 없었을 때의 이야기입니다.');
    if (!tcp && on && net !== 'ok') sum.push('UDP는 빠진 것을 다시 보내지 않고 순서도 맞춰 주지 않습니다. 필요하면 프로그램이 직접 번호를 붙이고 확인하고 다시 보내야 합니다. HTTP/3이 쓰는 QUIC이 UDP 위에 그런 기능을 직접 만든 예입니다.');
    if (!tcp && !on) sum.push('UDP의 send가 성공했다는 것은 운영체제가 데이터그램을 내보냈다는 뜻일 뿐입니다. 상대 프로그램이 없어도, 가는 길에 사라져도 보내는 쪽은 알지 못합니다.');
    sum.push(tcp ? 'TCP는 하나라도 빠지거나 순서가 바뀌면 안 되는 곳에 씁니다. 웹(HTTP/1.1, HTTP/2), DB 연결, 파일 전송, 메일이 TCP 위에서 동작합니다.' : 'UDP는 조금 빠져도 괜찮고 늦게 오는 것이 더 곤란한 곳, 또는 짧게 한 번 묻고 답하는 곳에 씁니다. 실시간 음성과 영상, 게임, DNS 조회가 대표적입니다.');
    return { events: ev, summary: sum, row: row };
  },
  render: function (v, sim, t, H, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : null, P = this.PARTS;
    if (!s) { H.text(v, '실행을 누르면 한 단계씩 진행합니다.'); return; }
    H.table(v, ['보낸 것', '어떻게 됐나'], P.map(function (x, i) { var z = s.sent[i]; return { cells: ['"' + x + '"', z === 0 ? '아직 보내지 않음' : z === 1 ? { v: '받는 쪽 운영체제에 도착', cls: 'good' } : z === 2 ? { v: '사라짐', cls: 'bad' } : { v: '가는 중 (늦어짐)', cls: 'hot' }] }; }), '보내는 쪽이 보낸 세 덩어리');
  },
  // 그림: 왼쪽은 보내는 프로그램이 보낸 세 덩어리, 가운데는 받는 쪽 운영체제의 수신 버퍼, 오른쪽은 받는 프로그램이 읽은 것. TCP는 가운데에서 한 줄로 합쳐지고 UDP는 따로 남는다.
  draw: function (P, sim, shown) {
    var c = sim.c, tcp = c.proto === 'tcp', on = !!c.recv, last = shown[shown.length - 1], s = last ? last.snap : { conn: '', sent: [0, 0, 0], buf: [], held: '', read: [], late: false }, parts = this.PARTS;
    P.size(680, 318);
    P.region('sd', 16, 16, 176, 236, '보내는 프로그램');
    P.region('os', 262, 16, 196, 236, on ? '받는 쪽 수신 버퍼' : '받는 쪽 컴퓨터');
    P.region('ap', 504, 16, 160, 236, '받는 프로그램');
    parts.forEach(function (x, i) {
      var z = s.sent[i];
      P.box('s' + i, 30, 52 + i * 64, 148, 50, { cls: z === 0 ? 'ghost' : z === 1 ? 'wait' : z === 2 ? 'bad' : 'hot', title: (tcp ? 'write' : 'send') + ' "' + x + '"', sub: z === 0 ? '아직' : z === 1 ? '도착' : z === 2 ? '사라짐' : '가는 중' });
    });
    if (!on) {
      P.box('none', 276, 100, 168, 60, { cls: s.conn === 'fail' || s.sent[0] === 2 ? 'bad' : 'ghost', title: '9000번 포트', sub: '듣는 프로그램 없음' });
      P.text('noapp', 584, 136, '실행하지 않음', { cls: 'mut', anchor: 'middle' });
      parts.forEach(function (x, i) { if (s.sent[i] === 2) P.arrow('a' + i, 's' + i + ':r', 'none:l:' + (0.25 * (i + 1)), { cls: 'bad dash', label: '버려짐' }); });
      if (s.conn === 'fail') P.arrow('cf', 's0:r', 'none:l', { cls: 'bad dash', label: '연결 거절' });
    } else if (tcp) {
      var str = s.buf[0] || '';
      P.box('buf', 276, 52, 168, 60, { cls: str ? 'wait' : 'ghost', title: str ? '"' + str + '"' : '(비어 있음)', sub: str ? str.length + '바이트가 한 줄로' : '바이트가 쌓일 자리' });
      if (s.held) P.box('held', 276, 136, 168, 50, { cls: 'hot', title: '"' + s.held + '"', sub: '앞이 비어 보관 중' });
      parts.forEach(function (x, i) { var z = s.sent[i]; if (z === 1) P.arrow('a' + i, 's' + i + ':r', (s.held === x ? 'held' : 'buf') + ':l' + (s.held === x ? '' : ':' + (0.25 * (i + 1)))); if (z === 2) P.arrow('a' + i, [178, 77 + i * 64], [228, 77 + i * 64], { cls: 'bad dash', label: '유실' }); });
      if (s.read.length) { P.box('r0', 518, 52, 132, 60, { cls: 'good', title: '"' + s.read[0] + '"', sub: '읽기 한 번' }); P.arrow('rd', 'buf:r', 'r0:l', { cls: 'good' }); }
    } else {
      s.buf.forEach(function (x, k) { P.box('d' + x, 276, 52 + k * 64, 168, 50, { cls: 'wait', title: '"' + x + '"', sub: '데이터그램 ' + (k + 1) }); });
      if (!s.buf.length) P.box('emp', 276, 52, 168, 50, { cls: 'ghost', title: '(비어 있음)', sub: '데이터그램이 담길 자리' });
      parts.forEach(function (x, i) { var z = s.sent[i]; if (z === 1) P.arrow('a' + i, 's' + i + ':r', 'd' + x + ':l'); if (z === 2) P.arrow('a' + i, [178, 77 + i * 64], [228, 77 + i * 64], { cls: 'bad dash', label: '유실' }); });
      s.read.forEach(function (x, k) { P.box('r' + x, 518, 52 + k * 64, 132, 50, { cls: 'good', title: '"' + x + '"', sub: '읽기 ' + (k + 1) + '번째' }); P.arrow('rd' + x, 'd' + x + ':r', 'r' + x + ':l', { cls: 'good' }); });
    }
    if (on && !s.read.length) P.text('noread', 584, 136, '아직 읽지 않음', { cls: 'mut', anchor: 'middle' });
    P.box('cn', 16, 268, 320, 34, { cls: s.conn === 'ok' ? 'good' : s.conn === 'fail' ? 'bad' : s.conn === 'none' ? 'plain' : 'ghost', title: '보내기 전 연결', right: { '': '아직', ok: '맺음', fail: 'ECONNREFUSED', none: '없음 (UDP)' }[s.conn] });
    P.box('rs', 344, 268, 320, 34, { cls: s.read.length ? (sim.row[3] === '보낸 그대로' || tcp ? 'good' : 'bad') : 'ghost', title: '읽기 횟수', right: s.read.length ? s.read.length + '번' : '0번' });
    P.note(tcp ? 'TCP는 받는 쪽 버퍼에서 바이트가 한 줄로 이어지므로, 보낸 쪽이 몇 번에 나눠 보냈는지가 남지 않습니다. 순서와 빠짐은 운영체제가 번호로 바로잡습니다.' : 'UDP는 보낸 덩어리(데이터그램)가 하나씩 따로 도착해 따로 읽힙니다. 가는 길에 사라지거나 순서가 바뀌어도 운영체제가 바로잡지 않습니다.');
  },
  assume: '"AB", "CD", "EF"를 0.05초 간격으로 보내고 받는 프로그램은 세 번이 다 도착한 뒤에 읽는 상황입니다. 여덟 가지 조합 가운데 여섯 가지를 이 PC(윈도, Node.js 24)의 127.0.0.1에서 net과 dgram 모듈로 실제로 실행해 대조했습니다(조합마다 다섯 번 실행해 매번 같은 결과). UDP의 유실과 순서 바뀜은 보내는 쪽과 받는 쪽 사이에 데이터그램을 버리거나 늦게 넘기는 중계 프로그램을 두어 만들었고, 양 끝의 UDP 소켓이 이를 바로잡지 않는다는 것을 확인했습니다. TCP에서 유실과 순서 바뀜이 일어난 두 가지 조합은 이 PC에서 만들 수 없어 실행하지 않았으며, TCP 표준(RFC 9293 3.4절의 순서 번호, 3.8절의 확인 응답과 재전송)에 따라 "프로그램이 읽는 결과는 아무 일 없을 때와 같다"고 적었습니다. TCP에서 한 번의 읽기로 6바이트가 모두 나온 것은 이 PC에서 본 결과이고, 표준이 보장하는 것은 바이트의 순서와 내용뿐입니다. 읽기가 몇 번으로 나뉘는지는 상황에 따라 달라집니다. UDP가 데이터그램 단위로 전하고 도착을 보장하지 않는다는 것은 RFC 768과 RFC 1122 4.1절의 내용입니다. UDP 헤더에는 순서를 나타내는 번호가 없고(RFC 768), 그 아래의 IP도 순서를 지켜 주지 않습니다(RFC 791 1.2절). 받는 프로그램이 없을 때 운영체제가 ICMP 메시지로 알려 주기도 하지만, 이 실행에서 send의 결과나 오류 이벤트로 돌아온 것은 없었습니다. 운영체제의 버퍼가 가득 차서 버려지는 경우는 다루지 않았습니다.',
});

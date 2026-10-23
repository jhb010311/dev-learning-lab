Lab.register({
  id: 'tcp_basic', nav: 'TCP 연결', cat: '기초개념', mode: 'step', basic: true, deep: ['tcp', 'udp'],
  title: '연결을 맺는다는 것은 무엇이고, 연결 없이 보내면 어떻게 되는가',
  why: '네트워크로 보낸 데이터는 도중에 없어지거나 차례가 뒤바뀌어 도착할 수 있다. TCP는 먼저 연결을 맺어 상대가 받을 준비가 되었는지 확인하고, 보낸 조각마다 받았다는 답을 받아 답이 없으면 다시 보내며, 조각에 붙인 번호로 차례를 맞춘다. 그래서 프로그램은 이런 확인을 직접 하지 않아도 된다.',
  use: '브라우저가 8080번 포트의 스프링 부트 서버에 요청을 보내는 것, 자바 프로그램이 JDBC 드라이버로 MySQL의 3306번 포트에 붙는 것이 모두 TCP 연결 위에서 일어난다. 개발자가 Socket을 직접 쓰는 일은 드물지만, 이런 라이브러리가 하는 일의 바닥에는 이 실습의 연결 맺기와 주고받기가 있다. 그래서 Connection refused 오류가 나면 그 포트에서 기다리는 프로그램이 없는지부터 본다. 온라인 게임이나 영상 통화처럼 조금 없어지더라도 빨리 닿는 것이 중요한 곳에서는 UDP를 쓰기도 한다.',
  intro: '두 프로그램이 네트워크로 바이트를 주고받는 규칙에는 TCP와 UDP가 있고, 자바는 둘 다 java.net 패키지의 클래스로 줍니다. TCP는 ServerSocket과 Socket으로 씁니다. 받는 쪽은 new ServerSocket(9000)으로 9000번 포트를 열고 accept()로 연결을 기다리며, 보내는 쪽은 new Socket("localhost", 9000)으로 연결을 맺은 뒤 getOutputStream()으로 얻은 출력 스트림에 바이트를 씁니다. 연결은 받는 쪽 프로그램이 그 포트에서 기다리고 있을 때만 맺어지고, 맺어진 연결로 보낸 바이트는 보낸 차례대로 도착합니다. UDP는 DatagramSocket과 DatagramPacket으로 씁니다. 연결하는 줄이 없고, 글자마다 보낼 곳을 적은 DatagramPacket을 send로 그냥 내보냅니다. 이 실습은 보내는 방식을 TCP와 UDP로 바꾸고 받는 쪽 프로그램을 띄우거나 띄우지 않으면서, 두 프로그램이 무엇을 출력하는지 봅니다. 코드 칸은 프로그램마다 main 메서드 안의 줄만 보이고(클래스·main 선언과 import는 생략), 9000이라는 번호는 예시입니다. localhost는 이 컴퓨터 자신을 가리키는 이름입니다. 포트 번호와 연결 거부 자체는 "IP 주소와 포트" 실습에서 다루고, 이 실습은 연결을 맺고 보내는 TCP와 연결 없이 보내는 UDP의 차이를 봅니다.',
  terms: ['TCP와 UDP', 'TCP 연결', 'ServerSocket과 Socket', 'DatagramSocket과 DatagramPacket', '연결 거부 오류', 'UDP로 보내기와 도착 확인'],
  controls: [
    { id: 'proto', label: '보내는 방식', type: 'select', value: 'tcp', options: [['tcp', 'TCP로 연결한 뒤 보낸다 (ServerSocket과 Socket)'], ['udp', 'UDP로 연결 없이 보낸다 (DatagramSocket)']] },
    { id: 'listen', label: '받는 쪽 프로그램이 9000번 포트에서 기다린다', type: 'check', value: true },
  ],
  // q는 물음 방식의 화면에 보이는 물음, t와 d는 글로만 읽는 본문에 쓰이는 이름과 설명
  presets: [
    { t: '처음 설정으로', q: 'TCP 연결은 자바 코드에서 어떻게 생겼고, 받는 쪽이 9000번 포트에서 기다릴 때 A, B, C를 보내면 무슨 일이 일어나나', d: '받는 쪽의 accept()와 보내는 쪽의 new Socket으로 연결이 맺어지고, 보낸 A, B, C가 보낸 차례대로 도착해 받는 쪽이 "받은 글: ABC"를 출력합니다.', v: { proto: 'tcp', listen: true } },
    { t: '받는 쪽이 기다리지 않으면', q: '받는 쪽 프로그램을 띄우지 않아 9000번 포트에서 기다리는 프로그램이 없을 때 TCP로 연결하면', d: 'new Socket 줄에서 java.net.ConnectException(Connection refused)이 곧바로 나고, 글자는 하나도 보내지지 않습니다.', v: { proto: 'tcp', listen: false } },
    { t: 'UDP로 바꿔 보내면', q: 'Socket 대신 DatagramSocket으로 바꿔 연결 없이 UDP로 보내면', d: '연결하는 줄 없이 글자마다 send로 보내고, 받는 쪽은 receive 한 번에 글자 하나씩 받습니다. 보내는 쪽은 "보내기 끝"만 출력합니다.', v: { proto: 'udp', listen: true } },
    { t: '받는 쪽이 없는데 UDP로 보내면', q: '받는 쪽 프로그램을 띄우지 않고 UDP로 보내면', d: '보내는 쪽은 예외 없이 "보내기 끝"을 출력하고 끝납니다. 받는 쪽이 있을 때와 출력이 같아서, 글자가 닿았는지 보내는 쪽은 알 수 없습니다.', v: { proto: 'udp', listen: false } },
  ],
  // 화면의 코드: 받는 쪽 프로그램(띄울 때만), 보내는 쪽 프로그램. verify/net/TcpBasicProbe.java가 이 글 그대로 컴파일해 실행한다.
  TCP_RECEIVER: ['// 받는 쪽 프로그램: 9000번 포트를 TCP로 열고 연결을 기다린다', 'ServerSocket server = new ServerSocket(9000);', 'Socket conn = server.accept();', 'String text = new String(conn.getInputStream().readAllBytes(), "UTF-8");', 'System.out.println("받은 글: " + text);'],
  TCP_SENDER: ['// 보내는 쪽 프로그램: localhost의 9000번 포트에 TCP로 연결한 뒤 보낸다', 'Socket socket = new Socket("localhost", 9000);', 'OutputStream out = socket.getOutputStream();', 'out.write("A".getBytes("UTF-8"));', 'out.write("B".getBytes("UTF-8"));', 'out.write("C".getBytes("UTF-8"));', 'socket.close();', 'System.out.println("보내기 끝");'],
  UDP_RECEIVER: ['// 받는 쪽 프로그램: 9000번 포트를 UDP로 열고 글을 기다린다', 'DatagramSocket server = new DatagramSocket(9000);', 'for (int i = 0; i < 3; i++) {', '    DatagramPacket packet = new DatagramPacket(new byte[100], 100);', '    server.receive(packet);', '    System.out.println("받은 글: " + new String(packet.getData(), 0, packet.getLength(), "UTF-8"));', '}'],
  UDP_SENDER: ['// 보내는 쪽 프로그램: 연결하지 않고 localhost의 9000번 포트로 글을 하나씩 보낸다', 'DatagramSocket socket = new DatagramSocket();', 'InetSocketAddress to = new InetSocketAddress("localhost", 9000);', 'socket.send(new DatagramPacket("A".getBytes("UTF-8"), 1, to));', 'socket.send(new DatagramPacket("B".getBytes("UTF-8"), 1, to));', 'socket.send(new DatagramPacket("C".getBytes("UTF-8"), 1, to));', 'socket.close();', 'System.out.println("보내기 끝");'],
  code: function (c) {
    var tcp = c.proto === 'tcp', parts = ['// 프로그램마다 main 메서드 안의 줄만 보임 (클래스·main 선언과 import는 생략)'];
    if (c.listen) parts.push((tcp ? this.TCP_RECEIVER : this.UDP_RECEIVER).join('\n'));
    parts.push((tcp ? this.TCP_SENDER : this.UDP_SENDER).join('\n'));
    return parts.join('\n\n');
  },
  label: function (c) { return c.proto.toUpperCase() + ' · 받는 쪽 프로그램 ' + (c.listen ? '있음' : '없음'); },
  columns: ['보내는 쪽에 나온 것', '받는 쪽 출력', '보내는 쪽이 받는 쪽이 있는지 아는가'],
  simulate: function (c) {
    var tcp = c.proto === 'tcp', on = !!c.listen, ev = [], sum = [], P = tcp ? 'TCP' : 'UDP';
    var st = {
      sndSub: ['시작 전'], sndc: 'plain', doorSub: ['열어 둔', '프로그램 없음'], doorc: 'ghost', rcvSub: on ? ['시작 전'] : ['띄우지 않음'], rcvc: on ? 'plain' : 'ghost',
      a1: '', a2: '', a3: '', conn: '아직', connc: 'ghost', n1: '아직', n1c: 'ghost', n2: '아직', n2c: 'ghost', log: []
    };
    function push(s, k) { ev.push({ s: s, k: k, snap: JSON.parse(JSON.stringify(st)) }); }
    function log(who, what) { st.log.push([who, what]); }
    var r1, r2, r3, KNOW = '알 수 없다 (받는 쪽이 있을 때와 없을 때 출력이 같음)';
    // 받는 쪽 프로그램
    if (on) {
      st.doorc = 'good'; st.doorSub = ['9000번 포트', P + '로 열려 있음']; st.rcvc = 'hot';
      if (tcp) {
        st.rcvSub = ['ServerSocket', '9000번을 엶'];
        log('받는 쪽', 'new ServerSocket(9000): 9000번 포트를 TCP로 엶');
        push('받는 쪽 프로그램이 new ServerSocket(9000) 줄을 실행합니다. ServerSocket은 자바가 주는 클래스(java.net.ServerSocket)이고, 이 줄은 운영체제에 "이 컴퓨터의 9000번 포트로 TCP 연결이 오면 나에게 달라"고 맡겨 두는 것입니다. 보내는 쪽 프로그램은 아직 아무것도 하지 않았습니다.', '');
        st.rcvc = 'wait'; st.rcvSub = ['accept()에서', '연결을 기다림'];
        log('받는 쪽', 'server.accept(): 연결이 올 때까지 기다림');
        push('server.accept() 줄을 실행합니다. accept는 연결이 하나 올 때까지 기다리는 메서드여서, 받는 쪽 프로그램은 이 줄에서 멈춘 채 연결을 기다립니다. TCP의 받는 쪽은 글자보다 먼저 연결을 받습니다.', '');
      } else {
        st.rcvSub = ['DatagramSocket', '9000번을 엶'];
        log('받는 쪽', 'new DatagramSocket(9000): 9000번 포트를 UDP로 엶');
        push('받는 쪽 프로그램이 new DatagramSocket(9000) 줄을 실행합니다. DatagramSocket은 자바가 주는 UDP용 클래스(java.net.DatagramSocket)이고, 이 줄은 운영체제에 "9000번 포트로 UDP 글이 오면 나에게 달라"고 맡겨 두는 것입니다. TCP의 ServerSocket과 달리 accept()가 없습니다. UDP에는 연결을 받는 단계가 없기 때문입니다.', '');
        st.rcvc = 'wait'; st.rcvSub = ['receive()에서', '글을 기다림'];
        log('받는 쪽', 'server.receive(packet): 글이 올 때까지 기다림');
        push('for 문의 첫 바퀴에서 server.receive(packet) 줄을 실행합니다. DatagramPacket도 자바가 주는 클래스이고, 여기서는 받은 글을 적어 둘 100바이트 배열과 함께 만들었습니다. receive는 글이 하나 올 때까지 기다리는 메서드여서, 받는 쪽 프로그램은 이 줄에서 멈춥니다.', '');
      }
    } else {
      push('받는 쪽 프로그램은 띄우지 않았습니다. 이 컴퓨터에서 9000번 포트를 ' + P + '로 연 프로그램이 없습니다.', '');
    }
    if (tcp) {
      st.sndc = 'hot'; st.sndSub = ['new Socket', '연결을 요청'], st.a1 = 'hot'; st.conn = '연결을 맺는 중'; st.connc = 'hot';
      log('보내는 쪽', 'new Socket("localhost", 9000): TCP 연결을 요청');
      push('보내는 쪽 프로그램이 new Socket("localhost", 9000) 줄을 실행합니다. Socket은 자바가 주는 클래스(java.net.Socket)이고, 이 줄은 localhost(이 컴퓨터 자신, 검증 실행에서는 127.0.0.1)의 9000번 포트와 TCP 연결을 맺어 달라는 요청입니다. 연결이 맺어지거나 실패할 때까지 이 줄은 끝나지 않습니다. A, B, C는 아직 하나도 보내지 않았습니다.', '');
      if (on) {
        st.a2 = 'good'; st.conn = 'TCP 연결 맺어짐'; st.connc = 'good'; st.sndc = 'good'; st.sndSub = ['연결됨']; st.rcvc = 'good'; st.rcvSub = ['accept() 끝', '연결 1개를 받음']; st.doorc = 'good';
        log('받는 쪽', 'accept()가 끝나 conn이 연결 하나를 가리킴');
        push('9000번 포트에서 기다리는 프로그램이 있으므로 연결이 맺어집니다. 받는 쪽의 server.accept() 줄이 끝나며 이 연결로 주고받는 Socket 객체를 돌려주어, 변수 conn이 그 객체를 가리킵니다. 보내는 쪽의 new Socket 줄도 예외 없이 끝나 변수 socket이 연결된 Socket 객체를 가리킵니다. 이제 두 프로그램 사이에 TCP 연결이 하나 있습니다. 연결을 맺을 때 두 운영체제가 주고받는 확인 절차는 "세부 동작 실습: TCP 연결과 재전송"에서 다룹니다.', 'good');
        st.sndc = 'hot'; st.sndSub = ['A, B, C를', '차례로 씀']; st.a1 = 'good';
        log('보내는 쪽', 'getOutputStream()에 A, B, C를 씀, close()로 연결을 닫음');
        push('보내는 쪽이 socket.getOutputStream()으로 이 연결의 출력 스트림을 얻고, write 세 줄로 A, B, C를 차례로 씁니다. 받는 곳을 줄마다 적지 않습니다. 연결을 맺을 때 이미 상대가 정해졌기 때문입니다. 세 번 모두 예외 없이 끝났고, socket.close()로 연결을 닫은 뒤 "보내기 끝"을 출력합니다.', '');
        st.rcvSub = ['받은 글: ABC']; st.n2 = '받은 글: ABC'; st.n2c = 'good'; st.sndc = 'good'; st.sndSub = ['보내기 끝'];
        log('받는 쪽', 'getInputStream().readAllBytes(): ABC를 읽음');
        push('받는 쪽이 conn.getInputStream().readAllBytes()로 이 연결로 온 바이트를 읽습니다. readAllBytes는 상대가 연결을 닫을 때까지 온 바이트를 모두 읽는 메서드입니다. 읽은 글자는 보낸 차례 그대로인 ABC이고, "받은 글: ABC"를 출력합니다. TCP는 연결로 보낸 바이트가 빠짐없이 보낸 차례대로 도착하도록 맡아 주고, 중간에 없어진 조각은 다시 보냅니다(다시 보내는 모습은 이 실습에서 일으키지 않았습니다).', 'good');
        r1 = '보내기 끝'; r2 = '받은 글: ABC'; r3 = '안다 (연결이 맺어졌으니 받는 쪽이 있음)';
        st.n1 = r1; st.n1c = 'good';
        push('보내는 쪽에 나온 것은 "보내기 끝"입니다. TCP는 받는 쪽이 없으면 new Socket 줄에서 실패하므로, 이 줄이 예외 없이 끝났다는 것은 9000번 포트에서 받는 쪽 프로그램이 기다리고 있었다는 뜻입니다.', 'good');
        sum.push('TCP는 ServerSocket과 Socket으로 씁니다. 받는 쪽의 accept()와 보내는 쪽의 new Socket("localhost", 9000)이 만나 연결이 하나 맺어졌고, 그 연결의 출력 스트림에 쓴 A, B, C가 보낸 차례대로 도착해 받는 쪽이 "받은 글: ABC"를 출력했습니다.');
        sum.push('웹 브라우저와 스프링 부트 서버가 주고받는 HTTP도 이런 TCP 연결 위에서 오갑니다(RFC 9112 9절). 대조 실행에서 Socket으로 연결해 HTTP 요청 글을 쓰자 JDK의 HTTP 서버가 HTTP/1.1 200 OK로 답했습니다.');
      } else {
        st.a1 = 'bad'; st.a3 = 'bad'; st.conn = 'TCP 연결 실패'; st.connc = 'bad'; st.sndc = 'bad'; st.sndSub = ['ConnectException']; st.doorc = 'bad';
        log('운영체제', '연결을 거절함');
        log('보내는 쪽', 'new Socket 줄에서 ConnectException, 프로그램이 멈춤');
        push('9000번 포트를 TCP로 연 프로그램이 없어서 운영체제가 연결을 거절합니다. 자바가 new Socket 줄에서 java.net.ConnectException을 던지고, Windows 11에서 실행한 검증에서는 "Connection refused: connect"라고 나왔습니다. 거절한 것은 받는 쪽 프로그램이 아니라(프로그램이 없습니다) 이 컴퓨터의 운영체제이고, 예외는 기다림 없이 곧바로 왔습니다.', 'bad');
        r1 = 'java.net.ConnectException: Connection refused: connect ("보내기 끝"은 나오지 않음)'; r2 = '없음 (받는 쪽 프로그램을 띄우지 않음)'; r3 = '안다 (연결 거부 예외로 받는 쪽이 없음을 곧바로 앎)';
        st.n1 = 'ConnectException'; st.n1c = 'bad'; st.n2 = '없음'; st.n2c = 'bad';
        push('이 코드에는 예외를 처리하는 줄이 없어 보내는 쪽 프로그램은 new Socket 줄에서 멈춥니다. getOutputStream()과 write 세 줄은 실행되지 않았고, A, B, C는 하나도 나가지 않았으며 "보내기 끝"도 출력되지 않았습니다. TCP에서는 연결이 없으면 글자를 보낼 수 없습니다.', 'bad');
        sum.push('받는 쪽이 9000번 포트에서 기다리지 않으면 TCP 연결이 맺어지지 않고, 보내는 쪽은 new Socket 줄에서 java.net.ConnectException(Connection refused)을 곧바로 받습니다. 글자는 하나도 보내지지 않았습니다.');
        sum.push('TCP에서는 받는 쪽이 없다는 것을 글자를 보내기도 전에 예외로 알게 됩니다.');
      }
    } else {
      // UDP: 연결 없이 보낸다
      st.sndc = 'hot'; st.sndSub = ['DatagramSocket', '만듦']; st.conn = 'UDP는 연결을 맺지 않음'; st.connc = 'plain';
      log('보내는 쪽', 'new DatagramSocket(): 연결하는 줄 없음');
      push('보내는 쪽 프로그램이 new DatagramSocket() 줄을 실행합니다. 포트 번호를 주지 않았으므로 운영체제가 비어 있는 번호를 하나 붙여 줍니다. 다음 줄의 InetSocketAddress는 자바가 주는 클래스로, 보낼 곳(localhost의 9000번 포트)을 나타내며 변수 to가 가리킵니다. TCP의 new Socket과 달리 상대와 연결을 맺는 줄이 없고, 받는 쪽이 준비됐는지 확인하는 단계도 없습니다.', '');
      st.a1 = 'hot'; st.sndSub = ['send() 세 번', '예외 없음'];
      log('보내는 쪽', 'send() 세 번으로 A, B, C를 보냄 (세 번 모두 예외 없음), "보내기 끝"');
      push('socket.send 세 줄을 차례로 실행해 A, B, C를 보냅니다. 연결이 없으므로 DatagramPacket마다 보낼 곳 to를 함께 적습니다. 1은 보낼 글의 길이(1바이트)입니다. 세 번 모두 예외 없이 끝났고, socket.close() 뒤에 "보내기 끝"을 출력합니다.', '');
      r1 = '보내기 끝'; r3 = KNOW;
      if (on) {
        st.a1 = 'good'; st.a2 = 'good'; st.rcvSub = ['받은 글: A', '받은 글: B', '받은 글: C']; st.rcvc = 'good'; st.sndc = 'good'; st.sndSub = ['보내기 끝']; st.n2 = 'A / B / C (세 번 따로)'; st.n2c = 'good';
        log('받는 쪽', 'receive() 세 번: A, B, C를 하나씩 받음');
        push('받는 쪽의 receive가 글을 하나 받을 때마다 끝나고, for 문이 세 바퀴를 돌며 "받은 글: A", "받은 글: B", "받은 글: C"를 따로 출력합니다. UDP에서는 send 한 번에 보낸 글 하나가 receive 한 번에 하나씩 도착합니다. 검증 실행에서는 보낸 차례대로 도착했지만, DatagramSocket 문서는 여러 패킷이 어떤 차례로든 도착할 수 있다고 적고, UDP는 도착 자체도 보장하지 않습니다.', 'good');
        r2 = '받은 글: A / 받은 글: B / 받은 글: C';
        st.n1 = r1; st.n1c = 'plain';
        push('보내는 쪽에 나온 것은 "보내기 끝"뿐입니다. 이것은 글이 이 컴퓨터에서 나갔다는 뜻일 뿐, 받는 쪽이 받았다는 뜻이 아닙니다. 받는 쪽이 없을 때에도 보내는 쪽 출력은 똑같았습니다(대조 실행에서 확인).', '');
        sum.push('TCP를 UDP로 바꾸면 Socket 대신 DatagramSocket을 쓰고, 연결하는 줄이 사라지며 글자마다 보낼 곳을 적은 DatagramPacket을 send로 보냅니다. 받는 쪽이 기다리고 있어서 A, B, C가 receive 세 번에 하나씩 도착했습니다.');
        sum.push('보내는 쪽에 나온 것은 "보내기 끝"뿐이어서, 받는 쪽이 받았는지는 보내는 쪽이 알 수 없습니다. 받는 쪽이 없을 때에도 똑같이 "보내기 끝"입니다.');
      } else {
        st.a1 = 'dash bad'; st.sndc = 'plain'; st.sndSub = ['보내기 끝']; st.n2 = '없음'; st.n2c = 'bad'; st.doorc = 'bad';
        log('받는 쪽', '받은 글 없음 (받는 쪽 프로그램이 없음)');
        push('9000번 포트를 UDP로 연 프로그램이 없어서, 보낸 글을 받을 프로그램이 없습니다. A, B, C는 어디에도 전달되지 않았습니다. 그런데 보내는 쪽의 send 세 줄은 예외 없이 끝났고, 다른 알림도 오지 않았습니다.', 'bad');
        r2 = '없음 (받는 쪽 프로그램을 띄우지 않음)';
        st.n1 = r1; st.n1c = 'plain';
        push('보내는 쪽에 나온 것은 받는 쪽이 있을 때와 똑같은 "보내기 끝"입니다. 그래서 보내는 쪽 프로그램은 글이 도착했는지 사라졌는지 구분하지 못한 채 끝납니다.', 'bad');
        sum.push('받는 쪽이 없어도 DatagramSocket의 send는 예외 없이 끝나고 "보내기 끝"이 출력됩니다. 글은 어디에도 닿지 않았지만, 보내는 쪽은 아무 예외도 받지 못했습니다.');
        sum.push('TCP는 new Socket 줄에서 실패하지만 UDP에는 연결을 맺는 단계가 없어서, 받는 쪽이 없어도 보내는 쪽에는 실패가 드러나지 않습니다. UDP로 도착을 확인하려면 받는 쪽이 답을 돌려보내고 보내는 쪽이 그 답을 기다리는 코드를 직접 짜야 합니다.');
      }
    }
    return { events: ev, summary: sum, row: [r1, r2, r3] };
  },
  render: function (v, sim, t, H, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : null;
    if (!s) { H.text(v, '실행을 누르면 받는 쪽 프로그램이 포트를 여는 것부터 시작합니다.'); return; }
    if (s.log.length) H.table(v, ['누가', '무슨 일'], s.log.map(function (r) { return { cls: '', cells: [r[0], r[1]] }; }), '지금까지 있었던 일');
    H.table(v, ['항목', '값'], [
      { cls: s.n1c === 'ghost' ? 'gone' : '', cells: ['보내는 쪽에 나온 것', s.n1c === 'ghost' ? '아직' : { v: s.n1, cls: s.n1c === 'bad' ? 'bad' : s.n1c === 'good' ? 'good' : '' }] },
      { cls: s.n2c === 'ghost' ? 'gone' : '', cells: ['받는 쪽 출력', s.n2c === 'ghost' ? '아직' : { v: s.n2, cls: s.n2c === 'bad' ? 'bad' : 'good' }] },
    ], '결과');
  },
  // 그림: 왼쪽에 보내는 쪽 프로그램, 가운데에 9000번 포트, 오른쪽에 받는 쪽 프로그램. 보내는 글이 포트를 지나 받는 쪽에 닿는지, 포트에서 거절되어 돌아오는지(빨강), 받는 쪽 없이 사라지는지(빨강 점선)를 화살표로 보인다. 아래에 연결 상태와 결과 칸.
  draw: function (P, sim, shown) {
    var c = sim.c, last = shown[shown.length - 1], s = last ? last.snap : null, on = !!c.listen;
    P.size(680, 290);
    P.region('sr', 6, 16, 170, 162, '보내는 쪽');
    P.region('rr', 472, 16, 202, 162, '받는 쪽');
    P.box('snd', 16, 44, 150, 112, { cls: s ? s.sndc : 'plain', title: '프로그램', sub: s ? s.sndSub : ['시작 전'] });
    P.box('door', 232, 44, 170, 112, { cls: s ? s.doorc : 'ghost', title: '9000번 포트', sub: s ? s.doorSub : ['열어 둔', '프로그램 없음'] });
    P.box('rcv', 482, 44, 180, 112, { cls: s ? s.rcvc : (on ? 'plain' : 'ghost'), title: '프로그램', sub: s ? s.rcvSub : (on ? ['시작 전'] : ['띄우지 않음']) });
    if (s && s.a1) P.arrow('a1', 'snd:r:0.3', 'door:l:0.3', { cls: s.a1 });
    if (s && s.a2) P.arrow('a2', 'door:r:0.3', 'rcv:l:0.3', { cls: s.a2 });
    if (s && s.a3) P.arrow('a3', 'door:l:0.75', 'snd:r:0.75', { cls: s.a3 });
    P.box('conn', 16, 190, 650, 34, { cls: s ? s.connc : 'ghost', title: '연결', right: s ? s.conn : '아직' });
    P.box('n1', 16, 238, 322, 36, { cls: s ? s.n1c : 'ghost', title: '보내는 쪽에 나온 것', right: s ? s.n1 : '아직' });
    P.box('n2', 344, 238, 322, 36, { cls: s ? s.n2c : 'ghost', title: '받는 쪽 출력', right: s ? s.n2 : '아직' });
  },
  assume: '화면의 코드는 JDK 21.0.12.1(Windows 11)에서 그대로 컴파일해 실제로 실행했습니다(verify/net/TcpBasicProbe.java). 받는 쪽 프로그램과 보내는 쪽 프로그램은 서로 다른 자바 프로세스이고, 화면의 줄을 main 메서드 안에 그대로 두고 import java.io.OutputStream과 import java.net.*만 더했습니다. 받는 쪽에는 준비가 끝났음을 알리는 출력 한 줄을 더해, 받는 쪽이 포트를 연 뒤에 보내는 쪽을 띄웠습니다(이 줄은 결과에서 뺐습니다). 화면의 9000은 예시이고 실제 실행에서는 실행마다 TCP와 UDP 모두에서 비어 있는 다른 번호를 골랐으며, 시작 전에 그 번호로 TCP 연결해 보면 모두 거절되어 아무도 열지 않았음을 확인했습니다. 네 가지 조합을 조합마다 다섯 번씩 실행했고 다섯 번의 결과가 모두 같았습니다. 대조한 것은 보내는 쪽의 표준 출력과 표준 오류 첫 줄과 종료 코드, 받는 쪽의 표준 출력과 종료 코드입니다. localhost는 이 실행에서 InetAddress.getByName으로 127.0.0.1로 풀렸습니다. 연결 거부 예외의 메시지 "Connection refused: connect"는 Windows 11에서 본 것이고, 다른 운영체제에서 메시지 끝이 같은지는 확인하지 않았습니다. 같은 프로세스 안에서 아무도 열지 않은 포트로 new Socket("localhost", 포트)를 다섯 번 해 보니 ConnectException이 매번 1밀리초 안에 왔고, 같은 컴퓨터 안이라서 짧은 것입니다. 보내는 쪽이 받는 쪽이 있는지 아는가는 같은 방식에서 받는 쪽이 있을 때와 없을 때 보내는 쪽에 나온 것이 같은지 다른지로 정했습니다. TCP는 "보내기 끝"과 ConnectException으로 달랐고, UDP는 두 경우 모두 "보내기 끝"이어서 같았습니다. 다만 TCP에서 연결이 맺어졌다는 것이 보낸 글자를 받는 쪽 프로그램이 읽었다는 확인까지 뜻하지는 않으며, 화면의 칸은 받는 쪽이 있는지만 말합니다. 받은 글자가 보낸 차례대로였던 것은 두 방식 모두 검증 실행(한 컴퓨터 안)에서 본 것이고, 차례를 표준이 맡아 주는 것은 TCP뿐입니다. 글이 중간에 없어져 TCP가 다시 보내는 일은 이 실행에서 일으키지 않았습니다. 따로 확인한 것으로, JDK가 주는 HTTP 서버(com.sun.net.httpserver.HttpServer)를 띄우고 Socket으로 연결해 "GET /hello" 요청 글을 쓰자 서버가 요청을 하나 받아 HTTP/1.1 200 OK로 답했고, 같은 글을 DatagramSocket으로 같은 포트에 보내면 send는 예외 없이 끝났지만 서버는 요청을 받지 않았습니다. 이 실습의 옛 판은 같은 네 조합을 Node.js 24.18.0의 net·dgram으로 실행했고(verify/net/tcp_basic_probe.js), 그때도 TCP는 연결 거부 오류(ECONNREFUSED), UDP는 받는 쪽이 없어도 오류 없음으로 같은 결과였습니다. 운영체제가 연결을 거절할 때 실제로 거부 신호(RST)를 보냈는지와, UDP에서 받는 쪽이 없을 때 운영체제가 어떤 신호를 돌려보냈는지는 패킷을 잡아 보지 않아 확인하지 못했습니다. 문서로는 다음을 직접 열어 확인했습니다. JDK 21 소스의 API 문서에서 ConnectException은 연결하다가 난 오류이며 보통 상대 주소와 포트에서 기다리는 프로세스가 없어 거절된 경우라고 적고, DatagramSocket은 패킷마다 따로 주소가 붙어 보내지며 여러 패킷이 어떤 차례로든 도착할 수 있다고 적습니다. DatagramSocket.send는 소켓이 connect로 상대에 묶여 있을 때만 PortUnreachableException이 날 수 있고 그것도 보장되지 않는다고 적으며, 이 실습의 보내는 쪽은 connect를 부르지 않았습니다. RFC 9293(TCP)의 2.2절은 TCP가 연결을 맺는 방식이며 신뢰할 수 있고 순서가 지켜지는 바이트 스트림 서비스를 제공한다고, 3.5절은 연결을 맺는 절차가 3-way handshake라고, 3.5.2절은 연결이 없는 상태로 온 요청에 거부 신호(RST)를 보낸다고 적습니다. RFC 768(UDP)의 소개는 UDP에서 도착과 중복 방지가 보장되지 않는다고 적습니다. RFC 9112의 9절은 HTTP가 믿을 수 있는 순서 있는 전달을 전제로 하고 http 주소의 기본 연결이 TCP라고 적습니다. 이 실습은 TCP 연결 하나와 UDP 보내기만 다루며, 연결을 맺고 끊는 절차(3-way handshake, FIN), 글이 없어졌을 때의 재전송, 순서 맞추기, 흐름 제어와 혼잡 제어는 다루지 않았고 "세부 동작 실습: TCP 연결과 재전송"과 "세부 동작 실습: TCP와 UDP"에서 다룹니다. DatagramSocket에도 connect 메서드가 있지만 TCP처럼 연결을 맺는 것이 아니며 여기서는 쓰지 않았습니다.',
});

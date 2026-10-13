Lab.register({
  id: 'port_basic', nav: 'IP 주소와 포트', cat: '기초개념', mode: 'step', basic: true, deep: ['socket'],
  title: 'IP 주소와 포트는 각각 무엇을 가리키는가',
  intro: '네트워크로 다른 프로그램에 연결하려면 두 가지를 알아야 합니다. IP 주소는 "어느 컴퓨터인지"를, 포트는 "그 컴퓨터에서 돌고 있는 여러 프로그램 가운데 어느 프로그램인지"를 가리키는 번호입니다. 코드 칸의 서버 프로그램은 new ServerSocket(8080)으로 운영체제에 8080번 포트를 달라고 해서 열고 연결을 기다리며, 클라이언트 프로그램은 new Socket("127.0.0.1", 8080)으로 127.0.0.1 컴퓨터(지금 이 컴퓨터 자신)의 8080번 포트로 연결합니다. 이 실습은 서버 프로그램을 띄우지 않거나, 아무도 열지 않은 9090번 포트로 연결하거나, 이미 열려 있는 8080번 포트를 다른 프로그램이 또 열게 하면서 연결이 어떻게 되는지를 봅니다. 서버와 클라이언트는 서로 다른 프로그램이라서, 코드 칸에는 두 프로그램의 코드가 함께 적혀 있습니다.',
  terms: ['IP 주소(IPv4)', '포트', '소켓', '127.0.0.1(localhost)'],
  controls: [
    { id: 'server', label: '서버 프로그램이 8080번 포트를 열고 있다', type: 'check', value: true },
    { id: 'port', label: '클라이언트가 연결하는 포트', type: 'select', value: 'same', options: [['same', '클라이언트가 8080번 포트로 연결한다'], ['other', '클라이언트가 9090번 포트로 연결한다 (아무도 열지 않은 포트)']] },
    { id: 'second', label: '다른 프로그램이 8080번 포트를 한 번 더 열려고 한다', type: 'check', value: false },
  ],
  // q는 물음 방식의 화면에 보이는 물음, t와 d는 글로만 읽는 본문에 쓰이는 이름과 설명
  presets: [
    { t: '처음 설정으로', q: 'IP 주소와 포트는 어떻게 쓰이고, 서버가 연 포트로 연결하면 무슨 일이 일어나나', d: '서버가 8080번 포트를 열어 두었고 클라이언트가 같은 포트로 연결합니다. 운영체제가 연결을 서버에 넘기고, 클라이언트는 서버가 보낸 글을 받습니다.', v: { server: true, port: 'same', second: false } },
    { t: '서버 프로그램 없이 연결하면', q: '서버 프로그램을 띄우지 않고 연결하면', d: '8080번 포트를 연 프로그램이 없어 운영체제가 연결을 거절합니다.', v: { server: false, port: 'same', second: false } },
    { t: '9090번 포트로 연결하면', q: '서버가 열지 않은 9090번 포트로 연결하면', d: '서버가 열어 둔 것은 8080번뿐이어서, 9090번으로는 연결이 거절됩니다.', v: { server: true, port: 'other', second: false } },
    { t: '같은 포트를 또 열려고 하면', q: '다른 프로그램이 같은 8080번 포트를 또 열려고 하면', d: '이미 서버가 열어 둔 포트라서 두 번째 프로그램은 열지 못합니다. 서버와 클라이언트의 통신은 그대로입니다.', v: { server: true, port: 'same', second: true } },
  ],
  // 화면의 코드: 서버 프로그램, 같은 포트를 또 열려는 프로그램, 클라이언트 프로그램 순서
  SERVER: ['// 서버 프로그램: 8080번 포트를 열고 연결을 기다린다', 'ServerSocket server = new ServerSocket(8080);', 'Socket fromClient = server.accept();', 'fromClient.getOutputStream().write("안녕하세요".getBytes("UTF-8"));', 'fromClient.close();'],
  SECOND: ['// 또 다른 프로그램: 같은 8080번 포트를 열려고 한다', 'ServerSocket another = new ServerSocket(8080);'],
  code: function (c) {
    var parts = [];
    if (c.server) parts.push(this.SERVER.join('\n'));
    if (c.second) parts.push(this.SECOND.join('\n'));
    parts.push(['// 클라이언트 프로그램: 127.0.0.1(이 컴퓨터)에 연결한다', 'Socket socket = new Socket("127.0.0.1", ' + (c.port === 'same' ? '8080' : '9090') + ');', 'String text = new String(socket.getInputStream().readAllBytes(), "UTF-8");', 'System.out.println(text);'].join('\n'));
    return parts.join('\n\n');
  },
  label: function (c) { return (c.server ? '서버 프로그램이 8080번을 엶' : '서버 프로그램 없음') + ' · 클라이언트는 ' + (c.port === 'same' ? '8080번' : '9090번') + '으로 연결' + (c.second ? ' · 다른 프로그램이 8080번을 또 열려 함' : ''); },
  columns: ['클라이언트의 연결', '클라이언트가 받은 글', '같은 포트를 또 열려던 프로그램'],
  simulate: function (c) {
    var ev = [], sum = [], same = c.port === 'same', P = same ? '8080' : '9090';
    var st = { o8: '', pass: '', ask: '', phase: '', back: '', cli: ['대기'], clc: 'plain', srvSub: c.server ? ['시작 전'] : ['띄우지 않음'], srvc: c.server ? 'plain' : 'ghost', secSub: c.second ? ['시작 전'] : ['띄우지 않음'], secc: c.second ? 'plain' : 'ghost', tried: '', r1: '', r2: '', r3: '' };
    function push(s, k) { ev.push({ s: s, k: k, snap: JSON.parse(JSON.stringify(st)) }); }
    // 서버 프로그램
    if (c.server) {
      st.o8 = 'srv'; st.srvc = 'hot'; st.srvSub = ['8080번 포트를 열었음'];
      push('서버 프로그램이 시작해 new ServerSocket(8080) 줄을 실행합니다. 이 줄은 운영체제에 "8080번 포트로 오는 연결은 나에게 달라"고 요청하는 것입니다. 운영체제가 요청을 받아 주어, 이제 이 컴퓨터에서 8080번 포트를 연 프로그램은 서버 프로그램입니다.', '');
      st.srvc = 'wait'; st.srvSub = ['accept에서 연결을 기다림'];
      push('server.accept() 줄을 실행합니다. accept는 연결이 올 때까지 기다리는 메서드여서, 서버 프로그램은 이 줄에서 멈춘 채 연결을 기다립니다.', '');
    } else {
      push('서버 프로그램은 띄우지 않았습니다. 8080번 포트도 9090번 포트도, 이 컴퓨터에서 연 프로그램이 없는 상태입니다.', '');
    }
    // 같은 포트를 또 열려는 프로그램
    if (c.second) {
      st.secc = 'hot'; st.secSub = ['8080번 포트를 열려는 중']; st.phase = 'try';
      if (c.server) {
        st.secc = 'bad'; st.secSub = ['열지 못함', 'BindException']; st.tried = 'fail';
        push('또 다른 프로그램이 시작해 new ServerSocket(8080) 줄을 실행합니다. 같은 8080번 포트를 열어 달라는 요청인데, 이 포트는 이미 서버 프로그램이 열어 두었습니다. 운영체제가 요청을 받아 주지 않고, 자바가 java.net.BindException(이 PC에서는 "Address already in use: bind")을 던집니다. 이 코드에는 예외를 처리하는 줄이 없어 이 프로그램은 이 줄에서 멈춥니다. 한 포트는 한 번에 한 프로그램만 열 수 있습니다.', 'bad');
      } else {
        st.o8 = 'sec'; st.secc = 'good'; st.secSub = ['8080번 포트를 열었음', 'accept는 부르지 않음']; st.tried = 'ok';
        push('또 다른 프로그램이 시작해 new ServerSocket(8080) 줄을 실행합니다. 8080번 포트는 아직 아무도 열지 않았으므로 운영체제가 요청을 받아 주어, 이제 이 컴퓨터에서 8080번 포트를 연 프로그램은 이 프로그램입니다. 이 프로그램의 코드에는 accept를 부르는 줄이 없습니다. 포트는 열었지만 오는 연결을 받아 주는 코드는 없습니다.', '');
      }
    }
    // 클라이언트
    st.phase = 'ask'; st.ask = P; st.clc = 'wait'; st.cli = [P + '번으로', '연결 요청'];
    push('클라이언트 프로그램이 new Socket("127.0.0.1", ' + P + ') 줄을 실행합니다. 127.0.0.1은 이 코드가 돌고 있는 컴퓨터 자신을 가리키는 주소이고(localhost라는 이름이 이 주소를 뜻합니다), ' + P + '은 그 컴퓨터에서 연결하려는 프로그램의 포트 번호입니다. IP 주소는 어느 컴퓨터인지를, 포트는 그 컴퓨터의 어느 프로그램인지를 가리키므로, 클라이언트는 이 컴퓨터의 ' + P + '번 포트로 연결해 달라고 요청합니다.', '');
    var owner = same ? st.o8 : '';
    if (!owner) {
      st.phase = 'back'; st.back = 'bad'; st.clc = 'bad'; st.cli = ['연결 거절됨'];
      push('운영체제가 ' + P + '번 포트를 연 프로그램을 찾습니다. 연 프로그램이 없으므로 운영체제가 연결을 거절하고, 자바가 new Socket 줄에서 java.net.ConnectException(이 PC에서는 "Connection refused: connect")을 던집니다. 거절한 것은 서버 프로그램의 코드가 아니라 운영체제입니다.' + (!same && st.o8 ? ' 8080번 포트를 연 프로그램은 있지만, 포트 번호가 다르면 다른 포트입니다.' : ''), 'bad');
      if (c.server && !same) { st.srvc = 'wait'; push('서버 프로그램은 이 연결 요청을 받지 못했습니다. 서버 프로그램은 8080번 포트만 열었기 때문에, 9090번으로 간 요청은 서버 프로그램에 닿지 않았고 서버 프로그램은 accept에서 계속 기다립니다.', ''); }
      push('이 코드에는 예외를 처리하는 줄이 없어 클라이언트 프로그램은 new Socket 줄에서 멈춥니다. 글을 읽는 줄은 실행되지 않았으므로 받은 글은 없습니다.', 'bad');
    } else {
      st.phase = 'pass'; st.pass = owner; st.clc = 'good'; st.cli = ['연결됨'];
      if (owner === 'srv') {
        st.srvc = 'good'; st.srvSub = ['연결을 받음 (accept 끝)'];
        push('운영체제가 8080번 포트를 연 프로그램을 찾습니다. 서버 프로그램이 열어 두었으므로 연결을 서버 프로그램에 넘깁니다. 서버의 server.accept() 줄이 끝나고, 이 연결로 글을 주고받는 소켓을 fromClient에 담아 돌려줍니다.', 'good');
      } else {
        st.secSub = ['8080번 포트를 열었음', '연결이 와도 받지 않음'];
        push('운영체제가 8080번 포트를 연 프로그램을 찾습니다. 또 다른 프로그램이 열어 두었으므로 연결 요청을 그 프로그램 몫으로 받아 둡니다. ServerSocket 문서에 따르면 아직 받지 않은 연결 요청은 운영체제의 대기열(길이 50)에 쌓입니다. 클라이언트의 new Socket 줄은 오류 없이 끝나, 클라이언트 쪽에서는 연결된 것입니다.', 'good');
      }
      push('클라이언트 쪽 소켓에도 자기 포트 번호가 있습니다. 코드에서 정한 적이 없는데도 서버의 포트와 다른 번호가 붙어 있었습니다(대조 실행에서 본 번호는 모두 49152 이상). 연결 하나는 양쪽 끝의 IP 주소와 포트의 쌍으로 구분됩니다.', '');
      if (owner === 'srv') {
        st.srvSub = ['글을 보내고 연결을 닫음'];
        push('서버 프로그램이 fromClient에 "안녕하세요"를 쓰고(write), fromClient.close()로 이 연결을 닫습니다.', '');
        st.phase = 'back'; st.back = 'good'; st.cli = ['받은 글:', '안녕하세요'];
        push('클라이언트의 readAllBytes는 연결이 닫힐 때까지 온 글을 모두 읽습니다. 클라이언트가 "안녕하세요"를 text에 담고 println이 출력합니다.', 'good');
      } else {
        st.cli = ['글을 기다리는 중']; st.clc = 'wait'; st.back = '';
        push('클라이언트의 readAllBytes 줄은 글이 올 때까지, 그리고 연결이 닫힐 때까지 기다립니다. 그런데 또 다른 프로그램에는 accept를 부르는 줄도, 글을 보내는 줄도 없습니다. 3초를 지켜봐도 아무 글도 오지 않았고 클라이언트는 이 줄에서 끝나지 않았습니다.', 'bad');
      }
    }
    // 결과 행
    var conn = !owner ? '거절됨: 그 포트를 열어 둔 프로그램이 없음' : owner === 'srv' ? '연결됨' : '연결됨 (받아 주는 코드가 없어 글을 기다림)';
    var text = owner === 'srv' ? '안녕하세요' : !owner ? '없음' : '없음 (글이 오기를 기다리는 중)';
    var again = !c.second ? '(없음)' : c.server ? '열지 못함: 이미 다른 프로그램이 쓰는 포트' : '열림';
    st.r1 = conn; st.r2 = text; st.r3 = again;
    // 요약
    var secLine = c.second && c.server ? ' 또 다른 프로그램이 8080번 포트를 또 열려던 일은 이 연결과 상관없이 실패했습니다.' : c.second ? ' 또 다른 프로그램이 8080번 포트를 열었지만 클라이언트가 연결한 것은 9090번이어서 거절됩니다.' : '';
    if (c.server && same && !c.second) {
      sum.push('IP 주소는 "어느 컴퓨터인지", 포트는 그 컴퓨터에서 돌고 있는 여러 프로그램 가운데 "어느 프로그램인지"를 가리키는 번호입니다. 서버 프로그램이 8080번 포트를 열고 기다리는 중에 클라이언트가 127.0.0.1(이 컴퓨터)의 8080번 포트로 연결하자, 운영체제가 연결을 서버 프로그램에 넘겼고, 클라이언트는 서버가 보낸 글을 받았습니다.');
      sum.push('클라이언트 코드에는 서버 프로그램의 이름이 없고 주소와 포트만 있습니다. 포트를 연 프로그램을 찾아 연결을 넘기는 것은 운영체제입니다.');
    } else if (c.server && same) {
      sum.push('이미 서버 프로그램이 연 8080번 포트를 다른 프로그램이 또 열려고 하면 열지 못합니다(BindException). 서버와 클라이언트는 영향 없이 글을 주고받았습니다.');
      sum.push('한 포트는 한 번에 한 프로그램만 열 수 있습니다. 그래서 8080번으로 오는 연결을 넘길 프로그램은 하나로 정해집니다.');
    } else if (c.server) {
      sum.push('서버 프로그램이 연 포트는 8080번인데 클라이언트가 9090번 포트로 연결하면, 9090번 포트를 연 프로그램이 없어 운영체제가 연결을 거절합니다. 서버 프로그램은 이 요청을 받지 못하고 accept에서 계속 기다립니다.' + secLine);
      sum.push('같은 컴퓨터에서 서버가 돌고 있어도 포트 번호가 다르면 닿지 않습니다. 컴퓨터를 찾는 것은 IP 주소이고, 그 컴퓨터 안의 프로그램을 찾는 것은 포트입니다.');
    } else if (same && !c.second) {
      sum.push('서버 프로그램을 띄우지 않고 연결하면, 8080번 포트를 연 프로그램이 없어 운영체제가 연결을 거절합니다(ConnectException). 받은 글도 없습니다.');
      sum.push('127.0.0.1이 가리키는 컴퓨터가 맞아도, 그 포트를 열어 둔 프로그램이 없으면 연결되지 않습니다. 거절하는 것은 서버 프로그램의 코드가 아니라 운영체제입니다.');
    } else if (same) {
      sum.push('서버 프로그램 없이 또 다른 프로그램이 8080번 포트를 열면 클라이언트의 연결은 되지만, 받아 주는 코드가 없어 글은 오지 않고 클라이언트는 기다립니다.');
      sum.push('포트를 여는 일(new ServerSocket)과 연결을 받는 일(accept)은 다른 줄입니다. 운영체제는 연결을 포트를 연 프로그램 몫으로 받아 두지만, 글을 보내는 것은 그 프로그램의 코드입니다.');
    } else {
      sum.push('서버 프로그램도 없고 9090번 포트를 연 프로그램도 없어서, 클라이언트의 연결은 운영체제가 거절합니다(ConnectException).' + secLine);
      sum.push(c.second ? '포트는 번호마다 따로 열립니다. 어떤 프로그램이 8080번 포트를 열었어도 9090번 포트가 열린 것은 아닙니다.' : '아무도 열지 않은 포트로 연결하면 어느 컴퓨터를 찾아가도 같은 결과입니다. 연결되려면 그 포트를 연 프로그램이 있어야 합니다.');
    }
    return { events: ev, summary: sum, row: [conn, text, again] };
  },
  render: function (v, sim, t, H, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : null;
    if (!s) { H.text(v, '실행을 누르면 서버 프로그램이 포트를 여는 것부터 시작합니다.'); return; }
    var who = { srv: '서버 프로그램', sec: '또 다른 프로그램' };
    H.table(v, ['포트', '그 포트를 연 프로그램'], [
      { cls: s.o8 ? '' : 'gone', cells: ['8080', s.o8 ? { v: who[s.o8], cls: 'good' } : '(없음)'] },
      { cls: 'gone', cells: ['9090', '(없음)'] },
    ], '이 컴퓨터(127.0.0.1)에서 열린 포트');
    H.table(v, ['항목', '값'], [
      { cls: s.r1 ? '' : 'gone', cells: ['클라이언트의 연결', s.r1 ? { v: s.r1, cls: s.r1 === '연결됨' ? 'good' : 'bad' } : '아직'] },
      { cls: s.r2 ? '' : 'gone', cells: ['클라이언트가 받은 글', s.r2 ? { v: s.r2, cls: s.r2 === '안녕하세요' ? 'good' : 'bad' } : '아직'] },
      { cls: s.r3 ? '' : 'gone', cells: ['같은 포트를 또 열려던 프로그램', s.r3 ? { v: s.r3, cls: s.r3 === '열림' ? 'good' : s.r3.indexOf('열지 못함') === 0 ? 'bad' : '' } : '아직'] },
    ], '결과');
  },
  // 그림: 바깥 왼쪽에 클라이언트, 오른쪽의 "이 컴퓨터 (127.0.0.1)" 영역 안에 포트 번호가 붙은 문(8080, 9090)과 그 뒤의 프로그램 상자(서버 프로그램, 또 다른 프로그램). 연결 화살표가 문을 지나 프로그램에 닿는지, 문에서 거절되는지를 보이고, 아래에 결과 칸.
  draw: function (P, sim, shown) {
    var c = sim.c, last = shown[shown.length - 1], s = last ? last.snap : null;
    P.size(680, 336);
    P.region('pc', 190, 16, 476, 214, '서버 프로그램이 도는 쪽 (127.0.0.1)');
    P.box('cl', 14, 84, 130, 66, { cls: s ? s.clc : 'plain', title: '클라이언트', sub: s ? s.cli : ['대기'] });
    var o8 = s ? s.o8 : '';
    var door = function (n) { var on = s && s.ask === n, st = s && s.phase === 'back' && on ? s.back : ''; return st === 'bad' ? 'bad' : st === 'good' ? 'good' : on ? 'hot now' : (n === '8080' && o8) ? 'plain' : 'ghost'; };
    P.box('d1', 212, 46, 150, 66, { cls: door('8080'), title: '8080번 포트', sub: o8 === 'srv' ? ['서버 프로그램이', '열어 둠'] : o8 === 'sec' ? ['또 다른 프로그램이', '열어 둠'] : ['열어 둔 프로그램 없음'] });
    P.box('d2', 212, 130, 150, 66, { cls: door('9090'), title: '9090번 포트', sub: ['열어 둔 프로그램 없음'] });
    P.box('srv', 440, 46, 212, 66, { cls: s ? s.srvc : (c.server ? 'plain' : 'ghost'), title: '서버 프로그램', sub: s ? s.srvSub : (c.server ? ['시작 전'] : ['띄우지 않음']) });
    P.box('sec', 440, 130, 212, 66, { cls: s ? s.secc : (c.second ? 'plain' : 'ghost'), title: '또 다른 프로그램', sub: s ? s.secSub : (c.second ? ['시작 전'] : ['띄우지 않음']) });
    if (s && s.tried === 'fail') P.arrow('try', 'sec:l:0.25', 'd1:r:0.8', { cls: 'bad dash' });
    else if (s && s.phase === 'try') P.arrow('try', 'sec:l:0.25', 'd1:r:0.8', { cls: 'hot' });
    if (s && s.ask) P.arrow('ask', 'cl:r:0.3', (s.ask === '8080' ? 'd1' : 'd2') + ':l:0.3', {});
    if (s && s.pass) P.arrow('pass', 'd1:r:0.3', s.pass + ':l:0.5', { cls: 'hot' });
    if (s && s.back) P.arrow('back', (s.ask === '8080' ? 'd1' : 'd2') + ':l:0.75', 'cl:r:0.75', { cls: s.back });
    P.box('n1', 14, 244, 322, 36, { cls: s && s.r1 ? (s.r1 === '연결됨' ? 'good' : 'bad') : 'ghost', title: '클라이언트의 연결', right: s && s.r1 ? s.r1.split(':')[0].split(' (')[0] : '아직' });
    P.box('n2', 344, 244, 322, 36, { cls: s && s.r2 ? (s.r2 === '안녕하세요' ? 'good' : 'bad') : 'ghost', title: '받은 글', right: s && s.r2 ? s.r2.split(' (')[0] : '아직' });
    P.box('n3', 14, 290, 652, 36, { cls: s && s.r3 ? (s.r3 === '열림' ? 'good' : s.r3 === '(없음)' ? 'ghost' : 'bad') : 'ghost', title: '같은 포트를 또 열려던 프로그램', right: s && s.r3 ? s.r3.split(':')[0] : '아직' });
  },
  assume: '자바는 JDK 21.0.12.1이고 운영체제는 Windows 11입니다. 여덟 가지 조합을 모두, 화면의 코드와 같은 글로 서버 프로그램, 또 다른 프로그램, 클라이언트 프로그램의 소스를 만들어 컴파일하고, 이 JDK의 java를 서로 다른 프로세스로 띄워 127.0.0.1에서 실제로 연결한 결과와 대조했습니다. 대조한 것은 클라이언트의 연결이 되었는지와 던져진 예외의 종류, 클라이언트가 받은 글, 또 열려던 프로그램이 열었는지와 던져진 예외의 종류입니다. 화면의 8080과 9090은 예시 번호이고, 실제 대조에서는 이 PC에서 비어 있는 다른 번호 두 개를 조합마다 골라 8080 자리와 9090 자리에 썼습니다(9090 자리에는 아무도 열지 않은 것을 연결해 보아 확인했습니다). 화면의 코드는 import 줄, main 메서드, 예외 처리(throws Exception으로 넘김)를 줄였고, 실제 프로그램에는 프로세스가 준비되었음을 알리는 출력 줄이 더 있습니다. 서버와 클라이언트를 실제로 연결한 것은 127.0.0.1뿐이고 외부 네트워크에는 연결하지 않았습니다. 다만 new ServerSocket(포트)는 이 컴퓨터의 모든 주소에서 연결을 받는 모양으로 열려서(netstat에도 0.0.0.0으로 나왔습니다), 대조하는 동안 서버 프로그램은 몇 초 동안 127.0.0.1에만 묶이지 않은 상태였습니다. 연결 거절과 "이미 쓰는 포트" 오류는 운영체제(Windows 11)가 돌려준 것을 자바가 예외로 알린 것입니다. 연결을 거절당했을 때 자바가 던진 것은 java.net.ConnectException(메시지 Connection refused: connect), 이미 열린 포트를 또 열 때 던진 것은 java.net.BindException(메시지 Address already in use: bind)이었고, 이 메시지는 이 PC에서 관찰한 것이어서 운영체제마다 다를 수 있습니다. 실행으로 확인한 것은 서버가 포트를 연 직후 운영체제의 목록(netstat)에 그 포트가 서버 프로세스의 것으로 올라 있다는 것, 클라이언트 쪽 소켓의 자기 포트가 서버 포트와 다른 49152 이상의 번호라는 것, 서버 없이 또 다른 프로그램만 포트를 열면 클라이언트의 연결은 되지만 3초 안에 글이 오지 않고 클라이언트가 끝나지 않았다는 것(3초 뒤 일은 보지 않았습니다), 서버가 열지 않은 포트로 연결해도 서버 프로세스는 계속 기다린다는 것입니다. 실제로 운영체제가 TCP 연결 요청에 어떤 신호로 거절했는지는 패킷을 잡아 보지 않아 확인하지 못했습니다. 문서로는 다음을 직접 열어 확인했습니다. RFC 9293(TCP)의 2.2절은 TCP가 포트 번호로 응용 서비스를 구분한다고, 3.1절은 헤더에 출발지 포트와 목적지 포트가 있다고, 3.4.1절은 연결이 소켓(양쪽 끝)의 쌍으로 정해진다고, 3.10.7.1절은 연결이 없는 상태(CLOSED)에서 RST를 담지 않은 세그먼트가 오면 RST로 응답한다고 적습니다(위 거절이 이것인지는 확인하지 못했습니다). RFC 1122의 3.2.1.3절 (g)는 127로 시작하는 주소를 호스트 내부 루프백 주소로 정하고 호스트 밖에 나타나서는 안 된다고 하며, RFC 6890의 2.2.2절 Table 4는 127.0.0.0/8을 Loopback으로 올리고 전달되지 않는 주소로 표시합니다. RFC 6761의 6.3절은 localhost 이름이 루프백 주소로 풀리게 하도록 권합니다(이 PC에서 localhost를 풀면 127.0.0.1과 IPv6의 루프백 주소 ::1이 나왔고, 이 실습은 127.0.0.1만 다뤘습니다). java.net.ServerSocket 문서(Java SE 21)는 포트 번호로 서버 소켓을 만들고, 아직 받지 않은 연결 요청의 대기열 길이가 50이며, accept는 연결이 올 때까지 막힌다고 적습니다. 이 문서에는 BindException이나 이미 쓰는 포트에 대한 설명이 없고, java.net.Socket 문서의 생성자 설명에도 ConnectException이 나오지 않아 두 예외는 이 PC에서의 관찰입니다. 포트는 TCP로 연결할 때의 것이고, UDP나 IPv6, 한 컴퓨터가 여러 IP 주소를 가지는 경우, 인터넷의 다른 컴퓨터에 연결하는 경우는 다루지 않았습니다. 소켓과 포트의 세부 동작(임시 포트, 포트 번호의 범위와 약속된 번호 등)은 "세부 동작 실습: 소켓과 포트"에서 다룹니다.',
});

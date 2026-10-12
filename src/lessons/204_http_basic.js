Lab.register({
  id: 'http_basic', nav: 'HTTP 요청', cat: '기초개념', mode: 'step', basic: true, deep: ['httpmsg'],
  title: 'HTTP 요청은 어떻게 생긴 글인가',
  intro: '브라우저가 서버에 보내는 HTTP 요청은 정해진 모양의 글자 몇 줄입니다. 첫 줄(요청 줄)에는 메서드, 경로, 버전을 적습니다. 그 아래에는 "이름: 값" 꼴의 줄인 헤더를 적고, 아무 글자도 없는 빈 줄로 요청이 끝났음을 알립니다. 서버는 이 글을 읽어 무엇을 달라는 요청인지 압니다. 이 실습은 첫 줄, Host 줄, 마지막 빈 줄을 하나씩 바꾸거나 지워 가며 같은 서버(/hello 주소만 만들어 둔 서버)에 글자를 그대로 보내, 서버가 그 글을 요청으로 읽는지, 어떤 응답을 돌려주는지, 우리가 쓴 서버 코드까지 가는지를 봅니다. 코드 칸의 (빈 줄)은 아무 글자도 없는 줄을 눈에 보이게 적은 것입니다.',
  terms: ['요청 줄(request line)', 'Host 헤더', 'HTTP 요청의 끝(빈 줄)', 'HTTP 상태 코드'],
  controls: [
    { id: 'line', label: '첫 줄', type: 'select', value: 'ok', options: [['ok', '첫 줄: GET /hello HTTP/1.1'], ['nopath', '첫 줄: GET /nothing HTTP/1.1 (서버에 없는 경로)'], ['broken', '첫 줄: /hello (GET과 HTTP/1.1을 지움)']] },
    { id: 'host', label: 'Host: localhost:8080 줄을 적는다', type: 'check', value: true },
    { id: 'blank', label: '마지막에 빈 줄을 넣는다', type: 'check', value: true },
  ],
  // q는 물음 방식의 화면에 보이는 물음, t와 d는 글로만 읽는 본문에 쓰이는 이름과 설명
  presets: [
    { t: '처음 설정으로', q: 'HTTP 요청은 어떻게 생겼고, 서버는 무엇을 보고 응답하나', d: '모양이 맞고 /hello 경로가 있는 요청. 서버 코드가 200과 본문을 돌려줍니다.', v: { line: 'ok', host: true, blank: true } },
    { t: '경로를 /nothing으로 바꾸면', q: '경로를 /nothing으로 바꾸면', d: '모양은 맞지만 서버에 없는 경로. 서버 코드가 404로 답합니다.', v: { line: 'nopath', host: true, blank: true } },
    { t: 'Host 줄을 지우면', q: 'Host: localhost:8080 줄을 지우면', d: '요청으로는 읽히지만 Host가 없어 Node.js가 서버 코드에 넘기지 않고 400으로 거절합니다.', v: { line: 'ok', host: false, blank: true } },
    { t: '첫 줄에서 GET과 HTTP/1.1을 지우면', q: '첫 줄에서 GET과 HTTP/1.1을 지우면', d: '요청으로 읽히지 않아 400. 서버 코드까지 가지 못합니다.', v: { line: 'broken', host: true, blank: true } },
    { t: '마지막 빈 줄을 지우면', q: '마지막 빈 줄을 지우면', d: '끝을 알리는 줄이 없어 서버가 기다리고, 응답이 오지 않습니다.', v: { line: 'ok', host: true, blank: false } },
  ],
  LINES: { ok: 'GET /hello HTTP/1.1', nopath: 'GET /nothing HTTP/1.1', broken: '/hello' },
  code: function (c) {
    var out = [this.LINES[c.line]];
    if (c.host) out.push('Host: localhost:8080');
    if (c.blank) out.push('(빈 줄)');
    return out.join('\n');
  },
  label: function (c) { return { ok: '첫 줄 GET /hello', nopath: '첫 줄 GET /nothing', broken: '첫 줄 /hello' }[c.line] + ' · ' + (c.host ? 'Host 있음' : 'Host 없음') + ' · ' + (c.blank ? '빈 줄 있음' : '빈 줄 없음'); },
  columns: ['서버가 읽은 것', '응답', '서버의 코드가 실행됨'],
  simulate: function (c) {
    var ev = [], sum = [], line = this.LINES[c.line], path = c.line === 'nopath' ? '/nothing' : '/hello', broken = c.line === 'broken';
    var st = { sent: false, lc: 'plain', hc: 'plain', bc: 'plain', rdc: 'plain', rdt: ['대기'], cdc: 'ghost', cdt: ['아직'], arr1: false, go: false, resp: '', ran: '', rcv: false, rows: [], done: false };
    function push(s, k) { ev.push({ s: s, k: k, snap: JSON.parse(JSON.stringify(st)) }); }
    st.hc = c.host ? 'plain' : 'ghost'; st.bc = c.blank ? 'plain' : 'ghost';
    var cut = (!c.host || !c.blank) ? ' 이 실습에서는 코드 칸처럼' + (!c.host && !c.blank ? ' Host 줄과 빈 줄을 뺀' : !c.host ? ' Host 줄을 뺀' : ' 마지막 빈 줄을 뺀') + ' 글자를 보냅니다.' : '';
    // 1단계: 브라우저가 글자를 보낸다
    st.sent = true; st.rdt = ['대기'];
    if (broken) push('브라우저가 서버에 연결해 아래와 같은 글자를 보냅니다. 첫 줄이 /hello뿐이라서, 주소창에 주소를 입력했을 때 브라우저가 보내는 글자와는 다릅니다. 서버는 /hello 주소만 만들어 둔 서버입니다.' + cut, '');
    else push('브라우저 주소창에 localhost:8080' + path + ' 주소를 입력하면, 브라우저는 서버에 연결해 아래와 같은 글자를 보냅니다. 서버는 /hello 주소만 만들어 둔 서버입니다.' + cut, '');
    // 2단계: 첫 줄을 읽는다
    st.arr1 = true; st.lc = broken ? 'bad' : 'hot'; st.rdc = broken ? 'bad' : 'hot'; st.rdt = ['첫 줄을 읽는 중'];
    if (broken) {
      st.rdt = ['요청으로 읽지 못함']; st.cdt = ['불리지 않음']; st.resp = '400'; st.ran = '아니요';
      push('서버를 이루는 Node.js가 첫 줄을 읽습니다. 읽은 글은 "/hello"입니다. 요청 줄은 메서드, 경로, 버전 세 칸이어야 하는데, 메서드가 와야 할 자리에 /hello가 와서 메서드로 읽을 수 없습니다. Node.js는 이 글을 요청으로 읽지 못합니다.', 'bad');
      st.rcv = true; st.done = true;
      push('Node.js는 우리가 쓴 서버 코드를 부르지 않고 스스로 400 응답을 돌려줍니다.' + (!c.blank ? ' 빈 줄이 오지 않았는데도 기다리지 않습니다. 첫 줄이 틀렸다는 것은 첫 줄만 읽고도 알 수 있기 때문입니다.' : '') + (!c.host ? ' Host 줄이 없는 것도 문제이지만, 그것을 따지기 전에 첫 줄에서 이미 400이 정해졌습니다.' : ''), 'bad');
      push('브라우저가 400 응답을 받습니다. 글이 요청으로 읽히지 않았으므로 우리가 쓴 서버 코드까지 가지 못했습니다.', 'bad');
      sum.push('GET과 HTTP/1.1을 지운 첫 줄은 요청 줄이 아니라서, 서버(Node.js)가 이 글을 요청으로 읽지 못하고 400으로 답합니다.');
      sum.push('400은 요청으로 읽히지 않아 서버 코드까지 가지도 못한 경우이고, 404는 요청으로 읽힌 뒤 서버 코드가 "그런 경로는 없다"고 답한 경우입니다.' + (!c.host || !c.blank ? ' 틀린 첫 줄은 뒤의 줄이 어떻든 첫 줄만 읽고 400이 정해졌습니다.' : ''));
      return { events: ev, summary: sum, row: ['요청으로 읽지 못함', '400', '아니요'] };
    }
    st.rows.push([line, '메서드 ' + 'GET, 경로 ' + path + ', 버전 HTTP/1.1', '']);
    push('서버를 이루는 Node.js가 첫 줄을 읽습니다. 읽은 글은 "' + line + '"입니다. 첫 줄(요청 줄)에는 세 가지가 차례로 적힙니다. GET은 메서드로 무엇을 하려는지(달라는 요청), ' + path + '는 경로로 무엇에 대해서인지, HTTP/1.1은 어떤 규칙으로 쓴 글인지입니다. 세 칸이 모두 있어 요청 줄로 읽힙니다.', '');
    // 3단계: Host 줄
    if (c.host) {
      st.lc = 'plain'; st.hc = 'hot'; st.rdt = ['Host 줄을 읽는 중'];
      st.rows.push(['Host: localhost:8080', '헤더. 어느 사이트로 온 요청인지', '']);
      push('Node.js가 다음 줄을 읽습니다. 읽은 글은 "Host: localhost:8080"입니다. "이름: 값" 꼴의 줄을 헤더라고 합니다. Host 헤더는 이 요청이 어느 사이트(주소)로 온 것인지를 알려 줍니다.', '');
    }
    if (!c.blank) {
      // 빈 줄이 오지 않는다
      st.lc = 'plain'; st.hc = c.host ? 'plain' : 'ghost'; st.bc = 'wait'; st.rdc = 'wait'; st.rdt = ['빈 줄을 기다리는 중']; st.cdt = ['불리지 않음'];
      push(c.host ? 'Host 줄 뒤에 더 이상 글자가 오지 않았습니다. 빈 줄이 없으므로 Node.js는 헤더가 아직 끝나지 않았다고 보고 다음 글자를 기다립니다.' : '첫 줄 뒤에 더 이상 글자가 오지 않았습니다. Host 줄도 빈 줄도 없으므로 Node.js는 헤더가 아직 끝나지 않았다고 보고 다음 글자를 기다립니다. 헤더가 끝나기 전에는 Host가 오지 않는다고 단정할 수 없습니다.', 'bad');
      st.resp = '응답 없음 (기다림)'; st.ran = '아니요'; st.done = true; st.rcv = false;
      push('1.5초가 지나도록 응답이 한 바이트도 오지 않았습니다. 요청이 서버에 도착해 있어도 끝을 알리는 빈 줄이 없어서, Node.js는 요청을 넘기지 않았고 우리가 쓴 서버 코드는 불리지 않았습니다. 브라우저는 응답을 받지 못했습니다.', 'bad');
      sum.push('마지막 빈 줄을 지우면 서버는 요청이 아직 덜 왔다고 보고 기다립니다. 응답이 오지 않았고, 서버 코드도 불리지 않았습니다.');
      sum.push('요청의 끝을 알리는 것은 빈 줄입니다. ' + (c.host ? '' : 'Host가 없다는 것도 헤더가 끝나야 알 수 있어서, 이 경우에는 400이 아니라 기다림이 되었습니다. ') + '첫 줄이 틀린 경우만 예외로, 그때는 빈 줄을 기다리지 않고 첫 줄만 보고 400을 돌려줍니다.');
      return { events: ev, summary: sum, row: ['아직 읽는 중', '응답 없음 (기다림)', '아니요'] };
    }
    // 4단계: 빈 줄
    st.lc = 'plain'; st.hc = c.host ? 'plain' : 'ghost'; st.bc = 'hot'; st.rdt = ['빈 줄을 만남: 요청 끝'];
    st.rows.push(['(빈 줄)', '아무 글자도 없는 줄. 요청의 끝', '']);
    push(c.host ? 'Node.js가 다음 줄을 읽었더니 아무 글자도 없는 빈 줄입니다(화면의 (빈 줄)). 빈 줄은 헤더가 끝났다는 표시여서, Node.js는 요청이 끝까지 왔다고 판단합니다.' : 'Node.js가 다음 줄을 읽었더니 곧바로 아무 글자도 없는 빈 줄입니다(화면의 (빈 줄)). 헤더가 하나도 없이 헤더가 끝났고, 요청이 끝까지 왔다고 판단합니다.', '');
    if (!c.host) {
      st.bc = 'plain'; st.hc = 'bad'; st.rdc = 'bad'; st.rdt = ['Host가 없어 거절']; st.cdt = ['불리지 않음']; st.resp = '400'; st.ran = '아니요'; st.rcv = true; st.done = true;
      st.rows[0][2] = '';
      push('HTTP/1.1 요청에는 Host 헤더가 있어야 합니다. 이 요청에는 없으므로, Node.js가 우리가 쓴 서버 코드에 넘기지 않고 스스로 400 응답을 돌려줍니다. 경로를 서버 코드가 확인하기 전에 정해진 결과입니다.', 'bad');
      push('브라우저가 400 응답을 받습니다. 요청은 요청 줄까지 제대로 읽혔지만, Host가 없어 우리가 쓴 서버 코드까지 가지 못했습니다.', 'bad');
      sum.push('Host 줄이 없는 HTTP/1.1 요청은 요청으로는 읽히지만, 서버(Node.js)가 우리가 쓴 서버 코드에 넘기지 않고 400으로 거절합니다.');
      sum.push('HTTP/1.1 명세(RFC 9112)는 Host가 없는 요청에 서버가 400으로 응답해야 한다고 정합니다. 이 서버에서는 서버 코드가 한 번도 불리지 않았습니다.');
      return { events: ev, summary: sum, row: [line.split(' ')[0] + ' ' + path + ' 요청 (Host가 없어 거절)', '400', '아니요'] };
    }
    // 5단계: 요청이 서버 코드에 넘어간다
    st.bc = 'plain'; st.rdc = 'good'; st.rdt = ['GET ' + path + ' 요청 완성']; st.go = true; st.cdc = 'hot now'; st.cdt = ['요청을 받는 중'];
    push('Node.js가 읽은 요청에서 메서드는 GET, 경로는 ' + path + '입니다. 모양이 맞고 Host도 있어서, Node.js가 이 요청을 우리가 쓴 서버 코드에 넘깁니다.', 'good');
    if (c.line === 'ok') {
      st.cdc = 'good'; st.cdt = ['실행됨: 200 응답']; st.resp = '200 안녕하세요'; st.ran = '예';
      push('우리가 쓴 서버 코드가 경로를 봅니다. /hello는 만들어 둔 주소라서, 200 응답과 본문 "안녕하세요"를 만듭니다. 이 코드는 화면에 보이지 않지만, 경로가 /hello인 GET 요청에만 이렇게 답하게 만들어 두었습니다.', 'good');
      st.rcv = true; st.done = true;
      push('브라우저가 200 응답을 받습니다. 본문은 "안녕하세요"입니다.', 'good');
      sum.push('HTTP 요청은 브라우저가 서버에 보내는 글자 몇 줄입니다. 첫 줄(요청 줄)에 메서드, 경로, 버전을 적고, 그 아래에 "이름: 값" 꼴의 헤더를 적고, 빈 줄로 끝을 알립니다.');
      sum.push('서버(Node.js)는 이 글을 첫 줄부터 읽어 GET /hello 요청이라는 것을 알았고, 빈 줄에서 요청이 끝났다고 판단해 우리가 쓴 서버 코드에 넘겼습니다. 서버 코드가 경로를 보고 200으로 답했습니다.');
      return { events: ev, summary: sum, row: ['GET /hello 요청', '200 안녕하세요', '예'] };
    }
    st.cdc = 'plain'; st.cdt = ['실행됨: 404 응답']; st.resp = '404'; st.ran = '예';
    push('우리가 쓴 서버 코드가 경로를 봅니다. /nothing은 만들어 둔 주소가 아니라서, 404 응답을 만듭니다. 요청은 제대로 읽혔고, 그런 경로는 없다고 답한 것은 서버 코드입니다.', 'bad');
    st.rcv = true; st.done = true;
    push('브라우저가 404 응답을 받습니다.', 'bad');
    sum.push('경로를 /nothing으로 바꿔도 요청의 모양은 맞아서, 서버는 GET /nothing 요청으로 읽고 서버 코드에 넘깁니다. 서버 코드가 그 경로를 만들어 두지 않아 404로 답했습니다.');
    sum.push('404는 요청이 잘못된 것이 아니라 서버 코드가 "그런 경로는 없다"고 답한 것입니다. 서버 코드까지 갔다는 점이 400과 다릅니다.');
    return { events: ev, summary: sum, row: ['GET /nothing 요청', '404', '예'] };
  },
  render: function (v, sim, t, H, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : null;
    if (!s) { H.text(v, '실행을 누르면 보낸 글자를 서버가 한 줄씩 읽는 것부터 시작합니다.'); return; }
    if (s.rows.length) H.table(v, ['서버가 읽은 줄', '뜻'], s.rows.map(function (r) { return { cls: '', cells: [r[0], r[1]] }; }), '읽은 줄');
    H.table(v, ['항목', '값'], [
      { cls: s.resp ? '' : 'gone', cells: ['응답', s.resp ? { v: s.resp, cls: s.resp.indexOf('200') === 0 ? 'good' : 'bad' } : '아직'] },
      { cls: s.ran ? '' : 'gone', cells: ['서버의 코드가 실행됨', s.ran ? { v: s.ran, cls: s.ran === '예' ? 'good' : '' } : '아직'] },
    ], '결과');
  },
  // 그림: 왼쪽에 브라우저, 가운데에 보낸 글(요청 줄, Host 줄, 빈 줄), 오른쪽 서버 영역에 요청 읽기(Node.js)와 우리가 쓴 서버 코드. 요청으로 읽히면 화살표가 서버 코드까지 가고, 400이면 요청 읽기에서 끊기고, 빈 줄이 없으면 요청 읽기에서 멈춰 기다린다.
  draw: function (P, sim, shown) {
    var c = sim.c, last = shown[shown.length - 1], s = last ? last.snap : null;
    var hostTxt = c.host ? 'Host: localhost:8080' : '(Host 줄 없음)', blankTxt = c.blank ? '(빈 줄)' : '(빈 줄 없음)';
    P.size(680, 292);
    P.box('br', 14, 94, 84, 58, { cls: s && s.sent && !s.done ? 'wait' : 'plain', title: '브라우저', sub: !s ? '대기' : s.rcv ? s.resp.split(' ')[0] + ' 응답' : s.done ? '응답 없음' : '글자를 보냄' });
    P.region('tx', 150, 16, 210, 208, '보낸 글');
    P.box('l1', 160, 44, 190, 34, { cls: s ? s.lc : 'plain', sub: { ok: 'GET /hello HTTP/1.1', nopath: 'GET /nothing HTTP/1.1', broken: '/hello' }[c.line], mono: true });
    P.box('l2', 160, 94, 190, 34, { cls: s ? s.hc : (c.host ? 'plain' : 'ghost'), sub: hostTxt, mono: !!c.host });
    P.box('l3', 160, 144, 190, 34, { cls: s ? s.bc : (c.blank ? 'plain' : 'ghost'), sub: blankTxt });
    P.region('sv', 412, 16, 254, 208, '서버');
    P.box('rd', 422, 58, 234, 62, { cls: s ? s.rdc : 'plain', title: '요청 읽기 (Node.js)', sub: s ? s.rdt : ['대기'] });
    P.box('cd', 422, 156, 234, 56, { cls: s ? s.cdc : 'ghost', title: '우리가 쓴 서버 코드', sub: s ? s.cdt : ['아직'] });
    if (s && s.sent) P.arrow('send', 'br:r', 'l2:l', {});
    if (s && s.arr1) P.arrow('rd1', 'l2:r', [422, 111], { cls: 'hot' });
    if (s && s.go) P.arrow('go', 'rd:b', 'cd:t', { cls: 'hot' });
    if (s && s.rcv) P.arrow('rs', [56, 240], [56, 154], { cls: s.resp.indexOf('200') === 0 ? 'good' : 'bad', label: s.resp.split(' ')[0] });
    P.box('n1', 14, 242, 322, 36, { cls: s && s.rcv ? (s.resp.indexOf('200') === 0 ? 'good' : 'bad') : s && s.done ? 'bad' : 'ghost', title: '응답', right: s && s.resp ? s.resp : '아직' });
    P.box('n2', 344, 242, 322, 36, { cls: s && s.ran === '예' ? 'good' : 'ghost', title: '서버의 코드가 실행됨', right: s && s.ran ? s.ran : '아직' });
  },
  assume: '서버는 Node.js 24.18.0의 http 모듈로 만든 것 하나로, GET /hello에 200과 본문 "안녕하세요"를, 그 밖의 경로에는 404를 돌려줍니다. 열두 가지 조합을 모두 127.0.0.1의 이 서버에 net 모듈로 글자 그대로 보내(줄 끝은 CRLF), 받은 응답의 상태 줄과 본문, 우리가 쓴 요청 처리 함수가 불렸는지와 그 함수가 받은 method와 url을 확인해 모형과 대조했습니다. 화면의 (빈 줄)은 아무 글자도 없는 줄을 눈에 보이게 적은 것이고, 빈 줄이 없는 조합은 마지막 줄의 줄바꿈까지만 보냈습니다. "응답 없음 (기다림)"은 글자를 보낸 뒤 1.5초 동안 응답이 한 바이트도 오지 않았다는 뜻입니다. Node.js가 언제까지 기다리다 포기하는지는 보지 않았습니다. 모양이 틀린 첫 줄(/hello)은 Node.js가 요청으로 읽지 못해 clientError 오류(HPE_INVALID_METHOD)를 내고 스스로 400을 돌려주며, 이때 뒤의 줄이 어떻든 첫 줄만 보냈을 때도 400이 왔습니다. Host가 없는 요청은 빈 줄이 와서 헤더가 끝난 뒤에, Node.js가 우리 코드를 부르기 전에 스스로 400을 돌려주고(요청 처리 함수는 불리지 않았고 clientError도 나지 않았습니다), Host 검사를 끈 서버(requireHostHeader: false)에 같은 글자를 보내면 처리 함수가 GET 요청을 받았으므로 요청 줄까지는 정상으로 읽힌 것입니다. 이것들은 이 Node.js 버전에서 관찰한 동작입니다. 문서로 확인한 것은 RFC 9112의 2.1절(메시지 형식: 요청 줄과 헤더 뒤의 빈 줄), 3절(요청 줄: 메서드, 요청 대상, 버전 세 칸), 3.2절(HTTP/1.1 요청에 Host가 없으면 서버는 400으로 응답해야 한다)과 RFC 9110의 7.2절(Host), 15.5.1절(400), 15.5.5절(404)입니다. 화면의 요청은 헤더를 Host 하나만 남긴 최소한의 모양이고, 본문이 없는 GET 요청만 다뤘습니다. 400을 돌려주는 방식은 서버마다 다를 수 있으며, 이 화면은 Node.js 서버의 동작입니다. 서버의 코드는 화면에 보이지 않습니다. 같은 주제의 세부 동작(응답의 모양, 상태 코드 전체)은 "세부 동작 실습: HTTP 메시지와 상태 코드"에서 다룹니다.',
});

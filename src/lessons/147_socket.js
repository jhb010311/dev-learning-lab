Lab.register({
  id: 'socket', nav: '소켓과 포트', cat: '네트워크', mode: 'step',
  title: '한 컴퓨터의 여러 프로그램 가운데 누가 이 데이터를 받나',
  intro: 'IP 주소는 컴퓨터 한 대까지만 찾아갑니다. 그 컴퓨터에서 돌고 있는 여러 프로그램 가운데 누가 데이터를 받을지는 포트 번호가 정합니다. 프로그램은 소켓을 만들어 포트 번호를 붙이고, 운영체제는 그 포트로 온 데이터를 그 소켓에 넘깁니다. 서버가 여는 포트와 클라이언트가 연결하는 포트에 따라 연결이 어느 프로그램에 닿는지 봅니다.',
  terms: ['포트', '소켓', '임시 포트', 'TCP와 UDP'],
  controls: [
    { id: 'srv', label: '띄우는 서버', type: 'select', value: 'same', options: [['ab', '서버 A는 9000번, 서버 B는 9001번'], ['same', '서버 A도 9000번, 서버 B도 9000번'], ['a', '서버 A만 9000번']] },
    { id: 'to', label: '클라이언트가 연결하는 포트', type: 'select', value: '9000', options: [['9000', '9000번'], ['9001', '9001번'], ['9002', '9002번 (아무도 쓰지 않는 포트)']] },
    { id: 'n', label: '클라이언트 수', type: 'select', value: '3', options: [['1', '1개'], ['2', '2개'], ['3', '3개']], hint: '클라이언트는 모두 앞의 연결을 닫지 않은 채로 연결합니다.' },
  ],
  presets: [
    { t: '처음 설정으로', q: '서버 A도 서버 B도 9000번으로 띄우고 클라이언트 3개가 9000번으로 연결하면 어떻게 되나', d: '같은 포트에 서버 둘은 안 되는데, 클라이언트 셋은 한 포트에 함께 붙습니다.', v: { srv: 'same', to: '9000', n: '3' } },
    { t: '포트로 프로그램을 고른다', q: '서버 A는 9000번, 서버 B는 9001번으로 띄우고 클라이언트 1개가 9001번으로 연결하면', d: '같은 컴퓨터인데 9001번으로 보내면 서버 B가 받습니다.', v: { srv: 'ab', to: '9001', n: '1' } },
    { t: '듣는 서버가 없는 포트', q: '서버 A는 9000번, 서버 B는 9001번으로 띄우고 클라이언트 1개가 아무도 쓰지 않는 9002번 포트로 연결하면', d: '컴퓨터는 켜져 있어도 연결이 거절됩니다.', v: { srv: 'ab', to: '9002', n: '1' } },
    { t: '서버 B가 뜨지 못한 뒤 9001번으로', q: '서버 A도 서버 B도 9000번인데 클라이언트 2개가 9001번으로 연결하면', d: 'B는 9000번을 얻지 못했고 9001번에는 아무도 없습니다.', v: { srv: 'same', to: '9001', n: '2' } },
    { t: '서버 하나, 클라이언트 하나', q: '서버를 A만 9000번으로 띄우고 클라이언트 수를 1개로 바꾸면', d: '가장 단순한 경우부터 봅니다.', v: { srv: 'a', to: '9000', n: '1' } },
  ],
  code: function (c) {
    var n = +c.n, bport = c.srv === 'same' ? 9000 : 9001;
    var s = '// Node.js (net 모듈). 서버와 클라이언트를 모두 이 컴퓨터(127.0.0.1)에서 실행한다\nconst net = require(\'net\');\n\nconst serverA = net.createServer(conn => conn.on(\'data\', d => conn.write(\'A\')));\nserverA.listen(9000, \'127.0.0.1\');             // 9000번 포트에서 듣기 시작\n';
    if (c.srv !== 'a') s += '\nconst serverB = net.createServer(conn => conn.on(\'data\', d => conn.write(\'B\')));\nserverB.on(\'error\', e => console.log(e.code));  // 실패하면 오류 이름이 찍힌다\nserverB.listen(' + bport + ', \'127.0.0.1\');' + (c.srv === 'same' ? '             // 서버 A가 이미 쓰는 포트' : '') + '\n';
    s += '\nfor (let i = 1; i <= ' + n + '; i++) {\n  const socket = net.connect(' + c.to + ', \'127.0.0.1\');   // 받는 포트만 적는다. 보내는 포트는 적지 않는다\n  socket.on(\'connect\', () => {\n    console.log(socket.localPort);              // 운영체제가 골라 준 보내는 포트\n    socket.write(\'c\' + i);\n  });\n  socket.on(\'data\', d => console.log(d.toString()));   // 어느 서버가 받았는지\n  socket.on(\'error\', e => console.log(e.code));\n}';
    return s;
  },
  label: function (c) { return { ab: 'A 9000번, B 9001번', same: 'A와 B 둘 다 9000번', a: 'A만 9000번' }[c.srv] + ' · ' + c.to + '번으로 연결 · 클라이언트 ' + c.n + '개'; },
  columns: ['서버 B의 listen', '클라이언트의 연결', '데이터를 받은 서버', '서버가 본 연결'],
  // 각 포트에서 누가 듣고 있는지: 같은 포트에 두 번째로 listen한 서버는 실패한다
  owners: function (c) {
    var own = { 9000: 'A' }, b = 'none';
    if (c.srv === 'ab') { own[9001] = 'B'; b = 'ok'; }
    if (c.srv === 'same') b = 'EADDRINUSE';
    return { own: own, b: b };
  },
  simulate: function (c) {
    var o = this.owners(c), n = +c.n, to = +c.to, who = o.own[to] || '', ev = [], sum = [];
    var st = { ports: {}, b: '', conns: [], fails: [], sent: false };
    function push(s, k) { ev.push({ s: s, k: k, snap: JSON.parse(JSON.stringify(st)) }); }
    st.ports[9000] = 'A';
    push('serverA.listen(9000): 서버 A가 소켓을 만들어 9000번 포트에 붙이고, 운영체제에 "9000번 포트로 들어오는 연결은 이 소켓으로 달라"고 등록합니다. 9000번이 비어 있었으므로 성공합니다. 이제 서버 A는 연결을 기다립니다.', '');
    if (c.srv === 'ab') { st.ports[9001] = 'B'; st.b = 'ok'; push('serverB.listen(9001): 서버 B는 다른 번호인 9001번을 등록합니다. 비어 있는 포트이므로 성공합니다. 한 컴퓨터에서 두 프로그램이 서로 다른 포트로 연결을 기다립니다.', 'good'); }
    if (c.srv === 'same') { st.b = 'EADDRINUSE'; push('serverB.listen(9000): 서버 B도 9000번을 등록하려 합니다. 이미 서버 A가 쓰고 있으므로 운영체제가 거절하고, 서버 B는 EADDRINUSE(주소가 이미 사용 중) 오류를 받습니다. 한 포트로 들어오는 연결을 받을 프로그램은 하나여야 누구에게 줄지 정할 수 있기 때문입니다.', 'bad'); }
    for (var i = 1; i <= n; i++) {
      var cp = 50000 + i;
      if (who) {
        st.conns.push({ c: i, cp: cp, sp: to, who: who });
        push('클라이언트 ' + i + '의 net.connect(' + to + '): ' + (i === 1 ? '코드에는 받는 포트만 적었습니다. 보내는 포트는 운영체제가 비어 있는 번호 가운데 하나(여기서는 ' + cp + '번)를 골라 줍니다. ' + to + '번에서 서버 ' + who + '가 듣고 있으므로 연결이 맺어집니다.' : '운영체제가 이번에는 보내는 포트로 ' + cp + '번을 골라 줍니다. 서버 ' + who + '가 듣고 있으므로 연결이 맺어집니다. 앞의 연결과 받는 포트는 똑같이 ' + to + '번이고, 보내는 포트만 다릅니다.' + (i === 2 ? ' 운영체제는 네 값(보내는 IP, 보내는 포트, 받는 IP, 받는 포트)이 하나라도 다르면 다른 연결로 봅니다.' : ' 앞의 두 연결은 끊기지 않고 그대로 열려 있습니다.')), 'good');
      } else {
        st.fails.push({ c: i, to: to });
        push('클라이언트 ' + i + '의 net.connect(' + to + '): ' + (i === 1 ? to + '번 포트에서 듣고 있는 프로그램이 없습니다. 받는 쪽 운영체제가 "거절한다"는 답을 돌려보내고, 클라이언트는 ECONNREFUSED(연결 거부) 오류를 받습니다. 컴퓨터가 켜져 있고 IP 주소가 맞아도, 그 포트를 듣는 프로그램이 없으면 연결되지 않습니다.' + (c.srv === 'same' && to === 9001 ? ' 서버 B는 9000번을 얻지 못했을 뿐, 9001번에서 듣고 있는 것이 아닙니다.' : '') : '같은 까닭으로 ECONNREFUSED 오류를 받습니다. 그 포트를 듣는 프로그램이 생기기 전에는 몇 번을 시도해도 연결되지 않습니다.'), 'bad');
      }
    }
    if (who) {
      st.sent = true;
      push('socket.write: ' + (n > 1 ? '클라이언트 ' + n + '개가 저마다 데이터를 보냅니다. 모두 ' + to + '번 포트로 가지만, 운영체제가 보내는 포트를 보고 어느 연결의 데이터인지 가려서 서버 ' + who + '에게 연결별로 따로 넘깁니다. 연결마다 소켓이 하나씩 있기 때문입니다.' : '클라이언트가 데이터를 보냅니다. 받는 포트가 ' + to + '번이므로 운영체제가 서버 ' + who + '의 소켓에 넘깁니다.') + (c.srv === 'ab' ? ' 같은 컴퓨터의 서버 ' + (who === 'A' ? 'B' : 'A') + '에게는 아무것도 가지 않습니다.' : ''), 'good');
    }
    var bRow = { ok: '성공 (9001번)', EADDRINUSE: '실패 (EADDRINUSE)', none: '띄우지 않음' }[o.b];
    if (c.srv === 'same') sum.push('이미 쓰이는 포트에 서버를 또 띄우면 EADDRINUSE로 실패합니다. 개발 중에 "포트가 이미 사용 중"이라는 오류를 만나면, 먼저 띄워 둔 서버가 아직 살아 있는 경우가 대부분입니다. 그 프로그램을 끝내거나 다른 포트를 씁니다.');
    if (who && n > 1) sum.push('서버 포트 하나에 클라이언트 여럿이 함께 연결됩니다. 연결이 늘어도 서버 쪽 포트는 ' + to + '번 하나뿐이고, 연결은 (보내는 IP, 보내는 포트, 받는 IP, 받는 포트) 네 값의 묶음으로 구분됩니다. 웹 서버가 443번 포트 하나로 수많은 사용자를 받는 것도 같은 원리입니다.');
    if (who && n === 1) sum.push('클라이언트는 받는 포트만 정하고, 보내는 포트는 운영체제가 임시로 골라 줍니다.');
    if (!who) sum.push('ECONNREFUSED는 "그 컴퓨터까지는 갔지만 그 포트를 듣는 프로그램이 없다"는 뜻입니다. 서버가 떠 있는지, 포트 번호가 맞는지를 먼저 확인합니다. 응답이 아예 없어서 기다리다 끝나는 타임아웃과는 다른 오류입니다.');
    if (c.srv === 'ab' && who) sum.push('IP 주소가 같아도 포트가 다르면 다른 프로그램입니다. 주소를 "IP:포트"로 함께 적는 이유입니다.');
    return { events: ev, summary: sum, own: o.own, who: who,
      row: [bRow, who ? n + '개 성공' : n + '개 거절 (ECONNREFUSED)', who ? '서버 ' + who : '없음', who ? '연결 ' + n + '개 · 서버 쪽 포트 ' + to + '번 하나 · 클라이언트 쪽 임시 포트 ' + n + '개' : '연결 0개'] };
  },
  render: function (v, sim, t, H, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : null;
    if (!s) { H.text(v, '실행을 누르면 서버를 띄우는 것부터 한 단계씩 진행합니다.'); return; }
    if (s.conns.length) H.table(v, ['클라이언트', '보내는 IP', '보내는 포트', '받는 IP', '받는 포트', '받는 프로그램'], s.conns.map(function (k) { return { cells: [String(k.c), '127.0.0.1', { v: String(k.cp), cls: 'hot' }, '127.0.0.1', String(k.sp), '서버 ' + k.who] }; }), '맺어진 연결 (네 값이 모두 같아야 같은 연결)');
    if (s.fails.length) H.table(v, ['클라이언트', '연결하려던 포트', '결과'], s.fails.map(function (k) { return { cells: [String(k.c), k.to + '번', { v: 'ECONNREFUSED', cls: 'bad' }] }; }), '거절된 연결');  },
  // 그림: 왼쪽에 클라이언트들, 오른쪽에 서버 컴퓨터의 포트 세 개. 화살표가 닿는 포트에 듣는 프로그램이 있으면 연결되고 없으면 거절된다.
  draw: function (P, sim, shown) {
    var c = sim.c, n = +c.n, last = shown[shown.length - 1], s = last ? last.snap : { ports: {}, b: '', conns: [], fails: [], sent: false };
    P.size(680, 316);
    P.region('cl', 16, 16, 232, 236, '클라이언트 (127.0.0.1)');
    P.region('sv', 330, 16, 334, 236, '서버 컴퓨터 (127.0.0.1)의 포트');
    [9000, 9001, 9002].forEach(function (p, k) {
      var who = s.ports[p], cnt = s.conns.filter(function (x) { return x.sp === p; }).length, refused = s.fails.some(function (x) { return x.to === p; });
      P.box('p' + p, 346, 52 + k * 66, 302, 52, { cls: who ? (cnt ? 'good' : 'wait') : refused ? 'bad' : 'ghost', title: p + '번 포트', sub: who ? '서버 ' + who + '가 듣는 중' + (p === 9000 && s.b === 'EADDRINUSE' ? ' (B는 실패)' : '') : '듣는 프로그램 없음', right: cnt ? '연결 ' + cnt + '개' : '' });
    });
    for (var i = 1; i <= n; i++) {
      var ok = s.conns.filter(function (x) { return x.c === i; })[0], bad = s.fails.filter(function (x) { return x.c === i; })[0];
      P.box('c' + i, 30, 52 + (i - 1) * 66, 204, 52, { cls: ok ? 'good' : bad ? 'bad' : 'ghost', title: '클라이언트 ' + i, sub: ok ? '보내는 포트 ' + ok.cp : bad ? 'ECONNREFUSED' : '아직 연결 전' });
      if (ok || bad) P.arrow('a' + i, 'c' + i + ':r', 'p' + (ok ? ok.sp : bad.to) + ':l:' + (0.25 * i), { cls: ok ? 'good' : 'bad', label: ok ? (s.sent ? '데이터' : '연결') : '거절' });
    }
    P.box('rb', 16, 268, 320, 34, { cls: !s.b ? 'ghost' : s.b === 'ok' ? 'good' : 'bad', title: '서버 B의 listen', right: !s.b ? (c.srv === 'a' ? '띄우지 않음' : '아직') : s.b === 'ok' ? '성공' : 'EADDRINUSE' });
    P.box('rc', 344, 268, 320, 34, { cls: s.conns.length ? 'good' : s.fails.length ? 'bad' : 'ghost', title: '클라이언트의 연결', right: '성공 ' + s.conns.length + ' · 거절 ' + s.fails.length });
    P.note('오른쪽 상자 하나가 포트 하나입니다. 클라이언트 쪽 보내는 포트(50001 등)는 설명을 위한 예이고, 실제로는 운영체제가 실행할 때마다 다른 번호를 골라 줍니다.');
  },
  assume: '스물일곱 가지 조합을 이 PC(윈도, Node.js 24)의 127.0.0.1에서 net 모듈로 실제로 실행해 대조했습니다. 대조한 것은 서버 B의 listen 결과(성공 또는 EADDRINUSE), 클라이언트 연결의 성공 수와 거절 수(ECONNREFUSED), 데이터를 받은 서버, 서버가 본 연결 수, 서버 쪽 소켓의 포트가 모두 듣는 포트 하나와 같은지, 클라이언트 쪽 포트가 서로 다른지입니다. 실행에서는 9000, 9001, 9002 대신 그때 비어 있던 포트 세 개를 썼고, 클라이언트 쪽 포트 번호(화면의 50001 등)는 실행할 때마다 달라지므로 "서로 다르다"는 것만 결과로 삼았습니다. 운영체제가 임시 포트를 고르는 범위는 운영체제와 설정에 따라 다릅니다(IANA가 권하는 범위는 49152~65535, RFC 6335 6절). 연결을 양쪽의 IP 주소와 포트로 구분한다는 것은 TCP 표준(RFC 9293 4절 용어 풀이의 connection과 socket)의 정의입니다. 클라이언트를 다른 컴퓨터에 두는 경우와, 같은 포트를 여러 프로그램이 함께 쓰게 하는 특수한 소켓 옵션(SO_REUSEPORT 등)은 다루지 않았습니다.',
});

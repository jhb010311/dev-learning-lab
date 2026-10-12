Lab.register({
  id: 'https_basic', nav: 'HTTPS', cat: '기초개념', mode: 'step', basic: true, deep: ['tls'],
  title: 'HTTPS는 HTTP와 무엇이 다른가',
  intro: 'HTTP는 요청과 응답을 글자 그대로 네트워크에 흘려보냅니다. 클라이언트와 서버 사이에는 공유기나 통신사 장비 같은 것들이 있어서, 그곳을 지나가는 글자를 누군가 들여다보면 비밀번호까지 그대로 읽힙니다. HTTPS는 같은 HTTP 글자를 암호화해서 보내는 것이고, 주소가 https://로 시작합니다. 화면의 코드 칸은 세 구역입니다. 첫째는 클라이언트가 접속하는 주소, 둘째는 보내는 내용(POST 요청의 본문), 셋째는 https일 때만 나오는 서버의 인증서입니다. 암호화를 시작하기 전에 서버는 인증서를 내보여 자신이 그 이름의 주인임을 보이고, 클라이언트는 그 인증서가 믿는 목록에 있는지와 접속한 주소의 이름이 인증서에 적혀 있는지를 확인합니다. 확인에 실패하면 클라이언트는 연결을 끊고 요청을 보내지 않습니다. 이 실습은 https://를 http://로 바꾸거나, 인증서를 믿지 않거나, 인증서에 적히지 않은 이름으로 접속해 가며 같은 내용을 보내, 그림 가운데의 중간에서 무엇이 보이는지와 서버가 무엇을 받는지를 봅니다. 화면의 8080과 8443은 예시로 적은 포트 번호이고, password=1234는 시험용 글자입니다.',
  terms: ['HTTPS와 TLS', 'TLS 핸드셰이크와 인증서', '평문', '서버 인증서 확인(믿는 목록과 이름)'],
  controls: [
    { id: 'scheme', label: '접속하는 주소의 시작', type: 'select', value: 'https', options: [['https', 'https://로 접속한다'], ['http', 'http://로 접속한다']] },
    { id: 'trust', label: '클라이언트가 이 서버의 인증서를 믿을 수 있는 것으로 알고 있다', type: 'check', value: true, show: function (c) { return c.scheme === 'https'; } },
    { id: 'name', label: '접속하는 이름', type: 'select', value: 'match', options: [['match', 'localhost로 접속한다 (인증서에 적힌 이름)'], ['other', '127.0.0.1로 접속한다 (인증서에 적히지 않은 이름)']], show: function (c) { return c.scheme === 'https'; } },
  ],
  // q는 물음 방식의 화면에 보이는 물음, t와 d는 글로만 읽는 본문에 쓰이는 이름과 설명
  presets: [
    { t: '처음 설정으로', q: 'HTTPS로 보내면 중간에서는 무엇이 보이고 서버는 무엇을 받나', d: '중간에서는 알아볼 수 없는 바이트만 지나가고, 서버는 원래 글자 password=1234를 받습니다.', v: { scheme: 'https', trust: true, name: 'match' } },
    { t: 'http로 바꾸면', q: 'https://를 http://로 바꾸면', d: '확인도 암호화도 없이 글자가 그대로 지나가 중간에서 password=1234가 읽힙니다.', v: { scheme: 'http', trust: true, name: 'match' } },
    { t: '인증서를 믿지 않으면', q: '클라이언트가 서버의 인증서를 믿지 않으면', d: '클라이언트가 연결을 끊고 요청을 보내지 않습니다. 서버는 아무것도 받지 못합니다.', v: { scheme: 'https', trust: false, name: 'match' } },
    { t: '127.0.0.1로 접속하면', q: '인증서에 적히지 않은 이름(127.0.0.1)으로 접속하면', d: '믿는 인증서여도 접속한 이름이 적혀 있지 않아 클라이언트가 연결을 끊습니다.', v: { scheme: 'https', trust: true, name: 'other' } },
    { t: '믿지 않고 127.0.0.1로도 접속하면', q: '인증서를 믿지 않는데 접속한 이름(127.0.0.1)도 인증서에 적혀 있지 않으면', d: '두 가지가 다 맞지 않는 경우. 클라이언트가 알리는 이유는 믿을 수 없는 인증서입니다.', v: { scheme: 'https', trust: false, name: 'other' } },
  ],
  CONN: { ok: '연결됨', trust: '클라이언트가 연결을 끊음: 믿을 수 없는 인증서', name: '클라이언트가 연결을 끊음: 인증서의 이름이 접속한 주소와 다름' },
  MID: { plain: 'password=1234가 그대로 보임', enc: '요청 내용은 알아볼 수 없는 바이트 (password=1234 없음)', none: '요청을 보내지 않음' },
  code: function (c) {
    var https = c.scheme === 'https', host = https && c.name === 'other' ? '127.0.0.1' : 'localhost';
    var out = ['# 클라이언트가 접속하는 주소', c.scheme + '://' + host + ':' + (https ? '8443' : '8080') + '/login', '', '# 보내는 내용 (POST 요청의 본문)', 'password=1234'];
    if (https) out.push('', '# 서버의 인증서', '이름: localhost', c.trust ? '클라이언트가 믿는 목록에 있음' : '클라이언트가 믿는 목록에 없음');
    return out.join('\n');
  },
  label: function (c) { return c.scheme === 'http' ? 'http://로 접속' : 'https://로 접속 · 인증서를 ' + (c.trust ? '믿음' : '믿지 않음') + ' · ' + (c.name === 'other' ? '127.0.0.1로 접속' : 'localhost로 접속'); },
  columns: ['클라이언트의 연결', '중간에서 들여다본 내용', '서버가 받은 내용'],
  simulate: function (c) {
    var https = c.scheme === 'https', other = https && c.name === 'other', trust = !!c.trust, host = other ? '127.0.0.1' : 'localhost';
    var url = (https ? 'https://' : 'http://') + host + ':' + (https ? '8443' : '8080') + '/login';
    var sni = https && !other ? ' 연결을 시작하는 바이트에는 접속한 이름 localhost가 글자로 들어 있는 것이 이 실행에서 보였습니다. 요청 내용은 아닙니다.' : '';
    var ev = [], sum = [];
    var st = { clc: 'plain', clt: ['대기'], a1: '', a2: '', cut: false, seenc: 'ghost', seent: ['아직 아무것도', '지나가지 않음'], svc: 'plain', svt: ['대기'], certc: 'ghost', certt: https ? ['이름: localhost'] : ['인증서 없음'], chk: [], conn: '', connc: '', mid: '', midc: '', got: '', gotc: '' };
    function push(s, k) { ev.push({ s: s, k: k, snap: JSON.parse(JSON.stringify(st)) }); }
    var between = ' 클라이언트와 서버 사이에는 공유기나 통신사 장비 같은 것들이 있고(그림의 가운데), 그곳을 지나가는 글자를 누군가 들여다볼 수 있습니다.';
    if (!https) {
      // http: 확인도 암호화도 없다
      st.clc = 'hot'; st.clt = ['http로 연결']; st.a1 = 'plain'; st.a2 = 'plain'; st.seenc = 'plain'; st.seent = ['연결을 시작하는', '바이트가 지나감']; st.svt = ['연결을 받음']; st.conn = this.CONN.ok;
      push('서버에 연결하는 주소는 ' + url + '입니다. http://로 시작하므로 클라이언트(서버에 접속하는 프로그램)는 서버를 확인하지도 암호화를 준비하지도 않고 바로 HTTP 글자를 보냅니다. 서버도 인증서를 내보이지 않습니다.' + between + ' 8080은 예시로 적은 포트 번호입니다.', '');
      st.clt = ['글자를', '그대로 보냄']; st.a1 = 'hot'; st.seenc = 'bad'; st.seent = ['POST /login HTTP/1.1', '(헤더 줄들)', '(빈 줄)', 'password=1234'];
      push('클라이언트가 HTTP 요청 글자를 그대로 보냅니다. 첫 줄 POST /login HTTP/1.1, 헤더 줄들, 빈 줄, 본문 password=1234가 글자 그대로 네트워크에 흘러 나갑니다.', '');
      st.mid = this.MID.plain; st.midc = 'bad';
      push('중간(공유기나 통신사 장비 등)에서 지나가는 글자를 들여다보면 요청이 그대로 읽힙니다. POST /login도, 본문의 password=1234도 보입니다. 이 실행에서 중간에 둔 중계기가 기록한 바이트에서 두 글자가 모두 발견됐습니다.', 'bad');
      st.svc = 'good'; st.svt = ['받은 본문:', 'password=1234']; st.got = 'password=1234'; st.gotc = 'good'; st.clc = 'plain'; st.clt = ['요청을 보냄'];
      push('서버의 요청 처리 함수가 받은 본문은 password=1234입니다. 서버가 받는 글자는 HTTPS일 때와 같습니다. 다른 것은 중간에서 보이는 글자입니다.', 'good');
      sum.push('http://로 접속하면 같은 글자가 그대로 지나가서, 중간에서 들여다보면 password=1234가 그대로 읽힙니다. 서버가 받은 글자는 HTTPS와 같습니다.');
      sum.push('HTTPS와 HTTP의 차이는 서버가 받는 글자가 아니라 중간에서 보이는 글자입니다. HTTP에는 서버가 정말 그 주소의 주인인지 확인하는 단계도 없습니다.');
      return { events: ev, summary: sum, row: [this.CONN.ok, this.MID.plain, 'password=1234'] };
    }
    // https: 연결 -> 인증서 -> 확인 -> (통과하면) 암호화
    st.clc = 'hot'; st.clt = ['https로 연결']; st.a1 = 'plain'; st.a2 = 'plain'; st.seenc = 'plain'; st.seent = ['연결을 시작하는', '바이트가 지나감'];
    push('서버에 연결하는 주소는 ' + url + '입니다. https://로 시작하므로 클라이언트(서버에 접속하는 프로그램)는 HTTP 글자를 보내기 전에 먼저 서버를 확인하고 암호화를 준비합니다.' + between + ' 8443은 예시로 적은 포트 번호입니다.', '');
    st.svc = 'hot'; st.svt = ['인증서를 내보임']; st.certc = 'hot';
    push('서버가 인증서를 내보입니다. 인증서는 서버가 "나는 이 이름의 주인이다"라고 보이는 증명서이고, 이 서버의 인증서에는 이름 localhost가 적혀 있습니다(코드 칸의 "서버의 인증서").', '');
    st.clt = ['인증서를 확인 중']; st.certc = 'plain';
    st.chk.push(['믿는 목록에 있는가', trust ? '있음' : '없음', trust ? 'good' : 'bad']);
    if (!trust) {
      push('클라이언트가 인증서를 확인합니다. 첫째는 이 인증서를 믿을 수 있는가입니다. 클라이언트는 믿는 목록을 가지고 있고, 서버가 내보인 인증서가 그 목록에 있는지 봅니다. 이 인증서는 클라이언트가 믿는 목록에 없습니다. 누구나 스스로 만들 수 있는 인증서와 구분할 수 없어서, 서버가 그 이름의 주인이라는 증명이 되지 못합니다.' + (other ? ' 이 조합에서는 접속한 이름 127.0.0.1도 인증서에 적혀 있지 않지만, 이 실행에서 클라이언트가 연결을 끊은 이유로 알린 것은 믿을 수 없는 인증서였습니다.' : ''), 'bad');
    } else {
      push('클라이언트가 인증서를 확인합니다. 첫째는 이 인증서를 믿을 수 있는가입니다. 클라이언트는 믿는 목록을 가지고 있고, 서버가 내보인 인증서가 그 목록에 있는지 봅니다. 이 인증서는 클라이언트가 믿는 목록에 있어서 통과합니다.', 'good');
      st.chk.push(['접속한 이름이 인증서에 적혀 있는가', other ? '없음' : '있음', other ? 'bad' : 'good']);
      push('둘째는 접속한 이름이 인증서에 적혀 있는가입니다. 접속한 이름은 ' + host + '입니다. 인증서에 적힌 이름은 localhost뿐입니다.' + (other ? ' 접속한 이름이 적혀 있지 않아서, 이 인증서가 이 주소의 서버가 낸 것이라고 인정할 수 없습니다.' : ' 접속한 이름이 적혀 있어서 통과합니다.'), other ? 'bad' : 'good');
    }
    if (!trust || other) {
      var why = !trust ? 'trust' : 'name';
      st.clc = 'bad'; st.clt = ['연결을 끊음']; st.a2 = ''; st.cut = true; st.a1 = 'bad'; st.conn = this.CONN[why]; st.connc = 'bad';
      push('확인에 실패해서 클라이언트가 연결을 끊습니다. HTTP 요청 글자(POST /login과 password=1234)는 보내지 않았습니다.', 'bad');
      st.seenc = 'plain'; st.seent = ['연결을 시작하는 쪽의', '바이트까지만 지나감', '(요청은 지나가지 않음)']; st.mid = this.MID.none;
      push('중간에서 본 것은 연결을 시작하는 쪽의 바이트까지입니다. 요청을 보내지 않았으므로 POST /login도 password=1234도 지나간 적이 없습니다. 이 실행에서 중간에 둔 중계기가 기록한 바이트 안에서 찾아본 결과입니다.' + sni, '');
      st.svt = ['요청을 받지 못함']; st.got = '받지 못함'; st.gotc = 'bad';
      push('서버의 요청 처리 함수는 불리지 않았고, 서버가 받은 내용은 없습니다. 클라이언트가 먼저 연결을 끊었기 때문입니다.', 'bad');
      if (why === 'trust') {
        sum.push('클라이언트가 서버의 인증서를 믿지 않으면 연결을 끊고 요청을 보내지 않습니다. 중간에서도 서버에서도 password=1234는 나타나지 않았습니다.');
        sum.push('암호화는 상대가 누구인지 확인된 뒤에 시작합니다.' + (other ? ' 이 조합은 접속한 이름도 인증서에 적혀 있지 않았지만, 클라이언트가 알린 이유는 믿을 수 없는 인증서였습니다.' : ' 접속한 이름이 인증서에 적혀 있어도, 인증서를 믿는 목록에 없으면 막힙니다.'));
      } else {
        sum.push('인증서가 믿는 목록에 있어도, 접속한 이름 127.0.0.1이 인증서에 적혀 있지 않으면 클라이언트가 연결을 끊고 요청을 보내지 않습니다.');
        sum.push('인증서는 이름과 함께 확인합니다. localhost와 127.0.0.1은 이 컴퓨터를 가리키는 주소이지만, 인증서에 적힌 것은 이름 localhost뿐이라 127.0.0.1로 접속한 클라이언트는 이 인증서를 인정하지 않았습니다.');
      }
      return { events: ev, summary: sum, row: [this.CONN[why], this.MID.none, '받지 못함'] };
    }
    st.clc = 'good'; st.clt = ['확인을 통과함']; st.conn = this.CONN.ok; st.connc = 'good'; st.svt = ['암호화된 통신 시작'];
    push('두 확인을 모두 통과했습니다. 양쪽은 HTTP 글자를 암호화하는 데 쓸 열쇠를 정한 상태로 암호화된 통신을 시작합니다. 열쇠를 어떻게 정하는지는 "세부 동작 실습: TLS 핸드셰이크"에서 다룹니다.', 'good');
    st.clt = ['암호화해서 보냄']; st.a1 = 'good';
    push('클라이언트가 HTTP 요청 글자(POST /login 요청과 본문 password=1234)를 암호화해서 보냅니다. 암호화하기 전의 글자는 http://로 보낼 때와 같습니다.', '');
    st.seenc = 'good'; st.seent = ['알아볼 수 없는 바이트', '(password=1234 없음)']; st.mid = this.MID.enc; st.midc = 'good';
    push('중간에서 지나가는 바이트를 들여다보면 알아볼 수 없는 바이트가 보입니다. POST /login도 password=1234도 글자로 찾을 수 없습니다. 이 실행에서 중간에 둔 중계기가 기록한 바이트 안에서 찾아본 결과입니다.' + sni, 'good');
    st.svc = 'good'; st.svt = ['받은 본문:', 'password=1234']; st.got = 'password=1234'; st.gotc = 'good';
    push('서버가 받은 바이트를 열쇠로 풀어 원래 글자를 얻습니다. 서버의 요청 처리 함수가 받은 본문은 password=1234입니다. 암호화는 중간에서 보이는 것만 바꾸고, 서버가 받는 글자는 바꾸지 않습니다.', 'good');
    sum.push('HTTPS는 HTTP와 같은 글자(POST /login, password=1234)를 암호화해서 보내는 것입니다. 중간에서 들여다보면 알아볼 수 없는 바이트가 보이고, 서버는 풀어서 원래 글자 password=1234를 받습니다.');
    sum.push('암호화를 시작하기 전에 서버가 인증서를 내보이고, 클라이언트가 믿는 목록에 있는지와 접속한 이름이 인증서에 적혀 있는지를 확인합니다. 두 확인을 통과해야 요청을 보냅니다.');
    return { events: ev, summary: sum, row: [this.CONN.ok, this.MID.enc, 'password=1234'] };
  },
  render: function (v, sim, t, H, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : null;
    if (!s) { H.text(v, '실행을 누르면 클라이언트가 서버에 연결하는 것부터 시작합니다.'); return; }
    if (s.chk.length) H.table(v, ['클라이언트가 한 확인', '결과'], s.chk.map(function (r) { return { cls: '', cells: [r[0], { v: r[1], cls: r[2] }] }; }), '인증서 확인');
    H.table(v, ['항목', '값'], [
      { cls: s.conn ? '' : 'gone', cells: ['클라이언트의 연결', s.conn ? { v: s.conn, cls: s.connc } : '아직'] },
      { cls: s.mid ? '' : 'gone', cells: ['중간에서 들여다본 내용', s.mid ? { v: s.mid, cls: s.midc } : '아직'] },
      { cls: s.got ? '' : 'gone', cells: ['서버가 받은 내용', s.got ? { v: s.got, cls: s.gotc } : '아직'] },
    ], '결과');
  },
  // 그림: 왼쪽에 클라이언트, 가운데에 "중간(공유기, 통신사 장비 등)에서 보이는 것" 상자, 오른쪽에 서버와 인증서. 가운데 상자의 글이 password=1234(빨강)인지 알아볼 수 없는 바이트(초록)인지가 핵심이다. 확인에 실패해 연결이 끊기면 클라이언트에서 가운데까지만 화살표가 있고 서버로 가는 화살표는 끊긴다. 아래에 결과 세 칸.
  draw: function (P, sim, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : null, https = sim.c.scheme === 'https';
    P.size(680, 356);
    P.box('cl', 14, 82, 120, 76, { cls: s ? s.clc : 'plain', title: '클라이언트', sub: s ? s.clt : ['대기'] });
    P.region('rmid', 190, 14, 262, 190, '중간 (공유기, 통신사 장비 등)');
    P.box('seen', 200, 54, 242, 140, { cls: s ? s.seenc : 'ghost', title: '여기서 보이는 것', sub: s ? s.seent : ['아직 아무것도', '지나가지 않음'] });
    P.region('rsv', 508, 14, 158, 190, '서버');
    P.box('sv', 516, 50, 142, 62, { cls: s ? s.svc : 'plain', title: '서버', sub: s ? s.svt : ['대기'] });
    P.box('cert', 516, 128, 142, 66, { cls: s ? s.certc : 'ghost', title: '인증서', sub: s ? s.certt : (https ? ['이름: localhost'] : ['인증서 없음']) });
    if (s && s.a1) P.arrow('a1', 'cl:r', 'seen:l', { cls: s.a1 === 'plain' ? '' : s.a1 });
    if (s && s.a2) P.arrow('a2', 'seen:r:0.3', 'sv:l', { cls: s.a2 === 'plain' ? '' : s.a2 });
    if (s && s.cut) P.text('cutx', 479, 100, '끊김', { cls: 'bad', anchor: 'middle', bold: true });
    P.box('n1', 14, 218, 652, 36, { cls: s && s.conn ? s.connc || 'wait' : 'ghost', title: '클라이언트의 연결', right: s && s.conn ? s.conn.replace('클라이언트가 연결을 끊음', '끊음') : '아직' });
    P.box('n2', 14, 262, 652, 36, { cls: s && s.mid ? s.midc || 'wait' : 'ghost', title: '중간에서 들여다본 내용', right: s && s.mid ? s.mid : '아직' });
    P.box('n3', 14, 306, 652, 36, { cls: s && s.got ? s.gotc || 'wait' : 'ghost', title: '서버가 받은 내용', right: s && s.got ? s.got : '아직' });
  },
  assume: '여덟 가지 조합을 모두 이 PC의 127.0.0.1 안에서만 실제로 실행해 대조했습니다. 외부 네트워크에는 연결하지 않았습니다. 서버는 Node.js 24.18.0의 http 서버 또는 https 서버(요청 처리 함수가 받은 본문을 기록)이고, 클라이언트는 같은 Node.js의 http.request 또는 https.request입니다. 서버와 클라이언트 사이에는 Probe가 만든 TCP 중계기를 두었습니다. 중계기는 받은 바이트를 그대로 반대편에 넘기면서 양쪽 방향의 바이트를 모두 기록하고, 그림 가운데의 "중간(공유기, 통신사 장비 등)에서 보이는 것"은 이 기록으로 재현했습니다. 기록된 전체 바이트 안에서 password=1234와 POST /login이라는 글자를 찾았습니다. http://로 접속한 네 조합에서는 두 글자가 모두 있었고, https://로 접속한 조합에서는 연결된 것과 끊긴 것 모두 두 글자가 없었습니다. 이것은 이 실행에서 찾아본 결과이고, 암호가 안전하다는 증명은 아닙니다. 또 https://로 localhost에 접속한 조합에서는 연결을 시작하는 바이트에 localhost라는 글자가 보였고 127.0.0.1로 접속한 조합에서는 보이지 않았습니다(관찰만 했고 원인은 이 실습에서 확인하지 않았습니다). 인증서는 이 PC의 openssl 3.5.7로 시험용을 만들었습니다(자체 서명, 이름 localhost, subjectAltName은 DNS:localhost만, 유효 기간 2일, 파일은 verify/out/https_basic/). "클라이언트가 믿는다"는 https.request의 ca 옵션에 이 인증서를 주는 것으로, "믿지 않는다"는 ca 옵션을 주지 않는 것(Node.js에 들어 있는 인증 기관 목록만 믿는 상태)으로 재현했고, 검증을 끄는 rejectUnauthorized: false는 쓰지 않았습니다. 믿지 않는 두 조합은 DEPTH_ZERO_SELF_SIGNED_CERT 오류로, 믿지만 127.0.0.1로 접속한 조합은 ERR_TLS_CERT_ALTNAME_INVALID 오류(메시지는 Hostname/IP does not match certificate\'s altnames로 시작)로 연결이 끊겼습니다. 둘 다 해당하는 조합(믿지 않고 127.0.0.1로 접속)에서는 믿을 수 없는 인증서 오류가 나왔고, 이름 불일치 오류는 나오지 않았습니다. 끊긴 조합에서는 서버의 요청 처리 함수가 한 번도 불리지 않았고(서버는 연결이 끊겼다는 오류 ECONNRESET만 기록), 연결된 조합에서는 서버가 POST /login 요청의 본문 password=1234를 받았습니다. 연결된 조합이 사용한 TLS 버전은 TLSv1.3, 암호 묶음은 TLS_AES_256_GCM_SHA384였고, 끊긴 조합의 TLS 버전은 재지 못했습니다. 화면의 8080과 8443은 예시 번호이고 실제로는 빈 포트를 썼으며, password=1234는 시험용 글자입니다. 실제 브라우저와 운영체제에는 믿는 인증 기관의 목록이 미리 들어 있고 서버의 인증서는 그 기관이 서명해 준 것이어야 하는데, 이 실습은 그것을 다루지 않고 "믿는 목록에 있음/없음"만 다뤘습니다. 실제 브라우저로는 실행해 보지 않았습니다. 문서로 확인한 것은 RFC 9110의 4.2.2절(https URI 스킴: TLS로 보호된 연결, 서버가 해당 권한의 서버로 인증됨, 기본 포트 443)과 4.3.4절(https 인증서 확인: 접속한 주소의 서버와 인증서의 신원이 맞는지 확인해야 하고, 확인에는 믿는 인증서 목록이 필요하다. 인증서가 그 주소에 유효하지 않으면 브라우저 같은 사용자 에이전트는 사용자의 확인을 받거나 연결을 끊어야 하고 자동 클라이언트는 연결을 끊는 것이 권장된다), RFC 8446의 1절(TLS의 목적은 두 상대 사이의 안전한 통로이고, 통로의 데이터는 양 끝에서만 보이며 변조되면 알 수 있다)입니다. 이 실습의 클라이언트는 자동으로 동작하는 프로그램이라 사용자에게 묻지 않고 끊습니다. 브라우저가 경고 화면을 보여 주고 계속할지 묻는 경우는 다루지 않았습니다. 암호화 전에 열쇠를 정하는 방법과 TLS 핸드셰이크의 메시지 순서, 인증서의 유효 기간·폐기·체인은 다루지 않았고 "세부 동작 실습: TLS 핸드셰이크"에서 다룹니다. 화면의 코드는 클라이언트가 접속하는 주소와 보내는 내용, 서버의 인증서 사정을 보인 것이고 서버나 클라이언트의 프로그램 코드가 아닙니다.',
});

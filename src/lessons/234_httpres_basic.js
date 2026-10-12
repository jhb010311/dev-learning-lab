Lab.register({
  id: 'httpres_basic', nav: 'HTTP 응답', cat: '기초개념', mode: 'step', basic: true, deep: ['httpmsg'],
  title: 'HTTP 응답은 어떻게 생긴 글인가',
  intro: '서버가 요청에 답해 돌려주는 HTTP 응답도 정해진 모양의 글자 몇 줄입니다. 첫 줄(상태 줄)에는 버전과 상태 코드(200, 404 같은 세 자리 숫자)와 짧은 설명을 적습니다. 그 아래에는 "이름: 값" 꼴의 줄인 헤더를 적고, 아무 글자도 없는 빈 줄 뒤에 본문(실제 내용)을 붙입니다. 클라이언트(브라우저)는 상태 코드로 요청이 어떻게 됐는지를 알고, Content-Type 헤더로 본문이 어떤 종류의 내용인지를 알고, Content-Length 헤더로 본문이 몇 바이트인지를 압니다. 이 실습은 상태 줄, Content-Type 줄, Content-Length 줄을 하나씩 바꾸거나 지워 가며 그 글자를 그대로 클라이언트에 보내, 클라이언트가 무엇을 읽어 내는지를 봅니다. 코드 칸의 (빈 줄)은 아무 글자도 없는 줄을 눈에 보이게 적은 것입니다.',
  terms: ['상태 줄(status line)', 'HTTP 상태 코드', 'Content-Type 헤더', 'Content-Length 헤더'],
  controls: [
    { id: 'status', label: '첫 줄', type: 'select', value: 'ok', options: [['ok', '첫 줄: HTTP/1.1 200 OK'], ['notfound', '첫 줄: HTTP/1.1 404 Not Found'], ['none', '첫 줄(상태 줄)을 지운다']] },
    { id: 'ctype', label: 'Content-Type: text/plain; charset=utf-8 줄을 적는다', type: 'check', value: true },
    { id: 'clen', label: 'Content-Length 줄', type: 'select', value: 'right', options: [['right', 'Content-Length: 15 (본문과 같은 바이트 수)'], ['short', 'Content-Length: 6 (본문보다 짧게)'], ['none', 'Content-Length 줄을 지운다']] },
  ],
  // q는 물음 방식의 화면에 보이는 물음, t와 d는 글로만 읽는 본문에 쓰이는 이름과 설명
  presets: [
    { t: '처음 설정으로', q: 'HTTP 응답은 어떻게 생겼고, 클라이언트는 무엇을 보고 읽나', d: '모양이 맞는 응답. 클라이언트가 상태, 본문의 종류, 본문을 모두 읽어 냅니다.', v: { status: 'ok', ctype: true, clen: 'right' } },
    { t: '상태 코드를 404로 바꾸면', q: '상태 코드를 404로 바꾸면', d: '상태만 404로 읽히고, 본문은 그대로 읽힙니다.', v: { status: 'notfound', ctype: true, clen: 'right' } },
    { t: 'Content-Type 줄을 지우면', q: 'Content-Type 줄을 지우면', d: '본문은 읽히지만 본문의 종류를 알려 주는 헤더가 없습니다.', v: { status: 'ok', ctype: false, clen: 'right' } },
    { t: 'Content-Length를 본문보다 짧게 적으면', q: 'Content-Length를 본문보다 짧게 적으면', d: '적힌 6바이트만 본문으로 읽혀 글이 잘립니다.', v: { status: 'ok', ctype: true, clen: 'short' } },
    { t: 'Content-Length 줄을 지우면', q: 'Content-Length 줄을 지우면', d: '길이 정보가 없어, 연결이 닫힐 때까지 받은 글자 전부가 본문이 됩니다.', v: { status: 'ok', ctype: true, clen: 'none' } },
    { t: '첫 줄(상태 줄)을 지우면', q: '첫 줄(상태 줄)을 지우면', d: '응답으로 읽히지 않습니다. 헤더와 본문이 맞아도 소용이 없습니다.', v: { status: 'none', ctype: true, clen: 'right' } },
  ],
  STATUS: { ok: 'HTTP/1.1 200 OK', notfound: 'HTTP/1.1 404 Not Found' },
  CLEN: { right: 'Content-Length: 15', short: 'Content-Length: 6' },
  TYPE: 'Content-Type: text/plain; charset=utf-8',
  code: function (c) {
    var out = [];
    if (c.status !== 'none') out.push(this.STATUS[c.status]);
    if (c.ctype) out.push(this.TYPE);
    if (c.clen !== 'none') out.push(this.CLEN[c.clen]);
    out.push('(빈 줄)', '안녕하세요');
    return out.join('\n');
  },
  label: function (c) { return { ok: '첫 줄 200 OK', notfound: '첫 줄 404 Not Found', none: '상태 줄 없음' }[c.status] + ' · ' + (c.ctype ? 'Content-Type 있음' : 'Content-Type 없음') + ' · ' + { right: 'Content-Length 15', short: 'Content-Length 6', none: 'Content-Length 없음' }[c.clen]; },
  columns: ['클라이언트가 읽은 상태', '클라이언트가 알아낸 본문의 종류', '클라이언트가 읽은 본문'],
  simulate: function (c) {
    var ev = [], sum = [], B = '안녕하세요', unread = c.status === 'none', ok = c.status === 'ok', num = ok ? '200' : '404';
    var stTxt = unread ? '응답으로 읽지 못함' : ok ? '200 OK' : '404 Not Found';
    var tyTxt = unread ? '없음 (응답을 읽지 못함)' : c.ctype ? 'text/plain; charset=utf-8' : '알 수 없음 (헤더가 없음)';
    var boTxt = unread ? '없음 (응답을 읽지 못함)' : c.clen === 'short' ? '안녕' : B;
    var bytes = unread ? 0 : c.clen === 'short' ? 6 : 15;
    var st = { sent: false, c1: unread ? 'ghost' : 'plain', c2: c.ctype ? 'plain' : 'ghost', c3: c.clen !== 'none' ? 'plain' : 'ghost', c4: 'plain', c5: 'plain', bsub: B, rdc: 'plain', rdt: ['대기'], gst: '', gty: '', gbo: '', arrR: false, arrD: false, rcv: false, done: false, rows: [] };
    function push(s, k) { ev.push({ s: s, k: k, snap: JSON.parse(JSON.stringify(st)) }); }
    var devs = [];
    if (c.status === 'notfound') devs.push('상태 줄의 404');
    if (unread) devs.push('상태 줄 없음');
    if (!c.ctype) devs.push('Content-Type 줄 없음');
    if (c.clen === 'short') devs.push('Content-Length 6');
    if (c.clen === 'none') devs.push('Content-Length 줄 없음');
    var note = devs.length ? ' 코드 칸에서 처음 설정과 달라진 곳은 ' + devs.join(', ') + '입니다.' : '';
    // 1단계: 서버가 글자를 보낸다
    st.sent = true;
    push('클라이언트가 서버에 GET /hello 요청을 보내자, 서버가 요청에 답해 아래와 같은 글자를 돌려보냅니다. 이 글자가 HTTP 응답입니다. 이 실습의 서버는 코드 칸의 글자를 그대로 보내고, 다 보내면 연결을 닫습니다. 응답을 읽는 클라이언트는 Node.js의 http 모듈입니다.' + note, '');
    if (unread) {
      // 2단계: 첫 줄이 상태 줄이 아니다
      var first = c.ctype ? '이 글의 첫 줄은 "' + this.TYPE + '"입니다' : c.clen !== 'none' ? '이 글의 첫 줄은 "' + this.CLEN[c.clen] + '"입니다' : '이 글은 곧바로 아무 글자도 없는 빈 줄로 시작하고, 그 뒤에 본문이 이어집니다';
      var fid = c.ctype ? 'c2' : c.clen !== 'none' ? 'c3' : 'c4';
      st[fid] = 'bad'; st.rdc = 'bad'; st.rdt = ['응답으로', '읽지 못함']; st.arrR = true;
      st.rows.push([c.ctype ? this.TYPE : c.clen !== 'none' ? this.CLEN[c.clen] : '(빈 줄)', '상태 줄이 아님. 응답으로 읽지 못함']);
      push('클라이언트가 첫 줄을 읽습니다. 응답의 첫 줄은 HTTP/1.1처럼 어떤 규칙으로 쓴 글인지를 밝히는 상태 줄이어야 합니다. 그런데 ' + first + '. HTTP/로 시작하는 글이 오지 않아서, 클라이언트는 이 글을 HTTP 응답으로 읽지 못하고 오류를 냅니다.', 'bad');
      st.gst = stTxt; st.gty = tyTxt; st.gbo = boTxt; st.rcv = true; st.done = true;
      push('클라이언트는 응답을 읽지 못했습니다. 상태도, 본문의 종류도, 본문도 얻지 못했습니다. 이 글 뒤에 이어지는 ' + (c.ctype || c.clen !== 'none' ? '헤더와 본문' : '본문') + '은 모양이 어떻든 읽히지 않았습니다.', 'bad');
      sum.push('첫 줄(상태 줄)을 지우면 클라이언트는 그 글을 HTTP 응답으로 읽지 못하고 오류를 냅니다. 상태도 본문도 얻지 못했습니다.');
      sum.push('헤더와 본문이 맞아도 소용이 없습니다. 클라이언트는 HTTP/로 시작하는 상태 줄부터 읽기 때문에, 상태 줄이 없으면 Content-Type과 Content-Length가 어떻든 결과가 같습니다.');
      return { events: ev, summary: sum, bytes: bytes, row: [stTxt, tyTxt, boTxt] };
    }
    // 2단계: 상태 줄
    var line = this.STATUS[c.status];
    st.c1 = 'hot'; st.rdc = 'hot'; st.rdt = ['첫 줄을', '읽는 중']; st.arrR = true; st.gst = stTxt;
    st.rows.push([line, '상태 줄. 버전 HTTP/1.1, 상태 코드 ' + num + ', 설명 ' + (ok ? 'OK' : 'Not Found')]);
    push('클라이언트가 첫 줄을 읽습니다. 읽은 글은 "' + line + '"입니다. 첫 줄(상태 줄)에는 세 가지가 차례로 적힙니다. HTTP/1.1은 어떤 규칙으로 쓴 글인지(버전), ' + num + ' 부분은 요청이 어떻게 됐는지를 알리는 세 자리 숫자(상태 코드), ' + (ok ? 'OK' : 'Not Found') + '는 그 코드를 사람이 읽도록 풀어 쓴 짧은 설명입니다. ' + (ok ? '200은 요청이 잘 처리됐다는 뜻입니다.' : '404는 서버가 요청한 것을 찾지 못했다는 뜻입니다.') + ' 클라이언트가 읽은 상태는 "' + stTxt + '"입니다.', ok ? '' : 'bad');
    // 3단계: Content-Type 줄
    if (c.ctype) {
      st.c1 = 'plain'; st.c2 = 'hot'; st.rdt = ['Content-Type', '읽는 중']; st.gty = tyTxt;
      st.rows.push([this.TYPE, '헤더. 본문의 종류']);
      push('클라이언트가 다음 줄을 읽습니다. 읽은 글은 "' + this.TYPE + '"입니다. "이름: 값" 꼴의 줄을 헤더라고 합니다. Content-Type 헤더는 본문이 어떤 종류의 내용인지를 알려 줍니다. text/plain은 꾸밈없는 글자라는 뜻이고, charset=utf-8은 그 글자를 UTF-8 방식으로 적었다는 뜻입니다.', '');
    }
    // 4단계: Content-Length 줄
    if (c.clen !== 'none') {
      st.c2 = c.ctype ? 'plain' : st.c2; st.c1 = 'plain'; st.c3 = 'hot'; st.rdt = ['Content-Length', '읽는 중'];
      st.rows.push([this.CLEN[c.clen], '헤더. 본문의 바이트 수']);
      push('클라이언트가 다음 줄을 읽습니다. 읽은 글은 "' + this.CLEN[c.clen] + '"입니다. Content-Length 헤더는 본문이 몇 바이트인지를 알려 주고, 클라이언트는 이 숫자로 본문이 어디까지인지를 정합니다. 바이트는 컴퓨터가 글자를 세는 단위이고, UTF-8에서 한글 한 글자는 3바이트라서 "' + B + '" 다섯 글자는 15바이트입니다.' + (c.clen === 'short' ? ' 서버가 실제로 보낸 본문은 15바이트이지만 Content-Length에는 6이라고 적혀 있습니다. 클라이언트는 적힌 숫자를 따릅니다.' : ''), '');
    }
    // 5단계: 빈 줄
    st.c1 = 'plain'; st.c2 = c.ctype ? 'plain' : 'ghost'; st.c3 = c.clen !== 'none' ? 'plain' : 'ghost'; st.c4 = 'hot'; st.rdt = ['빈 줄:', '헤더 끝']; st.gty = tyTxt;
    st.rows.push(['(빈 줄)', '아무 글자도 없는 줄. 헤더의 끝']);
    var miss = (!c.ctype ? ' Content-Type 헤더가 오지 않았으므로, 클라이언트는 본문이 어떤 종류의 내용인지 알려 주는 정보를 받지 못했습니다.' : '') + (c.clen === 'none' ? ' Content-Length 헤더도 오지 않았으므로, 본문이 몇 바이트인지 알려 주는 정보가 없습니다.' : '');
    push('클라이언트가 다음 줄을 읽었더니 아무 글자도 없는 빈 줄입니다(화면의 (빈 줄)). 빈 줄은 헤더가 끝났다는 표시이고, 다음 글자부터는 본문입니다.' + miss, c.ctype && c.clen !== 'none' ? '' : 'bad');
    // 6단계: 본문
    st.c4 = 'plain'; st.c5 = 'hot'; st.rdt = ['본문을', '읽는 중']; st.arrD = true; st.gbo = boTxt; st.rows.push(['안녕하세요', '본문. 실제 내용']);
    if (c.clen === 'right') {
      st.bsub = '안녕하세요 (15바이트 모두)';
      push('클라이언트가 Content-Length에 적힌 15바이트만큼을 본문으로 읽습니다. 읽은 글은 "' + B + '"이고, 본문이 정확히 여기서 끝납니다. 본문이 어디서 끝나는지를 이 숫자로 압니다.', 'good');
    } else if (c.clen === 'short') {
      st.c5 = 'bad'; st.bsub = '안녕 | 하세요 (앞 6바이트만 본문)';
      push('클라이언트가 Content-Length에 적힌 6바이트만큼만 본문으로 읽습니다. 한글 한 글자가 3바이트라서 6바이트는 "안녕" 두 글자입니다. 나머지 9바이트("하세요")는 이 응답의 본문이 아닙니다. 서버는 15바이트를 보냈지만 클라이언트는 적힌 숫자에서 멈춥니다. 이 실습의 클라이언트는 남은 글자를 읽다가 오류를 하나 냈지만, 앞의 6바이트는 본문으로 받았습니다.', 'bad');
    } else {
      st.bsub = '안녕하세요 (연결이 닫힐 때까지)';
      push('이 응답에는 Content-Length가 없어서 본문이 몇 바이트인지 알려 주는 정보가 없습니다. 그래서 클라이언트는 서버가 연결을 닫을 때까지 온 글자 전부를 본문으로 읽습니다. 이 서버는 15바이트를 보낸 뒤 연결을 닫았으므로, 본문은 "' + B + '"입니다.', '');
    }
    // 7단계: 읽은 결과
    st.rdc = 'good'; st.rcv = true; st.done = true; st.rdt = ['읽기 끝'];
    push('클라이언트가 응답을 다 읽었습니다. 읽어 낸 것은 상태 "' + stTxt + '", 본문의 종류 ' + (c.ctype ? '"' + tyTxt + '"' : '알 수 없음') + ', 본문 "' + boTxt + '"입니다.' + (ok ? '' : ' 상태가 404여도 본문은 따로 읽혔습니다.'), ok && c.clen !== 'short' ? 'good' : 'bad');
    // 요약
    var S = [], L = [];
    if (!ok) { S.push('상태 코드를 404로 바꾸면 클라이언트는 요청이 404 Not Found 상태로 끝났다고 읽습니다.'); L.push('상태 코드는 요청이 어떻게 됐는지를 알리는 칸이고, 본문은 따로 읽는 칸입니다. 404여도 서버가 붙인 본문은 그대로 클라이언트에 도착했습니다.'); }
    if (!c.ctype) { S.push('Content-Type 줄을 지우면 클라이언트는 본문이 어떤 종류의 내용인지 알려 주는 헤더를 받지 못합니다.'); L.push('Content-Type이 없어도 본문 글자는 그대로 도착합니다. 다만 그 글자가 어떤 종류의 내용인지는 응답이 알려 주지 않습니다. 브라우저가 이때 본문을 어떻게 추측해 보여 주는지는 이 실습에서 확인하지 않았습니다.'); }
    if (c.clen === 'short') { S.push('Content-Length를 본문보다 짧은 6으로 적으면 클라이언트는 앞의 6바이트인 "안녕"만 본문으로 읽습니다.'); L.push('클라이언트는 본문의 끝을 글자 수가 아니라 Content-Length의 바이트 수로 정합니다. 서버가 보낸 나머지 9바이트는 본문으로 읽히지 않았습니다.'); }
    if (c.clen === 'none') { S.push('Content-Length 줄을 지워도, 이 서버는 글자를 다 보낸 뒤 연결을 닫기 때문에 클라이언트는 받은 글자 전부인 "안녕하세요"를 본문으로 읽습니다.'); L.push('길이를 알려 주는 줄이 없으면 클라이언트는 연결이 닫혀야 본문이 끝났음을 압니다. 같은 글을 연결을 닫지 않는 서버가 보냈을 때는 본문 15바이트를 받고도 1.5초가 지나도록 응답이 끝나지 않았습니다.'); }
    if (!devs.length) {
      sum.push('HTTP 응답은 서버가 돌려주는 글자 몇 줄입니다. 첫 줄(상태 줄)에 버전, 상태 코드, 짧은 설명을 적고, 그 아래에 "이름: 값" 꼴의 헤더를 적고, 빈 줄 뒤에 본문을 붙입니다.');
      sum.push('클라이언트는 상태 코드 200으로 요청이 잘 처리됐음을, Content-Type으로 본문이 text/plain 글자임을, Content-Length로 본문이 15바이트임을 알고 본문을 읽었습니다. 읽은 본문은 "' + B + '"입니다.');
    } else if (devs.length === 1) {
      sum.push(S[0]); sum.push(L[0]);
    } else {
      sum.push(S.join(' '));
      sum.push('상태 코드, Content-Type, Content-Length는 맡은 일이 다른 줄이라서, 하나가 달라져도 나머지는 각자 읽힙니다.');
    }
    return { events: ev, summary: sum, bytes: bytes, row: [stTxt, tyTxt, boTxt] };
  },
  render: function (v, sim, t, H, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : null;
    if (!s) { H.text(v, '실행을 누르면 서버가 보낸 글자를 클라이언트가 한 줄씩 읽는 것부터 시작합니다.'); return; }
    if (s.rows.length) H.table(v, ['클라이언트가 읽은 줄', '뜻'], s.rows.map(function (r) { return { cls: '', cells: [r[0], r[1]] }; }), '읽은 줄');
    H.table(v, ['항목', '값'], [
      { cls: s.gst ? '' : 'gone', cells: ['읽은 상태', s.gst ? { v: s.gst, cls: s.gst.indexOf('200') === 0 ? 'good' : 'bad' } : '아직'] },
      { cls: s.gty ? '' : 'gone', cells: ['본문의 종류', s.gty ? s.gty : '아직'] },
      { cls: s.gbo ? '' : 'gone', cells: ['읽은 본문', s.gbo ? s.gbo : '아직'] },
    ], '결과');
  },
  // 그림: 오른쪽에 서버, 가운데에 서버가 보낸 글(상태 줄, Content-Type 줄, Content-Length 줄, 빈 줄, 본문을 상자로), 왼쪽에 클라이언트(응답 읽기와 읽어 낸 것). 지금 읽는 줄은 노랑, 문제가 된 줄은 빨강, 지운 줄은 점선이다.
  draw: function (P, sim, shown) {
    var c = sim.c, last = shown[shown.length - 1], s = last ? last.snap : null, un = c.status === 'none';
    var stSub = un ? '(상태 줄 없음)' : c.status === 'ok' ? 'HTTP/1.1 200 OK' : 'HTTP/1.1 404 Not Found';
    var cls1 = s ? s.c1 : (un ? 'ghost' : 'plain'), cls2 = s ? s.c2 : (c.ctype ? 'plain' : 'ghost'), cls3 = s ? s.c3 : (c.clen !== 'none' ? 'plain' : 'ghost');
    var gs = s && s.gst ? (s.gst.indexOf('응답으로') === 0 ? '읽지 못함' : s.gst.split(' ')[0] === '404' ? '404' : s.gst) : '...', gt = s && s.gty ? (s.gty.indexOf('text/plain') === 0 ? 'text' : '알 수 없음') : '...', gb = s && s.gbo ? (s.gbo.indexOf('없음') === 0 ? '없음' : s.gbo) : '...';
    P.size(680, 300);
    P.region('cl', 10, 16, 140, 216, '클라이언트');
    P.box('rd', 20, 44, 120, 62, { cls: s ? s.rdc : 'plain', title: '응답 읽기', sub: s ? s.rdt : ['대기'] });
    P.box('got', 20, 128, 120, 92, { cls: s && s.done ? (un ? 'bad' : 'good') : 'ghost', title: '읽어 낸 것', sub: ['상태 ' + gs, '종류 ' + gt, '본문 ' + gb] });
    P.region('tx', 190, 16, 350, 216, '서버가 보낸 글');
    P.box('l1', 200, 44, 330, 30, { cls: cls1, sub: stSub, mono: !un });
    P.box('l2', 200, 82, 330, 30, { cls: cls2, sub: c.ctype ? 'Content-Type: text/plain; charset=utf-8' : '(Content-Type 줄 없음)', mono: !!c.ctype });
    P.box('l3', 200, 120, 330, 30, { cls: cls3, sub: c.clen === 'none' ? '(Content-Length 줄 없음)' : c.clen === 'right' ? 'Content-Length: 15' : 'Content-Length: 6', mono: c.clen !== 'none' });
    P.box('l4', 200, 158, 330, 30, { cls: s ? s.c4 : 'plain', sub: '(빈 줄)' });
    P.box('l5', 200, 196, 330, 30, { cls: s ? s.c5 : 'plain', sub: s ? s.bsub : '안녕하세요' });
    P.region('sv', 580, 16, 90, 216, '서버');
    P.box('srv', 590, 82, 70, 70, { cls: s && s.sent ? 'wait' : 'plain', title: '보내기', sub: s && s.sent ? ['보내고', '닫음'] : ['대기'] });
    if (s && s.sent) P.arrow('send', 'srv:l', 'l3:r', {});
    if (s && s.arrR) P.arrow('rd1', 'l2:l', 'rd:r', { cls: un ? 'bad' : 'hot' });
    if (s && s.arrD) P.arrow('rd2', 'rd:b', 'got:t', { cls: 'good' });
    var n1c = s && s.gst ? (s.gst.indexOf('200') === 0 ? 'good' : 'bad') : 'ghost';
    P.box('n1', 14, 250, 322, 36, { cls: n1c, title: '클라이언트가 읽은 상태', right: s && s.gst ? s.gst : '아직' });
    P.box('n2', 344, 250, 322, 36, { cls: s && s.gbo ? (un ? 'bad' : c.clen === 'short' ? 'bad' : 'good') : 'ghost', title: '클라이언트가 읽은 본문', right: s && s.gbo ? s.gbo : '아직' });
  },
  assume: '서버는 Node.js 24.18.0의 net 모듈로 띄운 것으로, 연결이 오면 요청을 빈 줄까지 읽은 뒤 코드 칸의 글자를 줄 끝 CRLF로 그대로 써 보내고 연결을 닫습니다(http 모듈로 응답을 만들면 틀린 모양을 보낼 수 없어 쓰지 않았습니다). 본문 "안녕하세요" 뒤에는 아무것도 붙이지 않았고, 이 글자는 UTF-8로 15바이트, 앞의 "안녕"은 6바이트로 재서 확인했습니다. 클라이언트는 Node.js의 http 모듈(실제 HTTP 해석기)로 GET /hello 요청을 보내 응답을 읽었습니다. 열여덟 가지 조합을 모두 실행해, 클라이언트가 읽은 상태(상태 코드와 설명), 받은 content-type 헤더 값, 실제로 받은 본문과 그 바이트 수를 확인해 모형과 대조했고, 화면의 코드가 서버가 보낸 글과 같은 글인지도 조합마다 확인했습니다. 이 클라이언트는 Content-Length가 6이면 앞의 6바이트("안녕")만 본문으로 받았고, 그때 남은 9바이트를 읽다가 해석 오류(HPE_INVALID_CONSTANT)를 하나 냈습니다. 상태 줄이 없는 여섯 조합은 헤더와 본문이 어떻든 모두 같은 해석 오류(HPE_INVALID_CONSTANT, 메시지는 Expected HTTP/, RTSP/ or ICE/)로 응답을 읽지 못했습니다. 이것들은 이 Node.js 버전에서 관찰한 동작입니다. Content-Length가 없을 때 이 서버는 보낸 뒤 연결을 닫기 때문에 클라이언트가 연결이 닫힐 때까지를 본문으로 읽었습니다. 연결을 닫지 않는 서버는 화면에서 다루지 않았지만, 확인용으로 따로 같은 글을 연결을 닫지 않는 서버에 보내 보았더니 클라이언트는 본문 15바이트를 받고도 1.5초가 지나도록 응답이 끝나지 않았습니다(Content-Length가 있을 때는 연결을 닫지 않아도 바로 끝났습니다). 그 이상 오래 기다렸을 때나 다른 클라이언트에서의 동작은 보지 않았습니다. 브라우저가 Content-Type이 없는 본문을 어떻게 추측해 보여 주는지는 이 실습에서 확인하지 않았습니다. 문서로 확인한 것은 RFC 9112의 2.1절(메시지 형식: 시작 줄, 헤더, 빈 줄, 본문), 4절(상태 줄: 버전, 세 자리 상태 코드, 설명), 6.2절과 6.3절(Content-Length가 본문의 바이트 수를 정하고, 길이 정보가 없는 응답은 서버가 연결을 닫기 전에 받은 바이트 수로 본문 길이가 정해진다는 규칙)과 RFC 9110의 8.3절(Content-Type은 본문의 미디어 타입을 알리고, 없으면 받는 쪽이 application/octet-stream으로 가정하거나 데이터를 살펴 종류를 정할 수 있다), 8.6절(Content-Length), 15절(상태 코드는 세 자리 숫자), 15.3.1절(200), 15.5.5절(404)입니다. 화면의 응답은 헤더를 두 개만 남긴 최소한의 모양이고, 본문이 글자인 GET 응답만 다뤘습니다. 서버가 보낸 글에 줄 끝을 CRLF로 쓴 것, 클라이언트로 Node.js를 쓴 것은 이 실습의 선택이며 브라우저는 쓰지 않았습니다. 같은 주제의 세부 동작(요청과 응답의 모양, 상태 코드 전체)은 "세부 동작 실습: HTTP 메시지와 상태 코드"에서 다룹니다.',
});

Lab.register({
  id: 'cookie_basic', nav: '쿠키', cat: '기초개념', mode: 'step', basic: true, deep: ['cookie'],
  title: '쿠키는 무엇이고, 누가 저장하고 누가 보내는가',
  intro: 'HTTP에서는 요청 하나하나가 따로여서, 서버는 두 번째 요청이 아까 그 사람에게서 온 것인지 스스로는 알 수 없습니다. 쿠키는 이것을 풀기 위한 작은 값입니다. 코드 칸에는 서버가 첫 요청에 돌려주는 응답 글이 있고, 그 안의 Set-Cookie: visitor=kim 줄이 쿠키를 맡기는 줄입니다. 서버는 이 줄로 "이 값을 맡아 두었다가 다음에 올 때 보여 달라"고 부탁합니다. 값을 저장하는 것도, 다시 보내는 것도 브라우저입니다. 브라우저는 저장해 둔 값을 같은 서버로 가는 다음 요청에 Cookie: visitor=kim 헤더로 붙여 보냅니다. 이 실습의 서버는 요청에 Cookie 헤더로 visitor 값이 오면 "또 오셨군요, 값"을, 없으면 "처음 오셨군요"를 돌려주게 만들어 둔 서버이고, 그 서버 코드는 화면에 보이지 않습니다. Set-Cookie 줄을 지우거나, 둘째 요청 전에 쿠키를 지우거나, 쿠키를 저장하지 않는 프로그램으로 요청해 가며, 같은 서버에 두 번 요청했을 때 서버가 둘째 요청을 알아보는지를 봅니다. 코드 칸의 (빈 줄)은 아무 글자도 없는 줄을 눈에 보이게 적은 것입니다.',
  terms: ['쿠키', 'Set-Cookie 헤더', 'Cookie 헤더', 'HTTP와 무상태(Stateless)'],
  controls: [
    { id: 'set', label: '서버가 응답에 Set-Cookie: visitor=kim 줄을 붙인다', type: 'check', value: true },
    { id: 'client', label: '요청을 보내는 쪽', type: 'select', value: 'keep', options: [['keep', '브라우저가 쿠키를 저장해 둔다'], ['clear', '저장했다가, 둘째 요청 전에 사용자가 쿠키를 지운다'], ['nojar', '쿠키를 저장하지 않는 프로그램으로 요청한다']] },
  ],
  // q는 물음 방식의 화면에 보이는 물음, t와 d는 글로만 읽는 본문에 쓰이는 이름과 설명
  presets: [
    { t: '처음 설정으로', q: '쿠키는 어떻게 생겼고, 같은 서버에 한 번 더 요청하면 무슨 일이 일어나나', d: '서버가 Set-Cookie를 붙이고 브라우저가 저장합니다. 둘째 요청에 브라우저가 Cookie 헤더를 붙여, 서버가 알아봅니다.', v: { set: true, client: 'keep' } },
    { t: 'Set-Cookie 줄을 지우면', q: 'Set-Cookie 줄을 지우면', d: '브라우저가 저장할 것이 없어 둘째 요청에 Cookie 헤더가 없고, 서버는 처음 보는 사람으로 대합니다.', v: { set: false, client: 'keep' } },
    { t: '둘째 요청 전에 쿠키를 지우면', q: '둘째 요청 전에 브라우저에서 쿠키를 지우면', d: '저장했던 쿠키가 사라져 Cookie 헤더를 붙이지 못하고, 서버는 처음 보는 사람으로 대합니다.', v: { set: true, client: 'clear' } },
    { t: '쿠키를 저장하지 않는 프로그램으로', q: '쿠키를 저장하지 않는 프로그램으로 요청하면', d: '서버가 Set-Cookie를 붙여도 저장하지 않아서 둘째 요청에 Cookie 헤더가 없습니다.', v: { set: true, client: 'nojar' } },
  ],
  code: function (c) {
    var out = ['HTTP/1.1 200 OK'];
    if (c.set) out.push('Set-Cookie: visitor=kim');
    out.push('Content-Type: text/plain; charset=utf-8', '(빈 줄)', '처음 오셨군요');
    return out.join('\n');
  },
  label: function (c) { return (c.set ? 'Set-Cookie 줄 있음' : 'Set-Cookie 줄 없음') + ' · ' + { keep: '브라우저가 쿠키를 저장', clear: '둘째 요청 전에 쿠키를 지움', nojar: '쿠키를 저장하지 않는 프로그램' }[c.client]; },
  columns: ['첫 응답 뒤 클라이언트에 저장된 쿠키', '둘째 요청에 실린 Cookie 헤더', '둘째 응답'],
  simulate: function (c) {
    var ev = [], sum = [], nojar = c.client === 'nojar', clear = c.client === 'clear';
    var who = nojar ? '쿠키를 저장하지 않는 프로그램' : '브라우저', whoGa = who + (nojar ? '이' : '가');
    var saved = c.set && !nojar, cookie2 = c.set && c.client === 'keep';
    var resp2 = cookie2 ? '또 오셨군요, kim' : '처음 오셨군요';
    var st = { m: 0, jar: '없음', att: '', read: '', r1: '', r2: '', r3: '', rows: [], done: false };
    function push(s, k) { ev.push({ s: s, k: k, snap: JSON.parse(JSON.stringify(st)) }); }
    // 1단계: 첫 요청
    st.m = 1; st.rows.push(['첫 요청', 'Cookie 헤더 없음', '']);
    push(nojar ? '쿠키를 저장하지 않는 프로그램이 서버에 GET / 요청을 보냅니다. 이 요청에는 Cookie 헤더가 없습니다.' : '브라우저 주소창에 localhost:8080 주소를 입력하면, 브라우저가 서버에 GET / 요청을 보냅니다. 이 요청에는 Cookie 헤더가 없습니다.', '');
    // 2단계: 서버가 첫 요청을 읽는다
    st.read = '없음';
    push('서버가 요청을 읽습니다. Cookie 헤더가 없어서 누구인지 알 수 없습니다. HTTP에서는 요청 하나하나가 따로여서, 서버는 이 요청이 전에 온 사람에게서 온 것인지 스스로는 알 수 없습니다. 이 서버는 Cookie 헤더로 visitor 값이 오면 "또 오셨군요, 값"을, 없으면 "처음 오셨군요"를 돌려주게 만들어 두었습니다. 이 서버 코드는 화면에 보이지 않습니다.', '');
    // 3단계: 첫 응답
    st.m = 2; st.rows.push(['첫 응답', c.set ? 'Set-Cookie: visitor=kim' : 'Set-Cookie 줄 없음', '처음 오셨군요']);
    if (c.set) push('서버가 응답을 보냅니다. 본문은 "처음 오셨군요"이고, 코드 칸의 Set-Cookie: visitor=kim 줄이 붙어 있습니다. 이 줄은 "이 값을 맡아 두었다가 다음에 올 때 보여 달라"는 뜻입니다.', 'good');
    else push('서버가 응답을 보냅니다. 본문은 "처음 오셨군요"입니다. 코드 칸의 응답에는 Set-Cookie 줄이 없어서, 서버는 맡겨 둘 값을 주지 않았습니다.', '');
    // 4단계: 클라이언트가 응답을 받는다
    if (saved) {
      st.jar = 'visitor=kim'; st.r1 = 'visitor=kim';
      push(whoGa + ' 응답을 받고, Set-Cookie 줄의 visitor=kim을 자기 쪽에 저장합니다. 값이 저장되는 곳은 브라우저이고, 서버가 아닙니다. 이 서버에는 방문자를 적어 두는 곳이 없습니다.', 'good');
    } else if (c.set) {
      st.r1 = '없음';
      push(whoGa + ' 응답을 받습니다. 본문을 읽을 뿐 Set-Cookie 줄의 값을 저장해 두지 않아서, 저장된 쿠키는 없는 채로 남습니다.', 'bad');
    } else {
      st.r1 = '없음';
      push(whoGa + ' 응답을 받습니다. 응답에 Set-Cookie 줄이 없어서 저장할 값이 없고, 저장된 쿠키는 없는 채로 남습니다.', '');
    }
    // 5단계: 사용자가 쿠키를 지운다
    if (clear) {
      st.jar = '없음';
      push(c.set ? '둘째 요청을 보내기 전에 사용자가 브라우저에서 쿠키를 지웁니다. 저장해 둔 visitor=kim이 사라져서, 저장된 쿠키가 없어집니다.' : '둘째 요청을 보내기 전에 사용자가 브라우저에서 쿠키를 지웁니다. 지울 쿠키가 처음부터 없어서 달라지는 것은 없습니다.', c.set ? 'bad' : '');
    }
    // 6단계: 둘째 요청
    st.m = 3; st.att = cookie2 ? 'Cookie: visitor=kim' : '붙이지 않음'; st.r2 = cookie2 ? 'Cookie: visitor=kim' : '없음';
    st.rows.push(['둘째 요청', cookie2 ? 'Cookie: visitor=kim' : 'Cookie 헤더 없음', '']);
    if (cookie2) push('브라우저가 같은 서버에 둘째 요청을 보냅니다. 이 서버가 맡긴 쿠키가 저장되어 있어서, 브라우저가 저장해 둔 값을 Cookie: visitor=kim 헤더로 요청에 붙입니다. 이 헤더를 붙이는 코드를 우리가 쓰지 않았습니다. 브라우저가 합니다.', 'good');
    else push(whoGa + ' 같은 서버에 둘째 요청을 보냅니다. 저장해 둔 쿠키가 없어서 Cookie 헤더를 붙이지 않습니다.', 'bad');
    // 7단계: 서버가 둘째 요청을 읽는다
    st.read = cookie2 ? 'visitor=kim' : '없음';
    if (cookie2) push('서버가 요청을 읽습니다. Cookie 헤더에 visitor=kim이 있어서 "또 오셨군요, kim"을 본문으로 만듭니다. 서버는 이 사람을 기억하고 있던 것이 아니라, 요청에 실려 온 값을 읽었을 뿐입니다. Cookie 헤더가 와 있으므로 이번 응답에는 Set-Cookie 줄을 붙이지 않습니다.', 'good');
    else push('서버가 요청을 읽습니다. Cookie 헤더가 없어서 첫 요청 때와 똑같이 누구인지 알 수 없습니다. 서버는 앞에서 한 번 응답한 일을 기억하지 못하고, "처음 오셨군요"를 본문으로 만듭니다.' + (c.set ? ' Cookie 헤더가 없는 요청이므로 이번에도 Set-Cookie: visitor=kim 줄을 붙입니다.' : ''), 'bad');
    // 8단계: 둘째 응답
    st.m = 4; st.r3 = resp2; st.done = true; st.rows.push(['둘째 응답', cookie2 ? 'Set-Cookie 줄 없음' : c.set ? 'Set-Cookie: visitor=kim' : 'Set-Cookie 줄 없음', resp2]);
    if (clear && c.set) st.jar = 'visitor=kim';
    push(whoGa + ' 둘째 응답을 받습니다. 본문은 "' + resp2 + '"입니다.' + (clear && c.set ? ' 새로 받은 Set-Cookie 줄을 따라 브라우저가 visitor=kim을 다시 저장합니다.' : ''), cookie2 ? 'good' : 'bad');
    // 요약
    if (cookie2) {
      sum.push('쿠키는 서버가 응답의 Set-Cookie 헤더로 맡기는 작은 값(여기서는 visitor=kim)이고, 브라우저가 그것을 저장해 두었다가 같은 서버로 가는 다음 요청마다 Cookie 헤더로 붙여 보냅니다.');
      sum.push('HTTP는 요청 하나하나가 따로여서 서버가 스스로는 둘째 요청을 알아볼 수 없는데, 쿠키가 요청에 실려 오기 때문에 "또 오셨군요, kim"으로 알아봤습니다. 헤더를 붙인 것은 우리가 쓴 코드가 아니라 브라우저입니다.');
    } else if (!c.set) {
      sum.push('Set-Cookie 줄이 없으면 ' + whoGa + ' 저장할 것이 없고, 둘째 요청에 Cookie 헤더를 붙이지 못합니다. 서버는 둘째 요청도 처음 보는 사람으로 대해 "처음 오셨군요"라고 답했습니다.');
      sum.push('쿠키는 서버가 Set-Cookie로 먼저 맡겨야 시작됩니다. 맡기지 않은 서버에는 ' + whoGa + ' 보낼 쿠키가 없습니다.');
    } else if (clear) {
      sum.push('둘째 요청 전에 사용자가 쿠키를 지우면 브라우저에는 보여 줄 값이 없어서 Cookie 헤더가 붙지 않고, 서버는 다시 처음 보는 사람으로 대해 "처음 오셨군요"라고 답합니다.');
      sum.push('쿠키를 가진 쪽은 브라우저이고, 지우는 것도 사용자가 브라우저에서 합니다. 서버가 아는 것은 요청에 Cookie 헤더가 왔는지뿐이어서, 지운 일을 알지 못합니다. 서버가 Set-Cookie를 다시 붙이면 브라우저는 다시 저장합니다.');
    } else {
      sum.push('쿠키를 저장하지 않는 프로그램은 응답에 Set-Cookie 줄이 있어도 값을 저장하지 않아서 둘째 요청에 Cookie 헤더를 붙이지 않고, 서버는 "처음 오셨군요"라고 답했습니다.');
      sum.push('Set-Cookie는 서버가 하는 부탁이고, 저장해 두었다가 다음 요청에 실어 보내는 일은 요청을 보내는 쪽이 합니다. 서버가 줄을 붙여도 받는 쪽이 저장하지 않으면 쿠키는 쓰이지 않습니다.');
    }
    return { events: ev, summary: sum, row: [saved ? 'visitor=kim' : '없음', cookie2 ? 'Cookie: visitor=kim' : '없음', resp2] };
  },
  render: function (v, sim, t, H, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : null;
    if (!s) { H.text(v, '실행을 누르면 브라우저가 첫 요청을 보내는 것부터 시작합니다.'); return; }
    H.table(v, ['오간 글', '쿠키에 관한 줄', '본문'], s.rows.map(function (r, i) { return { cls: '', cells: [r[0], { v: r[1], cls: r[1].indexOf('visitor=kim') >= 0 ? 'good' : '' }, r[2]] }; }), '오간 글');
    H.table(v, ['항목', '값'], [
      { cls: s.r1 ? '' : 'gone', cells: ['첫 응답 뒤 클라이언트에 저장된 쿠키', s.r1 ? { v: s.r1, cls: s.r1 === 'visitor=kim' ? 'good' : '' } : '아직'] },
      { cls: s.r2 ? '' : 'gone', cells: ['둘째 요청에 실린 Cookie 헤더', s.r2 ? { v: s.r2, cls: s.r2 === '없음' ? 'bad' : 'good' } : '아직'] },
      { cls: s.r3 ? '' : 'gone', cells: ['둘째 응답', s.r3 ? { v: s.r3, cls: s.r3.indexOf('또') === 0 ? 'good' : 'bad' } : '아직'] },
    ], '결과');
  },
  // 그림: 왼쪽에 브라우저(안에 저장된 쿠키 칸과 둘째 요청에 붙인 Cookie 칸), 오른쪽에 서버(안에 서버가 읽은 Cookie 칸), 둘 사이에 첫 요청, 첫 응답, 둘째 요청, 둘째 응답을 차례로 화살표로 그린다. 쿠키가 실려 가는 화살표는 hot, 아래에 둘째 응답 칸.
  draw: function (P, sim, shown) {
    var c = sim.c, last = shown[shown.length - 1], s = last ? last.snap : null, m = s ? s.m : 0, nojar = c.client === 'nojar';
    var cookie2 = c.set && c.client === 'keep', jar = s ? s.jar : '없음';
    P.size(680, 298);
    P.region('bw', 14, 16, 196, 212, nojar ? '쿠키 저장 안 하는 프로그램' : '브라우저');
    P.box('jar', 24, 56, 176, 66, { cls: jar === 'visitor=kim' ? 'good' : nojar ? 'ghost' : 'plain', title: '저장된 쿠키', sub: nojar ? ['저장하는 곳이 없음'] : [jar], mono: jar === 'visitor=kim' });
    P.box('att', 24, 142, 176, 66, { cls: s && s.att ? (cookie2 ? 'hot' : 'plain') : 'ghost', title: '둘째 요청의 Cookie', sub: [s && s.att ? s.att : '아직'], mono: !!(s && s.att === 'Cookie: visitor=kim') });
    P.region('sw', 470, 16, 196, 212, '서버');
    P.box('sv1', 480, 56, 176, 66, { cls: 'plain', title: '서버 코드', sub: ['Cookie의 visitor가', '있으면 또 오셨군요,', '없으면 처음 오셨군요'] });
    P.box('sv2', 480, 142, 176, 66, { cls: !s || !s.read ? 'ghost' : s.read === '없음' ? 'plain' : 'good', title: '서버가 읽은 Cookie', sub: [s && s.read ? s.read : '아직'], mono: !!(s && s.read === 'visitor=kim') });
    if (m >= 1) P.arrow('a1', [210, 58], [470, 58], { label: 'GET /  (Cookie 없음)' });
    if (m >= 2) P.arrow('a2', [470, 104], [210, 104], { cls: c.set ? 'hot' : '', label: c.set ? 'Set-Cookie: visitor=kim' : '응답 (Set-Cookie 없음)' });
    if (m >= 3) P.arrow('a3', [210, 150], [470, 150], { cls: cookie2 ? 'hot' : '', label: cookie2 ? 'GET /  Cookie: visitor=kim' : 'GET /  (Cookie 없음)' });
    if (m >= 4) P.arrow('a4', [470, 196], [210, 196], { label: '응답: ' + s.r3 });
    P.box('n1', 14, 246, 652, 36, { cls: s && s.r3 ? (cookie2 ? 'good' : 'bad') : 'ghost', title: '둘째 응답', right: s && s.r3 ? s.r3 : '아직' });
  },
  assume: '서버는 Node.js 24.18.0의 net 모듈로 127.0.0.1의 빈 포트에 띄운 것 하나로, 요청의 헤더를 빈 줄까지 읽고 Cookie 헤더에 visitor 값이 있으면 "또 오셨군요, 값"을, 없으면 "처음 오셨군요"를 돌려줍니다. Set-Cookie: visitor=kim 줄은 설정이 켜져 있고 Cookie 헤더가 없던 요청의 응답에만 붙고, 보낸 뒤 연결을 닫습니다. 서버가 보낸 첫 응답은 코드 칸의 글과 줄 하나하나까지 같습니다(http 모듈로 만들면 Date 같은 헤더가 더 붙어 글이 달라져서 net으로 글자를 그대로 보냈고, Content-Length를 쓰지 않아 응답의 끝은 연결을 닫는 것으로 알립니다). 이 서버에는 방문자를 적어 두는 곳이 없어서, 쿠키 없는 새 클라이언트가 그 뒤에 요청하면 앞의 방문자를 알아보지 못했습니다. 클라이언트는 쿠키 규칙(RFC 6265)을 구현한 이 PC의 curl 8.21.0입니다. 쿠키를 저장하는 쪽은 curl -b와 -c에 같은 jar 파일을 주어(쿠키 엔진을 켜고 파일에 저장) 첫 응답 뒤 jar 파일을 읽어 저장된 쿠키를 얻었고, 사용자가 쿠키를 지우는 일은 둘째 요청에 새 빈 jar 파일을 주는 것으로 재현했습니다. 쿠키를 저장하지 않는 쪽은 쿠키 옵션이 없는 curl이고, 이 curl은 첫 응답의 Set-Cookie 줄을 받았는데도 둘째 요청에 Cookie 헤더를 붙이지 않았습니다. 여섯 가지 조합을 모두 실행해 저장된 쿠키, 서버가 둘째 요청에서 실제로 받은 Cookie 헤더, 둘째 응답을 대조했고, 두 요청의 헤더 전체와 두 응답의 원문, curl에 준 인자(Cookie 헤더를 직접 적는 인자가 없음)도 확인했습니다. 브라우저 대신 curl의 쿠키 엔진으로 대조했습니다. 브라우저도 같은 표준(RFC 6265)을 따르지만, 이 실습의 결과를 실제 브라우저에서 실행해 확인하지는 않았습니다. 문서로 확인한 것은 RFC 6265의 1절(서버가 Set-Cookie로 쿠키를 보내고 클라이언트가 이후 요청에 Cookie로 돌려보낼지 정한다), 3절과 3.1절(Set-Cookie: SID=31d4d96e407aad42를 받은 뒤 다음 요청에 Cookie: SID=31d4d96e407aad42가 실리는 예), 4.1절(Set-Cookie는 서버가 쿠키를 클라이언트에 보내는 응답 헤더), 4.2절(Cookie는 클라이언트가 저장한 쿠키를 서버에 돌려보내는 요청 헤더)이고, HTTP가 요청 하나하나를 따로 이해할 수 있는 무상태 프로토콜이라는 것은 RFC 9110의 3.3절을 따랐습니다. 화면의 localhost:8080은 예시 주소이고 실제 대조는 이 PC의 다른 포트에서 했습니다. 쿠키의 만료, 경로, 도메인, Secure, HttpOnly, SameSite 같은 속성은 다루지 않았고, 세부 동작은 "세부 동작 실습: 쿠키"에서 다룹니다. 이 서버 코드는 화면에 보이지 않습니다.',
});

Lab.register({
  id: 'session_basic', nav: '세션', cat: '기초개념', mode: 'step', basic: true, deep: ['auth'],
  title: '세션은 무엇이고, 로그인한 상태는 어디에 기억되는가',
  intro: '세션은 서버 안의 저장소에 적어 두는 기억입니다. 코드 칸의 session은 HttpSession이라는 타입의 인자이고, 서버의 세션 저장소에서 이 요청에 딸린 칸 하나를 가리킵니다. login 메서드의 session.setAttribute("user", "kim") 줄은 그 칸에 "이 세션의 사용자는 kim"이라고 적는 줄이고, me 메서드의 session.getAttribute("user") 줄은 칸에서 그 값을 읽는 줄입니다. 칸마다 서버가 붙인 번호(세션 id)가 있고, 서버는 이 번호만 JSESSIONID라는 이름의 쿠키로 브라우저에 줍니다. 브라우저는 다음 요청마다 그 쿠키를 보내고, 서버는 번호로 저장소의 칸을 찾아 누구인지 압니다. 이 실습은 로그인한 뒤에 /me를 요청하는 방법을 바꿔 가며(쿠키 없이, 다른 사람이, 서버가 칸을 지운 뒤에), 서버가 누구인지 알아보는지를 봅니다. 코드 칸에는 로그인에 성공했을 때 실행되는 부분만 있고, 아이디와 비밀번호를 확인하는 과정은 이 실습에서 다루지 않아 줄였습니다. 쿠키가 무엇인지는 앞의 "쿠키" 실습에서 다룹니다.',
  terms: ['세션', '세션 id(JSESSIONID)', 'HttpSession', '쿠키'],
  controls: [
    { id: 'save', label: 'login에서 session.setAttribute("user", "kim") 줄을 실행한다', type: 'check', value: true },
    { id: 'second', label: '/me를 요청하는 방법', type: 'select', value: 'same', options: [['same', '같은 브라우저가 받은 JSESSIONID 쿠키와 함께 /me를 요청한다'], ['nocookie', 'JSESSIONID 쿠키 없이 /me를 요청한다'], ['stolen', '다른 사람이 같은 JSESSIONID 값을 들고 /me를 요청한다'], ['gone', '서버가 그 세션을 지운 뒤(로그아웃) 같은 쿠키로 /me를 요청한다']] },
  ],
  // q는 물음 방식의 화면에 보이는 물음, t와 d는 글로만 읽는 본문에 쓰이는 이름과 설명
  presets: [
    { t: '처음 설정으로', q: '세션은 어떻게 쓰이고, 로그인한 뒤 다시 요청하면 서버는 어떻게 알아보나', d: '서버의 세션 저장소에 user=kim을 적고 번호만 쿠키로 줍니다. 다음 요청에 실린 번호로 칸을 찾아 kim임을 알아봅니다.', v: { save: true, second: 'same' } },
    { t: '쿠키 없이 요청하면', q: 'JSESSIONID 쿠키 없이 요청하면', d: '번호가 없어 서버는 어느 칸인지 모르고, 누구인지도 모릅니다.', v: { save: true, second: 'nocookie' } },
    { t: '다른 사람이 같은 값으로', q: '다른 사람이 같은 JSESSIONID 값을 들고 요청하면', d: '서버는 번호만 보고 칸을 찾으므로 그 사람을 kim으로 봅니다.', v: { save: true, second: 'stolen' } },
    { t: '서버가 세션을 지운 뒤에', q: '서버가 세션을 지운 뒤에 같은 쿠키로 요청하면', d: '번호는 그대로이지만 가리킬 칸이 없어 서버는 누구인지 모릅니다.', v: { save: true, second: 'gone' } },
    { t: 'setAttribute를 지우면', q: 'login에서 session.setAttribute를 지우면', d: '세션 칸과 쿠키는 만들어지지만 칸이 비어 있어 서버는 누구인지 모릅니다.', v: { save: false, second: 'same' } },
  ],
  code: function (c) {
    var out = ['// 컨트롤러 클래스 본문만 보임 (@RestController 클래스 선언과 import는 생략)', '@PostMapping("/login")', 'public String login(HttpSession session) {'];
    if (c.save) out.push('    // 서버의 세션 저장소에 "이 세션의 사용자는 kim"이라고 적어 둔다', '    session.setAttribute("user", "kim");');
    out.push('    return "로그인됨";', '}', '', '@GetMapping("/me")', 'public String me(HttpSession session) {', '    // 요청에 실려 온 세션 번호로 저장소의 칸을 찾아 읽는다', '    Object user = session.getAttribute("user");', '    return user == null ? "누구인지 모름" : "안녕하세요, " + user;', '}');
    return out.join('\n');
  },
  label: function (c) { return (c.save ? 'setAttribute 실행' : 'setAttribute 없음') + ' · ' + { same: '같은 브라우저, 쿠키와 함께', nocookie: '쿠키 없이', stolen: '다른 사람이 같은 값으로', gone: '서버가 지운 뒤 같은 쿠키로' }[c.second]; },
  columns: ['login 뒤 서버의 세션 저장소', '브라우저가 받은 쿠키', '/me 요청의 응답'],
  simulate: function (c) {
    var ev = [], sum = [], ID = '3A9F…', ID2 = 'B71E…', CK = 'JSESSIONID=' + ID, CK2 = 'JSESSIONID=' + ID2, sec = c.second;
    // 칸: id, user(적힌 값), gone(서버가 지움). 지난 상태: who(요청을 보낸 상자), show(hdr: 요청에 실은 Cookie / jar: 저장해 둔 쿠키), hot(강조할 칸), tgt(요청 화살표가 가리키는 칸), rq(요청 화살표 색)
    var st = { slots: [], cA: '', cB: '', who: 'a', show: 'hdr', sent: '', sentCk: '', ph: '', hot: -1, tgt: -1, rq: '', rcls: '', resp: null, reqs: [] };
    var kim = c.save, bodyKim = '안녕하세요, kim', bodyNo = '누구인지 모름';
    function push(s, k) { ev.push({ s: s, k: k, snap: JSON.parse(JSON.stringify(st)) }); }
    // 1: 로그인 요청
    st.sent = 'POST /login'; st.sentCk = ''; st.ph = 'login'; st.who = 'a'; st.show = 'hdr';
    push('로그인 화면에서 로그인 버튼을 누르면, 브라우저가 서버에 POST /login 요청을 보냅니다. 이 요청에는 Cookie 헤더가 없습니다. 서버의 세션 저장소는 비어 있습니다. 아이디와 비밀번호를 확인하는 과정은 이 실습에서 다루지 않아 줄였습니다.', '');
    // 2: 서버가 세션을 만든다
    st.slots.push({ id: ID, user: '', gone: false }); st.ph = 'made'; st.hot = 0;
    push('스프링이 login 메서드를 부르려면 session 인자를 채워야 하는데, 이 요청에는 세션 번호가 실려 오지 않았으므로 요청에 딸린 세션이 아직 없습니다. 그래서 서버(톰캣)가 세션을 새로 만들고 무작위 번호를 붙입니다(톰캣이 붙인 번호는 영문 대문자와 숫자 32글자였고, 여기서는 앞부분만 적어 ' + ID + '로 줄여 씁니다). 저장소에 칸 하나가 생기는데 칸은 비어 있습니다. 우리가 쓴 코드에는 세션을 만드는 줄도, 번호를 붙이는 줄도 없습니다.', '');
    // 3: setAttribute
    if (kim) {
      st.slots[0].user = 'kim'; st.ph = 'write';
      push('login 메서드가 session.setAttribute("user", "kim") 줄을 실행합니다. 방금 만든 칸에 user=kim이 적힙니다. 로그인했다는 정보가 적힌 곳은 브라우저가 아니라 서버 안의 세션 저장소입니다.', 'good');
    } else {
      st.ph = 'write';
      push('login 메서드에는 session.setAttribute 줄이 없어서 칸에는 아무것도 적히지 않습니다. 칸은 비어 있는 채로 남습니다. 세션 칸은 session 인자를 받은 것만으로 이미 만들어졌고, 그 칸에 무엇을 적을지는 별개의 일입니다.', 'bad');
    }
    // 4: 응답 + Set-Cookie
    st.ph = 'setck'; st.rcls = 'good';
    st.reqs.push(['POST /login', '없음', '로그인됨']);
    push('login 메서드가 "로그인됨"을 돌려주고, 응답에 Set-Cookie: ' + CK + ' 줄이 붙습니다. 이 줄을 붙이는 코드를 우리가 쓰지 않았습니다. 톰캣이 붙입니다. 쿠키 값은 번호뿐이고 kim이라는 글자는 들어 있지 않습니다.' + (kim ? '' : ' 쿠키는 세션이 새로 만들어졌을 때 붙는 것이어서, setAttribute 줄이 없어도 붙었습니다.'), kim ? 'good' : '');
    // 5: 브라우저가 저장
    st.cA = CK; st.show = 'jar'; st.ph = 'saved'; st.hot = -1; st.rcls = '';
    push('브라우저가 응답을 받고, 쿠키 ' + CK + '를 저장합니다. 브라우저가 들고 있는 것은 번호뿐이고,' + (kim ? ' user=kim은 서버의 저장소에만 있습니다.' : ' 서버의 칸은 비어 있습니다.'), '');
    // 6~: 두 번째 요청
    st.sent = 'GET /me';
    var kimResp = kim && (sec === 'same' || sec === 'stolen'), respBody = kimResp ? bodyKim : bodyNo;
    if (sec === 'same') {
      st.who = 'a'; st.show = 'hdr'; st.sentCk = CK; st.ph = 'req'; st.tgt = 0; st.rq = '';
      push('브라우저가 서버에 GET /me 요청을 보냅니다. 저장해 둔 쿠키가 있어서 브라우저가 Cookie: ' + CK + ' 헤더를 요청에 붙입니다. 이 헤더를 붙이는 코드를 우리가 쓰지 않았습니다. 브라우저가 합니다.', '');
      st.ph = 'look'; st.hot = 0; st.rq = 'hot';
      push('서버가 요청의 Cookie 헤더에서 번호 ' + ID + '를 읽고, 세션 저장소에서 같은 번호의 칸을 찾습니다. 칸이 있으므로 새로 만들지 않고, 그 칸을 me 메서드의 session 인자로 넣어 줍니다.', 'good');
      st.ph = 'read';
      push(kim ? 'me 메서드가 session.getAttribute("user") 줄로 칸을 읽습니다. 칸에 user=kim이 적혀 있으므로 "안녕하세요, kim"을 돌려줍니다. 서버가 kim을 아는 것은 쿠키에 kim이 들어 있어서가 아니라, 번호로 찾은 칸에 kim이 적혀 있기 때문입니다.' : 'me 메서드가 session.getAttribute("user") 줄로 칸을 읽습니다. 번호로 칸은 찾았지만 칸이 비어 있어서 user 값이 null이고, "누구인지 모름"을 돌려줍니다.', kim ? 'good' : 'bad');
    } else if (sec === 'nocookie') {
      st.who = 'a'; st.show = 'hdr'; st.sentCk = ''; st.ph = 'req'; st.tgt = -1; st.rq = '';
      push('GET /me 요청이 서버에 옵니다. 이번 요청에는 JSESSIONID 쿠키가 실려 있지 않습니다(쿠키를 보내지 않는 쪽이 보냈거나, 브라우저에서 쿠키를 지운 뒤의 요청입니다). Cookie 헤더가 없습니다.', 'bad');
      st.ph = 'look';
      push('서버가 요청에서 찾을 번호가 없습니다. 저장소에 번호 ' + ID + ' 칸이 있어도, 이 요청이 어느 칸의 주인인지 알 방법이 없습니다.', 'bad');
      st.slots.push({ id: ID2, user: '', gone: false }); st.ph = 'made2'; st.hot = 1;
      push('me 메서드의 session 인자를 채우려고 서버(톰캣)가 세션을 새로 만들고 새 번호 ' + ID2 + '를 붙입니다. 새 칸은 비어 있고, 번호 ' + ID + ' 칸과는 별개입니다.' + (kim ? ' 그 칸의 user=kim은 서버에 그대로 남아 있습니다.' : ''), '');
      st.ph = 'read';
      push('me 메서드가 session.getAttribute("user") 줄로 새 칸을 읽습니다. 비어 있어서 user 값이 null이고, "누구인지 모름"을 돌려줍니다.', 'bad');
    } else if (sec === 'stolen') {
      st.who = 'b'; st.show = 'hdr'; st.sentCk = CK; st.cB = CK; st.ph = 'req'; st.tgt = 0; st.rq = '';
      push('다른 사람이 서버에 GET /me 요청을 보냅니다. 이 사람은 로그인한 적이 없지만 ' + ID + ' 번호를 알고 있어서, Cookie: ' + CK + ' 헤더를 직접 적어 보냅니다. 로그인한 브라우저 A와는 별개의 연결로 오는 요청입니다. 이 번호를 어떻게 알아냈는지는 이 실습에서 다루지 않습니다.', 'bad');
      st.ph = 'look'; st.hot = 0; st.rq = 'hot';
      push('서버가 요청의 Cookie 헤더에서 번호 ' + ID + '를 읽고, 세션 저장소에서 같은 번호의 칸을 찾아 me 메서드에 넣어 줍니다. 서버는 번호가 같은지만 보고 찾았을 뿐이고, 이 요청이 로그인한 브라우저에서 왔는지 따져 보지 않았습니다. 새 칸도 만들어지지 않았습니다.', 'bad');
      st.ph = 'read';
      push(kim ? 'me 메서드가 session.getAttribute("user") 줄로 칸을 읽습니다. 칸에 user=kim이 적혀 있으므로, 서버는 이 사람을 kim으로 보고 "안녕하세요, kim"을 돌려줍니다.' : 'me 메서드가 session.getAttribute("user") 줄로 칸을 읽습니다. 번호로 칸은 찾았지만 칸이 비어 있어서 user 값이 null이고, "누구인지 모름"을 돌려줍니다. 훔쳐 온 번호가 가리키는 칸에 적힌 것이 없으니 알아볼 것도 없습니다.', kim ? 'bad' : '');
    } else {
      st.who = 'a'; st.show = 'hdr'; st.sent = 'POST /logout'; st.sentCk = CK; st.ph = 'logout'; st.tgt = -1; st.rq = '';
      st.slots[0].gone = true; st.slots[0].user = ''; st.hot = -1; st.reqs.push(['POST /logout', CK, '로그아웃됨']);
      push('사용자가 로그아웃을 하면, 브라우저가 Cookie: ' + CK + ' 헤더와 함께 서버에 POST /logout 요청을 보내고, 서버의 logout 메서드가 session.invalidate()를 실행해 번호 ' + ID + ' 칸을 지웁니다. 이 메서드는 화면의 코드에 보이지 않습니다. 이 응답에는 쿠키를 지우라는 Set-Cookie 줄이 붙지 않아서, 브라우저는 번호를 그대로 들고 있습니다.', 'bad');
      st.sent = 'GET /me'; st.ph = 'req'; st.tgt = 0;
      push('브라우저가 서버에 GET /me 요청을 보냅니다. 저장해 둔 쿠키가 그대로 있어서, 브라우저가 Cookie: ' + CK + ' 헤더를 요청에 붙입니다.', '');
      st.ph = 'look'; st.rq = 'bad';
      push('서버가 요청의 Cookie 헤더에서 번호 ' + ID + '를 읽고 세션 저장소에서 같은 번호의 칸을 찾습니다. 그 칸은 이미 지워져 있어서 찾을 수 없습니다. 번호는 있어도, 가리킬 칸이 없습니다.', 'bad');
      st.slots.push({ id: ID2, user: '', gone: false }); st.ph = 'made2'; st.hot = 1; st.rq = '';
      push('me 메서드의 session 인자를 채우려고 서버(톰캣)가 세션을 새로 만들고 새 번호 ' + ID2 + '를 붙입니다. 새 칸은 비어 있습니다.', '');
      st.ph = 'read';
      push('me 메서드가 session.getAttribute("user") 줄로 새 칸을 읽습니다. 비어 있어서 user 값이 null이고, "누구인지 모름"을 돌려줍니다.', 'bad');
    }
    // 마지막: 응답
    var newCookie = sec === 'nocookie' || sec === 'gone';
    st.ph = 'done'; st.resp = respBody; st.rcls = kimResp ? (sec === 'stolen' ? 'bad' : 'good') : 'bad'; st.tgt = -1; st.rq = '';
    st.reqs.push([(sec === 'stolen' ? '(다른 사람) ' : '') + 'GET /me', st.sentCk || '없음', respBody]);
    if (sec === 'stolen') { st.who = 'b'; }
    push((sec === 'stolen' ? '다른 사람이' : '브라우저가') + ' 200 응답을 받습니다. 본문은 "' + respBody + '"입니다.' + (newCookie ? ' 이 응답에는 새 번호의 Set-Cookie: ' + CK2 + ' 줄이 붙습니다.' : ' 이 응답에는 Set-Cookie 줄이 붙지 않습니다. 이미 있는 칸을 찾았기 때문입니다.'), kimResp ? (sec === 'stolen' ? 'bad' : 'good') : 'bad');
    // 요약
    if (kim && sec === 'same') {
      sum.push('세션은 서버의 저장소에 적어 두는 로그인 정보이고, 브라우저가 들고 다니는 것은 그 칸을 가리키는 번호(JSESSIONID 쿠키)뿐입니다. 로그인한 뒤 다시 요청하면 번호가 쿠키로 실려 오고, 서버가 번호로 칸을 찾아 kim임을 알아봅니다.');
      sum.push('user=kim은 서버에 있고 쿠키에는 번호만 있습니다. 쿠키를 붙여 주고 보내는 일은 톰캣과 브라우저가 했고, 우리가 쓴 코드는 칸에 적고 읽는 두 줄뿐입니다.');
    } else if (kim && sec === 'nocookie') {
      sum.push('번호 없이 요청하면 서버는 어느 칸인지 알 수 없어서 누구인지 모릅니다. 서버에는 user=kim이 적힌 칸이 그대로 있지만, 이 요청에는 그 칸을 가리킬 번호가 없습니다.');
      sum.push('서버는 번호 없는 요청에 빈 세션을 새로 만들어 주었습니다. 로그인 정보가 쿠키가 아니라 서버의 칸에 있으니, 쿠키가 없으면 로그인한 상태가 요청에 닿지 않습니다.');
    } else if (kim && sec === 'stolen') {
      sum.push('다른 사람이 같은 번호를 들고 오면 서버는 그 사람을 kim으로 봅니다. 서버는 번호로 칸을 찾을 뿐, 번호를 들고 온 사람이 누구인지는 따지지 않았습니다.');
      sum.push('그래서 세션 번호는 신분증과 같아서 남에게 새면 안 됩니다. 번호가 어떻게 새는지와 막는 방법은 이 실습에서 다루지 않고, 세부 동작 실습에서 다룹니다.');
    } else if (kim && sec === 'gone') {
      sum.push('서버가 칸을 지우면 브라우저가 번호를 그대로 들고 와도 서버는 누구인지 모릅니다. 번호가 가리킬 칸이 없기 때문입니다.');
      sum.push('로그인했다는 사실이 서버의 칸에 있으므로, 서버가 칸을 지우면(로그아웃) 쿠키가 브라우저에 남아 있어도 로그인한 상태가 끝납니다. 서버는 번호를 못 찾은 요청에 빈 세션을 새로 만들어 주었습니다.');
    } else if (sec === 'same') {
      sum.push('세션 칸과 JSESSIONID 쿠키는 만들어졌고 쿠키도 다음 요청에 실려 왔지만, 칸이 비어 있어서 서버는 누구인지 모릅니다. 칸에 user를 적는 setAttribute 줄이 있어야 로그인한 사람으로 알아봅니다.');
      sum.push('세션이 있다는 것과 로그인했다는 것은 다릅니다. session 인자를 받으면 세션 칸은 만들어지고, 로그인했다는 정보는 그 칸에 직접 적어야 생깁니다.');
    } else if (sec === 'nocookie') {
      sum.push('setAttribute 줄이 없으면 어느 쪽으로 요청해도 칸에는 적힌 것이 없습니다. 이번에는 번호도 없어서 서버가 빈 세션을 새로 만들었고, 누구인지 모릅니다.');
      sum.push('쿠키가 있든 없든, 로그인했다는 정보를 칸에 적지 않았다면 서버가 알아볼 것이 없습니다.');
    } else if (sec === 'stolen') {
      sum.push('setAttribute 줄이 없어서 칸이 비어 있으므로, 같은 번호를 들고 와도 서버는 누구인지 모릅니다. 번호를 훔쳐도 그 칸에 로그인 정보가 없으면 얻을 것이 없습니다.');
      sum.push('번호가 쓸모 있는 것은 그 칸에 적힌 로그인 정보 때문입니다. 서버는 이 경우에도 번호가 같은지만 보고 칸을 찾았습니다.');
    } else {
      sum.push('setAttribute 줄이 없었고 서버가 그 칸까지 지웠으므로, 같은 쿠키로 요청해도 서버는 누구인지 모릅니다. 서버는 번호를 못 찾은 요청에 빈 세션을 새로 만들어 주었습니다.');
      sum.push('칸이 비어 있었으니 지우기 전에도 서버는 누구인지 몰랐을 것입니다. 로그인 정보를 칸에 적어야 세션이 로그인 상태를 기억합니다.');
    }
    return { events: ev, summary: sum, row: [kim ? '세션 1개: user=kim' : '세션 1개: 비어 있음', 'JSESSIONID=(무작위 글자 32자)', respBody] };
  },
  render: function (v, sim, t, H, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : null;
    if (!s) { H.text(v, '실행을 누르면 브라우저가 로그인 요청을 보내는 것부터 시작합니다.'); return; }
    H.table(v, ['번호', '적힌 내용'], s.slots.length ? s.slots.map(function (k) { return { cls: k.gone ? 'gone' : '', cells: [k.id, k.gone ? '지워짐' : k.user ? { v: 'user=' + k.user, cls: 'good' } : '비어 있음'] }; }) : [{ cls: 'gone', cells: ['비어 있음', ''] }], '서버의 세션 저장소');
    H.table(v, ['요청', '요청에 실린 쿠키', '응답'], s.reqs.map(function (r) { return { cls: '', cells: [r[0], r[1] === '없음' ? { v: r[1], cls: 'bad' } : r[1], { v: r[2], cls: r[2] === '안녕하세요, kim' ? 'good' : r[2] === '누구인지 모름' ? 'bad' : '' }] }; }), '오간 요청');
    H.table(v, ['항목', '값'], [
      { cls: '', cells: ['브라우저 A가 저장한 쿠키', s.cA ? { v: s.cA, cls: 'good' } : '아직'] },
      { cls: s.resp ? '' : 'gone', cells: ['/me 요청의 응답', s.resp ? { v: s.resp, cls: s.resp === '안녕하세요, kim' ? 'good' : 'bad' } : '아직'] },
    ], '결과');
  },
  // 그림: 왼쪽에 브라우저(들고 있는 쿠키는 번호뿐, 다른 사람 상자는 훔친 값일 때만), 오른쪽에 서버 안의 세션 저장소(번호가 붙은 칸). 요청에 실린 번호에서 저장소의 칸으로 가는 화살표가 핵심이다(번호가 없으면 화살표가 없고, 칸이 지워졌으면 갈 곳이 없어 빨강). 맨 아래에 /me 응답 칸.
  draw: function (P, sim, shown) {
    var c = sim.c, last = shown[shown.length - 1], s = last ? last.snap : null;
    P.size(680, 340);
    var stolen = c.second === 'stolen', ph = s ? s.ph : '';
    P.region('bw', 14, 16, 212, 256, '브라우저');
    function bsub(who) {
      var mine = s && s.who === who && s.sent;
      if (!s) return ['대기', '저장한 쿠키:', '없음'];
      if (who === 'b') return mine ? [s.sent, 'Cookie 헤더:', s.sentCk || '없음'] : ['대기', '들고 있는 값:', '없음'];
      if (mine && s.show === 'hdr') return [s.sent, 'Cookie 헤더:', s.sentCk || '없음'];
      return [mine ? s.sent : '대기', '저장한 쿠키:', s.cA || '없음'];
    }
    var aOn = s && s.who === 'a' && (ph === 'login' || ph === 'req' || ph === 'look' || ph === 'logout');
    P.box('ba', 24, 44, 192, 88, { cls: aOn ? 'wait' : 'plain', title: '브라우저 A', sub: bsub('a') });
    if (stolen) P.box('bb', 24, 158, 192, 88, { cls: s && s.who === 'b' && s.sent ? 'bad' : 'ghost', title: '다른 사람', sub: bsub('b') });
    P.region('sw', 330, 16, 336, 256, '서버(톰캣)');
    P.region('stg', 340, 40, 316, 222, '세션 저장소');
    var slots = s ? s.slots : [];
    for (var i = 0; i < 2; i++) {
      var k = slots[i], y = 68 + i * 98;
      if (!k) { if (i === 0) P.box('s0', 352, y, 292, 76, { cls: 'ghost', title: '칸 없음', sub: [' ', ' '] }); continue; }
      var hot = s.hot === i;
      P.box('s' + i, 352, y, 292, 76, { cls: k.gone ? 'ghost' : hot ? 'hot now' : k.user ? 'good' : 'plain', title: '번호 ' + k.id, sub: k.gone ? ['지워진 칸', ' '] : [k.user ? 'user=' + k.user : '비어 있음', ' '] });
    }
    var from = s && s.who === 'b' ? 'bb' : 'ba';
    if (s && (ph === 'req' || ph === 'look' || ph === 'read') && s.tgt >= 0 && s.sentCk) P.arrow('rq', from + ':r:0.4', 's' + s.tgt + ':l:0.4', { cls: s.rq });
    if (s && (ph === 'setck' || ph === 'done')) {
      var hs = ph === 'setck' ? 0 : Math.max(0, s.hot);
      P.arrow('rs', 's' + hs + ':l:0.75', from + ':r:0.75', { cls: s.rcls });
    }
    P.box('res', 14, 288, 652, 36, { cls: s && s.resp ? (s.rcls === 'bad' ? 'bad' : 'good') : 'ghost', title: '/me 요청의 응답', right: s && s.resp ? s.resp : '아직' });
  },
  assume: '스프링 부트 4.1.1(스프링 프레임워크 7.0.9, 내장 톰캣 11.0.24)을 JDK 21에서 실행한 결과입니다. 여덟 가지 조합을 모두, 화면의 코드와 같은 소스(화면에 없는 logout 메서드 하나만 더함)를 패키지 app으로 컴파일하고 시작 클래스(@SpringBootConfiguration, @EnableAutoConfiguration, @ComponentScan)와 함께 자바 프로세스를 새로 띄워 확인했습니다. 컨트롤러를 손으로 등록하지 않고 스프링이 클래스를 훑어 찾게 했으며, 요청은 서버가 뜬 뒤 실제 HTTP로 보냈습니다. 클래스패스에는 스프링 시큐리티, JPA, H2를 넣지 않았습니다(시큐리티가 있으면 요청이 막히고 세션 처리가 달라질 수 있기 때문입니다). 화면의 코드는 package와 import 줄, 클래스 선언, 로그아웃 메서드를 줄였습니다. 로그아웃 메서드는 session.invalidate()를 실행하고 "로그아웃됨"을 돌려주는 메서드이고, 아이디와 비밀번호를 확인하는 과정도 이 실습에서 다루지 않아 줄였습니다. 대조한 것은 login 직후 서버의 세션 저장소(톰캣 세션 관리자의 세션 수와 칸마다 적힌 내용), login 응답의 Set-Cookie, /me 응답입니다. 같은 브라우저는 받은 Set-Cookie의 값을 다음 요청의 Cookie 헤더에 직접 적는 클라이언트 하나이고(쿠키 보관 기능을 쓰지 않았고 실제 브라우저에서는 실행하지 않았습니다), 다른 사람은 별개의 연결(별개의 클라이언트)이 같은 값을 Cookie 헤더에 적어 보내는 것이며, 서버가 세션을 지우는 일은 같은 쿠키로 POST /logout을 먼저 보내는 것으로 재현했습니다. 화면의 번호(3A9F…, B71E…)는 설명을 위해 지어 낸 예시이고, 실제로는 실행할 때마다 다른 영문 대문자와 숫자 32글자였습니다. 문서가 정한 것은 Jakarta Servlet 6.1 명세 7장(7.1.1절: 세션 추적 쿠키의 표준 이름은 JSESSIONID, 7.2절: 세션은 클라이언트가 추적 정보를 서버에 돌려보내 합류하기 전까지 새 세션이고 id는 getId()로 읽는다, 7.5절: 무효화가 시작되면 새 요청은 그 세션을 볼 수 없다)와 HttpSession의 API 문서(세션은 한 사용자를 여러 요청에 걸쳐 식별하고 정보를 저장하는 방법이고, getId의 식별자는 서블릿 컨테이너가 정하며 구현에 따라 다르다)입니다. 다음은 문서가 정한 것이 아니라 이 버전에서 관찰한 동작입니다. 번호가 영문 대문자와 숫자 32글자이고 쿠키 값에 kim이 들어 있지 않다는 것, 쿠키에 Path=/와 HttpOnly 속성이 붙는다는 것, session 인자를 받는 메서드는 setAttribute를 부르지 않아도 세션을 만들고(스프링이 그 인자를 채우려고 요청의 getSession()을 부릅니다. 이 호출은 스프링의 해당 클래스 바이트코드로 확인했습니다) 쿠키가 나간다는 것, 쿠키 없이 /me를 요청하면 서버가 빈 세션을 새로 만들고 새 번호를 준다는 것, 같은 번호를 별개의 연결에서 보내도 서버가 같은 세션으로 다루고 새로 만들지 않는다는 것(두 요청의 연결 포트는 달랐습니다), 서버가 지운 세션의 번호로 요청하면 서버가 새 세션을 만들어 새 번호를 준다는 것, 로그아웃 응답에는 쿠키를 지우라는 Set-Cookie 줄이 없다는 것입니다. 세션 번호를 훔쳐 가는 공격과 방어(세션 고정, HttpOnly 설정 등)는 이 실습에서 다루지 않았고, 공부 쪽 실습("세션과 JWT", "세션 하이재킹과 세션 고정")으로 넘깁니다. 세션의 유효 시간, 여러 서버에서 세션을 나누는 방법, 쿠키를 쓰지 않는 방법(URL에 번호를 싣는 방식 등)도 다루지 않았습니다.',
});

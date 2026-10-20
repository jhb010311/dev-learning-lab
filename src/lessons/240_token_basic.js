Lab.register({
  id: 'token_basic', nav: '토큰', cat: '기초개념', mode: 'step', basic: true, deep: ['jwt'],
  title: '토큰은 무엇이고, 서버는 무엇을 보고 믿는가',
  why: '세션 방식에서는 로그인 기록이 그 기록을 가진 서버에만 있어서, 서버를 여러 대로 늘리면 어느 서버로 요청이 가도 같은 기록을 찾게 하는 준비가 따로 든다. 토큰은 "누구인지"와 그것을 보증하는 서명을 요청마다 함께 보내므로, 서명을 확인할 열쇠를 가진 서버라면 어디서든 다른 곳에 묻지 않고 그 자리에서 확인한다.',
  use: '모바일 앱이나 브라우저의 자바스크립트 화면이 스프링 서버의 API를 부를 때 로그인 확인용으로 흔히 쓴다. 여러 서비스로 나뉜 시스템에서 한 번 받은 토큰을 여러 서버가 함께 믿게 할 때도 쓴다. 한 번 내준 토큰은 서버가 도중에 무르기 어려워서, 유효 시간을 짧게 잡고 새 토큰을 다시 받는 방식을 함께 쓴다.',
  intro: '로그인에 성공하면 서버가 "이 사람은 kim이다"라는 내용을 글자로 적고, 서버만 아는 비밀 열쇠로 계산한 서명을 뒤에 붙여 클라이언트에 줍니다. 이 글을 토큰이라고 하고, 가장 흔한 형식이 JWT입니다. 토큰은 점(.)으로 이은 세 덩어리, 곧 머리, 내용, 서명입니다. 클라이언트는 이 토큰을 들고 있다가 요청마다 Authorization: Bearer 토큰 헤더에 실어 보냅니다. 서버는 로그인한 사람의 목록을 따로 저장해 두지 않습니다. 대신 받은 토큰의 머리와 내용으로 서명을 다시 계산해, 토큰에 붙어 온 서명과 같은지 봅니다. 같으면 서버가 만든, 고쳐지지 않은 토큰이라고 믿고 내용을 읽습니다. 이 실습은 토큰의 내용을 고치거나, 서명을 떼어 내거나, 다른 열쇠로 서명하거나, 토큰을 빼 가며, 또 서버가 서명을 확인하지 않게 해 가며, 서버가 누구를 믿고 어떤 응답을 주는지를 봅니다. 코드 칸은 클라이언트가 보내는 요청과 그 토큰을 풀어 본 모습이고, 자바 코드가 아닙니다. 서명은 길어서 (서명)으로 줄여 적었습니다. 이 실습의 서버는 GET /me 요청에 "안녕하세요, 사용자 이름"을 돌려주도록 만들어 둔 서버이고, 그 서버 코드는 화면에 보이지 않습니다.',
  terms: ['토큰 인증', 'JWT(JSON Web Token)', '서명(토큰의)', 'Authorization: Bearer'],
  controls: [
    { id: 'token', label: '클라이언트가 보내는 토큰', type: 'select', value: 'good', options: [['good', '서버가 준 토큰을 그대로 보낸다'], ['edited', '내용의 kim을 admin으로 고쳐서 보낸다 (서명은 그대로)'], ['nosig', '서명을 떼어 내고 보낸다'], ['otherkey', '다른 열쇠로 서명해서 보낸다 (내용은 admin)'], ['none', '토큰 없이 보낸다']] },
    { id: 'check', label: '서버가 서명을 확인한다', type: 'check', value: true },
  ],
  // q는 물음 방식의 화면에 보이는 물음, t와 d는 글로만 읽는 본문에 쓰이는 이름과 설명
  presets: [
    { t: '처음 설정으로', q: '토큰은 어떻게 생겼고, 서버는 받은 토큰에서 무엇을 확인하나', d: '서버가 준 토큰을 그대로 보냅니다. 서버가 서명을 다시 계산해 맞는 것을 확인하고 내용(kim)을 믿습니다.', v: { token: 'good', check: true } },
    { t: '내용을 admin으로 고치면', q: '토큰의 내용을 kim에서 admin으로 고치면', d: '내용을 읽고 고칠 수는 있지만, 다시 계산한 서명이 붙어 온 서명과 달라 401입니다.', v: { token: 'edited', check: true } },
    { t: '서명을 떼어 내면', q: '서명을 떼어 내면', d: '견줄 서명이 없어 401입니다.', v: { token: 'nosig', check: true } },
    { t: '다른 열쇠로 서명하면', q: '다른 열쇠로 서명하면', d: '서버의 열쇠로 계산한 값과 달라 401입니다.', v: { token: 'otherkey', check: true } },
    { t: '서버가 서명을 확인하지 않으면', q: '서버가 서명을 확인하지 않는데 내용을 고친 토큰이 오면', d: '서명을 보지 않아 고친 내용(admin)이 그대로 통합니다.', v: { token: 'edited', check: false } },
    { t: '토큰 없이 요청하면', q: '토큰 없이 요청하면', d: '읽을 토큰이 없어 누구인지 알 수 없고 401입니다.', v: { token: 'none', check: true } },
  ],
  // 실제로 계산한 값 (verify/net/token_basic_probe.js가 낸 토큰과 같은 값. cmp가 견준다)
  V: {
    hdr: 'eyJhbGciOiJIUzI1NiJ9', hdrJson: '{"alg":"HS256"}',
    pKim: 'eyJ1c2VyIjoia2ltIn0', pAdmin: 'eyJ1c2VyIjoiYWRtaW4ifQ', jKim: '{"user":"kim"}', jAdmin: '{"user":"admin"}',
    sGood: 'jzV9172X5ouTjI0iT6vIB97B7M9nYxcJxmInkhxTkSg', sOther: '0WL9HiP_a-1P71E5dbCJJ7Mrzsv92FFU-eKfuehCCCE', sAdminByServer: 'fv3hkCU04f2PAIslv9QYiJIT9QS8ioSwBnQCk0nuFwg',
  },
  // 설정에 해당하는 토큰: 두 번째 덩어리(내용), 서명, 풀어 본 내용, 코드 칸의 서명 줄, 서버가 그 내용으로 다시 계산한 값
  tok: function (name) {
    var V = this.V;
    return {
      good: { pay: V.pKim, sig: V.sGood, json: V.jKim, who: 'kim', sigLine: '(서버의 비밀 열쇠로 머리와 내용을 계산한 값)', note: '서버가 준 그대로', expect: V.sGood },
      edited: { pay: V.pAdmin, sig: V.sGood, json: V.jAdmin, who: 'admin', sigLine: '(고치기 전 내용으로 계산한 값 그대로)', note: '서버가 준 그대로', expect: V.sAdminByServer },
      nosig: { pay: V.pKim, sig: '', json: V.jKim, who: 'kim', sigLine: '(비어 있음)', note: '떼어 냄', expect: V.sGood },
      otherkey: { pay: V.pAdmin, sig: V.sOther, json: V.jAdmin, who: 'admin', sigLine: '(다른 열쇠로 머리와 내용을 계산한 값)', note: '다른 열쇠로 계산', expect: V.sAdminByServer },
      none: null,
    }[name];
  },
  code: function (c) {
    var T = this.tok(c.token), V = this.V, out = ['GET /me HTTP/1.1'];
    if (T) {
      out.push('Authorization: Bearer ' + V.hdr + '.' + T.pay + '.' + (T.sig ? '(서명)' : ''));
      out.push('', '# 토큰을 점(.)으로 나눠 풀어 보면', '머리: ' + V.hdrJson, '내용: ' + T.json, '서명: ' + T.sigLine);
    }
    out.push('', '# 서버', '서명 확인: ' + (c.check ? '한다' : '하지 않는다'));
    return out.join('\n');
  },
  label: function (c) { return { good: '서버가 준 토큰 그대로', edited: '내용을 admin으로 고침', nosig: '서명을 뗌', otherkey: '다른 열쇠로 서명', none: '토큰 없음' }[c.token] + ' · ' + (c.check ? '서버가 서명을 확인함' : '서버가 서명을 확인하지 않음'); },
  columns: ['서버의 서명 확인', '서버가 믿은 사용자', '응답'],
  // 서버의 판단만 계산한다 (실제 실행과 대조하는 부분)
  judge: function (c) {
    var T = this.tok(c.token);
    if (!T) return { verify: '토큰이 없음', user: '없음', resp: '401' };
    if (!c.check) return { verify: '하지 않음', user: T.who, resp: '200 안녕하세요, ' + T.who };
    if (!T.sig) return { verify: '서명이 없음', user: '없음', resp: '401' };
    if (T.sig === T.expect) return { verify: '맞음', user: T.who, resp: '200 안녕하세요, ' + T.who };
    return { verify: '맞지 않음', user: '없음', resp: '401' };
  },
  simulate: function (c) {
    var T = this.tok(c.token), V = this.V, J = this.judge(c), ev = [], sum = [], ok = J.resp !== '401', fooled = ok && T && T.who === 'admin';
    var st = { sent: false, split: false, calc: '', cmp: '', user: '', resp: '', recv: false };
    function push(s, k) { ev.push({ s: s, k: k || '', snap: JSON.parse(JSON.stringify(st)) }); }
    function short(s) { return s.slice(0, 8) + '…'; }
    var tail = ' 클라이언트가 ' + J.resp.split(' ')[0] + ' 응답을 받습니다.' + (ok ? ' 본문은 "안녕하세요, ' + T.who + '"입니다.' : '');
    // 1단계: 요청을 보낸다
    st.sent = true;
    push({
      good: '클라이언트가 서버에 GET /me 요청을 보냅니다. Authorization 헤더에는 Bearer 다음에 토큰이 실려 있습니다. 이 토큰은 로그인에 성공했을 때 서버가 만들어 준 것이고, 클라이언트는 그것을 그대로 들고 있다가 요청에 붙입니다.',
      edited: '클라이언트가 서버에 GET /me 요청을 보냅니다. Authorization 헤더의 토큰은 서버가 준 토큰을 고친 것입니다. 내용 부분을 kim에서 admin으로 바꿨고, 서명 부분은 서버가 준 그대로입니다.',
      nosig: '클라이언트가 서버에 GET /me 요청을 보냅니다. Authorization 헤더의 토큰에서 서명 부분을 떼어 냈습니다. 점(.)은 남아 있어서 토큰은 "머리.내용." 꼴이고, 서명 자리가 비어 있습니다.',
      otherkey: '클라이언트가 서버에 GET /me 요청을 보냅니다. Authorization 헤더의 토큰은 내용을 admin으로 고치고, 서버의 비밀 열쇠를 모르므로 자기가 가진 다른 열쇠로 계산한 서명을 붙인 것입니다.',
      none: '클라이언트가 서버에 GET /me 요청을 보냅니다. 이번에는 Authorization 헤더가 없습니다. 토큰을 실어 보내지 않았습니다.',
    }[c.token], T && c.token !== 'good' ? 'bad' : '');
    if (!T) {
      // 토큰이 없다
      st.user = J.user; st.resp = J.resp; st.cmp = c.check ? '' : 'skipped';
      push('서버가 요청의 Authorization 헤더를 찾습니다. 헤더가 없어서 읽을 토큰이 없고, 서버는 이 요청을 보낸 사람이 누구인지 알 수 없습니다. ' + (c.check ? '확인할 서명도 없습니다.' : '서명을 확인하지 않는 서버이지만, 읽을 내용이 없는 것은 마찬가지입니다.') + ' 서버가 401 응답을 돌려줍니다. 서버는 로그인한 사람의 목록을 두지 않으므로, 이 요청이 전에 로그인한 사람에게서 온 것인지 따로 찾아볼 곳도 없습니다.', 'bad');
      st.recv = true;
      push('클라이언트가 401 응답을 받습니다.', 'bad');
      sum.push('토큰 없이 요청하면 서버는 누구의 요청인지 알 수 없어 401로 답합니다. 서명을 확인하는지와 상관없이 같습니다.');
      sum.push('토큰 방식에서는 요청이 스스로 누구인지를 들고 와야 합니다. 서버는 로그인한 사람의 목록을 두지 않으므로, 토큰이 없는 요청에는 알아볼 수단이 없습니다.');
      return { events: ev, summary: sum, tk: T, row: [J.verify, J.user, J.resp] };
    }
    // 2단계: 토큰을 점으로 나눈다
    st.split = true;
    push('서버가 Authorization 헤더에서 토큰을 꺼내 점(.)으로 나눕니다. 앞에서부터 머리, 내용, 서명입니다.' + (T.sig ? '' : ' 이 토큰은 서명 자리가 비어 있습니다.') + ' 머리와 내용은 암호가 아니라 글자를 base64url이라는 표기로 바꿔 적은 것이라, 열쇠 없이 풀어도 머리는 ' + V.hdrJson + ', 내용은 ' + T.json + '으로 읽힙니다. 읽을 수 있다고 해서 믿는 것은 아닙니다.', '');
    if (!c.check) {
      // 서명을 확인하지 않는 서버
      st.cmp = 'skipped';
      push('이 서버는 서명을 확인하지 않습니다(코드 칸 맨 아래의 "서명 확인: 하지 않는다"). 열쇠로 서명을 다시 계산하지도, 토큰에 붙어 온 서명을 보지도 않고 내용 부분만 읽습니다.' + (T.sig ? '' : ' 서명 자리가 비어 있어도 서버는 그 자리를 보지 않습니다.') + ' 내용에 적힌 user는 ' + T.who + '입니다.', fooled ? 'bad' : '');
      st.user = J.user; st.resp = J.resp;
      push('서버가 내용에 적힌 ' + T.who + '을 그대로 믿고 이 요청을 ' + T.who + '의 요청으로 처리해 200 응답을 만듭니다.' + (fooled ? ' 토큰을 고친 것이 아무에게도 걸리지 않았습니다. 서버가 확인하지 않으면 누구든 내용에 admin이라고 적어 보낼 수 있습니다.' : ' 이번 토큰은 서버가 준 내용이라 결과가 맞아 보이지만, 서버가 그것을 확인해서 그런 것은 아닙니다.'), fooled ? 'bad' : '');
      st.recv = true;
      push(tail.trim(), fooled ? 'bad' : '');
      if (fooled) {
        sum.push('서버가 서명을 확인하지 않으면 ' + (c.token === 'edited' ? '고친 토큰' : '다른 열쇠로 서명한 토큰') + '의 admin이 그대로 통합니다. 서버는 내용에 적힌 사용자를 믿어 버립니다.');
        sum.push('토큰 방식의 안전은 서명이 붙어 있다는 데서가 아니라, 서버가 서명을 다시 계산해 확인한다는 데서 나옵니다.');
      } else if (c.token === 'nosig') {
        sum.push('서버가 서명을 확인하지 않으면 서명을 떼어 낸 토큰도 통합니다. 서명 자리가 비어 있는지 보지 않기 때문입니다.');
        sum.push('이번 내용은 kim이어서 결과는 같아 보입니다. 하지만 내용을 admin으로 고쳐서 서명 없이 보내도 같은 길로 통합니다.');
      } else {
        sum.push('서버가 서명을 확인하지 않아도 서버가 준 토큰은 kim으로 통합니다. 결과가 같아 보이지만, 서버는 이 토큰이 고쳐지지 않았는지 알아보지 않았습니다.');
        sum.push('서명을 확인하는 서버와 확인하지 않는 서버의 차이는 고친 토큰이 왔을 때 드러납니다.');
      }
      return { events: ev, summary: sum, tk: T, row: [J.verify, J.user, J.resp] };
    }
    if (!T.sig) {
      // 서명 자리가 비어 있다
      st.cmp = 'empty';
      push('서버가 토큰의 서명 자리를 봅니다. 비어 있어서 계산한 값과 견줄 서명이 없습니다. 서명이 없는 토큰은 서버가 만든 토큰이라는 보증이 없으므로 서버는 이 토큰을 믿지 않습니다.', 'bad');
      st.user = J.user; st.resp = J.resp;
      push('서버가 토큰의 내용을 쓰지 않고 401 응답을 돌려줍니다. 내용에 적힌 user가 ' + T.who + '이어도 마찬가지입니다.', 'bad');
      st.recv = true;
      push(tail.trim(), 'bad');
      sum.push('서명을 떼어 내면 서버가 견줄 서명이 없어 토큰을 믿지 않고 401로 답합니다.');
      sum.push('서명은 있어야 하는 부분입니다. 서명 자리가 비어 있어도 받아 주는 것은 서버가 서명을 확인하지 않을 때뿐입니다.');
      return { events: ev, summary: sum, tk: T, row: [J.verify, J.user, J.resp] };
    }
    // 3단계: 서명을 다시 계산한다
    st.calc = T.expect;
    push('서버가 자기 비밀 열쇠로, 받은 토큰의 머리와 내용을 가지고 서명을 다시 계산합니다. 열쇠는 서버만 알고, 클라이언트에 준 적이 없습니다. 계산한 값은 ' + short(T.expect) + '입니다.' + (T.who === 'admin' ? ' 내용이 admin으로 바뀐 토큰의 내용으로 계산한 값입니다.' : ''), '');
    // 4단계: 견준다
    var same = T.sig === T.expect;
    st.cmp = same ? 'same' : 'diff';
    if (same) push('서버가 계산한 값(' + short(T.expect) + ')과 토큰에 붙어 온 서명(' + short(T.sig) + ')을 견줍니다. 같습니다. 이는 이 토큰에 서버의 열쇠로 계산한 서명이 붙어 있고, 서명을 만든 뒤 머리와 내용이 한 글자도 바뀌지 않았다는 뜻입니다.', 'good');
    else if (c.token === 'edited') push('서버가 계산한 값(' + short(T.expect) + ')과 토큰에 붙어 온 서명(' + short(T.sig) + ')을 견줍니다. 다릅니다. 붙어 온 서명은 고치기 전 내용(kim)으로 계산된 것이고, 서버가 고친 내용(admin)으로 계산하면 다른 값이 나옵니다. 서명은 그 내용 그대로일 때만 맞습니다.', 'bad');
    else push('서버가 계산한 값(' + short(T.expect) + ')과 토큰에 붙어 온 서명(' + short(T.sig) + ')을 견줍니다. 다릅니다. 붙어 온 서명은 다른 열쇠로 계산한 것이라 서버의 열쇠로 계산한 값과 다릅니다. 열쇠를 모르는 쪽이 맞는 서명을 만들 수 없다는 것이 서명 방식의 전제입니다.', 'bad');
    // 5단계: 믿거나 거절한다
    st.user = J.user; st.resp = J.resp;
    if (same) push('서명이 맞으므로 서버는 이 토큰을 자기가 만든, 고쳐지지 않은 토큰이라고 믿고 내용을 읽습니다. user는 ' + T.who + '입니다. 서버는 ' + T.who + '이 로그인했다는 것을 어디에도 적어 두지 않았습니다. 그 사실은 토큰에 적혀 있고, 서명이 그것을 보증합니다. 이 서버 코드에는 로그인한 사람의 목록이 없습니다. 서버가 이 요청을 ' + T.who + '의 요청으로 처리해 200 응답을 만듭니다.', 'good');
    else push('서명이 맞지 않으므로 서버는 토큰의 내용을 쓰지 않고 401 응답을 돌려줍니다. 내용에 admin이라고 적혀 있어도 믿지 않습니다.', 'bad');
    st.recv = true;
    push(tail.trim(), same ? 'good' : 'bad');
    if (same) {
      sum.push('토큰은 "kim이 로그인했다"는 내용을 글자로 적고 서버의 비밀 열쇠로 계산한 서명을 붙인 글입니다. 서버는 받은 토큰의 머리와 내용으로 서명을 다시 계산해 붙어 온 서명과 같은지 보고, 같으면 내용을 믿습니다.');
      sum.push('서버는 로그인한 사람의 목록을 따로 저장하지 않았습니다. 서버의 저장소에 적어 두고 번호만 주는 세션과 다른 점입니다. kim이라는 사실은 토큰에 적혀 있고 서명이 보증합니다. 내용은 열쇠 없이도 누구나 읽을 수 있으므로 비밀을 적지 않습니다.');
    } else if (c.token === 'edited') {
      sum.push('내용을 kim에서 admin으로 고치면 서버가 다시 계산한 서명이 붙어 온 서명과 달라져 401로 거절됩니다.');
      sum.push('토큰의 내용은 누구나 읽을 수 있고 글자를 고칠 수도 있지만, 고친 토큰은 서버가 받아 주지 않습니다. 서명은 그 내용 그대로일 때만 맞기 때문입니다.');
    } else {
      sum.push('다른 열쇠로 서명하면 서버가 자기 열쇠로 계산한 값과 달라 401로 거절됩니다.');
      sum.push('서명이 붙어 있다고 되는 것이 아니라 서버의 열쇠로 계산한 서명이어야 합니다. 그래서 열쇠는 서버만 알아야 합니다.');
    }
    return { events: ev, summary: sum, tk: T, row: [J.verify, J.user, J.resp] };
  },
  render: function (v, sim, t, H, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : null, T = sim.tk, V = this.V;
    if (!s) { H.text(v, '실행을 누르면 클라이언트가 요청을 보내는 것부터 시작합니다.'); return; }
    if (T) H.table(v, ['부분', '토큰에 적힌 글자', '풀어 본 내용'], [
      { cls: s.split ? '' : 'gone', cells: ['머리', s.split ? V.hdr : '', s.split ? V.hdrJson : ''] },
      { cls: s.split ? '' : 'gone', cells: ['내용', s.split ? T.pay : '', s.split ? { v: T.json, cls: T.who === 'admin' ? 'bad' : '' } : ''] },
      { cls: s.split ? '' : 'gone', cells: ['서명', s.split ? (T.sig ? T.sig.slice(0, 8) + '…' : '(비어 있음)') : '', s.calc ? '서버가 다시 계산한 값: ' + s.calc.slice(0, 8) + '…' : '글자로 풀어 볼 내용이 아님 (계산한 값)'] },
    ], s.split ? '세 부분으로 나눈 토큰' : '보낸 토큰');
    H.table(v, ['항목', '값'], [
      { cls: s.cmp ? '' : 'gone', cells: ['서버의 서명 확인', s.cmp ? { v: sim.row[0], cls: s.cmp === 'same' ? 'good' : s.cmp === 'skipped' ? '' : 'bad' } : '아직'] },
      { cls: s.user ? '' : 'gone', cells: ['서버가 믿은 사용자', s.user ? { v: s.user, cls: s.user === 'admin' ? 'bad' : s.user === 'kim' ? 'good' : '' } : '아직'] },
      { cls: s.resp ? '' : 'gone', cells: ['응답', s.resp ? { v: s.resp, cls: s.resp.indexOf('200') === 0 ? (s.user === 'admin' ? 'bad' : 'good') : 'bad' } : '아직'] },
    ], '결과');
  },
  // 그림: 왼쪽에 클라이언트가 들고 있는 토큰의 세 덩어리(머리, 내용, 서명), 오른쪽에 서버(비밀 열쇠, 다시 계산한 서명, 견주기). 내용과 서명이 서버로 가서 견주어지고, 고친 덩어리는 빨갛게, 서명이 맞으면 초록으로 보인다. 맨 아래는 서버가 믿은 사용자와 응답.
  draw: function (P, sim, shown) {
    var c = sim.c, T = sim.tk, V = this.V, last = shown[shown.length - 1], s = last ? last.snap : null, n = shown.length;
    var chk = c.check, sent = !!(s && s.sent && T);
    P.size(680, 312);
    P.region('cl', 14, 12, 246, 238, '클라이언트가 들고 있는 토큰');
    P.region('sv', 420, 12, 246, 238, '서버');
    P.box('p0', 24, 38, 226, 62, { cls: T ? 'plain' : 'ghost', title: '머리', sub: T ? [V.hdr, V.hdrJson] : ['토큰 없음'], mono: !!T });
    P.box('p1', 24, 108, 226, 62, { cls: !T ? 'ghost' : T.who === 'admin' ? 'bad' : 'plain', title: '내용', right: T && T.who === 'admin' ? '고침' : '', sub: T ? [T.pay, T.json] : ['토큰 없음'], mono: !!T });
    var p2cls = !T ? 'ghost' : s && s.cmp === 'same' ? 'good' : s && s.cmp === 'diff' ? 'bad' : c.token === 'otherkey' ? 'bad' : !T.sig ? 'ghost' : 'plain';
    P.box('p2', 24, 178, 226, 62, { cls: p2cls, title: '서명', right: T ? T.note : '', sub: T ? [T.sig ? T.sig.slice(0, 8) + '…' : '(떼어 냄)'] : ['토큰 없음'], mono: !!T });
    P.box('key', 430, 38, 226, 62, { cls: chk ? 'plain' : 'ghost', title: '비밀 열쇠', sub: [chk ? '서버만 아는 값' : '쓰지 않음'] });
    var calcSub = !chk ? '하지 않음' : s && s.calc ? s.calc.slice(0, 8) + '…' : s && s.split && T && !T.sig ? '서명 자리가 비어 있음' : s && !T && s.resp ? '토큰이 없어 계산 안 함' : '아직';
    P.box('calc', 430, 108, 226, 62, { cls: !chk ? 'ghost' : s && s.calc ? 'wait' : s && s.resp ? 'ghost' : 'plain', title: '다시 계산한 서명', sub: [calcSub], mono: !!(chk && s && s.calc) });
    var cm = s ? s.cmp : '';
    P.box('cmp', 430, 178, 226, 62, { cls: !chk || cm === 'skipped' ? 'ghost' : cm === 'same' ? 'good' : cm === 'diff' || cm === 'empty' ? 'bad' : s && s.resp ? 'ghost' : 'plain', title: '붙어 온 서명과 견주기', sub: [!chk ? '하지 않음' : cm === 'same' ? '같음: 믿음' : cm === 'diff' ? '다름: 거절' : cm === 'empty' ? '붙어 온 서명이 없음' : s && s.resp ? '하지 않음' : '아직'] });
    if (sent && chk) {
      P.arrow('a0', 'p0:r', 'calc:l:0.3', { cls: 'hot' });
      P.arrow('a1', 'p1:r', 'calc:l:0.7', { cls: 'hot' });
      if (T.sig) P.arrow('a2', 'p2:r', 'cmp:l', { cls: 'hot' });
    }
    if (sent && !chk) P.arrow('a1', 'p1:r', 'calc:l', { cls: 'dash' });
    if (s && s.calc) { P.arrow('ak', 'key:b', 'calc:t', { cls: 'hot' }); P.arrow('ac', 'calc:b', 'cmp:t', { cls: 'hot' }); }
    var u = s ? s.user : '', r = s ? s.resp : '';
    P.box('r1', 14, 262, 322, 36, { cls: u === 'admin' ? 'bad' : u === 'kim' ? 'good' : u ? 'plain' : 'ghost', title: '서버가 믿은 사용자', right: u || '아직' });
    P.box('r2', 344, 262, 322, 36, { cls: r.indexOf('200') === 0 ? (u === 'admin' ? 'bad' : 'good') : r ? 'bad' : 'ghost', title: '응답', right: r || '아직' });
  },
  assume: '서버는 Node.js 24.18.0의 http 모듈로 127.0.0.1의 빈 포트에 띄운 것 하나입니다. POST /login은 받은 이름으로 토큰을 만들어 돌려주고(비밀번호 확인은 생략했고 서버는 아무것도 저장하지 않습니다), GET /me는 Authorization 헤더에서 Bearer 다음의 토큰을 꺼내 점으로 나눈 뒤, 서명 확인이 켜져 있으면 머리와 내용으로 HMAC-SHA256을 다시 계산해 붙어 온 서명과 견주고(맞지 않거나 비어 있으면 401), 꺼져 있으면 견주지 않고 내용의 user를 읽어 "안녕하세요, 사용자 이름"으로 200 응답을 합니다. 이 판단은 요청과 열쇠와 서명 확인 여부만 읽는 한 함수가 하며 로그인한 사람의 목록 같은 저장소를 찾아보지 않습니다. 클라이언트는 Node.js http.request로 실제 HTTP 요청을 보냈고, 열 가지 조합 모두에서 서버가 받은 요청의 첫 줄(GET /me, HTTP/1.1)과 Authorization 헤더, 서명 확인 결과, 응답 상태와 본문을 확인해 모형과 대조했습니다. 코드 칸의 토큰 줄은 서버가 받은 헤더에서 서명 부분만 (서명)으로 줄인 것과 같은 글이고, 풀어 본 머리와 내용은 서버가 받은 토큰을 base64url로 푼 글과 같습니다. 서버가 받은 요청에는 Host, Connection 같은 다른 헤더도 있었고 화면에서는 줄였습니다. 화면의 localhost는 쓰지 않았고 요청은 검증 실행 때 다른 포트로 갔습니다. 토큰을 만드는 구현이 표준대로인지는 RFC 7515 부록 A.1의 예시(문서에 적힌 열쇠, 머리, 내용)로 같은 계산을 돌려 문서의 서명과 같은 값이 나오는 것으로 먼저 확인했습니다. 검증 실행에서는 Gradle 캐시에 있던 JWT 라이브러리 jose4j 0.9.5로도 같은 토큰을 HS256 열쇠로 검증했고, 서버가 준 토큰만 맞고 내용을 고친 것, 서명을 뗀 것, 다른 열쇠로 서명한 것은 맞지 않는다고 나와 이 서버의 판단과 같았습니다. 또 로그인을 한 번도 받지 않은 새 서버(같은 열쇠)에 서버가 준 토큰을 보내도 200으로 받아들였고, 다른 열쇠를 가진 서버는 같은 토큰을 거절했습니다. 내용을 admin으로 고치면 서버가 그 내용으로 다시 계산한 값이 붙어 온 서명과 달랐고, 다른 열쇠로 만든 서명도 서버가 계산한 값과 달랐습니다. 서명을 떼어 낸 토큰은 "머리.내용."처럼 점을 남기고 서명 자리만 비운 모양으로 보냈습니다. 점까지 뗀 "머리.내용"은 이 서버에서 서명 확인 여부와 상관없이 형식 오류로 401이 되는 것을 따로 보았는데, 이것은 이 서버를 만든 방식에서 나온 동작이어서 화면에는 쓰지 않았습니다. 401 응답에는 WWW-Authenticate: Bearer 헤더가 붙었고 화면에서는 줄였습니다. 이 실습은 서명 부분을 비운 토큰만 다루고, 머리의 alg를 none으로 바꾸는 공격은 다루지 않았습니다. 이 서버는 머리의 alg를 읽지 않고 언제나 HMAC-SHA256으로 확인하며, 알고리즘을 둘러싼 문제는 "세부 동작 실습: JWT의 구조와 검증"에서 다룹니다. 토큰의 만료 시간(exp), 토큰을 훔쳐 갔을 때의 문제, 이미 준 토큰을 무효로 만들기 어려운 점, 토큰을 어디에 보관하는지, 공개키 방식(RS256)도 다루지 않았습니다. 문서로 확인한 것은 다음과 같습니다. RFC 7519 1절과 3절(JWT는 클레임을 JSON 객체로 담아 JWS 또는 JWE 구조로 표현한 것이고, 서명한 JWT에서는 클레임 집합이 JWS의 페이로드), 7.2절의 첫 단계(JWT에 점이 하나 이상 있어야 하고, 첫 점 앞이 머리), RFC 7515 2절(서명 입력은 base64url한 머리, 점, base64url한 내용), 3절(JWS 개요), 5.2절(서명 검증은 서명 입력에 대해 하고, 검증이 하나도 성공하지 못하면 무효), 7.1절(압축 형식은 머리, 내용, 서명을 점으로 이은 것), 부록 A.1(HMAC SHA-256 예시), RFC 6750 1.2절(Bearer 토큰은 가진 쪽이면 누구나 쓸 수 있는 토큰), 2.1절(Bearer 방식으로 Authorization 헤더에 토큰을 실어 보냄), 3절(WWW-Authenticate 응답 헤더, 방식 이름은 Bearer)입니다. RFC 6750은 OAuth 2.0의 액세스 토큰을 위한 문서이지만 이 실습의 토큰도 같은 모양의 헤더에 실었습니다. 화면의 열쇠와 토큰은 이 실습을 위해 만든 값이고, 열쇠의 값은 화면에 보이지 않습니다. 브라우저에서 실행해 확인하지는 않았습니다.',
});

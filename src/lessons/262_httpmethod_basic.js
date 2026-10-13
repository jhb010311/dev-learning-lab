Lab.register({
  id: 'httpmethod_basic', nav: 'HTTP 메서드', cat: '기초개념', mode: 'step', basic: true, deep: ['idem', 'httpmsg', 'binding'],
  title: 'GET과 POST는 무엇이 다른가',
  intro: 'HTTP 요청의 첫 줄 맨 앞 낱말을 메서드라고 합니다. 메서드는 서버에게 "그 주소에서 무엇을 해 달라"는 요청인지를 알리는 낱말이어서, 같은 /memos 주소라도 GET을 보내는지 POST를 보내는지에 따라 서버가 하는 일이 다릅니다. GET은 서버에 있는 것을 가져오는 메서드로, 서버의 것을 바꿔 달라는 요청이 아닙니다. POST는 요청에 실어 보낸 내용(본문)을 서버가 처리해 달라는 메서드입니다. 서버는 자기가 맡을 메서드를 코드로 만들어 두고, 만들어 두지 않은 메서드로 요청이 오면 405 상태 코드로 답합니다. 이 실습은 메모 목록을 가진 서버에 요청을 보내면서 첫 줄의 메서드를 바꾸고, 같은 요청을 한 번 또는 두 번 보내, 서버의 메모가 어떻게 되는지를 봅니다. 코드 칸의 위쪽은 서버에 실제로 보낸 요청의 글자이고, # 으로 시작하는 줄은 서버에 보내지 않는 설명입니다(서버에 무엇을 만들어 두었는지, 보내는 횟수). 코드 칸은 서버 프로그램의 코드가 아니라 주고받은 것을 적은 것입니다. (빈 줄)은 아무 글자도 없는 줄을 눈에 보이게 적은 것입니다.',
  terms: ['HTTP 메서드', 'GET 메서드', 'POST 메서드', '405 Method Not Allowed와 Allow 헤더'],
  controls: [
    { id: 'method', label: '첫 줄의 메서드', type: 'select', value: 'get', options: [['get', '첫 줄: GET /memos HTTP/1.1'], ['post', '첫 줄: POST /memos HTTP/1.1 (Content-Length 줄과 본문 hello가 붙는다)'], ['delete', '첫 줄: DELETE /memos HTTP/1.1 (서버에 DELETE를 맡는 줄이 없다)']] },
    { id: 'times', label: '보내는 횟수', type: 'select', value: '1', options: [['1', '요청을 한 번 보낸다'], ['2', '같은 요청을 두 번 보낸다']] },
  ],
  // q는 물음 방식의 화면에 보이는 물음, t와 d는 글로만 읽는 본문에 쓰이는 이름과 설명
  presets: [
    { t: '처음 설정으로', q: 'GET /memos 요청은 어떻게 생겼고, 서버에 보내면 무슨 일이 일어나나', d: '서버가 목록을 돌려주기만 합니다. 서버의 메모는 그대로입니다.', v: { method: 'get', times: '1' } },
    { t: '같은 GET을 두 번 보내면', q: '같은 GET 요청을 두 번 보내면', d: '두 번 보내도 응답이 같고, 서버의 메모는 그대로입니다.', v: { method: 'get', times: '2' } },
    { t: 'POST로 바꾸면', q: '첫 줄을 POST /memos HTTP/1.1로 바꾸고 본문 hello를 붙여 보내면', d: '서버가 본문의 글을 목록에 더해서 메모가 하나 늘어납니다.', v: { method: 'post', times: '1' } },
    { t: '같은 POST를 두 번 보내면', q: '같은 POST 요청을 두 번 보내면', d: '보낼 때마다 메모가 하나씩 늘어납니다.', v: { method: 'post', times: '2' } },
    { t: 'DELETE로 바꾸면', q: '첫 줄을 DELETE /memos HTTP/1.1로 바꾸면', d: '서버가 만들어 두지 않은 메서드라서 405로 거절합니다.', v: { method: 'delete', times: '1' } },
  ],
  // 메서드별 요청의 글(코드 칸의 위쪽). (빈 줄)은 아무 글자도 없는 줄이다.
  REQ: {
    get: ['GET /memos HTTP/1.1', 'Host: localhost:8080', '(빈 줄)'],
    post: ['POST /memos HTTP/1.1', 'Host: localhost:8080', 'Content-Length: 5', '(빈 줄)', 'hello'],
    delete: ['DELETE /memos HTTP/1.1', 'Host: localhost:8080', '(빈 줄)'],
  },
  NAME: { get: 'GET', post: 'POST', delete: 'DELETE' },
  code: function (c) {
    var out = [];
    if (+c.times === 2) out.push('# 같은 요청을 두 번 보낸다');
    out.push.apply(out, this.REQ[c.method]);
    out.push('', '# 서버: 처음 목록에는 메모 first 하나가 있다', '# 서버: GET /memos → 목록을 돌려준다', '# 서버: POST /memos → 본문의 글을 목록에 더한다');
    return out.join('\n');
  },
  label: function (c) { return '첫 줄 ' + this.NAME[c.method] + ' · ' + (+c.times === 2 ? '같은 요청을 두 번' : '요청을 한 번'); },
  columns: ['응답', '서버의 메모 수', '서버의 것이 바뀜'],
  simulate: function (c) {
    var nm = this.NAME[c.method], N = +c.times, ev = [], sum = [], memos = ['first'], tgt = c.method === 'get' ? 'h1' : c.method === 'post' ? 'h2' : 'h3', found = c.method !== 'delete';
    var first = memos.join(', ');
    var st = { round: 0, sent: 0, phase: '', target: '', rq: 'plain', h1: 'plain', h2: 'plain', h3: 'ghost', memoCls: 'plain', memos: memos.slice(), arrAdd: false, arrRead: false, resp: null, changed: '아직', reqs: [] };
    function push(s, k) { ev.push({ s: s, k: k, snap: JSON.parse(JSON.stringify(st)) }); }
    var devs = [];
    if (c.method !== 'get') devs.push('첫 줄의 ' + nm + (c.method === 'post' ? ', Content-Length 줄, 본문 hello' : ''));
    if (N === 2) devs.push('"같은 요청을 두 번 보낸다" 줄');
    var note = devs.length ? ' 코드 칸에서 처음 설정과 달라진 곳은 ' + devs.join(', ') + '입니다.' : '';
    var cells = [];
    for (var n = 1; n <= N; n++) {
      var again = n > 1;
      st.round = n; st.sent = n; st.phase = 'send'; st.target = ''; st.resp = null; st.arrAdd = false; st.arrRead = false; st.rq = 'hot'; st.h1 = 'plain'; st.h2 = 'plain'; st.h3 = 'ghost'; st.memoCls = 'plain';
      // 1. 요청을 보낸다
      if (!again) {
        push('클라이언트(요청을 보내는 쪽)가 서버에 아래 글자를 보냅니다. 이 글이 HTTP 요청입니다. 서버에는 처음에 메모 first 하나가 들어 있는 목록이 있습니다. 첫 줄의 맨 앞 낱말이 메서드로, 서버에게 무엇을 해 달라는 요청인지를 나타냅니다. 이 요청의 메서드는 ' + nm + '입니다. 그 뒤의 /memos는 어느 주소에 대한 요청인지(경로)이고, HTTP/1.1은 어떤 규칙으로 쓴 글인지(버전)입니다.' + (c.method === 'post' ? ' Content-Length: 5 줄은 본문의 크기가 5바이트라는 뜻입니다. 빈 줄 아래에 본문이 붙어 있는데, 본문은 서버에 실어 보내는 내용이고 이 요청에서는 hello입니다.' : '') + (N === 2 ? ' 이 요청을 같은 글자 그대로 두 번 보냅니다.' : '') + note, '');
      } else {
        push('같은 요청을 한 번 더 보냅니다. 연결을 새로 맺어 앞과 똑같은 글자를 처음부터 다시 보냅니다. 서버의 목록에는 지금 메모가 ' + memos.length + '개 있습니다.', '');
      }
      // 2. 서버가 첫 줄을 읽고 맡은 줄을 찾는다
      st.phase = 'read'; st.target = tgt; st.rq = 'plain'; st[tgt] = found ? 'hot' : 'bad';
      if (!again) {
        if (found) push('서버가 글자를 읽기 시작합니다. 첫 줄에서 메서드는 ' + nm + ', 경로는 /memos임을 읽습니다. 서버는 자기가 만들어 둔 것(코드 칸 아래의 # 서버 줄) 가운데 같은 메서드와 경로가 있는지 찾습니다. ' + nm + ' /memos 요청을 맡는 줄이 있습니다.', '');
        else push('서버가 글자를 읽기 시작합니다. 첫 줄에서 메서드는 DELETE, 경로는 /memos임을 읽습니다. 서버가 만들어 둔 것은 GET /memos와 POST /memos 두 줄이고, DELETE 메서드를 맡는 줄은 없습니다. /memos는 서버가 아는 주소이지만, 이 주소에서 DELETE 메서드를 받는 일은 만들어 두지 않았습니다.', 'bad');
      } else {
        push(found ? '서버가 첫 줄을 읽고, 이번에도 ' + nm + ' /memos 요청을 맡는 줄을 찾습니다.' : '서버가 첫 줄을 읽습니다. 이번에도 DELETE 메서드를 맡는 줄이 없습니다.', found ? '' : 'bad');
      }
      // 3. 서버가 일을 한다
      st.phase = 'act';
      var body, status, allow = '', k = '';
      if (c.method === 'get') {
        body = memos.join(', '); status = '200 OK'; st.arrRead = true;
        push(!again ? '서버가 GET /memos 줄에 적힌 일을 합니다. 목록을 읽어 응답에 담을 뿐 목록에는 손대지 않아서, 메모는 ' + memos.length + '개 그대로입니다. 응답에 담는 글은 "' + body + '"입니다.' : '서버가 이번에도 목록을 읽어 응답에 담을 뿐입니다. 담는 글은 "' + body + '"이고, 메모는 ' + memos.length + '개 그대로입니다.', 'good');
      } else if (c.method === 'post') {
        memos.push('hello'); st.memos = memos.slice(); st.memoCls = 'hot'; st.arrAdd = true; body = memos.join(', '); status = '200 OK';
        push(!again ? '서버가 POST /memos 줄에 적힌 일을 합니다. 요청의 본문에서 글을 꺼내 목록의 끝에 더합니다. 더하는 글은 "hello"입니다. 서버의 목록이 바뀌어 메모가 ' + memos.length + '개가 됩니다.' : '서버가 이번에도 본문의 글을 꺼내 목록의 끝에 더합니다. 더하는 글은 "hello"이고, 목록에 같은 글이 또 들어가 메모가 ' + memos.length + '개가 됩니다.', 'hot');
      } else {
        body = ''; status = '405 Method Not Allowed'; allow = 'GET, POST';
        push(!again ? '서버가 목록은 건드리지 않고 405 Method Not Allowed 응답을 만듭니다. 405는 이 주소는 아는데 이 메서드로는 받지 않는다는 뜻의 상태 코드입니다. 서버 코드는 응답에 Allow 줄을 붙여, 이 주소가 받는 메서드가 GET, POST임을 알립니다(HTTP 표준은 405 응답에 Allow 줄을 붙이라고 정합니다). 메모는 ' + memos.length + '개 그대로입니다.' : '서버가 이번에도 목록은 건드리지 않고 405 응답을 만들어 Allow 줄에 GET, POST를 적습니다. 메모는 ' + memos.length + '개 그대로입니다.', 'bad');
      }
      // 4. 클라이언트가 응답을 받는다
      st.phase = 'resp'; st.arrAdd = false; st.arrRead = false; st.memoCls = 'plain'; st[tgt] = found ? 'good' : 'bad';
      st.resp = { status: status, body: body, allow: allow, ok: found };
      st.changed = memos.join(', ') !== first ? '바뀜' : '바뀌지 않음';
      var cell = status + (found ? ', 본문 "' + body + '"' : ', Allow: ' + allow);
      cells.push(cell);
      st.reqs.push([n + '번째 ' + nm + ' /memos', cell, memos.length + '개']);
      var tail = '';
      if (again && c.method === 'get') tail = ' 앞의 응답과 본문이 같습니다.';
      if (again && c.method === 'post') tail = ' 앞의 응답과 본문이 다릅니다.';
      if (!again && c.method === 'post') tail = ' 본문은 더한 뒤의 목록입니다.';
      push(found ? '클라이언트가 응답을 받습니다. 상태는 ' + status + '이고 본문은 "' + body + '"입니다.' + tail : '클라이언트가 응답을 받습니다. 상태는 ' + status + '이고, Allow 줄에 ' + allow + '가 적혀 있으며 본문은 없습니다.', found ? 'good' : 'bad');
    }
    var cnt = memos.length, ch = memos.join(', ') !== first;
    if (c.method === 'get' && N === 1) {
      sum.push('HTTP 메서드는 요청의 첫 줄 맨 앞 낱말로, 같은 /memos 주소라도 메서드에 따라 서버가 하는 일이 다릅니다. GET은 서버에 있는 것을 가져오는 메서드라서, 서버는 목록을 돌려주기만 했고 메모는 1개 그대로입니다.');
      sum.push('서버는 첫 줄의 메서드와 경로를 읽고, 자기가 만들어 둔 것 가운데 맡는 줄을 찾아 그 일을 합니다. GET /memos 줄은 목록을 돌려주는 일입니다.');
    } else if (c.method === 'get') {
      sum.push('같은 GET 요청을 두 번 보내도 두 응답의 본문이 같고("first"), 서버의 메모는 1개 그대로입니다.');
      sum.push('GET은 서버 상태를 바꾸지 않게 만드는 것이 약속이고, 이 서버도 그렇게 만들어서 몇 번을 보내도 보내기 전과 같은 상태입니다.');
    } else if (c.method === 'post' && N === 1) {
      sum.push('POST /memos로 본문 hello를 보내면 서버가 그 글을 목록에 더해서, 메모가 1개에서 ' + cnt + '개가 됩니다. 응답은 200 OK이고 본문은 더한 뒤의 목록입니다.');
      sum.push('주소는 같은 /memos인데 GET은 가져오기만 했고 POST는 서버의 것을 바꿨습니다. 메서드가 다르면 서버가 하는 일이 다릅니다.');
    } else if (c.method === 'post') {
      sum.push('같은 POST 요청을 두 번 보내면 서버가 두 번 다 처리해서, hello가 두 번 들어가 메모가 1개에서 ' + cnt + '개가 됩니다. 두 응답의 본문도 서로 다릅니다.');
      sum.push('GET과 달리 POST는 보낼 때마다 서버의 것이 바뀝니다. 같은 요청을 다시 보내는 것은 한 번 더 더하라는 뜻이 됩니다.');
    } else if (N === 1) {
      sum.push('서버가 만들어 두지 않은 DELETE 메서드로 보내면 서버는 405 Method Not Allowed로 거절하고, Allow 줄로 이 주소가 받는 메서드(GET, POST)를 알려 줍니다. 서버의 메모는 1개 그대로입니다.');
      sum.push('주소가 /memos로 맞아도 서버가 그 메서드를 맡는 줄을 만들어 두지 않았으면 서버의 것은 바뀌지 않고 405로 답합니다. 없는 주소를 보냈을 때의 404와는 다른 상태 코드입니다.');
    } else {
      sum.push('DELETE 요청을 두 번 보내도 두 번 다 405 Method Not Allowed로 거절당하고, 서버의 메모는 1개 그대로입니다.');
      sum.push('서버가 맡지 않는 메서드는 몇 번을 보내도 서버의 것을 바꾸지 못합니다. Allow 줄이 받을 수 있는 메서드(GET, POST)를 알려 줍니다.');
    }
    var respCell = N === 1 ? cells[0] : cells.map(function (x, i) { return (i + 1) + '번째 ' + x; }).join(' / ');
    return { events: ev, summary: sum, tgt: tgt, row: [respCell, '1개 → ' + cnt + '개', ch ? '바뀜' : '바뀌지 않음'] };
  },
  render: function (v, sim, t, H, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : null;
    if (!s) { H.text(v, '실행을 누르면 클라이언트가 요청을 보내는 것부터 시작합니다.'); return; }
    if (s.reqs.length) H.table(v, ['보낸 요청', '받은 응답', '그 뒤 서버의 메모'], s.reqs.map(function (r) { return { cls: '', cells: [r[0], { v: r[1], cls: r[1].indexOf('200') === 0 ? 'good' : 'bad' }, r[2]] }; }), '요청과 응답');
    H.counters(v, [[s.memos.length, '서버의 메모'], [s.sent, '보낸 요청']]);
  },
  // 그림: 왼쪽에 요청을 보내는 클라이언트, 가운데에 서버가 만들어 둔 줄(GET /memos, POST /memos, 그 밖의 메서드), 오른쪽에 서버의 메모 목록. 요청의 화살표가 맡는 줄에 닿는지, 닿으면 목록을 읽기만 하는지 더하는지를 보인다.
  draw: function (P, sim, shown) {
    var c = sim.c, last = shown[shown.length - 1], s = last ? last.snap : null, nm = this.NAME[c.method], tgt = sim.tgt;
    var memos = s ? s.memos : ['first'];
    P.size(680, 300);
    P.region('cl', 10, 16, 140, 216, '클라이언트');
    P.box('rq', 20, 44, 120, 70, { cls: s ? s.rq : 'plain', title: '요청', sub: [nm + ' /memos', c.method === 'post' ? '본문 hello' : '본문 없음'] });
    P.box('rs', 20, 122, 120, 106, { cls: s && s.resp ? (s.resp.ok ? 'good' : 'bad') : 'ghost', title: '받은 응답', sub: s && s.resp ? (s.resp.ok ? ['200 OK', '본문'].concat(s.resp.body.split(', ')) : ['405', 'Method Not', 'Allowed']) : ['아직'] });
    P.region('sv', 200, 16, 470, 216, '서버가 만들어 둔 것');
    P.box('h1', 210, 40, 250, 46, { cls: s ? s.h1 : 'plain', title: 'GET /memos', sub: '목록을 돌려준다' });
    P.box('h2', 210, 92, 250, 46, { cls: s ? s.h2 : 'plain', title: 'POST /memos', sub: '본문의 글을 목록에 더한다' });
    P.box('h3', 210, 144, 250, 46, { cls: s ? s.h3 : 'ghost', title: '그 밖의 메서드', sub: '맡은 줄 없음' });
    P.box('memo', 510, 40, 150, 150, { cls: s ? s.memoCls : 'plain', title: '서버의 메모', sub: memos });
    if (s && s.phase === 'send') P.arrow('send', 'rq:r', [200, 80], { cls: 'hot' });
    else if (s) P.arrow('send', 'rq:r', tgt + ':l:0.3', { cls: tgt === 'h3' ? 'bad' : 'hot' });
    if (s && s.arrRead) P.arrow('read', 'memo:l:0.3', 'h1:r:0.5', { cls: 'hot' });
    if (s && s.arrAdd) P.arrow('add', 'h2:r:0.5', 'memo:l:0.7', { cls: 'hot' });
    if (s && s.resp) P.arrow('back', tgt + ':l:0.8', 'rs:r:0.3', { cls: s.resp.ok ? 'good' : 'bad' });
    P.box('n1', 14, 250, 322, 36, { cls: s && s.sent ? 'wait' : 'ghost', title: '서버의 메모 수', right: memos.length + '개' });
    P.box('n2', 344, 250, 322, 36, { cls: s && s.changed === '바뀜' ? 'hot' : s && s.changed === '바뀌지 않음' ? 'good' : 'ghost', title: '서버의 것이 바뀜', right: s ? s.changed : '아직' });
  },
  assume: '서버는 Node.js 24.18.0의 http 모듈로 127.0.0.1의 빈 포트에 띄운 것으로, 처음 목록에는 메모 first 하나가 있고, GET /memos에는 목록을 ", "로 이은 글을 본문으로 200 OK를, POST /memos에는 요청 본문의 글을 목록에 더한 뒤 더한 뒤의 목록을 본문으로 200 OK를, /memos에 오는 그 밖의 메서드에는 서버 코드가 Allow: GET, POST 줄을 붙인 405를, 그 밖의 주소에는 404를 돌려줍니다. 코드 칸은 서버 프로그램의 코드가 아니라 주고받은 것을 적은 것이고, # 으로 시작하는 줄은 서버에 보내지 않는 설명입니다. 메서드 세 가지와 보내는 횟수 두 가지, 모두 여섯 가지 조합을 실제로 실행했습니다. 클라이언트는 net 모듈로 코드 칸 위쪽의 요청 글자를 줄 끝 CRLF로 그대로 보내고(두 번 보낼 때는 연결을 새로 맺어 같은 글자를 한 번 더), 서버가 연결을 닫을 때까지 받은 응답의 상태 줄, Allow 줄, 본문을 해석했습니다. 서버가 받은 메서드와 경로와 본문, 요청 뒤 서버의 메모 개수와 목록이 바뀌었는지, 마지막에 GET /memos를 한 번 더 보내 읽은 목록이 서버의 실제 목록과 같은지, 없는 주소 /nothing에 GET을 보내면 404가 오는지를 확인해 모형과 대조했고, 화면의 코드가 실행한 요청 글자와 같은 글자인지도 조합마다 확인했습니다. 모두 모형과 일치했습니다. 화면의 Host: localhost:8080은 예시이고, 실제로는 빈 포트에 보냈으며 이 서버는 Host의 값을 따지지 않습니다. GET이 서버의 것을 바꾸지 않은 것은 이 서버를 그렇게 만들었기 때문입니다. 표준은 GET에 읽기 전용의 의미를 정해 두었을 뿐이어서, GET에서 서버의 것을 바꾸는 서버가 어떻게 되는지는 실행해 보지 않았습니다. POST에 200 OK로 답한 것도 이 서버의 선택입니다. 표준은 새 자원이 만들어졌으면 201 Created와 Location 줄로 답하라고 권하는데(9.3.3절), 이 서버의 메모에는 따로 주소가 없어 쓰지 않았습니다. 문서로 확인한 것은 RFC 9110의 9.1절(메서드 이름은 대소문자를 구분하고, 서버가 알지 못하거나 구현하지 않은 메서드에는 501을, 알지만 그 자원이 받지 않는 메서드에는 405를 쓰도록 권한다), 9.2.1절(안전한 메서드: 읽기 전용 의미로 정의되어 클라이언트가 서버의 상태 변화를 요청하지도 기대하지도 않는다), 9.2.2절(멱등), 9.3.1절(GET: 대상 자원의 현재 표현을 전달해 달라는 요청), 9.3.3절(POST: 요청에 실린 표현을 대상 자원이 처리해 달라는 요청과 그 쓰임), 10.2.1절(Allow), 15.5.6절(405 Method Not Allowed: 알지만 대상 자원이 지원하지 않는 메서드, 405 응답에는 Allow를 반드시 붙인다)입니다. 이 문서들은 WebFetch로 열었으나 긴 문서를 구간으로 나누어 열었고 돌아온 것이 요약과 짧은 발췌여서, 문장 전체를 원문으로 대조하지는 못했습니다. 이 실습이 다루지 않는 것: PUT, PATCH, DELETE가 성공하는 경우, 같은 요청을 여러 번 보내도 결과가 같은 성질(멱등)과 응답을 못 받았을 때 다시 보내도 되는지는 "세부 동작 실습: 재시도와 멱등성"에서, 요청과 응답의 글자 모양과 상태 코드 전체는 "세부 동작 실습: HTTP 메시지와 상태 코드"에서, 스프링에서 메서드와 주소로 요청을 가르는 것은 "세부 동작 실습: 요청 매핑과 파라미터 바인딩"에서 다룹니다. 브라우저는 쓰지 않았고, 브라우저 주소창에 주소를 입력하면 GET이 가고 HTML 양식은 POST를 쓸 수 있다는 것은 확인하지 않았습니다.',
});

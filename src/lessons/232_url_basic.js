Lab.register({
  id: 'url_basic', nav: 'URL', cat: '기초개념', mode: 'step', basic: true, deep: ['url'],
  title: 'URL은 어떤 부분들로 이루어져 있는가',
  intro: '주소창에 적는 http://localhost:8080/hello?name=kim 같은 URL은 한 덩어리의 글자처럼 보이지만, 정해진 기호(://, :, /, ?)로 나뉘는 부분들의 모음입니다. 스킴(http)은 어떤 규칙으로 대화할지, 호스트(localhost)는 어느 컴퓨터인지, 포트(8080)는 그 컴퓨터의 어느 프로그램인지, 경로(/hello)는 그 프로그램에게 무엇을 달라는지, 쿼리(?name=kim)는 덧붙여 보내는 값입니다. 클라이언트(요청을 보내는 프로그램. 브라우저가 대표적이고, 이 실습에서는 Node.js 프로그램)는 URL을 이 부분들로 나눈 뒤 호스트와 포트로 연결하고, 경로와 쿼리만 HTTP 요청의 첫 줄에 적어 서버에 보냅니다. 이 실습은 부분을 하나씩 지우거나 바꿔 가며 같은 서버(/hello 주소만 만들어 둔 서버)에 요청을 보내, 어느 부분이 어디에 쓰이는지와 부분이 없으면 무슨 일이 생기는지를 봅니다.',
  terms: ['URL의 구성 요소', '스킴과 기본 포트', '경로와 쿼리', '포트'],
  controls: [
    { id: 'scheme', label: '맨 앞에 http://를 적는다', type: 'check', value: true },
    { id: 'port', label: '호스트 뒤에 :8080을 적는다', type: 'check', value: true },
    { id: 'path', label: '경로', type: 'select', value: 'hello', options: [['hello', '경로 /hello'], ['nothing', '경로 /nothing (서버에 없는 경로)'], ['none', '경로를 적지 않는다']] },
    { id: 'query', label: '끝에 ?name=kim을 적는다', type: 'check', value: true },
  ],
  // q는 물음 방식의 화면에 보이는 물음, t와 d는 글로만 읽는 본문에 쓰이는 이름과 설명
  presets: [
    { t: '처음 설정으로', q: 'URL은 어떤 부분으로 되어 있고, 클라이언트는 각 부분을 어디에 쓰나', d: '다섯 부분이 다 있는 URL. 호스트와 포트는 연결에, 경로와 쿼리는 요청의 첫 줄에 쓰입니다.', v: { scheme: true, port: true, path: 'hello', query: true } },
    { t: '?name=kim을 지우면', q: '?name=kim을 지우면', d: '쿼리만 없는 URL. 연결과 경로는 그대로이고, 서버가 name을 찾지 못합니다.', v: { scheme: true, port: true, path: 'hello', query: false } },
    { t: '경로를 /nothing으로 바꾸면', q: '경로를 /nothing으로 바꾸면', d: '연결은 같고 경로만 서버에 없는 것. 서버가 404로 답합니다.', v: { scheme: true, port: true, path: 'nothing', query: true } },
    { t: '경로를 지우면', q: '경로를 지우면', d: '경로를 적지 않아도 클라이언트가 /를 보냅니다. 서버에는 / 주소가 없습니다.', v: { scheme: true, port: true, path: 'none', query: true } },
    { t: ':8080을 지우면', q: ':8080을 지우면', d: '포트를 적지 않으면 http의 기본 포트 80번으로 연결을 시도합니다. 서버가 있는 8080번에는 닿지 않습니다.', v: { scheme: true, port: false, path: 'hello', query: true } },
    { t: '맨 앞의 http://를 지우면', q: '맨 앞의 http://를 지우면', d: '스킴이 없으면 부분을 올바로 나눌 수 없습니다. 이 실습의 클라이언트는 요청을 보내지 못합니다(브라우저 주소창은 http://를 알아서 붙여 줍니다).', v: { scheme: false, port: true, path: 'hello', query: true } },
  ],
  PATHS: { hello: '/hello', nothing: '/nothing', none: '' },
  code: function (c) {
    return (c.scheme ? 'http://' : '') + 'localhost' + (c.port ? ':8080' : '') + this.PATHS[c.path] + (c.query ? '?name=kim' : '');
  },
  label: function (c) { return (c.scheme ? 'http:// 있음' : 'http:// 없음') + ' · ' + (c.port ? ':8080 있음' : ':8080 없음') + ' · ' + { hello: '경로 /hello', nothing: '경로 /nothing', none: '경로 없음' }[c.path] + ' · ' + (c.query ? '쿼리 있음' : '쿼리 없음'); },
  // 이 설정에서 클라이언트가 URL을 읽은 결과(Probe가 잰 것과 같은 항목)
  facts: function (c) {
    var p = this.PATHS[c.path], q = c.query ? '?name=kim' : '', text = this.code(c);
    if (!c.scheme && !c.port) return { kind: 'bad', text: text, parse: { error: 'ERR_INVALID_URL' } };
    if (!c.scheme) return { kind: 'odd', text: text, rest: '8080' + p, q: q, parse: { protocol: 'localhost:', hostname: '', port: '', pathname: '8080' + p, search: q } };
    var target = (p || '/') + q, name = c.query ? 'kim' : '손님', ok = c.path === 'hello';
    return {
      kind: 'http', text: text, p: p, q: q, target: target, port: c.port, ok: ok,
      parse: { protocol: 'http:', hostname: 'localhost', port: c.port ? '8080' : '', pathname: p || '/', search: q },
      connect: { host: 'localhost', port: c.port ? 8080 : 80 },
      line: 'GET ' + target + ' HTTP/1.1', hostLine: c.port ? 'Host: localhost:8080' : 'Host: localhost',
      status: ok ? 200 : 404, body: ok ? '안녕하세요, ' + name : '',
    };
  },
  columns: ['읽힌 호스트와 포트', '서버에 보낸 요청의 첫 줄', '응답'],
  simulate: function (c) {
    var f = this.facts(c), ev = [], sum = [], T = f.text;
    var st = { rev: [], hl: [], cn: '', cnText: '', rq: '', rqText: '', res: '', rows: [], out: [] };
    function push(s, k) { ev.push({ s: s, k: k, snap: JSON.parse(JSON.stringify(st)) }); }
    function at(id) { if (st.rev.indexOf(id) < 0) st.rev.push(id); st.hl = [id]; }
    var first = '클라이언트(이 실습에서는 Node.js 프로그램)가 "' + T + '"라는 URL을 받습니다. URL은 한 덩어리의 글자가 아니라, 정해진 기호(://, :, /, ?)로 나뉘는 부분들의 모음입니다. 클라이언트는 이 기호를 보고 왼쪽부터 부분으로 나눕니다. 서버는 /hello 주소만 만들어 둔 서버입니다.';

    if (f.kind === 'bad') {
      push(first, '');
      st.hl = ['sc']; st.rev = ['sc'];
      push('맨 앞에서 스킴을 찾습니다. 스킴은 : 앞의 이름인데, "' + T + '"에는 콜론(:)이 없어 스킴이 없습니다. 스킴도 없고 기준으로 삼을 다른 주소도 없으면 URL 표준은 이 글을 주소로 읽지 못합니다.', 'bad');
      st.hl = ['ho', 'po', 'pa', 'qu']; st.rev = ['sc', 'ho', 'po', 'pa', 'qu'];
      push('스킴을 모르면 /와 ?가 무엇을 나누는 기호인지도 알 수 없습니다. 이 글은 호스트, 포트, 경로, 쿼리로 나뉘지 못하고 "Invalid URL" 오류가 됩니다.', 'bad');
      st.hl = []; st.cn = 'bad'; st.cnText = '연결할 곳을 알 수 없음'; st.rq = 'bad'; st.rqText = '보내지 못함'; st.res = '응답 없음 (요청을 보내지 못함)'; st.out = [['연결하는 곳', '알 수 없음'], ['요청의 첫 줄', '보내지 못함'], ['응답', st.res]];
      push('나뉘지 못한 글에서는 연결할 호스트도, 요청에 적을 경로도 얻을 수 없습니다. 클라이언트는 요청을 보내지 못했고, 서버는 아무것도 받지 못했습니다.', 'bad');
      sum.push('맨 앞의 http://와 :8080을 모두 지우면 이 글은 URL로 읽히지 않습니다. 스킴을 찾지 못해 부분으로 나뉘지 못했고, 요청도 보내지 못했습니다.');
      sum.push('나머지 글자가 어떻든 스킴이 없으면 소용이 없습니다. 스킴은 콜론(:)과 /와 ? 같은 기호가 제 뜻으로 읽히게 하는 출발점입니다.');
      return { events: ev, summary: sum, f: f, row: ['주소로 읽히지 않음', '보내지 못함', '응답 없음 (요청을 보내지 못함)'] };
    }

    if (f.kind === 'odd') {
      push(first, '');
      at('sc'); st.rows.push(['스킴', 'localhost', '(잘못 읽힘) 어떤 규칙으로 대화할지']);
      push('맨 앞에서 스킴을 찾습니다. 스킴은 콜론(:)이 처음 나오는 곳 앞까지의 이름입니다. "' + T + '"에는 localhost 바로 뒤에 콜론(:)이 있어서, URL 표준대로 읽으면 localhost가 스킴이 됩니다. 원래 호스트로 적은 글입니다.', 'bad');
      at('ho'); st.hl = ['ho', 'po', 'pa']; st.rev = ['sc', 'ho', 'po', 'pa'];
      st.rows.push(['호스트와 포트', '(없음)', '스킴 뒤에 //가 이어지지 않아 읽히지 않음']);
      st.rows.push(['경로', f.rest, '(잘못 읽힘) 나머지가 통째로 경로가 됨']);
      push('스킴 뒤에 //가 이어지지 않아서 호스트와 포트는 읽히지 않았습니다. 나머지 "' + f.rest + '" 전체가 경로가 됩니다. 8080은 포트가 아니라 경로의 글자입니다.', 'bad');
      if (c.query) { at('qu'); st.hl = ['qu']; st.rows.push(['쿼리', 'name=kim', '덧붙여 보내는 값']); push('? 뒤의 "name=kim"은 쿼리로 나뉩니다. 하지만 이것을 받아 줄 호스트가 없습니다.', ''); }
      else { st.rev = ['sc', 'ho', 'po', 'pa', 'qu']; }
      st.hl = []; st.cn = 'bad'; st.cnText = '연결할 곳을 알 수 없음'; st.rq = 'bad'; st.rqText = '보내지 못함'; st.res = '응답 없음 (요청을 보내지 못함)'; st.out = [['연결하는 곳', '알 수 없음'], ['요청의 첫 줄', '보내지 못함'], ['응답', st.res]];
      push('localhost는 HTTP 규칙을 뜻하는 스킴이 아니고 호스트도 없으니, 클라이언트는 어느 컴퓨터에 어떤 규칙으로 연결할지 알 수 없습니다. Node.js의 요청 보내기는 스킴이 맞지 않다며 거절했고, fetch도 모르는 스킴이라며 실패했습니다. 요청의 첫 줄은 만들어지지 않았고 서버는 아무것도 받지 못했습니다.', 'bad');
      sum.push('맨 앞의 http://를 지운 "' + T + '"도 주소로 읽히기는 하지만 엉뚱하게 나뉩니다. localhost가 스킴이 되고 호스트와 포트는 사라졌습니다. 요청을 보내지 못했습니다.');
      sum.push('스킴이 없으면 콜론(:)과 /가 무엇을 나누는 기호인지 달라집니다. 같은 글자라도 스킴이 있어야 호스트와 포트, 경로로 올바로 나뉩니다.');
      return { events: ev, summary: sum, f: f, row: ['스킴이 localhost로 읽힘 (호스트 없음)', '보내지 못함', '응답 없음 (요청을 보내지 못함)'] };
    }

    // http 주소: 다섯 부분으로 나뉜다
    var bound = f.p ? '/ 앞' : (f.q ? '/가 없어 ? 앞' : '/가 없어 글의 끝');
    push(first, '');
    at('sc'); st.rows.push(['스킴', 'http', '어떤 규칙으로 대화할지']);
    push('맨 앞에서 ://까지가 스킴이고, 여기서는 "http"입니다. 스킴은 서버와 어떤 규칙으로 대화할지를 알려 줍니다. http는 HTTP 규칙, 곧 요청 줄과 헤더를 보내고 응답을 받는 규칙으로 대화한다는 뜻입니다.', '');
    at('ho'); st.rows.push(['호스트', 'localhost', '어느 컴퓨터인지']);
    push('://다음부터 ' + bound + '까지가 호스트와 포트입니다. ' + (c.port ? '이 가운데 :의 앞이 호스트이고, 여기서는 "localhost"입니다.' : '여기에는 콜론(:)이 없어 이 부분 전체가 호스트이고, "localhost"입니다.') + ' 호스트는 어느 컴퓨터에 연결할지를 알려 줍니다.', '');
    at('po');
    if (c.port) {
      st.rows.push(['포트', '8080', '그 컴퓨터의 어느 프로그램인지']);
      push(':의 뒤가 포트이고, 여기서는 "8080"입니다. 한 컴퓨터에서는 여러 프로그램이 돌 수 있어서, 포트는 그 가운데 어느 프로그램에 연결할지를 알려 줍니다. 우리 서버 프로그램은 8080번에서 기다리고 있습니다.', '');
    } else {
      st.rows.push(['포트', '(적지 않음) 80', 'http의 기본 포트를 씀']);
      push('URL에 콜론(:)이 없어 포트가 적혀 있지 않습니다. 이때 클라이언트는 스킴의 기본 포트를 씁니다. http의 기본 포트는 80이라서 80번으로 읽습니다. 우리 서버 프로그램이 기다리는 번호는 8080번이므로 같지 않습니다.', 'bad');
    }
    at('pa');
    if (f.p) {
      st.rows.push(['경로', f.p, '그 프로그램에게 무엇을 달라는지']);
      push('그다음 /부터 ' + (c.query ? '?의 앞' : '글의 끝') + '까지가 경로이고, 여기서는 "' + f.p + '"입니다. 경로는 연결한 프로그램에게 무엇을 달라는지를 말합니다.', '');
    } else {
      st.rows.push(['경로', '(적지 않음) /', '비어 있으면 /를 보냄']);
      push('호스트와 포트 뒤에 /가 없어서 경로가 비어 있습니다. 클라이언트는 경로가 비어 있으면 /를 경로로 보냅니다. 그래서 경로는 "/"로 읽힙니다.', '');
    }
    at('qu');
    if (c.query) {
      st.rows.push(['쿼리', 'name=kim', '덧붙여 보내는 값']);
      push('?의 뒤가 쿼리이고, 여기서는 "name=kim"입니다. 이름=값 꼴로, 경로에 덧붙여 보내는 값입니다.', '');
    } else {
      st.rows.push(['쿼리', '(없음)', '덧붙이는 값이 없음']);
      push('URL에 ?가 없어 쿼리는 없습니다. 쿼리는 덧붙이는 값이어서, 없어도 나머지 부분은 그대로 읽힙니다.', '');
    }
    st.hl = ['ho', 'po']; st.cn = f.port ? 'wait' : 'bad'; st.cnText = 'localhost의 ' + f.connect.port + '번';
    st.out.push(['연결하는 곳', 'localhost의 ' + f.connect.port + '번' + (f.port ? '' : ' (기본 포트)')]);
    if (c.port) push('클라이언트가 호스트와 포트로 연결합니다. localhost 컴퓨터(클라이언트가 도는 그 컴퓨터 자신)의 8080번 포트에서 기다리는 서버 프로그램에 연결합니다. 스킴, 호스트, 포트는 이 연결에 쓰였습니다.', 'good');
    else push('클라이언트가 호스트와 포트로 연결하려 합니다. 연결하려는 곳은 localhost의 80번 포트입니다. 서버가 기다리는 8080번이 아니어서 이 연결은 우리 서버에 닿지 않습니다. (이 실습은 80번에 실제로 연결하지 않고, 클라이언트가 연결하려는 곳을 가로채 기록했습니다.) 그림에서 포트의 점선 상자와 점선 화살표는 URL에 포트를 적지 않아 기본값 80이 쓰였다는 뜻입니다.', 'bad');
    st.hl = ['pa', 'qu']; st.rq = 'ok'; st.rqText = f.line;
    st.out.push(['요청의 첫 줄', f.line + (c.port ? '' : ' (80번으로 보낼 요청)')], ['Host 헤더', f.hostLine]);
    push((c.port ? '연결되면' : '80번 포트에 서버가 있어 연결된다면') + ' 클라이언트가 요청의 첫 줄에 경로와 쿼리를 적어 보냅니다: "' + f.line + '". 스킴(http), 호스트(localhost), 포트' + (c.port ? '(8080)' : '(80)') + '는 첫 줄에 들어가지 않습니다. 호스트와 포트는 연결에 쓰였고, 요청의 Host 헤더에도 적혀 갑니다. 이 실험에서 서버는 Host 줄을 "' + f.hostLine + '" 그대로 받았습니다' + (c.port ? '.' : '(포트를 적지 않았으므로 번호가 없습니다).') + (f.p ? '' : ' 경로가 비어 있었으므로 첫 줄에는 /가 적혔습니다. 그림에서 경로의 점선 상자와 점선 화살표는 URL에 경로를 적지 않아 기본값 /가 쓰였다는 뜻입니다.'), 'good');
    if (!c.port) {
      st.res = '80번 포트에 서버가 없으면 연결할 수 없음'; st.hl = [];
      st.out.push(['응답', st.res]);
      push('80번 포트에 서버가 없으면 연결 자체가 되지 않아 요청도 응답도 없습니다. 우리 서버(8080번)는 이 요청을 받지 못합니다. 경로와 쿼리는 맞게 적혀 있어도, 연결하는 곳이 틀렸기 때문입니다.', 'bad');
      sum.push(':8080을 지우면 클라이언트는 http의 기본 포트인 80번으로 연결하려 합니다. 서버는 8080번에 있어서 이 요청은 서버에 닿지 않고, 80번에 서버가 없으면 연결할 수 없습니다.');
      sum.push('요청의 첫 줄은 "' + f.line + '" 그대로이고, 바뀐 것은 연결하는 곳뿐입니다. 포트를 적지 않는 것은 포트가 없는 것이 아니라 스킴의 기본 포트를 쓰겠다는 뜻입니다.');
      return { events: ev, summary: sum, f: f, row: ['localhost, 80번 (http의 기본 포트)', f.line + ' (80번으로 보낼 요청)', '80번 포트에 서버가 없으면 연결할 수 없음'] };
    }
    st.hl = ['pa', 'qu'];
    var answer = f.status + (f.body ? ' ' + f.body : '');
    st.res = answer; st.out.push(['응답', answer]);
    if (f.ok) push('서버가 첫 줄의 경로를 봅니다. /hello는 만들어 둔 주소라서 200 응답을 만듭니다. 본문의 이름은 쿼리에서 읽습니다. ' + (c.query ? 'name의 값이 kim이라 "' + f.body + '"입니다.' : '쿼리가 없어 name을 찾지 못하고, 이때 쓰도록 만들어 둔 "손님"으로 "' + f.body + '"이 됩니다.') + ' 이 서버 코드는 화면에 보이지 않지만, 그렇게 답하도록 만들어 두었습니다.', 'good');
    else push('서버가 첫 줄의 경로를 봅니다. "' + (f.p || '/') + '" 경로는 만들어 둔 주소가 아니라서 404 응답을 만듭니다.' + (c.query ? ' 쿼리 name=kim이 붙어 있어도 경로가 맞지 않으면 쓰이지 않습니다.' : ''), 'bad');
    push('클라이언트가 ' + (f.ok ? '200 응답을 받습니다. 본문은 "' + f.body + '"입니다.' : '404 응답을 받습니다.'), f.ok ? 'good' : 'bad');
    // 요약: 첫 줄은 물음의 답
    if (f.ok && c.query) {
      sum.push('URL은 정해진 기호로 나뉘는 부분들입니다. http는 스킴(어떤 규칙으로), localhost는 호스트(어느 컴퓨터), 8080은 포트(그 컴퓨터의 어느 프로그램), /hello는 경로(무엇을 달라는지), name=kim은 쿼리(덧붙이는 값)입니다.');
      sum.push('클라이언트는 호스트와 포트로 연결하고, 요청의 첫 줄에는 경로와 쿼리만 적어 보냅니다. 스킴, 호스트, 포트는 첫 줄에 들어가지 않습니다. 서버는 첫 줄의 경로와 쿼리를 보고 응답했습니다.');
    } else if (!c.query && f.ok) {
      sum.push('?name=kim을 지우면 쿼리 부분만 없어지고 나머지는 그대로 읽힙니다. 첫 줄이 "GET /hello HTTP/1.1"이 되어, 서버가 name을 찾지 못하고 "안녕하세요, 손님"으로 답했습니다.');
      sum.push('쿼리는 덧붙이는 값이어서 없어도 요청은 성립합니다. 서버 코드가 쿼리를 읽어 응답을 바꿨을 뿐입니다.');
    } else if (c.path === 'nothing') {
      sum.push('경로를 /nothing으로 바꾸면 첫 줄이 "' + f.line + '"이 되고, 서버에 없는 경로라서 404가 왔습니다. 연결에 쓰는 호스트와 포트는 그대로입니다.');
      sum.push('404는 연결과 요청이 제대로 이루어졌고 서버가 그 경로를 만들어 두지 않았다는 뜻입니다. 경로가 틀리면 쿼리가 맞아도 소용이 없습니다.');
    } else {
      sum.push('경로를 적지 않아도 클라이언트는 경로로 /를 보내서, 첫 줄이 "' + f.line + '"이 되었습니다. 서버는 /hello 주소만 만들어 두어 404로 답했습니다.');
      sum.push('경로를 적지 않는 것은 경로가 없는 것이 아니라 /를 달라는 것입니다. 연결에 쓰는 부분은 그대로입니다.');
    }
    return { events: ev, summary: sum, f: f, row: ['localhost, 8080번', f.line, answer] };
  },
  render: function (v, sim, t, H, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : null;
    if (!s) { H.text(v, '실행을 누르면 클라이언트가 URL을 왼쪽부터 기호로 나누는 것부터 시작합니다.'); return; }
    if (s.rows.length) H.table(v, ['나뉜 부분', '읽은 값', '무엇을 알려 주나'], s.rows.map(function (r) { return { cls: '', cells: [r[0], r[1], r[2]] }; }), 'URL의 부분');
    if (s.out.length) H.table(v, ['항목', '값'], s.out.map(function (r) { return { cls: '', cells: [r[0], r[0] === '응답' ? { v: r[1], cls: r[1].indexOf('200') === 0 ? 'good' : 'bad' } : r[1]] }; }), '연결과 요청');
  },
  // 그림: 맨 위에 받은 URL, 그 아래에 다섯 부분(스킴 / 호스트 / 포트 / 경로 / 쿼리)이 차례로 나뉘어 나타난다. 호스트·포트·스킴은 아래 왼쪽의 "연결하는 곳"으로, 경로·쿼리는 아래 오른쪽의 "요청의 첫 줄"로 화살표가 간다. 지운 부분은 점선 상자이고, 지운 포트·경로 대신 기본값(80, /)이 쓰일 때는 화살표도 점선이다. 맨 아래는 응답 칸이다.
  draw: function (P, sim, shown) {
    var f = sim.f, last = shown[shown.length - 1], s = last ? last.snap : null, i;
    var pos = { sc: [14, 96], ho: [120, 126], po: [256, 104], pa: [370, 112], qu: [492, 174] };
    var names = { sc: '스킴', ho: '호스트', po: '포트', pa: '경로', qu: '쿼리' };
    var ghostCls = f.kind === 'http' ? 'plain' : 'bad';
    // 부분마다 화면에 적을 값과 상자 종류
    var vals = {};
    if (f.kind === 'http') {
      vals.sc = ['http', ''];
      vals.ho = ['localhost', ''];
      vals.po = f.port ? ['8080', ''] : ['(없음) 80', 'ghost'];
      vals.pa = f.p ? [f.p, ''] : ['(없음) /', 'ghost'];
      vals.qu = f.q ? ['name=kim', ''] : ['(없음)', 'ghost'];
    } else if (f.kind === 'odd') {
      vals.sc = ['localhost', 'bad'];
      vals.ho = ['읽지 못함', 'ghost'];
      vals.po = ['읽지 못함', 'ghost'];
      vals.pa = [f.rest, 'bad'];
      vals.qu = f.q ? ['name=kim', ''] : ['(없음)', 'ghost'];
    } else {
      vals.sc = ['찾지 못함', 'bad'];
      vals.ho = ['읽지 못함', 'ghost'];
      vals.po = ['읽지 못함', 'ghost'];
      vals.pa = ['읽지 못함', 'ghost'];
      vals.qu = ['읽지 못함', 'ghost'];
    }
    P.size(680, 318);
    P.box('whole', 14, 8, 652, 46, { cls: s && s.rev.length ? 'plain' : 'hot', title: '클라이언트가 받은 URL', sub: f.text, mono: true });
    for (i = 0; i < 5; i++) {
      var id = ['sc', 'ho', 'po', 'pa', 'qu'][i];
      if (!s || s.rev.indexOf(id) < 0) continue;
      var on = s.hl.indexOf(id) >= 0, kind = vals[id][1], group = (id === 'pa' || id === 'qu') ? 'hot' : 'wait';
      var cls = kind === 'ghost' ? 'ghost' : kind === 'bad' ? 'bad' : group;
      P.box('p_' + id, pos[id][0], 68, pos[id][1], 58, { cls: cls + (on ? ' now' : ''), title: names[id], sub: vals[id][0], mono: true });
    }
    P.region('rc', 14, 148, 310, 102, '연결에 쓰는 것 (스킴, 호스트, 포트)');
    P.region('rq', 356, 148, 310, 102, '요청에 적어 보내는 것 (경로, 쿼리)');
    var cnShow = s && s.cn, rqShow = s && s.rq;
    P.box('cn', 24, 178, 290, 62, { cls: cnShow ? (s.cn === 'bad' ? 'bad' : 'wait now') : 'ghost', title: '연결하는 곳', sub: cnShow ? s.cnText : '아직' });
    P.box('rl', 366, 178, 290, 62, { cls: rqShow ? (s.rq === 'bad' ? 'bad' : 'hot now') : 'ghost', title: '요청의 첫 줄', sub: rqShow ? s.rqText : '아직', mono: true });
    if (cnShow && f.kind === 'http') {
      P.arrow('a_sc', 'p_sc:b', 'cn:t:0.1', {});
      P.arrow('a_ho', 'p_ho:b', 'cn:t:0.4', {});
      P.arrow('a_po', 'p_po:b', 'cn:t:0.75', { cls: f.port ? '' : 'dash' });
    }
    if (rqShow && s.rq === 'ok' && f.kind === 'http') {
      P.arrow('a_pa', 'p_pa:b', 'rl:t:0.3', { cls: f.p ? 'hot' : 'dash' });
      if (f.q) P.arrow('a_qu', 'p_qu:b', 'rl:t:0.75', { cls: 'hot' });
    }
    var res = s && s.res ? s.res : '아직';
    P.box('res', 14, 266, 652, 38, { cls: s && s.res ? (s.res.indexOf('200') === 0 ? 'good' : 'bad') : 'ghost', title: '응답', right: res });
  },
  assume: '서버는 Node.js 24.18.0의 http 모듈로 만든 것 하나로, GET /hello에 200과 본문 "안녕하세요, <name 값>"(name이 없으면 "안녕하세요, 손님")을, 그 밖의 경로에는 404를 돌려줍니다. 스물네 가지 조합을 모두 실행해 대조했습니다. URL을 부분으로 나눈 결과(스킴, 호스트, 포트, 경로, 쿼리)는 Node.js의 new URL(글자)이 낸 값입니다. 이 해석기는 브라우저와 같은 URL 표준(WHATWG URL)을 따릅니다. 요청은 Node.js의 http.request에 그 URL을 주어 보냈고, 서버가 받은 요청의 첫 줄과 Host 줄은 글자 그대로 기록했습니다. 화면의 8080은 예시입니다. 포트를 적은 조합은 비어 있는 포트에 서버를 띄우고 URL의 8080 자리에 그 번호를 넣어 localhost라는 이름으로 실제로 연결했고, 서버가 받은 Host 줄의 번호는 8080으로 바꿔 대조했습니다. 같은 URL 글자(8080 그대로)를 연결만 시험 서버로 돌려 보내, 클라이언트가 연결하려던 곳도 기록했습니다(8080번이었습니다). 포트를 생략한 조합은 80번에 실제로 연결하지 않았습니다. 연결을 가로채 클라이언트가 연결하려던 곳이 localhost의 80번이라는 것과, 그때 보내려던 요청의 첫 줄과 Host 줄("Host: localhost", 포트 번호 없음)만 기록했습니다. 그래서 응답 칸의 "80번 포트에 서버가 없으면 연결할 수 없음"은 검증 실행에서 80번을 확인한 것이 아니라 연결하려던 곳이 80번이라는 사실에서 나온 조건문이고, 검증 실행 때 80번 포트의 사정은 보지 않았습니다. 스킴을 지운 조합은 실제 결과를 따랐습니다. localhost:8080/hello처럼 콜론(:)이 있으면 new URL이 localhost를 스킴으로 읽고 호스트와 포트는 비워 둔 채 8080/hello를 경로로 읽었고, localhost/hello처럼 콜론(:)이 없으면 Invalid URL 오류(ERR_INVALID_URL)였습니다. 앞의 경우 http.request는 ERR_INVALID_PROTOCOL로, fetch는 unknown scheme으로 요청을 보내지 못했습니다(연결이 일어나지 않는 경우라 실제로 시도해 보았습니다). 검증 실행에서 localhost는 ::1과 127.0.0.1 두 주소로 풀렸고(::1이 먼저), 시험 서버는 127.0.0.1에서만 열었는데도 Node.js의 기본 설정(여러 주소를 차례로 시도)에서는 127.0.0.1로 연결되었습니다. 그 시도를 끈 설정에서는 ::1에서 연결이 거절되었습니다. 브라우저가 어떻게 하는지는 보지 않았습니다. 문서로 확인한 것은 RFC 3986의 3절(URI = scheme ":" hier-part [ "?" query ], scheme, authority, path, query의 구분), 3.1절(스킴), 3.2.3절(스킴이 기본 포트를 정할 수 있고 포트가 비면 생략), 3.3절(경로), 3.4절(쿼리는 첫 ?부터 #이나 끝까지), RFC 9110의 4.2.1절(http에서 포트가 비었거나 없으면 TCP 80번이 기본), 7.2절(Host는 대상 URI의 호스트와 포트를 알림), RFC 9112의 3.2.1절(origin-form은 경로와 쿼리만 요청 대상으로 보내고, 경로가 비면 /를 보내야 한다), WHATWG URL 표준의 4.4절(스킴을 찾지 못하고 기준 주소가 없으면 실패, 규칙 있는 스킴 뒤에 //가 없으면 나머지를 경로로 읽음, 기본 포트와 같은 포트는 비워 둠)입니다. 문서는 요약으로만 열려 원문 전체를 대조하지는 못했습니다. 브라우저의 주소창은 http://를 적지 않아도 알아서 붙여 주는 편의 기능이 있는데, 이 실습은 URL 자체의 규칙만 다뤘고 주소창의 동작은 실행해 확인하지 않았습니다. 이 실습의 클라이언트는 Node.js이고 실제 브라우저로는 실행하지 않았습니다. 프래그먼트(#)와 퍼센트 인코딩, 상대 URL 같은 세부 규칙은 "세부 동작 실습: URL의 구조"에서 다룹니다.',
});

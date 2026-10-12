Lab.register({
  id: 'redirect', nav: '리다이렉션', cat: 'HTTP', mode: 'step',
  title: '"다른 주소로 가라"는 응답을 받으면 다음 요청은 어떻게 나가나',
  intro: '서버는 요청을 직접 처리하는 대신 3xx 상태 코드와 Location 헤더로 "이 주소로 다시 요청하라"고 안내할 수 있습니다. 이것을 리다이렉션이라고 합니다. 301, 302, 303, 307, 308은 모두 같은 안내처럼 보이지만, 영구인지 임시인지와 다음 요청의 메서드가 유지되는지가 다릅니다.',
  terms: ['리다이렉션과 Location 헤더', 'PRG 패턴(Post/Redirect/Get)', 'HTTP 상태 코드', 'HTTP 메서드', '안전한 메서드와 멱등한 메서드'],
  controls: [
    { id: 'code', label: '서버가 응답하는 상태 코드', type: 'select', value: '302', options: [['301', '301 Moved Permanently'], ['302', '302 Found'], ['303', '303 See Other'], ['307', '307 Temporary Redirect'], ['308', '308 Permanent Redirect']] },
    { id: 'm', label: '클라이언트가 처음 보낸 요청', type: 'select', value: 'POST', options: [['GET', 'GET /order (본문 없음)'], ['POST', 'POST /order (본문: item=keyboard)'], ['PUT', 'PUT /order (본문: item=keyboard)']] },
    { id: 'dest', label: 'Location이 가리키는 주소', type: 'select', value: 'ok', options: [['ok', '/orders가 정상으로 응답한다'], ['loop', '/orders도 다시 /order를 가리킨다 (서로를 가리킴)']], hint: '설정 실수로 두 주소가 서로를 가리키면 리다이렉트가 끝나지 않습니다.' },
  ],
  presets: [
    { t: '처음 설정으로', q: 'POST /order로 item=keyboard 본문을 보냈는데 서버가 302 Found로 /orders를 가리키면 다음 요청은 어떻게 나가나', d: 'POST 요청에 302로 응답. 다음 요청은 GET으로 바뀌고 본문이 사라집니다.', v: { code: '302', m: 'POST', dest: 'ok' } },
    { t: '307이면 POST 그대로', q: '서버가 응답하는 상태 코드를 307 Temporary Redirect로 바꾸면', d: '메서드와 본문을 바꾸지 않고 새 주소로 다시 보냅니다.', v: { code: '307', m: 'POST', dest: 'ok' } },
    { t: '303: 결과는 GET으로 조회', q: '서버가 응답하는 상태 코드를 303 See Other로 바꾸면', d: '폼을 보낸 뒤 결과 화면으로 넘길 때 쓰는 방식입니다.', v: { code: '303', m: 'POST', dest: 'ok' } },
    { t: '301에 PUT을 보내면', q: '상태 코드를 301 Moved Permanently로, 처음 요청을 PUT /order로 바꾸면', d: 'GET으로 바뀌는 것은 POST뿐입니다. PUT은 그대로 갑니다.', v: { code: '301', m: 'PUT', dest: 'ok' } },
    { t: '영구 이동 308', q: '서버가 응답하는 상태 코드를 308 Permanent Redirect로 바꾸면', d: '301과 같은 영구 이동인데 메서드를 유지합니다.', v: { code: '308', m: 'POST', dest: 'ok' } },
    { t: '서로를 가리키는 리다이렉트', q: '처음 요청을 GET /order로 바꾸고 /orders도 다시 /order를 가리켜 서로를 가리키면', d: '끝이 없으므로 클라이언트가 정해 둔 횟수에서 스스로 멈춥니다.', v: { code: '302', m: 'GET', dest: 'loop' } },
  ],
  CODES: {
    '301': { name: 'Moved Permanently', kind: '영구 이동', rule: 'POST를 GET으로 바꿔도 됨 (허용)' },
    '302': { name: 'Found', kind: '임시 이동', rule: 'POST를 GET으로 바꿔도 됨 (허용)' },
    '303': { name: 'See Other', kind: '다른 주소를 GET으로 조회', rule: 'GET으로 조회함' },
    '307': { name: 'Temporary Redirect', kind: '임시 이동', rule: '메서드를 바꾸면 안 됨' },
    '308': { name: 'Permanent Redirect', kind: '영구 이동', rule: '메서드를 바꾸면 안 됨' },
  },
  code: function (c) {
    var K = this.CODES[c.code], loop = c.dest === 'loop';
    var srv = '// 서버 (Node.js)\nhttp.createServer((req, res) => {\n    if (req.url === \'/order\') {\n        res.writeHead(' + c.code + ', { Location: \'/orders\' });    // ' + c.code + ' ' + K.name + '\n        return res.end();                              // 본문 없이 안내만 한다\n    }\n' + (loop ? '    if (req.url === \'/orders\') {\n        res.writeHead(' + c.code + ', { Location: \'/order\' });     // 잘못된 설정: 다시 /order를 가리킨다\n        return res.end();\n    }\n' : '') + '    res.writeHead(200);\n    res.end(\'주문 목록\');\n});';
    var opt = c.m === 'GET' ? '' : ', {\n    method: \'' + c.m + '\',\n    body: \'item=keyboard\'\n}';
    var curl = c.m === 'GET' ? 'curl -L http://shop.example/order' : c.m === 'POST' ? 'curl -L -d \'item=keyboard\' http://shop.example/order' : 'curl -L -T body.txt http://shop.example/order';
    return srv + '\n\n// 클라이언트 1: fetch는 따로 지정하지 않으면 Location을 따라간다\nawait fetch(\'http://shop.example/order\'' + opt + ');\n\n// 클라이언트 2: curl은 -L을 붙여야 따라간다\n// ' + curl;
  },
  label: function (c) { return c.code + ' · ' + c.m + (c.dest === 'loop' ? ' · 서로를 가리킴' : ''); },
  columns: ['종류', '표준이 정한 메서드 처리', '두 번째 요청 (fetch, curl -L)', '서버에 도착한 요청', '끝난 모습'],
  // 두 번째 요청의 메서드와 본문: 303은 GET이 아닌 요청을 GET으로, 301과 302는 POST만 GET으로 바꾼다. 307과 308은 그대로 둔다.
  nextReq: function (c) {
    var hasBody = c.m !== 'GET', toGet = hasBody && (c.code === '303' || (c.m === 'POST' && (c.code === '301' || c.code === '302')));
    return { m: toGet ? 'GET' : c.m, body: hasBody && !toGet, toGet: toGet };
  },
  simulate: function (c) {
    var K = this.CODES[c.code], nx = this.nextReq(c), loop = c.dest === 'loop', hasBody = c.m !== 'GET', ev = [], sum = [];
    var st = { msgs: [], n: 0, done: '' };
    function push(s, k) { ev.push({ s: s, k: k, snap: JSON.parse(JSON.stringify(st)) }); }
    function msg(f, t, what, mean, cls) { st.msgs.push({ f: f, t: t, s: what, mean: mean, cls: cls || '' }); }
    var first = c.m + ' /order' + (hasBody ? ' + 본문' : ''), next = nx.m + ' /orders' + (nx.body ? ' + 본문' : ' (본문 없음)');
    var line = c.code + ' ' + K.name;
    st.n = 1; msg('c', 's', first, '첫 요청');
    push('클라이언트가 ' + first + ' 요청을 보냅니다. ' + (hasBody ? '본문에는 주문 내용(item=keyboard)이 들어 있습니다.' : '조회 요청이라 본문이 없습니다.'), '');
    msg('s', 'c', line + ', Location: /orders', K.kind);
    var kindWhy = { '영구 이동': '영구 이동입니다. 이 주소는 앞으로도 계속 /orders라는 뜻이라, 클라이언트는 새 주소를 기억해 두고 다음부터 그쪽으로 바로 요청해도 됩니다.', '임시 이동': '임시 이동입니다. 지금만 /orders로 가라는 뜻이라, 다음에도 원래 주소인 /order로 먼저 요청해야 합니다.', '다른 주소를 GET으로 조회': '주소가 옮겨졌다는 뜻이 아니라 "결과는 /orders에서 조회하라"는 뜻입니다.' }[K.kind];
    push('서버가 ' + line + '로 응답합니다. 응답의 Location 헤더에 다음에 요청할 주소 /orders가 적혀 있습니다. ' + c.code + ' 응답은 ' + kindWhy, '');
    var why;
    if (c.code === '307' || c.code === '308') why = '표준(RFC 9110)은 307과 308에서 메서드를 바꾸면 안 된다고 정했습니다. ' + (hasBody ? c.m + ' 메서드와 본문을 그대로 다시 보내기로 합니다.' : 'GET 그대로 보내기로 합니다.');
    else if (c.code === '303') why = '표준(RFC 9110)은 303을 받으면 Location의 주소를 GET으로 조회하도록 정했습니다. ' + (hasBody ? c.m + ' 메서드를 GET으로 바꾸고 본문은 보내지 않기로 합니다.' : '원래 GET이므로 달라지는 것이 없습니다.');
    else if (c.m === 'POST') why = '표준(RFC 9110)은 301과 302에서 POST를 GET으로 바꾸는 것을 허용했습니다. 의무는 아니지만 fetch와 curl은 실제로 GET으로 바꾸고 본문을 버립니다.';
    else if (c.m === 'PUT') why = '표준(RFC 9110)이 301과 302에서 바꿔도 된다고 한 것은 POST뿐입니다. fetch와 curl은 PUT 메서드와 본문을 그대로 다시 보내기로 합니다.';
    else why = 'GET은 바뀔 것이 없습니다. GET 그대로 보내기로 합니다.';
    msg('c', '', nx.toGet ? c.m + ' 대신 GET으로 바꿈' : c.m + ' 유지', '다음 요청을 정함', nx.toGet && c.code !== '303' ? 'bad' : '');
    push('클라이언트가 Location을 읽고 다음 요청을 만듭니다. ' + why, nx.toGet && c.code !== '303' ? 'bad' : '');
    st.n = 2; msg('c', 's', next, '두 번째 요청');
    push('클라이언트가 ' + next + ' 요청을 보냅니다. 사용자가 시킨 것이 아니라 클라이언트가 Location을 보고 스스로 보내는 두 번째 요청입니다.' + (nx.toGet ? ' 처음 요청의 본문은 이 요청에 실리지 않습니다.' : ''), '');
    var count, end;
    if (!loop) {
      st.done = '200 OK'; msg('s', 'c', '200 OK', '최종 응답', 'good');
      push('/orders의 서버가 200 OK로 응답합니다. ' + (nx.toGet ? '받은 것이 GET이므로 주문 목록을 돌려줍니다. 처음에 보낸 본문은 이 서버에 오지 않았습니다.' : nx.body ? c.m + ' 요청과 본문을 그대로 받아 처리합니다.' : '주문 목록을 돌려줍니다.') + ' 요청을 보낸 코드에는 이 마지막 응답만 전달됩니다.', nx.toGet && c.code !== '303' ? '' : 'good');
      count = '2번'; end = '200 OK';
    } else {
      var back = nx.m + ' /order' + (nx.body ? ' + 본문' : '');
      msg('s', 'c', line + ', Location: /order', '되돌려 보냄', 'bad');
      push('/orders의 서버도 같은 ' + c.code + ' 응답을 돌려주고, Location은 다시 /order를 가리킵니다. 두 주소가 서로를 가리키고 있습니다.', 'bad');
      st.n = 3; msg('c', 's', back, '세 번째 요청');
      push('클라이언트는 안내받은 대로 ' + back + ' 요청을 보냅니다. 처음 요청했던 그 주소입니다.', '');
      st.n = '계속 늘어남'; msg('*', '', '같은 응답과 요청이 계속 되풀이됩니다', '끝이 없음', 'bad');
      push('/order는 또 /orders를, /orders는 또 /order를 가리킵니다. 어느 쪽도 200으로 답하지 않으므로 이 왕복은 저절로 끝나지 않습니다.' + (nx.body ? ' 요청마다 본문도 다시 전송됩니다.' : ''), 'bad');
      st.n = 'fetch 21번, curl 51번'; st.done = '오류로 멈춤'; msg('c', '', '정해 둔 횟수에서 멈추고 오류를 냄', '클라이언트가 중단', 'bad');
      push('클라이언트가 스스로 멈춥니다. fetch는 20번 따라간 뒤 "redirect count exceeded" 오류를 내고, curl은 50번 따라간 뒤 "Maximum (50) redirects followed" 오류를 냅니다. 그때까지 서버에는 각각 21번, 51번의 요청이 도착했습니다.', 'bad');
      count = 'fetch 21번, curl 51번'; end = '오류로 멈춤 (fetch는 20번, curl은 50번 따라간 뒤)';
    }
    if (nx.toGet && c.code !== '303') sum.push('301과 302에서 POST가 GET으로 바뀌는 것은 표준이 "그래도 된다"고 허용한 동작인데, 브라우저를 비롯한 대부분의 클라이언트가 그렇게 합니다. 이때 본문이 사라집니다. POST를 그대로 새 주소로 넘기려면 307(임시)이나 308(영구)을 씁니다.');
    if (c.code === '303') sum.push(hasBody ? '303은 폼을 보낸 뒤 결과 화면으로 넘길 때 씁니다. 두 번째 요청이 GET이므로 사용자가 새로 고침을 눌러도 폼이 다시 전송되지 않습니다. 이 방식을 PRG(Post/Redirect/Get)라고 부릅니다.' : '303은 주로 POST 뒤에 "결과는 이 주소에서 GET으로 보라"고 안내할 때 씁니다. 처음부터 GET이었다면 302나 307과 결과가 같습니다.');
    if ((c.code === '307' || c.code === '308') && hasBody) sum.push('307과 308은 메서드와 본문을 바꾸지 않는다는 것을 보장하려고 뒤에 추가된 코드입니다. 307은 302의, 308은 301의 "메서드 유지" 판입니다.');
    if ((c.code === '301' || c.code === '302') && c.m === 'PUT') sum.push('301과 302에서 GET으로 바뀌는 것은 POST뿐입니다. PUT이나 DELETE는 메서드가 유지됩니다. 헷갈리지 않으려면 메서드를 유지해야 하는 경우에는 처음부터 307이나 308을 쓰는 편이 분명합니다.');
    if (c.m === 'GET') sum.push('GET 요청은 어떤 코드로 리다이렉트해도 GET으로 나갑니다. 다섯 코드의 메서드 차이는 POST처럼 본문이 있는 요청에서만 드러납니다. GET에서는 영구 이동(301, 308)인지 아닌지만 다릅니다.');
    if (K.kind === '영구 이동' && !loop) sum.push('영구 이동은 한번 내보내면 되돌리기 어렵습니다. 브라우저가 새 주소를 기억해, 다음부터는 옛 주소로 요청을 보내지 않고 곧바로 새 주소로 갈 수 있기 때문입니다. 확실하지 않을 때는 임시 이동부터 씁니다.');
    if (loop) sum.push('표준은 클라이언트가 끝없는 리다이렉트를 알아채고 멈춰야 한다고만 적었고 횟수는 정하지 않았습니다. 그래서 한도는 클라이언트마다 다릅니다(fetch 20번, curl 50번). 브라우저에서는 "리디렉션한 횟수가 너무 많습니다" 같은 오류 화면이 됩니다. 원인은 대부분 서로를 가리키는 두 규칙입니다.');
    return { events: ev, summary: sum, next: next, row: [K.kind, K.rule, next, count, end] };
  },
  render: function (v, sim, t, H, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : null, c = sim.c, CODES = this.CODES;
    if (!s) { H.text(v, '실행을 누르면 요청과 응답이 하나씩 오갑니다.'); return; }
    H.counters(v, [[s.n + (typeof s.n === 'number' ? '번' : ''), '서버에 도착한 요청']]);
    H.table(v, ['누가', '보낸 것', '뜻'], s.msgs.map(function (m) { return { cells: [m.f === '*' ? '양쪽' : m.f === 'c' ? (m.t ? '클라이언트 → 서버' : '클라이언트') : '서버 → 클라이언트', { v: m.s, cls: m.cls === 'bad' ? 'bad' : m.cls === 'good' ? 'good' : '' }, m.mean] }; }), '클라이언트와 서버 사이');
    H.table(v, ['코드', '종류', '표준이 정한 메서드 처리'], ['301', '302', '303', '307', '308'].map(function (k) { var X = CODES[k]; return { cells: [{ v: k + ' ' + X.name, cls: k === c.code ? 'hot' : '' }, X.kind, X.rule] }; }), '리다이렉션 상태 코드 다섯 가지');
  },
  // 그림: 클라이언트와 서버 사이의 순서 그림. 3xx 응답을 받은 클라이언트가 스스로 두 번째 요청을 보내는 것이 핵심이다.
  draw: function (P, sim, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : { msgs: [], n: 0, done: '' }, c = sim.c, K = this.CODES[c.code];
    var end = P.seq([['c', '클라이언트', 'wait'], ['s', '서버 (shop.example)', 'wait']], s.msgs.map(function (m) { return { f: m.f, t: m.t || undefined, s: m.s, cls: m.cls }; }), { keep: 8 });
    P.box('kind', 16, end + 14, 320, 36, { cls: s.msgs.length > 1 ? 'hot' : 'ghost', title: c.code + ' ' + K.name, right: K.kind });
    P.box('next', 344, end + 14, 320, 36, { cls: s.msgs.length > 3 ? (sim.next.indexOf('본문 없음') >= 0 && c.m !== 'GET' && c.code !== '303' ? 'bad' : 'good') : 'ghost', title: '두 번째 요청', right: s.msgs.length > 3 ? sim.next : '?' });
    P.size(680, end + 66);
    P.note('서버는 Location으로 주소만 알려 주고, 그 주소로 다시 요청하는 것은 클라이언트입니다. 그래서 두 번째 요청의 메서드와 본문은 클라이언트가 상태 코드를 보고 정합니다.');
  },
  assume: '서른 가지 조합(상태 코드 5 × 메서드 3 × 가리키는 곳 2)을 127.0.0.1에 띄운 시험 서버와 두 가지 클라이언트(Node.js 24의 fetch, curl 8.21의 -L 옵션)로 실행해, 두 번째 요청의 메서드와 본문, 서버에 도착한 요청 수, 끝난 모습이 모형과 같은 것을 확인했습니다. 두 클라이언트의 두 번째 요청은 모든 조합에서 같았고, 멈추는 횟수만 달랐습니다(fetch 20번, curl 50번). 이 횟수는 클라이언트마다 다르며 curl은 --max-redirs로 바꿀 수 있습니다. 브라우저의 한도와 오류 화면은 실행으로 확인하지 않았습니다. "종류"와 "표준이 정한 메서드 처리" 열은 실행 결과가 아니라 HTTP 표준(RFC 9110 15.4절)의 문구를 옮긴 것입니다. 301과 302에서 POST만 GET으로 바꾸고 303에서는 GET과 HEAD가 아닌 메서드를 모두 GET으로 바꾸는 규칙은 Fetch 표준(HTTP-redirect fetch)에 적혀 있습니다. 영구 이동을 브라우저가 기억한다는 설명은 표준이 301과 308 응답을 따로 지시가 없어도 저장할 수 있는 응답으로 정한 데 따른 것으로, 실행으로 확인하지 않았습니다. 리다이렉트를 따라갈지는 클라이언트가 정합니다. Node의 http 모듈, -L이 없는 curl, redirect: \'manual\'로 부른 fetch는 따라가지 않고 3xx 응답을 그대로 돌려주는 것을 같은 시험 서버에서 확인했습니다. curl의 PUT은 -T(파일 올리기)로 보냈습니다. curl에서 -X로 메서드를 직접 지정하면 리다이렉트 뒤에도 그 메서드가 그대로 쓰이므로 결과가 달라집니다.',
});

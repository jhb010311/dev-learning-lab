Lab.register({
  id: 'cors', nav: 'CORS', cat: 'HTTP', mode: 'step',
  title: 'Postman에서는 되는데 브라우저에서만 막히는 이유',
  intro: '브라우저는 웹 페이지의 스크립트가 다른 출처의 서버 응답을 읽는 것을 기본적으로 막습니다. 서버가 응답 헤더로 "이 출처는 허용한다"고 알려 줘야 풀립니다.',
  terms: ['CORS와 동일 출처 정책', 'Preflight 요청', 'HTTP 메서드', '쿠키'], ranks: ['websec', 'http', 'network'],
  controls: [
    { id: 'api', label: 'API 서버의 주소 (페이지는 https://shop.example)', type: 'select', value: 'cross', options: [['same', 'https://shop.example/api (같은 출처)'], ['cross', 'https://api.shop.example (다른 출처)']] },
    { id: 'req', label: '스크립트가 보내는 요청', type: 'select', value: 'json', options: [['simple', 'GET, 추가 헤더 없음'], ['json', 'POST, Content-Type: application/json'], ['auth', 'GET, Authorization 헤더 포함'], ['del', 'DELETE']] },
    { id: 'cred', label: '쿠키를 함께 보낸다 (credentials: include)', type: 'check', value: false, show: function (c) { return c.api === 'cross'; } },
    { id: 'srv', label: '서버의 CORS 설정', type: 'select', value: 'none', options: [['none', '설정 없음'], ['star', '모든 출처 허용 (*)'], ['exact', 'https://shop.example만 허용 + 쿠키 허용']], show: function (c) { return c.api === 'cross'; } },
  ],
  presets: [
    { t: '처음 설정으로', q: '다른 출처 https://api.shop.example에 JSON을 POST하는데 CORS 설정이 없으면 어떻게 되나', d: '다른 출처에 JSON을 POST. 서버 설정이 없어 사전 요청에서 막힙니다.', v: { api: 'cross', req: 'json', cred: false, srv: 'none' } },
    { t: '서버가 출처를 허용하면', q: '서버가 https://shop.example만 허용하고 쿠키도 허용하도록 CORS를 설정하면', d: '사전 요청이 통과하고 본 요청이 나갑니다.', v: { api: 'cross', req: 'json', cred: false, srv: 'exact' } },
    { t: '단순한 GET, 서버 설정 없음', q: '스크립트가 보내는 요청을 추가 헤더 없는 GET으로 바꾸면', d: '요청은 서버에 도착해 처리됩니다. 응답만 스크립트에 전달되지 않습니다.', v: { api: 'cross', req: 'simple', cred: false, srv: 'none' } },
    { t: '모든 출처 허용 + 쿠키', q: '추가 헤더 없는 GET 요청에 쿠키를 함께 보내는데 서버가 모든 출처를 허용하면', d: '*와 쿠키는 함께 쓸 수 없습니다.', v: { api: 'cross', req: 'simple', cred: true, srv: 'star' } },
    { t: '같은 출처라면', q: 'API 서버의 주소를 https://shop.example/api로 바꿔 같은 출처로 요청하면', d: 'CORS 검사 자체가 없습니다.', v: { api: 'same', req: 'json', cred: false, srv: 'none' } },
  ],
  code: function (c) {
    var url = c.api === 'same' ? '/api/orders' : 'https://api.shop.example/orders', opt = [];
    if (c.req === 'json') opt.push("method: 'POST'", "headers: { 'Content-Type': 'application/json' }", 'body: JSON.stringify(order)');
    if (c.req === 'auth') opt.push("headers: { Authorization: 'Bearer ' + token }");
    if (c.req === 'del') opt.push("method: 'DELETE'");
    if (c.api === 'cross' && c.cred) opt.push("credentials: 'include'");
    var js = '// https://shop.example 페이지의 스크립트\nfetch(\'' + url + '\'' + (opt.length ? ', {\n    ' + opt.join(',\n    ') + '\n}' : '') + ');';
    if (c.api === 'same') return js;
    var srv = c.srv === 'none' ? '// 서버: CORS 설정 없음' : '// 서버 (스프링)\n@Bean\nCorsConfigurationSource corsConfigurationSource() {\n    var cfg = new CorsConfiguration();\n    cfg.' + (c.srv === 'star' ? 'addAllowedOrigin("*");' : 'addAllowedOrigin("https://shop.example");\n    cfg.setAllowCredentials(true);') + '\n    cfg.addAllowedMethod("*");\n    cfg.addAllowedHeader("*");\n    ...\n}';
    return js + '\n\n' + srv;
  },
  label: function (c) { return (c.api === 'same' ? '같은 출처' : '다른 출처') + ' · ' + { simple: '단순 GET', json: 'JSON POST', auth: 'Authorization 헤더', del: 'DELETE' }[c.req] + (c.api === 'cross' ? (c.cred ? ' · 쿠키 포함' : '') + ' · 서버 ' + { none: '설정 없음', star: '* 허용', exact: '출처 지정' }[c.srv] : ''); },
  columns: ['사전 요청', '본 요청이 서버에 도착', '스크립트가 응답을 받음', '막힌 이유'],
  judge: function (c) {
    if (c.api === 'same') return { pre: false, reached: true, ok: true, why: '' };
    var pre = c.req !== 'simple', allow = c.srv === 'exact' || (c.srv === 'star' && !c.cred), why = c.srv === 'none' ? '응답에 Access-Control-Allow-Origin 헤더가 없음' : c.srv === 'star' && c.cred ? '쿠키를 보내는 요청에는 * 를 쓸 수 없음' : '';
    return { pre: pre, reached: pre ? allow : true, ok: allow, why: why };
  },
  simulate: function (c) {
    var j = this.judge(c), ev = [], rows = [], sum = [], M = { simple: 'GET', json: 'POST', auth: 'GET', del: 'DELETE' }[c.req];
    function push(s, k) { ev.push({ s: s, k: k, snap: { rows: rows.slice() } }); }
    function row(who, what, res, cls) { rows.push({ cells: [who, what, { v: res, cls: cls }] }); }
    if (c.api === 'same') {
      row('브라우저', M + ' /api/orders', '보냄', ''); push('페이지(https://shop.example)와 API의 출처가 같습니다. 출처는 프로토콜, 호스트, 포트의 조합입니다. 같은 출처끼리는 아무 제한이 없으므로 그대로 요청을 보냅니다.', '');
      row('서버', '요청 처리', '200 OK', 'good'); row('브라우저', '응답을 스크립트에 전달', '전달함', 'good'); push('서버가 응답하고 스크립트가 결과를 받습니다. CORS 헤더는 필요 없습니다.', 'good');
      sum.push('같은 출처에서는 CORS가 관여하지 않습니다. 프론트와 API를 같은 도메인 아래에 두거나(리버스 프록시) 개발 서버의 프록시 기능을 쓰면 CORS 문제가 생기지 않는 이유입니다.');
      return { events: ev, summary: sum, row: ['없음', '예', '예', '-'] };
    }
    push('페이지의 출처는 https://shop.example, API의 출처는 https://api.shop.example입니다. 호스트가 달라서 다른 출처입니다. 브라우저가 이 요청을 그냥 보내도 되는 종류인지 먼저 판단합니다.', '');
    if (j.pre) {
      var reason = c.req === 'json' ? 'Content-Type이 application/json이기 때문' : c.req === 'auth' ? 'Authorization 헤더가 붙었기 때문' : 'DELETE 메서드이기 때문';
      row('브라우저', 'OPTIONS /orders (사전 요청)', '보냄', 'hot'); push('단순 요청이 아닙니다(' + reason + '). 브라우저가 본 요청을 보내기 전에 OPTIONS 메서드로 "이런 요청을 보내도 되느냐"고 먼저 묻습니다. 스크립트가 시킨 것이 아니라 브라우저가 스스로 보내는 요청입니다.', '');
      if (j.ok) { row('서버', '사전 요청에 응답', 'Access-Control-Allow-Origin: ' + (c.srv === 'star' ? '*' : 'https://shop.example') + ' 외 허용 헤더', 'good'); push('서버가 허용하는 출처, 메서드, 헤더를 응답 헤더에 담아 돌려줍니다. 브라우저가 확인하고 본 요청을 보내도 된다고 판단합니다.', 'good'); }
      else { row('서버', '사전 요청에 응답', c.srv === 'none' ? '허용 헤더 없음' : 'Access-Control-Allow-Origin: *', 'bad'); row('브라우저', M + ' /orders (본 요청)', '보내지 않음', 'bad'); push('서버의 응답이 조건에 맞지 않습니다(' + j.why + '). 브라우저는 본 요청을 아예 보내지 않고, 스크립트에는 네트워크 오류로 알립니다. 서버의 주문 처리 코드는 실행되지 않았습니다.', 'bad'); }
    } else push('GET이고 특별한 헤더가 없는 단순 요청입니다. 사전 요청 없이 바로 보냅니다.', '');
    if (j.reached) {
      row('브라우저', M + ' /orders (본 요청)' + (c.cred ? ' + 쿠키' : ''), '보냄', ''); row('서버', '요청 처리', '200 OK' + (c.srv === 'none' ? ' (허용 헤더 없음)' : ''), j.ok ? 'good' : 'hot');
      push('본 요청이 서버에 도착하고, 서버는 평소처럼 처리해 응답합니다.' + (j.ok ? '' : ' 서버 쪽에서는 아무 문제 없이 처리가 끝났습니다.'), '');
      if (j.ok) { row('브라우저', '응답을 스크립트에 전달', '전달함', 'good'); push('응답에 이 출처를 허용하는 헤더가 있습니다. 브라우저가 응답을 스크립트에 넘겨줍니다.', 'good'); }
      else { row('브라우저', '응답을 스크립트에 전달', '차단', 'bad'); push('브라우저가 응답 헤더를 확인합니다. ' + j.why + '. 응답을 스크립트에 넘기지 않고 콘솔에 CORS 오류를 냅니다. 서버는 이미 요청을 처리한 뒤입니다.', 'bad'); }
    }
    if (!j.ok) sum.push('CORS는 서버가 아니라 브라우저가 지키는 규칙입니다. 그래서 Postman이나 curl, 서버끼리의 호출에서는 같은 요청이 문제없이 됩니다. 해결은 프론트가 아니라 API 서버가 허용 헤더를 내려 주는 것입니다.');
    if (!j.pre && !j.ok) sum.push('단순 요청은 사전 확인 없이 서버에 도착해 실행됩니다. 브라우저가 막는 것은 응답을 읽는 것뿐입니다. CORS는 서버를 보호하는 장치가 아니므로, 상태를 바꾸는 요청의 보호는 인증과 CSRF 대책으로 해야 합니다.');
    if (c.srv === 'star' && c.cred) sum.push('쿠키나 인증 정보를 실어 보내는 요청에는 Access-Control-Allow-Origin에 정확한 출처를 적고 Access-Control-Allow-Credentials: true를 함께 줘야 합니다.');
    if (j.ok && j.pre) sum.push('사전 요청은 매번 왕복이 한 번 더 생깁니다. 서버가 Access-Control-Max-Age를 주면 브라우저가 그 시간 동안 결과를 기억해 다시 묻지 않습니다.');
    if (!sum.length) sum.push('사전 요청 ' + (j.pre ? '있음' : '없음') + ', 본 요청은 서버에 ' + (j.reached ? '도착했고' : '도착하지 않았고') + ', 스크립트는 응답을 ' + (j.ok ? '받았습니다.' : '받지 못했습니다.'));
    return { events: ev, summary: sum, row: [j.pre ? '있음' : '없음', j.reached ? '예' : '아니오', j.ok ? '예' : '아니오', j.why || '-'] };
  },
  render: function (v, sim, t, H, shown) {
    var last = shown[shown.length - 1], rows = last ? last.snap.rows : [];
    if (rows.length) H.table(v, ['누가', '무엇을', '결과'], rows, '브라우저와 서버 사이에 오간 것'); else H.text(v, '아직 오간 것이 없습니다.');
  },
  // 그림: 브라우저와 다른 출처의 서버. 브라우저가 요청을 보내지 않거나 응답을 스크립트에 넘기지 않는 지점이 핵심.
  draw: function (P, sim, shown) {
    var last = shown[shown.length - 1], rows = last ? last.snap.rows : [];
    var msgs = rows.map(function (r) {
      var who = P.v(r.cells[0]), what = P.v(r.cells[1]), res = P.v(r.cells[2]), cls = P.c(r.cells[2]);
      if (who === '서버') return { f: 's', t: 'b', s: what + ': ' + res, cls: cls === 'hot' ? '' : cls };
      if (what.indexOf('스크립트에 전달') >= 0) return { f: 'b', s: '응답을 스크립트에 ' + (res === '차단' ? '넘기지 않음 (차단)' : '전달함'), cls: cls };
      if (res === '보내지 않음') return { f: 'b', s: what + ': 보내지 않음', cls: 'bad' };
      return { f: 'b', t: 's', s: what, cls: cls === 'hot' ? '' : cls };
    });
    var end = P.seq([['b', '브라우저', 'wait'], ['s', '다른 출처의 API 서버', 'wait']], msgs, { keep: 5 });
    P.size(680, end + 16);
    P.note('막는 쪽은 서버가 아니라 브라우저입니다. 서버는 요청을 받으면 평소처럼 처리하고, 브라우저가 응답의 허용 헤더를 보고 스크립트에 넘길지를 정합니다. 사전 요청에서 허용되지 않으면 본 요청은 아예 보내지 않습니다.');
  },
  assume: '서버가 출처를 허용하는 경우에는 메서드와 헤더도 모두 허용하도록 설정했다고 가정했습니다. 단순 요청의 조건(GET·HEAD·POST이고, 추가 헤더가 없으며, Content-Type이 폼 전송 형식이나 text/plain인 경우)과 사전 요청, 쿠키 포함 시의 규칙은 Fetch 표준과 MDN 문서의 설명을 따랐습니다. 다른 출처로 보내는 24가지 조합(요청 4종 × 쿠키 포함 여부 × 서버 설정 3종)을 로컬 시험 서버 두 개와 실제 브라우저(크로미움 기반)로 실행해, 사전 요청이 나갔는지, 본 요청이 서버에 도착했는지, 스크립트가 응답을 받았는지가 모형과 모두 일치하는 것을 확인했습니다.',
});

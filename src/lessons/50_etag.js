Lab.register({
  id: 'etag', nav: 'HTTP 캐시와 ETag', cat: 'HTTP', mode: 'step',
  title: '같은 파일을 또 받을 필요가 있을까',
  intro: '브라우저는 한 번 받은 응답을 보관해 두었다가 다시 씁니다. 서버가 응답 헤더로 "얼마 동안 그대로 써도 되는지"와 "내용의 버전 표시(ETag)"를 알려 주면, 브라우저는 요청을 아예 생략하거나 "바뀌었느냐"만 물어볼 수 있습니다.',
  terms: ['조건부 요청과 ETag', 'HTTP 상태 코드', '캐시', 'CDN'], ranks: ['http', 'cache', 'rest'],
  controls: [
    { id: 'cc', label: '서버가 준 캐시 지시', type: 'select', value: 'max', options: [['nostore', 'Cache-Control: no-store (저장 금지)'], ['max', 'Cache-Control: max-age=60 (60초 동안 그대로 사용)'], ['nocache', 'Cache-Control: no-cache (쓸 때마다 확인)']] },
    { id: 'when', label: '두 번째로 여는 시점', type: 'select', value: '120', options: [['30', '30초 뒤'], ['120', '120초 뒤']], show: function (c) { return c.cc === 'max'; } },
    { id: 'chg', label: '그 사이 서버의 내용이 바뀌었다', type: 'check', value: false },
  ],
  presets: [
    { t: '처음 설정으로', q: 'Cache-Control: max-age=60으로 받은 파일을 120초 뒤에 다시 열면 서버와 무엇이 오가나', d: '유효 시간이 지난 뒤 다시 요청. 안 바뀌었으면 본문 없이 304만 옵니다.', v: { cc: 'max', when: '120', chg: false } },
    { t: '유효 시간 안에 다시 열면', q: '두 번째로 여는 시점을 30초 뒤로 바꾸면', d: '서버에 요청조차 보내지 않습니다.', v: { cc: 'max', when: '30', chg: false } },
    { t: '내용이 바뀌었다면', q: '그 사이 서버의 내용이 바뀐 채로 120초 뒤에 다시 열면', d: 'ETag가 달라 새 내용을 200으로 받습니다.', v: { cc: 'max', when: '120', chg: true } },
    { t: '유효 시간 안인데 내용이 바뀌면', q: '30초 뒤에 다시 여는데 그 사이 서버의 내용이 바뀌면', d: '브라우저는 모르고 옛 내용을 씁니다.', v: { cc: 'max', when: '30', chg: true } },
    { t: 'no-store', q: '서버가 준 캐시 지시를 Cache-Control: no-store로 바꾸면', d: '저장하지 않으므로 매번 전부 다시 받습니다.', v: { cc: 'nostore', when: '120', chg: false } },
    { t: 'no-cache', q: '서버가 준 캐시 지시를 Cache-Control: no-cache로 바꾸면', d: '저장은 하되 쓸 때마다 서버에 확인합니다.', v: { cc: 'nocache', when: '120', chg: false } },
  ],
  code: function (c) {
    var h = { nostore: 'CacheControl.noStore()', max: 'CacheControl.maxAge(60, TimeUnit.SECONDS)', nocache: 'CacheControl.noCache()' }[c.cc];
    return '@GetMapping("/products/{id}")\nResponseEntity<Product> get(@PathVariable long id) {\n    Product p = productService.find(id);\n    return ResponseEntity.ok()\n        .cacheControl(' + h + ')\n' + (c.cc === 'nostore' ? '' : '        .eTag("\\"v' + '" + p.getVersion() + "\\"")     // 내용의 버전 표시\n') + '        .body(p);\n}\n\n// 요청의 If-None-Match가 현재 ETag와 같으면\n// 스프링이 본문 없이 304 Not Modified로 응답한다';
  },
  label: function (c) { return { nostore: 'no-store', max: 'max-age=60 · ' + c.when + '초 뒤', nocache: 'no-cache' }[c.cc] + (c.chg ? ' · 내용 바뀜' : ' · 내용 그대로'); },
  columns: ['두 번째에 서버로 간 요청', '응답', '전송된 본문', '화면에 보인 내용'],
  simulate: function (c) {
    var ev = [], rows = [], sum = [], SIZE = 200, sent = SIZE, cache = '없음';
    function step(dir, what, res, s, k) { rows.push({ cells: [dir, what, { v: res, cls: k === 'bad' ? 'bad' : k === 'good' ? 'good' : '' }] }); ev.push({ s: s, k: k, snap: { rows: rows.slice(), cache: cache, sent: sent } }); }
    var hdr = { nostore: 'Cache-Control: no-store', max: 'Cache-Control: max-age=60, ETag: "v1"', nocache: 'Cache-Control: no-cache, ETag: "v1"' }[c.cc];
    step('브라우저 → 서버', 'GET /products/1', '(첫 요청)', '처음 여는 주소입니다. 브라우저에 저장된 것이 없으므로 서버에 요청합니다.', '');
    cache = c.cc === 'nostore' ? '없음 (저장 금지)' : '본문 200KB, ETag "v1"' + (c.cc === 'max' ? ', 60초 동안 유효' : ', 쓸 때마다 확인 필요');
    step('서버 → 브라우저', '200 OK + 본문 200KB', hdr, '서버가 본문 200KB와 함께 캐시 지시를 내려 줍니다.' + (c.cc === 'nostore' ? ' no-store이므로 브라우저는 이 응답을 저장하지 않습니다.' : ' 브라우저는 본문과 ETag(내용의 버전을 나타내는 표시)를 함께 보관합니다.'), '');
    var when = c.cc === 'max' ? +c.when : 120, req2, res2, body2, shown;
    if (c.chg) step('서버', '상품 정보가 수정됨', 'ETag가 "v2"로 바뀜', '그 사이 서버에서 상품 정보가 바뀌었습니다. 서버가 계산하는 ETag도 "v2"가 됩니다.', '');
    if (c.cc === 'nostore') { req2 = 'GET (조건 없음)'; res2 = '200 OK'; body2 = '200KB'; sent += SIZE; shown = c.chg ? '새 내용' : '같은 내용'; step('브라우저 → 서버', 'GET /products/1', '200 OK + 본문 200KB', when + '초 뒤 같은 주소를 다시 엽니다. 저장된 것이 없으므로 처음과 똑같이 요청하고 본문 전체를 다시 받습니다.', 'bad'); sum.push('no-store는 어디에도 저장하지 않습니다. 개인정보나 결제 화면처럼 남으면 안 되는 응답에 씁니다. 그 외에는 매번 전체를 다시 받으므로 낭비입니다.'); }
    else if (c.cc === 'max' && when < 60) { req2 = '없음'; res2 = '(요청 안 함)'; body2 = '0KB'; shown = c.chg ? '옛 내용 (바뀐 줄 모름)' : '같은 내용'; step('브라우저', '캐시에서 바로 사용', '서버에 요청하지 않음', when + '초 뒤 같은 주소를 다시 엽니다. 받은 지 60초가 지나지 않았으므로 브라우저는 저장해 둔 응답을 그대로 씁니다. 서버는 이 요청이 있었는지도 모릅니다.' + (c.chg ? ' 서버의 내용은 바뀌었지만 브라우저는 알 방법이 없어 옛 내용을 보여 줍니다.' : ''), c.chg ? 'bad' : 'good'); sum.push('유효 시간(max-age) 안에서는 네트워크를 전혀 쓰지 않아 가장 빠릅니다. 대신 그동안은 서버에서 내용을 바꿔도 반영되지 않습니다. 그래서 자주 바뀌는 데이터에는 짧게 주고, 바뀌지 않는 파일(이름에 해시가 붙은 JS, CSS)에는 아주 길게 줍니다.'); }
    else {
      step('브라우저 → 서버', 'GET /products/1 + If-None-Match: "v1"', '(조건부 요청)', when + '초 뒤 같은 주소를 다시 엽니다. ' + (c.cc === 'max' ? '유효 시간 60초가 지났습니다.' : 'no-cache는 쓰기 전에 반드시 서버에 확인하라는 뜻입니다.') + ' 브라우저는 저장해 둔 것을 버리지 않고, "내가 가진 것은 v1인데 아직 그대로인가?"라고 묻습니다.', '');
      req2 = 'GET + If-None-Match';
      if (c.chg) { res2 = '200 OK'; body2 = '200KB'; sent += SIZE; shown = '새 내용'; cache = '본문 200KB, ETag "v2"'; step('서버 → 브라우저', '200 OK + 본문 200KB', 'ETag: "v2"', '서버의 현재 ETag는 "v2"입니다. 브라우저가 보낸 "v1"과 다르므로 새 본문 전체와 새 ETag를 보냅니다. 브라우저는 저장해 둔 것을 교체합니다.', ''); }
      else { res2 = '304 Not Modified'; body2 = '0KB'; shown = '같은 내용'; step('서버 → 브라우저', '304 Not Modified (본문 없음)', 'ETag: "v1"', '서버의 현재 ETag도 "v1"입니다. 바뀐 것이 없으므로 본문 없이 304만 응답합니다. 브라우저는 저장해 둔 본문을 그대로 쓰고 유효 시간을 다시 시작합니다. 200KB를 다시 보내지 않았습니다.', 'good'); }
      sum.push(c.chg ? '내용이 바뀌었으므로 새 본문을 받았습니다. ETag 덕분에 "바뀌었을 때만" 전체를 받습니다.' : '304 응답은 본문이 없어 전송량이 거의 없습니다. 다만 요청과 응답의 왕복은 한 번 일어나고, 서버는 현재 ETag를 알기 위해 일을 해야 합니다.');
      if (c.cc === 'nocache') sum.push('no-cache는 이름과 달리 "저장하지 말라"가 아니라 "저장하되 쓸 때마다 서버에 확인하라"입니다. 저장 자체를 막는 것은 no-store입니다.');
    }
    return { events: ev, summary: sum, row: [req2, res2, body2, shown] };
  },
  render: function (v, sim, t, H, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : { rows: [], cache: '없음', sent: 0 };
    if (s.rows.length) H.table(v, ['방향', '보낸 것', '헤더 / 결과'], s.rows, '브라우저와 서버 사이'); else H.text(v, '실행을 누르면 시작합니다.');
  },
  // 그림: 브라우저와 서버 사이의 요청과 응답. 캐시에서 바로 꺼내 쓰면 서버로 가는 화살표가 생기지 않는다.
  draw: function (P, sim, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : { rows: [], cache: '', sent: 0 }, ids = { '브라우저': 'b', '서버': 's' };
    var msgs = s.rows.map(function (r) { var m = P.dir(P.v(r.cells[0]), ids); m.s = P.v(r.cells[1]); m.cls = P.c(r.cells[1]) || P.c(r.cells[2]); return m; });
    var end = P.seq([['b', '브라우저', 'wait'], ['s', '서버', 'wait']], msgs, { keep: 6 });
    P.box('cache', 16, end + 14, 440, 48, { cls: s.cache ? 'good' : 'ghost', title: '브라우저가 보관한 사본 (캐시)', sub: s.cache || '없음' });
    P.box('sent', 468, end + 14, 196, 48, { cls: 'plain', title: '받은 본문 합계', sub: s.sent + 'KB' });
    P.size(680, end + 78);
    P.note('브라우저 쪽 상자만 있고 화살표가 없는 단계는 서버에 묻지 않고 보관한 사본을 쓴 것입니다. 304 응답은 화살표는 오가지만 본문이 없어 전송량이 늘지 않습니다.');
  },
  assume: '본문 크기 200KB는 예시입니다. 캐시 지시와 조건부 요청의 의미는 HTTP 캐시 표준(RFC 9111)과 조건부 요청 정의(RFC 9110)를 따랐습니다. ETag 대신 최종 수정 시각(Last-Modified / If-Modified-Since)으로도 같은 확인을 할 수 있습니다. 사용자가 새로 고침을 누르면 브라우저가 유효 시간과 무관하게 확인 요청을 보내기도 합니다. 로컬 시험 서버와 실제 브라우저(크로미움 기반)로 확인했습니다(유효 시간은 2초로 줄여 시험). 유효 시간 안의 재요청은 서버에 도착하지 않았고, 지난 뒤에는 If-None-Match가 붙어 304가 돌아왔으며, 내용이 바뀐 경우에는 200과 새 본문이 왔습니다. no-store는 두 번 모두 전체를 받았고, no-cache는 바로 다시 요청해도 조건부 요청이 나갔습니다. 유효 시간 안에 서버 내용이 바뀐 경우 브라우저는 옛 내용을 그대로 썼습니다.',
});

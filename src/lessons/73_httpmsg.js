Lab.register({
  id: 'httpmsg', nav: 'HTTP 메시지와 상태 코드', cat: 'HTTP', mode: 'step',
  title: '요청과 응답은 이렇게 생긴 글자다',
  intro: '브라우저와 서버가 주고받는 HTTP 메시지는 정해진 모양의 글자입니다. 요청에는 "무엇을(주소) 어떻게(메서드)"가, 응답에는 "어떻게 됐는지(상태 코드)"가 첫 줄에 적힙니다. 상황을 바꿔 가며 요청과 응답의 원문, 그리고 상태 코드가 무엇을 뜻하는지 보세요.',
  terms: ['HTTP와 무상태(Stateless)', 'HTTP 메서드', 'HTTP 상태 코드', 'REST', 'URI와 URL'], ranks: ['http', 'rest'],
  controls: [
    { id: 'sc', label: '상황', type: 'select', value: 'get', options: [['get', '주문 1번 조회'], ['create', '새 주문 등록'], ['delete', '주문 1번 삭제'], ['bad', '필수 값을 빼고 주문 등록'], ['noauth', '로그인하지 않고 주문 조회'], ['forbid', '남의 주문을 조회'], ['missing', '없는 주문 999번 조회'], ['moved', '주소가 바뀐 옛 경로로 조회'], ['error', '서버 코드에서 예외 발생']] },
  ],
  presets: [
    { t: '처음 설정으로', d: '조회 성공. 200과 함께 본문이 옵니다.', v: { sc: 'get' } },
    { t: '새 주문 등록', d: '201과 함께 새로 만들어진 주소를 알려 줍니다.', v: { sc: 'create' } },
    { t: '잘못된 요청', d: '400. 보낸 쪽이 고쳐야 합니다.', v: { sc: 'bad' } },
    { t: '로그인 안 함 / 권한 없음', d: '401과 403의 차이를 번갈아 보세요.', v: { sc: 'noauth' } },
    { t: '없는 주문', d: '404. 주소가 가리키는 대상이 없습니다.', v: { sc: 'missing' } },
    { t: '서버 오류', d: '500. 보낸 쪽이 아니라 서버가 고쳐야 합니다.', v: { sc: 'error' } },
  ],
  CASES: {
    get: { req: ['GET /orders/1 HTTP/1.1', 'Host: shop.com', 'Authorization: Bearer eyJ…'], body: '', status: '200 OK', hdr: ['Content-Type: application/json'], rbody: '{"id":1,"item":"키보드","quantity":2}', who: '없음', next: '받은 본문을 사용' },
    create: { req: ['POST /orders HTTP/1.1', 'Host: shop.com', 'Authorization: Bearer eyJ…', 'Content-Type: application/json'], body: '{"item":"키보드","quantity":2}', status: '201 Created', hdr: ['Content-Type: application/json', 'Location: /orders/7'], rbody: '{"id":7}', who: '없음', next: 'Location에 적힌 주소가 새 주문' },
    delete: { req: ['DELETE /orders/1 HTTP/1.1', 'Host: shop.com', 'Authorization: Bearer eyJ…'], body: '', status: '204 No Content', hdr: [], rbody: '', who: '없음', next: '본문 없이 성공만 확인' },
    bad: { req: ['POST /orders HTTP/1.1', 'Host: shop.com', 'Authorization: Bearer eyJ…', 'Content-Type: application/json'], body: '{"item":"키보드"}', status: '400 Bad Request', hdr: ['Content-Type: application/json'], rbody: '{"message":"quantity는 필수입니다"}', who: '보낸 쪽 (클라이언트)', next: '요청을 고쳐서 다시 보내야 함. 그대로 다시 보내도 같은 결과' },
    noauth: { req: ['GET /orders/1 HTTP/1.1', 'Host: shop.com'], body: '', status: '401 Unauthorized', hdr: ['WWW-Authenticate: Bearer'], rbody: '', who: '보낸 쪽 (클라이언트)', next: '로그인해서 인증 정보를 붙여 다시 요청' },
    forbid: { req: ['GET /orders/55 HTTP/1.1', 'Host: shop.com', 'Authorization: Bearer eyJ…'], body: '', status: '403 Forbidden', hdr: ['Content-Type: application/json'], rbody: '{"message":"접근 권한이 없습니다"}', who: '보낸 쪽 (클라이언트)', next: '같은 계정으로 다시 로그인해도 같은 결과. 권한이 있어야 함' },
    missing: { req: ['GET /orders/999 HTTP/1.1', 'Host: shop.com', 'Authorization: Bearer eyJ…'], body: '', status: '404 Not Found', hdr: ['Content-Type: application/json'], rbody: '{"message":"주문을 찾을 수 없습니다"}', who: '보낸 쪽 (클라이언트)', next: '주소(주문 번호)가 맞는지 확인' },
    moved: { req: ['GET /order-list HTTP/1.1', 'Host: shop.com'], body: '', status: '301 Moved Permanently', hdr: ['Location: /orders'], rbody: '', who: '없음', next: '브라우저가 Location의 주소로 자동으로 다시 요청' },
    error: { req: ['GET /orders/1 HTTP/1.1', 'Host: shop.com', 'Authorization: Bearer eyJ…'], body: '', status: '500 Internal Server Error', hdr: ['Content-Type: application/json'], rbody: '{"message":"서버 오류가 발생했습니다"}', who: '서버', next: '요청에는 잘못이 없음. 서버가 고쳐야 하며 잠시 뒤 재시도는 가능' },
  },
  code: function (c) {
    return { get: '@GetMapping("/orders/{id}")\nOrderDto get(@PathVariable long id) {\n    return orderService.find(id);                 // 200 OK + JSON 본문\n}', create: '@PostMapping("/orders")\nResponseEntity<OrderDto> create(@RequestBody @Valid OrderRequest req) {\n    OrderDto saved = orderService.create(req);\n    return ResponseEntity.created(URI.create("/orders/" + saved.id()))   // 201 + Location\n                         .body(saved);\n}', delete: '@DeleteMapping("/orders/{id}")\n@ResponseStatus(HttpStatus.NO_CONTENT)            // 204, 본문 없음\nvoid delete(@PathVariable long id) {\n    orderService.delete(id);\n}', bad: '@PostMapping("/orders")\nResponseEntity<OrderDto> create(@RequestBody @Valid OrderRequest req) { ... }\n\nrecord OrderRequest(@NotBlank String item, @NotNull Integer quantity) { }\n// 검증에 실패하면 컨트롤러 본문은 실행되지 않고 400', noauth: '// 스프링 시큐리티: 인증 정보가 없는 요청\nhttp.authorizeHttpRequests(a -> a.anyRequest().authenticated());\n// 컨트롤러에 닿기 전에 401', forbid: '@GetMapping("/orders/{id}")\nOrderDto get(@PathVariable long id, @AuthenticationPrincipal Member me) {\n    Order order = orderService.find(id);\n    if (!order.isOwnedBy(me)) throw new AccessDeniedException("남의 주문");   // 403\n    return OrderDto.of(order);\n}', missing: 'Order find(long id) {\n    return orderRepository.findById(id)\n        .orElseThrow(() -> new OrderNotFoundException(id));\n}\n\n@ExceptionHandler(OrderNotFoundException.class)\n@ResponseStatus(HttpStatus.NOT_FOUND)             // 404\nErrorResponse notFound(OrderNotFoundException e) { ... }', moved: '@GetMapping("/order-list")\nResponseEntity<Void> old() {\n    return ResponseEntity.status(HttpStatus.MOVED_PERMANENTLY)   // 301\n                         .location(URI.create("/orders")).build();\n}', error: '@GetMapping("/orders/{id}")\nOrderDto get(@PathVariable long id) {\n    return orderService.find(id);    // 안에서 NullPointerException 발생\n}\n// 처리하지 않은 예외는 500이 된다' }[c.sc];
  },
  label: function (c) { return { get: '조회', create: '등록', delete: '삭제', bad: '잘못된 입력', noauth: '로그인 안 함', forbid: '권한 없음', missing: '없는 주문', moved: '옮겨진 주소', error: '서버 예외' }[c.sc]; },
  columns: ['상태 코드', '분류', '고쳐야 하는 쪽', '받은 쪽이 할 일'],
  simulate: function (c) {
    var K = this.CASES[c.sc], ev = [], sum = [], S = { req: [], res: [], part: '' }, code = K.status.slice(0, 3), cls = code.charAt(0);
    var group = { '2': '2xx 성공', '3': '3xx 다른 곳으로 안내', '4': '4xx 요청 쪽의 문제', '5': '5xx 서버가 실패함' }[cls];
    function push(s, k, part) { S.part = part; ev.push({ s: s, k: k, snap: JSON.parse(JSON.stringify(S)) }); }
    S.req.push(['시작 줄', K.req[0]]); var p = K.req[0].split(' ');
    push('요청의 첫 줄(시작 줄)입니다. 메서드 ' + p[0] + ', 대상 경로 ' + p[1] + ', 프로토콜 버전 순서입니다. 메서드는 "무엇을 하려는지", 경로는 "무엇에 대해서인지"를 나타냅니다.', '', 'req');
    K.req.slice(1).forEach(function (h) { S.req.push(['헤더', h]); });
    push('그다음 줄들은 헤더입니다. "이름: 값" 형태로 요청에 대한 부가 정보를 싣습니다. Host는 어느 사이트로 가는 요청인지, ' + (K.req.join(' ').indexOf('Authorization') >= 0 ? 'Authorization은 누가 보내는지,' : '(이 요청에는 인증 정보가 없습니다)') + (K.body ? ' Content-Type은 본문이 어떤 형식인지 알려 줍니다.' : ''), '', 'req');
    S.req.push(['빈 줄', '']); if (K.body) S.req.push(['본문', K.body]);
    push('헤더가 끝났다는 표시로 빈 줄이 하나 들어갑니다. ' + (K.body ? '그 뒤가 본문입니다. 서버에 보낼 데이터가 들어갑니다.' : '이 요청은 보낼 데이터가 없어 본문이 없습니다.') + ' 서버는 이 요청 하나만 보고 처리할 수 있어야 합니다. 앞서 보낸 요청을 기억하지 않기 때문입니다(무상태).', '', 'req');
    S.res.push(['시작 줄', 'HTTP/1.1 ' + K.status]);
    push('서버의 응답입니다. 첫 줄에 상태 코드 ' + K.status + '가 있습니다. 세 자리 숫자의 첫 자리가 큰 분류입니다: ' + group + '.', cls === '2' || cls === '3' ? 'good' : 'bad', 'res');
    K.hdr.forEach(function (h) { S.res.push(['헤더', h]); }); S.res.push(['빈 줄', '']); if (K.rbody) S.res.push(['본문', K.rbody]);
    var why = { get: '요청한 주문을 찾아 본문에 담아 돌려줍니다.', create: '새 주문이 만들어졌습니다. Location 헤더가 새로 생긴 주문의 주소를 알려 줍니다. 200이 아니라 201을 쓰는 것은 "새로 생겼다"는 사실을 전하기 위해서입니다.', delete: '삭제에 성공했고 돌려줄 내용이 없습니다. 그래서 본문이 없는 204입니다.', bad: '필수 값 quantity가 빠졌습니다. 요청 자체가 규칙에 맞지 않으므로 400입니다. 서버는 일을 시작하지도 않았습니다.', noauth: '누가 보낸 요청인지 알 수 없습니다. "먼저 인증하라"는 뜻의 401입니다.', forbid: '누구인지는 확인됐지만 이 주문을 볼 권한이 없습니다. 403입니다.', missing: '주소 형식은 맞지만 그 번호의 주문이 없습니다. 404입니다.', moved: '이 주소는 영구히 /orders로 옮겨졌습니다. 브라우저는 Location 헤더의 주소로 자동으로 다시 요청합니다.', error: '요청에는 문제가 없었는데 서버 코드에서 처리하지 못한 예외가 났습니다. 500입니다. 내부 오류 내용은 본문에 그대로 내보내지 않습니다.' }[c.sc];
    push(why, cls === '2' || cls === '3' ? 'good' : 'bad', 'res');
    sum.push('응답 ' + K.status + ' (' + group + '). 고쳐야 하는 쪽: ' + K.who + '. 받은 쪽이 할 일: ' + K.next + '.');
    sum.push('상태 코드의 첫 자리만 봐도 대응이 갈립니다. 4xx는 같은 요청을 다시 보내도 소용없고 요청을 고쳐야 합니다. 5xx는 서버 쪽 문제라서 잠시 뒤 다시 시도해 볼 수 있습니다. 모니터링에서도 4xx와 5xx를 따로 셉니다.');
    if (c.sc === 'noauth' || c.sc === 'forbid') sum.push('401은 "누구인지 모르겠다"(인증), 403은 "누구인지는 알지만 안 된다"(인가)입니다. 이름과 달리 401 Unauthorized가 인증 실패를 뜻합니다.');
    if (c.sc === 'error' || c.sc === 'bad') sum.push('모든 실패를 200으로 응답하고 본문에 오류를 적는 방식은 피합니다. 상태 코드를 보고 동작하는 브라우저, 프록시, 모니터링 도구가 성공으로 오해합니다.');
    sum.push('HTTP 메시지는 시작 줄, 헤더, 빈 줄, 본문의 네 부분입니다. 요청의 시작 줄에는 메서드와 경로가, 응답의 시작 줄에는 상태 코드가 들어갑니다.');
    return { events: ev, summary: sum, row: [K.status, group, K.who, K.next] };
  },
  render: function (v, sim, t, H, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : { req: [], res: [], part: '' };
    if (!s.req.length) { H.text(v, '실행을 누르면 요청부터 한 부분씩 보여 줍니다.'); return; }
    var tab = function (rows) { return rows.map(function (r) { return { cells: [r[0], { v: r[1] || '(빈 줄)', cls: r[0] === '시작 줄' ? 'hot' : '' }] }; }); };
    H.table(v, ['부분', '브라우저 → 서버로 가는 글자'], tab(s.req), 'HTTP 요청');
    if (s.res.length) H.table(v, ['부분', '서버 → 브라우저로 오는 글자'], tab(s.res), 'HTTP 응답');
    H.table(v, ['첫 자리', '뜻', '예'], [['2xx', '성공', '200 OK, 201 Created, 204 No Content'], ['3xx', '다른 곳으로 안내', '301 Moved Permanently, 304 Not Modified'], ['4xx', '요청 쪽의 문제 (보낸 쪽이 고쳐야 함)', '400, 401, 403, 404, 405'], ['5xx', '서버가 실패함', '500, 502, 503']].map(function (r) { var on = s.res.length && s.res[0][1].split(' ')[1].charAt(0) === r[0].charAt(0); return { cells: [{ v: r[0], cls: on ? 'hot' : '' }, r[1], r[2]] }; }), '상태 코드의 분류');
  },
  // 그림: 요청과 응답을 편지처럼 나란히 놓고, 시작 줄, 헤더, 빈 줄, 본문을 한 줄씩 쌓는다.
  draw: function (P, sim, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : { req: [], res: [], part: '' }, kind = { '시작 줄': 'hot', '헤더': 'plain', '빈 줄': 'ghost', '본문': 'good' };
    P.size(680, 300);
    P.region('rq', 16, 16, 320, 220, '요청: 브라우저 → 서버');
    P.region('rs', 344, 16, 320, 220, '응답: 서버 → 브라우저');
    function lines(pre, x, arr) { arr.forEach(function (ln, i) { P.box(pre + i, x + 6, 50 + i * 30, 308, 26, { cls: kind[ln[0]] || 'plain', sub: ln[1] || '(빈 줄: 헤더가 끝났다는 표시)', mono: !!ln[1] }); }); }
    lines('q', 16, s.req); lines('r', 344, s.res);
    if (!s.req.length) P.text('hint', 172, 130, '실행을 누르면 한 부분씩 쌓입니다', { cls: 'mut', anchor: 'middle' });
    if (s.res.length) P.arrow('go', 'rq:r', 'rs:l');
    var done = s.res.length > 0, code = done ? sim.row[0] : '';
    P.box('st', 16, 250, 648, 34, { cls: !done ? 'ghost' : /^[23]/.test(code) ? 'good' : 'bad', title: done ? '상태 코드 ' + code : '상태 코드', right: done ? sim.row[1] : '아직 응답 전' });
    P.note('노란 줄이 시작 줄, 흰 줄이 헤더, 점선이 빈 줄, 초록 줄이 본문입니다. 요청의 시작 줄에는 메서드와 경로가, 응답의 시작 줄에는 상태 코드가 들어갑니다.');
  },
  assume: '메시지의 구조(시작 줄, 헤더, 빈 줄, 본문)는 실제 HTTP 서버와 소켓으로 주고받은 원문에서 확인한 모양 그대로이며, 화면에서는 주요 헤더만 남겼습니다. 상황별 상태 코드는 HTTP 표준(RFC 9110)의 정의와 REST API에서 널리 쓰는 관례를 따랐습니다. 남의 자원에 대한 요청에 403 대신 404를 주어 자원의 존재를 숨기는 설계도 있습니다.',
});

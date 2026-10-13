Lab.register({
  id: 'msgconv', nav: 'REST API와 메시지 컨버터', cat: '스프링', mode: 'step',
  title: '컨트롤러가 돌려준 객체는 어디서 JSON이 되나',
  intro: '컨트롤러 메서드는 자바 객체를 받고 자바 객체를 돌려주는데, 네트워크로 오가는 것은 JSON 같은 글자입니다. 그 사이에서 글자를 객체로, 객체를 글자로 바꾸는 것이 메시지 컨버터입니다. 요청의 Content-Type과 Accept 헤더가 어느 컨버터를 쓸지 정하고, 맞는 컨버터가 없으면 415나 406이 됩니다.',
  terms: ['HttpMessageConverter', '@Controller와 @RestController', '콘텐츠 협상(Accept와 Content-Type)', 'ResponseEntity', 'ViewResolver'],
  controls: [
    { id: 'kind', label: '컨트롤러의 종류와 돌려주는 값', type: 'select', value: 'obj', options: [['obj', '@RestController, 객체를 돌려줌'], ['entity', '@RestController, ResponseEntity를 돌려줌'], ['str', '@RestController, 문자열을 돌려줌'], ['view', '@Controller, 문자열을 돌려줌']] },
    { id: 'req', label: '보내는 요청 (POST /orders)', type: 'select', value: 'xml', options: [['ok', '올바른 JSON 요청, Accept: application/json'], ['xml', '응답을 XML로 달라고 함 (Accept: application/xml)'], ['text', '본문 형식을 잘못 적음 (Content-Type: text/plain)'], ['broken', '깨진 JSON 본문 (중간에 끊김)']] },
  ],
  presets: [
    { t: '처음 설정으로', q: '@RestController가 객체를 돌려주는 POST /orders에 Accept: application/xml로 요청하면 어떻게 되나', d: '응답을 XML로 달라는 요청입니다. 406으로 거절되지만 컨트롤러는 이미 실행된 뒤입니다.', v: { kind: 'obj', req: 'xml' } },
    { t: '올바른 JSON 요청', q: 'Accept: application/json을 보내는 올바른 JSON 요청으로 바꾸면', d: 'JSON이 객체가 되고, 돌려준 객체가 다시 JSON이 됩니다.', v: { kind: 'obj', req: 'ok' } },
    { t: 'ResponseEntity로 201과 헤더 정하기', q: '올바른 JSON 요청에 @RestController가 ResponseEntity를 돌려주면', d: '상태 코드와 Location 헤더를 컨트롤러가 직접 정합니다.', v: { kind: 'entity', req: 'ok' } },
    { t: '@Controller가 문자열을 돌려주면', q: '올바른 JSON 요청에 @Controller가 문자열을 돌려주면', d: '본문이 아니라 화면 이름으로 해석됩니다.', v: { kind: 'view', req: 'ok' } },
    { t: '@RestController가 문자열을 돌려주면', q: '올바른 JSON 요청에 @RestController가 문자열을 돌려주면', d: '같은 문자열이 글자 그대로 본문이 됩니다. JSON으로 바뀌지 않습니다.', v: { kind: 'str', req: 'ok' } },
    { t: 'Content-Type을 잘못 적으면', q: 'Content-Type을 text/plain으로 잘못 적어 보내면', d: '본문 내용이 JSON이어도 415로 거절됩니다.', v: { kind: 'obj', req: 'text' } },
    { t: 'JSON이 깨져 있으면', q: 'JSON 본문이 중간에 끊긴 요청을 보내면', d: '컨버터가 읽다가 실패해 400이 됩니다.', v: { kind: 'obj', req: 'broken' } },
  ],
  // 요청의 헤더와 본문
  reqOf: function (c) { return { ct: c.req === 'text' ? 'text/plain' : 'application/json', accept: c.req === 'xml' ? 'application/xml' : 'application/json', body: c.req === 'broken' ? '{"item": "book", "qty":' : '{"item": "book", "qty": 2}' }; },
  code: function (c) {
    var q = this.reqOf(c), rest = c.kind !== 'view';
    var sent = '// 보내는 요청\n// POST /orders\n// Content-Type: ' + q.ct + '\n// Accept: ' + q.accept + '\n//\n// ' + q.body + '\n\n';
    var recs = 'record OrderRequest(String item, int qty) { }\n' + (c.kind === 'obj' || c.kind === 'entity' ? 'record OrderResponse(long id, String item, int qty) { }\n' : '') + '\n';
    var method = { obj: '    OrderResponse create(@RequestBody OrderRequest req) {\n        return new OrderResponse(1, req.item(), req.qty());\n    }', entity: '    ResponseEntity<OrderResponse> create(@RequestBody OrderRequest req) {\n        OrderResponse body = new OrderResponse(1, req.item(), req.qty());\n        return ResponseEntity.created(URI.create("/orders/1"))   // 상태 201, Location 헤더\n                .body(body);\n    }', str: '    String create(@RequestBody OrderRequest req) {\n        return "orders/done";              // 이 글자가 그대로 응답 본문이 된다\n    }', view: '    String create(@RequestBody OrderRequest req) {\n        return "orders/done";              // 화면(뷰)의 이름으로 해석된다\n    }' }[c.kind];
    return sent + recs + (rest ? '@RestController                        // @Controller + @ResponseBody' : '@Controller') + '\nclass OrderController {\n\n    @PostMapping("/orders")\n' + method + '\n}';
  },
  label: function (c) { return { obj: '@RestController · 객체', entity: '@RestController · ResponseEntity', str: '@RestController · 문자열', view: '@Controller · 문자열' }[c.kind] + ' · ' + { ok: '올바른 JSON 요청', xml: 'Accept: application/xml', text: 'Content-Type: text/plain', broken: '깨진 JSON' }[c.req]; },
  columns: ['응답', '컨트롤러 실행', '응답의 Content-Type', '응답 본문을 만든 것'],
  simulate: function (c) {
    var K = c.kind, q = this.reqOf(c), ev = [], sum = [];
    var st = { stage: 0, rd: '', ctrl: false, ret: '', wr: '', status: '', type: '', body: '', loc: '', fail: '' };
    function push(s, k) { ev.push({ s: s, k: k || '', snap: JSON.parse(JSON.stringify(st)) }); }
    var status = '', type = '-', maker = '없음 (오류 응답)', ex = '-', read = '-', wrote = '-', view = '-', loc = '-';
    function stop(code, exName, where) { status = code; ex = exName; st.status = code; st.fail = where; st.body = '(오류 응답)'; }
    var NOT_RUN = ' 컨트롤러 메서드는 실행되지 않습니다.', JSON_OUT = '{"id":1,"item":"book","qty":2}';
    var okStatus = K === 'entity' ? '201 Created' : '200 OK';

    st.stage = 1;
    push('요청이 도착합니다: POST /orders. Content-Type 헤더(' + q.ct + ')는 "내가 보내는 본문의 형식"을, Accept 헤더(' + q.accept + ')는 "내가 받고 싶은 응답의 형식"을 알려 줍니다.');

    st.stage = 2;
    if (c.req === 'text') {
      st.rd = '읽을 컨버터 없음'; stop('415 Unsupported Media Type', 'HttpMediaTypeNotSupportedException', 'rd');
      push('@RequestBody OrderRequest req: 컨트롤러를 부르기 전에 요청 본문을 OrderRequest 객체로 바꿔야 합니다. 스프링은 본문의 내용이 아니라 Content-Type 헤더를 보고 읽을 컨버터를 고릅니다. 본문은 JSON처럼 생겼지만 Content-Type이 text/plain이고, text/plain 본문을 OrderRequest 객체로 바꿀 줄 아는 컨버터는 없습니다. "이 형식은 읽지 못한다"는 뜻의 415로 응답합니다(HttpMediaTypeNotSupportedException).' + NOT_RUN, 'bad');
    } else {
      st.rd = 'Jackson이 맡음';
      push('@RequestBody OrderRequest req: 컨트롤러를 부르기 전에 요청 본문을 OrderRequest 객체로 바꿔야 합니다. 스프링은 Content-Type 헤더를 보고 읽을 컨버터를 고릅니다. application/json이므로 JSON 메시지 컨버터(Jackson)가 맡습니다.');
      st.stage = 3;
      if (c.req === 'broken') {
        st.rd = 'JSON이 깨져 있음'; stop('400 Bad Request', 'HttpMessageNotReadableException', 'rd');
        push('JSON 읽기: Jackson이 본문을 읽어 보니 "qty": 뒤에 값이 없고 중괄호도 닫히지 않은 채 끝나 있습니다. JSON 문법에 맞지 않아 객체를 만들 수 없으므로 400으로 응답합니다(HttpMessageNotReadableException).' + NOT_RUN, 'bad');
      } else {
        st.rd = 'JSON → OrderRequest'; read = 'JacksonJsonHttpMessageConverter';
        push('JSON 읽기: Jackson이 본문의 JSON에서 이름이 같은 값을 찾아 OrderRequest 객체(item은 "book", qty는 2)를 만듭니다. 글자가 자바 객체가 됐습니다.');

        st.stage = 4; st.ctrl = true; st.ret = { obj: 'OrderResponse 객체', entity: 'ResponseEntity (201)', str: '"orders/done"', view: '"orders/done"' }[K];
        push('create(req) 실행: 컨트롤러 메서드가 주문을 만들고 ' + { obj: 'OrderResponse 객체를', entity: 'ResponseEntity를', str: '문자열 "orders/done"을', view: '문자열 "orders/done"을' }[K] + ' 돌려줍니다.' + (K === 'entity' ? ' ResponseEntity에는 상태 코드 201, Location 헤더 /orders/1, 본문으로 쓸 OrderResponse 객체가 함께 담겨 있습니다.' : ''));

        st.stage = 5;
        if (K === 'view') {
          st.wr = '화면 이름으로 해석';
          push('@Controller: 메서드에 @ResponseBody가 없으므로, 돌려준 문자열을 응답 본문으로 쓰지 않습니다. "orders/done"이라는 이름의 화면(뷰)을 찾으라는 뜻으로 해석합니다. 응답을 쓸 때는 메시지 컨버터가 쓰이지 않습니다.');
          st.stage = 7; status = '200 OK'; st.status = status; type = 'text/html'; st.type = type; maker = '뷰 (화면)'; view = 'orders/done'; st.wr = '뷰가 HTML을 씀'; st.body = '(orders/done 화면의 HTML)';
          push('화면 그리기: ViewResolver가 이름이 "orders/done"인 화면을 찾고, 그 화면이 HTML을 만들어 응답 본문에 씁니다. Content-Type은 text/html이고 200으로 응답합니다. 요청의 Accept는 ' + q.accept + '이었지만, 화면을 돌려주는 길에서는 그것 때문에 거절되지 않았습니다.', 'good');
        } else {
          if (K === 'entity') { st.wr = '상태와 헤더를 옮김'; push('ResponseEntity 처리: 스프링이 ResponseEntity에 담긴 상태 코드 201과 Location 헤더를 응답에 옮겨 적습니다. 본문으로 담긴 OrderResponse 객체는 메시지 컨버터로 넘깁니다.'); }
          else { st.wr = '본문으로 쓰기로 함'; push('@RestController: 이 애너테이션은 @Controller에 @ResponseBody를 더한 것입니다. @ResponseBody가 있으면 돌려준 값을 화면 이름으로 보지 않고, 메시지 컨버터로 응답 본문에 직접 씁니다.'); }
          st.stage = 6;
          if (K === 'str') {
            st.wr = '문자열 컨버터가 맡음';
            push('응답 형식 고르기: 돌려준 값이 문자열이면 문자열 컨버터(StringHttpMessageConverter)가 맡습니다. 이 컨버터는 문자열을 "이미 완성된 본문"으로 보고, 어떤 형식 이름으로든 내보낼 수 있습니다. 그래서 Accept가 ' + q.accept + '이어도 거절하지 않습니다.');
            st.stage = 7; status = '200 OK'; st.status = status; type = q.accept; st.type = type; maker = '문자열 컨버터 (글자 그대로)'; wrote = 'StringHttpMessageConverter'; st.wr = '글자 그대로 씀'; st.body = 'orders/done';
            push('본문 쓰기: 문자열 컨버터가 orders/done이라는 글자를 따옴표도 붙이지 않고 그대로 본문에 씁니다. 응답의 Content-Type에는 Accept에서 고른 ' + q.accept + '이 적히지만, 본문은 ' + (c.req === 'xml' ? 'XML' : 'JSON') + '이 아닙니다. 200으로 응답합니다.');
          } else if (c.req === 'xml') {
            st.wr = 'XML로 만들 컨버터 없음'; stop('406 Not Acceptable', 'HttpMediaTypeNotAcceptableException', 'wr');
            push('응답 형식 고르기: 클라이언트는 Accept로 application/xml을 원합니다. 이 서버에는 OrderResponse 객체를 XML로 만들 줄 아는 컨버터가 없습니다. "원하는 형식으로는 줄 수 없다"는 뜻의 406으로 응답합니다(HttpMediaTypeNotAcceptableException). 컨트롤러 메서드는 이미 실행된 뒤이므로 주문은 만들어진 상태입니다.', 'bad');
          } else {
            st.wr = 'Jackson이 맡음';
            push('응답 형식 고르기: 클라이언트는 Accept로 application/json을 원합니다. OrderResponse 객체를 JSON으로 만들 줄 아는 컨버터(Jackson)가 있으므로 그것으로 정합니다.');
            st.stage = 7; status = okStatus; st.status = status; type = 'application/json'; st.type = type; maker = 'JSON 컨버터 (Jackson)'; wrote = 'JacksonJsonHttpMessageConverter'; st.wr = '객체 → JSON'; st.body = JSON_OUT;
            if (K === 'entity') { loc = '/orders/1'; st.loc = loc; }
            push('본문 쓰기: Jackson이 OrderResponse 객체의 값을 하나씩 꺼내 JSON 글자로 바꿔 응답 본문에 씁니다. 자바 객체가 다시 글자가 됐습니다. Content-Type은 application/json입니다. ' + (K === 'entity' ? 'ResponseEntity에 적은 대로 201과 Location 헤더(/orders/1)가 함께 나갑니다.' : '상태 코드를 따로 정하지 않았으므로 200으로 응답합니다.'), 'good');
          }
        }
      }
    }
    var ran = st.ctrl;
    if (st.fail === 'rd') sum.push(c.req === 'text' ? '415는 "요청 본문의 형식을 읽지 못한다"는 뜻입니다. 스프링은 본문을 들여다보고 형식을 짐작하지 않고 Content-Type 헤더만 봅니다. JSON을 보낼 때는 Content-Type을 application/json으로 적어야 합니다.' : '400은 "요청이 잘못됐다"는 뜻입니다. Content-Type은 맞지만 본문이 JSON 문법에 맞지 않으면 컨버터가 객체를 만들지 못합니다. 요청을 보낸 쪽이 고쳐야 하는 문제입니다.');
    if (st.fail === 'rd') sum.push('415와 400은 요청 본문을 읽는 단계에서 정해지므로 컨트롤러가 실행되기 전입니다. 406은 응답 본문을 쓰는 단계에서 정해지므로 컨트롤러가 실행된 뒤입니다.');
    if (st.fail === 'wr') sum.push('406은 "원하는 응답 형식(Accept)으로는 줄 수 없다"는 뜻입니다. 응답을 쓰는 단계에서 정해지므로, 응답은 실패인데 주문은 이미 만들어져 있습니다. @PostMapping에 produces = "application/json"을 적어 두면 Accept가 맞지 않는 요청을 컨트롤러를 고르는 단계에서 걸러 내, 컨트롤러가 실행되지 않습니다.');
    if (!st.fail && K === 'obj') sum.push('@RestController가 돌려준 객체는 메시지 컨버터가 JSON으로 바꿔 응답 본문에 씁니다. 요청 본문을 객체로 바꾼 것도 같은 컨버터입니다. 컨트롤러 안에는 JSON을 다루는 코드가 한 줄도 없습니다.');
    if (!st.fail && K === 'entity') sum.push('객체만 돌려주면 상태 코드는 200이고 헤더는 스프링이 정합니다. ResponseEntity로 감싸면 상태 코드와 헤더를 컨트롤러가 직접 정할 수 있습니다. 새로 만든 것을 알릴 때는 201과, 만든 것의 주소를 담은 Location 헤더를 함께 보내는 것이 관례입니다.');
    if (!st.fail && K === 'str') sum.push('문자열은 JSON으로 바뀌지 않고 글자 그대로 나갑니다. 그래서 Content-Type에 ' + type + '이 적혀 있어도 본문은 그 형식이 아닙니다. JSON을 돌려주려면 문자열이 아니라 객체(또는 Map)를 돌려줍니다.');
    if (!st.fail && K === 'view') sum.push('같은 문자열 "orders/done"을 돌려줘도 @RestController에서는 응답 본문이 되고, @Controller에서는 화면 이름이 됩니다. @Controller에서 값을 본문으로 보내려면 메서드에 @ResponseBody를 붙이거나 클래스를 @RestController로 바꿉니다.');
    if (!st.fail && K === 'view') sum.push('그 이름의 화면이 없으면 오류 응답이 됩니다(템플릿 엔진이 없는 이 대조 환경에서는 404였습니다). JSON API를 만들려다 @Controller를 붙였을 때 흔히 보는 증상입니다.');
    return { events: ev, summary: sum, ex: ex, read: read, wrote: wrote, view: view, loc: loc, row: [status, ran ? '실행됨' : '건너뜀', type, maker] };
  },
  render: function (v, sim, t, H, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : null, q = this.reqOf(sim.c);
    if (!s) { H.text(v, '실행을 누르면 요청 본문이 객체가 되고, 돌려준 값이 응답 본문이 되기까지를 한 단계씩 보여 줍니다.'); return; }
    H.table(v, ['요청의 자리', '내용', '뜻'], [
      { cells: ['Content-Type', q.ct, '보내는 본문의 형식'] },
      { cells: ['Accept', q.accept, '받고 싶은 응답의 형식'] },
      { cells: ['본문', q.body, ''] },
    ], '보낸 요청 (POST /orders)');
  },
  // 그림: 위에 요청, 가운데에 스프링의 세 자리(요청 본문 읽기, 컨트롤러, 응답 본문 쓰기), 아래에 응답. 변환이 일어나는 두 자리와 실패한 자리가 보인다.
  draw: function (P, sim, shown) {
    var c = sim.c, q = this.reqOf(c), last = shown[shown.length - 1], s = last ? last.snap : { stage: 0, rd: '', ctrl: false, ret: '', wr: '', status: '', type: '', body: '', loc: '', fail: '' };
    var rest = c.kind !== 'view';
    P.size(680, 336);
    P.box('req', 16, 16, 648, 62, { cls: s.stage ? 'wait' : 'plain', title: '요청: POST /orders', sub: ['Content-Type: ' + q.ct + ' · Accept: ' + q.accept, '본문: ' + q.body] });
    P.region('sp', 16, 92, 648, 138, '스프링 MVC');
    P.box('rd', 28, 124, 200, 92, { cls: s.fail === 'rd' ? 'bad' : s.stage === 2 || s.stage === 3 ? 'hot now' : s.stage > 3 ? 'good' : 'ghost', title: '요청 본문 읽기', sub: ['글자 → 객체', 'Content-Type을 보고 고름', s.rd || ' '] });
    P.box('ct', 240, 124, 200, 92, { cls: s.stage === 4 ? 'hot now' : s.ctrl ? 'good' : 'ghost', title: '컨트롤러 메서드', sub: [rest ? '@RestController' : '@Controller', s.ctrl ? '돌려준 값:' : s.fail === 'rd' ? '실행되지 않음' : ' ', s.ret || ' '] });
    P.box('wr', 452, 124, 200, 92, { cls: s.fail === 'wr' ? 'bad' : s.stage === 5 || s.stage === 6 ? 'hot now' : s.stage === 7 ? 'good' : 'ghost', title: rest ? '응답 본문 쓰기' : '화면 찾아 그리기', sub: [rest ? '객체 → 글자' : '문자열 = 화면 이름', rest ? 'Accept를 보고 고름' : 'ViewResolver가 찾음', s.wr || ' '] });
    if (s.stage >= 2) P.arrow('a1', 'req:b:0.18', 'rd:t', { label: '본문' });
    if (s.ctrl) P.arrow('a2', 'rd:r', 'ct:l', { cls: 'good' });
    if (s.stage >= 5) P.arrow('a3', 'ct:r', 'wr:l', { cls: s.fail === 'wr' ? 'bad' : 'good' });
    P.box('resp', 16, 244, 648, 62, { cls: !s.status ? 'ghost' : s.fail ? 'bad' : 'good', title: '응답: ' + (s.status || '처리 중'), sub: s.status ? ['Content-Type: ' + (s.type || '-') + (s.loc ? ' · Location: ' + s.loc : ''), '본문: ' + s.body] : [' ', ' '] });
    if (s.status) P.arrow('a4', (s.fail || 'wr') + ':b', s.fail === 'rd' ? 'resp:t:0.18' : 'resp:t:0.82', { cls: s.fail ? 'bad' : 'good' });
    P.note('메시지 컨버터가 일하는 자리는 두 곳입니다. 컨트롤러 앞에서 요청 본문을 객체로 바꾸고(Content-Type을 봄), 컨트롤러 뒤에서 돌려준 값을 응답 본문으로 바꿉니다(Accept를 봄).');
  },
  assume: '컨트롤러 네 가지와 요청 네 가지를 곱한 열여섯 조합을 모두 실제 스프링 부트 4.1.1 서버(스프링 프레임워크 7.0.9, 내장 톰캣 11, Jackson 3)에 HTTP 요청으로 보내, 상태 코드와 컨트롤러 실행 여부, 스프링이 던진 예외의 이름, 요청 본문을 읽은 컨버터와 응답 본문을 쓴 컨버터, 성공한 응답의 Content-Type과 Location 헤더가 화면과 일치하는 것을 확인했습니다. 오류 응답(400, 406, 415)의 본문과 Content-Type은 버전과 설정에 따라 달라서 결과로 삼지 않았습니다. 대조한 서버에는 XML을 만드는 라이브러리가 없습니다. jackson-dataformat-xml 같은 라이브러리를 넣으면 Accept: application/xml 요청에 XML로 응답하므로 406이 되지 않습니다. 컨버터의 클래스 이름(JacksonJsonHttpMessageConverter)은 스프링 7 기준이고, 그 전 버전에서는 이름이 다릅니다. 응답의 Content-Type은 형식 이름만 보였습니다(실제로는 뒤에 charset이 붙기도 합니다). @Controller가 돌려준 화면 이름은 템플릿 엔진 대신 같은 이름의 뷰 객체를 등록해 확인했습니다. 화면을 돌려주는 요청이 Accept와 관계없이 200이 된 것은 이 구성에서 본 결과이며, 뷰 설정에 따라 다를 수 있습니다. 화면에 없는 경우도 같은 서버에서 확인했습니다. 그 이름의 화면이 없으면 404였고(템플릿 엔진을 쓰면 다른 오류가 될 수 있으며 그것은 확인하지 않았습니다), @Controller의 메서드에 @ResponseBody를 붙이면 @RestController와 같은 결과였고, produces = "application/json"을 적은 메서드는 Accept: application/xml 요청에 컨트롤러를 실행하지 않고 406으로 응답했습니다. Accept 헤더 없이 보내면 객체는 JSON으로, 문자열은 text/plain으로 나갔습니다. ResponseEntity를 돌려주고 406이 된 조합에서는 응답에 Location 헤더가 남아 있었는데, 이것은 버전에 따라 다를 수 있어 화면에 넣지 않았습니다.',
});

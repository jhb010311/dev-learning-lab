Lab.register({
  id: 'binding', nav: '요청 매핑과 파라미터 바인딩', cat: '스프링', mode: 'step',
  title: '요청에 실어 보낸 값은 어떻게 메서드의 파라미터가 되나',
  intro: '요청 매핑은 주소와 HTTP 메서드를 보고 어느 컨트롤러 메서드가 요청을 받을지 정하는 일이고, 파라미터 바인딩은 요청에 실린 값을 그 메서드의 파라미터에 넣어 주는 일입니다. HTTP 요청은 값을 실을 수 있는 자리가 여러 곳입니다. 주소의 경로, ? 뒤의 쿼리 스트링, 그리고 본문입니다. 컨트롤러 메서드의 파라미터에 붙인 애노테이션은 "그 가운데 어느 자리에서 값을 꺼낼지"를 정합니다. 값을 실은 자리와 꺼내는 자리가 어긋나면 값이 들어오지 않습니다.',
  terms: ['@RequestParam과 @PathVariable', '@ModelAttribute와 @RequestBody', '쿼리 스트링과 폼 본문', 'ArgumentResolver', 'HTTP 상태 코드'],
  controls: [
    { id: 'how', label: '컨트롤러가 값을 받는 방법', type: 'select', value: 'param', options: [['param', '@RequestParam int qty'], ['opt', '@RequestParam(required = false) Integer qty'], ['def', '@RequestParam(defaultValue = "1") int qty'], ['path', '@PathVariable int qty'], ['model', '@ModelAttribute OrderForm form (객체로 묶어 받기)'], ['body', '@RequestBody OrderForm form (JSON 본문 받기)']] },
    { id: 'req', label: '보내는 요청', type: 'select', value: 'j3', hint: '같은 수량 3을 요청의 서로 다른 자리에 실어 보냅니다.', options: [['q3', 'GET /orders?qty=3 (쿼리 스트링)'], ['qabc', 'GET /orders?qty=abc (숫자 자리에 글자)'], ['none', 'GET /orders (값을 보내지 않음)'], ['p3', 'GET /orders/3 (경로)'], ['pabc', 'GET /orders/abc (경로에 글자)'], ['f3', 'POST /orders, 폼 본문 qty=3'], ['j3', 'POST /orders, JSON 본문 {"qty": 3}'], ['jabc', 'POST /orders, JSON 본문 {"qty": "abc"}']] },
  ],
  presets: [
    { t: '처음 설정으로', q: '@RequestParam int qty로 받는 컨트롤러에 POST /orders, JSON 본문 {"qty": 3} 요청을 보내면 어떻게 되나', d: 'JSON 본문으로 보낸 값을 @RequestParam으로 받으려 합니다. 400이 됩니다.', v: { how: 'param', req: 'j3' } },
    { t: '같은 요청을 @RequestBody로', q: '같은 요청을 @RequestBody OrderForm form으로 받으면', d: '본문을 읽는 방법으로 바꾸면 값이 들어옵니다.', v: { how: 'body', req: 'j3' } },
    { t: '값을 보내지 않으면', q: '값 없이 GET /orders를 보내면', d: '@RequestParam은 값이 반드시 있어야 하는 것이 기본입니다.', v: { how: 'param', req: 'none' } },
    { t: 'defaultValue가 있어도 글자는 400', q: '@RequestParam(defaultValue = "1") int qty로 받는데 GET /orders?qty=abc 요청을 보내면', d: '기본값은 값이 없을 때만 쓰입니다. 잘못된 값을 대신해 주지는 않습니다.', v: { how: 'def', req: 'qabc' } },
    { t: '경로에서 꺼내기', q: '@PathVariable int qty로 받고 GET /orders/3 요청을 보내면', d: '/orders/3의 3이 @PathVariable 파라미터가 됩니다.', v: { how: 'path', req: 'p3' } },
    { t: '객체로 받으면 값이 없어도 통과', q: '@ModelAttribute OrderForm form으로 받는데 GET /orders로 값을 보내지 않으면', d: '@ModelAttribute는 없는 값을 오류로 보지 않습니다. qty가 0으로 남습니다.', v: { how: 'model', req: 'none' } },
    { t: '폼 본문은 @RequestParam으로도', q: '@RequestParam int qty로 받는데 POST /orders로 폼 본문 qty=3을 보내면', d: '폼 형식의 본문은 쿼리 스트링과 같은 "요청 파라미터"입니다.', v: { how: 'param', req: 'f3' } },
  ],
  REQS: {
    q3: { m: 'GET', path: '/orders', query: 'qty=3', ct: '', body: '', where: 'query', val: '3' },
    qabc: { m: 'GET', path: '/orders', query: 'qty=abc', ct: '', body: '', where: 'query', val: 'abc' },
    none: { m: 'GET', path: '/orders', query: '', ct: '', body: '', where: '', val: '' },
    p3: { m: 'GET', path: '/orders/3', query: '', ct: '', body: '', where: 'path', val: '3' },
    pabc: { m: 'GET', path: '/orders/abc', query: '', ct: '', body: '', where: 'path', val: 'abc' },
    f3: { m: 'POST', path: '/orders', query: '', ct: 'application/x-www-form-urlencoded', body: 'qty=3', where: 'form', val: '3' },
    j3: { m: 'POST', path: '/orders', query: '', ct: 'application/json', body: '{"qty": 3}', where: 'json', val: '3' },
    jabc: { m: 'POST', path: '/orders', query: '', ct: 'application/json', body: '{"qty": "abc"}', where: 'json', val: 'abc' },
  },
  DECL: { param: '@RequestParam int qty', opt: '@RequestParam(required = false) Integer qty', def: '@RequestParam(defaultValue = "1") int qty', path: '@PathVariable int qty', model: '@ModelAttribute OrderForm form', body: '@RequestBody OrderForm form' },
  // 이 설정에서 컨트롤러 메서드에 붙는 매핑 애노테이션. 요청의 HTTP 메서드에 맞춰 Get과 Post를 고른다.
  mapping: function (c) { return '@' + (this.REQS[c.req].m === 'GET' ? 'Get' : 'Post') + 'Mapping("' + (c.how === 'path' ? '/orders/{qty}' : '/orders') + '")'; },
  code: function (c) {
    var R = this.REQS[c.req], obj = c.how === 'model' || c.how === 'body';
    var sent = '// 보내는 요청\n// ' + R.m + ' ' + R.path + (R.query ? '?' + R.query : '') + (R.ct ? '\n// Content-Type: ' + R.ct + '\n//\n// ' + R.body : '') + '\n\n';
    var form = obj ? 'class OrderForm {\n    private int qty;\n    public int getQty() { return qty; }\n    public void setQty(int qty) { this.qty = qty; }\n}\n\n' : '';
    return sent + form + '@RestController\nclass OrderController {\n\n    ' + this.mapping(c) + '\n    String order(' + this.DECL[c.how] + ') {\n        return "수량 " + ' + (obj ? 'form.getQty()' : 'qty') + ';\n    }\n}';
  },
  label: function (c) { var R = this.REQS[c.req]; return this.DECL[c.how] + ' · ' + R.m + ' ' + R.path + (R.query ? '?' + R.query : '') + (R.body ? ' 본문 ' + R.body : ''); },
  columns: ['응답', '컨트롤러 실행', '컨트롤러가 받은 qty', '거절한 이유'],
  simulate: function (c) {
    var R = this.REQS[c.req], how = c.how, decl = this.DECL[how], mapping = this.mapping(c), ev = [], sum = [];
    var isPath = how === 'path', isModel = how === 'model', isBody = how === 'body', annotEun = isModel ? '@ModelAttribute는' : '@RequestParam은', annotRo = isModel ? '@ModelAttribute로' : '@RequestParam으로';
    var st = { stage: 0, map: '', look: [], hit: '', raw: '', conv: '', val: '', status: '', fail: 0, ctrl: false };
    function push(s, k) { ev.push({ s: s, k: k || '', snap: JSON.parse(JSON.stringify(st)) }); }
    var status = '', got = '-', why = '-', ex = '-', raw = null, usedDefault = false;
    function stop(code, reason, exName) { status = code; why = reason; ex = exName; st.status = code; st.fail = st.stage; }
    var line = R.m + ' ' + R.path + (R.query ? '?' + R.query : '');
    var NOT_RUN = ' 컨트롤러 메서드는 실행되지 않습니다.';

    st.stage = 1;
    push('요청이 도착합니다: ' + line + '. ' + { query: 'qty는 쿼리 스트링(주소에서 ? 뒤)에 실려 있습니다.', path: 'qty로 쓸 값은 경로의 마지막 칸에 실려 있습니다.', form: 'qty는 본문에 폼 형식(이름=값)으로 실려 있습니다. Content-Type 헤더가 본문의 형식을 알려 줍니다.', json: 'qty는 본문에 JSON 형식으로 실려 있습니다. Content-Type 헤더가 본문의 형식을 알려 줍니다.', '': '이 요청에는 qty가 어디에도 실려 있지 않습니다.' }[R.where] + (R.where ? ' 어느 자리에 실리든 HTTP 요청 안에서는 모두 글자입니다.' : ''));

    st.stage = 2;
    if (isPath !== (R.where === 'path')) {
      st.map = '안 맞음'; stop('404 Not Found', '맞는 주소가 없음', 'NoResourceFoundException');
      push(mapping + ': 스프링이 요청의 메서드와 경로로 실행할 컨트롤러 메서드를 찾습니다(요청 매핑). ' + (isPath ? '요청의 경로(' + R.path + ')에는 {qty} 자리에 올 칸이 없어 /orders/{qty} 모양과 맞지 않습니다.' + (R.where ? ' 쿼리 스트링이나 본문에 실린 값은 경로 변수가 될 수 없습니다.' : '') : '요청의 경로(' + R.path + ')는 /orders와 다른 주소입니다.') + ' 맞는 컨트롤러 메서드가 없으므로 404로 응답합니다(스프링 7에서는 NoResourceFoundException).' + NOT_RUN, 'bad');
    } else {
      st.map = '맞음';
      push(mapping + ': 스프링이 요청의 메서드와 경로로 실행할 컨트롤러 메서드를 찾습니다(요청 매핑). ' + (isPath ? '요청의 경로(' + R.path + ')가 /orders/{qty} 모양과 맞습니다.' : '메서드가 ' + R.m + '이고 경로가 /orders이므로 order 메서드로 정해집니다.') + ' 이 단계에서는 쿼리 스트링과 본문을 보지 않습니다.');

      st.stage = 3; st.look = isBody ? ['ct', 'body'] : isPath ? ['path'] : R.where === 'form' ? ['query', 'body'] : ['query'];
      push(decl + ': 이제 요청에 실린 값을 메서드의 파라미터에 넣을 차례입니다(파라미터 바인딩). 파라미터에 붙은 애노테이션이 값을 꺼낼 자리를 정합니다. ' + (isBody ? '@RequestBody는 본문 전체를 메시지 컨버터에 넘겨 OrderForm 객체로 바꿉니다. 쿼리 스트링과 경로는 보지 않습니다.' : isPath ? '@PathVariable은 경로에서 {qty} 자리에 해당하는 칸을 꺼냅니다.' : isModel ? '@ModelAttribute는 먼저 new OrderForm()으로 빈 객체를 만들고, "요청 파라미터" 가운데 필드와 이름이 같은 것을 setter로 넣습니다. 요청 파라미터는 쿼리 스트링과 폼 형식 본문을 합친 것입니다.' : '@RequestParam은 "요청 파라미터"에서 이름이 qty인 값을 찾습니다. 요청 파라미터는 쿼리 스트링과 폼 형식 본문을 합친 것입니다.'));

      st.stage = 4;
      if (isBody) {
        if (!R.body) { st.raw = '없음'; stop('400 Bad Request', '본문이 없음', 'HttpMessageNotReadableException'); push('본문 읽기: 이 요청에는 본문이 없습니다.' + (R.query ? ' 쿼리 스트링에 qty가 있지만 @RequestBody는 그것을 보지 않습니다.' : '') + ' @RequestBody는 본문이 반드시 있어야 하는 것이 기본이므로 400으로 응답합니다(HttpMessageNotReadableException).' + NOT_RUN, 'bad'); }
        else if (R.where === 'form') { st.raw = R.body; stop('415 Unsupported Media Type', '읽을 수 없는 본문 형식', 'HttpMediaTypeNotSupportedException'); push('본문 읽기: Content-Type이 ' + R.ct + '입니다. 이 형식의 본문을 OrderForm 객체로 바꿀 줄 아는 메시지 컨버터가 없습니다. "이 형식은 읽지 못한다"는 뜻의 415로 응답합니다(HttpMediaTypeNotSupportedException).' + NOT_RUN, 'bad'); }
        else { st.hit = 'body'; st.raw = R.body; raw = R.val; push('본문 읽기: Content-Type이 application/json이므로 JSON을 읽을 줄 아는 메시지 컨버터(Jackson)가 본문을 맡습니다.'); }
      } else if (isPath) {
        raw = R.val; st.hit = 'path'; st.raw = '"' + raw + '"';
        push('값 꺼내기: 경로 ' + R.path + '에서 {qty} 자리에 해당하는 칸은 "' + raw + '"입니다. 이 글자를 꺼냅니다.');
      } else if (R.where === 'query' || R.where === 'form') {
        raw = R.val; st.hit = R.where === 'query' ? 'query' : 'body'; st.raw = '"' + raw + '"';
        push('값 꺼내기: ' + (R.where === 'query' ? '쿼리 스트링에 이름이 qty인 항목(qty=' + raw + ')이 있습니다.' : '본문이 폼 형식(Content-Type: application/x-www-form-urlencoded)이므로 톰캣이 본문의 항목(qty=' + raw + ')도 요청 파라미터로 읽어 둡니다.') + ' 꺼낸 글자는 "' + raw + '"입니다.');
      } else {
        var none = '값 꺼내기: ' + (R.where === 'json' ? 'JSON 본문은 요청 파라미터가 아닙니다. 본문 안에 qty가 적혀 있어도 ' + annotEun + ' 본문을 열어 보지 않습니다.' : '쿼리 스트링에도 본문에도 qty가 없습니다.');
        st.raw = '없음';
        if (how === 'param') { stop('400 Bad Request', '필수 값이 없음', 'MissingServletRequestParameterException'); push(none + ' @RequestParam은 값이 반드시 있어야 하는 것이 기본이므로 400으로 응답합니다(MissingServletRequestParameterException).' + NOT_RUN, 'bad'); }
        else if (how === 'opt') { got = 'null'; st.conv = '바꿀 값이 없음'; st.val = 'null'; push(none + ' required = false이므로 오류로 보지 않고 null을 넣기로 합니다. null을 담아야 하므로 타입을 int가 아니라 Integer로 선언했습니다.'); }
        else if (how === 'def') { raw = '1'; usedDefault = true; st.raw = '없음 → 기본값 "1"'; push(none + ' defaultValue가 있으므로 글자 "1"을 꺼낸 것으로 칩니다.'); }
        else { got = '0 (int의 기본값)'; st.conv = '바꿀 값이 없음'; st.val = '0'; push(none + ' 넣을 값이 없으므로 setQty를 부르지 않습니다. 새로 만든 OrderForm의 qty는 int의 기본값인 0 그대로입니다. @ModelAttribute는 이것을 오류로 보지 않습니다.'); }
      }

      if (!status && raw !== null) {
        st.stage = 5;
        if (raw === 'abc') {
          st.conv = '실패';
          if (isBody) { stop('400 Bad Request', '숫자로 바꿀 수 없음', 'HttpMessageNotReadableException'); push('JSON을 객체로 바꾸기: OrderForm의 qty 필드는 int인데 JSON의 qty 값은 글자 "abc"입니다. 숫자로 바꿀 수 없어 본문을 읽지 못한 것으로 처리되고, 400으로 응답합니다(HttpMessageNotReadableException).' + NOT_RUN, 'bad'); }
          else if (isModel) { stop('400 Bad Request', '숫자로 바꿀 수 없음', 'MethodArgumentNotValidException'); push('타입 변환: setQty가 받는 타입은 int인데 꺼낸 것은 글자 "abc"입니다. 숫자로 바꿀 수 없어 바인딩 오류로 기록됩니다. 메서드에 그 오류를 받아 줄 BindingResult 파라미터가 없으므로 400으로 응답합니다(스프링 7에서는 MethodArgumentNotValidException).' + NOT_RUN, 'bad'); }
          else { stop('400 Bad Request', '숫자로 바꿀 수 없음', 'MethodArgumentTypeMismatchException'); push('타입 변환: 파라미터의 타입은 ' + (how === 'opt' ? 'Integer' : 'int') + '인데 꺼낸 것은 글자 "abc"입니다. 숫자로 바꿀 수 없으므로 400으로 응답합니다(MethodArgumentTypeMismatchException).' + (how === 'def' ? ' defaultValue는 값이 없을 때만 쓰이고, 잘못된 값을 대신해 주지는 않습니다.' : how === 'opt' ? ' required = false는 값이 없는 경우만 허용합니다. 잘못된 값까지 허용하지는 않습니다.' : '') + NOT_RUN, 'bad'); }
        } else {
          st.conv = isBody ? 'JSON → OrderForm' : '"' + raw + '" → ' + raw; st.val = raw; got = raw + (usedDefault ? ' (기본값)' : '');
          push(isBody ? 'JSON을 객체로 바꾸기: Jackson이 OrderForm 객체를 만들고, JSON의 qty 값 ' + raw + '을 이름이 같은 qty 필드에 넣습니다.' : isModel ? '타입 변환: setQty가 받는 타입이 int이므로 글자 "' + raw + '"을 숫자로 바꿔 setQty(' + raw + ')을 호출합니다. OrderForm의 qty는 ' + raw + '이 됩니다.' : '타입 변환: 파라미터의 타입이 ' + (how === 'opt' ? 'Integer' : 'int') + '이므로 글자 "' + raw + '"을 숫자로 바꿉니다. qty는 ' + raw + '이 됩니다. 이 변환도 스프링이 해 줍니다.');
        }
      }
      if (!status) {
        st.stage = 6; st.ctrl = true; status = '200 OK'; st.status = status;
        push((isBody || isModel ? 'order(form) 호출: 준비된 OrderForm 객체를 넘겨 컨트롤러 메서드를 실행합니다. form.getQty()는 ' + st.val + '입니다.' : 'order(' + st.val + ') 호출: 준비된 값을 넘겨 컨트롤러 메서드를 실행합니다.') + ' 200으로 응답합니다.', got === 'null' || got.indexOf('0 ') === 0 ? '' : 'good');
      }
    }
    var ran = st.ctrl;
    if (st.fail === 2) sum.push(isPath ? '@PathVariable을 쓰는 메서드는 주소의 모양 자체가 /orders/{qty}입니다. 그 칸이 없는 요청은 값이 빠진 요청(400)이 아니라 다른 주소로 온 요청(404)이 됩니다.' : '/orders/3처럼 경로에 값을 실어 보내려면 컨트롤러의 주소도 /orders/{qty} 모양이어야 하고, 파라미터에는 @PathVariable을 붙여야 합니다.');
    else if (R.where === 'json' && !isBody) sum.push(how === 'param' ? 'JSON 본문으로 보낸 값은 @RequestParam으로 받을 수 없습니다. 값을 실은 자리(본문)와 꺼내는 자리(요청 파라미터)가 다르기 때문입니다. JSON 본문은 @RequestBody로 받습니다.' : 'JSON 본문에 qty를 보냈지만 ' + annotEun + ' 본문을 보지 않으므로 컨트롤러가 받은 값은 ' + got + '입니다. 오류 없이 200으로 끝나서, 값이 안 들어온 것을 알아채기 어렵습니다. JSON 본문은 @RequestBody로 받습니다.');
    else if (isBody && !R.body) sum.push('@RequestBody는 본문만 봅니다. 쿼리 스트링으로 보낸 값은 @RequestParam이나 @ModelAttribute로 받습니다.');
    else if (isBody && R.where === 'form') sum.push('폼 형식의 본문은 @RequestBody가 아니라 @RequestParam이나 @ModelAttribute로 받습니다. @RequestBody로 받으려면 보내는 쪽이 JSON으로 보내고 Content-Type을 application/json으로 적어야 합니다.');
    else if (st.fail === 5) sum.push('요청에 실린 값은 모두 글자이고, 스프링이 파라미터의 타입에 맞게 바꿔 줍니다. 바꿀 수 없는 글자가 오면 컨트롤러를 실행하지 않고 400으로 응답합니다. 요청을 보낸 쪽의 잘못이라는 뜻입니다.');
    else if (!R.where) sum.push({ param: '@RequestParam은 값이 없으면 400으로 거절합니다. 없어도 되는 값이라면 required = false나 defaultValue를 줍니다.', opt: 'required = false를 주면 값이 없을 때 null이 들어옵니다. 컨트롤러 안에서 null인 경우를 직접 처리해야 합니다.', def: 'defaultValue를 주면 값이 없을 때 그 값이 대신 들어옵니다. null을 걱정하지 않아도 되므로 타입을 int로 둘 수 있습니다.', model: '@ModelAttribute는 값이 없는 필드를 그대로 둡니다. 그래서 "보내지 않았다"와 "0을 보냈다"를 구분할 수 없습니다. 반드시 있어야 하는 값이라면 따로 검증해야 합니다.' }[how]);
    else if (R.where === 'form') sum.push('폼 형식(application/x-www-form-urlencoded)의 본문은 쿼리 스트링과 함께 "요청 파라미터"로 다뤄집니다. 그래서 본문에 실려 왔는데도 ' + annotRo + ' 받을 수 있습니다. 같은 본문이라도 JSON은 그렇지 않습니다.');
    else sum.push({ query: '쿼리 스트링의 값은 @RequestParam으로 하나씩 받거나, @ModelAttribute로 객체에 묶어 받습니다.', path: '경로의 한 칸을 값으로 쓰려면 주소에 {이름} 자리를 만들고 @PathVariable로 받습니다. 주문 번호처럼 "무엇을 가리키는지"를 나타내는 값에 주로 씁니다.', json: 'JSON 본문은 @RequestBody로 받습니다. 메시지 컨버터가 본문 전체를 객체 하나로 바꿔 줍니다.' }[R.where]);
    sum.push('애노테이션마다 보는 자리가 정해져 있습니다. @RequestParam과 @ModelAttribute는 요청 파라미터(쿼리 스트링과 폼 본문), @PathVariable은 경로, @RequestBody는 본문 전체입니다.');
    return { events: ev, summary: sum, ex: ex, row: [status, ran ? '실행됨' : '건너뜀', got, why] };
  },
  render: function (v, sim, t, H, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : null, R = this.REQS[sim.c.req];
    if (!s) { H.text(v, '실행을 누르면 요청 하나가 컨트롤러 메서드의 파라미터가 되기까지를 한 단계씩 보여 줍니다.'); return; }
    var looks = function (part) { return s.hit === part ? { v: '여기서 꺼냄', cls: 'good' } : s.look.indexOf(part) >= 0 ? { v: '보는 자리', cls: 'hot' } : s.stage >= 3 ? '보지 않음' : ''; };
    H.table(v, ['요청의 자리', '실린 내용', '이 방법이 보는가'], [
      { cells: ['메서드와 경로', R.m + ' ' + R.path, looks('path')] },
      { cls: R.query ? '' : 'gone', cells: ['쿼리 스트링', R.query || '없음', looks('query')] },
      { cls: R.ct ? '' : 'gone', cells: ['Content-Type 헤더', R.ct || '없음', looks('ct')] },
      { cls: R.body ? '' : 'gone', cells: ['본문', R.body || '없음', looks('body')] },
    ], '보낸 요청');
  },
  // 그림: 왼쪽에 HTTP 요청의 네 자리(경로, 쿼리 스트링, Content-Type, 본문), 오른쪽에 스프링이 파라미터를 채우는 순서. 값을 꺼내는 자리에서 화살표가 나온다.
  draw: function (P, sim, shown) {
    var c = sim.c, R = this.REQS[c.req], last = shown[shown.length - 1], s = last ? last.snap : { stage: 0, map: '', look: [], hit: '', raw: '', conv: '', val: '', status: '', fail: 0, ctrl: false };
    var obj = c.how === 'model' || c.how === 'body';
    var part = function (id, has) { return s.hit === id ? 'good' : s.look.indexOf(id) >= 0 ? (s.fail === 4 ? 'bad' : 'hot') : has ? 'wait' : 'ghost'; };
    P.size(680, 322);
    P.region('rq', 16, 16, 290, 236, 'HTTP 요청');
    P.box('p_path', 28, 52, 266, 30, { cls: s.fail === 2 ? 'bad' : part('path', true), title: '메서드와 경로', right: R.m + ' ' + R.path });
    P.box('p_query', 28, 96, 266, 30, { cls: part('query', R.query), title: '쿼리 스트링', right: R.query || '없음' });
    P.box('p_ct', 28, 140, 266, 46, { cls: part('ct', R.ct), title: 'Content-Type 헤더', sub: R.ct || '없음 (본문이 없는 요청)' });
    P.box('p_body', 28, 200, 266, 30, { cls: part('body', R.body), title: '본문', right: R.body || '없음' });
    P.region('sp', 330, 16, 334, 236, '스프링이 파라미터를 채우는 순서');
    P.box('map', 342, 48, 310, 30, { cls: s.fail === 2 ? 'bad' : s.map ? 'good' : 'ghost', title: this.mapping(c), right: s.map });
    P.box('src', 342, 84, 310, 46, { cls: s.stage < 3 ? 'ghost' : s.stage === 3 ? 'hot now' : 'plain', title: '값을 꺼낼 자리', sub: c.how === 'body' ? '본문 전체 (메시지 컨버터가 읽음)' : c.how === 'path' ? '경로의 {qty} 자리' : '요청 파라미터 (쿼리 스트링 + 폼 본문)' });
    P.box('raw', 342, 136, 310, 30, { cls: s.stage < 4 ? 'ghost' : s.fail === 4 ? 'bad' : s.hit ? 'good' : 'wait', title: c.how === 'body' ? '읽을 본문' : '꺼낸 글자', right: s.stage >= 4 ? s.raw : '' });
    P.box('cv', 342, 172, 310, 30, { cls: s.fail === 5 ? 'bad' : !s.conv ? 'ghost' : s.conv === '바꿀 값이 없음' ? 'plain' : 'good', title: c.how === 'body' ? 'JSON을 객체로 바꾸기' : '글자를 타입에 맞게 바꾸기', right: s.conv });
    P.box('pm', 342, 208, 310, 30, { cls: s.ctrl ? 'good now' : s.val ? 'wait' : 'ghost', title: obj ? 'OrderForm의 qty' : (c.how === 'opt' ? 'Integer' : 'int') + ' qty', right: s.val || (s.fail ? '-' : '?') });
    if (s.stage >= 3 && s.fail !== 2) {
      var from = c.how === 'path' ? 'p_path' : c.how === 'body' || R.where === 'form' ? 'p_body' : 'p_query', toRaw = s.stage >= 4;
      P.arrow('take', from + ':r', toRaw ? 'raw:l' : 'src:l', { cls: s.fail === 4 ? 'bad' : s.hit ? 'good' : toRaw ? 'mut' : 'hot', label: !toRaw ? '여기를 봄' : s.hit ? '꺼냄' : s.fail === 4 && c.how === 'body' && R.body ? '읽지 못함' : '값이 없음' });
    }
    P.box('resp', 16, 264, 648, 34, { cls: !s.status ? 'ghost' : s.ctrl ? 'good' : 'bad', title: '응답', right: s.status || '처리 중' });
    P.note('파란 칸은 요청에 값이 실린 자리, 노란 칸은 이 애노테이션이 보는 자리, 초록 칸은 실제로 값을 꺼낸 자리입니다.');
  },
  assume: '받는 방법 여섯 가지와 요청 여덟 가지를 곱한 마흔여덟 조합을 모두 실제 스프링 부트 4.1.1 서버(스프링 프레임워크 7.0.9, 내장 톰캣 11)에 HTTP 요청으로 보내, 상태 코드와 컨트롤러 실행 여부, 컨트롤러가 받은 값, 스프링이 던진 예외의 이름이 화면과 일치하는 것을 확인했습니다. 예외의 이름은 스프링 버전에 따라 다릅니다(맞는 주소가 없을 때의 NoResourceFoundException, @ModelAttribute 변환 실패의 MethodArgumentNotValidException은 이 버전 기준입니다). 오류 응답의 본문은 버전과 설정에 따라 달라서 결과로 삼지 않았습니다. 컨트롤러에 메서드가 하나, 파라미터가 하나인 경우로 단순화했고, 매핑 애노테이션은 요청의 HTTP 메서드에 맞춰 @GetMapping과 @PostMapping 가운데 맞는 쪽을 보였습니다(메서드가 맞지 않을 때의 405는 "서블릿" 실습에 있습니다). OrderForm은 기본 생성자와 setter가 있는 클래스입니다. record처럼 생성자로 값을 받는 객체는 값이 없을 때의 동작이 다를 수 있고, 그것은 확인하지 않았습니다. @RequestParam int qty처럼 이름을 따로 적지 않고 파라미터 이름으로 값을 찾는 것은 -parameters 옵션으로 컴파일했을 때의 동작이며, 대조도 그렇게 했습니다. 화면에 없는 경우 네 가지도 같은 서버에서 확인했습니다. ?qty=처럼 빈 값을 보내면 @RequestParam int는 400, required = false는 null, defaultValue는 기본값이 됩니다. required = false인데 타입을 int로 두고 값을 보내지 않으면 null을 담을 수 없어 500이 됩니다. @ModelAttribute 파라미터 바로 뒤에 BindingResult 파라미터를 두면 변환에 실패해도 컨트롤러가 실행됩니다. 본문이 {}이면 @RequestBody로 받은 qty는 0입니다. 값의 범위를 검사하는 검증(@Valid)은 이 실습에서 다루지 않고, 다음 실습인 검증에서 따로 봅니다.',
});

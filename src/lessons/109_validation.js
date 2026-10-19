Lab.register({
  id: 'validation', nav: '검증', cat: '스프링', mode: 'step',
  title: '필드에 @NotBlank를 붙였는데 왜 빈 값이 그대로 들어오나',
  intro: '입력값에는 "이름은 비어 있으면 안 된다" 같은 조건이 있습니다. Bean Validation은 이런 조건을 @NotBlank 같은 애너테이션으로 필드 위에 적어 두는 방법이고, 이렇게 적은 조건을 제약이라고 부릅니다. 그런데 제약은 적어 둔 것만으로는 아무 일도 하지 않습니다. 누군가 "이 객체를 검사하라"고 시켜야 하고, 스프링 MVC에서는 컨트롤러 파라미터에 붙인 @Valid가 그 신호입니다.',
  terms: ['Bean Validation과 @Valid', '@NotNull, @NotEmpty, @NotBlank', 'BindingResult', 'MethodArgumentNotValidException', 'HTTP 상태 코드'],
  controls: [
    { id: 'how', label: '컨트롤러가 값을 받는 방법', type: 'select', value: 'plain', options: [['plain', '@RequestBody ItemForm form (@Valid 없음)'], ['valid', '@Valid @RequestBody ItemForm form'], ['br', '@Valid @RequestBody ItemForm form, BindingResult errors'], ['param', '@RequestParam String name (제약을 파라미터에 직접 붙임)']] },
    { id: 'con', label: 'name에 붙인 제약', type: 'select', value: 'notblank', hint: '셋 다 "값이 있어야 한다"는 조건이지만, 어디까지를 "없다"로 보는지가 다릅니다.', options: [['notnull', '@NotNull'], ['notempty', '@NotEmpty'], ['notblank', '@NotBlank']] },
    { id: 'val', label: '요청에 실어 보내는 name', type: 'select', value: 'empty', options: [['none', '보내지 않음 (받는 쪽에서는 null)'], ['empty', '빈 문자열 ""'], ['blank', '빈칸 한 글자 " "'], ['pen', '"pen"']] },
  ],
  presets: [
    { t: '처음 설정으로', q: '@Valid 없이 @RequestBody ItemForm form으로 받는데 @NotBlank name을 빈 문자열로 보내면 어떻게 되나', d: '@NotBlank가 붙어 있는데도 빈 이름이 그대로 등록됩니다. 파라미터에 @Valid가 없기 때문입니다.', v: { how: 'plain', con: 'notblank', val: 'empty' } },
    { t: '@Valid를 붙이면', q: '컨트롤러 파라미터에 @Valid를 붙이면', d: '같은 요청이 컨트롤러에 닿기 전에 400으로 거절됩니다.', v: { how: 'valid', con: 'notblank', val: 'empty' } },
    { t: '@NotNull은 빈 문자열을 통과시킨다', q: '@Valid를 붙이고 name의 제약을 @NotNull로 바꾸면', d: '빈 문자열은 null이 아닙니다. 검증을 했는데도 빈 이름이 등록됩니다.', v: { how: 'valid', con: 'notnull', val: 'empty' } },
    { t: '빈칸 한 글자는 @NotEmpty도 통과', q: '@Valid를 붙이고 name의 제약을 @NotEmpty로 바꿔 빈칸 한 글자를 보내면', d: '빈칸도 한 글자로 셉니다. 빈칸뿐인 값까지 막는 것은 @NotBlank입니다.', v: { how: 'valid', con: 'notempty', val: 'blank' } },
    { t: 'BindingResult를 받으면', q: '@Valid @RequestBody ItemForm form에 더해 BindingResult errors도 받으면', d: '검증에 실패해도 예외가 나지 않고 컨트롤러가 실행됩니다.', v: { how: 'br', con: 'notblank', val: 'empty' } },
    { t: '파라미터에 직접 붙인 제약', q: '@RequestParam String name 파라미터에 @NotBlank를 직접 붙여 받고 빈 문자열을 보내면', d: '@Valid 없이도 검사됩니다. 실패하면 예외의 이름이 다릅니다.', v: { how: 'param', con: 'notblank', val: 'empty' } },
    { t: '@RequestParam 값을 아예 안 보내면', q: '@RequestParam String name 파라미터에 @NotBlank를 직접 붙여 받고 name을 아예 보내지 않으면', d: '제약을 검사하기 전에 "필수 값이 없음"으로 먼저 거절됩니다.', v: { how: 'param', con: 'notblank', val: 'none' } },
  ],
  // 보내는 값: lit는 자바 코드에서의 모양, inner는 컨트롤러가 돌려주는 글의 [ ] 안에 들어갈 글자
  VALS: {
    none: { lit: 'null', inner: 'null', json: '{}', query: '', sent: 'name을 아예 보내지 않았습니다.' },
    empty: { lit: '""', inner: '', json: '{"name": ""}', query: 'name=', sent: 'name에 빈 문자열(글자가 하나도 없는 문자열)을 실어 보냈습니다.' },
    blank: { lit: '" "', inner: ' ', json: '{"name": " "}', query: 'name=%20', sent: 'name에 빈칸 한 글자만 실어 보냈습니다.' },
    pen: { lit: '"pen"', inner: 'pen', json: '{"name": "pen"}', query: 'name=pen', sent: 'name에 pen이라는 글자를 실어 보냈습니다.' },
  },
  // 제약: bad는 이 제약이 막는 값, why는 값마다 통과하거나 어기는 이유
  CONS: {
    notnull: { a: '@NotNull', rule: '@NotNull은 값이 null만 아니면 통과합니다.', bad: ['none'],
      why: { none: 'name은 null이므로 제약을 어겼습니다.', empty: '빈 문자열 ""은 글자가 없을 뿐 null이 아니므로 통과합니다. 글자 수는 보지 않습니다.', blank: '빈칸 한 글자도 null이 아니므로 통과합니다.', pen: '"pen"은 null이 아니므로 통과합니다.' } },
    notempty: { a: '@NotEmpty', rule: '@NotEmpty는 값이 null이 아니고 길이가 1 이상이어야 통과합니다.', bad: ['none', 'empty'],
      why: { none: 'name은 null이므로 제약을 어겼습니다.', empty: '빈 문자열 ""은 길이가 0이므로 제약을 어겼습니다.', blank: '빈칸도 한 글자로 세어 길이가 1이므로 통과합니다.', pen: '"pen"은 길이가 3이므로 통과합니다.' } },
    notblank: { a: '@NotBlank', rule: '@NotBlank는 값이 null이 아니고 빈칸이 아닌 글자가 하나 이상 있어야 통과합니다.', bad: ['none', 'empty', 'blank'],
      why: { none: 'name은 null이므로 제약을 어겼습니다.', empty: '빈 문자열 ""에는 글자가 하나도 없으므로 제약을 어겼습니다.', blank: '" "에는 빈칸뿐이므로 제약을 어겼습니다.', pen: '"pen"에는 빈칸이 아닌 글자가 있으므로 통과합니다.' } },
  },
  DECL: { plain: '@RequestBody ItemForm form', valid: '@Valid @RequestBody ItemForm form', br: '@Valid @RequestBody ItemForm form, BindingResult errors' },
  decl: function (c) { return c.how === 'param' ? '@RequestParam ' + this.CONS[c.con].a + ' String name' : this.DECL[c.how]; },
  line: function (c) { var V = this.VALS[c.val]; return c.how === 'param' ? 'GET /items' + (V.query ? '?' + V.query : '') : 'POST /items'; },
  code: function (c) {
    var V = this.VALS[c.val], A = this.CONS[c.con].a;
    if (c.how === 'param') return '// 보내는 요청\n// ' + this.line(c) + (c.val === 'blank' ? '\n// (%20은 주소 안에서 빈칸 한 글자를 나타내는 표기입니다)' : '') + '\n\n@RestController\nclass ItemController {\n\n    @GetMapping("/items")\n    String find(' + this.decl(c) + ') {\n        return "검색: [" + name + "]";\n    }\n}';
    var sent = '// 보내는 요청\n// POST /items\n// Content-Type: application/json\n//\n// ' + V.json + '\n\n';
    var form = 'class ItemForm {\n    ' + A + '\n    private String name;\n    public String getName() { return name; }\n    public void setName(String name) { this.name = name; }\n}\n\n';
    var body = c.how === 'br' ? '        if (errors.hasErrors()) {\n            return "오류 " + errors.getErrorCount() + "개";\n        }\n' : '';
    return sent + form + '@RestController\nclass ItemController {\n\n    @PostMapping("/items")\n    String add(' + this.decl(c) + ') {\n' + body + '        return "등록: [" + form.getName() + "]";\n    }\n}';
  },
  label: function (c) { return (c.how === 'param' ? '@RequestParam에 ' + this.CONS[c.con].a + ' 직접' : this.DECL[c.how] + ' · 필드에 ' + this.CONS[c.con].a) + ' · name ' + (c.val === 'none' ? '보내지 않음' : this.VALS[c.val].lit); },
  columns: ['응답', '검증', '컨트롤러 실행', '컨트롤러가 돌려준 글', '스프링이 던진 예외'],
  simulate: function (c) {
    var V = this.VALS[c.val], C = this.CONS[c.con], how = c.how, isParam = how === 'param', ev = [], sum = [];
    var violates = C.bad.indexOf(c.val) >= 0, call = isParam ? 'find(name)' : how === 'br' ? 'add(form, errors)' : 'add(form)', holder = isParam ? 'name' : 'form.getName()';
    var st = { stage: 0, name: '', gate: '', check: '', after: '', errors: -1, status: '', fail: 0, ctrl: false, ret: '' };
    function push(s, k) { ev.push({ s: s, k: k || '', snap: JSON.parse(JSON.stringify(st)) }); }
    var status = '', checked = '하지 않음', ret = '-', ex = '-';
    var NOT_RUN = ' 컨트롤러 메서드는 실행되지 않습니다.';

    st.stage = 1;
    push('요청이 도착합니다: ' + this.line(c) + (isParam ? '.' : ', 본문은 ' + V.json + '입니다.') + ' ' + V.sent + (isParam && c.val === 'blank' ? ' 주소에는 빈칸을 그대로 쓸 수 없어 %20으로 적습니다.' : ''));

    st.stage = 2;
    if (isParam && c.val === 'none') {
      st.name = '없음'; st.fail = 2; status = '400 Bad Request'; ex = 'MissingServletRequestParameterException'; st.status = status; st.after = '필수 값이 없음';
      push('@RequestParam String name: 요청 파라미터에 name이 없습니다. @RequestParam은 값이 반드시 있어야 하는 것이 기본이므로, 제약을 검사하기도 전에 400으로 응답합니다(MissingServletRequestParameterException).' + NOT_RUN, 'bad');
    } else {
      st.name = V.lit;
      if (isParam) push('@RequestParam String name: 스프링이 요청 파라미터에서 name을 꺼냅니다. 꺼낸 값은 ' + V.lit + '입니다.' + (c.val === 'empty' ? ' name= 뒤에 아무 글자가 없으므로 빈 문자열입니다. 값이 아예 없는 것과는 다릅니다.' : '') + ' 이 단계는 값을 꺼내기만 합니다. ' + C.a + ' 제약은 아직 아무 일도 하지 않습니다.');
      else push('@RequestBody ItemForm form: 스프링이 JSON 본문을 읽어 ItemForm 객체를 만들고 name 필드를 채웁니다. ' + (c.val === 'none' ? 'JSON에 name이 없으므로 name 필드는 null로 남습니다. null은 "아무 값도 가리키지 않는다"는 뜻의 특별한 값입니다.' : 'name 필드는 ' + V.lit + '입니다.') + ' 이 단계는 값을 옮겨 담기만 합니다. 필드 위의 ' + C.a + ' 제약은 아직 아무 일도 하지 않습니다.');

      st.stage = 3;
      if (how === 'plain') {
        st.gate = '건너뜀';
        push('검증할지 정하기: 스프링은 파라미터에 @Valid(또는 @Validated)가 붙어 있을 때만 그 객체를 검증기에 넘깁니다. 이 파라미터에는 @Valid가 없으므로 검증을 건너뜁니다. ItemForm의 ' + C.a + ' 제약은 "이 필드는 이래야 한다"고 적어 둔 표시일 뿐, 스스로 값을 막지 못합니다.', violates ? 'bad' : '');
      } else {
        st.gate = '검증함';
        if (isParam) push('검증할지 정하기: 파라미터에 제약(' + C.a + ')이 직접 붙어 있습니다. 이럴 때는 @Valid가 없어도 스프링이 컨트롤러 메서드를 부르기 직전에 파라미터의 제약을 검사합니다.');
        else push('@Valid: 파라미터에 @Valid가 붙어 있으므로, 스프링이 방금 만든 ItemForm 객체를 검증기(Hibernate Validator)에 넘깁니다. 검증기는 그 클래스의 필드에 붙은 제약을 찾아 하나씩 검사합니다.');

        st.stage = 4; st.check = violates ? '어김' : '통과'; checked = violates ? '실패: name의 ' + C.a + ' 위반' : '통과';
        push(C.a + ' 검사: ' + C.rule + ' ' + C.why[c.val], violates ? 'bad' : 'good');

        if (how === 'br') {
          st.stage = 5; st.errors = violates ? 1 : 0; st.after = violates ? 'errors에 오류 1개' : 'errors는 비어 있음';
          push('BindingResult errors: @Valid가 붙은 파라미터 바로 뒤에 BindingResult 파라미터가 있습니다. 스프링은 검증 결과를 이 객체에 담아 컨트롤러에 넘깁니다. ' + (violates ? '어긴 제약이 하나 있으므로 오류 1개가 담깁니다. 예외는 던지지 않습니다.' : '어긴 제약이 없으므로 비어 있습니다.'));
        } else if (violates) {
          st.stage = 5; st.fail = 5; status = '400 Bad Request'; ex = isParam ? 'HandlerMethodValidationException' : 'MethodArgumentNotValidException'; st.status = status; st.after = ex;
          push('검증 실패 처리: ' + (isParam ? '스프링이 HandlerMethodValidationException을 던지고 400 Bad Request로 응답합니다. 객체를 @Valid로 검증했을 때(MethodArgumentNotValidException)와는 예외의 이름이 다릅니다.' : '어긴 제약이 있는데 메서드에 그 결과를 받아 줄 BindingResult 파라미터가 없습니다. 스프링이 MethodArgumentNotValidException을 던지고 400 Bad Request로 응답합니다.') + NOT_RUN, 'bad');
        }
      }
    }
    if (!status) {
      st.stage = 6; st.ctrl = true; status = '200 OK'; st.status = status;
      var hasErr = how === 'br' && violates;
      ret = hasErr ? '오류 1개' : (isParam ? '검색' : '등록') + ': [' + V.inner + ']'; st.ret = ret;
      if (how === 'br') push(call + ' 호출: ' + (hasErr ? '검증에 실패했는데도 컨트롤러 메서드가 실행됩니다. errors.hasErrors()가 true이므로 if 안으로 들어갑니다. 돌려주는 글은 "' + ret + '"입니다. 이 코드는 응답 상태를 따로 정하지 않았으므로 200으로 응답합니다.' : '컨트롤러 메서드가 실행됩니다. errors.hasErrors()가 false이므로 if를 건너뜁니다. 돌려주는 글은 "' + ret + '"이고, 200으로 응답합니다.'), hasErr ? '' : 'good');
      else if (how === 'plain') push(call + ' 호출: 컨트롤러 메서드가 실행됩니다. ' + holder + '의 값은 ' + V.lit + '입니다. 돌려주는 글은 "' + ret + '"이고, 200으로 응답합니다.' + (violates ? ' ' + C.a + ' 제약을 어긴 값이 아무 제지 없이 컨트롤러까지 들어왔습니다.' : ''), violates ? 'bad' : 'good');
      else push(call + ' 호출: 검증을 통과했으므로 컨트롤러 메서드가 실행됩니다. ' + holder + '의 값은 ' + V.lit + '입니다. 돌려주는 글은 "' + ret + '"이고, 200으로 응답합니다.', 'good');
    }
    var ran = st.ctrl;
    if (how === 'plain') sum.push(violates ? '필드에 제약을 붙이는 것만으로는 검증되지 않습니다. 컨트롤러 파라미터에 @Valid를 붙여야 스프링이 검증기를 부릅니다.' : '이 값은 ' + C.a + ' 제약을 어기지 않지만, 검사해서 통과한 것이 아니라 검사를 아예 하지 않은 것입니다. @Valid가 없으면 어떤 값을 보내도 검증 없이 컨트롤러가 실행됩니다.');
    else if (st.fail === 2) sum.push('값이 아예 없으면 @RequestParam의 "필수 값" 검사에서 먼저 걸립니다. 제약 검사는 값을 꺼낸 다음의 일입니다. 같은 400이지만 예외가 다릅니다.');
    else if (how === 'br') sum.push(violates ? '@Valid 파라미터 바로 뒤에 BindingResult를 받으면 검증에 실패해도 예외가 나지 않고 컨트롤러가 실행됩니다. 오류가 있는지 확인하고 어떻게 응답할지 정하는 일은 컨트롤러 코드의 몫입니다. hasErrors()를 확인하지 않으면 잘못된 값이 그대로 처리됩니다.' : 'BindingResult를 받아도 어긴 제약이 없으면 결과는 @Valid만 쓴 경우와 같습니다.');
    else if (violates) sum.push(isParam ? '파라미터에 직접 붙인 제약은 @Valid 없이도 검사됩니다. 실패하면 HandlerMethodValidationException이 나오고 응답은 400입니다. 이 실습이 대조한 스프링 프레임워크 7.0.9에서의 동작입니다.' : '@Valid가 붙은 객체가 제약을 어기면 컨트롤러는 실행되지 않고 400이 됩니다. 요청을 보낸 쪽의 잘못이라는 뜻입니다. 잘못된 값이 컨트롤러 안으로 들어오지 않으므로 컨트롤러는 값이 올바르다고 믿고 일할 수 있습니다.');
    else sum.push('검증을 통과하면 검증하지 않을 때와 똑같이 컨트롤러가 실행됩니다. 차이는 제약을 어긴 값이 왔을 때만 드러납니다.');
    if (how !== 'plain' && st.fail !== 2) sum.push({ notnull: '@NotNull은 null만 막습니다. 빈 문자열과 빈칸은 통과하므로, 사람이 입력하는 글자 값에는 보통 @NotBlank를 씁니다.', notempty: '@NotEmpty는 null과 빈 문자열을 막지만, 빈칸만 든 문자열은 길이가 있으므로 통과시킵니다.', notblank: '@NotBlank는 null, 빈 문자열, 빈칸만 든 문자열을 모두 막습니다. 세 제약 가운데 가장 엄격합니다.' }[c.con]);
    return { events: ev, summary: sum, row: [status, checked, ran ? '실행됨' : '건너뜀', ret, ex] };
  },
  render: function (v, sim, t, H, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : null, c = sim.c, self = this;
    if (!s) { H.text(v, '실행을 누르면 요청 하나가 검증을 거쳐(또는 거치지 않고) 컨트롤러에 닿기까지를 한 단계씩 보여 줍니다.'); return; }
    var order = ['none', 'empty', 'blank', 'pen'];
    H.table(v, ['제약', 'null', '""', '" "', '"pen"'], ['notnull', 'notempty', 'notblank'].map(function (k) {
      var K = self.CONS[k];
      return { cells: [k === c.con ? { v: K.a + ' (지금)', cls: 'hot' } : K.a].concat(order.map(function (x) {
        var blocked = K.bad.indexOf(x) >= 0, word = blocked ? '막음' : '통과';
        return k === c.con && x === c.val ? { v: word + (s.check ? '' : c.how === 'plain' || s.fail === 2 ? ' (검사 안 함)' : ''), cls: s.check ? (blocked ? 'bad' : 'good') : 'hot' } : word;
      })) };
    }), '제약마다 막는 값 (검증을 했을 때의 결과)');
  },
  // 그림: 왼쪽 위에 HTTP 요청, 왼쪽 아래에 제약이 적힌 자리(ItemForm의 필드 또는 메서드 파라미터), 오른쪽에 스프링이 컨트롤러를 부르기까지의 순서(값 준비, 검증할지, 제약 검사, 실패 처리, 컨트롤러). 검증기가 제약을 읽을 때만 제약에서 검사 칸으로 화살표가 간다.
  draw: function (P, sim, shown) {
    var c = sim.c, V = this.VALS[c.val], C = this.CONS[c.con], isParam = c.how === 'param', last = shown[shown.length - 1];
    var s = last ? last.snap : { stage: 0, name: '', gate: '', check: '', after: '', errors: -1, status: '', fail: 0, ctrl: false, ret: '' };
    var skipped = s.gate === '건너뜀', leaked = c.how === 'plain' && C.bad.indexOf(c.val) >= 0;
    P.size(680, 330);
    P.region('rq', 16, 16, 220, 122, 'HTTP 요청');
    P.box('r_line', 28, 50, 196, 30, { cls: s.stage >= 1 ? 'wait' : 'ghost', title: isParam ? 'GET /items' : 'POST /items' });
    P.box('r_val', 28, 92, 196, 30, { cls: s.fail === 2 ? 'bad' : s.stage >= 2 ? 'good' : s.stage >= 1 ? 'wait' : 'ghost', title: isParam ? '쿼리 스트링' : '본문', right: isParam ? (V.query || '없음') : V.json });
    P.region('cl', 16, 150, 220, 102, isParam ? '메서드 파라미터에 적힌 제약' : 'ItemForm 클래스에 적힌 제약');
    P.box('con', 28, 186, 196, 50, { cls: s.check === '어김' ? 'bad' : s.check ? 'good' : skipped ? 'ghost' : s.gate ? 'hot' : 'plain', title: C.a, sub: isParam ? 'String name' : 'private String name;' });
    P.region('sp', 306, 16, 358, 236, '스프링이 컨트롤러를 부르기까지');
    P.box('obj', 318, 48, 334, 30, { cls: s.fail === 2 ? 'bad' : s.stage >= 2 ? 'wait' : 'ghost', title: isParam ? 'name에 담긴 값' : 'form의 name에 담긴 값', right: s.name });
    P.box('gate', 318, 84, 334, 30, { cls: !s.gate ? 'ghost' : skipped ? 'plain' : s.stage === 3 ? 'hot now' : 'hot', title: '검증할지 정하기', right: !s.gate ? '' : skipped ? '@Valid 없음: 건너뜀' : isParam ? '제약이 직접 붙음: 검증' : '@Valid 있음: 검증' });
    P.box('chk', 318, 120, 334, 30, { cls: s.check === '어김' ? 'bad' : s.check ? 'good' : 'ghost', title: C.a + ' 검사', right: s.check || (skipped || s.fail === 2 ? '하지 않음' : '') });
    P.box('aft', 318, 156, 334, 30, { cls: !s.after ? 'ghost' : s.fail ? 'bad' : s.errors === 1 ? 'hot' : 'plain', title: c.how === 'br' ? '결과를 담는 곳' : '거절', right: s.after });
    P.box('ctrl', 318, 192, 334, 46, { cls: s.ctrl ? (leaked ? 'bad now' : s.errors === 1 ? 'hot now' : 'good now') : s.fail ? 'ghost' : 'plain', title: (isParam ? 'find(name)' : c.how === 'br' ? 'add(form, errors)' : 'add(form)') + ' 실행', sub: s.ctrl ? '돌려준 글: ' + s.ret : s.fail ? '실행되지 않음' : '아직' });
    if (s.stage >= 2) P.arrow('take', 'r_val:r', 'obj:l', { cls: s.fail === 2 ? 'bad' : 'good', label: s.fail === 2 ? '값이 없음' : '값을 담음' });
    if (s.gate) P.arrow('read', 'con:r', 'chk:l', { cls: skipped ? 'mut dash' : s.check === '어김' ? 'bad' : s.check ? 'good' : 'hot', label: skipped ? '읽지 않음' : '제약을 읽음' });
    P.box('resp', 16, 264, 648, 34, { cls: !s.status ? 'ghost' : s.ctrl ? (leaked || s.errors === 1 ? 'hot' : 'good') : 'bad', title: '응답', right: s.status || '처리 중' });
    P.note('초록 칸은 통과하거나 실행된 곳, 빨간 칸은 제약을 어겼거나 막힌 곳입니다. 제약을 어긴 값이 검증 없이 들어오면 컨트롤러 칸이 빨갛게 됩니다.');
  },
  assume: '받는 방법 네 가지, 제약 세 가지, 보내는 값 네 가지를 곱한 마흔여덟 조합을 모두 실제 스프링 부트 4.1.1 서버(스프링 프레임워크 7.0.9, 내장 톰캣 11, Hibernate Validator 9.1.3.Final, jakarta.validation-api 3.1.1, JDK 21)에 HTTP 요청으로 보내, 상태 코드와 검증기가 실제로 돌았는지, 어긴 제약, 컨트롤러 실행 여부와 돌려준 글, 스프링이 던진 예외의 이름이 화면과 일치하는 것을 확인했습니다. 검증기가 돌았는지는 항상 통과하는 제약을 하나 더 붙여 그것이 불렸는지로 확인했습니다(화면의 코드에는 없습니다). 화면의 주소는 모두 /items이지만 대조할 때는 조합마다 주소를 따로 두었습니다. 스프링 부트는 검증 라이브러리(spring-boot-starter-validation)가 있을 때 검증기를 자동으로 준비하며, 이 실습은 그 상태를 전제로 합니다. 라이브러리가 없을 때의 동작은 확인하지 않았습니다. 예외의 이름과 파라미터에 직접 붙인 제약의 동작은 스프링 버전에 따라 다릅니다. 여기 적은 것은 스프링 프레임워크 7.0.9에서 본 것이고, 6.1보다 앞선 버전은 다르다고 알려져 있으나 실행해 보지 못했습니다. 오류 응답의 본문과 오류 메시지의 글은 설정과 서버의 언어에 따라 달라 결과로 삼지 않았습니다. 검증 환경에서 본 기본 오류 응답 본문에는 timestamp, status, error, path만 있었고 어느 필드가 틀렸는지는 들어 있지 않았습니다. 화면에 없는 경우도 같은 서버에서 확인했습니다. @Valid 대신 스프링의 @Validated를 파라미터에 붙여도 결과가 같습니다. @Valid @ModelAttribute로 폼 본문을 받아도 열두 가지(제약 셋, 값 넷) 결과가 @Valid @RequestBody와 같고 예외도 MethodArgumentNotValidException입니다. JSON에 "name": null이라고 적어 보내도 보내지 않은 것과 같습니다. 객체 안에 다른 객체가 필드로 들어 있을 때는 그 필드에 @Valid가 있어야 안쪽 객체의 제약까지 검사하고(없으면 200), 안쪽 객체가 null이면 @Valid가 있어도 내려가지 않고 통과합니다. 제약에 groups를 지정하면 @Valid로는 검사되지 않고 @Validated(그 그룹)으로 받아야 검사되며, 반대로 groups가 없는 제약은 @Validated(그 그룹)으로 받으면 검사되지 않습니다. 필드 둘이 모두 어기면 오류는 2개로, 검증은 첫 오류에서 멈추지 않습니다. @Valid 객체와 제약이 직접 붙은 파라미터를 한 메서드에서 함께 받으면 객체 쪽 실패도 HandlerMethodValidationException으로 나옵니다. @RequestParam(required = false)로 받고 값을 보내지 않으면 null이 들어와 @NotNull과 @NotBlank에 걸립니다. 컨트롤러 클래스에 @Validated를 붙이면 파라미터 제약의 실패가 ConstraintViolationException과 500으로 바뀝니다. Integer 필드에 @NotBlank를 붙이면 검증할 때 UnexpectedTypeException으로 500이 됩니다. BindingResult를 @Valid 파라미터 앞에 두면 IllegalStateException으로 500이 됩니다. @ExceptionHandler로 MethodArgumentNotValidException을 받으면 어느 필드가 어느 제약을 어겼는지 꺼내 400 응답 본문에 직접 적을 수 있습니다. 화면은 필드 하나, 제약 하나인 경우로 단순화했고, 빈칸은 스페이스 한 글자만 확인했습니다.',
});

Lab.register({
  id: 'infoleak', nav: '정보 누출', cat: '인증', mode: 'step',
  title: '오류 응답과 로그인 실패 글귀는 무엇을 밖으로 알려 주나',
  intro: '서버가 실패했을 때 돌려주는 응답에는 생각보다 많은 것이 실릴 수 있습니다. 예외 메시지에 든 SQL 문장, 스택 트레이스에 든 클래스 이름과 줄 번호는 서버 안의 모습을 그대로 보여 주어 공격하는 사람에게 단서가 됩니다. 로그인 실패 글귀가 "없는 아이디"와 "틀린 비밀번호"를 구별해 주면 어떤 아이디가 가입돼 있는지도 알려 주게 됩니다. 설정과 코드를 바꿔 가며 응답에 무엇이 담기는지 보세요.',
  terms: ['오류 응답과 정보 누출', '스택 트레이스', '계정 열거', '@ControllerAdvice와 @ExceptionHandler', 'HTTP 상태 코드'],
  controls: [
    { id: 'topic', label: '살펴볼 응답', type: 'select', value: 'boot', options: [['boot', '스프링 부트의 기본 오류 응답'], ['handler', '직접 만든 오류 응답 (@ExceptionHandler)'], ['login', '로그인 실패 응답']] },
    { id: 'msg', label: 'spring.web.error.include-message', type: 'select', value: 'always', options: [['never', 'never (기본값)'], ['always', 'always']], show: function (c) { return c.topic === 'boot'; } },
    { id: 'trace', label: 'spring.web.error.include-stacktrace', type: 'select', value: 'always', options: [['never', 'never (기본값)'], ['on_param', 'on_param (요청에 trace=true가 있을 때만)'], ['always', 'always']], show: function (c) { return c.topic === 'boot'; } },
    { id: 'q', label: '요청 주소 끝에 ?trace=true를 붙인다', type: 'check', value: false, show: function (c) { return c.topic === 'boot' && c.trace === 'on_param'; } },
    { id: 'body', label: '@ExceptionHandler가 응답에 담는 것', type: 'select', value: 'raw', options: [['raw', '예외의 메시지를 그대로 (e.getMessage())'], ['safe', '정해 둔 글귀와 오류 번호만 (자세한 내용은 로그에)']], show: function (c) { return c.topic === 'handler'; } },
    { id: 'lg', label: '로그인 실패를 알리는 방식', type: 'select', value: 'split', options: [['split', '직접 짠 코드: 두 경우의 글귀가 다름'], ['sec', '스프링 시큐리티 기본값'], ['unhide', '스프링 시큐리티에서 hideUserNotFoundExceptions를 false로']], show: function (c) { return c.topic === 'login'; } },
    { id: 'acct', label: '공격자가 넣어 본 아이디', type: 'select', value: 'none', options: [['none', 'ghost (가입하지 않은 아이디)'], ['exist', 'kim (가입한 아이디, 비밀번호는 틀림)']], show: function (c) { return c.topic === 'login'; } },
  ],
  presets: [
    { t: '처음 설정으로', d: '개발할 때 편하려고 둘 다 always로 둔 서버. SQL과 스택 트레이스가 응답에 실립니다.', v: { topic: 'boot', msg: 'always', trace: 'always', q: false, body: 'raw', lg: 'split', acct: 'none' } },
    { t: '스프링 부트 기본값', d: '둘 다 never. 오류가 났다는 사실만 나갑니다.', v: { topic: 'boot', msg: 'never', trace: 'never', q: false, body: 'raw', lg: 'split', acct: 'none' } },
    { t: 'on_param에 ?trace=true', d: '파라미터는 누구나 붙일 수 있으므로 숨긴 것이 아닙니다.', v: { topic: 'boot', msg: 'never', trace: 'on_param', q: true, body: 'raw', lg: 'split', acct: 'none' } },
    { t: '예외 메시지를 그대로 응답', d: '설정이 기본값이어도 코드가 직접 내보내면 새어 나갑니다.', v: { topic: 'handler', msg: 'never', trace: 'never', q: false, body: 'raw', lg: 'split', acct: 'none' } },
    { t: '정해 둔 글귀와 오류 번호만', d: '자세한 내용은 서버의 로그에만 남깁니다.', v: { topic: 'handler', msg: 'never', trace: 'never', q: false, body: 'safe', lg: 'split', acct: 'none' } },
    { t: '로그인 실패 글귀가 다르면', d: '아이디가 가입돼 있는지를 알려 주게 됩니다.', v: { topic: 'login', msg: 'always', trace: 'always', q: false, body: 'raw', lg: 'split', acct: 'none' } },
    { t: '스프링 시큐리티 기본값의 로그인', d: '없는 아이디와 틀린 비밀번호의 응답이 같습니다.', v: { topic: 'login', msg: 'always', trace: 'always', q: false, body: 'raw', lg: 'sec', acct: 'none' } },
  ],
  SQL: 'select id, item, pirce from orders where id = ?',
  // 스프링 부트의 기본 오류 응답에 담기는 항목과 그 안에서 보이는 내부 정보
  bootFacts: function (c) {
    var msg = c.msg === 'always', trace = c.trace === 'always' || (c.trace === 'on_param' && !!c.q);
    var keys = ['timestamp', 'status', 'error']; if (trace) keys.push('trace'); if (msg) keys.push('message'); keys.push('path');
    return { msg: msg, trace: trace, keys: keys, leak: { sql: msg || trace, frames: trace, db: trace } };   // 스택 트레이스의 첫 줄에도 예외 메시지(SQL)가 들어 있다
  },
  leakText: function (leak) {
    var a = []; if (leak.sql) a.push('SQL 문장'); if (leak.frames) a.push('클래스 이름과 줄 번호'); if (leak.db) a.push('DB 제품 이름');
    return a.length ? a.join(', ') : '없음';
  },
  // 로그인 실패 때 서버 안에서 일어나는 일
  loginFacts: function (c) {
    var none = c.acct === 'none', split = c.lg === 'split';
    var ex = split ? '' : c.lg === 'unhide' && none ? 'UsernameNotFoundException' : 'BadCredentialsException';
    var other = split ? '' : c.lg === 'unhide' && !none ? 'UsernameNotFoundException' : 'BadCredentialsException';
    function say(n, e) { return split ? (n ? '"존재하지 않는 아이디입니다."' : '"비밀번호가 틀렸습니다."') : e + '의 메시지'; }
    return { none: none, ex: ex, body: say(none, ex), otherBody: say(!none, other), same: c.lg === 'sec', matches: split && none ? 0 : 1 };
  },
  code: function (c) {
    if (c.topic === 'boot') return '# application.properties\nspring.web.error.include-message=' + c.msg + '\nspring.web.error.include-stacktrace=' + c.trace + '\n\n// 주문 조회. SQL의 컬럼 이름이 틀렸다 (price를 pirce로 적음)\n@GetMapping("/orders/{id}")\npublic Map<String, Object> order(@PathVariable long id) {\n    return jdbc.queryForMap(\n        "' + this.SQL + '", id);\n}\n\n// 요청: GET /orders/7' + (c.trace === 'on_param' && c.q ? '?trace=true' : '');
    if (c.topic === 'handler') return '// 주문 조회 컨트롤러는 그대로 두고, 예외를 받아 응답을 직접 만든다\n@RestControllerAdvice\nclass ' + (c.body === 'raw' ? 'RawAdvice' : 'SafeAdvice') + ' {\n' + (c.body === 'raw' ? '    @ExceptionHandler(Exception.class)\n    public ResponseEntity<Map<String, Object>> handle(Exception e) {\n        return ResponseEntity.status(500)\n            .body(Map.of("message", e.getMessage()));   // 예외의 메시지를 그대로\n    }' : '    private static final Logger log = LoggerFactory.getLogger(SafeAdvice.class);\n\n    @ExceptionHandler(Exception.class)\n    public ResponseEntity<Map<String, Object>> handle(Exception e) {\n        String errorId = UUID.randomUUID().toString().substring(0, 8);\n        log.error("errorId={}", errorId, e);        // 자세한 내용은 서버의 로그에만\n        return ResponseEntity.status(500)\n            .body(Map.of("message", "요청을 처리하지 못했습니다.",\n                         "errorId", errorId));\n    }') + '\n}\n\n// 요청: GET /orders/7';
    var req = '\n\n// 요청: POST /login  id=' + (c.acct === 'none' ? 'ghost' : 'kim') + '&pw=(아무 값)';
    if (c.lg === 'split') return '@PostMapping("/login")\npublic ResponseEntity<String> login(@RequestParam String id,\n                                    @RequestParam String pw) {\n    Member m = members.findById(id);\n    if (m == null)\n        return ResponseEntity.status(401).body("존재하지 않는 아이디입니다.");\n    if (!encoder.matches(pw, m.getPassword()))\n        return ResponseEntity.status(401).body("비밀번호가 틀렸습니다.");\n    return ResponseEntity.ok("로그인됨");\n}' + req;
    return '@Bean\nAuthenticationManager authenticationManager(UserDetailsService users,\n                                            PasswordEncoder encoder) {\n    DaoAuthenticationProvider provider = new DaoAuthenticationProvider(users);\n    provider.setPasswordEncoder(encoder);\n' + (c.lg === 'unhide' ? '    provider.setHideUserNotFoundExceptions(false);   // 기본값은 true\n' : '') + '    return new ProviderManager(provider);\n}\n\n@PostMapping("/login")\npublic ResponseEntity<String> login(@RequestParam String id,\n                                    @RequestParam String pw) {\n    try {\n        authenticationManager.authenticate(\n            UsernamePasswordAuthenticationToken.unauthenticated(id, pw));\n        return ResponseEntity.ok("로그인됨");\n    } catch (AuthenticationException e) {\n        return ResponseEntity.status(401).body(e.getMessage());\n    }\n}' + req;
  },
  label: function (c) {
    if (c.topic === 'boot') return '기본 오류 응답 · message ' + c.msg + ' · stacktrace ' + c.trace + (c.trace === 'on_param' ? (c.q ? ' · ?trace=true' : ' · 파라미터 없음') : '');
    if (c.topic === 'handler') return '@ExceptionHandler · ' + (c.body === 'raw' ? '예외 메시지 그대로' : '정해 둔 글귀와 오류 번호');
    return '로그인 실패 · ' + { split: '직접 짠 코드', sec: '시큐리티 기본값', unhide: 'hideUserNotFoundExceptions=false' }[c.lg] + ' · ' + (c.acct === 'none' ? '없는 아이디' : '틀린 비밀번호');
  },
  columns: ['응답 상태', '응답 본문에 담긴 것', '새어 나간 내부 정보'],
  simulate: function (c) { return c.topic === 'login' ? this.simLogin(c) : this.simError(c); },
  simError: function (c) {
    var boot = c.topic === 'boot', f = boot ? this.bootFacts(c) : null, ev = [], sum = [], SQL = this.SQL;
    var msgText = 'PreparedStatementCallback; bad SQL grammar [' + SQL + ']';
    var st = { phase: 0, items: [], made: '' };
    function push(s, k) { ev.push({ s: s, k: k, snap: JSON.parse(JSON.stringify(st)) }); }
    var q = boot && c.trace === 'on_param' && c.q;
    st.phase = 1;
    push('GET /orders/7' + (q ? '?trace=true' : '') + ' 요청이 들어옵니다. 주문 7번을 조회하는 평범한 요청입니다.' + (q ? ' 주소 끝에 trace=true라는 파라미터가 붙어 있습니다.' : ''), '');
    st.phase = 2;
    push('jdbc.queryForMap(SQL, id): SQL에 컬럼 이름 price가 pirce로 잘못 적혀 있습니다. DB가 이 SQL을 거절하고, 스프링이 그것을 BadSqlGrammarException으로 바꿔 던집니다. 이 예외의 메시지에는 실행하려던 SQL 문장이 통째로 들어 있습니다.', '');
    var keys, leak, res;
    if (boot) {
      st.phase = 3; st.made = '/error (BasicErrorController)';
      st.items.push({ k: 'timestamp, status, error, path', v: '오류가 난 시각, 500, Internal Server Error, /orders/7', cls: '' });
      push('예외를 잡는 코드가 없으므로 요청이 /error로 다시 넘겨지고, 스프링 부트의 BasicErrorController가 오류 응답을 만듭니다. 설정과 관계없이 들어가는 항목은 timestamp, status, error, path입니다. 여기까지는 "오류가 났다"는 사실만 알려 줍니다.', '');
      st.phase = 4;
      if (f.msg) { st.items.push({ k: 'message', v: msgText, cls: 'bad' }); push('include-message=always: message 항목에 예외의 메시지를 넣습니다. SQL 문장이 그대로 응답에 실리고, 테이블 이름(orders)과 컬럼 이름(id, item)이 드러납니다.', 'bad'); }
      else push('include-message=never: 예외의 메시지를 응답에 넣지 않습니다.', 'good');
      st.phase = 5;
      // 실제 응답에서 trace는 message보다 앞에 놓인다
      if (f.trace) { st.items.splice(1, 0, { k: 'trace', v: 'org.springframework.jdbc.BadSqlGrammarException: ' + msgText + ' … (예외가 지나온 메서드와 줄 번호 백여 줄, 그 아래에 DB 드라이버의 예외)', cls: 'bad' }); push('include-stacktrace=' + c.trace + ': ' + (c.trace === 'on_param' ? '요청에 trace=true가 있으므로 ' : '') + 'trace 항목에 스택 트레이스를 넣습니다. 첫 줄에 예외의 클래스 이름과 메시지(SQL 포함)가 있고, 그 아래로 예외가 지나온 메서드가 클래스 이름과 줄 번호까지 나열됩니다. DB 드라이버의 클래스 이름(org.h2…)에서 어떤 DB를 쓰는지도 보입니다.' + (c.trace === 'on_param' ? ' 이 파라미터는 누구든 주소에 붙일 수 있습니다.' : ''), 'bad'); }
      else push('include-stacktrace=' + c.trace + ': ' + (c.trace === 'on_param' ? '요청에 trace 파라미터가 없으므로 ' : '') + '스택 트레이스를 응답에 넣지 않습니다.', 'good');
      keys = f.keys; leak = f.leak;
    } else {
      st.phase = 3; st.made = '@ExceptionHandler (' + (c.body === 'raw' ? 'RawAdvice' : 'SafeAdvice') + ')';
      push('@ExceptionHandler(Exception.class)가 예외를 받습니다. 여기서 응답을 직접 만들기 때문에 요청은 /error로 넘어가지 않고, include-message 같은 스프링 부트의 오류 응답 설정도 쓰이지 않습니다.', '');
      st.phase = 4;
      if (c.body === 'raw') { st.items.push({ k: 'message', v: msgText, cls: 'bad' }); push('body(Map.of("message", e.getMessage())): 예외의 메시지를 그대로 응답에 넣습니다. 스프링 부트의 설정이 기본값(never)이어도 SQL 문장이 응답에 실립니다.', 'bad'); keys = ['message']; leak = { sql: true, frames: false, db: false }; }
      else {
        push('log.error("errorId={}", errorId, e): 예외 전체(메시지와 스택 트레이스)를 서버의 로그에 남기고, 나중에 찾을 수 있게 오류 번호를 함께 적습니다. 로그는 서버 안에만 있고 응답으로 나가지 않습니다.', 'good');
        st.phase = 5; st.items.push({ k: 'message', v: '요청을 처리하지 못했습니다.', cls: 'good' }, { k: 'errorId', v: '로그에서 찾을 때 쓰는 번호 (예: 3f9a1c2e)', cls: 'good' });
        push('응답에는 정해 둔 글귀와 오류 번호만 담습니다. 사용자가 이 번호를 알려 주면 개발자는 로그에서 그 번호로 자세한 내용을 찾습니다.', 'good'); keys = ['message', 'errorId']; leak = { sql: false, frames: false, db: false };
      }
    }
    var leaked = this.leakText(leak), any = leaked !== '없음';
    st.phase = 6;
    push('서버가 500 응답을 보냅니다. 본문의 항목은 ' + keys.join(', ') + '입니다. ' + (any ? '요청을 보낸 사람이 누구든 ' + leaked + '을 읽을 수 있습니다.' : '서버 안의 모습을 알려 주는 내용은 없습니다.'), any ? 'bad' : 'good');
    sum.push('응답은 500이고 본문의 항목은 ' + keys.join(', ') + '입니다. 새어 나간 내부 정보: ' + leaked + '.');
    if (boot && !any) sum.push('스프링 부트의 기본값은 예외 메시지와 스택 트레이스를 응답에 넣지 않습니다. 개발할 때 always로 바꿔 둔 설정이 운영 서버에 그대로 나가지 않게 하는 것이 중요합니다.');
    if (boot && f.msg && !f.trace) sum.push('메시지 한 줄뿐이지만 그 안에 SQL 문장이 있습니다. 예외 메시지는 개발자가 읽으라고 만든 것이어서 SQL, 파일 경로, 내부 주소 같은 것이 들어가기 쉽습니다.');
    if (boot && f.trace) sum.push('스택 트레이스는 가장 많은 것을 알려 줍니다. 쓰는 프레임워크와 DB, 내 코드의 클래스 이름과 구조가 보이고, 첫 줄에 예외 메시지가 들어 있어 include-message를 never로 두어도 SQL이 함께 나갑니다.');
    if (boot && c.trace === 'on_param') sum.push('on_param은 "요청에 trace=true가 있을 때만 넣는다"는 뜻일 뿐 숨기는 장치가 아닙니다. 파라미터는 누구나 붙일 수 있으므로 밖에서 접근할 수 있는 서버에서는 always와 다르지 않습니다.');
    if (!boot && c.body === 'raw') sum.push('오류 응답을 직접 만들면 무엇을 담을지도 직접 책임져야 합니다. e.getMessage()를 그대로 내보내는 코드는 스프링 부트의 설정과 관계없이 내부 정보를 밖으로 보냅니다.');
    if (!boot && c.body === 'safe') sum.push('사용자에게는 무슨 일이 났는지 짧게 알리고, 원인을 찾는 데 필요한 것은 로그에 남깁니다. 오류 번호는 둘을 이어 주는 끈입니다.');
    if (any) sum.push('이런 정보만으로 서버가 뚫리는 것은 아니지만, 공격하는 사람은 테이블과 컬럼 이름, 쓰는 제품과 코드의 구조를 알아낼수록 다음 시도를 정확하게 할 수 있습니다.');
    return { events: ev, summary: sum, row: ['500', keys.join(', '), leaked], keys: keys, leak: leak, logged: !boot && c.body === 'safe' };
  },
  simLogin: function (c) {
    var f = this.loginFacts(c), id = f.none ? 'ghost' : 'kim', ev = [], sum = [], split = c.lg === 'split';
    var st = { phase: 0, found: '', pw: '', body: '', learned: '' };
    function push(s, k) { ev.push({ s: s, k: k, snap: JSON.parse(JSON.stringify(st)) }); }
    st.phase = 1;
    push('POST /login (id=' + id + ', 비밀번호는 아무 값): 공격자가 어떤 아이디가 가입돼 있는지 알아보려고 로그인을 시도합니다. 비밀번호를 맞힐 생각은 없고 응답만 보려는 것입니다. 이번 아이디 ' + id + (f.none ? '는 실제로는 가입돼 있지 않습니다.' : '은 실제로 가입돼 있습니다.'), '');
    st.phase = 2; st.found = f.none ? '없음' : '있음';
    if (split) push('members.findById(id): 아이디로 회원을 찾습니다. ' + (f.none ? '없습니다. 비밀번호는 비교해 보지도 않고 "존재하지 않는 아이디입니다."로 응답하기로 합니다.' : '있습니다. 다음 줄로 넘어가 비밀번호를 비교합니다.'), f.none ? 'bad' : '');
    else push('authenticationManager.authenticate(...): 스프링 시큐리티의 DaoAuthenticationProvider가 아이디로 회원을 찾습니다. ' + (f.none ? '없습니다. 안에서는 UsernameNotFoundException이 납니다.' : '있습니다. 다음으로 비밀번호를 비교합니다.'), '');
    st.phase = 3;
    if (split && f.none) st.pw = '비교하지 않음';
    else if (split) { st.pw = '저장된 값과 비교: 틀림'; push('encoder.matches(pw, m.getPassword()): 넣은 비밀번호가 저장된 값과 맞지 않습니다. "비밀번호가 틀렸습니다."로 응답하기로 합니다.', 'bad'); }
    else if (f.none) { st.pw = '가짜 값과 한 번 비교'; push('아이디가 없어도 비밀번호 비교를 한 번 수행합니다(미리 만들어 둔 가짜 값과 비교합니다). 아이디가 있을 때와 걸리는 시간이 비슷해지게 하려는 것입니다. ' + (c.lg === 'sec' ? '그리고 기본 설정(hideUserNotFoundExceptions=true)에 따라 UsernameNotFoundException을 BadCredentialsException으로 바꿔 던집니다.' : 'hideUserNotFoundExceptions를 false로 바꿨으므로 UsernameNotFoundException을 바꾸지 않고 그대로 던집니다.'), c.lg === 'sec' ? 'good' : 'bad'); }
    else { st.pw = '저장된 값과 비교: 틀림'; push('넣은 비밀번호를 저장된 값과 비교합니다: 맞지 않습니다. BadCredentialsException을 던집니다.', ''); }
    st.phase = 4; st.body = f.body;
    push('서버가 401 응답을 보냅니다. 본문에 담긴 것은 ' + f.body + ' 입니다.' + (split ? '' : ' 컨트롤러가 예외의 메시지를 그대로 본문에 넣었습니다.'), '');
    st.phase = 5;
    var learned = f.same ? '없음' : f.none ? '이 아이디는 가입돼 있지 않다는 사실' : '이 아이디는 가입돼 있다는 사실';
    st.learned = learned;
    if (f.same) push('공격자가 다른 아이디로 받은 응답과 비교합니다: 가입하지 않은 아이디든 비밀번호가 틀린 아이디든 상태 코드와 본문이 똑같습니다. 이 응답만으로는 그 아이디가 가입돼 있는지 알 수 없습니다.', 'good');
    else push('공격자가 다른 아이디로 받은 응답과 비교합니다: ' + (f.none ? '비밀번호가 틀렸을 때' : '가입하지 않은 아이디일 때') + '의 본문은 ' + f.otherBody + '로, 지금 받은 것과 다릅니다. 그래서 ' + id + (f.none ? '는 가입돼 있지 않다' : '은 가입돼 있다') + '는 것을 알게 됩니다. 아이디를 바꿔 가며 되풀이하면 가입된 아이디의 목록이 만들어집니다.', 'bad');
    sum.push('응답은 401이고 본문에 담긴 것은 ' + f.body + ' 입니다. 공격자가 알게 된 것: ' + learned + '.');
    if (!f.same) sum.push('로그인에 실패한 이유를 친절하게 나눠 알려 주면 "이 아이디는 가입돼 있다"는 정보가 함께 나갑니다. 가입된 아이디의 목록은 비밀번호를 대입해 보거나 속이는 메일을 보낼 대상이 됩니다. 실패 글귀는 "아이디 또는 비밀번호가 올바르지 않습니다."처럼 하나로 합니다.');
    if (c.lg === 'sec') sum.push('스프링 시큐리티는 기본으로 두 경우를 같은 예외(BadCredentialsException)로 만들고, 아이디가 없을 때도 비밀번호 비교를 한 번 수행해 응답 시간으로 구별하기 어렵게 합니다.');
    if (c.lg === 'unhide') sum.push('hideUserNotFoundExceptions를 false로 바꾸면 두 예외가 구별됩니다. 서버의 로그에서 원인을 나눠 보려는 뜻이라도, 그 차이가 응답에 드러나지 않게 해야 합니다.');
    if (split && f.none) sum.push('직접 짠 이 코드는 아이디가 없으면 비밀번호 비교를 건너뜁니다. 글귀를 하나로 합쳐도 응답 시간이 달라질 수 있습니다.');
    sum.push('같은 정보는 다른 화면에서도 새어 나갑니다. 회원 가입의 "이미 쓰고 있는 아이디입니다."나 비밀번호 찾기의 "가입하지 않은 이메일입니다."도 로그인 화면과 함께 살펴야 합니다.');
    return { events: ev, summary: sum, row: ['401', f.body, learned], ex: f.ex || '-', same: f.same, matches: f.matches };
  },
  render: function (v, sim, t, H, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : null, c = sim.c;
    if (!s) { H.text(v, '실행을 누르면 한 단계씩 진행합니다.'); return; }
    if (c.topic === 'login') {
      var ln = H.lanes(v);
      H.lane(ln, '아이디로 회원 찾기', s.found || '아직 찾기 전', s.found ? 'hot' : 'none');
      H.lane(ln, '비밀번호 비교', s.pw || '아직 비교 전', s.pw ? 'hot' : 'none');
      H.lane(ln, '응답', s.body ? '401 · ' + s.body : '아직 응답 전', s.body ? 'wait' : 'none');
      H.counters(v, [[s.learned || '진행 중', '공격자가 알게 된 것']]);
      H.text(v, '글귀는 버전과 언어 설정에 따라 다릅니다. 이 PC의 스프링 시큐리티 7.1.1에서는 BadCredentialsException의 메시지가 "자격 증명에 실패하였습니다.", UsernameNotFoundException의 메시지가 "user not found"였습니다.');
      return;
    }
    if (s.items.length) H.table(v, ['항목', '담긴 값', '서버 안의 정보인가'], s.items.map(function (it) { return { cells: [it.k, it.v, { v: it.cls === 'bad' ? '예' : '아니오', cls: it.cls === 'bad' ? 'bad' : 'good' }] }; }), '응답 본문 (JSON)' + (s.made ? ' · 만든 곳: ' + s.made : ''));
    else H.text(v, '아직 응답을 만들기 전입니다.');
    H.counters(v, [[s.phase === 6 ? '500' : '처리 중', '응답 상태'], [s.phase === 6 ? sim.row[2] : '진행 중', '새어 나간 내부 정보']]);
    if (c.topic === 'boot') H.text(v, '스프링 부트 3까지는 이 설정의 이름이 server.error.include-message, server.error.include-stacktrace였습니다. 스프링 부트 4.1.1에서 예전 이름으로 always를 주면 적용되지 않고 기본값(never)으로 동작했습니다.');
  },
  // 그림: 오류 응답은 왼쪽에 서버 안에서 일어난 일(요청, 예외, 응답을 만드는 곳), 오른쪽에 응답 본문의 항목. 로그인은 서버 안의 두 단계와 두 경우의 응답을 나란히 놓아 같은지 다른지를 보인다.
  draw: function (P, sim, shown) {
    var c = sim.c, last = shown[shown.length - 1], s = last ? last.snap : { phase: 0, items: [] }, ph = s.phase;
    P.size(680, 316);
    if (c.topic === 'login') {
      var f = this.loginFacts(c), id = f.none ? 'ghost' : 'kim';
      P.box('l_try', 16, 16, 648, 36, { cls: ph >= 1 ? 'plain' : 'ghost', title: '공격자의 시도: POST /login', right: 'id=' + id + ', 비밀번호는 아무 값' });
      P.region('l_sv', 16, 64, 648, 98, '서버 안에서 일어난 일');
      P.box('l_find', 28, 94, 306, 54, { cls: ph >= 2 ? 'wait' : 'ghost', title: '아이디로 회원 찾기', sub: ph >= 2 ? (f.none ? 'ghost: 없음' : 'kim: 있음') : '아직 찾기 전' });
      P.box('l_pw', 346, 94, 306, 54, { cls: ph >= 3 ? 'wait' : 'ghost', title: '비밀번호 비교', sub: ph >= 3 ? s.pw : '아직 비교 전' });
      if (ph >= 2) P.arrow('l_a1', 'l_try:b:0.2', 'l_find:t');
      if (ph >= 3 && f.matches) P.arrow('l_a2', 'l_find:r', 'l_pw:l');
      var mine = f.none ? 'l_none' : 'l_exist', cmp = ph >= 5;
      P.box('l_none', 16, 176, 318, 68, { cls: (f.none ? ph >= 4 : cmp) ? ((cmp ? (f.same ? 'good' : 'bad') : 'hot') + (f.none ? ' now' : '')) : 'ghost', title: '가입하지 않은 아이디일 때의 응답', sub: (f.none ? ph >= 4 : cmp) ? ['401', f.none ? f.body : f.otherBody] : [f.none ? '아직 응답 전' : '(다른 경우)', ' '] });
      P.box('l_exist', 346, 176, 318, 68, { cls: (!f.none ? ph >= 4 : cmp) ? ((cmp ? (f.same ? 'good' : 'bad') : 'hot') + (!f.none ? ' now' : '')) : 'ghost', title: '비밀번호가 틀렸을 때의 응답', sub: (!f.none ? ph >= 4 : cmp) ? ['401', !f.none ? f.body : f.otherBody] : [!f.none ? '아직 응답 전' : '(다른 경우)', ' '] });
      if (ph >= 4) P.arrow('l_a3', (f.matches ? 'l_pw' : 'l_find') + ':b', mine + ':t', { cls: 'hot', label: '응답' });
      P.box('l_res', 16, 264, 648, 36, { cls: !cmp ? 'ghost' : f.same ? 'good' : 'bad', title: '공격자가 알게 된 것', right: cmp ? s.learned : '진행 중' });
      P.note('굵은 테두리가 이번 시도에 대한 응답입니다. 두 경우의 응답이 서로 다르면, 공격자는 응답을 보고 그 아이디가 가입돼 있는지를 가려낼 수 있습니다.');
      return;
    }
    var boot = c.topic === 'boot', q = boot && c.trace === 'on_param' && c.q, items = s.items;
    P.region('e_sv', 16, 16, 300, 232, '서버 (shop.example)');
    P.box('e_ctl', 28, 46, 276, 50, { cls: ph >= 1 ? 'wait' : 'ghost', title: 'GET /orders/7' + (q ? '?trace=true' : ''), sub: 'jdbc.queryForMap(SQL, id)' });
    P.box('e_ex', 28, 106, 276, 66, { cls: ph >= 2 ? 'bad' : 'ghost', title: 'BadSqlGrammarException', sub: ph >= 2 ? ['메시지: bad SQL grammar', '[select id, item, pirce from …]'] : ['아직 예외가 나기 전', ' '] });
    P.box('e_mk', 28, 184, 276, 58, { cls: ph >= 3 ? 'hot' : 'ghost', title: boot ? '/error (BasicErrorController)' : '@ExceptionHandler', sub: boot ? ['include-message=' + c.msg, 'include-stacktrace=' + c.trace] : c.body === 'raw' ? ['e.getMessage()를 응답에 넣음', ' '] : ['예외 전체는 로그에만 남김', '응답에는 글귀와 오류 번호만'] });
    if (ph >= 2) P.arrow('e_a1', 'e_ctl:b', 'e_ex:t', { cls: 'bad' });
    if (ph >= 3) P.arrow('e_a2', 'e_ex:b', 'e_mk:t');
    P.region('e_rs', 332, 16, 332, 232, '응답 본문 (JSON)' + (ph === 6 ? ' · 상태 코드 500' : ''));
    var SHORT = { 'timestamp, status, error, path': ['오류가 났다는 사실과 요청 경로'], message: null, trace: ['예외 클래스 이름, SQL 문장,', '메서드와 줄 번호, DB 드라이버'], errorId: ['로그에서 찾을 때 쓰는 번호'] };
    if (!items.length) P.box('e_none', 344, 46, 308, 58, { cls: 'ghost', title: '아직 응답을 만들기 전', sub: ' ' });
    items.forEach(function (it, i) {
      var sub = SHORT[it.k] || (it.cls === 'bad' ? ['bad SQL grammar', '[select id, item, pirce from …]'] : ['"' + it.v + '"']);
      P.box('e_k_' + it.k.split(',')[0], 344, 46 + i * 66, 308, 58, { cls: it.cls || 'plain', title: it.k, sub: sub });
    });
    if (ph >= 3 && items.length) P.arrow('e_a3', 'e_mk:r', 'e_k_' + items[0].k.split(',')[0] + ':l', { cls: 'hot' });
    P.box('e_res', 16, 264, 648, 36, { cls: ph < 6 ? 'ghost' : sim.row[2] === '없음' ? 'good' : 'bad', title: '새어 나간 내부 정보', right: ph < 6 ? '진행 중' : sim.row[2] });
    P.note('빨간 항목이 서버 안의 모습을 알려 주는 내용입니다. 예외는 개발자가 원인을 찾으라고 만든 것이라 자세할수록 좋지만, 그 자세한 내용이 갈 곳은 응답이 아니라 서버의 로그입니다.');
  },
  assume: '오류 응답 열두 가지(메시지 설정 2 × 스택 트레이스 설정 3 × trace 파라미터 유무)와 직접 만든 응답 두 가지, 로그인 실패 여섯 가지를 스프링 부트 4.1.1(스프링 시큐리티 7.1.1, 스프링 JDBC, H2) 서버를 127.0.0.1에 띄워 실제 응답과 대조했습니다. 응답의 글귀와 스택 트레이스의 줄 수는 버전과 환경에 따라 달라지므로, 대조한 것은 본문에 어떤 항목이 있는지, 본문에 SQL 문장과 스택 트레이스의 줄과 DB 드라이버의 이름이 보이는지, 두 로그인 실패 응답이 같은지, 어떤 예외가 났는지, 비밀번호 비교가 몇 번 불렸는지입니다. 화면의 message 값은 이 PC에서 본 것이고, errorId의 예는 꾸민 값입니다. JSON으로 받는 요청을 기준으로 했으며, 브라우저처럼 HTML을 받는 요청에는 같은 내용이 오류 화면에 실리는 것을 한 가지 설정에서 확인했습니다. 설정 이름은 스프링 부트 4.1.1의 spring.web.error.*를 썼습니다(스프링 부트 3까지는 server.error.*). include-exception, include-binding-errors와 message의 on_param 값은 다루지 않았습니다. 안전한 응답에서 예외 전체가 로그에 남는 것은 로그 기록을 모아 확인했습니다. 실행하지 않은 것: 응답 시간의 차이는 재지 않았고(비밀번호 비교가 불린 횟수만 확인), 회원 가입과 비밀번호 찾기 화면의 글귀는 OWASP의 인증 관련 안내를 따른 설명입니다. 새어 나간 정보가 실제 공격에 얼마나 쓰이는지는 서버마다 다릅니다.',
});

Lab.register({
  id: 'servlet', nav: '서블릿', cat: '스프링', mode: 'step',
  title: 'HTTP 요청이 자바 코드에 닿기까지',
  why: '서블릿 없이 웹 요청을 자바로 처리하려면 소켓으로 연결을 받고 HTTP 글자를 직접 해석해야 했고, 요청마다 프로그램을 새 프로세스로 띄우는 CGI 방식은 요청이 많아지면 그 비용이 컸다. 서블릿은 연결 관리와 HTTP 해석을 컨테이너에 맡기고, 한 번 만든 서블릿 객체의 메서드를 요청마다 스레드로 불러서, 개발자는 주소별 처리 내용만 작성하면 되게 했다.',
  use: '서블릿을 직접 만드는 일은 드물지만, 스프링 MVC 애플리케이션은 스프링 부트의 내장 톰캣 위에서 서블릿 API로 동작한다. 모든 요청에 로그나 인증 검사를 거는 필터, 컨트롤러 매개변수로 받는 HttpServletRequest와 HttpServletResponse가 그대로 서블릿 API다. 적은 스레드로 아주 많은 연결을 다뤄야 하면 스프링 MVC 대신 스프링 WebFlux를 쓰기도 한다.',
  intro: '브라우저가 보내는 것은 글자로 된 HTTP 요청입니다. 톰캣 같은 서블릿 컨테이너가 그 글자를 읽어 자바 객체로 바꾸고, 주소에 맞는 서블릿의 메서드를 불러 줍니다. 서블릿은 "요청 객체를 받아 응답 객체에 쓰는" 자바 클래스입니다.',
  terms: ['서블릿과 서블릿 컨테이너', 'DispatcherServlet과 프론트 컨트롤러', '내장 서버', '웹 서버와 WAS', '톰캣의 스레드 모델', 'HTTP 메서드'], ranks: ['mvc', 'was'],
  controls: [
    { id: 'kind', label: '만드는 방식', type: 'select', value: 'plain', options: [['plain', '서블릿을 직접 작성'], ['spring', '스프링 MVC (컨트롤러 작성)']] },
    { id: 'req', label: '브라우저가 보내는 요청', type: 'select', value: 'get', options: [['get', 'GET /hello?name=철수'], ['post', 'POST /hello'], ['none', 'GET /nothing (만들어 두지 않은 주소)']] },
    { id: 'impl', label: '코드가 처리하는 HTTP 메서드', type: 'select', value: 'get', options: [['get', 'GET만'], ['both', 'GET과 POST 둘 다']] },
    { id: 'n', label: '같은 요청을 보내는 횟수', type: 'range', min: 1, max: 3, value: 2, fmt: function (v) { return v + '번'; } },
    { id: 'startup', label: '서버가 뜰 때 서블릿을 미리 준비해 둔다 (loadOnStartup)', type: 'check', value: false },
  ],
  presets: [
    { t: '처음 설정으로', q: '서블릿을 직접 작성해 GET만 처리하게 하고 GET /hello?name=철수 요청을 2번 보내면 어떻게 자바 코드에 닿나', d: 'GET /hello를 두 번. 서블릿 객체는 첫 요청 때 한 번만 만들어집니다.', v: { kind: 'plain', req: 'get', impl: 'get', n: 2, startup: false } },
    { t: '서버가 뜰 때 미리 만들기', q: 'loadOnStartup으로 서버가 뜰 때 서블릿을 미리 준비해 두면', d: '준비 작업을 첫 요청이 아니라 서버 시작 때 치릅니다.', v: { kind: 'plain', req: 'get', impl: 'get', n: 2, startup: true } },
    { t: 'doGet만 있는데 POST가 오면', q: '코드는 GET만 처리하는데 브라우저가 POST /hello를 1번 보내면', d: '서블릿까지는 도착하지만 405로 거절됩니다.', v: { kind: 'plain', req: 'post', impl: 'get', n: 1, startup: false } },
    { t: '만들어 두지 않은 주소', q: '브라우저가 만들어 두지 않은 주소 GET /nothing을 1번 요청하면', d: '맞는 서블릿이 없어 404가 됩니다.', v: { kind: 'plain', req: 'none', impl: 'get', n: 1, startup: false } },
    { t: '스프링 MVC에서는', q: '서블릿 대신 스프링 MVC 컨트롤러로 만들면', d: '서블릿은 DispatcherServlet 하나뿐이고, 그것이 컨트롤러를 불러 줍니다.', v: { kind: 'spring', req: 'get', impl: 'get', n: 2, startup: false } },
  ],
  code: function (c) {
    var both = c.impl === 'both';
    if (c.kind === 'plain') return '@WebServlet(urlPatterns = "/hello"' + (c.startup ? ', loadOnStartup = 1' : '') + ')\npublic class HelloServlet extends HttpServlet {\n\n    @Override\n    public void init() {                       // 객체가 만들어진 직후 한 번\n        // 준비 작업\n    }\n\n    @Override\n    protected void doGet(HttpServletRequest req, HttpServletResponse resp)\n            throws IOException {\n        String name = req.getParameter("name");   // 요청에서 꺼내고\n        resp.setContentType("text/plain; charset=UTF-8");\n        resp.getWriter().write("안녕하세요, " + name);   // 응답에 쓴다\n    }\n' + (both ? '\n    @Override\n    protected void doPost(HttpServletRequest req, HttpServletResponse resp)\n            throws IOException {\n        resp.setStatus(201);\n        resp.getWriter().write("등록했습니다");\n    }\n' : '') + '\n    @Override\n    public void destroy() { }                  // 서버가 내려갈 때 한 번\n}';
    return '@RestController\nclass HelloController {\n\n    @GetMapping("/hello")\n    String hello(@RequestParam String name) {\n        return "안녕하세요, " + name;\n    }\n' + (both ? '\n    @PostMapping("/hello")\n    @ResponseStatus(HttpStatus.CREATED)\n    String create() {\n        return "등록했습니다";\n    }\n' : '') + '}\n\n// 서블릿은 직접 만들지 않는다.\n// 스프링 부트가 DispatcherServlet 하나를 "/"에 등록해 두고,\n// 그 서블릿이 주소에 맞는 컨트롤러 메서드를 불러 준다.' + (c.startup ? '\n\n# application.properties\nspring.mvc.servlet.load-on-startup=1' : '');
  },
  label: function (c) { return (c.kind === 'plain' ? '서블릿 직접 작성' : '스프링 MVC') + ' · ' + { get: 'GET /hello', post: 'POST /hello', none: 'GET /nothing' }[c.req] + ' × ' + c.n + '번 · ' + (c.impl === 'both' ? 'GET·POST 처리' : 'GET만 처리') + (c.startup ? ' · 미리 생성' : ''); },
  columns: ['응답', '서블릿 객체가 만들어진 때', '객체 생성', 'init', '요청 처리 호출', '응답을 만든 곳'],
  simulate: function (c) {
    var plain = c.kind === 'plain', S = plain ? 'HelloServlet' : 'DispatcherServlet', ev = [], sum = [];
    var st = { made: 0, init: 0, svc: 0, destroy: 0, obj: '아직 없음', thread: '', reqText: '', reqObj: '', respText: '', sent: false, who: '서버 시작 전' };
    function push(s, k) { ev.push({ s: s, k: k, snap: JSON.parse(JSON.stringify(st)) }); }
    var line = { get: 'GET /hello?name=철수 HTTP/1.1', post: 'POST /hello HTTP/1.1', none: 'GET /nothing HTTP/1.1' }[c.req], path = c.req === 'none' ? '/nothing' : '/hello', method = c.req === 'post' ? 'POST' : 'GET';
    var mapped = plain ? c.req !== 'none' : true, handled = c.req === 'get' || (c.req === 'post' && c.impl === 'both'), status, body, maker, whenMade = '만들어지지 않음';
    if (c.req === 'none') { status = '404 Not Found'; body = '(오류 페이지)'; maker = plain ? '톰캣의 기본 서블릿' : 'DispatcherServlet과 /error 컨트롤러'; }
    else if (!handled) { status = '405 Method Not Allowed'; body = '(오류 페이지)'; maker = plain ? 'HttpServlet의 기본 doPost' : 'DispatcherServlet과 /error 컨트롤러'; }
    else if (c.req === 'get') { status = '200 OK'; body = '안녕하세요, 철수'; maker = plain ? 'HelloServlet.doGet' : 'HelloController.hello'; }
    else { status = '201 Created'; body = '등록했습니다'; maker = plain ? 'HelloServlet.doPost' : 'HelloController.create'; }
    function create(whenText) { st.made++; st.obj = S + ' 객체 1개'; whenMade = whenText; push(whenText + ': 톰캣이 ' + S + ' 객체를 만듭니다. 개발자가 new로 만드는 것이 아니라 컨테이너가 만듭니다. 이 객체 하나를 서버가 내려갈 때까지 계속 씁니다.', ''); st.init++; push(S + '의 init()을 한 번 호출합니다. 요청을 받기 전에 필요한 준비를 여기서 합니다.' + (plain ? '' : ' DispatcherServlet은 이때 컨트롤러 목록 등 스프링 MVC의 구성 요소를 준비합니다.'), ''); }
    function initOnly(whenText) { st.init++; push(whenText + ': 톰캣이 DispatcherServlet의 init()을 한 번 호출합니다. DispatcherServlet은 이때 컨트롤러 목록 등 스프링 MVC의 구성 요소를 준비합니다.', ''); }
    function errorDispatch() { st.svc++; push('스프링 부트는 오류 응답의 내용을 만들기 위해 이 요청을 /error 주소로 한 번 더 넘깁니다. 톰캣이 DispatcherServlet의 service()를 다시 호출하고, 스프링 부트의 오류 처리 컨트롤러(BasicErrorController)가 오류 응답의 본문을 만듭니다. 그래서 오류 응답 하나에 service()가 두 번 불립니다.', ''); }
    st.who = '톰캣 (서블릿 컨테이너)';
    push('서버가 뜹니다. 톰캣이 포트 8080에서 연결을 기다리고, "어느 주소는 어느 서블릿이 맡는다"는 표를 만듭니다. ' + (plain ? '@WebServlet("/hello")가 붙은 HelloServlet을 /hello 담당으로 등록합니다.' : '스프링 부트가 DispatcherServlet 하나를 "/"(모든 주소) 담당으로 등록합니다.') + (plain && !c.startup ? ' 서블릿 객체는 아직 만들지 않았습니다.' : ''), '');
    if (plain) { if (c.startup) create('서버 시작 시'); }
    else {
      st.made++; st.obj = S + ' 객체 1개'; whenMade = c.startup ? '서버 시작 시' : '서버 시작 시 (init은 첫 요청 때)';
      push('DispatcherServlet 객체는 스프링이 서버가 뜰 때 빈으로 만들어 톰캣에 등록해 둡니다. 직접 작성한 서블릿과 달리 객체는 이미 있습니다.' + (c.startup ? '' : ' 다만 톰캣이 init()을 부르는 것은 첫 요청이 올 때입니다.'), '');
      if (c.startup) initOnly('서버 시작 시');
    }
    for (var i = 1; i <= c.n; i++) {
      st.reqText = line + '\nHost: localhost:8080' + (c.req === 'post' ? '\nContent-Type: application/x-www-form-urlencoded\n\nname=철수' : ''); st.respText = ''; st.sent = false; st.reqObj = ''; st.thread = '';
      push(i + '번째 요청: 브라우저가 서버에 연결해 HTTP 요청을 보냅니다. 보내는 내용은 화면에 보이는 것 같은 글자 몇 줄입니다.', '');
      st.thread = '풀의 스레드 하나'; st.reqObj = 'HttpServletRequest (메서드 ' + method + ', 경로 ' + path + (c.req === 'get' ? ', 파라미터 name=철수' : c.req === 'post' ? ', 본문 name=철수' : '') + ') + 빈 HttpServletResponse';
      push('톰캣이 스레드 풀에서 스레드 하나를 배정하고, 받은 글자를 해석해 HttpServletRequest 객체로 만듭니다. 응답을 담을 빈 HttpServletResponse 객체도 함께 만듭니다. 서블릿은 글자를 직접 해석할 필요 없이 이 객체에서 값을 꺼내 쓰면 됩니다.' + (i === 1 ? ' 톰캣의 스레드 이름은 http-nio-8080-exec-1처럼 붙습니다.' : ' 어느 스레드가 배정될지는 정해져 있지 않아, 앞 요청을 맡았던 스레드가 다시 배정될 수도 있습니다.'), '');
      if (!mapped) { st.respText = 'HTTP/1.1 ' + status; st.sent = true; push('톰캣이 주소 /nothing을 맡은 서블릿을 표에서 찾습니다. 없습니다. 톰캣의 기본 서블릿이 404 응답을 만들어 브라우저에 보냅니다. 우리가 만든 HelloServlet은 호출되지 않았습니다.', 'bad'); continue; }
      push('톰캣이 주소 ' + path + ' 담당 서블릿을 표에서 찾습니다. ' + (plain ? 'HelloServlet입니다.' : '"/"에 등록된 DispatcherServlet이 모든 주소를 맡고 있습니다.'), '');
      if (plain && !st.made) create('첫 요청 때'); else if (!plain && !st.init) initOnly('첫 요청 때'); else if (i > 1 || c.startup) push('이미 만들어 둔 ' + S + ' 객체가 있습니다. 새로 만들지 않고 그 객체를 다시 씁니다. init()도 다시 부르지 않습니다.', 'good');
      st.svc++; st.who = S;
      if (plain) {
        push('톰캣이 ' + S + '의 service(request, response)를 호출합니다. service()는 요청의 HTTP 메서드를 보고 ' + (method === 'GET' ? 'doGet()을' : 'doPost()를') + ' 부릅니다.', '');
        if (handled) { st.respText = 'HTTP/1.1 ' + status + '\nContent-Type: text/plain;charset=UTF-8\n\n' + body; push((method === 'GET' ? 'doGet()' : 'doPost()') + ' 안의 우리 코드가 실행됩니다. ' + (method === 'GET' ? 'request에서 name을 꺼내고, ' : '') + 'response에 상태와 본문을 씁니다.', 'good'); }
        else { st.respText = 'HTTP/1.1 ' + status; push('HelloServlet은 doPost()를 재정의하지 않았습니다. 부모 클래스 HttpServlet의 기본 doPost()가 실행되고, 이것은 "이 주소는 POST를 지원하지 않는다"는 405 응답을 씁니다.', 'bad'); }
      } else {
        push('톰캣이 DispatcherServlet의 service(request, response)를 호출합니다. 톰캣이 하는 일은 여기까지입니다. 이 뒤는 스프링이 맡습니다.', '');
        if (c.req === 'none') { st.respText = 'HTTP/1.1 ' + status; push('DispatcherServlet이 /nothing을 처리할 컨트롤러 메서드를 찾습니다. 없습니다. 응답의 상태를 404로 정합니다.', 'bad'); errorDispatch(); }
        else if (!handled) { st.respText = 'HTTP/1.1 ' + status; push('DispatcherServlet이 /hello를 처리할 컨트롤러 메서드를 찾습니다. @GetMapping("/hello")는 있지만 POST용은 없습니다. 응답의 상태를 405로 정합니다.', 'bad'); errorDispatch(); }
        else { st.who = 'HelloController'; st.respText = 'HTTP/1.1 ' + status + '\nContent-Type: text/plain;charset=UTF-8\n\n' + body; push('DispatcherServlet이 ' + method + ' /hello에 맞는 컨트롤러 메서드를 찾아 호출합니다. ' + (method === 'GET' ? 'request에서 값을 꺼내 파라미터로 넘겨 주고, ' : '') + '메서드가 돌려준 값을 response에 써 줍니다. 서블릿을 직접 쓸 때 우리가 하던 일을 DispatcherServlet이 대신합니다.', 'good'); }
      }
      st.who = '톰캣 (서블릿 컨테이너)'; st.sent = true; st.thread = '';
      push('서블릿의 메서드가 끝났습니다. 톰캣이 HttpServletResponse에 담긴 내용을 HTTP 응답 글자로 바꿔 브라우저에 보냅니다. 이 요청에 쓴 request와 response 객체는 버리고, 스레드는 풀에 돌려줍니다. ' + S + ' 객체는 그대로 남아 다음 요청을 기다립니다.', '');
    }
    if (st.made) { st.destroy++; st.obj = '없어짐'; st.reqText = ''; st.respText = ''; st.sent = false; st.reqObj = ''; st.thread = ''; push('서버를 내립니다. 톰캣이 ' + S + '의 destroy()를 한 번 호출한 뒤 객체를 버립니다. 열어 둔 자원을 정리할 기회입니다.', ''); }
    sum.push('서블릿은 HTTP 요청 하나를 받아 응답을 만드는 자바 클래스이고, 서블릿 컨테이너(톰캣)는 그 서블릿을 만들고 부르고 없애는 프로그램입니다. 연결을 받고, HTTP 글자를 객체로 바꾸고, 스레드를 배정하는 일은 컨테이너가 하므로 개발자는 "요청에서 꺼내 응답에 쓰는" 코드만 작성합니다.');
    if (st.made && c.n > 1 && st.svc > 1) sum.push('요청이 ' + c.n + '번 왔지만 서블릿 객체는 하나뿐이었습니다. 요청마다 새로 만드는 것은 request와 response 객체입니다. 서블릿 객체 하나를 여러 스레드가 동시에 쓰므로, 서블릿의 필드에 요청별 값을 저장하면 안 됩니다(스프링의 싱글톤 빈과 같은 이유).');
    if (!c.startup && st.made) sum.push(plain ? '미리 만들어 두지 않으면 객체 생성과 init()이 첫 요청 처리 중에 일어나 첫 요청만 느려집니다. 준비 작업이 무겁다면 서버 시작 때 미리 만들어 둡니다.' : '스프링 부트에서는 DispatcherServlet 객체 자체는 서버가 뜰 때 만들어지지만, init()은 첫 요청 처리 중에 일어나 첫 요청만 느려집니다. spring.mvc.servlet.load-on-startup을 설정하면 서버 시작 때 미리 초기화합니다.');
    if (!plain && st.svc > c.n) sum.push('스프링 부트의 404와 405 응답은 /error 주소로 한 번 더 넘어가 만들어집니다. 그래서 요청 ' + c.n + '번에 DispatcherServlet의 service()가 ' + st.svc + '번 불렸습니다. 인터셉터가 오류 응답에서 두 번 도는 것처럼 보이는 이유이기도 합니다(필터는 기본적으로 /error 재요청에는 걸리지 않습니다).');
    if (!plain) sum.push('스프링 MVC에서는 컨트롤러가 서블릿이 아닙니다. 서블릿은 DispatcherServlet 하나이고, 모든 요청이 이 서블릿으로 들어온 뒤 컨트롤러로 나뉩니다. 컨트롤러에서 HttpServletRequest를 파라미터로 받을 수 있는 것도 밑에 서블릿이 있기 때문입니다. 그 뒤의 자세한 흐름은 "MVC 요청 흐름" 실습에 있습니다.');
    if (c.req === 'none' && plain) sum.push('404는 "그 주소를 맡은 것이 없다"이고, 405는 "주소는 맞지만 그 HTTP 메서드는 받지 않는다"입니다.');
    return { events: ev, summary: sum, row: [status, whenMade, st.made + '번', st.init + '번', st.svc + '번', maker] };
  },
  render: function (v, sim, t, H, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : null;
    if (!s) { H.text(v, '실행을 누르면 서버가 뜨는 것부터 시작합니다.'); return; }
    var ln = H.lanes(v);
    H.lane(ln, '톰캣', s.thread ? s.thread + ' 배정 · ' + (s.who.indexOf('톰캣') === 0 ? '톰캣이 일하는 중' : '서블릿에 넘김') : s.who === '서버 시작 전' ? '시작 전' : '요청을 기다리는 중', s.who.indexOf('톰캣') === 0 && s.thread ? 'hot' : s.thread ? '' : 'none');
    if (s.reqText) { H.title(v, '브라우저가 보낸 것 (HTTP 요청, 글자 그대로)'); v.appendChild(H.el('pre', 'code', s.reqText)); }
    if (s.reqObj) { H.title(v, '톰캣이 만들어 서블릿에 넘기는 자바 객체'); H.text(v, s.reqObj); }
    if (s.respText) { H.title(v, s.sent ? '브라우저에 돌아가는 것 (HTTP 응답, 글자 그대로)' : '보낼 HTTP 응답 (아직 브라우저에 보내기 전)'); v.appendChild(H.el('pre', 'code', s.respText)); }
  },
  // 그림: 브라우저, 톰캣, 그 안의 스레드와 서블릿 객체. 서블릿 객체는 하나뿐이고 요청마다 스레드가 그것을 실행한다.
  draw: function (P, sim, shown) {
    var c = sim.c, spring = c.kind === 'spring', name = spring ? 'DispatcherServlet' : 'HelloServlet', last = shown[shown.length - 1], s = last ? last.snap : { made: 0, init: 0, svc: 0, destroy: 0, obj: '아직 없음', thread: '', reqText: '', respText: '', who: '서버 시작 전' };
    var none = s.obj === '아직 없음' || s.obj === '없어짐', inServlet = s.who === name, inCtl = s.who === 'HelloController';
    P.size(680, 310);
    P.box('br', 16, 96, 130, 56, { cls: s.reqText ? 'wait' : 'plain', title: '브라우저', sub: s.sent ? '응답을 받음' : s.reqText ? '요청을 보냄' : '대기' });
    P.region('tc', 186, 16, 478, 226, '톰캣 (서블릿 컨테이너)' + (s.who === '서버 시작 전' ? ': 시작 전' : ''));
    P.box('th', 202, 54, 210, 46, { cls: s.thread ? 'hot' : 'ghost', title: '요청을 맡은 스레드', sub: s.thread ? s.thread : '요청을 기다리는 중' });
    P.box('sv', 202, 150, 210, 76, { cls: none ? 'ghost' : inServlet ? 'hot now' : 'good', title: name + ' 객체', sub: [s.obj, 'init ' + s.init + '번, service ' + s.svc + '번', inServlet ? '지금 실행 중' : ' '] });
    if (spring) P.box('ct', 440, 150, 212, 76, { cls: inCtl ? 'hot now' : 'plain', title: 'HelloController', sub: ['스프링 빈', inCtl ? '메서드 실행 중' : '대기'] });
    if (s.reqText) P.arrow('rq', 'br:r:0.3', 'th:l', { label: 'HTTP 요청' });
    if (s.thread && !none && (inServlet || inCtl || s.respText)) P.arrow('run', 'th:b', 'sv:t', { cls: 'hot', label: 'service() 호출' });
    if (spring && inCtl) P.arrow('ctl', 'sv:r', 'ct:l', { cls: 'hot' });
    if (s.sent) P.arrow('rs', 'sv:l', 'br:b', { cls: 'good', label: 'HTTP 응답' });
    [['객체 생성', s.made], ['init()', s.init], ['service()', s.svc], ['destroy()', s.destroy]].forEach(function (x, i) { P.box('cnt' + i, 16 + i * 164, 258, 156, 34, { cls: x[1] ? 'wait' : 'ghost', title: x[0], right: x[1] + '번' }); });
    P.note('맨 아래 숫자는 지금까지의 호출 횟수입니다.');
  },
  assume: '서블릿 컨테이너는 톰캣, 요청은 한 번에 하나씩 차례로 온다고 가정했습니다. 서블릿 객체가 선언 하나당 하나만 만들어진다는 점, init과 destroy가 한 번씩 호출된다는 점, 재정의하지 않은 doPost가 405를 돌려준다는 점은 Jakarta Servlet 명세와 HttpServlet의 문서를 따랐습니다. HTTP 요청과 응답의 글자는 주요 줄만 보였습니다. 서블릿을 직접 작성한 36가지 조합은 실제 톰캣 11.0.24에, 스프링 MVC 쪽 12가지 조합은 실제 스프링 부트 4.1.1에 요청을 보내, 응답 코드와 객체 생성·init·요청 처리 호출 횟수, 객체가 만들어진 때가 화면과 일치하는 것을 확인했습니다. 이 과정에서 스프링 쪽 내용 두 가지를 실제에 맞게 고쳤습니다. DispatcherServlet 객체는 첫 요청 때가 아니라 서버가 뜰 때 만들어지고(첫 요청 때 일어나는 것은 init뿐입니다), 404와 405 응답은 /error로 한 번 더 넘어가므로 요청 처리 호출이 요청마다 두 번입니다. 응답을 만든 곳 가운데 "톰캣의 기본 서블릿"과 "HttpServlet의 기본 doPost"는 응답 코드로 미루어 본 것이고 직접 관찰한 것은 아닙니다.',
});

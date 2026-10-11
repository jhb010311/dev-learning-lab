Lab.register({
  id: 'mvc', nav: 'MVC 요청 흐름', cat: '스프링', mode: 'step',
  title: '요청 하나가 컨트롤러에 닿기까지, 그리고 돌아가기까지',
  intro: 'MVC는 프로그램을 모델(Model, 데이터), 뷰(View, 화면), 컨트롤러(Controller, 요청을 받아 처리하는 곳)로 나누는 방식이고, 스프링 MVC는 이 방식으로 웹 요청을 처리합니다. HTTP 요청은 필터, DispatcherServlet, 인터셉터를 차례로 거쳐 컨트롤러에 도착하고, 같은 길을 거꾸로 돌아 응답이 됩니다. 요청 하나가 지나가는 길을 따라가며 컨트롤러, 모델, 뷰가 각각 어느 단계에서 일하는지 봅니다.',
  terms: ['MVC(Model-View-Controller)', 'DispatcherServlet과 프론트 컨트롤러', 'HandlerMapping과 HandlerAdapter', 'ArgumentResolver', 'HttpMessageConverter', '필터(Filter)', '인터셉터(HandlerInterceptor)', '@ControllerAdvice와 @ExceptionHandler', 'ViewResolver'], ranks: ['mvc', 'filter'],
  controls: [
    { id: 'kind', label: '컨트롤러 종류', type: 'select', value: 'rest', options: [['rest', '@RestController (JSON 응답)'], ['view', '@Controller (화면 이름 반환)']] },
    { id: 'what', label: '도중에 생기는 일', type: 'select', value: 'none', options: [['none', '아무 일 없음 (정상 처리)'], ['filter', '필터가 요청을 거절 (인증 실패)'], ['pre', '인터셉터 preHandle이 false 반환'], ['ex', '컨트롤러에서 예외 발생']] },
    { id: 'advice', label: '@ControllerAdvice에 이 예외를 처리하는 @ExceptionHandler가 있다', type: 'check', value: true, show: function (c) { return c.what === 'ex'; } },
  ],
  presets: [
    { t: '처음 설정으로', d: 'JSON API 요청이 정상 처리되는 전체 경로입니다.', v: { kind: 'rest', what: 'none', advice: true } },
    { t: '화면을 돌려주는 컨트롤러', d: 'ViewResolver와 뷰 렌더링 단계가 추가됩니다.', v: { kind: 'view', what: 'none', advice: true } },
    { t: '컨트롤러에서 예외', d: '@ExceptionHandler가 응답을 만듭니다. postHandle은 건너뜁니다.', v: { kind: 'rest', what: 'ex', advice: true } },
    { t: '예외를 처리할 곳이 없으면', d: '예외가 서블릿 컨테이너까지 올라가 500 응답이 됩니다.', v: { kind: 'rest', what: 'ex', advice: false } },
    { t: '필터에서 거절', d: 'DispatcherServlet에 닿지도 못합니다. @ControllerAdvice도 관여하지 못합니다.', v: { kind: 'rest', what: 'filter', advice: true } },
    { t: '인터셉터에서 중단', d: '컨트롤러를 부르지 않고 돌아갑니다.', v: { kind: 'rest', what: 'pre', advice: true } },
  ],
  code: function (c) {
    var ctl = c.kind === 'rest'
      ? '@RestController\nclass OrderController {\n    @PostMapping("/orders")\n    OrderResponse create(@RequestBody OrderRequest req) {\n' + (c.what === 'ex' ? '        throw new OutOfStockException();   // 재고 부족\n' : '        return orderService.create(req);\n') + '    }\n}'
      : '@Controller\nclass OrderController {\n    @GetMapping("/orders")\n    String list(Model model) {\n' + (c.what === 'ex' ? '        throw new OutOfStockException();   // 예외 발생\n' : '        model.addAttribute("orders", orderService.findAll());\n        return "orders/list";              // 화면 이름\n') + '    }\n}';
    if (c.what === 'filter') ctl = 'class AuthFilter extends OncePerRequestFilter {\n    protected void doFilterInternal(req, res, chain) {\n        if (!hasValidToken(req)) {\n            res.sendError(401);            // 여기서 끝낸다\n            return;                        // chain.doFilter 호출 안 함\n        }\n        chain.doFilter(req, res);\n    }\n}\n\n' + ctl;
    if (c.what === 'pre') ctl = 'class LoginCheckInterceptor implements HandlerInterceptor {\n    public boolean preHandle(req, res, handler) {\n        if (notLoggedIn(req)) {\n            res.sendError(401);\n            return false;                  // 컨트롤러를 부르지 않는다\n        }\n        return true;\n    }\n}\n\n' + ctl;
    if (c.what === 'ex' && c.advice) ctl += '\n\n@RestControllerAdvice\nclass GlobalExceptionHandler {\n    @ExceptionHandler(OutOfStockException.class)\n    ResponseEntity<ErrorResponse> handle(OutOfStockException e) {\n        return ResponseEntity.status(409)\n            .body(new ErrorResponse("재고 부족"));\n    }\n}';
    return ctl;
  },
  label: function (c) { return (c.kind === 'rest' ? '@RestController' : '@Controller') + ' · ' + { none: '정상 처리', filter: '필터에서 거절', pre: 'preHandle false', ex: '컨트롤러 예외' + (c.advice ? ' · 처리기 있음' : ' · 처리기 없음') }[c.what]; },
  columns: ['응답', '컨트롤러 실행', 'postHandle', 'afterCompletion', '응답을 만든 곳'],
  STAGES: [['F1', '필터 (요청이 들어갈 때)'], ['DS', 'DispatcherServlet'], ['HM', 'HandlerMapping'], ['HA', 'HandlerAdapter'], ['IP', '인터셉터 preHandle'], ['AR', 'ArgumentResolver'], ['CT', '컨트롤러 메서드'], ['RV', '반환값 처리'], ['PO', '인터셉터 postHandle'], ['VR', 'ViewResolver와 뷰 렌더링'], ['EX', 'HandlerExceptionResolver'], ['AC', '인터셉터 afterCompletion'], ['F2', '필터 (응답이 나갈 때)']],
  simulate: function (c) {
    var rest = c.kind === 'rest', ev = [], seen = [], end = null, resp = '', maker = '', req = rest ? 'POST /orders' : 'GET /orders';
    function go(id, s, k) { seen.push(id); if (k === 'bad' && !end) end = id; ev.push({ s: s, k: k === 'end' ? 'good' : k, snap: { seen: seen.slice(), cur: id, end: end, resp: resp } }); }
    if (c.what === 'filter') {
      resp = '401 Unauthorized'; maker = '필터';
      go('F1', req + ' 요청이 서블릿 컨테이너(톰캣)에 도착해 필터 체인을 탑니다. 인증 필터가 토큰을 확인했는데 유효하지 않습니다. 다음 단계로 넘기지 않고(chain.doFilter를 호출하지 않고) 직접 401 응답을 씁니다.', 'bad');
      go('F2', '요청은 DispatcherServlet에 닿지 못했습니다. 스프링 MVC 안쪽의 인터셉터, 컨트롤러, @ControllerAdvice는 이 요청이 있었는지도 모릅니다. 필터에서 난 문제는 필터에서 응답을 만들어야 합니다.', '');
    } else {
      go('F1', req + ' 요청이 서블릿 컨테이너(톰캣)에 도착해 필터 체인을 탑니다. 필터는 스프링 MVC 바깥, 서블릿 수준에서 동작합니다. 인코딩, 인증, 로깅 필터가 차례로 chain.doFilter를 호출해 다음으로 넘깁니다.', '');
      go('DS', 'DispatcherServlet이 요청을 받습니다. 모든 요청이 이 서블릿 하나로 들어오고, 여기서 알맞은 컨트롤러로 나눠 보냅니다(프론트 컨트롤러).', '');
      go('HM', 'HandlerMapping이 ' + req + '를 처리할 핸들러를 찾습니다. ' + (rest ? '@PostMapping("/orders")가 붙은 create 메서드' : '@GetMapping("/orders")가 붙은 list 메서드') + '와, 이 경로에 적용할 인터셉터 목록을 묶어 돌려줍니다.', '');
      go('HA', 'HandlerAdapter를 고릅니다. 애노테이션 기반 컨트롤러 메서드를 실행할 줄 아는 RequestMappingHandlerAdapter가 선택됩니다.', '');
      if (c.what === 'pre') {
        resp = '401 Unauthorized'; maker = '인터셉터';
        go('IP', '인터셉터의 preHandle이 실행됩니다. 로그인하지 않은 요청이라 401 응답을 쓰고 false를 반환합니다. DispatcherServlet은 여기서 처리를 멈춥니다. 컨트롤러와 postHandle은 호출되지 않습니다.', 'bad');
        go('F2', 'false를 반환한 인터셉터 자신의 afterCompletion도 호출되지 않습니다(그보다 앞서 true를 반환한 인터셉터가 있었다면 그것들만 호출됩니다). 응답은 필터 체인을 거꾸로 지나 나갑니다.', '');
      } else {
        go('IP', '인터셉터의 preHandle이 실행되고 true를 반환합니다. 필터와 달리 어떤 컨트롤러 메서드가 실행될지 아는 상태에서 동작합니다.', '');
        go('AR', rest ? 'ArgumentResolver가 컨트롤러 메서드의 파라미터를 준비합니다. @RequestBody가 붙은 파라미터는 HttpMessageConverter(Jackson)가 요청 본문의 JSON을 OrderRequest 객체로 바꿔서 채웁니다.' : 'ArgumentResolver가 컨트롤러 메서드의 파라미터를 준비합니다. Model 타입 파라미터에는 화면에 넘길 데이터를 담을 빈 모델 객체를 넣어 줍니다.', '');
        if (c.what === 'ex') {
          go('CT', '컨트롤러 메서드가 실행되다가 OutOfStockException을 던집니다. 반환값 처리와 postHandle은 건너뜁니다.', 'bad');
          if (c.advice) {
            resp = '409 Conflict + 오류 JSON'; maker = '@ExceptionHandler';
            go('EX', 'DispatcherServlet이 예외를 잡아 HandlerExceptionResolver에 넘깁니다. @ControllerAdvice에서 OutOfStockException을 처리하는 @ExceptionHandler 메서드를 찾아 실행하고, 그 반환값이 409 응답 본문으로 쓰입니다.', '');
            go('AC', '인터셉터의 afterCompletion이 호출됩니다. 예외가 났어도 호출되므로 자원 정리나 소요 시간 기록은 여기에 둡니다.', '');
            go('F2', '응답이 필터 체인을 거꾸로 지나 클라이언트로 나갑니다. 예외는 스프링 MVC 안에서 응답으로 바뀌었기 때문에 필터에는 예외가 전달되지 않습니다.', 'end');
          } else {
            resp = '500 Internal Server Error'; maker = '서블릿 컨테이너와 /error';
            go('EX', 'DispatcherServlet이 예외를 잡아 HandlerExceptionResolver에 넘기지만, 이 예외를 처리할 @ExceptionHandler가 없습니다. 처리되지 않은 예외는 DispatcherServlet 밖으로 다시 던져집니다.', 'bad');
            go('AC', '인터셉터의 afterCompletion은 이 경우에도 호출됩니다(예외 객체가 인자로 넘어옵니다).', '');
            go('F2', '예외가 필터를 지나 서블릿 컨테이너까지 올라갑니다. 스프링 부트에서는 컨테이너가 /error 경로로 요청을 다시 보내고, 기본 오류 컨트롤러가 500 응답을 만듭니다.', 'bad');
          }
        } else {
          go('CT', '컨트롤러 메서드가 실행됩니다. 서비스 계층을 호출해 실제 업무를 처리합니다.', '');
          if (rest) { resp = '200 OK + JSON'; maker = '컨트롤러 반환값';
            go('RV', '반환값을 처리합니다. @RestController이므로 화면을 찾지 않고, HttpMessageConverter(Jackson)가 OrderResponse 객체를 JSON으로 바꿔 응답 본문에 바로 씁니다.', '');
            go('PO', '인터셉터의 postHandle이 호출됩니다. 응답 본문은 앞 단계에서 이미 쓰였으므로, 여기서 응답 내용을 바꾸기에는 늦습니다.', '');
          } else { resp = '200 OK + HTML'; maker = '뷰(템플릿)';
            go('RV', '반환값을 처리합니다. @Controller가 돌려준 문자열 "orders/list"는 화면 이름으로 해석되고, 모델과 함께 ModelAndView로 묶입니다.', '');
            go('PO', '인터셉터의 postHandle이 호출됩니다. 아직 화면을 그리기 전이라 모델에 공통 데이터를 추가할 수 있습니다.', '');
            go('VR', 'ViewResolver가 화면 이름 "orders/list"를 실제 템플릿 파일로 바꾸고, 뷰가 모델 데이터를 넣어 HTML을 그려 응답에 씁니다.', '');
          }
          go('AC', '인터셉터의 afterCompletion이 호출됩니다. 응답 작성이 끝난 뒤이며 예외 여부와 관계없이 호출됩니다.', '');
          go('F2', '응답이 필터 체인을 거꾸로 지나 클라이언트로 나갑니다. chain.doFilter 호출 뒤에 적어 둔 필터 코드가 이때 실행됩니다.', 'end');
        }
      }
    }
    var has = function (id) { return seen.indexOf(id) >= 0; }, yn = function (b) { return b ? '실행됨' : '건너뜀'; };
    var sum = [];
    if (c.what === 'filter') sum.push('필터는 DispatcherServlet 앞에 있으므로, 필터에서 던진 예외나 거절은 @ControllerAdvice로 처리할 수 없습니다.');
    if (c.what === 'ex') sum.push('컨트롤러에서 예외가 나면 postHandle은 호출되지 않고 afterCompletion은 호출됩니다. 그래서 "반드시 실행돼야 하는 정리 작업"은 afterCompletion에 둡니다.');
    if (c.what === 'none' && rest) sum.push('@RestController에서는 ViewResolver를 거치지 않습니다. 반환 객체가 HttpMessageConverter를 통해 곧바로 응답 본문이 됩니다.');
    if (!sum.length) sum.push('최종 응답은 ' + resp + '이고, 응답을 만든 곳은 ' + maker + '입니다.');
    return { events: ev, summary: sum, rest: rest, row: [resp, yn(has('CT')), yn(has('PO')), yn(has('AC')), maker] };
  },
  render: function (v, sim, t, H, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : { seen: [], cur: null, end: null, resp: '' }, done = shown.length === sim.events.length, c = sim.c;
    var rows = this.STAGES.filter(function (st) { return !(st[0] === 'VR' && sim.rest) && !(st[0] === 'EX' && c.what !== 'ex'); }).map(function (st, i) {
      var id = st[0], seen = s.seen.indexOf(id) >= 0, state = id === s.cur ? '지금 여기' : seen ? (id === s.end ? '여기서 문제 발생' : '지나감') : done ? '건너뜀' : '';
      return { cls: !seen && done ? 'gone' : '', cells: [String(i + 1), st[1], { v: state, cls: id === s.cur ? 'hot' : id === s.end ? 'bad' : seen ? 'good' : '' }] };
    });
    H.table(v, ['순서', '구성 요소', '상태'], rows, '요청이 지나는 길 (위에서 아래로 들어가고, 응답은 마지막 줄에서 나갑니다)');
  },
  // 그림: 요청이 지나는 구성 요소를 위에서 아래로 늘어놓는다. 어디까지 갔고 어디를 건너뛰었는지가 보인다.
  draw: function (P, sim, shown) {
    var c = sim.c, last = shown[shown.length - 1], s = last ? last.snap : { seen: [], cur: null, end: null, resp: '' }, done = shown.length === sim.events.length && shown.length > 0;
    var stages = this.STAGES.filter(function (st) { return !(st[0] === 'VR' && sim.rest) && !(st[0] === 'EX' && c.what !== 'ex'); }), group = { F1: '톰캣', DS: '스프링 MVC', F2: '톰캣' };
    P.size(680, 60 + stages.length * 29 + 62);
    P.region('path', 16, 16, 648, 42 + stages.length * 29, '요청이 지나는 길 (위에서 아래로)');
    stages.forEach(function (st, i) { var id = st[0], seen = s.seen.indexOf(id) >= 0; P.box('st_' + id, 28, 50 + i * 29, 624, 25, { cls: id === s.cur ? 'hot now' : id === s.end ? 'bad' : seen ? 'good' : 'ghost', title: (i + 1) + '. ' + st[1], right: id === s.cur ? '지금 여기' : id === s.end ? '여기서 문제 발생' : seen ? '지나감' : done ? '건너뜀' : (group[id] || '') }); });
    P.box('resp', 16, 70 + stages.length * 29, 648, 34, { cls: !done ? 'ghost' : /^2/.test(s.resp) ? 'good' : 'bad', title: '클라이언트가 받는 응답', right: done ? s.resp : '처리 중' });
    P.note('초록은 지나간 곳, 노랑은 지금 있는 곳, 빨강은 문제가 생긴 곳, 점선은 건너뛴 곳입니다.');
  },
  assume: '인터셉터와 필터가 각각 하나씩 있는 단순한 구성으로 그렸습니다. 열여섯 가지 조합 모두를 실제 스프링 부트 4.1.1 서버(내장 톰캣)에 HTTP 요청을 보내, 응답 코드와 컨트롤러·postHandle·afterCompletion의 실행 여부, 응답을 만든 곳이 화면과 일치하는 것을 확인했습니다(화면 응답은 템플릿 엔진 대신 같은 이름의 뷰 객체로 그려서 확인). 처리되지 않은 예외가 /error로 다시 전달되어 500 응답이 되는 부분은 스프링 부트의 기본 오류 처리 동작이며, 그 재전달 과정은 한 단계로 줄여서 표현했습니다. 매핑되는 컨트롤러가 없는 경우(404)는 버전과 정적 리소스 설정에 따라 경로가 달라서 넣지 않았습니다.',
});

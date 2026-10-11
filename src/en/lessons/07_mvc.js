Lab.register({
  id: 'mvc', nav: 'Spring MVC request flow', cat: 'Spring', mode: 'step',
  title: 'How one request reaches the controller, and how it goes back',
  intro: 'MVC is a pattern that divides a program into the model (the data), the view (the display), and the controller (the part that receives and handles a request), and Spring MVC handles web requests in this way. An HTTP request passes through the filters, DispatcherServlet, and the interceptors in turn before it arrives at the controller, and it becomes a response by going back the same way in reverse. This lab follows the path of one request and shows at which step the controller, the model, and the view each do their work.',
  terms: ['MVC (Model-View-Controller)', 'DispatcherServlet and the front controller pattern', 'HandlerMapping and HandlerAdapter', 'HandlerMethodArgumentResolver', 'HttpMessageConverter', 'Servlet filter', 'Interceptor (HandlerInterceptor)', '@ControllerAdvice and @ExceptionHandler', 'ViewResolver'], ranks: ['mvc', 'filter'],
  controls: [
    { id: 'kind', label: 'Kind of controller', type: 'select', value: 'rest', options: [['rest', '@RestController (JSON response)'], ['view', '@Controller (returns a view name)']] },
    { id: 'what', label: 'What happens along the way', type: 'select', value: 'none', options: [['none', 'Nothing (handled normally)'], ['filter', 'A filter rejects the request (authentication failure)'], ['pre', 'The interceptor preHandle returns false'], ['ex', 'The controller throws an exception']] },
    { id: 'advice', label: 'An @ControllerAdvice has an @ExceptionHandler that handles this exception', type: 'check', value: true, show: function (c) { return c.what === 'ex'; } },
  ],
  presets: [
    { t: 'Default settings', d: 'The full path of a JSON API request that is handled normally.', v: { kind: 'rest', what: 'none', advice: true } },
    { t: 'A controller that returns a view', d: 'The ViewResolver and view rendering step is added.', v: { kind: 'view', what: 'none', advice: true } },
    { t: 'Exception in the controller', d: 'An @ExceptionHandler produces the response. postHandle is skipped.', v: { kind: 'rest', what: 'ex', advice: true } },
    { t: 'With nothing to handle the exception', d: 'The exception propagates up to the servlet container and becomes a 500 response.', v: { kind: 'rest', what: 'ex', advice: false } },
    { t: 'Rejected by a filter', d: 'The request does not even reach DispatcherServlet. @ControllerAdvice cannot take part either.', v: { kind: 'rest', what: 'filter', advice: true } },
    { t: 'Stopped by the interceptor', d: 'The request goes back without the controller being called.', v: { kind: 'rest', what: 'pre', advice: true } },
  ],
  code: function (c) {
    var ctl = c.kind === 'rest'
      ? '@RestController\nclass OrderController {\n    @PostMapping("/orders")\n    OrderResponse create(@RequestBody OrderRequest req) {\n' + (c.what === 'ex' ? '        throw new OutOfStockException();   // out of stock\n' : '        return orderService.create(req);\n') + '    }\n}'
      : '@Controller\nclass OrderController {\n    @GetMapping("/orders")\n    String list(Model model) {\n' + (c.what === 'ex' ? '        throw new OutOfStockException();   // an exception is thrown\n' : '        model.addAttribute("orders", orderService.findAll());\n        return "orders/list";              // view name\n') + '    }\n}';
    if (c.what === 'filter') ctl = 'class AuthFilter extends OncePerRequestFilter {\n    protected void doFilterInternal(req, res, chain) {\n        if (!hasValidToken(req)) {\n            res.sendError(401);            // the request ends here\n            return;                        // chain.doFilter is not called\n        }\n        chain.doFilter(req, res);\n    }\n}\n\n' + ctl;
    if (c.what === 'pre') ctl = 'class LoginCheckInterceptor implements HandlerInterceptor {\n    public boolean preHandle(req, res, handler) {\n        if (notLoggedIn(req)) {\n            res.sendError(401);\n            return false;                  // the controller is not called\n        }\n        return true;\n    }\n}\n\n' + ctl;
    if (c.what === 'ex' && c.advice) ctl += '\n\n@RestControllerAdvice\nclass GlobalExceptionHandler {\n    @ExceptionHandler(OutOfStockException.class)\n    ResponseEntity<ErrorResponse> handle(OutOfStockException e) {\n        return ResponseEntity.status(409)\n            .body(new ErrorResponse("Out of stock"));\n    }\n}';
    return ctl;
  },
  label: function (c) { return (c.kind === 'rest' ? '@RestController' : '@Controller') + ' · ' + { none: 'handled normally', filter: 'rejected by a filter', pre: 'preHandle false', ex: 'controller exception' + (c.advice ? ' · handler present' : ' · no handler') }[c.what]; },
  columns: ['Response', 'Controller method', 'postHandle', 'afterCompletion', 'Response produced by'],
  STAGES: [['F1', 'Filters (request going in)'], ['DS', 'DispatcherServlet'], ['HM', 'HandlerMapping'], ['HA', 'HandlerAdapter'], ['IP', 'Interceptor preHandle'], ['AR', 'ArgumentResolver'], ['CT', 'Controller method'], ['RV', 'Return value handling'], ['PO', 'Interceptor postHandle'], ['VR', 'ViewResolver and view rendering'], ['EX', 'HandlerExceptionResolver'], ['AC', 'Interceptor afterCompletion'], ['F2', 'Filters (response going out)']],
  simulate: function (c) {
    var rest = c.kind === 'rest', ev = [], seen = [], end = null, resp = '', maker = '', req = rest ? 'POST /orders' : 'GET /orders';
    function go(id, s, k) { seen.push(id); if (k === 'bad' && !end) end = id; ev.push({ s: s, k: k === 'end' ? 'good' : k, snap: { seen: seen.slice(), cur: id, end: end, resp: resp } }); }
    if (c.what === 'filter') {
      resp = '401 Unauthorized'; maker = 'Filter';
      go('F1', req + ' arrives at the servlet container (Tomcat) and enters the filter chain. The authentication filter checks the token, and the token is not valid. The filter does not pass the request on to the next step (it does not call chain.doFilter) and writes a 401 response itself.', 'bad');
      go('F2', 'The request did not reach DispatcherServlet. The interceptors, the controller, and @ControllerAdvice, which are inside Spring MVC, do not even know that this request existed. A problem that occurs in a filter has to be turned into a response in the filter.', '');
    } else {
      go('F1', req + ' arrives at the servlet container (Tomcat) and enters the filter chain. Filters work outside Spring MVC, at the servlet level. The encoding, authentication, and logging filters each call chain.doFilter in turn to pass the request on.', '');
      go('DS', 'DispatcherServlet receives the request. Every request comes in through this one servlet, which sends each request to the right controller (the front controller pattern).', '');
      go('HM', 'HandlerMapping looks for the handler for ' + req + '. It returns ' + (rest ? 'the create method annotated with @PostMapping("/orders")' : 'the list method annotated with @GetMapping("/orders")') + ' together with the list of interceptors that apply to this path.', '');
      go('HA', 'A HandlerAdapter is chosen. RequestMappingHandlerAdapter, which knows how to run annotated controller methods, is selected.', '');
      if (c.what === 'pre') {
        resp = '401 Unauthorized'; maker = 'Interceptor';
        go('IP', 'The preHandle method of the interceptor runs. The request is not logged in, so preHandle writes a 401 response and returns false. DispatcherServlet stops handling the request here. The controller and postHandle are not called.', 'bad');
        go('F2', 'The afterCompletion method of the interceptor that returned false is not called either (if other interceptors had returned true before it, only theirs are called). The response goes out back through the filter chain.', '');
      } else {
        go('IP', 'The preHandle method of the interceptor runs and returns true. Unlike a filter, an interceptor works knowing which controller method is going to run.', '');
        go('AR', rest ? 'HandlerMethodArgumentResolver prepares the arguments for the parameters of the controller method. For the parameter annotated with @RequestBody, HttpMessageConverter (Jackson) converts the JSON in the request body into an OrderRequest object and fills it in.' : 'HandlerMethodArgumentResolver prepares the arguments for the parameters of the controller method. For the parameter of type Model, it passes in an empty model object that will hold the data for the view.', '');
        if (c.what === 'ex') {
          go('CT', 'The controller method throws an OutOfStockException while it runs. Return value handling and postHandle are skipped.', 'bad');
          if (c.advice) {
            resp = '409 Conflict + error JSON'; maker = '@ExceptionHandler';
            go('EX', 'DispatcherServlet catches the exception and passes it to HandlerExceptionResolver. It finds the @ExceptionHandler method in the @ControllerAdvice that handles OutOfStockException and runs it, and the return value of that method is written as the body of the 409 response.', '');
            go('AC', 'The afterCompletion method of the interceptor is called. It is called even when an exception was thrown, so this is the place for releasing resources or recording the elapsed time.', '');
            go('F2', 'The response goes out to the client back through the filter chain. The exception was turned into a response inside Spring MVC, so no exception reaches the filters.', 'end');
          } else {
            resp = '500 Internal Server Error'; maker = 'Servlet container and /error';
            go('EX', 'DispatcherServlet catches the exception and passes it to HandlerExceptionResolver, but no @ExceptionHandler handles this exception. The unhandled exception is thrown again out of DispatcherServlet.', 'bad');
            go('AC', 'The afterCompletion method of the interceptor is called in this case too (the exception object is passed in as an argument).', '');
            go('F2', 'The exception passes through the filters and propagates up to the servlet container. In Spring Boot, the container sends the request again to the /error path, and the default error controller produces a 500 response.', 'bad');
          }
        } else {
          go('CT', 'The controller method runs. It calls the service layer to do the actual business work.', '');
          if (rest) { resp = '200 OK + JSON'; maker = 'Controller return value';
            go('RV', 'The return value is handled. Because this is an @RestController, no view is looked up, and HttpMessageConverter (Jackson) converts the OrderResponse object into JSON and writes it directly to the response body.', '');
            go('PO', 'The postHandle method of the interceptor is called. The response body was already written in the previous step, so it is too late to change the response here.', '');
          } else { resp = '200 OK + HTML'; maker = 'View (template)';
            go('RV', 'The return value is handled. The string "orders/list" returned by the @Controller is interpreted as a view name and is bundled with the model into a ModelAndView.', '');
            go('PO', 'The postHandle method of the interceptor is called. The view has not been rendered yet, so common data can still be added to the model.', '');
            go('VR', 'ViewResolver resolves the view name "orders/list" to an actual template file, and the view renders the HTML with the model data and writes it to the response.', '');
          }
          go('AC', 'The afterCompletion method of the interceptor is called. This is after the response has been written, and it is called whether or not an exception was thrown.', '');
          go('F2', 'The response goes out to the client back through the filter chain. Filter code written after the chain.doFilter call runs at this point.', 'end');
        }
      }
    }
    var has = function (id) { return seen.indexOf(id) >= 0; }, yn = function (b) { return b ? 'ran' : 'skipped'; };
    var sum = [];
    if (c.what === 'filter') sum.push('Filters come before DispatcherServlet, so an exception thrown in a filter or a rejection by a filter cannot be handled with @ControllerAdvice.');
    if (c.what === 'ex') sum.push('When the controller throws an exception, postHandle is not called but afterCompletion is. That is why "cleanup work that must always run" goes in afterCompletion.');
    if (c.what === 'none' && rest) sum.push('An @RestController does not go through ViewResolver. The returned object becomes the response body directly through HttpMessageConverter.');
    if (!sum.length) sum.push('The final response is ' + resp + '. Response produced by: ' + maker + '.');
    return { events: ev, summary: sum, rest: rest, row: [resp, yn(has('CT')), yn(has('PO')), yn(has('AC')), maker] };
  },
  render: function (v, sim, t, H, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : { seen: [], cur: null, end: null, resp: '' }, done = shown.length === sim.events.length, c = sim.c;
    var rows = this.STAGES.filter(function (st) { return !(st[0] === 'VR' && sim.rest) && !(st[0] === 'EX' && c.what !== 'ex'); }).map(function (st, i) {
      var id = st[0], seen = s.seen.indexOf(id) >= 0, state = id === s.cur ? 'now here' : seen ? (id === s.end ? 'problem occurred here' : 'passed') : done ? 'skipped' : '';
      return { cls: !seen && done ? 'gone' : '', cells: [String(i + 1), st[1], { v: state, cls: id === s.cur ? 'hot' : id === s.end ? 'bad' : seen ? 'good' : '' }] };
    });
    H.table(v, ['Order', 'Component', 'State'], rows, 'The path of the request (it goes in from top to bottom, and the response goes out at the last row)');
  },
  // Diagram: the components the request passes through, laid out from top to bottom. It shows how far the request got and which components were skipped.
  draw: function (P, sim, shown) {
    var c = sim.c, last = shown[shown.length - 1], s = last ? last.snap : { seen: [], cur: null, end: null, resp: '' }, done = shown.length === sim.events.length && shown.length > 0;
    var stages = this.STAGES.filter(function (st) { return !(st[0] === 'VR' && sim.rest) && !(st[0] === 'EX' && c.what !== 'ex'); }), group = { F1: 'Tomcat', DS: 'Spring MVC', F2: 'Tomcat' };
    P.size(680, 60 + stages.length * 29 + 62);
    P.region('path', 16, 16, 648, 42 + stages.length * 29, 'The path of the request (top to bottom)');
    stages.forEach(function (st, i) { var id = st[0], seen = s.seen.indexOf(id) >= 0; P.box('st_' + id, 28, 50 + i * 29, 624, 25, { cls: id === s.cur ? 'hot now' : id === s.end ? 'bad' : seen ? 'good' : 'ghost', title: (i + 1) + '. ' + st[1], right: id === s.cur ? 'now here' : id === s.end ? 'problem occurred here' : seen ? 'passed' : done ? 'skipped' : (group[id] || '') }); });
    P.box('resp', 16, 70 + stages.length * 29, 648, 34, { cls: !done ? 'ghost' : /^2/.test(s.resp) ? 'good' : 'bad', title: 'Response the client receives', right: done ? s.resp : 'In progress' });
    P.note('Green marks a component the request has passed, yellow marks where it is now, red marks where a problem occurred, and a dashed outline marks a skipped component.');
  },
  assume: 'The lab shows a simple setup with one interceptor and one filter. For all 16 combinations, HTTP requests were sent to a real Spring Boot 4.1.1 server (embedded Tomcat), and the response code, whether the controller, postHandle, and afterCompletion ran, and what produced the response were confirmed to match the screen (the view response was checked by rendering with a view object of the same name instead of a template engine). That an unhandled exception is forwarded again to /error and becomes a 500 response is the default error handling behavior of Spring Boot, and that forwarding is shown as a single step. The case where no controller is mapped to the request (404) is not included, because the path differs depending on the version and the static resource configuration.',
});

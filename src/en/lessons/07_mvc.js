Lab.register({
  id: 'mvc', nav: 'Spring MVC request flow', cat: 'Spring', mode: 'step',
  title: 'How one request reaches the controller, and how it goes back',
  why: 'If you build a web application with servlets alone, you need one servlet for each URL, and every servlet repeats the common code that takes out request values, converts their types, and builds the response. Spring MVC gathers the entry point for requests into one DispatcherServlet. The framework takes care of finding the method that matches the URL, turning request values into method arguments, and turning return values into responses, so only the handling that differs from request to request is left in the controller.',
  use: 'In an application built with Spring MVC, both @Controller, which returns pages, and @RestController, which returns JSON, work with this structure. Work that applies to every request, such as checking login, goes into a filter or an interceptor, and turning exceptions into responses is gathered in one place with @RestControllerAdvice. When there are very many requests that spend most of their time waiting for external calls, some applications use Spring WebFlux, which is non-blocking, instead.',
  intro: 'MVC is a pattern that divides a program into the model (the data), the view (the display), and the controller (the part that receives and handles a request), and Spring MVC handles web requests in this way. An HTTP request passes through the filters, DispatcherServlet, and the interceptors in turn before it arrives at the controller, and it becomes a response by going back the same way in reverse. This lab shows at which step along the path of one request the controller, the model, and the view each do their work, and which of them are absent with an @RestController that returns JSON.',
  terms: ['MVC (Model-View-Controller)', 'DispatcherServlet and the front controller pattern', 'HandlerMapping and HandlerAdapter', 'HandlerMethodArgumentResolver', 'HttpMessageConverter', 'Servlet filter', 'Interceptor (HandlerInterceptor)', '@ControllerAdvice and @ExceptionHandler', 'ViewResolver'], ranks: ['mvc', 'filter'],
  controls: [
    { id: 'kind', label: 'Kind of controller', type: 'select', value: 'view', options: [['view', '@Controller (returns a view name)'], ['rest', '@RestController (JSON response)']] },
    { id: 'what', label: 'What happens along the way', type: 'select', value: 'none', options: [['none', 'Nothing (handled normally)'], ['filter', 'A filter rejects the request (authentication failure)'], ['pre', 'The interceptor preHandle returns false'], ['ex', 'The controller throws an exception']] },
    { id: 'advice', label: 'An @RestControllerAdvice class has an @ExceptionHandler that handles this exception', type: 'check', value: true, show: function (c) { return c.what === 'ex'; } },
  ],
  presets: [
    { t: 'Default settings', q: 'Which path does a request take when an @Controller returns a view name and nothing goes wrong along the way?', d: 'The full path of a request that returns a page and is handled normally. The controller, the model, and the view all appear.', v: { kind: 'view', what: 'none', advice: true } },
    { t: 'A controller that returns JSON', q: 'What if you change the kind of controller to @RestController?', d: 'The returned object becomes the response body directly, without a model or a view.', v: { kind: 'rest', what: 'none', advice: true } },
    { t: 'Exception in the controller', q: 'What if an @RestController throws an exception and an @ControllerAdvice has an @ExceptionHandler for it?', d: 'An @ExceptionHandler produces the response. postHandle is skipped.', v: { kind: 'rest', what: 'ex', advice: true } },
    { t: 'With nothing to handle the exception', q: 'What if an @RestController throws an exception and no @ControllerAdvice has an @ExceptionHandler for it?', d: 'The exception propagates up to the servlet container and becomes a 500 response.', v: { kind: 'rest', what: 'ex', advice: false } },
    { t: 'Rejected by a filter', q: 'What if a filter rejects the request to an @RestController because authentication fails?', d: 'The request does not even reach DispatcherServlet. @ControllerAdvice cannot take part either.', v: { kind: 'rest', what: 'filter', advice: true } },
    { t: 'Stopped by the interceptor', q: 'What if the interceptor preHandle returns false for a request to an @RestController?', d: 'The request goes back without the controller being called.', v: { kind: 'rest', what: 'pre', advice: true } },
  ],
  code: function (c) {
    var ctl = c.kind === 'rest'
      ? '@RestController\nclass OrderController {\n    @PostMapping("/orders")\n    OrderResponse create(@RequestBody OrderRequest req) {\n' + (c.what === 'ex' ? '        throw new OutOfStockException();   // out of stock\n' : '        return orderService.create(req);\n') + '    }\n}'
      : '@Controller\nclass OrderController {\n    @GetMapping("/orders")\n    String list(Model model) {\n' + (c.what === 'ex' ? '        throw new OutOfStockException();   // an exception is thrown\n' : '        model.addAttribute("orders", orderService.findAll());\n        return "orders/list";              // view name\n') + '    }\n}';
    if (c.what === 'filter') ctl = 'class AuthFilter extends OncePerRequestFilter {\n    @Override\n    protected void doFilterInternal(HttpServletRequest req, HttpServletResponse res,\n            FilterChain chain) throws ServletException, IOException {\n        if (!hasValidToken(req)) {         // hasValidToken: a method made for this example\n            res.sendError(401);            // the request ends here\n            return;                        // chain.doFilter is not called\n        }\n        chain.doFilter(req, res);\n    }\n}\n\n' + ctl;
    if (c.what === 'pre') ctl = 'class LoginCheckInterceptor implements HandlerInterceptor {\n    @Override\n    public boolean preHandle(HttpServletRequest req, HttpServletResponse res,\n            Object handler) throws IOException {\n        if (notLoggedIn(req)) {            // notLoggedIn: a method made for this example\n            res.sendError(401);\n            return false;                  // the controller is not called\n        }\n        return true;\n    }\n}\n\n' + ctl;
    if (c.what === 'ex' && c.advice) ctl += '\n\n@RestControllerAdvice\nclass GlobalExceptionHandler {\n    @ExceptionHandler(OutOfStockException.class)\n    ResponseEntity<ErrorResponse> handle(OutOfStockException e) {\n        return ResponseEntity.status(409)\n            .body(new ErrorResponse("Out of stock"));\n    }\n}';
    return '// Only the needed parts are kept: the imports and the declarations of the fields, classes, and methods made for this example are left out.\n\n' + ctl;
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
        go('AR', rest ? 'HandlerMethodArgumentResolver prepares the arguments for the parameters of the controller method. For the parameter annotated with @RequestBody, HttpMessageConverter (Jackson) converts the JSON in the request body into an OrderRequest object and fills it in.' : 'HandlerMethodArgumentResolver prepares the arguments for the parameters of the controller method. For the parameter of type Model, it passes in an empty Model object to which the data for the view will be added. The data added to it is the model (M) of MVC.', '');
        if (c.what === 'ex') {
          go('CT', 'The controller method throws an OutOfStockException (an exception class made for this example) while it runs. Return value handling and postHandle are skipped.', 'bad');
          if (c.advice) {
            resp = '409 Conflict + error JSON'; maker = '@ExceptionHandler';
            go('EX', 'DispatcherServlet catches the exception and passes it to HandlerExceptionResolver. The @RestControllerAdvice in the code is a Spring annotation that combines @ControllerAdvice with @ResponseBody. Like @ControllerAdvice, it handles exceptions from many controllers in one place, and the return values of its @ExceptionHandler methods are written as the response body. Spring finds the @ExceptionHandler method that handles OutOfStockException in that class (GlobalExceptionHandler, a class made for this example) and runs it, and the 409 status and body of the ResponseEntity that the method returns become the response.', '');
            go('AC', 'The afterCompletion method of the interceptor is called. It is called even when an exception was thrown, so this is the place for releasing resources or recording the elapsed time.', '');
            go('F2', 'The response goes out to the client back through the filter chain. The exception was turned into a response inside Spring MVC, so no exception reaches the filters.', 'end');
          } else {
            resp = '500 Internal Server Error'; maker = 'Servlet container and /error';
            go('EX', 'DispatcherServlet catches the exception and passes it to HandlerExceptionResolver, but no @ExceptionHandler handles this exception. The unhandled exception is thrown again out of DispatcherServlet.', 'bad');
            go('AC', 'The afterCompletion method of the interceptor is called in this case too (the exception object is passed in as an argument).', '');
            go('F2', 'The exception passes through the filters and propagates up to the servlet container. In Spring Boot, the container sends the request again to the /error path, and the default error controller produces a 500 response.', 'bad');
          }
        } else {
          go('CT', rest ? 'The controller method runs. This is the step where the controller (C) of MVC does its work. It calls the service layer to do the actual business work and returns the result as an OrderResponse object (a class made for this example).' : 'The controller method runs. This is the step where the controller (C) of MVC does its work. It calls the service layer to get the list of orders, puts the list into the model under the name orders, and returns the view name "orders/list".', '');
          if (rest) { resp = '200 OK + JSON'; maker = 'Controller return value';
            go('RV', 'The return value is handled. Because this is an @RestController, no view is looked up, and HttpMessageConverter (Jackson) converts the OrderResponse object into JSON and writes it directly to the response body. Nothing is put into a model and handed to a view, so on this path there is no step where a view (V) does its work.', '');
            go('PO', 'The postHandle method of the interceptor is called. The response body was already written in the previous step, so it is too late to change the response here.', '');
          } else { resp = '200 OK + HTML'; maker = 'View (template)';
            go('RV', 'The return value is handled. The string "orders/list" returned by the @Controller is interpreted as a view name and is bundled with the model into a ModelAndView.', '');
            go('PO', 'The postHandle method of the interceptor is called. The view has not been rendered yet, so common data can still be added to the model.', '');
            go('VR', 'ViewResolver resolves the view name "orders/list" to an actual template file, and the view renders the HTML with the model data and writes it to the response. This is the step where the view (V) of MVC does its work, and it reads the orders that the controller put into the model.', '');
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
    if (c.what === 'none' && !rest) sum.push('The controller handles the request, puts the data into the model, and returns only a view name. The view receives that model and renders the HTML. DispatcherServlet is what connects the two.');
    if (!sum.length) sum.push('The final response is ' + resp + '. Response produced by: ' + maker + '.');
    return { events: ev, summary: sum, rest: rest, row: [resp, yn(has('CT')), yn(has('PO')), yn(has('AC')), maker] };
  },
// The steps where the three roles of MVC (M model, V view, C controller) do their work. When a page is returned, the model is created (AR), filled (CT), and used by the view (VR). When JSON is returned, only the controller does its work.
  ROLE: function (id, c) {
    if (c.kind === 'rest') return id === 'CT' ? 'C' : '';
    return (c.what === 'ex' ? { AR: 'M', CT: 'C', VR: 'V' } : { AR: 'M', CT: 'C, M', VR: 'V, M' })[id] || '';
  },
  render: function (v, sim, t, H, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : { seen: [], cur: null, end: null, resp: '' }, done = shown.length === sim.events.length, c = sim.c, self = this;
    var rows = this.STAGES.filter(function (st) { return !(st[0] === 'VR' && sim.rest) && !(st[0] === 'EX' && c.what !== 'ex'); }).map(function (st, i) {
      var id = st[0], seen = s.seen.indexOf(id) >= 0, state = id === s.cur ? 'now here' : seen ? (id === s.end ? 'problem here' : 'passed') : done ? 'skipped' : '';
      return { cls: !seen && done ? 'gone' : '', cells: [String(i + 1), st[1], self.ROLE(id, c), { v: state, cls: id === s.cur ? 'hot' : id === s.end ? 'bad' : seen ? 'good' : '' }] };
    });
    H.table(v, ['Order', 'Component', 'MVC', 'State'], rows, 'The path of the request (it goes in from top to bottom, and the response goes out at the last row)');
  },
  // Diagram: on the left, the components the request passes through, laid out from top to bottom; on the right, the three roles of MVC.
  // Each arrow starts at the step where that role does its work, and the role box lights up when the request reaches that step.
  draw: function (P, sim, shown) {
    var c = sim.c, rest = sim.rest, ex = c.what === 'ex', last = shown[shown.length - 1], s = last ? last.snap : { seen: [], cur: null, end: null, resp: '' }, done = shown.length === sim.events.length && shown.length > 0;
    var stages = this.STAGES.filter(function (st) { return !(st[0] === 'VR' && sim.rest) && !(st[0] === 'EX' && c.what !== 'ex'); }), group = { F1: 'Tomcat', DS: 'Spring MVC', F2: 'Tomcat' };
    var at = function (id) { return s.seen.indexOf(id) >= 0; }, num = function (id) { for (var i = 0; i < stages.length; i++) if (stages[i][0] === id) return 'Step ' + (i + 1) + ': '; return ''; };
    P.size(680, 60 + stages.length * 29 + 62);
    P.region('path', 16, 16, 396, 42 + stages.length * 29, 'The path of the request (top to bottom)');
    stages.forEach(function (st, i) { var id = st[0], seen = s.seen.indexOf(id) >= 0; P.box('st_' + id, 28, 50 + i * 29, 372, 25, { cls: id === s.cur ? 'hot now' : id === s.end ? 'bad' : seen ? 'good' : 'ghost', title: (i + 1) + '. ' + st[1], right: id === s.cur ? 'now here' : id === s.end ? 'problem here' : seen ? 'passed' : done ? 'skipped' : (group[id] || '') }); });
    P.region('roles', 440, 114, 224, 246, 'The three roles of MVC');
    var mSub = rest ? ['Model object is not used', 'Return value becomes JSON'] : !at('AR') ? [done ? 'Not created' : 'Not created yet'] : [num('AR') + 'created empty'].concat(!at('CT') ? [] : ex ? [num('CT') + 'exception first'] : [num('CT') + 'orders added']).concat(at('VR') ? [num('VR') + 'read by view'] : []);
    var cSub = [rest ? 'OrderController.create()' : 'OrderController.list()', !at('CT') ? (done ? 'Not called' : 'Not called yet') : num('CT') + (ex ? 'exception thrown' : s.cur === 'CT' ? 'running' : 'finished')];
    var vSub = rest ? ['None', at('RV') ? num('RV') + 'JSON, no view' : 'Not used for JSON'] : ['orders/list template', at('VR') ? num('VR') + 'renders the HTML' : done ? 'Not rendered' : at('RV') ? 'View name decided' : 'Not used yet'];
    var on = function (ids) { return ids.indexOf(s.cur) >= 0 ? 'hot' : ids.filter(at).length ? 'good' : 'ghost'; };
    P.box('role_M', 450, 146, 204, 72, { cls: rest ? 'ghost' : on(ex ? ['AR'] : ['AR', 'CT', 'VR']), title: 'Model', sub: mSub });
    P.box('role_C', 450, 226, 204, 58, { cls: s.end === 'CT' ? 'bad' : on(['CT']), title: 'Controller', sub: cSub });
    P.box('role_V', 450, 292, 204, 58, { cls: rest ? 'ghost' : on(['VR']), title: 'View', sub: vSub });
    var link = function (id, to) { P.arrow('ar_' + id, 'st_' + id + ':r', to, { cls: id === s.cur ? 'hot' : at(id) ? (id === s.end ? 'bad' : 'good') : done ? 'mut dash' : 'mut' }); };
    if (!rest) link('AR', 'role_M:l:0.85');
    link('CT', 'role_C:l:0.18');
    if (!rest) link('VR', 'role_V:l:0.54');
    P.box('resp', 16, 70 + stages.length * 29, 648, 34, { cls: !done ? 'ghost' : /^2/.test(s.resp) ? 'good' : 'bad', title: 'Response the client receives', right: done ? s.resp : 'In progress' });
    P.note('Green marks a component the request has passed, yellow marks where it is now, red marks where a problem occurred, and a dashed outline marks a skipped component.');
  },
  assume: 'The lab shows a simple setup with one interceptor and one filter. For all 16 combinations, HTTP requests were sent to a real Spring Boot 4.1.1 server (embedded Tomcat), and the response code, whether the controller, postHandle, and afterCompletion ran, and what produced the response were confirmed to match the screen (the view response was checked by rendering with a view object of the same name instead of a template engine). That an unhandled exception is forwarded again to /error and becomes a 500 response is the default error handling behavior of Spring Boot, and that forwarding is shown as a single step. The case where no controller is mapped to the request (404) is not included, because the path differs depending on the version and the static resource configuration.',
});

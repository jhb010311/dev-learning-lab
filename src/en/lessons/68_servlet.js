Lab.register({
  id: 'servlet', nav: 'Servlets', cat: 'Spring', mode: 'step',
  title: 'How an HTTP request reaches Java code',
  intro: 'What a browser sends is an HTTP request made of text. A servlet container such as Tomcat reads that text, turns it into Java objects, and calls the method of the servlet that is mapped to the path. A servlet is a Java class that "receives a request object and writes to a response object". Change the request and see who does what, when the servlet object is created, and how many times it is used.',
  terms: ['Servlet and servlet container', 'DispatcherServlet and the front controller pattern', 'Embedded server', 'Web server and application server', 'Tomcat\'s threading model', 'HTTP methods'], ranks: ['mvc', 'was'],
  controls: [
    { id: 'kind', label: 'How it is built', type: 'select', value: 'plain', options: [['plain', 'Write a servlet directly'], ['spring', 'Spring MVC (write a controller)']] },
    { id: 'req', label: 'Request that the browser sends', type: 'select', value: 'get', options: [['get', 'GET /hello?name=Alice'], ['post', 'POST /hello'], ['none', 'GET /nothing (a path that nothing is mapped to)']] },
    { id: 'impl', label: 'HTTP methods that the code handles', type: 'select', value: 'get', options: [['get', 'GET only'], ['both', 'Both GET and POST']] },
    { id: 'n', label: 'Number of times the same request is sent', type: 'range', min: 1, max: 3, value: 2, fmt: function (v) { return v + ''; } },
    { id: 'startup', label: 'Prepare the servlet in advance when the server starts (loadOnStartup)', type: 'check', value: false },
  ],
  presets: [
    { t: 'Default settings', d: 'GET /hello twice. The servlet object is created only once, at the first request.', v: { kind: 'plain', req: 'get', impl: 'get', n: 2, startup: false } },
    { t: 'Creating it at server startup', d: 'The setup work is done at server startup, not at the first request.', v: { kind: 'plain', req: 'get', impl: 'get', n: 2, startup: true } },
    { t: 'A POST arrives but there is only doGet', d: 'The request reaches the servlet but is rejected with 405.', v: { kind: 'plain', req: 'post', impl: 'get', n: 1, startup: false } },
    { t: 'A path that nothing is mapped to', d: 'No servlet matches, so the response is 404.', v: { kind: 'plain', req: 'none', impl: 'get', n: 1, startup: false } },
    { t: 'In Spring MVC', d: 'There is only one servlet, DispatcherServlet, and it calls the controller.', v: { kind: 'spring', req: 'get', impl: 'get', n: 2, startup: false } },
  ],
  code: function (c) {
    var both = c.impl === 'both';
    if (c.kind === 'plain') return '@WebServlet(urlPatterns = "/hello"' + (c.startup ? ', loadOnStartup = 1' : '') + ')\npublic class HelloServlet extends HttpServlet {\n\n    @Override\n    public void init() {                       // once, right after the object is created\n        // setup work\n    }\n\n    @Override\n    protected void doGet(HttpServletRequest req, HttpServletResponse resp)\n            throws IOException {\n        String name = req.getParameter("name");   // read from the request\n        resp.setContentType("text/plain; charset=UTF-8");\n        resp.getWriter().write("Hello, " + name);   // write to the response\n    }\n' + (both ? '\n    @Override\n    protected void doPost(HttpServletRequest req, HttpServletResponse resp)\n            throws IOException {\n        resp.setStatus(201);\n        resp.getWriter().write("Registered");\n    }\n' : '') + '\n    @Override\n    public void destroy() { }                  // once, when the server shuts down\n}';
    return '@RestController\nclass HelloController {\n\n    @GetMapping("/hello")\n    String hello(@RequestParam String name) {\n        return "Hello, " + name;\n    }\n' + (both ? '\n    @PostMapping("/hello")\n    @ResponseStatus(HttpStatus.CREATED)\n    String create() {\n        return "Registered";\n    }\n' : '') + '}\n\n// You do not write a servlet yourself.\n// Spring Boot registers a single DispatcherServlet at "/",\n// and that servlet calls the controller method that matches the path.' + (c.startup ? '\n\n# application.properties\nspring.mvc.servlet.load-on-startup=1' : '');
  },
  label: function (c) { return (c.kind === 'plain' ? 'Servlet written directly' : 'Spring MVC') + ' · ' + { get: 'GET /hello', post: 'POST /hello', none: 'GET /nothing' }[c.req] + ' × ' + c.n + ' · ' + (c.impl === 'both' ? 'handles GET and POST' : 'handles GET only') + (c.startup ? ' · created in advance' : ''); },
  columns: ['Response', 'When the servlet object was created', 'Objects created', 'init', 'Request handling calls', 'Response produced by'],
  simulate: function (c) {
    var plain = c.kind === 'plain', S = plain ? 'HelloServlet' : 'DispatcherServlet', ev = [], sum = [];
    var st = { made: 0, init: 0, svc: 0, destroy: 0, obj: 'none yet', thread: '', reqText: '', reqObj: '', respText: '', who: 'before server startup' };
    function push(s, k) { ev.push({ s: s, k: k, snap: JSON.parse(JSON.stringify(st)) }); }
    var line = { get: 'GET /hello?name=Alice HTTP/1.1', post: 'POST /hello HTTP/1.1', none: 'GET /nothing HTTP/1.1' }[c.req], path = c.req === 'none' ? '/nothing' : '/hello', method = c.req === 'post' ? 'POST' : 'GET';
    var mapped = plain ? c.req !== 'none' : true, handled = c.req === 'get' || (c.req === 'post' && c.impl === 'both'), status, body, maker, whenMade = 'not created';
    if (c.req === 'none') { status = '404 Not Found'; body = '(error page)'; maker = plain ? 'Default servlet of Tomcat' : 'DispatcherServlet and the /error controller'; }
    else if (!handled) { status = '405 Method Not Allowed'; body = '(error page)'; maker = plain ? 'Default doPost of HttpServlet' : 'DispatcherServlet and the /error controller'; }
    else if (c.req === 'get') { status = '200 OK'; body = 'Hello, Alice'; maker = plain ? 'HelloServlet.doGet' : 'HelloController.hello'; }
    else { status = '201 Created'; body = 'Registered'; maker = plain ? 'HelloServlet.doPost' : 'HelloController.create'; }
    function create(whenText) { st.made++; st.obj = S + ' × 1'; whenMade = whenText; push('Tomcat creates the ' + S + ' object ' + whenText + '. The developer does not create it with new. The container does. This one object is used until the server shuts down.', ''); st.init++; push(S + '.init() is called once. This is where the servlet does the setup it needs before it receives requests.' + (plain ? '' : ' At this point, DispatcherServlet prepares the Spring MVC components, such as the list of controllers.'), ''); }
    function initOnly(whenText) { st.init++; push('Tomcat calls init() of DispatcherServlet once ' + whenText + '. At this point, DispatcherServlet prepares the Spring MVC components, such as the list of controllers.', ''); }
    function errorDispatch() { st.svc++; push('To build the content of the error response, Spring Boot dispatches this request once more, to the /error path. Tomcat calls service() of DispatcherServlet again, and the error controller of Spring Boot (BasicErrorController) builds the body of the error response. This is why service() is called twice for one error response.', ''); }
    st.who = 'Tomcat (servlet container)';
    push('The server starts. Tomcat listens for connections on port 8080 and builds a table of "which servlet handles which path". ' + (plain ? 'It registers HelloServlet, which is annotated with @WebServlet("/hello"), as the servlet for /hello.' : 'Spring Boot registers a single DispatcherServlet as the servlet for "/" (all paths).') + (plain && !c.startup ? ' The servlet object has not been created yet.' : ''), '');
    if (plain) { if (c.startup) create('at server startup'); }
    else {
      st.made++; st.obj = S + ' × 1'; whenMade = c.startup ? 'at server startup' : 'at server startup (init at the first request)';
      push('Spring creates the DispatcherServlet object as a bean when the server starts and registers it with Tomcat. Unlike a servlet that you write directly, the object already exists.' + (c.startup ? '' : ' However, Tomcat calls init() only when the first request arrives.'), '');
      if (c.startup) initOnly('at server startup');
    }
    for (var i = 1; i <= c.n; i++) {
      st.reqText = line + '\nHost: localhost:8080' + (c.req === 'post' ? '\nContent-Type: application/x-www-form-urlencoded\n\nname=Alice' : ''); st.respText = ''; st.reqObj = ''; st.thread = '';
      push('Request #' + i + ': The browser connects to the server and sends an HTTP request. What it sends is a few lines of text, like the ones shown on the screen.', '');
      st.thread = 'http-nio-8080-exec-' + i; st.reqObj = 'HttpServletRequest (method ' + method + ', path ' + path + (c.req === 'get' ? ', parameter name=Alice' : c.req === 'post' ? ', body name=Alice' : '') + ') + an empty HttpServletResponse';
      push('Tomcat assigns a thread from its thread pool and parses the text it received into an HttpServletRequest object. It also creates an empty HttpServletResponse object to hold the response. The servlet does not have to parse the text itself. It only has to read the values from this object.', '');
      if (!mapped) { st.respText = 'HTTP/1.1 ' + status; push('Tomcat looks in the table for a servlet mapped to the path /nothing. There is none. The default servlet of Tomcat produces the 404 response. The HelloServlet that we wrote is not called.', 'bad'); continue; }
      push('Tomcat looks in the table for the servlet mapped to the path ' + path + '. ' + (plain ? 'It is HelloServlet.' : 'The DispatcherServlet registered at "/" handles all paths.'), '');
      if (plain && !st.made) create('at the first request'); else if (!plain && !st.init) initOnly('at the first request'); else if (i > 1 || c.startup) push('The ' + S + ' object already exists. Tomcat does not create a new one and uses that object again. It does not call init() again either.', 'good');
      st.svc++; st.who = S;
      if (plain) {
        push('Tomcat calls service(request, response) of ' + S + '. service() looks at the HTTP method of the request and calls ' + (method === 'GET' ? 'doGet()' : 'doPost()') + '.', '');
        if (handled) { st.respText = 'HTTP/1.1 ' + status + '\nContent-Type: text/plain;charset=UTF-8\n\n' + body; push((method === 'GET' ? 'doGet()' : 'doPost()') + ' runs the code that we wrote. ' + (method === 'GET' ? 'It reads name from request and ' : 'It ') + 'writes the status and the body to response.', 'good'); }
        else { st.respText = 'HTTP/1.1 ' + status; push('HelloServlet does not override doPost(). The default doPost() of the superclass HttpServlet runs, and it writes a 405 response that means "this URL does not support POST".', 'bad'); }
      } else {
        push('Tomcat calls service(request, response) of DispatcherServlet. The work of Tomcat ends here. Spring handles the rest.', '');
        if (c.req === 'none') { st.respText = 'HTTP/1.1 ' + status; push('DispatcherServlet looks for a controller method that handles /nothing. There is none. It sets the status of the response to 404.', 'bad'); errorDispatch(); }
        else if (!handled) { st.respText = 'HTTP/1.1 ' + status; push('DispatcherServlet looks for a controller method that handles /hello. There is a @GetMapping("/hello"), but there is none for POST. It sets the status of the response to 405.', 'bad'); errorDispatch(); }
        else { st.who = 'HelloController'; st.respText = 'HTTP/1.1 ' + status + '\nContent-Type: text/plain;charset=UTF-8\n\n' + body; push('DispatcherServlet finds the controller method that matches ' + method + ' /hello and calls it. It reads the values from request and passes them as arguments, and it writes the value that the method returns to response. DispatcherServlet does the work that we did ourselves when we wrote the servlet directly.', 'good'); }
      }
      st.who = 'Tomcat (servlet container)';
      push('The method of the servlet has finished. Tomcat turns the content of the HttpServletResponse into the text of an HTTP response and sends it to the browser. It discards the request and response objects used for this request and returns the thread to the pool. The ' + S + ' object stays as it is and waits for the next request.', '');
    }
    if (st.made) { st.destroy++; st.obj = 'gone'; st.reqText = ''; st.respText = ''; st.reqObj = ''; st.thread = ''; push('The server shuts down. Tomcat calls destroy() of ' + S + ' once and then discards the object. This is the chance to clean up the resources that were opened.', ''); }
    sum.push('Response: ' + status + '. Response produced by: ' + maker + '. ' + S + ' objects created: ' + st.made + ' (' + whenMade + '). init calls: ' + st.init + '. Request handling calls: ' + st.svc + '.');
    sum.push('A servlet is a Java class that receives one HTTP request and produces a response, and a servlet container (Tomcat) is the program that creates, calls, and destroys that servlet. The container accepts connections, turns the HTTP text into objects, and assigns threads, so the developer writes only the code that "reads from the request and writes to the response".');
    if (st.made && c.n > 1 && st.svc > 1) sum.push('The number of requests was ' + c.n + ', but there was only one servlet object. What is created anew for each request is the request and response objects. Several threads use the one servlet object at the same time, so you must not store per-request values in the fields of the servlet (the same reason as for singleton beans in Spring).');
    if (!c.startup && st.made) sum.push(plain ? 'When the servlet is not created in advance, object creation and init() happen while the first request is being handled, so only the first request is slow. If the setup work is heavy, create the servlet in advance at server startup.' : 'In Spring Boot, the DispatcherServlet object itself is created when the server starts, but init() happens while the first request is being handled, so only the first request is slow. When you set spring.mvc.servlet.load-on-startup, the servlet is initialized in advance at server startup.');
    if (!plain && st.svc > c.n) sum.push('In Spring Boot, the 404 and 405 responses are produced by dispatching the request once more, to the /error path. That is why the number of requests was ' + c.n + ' but service() of DispatcherServlet was called ' + st.svc + ' times. This is also why filters and interceptors appear to run twice for an error response.');
    if (!plain) sum.push('In Spring MVC, a controller is not a servlet. There is one servlet, DispatcherServlet, and every request comes into this servlet and is then routed to a controller. A controller can take HttpServletRequest as a parameter for the same reason: there is a servlet underneath. The detailed flow after that is in the "Spring MVC request flow" lab.');
    if (c.req === 'none' && plain) sum.push('404 means "nothing is mapped to that path", and 405 means "the path is right, but that HTTP method is not accepted". Set the handled methods to GET only, send a POST, and compare.');
    return { events: ev, summary: sum, row: [status, whenMade, st.made + '', st.init + '', st.svc + '', maker] };
  },
  render: function (v, sim, t, H, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : null, name = sim.c.kind === 'plain' ? 'HelloServlet' : 'DispatcherServlet';
    if (!s) { H.text(v, 'Click Run to start from the point where the server starts.'); return; }
    H.counters(v, [[s.made, name + ' objects created'], [s.init, 'init() calls'], [s.svc, 'service() calls'], [s.destroy, 'destroy() calls']]);
    var ln = H.lanes(v);
    H.lane(ln, 'Browser', s.reqText ? 'request sent' + (s.respText ? ' → response received' : '') : 'idle', s.reqText ? 'wait' : 'none');
    H.lane(ln, 'Tomcat', s.thread ? 'thread ' + s.thread + ' assigned · ' + (s.who.indexOf('Tomcat') === 0 ? 'Tomcat is working' : 'handed to the servlet') : s.who === 'before server startup' ? 'not started' : 'waiting for a request', s.who.indexOf('Tomcat') === 0 && s.thread ? 'hot' : s.thread ? '' : 'none');
    H.lane(ln, 'Servlet', s.obj + (s.who === name ? ' · running' : ''), s.obj === 'none yet' || s.obj === 'gone' ? 'none' : s.who === name ? 'hot' : 'good');
    if (sim.c.kind === 'spring') H.lane(ln, 'Controller', s.who === 'HelloController' ? 'HelloController method running' : 'idle as a Spring bean', s.who === 'HelloController' ? 'hot' : 'none');
    if (s.reqText) { H.title(v, 'What the browser sent (the HTTP request, as raw text)'); v.appendChild(H.el('pre', 'code', s.reqText)); }
    if (s.reqObj) { H.title(v, 'Java objects that Tomcat creates and passes to the servlet'); H.text(v, s.reqObj); }
    if (s.respText) { H.title(v, 'What goes back to the browser (the HTTP response, as raw text)'); v.appendChild(H.el('pre', 'code', s.respText)); }
  },
  // Diagram: the browser, Tomcat, and inside Tomcat the thread and the servlet object. There is only one servlet object, and for each request a thread runs it.
  draw: function (P, sim, shown) {
    var c = sim.c, spring = c.kind === 'spring', name = spring ? 'DispatcherServlet' : 'HelloServlet', last = shown[shown.length - 1], s = last ? last.snap : { made: 0, init: 0, svc: 0, destroy: 0, obj: 'none yet', thread: '', reqText: '', respText: '', who: 'before server startup' };
    var none = s.obj === 'none yet' || s.obj === 'gone', inServlet = s.who === name, inCtl = s.who === 'HelloController';
    P.size(680, 310);
    P.box('br', 16, 96, 130, 56, { cls: s.reqText ? 'wait' : 'plain', title: 'Browser', sub: s.respText ? 'got response' : s.reqText ? 'sent request' : 'idle' });
    P.region('tc', 186, 16, 478, 226, 'Tomcat (servlet container)' + (s.who === 'before server startup' ? ': not started' : ''));
    P.box('th', 202, 54, 210, 46, { cls: s.thread ? 'hot' : 'ghost', title: 'Thread for the request', sub: s.thread ? '' + s.thread : 'waiting for a request' });
    P.box('sv', 202, 150, 210, 76, { cls: none ? 'ghost' : inServlet ? 'hot now' : 'good', title: name + ' object', sub: [s.obj, 'init: ' + s.init + ', service: ' + s.svc + '', inServlet ? 'running now' : ' '] });
    if (spring) P.box('ct', 440, 150, 212, 76, { cls: inCtl ? 'hot now' : 'plain', title: 'HelloController', sub: ['Spring bean', inCtl ? 'method running' : 'idle'] });
    if (s.reqText) P.arrow('rq', 'br:r:0.3', 'th:l', { label: 'request' });
    if (s.thread && !none && (inServlet || inCtl || s.respText)) P.arrow('run', 'th:b', 'sv:t', { cls: 'hot', label: 'calls service()' });
    if (spring && inCtl) P.arrow('ctl', 'sv:r', 'ct:l', { cls: 'hot' });
    if (s.respText) P.arrow('rs', 'sv:l', 'br:b', { cls: 'good', label: 'response' });
    [['Objects created', s.made], ['init()', s.init], ['service()', s.svc], ['destroy()', s.destroy]].forEach(function (x, i) { P.box('cnt' + i, 16 + i * 164, 258, 156, 34, { cls: x[1] ? 'wait' : 'ghost', title: x[0], right: x[1] + '' }); });
    P.note('Tomcat creates the servlet object only once, and each time a request arrives, a thread calls service() on that object. The developer does not create it with new or call it directly. The numbers at the bottom are the call counts so far.');
  },
  assume: 'The model assumes that the servlet container is Tomcat and that requests arrive one at a time, in order. Three points follow the Jakarta Servlet specification and the documentation of HttpServlet: only one servlet object is created per servlet declaration, init and destroy are each called once, and a doPost that is not overridden returns 405. Only the main lines of the HTTP request and response text are shown. For the 36 combinations with a directly written servlet, requests were sent to a real Tomcat 11.0.24, and for the 12 combinations on the Spring MVC side, to a real Spring Boot 4.1.1, and it was confirmed that the response code, the counts of object creation, init, and request handling calls, and the time when the object was created match the screen. In this process, two points on the Spring side were corrected to match reality. The DispatcherServlet object is created when the server starts, not at the first request (only init happens at the first request), and the 404 and 405 responses are dispatched once more to /error, so there are two request handling calls per request. Among the entries for where the response was produced, "Default servlet of Tomcat" and "Default doPost of HttpServlet" were inferred from the response code and were not observed directly.',
});

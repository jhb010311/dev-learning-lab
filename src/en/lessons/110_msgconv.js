Lab.register({
  id: 'msgconv', nav: 'REST APIs and message converters', cat: 'Spring', mode: 'step',
  title: 'Where does the object returned by a controller become JSON?',
  intro: 'A controller method receives Java objects and returns Java objects, but what travels over the network is text such as JSON. In between, message converters turn text into objects and objects into text. The Content-Type and Accept headers of the request decide which converter is used, and when no converter fits, the result is 415 or 406. Change the kind of controller and the request, and see where the conversion happens and where it fails.',
  terms: ['HttpMessageConverter', '@Controller and @RestController', 'Content negotiation (Accept and Content-Type)', 'ResponseEntity', 'ViewResolver'],
  controls: [
    { id: 'kind', label: 'Kind of controller and what it returns', type: 'select', value: 'obj', options: [['obj', '@RestController, returns an object'], ['entity', '@RestController, returns a ResponseEntity'], ['str', '@RestController, returns a string'], ['view', '@Controller, returns a string']] },
    { id: 'req', label: 'Request to send (POST /orders)', type: 'select', value: 'xml', options: [['ok', 'Valid JSON request, Accept: application/json'], ['xml', 'Asks for the response as XML (Accept: application/xml)'], ['text', 'Wrong body format written (Content-Type: text/plain)'], ['broken', 'Malformed JSON body (cut off in the middle)']] },
  ],
  presets: [
    { t: 'Default settings', d: 'The request asks for the response as XML. It is rejected with 406, but the controller has already run by then.', v: { kind: 'obj', req: 'xml' } },
    { t: 'Valid JSON request', d: 'The JSON becomes an object, and the returned object becomes JSON again.', v: { kind: 'obj', req: 'ok' } },
    { t: 'Setting 201 and a header with ResponseEntity', d: 'The controller sets the status code and the Location header itself.', v: { kind: 'entity', req: 'ok' } },
    { t: 'When an @Controller returns a string', d: 'It is interpreted as a view name, not as the body.', v: { kind: 'view', req: 'ok' } },
    { t: 'When an @RestController returns a string', d: 'The same string becomes the body as it is. It is not converted to JSON.', v: { kind: 'str', req: 'ok' } },
    { t: 'With the wrong Content-Type', d: 'The request is rejected with 415 even though the content of the body is JSON.', v: { kind: 'obj', req: 'text' } },
    { t: 'With malformed JSON', d: 'The converter fails while reading it, and the result is 400.', v: { kind: 'obj', req: 'broken' } },
  ],
  // The headers and the body of the request
  reqOf: function (c) { return { ct: c.req === 'text' ? 'text/plain' : 'application/json', accept: c.req === 'xml' ? 'application/xml' : 'application/json', body: c.req === 'broken' ? '{"item": "book", "qty":' : '{"item": "book", "qty": 2}' }; },
  code: function (c) {
    var q = this.reqOf(c), rest = c.kind !== 'view';
    var sent = '// Request sent\n// POST /orders\n// Content-Type: ' + q.ct + '\n// Accept: ' + q.accept + '\n//\n// ' + q.body + '\n\n';
    var recs = 'record OrderRequest(String item, int qty) { }\n' + (c.kind === 'obj' || c.kind === 'entity' ? 'record OrderResponse(long id, String item, int qty) { }\n' : '') + '\n';
    var method = { obj: '    OrderResponse create(@RequestBody OrderRequest req) {\n        return new OrderResponse(1, req.item(), req.qty());\n    }', entity: '    ResponseEntity<OrderResponse> create(@RequestBody OrderRequest req) {\n        OrderResponse body = new OrderResponse(1, req.item(), req.qty());\n        return ResponseEntity.created(URI.create("/orders/1"))   // status 201, Location header\n                .body(body);\n    }', str: '    String create(@RequestBody OrderRequest req) {\n        return "orders/done";              // this text becomes the response body as it is\n    }', view: '    String create(@RequestBody OrderRequest req) {\n        return "orders/done";              // interpreted as the name of a view\n    }' }[c.kind];
    return sent + recs + (rest ? '@RestController                        // @Controller + @ResponseBody' : '@Controller') + '\nclass OrderController {\n\n    @PostMapping("/orders")\n' + method + '\n}';
  },
  label: function (c) { return { obj: '@RestController · object', entity: '@RestController · ResponseEntity', str: '@RestController · string', view: '@Controller · string' }[c.kind] + ' · ' + { ok: 'valid JSON request', xml: 'Accept: application/xml', text: 'Content-Type: text/plain', broken: 'malformed JSON' }[c.req]; },
  columns: ['Response', 'Controller method', 'Content-Type of the response', 'Response body produced by'],
  simulate: function (c) {
    var K = c.kind, q = this.reqOf(c), ev = [], sum = [];
    var st = { stage: 0, rd: '', ctrl: false, ret: '', wr: '', status: '', type: '', body: '', loc: '', fail: '' };
    function push(s, k) { ev.push({ s: s, k: k || '', snap: JSON.parse(JSON.stringify(st)) }); }
    var status = '', type = '-', maker = 'none (error response)', ex = '-', read = '-', wrote = '-', view = '-', loc = '-';
    function stop(code, exName, where) { status = code; ex = exName; st.status = code; st.fail = where; st.body = '(error response)'; }
    var NOT_RUN = ' The controller method does not run.', JSON_OUT = '{"id":1,"item":"book","qty":2}';
    var okStatus = K === 'entity' ? '201 Created' : '200 OK';

    st.stage = 1;
    push('The request arrives: POST /orders. The Content-Type header (' + q.ct + ') tells "the format of the body I am sending", and the Accept header (' + q.accept + ') tells "the format of the response I want to receive".');

    st.stage = 2;
    if (c.req === 'text') {
      st.rd = 'no converter can read it'; stop('415 Unsupported Media Type', 'HttpMediaTypeNotSupportedException', 'rd');
      push('@RequestBody OrderRequest req: Before the controller is called, the request body has to be converted into an OrderRequest object. Spring chooses the converter that reads the body by looking at the Content-Type header, not at the content of the body. The body looks like JSON, but the Content-Type is text/plain, and no converter knows how to convert a text/plain body into an OrderRequest object. Spring responds with 415, which means "this format cannot be read" (HttpMediaTypeNotSupportedException).' + NOT_RUN, 'bad');
    } else {
      st.rd = 'Jackson takes it';
      push('@RequestBody OrderRequest req: Before the controller is called, the request body has to be converted into an OrderRequest object. Spring chooses the converter that reads the body by looking at the Content-Type header. It is application/json, so the JSON message converter (Jackson) takes the body.');
      st.stage = 3;
      if (c.req === 'broken') {
        st.rd = 'malformed JSON'; stop('400 Bad Request', 'HttpMessageNotReadableException', 'rd');
        push('Reading the JSON: When Jackson reads the body, it finds that no value follows "qty": and that the body ends without the closing brace. The body does not follow the JSON syntax and no object can be created from it, so Spring responds with 400 (HttpMessageNotReadableException).' + NOT_RUN, 'bad');
      } else {
        st.rd = 'JSON → OrderRequest'; read = 'JacksonJsonHttpMessageConverter';
        push('Reading the JSON: Jackson finds the values with the same names in the JSON of the body and creates an OrderRequest object (item is "book", qty is 2). The text has become a Java object.');

        st.stage = 4; st.ctrl = true; st.ret = { obj: 'OrderResponse object', entity: 'ResponseEntity (201)', str: '"orders/done"', view: '"orders/done"' }[K];
        push('create(req) runs: The controller method creates the order and returns ' + { obj: 'an OrderResponse object', entity: 'a ResponseEntity', str: 'the string "orders/done"', view: 'the string "orders/done"' }[K] + '.' + (K === 'entity' ? ' The ResponseEntity holds the status code 201, the Location header /orders/1, and the OrderResponse object to write as the body.' : ''));

        st.stage = 5;
        if (K === 'view') {
          st.wr = 'taken as a view name';
          push('@Controller: The method has no @ResponseBody, so the returned string is not written as the response body. It is interpreted as meaning "find the view named orders/done". No message converter is used.');
          st.stage = 7; status = '200 OK'; st.status = status; type = 'text/html'; st.type = type; maker = 'View (HTML page)'; view = 'orders/done'; st.wr = 'the view writes HTML'; st.body = '(HTML of the orders/done view)';
          push('Rendering the view: ViewResolver finds the view named "orders/done", and that view produces HTML and writes it to the response body. The Content-Type is text/html, and Spring responds with 200. The Accept of the request was ' + q.accept + ', but on the path that returns a view, the request was not rejected because of it.', 'good');
        } else {
          if (K === 'entity') { st.wr = 'status, headers copied'; push('Handling the ResponseEntity: Spring copies the status code 201 and the Location header held in the ResponseEntity to the response. The OrderResponse object held as the body is passed to a message converter.'); }
          else { st.wr = 'to be written as body'; push('@RestController: This annotation is @Controller plus @ResponseBody. With @ResponseBody, the returned value is not treated as a view name, and a message converter writes it directly to the response body.'); }
          st.stage = 6;
          if (K === 'str') {
            st.wr = 'string converter chosen';
            push('Choosing the response format: When the returned value is a string, the string converter (StringHttpMessageConverter) takes it. This converter treats a string as "a body that is already complete" and can send it out under any format name. That is why it does not reject the request even though the Accept is ' + q.accept + '.');
            st.stage = 7; status = '200 OK'; st.status = status; type = q.accept; st.type = type; maker = 'String converter (text as it is)'; wrote = 'StringHttpMessageConverter'; st.wr = 'written as it is'; st.body = 'orders/done';
            push('Writing the body: The string converter writes the text orders/done to the body as it is, without even adding quotation marks. The Content-Type of the response is set to ' + q.accept + ', which was chosen from the Accept, but the body is not ' + (c.req === 'xml' ? 'XML' : 'JSON') + '. Spring responds with 200.');
          } else if (c.req === 'xml') {
            st.wr = 'no converter for XML'; stop('406 Not Acceptable', 'HttpMediaTypeNotAcceptableException', 'wr');
            push('Choosing the response format: The client asks for application/xml with Accept. This server has no converter that knows how to turn an OrderResponse object into XML. Spring responds with 406, which means "the response cannot be given in the format you want" (HttpMediaTypeNotAcceptableException). The controller method has already run, so the order has been created.', 'bad');
          } else {
            st.wr = 'Jackson takes it';
            push('Choosing the response format: The client asks for application/json with Accept. There is a converter that knows how to turn an OrderResponse object into JSON (Jackson), so Spring chooses it.');
            st.stage = 7; status = okStatus; st.status = status; type = 'application/json'; st.type = type; maker = 'JSON converter (Jackson)'; wrote = 'JacksonJsonHttpMessageConverter'; st.wr = 'object → JSON'; st.body = JSON_OUT;
            if (K === 'entity') { loc = '/orders/1'; st.loc = loc; }
            push('Writing the body: Jackson takes the values of the OrderResponse object one by one, turns them into JSON text, and writes the text to the response body. The Java object has become text again. The Content-Type is application/json. ' + (K === 'entity' ? '201 and the Location header (/orders/1) go out with it, as written in the ResponseEntity.' : 'No status code was set separately, so Spring responds with 200.'), 'good');
          }
        }
      }
    }
    var ran = st.ctrl;
    sum.push('The response is ' + status + ', and the controller method ' + (ran ? 'ran.' : 'did not run.') + (st.fail ? '' : ' Response body produced by: ' + maker + '. Content-Type: ' + type + '.'));
    if (st.fail === 'rd') sum.push(c.req === 'text' ? '415 means "the format of the request body cannot be read". Spring does not look into the body to guess its format. It looks only at the Content-Type header. When you send JSON, you have to set the Content-Type to application/json.' : '400 means "the request is wrong". Even when the Content-Type is right, the converter cannot create an object if the body does not follow the JSON syntax. This is a problem that the side that sent the request has to fix.');
    if (st.fail === 'rd') sum.push('415 and 400 are decided in the step that reads the request body, so this is before the controller runs. 406 is decided in the step that writes the response body, so this is after the controller has run.');
    if (st.fail === 'wr') sum.push('406 means "the response cannot be given in the format you want (Accept)". It is decided in the step that writes the response, so the response is a failure but the order has already been created. If you write produces = "application/json" on @PostMapping, a request whose Accept does not match is filtered out in the step that chooses the controller method, and the controller does not run.');
    if (!st.fail && K === 'obj') sum.push('A message converter converts the object returned by an @RestController to JSON and writes it to the response body. The same converter also converted the request body into an object. The controller does not contain a single line of code that deals with JSON.');
    if (!st.fail && K === 'entity') sum.push('When you return only an object, the status code is 200 and Spring decides the headers. When you wrap the object in a ResponseEntity, the controller can set the status code and the headers itself. To tell the client that something new was created, the convention is to send 201 together with a Location header that holds the URL of what was created.');
    if (!st.fail && K === 'str') sum.push('A string is not converted to JSON and goes out as it is. So even though the Content-Type says ' + type + ', the body is not in that format. To return JSON, return an object (or a Map), not a string.');
    if (!st.fail && K === 'view') sum.push('The same string "orders/done" becomes the response body when an @RestController returns it and a view name when an @Controller returns it. To send the value as the body from an @Controller, put @ResponseBody on the method or change the class to an @RestController.');
    if (!st.fail && K === 'view') sum.push('If no view with that name exists, the result is an error response (in the environment used for this check, which has no template engine, it was 404). This is a symptom you often see when you meant to build a JSON API but put @Controller on the class.');
    return { events: ev, summary: sum, ex: ex, read: read, wrote: wrote, view: view, loc: loc, row: [status, ran ? 'ran' : 'skipped', type, maker] };
  },
  render: function (v, sim, t, H, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : null, q = this.reqOf(sim.c);
    if (!s) { H.text(v, 'Click Run to see, one step at a time, how the request body becomes an object and the returned value becomes the response body.'); return; }
    H.table(v, ['Part of the request', 'Content', 'Meaning'], [
      { cells: ['Content-Type', q.ct, 'Format of the body sent'] },
      { cells: ['Accept', q.accept, 'Format of the response wanted'] },
      { cells: ['Body', q.body, ''] },
    ], 'Request sent (POST /orders)');
    var ln = H.lanes(v);
    H.lane(ln, 'Read body', s.rd || 'not yet', s.fail === 'rd' ? 'bad' : s.stage >= 3 && s.rd ? 'good' : s.rd ? 'hot' : 'none');
    H.lane(ln, 'Controller', s.ctrl ? 'ran · returned value: ' + s.ret : s.fail ? 'did not run' : 'not yet', s.ctrl ? 'good' : s.fail ? 'bad' : 'none');
    H.lane(ln, 'Write body', s.wr || (s.fail ? 'not done' : 'not yet'), s.fail === 'wr' ? 'bad' : s.stage === 7 ? 'good' : s.wr ? 'hot' : 'none');
    H.counters(v, [[s.status || 'In progress', 'Response'], [s.type || '-', 'Content-Type of the response']]);
    if (s.status) { H.title(v, 'Response body'); H.text(v, s.body + (s.loc ? ' · Location header: ' + s.loc : '')); }
  },
  // Diagram: the request at the top, the three places in Spring in the middle (reading the request body, the controller, writing the response body), and the response at the bottom. It shows the two places where conversion happens and the place where it failed.
  draw: function (P, sim, shown) {
    var c = sim.c, q = this.reqOf(c), last = shown[shown.length - 1], s = last ? last.snap : { stage: 0, rd: '', ctrl: false, ret: '', wr: '', status: '', type: '', body: '', loc: '', fail: '' };
    var rest = c.kind !== 'view';
    P.size(680, 336);
    P.box('req', 16, 16, 648, 62, { cls: s.stage ? 'wait' : 'plain', title: 'Request: POST /orders', sub: ['Content-Type: ' + q.ct + ' · Accept: ' + q.accept, 'Body: ' + q.body] });
    P.region('sp', 16, 92, 648, 138, 'Spring MVC');
    P.box('rd', 28, 124, 200, 92, { cls: s.fail === 'rd' ? 'bad' : s.stage === 2 || s.stage === 3 ? 'hot now' : s.stage > 3 ? 'good' : 'ghost', title: 'Read the request body', sub: ['text → object', 'chosen by Content-Type', s.rd || ' '] });
    P.box('ct', 240, 124, 200, 92, { cls: s.stage === 4 ? 'hot now' : s.ctrl ? 'good' : 'ghost', title: 'Controller method', sub: [rest ? '@RestController' : '@Controller', s.ctrl ? 'Returned value:' : s.fail === 'rd' ? 'did not run' : ' ', s.ret || ' '] });
    P.box('wr', 452, 124, 200, 92, { cls: s.fail === 'wr' ? 'bad' : s.stage === 5 || s.stage === 6 ? 'hot now' : s.stage === 7 ? 'good' : 'ghost', title: rest ? 'Write the response body' : 'Find and render view', sub: [rest ? 'object → text' : 'string = view name', rest ? 'chosen by Accept' : 'found by ViewResolver', s.wr || ' '] });
    if (s.stage >= 2) P.arrow('a1', 'req:b:0.18', 'rd:t', { label: 'body' });
    if (s.ctrl) P.arrow('a2', 'rd:r', 'ct:l', { cls: 'good' });
    if (s.stage >= 5) P.arrow('a3', 'ct:r', 'wr:l', { cls: s.fail === 'wr' ? 'bad' : 'good' });
    P.box('resp', 16, 244, 648, 62, { cls: !s.status ? 'ghost' : s.fail ? 'bad' : 'good', title: 'Response: ' + (s.status || 'In progress'), sub: s.status ? ['Content-Type: ' + (s.type || '-') + (s.loc ? ' · Location: ' + s.loc : ''), 'Body: ' + s.body] : [' ', ' '] });
    if (s.status) P.arrow('a4', (s.fail || 'wr') + ':b', s.fail === 'rd' ? 'resp:t:0.18' : 'resp:t:0.82', { cls: s.fail ? 'bad' : 'good' });
    P.note('Message converters work in two places. Before the controller, a converter turns the request body into an object (it looks at Content-Type), and after the controller, a converter turns the returned value into the response body (it looks at Accept). If the conversion fails before the controller, the controller does not run, and if it fails after the controller, the controller has already run.');
  },
  assume: 'All 16 combinations of the 4 kinds of controller and the 4 requests were sent as HTTP requests to a real Spring Boot 4.1.1 server (Spring Framework 7.0.9, embedded Tomcat 11, Jackson 3), and the status code, whether the controller ran, the name of the exception Spring threw, the converter that read the request body and the converter that wrote the response body, and the Content-Type and Location header of the successful responses were confirmed to match the screen. The body and the Content-Type of the error responses (400, 406, 415) vary with the version and the configuration, so they were not treated as results. The server used for the check has no library that produces XML. If you add a library such as jackson-dataformat-xml, the server responds to an Accept: application/xml request with XML, so the result is not 406. The class name of the converter (JacksonJsonHttpMessageConverter) is as of Spring 7, and the name is different in earlier versions. For the Content-Type of the response, only the format name is shown (in reality, a charset is sometimes appended). The view name returned by the @Controller was checked by registering a view object of the same name instead of using a template engine. That a request that returns a view gave 200 regardless of Accept is what was observed in this setup, and it can differ depending on the view configuration. Cases that are not on the screen were also checked on the same server. When no view with that name existed, the result was 404 (with a template engine, it can be a different error, and that was not verified), putting @ResponseBody on the method of the @Controller gave the same result as @RestController, and a method with produces = "application/json" responded to an Accept: application/xml request with 406 without running the controller. When the request was sent without an Accept header, an object went out as JSON and a string as text/plain. In the combination that returned a ResponseEntity and gave 406, the Location header remained in the response, but this can differ between versions, so it is not shown on the screen.',
});

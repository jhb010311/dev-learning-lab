Lab.register({
  id: 'binding', nav: 'Request mapping and parameter binding', cat: 'Spring', mode: 'step',
  title: 'How does a value sent in a request become a method parameter?',
  intro: 'An HTTP request can carry a value in several places: the path of the URL, the query string after the ?, and the body. The annotation on a parameter of a controller method decides "which of these places the value is taken from". If the place that carries the value and the place the value is taken from do not match, the value does not come in. Change how the controller receives the value and which request is sent, and see where the value comes from and where it goes.',
  terms: ['@RequestParam and @PathVariable', '@ModelAttribute and @RequestBody', 'Query string and form data', 'HandlerMethodArgumentResolver', 'HTTP status codes'],
  controls: [
    { id: 'how', label: 'How the controller receives the value', type: 'select', value: 'param', options: [['param', '@RequestParam int qty'], ['opt', '@RequestParam(required = false) Integer qty'], ['def', '@RequestParam(defaultValue = "1") int qty'], ['path', '@PathVariable int qty'], ['model', '@ModelAttribute OrderForm form (binds the values to an object)'], ['body', '@RequestBody OrderForm form (reads a JSON body)']] },
    { id: 'req', label: 'Request to send', type: 'select', value: 'j3', hint: 'The same quantity, 3, is sent in different places of the request.', options: [['q3', 'GET /orders?qty=3 (query string)'], ['qabc', 'GET /orders?qty=abc (letters where a number is expected)'], ['none', 'GET /orders (no value sent)'], ['p3', 'GET /orders/3 (path)'], ['pabc', 'GET /orders/abc (letters in the path)'], ['f3', 'POST /orders, form data qty=3'], ['j3', 'POST /orders, JSON body {"qty": 3}'], ['jabc', 'POST /orders, JSON body {"qty": "abc"}']] },
  ],
  presets: [
    { t: 'Default settings', d: 'The controller tries to receive a value sent in a JSON body with @RequestParam. The result is 400.', v: { how: 'param', req: 'j3' } },
    { t: 'The same request with @RequestBody', d: 'When you switch to a way that reads the body, the value comes in.', v: { how: 'body', req: 'j3' } },
    { t: 'When no value is sent', d: 'By default, @RequestParam requires the value to be present.', v: { how: 'param', req: 'none' } },
    { t: 'Letters give 400 even with defaultValue', d: 'The default value is used only when the value is missing. It does not replace an invalid value.', v: { how: 'def', req: 'qabc' } },
    { t: 'Taking the value from the path', d: 'The 3 in /orders/3 becomes the @PathVariable parameter.', v: { how: 'path', req: 'p3' } },
    { t: 'An object passes even without the value', d: '@ModelAttribute does not treat a missing value as an error. qty stays 0.', v: { how: 'model', req: 'none' } },
    { t: 'Form data also works with @RequestParam', d: 'Form data in the body is a "request parameter", the same as the query string.', v: { how: 'param', req: 'f3' } },
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
  // The mapping annotation on the controller method for these settings. Get or Post is chosen to match the HTTP method of the request.
  mapping: function (c) { return '@' + (this.REQS[c.req].m === 'GET' ? 'Get' : 'Post') + 'Mapping("' + (c.how === 'path' ? '/orders/{qty}' : '/orders') + '")'; },
  code: function (c) {
    var R = this.REQS[c.req], obj = c.how === 'model' || c.how === 'body';
    var sent = '// Request sent\n// ' + R.m + ' ' + R.path + (R.query ? '?' + R.query : '') + (R.ct ? '\n// Content-Type: ' + R.ct + '\n//\n// ' + R.body : '') + '\n\n';
    var form = obj ? 'class OrderForm {\n    private int qty;\n    public int getQty() { return qty; }\n    public void setQty(int qty) { this.qty = qty; }\n}\n\n' : '';
    return sent + form + '@RestController\nclass OrderController {\n\n    ' + this.mapping(c) + '\n    String order(' + this.DECL[c.how] + ') {\n        return "Quantity " + ' + (obj ? 'form.getQty()' : 'qty') + ';\n    }\n}';
  },
  label: function (c) { var R = this.REQS[c.req]; return this.DECL[c.how] + ' · ' + R.m + ' ' + R.path + (R.query ? '?' + R.query : '') + (R.body ? ' body ' + R.body : ''); },
  columns: ['Response', 'Controller method', 'qty received by the controller', 'Reason for rejection'],
  simulate: function (c) {
    var R = this.REQS[c.req], how = c.how, decl = this.DECL[how], mapping = this.mapping(c), ev = [], sum = [];
    var isPath = how === 'path', isModel = how === 'model', isBody = how === 'body', annotEun = isModel ? '@ModelAttribute' : '@RequestParam', annotRo = isModel ? 'with @ModelAttribute' : 'with @RequestParam';
    var st = { stage: 0, map: '', look: [], hit: '', raw: '', conv: '', val: '', status: '', fail: 0, ctrl: false };
    function push(s, k) { ev.push({ s: s, k: k || '', snap: JSON.parse(JSON.stringify(st)) }); }
    var status = '', got = '-', why = '-', ex = '-', raw = null, usedDefault = false;
    function stop(code, reason, exName) { status = code; why = reason; ex = exName; st.status = code; st.fail = st.stage; }
    var line = R.m + ' ' + R.path + (R.query ? '?' + R.query : '');
    var NOT_RUN = ' The controller method does not run.';

    st.stage = 1;
    push('The request arrives: ' + line + '. ' + { query: 'qty is carried in the query string (the part of the URL after the ?).', path: 'The value to use as qty is carried in the last segment of the path.', form: 'qty is carried in the body as form data (name=value). The Content-Type header tells the format of the body.', json: 'qty is carried in the body as JSON. The Content-Type header tells the format of the body.', '': 'This request does not carry qty anywhere.' }[R.where] + (R.where ? ' Wherever a value is carried, everything inside an HTTP request is text.' : ''));

    st.stage = 2;
    if (isPath !== (R.where === 'path')) {
      st.map = 'fails'; stop('404 Not Found', 'no matching URL', 'NoResourceFoundException');
      push(mapping + ': Spring uses the HTTP method and the path of the request to find the controller method to run. ' + (isPath ? 'The path of the request (' + R.path + ') has no segment for the {qty} position, so it does not match the pattern /orders/{qty}.' + (R.where ? ' A value carried in the query string or the body cannot become a URI variable.' : '') : 'The path of the request (' + R.path + ') is a different URL from /orders.') + ' No controller method matches, so Spring responds with 404 (NoResourceFoundException in Spring 7).' + NOT_RUN, 'bad');
    } else {
      st.map = 'matches';
      push(mapping + ': Spring uses the HTTP method and the path of the request to find the controller method to run. ' + (isPath ? 'The path of the request (' + R.path + ') matches the pattern /orders/{qty}.' : 'The HTTP method is ' + R.m + ' and the path is /orders, so the order method is chosen.') + ' This step does not look at the query string or the body.');

      st.stage = 3; st.look = isBody ? ['ct', 'body'] : isPath ? ['path'] : R.where === 'form' ? ['query', 'body'] : ['query'];
      push(decl + ': The annotation on the parameter decides where the value is taken from. ' + (isBody ? '@RequestBody passes the whole body to a message converter, which converts it into an OrderForm object. It does not look at the query string or the path.' : isPath ? '@PathVariable takes the segment of the path at the {qty} position.' : isModel ? '@ModelAttribute first creates an empty object with new OrderForm(), and then uses the setters to set the "request parameters" whose names match the fields. The request parameters are the query string and the form data in the body combined.' : '@RequestParam looks in the "request parameters" for the value named qty. The request parameters are the query string and the form data in the body combined.'));

      st.stage = 4;
      if (isBody) {
        if (!R.body) { st.raw = 'none'; stop('400 Bad Request', 'no body', 'HttpMessageNotReadableException'); push('Reading the body: This request has no body.' + (R.query ? ' The query string contains qty, but @RequestBody does not look at it.' : '') + ' By default, @RequestBody requires the body to be present, so Spring responds with 400 (HttpMessageNotReadableException).' + NOT_RUN, 'bad'); }
        else if (R.where === 'form') { st.raw = R.body; stop('415 Unsupported Media Type', 'body format cannot be read', 'HttpMediaTypeNotSupportedException'); push('Reading the body: The Content-Type is ' + R.ct + '. No message converter knows how to convert a body in this format into an OrderForm object. Spring responds with 415, which means "this format cannot be read" (HttpMediaTypeNotSupportedException).' + NOT_RUN, 'bad'); }
        else { st.hit = 'body'; st.raw = R.body; raw = R.val; push('Reading the body: The Content-Type is application/json, so the message converter that knows how to read JSON (Jackson) takes the body.'); }
      } else if (isPath) {
        raw = R.val; st.hit = 'path'; st.raw = '"' + raw + '"';
        push('Getting the value: In the path ' + R.path + ', the segment at the {qty} position is "' + raw + '". Spring takes this text.');
      } else if (R.where === 'query' || R.where === 'form') {
        raw = R.val; st.hit = R.where === 'query' ? 'query' : 'body'; st.raw = '"' + raw + '"';
        push('Getting the value: ' + (R.where === 'query' ? 'The query string has an entry named qty (qty=' + raw + ').' : 'The body is form data (Content-Type: application/x-www-form-urlencoded), so Tomcat also reads the entry in the body (qty=' + raw + ') as a request parameter.') + ' The text taken is "' + raw + '".');
      } else {
        var none = 'Getting the value: ' + (R.where === 'json' ? 'A JSON body is not a request parameter. Even though qty is written inside the body, ' + annotEun + ' does not open the body.' : 'There is no qty in the query string or in the body.');
        st.raw = 'none';
        if (how === 'param') { stop('400 Bad Request', 'required value is missing', 'MissingServletRequestParameterException'); push(none + ' By default, @RequestParam requires the value to be present, so Spring responds with 400 (MissingServletRequestParameterException).' + NOT_RUN, 'bad'); }
        else if (how === 'opt') { got = 'null'; st.conv = 'nothing to convert'; st.val = 'null'; push(none + ' Because required = false, this is not treated as an error, and null is passed in instead. The type is declared as Integer, not int, because it has to hold null.'); }
        else if (how === 'def') { raw = '1'; usedDefault = true; st.raw = 'none → default value "1"'; push(none + ' Because there is a defaultValue, Spring acts as if it had taken the text "1".'); }
        else { got = '0 (default value of int)'; st.conv = 'nothing to convert'; st.val = '0'; push(none + ' There is no value to set, so setQty is not called. The qty of the newly created OrderForm stays 0, the default value of int. @ModelAttribute does not treat this as an error.'); }
      }

      if (!status && raw !== null) {
        st.stage = 5;
        if (raw === 'abc') {
          st.conv = 'failed';
          if (isBody) { stop('400 Bad Request', 'cannot be converted to a number', 'HttpMessageNotReadableException'); push('Converting the JSON to an object: The qty field of OrderForm is an int, but the qty value in the JSON is the text "abc". It cannot be converted to a number, so the body is treated as unreadable, and Spring responds with 400 (HttpMessageNotReadableException).' + NOT_RUN, 'bad'); }
          else if (isModel) { stop('400 Bad Request', 'cannot be converted to a number', 'MethodArgumentNotValidException'); push('Type conversion: setQty takes an int, but the value taken is the text "abc". It cannot be converted to a number, so it is recorded as a binding error. The method has no BindingResult parameter to receive that error, so Spring responds with 400 (MethodArgumentNotValidException in Spring 7).' + NOT_RUN, 'bad'); }
          else { stop('400 Bad Request', 'cannot be converted to a number', 'MethodArgumentTypeMismatchException'); push('Type conversion: The type of the parameter is ' + (how === 'opt' ? 'Integer' : 'int') + ', but the value taken is the text "abc". It cannot be converted to a number, so Spring responds with 400 (MethodArgumentTypeMismatchException).' + (how === 'def' ? ' defaultValue is used only when the value is missing. It does not replace an invalid value.' : how === 'opt' ? ' required = false allows only the case where the value is missing. It does not allow an invalid value.' : '') + NOT_RUN, 'bad'); }
        } else {
          st.conv = isBody ? 'JSON → OrderForm' : '"' + raw + '" → ' + raw; st.val = raw; got = raw + (usedDefault ? ' (default value)' : '');
          push(isBody ? 'Converting the JSON to an object: Jackson creates an OrderForm object and puts the qty value of the JSON, ' + raw + ', in the qty field, which has the same name.' : isModel ? 'Type conversion: setQty takes an int, so the text "' + raw + '" is converted to a number and setQty(' + raw + ') is called. The qty of OrderForm becomes ' + raw + '.' : 'Type conversion: The type of the parameter is ' + (how === 'opt' ? 'Integer' : 'int') + ', so the text "' + raw + '" is converted to a number. qty becomes ' + raw + '. Spring does this conversion as well.');
        }
      }
      if (!status) {
        st.stage = 6; st.ctrl = true; status = '200 OK'; st.status = status;
        push((isBody || isModel ? 'order(form) is called: The controller method runs with the prepared OrderForm object. form.getQty() is ' + st.val + '.' : 'order(' + st.val + ') is called: The controller method runs with the prepared value.') + ' Spring responds with 200.', got === 'null' || got.indexOf('0 ') === 0 ? '' : 'good');
      }
    }
    var ran = st.ctrl;
    sum.push('The response is ' + status + ', and the controller method ' + (ran ? 'ran. The qty received by the controller is ' + got + '.' : 'did not run. The reason for rejection is "' + why + '".'));
    if (st.fail === 2) sum.push(isPath ? 'For a method that uses @PathVariable, the pattern of the URL itself is /orders/{qty}. A request without that segment is not a request with a missing value (400) but a request to a different URL (404).' : 'To send a value in the path, as in /orders/3, the URL of the controller method must also have the pattern /orders/{qty}, and the parameter must be annotated with @PathVariable.');
    else if (R.where === 'json' && !isBody) sum.push(how === 'param' ? 'A value sent in a JSON body cannot be received with @RequestParam, because the place that carries the value (the body) and the place the value is taken from (the request parameters) are different. Receive a JSON body with @RequestBody.' : 'qty was sent in the JSON body, but ' + annotEun + ' does not look at the body, so the value received by the controller is ' + got + '. The request ends with 200 and no error, so it is hard to notice that the value did not come in. Receive a JSON body with @RequestBody.');
    else if (isBody && !R.body) sum.push('@RequestBody looks only at the body. Receive a value sent in the query string with @RequestParam or @ModelAttribute.');
    else if (isBody && R.where === 'form') sum.push('Receive form data in the body with @RequestParam or @ModelAttribute, not with @RequestBody. To receive the value with @RequestBody, the sender has to send JSON and set the Content-Type to application/json.');
    else if (st.fail === 5) sum.push('Every value carried in a request is text, and Spring converts it to the type of the parameter. When text that cannot be converted arrives, Spring does not run the controller and responds with 400. This means that the side that sent the request is at fault.');
    else if (!R.where) sum.push({ param: '@RequestParam rejects the request with 400 when the value is missing. If the value is optional, set required = false or a defaultValue. Switch to each of the two and compare.', opt: 'With required = false, null comes in when the value is missing. The controller has to handle the null case itself.', def: 'With a defaultValue, that value comes in instead when the value is missing. You do not have to worry about null, so the type can stay int.', model: '@ModelAttribute leaves a field with no value as it is. So "not sent" and "sent as 0" cannot be told apart. If the value is required, you have to validate it separately.' }[how]);
    else if (R.where === 'form') sum.push('Form data in the body (application/x-www-form-urlencoded) is handled as "request parameters" together with the query string. That is why it can be received ' + annotRo + ' even though it came in the body. JSON is also sent in the body, but it is not handled this way.');
    else sum.push({ query: 'Receive the values in the query string one at a time with @RequestParam, or bind them to an object with @ModelAttribute.', path: 'To use a segment of the path as a value, put a {name} placeholder in the URL and receive it with @PathVariable. This is mostly used for a value that tells "which one is meant", such as an order number.', json: 'Receive a JSON body with @RequestBody. A message converter converts the whole body into one object.' }[R.where]);
    sum.push('Each annotation looks at a fixed place. @RequestParam and @ModelAttribute look at the request parameters (query string and form data), @PathVariable looks at the path, and @RequestBody looks at the whole body.');
    return { events: ev, summary: sum, ex: ex, row: [status, ran ? 'ran' : 'skipped', got, why] };
  },
  render: function (v, sim, t, H, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : null, c = sim.c, R = this.REQS[c.req];
    if (!s) { H.text(v, 'Click Run to see, one step at a time, how a request becomes the parameter of a controller method.'); return; }
    var looks = function (part) { return s.hit === part ? { v: 'value taken here', cls: 'good' } : s.look.indexOf(part) >= 0 ? { v: 'looked at', cls: 'hot' } : s.stage >= 3 ? 'not looked at' : ''; };
    H.table(v, ['Part of the request', 'Content', 'Looked at?'], [
      { cells: ['Method and path', R.m + ' ' + R.path, looks('path')] },
      { cls: R.query ? '' : 'gone', cells: ['Query string', R.query || 'none', looks('query')] },
      { cls: R.ct ? '' : 'gone', cells: ['Content-Type header', R.ct || 'none', looks('ct')] },
      { cls: R.body ? '' : 'gone', cells: ['Body', R.body || 'none', looks('body')] },
    ], 'Request sent');
    var ln = H.lanes(v), failed = function (n) { return s.fail === n; };
    H.lane(ln, 'URL matching', s.map ? this.mapping(c) + ' ' + s.map : 'not yet', failed(2) ? 'bad' : s.map ? 'good' : 'none');
    H.lane(ln, 'Getting the value', s.stage < 4 ? (s.stage === 3 ? 'place decided' : failed(2) ? 'not done' : 'not yet') : 'taken: ' + s.raw, failed(4) ? 'bad' : s.stage < 3 ? 'none' : s.stage === 3 ? 'hot' : s.hit ? 'good' : 'wait');
    H.lane(ln, 'Type conversion', s.conv || (s.fail ? 'not done' : 'not yet'), failed(5) ? 'bad' : s.conv && s.conv !== 'nothing to convert' ? 'good' : 'none');
    H.lane(ln, 'Controller', s.ctrl ? 'ran' : s.fail ? 'did not run' : 'not yet', s.ctrl ? 'good' : s.fail ? 'bad' : 'none');
    H.counters(v, [[s.status || 'In progress', 'Response'], [s.val || (s.fail ? '-' : '?'), 'qty received by the controller']]);
  },
  // Diagram: on the left, the four parts of the HTTP request (path, query string, Content-Type, body); on the right, the order in which Spring fills the parameter. An arrow starts from the part the value is taken from.
  draw: function (P, sim, shown) {
    var c = sim.c, R = this.REQS[c.req], last = shown[shown.length - 1], s = last ? last.snap : { stage: 0, map: '', look: [], hit: '', raw: '', conv: '', val: '', status: '', fail: 0, ctrl: false };
    var obj = c.how === 'model' || c.how === 'body';
    var part = function (id, has) { return s.hit === id ? 'good' : s.look.indexOf(id) >= 0 ? (s.fail === 4 ? 'bad' : 'hot') : has ? 'wait' : 'ghost'; };
    P.size(680, 322);
    P.region('rq', 16, 16, 290, 236, 'HTTP request');
    P.box('p_path', 28, 52, 266, 30, { cls: s.fail === 2 ? 'bad' : part('path', true), title: 'Method and path', right: R.m + ' ' + R.path });
    P.box('p_query', 28, 96, 266, 30, { cls: part('query', R.query), title: 'Query string', right: R.query || 'none' });
    P.box('p_ct', 28, 140, 266, 46, { cls: part('ct', R.ct), title: 'Content-Type header', sub: R.ct || 'none (request without a body)' });
    P.box('p_body', 28, 200, 266, 30, { cls: part('body', R.body), title: 'Body', right: R.body || 'none' });
    P.region('sp', 330, 16, 334, 236, 'How Spring fills the parameter, in order');
    P.box('map', 342, 48, 310, 30, { cls: s.fail === 2 ? 'bad' : s.map ? 'good' : 'ghost', title: this.mapping(c), right: s.map });
    P.box('src', 342, 84, 310, 46, { cls: s.stage < 3 ? 'ghost' : s.stage === 3 ? 'hot now' : 'plain', title: 'Where the value is taken from', sub: c.how === 'body' ? 'Whole body (read by message converter)' : c.how === 'path' ? 'The {qty} position in the path' : 'Request parameters (query + form data)' });
    P.box('raw', 342, 136, 310, 30, { cls: s.stage < 4 ? 'ghost' : s.fail === 4 ? 'bad' : s.hit ? 'good' : 'wait', title: c.how === 'body' ? 'Body to read' : 'Text taken', right: s.stage >= 4 ? s.raw : '' });
    P.box('cv', 342, 172, 310, 30, { cls: s.fail === 5 ? 'bad' : !s.conv ? 'ghost' : s.conv === 'nothing to convert' ? 'plain' : 'good', title: c.how === 'body' ? 'JSON to an object' : 'Type conversion', right: s.conv });
    P.box('pm', 342, 208, 310, 30, { cls: s.ctrl ? 'good now' : s.val ? 'wait' : 'ghost', title: obj ? 'qty of OrderForm' : (c.how === 'opt' ? 'Integer' : 'int') + ' qty', right: s.val || (s.fail ? '-' : '?') });
    if (s.stage >= 3 && s.fail !== 2) {
      var from = c.how === 'path' ? 'p_path' : c.how === 'body' || R.where === 'form' ? 'p_body' : 'p_query', toRaw = s.stage >= 4;
      P.arrow('take', from + ':r', toRaw ? 'raw:l' : 'src:l', { cls: s.fail === 4 ? 'bad' : s.hit ? 'good' : toRaw ? 'mut' : 'hot', label: !toRaw ? 'looks here' : s.hit ? 'taken' : s.fail === 4 && c.how === 'body' && R.body ? 'cannot read' : 'no value' });
    }
    P.box('resp', 16, 264, 648, 34, { cls: !s.status ? 'ghost' : s.ctrl ? 'good' : 'bad', title: 'Response', right: s.status || 'In progress' });
    P.note('A blue box is a part of the request that carries a value, a yellow box is a part that this annotation looks at, and a green box is the part the value was actually taken from. When the blue box and the yellow box do not line up, the value does not come in even though the request carries it.');
  },
  assume: 'All 48 combinations of the 6 ways of receiving the value and the 8 requests were sent as HTTP requests to a real Spring Boot 4.1.1 server (Spring Framework 7.0.9, embedded Tomcat 11), and the status code, whether the controller ran, the value the controller received, and the name of the exception Spring threw were confirmed to match the screen. The names of the exceptions depend on the Spring version (NoResourceFoundException when no URL matches and MethodArgumentNotValidException for a failed @ModelAttribute conversion are as of this version). The body of an error response varies with the version and the configuration, so it was not treated as a result. The lab is simplified to a controller with one method and one parameter, and the mapping annotation shown is whichever of @GetMapping and @PostMapping matches the HTTP method of the request (the 405 for an HTTP method that does not match is in the "Servlets" lab). OrderForm is a class with a default constructor and a setter. For an object that receives its values through a constructor, such as a record, the behavior when the value is missing can be different, and that was not verified. Finding the value by the parameter name without writing the name separately, as in @RequestParam int qty, is the behavior when the code is compiled with the -parameters option, and the check was done that way too. Four cases that are not on the screen were also checked on the same server. When an empty value is sent, as in ?qty=, @RequestParam int gives 400, required = false gives null, and defaultValue gives the default value. When required = false is used with the type int and no value is sent, null cannot be stored and the result is 500. When a BindingResult parameter is placed immediately after the @ModelAttribute parameter, the controller runs even if the conversion fails. When the body is {}, the qty received with @RequestBody is 0. Validation that checks the range of a value (@Valid) is not covered in this lab and is covered separately in the next lab, "Validation".',
});

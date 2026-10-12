Lab.register({
  id: 'validation', nav: 'Validation', cat: 'Spring', mode: 'step',
  title: 'The field has @NotBlank, so why does an empty value still get in?',
  intro: 'Input values come with conditions such as "the name must not be empty". Bean Validation is a way of writing such conditions above the fields as annotations like @NotBlank, and a condition written this way is called a constraint. However, a constraint does nothing just by being written down. Something has to say "validate this object", and in Spring MVC, the @Valid on a controller parameter is that signal.',
  terms: ['Bean Validation and @Valid', '@NotNull, @NotEmpty, and @NotBlank', 'BindingResult', 'MethodArgumentNotValidException', 'HTTP status codes'],
  controls: [
    { id: 'how', label: 'How the controller receives the value', type: 'select', value: 'plain', options: [['plain', '@RequestBody ItemForm form (no @Valid)'], ['valid', '@Valid @RequestBody ItemForm form'], ['br', '@Valid @RequestBody ItemForm form, BindingResult errors'], ['param', '@RequestParam String name (constraint directly on the parameter)']] },
    { id: 'con', label: 'Constraint on name', type: 'select', value: 'notblank', hint: 'All three are conditions that say "a value must be present", but they differ in what counts as "not present".', options: [['notnull', '@NotNull'], ['notempty', '@NotEmpty'], ['notblank', '@NotBlank']] },
    { id: 'val', label: 'name sent in the request', type: 'select', value: 'empty', options: [['none', 'Not sent (null on the receiving side)'], ['empty', 'Empty string ""'], ['blank', 'A single space " "'], ['pen', '"pen"']] },
  ],
  presets: [
    { t: 'Default settings', q: 'What happens when the controller receives @RequestBody ItemForm form without @Valid and name, which has @NotBlank, is sent as an empty string ""?', d: 'The field has @NotBlank, but an empty name is registered as it is, because the parameter has no @Valid.', v: { how: 'plain', con: 'notblank', val: 'empty' } },
    { t: 'With @Valid', q: 'What if you add @Valid to the controller parameter?', d: 'The same request is rejected with 400 before it reaches the controller.', v: { how: 'valid', con: 'notblank', val: 'empty' } },
    { t: '@NotNull lets an empty string through', q: 'What if you add @Valid and change the constraint on name to @NotNull?', d: 'An empty string is not null. The empty name is registered even though validation ran.', v: { how: 'valid', con: 'notnull', val: 'empty' } },
    { t: 'A single space passes even @NotEmpty', q: 'What if you add @Valid, change the constraint on name to @NotEmpty, and send a single space " "?', d: 'A space also counts as one character. @NotBlank is the one that also blocks a value made only of whitespace.', v: { how: 'valid', con: 'notempty', val: 'blank' } },
    { t: 'With a BindingResult', q: 'What if the controller receives @Valid @RequestBody ItemForm form and also BindingResult errors?', d: 'Even when validation fails, no exception is thrown and the controller runs.', v: { how: 'br', con: 'notblank', val: 'empty' } },
    { t: 'A constraint directly on the parameter', q: 'What if you put @NotBlank directly on the @RequestParam String name parameter and send an empty string ""?', d: 'It is checked even without @Valid. When it fails, the name of the exception is different.', v: { how: 'param', con: 'notblank', val: 'empty' } },
    { t: 'Sending no @RequestParam value at all', q: 'What if you put @NotBlank directly on the @RequestParam String name parameter and do not send name at all?', d: 'The request is rejected first as "required value is missing", before the constraint is checked.', v: { how: 'param', con: 'notblank', val: 'none' } },
  ],
  // Values sent: lit is how the value looks in Java code, and inner is the text that goes inside the [ ] of the text the controller returns
  VALS: {
    none: { lit: 'null', inner: 'null', json: '{}', query: '', sent: 'name was not sent at all.' },
    empty: { lit: '""', inner: '', json: '{"name": ""}', query: 'name=', sent: 'name was sent as an empty string (a string with no characters).' },
    blank: { lit: '" "', inner: ' ', json: '{"name": " "}', query: 'name=%20', sent: 'name was sent as just a single space.' },
    pen: { lit: '"pen"', inner: 'pen', json: '{"name": "pen"}', query: 'name=pen', sent: 'name was sent as the text pen.' },
  },
  // Constraints: bad lists the values this constraint blocks, and why gives the reason each value passes or violates the constraint
  CONS: {
    notnull: { a: '@NotNull', rule: '@NotNull passes as long as the value is not null.', bad: ['none'],
      why: { none: 'name is null, so the constraint is violated.', empty: 'The empty string "" has no characters, but it is not null, so it passes. The number of characters is not checked.', blank: 'A single space is not null either, so it passes.', pen: '"pen" is not null, so it passes.' } },
    notempty: { a: '@NotEmpty', rule: '@NotEmpty passes only when the value is not null and its length is 1 or more.', bad: ['none', 'empty'],
      why: { none: 'name is null, so the constraint is violated.', empty: 'The empty string "" has length 0, so the constraint is violated.', blank: 'A space also counts as one character, so the length is 1 and it passes.', pen: '"pen" has length 3, so it passes.' } },
    notblank: { a: '@NotBlank', rule: '@NotBlank passes only when the value is not null and contains at least one non-whitespace character.', bad: ['none', 'empty', 'blank'],
      why: { none: 'name is null, so the constraint is violated.', empty: 'The empty string "" contains no characters at all, so the constraint is violated.', blank: '" " contains only whitespace, so the constraint is violated.', pen: '"pen" contains non-whitespace characters, so it passes.' } },
  },
  DECL: { plain: '@RequestBody ItemForm form', valid: '@Valid @RequestBody ItemForm form', br: '@Valid @RequestBody ItemForm form, BindingResult errors' },
  decl: function (c) { return c.how === 'param' ? '@RequestParam ' + this.CONS[c.con].a + ' String name' : this.DECL[c.how]; },
  line: function (c) { var V = this.VALS[c.val]; return c.how === 'param' ? 'GET /items' + (V.query ? '?' + V.query : '') : 'POST /items'; },
  code: function (c) {
    var V = this.VALS[c.val], A = this.CONS[c.con].a;
    if (c.how === 'param') return '// Request sent\n// ' + this.line(c) + (c.val === 'blank' ? '\n// (%20 is how a single space is written inside a URL)' : '') + '\n\n@RestController\nclass ItemController {\n\n    @GetMapping("/items")\n    String find(' + this.decl(c) + ') {\n        return "Search: [" + name + "]";\n    }\n}';
    var sent = '// Request sent\n// POST /items\n// Content-Type: application/json\n//\n// ' + V.json + '\n\n';
    var form = 'class ItemForm {\n    ' + A + '\n    private String name;\n    public String getName() { return name; }\n    public void setName(String name) { this.name = name; }\n}\n\n';
    var body = c.how === 'br' ? '        if (errors.hasErrors()) {\n            return "Errors: " + errors.getErrorCount();\n        }\n' : '';
    return sent + form + '@RestController\nclass ItemController {\n\n    @PostMapping("/items")\n    String add(' + this.decl(c) + ') {\n' + body + '        return "Registered: [" + form.getName() + "]";\n    }\n}';
  },
  label: function (c) { return (c.how === 'param' ? '@RequestParam with ' + this.CONS[c.con].a + ' directly' : this.DECL[c.how] + ' · field with ' + this.CONS[c.con].a) + ' · name ' + (c.val === 'none' ? 'not sent' : this.VALS[c.val].lit); },
  columns: ['Response', 'Validation', 'Controller method', 'Text returned by the controller', 'Exception thrown by Spring'],
  simulate: function (c) {
    var V = this.VALS[c.val], C = this.CONS[c.con], how = c.how, isParam = how === 'param', ev = [], sum = [];
    var violates = C.bad.indexOf(c.val) >= 0, call = isParam ? 'find(name)' : how === 'br' ? 'add(form, errors)' : 'add(form)', holder = isParam ? 'name' : 'form.getName()';
    var st = { stage: 0, name: '', gate: '', check: '', after: '', errors: -1, status: '', fail: 0, ctrl: false, ret: '' };
    function push(s, k) { ev.push({ s: s, k: k || '', snap: JSON.parse(JSON.stringify(st)) }); }
    var status = '', checked = 'not done', ret = '-', ex = '-';
    var NOT_RUN = ' The controller method does not run.';

    st.stage = 1;
    push('The request arrives: ' + this.line(c) + (isParam ? '.' : ', and the body is ' + V.json + '.') + ' ' + V.sent + (isParam && c.val === 'blank' ? ' A space cannot be written as it is in a URL, so it is written as %20.' : ''));

    st.stage = 2;
    if (isParam && c.val === 'none') {
      st.name = 'none'; st.fail = 2; status = '400 Bad Request'; ex = 'MissingServletRequestParameterException'; st.status = status; st.after = 'required value is missing';
      push('@RequestParam String name: The request parameters do not contain name. By default, @RequestParam requires the value to be present, so Spring responds with 400 before the constraint is even checked (MissingServletRequestParameterException).' + NOT_RUN, 'bad');
    } else {
      st.name = V.lit;
      if (isParam) push('@RequestParam String name: Spring takes name from the request parameters. The value taken is ' + V.lit + '.' + (c.val === 'empty' ? ' No characters follow name=, so the value is an empty string. This is different from having no value at all.' : '') + ' This step only takes the value. The ' + C.a + ' constraint has not done anything yet.');
      else push('@RequestBody ItemForm form: Spring reads the JSON body, creates an ItemForm object, and fills in the name field. ' + (c.val === 'none' ? 'The JSON has no name, so the name field stays null. null is a special value that means "refers to no value".' : 'The name field is ' + V.lit + '.') + ' This step only copies the value in. The ' + C.a + ' constraint above the field has not done anything yet.');

      st.stage = 3;
      if (how === 'plain') {
        st.gate = 'skipped';
        push('Deciding whether to validate: Spring passes the object to the validator only when the parameter is annotated with @Valid. This parameter has no @Valid, so validation is skipped. The ' + C.a + ' constraint in ItemForm is only a mark that says "this field must be like this", and it cannot block a value by itself.', violates ? 'bad' : '');
      } else {
        st.gate = 'validated';
        if (isParam) push('Deciding whether to validate: A constraint (' + C.a + ') is declared directly on the parameter. In this case, even without @Valid, Spring checks the constraints on the parameters just before it calls the controller method.');
        else push('@Valid: The parameter is annotated with @Valid, so Spring passes the ItemForm object it has just created to the validator (Hibernate Validator). The validator finds the constraints on the fields of that class and checks them one by one.');

        st.stage = 4; st.check = violates ? 'violated' : 'passed'; checked = violates ? 'failed: ' + C.a + ' violated on name' : 'passed';
        push(C.a + ' check: ' + C.rule + ' ' + C.why[c.val], violates ? 'bad' : 'good');

        if (how === 'br') {
          st.stage = 5; st.errors = violates ? 1 : 0; st.after = violates ? 'errors has 1 error' : 'errors is empty';
          push('BindingResult errors: A BindingResult parameter comes immediately after the parameter annotated with @Valid. Spring puts the validation result in this object and passes it to the controller. ' + (violates ? 'One constraint is violated, so the object holds 1 error. No exception is thrown.' : 'No constraint is violated, so the object is empty.'));
        } else if (violates) {
          st.stage = 5; st.fail = 5; status = '400 Bad Request'; ex = isParam ? 'HandlerMethodValidationException' : 'MethodArgumentNotValidException'; st.status = status; st.after = ex;
          push('Handling the validation failure: ' + (isParam ? 'Spring throws a HandlerMethodValidationException and responds with 400 Bad Request. The name of the exception is different from when an object is validated with @Valid (MethodArgumentNotValidException).' : 'A constraint is violated, and the method has no BindingResult parameter to receive that result. Spring throws a MethodArgumentNotValidException and responds with 400 Bad Request.') + NOT_RUN, 'bad');
        }
      }
    }
    if (!status) {
      st.stage = 6; st.ctrl = true; status = '200 OK'; st.status = status;
      var hasErr = how === 'br' && violates;
      ret = hasErr ? 'Errors: 1' : (isParam ? 'Search' : 'Registered') + ': [' + V.inner + ']'; st.ret = ret;
      if (how === 'br') push(call + ' is called: ' + (hasErr ? 'The controller method runs even though validation failed. errors.hasErrors() is true, so execution goes into the if block. The text returned is "' + ret + '". This code does not set the response status itself, so Spring responds with 200.' : 'The controller method runs. errors.hasErrors() is false, so the if block is skipped. The text returned is "' + ret + '", and Spring responds with 200.'), hasErr ? '' : 'good');
      else if (how === 'plain') push(call + ' is called: The controller method runs. The value of ' + holder + ' is ' + V.lit + '. The text returned is "' + ret + '", and Spring responds with 200.' + (violates ? ' A value that violates the ' + C.a + ' constraint has come all the way into the controller with nothing stopping it.' : ''), violates ? 'bad' : 'good');
      else push(call + ' is called: Validation passed, so the controller method runs. The value of ' + holder + ' is ' + V.lit + '. The text returned is "' + ret + '", and Spring responds with 200.', 'good');
    }
    var ran = st.ctrl;
    if (how === 'plain') sum.push(violates ? 'Putting a constraint on a field is not enough for the field to be validated. Spring calls the validator only when the controller parameter is annotated with @Valid.' : 'This value does not violate the ' + C.a + ' constraint, but it was not checked and found valid. It was not checked at all. Without @Valid, the controller runs without validation whatever value is sent.');
    else if (st.fail === 2) sum.push('When the value is missing altogether, the request is caught first by the "required value" check of @RequestParam. The constraint check comes after the value is taken. Both give 400, but the exceptions are different.');
    else if (how === 'br') sum.push(violates ? 'When a BindingResult comes immediately after the @Valid parameter, no exception is thrown even if validation fails, and the controller runs. Checking whether there are errors and deciding how to respond is the job of the controller code. If the code does not check hasErrors(), the invalid value is handled as it is.' : 'Even with a BindingResult, when no constraint is violated, the result is the same as with @Valid alone.');
    else if (violates) sum.push(isParam ? 'A constraint declared directly on a parameter is checked even without @Valid. When it fails, a HandlerMethodValidationException is thrown and the response is 400. This is the behavior in Spring Framework 7.0.9, which this lab was checked against.' : 'When an object annotated with @Valid violates a constraint, the controller does not run and the response is 400. This means that the side that sent the request is at fault. Invalid values do not get into the controller, so the controller can do its work trusting that the values are valid.');
    else sum.push('When validation passes, the controller runs exactly as it does without validation. The difference shows only when a value that violates the constraint arrives.');
    if (how !== 'plain' && st.fail !== 2) sum.push({ notnull: '@NotNull blocks only null. An empty string and whitespace pass, so @NotBlank is usually used for text that a person types in.', notempty: '@NotEmpty blocks null and the empty string, but it lets a string that contains only whitespace through, because the string has a length.', notblank: '@NotBlank blocks null, the empty string, and a string that contains only whitespace. It is the strictest of the three constraints.' }[c.con]);
    return { events: ev, summary: sum, row: [status, checked, ran ? 'ran' : 'skipped', ret, ex] };
  },
  render: function (v, sim, t, H, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : null, c = sim.c, self = this;
    if (!s) { H.text(v, 'Click Run to see, one step at a time, how a request reaches the controller with (or without) validation.'); return; }
    var order = ['none', 'empty', 'blank', 'pen'];
    H.table(v, ['Constraint', 'null', '""', '" "', '"pen"'], ['notnull', 'notempty', 'notblank'].map(function (k) {
      var K = self.CONS[k];
      return { cells: [k === c.con ? { v: K.a + ' (current)', cls: 'hot' } : K.a].concat(order.map(function (x) {
        var blocked = K.bad.indexOf(x) >= 0, word = blocked ? 'blocked' : 'passes';
        return k === c.con && x === c.val ? { v: word + (s.check ? '' : c.how === 'plain' || s.fail === 2 ? ' (not checked)' : ''), cls: s.check ? (blocked ? 'bad' : 'good') : 'hot' } : word;
      })) };
    }), 'Values each constraint blocks (the result when validation is done)');
  },
  // Diagram: the HTTP request at the top left, the place where the constraint is written at the bottom left (a field of ItemForm or a method parameter), and on the right the steps until Spring calls the controller (preparing the value, validate or not, constraint check, failure handling, controller). An arrow goes from the constraint to the check box only when the validator reads the constraint.
  draw: function (P, sim, shown) {
    var c = sim.c, V = this.VALS[c.val], C = this.CONS[c.con], isParam = c.how === 'param', last = shown[shown.length - 1];
    var s = last ? last.snap : { stage: 0, name: '', gate: '', check: '', after: '', errors: -1, status: '', fail: 0, ctrl: false, ret: '' };
    var skipped = s.gate === 'skipped', leaked = c.how === 'plain' && C.bad.indexOf(c.val) >= 0;
    P.size(680, 330);
    P.region('rq', 16, 16, 220, 122, 'HTTP request');
    P.box('r_line', 28, 50, 196, 30, { cls: s.stage >= 1 ? 'wait' : 'ghost', title: isParam ? 'GET /items' : 'POST /items' });
    P.box('r_val', 28, 92, 196, 30, { cls: s.fail === 2 ? 'bad' : s.stage >= 2 ? 'good' : s.stage >= 1 ? 'wait' : 'ghost', title: isParam ? 'Query string' : 'Body', right: isParam ? (V.query || 'none') : V.json });
    P.region('cl', 16, 150, 220, 102, isParam ? 'Constraint on the parameter' : 'Constraint in ItemForm');
    P.box('con', 28, 186, 196, 50, { cls: s.check === 'violated' ? 'bad' : s.check ? 'good' : skipped ? 'ghost' : s.gate ? 'hot' : 'plain', title: C.a, sub: isParam ? 'String name' : 'private String name;' });
    P.region('sp', 306, 16, 358, 236, 'Until Spring calls the controller');
    P.box('obj', 318, 48, 334, 30, { cls: s.fail === 2 ? 'bad' : s.stage >= 2 ? 'wait' : 'ghost', title: isParam ? 'Value in name' : 'Value in name of form', right: s.name });
    P.box('gate', 318, 84, 334, 30, { cls: !s.gate ? 'ghost' : skipped ? 'plain' : s.stage === 3 ? 'hot now' : 'hot', title: 'Validate?', right: !s.gate ? '' : skipped ? 'no @Valid: skipped' : isParam ? 'direct constraint: validated' : '@Valid present: validated' });
    P.box('chk', 318, 120, 334, 30, { cls: s.check === 'violated' ? 'bad' : s.check ? 'good' : 'ghost', title: C.a + ' check', right: s.check || (skipped || s.fail === 2 ? 'not done' : '') });
    P.box('aft', 318, 156, 334, 30, { cls: !s.after ? 'ghost' : s.fail ? 'bad' : s.errors === 1 ? 'hot' : 'plain', title: c.how === 'br' ? 'Where the result goes' : 'Rejected', right: s.after });
    P.box('ctrl', 318, 192, 334, 46, { cls: s.ctrl ? (leaked ? 'bad now' : s.errors === 1 ? 'hot now' : 'good now') : s.fail ? 'ghost' : 'plain', title: (isParam ? 'find(name)' : c.how === 'br' ? 'add(form, errors)' : 'add(form)') + ' call', sub: s.ctrl ? 'Text returned: ' + s.ret : s.fail ? 'did not run' : 'not yet' });
    if (s.stage >= 2) P.arrow('take', 'r_val:r', 'obj:l', { cls: s.fail === 2 ? 'bad' : 'good', label: s.fail === 2 ? 'no value' : 'value set' });
    if (s.gate) P.arrow('read', 'con:r', 'chk:l', { cls: skipped ? 'mut dash' : s.check === 'violated' ? 'bad' : s.check ? 'good' : 'hot', label: skipped ? 'not read' : 'constraint read' });
    P.box('resp', 16, 264, 648, 34, { cls: !s.status ? 'ghost' : s.ctrl ? (leaked || s.errors === 1 ? 'hot' : 'good') : 'bad', title: 'Response', right: s.status || 'In progress' });
    P.note('A green box is a step that passed or ran, and a red box is where a constraint was violated or the request was stopped. When a value that violates the constraint comes in without validation, the controller box turns red.');
  },
  assume: 'All 48 combinations of the 4 ways of receiving the value, the 3 constraints, and the 4 values sent were sent as HTTP requests to a real Spring Boot 4.1.1 server (Spring Framework 7.0.9, embedded Tomcat 11, Hibernate Validator 9.1.3.Final, jakarta.validation-api 3.1.1, JDK 21), and the status code, whether the validator actually ran, the violated constraint, whether the controller ran and the text it returned, and the name of the exception Spring threw were confirmed to match the screen. Whether the validator ran was confirmed by adding one more constraint that always passes and seeing whether it was called (it is not in the code on the screen). Every URL on the screen is /items, but for the check, each combination had its own URL. Spring Boot sets up a validator automatically when the validation library (spring-boot-starter-validation) is present, and this lab assumes that state. The behavior without the library was not verified. The names of the exceptions and the behavior of a constraint declared directly on a parameter depend on the Spring version. What is written here was observed on Spring Framework 7.0.9, and versions before 6.1 are known to behave differently, but they were not run. The body of an error response and the text of the error messages vary with the configuration and the language of the server, so they were not treated as results. The default error response body seen on this PC contained only timestamp, status, error, and path, and did not say which field was wrong. Cases that are not on the screen were also checked on the same server. Putting the Spring annotation @Validated on the parameter instead of @Valid gives the same results. Receiving form data with @Valid @ModelAttribute gives the same 12 results (3 constraints, 4 values) as @Valid @RequestBody, and the exception is also MethodArgumentNotValidException. Writing "name": null in the JSON is the same as not sending name. When an object contains another object as a field, the constraints of the inner object are checked only if that field has @Valid (without it, the result is 200), and when the inner object is null, validation does not go into it even with @Valid, and it passes. A constraint that specifies groups is not checked with @Valid and is checked only when the parameter is received with @Validated(that group), and conversely, a constraint without groups is not checked when the parameter is received with @Validated(that group). When two fields both violate their constraints, there are 2 errors, so validation does not stop at the first error. When an @Valid object and a parameter with a constraint declared directly on it are received in the same method, a failure on the object side also comes out as HandlerMethodValidationException. When the value is received with @RequestParam(required = false) and is not sent, null comes in and is caught by @NotNull and @NotBlank. Putting @Validated on the controller class changes the failure of a parameter constraint into ConstraintViolationException and 500. Putting @NotBlank on an Integer field gives 500 with UnexpectedTypeException at validation time. Placing the BindingResult before the @Valid parameter gives 500 with IllegalStateException. If you handle MethodArgumentNotValidException with an @ExceptionHandler, you can get which field violated which constraint and write it in the body of the 400 response yourself. The screen is simplified to one field and one constraint, and for whitespace, only a single space character was checked.',
});

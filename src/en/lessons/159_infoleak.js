Lab.register({
  id: 'infoleak', nav: 'Information leakage', cat: 'Authentication', mode: 'step',
  title: 'What do error responses and login failure messages tell the outside world?',
  intro: 'The response a server returns when something fails can carry more than you might expect. An SQL statement inside an exception message, or the class names and line numbers inside a stack trace, show what the inside of the server looks like and give an attacker clues. If a login failure message tells "unknown user ID" apart from "wrong password", it also tells which IDs are registered.',
  terms: ['Error responses and information leakage', 'Stack trace', 'Account enumeration', '@ControllerAdvice and @ExceptionHandler', 'HTTP status codes'],
  controls: [
    { id: 'topic', label: 'Response to look at', type: 'select', value: 'boot', options: [['boot', 'Spring Boot default error response'], ['handler', 'Error response I build myself (@ExceptionHandler)'], ['login', 'Login failure response']] },
    { id: 'msg', label: 'spring.web.error.include-message', type: 'select', value: 'always', options: [['never', 'never (default)'], ['always', 'always']], show: function (c) { return c.topic === 'boot'; } },
    { id: 'trace', label: 'spring.web.error.include-stacktrace', type: 'select', value: 'always', options: [['never', 'never (default)'], ['on_param', 'on_param (only when the request has trace=true)'], ['always', 'always']], show: function (c) { return c.topic === 'boot'; } },
    { id: 'q', label: 'Add ?trace=true to the end of the request URL', type: 'check', value: false, show: function (c) { return c.topic === 'boot' && c.trace === 'on_param'; } },
    { id: 'body', label: 'What the @ExceptionHandler puts in the response', type: 'select', value: 'raw', options: [['raw', 'The exception message as it is (e.getMessage())'], ['safe', 'Only a fixed message and an error ID (details go to the log)']], show: function (c) { return c.topic === 'handler'; } },
    { id: 'lg', label: 'How the login failure is reported', type: 'select', value: 'split', options: [['split', 'Code I wrote myself: the two cases give different messages'], ['sec', 'Spring Security default'], ['unhide', 'Spring Security with hideUserNotFoundExceptions set to false']], show: function (c) { return c.topic === 'login'; } },
    { id: 'acct', label: 'User ID the attacker tries', type: 'select', value: 'none', options: [['none', 'ghost (an ID that is not registered)'], ['exist', 'kim (a registered ID, wrong password)']], show: function (c) { return c.topic === 'login'; } },
  ],
  presets: [
    { t: 'Default settings', q: 'What does the Spring Boot default error response send out when include-message and include-stacktrace are both always?', d: 'A server where both settings are always, to make development easier. The SQL and the stack trace go into the response.', v: { topic: 'boot', msg: 'always', trace: 'always', q: false, body: 'raw', lg: 'split', acct: 'none' } },
    { t: 'Spring Boot defaults', q: 'What if you set spring.web.error.include-message and spring.web.error.include-stacktrace both to never?', d: 'Both are never. Only the fact that an error happened goes out.', v: { topic: 'boot', msg: 'never', trace: 'never', q: false, body: 'raw', lg: 'split', acct: 'none' } },
    { t: 'on_param with ?trace=true', q: 'What if you set include-stacktrace to on_param and add ?trace=true to the end of the request URL?', d: 'Anyone can add the parameter, so the trace is not hidden.', v: { topic: 'boot', msg: 'never', trace: 'on_param', q: true, body: 'raw', lg: 'split', acct: 'none' } },
    { t: 'Exception message sent as it is', q: 'What if both settings are never, but the @ExceptionHandler puts the exception message in the response as it is?', d: 'Even with default settings, information leaks if the code sends it out itself.', v: { topic: 'handler', msg: 'never', trace: 'never', q: false, body: 'raw', lg: 'split', acct: 'none' } },
    { t: 'Only a fixed message and an error ID', q: 'What if both settings are never, and the @ExceptionHandler puts only a fixed message and an error ID in the response?', d: 'The details are kept only in the server\'s log.', v: { topic: 'handler', msg: 'never', trace: 'never', q: false, body: 'safe', lg: 'split', acct: 'none' } },
    { t: 'If the login failure messages differ', q: 'What if the attacker tries ghost, an unregistered ID, on a login whose own code gives different messages for the two cases?', d: 'They tell whether the user ID is registered.', v: { topic: 'login', msg: 'always', trace: 'always', q: false, body: 'raw', lg: 'split', acct: 'none' } },
    { t: 'Login with the Spring Security default', q: 'What if the login failure is reported with the Spring Security default and the attacker tries ghost?', d: 'The responses for an unknown user ID and for a wrong password are the same.', v: { topic: 'login', msg: 'always', trace: 'always', q: false, body: 'raw', lg: 'sec', acct: 'none' } },
  ],
  SQL: 'select id, item, pirce from orders where id = ?',
  // Items in the Spring Boot default error response, and the internal information visible in them
  bootFacts: function (c) {
    var msg = c.msg === 'always', trace = c.trace === 'always' || (c.trace === 'on_param' && !!c.q);
    var keys = ['timestamp', 'status', 'error']; if (trace) keys.push('trace'); if (msg) keys.push('message'); keys.push('path');
    return { msg: msg, trace: trace, keys: keys, leak: { sql: msg || trace, frames: trace, db: trace } };   // The first line of the stack trace also contains the exception message (the SQL)
  },
  leakText: function (leak) {
    var a = []; if (leak.sql) a.push('SQL statement'); if (leak.frames) a.push('class names and line numbers'); if (leak.db) a.push('database product name');
    return a.length ? a.join(', ') : 'None';
  },
  // What happens inside the server when a login fails
  loginFacts: function (c) {
    var none = c.acct === 'none', split = c.lg === 'split';
    var ex = split ? '' : c.lg === 'unhide' && none ? 'UsernameNotFoundException' : 'BadCredentialsException';
    var other = split ? '' : c.lg === 'unhide' && !none ? 'UsernameNotFoundException' : 'BadCredentialsException';
    function say(n, e) { return split ? (n ? '"The user ID does not exist."' : '"The password is wrong."') : 'the message of ' + e; }
    return { none: none, ex: ex, body: say(none, ex), otherBody: say(!none, other), same: c.lg === 'sec', matches: split && none ? 0 : 1 };
  },
  code: function (c) {
    if (c.topic === 'boot') return '# application.properties\nspring.web.error.include-message=' + c.msg + '\nspring.web.error.include-stacktrace=' + c.trace + '\n\n// Order lookup. A column name in the SQL is wrong (price is written as pirce)\n@GetMapping("/orders/{id}")\npublic Map<String, Object> order(@PathVariable long id) {\n    return jdbc.queryForMap(\n        "' + this.SQL + '", id);\n}\n\n// Request: GET /orders/7' + (c.trace === 'on_param' && c.q ? '?trace=true' : '');
    if (c.topic === 'handler') return '// The order lookup controller stays as it is. This class catches the exception and builds the response itself\n@RestControllerAdvice\nclass ' + (c.body === 'raw' ? 'RawAdvice' : 'SafeAdvice') + ' {\n' + (c.body === 'raw' ? '    @ExceptionHandler(Exception.class)\n    public ResponseEntity<Map<String, Object>> handle(Exception e) {\n        return ResponseEntity.status(500)\n            .body(Map.of("message", e.getMessage()));   // the exception message as it is\n    }' : '    private static final Logger log = LoggerFactory.getLogger(SafeAdvice.class);\n\n    @ExceptionHandler(Exception.class)\n    public ResponseEntity<Map<String, Object>> handle(Exception e) {\n        String errorId = UUID.randomUUID().toString().substring(0, 8);\n        log.error("errorId={}", errorId, e);        // the details go only to the server log\n        return ResponseEntity.status(500)\n            .body(Map.of("message", "The request could not be processed.",\n                         "errorId", errorId));\n    }') + '\n}\n\n// Request: GET /orders/7';
    var req = '\n\n// Request: POST /login  id=' + (c.acct === 'none' ? 'ghost' : 'kim') + '&pw=(any value)';
    if (c.lg === 'split') return '@PostMapping("/login")\npublic ResponseEntity<String> login(@RequestParam String id,\n                                    @RequestParam String pw) {\n    Member m = members.findById(id);\n    if (m == null)\n        return ResponseEntity.status(401).body("The user ID does not exist.");\n    if (!encoder.matches(pw, m.getPassword()))\n        return ResponseEntity.status(401).body("The password is wrong.");\n    return ResponseEntity.ok("Logged in");\n}' + req;
    return '@Bean\nAuthenticationManager authenticationManager(UserDetailsService users,\n                                            PasswordEncoder encoder) {\n    DaoAuthenticationProvider provider = new DaoAuthenticationProvider(users);\n    provider.setPasswordEncoder(encoder);\n' + (c.lg === 'unhide' ? '    provider.setHideUserNotFoundExceptions(false);   // the default is true\n' : '') + '    return new ProviderManager(provider);\n}\n\n@PostMapping("/login")\npublic ResponseEntity<String> login(@RequestParam String id,\n                                    @RequestParam String pw) {\n    try {\n        authenticationManager.authenticate(\n            UsernamePasswordAuthenticationToken.unauthenticated(id, pw));\n        return ResponseEntity.ok("Logged in");\n    } catch (AuthenticationException e) {\n        return ResponseEntity.status(401).body(e.getMessage());\n    }\n}' + req;
  },
  label: function (c) {
    if (c.topic === 'boot') return 'Default error response · message ' + c.msg + ' · stacktrace ' + c.trace + (c.trace === 'on_param' ? (c.q ? ' · ?trace=true' : ' · no parameter') : '');
    if (c.topic === 'handler') return '@ExceptionHandler · ' + (c.body === 'raw' ? 'exception message as it is' : 'fixed message and error ID');
    return 'Login failure · ' + { split: 'hand-written code', sec: 'Security default', unhide: 'hideUserNotFoundExceptions=false' }[c.lg] + ' · ' + (c.acct === 'none' ? 'unregistered ID' : 'wrong password');
  },
  columns: ['Response status', 'What the response body contains', 'Internal information leaked'],
  simulate: function (c) { return c.topic === 'login' ? this.simLogin(c) : this.simError(c); },
  simError: function (c) {
    var boot = c.topic === 'boot', f = boot ? this.bootFacts(c) : null, ev = [], sum = [], SQL = this.SQL;
    var msgText = 'PreparedStatementCallback; bad SQL grammar [' + SQL + ']';
    var st = { phase: 0, items: [], made: '' };
    function push(s, k) { ev.push({ s: s, k: k, snap: JSON.parse(JSON.stringify(st)) }); }
    var q = boot && c.trace === 'on_param' && c.q;
    st.phase = 1;
    push('A GET /orders/7' + (q ? '?trace=true' : '') + ' request arrives. It is an ordinary request to look up order 7.' + (q ? ' The parameter trace=true is added to the end of the URL.' : ''), '');
    st.phase = 2;
    push('jdbc.queryForMap(SQL, id): the column name price is misspelled as pirce in the SQL. The database rejects the SQL, and Spring converts that into a BadSqlGrammarException and throws it. The message of this exception contains the whole SQL statement that was about to run.', '');
    var keys, leak, res;
    if (boot) {
      st.phase = 3; st.made = '/error (BasicErrorController)';
      st.items.push({ k: 'timestamp, status, error, path', v: 'time of the error, 500, Internal Server Error, /orders/7', cls: '' });
      push('No code catches the exception, so the request is forwarded to /error, and the BasicErrorController of Spring Boot builds the error response. The items included regardless of the settings are timestamp, status, error, and path. Up to here, the response only says that "an error happened".', '');
      st.phase = 4;
      if (f.msg) { st.items.push({ k: 'message', v: msgText, cls: 'bad' }); push('include-message=always: the exception message is put in the message item. The SQL statement goes into the response as it is, and the table name (orders) and the column names (id, item) are exposed.', 'bad'); }
      else push('include-message=never: the exception message is not put in the response.', 'good');
      st.phase = 5;
      // In the actual response, trace comes before message
      if (f.trace) { st.items.splice(1, 0, { k: 'trace', v: 'org.springframework.jdbc.BadSqlGrammarException: ' + msgText + ' … (over a hundred lines of methods and line numbers the exception passed through, and below them the exception from the database driver)', cls: 'bad' }); push('include-stacktrace=' + c.trace + ': ' + (c.trace === 'on_param' ? 'the request has trace=true, so ' : '') + 'the stack trace is put in the trace item. The first line has the class name of the exception and its message (including the SQL), and below it the methods the exception passed through are listed with their class names and line numbers. The class name of the database driver (org.h2…) also shows which database is used.' + (c.trace === 'on_param' ? ' Anyone can add this parameter to the URL.' : ''), 'bad'); }
      else push('include-stacktrace=' + c.trace + ': ' + (c.trace === 'on_param' ? 'the request has no trace parameter, so ' : '') + 'the stack trace is not put in the response.', 'good');
      keys = f.keys; leak = f.leak;
    } else {
      st.phase = 3; st.made = '@ExceptionHandler (' + (c.body === 'raw' ? 'RawAdvice' : 'SafeAdvice') + ')';
      push('@ExceptionHandler(Exception.class) receives the exception. Because it builds the response itself, the request is not forwarded to /error, and the error response settings of Spring Boot, such as include-message, are not used.', '');
      st.phase = 4;
      if (c.body === 'raw') { st.items.push({ k: 'message', v: msgText, cls: 'bad' }); push('body(Map.of("message", e.getMessage())): the exception message is put in the response as it is. Even with the Spring Boot settings at their default (never), the SQL statement goes into the response.', 'bad'); keys = ['message']; leak = { sql: true, frames: false, db: false }; }
      else {
        push('log.error("errorId={}", errorId, e): the whole exception (message and stack trace) is written to the server log, together with an error ID so it can be found later. The log stays inside the server and is not sent out in the response.', 'good');
        st.phase = 5; st.items.push({ k: 'message', v: 'The request could not be processed.', cls: 'good' }, { k: 'errorId', v: 'ID used to find it in the log (for example, 3f9a1c2e)', cls: 'good' });
        push('The response contains only a fixed message and the error ID. When the user reports this ID, the developer uses it to find the details in the log.', 'good'); keys = ['message', 'errorId']; leak = { sql: false, frames: false, db: false };
      }
    }
    var leaked = this.leakText(leak), any = leaked !== 'None';
    st.phase = 6;
    push('The server sends a 500 response. The items in the body are ' + keys.join(', ') + '. ' + (any ? 'Whoever sent the request can read the ' + leaked + '.' : 'Nothing in it shows what the inside of the server looks like.'), any ? 'bad' : 'good');
    if (boot && !any) sum.push('The Spring Boot default does not put the exception message or the stack trace in the response. It is important that a setting changed to always during development does not go out to the production server.');
    if (boot && f.msg && !f.trace) sum.push('It is only one line of message, but the SQL statement is inside it. An exception message is written for developers to read, so it easily contains things such as SQL, file paths, and internal addresses.');
    if (boot && f.trace) sum.push('A stack trace reveals the most. It shows the framework and database in use and the class names and structure of your code, and its first line contains the exception message, so the SQL goes out too even if include-message is never.');
    if (boot && c.trace === 'on_param') sum.push('on_param only means "include it when the request has trace=true". It is not a way to hide anything. Anyone can add the parameter, so on a server that can be reached from outside, it is no different from always.');
    if (!boot && c.body === 'raw') sum.push('When you build the error response yourself, you are also responsible for what goes into it. Code that sends e.getMessage() as it is sends internal information outside, whatever the Spring Boot settings are.');
    if (!boot && c.body === 'safe') sum.push('Tell the user briefly that something went wrong, and keep what is needed to find the cause in the log. The error ID is the thread that ties the two together.');
    if (any) sum.push('This information alone does not break into the server, but the more an attacker learns about table and column names, the products in use, and the structure of the code, the more precisely the next attempt can be aimed.');
    return { events: ev, summary: sum, row: ['500', keys.join(', '), leaked], keys: keys, leak: leak, logged: !boot && c.body === 'safe' };
  },
  simLogin: function (c) {
    var f = this.loginFacts(c), id = f.none ? 'ghost' : 'kim', ev = [], sum = [], split = c.lg === 'split';
    var st = { phase: 0, found: '', pw: '', body: '', learned: '' };
    function push(s, k) { ev.push({ s: s, k: k, snap: JSON.parse(JSON.stringify(st)) }); }
    st.phase = 1;
    push('POST /login (id=' + id + ', any password): the attacker tries to log in to find out which IDs are registered. The attacker has no plan to guess the password and only wants to look at the response. This time the ID ' + id + (f.none ? ' is not actually registered.' : ' is actually registered.'), '');
    st.phase = 2; st.found = f.none ? 'Not found' : 'Found';
    if (split) push('members.findById(id): looks up the member by ID. ' + (f.none ? 'There is none. Without even comparing the password, the code decides to respond "The user ID does not exist."' : 'There is one. It moves on to the next line and compares the password.'), f.none ? 'bad' : '');
    else push('authenticationManager.authenticate(...): the DaoAuthenticationProvider of Spring Security looks up the member by ID. ' + (f.none ? 'There is none. Inside, a UsernameNotFoundException occurs.' : 'There is one. Next it compares the password.'), '');
    st.phase = 3;
    if (split && f.none) st.pw = 'Not compared';
    else if (split) { st.pw = 'Compared with the stored value: wrong'; push('encoder.matches(pw, m.getPassword()): the password that was entered does not match the stored value. The code decides to respond "The password is wrong."', 'bad'); }
    else if (f.none) { st.pw = 'Compared once with a dummy value'; push('Even though there is no such ID, it still performs one password comparison (against a dummy value prepared in advance). The aim is to make the time taken close to that of an existing ID. ' + (c.lg === 'sec' ? 'And with the default setting (hideUserNotFoundExceptions=true), it replaces the UsernameNotFoundException with a BadCredentialsException and throws that.' : 'Because hideUserNotFoundExceptions was changed to false, it throws the UsernameNotFoundException as it is, without replacing it.'), c.lg === 'sec' ? 'good' : 'bad'); }
    else { st.pw = 'Compared with the stored value: wrong'; push('It compares the password that was entered with the stored value: they do not match. It throws a BadCredentialsException.', ''); }
    st.phase = 4; st.body = f.body;
    push('The server sends a 401 response. The body contains ' + f.body + '.' + (split ? '' : ' The controller put the exception message into the body as it is.'), '');
    st.phase = 5;
    var learned = f.same ? 'None' : f.none ? 'That this ID is not registered' : 'That this ID is registered';
    st.learned = learned;
    if (f.same) push('The attacker compares it with the response received for another ID: for an ID that is not registered and for an ID with a wrong password, the status code and the body are exactly the same. From this response alone, the attacker cannot tell whether the ID is registered.', 'good');
    else push('The attacker compares it with the response received for another ID: the body for ' + (f.none ? 'a wrong password' : 'an ID that is not registered') + ' is ' + f.otherBody + ', which differs from the one just received. So the attacker learns that ' + id + (f.none ? ' is not registered' : ' is registered') + '. Repeating this with different IDs builds a list of registered IDs.', 'bad');
    if (!f.same) sum.push('If you explain helpfully why the login failed, the information that "this ID is registered" goes out with it. A list of registered IDs becomes the target of password guessing or of deceptive emails. Use a single failure message, such as "Invalid user ID or password."');
    if (c.lg === 'sec') sum.push('By default, Spring Security turns both cases into the same exception (BadCredentialsException), and it also performs one password comparison when the ID does not exist, which makes the two cases hard to tell apart by response time.');
    if (c.lg === 'unhide') sum.push('Setting hideUserNotFoundExceptions to false makes the two exceptions distinguishable. Even if the intent is to tell the causes apart in the server log, the difference must not show in the response.');
    if (split && f.none) sum.push('This hand-written code skips the password comparison when the ID does not exist. Even if you merge the messages into one, the response time may still differ.');
    sum.push('The same information leaks from other screens too. "This ID is already in use." on sign-up and "This email is not registered." on password recovery must be reviewed together with the login screen.');
    return { events: ev, summary: sum, row: ['401', f.body, learned], ex: f.ex || '-', same: f.same, matches: f.matches };
  },
  render: function (v, sim, t, H, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : null, c = sim.c;
    if (!s) { H.text(v, 'Click Run to go one step at a time.'); return; }
    if (c.topic === 'login') {
      H.text(v, 'The message texts vary with the version and the language settings. With Spring Security 7.1.1 on the PC used to write this lab, the message of BadCredentialsException came out in Korean because of the language setting of that PC (the English text in the messages.properties file of the same library is "Bad credentials"), and the message of UsernameNotFoundException was "user not found".');
      return;
    }
    if (s.items.length) H.table(v, ['Item', 'Value', 'Is it information from inside the server?'], s.items.map(function (it) { return { cells: [it.k, it.v, { v: it.cls === 'bad' ? 'Yes' : 'No', cls: it.cls === 'bad' ? 'bad' : 'good' }] }; }), 'Response body (JSON)' + (s.made ? ' · Built by: ' + s.made : ''));
    else H.text(v, 'The response has not been built yet.');
    if (c.topic === 'boot') H.text(v, 'Up to Spring Boot 3, these settings were named server.error.include-message and server.error.include-stacktrace. In Spring Boot 4.1.1, giving always with the old names had no effect, and the default (never) applied.');
  },
  // Diagram: for error responses, what happens inside the server on the left (the request, the exception, the place that builds the response) and the items of the response body on the right. For login, the two steps inside the server and the responses of the two cases side by side, to show whether they are the same or different.
  draw: function (P, sim, shown) {
    var c = sim.c, last = shown[shown.length - 1], s = last ? last.snap : { phase: 0, items: [] }, ph = s.phase;
    P.size(680, 316);
    if (c.topic === 'login') {
      var f = this.loginFacts(c), id = f.none ? 'ghost' : 'kim';
      P.box('l_try', 16, 16, 648, 36, { cls: ph >= 1 ? 'plain' : 'ghost', title: 'Attacker\'s attempt: POST /login', right: 'id=' + id + ', any password' });
      P.region('l_sv', 16, 64, 648, 98, 'What happened inside the server');
      P.box('l_find', 28, 94, 306, 54, { cls: ph >= 2 ? 'wait' : 'ghost', title: 'Look up the member by ID', sub: ph >= 2 ? (f.none ? 'ghost: not found' : 'kim: found') : 'Not looked up yet' });
      P.box('l_pw', 346, 94, 306, 54, { cls: ph >= 3 ? 'wait' : 'ghost', title: 'Compare the password', sub: ph >= 3 ? s.pw : 'Not compared yet' });
      if (ph >= 2) P.arrow('l_a1', 'l_try:b:0.2', 'l_find:t');
      if (ph >= 3 && f.matches) P.arrow('l_a2', 'l_find:r', 'l_pw:l');
      var mine = f.none ? 'l_none' : 'l_exist', cmp = ph >= 5;
      P.box('l_none', 16, 176, 318, 68, { cls: (f.none ? ph >= 4 : cmp) ? ((cmp ? (f.same ? 'good' : 'bad') : 'hot') + (f.none ? ' now' : '')) : 'ghost', title: 'Response for an unregistered ID', sub: (f.none ? ph >= 4 : cmp) ? ['401', f.none ? f.body : f.otherBody] : [f.none ? 'No response yet' : '(the other case)', ' '] });
      P.box('l_exist', 346, 176, 318, 68, { cls: (!f.none ? ph >= 4 : cmp) ? ((cmp ? (f.same ? 'good' : 'bad') : 'hot') + (!f.none ? ' now' : '')) : 'ghost', title: 'Response for a wrong password', sub: (!f.none ? ph >= 4 : cmp) ? ['401', !f.none ? f.body : f.otherBody] : [!f.none ? 'No response yet' : '(the other case)', ' '] });
      if (ph >= 4) P.arrow('l_a3', (f.matches ? 'l_pw' : 'l_find') + ':b', mine + ':t', { cls: 'hot', label: 'Response' });
      P.box('l_res', 16, 264, 648, 36, { cls: !cmp ? 'ghost' : f.same ? 'good' : 'bad', title: 'What the attacker learned', right: cmp ? s.learned : 'In progress' });
      P.note('The thick outline is the response to this attempt.');
      return;
    }
    var boot = c.topic === 'boot', q = boot && c.trace === 'on_param' && c.q, items = s.items;
    P.region('e_sv', 16, 16, 300, 232, 'Server (shop.example)');
    P.box('e_ctl', 28, 46, 276, 50, { cls: ph >= 1 ? 'wait' : 'ghost', title: 'GET /orders/7' + (q ? '?trace=true' : ''), sub: 'jdbc.queryForMap(SQL, id)' });
    P.box('e_ex', 28, 106, 276, 66, { cls: ph >= 2 ? 'bad' : 'ghost', title: 'BadSqlGrammarException', sub: ph >= 2 ? ['Message: bad SQL grammar', '[select id, item, pirce from …]'] : ['No exception yet', ' '] });
    P.box('e_mk', 28, 184, 276, 58, { cls: ph >= 3 ? 'hot' : 'ghost', title: boot ? '/error (BasicErrorController)' : '@ExceptionHandler', sub: boot ? ['include-message=' + c.msg, 'include-stacktrace=' + c.trace] : c.body === 'raw' ? ['Sends e.getMessage() out', ' '] : ['Exception goes to the log only', 'Response: message and error ID'] });
    if (ph >= 2) P.arrow('e_a1', 'e_ctl:b', 'e_ex:t', { cls: 'bad' });
    if (ph >= 3) P.arrow('e_a2', 'e_ex:b', 'e_mk:t');
    P.region('e_rs', 332, 16, 332, 232, 'Response body (JSON)' + (ph === 6 ? ' · status code 500' : ''));
    var SHORT = { 'timestamp, status, error, path': ['That an error occurred, request path'], message: null, trace: ['Exception class name, SQL statement,', 'methods, line numbers, DB driver'], errorId: ['ID used to find it in the log'] };
    if (!items.length) P.box('e_none', 344, 46, 308, 58, { cls: 'ghost', title: 'Response not built yet', sub: ' ' });
    items.forEach(function (it, i) {
      var sub = SHORT[it.k] || (it.cls === 'bad' ? ['bad SQL grammar', '[select id, item, pirce from …]'] : ['"' + it.v + '"']);
      P.box('e_k_' + it.k.split(',')[0], 344, 46 + i * 66, 308, 58, { cls: it.cls || 'plain', title: it.k, sub: sub });
    });
    if (ph >= 3 && items.length) P.arrow('e_a3', 'e_mk:r', 'e_k_' + items[0].k.split(',')[0] + ':l', { cls: 'hot' });
    P.box('e_res', 16, 264, 648, 36, { cls: ph < 6 ? 'ghost' : sim.row[2] === 'None' ? 'good' : 'bad', title: 'Leaked info', right: ph < 6 ? 'In progress' : sim.row[2] });
    P.note('The red items show what the inside of the server looks like.');
  },
  assume: '12 error responses (2 message settings × 3 stack trace settings × whether the trace parameter is present), 2 responses built by hand, and 6 login failures were checked against the actual responses of a Spring Boot 4.1.1 (Spring Security 7.1.1, Spring JDBC, H2) server started on 127.0.0.1. The message texts and the number of stack trace lines vary with the version and the environment, so what was checked is which items are in the body, whether the SQL statement, the stack trace lines, and the name of the database driver are visible in the body, whether the two login failure responses are the same, which exception occurred, and how many times the password comparison was called. The message values on screen were seen on the PC used to write this lab, and the example errorId is a made-up value. The checks were based on requests that receive JSON; for a request that receives HTML, as a browser does, the same content appearing on the error page was confirmed for one setting. The setting names are the spring.web.error.* names of Spring Boot 4.1.1 (server.error.* up to Spring Boot 3). include-exception, include-binding-errors, and the on_param value of message are not covered. That the whole exception is written to the log in the safe response was confirmed by collecting the log output. Not run: the difference in response time was not measured (only the number of times the password comparison was called was checked), and the messages on the sign-up and password recovery screens are an explanation that follows the authentication guidance of OWASP. How much the leaked information helps in a real attack differs from server to server.',
});

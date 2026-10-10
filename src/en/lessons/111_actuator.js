Lab.register({
  id: 'actuator', nav: 'Actuator and health checks', cat: 'Spring', mode: 'step',
  title: 'What does the health check answer when the connection to the payment provider is lost?',
  intro: 'Actuator is a library that creates paths through which you can ask, from outside, about the state of a running Spring Boot application. Among them, /actuator/health answers the question "is this server healthy?". The answer is decided by combining the statuses that several components inside the application each report, and which components are asked depends on the path that you request. Change the status of pay, the component that checks the connection to the payment provider, and the requested path, and compare the responses.',
  terms: ['Actuator', 'HealthIndicator and the overall health status', 'Health group', 'Health check (liveness, readiness)', 'Exposing Actuator endpoints and controlling access'],
  controls: [
    { id: 'pay', label: 'Status that the pay component returns', type: 'select', value: 'DOWN', hint: 'This is the value that the custom PayHealthIndicator returns.', options: [['UP', 'UP (connected to the payment provider normally)'], ['DOWN', 'DOWN (cannot connect to the payment provider)'], ['OUT_OF_SERVICE', 'OUT_OF_SERVICE (the payment feature was taken down on purpose)'], ['UNKNOWN', 'UNKNOWN (not known)']] },
    { id: 'path', label: 'Requested path', type: 'select', value: 'health', options: [['health', 'GET /actuator/health'], ['liveness', 'GET /actuator/health/liveness'], ['readiness', 'GET /actuator/health/readiness']] },
    { id: 'details', label: 'show-details setting and who sends the request', type: 'select', value: 'never', hint: 'This setting decides whether the body shows the content of each component.', options: [['never', 'never (the default when it is not set)'], ['auth_anon', 'when-authorized, request without login'], ['auth_user', 'when-authorized, request from a logged-in user'], ['always', 'always']] },
    { id: 'ready', label: 'Add pay to the readiness group', type: 'check', value: false, hint: 'management.endpoint.health.group.readiness.include=readinessState,pay' },
  ],
  presets: [
    { t: 'Default settings', d: 'pay is DOWN. The response is 503, but the body says only DOWN, so you cannot see what is wrong.', v: { pay: 'DOWN', path: 'health', details: 'never', ready: false } },
    { t: 'show-details set to always', d: 'The status and details of each component appear in the body.', v: { pay: 'DOWN', path: 'health', details: 'always', ready: false } },
    { t: 'when-authorized without login', d: 'For a request with no login information, the content is hidden exactly as with never.', v: { pay: 'DOWN', path: 'health', details: 'auth_anon', ready: false } },
    { t: 'Asking liveness', d: 'Even though pay is DOWN, the response is 200 UP. The liveness group does not ask pay.', v: { pay: 'DOWN', path: 'liveness', details: 'never', ready: false } },
    { t: 'Asking readiness', d: 'By default, the readiness group does not ask pay either. The response is again 200 UP.', v: { pay: 'DOWN', path: 'readiness', details: 'never', ready: false } },
    { t: 'Adding pay to the readiness group', d: 'Now, when pay is DOWN, readiness also becomes 503.', v: { pay: 'DOWN', path: 'readiness', details: 'never', ready: true } },
    { t: 'UP wins over UNKNOWN', d: 'Even when pay answers "not known", the overall status is UP and the response is 200.', v: { pay: 'UNKNOWN', path: 'health', details: 'always', ready: false } },
  ],
  PATHS: { health: '/actuator/health', liveness: '/actuator/health/liveness', readiness: '/actuator/health/readiness' },
  COMPS: [['livenessState', 'Running without failure?'], ['readinessState', 'Ready for requests?'], ['pay', 'Payment connection up?']],
  // Severity order. The nearer the front a status is, the sooner it is picked as the overall status
  ORDER: ['DOWN', 'OUT_OF_SERVICE', 'UP', 'UNKNOWN'],
  METHOD: { UP: 'up', DOWN: 'down', OUT_OF_SERVICE: 'outOfService', UNKNOWN: 'unknown' },
  cls: function (status) { return status === 'UP' ? 'good' : status === 'UNKNOWN' ? 'hot' : 'bad'; },
  // The components that the request asks with these settings (in the order they are asked)
  members: function (c) { return c.path === 'health' ? ['livenessState', 'readinessState', 'pay'] : c.path === 'liveness' ? ['livenessState'] : c.ready ? ['readinessState', 'pay'] : ['readinessState']; },
  code: function (c) {
    var show = c.details === 'never' ? '' : c.details === 'always' ? 'always' : 'when-authorized';
    var props = '# application.properties\n# Turns off the components that are added automatically (diskSpace, ping, ssl, db). This setting keeps the lab simple\nmanagement.health.defaults.enabled=false\n' +
      (show ? 'management.endpoint.health.show-details=' + show + '\n' : '# show-details is not set (the default is never)\n') +
      (c.ready ? 'management.endpoint.health.group.readiness.include=readinessState,pay\n' : '');
    var java = '// A custom component. Removing HealthIndicator from the bean name\n// payHealthIndicator gives "pay", which becomes the name of the component\n@Component\nclass PayHealthIndicator implements HealthIndicator {\n\n    @Override\n    public Health health() {\n        // Returns the result of trying to connect to the payment provider server as a status. Here it is ' + c.pay + '\n        return Health.' + this.METHOD[c.pay] + '().withDetail("target", "pay.example").build();\n    }\n}';
    return '// Request sent (' + (c.details === 'auth_user' ? 'logged-in user' : 'not logged in') + ')\n// GET ' + this.PATHS[c.path] + '\n\n' + props + '\n' + java;
  },
  label: function (c) { return 'pay ' + c.pay + ' · ' + this.PATHS[c.path] + ' · show-details ' + { never: 'never', auth_anon: 'when-authorized (not logged in)', auth_user: 'when-authorized (logged in)', always: 'always' }[c.details] + (c.ready ? ' · pay in readiness' : ''); },
  columns: ['HTTP status code', 'status in the body', 'Components asked for their status', 'What the body shows'],
  simulate: function (c) {
    var self = this, url = this.PATHS[c.path], mem = this.members(c), ev = [], sum = [];
    var st = { stage: 0, members: [], asked: {}, overall: '', code: '', vis: '', body: '' };
    function push(s, k) { ev.push({ s: s, k: k || '', snap: JSON.parse(JSON.stringify(st)) }); }
    var login = c.details === 'auth_user', hasPay = mem.indexOf('pay') >= 0, grouped = c.path !== 'health';
    // A group that is exactly as Spring Boot created it (liveness or readiness that the configuration has not touched) returns only the status
    var builtin = c.path === 'liveness' || (c.path === 'readiness' && !c.ready);
    var visible = !builtin && (c.details === 'always' || c.details === 'auth_user');
    var MEAN = { UP: 'This means that the connection to the payment provider server works normally.', DOWN: 'This means that the payment provider server cannot be reached.', OUT_OF_SERVICE: 'This means that the payment feature was taken down on purpose.', UNKNOWN: 'This means that it is not known whether the connection works.' };

    st.stage = 1;
    push('GET ' + url + ': ' + (login ? 'A request from a logged-in user' : 'A request without login') + ' arrives. Paths that start with /actuator are created by Actuator. Unless you configure it otherwise, health is the only one exposed over the web.');

    st.stage = 2; st.members = mem.slice();
    if (!grouped) push(url + ': The path ends at health, so every registered component is asked. Three components are registered in this application: livenessState, readinessState, and pay. The first two are added by Spring Boot, and pay is the custom PayHealthIndicator.');
    else if (builtin) push(url + ': The ' + c.path + ' after health is the name of a group. A group is a selection of only some of the components. The ' + c.path + ' group that Spring Boot creates contains only ' + mem[0] + '.');
    else push(url + ': The readiness after health is the name of a group. A group is a selection of only some of the components. management.endpoint.health.group.readiness.include is set to readinessState,pay, so this group contains two components.');

    st.stage = 3;
    var got = {};
    mem.forEach(function (name) {
      if (name === 'pay') { got.pay = c.pay; st.asked.pay = c.pay; push('PayHealthIndicator.health() runs: The answer is ' + c.pay + '. ' + MEAN[c.pay], c.pay === 'UP' ? 'good' : c.pay === 'UNKNOWN' ? '' : 'bad'); }
      else { got[name] = 'UP'; st.asked[name] = 'UP'; push(name + ' is asked: The answer is UP. ' + (name === 'livenessState' ? 'This means that the application is running and has not failed. It looks only at the application itself, not at external servers.' : 'This means that the application has finished starting and is ready to handle requests.'), 'good'); }
    });
    if (!hasPay) push('pay is not asked: pay is not in this group, so PayHealthIndicator.health() does not run. The fact that the status of pay is ' + c.pay + ' is not reflected in this response.');

    st.stage = 4;
    var overall = mem.map(function (n) { return got[n]; }).sort(function (a, b) { return self.ORDER.indexOf(a) - self.ORDER.indexOf(b); })[0];
    st.overall = overall;
    if (mem.length === 1) push('Combining the statuses: The only status collected is ' + mem[0] + ' UP. The overall status is simply UP.');
    else push('Combining the statuses: The statuses collected are ' + mem.map(function (n) { return n + ' ' + got[n]; }).join(', ') + '. The most severe one among them becomes the overall status. The severity order is DOWN, OUT_OF_SERVICE, UP, UNKNOWN. ' + { UP: 'All of them are UP, so the overall status is also UP.', DOWN: 'One of them is DOWN, so the overall status is DOWN.', OUT_OF_SERVICE: 'OUT_OF_SERVICE comes before UP, so the overall status is OUT_OF_SERVICE.', UNKNOWN: 'UNKNOWN comes after UP, so UP wins. The overall status is UP.' }[c.pay]);

    st.stage = 5;
    var bad = overall === 'DOWN' || overall === 'OUT_OF_SERVICE', code = bad ? '503 Service Unavailable' : '200 OK';
    st.code = code;
    push('Choosing the HTTP status code: The code that matches the overall status ' + overall + ' is ' + code + '. DOWN and OUT_OF_SERVICE are answered with 503, and UP and UNKNOWN with 200. Whoever checks the health can tell whether the server is healthy from this number alone, without reading the body.', bad ? 'bad' : 'good');

    st.stage = 6;
    // The text of the body is exactly that of the real response. The entries come out in alphabetical order of their names (components, groups, status)
    function comp(n) { return '"' + n + '":' + (n === 'pay' ? '{"details":{"target":"pay.example"},"status":"' + c.pay + '"}' : '{"status":"UP"}'); }
    var body = '{' + (visible ? '"components":{' + mem.slice().sort().map(comp).join(',') + '},' : '') + (grouped ? '' : '"groups":["liveness","readiness"],') + '"status":"' + overall + '"}';
    var vis = visible ? 'Status and details per component' : 'Overall status only';
    st.body = body; st.vis = vis;
    var showName = c.details === 'always' ? 'always' : 'when-authorized';
    if (builtin) push('Building the response body: The body is ' + body + '. The ' + c.path + ' group that Spring Boot creates returns only the overall status.' + (c.details === 'always' || login ? ' Even with show-details set to ' + showName + ', the body of this group does not change.' : ''));
    else push('Building the response body: ' + { never: 'show-details is not set, so the default, never, applies. The content of each component is hidden, and only the overall status is sent.', auth_anon: 'show-details is when-authorized, but this request has no login information. Exactly as with never, the content of each component is hidden, and only the overall status is sent.', auth_user: 'show-details is when-authorized, and the request comes from a logged-in user. The status and details of each component are sent as well.', always: 'show-details is always, so the status and details of each component are sent as well, no matter who sent the request.' }[c.details] + ' The body is ' + body + '.' + (grouped ? '' : ' groups holds the names of the groups that this application has.'));

    sum.push('The response to GET ' + url + ' is ' + code + ', and the status in the body is ' + overall + '. The body shows ' + (visible ? 'the status and details of each component as well.' : 'only the overall status.'));
    if (c.path === 'liveness') {
      sum.push('The liveness group asks only livenessState. The result is the same whatever pay answers.');
      sum.push('liveness is for asking "does this process need to be restarted?". A lost connection to the payment provider is not fixed by restarting your own server, so the status of external servers is not put into liveness.');
    } else if (c.path === 'readiness' && !c.ready) {
      sum.push('By default, the readiness group also asks only readinessState. ' + (c.pay === 'UP' ? 'Even if pay answered a different status, this response would not change.' : 'Although the status of pay is ' + c.pay + ', readiness answers UP.') + ' To reflect the status of pay, you must add it to the group yourself. Turn on "Add pay to the readiness group" and compare.');
    } else if (c.path === 'readiness') {
      sum.push('pay was added to the readiness group, so the status of pay is reflected in the readiness response.' + (bad ? ' When readiness is 503, this server has answered that it is "not ready to handle requests".' : ''));
      sum.push('Decide carefully whether to put an external server into readiness. If every server looks at the same payment provider, then when the payment provider has a problem, all the servers become not ready at the same time.');
    } else {
      sum.push({ UP: 'Every component that was asked is UP, so the overall status is also UP and the response is 200.', DOWN: 'Even when only one component is DOWN, the overall status becomes DOWN and the response is 503. Whoever checks the health through this path treats this server as unhealthy.', OUT_OF_SERVICE: 'OUT_OF_SERVICE is the most severe status after DOWN. It comes before UP, so it becomes the overall status, and like DOWN it is answered with 503.', UNKNOWN: 'UNKNOWN is last in the order. If the other components are UP, the overall status is UP and the response is 200. "Not known" is not counted as a failure.' }[c.pay]);
    }
    if (builtin && (c.details === 'always' || login)) sum.push('show-details applies to the body of /actuator/health and of groups that you wrote in the configuration yourself. The liveness and readiness groups that are exactly as Spring Boot created them return only the overall status.');
    else if (!builtin) sum.push({ never: 'The default of show-details is never. From the body alone, you cannot tell which component has the problem. Change the setting to always or when-authorized and compare.', auth_anon: 'when-authorized shows the content of each component only to logged-in requests. Requests that check the health usually come without login, so they receive only the overall status. The HTTP status code is the same with or without login.', auth_user: 'when-authorized shows the content of each component only to logged-in requests. If you call the same path without logging in, only the overall status is shown.', always: 'always shows the content of each component to everyone. The details can contain things such as the address of an internal server, so use it with care on a server that anyone can call from outside.' }[c.details]);
    if (c.ready && c.path !== 'readiness') sum.push('The setting that adds pay to the readiness group changes only the response of the readiness path. It does not affect the result of this path.');
    return { events: ev, summary: sum, body: body, members: mem.slice().sort(), payCalled: hasPay, row: [code, overall, mem.join(', '), vis] };
  },
  render: function (v, sim, t, H, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : null, c = sim.c, self = this;
    if (!s) { H.text(v, 'Click Run to see, one step at a time, how a single request becomes a response.'); return; }
    H.table(v, ['Component', 'What it tells you', 'Does this request ask it?', 'Status answered'], this.COMPS.map(function (x) {
      var mem = s.members.indexOf(x[0]) >= 0, got = s.asked[x[0]];
      return { cls: s.stage >= 2 && !mem ? 'gone' : '', cells: [x[0], x[1], s.stage < 2 ? '' : mem ? { v: 'Asked', cls: 'hot' } : 'Not asked', got ? { v: got, cls: self.cls(got) } : ''] };
    }), 'Registered components');
    var ln = H.lanes(v);
    H.lane(ln, 'Components asked', s.stage < 2 ? 'Not yet' : c.path === 'health' ? 'All registered components' : c.path + ' group', s.stage < 2 ? 'none' : s.stage === 2 ? 'hot' : 'wait');
    H.lane(ln, 'Overall status', s.overall || 'Not yet', s.overall ? this.cls(s.overall) : 'none');
    H.lane(ln, 'HTTP status code', s.code || 'Not yet', !s.code ? 'none' : s.code.indexOf('503') === 0 ? 'bad' : 'good');
    H.lane(ln, 'What the body shows', s.vis || 'Not yet', s.vis ? 'wait' : 'none');
    H.counters(v, [[s.code ? s.code.split(' ')[0] : '?', 'HTTP status code'], [s.overall || '?', 'status in the body']]);
    if (s.body) H.text(v, 'Response body: ' + s.body);
  },
  // Diagram: the request at the top, the three registered components in the middle (arrows go only to the ones that this request asks), and below them the combined overall status, the HTTP status code, and what the body shows.
  draw: function (P, sim, shown) {
    var c = sim.c, self = this, last = shown[shown.length - 1], s = last ? last.snap : { stage: 0, members: [], asked: {}, overall: '', code: '', vis: '', body: '' };
    P.size(680, 290);
    P.box('req', 16, 14, 648, 30, { cls: s.stage >= 1 ? 'wait' : 'ghost', title: 'GET ' + this.PATHS[c.path], right: c.details === 'auth_user' ? 'Request from a logged-in user' : 'Request without login' });
    P.region('ep', 16, 62, 648, 112, s.stage < 2 ? 'Registered components' : c.path === 'health' ? 'Registered components (all are asked)' : 'Registered components (only those in the ' + c.path + ' group are asked)');
    this.COMPS.forEach(function (x, i) {
      var name = x[0], mem = s.members.indexOf(name) >= 0, got = s.asked[name], f = [0.173, 0.5, 0.827][i];
      P.box('c_' + name, 28 + i * 212, 98, 200, 62, { cls: s.stage < 2 ? 'plain' : !mem ? 'ghost' : got ? self.cls(got) : 'wait', title: name, sub: [x[1], got ? 'Answer: ' + got : s.stage < 2 ? 'Not yet' : mem ? 'About to be asked' : 'Not asked'] });
      if (s.stage >= 2 && mem) P.arrow('q_' + name, 'req:b:' + f, 'c_' + name + ':t', { cls: got ? 'mut' : 'hot' });
      if (s.stage >= 4 && mem) P.arrow('r_' + name, 'c_' + name + ':b', 'agg:t:' + f, { cls: got === 'UP' ? 'good' : got === 'UNKNOWN' ? 'hot' : 'bad' });
    });
    P.box('agg', 16, 196, 648, 30, { cls: s.overall ? this.cls(s.overall) : 'ghost', title: 'Overall status (the most severe of those asked)', right: s.overall });
    P.box('http', 16, 240, 316, 30, { cls: !s.code ? 'ghost' : s.code.indexOf('503') === 0 ? 'bad now' : 'good now', title: 'HTTP status', right: s.code });
    P.box('bodyb', 348, 240, 316, 30, { cls: s.vis ? 'wait' : 'ghost', title: 'Body', right: s.vis });
    P.note('A dashed box is a component that this request does not ask. The overall status and the HTTP status code are decided only from the answers of the components that were asked.');
  },
  assume: 'All 96 combinations (4 statuses of pay × 3 paths × 4 choices of show-details and requester × 2 choices of whether pay is added to the readiness group) were sent as HTTP requests to a real Spring Boot 4.1.1 server (Spring Framework 7.0.9, embedded Tomcat 11, 127.0.0.1), and the HTTP status code, the entire text of the body, the list of components that the path asks, and whether PayHealthIndicator ran were confirmed to match the screen. That the entries in the body come out in the order components, groups, status is also exactly as in the real response of this version, and the order may differ in other versions. How the components were controlled: the environment used for the check also contains H2 and the DataSource auto-configuration, so starting it with no configuration adds db, diskSpace, ping, and ssl automatically (confirmed by execution). These were turned off with management.health.defaults.enabled=false, which left only three components: livenessState, readinessState, and pay. In a real application, these components are combined into the overall status as well. Spring Security was set to permit all requests. In an application where Spring Security blocks the /actuator paths, a request without login can be rejected before it reaches the health endpoint, and that case is not covered. The "request from a logged-in user" was made not by logging in with a password but with a test filter that fills in the Spring Security authentication for the request. That leaving management.endpoint.health.roles empty shows the content to every logged-in user is consistent between the property description included in the library and the result of this run. The PayHealthIndicator on the screen is a @Component class, but in the check it was registered as a @Bean with the same bean name (payHealthIndicator), and the status that it answers was changed while the server was running. What changed from Spring Boot 3: in 4.1.1 the default of management.endpoint.health.probes.enabled is true, so the liveness and readiness groups exist even with no configuration (confirmed by execution; in Spring Boot 3 they are said to be turned on automatically only in environments such as Kubernetes, but that version was not run). HealthIndicator and Health are in the org.springframework.boot.health.contributor package of the spring-boot-health module. Cases that are not on the screen were confirmed in the same way. With no configuration, the list at /actuator contains only health, and /actuator/env, /actuator/beans, and /actuator/info return 404. Exposing everything with management.endpoints.web.exposure.include=* makes env and beans return 200, but shutdown still returns 404. This is because its access is not permitted, which is separate from exposure, and conversely, setting only management.endpoint.shutdown.access=unrestricted without exposing it also returns 404 (with both, the path appears; the POST request that actually shuts the application down was not sent). Adding management.endpoint.env.access=none to exposure.include=* makes only env return 404. Writing exposure.include=env replaces the default, so health returns 404. Turning the probes off with probes.enabled=false makes the liveness and readiness paths return 404, and groups also disappears from the body. If pay is added to the liveness group, liveness also returns 503 when pay is DOWN. The order of the statuses was confirmed with the 16 pairs of statuses of two components, and when every component is UNKNOWN, the overall status is also UNKNOWN, but the response is 200. A path that asks a single component, such as /actuator/health/pay, responds only under a setting that shows the content of each component, and returns 404 under a setting that hides it. Not verified: how livenessState and readinessState change while the application is starting or shutting down, what a load balancer or Kubernetes does on receiving this response (the lab follows the widely known explanation), management.server.port for a separate management port, the settings that change the status order and the mapping from statuses to HTTP status codes, the show-components setting, and the caching of health responses.',
});

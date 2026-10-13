Lab.register({
  id: 'controller_basic', nav: 'Controllers', cat: 'Fundamentals', mode: 'step', basic: true, deep: ['mvc'],
  title: 'Which class is called a controller?',
  intro: 'A controller is a Java class declared with class. It differs from an ordinary class in two places. @RestController above the class is a marker that tells Spring to create an object of this class and treat it as a class that handles web requests, and @GetMapping("/hello") above a method is a registration that hands a GET request the browser sends to the path /hello to this method. A controller is not a servlet. A request is received by one servlet (DispatcherServlet) that Spring Boot registered with Tomcat, and DispatcherServlet calls the method of the controller. You remove these two one at a time and send the same request, to see whether Spring creates the object and calls the method.',
  terms: ['Controller class', '@RestController', '@GetMapping', 'DispatcherServlet and the front controller pattern'],
  controls: [
    { id: 'ctl', label: 'Put @RestController above the class', type: 'check', value: true },
    { id: 'map', label: 'Put @GetMapping("path") above the method', type: 'check', value: true },
    { id: 'many', label: 'Paths to handle and methods', type: 'select', value: 'one', options: [['one', '/hello only, 1 method'], ['three', '/login, /join, /members, 3 methods']] },
  ],
  // q is the question shown on the question-style screen. t and d are the name and the description used in the text-only reading
  presets: [
    { t: 'Default settings', q: 'What does a controller look like, and what happens when a request for /hello arrives?', d: 'A controller that has both. When a request arrives, DispatcherServlet looks at the path table and calls the method.', v: { ctl: true, map: true, many: 'one' } },
    { t: 'Removing @GetMapping', q: 'What if you remove @GetMapping("/hello")?', d: 'Spring creates the object, but it has no path to handle, so the method is never called.', v: { ctl: true, map: false, many: 'one' } },
    { t: 'Removing @RestController', q: 'What if you remove @RestController?', d: 'Spring does not find this class, so there is no object, and the path table has no entry.', v: { ctl: false, map: true, many: 'one' } },
    { t: 'Removing both', q: 'What if you remove both?', d: 'An ordinary class with the same method. Spring does not use this class.', v: { ctl: false, map: false, many: 'one' } },
    { t: 'With 3 paths', q: 'What if the paths to handle are /login, /join, and /members? How many classes do you need?', d: 'Put three methods on one class, and write the path on each method.', v: { ctl: true, map: true, many: 'three' } },
  ],
  // The class made in this setting: its name, and its methods (name, the path written on it, the text it returns)
  plan: function (c) {
    if (c.many === 'one') return { name: 'HelloController', ms: [{ m: 'hello', url: '/hello', body: 'Hello' }] };
    return { name: 'MemberController', ms: [{ m: 'login', url: '/login', body: 'Login page' }, { m: 'join', url: '/join', body: 'Sign-up page' }, { m: 'members', url: '/members', body: 'Member list' }] };
  },
  code: function (c) {
    var p = this.plan(c), out = [];
    if (c.ctl) out.push('// Marker: a class that handles web requests. Spring creates its object', '@RestController');
    out.push('public class ' + p.name + ' {');
    p.ms.forEach(function (k, i) {
      if (i > 0) out.push('');
      if (c.map) {
        if (i === 0) out.push('    // Registration: hand GET requests for this path to this method');
        out.push('    @GetMapping("' + k.url + '")');
      }
      out.push('    public String ' + k.m + '() {', '        return "' + k.body + '";', '    }');
    });
    out.push('}');
    return out.join('\n');
  },
  label: function (c) { return (c.ctl ? 'has @RestController' : 'no @RestController') + ' · ' + (c.map ? 'has @GetMapping' : 'no @GetMapping') + ' · ' + { one: '1 path, 1 method', three: '3 paths, 3 methods' }[c.many]; },
  columns: ['Controller objects created by Spring', 'Path table of Spring', 'Response', 'Method runs'],
  simulate: function (c) {
    var P = this.plan(c), ms = P.ms, ev = [], sum = [], K = P.name + ' class', cn = P.name;
    var st = { up: false, table: [], made: 0, calls: 0, path: '', to: '', phase: '', resp: null, miss: false, reqs: [], run: {} };
    ms.forEach(function (k) { st.run[k.m] = 0; });
    function push(s, k) { ev.push({ s: s, k: k, snap: JSON.parse(JSON.stringify(st)) }); }
    // Server start: DispatcherServlet is registered with Tomcat, Spring finds @RestController and creates the object, and @GetMapping builds the path table
    st.up = true;
    push('The server starts. Spring Boot starts Tomcat and registers one servlet, called DispatcherServlet, with Tomcat. We did not write this servlet. Spring provides it, and it handles requests for every path ("/").', '');
    if (c.ctl) {
      st.made = 1;
      push('Spring scans the classes of the project and looks for classes with @RestController. It finds it on the ' + K + ', so Spring creates an object of this class and keeps it. This object is created when the server starts, before the first request arrives.', '');
      if (c.map) {
        ms.forEach(function (k) { st.table.push([k.url, cn + '.' + k.m]); });
        push('Spring looks for methods with @GetMapping in the ' + K + ', and writes the path and the method written there into the path table of Spring.', '');
      } else {
        push('Spring looks for methods with @GetMapping in the ' + K + '. It finds none, so the path table is empty. The object was created, but it has no path to handle.', '');
      }
    } else {
      push('Spring scans the classes of the project and looks for classes with @RestController. It finds none, so it creates no object, and the path table of Spring is empty. The file of the ' + K + ' is in the project, but Spring did not find this class.' + (c.map ? ' Even though the method has @GetMapping, it did not get into the path table.' : ''), '');
    }
    ms.forEach(function (k, i) {
      var p = k.url, head = i === 0, hit = st.table.some(function (r) { return r[0] === p; });
      st.path = p; st.to = ''; st.resp = null; st.miss = false; st.phase = 'sent';
      push(head ? 'You type localhost:8080' + p + ' in the address bar of the browser, and the browser sends a GET ' + p + ' request to the server.' : 'The browser sends a GET ' + p + ' request.', '');
      if (head) {
        st.phase = 'toDs';
        push('Tomcat receives the request. The only servlet registered with Tomcat is DispatcherServlet, and it handles every path, so Tomcat passes the request to DispatcherServlet. Nothing has reached the classes we wrote yet.', '');
      }
      st.phase = 'lookup';
      var find = (head ? '' : 'Tomcat passes the request to DispatcherServlet, and ') + 'DispatcherServlet looks for the path ' + p + ' in the path table of Spring. ';
      if (!hit) {
        st.resp = { status: '404', body: '' }; st.phase = 'done'; st.miss = true; st.reqs.push([p, '404', 'Spring']);
        push(find + 'No method is written there, so a 404 response is returned.' + (head ? ' ' + (c.ctl ? 'An object of the ' + K + ' was created, but the method did not run.' : 'An object of the ' + K + ' was never created, and the method did not run.') + (!c.ctl && !c.map ? ' Even if there is a ' + k.m + '() method, nobody calls a method of a class that Spring does not know.' : '') : ''), 'bad');
        return;
      }
      push(find + 'The ' + cn + '.' + k.m + ' method is written there.', '');
      st.to = k.m; st.calls++; st.run[k.m]++; st.phase = 'call';
      push(head
        ? 'DispatcherServlet calls the method it found. The object that this method belongs to was created by Spring when the server started. The code we wrote has no line new ' + cn + '(), and no line that calls the ' + k.m + '() method. The text this method returns is "' + k.body + '".'
        : 'DispatcherServlet calls the ' + cn + '.' + k.m + '() method.' + (c.many === 'three' ? ' The object is the same one as before, and only the method is different.' : '') + ' The text it returns is "' + k.body + '".', 'good');
      st.resp = { status: '200', body: k.body }; st.phase = 'done'; st.reqs.push([p, '200 ' + k.body, cn + '.' + k.m]);
      push('The browser receives a 200 response. The text the method returned becomes the response body, so the body is "' + k.body + '".', '');
    });
    var meth = c.many === 'three' ? 'methods' : 'a ' + ms[0].m + '() method';
    if (c.ctl && c.map) {
      sum.push('A controller is a Java class declared with class. It differs from an ordinary class in @RestController above the class (the marker) and @GetMapping above a method (the registration). With both, Spring creates the object and puts the method in its path table.');
      if (c.many === 'one') sum.push('A controller is not a servlet. The request is received by DispatcherServlet, which Spring registered with Tomcat, and DispatcherServlet looks at the path table and calls the method of the controller. The code we wrote has no new and no line that calls the method.');
      else sum.push('Paths are written on methods, not on the class, so one class holds three paths. As in the previous lab, making a separate servlet class for each path needed three classes. Here, one object gave a different response for each path with its three methods.');
    } else if (c.ctl) {
      sum.push('@RestController is there, so Spring created the object, but no path to handle is written, so no method was ever called. The request was stopped at the path table, and a 404 response was returned.');
      sum.push('The marker above the class says that Spring uses this class, and the @GetMapping above a method decides which path it handles. To receive requests, you need both.');
    } else if (c.map) {
      sum.push('Even with @GetMapping, Spring does not find the class if @RestController is missing above it. No object is created and the method does not get into the path table, so the request received a 404 response.');
      sum.push('@GetMapping works only on methods of a class that Spring found as a controller. Only methods of classes with @RestController get into the path table.');
    } else {
      sum.push('This class is an ordinary class, not a controller. It has ' + meth + ' with the same content, but Spring did not use this class. No object was created and no method ran.');
      sum.push('A method does not receive requests just because you wrote it. The only methods Spring calls are those of controllers that are in the path table.');
    }
    var tableText = !st.table.length ? 'Empty' : c.many === 'one' ? '/hello → ' + cn + '.' + ms[0].m : st.table.length + ' paths → ' + st.table.length + ' methods';
    return { events: ev, summary: sum, plan: P, row: [st.made + '', tableText, st.reqs.map(function (r) { return r[1]; }).join(' / '), st.calls + ''] };
  },
  render: function (v, sim, t, H, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : null;
    if (!s) { H.text(v, 'Click Run to start from the server starting up.'); return; }
    H.table(v, ['Path', 'Method in charge'], s.table.length ? s.table.map(function (r) { return { cls: '', cells: [r[0], r[1]] }; }) : [{ cls: 'gone', cells: ['Empty', ''] }], 'Path table of Spring');
    if (s.reqs.length) H.table(v, ['Request', 'Response', 'Made by'], s.reqs.map(function (r) { return { cls: '', cells: ['GET ' + r[0], { v: r[1], cls: r[1].indexOf('200') === 0 ? 'good' : 'bad' }, r[2]] }; }), 'Requests and responses');
    H.counters(v, [[s.made, 'Objects created by Spring'], [s.calls, 'Method runs']]);
  },
  // Diagram: the browser on the left, DispatcherServlet inside Tomcat at the top middle, the path table of Spring below it, and the controller we wrote on the right. Arrows show whether the request goes through DispatcherServlet and the path table and reaches the method.
  draw: function (P, sim, shown) {
    var c = sim.c, pl = sim.plan, last = shown[shown.length - 1], s = last ? last.snap : null, n = pl.ms.length;
    P.size(680, 292);
    var busy = s && s.phase && s.phase !== 'done', ph = s ? s.phase : '';
    P.box('br', 14, 44, 108, 52, { cls: busy ? 'wait' : 'plain', title: 'Browser', sub: !s || !s.path ? 'Waiting' : s.resp ? s.resp.status + ' response' : 'GET ' + s.path });
    P.region('tc', 164, 16, 232, 100, 'Tomcat' + (s && s.up ? '' : ': not started'));
    P.box('ds', 174, 44, 212, 52, { cls: ph === 'toDs' || ph === 'lookup' ? 'hot now' : s && s.up ? 'plain' : 'ghost', title: 'DispatcherServlet', sub: s && s.up ? 'Servlet from Spring' : ' ' });
    var rows = s && s.table.length ? s.table.map(function (r) { return r[0] + ' → ' + r[1].split('.')[1] + '()'; }) : [s && s.up ? 'Empty' : ' '];
    P.box('tb', 164, 140, 232, 30 + rows.length * 19, { cls: ph === 'lookup' ? 'hot now' : s && s.table.length ? 'plain' : 'ghost', title: 'Path table of Spring', sub: rows });
    P.region('cl', 436, 16, 230, 208, 'Classes we wrote');
    var made = s ? s.made : 0, on = ph === 'call';
    var sub = [made ? '1 object (made by Spring)' : 'No object'].concat(pl.ms.map(function (k) { return k.m + '() · runs: ' + (s ? s.run[k.m] : 0); }));
    P.box('k', 446, 104, 210, 30 + sub.length * 19, { cls: on ? 'hot now' : s && s.calls ? 'good' : made ? 'plain' : 'ghost', title: pl.name, sub: sub });
    if (s && s.path && (ph === 'sent' || ph === 'toDs' || ph === 'lookup' || ph === 'call')) P.arrow('rq', 'br:r:0.3', 'ds:l:0.3', {});
    if (s && (ph === 'lookup' || ph === 'call')) P.arrow('dt', 'ds:b:0.5', 'tb:t:0.5', { cls: 'hot' });
    if (s && s.miss) P.arrow('dt', 'ds:b:0.5', 'tb:t:0.5', { cls: 'bad' });
    if (on) P.arrow('call', 'tb:r:0.5', 'k:l:0.7', { cls: 'hot' });
    if (s && s.resp) P.arrow('rs', 'ds:l:0.75', 'br:r:0.75', { cls: s.resp.status === '200' ? 'good' : 'bad' });
    P.box('n1', 14, 242, 322, 36, { cls: s && s.made ? 'wait' : 'ghost', title: 'Objects created by Spring', right: (s ? s.made : 0) + '' });
    P.box('n2', 344, 242, 322, 36, { cls: s && s.calls ? 'good' : 'ghost', title: 'Method runs', right: (s ? s.calls : 0) + '' });
  },
  assume: 'The result was obtained by running Spring Boot 4.1.1 (Spring Framework 7.0.9, embedded Tomcat 11) on JDK 21. The model assumes that the browser sends one GET request per path, one after another. The localhost:8080 in the paths is an example of starting Spring Boot on its default port on my own computer. For all 8 combinations, the same source as the code on the screen (with only the lines that count objects and runs added) was compiled in the package app, and a new Java process was started with a start class annotated with @SpringBootConfiguration, @EnableAutoConfiguration, and @ComponentScan. The controller was not registered by hand but found by Spring scanning the classes, and the requests were sent over real HTTP after the server had started. What was checked is the number of controller objects that Spring created (right after the server started and after the requests), the path table (the entries of this class among getHandlerMethods of RequestMappingHandlerMapping), the status code and body for each path, and the number of method runs. That DispatcherServlet is the only servlet registered with Tomcat and handles the path "/", that the controller class is not of the Servlet type, and that the method did not run for a 404 response were also checked by execution. What the documentation defines is the DispatcherServlet section of Web MVC in the Spring Framework documentation (that DispatcherServlet is the one servlet that receives all requests and the actual work is done by delegate components, and that in Spring Boot the servlet declaration is found in the Spring configuration and registered with the container), the Declaration section of Annotated Controllers (that controller objects are found by classpath scanning, and that @RestController combines @Controller and @ResponseBody), the Mapping Requests section (shortcut annotations such as @GetMapping), and the API documentation of @RestController, @Controller, and @GetMapping. That the object is created when the server starts and the path table is built then, and that a 404 response is returned when there is no path, are not defined by the documentation but are behaviors observed in the default settings of this version. The code on the screen leaves out the package and import lines, and it assumes that the controller is in the same package as the start class (or below it). For registering paths, only @GetMapping was covered, and @RequestMapping, @PostMapping, and @Controller were not. That DispatcherServlet of Spring Boot is initialized when the first request arrives and not when the server starts was observed, but it is not included in the steps of this lab, and it is covered in the in-depth lab "Spring MVC request flow".',
});

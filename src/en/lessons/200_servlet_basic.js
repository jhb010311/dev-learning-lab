Lab.register({
  id: 'servlet_basic', nav: 'Servlets', cat: 'Fundamentals', mode: 'step', basic: true, deep: ['servlet'],
  title: 'Which class is called a servlet?',
  intro: 'A servlet is a Java class declared with class. It differs from an ordinary class in two places. extends HttpServlet is what qualifies the class to receive web requests, and @WebServlet("/hello") registers that a request the browser sends to the path /hello is handed to this class. You remove these two one at a time and send the same request, to see whether Tomcat calls the doGet of this class.',
  terms: ['Servlet class', 'HttpServlet', '@WebServlet', 'Servlet and servlet container'],
  controls: [
    { id: 'ext', label: 'The class declaration has extends HttpServlet', type: 'check', value: true },
    { id: 'map', label: 'Put @WebServlet("path") above the class', type: 'check', value: true },
    { id: 'many', label: 'Paths to handle and classes', type: 'select', value: 'one', options: [['one', '/hello only, 1 class'], ['each', '/login, /join, /members, 3 classes'], ['shared', '/login, /join, /members, 1 class']] },
  ],
  // q is the question shown on the question-style screen. t and d are the name and the description used in the text-only reading
  presets: [
    { t: 'Default settings', q: 'What does a servlet look like, and what happens when a request for /hello arrives?', d: 'A servlet that has both. When a request arrives, Tomcat calls doGet.', v: { ext: true, map: true, many: 'one' } },
    { t: 'Removing @WebServlet', q: 'What if you remove @WebServlet("/hello")?', d: 'It is a servlet class, but it has no path to handle, so it is never called.', v: { ext: true, map: false, many: 'one' } },
    { t: 'Removing extends HttpServlet', q: 'What if you remove extends HttpServlet?', d: 'The path is registered, but the class is not a servlet, so it fails on the first request.', v: { ext: false, map: true, many: 'one' } },
    { t: 'Removing both', q: 'What if you remove both?', d: 'An ordinary class with the same method. Tomcat does not use this class.', v: { ext: false, map: false, many: 'one' } },
    { t: 'With 3 paths', q: 'What if the paths to handle are /login, /join, and /members? How many classes do you need?', d: 'You write one servlet class per path.', v: { ext: true, map: true, many: 'each' } },
    { t: 'Three paths on one class', q: 'What if you write all three paths on one class?', d: 'There is only one doGet, so all three paths give the same response.', v: { ext: true, map: true, many: 'shared' } },
  ],
  // The classes made in this setting: name, the paths written on it, and the text that doGet writes to the response
  plan: function (c) {
    if (c.many === 'one') return [{ name: 'Hello', urls: ['/hello'], body: 'Hello' }];
    if (c.many === 'each') return [{ name: 'Login', urls: ['/login'], body: 'Login page' }, { name: 'Join', urls: ['/join'], body: 'Sign-up page' }, { name: 'Members', urls: ['/members'], body: 'Member list' }];
    return [{ name: 'Member', urls: ['/login', '/join', '/members'], body: 'Member page' }];
  },
  code: function (c) {
    return this.plan(c).map(function (k, i) {
      var out = [];
      if (c.map) { if (i === 0) out.push('// Registration: hand requests for this path to this class'); out.push(k.urls.length === 1 ? '@WebServlet("' + k.urls[0] + '")' : '@WebServlet({"' + k.urls.join('", "') + '"})'); }
      if (c.ext && i === 0) out.push('// Qualification: a servlet class that can receive web requests');
      out.push('public class ' + k.name + (c.ext ? ' extends HttpServlet' : '') + ' {');
      out.push('    protected void doGet(HttpServletRequest req, HttpServletResponse resp)', '            throws IOException {', '        resp.setContentType("text/plain; charset=UTF-8");', '        resp.getWriter().write("' + k.body + '");', '    }', '}');
      return out.join('\n');
    }).join('\n\n');
  },
  label: function (c) { return (c.ext ? 'has extends' : 'no extends') + ' · ' + (c.map ? 'has @WebServlet' : 'no @WebServlet') + ' · ' + { one: '1 path', each: '3 paths, 3 classes', shared: '3 paths, 1 class' }[c.many]; },
  columns: ['Is a servlet type', 'Tomcat\'s path table', 'Response', 'Objects Tomcat created', 'doGet runs'],
  simulate: function (c) {
    var ks = this.plan(c), ev = [], sum = [], names = ks.map(function (k) { return k.name; });
    var paths = []; ks.forEach(function (k) { k.urls.forEach(function (u) { paths.push(u); }); });
    var st = { up: false, table: [], cls: {}, phase: '', path: '', to: '', resp: null, made: 0, doGet: 0, reqs: [] };
    ks.forEach(function (k) { st.cls[k.name] = { made: false, runs: 0, bad: false }; });
    function push(s, k) { ev.push({ s: s, k: k, snap: JSON.parse(JSON.stringify(st)) }); }
    function owner(p) { for (var i = 0; i < ks.length; i++) if (ks[i].urls.indexOf(p) >= 0) return ks[i]; }
    var list = names.join(', ') + (names.length === 1 ? ' class' : ' classes'), has = names.length === 1 ? 'has' : 'have';
    // Server start: read @WebServlet and build the path table
    st.up = true;
    if (c.map) {
      paths.forEach(function (p) { st.table.push([p, owner(p).name]); });
      push('The server starts. Tomcat scans the class files of the web application and looks for classes with @WebServlet. It finds it on the ' + list + ', so Tomcat writes the path and the class written there into the path table. No object is created yet.' + (c.ext ? '' : ' At this point Tomcat writes the entry based on @WebServlet alone. It has not yet checked whether the class is a servlet.'), '');
    } else {
      push('The server starts. Tomcat scans the class files of the web application and looks for classes with @WebServlet. It finds none, so the path table is empty. ' + (c.ext ? 'The ' + list + ' ' + has + ' extends HttpServlet and ' + (names.length === 1 ? 'is a servlet class' : 'are servlet classes') + ', but no path to handle is written, so ' + (names.length === 1 ? 'it' : 'they') + ' did not get into the table.' : 'The file of the ' + list + ' is in that folder, but ' + (names.length === 1 ? 'it is' : 'they are') + ' of no use to Tomcat.'), '');
    }
    paths.forEach(function (p, i) {
      var k = owner(p), o = st.cls[k.name], head = i === 0;
      st.path = p; st.to = ''; st.resp = null; st.phase = 'sent';
      push(head ? 'You type localhost:8080' + p + ' in the address bar of the browser, and the browser sends a GET ' + p + ' request to the server.' : 'The browser sends a GET ' + p + ' request.', '');
      st.phase = 'lookup';
      if (!c.map) {
        st.resp = { status: '404', body: '' }; st.phase = 'done'; st.reqs.push([p, '404', 'Tomcat']);
        push('Tomcat looks for the path ' + p + ' in the path table. No class is in charge of it, so Tomcat returns a 404 response.' + (head ? ' No object of the ' + k.name + ' class was created and doGet did not run.' + (c.ext ? '' : ' Even if there is a method named doGet, nobody calls a method of a class that Tomcat does not know.') : ''), 'bad');
        return;
      }
      st.to = k.name;
      if (o.bad) {
        st.resp = { status: '404', body: '' }; st.phase = 'done'; st.reqs.push([p, '404', 'Tomcat']);
        push('Tomcat looks for the path ' + p + ' in the path table. The ' + k.name + ' class is written there. A request to this class has already failed earlier. Tomcat no longer uses this registration and returns a 404 response.', 'bad');
        return;
      }
      push('Tomcat looks for the path ' + p + ' in the path table. The ' + k.name + ' class is written there.', '');
      if (!o.made) {
        o.made = true; st.made++;
        if (!c.ext) {
          o.bad = true; st.resp = { status: '500', body: '' }; st.phase = 'done'; st.reqs.push([p, '500', 'Tomcat']);
          push('Tomcat tries to create an object of the ' + k.name + ' class and use it as a servlet. But this class has no extends HttpServlet, so it is not a servlet type. Tomcat cannot pass the request to this object and returns a 500 error response. doGet does not run.', 'bad');
          return;
        }
        push('Tomcat creates an object of the ' + k.name + ' class.' + (head ? ' The code we wrote has no line new ' + k.name + '(). Tomcat creates the servlet object.' : ''), '');
      } else push('An object of the ' + k.name + ' class was already created. Tomcat does not create a new one and uses that object.', '');
      o.runs++; st.doGet++; st.phase = 'call';
      push(head ? 'Tomcat passes the request to this object. The code in HttpServlet sees that it is a GET request and calls the doGet that we wrote. We did not write the line that calls doGet either. The text that doGet writes to the response is "' + k.body + '".' : 'Tomcat passes the request to this object, and the doGet of the ' + k.name + ' class runs. The text it writes to the response is "' + k.body + '".' + (c.many === 'shared' ? ' It is the same doGet as for the earlier path, so it writes the same text.' : ''), 'good');
      st.resp = { status: '200', body: k.body }; st.phase = 'done'; st.reqs.push([p, '200 ' + k.body, k.name + '.doGet']);
      push('The browser receives a 200 response. The body is "' + k.body + '".', '');
    });
    if (c.ext && c.map) {
      sum.push('A servlet is a Java class declared with class. It differs from an ordinary class in extends HttpServlet (the qualification) and @WebServlet (the registration of a path). With both, Tomcat creates the object and calls doGet when a request arrives.');
      if (c.many === 'one') sum.push('The code we wrote has no new and no line that calls doGet. A method of an ordinary class runs only when our code calls it, but a method of a servlet is called by Tomcat when a request arrives.');
      if (c.many === 'each') sum.push('There are 3 paths, so we made 3 classes. A servlet has its path written on the class, and there is one method (doGet) per class that receives GET requests. When the paths increase, the classes increase with them.');
      if (c.many === 'shared') sum.push('You can write 3 paths on one class. But there is only one object and one doGet, so the three paths gave the same response. To give a different response for each path, you have to split the class, or look at the path of the request inside doGet and branch yourself.');
    } else if (!c.ext && !c.map) {
      sum.push('This class is an ordinary class, not a servlet. It has a method named doGet and the content is the same, but Tomcat did not use this class. No object was created and the method did not run.');
      sum.push('A method does not receive requests just because it is named doGet. The only methods Tomcat calls are those of servlets that are in the path table.');
    } else if (c.ext) {
      sum.push('It has extends HttpServlet, so it is a servlet class. But no path to handle is registered, so Tomcat never used it. To receive requests, a class needs both the qualification and the registration.');
    } else {
      sum.push('A path was registered with @WebServlet, but there is no extends HttpServlet, so the class is not a servlet. Tomcat did not notice when the server started. It failed on the first request, at the moment it created an object and tried to use it as a servlet.');
      sum.push('@WebServlet only registers a path. It does not turn an ordinary class into a servlet. The servlet specification also says that a class annotated with @WebServlet must extend HttpServlet.');
    }
    var tableText = !c.map ? 'Empty' : c.many === 'one' ? '/hello → ' + names[0] : '3 paths → ' + ks.length + (ks.length === 1 ? ' class' : ' classes');
    return { events: ev, summary: sum, ks: ks, row: [c.ext ? 'Yes' : 'No', tableText, st.reqs.map(function (r) { return r[1]; }).join(' / '), st.made + '', st.doGet + ''] };
  },
  render: function (v, sim, t, H, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : null;
    if (!s) { H.text(v, 'Click Run to start from the server starting up.'); return; }
    H.table(v, ['Path', 'Class in charge'], s.table.length ? s.table.map(function (r) { return { cls: '', cells: [r[0], r[1]] }; }) : [{ cls: 'gone', cells: ['Empty', ''] }], 'Path table of Tomcat');
    if (s.reqs.length) H.table(v, ['Request', 'Response', 'Made by'], s.reqs.map(function (r) { return { cls: '', cells: ['GET ' + r[0], { v: r[1], cls: r[1].indexOf('200') === 0 ? 'good' : 'bad' }, r[2]] }; }), 'Requests and responses');
    H.counters(v, [[s.made, 'Objects created by Tomcat'], [s.doGet, 'doGet runs']]);
  },
  // Diagram: the browser on the left, Tomcat and its path table in the middle, and the classes we wrote on the right. Arrows show whether the request goes through the path table and reaches doGet of a class.
  draw: function (P, sim, shown) {
    var c = sim.c, ks = sim.ks, last = shown[shown.length - 1], s = last ? last.snap : null, n = ks.length;
    P.size(680, 292);
    var busy = s && s.phase && s.phase !== 'done';
    P.box('br', 14, 82, 108, 58, { cls: busy ? 'wait' : 'plain', title: 'Browser', sub: !s || !s.path ? 'Waiting' : s.resp ? s.resp.status + ' response' : 'GET ' + s.path });
    P.region('tc', 164, 16, 232, 208, 'Tomcat' + (s && s.up ? '' : ': not started'));
    var rows = s && s.table.length ? s.table.map(function (r) { return r[0] + ' → ' + r[1]; }) : [s && s.up ? 'Empty' : ' '];
    P.box('tb', 174, 76, 212, 30 + rows.length * 19, { cls: s && s.phase === 'lookup' ? 'hot now' : s && s.table.length ? 'plain' : 'ghost', title: 'Path table', sub: rows });
    P.region('cl', 436, 16, 230, 208, 'Classes we wrote');
    ks.forEach(function (k, i) {
      var o = s ? s.cls[k.name] : { made: false, runs: 0, bad: false }, on = s && s.phase === 'call' && s.to === k.name;
      var kind = c.ext ? 'Servlet class' : 'Ordinary class', state = o.bad ? 'Failed: not a servlet' : o.made ? '1 object · doGet runs: ' + o.runs : 'No object';
      var cls = o.bad ? 'bad' : on ? 'hot now' : o.runs ? 'good' : c.ext ? 'plain' : 'ghost';
      if (n === 1) P.box('k' + i, 446, 76, 210, 70, { cls: cls, title: k.name, sub: [kind, state] });
      else P.box('k' + i, 446, 46 + i * 58, 210, 50, { cls: cls, title: k.name, sub: (c.ext ? 'Servlet' : 'Ordinary class') + ' · ' + (o.bad ? 'Failed' : o.made ? 'doGet runs: ' + o.runs : 'No object') });
    });
    if (s && s.path && (s.phase === 'sent' || s.phase === 'lookup' || s.phase === 'call')) P.arrow('rq', 'br:r:0.3', 'tb:l:0.3', {});
    if (s && s.phase === 'call') P.arrow('call', 'tb:r', 'k' + ks.map(function (k) { return k.name; }).indexOf(s.to) + ':l', { cls: 'hot', label: 'doGet' });
    if (s && s.resp) P.arrow('rs', 'tb:l:0.75', 'br:r:0.75', { cls: s.resp.status === '200' ? 'good' : 'bad', label: s.resp.status });
    P.box('n1', 14, 242, 322, 36, { cls: s && s.made ? 'wait' : 'ghost', title: 'Objects created by Tomcat', right: (s ? s.made : 0) + '' });
    P.box('n2', 344, 242, 322, 36, { cls: s && s.doGet ? 'good' : 'ghost', title: 'doGet runs', right: (s ? s.doGet : 0) + '' });
  },
  assume: 'The servlet container is Tomcat 11.0.24 (Jakarta Servlet 6.1), and the model assumes that the browser sends one GET request per path, one after another. The localhost:8080 in the paths is an example of running Tomcat on its default port on my own computer. All 12 combinations were checked against the result of compiling the same source as the code on the screen, putting it in the web application folder (WEB-INF/classes), starting a real Tomcat, and sending the requests. What was checked is whether the class is of the Servlet type, the path table of Tomcat, the status code and body of the response, the number of objects created, and the number of doGet runs. That every servlet implements the Servlet interface and that HttpServlet is an implementation of it follow chapter 2 of the Jakarta Servlet specification, and that a class annotated with @WebServlet must extend HttpServlet and must have at least one path written on it follows section 8.1.1 of the specification. The screen shows the qualification with extends HttpServlet alone, but the exact condition is to implement the Servlet interface, and extending HttpServlet is the most common way. A path can also be registered with the web.xml configuration file or in code instead of @WebServlet, but only @WebServlet is covered here. The code on the screen leaves out the import lines and the @Override that is commonly put on an overridden method. That a plain class with only @WebServlet gets a 500 for the first request and a 404 from the next request to the same registration on is not defined by the specification but is a behavior observed on this Tomcat version. The calls to init and service that Tomcat goes through from creating the object to reaching doGet are left out, and they are covered in the in-depth lab "Servlets".',
});

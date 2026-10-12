Lab.register({
  id: 'journey', nav: 'From URL to response', cat: 'Networking', mode: 'step',
  title: 'What happens when you type a URL in the address bar and press Enter',
  intro: 'While a browser opens a single URL, a DNS lookup, a TCP connection, a TLS handshake, an HTTP request, a reverse proxy, an application server, and a database take part one after another. Some steps can be skipped thanks to a cache or connection reuse.',
  terms: ['DNS', 'Web server and application server', 'Reverse proxy', 'CDN', 'HTTPS and TLS', 'Three-way handshake'], ranks: ['network', 'was', 'http'],
  controls: [
    { id: 'what', label: 'What is requested', type: 'select', value: 'api', options: [['api', 'Dynamic page (/orders, needs a database query)'], ['static', 'Static file (/logo.png)']] },
    { id: 'dns', label: 'The IP address of the domain is already known (DNS cache)', type: 'check', value: false },
    { id: 'conn', label: 'A connection made earlier to this server is still open (connection reuse)', type: 'check', value: false },
    { id: 'cdn', label: 'The static file is served from a CDN', type: 'check', value: false, show: function (c) { return c.what === 'static'; } },
  ],
  presets: [
    { t: 'Default settings', q: 'Which steps does a first visit go through when you request the dynamic page /orders?', d: 'A first visit. The request goes through every step.', v: { what: 'api', dns: false, conn: false, cdn: false } },
    { t: 'Second request to the same site', q: 'What if you turn on the DNS cache and connection reuse and request the same site again?', d: 'The DNS lookup and the connection setup are skipped.', v: { what: 'api', dns: true, conn: true, cdn: false } },
    { t: 'Static file', q: 'What if you turn on the DNS cache and connection reuse and request the static file /logo.png?', d: 'The web server (nginx) responds directly. The request does not reach the application server.', v: { what: 'static', dns: true, conn: true, cdn: false } },
    { t: 'Static file from a CDN', q: 'What if you also serve the static file /logo.png from a CDN, with the DNS cache and connection reuse on?', d: 'A server close to the user responds.', v: { what: 'static', dns: true, conn: true, cdn: true } },
  ],
  code: function (c) {
    return '# nginx (reverse proxy)\nserver {\n    listen 443 ssl;\n    server_name shop.example;\n\n    location /static/ {                  # serve static files directly\n        root /var/www;\n    }\n    location / {                         # pass everything else to the application server\n        proxy_pass http://127.0.0.1:8080;\n        proxy_set_header X-Forwarded-For $remote_addr;\n    }\n}';
  },
  label: function (c) { return (c.what === 'api' ? 'Dynamic page' : 'Static file' + (c.cdn ? ' (CDN)' : '')) + ' · DNS cache: ' + (c.dns ? 'yes' : 'no') + ' · Connection reuse: ' + (c.conn ? 'yes' : 'no'); },
  columns: ['Total time', 'Steps taken', 'Steps skipped', 'Response produced by'],
  simulate: function (c) {
    var ev = [], rows = [], total = 0, skipped = 0, sum = [], cdn = c.what === 'static' && c.cdn, rtt = cdn ? 5 : 30, maker;
    function step(name, ms, s, k, skip) { if (skip) skipped++; else total += ms; rows.push({ cls: skip ? 'gone' : '', cells: [name, skip ? 'skipped' : ms + 'ms', { v: skip ? '-' : total + 'ms', cls: k === 'good' ? 'good' : '' }] }); ev.push({ s: s, k: k, snap: { rows: rows.slice(), total: total } }); }
    step('URL parsing', 0, 'The browser splits the URL https://shop.example' + (c.what === 'api' ? '/orders' : '/static/logo.png') + ' into the scheme (https), the host (shop.example), and the path. Because the scheme is https, the browser will connect to port 443.', '');
    if (c.dns) step('DNS lookup', 0, 'The IP address of the domain is still in the cache of the browser or the operating system. The browser does not ask a DNS server.', 'good', true);
    else step('DNS lookup', 40, 'The browser does not know the IP address of shop.example. It asks a DNS server and gets the IP address back' + (cdn ? '. Because the domain uses a CDN, the answer is the address of a CDN server close to the user.' : '.') + ' The result is kept in the cache for a set time (the TTL).', '');
    if (c.conn) { step('TCP connection', 0, 'The connection made earlier to this server is still open (keep-alive). The browser uses it as it is instead of opening a new one.', 'good', true); step('TLS handshake', 0, 'The existing connection is already encrypted. The handshake is not repeated either.', 'good', true); }
    else { step('TCP connection', rtt, 'The browser opens a TCP connection to port 443 of that IP address (the three-way handshake). This takes one round trip to the server.', ''); step('TLS handshake', rtt, 'In the TLS handshake, the browser verifies the certificate of the server and the two sides agree on the encryption keys. This takes one more round trip.', ''); }
    step('HTTP request sent', rtt, 'The browser sends the HTTP request over the encrypted connection. The request line and the headers (Host, Cookie, User-Agent, and so on) go to the server.', '');
    if (cdn) { maker = 'CDN server'; step('CDN server', 2, 'A CDN server located close to the user receives the request. It returns the copy of logo.png that it has stored, right away. The request does not go to the original server (the origin server).', 'good'); }
    else {
      step('Reverse proxy (nginx)', 1, 'nginx is the first to receive the request. It decrypts the TLS traffic, looks at the path, and decides where the request will be handled.', '');
      if (c.what === 'static') { maker = 'Web server (nginx)'; step('Static file response', 2, 'The path is under /static/, so nginx reads the file from disk and responds directly. The request does not pass through the application server.', 'good'); }
      else { maker = 'Application server (Spring)';
        step('Application server (Tomcat)', 2, 'nginx passes the request to Tomcat behind it (port 8080). Tomcat assigns a thread from its thread pool, runs the request through the filters, and hands it to the Spring DispatcherServlet.', '');
        step('Spring (controller → service)', 5, 'DispatcherServlet finds the controller that handles /orders and runs it. The controller calls a service, and the service calls a repository.', '');
        step('Database query', 20, 'The application borrows a connection from the connection pool, runs the SQL, and receives the result. Of the time spent inside the server, this is the largest part.', '');
        step('Response built', 3, 'The application turns the query result into JSON or HTML and builds the response. The response travels back through Tomcat and nginx.', '');
      }
    }
    step('Response received and displayed', rtt, 'The response arrives at the browser. If it is HTML, the browser parses it, finds the URLs of the CSS, scripts, and images in it, and repeats the same process for each of them.', 'good');
    if (!c.dns || !c.conn) sum.push('On a first request, the DNS lookup, the TCP connection, and the TLS handshake all happen before the actual request. However fast the server is, these round trips do not go away, so keeping a connection open and reusing it (keep-alive, HTTP/2) has a large effect on how fast the site feels.');
    if (c.what === 'static' && !cdn) sum.push('The web server serves static files directly. The application server handles only the requests whose result has to be produced by running code. Putting a reverse proxy in front lets you handle TLS, static files, load balancing, and hiding the internal servers in one place.');
    if (cdn) sum.push('A CDN keeps copies of static files in many places around the world and responds from a place close to the user. The round trips get shorter, and fewer requests reach the origin server.');
    if (c.what === 'api') sum.push('In a dynamic request, most of the time the server spends goes to the database query (here, 20ms out of 31ms). This is why, when you look into a performance problem, you start by breaking the request down to see which part takes the time.');
    return { events: ev, summary: sum, row: [total + 'ms', (rows.length - skipped) + '', skipped + '', maker] };
  },
  render: function (v, sim, t, H, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : { rows: [], total: 0 };
    if (s.rows.length) H.table(v, ['Step', 'Time', 'Cumulative'], s.rows, 'Steps taken'); else H.text(v, 'Click Run to start.');
  },
  // Diagram: the order in which a request leaves the browser and passes through DNS, the proxy, the application server, and the database.
  draw: function (P, sim, shown) {
    var c = sim.c, last = shown[shown.length - 1], s = last ? last.snap : { rows: [], total: 0 }, stat = c.what === 'static', cdn = stat && c.cdn, edge = cdn ? 'cdn' : 'px';
    var actors = [['b', 'Browser', 'wait'], ['dns', 'DNS']].concat(cdn ? [['cdn', 'CDN server']] : [['px', 'nginx (proxy)']]).concat(stat ? [] : [['app', 'Tomcat+Spring'], ['db', 'DB']]);
    var map = { 'URL parsing': ['b'], 'DNS lookup': ['b', 'dns'], 'TCP connection': ['b', edge], 'TLS handshake': ['b', edge], 'HTTP request sent': ['b', edge], 'Reverse proxy (nginx)': ['px'], 'Application server (Tomcat)': ['px', 'app'], 'Spring (controller → service)': ['app'], 'Database query': ['app', 'db'], 'Response built': ['app', 'px'], 'Response received and displayed': [edge, 'b'], 'Static file response': [edge], 'CDN server': ['cdn'] };
    var msgs = s.rows.map(function (r) { var name = P.v(r.cells[0]), m = map[name] || ['b']; return { f: m[0], t: m[1], s: name.replace(/ \(.*\)$/, '') + ' ' + P.v(r.cells[1]), cls: P.c(r.cells[2]) }; });
    var end = P.seq(actors, msgs, { keep: 11 });
    P.box('tot', 16, end + 14, 648, 34, { cls: 'plain', title: 'Time so far', right: s.total + 'ms' });
    P.size(680, end + 64);
    P.note('An arrow shows who contacted whom in that step, and the number is the time it took.');
  },
  assume: 'The times are examples chosen to show relative sizes (30ms to reach the server once, 5ms with a CDN, 40ms for a DNS lookup, 20ms for a database query). Real values vary widely with the distance, the network, and the query. The setup assumes a common arrangement in which nginx handles TLS in front and passes requests to Spring Boot (embedded Tomcat) behind it. That the steps really happen in this order, and that the first three steps disappear when a connection is reused, was checked by sending two requests in a row to a public site with curl. In the first request, the DNS lookup was done at 27ms, the TCP connection at 60ms, and TLS at 156ms, and the first byte arrived at 194ms. The second request, sent over the same connection, showed 0 for DNS, TCP, and TLS and took 40ms in total. The part behind the reverse proxy was not verified directly.',
});

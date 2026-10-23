Lab.register({
  id: 'proxy_basic', nav: 'Proxy servers', cat: 'Fundamentals', mode: 'step', basic: true, deep: ['revproxy', 'scale', 'cdn'],
  title: 'What is the difference between calling a server directly and calling it through nginx (a proxy)?',
  why: 'If a server program is exposed directly to the internet, then when you add servers or replace them, the address that users connect to changes too, and work such as handling HTTPS or blocking bad connections has to be done separately in each server program. A reverse proxy stands in front of the servers at one address, receives requests, and passes them on, so users connect to the same address even when the servers behind it change.',
  use: 'A common setup puts nginx in front of a Spring Boot server and uses the proxy_pass setting of nginx to pass requests received on ports 80 and 443 to Spring Boot on port 8080. Spring Boot then sees nginx as the peer that connected to it, so nginx writes the real user\'s IP address into the X-Forwarded-For header with proxy_set_header and passes it along. There is also a proxy (a forward proxy) that gathers requests going from inside a company to outside sites in one place and filters them.',
  intro: 'A proxy server is a server that stands between the side that sends requests (the user) and the real server and passes requests on for it. This lab uses the most common setup, nginx and Spring Boot, and compares calling the server directly with calling it through nginx. The code box has four parts. The first is the address the user calls. The user is on another computer (203.0.113.7), and 192.0.2.10 is the address of the server computer. If the address has no port number, the request goes to port 80, and if it has :8080, it goes to port 8080. A port number is the number of a door given to each program on one computer. The second is the nginx configuration. listen 80 is the line that receives requests on port 80, proxy_pass is the line that passes the received request on to port 8080 of the same computer (127.0.0.1:8080), and proxy_set_header is the line that writes a header onto the request when it is passed on. The third is application.properties, the configuration file of Spring Boot, and the fourth is the controller that receives the request. The controller returns, as text, the address of the peer that connected to it (request.getRemoteAddr()) and the header X-Forwarded-For. In this lab you change the address that is called, the server.address line, and which programs are running, and see what the user receives and whom Spring Boot sees as the peer. nginx is not installed on the computer used to write this lab, so in the run, a small program (Node.js) built to behave as the nginx documentation describes stood in for nginx, and the Spring Boot side ran the code on the screen as it is.',
  terms: ['Proxy server', 'Reverse proxy', 'nginx proxy_pass and proxy_set_header', 'X-Forwarded-For', '502 Bad Gateway', 'server.address', 'Origin server'],
  controls: [
    { id: 'via', label: 'Address the user calls', type: 'select', value: 'proxy', options: [['proxy', 'http://192.0.2.10/hello (port 80: nginx)'], ['direct', 'http://192.0.2.10:8080/hello (port 8080: Spring Boot)']] },
    { id: 'bind', label: 'application.properties has the line server.address=127.0.0.1', type: 'check', value: true },
    { id: 'up', label: 'Programs that are running', type: 'select', value: 'both', options: [['both', 'Both nginx and Spring Boot are running'], ['noserver', 'Spring Boot is stopped (only nginx is running)'], ['noproxy', 'nginx is stopped (only Spring Boot is running)']] },
  ],
  // q is the question shown on the question-style screen. t and d are the name and the description used in the text-only reading
  presets: [
    { t: 'Default settings', q: 'When a request goes through nginx (port 80), whom does Spring Boot see as the peer, and where can it find the user\'s address?', d: 'The peer that connected to Spring Boot is nginx (127.0.0.1), and the user\'s address 203.0.113.7 arrives in the X-Forwarded-For header that nginx wrote and passed on.', v: { via: 'proxy', bind: true, up: 'both' } },
    { t: 'Calling port 8080 directly', q: 'With server.address=127.0.0.1 kept, what if the user calls Spring Boot directly on port 8080?', d: 'Even though Spring Boot is running, the user receives a connection refused error, because Spring Boot accepts only connections that come to 127.0.0.1.', v: { via: 'direct', bind: true, up: 'both' } },
    { t: 'Removing the server.address line and calling directly', q: 'If you remove the server.address line and call port 8080 directly, whom does Spring Boot see as the peer, and what is X-Forwarded-For?', d: 'The peer is the user itself (203.0.113.7), and with no nginx in between to write the header, X-Forwarded-For is null.', v: { via: 'direct', bind: false, up: 'both' } },
    { t: 'Stopping Spring Boot', q: 'What does the user receive if Spring Boot is stopped and the user calls through nginx (port 80)?', d: 'nginx cannot connect to port 8080 and returns 502 Bad Gateway to the user. nginx made this response.', v: { via: 'proxy', bind: true, up: 'noserver' } },
    { t: 'Calling directly with Spring Boot stopped', q: 'If Spring Boot is stopped, there is no server.address line, and the user calls port 8080 directly, does the user receive a 502?', d: 'The request does not pass through an nginx that could answer for it, so the user receives a connection refused error, not 502.', v: { via: 'direct', bind: false, up: 'noserver' } },
    { t: 'Stopping nginx', q: 'What if Spring Boot is kept running, nginx is stopped, and the user calls port 80?', d: 'Even though Spring Boot is fine, the user receives a connection refused error. The one door the user uses is port 80 of nginx.', v: { via: 'proxy', bind: true, up: 'noproxy' } },
  ],
  CL: '203.0.113.7', HOST: '192.0.2.10',
  GOT: { ok: '200 response (made by Spring Boot)', bad: '502 Bad Gateway (a response made by nginx)', refuse: 'Connection refused error (nothing is waiting at that address and port)' },
  NONE: 'None (no request arrived)',
  // Decides which branch the result takes. It is checked against what was measured in the run (verify/net/proxy_basic_probe_boot.js) with verify/net/cmp_proxy_basic.js.
  judge: function (c) {
    var viaP = c.via === 'proxy', pOn = c.up !== 'noproxy', sOn = c.up !== 'noserver', r = { viaP: viaP, pOn: pOn, sOn: sOn, bind: !!c.bind };
    if (viaP && !pOn) r.k = 'refuseProxy';
    else if (viaP && !sOn) r.k = 'bad';
    else if (viaP) r.k = 'okProxy';
    else if (!sOn) r.k = 'refuseDown';
    else if (c.bind) r.k = 'refuseBind';
    else r.k = 'okDirect';
    return r;
  },
  code: function (c) {
    var o = [], pOn = c.up !== 'noproxy', sOn = c.up !== 'noserver';
    o.push('# The address the user (another computer, 203.0.113.7) calls');
    if (c.via === 'proxy') o.push('# If no port number is written, http goes to port 80', 'http://192.0.2.10/hello');
    else o.push('# :8080 is written, so it goes to port 8080', 'http://192.0.2.10:8080/hello');
    o.push('',
      '# nginx configuration (runs on the server computer 192.0.2.10)' + (pOn ? '' : ' · nginx is stopped now'),
      'server {',
      '    listen 80;',
      '    location / {',
      '        proxy_pass http://127.0.0.1:8080;',
      '        proxy_set_header Host $host;',
      '        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;',
      '    }',
      '}',
      '',
      '# application.properties (Spring Boot, runs on the same computer)' + (sOn ? '' : ' · stopped now'),
      'server.port=8080');
    if (c.bind) o.push('# Accepts only connections that come to 127.0.0.1 (the address this computer uses for itself)', 'server.address=127.0.0.1');
    else o.push('# No server.address line: accepts a connection that comes to any address of this computer');
    o.push('',
      '// HelloController.java',
      '// HelloController is a name chosen for this example. @RestController and @GetMapping come from',
      '// Spring, and HttpServletRequest comes from the servlet API (jakarta.servlet).',
      'import jakarta.servlet.http.HttpServletRequest;',
      'import org.springframework.web.bind.annotation.GetMapping;',
      'import org.springframework.web.bind.annotation.RestController;',
      '',
      '@RestController',
      'public class HelloController {',
      '    @GetMapping("/hello")',
      '    public String hello(HttpServletRequest request) {',
      '        // The address of the peer that opened a connection to this server',
      '        String peer = request.getRemoteAddr();',
      '        // The X-Forwarded-For header that came with the request (null if absent)',
      '        String xff = request.getHeader("X-Forwarded-For");',
      '        return "Connected peer: " + peer + ", X-Forwarded-For: " + xff;',
      '    }',
      '}');
    return o.join('\n');
  },
  label: function (c) { return { proxy: 'Calls port 80 (nginx)', direct: 'Calls port 8080 (Spring Boot) directly' }[c.via] + ' · ' + (c.bind ? 'server.address=127.0.0.1' : 'no server.address') + ' · ' + { both: 'both running', noserver: 'Spring Boot stopped', noproxy: 'nginx stopped' }[c.up]; },
  columns: ['What the user received', 'getRemoteAddr() (the peer Spring Boot saw)', 'X-Forwarded-For header', 'Path the request took'],
  simulate: function (c) {
    var j = this.judge(c), G = this.GOT, NONE = this.NONE, CL = this.CL, HOST = this.HOST, ev = [], sum = [], row;
    var spSub = j.sOn ? (j.bind ? ['Waiting at', '127.0.0.1:8080'] : ['Waiting on 8080', '(any address)']) : ['Stopped'];
    var st = { cl: 'plain', clt: [CL], px: j.pOn ? 'plain' : 'ghost', pxt: j.pOn ? ['Waiting on 80'] : ['Stopped'], sv: j.sOn ? 'plain' : 'ghost', svt: spSub, aq1: '', aq2: '', ar2: '', ar1: '', dq: '', dr: '', got: '', gotc: '', peer: '', peerc: '', xff: '', xffc: '', way: '', wayc: '' };
    function push(s, k) { ev.push({ s: s, k: k, snap: JSON.parse(JSON.stringify(st)) }); }
    // Step 1: the user calls
    if (j.viaP) st.aq1 = 'plain'; else st.dq = 'plain';
    st.cl = 'hot'; st.clt = [CL, 'Connecting to ' + (j.viaP ? '80' : '8080')];
    push('The user (' + CL + ') sends a GET /hello request to the address in the code box. ' + (j.viaP ? 'The address has no port number, so it connects to port 80 of the server computer ' + HOST + '. What waits on port 80 is nginx (listen 80). The address the user uses does not contain the Spring Boot port, 8080.' : 'The address has :8080, so it connects straight to port 8080 of the server computer ' + HOST + '. The request does not pass through nginx.') + (j.pOn ? '' : ' nginx is stopped now.') + (j.sOn ? '' : ' Spring Boot is stopped now.'), '');
    if (j.k === 'refuseProxy') {
      st.cl = 'bad'; st.clt = ['Refused']; st.aq1 = 'bad'; st.got = G.refuse; st.gotc = 'bad'; st.way = 'User → nginx (80) (refused)'; st.wayc = 'bad';
      push('No program is waiting on port 80 of ' + HOST + ', so the connection is not made, and the user receives a connection refused error. The request reached neither nginx nor Spring Boot.', 'bad');
      st.peer = NONE; st.peerc = 'bad'; st.xff = NONE; st.xffc = 'bad';
      push('Spring Boot is running and waiting on port 8080' + (j.bind ? ' of 127.0.0.1' : '') + ', but it never received a request, because the user calls only port 80. So the controller never ran.', 'bad');
      sum.push('If nginx is stopped, the user receives a connection refused error. Even though Spring Boot is fine, no program is waiting on port 80, which the user calls, so the request cannot reach the server.');
      sum.push('In a setup where users call only the address of nginx, nginx is the only door to Spring Boot. So when nginx stops, the service stops even though the server behind it is alive.');
      row = [G.refuse, NONE, NONE, st.way];
    } else if (j.k === 'bad') {
      st.aq1 = 'hot'; st.px = 'hot'; st.pxt = ['Got request']; st.cl = 'plain'; st.clt = [CL, 'Awaiting reply'];
      push('nginx receives the request. Following the line proxy_pass http://127.0.0.1:8080 in the location / block, it tries to make a new connection to port 8080 of the same computer and pass the request on.', '');
      st.aq2 = 'bad'; st.px = 'bad'; st.pxt = ['Cannot reach 8080']; st.way = 'User → nginx (80) → Spring Boot (8080) (refused)'; st.wayc = 'bad';
      push('Spring Boot is stopped, so no program is waiting on port 8080 of 127.0.0.1. nginx receives a connection refused error, and the request did not reach Spring Boot.', 'bad');
      st.ar1 = 'bad'; st.got = G.bad; st.gotc = 'bad'; st.cl = 'bad'; st.clt = ['Got a 502'];
      push('nginx returns a 502 Bad Gateway response to the user. The body is a short HTML page whose title is "502 Bad Gateway", and it was made by nginx, not by Spring Boot. 502 is a status code that says a server acting as a proxy did not get a valid response from the server behind it.', 'bad');
      st.peer = NONE; st.peerc = 'bad'; st.xff = NONE; st.xffc = 'bad';
      push('The user received a response, not a connection refused error, because nginx, the peer the user connected to, is running. Spring Boot never received a request, so the controller did not run.', 'bad');
      sum.push('If Spring Boot is stopped, a user who calls through nginx receives not a connection refused error but a 502 Bad Gateway made by nginx. It means "the request reached nginx, but nginx could not pass it on to the server behind it."');
      sum.push('So when the browser shows the 502 page of nginx, first check whether Spring Boot is running and whether the port written in proxy_pass (8080) matches server.port.');
      row = [G.bad, NONE, NONE, st.way];
    } else if (j.k === 'okProxy') {
      st.aq1 = 'hot'; st.px = 'hot'; st.pxt = ['Got request,', 'passed to 8080']; st.aq2 = 'hot'; st.sv = 'hot'; st.svt = ['Got request']; st.way = 'User → nginx (80) → Spring Boot (8080)';
      push('nginx receives the request, and following the line proxy_pass http://127.0.0.1:8080, it makes a new connection to port 8080 of the same computer and passes on the same GET /hello. This connection is separate from the one the user made, and nginx is the side that made it. When passing the request on, following the line proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for, nginx writes the address of the peer that connected to it (' + CL + ') into the X-Forwarded-For header. The line Host $host passes on the name the user wrote in the request (' + HOST + ') as a Host header, and this lab does not use it in its results.' + (j.bind ? ' The place nginx connected to is 127.0.0.1, so Spring Boot with server.address=127.0.0.1 accepts this connection too.' : ''), '');
      st.peer = '127.0.0.1 (nginx)'; st.peerc = 'hot'; st.xff = CL; st.xffc = 'good'; st.svt = ['Peer: 127.0.0.1'];
      push('The controller of Spring Boot runs. request.getRemoteAddr() is 127.0.0.1, because the one that opened the connection to this server is not the user but nginx on the same computer. The user\'s address ' + CL + ' is obtained with request.getHeader("X-Forwarded-For"), a value that nginx wrote.', 'hot');
      st.ar2 = 'good'; st.ar1 = 'good'; st.got = G.ok; st.gotc = 'good'; st.cl = 'good'; st.clt = ['Got a 200']; st.px = 'plain'; st.pxt = ['Sent response back']; st.sv = 'plain'; st.svt = ['Sent response'];
      push('nginx receives the response of Spring Boot and returns it to the user. What the user received is status code 200 and the body "Connected peer: 127.0.0.1, X-Forwarded-For: ' + CL + '". The user talked only with the nginx it connected to.', 'good');
      sum.push('Going through nginx splits the connection in two. The user connects to nginx (port 80), and nginx makes its own connection to Spring Boot (port 8080) and passes the request on. So getRemoteAddr() in Spring Boot is not the address of the user but that of nginx (127.0.0.1).');
      sum.push('The real user\'s address arrives in the X-Forwarded-For header that nginx wrote with proxy_set_header. The setting that makes Spring Boot read this header and reflect it in getRemoteAddr() (server.forward-headers-strategy) is covered in the in-depth lab "Proxies and reverse proxies".');
      row = [G.ok, '127.0.0.1 (nginx)', CL, st.way];
    } else if (j.k === 'refuseDown' || j.k === 'refuseBind') {
      st.cl = 'bad'; st.clt = ['Refused']; st.dq = 'bad'; st.got = G.refuse; st.gotc = 'bad'; st.way = 'User → Spring Boot (8080) (refused)'; st.wayc = 'bad';
      if (j.k === 'refuseBind') {
        push('Spring Boot is running and waiting on port 8080, but because of the line server.address=127.0.0.1, it accepts only connections that come to 127.0.0.1. The user\'s connection came to port 8080 of ' + HOST + ', and no program is waiting at that address and port. So the connection is not made, and the user receives a connection refused error.', 'bad');
        st.peer = NONE; st.peerc = 'bad'; st.xff = NONE; st.xffc = 'bad';
        push('The controller did not run. 127.0.0.1 is the address a computer uses for itself, so a user on another computer cannot connect to the server computer with this address. Only a program on the same computer (here, nginx) can connect to 127.0.0.1:8080.', 'bad');
        sum.push('With server.address=127.0.0.1, Spring Boot accepts only connections from the same computer. So an outside user cannot call port 8080 directly and can get in only through port 80 of nginx.');
        sum.push('This way you can keep the port of the real server closed to the outside and expose only the proxy. Blocking port 8080 with a firewall is another way.');
      } else {
        push('No program is waiting on port 8080 of ' + HOST + ', so the connection is not made, and the user receives a connection refused error.' + (j.pOn ? ' nginx is running, but this request did not go to port 80, so it does not pass through nginx.' : ''), 'bad');
        st.peer = NONE; st.peerc = 'bad'; st.xff = NONE; st.xffc = 'bad';
        push('Spring Boot is stopped, so the controller did not run. The request did not pass through an nginx that could answer for it, so the user received a connection refused error and not a response such as 502.', 'bad');
        sum.push('If Spring Boot is stopped while the user calls it directly, the user receives a connection refused error. There is no proxy to answer for it, so there is no response such as 502 either.');
        sum.push('In the same situation through nginx, the user received the 502 Bad Gateway made by nginx (the question "Stopping Spring Boot"). What the user receives when the server is stopped depends on whether there is a proxy in between.');
      }
      row = [G.refuse, NONE, NONE, st.way];
    } else {
      st.dq = 'hot'; st.sv = 'hot'; st.svt = ['Got request']; st.way = 'User → Spring Boot (8080)';
      push('There is no server.address line, so Spring Boot accepts on port 8080 a connection that comes to any address of this computer. The user\'s connection is made and the request arrives directly.' + (j.pOn ? ' nginx is running, but it never received this request.' : ' nginx is stopped, but this request does not pass through nginx anyway, so it makes no difference.'), '');
      st.peer = CL + ' (user)'; st.peerc = 'good'; st.xff = 'null (no header)'; st.xffc = 'hot'; st.svt = ['Peer: ' + CL];
      push('The controller runs. request.getRemoteAddr() is ' + CL + ', the user\'s own address, because the one that opened the connection to this server is the user. request.getHeader("X-Forwarded-For") is null. The request did not pass through an nginx that would write the header in between, and the user did not send that header either.', 'good');
      st.dr = 'good'; st.got = G.ok; st.gotc = 'good'; st.cl = 'good'; st.clt = ['Got a 200']; st.sv = 'plain'; st.svt = ['Sent response'];
      push('The user receives the response of Spring Boot directly. What it received is status code 200 and the body "Connected peer: ' + CL + ', X-Forwarded-For: null".', 'good');
      sum.push('When the user calls directly, there is only one connection. The user connects straight to Spring Boot, so getRemoteAddr() is the user\'s address itself, and there is no X-Forwarded-For.');
      sum.push('Compared with going through nginx (the default settings), even with the same controller, getRemoteAddr() changes from 127.0.0.1 (nginx) to ' + CL + ' (the user). However, with the server.address line removed, port 8080 is open to the outside, so a user can skip nginx and come in.');
      row = [G.ok, CL + ' (user)', 'null (no header)', st.way];
    }
    return { events: ev, summary: sum, row: row };
  },
  render: function (v, sim, t, H, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : null;
    if (!s) { H.text(v, 'Click Run to start with the user sending a request to the address in the code box.'); return; }
    H.table(v, ['Item', 'Value'], [
      { cls: s.got ? '' : 'gone', cells: ['What the user received', s.got ? { v: s.got, cls: s.gotc } : 'Not yet'] },
      { cls: s.peer ? '' : 'gone', cells: ['getRemoteAddr() (the peer Spring Boot saw)', s.peer ? { v: s.peer, cls: s.peerc } : 'Not yet'] },
      { cls: s.xff ? '' : 'gone', cells: ['X-Forwarded-For header', s.xff ? { v: s.xff, cls: s.xffc } : 'Not yet'] },
      { cls: s.way ? '' : 'gone', cells: ['Path the request took', s.way ? { v: s.way, cls: s.wayc || 'good' } : 'Not yet'] },
    ], 'Result');
  },
  // Diagram: the user (another computer) on the left. The box on the right is the server computer 192.0.2.10, with nginx in its upper part and Spring Boot in its lower part (both are programs running on that computer).
  // Through nginx, the arrows bend user -> nginx -> Spring Boot; when calling directly, the arrow passes under nginx and goes straight. A program that is stopped is a dashed box and a refused place is red. Four result boxes below.
  draw: function (P, sim, shown) {
    var c = sim.c, last = shown[shown.length - 1], s = last ? last.snap : null, pOn = c.up !== 'noproxy', sOn = c.up !== 'noserver';
    P.size(680, 392);
    P.region('host', 216, 10, 456, 204, 'Server computer 192.0.2.10');
    P.box('cl', 14, 118, 150, 72, { cls: s ? s.cl : 'plain', title: 'User', sub: s ? s.clt : ['203.0.113.7'] });
    P.box('px', 236, 38, 170, 72, { cls: s ? s.px : (pOn ? 'plain' : 'ghost'), title: 'nginx', sub: s ? s.pxt : (pOn ? ['Waiting on 80'] : ['Stopped']) });
    P.box('sv', 488, 118, 170, 72, { cls: s ? s.sv : (sOn ? 'plain' : 'ghost'), title: 'Spring Boot', sub: s ? s.svt : (sOn ? (c.bind ? ['Waiting at', '127.0.0.1:8080'] : ['Waiting on 8080', '(any address)']) : ['Stopped']) });
    function ac(x) { return x === 'plain' ? '' : x; }
    if (s && s.aq1) P.arrow('aq1', [164, 130], [236, 86], { cls: ac(s.aq1) });
    if (s && s.aq2) P.arrow('aq2', [406, 86], [488, 130], { cls: ac(s.aq2) });
    if (s && s.ar2) P.arrow('ar2', [488, 146], [406, 100], { cls: ac(s.ar2) });
    if (s && s.ar1) P.arrow('ar1', [236, 100], [164, 146], { cls: ac(s.ar1) });
    if (s && s.dq) P.arrow('dq', [164, 162], [488, 162], { cls: ac(s.dq) });
    if (s && s.dr) P.arrow('dr', [488, 180], [164, 180], { cls: ac(s.dr) });
    P.box('n1', 14, 226, 652, 36, { cls: s && s.got ? s.gotc || 'wait' : 'ghost', title: 'User received', right: s && s.got ? s.got : 'Not yet' });
    P.box('n2', 14, 268, 652, 36, { cls: s && s.peer ? s.peerc || 'wait' : 'ghost', title: 'getRemoteAddr()', right: s && s.peer ? s.peer : 'Not yet' });
    P.box('n3', 14, 310, 652, 36, { cls: s && s.xff ? s.xffc || 'wait' : 'ghost', title: 'X-Forwarded-For header', right: s && s.xff ? s.xff : 'Not yet' });
    P.box('n4', 14, 352, 652, 36, { cls: s && s.way ? s.wayc || 'wait' : 'ghost', title: 'Path the request took', right: s && s.way ? s.way : 'Not yet' });
  },
  assume: 'The verification run (verify/net/proxy_basic_probe_boot.js) ran all twelve combinations only on the PC used to write this lab and did not use any external network. The Spring Boot side was actually run. The HelloController on the screen was compiled with JDK 21 with only one package line added, the lines of application.properties on the screen were written out to a file as they are, and the server was started as Spring Boot 4.1.1 (Spring 7.0.9, embedded Tomcat 11.0.24). The only change was replacing the 8080 of server.port with a free port number; the Main class that starts it and the filter that counts /hello requests were added for the run (they are not on the screen). Checking with netstat, the server waited only on 127.0.0.1 with server.address=127.0.0.1, and on 0.0.0.0 (all addresses) without that line. nginx is not on this computer and was not downloaded; a Node.js 24.18.0 program, built by reading the nginx configuration on the screen and behaving as the nginx documentation describes, stood in for nginx. This program does not pass on the Host and Connection of the received request, passes on the other headers as they are, applies the $host (the name written in the Host of the request) and $proxy_add_x_forwarded_for (the received X-Forwarded-For followed by a comma and $remote_addr, or just $remote_addr if nothing was received) of the proxy_set_header lines, and passes the request to the back end as HTTP/1.1 with the default Connection: close added. If it cannot connect to the back end, it returns 502 and the 502 page written in the nginx source. So the nginx side was not run with real nginx; it was carried over by checking against the documentation and the source. What was checked against the documentation is the ngx_http_core_module of nginx.org (the default of listen, server and location, $host, $remote_addr), the ngx_http_proxy_module (proxy_pass; the defaults of proxy_set_header, Host $proxy_host and Connection close; that the Host and Connection of the original request are not passed on; the definition of $proxy_add_x_forwarded_for; and that proxy_http_version defaults to 1.1 from 1.29.7), the nginx source ngx_http_upstream.c (a failure to connect to the back end is handled as an error branch, and if there is no next server to pass to, it ends with 502) and ngx_http_special_response.c (the text of the 502 page), the description of the settings in the Spring Boot 4.1.1 jar (server.address is the network address the server binds to, and server.port defaults to 8080), and section 15.6.3 (502) of RFC 9110. The nginx documentation has no sentence that says "502 if connecting to the back end fails", so this was checked in the source. The last line of the 502 page may have a version number after nginx depending on the server_tokens setting. The user address 203.0.113.7 and the server computer address 192.0.2.10 on the screen are example addresses for documentation, and in the run the user was replaced by 127.0.0.10 and the outside address of the server computer by 127.0.0.2 (both are loopback addresses of this PC). So "calling port 8080 from another computer is refused" was checked as a connection to 127.0.0.2 being refused by a Spring Boot that waits only on 127.0.0.1, and it was not run on a real other computer. The 80 and 8080 on the screen were also free port numbers in the real run, and a program that was stopped was not started, and its port number was replaced by a free port that had just been closed. What was checked against (verify/net/cmp_proxy_basic.js, all 13 cases matched) is what the user received (the status code, the body, or the connection refusal), the getRemoteAddr() and X-Forwarded-For that the controller returned, the number of requests received by the program standing in for nginx and the headers it added, the number of /hello requests Spring Boot received, and whether the code on the screen is the same text that the run read. Tomcat does not put text such as OK on the status line, so the table shows only the status code 200. This lab does not cover HTTPS (port 443) and certificates, server.forward-headers-strategy (which makes Spring Boot read X-Forwarded-For and reflect it in getRemoteAddr()) and forged headers, or 504 for slow responses. The first ones are covered in the in-depth lab "Proxies and reverse proxies", splitting among several servers in "Load balancers and scale out", and keeping copies of responses in "CDN".',
});

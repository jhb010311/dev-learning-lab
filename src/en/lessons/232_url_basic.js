Lab.register({
  id: 'url_basic', nav: 'URLs', cat: 'Fundamentals', mode: 'step', basic: true, deep: ['url'],
  title: 'What parts is a URL made of?',
  intro: 'A URL such as http://localhost:8080/hello?name=kim, which you type in the address bar, looks like one block of characters, but it is a set of parts divided by fixed symbols (://, :, /, ?). The scheme (http) tells which rules to talk by, the host (localhost) tells which computer, the port (8080) tells which program on that computer, the path (/hello) tells what to ask that program for, and the query (?name=kim) is an extra value sent along. The client (the program that sends the request: a browser is a typical one, and in this lab it is a Node.js program) splits the URL into these parts, connects with the host and the port, and writes only the path and the query in the first line of the HTTP request that it sends to the server. In this lab, you remove or change the parts one at a time, send a request to the same server (a server that has only the /hello address), and see where each part is used and what happens when a part is missing.',
  terms: ['URL components', 'Scheme and default port', 'Path and query', 'Port'],
  controls: [
    { id: 'scheme', label: 'Write http:// at the very beginning', type: 'check', value: true },
    { id: 'port', label: 'Write :8080 after the host', type: 'check', value: true },
    { id: 'path', label: 'Path', type: 'select', value: 'hello', options: [['hello', 'Path /hello'], ['nothing', 'Path /nothing (a path the server does not have)'], ['none', 'Do not write a path']] },
    { id: 'query', label: 'Write ?name=kim at the end', type: 'check', value: true },
  ],
  // q is the question shown on the question-style screen. t and d are the name and the description used in the text-only reading
  presets: [
    { t: 'Default settings', q: 'What parts is a URL made of, and where does the client use each part?', d: 'A URL with all five parts. The host and the port are used to connect, and the path and the query are used in the first line of the request.', v: { scheme: true, port: true, path: 'hello', query: true } },
    { t: 'Removing ?name=kim', q: 'What if you remove ?name=kim?', d: 'A URL with only the query missing. The connection and the path stay the same, and the server cannot find name.', v: { scheme: true, port: true, path: 'hello', query: false } },
    { t: 'Changing the path to /nothing', q: 'What if you change the path to /nothing?', d: 'The connection is the same and only the path is one the server does not have. The server answers with 404.', v: { scheme: true, port: true, path: 'nothing', query: true } },
    { t: 'Removing the path', q: 'What if you remove the path?', d: 'Even if you do not write a path, the client sends /. The server does not have a / address.', v: { scheme: true, port: true, path: 'none', query: true } },
    { t: 'Removing :8080', q: 'What if you remove :8080?', d: 'If you do not write a port, the client tries to connect to port 80, the default port of http. It does not reach port 8080, where the server is.', v: { scheme: true, port: false, path: 'hello', query: true } },
    { t: 'Removing http:// at the beginning', q: 'What if you remove http:// at the beginning?', d: 'Without a scheme, the parts cannot be split correctly. The client in this lab cannot send the request (a browser address bar adds http:// for you).', v: { scheme: false, port: true, path: 'hello', query: true } },
  ],
  PATHS: { hello: '/hello', nothing: '/nothing', none: '' },
  code: function (c) {
    return (c.scheme ? 'http://' : '') + 'localhost' + (c.port ? ':8080' : '') + this.PATHS[c.path] + (c.query ? '?name=kim' : '');
  },
  label: function (c) { return (c.scheme ? 'http:// present' : 'http:// absent') + ' · ' + (c.port ? ':8080 present' : ':8080 absent') + ' · ' + { hello: 'path /hello', nothing: 'path /nothing', none: 'no path' }[c.path] + ' · ' + (c.query ? 'query present' : 'query absent'); },
  // What the client read from the URL in this setting (the same items that the Probe measured)
  facts: function (c) {
    var p = this.PATHS[c.path], q = c.query ? '?name=kim' : '', text = this.code(c);
    if (!c.scheme && !c.port) return { kind: 'bad', text: text, parse: { error: 'ERR_INVALID_URL' } };
    if (!c.scheme) return { kind: 'odd', text: text, rest: '8080' + p, q: q, parse: { protocol: 'localhost:', hostname: '', port: '', pathname: '8080' + p, search: q } };
    var target = (p || '/') + q, name = c.query ? 'kim' : 'guest', ok = c.path === 'hello';
    return {
      kind: 'http', text: text, p: p, q: q, target: target, port: c.port, ok: ok,
      parse: { protocol: 'http:', hostname: 'localhost', port: c.port ? '8080' : '', pathname: p || '/', search: q },
      connect: { host: 'localhost', port: c.port ? 8080 : 80 },
      line: 'GET ' + target + ' HTTP/1.1', hostLine: c.port ? 'Host: localhost:8080' : 'Host: localhost',
      status: ok ? 200 : 404, body: ok ? 'Hello, ' + name : '',
    };
  },
  columns: ['Host and port that were read', 'First line of the request sent to the server', 'Response'],
  simulate: function (c) {
    var f = this.facts(c), ev = [], sum = [], T = f.text;
    var st = { rev: [], hl: [], cn: '', cnText: '', rq: '', rqText: '', res: '', rows: [], out: [] };
    function push(s, k) { ev.push({ s: s, k: k, snap: JSON.parse(JSON.stringify(st)) }); }
    function at(id) { if (st.rev.indexOf(id) < 0) st.rev.push(id); st.hl = [id]; }
    var first = 'The client (a Node.js program in this lab) receives the URL "' + T + '". A URL is not one block of characters but a set of parts divided by fixed symbols (://, :, /, ?). The client looks at these symbols and splits the URL into parts from the left. The server is a server that has only the /hello address.';

    if (f.kind === 'bad') {
      push(first, '');
      st.hl = ['sc']; st.rev = ['sc'];
      push('It looks for the scheme at the very beginning. The scheme is the name before the :, but "' + T + '" has no :, so there is no scheme. With no scheme and no other address to use as a base, the URL standard cannot read this text as an address.', 'bad');
      st.hl = ['ho', 'po', 'pa', 'qu']; st.rev = ['sc', 'ho', 'po', 'pa', 'qu'];
      push('Without the scheme, it cannot know what the / and ? divide either. This text cannot be split into a host, a port, a path, and a query, and it becomes an "Invalid URL" error.', 'bad');
      st.hl = []; st.cn = 'bad'; st.cnText = 'Unknown where to connect'; st.rq = 'bad'; st.rqText = 'Could not be sent'; st.res = 'No response (the request could not be sent)'; st.out = [['Where it connects', 'Unknown'], ['First line of the request', 'Could not be sent'], ['Response', st.res]];
      push('From text that could not be split, you can get neither a host to connect to nor a path to write in the request. The client could not send a request, and the server received nothing.', 'bad');
      sum.push('If you remove both http:// at the beginning and :8080, this text is not read as a URL. It could not find a scheme, so it could not be split into parts, and the request could not be sent either.');
      sum.push('Whatever the rest of the characters are, it is no use without a scheme. The scheme is the starting point that lets symbols such as :, /, and ? be read with their meaning.');
      return { events: ev, summary: sum, f: f, row: ['Not read as an address', 'Could not be sent', 'No response (the request could not be sent)'] };
    }

    if (f.kind === 'odd') {
      push(first, '');
      at('sc'); st.rows.push(['Scheme', 'localhost', '(Misread) which rules to talk by']);
      push('It looks for the scheme at the very beginning. The scheme is the name up to where the first : appears. In "' + T + '", there is a : right after localhost, so if you read it by the URL standard, localhost becomes the scheme. It is the text that was originally written as the host.', 'bad');
      at('ho'); st.hl = ['ho', 'po', 'pa']; st.rev = ['sc', 'ho', 'po', 'pa'];
      st.rows.push(['Host and port', '(none)', 'Not read, because // does not follow the scheme']);
      st.rows.push(['Path', f.rest, '(Misread) the whole rest became the path']);
      push('// does not follow the scheme, so the host and the port were not read. The rest, "' + f.rest + '", becomes the path as a whole. 8080 is not a port but characters of the path.', 'bad');
      if (c.query) { at('qu'); st.hl = ['qu']; st.rows.push(['Query', 'name=kim', 'Extra value sent along']); push('The "name=kim" after the ? is split off as the query. Even in this case, what follows the ? is split off as the query. But there is no host to receive it.', ''); }
      else { st.rev = ['sc', 'ho', 'po', 'pa', 'qu']; }
      st.hl = []; st.cn = 'bad'; st.cnText = 'Unknown where to connect'; st.rq = 'bad'; st.rqText = 'Could not be sent'; st.res = 'No response (the request could not be sent)'; st.out = [['Where it connects', 'Unknown'], ['First line of the request', 'Could not be sent'], ['Response', st.res]];
      push('localhost is not a scheme that means HTTP rules, and there is no host either, so the client cannot know which computer to connect to or by which rules. Sending a request with Node.js was refused because the scheme did not fit, and fetch failed too because the scheme is unknown. The first line of the request was not made, and the server received nothing.', 'bad');
      sum.push('If you remove http:// at the beginning, "' + T + '" is still read as an address, but it is split in the wrong way. localhost becomes the scheme, and the host and the port are gone. The request could not be sent.');
      sum.push('Without a scheme, what : and / divide changes. The same characters are split correctly into a host, a port, and a path only when there is a scheme.');
      return { events: ev, summary: sum, f: f, row: ['Scheme read as localhost (no host)', 'Could not be sent', 'No response (the request could not be sent)'] };
    }

    // An http address: it is split into five parts
    var bound = f.p ? 'the /' : (f.q ? 'the ? (there is no /)' : 'the end of the text (there is no /)');
    push(first, '');
    at('sc'); st.rows.push(['Scheme', 'http', 'Which rules to talk by']);
    push('From the beginning up to :// is the scheme, and here it is "http". The scheme tells which rules to talk to the server by. http means to talk by HTTP rules, that is, to send a request line and headers and receive a response.', '');
    at('ho'); st.rows.push(['Host', 'localhost', 'Which computer']);
    push('From after :// up to ' + bound + ' is the host and the port. ' + (c.port ? 'The part before the : is the host, and here it is "localhost".' : 'There is no : here, so this whole part is the host, and it is "localhost".') + ' The host tells which computer to connect to.', '');
    at('po');
    if (c.port) {
      st.rows.push(['Port', '8080', 'Which program on that computer']);
      push('The part after the : is the port, and here it is "8080". Several programs can run on one computer, and the port tells which of them to connect to. Our server program is waiting on port 8080.', '');
    } else {
      st.rows.push(['Port', '(not written) 80', 'Uses the default port of http']);
      push('The URL has no :, so no port is written. In this case, the client uses the default port of the scheme. The default port of http is 80, so it reads it as port 80. The number our server program is waiting on is 8080, so they are not the same.', 'bad');
    }
    at('pa');
    if (f.p) {
      st.rows.push(['Path', f.p, 'What to ask that program for']);
      push('Then from the / up to ' + (c.query ? 'the ?' : 'the end of the text') + ' is the path, and here it is "' + f.p + '". The path tells the connected program what to ask for.', '');
    } else {
      st.rows.push(['Path', '(not written) /', 'Sends / if it is empty']);
      push('There is no / after the host and the port, so the path is empty. If the path is empty, the client sends / as the path. So the path is read as "/".', '');
    }
    at('qu');
    if (c.query) {
      st.rows.push(['Query', 'name=kim', 'Extra value sent along']);
      push('What follows the ? is the query, and here it is "name=kim". It is in the form name=value, and it is a value sent along with the path.', '');
    } else {
      st.rows.push(['Query', '(none)', 'No extra value']);
      push('The URL has no ?, so there is no query. A query is an extra value, so the other parts are read the same without it.', '');
    }
    st.hl = ['ho', 'po']; st.cn = f.port ? 'wait' : 'bad'; st.cnText = 'localhost, port ' + f.connect.port;
    st.out.push(['Where it connects', 'localhost, port ' + f.connect.port + (f.port ? '' : ' (default port)')]);
    if (c.port) push('The client connects with the host and the port. It connects to the server program waiting on port 8080 of the localhost computer (the very computer the client runs on). The scheme, the host, and the port were used for this connection.', 'good');
    else push('The client tries to connect with the host and the port. Where it tries to connect is port 80 of localhost. That is not port 8080, where the server waits, so this connection does not reach our server. (This lab does not really connect to port 80. It intercepted and recorded where the client tried to connect.) In the diagram, the dashed port box and dashed arrow mean that no port was written in the URL, so the default value 80 was used.', 'bad');
    st.hl = ['pa', 'qu']; st.rq = 'ok'; st.rqText = f.line;
    st.out.push(['First line of the request', f.line + (c.port ? '' : ' (a request to send to port 80)')], ['Host header', f.hostLine]);
    push((c.port ? 'Once connected,' : 'If there is a server on port 80 and the connection is made,') + ' the client writes the path and the query in the first line of the request and sends it: "' + f.line + '". The scheme (http), the host (localhost), and the port' + (c.port ? ' (8080)' : ' (80)') + ' do not go into the first line. The host and the port were used to connect, and they are also written in the Host header of the request. In this experiment, the Host line the server received was "' + f.hostLine + '"' + (c.port ? '.' : ' (the port was not written, so there is no number).') + (f.p ? '' : ' The path was empty, so / was written in the first line. In the diagram, the dashed path box and dashed arrow mean that no path was written in the URL, so the default value / was used.'), 'good');
    if (!c.port) {
      st.res = 'If there is no server on port 80, the connection cannot be made'; st.hl = [];
      st.out.push(['Response', st.res]);
      push('If there is no server on port 80, the connection itself cannot be made, so there is no request and no response. Our server (on port 8080) does not receive this request. Even though the path and the query are written correctly, the place it connects to is wrong.', 'bad');
      sum.push('If you remove :8080, the client tries to connect to port 80, the default port of http. The server is on port 8080, so this request does not reach the server, and if there is no server on port 80, the connection cannot be made.');
      sum.push('The first line of the request stays "' + f.line + '", and only the place it connects to changed. Not writing a port does not mean there is no port. It means to use the default port of the scheme.');
      return { events: ev, summary: sum, f: f, row: ['localhost, port 80 (default port of http)', f.line + ' (a request to send to port 80)', 'If there is no server on port 80, the connection cannot be made'] };
    }
    st.hl = ['pa', 'qu'];
    var answer = f.status + (f.body ? ' ' + f.body : '');
    st.res = answer; st.out.push(['Response', answer]);
    if (f.ok) push('The server looks at the path in the first line. /hello is an address it has, so it makes a 200 response. It reads the name in the body from the query. ' + (c.query ? 'The value of name is kim, so the body is "' + f.body + '".' : 'There is no query, so it cannot find name, and it uses "guest", which it was built to use in this case, so the body is "' + f.body + '".') + ' This server code is not shown on the screen, but it was built to answer this way.', 'good');
    else push('The server looks at the path in the first line. "' + (f.p || '/') + '" is not an address it has, so it makes a 404 response.' + (c.query ? ' Even though the query name=kim is attached, it is not used when the path does not match.' : ''), 'bad');
    push('The client ' + (f.ok ? 'receives a 200 response. The body is "' + f.body + '".' : 'receives a 404 response.'), f.ok ? 'good' : 'bad');
    // Summary: the first line is the answer to the question
    if (f.ok && c.query) {
      sum.push('A URL is parts divided by fixed symbols. http is the scheme (by which rules), localhost is the host (which computer), 8080 is the port (which program on that computer), /hello is the path (what to ask for), and name=kim is the query (an extra value).');
      sum.push('The client connects with the host and the port, and writes only the path and the query in the first line of the request. The scheme, the host, and the port do not go into the first line. The server answered by looking at the path and the query in the first line.');
    } else if (!c.query && f.ok) {
      sum.push('If you remove ?name=kim, only the query part disappears, and the other parts are read the same. The first line becomes "GET /hello HTTP/1.1", and the server could not find name and answered "Hello, guest".');
      sum.push('A query is an extra value, so the request still works without it. It is only that the server code reads the query and changes the response.');
    } else if (c.path === 'nothing') {
      sum.push('If you change the path to /nothing, the first line becomes "' + f.line + '", and a 404 came because the server does not have that path. The host and the port used to connect stay the same.');
      sum.push('A 404 means that the connection and the request went through properly and the server has not made that path. If the path is wrong, it is no use even if the query is right.');
    } else {
      sum.push('Even if you do not write a path, the client sends / as the path, so the first line became "' + f.line + '". The server has made only the /hello address, so it answered with 404.');
      sum.push('Not writing a path does not mean there is no path. It means to ask for /. The parts used to connect stay the same.');
    }
    return { events: ev, summary: sum, f: f, row: ['localhost, port 8080', f.line, answer] };
  },
  render: function (v, sim, t, H, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : null;
    if (!s) { H.text(v, 'Click Run to start with the client splitting the URL by symbols from the left.'); return; }
    if (s.rows.length) H.table(v, ['Part', 'Value read', 'What it tells'], s.rows.map(function (r) { return { cls: '', cells: [r[0], r[1], r[2]] }; }), 'Parts of the URL');
    if (s.out.length) H.table(v, ['Item', 'Value'], s.out.map(function (r) { return { cls: '', cells: [r[0], r[0] === 'Response' ? { v: r[1], cls: r[1].indexOf('200') === 0 ? 'good' : 'bad' } : r[1]] }; }), 'Connection and request');
  },
  // Diagram: the received URL at the top, and below it the five parts (scheme / host / port / path / query) appear one after another. Arrows go from the host, port, and scheme to "Where it connects" at the bottom left, and from the path and query to "First line of the request" at the bottom right. A removed part is a dotted box, and when a default value (80, /) is used in place of a removed port or path, the arrow is dotted too. The bottom is the response box.
  draw: function (P, sim, shown) {
    var f = sim.f, last = shown[shown.length - 1], s = last ? last.snap : null, i;
    var pos = { sc: [14, 96], ho: [120, 126], po: [256, 104], pa: [370, 112], qu: [492, 174] };
    var names = { sc: 'Scheme', ho: 'Host', po: 'Port', pa: 'Path', qu: 'Query' };
    var ghostCls = f.kind === 'http' ? 'plain' : 'bad';
    // The value to write on the screen and the kind of box for each part
    var vals = {};
    if (f.kind === 'http') {
      vals.sc = ['http', ''];
      vals.ho = ['localhost', ''];
      vals.po = f.port ? ['8080', ''] : ['(none) 80', 'ghost'];
      vals.pa = f.p ? [f.p, ''] : ['(none) /', 'ghost'];
      vals.qu = f.q ? ['name=kim', ''] : ['(none)', 'ghost'];
    } else if (f.kind === 'odd') {
      vals.sc = ['localhost', 'bad'];
      vals.ho = ['Not read', 'ghost'];
      vals.po = ['Not read', 'ghost'];
      vals.pa = [f.rest, 'bad'];
      vals.qu = f.q ? ['name=kim', ''] : ['(none)', 'ghost'];
    } else {
      vals.sc = ['Not found', 'bad'];
      vals.ho = ['Not read', 'ghost'];
      vals.po = ['Not read', 'ghost'];
      vals.pa = ['Not read', 'ghost'];
      vals.qu = ['Not read', 'ghost'];
    }
    P.size(680, 318);
    P.box('whole', 14, 8, 652, 46, { cls: s && s.rev.length ? 'plain' : 'hot', title: 'URL the client received', sub: f.text, mono: true });
    for (i = 0; i < 5; i++) {
      var id = ['sc', 'ho', 'po', 'pa', 'qu'][i];
      if (!s || s.rev.indexOf(id) < 0) continue;
      var on = s.hl.indexOf(id) >= 0, kind = vals[id][1], group = (id === 'pa' || id === 'qu') ? 'hot' : 'wait';
      var cls = kind === 'ghost' ? 'ghost' : kind === 'bad' ? 'bad' : group;
      P.box('p_' + id, pos[id][0], 68, pos[id][1], 58, { cls: cls + (on ? ' now' : ''), title: names[id], sub: vals[id][0], mono: true });
    }
    P.region('rc', 14, 148, 310, 102, 'Used to connect (scheme, host, port)');
    P.region('rq', 356, 148, 310, 102, 'Written into the request (path, query)');
    var cnShow = s && s.cn, rqShow = s && s.rq;
    P.box('cn', 24, 178, 290, 62, { cls: cnShow ? (s.cn === 'bad' ? 'bad' : 'wait now') : 'ghost', title: 'Where it connects', sub: cnShow ? s.cnText : 'Not yet' });
    P.box('rl', 366, 178, 290, 62, { cls: rqShow ? (s.rq === 'bad' ? 'bad' : 'hot now') : 'ghost', title: 'First line of the request', sub: rqShow ? s.rqText : 'Not yet', mono: true });
    if (cnShow && f.kind === 'http') {
      P.arrow('a_sc', 'p_sc:b', 'cn:t:0.1', {});
      P.arrow('a_ho', 'p_ho:b', 'cn:t:0.4', {});
      P.arrow('a_po', 'p_po:b', 'cn:t:0.75', { cls: f.port ? '' : 'dash' });
    }
    if (rqShow && s.rq === 'ok' && f.kind === 'http') {
      P.arrow('a_pa', 'p_pa:b', 'rl:t:0.3', { cls: f.p ? 'hot' : 'dash' });
      if (f.q) P.arrow('a_qu', 'p_qu:b', 'rl:t:0.75', { cls: 'hot' });
    }
    var res = s && s.res ? s.res : 'Not yet';
    P.box('res', 14, 266, 652, 38, { cls: s && s.res ? (s.res.indexOf('200') === 0 ? 'good' : 'bad') : 'ghost', title: 'Response', right: res });
  },
  assume: 'The server is a single one built with the http module of Node.js 24.18.0. For GET /hello it returns 200 with the body "Hello, <the value of name>" (or "Hello, guest" if there is no name), and for any other path it returns 404. We ran and checked all 24 combinations. The result of splitting the URL into parts (scheme, host, port, path, query) is the value that Node.js\'s new URL(text) produced. This parser follows the same URL standard (WHATWG URL) as browsers. We sent the request by giving that URL to http.request of Node.js, and we recorded the first line and the Host line of the request that the server received exactly as they were. 8080 on the screen is an example. For the combinations that write a port, we started the server on a free port, put that number in the 8080 slot of the URL, and really connected by the name localhost, and we checked against it after changing the number in the Host line the server received to 8080. We also redirected only the connection of the same URL text (with 8080 as it is) to a test server, and recorded where the client tried to connect (it was port 8080). For the combinations that omit the port, we did not really connect to port 80. We intercepted the connection and recorded only that where the client tried to connect was port 80 of localhost, and the first line and the Host line ("Host: localhost", with no port number) of the request it was going to send. So the condition "if there is no server on port 80, the connection cannot be made" in the response box was not checking port 80 in our test run, but a condition that comes from the fact that the place it tried to connect to was port 80, and we did not look at the state of port 80 in our test run. For the combinations without a scheme, we followed the actual results. With a : as in localhost:8080/hello, new URL read localhost as the scheme, left the host and the port empty, and read 8080/hello as the path, and without a : as in localhost/hello, it was an Invalid URL error (ERR_INVALID_URL). In the former case, http.request could not send the request with ERR_INVALID_PROTOCOL, and fetch could not with unknown scheme (this is a case where no connection happens, so we really tried it). In our test run, localhost resolved to the two addresses ::1 and 127.0.0.1 (::1 first), and even though the test server was opened on 127.0.0.1 only, with the default setting of Node.js (try several addresses in turn) the connection went to 127.0.0.1. With the setting that turns that attempt off, the connection was refused on ::1. We did not look at what browsers do. What we opened in the documents and checked is section 3 of RFC 3986 (URI = scheme ":" hier-part [ "?" query ], the division into scheme, authority, path, and query), section 3.1 (scheme), section 3.2.3 (a scheme may define a default port, and if the port is empty it is omitted), section 3.3 (path), section 3.4 (the query runs from the first ? to # or the end), section 4.2.1 of RFC 9110 (for http, if the port is empty or not given, TCP port 80 is the default), section 7.2 (Host tells the host and port of the target URI), section 3.2.1 of RFC 9112 (origin-form sends only the path and the query as the request target, and if the path is empty it must send /), and section 4.4 of the WHATWG URL standard (if it cannot find a scheme and there is no base URL, it fails; if a special scheme is not followed by //, the rest is read as the path; a port that equals the default port is left empty). The documents were opened only as summaries, so we could not check the whole original text against them. The address bar of a browser has a convenience feature that adds http:// for you even if you do not write it, but this lab dealt only with the rules of the URL itself, and we did not check the behavior of the address bar by execution. The client of this lab is Node.js, and we did not run it with a real browser. The detailed rules such as the fragment (#), percent-encoding, and relative URLs are covered in the in-depth lab "URL structure".',
});

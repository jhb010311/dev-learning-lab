// English-version probe for the Fundamentals lab "Load balancers" (lb_basic). Same setup as verify/net/lb_basic_probe.js; only the screen code and the server reply text are English.
// It runs all 4 combinations (server setup 2 x stopping server A 2) for real, on 127.0.0.1 only, on free ports.
//   Server A (and B): Node.js http server that counts received requests in its own variable and replies "I am A, request #N".
//   Load balancer: hand-made http server, round robin, skips a server whose connection is refused and does not try it again.
//   Client: http module, GET / 6 times (new connection each time); in the stop combination server A is stopped after the 3rd reply.
// Usage: node verify/en/lb_basic_en_probe.js   (result: verify/en/lb_basic_en_probe.out.txt)
// Line shape: setup|stop => a=...|b=...|fail=...|reqs=(per request, split by ;)|memA|memB|refused|turns|sawA|setup
// reqs cell: A#1 = server A replied "request #1", B#2<A refused> = the load balancer was refused by A and sent to B, which replied #2, error ECONNREFUSED = the client got a connection refused error
const http = require('http'), fs = require('fs'), path = require('path');
const N = 6, KILL_AFTER = 3;

// Same text as the code on the screen. The compare script checks that code(c) equals this text.
function screenCode(servers, down) {
  const out = ['# Client: 6 requests to http://localhost:8080/'];
  if (servers === 'lb') {
    out.push('# 8080: load balancer (sends to server A and server B in turn)');
    out.push('# Server A (9001), server B (9002): reply "I am A" and "I am B"');
    out.push('#   The reply also includes the number of requests the server has received');
  } else {
    out.push('# 8080: server A. The client connects directly, with no load balancer');
    out.push('# Server A: replies "I am A"');
    out.push('#   The reply also includes the number of requests the server has received');
  }
  if (down) out.push('# After sending ' + KILL_AFTER + ' requests, stop the server A program');
  return out.join('\n');
}

function startServer(name) {
  return new Promise(resolve => {
    const socks = new Set(), st = { name, count: 0, saw: [] };
    const srv = http.createServer((req, resp) => {
      st.count++; st.saw.push(req.method + ' ' + req.url + ' HTTP/' + req.httpVersion);
      const body = 'I am ' + name + ', request #' + st.count;
      resp.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8', 'Content-Length': Buffer.byteLength(body), 'Connection': 'close' });
      resp.end(body);
    });
    srv.on('connection', s => { socks.add(s); s.on('error', () => {}); s.on('close', () => socks.delete(s)); });
    srv.listen(0, '127.0.0.1', () => resolve({ srv, st, port: srv.address().port, kill: () => new Promise(r => { socks.forEach(s => s.destroy()); srv.close(() => r()); }) }));
  });
}

// Load balancer: for each request pick the starting server in turn; if a connection is refused, mark that server and move on to the next one.
function startLB(targets, log) {
  let rr = 0; const marked = new Set(), socks = new Set();
  return new Promise(resolve => {
    const srv = http.createServer((req, resp) => {
      const start = rr++ % targets.length, order = [];
      for (let i = 0; i < targets.length; i++) order.push(targets[(start + i) % targets.length]);
      const entry = { turn: order[0].name, refused: [], ans: null }; log.push(entry);
      (function tryNext(i) {
        if (i >= order.length) { entry.status = 502; resp.writeHead(502, { 'Content-Type': 'text/plain; charset=utf-8', 'Connection': 'close' }); resp.end('Bad Gateway'); return; }
        const t = order[i];
        if (marked.has(t.name)) { entry.skipped = (entry.skipped || []).concat(t.name); return tryNext(i + 1); }
        const up = http.request({ host: '127.0.0.1', port: t.port, path: req.url, method: req.method, agent: false, headers: { Connection: 'close' } }, ur => {
          const chunks = []; ur.on('data', d => chunks.push(d));
          ur.on('end', () => { entry.ans = t.name; entry.status = ur.statusCode; resp.writeHead(ur.statusCode, { 'Content-Type': ur.headers['content-type'], 'Connection': 'close' }); resp.end(Buffer.concat(chunks)); });
        });
        up.on('error', e => { entry.refused.push(t.name + ':' + (e.code || e.name)); marked.add(t.name); tryNext(i + 1); });
        up.end();
      })(0);
    });
    srv.on('connection', s => { socks.add(s); s.on('error', () => {}); s.on('close', () => socks.delete(s)); });
    srv.listen(0, '127.0.0.1', () => resolve({ srv, port: srv.address().port, close: () => new Promise(r => { socks.forEach(s => s.destroy()); srv.close(() => r()); }) }));
  });
}

function get(port) {
  return new Promise(resolve => {
    const r = http.request({ host: '127.0.0.1', port, path: '/', method: 'GET', agent: false, headers: { Connection: 'close' } }, resp => {
      const chunks = []; resp.on('data', d => chunks.push(d));
      resp.on('end', () => resolve({ status: resp.statusCode, body: Buffer.concat(chunks).toString('utf8') }));
    });
    r.on('error', e => resolve({ err: e.code || e.name }));
    r.setTimeout(3000, () => r.destroy(Object.assign(new Error('timeout'), { code: 'TIMEOUT' })));
    r.end();
  });
}

async function run(servers, down) {
  const A = await startServer('A'), B = servers === 'lb' ? await startServer('B') : null, lbLog = [];
  const lb = servers === 'lb' ? await startLB([{ name: 'A', port: A.port }, { name: 'B', port: B.port }], lbLog) : null;
  const entryPort = lb ? lb.port : A.port;
  const reqs = []; let a = 0, b = 0, fail = 0, killed = false;
  for (let i = 1; i <= N; i++) {
    if (down && i === KILL_AFTER + 1) { await A.kill(); killed = true; }
    const r = await get(entryPort);
    if (r.err) { fail++; reqs.push('error ' + r.err); continue; }
    const m = /^I am ([AB]), request #(\d+)$/.exec(r.body);
    if (r.status !== 200 || !m) { fail++; reqs.push('status ' + r.status + ':' + r.body); continue; }
    if (m[1] === 'A') a++; else b++;
    const lbEntry = lb ? lbLog[lbLog.length - 1] : null;
    reqs.push(m[1] + '#' + m[2] + (lbEntry && lbEntry.refused.length ? '<' + lbEntry.refused.map(x => x.split(':')[0]).join(',') + ' refused>' : ''));
  }
  const refusedAll = lbLog.map((e, i) => e.refused.length ? 'request #' + (i + 1) + ': ' + e.refused.join(',') : null).filter(Boolean);
  const turns = lbLog.map(e => e.turn).join('');
  const line = ['a=' + a, 'b=' + (servers === 'lb' ? b : '(no server B)'), 'fail=' + fail, 'reqs=' + reqs.join(';'), 'memA=' + A.st.count, 'memB=' + (B ? B.st.count : '(no server B)'),
    'refused=' + (refusedAll.length ? refusedAll.join(' / ') : '(none)'), 'turns=' + (lb ? turns : '(no load balancer)'), 'sawA=' + (A.st.saw[0] || '(no request)'),
    'setup=' + (B ? 2 : 1) + (B ? ' servers' : ' server') + '|load balancer ' + (lb ? 'yes' : 'no') + '|' + N + ' requests|stop server A ' + (killed ? 'after request #' + KILL_AFTER : 'no')].join('|');
  if (!killed) await A.kill(); if (B) await B.kill(); if (lb) await lb.close();
  return line;
}

(async () => {
  const out = ['# node ' + process.version + ' · 127.0.0.1 · free ports · http server A (B) and a hand-made load balancer (round robin, skips a refused server) · ' + N + ' requests, stop after reply #' + KILL_AFTER], extra = [];
  for (const servers of ['lb', 'one']) for (const down of [false, true]) {
    const key = servers + '|' + down;
    out.push(key + ' => ' + await run(servers, down));
    extra.push('# code sent ' + key + ' = ' + JSON.stringify(screenCode(servers, down)));
  }
  fs.writeFileSync(path.join(__dirname, 'lb_basic_en_probe.out.txt'), out.join('\n') + '\n' + extra.join('\n') + '\n');
  console.log(out.join('\n') + '\n' + extra.join('\n'));
})();

// English-version probe for the Fundamentals lab "Message queues" (queue_basic). Same as verify/net/queue_basic_probe.js, with the English screen text and English event names.
// Runs all 4 combinations (how the order is sent 2 x state of the notification server 2) for real, only inside 127.0.0.1. Nothing is downloaded; every server uses a free port (port 0) and is closed at the end.
//  - A very small queue server written for this lab: one array in memory, only two requests (put: POST /put, take: POST /take). It is not a real message queue product (Kafka, RabbitMQ).
//  - This file builds (screenText) and reads (parseScreen) the same text as the "code" on the screen, and decides what to start from its content.
//  - Order server: sends 3 orders one after another (the next after the result of the previous one), either to the queue (POST /put) or straight to the notification server (POST /notify).
//  - Notification server: an http server that receives direct requests, or a loop that takes one message at a time from the queue (POST /take). Handling one notification takes WORK ms.
//    "Stopped, then starts later" means it is started after the results of all 3 orders were received. Before that nothing waits at that port.
// Usage: node verify/en/queue_basic_en_probe.js   (result: verify/en/queue_basic_en_probe.out.txt)
// Line shape: via|consumer => JSON.   Lines that start with # are comments.
const http = require('http'), net = require('net'), fs = require('fs'), path = require('path');
const WORK = 300;        // time to handle one notification (ms)
const POLL = 100;        // interval (ms) at which the notification server looks into the queue; after it starts it first waits this long before the first look

// ---------- text of the code on the screen ----------
function screenText(via, consumer) {
  const L = [];
  if (via === 'queue') L.push('# Order server: for each of the 3 orders, puts a "Notify order N" message in the queue', '# Queue: keeps the messages in the order they were put in', '# Notification server: takes them out of the queue one at a time and handles them');
  else L.push('# Order server: for each of the 3 orders, sends a "Notify order N" request straight to the notification server', '# Notification server: handles the requests it receives one at a time');
  if (consumer === 'late') L.push('# Notification server: stopped while the 3 orders are sent, then starts later');
  return L.join('\n');
}
function parseScreen(text) {
  const r = { mode: null, count: 0, tmpl: null, queue: false, notifyKind: null, late: false };
  for (const l of text.split('\n')) {
    let m = /^# Order server: for each of the (\d+) orders, (?:puts|sends) a "(Notify order N)" (message in the queue|request straight to the notification server)$/.exec(l);
    if (m) { r.count = +m[1]; r.tmpl = m[2]; r.mode = m[3].startsWith('message') ? 'queue' : 'direct'; }
    if (l === '# Queue: keeps the messages in the order they were put in') r.queue = true;
    if (l === '# Notification server: takes them out of the queue one at a time and handles them') r.notifyKind = 'take';
    if (l === '# Notification server: handles the requests it receives one at a time') r.notifyKind = 'serve';
    if (l === '# Notification server: stopped while the 3 orders are sent, then starts later') r.late = true;
  }
  return r;
}

// ---------- helpers ----------
const sleep = ms => new Promise(r => setTimeout(r, ms));
const listen = srv => new Promise(res => srv.listen(0, '127.0.0.1', () => res(srv.address().port)));
const closeSrv = srv => new Promise(r => { srv.close(() => r()); srv.closeAllConnections(); });
const deadPort = () => new Promise(res => { const s = net.createServer(); s.listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => res(p)); }); });
function post(port, p, body) {
  return new Promise(resolve => {
    const b = Buffer.from(body || '', 'utf8');
    const req = http.request({ host: '127.0.0.1', port, path: p, method: 'POST', agent: false, headers: { 'Content-Length': b.length, Connection: 'close' } }, res => {
      const ch = []; res.on('data', d => ch.push(d));
      res.on('end', () => resolve({ ok: true, status: res.statusCode, body: Buffer.concat(ch).toString('utf8') }));
      res.on('error', e => resolve({ ok: false, errCode: e.code || e.name }));
    });
    req.on('error', e => resolve({ ok: false, errCode: e.code || e.name }));
    req.setTimeout(5000, () => req.destroy(Object.assign(new Error('timeout'), { code: 'TIMEOUT' })));
    req.end(b);
  });
}
const readBody = req => new Promise(r => { const ch = []; req.on('data', d => ch.push(d)); req.on('end', () => r(Buffer.concat(ch).toString('utf8'))); });

async function runCombo(via, consumer) {
  const text = screenText(via, consumer), scr = parseScreen(text);
  const T0 = Date.now(), log = [], mark = (k, v) => log.push({ k, v, t: Date.now() - T0 });
  const servers = [];
  // Queue server (started only when the screen has a queue line)
  const Q = { items: [], puts: [], takes: [], port: null };
  if (scr.queue) {
    const srv = http.createServer(async (req, res) => {
      const body = await readBody(req);
      if (req.method === 'POST' && req.url === '/put') { Q.items.push(body); Q.puts.push(body); mark('queue put', body); res.writeHead(200, { Connection: 'close' }); res.end('ok'); }
      else if (req.method === 'POST' && req.url === '/take') {
        if (Q.items.length) { const m = Q.items.shift(); Q.takes.push(m); mark('queue take', m); const b = Buffer.from(m, 'utf8'); res.writeHead(200, { 'Content-Length': b.length, Connection: 'close' }); res.end(b); }
        else { res.writeHead(204, { Connection: 'close' }); res.end(); }
      } else { res.writeHead(404, { Connection: 'close' }); res.end(); }
    });
    Q.port = await listen(srv); servers.push(srv);
  }
  // Notification server
  const N = { processed: [], port: null, started: false, running: false, queueAtStart: null, startedAt: null };
  let notifySrv = null;
  const startNotify = async () => {
    N.started = true; N.startedAt = Date.now() - T0; N.queueAtStart = scr.queue ? Q.items.length : null; mark('notification server started', '');
    if (scr.notifyKind === 'serve') {
      notifySrv = http.createServer(async (req, res) => {
        const body = await readBody(req);
        mark('handling start', body); await sleep(WORK); N.processed.push(body); mark('handling end', body);
        res.writeHead(200, { Connection: 'close' }); res.end('done');
      });
      await new Promise(r => notifySrv.listen(N.port, '127.0.0.1', r)); servers.push(notifySrv);
    } else {
      N.running = true;
      (async () => {
        while (N.running) {
          await sleep(POLL);
          const r = await post(Q.port, '/take');
          if (r.ok && r.status === 200) { mark('handling start', r.body); await sleep(WORK); N.processed.push(r.body); mark('handling end', r.body); }
        }
      })();
    }
  };
  // For direct requests the same port number is used before the notification server starts; before that nothing waits at that port.
  if (scr.notifyKind === 'serve') N.port = await deadPort();
  if (!scr.late) await startNotify();
  // Order server: sends the orders one after another
  const results = [];
  for (let i = 1; i <= scr.count; i++) {
    const msg = scr.tmpl.replace(/ N$/, ' ' + i), t = Date.now();
    mark('order server sent', msg);
    const r = scr.mode === 'queue' ? await post(Q.port, '/put', msg) : await post(N.port, '/notify', msg);
    const ok = r.ok && r.status === 200;
    results.push({ msg, ok, errCode: r.ok ? '(none)' : r.errCode, ms: Date.now() - t });
    mark('order server got result', msg + (ok ? ' success' : ' failure'));
  }
  const queueAfterOrders = scr.queue ? Q.items.length : null;
  // When it starts later: start it after the results of all 3 orders were received
  if (scr.late) { await sleep(100); await startNotify(); }
  // Wait for handling: up to 4s if something will be handled, 1s more if nothing will be (all direct requests failed).
  const expectMore = scr.mode === 'queue' || results.some(r => r.ok);
  const until = Date.now() + (expectMore ? 4000 : 1000);
  while (Date.now() < until) {
    if (expectMore && N.processed.length >= scr.count) { await sleep(150); break; }   // look a little longer to see that nothing more is handled
    await sleep(25);
  }
  N.running = false; await sleep(POLL * 2);
  for (const s of servers) await closeSrv(s);
  return {
    text, listens: { queue: !!scr.queue, notifyKind: scr.notifyKind, late: scr.late },
    results, processed: N.processed, processedCount: N.processed.length,
    queueAfterOrders, queueAtNotifyStart: N.queueAtStart, queueLeft: scr.queue ? Q.items.length : null,
    puts: Q.puts, takes: Q.takes, log,
  };
}

(async () => {
  const out = ['# node ' + process.version + ' · ' + process.platform + ' · only inside 127.0.0.1 · the queue is a small http server written for this lab (put /put, take /take) · handling one notification ' + WORK + 'ms · format: via|consumer => JSON'];
  for (const via of ['queue', 'direct']) for (const consumer of ['up', 'late']) {
    const r = await runCombo(via, consumer);
    out.push([via, consumer].join('|') + ' => ' + JSON.stringify(r));
  }
  fs.writeFileSync(path.join(__dirname, 'queue_basic_en_probe.out.txt'), out.join('\n') + '\n');
  console.log(out.join('\n'));
})().catch(e => { console.error(e); process.exit(1); });

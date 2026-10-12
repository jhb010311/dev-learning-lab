// English-version probe for the Fundamentals lab "Deployment" (deploy_basic). Same as verify/net/deploy_basic_probe.js, with the English to-do list and the English version names.
// Runs all combinations (edit the source 2 x start again 2 x when to request 2; without starting again the request time is meaningless, so 6 in practice) for real.
// Server: for each combination it writes server.js into a folder (verify/out/deploy_basic_en/<combination>/) and really starts `node server.js <port>` as a child process.
//         server.js reads `const answer = 'Version 1'` when it starts and answers that value to a request. For /running it answers the process id and the value it holds.
// The to-do list on the screen (the code) is run line by line as it is: start = start a child process, edit the source file = really rewrite server.js,
//         stop = end the child process, send a request = GET /hello with the http module. A free port is taken once and the same port is used within one combination after stopping and starting.
// Usage: node verify/en/deploy_basic_en_probe.js     (result: verify/en/deploy_basic_en_probe.out.txt)
// Line shape: edit|restart|when => response=answer to the request|running=value held by the live process at request time|disk=value in the file on disk at request time|sameProc=whether the process that answered is the first process|afterEditRunning=value held by the first process just after the edit (before stop/start)|later=answer to one more request sent after all the to-do items|starts=number of starts|finalDisk=...
const cp = require('child_process'), http = require('http'), net = require('net'), fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..', 'out', 'deploy_basic_en');
const live = new Set();   // child processes started: all are ended at the end
const sleep = ms => new Promise(r => setTimeout(r, ms));

const SERVER = [
  "const http = require('http');",
  "const answer = 'Version 1';",
  "http.createServer((req, res) => {",
  "  res.setHeader('content-type', 'text/plain; charset=utf-8');",
  "  if (req.url === '/running') res.end(JSON.stringify({ pid: process.pid, answer: answer }));",
  "  else res.end(answer);",
  "}).listen(+process.argv[2], '127.0.0.1', () => console.log('listening'));",
].join('\n') + '\n';

// the same to-do list as on the screen (the compare script checks it against lesson.code)
const L1 = '# 1. Start the server (its code answers "Version 1")', L2 = '# 2. Change "Version 1" to "Version 2" in the source file';
function script(edit, restart, when) {
  const out = [L1];
  if (edit) out.push(L2);
  if (restart) {
    if (when === 'during') out.push('# 3. Stop the server', '# 4. Send a request', '# 5. Start the server again');
    else out.push('# 3. Stop and start the server', '# 4. Send a request');
  } else out.push('# 4. Send a request');
  return out.join('\n');
}
// line -> what it really does. The line that stops and starts the server is two jobs.
const OPS = {
  [L1]: ['start'], [L2]: ['edit'], '# 3. Stop the server': ['stop'], '# 4. Send a request': ['request'], '# 5. Start the server again': ['start'], '# 3. Stop and start the server': ['stop', 'start'],
};

function freePort() { return new Promise(r => { const s = net.createServer(); s.listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => r(p)); }); }); }
function startProc(dir, port) {
  return new Promise((resolve, reject) => {
    const ch = cp.spawn(process.execPath, ['server.js', String(port)], { cwd: dir, stdio: ['ignore', 'pipe', 'pipe'] });
    live.add(ch); ch.on('exit', () => live.delete(ch));
    let err = '';
    ch.stderr.on('data', d => { err += d; });
    ch.stdout.on('data', d => { if (String(d).includes('listening')) resolve(ch); });
    ch.on('exit', code => reject(new Error('the server could not start, code=' + code + ' ' + err)));
  });
}
function stopProc(ch) { return new Promise(r => { if (ch.exitCode !== null || ch.signalCode) return r(); ch.once('exit', () => r()); ch.kill(); }); }
// GET -> { ok, body } or { ok:false, code }. Connections are not reused (agent: false)
function get(port, p) {
  return new Promise(resolve => {
    const req = http.request({ host: '127.0.0.1', port, path: p, method: 'GET', agent: false }, res => {
      const chunks = []; res.on('data', d => chunks.push(d)); res.on('end', () => resolve({ ok: true, body: Buffer.concat(chunks).toString('utf8') }));
    });
    req.on('error', e => resolve({ ok: false, code: e.code || e.name }));
    req.setTimeout(3000, () => { req.destroy(); });
    req.end();
  });
}
const readDisk = file => /const answer = '([^']*)'/.exec(fs.readFileSync(file, 'utf8'))[1];

async function runCombo(edit, restart, when) {
  const key = [edit, restart, when].join('|'), dir = path.join(ROOT, key.replace(/\|/g, '_')), file = path.join(dir, 'server.js');
  fs.mkdirSync(dir, { recursive: true }); fs.writeFileSync(file, SERVER);
  const port = await freePort(), code = script(edit, restart, when), f = { starts: 0 };
  let cur = null, first = null, pidFirst = null;
  const rec = {};
  for (const line of code.split('\n')) for (const op of OPS[line]) {
    if (op === 'start') { cur = await startProc(dir, port); f.starts++; if (!first) { first = cur; pidFirst = cur.pid; } }
    else if (op === 'edit') {
      fs.writeFileSync(file, fs.readFileSync(file, 'utf8').replace("'Version 1'", "'Version 2'"));
      await sleep(500);   // even after waiting a little after the edit, check whether the running process changes
      const r = await get(port, '/running'); rec.afterEditRunning = r.ok ? JSON.parse(r.body).answer : '(' + r.code + ')';
    }
    else if (op === 'stop') { await stopProc(cur); cur = null; }
    else if (op === 'request') {
      const r = await get(port, '/hello');
      rec.response = r.ok ? r.body : '(connection refused:' + r.code + ')';
      rec.disk = readDisk(file);
      const run = cur ? await get(port, '/running') : null;
      rec.running = run ? JSON.parse(run.body).answer : '(no process)';
      rec.sameProc = run ? String(JSON.parse(run.body).pid === pidFirst) : '(not applicable)';
    }
  }
  // send one more request after all the to-do items (for the combination that requested while the server was stopped, to see the answer after it started again)
  const lr = cur ? await get(port, '/hello') : { ok: false, code: 'NOPROC' };
  rec.later = lr.ok ? lr.body : '(' + lr.code + ')';
  if (cur) await stopProc(cur);
  const nowDisk = readDisk(file);
  return { key, code, line: key + ' => ' + ['response=' + rec.response, 'running=' + rec.running, 'disk=' + rec.disk, 'sameProc=' + rec.sameProc, 'afterEditRunning=' + (rec.afterEditRunning || '(not edited)'), 'later=' + rec.later, 'starts=' + f.starts, 'finalDisk=' + nowDisk].join('|') };
}

(async () => {
  const out = ['# node ' + process.version + ' · 127.0.0.1 · for each combination server.js is written, node server.js is started as a child process and stopped and started · the http client sends GET /hello'], extra = [];
  const seen = new Set();
  try {
    for (const edit of [true, false]) for (const restart of [true, false]) for (const when of ['after', 'during']) {
      if (!restart && when === 'during') continue;   // if the server is not started again, the request time is meaningless (the lab merges them into the same setting)
      const r = await runCombo(edit, restart, when);
      out.push(r.line); extra.push('# code run ' + r.key + ' = ' + JSON.stringify(r.code));
    }
  } finally {
    for (const ch of [...live]) { try { ch.kill(); } catch (e) {} }
  }
  await sleep(200);
  out.push('# remaining child processes ' + live.size);
  fs.writeFileSync(path.join(__dirname, 'deploy_basic_en_probe.out.txt'), out.join('\n') + '\n' + extra.join('\n') + '\n');
  console.log(out.join('\n') + '\n' + extra.join('\n'));
})().catch(e => { console.error(e); for (const ch of live) { try { ch.kill(); } catch (x) {} } process.exit(1); });

// 기초개념 "배포" 실습의 모든 설정 조합(소스 고치기 2 × 다시 켜기 2 × 요청 때 2, 다시 켜지 않으면 요청 때는 의미가 없으므로 실제로는 6가지)을 실제로 실행한다.
// 서버: 조합마다 폴더(verify/out/deploy_basic/<조합>/)에 server.js 파일을 쓰고, `node server.js <포트>`를 자식 프로세스로 실제로 띄운다.
//       server.js는 시작할 때 `const answer = '버전 1'`을 읽어 들이고, 요청이 오면 그 값을 답한다. /running 요청에는 프로세스 번호와 자기가 가진 값을 답한다.
// 화면의 코드(할 일 목록)를 줄 단위로 그대로 실행한다: 켠다 = 자식 프로세스 시작, 소스 파일을 고친다 = server.js를 실제로 다시 쓴다,
//       끈다 = 자식 프로세스를 끝낸다, 요청을 보낸다 = http 모듈로 GET /hello. 포트는 빈 포트를 한 번 잡아 한 조합 안에서는 껐다 켜도 같은 포트를 쓴다.
// 사용: node verify/net/deploy_basic_probe.js     결과는 verify/net/deploy_basic_probe.out.txt에 쓴다.
// 한 줄의 모양: 소스 고치기|다시 켜기|요청 때 => response=요청에 온 답|running=요청 때 살아 있는 프로세스가 가진 값|disk=요청 때 디스크 파일의 값|sameProc=요청에 답한 프로세스가 처음 켠 프로세스인가|afterEditRunning=고친 직후(껐다 켜기 전) 처음 프로세스가 가진 값|later=할 일을 모두 마친 뒤 한 번 더 보낸 요청의 답|pids=켠 프로세스 수|starts=...
const cp = require('child_process'), http = require('http'), net = require('net'), fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..', 'out', 'deploy_basic');
const live = new Set();   // 띄운 자식 프로세스: 끝날 때 모두 끝낸다
const sleep = ms => new Promise(r => setTimeout(r, ms));

const SERVER = [
  "const http = require('http');",
  "const answer = '버전 1';",
  "http.createServer((req, res) => {",
  "  res.setHeader('content-type', 'text/plain; charset=utf-8');",
  "  if (req.url === '/running') res.end(JSON.stringify({ pid: process.pid, answer: answer }));",
  "  else res.end(answer);",
  "}).listen(+process.argv[2], '127.0.0.1', () => console.log('listening'));",
].join('\n') + '\n';

// 화면의 코드와 같은 할 일 목록 (cmp가 lesson.code와 견준다)
const L1 = '# 1. 서버를 켠다 (코드: "버전 1"을 답한다)', L2 = '# 2. 소스 파일의 "버전 1"을 "버전 2"로 고친다';
function script(edit, restart, when) {
  const out = [L1];
  if (edit) out.push(L2);
  if (restart) {
    if (when === 'during') out.push('# 3. 서버를 끈다', '# 4. 요청을 보낸다', '# 5. 서버를 다시 켠다');
    else out.push('# 3. 서버를 끄고 다시 켠다', '# 4. 요청을 보낸다');
  } else out.push('# 4. 요청을 보낸다');
  return out.join('\n');
}
// 줄 → 실제로 하는 일. 서버를 끄고 다시 켜는 줄은 두 일이다.
const OPS = {
  [L1]: ['start'], [L2]: ['edit'], '# 3. 서버를 끈다': ['stop'], '# 4. 요청을 보낸다': ['request'], '# 5. 서버를 다시 켠다': ['start'], '# 3. 서버를 끄고 다시 켠다': ['stop', 'start'],
};

function freePort() { return new Promise(r => { const s = net.createServer(); s.listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => r(p)); }); }); }
function startProc(dir, port) {
  return new Promise((resolve, reject) => {
    const ch = cp.spawn(process.execPath, ['server.js', String(port)], { cwd: dir, stdio: ['ignore', 'pipe', 'pipe'] });
    live.add(ch); ch.on('exit', () => live.delete(ch));
    let err = '';
    ch.stderr.on('data', d => { err += d; });
    ch.stdout.on('data', d => { if (String(d).includes('listening')) resolve(ch); });
    ch.on('exit', code => reject(new Error('서버가 켜지지 못함 code=' + code + ' ' + err)));
  });
}
function stopProc(ch) { return new Promise(r => { if (ch.exitCode !== null || ch.signalCode) return r(); ch.once('exit', () => r()); ch.kill(); }); }
// GET → { ok, body } 또는 { ok:false, code }. 연결을 재사용하지 않는다(agent: false)
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
      fs.writeFileSync(file, fs.readFileSync(file, 'utf8').replace("'버전 1'", "'버전 2'"));
      await sleep(500);   // 고친 뒤 잠시 기다려도 실행 중인 프로세스가 바뀌는지 본다
      const r = await get(port, '/running'); rec.afterEditRunning = r.ok ? JSON.parse(r.body).answer : '(' + r.code + ')';
    }
    else if (op === 'stop') { await stopProc(cur); cur = null; }
    else if (op === 'request') {
      const r = await get(port, '/hello');
      rec.response = r.ok ? r.body : '(연결 거부:' + r.code + ')';
      rec.disk = readDisk(file);
      const run = cur ? await get(port, '/running') : null;
      rec.running = run ? JSON.parse(run.body).answer : '(프로세스 없음)';
      rec.sameProc = run ? String(JSON.parse(run.body).pid === pidFirst) : '(해당 없음)';
    }
  }
  // 할 일을 마친 뒤 한 번 더 요청 (껐다 켠 사이에 보낸 경우 다시 켠 뒤의 답을 보려는 것)
  const lr = cur ? await get(port, '/hello') : { ok: false, code: 'NOPROC' };
  rec.later = lr.ok ? lr.body : '(' + lr.code + ')';
  if (cur) await stopProc(cur);
  const nowDisk = readDisk(file);
  return { key, code, line: key + ' => ' + ['response=' + rec.response, 'running=' + rec.running, 'disk=' + rec.disk, 'sameProc=' + rec.sameProc, 'afterEditRunning=' + (rec.afterEditRunning || '(고치지 않음)'), 'later=' + rec.later, 'starts=' + f.starts, 'finalDisk=' + nowDisk].join('|') };
}

(async () => {
  const out = ['# node ' + process.version + ' · 127.0.0.1 · 조합마다 server.js를 쓰고 node server.js를 자식 프로세스로 띄워 껐다 켬 · http 클라이언트가 GET /hello'], extra = [];
  const seen = new Set();
  try {
    for (const edit of [true, false]) for (const restart of [true, false]) for (const when of ['after', 'during']) {
      if (!restart && when === 'during') continue;   // 다시 켜지 않으면 요청 때는 의미가 없다 (실습도 같은 설정으로 합친다)
      const r = await runCombo(edit, restart, when);
      out.push(r.line); extra.push('# 실행한 코드 ' + r.key + ' = ' + JSON.stringify(r.code));
    }
  } finally {
    for (const ch of [...live]) { try { ch.kill(); } catch (e) {} }
  }
  await sleep(200);
  out.push('# 남은 자식 프로세스 ' + live.size + '개');
  fs.writeFileSync(path.join(__dirname, 'deploy_basic_probe.out.txt'), out.join('\n') + '\n' + extra.join('\n') + '\n');
  console.log(out.join('\n') + '\n' + extra.join('\n'));
})().catch(e => { console.error(e); for (const ch of live) { try { ch.kill(); } catch (x) {} } process.exit(1); });

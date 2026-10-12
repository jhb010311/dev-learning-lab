// 기초개념 "로드 밸런서" 실습의 모든 설정 조합(서버 구성 2 × 서버 A 끄기 2 = 4)을 실제로 실행한다.
// 구성: 서버 A(와 서버 B)는 Node.js의 http 서버로, 받은 요청 수를 자기 메모리의 변수에 세고 "나는 A, 받은 요청 N번째"를 답한다.
//       로드 밸런서는 http 서버로 직접 만든 것으로, 요청이 올 때마다 서버 목록을 번갈아(A, B, A, B...) 돌며 한 대에 새 연결로 전달하고,
//       연결이 거부된 서버는 건너뛰어 다음 서버에 같은 요청을 보내며, 한 번 거부된 서버는 다시 시도하지 않는다.
//       클라이언트는 http 모듈로 GET / 요청을 6번 차례로 보내고(요청마다 새 연결), 끈다는 조합에서는 3번째 답을 받은 뒤 서버 A를 끈다(listen 소켓과 연결을 닫음).
//       화면의 8080, 9001, 9002 대신 모두 포트 0(빈 포트)으로 띄운다. 127.0.0.1에서만 열고, 끝나면 모두 닫는다.
// 사용: node verify/net/lb_basic_probe.js     결과는 verify/net/lb_basic_probe.out.txt에 쓴다.
// 한 줄의 모양: 구성|끄기 => a=서버 A가 답한 수|b=서버 B가 답한 수|fail=실패한 요청 수|reqs=요청 6번 각각의 결과(;로 나눔)|memA=서버 A가 메모리에 센 수|memB=...|refused=로드 밸런서가 연결을 거부당한 기록|setup=띄운 구성
// reqs의 한 칸: A#1 = 서버 A가 "받은 요청 1번째"라고 답함, B#2<A거부> = 로드 밸런서가 A에서 연결 거부를 당하고 B에 보내 B가 2번째라고 답함, 오류ECONNREFUSED = 클라이언트가 연결 거부 오류를 받음
// '# 보낸 코드'는 화면에 보이는 코드(cmp가 lesson.code와 견준다)이고 이 구성으로 띄웠다는 뜻이다.
const http = require('http'), fs = require('fs'), path = require('path');
const N = 6, KILL_AFTER = 3;

// 화면의 코드와 같은 글. 화면의 code(c)와 이 글이 같은지 cmp가 확인한다.
function screenCode(servers, down) {
  const out = ['# 클라이언트: http://localhost:8080/ 로 요청 ' + N + '번'];
  if (servers === 'lb') {
    out.push('# 8080: 로드 밸런서 (서버 A, 서버 B에 번갈아 보낸다)');
    out.push('# 서버 A(9001), 서버 B(9002): "나는 A", "나는 B"라고 답한다');
    out.push('#   답에는 자기가 받은 요청 수도 적는다');
  } else {
    out.push('# 8080: 서버 A. 로드 밸런서 없이 클라이언트가 직접 접속한다');
    out.push('# 서버 A: "나는 A"라고 답한다');
    out.push('#   답에는 자기가 받은 요청 수도 적는다');
  }
  if (down) out.push('# 요청 ' + KILL_AFTER + '번을 보낸 뒤 서버 A 프로그램을 끈다');
  return out.join('\n');
}

function startServer(name) {
  return new Promise(resolve => {
    const socks = new Set(), st = { name, count: 0, saw: [] };
    const srv = http.createServer((req, resp) => {
      st.count++; st.saw.push(req.method + ' ' + req.url + ' HTTP/' + req.httpVersion);
      const body = '나는 ' + name + ', 받은 요청 ' + st.count + '번째';
      resp.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8', 'Content-Length': Buffer.byteLength(body), 'Connection': 'close' });
      resp.end(body);
    });
    srv.on('connection', s => { socks.add(s); s.on('error', () => {}); s.on('close', () => socks.delete(s)); });
    srv.listen(0, '127.0.0.1', () => resolve({ srv, st, port: srv.address().port, kill: () => new Promise(r => { socks.forEach(s => s.destroy()); srv.close(() => r()); }) }));
  });
}

// 로드 밸런서: 요청마다 번갈아 시작할 서버를 정하고, 연결이 거부되면 표시해 두고 다음 서버로 넘어간다.
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
    if (r.err) { fail++; reqs.push('오류' + r.err); continue; }
    const m = /^나는 ([AB]), 받은 요청 (\d+)번째$/.exec(r.body);
    if (r.status !== 200 || !m) { fail++; reqs.push('상태' + r.status + ':' + r.body); continue; }
    if (m[1] === 'A') a++; else b++;
    const lbEntry = lb ? lbLog[lbLog.length - 1] : null;
    reqs.push(m[1] + '#' + m[2] + (lbEntry && lbEntry.refused.length ? '<' + lbEntry.refused.map(x => x.split(':')[0]).join(',') + '거부>' : ''));
  }
  const refusedAll = lbLog.map((e, i) => e.refused.length ? (i + 1) + '번째 요청: ' + e.refused.join(',') : null).filter(Boolean);
  const turns = lbLog.map(e => e.turn).join('');
  const line = ['a=' + a, 'b=' + (servers === 'lb' ? b : '(서버 B 없음)'), 'fail=' + fail, 'reqs=' + reqs.join(';'), 'memA=' + A.st.count, 'memB=' + (B ? B.st.count : '(서버 B 없음)'),
    'refused=' + (refusedAll.length ? refusedAll.join(' / ') : '(없음)'), 'turns=' + (lb ? turns : '(로드 밸런서 없음)'), 'sawA=' + (A.st.saw[0] || '(요청 없음)'),
    'setup=서버 ' + (B ? 2 : 1) + '대|로드 밸런서 ' + (lb ? '있음' : '없음') + '|요청 ' + N + '번|서버 A 끄기 ' + (killed ? '요청 ' + KILL_AFTER + '번 뒤' : '안 함')].join('|');
  if (!killed) await A.kill(); if (B) await B.kill(); if (lb) await lb.close();
  return line;
}

(async () => {
  const out = ['# node ' + process.version + ' · 127.0.0.1 · 빈 포트 · http 서버 A(B)와 직접 만든 로드 밸런서(번갈아, 거부된 서버는 건너뜀) · 요청 ' + N + '번, 끄기는 ' + KILL_AFTER + '번째 답 뒤'], extra = [];
  for (const servers of ['lb', 'one']) for (const down of [false, true]) {
    const key = servers + '|' + down;
    out.push(key + ' => ' + await run(servers, down));
    extra.push('# 보낸 코드 ' + key + ' = ' + JSON.stringify(screenCode(servers, down)));
  }
  fs.writeFileSync(path.join(__dirname, 'lb_basic_probe.out.txt'), out.join('\n') + '\n' + extra.join('\n') + '\n');
  console.log(out.join('\n') + '\n' + extra.join('\n'));
})();

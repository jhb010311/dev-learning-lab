// 기초개념 "메시지 큐" 실습의 모든 설정 조합(보내는 방식 2 x 알림 서버 상태 2 = 4)을 127.0.0.1 안에서만 실제로 실행한다.
// 사용: node verify/net/queue_basic_probe.js      결과는 verify/net/queue_basic_probe.out.txt에 쓴다.
// 외부 네트워크는 쓰지 않는다. 새로 내려받는 것은 없다. 서버는 모두 포트 0(빈 포트)에 띄우고 끝나면 닫는다.
//  - 이 실습을 위해 쓴 아주 작은 큐 서버: 메모리의 배열 하나, 요청은 넣기(POST /put)와 꺼내기(POST /take) 두 가지뿐이다.
//    실제 메시지 큐 제품(Kafka, RabbitMQ)이 아니다.
//  - 화면의 "코드"와 같은 글자를 이 파일이 만들어(screenText) 읽고(parseScreen) 그 내용대로 무엇을 띄울지 정한다.
//  - 주문 서버: 주문 3건을 차례로 보낸다(앞 주문의 결과를 받은 뒤 다음 주문). 큐에 넣거나(POST /put) 알림 서버에 직접 요청한다(POST /notify).
//  - 알림 서버: 직접 요청을 받는 http 서버이거나, 큐에서 하나씩 꺼내는(POST /take) 반복. 알림 하나를 처리하는 데 WORK ms가 걸리게 했다.
//    "꺼져 있다가 나중에 켜진다"면 주문 3건의 결과를 모두 받은 뒤에 켠다. 켜기 전에는 그 번호에서 기다리는 프로그램이 없다.
// 한 줄의 모양: 보내는 방식|알림 서버 상태 => JSON.   '#'로 시작하는 줄은 설명이다.
const http = require('http'), net = require('net'), fs = require('fs'), path = require('path');
const WORK = 300;        // 알림 하나를 처리하는 데 걸리는 시간(ms)
const POLL = 100;        // 알림 서버가 큐를 들여다보는 간격(ms). 켜진 뒤 먼저 이만큼 기다렸다가 처음 들여다본다

// ---------- 화면의 코드 글자 ----------
function screenText(via, consumer) {
  const L = [];
  if (via === 'queue') L.push('# 주문 서버: 주문 3건마다 "주문 N 알림" 메시지를 큐에 넣는다', '# 큐: 메시지를 넣은 차례대로 보관한다', '# 알림 서버: 큐에서 하나씩 꺼내 처리한다');
  else L.push('# 주문 서버: 주문 3건마다 "주문 N 알림" 요청을 알림 서버에 직접 보낸다', '# 알림 서버: 받은 요청을 하나씩 처리한다');
  if (consumer === 'late') L.push('# 알림 서버: 주문 3건을 보내는 동안 꺼져 있다가 나중에 켜진다');
  return L.join('\n');
}
function parseScreen(text) {
  const r = { mode: null, count: 0, tmpl: null, queue: false, notifyKind: null, late: false };
  for (const l of text.split('\n')) {
    let m = /^# 주문 서버: 주문 (\d+)건마다 "(주문 N 알림)" (메시지를 큐에 넣는다|요청을 알림 서버에 직접 보낸다)$/.exec(l);
    if (m) { r.count = +m[1]; r.tmpl = m[2]; r.mode = m[3].startsWith('메시지') ? 'queue' : 'direct'; }
    if (l === '# 큐: 메시지를 넣은 차례대로 보관한다') r.queue = true;
    if (l === '# 알림 서버: 큐에서 하나씩 꺼내 처리한다') r.notifyKind = 'take';
    if (l === '# 알림 서버: 받은 요청을 하나씩 처리한다') r.notifyKind = 'serve';
    if (l === '# 알림 서버: 주문 3건을 보내는 동안 꺼져 있다가 나중에 켜진다') r.late = true;
  }
  return r;
}

// ---------- 도우미 ----------
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
  // 큐 서버 (화면에 큐 줄이 있을 때만 띄운다)
  const Q = { items: [], puts: [], takes: [], port: null };
  if (scr.queue) {
    const srv = http.createServer(async (req, res) => {
      const body = await readBody(req);
      if (req.method === 'POST' && req.url === '/put') { Q.items.push(body); Q.puts.push(body); mark('큐에 넣음', body); res.writeHead(200, { Connection: 'close' }); res.end('ok'); }
      else if (req.method === 'POST' && req.url === '/take') {
        if (Q.items.length) { const m = Q.items.shift(); Q.takes.push(m); mark('큐에서 꺼냄', m); const b = Buffer.from(m, 'utf8'); res.writeHead(200, { 'Content-Length': b.length, Connection: 'close' }); res.end(b); }
        else { res.writeHead(204, { Connection: 'close' }); res.end(); }
      } else { res.writeHead(404, { Connection: 'close' }); res.end(); }
    });
    Q.port = await listen(srv); servers.push(srv);
  }
  // 알림 서버
  const N = { processed: [], port: null, started: false, running: false, queueAtStart: null, startedAt: null };
  let notifySrv = null;
  const startNotify = async () => {
    N.started = true; N.startedAt = Date.now() - T0; N.queueAtStart = scr.queue ? Q.items.length : null; mark('알림 서버 켜짐', '');
    if (scr.notifyKind === 'serve') {
      notifySrv = http.createServer(async (req, res) => {
        const body = await readBody(req);
        mark('알림 처리 시작', body); await sleep(WORK); N.processed.push(body); mark('알림 처리 끝', body);
        res.writeHead(200, { Connection: 'close' }); res.end('done');
      });
      await new Promise(r => notifySrv.listen(N.port, '127.0.0.1', r)); servers.push(notifySrv);
    } else {
      N.running = true;
      (async () => {
        while (N.running) {
          await sleep(POLL);
          const r = await post(Q.port, '/take');
          if (r.ok && r.status === 200) { mark('알림 처리 시작', r.body); await sleep(WORK); N.processed.push(r.body); mark('알림 처리 끝', r.body); }
        }
      })();
    }
  };
  // 알림 서버가 번호를 쓰는 쪽(직접 요청)은 켜기 전에도 같은 번호로 요청이 간다. 켜기 전에는 그 번호에서 기다리는 프로그램이 없다.
  if (scr.notifyKind === 'serve') N.port = await deadPort();
  if (!scr.late) await startNotify();
  // 주문 서버: 주문을 차례로 보낸다
  const results = [];
  for (let i = 1; i <= scr.count; i++) {
    const msg = scr.tmpl.replace('N', String(i)), t = Date.now();
    mark('주문 서버가 보냄', msg);
    const r = scr.mode === 'queue' ? await post(Q.port, '/put', msg) : await post(N.port, '/notify', msg);
    const ok = r.ok && r.status === 200;
    results.push({ msg, ok, errCode: r.ok ? '(없음)' : r.errCode, ms: Date.now() - t });
    mark('주문 서버가 결과를 받음', msg + (ok ? ' 성공' : ' 실패'));
  }
  const queueAfterOrders = scr.queue ? Q.items.length : null;
  // 나중에 켜지는 경우: 주문 3건의 결과를 받은 뒤에 켠다
  if (scr.late) { await sleep(100); await startNotify(); }
  // 처리를 기다린다. 처리될 것이 있으면 최대 4초, 처리될 것이 없으면(직접 요청이 모두 실패) 1초를 더 지켜본다.
  const expectMore = scr.mode === 'queue' || results.some(r => r.ok);
  const until = Date.now() + (expectMore ? 4000 : 1000);
  while (Date.now() < until) {
    if (expectMore && N.processed.length >= scr.count) { await sleep(150); break; }   // 더 처리되는 것이 없는지 잠깐 더 본다
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
  const out = ['# node ' + process.version + ' · ' + process.platform + ' · 127.0.0.1 안에서만 · 큐는 이 실습을 위해 쓴 작은 http 서버(넣기 /put, 꺼내기 /take) · 알림 하나 처리 ' + WORK + 'ms · 형식: 보내는 방식|알림 서버 상태 => JSON'];
  for (const via of ['queue', 'direct']) for (const consumer of ['up', 'late']) {
    const r = await runCombo(via, consumer);
    out.push([via, consumer].join('|') + ' => ' + JSON.stringify(r));
  }
  fs.writeFileSync(path.join(__dirname, 'queue_basic_probe.out.txt'), out.join('\n') + '\n');
  console.log(out.join('\n'));
})().catch(e => { console.error(e); process.exit(1); });

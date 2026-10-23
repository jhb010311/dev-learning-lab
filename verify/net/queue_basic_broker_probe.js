// 기초개념 "메시지 큐" 실습의 실행용 모형. 네 가지 조합(보내는 방식 2 x 알림 서버 상태 2)을 127.0.0.1 안에서만 실제로 돌린다.
// (옛 실습의 queue_basic_probe.js와 그 결과는 그대로 두었다. 이 파일은 화면 코드가 스프링 AMQP·RestClient로 바뀐 뒤의 것이다.)
// 사용: node verify/net/queue_basic_broker_probe.js      결과는 verify/net/queue_basic_broker_probe.out.txt
// 외부 네트워크는 쓰지 않는다. 새로 내려받는 것은 없다. 서버는 모두 빈 포트에 띄우고 끝나면 닫는다.
//
// 이 컴퓨터에는 RabbitMQ도 spring-amqp도 없다. 그래서 큐를 쓰는 조합은 "RabbitMQ 역할을 대신하는 실행용 모형"으로 돌린다.
// 모형은 RabbitMQ 문서(AMQP 0-9-1 Model Explained, https://www.rabbitmq.com/tutorials/amqp-concepts)와 스프링 AMQP 문서가 정한 동작만 흉내 낸다.
//  - 큐 만들기: 화면의 QueueConfig에 있는 new Queue("이름")의 큐를 주문 서버가 처음 연결할 때 만든다
//    (스프링 부트 문서: Queue 빈은 RabbitMQ에 그 큐를 선언하는 데 쓰인다). 큐는 알림 서버와 상관없이 있다.
//  - 보내기: rabbitTemplate.convertAndSend("이름", no)는 기본 교환기("")로 routing key = "이름"을 붙여 보낸다.
//    기본 교환기는 큐 이름과 같은 routing key로 그 큐에 넣는다. 그런 큐가 없으면 메시지는 버려진다(mandatory를 켜지 않았을 때).
//    보내는 쪽은 메시지를 보내고 돌아온다. 받는 쪽이 처리했는지는 기다리지 않는다.
//  - 받기: @RabbitListener(queues = "이름")의 메서드. 브로커가 메시지를 받는 쪽에 밀어 준다(push, 문서가 권하는 방식. 들여다보기(poll)가 아니다).
//    메서드가 예외 없이 끝나면 스프링이 확인(ack)을 보내고(AUTO 모드, 기본), 브로커는 그 확인을 받아야 메시지를 큐에서 지운다.
//    그래서 처리 중인 메시지도 확인 전까지는 큐의 메시지 수에 든다. 큐는 넣은 차례대로 넘겨 준다.
//  - 모형이 다르게 한 것: 받는 쪽이 한 번에 하나만 받는다(스프링 AMQP의 기본 prefetch는 250이라 실제로는 여러 건을 미리 받아 두고 하나씩 처리한다.
//    처리 차례, 처리가 하나씩 이루어지는 것, 확인 전까지 큐의 메시지 수에 드는 것은 같다). 보내기는 HTTP 요청 하나와 그 답으로 줄였다.
//    디스크 보관, 브로커 자체가 꺼지는 일, 다시 보내기는 흉내 내지 않는다.
// 직접 부르는 조합(RestClient → @PostMapping("/notify"))도 같은 시간 값으로 돌려 사건의 순서를 잰다. 같은 조합은 verify/spring/src/QueueBasicProbe.java가 실제 스프링 부트로도 돌린다.
// 화면의 글은 실습 파일의 code 함수에서 읽고(parseScreen) 그 내용대로 무엇을 띄울지 정한다.
// 한 줄의 모양: 보내는 방식|알림 서버 상태 => JSON.   '#'로 시작하는 줄은 설명이다.
const http = require('http'), net = require('net'), fs = require('fs'), path = require('path');
const { load, combos } = require('../model_rows.js');
const WORK = 300;        // 알림 하나를 보내는 데 걸리게 한 시간(ms). 이 실습에서 정한 값

function parseScreen(text) {
  const r = { mode: null, count: 0, declared: [], routingKey: null, listenQueue: null, uri: null, serve: null, late: false, print: null };
  let m;
  if ((m = /\/\/ 주문이 들어올 때마다 불린다\(이 실습은 주문 1, 2, 3을 차례로\)/.exec(text))) r.count = 3;
  for (const x of text.matchAll(/return new Queue\("([^"]+)"\);/g)) r.declared.push(x[1]);
  if ((m = /^\s*rabbitTemplate\.convertAndSend\("([^"]+)", no\);$/m.exec(text))) { r.mode = 'queue'; r.routingKey = m[1]; }
  if ((m = /^\s*restClient\.post\(\)\.uri\("http:\/\/localhost:8081(\/[\w]+)"\)\n\s*\.body\(no\)\.retrieve\(\)\.toBodilessEntity\(\);$/m.exec(text))) { r.mode = 'direct'; r.uri = m[1]; }
  if ((m = /^\s*@RabbitListener\(queues = "([^"]+)"\)\n\s*void handle\(int no\) \{$/m.exec(text))) r.listenQueue = m[1];
  if ((m = /^\s*@PostMapping\("(\/[\w]+)"\)\n\s*void handle\(@RequestBody int no\) \{$/m.exec(text))) r.serve = m[1];
  if (/^\/\/ 알림 서버는 주문 3건을 보내는 동안 꺼져 있다가 나중에 켜진다$/m.test(text)) r.late = true;
  if (/System\.out\.println\("주문 " \+ no \+ " 알림 보냄"\);/.test(text)) r.print = no => '주문 ' + no + ' 알림';
  return r;
}

const sleep = ms => new Promise(r => setTimeout(r, ms));
const listen = (srv, port) => new Promise(res => srv.listen(port || 0, '127.0.0.1', () => res(srv.address().port)));
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
    req.setTimeout(8000, () => req.destroy(Object.assign(new Error('timeout'), { code: 'TIMEOUT' })));
    req.end(b);
  });
}
const readBody = req => new Promise(r => { const ch = []; req.on('data', d => ch.push(d)); req.on('end', () => r(Buffer.concat(ch).toString('utf8'))); });

async function runCombo(text) {
  const scr = parseScreen(text);
  const T0 = Date.now(), log = [], mark = (k, v) => log.push({ k, v, t: Date.now() - T0 });
  const servers = [];
  // ---- RabbitMQ 역할의 실행용 모형 (큐를 쓰는 조합에서만 띄운다)
  const B = { queues: {}, puts: [], delivers: [], acks: [], dropped: [], waiting: null, port: null };
  const qLen = name => B.queues[name] ? B.queues[name].items.length : null;
  function tryDeliver(name) {
    const Q = B.queues[name];
    if (!Q || !B.waiting || B.waiting.q !== name || Q.inflight || !Q.items.length) return;
    const w = B.waiting; B.waiting = null; Q.inflight = true;
    const m = Q.items[0]; B.delivers.push(m); mark('큐가 넘겨줌', m);
    w.res.writeHead(200, { Connection: 'close' }); w.res.end(m);
  }
  if (scr.mode === 'queue') {
    const srv = http.createServer(async (req, res) => {
      const body = await readBody(req), u = new URL(req.url, 'http://x'), name = u.searchParams.get('q');
      if (u.pathname === '/declare') { if (!B.queues[name]) B.queues[name] = { items: [], inflight: false }; mark('큐 만듦', name); res.writeHead(200, { Connection: 'close' }); res.end(); }
      else if (u.pathname === '/publish') {          // 기본 교환기: routing key와 이름이 같은 큐에 넣는다
        if (B.queues[name]) { B.queues[name].items.push(body); B.puts.push(body); mark('큐에 넣음', body); tryDeliver(name); }
        else { B.dropped.push(body); mark('버려짐', body); }
        res.writeHead(200, { Connection: 'close' }); res.end();
      } else if (u.pathname === '/consume') {        // 받는 쪽이 기다린다. 메시지가 있으면 브로커가 바로 넘겨 준다(push)
        B.waiting = { q: name, res }; tryDeliver(name);
      } else if (u.pathname === '/ack') {            // 확인을 받으면 맨 앞(넘겨준 것)을 지운다
        const Q = B.queues[name], m = Q.items.shift(); Q.inflight = false; B.acks.push(m); mark('확인 받고 지움', m);
        res.writeHead(200, { Connection: 'close' }); res.end(); tryDeliver(name);
      } else { res.writeHead(404, { Connection: 'close' }); res.end(); }
    });
    B.port = await listen(srv); servers.push(srv);
  }
  // ---- 알림 서버
  const N = { processed: [], port: null, running: false, queueAtStart: null };
  const work = async no => { mark('알림 처리 시작', scr.print(no)); await sleep(WORK); N.processed.push(scr.print(no)); mark('알림 처리 끝', scr.print(no)); };
  const startNotify = async () => {
    N.queueAtStart = scr.listenQueue ? qLen(scr.listenQueue) : null; mark('알림 서버 켜짐', '');
    if (scr.serve) {
      const s = http.createServer(async (req, res) => {
        const body = await readBody(req);
        if (req.url !== scr.serve) { res.writeHead(404, { Connection: 'close' }); return res.end(); }
        await work(+body); res.writeHead(200, { Connection: 'close' }); res.end();
      });
      await listen(s, N.port); servers.push(s);
    } else if (scr.listenQueue) {
      N.running = true;
      (async () => {
        while (N.running) {
          const r = await post(B.port, '/consume?q=' + encodeURIComponent(scr.listenQueue));
          if (!N.running || !r.ok || r.status !== 200) break;
          await work(+r.body);                                   // handle(int no)가 예외 없이 끝나면
          await post(B.port, '/ack?q=' + encodeURIComponent(scr.listenQueue));   // 스프링이 확인을 보낸다
        }
      })();
    }
  };
  if (scr.serve) N.port = await deadPort();
  // 주문 서버가 처음 연결할 때 QueueConfig의 큐를 만든다
  if (scr.mode === 'queue') for (const name of scr.declared) await post(B.port, '/declare?q=' + encodeURIComponent(name));
  if (!scr.late) await startNotify();
  // ---- 주문 서버: order(1), order(2), order(3)을 차례로
  const results = [];
  for (let no = 1; no <= scr.count; no++) {
    const t = Date.now(); mark('주문 서버가 보냄', String(no));
    const r = scr.mode === 'queue' ? await post(B.port, '/publish?q=' + encodeURIComponent(scr.routingKey), String(no)) : await post(N.port, scr.uri, String(no));
    const ok = r.ok && r.status === 200;
    results.push({ no, ok, errCode: r.ok ? '(없음)' : r.errCode, ms: Date.now() - t });
    mark('주문 서버가 결과를 받음', no + (ok ? ' 성공' : ' 실패'));
  }
  const queueAfterOrders = scr.mode === 'queue' ? qLen(scr.routingKey) : null;
  if (scr.late) { await sleep(100); await startNotify(); }
  const expectMore = scr.mode === 'queue' || results.some(r => r.ok);
  const until = Date.now() + (expectMore ? 4000 : 1000);
  while (Date.now() < until) {
    if (expectMore && N.processed.length >= scr.count) { await sleep(150); break; }
    await sleep(25);
  }
  N.running = false;
  if (B.waiting) { B.waiting.res.writeHead(204, { Connection: 'close' }); B.waiting.res.end(); B.waiting = null; }
  await sleep(100);
  for (const s of servers) await closeSrv(s);
  return {
    text, listens: { mode: scr.mode, declared: scr.declared, routingKey: scr.routingKey, listenQueue: scr.listenQueue, uri: scr.uri, serve: scr.serve, late: scr.late },
    results, processed: N.processed, processedCount: N.processed.length,
    queueAfterOrders, queueAtNotifyStart: N.queueAtStart, queueLeft: scr.mode === 'queue' ? qLen(scr.routingKey) : null,
    puts: B.puts, delivers: B.delivers, acks: B.acks, dropped: B.dropped, log,
  };
}

(async () => {
  const l = load('queue_basic');
  const out = ['# node ' + process.version + ' · ' + process.platform + ' · 127.0.0.1 안에서만 · 큐 쪽은 RabbitMQ 역할을 대신하는 실행용 모형(넣으면 기다리는 받는 쪽에 바로 넘겨 줌, 확인을 받으면 지움, 받는 쪽은 한 번에 하나) · 알림 하나 ' + WORK + 'ms · 형식: 보내는 방식|알림 서버 상태 => JSON'];
  for (const c of combos(l)) {
    const r = await runCombo(l.code(Object.assign({}, c)));
    out.push([c.via, c.consumer].join('|') + ' => ' + JSON.stringify(r));
  }
  fs.writeFileSync(path.join(__dirname, 'queue_basic_broker_probe.out.txt'), out.join('\n') + '\n');
  console.log(out.map(x => x.slice(0, 300)).join('\n'));
})().catch(e => { console.error(e); process.exit(1); });

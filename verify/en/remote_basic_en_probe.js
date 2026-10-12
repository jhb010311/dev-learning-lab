// (English version of verify/net/remote_basic_probe.js: only the texts the servers send and receive are the English lab's; the internal labels such as 꺼짐 and 시간 초과 are unchanged.)
// 기초개념 "다른 서버 부르기" 실습의 모든 설정 조합(결제 서버 상태 3 × 기다리는 시간 정함 2 = 6)을 실제로 실행한다.
// 서버 둘: 주문 서버(Node http 서버, POST /orders)와 결제 서버(Node http 서버, POST /pay). 둘 다 127.0.0.1의 빈 포트(0)로 연다.
//   결제 서버 상태: ok = 0.1초 뒤 200 "결제 완료" / slow = 3초 뒤 200 "결제 완료" / down = 서버를 띄웠다가 닫아 아무도 듣지 않는 포트를 만든다.
//   주문 서버는 POST /orders를 받으면 결제 서버에 POST /pay를 http.request로 보낸다(agent: false).
//     기다리는 시간을 정함 = signal: AbortSignal.timeout(1000) / 정하지 않음 = signal 없음.
//     결제 서버가 답하면 200 "주문 완료". ECONNREFUSED 오류면 502, 시간 초과(AbortSignal.timeout)면 504로 답한다.
// 클라이언트: http.request로 POST /orders를 보내 응답과 걸린 시간을 잰다.
// 사용: node verify/en/remote_basic_en_probe.js     결과는 verify/en/remote_basic_en_probe.out.txt에 쓴다.
// 한 줄의 모양: pay|timeout => status=클라이언트가 받은 상태|body=본문|ms=걸린 시간(밀리초)|orderSaw=주문 서버가 받은 요청 줄|payReq=주문 서버가 결제 서버로 보낸 요청|
//   paySaw=결제 서버가 받은 요청(받지 못했으면 없음)|cfgTimeout=주문 서버 코드에 정한 기다림 한도(밀리초 또는 없음)|cfgDelay=결제 서버의 응답 지연 설정(밀리초 또는 꺼짐)|
//   orderEvent=주문 서버가 겪은 일(답함/ECONNREFUSED/시간 초과)|payReply=결제 서버가 답한 상태와 본문|errCode,errName,causeName,errMsg=그때의 오류|errAtMs=오류가 난 때|
//   payDone=결제 서버가 결제 처리를 끝냈는지|payDoneMs=끝낸 때|paySocketGone=그때 결제 서버 쪽 연결이 이미 끊겨 있었는지
// '# 근거'는 이 실습의 문장이 기대는 사실을 따로 잰 것이다.
const http = require('http'), fs = require('fs'), path = require('path');
const TIMEOUT_MS = 1000, SLOW_MS = 3000, OK_MS = 100, HANG_WAIT = 4000;

function track() {
  const socks = new Set();
  return { add(s) { socks.add(s); s.on('close', () => socks.delete(s)); s.on('error', () => {}); }, killAll() { socks.forEach(s => s.destroy()); } };
}
function listen(handler) {
  const t = track(), srv = http.createServer(handler);
  srv.on('connection', s => t.add(s));
  srv.destroyAll = () => new Promise(r => { t.killAll(); srv.close(() => r()); });
  return new Promise(resolve => srv.listen(0, '127.0.0.1', () => resolve(srv)));
}

// 결제 서버. delay가 null이면 요청을 받고도 영영 답하지 않는다. 연결이 끊겼는지 확인하지 않고 처리를 끝낸다(그렇게 만든 서버).
async function startPay(delay, rec) {
  return listen((req, res) => {
    const t0 = performance.now();
    req.resume();
    rec.paySaw = req.method + ' ' + req.url;
    if (delay === null) return;
    setTimeout(() => {
      rec.payDone = true; rec.payDoneMs = Math.round(performance.now() - rec.t0);
      rec.paySocketGone = req.socket.destroyed;
      if (!req.socket.destroyed) { res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' }); res.end('Payment complete'); }
    }, delay);
  });
}

// 주문 서버. timeoutMs가 null이면 기다리는 시간을 정하지 않는다.
async function startOrder(payPort, timeoutMs, rec) {
  return listen((req, res) => {
    req.resume();
    rec.orderSaw = req.method + ' ' + req.url;
    const opts = { host: '127.0.0.1', port: payPort, path: '/pay', method: 'POST', agent: false };
    if (timeoutMs !== null) opts.signal = AbortSignal.timeout(timeoutMs);
    rec.payReq = opts.method + ' ' + opts.path;
    rec.cfgTimeout = timeoutMs === null ? '없음' : timeoutMs;
    const reply = (code, text) => { res.writeHead(code, { 'Content-Type': 'text/plain; charset=utf-8' }); res.end(text); };
    const pr = http.request(opts, r => {
      const ch = [];
      r.on('data', d => ch.push(d));
      r.on('end', () => { rec.orderEvent = '답함'; rec.payReply = r.statusCode + ' ' + Buffer.concat(ch).toString('utf8'); reply(200, 'Order complete'); });
    });
    pr.on('error', e => {
      rec.errCode = e.code || '(없음)'; rec.errName = e.name; rec.causeName = e.cause && e.cause.name ? e.cause.name : '(없음)'; rec.errMsg = e.message; rec.errAtMs = Math.round(performance.now() - rec.t0);
      if (e.code === 'ECONNREFUSED') { rec.orderEvent = 'ECONNREFUSED'; reply(502, 'Could not connect to the payment server'); }
      else if (rec.causeName === 'TimeoutError') { rec.orderEvent = '시간 초과'; reply(504, 'The payment server did not answer in time'); }
      else { rec.orderEvent = '그 밖의 오류'; reply(500, 'Error'); }
    });
    pr.end('{"amount":1000}');
  });
}

function client(port, rec, waitMs) {
  return new Promise(resolve => {
    const r = { status: '(응답 없음)', body: '(없음)', ms: null, got: false };
    const t = setTimeout(() => { req.destroy(); resolve(r); }, waitMs);
    rec.t0 = performance.now();
    const req = http.request({ host: '127.0.0.1', port, path: '/orders', method: 'POST', agent: false }, res => {
      const ch = [];
      res.on('data', d => ch.push(d));
      res.on('end', () => { clearTimeout(t); r.got = true; r.status = res.statusCode + ' ' + res.statusMessage; r.body = Buffer.concat(ch).toString('utf8'); r.ms = Math.round(performance.now() - rec.t0); resolve(r); });
    });
    req.on('error', () => {});
    req.end('{"item":"book"}');
  });
}
const sleep = ms => new Promise(r => setTimeout(r, ms));

(async () => {
  const out = ['# node ' + process.version + ' · 127.0.0.1 · 주문 서버와 결제 서버를 http로 띄움 · 클라이언트가 POST /orders · 기다림 한도 ' + TIMEOUT_MS + 'ms · 결제 서버 지연 ok ' + OK_MS + 'ms / slow ' + SLOW_MS + 'ms'];
  for (const pay of ['ok', 'down', 'slow']) for (const useTimeout of [true, false]) {
    const rec = { t0: 0, payDone: false, payDoneMs: null, paySocketGone: '(해당 없음)', paySaw: '(없음)', errCode: '(없음)', errName: '(없음)', causeName: '(없음)', errMsg: '(없음)', errAtMs: null, orderEvent: '', payReply: '(없음)', orderSaw: '(없음)', payReq: '(없음)', cfgTimeout: '(없음)' };
    const delay = pay === 'ok' ? OK_MS : pay === 'slow' ? SLOW_MS : null;
    let paySrv = await startPay(delay, rec);
    const payPort = paySrv.address().port;
    if (pay === 'down') { await paySrv.destroyAll(); paySrv = null; }
    const orderSrv = await startOrder(payPort, useTimeout ? TIMEOUT_MS : null, rec);
    const r = await client(orderSrv.address().port, rec, 8000);
    // 결제 서버가 끝내 처리를 마치는지 보려고, 요청을 받은 때부터 지연 시간보다 조금 더 기다린다
    if (pay !== 'down') await sleep(Math.max(0, delay + 400 - r.ms));
    out.push([pay, useTimeout].join('|') + ' => ' + ['status=' + r.status, 'body=' + r.body, 'ms=' + r.ms, 'orderSaw=' + rec.orderSaw, 'payReq=' + rec.payReq, 'paySaw=' + rec.paySaw, 'cfgTimeout=' + rec.cfgTimeout, 'cfgDelay=' + (delay === null ? '꺼짐' : delay), 'orderEvent=' + rec.orderEvent, 'payReply=' + rec.payReply, 'errCode=' + rec.errCode, 'errName=' + rec.errName, 'causeName=' + rec.causeName, 'errMsg=' + rec.errMsg, 'errAtMs=' + rec.errAtMs, 'payDone=' + rec.payDone, 'payDoneMs=' + rec.payDoneMs, 'paySocketGone=' + rec.paySocketGone].join('|'));
    await orderSrv.destroyAll();
    if (paySrv) await paySrv.destroyAll();
  }
  // 근거 1: 결제 서버가 요청을 받고도 영영 답하지 않을 때, 기다리는 시간을 정하지 않은 주문 서버는 HANG_WAIT 동안 포기하는가
  {
    const rec = { t0: 0 };
    const paySrv = await startPay(null, rec), orderSrv = await startOrder(paySrv.address().port, null, rec);
    const r = await client(orderSrv.address().port, rec, HANG_WAIT);
    out.push('# 근거 기다리는 시간을 정하지 않고 결제 서버가 답하지 않을 때 => ' + HANG_WAIT + 'ms 안에 클라이언트가 응답을 받음=' + r.got + '|주문 서버가 오류를 겪음=' + (rec.errCode !== undefined) + '|결제 서버가 요청을 받음=' + (rec.paySaw !== undefined));
    await orderSrv.destroyAll(); await paySrv.destroyAll();
  }
  // 근거 2: 기다리는 시간을 정했는데 결제 서버가 답하지 않을 때는 1초 뒤 504인가
  {
    const rec = { t0: 0 };
    const paySrv = await startPay(null, rec), orderSrv = await startOrder(paySrv.address().port, TIMEOUT_MS, rec);
    const r = await client(orderSrv.address().port, rec, HANG_WAIT);
    out.push('# 근거 기다리는 시간을 정하고 결제 서버가 답하지 않을 때 => 상태=' + r.status + '|ms=' + r.ms);
    await orderSrv.destroyAll(); await paySrv.destroyAll();
  }
  fs.writeFileSync(path.join(__dirname, 'remote_basic_en_probe.out.txt'), out.join('\n') + '\n');
  console.log(out.join('\n'));
  process.exit(0);
})();

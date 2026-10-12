// Compares the English lab model (src/en/lessons/266_remote_basic.js) with the real run in remote_basic_en_probe.out.txt.
// Same checks as verify/net/cmp_remote_basic.js (the three result columns, the facts the step sentences rely on, and the code on the screen); only the strings are English.
const fs = require('fs'), path = require('path'), vm = require('vm');
const L = []; const ctx = vm.createContext({ Lab: { register: o => L.push(o), fmt: String }, console, Math, JSON });
vm.runInContext(fs.readFileSync(path.join(__dirname, '..', '..', 'src', 'en', 'lessons', '266_remote_basic.js'), 'utf8'), ctx);
const lesson = L[0];
const lines = fs.readFileSync(path.join(__dirname, 'remote_basic_en_probe.out.txt'), 'utf8').split(/\r?\n/);
const real = {}, facts = [];
lines.forEach(l => {
  if (l.startsWith('# 근거 ')) { facts.push(l); return; }
  if (l.startsWith('#') || !l.includes(' => ')) return;
  const i = l.indexOf(' => '), k = l.slice(0, i), f = {};
  l.slice(i + 4).split('|').forEach(p => { const j = p.indexOf('='); f[p.slice(0, j)] = p.slice(j + 1); });
  real[k] = f;
});
const problems = [];
const code = f => +f.status.split(' ')[0];
const st502 = code(real['down|true']), st504 = code(real['slow|true']);
const resp = f => code(f) === 200 ? '200 ' + f.body : code(f) + ' ' + f.status.split(' ').slice(1).join(' ');
const secs = ms => ms < 100 ? 'fast' : ms >= 50 && ms <= 400 ? '0.1' : ms >= 900 && ms <= 1300 ? '1' : ms >= 2900 && ms <= 3400 ? '3' : '?';
let ok = 0, n = 0;
for (const pay of ['ok', 'down', 'slow']) for (const timeout of [true, false]) {
  n++;
  const c = { pay, timeout }, k = pay + '|' + timeout, f = real[k], probs = [], sim = lesson.simulate(Object.assign({}, c));
  if (sim.row[0] !== resp(f)) probs.push('response model ' + sim.row[0] + ' real ' + resp(f));
  const b = secs(+f.ms), wantTime = b === 'fast' ? 'Immediately (within 0.1s)' : 'About ' + b + 's';
  if (sim.row[1] !== wantTime) probs.push('time model ' + sim.row[1] + ' real ' + f.ms + 'ms (' + wantTime + ')');
  let wantEvt;
  if (f.orderEvent === 'ECONNREFUSED') wantEvt = f.errCode === 'ECONNREFUSED' ? 'Connection failed (ECONNREFUSED)' : '?';
  else if (f.orderEvent === '시간 초과') wantEvt = f.causeName === 'TimeoutError' ? 'Gave up after waiting 1s with no answer (timeout)' : '?';
  else if (f.orderEvent === '답함') wantEvt = secs(+f.payDoneMs) === '0.1' ? 'The payment server replied in 0.1s' : secs(+f.payDoneMs) === '3' ? 'Waited until the payment server answered after 3s' : '?';
  if (sim.row[2] !== wantEvt) probs.push('order server model ' + sim.row[2] + ' real ' + wantEvt);
  if ((code(f) === st502) !== (f.orderEvent === 'ECONNREFUSED')) probs.push('502 and connection failure do not match');
  if ((code(f) === st504) !== (f.orderEvent === '시간 초과')) probs.push('504 and timeout do not match');
  const wantSaw = pay === 'down' ? '(없음)' : 'POST /pay';
  if (f.paySaw !== wantSaw) probs.push('payment server saw ' + f.paySaw);
  if (f.orderSaw !== 'POST /orders' || f.payReq !== 'POST /pay') probs.push('request lines: ' + f.orderSaw + ' / ' + f.payReq);
  if (pay === 'ok' && f.payReply !== '200 Payment complete') probs.push('payment reply ' + f.payReply);
  if (pay === 'down' && f.errCode !== 'ECONNREFUSED') probs.push('error code ' + f.errCode);
  if (pay === 'slow' && timeout && (f.errCode !== 'ABORT_ERR' || f.causeName !== 'TimeoutError')) probs.push('timeout error kind ' + f.errCode + '/' + f.causeName);
  if (pay === 'slow' && timeout && f.paySocketGone !== 'true') probs.push('connection should be gone: ' + f.paySocketGone);
  if (pay === 'slow' && !(+f.payDoneMs >= 2900 && +f.payDoneMs <= 3400)) probs.push('payment finished at ' + f.payDoneMs);
  if (f.cfgTimeout !== (timeout ? '1000' : '없음')) probs.push('limit setting ' + f.cfgTimeout);
  const delayTxt = f.cfgDelay === '꺼짐' ? 'off' : 'replies "' + (f.payReply.split(' ').slice(1).join(' ') || 'Payment complete') + '" after ' + (+f.cfgDelay / 1000) + 's';
  const observed = [
    '# Client → order server (8080): ' + f.orderSaw,
    '# Order server → payment server (9000): ' + f.payReq + (f.cfgTimeout === '없음' ? '' : '  (waits up to ' + (+f.cfgTimeout / 1000) + 's)'),
    '# Payment server: ' + delayTxt,
    '# Order server: answers ' + st502 + ' for a connection failure and ' + st504 + ' for a timeout'].join('\n');
  const screen = lesson.code(Object.assign({}, c));
  if (pay !== 'down' && screen !== observed) probs.push('code differs\n   screen ' + JSON.stringify(screen) + '\n   real   ' + JSON.stringify(observed));
  if (pay === 'down') {
    const o2 = observed.replace('# Payment server: off', '# Payment server: off');
    if (screen !== o2) probs.push('code differs\n   screen ' + JSON.stringify(screen) + '\n   real   ' + JSON.stringify(o2));
  }
  if (!probs.length) ok++; else console.log('DIFF ' + k + '\n   ' + probs.join('\n   '));
}
const f1 = facts.find(l => l.includes('정하지 않고')), f2 = facts.find(l => l.includes('정하고 결제 서버가'));
if (!f1 || !f1.includes('응답을 받음=false') || !f1.includes('주문 서버가 오류를 겪음=false') || !f1.includes('결제 서버가 요청을 받음=true')) problems.push('fact (no limit, no answer) differs: ' + f1);
if (!f2 || !/상태=504 Gateway Timeout\|ms=(9\d\d|1[0-2]\d\d)$/.test(f2)) problems.push('fact (limit, no answer) differs: ' + f2);
problems.forEach(p => console.log('DIFF (fact): ' + p));
console.log('match ' + ok + ' / ' + n + (problems.length ? ' (fact mismatches: ' + problems.length + ')' : ' (the facts also match)'));

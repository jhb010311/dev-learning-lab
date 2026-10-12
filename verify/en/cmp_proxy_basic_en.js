// Compares the English lab model (src/en/lessons/263_proxy_basic.js) with the real run in proxy_basic_en_probe.out.txt.
// Same checks as verify/net/cmp_proxy_basic.js; only the strings are English.
const fs = require('fs'), path = require('path'), vm = require('vm');
const L = []; const ctx = vm.createContext({ Lab: { register: o => L.push(o), fmt: String }, console, Math, JSON });
vm.runInContext(fs.readFileSync(path.join(__dirname, '..', '..', 'src', 'en', 'lessons', '263_proxy_basic.js'), 'utf8'), ctx);
const lesson = L[0];
const lines = fs.readFileSync(path.join(__dirname, 'proxy_basic_en_probe.out.txt'), 'utf8').split(/\r?\n/);
const real = {};
lines.forEach(l => { if (l.startsWith('#') || !l.includes(' => ')) return; const i = l.indexOf(' => '); real[l.slice(0, i)] = JSON.parse(l.slice(i + 4)); });
let ok = 0, n = 0;
for (const via of ['proxy', 'direct']) for (const up of ['both', 'noproxy', 'noserver']) {
  n++;
  const c = { via, up }, k = via + '|' + up, r = real[k], probs = [], sim = lesson.simulate(Object.assign({}, c)), cl = r.client, viaProxy = via === 'proxy';
  let got;
  if (cl.ok && cl.status === 200 && cl.body === 'Hello') got = '200 OK, body "Hello"';
  else if (cl.ok && cl.status === 502 && cl.statusMessage === 'Bad Gateway' && r.proxySawRequests === 1 && r.proxyUpstream && r.proxyUpstream.error === 'ECONNREFUSED') got = '502 Bad Gateway (sent by the proxy server)';
  else if (!cl.ok && cl.errCode === 'ECONNREFUSED') got = 'Connection refused error (nothing waiting on that port)';
  else got = '??? ' + JSON.stringify(cl);
  const seen = { proxy: 'Proxy server', client: 'Client', none: 'None (no request arrived)' }[r.seenPeer];
  const hops = ['Client'];
  if (viaProxy) { hops.push(r.listens.proxy ? 'proxy' : 'proxy (refused)'); if (r.proxySawRequests > 0) hops.push(r.proxyUpstream && r.proxyUpstream.error === 'ECONNREFUSED' ? 'origin server (refused)' : 'origin server'); }
  else hops.push(!cl.ok && cl.errCode === 'ECONNREFUSED' ? 'origin server (refused)' : 'origin server');
  const way = hops.join(' → '), want = [got, seen, way];
  if (JSON.stringify(sim.row) !== JSON.stringify(want)) probs.push('model ' + sim.row.join(' | ') + '\n   real  ' + want.join(' | '));
  const code = lesson.code(Object.assign({}, c));
  if (code !== r.text) probs.push('code differs\n   screen ' + JSON.stringify(code) + '\n   real   ' + JSON.stringify(r.text));
  if (!probs.length) ok++; else console.log('DIFF ' + k + '\n   ' + probs.join('\n   '));
}
console.log('match ' + ok + ' / ' + n);

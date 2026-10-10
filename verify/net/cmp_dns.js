// "DNS" 실습의 모형 결과를 127.0.0.1의 시험용 DNS에서 실제로 실행한 결과(dns_probe.out.txt)와 대조한다
// 사용: node verify/net/cmp_dns.js
const fs = require('fs'), path = require('path');
const { load, combos } = require('../model_rows.js');
const lesson = load('dns');
const real = {};
fs.readFileSync(path.join(__dirname, 'dns_probe.out.txt'), 'utf8').split(/\r?\n/).filter(l => l.includes(' => ') && !l.startsWith('#')).forEach(l => { const i = l.indexOf(' => '); real[l.slice(0, i)] = JSON.parse(l.slice(i + 4)); });
const NAMES = { root: '루트', tld: '.example', shop: 'shop.example', cdn: 'cdn.example' };
let ok = 0, n = 0, cares = 0;
for (const c of combos(lesson)) {
  n++;
  const key = [c.q, c.cache, c.changed].join('|'), r = real[key];
  if (!r) { console.log('실행 결과에 없는 조합: ' + key); continue; }
  const sim = lesson.simulate(Object.assign({}, c));
  // 실행에서 일어난 일만으로 표의 값을 만든다: 답, 질문이 어디까지 갔는지, 바꾼 값과 같은지
  const source = r.pcQueries === 0 ? 'PC의 캐시' : r.upstream.length === 0 ? '리졸버의 캐시' : r.authoritative ? '권한 있는 네임 서버' : '권한 없는 답';
  const reflected = !c.changed ? '바꾸지 않음' : r.answer === r.newValue ? '반영됨 (새 값)' : r.answer === r.oldValue ? '아직 예전 값' : '알 수 없는 값';
  const want = [r.answer, source, r.pcQueries + '번', r.upstream.length + '번' + (r.upstream.length ? ' (' + r.upstream.map(x => NAMES[x]).join(' → ') + ')' : ''), reflected];
  // 캐시에서 나온 답은 TTL이 줄어 있어야 하고, 권한 있는 네임 서버에서 방금 받은 답은 TTL이 그대로여야 한다
  const fromCache = r.pcQueries === 0 || r.upstream.length === 0, ttlOk = fromCache ? r.ttlAnswer < r.ttlZone : r.ttlAnswer === r.ttlZone;
  if (r.cares === r.answer && r.caresAskedAgain) cares++;
  if (JSON.stringify(sim.row) === JSON.stringify(want) && ttlOk && r.cares === r.answer) ok++;
  else console.log('다름: ' + key + '\n  모형 ' + sim.row.join(' / ') + '\n  실제 ' + want.join(' / ') + ' · TTL ' + r.ttlAnswer + '/' + r.ttlZone + ' · c-ares ' + r.cares);
}
console.log('c-ares(Node.js dns.Resolver)가 풀이한 답도 같고, c-ares는 캐시 없이 다시 물은 조합: ' + cares + ' / ' + n);
console.log('일치 ' + ok + ' / ' + n);

// "프록시와 지연 로딩" 실습의 모형 결과를 실제 Hibernate 실행 결과(lazyproxy_probe.out.txt)와 대조한다.
// 결과 표의 세 칸과 함께, 두 변수가 같은 객체인지(same)와 끝났을 때 데이터가 채워져 있는지(init)도 비교한다.
const fs = require('fs'), path = require('path');
const { load, combos } = require('../model_rows.js');
const lesson = load('lazyproxy');
const real = {};
const lines = fs.readFileSync(path.join(__dirname, 'lazyproxy_probe.out.txt'), 'utf8').split(/\r?\n/).filter(Boolean);
console.log(lines[0]);
for (const ln of lines) {
  if (ln.startsWith('#')) continue;
  const [k, v] = ln.split(' => ');
  real[k] = Object.fromEntries(v.split('|').map(x => { const i = x.indexOf('='); return [x.slice(0, i), x.slice(i + 1)]; }));
}
let ok = 0, n = 0; const used = new Set();
for (const c of combos(lesson)) {
  const key = c.how + '|' + c.use, r = real[key]; n++; used.add(key);
  if (!r) { console.log('실제 실행 결과 없음: ' + key); continue; }
  const sim = lesson.simulate(Object.assign({}, c));
  const atGet = +r.selAtGet, atUse = +r.selAtUse;
  const when = atGet + atUse === 0 ? '0번' : (atGet + atUse) + '번 (' + (atGet ? 'em.find를 부를 때' : 'getName을 부를 때') + ')';
  let res;
  if (r.ex !== 'none') res = r.ex;
  else if (c.use === 'cls') { const [same, inst] = r.result.split(','); res = 'getClass() 비교 ' + same + ' · instanceof ' + inst; }
  else res = r.result;
  const want = [r.proxy === 'true' ? '프록시' : '진짜 엔티티', when, res];
  // 모형이 "주문 조회 1번"이라고 한 조합에서 실제로도 주문 테이블 조회가 1번인지 함께 본다
  const orderSel = sim.events[sim.events.length - 1].snap.sent.filter(q => q.sql.includes('from orders')).length;
  const same = JSON.stringify(sim.row) === JSON.stringify(want) && sim.same === r.same && String(sim.init) === r.initAfter && String(orderSel) === r.orderSel && !(atGet && atUse);
  if (same) ok++; else console.log('다름: ' + key + '\n  모형 ' + sim.row.join(' / ') + ' [same ' + sim.same + ', init ' + sim.init + ', 주문 조회 ' + orderSel + ']\n  실제 ' + want.join(' / ') + ' [same ' + r.same + ', init ' + r.initAfter + ', 주문 조회 ' + r.orderSel + ']');
}
Object.keys(real).forEach(k => { if (!used.has(k)) console.log('모형에 없는 조합: ' + k); });
console.log('일치 ' + ok + ' / ' + n);

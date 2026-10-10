// "빈 생명주기 콜백" 실습의 모형 결과를 실제 스프링 부트 실행 결과(lifecycle_probe.out.txt)와 조합마다 대조한다
const fs = require('fs'), path = require('path');
const { load } = require('../model_rows.js');
const lesson = load('lifecycle');
const all = fs.readFileSync(path.join(__dirname, 'lifecycle_probe.out.txt'), 'utf8').split(/\r?\n/).filter(Boolean);
console.log(all[0]);
const lines = all.filter(l => !l.startsWith('#'));
const INIT = { PostConstruct: '@PostConstruct', afterPropertiesSet: 'afterPropertiesSet()', init: 'init()' }, DEST = { PreDestroy: '@PreDestroy', destroy: 'destroy()', close: 'close()' };
let ok = 0;
for (const ln of lines) {
  const [k, v] = ln.split(' => '), [inj, cb, scope] = k.split('|'), [result, seqText, price, chainText] = v.split('|');
  const sim = lesson.simulate({ inj, cb, scope }), seq = seqText.split('>'), names = seq.map(x => x.split(':')[0]);
  const res = result === 'ok' ? '성공' : result.startsWith('startfail:') ? '기동 실패: ' + result.slice(10) : '기동은 성공, 빈을 꺼낼 때 실패: ' + result.slice(8);
  const ctor = seq.find(x => x.startsWith('ctor:'));
  const inits = names.filter(n => INIT[n]).map(n => INIT[n]), dests = names.filter(n => DEST[n]).map(n => DEST[n]);
  // 콜백이 하나도 불리지 않았을 때: 소스에 콜백이 없거나 객체를 만들지 못했으면 "콜백 없음", 콜백이 있는데 안 불렸으면 "불리지 않음"
  const defined = cb !== 'ctor' && result === 'ok';
  const real = [res, ctor === 'ctor:null' ? 'null' : '주입돼 있음', inits.length ? inits.join(' → ') : defined ? '불리지 않음' : '콜백 없음', dests.length ? dests.join(' → ') : defined ? '불리지 않음' : '콜백 없음'];
  // 표의 네 칸에 더해, 불린 순서 전체(그때 repository가 null이었는지 포함)와 price("사과")의 값, 예외 사슬도 같아야 한다
  const same = JSON.stringify(sim.row) === JSON.stringify(real) && JSON.stringify(sim.seq) === JSON.stringify(seq) && sim.price === price && sim.chain.join('>') === chainText;
  if (same) ok++; else console.log('다름: ' + k + '\n   모형 ' + sim.row.join(' | ') + ' | ' + sim.seq.join('>') + ' | ' + sim.price + ' | ' + sim.chain.join('>') + '\n   실제 ' + real.join(' | ') + ' | ' + seqText + ' | ' + price + ' | ' + chainText);
}
console.log('일치 ' + ok + ' / ' + lines.length);
// 추가 확인(assume에 적은 내용): @Bean에 destroyMethod를 적지 않아도 public close()는 불린다. 프로토타입이면 불리지 않는다
const want = [['(싱글톤)', 'ok|ctor:null>init:set>STARTED>USE>CLOSING>close:set|1000|'], ['(프로토타입)', 'ok|STARTED>ctor:null>init:set>USE>CLOSING|1000|']];
const extraLines = all.filter(l => l.startsWith('# extra'));
let ex = 0;
extraLines.forEach(l => { const w = want.find(x => l.includes(x[0])); if (w && l.split(' => ')[1] === w[1]) ex++; else console.log('추가 확인 다름: ' + l); });
console.log('추가 확인 ' + ex + ' / ' + extraLines.length);

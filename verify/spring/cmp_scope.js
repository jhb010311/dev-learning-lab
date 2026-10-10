// "빈 스코프" 실습의 모형 결과를 실제 스프링 부트 서버에 요청을 보낸 결과(scope_probe.out.txt)와 조합마다 대조한다
const fs = require('fs'), path = require('path');
const { load } = require('../model_rows.js');
const lesson = load('scope');
const all = fs.readFileSync(path.join(__dirname, 'scope_probe.out.txt'), 'utf8').split(/\r?\n/).filter(Boolean);
console.log(all[0]);
const lines = all.filter(l => !l.startsWith('#'));
const nums = body => body.split(',').map(n => n + '번').join(', ');
const HOLDS = { Cart: /^Cart \d+번$/, ObjectProvider: /^ObjectProvider<Cart>$/, CartProxy: /^Cart 프록시$/ };
let ok = 0;
for (const ln of lines) {
  const [k, v] = ln.split(' => '), [scope, get] = k.split('|'), p = v.split('|');
  const sim = lesson.simulate({ scope, get });
  let real, extra;
  if (p[0].startsWith('fail:')) {
    // 기동 실패: 예외 사슬 전체가 모형이 적어 둔 것과 같아야 하고, 표에 적은 예외 이름이 그 사슬 안에 있어야 한다
    const chain = p[0].slice(5).split('>'), named = sim.row[0].replace('기동 실패: ', '');
    real = ['기동 실패: ' + (chain.includes(named) ? named : chain.join('>')), '-', '-', '-', '-'];
    extra = JSON.stringify(sim.chain) === JSON.stringify(chain) && p[1] === '0';
  } else {
    real = ['기동 성공', p[1] + '개', p[2] + '개', nums(p[3]), nums(p[4])];
    extra = !!HOLDS[p[5]] && HOLDS[p[5]].test(sim.holds);   // OrderService의 필드에 실제로 들어 있던 것
  }
  if (JSON.stringify(sim.row) === JSON.stringify(real) && extra) ok++;
  else console.log('다름: ' + k + '\n   모형 ' + sim.row.join(' | ') + ' | 필드 ' + sim.holds + ' | ' + sim.chain.join('>') + '\n   실제 ' + real.join(' | ') + ' | ' + v);
}
console.log('일치 ' + ok + ' / ' + lines.length);
// 추가 확인(요약과 assume에 적은 내용)
const want = [['프로토타입을 주입받는 싱글톤 빈이 둘', 'ok|기동 직후 Cart 2개|두 빈이 받은 객체가 다르다'], ['add 뒤 size', 'ok|요청 1의 응답(size, size) 0,0|만들어진 Cart 4개'], ['@RequestScope를 그대로 주입', 'ok|1,1|2,2|CartProxy|만들어진 Cart 2개'], ['request 스코프 빈의 @PreDestroy', 'ok|요청 1 뒤 소멸 1개|요청 2 뒤 소멸 2개|만들어진 Cart 2개']];
const extraLines = all.filter(l => l.startsWith('# extra'));
let ex = 0;
extraLines.forEach(l => { const w = want.find(x => l.includes(x[0])); if (w && l.split(' => ')[1] === w[1]) ex++; else console.log('추가 확인 다름: ' + l); });
console.log('추가 확인 ' + ex + ' / ' + extraLines.length);

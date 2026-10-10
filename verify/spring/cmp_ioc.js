// "스프링 컨테이너와 빈" 실습의 모형 결과를 실제 스프링 부트 실행 결과(ioc_probe.out.txt)와 조합마다 대조한다
const fs = require('fs'), path = require('path');
const { load } = require('../model_rows.js');
const lesson = load('ioc');
const all = fs.readFileSync(path.join(__dirname, 'ioc_probe.out.txt'), 'utf8').split(/\r?\n/).filter(Boolean);
console.log(all[0]);
const lines = all.filter(l => !l.startsWith('#'));
const BY = { OrderService: 'OrderService의 new', spring: '컨테이너 (생성자를 직접 호출)', 'AppConfig<spring': '컨테이너가 호출한 AppConfig의 @Bean 메서드', '-': '-' };
let ok = 0;
for (const ln of lines) {
  const [k, v] = ln.split(' => '), [how, reg, use] = k.split('|'), [result, impl, discount, by, changed, made] = v.split('|');
  const sim = lesson.simulate({ how, reg, use }), failed = result.startsWith('fail:');
  const real = [result === 'plain' ? '정상 실행 (컨테이너 없음)' : failed ? '기동 실패: ' + result.slice(5) : '기동 성공', impl === '-' ? '-' : impl + ' (' + discount + '원 할인)', BY[by] || by, failed ? '-' : changed.split(',').join(', ')];
  // 표의 네 칸과, 만들어진 구현 객체의 수(기동에 성공한 경우)를 함께 본다
  if (JSON.stringify(sim.row) === JSON.stringify(real) && (failed || String(sim.made) === made)) ok++;
  else console.log('다름: ' + k + '\n   모형 ' + sim.row.join(' | ') + ' | 객체 ' + sim.made + '\n   실제 ' + real.join(' | ') + ' | 객체 ' + made);
}
console.log('일치 ' + ok + ' / ' + lines.length);
// 추가 확인(assume에 적은 내용): 파라미터 이름이 빈 이름과 같으면 그 빈이, @Primary와 @Qualifier가 함께 있으면 @Qualifier가 가리킨 빈이 들어간다
const extra = all.filter(l => l.startsWith('# extra'));
const want = [['파라미터 이름이 rateDiscountPolicy', 'ok|RateDiscountPolicy|2000'], ['@Primary + @Qualifier(fixedDiscountPolicy)', 'ok|FixedDiscountPolicy|1000']];
let ex = 0;
extra.forEach(l => { const w = want.find(x => l.includes(x[0])); if (w && l.split(' => ')[1].startsWith(w[1])) ex++; else console.log('추가 확인 다름: ' + l); });
console.log('추가 확인 ' + ex + ' / ' + extra.length);

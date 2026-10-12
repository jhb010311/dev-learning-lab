// 기초개념 "@Transactional" 실습의 모형 결과를 실제 스프링 + H2 실행 결과(tx_basic_probe.out.txt)와 대조한다
// 결과 표의 세 항목, 화면의 코드(Probe가 실행한 소스와 같은 글인가), 단계 문장이 기대는 사실(프록시, 트랜잭션 활성, 다른 연결에서 본 행 수, 시작/반영/취소 횟수)을 본다
const fs = require('fs'), path = require('path');
const { load } = require('../model_rows.js');
const lesson = load('tx_basic');
const lines = fs.readFileSync(path.join(__dirname, 'tx_basic_probe.out.txt'), 'utf8').split(/\r?\n/).filter(Boolean);
console.log(lines[0]);
let ok = 0, n = 0, extraOk = 0, extraAll = 0;
for (const ln of lines.slice(1)) {
  const [k, v] = ln.split(' => '), [tx, stock] = k.split('|'), f = {};
  v.split('|').forEach(p => { const i = p.indexOf('='); f[p.slice(0, i)] = p.slice(i + 1); });
  n++;
  const c = { tx: tx === 'true', stock }, zero = stock === 'zero';
  const sim = lesson.simulate(c);
  const ended = f.ends === 'NORMAL' ? '정상으로 끝남' : f.ends === 'java.lang.IllegalStateException:재고 없음' ? '예외로 끝남 (재고 없음)' : '알 수 없음 ' + f.ends;
  const real = [ended, f.orders + '행', f.payment + '행'];
  let good = true;
  if (JSON.stringify(sim.row) !== JSON.stringify(real)) { good = false; console.log('다름: ' + k + '\n   모형 ' + sim.row.join(' | ') + '\n   실제 ' + real.join(' | ')); }
  // 화면의 코드 = Probe가 실행한 소스에서 package/import 머리글과 // PROBE 줄을 뺀 것
  const all = f.src.split('\\n'), body = all.slice(all.findIndex(l => l === '@Service')).filter(l => !l.endsWith('// PROBE'));
  while (body.length && body[body.length - 1] === '') body.pop();
  const want = lesson.code.call(lesson, c);
  if (body.join('\n') !== want) { good = false; console.log('화면의 코드가 Probe가 실행한 소스와 다름: ' + k + '\n   화면 ' + want.replace(/\n/g, '\\n') + '\n   실행 ' + body.join('\\n')); }
  if (all.filter(l => l.endsWith('// PROBE')).length !== 2) { good = false; console.log('PROBE 줄이 둘이 아님: ' + k); }
  // 단계 문장이 기대는 사실들
  const checks = {
    'order() 안에서 트랜잭션이 활성인 것은 @Transactional이 있을 때뿐이다': f.active === String(c.tx),
    '@Transactional이 있으면 main이 받은 빈은 스프링이 만든 다른 클래스(프록시), 없으면 우리 클래스 그대로': c.tx ? (f.sameClass === 'false' && f.isProxy === 'true' && /^app\.OrderService\$\$SpringCGLIB/.test(f.beanClass)) : (f.sameClass === 'true' && f.isProxy === 'false' && f.beanClass === 'app.OrderService'),
    '첫 저장 직후 다른 연결에서 본 orders는 묶음 안이면 0행, 묶음이 없으면 1행': f.seen === (c.tx ? '0' : '1'),
    '트랜잭션 매니저가 시작/반영/취소한 횟수': c.tx ? (f.begins === '1' && f.commits === (zero ? '0' : '1') && f.rollbacks === (zero ? '1' : '0')) : (f.begins === '0' && f.commits === '0' && f.rollbacks === '0'),
    '예외는 order()를 부른 쪽까지 전달된다(@Transactional이 있어도 삼켜지지 않는다)': zero ? f.ends === 'java.lang.IllegalStateException:재고 없음' : f.ends === 'NORMAL',
  };
  for (const [name, pass] of Object.entries(checks)) { extraAll++; if (pass) extraOk++; else { good = false; console.log('사실 불일치: ' + k + ' / ' + name); } }
  if (good) ok++;
}
console.log('일치 ' + ok + ' / ' + n);
console.log('화면 문장이 기대는 사실 ' + extraOk + ' / ' + extraAll);

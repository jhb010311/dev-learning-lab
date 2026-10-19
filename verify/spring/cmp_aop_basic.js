// 기초개념 "AOP와 프록시" 실습의 모형 결과를 실제 스프링 + AspectJ weaver 실행 결과(aop_basic_probe.out.txt)와 대조한다
// 결과 표의 네 항목, 화면의 코드(Probe가 실행한 소스와 같은 글인가), 단계 문장이 기대는 사실(프록시의 상속 관계, 진짜 객체, 같은 객체 여부, 프록시 개수)을 본다
const fs = require('fs'), path = require('path');
const { load } = require('../model_rows.js');
const lesson = load('aop_basic');
const lines = fs.readFileSync(path.join(__dirname, 'aop_basic_probe.out.txt'), 'utf8').split(/\r?\n/).filter(Boolean);
console.log(lines[0]);
let ok = 0, n = 0, extraOk = 0, extraAll = 0;
for (const ln of lines.slice(1)) {
  const i0 = ln.indexOf(' => '), k = ln.slice(0, i0), v = ln.slice(i0 + 4), [aspect, how] = k.split('|'), f = {};
  v.split('|').forEach(p => { const i = p.indexOf('='); f[p.slice(0, i)] = p.slice(i + 1); });
  n++;
  const c = { aspect: aspect === 'true', how }, A = c.aspect, bean = how === 'bean';
  const sim = lesson.simulate(c);
  // 찍힌 줄: 마지막 줄은 클래스 이름, 나머지는 order() 호출로 찍힌 줄
  const outs = f.out.split('~'), simple = outs[outs.length - 1], printed = outs.slice(0, -1).join(' / ');
  const short = s => s.replace(/^app\./, '');
  const real = [printed, simple, f.usedProxy === 'true' ? '예' : '아니요', short(f.beanClass)];
  let good = true;
  if (JSON.stringify(sim.row) !== JSON.stringify(real)) { good = false; console.log('다름: ' + k + '\n   모형 ' + sim.row.join(' | ') + '\n   실제 ' + real.join(' | ')); }
  // 화면의 코드 = Probe가 실행한 소스에서 package/import 머리글을 뺀 것
  const all = f.src.split('\\n'), body = all.slice(all.findIndex(l => l === '// 끼워 넣는 일: 스프링이 보관한 OrderService 빈의 order()를 부를 때마다 실행된다' || l === '@Service'));
  while (body.length && body[body.length - 1] === '') body.pop();
  const want = lesson.code.call(lesson, c);
  if (body.join('\n') !== want) { good = false; console.log('화면의 코드가 Probe가 실행한 소스와 다름: ' + k + '\n   화면 ' + want.replace(/\n/g, '\\n') + '\n   실행 ' + body.join('\\n')); }
  if (all.slice(0, all.indexOf(body[0])).some(l => !/^(package|import) |^$/.test(l))) { good = false; console.log('머리글에 package/import 아닌 줄이 있음: ' + k); }
  // 단계 문장이 기대는 사실들
  const checks = {
    '실행 순서: 프록시면 [로그] 줄이 "주문 처리"보다 먼저, 아니면 "주문 처리"만': A && bean ? printed === '[로그] order 호출됨 / 주문 처리' : printed === '주문 처리',
    '스프링이 보관한 빈은 LogAspect가 있으면 CGLIB 프록시(OrderService$$SpringCGLIB$$0), 없으면 우리 클래스 그대로': A ? (f.beanProxy === 'true' && f.beanClass === 'app.OrderService$$SpringCGLIB$$0') : (f.beanProxy === 'false' && f.beanClass === 'app.OrderService'),
    '프록시는 OrderService를 상속한 클래스이고 그 안에 진짜 OrderService 객체가 들어 있다': A ? (f.isSub === 'true' && f.super === 'app.OrderService' && f.targetClass === 'app.OrderService' && f.targetSame === 'false') : (f.isSub === 'false' && f.targetClass === '-'),
    '@Autowired로 받은 객체는 스프링이 보관한 그 빈과 같은 객체, new로 만든 객체는 다른 객체': f.same === String(bean),
    '컨테이너 안의 프록시 개수는 LogAspect가 있으면 1, 없으면 0': f.proxies === (A ? '1' : '0'),
    'new로 만든 객체는 LogAspect가 있어도 프록시가 아니다(부른 객체의 클래스가 OrderService 그대로)': bean || (f.usedProxy === 'false' && f.usedClass === 'app.OrderService'),
    'LogAspect 클래스를 두면 컨테이너에 logAspect 빈이 있고, 지우면 없다': f.aspectBean === String(A),
    'Caller 객체는 프록시가 아니다': f.callerClass === 'app.Caller',
  };
  for (const [name, pass] of Object.entries(checks)) { extraAll++; if (pass) extraOk++; else { good = false; console.log('사실 불일치: ' + k + ' / ' + name); } }
  if (good) ok++;
}
console.log('일치 ' + ok + ' / ' + n);
console.log('화면 문장이 기대는 사실 ' + extraOk + ' / ' + extraAll);

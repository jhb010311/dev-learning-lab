// 기초개념 "의존성 주입" 실습의 모형 결과를 실제 스프링(컴포넌트 스캔) 실행 결과(di_basic_probe.out.txt)와 대조한다
// 대조: 결과 표 세 열, 객체가 만들어진 순서(모형의 order와 실제 생성자 호출 순서),
//       단계 문장이 기대는 사실들(스캔이 찾은 클래스, 컨텍스트를 만드는 줄에서 모두 만들어짐, 의존 대상 기록, 예외의 종류와 자리 등),
//       그리고 화면의 코드(code 함수)가 Probe가 컴파일한 소스(verify/out/di_basic/<조합>/src/app)와 같은 글인지
//       (Probe 소스에만 있는 "// PROBE" 줄은 객체 생성과 측정을 위해 더한 것이므로 빼고, package와 import 줄도 뺀다)
const fs = require('fs'), path = require('path');
const { load } = require('../model_rows.js');
const lesson = load('di_basic');
const lines = fs.readFileSync(path.join(__dirname, 'di_basic_probe.out.txt'), 'utf8').split(/\r?\n/).filter(Boolean);
console.log(lines[0]);
let ok = 0, n = 0, extraOk = 0, extraAll = 0;
for (const ln of lines.slice(1)) {
  n++;
  const [k, v] = ln.split(' => '), [how, depS] = k.split('|'), dep = depS === 'true';
  if (v.startsWith('COMPILE_ERROR')) { console.log('다름: ' + k + ' 컴파일 오류 ' + v); continue; }
  const f = {};
  v.split('|').forEach(p => { const i = p.indexOf('='); f[p.slice(0, i)] = p.slice(i + 1); });
  const sim = lesson.simulate({ how, dep }), probs = [];
  // 실제 값에서 결과 표를 만든다
  const evs = f.events === '' ? [] : f.events.split(','), made = evs.filter(e => !e.startsWith('#')), measured = f.field !== undefined;
  const payCount = made.filter(e => e.startsWith('PayService<-')).length;
  let run;
  if (f.exc === '-') run = f.out;
  else if (/^org\.springframework\.beans\.factory\.UnsatisfiedDependencyException: /.test(f.exc) && / >> org\.springframework\.beans\.factory\.NoSuchBeanDefinitionException: No qualifying bean of type 'app\.PayService' available/.test(f.exc)) run = '스프링이 시작하다 실패함: PayService 빈이 없음';
  else if (/^java\.lang\.NullPointerException: Cannot invoke "app\.PayService\.pay\(\)" because "this\.payService" is null$/.test(f.exc) && f.at === 'app.OrderService.order') run = 'NullPointerException으로 멈춤';
  else run = '(모르는 결과 ' + f.exc + ' / ' + f.out + ')';
  const used = !measured ? (made.some(e => e.startsWith('OrderService<-')) ? '(모르는 상태)' : 'OrderService가 만들어지지 못함')
    : f.field === 'bean' ? '스프링이 넣어 준 빈' : f.field === 'none' ? '없음 (비어 있음)' : f.field === 'other' && made.includes('PayService<-OrderService.<init>') ? '직접 new로 만든 객체' : '(모르는 상태 ' + f.field + ')';
  const real = [run, used, payCount + '개'];
  if (JSON.stringify(sim.row) !== JSON.stringify(real)) probs.push('표 모형 ' + sim.row.join(' | ') + '\n   실제 ' + real.join(' | '));
  // 객체가 만들어진 순서
  if (sim.order.join(',') !== made.join(',')) probs.push('만들어진 순서 모형 ' + sim.order.join(',') + ' 실제 ' + made.join(','));
  // 화면의 코드와 Probe가 컴파일한 소스
  const dir = path.join(__dirname, '..', 'out', 'di_basic', how + '-' + dep, 'src', 'app');
  const raw = ['PayService', 'OrderService', 'Main'].map(nm => fs.readFileSync(path.join(dir, nm + '.java'), 'utf8').replace(/\r\n/g, '\n'));
  const parts = raw.map(t => { const a = t.trimEnd().split('\n'); const i = a.findIndex(l => /^(@|public class)/.test(l)); return a.slice(i).filter(l => !l.endsWith('// PROBE')).join('\n'); });
  const probeLines = raw.map(t => t.split('\n').filter(l => l.endsWith('// PROBE')).length);
  if (JSON.stringify(probeLines) !== '[1,1,2]') probs.push('세는 줄 수 ' + probeLines.join(','));
  if (parts.join('\n\n') !== lesson.code({ how, dep })) probs.push('화면의 코드와 Probe가 컴파일한 소스가 다름');
  if (!probs.length) ok++; else console.log('다름: ' + k + '\n   ' + probs.join('\n   '));
  // 화면 문장이 기대는 사실들
  const iOf = e => evs.indexOf(e), srcAll = raw.join('\n');
  const checks = {
    '스캔이 찾은 클래스: @Component가 있는 클래스만': f.scan === (dep ? '[app.OrderService, app.PayService]' : '[app.OrderService]'),
    '우리 코드에 new OrderService(가 없다': !/new OrderService\(/.test(srcAll),
    'new PayService()는 직접 만들 때만 있다': /new PayService\(\)/.test(raw[1]) === (how === 'new') && !/new PayService\(/.test(raw[0] + raw[2]),
    '생성자의 매개변수는 생성자로 받을 때만 있다': /public OrderService\(PayService payService\)/.test(raw[1]) === (how === 'inject'),
    '스프링이 OrderService 객체를 만든다(PayService를 못 넣어 실패한 경우만 만들지 못함)': made.includes('OrderService<-spring') === !(how === 'inject' && !dep),
    '스프링이 PayService 빈을 만드는 것은 @Component가 있을 때만이다': made.includes('PayService<-spring') === dep,
    '직접 만든 PayService 객체는 new일 때만 있고, 만든 쪽은 OrderService의 생성자다': made.includes('PayService<-OrderService.<init>') === (how === 'new') && made.filter(e => e.startsWith('PayService<-') && e !== 'PayService<-spring').every(e => e === 'PayService<-OrderService.<init>'),
    ...(how === 'inject' && dep ? {
      '생성자 주입: PayService가 OrderService보다 먼저 만들어진다': iOf('PayService<-spring') >= 0 && iOf('PayService<-spring') < iOf('OrderService<-spring'),
      '생성자 주입: 스프링이 기록한 OrderService의 의존 대상은 payService다': f.deps === '[payService]',
      '생성자 주입: 필드는 컨텍스트의 PayService 빈과 같은 객체다': f.field === 'bean' && f.beans === '1',
    } : {}),
    ...(how !== 'inject' ? { '생성자가 없으면 스프링이 기록한 의존 대상이 없다': f.deps === '[]' } : {}),
    ...(how === 'new' && dep ? {
      '직접 만들 때: 스프링의 PayService 빈이 있어도 필드는 그 빈과 다른 객체다': f.field === 'other' && f.beans === '1',
      '직접 만들 때: OrderService가 만들어지는 중에 PayService가 만들어지고, 스프링의 빈은 그 뒤에 만들어진다': iOf('OrderService<-spring') < iOf('PayService<-OrderService.<init>') && iOf('PayService<-OrderService.<init>') < iOf('PayService<-spring'),
    } : {}),
    ...(how === 'new' && !dep ? { '직접 만들 때: @Component가 없으면 PayService 빈이 없는데도 실행된다': f.beans === '0' && f.out === '결제 완료' } : {}),
    ...(how === 'none' ? {
      '받지도 만들지도 않으면 필드가 비어 있다': f.field === 'none',
      '받지도 만들지도 않아도 스프링 시작은 오류 없이 끝난다(컨텍스트 뒤까지 간다)': evs.includes('#context'),
      '받지도 만들지도 않을 때 PayService 빈이 있어도 연결되지 않는다': f.beans === (dep ? '1' : '0'),
    } : {}),
    ...(how === 'inject' && !dep ? {
      '빈이 없으면: 객체가 하나도 만들어지지 않고 main은 컨텍스트를 만드는 줄에서 멈춘다': evs.length === 0,
      '빈이 없으면: 예외는 생성자의 0번째 매개변수 때문이다': /constructor parameter 0: No qualifying bean of type 'app\.PayService'/.test(f.exc),
    } : {}),
    ...(measured ? {
      '객체는 모두 컨텍스트를 만드는 줄에서 만들어지고 getBean 뒤에는 새로 만들어지지 않는다': evs[evs.length - 1] === '#getBean' && evs.indexOf('#context') === evs.length - 2,
    } : {}),
  };
  for (const [name, pass] of Object.entries(checks)) { extraAll++; if (pass) extraOk++; else console.log('사실 불일치: ' + k + ' / ' + name); }
}
console.log('일치 ' + ok + ' / ' + n);
console.log('화면 문장이 기대는 사실 ' + extraOk + ' / ' + extraAll);

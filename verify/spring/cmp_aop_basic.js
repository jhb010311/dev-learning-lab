// 기초개념 "AOP와 프록시" 실습의 모형 결과를 실제 스프링(@Transactional + H2 트랜잭션 매니저, AspectJ weaver) 실행 결과(aop_basic_tx_probe.out.txt)와 대조한다
// 결과 표의 네 항목, 화면의 코드(Probe가 실행한 소스와 같은 글인가), 단계 문장이 기대는 사실(프록시의 상속 관계, 진짜 객체, 같은 객체 여부,
// 프록시 개수, 트랜잭션 시작·커밋 횟수와 순서, 연결한 DB)을 본다. 모형의 단계 상태(begins, commits, proxies)도 실행 결과와 맞춘다.
// (2026-10-22 판. 옛 LogAspect 중심 판의 결과 aop_basic_probe.out.txt는 그대로 두었다.)
const fs = require('fs'), path = require('path');
const { load } = require('../model_rows.js');
const lesson = load('aop_basic');
const lines = fs.readFileSync(path.join(__dirname, 'aop_basic_tx_probe.out.txt'), 'utf8').split(/\r?\n/).filter(Boolean);
console.log(lines[0]);
const FIRST = '// … 설정 클래스(@EnableTransactionManagement, H2 DataSource, 트랜잭션 매니저 빈)와 import 줄은 생략';
let ok = 0, n = 0, extraOk = 0, extraAll = 0;
for (const ln of lines.slice(1)) {
  const i0 = ln.indexOf(' => '), k = ln.slice(0, i0), v = ln.slice(i0 + 4), [ann, how] = k.split('|'), f = {};
  if (v.startsWith('COMPILE_ERROR')) { n++; console.log('컴파일 실패: ' + k + ' ' + v); continue; }
  v.split('|').forEach(p => { const i = p.indexOf('='); f[p.slice(0, i)] = p.slice(i + 1); });
  n++;
  const c = { ann, how }, TX = ann === 'tx', LOG = ann === 'log', PXY = TX || LOG, bean = how === 'bean';
  const sim = lesson.simulate(Object.assign({}, c));
  // 찍힌 줄: 마지막 줄은 클래스 이름, 나머지는 order() 호출로 찍힌 줄
  const outs = f.out.split('~'), simple = outs[outs.length - 1], printed = outs.slice(0, -1).join(' / ');
  const short = s => s.replace(/^app\./, '');
  const real = [printed, simple, f.usedProxy === 'true' ? '예' : '아니요', short(f.beanClass)];
  let good = true;
  if (JSON.stringify(sim.row) !== JSON.stringify(real)) { good = false; console.log('다름: ' + k + '\n   모형 ' + sim.row.join(' | ') + '\n   실제 ' + real.join(' | ')); }
  // 화면의 코드 = Probe가 실행한 소스에서 package/import 머리글을 뺀 것
  const all = f.src.split('\\n'), start = all.indexOf(FIRST), body = start < 0 ? [] : all.slice(start);
  while (body.length && body[body.length - 1] === '') body.pop();
  const want = lesson.code.call(lesson, c);
  if (body.join('\n') !== want) { good = false; console.log('화면의 코드가 Probe가 실행한 소스와 다름: ' + k + '\n   화면 ' + want.replace(/\n/g, '\\n') + '\n   실행 ' + body.join('\\n')); }
  if (start < 0 || all.slice(0, start).some(l => !/^(package|import) |^$/.test(l))) { good = false; console.log('머리글에 package/import 아닌 줄이 있음: ' + k); }
  // 모형의 마지막 단계 상태
  const fin = sim.events[sim.events.length - 1].snap;
  // 단계 문장이 기대는 사실들
  const checks = {
    '찍힌 순서: @Transactional 빈이면 트랜잭션 시작 → "트랜잭션 진행 중: true" → 커밋 → 클래스 이름': TX && bean ? f.seq === '#TM begin~트랜잭션 진행 중: true~#TM commit~OrderService$$SpringCGLIB$$0' : !f.seq.includes('#TM'),
    'LogAspect 빈이면 [로그] 줄이 order()의 줄보다 먼저, 그 밖에는 [로그] 줄이 없다': LOG && bean ? printed === '[로그] order 호출됨 / 트랜잭션 진행 중: false' : !printed.includes('[로그]'),
    '트랜잭션이 진행 중(true)인 것은 @Transactional 빈을 부를 때뿐': printed.includes('true') === (TX && bean),
    '스프링이 보관한 빈은 @Transactional이나 LogAspect가 있으면 CGLIB 프록시(OrderService$$SpringCGLIB$$0), 없으면 우리 클래스 그대로': PXY ? (f.beanProxy === 'true' && f.beanClass === 'app.OrderService$$SpringCGLIB$$0') : (f.beanProxy === 'false' && f.beanClass === 'app.OrderService'),
    '프록시는 OrderService를 상속한 클래스이고 진짜 OrderService 객체를 참조로 갖고 있다(둘은 다른 객체)': PXY ? (f.isSub === 'true' && f.super === 'app.OrderService' && f.targetClass === 'app.OrderService' && f.targetSame === 'false') : (f.isSub === 'false' && f.targetClass === '-'),
    '@Autowired로 받은 객체는 스프링이 보관한 그 빈과 같은 객체, new로 만든 객체는 다른 객체': f.same === String(bean),
    '부른 객체의 클래스: 프록시를 거칠 때만 CGLIB 프록시': (f.usedCglib === 'true') === (PXY && bean) && (PXY && bean ? true : f.usedClass === 'app.OrderService'),
    '컨테이너 안의 프록시 개수(모형 proxies와 같음)': f.proxies === String(PXY ? 1 : 0) && fin.proxies === +f.proxies,
    '트랜잭션 시작·커밋 횟수(모형 begins, commits와 같음), 롤백 없음': f.begins === String(TX && bean ? 1 : 0) && f.commits === f.begins && f.rollbacks === '0' && fin.begins === +f.begins && fin.commits === +f.commits,
    '트랜잭션을 시작할 때 연결한 DB는 H2, 트랜잭션 매니저는 DataSourceTransactionManager': (TX && bean ? f.db === 'H2' : f.db === '-') && f.tmClass === 'org.springframework.jdbc.datasource.DataSourceTransactionManager',
    'LogAspect 클래스를 두면 컨테이너에 logAspect 빈이 있고, 아니면 없다': f.aspectBean === String(LOG),
    'Caller 객체는 프록시가 아니다': f.callerClass === 'app.Caller',
  };
  for (const [name, pass] of Object.entries(checks)) { extraAll++; if (pass) extraOk++; else { good = false; console.log('사실 불일치: ' + k + ' / ' + name); } }
  if (good) ok++;
}
console.log('일치 ' + ok + ' / ' + n);
console.log('화면 문장이 기대는 사실 ' + extraOk + ' / ' + extraAll);

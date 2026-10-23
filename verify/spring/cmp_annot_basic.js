// 기초개념 "애너테이션" 실습(표준 애너테이션 중심)의 모형 결과를 실제 실행 결과(annot_basic_probe.out.txt)와 대조한다.
// 순서: node verify/spring/annot_basic_probe_src.js → AnnotBasicProbe 실행 → node verify/spring/cmp_annot_basic.js
// 대조: 결과 표 세 열, 화면의 코드(Probe가 컴파일한 글이 지금의 code 함수와 같은지), 단계 문장이 기대는 사실(예외 메시지, 컴파일 오류 문구,
//       빈 이름, @Repository·@Controller·@Component도 빈이 되는지, 실제 선언과 화면 주석의 선언이 같은지, class 파일에 남는 것)
const fs = require('fs'), path = require('path');
const { load } = require('../model_rows.js');
const l = load('annot_basic');
const lines = fs.readFileSync(path.join(__dirname, 'annot_basic_probe.out.txt'), 'utf8').split(/\r?\n/).filter(Boolean);
console.log(lines[0]);
const parse = v => { const f = {}; v.split('|').forEach(p => { const i = p.indexOf('='); f[p.slice(0, i)] = p.slice(i + 1); }); return f; };
const facts = {};
lines.filter(x => x.startsWith('FACT ')).forEach(x => { const i = x.indexOf(' => '); facts[x.slice(5, i)] = x.slice(i + 4); });
const SECOND = { service: 'spring', override: 'typo', test: 'junit', run: 'reader' };
let ok = 0, n = 0, factOk = 0, factAll = 0;
const fact = (name, pass) => { factAll++; if (pass) factOk++; else console.log('사실 불일치: ' + name); };
for (const ln of lines.slice(1).filter(x => !x.startsWith('FACT '))) {
  n++;
  const i0 = ln.indexOf(' => '), key = ln.slice(0, i0), f = parse(ln.slice(i0 + 4));
  const [who, putS, xS] = key.split('-'), put = putS === 'true', x = xS === 'true';
  const c = { who, put: who === 'decl' ? true : put, spring: true, typo: false, junit: true, reader: true };
  if (SECOND[who]) c[SECOND[who]] = x;
  const sim = l.simulate(Object.assign({}, c)), texts = sim.events.map(e => e.s).concat(sim.summary).join(' ');
  let real;
  if (who === 'service') {
    const exc = f.exc !== '-' ? f.exc.split(':')[0].split('.').pop() : '';
    real = [x ? '스프링(컴포넌트 스캔)' : '없음(스프링을 시작하지 않음)', exc ? exc + '으로 멈춤' : '"' + f.out + '" 출력',
      put && x && f.exit === '0' && /names=orderService\|/.test(facts.beanNames) ? 'OrderService 객체가 빈으로 등록됨' : '없음'];
    if (exc) fact(key + ': 단계 문장의 예외 메시지가 실제와 같다', texts.includes(f.exc.slice(f.exc.indexOf(': ') + 2)));
  } else if (who === 'override') {
    const ce = f.compile === 'ERR';
    real = ['컴파일러(javac)', ce ? '컴파일 오류(재정의가 아님)' : /^Order@[0-9a-f]+$/.test(f.out) ? '"Order@…" 출력(Object의 toString)' : '"' + f.out + '" 출력',
      ce ? '컴파일러가 실수를 찾아 컴파일을 멈춤' : put ? '컴파일러가 재정의인지 확인함(맞음)' : '없음(컴파일러가 확인하지 않음)'];
    if (ce) fact(key + ': 단계 문장의 컴파일 오류 문구가 실제와 같다', texts.includes('"' + f.err + '"'));
    if (put && !ce) fact(key + ': @Override는 class 파일(Order.class)에 남지 않는다', f.classHasOverride === 'false');
  } else if (who === 'test') {
    real = [x ? 'JUnit' : '없음(main에서 직접 부름)',
      x ? (f.found === '1' && f.succeeded === '1' && f.failed === '0' ? '테스트 1개 실행, 통과' : f.found === '0' ? '찾은 테스트 0개, 실행 안 됨' : '?') : '"' + f.out + '" 출력',
      x && f.found === '1' && f.out === 'total 실행' ? 'JUnit이 total()을 테스트로 찾아 부름' : '없음'];
    if (x && !put) fact(key + ': JUnit이 total()을 부르지 않았다(출력 없음)', f.out === '');
  } else if (who === 'decl') {
    const svc = f.javapVisible === 'true' && f.javapService === 'true', ov = f.javapOverride === 'false' && f.bytesOverride === 'false';
    real = [sim.row[0], svc ? 'class 파일에 @Service만 남음(javap)' : '?', ov ? '@Override는 SOURCE라 버려짐' : '?'];
    fact('decl: javap에 RuntimeInvisibleAnnotations가 없다(CLASS로 남긴 것 없음)', f.javapInvisible === 'false');
  } else {
    real = [x ? '우리가 쓴 for 문' : '없음', f.out ? '"' + f.out + '" 출력' : '아무것도 출력되지 않음', f.out === 'work 실행' ? 'for 문이 work()를 찾아 부름' : '없음'];
  }
  const probs = [];
  if (f.compile !== 'OK' && !(who === 'override' && put && x)) probs.push('컴파일되어야 하는데 실패: ' + f.err);
  if (JSON.stringify(sim.row) !== JSON.stringify(real)) probs.push('표 모형 ' + sim.row.join(' | ') + '\n   실제 ' + real.join(' | '));
  const screen = (f.screen || '').replace(/\\n/g, '\n').replace(/¦/g, '|');
  if (screen !== l.code(Object.assign({}, c))) probs.push('화면의 코드가 Probe가 컴파일한 글과 다름(annot_basic_probe_src.js와 Probe를 다시 돌릴 것)');
  if (!probs.length) ok++; else console.log('다름: ' + key + '\n   ' + probs.join('\n   '));
}
// 화면 문장이 기대는 사실
fact('컴포넌트 스캔이 등록한 빈 이름은 orderService 하나이고 싱글톤이다', facts.beanNames === 'names=orderService|singleton=true');
['Repository', 'Controller', 'Component'].forEach(s => fact('@' + s + '로 바꿔도 getBean이 성공하고 "주문 서비스"가 출력된다', /compile=OK\|exit=0\|out=주문 서비스\|exc=-/.test(facts['stereotype=' + s])));
fact('메서드 위에 @Service를 붙이면 컴파일 오류다(@Target(TYPE))', /compile=ERR\|err=annotation interface not applicable/.test(facts.serviceOnMethod));
const declCode = l.code({ who: 'decl', put: true });
fact('화면 주석의 @Service 선언이 실제와 같다(@Target(TYPE) @Retention(RUNTIME) @Documented @Component, 요소는 value)', facts['decl Service'] === '@Target[TYPE] @Retention(RUNTIME) @Documented @Component elements=value'
  && /\/\/     @Target\(ElementType\.TYPE\)\n\/\/     @Retention\(RetentionPolicy\.RUNTIME\)\n\/\/     @Documented\n\/\/     @Component\n\/\/     public @interface Service/.test(declCode));
fact('화면 주석의 @Override 선언이 실제와 같다(@Target(METHOD) @Retention(SOURCE), 요소 없음)', facts['decl Override'] === '@Target[METHOD] @Retention(SOURCE) elements=-'
  && /\/\/     @Target\(ElementType\.METHOD\)\n    \/\/     @Retention\(RetentionPolicy\.SOURCE\)\n    \/\/     public @interface Override \{ \}/.test(declCode));
fact('@Repository와 @Controller의 선언에도 @Component가 붙어 있다', / @Component /.test(facts['decl Repository'] + ' ') && / @Component /.test(facts['decl Controller'] + ' '));
fact('@Test는 RUNTIME으로 선언되어 있다', /@Retention\(RUNTIME\)/.test(facts['decl Test']));
// 용어 풀이(kb_annot_basic.js)가 기대는 사실
fact('메타 애너테이션: @Service가 붙은 클래스에 isAnnotationPresent(Component.class)는 false, 스프링의 AnnotatedElementUtils는 true', facts.metaRead === 'reflectService=true|reflectComponent=false|springComponent=true');
fact('@RestController의 선언에 @Controller가, @SpringBootApplication의 선언에 @ComponentScan이 붙어 있다', / @Controller /.test(facts['decl RestController'] + ' ') && / @ComponentScan /.test(facts['decl SpringBootApplication'] + ' '));
console.log('일치 ' + ok + ' / ' + n);
console.log('화면 문장이 기대는 사실 ' + factOk + ' / ' + factAll);

// "애너테이션" 실습(annot)의 모형 결과를 실제 컴파일·실행 결과(annot_probe.out.txt, annot_probe.js가 만든다)와 대조한다.
// 조합마다: 결과 표의 네 칸, 오류가 난 줄과 메시지, 실행한 코드가 지금 화면의 코드와 같은가(해시),
// 그리고 단계 문장이 기대는 사실(프록시 클래스, 자동 프록시 생성기, 트랜잭션 시작·커밋 횟수, class 파일에 적힌 칸, JUnit이 찾은 테스트 수, 경고·오류 메시지)을 본다.
// 끝에 표준 애너테이션의 실제 선언(@Retention, @Target)이 글과 같은지 본다.
// 숨겨진 설정을 곱한 모든 설정에서도 같은 조합이면 같은 결과인지 본다.
'use strict';
const fs = require('fs'), path = require('path'), crypto = require('crypto');
const { load, combos } = require('../model_rows.js');
const lesson = load('annot');
const lines = fs.readFileSync(path.join(__dirname, 'annot_probe.out.txt'), 'utf8').split(/\r?\n/).filter(Boolean);
console.log(lines[0]);
const AXES = { tx: ['txAnn', 'enable', 'get'], test: ['sub'], retention: ['misplace'], override: ['typo', 'ov'], deprecated: ['old'], funcif: ['fi', 'two'], custom: ['ret'] };
const keyOf = c => c.topic + '|' + AXES[c.topic].map(k => k + '=' + c[k]).join(',');
const real = {}, facts = [];
for (const ln of lines.slice(1)) {
  if (ln.startsWith('FACT ')) { facts.push(ln.slice(5)); continue; }
  const i = ln.indexOf(' => '), f = {};
  ln.slice(i + 4).split('|').forEach(p => { const j = p.indexOf('='); f[p.slice(0, j)] = p.slice(j + 1); });
  real[ln.slice(0, i)] = f;
}
const parse = k => { const [topic, rest] = k.split('|'), c = { topic }; rest.split(',').forEach(p => { const [a, b] = p.split('='); c[a] = b === 'true' ? true : b === 'false' ? false : b; }); return c; };

let ok = 0, n = 0, factOk = 0, factAll = 0;
const fact = (name, pass, k) => { factAll++; if (pass) factOk++; else console.log('사실 불일치: ' + k + ' / ' + name); return pass; };
for (const k of Object.keys(real)) {
  n++;
  const f = real[k], c0 = parse(k), base = {}; lesson.controls.forEach(d => { base[d.id] = d.value; });
  const c = Object.assign(base, c0), sim = lesson.simulate(Object.assign({}, c));
  const diags = f.diag ? f.diag.split(' ;; ').map(d => { const m = /^(\d+):(error|warning):(.*?):((?:\[removal\] |incompatible types: |annotation |method |Unexpected ).*)$/.exec(d); return m ? { line: m[3], kind: m[2], msg: m[4] } : { line: '?', kind: '?', msg: d }; }) : [];
  const errs = diags.filter(d => d.kind === 'error'), warns = diags.filter(d => d.kind === 'warning');
  const annos = f.annos ? f.annos.split(' ') : [], out = f.out ? f.out.split('\\n').filter(l => !l.startsWith('#JUNIT')) : [];
  const has = a => annos.includes(a), tx = f.tx || '', junit = /#JUNIT found=(\d+) started=(\d+) succeeded=(\d+) failed=(\d+)/.exec(f.out || '');
  let want;
  if (f.comp === 'ERR') {
    const reader = c.topic === 'funcif' && !errs.some(e => e.line === '@FunctionalInterface') ? '(붙이지 않음)' : '컴파일러 (오류로 알림)';
    want = ['오류', '(컴파일 안 됨)', reader, '(실행 못 함)'];
  } else {
    const comp = warns.length ? '성공 (경고)' : '성공';
    let vis, reader;
    if (c.topic === 'tx') { vis = has('OrderService.order():V:@Transactional') ? '보임' : '(붙이지 않음)'; reader = /begins=1 commits=1/.test(tx) && c.get === 'bean' && out.includes('order 실행, 트랜잭션 안인가: true') ? '스프링 (프록시로 트랜잭션)' : '없음'; }
    else if (c.topic === 'test') { vis = has('CalcTest.adds():V:@Test') ? '보임' : '?'; reader = 'JUnit (테스트 ' + junit[3] + '개 실행)'; }
    else if (c.topic === 'retention') { vis = annos.filter(a => /:V:/.test(a)).join(' ') === 'PriceService.save():V:@Transactional' ? '@Transactional만 보임' : '?'; reader = 'main의 리플렉션 코드 (읽기만 함)'; }
    else if (c.topic === 'override') { vis = c.ov ? (annos.length === 0 ? '보이지 않음 (SOURCE)' : '?') : '(붙이지 않음)'; reader = c.ov ? '컴파일러 (확인 통과)' : '없음'; }
    else if (c.topic === 'deprecated') { vis = c.old ? (facts.includes('Integer(int) @Deprecated since=9 forRemoval=true') ? '보임 (Integer(int)의 @Deprecated)' : '?') : (facts.includes('Integer.valueOf(int) @Deprecated=false') ? '(붙어 있지 않음)' : '?'); reader = warns.length ? '컴파일러 (경고)' : '없음'; }
    else if (c.topic === 'funcif') { vis = has('PriceRule.(class):V:@FunctionalInterface') ? '보임' : '(붙이지 않음)'; reader = c.fi ? '컴파일러 (확인 통과)' : '없음'; }
    else { vis = has('Service.work():V:@Timed') ? '보임' : has('Service.work():I:@Timed') ? '보이지 않음 (CLASS)' : '?'; reader = out[0] === '@Timed가 보이는가: true' ? 'main의 리플렉션 코드' : '없음 (찾지 못함)'; }
    want = [comp, vis, reader, out.join(' / ')];
  }
  let good = JSON.stringify(sim.row) === JSON.stringify(want);
  if (!good) console.log('다름: ' + k + '\n   모형 ' + sim.row.join(' | ') + '\n   실제 ' + want.join(' | '));
  const wantLine = errs.length ? errs[0].line : '', wantMsg = errs.length ? errs[0].msg : '';
  if (!(wantLine === '' ? sim.errLine === '' : wantLine.startsWith(sim.errLine) && sim.errLine !== '') || sim.msg !== wantMsg) { good = false; console.log('오류 줄·메시지 다름: ' + k + '\n   모형 [' + sim.errLine + '] [' + sim.msg + ']\n   실제 [' + wantLine + '] [' + wantMsg + ']'); }
  if (f.code !== crypto.createHash('sha1').update(lesson.code(c)).digest('hex').slice(0, 12)) { good = false; console.log('실행한 코드가 지금 화면의 코드와 다름(프로브를 다시 돌릴 것): ' + k); }
  if (f.comp === 'OK' && f.exit !== '0') { good = false; console.log('종료 코드가 0이 아님: ' + k); }
  // 단계 문장이 기대는 사실
  const steps = sim.events.map(e => e.s).join('\n');
  if (c.topic === 'tx') {
    const proxy = c.txAnn && c.enable;
    good = fact('스프링이 받은 빈: @Transactional과 @EnableTransactionManagement가 함께 있을 때만 OrderService를 상속한 프록시', /isAopProxy=(\w+) superclass=(\w+)/.exec(tx).slice(1).join() === (proxy ? 'true,OrderService' : 'false,Object'), k) && good;
    good = fact('화면 출력의 클래스 이름: 스프링에게서 받은 프록시면 OrderService$$SpringCGLIB$$0', out[1] === 'service의 클래스: ' + (proxy && c.get === 'bean' ? 'OrderService$$SpringCGLIB$$0' : 'OrderService'), k) && good;
    good = fact('@EnableTransactionManagement가 자동 프록시 생성기 InfrastructureAdvisorAutoProxyCreator를 등록', tx.includes('autoProxyCreator=' + (c.enable ? 'InfrastructureAdvisorAutoProxyCreator' : '-')), k) && good;
    good = fact('스프링의 AnnotationTransactionAttributeSource가 order()에서 읽은 트랜잭션 속성', tx.includes('txAttr=' + (c.txAnn ? 'PROPAGATION_REQUIRED,ISOLATION_DEFAULT' : 'null')), k) && good;
    good = fact('프록시를 거친 호출 한 번에 트랜잭션 시작 1, 커밋 1, 롤백 0 (프록시가 없으면 0, 0, 0)', tx.includes(proxy ? 'begins=1 commits=1 rollbacks=0' : 'begins=0 commits=0 rollbacks=0'), k) && good;
    good = fact('단계 문장의 프록시 클래스 이름과 자동 프록시 생성기 이름', !c.enable || (steps.includes('InfrastructureAdvisorAutoProxyCreator') && (!c.txAnn || steps.includes('OrderService$$SpringCGLIB$$0'))), k) && good;
  }
  if (c.topic === 'test') good = fact('JUnit이 찾은 테스트 수 = @Test를 붙인 메서드 수, 모두 통과', junit && junit[1] === (c.sub ? '2' : '1') && junit[3] === junit[1] && junit[4] === '0', k) && good;
  if (c.topic === 'retention' && !c.misplace) good = fact('class 파일: toString 기록 없음, round는 보이지 않는 칸에 @Contract, save는 보이는 칸에 @Transactional', annos.join(' ') === 'PriceService.round():I:@Contract PriceService.save():V:@Transactional', k) && good;
  if (c.topic === 'override' && c.ov && !c.typo) good = fact('@Override는 Dog.class에 적히지 않는다', annos.length === 0, k) && good;
  if (c.topic === 'deprecated' && c.old) good = fact('경고 하나, 메시지가 단계 문장과 같다', warns.length === 1 && steps.includes('"warning: ' + warns[0].msg + '"'), k) && good;
  if (c.topic === 'funcif' && c.fi && c.two) good = fact('오류 둘: @FunctionalInterface 줄과 람다를 쓴 줄', errs.length === 2 && errs[1].line.startsWith('PriceRule half'), k) && good;
  if (c.topic === 'custom') good = fact('@Retention을 적지 않으면 Service.class의 보이지 않는 칸, RUNTIME이면 보이는 칸', has('Service.work():' + (c.ret === 'RUNTIME' ? 'V' : 'I') + ':@Timed'), k) && good;
  if (good) ok++;
}
// 글이 기대는 표준 애너테이션의 선언
const DECL = [
  ['java.lang.Override retention=SOURCE target=[METHOD]', '@Target(ElementType.METHOD)와 @Retention(RetentionPolicy.SOURCE)'],
  ['org.springframework.transaction.annotation.Transactional retention=RUNTIME target=[TYPE, METHOD]', '@Target({ElementType.TYPE, ElementType.METHOD})와 @Retention(RetentionPolicy.RUNTIME)'],
  ['org.junit.jupiter.api.Test retention=RUNTIME target=[ANNOTATION_TYPE, METHOD]', '@Target({ElementType.ANNOTATION_TYPE, ElementType.METHOD})와 @Retention(RetentionPolicy.RUNTIME)'],
  ['org.springframework.lang.Contract retention=none target=[METHOD]', '@Retention을 적지 않아 기본값 CLASS'],
  ['java.lang.FunctionalInterface retention=RUNTIME target=[TYPE]', '@FunctionalInterface의 선언은 @Retention(RetentionPolicy.RUNTIME)'],
  ['java.lang.Deprecated retention=RUNTIME target=[CONSTRUCTOR, FIELD, LOCAL_VARIABLE, METHOD, PACKAGE, MODULE, PARAMETER, TYPE]', '@Deprecated의 선언에는 @Retention(RetentionPolicy.RUNTIME)'],
  ['Integer(int) @Deprecated since=9 forRemoval=true', '@Deprecated(since = "9", forRemoval = true)'],
  ['Runnable @FunctionalInterface=true Comparator @FunctionalInterface=true', '자바의 Runnable과 Comparator에도 붙어 있습니다'],
];
const allText = JSON.stringify(lesson.presets) + Object.keys(real).map(k => { const b = {}; lesson.controls.forEach(d => { b[d.id] = d.value; }); return lesson.simulate(Object.assign(b, parse(k))).events.map(e => e.s).join('\n'); }).join('\n') + lesson.code(Object.assign({}, ...lesson.controls.map(d => ({ [d.id]: d.value })), { topic: 'deprecated' }));
for (const [fa, txt] of DECL) fact('표준 선언: ' + fa + ' / 글: ' + txt, facts.includes(fa) && allText.includes(txt), 'FACT');
// 숨겨진 설정: 같은 조합이면 숨겨진 설정이 달라도 결과 표가 같다
let settings = 0, hiddenBad = 0;
for (const c of combos(lesson)) {
  settings++;
  const b = {}; lesson.controls.forEach(d => { b[d.id] = d.value; }); AXES[c.topic].forEach(a => { b[a] = c[a]; }); b.topic = c.topic;
  if (JSON.stringify(lesson.simulate(Object.assign({}, c)).row) !== JSON.stringify(lesson.simulate(b).row)) hiddenBad++;
}
console.log('숨겨진 설정까지 곱한 설정 ' + settings + '가지 중 결과가 숨겨진 설정에 따라 달라진 것 ' + hiddenBad + '가지');
console.log('일치 ' + ok + ' / ' + n);
console.log('화면 문장이 기대는 사실 ' + factOk + ' / ' + factAll);

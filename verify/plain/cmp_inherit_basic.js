// 기초개념 "상속" 실습의 모형 결과를 실제 javac 컴파일과 java 실행 결과(inherit_basic_probe.out.txt)와 대조한다
// (2026-10-22, Object·RuntimeException 중심으로 다시 짠 판. 옛 판의 결과 InheritBasicProbe.out.txt는 그대로 둔다.)
// 순서: node verify/plain/inherit_basic_probe_src.js
//       java -Dstdout.encoding=UTF-8 verify/plain/InheritBasicProbe.java verify/out/inherit_basic_std > verify/plain/inherit_basic_probe.out.txt
//       node verify/plain/cmp_inherit_basic.js
// 대조: 결과 표 세 열, 오류의 개수, 오류가 난 줄, 컴파일 실패일 때 Main.class가 없는 것, 실행했으면 종료 코드 0과 표준 오류 없음,
//       Probe가 컴파일한 소스가 지금 화면의 코드(code 함수)와 같은 글인지, 단계 문장에 실제 javac 메시지가 들어 있는지,
//       그리고 단계 문장이 말하는 사실(# fact 줄)
const fs = require('fs'), path = require('path');
const { load } = require('../model_rows.js');
const { combos, base } = require('./inherit_basic_probe_src.js');
const lesson = load('inherit_basic');
const all = fs.readFileSync(path.join(__dirname, 'inherit_basic_probe.out.txt'), 'utf8').split(/\r?\n/).filter(Boolean);
console.log(all[0]);
const facts = all.filter(l => l.startsWith('# fact ')).join('\n'), lines = all.filter(l => !l.startsWith('#'));
// 실제 javac의 첫 오류(진단 코드와 영어 메시지 첫 줄) -> 화면에 적는 한국어. 이 표에 없는 진단이 나오면 모형이 모르는 오류이므로 다름으로 센다
const KO = [
  ['compiler.err.method.does.not.override.superclass', /^method does not override or implement a method from a supertype$/, lesson.errOverride],
  ['compiler.err.prob.found.req', /^incompatible types: Member cannot be converted to java\.lang\.String$/, lesson.errFit],
  ['compiler.err.cant.apply.symbol', /^constructor Object in class java\.lang\.Object cannot be applied to given types;$/, lesson.errSuperObj],
  ['compiler.err.cant.apply.symbol', /^constructor MemberNotFoundException in class MemberNotFoundException cannot be applied to given types;$/, lesson.errCtor],
  ['compiler.err.prob.found.req', /^incompatible types: MemberNotFoundException cannot be converted to java\.lang\.Throwable$/, lesson.errThrow],
];
let ok = 0;
const seen = new Set();
for (const { key, c } of combos()) {
  seen.add(key);
  const ln = lines.find(l => l.startsWith(key + ' => '));
  if (!ln) { console.log('다름: ' + key + ' 결과 줄이 없음'); continue; }
  const f = ln.split(' => ')[1].split('|');
  const [res, code, n, mainClass, ran, out, msg] = f, exit = f[f.length - 2], err1 = f[f.length - 1], where = f.slice(7, -2).join('|');
  const sim = lesson.simulate(Object.assign({}, c)), row = sim.row;
  const ko = KO.find(k => k[0] === code && k[1].test(msg));
  const real = res === 'OK'
    ? ['성공', '없음', ran === 'true' ? out : '(실행 안 됨)']
    : ['오류', ko ? ko[2] : '(모르는 오류 ' + code + ' / ' + msg + ')', '실행할 수 없음'];
  const probs = [];
  if (JSON.stringify(row) !== JSON.stringify(real)) probs.push('표 모형 ' + row.join(' | ') + '\n   실제 ' + real.join(' | '));
  if (sim.nerr !== +n) probs.push('오류 개수 모형 ' + sim.nerr + ' 실제 ' + n);
  const realAt = res === 'OK' ? [] : where.split(' ## ');
  if (JSON.stringify(sim.errAt) !== JSON.stringify(realAt)) probs.push('오류가 난 줄 모형 ' + JSON.stringify(sim.errAt) + ' 실제 ' + JSON.stringify(realAt));
  if ((mainClass === 'true') !== (res === 'OK')) probs.push('Main.class 생성 여부가 컴파일 결과와 다름: ' + mainClass);
  if (res === 'OK' && (exit !== '0' || err1 !== '-')) probs.push('실행이 정상 종료가 아님: 종료 코드 ' + exit + ', 표준 오류 ' + err1);
  const src = fs.readFileSync(path.join(base, key, 'Main.java'), 'utf8').replace(/\r\n/g, '\n').trimEnd();
  if (src !== lesson.code(c)) probs.push('화면의 코드와 Probe가 컴파일한 소스가 다름 (inherit_basic_probe_src.js부터 다시 돌릴 것)');
  // 단계 문장에 적은 javac 영어 메시지가 실제 첫 오류 메시지(패키지 이름과 끝의 ;를 뺀 것)와 맞는지
  if (res !== 'OK') { const short = msg.replace(/java\.lang\./g, '').replace(/;$/, ''); if (!sim.events.some(e => e.s.includes(short))) probs.push('단계 문장에 실제 메시지가 없음: ' + short); }
  if (!probs.length) ok++; else console.log('다름: ' + key + '\n   ' + probs.join('\n   '));
}
const extra = lines.map(l => l.split(' => ')[0]).filter(k => !seen.has(k));
if (extra.length) console.log('주의: 조합 목록에 없는 결과 줄 ' + extra.join(', '));
// 단계 문장과 assume이 말하는 사실
const FACTS = [
  [/# fact Member superclass: java\.lang\.Object$/m, 'extends를 적지 않은 Member의 부모는 Object'],
  [/# fact Member\(none\) toString\/equals\/hashCode\/getClass declared in: java\.lang\.Object\/java\.lang\.Object\/java\.lang\.Object\/java\.lang\.Object$/m, 'Member는 toString, equals, hashCode, getClass를 Object에게서 물려받음'],
  [/# fact Member\(ok\) toString declared in: Member$/m, '다시 적으면 toString은 Member의 것'],
  [/# fact Member\(typo_noann\) toString declared in: java\.lang\.Object \| tostring declared in: Member$/m, 'tostring은 새 메서드이고 toString은 Object의 것 그대로'],
  [new RegExp('# fact obj-none-Member reruns: ' + lesson.hashOut + ' / ' + lesson.hashOut + '( ;; ' + lesson.hashOut + ' / ' + lesson.hashOut + '){2}$', 'm'), '다시 실행해도 ' + lesson.hashOut + '이 나옴(이 환경에서)'],
  [/# fact MemberNotFoundException chain: MemberNotFoundException > java\.lang\.RuntimeException > java\.lang\.Exception > java\.lang\.Throwable > java\.lang\.Object$/m, 'RuntimeException > Exception > Throwable > Object로 이어짐'],
  [/# fact MemberNotFoundException getMessage declared in: java\.lang\.Throwable$/m, 'getMessage는 Throwable에 적혀 있음'],
  [/# fact RuntimeException public constructors: .*public java\.lang\.RuntimeException\(java\.lang\.String\)/, 'RuntimeException(String message) 생성자가 있음'],
  [/# fact no-ctor class compiles: OK \| constructors: MemberNotFoundException\(\)$/m, '생성자를 적지 않으면 인자 없는 생성자 하나만 생김'],
  // 아래는 용어 설명(kb/kb_inherit_basic.js)이 말하는 것
  [/# fact superclass of NullPointerException\/IllegalArgumentException\/ArithmeticException: java\.lang\.RuntimeException\/java\.lang\.RuntimeException\/java\.lang\.RuntimeException$/m, 'NullPointerException 등은 RuntimeException의 자식'],
  [/# fact unchecked throw without throws compiles: OK \| output: m=Member\(민수\) \/ Point\[x=1, y=2\]$/m, 'throws 없이 RuntimeException 자식을 던지는 메서드가 컴파일되고, 문자열 + 객체는 toString()을, record는 자동 toString()을 씀'],
  [/# fact extends A, B: ERR /, 'extends 뒤에 클래스 둘은 컴파일 오류'],
  [/# fact extends String: ERR compiler\.err\.cant\.inherit\.from\.final .*String is final: true$/m, 'final 클래스 String은 extends할 수 없음'],
];
let fok = 0;
FACTS.forEach(([re, what]) => { if (re.test(facts)) fok++; else console.log('사실 다름: ' + what); });
console.log('일치 ' + ok + ' / ' + combos().length + ', 사실 ' + fok + ' / ' + FACTS.length);

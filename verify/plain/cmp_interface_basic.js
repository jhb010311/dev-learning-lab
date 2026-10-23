// 기초개념 "인터페이스" 실습의 모형 결과를 실제 javac 컴파일과 실행 결과(interface_basic_probe.out.txt)와 대조한다
// (2026-10-22, 표준 List·Comparable 중심으로 다시 짠 판. 옛 판의 결과 InterfaceBasicProbe.out.txt는 그대로 둔다.)
// 순서: node verify/plain/interface_basic_probe_src.js
//       java verify/plain/InterfaceBasicProbe.java verify/out/interface_basic_std > verify/plain/interface_basic_probe.out.txt
//       node verify/plain/cmp_interface_basic.js
// 대조: 결과 표 세 열, 오류의 개수, 오류가 난 줄, 컴파일 실패일 때 Main.class가 없는 것,
//       Probe가 컴파일한 소스가 지금 화면의 코드(code 함수)와 같은 글인지, 그리고 단계 문장이 말하는 표준 라이브러리의 사실(# fact 줄)
const fs = require('fs'), path = require('path');
const { load } = require('../model_rows.js');
const { combos, base } = require('./interface_basic_probe_src.js');
const lesson = load('interface_basic');
const all = fs.readFileSync(path.join(__dirname, 'interface_basic_probe.out.txt'), 'utf8').split(/\r?\n/).filter(Boolean);
console.log(all[0]);
const facts = all.filter(l => l.startsWith('# fact ')).join('\n'), lines = all.filter(l => !l.startsWith('#'));
// 실제 javac의 진단 코드와 영어 메시지 첫 줄 -> 화면에 적는 한국어 (이 표에 없는 진단이 나오면 모형이 모르는 오류이므로 다름으로 센다)
const KO = [
  ['compiler.err.abstract.cant.be.instantiated', /^java\.util\.List is abstract; cannot be instantiated$/, lesson.errNew],
  ['compiler.err.cant.resolve.location.args', /^cannot find symbol$/, lesson.errTrim],
  ['compiler.err.prob.found.req', /^incompatible types: cannot infer type arguments for java\.util\.LinkedList<>$/, lesson.errFit],
  ['compiler.err.cant.apply.symbols', /^no suitable method found for sort\(java\.util\.List<Member>\)$/, lesson.errSort],
  ['compiler.err.does.not.override.abstract', /^Member is not abstract and does not override abstract method compareTo\(Member\) in java\.lang\.Comparable$/, lesson.errMiss],
];
let ok = 0;
const seen = new Set();
for (const { key, c } of combos()) {
  seen.add(key);
  const ln = lines.find(l => l.startsWith(key + ' => '));
  if (!ln) { console.log('다름: ' + key + ' 결과 줄이 없음'); continue; }
  const f = ln.split(' => ')[1].split('|');
  const [res, code, n, mainClass, ran, out, msg] = f, where = f.slice(7).join('|');
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
  const src = fs.readFileSync(path.join(base, key, 'Main.java'), 'utf8').replace(/\r\n/g, '\n').trimEnd();
  if (src !== lesson.code(c)) probs.push('화면의 코드와 Probe가 컴파일한 소스가 다름 (interface_basic_probe_src.js부터 다시 돌릴 것)');
  // 단계 문장에 적은 javac 영어 메시지가 실제 메시지(패키지 이름을 뺀 것)와 맞는지
  if (res !== 'OK') { const short = msg.replace(/java\.(util|lang)\./g, ''); if (!sim.events.some(e => e.s.includes(short))) probs.push('단계 문장에 실제 메시지가 없음: ' + short); }
  if (!probs.length) ok++; else console.log('다름: ' + key + '\n   ' + probs.join('\n   '));
}
const extra = lines.map(l => l.split(' => ')[0]).filter(k => !seen.has(k));
if (extra.length) console.log('주의: 조합 목록에 없는 결과 줄 ' + extra.join(', '));
// 단계 문장과 assume이 말하는 표준 라이브러리의 사실
const FACTS = [
  [/# fact List: public abstract interface java\.util\.List<E> \| isInterface=true/, 'List는 인터페이스(public interface List<E>)'],
  [/# fact Comparable: public abstract interface java\.lang\.Comparable<T> \| isInterface=true \| abstract methods=public abstract int java\.lang\.Comparable\.compareTo\(T\)$/m, 'Comparable은 인터페이스이고 추상 메서드는 compareTo 하나'],
  [/# fact ArrayList: isInterface=false \| extends AbstractList \| implements List, RandomAccess, Cloneable, Serializable$/m, 'ArrayList extends AbstractList implements List, RandomAccess, Cloneable, Serializable'],
  [/# fact LinkedList: isInterface=false \| extends AbstractSequentialList \| implements List, Deque, Cloneable, Serializable$/m, 'LinkedList extends AbstractSequentialList implements List, Deque, Cloneable, Serializable'],
  [/# fact String implements .*Comparable.* \| Comparable\? true/, 'String은 Comparable을 구현'],
  [/# fact trimToSize: ArrayList=true List=false/, 'trimToSize는 ArrayList에 있고 List에 없음'],
  [/# fact List add\/get\/size: true\/true\/true/, 'List에 add, get, size가 있음'],
  [/# fact List default methods: .*replaceAll.*sort/, 'List의 default 메서드에 sort, replaceAll이 있음'],
  [/# fact Collections\.sort: public static <T extends java\.lang\.Comparable<\? super T>> void java\.util\.Collections\.sort\(java\.util\.List<T>\)/, 'Collections.sort의 선언'],
  [/# fact extends A, B: ERR/, 'extends 뒤에 클래스 둘은 컴파일 오류'],
  [/# fact implements I, J: OK/, 'implements 뒤에 인터페이스 둘은 컴파일됨'],
];
let fok = 0;
FACTS.forEach(([re, what]) => { if (re.test(facts)) fok++; else console.log('사실 다름: ' + what); });
console.log('일치 ' + ok + ' / ' + combos().length + ', 사실 ' + fok + ' / ' + FACTS.length);

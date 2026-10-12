// 기초개념 "람다" 실습의 모형 결과를 실제 javac 컴파일과 실행 결과(LambdaBasicProbe.out.txt)와 대조한다
// 대조: 결과 표 세 열, 오류의 개수, 오류가 난 줄, 컴파일 실패일 때 Main.class가 없는 것,
//       화면의 코드(code 함수)가 Probe가 컴파일한 소스(verify/out/lambda_basic/<조합>/Main.java)와 같은 글인지,
//       단계 문장이 기대는 사실("# fact" 줄: 람다 줄 직후에는 "일한다"가 출력되지 않았고, t는 Task를 구현한 객체)
const fs = require('fs'), path = require('path');
const { load } = require('../model_rows.js');
const lesson = load('lambda_basic');
const all = fs.readFileSync(path.join(__dirname, 'LambdaBasicProbe.out.txt'), 'utf8').split(/\r?\n/).filter(Boolean);
console.log(all[0]);
const facts = all.filter(l => l.startsWith('# fact ')), lines = all.slice(1).filter(l => !l.startsWith('# '));
// 실제 javac의 진단 코드 -> 화면에 적는 한국어 (이 표에 없는 코드가 나오면 모형이 모르는 오류이므로 다름으로 센다)
const KO = {
  'compiler.err.prob.found.req': 'Task는 메서드가 하나가 아니어서 람다로 쓸 수 없음',
  'compiler.err.does.not.override.abstract': 'Task의 stop 메서드를 작성하지 않았음',
};
// 영어 메시지도 함께 확인해, 코드와 메시지가 같은 오류를 가리키는지 본다
const MSG = {
  'compiler.err.prob.found.req': /^incompatible types: Task is not a functional interface ~\s+multiple non-overriding abstract methods found in interface Task$/,
  'compiler.err.does.not.override.abstract': /^(<anonymous Main\$1>|Work) is not abstract and does not override abstract method stop\(\) in Task$/,
};
let ok = 0, total = 0;
for (const ln of lines) {
  total++;
  const [k, v] = ln.split(' => '), [form, call, two] = k.split('|'), f = v.split('|');
  const [res, code, n, mainClass, ran, out, msg] = f, where = f.slice(7).join('|');
  const c = { form, call, two: two === 'true' };
  const sim = lesson.simulate(Object.assign({}, c)), row = sim.row;
  const real = res === 'OK'
    ? ['성공', '없음', ran === 'true' ? (out === '' ? '(아무것도 출력되지 않음)' : out) : '(실행 안 됨)']
    : ['오류', KO[code] || '(모르는 오류 ' + code + ')', '실행할 수 없음'];
  const probs = [];
  if (JSON.stringify(row) !== JSON.stringify(real)) probs.push('표 모형 ' + row.join(' | ') + '\n   실제 ' + real.join(' | '));
  if (res !== 'OK' && !(MSG[code] || /$^/).test(msg)) probs.push('오류 메시지가 코드와 맞지 않음: ' + code + ' / ' + msg);
  // 형식에 따라 오류의 종류가 정해진다: 람다는 prob.found.req, 클래스로 풀어 쓴 것은 does.not.override.abstract
  if (res !== 'OK' && code !== (form === 'lambda' ? 'compiler.err.prob.found.req' : 'compiler.err.does.not.override.abstract')) probs.push('형식과 오류 코드가 맞지 않음: ' + form + ' / ' + code);
  if (sim.nerr !== +n) probs.push('오류 개수 모형 ' + sim.nerr + ' 실제 ' + n);
  const realAt = res === 'OK' ? [] : where.split(' ## ');
  if (JSON.stringify(sim.errAt) !== JSON.stringify(realAt)) probs.push('오류가 난 줄 모형 ' + JSON.stringify(sim.errAt) + ' 실제 ' + JSON.stringify(realAt));
  if ((mainClass === 'true') !== (res === 'OK')) probs.push('Main.class 생성 여부가 컴파일 결과와 다름: ' + mainClass);
  // 단계 문장의 출력 순서: 준비가 먼저, 일한다는 t.run()을 부른 횟수만큼 그 뒤에
  if (res === 'OK') {
    const want = ['준비'].concat(Array(call === 'once' ? 1 : call === 'twice' ? 2 : 0).fill('일한다')).join(' / ');
    if (out !== want) probs.push('출력 순서가 기대와 다름: ' + out + ' (기대 ' + want + ')');
    const stepsOut = sim.events[sim.events.length - 1].snap.out.join(' / ');
    if (stepsOut !== out) probs.push('단계의 마지막 출력 ' + stepsOut + ' 이 실제 ' + out + ' 와 다름');
    if (sim.events[sim.events.length - 1].snap.runs !== (call === 'once' ? 1 : call === 'twice' ? 2 : 0)) probs.push('run 실행 횟수가 다름');
  }
  const srcFile = path.join(__dirname, '..', 'out', 'lambda_basic', [form, call, two].join('-'), 'Main.java');
  const src = fs.readFileSync(srcFile, 'utf8').replace(/\r\n/g, '\n').trimEnd();
  if (src !== lesson.code(c)) probs.push('화면의 코드와 Probe가 컴파일한 소스가 다름');
  if (!probs.length) ok++; else console.log('다름: ' + k + '\n   ' + probs.join('\n   '));
}
// 단계 문장이 기대는 사실
for (const ln of facts) {
  total++;
  const form = ln.split(' => ')[0].replace('# fact ', ''), v = ln.split(' => ')[1];
  const probs = [];
  if (!v.startsWith('직후 / ')) probs.push('객체를 담는 줄 직후에 이미 다른 것이 출력됨: ' + v);
  if (!/Task 구현 객체: true/.test(v)) probs.push('t가 Task를 구현한 객체가 아님');
  const anon = /익명 클래스: true/.test(v), named = /이름있음: true/.test(v);
  if (form === 'anon' && !anon) probs.push('익명 클래스가 아님');
  if (form === 'named' && !named) probs.push('Work 클래스가 아님');
  if (form === 'lambda' && (anon || named)) probs.push('람다 객체가 익명/Work 클래스의 객체임');
  if (!probs.length) ok++; else console.log('다름: ' + ln + '\n   ' + probs.join('\n   '));
}
console.log('일치 ' + ok + ' / ' + total);

// 기초개념 "람다" 실습(표준 중심판)의 모형 결과를 실제 javac 컴파일과 실행 결과(lambda_basic_probe.out.txt, LambdaBasicProbe.java가 만듦)와 대조한다
// 대조: 결과 표 세 열, 오류의 개수, 오류가 난 줄, 컴파일 실패일 때 Main.class가 없는 것,
//       화면의 코드(code 함수)가 Probe가 컴파일한 소스(verify/out/lambda_basic_std/<조합>/Main.java)와 같은 글인지,
//       모든 설정 조합(fix를 거친 것)이 Probe가 실행한 조합 안에 있는지,
//       단계 문장이 기대는 사실("# fact" 줄: 자바가 주는 인터페이스의 모양, 람다 줄 직후에는 출력이 없음, 실행한 스레드 이름, sort가 compare를 부른 횟수)
// 실행: node verify/plain/cmp_lambda_basic.js
const fs = require('fs'), path = require('path');
const { load, combos } = require('../model_rows.js');
const lesson = load('lambda_basic');
const all = fs.readFileSync(path.join(__dirname, 'lambda_basic_probe.out.txt'), 'utf8').split(/\r?\n/).filter(Boolean);
console.log(all[0]);
const facts = all.filter(l => l.startsWith('# fact ')), lines = all.slice(1).filter(l => !l.startsWith('# '));
const fact = key => { const f = facts.find(l => l.startsWith('# fact ' + key + ' => ')); return f ? f.split(' => ').slice(1).join(' => ') : null; };
// 실제 javac의 진단 코드 -> 화면에 적는 한국어 (이 표에 없는 코드가 나오면 모형이 모르는 오류이므로 다름으로 센다)
const KO = { 'compiler.err.prob.found.req': 'Task는 구현할 메서드가 둘이어서 람다로 쓸 수 없음' };
// 영어 메시지도 함께 확인해, 코드와 메시지가 같은 오류를 가리키는지 본다
const MSG = { 'compiler.err.prob.found.req': /^incompatible types: Task is not a functional interface ~\s+multiple non-overriding abstract methods found in interface Task$/ };
let ok = 0, total = 0;
const seen = new Set();
function report(name, probs) { total++; if (!probs.length) ok++; else console.log('다름: ' + name + '\n   ' + probs.join('\n   ')); }

for (const ln of lines) {
  const [k, v] = ln.split(' => '), [to, form, drop] = k.split('|'), f = v.split('|');
  const [res, code, n, mainClass, ran, out, msg] = f, where = f.slice(7).join('|');
  const c = { to, form, drop: drop === 'true' };
  seen.add(JSON.stringify(c));
  const sim = lesson.simulate(Object.assign({}, c)), row = sim.row;
  const real = res === 'OK'
    ? ['성공', '없음', ran === 'true' ? (out === '' ? '(아무것도 출력되지 않음)' : out) : '(실행 안 됨)']
    : ['오류', KO[code] || '(모르는 오류 ' + code + ')', '실행할 수 없음'];
  const probs = [];
  if (JSON.stringify(row) !== JSON.stringify(real)) probs.push('표 모형 ' + row.join(' | ') + '\n   실제 ' + real.join(' | '));
  if (res !== 'OK' && !(MSG[code] || /$^/).test(msg)) probs.push('오류 메시지가 코드와 맞지 않음: ' + code + ' / ' + msg);
  if (/\[exit|stderr/.test(out)) probs.push('실행이 오류로 끝났거나 표준 오류에 무언가 나옴: ' + out);
  if (sim.nerr !== +n) probs.push('오류 개수 모형 ' + sim.nerr + ' 실제 ' + n);
  const realAt = res === 'OK' ? [] : where.split(' ## ');
  if (JSON.stringify(sim.errAt) !== JSON.stringify(realAt)) probs.push('오류가 난 줄 모형 ' + JSON.stringify(sim.errAt) + ' 실제 ' + JSON.stringify(realAt));
  if ((mainClass === 'true') !== (res === 'OK')) probs.push('Main.class 생성 여부가 컴파일 결과와 다름: ' + mainClass);
  if (res === 'OK') {
    // 단계의 마지막 출력과 실행 횟수(run은 부르는 줄이 있으면 1번, sort의 compare는 fact로 잰 횟수)
    const snap = sim.events[sim.events.length - 1].snap;
    if (snap.out.join(' / ') !== out) probs.push('단계의 마지막 출력 ' + snap.out.join(' / ') + ' 이 실제 ' + out + ' 와 다름');
    const calls = fact('sortcalls'), want = to === 'sort' ? +((/불린 횟수 (\d+)/.exec(calls || '') || [])[1]) : (c.drop ? 0 : 1);
    if (snap.runs !== want) probs.push('실행 횟수 모형 ' + snap.runs + ' 실제 ' + want);
  }
  const src = fs.readFileSync(path.join(__dirname, '..', 'out', 'lambda_basic_std', [to, form, drop].join('-'), 'Main.java'), 'utf8').replace(/\r\n/g, '\n').trimEnd();
  if (src !== lesson.code(c)) probs.push('화면의 코드와 Probe가 컴파일한 소스가 다름');
  report(k, probs);
}
// 모든 설정 조합(fix를 거친 것)을 Probe가 실행했는가
for (const c of combos(lesson)) report('조합 ' + JSON.stringify(c), seen.has(JSON.stringify({ to: c.to, form: c.form, drop: c.drop })) ? [] : ['Probe가 실행하지 않은 조합']);

// 단계 문장이 기대는 사실
const F = [
  ['api Runnable', v => /인터페이스: true, 패키지: java\.lang, 구현할 메서드: run, @FunctionalInterface: true/.test(v)],
  ['api Comparator', v => /인터페이스: true, 패키지: java\.util, 구현할 메서드: compare, @FunctionalInterface: true, 본문 없이 선언된 equals도 있음: true/.test(v)],
  ['api Thread(Runnable)', v => v === 'true, List.sort(Comparator) => true'],
  ['after lambda', v => /^직후 \/ Runnable 구현 객체: true, 익명 클래스: false, 숨은 클래스: true/.test(v)],
  ['after anon', v => /^직후 \/ Runnable 구현 객체: true, 익명 클래스: true, 숨은 클래스: false, 클래스 이름: Main\$1$/.test(v)],
  ['after named', v => /^직후 \/ Runnable 구현 객체: true, 익명 클래스: false, 숨은 클래스: false, 클래스 이름: Work$/.test(v)],
  ...['lambda', 'anon', 'named'].map(f => ['where runnable ' + f, v => v === '준비 main / 일한다 main']),
  ...['lambda', 'anon', 'named'].map(f => ['where thread ' + f, v => v === '준비 main / 일한다 Thread-0']),
  // 단계 문장: compare는 4번 불렸고 첫 호출은 compare("가영", "다현"), 그 값은 음수
  ['sortcalls', v => /^\[다현, 가영, 나래\] \/ compare\(가영, 다현\) = -\d+ \//.test(v) && /불린 횟수 4 \/ \[가영, 나래, 다현\]$/.test(v)],
  ['task', v => v === '구현할 메서드: run, stop'],
];
for (const [key, test] of F) { const v = fact(key); report('# fact ' + key, v === null ? ['사실 줄이 없음'] : test(v) ? [] : ['기대와 다름: ' + v]); }
// 모형의 단계 문장이 사실과 같은 값을 말하는지(숫자·이름이 바뀌면 여기서 걸린다)
{
  const s = c => lesson.simulate(c).events.map(e => e.s).join('\n');
  const probs = [];
  if (!/compare는 4번 불렸고, 첫 번째 호출은 compare\("가영", "다현"\)였습니다/.test(s({ to: 'sort', form: 'lambda', drop: false }))) probs.push('sort 단계 문장의 횟수나 첫 호출이 다름');
  if (!/Thread-0/.test(s({ to: 'thread', form: 'lambda', drop: false }))) probs.push('thread 단계 문장에 Thread-0이 없음');
  if (!/main 스레드가 그대로 run을 실행합니다/.test(s({ to: 'runnable', form: 'lambda', drop: false }))) probs.push('runnable 단계 문장에 main 스레드가 없음');
  report('단계 문장의 값', probs);
}
console.log('일치 ' + ok + ' / ' + total);

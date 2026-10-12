// 기초개념 "메서드" 실습의 모형 결과를 실제 javac 컴파일과 실행 결과(MethodBasicProbe.out.txt)와 대조한다
// 대조: 결과 표 네 열(실행 횟수는 실제 출력의 "add 실행" 줄 수), 오류의 개수, 오류가 난 줄, 컴파일 실패일 때 Main.class가 없는 것,
//       화면의 코드(code 함수)가 Probe가 컴파일한 소스(verify/out/method_basic/<조합>/Main.java)와 같은 글인지,
//       단계 문장이 기대는 사실(FACT 줄: 실행은 main의 첫 줄부터이고 선언이 위에 있어도 먼저 실행되지 않는다)
const fs = require('fs'), path = require('path');
const { load, combos } = require('../model_rows.js');
const lesson = load('method_basic');
const lines = fs.readFileSync(path.join(__dirname, 'MethodBasicProbe.out.txt'), 'utf8').split(/\r?\n/).filter(Boolean);
console.log(lines[0]);
// 실제 javac의 진단 코드 -> 화면에 적는 한국어 (이 표에 없는 코드가 나오면 모형이 모르는 오류이므로 다름으로 센다)
const KO = {
  'compiler.err.cant.resolve.location.args': 'add라는 메서드를 찾을 수 없음',
  'compiler.err.cant.resolve': 'add라는 메서드를 찾을 수 없음',
  'compiler.err.cant.apply.symbol': 'add에 넘긴 값의 개수가 매개변수의 개수와 맞지 않음',
};
// 영어 메시지 첫 줄도 함께 확인해, 코드와 메시지가 같은 오류를 가리키는지 본다
const MSG = {
  'compiler.err.cant.resolve.location.args': /^cannot find symbol$/,
  'compiler.err.cant.resolve': /^cannot find symbol$/,
  'compiler.err.cant.apply.symbol': /^method add in class Main cannot be applied to given types;$/,
};
let ok = 0, total = 0, seen = 0;
for (const ln of lines.slice(1)) {
  if (ln.startsWith('FACT ')) continue;
  total++;
  const [k, v] = ln.split(' => '), [decl, call, args] = k.split('|'), f = v.split('|');
  const [res, code, n, mainClass, ran, out, msg] = f, where = f.slice(7).join('|');
  const c = { decl: decl === 'true', call, args };
  seen++;
  const sim = lesson.simulate(Object.assign({}, c)), row = sim.row;
  const real = res === 'OK'
    ? ['성공', '없음', ran === 'true' ? (out === '' ? '(아무것도 출력되지 않음)' : out) : '(실행 안 됨)', ran === 'true' ? out.split(' / ').filter(x => x === 'add 실행').length + '번' : '(실행 안 됨)']
    : ['오류', KO[code] || '(모르는 오류 ' + code + ')', '실행할 수 없음', '실행할 수 없음'];
  const probs = [];
  if (JSON.stringify(row) !== JSON.stringify(real)) probs.push('표 모형 ' + row.join(' | ') + '\n   실제 ' + real.join(' | '));
  if (res !== 'OK' && !(MSG[code] || /$^/).test(msg)) probs.push('오류 메시지가 코드와 맞지 않음: ' + code + ' / ' + msg);
  if (sim.nerr !== +n) probs.push('오류 개수 모형 ' + sim.nerr + ' 실제 ' + n);
  const realAt = res === 'OK' ? [] : where.split(' ## ');
  if (JSON.stringify(sim.errAt) !== JSON.stringify(realAt)) probs.push('오류가 난 줄 모형 ' + JSON.stringify(sim.errAt) + ' 실제 ' + JSON.stringify(realAt));
  if ((mainClass === 'true') !== (res === 'OK')) probs.push('Main.class 생성 여부가 컴파일 결과와 다름: ' + mainClass);
  const srcFile = path.join(__dirname, '..', 'out', 'method_basic', [decl, call, args].join('-'), 'Main.java');
  const src = fs.readFileSync(srcFile, 'utf8').replace(/\r\n/g, '\n').trimEnd();
  if (src !== lesson.code(c)) probs.push('화면의 코드와 Probe가 컴파일한 소스가 다름');
  if (!probs.length) ok++; else console.log('다름: ' + k + '\n   ' + probs.join('\n   '));
}
// 모형의 모든 조합이 Probe 출력에 있는지
const mc = combos(lesson).length;
if (mc !== total) console.log('다름: 모형의 조합 ' + mc + '개, Probe 출력 ' + total + '개');
// 단계 문장이 기대는 사실
const fact = lines.find(l => l.startsWith('FACT order => '));
total++;
if (fact && fact.slice('FACT order => '.length) === 'main 시작 / add 실행 / 5') ok++;
else console.log('다름: FACT order ' + fact);
console.log('일치 ' + ok + ' / ' + total);  // 조합 12개 + 사실 1개

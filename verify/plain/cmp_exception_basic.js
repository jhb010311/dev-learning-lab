// 기초개념 "예외" 실습의 모형 결과를 실제 javac 컴파일과 자식 java 프로세스 실행 결과(ExceptionBasicProbe.out.txt)와 대조한다
// 대조: 모든 조합이 컴파일되는지, 결과 표 세 열(출력, 프로그램이 끝난 방식, catch 안의 코드),
//       종료 코드와 표준 오류의 첫 줄(예외의 종류와 메시지), 표준 출력의 줄 수가 모형의 출력과 같은지,
//       그리고 화면의 코드(code 함수)가 Probe가 컴파일하고 실행한 소스(verify/out/exception_basic/<조합>/Main.java)와 같은 글인지
const fs = require('fs'), path = require('path');
const { load, combos } = require('../model_rows.js');
const lesson = load('exception_basic');
const lines = fs.readFileSync(path.join(__dirname, 'ExceptionBasicProbe.out.txt'), 'utf8').split(/\r?\n/).filter(Boolean);
console.log(lines[0]);
const CATCH_MSG = '0으로 나눌 수 없습니다';
let ok = 0, n = 0;
const seen = new Set();
for (const ln of lines.slice(1)) {
  n++;
  const [k, v] = ln.split(' => '), [tc, b, kind] = k.split('|'), f = v.split('|');
  const [res, nerr, exit, out, errFirst, errCount, outCount] = f;
  const c = { tc: tc === 'true', b, kind };
  seen.add(JSON.stringify(c));
  const sim = lesson.simulate(Object.assign({}, c)), row = sim.row, probs = [];
  if (res !== 'OK' || nerr !== '0') probs.push('컴파일되지 않음');
  // 표준 출력의 줄들에서 실제 값을 얻는다
  const stdout = fs.readFileSync(path.join(__dirname, '..', 'out', 'exception_basic', [tc, b, kind].join('-'), 'stdout.txt'), 'utf8').replace(/\r\n/g, '\n').trimEnd().split('\n').filter((x, i, a) => a.length > 1 || x !== '');
  const stderr = fs.readFileSync(path.join(__dirname, '..', 'out', 'exception_basic', [tc, b, kind].join('-'), 'stderr.txt'), 'utf8').replace(/\r\n/g, '\n').trimEnd();
  if (stdout.length !== +outCount) probs.push('표준 출력 줄 수 ' + stdout.length + ' / ' + outCount);
  // 끝난 방식: 종료 코드와 표준 오류의 첫 줄로 정한다
  let how;
  if (exit === '0' && errFirst === '-') how = '끝까지 실행됨';
  else if (exit === '1' && /^Exception in thread "main" java\.lang\.ArithmeticException: \/ by zero$/.test(errFirst)) how = 'ArithmeticException으로 멈춤';
  else how = '(모르는 끝 ' + exit + ' / ' + errFirst + ')';
  const catchRan = stdout.includes(CATCH_MSG);
  const real = [out === '(없음)' ? '(아무것도 출력되지 않음)' : out, how, !c.tc ? 'catch 없음' : catchRan ? '실행됨' : '실행되지 않음'];
  if (JSON.stringify(row) !== JSON.stringify(real)) probs.push('표 모형 ' + row.join(' | ') + '\n   실제 ' + real.join(' | '));
  // 멈췄다면 표준 오류는 예외 메시지 한 줄과 스택 추적(at Main.main) 뿐이고, 정상 종료면 표준 오류가 비어 있다
  if (how === '끝까지 실행됨' && stderr !== '') probs.push('정상 종료인데 표준 오류가 있음');
  if (how !== '끝까지 실행됨' && !/^\tat Main\.main\(Main\.java:\d+\)$/m.test(stderr)) probs.push('스택 추적에 Main.main이 없음');
  // 모형의 단계 문장이 말하는 사실: 멈추면 "끝"은 출력되지 않는다
  if (how !== '끝까지 실행됨' && stdout.includes('끝')) probs.push('멈췄는데 "끝"이 출력됨');
  if (how === '끝까지 실행됨' && stdout[stdout.length - 1] !== '끝') probs.push('끝까지 실행됐는데 마지막 줄이 "끝"이 아님');
  const srcFile = path.join(__dirname, '..', 'out', 'exception_basic', [tc, b, kind].join('-'), 'Main.java');
  const src = fs.readFileSync(srcFile, 'utf8').replace(/\r\n/g, '\n').trimEnd();
  if (src !== lesson.code(c)) probs.push('화면의 코드와 Probe가 컴파일한 소스가 다름');
  if (!probs.length) ok++; else console.log('다름: ' + k + '\n   ' + probs.join('\n   '));
}
// 모형의 모든 설정 조합이 Probe에서 실행됐는지
for (const c of combos(lesson)) if (!seen.has(JSON.stringify(c))) { n++; console.log('다름: Probe에 없는 조합 ' + JSON.stringify(c)); }
console.log('일치 ' + ok + ' / ' + n);

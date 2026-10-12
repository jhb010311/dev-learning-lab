// 기초개념 "List와 Map" 실습의 모형 결과를 실제 javac 컴파일과 자식 java 프로세스 실행 결과(CollectionBasicProbe.out.txt)와 대조한다
// 대조: 모든 조합이 컴파일되는지, 결과 표 세 열(꺼낸 값, 담긴 개수, 예외)을 실제 표준 출력의 줄과 종료 코드, 표준 오류의 첫 줄에서 얻은 값과,
//       모형이 말하는 담긴 개수(단계 문장·그림의 개수)와 출력 줄들이 실제 표준 출력과 같은지,
//       멈춘 조합은 표준 오류에 Main.main이 있는 스택 추적이 있는지,
//       화면의 코드(code 함수)가 Probe가 컴파일하고 실행한 소스(verify/out/collection_basic/<조합>/Main.java)와 같은 글인지,
//       단계 문장이 기대는 사실(FACT 줄: 번호는 0부터, get은 값을 없애지 않음, List는 같은 값을 번호 2 자리에 또 담음,
//       Map의 put은 이전 값을 돌려주며 값을 바꿈, 없는 키는 containsKey가 false)
const fs = require('fs'), path = require('path');
const { load, combos } = require('../model_rows.js');
const lesson = load('collection_basic');
const lines = fs.readFileSync(path.join(__dirname, 'CollectionBasicProbe.out.txt'), 'utf8').split(/\r?\n/).filter(Boolean);
console.log(lines[0]);
let ok = 0, n = 0;
const seen = new Set();
for (const ln of lines.slice(1)) {
  if (ln.startsWith('FACT ')) continue;
  n++;
  const [k, v] = ln.split(' => '), [kind, ask] = k.split('|'), f = v.split('|');
  const [res, nerr, exit, out, errFirst, errCount, outCount] = f;
  const c = { kind, ask };
  seen.add(JSON.stringify(c));
  const sim = lesson.simulate(Object.assign({}, c)), row = sim.row, probs = [];
  if (res !== 'OK' || nerr !== '0') probs.push('컴파일되지 않음');
  const dir = path.join(__dirname, '..', 'out', 'collection_basic', [kind, ask].join('-'));
  const stdout = fs.readFileSync(path.join(dir, 'stdout.txt'), 'utf8').replace(/\r\n/g, '\n').trimEnd().split('\n').filter((x, i, a) => a.length > 1 || x !== '');
  const stderr = fs.readFileSync(path.join(dir, 'stderr.txt'), 'utf8').replace(/\r\n/g, '\n').trimEnd();
  if (stdout.length !== +outCount) probs.push('표준 출력 줄 수 ' + stdout.length + ' / ' + outCount);
  // 실제 값: 첫 줄은 size(), 둘째 줄은 get의 결과
  let how;
  if (exit === '0' && errFirst === '-') how = '없음';
  else if (exit === '1' && /^Exception in thread "main" java\.lang\.IndexOutOfBoundsException: Index 5 out of bounds for length 2$/.test(errFirst)) how = 'IndexOutOfBoundsException으로 멈춤';
  else how = '(모르는 끝 ' + exit + ' / ' + errFirst + ')';
  const real = [stdout.length > 1 ? stdout[1] : '꺼내지 못함', stdout[0], how];
  if (JSON.stringify(row) !== JSON.stringify(real)) probs.push('표 모형 ' + row.join(' | ') + '\n   실제 ' + real.join(' | '));
  // 모형의 출력 줄(그림의 출력)과 실제 표준 출력
  const last = sim.events[sim.events.length - 1].snap;
  if (JSON.stringify(last.out) !== JSON.stringify(stdout)) probs.push('모형의 출력 ' + JSON.stringify(last.out) + ' 실제 ' + JSON.stringify(stdout));
  if (String(last.count) !== stdout[0]) probs.push('모형의 담긴 개수 ' + last.count + ' 실제 ' + stdout[0]);
  if (how !== '없음' && !/^\tat Main\.main\(Main\.java:\d+\)$/m.test(stderr)) probs.push('스택 추적에 Main.main이 없음');
  if (how === '없음' && stderr !== '') probs.push('정상 종료인데 표준 오류가 있음');
  const src = fs.readFileSync(path.join(dir, 'Main.java'), 'utf8').replace(/\r\n/g, '\n').trimEnd();
  if (src !== lesson.code(c)) probs.push('화면의 코드와 Probe가 컴파일한 소스가 다름');
  if (!probs.length) ok++; else console.log('다름: ' + k + '\n   ' + probs.join('\n   '));
}
// 모형의 모든 설정 조합이 Probe에서 실행됐는지
for (const c of combos(lesson)) if (!seen.has(JSON.stringify(c))) { n++; console.log('다름: Probe에 없는 조합 ' + JSON.stringify(c)); }
// 단계 문장이 기대는 사실
const FACTS = { list: '0,1 / 2 / kim,0,3', map: '20 / 25,2 / null / false,30,2' };
for (const key of Object.keys(FACTS)) {
  n++;
  const ln = lines.find(l => l.startsWith('FACT ' + key + ' => '));
  const f = ln ? ln.slice(('FACT ' + key + ' => ').length).split('|') : [];
  if (f[0] === 'OK' && f[1] === '0' && f[2] === FACTS[key] && f[3] === '-') ok++;
  else console.log('다름: FACT ' + key + ' ' + ln);
}
console.log('일치 ' + ok + ' / ' + n);  // 조합 6개 + 사실 2개

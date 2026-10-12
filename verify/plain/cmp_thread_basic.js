// 기초개념 "스레드" 실습의 모형 결과를 실제 javac 컴파일과 자식 java 프로세스 실행 결과(ThreadBasicProbe.out.txt)와 대조한다
// 대조: 모든 조합이 컴파일되는지, 20번 실행해 종료 코드가 0이고 표준 오류가 비고 표준 출력이 매번 같은지,
//       결과 표 세 열(출력, work를 실행한 스레드, 새로 시작된 스레드), 새로 시작된 스레드 수가 모형의 단계 문장이 말하는 수와 같은지,
//       화면의 코드(code 함수)가 Probe가 컴파일하고 실행한 소스(verify/out/thread_basic/<조합>/Main.java)와 같은 글인지,
//       단계 문장이 기대는 사실(FACT 줄: 만든 직후 NEW이고 start 뒤에는 새 스레드와 main이 함께 살아 있다, run()은 새 흐름을 만들지 않고 부른 스레드가 실행한다)
const fs = require('fs'), path = require('path');
const { load, combos } = require('../model_rows.js');
const lesson = load('thread_basic');
const lines = fs.readFileSync(path.join(__dirname, 'ThreadBasicProbe.out.txt'), 'utf8').split(/\r?\n/).filter(Boolean);
console.log(lines[0]);
let ok = 0, total = 0;
const seen = new Set();
for (const ln of lines.slice(1)) {
  if (ln.startsWith('FACT ')) continue;
  total++;
  const [k, v] = ln.split(' => '), [how, two] = k.split('|'), f = v.split('|');
  const [res, nerr, runs, exit, distinct, started, stderr] = f, out = f.slice(7).join('|');
  const c = { how, two: two === 'true' };
  seen.add(JSON.stringify(c));
  const sim = lesson.simulate(Object.assign({}, c)), row = sim.row, probs = [];
  if (res !== 'OK' || nerr !== '0') probs.push('컴파일되지 않음');
  if (+runs < 20) probs.push('실행 횟수가 20번보다 적음: ' + runs);
  if (exit !== '0') probs.push('종료 코드가 0이 아님: ' + exit);
  if (distinct !== '1') probs.push('실행마다 표준 출력이 달라짐: ' + distinct + '가지');
  if (stderr !== '-') probs.push('표준 오류가 있음: ' + stderr);
  if (!/^\d+$/.test(started)) probs.push('새로 시작된 스레드 수가 실행마다 다름: ' + started);
  // 실제 출력에서 값을 얻는다
  const outLines = out.split(' / ');
  const names = outLines.filter(l => l.startsWith('work를 실행한 스레드: ')).map(l => l.slice('work를 실행한 스레드: '.length));
  const lastLine = outLines[outLines.length - 1];
  const real = [out, names.length ? names.join(', ') : '실행되지 않음', started + '개'];
  if (JSON.stringify(row) !== JSON.stringify(real)) probs.push('표 모형 ' + row.join(' | ') + '\n   실제 ' + real.join(' | '));
  if (lastLine !== '이 줄을 실행한 스레드: main') probs.push('마지막 줄을 main이 실행하지 않음: ' + lastLine);
  // 단계 문장이 말하는 사실: start를 부른 횟수만큼 새 스레드가 생기고, 새 스레드의 이름은 Thread-0, Thread-1 차례이며,
  // run()이나 start 없음이면 work는 main이 실행하거나 실행되지 않는다
  const nObj = c.two ? 2 : 1;
  if (how === 'start') {
    if (+started !== nObj) probs.push('start를 ' + nObj + '번 불렀는데 새 스레드 ' + started + '개');
    if (names.join(',') !== Array.from({ length: nObj }, (_, i) => 'Thread-' + i).join(',')) probs.push('새 스레드의 이름이 Thread-0부터 차례가 아님: ' + names);
  } else {
    if (started !== '0') probs.push('start를 부르지 않았는데 새 스레드 ' + started + '개');
    if (how === 'run' && names.join(',') !== Array(nObj).fill('main').join(',')) probs.push('run()인데 work를 main이 실행하지 않음: ' + names);
    if (how === 'none' && names.length) probs.push('start가 없는데 work가 실행됨');
  }
  const srcFile = path.join(__dirname, '..', 'out', 'thread_basic', [how, two].join('-'), 'Main.java');
  const src = fs.readFileSync(srcFile, 'utf8').replace(/\r\n/g, '\n').trimEnd();
  if (src !== lesson.code(c)) probs.push('화면의 코드와 Probe가 컴파일한 소스가 다름');
  if (!probs.length) ok++; else console.log('다름: ' + k + '\n   ' + probs.join('\n   '));
}
// 모형의 모든 조합이 Probe 출력에 있는지
const mc = combos(lesson);
for (const c of mc) if (!seen.has(JSON.stringify(c))) { total++; console.log('다름: Probe에 없는 조합 ' + JSON.stringify(c)); }
// 단계 문장이 기대는 사실
function fact(name, expect) {
  total++;
  const l = lines.find(x => x.startsWith('FACT ' + name + ' => '));
  if (!l) { console.log('다름: FACT ' + name + ' 없음'); return; }
  const [runs, distinct, started, ...rest] = l.slice(('FACT ' + name + ' => ').length).split('|'), body = rest.join('|');
  if (+runs >= 20 && distinct === '1' && expect.started === started && body === expect.body) ok++;
  else console.log('다름: FACT ' + name + ' ' + l);
}
fact('state', { started: '1', body: '0/-/만든 직후: Thread-0 NEW false / start 뒤: WAITING true main true / join 뒤: TERMINATED false' });
fact('run', { started: '0', body: '0/-/맡긴 코드를 실행한 스레드: main / run 뒤: NEW false / join이 돌아옴' });
console.log('일치 ' + ok + ' / ' + total);  // 조합 6개 + 사실 2개

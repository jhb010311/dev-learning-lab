// 기초개념 "락(synchronized)" 실습의 모형 결과를 실제 javac 컴파일과 자식 java 프로세스 실행 결과(LockBasicProbe.out.txt)와 대조한다
// 대조: 모든 조합이 컴파일되는지, 30번 실행해 종료 코드가 0이고 표준 오류가 비는지,
//       결과 표 세 열(count의 마지막 값, 기대한 값, 사라진 증가)을 실제로 나온 값들에서 얻어 모형의 행과 같은지
//       (실행마다 달라지는 조합은 "30번 모두 기대한 값보다 작고 서로 다른 값이 둘 이상"일 때만 모형의 문구와 같다고 본다),
//       락이 있거나 스레드가 1개인 조합은 30번 모두 기대한 값과 같은지,
//       화면의 코드(code 함수)가 Probe가 컴파일하고 실행한 소스(verify/out/lock_basic/<조합>/Main.java)와 같은 글인지,
//       단계 문장이 기대는 사실(FACT 줄: count++의 바이트코드 순서, 락을 쥔 동안 다른 스레드는 BLOCKED이고 그 락은 Main 클래스 객체의 것)
const fs = require('fs'), path = require('path');
const { load, combos } = require('../model_rows.js');
const lesson = load('lock_basic');
const lines = fs.readFileSync(path.join(__dirname, 'LockBasicProbe.out.txt'), 'utf8').split(/\r?\n/).filter(Boolean);
console.log(lines[0]);
let ok = 0, total = 0;
const seen = new Set();
for (const ln of lines.slice(1)) {
  if (ln.startsWith('FACT ')) continue;
  total++;
  const [k, v] = ln.split(' => '), [sync, threads] = k.split('|'), f = v.split('|');
  const [res, nerr, runs, exit, expect, less, more, distinct, min, max, stderr] = f, vals = f.slice(11).join('|').split(',').map(Number);
  const c = { sync: sync === 'true', threads };
  seen.add(JSON.stringify(c));
  const sim = lesson.simulate(Object.assign({}, c)), row = sim.row, probs = [];
  if (res !== 'OK' || nerr !== '0') probs.push('컴파일되지 않음');
  if (+runs < 30 || vals.length !== +runs) probs.push('실행 횟수가 30번보다 적음: ' + runs);
  if (exit !== '0') probs.push('종료 코드가 0이 아님: ' + exit);
  if (stderr !== '-') probs.push('표준 오류가 있음: ' + stderr);
  if (+expect !== (threads === '2' ? 200000 : 100000)) probs.push('기대한 값이 다름: ' + expect);
  if (+more !== 0) probs.push('기대한 값보다 크게 나온 실행이 있음: ' + more);
  // 실제로 나온 값들에서 결과 표의 세 열을 얻는다
  let real;
  const allExact = vals.every(x => x === +expect);
  if (allExact) real = [expect, expect, '없음'];
  else if (+less === vals.length && new Set(vals).size >= 2) real = ['대개 200000보다 작은 값 (실행마다 다름)', expect, '있음 (실행마다 다름)'];
  else real = ['(실행마다 다름, 일부는 기대한 값과 같음) 작게 나온 횟수 ' + less + ' / ' + vals.length, expect, '(판정 불가)'];
  if (+expect !== 200000 && real[0].startsWith('200000보다')) probs.push('기대한 값이 100000인 조합에서 값이 모자람');
  if (JSON.stringify(row) !== JSON.stringify(real)) probs.push('표 모형 ' + row.join(' | ') + '\n   실제 ' + real.join(' | '));
  // 락이 있거나 스레드가 1개인 조합은 매번 같은 값이어야 한다
  if ((c.sync || threads === '1') && !allExact) probs.push('매번 기대한 값이어야 하는데 달랐음: 작게 나온 횟수 ' + less);
  const srcFile = path.join(__dirname, '..', 'out', 'lock_basic', [sync, threads].join('-'), 'Main.java');
  const src = fs.readFileSync(srcFile, 'utf8').replace(/\r\n/g, '\n').trimEnd();
  if (src !== lesson.code(c)) probs.push('화면의 코드와 Probe가 컴파일한 소스가 다름');
  if (!probs.length) ok++; else console.log('다름: ' + k + '\n   ' + probs.join('\n   '));
}
// 모형의 모든 조합이 Probe 출력에 있는지
for (const c of combos(lesson)) if (!seen.has(JSON.stringify(c))) { total++; console.log('다름: Probe에 없는 조합 ' + JSON.stringify(c)); }
// 단계 문장이 기대는 사실
function fact(name, check) {
  total++;
  const l = lines.find(x => x.startsWith('FACT ' + name + ' => '));
  if (!l) { console.log('다름: FACT ' + name + ' 없음'); return; }
  const body = l.slice(('FACT ' + name + ' => ').length);
  if (check(body)) ok++; else console.log('다름: FACT ' + name + ' ' + l);
}
fact('bytecode', b => b === 'getstatic,iconst_1,iadd,putstatic,return');
fact('held', b => { const [runs, distinct, ...rest] = b.split('|'); return +runs >= 30 && distinct === '1' && rest.join('|') === '0/-/t1이 add() 안에서 Main 클래스의 락을 쥠: true / t2 상태: BLOCKED, 이때 count=0 / 둘 다 끝난 뒤 count=2'; });
console.log('일치 ' + ok + ' / ' + total);  // 조합 4개 + 사실 2개

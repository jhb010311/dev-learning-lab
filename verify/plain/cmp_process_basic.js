// 기초개념 "프로세스" 실습의 모형 결과를 실제 javac, java 실행 결과(ProcessBasicProbe.out.txt)와 대조한다
// 대조: 결과 표 네 열(프로세스 수=실제로 시작한 java 프로세스 수, 각자 본 count=프로세스별 실제 출력, 메모리를 같이 씀=한 프로세스가 3보다 큰 count를 본 적이 있는가,
//       같은 때에 떠 있던 프로세스=프로세스를 시작할 때마다 센 살아 있는 프로세스 수의 최댓값),
//       화면의 코드(code 함수)가 Probe가 만든 화면의 글(screen.txt)과 같은 글인지, 폴더의 Counter.java가 화면의 소스 구역과 같은 글인지,
//       출력한 PID가 실행기가 본 PID와 같은지, 종료 코드 0과 빈 표준 오류, 프로세스를 여러 개 띄워도 Counter.class는 1개인 것,
//       함께 떠 있던 프로세스의 PID가 서로 다른 것(스레드는 PID가 하나), 단계 문장이 기대는 사실(FACT 줄: 서버 프로그램도 프로세스 하나이고 요청 사이에 변수가 이어진다)
const fs = require('fs'), path = require('path');
const { load, combos } = require('../model_rows.js');
const lesson = load('process_basic');
const lines = fs.readFileSync(path.join(__dirname, 'ProcessBasicProbe.out.txt'), 'utf8').split(/\r?\n/).filter(Boolean);
console.log(lines[0]);
let ok = 0, total = 0;
for (const ln of lines.slice(1)) {
  if (ln.startsWith('FACT ')) continue;
  total++;
  const [k, v] = ln.split(' => '), [how, n] = k.split('|'), f = v.split('|');
  const [launches, pidMatch, distinct, perProc, maxAlive, exits, errEmpty, files, ran] = f;
  const c = { how, n };
  const sim = lesson.simulate(Object.assign({}, c)), row = sim.row, probs = [];
  const lists = perProc.split(';').map(s => s.split(',').map(Number));
  const flat = [].concat(...lists);
  const real = [launches + '개', flat.join(', '), flat.some(x => x > 3) ? '예' : '아니요', maxAlive + '개'];
  if (JSON.stringify(row) !== JSON.stringify(real)) probs.push('표 모형 ' + row.join(' | ') + '\n   실제 ' + real.join(' | '));
  const dir = path.join(__dirname, '..', 'out', 'process_basic', how + '-' + n);
  const screen = fs.readFileSync(path.join(dir, 'screen.txt'), 'utf8').replace(/\r\n/g, '\n');
  if (screen !== lesson.code(c)) probs.push('화면의 코드와 Probe가 만든 화면의 글이 다름');
  const shown = screen.split('\n\n# 터미널\n')[0].slice('# Counter.java\n'.length) + '\n';
  const javaFile = fs.readFileSync(path.join(dir, 'Counter.java'), 'utf8').replace(/\r\n/g, '\n');
  if (javaFile !== shown) probs.push('Counter.java가 화면의 소스와 다름');
  if (pidMatch !== 'true') probs.push('출력한 PID가 실행기가 본 PID와 다름');
  if (!exits.split(',').every(x => x === '0')) probs.push('종료 코드가 0이 아님: ' + exits);
  if (errEmpty !== 'true') probs.push('표준 오류가 비어 있지 않음');
  if (files !== 'Counter.class,Counter.java') probs.push('실행 뒤 폴더의 파일 ' + files);
  const nProc = how === 'threads' ? 1 : +n;
  if (+launches !== nProc) probs.push('시작한 프로세스 수 ' + launches);
  if (ran !== ['javac'].concat(Array(nProc).fill('java')).join(',')) probs.push('실행한 명령 차례 ' + ran);
  // 함께 떠 있던 프로세스의 PID는 서로 달라야 한다(스레드는 프로세스가 하나여서 PID도 하나)
  if (how === 'procs' && +distinct !== nProc) probs.push('함께 떠 있던 프로세스의 PID가 서로 다르지 않음: ' + distinct);
  if (how === 'threads' && +distinct !== 1) probs.push('스레드인데 PID가 하나가 아님: ' + distinct);
  if (how === 'rerun' && +distinct !== nProc) console.log('참고: ' + k + ' 끝난 뒤 다시 실행한 프로세스의 PID가 앞과 같았음(운영체제가 번호를 다시 쓴 경우): 서로 다른 PID ' + distinct + '개');
  // 단계 문장: threads는 3, 6, 9로 이어지고 procs와 rerun은 프로세스마다 3
  if (how === 'threads' && lists[0].join() !== [3, 6, 9].slice(0, +n).join()) probs.push('스레드의 count가 3, 6, 9로 이어지지 않음');
  if (how !== 'threads' && !flat.every(x => x === 3)) probs.push('프로세스마다 3이 아님');
  // 사건 문장이 말하는 PID는 예시 숫자이므로, 사건에 쓰인 count 출력 줄이 실제 출력 형식과 같은 꼴인지만 본다
  const outs = [].concat(...sim.events.map(e => e.snap.out)).filter((x, i, a) => a.indexOf(x) === i);
  if (!outs.every(o => /^PID \d+ count \d+$/.test(o))) probs.push('모형의 출력 줄 꼴이 실제와 다름');
  if (!probs.length) ok++; else console.log('다름: ' + k + '\n   ' + probs.join('\n   '));
}
const mc = combos(lesson).length;
if (mc !== total) console.log('다름: 모형의 조합 ' + mc + '개, Probe 출력 ' + total + '개');
const fact = n => { const l = lines.find(x => x.startsWith('FACT ' + n + ' => ')); return l ? l.slice(('FACT ' + n + ' => ').length) : ''; };
const facts = [
  ['server', '요청1=PID x count 1|요청2=PID x count 2|PID가 모두 같고 실행기가 본 PID와 같은가=true|요청 사이에 살아 있는가=true'],
  ['server-end', '서버 프로세스가 끝났는가=true'],
];
for (const [n, want] of facts) { total++; if (fact(n) === want) ok++; else console.log('다름: FACT ' + n + '\n   실제 ' + fact(n) + '\n   기대 ' + want); }
console.log('일치 ' + ok + ' / ' + total);  // 조합 6개 + 사실 2개

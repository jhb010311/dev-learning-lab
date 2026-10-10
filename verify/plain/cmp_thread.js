// "스레드의 생성과 상태" 실습의 모형 결과를 실제 실행 결과(ThreadProbe.out.txt)와 대조한다
const fs = require('fs'), path = require('path');
const { load, combos } = require('../model_rows.js');
const lesson = load('thread');
const lines = fs.readFileSync(path.join(__dirname, 'ThreadProbe.out.txt'), 'utf8').split(/\r?\n/).filter(l => l.includes(' => '));
const real = {}, extra = {};
lines.forEach(l => { const [k, v] = l.split(' => '); if (k.startsWith('extra|')) extra[k.slice(6)] = v; else real[k] = v.split('|'); });
let ok = 0, n = 0;
for (const c of combos(lesson)) {
  const key = c.call + '|' + c.work + '|' + c.intr, r = real[key]; n++;
  if (!r) { console.log('실행 결과 없음: ' + key); continue; }
  // 실제: 작업을 실행한 스레드 | start 전 상태 | 중간 상태 | 예외 | join 뒤 상태 | 작업 안에서 본 자기 상태 | 작업이 끝날 때의 interrupt 표시
  const [ran, before, mid, ex, after, self, flag] = r, exs = ex === 'none' ? [] : ex.split(',');
  const ir = !c.intr ? '부르지 않음' : exs.includes('InterruptedException') ? 'InterruptedException' : flag === 'true' ? '예외 없음 (표시만 남음)' : '아무 일 없음';
  const want = [ran, mid, ir, after, exs.includes('IllegalThreadStateException') ? 'IllegalThreadStateException' : '부르지 않음'];
  const sim = lesson.simulate(Object.assign({}, c)), row = sim.row;
  // 모형의 첫 단계는 "start 전 상태는 NEW"라고 말하고, 작업을 실행하는 스레드는 그때 RUNNABLE이라고 본다
  const first = sim.events[0].snap.t;
  if (JSON.stringify(row) === JSON.stringify(want) && first === before && self === 'RUNNABLE') ok++;
  else console.log('다름: ' + key + '  모형 ' + row.join(' / ') + ' (처음 ' + first + ')  실제 ' + want.join(' / ') + ' (처음 ' + before + ', 자기 상태 ' + self + ')');
}
console.log('일치 ' + ok + ' / ' + n);
// 조합이 아닌, 글에서 말하는 사실의 확인
const facts = { '살아 있는 스레드에 start() 한 번 더': 'IllegalThreadStateException', 'sleep 중 interrupt 뒤 catch 안의 isInterrupted': 'false', 'BLOCKED 중 interrupt 뒤의 상태': 'BLOCKED', 'BLOCKED 중 interrupt, 락을 얻은 뒤 isInterrupted': 'true', '시작하지 않은 스레드에 join()': '바로 돌아옴', 't.join()으로 기다리는 main의 상태': 'WAITING' };
let fo = 0; Object.keys(facts).forEach(k => { if (extra[k] === facts[k]) fo++; else console.log('사실 확인 다름: ' + k + ' => ' + extra[k]); });
console.log('따로 확인한 사실 ' + fo + ' / ' + Object.keys(facts).length);

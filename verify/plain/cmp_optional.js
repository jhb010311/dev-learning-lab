// Optional 실습의 모형 결과를 실제 실행 결과(OptionalProbe.out.txt)와 대조한다.
// 표의 세 칸뿐 아니라, 모형이 적어 낸 출력 줄(out)과 예외(ex)도 실제와 같은지 본다.
const fs = require('fs'), path = require('path');
const { load, combos } = require('../model_rows.js');
const lesson = load('optional');
const real = {};
fs.readFileSync(path.join(__dirname, 'OptionalProbe.out.txt'), 'utf8').split(/\r?\n/).filter(l => l.includes(' => ')).forEach(l => { const [k, v] = l.split(' => '); real[k] = v; });
const cs = combos(lesson);
let ok = 0;
for (const c of cs) {
  const k = [c.val, c.make, c.take].join('|');
  if (real[k] === undefined) { console.log('실제 실행 결과 없음: ' + k); continue; }
  const cut = real[k].lastIndexOf('|'), printed = real[k].slice(0, cut), exRaw = real[k].slice(cut + 1);
  const lines = printed === '' ? [] : printed.split(' / ');
  const ex = exRaw === '-' ? '' : exRaw.replace(/^EX:(?:[\w.]*\.)?/, ''), exName = ex.split(':')[0];   // 패키지 이름을 뗀다
  const useMd = c.take === 'orElse' || c.take === 'orElseGet';
  const want = [
    lines.length ? lines[0] : '예외: ' + exName,
    ex ? (lines.length ? '예외: ' + exName : '(실행되지 않음)') : lines[lines.length - 1],
    !useMd ? '(쓰지 않음)' : lines.includes('makeDefault 실행') ? '실행됨' : '실행되지 않음',
  ];
  const sim = lesson.simulate(Object.assign({}, c));
  if (JSON.stringify(sim.row) === JSON.stringify(want) && JSON.stringify(sim.out) === JSON.stringify(lines) && sim.ex === ex) ok++;
  else console.log('다름: ' + k + '\n  모형 ' + sim.row.join(' / ') + ' | 출력 ' + sim.out.join(' / ') + ' | 예외 ' + sim.ex + '\n  실제 ' + want.join(' / ') + ' | 출력 ' + lines.join(' / ') + ' | 예외 ' + ex);
}
if (cs.length !== Object.keys(real).length) console.log('조합 수가 다름: 모형 ' + cs.length + ', 실제 ' + Object.keys(real).length);
console.log('일치 ' + ok + ' / ' + Object.keys(real).length);

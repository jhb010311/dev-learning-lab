// "AOP: 어드바이스와 포인트컷" 실습의 모형 결과를 실제 스프링 실행 결과(aop_probe.out.txt)와 조합마다 대조한다
const fs = require('fs'), path = require('path');
const { load, combos } = require('../model_rows.js');
const lesson = load('aop');
const all = fs.readFileSync(path.join(__dirname, 'aop_probe.out.txt'), 'utf8').split(/\r?\n/).filter(Boolean);
all.filter(l => l.startsWith('#')).forEach(l => console.log(l));
const real = {};
all.filter(l => l.includes(' => ') && !l.startsWith('#')).forEach(l => { const [k, v] = l.split(' => '); real[k] = v; });
const cs = combos(lesson);
let ok = 0;
for (const c of cs) {
  const k = [c.pc, c.m, c.out, c.second].join('|'), sim = lesson.simulate(Object.assign({}, c));
  if (real[k] === undefined) { console.log('실제 실행 결과 없음: ' + k); continue; }
  const [seq, caller, proxy] = real[k].split('|');
  // 실제: 찍힌 줄이 메서드 본문 한 줄뿐이면 어드바이스가 실행되지 않은 것(포인트컷이 고르지 않음)
  const realRow = [seq === c.m + ' 본문' ? '고르지 않음' : '고름', seq.split(' > ').join(' → '), caller];
  if (JSON.stringify(sim.row) === JSON.stringify(realRow) && 'proxy=' + sim.proxy === proxy) ok++;
  else console.log('다름: ' + k + '\n   모형 ' + sim.row.join(' | ') + ' | proxy=' + sim.proxy + '\n   실제 ' + realRow.join(' | ') + ' | ' + proxy);
}
console.log('일치 ' + ok + ' / ' + cs.length + (Object.keys(real).length !== cs.length ? '  (실제 실행 줄 수 ' + Object.keys(real).length + ')' : ''));

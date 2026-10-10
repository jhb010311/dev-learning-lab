// "테스트" 실습의 모형 결과를 실제 JUnit + 스프링 테스트 실행 결과(testing_probe.out.txt)와 조합마다 대조한다
const fs = require('fs'), path = require('path');
const { load, combos } = require('../model_rows.js');
const lesson = load('testing');
const all = fs.readFileSync(path.join(__dirname, 'testing_probe.out.txt'), 'utf8').split(/\r?\n/).filter(Boolean);
console.log(all[0]);
const real = {};
all.filter(l => l.includes(' => ') && !l.startsWith('#')).forEach(l => { const i = l.indexOf(' => '); real[l.slice(0, i)] = l.slice(i + 4).split('|'); });
// 스프링 없는 테스트는 "두 번째 클래스" 설정이 same으로 고정되므로(fix), 같은 조합은 한 번만 센다
const seen = new Set(), cs = combos(lesson).filter(c => { const k = [c.kind, c.mock, c.next].join('|'); if (seen.has(k)) return false; seen.add(k); return true; });
let ok = 0;
for (const c of cs) {
  const k = [c.kind, c.mock, c.next].join('|'), sim = lesson.simulate(Object.assign({}, c)), r = real[k];
  if (!r) { console.log('실제 실행 결과 없음: ' + k); continue; }
  // 실제 출력의 앞 네 칸이 결과 표의 네 칸이고, 그다음 세 칸(두 번째 클래스의 빈, 기동 성공 횟수, 두 클래스가 받은 컨텍스트)은 모형의 check와 대조한다
  const model = sim.row.concat(sim.check), got = r.slice(0, 7);
  // 두 클래스가 이름순(첫 번째 → 두 번째)으로 실행됐는지도 확인한다
  const order = /^order=\w+A(Dirty)?>\w+B\w+$/.test(r[7]);
  if (JSON.stringify(model) === JSON.stringify(got) && order) ok++;
  else console.log('다름: ' + k + '\n   모형 ' + model.join(' | ') + '\n   실제 ' + got.join(' | ') + (order ? '' : '\n   실행 순서 이상: ' + r[7]));
}
console.log('일치 ' + ok + ' / ' + cs.length + (Object.keys(real).length !== cs.length ? '  (실제 실행 줄 수 ' + Object.keys(real).length + ')' : ''));

// "JdbcTemplate과 예외 변환" 실습의 모형 결과를 실제 실행 결과(jdbctmpl_probe.out.txt)와 조합마다 대조한다
const fs = require('fs'), path = require('path');
const { load, combos } = require('../model_rows.js');
const lesson = load('jdbctmpl');
const all = fs.readFileSync(path.join(__dirname, 'jdbctmpl_probe.out.txt'), 'utf8').split(/\r?\n/).filter(Boolean);
all.filter(l => l.startsWith('#')).forEach(l => console.log(l));
const real = {};
all.filter(l => l.includes(' => ') && !l.startsWith('#')).forEach(l => { const [k, v] = l.split(' => '); real[k] = v.split('|'); });
const cs = combos(lesson);
let ok = 0;
for (const c of cs) {
  const k = c.how + '|' + c.op, row = lesson.simulate(Object.assign({}, c)).row, r = real[k];
  if (!r) { console.log('실제 실행 결과 없음: ' + k); continue; }
  // 실제 출력의 앞 세 칸이 호출한 쪽이 받는 것, 예외의 종류, 커넥션 반납 여부다
  if (JSON.stringify(row) === JSON.stringify(r.slice(0, 3))) ok++; else console.log('다름: ' + k + '\n   모형 ' + row.join(' | ') + '\n   실제 ' + r.slice(0, 3).join(' | '));
}
console.log('일치 ' + ok + ' / ' + cs.length + (Object.keys(real).length !== cs.length ? '  (실제 실행 줄 수 ' + Object.keys(real).length + ')' : ''));

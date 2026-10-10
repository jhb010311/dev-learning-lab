// "서브쿼리" 실습의 모형 결과를 실제 MySQL 실행 결과(subquery_probe.out.txt)와 조합마다 대조한다.
// 비교 표의 네 칸과 오류 메시지를 비교하고, 상관 서브쿼리의 실행 횟수(EXPLAIN ANALYZE의 loops)와
// NOT IN 서브쿼리가 한 번만 실행된다는 표시(run only once)도 함께 확인한다.
const fs = require('fs'), path = require('path');
const { load, combos } = require('../model_rows.js');
const lesson = load('subquery');
const lines = fs.readFileSync(path.join(__dirname, 'subquery_probe.out.txt'), 'utf8').split(/\r?\n/);
console.log(lines[0]);
const real = {}; lines.filter(l => l.includes(' => ')).forEach(l => { const [k, v] = l.split(' => '); real[k] = v.split('|'); });
// EXPLAIN에 나온 select_type들을 화면의 분류로 옮긴다. MATERIALIZED 줄은 세미조인의 한 방식이라 SIMPLE 쪽에 든다.
function classify(types) {
  const t = types.split(',');
  if (t.includes('DEPENDENT SUBQUERY')) return 'DEPENDENT SUBQUERY';
  if (t.includes('SUBQUERY')) return 'SUBQUERY';
  if (t[0] === 'SIMPLE' && t.every(x => x === 'SIMPLE' || x === 'MATERIALIZED')) return 'SIMPLE (조인으로 바꿔 실행)';
  return types;
}
let ok = 0, n = 0;
for (const c of combos(lesson)) {
  const key = [c.kind, c.nul, c.pick].join('|'); n++;
  const sim = lesson.simulate(Object.assign({}, c)), r = real[key];
  if (!r) { console.log('다름: ' + key + '  실제 실행 결과가 없음'); continue; }
  const [errno, msg, rowsJson, ierrno, imsg, irowsJson, types, an] = r, failed = errno !== '0';
  const list = JSON.parse(rowsJson).map(x => x.join(' ')), irows = JSON.parse(irowsJson).map(x => x[0]);
  // 서브쿼리만 따로 실행한 결과에는 ORDER BY가 없으므로, 들어 있는 값이 같으면 모형의 순서로 적는다
  let innerText = ierrno !== '0' ? '오류 ' + ierrno + ' (바깥의 m.id가 필요)' : irows.length ? irows.length + '행: ' + irows.join(', ') : '0행';
  const mi = /^(\d+)행: (.*)$/.exec(sim.innerText);
  if (ierrno === '0' && mi && +mi[1] === irows.length && mi[2].split(', ').sort().join('|') === irows.slice().sort().join('|')) innerText = sim.innerText;
  const want = [failed ? '오류 ' + errno : '성공', failed ? '-' : list.length ? list.length + '행: ' + list.join(', ') : '0행', innerText, failed ? '-' : classify(types)];
  const problems = [];
  if (JSON.stringify(sim.row) !== JSON.stringify(want)) problems.push('비교 표  모형 ' + sim.row.join(' / ') + '  실제 ' + want.join(' / '));
  if ((sim.err ? sim.err.msg : '') !== msg) problems.push('오류 메시지  모형 ' + (sim.err ? sim.err.msg : '') + '  실제 ' + msg);
  if (ierrno !== '0' && imsg !== "Unknown column 'm.id' in 'where clause'") problems.push('서브쿼리만 실행한 오류가 예상과 다름: ' + imsg);
  if (sim.loops !== null && !an.endsWith('loops=' + sim.loops)) problems.push('서브쿼리 실행 횟수  모형 ' + sim.loops + '  실제 ' + an);
  if (c.kind === 'corr' && !an.includes('dependent')) problems.push('상관 서브쿼리인데 EXPLAIN ANALYZE에 dependent 표시가 없음: ' + an);
  if (c.kind === 'notin' && !an.includes('run only once')) problems.push('NOT IN 서브쿼리에 run only once 표시가 없음: ' + an);
  if (failed && types !== '-') problems.push('문장은 오류인데 EXPLAIN은 성공: ' + types);
  if (!problems.length) ok++; else console.log('다름: ' + key + '\n   ' + problems.join('\n   '));
}
console.log('일치 ' + ok + ' / ' + n);

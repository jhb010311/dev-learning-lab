// 기초개념 "WHERE" 실습의 모형 결과를 실제 DB(H2 2.4.240) 실행 결과(where_basic_probe.out.txt)와 대조한다
// 결과 표의 두 항목, 화면의 SQL 글자(Probe가 실행한 SQL과 같은가), 단계 문장의 근거가 되는 값
// (오류가 없었는가, 문장이 적용된 행의 id가 모형의 맞은 행과 같은가, 마지막 SELECT에서 테이블이 남아 있는가)을 본다
const fs = require('fs'), path = require('path');
const { load } = require('../model_rows.js');
const lesson = load('where_basic');
const lines = fs.readFileSync(path.join(__dirname, 'where_basic_probe.out.txt'), 'utf8').split(/\r?\n/).filter(Boolean);
console.log(lines[0]);
let ok = 0, n = 0;
for (const ln of lines.slice(1)) {
  const [k, v] = ln.split(' => '), f = {};
  v.split('|').forEach(p => { const i = p.indexOf('='); f[p.slice(0, i)] = p.slice(i + 1); });
  n++;
  const [stmt, cond] = k.split('|'), c = { stmt, cond };
  const sim = lesson.simulate(c);
  const ids = f.ids ? f.ids.split(',') : [], total = +f.total, a = +f.applied;
  const real = [a === 0 ? '0행' : a === total ? a + '행 (모든 행)' : a + '행 (id ' + ids.join(', ') + ')', f.final];
  const wantSql = lesson.code.call(lesson, c).split('\n').join('\\n');
  let good = true;
  if (JSON.stringify(sim.row) !== JSON.stringify(real)) { good = false; console.log('다름: ' + k + '\n   모형 ' + sim.row.join(' | ') + '\n   실제 ' + real.join(' | ')); }
  if (f.sql !== wantSql) { good = false; console.log('화면의 SQL이 Probe가 실행한 SQL과 다름: ' + k + '\n   화면 ' + wantSql + '\n   실행 ' + f.sql); }
  if (f.stmts !== '6') { good = false; console.log('문장 수가 6이 아님: ' + k + ' ' + f.stmts); }
  // 단계 문장의 근거: 맞는 행이 없어도, WHERE가 없어도 오류가 아니다
  if (f.err !== 'none') { good = false; console.log('오류가 났음: ' + k + ' ' + f.err); }
  // 모형이 단계 문장에서 "맞은 행"으로 본 id가 실제로 문장이 적용된 행의 id와 같은가
  if (JSON.stringify(sim.matched.map(String)) !== JSON.stringify(ids)) { good = false; console.log('맞은 행의 id가 다름: ' + k + ' 모형 ' + sim.matched + ' 실제 ' + ids); }
  if (f.total !== '3') { good = false; console.log('처음 행 수가 3이 아님: ' + k); }
  if (good) ok++;
}
console.log('일치 ' + ok + ' / ' + n);

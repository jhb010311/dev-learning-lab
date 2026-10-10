// "동적 쿼리와 Querydsl" 실습의 모형 결과를 실제 실행 결과(dynquery_probe.out.txt)와 대조한다.
// 문자열 방식 세 가지와 Criteria API의 열여섯 조합만 대조한다. Querydsl의 네 조합은 이 PC에 라이브러리가 없어 실행 결과가 없다.
const fs = require('fs'), path = require('path');
const { load, combos } = require('../model_rows.js');
const lesson = load('dynquery');
const lines = fs.readFileSync(path.join(__dirname, 'dynquery_probe.out.txt'), 'utf8').split(/\r?\n/).filter(Boolean);
console.log(lines[0]);
const real = {}, extra = [];
for (const ln of lines.slice(1)) {
  const at = ln.indexOf(' => '), k = ln.slice(0, at), v = ln.slice(at + 4), f = {};
  if (k.startsWith('extra|')) { extra.push(ln); continue; }
  const mi = v.indexOf('|msg='); f.msg = v.slice(mi + 5);
  v.slice(0, mi).split('|').forEach(x => { const i = x.indexOf('='); f[x.slice(0, i)] = x.slice(i + 1); });
  real[k] = f;
}
// 실제 SQL에서 where 부분만 모형의 표기로 줄인다
function whereOf(sql) {
  const s = sql.replace(/\b\w+_\d+\./g, ''), i = s.indexOf(' where ');
  return i < 0 ? 'where 없음' : s.slice(i + 1).replace(/\s*(>=|<=|=|>|<)\s*/g, ' $1 ').trim();
}
function expected(c, f) {
  const made = c.how === 'criteria' ? '조건 객체 ' + f.nconds + '개 (문자열 없음)' : f.jpql;
  if (f.result !== 'OK') {
    const m = /At (\d+:\d+) and token '([^']*)'/.exec(f.msg);
    return [made, '실패: ' + f.cause.split('.').pop() + ' (위치 ' + m[1] + ', 낱말 ' + m[2] + ')', +f.nsql === 0 ? 'SQL이 나가지 않음' : 'SQL이 나감', '없음'];
  }
  return [made, '성공', whereOf(f.sql), f.rows + '명'];
}
let ok = 0, n = 0, skipped = 0; const bad = [];
for (const c of combos(lesson)) {
  const sim = lesson.simulate(Object.assign({}, c));
  if (c.how === 'querydsl') { skipped++; if (sim.verified !== false) bad.push('querydsl 조합이 실행으로 확인된 것처럼 표시됨'); continue; }
  const key = c.how + '|' + c.name + '|' + c.age, f = real[key];
  n++;
  if (!f) { bad.push(key + '  실제 실행 결과가 없음'); continue; }
  const exp = expected(c, f);
  if (JSON.stringify(sim.row) === JSON.stringify(exp) && sim.ex === f.ex) ok++;
  else bad.push(key + '\n    모형 ' + sim.row.join(' / ') + ' ' + sim.ex + '\n    실제 ' + exp.join(' / ') + ' ' + f.ex);
}
console.log('일치 ' + ok + ' / ' + n + '  (Querydsl의 ' + skipped + '개 조합은 라이브러리가 없어 실행하지 못했으므로 대조에서 뺌)');
bad.forEach(b => console.log('다름: ' + b));
extra.forEach(e => console.log('덧붙임 확인: ' + e));

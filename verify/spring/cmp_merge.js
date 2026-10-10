// "준영속과 병합" 실습의 모형 결과를 실제 Hibernate 실행 결과(merge_probe.out.txt)와 대조한다
// 비교하는 것: 결과 표의 네 칸(em.contains(m), 영속 상태인 객체, 이 트랜잭션에서 나간 SQL, DB에 남은 값)과, 줄마다 나간 SQL의 종류(trace)
const fs = require('fs'), path = require('path');
const { load, combos } = require('../model_rows.js');
const lesson = load('merge');
const lines = fs.readFileSync(path.join(__dirname, 'merge_probe.out.txt'), 'utf8').split(/\r?\n/).filter(Boolean);
console.log(lines[0]);
const real = {};
lines.filter(l => l.includes(' => ')).forEach(l => { const [k, v] = l.split(' => '); real[k] = v; });
const PRE = ['new', 'find1', 'close1', 'set'];   // 앞선 요청과 준영속 객체를 준비하는 줄 (이 트랜잭션의 SQL로 세지 않는다)
let ok = 0; const all = combos(lesson), bad = [];
for (const c of all) {
  const key = c.src + '|' + c.how + '|' + c.after, v = real[key];
  if (!v) { bad.push(key + '  실제 실행 결과가 없음'); continue; }
  const [trace, cm, same, cr, rows] = v.split('|');
  const cnt = {}, order = [];
  trace.split(' ').forEach(t => { const [line, sqls] = t.split(':'); if (PRE.includes(line)) return; sqls.split(',').filter(Boolean).forEach(k => { const w = k.toUpperCase(); if (!cnt[w]) { cnt[w] = 0; order.push(w); } cnt[w]++; }); });
  const [name, city] = rows.split('=')[1].split(',');
  // 돌려받은(또는 다시 조회한) 객체: 넘긴 객체와 다르고 영속이어야 "m과 다른 객체"
  const managed = same === '-' ? '없음' : same === 'false' && cr === 'true' ? (c.how === 'merge' ? 'r' : 'f') + ' (m과 다른 객체)' : 'm과 같은 객체 또는 영속이 아님';
  const want = [cm, managed, order.length ? order.map(w => w + ' ' + cnt[w] + '번').join(', ') : '없음', name + ' · ' + (city === 'null' ? 'NULL' : city)];
  const sim = lesson.simulate(Object.assign({}, c));
  if (JSON.stringify(sim.row) === JSON.stringify(want) && sim.trace === trace) ok++;
  else bad.push(key + '\n   모형 ' + sim.row.join(' / ') + ' [' + sim.trace + ']\n   실제 ' + want.join(' / ') + ' [' + trace + ']');
}
console.log('일치 ' + ok + ' / ' + all.length);
bad.forEach(b => console.log('다름: ' + b));
// 요약과 assume에 적은 사실(모형의 조합이 아닌 것)이 실제 실행 결과와 맞는지 확인한다
const extra = {
  'extra|merge-new-id': 'new: merge:select commit:insert|1=김철수,서울;9=새회원,null',
  'extra|merge-unchanged': 'find1:select close1: merge:select commit:|1=김철수,서울',
  'extra|merge-already-managed': 'new: find:select merge: commit:update|sameAsFound=true|1=김영수,null',
  'extra|merge-stale': 'find1:select close1: merge:select commit:update|1=김영수,서울',
};
let eok = 0;
Object.keys(extra).forEach(k => { if (real[k] === extra[k]) eok++; else console.log('덧붙인 사실이 다름: ' + k + '  기대 ' + extra[k] + '  실제 ' + real[k]); });
console.log('덧붙인 사실 확인 ' + eok + ' / ' + Object.keys(extra).length);

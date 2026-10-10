// "엔티티의 생명주기" 실습의 모형 결과를 실제 Hibernate 실행 결과(entitylife_probe.out.txt)와 대조한다
// 비교하는 것: 결과 표의 네 칸(em.contains, 나간 SQL, 쓰기 SQL이 나간 때, DB에 남은 값)과, 줄마다 나간 SQL의 종류(trace)
const fs = require('fs'), path = require('path');
const { load, combos } = require('../model_rows.js');
const lesson = load('entitylife');
const lines = fs.readFileSync(path.join(__dirname, 'entitylife_probe.out.txt'), 'utf8').split(/\r?\n/).filter(Boolean);
console.log(lines[0]);
const real = {};
lines.filter(l => l.includes(' => ')).forEach(l => { const [k, v] = l.split(' => '); real[k] = v; });
let ok = 0; const all = combos(lesson), bad = [];
for (const c of all) {
  const key = c.st + '|' + c.when, v = real[key];
  if (!v) { bad.push(key + '  실제 실행 결과가 없음'); continue; }
  const [trace, contains, rows] = v.split('|');
  const cnt = {}, order = [], writeAt = [];
  trace.split(' ').forEach(t => { const [line, sqls] = t.split(':'); sqls.split(',').filter(Boolean).forEach(k => { const w = k.toUpperCase(); if (!cnt[w]) { cnt[w] = 0; order.push(w); } cnt[w]++; if (k !== 'select') writeAt.push(line); }); });
  const want = [
    contains === 'IllegalStateException' ? '예외 (em이 닫힘)' : contains,
    order.length ? order.map(w => w + ' ' + cnt[w] + '번').join(', ') : '없음',
    !writeAt.length ? '나가지 않음' : writeAt.every(k => k === 'commit') ? '커밋할 때' : '그 줄에서 바로',
    rows ? rows.split(';').map(r => r.split('=')[0] + '번 ' + r.split('=')[1]).join(', ') : '행 없음',
  ];
  const sim = lesson.simulate(Object.assign({}, c));
  if (JSON.stringify(sim.row) === JSON.stringify(want) && sim.trace === trace) ok++;
  else bad.push(key + '\n   모형 ' + sim.row.join(' / ') + ' [' + sim.trace + ']\n   실제 ' + want.join(' / ') + ' [' + trace + ']');
}
console.log('일치 ' + ok + ' / ' + all.length);
bad.forEach(b => console.log('다름: ' + b));
// 요약과 assume에 적은 사실(모형의 조합이 아닌 것)이 실제 실행 결과와 맞는지 확인한다
const extra = {
  'extra|flush-then-detach': 'find:select set: flush:update detach: commit:|1=김영수',
  'extra|flush-then-clear': 'find:select set: flush:update clear: commit:|1=김영수',
  'extra|detach-then-find': 'find:select detach: find:select|same=false',
  'extra|clear-then-find': 'find:select clear: find:select|same=false',
  'extra|remove-then-persist': 'find:select remove: persist: contains: commit:|true|1=김철수',
  'extra|persist-then-set-insert-values': 'inserted=2,이영희|1=김철수;2=이수진',
  'extra|object-after-remove': 'name=김철수|',
};
let eok = 0;
Object.keys(extra).forEach(k => { if (real[k] === extra[k]) eok++; else console.log('덧붙인 사실이 다름: ' + k + '  기대 ' + extra[k] + '  실제 ' + real[k]); });
console.log('덧붙인 사실 확인 ' + eok + ' / ' + Object.keys(extra).length);

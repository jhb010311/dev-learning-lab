// "영속성 전이와 고아 객체" 실습의 모형 결과를 실제 Hibernate 실행 결과(cascade_probe.out.txt)와 대조한다.
// 결과 표의 네 칸과 함께, SQL이 나간 순서(호출할 때와 커밋할 때)도 비교한다.
const fs = require('fs'), path = require('path');
const { load, combos } = require('../model_rows.js');
const lesson = load('cascade');
const real = {};
const lines = fs.readFileSync(path.join(__dirname, 'cascade_probe.out.txt'), 'utf8').split(/\r?\n/).filter(Boolean);
console.log(lines[0]);
for (const ln of lines) {
  if (ln.startsWith('#')) continue;
  const [k, v] = ln.split(' => ');
  real[k] = Object.fromEntries(v.split('|').map(x => { const i = x.indexOf('='); return [x.slice(0, i), x.slice(i + 1)]; }));
}
let ok = 0, n = 0; const used = new Set();
for (const c of combos(lesson)) {
  const key = c.cas + '|' + c.orphan + '|' + c.act, r = real[key]; n++; used.add(key);
  if (!r) { console.log('실제 실행 결과 없음: ' + key); continue; }
  const sim = lesson.simulate(Object.assign({}, c));
  const ins = +r.insPost + +r.insComment, del = +r.delPost + +r.delComment, failed = r.ex !== 'none';
  const want = [(+r.selPost + +r.selComment) + '번', ins ? 'INSERT ' + ins + '번' : del ? 'DELETE ' + del + '번' + (failed ? ' (실패)' : '') : '없음', failed ? r.ex.split(' <- ')[0] : '없음', '게시글 ' + r.dbPost + '개 · 댓글 ' + r.dbComment + '개'];
  const same = JSON.stringify(sim.row) === JSON.stringify(want) && sim.sql.call === r.atCall && sim.sql.commit === r.atCommit && r.upd === '0';
  if (same) ok++; else console.log('다름: ' + key + '\n  모형 ' + sim.row.join(' / ') + ' [' + sim.sql.call + ' | ' + sim.sql.commit + ']\n  실제 ' + want.join(' / ') + ' [' + r.atCall + ' | ' + r.atCommit + ']');
}
Object.keys(real).forEach(k => { if (!used.has(k)) console.log('모형에 없는 조합: ' + k); });
console.log('일치 ' + ok + ' / ' + n);

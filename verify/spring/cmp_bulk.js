// "벌크 연산" 실습의 모형 결과를 실제 Hibernate 실행 결과(bulk_probe.out.txt)와 대조한다.
// 결과 표의 네 칸과 함께, SQL이 나간 순서(벌크 연산 때, 읽을 때, 커밋할 때), executeUpdate의 반환값, 엔티티가 아직 관리 중인지도 비교한다.
// "하나씩 고치기"에서는 "읽는 방법" 설정을 쓰지 않으므로(화면에서도 숨김) 그 조합들은 실제 실행 한 줄과 대조한다.
const fs = require('fs'), path = require('path');
const { load, combos } = require('../model_rows.js');
const lesson = load('bulk');
const real = {};
const lines = fs.readFileSync(path.join(__dirname, 'bulk_probe.out.txt'), 'utf8').split(/\r?\n/).filter(Boolean);
console.log(lines[0]);
for (const ln of lines) {
  if (ln.startsWith('#')) continue;
  const [k, v] = ln.split(' => ');
  real[k] = Object.fromEntries(v.split('|').map(x => { const i = x.indexOf('='); return [x.slice(0, i), x.slice(i + 1)]; }));
}
const count = (s, tok) => s === '-' ? 0 : s.split(',').filter(x => x === tok).length;
let ok = 0, n = 0; const used = new Set();
for (const c of combos(lesson)) {
  const key = c.op + '|' + (c.op === 'each' ? 'none' : c.after) + '|' + c.dirty + '|' + c.n, r = real[key]; n++; used.add(key);
  if (!r) { console.log('실제 실행 결과 없음: ' + key); continue; }
  const sim = lesson.simulate(Object.assign({}, c));
  const allSeq = [r.load, r.atOp, r.atRead, r.atCommit].join(',');
  const u1 = count(allSeq, 'U1'), ub = count(allSeq, 'UB'), del = count(allSeq, 'DB');
  let write = '분류하지 못한 쓰기 SQL';
  if (ub === 1 && del === 0) write = u1 ? 'UPDATE ' + (u1 + 1) + '번 (미뤄 둔 변경 ' + u1 + '번 + 벌크 1번)' : 'UPDATE 1번 (벌크)';
  else if (del === 1 && ub === 0) write = u1 ? 'UPDATE ' + u1 + '번 (미뤄 둔 변경) + DELETE 1번 (벌크)' : 'DELETE 1번 (벌크)';
  else if (ub === 0 && del === 0) write = 'UPDATE ' + u1 + '번 (상품마다 1번)';
  const dbText = r.db === 'none' ? '행 없음' : r.db + '원';
  let read;
  if (r.readEx !== 'none') read = r.readEx.split(' <- ')[0];
  else if (r.read === 'empty') read = '조회 결과 0건';
  else if (/^\d+$/.test(r.read)) read = r.read + '원' + (r.db === 'none' ? ' (DB에는 없는 행)' : r.read === r.db ? ' (DB와 같음)' : ' (DB는 ' + dbText + ')');
  else read = r.read;                                                  // null, 또는 "(다른 객체)"가 붙은 값
  const want = ['SELECT ' + count(allSeq, 'S') + '번', write, read, dbText];
  const bulk = c.op !== 'each';
  const same = JSON.stringify(sim.row) === JSON.stringify(want) && sim.seq.op === r.atOp && sim.seq.read === r.atRead && sim.seq.commit === r.atCommit
    && String(sim.contains) === r.contains && r.commitEx === 'none' && r.changed === (bulk ? String(c.n) : '-1') && r.dbRows === (c.op === 'delete' ? '0' : String(c.n)) && count(allSeq, '?') === 0 && count(allSeq, 'D1') === 0;
  if (same) ok++; else console.log('다름: ' + key + '\n  모형 ' + sim.row.join(' / ') + ' [' + sim.seq.op + ' | ' + sim.seq.read + ' | ' + sim.seq.commit + '] contains ' + sim.contains + '\n  실제 ' + want.join(' / ') + ' [' + r.atOp + ' | ' + r.atRead + ' | ' + r.atCommit + '] contains ' + r.contains + ' changed ' + r.changed + ' dbRows ' + r.dbRows + ' commitEx ' + r.commitEx);
}
Object.keys(real).forEach(k => { if (!used.has(k)) console.log('모형에 없는 조합: ' + k); });
console.log('일치 ' + ok + ' / ' + n + ' (서로 다른 실제 실행 ' + used.size + '가지)');

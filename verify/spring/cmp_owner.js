// "연관관계의 주인" 실습의 모형을 실제 Hibernate 실행 결과(owner_probe.out.txt)와 조합마다 대조한다.
// 대조하는 것: 만들어진 테이블과 컬럼, 나간 SQL의 종류와 테이블별 횟수(나간 순서대로), persist 직후와 커밋 직전까지 나간 SQL, 다시 찾은 팀이 같은 객체인지, DB의 member.team_id, 연결 테이블의 행 수, team.getMembers().size(), 그리고 화면의 결과 표(row)
const fs = require('fs'), path = require('path');
const { load, combos } = require('../model_rows.js');
const lesson = load('owner');
const lines = fs.readFileSync(path.join(__dirname, 'owner_probe.out.txt'), 'utf8').split(/\r?\n/).filter(l => l.includes(' => '));
const real = {}; lines.forEach(ln => { const [k, v] = ln.split(' => '); real[k] = Object.fromEntries(v.split('|').map(p => { const i = p.indexOf('='); return [p.slice(0, i), p.slice(i + 1)]; })); });
function sqlOf(sent) { const m = new Map(); sent.forEach(q => { const k = q.kind + ':' + q.table; m.set(k, (m.get(k) || 0) + 1); }); return [...m].map(([k, n]) => k + '=' + n).join(','); }
function kindsOf(sqlStr) { const m = new Map(); sqlStr.split(',').forEach(p => { const k = p.split(':')[0].toUpperCase(), n = +p.split('=')[1]; m.set(k, (m.get(k) || 0) + n); }); return [...m].map(([k, n]) => k + ' ' + n + '번').join(', '); }
let ok = 0, n = 0; const used = new Set();
for (const c of combos(lesson)) {
  const key = c.mp + '|' + c.set + '|' + c.clear, r = real[key]; n++; used.add(key);
  if (!r) { console.log('실제 결과 없음: ' + key); continue; }
  const sim = lesson.simulate(Object.assign({}, c));
  const model = { tables: sim.tables.map(t => t.name + '(' + t.cols.slice().sort().join(',') + ')').sort().join(';'), sql: sqlOf(sim.sent), teamId: sim.fk, joinRows: c.mp ? '-' : String(sim.join), size: sim.size,
    sameObject: String(sim.same), sqlAfterPersist: sqlOf(sim.sent.slice(0, sim.afterPersist)), sqlBeforeCommit: sqlOf(sim.sent.slice(0, sim.beforeCommit)) };
  const diff = Object.keys(model).filter(k => model[k] !== r[k]).map(k => k + ' 모형 ' + model[k] + ' / 실제 ' + r[k]);
  const rowReal = [r.teamId, r.size + '명', kindsOf(r.sql), r.tables.split(';').map(t => t.split('(')[0]).sort((a, b) => ['team', 'member', 'team_member'].indexOf(a) - ['team', 'member', 'team_member'].indexOf(b)).join(', ')];
  if (JSON.stringify(sim.row) !== JSON.stringify(rowReal)) diff.push('row 모형 ' + sim.row.join(' / ') + ' / 실제 ' + rowReal.join(' / '));
  if (diff.length) console.log('다름: ' + key + '\n  ' + diff.join('\n  ')); else ok++;
}
Object.keys(real).filter(k => !used.has(k)).forEach(k => console.log('모형에 없는 조합: ' + k));
console.log(lines.length + '개 조합 실행 결과, ' + fs.readFileSync(path.join(__dirname, 'owner_probe.out.txt'), 'utf8').split(/\r?\n/)[0].slice(2));
console.log('일치 ' + ok + ' / ' + n);

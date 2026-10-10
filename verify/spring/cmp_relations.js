// "다대일, 일대다, 일대일, 다대다" 실습의 모형을 실제 Hibernate 실행 결과(relations_probe.out.txt)와 조합마다 대조한다.
// 대조하는 것: 만들어진 테이블과 컬럼, 외래 키가 걸린 컬럼과 유니크 제약, 커밋 전까지 나간 SQL과 전체 SQL(종류와 테이블별 횟수, 나간 순서대로),
//             외래 키가 INSERT 문에 들어 있는지, 외래 키 컬럼에 남은 값, 그리고 화면의 결과 표(row)
const fs = require('fs'), path = require('path');
const { load, combos } = require('../model_rows.js');
const lesson = load('relations');
const text = fs.readFileSync(path.join(__dirname, 'relations_probe.out.txt'), 'utf8').split(/\r?\n/);
const lines = text.filter(l => l.includes(' => '));
const real = {}; lines.forEach(ln => { const [k, v] = ln.split(' => '); real[k] = Object.fromEntries(v.split('|').map(p => { const i = p.indexOf('='); return [p.slice(0, i), p.slice(i + 1)]; })); });
function sqlOf(sent) { const m = new Map(); sent.forEach(q => { const k = q.kind + ':' + q.table; m.set(k, (m.get(k) || 0) + 1); }); return [...m].map(([k, n]) => k + '=' + n).join(',') || 'none'; }
function kindsOf(sqlStr) { const m = new Map(); sqlStr.split(',').forEach(p => { const k = p.split(':')[0].toUpperCase(), n = +p.split('=')[1]; m.set(k, (m.get(k) || 0) + n); }); return [...m].map(([k, n]) => k + ' ' + n + '번').join(', '); }
const dbOf = { m2o: s => s.rows.member.map(r => r[1] + ',' + r[2]), o2m: s => s.rows.member.map(r => r[1] + ',' + r[2]), o2mjt: s => s.rows.team_member.map(r => r.join(',')), o2omain: s => s.rows.member.map(r => r[1] + ',' + r[2]), o2otarget: s => s.rows.locker.map(r => r[1] + ',' + r[2]), m2m: s => s.rows.member_product.map(r => r.join(',')) };
let ok = 0; const seen = new Set(), failed = new Set();
for (const c of combos(lesson)) {
  const sim = lesson.simulate(Object.assign({}, c)), key = sim.key + '|' + (c.rel === 'o2o' ? 1 : c.n), r = real[key];
  seen.add(key);
  if (!r) { console.log('실제 결과 없음: ' + key); failed.add(key); continue; }
  const model = {
    tables: sim.tables.map(t => t.name + '(' + t.cols.slice().sort().join(',') + ')').sort().join(';'),
    fk: sim.fks.map(f => f[0] + '.' + f[1] + (f[3] ? '!' : '') + '>' + f[2]).sort().join(','),
    sqlBeforeCommit: sqlOf(sim.sent.slice(0, sim.before)), sql: sqlOf(sim.sent), fkInInsert: sim.fkInInsert, db: dbOf[sim.key](sim).join(';'),
  };
  const want = Object.assign({}, r, { fk: r.fk.split(',').sort().join(',') });
  const diff = Object.keys(model).filter(k => model[k] !== want[k]).map(k => k + ' 모형 ' + model[k] + ' / 실제 ' + want[k]);
  const rowReal = [r.tables.split(';').map(t => t.split('(')[0]).sort().join(', '), r.fk.split(',').map(f => f.split('>')[0]).map(f => f.endsWith('!') ? f.slice(0, -1) + ' (유니크)' : f).sort().join(', '), kindsOf(r.sql)];
  const rowModel = [sim.row[0].split(', ').sort().join(', '), sim.row[1].split(', ').sort().join(', '), sim.row[2]];
  if (JSON.stringify(rowModel) !== JSON.stringify(rowReal)) diff.push('row 모형 ' + rowModel.join(' / ') + ' / 실제 ' + rowReal.join(' / '));
  if (diff.length) { if (!failed.has(key)) console.log('다름: ' + key + '\n  ' + diff.join('\n  ')); failed.add(key); }
}
Object.keys(real).filter(k => !seen.has(k)).forEach(k => { console.log('모형에 없는 조합: ' + k); failed.add(k); });
ok = [...seen].filter(k => !failed.has(k)).length;
console.log(lines.length + '개 조합 실행 결과, ' + text[0].slice(2));
console.log('일치 ' + ok + ' / ' + new Set([...seen, ...Object.keys(real)]).size);

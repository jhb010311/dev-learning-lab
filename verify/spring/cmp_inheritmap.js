// "상속 관계 매핑" 실습의 모형을 실제 Hibernate 실행 결과(inheritmap_probe.out.txt)와 조합마다 대조한다.
// 대조하는 것: 만들어진 테이블과 컬럼, 자식에서 부모로 가는 외래 키, 커밋 전에 나간 SQL 수, 나간 SQL(종류와 테이블별 횟수),
//             조회 쿼리의 모양(읽은 테이블, 조인 수, 내부 조인 수, UNION 수, 구분 컬럼 조건), 돌려받은 객체의 타입, DB에 남은 행, 화면의 결과 표(row)
const fs = require('fs'), path = require('path');
const { load, combos } = require('../model_rows.js');
const lesson = load('inheritmap');
const text = fs.readFileSync(path.join(__dirname, 'inheritmap_probe.out.txt'), 'utf8').split(/\r?\n/);
const lines = text.filter(l => l.includes(' => ') && !l.startsWith('#'));
const real = {}; lines.forEach(ln => { const [k, v] = ln.split(' => '); real[k] = Object.fromEntries(v.split('|').map(p => { const i = p.indexOf('='); return [p.slice(0, i), p.slice(i + 1)]; })); });
function shapeOf(str) { if (str === 'none') return null; const o = Object.fromEntries(str.split(',').map(p => p.split('='))); o.read = o.read.split('+').sort().join('+'); return o; }
let ok = 0;
for (const key of Object.keys(real)) {
  const [st, kids, op] = key.split('|'), r = real[key], sim = lesson.simulate({ st, op, kids: +kids });
  const sorted = t => t.cols.slice().sort();
  const model = {
    tables: sim.tables.map(t => t.name + '(' + sorted(t).join(',') + ')').sort().join(';'),
    fk: sim.fks.map(f => f[0] + '.' + f[1] + '>' + f[2]).sort().join(',') || 'none',
    sqlBeforeCommit: sim.before,
    sql: op === 'save' ? sim.sent.map(q => q.kind + ':' + q.tables[0] + '=1').join(',') : 'select=' + sim.sent.length,
    found: sim.found,
    db: sim.tables.slice().sort((a, b) => a.name < b.name ? -1 : 1).map(t => t.name + '[' + sim.rows[t.name].map(row => sorted(t).map(col => row[t.cols.indexOf(col)]).join(',')).join('/') + ']').join(';'),
  };
  const diff = Object.keys(model).filter(k => model[k] !== r[k]).map(k => k + ' 모형 ' + model[k] + ' / 실제 ' + r[k]);
  const sh = shapeOf(r.shape);
  if (op === 'save') { if (sh) diff.push('shape 실제 ' + r.shape); }
  else {
    const m = { read: sim.touched.slice().sort().join('+'), join: String(sim.joins), innerJoin: String(sim.innerJoins), union: String(sim.unions), dtypeInWhere: String(sim.dtypeInWhere) };
    Object.keys(m).forEach(k => { if (m[k] !== sh[k]) diff.push('shape.' + k + ' 모형 ' + m[k] + ' / 실제 ' + sh[k]); });
  }
  // 화면의 결과 표를 실제 결과로 다시 만들어 비교한다
  const names = r.tables.split(';').map(t => t.split('(')[0]);
  const count = r.sql.split(',').reduce((a, p) => a + +p.split('=')[1], 0);
  const touchedReal = op === 'save' ? r.sql.split(',').map(p => p.split(':')[1].split('=')[0]) : sh.read.split('+');
  const colCount = r.tables.split(';')[0].split('(')[1].replace(')', '').split(',').length;   // 단일 테이블 전략에서는 컬럼 수도 표에 적는다
  const rowReal = [names.slice().sort().join(', ') + ' (' + names.length + '개' + (st === 'SINGLE_TABLE' ? ', 컬럼 ' + colCount + '개' : '') + ')', (op === 'save' ? 'INSERT ' : 'SELECT ') + count + '번', touchedReal.slice().sort().join(', '), op === 'save' ? '해당 없음' : +sh.join ? '조인 ' + sh.join + '번' : +sh.union ? 'UNION ALL ' + sh.union + '번 (테이블 ' + touchedReal.length + '개)' : '없음'];
  const rowModel = [sim.row[0].replace(/^(.*?) [(](.*)[)]$/, (m0, a, b) => a.split(', ').sort().join(', ') + ' (' + b + ')'), sim.row[1], sim.row[2].split(', ').sort().join(', '), sim.row[3]];
  if (JSON.stringify(rowModel) !== JSON.stringify(rowReal)) diff.push('row 모형 ' + rowModel.join(' / ') + ' / 실제 ' + rowReal.join(' / '));
  if (diff.length) console.log('다름: ' + key + '\n  ' + diff.join('\n  ')); else ok++;
}
// 모형이 낼 수 있는 조합이 실제 실행 결과에 모두 있는지도 본다
combos(lesson).forEach(c => { const k = c.st + '|' + c.kids + '|' + c.op; if (!real[k]) console.log('실제 결과 없음: ' + k); });
console.log(lines.length + '개 조합 실행 결과, ' + text[0].slice(2));
console.log('일치 ' + ok + ' / ' + lines.length);

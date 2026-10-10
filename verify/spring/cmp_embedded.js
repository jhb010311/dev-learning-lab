// "값 타입과 임베디드 타입" 실습의 모형을 실제 Hibernate 실행 결과(embedded_probe.out.txt)와 조합마다 대조한다.
// 대조하는 것: 만들어진 테이블과 컬럼(또는 시작할 때의 예외), 나간 SQL의 종류와 테이블별 횟수(나간 순서대로), 커밋 전까지 나간 SQL,
//             DELETE가 그 회원의 행 전부를 지우는 문장인지, DB에 남은 값, 다시 읽은 address, 같은 객체를 함께 쓰는지, 그리고 화면의 결과 표(row)
const fs = require('fs'), path = require('path');
const { load, combos } = require('../model_rows.js');
const lesson = load('embedded');
const text = fs.readFileSync(path.join(__dirname, 'embedded_probe.out.txt'), 'utf8').split(/\r?\n/);
const lines = text.filter(l => l.includes(' => ') && !l.startsWith('#'));
const base = {}; lesson.controls.forEach(d => base[d.id] = d.value);
function parse(v) { return Object.fromEntries(v.split('|').map(p => { const i = p.indexOf('='); return [p.slice(0, i), p.slice(i + 1)]; })); }
function sqlOf(sent) { const m = new Map(); sent.forEach(q => { const k = q.kind + ':' + q.table; m.set(k, (m.get(k) || 0) + (q.n || 1)); }); return [...m].map(([k, n]) => k + '=' + n).join(',') || 'none'; }
function tablesOf(sim) { return sim.tables.map(t => t.name + '(' + t.cols.slice().sort().join(',') + ')').sort().join(';'); }
function writesOf(sqlStr) { const m = new Map(); sqlStr.split(',').forEach(p => { const k = p.split(':')[0].toUpperCase(), n = +p.split('=')[1]; if (k !== 'SELECT' && k !== 'NONE') m.set(k, (m.get(k) || 0) + n); }); return [...m].map(([k, n]) => k + ' ' + n + '번').join(', ') || '없음'; }
function tableText(str) { return str.split(';').map(t => t.split('(')[0] + ' (' + t.split('(')[1].replace(')', '').split(',').sort().join(', ') + ')').sort().join(', '); }
function rowTables(cell) { return cell.split('), ').map(x => x.replace(/\)$/, '')).map(x => x.split(' (')[0] + ' (' + x.split(' (')[1].split(', ').sort().join(', ') + ')').sort().join(', '); }
let ok = 0; const seen = new Set();
for (const ln of lines) {
  const [key, v] = ln.split(' => '), k = key.split('|'), r = parse(v), diff = [];
  let c, model, rowReal, rowModel;
  seen.add(key);
  if (k[0] === 'table') {
    c = Object.assign({}, base, { sc: 'table', tb: k[1] });
    const sim = lesson.simulate(c);
    if (r.error) {
      model = { error: sim.error, dupColumn: String(sim.error === 'MappingException' && sim.tables.length === 0) };
      rowReal = ['만들어지지 않음', '없음', '시작할 때 ' + r.error + ' (city 컬럼이 겹침)'];
      if (!/column 'city' is duplicated/i.test(r.msg)) diff.push('실제 예외 메시지가 city 컬럼 중복이 아님: ' + r.msg);
      rowModel = sim.row;
    } else {
      model = { tables: tablesOf(sim), sqlBeforeCommit: sqlOf(sim.sent.slice(0, sim.before)), sql: sqlOf(sim.sent), db: sim.dbRow.join(','), readSql: sqlOf(sim.readSent) === 'none' ? '-' : sqlOf(sim.readSent), loadedAddress: sim.loaded };
      rowReal = [tableText(r.tables), writesOf(r.sql), r.db.split(',').slice(1).join(', ') + (r.loadedAddress === 'null' ? ' (다시 읽으면 address가 null)' : '')];
      rowModel = [rowTables(sim.row[0]), sim.row[1], sim.row[2]];
      if (sim.error) diff.push('모형은 예외인데 실제는 시작됨');
    }
  } else if (k[0] === 'share') {
    c = Object.assign({}, base, { sc: 'share', sh: k[1] });
    const sim = lesson.simulate(c);
    model = { tables: tablesOf(sim), sqlBeforeChange: sqlOf(sim.sent.slice(0, sim.before)), sqlBeforeCommit: sqlOf(sim.sent.slice(0, sim.before)), sql: sqlOf(sim.sent), db: sim.db.map(x => x[1] + ',' + x[2]).join(';'), sameObjectAtEnd: String(sim.shared) };
    rowReal = [tableText(r.tables), writesOf(r.sql), r.db.split(';').map(x => x.split(',').join(' ')).join(', ')];
    rowModel = [rowTables(sim.row[0]), sim.row[1], sim.row[2]];
  } else {
    c = Object.assign({}, base, { sc: 'coll', ct: k[1], op: k[2], n: +k[3] });
    const sim = lesson.simulate(c), ord = k[1] === 'order';
    model = { tables: tablesOf(sim), seed: sqlOf(sim.seed), sqlAfterFind: sqlOf(sim.sent.slice(0, sim.afterFind)), sqlBeforeCommit: sqlOf(sim.sent.slice(0, sim.before)), sql: sqlOf(sim.sent), deleteAll: String(sim.sent.filter(q => q.kind === 'delete' && q.all).length),
      db: ord ? sim.final.map(x => x.idx + ':' + x.city).join(';') : sim.final.map(x => x.city).sort().join(';') };
    const realCities = r.db.split(';').map(x => ord ? x.split(':')[1] : x);
    rowReal = [tableText(r.tables), writesOf(r.sql), ord ? realCities.join(', ') : realCities.slice().sort().join(', ')];
    rowModel = [rowTables(sim.row[0]), sim.row[1], ord ? sim.row[2] : sim.row[2].split(', ').sort().join(', ')];
    if (!ord) r.db = r.db.split(';').sort().join(';');
  }
  Object.keys(model).forEach(x => { if (model[x] !== r[x]) diff.push(x + ' 모형 ' + model[x] + ' / 실제 ' + r[x]); });
  if (JSON.stringify(rowModel) !== JSON.stringify(rowReal)) diff.push('row 모형 ' + rowModel.join(' / ') + ' / 실제 ' + rowReal.join(' / '));
  if (diff.length) console.log('다름: ' + key + '\n  ' + diff.join('\n  ')); else ok++;
}
// 모형이 낼 수 있는 조합(숨은 설정은 빼고)이 실제 실행 결과에 모두 있는지도 본다
combos(lesson).forEach(c => { const key = c.sc === 'table' ? 'table|' + c.tb : c.sc === 'share' ? 'share|' + c.sh : 'coll|' + c.ct + '|' + c.op + '|' + c.n; if (!seen.has(key)) { console.log('실제 결과 없음: ' + key); seen.add(key); } });
console.log(lines.length + '개 조합 실행 결과, ' + text[0].slice(2));
console.log('일치 ' + ok + ' / ' + lines.length);

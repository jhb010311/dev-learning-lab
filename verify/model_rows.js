// 실습 하나의 모든 설정 조합과 모형 결과(row)를 한 줄씩 JSON으로 낸다. 범위 설정은 최소·기본·최대만 쓴다.
// 사용: node model_rows.js <실습 id> [설정=값,값 ...]  (뒤의 인자로 특정 설정의 값 목록을 직접 정할 수 있다)
const fs = require('fs'), path = require('path'), vm = require('vm');
const dir = path.join(__dirname, '..', 'src', 'lessons');
const L = []; const ctx = vm.createContext({ Lab: { register: o => L.push(o), fmt: String }, console, Math, JSON });
for (const f of fs.readdirSync(dir).sort()) vm.runInContext(fs.readFileSync(path.join(dir, f), 'utf8'), ctx);
function load(id) { const l = L.find(x => x.id === id); if (!l) throw new Error('없는 실습 ' + id); return l; }
function combos(l, over) {
  over = over || {};
  const vals = l.controls.map(d => over[d.id] ? over[d.id] : d.type === 'check' ? [false, true] : d.type === 'select' ? d.options.map(o => o[0]) : [...new Set([d.min, d.value, d.max])]);
  let out = [{}];
  l.controls.forEach((d, i) => { out = out.flatMap(c => vals[i].map(v => Object.assign({}, c, { [d.id]: v }))); });
  return out.map(c => { if (l.fix) { const f = l.fix(c); if (f) Object.assign(c, f); } return c; });
}
module.exports = { load, combos };
if (require.main === module) {
  const l = load(process.argv[2]), over = {};
  process.argv.slice(3).forEach(a => { const [k, v] = a.split('='); over[k] = v.split(',').map(x => x === 'true' ? true : x === 'false' ? false : isNaN(+x) ? x : +x); });
  console.log('# ' + l.id + ' columns: ' + JSON.stringify(l.columns));
  const seen = new Set();
  for (const c of combos(l, over)) { const k = JSON.stringify(c); if (seen.has(k)) continue; seen.add(k); console.log(JSON.stringify({ c, row: l.simulate(Object.assign({}, c)).row })); }
}

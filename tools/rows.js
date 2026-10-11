// 실습의 모든 설정 조합(select, check)을 돌려 결과 표의 행을 뽑는다. 문제를 쓸 때 모형의 결과와 대조할 값을 찾는 데 쓴다.
// 실행: node tools/rows.js <id> [en]
const fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..'), id = process.argv[2], en = process.argv[3] === 'en';
const dir = path.join(root, 'src', en ? 'en' : '', 'lessons'), L = [];
global.Lab = { register: x => L.push(x), fmt: x => (Math.round(x * 10) / 10).toFixed(1) };
fs.readdirSync(dir).filter(f => f.endsWith('.js')).forEach(f => { const s = fs.readFileSync(path.join(dir, f), 'utf8'); if (s.includes("id: '" + id + "'")) require(path.join(dir, f)); });
const l = L.filter(x => x.id === id)[0]; if (!l) { console.log('실습 없음: ' + id); process.exit(1); }
console.log('열: ' + l.columns.join(' | '));
const opts = l.controls.map(d => d.type === 'select' ? d.options.map(o => o[0]) : d.type === 'check' ? [false, true] : [d.value]);
(function go(i, c) {
  if (i === l.controls.length) { let r; try { r = l.simulate(Object.assign({}, c)).row.join(' | '); } catch (e) { r = '오류: ' + e.message; } console.log(JSON.stringify(c) + ' → ' + r); return; }
  opts[i].forEach(v => { c[l.controls[i].id] = v; go(i + 1, c); });
})(0, {});

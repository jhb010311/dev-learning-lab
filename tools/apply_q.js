// 물음(q) 고침 목록(JSON: [{ id, n, old, new }])을 실습 파일에 적용한다. 원래 문장이 그 실습 파일에 정확히 한 번 있을 때만 바꾼다.
// 실행: node tools/apply_q.js <목록 파일> [목록 파일 ...]      (뒤에 적은 파일이 같은 id·n의 앞 항목을 덮어쓴다)
const fs = require('fs'), path = require('path');
const dir = path.join(__dirname, '..', 'src', 'lessons');
const files = {}; fs.readdirSync(dir).filter(f => f.endsWith('.js')).forEach(f => { const s = fs.readFileSync(path.join(dir, f), 'utf8'), m = s.match(/\n\s*id: '([^']+)', nav:/); if (m) files[m[1]] = f; });
const BS = String.fromCharCode(92), esc = s => s.split(BS).join(BS + BS).split("'").join(BS + "'");
const fixes = {};
process.argv.slice(2).forEach(p => { JSON.parse(fs.readFileSync(p, 'utf8')).forEach(x => { const k = x.id + '#' + x.n; fixes[k] = Object.assign({}, fixes[k], x, { old: (fixes[k] || x).old }); }); });
let done = 0, skip = 0; const touched = {};
Object.keys(fixes).forEach(k => {
  const x = fixes[k], f = files[x.id]; if (!f) { console.log('실습 없음: ' + k); skip++; return; }
  if (x.old === x.new) return;
  if (/[']/.test(x.new) && !/[']/.test(x.old)) { console.log('작은따옴표가 새로 들어감: ' + k); skip++; return; }
  const full = path.join(dir, f); let s = touched[f] || fs.readFileSync(full, 'utf8');
  const a = "q: '" + esc(x.old) + "'", b = "q: '" + esc(x.new) + "'", n = s.split(a).length - 1;
  if (n !== 1) { console.log('원래 문장을 못 찾음(' + n + '): ' + k + ' ' + x.old.slice(0, 50)); skip++; return; }
  touched[f] = s.split(a).join(b); done++;
});
Object.keys(touched).forEach(f => fs.writeFileSync(path.join(dir, f), touched[f]));
console.log('바꾼 물음 ' + done + '개, 건너뛴 것 ' + skip + '개, 고친 파일 ' + Object.keys(touched).length + '개');

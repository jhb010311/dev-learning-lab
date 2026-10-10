// 새로 만든 실습을 목차에 연결한다. 사용: node tools/integrate.js id=목차 항목 이름 [id=목차 항목 이름 ...]
// 실습마다 필요한 파일이 다 있는지, 단독 검사가 통과하는지 확인한 뒤에만 목차의 "준비 중" 항목을 실습으로 바꾼다.
const fs = require('fs'), path = require('path'), cp = require('child_process');
const root = path.join(__dirname, '..'), cf = path.join(root, 'src', 'curriculum.js');
let cur = fs.readFileSync(cf, 'utf8'), done = 0;
for (const arg of process.argv.slice(2)) {
  const i = arg.indexOf('='), id = arg.slice(0, i), t = arg.slice(i + 1);
  const need = ['src/verify_' + id + '.js', 'src/quiz_' + id + '.js'].filter(f => !fs.existsSync(path.join(root, f)));
  if (need.length) { console.log(id + ': 파일 없음 ' + need.join(', ')); continue; }
  let ok = true, out = '';
  try { out = cp.execFileSync(process.execPath, [path.join(__dirname, 'check_lesson.js'), id], { encoding: 'utf8' }); } catch (e) { ok = false; out = (e.stdout || '') + (e.stderr || ''); }
  const warn = out.split('\n').filter(l => /^주의:|^오류:|잘리는 글자/.test(l));
  if (!ok) { console.log(id + ': 검사 실패\n  ' + warn.join('\n  ')); continue; }
  const esc = t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), re = new RegExp("\\{ t: '" + esc + "', d: '[^']*' \\}");
  if (cur.includes("{ id: '" + id + "' }")) { console.log(id + ': 이미 목차에 있음'); done++; }
  else if (!re.test(cur)) { console.log(id + ': 목차에서 "' + t + '" 항목을 찾지 못함'); continue; }
  else { cur = cur.replace(re, "{ id: '" + id + "' }"); done++; console.log(id + ': 연결함' + (warn.length ? '\n  ' + warn.join('\n  ') : '')); }
}
fs.writeFileSync(cf, cur);
console.log(done + '개 연결');

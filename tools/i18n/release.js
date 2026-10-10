// 옮겨진 실습들을 한꺼번에 검사하고, 모두 통과하면 영어판 공개 목록(src/en/ready.js)에 넣는다.
// 사용: node tools/i18n/release.js <실습 id> [<실습 id> ...]
// 하는 일: 실습마다 check_en.js, 설명집 파일이 있으면 check_kb.js. 하나라도 실패하면 아무것도 넣지 않는다.
//          통과하면 ready.js에 id를 더하고, 커밋할 파일 목록을 dist/release_files.txt에 적는다(한 줄에 하나).
const fs = require('fs'), path = require('path'), cp = require('child_process');
const root = path.join(__dirname, '..', '..'), ids = process.argv.slice(2);
if (!ids.length) { console.log('사용: node tools/i18n/release.js <실습 id> ...'); process.exit(1); }
const run = (script, arg) => { try { return cp.execFileSync(process.execPath, [path.join(__dirname, script), arg], { encoding: 'utf8' }).trim().split('\n').pop(); } catch (e) { return ((e.stdout || '') + (e.stderr || '')).trim().split('\n').pop() || '실패'; } };
const koDir = path.join(root, 'src', 'lessons'), files = [];
let bad = 0;
ids.forEach(id => {
  const file = fs.readdirSync(koDir).find(f => new RegExp("^  id: '" + id + "', nav:", 'm').test(fs.readFileSync(path.join(koDir, f), 'utf8')));
  if (!file) { console.log(id + ': 한국어 실습을 찾지 못함'); bad++; return; }
  const r = run('check_en.js', id); let line = id + ': ' + r; if (!/검사 통과/.test(r)) bad++;
  files.push('src/en/lessons/' + file, 'src/en/quiz_' + id + '.js', 'src/en/verify_' + id + '.js');
  if (fs.existsSync(path.join(root, 'kb', 'en', 'kb_' + id + '.js'))) { const k = run('check_kb.js', 'kb_' + id + '.js'); line += ' | kb: ' + k; if (!/검사 통과/.test(k)) bad++; files.push('kb/en/kb_' + id + '.js'); }
  console.log(line);
});
if (bad) { console.log('\n실패한 것이 있어 공개 목록에 넣지 않았습니다.'); process.exit(1); }
const rf = path.join(root, 'src', 'en', 'ready.js'); let s = fs.readFileSync(rf, 'utf8'); const have = new Set(require(rf));
const add = ids.filter(id => !have.has(id));
if (add.length) { s = s.replace(/\n\];\s*$/, '\n  ' + add.map(id => "'" + id + "'").join(', ') + ',\n];\n'); fs.writeFileSync(rf, s); }
fs.mkdirSync(path.join(root, 'dist'), { recursive: true }); fs.writeFileSync(path.join(root, 'dist', 'release_files.txt'), files.join('\n') + '\n');
console.log('\n공개 목록에 더함: ' + (add.join(', ') || '(이미 있음)') + ' | 커밋할 파일 ' + files.length + '개 → dist/release_files.txt');

// 공통 틀(src/framework.html)에서 화면에 나오는 한글 글자를 뽑아 한 줄에 하나씩 낸다. src/en/ui.js를 만들거나 고칠 때 본다.
// 사용: node tools/i18n/ui_strings.js [내보낼 파일]
const fs = require('fs'), path = require('path');
const HAN = /[가-힣]/;
let h = fs.readFileSync(path.join(__dirname, '..', '..', 'src', 'framework.html'), 'utf8').split('\r\n').join('\n');
h = h.split('\n').filter(l => !(HAN.test(l) && /^\s*\/\//.test(l))).map(l => l.replace(/\s+\/\/ [^'"`]*[가-힣][^'"`]*$/, '')).join('\n').replace(/\/\*[^*]*[가-힣][^*]*\*\//g, '');
const out = [];
h.split('\n').forEach(l => {
  if (!HAN.test(l)) return;
  const re = /'((?:[^'\\]|\\.)*)'|>([^<>]*[가-힣][^<>]*)<|"([^"]*[가-힣][^"]*)"/g; let m, found = false;
  while ((m = re.exec(l))) { const x = m[1] !== undefined ? m[1] : m[2] !== undefined ? m[2] : m[3]; if (HAN.test(x)) { out.push(x); found = true; } }
  if (!found) out.push('LINE: ' + l.trim());
});
const uniq = [...new Set(out)];
if (process.argv[2]) fs.writeFileSync(process.argv[2], uniq.join('\n')); else console.log(uniq.join('\n'));
console.error(uniq.length + '개');

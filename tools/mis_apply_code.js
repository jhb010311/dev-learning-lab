// 오해 표현 점검에서 코드(따옴표가 걸친 곳, 조건, 그림)를 고쳐야 하는 것을 적용한다.
// dist/audit/mis/cf_*.json: [{ "file": "lessons/10_pc.js" 또는 "en/lessons/10_pc.js", "a": "원래 글자", "b": "고친 글자", "n": 1, "why": "..." }]
// 여러 번 돌려도 된다(a가 없고 b가 있으면 건너뜀).
const fs = require('fs'), path = require('path');
const dir = path.join(__dirname, '..', 'dist', 'audit', 'mis'), root = path.join(__dirname, '..', 'src');
let done = 0, skip = 0, bad = 0;
fs.readdirSync(dir).filter(f => /^cf_.*\.json$/.test(f)).sort().forEach(jf => {
  JSON.parse(fs.readFileSync(path.join(dir, jf), 'utf8')).forEach(x => {
    const f = path.join(root, x.file); let s = fs.readFileSync(f, 'utf8'); const n = s.split(x.a).length - 1;
    const hasB = s.indexOf(x.b) >= 0;
    // 이미 고쳐진 것: b 안에 a가 들어 있는 항목은 b가 있으면 끝난 것이다(다시 적용하면 겹쳐 들어간다)
    if (hasB && x.b.indexOf(x.a) >= 0) { skip++; return; }
    // a가 적힌 개수만큼 남아 있으면 고친다. 개수가 다른데 b가 있으면 이미 고쳐진 것으로 본다(b가 다른 곳에도 있는 경우, a가 다른 글 속에 우연히 남은 경우)
    if (n !== (x.n || 1)) { if (hasB) { skip++; return; } console.log('못 고침(' + n + '번): ' + jf + ' ' + x.file + ' ' + x.a.slice(0, 50)); bad++; return; }
    fs.writeFileSync(f, s.split(x.a).join(x.b)); done++;
  });
});
console.log('고친 곳 ' + done + ', 이미 고쳐짐 ' + skip + ', 못 고침 ' + bad);

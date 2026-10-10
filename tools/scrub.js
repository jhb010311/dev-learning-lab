// 공개 전에: 검증 출력에 섞인 이 PC의 경로(사용자 이름이 들어 있음)를 지운다. 남아 있으면 0이 아닌 코드로 끝난다.
const fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..');
const skip = new Set(['.git', 'node_modules', 'tools']);
let hit = 0;
(function walk(d) {
  for (const n of fs.readdirSync(d)) {
    if (skip.has(n)) continue;
    const p = path.join(d, n), st = fs.statSync(p);
    if (st.isDirectory()) { walk(p); continue; }
    if (st.size > 5e6) continue;
    const s = fs.readFileSync(p, 'utf8');
    if (!/[A-Za-z]:[\\/]Users[\\/][^\\/\s'"]+/.test(s)) continue;
    const t = s.replace(/[A-Za-z]:[\\/]Users[\\/][^\\/\s'"]+([\\/]AppData[\\/]Local[\\/]Temp)?([\\/]lab-config\d+)?/g, '<이 PC의 임시 폴더>');
    fs.writeFileSync(p, t); hit++; console.log('지움: ' + path.relative(root, p));
  }
})(root);
console.log(hit ? hit + '개 파일에서 경로를 지웠습니다' : '지울 경로 없음');

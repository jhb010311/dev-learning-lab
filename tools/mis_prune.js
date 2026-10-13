// 뒤 고침에 덮여 더는 맞지 않는 항목(a도 b도 파일에 없는 것)을 고침 기록(dist/audit/mis/cf_*.json)에서 뺀다.
const fs = require('fs'), path = require('path');
const dir = path.join(__dirname, '..', 'dist', 'audit', 'mis'), root = path.join(__dirname, '..', 'src');
fs.readdirSync(dir).filter(f => /^cf_.*\.json$/.test(f)).forEach(jf => {
  const p = path.join(dir, jf), r = JSON.parse(fs.readFileSync(p, 'utf8'));
  const keep = r.filter(x => { const s = fs.readFileSync(path.join(root, x.file), 'utf8'); return s.indexOf(x.b) >= 0 || s.split(x.a).length - 1 === (x.n || 1); });
  if (keep.length !== r.length) { fs.writeFileSync(p, JSON.stringify(keep, null, 1)); console.log(jf + ': ' + r.length + ' → ' + keep.length); }
});

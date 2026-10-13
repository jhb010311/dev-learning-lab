// 오해 표현 점검 결과(dist/audit/mis/m_N.json)를 짧게 보여 준다.
// 실행: node tools/mis_list.js <N> [N ...]
const fs = require('fs'), path = require('path');
const dir = path.join(__dirname, '..', 'dist', 'audit', 'mis'), NL = String.fromCharCode(10);
const cut = (s, n) => String(s || '').replace(/\s+/g, ' ').slice(0, n);
process.argv.slice(2).forEach(N => {
  const r = JSON.parse(fs.readFileSync(path.join(dir, 'm_' + N + '.json'), 'utf8'));
  console.log('=== m_' + N + ' (found ' + r.found.length + ', read ' + (r.read || []).length + ')');
  r.found.forEach((x, i) => console.log('[' + (i + 1) + '] ' + x.file.replace('.js', '') + ':' + x.line + ' <' + x.confidence + ',' + x.kind + '> ' + cut(x.quote, 90) + NL + '   → ' + cut(x.suggest, 110) + NL + '   실제: ' + cut(x.truth, 170)));
});

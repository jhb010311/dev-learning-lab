// 오해 표현 점검 결과에서 제안을 그대로 받아들일 항목을 골라 코드 고침 파일(dist/audit/mis/cf_NN_auto.json)로 만든다.
// 보기:   node tools/mis_accept.js show <N>
// 받기:   node tools/mis_accept.js take <N> <번호,번호,...>     (제안 글자를 그대로 씀. 그림 글자처럼 다른 말이 필요하면 cf 파일을 손으로 쓴다)
const fs = require('fs'), path = require('path');
const dir = path.join(__dirname, '..', 'dist', 'audit', 'mis'), mode = process.argv[2], N = process.argv[3];
const r = JSON.parse(fs.readFileSync(path.join(dir, 'm_' + N + '.json'), 'utf8')), cut = (s, n) => String(s || '').replace(/\s+/g, ' ').slice(0, n);
if (mode === 'show') {
  console.log('=== m_' + N + ' (found ' + r.found.length + ', read ' + (r.read || []).length + ')');
  r.found.forEach((x, i) => { let n = '?'; try { n = fs.readFileSync(path.join(__dirname, '..', 'src', 'lessons', x.file), 'utf8').split(x.quote).length - 1; } catch (e) {}
    console.log('[' + (i + 1) + '] ' + x.file + ':' + x.line + ' <' + x.confidence + ',' + x.kind + ',' + n + '번> ' + cut(x.quote, 110) + '\n   → ' + cut(x.suggest, 130) + '\n   실제: ' + cut(x.truth, 210) + '\n   근거: ' + cut(x.basis, 110)); });
} else if (mode === 'take') {
  const pick = (process.argv[4] || '').split(',').filter(Boolean).map(Number);
  const out = pick.map(i => { const x = r.found[i - 1]; return { file: 'lessons/' + x.file, a: x.quote, b: x.suggest, why: cut(x.truth, 120) }; });
  fs.writeFileSync(path.join(dir, 'cf_' + String(N).padStart(2, '0') + '_auto.json'), JSON.stringify(out, null, 1)); console.log(out.length + '개 받음');
}

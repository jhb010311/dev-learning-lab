// 오해 표현 점검 결과(dist/audit/mis/m_N.json)를 보여 준다. 실행: node tools/mis_show.js <결과 파일> [...] [--min=high|mid|low]
const fs = require('fs'), path = require('path');
const min = (process.argv.find(a => a.indexOf('--min=') === 0) || '--min=low').slice(6), rank = { high: 3, mid: 2, low: 1 };
process.argv.slice(2).filter(a => a.indexOf('--') !== 0).forEach(p => {
  const r = JSON.parse(fs.readFileSync(p, 'utf8')); console.log('=== ' + path.basename(p) + ' (found ' + r.found.length + ', read ' + (r.read || []).length + ')');
  r.found.filter(x => (rank[x.confidence] || 1) >= rank[min]).forEach((x, i) => {
    const f = path.join(__dirname, '..', 'src', 'lessons', x.file); let n = '?'; try { n = fs.readFileSync(f, 'utf8').split(x.quote).length - 1; } catch (e) {}
    console.log('[' + (i + 1) + '] ' + x.file + ':' + x.line + ' <' + x.confidence + ', ' + x.kind + '> 원문에 ' + n + '번\n  원문: ' + x.quote + '\n  오해: ' + x.misread + '\n  실제: ' + x.truth + '\n  제안: ' + x.suggest + '\n  근거: ' + x.basis);
  });
});

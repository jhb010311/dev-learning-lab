// 글 검수 결과(JSON: { fix: [{ file, old, new, why }], code: [...], report: [...] })를 보여 주거나 적용한다.
// 보기:  node tools/apply_fix.js show <결과 파일> [...]
// 적용:  node tools/apply_fix.js apply <폴더(src/lessons 등)> <결과 파일> [...]      old가 그 파일에 정확히 한 번 있을 때만 바꾼다
// 빼기:  결과 파일 옆에 같은 이름 + ".skip"(한 줄에 "파일이름|old의 앞부분")을 두면 그 항목은 적용하지 않는다
const fs = require('fs'), path = require('path');
const mode = process.argv[2], BS = String.fromCharCode(92);
const bad = s => s.indexOf("'") >= 0 || s.indexOf(BS) >= 0 || s.indexOf('\n') >= 0;
if (mode === 'show') {
  process.argv.slice(3).forEach(p => { const r = JSON.parse(fs.readFileSync(p, 'utf8')); console.log('=== ' + path.basename(p) + ' (fix ' + r.fix.length + ', code ' + (r.code || []).length + ', report ' + (r.report || []).length + ')');
    r.fix.forEach(x => console.log(x.file + '\n  - ' + x.old + '\n  + ' + x.new)); (r.code || []).forEach(x => console.log('[code] ' + x.file + ':' + x.line + ' ' + x.what)); (r.report || []).forEach(x => console.log('[report] ' + x.file + ' ' + x.what)); });
} else if (mode === 'apply') {
  const dir = path.resolve(process.argv[3]); let done = 0, skip = 0; const touched = {};
  process.argv.slice(4).forEach(p => {
    const r = JSON.parse(fs.readFileSync(p, 'utf8')), sk = fs.existsSync(p + '.skip') ? fs.readFileSync(p + '.skip', 'utf8').split('\n').map(l => l.trim()).filter(Boolean) : [];
    r.fix.forEach(x => {
      if (sk.some(l => { const i = l.indexOf('|'); return l.slice(0, i) === x.file && x.old.indexOf(l.slice(i + 1)) === 0; })) { skip++; return; }
      if (x.old === x.new) return;
      if (bad(x.old) || bad(x.new)) { console.log('따옴표나 역슬래시가 들어 있어 건너뜀: ' + x.file + ' ' + x.old.slice(0, 40)); skip++; return; }
      const f = path.join(dir, x.file); if (!fs.existsSync(f)) { console.log('파일 없음: ' + x.file); skip++; return; }
      const s = touched[f] || fs.readFileSync(f, 'utf8'), n = s.split(x.old).length - 1;
      if (n !== 1) { console.log('원래 글자를 못 찾음(' + n + '): ' + x.file + ' ' + x.old.slice(0, 40)); skip++; return; }
      touched[f] = s.split(x.old).join(x.new); done++;
    });
  });
  Object.keys(touched).forEach(f => fs.writeFileSync(f, touched[f]));
  console.log('바꾼 곳 ' + done + '곳, 건너뛴 것 ' + skip + '개, 고친 파일 ' + Object.keys(touched).length + '개');
} else console.log('show 또는 apply');

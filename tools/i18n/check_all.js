// 영어판 공개 목록(src/en/ready.js)의 실습을 모두 다시 검사한다. 사용: node tools/i18n/check_all.js
// 검사 기준이 바뀌었을 때 이미 올린 실습 가운데 걸리는 것이 있는지 볼 때 쓴다. 실패한 실습과 그 이유만 낸다.
const path = require('path'), cp = require('child_process');
const root = path.join(__dirname, '..', '..'), ids = require(path.join(root, 'src', 'en', 'ready.js'));
let bad = 0;
ids.forEach(id => {
  let out = ''; try { out = cp.execFileSync(process.execPath, [path.join(__dirname, 'check_en.js'), id], { encoding: 'utf8' }); } catch (e) { out = (e.stdout || '') + (e.stderr || ''); }
  if (/검사 통과/.test(out.trim().split('\n').pop())) return;
  bad++; console.log(id + ':\n' + out.split('\n').filter(l => /^오류:/.test(l)).map(l => '  ' + l.slice(0, 300)).join('\n'));
});
console.log('\n' + ids.length + '개 가운데 실패 ' + bad + '개');

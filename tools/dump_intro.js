// 실습마다 이름, 물음, 소개, 개념 설명(용어와 첫 두 문장)을 뽑아 점검용 글로 만든다. 설명집의 모든 용어 이름도 함께 적는다.
// 실행: node tools/dump_intro.js <내보낼 폴더> <묶음 수>
const fs = require('fs'), path = require('path');
const { loadLessons } = require('../build.js'); const { list } = loadLessons();
const kbDir = path.join(__dirname, '..', 'kb'); const kb = fs.readdirSync(kbDir).filter(f => /^kb.*\.js$/.test(f)).flatMap(f => require(path.join(kbDir, f)));
const out = process.argv[2], n = +process.argv[3] || 4; fs.mkdirSync(out, { recursive: true });
const two = s => { const m = s.match(/^(.*?다\.)\s*(.*?다\.)?/); return m ? (m[1] + (m[2] ? ' ' + m[2] : '')) : s.slice(0, 160); };
const per = Math.ceil(list.length / n);
for (let i = 0; i < n; i++) {
  const part = list.slice(i * per, (i + 1) * per);
  const txt = part.map(l => '### ' + l.id + ' — ' + l.nav + '\n물음: ' + l.title + '\n소개: ' + l.intro + '\n개념 설명에 든 용어:\n' + l.terms.map(t => '- ' + t + ': ' + two((kb.find(r => r[1] === t) || [])[2] || '')).join('\n')).join('\n\n');
  fs.writeFileSync(path.join(out, 'intro_' + (i + 1) + '.md'), txt + '\n');
}
fs.writeFileSync(path.join(out, 'kb_names.md'), kb.map(r => '- ' + r[1]).join('\n') + '\n');
console.log('실습 ' + list.length + '개를 ' + n + '묶음으로, 설명집 용어 ' + kb.length + '개');

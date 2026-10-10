// 설명(kb)에 이미 있는 용어 이름을 찾는다. 사용: node tools/kb_names.js [검색어]
// 실습의 terms에는 여기 나오는 이름을 글자 그대로 적어야 한다.
const fs = require('fs'), path = require('path');
const dir = path.join(__dirname, '..', 'kb'), q = (process.argv[2] || '').toLowerCase();
const rows = fs.readdirSync(dir).filter(f => /^kb.*\.js$/.test(f)).flatMap(f => { try { return require(path.join(dir, f)).map(r => [r[0], r[1], f]); } catch (e) { return []; } });
const hit = rows.filter(r => !q || (r[0] + ' ' + r[1]).toLowerCase().includes(q));
if (!q) console.log('분류: ' + [...new Set(rows.map(r => r[0]))].join(' | ') + '\n');
hit.forEach(r => console.log(r[0] + ' | ' + r[1] + '  (' + r[2] + ')'));
console.log('\n' + hit.length + '개');

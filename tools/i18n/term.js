// 용어 대조표(src/en/termbase)에서 용어를 찾는다. 사용: node tools/i18n/term.js <찾을 글자> [더 찾을 글자 ...]
// 한국어 이름, 영어 이름, also에 그 글자가 들어 있는 항목을 모두 보여 준다. 글자 없이 부르면 how별 개수를 낸다.
// node tools/i18n/term.js --lesson <실습 id> 는 그 실습의 terms와 설명집 용어의 영어 이름을 보여 준다.
const fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..', '..'), dir = path.join(root, 'src', 'en', 'termbase');
const rows = fs.existsSync(dir) ? fs.readdirSync(dir).filter(f => f.endsWith('.js')).flatMap(f => require(path.join(dir, f)).map(r => Object.assign({ file: f }, r))) : [];
const show = r => console.log(JSON.stringify({ ko: r.ko, en: r.en, also: r.also || [], how: r.how, note: r.note || '' }));
const args = process.argv.slice(2);
if (!args.length) { const n = {}; rows.forEach(r => n[r.how] = (n[r.how] || 0) + 1); console.log(rows.length + '개', JSON.stringify(n)); }
else if (args[0] === '--lesson') {
  const ldir = path.join(root, 'src', 'lessons'), file = fs.readdirSync(ldir).find(f => new RegExp("^  id: '" + args[1] + "', nav:", 'm').test(fs.readFileSync(path.join(ldir, f), 'utf8')));
  const L = []; new Function('Lab', fs.readFileSync(path.join(ldir, file), 'utf8'))({ register: l => L.push(l), fmt: String });
  const names = new Set(L[0].terms); const kbf = path.join(root, 'kb', 'kb_' + args[1] + '.js'); if (fs.existsSync(kbf)) require(kbf).forEach(r => names.add(r[1]));
  names.forEach(n => { const r = rows.find(x => x.ko === n); if (r) show(r); else console.log(JSON.stringify({ ko: n, en: null, note: '대조표에 없음' })); });
} else args.forEach(q => { const lq = q.toLowerCase(); const hit = rows.filter(r => r.ko.includes(q) || r.en.toLowerCase().includes(lq) || (r.also || []).some(a => a.toLowerCase().includes(lq))); if (!hit.length) console.log('없음: ' + q); hit.forEach(show); });

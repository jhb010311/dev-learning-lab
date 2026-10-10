// 영어판 준비: 설명집(kb)과 용어 풀이(glossary)의 용어 이름을 분야별로 늘어놓는다.
// 사용: node tools/i18n/list_terms.js            분야별 개수
//       node tools/i18n/list_terms.js <분야 id>  그 분야의 용어 이름(JSON 한 줄에 하나: [분류, 용어, 이 용어를 쓰는 실습 id들])
// 분야는 목차(curriculum.js)의 분야 id다. 한 용어를 여러 분야의 실습이 쓰면 목차에서 먼저 나오는 분야에 넣는다.
// 어느 실습도 쓰지 않는 용어는 'none', 설명집에 없는 용어 풀이 낱말은 'gloss'로 묶는다.
const fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..', '..'), src = path.join(root, 'src');
const kbFiles = fs.readdirSync(path.join(root, 'kb')).filter(f => /^kb.*\.js$/.test(f)).sort((a, b) => (/^kb\d/.test(a) ? 0 : 1) - (/^kb\d/.test(b) ? 0 : 1) || a.localeCompare(b));
const kb = kbFiles.flatMap(f => require(path.join(root, 'kb', f)).map(r => r.concat(f)));
const lessons = []; fs.readdirSync(path.join(src, 'lessons')).filter(f => f.endsWith('.js')).sort().forEach(f => new Function('Lab', fs.readFileSync(path.join(src, 'lessons', f), 'utf8'))({ register: l => lessons.push(l), fmt: String }));
let curri = []; new Function('Lab', fs.readFileSync(path.join(src, 'curriculum.js'), 'utf8'))({ curriculum: c => { curri = c; }, site: () => {} });
const catOf = {}; curri.forEach(c => c.groups.forEach(g => g.items.forEach(it => { if (it.id && !catOf[it.id]) catOf[it.id] = c.id; })));
const order = curri.map(c => c.id);
const users = {}; lessons.forEach(l => l.terms.forEach(t => (users[t] = users[t] || []).push(l.id)));
const gl = []; new Function('Lab', fs.readFileSync(path.join(src, 'glossary.js'), 'utf8'))({ glossary: g => gl.push(...g) });
const out = {};
kb.forEach(r => { const u = users[r[1]] || []; const cats = [...new Set(u.map(id => catOf[id]).filter(Boolean))].sort((a, b) => order.indexOf(a) - order.indexOf(b)); (out[cats[0] || 'none'] = out[cats[0] || 'none'] || []).push([r[0], r[1], u, r[3]]); });
out.gloss = gl.filter(e => !e.kb).map(e => ['용어 풀이', e.t, e.only || [], 'glossary.js']);
const want = process.argv[2];
if (!want) { Object.keys(out).forEach(k => console.log(k.padEnd(8), out[k].length)); console.log('합계', Object.values(out).reduce((a, b) => a + b.length, 0), '(설명집', kb.length + ')'); }
// 뒤에 시작 번호와 끝 번호를 주면 그 범위만 낸다(0부터, 끝은 포함하지 않음). 예: node tools/i18n/list_terms.js java 0 72
else (out[want] || []).slice(+process.argv[3] || 0, process.argv[4] ? +process.argv[4] : undefined).forEach(r => console.log(JSON.stringify(r)));

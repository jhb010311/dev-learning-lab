// 영어판 본문이 다른 실습을 이름으로 가리킬 때("X" lab, the X lab), 그 이름이 실제 영어 실습 이름(nav)인지 확인한다.
// 실행: node tools/i18n/check_refs.js
const fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..', '..'), dir = path.join(root, 'src', 'en', 'lessons');
const L = []; global.Lab = { register: x => L.push(x), fmt: x => String(x) };
const files = fs.readdirSync(dir).filter(f => f.endsWith('.js'));
files.forEach(f => require(path.join(dir, f)));
const navs = new Set(L.map(l => l.nav)), lower = new Set(L.map(l => l.nav.toLowerCase()));
let bad = 0;
const scan = file => {
  const s = fs.readFileSync(file, 'utf8'), rel = path.relative(root, file);
  let m; const q = /"([^"\n]{3,60})"\s+labs?\b/g; while ((m = q.exec(s))) if (!navs.has(m[1])) { bad++; console.log(rel + ': "' + m[1] + '" lab'); }
  const t = /\bthe ([A-Z][A-Za-z0-9 ,/+:.=-]{3,50}) labs?\b/g; while ((m = t.exec(s))) if (!lower.has(m[1].toLowerCase()) && !/^(PC|Spring version)/.test(m[1])) { bad++; console.log(rel + ': the ' + m[1] + ' lab'); }
};
files.forEach(f => scan(path.join(dir, f)));
fs.readdirSync(path.join(root, 'src', 'en')).filter(f => /^(quiz|verify)_.*\.js$/.test(f)).forEach(f => scan(path.join(root, 'src', 'en', f)));
fs.readdirSync(path.join(root, 'kb', 'en')).forEach(f => scan(path.join(root, 'kb', 'en', f)));
console.log(bad ? '실제 이름과 다른 곳 ' + bad + '개' : '모두 실제 실습 이름과 같음 (실습 이름 ' + navs.size + '개)');

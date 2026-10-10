// 영어판 용어 풀이(src/en/glossary.js)를 한국어판(src/glossary.js)과 대조한다. 사용: node tools/i18n/check_glossary.js [--list]
// 보는 것: 항목 수와 순서가 같은지, 설명집 용어(kb)의 이름이 용어 대조표의 영어 이름인지, 기초 낱말(t)의 이름이 대조표의 영어 이름이고 풀이(d)가 있는지,
//          범위(only, not)가 원본과 같은지, 한글이 남지 않았는지, 같은 표현이 한 실습 안에서 두 항목에 걸리지 않는지(걸리면 빌드가 멈춘다).
// --list를 주면 항목마다 본문에서 찾을 표현을 보여 준다.
const fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..', '..'), HAN = /[가-힣]/, errs = [], warns = [];
const tbDir = path.join(root, 'src', 'en', 'termbase'), tb = Object.create(null);
fs.readdirSync(tbDir).filter(f => f.endsWith('.js')).forEach(f => require(path.join(tbDir, f)).forEach(r => { if (!tb[r.ko]) tb[r.ko] = r.en; }));
const load = p => { const g = []; new Function('Lab', fs.readFileSync(p, 'utf8'))({ glossary: x => g.push(...x) }); return g; };
const enPath = path.join(root, 'src', 'en', 'glossary.js');
if (!fs.existsSync(enPath)) { console.log('영어 용어 풀이 파일이 없음: src/en/glossary.js'); process.exit(1); }
let ko, en; try { ko = load(path.join(root, 'src', 'glossary.js')); en = load(enPath); } catch (e) { console.log('오류: 파일을 읽지 못함: ' + e.message); process.exit(1); }
fs.readFileSync(enPath, 'utf8').split('\n').forEach((l, i) => { if (HAN.test(l)) errs.push('한글이 남음 (' + (i + 1) + '줄): ' + l.trim().slice(0, 60)); });
if (ko.length !== en.length) errs.push('항목 수가 다름: 한국어 ' + ko.length + '개, 영어 ' + en.length + '개');
else ko.forEach((k, i) => {
  const e = en[i], at = (i + 1) + '번째 (' + (k.kb || k.t) + ')';
  if (k.kb) { if (e.kb !== tb[k.kb]) errs.push(at + ': kb는 대조표의 ' + JSON.stringify(tb[k.kb]) + ' 이어야 함 (지금 ' + JSON.stringify(e.kb) + ')'); if (e.t || e.d) errs.push(at + ': kb 항목에는 t, d를 쓰지 않음'); }
  else { if (e.t !== tb[k.t]) errs.push(at + ': t는 대조표의 ' + JSON.stringify(tb[k.t]) + ' 이어야 함 (지금 ' + JSON.stringify(e.t) + ')'); if (!e.d || e.d.length < 40) errs.push(at + ': 풀이(d)가 없거나 너무 짧음'); if (!e.w || !e.w.length) errs.push(at + ': 기초 낱말에는 찾을 표현(w)이 하나 이상 필요'); }
  if (JSON.stringify(k.only || null) !== JSON.stringify(e.only || null) || JSON.stringify(k.not || null) !== JSON.stringify(e.not || null)) errs.push(at + ': only / not은 원본과 같아야 함');
  if (e.tight || e.nx) errs.push(at + ': tight, nx는 한국어 전용이므로 쓰지 않음');
  (e.w || []).forEach(w => { if (!w || w.length < 2) errs.push(at + ': 너무 짧은 표현 ' + JSON.stringify(w)); });
});
// 겹침: 틀(framework.html)은 영어에서 대소문자를 가리지 않고 찾는다
const ids = fs.readdirSync(path.join(root, 'src', 'lessons')).map(f => (/^  id: '([^']+)', nav:/m.exec(fs.readFileSync(path.join(root, 'src', 'lessons', f), 'utf8')) || [])[1]).filter(Boolean);
const applies = (e, ctx) => e.only ? !!ctx && e.only.includes(ctx) : e.not ? !ctx || !e.not.includes(ctx) : true;
const exprs = e => { const n = e.kb || e.t || '', bare = n.replace(/\(.*?\)/g, '').trim(); return [...new Set([n, bare].concat(e.w || []).filter(Boolean).map(x => x.toLowerCase()))]; };
const by = Object.create(null); en.forEach((e, i) => exprs(e).forEach(w => (by[w] = by[w] || []).push(i)));
Object.keys(by).forEach(w => { const list = by[w]; if (list.length < 2) return; const ctx = [''].concat(ids).find(c => new Set(list.filter(i => applies(en[i], c)).map(i => en[i].kb || en[i].t)).size > 1); if (ctx !== undefined) errs.push('"' + w + '"가 ' + (ctx || '(실습 밖)') + '에서 여러 항목에 걸림: ' + [...new Set(list.map(i => en[i].kb || en[i].t))].join(' / ')); });
if (process.argv.includes('--list')) en.forEach(e => console.log((e.kb || e.t) + '  ⇐  ' + (e.w || []).join(' | ') + (e.only ? '   [only ' + e.only.join(',') + ']' : e.not ? '   [not ' + e.not.join(',') + ']' : '')));
warns.forEach(w => console.log('주의: ' + w)); errs.slice(0, 80).forEach(e => console.log('오류: ' + e));
console.log(errs.length ? '\n검사 실패 (' + errs.length + '개)' : '\n검사 통과: ' + en.length + '개 항목, 찾는 표현 ' + Object.keys(by).length + '개');
process.exit(errs.length ? 1 : 0);

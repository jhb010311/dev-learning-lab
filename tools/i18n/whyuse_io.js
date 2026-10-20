// "왜 생겼나"(why)·"지금 어디에 쓰나"(use)를 영어판으로 옮길 때 쓰는 도구. 한국어 글을 JSON으로 꺼내고, 옮긴 JSON을 영어판 파일에 넣는다.
// 실행:
//   node tools/i18n/whyuse_io.js export-lessons <out.json> [파일 이름 ...]   한국어 실습의 why·use → { "NN_id.js": { why, use } }
//   node tools/i18n/whyuse_io.js import-lessons <in.json>                     src/en/lessons/<파일>의 intro 줄 바로 앞에 넣는다(이미 있으면 바꾼다)
//   node tools/i18n/whyuse_io.js export-kb <out.json> [kb 파일 이름 ...]       한국어 설명집의 네 번째 칸 → [{ file, i, term, why, use }]
//   node tools/i18n/whyuse_io.js import-kb <in.json>                           kb/en/<file>의 i번째 항목에 네 번째 칸을 넣는다(파일을 같은 모양으로 다시 쓴다)
const fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..', '..'), [cmd, json, ...only] = process.argv.slice(2);
const q = s => "'" + s.replace(/\\/g, '\\\\').replace(/'/g, "\\'") + "'";
const lessonOf = file => { const list = []; new Function('Lab', fs.readFileSync(file, 'utf8'))({ register: l => list.push(l), fmt: x => x }); return list[0]; };

if (cmd === 'export-lessons') {
  const dir = path.join(root, 'src', 'lessons'), out = {};
  fs.readdirSync(dir).filter(f => f.endsWith('.js') && (!only.length || only.includes(f))).forEach(f => {
    const l = lessonOf(path.join(dir, f)); if (l.why || l.use) out[f] = { why: l.why, use: l.use };
  });
  fs.writeFileSync(json, JSON.stringify(out, null, 1)); console.log(Object.keys(out).length + '개 실습을 꺼냄');
} else if (cmd === 'import-lessons') {
  const data = JSON.parse(fs.readFileSync(json, 'utf8')); let n = 0;
  for (const [f, v] of Object.entries(data)) {
    const file = path.join(root, 'src', 'en', 'lessons', f);
    if (!fs.existsSync(file)) { console.log('영어판 없음: ' + f); continue; }
    const raw = fs.readFileSync(file, 'utf8'), nl = raw.includes('\r\n') ? '\r\n' : '\n';
    const lines = raw.split(nl).filter(l => !/^  (why|use): '/.test(l)), at = lines.findIndex(l => /^  intro: /.test(l));
    if (at < 0) { console.log('intro 줄 없음: ' + f); continue; }
    lines.splice(at, 0, ...['why', 'use'].filter(k => v[k]).map(k => '  ' + k + ': ' + q(v[k]) + ','));
    fs.writeFileSync(file, lines.join(nl)); n++;
    const l = lessonOf(file); if (l.why !== v.why || l.use !== v.use) console.log('넣은 글이 다시 읽은 글과 다름: ' + f);
  }
  console.log(n + '개 실습에 넣음');
} else if (cmd === 'export-kb') {
  const out = [];
  fs.readdirSync(path.join(root, 'kb')).filter(f => f.endsWith('.js') && (!only.length || only.includes(f))).forEach(f => {
    require(path.join(root, 'kb', f)).forEach((r, i) => { if (r[3]) out.push({ file: f, i, term: r[1], why: r[3].why, use: r[3].use }); });
  });
  fs.writeFileSync(json, JSON.stringify(out, null, 1)); console.log(out.length + '개 용어를 꺼냄');
} else if (cmd === 'import-kb') {
  const data = JSON.parse(fs.readFileSync(json, 'utf8')), byFile = {};
  data.forEach(x => (byFile[x.file] = byFile[x.file] || []).push(x));
  for (const [f, xs] of Object.entries(byFile)) {
    const file = path.join(root, 'kb', 'en', f);
    if (!fs.existsSync(file)) { console.log('영어판 없음: ' + f); continue; }
    const ko = require(path.join(root, 'kb', f)), en = require(file);
    if (ko.length !== en.length) { console.log('항목 수가 다름: ' + f + ' ' + ko.length + '/' + en.length); continue; }
    xs.forEach(x => { const e = {}; if (x.why) e.why = x.why; if (x.use) e.use = x.use; en[x.i] = en[x.i].slice(0, 3).concat([e]); });
    const raw = fs.readFileSync(file, 'utf8'), nl = raw.includes('\r\n') ? '\r\n' : '\n';
    const head = raw.split(nl).filter((l, i, a) => a.slice(0, i + 1).every(m => /^\s*\/\//.test(m)));   // 맨 위 주석 줄은 그대로
    const body = 'module.exports = [' + nl + en.map(r => '  [' + r.slice(0, 3).map(s => JSON.stringify(s)).join(', ') + (r[3] ? ', ' + JSON.stringify(r[3]).replace(/^\{"why":/, '{ why: ').replace(/,"use":/, ', use: ').replace(/^\{"use":/, '{ use: ').replace(/\}$/, ' }') : '') + '],').join(nl) + nl + '];' + nl;
    fs.writeFileSync(file, head.concat([body]).join(nl));
    delete require.cache[require.resolve(file)];
    const back = require(file); if (JSON.stringify(back) !== JSON.stringify(en)) console.log('다시 읽은 내용이 다름: ' + f);
    console.log(f + ': ' + xs.length + '개');
  }
} else console.log('사용: node tools/i18n/whyuse_io.js export-lessons|import-lessons|export-kb|import-kb <json> [파일 ...]');

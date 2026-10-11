// src의 공통 틀과 실습 파일을 합쳐 사이트를 만든다.
//   docs/                그대로 웹에 올리는 사이트. 실습마다 한 페이지로 나뉜다 (build_pages.js, GitHub Pages가 이 폴더를 보여 준다)
//   dist/fragment.html   모든 것을 파일 하나에 담은 조각 (미리보기용)
// 설명 버튼의 내용은 설명집(kb/kb*.js)에서 가져온다.
const fs = require('fs');
const path = require('path');
// LAB_LANG=en이면 영어판을 만든다. 글은 src/en과 kb/en에서 읽고, 공통 틀은 같은 것을 쓰되 화면 글자를 src/en/ui.js의 표로 바꾼다.
// 결과는 docs/en/index.html. 아직 영어로 옮기지 않은 실습은 영어판의 목차와 용어 풀이에서 빠진다.
const EN = process.env.LAB_LANG === 'en', HAN = /[가-힣]/;
const dir = EN ? path.join(__dirname, 'src', 'en') : path.join(__dirname, 'src');
const kbDir = EN ? path.join(__dirname, 'kb', 'en') : path.join(__dirname, 'kb');
const ls = d => fs.existsSync(d) ? fs.readdirSync(d) : [];
// 설명: kb1~6.js 다음에, 나중에 실습과 함께 추가한 kb_<id>.js를 이름 순으로 잇는다
const kbFiles = ls(kbDir).filter(f => /^kb.*\.js$/.test(f)).sort((a, b) => (/^kb\d/.test(a) ? 0 : 1) - (/^kb\d/.test(b) ? 0 : 1) || a.localeCompare(b));
const kb = kbFiles.flatMap(f => require(path.join(kbDir, f)));
{ const seen = new Set(); kb.forEach(r => { if (r.length < 3 || !r[0] || !r[1] || !r[2]) throw new Error('kb 형식 오류: ' + r[1]); if (seen.has(r[1])) throw new Error('kb에 같은 용어가 두 번 있음: ' + r[1]); seen.add(r[1]); }); }

function loadLessons() {
  const list = [];
  const Lab = { register: l => list.push(l), fmt: x => (Math.round(x * 10) / 10).toFixed(1) };
  // LAB_ONLY_FILE이 있으면 그 실습 파일 하나만 읽는다 (tools/check_lesson.js가 쓴다)
  const files = ls(path.join(dir, 'lessons')).filter(f => f.endsWith('.js') && (!process.env.LAB_ONLY_FILE || f === process.env.LAB_ONLY_FILE)).sort();
  files.forEach(f => new Function('Lab', fs.readFileSync(path.join(dir, 'lessons', f), 'utf8'))(Lab));
  return { list, files, Lab };
}
module.exports = { loadLessons };

// 공통 틀의 화면 글자를 영어로 바꾼다. src/en/ui.js는 [틀에 있는 글자, 바꿀 글자]의 목록이고, 긴 것부터 바꾼다.
function toEnglish(html) {
  const map = require(path.join(dir, 'ui.js'));
  html = html.split('\r\n').join('\n').replace("var LANG = 'ko';", "var LANG = 'en';");
  // 주석은 화면에 나오지 않으므로 한글이 든 주석(줄 전체, 줄 끝, CSS)을 지운다
  html = html.split('\n').filter(l => !(HAN.test(l) && /^\s*\/\//.test(l))).map(l => l.replace(/\s+\/\/ [^'"`]*[가-힣][^'"`]*$/, '')).join('\n').replace(/\/\*[^*]*[가-힣][^*]*\*\//g, '');
  map.forEach(p => { if (!html.includes(p[0])) throw new Error('ui.js: 틀에 없는 글자 ' + p[0].slice(0, 70)); });
  map.slice().sort((a, b) => b[0].length - a[0].length).forEach(p => { html = html.split(p[0]).join(p[1]); });
  const left = html.split('\n').filter(l => HAN.test(l));
  if (left.length) throw new Error('ui.js: 틀에 한글이 ' + left.length + '줄 남음:\n' + left.slice(0, 40).map(l => '  ' + (l.match(/.{0,50}[가-힣].{0,60}/) || [''])[0].trim()).join('\n'));
  return html;
}
module.exports.toEnglish = toEnglish;

if (require.main === module) {
  let { list, files } = loadLessons();
  // 영어판: 아직 다 옮기지 않은 실습은 빼고 만든다(설명집 용어, 문제 파일, 검증 수준 파일이 모두 있어야 한다)
  const skipEn = new Set();
  // 공개 빌드에는 src/en/ready.js에 적힌 실습만 넣는다. 미리보기(LAB_OUT_DIR)에서는 옮겨진 것을 모두 넣는다.
  const enReadyIds = EN && !process.env.LAB_OUT_DIR ? new Set(require(path.join(dir, 'ready.js'))) : null;
  if (EN) { list.forEach(l => { const why = []; if (enReadyIds && !enReadyIds.has(l.id)) why.push('ready.js에 없음(검사와 화면 확인 전)'); (l.terms || []).forEach(t => { if (!kb.some(r => r[1] === t)) why.push('설명집에 없는 용어 ' + t); });
      ['quiz_', 'verify_'].forEach(p => { if (!fs.existsSync(path.join(dir, p + l.id + '.js'))) why.push(p + l.id + '.js 없음'); });
      if (why.length) { skipEn.add(l.id); console.log('영어판에서 제외(아직 다 옮기지 않음): ' + l.id + ' — ' + why.join(', ')); } });
    files = files.filter((x, i) => !skipEn.has(list[i].id)); list = list.filter(l => !skipEn.has(l.id)); }
  // 문제·검증 수준 파일은 이번 빌드에 들어가는 실습의 것만 읽는다(실습 파일보다 먼저 만들어진 것도 건너뛴다)
  const enIn = new Set(list.map(l => l.id)), enReady = x => !EN || enIn.has(x.replace(/^(quiz|verify)_/, '').replace(/\.js$/, ''));
  // 영어판의 글에는 한글이 남아 있으면 안 된다 (목차 파일의 책 이름과 언어 바꾸기 글자는 예외라서 따로 본다)
  // 영어판에도 남아야 하는 한글 데이터(src/en/hangul_ok.js)는 이 검사에서 뺀다
  const okhList = EN && fs.existsSync(path.join(dir, 'hangul_ok.js')) ? Object.values(require(path.join(dir, 'hangul_ok.js'))).flat().sort((a, b) => b.length - a.length) : [], okh = s => okhList.reduce((a, w) => a.split(w).join(''), s);
  if (EN) { const bad = []; const scan = (d, re) => ls(d).filter(x => re.test(x)).forEach(x => fs.readFileSync(path.join(d, x), 'utf8').split('\n').forEach((l, i) => { if (HAN.test(okh(l))) bad.push(x + ':' + (i + 1) + ' ' + l.trim().slice(0, 70)); }));
    // 이번 빌드에 들어가는 실습의 파일만 본다(옮기는 중인 실습의 파일에는 아직 한글이 남아 있을 수 있다)
    const inIds = new Set(list.map(l => l.id)), inFiles = new Set(files), mine = x => { const m = /^(?:quiz|verify|kb)_(.+)\.js$/.exec(x); return !m || inIds.has(m[1]); };
    scan(path.join(dir, 'lessons'), { test: x => /\.js$/.test(x) && inFiles.has(x) }); scan(dir, { test: x => /^(quiz|verify|glossary).*\.js$/.test(x) && mine(x) }); scan(kbDir, { test: x => /^kb.*\.js$/.test(x) && mine(x) });
    if (bad.length) throw new Error('영어판 글에 한글이 ' + bad.length + '줄 남음:\n  ' + bad.slice(0, 30).join('\n  ')); }
  const explain = {};
  list.forEach(l => {
    const ex = l.terms.map(name => { const i = kb.findIndex(r => r[1] === name); if (i < 0) throw new Error(l.id + ': 설명집에 없는 용어 ' + name); return { no: i + 1, name, book: kb[i][2] }; });
    explain[l.id] = { explain: ex, refs: '' };
    ['id', 'nav', 'cat', 'mode', 'title', 'intro', 'controls', 'presets', 'code', 'label', 'columns', 'simulate', 'render', 'assume'].forEach(k => { if (l[k] === undefined) throw new Error(l.id + ': ' + k + ' 없음'); });
    l.presets.forEach(p => Object.keys(p.v).forEach(k => { if (!l.controls.some(c => c.id === k)) throw new Error(l.id + ': 프리셋의 알 수 없는 설정 ' + k); }));
  });
  // 개념 파일의 문자열에 든 <script>, </script>, <!-- 가 HTML 파서에게 태그로 읽히지 않도록 < 를 \x3c 로 바꾼다
  // 학습 경로: 모든 단계가 실제 개념을 가리키는지, 빠진 개념이 없는지 확인
  const tracksSrc = EN ? '' : fs.readFileSync(path.join(dir, 'tracks.js'), 'utf8'); // 학습 경로는 화면에 쓰이지 않아 영어판에는 두지 않는다
  let tracks = []; new Function('Lab', tracksSrc)({ tracks: t => { tracks = t; } });
  const ids = new Set(list.map(l => l.id)), inTrack = new Set();
  tracks.forEach(t => { if (!t.id || !t.name || !t.desc || !t.steps.length) throw new Error('학습 경로 형식 오류: ' + t.id); t.steps.forEach(s => { if (!ids.has(s[0])) throw new Error(t.id + ': 없는 개념 ' + s[0]); if (!s[1] || !s[2]) throw new Error(t.id + ': 단계 설명 없음 ' + s[0]); inTrack.add(s[0]); }); if (new Set(t.steps.map(s => s[0])).size !== t.steps.length) throw new Error(t.id + ': 같은 개념이 두 번 들어감'); });
  console.log('학습 경로', tracks.length + '개, 단계', tracks.reduce((a, t) => a + t.steps.length, 0) + '개');
  // 개념 테스트 문제: 형식, 가리키는 학습 경로와 실습, 그리고 실습 모형의 결과와 정답이 맞는지(sim) 확인
  const quizFiles = ls(dir).filter(f => /^quiz.*\.js$/.test(f) && enReady(f)).sort();
  const quizSrc = quizFiles.map(f => fs.readFileSync(path.join(dir, f), 'utf8')).join('\n');
  const bank = []; new Function('Lab', quizSrc)({ quiz: q => bank.push(...q) });
  let simChecked = 0;
  bank.forEach((q, i) => {
    const at = 'quiz #' + (i + 1) + ' (' + String(q.q).slice(0, 24) + '…)';
    if (![1, 2, 3].includes(q.lv)) throw new Error(at + ': lv');
    if (!EN && q.tr && !tracks.some(t => t.id === q.tr)) throw new Error(at + ': 없는 학습 경로 ' + q.tr);
    if (!ids.has(q.id)) throw new Error(at + ': 없는 실습 ' + q.id);
    if (!q.q || !q.why || !Array.isArray(q.a) || q.a.length !== 4 || new Set(q.a).size !== 4 || q.a.some(x => !x)) throw new Error(at + ': 질문, 해설, 보기 4개 형식 오류');
    if (q.sim) { const l = list.find(x => x.id === (q.sim.id || q.id)), row = l.simulate(Object.assign({}, q.sim.c)).row; if (!String(row[q.sim.col]).includes(q.sim.has)) throw new Error(at + ': 실습 결과와 다름. 실습=' + row[q.sim.col] + ' 기대=' + q.sim.has); simChecked++; }
  });
  if (new Set(bank.map(q => q.q)).size !== bank.length) throw new Error('quiz: 같은 질문이 두 번 있음');
  const perLv = [1, 2, 3].map(lv => bank.filter(q => q.lv === lv).length);
  tracks.forEach(t => [1, 2, 3].forEach(lv => { if (bank.filter(q => q.tr === t.id && q.lv === lv).length < 4) throw new Error('quiz: ' + t.id + ' 경로의 ' + lv + '단계 문제가 4개 미만'); }));
  console.log('테스트 문제', bank.length + '개 (초급 ' + perLv[0] + ', 중급 ' + perLv[1] + ', 응용 ' + perLv[2] + '), 실습 결과와 대조한 문제', simChecked + '개, 기초용 용어', kb.length + '개');
  const terms = kb.map(r => [r[0], r[1], r[2]]);
  // 용어 풀이 사전: 형식, 설명집 용어 이름, 그리고 같은 표현이 한 실습에서 두 항목에 걸리지 않는지 확인
  const glossSrc = fs.existsSync(path.join(dir, 'glossary.js')) ? fs.readFileSync(path.join(dir, 'glossary.js'), 'utf8') : '';
  const gl = []; new Function('Lab', glossSrc)({ glossary: g => gl.push(...g) });
  // 영어판: 아직 옮기지 않은 용어나 실습을 가리키는 항목은 뺀다
  if (EN) for (let i = gl.length - 1; i >= 0; i--) { const e = gl[i]; if (e.kb && !kb.some(r => r[1] === e.kb)) { gl.splice(i, 1); continue; } if (e.only) { e.only = e.only.filter(id => ids.has(id)); if (!e.only.length) gl.splice(i, 1); } if (e.not) { e.not = e.not.filter(id => ids.has(id)); if (!e.not.length) delete e.not; } }
  const aliasMap = Object.create(null); // 영어 낱말(constructor 등)이 객체의 기본 속성 이름과 겹치지 않게 빈 틀에서 시작한다
  gl.forEach((e, i) => {
    const at = 'glossary #' + (i + 1) + ' (' + (e.kb || e.t) + ')';
    if (e.kb) { if (!kb.some(r => r[1] === e.kb)) throw new Error(at + ': 설명집에 없는 용어'); if (e.t || e.d) throw new Error(at + ': kb 항목에는 t, d를 쓰지 않음'); }
    else if (!e.t || !e.d || !e.w || !e.w.length) throw new Error(at + ': t, d, w가 필요');
    if (e.only && e.not) throw new Error(at + ': only와 not을 함께 쓸 수 없음');
    (e.only || e.not || []).forEach(id => { if (!ids.has(id)) throw new Error(at + ': 없는 실습 ' + id); });
    const ws = (e.w || []).slice(); if (e.kb && !e.noname) { ws.push(e.kb); const bare = e.kb.replace(/\(.*?\)/g, '').trim(); if (bare !== e.kb) ws.push(bare); }
    [...new Set(ws)].forEach(w => (aliasMap[w] = aliasMap[w] || []).push(e));
  });
  const applies = (e, ctx) => e.only ? !!ctx && e.only.includes(ctx) : e.not ? !ctx || !e.not.includes(ctx) : true;
  Object.keys(aliasMap).forEach(w => [''].concat([...ids]).forEach(ctx => { const hit = [...new Set(aliasMap[w].filter(e => applies(e, ctx)).map(e => e.kb || e.t))]; if (hit.length > 1) throw new Error('glossary: "' + w + '"가 ' + (ctx || '(실습 밖)') + '에서 여러 항목에 걸림: ' + hit.join(' / ')); }));
  console.log('용어 풀이', gl.length + '개 항목, 찾는 표현', Object.keys(aliasMap).length + '개');
  // 검증 수준: 모든 실습에 항목이 있고, 수준이 네 가지 중 하나인지 확인
  const verSrc = ls(dir).filter(f => /^verify.*\.js$/.test(f) && enReady(f)).sort().map(f => fs.readFileSync(path.join(dir, f), 'utf8')).join('\n');
  const ver = {}; new Function('Lab', verSrc)({ verify: v => { Object.keys(v).forEach(k => { if (ver[k]) throw new Error('verify: 같은 실습이 두 번 있음 ' + k); ver[k] = v[k]; }); } });
  list.forEach(l => { const v = ver[l.id]; if (!v || !['run', 'part', 'doc', 'model'].includes(v[0]) || !v[1]) throw new Error('verify: ' + l.id + ' 항목이 없거나 형식 오류'); });
  Object.keys(ver).forEach(id => { if (!ids.has(id)) throw new Error('verify: 없는 실습 ' + id); });
  console.log('검증 수준', ['run', 'part', 'doc', 'model'].map(k => k + ' ' + list.filter(l => ver[l.id][0] === k).length).join(', '));
  // 목차: 분야 → 묶음 → 항목. 항목은 실습(id)이거나 아직 실습이 없는 주제(t만 있음)다.
  const curSrc = fs.readFileSync(path.join(__dirname, 'src', 'curriculum.js'), 'utf8');
  let curri = [], site = {}; new Function('Lab', curSrc)({ curriculum: c => { curri = c; }, site: o => { site = o; } });
  // 영어판: 목차의 구조는 한국어판의 것을 그대로 쓰고, 이름과 설명만 src/en/curriculum.js의 Lab.names에서 가져온다.
  // 아직 옮기지 않은 실습은 목차에서 빼고, 몇 개가 남았는지 처음 화면에 알린다.
  if (EN) { const gone = new Set(); let names = {}, siteEn = {};
    new Function('Lab', fs.readFileSync(path.join(dir, 'curriculum.js'), 'utf8'))({ names: n => { names = n; }, site: o => { siteEn = o; } });
    site = Object.assign({}, site, siteEn);
    curri.forEach(c => { const n = names[c.id], at = 'en/curriculum.js ' + c.id + ': ';
      if (!n || !n.name || !n.desc || !n.groups || n.groups.length !== c.groups.length) throw new Error(at + '이름, 설명, 묶음 이름(' + c.groups.length + '개)이 필요');
      if (c.refs && (!n.refs || n.refs.length !== c.refs.length)) throw new Error(at + 'refs가 ' + c.refs.length + '개여야 함');
      c.name = n.name; c.desc = n.desc; if (c.refs) c.refs = n.refs;
      c.groups.forEach((g, i) => { g.name = n.groups[i]; g.items.forEach(it => { if (it.id && it.t) { if (!n.items || !n.items[it.id]) throw new Error(at + '목록 이름이 따로 있는 실습의 영어 이름이 필요 items.' + it.id); it.t = n.items[it.id]; } }); }); });
    [site.name, site.desc].concat(curri.flatMap(c => [c.name, c.desc].concat(c.groups.map(g => g.name), c.groups.flatMap(g => g.items.filter(it => it.id && it.t).map(it => it.t))))).forEach(x => { if (HAN.test(x)) throw new Error('en/curriculum.js: 한글이 남음 ' + x); });
    curri.forEach(c => { c.groups.forEach(g => { g.items.forEach(it => { if (it.id && !ids.has(it.id)) gone.add(it.id); }); g.items = g.items.filter(it => it.id && ids.has(it.id)); }); c.groups = c.groups.filter(g => g.items.length); });
    curri = curri.filter(c => c.groups.length); if (site.start) site.start = site.start.filter(id => ids.has(id));
    if (gone.size) site.notice = ids.size + ' of ' + (ids.size + gone.size) + ' labs are available in English so far. The rest are being translated and are available in the Korean edition.'; }
  const placed = new Set(); let todo = 0;
  if (new Set(curri.map(c => c.id)).size !== curri.length) throw new Error('curriculum: 분야 id가 겹침');
  curri.forEach(c => { if (!c.id || !c.name || !c.desc || !c.groups.length) throw new Error('curriculum: 분야 형식 오류 ' + c.id); if (ids.has(c.id) || ['home', 'study', 'quiz', 'all'].includes(c.id)) throw new Error('curriculum: 분야 id가 실습 id나 주소 이름과 겹침 ' + c.id);
    c.groups.forEach(g => { if (!g.name || !g.items.length) throw new Error('curriculum: 빈 묶음 ' + c.id + ' / ' + g.name); g.items.forEach(it => { if (it.id) { if (!ids.has(it.id)) throw new Error('curriculum: 없는 실습 ' + it.id); placed.add(it.id); } else { if (!it.t) throw new Error('curriculum: 이름 없는 항목 ' + c.id + ' / ' + g.name); todo++; } }); }); });
  const lost = list.filter(l => !placed.has(l.id)).map(l => l.id);
  // 미리보기(tools/preview.js)에서는 아직 목차에 넣지 않은 실습이 있어도 된다
  if (lost.length && !process.env.LAB_OUT_DIR) throw new Error('curriculum: 어느 분야에도 없는 실습: ' + lost.join(', '));
  console.log('목차', curri.map(c => c.name + ' ' + new Set(c.groups.flatMap(g => g.items.filter(it => it.id).map(it => it.id))).size + (c.groups.flatMap(g => g.items).filter(it => !it.id).length ? '(+준비 중 ' + c.groups.flatMap(g => g.items).filter(it => !it.id).length + ')' : '')).join(', '), '| 준비 중 합계', todo);
  const glossOut = EN ? 'Lab.glossary(' + JSON.stringify(gl) + ');' : glossSrc, curOut = EN ? 'Lab.site(' + JSON.stringify(site) + ');\nLab.curriculum(' + JSON.stringify(curri) + ');' : curSrc;
  const js = (files.map(f => fs.readFileSync(path.join(dir, 'lessons', f), 'utf8')).join('\n') + '\n' + tracksSrc + '\n' + quizSrc + '\n' + glossOut + '\n' + verSrc + '\n' + curOut).replace(/<(?=!--|\/?script)/gi, '\\x3c');
  let html = fs.readFileSync(path.join(__dirname, 'src', 'framework.html'), 'utf8');
  if (EN) html = toEnglish(html);
  const shell = html; // 데이터를 넣기 전의 틀 (여러 페이지로 나눠 쓸 때 쓴다)
  html = html.replace('/*__EXPLAIN__*/{}', () => JSON.stringify(explain).replace(/</g, '\\u003c')).replace('/*__TERMS__*/[]', () => JSON.stringify(terms).replace(/</g, '\\u003c')).replace('/*__LESSONS__*/', () => js);
  // 합친 스크립트가 문법상 유효한지 확인
  html.split('<script>').slice(1).forEach(s => new Function(s.split('</script>')[0]));
  const preview = process.env.LAB_OUT_DIR;
  if (!preview) { fs.mkdirSync(path.join(__dirname, 'dist'), { recursive: true }); fs.mkdirSync(path.join(__dirname, 'docs'), { recursive: true });
  fs.writeFileSync(path.join(__dirname, 'dist', EN ? 'fragment.en.html' : 'fragment.html'), html);
    // 공개 사이트는 여러 페이지로 만든다(실습마다 주소가 따로 있고, 스크립트 없이도 읽을 글이 들어간다). build_pages.js 참고.
    const r = require('./build_pages.js')({ EN, shell, js, explain, terms, list, kb, curri, site, ver });
    console.log(EN ? 'docs/en/' : 'docs/', '페이지 ' + r.pages + '개(' + r.pageKB + 'KB) + app.js ' + r.appKB + 'KB + app.css ' + r.cssKB + 'KB', '| 개념', list.length + '개:', list.map(l => l.nav).join(', '));
    return; }
  // 미리보기(LAB_OUT_DIR): 파일 하나로 만든다
  const name = site.name || '개발 학습 실습실', desc = site.desc || '';
  const outFile = path.join(preview, 'index.html');
  fs.mkdirSync(path.dirname(outFile), { recursive: true });
  const esc = x => String(x).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
  const head = '<!doctype html>\n<html lang="' + (EN ? 'en' : 'ko') + '">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1">\n<meta name="description" content="' + esc(desc) + '">\n<meta property="og:title" content="' + esc(name) + '">\n<meta property="og:description" content="' + esc(desc) + '">\n<meta property="og:type" content="website">\n<style>html, body { margin: 0; }</style>\n';
  fs.writeFileSync(outFile, head + html.replace('</style>', '</style>\n</head>\n<body>') + '\n</body>\n</html>\n');
  console.log(path.join(preview, 'index.html'), (html.length / 1024).toFixed(0) + 'KB', '| 개념', list.length + '개:', list.map(l => l.nav).join(', '));
}

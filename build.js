// src의 공통 틀과 실습 파일을 합쳐 사이트를 만든다.
//   docs/index.html      그대로 웹에 올리는 완성된 문서 (GitHub Pages가 이 폴더를 보여 준다)
//   dist/fragment.html   머리 부분이 없는 조각 (미리보기용)
// 설명 버튼의 내용은 설명집(kb/kb*.js)에서 가져온다.
const fs = require('fs');
const path = require('path');
const dir = path.join(__dirname, 'src');
const kb = [1, 2, 3, 4, 5, 6].flatMap(i => require('./kb/kb' + i + '.js'));

function loadLessons() {
  const list = [];
  const Lab = { register: l => list.push(l), fmt: x => (Math.round(x * 10) / 10).toFixed(1) };
  const files = fs.readdirSync(path.join(dir, 'lessons')).filter(f => f.endsWith('.js')).sort();
  files.forEach(f => new Function('Lab', fs.readFileSync(path.join(dir, 'lessons', f), 'utf8'))(Lab));
  return { list, files, Lab };
}
module.exports = { loadLessons };

if (require.main === module) {
  const { list, files } = loadLessons();
  const explain = {};
  list.forEach(l => {
    const ex = l.terms.map(name => { const i = kb.findIndex(r => r[1] === name); if (i < 0) throw new Error(l.id + ': 설명집에 없는 용어 ' + name); return { no: i + 1, name, book: kb[i][2] }; });
    explain[l.id] = { explain: ex, refs: '' };
    ['id', 'nav', 'cat', 'mode', 'title', 'intro', 'controls', 'presets', 'code', 'label', 'columns', 'simulate', 'render', 'assume'].forEach(k => { if (l[k] === undefined) throw new Error(l.id + ': ' + k + ' 없음'); });
    l.presets.forEach(p => Object.keys(p.v).forEach(k => { if (!l.controls.some(c => c.id === k)) throw new Error(l.id + ': 프리셋의 알 수 없는 설정 ' + k); }));
  });
  // 개념 파일의 문자열에 든 <script>, </script>, <!-- 가 HTML 파서에게 태그로 읽히지 않도록 < 를 \x3c 로 바꾼다
  // 학습 경로: 모든 단계가 실제 개념을 가리키는지, 빠진 개념이 없는지 확인
  const tracksSrc = fs.readFileSync(path.join(dir, 'tracks.js'), 'utf8');
  let tracks = []; new Function('Lab', tracksSrc)({ tracks: t => { tracks = t; } });
  const ids = new Set(list.map(l => l.id)), inTrack = new Set();
  tracks.forEach(t => { if (!t.id || !t.name || !t.desc || !t.steps.length) throw new Error('학습 경로 형식 오류: ' + t.id); t.steps.forEach(s => { if (!ids.has(s[0])) throw new Error(t.id + ': 없는 개념 ' + s[0]); if (!s[1] || !s[2]) throw new Error(t.id + ': 단계 설명 없음 ' + s[0]); inTrack.add(s[0]); }); if (new Set(t.steps.map(s => s[0])).size !== t.steps.length) throw new Error(t.id + ': 같은 개념이 두 번 들어감'); });
  console.log('학습 경로', tracks.length + '개, 단계', tracks.reduce((a, t) => a + t.steps.length, 0) + '개');
  // 개념 테스트 문제: 형식, 가리키는 학습 경로와 실습, 그리고 실습 모형의 결과와 정답이 맞는지(sim) 확인
  const quizFiles = fs.readdirSync(dir).filter(f => /^quiz\d*\.js$/.test(f)).sort();
  const quizSrc = quizFiles.map(f => fs.readFileSync(path.join(dir, f), 'utf8')).join('\n');
  const bank = []; new Function('Lab', quizSrc)({ quiz: q => bank.push(...q) });
  let simChecked = 0;
  bank.forEach((q, i) => {
    const at = 'quiz #' + (i + 1) + ' (' + String(q.q).slice(0, 24) + '…)';
    if (![1, 2, 3].includes(q.lv)) throw new Error(at + ': lv');
    if (q.tr && !tracks.some(t => t.id === q.tr)) throw new Error(at + ': 없는 학습 경로 ' + q.tr);
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
  const glossSrc = fs.readFileSync(path.join(dir, 'glossary.js'), 'utf8');
  const gl = []; new Function('Lab', glossSrc)({ glossary: g => gl.push(...g) });
  const aliasMap = {};
  gl.forEach((e, i) => {
    const at = 'glossary #' + (i + 1) + ' (' + (e.kb || e.t) + ')';
    if (e.kb) { if (!kb.some(r => r[1] === e.kb)) throw new Error(at + ': 설명집에 없는 용어'); if (e.t || e.d) throw new Error(at + ': kb 항목에는 t, d를 쓰지 않음'); }
    else if (!e.t || !e.d || !e.w || !e.w.length) throw new Error(at + ': t, d, w가 필요');
    if (e.only && e.not) throw new Error(at + ': only와 not을 함께 쓸 수 없음');
    (e.only || e.not || []).forEach(id => { if (!ids.has(id)) throw new Error(at + ': 없는 실습 ' + id); });
    const ws = (e.w || []).slice(); if (e.kb) { ws.push(e.kb); const bare = e.kb.replace(/\(.*?\)/g, '').trim(); if (bare !== e.kb) ws.push(bare); }
    [...new Set(ws)].forEach(w => (aliasMap[w] = aliasMap[w] || []).push(e));
  });
  const applies = (e, ctx) => e.only ? !!ctx && e.only.includes(ctx) : e.not ? !ctx || !e.not.includes(ctx) : true;
  Object.keys(aliasMap).forEach(w => [''].concat([...ids]).forEach(ctx => { const hit = [...new Set(aliasMap[w].filter(e => applies(e, ctx)).map(e => e.kb || e.t))]; if (hit.length > 1) throw new Error('glossary: "' + w + '"가 ' + (ctx || '(실습 밖)') + '에서 여러 항목에 걸림: ' + hit.join(' / ')); }));
  console.log('용어 풀이', gl.length + '개 항목, 찾는 표현', Object.keys(aliasMap).length + '개');
  // 검증 수준: 모든 실습에 항목이 있고, 수준이 네 가지 중 하나인지 확인
  const verSrc = fs.readFileSync(path.join(dir, 'verify.js'), 'utf8');
  let ver = {}; new Function('Lab', verSrc)({ verify: v => { ver = v; } });
  list.forEach(l => { const v = ver[l.id]; if (!v || !['run', 'part', 'doc', 'model'].includes(v[0]) || !v[1]) throw new Error('verify: ' + l.id + ' 항목이 없거나 형식 오류'); });
  Object.keys(ver).forEach(id => { if (!ids.has(id)) throw new Error('verify: 없는 실습 ' + id); });
  console.log('검증 수준', ['run', 'part', 'doc', 'model'].map(k => k + ' ' + list.filter(l => ver[l.id][0] === k).length).join(', '));
  // 목차: 분야 → 묶음 → 항목. 항목은 실습(id)이거나 아직 실습이 없는 주제(t만 있음)다.
  const curSrc = fs.readFileSync(path.join(dir, 'curriculum.js'), 'utf8');
  let curri = [], site = {}; new Function('Lab', curSrc)({ curriculum: c => { curri = c; }, site: o => { site = o; } });
  const placed = new Set(); let todo = 0;
  if (new Set(curri.map(c => c.id)).size !== curri.length) throw new Error('curriculum: 분야 id가 겹침');
  curri.forEach(c => { if (!c.id || !c.name || !c.desc || !c.groups.length) throw new Error('curriculum: 분야 형식 오류 ' + c.id); if (ids.has(c.id) || ['home', 'study', 'quiz', 'all'].includes(c.id)) throw new Error('curriculum: 분야 id가 실습 id나 주소 이름과 겹침 ' + c.id);
    c.groups.forEach(g => { if (!g.name || !g.items.length) throw new Error('curriculum: 빈 묶음 ' + c.id + ' / ' + g.name); g.items.forEach(it => { if (it.id) { if (!ids.has(it.id)) throw new Error('curriculum: 없는 실습 ' + it.id); placed.add(it.id); } else { if (!it.t) throw new Error('curriculum: 이름 없는 항목 ' + c.id + ' / ' + g.name); todo++; } }); }); });
  const lost = list.filter(l => !placed.has(l.id)).map(l => l.id);
  if (lost.length) throw new Error('curriculum: 어느 분야에도 없는 실습: ' + lost.join(', '));
  console.log('목차', curri.map(c => c.name + ' ' + new Set(c.groups.flatMap(g => g.items.filter(it => it.id).map(it => it.id))).size + (c.groups.flatMap(g => g.items).filter(it => !it.id).length ? '(+준비 중 ' + c.groups.flatMap(g => g.items).filter(it => !it.id).length + ')' : '')).join(', '), '| 준비 중 합계', todo);
  const js = (files.map(f => fs.readFileSync(path.join(dir, 'lessons', f), 'utf8')).join('\n') + '\n' + tracksSrc + '\n' + quizSrc + '\n' + glossSrc + '\n' + verSrc + '\n' + curSrc).replace(/<(?=!--|\/?script)/gi, '\\x3c');
  let html = fs.readFileSync(path.join(dir, 'framework.html'), 'utf8');
  html = html.replace('/*__EXPLAIN__*/{}', () => JSON.stringify(explain).replace(/</g, '\\u003c')).replace('/*__TERMS__*/[]', () => JSON.stringify(terms).replace(/</g, '\\u003c')).replace('/*__LESSONS__*/', () => js);
  // 합친 스크립트가 문법상 유효한지 확인
  html.split('<script>').slice(1).forEach(s => new Function(s.split('</script>')[0]));
  fs.mkdirSync(path.join(__dirname, 'dist'), { recursive: true }); fs.mkdirSync(path.join(__dirname, 'docs'), { recursive: true });
  fs.writeFileSync(path.join(__dirname, 'dist', 'fragment.html'), html);
  const name = site.name || '개발 학습 실습실', desc = site.desc || '';
  const esc = x => String(x).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
  const head = '<!doctype html>\n<html lang="ko">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1">\n<meta name="description" content="' + esc(desc) + '">\n<meta property="og:title" content="' + esc(name) + '">\n<meta property="og:description" content="' + esc(desc) + '">\n<meta property="og:type" content="website">\n<style>html, body { margin: 0; }</style>\n';
  fs.writeFileSync(path.join(__dirname, 'docs', 'index.html'), head + html.replace('</style>', '</style>\n</head>\n<body>') + '\n</body>\n</html>\n');
  console.log('docs/index.html', (html.length / 1024).toFixed(0) + 'KB', '| 개념', list.length + '개:', list.map(l => l.nav).join(', '));
}

// 공개 사이트(docs/)를 여러 페이지로 만든다. build.js가 부른다.
//   docs/app.js, docs/app.css        모든 페이지가 함께 쓰는 스크립트와 모양 (영어판은 docs/en/ 아래)
//   docs/index.html                  처음 화면
//   docs/study/, docs/study/<분야>/  공부(분야 고르기)와 분야의 목차
//   docs/quiz/, docs/quiz/<분야>/    테스트
//   docs/lab/<실습 id>/              실습마다 한 페이지
//   docs/sitemap.xml                 검색 엔진에 알려 줄 주소 목록 (한국어판과 영어판을 합친 것)
// 어느 페이지를 열어도 같은 app.js가 그 주소에 맞는 화면을 그린다. 페이지마다 다른 것은 제목, 설명, 그리고
// 스크립트를 실행하지 않는 프로그램(검색 엔진, AI의 웹 읽기 도구, 링크 미리보기)이 읽을 수 있게 글자로 적어 둔 본문(#pre)이다.
const fs = require('fs'), path = require('path'), crypto = require('crypto');

module.exports = function (o) {
  const { EN, shell, js, explain, terms, list, kb, curri, site, ver, basics } = o;
  const out = path.join(__dirname, 'docs', EN ? 'en' : ''), lang = EN ? 'en' : 'ko';
  const T = EN ? {
    study: 'Learn', basics: 'Fundamentals', quiz: 'Quiz', quizAll: 'Quiz: all categories', lead: 'Pick a question, click Run, and watch how each concept behaves.',
    quizDesc: 'Questions at four levels: Basics, Beginner, Intermediate, and Applied. Questions you miss come back at spaced intervals.',
    concepts: 'Concepts in this lab', presets: 'Try these', run: 'Running with the default settings', result: 'Result of this run', code: 'Code', assume: 'Assumptions of this model',
    prev: 'Previous lab', next: 'Next lab', nojs: 'The labs on this site need JavaScript to run. The same content is written out below.',
    ver: { run: 'Checked against real execution', part: 'Partly checked against real execution', doc: 'Checked against documentation and standards', model: 'Conceptual model' },
  } : {
    study: '공부', basics: '기초개념', quiz: '테스트', quizAll: '전체 테스트', lead: '물음을 고르고 실행을 눌러, 개념이 어떻게 움직이는지 직접 봅니다.',
    quizDesc: '기초, 초급, 중급, 응용 단계의 문제를 풉니다. 틀린 문제는 간격을 두고 다시 나옵니다.',
    concepts: '이 실습에 나오는 개념', presets: '이렇게 바꿔 보세요', run: '처음 설정으로 실행하면', result: '실행 결과', code: '코드', assume: '이 모형의 전제',
    prev: '앞 실습', next: '다음 실습', nojs: '이 사이트의 실습은 자바스크립트를 켜야 움직입니다. 아래는 같은 내용을 글로 적은 것입니다.',
    ver: { run: '실행으로 대조', part: '일부만 실행으로 확인', doc: '문서·표준 대조', model: '개념 모형' },
  };
  const esc = x => String(x).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

  // 틀을 조각으로 나눈다: 글꼴 링크, 모양, 본문의 뼈대, 스크립트
  const iStyle = shell.indexOf('<style>'), iStyleEnd = shell.indexOf('</style>');
  const fontLink = (shell.slice(0, iStyle).match(/<link[^>]*>/) || [''])[0];
  const css = 'html, body { margin: 0; }\n' + shell.slice(iStyle + 7, iStyleEnd).trim() + '\n';
  const rest = shell.slice(iStyleEnd + 8), iScript = rest.indexOf('<script>');
  const body = rest.slice(0, iScript).trim(), lib = rest.slice(iScript + 8, rest.indexOf('</script>', iScript));
  if (!fontLink || !body.includes('</header>') || !body.includes('href="#home"') || !lib.includes('var Lab')) throw new Error('build_pages: 틀의 구조가 예상과 다름');
  const appJs = lib.trim() + '\n' + js + '\nLab.attach(' + JSON.stringify(explain) + ', ' + JSON.stringify(terms) + ');\nLab.start();\n';
  new Function(appJs); // 문법 확인(실행하지는 않는다)
  const v = crypto.createHash('sha1').update(css + appJs).digest('hex').slice(0, 10);
  fs.mkdirSync(out, { recursive: true });
  fs.writeFileSync(path.join(out, 'app.css'), css); fs.writeFileSync(path.join(out, 'app.js'), appJs);

  const name = site.name, base = site.url ? site.url.replace(/\/?$/, '/') : '', here = base && base + (EN ? 'en/' : ''), there = base && base + (EN ? '' : 'en/');
  const urls = [];
  function page(route, title, desc, pre) {
    const p = route ? route + '/' : '', up = p ? '../'.repeat(p.split('/').length - 1) : './';
    const head = ['<meta charset="utf-8">', '<meta name="viewport" content="width=device-width, initial-scale=1">', '<title>' + esc(title) + '</title>', '<meta name="description" content="' + esc(desc) + '">'];
    if (here) head.push('<link rel="canonical" href="' + here + p + '">', '<link rel="alternate" hreflang="' + lang + '" href="' + here + p + '">', '<link rel="alternate" hreflang="' + (EN ? 'ko' : 'en') + '" href="' + there + p + '">');
    head.push('<meta property="og:site_name" content="' + esc(name) + '">', '<meta property="og:title" content="' + esc(title) + '">', '<meta property="og:description" content="' + esc(desc) + '">', '<meta property="og:type" content="website">');
    if (here) head.push('<meta property="og:url" content="' + here + p + '">', '<meta property="og:image" content="' + base + 'img/lab-' + lang + '.png">', '<meta name="twitter:card" content="summary_large_image">');
    head.push(fontLink, '<link rel="stylesheet" href="' + up + 'app.css?v=' + v + '">', '<noscript><style>#pre { display: block; max-width: 76ch; }</style></noscript>');
    const b = body.replace('href="#home"', 'href="' + up + '"').replace('</header>', '</header>\n\n  <div id="pre">\n<p>' + esc(T.nojs) + '</p>\n' + pre + '\n  </div>');
    const html = '<!doctype html>\n<html lang="' + lang + '" data-root="' + up + '">\n<head>\n' + head.join('\n') + '\n</head>\n<body>\n' + b + '\n<script src="' + up + 'app.js?v=' + v + '"></script>\n</body>\n</html>\n';
    const file = path.join(out, p, 'index.html'); fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, html);
    urls.push(p); return html.length;
  }
  const byId = id => list.find(l => l.id === id);
  const link = (up, route, text) => '<a href="' + up + (route ? route + '/' : '') + '">' + esc(text) + '</a>';
  const short = (s, n) => { s = String(s).replace(/\s+/g, ' ').trim(); return s.length > n ? s.slice(0, n - 1).trim() + '…' : s; };
  // 분야의 목차: 묶음 이름과 그 안의 실습(이름 — 물음)
  const toc = (c, up, h) => c.groups.map(g => '<h' + h + '>' + esc(g.name) + '</h' + h + '>\n<ul>\n' + g.items.map(it => it.id ? '<li>' + link(up, 'lab/' + it.id, it.t || byId(it.id).nav) + ' — ' + esc(byId(it.id).title) + '</li>' : '<li>' + esc(it.t) + '</li>').join('\n') + '\n</ul>').join('\n');
  const labsOf = c => { const had = new Set(); c.groups.forEach(g => g.items.forEach(it => { if (it.id) had.add(it.id); })); return [...had]; };

  // 기초개념은 분야 하나처럼 다룬다(묶음이 분야). 실습 페이지의 길 안내와 앞뒤 실습에 쓴다.
  const bcat = basics ? { id: 'basics', name: T.basics, desc: basics.desc, groups: basics.groups, basic: true } : null;
  let bytes = 0;
  // 처음 화면: 사이트 소개와 모든 분야의 목차
  if (bcat) bytes += page('basics', bcat.name + ' · ' + name, bcat.desc, '<h1>' + esc(bcat.name) + '</h1>\n<p>' + esc(bcat.desc) + '</p>\n' + toc(bcat, '../', 2));
  bytes += page('', name, site.desc, '<h1>' + esc(name) + '</h1>\n<p>' + esc(T.lead) + '</p>\n<p>' + esc(site.desc) + '</p>\n' + (bcat ? '<h2>' + link('./', 'basics', bcat.name) + '</h2>\n<p>' + esc(bcat.desc) + '</p>\n' + toc(bcat, './', 3) + '\n' : '') + curri.map(c => '<h2>' + link('./', 'study/' + c.id, c.name) + '</h2>\n<p>' + esc(c.desc) + '</p>\n' + toc(c, './', 3)).join('\n'));
  bytes += page('study', T.study + ' · ' + name, site.desc, '<h1>' + esc(T.study) + '</h1>\n<ul>\n' + curri.map(c => '<li>' + link('../', 'study/' + c.id, c.name) + ' — ' + esc(c.desc) + '</li>').join('\n') + '\n</ul>');
  bytes += page('quiz', T.quiz + ' · ' + name, T.quizDesc, '<h1>' + esc(T.quiz) + '</h1>\n<p>' + esc(T.quizDesc) + '</p>\n<ul>\n' + curri.map(c => '<li>' + link('../', 'quiz/' + c.id, c.name) + '</li>').join('\n') + '\n</ul>');
  bytes += page('quiz/all', T.quizAll + ' · ' + name, T.quizDesc, '<h1>' + esc(T.quizAll) + '</h1>\n<p>' + esc(T.quizDesc) + '</p>');
  curri.forEach(c => {
    bytes += page('study/' + c.id, c.name + ' · ' + name, c.desc, '<p>' + link('../../', 'study', T.study) + '</p>\n<h1>' + esc(c.name) + '</h1>\n<p>' + esc(c.desc) + '</p>\n' + toc(c, '../../', 2));
    bytes += page('quiz/' + c.id, c.name + ' ' + T.quiz + ' · ' + name, T.quizDesc, '<h1>' + esc(c.name + ' ' + T.quiz) + '</h1>\n<p>' + esc(T.quizDesc) + '</p>\n<p>' + link('../../', 'study/' + c.id, c.name + ' · ' + T.study) + '</p>');
  });
  // 실습: 물음, 소개, 용어 설명, 예시, 처음 설정으로 실행한 단계와 결과, 코드, 전제
  list.forEach(l => {
    const up = '../../', cat = (bcat && labsOf(bcat).includes(l.id) ? bcat : null) || curri.find(c => labsOf(c).includes(l.id)), parts = [];
    if (cat) { const g = cat.groups.find(x => x.items.some(it => it.id === l.id)); parts.push('<p>' + (cat.basic ? link(up, 'basics', cat.name) : link(up, 'study', T.study) + ' › ' + link(up, 'study/' + cat.id, cat.name)) + ' › ' + esc(g.name) + '</p>'); }
    parts.push('<h1>' + esc(l.nav) + '</h1>', '<p><b>' + esc(l.title) + '</b></p>', '<p>' + esc(l.intro) + '</p>', '<p>' + esc(T.ver[ver[l.id][0]] + ' · ' + ver[l.id][1]) + '</p>');
    parts.push('<h2>' + esc(T.concepts) + '</h2>\n<dl>\n' + l.terms.map(t => '<dt>' + esc(t) + '</dt>\n<dd>' + esc(kb.find(r => r[1] === t)[2]) + '</dd>').join('\n') + '\n</dl>');
    parts.push('<h2>' + esc(T.presets) + '</h2>\n<ul>\n' + l.presets.map(p => '<li><b>' + esc(p.t) + '</b> — ' + esc(p.d) + '</li>').join('\n') + '\n</ul>');
    const c = {}; l.controls.forEach(d => { c[d.id] = d.value; });
    try {
      const sim = l.simulate(Object.assign({}, c)), ev = sim.events.map(e => e.s).filter(Boolean);
      if (ev.length) parts.push('<h2>' + esc(T.run) + '</h2>\n<ol>\n' + ev.slice(0, 60).map(s => '<li>' + esc(s) + '</li>').join('\n') + '\n</ol>');
      if (sim.summary && sim.summary.length) parts.push('<h3>' + esc(T.result) + '</h3>\n<ul>\n' + sim.summary.map(s => '<li>' + esc(s) + '</li>').join('\n') + '\n</ul>');
    } catch (e) { throw new Error('build_pages: ' + l.id + '의 처음 설정을 돌리지 못함: ' + e.message); }
    const code = typeof l.code === 'function' ? l.code(Object.assign({}, c)) : l.code;
    if (code && typeof code === 'string') parts.push('<h2>' + esc(T.code) + '</h2>\n<pre>' + esc(code) + '</pre>');
    if (typeof l.assume === 'string') parts.push('<h2>' + esc(T.assume) + '</h2>\n<p>' + esc(l.assume) + '</p>');
    if (cat) { const ids = labsOf(cat), i = ids.indexOf(l.id), nb = []; if (i > 0) nb.push(esc(T.prev) + ': ' + link(up, 'lab/' + ids[i - 1], byId(ids[i - 1]).nav)); if (i < ids.length - 1) nb.push(esc(T.next) + ': ' + link(up, 'lab/' + ids[i + 1], byId(ids[i + 1]).nav)); if (nb.length) parts.push('<p>' + nb.join(' · ') + '</p>'); }
    bytes += page('lab/' + l.id, l.nav + ': ' + l.title + ' · ' + name, short(l.intro, 155), parts.join('\n'));
  });

  // 주소 목록: 이번에 만든 언어의 목록을 적어 두고, 두 언어의 목록이 있으면 합쳐서 sitemap.xml을 쓴다
  if (base) {
    const dist = path.join(__dirname, 'dist'); fs.mkdirSync(dist, { recursive: true });
    fs.writeFileSync(path.join(dist, 'urls.' + lang + '.json'), JSON.stringify(urls));
    const all = []; [['ko', ''], ['en', 'en/']].forEach(([k, pre]) => { const f = path.join(dist, 'urls.' + k + '.json'); if (fs.existsSync(f)) JSON.parse(fs.readFileSync(f, 'utf8')).forEach(p => all.push(base + pre + p)); });
    fs.writeFileSync(path.join(__dirname, 'docs', 'sitemap.xml'), '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' + all.map(u => '<url><loc>' + esc(u) + '</loc></url>').join('\n') + '\n</urlset>\n');
  }
  // GitHub Pages가 Jekyll로 다시 가공하지 않고 파일을 그대로 올리게 한다
  fs.writeFileSync(path.join(__dirname, 'docs', '.nojekyll'), '');
  return { pages: urls.length, pageKB: Math.round(bytes / 1024), appKB: Math.round(appJs.length / 1024), cssKB: Math.round(css.length / 1024) };
};

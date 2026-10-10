// "URL의 구조" 실습의 모형 결과를 실제 실행 결과(url_probe.out.txt)와 대조한다
// 사용: node verify/net/cmp_url.js
const fs = require('fs'), path = require('path');
const { load, combos } = require('../model_rows.js');
const lesson = load('url');
const lines = fs.readFileSync(path.join(__dirname, 'url_probe.out.txt'), 'utf8').split(/\r?\n/);
const real = {};
lines.filter(l => l.includes(' => ') && !l.startsWith('#') && !l.startsWith('@')).forEach(l => { const i = l.indexOf(' => '); real[l.slice(0, i)] = JSON.parse(l.slice(i + 4)); });
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
let ok = 0, n = 0;
for (const c of combos(lesson)) {
  n++;
  const key = [c.origin, c.q, c.enc, c.rel].join('|'), r = real[key];
  if (!r) { console.log('실행 결과에 없는 조합: ' + key); continue; }
  const sim = lesson.simulate(Object.assign({}, c)), u = sim.u;
  const typedPort = /:\d+$/.test(c.origin), portWhy = !typedPort ? r.scheme + '의 기본 포트' : r.port === '' ? '적은 포트가 기본 포트와 같음' : '주소에 적은 포트';
  const want = [r.connectPort + ' (' + portWhy + ')', r.requestLine, r.q === null ? '없음' : '"' + r.q + '"' + (r.q === c.q ? '' : ' (보낸 값은 "' + c.q + '")'), r.params.map(p => p[0] + '="' + p[1] + '"').join(', '), r.link];
  // 표의 값 말고도 정리된 주소, 나눈 부분 여섯 개, Host 헤더, 풀어낸 파라미터 전체를 대조한다
  const extra = sim.href === r.href && u.scheme === r.scheme && u.host === r.host && u.host === r.wantedHost && u.port === r.port && u.path === r.path && u.query === r.query && u.frag === r.frag && sim.hostHeader === r.hostHeader && same(sim.params, r.params);
  if (same(sim.row, want) && extra) ok++;
  else console.log('다름: ' + key + '\n  모형 ' + sim.row.join(' / ') + ' · ' + sim.href + ' · Host ' + sim.hostHeader + '\n  실제 ' + want.join(' / ') + ' · ' + r.href + ' · Host ' + r.hostHeader);
}
// 추가 대조 1: 상대 주소 풀이
let rok = 0, rn = 0;
lines.filter(l => l.startsWith('@rel ')).forEach(l => { const r = JSON.parse(l.slice(5)); rn++; const got = lesson.href(lesson.resolve(r.rel, lesson.parse(r.base))); if (got === r.href) rok++; else console.log('상대 주소 다름: ' + r.base + ' + ' + JSON.stringify(r.rel) + '  모형 ' + got + '  실제 ' + r.href); });
// 추가 대조 2: 인코딩과 풀이
let fok = 0, fn = 0;
lines.filter(l => l.startsWith('@form ')).forEach(l => {
  const r = JSON.parse(l.slice(6)); fn++;
  const form = 'q=' + lesson.formEncode(r.w), u = lesson.parse('https://shop.example/shop/list?q=' + r.w + '&sort=price#review');
  const good = form === r.form && same(lesson.parseForm(form), r.formBack) && lesson.href(u) === r.typedHref && u.query === r.typedQuery && u.frag === r.typedFrag && same(lesson.parseForm(u.query), r.typedParams) && r.compBack === r.w && same(lesson.parseForm('q=' + r.comp), [['q', r.w]]);
  if (good) fok++; else console.log('인코딩 다름: ' + JSON.stringify(r.w) + '\n  모형 ' + form + ' · ' + lesson.href(u) + ' · ' + JSON.stringify(lesson.parseForm(u.query)) + '\n  실제 ' + r.form + ' · ' + r.typedHref + ' · ' + JSON.stringify(r.typedParams));
});
console.log('추가 대조: 상대 주소 ' + rok + ' / ' + rn + ', 인코딩과 풀이 ' + fok + ' / ' + fn);
console.log('일치 ' + ok + ' / ' + n);

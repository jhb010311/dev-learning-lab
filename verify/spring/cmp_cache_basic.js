// 기초개념 "캐시" 실습(@Cacheable 중심으로 다시 짠 것)의 모형 결과를 실제 스프링 실행 결과(cache_basic_probe.out.txt)와 대조한다.
// 대조: 결과 표 세 열(원본에서 읽은 횟수, 두 번째로 받은 값, 원본의 값), 마지막 단계가 보이는 출력 글,
//       화면의 코드(code 함수)가 Probe가 컴파일한 소스(package/import 머리글과 // PROBE 줄을 뺀 것)와 같은 글인지,
//       단계 문장이 기대는 사실(프록시가 생기는가, Caller가 받은 것이 그 빈인가, 첫 find 뒤 / 사이의 일 뒤 / 끝의 loadCount와 캐시에 적힌 1번 값).
// 옛 Map 중심 실습의 대조 도구는 verify/plain/cmp_cache_basic.js(이제 맞지 않음)이다.
const fs = require('fs'), path = require('path');
const { load, combos } = require('../model_rows.js');
const lesson = load('cache_basic');
const lines = fs.readFileSync(path.join(__dirname, 'cache_basic_probe.out.txt'), 'utf8').split(/\r?\n/).filter(Boolean);
console.log(lines[0]);
const real = {};
for (const ln of lines.slice(1)) {
  const i = ln.indexOf(' => '), k = ln.slice(0, i), v = ln.slice(i + 4), f = {};
  const si = v.indexOf('|src=');
  f.src = v.slice(si + 5);
  v.slice(0, si).split('|').forEach(p => { const j = p.indexOf('='); f[p.slice(0, j)] = p.slice(j + 1); });
  real[k] = f;
}
// 캐시 표기 "1;product(ConcurrentHashMap):{1=키보드}" 에서 loadCount와 1번 값
function mark(s) { const m = /^(\d+);[^:]*:\{(?:1=([^,}]*))?/.exec(s || ''); return m ? { loads: +m[1], cache: m[2] || '' } : null; }
let ok = 0, n = 0, factOk = 0, factAll = 0;
const cs = combos(lesson), seen = new Set();
for (const c of cs) {
  const k = c.cache + '|' + c.mid; if (seen.has(k)) continue; seen.add(k); n++;
  const f = real[k], probs = [];
  if (!f) { console.log('실제 실행 결과 없음: ' + k); continue; }
  const sim = lesson.simulate(Object.assign({}, c)), ev = sim.events;
  // 결과 표와 출력
  const o = f.out.split(' / '), want = [o[0] + '번', o[1], o[2]];
  if (JSON.stringify(sim.row) !== JSON.stringify(want)) probs.push('표 모형 ' + sim.row.join(' | ') + ' / 실제 ' + want.join(' | '));
  if (ev[ev.length - 1].snap.out !== f.out) probs.push('마지막 단계의 출력 모형 "' + ev[ev.length - 1].snap.out + '" 실제 "' + f.out + '"');
  // 화면의 코드 = Probe가 컴파일한 소스에서 머리글(package, import, 빈 줄)과 // PROBE 줄을 뺀 것
  const all = f.src.split('\\n'), start = all.findIndex(l => l.startsWith('//'));
  const body = all.slice(start).filter(l => !l.endsWith('// PROBE'));
  while (body.length && body[body.length - 1] === '') body.pop();
  if (body.join('\n') !== lesson.code(c)) probs.push('화면의 코드와 Probe가 컴파일한 소스가 다름');
  if (all.filter(l => l.endsWith('// PROBE')).length !== (c.mid === 'none' ? 1 : 2)) probs.push('PROBE 줄 수가 맞지 않음');
  // 단계 문장이 기대는 사실
  const at = ph => { const e = ev.filter(x => x.snap.ph === ph); return e.length ? e[e.length - 1].snap : null; };
  const px = ev[0].snap.proxy;
  const checks = {
    '프록시가 생기는가(빈의 클래스)': String(px) === f.isProxy && (px ? /^app\.ProductService\$\$SpringCGLIB\$\$0$/.test(f.beanClass) : f.beanClass === 'app.ProductService'),
    'Caller가 받은 것이 그 빈이다': f.callerHasBean === 'true',
  };
  [['after1', 'f1'], ['afterMid', 'mid'], ['end', 'out']].forEach(([rk, ph]) => {
    const s = at(ph), r = mark(f[rk]);
    if (!s && !r) return;
    checks[rk + '의 loadCount와 캐시에 적힌 1번 값'] = !!(s && r && s.loads === r.loads && s.cache === r.cache);
  });
  for (const [name, pass] of Object.entries(checks)) { factAll++; if (pass) factOk++; else probs.push('사실 불일치: ' + name); }
  if (!probs.length) ok++; else console.log('다름: ' + k + '\n   ' + probs.join('\n   '));
}
console.log('일치 ' + ok + ' / ' + n + (Object.keys(real).filter(k => k.split('|').length === 2).length !== n ? '  (실제 실행 조합 수 ' + Object.keys(real).filter(k => k.split('|').length === 2).length + ')' : ''));
console.log('화면 문장이 기대는 사실 ' + factOk + ' / ' + factAll);
// 화면에 없는 변형: key 없는 @CacheEvict는 키 1을 지우지 못한다 / @EnableCaching이 없으면 @Cacheable이 있어도 본문이 매번 실행된다
const nk = real['spring|evict|nokey'], ne = real['spring|none|noenable'];
console.log('변형 nokey(@CacheEvict("product")): ' + (nk && nk.out === '1 / 키보드 / 마우스' ? '단계 문장과 같음(키 1이 지워지지 않음)' : '다름 ' + (nk && nk.out)));
console.log('변형 noenable(@EnableCaching 없음): ' + (ne && ne.out === '2 / 키보드 / 키보드' && ne.isProxy === 'false' ? '용어 설명과 같음(프록시 없음, 본문 2번)' : '다름 ' + (ne && ne.out)));

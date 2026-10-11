// 모든 개념의 모형을 설정 조합으로 돌려 예외·형식 오류를 찾는다. 사용: node test_lab.js [id]
const { loadLessons } = require('./build.js');
const { list } = loadLessons();
const only = process.argv[2];
const stub = () => new Proxy(function () {}, { get: (t, k) => k === 'appendChild' ? (x => x) : k === 'style' ? {} : stub(), apply: () => stub() });
const H = new Proxy({}, { get: (t, k) => k === 'fmt' ? (x => (Math.round(x * 10) / 10).toFixed(1)) : (() => stub()) });
function combos(l) {
  const vals = l.controls.map(d => d.type === 'check' ? [false, true] : d.type === 'select' ? d.options.map(o => o[0]) : [...new Set([d.min, d.value, d.max])]);
  let out = [{}];
  l.controls.forEach((d, i) => { const nx = []; out.forEach(o => vals[i].forEach(v => nx.push({ ...o, [d.id]: v }))); out = nx; });
  return out;
}
// 그림(draw)이 적어 내는 장면을 검사한다: id 중복, 숫자, 그림 밖으로 나간 상자, 없는 상자를 가리키는 화살표, 이상한 글자
// 장면을 만드는 도구는 공통 틀(framework.html)의 코드를 그대로 가져다 쓴다
const fwSrc = require('fs').readFileSync(require('path').join(__dirname, 'src', 'framework.html'), 'utf8');
// 영어 실습(LAB_LANG=en)을 검사할 때는 실제 영어 빌드와 같은 그림 코드를 쓴다(src/en/ui.js의 표로 바꾼 것)
const picSrc0 = fwSrc.split('/*PIC-BEGIN*/')[1].split('/*PIC-END*/')[0], picSrc = process.env.LAB_LANG === 'en' ? (src => { const map = require(require('path').join(__dirname, 'src', 'en', 'ui.js')); map.slice().sort((a, b) => b[0].length - a[0].length).forEach(p => { src = src.split(p[0]).join(p[1]); }); return src; })(picSrc0) : picSrc0;
const pic = new Function(picSrc + '; return { picScene: picScene, picWidth: picWidth };')();
const cut = {};
function checkScene(l, sim, t) {
  const P = pic.picScene(), tw = pic.picWidth;
  l.draw(P, sim, sim.events.filter(e => e.t <= t + 1e-9), t);
  const at = ' (t=' + t + ')', ids = new Set(), bad = s => s !== undefined && /undefined|NaN|\[object/.test(String(s));
  if (!P.items.length) throw new Error('그림: 비어 있음' + at);
  if (bad(P.noteText)) throw new Error('그림: 이상한 설명 글자' + at);
  P.items.forEach(it => {
    if (!it.id || ids.has(it.id)) throw new Error('그림: id 중복 또는 없음 ' + it.id + at); ids.add(it.id);
    [it.label, it.title, it.right, it.str].concat(it.sub || []).forEach(s => { if (bad(s)) throw new Error('그림: 이상한 글자 ' + s + ' (' + it.id + ')' + at); });
    let box = [it.x, it.y, it.w, it.h];
    if (it.k === 'arrow') { if (!it.pts) return; box = [Math.min(it.x, it.w), Math.min(it.y, it.h), Math.abs(it.w - it.x), Math.abs(it.h - it.y)]; }
    if (it.k === 'text') { const wd = tw(it.str, 12.5); box = [it.anchor === 'end' ? it.x - wd : it.anchor === 'middle' ? it.x - wd / 2 : it.x, it.y - 12, wd, 16]; }
    if (!box.every(Number.isFinite)) throw new Error('그림: 숫자가 아닌 좌표 ' + it.id + at);
    if (box[0] < -0.5 || box[1] < -0.5 || box[0] + box[2] > P.w + 0.5 || box[1] + box[3] > P.h + 0.5) throw new Error('그림: 밖으로 나감 ' + it.id + ' [' + box.map(Math.round) + '] / ' + P.w + 'x' + P.h + at);
    if (it.k === 'box') { const room = it.w - (it.center ? 4 : 14) - (it.right ? tw(it.right, 12.5) + 10 : 0); [[it.title, 13]].concat(it.sub.map(s => [s, 12.5])).forEach(([s, z]) => { if (s && tw(s, z) > room) cut[l.id + ': ' + s] = 1; }); }
  });
  P.items.filter(it => it.k === 'arrow' && !it.pts).forEach(it => [it.from, it.to].forEach(e => { if (typeof e === 'string' && !ids.has(e.split(':')[0])) throw new Error('그림: 화살표가 없는 상자를 가리킴 ' + it.id + ' → ' + e + at); }));
}
function runOne(l, c) {
  if (l.fix) Object.assign(c, l.fix(c) || {});
  const sim = l.simulate(c); sim.c = c;
  if (!sim.events.length) throw new Error('사건 없음');
  if (sim.row.length !== l.columns.length) throw new Error('비교 표 칸 수 불일치');
  if (!sim.summary.length) throw new Error('결과 요약 없음');
  if (l.mode === 'step') { sim.events.forEach((e, i) => e.t = i + 1); sim.total = sim.events.length; }
  if (!(sim.total > 0)) throw new Error('total 없음');
  sim.events.forEach(e => { if (typeof e.s !== 'string' || /undefined|NaN/.test(e.s)) throw new Error('이상한 문장: ' + e.s); });
  sim.summary.concat(sim.row.map(String)).forEach(s => { if (/undefined|NaN/.test(s)) throw new Error('이상한 결과: ' + s); });
  const code = l.code(c), lab = l.label(c);
  if (/undefined|NaN/.test(code + lab)) throw new Error('이상한 코드/라벨');
  const ts = [0, ...sim.events.map(e => e.t), sim.total];
  ts.forEach(t => l.render(stub(), sim, t, H, sim.events.filter(e => e.t <= t + 1e-9)));
  if (l.draw) ts.forEach(t => checkScene(l, sim, t));
  return sim;
}
list.filter(l => !only || l.id === only).forEach(l => {
  const cs = combos(l); let n = 0;
  cs.forEach(c => { try { runOne(l, { ...c }); n++; } catch (e) { console.log('FAIL', l.id, JSON.stringify(c), e.message); process.exitCode = 1; } });
  l.presets.forEach(p => { const c = {}; l.controls.forEach(d => c[d.id] = p.v[d.id] !== undefined ? p.v[d.id] : d.value); try { runOne(l, c); } catch (e) { console.log('FAIL preset', l.id, p.t, e.message); process.exitCode = 1; } });
  console.log(l.id, '조합', n + '/' + cs.length, '통과, 프리셋', l.presets.length + (l.draw ? ', 그림 있음' : ''));
});
if (Object.keys(cut).length) console.log('그림에서 칸이 좁아 잘리는 글자 ' + Object.keys(cut).length + '개:\n  ' + Object.keys(cut).slice(0, 40).join('\n  '));
module.exports = { list, runOne };

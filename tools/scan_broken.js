// 조건에 따라 문장 조각이 빠져 깨진 문장을 찾는다("이름이고입니다.", "당겨지고.", "  ", ".." 같은 것).
// 실습을 모든 설정 조합으로 돌려 만든 단계 설명·실행 결과·그림 글자를 훑는다. 실행: node tools/scan_broken.js
const fs = require('fs'), path = require('path');
const { loadLessons } = require('../build.js'); const { list } = loadLessons();
const fw = fs.readFileSync(path.join(__dirname, '..', 'src', 'framework.html'), 'utf8').split('/*PIC-BEGIN*/')[1].split('/*PIC-END*/')[0];
const pic = new Function(fw + '; return { picScene: picScene };')();
const PAT = [[/[가-힣](고|며|지만|는데|면서|거나|아서|어서|으나|므로)\.(\s|$)/, '연결하는 말에서 문장이 끝남'], [/(이고|이며|하고|하며)(입니다|합니다|됩니다)/, '말이 겹쳐 붙음'], [/[가-힣]\.\.(?!\.)/, '마침표 두 번'], [/ ,|,,| \.(\s|$)/, '쉼표나 마침표 앞이 빔'], [/\(\s*\)(?![가-힣A-Za-z]*\s*(을|를|이|가|은|는|로|으로|와|과|의|에|도)?)/, '빈 괄호'], [/undefined|NaN|\[object/, '값이 빠짐']];
const found = {}; let n = 0;
function check(id, where, text) { const s = String(text || ''); PAT.forEach(([re, why]) => { const m = s.match(re); if (!m) return; const at = m.index, snip = s.slice(Math.max(0, at - 24), at + 26).replace(/\s+/g, ' '), key = id + '|' + why + '|' + snip.replace(/\d+/g, '#'); if (!found[key]) { found[key] = 1; n++; console.log(id + ' [' + where + '] ' + why + ': …' + snip + '…'); } }); }
list.forEach(l => {
  const base = {}; l.controls.forEach(d => { base[d.id] = d.value; });
  const combos = [], opts = l.controls.map(d => d.type === 'select' ? d.options.map(o => o[0]) : d.type === 'check' ? [false, true] : [d.value]);
  if (opts.reduce((a, o) => a * o.length, 1) <= 600) (function go(i, c) { if (i === l.controls.length) { combos.push(Object.assign({}, c)); return; } opts[i].forEach(v => { c[l.controls[i].id] = v; go(i + 1, c); }); })(0, {});
  else combos.push(Object.assign({}, base));
  (l.presets || []).forEach(p => combos.push(Object.assign({}, base, p.v)));
  check(l.id, '소개', l.intro);
  combos.forEach(c => {
    let sim; try { sim = l.simulate(Object.assign({}, c)); sim.c = c; } catch (e) { return; }
    (sim.events || []).forEach(e => check(l.id, '단계 설명', e.s)); (sim.summary || []).forEach(s => check(l.id, '실행 결과', s)); (sim.row || []).forEach(s => check(l.id, '결과 표', s));
    try { check(l.id, '실행 이름', l.label(c)); } catch (e) {}
    if (l.draw) { const ev = sim.events || [], times = l.mode === 'step' ? ev.map((e, i) => i) : ev.map(e => e.t);
      times.forEach(t => { const shown = l.mode === 'step' ? ev.slice(0, t + 1) : ev.filter(e => e.t <= t + 1e-9); const P = pic.picScene(); try { l.draw(P, sim, shown, l.mode === 'step' ? t : Math.max(0, t)); } catch (e) { return; }
        P.items.forEach(it => { check(l.id, '그림', it.label); check(l.id, '그림', it.title); (it.sub || []).forEach(s => check(l.id, '그림', s)); check(l.id, '그림', it.right); check(l.id, '그림', it.str); }); check(l.id, '그림 설명', P.noteText); }); }
  });
});
console.log(n ? '확인할 곳 ' + n + '곳' : '확인할 곳 없음');

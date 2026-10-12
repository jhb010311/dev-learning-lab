// 영어 낱말(클래스 이름, 경로 등) 바로 뒤에 붙은 조사가 소리와 맞지 않는 곳을 찾는다("Exception를", "/nothing는", "String를").
// 영어 낱말이 n, m, l, ng로 끝나면 한글로 읽을 때 받침이 생긴다(익셉션, 스트링, 널). 그 밖의 끝소리는 판단하지 않는다.
// 실습을 모든 설정 조합으로 돌려 만든 글과 고정된 글, 개념 설명집, 문제를 훑는다. 남는 것은 사람이 본다.
// 실행: node tools/scan_josa3.js
const fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..');
const { loadLessons } = require('../build.js'); const { list } = loadLessons();
const fw = fs.readFileSync(path.join(root, 'src', 'framework.html'), 'utf8').split('/*PIC-BEGIN*/')[1].split('/*PIC-END*/')[0];
const pic = new Function(fw + '; return { picScene: picScene };')();
const RE = /([A-Za-z][A-Za-z]*)(\(\))?(으로|를|을|와|과|은|는|가|이|로)(?=[\s,.)!?"'·:;\]]|$)/g;
const found = {}; let n = 0;
function check(src, where, text) {
  String(text || '').replace(RE, (m, word, paren, josa, at, all) => {
    const w = word.toLowerCase(); let k;                       // k: 1 받침, 8 ㄹ받침, 0 모름(판단 안 함)
    if (/(ng|n|m)$/.test(w) && !/(sign|column|autumn)$/.test(w)) k = 1; else if (/[^aeiou]?[aeiou]l$|ll$/.test(w)) k = 8; else return m;
    if (w.length < 2) return m;
    const bad = josa === '를' || josa === '와' || josa === '는' || josa === '가' || (josa === '로' && k === 1) || (josa === '으로' && k === 8);
    if (!bad) return m;
    const snip = all.slice(Math.max(0, at - 14), at + m.length + 10).replace(/\s+/g, ' '), key = word + '|' + josa;
    if (!found[key]) { found[key] = 1; n++; console.log(src + ' [' + where + '] …' + snip + '…'); }
    return m;
  });
}
list.forEach(l => {
  check(l.id, '소개', l.intro); check(l.id, '물음', l.title); check(l.id, '전제', l.assume);
  (l.presets || []).forEach(p => { check(l.id, '예시', p.t); check(l.id, '예시 설명', p.d); check(l.id, '물음', p.q); });
  const base = {}; l.controls.forEach(d => { base[d.id] = d.value; check(l.id, '설정', d.label); (d.options || []).forEach(o => check(l.id, '설정', o[1])); });
  const combos = [], opts = l.controls.map(d => d.type === 'select' ? d.options.map(o => o[0]) : d.type === 'check' ? [false, true] : [d.value]);
  if (opts.reduce((a, o) => a * o.length, 1) <= 400) (function go(i, c) { if (i === l.controls.length) { combos.push(Object.assign({}, c)); return; } opts[i].forEach(v => { c[l.controls[i].id] = v; go(i + 1, c); }); })(0, {});
  else combos.push(Object.assign({}, base));
  (l.presets || []).forEach(p => combos.push(Object.assign({}, base, p.v)));
  combos.forEach(c => {
    let sim; try { sim = l.simulate(Object.assign({}, c)); sim.c = c; } catch (e) { return; }
    (sim.events || []).forEach(e => check(l.id, '단계 설명', e.s)); (sim.summary || []).forEach(s => check(l.id, '실행 결과', s)); (sim.row || []).forEach(s => check(l.id, '결과 표', s));
    if (l.draw) { const ev = sim.events || [], times = l.mode === 'step' ? ev.map((e, i) => i) : ev.map(e => e.t);
      times.forEach(t => { const shown = l.mode === 'step' ? ev.slice(0, t + 1) : ev.filter(e => e.t <= t + 1e-9); const P = pic.picScene(); try { l.draw(P, sim, shown, l.mode === 'step' ? t : Math.max(0, t)); } catch (e) { return; }
        P.items.forEach(it => { check(l.id, '그림', it.label); check(l.id, '그림', it.title); (it.sub || []).forEach(s => check(l.id, '그림', s)); check(l.id, '그림', it.right); check(l.id, '그림', it.str); }); check(l.id, '그림 설명', P.noteText); }); }
  });
});
const scanFile = (f, where) => fs.readFileSync(f, 'utf8').split('\n').forEach(line => check(path.basename(f), where, line));
fs.readdirSync(path.join(root, 'kb')).filter(f => /^kb.*\.js$/.test(f)).forEach(f => scanFile(path.join(root, 'kb', f), '개념 설명'));
fs.readdirSync(path.join(root, 'src')).filter(f => /^(quiz|glossary|curriculum|basics|tracks)/.test(f) && f.endsWith('.js')).forEach(f => scanFile(path.join(root, 'src', f), '글'));
console.log(n ? '확인할 곳 ' + n + '곳' : '확인할 곳 없음');

// 실습의 소개가 말한 것을 화면이 실제로 보여 주는지 대조하려고, 실습마다 화면에 나오는 것을 글로 뽑는다.
// 소개, 설정(이름과 고를 수 있는 값), 결과 표의 열, 예시, 그리고 처음 설정과 예시마다의 그림 글자·단계 설명·실행 결과.
// 실행: node tools/dump_show.js <내보낼 폴더> <id> [id ...]      (id 대신 all이면 전부)
const fs = require('fs'), path = require('path');
const { loadLessons } = require('../build.js'); const { list } = loadLessons();
const fw = fs.readFileSync(path.join(__dirname, '..', 'src', 'framework.html'), 'utf8').split('/*PIC-BEGIN*/')[1].split('/*PIC-END*/')[0];
const pic = new Function(fw + '; return { picScene: picScene };')();
const out = process.argv[2], ids = process.argv.slice(3); fs.mkdirSync(out, { recursive: true });
const cut = (s, n) => { s = String(s).replace(/\s+/g, ' '); return s.length > n ? s.slice(0, n) + '…' : s; };
list.filter(l => ids[0] === 'all' || ids.includes(l.id)).forEach(l => {
  const base = {}; l.controls.forEach(d => { base[d.id] = d.value; });
  const L = ['# ' + l.id + ' — ' + l.nav, '물음: ' + l.title, '소개: ' + l.intro, '', '## 설정'];
  l.controls.forEach(d => L.push('- ' + d.label + ' [' + d.type + '] 처음 값 ' + JSON.stringify(d.value) + (d.options ? ' · 고를 수 있는 값: ' + d.options.map(o => o[1]).join(' / ') : d.type === 'range' || d.min !== undefined ? ' · ' + d.min + '~' + d.max : '')));
  L.push('', '## 결과 표의 열', (l.columns || []).join(' | '), '', '## 예시', ...l.presets.map(p => '- ' + p.t + ': ' + p.d));
  [{ t: '처음 설정', v: {} }].concat(l.presets.slice(1)).forEach((p, pi) => {
    const c = Object.assign({}, base, p.v); let sim; try { sim = l.simulate(Object.assign({}, c)); sim.c = c; } catch (e) { L.push('', '## 실행: ' + p.t, '오류: ' + e.message); return; }
    L.push('', '## 실행: ' + p.t, '결과 행: ' + (sim.row || []).join(' | '), '실행 결과 글: ' + (sim.summary || []).join(' / '));
    const ev = sim.events || [];
    if (pi === 0) { L.push('단계 설명 ' + ev.length + '개:'); ev.forEach((e, i) => { if (e.s) L.push('  ' + (i + 1) + '. ' + cut(e.s, 150)); }); }
    else L.push('단계 설명 ' + ev.length + '개 (마지막): ' + cut((ev[ev.length - 1] || {}).s || '', 150));
    if (l.draw) {
      const seen = new Set(), texts = []; const add = s => { s = String(s || '').trim(); if (s && !seen.has(s)) { seen.add(s); texts.push(s); } };
      const times = l.mode === 'step' ? ev.map((e, i) => i) : ev.map(e => e.t);
      times.forEach(t => { const shown = l.mode === 'step' ? ev.slice(0, t + 1) : ev.filter(e => e.t <= t + 1e-9); const P = pic.picScene(); try { l.draw(P, sim, shown, l.mode === 'step' ? t : Math.max(0, t)); } catch (e) { return; }
        P.items.forEach(it => { add(it.label); add(it.title); (it.sub || []).forEach(add); add(it.right); add(it.str); }); add(P.noteText); });
      L.push('그림에 나오는 글자(모든 단계를 합침): ' + cut(texts.join(' · '), pi === 0 ? 1500 : 500));
    }
  });
  fs.writeFileSync(path.join(out, 'show_' + l.id + '.md'), L.join('\n') + '\n');
});
console.log('뽑음');

// 그림의 글자(P.text)가 그림의 오른쪽이나 왼쪽 끝을 넘는 곳을 찾는다. 모든 실습을 모든 예시와 단계로 돌려 본다.
// 실행: node tools/check_pic_overflow.js        (영어판은 LAB_LANG=en)
const fs = require('fs'), path = require('path');
const { loadLessons } = require('../build.js');
const { list } = loadLessons();
const EN = process.env.LAB_LANG === 'en';
let fw = fs.readFileSync(path.join(__dirname, '..', 'src', 'framework.html'), 'utf8').split('/*PIC-BEGIN*/')[1].split('/*PIC-END*/')[0];
if (EN) { const map = require(path.join(__dirname, '..', 'src', 'en', 'ui.js')); map.slice().sort((a, b) => b[0].length - a[0].length).forEach(p => { fw = fw.split(p[0]).join(p[1]); }); }
const pic = new Function(fw + '; return { picScene: picScene, picWidth: picWidth };')();
const seen = new Set(); let n = 0;
list.filter(l => l.draw).forEach(l => {
  const base = {}; l.controls.forEach(d => { base[d.id] = d.value; });
  [{}].concat(l.presets.map(p => p.v)).forEach(v => {
    const c = Object.assign({}, base, v); let sim; try { sim = l.simulate(Object.assign({}, c)); sim.c = c; } catch (e) { return; }
    const times = l.mode === 'step' ? sim.events.map((e, i) => i) : sim.events.map(e => e.t);
    [-1].concat(times).forEach(t => {
      const shown = l.mode === 'step' ? sim.events.slice(0, t + 1) : sim.events.filter(e => e.t <= t + 1e-9);
      const P = pic.picScene(); try { l.draw(P, sim, shown, l.mode === 'step' ? t : Math.max(0, t)); } catch (e) { return; }
      P.items.filter(it => it.k === 'text').forEach(it => {
        const w = pic.picWidth(it.str, it.bold ? 13 : 12.5), left = it.anchor === 'end' ? it.x - w : it.anchor === 'middle' ? it.x - w / 2 : it.x, right = left + w;
        if (right > P.w + 1 || left < -1) { const key = l.id + '|' + it.id + '|' + it.str; if (!seen.has(key)) { seen.add(key); n++; console.log(l.id + ' [' + it.id + '] 그림 폭 ' + P.w + ', 글자 ' + Math.round(left) + '~' + Math.round(right) + ': ' + it.str.slice(0, 70)); } }
      });
    });
  });
});
console.log(n ? '끝을 넘는 글자 ' + n + '곳' : '끝을 넘는 글자 없음');

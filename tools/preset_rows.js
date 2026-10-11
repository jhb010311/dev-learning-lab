// 실습의 예시마다 바뀌는 설정 값과 결과 행, 실행 결과 글을 뽑는다. 예시의 설명이 결과와 맞는지 볼 때 쓴다.
// 실행: node tools/preset_rows.js <id> [id ...]
const { loadLessons } = require('../build.js'); const { list } = loadLessons();
process.argv.slice(2).forEach(id => {
  const l = list.filter(x => x.id === id)[0]; if (!l) { console.log('실습 없음: ' + id); return; }
  const base = {}; l.controls.forEach(d => { base[d.id] = d.value; });
  console.log('# ' + id + ' | 열: ' + l.columns.join(' | ') + '\n처음 값: ' + JSON.stringify(base));
  l.presets.forEach(p => { const c = Object.assign({}, base, p.v), sim = l.simulate(Object.assign({}, c)); const diff = {}; Object.keys(c).forEach(k => { if (c[k] !== base[k]) diff[k] = c[k]; });
    console.log('- ' + p.t + ' :: ' + p.d + '\n    바뀐 값 ' + JSON.stringify(diff) + '\n    행: ' + sim.row.join(' | ') + '\n    글: ' + (sim.summary || []).join(' / ').slice(0, 400)); });
});

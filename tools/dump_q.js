// 예시마다 붙인 물음(q)을 실습별로 뽑는다. 물음이 자연스러운 문장인지 점검할 때 쓴다.
// 실행: node tools/dump_q.js <내보낼 폴더> <묶음 수>
const fs = require('fs'), path = require('path');
const { loadLessons } = require('../build.js'); const { list } = loadLessons();
const out = process.argv[2], n = +process.argv[3] || 8; fs.mkdirSync(out, { recursive: true });
const labs = list.filter(l => (l.presets || []).some(p => p.q)), per = Math.ceil(labs.length / n); let total = 0;
const name = (d, v) => d.type === 'select' ? (d.options.filter(o => o[0] === v)[0] || [0, String(v)])[1] : d.type === 'check' ? (v ? '켬' : '끔') : String(v);
for (let i = 0; i < n; i++) {
  const txt = labs.slice(i * per, (i + 1) * per).map(l => {
    const base = {}; l.controls.forEach(d => { base[d.id] = d.value; });
    const L = ['### ' + l.id + ' — ' + l.nav, '설정:'];
    l.controls.forEach(d => L.push('- ' + d.label + (d.options ? ' [고르기: ' + d.options.map(o => o[1]).join(' / ') + ']' : d.type === 'check' ? ' [켜고 끄기]' : ' [숫자]') + ' 처음 값: ' + name(d, d.value)));
    L.push('물음:');
    l.presets.forEach((p, k) => { if (!p.q) return; total++; const chg = l.controls.filter(d => p.v && p.v[d.id] !== undefined && p.v[d.id] !== base[d.id]).map(d => d.label + ' → ' + name(d, p.v[d.id]));
      L.push((k + 1) + '. ' + p.q + '\n   (예시 이름: ' + p.t + ' · 처음 설정에서 바뀌는 것: ' + (chg.join(' ; ') || '없음') + ')'); });
    return L.join('\n');
  }).join('\n\n');
  fs.writeFileSync(path.join(out, 'q_' + (i + 1) + '.md'), txt + '\n');
}
console.log('실습 ' + labs.length + '개, 물음 ' + total + '개를 ' + n + '묶음으로');

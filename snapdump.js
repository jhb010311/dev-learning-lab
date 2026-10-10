// 실습의 마지막 단계 상태(snap)가 어떤 모양인지 짧게 찍어 본다. 사용: node snapdump.js id1 id2 ...
const { loadLessons } = require('./build_lab2.js'); const { list } = loadLessons();
const cutv = (v, d) => typeof v === 'string' ? (v.length > 46 ? v.slice(0, 46) + '…' : v) : Array.isArray(v) ? (d > 2 ? '[…' + v.length + ']' : v.slice(0, 3).map(x => cutv(x, d + 1)).concat(v.length > 3 ? ['…+' + (v.length - 3)] : [])) : v && typeof v === 'object' ? Object.fromEntries(Object.entries(v).slice(0, 12).map(([k, x]) => [k, cutv(x, d + 1)])) : v;
process.argv.slice(2).forEach(id => { const l = list.find(x => x.id === id); if (!l) return console.log(id, '없음');
  const c = {}; l.controls.forEach(d => c[d.id] = d.type === 'select' ? String(d.value) : d.value); const sim = l.simulate(c);
  const extra = Object.keys(sim).filter(k => !['events', 'summary', 'row', 'total'].includes(k));
  console.log('== ' + id + ' [' + l.mode + '] events=' + sim.events.length + ' sim.' + extra.join(',') + '\n  ' + JSON.stringify(cutv(sim.events[sim.events.length - 1].snap !== undefined ? sim.events[sim.events.length - 1].snap : '(snap 없음: ' + Object.keys(sim.events[0]).join(',') + ')', 0))); });

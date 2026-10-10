// "윈도우 함수" 실습의 모형 결과를 실제 MySQL 8.4 실행 결과(windowfn_probe.out.txt)와 조합마다 대조한다.
// 동점인 행의 순서는 SQL이 정하지 않으므로, 이름이 아니라 (팀, 점수, 붙은 값)을 같은 (팀, 점수) 안에서 값 순으로 놓고 비교한다.
const fs = require('fs'), path = require('path');
const { load, combos } = require('../model_rows.js');
const lesson = load('windowfn');
const lines = fs.readFileSync(path.join(__dirname, 'windowfn_probe.out.txt'), 'utf8').split(/\r?\n/).filter(l => l.includes(' => '));
console.log(fs.readFileSync(path.join(__dirname, 'windowfn_probe.out.txt'), 'utf8').split(/\r?\n/)[0]);
const real = {}; lines.forEach(l => { const [k, v] = l.split(' => '); real[k] = Object.fromEntries(v.split('|').map(x => [x.slice(0, x.indexOf('=')), x.slice(x.indexOf('=') + 1)])); });
// 모형의 결과 행을 Probe와 같은 모양("팀:점수:값")으로 바꾼다
function tuples(out, part, key) {
  const rows = out.map(r => ({ team: part ? r.team : '', pts: r.pts, v: r[key] }));
  rows.sort((a, b) => a.team.localeCompare(b.team) || b.pts - a.pts || (a.v === null ? -1 : a.v) - (b.v === null ? -1 : b.v));
  return rows.map(r => (part ? r.team + ':' : '') + r.pts + ':' + (r.v === null ? 'NULL' : r.v)).join(',');
}
// 실제 결과에서 "동점인 두 행의 값이 같은가"를 구한다
function tieCol(fn, vals) {
  if (fn === 'group') return '해당 없음';
  const g = {}; vals.split(',').forEach(t => { const i = t.lastIndexOf(':'); (g[t.slice(0, i)] = g[t.slice(0, i)] || []).push(t.slice(i + 1)); });
  const ties = Object.values(g).filter(a => a.length > 1);
  if (!ties.length) return '동점 없음';
  return ties.every(a => new Set(a).size === 1) ? '서로 같음' : ties.every(a => new Set(a).size === a.length) ? '서로 다름' : '섞여 있음';
}
let ok = 0, n = 0;
for (const c of combos(lesson)) {
  n++;
  const key = c.fn + '|' + c.part + '|' + c.tie, r = real[key], sim = lesson.simulate(Object.assign({}, c)), bad = [];
  if (!r) { console.log('Probe 출력에 없는 조합: ' + key); continue; }
  const part = c.part;
  const modelVals = c.fn === 'group' ? sim.k.groups.map(g => (part ? g.team + ':' : '') + g.v).join(',') : tuples(sim.k.out, part, 'v');
  if (modelVals !== r.vals) bad.push('값  모형 ' + modelVals + '  실제 ' + r.vals);
  if (sim.row[0] !== r.rows + '행') bad.push('행 수  모형 ' + sim.row[0] + '  실제 ' + r.rows + '행');
  if (sim.row[2] !== tieCol(c.fn, r.vals)) bad.push('동점  모형 ' + sim.row[2] + '  실제 ' + tieCol(c.fn, r.vals));
  // 비교 표의 둘째 칸이 모형의 계산값을 그대로 적은 것인지(표기만 다른지) 확인
  const shown = c.fn === 'group' ? sim.k.groups.map(g => (part ? g.team + '팀 ' : '') + g.v).join(' / ') : sim.k.parts.map((p, pi) => (part ? p[0].team + '팀 ' : '') + sim.k.out.filter(x => x.pi === pi).map(x => x.v === null ? 'NULL' : x.v).join(', ')).join(' / ');
  if (sim.row[1] !== shown) bad.push('표의 값 표기가 계산값과 다름: ' + sim.row[1]);
  if (c.fn === 'sum') { const m = tuples(sim.k.out, part, 'rowsFrame'); if (m !== r.rowsframe) bad.push('ROWS 프레임  모형 ' + m + '  실제 ' + r.rowsframe); }
  if (bad.length) console.log('다름: ' + key + '\n   ' + bad.join('\n   ')); else ok++;
}
console.log('일치 ' + ok + ' / ' + n);

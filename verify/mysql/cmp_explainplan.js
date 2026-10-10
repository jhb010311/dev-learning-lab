// "실행 계획 읽기" 실습의 모형 결과를 실제 MySQL 8.4의 EXPLAIN 결과(explainplan_probe.out.txt)와 조합마다 대조한다.
// type, possible_keys, key, Extra는 글자 그대로 비교한다. rows는 추정값이라 "1행 / 일부 / 테이블 전체" 가운데 어디에 드는지만 비교한다.
const fs = require('fs'), path = require('path');
const { load, combos } = require('../model_rows.js');
const lesson = load('explainplan');
const all = fs.readFileSync(path.join(__dirname, 'explainplan_probe.out.txt'), 'utf8').split(/\r?\n/).filter(Boolean);
console.log(all[0]);
const parse = v => Object.fromEntries(v.split('|').map(x => [x.slice(0, x.indexOf('=')), x.slice(x.indexOf('=') + 1)]));
const lines = v => v.split(' ## ')[0].split(' ;; ').map(parse);
const real = {}; all.filter(l => !l.startsWith('#') && l.includes(' => ')).forEach(l => { const [k, v] = l.split(' => '); real[k] = lines(v); });
const nul = x => x === 'null' ? 'NULL' : x;
// 추정 행 수가 모형이 말한 크기에 드는지
function rowsCat(n) { n = +n; return n === 1 ? '1행' : n >= 2 && n <= 10 ? '일부 (약 2행)' : n >= 100 && n <= 400 ? '일부 (약 200행)' : n >= 15000 && n <= 25000 ? '테이블 전체 (약 2만 행)' : '어림 범위 밖 ' + n; }
const seen = new Set(); let ok = 0, n = 0;
for (const c of combos(lesson)) {
  const key = c.w + '|' + c.sel + '|' + c.tail;
  if (seen.has(key)) continue; seen.add(key); n++;
  const r = real[key], sim = lesson.simulate(Object.assign({}, c)), row = sim.row;
  if (!r) { console.log('Probe 출력에 없는 조합: ' + key); continue; }
  const col = f => r.length > 1 ? r.map(x => x.table + ': ' + f(x)).join(' / ') : f(r[0]);
  const want = [col(x => x.type), col(x => nul(x.possible_keys)), col(x => nul(x.key)), col(x => rowsCat(x.rows)), col(x => x.Extra === 'null' ? '(없음)' : x.Extra)];
  let extraOk = true;
  if (c.w === 'join') extraOk = /\.o\.member_id$/.test(r[1].ref) && sim.p[1].ref === 'o.member_id';
  if (JSON.stringify(row) === JSON.stringify(want) && extraOk) ok++; else console.log('다름: ' + key + '\n   모형 ' + row.join(' | ') + '\n   실제 ' + want.join(' | ') + (extraOk ? '' : '\n   ref 칸이 다름: ' + r[1].ref));
}
console.log('일치 ' + ok + ' / ' + n + (Object.keys(real).length === n ? '' : '  (Probe 출력의 조합 수 ' + Object.keys(real).length + '개와 다름)'));
// 덧붙인 확인 1: 조건에 실제로 맞는 행 수(화면의 "조건에 실제로 맞는 행")
const cnt = parse(all.find(l => l.startsWith('# counts')).slice('# counts '.length)), bad = Object.keys(lesson.MATCH).filter(k => String(lesson.MATCH[k]) !== cnt[k]);
console.log('조건에 맞는 실제 행 수: ' + (bad.length ? '다름 ' + bad.map(k => k + ' 모형 ' + lesson.MATCH[k] + ' 실제 ' + cnt[k]).join(', ') : '일곱 가지 조건 모두 일치'));
// 덧붙인 확인 2: 단계 문장의 "인덱스가 있는 name으로 묶으면 임시 테이블이 필요 없다"
const g = lines(all.find(l => l.startsWith('# extra groupbyname')).split(' => ')[1])[0];
console.log('GROUP BY name의 Extra: ' + g.Extra + (/Using temporary/.test(g.Extra) ? '  (문장과 다름)' : '  (Using temporary 없음, 문장과 일치)'));

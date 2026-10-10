// "JPA가 푸는 문제" 실습의 모형 결과를 실제 실행 결과(ormwhy_probe.out.txt)와 대조한다
// 비교하는 것: 결과 표의 네 칸(직접 쓴 SQL 수, 나간 SQL, 확인한 것, 결과)과, 줄마다 나간 SQL의 종류와 테이블(trace)
const fs = require('fs'), path = require('path');
const { load, combos } = require('../model_rows.js');
const lesson = load('ormwhy');
const lines = fs.readFileSync(path.join(__dirname, 'ormwhy_probe.out.txt'), 'utf8').split(/\r?\n/).filter(Boolean);
console.log(lines[0]);
const real = {};
lines.filter(l => l.includes(' => ')).forEach(l => { const [k, v] = l.split(' => '); real[k] = v; });
const CHECK = { same: 'a == b', nav: 'order.getMember().getName()', field: '다시 읽은 grade' };
let ok = 0; const all = combos(lesson), bad = [];
for (const c of all) {
  const key = c.sc + '|' + c.how + '|' + c.fix, v = real[key];
  if (!v) { bad.push(key + '  실제 실행 결과가 없음'); continue; }
  const [written, trace, res, db] = v.split('|');
  // 실제 trace에서 나간 SQL을 종류별로 센다 (처음 나온 순서대로)
  const cnt = {}, order = [];
  trace.split('; ').forEach(t => t.split(':')[1].split(',').filter(Boolean).forEach(k => { const w = k.split(' ')[0].toUpperCase(); if (!cnt[w]) { cnt[w] = 0; order.push(w); } cnt[w]++; }));
  const result = c.sc === 'field' && res === 'null' ? 'null (DB에' + (db === 'null' ? '도 NULL)' : '는 ' + db + ')') : res;
  if (c.sc === 'field' && res !== 'null' && db !== res) { bad.push(key + '  다시 읽은 값 ' + res + '과 DB의 값 ' + db + '이 다름'); continue; }
  const want = [written + '개', order.map(w => w + ' ' + cnt[w] + '번').join(', '), CHECK[c.sc], result];
  const sim = lesson.simulate(Object.assign({}, c));
  if (JSON.stringify(sim.row) === JSON.stringify(want) && sim.trace === trace) ok++;
  else bad.push(key + '\n   모형 ' + sim.row.join(' / ') + ' [' + sim.trace + ']\n   실제 ' + want.join(' / ') + ' [' + trace + ']');
}
console.log('일치 ' + ok + ' / ' + all.length);
bad.forEach(b => console.log('다름: ' + b));

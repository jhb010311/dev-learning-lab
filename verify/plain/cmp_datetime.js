// 날짜와 시간 실습의 모형 결과를 실제 실행 결과(DateTimeProbe.out.txt)와 대조한다
const fs = require('fs'), path = require('path');
const { load, combos } = require('../model_rows.js');
const lesson = load('datetime');
const real = {};
fs.readFileSync(path.join(__dirname, 'DateTimeProbe.out.txt'), 'utf8').split(/\r?\n/).filter(l => l.includes(' => ')).forEach(l => { const [k, v] = l.split(' => '); real[k] = v; });
const cs = combos(lesson), distinct = new Set();
let ok = 0;
for (const c of cs) {
  const k = [c.topic, c.add, c.zone, c.gap].join('|');
  if (!real[k]) { console.log('실제 실행 결과 없음: ' + k); continue; }
  distinct.add(c.topic + '|' + (c.topic === 'plus' ? c.add : c.topic === 'zone' ? c.zone : c.gap));
  const parts = real[k].split('|'), sim = lesson.simulate(Object.assign({}, c));
  let want = parts, exOk = sim.ex === '';
  if (parts[0].startsWith('EX:')) {
    // EX:패키지.예외클래스: 메시지  → 모형의 표에는 예외 클래스의 짧은 이름을, sim.ex에는 메시지를 둔다
    const m = /^EX:(?:[\w.]*\.)?(\w+): (.*)$/.exec(parts[0]);
    want = ['예외: ' + m[1], '(실행되지 않음)', '(실행되지 않음)']; exOk = sim.ex === m[2];
  }
  if (JSON.stringify(sim.row) === JSON.stringify(want) && exOk) ok++; else console.log('다름: ' + k + '  모형 ' + sim.row.join(' / ') + (sim.ex ? ' [' + sim.ex + ']' : '') + '  실제 ' + real[k]);
}
if (cs.length !== Object.keys(real).length) console.log('조합 수가 다름: 모형 ' + cs.length + ', 실제 ' + Object.keys(real).length);
console.log('서로 다른 경우 ' + distinct.size + '가지');
console.log('일치 ' + ok + ' / ' + Object.keys(real).length);

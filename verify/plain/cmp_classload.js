// "클래스 로딩과 초기화" 실습의 모형 결과를 실제 실행 결과(ClassLoadProbe.out.txt)와 대조한다
const fs = require('fs'), path = require('path');
const { load, combos } = require('../model_rows.js');
const lesson = load('classload');
const lines = fs.readFileSync(path.join(__dirname, 'ClassLoadProbe.out.txt'), 'utf8').split(/\r?\n/).filter(l => l.includes(' => '));
const real = {}; lines.forEach(l => { const [k, v] = l.split(' => '); real[k] = v.split('|'); });
const seen = new Set(); let ok = 0, n = 0;
for (const c of combos(lesson)) {      // combos가 fix를 적용하므로 뜻이 같은 조합은 하나로 모인다
  const key = c.cls + '|' + c.use + '|' + c.decl; if (seen.has(key)) continue; seen.add(key); n++;
  const r = real[key]; if (!r) { console.log('실행 결과 없음: ' + key); continue; }
  // 실제: 출력된 줄(>로 이음) | 읽어 들인 클래스 | 읽어 들인 시점까지 넣은 순서
  const out = r[0].split('>'), cnt = x => out.filter(l => l === x).length, word = k => k === 0 ? '실행 안 됨' : k + '번 실행';
  const want = [word(cnt('Parent 초기화')), word(cnt('Child 초기화')), r[1] === 'none' ? '없음' : r[1].split(',').join(', '), out.join(' → ')];
  const sim = lesson.simulate(Object.assign({}, c));
  if (JSON.stringify(sim.row) === JSON.stringify(want) && sim.seq.join('>') === r[2]) ok++;
  else console.log('다름: ' + key + '\n  모형 ' + sim.row.join(' / ') + ' [' + sim.seq.join('>') + ']\n  실제 ' + want.join(' / ') + ' [' + r[2] + ']');
}
Object.keys(real).forEach(k => { if (!seen.has(k)) console.log('모형에 없는 조합: ' + k); });
console.log('일치 ' + ok + ' / ' + n + (n !== lines.length ? '  (실행 결과는 ' + lines.length + '줄)' : ''));

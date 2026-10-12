// 기초개념 "테스트 코드" 실습의 모형 결과를 실제 JUnit 실행 결과(test_basic_probe.out.txt)와 대조한다
// 대조: 결과 표 세 열(실행된 테스트, 결과, 실패 메시지), 찾은 테스트·통과·실패의 수(마지막 단계의 세는 칸),
//       실패한 예외가 AssertionFailedError인 것, 화면의 코드가 Probe가 컴파일한 소스(verify/out/test_basic/<조합>/CalcTest.java)에서 import 줄을 뺀 것과 같은 글인지,
//       단계 문장이 기대는 사실(FACT: @Test가 있으면 우리 코드가 부르지 않아도 adds()와 add가 한 번씩 실행되고, 없으면 둘 다 0번)
const fs = require('fs'), path = require('path');
const { load, combos } = require('../model_rows.js');
const lesson = load('test_basic');
const lines = fs.readFileSync(path.join(__dirname, 'test_basic_probe.out.txt'), 'utf8').split(/\r?\n/).filter(Boolean);
console.log(lines[0]);
function kv(s) { const f = {}; s.split('|').forEach(p => { const i = p.indexOf('='); f[p.slice(0, i)] = p.slice(i + 1); }); return f; }
let ok = 0, total = 0;
for (const ln of lines.slice(1)) {
  if (ln.startsWith('FACT ')) continue;
  total++;
  const [k, v] = ln.split(' => '), [impl, expect, anno] = k.split('|'), f = kv(v);
  const c = { impl, expect, anno: anno === 'true' };
  const sim = lesson.simulate(Object.assign({}, c)), probs = [];
  const found = +f.found, succ = +f.succeeded, fail = +f.failed;
  const real = found === 0
    ? ['0개', '판정할 테스트가 없음 (통과도 실패도 아님)', '없음']
    : ['1개 (adds)', fail ? '실패' : '통과', fail ? f.msg : '없음'];
  if (f.compile !== 'OK') probs.push('컴파일 실패');
  if (JSON.stringify(sim.row) !== JSON.stringify(real)) probs.push('표 모형 ' + sim.row.join(' | ') + '\n   실제 ' + real.join(' | '));
  if (found !== succ + fail || f.started !== f.found && found) probs.push('찾은 수·시작·성공·실패가 맞지 않음');
  if (+f.aborted || +f.skipped || +f.containersFailed) probs.push('중단·건너뜀·컨테이너 실패가 있음');
  if (fail && f.exc !== 'org.opentest4j.AssertionFailedError') probs.push('실패한 예외가 AssertionFailedError가 아님: ' + f.exc);
  const last = sim.events[sim.events.length - 1].snap;
  if (last.found !== found || last.passed !== succ || last.failed !== fail) probs.push('세는 칸 모형 ' + [last.found, last.passed, last.failed] + ' 실제 ' + [found, succ, fail]);
  if (sim.msg !== (fail ? f.msg : sim.msg)) probs.push('메시지 모형 ' + sim.msg + ' 실제 ' + f.msg);
  const srcFile = path.join(__dirname, '..', 'out', 'test_basic', [impl, expect, anno].join('-'), 'CalcTest.java');
  const all = fs.readFileSync(srcFile, 'utf8').replace(/\r\n/g, '\n');
  const head = 'import org.junit.jupiter.api.Test;\nimport static org.junit.jupiter.api.Assertions.assertEquals;\n\n';
  if (!all.startsWith(head)) probs.push('소스 머리글이 다름');
  if (all.slice(head.length).trimEnd() !== lesson.code(c)) probs.push('화면의 코드와 Probe가 컴파일한 소스가 다름');
  if (!probs.length) ok++; else console.log('다름: ' + k + '\n   ' + probs.join('\n   '));
}
const mc = combos(lesson).length;
if (mc !== total) console.log('다름: 모형의 조합 ' + mc + '개, Probe 출력 ' + total + '개');
const facts = {};
for (const ln of lines.filter(l => l.startsWith('FACT '))) { const [k, v] = ln.split(' => '); facts[k] = kv(v); }
const want = { 'FACT anno=true': ['1', '1', '1'], 'FACT anno=false': ['0', '0', '0'] };
for (const k in want) {
  total++;
  const f = facts[k];
  if (f && f.compile === 'OK' && [f.found, f.addsCalls, f.addCalls].join() === want[k].join()) ok++;
  else console.log('다름: ' + k + ' ' + JSON.stringify(f));
}
console.log('일치 ' + ok + ' / ' + total);  // 조합 8개 + 사실 2개

// 설정 우선순위 실습의 모형 결과를 실제 스프링 부트 실행 결과(config_probe.out.txt)와 대조한다
const fs = require('fs'), path = require('path');
const { load } = require('../model_rows.js');
const lesson = load('config');
const lines = fs.readFileSync(path.join(__dirname, 'config_probe.out.txt'), 'utf8').split(/\r?\n/).filter(Boolean);
console.log(lines[0]);
// 스프링 부트의 프로퍼티 소스 이름 → 어느 종류인가
const kind = n => n === 'commandLineArgs' ? 'cli' : n === 'systemProperties' ? 'sys' : n === 'systemEnvironment' ? 'env' : /application-prod\.yml/.test(n) ? 'prof' : /application\.yml/.test(n) ? 'yml' : 'def';
let ok = 0; const names = new Set();
for (const ln of lines.slice(1)) {
  const [k, v] = ln.split(' => '), [yml, prof, env, sys, cli] = k.split('|').map(x => x === 'true'), i = v.indexOf('|'), val = v.slice(0, i), src = kind(v.slice(i + 1));
  const sim = lesson.simulate({ yml, prof, env, sys, cli }), row = sim.row, last = sim.events[sim.events.length - 1].snap;
  const modelSrc = last.win || 'def';
  names.add(src + ' = ' + row[1]);
  if (row[0] === val && modelSrc === src) ok++; else console.log('다름: ' + k + '  모형 ' + row[0] + ' (' + modelSrc + ')  실제 ' + val + ' (' + src + ')');
}
console.log('일치 ' + ok + ' / ' + (lines.length - 1));
console.log([...names].sort().join('\n'));

// "람다와 함수형 인터페이스" 실습의 모형 결과를 실제 javac 컴파일과 실행 결과(lambda_probe.out.txt)와 대조한다
// (2026-10-22, 표준 메서드가 람다를 부르는 곳을 중심으로 다시 짠 판. 옛 판의 프로브 LambdaProbe.java와 결과 LambdaProbe.out.txt는 그대로 둔다.)
// 순서: node verify/plain/lambda_probe.js   (화면의 코드를 조합마다 Main.java로 써서 컴파일·실행하고, 표에 적은 표준의 사실을 확인)
//       node verify/plain/cmp_lambda.js
// 대조: 조합마다 출력된 줄 전체와 그 순서, 결과 표의 "본문이 실행된 횟수"(실제 출력에서 람다·defaultName이 찍은 줄 수), "결과"(실제 출력의 마지막 줄),
//       "받는 함수형 인터페이스"가 그 조합의 표준 메서드 매개변수와 맞는지, 그리고 # fact 줄이 모두 true인지
const fs = require('fs'), path = require('path');
const { load, combos } = require('../model_rows.js');
const lesson = load('lambda');
const all = fs.readFileSync(path.join(__dirname, 'lambda_probe.out.txt'), 'utf8').split(/\r?\n/).filter(Boolean);
console.log(all[0]);
const real = {};
all.filter(l => !l.startsWith('#')).forEach(l => { const i = l.indexOf(' => '); real[l.slice(0, i)] = l.slice(i + 4); });
// 출력 줄 가운데 람다(또는 orElse의 defaultName)가 찍은 줄
const isBody = (api, l) => /^(람다 실행|filter 람다|map 람다|키 꺼냄|기본값 만듦)/.test(l) || (api === 'forEachRef' && /^(kiwi|fig|banana)$/.test(l));
// 함수형 인터페이스가 람다로 구현하는 메서드(실제 확인한 # fact abstract 줄)
const abs = {}; all.filter(l => l.startsWith('# fact abstract ')).forEach(l => { const m = /^# fact abstract (\w+) = (\w+)$/.exec(l); abs[m[1]] = m[2]; });
let ok = 0, n = 0;
for (const c of combos(lesson)) {
  n++;
  const key = c.api + '-' + c.data, r = real[key];
  if (!r || /^(COMPILE|RUN)_FAIL/.test(r)) { console.log('다름: ' + key + ' 실제 실행 결과 없음 또는 실패: ' + r); continue; }
  const got = r.split(' / '), sim = lesson.simulate(Object.assign({}, c)), bad = [];
  if (JSON.stringify(sim.out) !== JSON.stringify(got)) bad.push('출력 모형 ' + sim.out.join(' / ') + '\n    실제 ' + r);
  const body = got.filter(l => isBody(c.api, l));
  let wantCount;
  if (c.api === 'stream' || c.api === 'nostream') wantCount = 'filter ' + body.filter(l => l.startsWith('filter')).length + '번, map ' + body.filter(l => l.startsWith('map')).length + '번';
  else if (c.api === 'orElse') wantCount = 'defaultName() ' + body.length + '번 (람다 없음)';
  else wantCount = body.length + '번';
  if (sim.row[2] !== wantCount) bad.push('횟수 모형 ' + sim.row[2] + ' 실제 ' + wantCount);
  const lastLine = got[got.length - 1];
  const wantRes = c.api === 'forEach' || c.api === 'forEachRef' ? (body.length ? '요소마다 한 줄 출력' : '출력 없음') : c.api === 'nostream' ? (body.length ? '?' : '(실행되지 않음)') : lastLine.replace(/^(남은 것|결과|정렬|이름) /, '');
  if (sim.row[3] !== wantRes) bad.push('결과 모형 ' + sim.row[3] + ' 실제 ' + wantRes);
  // 받는 함수형 인터페이스: 표준 매개변수 타입(# fact param)의 이름과 같고, 그 인터페이스의 추상 메서드가 표에 적은 "람다가 구현하는 메서드"와 같은지
  lesson.std(c.api).forEach(sr => {
    const p = all.find(l => l.startsWith('# fact param ' + sr[0] + ' |'));
    if (!p || !p.endsWith('= true')) bad.push('매개변수 사실 없음/다름: ' + sr[0]);
    const iface = /실제=(\w+)/.exec(p || '')[1];
    if (abs[iface] && abs[iface] !== sr[2]) bad.push(sr[0] + ': ' + iface + '의 추상 메서드는 ' + abs[iface] + ', 표에는 ' + sr[2]);
    if (iface !== 'T' && iface !== 'Comparator' && !sim.row[1].includes(iface + '<String')) bad.push(sr[0] + ': 결과 표의 인터페이스 칸(' + sim.row[1] + ')에 ' + iface + '가 없음');
  });
  if (bad.length) console.log('다름: ' + key + '\n  ' + bad.join('\n  ')); else ok++;
}
const facts = all.filter(l => l.startsWith('# fact param') || l.startsWith('# fact src')), fbad = facts.filter(l => !l.endsWith('= true'));
fbad.forEach(l => console.log('사실 다름: ' + l));
console.log('조합 일치 ' + ok + ' / ' + n + ', 표준 사실 ' + (facts.length - fbad.length) + ' / ' + facts.length);
process.exit(ok === n && !fbad.length ? 0 : 1);

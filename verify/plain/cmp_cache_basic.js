// [옛 실습용] 2026-10-22에 실습을 @Cacheable 중심으로 다시 짜서 이 도구는 더 맞지 않는다. 지금의 대조는 verify/spring/cmp_cache_basic.js.
// 기초개념 "캐시" 실습의 모형 결과를 실제 컴파일과 실행 결과(CacheBasicProbe.out.txt)와 대조한다
// 대조: 결과 표 세 열(느린 조회 횟수, 두 번째로 받은 값, 원본의 값), 마지막 단계가 보이는 출력 글,
//       화면의 코드(code 함수)가 Probe가 컴파일한 소스(verify/out/cache_basic/<조합>/Main.java)와 같은 글인지,
//       단계 문장이 기대는 사실(FACT 줄: 처음 find(1) 한 번 뒤의 느린 조회 횟수는 1이고 받은 값은 키보드)
const fs = require('fs'), path = require('path');
const { load, combos } = require('../model_rows.js');
const lesson = load('cache_basic');
const lines = fs.readFileSync(path.join(__dirname, 'CacheBasicProbe.out.txt'), 'utf8').split(/\r?\n/).filter(Boolean);
console.log(lines[0]);
let ok = 0, total = 0;
for (const ln of lines.slice(1)) {
  if (ln.startsWith('FACT ')) continue;
  total++;
  const [k, v] = ln.split(' => '), [use, chg] = k.split('|'), f = v.split('|');
  const c = { use: use === 'true', chg };
  const sim = lesson.simulate(Object.assign({}, c)), probs = [];
  const real = f[0] === 'OK' ? f[1].split(' / ') : null;
  if (!real) probs.push('컴파일 실패 ' + f[1]);
  else {
    const want = [real[0] + '번', real[1], real[2]];
    if (JSON.stringify(sim.row) !== JSON.stringify(want)) probs.push('표 모형 ' + sim.row.join(' | ') + '\n   실제 ' + want.join(' | '));
    const last = sim.events[sim.events.length - 1].snap.out;
    if (last !== f[1]) probs.push('마지막 단계의 출력 모형 "' + last + '" 실제 "' + f[1] + '"');
  }
  const srcFile = path.join(__dirname, '..', 'out', 'cache_basic', [use, chg].join('-'), 'Main.java');
  const src = fs.readFileSync(srcFile, 'utf8').replace(/\r\n/g, '\n').trimEnd();
  if (src !== lesson.code(c)) probs.push('화면의 코드와 Probe가 컴파일한 소스가 다름');
  if (!probs.length) ok++; else console.log('다름: ' + k + '\n   ' + probs.join('\n   '));
}
// 모형의 모든 조합(고쳐 쓴 뒤 겹치는 것을 합친 것)이 Probe 출력에 있는지
const seen = new Set(combos(lesson).map(c => JSON.stringify(lesson.fixc(c))));
if (seen.size !== total) console.log('다름: 모형의 조합 ' + seen.size + '개, Probe 출력 ' + total + '개');
// 캐시가 없으면 cache.remove(1)을 쓸 수 없어 설정을 고쳐 쓰는 조합도 같은 코드가 되는지
{
  total++;
  const a = lesson.code({ use: false, chg: 'both' }), b = lesson.code({ use: false, chg: 'source' });
  if (a === b && !/cache/.test(a)) ok++; else console.log('다름: 캐시 없음 + both 가 캐시 없음 + source와 같은 코드가 아니거나 cache가 남아 있음');
}
// 단계 문장이 기대는 사실
for (const use of ['true', 'false']) {
  total++;
  const fact = lines.find(l => l.startsWith('FACT first ' + use + ' => '));
  if (fact && fact.split(' => ')[1].startsWith('OK|first 키보드 / 1 ##')) ok++;
  else console.log('다름: FACT first ' + use + ' ' + fact);
}
console.log('일치 ' + ok + ' / ' + total);  // 조합 5개 + 고쳐 쓰는 조합 1개 + 사실 2개

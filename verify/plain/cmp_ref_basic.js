// 기초개념 "참조" 실습의 모형 결과를 실제 javac 컴파일과 실행 결과(RefBasicProbe.out.txt)와 대조한다
// 대조: 결과 표 세 열(두 출력 줄, 만들어진 Card 객체 수), 컴파일 성공,
//       단계 문장이 기대는 사실(Card b = ...; 줄 직후의 객체 수, a == b, b.owner, 두 owner가 같은지),
//       그리고 화면의 코드(code 함수)가 Probe가 컴파일한 소스(verify/out/ref_basic/<조합>/Main.java)에서
//       줄 끝이 // PROBE인 세는 줄을 뺀 글과 같은지
const fs = require('fs'), path = require('path');
const { load } = require('../model_rows.js');
const lesson = load('ref_basic');
const lines = fs.readFileSync(path.join(__dirname, 'RefBasicProbe.out.txt'), 'utf8').split(/\r?\n/).filter(Boolean);
console.log(lines[0]);
let ok = 0, n = 0;
for (const ln of lines.slice(1)) {
  if (ln.startsWith('#')) { console.log(ln); continue; }
  n++;
  const [how, v] = ln.split(' => '), f = v.split('|');
  const [res, o1, o2, end, aMade, aEq, aOwner, aSame] = f;
  const sim = lesson.simulate({ how }), probs = [];
  if (res !== 'OK') probs.push('컴파일 실패');
  const real = [o1, o2, how === 'prim' ? '없음 (기본 타입)' : end + '개'];
  if (JSON.stringify(sim.row) !== JSON.stringify(real)) probs.push('표 모형 ' + sim.row.join(' | ') + '\n   실제 ' + real.join(' | '));
  const m = sim.after, r = how === 'prim' ? { eq: aEq === 'true' } : { made: +aMade, eq: aEq === 'true', owner: aOwner, ownerSame: aSame === 'true' };
  if (JSON.stringify(m) !== JSON.stringify(r)) probs.push('직후 상태 모형 ' + JSON.stringify(m) + ' 실제 ' + JSON.stringify(r));
  const srcFile = path.join(__dirname, '..', 'out', 'ref_basic', how, 'Main.java');
  const src = fs.readFileSync(srcFile, 'utf8').replace(/\r\n/g, '\n').split('\n').filter(l => !/\/\/ PROBE$/.test(l)).join('\n').trimEnd();
  if (src !== lesson.code({ how })) probs.push('화면의 코드와 Probe가 컴파일한 소스(세는 줄 제외)가 다름');
  if (!probs.length) ok++; else console.log('다름: ' + how + '\n   ' + probs.join('\n   '));
}
console.log('일치 ' + ok + ' / ' + n);

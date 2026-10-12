// 기초개념 "애너테이션" 실습의 모형 결과를 실제 javac 컴파일과 실행 결과(AnnotBasicProbe.out.txt)와 대조한다
// 대조: 결과 표 세 열(출력, 불린 메서드, 실행 중에 읽힌 표시), 모든 조합이 컴파일되는 것,
//       Job.class에 표시가 적힌 형태(visible/invisible/none), 그리고 화면의 코드(code 함수)가
//       Probe가 컴파일한 소스(verify/out/annot_basic/<조합>/Main.java)와 같은 글인지
const fs = require('fs'), path = require('path');
const { load } = require('../model_rows.js');
const lesson = load('annot_basic');
const lines = fs.readFileSync(path.join(__dirname, 'AnnotBasicProbe.out.txt'), 'utf8').split(/\r?\n/).filter(Boolean);
console.log(lines[0]);
let ok = 0;
for (const ln of lines.slice(1)) {
  const [k, v] = ln.split(' => '), [mark, reader, keep] = k.split('|'), f = v.split('|');
  const [res, nerr, mainClass, out, present, attr] = f;
  const c = { mark, reader: reader === 'true', keep: keep === 'true' };
  const sim = lesson.simulate(Object.assign({}, c)), row = sim.row;
  // 불린 메서드는 실제 출력("work 실행" 같은 줄)에서 읽는다
  const calledReal = out === '' ? [] : out.split(' / ').map(x => x.replace(/ 실행$/, ''));
  const real = [out === '' ? '(아무것도 출력되지 않음)' : out, calledReal.length ? calledReal.join(', ') : '없음', present];
  const probs = [];
  if (JSON.stringify(row) !== JSON.stringify(real)) probs.push('표 모형 ' + row.join(' | ') + '\n   실제 ' + real.join(' | '));
  if (res !== 'OK' || nerr !== '0' || mainClass !== 'true') probs.push('컴파일이 성공하지 않음: ' + ln);
  // 단계 문장이 기대는 사실: 표시가 붙었으면 RUNTIME일 때 visible, 아니면 invisible, 안 붙였으면 none
  const expectAttr = mark === 'none' ? 'none' : c.keep ? 'visible' : 'invisible';
  if (attr !== expectAttr) probs.push('class 파일의 표시 형태 모형 ' + expectAttr + ' 실제 ' + attr);
  const srcFile = path.join(__dirname, '..', 'out', 'annot_basic', [mark, reader, keep].join('-'), 'Main.java');
  const src = fs.readFileSync(srcFile, 'utf8').replace(/\r\n/g, '\n').trimEnd();
  if (src !== lesson.code(c)) probs.push('화면의 코드와 Probe가 컴파일한 소스가 다름');
  if (!probs.length) ok++; else console.log('다름: ' + k + '\n   ' + probs.join('\n   '));
}
console.log('일치 ' + ok + ' / ' + (lines.length - 1));

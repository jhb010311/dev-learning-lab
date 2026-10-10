// "애너테이션" 실습의 모형 결과를 실제 컴파일·실행 결과(AnnotProbe.out.txt)와 대조한다.
// 결과 표의 네 칸, 오류가 난 줄과 메시지, class 파일에서 애너테이션이 적힌 칸의 이름을 조합마다 비교하고, 화면의 코드가 실제로 컴파일한 코드와 같은지도 비교한다.
// 화면에서 숨겨지는 설정까지 곱한 192가지 설정 모두를 돌려, 서로 다른 조합 28가지(@Timed 쪽 24, @Override 쪽 4)마다 실제 결과와 같은지 본다.
const fs = require('fs'), path = require('path');
const { load, combos } = require('../model_rows.js');
const lesson = load('annot');
const text = fs.readFileSync(path.join(__dirname, 'AnnotProbe.out.txt'), 'utf8').split(/\r?\n/);
const real = {}, src = {};
for (const ln of text) {
  if (ln.startsWith('# src ')) { const i = ln.indexOf(' :: '); src[ln.slice(6, i)] = ln.slice(i + 4).split('\\n').join('\n'); }
  else if (ln.includes(' => ')) { const i = ln.indexOf(' => '); real[ln.slice(0, i)] = ln.slice(i + 4).split('|'); }
}
const good = {}, codeGood = {}; let settings = 0;
for (const c of combos(lesson)) {
  const ov = c.topic === 'override', key = ov ? 'override|' + c.typo + '|' + c.ov : 'custom|' + c.ret + '|' + c.target + '|' + c.reader, r = real[key]; settings++;
  if (good[key] === undefined) { good[key] = true; codeGood[key] = true; }
  if (!r) { console.log('실제 결과 없음: ' + key); good[key] = false; continue; }
  const [comp, errLine, msg, inClass, seen, out, exit] = r, sim = lesson.simulate(Object.assign({}, c));
  let want, wantLine = '', wantMsg = '', wantAttr = '';
  if (comp !== 'OK') { want = ['오류', '(컴파일 안 됨)', '(컴파일 안 됨)', '(실행 못 함)']; wantLine = errLine; wantMsg = msg; }
  else if (ov && !c.ov) want = ['성공', inClass === 'none' && seen === 'false' ? '(붙이지 않음)' : '?', '(붙이지 않음)', out];
  else {
    want = ['성공', inClass === 'none' ? '남지 않음' : '남음', seen === 'true' ? '보임' : '보이지 않음', out];
    wantAttr = ov ? '' : inClass === 'visible' ? 'RuntimeVisibleAnnotations' : inClass === 'invisible' ? 'RuntimeInvisibleAnnotations' : '';
  }
  const same = JSON.stringify(sim.row) === JSON.stringify(want) && sim.errLine === wantLine && sim.msg === wantMsg && sim.attr === wantAttr && (comp !== 'OK' || exit === '0');
  if (!same) { good[key] = false; console.log('다름: ' + JSON.stringify(c) + '\n  모형 ' + sim.row.join(' | ') + ' [' + sim.errLine + '] [' + sim.msg + '] [' + sim.attr + ']\n  실제 ' + want.join(' | ') + ' [' + wantLine + '] [' + wantMsg + '] [' + wantAttr + ']'); }
  if (lesson.code(c) !== src[key]) { codeGood[key] = false; console.log('코드 다름: ' + JSON.stringify(c)); }
}
const keys = Object.keys(good), x = real['extra|type-on-class'];
console.log('@Target(TYPE)인 애너테이션을 클래스에 붙이면 컴파일되는가: ' + (x && x[0] === 'OK' ? '예 (글과 같음)' : '아니오 (글과 다름)'));
console.log('돌려 본 설정 ' + settings + '가지 (숨겨진 설정 포함), 서로 다른 조합 ' + keys.length + '가지');
console.log('코드 일치 ' + keys.filter(k => codeGood[k]).length + ' / ' + keys.length);
console.log('일치 ' + keys.filter(k => good[k]).length + ' / ' + keys.length);

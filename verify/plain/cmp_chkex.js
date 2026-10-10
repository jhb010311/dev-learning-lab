// "체크 예외와 언체크 예외" 실습의 모형 결과를 실제 컴파일·실행 결과(ChkExProbe.out.txt)와 대조한다.
// 결과 표의 네 칸과 컴파일러 메시지를 조합마다 비교하고, 화면의 코드가 실제로 컴파일한 소스와 같은지도 비교한다.
const fs = require('fs'), path = require('path');
const { load, combos } = require('../model_rows.js');
const lesson = load('chkex');
const text = fs.readFileSync(path.join(__dirname, 'ChkExProbe.out.txt'), 'utf8').split(/\r?\n/);
const real = {}, src = {};
for (const ln of text) {
  if (ln.startsWith('# src ')) { const i = ln.indexOf(' :: '); src[ln.slice(6, i)] = ln.slice(i + 4).split('\\n').join('\n'); }
  else if (ln.includes(' => ')) { const i = ln.indexOf(' => '); real[ln.slice(0, i)] = ln.slice(i + 4).split('|'); }
}
const short = s => s.replace(/java\.(io|lang)\.(?=[A-Z]\w*;)/g, '');   // API가 주는 메시지의 java.io.IOException을 명령줄 javac처럼 IOException으로
let ok = 0, codeOk = 0, n = 0;
for (const c of combos(lesson)) {
  const key = c.ex + '|' + c.how + '|' + c.occur, r = real[key]; n++;
  if (!r) { console.log('실제 결과 없음: ' + key); continue; }
  const [comp, line, msg, out, exit, err] = r, sim = lesson.simulate(Object.assign({}, c));
  const want = comp === 'OK'
    ? ['성공', '없음', out === '-' ? '(없음)' : out, exit === '0' ? '정상 종료 (종료 코드 0)' : '예외로 중단 (종료 코드 ' + exit + '): ' + err.replace('Exception in thread "main" ', '')]
    : ['오류', line, '(실행 못 함)', '(실행 못 함)'];
  const wantMsg = comp === 'OK' ? '' : short(msg);
  if (JSON.stringify(sim.row) === JSON.stringify(want) && sim.msg === wantMsg) ok++;
  else console.log('다름: ' + key + '\n  모형 ' + sim.row.join(' / ') + ' [' + sim.msg + ']\n  실제 ' + want.join(' / ') + ' [' + wantMsg + ']');
  if (lesson.code(c) === src[key]) codeOk++; else console.log('코드 다름: ' + key);
}
// 설정에는 없지만 글에서 말한 사실
const e1 = real['extra|error-none'], e2 = real['extra|exception-none'];
console.log('Error를 처리 없이 던져도 컴파일되는가: ' + (e1 && e1[0] === 'OK' ? '예 (글과 같음)' : '아니오 (글과 다름)'));
console.log('Exception 자체는 체크 예외로 취급되는가: ' + (e2 && e2[0] === 'ERROR' ? '예 (글과 같음)' : '아니오 (글과 다름)'));
console.log('코드 일치 ' + codeOk + ' / ' + n);
console.log('일치 ' + ok + ' / ' + n);

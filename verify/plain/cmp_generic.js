// "제네릭" 실습의 모형 결과를 실제 컴파일·실행 결과(GenericProbe.out.txt)와 대조한다.
// 결과 표의 네 칸, 오류·경고 메시지, 예외가 난 줄을 조합마다 비교하고, 화면의 코드가 실제로 컴파일한 코드와 같은지도 비교한다.
const fs = require('fs'), path = require('path');
const { load, combos } = require('../model_rows.js');
const lesson = load('generic');
const text = fs.readFileSync(path.join(__dirname, 'GenericProbe.out.txt'), 'utf8').split(/\r?\n/);
const real = {}, src = {};
for (const ln of text) {
  if (ln.startsWith('# src ')) { const i = ln.indexOf(' :: '); src[ln.slice(6, i)] = ln.slice(i + 4).split('\\n').join('\n'); }
  else if (ln.includes(' => ')) { const i = ln.indexOf(' => '); real[ln.slice(0, i)] = ln.slice(i + 4).split('|'); }
}
// API가 주는 메시지를 명령줄 javac가 보여 주는 모양으로: java.lang.Integer → Integer, capture#1 of ? extends java.lang.Number → CAP#1
const short = s => s.replace(/capture#1 of \? (extends|super) [\w.]+/g, 'CAP#1').replace(/java\.(lang|util)\./g, '');
const list = s => s === '-' ? [] : s.split(' ## ');
let ok = 0, codeOk = 0, n = 0;
for (const c of combos(lesson)) {
  const key = c.decl + '|' + c.op, r = real[key]; n++;
  if (!r) { console.log('실제 결과 없음: ' + key); continue; }
  const [comp, errLines, errMsgs, warnLines, warnMsgs, out, exit, err, at] = r, sim = lesson.simulate(Object.assign({}, c));
  let want, wantMsgs = [], wantWarn = '', wantAt = '';
  if (comp === 'OK') {
    wantWarn = list(warnMsgs).map(short).join(' ## ');
    let end = '정상 종료';
    if (exit !== '0') {
      const m = /java\.lang\.ClassCastException: class java\.lang\.(\w+) cannot be cast to class java\.lang\.(\w+) /.exec(err);
      end = m ? '예외로 중단: ClassCastException (' + m[1] + '을 ' + m[2] + '로 바꿀 수 없음)' : '예외로 중단: ' + err;
      wantAt = at;
    }
    want = [wantWarn ? '성공 (경고 있음)' : '성공', '없음', out === '-' ? '(없음)' : out, end];
  } else {
    wantMsgs = list(errMsgs).map(short);
    want = ['오류', list(errLines).join(' / '), '(실행 못 함)', '(실행 못 함)'];
  }
  const same = JSON.stringify(sim.row) === JSON.stringify(want) && JSON.stringify(sim.msgs) === JSON.stringify(wantMsgs) && sim.warn === wantWarn && sim.crashLine === wantAt
    && (comp !== 'OK' || wantWarn === '' || list(warnLines).join() === lesson.opLine(c));
  if (same) ok++;
  else console.log('다름: ' + key + '\n  모형 ' + sim.row.join(' | ') + ' [' + sim.msgs.join(' ## ') + '] [' + sim.warn + '] [' + sim.crashLine + ']\n  실제 ' + want.join(' | ') + ' [' + wantMsgs.join(' ## ') + '] [' + wantWarn + '] [' + wantAt + ']');
  if (lesson.code(c) === src[key]) codeOk++; else console.log('코드 다름: ' + key);
}
console.log('코드 일치 ' + codeOk + ' / ' + n);
console.log('일치 ' + ok + ' / ' + n);

// 기초개념 "null" 실습의 모형 결과를 실제 javac 컴파일과 java 실행 결과(NullBasicProbe.out.txt)와 대조한다
// 대조: 결과 표 다섯 열(실제 출력과 표준 오류에서 가려냄), 예외가 난 줄, 종료 코드, 화면의 코드(code 함수)가 Probe가 컴파일한 소스
// (verify/out/null_basic/<조합>/Main.java)와 같은 글인지, 단계 문장이 기대는 사실(FACT 줄)
const fs = require('fs'), path = require('path');
const { load, combos } = require('../model_rows.js');
const lesson = load('null_basic');
const lines = fs.readFileSync(path.join(__dirname, 'NullBasicProbe.out.txt'), 'utf8').split(/\r?\n/).filter(Boolean);
console.log(lines[0]);
const fact = {};
for (const ln of lines) if (ln.startsWith('FACT ')) { const [k, v] = ln.slice(5).split(' => '); fact[k] = v; }
let ok = 0, total = 0;
for (const ln of lines.slice(1)) {
  if (ln.startsWith('FACT ') || ln.startsWith('#')) continue;
  total++;
  const [k, v] = ln.split(' => '), [value, check] = k.split('|'), f = v.split('|');
  const [res, exit, out, errFirst] = f, where = f.slice(4).join('|');
  const c = { value, check: check === 'true' };
  const sim = lesson.simulate(Object.assign({}, c)), row = sim.row;
  const probs = [];
  if (res !== 'OK') probs.push('컴파일 실패');
  // 실제 출력에서 표의 열을 가려낸다
  const f0 = fact['value ' + value] || '';
  const named = f0.includes('isNull=true') ? 'null' : f0.includes('length=0') ? 'empty' : f0.includes('length=3') ? 'kim' : '?';
  const npe = /^Exception in thread "main" java\.lang\.NullPointerException/.test(errFirst);
  const real = [
    lesson.pointTxt[named],
    !c.check ? '쓰지 않음' : out === '이름 없음' ? 'null임 (false)' : 'null이 아님 (true)',
    /^\d+$/.test(out) ? '1번' : '0번',
    out === '(없음)' ? '(출력 없음)' : out,
    npe ? 'NullPointerException' : '없음',
  ];
  if (JSON.stringify(row) !== JSON.stringify(real)) probs.push('표 모형 ' + row.join(' | ') + '\n   실제 ' + real.join(' | '));
  if (named !== value) probs.push('FACT로 가려낸 값 ' + named + '과 조합의 값 ' + value + '이 다름');
  // 예외가 난 줄, 종료 코드
  const realAt = npe ? where : '';
  if (sim.excAt !== realAt) probs.push('예외가 난 줄 모형 [' + sim.excAt + '] 실제 [' + realAt + ']');
  if (npe && !/Cannot invoke "String\.length\(\)"/.test(errFirst)) probs.push('예외가 length() 호출에서 난 것이 아님: ' + errFirst);
  if ((exit === '1') !== npe) probs.push('종료 코드와 예외가 맞지 않음: ' + exit);
  if (!npe && errFirst !== '-') probs.push('예외가 없는데 표준 오류가 있음: ' + errFirst);
  const srcFile = path.join(__dirname, '..', 'out', 'null_basic', value + '-' + check, 'Main.java');
  const src = fs.readFileSync(srcFile, 'utf8').replace(/\r\n/g, '\n').trimEnd();
  if (src !== lesson.code(c)) probs.push('화면의 코드와 Probe가 컴파일한 소스가 다름');
  if (!probs.length) ok++; else console.log('다름: ' + k + '\n   ' + probs.join('\n   '));
}
const mc = combos(lesson).length;
if (mc !== total) console.log('다름: 모형의 조합 ' + mc + '개, Probe 출력 ' + total + '개');
// 단계 문장이 기대는 사실
const want = { 'value kim': 'isNull=false length=3', 'value null': 'isNull=true length=-', 'value empty': 'isNull=false length=0',
  'assign': '출력 대입 끝 | 종료 1 | 예외가 난 줄 System.out.println(name.length());' };
for (const k of Object.keys(want)) { total++; if (fact[k] === want[k]) ok++; else console.log('다름: FACT ' + k + ' => ' + fact[k]); }
console.log('일치 ' + ok + ' / ' + total);  // 조합 6개 + 사실 4개

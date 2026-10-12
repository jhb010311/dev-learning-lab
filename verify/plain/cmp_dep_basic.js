// 기초개념 "라이브러리와 의존성" 실습의 모형 결과를 실제 javac와 java 실행 결과(DepBasicProbe.out.txt)와 대조한다
// 대조: 결과 표 세 열, 오류 개수와 오류 코드 목록, 오류가 난 줄, App.class 생성 여부, java 명령의 종료 코드와 출력과 오류 위치,
//       화면의 코드(code 함수)가 Probe가 실제 파일과 실제 명령으로 만든 글(verify/out/dep_basic/<조합>/screen.txt)과 같은 글인지,
//       단계 문장이 기대는 사실(FACT 줄)과 컴파일 전 폴더의 파일 목록
const fs = require('fs'), path = require('path');
const { load, combos } = require('../model_rows.js');
const lesson = load('dep_basic');
const lines = fs.readFileSync(path.join(__dirname, 'DepBasicProbe.out.txt'), 'utf8').split(/\r?\n/).filter(Boolean);
console.log(lines[0]);
const KO = { 'compiler.err.doesnt.exist': lesson.msgs.pkg, 'compiler.err.cant.resolve.location': lesson.msgs.sym };
let ok = 0, total = 0;
for (const ln of lines.slice(1)) {
  if (ln.startsWith('FACT ')) continue;
  total++;
  const [k, v] = ln.split(' => '), [ccp, rcp] = k.split('|'), f = v.split('|');
  const [res, code, n, exists, where, jexit, jout, jerr, msg, codes, before, line2] = f;
  const c = { compileCp: ccp === 'true', runCp: rcp === 'true' };
  const sim = lesson.simulate(Object.assign({}, c)), row = sim.row, probs = [];
  const names = codes === '' ? [] : codes.split(',');
  let real;
  if (res === 'OK') {
    real = ['성공', jexit === '0' ? (jout === 'hello, kim' ? 'hello, kim 출력' : '(모르는 출력 ' + jout + ')') : (jout === '-' ? '실패: 아무것도 출력되지 않음' : '(실패했는데 출력 ' + jout + ')'), jexit === '0' ? '없음' : (/java\.lang\.NoClassDefFoundError: lib\/Greeter$/.test(jerr) ? lesson.msgs.ncdfe : '(모르는 오류 ' + jerr + ')')];
    if (jexit !== '0' && line2 !== 'at App.main(App.java:6)') probs.push('오류 위치가 App.java:6이 아님: ' + line2);
  } else {
    real = ['오류 ' + n + '개', jexit !== '0' && exists === 'false' && /ClassNotFoundException: App$/.test(line2) ? '실행할 수 없음(App.class가 없음)' : '(java가 다르게 실패 ' + jerr + ' / ' + line2 + ')', names.map(x => KO[x] || '(모르는 코드 ' + x + ')').join(', ')];
    if (!/does not exist/.test(msg)) probs.push('첫 javac 메시지가 package lib does not exist가 아님: ' + msg);
    if (JSON.stringify(names) !== JSON.stringify(['compiler.err.doesnt.exist', 'compiler.err.cant.resolve.location'])) probs.push('오류 코드 목록 ' + codes);
    const at = where.split(' ## ');
    if (JSON.stringify(at) !== JSON.stringify(['import lib.Greeter;', 'System.out.println(Greeter.hello("kim"));'])) probs.push('오류가 난 줄 ' + where);
  }
  if (JSON.stringify(row) !== JSON.stringify(real)) probs.push('표 모형 ' + row.join(' | ') + '\n   실제 ' + real.join(' | '));
  if ((exists === 'true') !== (res === 'OK')) probs.push('App.class 생성 여부가 컴파일 결과와 다름: ' + exists);
  if (before !== 'App.java / greet.jar') probs.push('컴파일 전 폴더의 파일: ' + before);
  const screen = fs.readFileSync(path.join(__dirname, '..', 'out', 'dep_basic', ccp + '-' + rcp, 'screen.txt'), 'utf8').replace(/\r\n/g, '\n').trimEnd();
  if (screen !== lesson.code(c)) probs.push('화면의 코드와 Probe가 만든 글이 다름');
  if (!probs.length) ok++; else console.log('다름: ' + k + '\n   ' + probs.join('\n   '));
}
const mc = combos(lesson).length;
if (mc !== total) console.log('다름: 모형의 조합 ' + mc + '개, Probe 출력 ' + total + '개');
// 단계 문장이 기대는 사실
function fact(name, want) {
  const l = lines.find(x => x.startsWith('FACT ' + name + ' => ')); total++;
  const got = l ? l.slice(('FACT ' + name + ' => ').length) : null;
  if (got === want) ok++; else console.log('다름: FACT ' + name + ' 실제 ' + got + ' / 기대 ' + want);
}
fact('jar', 'META-INF/ / META-INF/MANIFEST.MF / lib/ / lib/Greeter.class');   // greet.jar 안에 lib/Greeter.class가 있다
fact('classes', 'App.class');                                                    // 컴파일에 성공한 폴더의 클래스 파일은 App.class 하나뿐
fact('nodot', '1|오류: 기본 클래스 App을(를) 찾거나 로드할 수 없습니다.');           // -cp greet.jar만 주고 .을 빼면 App을 찾지 못한다
console.log('일치 ' + ok + ' / ' + total);  // 조합 4개 + 사실 3개

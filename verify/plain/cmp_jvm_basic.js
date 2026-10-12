// 기초개념 "컴파일과 JVM" 실습의 모형 결과를 실제 javac, java 실행 결과(JvmBasicProbe.out.txt)와 대조한다
// 대조: 결과 표 네 열, 폴더의 파일(Hello.class가 있는가), javac의 종료 코드·표준 출력·오류 첫 줄과 오류가 난 줄, 고치는 일이 Hello.class를 바꾸지 않았는가,
//       Hello.class 맨 앞 네 바이트와 버전, 실행한 명령의 차례, 화면의 코드(code 함수)가 Probe가 만든 화면의 글(screen.txt)과 같은 글인지,
//       마지막 Hello.java가 화면의 소스 구역과 같은 글인지, 단계 문장이 기대는 사실(FACT 줄)
const fs = require('fs'), path = require('path');
const { load, combos } = require('../model_rows.js');
const lesson = load('jvm_basic');
const lines = fs.readFileSync(path.join(__dirname, 'JvmBasicProbe.out.txt'), 'utf8').split(/\r?\n/).filter(Boolean);
console.log(lines[0]);
let ok = 0, total = 0;
for (const ln of lines.slice(1)) {
  if (ln.startsWith('FACT ')) continue;
  total++;
  const [k, v] = ln.split(' => '), [compile, src] = k.split('|'), f = v.split('|');
  const [jcExit, jcErr1, jcLast, jcOut, clsAfterJc, magic, major, clsSame, jExit, jOut, jErr1, jErr2, files, ran] = f;
  const c = { compile: compile === 'true', src: src === 'nosemi' ? 'nosemi' : src };
  const dir = path.join(__dirname, '..', 'out', 'jvm_basic', k.replace('|', '-'));
  const probs = [];
  const sim = lesson.simulate(Object.assign({}, c)), row = sim.row;
  // 실제 결과 (Probe가 잰 값에서)
  const hasCls = files.split(',').includes('Hello.class');
  const javaOk = jExit === '0' && jOut !== '';
  let result;
  if (javaOk) result = jOut + ' 출력';
  else if (jExit === '1' && /^Error: Could not find or load main class Hello$/.test(jErr1) && /^Caused by: java\.lang\.ClassNotFoundException: Hello$/.test(jErr2)) result = 'Hello 클래스를 찾을 수 없다는 오류';
  else result = '(모르는 결과 ' + jExit + ' ' + jErr1 + ')';
  const screen = fs.readFileSync(path.join(dir, 'screen.txt'), 'utf8').replace(/\r\n/g, '\n');
  const m = /System\.out\.println\("(.*)"\)/.exec(screen), srcTxt = m ? m[1] : '?';
  const same = !javaOk ? '출력 없음' : jOut === srcTxt ? '같음' : '다름: 출력 ' + jOut + ', 소스 ' + srcTxt;
  const stop = jcExit !== '-' && jcExit !== '0' ? 'javac Hello.java (컴파일)' : jExit !== '0' ? 'java Hello (실행)' : '멈추지 않음';
  const real = [hasCls ? '만들어짐' : '없음', result, same, stop];
  if (JSON.stringify(row) !== JSON.stringify(real)) probs.push('표 모형 ' + row.join(' | ') + '\n   실제 ' + real.join(' | '));
  // 화면의 코드와 Probe가 만든 화면의 글
  if (screen !== lesson.code(c)) probs.push('화면의 코드와 Probe가 만든 화면의 글이 다름');
  // 마지막 Hello.java가 화면의 소스 구역과 같은 글인지
  const shown = screen.split('\n\n# 터미널\n')[0].slice('# Hello.java\n'.length) + '\n';
  const javaFile = fs.readFileSync(path.join(dir, 'Hello.java'), 'utf8').replace(/\r\n/g, '\n');
  if (javaFile !== shown) probs.push('마지막 Hello.java가 화면의 소스와 다름');
  // 실행한 명령의 차례
  const expectRan = [].concat(c.compile ? ['javac'] : [], c.src === 'edited' ? ['edit'] : [], ['java']).join(',');
  if (ran !== expectRan) probs.push('실행한 명령 ' + ran + ', 모형 ' + expectRan);
  // 단계 문장이 기대는 사실
  if (c.compile) {
    if (jcOut !== '(비어 있음)') probs.push('javac가 표준 출력에 글을 냄: ' + jcOut);
    if (clsAfterJc !== String(c.src !== 'nosemi')) probs.push('javac 뒤 Hello.class 여부 ' + clsAfterJc);
    if (c.src === 'nosemi') {
      if (jcExit !== '1' || jcErr1 !== "Hello.java:4: error: ';' expected" || jcLast !== '1 error') probs.push('javac 오류가 단계 문장과 다름: ' + jcExit + ' ' + jcErr1 + ' ' + jcLast);
      if (!/System\.out\.println/.test(javaFile.split('\n')[3])) probs.push('4번째 줄이 println 줄이 아님');
      if (files !== 'Hello.java') probs.push('오류 뒤 폴더의 파일 ' + files);
    } else {
      if (jcExit !== '0' || jcErr1 !== '-') probs.push('javac가 성공하지 않음');
      if (files !== 'Hello.class,Hello.java') probs.push('성공 뒤 폴더의 파일 ' + files);
      if (magic !== 'CAFEBABE' || major !== '65') probs.push('Hello.class 맨 앞 ' + magic + ' 버전 ' + major);
    }
  } else if (files !== 'Hello.java') probs.push('javac를 쓰지 않았는데 폴더의 파일이 ' + files);
  if (c.src === 'edited' && c.compile && clsSame !== 'true') probs.push('고치는 일이 Hello.class를 바꿈');
  if (!javaOk && jExit !== '1') probs.push('java 종료 코드 ' + jExit);
  if (!probs.length) ok++; else console.log('다름: ' + k + '\n   ' + probs.join('\n   '));
}
const mc = combos(lesson).length;
if (mc !== total) console.log('다름: 모형의 조합 ' + mc + '개, Probe 출력 ' + total + '개');
// 단계 문장과 assume이 기대는 사실
const fact = n => { const l = lines.find(x => x.startsWith('FACT ' + n + ' => ')); return l ? l.slice(('FACT ' + n + ' => ').length) : ''; };
const facts = [
  ['recompile', '고친 뒤 다시 컴파일하기 전 출력=안녕|javac 종료 코드=0|class가 달라졌는가=true|다시 컴파일한 뒤 출력=잘 가'],
  ['sourcemode', 'java 종료 코드=0|출력=안녕|Hello.class가 만들어졌는가=false'],
  ['sourcemode-err', "java 종료 코드=1|오류 첫 줄=Hello.java:4: error: ';' expected"],
  ['oldclass', 'javac 종료 코드=1|옛 class가 남아 있는가=true|그대로인가=true|java Hello 출력=안녕'],
];
for (const [n, want] of facts) { total++; if (fact(n) === want) ok++; else console.log('다름: FACT ' + n + '\n   실제 ' + fact(n) + '\n   기대 ' + want); }
console.log('일치 ' + ok + ' / ' + total);  // 조합 6개 + 사실 4개

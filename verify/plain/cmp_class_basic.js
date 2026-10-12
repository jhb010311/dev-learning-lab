// 기초개념 "클래스와 객체" 실습의 모형 결과를 실제 javac 컴파일과 실행 결과(ClassBasicProbe.out.txt)와 대조한다
// 대조: 결과 표 네 열, 오류의 개수, 오류가 난 줄, 컴파일 실패일 때 Main.class가 없는 것,
//       단계 문장이 기대는 사실(새 객체의 owner는 null),
//       그리고 화면의 코드(code 함수)가 Probe가 컴파일한 소스(verify/out/class_basic/<조합>/Main.java)와 같은 글인지
//       (Probe 소스에만 있는 "// PROBE" 줄 하나는 객체를 세려고 더한 것이므로 빼고 견준다)
const fs = require('fs'), path = require('path');
const { load } = require('../model_rows.js');
const lesson = load('class_basic');
const lines = fs.readFileSync(path.join(__dirname, 'ClassBasicProbe.out.txt'), 'utf8').split(/\r?\n/).filter(Boolean);
console.log(lines[0]);
// 실제 javac의 진단 코드 -> 화면에 적는 한국어 (이 표에 없는 코드가 나오면 모형이 모르는 오류이므로 다름으로 센다)
const KO = {
  'compiler.err.cant.resolve.location': 'Card라는 클래스를 찾을 수 없음',
  'compiler.err.var.might.not.have.been.initialized': '값을 담지 않은 변수 a를 썼음',
};
// 영어 메시지 첫 줄도 함께 확인해, 코드와 메시지가 같은 오류를 가리키는지 본다
const MSG = {
  'compiler.err.cant.resolve.location': /^cannot find symbol$/,
  'compiler.err.var.might.not.have.been.initialized': /^variable a might not have been initialized$/,
};
const EXC_KO = { 'java.lang.NullPointerException': 'NullPointerException으로 멈춤' };
let ok = 0, n = 0;
for (const ln of lines.slice(1)) {
  if (ln.startsWith('FACT ')) {
    n++;
    const [k, v] = ln.slice(5).split(' => ');
    if (k === 'owner_default' && v === 'null의 카드') ok++; else console.log('다름: 사실 ' + k + ' = ' + v);
    continue;
  }
  n++;
  const [k, v] = ln.split(' => '), [decl, make, two] = k.split('|'), f = v.split('|');
  const [res, code, nerr, mainClass, ran, exc, excMsg, out, made, msg] = f, where = f.slice(10).join('|');
  const c = { decl: decl === 'true', make, two: two === 'true' };
  const sim = lesson.simulate(Object.assign({}, c)), row = sim.row;
  const probs = [];
  let real;
  if (res === 'OK') {
    let run;
    if (exc !== '-') run = out === '(없음)' && EXC_KO[exc] ? EXC_KO[exc] : '(모르는 예외 또는 출력이 있는 채 멈춤 ' + exc + ' / ' + out + ')';
    else run = out;
    real = ['성공', '없음', run, made + '개'];
  } else {
    real = ['오류', KO[code] || '(모르는 오류 ' + code + ')', '실행할 수 없음', '0개'];
    if (ran !== 'false' || made !== '-') probs.push('컴파일 실패인데 실행됨');
  }
  if (JSON.stringify(row) !== JSON.stringify(real)) probs.push('표 모형 ' + row.join(' | ') + '\n   실제 ' + real.join(' | '));
  if (res !== 'OK' && !(MSG[code] || /$^/).test(msg)) probs.push('오류 메시지가 코드와 맞지 않음: ' + code + ' / ' + msg);
  if (sim.nerr !== +nerr) probs.push('오류 개수 모형 ' + sim.nerr + ' 실제 ' + nerr);
  const realAt = res === 'OK' ? [] : where.split(' ## ');
  if (JSON.stringify(sim.errAt) !== JSON.stringify(realAt)) probs.push('오류가 난 줄 모형 ' + JSON.stringify(sim.errAt) + ' 실제 ' + JSON.stringify(realAt));
  if ((mainClass === 'true') !== (res === 'OK')) probs.push('Main.class 생성 여부가 컴파일 결과와 다름: ' + mainClass);
  if (res === 'OK' && exc !== '-' && !/^Cannot assign field "owner" because ".*" is null$/.test(excMsg)) probs.push('예외 메시지가 a.owner에 값을 담다가 난 것이 아님: ' + excMsg);
  const srcFile = path.join(__dirname, '..', 'out', 'class_basic', [decl, make, two].join('-'), 'Main.java');
  const full = fs.readFileSync(srcFile, 'utf8').replace(/\r\n/g, '\n').trimEnd().split('\n');
  const probeLines = full.filter(l => l.endsWith('// PROBE'));
  if (probeLines.length !== (c.decl ? 1 : 0)) probs.push('세는 줄이 ' + probeLines.length + '개');
  const src = full.filter(l => !l.endsWith('// PROBE')).join('\n');
  if (src !== lesson.code(c)) probs.push('화면의 코드와 Probe가 컴파일한 소스가 다름');
  if (!probs.length) ok++; else console.log('다름: ' + k + '\n   ' + probs.join('\n   '));
}
console.log('일치 ' + ok + ' / ' + n);

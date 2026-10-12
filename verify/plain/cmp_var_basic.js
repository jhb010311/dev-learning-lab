// 기초개념 "변수와 타입" 실습의 모형 결과를 실제 javac 컴파일과 실행 결과(VarBasicProbe.out.txt)와 대조한다
// 대조: 결과 표 세 열, 오류의 개수, 오류가 난 줄, 컴파일 실패일 때 Main.class가 없는 것,
//       그리고 화면의 코드(code 함수)가 Probe가 컴파일한 소스(verify/out/var_basic/<조합>/Main.java)와 같은 글인지
const fs = require('fs'), path = require('path');
const { load } = require('../model_rows.js');
const lesson = load('var_basic');
const lines = fs.readFileSync(path.join(__dirname, 'VarBasicProbe.out.txt'), 'utf8').split(/\r?\n/).filter(Boolean);
console.log(lines[0]);
// 실제 javac의 진단 코드 -> 화면에 적는 한국어 (이 표에 없는 코드가 나오면 모형이 모르는 오류이므로 다름으로 센다)
const KO = {
  'compiler.err.cant.resolve': '선언하지 않은 이름 age',
  'compiler.err.cant.resolve.location': '선언하지 않은 이름 age',
  'compiler.err.prob.found.req': 'int 변수에 글자를 담을 수 없음',
  'compiler.err.var.might.not.have.been.initialized': '값을 담지 않은 변수를 읽음',
};
// 영어 메시지 첫 줄도 함께 확인해, 코드와 메시지가 같은 오류를 가리키는지 본다
const MSG = {
  'compiler.err.cant.resolve': /^cannot find symbol$/,
  'compiler.err.cant.resolve.location': /^cannot find symbol$/,
  'compiler.err.prob.found.req': /^incompatible types: (java\.lang\.)?String cannot be converted to int$/,
  'compiler.err.var.might.not.have.been.initialized': /^variable age might not have been initialized$/,
};
let ok = 0;
for (const ln of lines.slice(1)) {
  const [k, v] = ln.split(' => '), [type, value] = k.split('|'), f = v.split('|');
  const [res, code, n, mainClass, ran, out, msg, codes] = f, where = f.slice(8).join('|');
  const c = { type: type === 'true', value };
  const sim = lesson.simulate(Object.assign({}, c)), row = sim.row;
  const real = res === 'OK'
    ? ['성공', '없음', ran === 'true' ? out : '(실행 안 됨)']
    : ['오류', KO[code] || '(모르는 오류 ' + code + ')', '실행할 수 없음'];
  const probs = [];
  if (JSON.stringify(row) !== JSON.stringify(real)) probs.push('표 모형 ' + row.join(' | ') + '\n   실제 ' + real.join(' | '));
  if (res !== 'OK' && !(MSG[code] || /$^/).test(msg)) probs.push('오류 메시지가 코드와 맞지 않음: ' + code + ' / ' + msg);
  // 오류가 여럿이면 모두 같은 종류(첫 오류와 같은 코드)여야 화면의 설명이 맞다
  if (res !== 'OK' && codes.split(',').some(x => x !== code)) probs.push('첫 오류와 다른 종류의 오류가 섞여 있음: ' + codes);
  if (sim.nerr !== +n) probs.push('오류 개수 모형 ' + sim.nerr + ' 실제 ' + n);
  const realAt = res === 'OK' ? [] : where.split(' ## ');
  if (JSON.stringify(sim.errAt) !== JSON.stringify(realAt)) probs.push('오류가 난 줄 모형 ' + JSON.stringify(sim.errAt) + ' 실제 ' + JSON.stringify(realAt));
  if ((mainClass === 'true') !== (res === 'OK')) probs.push('Main.class 생성 여부가 컴파일 결과와 다름: ' + mainClass);
  const srcFile = path.join(__dirname, '..', 'out', 'var_basic', [type, value].join('-'), 'Main.java');
  const src = fs.readFileSync(srcFile, 'utf8').replace(/\r\n/g, '\n').trimEnd();
  if (src !== lesson.code(c)) probs.push('화면의 코드와 Probe가 컴파일한 소스가 다름');
  if (!probs.length) ok++; else console.log('다름: ' + k + '\n   ' + probs.join('\n   '));
}
console.log('일치 ' + ok + ' / ' + (lines.length - 1));

// 기초개념 "생성자" 실습의 모형 결과를 실제 javac 컴파일과 실행 결과(CtorBasicProbe.out.txt)와 대조한다
// 대조: 결과 표 네 열, 오류의 개수, 오류가 난 줄, 컴파일 실패일 때 Main.class가 없는 것,
//       화면의 코드(code 함수)가 Probe가 컴파일한 소스(verify/out/ctor_basic/<조합>/Main.java)와 같은 글인지,
//       그리고 단계 문장이 기대는 사실(@ 줄)
const fs = require('fs'), path = require('path');
const { load } = require('../model_rows.js');
const lesson = load('ctor_basic');
const lines = fs.readFileSync(path.join(__dirname, 'CtorBasicProbe.out.txt'), 'utf8').split(/\r?\n/).filter(Boolean);
console.log(lines[0]);
let ok = 0, total = 0;
// 오류: 진단 코드와 영어 메시지(필요한 인자, 넘긴 인자)를 화면에 적는 한국어로 옮긴다. 이 표에 없으면 모형이 모르는 오류이므로 다름으로 센다
function koOf(code, msg) {
  if (code !== 'compiler.err.cant.apply.symbol') return '(모르는 오류 ' + code + ')';
  if (/^constructor Card in class Card cannot be applied to given types; ##\s+required: no arguments ##\s+found:\s+java\.lang\.String ##/.test(msg)) return lesson.errGiven;
  if (/^constructor Card in class Card cannot be applied to given types; ##\s+required: java\.lang\.String ##\s+found:\s+no arguments ##/.test(msg)) return lesson.errNeed;
  return '(모르는 메시지 ' + msg + ')';
}
for (const ln of lines.slice(1)) {
  if (ln.startsWith('@')) continue;
  const [k, v] = ln.split(' => '), [ctor, arg, two] = k.split('|'), f = v.split('|');
  const [res, code, n, mainClass, ran, out, runs, msg] = f, where = f.slice(8).join('|');
  const c = { ctor: ctor === 'true', arg, two: two === 'true' };
  const sim = lesson.simulate(Object.assign({}, c)), row = sim.row;
  const real = res === 'OK'
    ? ['성공', '없음', ran === 'true' ? out.split(' ## ').join(' / ') : '(실행 안 됨)', runs + '번']
    : ['오류', koOf(code, msg), '실행할 수 없음', '실행할 수 없음'];
  const probs = [];
  if (JSON.stringify(row) !== JSON.stringify(real)) probs.push('표 모형 ' + row.join(' | ') + '\n   실제 ' + real.join(' | '));
  if (sim.nerr !== +n) probs.push('오류 개수 모형 ' + sim.nerr + ' 실제 ' + n);
  const realAt = res === 'OK' ? [] : where.split(' ## ');
  if (JSON.stringify(sim.errAt) !== JSON.stringify(realAt)) probs.push('오류가 난 줄 모형 ' + JSON.stringify(sim.errAt) + ' 실제 ' + JSON.stringify(realAt));
  if ((mainClass === 'true') !== (res === 'OK')) probs.push('Main.class 생성 여부가 컴파일 결과와 다름: ' + mainClass);
  const srcFile = path.join(__dirname, '..', 'out', 'ctor_basic', [ctor, arg, two].join('-'), 'Main.java');
  const src = fs.readFileSync(srcFile, 'utf8').replace(/\r\n/g, '\n').trimEnd();
  if (src !== lesson.code(c)) probs.push('화면의 코드와 Probe가 컴파일한 소스가 다름');
  total++;
  if (!probs.length) ok++; else console.log('다름: ' + k + '\n   ' + probs.join('\n   '));
}
console.log('일치 ' + ok + ' / ' + total);

// 단계 문장이 기대는 사실
const facts = {};
for (const ln of lines) if (ln.startsWith('@')) { const [a, b] = ln.slice(1).split(' => '); facts[a] = b; }
const want = {
  '기본 생성자(생성자를 적지 않은 Card)': '개수 1|매개변수 0|접근 |',
  '값을 받는 생성자를 적은 Card': '개수 1|매개변수 1|',
  '생성자 실행 순서': 'new 전 ## 시작할 때 this.owner=null, 매개변수 owner=김철수 ## 끝날 때 this.owner=김철수 ## new 후 a.owner=김철수|',
};
let fok = 0, ftotal = 0;
for (const [k, w] of Object.entries(want)) { ftotal++; if (facts[k] === w) fok++; else console.log('사실이 다름: ' + k + '\n   기대 ' + w + '\n   실제 ' + facts[k]); }
for (const call of ['a.Card("이영희");', 'Card("이영희");']) {
  ftotal++;
  const r = facts['이름으로 부르기 ' + call];
  if (r && r.startsWith('ERR|compiler.err.cant.resolve.location.args|cannot find symbol')) fok++; else console.log('사실이 다름: 이름으로 부르기 ' + call + ' -> ' + r);
}
console.log('사실 일치 ' + fok + ' / ' + ftotal);

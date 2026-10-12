// 기초개념 "상속" 실습의 모형 결과를 실제 javac 컴파일과 실행 결과(InheritBasicProbe.out.txt)와 대조한다
// 대조: 결과 표 네 열(실행된 eat은 실제 출력의 첫 줄에서 읽는다), 오류의 개수, 오류가 난 줄, 컴파일 실패일 때 Main.class가 없는 것,
//       단계 문장이 기대는 사실(FACT 줄),
//       그리고 화면의 코드(code 함수)가 Probe가 컴파일한 소스(verify/out/inherit_basic/<조합>/Main.java)와 같은 글인지
const fs = require('fs'), path = require('path');
const { load } = require('../model_rows.js');
const lesson = load('inherit_basic');
const lines = fs.readFileSync(path.join(__dirname, 'InheritBasicProbe.out.txt'), 'utf8').split(/\r?\n/).filter(Boolean);
console.log(lines[0]);
// 실제 javac의 진단 코드 -> 화면에 적는 한국어 (이 표에 없는 코드가 나오면 모형이 모르는 오류이므로 다름으로 센다)
const KO = {
  'compiler.err.cant.resolve.location.args': 'Dog에는 eat 메서드가 없음',
  'compiler.err.prob.found.req': 'Dog는 Animal 타입이 아니어서 담을 수 없음',
};
// 영어 메시지 첫 줄도 함께 확인해, 코드와 메시지가 같은 오류를 가리키는지 본다
const MSG = {
  'compiler.err.cant.resolve.location.args': /^cannot find symbol$/,
  'compiler.err.prob.found.req': /^incompatible types: Dog cannot be converted to Animal$/,
};
// 실제 출력의 첫 줄 -> 어느 클래스에 적힌 eat이 실행됐는가 (Animal의 eat은 "먹는다", Dog의 eat은 "개가 먹는다"를 출력한다)
const WHICH = { '먹는다': 'Animal에 적힌 eat', '개가 먹는다': 'Dog에 적힌 eat' };
let ok = 0, n = 0;
for (const ln of lines.slice(1)) {
  n++;
  if (ln.startsWith('FACT ')) {
    const [k, v] = ln.slice(5).split(' => '), f = v.split('|');
    const [res, code, nerr, mainClass, ran, out, msg, where] = f;
    let good = false;
    if (k === 'animal_var_bark') good = res === 'ERR' && code === 'compiler.err.cant.resolve.location.args' && nerr === '1' && msg === 'cannot find symbol' && where === 'd.bark();';
    else if (k === 'animal_object_eat') good = res === 'OK' && out === '먹는다';
    else if (k === 'dog_bark_alone') good = res === 'OK' && out === '멍멍';
    if (good) ok++; else console.log('다름: 사실 ' + k + ' = ' + v);
    continue;
  }
  const [k, v] = ln.split(' => '), [ext, over, vr] = k.split('|'), f = v.split('|');
  const [res, code, nerr, mainClass, ran, out, msg] = f, where = f.slice(7).join('|');
  const c = { ext: ext === 'true', over: over === 'true', var: vr };
  const sim = lesson.simulate(Object.assign({}, c)), row = sim.row;
  const real = res === 'OK'
    ? ['성공', '없음', ran === 'true' ? out : '(실행 안 됨)', WHICH[out.split(' / ')[0]] || '(모르는 출력 ' + out + ')']
    : ['오류', KO[code] || '(모르는 오류 ' + code + ')', '실행할 수 없음', '실행할 수 없음'];
  const probs = [];
  if (JSON.stringify(row) !== JSON.stringify(real)) probs.push('표 모형 ' + row.join(' | ') + '\n   실제 ' + real.join(' | '));
  if (res !== 'OK' && !(MSG[code] || /$^/).test(msg)) probs.push('오류 메시지가 코드와 맞지 않음: ' + code + ' / ' + msg);
  if (sim.nerr !== +nerr) probs.push('오류 개수 모형 ' + sim.nerr + ' 실제 ' + nerr);
  const realAt = res === 'OK' ? [] : where.split(' ## ');
  if (JSON.stringify(sim.errAt) !== JSON.stringify(realAt)) probs.push('오류가 난 줄 모형 ' + JSON.stringify(sim.errAt) + ' 실제 ' + JSON.stringify(realAt));
  if ((mainClass === 'true') !== (res === 'OK')) probs.push('Main.class 생성 여부가 컴파일 결과와 다름: ' + mainClass);
  const srcFile = path.join(__dirname, '..', 'out', 'inherit_basic', [ext, over, vr].join('-'), 'Main.java');
  const src = fs.readFileSync(srcFile, 'utf8').replace(/\r\n/g, '\n').trimEnd();
  if (src !== lesson.code(c)) probs.push('화면의 코드와 Probe가 컴파일한 소스가 다름');
  if (!probs.length) ok++; else console.log('다름: ' + k + '\n   ' + probs.join('\n   '));
}
console.log('일치 ' + ok + ' / ' + n);

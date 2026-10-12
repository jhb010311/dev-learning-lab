// 기초개념 "static" 실습의 모형 결과를 실제 javac 컴파일과 실행 결과(StaticBasicProbe.out.txt)와 대조한다
// 대조: 결과 표 네 열(count가 있는 곳은 읽는 줄만 a.count, b.count로 바꾼 소스의 실행값으로), 오류의 개수, 오류가 난 줄,
//       컴파일 실패일 때 Main.class가 없는 것, 단계 문장이 기대는 사실(a.up() 직후의 값, javac 경고),
//       그리고 화면의 코드(code 함수)가 Probe가 컴파일한 소스(verify/out/static_basic/<조합>/Main.java)와 같은 글인지
const fs = require('fs'), path = require('path');
const { load } = require('../model_rows.js');
const lesson = load('static_basic');
const lines = fs.readFileSync(path.join(__dirname, 'StaticBasicProbe.out.txt'), 'utf8').split(/\r?\n/).filter(Boolean);
console.log(lines[0]);
// 실제 javac의 진단 코드 -> 화면에 적는 한국어 (이 표에 없는 코드가 나오면 모형이 모르는 오류이므로 다름으로 센다)
const KO = { 'compiler.err.non-static.cant.be.ref': 'static이 아닌 count를 클래스 이름으로 읽을 수 없음' };
const MSG = { 'compiler.err.non-static.cant.be.ref': /^non-static variable count cannot be referenced from a static context$/ };
const WHERE = { '2 2': '클래스에 하나', '1 1': '객체마다 하나씩' };
const body = lines.slice(1);
const share = {}, mid = {}, lint = {};
body.filter(l => l.startsWith('SHARE ')).forEach(l => { const [k, v] = l.slice(6).split(' => '); share[k] = v; });
body.filter(l => l.startsWith('MID ')).forEach(l => { const [k, v] = l.slice(4).split(' => '); mid[k] = v.split(' / ')[0]; });
body.filter(l => l.startsWith('LINT ')).forEach(l => { const [k, v] = l.slice(5).split(' => '); lint[k] = v; });
let ok = 0, n = 0;
for (const ln of body) {
  if (/^(SHARE|MID|LINT) /.test(ln)) continue;
  n++;
  const [k, v] = ln.split(' => '), [st, read] = k.split('|'), f = v.split('|');
  const [res, code, nerr, mainClass, ran, out, msg] = f, where = f.slice(7).join('|');
  const c = { st: st === 'true', read };
  const sim = lesson.simulate(Object.assign({}, c)), row = sim.row;
  const probs = [];
  const real = res === 'OK'
    ? ['성공', '없음', out, WHERE[share[k]] || '(모르는 값 ' + share[k] + ')']
    : ['오류', KO[code] || '(모르는 오류 ' + code + ')', '실행할 수 없음', WHERE[share[k]] || '(모르는 값 ' + share[k] + ')'];
  if (JSON.stringify(row) !== JSON.stringify(real)) probs.push('표 모형 ' + row.join(' | ') + '\n   실제 ' + real.join(' | '));
  if (res !== 'OK' && !(MSG[code] || /$^/).test(msg)) probs.push('오류 메시지가 코드와 맞지 않음: ' + code + ' / ' + msg);
  if (sim.nerr !== +nerr) probs.push('오류 개수 모형 ' + sim.nerr + ' 실제 ' + nerr);
  const realAt = res === 'OK' ? [] : where.split(' ## ');
  if (JSON.stringify(sim.errAt) !== JSON.stringify(realAt)) probs.push('오류가 난 줄 모형 ' + JSON.stringify(sim.errAt) + ' 실제 ' + JSON.stringify(realAt));
  if ((mainClass === 'true') !== (res === 'OK')) probs.push('Main.class 생성 여부가 컴파일 결과와 다름: ' + mainClass);
  if (res !== 'OK' && ran !== 'false') probs.push('컴파일 실패인데 실행됨');
  // count가 있는 곳: 읽는 줄만 바꾼 소스에서 a.count와 b.count가 같은 값(2 2)인지 따로 값(1 1)인지는 st에만 달려 있어야 한다
  if (share[k] !== (c.st ? '2 2' : '1 1')) probs.push('a.count b.count 실제 ' + share[k] + ' (static ' + c.st + ')');
  // 단계 문장이 기대는 사실: a.up() 직후 static이면 1 1, 아니면 1 0
  if (mid[st] !== (c.st ? '1 1' : '1 0')) probs.push('a.up() 직후 값 ' + mid[st]);
  // javac 경고: 기본 옵션에서는 모든 조합이 0개, -Xlint:all에서는 static + a.count 조합에만 static.not.qualified.by.type 하나
  const L = lint[k] || '';
  const wantLint = c.st && read === 'obj' ? /^기본 0개 \| -Xlint:all 1개 \| compiler\.warn\.static\.not\.qualified\.by\.type: static variable should be qualified by type name, Counter, instead of by an expression @\d+$/ : /^기본 0개 \| -Xlint:all 0개 \| \(없음\)$/;
  if (!wantLint.test(L)) probs.push('javac 경고 실제: ' + L);
  const srcFile = path.join(__dirname, '..', 'out', 'static_basic', [st, read].join('-'), 'Main.java');
  const src = fs.readFileSync(srcFile, 'utf8').replace(/\r\n/g, '\n').trimEnd();
  if (src !== lesson.code(c)) probs.push('화면의 코드와 Probe가 컴파일한 소스가 다름');
  if (!probs.length) ok++; else console.log('다름: ' + k + '\n   ' + probs.join('\n   '));
}
console.log('일치 ' + ok + ' / ' + n);

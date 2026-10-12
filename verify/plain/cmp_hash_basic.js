// 기초개념 "해시" 실습의 모형 결과를 실제 javac 컴파일과 실행 결과(HashBasicProbe.out.txt)와 대조한다
// 대조:
//  1) 여섯 가지 조합: 결과 표 세 열(저장된 값, 입력에서 계산한 값, 로그인)과, 줄이기 전의 전체 값(저장된 값, 입력에서 계산한 값),
//     프로그램이 출력한 ok와 로그인의 일치, 컴파일 성공과 Main.class, 그리고 화면의 코드(code 함수)가
//     Probe가 컴파일한 Main.java의 "// 화면 시작"과 "// 화면 끝" 사이와 같은 글인지(import, sha256 메서드, main의 틀은 화면에서 줄인 부분),
//     비밀번호를 그대로 저장하는 코드에 sha256 호출이 없는지
//  2) 계산이 표준대로인지: 표준 문서의 예시 두 가지를 Probe(자바)가 문서의 값과 같게 계산했는지, Node.js crypto도 같은 값을 내는지
//  3) 세 구현의 값 견주기: Probe가 낸 여덟 입력의 SHA-256 값을 Node.js crypto와 openssl dgst -sha256으로 다시 계산해 같은지
//  4) 단계 문장이 기대는 사실(FACT 줄)과 모형이 가진 상수(실제로 계산한 값 세 개, 다른 자리 수)
const fs = require('fs'), path = require('path'), cp = require('child_process'), crypto = require('crypto');
const { load, combos } = require('../model_rows.js');
const lesson = load('hash_basic');
const lines = fs.readFileSync(path.join(__dirname, 'HashBasicProbe.out.txt'), 'utf8').split(/\r?\n/).filter(Boolean);
console.log(lines[0]);
let ok = 0, total = 0;
function check(name, probs) { total++; if (!probs.length) ok++; else console.log('다름: ' + name + '\n   ' + probs.join('\n   ')); }
const nodeHash = buf => crypto.createHash('sha256').update(buf).digest('hex');
function opensslHash(buf) {
  const out = cp.execFileSync('openssl', ['dgst', '-sha256'], { input: buf, encoding: 'utf8' });
  const m = /=\s*([0-9a-f]{64})\s*$/.exec(out.trim());
  return m ? m[1] : '(읽지 못함) ' + out;
}
// 줄이는 규칙: 앞 12자와 '… (64자)'
const cut = v => v.slice(0, 12) + '… (64자)';
const hexToBuf = h => Buffer.from(h, 'hex');

// 2) 표준 예시
for (const ln of lines.filter(l => l.startsWith('STD '))) {
  const [k, v] = ln.slice(4).split(' => '), [got, want, same] = v.split('|'), probs = [];
  if (got !== want || same !== 'same') probs.push('자바 값 ' + got + ' 문서 값 ' + want + ' ' + same);
  if (nodeHash(hexToBuf(k)) !== want) probs.push('Node.js crypto 값이 문서 값과 다름');
  check('표준 예시 ' + Buffer.from(k, 'hex').toString().slice(0, 12), probs);
}
// 3) 세 구현
const hashOf = {};
for (const ln of lines.filter(l => l.startsWith('HASH '))) {
  const [k, v] = ln.slice(5).split(' => '), key = k.trim(), java = v.trim(), buf = hexToBuf(key), probs = [];
  hashOf[key] = java;
  const nd = nodeHash(buf), os = opensslHash(buf);
  if (java !== nd) probs.push('자바 ' + java + ' / Node.js ' + nd);
  if (java !== os) probs.push('자바 ' + java + ' / openssl ' + os);
  check('세 구현 ' + (buf.length > 12 ? buf.length + '바이트' : JSON.stringify(buf.toString())), probs);
}
// 4) 단계 문장이 기대는 사실과 모형의 상수
const fact = {};
lines.filter(l => l.startsWith('FACT ')).forEach(l => { const [k, v] = l.slice(5).split(' => '); fact[k] = v; });
const p1 = hashOf[Buffer.from('pass1234').toString('hex')], p2 = hashOf[Buffer.from('pass1235').toString('hex')], p3 = hashOf[Buffer.from(p1).toString('hex')];
let nodeDiff = 0; for (let i = 0; i < 64; i++) if (p1[i] !== p2[i]) nodeDiff++;
check('사실: 같은 입력을 두 번 해시하면 같은 값', fact['same-twice'] === 'true' && nodeHash('pass1234') === p1 ? [] : ['같은 입력의 값이 다름: ' + fact['same-twice']]);
check('사실: 한 글자 다른 입력의 해시가 다른 자리 수 (' + lesson.DIFF + ')', fact['typo-diff-positions'] === lesson.DIFF + ' of 64' && nodeDiff === lesson.DIFF ? [] : ['Probe ' + fact['typo-diff-positions'] + ' / Node.js 계산 ' + nodeDiff + ' / 모형 ' + lesson.DIFF]);
check('사실: 입력이 0글자, 1글자, 100글자여도 64자', fact['len-empty'] === '64' && fact['len-1char'] === '64' && fact['len-100chars'] === '64' ? [] : [JSON.stringify(fact)]);
check('사실: 결과가 0-9와 a-f의 64글자', fact['hex-only'] === 'true' ? [] : [fact['hex-only']]);
check('사실: 해시 값을 다시 해시하면 다른 값', fact['hash-of-hash-differs'] === 'true' && p3 !== p1 ? [] : [fact['hash-of-hash-differs']]);
check('모형의 상수 세 개(pass1234, pass1235, pass1234의 해시 값을 다시 해시한 값)가 실제 계산 값과 같음',
  [['H1', p1], ['H2', p2], ['H3', p3]].filter(([n, v]) => lesson[n] !== v).map(([n, v]) => n + ' 모형 ' + lesson[n] + ' 실제 ' + v));

// 1) 여섯 가지 조합
const seen = new Set();
for (const ln of lines.filter(l => /^(hash|plain)\|/.test(l))) {
  const [k, v] = ln.split(' => '), [store, input] = k.split('|'), [res, nerr, mainClass, saved, okOut, inHash] = v.split('|');
  const c = { store, input };
  seen.add(JSON.stringify(c));
  const sim = lesson.simulate(Object.assign({}, c)), row = sim.row, probs = [];
  const login = okOut === 'true' ? '성공' : okOut === 'false' ? '실패' : '(모르는 출력 ' + okOut + ')';
  const real = store === 'hash' ? [cut(saved), cut(inHash), login] : [saved, '계산하지 않음 (입력 그대로 견줌)', login];
  if (res !== 'OK' || nerr !== '0' || mainClass !== 'true') probs.push('컴파일되지 않음: ' + res + ' ' + nerr + ' ' + mainClass);
  if (JSON.stringify(row) !== JSON.stringify(real)) probs.push('표 모형 ' + row.join(' | ') + '\n   실제 ' + real.join(' | '));
  // 줄이기 전의 전체 값
  if (store === 'hash') {
    const typed = { right: 'pass1234', typo: 'pass1235', stolen: saved }[input];
    if (saved !== lesson.H1) probs.push('저장된 값 전체가 모형의 H1과 다름: ' + saved);
    if (inHash !== nodeHash(typed)) probs.push('입력에서 계산한 값 전체가 Node.js 계산과 다름: ' + inHash);
    if (inHash !== { right: lesson.H1, typo: lesson.H2, stolen: lesson.H3 }[input]) probs.push('입력에서 계산한 값 전체가 모형의 상수와 다름');
    if ((saved === inHash) !== (okOut === 'true')) probs.push('저장된 값과 입력에서 계산한 값이 같은지와 프로그램의 ok가 다름');
  } else {
    const typed = { right: 'pass1234', typo: 'pass1235', stolen: saved }[input];
    if ((typed === saved) !== (okOut === 'true')) probs.push('그대로 견준 결과와 프로그램의 ok가 다름');
  }
  // 화면의 코드와 Probe가 컴파일한 소스
  const srcFile = path.join(__dirname, '..', 'out', 'hash_basic', store + '-' + input, 'Main.java');
  const all = fs.readFileSync(srcFile, 'utf8').replace(/\r\n/g, '\n').split('\n');
  const a = all.findIndex(x => x.trim() === '// 화면 시작'), b = all.findIndex(x => x.trim() === '// 화면 끝');
  const screen = all.slice(a + 1, b).map(x => x.replace(/^ {8}/, '')).join('\n').trim();
  if (a < 0 || b < 0) probs.push('Main.java에 화면 구간 표시가 없음');
  else if (screen !== lesson.code(c)) probs.push('화면의 코드와 Probe가 컴파일한 소스가 다름');
  if (store === 'plain' && /sha256\(/.test(screen)) probs.push('그대로 저장하는 코드에 sha256 호출이 있음');
  if (store === 'hash' && !/sha256\(input\)/.test(screen)) probs.push('해시 저장 코드에 sha256(input)이 없음');
  check('조합 ' + k, probs);
}
// 모형의 모든 설정 조합이 Probe에서 실행됐는지
for (const c of combos(lesson)) if (!seen.has(JSON.stringify(c))) check('Probe에 없는 조합 ' + JSON.stringify(c), ['없음']);
console.log('일치 ' + ok + ' / ' + total);  // 조합 6개 + 표준 예시 2개 + 세 구현 8개 + 사실·상수 6개

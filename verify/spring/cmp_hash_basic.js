// 기초개념 "해시" 실습(표준 중심 판)의 모형 결과를 실제 JDK·스프링 시큐리티 실행 결과(hash_basic_probe.out.txt)와 대조한다
// 실행: node verify/spring/cmp_hash_basic.js  (먼저 verify/spring/src/HashBasicProbe.java를 libs 클래스 경로로 컴파일·실행해 out.txt를 만든다)
// 대조:
//  1) 열 가지 조합: 컴파일 성공과 Main.class, 화면의 코드(code 함수)가 Probe가 컴파일한 Main.java의 "// 화면 시작"~"// 화면 끝"과 같은 글인지
//     (화면 맨 위의 생략을 밝히는 주석 한 줄은 Probe 소스에 없으므로 빼고 견줌), 프로그램이 출력한 ok와 결과 표의 로그인,
//     결과 표의 값: SHA-256과 그대로 저장은 실행 값 그대로, BCrypt는 실행할 때마다 값이 다르므로
//       실행에서 나온 saved의 모양($2a$10$ + 53자), 실행에서 hashpw로 계산한 값과 saved의 관계(같음/앞 29자만 같음)가 모형의 B1과 계산 값의 관계와 같은지,
//       hashpw 결과와 matches 결과가 같은지(agree)
//  2) 모형이 예시로 보이는 BCrypt 값(B1, B2)이 Probe가 실제로 encode해 얻은 값(EX)과 같고, matches가 true이며, BT·BS가 실제 hashpw 값과 같은지
//  3) SHA-256: 표준 예시 두 가지, 일곱 입력을 Node.js crypto와 openssl dgst -sha256으로 다시 계산해 같은지, 모형의 상수 H1~H3과 DIFF
//  4) 단계 문장이 기대는 사실(FACT 줄)과 javap(matches → BCrypt.checkpw)
const fs = require('fs'), path = require('path'), cp = require('child_process'), crypto = require('crypto');
// 이 실습 파일 하나만 읽는다(다른 실습 파일을 읽지 않음)
const root = path.join(__dirname, '..', '..'), ldir = path.join(root, 'src', 'lessons');
const file = fs.readdirSync(ldir).find(f => /^\d+_hash_basic\.js$/.test(f));
const L = []; new Function('Lab', fs.readFileSync(path.join(ldir, file), 'utf8'))({ register: o => L.push(o), fmt: String });
const lesson = L[0];
const lines = fs.readFileSync(path.join(__dirname, 'hash_basic_probe.out.txt'), 'utf8').split(/\r?\n/).filter(l => l && !/^\d\d:\d\d:\d\d/.test(l));
console.log(lines[0]);
let ok = 0, total = 0;
function check(name, probs) { total++; if (!probs.length) ok++; else console.log('다름: ' + name + '\n   ' + probs.join('\n   ')); }
const nodeHash = buf => crypto.createHash('sha256').update(buf).digest('hex');
function opensslHash(buf) {
  const out = cp.execFileSync('openssl', ['dgst', '-sha256'], { input: buf, encoding: 'utf8' });
  const m = /=\s*([0-9a-f]{64})\s*$/.exec(out.trim());
  return m ? m[1] : '(읽지 못함) ' + out;
}
const hexToBuf = h => Buffer.from(h, 'hex');
const BC = /^\$2a\$10\$[./A-Za-z0-9]{53}$/;
const kv = pre => { const o = {}; lines.filter(l => l.startsWith(pre + ' ')).forEach(l => { const i = l.indexOf(' => '); o[l.slice(pre.length + 1, i)] = l.slice(i + 4); }); return o; };

// 3) SHA-256
for (const ln of lines.filter(l => l.startsWith('STD '))) {
  const [k, v] = ln.slice(4).split(' => '), [got, want, same] = v.split('|'), probs = [];
  if (got !== want || same !== 'same') probs.push('자바 값 ' + got + ' 문서 값 ' + want + ' ' + same);
  if (nodeHash(hexToBuf(k)) !== want) probs.push('Node.js crypto 값이 문서 값과 다름');
  check('SHA-256 표준 예시 ' + Buffer.from(k, 'hex').toString().slice(0, 12), probs);
}
const hashOf = {};
for (const ln of lines.filter(l => l.startsWith('HASH '))) {
  const [k, v] = ln.slice(5).split(' => '), key = k.trim(), java = v.trim(), buf = hexToBuf(key), probs = [];
  hashOf[key] = java;
  const nd = nodeHash(buf), os = opensslHash(buf);
  if (java !== nd) probs.push('자바 ' + java + ' / Node.js ' + nd);
  if (java !== os) probs.push('자바 ' + java + ' / openssl ' + os);
  check('SHA-256 세 구현 ' + (buf.length > 12 ? buf.length + '바이트' : JSON.stringify(buf.toString())), probs);
}
const p1 = hashOf[Buffer.from('pass1234').toString('hex')], p2 = hashOf[Buffer.from('pass1235').toString('hex')], p3 = hashOf[Buffer.from(p1).toString('hex')];
check('모형의 SHA-256 상수 H1~H3이 실제 계산 값과 같음', [['H1', p1], ['H2', p2], ['H3', p3]].filter(([n, v]) => lesson[n] !== v).map(([n, v]) => n + ' 모형 ' + lesson[n] + ' 실제 ' + v));

// 2) BCrypt 예시 값
const ex = kv('EX'), probsEx = [];
if (lesson.B1 !== ex.ex1) probsEx.push('B1 모형 ' + lesson.B1 + ' / 실제 encode 값 ' + ex.ex1);
if (lesson.B2 !== ex.ex2) probsEx.push('B2 모형 ' + lesson.B2 + ' / 실제 encode 값 ' + ex.ex2);
if (ex['ex1-format'] !== 'true|60' || ex['ex2-format'] !== 'true|60' || !BC.test(lesson.B1) || !BC.test(lesson.B2)) probsEx.push('모양 ' + ex['ex1-format'] + ' ' + ex['ex2-format']);
if (ex['matches-pass1234-ex1'] !== 'true' || ex['matches-pass1234-ex2'] !== 'true') probsEx.push('matches("pass1234", 예시 값)가 true가 아님');
if (ex['matches-pass1235-ex1'] !== 'false' || ex['matches-ex1-ex1'] !== 'false') probsEx.push('pass1235나 저장된 값 자체의 matches가 false가 아님');
if (ex['hashpw-pass1234-ex1'] !== lesson.B1) probsEx.push('hashpw(pass1234, B1)이 B1과 다름');
if (ex['hashpw-pass1235-ex1'] !== lesson.BT) probsEx.push('BT 모형 ' + lesson.BT + ' / 실제 ' + ex['hashpw-pass1235-ex1']);
if (ex['hashpw-ex1-ex1'] !== lesson.BS) probsEx.push('BS 모형 ' + lesson.BS + ' / 실제 ' + ex['hashpw-ex1-ex1']);
if (ex['ex1-equals-ex2'] !== 'false') probsEx.push('두 예시 값이 같음');
check('모형의 BCrypt 예시 값(B1, B2)과 matches 안에서 계산한 값(BT, BS)', probsEx);

// 4) 사실
const fact = kv('FACT');
check('사실: SHA-256은 같은 입력을 두 번 계산하면 같은 값', fact['sha-same-twice'] === 'true' ? [] : [fact['sha-same-twice']]);
check('사실: pass1234와 pass1235의 SHA-256이 다른 자리 수 = 모형 DIFF(' + lesson.DIFF + ')', fact['sha-typo-diff-positions'] === lesson.DIFF + ' of 64' ? [] : [fact['sha-typo-diff-positions']]);
check('사실: SHA-256은 0글자·1글자·100글자 입력 모두 64자, 0-9a-f, 바이트 32개', fact['sha-len-empty-1-100'] === '64,64,64' && fact['sha-hex-only'] === 'true' && fact['sha-digest-bytes'] === '32' ? [] : [JSON.stringify(fact)]);
check('사실: 같은 비밀번호를 20번 encode하면 값과 솔트가 모두 다르고 모두 matches가 true, 모양 $2a$10$', fact['bcrypt-encode-20-distinct'] === '20|salts 20|all-matches true|all-format true' ? [] : [fact['bcrypt-encode-20-distinct']]);
check('사실: 다시 encode한 값은 equals로 견주면 false', fact['bcrypt-reencode-equals'] === 'false' ? [] : [fact['bcrypt-reencode-equals']]);
check('사실: matches 쪽 계산(hashpw)은 저장된 값의 앞 29자(표시, cost, 솔트)를 그대로 씀', fact['bcrypt-salt-kept-by-hashpw'] === 'true' ? [] : [fact['bcrypt-salt-kept-by-hashpw']]);
check('사실: createDelegatingPasswordEncoder의 값은 {bcrypt}$2a$10$로 시작', /\|true$/.test(fact['delegating-prefix'] || '') ? [] : [fact['delegating-prefix']]);
const tm = /^([\d.]+)\|sha256 ([\d.]+)$/.exec(fact['time-ms bcrypt-matches'] || '');
check('사실: matches 한 번은 수십 ms, SHA-256 한 번은 0.1ms 미만(이 실행)', tm && +tm[1] >= 10 && +tm[1] < 1000 && +tm[2] < 0.1 ? [] : [fact['time-ms bcrypt-matches']]);
const jp = fs.readFileSync(path.join(__dirname, 'hash_basic_probe.javap.txt'), 'utf8');
check('javap: BCryptPasswordEncoder의 matches가 BCrypt.checkpw를, encode가 BCrypt.gensalt와 hashpw를 부름', /matchesNonNull[\s\S]*BCrypt\.checkpw/.test(jp) && /BCrypt\.hashpw/.test(jp) && /BCrypt\.gensalt/.test(jp) && /equalsNoEarlyReturn/.test(jp) ? [] : ['javap 기록에 없음']);

// 1) 조합
const seen = new Set();
for (const ln of lines.filter(l => /^(bcrypt|sha|plain)\|/.test(l))) {
  const [k, v] = ln.split(' => '), [store, input] = k.split('|'), [res, mainClass, saved, okOut, calc, agree] = v.split('|');
  const c = { store, input };
  seen.add(store + '|' + input);
  const sim = lesson.simulate(Object.assign({}, c)), row = sim.row, probs = [];
  const login = okOut === 'true' ? '성공' : okOut === 'false' ? '실패' : '(모르는 출력 ' + okOut + ')';
  if (res !== 'OK' || mainClass !== 'true') probs.push('컴파일되지 않음: ' + res + ' ' + mainClass);
  if (row[2] !== login) probs.push('로그인 모형 ' + row[2] + ' / 실행 ' + login);
  if (store === 'sha') {
    const real = [lesson.cut(saved), lesson.cut(calc), login];
    if (JSON.stringify(row) !== JSON.stringify(real)) probs.push('표 모형 ' + row.join(' | ') + '\n   실제 ' + real.join(' | '));
    if (saved !== lesson.H1) probs.push('저장된 값이 H1과 다름');
  } else if (store === 'plain') {
    const real = [saved, lesson.NOCALC, login];
    if (JSON.stringify(row) !== JSON.stringify(real)) probs.push('표 모형 ' + row.join(' | ') + '\n   실제 ' + real.join(' | '));
  } else {
    if (!BC.test(saved)) probs.push('실행에서 나온 saved의 모양이 다름: ' + saved);
    if (row[0] !== lesson.cutB(lesson.B1)) probs.push('표의 저장된 값이 B1을 줄인 것이 아님');
    const model = { right: lesson.B1, typo: lesson.BT, stolen: lesson.BS, eq: lesson.B2 }[input];
    if (row[1] !== lesson.cutB(model)) probs.push('표의 계산한 값이 모형 값을 줄인 것이 아님');
    // 관계: 같음 / 앞 29자만 같음 / 앞 7자만 같음(솔트가 다름)
    const rel = (a, b) => a === b ? 'same' : a.slice(0, 29) === b.slice(0, 29) ? 'salt' : a.slice(0, 7) === b.slice(0, 7) ? 'head' : 'other';
    if (input !== 'eq') {
      if (agree !== 'true') probs.push('hashpw 값과 matches 결과가 어긋남');
      if (rel(calc, saved) !== rel(model, lesson.B1)) probs.push('실행의 관계 ' + rel(calc, saved) + ' / 모형의 관계 ' + rel(model, lesson.B1));
    } else if (rel(lesson.B2, lesson.B1) !== 'head') probs.push('B2와 B1의 관계가 솔트부터 다름이 아님');
    if ((model === lesson.B1) !== (okOut === 'true')) probs.push('모형의 같음/다름과 실행의 ok가 다름');
  }
  // 화면의 코드와 Probe가 컴파일한 소스
  const srcFile = path.join(root, 'verify', 'out', 'hash_basic_std', store + '-' + input, 'Main.java');
  const all = fs.readFileSync(srcFile, 'utf8').replace(/\r\n/g, '\n').split('\n');
  const a = all.findIndex(x => x.trim() === '// 화면 시작'), b = all.findIndex(x => x.trim() === '// 화면 끝');
  const screen = all.slice(a + 1, b).map(x => x.replace(/^ {8}/, '')).join('\n').trim();
  if (a < 0 || b < 0) probs.push('Main.java에 화면 구간 표시가 없음');
  else if (screen !== lesson.code(c).replace(/^\/\/ [^\n]*생략[^\n]*\n/, '')) probs.push('화면의 코드와 Probe가 컴파일한 소스가 다름');
  check('조합 ' + k, probs);
}
// 모형의 모든 설정 조합(fix를 거친 것)이 Probe에서 실행됐는지
const vals = lesson.controls.map(d => d.options.map(o => o[0]));
for (const s of vals[0]) for (const i of vals[1]) {
  const c = { store: s, input: i }, f = lesson.fix(c); if (f) Object.assign(c, f);
  if (!seen.has(c.store + '|' + c.input)) check('Probe에 없는 조합 ' + JSON.stringify(c), ['없음']);
}
console.log('일치 ' + ok + ' / ' + total);

// 기초개념 "암호화" 실습(표준 Cipher 중심 판)의 모형 결과를 실제 자바 실행 결과(CryptoBasicProbe.v2.out.txt)와 대조한다.
// 사용:
//   node verify/plain/cmp_crypto_basic.js --bodies   화면의 코드(code 함수, 머리 주석 한 줄만 뺀 것)를 조합마다 verify/out/crypto_basic_v2/<조합>/body.txt로 쓴다
//   (그다음 CryptoBasicProbe.java 머리 주석의 명령으로 Probe를 돌려 CryptoBasicProbe.v2.out.txt를 만든다)
//   node verify/plain/cmp_crypto_basic.js            대조
// 대조: 결과 표 세 열, 던져진 예외의 이름과 메시지, 출력 줄(깨진 글자 / 원래 글자 / 바뀐 글자), 지금 화면의 코드가 Probe가 컴파일한 본문과 같은지,
//       실제 무작위 값으로 다시 돌린 결과의 종류가 같은지, 단계 문장이 기대는 사실(FACT 줄),
//       계산이 표준대로인지(Node.js의 aes-256-gcm과 바이트까지 같은지, NIST 시험 벡터).
// (옛 판의 대조 도구는 git 기록에 있다. 옛 결과 CryptoBasicProbe.out.txt는 옛 판의 것이다.)
const fs = require('fs'), path = require('path'), cp = require('child_process');
const { load, combos } = require('../model_rows.js');
const lesson = load('crypto_basic');
const OUT = path.join(__dirname, '..', 'out', 'crypto_basic_v2');
const key = c => c.enc + '-' + c.mid + '-' + c.reader;
const body = c => lesson.code(c).replace(/^\/\/ main 메서드 안의 줄만 보임[^\n]*\n/, '');

if (process.argv.includes('--bodies')) {
  for (const c of combos(lesson)) { const d = path.join(OUT, key(c)); fs.mkdirSync(d, { recursive: true }); fs.writeFileSync(path.join(d, 'body.txt'), body(c), 'utf8'); }
  console.log('본문 ' + combos(lesson).length + '개를 ' + OUT + '에 씀');
  process.exit(0);
}

const lines = fs.readFileSync(path.join(__dirname, 'CryptoBasicProbe.v2.out.txt'), 'utf8').split(/\r?\n/).filter(Boolean);
console.log(lines[0]);
const PT = lesson.pt;
let ok = 0, total = 0;
function check(name, probs) { total++; if (!probs.length) ok++; else console.log('다름: ' + name + '\n   ' + probs.join('\n   ')); }
const get = prefix => lines.find(l => l.startsWith(prefix));
const rest = (l, p) => l.slice(p.length);
const fact = name => { const l = get('FACT ' + name + ' => '); return l ? rest(l, 'FACT ' + name + ' => ') : undefined; };
const sentBytes = +((fact('bytes') || '').match(/sentBytes=(\d+)/) || [])[1];
const midReal = fact('midString') ? fact('midString').split('|')[0] : '';

// 1. 여덟 가지 조합
const cs = combos(lesson);
const comboLines = lines.filter(l => /^(on|off)\|(keep|tamper)\|(same|other) => /.test(l));
if (cs.length !== comboLines.length) console.log('다름: 모형의 조합 ' + cs.length + '개, Probe 출력 ' + comboLines.length + '개');
for (const c of cs) {
  const name = c.enc + '|' + c.mid + '|' + c.reader, ln = get(name + ' => '), probs = [];
  if (!ln) { check(name, ['Probe 출력 없음']); continue; }
  const [st, l1, l2, exc, msg, nl] = rest(ln, name + ' => ').split('|');
  const sim = lesson.simulate(Object.assign({}, c)), row = sim.row;
  // 지금 화면의 코드가 Probe가 컴파일한 본문과 같은가
  const bodyFile = path.join(OUT, key(c), 'body.txt');
  if (!fs.existsSync(bodyFile) || fs.readFileSync(bodyFile, 'utf8') !== body(c)) probs.push('화면의 코드가 Probe가 컴파일한 본문과 다름 (--bodies로 다시 쓰고 Probe를 다시 돌릴 것)');
  // 실제 결과를 표의 말로
  const kind = s => s === PT ? 'pt' : s === lesson.changed ? 'changed' : s === midReal && s.includes('�') && !s.includes('1234') && !s.includes('카드') ? 'garbled' : '?(' + s + ')';
  const outReal = [l1, l2].slice(0, +nl.replace('lines=', '')).map(kind);
  const midCol = outReal[0] === 'garbled' ? '깨진 글자 (' + sentBytes + '바이트)' : outReal[0] === 'pt' ? PT : '?';
  const readCol = st === 'EX' ? '예외 ' + exc.split('.').pop() : l2;
  const gotCol = st === 'EX' ? '아니요 (예외로 알림)' : l2 === PT ? '예' : '아니요 (바뀐 줄 모름)';
  const real = [midCol, readCol, gotCol];
  if (JSON.stringify(row) !== JSON.stringify(real)) probs.push('표 모형 ' + row.join(' | ') + '\n   실제 ' + real.join(' | '));
  if (sim.exc !== (st === 'EX' ? exc : '')) probs.push('예외 모형 "' + sim.exc + '" 실제 "' + (st === 'EX' ? exc : '') + '"');
  if (st === 'EX' && msg !== 'Tag mismatch') probs.push('예상과 다른 예외 메시지: ' + msg);
  if (JSON.stringify(outReal) !== JSON.stringify(sim.out)) probs.push('출력 모형 ' + JSON.stringify(sim.out) + ' 실제 ' + JSON.stringify(outReal));
  // 단계 문장의 예외 메시지
  if (st === 'EX' && !sim.events.some(e => e.s.includes(exc) && e.s.includes(msg))) probs.push('단계 문장에 예외 이름과 메시지가 없음');
  // 실제 무작위 값으로 돌린 결과의 종류
  const rl = get('REAL ' + name + ' => ');
  if (!rl) probs.push('REAL 줄 없음');
  else {
    const [rst, rfirst, rsecond, rexc, rmsg, rnl] = rest(rl, 'REAL ' + name + ' => ').split('|');
    const want2 = st === 'EX' ? 'second=-' : l2 === PT ? 'second=PT' : 'second=' + l2;
    if (rst !== st || rfirst !== 'firstIsPt=' + (l1 === PT) || rsecond !== want2 || rexc !== exc || rmsg !== msg || rnl !== nl) probs.push('무작위 값으로 돌린 결과가 다름: ' + rl);
  }
  check(name, probs);
}

// 2. 단계 문장이 기대는 사실
check('FACT fixedStream (시험용 무작위 값이 KeyGenerator.init(256)과 new SecureRandom()에 쓰임: key 00..1f, iv 20..2b, otherKey 2c..4b)',
  fact('fixedStream') === 'key=' + Buffer.from(Array.from({ length: 32 }, (_, i) => i)).toString('hex') + '|iv=' + Buffer.from(Array.from({ length: 12 }, (_, i) => 32 + i)).toString('hex')
    + '|otherKey=' + Buffer.from(Array.from({ length: 32 }, (_, i) => 44 + i)).toString('hex') + '|provider=ProbeFixed' ? [] : ['실제 ' + fact('fixedStream')]);
check('FACT bytes (글자 ' + lesson.ptLen + '바이트, sent ' + lesson.sentLen + '바이트, 태그 ' + lesson.tagLen + '바이트)',
  fact('bytes') === 'ptBytes=' + lesson.ptLen + '|sentBytes=' + lesson.sentLen + '|tagBytes=' + lesson.tagLen ? [] : ['실제 ' + fact('bytes')]);
check('FACT midString (깨진 글자에 �가 있고 1234, 카드가 없음)', /\|hasFFFD=true\|has1234=false\|hasCard=false$/.test(fact('midString') || '') ? [] : ['실제 ' + fact('midString')]);
check('FACT ptByte16 (17번째 바이트는 "4"(34), 비트 하나를 뒤집으면 "5"(35))', fact('ptByte16') === '34|flipped=35|5' ? [] : ['실제 ' + fact('ptByte16')]);
check('FACT twice (같은 열쇠, 새 iv로 두 번 암호화하면 값이 다르고 둘 다 풀림)', fact('twice') === 'same=false|decA=' + PT + '|decB=' + PT ? [] : ['실제 ' + fact('twice')]);
check('FACT reuseIv (같은 Cipher를 같은 열쇠·iv로 다시 암호화 모드로 정하면 막힘)', /^java\.security\.InvalidAlgorithmParameterException: /.test(fact('reuseIv') || '') ? [] : ['실제 ' + fact('reuseIv')]);
check('FACT wrongKey100 (무작위 다른 열쇠로 100번 풀면 100번 모두 AEADBadTagException)', fact('wrongKey100') === 'thrown=100|returned=0|javax.crypto.AEADBadTagException|Tag mismatch' ? [] : ['실제 ' + fact('wrongKey100')]);
check('FACT tamperEachByte (33바이트 어느 자리를 바꿔도 예외)', fact('tamperEachByte') === 'positions=' + lesson.sentLen + '|thrown=' + lesson.sentLen + '|javax.crypto.AEADBadTagException' ? [] : ['실제 ' + fact('tamperEachByte')]);
check('FACT tamper16', fact('tamper16') === 'javax.crypto.AEADBadTagException' ? [] : ['실제 ' + fact('tamper16')]);
check('FACT sameKey', (() => { const p = (fact('sameKey') || '').split('|').map(x => x.replace(/^(PT|expectPT)=/, '')); return p[0] === p[1] && p[0] === Buffer.from(PT, 'utf8').toString('hex') ? [] : ['실제 ' + fact('sameKey')]; })());
check('FACT otherKeyFixed', fact('otherKeyFixed') === 'javax.crypto.AEADBadTagException' ? [] : ['실제 ' + fact('otherKeyFixed')]);
check('FACT gcmBodyAsCtr (sent[16]은 "4"를 암호화한 자리: 태그 확인 없이 풀면 카드번호 1235)', fact('gcmBodyAsCtr') === 'untouched=' + PT + '|tampered16=' + lesson.changed ? [] : ['실제 ' + fact('gcmBodyAsCtr')]);
check('FACT ctrTamper (태그가 없는 AES/CTR은 바꾼 바이트를 예외 없이 카드번호 1235로 풂)', fact('ctrTamper') === 'noException|' + lesson.changed ? [] : ['실제 ' + fact('ctrTamper')]);
check('FACT ctrOtherKey (AES/CTR은 다른 열쇠로 풀어도 예외 없이 다른 바이트)', fact('ctrOtherKey') === 'noException|len=' + lesson.ptLen + '|equalsPT=false' ? [] : ['실제 ' + fact('ctrOtherKey')]);
// 단계 문장과 요약이 이 사실을 말하는가
{
  const all = cs.map(c => lesson.simulate(Object.assign({}, c))).flatMap(s => s.events.map(e => e.s).concat(s.summary)).join('\n');
  const probs = [];
  if (!all.includes(lesson.sentLen + '바이트') || !all.includes('뒤 ' + lesson.tagLen + '바이트')) probs.push('바이트 수 문장 없음');
  if (!all.includes('AES/CTR') || !all.includes(lesson.changed)) probs.push('AES/CTR 대조 문장 없음');
  check('단계 문장·요약이 위 사실과 같은 수를 씀', probs);
}

// 3. 계산이 표준대로인지: Node.js의 aes-256-gcm과 바이트까지 같은가
{
  const probs = [], J = {};
  rest(get('JAVA '), 'JAVA ').split('|').forEach(p => { const i = p.indexOf('='); J[p.slice(0, i)] = p.slice(i + 1); });
  const nodeOut = cp.execFileSync(process.execPath, [path.join(__dirname, 'crypto_basic_node.js'), J.key, J.iv, J.sent], { encoding: 'utf8' }).split(/\r?\n/).filter(Boolean);
  const N = n => (nodeOut.find(x => x.startsWith('NODE ' + n + ' => ')) || '').slice(('NODE ' + n + ' => ').length);
  if (N('enc') !== J.sent) probs.push('Node.js의 암호문+태그가 자바와 다름\n   Node ' + N('enc') + '\n   Java ' + J.sent);
  if (N('decSame') !== PT) probs.push('Node.js가 같은 열쇠로 자바의 값을 풀지 못함: ' + N('decSame'));
  if (!N('decOther').startsWith('EX ')) probs.push('Node.js가 다른 열쇠로 풀었는데 실패하지 않음: ' + N('decOther'));
  if (!N('decTamper').startsWith('EX ')) probs.push('Node.js가 바뀐 바이트를 풀었는데 실패하지 않음: ' + N('decTamper'));
  if (N('nist') !== 'ct=fa4362189661d163fcd6a56d8bf0405a|tag=d636ac1bbedd5cc3ee727dc2ab4a9489') probs.push('Node.js의 NIST 벡터 결과가 기대와 다름: ' + N('nist'));
  // 조합 실행의 첫 줄(깨진 글자)이 이 바이트를 글자로 바꾼 것과 같은가
  if (!(get('on|keep|same => ') || '').startsWith('on|keep|same => OK|' + midReal + '|')) probs.push('조합 실행의 첫 줄이 고정 값으로 계산한 바이트의 글자와 다름');
  check('Node.js와 바이트까지 같음, Node.js도 같은 열쇠로만 풀고 바뀐 바이트는 못 풂, NIST 벡터', probs);
}
check('NIST 시험 벡터 암호화 (gcmEncryptExtIV256.rsp Count 0)', /\|match=true$/.test(get('NIST enc => ') || '') ? [] : [get('NIST enc => ')]);
check('NIST 시험 벡터 복호화 통과 (gcmDecrypt256.rsp Count 0)', /\|match=true$/.test(get('NIST dec0 => ') || '') ? [] : [get('NIST dec0 => ')]);
check('NIST 시험 벡터 복호화 FAIL (gcmDecrypt256.rsp Count 2) -> AEADBadTagException', /\|match=true$/.test(get('NIST dec2 => ') || '') ? [] : [get('NIST dec2 => ')]);
console.log('일치 ' + ok + ' / ' + total);
process.exitCode = ok === total ? 0 : 1;

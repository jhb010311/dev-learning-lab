// 기초개념 "암호화" 실습의 모형 결과를 실제 자바 실행 결과(CryptoBasicProbe.out.txt)와 대조한다
// 대조: 결과 표 세 열(중간에서 보이는 값의 앞 12자와 글자 수, 받는 쪽이 읽은 것, 되찾았는지), 던져진 예외의 이름,
//       표준 출력의 두 줄(알아볼 수 없는 값인지 글자인지), 화면의 코드(code 함수)가 Probe가 컴파일한 소스의 main 안 줄과 같은 글인지,
//       열쇠와 nonce를 무작위로 만든 도우미로 다시 돌린 결과의 종류가 같은지,
//       단계 문장이 기대는 사실(FACT 줄), 계산이 표준대로인지(Node.js의 aes-256-gcm과 바이트까지 같은지, NIST 시험 벡터)
const fs = require('fs'), path = require('path'), cp = require('child_process');
const { load, combos } = require('../model_rows.js');
const lesson = load('crypto_basic');
const lines = fs.readFileSync(path.join(__dirname, 'CryptoBasicProbe.out.txt'), 'utf8').split(/\r?\n/).filter(Boolean);
console.log(lines[0]);
const PT = '카드번호 1234';
let ok = 0, total = 0;
function check(name, probs) { total++; if (!probs.length) ok++; else console.log('다름: ' + name + '\n   ' + probs.join('\n   ')); }
const get = prefix => lines.find(l => l.startsWith(prefix));
const rest = (l, p) => l.slice(p.length);

// 1. 여섯 가지 조합
const mc = combos(lesson).length;
const comboLines = lines.slice(1).filter(l => /^(on|off)\|(same|other|none) => /.test(l));
if (mc !== comboLines.length) console.log('다름: 모형의 조합 ' + mc + '개, Probe 출력 ' + comboLines.length + '개');
for (const ln of comboLines) {
  const [k, v] = ln.split(' => '), [enc, reader] = k.split('|'), f = v.split('|');
  const [st, wire, out, exc, msg] = f, probs = [];
  const c = { enc, reader }, sim = lesson.simulate(Object.assign({}, c)), row = sim.row;
  const outLines = out === '' ? [] : out.split(' / ');
  // 중간에서 보이는 값: 암호화했으면 encrypt가 돌려준 값, 아니면 표준 출력의 첫 줄(보내는 쪽이 그대로 보낸 글자)
  const sent = enc === 'on' ? wire : outLines[0];
  const midReal = enc === 'on' ? sent.slice(0, 12) + '… (' + sent.length + '자)' : sent;
  // 받는 쪽이 읽은 것
  let readReal;
  if (st === 'EX') readReal = '예외 ' + exc.split('.').pop() + ': 풀지 못함';
  else readReal = outLines[1] === sent && enc === 'on' ? midReal : outLines[1];
  const gotReal = st === 'OK' && outLines[1] === PT ? '예' : '아니요';
  const real = [midReal, readReal, gotReal];
  if (JSON.stringify(row) !== JSON.stringify(real)) probs.push('표 모형 ' + row.join(' | ') + '\n   실제 ' + real.join(' | '));
  // 예외 이름
  const excReal = st === 'EX' ? exc : '';
  if (sim.exc !== excReal) probs.push('예외 모형 "' + sim.exc + '" 실제 "' + excReal + '"');
  if (st === 'EX' && msg !== 'Tag mismatch') probs.push('예상과 다른 예외 메시지: ' + msg);
  // 표준 출력의 두 줄이 알아볼 수 없는 값인지 글자인지
  const kinds = outLines.map(x => x === PT ? 'pt' : x === sent ? 'wire' : '?');
  if (JSON.stringify(kinds) !== JSON.stringify(sim.outKinds)) probs.push('출력 모형 ' + JSON.stringify(sim.outKinds) + ' 실제 ' + JSON.stringify(kinds));
  // 알아볼 수 없는 값의 모양: 화면의 앞 12자와 글자 수
  if (enc === 'on' && (sent.slice(0, 12) !== lesson.head || sent.length !== lesson.wlen)) probs.push('화면의 값 ' + lesson.head + ' / ' + lesson.wlen + ' 실제 ' + sent.slice(0, 12) + ' / ' + sent.length);
  // 화면의 코드와 Probe가 컴파일한 소스의 main 안 줄
  const src = fs.readFileSync(path.join(__dirname, '..', 'out', 'crypto_basic', enc + '-' + reader, 'Main.java'), 'utf8').replace(/\r\n/g, '\n').split('\n');
  const a = src.findIndex(x => x.includes('<<화면의 코드 시작')), b = src.findIndex(x => x.includes('>>화면의 코드 끝'));
  const shown = src.slice(a + 1, b).map(x => x.replace(/^ {8}/, '')).join('\n');
  if (shown !== lesson.code(c)) probs.push('화면의 코드와 Probe가 컴파일한 소스가 다름');
  // 무작위 열쇠와 nonce로 다시 돌린 결과의 종류
  const rl = get('REAL ' + k + ' => ');
  if (!rl) probs.push('REAL 줄 없음');
  else {
    const [rst, rlen, rpt, rexc, rmsg] = rest(rl, 'REAL ' + k + ' => ').split('|');
    const wantLen = enc === 'on' ? 'wireLen=' + lesson.wlen : 'wireLen=-';
    if (rst !== st || rlen !== wantLen || rpt !== 'readIsPt=' + (gotReal === '예') || rexc !== exc || rmsg !== msg) probs.push('무작위 열쇠·nonce로 돌린 결과가 다름: ' + rl);
  }
  check(k, probs);
}

// 2. 단계 문장이 기대는 사실
const fact = name => { const l = get('FACT ' + name + ' => '); return l ? rest(l, 'FACT ' + name + ' => ') : undefined; };
check('FACT bytes (글자 17바이트, 값 45바이트, Base64 60자)', fact('bytes') === 'ptBytes=17|decodedBytes=45|b64Len=' + lesson.wlen ? [] : ['실제 ' + fact('bytes')]);
check('FACT head12IsNonce (화면의 앞 12자는 nonce 부분)', fact('head12IsNonce') === 'true' ? [] : ['실제 ' + fact('head12IsNonce')]);
check('FACT plainInWire (암호화한 값에 글자가 그대로 들어 있지 않음)', fact('plainInWire') === 'bytes=false|text=false|ASCIIdigits=false' ? [] : ['실제 ' + fact('plainInWire')]);
{
  // twice: OK|wire|표준 출력 (같은가 / 풀기 a / 풀기 b / 길이 / 열쇠 둘이 같은가)|-|-
  const t = (fact('twice') || '').split('|'), o = (t[2] || '').split(' / '), probs = [];
  if (t[0] !== 'OK') probs.push('실행 실패 ' + t.join('|'));
  if (o[0] !== 'false') probs.push('같은 글자를 두 번 암호화한 두 값이 같음');
  if (o[1] !== PT || o[2] !== PT) probs.push('두 값이 모두 풀리지 않음');
  if (o[3] !== lesson.wlen + ' ' + lesson.wlen) probs.push('두 값의 길이 ' + o[3]);
  if (o[4] !== 'false') probs.push('newKey를 두 번 불렀는데 같은 열쇠');
  check('FACT twice (같은 글자를 새 nonce로 두 번 암호화하면 값이 다르고 둘 다 풀림, newKey는 매번 다른 열쇠)', probs);
}
check('FACT wrongKey100 (무작위 다른 열쇠로 100번 풀면 100번 모두 AEADBadTagException)', fact('wrongKey100') === 'thrown=100|returned=0|javax.crypto.AEADBadTagException|Tag mismatch|isBadPadding=true' ? [] : ['실제 ' + fact('wrongKey100')]);
check('FACT tampered (값을 한 비트 바꿔도 AEADBadTagException)', fact('tampered') === 'javax.crypto.AEADBadTagException' ? [] : ['실제 ' + fact('tampered')]);
check('FACT sameKey (같은 열쇠로 풀면 원래 글자)', (() => { const p = (fact('sameKey') || '').split('|').map(x => x.replace(/^(PT|expectPT)=/, '')); return p.length === 2 && p[0] === p[1] && p[0] === Buffer.from(PT, 'utf8').toString('hex') ? [] : ['실제 ' + fact('sameKey')]; })());
check('FACT ctrOtherKey (확인 값이 없는 AES/CTR는 다른 열쇠로 풀어도 예외 없이 다른 바이트)', fact('ctrOtherKey') === 'noException|len=17|equalsPT=false|utf8=false' ? [] : ['실제 ' + fact('ctrOtherKey')]);

// 3. 계산이 표준대로인지: Node.js의 aes-256-gcm과 바이트까지 같은가, Node.js가 자바의 값을 푸는가
{
  const probs = [], jl = get('JAVA '), J = {};
  rest(jl, 'JAVA ').split('|').forEach(p => { const i = p.indexOf('='); J[p.slice(0, i)] = p.slice(i + 1); });
  const nodeOut = cp.execFileSync(process.execPath, [path.join(__dirname, 'crypto_basic_node.js'), J.b64], { encoding: 'utf8' }).split(/\r?\n/).filter(Boolean);
  const N = n => nodeOut.find(x => x.startsWith('NODE ' + n + ' => ')).slice(('NODE ' + n + ' => ').length);
  if (N('enc') !== 'ct=' + J.ct + '|tag=' + J.tag + '|b64=' + J.b64) probs.push('Node.js의 암호문·태그가 자바와 다름\n   Node ' + N('enc') + '\n   Java ' + jl);
  if (N('decA') !== PT) probs.push('Node.js가 같은 열쇠로 자바의 값을 풀지 못함: ' + N('decA'));
  if (!N('decB').startsWith('EX ')) probs.push('Node.js가 다른 열쇠로 풀었는데 예외가 나지 않음: ' + N('decB'));
  const wire = comboLines.find(l => l.startsWith('on|same => ')).split(' => ')[1].split('|')[1];
  if (wire !== J.b64) probs.push('조합 실행의 값과 계산 확인용 값이 다름');
  const nist = get('NIST enc => ').split('|');
  if (N('nist') !== 'ct=fa4362189661d163fcd6a56d8bf0405a|tag=d636ac1bbedd5cc3ee727dc2ab4a9489') probs.push('Node.js의 NIST 벡터 결과가 기대와 다름: ' + N('nist'));
  check('Node.js와 바이트까지 같음 (암호문, 태그), Node.js가 자바의 값을 풀고 다른 열쇠로는 못 풂, NIST 벡터는 Node.js도 같음', probs);
}
check('NIST 시험 벡터 암호화 (gcmEncryptExtIV256.rsp Count 0)', /\|match=true$/.test(get('NIST enc => ') || '') ? [] : [get('NIST enc => ')]);
check('NIST 시험 벡터 복호화 통과 (gcmDecrypt256.rsp Count 0)', /\|match=true$/.test(get('NIST dec0 => ') || '') ? [] : [get('NIST dec0 => ')]);
check('NIST 시험 벡터 복호화 FAIL (gcmDecrypt256.rsp Count 2) -> AEADBadTagException', /\|match=true$/.test(get('NIST dec2 => ') || '') ? [] : [get('NIST dec2 => ')]);
console.log('일치 ' + ok + ' / ' + total);  // 조합 6개 + 사실·표준 대조

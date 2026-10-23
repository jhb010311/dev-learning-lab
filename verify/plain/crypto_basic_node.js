// 기초개념 "암호화" 실습(표준 Cipher 중심 판)의 계산이 표준대로인지 보려고, 자바(CryptoBasicProbe)와 같은 입력을 Node.js의 crypto(OpenSSL)로 계산한다.
// 같은 열쇠, 같은 iv, 같은 글자를 aes-256-gcm으로 암호화해 암호문 뒤에 태그를 붙인 바이트(자바 doFinal의 결과와 같은 모양)를 내고,
// 자바가 만든 바이트를 같은 열쇠, 다른 열쇠(2c..4b), 17번째 바이트를 바꾼 것으로 풀어 본 결과, NIST 시험 벡터 한 개를 내놓는다.
// 사용: node crypto_basic_node.js <열쇠 hex> <iv hex> <자바가 만든 sent hex>
// (옛 판은 Base64 값 하나를 받았다. git 기록에 있다.)
const crypto = require('crypto');
const [keyHex, ivHex, sentHex] = process.argv.slice(2);
const KEY = Buffer.from(keyHex, 'hex'), IV = Buffer.from(ivHex, 'hex');
const OTHER = Buffer.from(Array.from({ length: 32 }, (_, i) => 44 + i));
const PT = '카드번호 1234';

function enc(key, iv, pt) {
  const c = crypto.createCipheriv('aes-256-gcm', key, iv);
  const ct = Buffer.concat([c.update(pt), c.final()]);
  return { ct, tag: c.getAuthTag() };
}
function dec(key, iv, all) {
  const d = crypto.createDecipheriv('aes-256-gcm', key, iv);
  d.setAuthTag(all.subarray(all.length - 16));
  return Buffer.concat([d.update(all.subarray(0, all.length - 16)), d.final()]);
}

const e = enc(KEY, IV, Buffer.from(PT, 'utf8'));
console.log('NODE enc => ' + Buffer.concat([e.ct, e.tag]).toString('hex'));
const sent = Buffer.from(sentHex, 'hex'), tam = Buffer.from(sent); tam[16] ^= 1;
for (const [name, k, v] of [['decSame', KEY, sent], ['decOther', OTHER, sent], ['decTamper', KEY, tam]]) {
  try { console.log('NODE ' + name + ' => ' + dec(k, IV, v).toString('utf8')); }
  catch (x) { console.log('NODE ' + name + ' => EX ' + x.message); }
}

// NIST CAVP gcmEncryptExtIV256.rsp [Keylen=256][IVlen=96][PTlen=128][AADlen=0][Taglen=128] Count 0
const n = enc(Buffer.from('31bdadd96698c204aa9ce1448ea94ae1fb4a9a0b3c9d773b51bb1822666b8f22', 'hex'), Buffer.from('0d18e06c7c725ac9e362e1ce', 'hex'), Buffer.from('2db5168e932556f8089a0622981d017d', 'hex'));
console.log('NODE nist => ct=' + n.ct.toString('hex') + '|tag=' + n.tag.toString('hex'));

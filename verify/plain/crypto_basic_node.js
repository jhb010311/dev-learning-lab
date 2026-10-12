// 기초개념 "암호화" 실습의 계산이 표준대로인지 보려고, 자바(CryptoBasicProbe)와 같은 입력을 Node.js의 crypto(OpenSSL)로 계산한다.
// 같은 열쇠(0x00..0x1f), 같은 nonce, 같은 글자를 aes-256-gcm으로 암호화해 암호문과 태그를 내고,
// 인자로 받은 Base64 값(자바가 암호화한 값)을 열쇠 A와 열쇠 B(0x20..0x3f)로 풀어 본 결과, NIST 시험 벡터 한 개를 내놓는다.
// 사용: node crypto_basic_node.js <자바가 만든 Base64 값>
const crypto = require('crypto');
const seq = from => Buffer.from(Array.from({ length: 32 }, (_, i) => from + i));
const KEY = seq(0), KEY_B = seq(32);
const NONCE = Buffer.from('8a1fc35e27b9d064f13a9c0e', 'hex');
const PT = '카드번호 1234';

function enc(key, iv, pt) {
  const c = crypto.createCipheriv('aes-256-gcm', key, iv);
  const ct = Buffer.concat([c.update(pt), c.final()]);
  return { ct, tag: c.getAuthTag() };
}
function dec(key, iv, ct, tag) {
  const d = crypto.createDecipheriv('aes-256-gcm', key, iv);
  d.setAuthTag(tag);
  return Buffer.concat([d.update(ct), d.final()]);
}

const e = enc(KEY, NONCE, Buffer.from(PT, 'utf8'));
console.log('NODE enc => ct=' + e.ct.toString('hex') + '|tag=' + e.tag.toString('hex') + '|b64=' + Buffer.concat([NONCE, e.ct, e.tag]).toString('base64'));

// 자바가 만든 값을 Node가 푼다 (열쇠 A, 열쇠 B)
const b64 = process.argv[2];
if (b64) {
  const all = Buffer.from(b64, 'base64'), iv = all.subarray(0, 12), ct = all.subarray(12, all.length - 16), tag = all.subarray(all.length - 16);
  for (const [name, k] of [['A', KEY], ['B', KEY_B]]) {
    try { console.log('NODE dec' + name + ' => ' + dec(k, iv, ct, tag).toString('utf8')); }
    catch (x) { console.log('NODE dec' + name + ' => EX ' + x.message); }
  }
}

// NIST CAVP gcmEncryptExtIV256.rsp [Keylen=256][IVlen=96][PTlen=128][AADlen=0][Taglen=128] Count 0
const n = enc(Buffer.from('31bdadd96698c204aa9ce1448ea94ae1fb4a9a0b3c9d773b51bb1822666b8f22', 'hex'), Buffer.from('0d18e06c7c725ac9e362e1ce', 'hex'), Buffer.from('2db5168e932556f8089a0622981d017d', 'hex'));
console.log('NODE nist => ct=' + n.ct.toString('hex') + '|tag=' + n.tag.toString('hex'));

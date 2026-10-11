// 영어판 "Hashing, encryption, and signatures" 실습(crypto)의 화면 값을 만든다.
// basics_probe.js의 1)과 같은 계산을 영어판의 메시지("Order 100 won", "Order 900 won")로 한다. 키 문구와 iv는 한국어판과 같다.
// RSA 키 쌍은 실행할 때마다 새로 만들어지므로 RSA 암호문과 전자서명의 값은 실행마다 다르다(한국어판의 값도 한 번의 실행에서 나온 것이다).
// 실행: node verify/crypto_en_probe.js  → verify/crypto_en_probe.out.json
const crypto = require('crypto'), fs = require('fs'), path = require('path');
const out = {};
const m1 = 'Order 100 won', m2 = 'Order 900 won', sha = s => crypto.createHash('sha256').update(s).digest('hex');
out.hash = { m1: sha(m1), m1again: sha(m1), m2: sha(m2) };
const key = crypto.createHash('sha256').update('우리끼리만 아는 키').digest(), key2 = crypto.createHash('sha256').update('다른 키').digest(), iv = Buffer.alloc(12, 7);
const enc = (k, msg) => { const c = crypto.createCipheriv('aes-256-gcm', k, iv); const ct = Buffer.concat([c.update(msg, 'utf8'), c.final()]); return { ct: ct.toString('hex'), tag: c.getAuthTag() }; };
const dec = (k, e) => { try { const d = crypto.createDecipheriv('aes-256-gcm', k, iv); d.setAuthTag(e.tag); return Buffer.concat([d.update(Buffer.from(e.ct, 'hex')), d.final()]).toString('utf8'); } catch (err) { return 'failed: ' + err.message; } };
const e = enc(key, m1);
out.sym = { cipher: e.ct, sameKey: dec(key, e), otherKey: dec(key2, e) };
const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
const other = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
const rsaCt = crypto.publicEncrypt(publicKey, Buffer.from(m1));
let pubDec; try { pubDec = crypto.publicDecrypt(publicKey, rsaCt).toString(); } catch (err) { pubDec = 'failed'; }
let otherDec; try { otherDec = crypto.privateDecrypt(other.privateKey, rsaCt).toString(); } catch (err) { otherDec = 'failed'; }
out.asym = { cipherHead: rsaCt.toString('hex').slice(0, 32), cipherBytes: rsaCt.length, privateDec: crypto.privateDecrypt(privateKey, rsaCt).toString(), publicDec: pubDec, otherPrivateDec: otherDec };
const hm = (k, s) => crypto.createHmac('sha256', k).update(s).digest('hex');
out.hmac = { sig: hm('서버만 아는 키', m1), verifyOk: hm('서버만 아는 키', m1) === hm('서버만 아는 키', m1), tampered: hm('서버만 아는 키', m2) === hm('서버만 아는 키', m1), forged: hm('공격자가 추측한 키', m2) === hm('서버만 아는 키', m2) };
const sig = crypto.sign('sha256', Buffer.from(m1), privateKey);
out.sign = { sigHead: sig.toString('hex').slice(0, 32), sigBytes: sig.length, ok: crypto.verify('sha256', Buffer.from(m1), publicKey, sig), tampered: crypto.verify('sha256', Buffer.from(m2), publicKey, sig), forged: crypto.verify('sha256', Buffer.from(m2), publicKey, crypto.sign('sha256', Buffer.from(m2), other.privateKey)) };
fs.writeFileSync(path.join(__dirname, 'crypto_en_probe.out.json'), JSON.stringify(out, null, 2) + '\n');
console.log(JSON.stringify(out, null, 2));

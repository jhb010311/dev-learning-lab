// 암호문을 한 비트 바꿨을 때: AES-GCM과 RSA-OAEP 모두 복호화가 실패하는지 확인
const crypto = require('crypto'); const out = {};
const key = crypto.createHash('sha256').update('k').digest(), iv = Buffer.alloc(12, 7);
const c = crypto.createCipheriv('aes-256-gcm', key, iv); const ct = Buffer.concat([c.update('주문 100원', 'utf8'), c.final()]); const tag = c.getAuthTag();
const bad = Buffer.from(ct); bad[0] ^= 1;
try { const d = crypto.createDecipheriv('aes-256-gcm', key, iv); d.setAuthTag(tag); out.gcmTampered = Buffer.concat([d.update(bad), d.final()]).toString(); } catch (e) { out.gcmTampered = 'FAIL: ' + e.message; }
const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
const r = crypto.publicEncrypt(publicKey, Buffer.from('주문 100원')); const rb = Buffer.from(r); rb[10] ^= 1;
try { out.rsaTampered = crypto.privateDecrypt(privateKey, rb).toString(); } catch (e) { out.rsaTampered = 'FAIL: ' + e.message; }
out.rsaOk = crypto.privateDecrypt(privateKey, r).toString();
require('fs').writeFileSync(__dirname + '/crypto_tamper_probe.out.json', JSON.stringify(out, null, 1)); console.log(out);

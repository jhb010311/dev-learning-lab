// 선행 개념 실습에 쓸 값을 실제로 계산한다: 해시·암호화·서명, 트랜잭션(SQLite), HTTP 메시지 원문
const crypto = require('crypto'), net = require('net'), http = require('http'), fs = require('fs'), path = require('path');
const { DatabaseSync } = require('node:sqlite');
const out = {};

// 1) 해시, 대칭키, 비대칭키, HMAC, 전자서명
{
  const m1 = '주문 100원', m2 = '주문 900원', sha = s => crypto.createHash('sha256').update(s).digest('hex');
  out.hash = { m1: sha(m1), m1again: sha(m1), m2: sha(m2) };
  const key = crypto.createHash('sha256').update('우리끼리만 아는 키').digest(), key2 = crypto.createHash('sha256').update('다른 키').digest(), iv = Buffer.alloc(12, 7);
  const enc = (k, msg) => { const c = crypto.createCipheriv('aes-256-gcm', k, iv); const ct = Buffer.concat([c.update(msg, 'utf8'), c.final()]); return { ct: ct.toString('hex'), tag: c.getAuthTag() }; };
  const dec = (k, e) => { try { const d = crypto.createDecipheriv('aes-256-gcm', k, iv); d.setAuthTag(e.tag); return Buffer.concat([d.update(Buffer.from(e.ct, 'hex')), d.final()]).toString('utf8'); } catch (err) { return '실패: ' + err.message; } };
  const e = enc(key, m1);
  out.sym = { cipher: e.ct, sameKey: dec(key, e), otherKey: dec(key2, e) };
  const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
  const other = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
  const rsaCt = crypto.publicEncrypt(publicKey, Buffer.from(m1));
  let pubDec; try { pubDec = crypto.publicDecrypt(publicKey, rsaCt).toString(); } catch (err) { pubDec = '실패'; }
  let otherDec; try { otherDec = crypto.privateDecrypt(other.privateKey, rsaCt).toString(); } catch (err) { otherDec = '실패'; }
  out.asym = { cipherHead: rsaCt.toString('hex').slice(0, 32), cipherBytes: rsaCt.length, privateDec: crypto.privateDecrypt(privateKey, rsaCt).toString(), publicDec: pubDec, otherPrivateDec: otherDec };
  const hm = (k, s) => crypto.createHmac('sha256', k).update(s).digest('hex');
  out.hmac = { sig: hm('서버만 아는 키', m1), verifyOk: hm('서버만 아는 키', m1) === hm('서버만 아는 키', m1), tampered: hm('서버만 아는 키', m2) === hm('서버만 아는 키', m1), forged: hm('공격자가 추측한 키', m2) === hm('서버만 아는 키', m2) };
  const sig = crypto.sign('sha256', Buffer.from(m1), privateKey);
  out.sign = { sigHead: sig.toString('hex').slice(0, 32), ok: crypto.verify('sha256', Buffer.from(m1), publicKey, sig), tampered: crypto.verify('sha256', Buffer.from(m2), publicKey, sig), forged: crypto.verify('sha256', Buffer.from(m2), publicKey, crypto.sign('sha256', Buffer.from(m2), other.privateKey)) };
}

// 2) 트랜잭션: 자동 커밋과 묶음, 예외와 장애, 다른 연결에서 보이는 값
{
  const file = path.join(__dirname, 'tx_probe.db'); const res = {};
  const fresh = () => { for (const f of [file, file + '-wal', file + '-shm']) { try { fs.unlinkSync(f); } catch (e) {} } const d = new DatabaseSync(file); d.exec("pragma journal_mode=wal; create table account(id text primary key, balance int); insert into account values ('A', 5000), ('B', 1000);"); return d; };
  const read = d => d.prepare("select group_concat(id || '=' || balance, ', ') s from (select * from account order by id)").get().s;
  for (const mode of ['auto', 'tx']) for (const fail of ['none', 'ex', 'crash']) {
    let d = fresh(); const other = new DatabaseSync(file); let mid = '';
    try {
      if (mode === 'tx') d.exec('begin');
      d.exec("update account set balance = balance - 1000 where id = 'A'");
      mid = read(other);                                    // 다른 연결이 중간에 조회
      if (fail === 'ex') throw new Error('입금 전에 오류');
      if (fail === 'crash') { d.close(); d = null; throw new Error('crash'); }   // 커밋 없이 연결이 끊김
      d.exec("update account set balance = balance + 1000 where id = 'B'");
      if (mode === 'tx') d.exec('commit');
    } catch (e) { if (d && mode === 'tx') d.exec('rollback'); }
    if (d) d.close();
    res[mode + ',' + fail] = { mid, final: read(other) }; other.close();
  }
  out.tx = res; for (const f of [file, file + '-wal', file + '-shm']) { try { fs.unlinkSync(f); } catch (e) {} }
}

// 3) HTTP 요청과 응답의 원문 (실제 소켓으로 주고받은 글자 그대로)
const server = http.createServer((req, res) => { res.writeHead(201, { 'Content-Type': 'application/json', Location: '/orders/7' }); res.end('{"id":7}'); });
server.listen(4190, '127.0.0.1', () => {
  const sock = net.connect(4190, '127.0.0.1'); let buf = '';
  const body = '{"item":"키보드"}';
  const reqText = 'POST /orders HTTP/1.1\r\nHost: 127.0.0.1:4190\r\nContent-Type: application/json\r\nContent-Length: ' + Buffer.byteLength(body) + '\r\nConnection: close\r\n\r\n' + body;
  sock.write(reqText); sock.on('data', d => buf += d); sock.on('end', () => {
    out.http = { request: reqText.split('\r\n'), response: buf.split('\r\n').filter(l => !/^Date:/.test(l)) };
    server.close(); fs.writeFileSync(path.join(__dirname, 'basics_probe.out.json'), JSON.stringify(out, null, 1)); console.log(JSON.stringify(out, null, 1));
  });
});

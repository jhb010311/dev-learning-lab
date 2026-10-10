// HTTP/2: 연결 하나에 요청 30개를 동시에 실을 수 있는지 실제 HTTP/2 구현(Node 내장)으로 확인한다.
const http2 = require('http2'), fs = require('fs'), path = require('path');
const tls = path.join(__dirname, 'tls');
const server = http2.createSecureServer({ key: fs.readFileSync(path.join(tls, 'ok.key')), cert: fs.readFileSync(path.join(tls, 'ok.pem')) });
let now = 0, max = 0; const sockets = new Set();
server.on('stream', (stream) => { now++; max = Math.max(max, now); sockets.add(stream.session.socket.remotePort); setTimeout(() => { now--; stream.respond({ ':status': 200 }); stream.end('ok'); }, 300); });
server.listen(4460, '127.0.0.1', () => {
  const client = http2.connect('https://127.0.0.1:4460', { ca: fs.readFileSync(path.join(tls, 'ca.pem')), servername: 'shop.test' });
  const t = Date.now(); let done = 0;
  for (let i = 0; i < 30; i++) { const req = client.request({ ':path': '/file' + i }); req.resume(); req.on('end', () => { if (++done === 30) { console.log('HTTP/2: 요청 30개, 전체 ' + (Date.now() - t) + 'ms, 동시에 처리 중이던 최대 요청 수 ' + max + ', 사용한 TCP 연결 ' + sockets.size + '개'); client.close(); server.close(); } }); req.end(); }
});

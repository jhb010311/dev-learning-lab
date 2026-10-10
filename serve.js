// 미리보기용: 빌드한 docs/를 그대로 보여 준다. (node serve.js → http://127.0.0.1:4173, 영어판은 /en/)
// 포트를 바꾸려면 PORT=4174 node serve.js
const http = require('http'), fs = require('fs'), path = require('path');
const port = +process.env.PORT || 4173;
http.createServer((req, res) => {
  const en = /^\/en(\/|$)/.test(req.url.split('?')[0]), file = path.join(__dirname, 'docs', en ? 'en' : '', 'index.html');
  if (!fs.existsSync(file)) { res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' }); res.end('not built'); return; }
  res.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' });
  res.end(fs.readFileSync(file));
}).listen(port, '127.0.0.1');

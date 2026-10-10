// 미리보기용: 빌드한 docs/index.html을 그대로 보여 준다. (node serve.js → http://127.0.0.1:4173)
const http = require('http'), fs = require('fs'), path = require('path');
http.createServer((req, res) => {
  res.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' });
  res.end(fs.readFileSync(path.join(__dirname, 'docs', 'index.html')));
}).listen(4173, '127.0.0.1');

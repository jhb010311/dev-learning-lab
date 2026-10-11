// 미리보기용: 빌드한 docs/를 그대로 보여 준다. (node serve.js → http://127.0.0.1:4173, 영어판은 /en/)
// 포트를 바꾸려면 PORT=4174 node serve.js
const http = require('http'), fs = require('fs'), path = require('path');
const port = +process.env.PORT || 4173, root = path.join(__dirname, 'docs');
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.png': 'image/png', '.xml': 'application/xml; charset=utf-8', '.json': 'application/json; charset=utf-8', '.txt': 'text/plain; charset=utf-8' };
http.createServer((req, res) => {
  let p = '/'; try { p = decodeURIComponent(req.url.split('?')[0]); } catch (e) {}
  let file = path.normalize(path.join(root, p));
  // docs/ 밖은 보여 주지 않는다
  if (file !== root && !file.startsWith(root + path.sep)) { res.writeHead(403, { 'content-type': 'text/plain; charset=utf-8' }); res.end('forbidden'); return; }
  if (fs.existsSync(file) && fs.statSync(file).isDirectory()) {
    // GitHub Pages처럼, 폴더 주소가 /로 끝나지 않으면 /를 붙여 다시 보낸다(상대 경로가 어긋나지 않게)
    if (!p.endsWith('/')) { res.writeHead(301, { location: p + '/' }); res.end(); return; }
    file = path.join(file, 'index.html');
  }
  if (!fs.existsSync(file)) { res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' }); res.end('not found (빌드했는지 확인: node build.js)'); return; }
  res.writeHead(200, { 'content-type': TYPES[path.extname(file)] || 'application/octet-stream', 'cache-control': 'no-store' });
  res.end(fs.readFileSync(file));
}).listen(port, '127.0.0.1');

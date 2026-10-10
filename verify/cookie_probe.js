// 쿠키 동작 확인용 서버: 브라우저가 어떤 요청에 어떤 쿠키를 붙여 보내는지 그대로 돌려준다
const http = require('http');
http.createServer((req, res) => {
  const u = req.url.split('?')[0];
  if (u === '/set') {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Set-Cookie': ['sid=abc123; Path=/; HttpOnly', 'theme=dark; Path=/', 'cart=3; Path=/shop', 'temp=1; Path=/; Max-Age=3'] });
    return res.end('<h1>set</h1>');
  }
  if (u === '/clear') {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Set-Cookie': ['sid=; Path=/; Max-Age=0', 'theme=; Path=/; Max-Age=0', 'cart=; Path=/shop; Max-Age=0', 'temp=; Path=/; Max-Age=0'] });
    return res.end('<h1>clear</h1>');
  }
  res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'Access-Control-Allow-Origin': '*' });
  res.end(JSON.stringify({ path: u, host: req.headers.host, cookie: req.headers.cookie || '' }));
}).listen(4183, '127.0.0.1', () => console.log('cookie probe on 4183'));

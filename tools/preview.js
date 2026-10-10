// 작업 중인 실습을 실제 틀로 미리 본다. 사용: node tools/preview.js <내보낼 폴더> [포트]
// 프로젝트의 docs/는 건드리지 않고, 정식 빌드와 같은 방법(문자열 이스케이프 포함)으로 <내보낼 폴더>/index.html을 만든다.
// 포트를 주면 그 폴더를 127.0.0.1:<포트>에서 보여 준다. 목차에 아직 없는 실습은 주소 끝에 #<실습 id>를 붙여 연다.
// 미리보기 페이지를 손으로 조립하지 말 것: 실습 문자열에 든 예시 HTML이 실제로 실행될 수 있다.
const path = require('path'), cp = require('child_process'), fs = require('fs'), http = require('http');
const out = process.argv[2], port = +process.argv[3];
if (!out) { console.log('사용: node tools/preview.js <내보낼 폴더> [포트]'); process.exit(1); }
const abs = path.resolve(out), root = path.join(__dirname, '..');
if (abs === root || abs.startsWith(path.join(root, 'docs'))) { console.log('프로젝트 폴더나 docs/가 아닌 다른 폴더를 주세요'); process.exit(1); }
fs.mkdirSync(abs, { recursive: true });
const r = cp.spawnSync(process.execPath, [path.join(root, 'build.js')], { env: Object.assign({}, process.env, { LAB_OUT_DIR: abs }), encoding: 'utf8' });
const lines = (r.stdout + r.stderr).split('\n').filter(l => /Error|index\.html/.test(l)).map(l => l.slice(0, 200));
console.log(lines.join('\n'));
if (r.status !== 0) process.exit(1);
if (port) {
  http.createServer((req, res) => { res.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store', 'content-security-policy': "form-action 'none'" }); res.end(fs.readFileSync(path.join(abs, 'index.html'))); }).listen(port, '127.0.0.1');
  console.log('http://127.0.0.1:' + port + '/#<실습 id>  (끝내려면 이 프로세스를 종료)');
}

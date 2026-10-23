// 기초개념 "다른 서버 부르기" 실습의 화면 코드(code 함수)를 조합마다 파일로 꺼낸다. RemoteBasicProbe.java가 이 글을 그대로 컴파일하고 실행한다
// (다른 서버를 부르는 코드는 "localhost:9000"의 9000만 실제 빈 포트로 바꾼다).
// 사용: node verify/spring/remote_basic_probe_src.js  →  verify/out/remote_basic_std/<where-pay-timeout>/screen.txt
// 조합: where(remote/local) × pay(ok/down/slow) × timeout(true/false) = 12
const fs = require('fs'), path = require('path');
const { load, combos } = require('../model_rows.js');
const l = load('remote_basic');
const out = path.join(__dirname, '..', 'out', 'remote_basic_std');
const keys = [];
for (const c of combos(l)) {
  const key = [c.where, c.pay, c.timeout].join('-');
  fs.mkdirSync(path.join(out, key), { recursive: true });
  fs.writeFileSync(path.join(out, key, 'screen.txt'), l.code(Object.assign({}, c)), 'utf8');
  keys.push(key);
}
fs.writeFileSync(path.join(out, 'keys.txt'), keys.join('\n') + '\n', 'utf8');
console.log(keys.length + '개 조합의 화면 코드를 ' + out + '에 씀');

// 기초개념 "메시지 큐" 실습의 화면 코드(code 함수)를 조합마다 파일로 꺼낸다.
// QueueBasicProbe.java는 이 글 가운데 직접 부르는 조합(direct-*)을 그대로 컴파일하고 실행한다("localhost:8081"의 8081만 실제 빈 포트로 바꾼다).
// 큐를 쓰는 조합(queue-*)은 cmp_queue_basic.js가 스프링 AMQP 대역(amqp_stubs/)과 함께 컴파일만 한다.
// 사용: node verify/spring/queue_basic_probe_src.js  →  verify/out/queue_basic_std/<via-consumer>/screen.txt, keys.txt
const fs = require('fs'), path = require('path');
const { load, combos } = require('../model_rows.js');
const l = load('queue_basic');
const out = path.join(__dirname, '..', 'out', 'queue_basic_std');
const keys = [];
for (const c of combos(l)) {
  const key = [c.via, c.consumer].join('-');
  fs.mkdirSync(path.join(out, key), { recursive: true });
  fs.writeFileSync(path.join(out, key, 'screen.txt'), l.code(Object.assign({}, c)), 'utf8');
  keys.push(key);
}
fs.writeFileSync(path.join(out, 'keys.txt'), keys.join('\n') + '\n', 'utf8');
console.log(keys.length + '개 조합의 화면 코드를 ' + out + '에 씀');

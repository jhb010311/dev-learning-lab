// "메시지 큐 기본" 실습(mq)의 화면 코드가 컴파일되는지 본다. 사용: node verify/spring/cmp_mq.js
// 화면 코드는 메서드만 보이는 조각이고(머리 주석에 밝힘), 예시로 만든 Order·OrderDto·OrderRequest·orderService·mailClient·mailSender의 선언은 생략되어 있다.
// 그래서 그 선언만 가장 작은 모양으로 더하고(Order.getId()는 Long), 화면의 메서드들을 클래스 하나로 감싸 javac로 컴파일한다.
// rabbitTemplate(RabbitTemplate)과 @RabbitListener는 spring-amqp가 이 컴퓨터에 없어 공식 시그니처만 옮긴 대역(amqp_stubs/)과 함께 컴파일한다(실행하지 않음).
// 모형의 결과(시간·건수)는 실행으로 대조하지 않는다(src/verify.js의 mq: model).
const fs = require('fs'), path = require('path'), cp = require('child_process');
const { load, combos } = require('../model_rows.js');
const l = load('mq');
const JDK = 'E:/dev/jdk-21.0.12.1+1/bin', LIBS = 'E:/dev/java-interview-lab/verify/spring/libs/*';
const stubs = path.join(__dirname, 'amqp_stubs'), out = path.join(__dirname, '..', 'out', 'mq_code');
const stubFiles = []; (function walk(d) { for (const f of fs.readdirSync(d)) { const p = path.join(d, f); if (fs.statSync(p).isDirectory()) walk(p); else if (f.endsWith('.java')) stubFiles.push(p); } })(stubs);
const HEAD = ['package app;', '',
  'import org.springframework.amqp.rabbit.annotation.RabbitListener;', 'import org.springframework.amqp.rabbit.core.RabbitTemplate;',
  'import org.springframework.web.bind.annotation.PostMapping;', 'import org.springframework.web.bind.annotation.RequestBody;', '',
  '// 화면에서 선언을 생략한 예시 타입(가장 작은 모양)',
  'class Order { Long getId() { return 1L; } }', 'class OrderRequest { }', 'class OrderDto { static OrderDto of(Order o) { return new OrderDto(); } }',
  'class OrderService { Order save(OrderRequest r) { return new Order(); } }', 'class MailClient { void sendConfirm(Order o) { } }', 'class MailSender { void sendConfirm(long orderId) { } }', '',
  'class Screen {', '    OrderService orderService; MailClient mailClient; MailSender mailSender; RabbitTemplate rabbitTemplate;', ''].join('\n');
const texts = new Map(); for (const c of combos(l)) texts.set(l.code(c), c);
fs.rmSync(out, { recursive: true, force: true });
let ok = 0, i = 0, fail = 0;
for (const [text, c] of texts) {
  const dir = path.join(out, 'v' + (++i)); fs.mkdirSync(path.join(dir, 'app'), { recursive: true });
  fs.writeFileSync(path.join(dir, 'app', 'Screen.java'), HEAD + text + '\n}\n');
  try { cp.execFileSync(JDK + '/javac', ['-encoding', 'UTF-8', '-proc:none', '-cp', LIBS, '-d', path.join(dir, 'classes'), path.join(dir, 'app', 'Screen.java'), ...stubFiles], { stdio: 'pipe' }); ok++; }
  catch (e) { fail++; console.log('컴파일 실패 ' + JSON.stringify(c) + '\n' + String(e.stderr).slice(0, 800)); }
  if (c.how === 'queue' && !/^    rabbitTemplate\.convertAndSend\("order-created", order\.getId\(\)\);$/m.test(text)) { fail++; console.log('큐 방식의 보내는 줄이 rabbitTemplate.convertAndSend가 아님'); }
  if (/queue\.send\(/.test(text)) { fail++; console.log('옛 queue.send 줄이 남음'); }
}
console.log('화면 코드 컴파일(예시 타입의 선언과 스프링 AMQP 대역을 더함): ' + ok + ' / ' + texts.size);
console.log(fail ? '\n대조 실패 ' + fail + '개' : '\n대조 통과');
process.exit(fail ? 1 : 0);

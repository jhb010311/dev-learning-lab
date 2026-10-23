// 기초개념 "메시지 큐" 실습(스프링 AMQP의 RabbitTemplate·@RabbitListener 중심으로 다시 짠 것)을 대조한다.
// 사용: node verify/net/cmp_queue_basic.js          (저장된 실행 결과로 대조)
//       node verify/net/cmp_queue_basic.js --run    (두 실행을 다시 돌린 뒤 대조)
//  1. 화면의 코드(code 함수)를 조합마다 뽑아 package/import 머리글만 붙이고 javac로 컴파일한다.
//     큐를 쓰는 조합은 spring-amqp가 이 컴퓨터에 없으므로 공식 시그니처만 옮긴 대역(verify/spring/amqp_stubs/)과 함께 컴파일한다(실행하지 않음).
//     직접 부르는 조합은 실제 라이브러리(spring-web, spring-webmvc)만으로 컴파일한다. 한 줄이 75칸 이내인지도 본다.
//  2. 직접 부르는 두 조합: 실제 스프링 부트 실행 결과(verify/spring/queue_basic_probe.out.txt, QueueBasicProbe.java)가
//     결과 표와 단계 문장이 기대는 사실(handle이 찍은 뒤에 order가 끝남, ResourceAccessException과 원인 ConnectException, 켜진 뒤 1초 동안 handle이 불리지 않음)과 맞는가.
//  3. 네 조합: RabbitMQ 역할을 대신하는 실행용 모형의 결과(verify/net/queue_basic_broker_probe.out.txt)에서 결과 표 세 열을 따로 만들어 모형의 row와 견주고,
//     단계 문장이 기대는 사실(넣은 차례 = 넘겨준 차례 = 지운 차례, 주문을 다 보낸 때 큐에 3건, 켜지기 전에는 넘겨주지 않음, 알림 하나 0.3초, 하나씩 처리)을 본다.
//  4. 두 실행이 읽은 글이 지금 화면의 코드와 같은가.
// 옛 대조(말로 쓴 코드 칸과 queue_basic_probe.out.txt)는 이 파일의 이전 판이었고, 옛 실행 결과 파일은 그대로 두었다.
const fs = require('fs'), path = require('path'), cp = require('child_process');
const { load, combos } = require('../model_rows.js');
const lesson = load('queue_basic');
const ROOT = path.join(__dirname, '..', '..');
const JDK = 'E:/dev/jdk-21.0.12.1+1/bin', LIBDIR = 'E:/dev/java-interview-lab/verify/spring/libs';
const LIBS = LIBDIR + '/*';
let fail = 0; const bad = m => { fail++; console.log('다름: ' + m); };

// 0. --run: 두 실행을 다시 돌린다
if (process.argv.includes('--run')) {
  cp.execFileSync('node', [path.join(ROOT, 'verify/spring/queue_basic_probe_src.js')], { stdio: 'inherit' });
  // 보안·JPA·JDBC 자동 설정이 끼지 않게 실행 클래스패스에서 그 jar들을 뺀다
  const runCp = fs.readdirSync(LIBDIR).filter(f => f.endsWith('.jar') && !/security|jpa|hibernate|jdbc|h2-|HikariCP|mysql|data-|kafka|persistence|sql-/.test(f)).map(f => LIBDIR + '/' + f).join(';');
  const outDir = path.join(ROOT, 'verify/spring/out/queue_basic');
  fs.mkdirSync(outDir, { recursive: true });
  cp.execFileSync(JDK + '/javac', ['-encoding', 'UTF-8', '-cp', runCp, '-d', outDir, path.join(ROOT, 'verify/spring/src/QueueBasicProbe.java')], { stdio: 'inherit' });
  cp.execFileSync(JDK + '/java', ['-cp', outDir + ';' + runCp, 'QueueBasicProbe', ROOT], { stdio: 'inherit' });
  cp.execFileSync('node', [path.join(__dirname, 'queue_basic_broker_probe.js')], { stdio: 'ignore' });
}

// 1. 화면 코드 컴파일
const HEAD = ['package app;', '',
  'import org.springframework.beans.factory.annotation.Autowired;', 'import org.springframework.context.annotation.Bean;', 'import org.springframework.context.annotation.Configuration;',
  'import org.springframework.stereotype.Component;', 'import org.springframework.stereotype.Service;',
  'import org.springframework.web.bind.annotation.PostMapping;', 'import org.springframework.web.bind.annotation.RequestBody;', 'import org.springframework.web.bind.annotation.RestController;',
  'import org.springframework.web.client.RestClient;', ''].join('\n');
const AMQP = ['import org.springframework.amqp.core.Queue;', 'import org.springframework.amqp.rabbit.annotation.RabbitListener;', 'import org.springframework.amqp.rabbit.core.RabbitTemplate;', ''].join('\n');
const stubs = path.join(ROOT, 'verify/spring/amqp_stubs'), outc = path.join(ROOT, 'verify/out/queue_basic_code');
const stubFiles = []; (function walk(d) { for (const f of fs.readdirSync(d)) { const p = path.join(d, f); if (fs.statSync(p).isDirectory()) walk(p); else if (f.endsWith('.java')) stubFiles.push(p); } })(stubs);
fs.rmSync(outc, { recursive: true, force: true });
let cok = 0, cn = 0;
const codeOf = {};
for (const c of combos(lesson)) {
  const key = c.via + '|' + c.consumer, text = lesson.code(Object.assign({}, c)); codeOf[key] = text; cn++;
  const q = c.via === 'queue', dir = path.join(outc, key.replace('|', '-'));
  fs.mkdirSync(path.join(dir, 'app'), { recursive: true });
  fs.writeFileSync(path.join(dir, 'app', 'Screen.java'), HEAD + (q ? AMQP : '') + '\n' + text + '\n');
  try { cp.execFileSync(JDK + '/javac', ['-encoding', 'UTF-8', '-parameters', '-proc:none', '-cp', LIBS, '-d', path.join(dir, 'classes'), path.join(dir, 'app', 'Screen.java'), ...(q ? stubFiles : [])], { stdio: 'pipe' }); cok++; }
  catch (e) { bad('컴파일 실패 ' + key + '\n' + String(e.stderr).slice(0, 800)); }
  text.split('\n').forEach(l => { const w = Array.from(l).reduce((a, ch) => a + (ch.charCodeAt(0) > 0x7f ? 2 : 1), 0); if (w > 75) bad('코드 줄이 75칸을 넘음(' + w + '): ' + l); });
  if (q !== /rabbitTemplate\.convertAndSend\("order-created", no\);/.test(text) || q !== /@RabbitListener\(queues = "order-created"\)/.test(text)) bad('큐 조합의 보내는 줄/받는 줄이 다름 ' + key);
}
console.log('화면 코드 컴파일(큐 조합은 스프링 AMQP 대역과 함께): ' + cok + ' / ' + cn);

// 2. 실제 스프링 부트 실행 (직접 부르는 두 조합)
const jl = fs.readFileSync(path.join(ROOT, 'verify/spring/queue_basic_probe.out.txt'), 'utf8').split(/\r?\n/);
console.log(jl[0]);
const J = {}; jl.forEach(l => { if (l.startsWith('#') || !l.includes(' => ')) return; const i = l.indexOf(' => '); J[l.slice(0, i)] = JSON.parse(l.slice(i + 4)); });
let jok = 0, jn = 0;
for (const key of ['direct|up', 'direct|late']) {
  jn++; const r = J[key], probs = [];
  if (!r) { bad('스프링 실행 결과 없음: ' + key); continue; }
  if (r.text !== codeOf[key]) probs.push('스프링 실행이 읽은 글과 지금 화면의 코드가 다름');
  const sim = lesson.simulate({ via: 'direct', consumer: key.split('|')[1] });
  const lg = r.log.map(e => ({ k: e[0], v: e[1], t: e[2] }));
  const at = (k, v) => lg.findIndex(e => e.k === k && e.v === v);
  if (key === 'direct|up') {
    if (!r.results.every(x => x.ok) || r.results.length !== 3) probs.push('주문 3건이 모두 성공하지 않음');
    [1, 2, 3].forEach(n => { const p = at('찍힌 줄', '주문 ' + n + ' 알림 보냄'), e = at('주문 끝', n + ' 성공'), s = at('주문 시작', String(n)); if (!(s >= 0 && s < p && p < e)) probs.push('order(' + n + ')가 handle이 찍은 뒤에 끝나지 않음'); });
    if (sim.row[0] !== '3건 모두 성공 (알림 서버가 처리를 마친 뒤에 받음)') probs.push('표 첫 열: ' + sim.row[0]);
  } else {
    if (!r.results.every(x => !x.ok && x.ex === 'org.springframework.web.client.ResourceAccessException' && x.cause === 'java.net.ConnectException') || r.results.length !== 3) probs.push('세 번 모두 ResourceAccessException(원인 ConnectException)이 아님: ' + JSON.stringify(r.results));
    const on = lg.findIndex(e => e.k === '알림 서버 켜짐'), lastEnd = lg.map(e => e.k).lastIndexOf('주문 끝');
    if (!(on > lastEnd)) probs.push('알림 서버가 주문을 다 보낸 뒤에 켜지지 않음');
    if (lg.some(e => e.k === '찍힌 줄')) probs.push('handle이 불림');
    const watch = lg.find(e => e.k === '지켜보기 끝'); if (!watch || watch.t - lg[on].t < 990) probs.push('켜진 뒤 1초를 지켜보지 않음');
    if (sim.row[0] !== '3건 모두 실패 (ResourceAccessException: 알림 서버에 연결하지 못함)' || sim.row[1] !== '0건 (알림 서버가 켜진 뒤에도 처리된 알림이 없음)') probs.push('표: ' + sim.row.join(' | '));
  }
  if (!probs.length) jok++; else bad(key + '\n   ' + probs.join('\n   '));
}
console.log('직접 부르는 조합, 실제 스프링 부트 실행과 일치: ' + jok + ' / ' + jn);

// 3. 실행용 모형 (네 조합)
const lines = fs.readFileSync(path.join(__dirname, 'queue_basic_broker_probe.out.txt'), 'utf8').split(/\r?\n/);
console.log(lines[0]);
const real = {};
lines.forEach(l => { if (l.startsWith('#') || !l.includes(' => ')) return; const i = l.indexOf(' => '); real[l.slice(0, i)] = JSON.parse(l.slice(i + 4)); });
const ALS = ['주문 1 알림', '주문 2 알림', '주문 3 알림'], NOS = ['1', '2', '3'];
let ok = 0, n = 0;
for (const c of combos(lesson)) {
  n++;
  const k = [c.via, c.consumer].join('|'), r = real[k], probs = [];
  if (!r) { bad('모형 실행 결과 없음: ' + k); continue; }
  const sim = lesson.simulate(Object.assign({}, c)), q = c.via === 'queue', late = c.consumer === 'late', log = r.log;
  const idx = (kind, v) => log.findIndex(e => e.k === kind && (v === undefined || e.v === v));
  const lastIdx = kind => { let x = -1; log.forEach((e, i) => { if (e.k === kind) x = i; }); return x; };
  if (r.text !== codeOf[k]) probs.push('모형이 읽은 글과 지금 화면의 코드가 다름');
  // --- 결과 표 세 열을 잰 값으로 만든다
  const allOk = r.results.length === 3 && r.results.every(x => x.ok), allFail = r.results.length === 3 && r.results.every(x => !x.ok);
  const firstDone = idx('알림 처리 끝'), lastResult = lastIdx('주문 서버가 결과를 받음');
  const resultsBeforeAnyDone = firstDone < 0 || lastResult < firstDone;
  const doneBeforeResult = [1, 2, 3].every(no => { const d = idx('알림 처리 끝', ALS[no - 1]), rr = idx('주문 서버가 결과를 받음', no + ' 성공'); return d >= 0 && rr >= 0 && d < rr; });
  let col1;
  if (allOk && resultsBeforeAnyDone && q) col1 = '3건 모두 성공 (알림 처리를 기다리지 않고 바로 받음)';
  else if (allOk && doneBeforeResult && !q) col1 = '3건 모두 성공 (알림 서버가 처리를 마친 뒤에 받음)';
  else if (allFail && r.results.every(x => x.errCode === 'ECONNREFUSED')) col1 = '3건 모두 실패 (ResourceAccessException: 알림 서버에 연결하지 못함)';   // 예외 이름은 2의 스프링 실행에서 확인
  else col1 = '??? ' + JSON.stringify(r.results);
  const col2 = r.processedCount === 0 ? '0건 (알림 서버가 켜진 뒤에도 처리된 알림이 없음)' : (r.processedCount === 3 && JSON.stringify(r.processed) === JSON.stringify(ALS) ? '3건: ' + r.processed.join(' → ').replace(/ 알림/g, '') : '??? ' + JSON.stringify(r.processed));
  let col3;
  if (r.listens.mode !== 'queue') col3 = '큐 없음';
  else if (r.queueAtNotifyStart === 0) col3 = '0건 (알림 서버가 먼저 켜져 있었음)';
  else if (r.queueAtNotifyStart === 3) col3 = '3건 (주문 번호 1, 2, 3)';
  else col3 = '??? ' + r.queueAtNotifyStart;
  const want = [col1, col2, col3];
  if (JSON.stringify(sim.row) !== JSON.stringify(want)) probs.push('표 모형 ' + sim.row.join(' | ') + '\n   실제 ' + want.join(' | '));
  // --- 단계 문장이 기대는 사실
  if (r.listens.late !== late || (r.listens.mode === 'queue') !== q) probs.push('화면의 글과 띄운 것이 다름: ' + JSON.stringify(r.listens));
  if (q) {
    if (JSON.stringify(r.listens.declared) !== '["order-created"]' || r.listens.routingKey !== 'order-created' || r.listens.listenQueue !== 'order-created') probs.push('큐 이름이 셋(만들기·보내기·받기)에서 같지 않음');
    if (r.dropped.length) probs.push('버려진 메시지 ' + r.dropped.length);
    if (JSON.stringify(r.puts) !== JSON.stringify(NOS) || JSON.stringify(r.delivers) !== JSON.stringify(NOS) || JSON.stringify(r.acks) !== JSON.stringify(NOS)) probs.push('넣은/넘겨준/지운 차례가 다름: ' + JSON.stringify([r.puts, r.delivers, r.acks]));
    if (r.queueAfterOrders !== 3) probs.push('주문 3건을 보낸 직후 큐의 메시지 수 ' + r.queueAfterOrders + ' (문장은 3건이라고 함)');
    if (r.queueLeft !== 0) probs.push('끝난 뒤 큐에 남은 수 ' + r.queueLeft);
    const on = idx('알림 서버 켜짐');
    if (late) { if (!(on > lastResult)) probs.push('꺼져 있다가 켜진 것이 결과를 모두 받은 뒤가 아님'); }
    else {
      if (!(on >= 0 && on < idx('주문 서버가 보냄', '1'))) probs.push('켜져 있는 조합인데 알림 서버가 주문보다 먼저 켜지지 않음');
      // 켜져 있으면 주문 번호 1은 넣자마자 넘겨지고, 주문 번호 2는 1의 확인 뒤에 넘겨진다
      if (!(idx('큐가 넘겨줌', '1') === idx('큐에 넣음', '1') + 1)) probs.push('켜져 있는데 주문 번호 1을 넣자마자 넘겨주지 않음');
      if (!(idx('큐가 넘겨줌', '2') > idx('확인 받고 지움', '1'))) probs.push('주문 번호 2가 1의 확인 전에 넘겨짐');
    }
    if (idx('큐가 넘겨줌') < on) probs.push('알림 서버가 켜지기 전에 넘겨줌');
    NOS.forEach(m => { if (!(idx('큐에 넣음', m) < idx('주문 서버가 결과를 받음', m + ' 성공'))) probs.push('큐에 넣기가 결과보다 먼저가 아님: ' + m); });
    NOS.forEach((m, j) => { if (!(idx('알림 처리 끝', ALS[j]) < idx('확인 받고 지움', m))) probs.push('처리 끝 전에 지움: ' + m); });
  } else {
    if (r.puts.length || r.delivers.length) probs.push('큐가 없는 조합인데 큐 기록이 있음');
    if (!late) {
      if (!doneBeforeResult) probs.push('직접 부르는데 처리가 끝난 뒤에 결과를 받지 않음');
      if (!(idx('주문 서버가 결과를 받음', '1 성공') < idx('주문 서버가 보냄', '2') && idx('주문 서버가 결과를 받음', '2 성공') < idx('주문 서버가 보냄', '3'))) probs.push('다음 주문이 앞 주문의 결과 전에 나감');
      r.results.forEach(x => { if (x.ms < 290) probs.push('직접 부를 때 결과까지 걸린 시간 ' + x.ms + 'ms (0.3초 기다린다고 적음)'); });
    } else {
      if (!(idx('알림 서버 켜짐') > lastResult)) probs.push('알림 서버가 결과를 모두 받기 전에 켜짐');
      if (idx('알림 처리 시작') >= 0) probs.push('꺼져 있던 동안 보낸 요청이 처리됨');
    }
  }
  ALS.forEach(m => { const s = idx('알림 처리 시작', m), e = idx('알림 처리 끝', m); if (s >= 0) { const d = log[e].t - log[s].t; if (d < 295 || d > 450) probs.push('알림 하나의 처리 시간 ' + d + 'ms'); } });
  { let busy = 0; log.forEach(e => { if (e.k === '알림 처리 시작') busy++; if (e.k === '알림 처리 끝') busy--; if (busy > 1) probs.push('알림이 동시에 처리됨'); }); }
  if (!probs.length) ok++; else bad(k + '\n   ' + probs.join('\n   '));
}
console.log('실행용 모형과 모형의 결과 일치: ' + ok + ' / ' + n);
console.log(fail ? '\n대조 실패 ' + fail + '개' : '\n대조 통과');
process.exit(fail ? 1 : 0);

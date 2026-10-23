// 기초개념 "다른 서버 부르기" 실습의 모형 결과를 실제 실행 결과(remote_basic_probe.out.txt)와 대조한다 (2026-10-22 RestClient 판).
// 실행: node verify/spring/remote_basic_probe_src.js → RemoteBasicProbe.java 실행 → node verify/spring/cmp_remote_basic.js
// 대조: 결과 표 세 열(호출의 결과, 걸린 시간, 결제가 끝났나), 화면의 코드(code 함수)가 Probe가 컴파일해 실행한 소스와 같은 글인지,
//       단계 문장이 기대는 사실(결제 서버가 받은 요청 줄, catch가 찍은 글, 결제 서버가 처리를 끝낸 때와 그때 주문 쪽이 연결을 닫았는지,
//       catch에 잡힌 예외의 정확한 클래스와 원인, 답하지 않는 서버를 부를 때 타임아웃이 없으면 4초 뒤에도 기다리는지).
// (옛 Node.js 판의 대조와 결과는 verify/net/cmp_remote_basic.js, verify/net/remote_basic_probe.out.txt에 그대로 두었다.)
const fs = require('fs'), path = require('path');
const { load, combos } = require('../model_rows.js');
const lesson = load('remote_basic');
const lines = fs.readFileSync(path.join(__dirname, 'remote_basic_probe.out.txt'), 'utf8').split(/\r?\n/).filter(Boolean);
console.log(lines[0]);
const unesc = s => s.replace(/\\(\\|n|p)/g, (m, c) => c === 'n' ? '\n' : c === 'p' ? '|' : '\\');
const real = {}, facts = lines.filter(l => l.startsWith('# 근거 '));
for (const l of lines) {
  if (l.startsWith('#') || !l.includes(' => ')) continue;
  const i = l.indexOf(' => '), k = l.slice(0, i), rest = l.slice(i + 4), f = {};
  const si = rest.indexOf('|src='); f.src = unesc(rest.slice(si + 5));
  rest.slice(0, si).split('|').forEach(p => { const j = p.indexOf('='); f[p.slice(0, j)] = p.slice(j + 1); });
  real[k] = f;
}
const bucket = ms => ms < 100 ? 'fast' : ms <= 400 ? '0.1' : ms >= 900 && ms <= 1300 ? '1' : ms >= 2900 && ms <= 3400 ? '3' : '?';
const timeTxt = ms => { const b = bucket(ms); return b === 'fast' ? '바로 (0.1초 안)' : '약 ' + b + '초'; };
let ok = 0, n = 0; const problems = [];
for (const c of combos(lesson)) {
  n++;
  const k = [c.where, c.pay, c.timeout].join('|'), f = real[k], probs = [];
  if (!f) { console.log('실행 결과 없음: ' + k); continue; }
  const sim = lesson.simulate(Object.assign({}, c)), ms = +f.ms, local = c.where === 'local';
  if (f.uncaught !== '-') probs.push('main 밖으로 예외가 나감: ' + f.uncaught);
  // 호출의 결과: main이 찍은 글에서
  let want0 = '?';
  if (f.out === '결제 완료') want0 = '"결제 완료"를 돌려받음';
  else if (f.out.startsWith('호출 실패: java.net.ConnectException')) want0 = 'ResourceAccessException (원인: ConnectException)';
  else if (f.out.startsWith('호출 실패: java.net.SocketTimeoutException')) want0 = 'ResourceAccessException (원인: SocketTimeoutException)';
  if (sim.row[0] !== want0) probs.push('호출의 결과 모형 ' + sim.row[0] + ' 실제 ' + f.out);
  // 걸린 시간
  if (sim.row[1] !== timeTxt(ms)) probs.push('걸린 시간 모형 ' + sim.row[1] + ' 실제 ' + ms + 'ms');
  // 결제가 끝났나
  let want2;
  if (local) want2 = f.out === '결제 완료' ? '예 (' + timeTxt(ms).replace('약 ', '') + ' 뒤)' : '?';
  else if (f.paySaw === '(없음)') want2 = '아니요 (요청을 받지 못함)';
  else { const b = bucket(+f.payDoneMs); want2 = '예 (' + b + '초 뒤' + (f.out === '결제 완료' ? ')' : f.peerClosed.startsWith('true') ? ', 주문 서버가 포기한 뒤)' : ', ?)'); }
  if (sim.row[2] !== want2) probs.push('결제가 끝났나 모형 ' + sim.row[2] + ' 실제 ' + want2 + ' (payDoneMs=' + f.payDoneMs + ', peerClosed=' + f.peerClosed + ')');
  // 단계 문장이 기대는 사실
  if (!local && c.pay !== 'down' && f.paySaw !== 'POST /pay HTTP/1.1') probs.push('결제 서버가 받은 요청 줄 ' + f.paySaw);
  if (!local && c.pay === 'down' && f.paySaw !== '(없음)') probs.push('꺼진 결제 서버가 요청을 받음?');
  const evText = sim.events.map(e => e.s).join(' ');
  if (f.out.startsWith('호출 실패') && !evText.includes(f.out.startsWith('호출 실패: java.net.ConnectException') ? '"호출 실패: java.net.ConnectException…"' : '"' + f.out + '"')) probs.push('단계 문장에 catch가 찍은 글이 없음: ' + f.out);
  if (f.out === '결제 완료' && !evText.includes('결제 완료를 찍습니다')) probs.push('단계 문장에 출력이 없음');
  if (!local && c.pay === 'slow' && c.timeout && f.peerClosed !== 'true') probs.push('결제 서버가 끝낼 때 주문 쪽 연결이 닫혀 있어야 함: ' + f.peerClosed);
  if (!local && c.pay !== 'down' && !(c.pay === 'slow' && c.timeout) && f.peerClosed !== 'false') probs.push('연결이 열려 있어야 함: ' + f.peerClosed);
  // 화면의 코드 = Probe가 컴파일해 실행한 소스(포트를 바꾸기 전 글)
  const screen = lesson.code(Object.assign({}, c));
  if (screen !== f.src) probs.push('화면의 코드와 실행한 소스가 다름(remote_basic_probe_src.js와 Probe를 다시 돌릴 것)');
  if (!probs.length) ok++; else console.log('다름: ' + k + '\n   ' + probs.join('\n   '));
}
// 근거 사실
const fact = s => facts.find(l => l.includes(s)) || '';
const fx = fact('예외 timeout/down'), fy = fact('예외 none/down'), fz = fact('예외 timeout/slow');
if (!fx.includes('=> org.springframework.web.client.ResourceAccessException|cause=java.net.ConnectException|')) problems.push('타임아웃 있음, 꺼진 서버의 예외: ' + fx);
if (!fy.includes('=> org.springframework.web.client.ResourceAccessException|cause=java.net.ConnectException|')) problems.push('타임아웃 없음, 꺼진 서버의 예외: ' + fy);
if (!fz.includes('=> org.springframework.web.client.ResourceAccessException|cause=java.net.SocketTimeoutException|causeMsg=Read timed out|')) problems.push('읽기 타임아웃의 예외: ' + fz);
const h1 = fact('답하지 않는 서버, RestClient.create()'), h2 = fact('답하지 않는 서버, 타임아웃 1초');
if (!h1.includes('4초 뒤 아직 기다림=true') || !h1.includes('결제 서버가 요청을 받음=true')) problems.push('답하지 않는 서버, 타임아웃 없음: ' + h1);
if (!/4초 뒤 아직 기다림=false\|결과=ResourceAccessException\(원인 SocketTimeoutException\)\|ms=(9\d\d|1[0-2]\d\d)\|/.test(h2)) problems.push('답하지 않는 서버, 타임아웃 1초: ' + h2);
if (!fact('RestClient.create()의 요청 팩토리=').includes('JdkClientHttpRequestFactory')) problems.push('RestClient.create()의 요청 팩토리: ' + fact('요청 팩토리'));
problems.forEach(p => console.log('다름(근거): ' + p));
console.log('일치 ' + ok + ' / ' + n + (problems.length ? ' (근거 불일치 ' + problems.length + '건)' : ' (근거 사실 6건도 모두 일치)'));

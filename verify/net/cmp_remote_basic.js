// (옛 판) 2026-10-22 실습이 스프링 RestClient 중심으로 바뀌어 이 대조는 옛 Node.js 판의 기록이다. 새 대조는 verify/spring/cmp_remote_basic.js.
// 기초개념 "다른 서버 부르기" 실습의 모형 결과를 실제 실행 결과(remote_basic_probe.out.txt)와 대조한다.
if (require.main === module) { console.log('옛 Node.js 판의 대조입니다. 지금 실습은 verify/spring/cmp_remote_basic.js로 대조합니다.'); process.exit(0); }
// 대조: 결과 표 세 열(클라이언트가 받은 응답, 걸린 시간, 주문 서버가 겪은 일), 단계 문장이 기대는 사실
//       (결제 서버가 요청을 받았는지, 오류의 종류, 결제 서버가 결제를 끝낸 때와 그때 연결이 끊겨 있었는지,
//        기다리는 시간을 정하지 않고 결제 서버가 답하지 않을 때 4초 동안 포기하지 않는지),
//       그리고 화면의 코드(code 함수)가 Probe가 실제로 주고받은 것에서 만든 글과 같은지
//       (서버가 받은 요청 줄, 주문 서버 코드에 정한 기다림 한도, 결제 서버의 지연, 오류별 상태 코드).
//       화면의 8080, 9000은 예시 번호라서 실제 포트(빈 포트)로 바꾸어 견주지 않고 그대로 둔다.
const fs = require('fs'), path = require('path');
const { load, combos } = require('../model_rows.js');
const lesson = load('remote_basic');
const lines = fs.readFileSync(path.join(__dirname, 'remote_basic_probe.out.txt'), 'utf8').split(/\r?\n/);
console.log(lines[0]);
const real = {}, facts = [];
lines.forEach(l => {
  if (l.startsWith('# 근거 ')) { facts.push(l); return; }
  if (l.startsWith('#') || !l.includes(' => ')) return;
  const i = l.indexOf(' => '), k = l.slice(0, i), f = {};
  l.slice(i + 4).split('|').forEach(p => { const j = p.indexOf('='); f[p.slice(0, j)] = p.slice(j + 1); });
  real[k] = f;
});
const problems = [];
const code = f => +f.status.split(' ')[0];
// 오류별 상태 코드는 실제 응답에서 얻는다
const st502 = real['down|true'] && code(real['down|true']), st504 = real['slow|true'] && code(real['slow|true']);
const resp = f => code(f) === 200 ? '200 ' + f.body : code(f) + ' ' + f.status.split(' ').slice(1).join(' ');
const secs = ms => ms < 100 ? 'fast' : ms >= 50 && ms <= 400 ? '0.1' : ms >= 900 && ms <= 1300 ? '1' : ms >= 2900 && ms <= 3400 ? '3' : '?';
let ok = 0, n = 0;
for (const c of combos(lesson)) {
  n++;
  const k = [c.pay, c.timeout].join('|'), f = real[k], probs = [];
  if (!f) { console.log('실행 결과 없음: ' + k); continue; }
  const sim = lesson.simulate(Object.assign({}, c)), ms = +f.ms;
  // 결과 표: 응답
  const wantResp = resp(f);
  if (sim.row[0] !== wantResp) probs.push('응답 모형 ' + sim.row[0] + ' 실제 ' + wantResp);
  // 걸린 시간
  const b = secs(ms), wantTime = b === 'fast' ? '바로 (0.1초 안)' : '약 ' + b + '초';
  if (sim.row[1] !== wantTime) probs.push('걸린 시간 모형 ' + sim.row[1] + ' 실제 ' + ms + 'ms (' + wantTime + ')');
  // 주문 서버가 겪은 일: 실제 이벤트와 시간에서
  let wantEvt;
  if (f.orderEvent === 'ECONNREFUSED') wantEvt = f.errCode === 'ECONNREFUSED' ? '연결 실패 (ECONNREFUSED)' : '?';
  else if (f.orderEvent === '시간 초과') wantEvt = f.causeName === 'TimeoutError' ? '1초를 기다려도 답이 없어 포기 (시간 초과)' : '?';
  else if (f.orderEvent === '답함') wantEvt = secs(+f.payDoneMs) === '0.1' ? '결제 서버가 0.1초 만에 답함' : secs(+f.payDoneMs) === '3' ? '결제 서버가 3초 만에 답할 때까지 기다림' : '?';
  if (sim.row[2] !== wantEvt) probs.push('주문 서버가 겪은 일 모형 ' + sim.row[2] + ' 실제 ' + wantEvt);
  // 응답 코드와 이벤트가 맞물리는가(502는 연결 실패, 504는 시간 초과일 때만)
  if ((code(f) === st502) !== (f.orderEvent === 'ECONNREFUSED')) probs.push('502와 연결 실패가 맞물리지 않음');
  if ((code(f) === st504) !== (f.orderEvent === '시간 초과')) probs.push('504와 시간 초과가 맞물리지 않음');
  // 단계 문장이 기대는 사실
  const wantSaw = c.pay === 'down' ? '(없음)' : 'POST /pay';
  if (f.paySaw !== wantSaw) probs.push('결제 서버가 받은 요청 기대 ' + wantSaw + ' 실제 ' + f.paySaw);
  if (f.orderSaw !== 'POST /orders' || f.payReq !== 'POST /pay') probs.push('요청 줄이 다름: ' + f.orderSaw + ' / ' + f.payReq);
  const wantDone = c.pay === 'down' ? 'false' : 'true';
  if (f.payDone !== wantDone) probs.push('결제 서버의 처리 끝 기대 ' + wantDone + ' 실제 ' + f.payDone);
  if (c.pay === 'slow' && c.timeout && f.paySocketGone !== 'true') probs.push('시간 초과 뒤 결제 서버 연결이 끊겨 있어야 함: ' + f.paySocketGone);
  if (c.pay === 'slow' && !(+f.payDoneMs >= 2900 && +f.payDoneMs <= 3400)) probs.push('결제 서버가 3초 뒤에 끝내지 않음: ' + f.payDoneMs);
  if (c.pay === 'slow' && c.timeout && !(+f.errAtMs >= 900 && +f.errAtMs <= 1300)) probs.push('시간 초과 오류가 1초쯤에 나지 않음: ' + f.errAtMs);
  if ((c.pay === 'slow' && !c.timeout || c.pay === 'ok') && f.paySocketGone !== 'false') probs.push('연결이 끊기지 않았어야 함: ' + f.paySocketGone);
  if (c.pay === 'ok' && f.payReply !== '200 결제 완료') probs.push('결제 서버의 답 기대 200 결제 완료 실제 ' + f.payReply);
  if (c.pay === 'down' && f.errCode !== 'ECONNREFUSED') probs.push('오류 코드 ' + f.errCode);
  if (c.pay === 'slow' && c.timeout && (f.errCode !== 'ABORT_ERR' || f.causeName !== 'TimeoutError')) probs.push('시간 초과 오류 종류 ' + f.errCode + '/' + f.causeName);
  if (c.pay !== 'down' && !(c.pay === 'slow' && c.timeout) && f.errCode !== '(없음)') probs.push('오류가 없어야 함: ' + f.errCode);
  if (f.cfgTimeout !== (c.timeout ? '1000' : '없음')) probs.push('기다림 한도 설정 ' + f.cfgTimeout);
  // 화면의 코드 = Probe가 실제로 주고받은 것에서 만든 글
  const delayTxt = f.cfgDelay === '꺼짐' ? '꺼져 있다' : (+f.cfgDelay / 1000) + '초 뒤 "' + f.payReply.split(' ').slice(1).join(' ').replace(/^$/, '결제 완료') + '"';
  const observed = [
    '# 클라이언트 → 주문 서버(8080): ' + f.orderSaw,
    '# 주문 서버 → 결제 서버(9000): ' + f.payReq + (f.cfgTimeout === '없음' ? '' : '  (최대 ' + (+f.cfgTimeout / 1000) + '초 기다린다)'),
    '# 결제 서버: ' + delayTxt,
    '# 주문 서버: 연결 실패는 ' + st502 + ', 시간 초과는 ' + st504 + '로 답한다'].join('\n');
  const screen = lesson.code(Object.assign({}, c));
  if (screen !== observed) probs.push('화면의 코드와 실제가 다름\n   화면 ' + JSON.stringify(screen) + '\n   실제 ' + JSON.stringify(observed));
  if (!probs.length) ok++; else console.log('다름: ' + k + '\n   ' + probs.join('\n   '));
}
// 기다리는 시간을 정하지 않고 결제 서버가 영영 답하지 않을 때
const f1 = facts.find(l => l.includes('정하지 않고')), f2 = facts.find(l => l.includes('정하고 결제 서버가'));
if (!f1 || !f1.includes('응답을 받음=false') || !f1.includes('주문 서버가 오류를 겪음=false') || !f1.includes('결제 서버가 요청을 받음=true')) problems.push('근거(한도 없음, 답하지 않음) 다름: ' + f1);
if (!f2 || !/상태=504 Gateway Timeout\|ms=(9\d\d|1[0-2]\d\d)$/.test(f2)) problems.push('근거(한도 있음, 답하지 않음) 다름: ' + f2);
problems.forEach(p => console.log('다름(근거): ' + p));
console.log('일치 ' + ok + ' / ' + n + (problems.length ? ' (근거 불일치 ' + problems.length + '건)' : ' (근거 사실도 모두 일치)'));

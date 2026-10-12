// 기초개념 "메시지 큐" 실습의 모형 결과를 실제 실행 결과(queue_basic_probe.out.txt)와 대조한다.
// 대조: 결과 표 세 열(주문 서버가 받은 결과, 처리된 알림, 알림 서버가 켜질 때 큐에 있던 메시지)을 실행에서 잰 사실(결과, 사건의 순서 기록)로부터 따로 만들어 모형의 row와 견준다.
//       단계 문장이 기대는 사실(큐에 넣을 때 알림 서버를 부르지 않는다, 주문 서버가 결과를 받은 때 알림이 처리됐는가, 직접 부를 때는 처리가 끝난 뒤에 결과를 받는가,
//       꺼진 알림 서버는 연결 거부 오류인가, 꺼져 있던 동안 큐에 쌓인 수, 넣은 차례대로 꺼내는가, 알림 하나의 처리 시간이 0.3초인가, 켜진 뒤에도 처리된 것이 없는가)도 확인한다.
//       그리고 화면의 코드(code 함수)가 Probe가 실제로 읽어 실행한 글과 같은 글인지, 한 줄이 75칸 이내인지 확인한다.
const fs = require('fs'), path = require('path');
const { load, combos } = require('../model_rows.js');
const lesson = load('queue_basic');
const lines = fs.readFileSync(path.join(__dirname, 'queue_basic_probe.out.txt'), 'utf8').split(/\r?\n/);
console.log(lines[0]);
const real = {};
lines.forEach(l => { if (l.startsWith('#') || !l.includes(' => ')) return; const i = l.indexOf(' => '); real[l.slice(0, i)] = JSON.parse(l.slice(i + 4)); });
const MSGS = ['주문 1 알림', '주문 2 알림', '주문 3 알림'];
let ok = 0, n = 0;
for (const c of combos(lesson)) {
  n++;
  const k = [c.via, c.consumer].join('|'), r = real[k], probs = [];
  if (!r) { console.log('실행 결과 없음: ' + k); continue; }
  const sim = lesson.simulate(Object.assign({}, c)), q = c.via === 'queue', late = c.consumer === 'late', log = r.log;
  const idx = (kind, v) => log.findIndex(e => e.k === kind && (v === undefined || e.v === v));
  const lastIdx = kind => { let x = -1; log.forEach((e, i) => { if (e.k === kind) x = i; }); return x; };
  // --- 결과 표 세 열을 잰 값으로 만든다
  const allOk = r.results.length === 3 && r.results.every(x => x.ok), allFail = r.results.length === 3 && r.results.every(x => !x.ok);
  const firstDone = idx('알림 처리 끝'), lastResult = lastIdx('주문 서버가 결과를 받음');
  const resultsBeforeAnyDone = firstDone < 0 || lastResult < firstDone;
  const doneBeforeResult = MSGS.every(m => { const d = idx('알림 처리 끝', m), rr = idx('주문 서버가 결과를 받음', m + ' 성공'); return d >= 0 && rr >= 0 && d < rr; });
  let col1;
  if (allOk && resultsBeforeAnyDone && q) col1 = '3건 모두 성공 (알림 처리를 기다리지 않고 바로 받음)';
  else if (allOk && doneBeforeResult && !q) col1 = '3건 모두 성공 (알림 서버가 처리를 마친 뒤에 받음)';
  else if (allFail && r.results.every(x => x.errCode === 'ECONNREFUSED')) col1 = '3건 모두 실패 (알림 서버에 연결하지 못함)';
  else col1 = '??? ' + JSON.stringify(r.results);
  const seq = r.processed.join(' → ').replace(/ 알림/g, '');
  const col2 = r.processedCount === 0 ? '0건 (알림 서버가 켜진 뒤에도 처리된 알림이 없음)' : (r.processedCount === 3 && JSON.stringify(r.processed) === JSON.stringify(MSGS) ? '3건: ' + seq : '??? ' + JSON.stringify(r.processed));
  let col3;
  if (!r.listens.queue) col3 = '큐 없음';
  else if (r.queueAtNotifyStart === 0) col3 = '0건 (알림 서버가 먼저 켜져 있었음)';
  else if (r.queueAtNotifyStart === 3) col3 = '3건 (주문 1, 주문 2, 주문 3)';
  else col3 = '??? ' + r.queueAtNotifyStart;
  const want = [col1, col2, col3];
  if (JSON.stringify(sim.row) !== JSON.stringify(want)) probs.push('표 모형 ' + sim.row.join(' | ') + '\n   실제 ' + want.join(' | '));
  // --- 문장이 기대는 사실
  if (r.listens.late !== late || r.listens.queue !== q) probs.push('화면의 줄과 띄운 것이 다름: ' + JSON.stringify(r.listens));
  const sentIdx = MSGS.map(m => idx('주문 서버가 보냄', m));
  if (q) {
    if (JSON.stringify(r.puts) !== JSON.stringify(MSGS) || JSON.stringify(r.takes) !== JSON.stringify(MSGS)) probs.push('넣은 차례/꺼낸 차례가 다름: ' + JSON.stringify([r.puts, r.takes]));
    if (r.queueAfterOrders !== 3) probs.push('주문 3건을 보낸 직후 큐의 메시지 수 ' + r.queueAfterOrders + ' (문장은 3건이라고 함)');
    if (r.queueLeft !== 0) probs.push('끝난 뒤 큐에 남은 수 ' + r.queueLeft);
    const on = idx('알림 서버 켜짐');
    if (late) { if (!(on > lastResult)) probs.push('꺼져 있다가 켜진 것이 결과를 모두 받은 뒤가 아님'); }
    else if (!(on >= 0 && on < sentIdx[0])) probs.push('켜져 있는 조합인데 알림 서버가 주문보다 먼저 켜지지 않음');
    // 꺼내기는 알림 서버가 켜진 뒤에만
    if (idx('큐에서 꺼냄') < on) probs.push('알림 서버가 켜지기 전에 꺼냄');
    // 큐 쪽에서 본 넣기는 주문 서버의 결과보다 먼저
    MSGS.forEach(m => { if (!(idx('큐에 넣음', m) < idx('주문 서버가 결과를 받음', m + ' 성공'))) probs.push('큐에 넣기가 결과보다 먼저가 아님: ' + m); });
  } else {
    if (r.puts.length || r.takes.length) probs.push('큐가 없는 조합인데 큐 기록이 있음');
    if (!late) {
      if (!doneBeforeResult) probs.push('직접 부르는데 처리가 끝난 뒤에 결과를 받지 않음');
      // 다음 주문은 앞 주문의 결과를 받은 뒤에 보냄
      if (!(idx('주문 서버가 결과를 받음', MSGS[0] + ' 성공') < sentIdx[1] && idx('주문 서버가 결과를 받음', MSGS[1] + ' 성공') < sentIdx[2])) probs.push('다음 주문이 앞 주문의 결과 전에 나감');
      r.results.forEach(x => { if (x.ms < 290) probs.push('직접 부를 때 결과까지 걸린 시간 ' + x.ms + 'ms (0.3초 기다린다고 적음)'); });
    } else {
      if (!(idx('알림 서버 켜짐') > lastResult)) probs.push('알림 서버가 결과를 모두 받기 전에 켜짐');
      if (idx('알림 처리 시작') >= 0) probs.push('꺼져 있던 동안 보낸 요청이 처리됨');
    }
  }
  if (late && r.processedCount === 0 && lastIdx('알림 서버 켜짐') < 0) probs.push('나중에 켜진 기록이 없음');
  // 알림 하나의 처리 시간 0.3초 (문장에 적음)
  MSGS.forEach(m => { const s = idx('알림 처리 시작', m), e = idx('알림 처리 끝', m); if (s >= 0) { const d = log[e].t - log[s].t; if (d < 295 || d > 450) probs.push('알림 하나의 처리 시간 ' + d + 'ms'); } });
  // 알림은 하나씩 (겹치지 않음)
  { let busy = 0; log.forEach(e => { if (e.k === '알림 처리 시작') busy++; if (e.k === '알림 처리 끝') busy--; if (busy > 1) probs.push('알림이 동시에 처리됨'); }); }
  // 화면의 코드 = Probe가 읽어 실행한 글
  const code = lesson.code(Object.assign({}, c));
  if (code !== r.text) probs.push('화면의 코드와 Probe가 실행한 글이 다름\n   화면 ' + JSON.stringify(code) + '\n   실제 ' + JSON.stringify(r.text));
  code.split('\n').forEach(l => { const w = Array.from(l).reduce((a, ch) => a + (ch.charCodeAt(0) > 0x7f ? 2 : 1), 0); if (w > 75) probs.push('코드 줄이 75칸을 넘음(' + w + '): ' + l); });
  if (!probs.length) ok++; else console.log('다름: ' + k + '\n   ' + probs.join('\n   '));
}
console.log('일치 ' + ok + ' / ' + n);

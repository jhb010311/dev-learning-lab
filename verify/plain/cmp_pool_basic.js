// 기초개념 "스레드 풀" 실습의 모형 결과를 실제 javac 컴파일과 자식 java 프로세스 실행 결과(PoolBasicProbe.out.txt)와 대조한다
// 대조: 모든 조합이 컴파일되는지, 20번 실행해 종료 코드가 0이고 표준 오류가 비었는지, 일한 스레드 이름의 집합이 20번 모두 같은지,
//       결과 표 네 열(일한 스레드 수, 이름, 끝난 일, 같은 스레드가 여러 일을 함: 모두 실제 출력에서 얻음),
//       새로 시작된 스레드 수가 모형의 그림이 보이는 "만들어진 스레드"와 같은지, 줄에서 기다리는 일의 수가 같은지,
//       화면의 코드(code 함수)가 Probe가 컴파일하고 실행한 소스(verify/out/pool_basic/<조합>/Main.java)와 같은 글인지,
//       단계 문장이 기대는 사실(FACT 줄)
const fs = require('fs'), path = require('path');
const { load, combos } = require('../model_rows.js');
const lesson = load('pool_basic');
const lines = fs.readFileSync(path.join(__dirname, 'PoolBasicProbe.out.txt'), 'utf8').split(/\r?\n/).filter(Boolean);
console.log(lines[0]);
let ok = 0, total = 0;
const seen = new Set(), factOf = {};
for (const ln of lines.slice(1)) {
  if (ln.startsWith('FACT ')) { const [k, v] = ln.slice(5).split(' => '); factOf[k] = v; continue; }
  total++;
  const [k, v] = ln.split(' => '), [how, size] = k.split('|'), f = v.split('|');
  const [res, nerr, runs, exit, nsets, nlines, started, stderr] = f, nameSets = f.slice(8).join('|');
  const c = { how, size };
  seen.add(JSON.stringify(c));
  const sim = lesson.simulate(Object.assign({}, c)), row = sim.row, probs = [];
  if (res !== 'OK' || nerr !== '0') probs.push('컴파일되지 않음');
  if (+runs < 20) probs.push('실행 횟수가 20번보다 적음: ' + runs);
  if (exit !== '0') probs.push('종료 코드가 0이 아님: ' + exit);
  if (stderr !== '-') probs.push('표준 오류가 있음: ' + stderr);
  if (nsets !== '1') probs.push('실행마다 일한 스레드 이름의 집합이 달라짐: ' + nameSets);
  if (!/^\d+$/.test(nlines)) probs.push('출력된 줄의 수가 실행마다 다름: ' + nlines);
  if (!/^\d+$/.test(started)) probs.push('새로 시작된 스레드 수가 실행마다 다름: ' + started);
  const names = nameSets.split(','), nl = +nlines;
  const real = [names.length + '개', names.join(', '), nl + '개', nl > names.length ? '예' : '아니오'];
  if (JSON.stringify(row) !== JSON.stringify(real)) probs.push('표 모형 ' + row.join(' | ') + '\n   실제 ' + real.join(' | '));
  // 그림이 보이는 수와 실제: 만들어진 스레드 = 실제로 시작된 스레드, 끝난 일 = 출력된 줄, 줄에서 기다린 일 = 일 6개 - 스레드 수(풀일 때)
  const events = sim.events, endLoop = events.find(e => e.s.startsWith('for가 끝났습니다')), final = events[events.length - 1].snap;
  const madeShown = how === 'pool' ? endLoop.snap.made : final.made;
  if (madeShown !== +started) probs.push('모형이 보이는 만들어진 스레드 ' + madeShown + ' 실제 시작된 스레드 ' + started);
  if (final.made !== +started) probs.push('모형의 마지막 장면의 만들어진 스레드 ' + final.made + ' 실제 ' + started);
  if (final.done !== nl) probs.push('모형의 끝난 일 ' + final.done + ' 실제 출력 줄 ' + nl);
  if (how === 'pool' && endLoop.snap.q.length !== 6 - names.length) probs.push('모형의 줄에서 기다리는 일 ' + endLoop.snap.q.length + ' 실제 6 - ' + names.length);
  const srcFile = path.join(__dirname, '..', 'out', 'pool_basic', [how, size].join('-'), 'Main.java');
  const src = fs.readFileSync(srcFile, 'utf8').replace(/\r\n/g, '\n').trimEnd();
  if (src !== lesson.code(c)) probs.push('화면의 코드와 Probe가 컴파일한 소스가 다름');
  if (!probs.length) ok++; else console.log('다름: ' + k + '\n   ' + probs.join('\n   '));
}
// 모형의 모든 조합이 Probe 출력에 있는지
for (const c of combos(lesson)) if (!seen.has(JSON.stringify(c))) { total++; console.log('다름: Probe에 없는 조합 ' + JSON.stringify(c)); }

// 단계 문장이 기대는 사실
function fact(name, test) {
  total++;
  const v = factOf[name];
  if (v === undefined) { console.log('다름: FACT ' + name + ' 없음'); return; }
  const msg = test(v);
  if (!msg) ok++; else console.log('다름: FACT ' + name + ' ' + msg + '\n   ' + v);
}
// 풀을 만든 직후에는 시작된 스레드가 0개이고, 일을 맡길 때마다 풀의 스레드 수(2)까지 하나씩 만들어지고, 세 번째 일은 줄에 선다
fact('lazy', v => v === '20|1|0/-/만든 직후: 시작된 +0 풀의 스레드 0 줄 0 / submit 1번 뒤: 시작된 +1 풀의 스레드 1 줄 0 / submit 2번 뒤: 시작된 +2 풀의 스레드 2 줄 0 / submit 3번 뒤: 시작된 +2 풀의 스레드 2 줄 1' ? '' : '풀 생성과 submit에 따른 스레드 수가 다름');
// 일 6개를 맡긴 직후의 풀의 스레드 수와 줄의 일 수, 모두 끝난 뒤 풀의 스레드는 0개이고 끝난 일은 6개 (일하는 중인 스레드 수는 근사값이라 비교하지 않는다)
for (const [size, queued] of [[2, 4], [1, 5], [6, 0]]) {
  fact('queue-' + size, v => {
    const [runs, , ...rest] = v.split('|'), outs = rest.join('|').split(' ## ');
    if (+runs < 20) return '실행 횟수가 20번보다 적음';
    const re = new RegExp('^0/-/맡긴 직후: 풀의 스레드 ' + size + ' 일하는 중 \\d 줄 ' + queued + ' // 끝난 뒤: 풀의 스레드 0 끝난 일 6$');
    return outs.every(o => re.test(o)) ? '' : '맡긴 직후의 풀의 스레드 수나 줄의 일 수가 다름';
  });
}
// 번호별 스레드 이름, 일이 시작되는 차례, 동시에 일한 최대 수
const poolName = k => 'pool-1-thread-' + k;
const WHO = {
  'who-pool-2': { max: '2', ids: { 1: poolName(1), 2: poolName(2), 3: poolName(1) + '/' + poolName(2), 4: poolName(1) + '/' + poolName(2), 5: poolName(1) + '/' + poolName(2), 6: poolName(1) + '/' + poolName(2) } },
  'who-pool-1': { max: '1', ids: { 1: poolName(1), 2: poolName(1), 3: poolName(1), 4: poolName(1), 5: poolName(1), 6: poolName(1) } },
  'who-pool-6': { max: '6', ids: { 1: poolName(1), 2: poolName(2), 3: poolName(3), 4: poolName(4), 5: poolName(5), 6: poolName(6) } },
  'who-new-2': { max: '6', ids: { 1: 'Thread-0', 2: 'Thread-1', 3: 'Thread-2', 4: 'Thread-3', 5: 'Thread-4', 6: 'Thread-5' } },
};
for (const [name, w] of Object.entries(WHO)) {
  fact(name, v => {
    const [runs, exits, err, max, waves, ids] = v.split('|');
    const want = Object.entries(w.ids).map(([k, n]) => k + '=' + n + ';').join('');
    if (+runs < 20) return '실행 횟수가 20번보다 적음';
    if (exits !== '0' || err !== '-') return '종료 코드나 표준 오류가 이상함';
    if (max !== 'max=' + w.max) return '동시에 일한 최대 수 ' + max + ' (기대 max=' + w.max + ')';
    if (waves !== 'waves=true') return '일이 시작되는 차례가 묶음을 따르지 않음';
    if (ids !== want) return '번호별 스레드 이름이 다름 (기대 ' + want + ')';
    return '';
  });
}
// shutdown은 일이 끝나기를 기다리지 않는다: main 끝이 일의 출력보다 앞에 찍혔고, 줄은 모두 7개(일 6개 + main 끝)
fact('shutdown', v => v === '20|0|main 끝 앞의 줄 수=0|전체 줄 수=7' ? '' : 'main 끝의 위치가 다름');
// shutdown을 지우면 일을 모두 하고도(출력 6줄) 5초 안에 끝나지 않아 강제로 끝냈다(종료 코드 -1)
fact('noshutdown', v => v === '3|-1|전체 줄 수=6' ? '' : 'shutdown을 지운 프로그램의 종료가 다름');
console.log('일치 ' + ok + ' / ' + total);  // 조합 6개 + 사실 10개

// "외부 API 호출과 타임아웃" 실습의 모형 결과를 RestClient로 실제 호출한 결과(restclient_probe.out.txt)와 대조한다
const fs = require('fs'), path = require('path');
const { load, combos } = require('../model_rows.js');
const lesson = load('restclient');
const lines = fs.readFileSync(path.join(__dirname, 'restclient_probe.out.txt'), 'utf8').split(/\r?\n/).filter(Boolean);
console.log(lines[0]);
const real = {};
for (const ln of lines) {
  if (ln.startsWith('#')) continue;
  const [k, v] = ln.split(' => '), f = {};
  v.split('|').forEach(p => { const i = p.indexOf('='); f[p.slice(0, i)] = p.slice(i + 1); });
  real[k] = f;
}
// 실제 호출에서 일어난 일을 화면의 "결과" 글로 바꾼다.
// 타임아웃이 연결 단계의 것인지 읽기 단계의 것인지는 요청이 서버에 닿았는지(served)로 가린다.
function resultOf(f) {
  if (f.ex === '-') return '200 응답을 받음';
  if (f.ex !== 'ResourceAccessException') return f.status + ' 응답을 받음';
  if (f.cause.startsWith('SocketTimeoutException')) return f.served === '1' ? '응답을 받지 못함 (읽기 타임아웃)' : '연결하지 못함 (연결 타임아웃)';
  if (f.cause.startsWith('ConnectException')) return /refused/i.test(f.cause) ? '연결하지 못함 (상대가 거절)' : '연결하지 못함 (운영체제가 포기)';
  return f.cause;
}
// 기다린 시간: 모형의 ms는 100분의 1로 줄인 기대 시간. 0은 곧바로, -1은 운영체제가 포기할 때까지(정한 타임아웃보다 훨씬 김).
function timeOk(ms, actual) { return ms === 0 ? actual < 150 : ms === -1 ? actual > 3000 : actual >= ms - 20 && actual <= ms + 300; }
let ok = 0; const all = combos(lesson);
for (const c of all) {
  const k = c.server + '|' + c.ct + '|' + c.rt, f = real[k], sim = lesson.simulate(Object.assign({}, c));
  if (!f) { console.log('실행 결과 없음: ' + k); continue; }
  const model = [sim.row[0], sim.row[1], sim.row[3], sim.cause, sim.status];
  const actual = [resultOf(f), f.ex === '-' ? '없음' : f.ex, f.served === '1' ? '처리함' : '요청이 닿지 않음', f.cause.split('(')[0], f.status];
  const tOk = timeOk(sim.ms, +f.ms);
  if (JSON.stringify(model) === JSON.stringify(actual) && tOk) ok++; else console.log('다름: ' + k + '\n   모형 ' + model.join(' | ') + ' | ' + sim.row[2] + ' (기대 ' + sim.ms + 'ms)\n   실제 ' + actual.join(' | ') + ' | ' + f.ms + 'ms');
}
console.log('일치 ' + ok + ' / ' + all.length);

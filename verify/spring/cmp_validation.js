// "검증" 실습의 모형 결과를 실제 스프링 부트 서버의 응답(validation_probe.out.txt)과 대조한다
const fs = require('fs'), path = require('path');
const { load, combos } = require('../model_rows.js');
const lesson = load('validation');
const lines = fs.readFileSync(path.join(__dirname, 'validation_probe.out.txt'), 'utf8').split(/\r?\n/).filter(Boolean);
console.log(lines[0]);
const real = {};
for (const ln of lines) {
  if (ln.startsWith('#')) continue;
  const at = ln.indexOf(' => '), k = ln.slice(0, at), parts = ln.slice(at + 4).split('|'), f = { status: parts[0] };
  parts.slice(1).forEach(p => { const i = p.indexOf('='); f[p.slice(0, i)] = p.slice(i + 1); });
  real[k] = f;
}
const STATUS = { 200: '200 OK', 400: '400 Bad Request' };
// 실제 실행의 "검증기가 돌았는지(seen)"와 "어긴 제약(viol, 예: name:NotBlank)"을 화면의 '검증' 칸의 글로 옮긴다
function checked(f) {
  if (f.viol !== '-') { const [field, code] = f.viol.split(':'); return '실패: ' + field + '의 @' + code + ' 위반'; }
  return f.seen === 'true' ? '통과' : '하지 않음';
}
let ok = 0; const all = combos(lesson);
for (const c of all) {
  const k = c.how + '|' + c.con + '|' + c.val, f = real[k], sim = lesson.simulate(Object.assign({}, c));
  if (!f) { console.log('실행 결과 없음: ' + k); continue; }
  // 모형과 실제: [응답, 검증, 컨트롤러 실행, 컨트롤러가 돌려준 글, 스프링이 던진 예외]
  const model = sim.row.map(String);
  const actual = [STATUS[f.status] || f.status, checked(f), f.ctrl === 'true' ? '실행됨' : '건너뜀', f.ret, f.ex];
  // 어긴 제약이 있으면 검증기가 실제로 돈 것이어야 한다(기록 자체의 앞뒤가 맞는지)
  const sane = f.viol === '-' || f.seen === 'true';
  if (JSON.stringify(model) === JSON.stringify(actual) && sane) ok++; else console.log('다름: ' + k + '\n   모형 ' + model.join(' | ') + '\n   실제 ' + actual.join(' | '));
}
console.log('일치 ' + ok + ' / ' + all.length);

// "요청 매핑과 파라미터 바인딩" 실습의 모형 결과를 실제 스프링 부트 서버의 응답(binding_probe.out.txt)과 대조한다
const fs = require('fs'), path = require('path');
const { load, combos } = require('../model_rows.js');
const lesson = load('binding');
const lines = fs.readFileSync(path.join(__dirname, 'binding_probe.out.txt'), 'utf8').split(/\r?\n/).filter(Boolean);
console.log(lines[0]);
const real = {};
for (const ln of lines) {
  if (ln.startsWith('#')) continue;
  const [k, v] = ln.split(' => '), parts = v.split('|'), f = { status: parts[0] };
  parts.slice(1).forEach(p => { const i = p.indexOf('='); f[p.slice(0, i)] = p.slice(i + 1); });
  real[k] = f;
}
const STATUS = { 200: '200 OK', 400: '400 Bad Request', 404: '404 Not Found', 415: '415 Unsupported Media Type' };
// 화면의 "거절한 이유"가 실제로 던져진 예외와 어울리는지
const REASON = { '-': ['-'], MissingServletRequestParameterException: ['필수 값이 없음'], MethodArgumentTypeMismatchException: ['숫자로 바꿀 수 없음'], MethodArgumentNotValidException: ['숫자로 바꿀 수 없음'], HttpMessageNotReadableException: ['본문이 없음', '숫자로 바꿀 수 없음'], HttpMediaTypeNotSupportedException: ['읽을 수 없는 본문 형식'], NoResourceFoundException: ['맞는 주소가 없음'] };
let ok = 0; const all = combos(lesson);
for (const c of all) {
  const k = c.how + '|' + c.req, f = real[k], sim = lesson.simulate(Object.assign({}, c));
  if (!f) { console.log('실행 결과 없음: ' + k); continue; }
  // 모형: [응답, 컨트롤러 실행, 받은 값(설명이 붙으면 첫 낱말만), 예외 이름]
  const model = [sim.row[0], sim.row[1], sim.row[2].split(' ')[0], sim.ex];
  const actual = [STATUS[f.status] || f.status, f.ctrl === 'true' ? '실행됨' : '건너뜀', f.got, f.ex];
  const reasonOk = (REASON[f.ex] || []).includes(sim.row[3]) && (f.ex !== 'HttpMessageNotReadableException' || (sim.row[3] === '본문이 없음') === !lesson.REQS[c.req].body);
  if (JSON.stringify(model) === JSON.stringify(actual) && reasonOk) ok++; else console.log('다름: ' + k + '\n   모형 ' + model.join(' | ') + ' | ' + sim.row[3] + '\n   실제 ' + actual.join(' | '));
}
console.log('일치 ' + ok + ' / ' + all.length);

// "REST API와 메시지 컨버터" 실습의 모형 결과를 실제 스프링 부트 서버의 응답(msgconv_probe.out.txt)과 대조한다
const fs = require('fs'), path = require('path');
const { load, combos } = require('../model_rows.js');
const lesson = load('msgconv');
const lines = fs.readFileSync(path.join(__dirname, 'msgconv_probe.out.txt'), 'utf8').split(/\r?\n/).filter(Boolean);
console.log(lines[0]);
const real = {};
for (const ln of lines) {
  if (ln.startsWith('#')) continue;
  const [k, v] = ln.split(' => '), parts = v.split('|'), f = { status: parts[0] };
  parts.slice(1).forEach(p => { const i = p.indexOf('='); f[p.slice(0, i)] = p.slice(i + 1); });
  real[k] = f;
}
const STATUS = { 200: '200 OK', 201: '201 Created', 400: '400 Bad Request', 406: '406 Not Acceptable', 415: '415 Unsupported Media Type' };
// 응답 본문을 실제로 쓴 것(컨버터의 클래스 이름 또는 뷰)을 화면의 말로 바꾼다
function makerOf(f) { return f.view !== '-' ? '뷰 (화면)' : f.wrote === 'JacksonJsonHttpMessageConverter' ? 'JSON 컨버터 (Jackson)' : f.wrote === 'StringHttpMessageConverter' ? '문자열 컨버터 (글자 그대로)' : f.wrote === '-' ? '없음 (오류 응답)' : f.wrote; }
let ok = 0; const all = combos(lesson);
for (const c of all) {
  const k = c.kind + '|' + c.req, f = real[k], sim = lesson.simulate(Object.assign({}, c));
  if (!f) { console.log('실행 결과 없음: ' + k); continue; }
  const good = +f.status < 400;
  // 오류 응답의 Content-Type과 Location은 버전과 설정에 따라 달라 비교하지 않는다
  const model = [sim.row[0], sim.row[1], sim.row[3], sim.ex, sim.read, sim.wrote, sim.view, good ? sim.row[2] : '', good ? sim.loc : ''];
  const actual = [STATUS[f.status] || f.status, f.ctrl === 'true' ? '실행됨' : '건너뜀', makerOf(f), f.ex, f.read, f.wrote, f.view, good ? f.type.split(';')[0] : '', good ? f.location : ''];
  if (JSON.stringify(model) === JSON.stringify(actual)) ok++; else console.log('다름: ' + k + '\n   모형 ' + model.join(' | ') + '\n   실제 ' + actual.join(' | '));
}
console.log('일치 ' + ok + ' / ' + all.length);

// "액추에이터와 헬스 체크" 실습의 모형 결과를 실제 스프링 부트 서버의 응답(actuator_probe.out.txt)과 대조한다
const fs = require('fs'), path = require('path');
const { load, combos } = require('../model_rows.js');
const lesson = load('actuator');
const lines = fs.readFileSync(path.join(__dirname, 'actuator_probe.out.txt'), 'utf8').split(/\r?\n/).filter(Boolean);
console.log(lines[0]);
const real = {};
for (const ln of lines) {
  if (ln.startsWith('#')) continue;
  const at = ln.indexOf(' => '), k = ln.slice(0, at), v = ln.slice(at + 4);
  // 형식: 상태코드|members=이름,이름|payCalled=true|body={...}   (본문에는 |가 없지만, 안전하게 body=를 기준으로 자른다)
  const b = v.indexOf('|body='), head = v.slice(0, b).split('|');
  real[k] = { status: head[0], members: head[1].slice('members='.length), payCalled: head[2].slice('payCalled='.length), body: v.slice(b + '|body='.length) };
}
let ok = 0; const all = combos(lesson);
for (const c of all) {
  const k = c.pay + '|' + c.path + '|' + c.details + '|' + c.ready, f = real[k], sim = lesson.simulate(Object.assign({}, c));
  if (!f) { console.log('실행 결과 없음: ' + k); continue; }
  // 모형: [HTTP 상태 코드의 숫자, 묻는 구성 요소(이름순), PayHealthIndicator 실행 여부, 본문 글자 전체]
  const model = [sim.row[0].split(' ')[0], sim.members.join(','), String(sim.payCalled), sim.body];
  const actual = [f.status, f.members, f.payCalled, f.body];
  // 결과 표의 나머지 칸이 실제 본문과 어울리는지: 본문의 status, 묻는 구성 요소 목록, 구성 요소별 내용이 보이는지
  const j = JSON.parse(f.body);
  const rowOk = sim.row[1] === j.status && sim.row[2].split(', ').sort().join(',') === f.members && (sim.row[3] === '구성 요소별 상태와 세부 정보') === (j.components !== undefined)
    && (j.components === undefined || Object.keys(j.components).join(',') === f.members);
  if (JSON.stringify(model) === JSON.stringify(actual) && rowOk) ok++; else console.log('다름: ' + k + '\n   모형 ' + model.join(' | ') + ' || ' + sim.row.join(' | ') + '\n   실제 ' + actual.join(' | '));
}
console.log('일치 ' + ok + ' / ' + all.length);

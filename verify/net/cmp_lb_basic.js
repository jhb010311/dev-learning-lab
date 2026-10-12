// 기초개념 "로드 밸런서" 실습의 모형 결과를 실제 실행 결과(lb_basic_probe.out.txt)와 대조한다.
// 대조: 결과 표 세 열(A가 답한 수, B가 답한 수, 실패한 요청), 요청 6번 각각의 결과(어느 서버가 몇 번째로 답했는지, 거부당한 서버, 오류 종류),
//       서버가 메모리에 센 수, 로드 밸런서가 연결을 거부당한 요청, 서버가 받은 요청 글(GET /), 띄운 구성(서버 수, 로드 밸런서 유무, 끄는 때)이 화면의 코드와 같은 내용인지,
//       그리고 화면의 코드(code 함수)가 Probe가 쓴 코드와 같은 글인지
const fs = require('fs'), path = require('path');
const { load, combos } = require('../model_rows.js');
const lesson = load('lb_basic');
const lines = fs.readFileSync(path.join(__dirname, 'lb_basic_probe.out.txt'), 'utf8').split(/\r?\n/);
console.log(lines[0]);
const real = {}, sent = {};
lines.forEach(l => {
  if (l.startsWith('# 보낸 코드 ')) { const i = l.indexOf(' = '); sent[l.slice('# 보낸 코드 '.length, i)] = JSON.parse(l.slice(i + 3)); return; }
  if (l.startsWith('#') || !l.includes(' => ')) return;
  const [k, v] = l.split(' => '), f = {};
  v.split('|').forEach(p => { const i = p.indexOf('='); if (i > 0 && /^[a-zA-Z]+$/.test(p.slice(0, i))) f[p.slice(0, i)] = p.slice(i + 1); else f._rest = (f._rest || []).concat(p); });
  real[k] = f;
});
let ok = 0, n = 0;
for (const c of combos(lesson)) {
  n++;
  const k = [c.servers, c.down].join('|'), f = real[k], probs = [];
  if (!f) { console.log('실행 결과 없음: ' + k); continue; }
  const lb = c.servers === 'lb', sim = lesson.simulate(Object.assign({}, c));
  // 결과 표
  const want = [f.a + '번', lb ? f.b + '번' : '서버 B 없음', f.fail + '번' + (+f.fail ? ' (연결 거부 오류)' : '')];
  if (JSON.stringify(sim.row) !== JSON.stringify(want)) probs.push('표 모형 ' + sim.row.join(' | ') + '\n   실제 ' + want.join(' | '));
  // 요청마다의 결과
  if (sim.trace.join(';') !== f.reqs) probs.push('요청별 결과 모형 ' + sim.trace.join(';') + '\n   실제 ' + f.reqs);
  // 실패한 요청의 종류는 모두 연결 거부 오류
  f.reqs.split(';').filter(x => x.startsWith('오류')).forEach(x => { if (x !== '오류ECONNREFUSED') probs.push('오류 종류가 연결 거부가 아님: ' + x); });
  // 서버가 메모리에 센 수 = 클라이언트가 받은 답에 적힌 수의 마지막 값 = 답한 수
  if (f.memA !== f.a) probs.push('서버 A 메모리의 수 ' + f.memA + ' 답한 수 ' + f.a);
  if (lb && f.memB !== f.b) probs.push('서버 B 메모리의 수 ' + f.memB + ' 답한 수 ' + f.b);
  // 로드 밸런서가 거부당한 기록: 끄는 조합에서는 5번째 요청에서 A가 한 번, 아니면 없음
  const wantRef = lb && c.down ? '5번째 요청: A:ECONNREFUSED' : '(없음)';
  if (f.refused !== wantRef) probs.push('거부 기록 기대 ' + wantRef + ' 실제 ' + f.refused);
  if (lb && f.turns !== 'ABABAB') probs.push('번갈아 도는 차례 기대 ABABAB 실제 ' + f.turns);
  if (f.sawA !== 'GET / HTTP/1.1') probs.push('서버가 받은 요청 글 ' + f.sawA);
  // 띄운 구성이 화면의 코드와 같은 내용인가
  const code = lesson.code(Object.assign({}, c)), setup = [f.setup].concat(f._rest || []).join('|');
  const wantSetup = '서버 ' + (lb ? 2 : 1) + '대|로드 밸런서 ' + (lb ? '있음' : '없음') + '|요청 6번|서버 A 끄기 ' + (c.down ? '요청 3번 뒤' : '안 함');
  if (setup !== wantSetup) probs.push('띄운 구성 ' + setup + ' 기대 ' + wantSetup);
  if (code.includes('서버 B') !== lb) probs.push('코드의 서버 B 유무가 구성과 다름');
  if (code.includes('로드 밸런서 (') !== lb) probs.push('코드의 로드 밸런서 유무가 구성과 다름');
  if (code.includes('요청 6번') !== true || code.includes('요청 3번을 보낸 뒤 서버 A 프로그램을 끈다') !== !!c.down) probs.push('코드의 요청 수나 끄는 줄이 구성과 다름');
  // 화면의 코드 = Probe가 쓴 코드
  if (code !== sent[k]) probs.push('화면의 코드와 Probe의 코드가 다름\n   화면 ' + JSON.stringify(code) + '\n   실제 ' + JSON.stringify(sent[k]));
  if (!probs.length) ok++; else console.log('다름: ' + k + '\n   ' + probs.join('\n   '));
}
console.log('일치 ' + ok + ' / ' + n);

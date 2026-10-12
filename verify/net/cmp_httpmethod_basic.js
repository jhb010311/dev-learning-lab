// 기초개념 "HTTP 메서드" 실습의 모형 결과를 실제 실행 결과(httpmethod_basic_probe.out.txt)와 대조한다.
// 대조: 결과 표 세 열(응답, 서버의 메모 수, 서버의 것이 바뀜), 단계 문장이 기대는 사실(서버가 받은 메서드·경로·본문, 405의 Allow 줄,
//       GET 확인 읽기가 서버의 실제 목록과 같은가, 없는 주소는 404), 그리고 화면의 코드(code 함수)가 Probe가 쓴 화면 코드와,
//       화면 코드의 요청 부분이 실제로 보낸 글자와 같은 글인지
const fs = require('fs'), path = require('path');
const { load, combos } = require('../model_rows.js');
const lesson = load('httpmethod_basic');
const lines = fs.readFileSync(path.join(__dirname, 'httpmethod_basic_probe.out.txt'), 'utf8').split(/\r?\n/);
console.log(lines[0]);
const real = {}, screen = {}, sent = {}, facts = {};
lines.forEach(l => {
  const m = /^# (화면 코드|보낸 글) (\S+) = (.*)$/.exec(l);
  if (m) { (m[1] === '화면 코드' ? screen : sent)[m[2]] = JSON.parse(m[3]); return; }
  if (l.startsWith('# 근거 없는 주소')) { const f = {}; l.split(' => ')[1].split('|').forEach(p => { const i = p.indexOf('='); f[p.slice(0, i)] = p.slice(i + 1); }); facts.nothing = f; return; }
  if (l.startsWith('#') || !l.includes(' => ')) return;
  const [k, v] = l.split(' => '), f = {};
  v.split('|').forEach(p => { const i = p.indexOf('='); f[p.slice(0, i)] = p.slice(i + 1); });
  real[k] = f;
});
const problems = [];
let ok = 0, n = 0;
for (const c of combos(lesson)) {
  n++;
  const M = { get: 'GET', post: 'POST', delete: 'DELETE' }[c.method], T = +c.times, k = M + '|' + T, f = real[k], probs = [];
  if (!f) { console.log('실행 결과 없음: ' + k); continue; }
  const sim = lesson.simulate(Object.assign({}, c));
  // 표: 응답
  const cell = i => f['status' + i] + (f['status' + i].startsWith('405') ? ', Allow: ' + f['allow' + i] : ', 본문 "' + f['body' + i] + '"');
  const respWant = T === 1 ? cell(1) : [1, 2].map(i => i + '번째 ' + cell(i)).join(' / ');
  const want = [respWant, f.before.split(', ').length + '개 → ' + f.count + '개', f.changed === 'true' ? '바뀜' : '바뀌지 않음'];
  if (JSON.stringify(sim.row) !== JSON.stringify(want)) probs.push('표 모형 ' + sim.row.join(' | ') + '\n   실제 ' + want.join(' | '));
  // 단계 문장이 기대는 사실
  if (f.before !== 'first') probs.push('처음 목록이 first가 아님: ' + f.before);
  const seenWant = Array(T).fill(M + ' /memos' + (M === 'POST' ? ' [hello]' : '')).join(';');
  if (f.seen !== seenWant) probs.push('서버가 받은 요청 기대 ' + seenWant + ' 실제 ' + f.seen);
  const afterWant = ['first'].concat(M === 'POST' ? Array(T).fill('hello') : []).join(', ');
  if (f.after !== afterWant) probs.push('요청 뒤 목록 기대 ' + afterWant + ' 실제 ' + f.after);
  if (f.check !== f.after || f.checkSame !== 'true') probs.push('GET으로 다시 읽은 목록이 서버의 목록과 다름: ' + f.check);
  for (let i = 1; i <= T; i++) {
    const wantStatus = M === 'DELETE' ? '405 Method Not Allowed' : '200 OK';
    if (f['status' + i] !== wantStatus) probs.push(i + '번째 상태 기대 ' + wantStatus + ' 실제 ' + f['status' + i]);
    if ((f['allow' + i] === 'GET, POST') !== (M === 'DELETE')) probs.push(i + '번째 Allow 실제 ' + f['allow' + i]);
    if (M === 'DELETE' && f['body' + i] !== '') probs.push('405 본문이 비어 있지 않음');
    // POST 둘째 응답 본문은 첫째와 다르고, GET 둘째 응답 본문은 첫째와 같다 (단계 문장의 "다릅니다/같습니다")
  }
  if (T === 2 && M === 'POST' && f.body1 === f.body2) probs.push('POST 두 응답의 본문이 같음');
  if (T === 2 && M === 'GET' && f.body1 !== f.body2) probs.push('GET 두 응답의 본문이 다름');
  // 화면의 코드 = Probe가 쓴 화면 코드, 그리고 그 요청 부분 = 실제로 보낸 글자
  const code = lesson.code(Object.assign({}, c));
  if (code !== screen[k]) probs.push('화면의 코드와 Probe의 화면 코드가 다름\n   화면 ' + JSON.stringify(code) + '\n   Probe ' + JSON.stringify(screen[k]));
  const req = code.split('\n').filter(x => !x.startsWith('#')), blank = req.indexOf('');   // 요청 부분은 첫 '' 줄(요청과 # 서버 줄 사이) 앞까지
  const rows = req.slice(0, blank), wire = rows.map(x => x === '(빈 줄)' ? '' : x).join('\r\n') + (rows[rows.length - 1] === '(빈 줄)' ? '\r\n' : '');
  if (wire !== sent[k]) probs.push('화면의 요청 부분과 실제로 보낸 글자가 다름\n   화면 ' + JSON.stringify(wire) + '\n   실제 ' + JSON.stringify(sent[k]));
  if (!probs.length) ok++; else console.log('다름: ' + k + '\n   ' + probs.join('\n   '));
}
// 없는 주소는 404 (요약의 "없는 주소를 보냈을 때의 404")
if (!facts.nothing || !facts.nothing.status.startsWith('404') || facts.nothing.allow !== '(없음)') problems.push('없는 주소 GET /nothing 기대 404 실제 ' + JSON.stringify(facts.nothing));
problems.forEach(p => console.log('다름(근거): ' + p));
console.log('일치 ' + ok + ' / ' + n + (problems.length ? ' (근거 불일치 ' + problems.length + '건)' : ' (근거 사실도 모두 일치)'));

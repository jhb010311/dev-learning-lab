// 기초개념 "배포" 실습의 모형 결과를 실제 실행 결과(deploy_basic_probe.out.txt)와 대조한다.
// 대조: 결과 표 세 열(응답, 실행 중인 코드, 디스크의 소스),
//       단계 문장이 기대는 사실(고친 직후 처음 프로세스가 가진 값이 그대로인가, 껐다 켠 프로세스가 처음 프로세스와 다른가,
//       서버를 켠 횟수, 서버를 끈 사이에 요청한 조합에서 다시 켠 뒤의 요청의 답, 마지막 디스크의 값),
//       그리고 화면의 코드(code 함수)가 Probe가 실행한 할 일 목록과 같은 글인지, 남은 자식 프로세스가 0개인지
const fs = require('fs'), path = require('path');
const { load, combos } = require('../model_rows.js');
const lesson = load('deploy_basic');
const lines = fs.readFileSync(path.join(__dirname, 'deploy_basic_probe.out.txt'), 'utf8').split(/\r?\n/);
console.log(lines[0]);
const real = {}, sent = {}, problems = [];
lines.forEach(l => {
  if (l.startsWith('# 실행한 코드 ')) { const i = l.indexOf(' = '); sent[l.slice('# 실행한 코드 '.length, i)] = JSON.parse(l.slice(i + 3)); return; }
  if (l.startsWith('# 남은 자식 프로세스 ')) { if (l !== '# 남은 자식 프로세스 0개') problems.push(l); return; }
  if (l.startsWith('#') || !l.includes(' => ')) return;
  const [k, v] = l.split(' => '), f = {};
  v.split('|').forEach(p => { const i = p.indexOf('='); f[p.slice(0, i)] = p.slice(i + 1); });
  real[k] = f;
});
let ok = 0, n = 0;
for (const c of combos(lesson)) {
  n++;
  const k = [c.edit, c.restart, c.restart ? c.when : 'after'].join('|'), f = real[k], probs = [];
  if (!f) { console.log('실행 결과 없음: ' + k); continue; }
  const sim = lesson.simulate(Object.assign({}, c));
  const refused = f.response.startsWith('(연결 거부:ECONNREFUSED');
  const want = [refused ? '연결 거부 오류' : f.response, f.running === '(프로세스 없음)' ? '없음 (서버가 꺼져 있음)' : f.running, f.disk];
  if (JSON.stringify(sim.row) !== JSON.stringify(want)) probs.push('표 모형 ' + sim.row.join(' | ') + '\n   실제 ' + want.join(' | '));
  // 단계 문장이 기대는 사실
  if (c.edit && f.afterEditRunning !== sim.afterEdit) probs.push('고친 직후 처음 프로세스가 가진 값: 모형 ' + sim.afterEdit + ' 실제 ' + f.afterEditRunning);
  if (!c.edit && f.afterEditRunning !== '(고치지 않음)') probs.push('고치지 않았는데 고친 직후 값이 있음 ' + f.afterEditRunning);
  if (f.sameProc !== sim.sameProc) probs.push('요청에 답한 프로세스가 처음 프로세스인가: 모형 ' + sim.sameProc + ' 실제 ' + f.sameProc);
  if (+f.starts !== sim.starts) probs.push('서버를 켠 횟수: 모형 ' + sim.starts + ' 실제 ' + f.starts);
  if (sim.later && f.later !== sim.later) probs.push('다시 켠 뒤 요청의 답: 모형 ' + sim.later + ' 실제 ' + f.later);
  if (f.disk !== f.finalDisk) probs.push('요청 뒤 디스크 파일이 바뀜: ' + f.disk + ' → ' + f.finalDisk);
  if (c.edit && f.disk !== '버전 2' || !c.edit && f.disk !== '버전 1') probs.push('디스크 값이 고친 여부와 다름: ' + f.disk);
  // 화면의 코드 = Probe가 실행한 할 일 목록
  const code = lesson.code(Object.assign({}, c));
  if (code !== sent[k]) probs.push('화면의 코드와 Probe가 실행한 목록이 다름\n   화면 ' + JSON.stringify(code) + '\n   실제 ' + JSON.stringify(sent[k]));
  if (!probs.length) ok++; else console.log('다름: ' + k + '\n   ' + probs.join('\n   '));
}
problems.forEach(p => console.log('다름(근거): ' + p));
console.log('일치 ' + ok + ' / ' + n + (problems.length ? ' (근거 불일치 ' + problems.length + '건)' : ' (근거 사실도 모두 일치)'));

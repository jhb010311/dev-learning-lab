// 기초개념 "배포"(deploy_basic) 실습의 모형 결과를 실제 실행 결과(deploy_basic_probe_jdk.out.txt)와 대조한다.
// (2026-10-23부터 실제 JDK·스프링 부트로 실행한 결과와 대조한다. 예전 Node.js 서버 실행 결과는 deploy_basic_probe.out.txt에 그대로 남겨 두었다.)
// 대조: 결과 표 네 열(응답, 돌고 있는 서버의 코드, jar 파일의 코드, 소스 파일의 코드),
//       단계 문장이 기대는 사실(jar를 새로 만든 직후 켜 둔 서버의 답, 끄기 직전 서버의 답, 요청 때 8080 포트를 연 프로세스가 처음 켠 것인지 다시 켠 것인지,
//       서버를 켠 횟수, jar를 만든 횟수, 끈 사이에 요청한 조합에서 다시 켠 뒤의 답, 서버가 8080 포트에서 켜졌는지),
//       그리고 화면의 코드(code 함수)가 Probe가 실행한 글과 같은지, 남은 자식 프로세스가 0개인지
const fs = require('fs'), path = require('path');
const { load, combos } = require('../model_rows.js');
const lesson = load('deploy_basic');
const lines = fs.readFileSync(path.join(__dirname, 'deploy_basic_probe_jdk.out.txt'), 'utf8').split(/\r?\n/);
console.log(lines[0]);
const real = {}, sent = {}, problems = [];
let locked = 0;
lines.forEach(l => {
  if (l.startsWith('# 실행한 코드 ')) { const i = l.indexOf(' = '); sent[l.slice('# 실행한 코드 '.length, i)] = JSON.parse(l.slice(i + 3)); return; }
  if (l.startsWith('# 남은 자식 프로세스 ')) { if (l !== '# 남은 자식 프로세스 0개') problems.push(l); return; }
  if (l.startsWith('#') || !l.includes(' => ')) return;
  const [k, v] = l.split(' => '), f = {};
  v.split('|').forEach(p => { const i = p.indexOf('='); f[p.slice(0, i)] = p.slice(i + 1); });
  real[k] = f;
});
const refused = s => /^\(curl 7: .*(Failed to connect|Could not connect)/.test(s);
let ok = 0, n = 0;
const seen = new Set();
for (const c of combos(lesson)) {
  const k = [c.edit, c.build, c.restart, c.restart ? c.when : 'after'].join('|');
  if (seen.has(k)) continue; seen.add(k); n++;
  const f = real[k], probs = [];
  if (!f) { console.log('실행 결과 없음: ' + k); continue; }
  const sim = lesson.simulate(Object.assign({}, c));
  const down = refused(f.response);
  if (f.response.startsWith('(curl') && !down) probs.push('curl이 연결 거부가 아닌 오류: ' + f.response);
  const want = [down ? '연결 거부 오류' : f.response, down ? (f.listenPid === '(없음)' ? '없음 (서버가 꺼져 있음)' : '(포트에 다른 프로세스 ' + f.listenPid + ')') : f.response, f.jar, f.src];
  if (JSON.stringify(sim.row) !== JSON.stringify(want)) probs.push('표 모형 ' + sim.row.join(' | ') + '\n   실제 ' + want.join(' | '));
  const wantProc = { 'true': 'first', 'false': 'restarted', '(해당 없음)': '(없음)' }[sim.sameProc];
  if (f.listenPid !== wantProc) probs.push('요청 때 8080 포트를 연 프로세스: 모형 ' + wantProc + ' 실제 ' + f.listenPid);
  if (+f.starts !== sim.starts) probs.push('서버를 켠 횟수: 모형 ' + sim.starts + ' 실제 ' + f.starts);
  if (+f.builds !== sim.builds) probs.push('jar를 만든 횟수: 모형 ' + sim.builds + ' 실제 ' + f.builds);
  if (c.restart && f.beforeStop !== sim.beforeStop) probs.push('끄기 직전 서버의 답: 모형 ' + sim.beforeStop + ' 실제 ' + f.beforeStop);
  if (!c.restart && f.beforeStop !== '(끄지 않음)') probs.push('끄지 않았는데 끄기 직전 기록이 있음 ' + f.beforeStop);
  // 단계 문장: jar를 새로 만든 직후에도 켜 둔 서버는 "버전 1"로 답한다
  if (c.build && f.afterBuild !== '버전 1') probs.push('jar를 새로 만든 직후 켜 둔 서버의 답: 실제 ' + f.afterBuild);
  if (sim.later && f.later !== sim.later) probs.push('다시 켠 뒤 요청의 답: 모형 ' + sim.later + ' 실제 ' + f.later);
  if (f.port !== '8080') probs.push('Tomcat이 켜진 포트: ' + f.port);
  if (f.jarLocked === 'true') locked++;
  const code = lesson.code(Object.assign({}, c));
  if (code !== sent[k]) probs.push('화면의 코드와 Probe가 실행한 글이 다름');
  if (!probs.length) ok++; else console.log('다름: ' + k + '\n   ' + probs.join('\n   '));
}
problems.forEach(p => console.log('다름(근거): ' + p));
console.log('참고: 켜 둔 서버가 연 app.jar를 jar --create가 바꾸지 못해 그 자리 덮어쓰기로 바꾼 조합 ' + locked + '개 (Windows의 파일 잠금)');
console.log('일치 ' + ok + ' / ' + n + (problems.length ? ' (근거 불일치 ' + problems.length + '건)' : ' (근거 사실도 모두 일치)'));

// 기초개념 "Git 커밋과 브랜치" 실습의 모형 결과를 실제 git 실행 결과(git_basic_probe.out.txt)와 대조한다.
// 대조: 결과 표 다섯 열, 단계마다의 상태(지금 있는 브랜치, 두 브랜치가 가리키는 커밋, 커밋 수, 폴더의 memo.txt, git status, 커밋 안의 memo.txt)가
//       줄마다 실제로 잰 상태와 같은지(단계 수 = 실행한 줄 수), 화면의 코드가 실제로 실행한 글과 같은지,
//       단계 문장이 기대는 사실(첫 커밋의 부모 없음, 둘째 커밋의 부모, .git/HEAD와 브랜치 파일, 커밋하지 않은 변경이 따라오는 switch의 출력 등)
const fs = require('fs'), path = require('path');
const { load, combos } = require('../model_rows.js');
const lesson = load('git_basic');
const lines = fs.readFileSync(path.join(__dirname, 'git_basic_probe.out.txt'), 'utf8').split(/\r?\n/);
console.log(lines[0]);
const parse = v => { const f = {}; v.split('|').forEach(p => { const i = p.indexOf('='); f[p.slice(0, i)] = p.slice(i + 1); }); return f; };
const real = {}, sent = {}, states = {}, facts = {}, outs = {}, init = {};
let ref = [];
lines.forEach(l => {
  let m;
  if ((m = /^# 보낸 코드 (\S+) = (.*)$/.exec(l))) { sent[m[1]] = JSON.parse(m[2]); return; }
  if ((m = /^# 상태 (\S+) (\d+) (".*") => (.*)$/.exec(l))) { (states[m[1]] = states[m[1]] || [])[+m[2]] = { line: JSON.parse(m[3]), s: parse(m[4]) }; return; }
  if ((m = /^# 사실 init 직후 (\S+) = (.*)$/.exec(l))) { init[m[1]] = parse(m[2]); return; }
  if ((m = /^# 사실 (\S+) = (.*)$/.exec(l))) { facts[m[1]] = parse(m[2]); return; }
  if ((m = /^# 출력 (\S+) (".*?") => 종료 (\d+) stdout=(".*?") stderr=(".*")$/.exec(l))) { (outs[m[1]] = outs[m[1]] || {})[JSON.parse(m[2])] = { code: +m[3], out: JSON.parse(m[4]), err: JSON.parse(m[5]) }; return; }
  if ((m = /^# 참고 .* (".*?") => 종료 (\d+) stdout=(".*?") stderr=(".*")$/.exec(l))) { ref.push({ line: JSON.parse(m[1]), code: +m[2], out: JSON.parse(m[3]), err: JSON.parse(m[4]) }); return; }
  if (l.startsWith('#') || !l.includes(' => ')) return;
  const [k, v] = l.split(' => ');
  real[k] = parse(v);
});
let ok = 0, n = 0; const problems = [];
for (const c of combos(lesson)) {
  n++;
  const key = c.commit2 + '|' + c.back, f = real[key], probs = [];
  if (!f) { console.log('실행 결과 없음: ' + key); continue; }
  const sim = lesson.simulate(Object.assign({}, c));
  const want = [f.branch, f.main, f.feature, f.memo, f.mainFile + ' / ' + f.featFile];
  if (JSON.stringify(sim.row) !== JSON.stringify(want)) probs.push('표 모형 ' + sim.row.join(' | ') + '\n   실제 ' + want.join(' | '));
  // 화면의 코드 = 실제로 실행한 글
  const code = lesson.code(Object.assign({}, c));
  if (code !== sent[key]) probs.push('화면의 코드와 실행한 글이 다름\n   화면 ' + JSON.stringify(code) + '\n   실제 ' + JSON.stringify(sent[key]));
  // 단계마다의 상태 = 줄마다 잰 상태
  const run = code.split('\n').filter(x => x[0] !== '#'), st = states[key] || [];
  if (sim.events.length !== run.length || st.length !== run.length) probs.push('단계 수 ' + sim.events.length + ' 실행한 줄 수 ' + run.length + ' 잰 상태 수 ' + st.length);
  else sim.events.forEach((e, i) => {
    const a = e.snap, b = st[i];
    if (b.line !== run[i]) probs.push((i + 1) + '번째 줄이 다름: ' + b.line + ' / ' + run[i]);
    ['cur', 'main', 'feature', 'file', 'status', 'mainFile', 'featFile'].forEach(k => { if (String(a[k]) !== b.s[k]) probs.push((i + 1) + '번째 단계(' + run[i] + ') ' + k + ' 모형 ' + JSON.stringify(a[k]) + ' 실제 ' + JSON.stringify(b.s[k])); });
    if (String(a.count) !== b.s.count) probs.push((i + 1) + '번째 단계(' + run[i] + ') count 모형 ' + a.count + ' 실제 ' + b.s.count);
  });
  // 문장이 기대는 사실
  const fa = facts[key], ia = init[key], o = outs[key] || {};
  const need = (cond, msg) => { if (!cond) probs.push('사실 불일치: ' + msg); };
  need(ia && ia['HEAD파일'] === '"ref: refs/heads/main"' && ia['refs/heads/main 파일'] === '(없음)', 'git init 직후 HEAD는 main을 가리키고 main 브랜치 파일은 아직 없음 ' + JSON.stringify(ia));
  need(fa && fa['HEAD파일'] === '"ref: refs/heads/' + f.branch + '"', '.git/HEAD가 지금 있는 브랜치를 가리킴 ' + (fa && fa['HEAD파일']));
  need(fa && fa['main파일은 해시 하나'].startsWith('true(41') && fa['feature파일은 해시 하나'].startsWith('true(41'), '브랜치 파일은 커밋 번호 하나(41바이트)');
  need(fa && fa['main과 feature가 같은 커밋'] === String(!c.commit2), 'main과 feature가 같은 커밋인지 ' + (fa && fa['main과 feature가 같은 커밋']));
  need(fa && fa['첫 커밋의 부모 수'] === '0', '첫 커밋의 부모 수 0');
  need(fa && fa['feature 끝 커밋의 부모'] === (c.commit2 ? '커밋 1' : ''), '둘째 커밋의 부모 ' + (fa && fa['feature 끝 커밋의 부모']));
  need(fa && fa['커밋 1의 memo.txt'] === '"v1\\n"' && fa['커밋 1의 파일 목록'] === '"memo.txt"', '커밋 1에는 memo.txt(v1)가 든다');
  need(fa && fa['커밋 메시지'] === JSON.stringify(c.commit2 ? ['첫 커밋', '둘째 커밋'] : ['첫 커밋']), '커밋 메시지 ' + (fa && fa['커밋 메시지']));
  const sw = o['git switch main'];
  if (c.back === 'main') {
    need(sw && sw.code === 0, 'git switch main이 성공');
    need(c.commit2 ? sw.out === '' : sw.out === 'M\tmemo.txt\n', 'git switch main의 출력 ' + JSON.stringify(sw && sw.out));
    need(sw.err === "Switched to branch 'main'\n", 'switch 메시지 ' + JSON.stringify(sw.err));
  }
  const sc = o['git switch -c feature'];
  need(sc && sc.code === 0 && sc.err === "Switched to a new branch 'feature'\n", 'switch -c 메시지');
  if (!probs.length) ok++; else console.log('다름: ' + key + '\n   ' + probs.join('\n   '));
}
// 화면 조합 밖에서 따로 확인한 참고 실행(assume): 두 브랜치의 memo.txt가 다를 때 커밋하지 않은 변경이 있으면 switch가 막힘
const blocked = ref.filter(r => r.line === 'git switch feature')[0];
if (!blocked || blocked.code === 0 || blocked.err.indexOf('would be overwritten') < 0) problems.push('참고 실행: 막히지 않았거나 메시지가 다름 ' + JSON.stringify(blocked));
const catRef = ref.filter(r => r.line === 'cat memo.txt')[0];
if (!catRef || catRef.out !== 'v3\n') problems.push('참고 실행: 막힌 뒤 폴더의 memo.txt가 v3가 아님');
problems.forEach(p => console.log('다름(근거): ' + p));
console.log('일치 ' + ok + ' / ' + n + (problems.length ? ' (근거 불일치 ' + problems.length + '건)' : ' (단계별 상태와 근거 사실도 모두 일치)'));

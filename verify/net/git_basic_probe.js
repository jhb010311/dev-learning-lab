// 기초개념 "Git 커밋과 브랜치" 실습의 모든 설정 조합(둘째 커밋 2 x 돌아가기 2 = 4)을 실제 git으로 실행한다.
// 조합마다 verify/out/git_basic/<실행 번호>/<조합>/ 아래의 새 빈 폴더에서 화면의 코드를 한 줄씩 그대로 실행한다.
//   - 이 저장소(E:\dev\dev-learning-lab) 자체에는 git 명령을 쓰지 않는다. 모든 명령의 cwd는 그 새 폴더이고,
//     GIT_CEILING_DIRECTORIES를 그 폴더의 부모로 줘서 폴더에 자기 .git이 없으면 상위 저장소로 올라가지 못하게 한다.
//   - 첫 줄 git init 직후, 다른 명령을 쓰기 전에 "이 폴더에 자기 .git이 있고 git이 보는 최상위가 이 폴더인지"를 확인한다.
//   - 사용자 이름·메일은 그 명령에만 -c로 준다. 전역·시스템 설정은 읽지 않게 한다(GIT_CONFIG_GLOBAL=빈 파일, GIT_CONFIG_NOSYSTEM=1).
//   - echo와 cat은 Git Bash(bash -c)가 실제로 실행한다. git 줄은 git.exe를 인자 목록으로 직접 실행한다.
// 사용: node verify/net/git_basic_probe.js     결과는 verify/net/git_basic_probe.out.txt에 쓴다.
// 한 줄의 모양: 둘째커밋|돌아가기 => branch=지금 있는 브랜치|main=main이 가리키는 커밋 번호|feature=...|memo=cat이 낸 글|mainFile=main 커밋 안의 memo.txt|featFile=...|status=...|count=...
// '# 보낸 코드'는 실행한 코드 전체, '# 출력'은 각 줄의 종료 코드와 출력 원문, '# 사실'은 단계 문장이 기대는 사실을 따로 잰 것이다.
const { spawnSync } = require('child_process'), fs = require('fs'), path = require('path');
const { load } = require('../model_rows.js');
const lesson = load('git_basic');
const ROOT = path.join(__dirname, '..', 'out', 'git_basic');
const RUN = String(Date.now());
const GIT = 'E:/Git/mingw64/bin/git.exe', BASH = 'E:/Git/usr/bin/bash.exe';
fs.mkdirSync(ROOT, { recursive: true });
const EMPTY_CFG = path.join(ROOT, 'empty.gitconfig');
if (!fs.existsSync(EMPTY_CFG)) fs.writeFileSync(EMPTY_CFG, '');

function envFor(dir) {
  const e = Object.assign({}, process.env);
  ['GIT_DIR', 'GIT_WORK_TREE', 'GIT_INDEX_FILE', 'GIT_OBJECT_DIRECTORY'].forEach(k => delete e[k]);
  e.GIT_CEILING_DIRECTORIES = path.dirname(dir);
  e.GIT_CONFIG_GLOBAL = EMPTY_CFG; e.GIT_CONFIG_NOSYSTEM = '1';
  e.LC_ALL = 'C'; e.LANG = 'C';
  return e;
}
// 한 줄 쪼개기: 큰따옴표 안의 공백은 지킨다
function tokens(line) {
  const out = []; let cur = '', q = false, has = false;
  for (const ch of line) {
    if (ch === '"') { q = !q; has = true; continue; }
    if (ch === ' ' && !q) { if (has || cur) out.push(cur); cur = ''; has = false; continue; }
    cur += ch;
  }
  if (has || cur) out.push(cur);
  return out;
}
const ID = ['-c', 'user.name=lab', '-c', 'user.email=lab@example.com', '-c', 'core.autocrlf=false'];
function git(dir, args) {
  const r = spawnSync(GIT, args, { cwd: dir, env: envFor(dir), encoding: 'utf8' });
  return { code: r.status, out: (r.stdout || '').replace(/\r/g, ''), err: (r.stderr || '').replace(/\r/g, '') };
}
// 안전 확인: 이 폴더 자체에 .git이 있고, git이 보는 최상위가 이 폴더인가
function assertOwnRepo(dir) {
  if (!fs.existsSync(path.join(dir, '.git'))) throw new Error('이 폴더에 자기 .git이 없음: ' + dir);
  const top = git(dir, ['rev-parse', '--show-toplevel']).out.trim();
  if (path.resolve(top).toLowerCase() !== path.resolve(dir).toLowerCase()) throw new Error('git이 다른 폴더를 최상위로 봄: ' + top + ' / ' + dir);
}
// 한 줄을 실행한 직후의 상태: 지금 있는 브랜치, 두 브랜치가 가리키는 커밋 번호, 커밋 수, 폴더의 memo.txt, git status, 각 브랜치의 커밋 안에 든 memo.txt
function stateOf(dir) {
  const hashes = git(dir, ['rev-list', '--all', '--reverse', '--topo-order']).out.trim().split('\n').filter(Boolean);
  const ref = n => { const r = git(dir, ['rev-parse', '--verify', '-q', 'refs/heads/' + n]); return r.code === 0 ? '커밋 ' + (hashes.indexOf(r.out.trim()) + 1) : '없음'; };
  const blob = n => { const r = git(dir, ['show', n + ':memo.txt']); return r.code === 0 ? r.out.replace(/\n$/, '') : '없음'; };
  let file = '없음'; try { file = fs.readFileSync(path.join(dir, 'memo.txt'), 'utf8').replace(/\n$/, ''); } catch (e) {}
  const status = git(dir, ['status', '--short']).out.replace(/\n$/, '');
  return { cur: git(dir, ['branch', '--show-current']).out.trim() || '(없음)', main: ref('main'), feature: ref('feature'), count: hashes.length, file, status: status || '(깨끗함)', mainFile: blob('main'), featFile: blob('feature') };
}
function runCode(dir, code) {
  const log = []; let checked = false;
  for (const line of code.split('\n')) {
    if (line.startsWith('#')) continue;
    let r;
    if (line.startsWith('git ')) {
      if (!checked && !line.startsWith('git init')) throw new Error('git init 전에 git 명령: ' + line);
      r = git(dir, ID.concat(tokens(line).slice(1)));
      if (!checked) { assertOwnRepo(dir); checked = true; }
    } else {
      if (!checked) throw new Error('git init 전에 다른 명령: ' + line);
      const s = spawnSync(BASH, ['-c', line], { cwd: dir, env: envFor(dir), encoding: 'utf8' });
      r = { code: s.status, out: (s.stdout || '').replace(/\r/g, ''), err: (s.stderr || '').replace(/\r/g, '') };
    }
    const rec = { line, code: r.code, out: r.out, err: r.err, state: stateOf(dir) };
    if (!log.length) { const rd = f => { try { return fs.readFileSync(path.join(dir, '.git', f), 'utf8').trim(); } catch (e) { return '(없음)'; } }; rec.init = 'HEAD파일=' + JSON.stringify(rd('HEAD')) + '|refs/heads/main 파일=' + rd('refs/heads/main') + '|refs/heads 폴더 안=' + JSON.stringify(fs.existsSync(path.join(dir, '.git', 'refs', 'heads')) ? fs.readdirSync(path.join(dir, '.git', 'refs', 'heads')) : '(없음)'); }
    log.push(rec);
  }
  return log;
}

const out = [], extra = [], tag = 'git ' + spawnSync(GIT, ['--version'], { encoding: 'utf8' }).stdout.trim();
out.push('# ' + tag + ' · 조합마다 verify/out/git_basic/' + RUN + '/<조합>/ 의 새 빈 폴더 · git init -b main');
for (const commit2 of [true, false]) for (const back of ['main', 'stay']) {
  const key = commit2 + '|' + back;
  const dir = path.join(ROOT, RUN, key.replace('|', '_'));
  fs.mkdirSync(path.join(ROOT, RUN), { recursive: true });
  fs.mkdirSync(dir);
  if (fs.readdirSync(dir).length) throw new Error('빈 폴더가 아님: ' + dir);
  const code = lesson.code({ commit2, back });
  const log = runCode(dir, code);
  // 커밋 번호: 만들어진 순서(부모가 먼저)
  const hashes = git(dir, ['rev-list', '--all', '--reverse', '--topo-order']).out.trim().split('\n').filter(Boolean);
  const num = h => { const i = hashes.indexOf(h); return i < 0 ? '(없음)' : '커밋 ' + (i + 1); };
  const rev = n => git(dir, ['rev-parse', n]).out.trim();
  const mainH = rev('main'), featH = rev('feature');
  const show = n => { const r = git(dir, ['show', n + ':memo.txt']); return r.code === 0 ? r.out.replace(/\n$/, '') : '(없음)'; };
  const cat = log.filter(l => l.line.startsWith('cat '))[0];
  const status = git(dir, ['status', '--short']).out.trim();
  out.push(key + ' => ' + ['branch=' + git(dir, ['branch', '--show-current']).out.trim(), 'main=' + num(mainH), 'feature=' + num(featH), 'memo=' + cat.out.replace(/\n$/, ''), 'mainFile=' + show('main'), 'featFile=' + show('feature'), 'status=' + (status || '(깨끗함)'), 'count=' + hashes.length].join('|'));
  extra.push('# 보낸 코드 ' + key + ' = ' + JSON.stringify(code));
  extra.push('# 사실 init 직후 ' + key + ' = ' + log[0].init);
  log.forEach((l, i) => extra.push('# 상태 ' + key + ' ' + i + ' ' + JSON.stringify(l.line) + ' => ' + Object.keys(l.state).map(k => k + '=' + l.state[k]).join('|')));
  log.forEach(l => extra.push('# 출력 ' + key + ' ' + JSON.stringify(l.line) + ' => 종료 ' + l.code + ' stdout=' + JSON.stringify(l.out) + ' stderr=' + JSON.stringify(l.err)));
  // 근거: 단계 문장이 기대는 사실
  const read = f => { try { return fs.readFileSync(path.join(dir, '.git', f), 'utf8'); } catch (e) { return '(없음)'; } };
  const f = [];
  f.push('HEAD파일=' + JSON.stringify(read('HEAD').trim()));
  f.push('main파일은 해시 하나=' + (read('refs/heads/main').trim() === mainH) + '(' + read('refs/heads/main').length + '바이트)');
  f.push('feature파일은 해시 하나=' + (read('refs/heads/feature').trim() === featH) + '(' + read('refs/heads/feature').length + '바이트)');
  f.push('main과 feature가 같은 커밋=' + (mainH === featH));
  const firstH = hashes[0], parentOfFeat = git(dir, ['rev-list', '--parents', '-n', '1', featH]).out.trim().split(' ').slice(1);
  f.push('첫 커밋의 부모 수=' + (git(dir, ['rev-list', '--parents', '-n', '1', firstH]).out.trim().split(' ').length - 1));
  f.push('feature 끝 커밋의 부모=' + parentOfFeat.map(num).join(','));
  f.push('커밋 1의 memo.txt=' + JSON.stringify(git(dir, ['show', firstH + ':memo.txt']).out));
  f.push('커밋 1의 파일 목록=' + JSON.stringify(git(dir, ['ls-tree', '-r', '--name-only', firstH]).out.trim()));
  f.push('커밋 메시지=' + JSON.stringify(git(dir, ['log', '--all', '--reverse', '--format=%s']).out.trim().split('\n')));
  f.push('브랜치 목록=' + JSON.stringify(git(dir, ['branch', '--format=%(refname:short)']).out.trim().split('\n')));
  f.push('git diff --stat=' + JSON.stringify(git(dir, ['diff', '--stat']).out.trim()));
  extra.push('# 사실 ' + key + ' = ' + f.join('|'));
}
// 근거: 커밋하지 않은 변경이 다른 브랜치로 가는 길을 막는 경우도 있는가(이 실습의 조합 밖, assume의 참고용)
{
  const dir = path.join(ROOT, RUN, 'ref_conflict');
  fs.mkdirSync(dir);
  const code = ['git init -b main', 'echo v1 > memo.txt', 'git add memo.txt', 'git commit -m "첫 커밋"', 'git switch -c feature', 'echo v2 > memo.txt', 'git commit -am "둘째 커밋"', 'git switch main', 'echo v3 > memo.txt', 'git switch feature', 'cat memo.txt'].join('\n');
  const log = runCode(dir, code);
  log.forEach(l => extra.push('# 참고 변경이 있는 채로 다른 모습의 브랜치로 ' + JSON.stringify(l.line) + ' => 종료 ' + l.code + ' stdout=' + JSON.stringify(l.out) + ' stderr=' + JSON.stringify(l.err)));
}
fs.writeFileSync(path.join(__dirname, 'git_basic_probe.out.txt'), out.join('\n') + '\n' + extra.join('\n') + '\n');
console.log(out.join('\n') + '\n' + extra.join('\n'));

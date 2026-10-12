// English-version probe for the Fundamentals lab "Git commits and branches" (git_basic). Same as verify/net/git_basic_probe.js, with the English code (commit messages "First commit" and "Second commit") and English state names.
// It runs all combinations (second commit 2 x going back 2 = 4) with real git. For each combination it runs the code on the screen line by line in a new empty folder
// under verify/out/git_basic_en/<run number>/<combination>/.
//   - No git command is run in this repository (E:\dev\dev-learning-lab) itself. The cwd of every command is that new folder, and GIT_CEILING_DIRECTORIES is set to its parent
//     so that git cannot climb up to a parent repository if the folder has no .git of its own.
//   - Right after the first line git init, before any other command, it checks that the folder has its own .git and that the top level git sees is this folder.
//   - The user name and email are given with -c only to the command. Global and system settings are not read (GIT_CONFIG_GLOBAL=empty file, GIT_CONFIG_NOSYSTEM=1).
//   - echo and cat are really run by Git Bash (bash -c). git lines run git.exe directly with an argument list.
// Usage: node verify/en/git_basic_en_probe.js     (result: verify/en/git_basic_en_probe.out.txt)
// Line shape: commit2|back => branch=current branch|main=commit main points to|feature=...|memo=output of cat|mainFile=memo.txt inside the main commit|featFile=...|status=...|count=...
// '# code sent' is the whole code that was run, '# output' is the exit code and raw output of each line, '# fact' is the facts that the step sentences rely on, measured separately.
const { spawnSync } = require('child_process'), fs = require('fs'), path = require('path');
const vm = require('vm');
const lesson = (() => { const L = []; const ctx = vm.createContext({ Lab: { register: o => L.push(o), fmt: String }, console, Math, JSON }); vm.runInContext(fs.readFileSync(path.join(__dirname, '..', '..', 'src', 'en', 'lessons', '271_git_basic.js'), 'utf8'), ctx); return L[0]; })();
const ROOT = path.join(__dirname, '..', 'out', 'git_basic_en');
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
// split one line into tokens: spaces inside double quotes are kept
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
// safety check: does this folder itself have .git, and is the top level git sees this folder
function assertOwnRepo(dir) {
  if (!fs.existsSync(path.join(dir, '.git'))) throw new Error('this folder has no .git of its own: ' + dir);
  const top = git(dir, ['rev-parse', '--show-toplevel']).out.trim();
  if (path.resolve(top).toLowerCase() !== path.resolve(dir).toLowerCase()) throw new Error('git sees another folder as the top level: ' + top + ' / ' + dir);
}
// state right after one line ran: the current branch, the commit numbers the two branches point to, the number of commits, memo.txt in the folder, git status, memo.txt inside the commit of each branch
function stateOf(dir) {
  const hashes = git(dir, ['rev-list', '--all', '--reverse', '--topo-order']).out.trim().split('\n').filter(Boolean);
  const ref = n => { const r = git(dir, ['rev-parse', '--verify', '-q', 'refs/heads/' + n]); return r.code === 0 ? 'Commit ' + (hashes.indexOf(r.out.trim()) + 1) : 'none'; };
  const blob = n => { const r = git(dir, ['show', n + ':memo.txt']); return r.code === 0 ? r.out.replace(/\n$/, '') : 'none'; };
  let file = 'none'; try { file = fs.readFileSync(path.join(dir, 'memo.txt'), 'utf8').replace(/\n$/, ''); } catch (e) {}
  const status = git(dir, ['status', '--short']).out.replace(/\n$/, '');
  return { cur: git(dir, ['branch', '--show-current']).out.trim() || '(none)', main: ref('main'), feature: ref('feature'), count: hashes.length, file, status: status || '(clean)', mainFile: blob('main'), featFile: blob('feature') };
}
function runCode(dir, code) {
  const log = []; let checked = false;
  for (const line of code.split('\n')) {
    if (line.startsWith('#')) continue;
    let r;
    if (line.startsWith('git ')) {
      if (!checked && !line.startsWith('git init')) throw new Error('git command before git init: ' + line);
      r = git(dir, ID.concat(tokens(line).slice(1)));
      if (!checked) { assertOwnRepo(dir); checked = true; }
    } else {
      if (!checked) throw new Error('other command before git init: ' + line);
      const s = spawnSync(BASH, ['-c', line], { cwd: dir, env: envFor(dir), encoding: 'utf8' });
      r = { code: s.status, out: (s.stdout || '').replace(/\r/g, ''), err: (s.stderr || '').replace(/\r/g, '') };
    }
    const rec = { line, code: r.code, out: r.out, err: r.err, state: stateOf(dir) };
    if (!log.length) { const rd = f => { try { return fs.readFileSync(path.join(dir, '.git', f), 'utf8').trim(); } catch (e) { return '(none)'; } }; rec.init = 'HEADfile=' + JSON.stringify(rd('HEAD')) + '|refs/heads/main file=' + rd('refs/heads/main') + '|inside refs/heads folder=' + JSON.stringify(fs.existsSync(path.join(dir, '.git', 'refs', 'heads')) ? fs.readdirSync(path.join(dir, '.git', 'refs', 'heads')) : '(none)'); }
    log.push(rec);
  }
  return log;
}

const out = [], extra = [], tag = 'git ' + spawnSync(GIT, ['--version'], { encoding: 'utf8', cwd: ROOT }).stdout.trim();
out.push('# ' + tag + ' · for each combination a new empty folder verify/out/git_basic_en/' + RUN + '/<combination>/ · git init -b main');
for (const commit2 of [true, false]) for (const back of ['main', 'stay']) {
  const key = commit2 + '|' + back;
  const dir = path.join(ROOT, RUN, key.replace('|', '_'));
  fs.mkdirSync(path.join(ROOT, RUN), { recursive: true });
  fs.mkdirSync(dir);
  if (fs.readdirSync(dir).length) throw new Error('not an empty folder: ' + dir);
  const code = lesson.code({ commit2, back });
  const log = runCode(dir, code);
  // commit numbers: in the order they were made (parent first)
  const hashes = git(dir, ['rev-list', '--all', '--reverse', '--topo-order']).out.trim().split('\n').filter(Boolean);
  const num = h => { const i = hashes.indexOf(h); return i < 0 ? '(none)' : 'Commit ' + (i + 1); };
  const rev = n => git(dir, ['rev-parse', n]).out.trim();
  const mainH = rev('main'), featH = rev('feature');
  const show = n => { const r = git(dir, ['show', n + ':memo.txt']); return r.code === 0 ? r.out.replace(/\n$/, '') : '(none)'; };
  const cat = log.filter(l => l.line.startsWith('cat '))[0];
  const status = git(dir, ['status', '--short']).out.trim();
  out.push(key + ' => ' + ['branch=' + git(dir, ['branch', '--show-current']).out.trim(), 'main=' + num(mainH), 'feature=' + num(featH), 'memo=' + cat.out.replace(/\n$/, ''), 'mainFile=' + show('main'), 'featFile=' + show('feature'), 'status=' + (status || '(clean)'), 'count=' + hashes.length].join('|'));
  extra.push('# code sent ' + key + ' = ' + JSON.stringify(code));
  extra.push('# fact right after init ' + key + ' = ' + log[0].init);
  log.forEach((l, i) => extra.push('# state ' + key + ' ' + i + ' ' + JSON.stringify(l.line) + ' => ' + Object.keys(l.state).map(k => k + '=' + l.state[k]).join('|')));
  log.forEach(l => extra.push('# output ' + key + ' ' + JSON.stringify(l.line) + ' => exit ' + l.code + ' stdout=' + JSON.stringify(l.out) + ' stderr=' + JSON.stringify(l.err)));
  // evidence: the facts that the step sentences rely on
  const read = f => { try { return fs.readFileSync(path.join(dir, '.git', f), 'utf8'); } catch (e) { return '(none)'; } };
  const f = [];
  f.push('HEADfile=' + JSON.stringify(read('HEAD').trim()));
  f.push('main file is one hash=' + (read('refs/heads/main').trim() === mainH) + '(' + read('refs/heads/main').length + ' bytes)');
  f.push('feature file is one hash=' + (read('refs/heads/feature').trim() === featH) + '(' + read('refs/heads/feature').length + ' bytes)');
  f.push('main and feature are the same commit=' + (mainH === featH));
  const firstH = hashes[0], parentOfFeat = git(dir, ['rev-list', '--parents', '-n', '1', featH]).out.trim().split(' ').slice(1);
  f.push('parents of the first commit=' + (git(dir, ['rev-list', '--parents', '-n', '1', firstH]).out.trim().split(' ').length - 1));
  f.push('parent of the feature tip commit=' + parentOfFeat.map(num).join(','));
  f.push('memo.txt in commit 1=' + JSON.stringify(git(dir, ['show', firstH + ':memo.txt']).out));
  f.push('file list of commit 1=' + JSON.stringify(git(dir, ['ls-tree', '-r', '--name-only', firstH]).out.trim()));
  f.push('commit messages=' + JSON.stringify(git(dir, ['log', '--all', '--reverse', '--format=%s']).out.trim().split('\n')));
  f.push('branch list=' + JSON.stringify(git(dir, ['branch', '--format=%(refname:short)']).out.trim().split('\n')));
  f.push('git diff --stat=' + JSON.stringify(git(dir, ['diff', '--stat']).out.trim()));
  extra.push('# fact ' + key + ' = ' + f.join('|'));
}
// evidence: can an uncommitted change block the way to another branch (outside the combinations of this lab, for reference in assume)
{
  const dir = path.join(ROOT, RUN, 'ref_conflict');
  fs.mkdirSync(dir);
  const code = ['git init -b main', 'echo v1 > memo.txt', 'git add memo.txt', 'git commit -m "First commit"', 'git switch -c feature', 'echo v2 > memo.txt', 'git commit -am "Second commit"', 'git switch main', 'echo v3 > memo.txt', 'git switch feature', 'cat memo.txt'].join('\n');
  const log = runCode(dir, code);
  log.forEach(l => extra.push('# reference: moving with a change to a branch with a different file ' + JSON.stringify(l.line) + ' => exit ' + l.code + ' stdout=' + JSON.stringify(l.out) + ' stderr=' + JSON.stringify(l.err)));
}
fs.writeFileSync(path.join(__dirname, 'git_basic_en_probe.out.txt'), out.join('\n') + '\n' + extra.join('\n') + '\n');
console.log(out.join('\n') + '\n' + extra.join('\n'));

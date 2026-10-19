Lab.register({
  id: 'git_basic', nav: 'Git commits and branches', cat: 'Fundamentals', mode: 'step', basic: true, deep: ['git'],
  title: 'What is a commit, and what does a branch point to?',
  intro: 'In Git, a commit stores the whole state of the files at one moment, and it points to the commit right before it. A branch is not a separate copy of commits. It is a label that points to one commit. When you commit on a branch, only that label moves to the new commit, and the other branches stay as they are. When you move to another branch with git switch, the files in the folder change to the state of the commit that branch points to. This lab shows the result of running the commands in the code box one line at a time in a new empty folder with real Git. You remove the second commit line and the line that goes back to main, one at a time, and you see how the commit each label points to and the memo.txt in the folder change. A commit number is a long string that is different on every run, so I wrote them as commit 1 and commit 2 in the order they were made. In the code box, a line that starts with # is a comment, echo is a command that writes text to a file, and cat is a command that shows the contents of a file.',
  terms: ['Git commit', 'Git branch', 'git switch', 'HEAD (Git)'],
  controls: [
    { id: 'commit2', label: 'Include the line git commit -am "Second commit" after echo v2 > memo.txt', type: 'check', value: true },
    { id: 'back', label: 'The line that goes back from feature to main', type: 'select', value: 'main', options: [['main', 'Include the line git switch main (go back to main)'], ['stay', 'Remove the line git switch main (stay on feature)']] },
  ],
  // q is the question shown on the question-style screen. t and d are the name and the description used in the text-only reading
  presets: [
    { t: 'Default settings', q: 'After you make a second commit on the feature branch and return to main, what happens to the commits and branches, and what does memo.txt show?', d: 'When you commit on feature, only the feature label moves to the new commit, and when you return to main, the folder changes to the state of the commit main points to (v1).', v: { commit2: true, back: 'main' } },
    { t: 'Not going back to main', q: 'What if you remove the git switch main line?', d: 'You stay on feature, so memo.txt in the folder is the state of the second commit (v2). main stays at commit 1.', v: { commit2: true, back: 'stay' } },
    { t: 'Moving to main without a second commit', q: 'What if you remove the git commit -am "Second commit" line?', d: 'The edited memo.txt comes along to main without being recorded in any commit. Both branches point to the same commit 1.', v: { commit2: false, back: 'main' } },
    { t: 'Removing both', q: 'What if you remove both the git commit -am "Second commit" line and the git switch main line?', d: 'There is only 1 commit, and both branches point to the same commit 1. The edited v2 is only in the folder.', v: { commit2: false, back: 'stay' } },
  ],
  // The lines run in this setting (comment lines are not run). The Probe checks the state against what it measured in real Git after each line.
  steps: function (c) {
    var s = [
      ['# Make this folder a Git repository (the first branch is named main)', 'git init -b main'],
      ['# Create the file memo.txt and write v1 in it', 'echo v1 > memo.txt'],
      ['# Stage memo.txt to go into the next commit', 'git add memo.txt'],
      ['# Commit (save) what you staged', 'git commit -m "First commit"'],
      ['# Create a new branch feature and switch to it', 'git switch -c feature'],
      ['# Change the contents of memo.txt to v2', 'echo v2 > memo.txt'],
    ];
    if (c.commit2) s.push(['# Stage the changed file (-a) and commit it right away', 'git commit -am "Second commit"']);
    if (c.back === 'main') s.push(['# Switch to the main branch', 'git switch main']);
    s.push(['# Show the contents of memo.txt on the screen', 'cat memo.txt']);
    return s;
  },
  code: function (c) {
    return this.steps(c).map(function (p) { return p[0] + '\n' + p[1]; }).join('\n');
  },
  label: function (c) { return (c.commit2 ? 'With a second commit' : 'No second commit') + ' · ' + (c.back === 'main' ? 'Went back to main' : 'Stayed on feature'); },
  columns: ['Current branch', 'Commit main points to', 'Commit feature points to', 'memo.txt you see now', 'memo.txt in the commits (main / feature)'],
  simulate: function (c) {
    var ev = [], sum = [], st = { cur: '(none)', main: 'none', feature: 'none', count: 0, file: 'none', status: '(clean)', mainFile: 'none', featFile: 'none' };
    function push(s, k) { ev.push({ s: s, k: k, snap: JSON.parse(JSON.stringify(st)) }); }
    var c2 = !!c.commit2, home = c.back === 'main';
    // 1: git init
    st.cur = 'main';
    push('git init -b main: this makes the folder a Git repository. A folder named .git is created inside the folder, and commits will pile up there from now on. -b main means to name the first branch main, and you will see what a branch is later. There is not a single commit yet, so there is no commit for the name main to point to.', '');
    // 2: echo v1
    st.file = 'v1'; st.status = '?? memo.txt';
    push('echo v1 > memo.txt: this creates the file memo.txt in the folder and writes v1 in it. This line is not a Git command. It is a command that writes a file in the folder. Git only reports this file as a new file (??) that has not yet been put in the repository.', '');
    // 3: git add
    st.status = 'A  memo.txt';
    push('git add memo.txt: this stages the current state of memo.txt (v1) to go into the next commit. It is not a commit yet. Git reports that this file is staged for the commit (A).', '');
    // 4: first commit
    st.count = 1; st.main = 'Commit 1'; st.status = '(clean)'; st.mainFile = 'v1';
    push('git commit -m "First commit": this saves what you staged as a commit. Commit 1 was made, and it records the state of memo.txt at this moment (v1). It is the very first commit, with no commit before it. A label that points to one commit like this is called a branch, and the main branch now points to commit 1. The file in the folder and the state in the commit are the same, so there is no unsaved change.', 'good');
    // 5: git switch -c feature
    st.cur = 'feature'; st.feature = 'Commit 1'; st.featFile = 'v1';
    push('git switch -c feature: this creates a new label named feature that points to commit 1, where you are now, and moves the branch you are on to feature. You made a branch, but the commits did not increase and there is still 1. A branch is not a copy of commits. It only points to one commit, so main and feature both point to the same commit 1.', 'good');
    // 6: echo v2
    st.file = 'v2'; st.status = ' M memo.txt';
    push('echo v2 > memo.txt: this changes the inside of memo.txt in the folder to v2. Only the file in the folder changed, and memo.txt as recorded in commit 1 is still v1. Git reports it as a change that was edited but not committed (M). This v2 is not in any commit yet.', '');
    // 7: second commit
    if (c2) {
      st.count = 2; st.feature = 'Commit 2'; st.status = '(clean)'; st.featFile = 'v2';
      push('git commit -am "Second commit": this stages the changed memo.txt (-a) and saves it as commit 2. Commit 2 points to the commit right before it, commit 1, and it records the state of memo.txt at this moment (v2). The label of the branch you are on, feature, moved to commit 2. The main label did not move, so it still points to commit 1, and memo.txt as recorded in commit 1 is still v1.', 'good');
    }
    // 8: git switch main
    if (home) {
      st.cur = 'main';
      if (c2) {
        st.file = 'v1'; st.status = '(clean)';
        push('git switch main: this moves the branch you are on to main and changes the files in the folder to the state of commit 1, which main points to. So memo.txt in the folder became v1. Commit 2 did not disappear. The feature label still points to it.', 'good');
      } else {
        push('git switch main: this moves the branch you are on to main. You did not make a second commit, so main and feature point to the same commit 1, and the state of memo.txt in the two branches is also the same (v1). There was nothing to change in the files, so Git did not stop the move, and the uncommitted v2 came along in the folder. Git reports M memo.txt.', 'bad');
      }
    }
    // 9: cat
    if (c2 && home) push('cat memo.txt: this shows memo.txt in the folder on the screen. It is v1. You edited it to v2 on feature and committed it, but that state is recorded in commit 2, and the folder now shows the state of commit 1, which main points to.', 'good');
    else if (c2) push('cat memo.txt: this shows memo.txt in the folder on the screen. It is v2. You did not go back to main, so you are still on feature, and the file in the folder is the state of commit 2, which feature points to. main stays at commit 1.', 'good');
    else if (home) push('cat memo.txt: this shows memo.txt in the folder on the screen. It is v2. Even though you are on main, memo.txt as recorded in commit 1, which main points to, is v1. v2 is an uncommitted change, so it is recorded in no commit and exists only in the folder.', 'bad');
    else push('cat memo.txt: this shows memo.txt in the folder on the screen. It is v2. You are still on feature, and memo.txt as recorded in commit 1, which feature points to, is v1. v2 is an uncommitted change, so it is recorded in no commit and exists only in the folder.', 'bad');
    // Summary
    if (c2 && home) {
      sum.push('A commit stores the whole state of the files at one moment, and it points to the commit right before it. A branch (main, feature) is not a copy of commits but a label that points to one commit. When you commit on feature, only the feature label moves to commit 2 and main stays at commit 1, so when you return to main, memo.txt is v1.');
      sum.push('git switch main only changed the branch you are on (HEAD) to main and changed the files in the folder to the state of the commit main points to. It did not move the main or feature label. Commit 2 was not deleted. The feature label points to it.');
    } else if (c2) {
      sum.push('Without the line that goes back to main, you stay on feature, so memo.txt is v2. The file in the folder is the state of commit 2, which the branch you are on points to.');
      sum.push('Even when you committed on feature, the main label did not move. When you commit on a branch, only the label of the branch you are on moves to the new commit.');
    } else if (home) {
      sum.push('Even when you moved to main without making a second commit, Git did not stop you, and memo.txt shows v2. v2 is recorded in no commit and exists only in the folder, and main and feature point to the same commit 1.');
      sum.push('An uncommitted change is not recorded in any commit, so as in this case it follows you around the folder even when you move between branches. It is saved under the label of one branch only when you commit.');
    } else {
      sum.push('With neither the second commit nor the line that goes back to main, there is only 1 commit, and main and feature point to the same commit 1. memo.txt in the folder is v2, but it is in no commit.');
      sum.push('If you make a branch and do not commit, you only get one more label and the commits do not increase. Just editing a file does not change where a label points.');
    }
    return { events: ev, summary: sum, row: [st.cur, st.main, st.feature, st.file, st.mainFile + ' / ' + st.featFile] };
  },
  render: function (v, sim, t, H, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : null;
    if (!s) { H.text(v, 'Click Run to start from running the commands one line at a time in an empty folder.'); return; }
    var unsaved = /^.?M/.test(s.status), stTxt = { '(clean)': 'None', '?? memo.txt': 'New file that Git does not know (??)', 'A  memo.txt': 'Staged for the commit (A)', ' M memo.txt': 'Edited but not committed (M)' }[s.status] || s.status;
    H.table(v, ['Item', 'Value'], [
      { cls: '', cells: ['Current branch (HEAD)', s.cur] },
      { cls: s.main === 'none' ? 'gone' : '', cells: ['Commit main points to', s.main === 'none' ? 'Not yet' : s.main] },
      { cls: s.feature === 'none' ? 'gone' : '', cells: ['Commit feature points to', s.feature === 'none' ? 'Not yet' : s.feature] },
      { cls: s.file === 'none' ? 'gone' : '', cells: ['memo.txt in the folder', s.file === 'none' ? 'Not yet' : s.file] },
      { cls: '', cells: ['memo.txt in the commits (main / feature)', s.mainFile + ' / ' + s.featFile] },
      { cls: '', cells: ['Uncommitted changes (git status)', unsaved ? { v: stTxt, cls: 'bad' } : stTxt] },
    ], 'State of the repository');
    H.counters(v, [[s.count, 'Commits made']]);
  },
  // Diagram: on top the labels (main, feature), in the middle the commit boxes (commit 2 points to commit 1), below memo.txt in the folder. The arrow from a label to a commit is what a branch really is, and the arrow from the commit that the current branch points to into the folder appears only when the file in the folder is the state of that commit.
  draw: function (P, sim, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : null;
    var has = function (k) { return s && s[k] !== 'none'; };
    P.size(680, 304);
    P.region('rg', 10, 14, 660, 186, 'Git repository (.git)');
    var cur = s ? s.cur : '';
    P.box('tm', 100, 40, 150, 46, { cls: has('main') ? (cur === 'main' ? 'hot now' : 'wait') : 'ghost', title: 'main', sub: has('main') ? (cur === 'main' ? 'Current branch' : ' ') : 'Not yet' });
    P.box('tf', 380, 40, 150, 46, { cls: has('feature') ? (cur === 'feature' ? 'hot now' : 'wait') : 'ghost', title: 'feature', sub: has('feature') ? (cur === 'feature' ? 'Current branch' : ' ') : 'Not yet' });
    var n = s ? s.count : 0;
    P.box('c1', 100, 124, 150, 58, { cls: n >= 1 ? 'good' : 'ghost', title: 'Commit 1', sub: n >= 1 ? 'memo.txt = v1' : 'Not yet' });
    P.box('c2', 380, 124, 150, 58, { cls: n >= 2 ? 'good' : 'ghost', title: 'Commit 2', sub: n >= 2 ? 'memo.txt = v2' : 'Not yet' });
    if (n >= 2) { P.arrow('par', 'c2:l', 'c1:r', { cls: 'mut' }); P.text('part', 315, 142, 'Previous', { cls: 'mut', anchor: 'middle' }); }
    if (has('main')) P.arrow('am', 'tm:b', s.main === 'Commit 1' ? 'c1:t:0.3' : 'c2:t:0.3', {});
    if (has('feature')) P.arrow('af', 'tf:b', s.feature === 'Commit 1' ? 'c1:t:0.8' : 'c2:t:0.5', {});
    var mod = s && s.file !== 'none' && /^.?M/.test(s.status);
    var curFile = s ? (cur === 'main' ? s.mainFile : s.featFile) : 'none';
    P.box('wd', 100, 214, 430, 34, { cls: !s || s.file === 'none' ? 'ghost' : mod ? 'bad' : 'plain', title: 'memo.txt in the folder', right: !s || s.file === 'none' ? 'Not yet' : mod ? s.file + ' (change not in a commit)' : s.file });
    if (s && s.file !== 'none' && !mod && curFile !== 'none') {
      var from = cur === 'main' ? s.main : s.feature;
      P.arrow('cw', from === 'Commit 1' ? 'c1:b' : 'c2:b', from === 'Commit 1' ? 'wd:t:0.15' : 'wd:t:0.85', { cls: 'good' });
    }
    P.box('n1', 14, 262, 322, 36, { cls: s && s.cur !== '(none)' ? 'wait' : 'ghost', title: 'Current branch', right: s ? s.cur : 'Not yet' });
    P.box('n2', 344, 262, 322, 36, { cls: n ? 'good' : 'ghost', title: 'Commits made', right: String(n) });
  },
  assume: 'I checked against real runs of git 2.55.0 (Windows). For all four combinations, in a new empty folder for each combination, I ran the code on the screen (the # comment lines were not run) one line at a time exactly as it is. The git commands were given to git.exe with their arguments as they are (the user name and email were given with -c only to that command, and the global settings were not read), and echo and cat were run by Git Bash. Right after each line ran, I measured the current branch, the commits that the main and feature branches point to, the number of commits made, memo.txt in the folder, git status --short, and memo.txt inside the commit of each branch, and compared them with the state of the step on the screen, and I also checked for each combination that the code on the screen is the same text as what was run. A commit number (hash) differs on every run, so I wrote them as commit 1 and commit 2 in the order they were made. I used git init -b main to make the first branch main. In the combination of this lab without the second commit line, main and feature point to the same commit 1, so the uncommitted change was not blocked and came along to main. This is because memo.txt is the same in the two branches. In a separate check outside the combinations on the screen, when memo.txt differed between the two branches (when, with main at v1 and feature at v2, you edit memo.txt to v3 on main and try to move to feature), Git blocked the move and gave the error "Your local changes to the following files would be overwritten by checkout". I did not put this blocking in the combinations on the screen, and it is behavior seen with this Git version. I confirmed that the .git/HEAD file of a new repository holds the name of the branch you are on (in the form "ref: refs/heads/main"), and that a branch file (such as .git/refs/heads/main) is a 41-byte file holding only one commit number. What I checked against documentation is Pro Git 2nd edition section 3.1 Branches in a Nutshell (a commit points to a snapshot and to its parent, a branch is a lightweight movable pointer to a commit and a simple file holding 40 characters of SHA-1, HEAD is a pointer to the branch you are on, and when you change branches the files in the working directory change, and if it cannot be done cleanly you cannot switch), the git-switch documentation (you can switch even with an unclean working directory, and it aborts if you would lose changes; -c creates a new branch and switches to it), the git-commit documentation (-a automatically stages changes to files it already knows about, -m is the message, a new commit is a child of HEAD, and the branch is updated to point to that commit), and the git-init documentation (-b is the name of the first branch). The explanation that one commit is "the whole state of the files at one moment" is an easy rewording of the snapshot description in the documentation, and I directly checked the contents of memo.txt in commit 1 and commit 2 with git show (the repository has only one file, so the whole state and the one file are the same). Merging (merge, rebase), remote repositories, conflicts, and in what form files are stored inside a commit (objects) were not covered. The in-depth version of the same topic is covered in the in-depth lab "Merge and rebase".',
});

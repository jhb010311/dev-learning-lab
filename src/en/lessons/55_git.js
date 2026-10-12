Lab.register({
  id: 'git', nav: 'Merge and rebase', cat: 'Git', mode: 'step',
  title: 'Three ways to combine two branches',
  intro: 'While you work on the feature branch, new commits also appear on main. Whether you combine the two with merge or with rebase changes the shape of the commit graph, and if both changed the same line, you get a merge conflict.',
  terms: ['Merge and rebase', 'Merge conflict', 'Git fetch, pull, and push', 'Git-flow and GitHub Flow', 'Code review and pull requests'], ranks: ['git'],
  controls: [
    { id: 'how', label: 'How to combine', type: 'select', value: 'merge', options: [['merge', 'git merge feature on main'], ['rebase', 'git rebase main on feature, then merge'], ['squash', 'git merge --squash feature']] },
    { id: 'main', label: 'New commits appeared on main in the meantime', type: 'check', value: true },
    { id: 'conf', label: 'Both branches changed the same line of the same file', type: 'check', value: false, show: function (c) { return c.main; } },
    { id: 'pushed', label: 'The feature branch has already been pushed to the remote', type: 'check', value: false, show: function (c) { return c.how === 'rebase'; } },
  ],
  presets: [
    { t: 'Default settings', q: 'When new commits appeared on main in the meantime, what does the graph look like after git merge feature on main?', d: 'merge. A merge commit that joins the two lines is created.', v: { how: 'merge', main: true, conf: false, pushed: false } },
    { t: 'Merging after a rebase', q: 'What if you combine by running git rebase main on feature, then merge?', d: 'The commits of feature are moved and attached to the end of main. The result is a single line.', v: { how: 'rebase', main: true, conf: false, pushed: false } },
    { t: 'When main has no new commits', q: 'What if no new commits appeared on main in the meantime?', d: 'main just moves forward, with no merge commit (fast-forward).', v: { how: 'merge', main: false, conf: false, pushed: false } },
    { t: 'When both changed the same line', q: 'What if both branches changed the same line of the same file?', d: 'A merge conflict occurs. A person has to choose.', v: { how: 'merge', main: true, conf: true, pushed: false } },
    { t: 'Rebasing a branch that is already pushed', q: 'What if the feature branch has already been pushed to the remote and you run git rebase main on feature, then merge?', d: 'It now differs from the commits on the remote, so you have to push by force.', v: { how: 'rebase', main: true, conf: false, pushed: true } },
    { t: 'squash', q: 'What if you combine with git merge --squash feature?', d: 'Several commits of feature are squashed into one and added to main.', v: { how: 'squash', main: true, conf: false, pushed: false } },
  ],
  code: function (c) {
    if (c.how === 'merge') return 'git switch main\ngit merge feature' + (c.main && c.conf ? '\n# CONFLICT (content): Merge conflict in OrderService.java\n# Open the file and fix it by hand, then\ngit add OrderService.java\ngit commit' : '');
    if (c.how === 'rebase') return 'git switch feature\ngit rebase main' + (c.main && c.conf ? '\n# CONFLICT: conflict while moving commit D\n# After fixing the file\ngit add OrderService.java\ngit rebase --continue' : '') + (c.pushed && c.main ? '\ngit push --force-with-lease          # history changed, so a normal push is rejected' : '') + '\n\ngit switch main\ngit merge feature                    # fast-forward';
    return 'git switch main\ngit merge --squash feature' + (c.main && c.conf ? '\n# CONFLICT: fix the file, then git add' : '') + '\ngit commit -m "Add order cancellation"';
  },
  label: function (c) { return { merge: 'merge', rebase: 'rebase, then merge', squash: 'squash merge' }[c.how] + (c.main ? ' · new commits on main' : ' · main unchanged') + (c.main && c.conf ? ' · conflict' : '') + (c.how === 'rebase' && c.pushed ? ' · already pushed' : ''); },
  columns: ['Graph shape', 'New commits', 'Conflict resolution', 'Things to watch for'],
  simulate: function (c) {
    var ev = [], sum = [], conf = c.main && c.conf, shape, made, fix = 'None', warn = 'None';
    function push(s, k, g) { ev.push({ s: s, k: k, snap: { g: g } }); }
    var start = c.main ? 'A───B───C            ← main\n     \\\n      D───E          ← feature' : 'A───B                ← main\n     \\\n      D───E          ← feature';
    push('This is the starting state. The feature branch split off at commit B and added two commits, D and E.' + (c.main ? ' In the meantime, commit C, pushed by someone else, appeared on main.' : ' main has had no new commits since then.'), '', start);
    if (c.how === 'merge') {
      if (!c.main) { shape = 'A single line (fast-forward)'; made = 'None'; push('main has stayed at B, and feature continues after it. There is nothing to combine, so only the position that main points to is moved to E. No new commit is created (fast-forward).', 'good', 'A───B───D───E        ← main, feature'); sum.push('If the two branches have not diverged, merge only moves the pointer forward.'); }
      else {
        if (conf) { fix = 'Once (when merging)'; push('C and the commits on feature changed the same line of OrderService.java in different ways. Git cannot decide which one is right, so it stops the merge and marks both versions inside the file.', 'bad', start + '\n\n<<<<<<< HEAD\n    int limit = 10;        (from main)\n=======\n    int limit = 20;        (from feature)\n>>>>>>> feature'); push('A person opens the file, decides what to keep, removes the markers, and then runs add and commit.', '', start + '\n\n    int limit = 20;        (chosen by hand)'); }
        shape = 'Two lines + a merge commit'; made = 'Merge commit M';
        push('A new commit M that combines the contents of C and E is created. M is a merge commit with two parents (C and E). The existing commits D and E stay as they are, and the graph keeps a record of when the lines split and when they were joined.', 'good', 'A───B───C───────M    ← main\n     \\         /\n      D───────E      ← feature');
        sum.push('merge does not touch existing commits and adds one merge commit. The history stays as it really happened, but the graph gets complicated when there are many branches.');
      }
    }
    if (c.how === 'rebase') {
      if (!c.main) { shape = 'A single line'; made = 'None'; push('feature is already on top of the tip of main (B). There is nothing to rebase.', '', start); push('If you merge on main, it moves to E by fast-forward.', 'good', 'A───B───D───E        ← main, feature'); sum.push('Rebasing a branch that has not diverged changes nothing.'); }
      else {
        push('git rebase main: set aside commits D and E of feature for a moment, and move the starting point of feature to C, the tip of main.', '', 'A───B───C            ← main\n\n (commits set aside: D, E)');
        if (conf) { fix = 'Per commit (up to 2 times)'; push('When it tries to apply D on top of C again, the part where the same line was changed conflicts. The rebase stops. Fix the file and continue with git rebase --continue. If the same place conflicts again at the next commit, E, you have to resolve it one more time.', 'bad', 'A───B───C            ← main\n         \\\n          (conflict while applying D)'); }
        push('The changes of D and E are applied again on top of C, one after the other. The contents are the same, but the parent is different, so they are completely new commits, D\', E\' (the hashes are different). The original D and E are discarded.', '', 'A───B───C            ← main\n         \\\n          D\'──E\'     ← feature');
        if (c.pushed) { warn = 'Force push needed; the history no longer matches that of the people sharing the branch'; push('If you had already pushed feature to the remote, the remote has the old commits D and E, and your branch has D\', E\'. The histories differ, so a normal push is rejected and you have to overwrite by force. If a teammate has pulled that branch, their work no longer matches yours.', 'bad', 'remote feature:  A───B───D───E\nmy feature:      A───B───C───D\'──E\'\n\n→ git push --force-with-lease needed'); }
        shape = 'A single line'; made = 'D\', E\' (replace D, E)';
        push('If you merge on main, feature continues right after main, so it finishes with a fast-forward. The history becomes a single line without a merge commit.', 'good', 'A───B───C───D\'──E\'   ← main, feature');
        sum.push('rebase rewrites the history as if you had created your commits again on top of the latest main. The graph becomes clean, but the commits are replaced with new ones.');
        sum.push('Rule of thumb: you can rebase a branch that only you use, but do not rewrite the history of a branch that you share with others.');
      }
    }
    if (c.how === 'squash') {
      if (conf) { fix = 'Once'; push('You try to put the changes of feature on top of main, but the same line conflicts. Fix the file, then continue.', 'bad', start + '\n\n(conflict must be resolved)'); }
      shape = 'A single line (not linked to feature)'; made = 'One squashed commit S';
      push('All the changes made by D and E of feature are squashed into one and put on main as a new commit S. S has only one parent, the tip of main, so the graph has no line linking it to feature.', 'good', (c.main ? 'A───B───C───S        ← main' : 'A───B───S            ← main') + '\n     \\\n      D───E          ← feature (deleted after merging)');
      warn = 'The individual commits of feature are not kept on main';
      sum.push('squash tidies main into "one feature = one commit". Small commits made along the way (typo fixes, changes after review) do not remain on main. In return, the detailed history is lost, and Git does not know that feature has been merged, so you have to delete the branch.');
    }
    if (conf) sum.push('A conflict is not an error of Git. It is a request that says "two people changed the same place in different ways, so a person has to decide". The longer a branch lives and the more you change at once, the bigger the conflict. To prevent it, bring in changes from main often and merge in small pieces.');
    return { events: ev, summary: sum, row: [shape, made, fix, warn] };
  },
  render: function (v, sim, t, H, shown) {
    var last = shown[shown.length - 1];
    H.title(v, 'Commit graph (older commits on the left)');
    v.appendChild(H.el('pre', 'code', last ? last.snap.g : 'Click Run to start.'));
  },
  // Diagram: reads the commit graph drawn in text and redraws it with boxes and arrows. The top row is main, and the bottom row is feature.
  draw: function (P, sim, shown) {
    var last = shown[shown.length - 1], g = last ? last.snap.g : '', lines = g.split('\n'), tok = function (l) { return l ? (l.split('←')[0].match(/[A-Z]'?/g) || []) : []; };
    var remote = g.indexOf('remote feature') >= 0, mainLine = lines.filter(function (l) { return l.indexOf('← main') >= 0; })[0], featLine = lines.filter(function (l) { return l.indexOf('← feature') >= 0 && l.indexOf('← main') < 0; })[0];
    var top = remote ? ['A', 'B', 'C', "D'", "E'"] : tok(mainLine), low = remote ? ['D', 'E'] : tok(featLine), floating = g.indexOf('commits set aside') >= 0, applying = g.indexOf('conflict while applying') >= 0;
    if (floating) low = ['D', 'E']; if (applying) low = ['D'];
    P.size(680, 290);
    if (!last) { P.text('hint', 340, 140, 'Click Run to start', { cls: 'mut', anchor: 'middle' }); return; }
    var X = {}, fresh = { M: 1, S: 1, "D'": 1, "E'": 1 }, attach = low[0] === "D'" || applying ? top[top.length - 1] : 'B';
    top.forEach(function (t, i) { X[t] = t === 'M' ? 420 : 60 + i * 90; P.box('c_' + t, X[t] - 23, 60, 46, 30, { cls: fresh[t] ? 'hot' : 'wait', sub: t, center: true }); if (i) P.arrow('e_' + top[i - 1] + t, 'c_' + top[i - 1] + ':r', 'c_' + t + ':l'); });
    low.forEach(function (t, k) {
      var x = (X[attach] || 150) + 90 * (k + 1); X[t + '_low'] = x;
      P.box('c_' + t, x - 23, 150, 46, 30, { cls: floating ? 'ghost' : applying || remote ? 'bad' : fresh[t] ? 'hot' : 'good', sub: t, center: true });
      if (k) P.arrow('e_' + low[k - 1] + t, 'c_' + low[k - 1] + ':r', 'c_' + t + ':l');
      else if (!floating) P.arrow('e_' + attach + t, 'c_' + attach + ':b', 'c_' + t + ':l', { cls: applying ? 'bad' : '' });
    });
    if (top.indexOf('M') >= 0 && low.length) P.arrow('e_merge', 'c_' + low[low.length - 1] + ':r', 'c_M:b', { cls: 'hot' });
    var both = mainLine && mainLine.indexOf('feature') >= 0, lastTop = top[top.length - 1];
    if (lastTop) P.text('lm', X[lastTop], 48, remote ? 'My feature' : both ? 'main, feature' : 'main', { anchor: 'middle', bold: true });
    if (low.length) P.text('lf', X[low[low.length - 1] + '_low'], 200, floating ? 'Commits set aside' : applying ? 'Conflict while reapplying' : remote ? 'Remote feature (old commits)' : top.indexOf('S') >= 0 ? 'feature (deleted after merging)' : 'feature', { anchor: 'middle', bold: true, cls: applying || remote ? 'bad' : '' });
    if (g.indexOf('<<<<<<<') >= 0) P.box('cf', 60, 228, 560, 44, { cls: 'bad', title: 'Conflict: the same line was changed in different ways', sub: 'main has limit = 10, feature has limit = 20' });
    else if (g.indexOf('chosen by hand') >= 0) P.box('cf', 60, 228, 560, 44, { cls: 'good', title: 'Resolved by choosing by hand', sub: 'Decide on limit = 20 and commit' });
    else if (g.indexOf('must be resolved') >= 0) P.box('cf', 60, 228, 560, 44, { cls: 'bad', title: 'Conflict: the same line was changed in different ways', sub: 'Fix the file, then continue' });
    else if (remote) P.box('cf', 60, 228, 560, 44, { cls: 'bad', title: 'The remote and local histories differ', sub: 'A normal push is rejected. You must overwrite by force' });
    P.note('One box is one commit, and older commits are on the left. Blue is a commit of main, green is a commit of feature, and yellow is a commit that was newly created this time. A commit with an apostrophe, such as D\', has the same contents but is a different, newly created commit.');
  },
  assume: 'This is an example of a small repository with five commits. It assumes that a conflict occurs in only one place in one file. The behavior of each command follows the explanations in the official Git documentation (git-merge, git-rebase). Teams usually decide on a merge method (merge commit, squash, or rebase) and stick to it. Rather than one being correct, it is a choice of what shape to leave the history in. It was checked by creating a temporary repository with git 2.55 on the PC used to write this lab. merge created a merge commit with two parents and kept the hashes of the existing commits, and when main had no new commits, it was a fast-forward. After rebase, the hashes of D and E changed and the history became a single line without a merge commit; for a branch that was already pushed, a normal push was rejected and a force push was needed. The squash commit had one parent, and git did not recognize that feature had been merged. The conflict markers were also exactly as shown on the screen.',
});

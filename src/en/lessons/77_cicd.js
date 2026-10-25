Lab.register({
  id: 'cicd', nav: 'CI/CD pipelines', cat: 'Deployment and operations', mode: 'step',
  title: 'You push code, and a machine checks and deploys it for you',
  why: 'If code changed by several people is combined all at once only now and then, conflicts between the changes show up late, and code that works only on a developer\'s PC can go out to the production server as it is. CI/CD runs the build, tests, and deployment by a fixed procedure in a clean build environment every time code is pushed, so the change that caused a problem is found right after it is pushed.',
  use: 'When a Pull Request is opened, GitHub Actions or Jenkins runs the build and tests, and the repository is set up so that the change can be merged into the main branch only if they pass. After the merge, the process continues through creating a Docker image and deploying it to a server or Kubernetes, and if applying to production needs a person\'s confirmation, only the step just before deployment is left as a manual approval.',
  intro: 'Between changing code and getting it onto the production server, there are steps: build, test, package, and deploy. When people do these steps by hand, they skip some, or each person does them differently.',
  terms: ['CI/CD', 'Unit tests and integration tests', 'Code review and pull requests', 'Health check (liveness, readiness)', 'Rolling, blue-green, and canary deployments'], ranks: ['deploy', 'test'],
  controls: [
    { id: 'pipe', label: 'How changes reach production', type: 'select', value: 'manual', options: [['manual', 'By hand: build on my PC and copy to the server'], ['ci', 'CI: build and test automatically on push, a person deploys'], ['cicd', 'CI/CD: if everything passes, deploy automatically too']] },
    { id: 'bug', label: 'Problem in this change', type: 'select', value: 'test', options: [['none', 'No problem'], ['compile', 'Code that does not compile'], ['test', 'Breaks an existing feature (a test can catch it)'], ['env', 'Code that depends on a file that exists only on my PC'], ['runtime', 'Fails to start only in production (tests cannot catch it)']] },
  ],
  presets: [
    { t: 'Default settings', q: 'What happens when you deploy by hand (build on my PC and copy to the server) a change that breaks an existing feature?', d: 'Deploying by hand. The tests are skipped, and an outage occurs in production.', v: { pipe: 'manual', bug: 'test' } },
    { t: 'With CI', q: 'What if changes reach production with CI: build and test automatically on push, a person deploys?', d: 'The same change is stopped at the test stage.', v: { pipe: 'ci', bug: 'test' } },
    { t: 'Code that works only on my PC', q: 'What if you use CI and the change has code that depends on a file that exists only on my PC?', d: 'It shows up only when you run it in a clean environment.', v: { pipe: 'ci', bug: 'env' } },
    { t: 'A problem the tests cannot catch, CI only', q: 'What if you use CI and the change fails to start only in production (tests cannot catch it)?', d: 'A person deploys, and a person rolls back.', v: { pipe: 'ci', bug: 'runtime' } },
    { t: 'A problem the tests cannot catch, CI/CD', q: 'What if you use CI/CD and the change fails to start only in production (tests cannot catch it)?', d: 'The health check after deployment catches it, and it is rolled back automatically.', v: { pipe: 'cicd', bug: 'runtime' } },
    { t: 'When there is no problem', q: 'What if you use CI/CD and there is no problem in the change?', d: 'Compare how much work is left for people.', v: { pipe: 'cicd', bug: 'none' } },
  ],
  code: function (c) {
    if (c.pipe === 'manual') return '# The developer types this directly on their own PC\n./gradlew build -x test      # skips the tests because of a rush\nscp build/libs/app.jar prod-server:/app/\nssh prod-server "systemctl restart app"\n\n# No record is left of who uploaded what code, or when';
    return '# .github/workflows/ci.yml (GitHub Actions example)\non: [pull_request, push]\njobs:\n  build:\n    runs-on: ubuntu-latest             # starts in a clean environment every time\n    steps:\n      - uses: actions/checkout@v7\n      - uses: actions/setup-java@v6\n        with: { distribution: temurin, java-version: 21 }\n      - run: ./gradlew build           # compile + test. If it fails, it is marked failed (a required check also blocks merging)\n      - if: github.ref == \'refs/heads/main\'   # package only after the change is merged into main\n        run: docker build -t shop/app:${{ github.sha }} .\n      - if: github.ref == \'refs/heads/main\'\n        run: docker push shop/app:${{ github.sha }}\n' + (c.pipe === 'cicd' ? '  deploy:\n    needs: build                       # runs only if build succeeds\n    if: github.ref == \'refs/heads/main\'\n    runs-on: ubuntu-latest\n    steps:\n      - run: kubectl set image deployment/app app=shop/app:${{ github.sha }}\n      - run: |\n          if ! kubectl rollout status deployment/app --timeout=2m; then\n            kubectl rollout undo deployment/app   # roll back to the previous version\n            exit 1                                # end the job as failed so a failure notice goes out\n          fi' : '\n# A person picks an artifact that passed and deploys it by hand');
  },
  label: function (c) { return { manual: 'By hand', ci: 'CI', cicd: 'CI/CD' }[c.pipe] + ' · ' + { none: 'No problem', compile: 'Compile error', test: 'Bug that tests catch', env: 'Works only on my PC', runtime: 'Fails only in production' }[c.bug]; },
  columns: ['Where the problem was found', 'Impact on production users', 'What people did'],
  // Pure calculation: at which stage does it stop
  result: function (c) {
    var p = c.pipe, b = c.bug;
    if (b === 'none') return { stop: '', where: 'None', impact: 'None', ok: true };
    if (b === 'compile') return { stop: 'build', where: p === 'manual' ? 'The build on my PC' : 'The build stage of CI', impact: 'None', ok: false };
    if (b === 'test') return p === 'manual' ? { stop: 'prod', where: 'Production (reported by users)', impact: 'Outage', ok: false } : { stop: 'test', where: 'The test stage of CI', impact: 'None', ok: false };
    if (b === 'env') return p === 'manual' ? { stop: 'prod', where: 'When run on the production server', impact: 'Outage', ok: false } : { stop: 'test', where: 'The test stage of CI', impact: 'None', ok: false };
    return p === 'cicd' ? { stop: 'health', where: 'The health check right after deployment', impact: 'None (the existing version keeps responding)', ok: false } : { stop: 'prod', where: 'Production (right after deployment)', impact: 'Outage', ok: false };
  },
  simulate: function (c) {
    var R = this.result(c), p = c.pipe, b = c.bug, ev = [], sum = [], hands = [], S = { stages: [] };
    function push(name, st, who, s, k) { S.stages.push([name, st, who]); ev.push({ s: s, k: k, snap: JSON.parse(JSON.stringify(S)) }); }
    var auto = p !== 'manual';
    if (!auto) {
      hands.push('Build');
      if (b === 'compile') { push('Build', 'Failed', 'Person (my PC)', 'The developer builds on their own PC. It fails with a compile error. No artifact (the jar file) is produced, so it stops here. Doing it by hand also catches this problem.', 'bad'); }
      else {
        push('Build', 'Succeeded', 'Person (my PC)', 'The developer builds on their own PC.' + (b === 'env' ? ' The code reads a configuration file in a specific folder, and the developer\'s PC has that file, so it works without trouble.' : ''), '');
        push('Test', 'Skipped', '-', 'The developer was in a hurry and did not run the tests. Whether the tests get run depends on a person\'s memory and effort.', b === 'test' ? 'bad' : '');
        hands.push('Copy to the server', 'Restart');
        push('Deploy', 'Done', 'Person', 'The built file is copied to the production server and the server is restarted. Only that developer knows what code was uploaded.', '');
        if (b === 'none') push('Production', 'Healthy', '-', 'The new version works normally. This time you were lucky.', 'good');
        else { hands.push('Find the cause', 'Find the previous file and put it back'); push('Production', 'Outage', 'Found by users', { test: 'An existing feature went to production broken. You find out from reports from users.', env: 'The production server does not have that file. The application dies while starting.', runtime: 'A problem that occurs only with the production settings keeps the application from starting.' }[b] + ' The developer has to find the cause, find the previous file, and upload it again.', 'bad'); }
      }
    } else {
      hands.push('Push code');
      push('Push code', 'Done', 'Person', 'The developer pushes the change to the repository and opens a pull request. This is the signal that starts the pipeline automatically.', '');
      push('Setup', 'Done', 'Automatic', 'The code is downloaded into a clean environment with nothing installed. Files that exist only on the developer\'s PC are not here.', '');
      if (R.stop === 'build') push('Build', 'Failed', 'Automatic', 'The build fails with a compile error. The pull request is marked as failed (and merging is blocked if this check is set as required).', 'bad');
      else {
        push('Build', 'Succeeded', 'Automatic', 'Compilation succeeds.', '');
        if (R.stop === 'test') push('Test', 'Failed', 'Automatic', 'All the tests run every time, with none left out. ' + (b === 'env' ? 'While the test starts the application, it fails because it cannot find a file that existed only on the developer\'s PC. "It works on my PC" gets exposed here.' : 'The test for the broken feature fails.') + ' The merge is blocked, and this code never gets anywhere near production.', 'bad');
        else {
          push('Test', 'Passed', 'Automatic', 'All the tests pass.' + (b === 'runtime' ? ' This problem shows up only with the production settings, so the tests cannot catch it.' : ''), '');
          hands.push('Code review and merge approval');
          push('Review & merge', 'Done', 'Person', 'A colleague reviews the code and approves the merge. On top of what the machine has checked (build, tests), the person looks at the design and the intent.', '');
          push('Package', 'Done', 'Automatic', 'A deployable artifact (a container image) is built from the code that passed, and the commit SHA is attached to it as a tag. You can trace which code is in which artifact.', '');
          if (p === 'ci') {
            hands.push('Run the deploy command');
            push('Deploy', 'Done', 'Person', 'CI ends here. A person picks an artifact and runs the deployment command by hand.', '');
            if (b === 'none') push('Production', 'Healthy', '-', 'The new version works normally.', 'good');
            else { hands.push('Notice the outage', 'Roll back to the previous version'); push('Production', 'Outage', 'Found manually', 'The new version cannot start with the production settings. A person notices and rolls back to the previous image. The previous artifact remains with its tag, so rolling back is easy.', 'bad'); }
          } else {
            push('Deploy', 'In progress', 'Automatic', 'As soon as the change is merged, the new version starts to be deployed to the servers automatically. Until the new version is ready, the existing version keeps receiving requests.', '');
            if (b === 'none') { push('Health check', 'Passed', 'Automatic', 'The new version responds that it is "ready to receive requests." Traffic is switched to the new version, and the existing version is taken down.', 'good'); push('Production', 'Healthy', '-', 'People only pushed the code and reviewed it. Everything else ran automatically, in the same order every time.', 'good'); }
            else { push('Health check', 'Failed', 'Automatic', 'The new version cannot start, so it does not respond to the health check. Traffic is not switched to the new version.', 'bad'); push('Roll back', 'Done', 'Automatic', 'When the deployment does not finish within the set time, the pipeline rolls back to the previous version. Users received responses from the existing version the whole time. A failure notification goes to the developer.', 'good'); }
          }
        }
      }
    }
    if (!auto && R.impact === 'Outage') sum.push('When you do it by hand, you can skip the checking steps, and nobody knows they were skipped. The problem is found in the most expensive place, production.');
    if (auto && (R.stop === 'build' || R.stop === 'test')) sum.push('CI (continuous integration) automatically runs the build and tests in a clean environment every time code is pushed, so it finds problems before the merge. The earlier you find a problem, the cheaper it is to fix.');
    if (p === 'ci' && b === 'runtime') sum.push('CI protects only up to the merge. Deployment and the checks after it are still left as work for people.');
    if (p === 'cicd' && b === 'runtime') sum.push('CD (continuous deployment) automates deployment, checking, and rollback in one procedure. To roll back automatically, you need both health checks and a zero-downtime deployment method in place.');
    if (b === 'none') sum.push('When there is no problem, the difference is the number of things people did, and the record. When the work is automated, it runs in the same order no matter who does it, and a record remains of which commit was deployed and when.');
    sum.push('What a pipeline filters out is limited to problems that tests and checks can confirm. A bug in a feature that has no tests passes even with CI.');
    return { events: ev, summary: sum, row: [R.where, R.impact, hands.join(' → ')] };
  },
  render: function (v, sim, t, H, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : { stages: [] };
    if (!s.stages.length) { H.text(v, 'Click Run to go through the steps one at a time.'); return; }
    H.table(v, ['Step', 'Result', 'Done by'], s.stages.map(function (r, i) { var bad = r[1] === 'Failed' || r[1] === 'Outage'; return { cells: [{ v: r[0], cls: i === s.stages.length - 1 ? 'hot' : '' }, { v: r[1], cls: bad ? 'bad' : r[1] === 'Skipped' ? '' : 'good' }, r[2]] }; }), 'Until the code reaches production');
  },
  // Diagram: the steps the code goes through before it reaches production, joined from left to right. You can see where it stopped.
  draw: function (P, sim, shown) {
    var last = shown[shown.length - 1], st = last ? last.snap.stages : [], n = st.length, rows = Math.max(1, Math.ceil(n / 5));
    P.size(680, 40 + rows * 100 + 16);
    P.region('pipe', 16, 16, 648, 24 + rows * 100, sim.c.pipe === 'manual' ? 'The order of steps a person does by hand' : 'Pipeline: starts automatically when you push code');
    st.forEach(function (r, i) {
      var bad = r[1] === 'Failed' || r[1] === 'Outage', skip = r[1] === 'Skipped';
      P.box('sg' + i, 28 + (i % 5) * 126, 52 + Math.floor(i / 5) * 100, 116, 68, { cls: (bad ? 'bad' : skip ? 'ghost' : r[2] === 'Automatic' ? 'good' : 'wait') + (i === n - 1 ? ' now' : ''), title: r[0], sub: [r[1], r[2]], center: true });
      if (i) P.arrow('ar' + i, 'sg' + (i - 1) + (i % 5 ? ':r' : ':b'), 'sg' + i + (i % 5 ? ':l' : ':t'), { cls: bad ? 'bad' : '' });
    });
    if (!n) P.text('hint', 340, 90, 'Click Run to go through the steps one at a time', { cls: 'mut', anchor: 'middle' });
    P.note('Green is a step done automatically by a machine, blue is a step done by a person (or a resulting state), red is a step that failed or caused an outage, and the dotted box is a skipped step. The further left a red step is, the earlier the problem was found.');
  },
  assume: 'This is a model made to explain the concept, and it is not a result checked by running real CI/CD tools. In "By hand", skipping the tests assumes a common accident; if you run the tests when working by hand, you can catch the same problem. The automatic rollback when the health check fails is the behavior you get when the pipeline and the deployment tool are configured that way. The workflow in the code is an example to show the structure; steps that real use needs, such as authentication and caching, are left out. The major versions actions/checkout@v7 and actions/setup-java@v6 in the workflow were checked on 2026-10-26 against the usage examples in the README of the GitHub repository of each action (github.com/actions/checkout, github.com/actions/setup-java). The setup-java README calls v6 the latest stable release and marks v1 through v4 as deprecated, telling you to upgrade to v6.',
});

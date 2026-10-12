Lab.register({
  id: 'supplychain', nav: 'Dependencies and the supply chain', cat: 'Authentication', mode: 'step',
  title: 'How do libraries I never wrote down get into my program, and who decides their versions?',
  intro: 'When you write one line for a library in the build file, the other libraries that library needs (its transitive dependencies) come in with it and run as part of your program. That is why a vulnerability in a library you never chose becomes your problem too. Depending on whether you wrote a version as a range or pinned it, a newly published version may come in automatically, and if you misspell a name by one letter, a completely different package may come in. The path a library takes from being built, through the repository, into your build is called the supply chain, and slipping malicious code in somewhere along that path is a supply chain attack. The library names and vulnerabilities shown here are all made up for the explanation.',
  terms: ['Transitive dependency', 'Version ranges and lock files', 'Supply chain attacks and typosquatting', 'CI/CD'],
  controls: [
    { id: 'topic', label: 'Situation to look at', type: 'select', value: 'range', options: [['range', 'When the version is written as a range, and when it is pinned'], ['fix', 'When a vulnerability in a transitive dependency becomes known'], ['typo', 'A fake package with a similar name']] },
    { id: 'ver', label: 'Version of web-kit written in build.gradle', type: 'select', value: 'range', options: [['fixed', '2.0.0 (pinned)'], ['range', '2.+ (range: the highest version among 2.x)'], ['lock', '2.+ with a lock file']], show: function (c) { return c.topic === 'range'; } },
    { id: 'news', label: 'What was published to the repository after the first build', type: 'select', value: 'evil', options: [['evil', 'web-kit 2.1.0 (a version with malicious code mixed in)'], ['patch', 'web-kit 2.0.1 (a version that fixes the vulnerability)']], show: function (c) { return c.topic === 'range'; } },
    { id: 'avail', label: 'Has web-kit released a new version that fixes the vulnerability?', type: 'select', value: 'yes', options: [['yes', 'Yes (web-kit 2.0.1)'], ['no', 'Not yet (only json-lite 1.2.1 is out)']], show: function (c) { return c.topic === 'fix'; } },
    { id: 'act', label: 'What I did in response', type: 'select', value: 'none', options: [['none', 'Nothing; I just build again'], ['bump', 'Raise the version of web-kit'], ['override', 'Override only the version of json-lite (constraints)']], show: function (c) { return c.topic === 'fix'; } },
    { id: 'name', label: 'Name written in build.gradle', type: 'select', value: 'typo', options: [['typo', 'web-kti (two letters swapped. A fake with that name has been published)'], ['ok', 'web-kit (the correct name)'], ['miss', 'web-kitt (one extra letter. No package has that name)']], show: function (c) { return c.topic === 'typo'; } },
  ],
  presets: [
    { t: 'Default settings', q: 'What happens when you build again after web-kit 2.1.0 is published, if build.gradle wrote web-kit as 2.+ and you built once before?', d: 'A build with the version written as 2.+. The malicious version comes in even though the code did not change.', v: { topic: 'range', ver: 'range', news: 'evil', avail: 'yes', act: 'none', name: 'typo' } },
    { t: 'With a lock file', q: 'What if you write web-kit as 2.+ and use a lock file?', d: 'Even if you write 2.+, only the version recorded in the lock file is downloaded.', v: { topic: 'range', ver: 'lock', news: 'evil', avail: 'yes', act: 'none', name: 'typo' } },
    { t: 'When a range helps', q: 'What if web-kit 2.0.1, a version that fixes the vulnerability, is published after the first build?', d: 'When a version that fixes the vulnerability is published, the build follows it automatically.', v: { topic: 'range', ver: 'range', news: 'patch', avail: 'yes', act: 'none', name: 'typo' } },
    { t: 'Vulnerability in a transitive dependency', q: 'What if a vulnerability becomes known in the transitive dependency json-lite and you just build again, doing nothing?', d: 'A vulnerability became known in json-lite, which I never wrote down. If I leave things as they are, it stays.', v: { topic: 'fix', ver: 'range', news: 'evil', avail: 'yes', act: 'none', name: 'typo' } },
    { t: 'Raise the version', q: 'What if a vulnerability becomes known in a transitive dependency and you raise the version of web-kit?', d: 'When you raise web-kit, json-lite changes along with it.', v: { topic: 'fix', ver: 'range', news: 'evil', avail: 'yes', act: 'bump', name: 'typo' } },
    { t: 'When there is no version to raise to yet', q: 'What if web-kit has no new version, only json-lite 1.2.1 is out, and you override only the version of json-lite with constraints?', d: 'Override only the version of the transitive dependency.', v: { topic: 'fix', ver: 'range', news: 'evil', avail: 'no', act: 'override', name: 'typo' } },
    { t: 'If the name is off by one letter', q: 'What if build.gradle has web-kti, with two letters swapped, instead of web-kit?', d: 'A fake package comes in without any error.', v: { topic: 'typo', ver: 'range', news: 'evil', avail: 'yes', act: 'none', name: 'typo' } },
  ],
  // A made-up repository: library → version → the dependencies written in that version's POM
  REG: {
    'web-kit': { '2.0.0': { 'json-lite': '1.2.0' }, '2.0.1': { 'json-lite': '1.2.1' }, '2.1.0': { 'json-lite': '1.2.0' } },
    'json-lite': { '1.2.0': {}, '1.2.1': {} },
    'mail-kit': { '1.4.0': { 'text-util': '3.1.0' } },
    'text-util': { '3.1.0': {} },
    'web-kti': { '2.0.0': { 'web-kit': '2.0.0' } },
  },
  NAME: { ok: 'web-kit', typo: 'web-kti', miss: 'web-kitt' },
  // The versions in the repository at that moment. first means "the day of the first build"
  available: function (c, first) {
    var a = { 'web-kit': ['2.0.0'], 'json-lite': ['1.2.0'], 'mail-kit': ['1.4.0'], 'text-util': ['3.1.0'] };
    if (c.topic === 'fix') { a['json-lite'].push('1.2.1'); if (c.avail === 'yes') a['web-kit'].push('2.0.1'); }
    if (c.topic === 'range' && !first) { if (c.news === 'patch') { a['web-kit'].push('2.0.1'); a['json-lite'].push('1.2.1'); } else a['web-kit'].push('2.1.0'); }
    if (c.topic === 'typo') a['web-kti'] = ['2.0.0'];
    return a;
  },
  // Version comparison: compare the numbers split at the dots, from the front
  newer: function (a, b) { var x = a.split('.'), y = b.split('.'); for (var i = 0; i < Math.max(x.length, y.length); i++) { var d = (+x[i] || 0) - (+y[i] || 0); if (d) return d > 0; } return false; },
  highest: function (vs) { var self = this; return vs.reduce(function (m, v) { return self.newer(v, m) ? v : m; }); },
  // Dependency resolution: start from what was written directly and follow the POMs to decide the versions.
  // 2.+ is the highest version that starts with those characters; if there is a lock file, the version recorded there; if a library has several requests, the highest version (the rule of Gradle).
  resolve: function (avail, direct, lock, cons) {
    var REG = this.REG, self = this, sel = {}, edges = [], missing = null;
    function pick(name, spec) {
      var vs = avail[name] || [];
      if (lock && lock[name]) return lock[name];
      if (spec.slice(-1) === '+') { vs = vs.filter(function (v) { return v.indexOf(spec.slice(0, -1)) === 0; }); return vs.length ? self.highest(vs) : null; }
      return vs.indexOf(spec) >= 0 ? spec : null;
    }
    for (var round = 0; round < 8; round++) {
      var req = {}, es = [], asks = direct.map(function (d) { return ['shop-api', d[0], d[1]]; });
      Object.keys(sel).forEach(function (n) { var deps = REG[n][sel[n]]; Object.keys(deps).forEach(function (m) { asks.push([n, m, deps[m]]); }); });
      asks.forEach(function (a) { var v = pick(a[1], a[2]); if (!v) { missing = a[1]; return; } es.push([a[0], a[1], a[2], v]); (req[a[1]] = req[a[1]] || []).push(v); });
      Object.keys(cons || {}).forEach(function (n) { if (req[n]) { es.push(['constraints', n, cons[n], cons[n]]); req[n].push(cons[n]); } });
      var next = {}, same = true;
      Object.keys(req).forEach(function (n) { next[n] = self.highest(req[n]); });
      Object.keys(next).concat(Object.keys(sel)).forEach(function (n) { if (next[n] !== sel[n]) same = false; });
      sel = next; edges = es;
      if (same) break;
    }
    return { ver: sel, edges: edges, missing: missing };
  },
  // From the settings, work out "what was written, what the repository has, and so what came in"
  plan: function (c) {
    var first = null, lock = null, cons = null, wk = '2.0.0', name = 'web-kit';
    if (c.topic === 'range') { wk = c.ver === 'fixed' ? '2.0.0' : '2.+'; first = this.resolve(this.available(c, true), [['web-kit', wk], ['mail-kit', '1.4.0']], null, null); if (c.ver === 'lock') lock = first.ver; }
    if (c.topic === 'fix') { if (c.act === 'bump' && c.avail === 'yes') wk = '2.0.1'; if (c.act === 'override') cons = { 'json-lite': '1.2.1' }; }
    if (c.topic === 'typo') name = this.NAME[c.name];
    var direct = [[name, wk], ['mail-kit', '1.4.0']], avail = this.available(c, false), now = this.resolve(avail, direct, lock, cons);
    return { direct: direct, wk: wk, name: name, lock: lock, cons: cons, avail: avail, first: first, now: now };
  },
  // Where json-lite came in from: the path from what was written directly to json-lite
  pathTo: function (res, target) {
    var path = [target + ' ' + res.ver[target]], cur = target, guard = 0;
    while (cur !== 'shop-api' && guard++ < 6) { var e = res.edges.filter(function (x) { return x[1] === cur && x[0] !== 'constraints'; })[0]; if (!e) break; cur = e[0]; path.unshift(cur === 'shop-api' ? cur : cur + ' ' + res.ver[cur]); }
    return path;
  },
  code: function (c) {
    var p = this.plan(c), lines = ['// build.gradle (my project, shop-api)', 'dependencies {', "    implementation 'lab.demo:" + p.name + ':' + p.wk + "'", "    implementation 'lab.demo:mail-kit:1.4.0'"];
    if (p.cons) lines.push('    constraints {', "        implementation 'lab.demo:json-lite:1.2.1'   // overrides the version of the transitive dependency", '    }');
    lines.push('}');
    if (c.topic === 'range' && c.ver === 'lock') lines = lines.concat(['', 'dependencyLocking {', '    lockAllConfigurations()', '}', '', '// gradle.lockfile (a file made on the day of the first build with ./gradlew dependencies --write-locks)', '// After the = are the names of the configurations (compile, runtime, test) that use that version'], ['json-lite:1.2.0', 'mail-kit:1.4.0', 'text-util:3.1.0', 'web-kit:2.0.0'].map(function (x) { return '// lab.demo:' + x + '=compileClasspath,runtimeClasspath,testCompileClasspath,testRuntimeClasspath'; }));
    if (c.topic === 'fix') lines.push('', '// Command that finds where json-lite comes in from', '// ./gradlew dependencyInsight --dependency json-lite');
    lines.push('', '// All libraries that start with lab.demo are made up for the explanation');
    return lines.join('\n');
  },
  label: function (c) {
    if (c.topic === 'range') return 'Range and pinning · ' + { fixed: '2.0.0 pinned', range: '2.+', lock: '2.+ with a lock file' }[c.ver] + ' · ' + (c.news === 'evil' ? 'malicious 2.1.0 published' : 'fixed 2.0.1 published');
    if (c.topic === 'fix') return 'Vulnerability response · ' + (c.avail === 'yes' ? 'web-kit 2.0.1 available' : 'no new web-kit version') + ' · ' + { none: 'no response', bump: 'version raised', override: 'json-lite overridden' }[c.act];
    return 'Fake package · name written: ' + this.NAME[c.name];
  },
  columns: ['web-kit that came into the build', 'json-lite that came into the build', 'Verdict'],
  simulate: function (c) {
    var p = this.plan(c), now = p.now, self = this, ev = [], sum = [], REG = this.REG;
    var vulnKnown = c.topic === 'fix' || (c.topic === 'range' && c.news === 'patch');
    var st = { reg: [], decl: [], lock: '', libs: [], verdict: '', path: '' };
    function push(s, k) { ev.push({ s: s, k: k, snap: JSON.parse(JSON.stringify(st)) }); }
    function regText(avail, flag) {
      return ['web-kit', 'json-lite', 'web-kti'].filter(function (n) { return avail[n]; }).map(function (n) {
        return [n, avail[n].map(function (v) { return v + (flag && n === 'json-lite' && v === '1.2.0' && vulnKnown ? '(unsafe)' : flag && n === 'web-kit' && v === '2.1.0' ? '(malicious)' : ''); }).join(' · '), n === 'web-kti' ? 'bad' : ''];
      });
    }
    // Turn the resolution result into the list used by the diagram and the table. depth is how many steps away from what was written directly
    function libs(res, flag, only) {
      var out = [], depth = {};
      function walk(n, d) { if (depth[n] === undefined || d < depth[n]) depth[n] = d; res.edges.forEach(function (e) { if (e[0] === n && d < 5) walk(e[1], d + 1); }); }
      res.edges.forEach(function (e) { if (e[0] === 'shop-api') walk(e[1], 1); });
      Object.keys(res.ver).forEach(function (n) {
        if (only && only.indexOf(n) < 0) return;
        var v = res.ver[n], from = res.edges.filter(function (e) { return e[1] === n && e[0] !== 'constraints'; })[0][0], cls = '', note = '';
        if (flag && n === 'json-lite' && v === '1.2.0' && vulnKnown) { cls = 'bad'; note = 'vulnerable'; }
        if (flag && n === 'json-lite' && v === '1.2.1') { cls = 'good'; note = 'fixed version'; }
        if (flag && n === 'web-kit' && v === '2.1.0') { cls = 'bad'; note = 'malicious'; }
        if (flag && n === 'web-kit' && v === '2.0.1') { cls = 'good'; note = 'fixed version'; }
        if (n === 'web-kti') { cls = flag ? 'bad' : ''; note = flag ? 'fake' : ''; }
        out.push({ n: n, v: v, from: from, depth: depth[n], row: n === 'mail-kit' || n === 'text-util' ? 1 : 0, cls: cls, note: note });
      });
      return out;
    }
    function decl() { var d = p.direct.map(function (x) { return x[0] + ':' + x[1]; }); if (p.cons) d.push('Overridden:', 'json-lite:1.2.1'); return d; }
    var wkNow = now.ver['web-kit'], jlNow = now.ver['json-lite'], verdict, k;
    if (c.topic === 'range') {
      var f = p.first, evil = c.news === 'evil', newV = evil ? '2.1.0' : '2.0.1';
      st.reg = regText(this.available(c, true), false); st.decl = ['web-kit:' + p.wk, 'mail-kit:1.4.0']; st.libs = libs(f, false);
      push('It is the day of the first build. In build.gradle, the version of web-kit is written as ' + p.wk + (c.ver === 'fixed' ? ', which pins it. Exactly that version, 2.0.0, comes in, and json-lite 1.2.0, which web-kit needs, comes in with it.' : '. This means "the highest version among the 2.x versions" (2.0.0, 2.0.1, and 2.1.0 are all 2.x). The only web-kit in the repository right now is 2.0.0, so version 2.0.0 comes in, and json-lite 1.2.0, which web-kit needs, comes in with it.'), '');
      if (c.ver === 'lock') { st.lock = 'web-kit 2.0.0, json-lite 1.2.0, mail-kit 1.4.0, text-util 3.1.0'; push('./gradlew dependencies --write-locks: the versions chosen now are written to the lock file (gradle.lockfile). Not only web-kit 2.0.0, which was written directly, but also json-lite 1.2.0, a transitive dependency, is recorded. This file is committed to Git together with the code.', ''); }
      st.reg = regText(p.avail, true);
      if (vulnKnown) st.libs = libs(f, true);
      push(evil ? 'A few days later, web-kit 2.1.0 is published to the repository. (A made-up situation.) It is a version that someone who took over the publishing account uploaded with malicious code in it. This is a supply chain attack: it targets the path by which libraries come in, not your own code. In the repository, it looks like an ordinary new version.' : 'A few days later (a made-up situation), a vulnerability in json-lite 1.2.0 becomes known, and the fixed json-lite 1.2.1 and web-kit 2.0.1, which was changed to use it, are published to the repository.', '');
      var moved = wkNow !== '2.0.0';
      st.libs = libs(now, true);
      k = evil ? (moved ? 'bad' : 'good') : (moved ? 'good' : 'bad');
      push('My code is built again without changing a single character: ' + (c.ver === 'fixed' ? 'the version was written as the pinned 2.0.0, so version 2.0.0 is downloaded whatever has newly appeared in the repository.' : c.ver === 'lock' ? 'build.gradle says 2.+, but there is a lock file. Instead of choosing again from the repository, the build downloads web-kit 2.0.0 and json-lite 1.2.0 recorded in the lock file.' : 'a version that matches 2.+ is looked up in the repository again. Of 2.0.0 and ' + newV + ', it picks the higher one, version ' + newV + '. Different code from last time has come into my program.'), k);
      verdict = evil ? (moved ? 'Malicious version came in automatically' : 'Malicious version did not come in') : (moved ? 'Followed the fixed version automatically' : 'Fixed version is out but the old version stays');
      st.verdict = verdict;
      push(evil ? (moved ? 'The build succeeds. There is no error and no warning. web-kit 2.1.0, which contains malicious code, is shipped as part of my program.' : 'What came into the build is exactly the same as on the day of the first build. The malicious version did not come in.') : (moved ? 'web-kit 2.0.1 requires json-lite 1.2.1, so json-lite also changed to the fixed version. The vulnerability was fixed without my doing anything.' : 'What came into the build is exactly the same as on the day of the first build. A fixed version is out, but the vulnerable json-lite 1.2.0 remains.'), k);
      if (c.ver === 'range') sum.push('If you write a version as a range, the same code can give a different result from day to day. Receiving a fixed version automatically and receiving a malicious version automatically come from the same property. Whoever publishes to the repository decides what comes in.');
      if (c.ver === 'fixed') sum.push('If you pin the version, it does not change until you change what is written. But only what you wrote directly is pinned. If the POM of web-kit gives json-lite as a range, that part can still change, and a lock file is what pins that too.');
      if (c.ver === 'lock') sum.push('A lock file records every version, including transitive dependencies, and makes the build download only those. Anyone building at any time gets the same result. New versions come in only when you update the lock file, so you can look at what changes then.');
      if (!evil && !moved) sum.push('Pinning or locking does not mean "staying still keeps you safe". A fixed version does not come in automatically either, so you have to keep checking vulnerability advisories and raise the version yourself.');
    } else if (c.topic === 'fix') {
      var firstRes = this.resolve(this.available(c, false), [['web-kit', '2.0.0'], ['mail-kit', '1.4.0']], null, null);
      st.reg = regText({ 'web-kit': ['2.0.0'], 'json-lite': ['1.2.0'] }, false); st.decl = ['web-kit:2.0.0', 'mail-kit:1.4.0']; st.libs = libs(firstRes, false, ['web-kit', 'mail-kit']);
      push('My build.gradle has only two lines: web-kit 2.0.0 and mail-kit 1.4.0. These are libraries I chose myself, and they are called direct dependencies.', '');
      st.libs = libs(firstRes, false);
      push('The build tool (Gradle) reads the POM that comes with each of the two libraries (the file that describes the library and what it needs): web-kit 2.0.0 says it needs json-lite 1.2.0, and mail-kit 1.4.0 says it needs text-util 3.1.0. Two libraries I never wrote down come in with them. These are transitive dependencies, and they run inside my program exactly like direct dependencies.', '');
      st.reg = regText(p.avail, true); st.libs = libs(firstRes, true);
      push('(Made up.) A security advisory is published: json-lite 1.2.0 has a vulnerability, and it is fixed in version 1.2.1. ' + (c.avail === 'yes' ? 'web-kit has also released version 2.0.1, changed to use json-lite 1.2.1.' : 'web-kit has not released a new version yet.') + ' But the name json-lite does not appear anywhere in my build.gradle.', 'bad');
      st.path = this.pathTo(firstRes, 'json-lite').join(' → ');
      push('./gradlew dependencyInsight --dependency json-lite: this finds where the library comes in from. The result is ' + st.path + '. It was pulled in by the web-kit I wrote.', '');
      st.decl = decl(); st.libs = libs(now, true); st.path = this.pathTo(now, 'json-lite').join(' → ');
      var fixed = jlNow === '1.2.1';
      if (c.act === 'none') push('The build is run again without changing anything. Even though the fixed version is in the repository, a build with a pinned version does not change by itself. json-lite 1.2.0 still comes in.', 'bad');
      else if (c.act === 'bump' && c.avail === 'yes') push('The version of web-kit in build.gradle is changed to 2.0.1. The POM of web-kit 2.0.1 requires json-lite 1.2.1, so json-lite also changes to version 1.2.1 along with it.', 'good');
      else if (c.act === 'bump') push('To raise the version of web-kit, I look in the repository: there is no version higher than 2.0.0 yet. It cannot be raised, so the build stays the same and json-lite 1.2.0 remains.', 'bad');
      else push('json-lite 1.2.1 is written in constraints in build.gradle. The POM of web-kit ' + wkNow + ' still requires json-lite version ' + REG['web-kit'][wkNow]['json-lite'] + ', but when a library has two requests, Gradle picks the higher version. web-kit stays as it is, and only json-lite changes to version 1.2.1.', 'good');
      verdict = fixed ? 'Switched to the fixed json-lite' : 'The vulnerable json-lite remains'; st.verdict = verdict; k = fixed ? 'good' : 'bad';
      push('Result of building again: web-kit ' + wkNow + ', json-lite ' + jlNow + '. ' + (fixed ? 'The vulnerable version is out of the build. After a change like this, run the tests to confirm that everything works as before.' : 'The vulnerable version is still inside my program.'), k);
      sum.push('Four libraries came into the build, but I wrote only two. Vulnerability advisories also come for libraries I did not write down. So you need to know the full list and versions, including transitive dependencies, and you find the path with the dependency tree (./gradlew dependencies) and dependencyInsight.');
      if (c.act === 'bump' && c.avail === 'yes') sum.push('If the direct dependency has released a fixed version, raising it is the cleanest way. This is because you get exactly the combination that the maker of web-kit tested together with json-lite 1.2.1.');
      if (c.act === 'bump' && c.avail === 'no') sum.push('If the direct dependency has not released a new version yet, you stay vulnerable while you wait. In that case you can override only the version of the transitive dependency.');
      if (c.act === 'override') sum.push('Overriding can be used even before the direct dependency releases a new version. However, it may be a combination that the maker of web-kit ' + wkNow + ' has not tested, so confirm it with tests, and delete the overriding line when it is no longer needed.' + (c.avail === 'yes' ? ' If a fixed version of web-kit is out, as it is now, raising that is better.' : ''));
      if (c.act === 'none') sum.push('Gradle does not tell you by itself while building that a vulnerability has become known. You notice only if you put a check tool that finds vulnerabilities in dependencies into the build process and keep checking the advisories.');
    } else {
      var nm = p.name;
      st.reg = regText(p.avail, false); st.decl = [nm + ':2.0.0', 'mail-kit:1.4.0']; st.libs = libs(this.resolve(p.avail, [['mail-kit', '1.4.0']], null, null), false);
      push("A new line is added to build.gradle. The line added is implementation 'lab.demo:" + nm + ":2.0.0'. " + (c.name === 'ok' ? 'The name was written correctly.' : c.name === 'typo' ? 'Trying to write web-kit, the order of two letters was swapped and it became web-kti.' : 'Trying to write web-kit, one extra t was added and it became web-kitt.'), c.name === 'ok' ? '' : 'bad');
      if (c.name === 'miss') {
        verdict = 'Typo caught by a build failure'; st.verdict = verdict;
        push('The build tool looks in the repository for exactly the name that was written. There is no package named web-kitt in the repository. The build stops with a "could not be found" error. Thanks to the error, the typo is noticed and can be fixed.', 'good');
        sum.push('A typo shows up as an error only when no package has been published under that name. If someone has already taken the name, something else comes in without any error.');
        return { events: ev, summary: sum, row: ['None (build failed)', 'None (build failed)', verdict], ver: now.ver, missing: now.missing, path: [] };
      }
      st.reg = regText(p.avail, true); st.libs = libs(now, true, [nm, 'mail-kit', 'text-util']);
      push('The build tool looks in the repository for exactly the name that was written. It does not judge whether that name is the library I meant. ' + (c.name === 'ok' ? 'It finds web-kit 2.0.0 and downloads it.' : '(Made up.) Someone aimed at a common typo and published a package named web-kti. It finds that and downloads it. No error occurs.'), c.name === 'ok' ? '' : 'bad');
      st.libs = libs(now, true);
      push(c.name === 'ok' ? 'It reads the POM of web-kit 2.0.0: it says json-lite 1.2.0 is needed, so that comes in too.' : 'The POM of the fake web-kti lists the real web-kit 2.0.0 as a dependency. So the real web-kit and json-lite come in as well, and my code compiles and works as usual. There is nothing noticeably wrong.', c.name === 'ok' ? '' : 'bad');
      verdict = c.name === 'ok' ? 'The intended library came in' : 'A fake package came in too'; st.verdict = verdict; k = c.name === 'ok' ? 'good' : 'bad';
      push(c.name === 'ok' ? 'What came into the build is web-kit 2.0.0 and the json-lite 1.2.0 that it pulled in. It is as intended.' : 'The build succeeds. The code inside the fake web-kti also becomes part of my program and runs with the same permissions. Even if it contains code that reads the server\'s environment variables or files and sends them out, there is nothing to stop it.', k);
      if (c.name === 'typo') sum.push('The technique of publishing a fake package with a similar name and waiting for typos is called typosquatting. It is also a kind of supply chain attack. If the fake pulls in the real one as a dependency so that everything works normally, it is hard to notice. Do not type names from memory: copy them from the official documentation or the repository page, and in code review, check the name and the maker for any change that adds a new dependency.');
      if (c.name === 'ok') sum.push('The build screen looks equally successful whether the name was written correctly or with a typo. The difference is only in the list of libraries that came in.');
    }
    var wkCol = (c.topic === 'typo' && c.name === 'typo' ? 'web-kti 2.0.0 (fake) and ' : '') + 'web-kit ' + wkNow;
    return { events: ev, summary: sum, row: [wkCol, 'json-lite ' + jlNow, verdict], ver: now.ver, missing: now.missing, path: this.pathTo(now, 'json-lite') };
  },
  render: function (v, sim, t, H, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : null;
    if (!s) { H.text(v, 'Click Run to go one step at a time.'); return; }
    H.table(v, ['Library', 'Version', 'How it came in', 'Status'], s.libs.map(function (l) { return { cells: [l.n, l.v, l.from === 'shop-api' ? 'I wrote it in build.gradle (direct)' : 'Required by ' + l.from + ' (transitive)', { v: l.note || '-', cls: l.cls }] }; }), s.libs.length + ' libraries in the build right now');
    if (s.lock) H.text(v, 'Versions recorded in the lock file: ' + s.lock);
    if (s.path) H.text(v, 'The path json-lite came in by: ' + s.path);
  },
  // Diagram: at the top, the versions in the package repository; below, the dependency tree that starts from my project and spreads to direct dependencies and transitive dependencies.
  draw: function (P, sim, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : { reg: [], decl: [], lock: '', libs: [], verdict: '' };
    P.size(680, 316);
    P.region('reg', 16, 16, 648, 74, 'Versions in the package repository (all made-up libraries)');
    s.reg.forEach(function (r, i) { P.box('rg_' + r[0], 28 + i * 212, 40, 200, 40, { cls: r[2] || 'plain', title: r[0], sub: r[1] }); });
    if (!s.reg.length) P.box('rg_none', 28, 40, 200, 40, { cls: 'ghost', title: 'Not started yet', sub: ' ' });
    P.region('prj', 16, 100, 648, 152, 'What came into my build' + (s.lock ? ' · lock file present' : ''));
    var X = [28, 196, 364, 520], W = [150, 150, 140, 132];
    P.box('root', X[0], 128, W[0], 112, { cls: 'wait', title: 'shop-api', sub: ['Written directly:'].concat(s.decl.length ? s.decl : ['(none yet)']) });
    s.libs.forEach(function (l) {
      var d = Math.min(l.depth, 3);
      P.box('L_' + l.n, X[d], 128 + l.row * 62, W[d], 56, { cls: l.cls || 'plain', title: l.n + ' ' + l.v, sub: [l.depth === 1 ? 'Written by me' : 'Transitive', l.note || ' '] });
    });
    s.libs.forEach(function (l) { P.arrow('A_' + l.n, l.from === 'shop-api' ? 'root:r:' + (l.row ? 0.72 : 0.22) : 'L_' + l.from + ':r', 'L_' + l.n + ':l', { cls: l.cls === 'bad' ? 'bad' : l.cls === 'good' ? 'good' : '' }); });
    var bad = /remains|came in automatically|fake|old version/.test(s.verdict);
    P.box('res', 16, 264, 648, 36, { cls: !s.verdict ? 'ghost' : bad ? 'bad' : 'good', title: 'Verdict', right: s.verdict || 'In progress' });
    P.note('An arrow means "this needs that". The only boxes I wrote are the ones connected directly to shop-api. Everything to the right of them was fetched by the build tool as it followed the POMs.');
  },
  assume: 'This is a model for showing the concept. The libraries that start with lab.demo, their versions, the vulnerabilities, the malicious version, and the fake package are all made up. They have nothing to do with real libraries or real vulnerability numbers. The framing follows the scope of A03 (Software Supply Chain Failures) in the OWASP Top 10:2025: know the versions of not only what you use directly but also the transitive dependencies, keep checking vulnerability advisories, and download from trustworthy sources. The rules that decide versions follow Gradle. For 15 combinations, which versions come in and the path by which json-lite comes in were checked against the result of actually resolving the dependencies with Gradle 8.14.3, using a repository on the PC used to write this lab that holds only the POMs of the made-up libraries (run without a network). The rules confirmed by execution: 2.+ picks the highest of the versions that start with 2., if there is a lock file the version recorded there is downloaded, if a library has several requests the highest version is chosen, and a name that does not exist becomes a "could not be found" error. It was also confirmed that if you change only the version in build.gradle while a lock file exists, an error says it does not match the lock file, so the lock file has to be updated too. Not confirmed by execution: the verdicts "vulnerable", "malicious", and "fake" are a made-up storyline, and the process by which code that came into the build actually runs is not covered. Version rules differ from tool to tool. When there are several requests, Maven picks not the highest version but the version nearest to my project (dependency mediation in the Maven documentation), and npm writes ranges such as ^1.2.0 by default and pins them with package-lock.json. Fake packages with similar names are mainly a problem in repositories that tell packages apart by name alone, and Maven Central verifies ownership of group names, so it is hard to publish a fake under the same group. Here, for the sake of the explanation, the fake is made up to be in the same group.',
});

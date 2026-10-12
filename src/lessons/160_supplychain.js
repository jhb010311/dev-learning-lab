Lab.register({
  id: 'supplychain', nav: '의존성과 공급망', cat: '인증', mode: 'step',
  title: '내가 적지 않은 라이브러리는 어떻게 내 프로그램에 들어오고, 그 버전은 누가 정하나',
  intro: '빌드 파일에 라이브러리 한 줄을 적으면, 그 라이브러리가 필요로 하는 다른 라이브러리(전이 의존성)까지 함께 들어와 내 프로그램의 일부로 실행됩니다. 그래서 내가 고른 적 없는 라이브러리의 취약점도 내 문제가 됩니다. 버전을 범위로 적었는지 고정했는지에 따라 새로 올라온 버전이 자동으로 들어오기도 하고, 이름을 한 글자 잘못 적으면 전혀 다른 패키지가 들어오기도 합니다. 라이브러리가 만들어져 저장소를 거쳐 내 빌드에 들어오기까지의 길을 공급망이라고 하고, 그 길 어딘가에 악성 코드를 끼워 넣는 것이 공급망 공격입니다. 여기 나오는 라이브러리 이름과 취약점은 모두 설명을 위해 꾸민 것입니다.',
  terms: ['전이 의존성', '버전 범위와 잠금 파일', '공급망 공격과 타이포스쿼팅', 'CI/CD'],
  controls: [
    { id: 'topic', label: '살펴볼 상황', type: 'select', value: 'range', options: [['range', '버전을 범위로 적었을 때와 고정했을 때'], ['fix', '전이 의존성의 취약점이 알려졌을 때'], ['typo', '이름이 비슷한 가짜 패키지']] },
    { id: 'ver', label: 'build.gradle에 적은 web-kit의 버전', type: 'select', value: 'range', options: [['fixed', '2.0.0 (고정)'], ['range', '2.+ (범위: 2.x 가운데 가장 높은 버전)'], ['lock', '2.+ 로 적고 잠금 파일을 둠']], show: function (c) { return c.topic === 'range'; } },
    { id: 'news', label: '처음 빌드한 뒤 저장소에 올라온 것', type: 'select', value: 'evil', options: [['evil', 'web-kit 2.1.0 (악성 코드가 섞인 버전)'], ['patch', 'web-kit 2.0.1 (취약점을 고친 버전)']], show: function (c) { return c.topic === 'range'; } },
    { id: 'avail', label: 'web-kit이 취약점을 고친 새 버전을 냈는가', type: 'select', value: 'yes', options: [['yes', '냈음 (web-kit 2.0.1)'], ['no', '아직 내지 않음 (json-lite 1.2.1만 나옴)']], show: function (c) { return c.topic === 'fix'; } },
    { id: 'act', label: '내가 한 대응', type: 'select', value: 'none', options: [['none', '아무것도 하지 않고 다시 빌드'], ['bump', 'web-kit의 버전을 올림'], ['override', 'json-lite의 버전만 덮어씀 (constraints)']], show: function (c) { return c.topic === 'fix'; } },
    { id: 'name', label: 'build.gradle에 적은 이름', type: 'select', value: 'typo', options: [['typo', 'web-kti (글자 순서가 바뀜. 그 이름의 가짜가 올라와 있음)'], ['ok', 'web-kit (바른 이름)'], ['miss', 'web-kitt (글자가 하나 더 붙음. 그런 이름은 없음)']], show: function (c) { return c.topic === 'typo'; } },
  ],
  presets: [
    { t: '처음 설정으로', q: 'build.gradle에 web-kit을 2.+로 적고 처음 빌드한 뒤 web-kit 2.1.0이 올라왔을 때 다시 빌드하면 무슨 일이 생기나', d: '버전을 2.+ 로 적은 빌드. 코드를 바꾸지 않았는데 악성 버전이 들어옵니다.', v: { topic: 'range', ver: 'range', news: 'evil', avail: 'yes', act: 'none', name: 'typo' } },
    { t: '잠금 파일을 두면', q: 'web-kit을 2.+로 적고 잠금 파일을 두면', d: '2.+ 라고 적어도 잠금 파일에 적힌 버전만 받습니다.', v: { topic: 'range', ver: 'lock', news: 'evil', avail: 'yes', act: 'none', name: 'typo' } },
    { t: '범위가 도움이 되는 경우', q: '처음 빌드한 뒤 취약점을 고친 web-kit 2.0.1이 저장소에 올라왔으면', d: '취약점을 고친 버전이 올라오면 자동으로 따라갑니다.', v: { topic: 'range', ver: 'range', news: 'patch', avail: 'yes', act: 'none', name: 'typo' } },
    { t: '전이 의존성의 취약점', q: '전이 의존성인 json-lite의 취약점이 알려졌는데 아무것도 하지 않고 다시 빌드하면', d: '내가 적지 않은 json-lite에서 취약점이 알려졌습니다. 그대로 두면 남습니다.', v: { topic: 'fix', ver: 'range', news: 'evil', avail: 'yes', act: 'none', name: 'typo' } },
    { t: '버전 올리기', q: '전이 의존성의 취약점이 알려졌는데 web-kit의 버전을 올리면', d: 'web-kit을 올리면 json-lite도 함께 바뀝니다.', v: { topic: 'fix', ver: 'range', news: 'evil', avail: 'yes', act: 'bump', name: 'typo' } },
    { t: '올릴 버전이 아직 없을 때', q: 'web-kit은 새 버전을 내지 않고 json-lite 1.2.1만 나왔을 때 json-lite 버전만 constraints로 덮어쓰면', d: '전이 의존성의 버전만 덮어씁니다.', v: { topic: 'fix', ver: 'range', news: 'evil', avail: 'no', act: 'override', name: 'typo' } },
    { t: '이름을 한 글자 잘못 적으면', q: 'build.gradle에 글자 순서가 바뀐 web-kti라고 잘못 적으면', d: '오류 없이 가짜 패키지가 들어옵니다.', v: { topic: 'typo', ver: 'range', news: 'evil', avail: 'yes', act: 'none', name: 'typo' } },
  ],
  // 가상의 저장소: 라이브러리 → 버전 → 그 버전의 설명 파일(POM)에 적힌 의존성
  REG: {
    'web-kit': { '2.0.0': { 'json-lite': '1.2.0' }, '2.0.1': { 'json-lite': '1.2.1' }, '2.1.0': { 'json-lite': '1.2.0' } },
    'json-lite': { '1.2.0': {}, '1.2.1': {} },
    'mail-kit': { '1.4.0': { 'text-util': '3.1.0' } },
    'text-util': { '3.1.0': {} },
    'web-kti': { '2.0.0': { 'web-kit': '2.0.0' } },
  },
  NAME: { ok: 'web-kit', typo: 'web-kti', miss: 'web-kitt' },
  // 그 시점에 저장소에 올라와 있는 버전. first는 "처음 빌드한 날"
  available: function (c, first) {
    var a = { 'web-kit': ['2.0.0'], 'json-lite': ['1.2.0'], 'mail-kit': ['1.4.0'], 'text-util': ['3.1.0'] };
    if (c.topic === 'fix') { a['json-lite'].push('1.2.1'); if (c.avail === 'yes') a['web-kit'].push('2.0.1'); }
    if (c.topic === 'range' && !first) { if (c.news === 'patch') { a['web-kit'].push('2.0.1'); a['json-lite'].push('1.2.1'); } else a['web-kit'].push('2.1.0'); }
    if (c.topic === 'typo') a['web-kti'] = ['2.0.0'];
    return a;
  },
  // 버전 비교: 점으로 나눈 숫자를 앞에서부터 견준다
  newer: function (a, b) { var x = a.split('.'), y = b.split('.'); for (var i = 0; i < Math.max(x.length, y.length); i++) { var d = (+x[i] || 0) - (+y[i] || 0); if (d) return d > 0; } return false; },
  highest: function (vs) { var self = this; return vs.reduce(function (m, v) { return self.newer(v, m) ? v : m; }); },
  // 의존성 해석: 직접 적은 것에서 시작해 설명 파일을 따라가며 버전을 정한다.
  // 2.+ 는 그 글자로 시작하는 가장 높은 버전, 잠금 파일이 있으면 거기 적힌 버전, 한 라이브러리에 요구가 여럿이면 가장 높은 버전(Gradle의 규칙).
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
  // 설정에서 "무엇을 적었고, 저장소에 무엇이 있고, 그래서 무엇이 들어왔는지"를 계산한다
  plan: function (c) {
    var first = null, lock = null, cons = null, wk = '2.0.0', name = 'web-kit';
    if (c.topic === 'range') { wk = c.ver === 'fixed' ? '2.0.0' : '2.+'; first = this.resolve(this.available(c, true), [['web-kit', wk], ['mail-kit', '1.4.0']], null, null); if (c.ver === 'lock') lock = first.ver; }
    if (c.topic === 'fix') { if (c.act === 'bump' && c.avail === 'yes') wk = '2.0.1'; if (c.act === 'override') cons = { 'json-lite': '1.2.1' }; }
    if (c.topic === 'typo') name = this.NAME[c.name];
    var direct = [[name, wk], ['mail-kit', '1.4.0']], avail = this.available(c, false), now = this.resolve(avail, direct, lock, cons);
    return { direct: direct, wk: wk, name: name, lock: lock, cons: cons, avail: avail, first: first, now: now };
  },
  // json-lite가 어디서 들어왔는지: 직접 적은 것에서 json-lite까지의 길
  pathTo: function (res, target) {
    var path = [target + ' ' + res.ver[target]], cur = target, guard = 0;
    while (cur !== 'shop-api' && guard++ < 6) { var e = res.edges.filter(function (x) { return x[1] === cur && x[0] !== 'constraints'; })[0]; if (!e) break; cur = e[0]; path.unshift(cur === 'shop-api' ? cur : cur + ' ' + res.ver[cur]); }
    return path;
  },
  code: function (c) {
    var p = this.plan(c), lines = ['// build.gradle (내 프로젝트 shop-api)', 'dependencies {', "    implementation 'lab.demo:" + p.name + ':' + p.wk + "'", "    implementation 'lab.demo:mail-kit:1.4.0'"];
    if (p.cons) lines.push('    constraints {', "        implementation 'lab.demo:json-lite:1.2.1'   // 전이 의존성의 버전을 덮어쓴다", '    }');
    lines.push('}');
    if (c.topic === 'range' && c.ver === 'lock') lines = lines.concat(['', 'dependencyLocking {', '    lockAllConfigurations()', '}', '', '// gradle.lockfile (처음 빌드한 날 ./gradlew dependencies --write-locks 로 만든 파일)', '// = 뒤는 그 버전을 쓰는 곳(컴파일, 실행, 테스트)의 이름이다'], ['json-lite:1.2.0', 'mail-kit:1.4.0', 'text-util:3.1.0', 'web-kit:2.0.0'].map(function (x) { return '// lab.demo:' + x + '=compileClasspath,runtimeClasspath,testCompileClasspath,testRuntimeClasspath'; }));
    if (c.topic === 'fix') lines.push('', '// json-lite가 어디서 들어오는지 찾는 명령', '// ./gradlew dependencyInsight --dependency json-lite');
    lines.push('', '// lab.demo로 시작하는 라이브러리는 모두 설명을 위해 꾸민 것이다');
    return lines.join('\n');
  },
  label: function (c) {
    if (c.topic === 'range') return '범위와 고정 · ' + { fixed: '2.0.0 고정', range: '2.+', lock: '2.+ 와 잠금 파일' }[c.ver] + ' · ' + (c.news === 'evil' ? '악성 2.1.0이 올라옴' : '고친 2.0.1이 올라옴');
    if (c.topic === 'fix') return '취약점 대응 · ' + (c.avail === 'yes' ? 'web-kit 2.0.1 있음' : 'web-kit 새 버전 없음') + ' · ' + { none: '대응 없음', bump: '버전 올림', override: 'json-lite 덮어씀' }[c.act];
    return '가짜 패키지 · 적은 이름 ' + this.NAME[c.name];
  },
  columns: ['빌드에 들어온 web-kit', '빌드에 들어온 json-lite', '판정'],
  simulate: function (c) {
    var p = this.plan(c), now = p.now, self = this, ev = [], sum = [], REG = this.REG;
    var vulnKnown = c.topic === 'fix' || (c.topic === 'range' && c.news === 'patch');
    var st = { reg: [], decl: [], lock: '', libs: [], verdict: '', path: '' };
    function push(s, k) { ev.push({ s: s, k: k, snap: JSON.parse(JSON.stringify(st)) }); }
    function regText(avail, flag) {
      return ['web-kit', 'json-lite', 'web-kti'].filter(function (n) { return avail[n]; }).map(function (n) {
        return [n, avail[n].map(function (v) { return v + (flag && n === 'json-lite' && v === '1.2.0' && vulnKnown ? '(취약)' : flag && n === 'web-kit' && v === '2.1.0' ? '(악성)' : ''); }).join(' · '), n === 'web-kti' ? 'bad' : ''];
      });
    }
    // 해석 결과를 그림과 표에 쓸 목록으로 바꾼다. depth는 직접 적은 것에서 몇 걸음 떨어져 있는지
    function libs(res, flag, only) {
      var out = [], depth = {};
      function walk(n, d) { if (depth[n] === undefined || d < depth[n]) depth[n] = d; res.edges.forEach(function (e) { if (e[0] === n && d < 5) walk(e[1], d + 1); }); }
      res.edges.forEach(function (e) { if (e[0] === 'shop-api') walk(e[1], 1); });
      Object.keys(res.ver).forEach(function (n) {
        if (only && only.indexOf(n) < 0) return;
        var v = res.ver[n], from = res.edges.filter(function (e) { return e[1] === n && e[0] !== 'constraints'; })[0][0], cls = '', note = '';
        if (flag && n === 'json-lite' && v === '1.2.0' && vulnKnown) { cls = 'bad'; note = '취약'; }
        if (flag && n === 'json-lite' && v === '1.2.1') { cls = 'good'; note = '고친 버전'; }
        if (flag && n === 'web-kit' && v === '2.1.0') { cls = 'bad'; note = '악성'; }
        if (flag && n === 'web-kit' && v === '2.0.1') { cls = 'good'; note = '고친 버전'; }
        if (n === 'web-kti') { cls = flag ? 'bad' : ''; note = flag ? '가짜' : ''; }
        out.push({ n: n, v: v, from: from, depth: depth[n], row: n === 'mail-kit' || n === 'text-util' ? 1 : 0, cls: cls, note: note });
      });
      return out;
    }
    function decl() { var d = p.direct.map(function (x) { return x[0] + ':' + x[1]; }); if (p.cons) d.push('덮어쓴 것:', 'json-lite:1.2.1'); return d; }
    var wkNow = now.ver['web-kit'], jlNow = now.ver['json-lite'], verdict, k;
    if (c.topic === 'range') {
      var f = p.first, evil = c.news === 'evil', newV = evil ? '2.1.0' : '2.0.1';
      st.reg = regText(this.available(c, true), false); st.decl = ['web-kit:' + p.wk, 'mail-kit:1.4.0']; st.libs = libs(f, false);
      push('처음 빌드한 날입니다. build.gradle에 web-kit의 버전을 ' + p.wk + (c.ver === 'fixed' ? '이라고 고정해 적었습니다. 적은 그대로 2.0.0 버전이 들어오고, web-kit이 필요로 하는 json-lite 1.2.0도 함께 들어옵니다.' : ' 라고 적었습니다. "2.x 버전 가운데 가장 높은 것"이라는 뜻입니다(2.0.0, 2.0.1, 2.1.0이 모두 2.x입니다). 지금 저장소에 올라와 있는 web-kit은 2.0.0 하나뿐이므로 2.0.0 버전이 들어오고, web-kit이 필요로 하는 json-lite 1.2.0도 함께 들어옵니다.'), '');
      if (c.ver === 'lock') { st.lock = 'web-kit 2.0.0, json-lite 1.2.0, mail-kit 1.4.0, text-util 3.1.0'; push('./gradlew dependencies --write-locks: 지금 고른 버전을 잠금 파일(gradle.lockfile)에 적어 둡니다. 직접 적은 web-kit 2.0.0뿐 아니라 전이 의존성인 json-lite 1.2.0까지 모두 적힙니다. 이 파일은 코드와 함께 Git에 올립니다.', ''); }
      st.reg = regText(p.avail, true);
      if (vulnKnown) st.libs = libs(f, true);
      push(evil ? '며칠 뒤 저장소에 web-kit 2.1.0이 올라옵니다. (꾸민 상황) 배포 계정을 빼앗은 누군가가 악성 코드를 넣어 올린 버전입니다. 내 코드가 아니라 라이브러리가 들어오는 길을 노린 공급망 공격입니다. 저장소에서는 평범한 새 버전으로 보입니다.' : '며칠 뒤 (꾸민 상황) json-lite 1.2.0의 취약점이 알려지고, 고친 json-lite 1.2.1과 그것을 쓰도록 바꾼 web-kit 2.0.1이 저장소에 올라옵니다.', '');
      var moved = wkNow !== '2.0.0';
      st.libs = libs(now, true);
      k = evil ? (moved ? 'bad' : 'good') : (moved ? 'good' : 'bad');
      push('내 코드는 한 글자도 바꾸지 않고 다시 빌드합니다: ' + (c.ver === 'fixed' ? '버전을 2.0.0이라고 고정해 적었으므로, 저장소에 무엇이 새로 올라왔든 2.0.0 버전을 받습니다.' : c.ver === 'lock' ? 'build.gradle에는 2.+ 라고 적혀 있지만 잠금 파일이 있습니다. 저장소에서 새로 고르지 않고 잠금 파일에 적힌 web-kit 2.0.0과 json-lite 1.2.0을 받습니다.' : '2.+ 에 맞는 버전을 저장소에서 다시 찾습니다. 2.0.0과 ' + newV + ' 가운데 더 높은 ' + newV + ' 버전을 고릅니다. 지난번과 다른 코드가 내 프로그램에 들어왔습니다.'), k);
      verdict = evil ? (moved ? '악성 버전이 자동으로 들어옴' : '악성 버전이 들어오지 않음') : (moved ? '고친 버전을 자동으로 따라감' : '고친 버전이 나왔지만 예전 버전 그대로');
      st.verdict = verdict;
      push(evil ? (moved ? '빌드는 성공합니다. 오류도 경고도 없습니다. 악성 코드가 든 web-kit 2.1.0이 내 프로그램의 일부로 배포됩니다.' : '빌드에 들어온 것은 처음 빌드한 날과 똑같습니다. 악성 버전은 들어오지 않았습니다.') : (moved ? 'web-kit 2.0.1이 json-lite 1.2.1을 요구하므로 json-lite도 고친 버전으로 바뀌었습니다. 아무것도 하지 않았는데 취약점이 고쳐졌습니다.' : '빌드에 들어온 것은 처음 빌드한 날과 똑같습니다. 고친 버전이 나와 있지만 취약한 json-lite 1.2.0이 그대로 남아 있습니다.'), k);
      if (c.ver === 'range') sum.push('버전을 범위로 적으면 같은 코드를 빌드해도 날마다 결과가 달라질 수 있습니다. 고친 버전을 자동으로 받는 것도, 악성 버전을 자동으로 받는 것도 같은 성질에서 나옵니다. 무엇이 들어올지를 저장소에 올리는 사람이 정하게 됩니다.');
      if (c.ver === 'fixed') sum.push('버전을 고정하면 내가 고쳐 적기 전에는 바뀌지 않습니다. 다만 직접 적은 것만 고정됩니다. web-kit의 설명 파일이 json-lite를 범위로 적어 두었다면 그쪽은 여전히 바뀔 수 있고, 그것까지 묶어 두는 것이 잠금 파일입니다.');
      if (c.ver === 'lock') sum.push('잠금 파일은 전이 의존성까지 모든 버전을 적어 두고 그대로만 받게 합니다. 누가 언제 빌드해도 같은 결과가 나옵니다. 새 버전은 내가 잠금 파일을 갱신할 때만 들어오므로, 그때 무엇이 바뀌는지 살펴볼 수 있습니다.');
      if (!evil && !moved) sum.push('고정이나 잠금은 "가만히 있으면 안전하다"는 뜻이 아닙니다. 고친 버전도 자동으로 들어오지 않으므로, 취약점 공지를 꾸준히 확인하고 스스로 올려야 합니다.');
    } else if (c.topic === 'fix') {
      var firstRes = this.resolve(this.available(c, false), [['web-kit', '2.0.0'], ['mail-kit', '1.4.0']], null, null);
      st.reg = regText({ 'web-kit': ['2.0.0'], 'json-lite': ['1.2.0'] }, false); st.decl = ['web-kit:2.0.0', 'mail-kit:1.4.0']; st.libs = libs(firstRes, false, ['web-kit', 'mail-kit']);
      push('내 build.gradle에는 web-kit 2.0.0과 mail-kit 1.4.0, 두 줄만 적혀 있습니다. 내가 직접 고른 라이브러리이고, 이것을 직접 의존성이라고 합니다.', '');
      st.libs = libs(firstRes, false);
      push('빌드 도구(Gradle)가 두 라이브러리에 딸린 설명 파일(POM)을 읽습니다: web-kit 2.0.0은 json-lite 1.2.0이, mail-kit 1.4.0은 text-util 3.1.0이 필요하다고 적혀 있습니다. 내가 적지 않은 두 라이브러리가 함께 들어옵니다. 이것이 전이 의존성이고, 내 프로그램 안에서 직접 의존성과 똑같이 실행됩니다.', '');
      st.reg = regText(p.avail, true); st.libs = libs(firstRes, true);
      push('(꾸민) 보안 공지가 올라옵니다: json-lite 1.2.0에 취약점이 있고 1.2.1 버전에서 고쳐졌습니다. ' + (c.avail === 'yes' ? 'web-kit도 json-lite 1.2.1을 쓰도록 바꾼 2.0.1 버전을 냈습니다.' : 'web-kit은 아직 새 버전을 내지 않았습니다.') + ' 그런데 내 build.gradle에는 json-lite라는 이름이 없습니다.', 'bad');
      st.path = this.pathTo(firstRes, 'json-lite').join(' → ');
      push('./gradlew dependencyInsight --dependency json-lite: 이 라이브러리가 어디서 들어오는지 찾습니다. 결과는 ' + st.path + '입니다. 내가 적은 web-kit이 끌어온 것입니다.', '');
      st.decl = decl(); st.libs = libs(now, true); st.path = this.pathTo(now, 'json-lite').join(' → ');
      var fixed = jlNow === '1.2.1';
      if (c.act === 'none') push('아무것도 바꾸지 않고 다시 빌드합니다. 고친 버전이 저장소에 올라와 있어도, 버전을 고정해 적은 빌드는 스스로 바뀌지 않습니다. 여전히 json-lite 1.2.0이 들어옵니다.', 'bad');
      else if (c.act === 'bump' && c.avail === 'yes') push('build.gradle의 web-kit 버전을 2.0.1로 고쳐 적습니다. web-kit 2.0.1의 설명 파일은 json-lite 1.2.1을 요구하므로, json-lite도 함께 1.2.1 버전으로 바뀝니다.', 'good');
      else if (c.act === 'bump') push('web-kit의 버전을 올리려고 저장소를 봅니다: 2.0.0보다 높은 버전이 아직 없습니다. 올릴 수 없으므로 빌드는 그대로이고 json-lite 1.2.0이 남습니다.', 'bad');
      else push('build.gradle의 constraints에 json-lite 1.2.1을 적습니다. web-kit ' + wkNow + '의 설명 파일은 여전히 json-lite ' + REG['web-kit'][wkNow]['json-lite'] + ' 버전을 요구하지만, 한 라이브러리에 요구가 둘이면 Gradle은 더 높은 버전을 고릅니다. web-kit은 그대로 두고 json-lite만 1.2.1 버전으로 바뀝니다.', 'good');
      verdict = fixed ? '취약점이 고쳐진 json-lite로 바뀜' : '취약한 json-lite가 그대로 남음'; st.verdict = verdict; k = fixed ? 'good' : 'bad';
      push('다시 빌드한 결과: web-kit ' + wkNow + ', json-lite ' + jlNow + '. ' + (fixed ? '취약한 버전이 빌드에서 빠졌습니다. 바꾼 뒤에는 테스트를 돌려 전과 같이 동작하는지 확인합니다.' : '취약한 버전이 여전히 내 프로그램 안에 있습니다.'), k);
      sum.push('빌드에 들어온 라이브러리는 네 개인데 내가 적은 것은 둘뿐입니다. 취약점 공지는 내가 적지 않은 쪽에서도 나옵니다. 그래서 전이 의존성까지 포함한 전체 목록과 버전을 알고 있어야 하고, 의존성 나무(./gradlew dependencies)와 dependencyInsight로 경로를 찾습니다.');
      if (c.act === 'bump' && c.avail === 'yes') sum.push('직접 의존성이 고친 버전을 냈다면 그것을 올리는 것이 가장 깔끔합니다. web-kit을 만든 쪽이 json-lite 1.2.1과 함께 시험한 조합을 그대로 받기 때문입니다.');
      if (c.act === 'bump' && c.avail === 'no') sum.push('직접 의존성이 아직 새 버전을 내지 않았다면 기다리는 동안 취약한 채로 남습니다. 이럴 때는 전이 의존성의 버전만 덮어쓰는 방법이 있습니다.');
      if (c.act === 'override') sum.push('덮어쓰기는 직접 의존성이 새 버전을 내기 전에도 쓸 수 있습니다. 대신 web-kit ' + wkNow + '을 만든 쪽이 시험해 보지 않은 조합일 수 있으므로 테스트로 확인하고, 필요 없어지면 덮어쓴 줄을 지웁니다.' + (c.avail === 'yes' ? ' 지금처럼 web-kit의 고친 버전이 나와 있다면 그것을 올리는 편이 낫습니다.' : ''));
      if (c.act === 'none') sum.push('취약점이 알려졌다는 사실을 Gradle이 빌드할 때 스스로 알려 주지는 않습니다. 의존성의 취약점을 찾아 주는 검사 도구를 빌드 과정에 넣어 두고 공지를 꾸준히 확인해야 알아챌 수 있습니다.');
    } else {
      var nm = p.name;
      st.reg = regText(p.avail, false); st.decl = [nm + ':2.0.0', 'mail-kit:1.4.0']; st.libs = libs(this.resolve(p.avail, [['mail-kit', '1.4.0']], null, null), false);
      push("build.gradle에 새 줄을 추가합니다. 추가한 줄은 implementation 'lab.demo:" + nm + ":2.0.0' 입니다. " + (c.name === 'ok' ? '이름을 바르게 적었습니다.' : c.name === 'typo' ? 'web-kit을 적으려다 글자 두 개의 순서를 바꿔 web-kti라고 적었습니다.' : 'web-kit을 적으려다 t를 하나 더 붙여 web-kitt라고 적었습니다.'), c.name === 'ok' ? '' : 'bad');
      if (c.name === 'miss') {
        verdict = '빌드 실패로 오타를 알아챔'; st.verdict = verdict;
        push('빌드 도구는 적힌 이름 그대로 저장소에서 찾습니다. web-kitt라는 이름의 패키지는 저장소에 없습니다. "찾을 수 없다"는 오류로 빌드가 멈춥니다. 오류 덕분에 오타를 알아채고 고칠 수 있습니다.', 'good');
        sum.push('오타가 오류로 드러나는 것은 그 이름으로 올라온 패키지가 없을 때뿐입니다. 누군가 그 이름을 먼저 차지해 두었다면 오류 없이 다른 것이 들어옵니다.');
        return { events: ev, summary: sum, row: ['없음 (빌드 실패)', '없음 (빌드 실패)', verdict], ver: now.ver, missing: now.missing, path: [] };
      }
      st.reg = regText(p.avail, true); st.libs = libs(now, true, [nm, 'mail-kit', 'text-util']);
      push('빌드 도구는 적힌 이름 그대로 저장소에서 찾습니다. 그 이름이 내가 뜻한 라이브러리인지는 판단하지 않습니다. ' + (c.name === 'ok' ? 'web-kit 2.0.0을 찾아 받습니다.' : '(꾸민 상황) 누군가 흔한 오타를 노리고 web-kti라는 이름으로 패키지를 올려 두었습니다. 그것을 찾아 받습니다. 오류는 나지 않습니다.'), c.name === 'ok' ? '' : 'bad');
      st.libs = libs(now, true);
      push(c.name === 'ok' ? 'web-kit 2.0.0의 설명 파일(POM)을 읽습니다: json-lite 1.2.0이 필요하다고 적혀 있으므로 함께 들어옵니다.' : '가짜 web-kti의 설명 파일(POM)에는 진짜 web-kit 2.0.0이 의존성으로 적혀 있습니다. 그래서 진짜 web-kit과 json-lite도 함께 들어오고, 내 코드는 평소처럼 컴파일되고 동작합니다. 눈에 띄는 이상이 없습니다.', c.name === 'ok' ? '' : 'bad');
      verdict = c.name === 'ok' ? '의도한 라이브러리가 들어옴' : '가짜 패키지가 함께 들어옴'; st.verdict = verdict; k = c.name === 'ok' ? 'good' : 'bad';
      push(c.name === 'ok' ? '빌드에 들어온 것은 web-kit 2.0.0과 그것이 끌어온 json-lite 1.2.0입니다. 의도한 대로입니다.' : '빌드는 성공합니다. 가짜 web-kti 안에 든 코드도 내 프로그램의 일부가 되어 같은 권한으로 실행됩니다. 서버의 환경 변수나 파일을 읽어 밖으로 보내는 코드가 들어 있어도 막을 것이 없습니다.', k);
      if (c.name === 'typo') sum.push('이름이 비슷한 가짜 패키지를 올려 두고 오타를 기다리는 수법을 타이포스쿼팅이라고 합니다. 이것도 공급망 공격의 한 가지입니다. 진짜를 의존성으로 끌어와 정상 동작하게 만들면 알아채기 어렵습니다. 이름을 외워서 치지 말고 공식 문서나 저장소 페이지에서 복사하고, 새 의존성을 추가한 변경은 코드 리뷰에서 이름과 만든 곳을 확인합니다.');
      if (c.name === 'ok') sum.push('바르게 적었을 때와 오타를 냈을 때 빌드 화면은 똑같이 성공으로 보입니다. 차이는 들어온 라이브러리의 목록에만 있습니다.');
    }
    var wkCol = (c.topic === 'typo' && c.name === 'typo' ? 'web-kti 2.0.0(가짜)과 ' : '') + 'web-kit ' + wkNow;
    return { events: ev, summary: sum, row: [wkCol, 'json-lite ' + jlNow, verdict], ver: now.ver, missing: now.missing, path: this.pathTo(now, 'json-lite') };
  },
  render: function (v, sim, t, H, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : null;
    if (!s) { H.text(v, '실행을 누르면 한 단계씩 진행합니다.'); return; }
    H.table(v, ['라이브러리', '버전', '어떻게 들어왔나', '상태'], s.libs.map(function (l) { return { cells: [l.n, l.v, l.from === 'shop-api' ? '내가 build.gradle에 적음 (직접)' : l.from + '이 필요로 함 (전이)', { v: l.note || '-', cls: l.cls }] }; }), '지금 빌드에 들어와 있는 라이브러리 ' + s.libs.length + '개');
    if (s.lock) H.text(v, '잠금 파일에 적힌 버전: ' + s.lock);
    if (s.path) H.text(v, 'json-lite가 들어온 길: ' + s.path);
  },
  // 그림: 위에 패키지 저장소에 올라와 있는 버전, 아래에 내 프로젝트에서 시작해 직접 의존성, 전이 의존성으로 뻗는 의존성 나무.
  draw: function (P, sim, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : { reg: [], decl: [], lock: '', libs: [], verdict: '' };
    P.size(680, 316);
    P.region('reg', 16, 16, 648, 74, '패키지 저장소에 올라와 있는 버전 (모두 꾸민 라이브러리)');
    s.reg.forEach(function (r, i) { P.box('rg_' + r[0], 28 + i * 212, 40, 200, 40, { cls: r[2] || 'plain', title: r[0], sub: r[1] }); });
    if (!s.reg.length) P.box('rg_none', 28, 40, 200, 40, { cls: 'ghost', title: '아직 시작 전', sub: ' ' });
    P.region('prj', 16, 100, 648, 152, '내 빌드에 들어온 것' + (s.lock ? ' · 잠금 파일 있음' : ''));
    var X = [28, 196, 364, 520], W = [150, 150, 140, 132];
    P.box('root', X[0], 128, W[0], 112, { cls: 'wait', title: 'shop-api', sub: ['직접 적은 것:'].concat(s.decl.length ? s.decl : ['(아직 없음)']) });
    s.libs.forEach(function (l) {
      var d = Math.min(l.depth, 3);
      P.box('L_' + l.n, X[d], 128 + l.row * 62, W[d], 56, { cls: l.cls || 'plain', title: l.n + ' ' + l.v, sub: [l.depth === 1 ? '직접 적음' : '전이 (적지 않음)', l.note || ' '] });
    });
    s.libs.forEach(function (l) { P.arrow('A_' + l.n, l.from === 'shop-api' ? 'root:r:' + (l.row ? 0.72 : 0.22) : 'L_' + l.from + ':r', 'L_' + l.n + ':l', { cls: l.cls === 'bad' ? 'bad' : l.cls === 'good' ? 'good' : '' }); });
    var bad = /남음|자동으로 들어옴|가짜|예전 버전/.test(s.verdict);
    P.box('res', 16, 264, 648, 36, { cls: !s.verdict ? 'ghost' : bad ? 'bad' : 'good', title: '판정', right: s.verdict || '진행 중' });
    P.note('화살표는 "이것이 저것을 필요로 한다"는 뜻입니다. 내가 적은 것은 shop-api에서 바로 이어진 상자뿐이고, 그 오른쪽은 빌드 도구가 설명 파일을 따라가며 스스로 가져온 것입니다.');
  },
  assume: '개념을 보이기 위한 모형이며, lab.demo로 시작하는 라이브러리와 그 버전, 취약점, 악성 버전, 가짜 패키지는 모두 꾸민 것입니다. 실제 라이브러리나 실제 취약점 번호와는 관계가 없습니다. 내용의 틀은 OWASP Top 10:2025의 A03(Software Supply Chain Failures, 소프트웨어 공급망 실패)이 다루는 범위를 따랐습니다: 직접 쓰는 것뿐 아니라 전이 의존성까지 버전을 파악할 것, 취약점 공지를 꾸준히 확인할 것, 믿을 수 있는 출처에서 받을 것. 버전이 정해지는 규칙은 Gradle을 기준으로 했고, 열다섯 가지 조합에서 어떤 버전이 들어오는지와 json-lite가 들어오는 길을, 꾸민 라이브러리의 설명 파일(POM)만 담은 이 PC 안의 저장소를 Gradle 8.14.3으로 실제 해석한 결과와 대조했습니다(네트워크 없이 실행). 실행으로 확인한 규칙: 2.+ 는 2.으로 시작하는 버전 가운데 가장 높은 것을 고른다, 잠금 파일이 있으면 거기 적힌 버전을 받는다, 한 라이브러리에 요구가 여럿이면 가장 높은 버전을 고른다, 없는 이름은 찾을 수 없다는 오류가 된다. 잠금 파일이 있는 채로 build.gradle의 버전만 고치면 잠금 파일과 맞지 않는다는 오류가 나므로 잠금 파일도 함께 갱신해야 한다는 것도 확인했습니다. 실행으로 확인하지 않은 것: "취약", "악성", "가짜"라는 판정은 꾸민 줄거리이고, 빌드에 들어온 코드가 실제로 실행되는 과정은 다루지 않았습니다. 버전 규칙은 도구마다 다릅니다. Maven은 요구가 여럿일 때 가장 높은 버전이 아니라 내 프로젝트에 가장 가까운 쪽의 버전을 고르고(Maven 문서의 의존성 중재), npm은 ^1.2.0처럼 범위를 기본으로 적고 package-lock.json으로 고정합니다. 이름이 비슷한 가짜 패키지는 이름만으로 패키지를 구분하는 저장소에서 주로 문제가 되며, Maven Central은 그룹 이름의 소유를 확인하므로 같은 그룹 아래에 가짜를 올리기는 어렵습니다. 여기서는 설명을 위해 같은 그룹에 둔 것으로 꾸몄습니다.',
});

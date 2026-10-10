// "의존성과 공급망" 실습의 열다섯 가지 조합을 실제 Gradle로 해석해, 어떤 버전이 빌드에 들어오는지와 json-lite가 들어오는 길을 적는다.
// 꾸민 라이브러리(lab.demo:*)의 설명 파일(POM)만 담은 저장소를 이 PC의 폴더(verify/out/supplychain/repos)에 만들고,
// 조합마다 하나씩 만든 Gradle 프로젝트(verify/out/supplychain/project/<조합>)를 네트워크 없이(--offline) 해석한다. 내려받는 것은 없다.
//   1단계: "처음 빌드한 날"의 저장소로 해석하고, 잠금 파일을 쓰는 조합은 ./gradlew dependencies --write-locks 로 잠금 파일을 만든다
//   2단계: 새 버전이 올라온 뒤의 저장소로 다시 해석한다
//   3단계: 잠금 파일을 갱신하면 새 버전을 받는지 본다 (덧붙인 확인)
// 사용: node verify/net/supplychain_probe.js [gradle 실행 파일]
//       gradle을 주지 않으면 GRADLE_USER_HOME(없으면 ~/.gradle)의 wrapper/dists에서 찾는다. JDK는 LAB_JDK, E:/dev/jdk-21.0.12.1+1, JAVA_HOME 순서로 찾는다.
const fs = require('fs'), path = require('path'), cp = require('child_process'), os = require('os');
const work = path.join(__dirname, '..', 'out', 'supplychain'), repos = path.join(work, 'repos'), proj = path.join(work, 'project');
const G = 'lab.demo';

// 꾸민 라이브러리: 이름 → 버전 → 그 버전이 필요로 하는 것
const POMS = {
  'web-kit': { '2.0.0': { 'json-lite': '1.2.0' }, '2.0.1': { 'json-lite': '1.2.1' }, '2.1.0': { 'json-lite': '1.2.0' } },
  'json-lite': { '1.2.0': {}, '1.2.1': {} },
  'mail-kit': { '1.4.0': { 'text-util': '3.1.0' } },
  'text-util': { '3.1.0': {} },
  'web-kti': { '2.0.0': { 'web-kit': '2.0.0' } },
};
// 시점마다 저장소에 올라와 있는 버전
const BASE = { 'web-kit': ['2.0.0'], 'json-lite': ['1.2.0'], 'mail-kit': ['1.4.0'], 'text-util': ['3.1.0'] };
const REPOS = {
  base: BASE,                                                                        // 처음 빌드한 날
  evil: Object.assign({}, BASE, { 'web-kit': ['2.0.0', '2.1.0'] }),                    // 악성 코드가 섞인 web-kit 2.1.0이 올라온 뒤
  patch: Object.assign({}, BASE, { 'web-kit': ['2.0.0', '2.0.1'], 'json-lite': ['1.2.0', '1.2.1'] }),   // 고친 버전들이 올라온 뒤
  jsononly: Object.assign({}, BASE, { 'json-lite': ['1.2.0', '1.2.1'] }),              // json-lite만 고친 버전이 나오고 web-kit은 아직
  typo: Object.assign({}, BASE, { 'web-kti': ['2.0.0'] }),                             // web-kti라는 가짜가 올라와 있는 저장소
};
function write(file, text) { fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, text); }
for (const [repo, libs] of Object.entries(REPOS))
  for (const [name, versions] of Object.entries(libs)) {
    const dir = path.join(repos, repo, G.replace('.', '/'), name);
    for (const v of versions) {
      const deps = Object.entries(POMS[name][v]).map(([n, dv]) => `    <dependency><groupId>${G}</groupId><artifactId>${n}</artifactId><version>${dv}</version></dependency>`).join('\n');
      write(path.join(dir, v, name + '-' + v + '.pom'), `<?xml version="1.0" encoding="UTF-8"?>\n<project xmlns="http://maven.apache.org/POM/4.0.0">\n  <modelVersion>4.0.0</modelVersion>\n  <groupId>${G}</groupId>\n  <artifactId>${name}</artifactId>\n  <version>${v}</version>\n  <dependencies>\n${deps}\n  </dependencies>\n</project>\n`);
    }
    const last = versions[versions.length - 1];
    write(path.join(dir, 'maven-metadata.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<metadata>\n  <groupId>${G}</groupId>\n  <artifactId>${name}</artifactId>\n  <versioning>\n    <latest>${last}</latest>\n    <release>${last}</release>\n    <versions>\n${versions.map(v => `      <version>${v}</version>`).join('\n')}\n    </versions>\n  </versioning>\n</metadata>\n`);
  }

// 조합마다의 build.gradle. repo0/repo1은 1단계/2단계에 쓸 저장소, web은 web-kit 자리에 적는 줄.
// bump는 "저장소에 있는 가장 높은 web-kit 버전으로 고쳐 적는다"를 그대로 한다(그 버전을 Gradle에게 물어서 적는다).
const cases = [];
for (const ver of ['fixed', 'range', 'lock']) for (const news of ['evil', 'patch'])
  cases.push({ key: 'range|' + ver + '|' + news, repo0: 'base', repo1: news, web: `'${G}:web-kit:${ver === 'fixed' ? '2.0.0' : '2.+'}'`, lock: ver === 'lock' });
for (const avail of ['yes', 'no']) for (const act of ['none', 'bump', 'override'])
  cases.push({ key: 'fix|' + avail + '|' + act, repo0: avail === 'yes' ? 'patch' : 'jsononly', repo1: avail === 'yes' ? 'patch' : 'jsononly', web: act === 'bump' ? `"${G}:web-kit:\${latestWebKit}"` : `'${G}:web-kit:2.0.0'`, latest: act === 'bump', cons: act === 'override' });
for (const [name, id] of [['ok', 'web-kit'], ['typo', 'web-kti'], ['miss', 'web-kitt']])
  cases.push({ key: 'typo|' + name, repo0: 'typo', repo1: 'typo', web: `'${G}:${id}:2.0.0'` });
// 덧붙인 확인
cases.push({ key: 'x|bump-missing', repo0: 'jsononly', repo1: 'jsononly', web: `'${G}:web-kit:2.0.1'` });                                  // 없는 버전을 적으면
cases.push({ key: 'x|lock-stale', repo0: 'base', repo1: 'patch', web: `(stage == '0' ? '${G}:web-kit:2.+' : '${G}:web-kit:2.0.1')`, lock: true });   // 잠금 파일은 그대로 두고 버전만 고쳐 적으면
cases.push({ key: 'x|lock-update', repo0: 'base', repo1: 'patch', web: `'${G}:web-kit:2.+'`, lock: true });                                 // 잠금 파일을 갱신하면
cases.forEach(c => { c.dir = c.key.replace(/[|]/g, '_').replace(/-/g, ''); });

write(path.join(proj, 'settings.gradle'), "rootProject.name = 'shop-api-probe'\n" + cases.map(c => `include '${c.dir}'`).join('\n') + '\n');
write(path.join(proj, 'build.gradle'), '// 조합마다 하위 프로젝트가 하나씩 있다\n');
// 해석 결과를 한 줄씩 적어 내는 작업 (모든 조합이 함께 쓴다)
write(path.join(proj, 'probe.gradle'), `
tasks.register('resolveCase') {
    doLast {
        def tag = '@@|' + project.name + '|'
        def rr = configurations.runtimeClasspath.incoming.resolutionResult
        println tag + 'ver|' + rr.allComponents.findAll { it.moduleVersion != null && it.id instanceof org.gradle.api.artifacts.component.ModuleComponentIdentifier }.collect { it.moduleVersion.name + ':' + it.moduleVersion.version }.sort().join(',')
        rr.allDependencies.each { d ->
            def from = d.from.id instanceof org.gradle.api.artifacts.component.ModuleComponentIdentifier ? d.from.moduleVersion.name : 'shop-api'
            if (d instanceof org.gradle.api.artifacts.result.ResolvedDependencyResult) println tag + 'edge|' + from + '|' + d.requested.module + '|' + d.requested.version + '|' + d.selected.moduleVersion.version + '|' + (d.constraint ? 'constraint' : 'dependency')
            else println tag + 'unresolved|' + from + '|' + d.requested + '|' + d.failure.message.readLines()[0]
        }
        def failure = '-'
        try { configurations.runtimeClasspath.resolvedConfiguration.rethrowFailure() } catch (Exception e) { def c = e; while (c.cause != null && c.cause != c) c = c.cause; failure = c.message.readLines().collect { it.trim() }.findAll { it }.join(' / ') }
        println tag + 'failure|' + (failure.length() > 500 ? failure.substring(0, 500) : failure)
    }
}
`);
for (const c of cases) {
  const lines = ['// ' + c.key, "plugins { id 'java-library' }", "def stage = findProperty('stage') ?: '1'",
    `repositories { maven { url = uri("\${rootDir}/../repos/" + (stage == '0' ? '${c.repo0}' : '${c.repo1}')); metadataSources { mavenPom() } } }`];
  if (c.latest) lines.push('// 저장소에 올라와 있는 web-kit 가운데 가장 높은 버전을 물어본다', `def latestWebKit = configurations.detachedConfiguration(dependencies.create('${G}:web-kit:+')).incoming.resolutionResult.allComponents.find { it.moduleVersion != null && it.moduleVersion.name == 'web-kit' }.moduleVersion.version`);
  lines.push('dependencies {', '    implementation ' + c.web, `    implementation '${G}:mail-kit:1.4.0'`);
  if (c.cons) lines.push('    constraints {', `        implementation '${G}:json-lite:1.2.1'`, '    }');
  lines.push('}');
  if (c.lock) lines.push('dependencyLocking {', '    lockAllConfigurations()', '}');
  lines.push("apply from: rootProject.file('probe.gradle')");
  write(path.join(proj, c.dir, 'build.gradle'), lines.join('\n') + '\n');
  if (c.lock) write(path.join(proj, c.dir, 'gradle.lockfile'), '');   // 지난 실행의 잠금 파일이 결과에 섞이지 않도록 비우고 시작한다 (1단계에서 새로 쓰인다)
}

// Gradle 찾기와 실행
function findGradle() {
  if (process.argv[2]) return process.argv[2];
  const home = process.env.GRADLE_USER_HOME || path.join(os.homedir(), '.gradle'), dists = path.join(home, 'wrapper', 'dists');
  if (!fs.existsSync(dists)) return null;
  for (const d of fs.readdirSync(dists).sort().reverse()) for (const h of fs.readdirSync(path.join(dists, d))) {
    const hd = path.join(dists, d, h); if (!fs.statSync(hd).isDirectory()) continue;
    for (const g of fs.readdirSync(hd)) { const exe = path.join(hd, g, 'bin', process.platform === 'win32' ? 'gradle.bat' : 'gradle'); if (fs.existsSync(exe)) return exe; }
  }
  return null;
}
const gradle = findGradle();
if (!gradle) { console.log('Gradle을 찾지 못했습니다. 실행 파일의 경로를 인자로 주세요. (내려받지 않습니다)'); process.exit(1); }
// JDK: LAB_JDK, 작성 안내의 JDK 21, JAVA_HOME 가운데 실제로 있는 첫 번째 (JAVA_HOME이 없는 폴더를 가리키는 PC가 있다)
const jdk = [process.env.LAB_JDK, 'E:/dev/jdk-21.0.12.1+1', process.env.JAVA_HOME].find(d => d && fs.existsSync(path.join(d, 'bin')));
if (!jdk) { console.log('JDK를 찾지 못했습니다. LAB_JDK에 JDK 폴더를 지정하세요.'); process.exit(1); }
const env = Object.assign({}, process.env, { JAVA_HOME: jdk });
function run(args) {
  const all = ['--offline', '--no-daemon', '-q', '-p', proj].concat(args);
  const r = process.platform === 'win32' ? cp.spawnSync('cmd.exe', ['/c', gradle].concat(all), { env, encoding: 'utf8', maxBuffer: 1 << 26 }) : cp.spawnSync(gradle, all, { env, encoding: 'utf8', maxBuffer: 1 << 26 });
  const text = (r.stdout || '') + (r.stderr || ''), res = {};
  for (const ln of text.split(/\r?\n/)) {
    if (!ln.startsWith('@@|')) continue;
    const p = ln.split('|'), o = res[p[1]] = res[p[1]] || { ver: '', edges: [], unresolved: [], failure: '-' };
    if (p[2] === 'ver') o.ver = p[3];
    if (p[2] === 'edge') o.edges.push({ from: p[3], name: p[4], requested: p[5], selected: p[6], kind: p[7] });
    if (p[2] === 'unresolved') o.unresolved.push(p[4].split(':')[1]);
    if (p[2] === 'failure') o.failure = p.slice(3).join('|');
  }
  if (!Object.keys(res).length) { console.log('Gradle 실행 결과를 읽지 못했습니다:\n' + text.slice(-3000)); process.exit(1); }
  return { res, version: (/Gradle (\d[\d.]*)/.exec(text) || [])[1] };
}
const versionText = (() => { const r = process.platform === 'win32' ? cp.spawnSync('cmd.exe', ['/c', gradle, '--version'], { env, encoding: 'utf8' }) : cp.spawnSync(gradle, ['--version'], { env, encoding: 'utf8' }); return ((/Gradle (\d[\d.]*)/.exec(r.stdout || '') || [])[1] || '?') + ' | JVM ' + ((/(?:Launcher )?JVM:\s+(\S+)/.exec(r.stdout || '') || [])[1] || '?'); })();
// 잠금 파일은 빌드가 끝날 때 쓰이므로, 실행이 끝난 뒤 파일을 직접 읽는다 (주석 줄은 뺀다)
function lockOf(c) { const f = path.join(proj, c.dir, 'gradle.lockfile'); return fs.existsSync(f) ? fs.readFileSync(f, 'utf8').split(/\r?\n/).filter(l => l && !l.startsWith('#')).join(';') : '-'; }
// dependencies 작업은 지금 프로젝트에서만 도는 작업이라, 잠금 파일을 쓰는 조합마다 이름을 붙여 부른다
const s0 = run(['-Pstage=0', '--write-locks', 'resolveCase'].concat(cases.filter(c => c.lock).map(c => ':' + c.dir + ':dependencies'))).res;      // 1단계: 처음 빌드한 날 (+ 잠금 파일 만들기)
const locks0 = {}; cases.forEach(c => { locks0[c.dir] = c.lock ? lockOf(c) : '-'; });
const s1 = run(['-Pstage=1', 'resolveCase']).res;                                         // 2단계: 새 버전이 올라온 뒤
const s2 = run(['-Pstage=1', '--write-locks', ':x_lockupdate:resolveCase', ':x_lockupdate:dependencies']).res;   // 3단계: 잠금 파일을 갱신

// json-lite까지의 길: 직접 적은 것에서 시작해 의존성(제약이 아닌 것)을 거슬러 올라간다
function pathTo(o, target) {
  const verOf = n => (o.ver.split(',').find(x => x.startsWith(n + ':')) || ':?').split(':')[1];
  if (!o.ver.includes(target + ':')) return '-';
  const p = [target + ' ' + verOf(target)]; let cur = target;
  for (let i = 0; i < 6 && cur !== 'shop-api'; i++) { const e = o.edges.find(x => x.name === cur && x.kind === 'dependency'); if (!e) break; cur = e.from; p.unshift(cur === 'shop-api' ? cur : cur + ' ' + verOf(cur)); }
  return p.join(' > ');
}
const out = ['# gradle ' + versionText + ' | 꾸민 라이브러리(lab.demo)의 POM만 담은 로컬 저장소를 --offline으로 해석'];
for (const c of cases) {
  const a = s0[c.dir], b = s1[c.dir];
  out.push(c.key + ' => first=' + (a.ver || '-') + '|now=' + (b.ver || '-') + '|path=' + pathTo(b, 'json-lite') + '|unresolved=' + (b.unresolved.join(',') || '-') + '|failure=' + b.failure + '|lock=' + locks0[c.dir]
    + '|requests=' + b.edges.filter(e => e.name === 'json-lite').map(e => (e.kind === 'constraint' ? 'constraints' : e.from) + ':' + e.requested + '>' + e.selected).join(','));
}
out.push('x|lock-update|after-write-locks => now=' + s2['x_lockupdate'].ver + '|lock=' + lockOf(cases.find(c => c.key === 'x|lock-update')));
fs.writeFileSync(path.join(__dirname, 'supplychain_probe.out.txt'), out.join('\n') + '\n');
console.log(out.join('\n'));

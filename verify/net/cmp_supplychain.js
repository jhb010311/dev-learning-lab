// "의존성과 공급망" 실습의 모형 결과를, 꾸민 라이브러리 저장소를 실제 Gradle로 해석한 결과(supplychain_probe.out.txt)와 조합마다 대조한다.
// 대조하는 것: 빌드에 들어온 라이브러리와 버전 전체, 처음 빌드한 날의 버전, 잠금 파일에 적힌 버전, json-lite가 들어온 길, 찾지 못한 이름.
// "취약", "악성", "가짜"라는 판정은 꾸민 줄거리라서 대조 대상이 아니다.
const fs = require('fs'), path = require('path');
const { load, combos } = require('../model_rows.js');
const lesson = load('supplychain');
const lines = fs.readFileSync(path.join(__dirname, 'supplychain_probe.out.txt'), 'utf8').split(/\r?\n/).filter(Boolean);
console.log(lines[0]);
const real = {};
for (const ln of lines) {
  if (ln.startsWith('#')) continue;
  const [k, v] = ln.split(' => '), f = {};
  v.split('|').forEach(p => { const i = p.indexOf('='); f[p.slice(0, i)] = p.slice(i + 1); });
  real[k] = f;
}
const flat = ver => Object.keys(ver).sort().map(n => n + ':' + ver[n]).join(',');           // 모형의 { 이름: 버전 }을 Probe와 같은 글로
const lockVers = lock => lock.split(';').filter(l => /^lab\.demo:/.test(l)).map(l => l.split('=')[0].replace('lab.demo:', '')).sort().join(',');
const seen = new Set(); let ok = 0, n = 0;
for (const c of combos(lesson)) {
  const key = c.topic === 'range' ? 'range|' + c.ver + '|' + c.news : c.topic === 'fix' ? 'fix|' + c.avail + '|' + c.act : 'typo|' + c.name;
  if (seen.has(key)) continue; seen.add(key); n++;
  const p = lesson.plan(Object.assign({}, c)), sim = lesson.simulate(Object.assign({}, c)), f = real[key], diff = [];
  if (!f) { console.log('실행 결과 없음: ' + key); continue; }
  if (flat(p.now.ver) !== f.now) diff.push('빌드에 들어온 것: 모형 ' + flat(p.now.ver) + ' / 실제 ' + f.now);
  if ((p.now.missing || '-') !== f.unresolved) diff.push('찾지 못한 이름: 모형 ' + (p.now.missing || '-') + ' / 실제 ' + f.unresolved);
  const mp = sim.path.length ? sim.path.join(' > ') : '-';
  if (mp !== f.path) diff.push('json-lite가 들어온 길: 모형 ' + mp + ' / 실제 ' + f.path);
  if (c.topic === 'range') {
    if (flat(p.first.ver) !== f.first) diff.push('처음 빌드한 날: 모형 ' + flat(p.first.ver) + ' / 실제 ' + f.first);
    const ml = p.lock ? flat(p.lock) : '-', rl = f.lock === '-' ? '-' : lockVers(f.lock);
    if (ml !== rl) diff.push('잠금 파일: 모형 ' + ml + ' / 실제 ' + rl);
  }
  if (c.topic === 'fix') {
    // json-lite를 누가 어떤 버전으로 요구했는가 (덮어쓰기에서는 web-kit의 요구와 constraints의 요구, 둘이 있어야 한다)
    const mr = p.now.edges.filter(e => e[1] === 'json-lite').map(e => e[0] + ':' + e[2]).sort().join(','), rr = f.requests.split(',').map(x => x.split('>')[0]).sort().join(',');
    if (mr !== rr) diff.push('json-lite에 대한 요구: 모형 ' + mr + ' / 실제 ' + rr);
  }
  // 화면의 결과 표에 적히는 글이 실제 버전과 맞는가
  const failed = f.failure !== '-', verOf = name => (f.now.split(',').find(x => x.startsWith(name + ':')) || ':').split(':')[1];
  const want0 = failed ? '없음 (빌드 실패)' : (verOf('web-kti') ? 'web-kti ' + verOf('web-kti') + '(가짜)과 ' : '') + 'web-kit ' + verOf('web-kit'), want1 = failed ? '없음 (빌드 실패)' : 'json-lite ' + verOf('json-lite');
  if (sim.row[0] !== want0) diff.push('결과 표의 web-kit: 모형 ' + sim.row[0] + ' / 실제 ' + want0);
  if (sim.row[1] !== want1) diff.push('결과 표의 json-lite: 모형 ' + sim.row[1] + ' / 실제 ' + want1);
  if (diff.length) console.log('다름: ' + key + '\n   ' + diff.join('\n   ')); else ok++;
}
console.log('일치 ' + ok + ' / ' + n);

// 화면의 글에 적은 사실 가운데 조합 밖의 것을 따로 확인한다
const shownLock = lesson.code({ topic: 'range', ver: 'lock', news: 'evil', avail: 'yes', act: 'none', name: 'typo' }).split('\n').filter(l => /^\/\/ lab\.demo:.*=/.test(l)).map(l => l.slice(3)).join(';');
const extra = [
  ['없는 버전(web-kit 2.0.1)을 적으면 찾을 수 없다는 오류가 난다', /^Could not find lab\.demo:web-kit:2\.0\.1/.test(real['x|bump-missing'].failure)],
  ['없는 이름(web-kitt)은 찾을 수 없다는 오류가 난다', /^Could not find lab\.demo:web-kitt:2\.0\.0/.test(real['typo|miss'].failure)],
  ['잠금 파일을 그대로 둔 채 버전만 고쳐 적으면 잠금 파일 때문에 해석에 실패한다', /Dependency Locking/.test(real['x|lock-stale'].failure) && real['x|lock-stale'].unresolved.includes('web-kit')],
  ['잠금 파일을 갱신하면(--write-locks) 2.+ 가 새 버전을 고르고 잠금 파일에도 새 버전이 적힌다', /web-kit:2\.0\.1/.test(real['x|lock-update|after-write-locks'].now) && /web-kit:2\.0\.1=/.test(real['x|lock-update|after-write-locks'].lock) && /web-kit:2\.0\.0/.test(real['x|lock-update'].now)],
  ['화면에 적은 잠금 파일의 줄이 Gradle이 만든 것과 같다', shownLock === real['range|lock|evil'].lock.split(';').filter(l => /^lab\.demo:/.test(l)).join(';')],
  ['버전을 덮어쓴 조합에서 web-kit은 여전히 json-lite 1.2.0을 요구하고 선택된 것은 1.2.1이다', real['fix|no|override'].requests.split(',').includes('web-kit:1.2.0>1.2.1') && real['fix|no|override'].requests.split(',').includes('constraints:1.2.1>1.2.1')],
];
extra.forEach(e => { if (!e[1]) console.log('덧붙인 확인 실패: ' + e[0]); });
console.log('덧붙인 확인 ' + extra.filter(e => e[1]).length + ' / ' + extra.length);

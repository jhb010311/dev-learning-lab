// "캐시와 TTL" 실습(@Cacheable·entryTtl·sync = true 중심으로 다시 짠 것)을 대조한다. 사용: node verify/spring/cmp_cache.js
//  1. 화면의 코드(code 함수)를 설정 조합마다 뽑아, package/import 머리글만 붙이고 javac로 컴파일한다.
//     spring-data-redis는 이 컴퓨터에 없으므로 공식 시그니처만 옮긴 대역(cache_stubs/)과 함께 컴파일한다(실행하지 않음).
//  2. 화면의 @Cacheable 줄이 실제 스프링에서 실행한 프로브(src/CacheProbe.java)의 줄과 같은 글인가.
//  3. 프로브 결과(cache_probe.out.txt)가 실습의 글(요약·assume)과 문제가 기대는 사실과 맞는가.
//  4. 모형이 그 사실과 어긋나지 않는가: 기본 writer의 sync = true와 직접 짠 Cache-Aside는 @Cacheable과 결과가 같고(잠그지 않음),
//     잠그는 writer는 어느 조합에서도 DB 조회가 동시에 1건을 넘지 않는다.
// 옛 실습(이름 없는 redis 객체로 직접 짠 Cache-Aside)에는 대조 도구가 없었다.
const fs = require('fs'), path = require('path'), cp = require('child_process');
const { load, combos } = require('../model_rows.js');
const l = load('cache');
const JDK = 'E:/dev/jdk-21.0.12.1+1/bin', LIBS = 'E:/dev/java-interview-lab/verify/spring/libs/*';
const stubs = path.join(__dirname, 'cache_stubs'), out = path.join(__dirname, '..', 'out', 'cache_code');
let fail = 0; const bad = m => { fail++; console.log('다름: ' + m); };

// 1. 화면 코드 컴파일
const HEAD = ['package app;', '', 'import java.time.Duration;', 'import org.springframework.cache.annotation.Cacheable;', 'import org.springframework.cache.annotation.EnableCaching;',
  'import org.springframework.context.annotation.Bean;', 'import org.springframework.context.annotation.Configuration;', 'import org.springframework.stereotype.Service;',
  'import org.springframework.data.redis.cache.RedisCacheConfiguration;', 'import org.springframework.data.redis.cache.RedisCacheManager;', 'import org.springframework.data.redis.cache.RedisCacheWriter;',
  'import org.springframework.data.redis.connection.RedisConnectionFactory;', 'import org.springframework.data.redis.core.RedisTemplate;', '', ''].join('\n');
const texts = new Map();
for (const c of combos(l)) texts.set(l.code(c), c);
fs.rmSync(out, { recursive: true, force: true }); fs.mkdirSync(out, { recursive: true });
const stubFiles = []; (function walk(d) { for (const f of fs.readdirSync(d)) { const p = path.join(d, f); if (fs.statSync(p).isDirectory()) walk(p); else if (f.endsWith('.java')) stubFiles.push(p); } })(stubs);
let ok = 0, i = 0;
for (const [text, c] of texts) {
  const dir = path.join(out, 'v' + (++i)); fs.mkdirSync(path.join(dir, 'app'), { recursive: true });
  fs.writeFileSync(path.join(dir, 'app', 'Demo.java'), HEAD + text + '\n');
  try { cp.execFileSync(JDK + '/javac', ['-encoding', 'UTF-8', '-parameters', '-proc:none', '-cp', LIBS, '-d', path.join(dir, 'classes'), path.join(dir, 'app', 'Demo.java'), ...stubFiles], { stdio: 'pipe' }); ok++; }
  catch (e) { bad('컴파일 실패 ' + JSON.stringify(c) + '\n' + String(e.stderr).slice(0, 800)); }
}
console.log('화면 코드 컴파일(대역과 함께): ' + ok + ' / ' + texts.size);

// 2. @Cacheable 줄이 프로브와 같은가
const probeSrc = fs.readFileSync(path.join(__dirname, 'src', 'CacheProbe.java'), 'utf8');
const annLines = new Set([...texts.keys()].flatMap(t => t.split('\n').filter(x => /^\s*@Cacheable/.test(x)).map(x => x.trim())));
annLines.forEach(a => { if (!probeSrc.includes(a)) bad('화면의 ' + a + ' 줄이 프로브에 없음'); });
console.log('화면의 @Cacheable 줄 ' + annLines.size + '개가 프로브의 줄과 같음: ' + [...annLines].every(a => probeSrc.includes(a)));

// 3. 프로브 결과
const lines = fs.readFileSync(path.join(__dirname, 'cache_probe.out.txt'), 'utf8').split(/\r?\n/).filter(Boolean);
console.log(lines[0]);
const P = {}; lines.slice(1).forEach(s => { const k = s.slice(0, s.indexOf(' => ')), v = s.slice(s.indexOf(' => ') + 4), f = {}; if (v.startsWith('error=')) f.error = v.slice(6); else v.split('|').forEach(p => { const j = p.indexOf('='); f[p.slice(0, j)] = p.slice(j + 1); }); P[k] = f; });
const facts = {
  '@Cacheable만: 스레드 20개 동시 호출에 본문 20번': P.plain_map && P.plain_map.loads === P.plain_map.threads && P.plain_map.threads === '20',
  'sync = true + ConcurrentMapCache: 본문 1번, 모두 같은 객체': P.sync_map && P.sync_map.loads === '1' && P.sync_map.distinctValues === '1',
  'sync = true는 캐시의 get(key, valueLoader)를 부른다': P.sync_map && P.sync_map.cacheGetWithLoader === '20' && P.sync_map.cacheGet === '0',
  'sync = true여도 잠그지 않는 구현이면 본문 20번': P.sync_nolock && P.sync_nolock.loads === '20',
  '값이 저장된 뒤 한 번 더 부르면 본문을 실행하지 않음': P.sync_map && P.sync_map.loadsAfterOneMoreCall === '1' && P.plain_map.loadsAfterOneMoreCall === '20',
  'sync = true와 unless를 함께 쓰면 IllegalStateException': P.sync_unless && /^java\.lang\.IllegalStateException: A sync=true operation does not support the unless attribute/.test(P.sync_unless.error || ''),
};
const assume = l.assume, kb = require('../../kb/kb_cache.js').map(r => r[2]).join(' '), quiz = fs.readFileSync(path.join(__dirname, '..', '..', 'src', 'quiz_cache.js'), 'utf8');
facts['assume의 숫자(20번·1번·20번)가 프로브와 같음'] = /@Cacheable은 본문을 20번, sync = true와 ConcurrentMapCacheManager는 1번 실행했고, sync = true여도 get\(key, valueLoader\)를 잠그지 않는 캐시 구현에서는 20번/.test(assume);
facts['kb의 숫자와 예외 이름이 프로브와 같음'] = /본문이 1번만 실행되었다\(sync가 없으면 20번\)/.test(kb) && /여도 20번 실행된다/.test(kb) && /unless와 함께 쓸 수 없다\(IllegalStateException\)/.test(kb);
facts['문제의 예외 메시지가 프로브와 같음'] = quiz.includes('"A sync=true operation does not support the unless attribute"');
let fok = 0; for (const [k, v] of Object.entries(facts)) { if (v) fok++; else bad('사실 불일치: ' + k); }
console.log('프로브·글 사실 ' + fok + ' / ' + Object.keys(facts).length);

// 4. 모형의 일관성
let same = 0, n = 0, lockOk = 0, ln = 0;
for (const c of combos(l)) {
  if (c.impl === 'plain') { n++; const r = JSON.stringify(l.simulate({ ...c }).row); if (r === JSON.stringify(l.simulate({ ...c, impl: 'sync' }).row) && r === JSON.stringify(l.simulate({ ...c, impl: 'aside' }).row)) same++; else bad('sync/aside가 plain과 다름 ' + JSON.stringify(c)); }
  if (c.impl === 'lockw') { ln++; const row = l.simulate({ ...c }).row; if (row[3] === '1건') lockOk++; else bad('잠그는 writer인데 동시 조회 ' + row[3] + ' ' + JSON.stringify(c)); }
}
console.log('모형: 기본 writer의 sync = true·직접 짠 Cache-Aside = @Cacheable ' + same + ' / ' + n + ', 잠그는 writer의 동시 DB 조회 1건 ' + lockOk + ' / ' + ln);
console.log(fail ? '\n대조 실패 ' + fail + '개' : '\n대조 통과');
process.exit(fail ? 1 : 0);

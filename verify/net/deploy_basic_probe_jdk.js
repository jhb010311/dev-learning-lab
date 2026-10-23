// 기초개념 "배포"(deploy_basic) 실습의 모든 설정 조합(소스 고치기 2 × jar 새로 만들기 2 × 다시 켜기와 요청 때 3 = 12가지)을 실제 JDK로 실행한다.
// 화면의 코드(lesson.code)를 그대로 쓴다.
//   - 앞부분의 자바 파일 두 개("// 파일: …" 줄로 나뉨)를 조합마다 폴더(verify/out/deploy_basic_jdk/<조합>/)에 그대로 쓴다.
//   - "# 터미널에서" 줄 밑은 줄마다 실제로 한다.
//       ./gradlew bootJar            → Gradle은 내려받기가 필요해 쓰지 않고, 같은 일을 JDK 명령으로 한다:
//                                      javac로 src/main/java를 build/classes에 컴파일하고, jar --create로 build/libs/app.jar를 만든다.
//                                      bootJar는 의존 라이브러리를 jar 안(BOOT-INF/lib)에 넣지만, 여기서는 매니페스트의 Class-Path로
//                                      라이브러리 jar(E:/dev/java-interview-lab/verify/spring/libs)를 가리킨다. Main-Class는 DemoApplication.
//                                      Windows에서는 돌고 있는 java 프로세스가 연 app.jar를 jar --create가 바꾸지 못한다(파일 사용 중).
//                                      그때는 새 jar를 build/tmp-app.jar로 만든 뒤 그 내용을 app.jar에 그 자리에서 덮어쓴다(리눅스에서 파일을 덮어쓰는 것과 같은 결과).
//       java -jar build/libs/app.jar → 그 명령 그대로 자식 프로세스로 띄운다. "Started DemoApplication" 로그가 나오면 켜진 것으로 본다.
//       "…고쳐 저장한다" 줄          → HelloController.java의 return "버전 1";을 return "버전 2";로 실제로 고쳐 쓴다.
//       "…서버를 끈다" 줄            → 켜 둔 java 프로세스를 끝낸다(Windows에서 Node의 kill은 강제 종료이며, Ctrl+C와 달리 종료 훅이 돌지 않는다).
//       curl http://localhost:8080/hello → Windows의 curl.exe를 그 인자 그대로 실행한다.
//   요청 때마다 기록: curl의 출력과 종료 코드, 8080 포트에서 LISTENING 중인 PID(netstat), javap로 읽은 app.jar의 HelloController 상수, 디스크의 소스 파일 값.
//   "jar 파일을 새로 만든다" 뒤에 서버가 켜져 있으면 그때도 요청을 한 번 보내 본다(jar를 새로 만들어도 돌고 있는 프로세스가 그대로인지).
//   할 일을 모두 마친 뒤 서버가 켜져 있으면 한 번 더 요청한다(끈 사이에 요청한 조합에서 다시 켠 뒤의 답).
// 사용: node verify/net/deploy_basic_probe_jdk.js     결과는 verify/net/deploy_basic_probe_jdk.out.txt (8080 포트가 비어 있어야 한다)
const cp = require('child_process'), fs = require('fs'), path = require('path'), net = require('net');
const { load, combos } = require('../model_rows.js');
const lesson = load('deploy_basic');
const JDK = 'E:/dev/jdk-21.0.12.1+1/bin/', LIB = 'E:/dev/java-interview-lab/verify/spring/libs/';
const ROOT = path.join(__dirname, '..', 'out', 'deploy_basic_jdk');
const PORT = 8080;
// 스프링 부트 웹 앱(spring-boot-starter-webmvc가 끌어오는 것)에 필요한 라이브러리만 고른다. JPA·시큐리티 같은 것은 자동 설정이 켜지지 않게 뺀다.
const NAMES = 'spring-core spring-beans spring-context spring-aop spring-expression spring-web spring-webmvc spring-boot spring-boot-autoconfigure spring-boot-web-server spring-boot-tomcat spring-boot-servlet spring-boot-webmvc spring-boot-http-converter spring-boot-jackson jackson-core jackson-databind jackson-annotations tomcat-embed-core tomcat-embed-el tomcat-embed-websocket slf4j-api logback-classic logback-core jul-to-slf4j log4j-api log4j-to-slf4j micrometer-commons micrometer-observation snakeyaml jspecify commons-logging jakarta.annotation-api'.split(' ');
const libFiles = fs.readdirSync(LIB);
const JARS = NAMES.map(n => { const f = libFiles.find(x => new RegExp('^' + n.replace(/\./g, '\\.') + '-\\d').test(x)); if (!f) throw new Error('라이브러리 없음 ' + n); return f; });
const live = new Set();
const sleep = ms => new Promise(r => setTimeout(r, ms));

function sh(cmd, args, cwd) { const r = cp.spawnSync(cmd, args, { cwd, encoding: 'buffer' }); return { code: r.status, out: Buffer.concat([r.stdout || Buffer.alloc(0)]).toString('utf8'), err: Buffer.concat([r.stderr || Buffer.alloc(0)]).toString('utf8') }; }
function manifest(dir) {
  let s = 'Class-Path: ' + JARS.map(f => 'file:/' + LIB + f).join(' ');
  const lines = ['Manifest-Version: 1.0', 'Main-Class: com.example.demo.DemoApplication', s.slice(0, 70)]; s = s.slice(70);
  while (s.length) { lines.push(' ' + s.slice(0, 69)); s = s.slice(69); }
  fs.writeFileSync(path.join(dir, 'MANIFEST.MF'), lines.join('\r\n') + '\r\n');
}
// ./gradlew bootJar 대신: javac + jar
function build(dir, rec) {
  const srcs = [];
  (function walk(d) { for (const f of fs.readdirSync(d)) { const p = path.join(d, f); if (fs.statSync(p).isDirectory()) walk(p); else if (f.endsWith('.java')) srcs.push(path.relative(dir, p)); } })(path.join(dir, 'src', 'main', 'java'));
  fs.rmSync(path.join(dir, 'build', 'classes'), { recursive: true, force: true });
  const c = sh(JDK + 'javac', ['-J-Duser.language=en', '-encoding', 'UTF-8', '-proc:none', '-cp', JARS.map(f => LIB + f).join(';'), '-d', 'build/classes'].concat(srcs), dir);
  if (c.code !== 0) throw new Error('javac 실패 ' + c.out + c.err);
  manifest(dir); fs.mkdirSync(path.join(dir, 'build', 'libs'), { recursive: true });
  let j = sh(JDK + 'jar', ['--create', '--file', 'build/libs/app.jar', '--manifest', 'MANIFEST.MF', '-C', 'build/classes', '.'], dir);
  if (j.code === 0) return 'jar';
  if (!/FileSystemException/.test(j.out + j.err)) throw new Error('jar 실패 ' + j.out + j.err);
  rec.jarLocked = 'true';   // 돌고 있는 프로세스가 연 app.jar는 jar --create로 바꾸지 못함(Windows)
  j = sh(JDK + 'jar', ['--create', '--file', 'build/tmp-app.jar', '--manifest', 'MANIFEST.MF', '-C', 'build/classes', '.'], dir);
  if (j.code !== 0) throw new Error('jar(임시) 실패 ' + j.out + j.err);
  fs.writeFileSync(path.join(dir, 'build', 'libs', 'app.jar'), fs.readFileSync(path.join(dir, 'build', 'tmp-app.jar')));
  return 'overwrite';
}
function start(dir, args) {
  return new Promise((resolve, reject) => {
    const ch = cp.spawn(JDK + 'java', args, { cwd: dir, stdio: ['ignore', 'pipe', 'pipe'] });
    live.add(ch); ch.on('exit', () => live.delete(ch));
    let log = '';
    const on = d => { log += d; if (/Started DemoApplication/.test(log)) { const m = /with PID (\d+)/.exec(log), p = /Tomcat started on port (\d+)/.exec(log); resolve({ ch, pid: m ? +m[1] : ch.pid, port: p ? +p[1] : 0 }); } };
    ch.stdout.on('data', on); ch.stderr.on('data', on);
    ch.on('exit', code => reject(new Error('서버가 켜지지 못함 code=' + code + '\n' + log.slice(-1500))));
  });
}
function stop(p) { return new Promise(r => { if (p.ch.exitCode !== null || p.ch.signalCode) return r(); p.ch.once('exit', () => r()); p.ch.kill(); }); }
function curl(args) {
  const r = sh('curl.exe', args.concat(['-sS', '--max-time', '5']));
  return r.code === 0 ? r.out : '(curl ' + r.code + ': ' + r.err.trim().replace(/after \d+ ms/, 'after N ms') + ')';
}
function listeningPid() {
  const r = sh('netstat', ['-ano', '-p', 'TCP']);
  const m = new RegExp('0\\.0\\.0\\.0:' + PORT + '\\s+\\S+\\s+LISTENING\\s+(\\d+)').exec(r.out);
  return m ? +m[1] : 0;
}
function jarValue(dir) {
  if (!fs.existsSync(path.join(dir, 'build', 'libs', 'app.jar'))) return '(jar 없음)';
  const r = sh(JDK + 'javap', ['-J-Dstdout.encoding=UTF-8', '-c', '-cp', 'build/libs/app.jar', 'com.example.demo.HelloController'], dir);
  const m = /\/\/ String (.+)/.exec(r.out); return m ? m[1].trim() : '(javap: ' + r.out + r.err + ')';
}
const srcFile = dir => path.join(dir, 'src', 'main', 'java', 'com', 'example', 'demo', 'HelloController.java');
const srcValue = dir => /return "([^"]*)";/.exec(fs.readFileSync(srcFile(dir), 'utf8'))[1];
function portFree(port) { return new Promise(r => { const s = net.createServer(); s.once('error', () => r(false)); s.listen(port, '0.0.0.0', () => s.close(() => r(true))); }); }

async function runCombo(c) {
  const key = [c.edit, c.build, c.restart, c.restart ? c.when : 'after'].join('|');
  const dir = path.join(ROOT, key.replace(/\|/g, '_'));
  fs.rmSync(dir, { recursive: true, force: true }); fs.mkdirSync(dir, { recursive: true });
  const code = lesson.code(Object.assign({}, c)), lines = code.split('\n');
  const cut = lines.findIndex(l => l.startsWith('# 터미널에서'));
  // 자바 파일 쓰기
  let cur = null, files = {};
  lines.slice(0, cut).forEach(l => { const m = /^\/\/ 파일: (.+\.java)$/.exec(l); if (m) { cur = m[1]; files[cur] = []; } else if (cur) files[cur].push(l); });
  for (const [f, ls] of Object.entries(files)) { const p = path.join(dir, f); fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, ls.join('\n').replace(/\n+$/, '') + '\n'); }
  const rec = { starts: 0, builds: 0, jarLocked: 'false', beforeStop: '(끄지 않음)', afterBuild: '(해당 없음)' };
  let proc = null, firstPid = 0, lastStep = '';
  for (const l of lines.slice(cut + 1)) {
    if (/^# \d+\. /.test(l)) {
      lastStep = l;
      if (/고쳐 저장한다$/.test(l)) { const t = fs.readFileSync(srcFile(dir), 'utf8'); if (!t.includes('return "버전 1";')) throw new Error('고칠 줄 없음'); fs.writeFileSync(srcFile(dir), t.replace('return "버전 1";', 'return "버전 2";')); }
      else if (/서버를 끈다/.test(l)) { rec.beforeStop = curl(['http://localhost:' + PORT + '/hello']); await stop(proc); proc = null; }
      continue;
    }
    if (l === './gradlew bootJar') {
      rec.builds++; rec['build' + rec.builds] = build(dir, rec);
      if (/새로 만든다/.test(lastStep) && proc) rec.afterBuild = curl(['http://localhost:' + PORT + '/hello']);
    } else if (l === 'java -jar build/libs/app.jar') {
      proc = await start(dir, l.split(' ').slice(1)); rec.starts++; if (!firstPid) firstPid = proc.pid; rec.port = proc.port;
    } else if (l.startsWith('curl ')) {
      rec.response = curl(l.split(' ').slice(1));
      const lp = listeningPid();
      rec.listenPid = lp ? (lp === firstPid ? 'first' : proc && lp === proc.pid ? 'restarted' : 'other:' + lp) : '(없음)';
      rec.jar = jarValue(dir); rec.src = srcValue(dir);
    } else throw new Error('모르는 줄: ' + l);
  }
  rec.later = proc ? curl(['http://localhost:' + PORT + '/hello']) : '(서버 없음)';
  if (proc) await stop(proc);
  const f = ['response', 'listenPid', 'jar', 'src', 'beforeStop', 'afterBuild', 'later', 'starts', 'builds', 'build1', 'build2', 'jarLocked', 'port'];
  return { key, code, line: key + ' => ' + f.map(k => k + '=' + (rec[k] === undefined ? '' : rec[k])).join('|') };
}

(async () => {
  if (!await portFree(PORT)) { console.error(PORT + ' 포트가 이미 쓰이고 있어 실행하지 않음'); process.exit(1); }
  const ver = sh(JDK + 'java', ['-version']).err.split('\n')[0].trim(), cv = sh('curl.exe', ['--version']).out.split('\n')[0].trim();
  const out = ['# ' + ver + ' · ' + cv + ' · 스프링 부트 ' + JARS.find(f => /^spring-boot-\d/.test(f)).replace(/^spring-boot-|\.jar$/g, '') + ' · 포트 ' + PORT + ' · node ' + process.version + '(순서만 맡음)'], extra = [];
  const seen = new Set();
  try {
    for (const c of combos(lesson)) {
      const k = JSON.stringify(c); if (seen.has(k)) continue; seen.add(k);
      const r = await runCombo(c);
      console.log(r.line); out.push(r.line); extra.push('# 실행한 코드 ' + r.key + ' = ' + JSON.stringify(r.code));
      await sleep(300);
    }
  } finally { for (const ch of [...live]) { try { ch.kill(); } catch (e) {} } }
  await sleep(300);
  out.push('# 남은 자식 프로세스 ' + live.size + '개');
  fs.writeFileSync(path.join(__dirname, 'deploy_basic_probe_jdk.out.txt'), out.join('\n') + '\n' + extra.join('\n') + '\n');
  console.log(out[0] + '\n' + out[out.length - 1]);
})().catch(e => { console.error(e); for (const ch of live) { try { ch.kill(); } catch (x) {} } process.exit(1); });

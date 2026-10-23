// 기초개념 "로드 밸런서" 실습(nginx + 스프링 부트 서버 두 대)의 네 가지 조합(서버 구성 2 × 서버 A 끄기 2)을 실행한다.
//   뒤쪽 서버: 실제 스프링 부트 4(내장 톰캣). 화면 코드의 HelloController를 lesson.code()에서 그대로 꺼내 javac로 컴파일하고,
//             화면의 java -jar 줄에 적힌 인자(--server.port, --app.name)를 그대로 주어 켠다(jar로 묶는 대신 컴파일한 클래스로 켠다).
//   앞단 nginx: 이 컴퓨터에 nginx가 없으므로 내려받지 않고, nginx 문서와 소스에 적힌 동작대로 짠 Node 프로그램이 nginx 역할을 대신한다(아래 nginxModel).
//             화면의 nginx 설정에서 upstream의 server 줄(주소, max_fails, fail_timeout), listen, proxy_pass, proxy_next_upstream을 읽어 쓴다.
//             - 같은 가중치의 가중 라운드 로빈: nginx 소스 ngx_http_upstream_round_robin.c의 ngx_http_upstream_get_peer를 그대로 옮김
//               (current_weight += effective_weight, 가장 큰 것을 고르고 같으면 목록 앞의 것, 고른 것에서 total을 뺌)
//             - 실패한 서버: fails >= max_fails이고 마지막 실패 뒤 fail_timeout이 지나지 않았으면 고르지 않음(문서: ngx_http_upstream_module의 server 지시어)
//             - 연결 오류(error)·타임아웃(timeout)이면 같은 요청을 다음 서버에 넘김(문서: proxy_next_upstream 기본값 error timeout),
//               실패하면 fails++, checked=now, effective_weight -= weight/max_fails (소스: ngx_http_upstream_free_round_robin_peer)
//             - 남은 서버가 없으면 502 (nginx의 "no live upstreams"와 같은 결과)
//   화면의 8080·8081·8082 포트는 실행에서 각각 18270·18271·18272로 바꾼다(10190을 더함). 모두 127.0.0.1에서만 연다.
//   서버 A 끄기: 화면의 Ctrl+C 대신 서버 A 프로세스를 끝낸다(Windows에서는 TerminateProcess). 그 뒤 연결하면 연결 거부(ECONNREFUSED)가 난다.
// 사용: node verify/net/lb_basic_probe_boot.js     결과: verify/net/lb_basic_probe_boot.out.txt
// 한 줄: 구성|끄기 => a=A가 답한 수|b=B가 답한 수|fail=실패한 요청 수|reqs=요청마다의 결과(;로 나눔)|memA=서버 A의 count|memB=...|refused=nginx 모형이 연결 거부를 당한 기록|skipped=실패 기간이라 건너뛴 기록|turns=라운드 로빈이 처음 고른 서버|bodies=받은 글|setup=띄운 구성
// reqs의 한 칸: A#1 = 서버 A가 "받은 요청 1번째"라고 답함, B#3<A거부> = nginx 모형이 A에서 연결 거부를 당하고 B에 넘겨 B가 3번째라고 답함, 오류ECONNREFUSED = 클라이언트가 연결 거부 오류를 받음
const http = require('http'), fs = require('fs'), path = require('path'), cp = require('child_process'), net = require('net');
const { load, combos } = require('../model_rows.js');
const lesson = load('lb_basic');
const JDK = 'E:/dev/jdk-21.0.12.1+1/bin/', LIBS = 'E:/dev/java-interview-lab/verify/spring/libs/*';
const OFFSET = 10190, N = 6, KILL_AFTER = 3;
const work = path.join(__dirname, '..', 'out', 'lb_basic_boot');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const run = (cmd, args) => new Promise(r => cp.execFile(cmd, args, { encoding: 'utf8', maxBuffer: 1 << 26 }, (e, so, se) => r({ exit: e ? (e.code || 1) : 0, out: so + String(se) })));

// 시험용 시작 클래스(화면에서 생략한 것). 스프링 시큐리티 jar가 클래스패스에 있어 모든 요청을 열어 두고, 서버의 count를 읽는 시험용 주소를 둔다.
const MAIN = `package app;

import java.lang.reflect.Field;
import java.util.concurrent.atomic.AtomicInteger;
import org.springframework.boot.Banner;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.SpringBootConfiguration;
import org.springframework.boot.SpringBootVersion;
import org.springframework.boot.autoconfigure.EnableAutoConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.ComponentScan;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@SpringBootConfiguration
@EnableAutoConfiguration
@ComponentScan
public class Main {
    @Bean SecurityFilterChain open(HttpSecurity http) throws Exception {
        return http.csrf(c -> c.disable()).authorizeHttpRequests(a -> a.anyRequest().permitAll()).build();
    }
    public static void main(String[] args) {
        SpringApplication app = new SpringApplication(Main.class);
        app.setBannerMode(Banner.Mode.OFF);
        app.setLogStartupInfo(false);
        app.run(args);
    }

    @RestController
    static class ProbeController {
        final HelloController hello;
        ProbeController(HelloController hello) { this.hello = hello; }

        @GetMapping("/probe/count")
        String count() throws ReflectiveOperationException {
            Field f = HelloController.class.getDeclaredField("count"); f.setAccessible(true);
            Field n = HelloController.class.getDeclaredField("name"); n.setAccessible(true);
            return n.get(hello) + "|" + ((AtomicInteger) f.get(hello)).get() + "|" + ProcessHandle.current().pid() + "|boot " + SpringBootVersion.getVersion()
                + "|spring " + org.springframework.core.SpringVersion.getVersion() + "|tomcat " + org.apache.catalina.util.ServerInfo.getServerNumber() + "|java " + System.getProperty("java.version");
        }
    }
}
`;

// 화면 코드 읽기
function parseScreen(code) {
  const lines = code.split('\n');
  const jStart = lines.findIndex(l => l.startsWith('// HelloController.java'));
  if (jStart < 0) throw new Error('화면 코드에 HelloController.java가 없음');
  const java = lines.slice(jStart).join('\n');
  const conf = lines.slice(0, jStart).join('\n');
  const strip = s => s.split('\n').map(l => l.replace(/#.*$/, '')).join('\n');   // nginx 주석(#부터 줄 끝)을 뺀 설정
  const cf = strip(conf);
  const jars = [...conf.matchAll(/^java -jar app\.jar --server\.port=(\d+) --app\.name=(\w+)$/gm)].map(m => ({ port: +m[1], name: m[2] }));
  let nginx = null;
  const up = /upstream\s+(\w+)\s*\{([^}]*)\}/.exec(cf);
  if (up) {
    const servers = [...up[2].matchAll(/server\s+([\d.]+):(\d+)([^;]*);/g)].map(m => {
      const p = m[3], mf = /max_fails=(\d+)/.exec(p), ft = /fail_timeout=(\d+)s/.exec(p), w = /weight=(\d+)/.exec(p);
      return { host: m[1], port: +m[2], weight: w ? +w[1] : 1, maxFails: mf ? +mf[1] : 1, failTimeout: (ft ? +ft[1] : 10) * 1000 };   // 적지 않으면 문서의 기본값
    });
    const listen = /listen\s+(\d+);/.exec(cf), pass = /proxy_pass\s+http:\/\/(\w+);/.exec(cf), nu = /proxy_next_upstream\s+([^;]+);/.exec(cf);
    nginx = { upstream: up[1], servers, listen: listen ? +listen[1] : null, pass: pass ? pass[1] : null, nextUpstream: nu ? nu[1].trim().split(/\s+/) : ['error', 'timeout'] };
    if (nginx.pass !== nginx.upstream) throw new Error('proxy_pass가 upstream 이름과 다름');
  }
  const client = /^# 클라이언트: curl http:\/\/localhost:(\d+)\/ 요청을 (\d+)번 보낸다$/m.exec(conf);
  const kill = /^# 요청 (\d+)번 뒤 서버 A를 끈다 \(서버 A를 켠 창에서 Ctrl\+C\)$/m.exec(conf);
  return { java, jars, nginx, clientPort: client ? +client[1] : null, count: client ? +client[2] : null, killAfter: kill ? +kill[1] : null };
}

// nginx 역할 모형
function nginxModel(cfg, portOf, log) {
  const peers = cfg.servers.map(s => ({ name: portOf[s.port], port: s.port + OFFSET, weight: s.weight, eff: s.weight, cw: 0, maxFails: s.maxFails, failTimeout: s.failTimeout, fails: 0, checked: 0, accessed: 0 }));
  function getPeer(tried, entry) {
    const now = Date.now(); let best = null, total = 0;
    for (const p of peers) {
      if (tried.has(p)) continue;
      if (p.maxFails && p.fails >= p.maxFails && now - p.checked <= p.failTimeout) { entry.skipped.push(p.name); continue; }
      p.cw += p.eff; total += p.eff; if (p.eff < p.weight) p.eff++;
      if (!best || p.cw > best.cw) best = p;
    }
    if (!best) return null;
    best.cw -= total;
    if (now - best.checked > best.failTimeout) best.checked = now;
    return best;
  }
  const srv = http.createServer((req, resp) => {
    const entry = { refused: [], skipped: [], turn: null, ans: null }; log.push(entry);
    const tried = new Set();
    (function attempt() {
      const p = getPeer(tried, entry);
      if (!p) { entry.status = 502; resp.writeHead(502, { 'Content-Type': 'text/plain', Connection: 'close' }); resp.end('502 Bad Gateway'); return; }
      if (!entry.turn) entry.turn = p.name;
      tried.add(p);
      // nginx 기본: proxy_set_header Host $proxy_host; Connection close
      const up = http.request({ host: '127.0.0.1', port: p.port, path: req.url, method: req.method, agent: false, headers: { Host: cfg.upstream, Connection: 'close' } }, ur => {
        const chunks = []; ur.on('data', d => chunks.push(d));
        ur.on('end', () => {
          if (p.accessed < p.checked) p.fails = 0;
          entry.ans = p.name; entry.status = ur.statusCode;
          resp.writeHead(ur.statusCode, { 'Content-Type': ur.headers['content-type'] || 'text/plain', Connection: 'close' }); resp.end(Buffer.concat(chunks));
        });
      });
      up.setTimeout(60000, () => up.destroy(Object.assign(new Error('timeout'), { code: 'ETIMEDOUT' })));   // proxy_connect_timeout·proxy_read_timeout 기본 60초
      up.on('error', e => {
        const kind = e.code === 'ETIMEDOUT' ? 'timeout' : 'error', now = Date.now();
        entry.refused.push(p.name + ':' + (e.code || e.name));
        p.fails++; p.accessed = now; p.checked = now;
        if (p.maxFails) { p.eff -= p.weight / p.maxFails; if (p.eff < 0) p.eff = 0; }
        if (cfg.nextUpstream.includes(kind)) attempt();
        else { entry.status = 502; resp.writeHead(502, { Connection: 'close' }); resp.end('502 Bad Gateway'); }
      });
      up.end();
    })();
  });
  srv.on('connection', s => s.on('error', () => {}));
  return srv;
}

function get(port) {
  return new Promise(resolve => {
    const r = http.request({ host: '127.0.0.1', port, path: '/', method: 'GET', agent: false, headers: { Connection: 'close' } }, resp => {
      const chunks = []; resp.on('data', d => chunks.push(d));
      resp.on('end', () => resolve({ status: resp.statusCode, body: Buffer.concat(chunks).toString('utf8') }));
    });
    r.on('error', e => resolve({ err: e.code || e.name }));
    r.setTimeout(15000, () => r.destroy(Object.assign(new Error('timeout'), { code: 'TIMEOUT' })));
    r.end();
  });
}
const portFree = port => new Promise(r => { const s = net.createServer(); s.once('error', () => r(false)); s.listen(port, '127.0.0.1', () => s.close(() => r(true))); });

async function startBoot(classes, j) {
  const real = j.port + OFFSET;
  if (!(await portFree(real))) throw new Error('포트 ' + real + '가 이미 쓰이고 있음');
  const p = cp.spawn(JDK + 'java', ['-cp', classes + ';' + LIBS, 'app.Main', '--server.port=' + real, '--app.name=' + j.name, '--server.address=127.0.0.1', '--logging.level.root=WARN'], { stdio: ['ignore', 'pipe', 'pipe'] });
  let log = ''; p.stdout.on('data', x => log += x); p.stderr.on('data', x => log += x);
  const exited = new Promise(r => p.on('exit', r));
  for (let i = 0; ; i++) {
    const r = await new Promise(res => { const q = http.get({ host: '127.0.0.1', port: real, path: '/probe/count', agent: false }, s => { let d = ''; s.on('data', x => d += x); s.on('end', () => res(d)); }); q.on('error', () => res(null)); });
    if (r) return { p, real, name: j.name, exited, info: r, count: async () => (await new Promise(res => http.get({ host: '127.0.0.1', port: real, path: '/probe/count', agent: false }, s => { let d = ''; s.on('data', x => d += x); s.on('end', () => res(d)); }))).split('|')[1] };
    if (i > 240) { console.log(log); throw new Error(j.name + ' 서버가 뜨지 않음'); }
    await sleep(500);
  }
}

async function runCombo(c, classes) {
  const code = lesson.code(Object.assign({}, c)), sc = parseScreen(code);
  const servers = [];
  for (const j of sc.jars) servers.push(await startBoot(classes, j));
  const byName = Object.fromEntries(servers.map(s => [s.name, s]));
  const portOf = Object.fromEntries(sc.jars.map(j => [j.port, j.name]));
  const log = []; let front = null, entryPort;
  if (sc.nginx) {
    front = nginxModel(sc.nginx, portOf, log);
    entryPort = sc.nginx.listen + OFFSET;
    if (!(await portFree(entryPort))) throw new Error('포트 ' + entryPort + '가 이미 쓰이고 있음');
    await new Promise(r => front.listen(entryPort, '127.0.0.1', r));
  } else entryPort = sc.jars.find(j => j.port === sc.clientPort).port + OFFSET;
  if (sc.clientPort + OFFSET !== entryPort) throw new Error('클라이언트가 접속하는 포트가 입구와 다름');
  const reqs = [], bodies = []; let a = 0, b = 0, fail = 0, memAatKill = null;
  for (let i = 1; i <= sc.count; i++) {
    if (sc.killAfter && i === sc.killAfter + 1) { memAatKill = await byName.A.count(); byName.A.p.kill(); await byName.A.exited; byName.A.dead = true; }
    const r = await get(entryPort);
    if (r.err) { fail++; reqs.push('오류' + r.err); bodies.push('(' + r.err + ')'); continue; }
    bodies.push(r.status + ' ' + r.body);
    const m = /^나는 ([AB]), 받은 요청 (\d+)번째$/.exec(r.body);
    if (r.status !== 200 || !m) { fail++; reqs.push('상태' + r.status + ':' + r.body); continue; }
    if (m[1] === 'A') a++; else b++;
    const e = sc.nginx ? log[log.length - 1] : null;
    reqs.push(m[1] + '#' + m[2] + (e && e.refused.length ? '<' + e.refused.map(x => x.split(':')[0]).join(',') + '거부>' : ''));
  }
  const memA = byName.A.dead ? memAatKill : await byName.A.count(), memB = byName.B ? await byName.B.count() : '(서버 B 없음)';
  const refused = log.map((e, i) => e.refused.length ? (i + 1) + '번째 요청: ' + e.refused.join(',') : null).filter(Boolean);
  const skipped = log.map((e, i) => e.skipped.length ? (i + 1) + '번째 요청: ' + e.skipped.join(',') : null).filter(Boolean);
  const info = servers[0].info;
  for (const s of servers) if (!s.dead) { s.p.kill(); await s.exited; }
  if (front) await new Promise(r => front.close(r));
  const setup = 'jar ' + sc.jars.map(j => j.name + ':' + j.port).join(',') + '|nginx ' + (sc.nginx ? 'upstream ' + sc.nginx.upstream + ' ' + sc.nginx.servers.map(s => s.host + ':' + s.port + ' max_fails=' + s.maxFails + ' fail_timeout=' + s.failTimeout / 1000 + 's').join(', ') + ' listen ' + sc.nginx.listen + ' proxy_pass ' + sc.nginx.pass + ' next_upstream ' + sc.nginx.nextUpstream.join(' ') : '없음') + '|클라이언트 ' + sc.clientPort + ' ' + sc.count + '번|끄기 ' + (sc.killAfter ? sc.killAfter + '번 뒤' : '안 함');
  return { info, line: ['a=' + a, 'b=' + (byName.B ? b : '(서버 B 없음)'), 'fail=' + fail, 'reqs=' + reqs.join(';'), 'memA=' + memA, 'memB=' + memB,
    'refused=' + (refused.length ? refused.join(' / ') : '(없음)'), 'skipped=' + (skipped.length ? skipped.join(' / ') : '(없음)'),
    'turns=' + (sc.nginx ? log.map(e => e.turn).join('') : '(nginx 없음)'), 'bodies=' + bodies.join(' / '), 'setup=' + setup].join('|') };
}

(async () => {
  // 1. 화면의 HelloController 컴파일 (네 조합의 자바 부분이 같은 글인지도 확인)
  const all = combos(lesson).map(c => parseScreen(lesson.code(Object.assign({}, c))).java);
  if (new Set(all).size !== 1) throw new Error('조합마다 화면의 자바 코드가 다름');
  const sd = path.join(work, 'src', 'app'), classes = path.join(work, 'classes');
  fs.mkdirSync(sd, { recursive: true }); fs.mkdirSync(classes, { recursive: true });
  fs.writeFileSync(path.join(sd, 'HelloController.java'), 'package app;\n\n' + all[0] + '\n');
  fs.writeFileSync(path.join(sd, 'Main.java'), MAIN);
  const r = await run(JDK + 'javac', ['-encoding', 'UTF-8', '-proc:none', '-parameters', '-cp', LIBS, '-d', classes, path.join(sd, 'HelloController.java'), path.join(sd, 'Main.java')]);
  if (r.exit) throw new Error('javac 실패:\n' + r.out);
  // 2. 조합 실행
  const out = [], body = [];
  for (const c of combos(lesson)) {
    const res = await runCombo(c, classes);
    if (!out.length) out.push('# node ' + process.version + ' · 서버: 스프링 부트(' + res.info.split('|').slice(3).join(', ') + '), 화면의 HelloController를 그대로 컴파일 · 앞단: nginx 역할 모형(Node, 화면의 nginx 설정을 읽어 씀) · 화면 포트+' + OFFSET + ' · 127.0.0.1');
    body.push(c.servers + '|' + c.down + ' => ' + res.line);
    console.log(body[body.length - 1]);
  }
  fs.writeFileSync(path.join(__dirname, 'lb_basic_probe_boot.out.txt'), out.concat(body).join('\n') + '\n');
  console.log(out[0]);
  process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });

// "프록시와 리버스 프록시" 실습(nginx + 스프링 부트 forward-headers-strategy)을 실제 스프링 부트로 실행한다.
//   뒤쪽: 실제 스프링 부트 4(내장 톰캣). 화면의 WhoAmIController 글을 lesson.code()에서 그대로 꺼내 컴파일한다.
//         server.forward-headers-strategy를 none / native / framework / (설정 안 함)으로, 직접 split하는 컨트롤러는 none으로 띄운다.
//   앞단: nginx는 이 컴퓨터에 없으므로, nginx 문서(ngx_http_proxy_module)에 적힌 대로 헤더를 붙이는 Node 프록시가 nginx 역할을 대신한다.
//         append = proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for (받은 값 뒤에 ", $remote_addr", 없으면 $remote_addr)
//         set    = proxy_set_header X-Forwarded-For $remote_addr
//         none   = proxy_set_header 줄 없음: Host($proxy_host)와 Connection(close)만 바꾸고 나머지 요청 헤더는 그대로 넘긴다
//         append·set일 때는 Host $host, X-Forwarded-Proto $scheme 줄도 있다.
//   주소: 클라이언트 127.0.0.10, 프록시 127.0.0.20, 서버 127.0.0.30 (모두 이 PC의 루프백. 밖으로 나가는 요청 없음)
//         기본 internal-proxies는 127.x도 믿으므로 실행에서는 internal-proxies를 127\.0\.0\.20 하나로 좁힌다
//         (화면: nginx 10.0.0.5는 기본값에 맞고, 클라이언트 203.0.113.7은 맞지 않음. 이것도 같은 실행에서 기본 정규식으로 확인한다).
// 사용: node verify/net/revproxy_probe_boot.js   (openssl이 PATH에 있어야 함: Git Bash)
// 결과: verify/net/revproxy_probe_boot.out.txt
// 한 줄: 길|nginx|위조|strategy => 톰캣이 본 연결 상대|도착한 XFF|도착한 XFP|컨트롤러의 주소|getScheme()|도착한 Host
const http = require('http'), https = require('https'), fs = require('fs'), os = require('os'), path = require('path'), cp = require('child_process');
const { load, combos } = require('../model_rows.js');
const lesson = load('revproxy');
const JDK = 'E:/dev/jdk-21.0.12.1+1/bin/', LIBS = 'E:/dev/java-interview-lab/verify/spring/libs/*';
const C = '127.0.0.10', P = '127.0.0.20', S = '127.0.0.30', FORGED = '198.51.100.99';
const role = a => String(a).split(C).join('client').split(P).join('proxy').split(S).join('server');
const work = path.join(__dirname, '..', 'out', 'revproxy_boot');
const run = (cmd, args, opt) => new Promise(r => cp.execFile(cmd, args, Object.assign({ encoding: 'utf8', maxBuffer: 1 << 26 }, opt || {}), (e, so, se) => r({ exit: e ? (e.code || 1) : 0, out: so, err: String(se).trim() })));
const sleep = ms => new Promise(r => setTimeout(r, ms));

// 화면 코드에서 자바 부분(import부터 끝까지)을 꺼낸다
function screenJava(fhs) {
  const code = lesson.code({ path: 'reverse', ngx: 'append', spoof: true, fhs });
  return 'package app;\n\n' + code.slice(code.indexOf('import jakarta'));
}
const MAIN = `package app;

import jakarta.servlet.http.HttpServletRequest;
import java.util.ArrayList;
import java.util.List;
import org.apache.catalina.Valve;
import org.apache.catalina.valves.RemoteIpValve;
import org.springframework.boot.Banner;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.SpringBootConfiguration;
import org.springframework.boot.SpringBootVersion;
import org.springframework.boot.autoconfigure.EnableAutoConfiguration;
import org.springframework.boot.tomcat.TomcatWebServer;
import org.springframework.boot.tomcat.autoconfigure.TomcatServerProperties;
import org.springframework.boot.web.server.context.WebServerApplicationContext;
import org.springframework.context.ApplicationContext;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.ComponentScan;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.filter.ForwardedHeaderFilter;

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

    // 시험용: 도착한 헤더 그대로(strategy=none일 때만 그대로다)와 서버 구성 확인
    @RestController
    static class ProbeController {
        final ApplicationContext ctx;
        ProbeController(ApplicationContext ctx) { this.ctx = ctx; }
        static String q(String s) { return s == null ? "null" : "\\"" + s.replace("\\\\", "\\\\\\\\").replace("\\"", "\\\\\\"") + "\\""; }

        @GetMapping("/raw")
        String raw(HttpServletRequest r) {
            return "{\\"remote\\":" + q(r.getRemoteAddr()) + ",\\"xff\\":" + q(r.getHeader("X-Forwarded-For")) + ",\\"xfp\\":" + q(r.getHeader("X-Forwarded-Proto"))
                + ",\\"host\\":" + q(r.getHeader("Host")) + ",\\"serverName\\":" + q(r.getServerName()) + ",\\"scheme\\":" + q(r.getScheme()) + "}";
        }

        // 기본 internal-proxies 값을 넣은 RemoteIpValve가 그 주소를 믿는 프록시로 보는지 (톰캣의 private isInternalProxy를 부른다)
        static boolean trusted(String proxies, String ip) {
            try {
                RemoteIpValve v = new RemoteIpValve();
                v.setInternalProxies(proxies);
                java.lang.reflect.Method m = RemoteIpValve.class.getDeclaredMethod("isInternalProxy", String.class);
                m.setAccessible(true);
                return (Boolean) m.invoke(v, ip);
            } catch (ReflectiveOperationException e) { throw new IllegalStateException(e); }
        }

        @GetMapping("/info")
        String info() {
            String def = new TomcatServerProperties.Remoteip().getInternalProxies();
            List<String> valves = new ArrayList<>();
            String installed = "null";
            if (ctx instanceof WebServerApplicationContext w && w.getWebServer() instanceof TomcatWebServer t) {
                for (Valve v : t.getTomcat().getEngine().getPipeline().getValves()) {
                    valves.add(v.getClass().getSimpleName());
                    if (v instanceof RemoteIpValve rv) installed = q(rv.getInternalProxies() + " | remoteIpHeader=" + rv.getRemoteIpHeader() + " | protocolHeader=" + rv.getProtocolHeader());
                }
            }
            boolean filter = !ctx.getBeansOfType(ForwardedHeaderFilter.class).isEmpty()
                || ctx.getBeanProvider(org.springframework.boot.web.servlet.FilterRegistrationBean.class).stream().anyMatch(b -> b.getFilter() instanceof ForwardedHeaderFilter);
            return "{\\"boot\\":" + q(SpringBootVersion.getVersion()) + ",\\"tomcat\\":" + q(org.apache.catalina.util.ServerInfo.getServerNumber())
                + ",\\"spring\\":" + q(org.springframework.core.SpringVersion.getVersion())
                + ",\\"defaultInternalProxies\\":" + q(def)
                + ",\\"default_10_0_0_5\\":" + trusted(def, "10.0.0.5") + ",\\"default_203_0_113_7\\":" + trusted(def, "203.0.113.7")
                + ",\\"default_198_51_100_99\\":" + trusted(def, "198.51.100.99") + ",\\"default_127_0_0_10\\":" + trusted(def, "127.0.0.10")
                + ",\\"engineValves\\":" + q(String.join(",", valves)) + ",\\"remoteIpValve\\":" + installed + ",\\"forwardedHeaderFilter\\":" + filter + "}";
        }
    }
}
`;

function get(mod, opt) {
  return new Promise((resolve, reject) => {
    const req = mod.get(Object.assign({ agent: false }, opt), res => { let d = ''; res.setEncoding('utf8'); res.on('data', x => d += x); res.on('end', () => resolve({ status: res.statusCode, body: d })); });
    req.on('error', reject); req.setTimeout(10000, () => req.destroy(new Error('timeout')));
  });
}
// nginx 역할을 대신하는 프록시 (HTTPS로 받아 뒤의 서버에 HTTP로 넘긴다)
function nginxModel(ngx, tls, backPort) {
  return https.createServer(tls, (req, res) => {
    const peer = req.socket.remoteAddress, h = {};
    for (const [k, v] of Object.entries(req.headers)) if (k !== 'host' && k !== 'connection') h[k] = v;
    h['connection'] = 'close';                                                  // proxy_set_header Connection close (기본)
    if (ngx === 'none') h['host'] = S + ':' + backPort;                         // proxy_set_header Host $proxy_host (기본)
    else {
      h['host'] = String(req.headers.host || '').replace(/:\d+$/, '');          // proxy_set_header Host $host
      h['x-forwarded-for'] = ngx === 'append' && req.headers['x-forwarded-for'] ? req.headers['x-forwarded-for'] + ', ' + peer : peer;   // $proxy_add_x_forwarded_for / $remote_addr
      h['x-forwarded-proto'] = 'https';                                         // proxy_set_header X-Forwarded-Proto $scheme
    }
    const up = http.request({ host: S, port: backPort, path: req.url, method: req.method, headers: h, localAddress: P, agent: false }, r => { res.writeHead(r.statusCode, r.headers); r.pipe(res); });
    up.on('error', e => { res.writeHead(502); res.end(String(e)); }); up.end();
  });
}
const listen = (srv, host) => new Promise(r => srv.listen(0, host, () => r(srv.address().port)));
const stop = srv => new Promise(r => { srv.close(r); srv.closeAllConnections(); });

(async () => {
  // 1. 컴파일 (화면의 컨트롤러 두 가지: getRemoteAddr()를 쓰는 것, 직접 split하는 것)
  const apps = { std: screenJava('native'), manual: screenJava('manual') };
  if (screenJava('none') !== apps.std || screenJava('framework') !== apps.std) throw new Error('none/native/framework의 화면 컨트롤러가 서로 다름');
  for (const [k, src] of Object.entries(apps)) {
    const d = path.join(work, k), sd = path.join(d, 'src', 'app'), cd = path.join(d, 'classes');
    fs.mkdirSync(sd, { recursive: true }); fs.mkdirSync(cd, { recursive: true });
    fs.writeFileSync(path.join(sd, 'WhoAmIController.java'), src); fs.writeFileSync(path.join(sd, 'Main.java'), MAIN);
    const r = await run(JDK + 'javac', ['-encoding', 'UTF-8', '-proc:none', '-parameters', '-cp', LIBS, '-d', cd, path.join(sd, 'WhoAmIController.java'), path.join(sd, 'Main.java')]);
    if (r.exit) throw new Error('javac 실패 (' + k + '):\n' + r.out + r.err);
  }
  // 2. 서버 띄우기
  const inst = { none: ['std', 'none'], native: ['std', 'native'], framework: ['std', 'framework'], unset: ['std', null], manual: ['manual', 'none'] };
  const port = {}, procs = []; let n = 0;
  for (const [k, [app, strat]] of Object.entries(inst)) {
    port[k] = 18151 + n++;
    const a = ['-cp', path.join(work, app, 'classes') + ';' + LIBS, 'app.Main', '--server.address=' + S, '--server.port=' + port[k], '--logging.level.root=WARN',
      '--server.tomcat.remoteip.internal-proxies=127\\.0\\.0\\.20'];
    if (strat) a.push('--server.forward-headers-strategy=' + strat);
    const p = cp.spawn(JDK + 'java', a, { stdio: ['ignore', 'pipe', 'pipe'] }); let log = ''; p.stdout.on('data', x => log += x); p.stderr.on('data', x => log += x);
    procs.push({ k, p, get log() { return log; } });
  }
  const kill = () => procs.forEach(x => { try { x.p.kill(); } catch (e) {} });
  process.on('exit', kill);
  const info = {};
  for (const k of Object.keys(inst)) {
    for (let i = 0; ; i++) {
      try { const r = await get(http, { host: S, port: port[k], path: '/info' }); info[k] = JSON.parse(r.body); break; }
      catch (e) { if (i > 240) { console.log(procs.find(x => x.k === k).log); throw new Error(k + ' 서버가 뜨지 않음'); } await sleep(500); }
    }
  }
  // 3. 시험용 인증서
  const tdir = path.join(os.tmpdir(), 'lab_revproxy_tls'), key = path.join(tdir, 'key.pem'), crt = path.join(tdir, 'cert.pem');
  fs.mkdirSync(tdir, { recursive: true });
  const g = await run('openssl', ['req', '-x509', '-newkey', 'rsa:2048', '-nodes', '-keyout', key, '-out', crt, '-days', '2', '-subj', '/CN=shop.example']);
  if (g.exit) throw new Error('openssl 실패: ' + g.err);
  const tls = { key: fs.readFileSync(key), cert: fs.readFileSync(crt) };
  // 4. 조합 실행
  async function call(c, k, p) {
    const headers = Object.assign({ Host: 'shop.example' }, c.spoof ? { 'X-Forwarded-For': FORGED } : {});
    if (c.path === 'direct') return get(http, { host: S, port: port[k], path: p, headers, localAddress: C });
    const px = nginxModel(c.ngx, tls, port[k]), pp = await listen(px, P);
    try { return await get(https, { host: P, port: pp, path: p, headers, localAddress: C, rejectUnauthorized: false, servername: 'shop.example' }); } finally { await stop(px); }
  }
  const out = ['# ' + process.version + ' · spring boot ' + info.none.boot + ' · spring ' + info.none.spring + ' · tomcat ' + info.none.tomcat + ' · 클라이언트 ' + C + ', 프록시(nginx 모형) ' + P + ', 서버 ' + S];
  for (const k of Object.keys(inst)) out.push('# info ' + k + ': ' + JSON.stringify(info[k]));
  const seen = new Set();
  for (const c of combos(lesson)) {
    const key = [c.path, c.ngx, c.spoof, c.fhs].join('|'); if (seen.has(key)) continue; seen.add(key);
    const raw = JSON.parse((await call(c, 'none', '/raw')).body);
    const who = await call(c, c.fhs, '/whoami');
    if (who.status !== 200) throw new Error(key + ' 응답 ' + who.status + ' ' + who.body);
    const [addr, scheme] = who.body.trim().split(' ');
    let unset = '';
    if (c.fhs === 'none') { const u = await call(c, 'unset', '/whoami'); unset = u.body.trim() === who.body.trim() ? '' : '  (설정 안 함과 다름: ' + u.body + ')'; }
    out.push(key + ' => ' + [role(raw.remote), raw.xff === null ? '-' : role(raw.xff), raw.xfp === null ? '-' : raw.xfp, role(addr), scheme, role(raw.host)].join('|') + unset);
  }
  kill();
  fs.writeFileSync(path.join(__dirname, 'revproxy_probe_boot.out.txt'), out.join('\n') + '\n');
  console.log(out.join('\n'));
  process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });

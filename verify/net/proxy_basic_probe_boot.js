// 기초개념 "프록시 서버" 실습(nginx + 스프링 부트)의 모든 설정 조합(부르는 주소 2 x server.address 줄 2 x 켜 둔 프로그램 3 = 12)을 이 PC 안에서 실행한다.
// 사용: node verify/net/proxy_basic_probe_boot.js      결과: verify/net/proxy_basic_probe_boot.out.txt
// 외부 네트워크는 쓰지 않는다. 새로 내려받는 것은 없다. (옛 Node.js만의 실행은 proxy_basic_probe.js, 그 결과 파일은 그대로 둔다)
//
// 화면의 코드(lesson.code())를 그대로 읽어 실행한다.
//   - 스프링 부트(뒤쪽): 실제 스프링 부트 4(내장 톰캣). 화면의 HelloController 글에 "package app;" 한 줄만 붙여 컴파일하고,
//     화면의 application.properties 줄을 그 프로세스의 작업 폴더에 application.properties 파일로 써서 띄운다(스프링 부트가 ./application.properties를 읽는다).
//     server.port의 8080만 빈 포트 번호로 바꾼다. server.address=127.0.0.1은 그대로 둔다.
//     실행용 Main(@SpringBootApplication)과 /hello 요청 수를 세는 필터, /_probe(버전과 요청 수)는 이 파일이 덧붙인 것이며 화면에는 없다.
//   - nginx(앞단): nginx는 이 PC에 없으므로 내려받지 않고, 화면의 nginx 설정(listen, proxy_pass, proxy_set_header)을 읽어
//     nginx 문서(ngx_http_proxy_module, ngx_http_core_module)와 소스(ngx_http_upstream.c, ngx_http_special_response.c)에 적힌 대로 움직이는 Node.js 프로그램이 대신한다:
//       · 받은 요청의 Host와 Connection은 넘기지 않고, 나머지 요청 헤더는 그대로 넘긴다(proxy_pass_request_headers 기본 on)
//       · proxy_set_header 줄을 적용한다: $host = 요청의 Host 이름(포트 빼고), $proxy_add_x_forwarded_for = 받은 X-Forwarded-For 뒤에 ", $remote_addr"(없으면 $remote_addr)
//       · 기본값 proxy_set_header Connection close, 뒤쪽과는 HTTP/1.1(1.29.7부터 기본)
//       · 뒤쪽에 연결하지 못하면(연결 거부) 502와 nginx의 502 페이지(ngx_http_error_502_page + "<hr><center>nginx</center>" 꼬리)를 돌려준다
//   - 사용자: Node.js http.request(연결 재사용 안 함).
// 주소: 화면의 사용자 203.0.113.7 -> 127.0.0.10, 서버 컴퓨터 192.0.2.10 -> 127.0.0.2, 127.0.0.1은 그대로(모두 이 PC의 루프백).
//   nginx 모형은 listen 80에 따라 모든 주소(0.0.0.0)에서 받고, 사용자는 127.0.0.10에서 127.0.0.2로 연결한다.
//   화면의 80, 8080은 실제로는 빈 포트를 쓴다. 꺼진 프로그램의 번호로 가는 연결은 방금 닫은 빈 포트(기다리는 프로그램 없음)로 간다.
// 한 줄: via|bind|up => JSON (주소는 화면의 주소로 바꿔 적음)
const http = require('http'), net = require('net'), fs = require('fs'), path = require('path'), cp = require('child_process');
const { load, combos } = require('../model_rows.js');
const lesson = load('proxy_basic');
const JDK = 'E:/dev/jdk-21.0.12.1+1/bin/', LIBDIR = 'E:/dev/java-interview-lab/verify/spring/libs/';
const CLIENT = '127.0.0.10', HOSTIP = '127.0.0.2';
const toScreen = s => s == null ? s : String(s).split(CLIENT).join('203.0.113.7').split(HOSTIP).join('192.0.2.10');
const work = path.join(__dirname, '..', 'out', 'proxy_basic_boot');
const run = (cmd, args, opt) => new Promise(r => cp.execFile(cmd, args, Object.assign({ encoding: 'utf8', maxBuffer: 1 << 26 }, opt || {}), (e, so, se) => r({ exit: e ? (e.code || 1) : 0, out: so, err: String(se).trim() })));
const sleep = ms => new Promise(r => setTimeout(r, ms));
const NGINX_502 = '<html>\r\n<head><title>502 Bad Gateway</title></head>\r\n<body>\r\n<center><h1>502 Bad Gateway</h1></center>\r\n<hr><center>nginx</center>\r\n</body>\r\n</html>\r\n';

// 스프링 부트 웹(spring-boot-starter-webmvc에 해당하는 jar)만 쓴다. 시큐리티·JPA·JDBC는 넣지 않는다.
const CP = fs.readdirSync(LIBDIR).filter(f => /^(spring-(core|beans|context|aop|expression|web|webmvc|jcl)-|spring-boot-(4|autoconfigure|servlet|tomcat-4|web-server|webmvc|http-converter|jackson-4)|tomcat-embed-|jackson-|logback-|slf4j-|jul-to-slf4j|log4j-|micrometer-|jspecify|commons-logging|snakeyaml|jakarta\.annotation)/.test(f)).map(f => LIBDIR + f).join(';');

// ---------- 화면 글 읽기 ----------
function parseScreen(text) {
  const L = text.split('\n'), r = { url: null, nginx: null, nginxOn: true, props: [], springOn: true, java: null };
  const u = L.find(l => /^http:\/\//.test(l)); r.url = new URL(u);
  const ni = L.findIndex(l => l.startsWith('# nginx 설정')); r.nginxOn = !/지금은 nginx를 껐다/.test(L[ni]);
  const ng = { listen: null, pass: null, set: [] };
  for (let i = ni + 1; L[i] !== '}'; i++) {
    let m;
    if ((m = /^\s+listen (\d+);$/.exec(L[i]))) ng.listen = +m[1];
    if ((m = /^\s+proxy_pass http:\/\/([\d.]+):(\d+);$/.exec(L[i]))) ng.pass = { host: m[1], port: +m[2] };
    if ((m = /^\s+proxy_set_header (\S+) (\S+);$/.exec(L[i]))) ng.set.push([m[1], m[2]]);
  }
  r.nginx = ng;
  const pi = L.findIndex(l => l.startsWith('# application.properties')); r.springOn = !/지금은 껐다/.test(L[pi]);
  for (let i = pi + 1; L[i] !== ''; i++) if (!L[i].startsWith('#')) r.props.push(L[i]);
  r.java = L.slice(L.indexOf('// HelloController.java')).join('\n');
  return r;
}

// ---------- 도우미 ----------
const deadPort = () => new Promise(res => { const s = net.createServer(); s.listen(0, '0.0.0.0', () => { const p = s.address().port; s.close(() => res(p)); }); });
const listen = (srv, host) => new Promise(res => srv.listen(0, host, () => res(srv.address().port)));
const stop = srv => new Promise(r => { srv.close(() => r()); srv.closeAllConnections(); });
function get(opt) {
  return new Promise(resolve => {
    const info = {};
    const req = http.request(Object.assign({ method: 'GET', agent: false }, opt), res => {
      const ch = []; res.on('data', d => ch.push(d));
      res.on('end', () => Object.assign(info, { ok: true, status: res.statusCode, statusMessage: res.statusMessage, contentType: res.headers['content-type'] || null, body: Buffer.concat(ch).toString('utf8') }) && resolve(info));
    });
    req.on('error', e => { info.ok = false; info.errCode = e.code || e.name; resolve(info); });
    req.setTimeout(15000, () => req.destroy(Object.assign(new Error('timeout'), { code: 'TIMEOUT' })));
    req.end();
  });
}

// nginx 역할을 대신하는 프로그램 (화면의 nginx 설정을 읽어 그대로 따른다)
function nginxModel(ng, upstreamPort, rec) {
  return http.createServer((req, res) => {
    rec.requests++;
    const remote = req.socket.remoteAddress, h = {};
    for (const [k, v] of Object.entries(req.headers)) if (k !== 'host' && k !== 'connection') h[k] = v;   // Host·Connection은 넘기지 않는다
    const vars = {
      $host: String(req.headers.host || '').replace(/:\d+$/, '').toLowerCase(),
      $remote_addr: remote,
      $proxy_add_x_forwarded_for: req.headers['x-forwarded-for'] ? req.headers['x-forwarded-for'] + ', ' + remote : remote,
    };
    for (const [name, val] of ng.set) { if (!(val in vars)) throw new Error('모형이 모르는 변수 ' + val); h[name.toLowerCase()] = vars[val]; }
    if (!('connection' in h)) h['connection'] = 'close';                                                    // 기본값 proxy_set_header Connection close
    rec.sentHeaders = h;
    const up = http.request({ host: ng.pass.host, port: upstreamPort, path: req.url, method: req.method, headers: h, agent: false }, ur => {
      rec.upstream = { status: ur.statusCode };
      const out = {}; for (const [k, v] of Object.entries(ur.headers)) if (!['connection', 'transfer-encoding', 'keep-alive'].includes(k)) out[k] = v;
      res.writeHead(ur.statusCode, out); ur.pipe(res);
    });
    up.on('error', e => {
      rec.upstream = { error: e.code || e.name };
      res.writeHead(502, { 'Content-Type': 'text/html', 'Content-Length': Buffer.byteLength(NGINX_502), Server: 'nginx' }); res.end(NGINX_502);
    });
    up.end();
  });
}

const MAIN = `package app;

import jakarta.servlet.Filter;
import jakarta.servlet.http.HttpServletRequest;
import java.util.concurrent.atomic.AtomicInteger;
import org.springframework.boot.Banner;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.SpringBootVersion;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.Bean;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

// 실행용(화면에 없음): 스프링 부트를 띄우고, /hello 요청 수를 센다
@SpringBootApplication
public class Main {
    static final AtomicInteger HITS = new AtomicInteger();

    @Bean Filter hitCounter() {
        return (req, res, chain) -> {
            if ("/hello".equals(((HttpServletRequest) req).getRequestURI())) HITS.incrementAndGet();
            chain.doFilter(req, res);
        };
    }

    public static void main(String[] args) {
        SpringApplication app = new SpringApplication(Main.class);
        app.setBannerMode(Banner.Mode.OFF);
        app.setLogStartupInfo(false);
        app.run(args);
    }

    @RestController
    static class ProbeInfo {
        @GetMapping("/_probe")
        String info() {
            return "{\\"boot\\":\\"" + SpringBootVersion.getVersion() + "\\",\\"spring\\":\\"" + org.springframework.core.SpringVersion.getVersion()
                + "\\",\\"tomcat\\":\\"" + org.apache.catalina.util.ServerInfo.getServerNumber() + "\\",\\"hits\\":" + HITS.get() + "}";
        }
    }
}
`;

(async () => {
  const all = combos(lesson);
  const scr = all.map(c => ({ c, text: lesson.code(Object.assign({}, c)) })).map(x => Object.assign(x, { s: parseScreen(x.text) }));
  // 1. 컴파일 (화면의 컨트롤러는 모든 조합에서 같은 글이어야 한다)
  const javas = new Set(scr.map(x => x.s.java)); if (javas.size !== 1) throw new Error('조합마다 컨트롤러 글이 다름');
  const java = 'package app;\n\n' + [...javas][0];
  const sd = path.join(work, 'src', 'app'), cd = path.join(work, 'classes');
  fs.rmSync(path.join(work, 'classes'), { recursive: true, force: true });
  fs.mkdirSync(sd, { recursive: true }); fs.mkdirSync(cd, { recursive: true });
  fs.writeFileSync(path.join(sd, 'HelloController.java'), java); fs.writeFileSync(path.join(sd, 'Main.java'), MAIN);
  const jc = await run(JDK + 'javac', ['-encoding', 'UTF-8', '-proc:none', '-parameters', '-cp', CP, '-d', cd, path.join(sd, 'HelloController.java'), path.join(sd, 'Main.java')]);
  if (jc.exit) throw new Error('javac 실패:\n' + jc.out + jc.err);
  // 2. application.properties가 다른 것마다 스프링 부트를 하나씩 띄운다 (server.port의 8080만 빈 포트로 바꾼다)
  const propSets = [...new Set(scr.map(x => x.s.props.join('\n')))];
  const boot = {}, procs = [];
  for (const ps of propSets) {
    const port = await deadPort(), dir = path.join(work, 'run' + procs.length);
    fs.mkdirSync(dir, { recursive: true });
    const file = ps.split('\n').map(l => l === 'server.port=8080' ? 'server.port=' + port : l).join('\n') + '\n';
    if (file.indexOf('server.port=' + port) < 0) throw new Error('server.port=8080 줄이 없음');
    fs.writeFileSync(path.join(dir, 'application.properties'), file);
    const p = cp.spawn(JDK + 'java', ['-Dfile.encoding=UTF-8', '-cp', cd + ';' + CP, 'app.Main', '--logging.level.root=WARN'], { cwd: dir, stdio: ['ignore', 'pipe', 'pipe'] });
    let log = ''; p.stdout.on('data', x => log += x); p.stderr.on('data', x => log += x);
    procs.push(p); boot[ps] = { port, file, get log() { return log; } };
  }
  const kill = () => procs.forEach(p => { try { p.kill(); } catch (e) {} });
  process.on('exit', kill);
  let info = null;
  for (const ps of propSets) for (let i = 0; ; i++) {
    const r = await get({ host: '127.0.0.1', port: boot[ps].port, path: '/_probe' });
    if (r.ok && r.status === 200) { info = JSON.parse(r.body); break; }
    if (i > 240) { console.log(boot[ps].log); throw new Error('스프링 부트가 뜨지 않음'); }
    await sleep(500);
  }
  const hits = async ps => JSON.parse((await get({ host: '127.0.0.1', port: boot[ps].port, path: '/_probe' })).body).hits;
  // 스프링 부트가 실제로 어느 주소에서 기다리는지 (netstat)
  const ns = await run('netstat', ['-ano', '-p', 'TCP']);
  const bound = {}; for (const ps of propSets) bound[ps] = ns.out.split(/\r?\n/).filter(l => /LISTENING/.test(l) && new RegExp(':' + boot[ps].port + '\\s').test(l)).map(l => l.trim().split(/\s+/)[1]);

  const out = ['# ' + process.version + ' · ' + process.platform + ' · spring boot ' + info.boot + ' · spring ' + info.spring + ' · tomcat ' + info.tomcat + ' · JDK 21 · 사용자 127.0.0.10(화면 203.0.113.7), 서버 컴퓨터 127.0.0.2(화면 192.0.2.10) · nginx는 Node.js 모형 · 형식: via|bind|up => JSON'];
  for (const ps of propSets) out.push('# application.properties(실행한 그대로) ' + JSON.stringify(boot[ps].file) + ' → 기다리는 주소(netstat) ' + JSON.stringify(bound[ps]));
  // 3. 조합 실행
  for (const x of scr) {
    const s = x.s, ps = s.props.join('\n');
    const real8080 = s.springOn ? boot[ps].port : await deadPort();
    if (s.nginx.pass.host !== '127.0.0.1' || s.nginx.pass.port !== 8080) throw new Error('proxy_pass가 화면과 다름');
    const rec = { requests: 0, upstream: null, sentHeaders: null };
    let ngx = null, real80;
    if (s.nginxOn) { ngx = nginxModel(s.nginx, real8080, rec); real80 = await listen(ngx, '0.0.0.0'); } else real80 = await deadPort();
    const before = s.springOn ? await hits(ps) : 0;
    const port = s.url.port ? +s.url.port : 80;
    if (s.url.hostname !== '192.0.2.10' || ![80, 8080].includes(port)) throw new Error('화면의 주소를 모름 ' + s.url);
    const cl = await get({ host: HOSTIP, port: port === 80 ? real80 : real8080, path: s.url.pathname, localAddress: CLIENT });
    await sleep(100);
    const after = s.springOn ? await hits(ps) : 0;
    if (ngx) await stop(ngx);
    const r = {
      text: x.text, nginxOn: s.nginxOn, springOn: s.springOn,
      client: { ok: cl.ok, status: cl.status, statusMessage: cl.statusMessage, contentType: cl.contentType, body: toScreen(cl.body), errCode: cl.errCode },
      nginxRequests: rec.requests, nginxUpstream: rec.upstream, nginxSent: rec.sentHeaders ? { host: toScreen(rec.sentHeaders.host), 'x-forwarded-for': toScreen(rec.sentHeaders['x-forwarded-for']), connection: rec.sentHeaders.connection } : null,
      springHelloRequests: after - before,
    };
    out.push([x.c.via, x.c.bind, x.c.up].join('|') + ' => ' + JSON.stringify(r));
  }
  kill();
  fs.writeFileSync(path.join(__dirname, 'proxy_basic_probe_boot.out.txt'), out.join('\n') + '\n');
  console.log(out.join('\n'));
  process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });

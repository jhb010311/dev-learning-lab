import com.sun.net.httpserver.HttpServer;
import jakarta.servlet.DispatcherType;
import jakarta.servlet.Filter;
import jakarta.servlet.http.HttpServletRequest;
import java.net.InetSocketAddress;
import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.TreeMap;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.concurrent.TimeUnit;
import org.springframework.boot.Banner;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.SpringBootConfiguration;
import org.springframework.boot.SpringBootVersion;
import org.springframework.boot.autoconfigure.EnableAutoConfiguration;
import org.springframework.boot.web.servlet.FilterRegistrationBean;
import org.springframework.context.ConfigurableApplicationContext;
import org.springframework.context.annotation.Bean;
import org.springframework.core.env.Environment;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.core.SpringSecurityCoreVersion;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseBody;

// "클릭재킹과 오픈 리다이렉트" 실습의 조합을 실제 스프링 부트 + 스프링 시큐리티 서버(127.0.0.1)로 확인한다.
//   frame   : 헤더 설정 다섯 가지마다 서버를 띄워, 결제 화면 응답에 붙은 X-Frame-Options와 Content-Security-Policy를 적는다.
//   redir   : "로그인 뒤 돌아갈 주소"(next)를 검증 방식 세 가지의 컨트롤러에 보내, 응답의 Location 헤더를 적는다.
//   redirrel: 같은 요청을 톰캣이 Location을 받은 그대로 내보내는 설정(server.tomcat.use-relative-redirects=true)에서 다시 본다.
//   browser : (크로미움 실행 파일을 둘째 인자로 주었을 때만) 다른 출처의 페이지가 결제 화면을 iframe에 넣었을 때 실제로 그려지는지 본다.
//             출처는 모두 127.0.0.1의 서로 다른 포트이고, 크로미움은 127.0.0.1 밖으로는 나가지 못하게 막고 띄운다.
// 사용: java ClickjackProbe <출력 파일> [headless 크로미움 실행 파일]
@SpringBootConfiguration
@EnableAutoConfiguration   // 기본 패키지라서 컴포넌트 스캔은 쓰지 않는다
public class ClickjackProbe {
    static final List<String> shown = new CopyOnWriteArrayList<>();   // 결제 화면이 실제로 그려진 흔적: "헤더 설정:누가 넣었나"
    static final List<String> seen = new CopyOnWriteArrayList<>();    // 가게 서버가 받은 요청의 경로 (브라우저가 리다이렉트를 따라 어디로 갔는지 볼 때 쓴다)
    static final List<String> landed = new CopyOnWriteArrayList<>();  // 공격자 역할의 서버가 받은 요청의 경로

    // 시큐리티 필터보다 앞에서 받은 요청의 경로를 적어 둔다
    @Bean
    FilterRegistrationBean<Filter> seenFilter() {
        Filter f = (req, res, chain) -> { if (req.getDispatcherType() == DispatcherType.REQUEST) seen.add(((HttpServletRequest) req).getRequestURI()); chain.doFilter(req, res); };
        FilterRegistrationBean<Filter> b = new FilterRegistrationBean<>(f); b.setOrder(Integer.MIN_VALUE); return b;
    }

    @Bean
    SecurityFilterChain filterChain(HttpSecurity http, Environment env) throws Exception {
        String hdr = env.getProperty("lab.hdr", "default");
        String csp = "frame-ancestors 'self' " + env.getProperty("lab.partner", "https://partner.example");
        http.authorizeHttpRequests(auth -> auth.anyRequest().permitAll());
        // default: headers 설정을 건드리지 않는다 (스프링 시큐리티의 기본값)
        if (hdr.equals("same")) http.headers(h -> h.frameOptions(f -> f.sameOrigin()));
        if (hdr.equals("off")) http.headers(h -> h.frameOptions(f -> f.disable()));
        if (hdr.equals("csp")) http.headers(h -> h.frameOptions(f -> f.disable()).contentSecurityPolicy(c -> c.policyDirectives(csp)));
        if (hdr.equals("both")) http.headers(h -> h.contentSecurityPolicy(c -> c.policyDirectives(csp)));
        return http.build();
    }

    @Controller
    public static class Pages {
        private final Environment env;
        public Pages(Environment env) { this.env = env; }

        // 프레임에 넣으려는 대상: 누르면 결제가 되는 단추가 있는 화면. 브라우저가 이 화면을 실제로 그리면 그림(/shown)을 받아 가므로 흔적이 남는다.
        @GetMapping("/pay") @ResponseBody
        public String pay(@RequestParam(defaultValue = "direct") String from) {
            return "<!doctype html><meta charset=\"utf-8\"><title>pay</title><h1>결제 확인</h1><button>결제하기</button><img src=\"/shown?from=" + from.replaceAll("[^a-z]", "") + "\" alt=\"\">";
        }
        @GetMapping("/shown") @ResponseBody
        public String shown(@RequestParam String from) { shown.add(env.getProperty("lab.hdr") + ":" + from); return ""; }
        // 같은 사이트(같은 출처)의 페이지가 결제 화면을 프레임에 넣는 경우
        @GetMapping("/selfframe") @ResponseBody
        public String selfFrame() { return "<!doctype html><meta charset=\"utf-8\"><title>self</title><p>같은 사이트의 페이지</p><iframe src=\"/pay?from=self\" width=\"300\" height=\"120\"></iframe>"; }

        @GetMapping({ "/", "/orders" }) @ResponseBody
        public String home() { return "<!doctype html><meta charset=\"utf-8\"><title>shop</title><p>가게 화면</p>"; }

        // 로그인을 마친 뒤 next로 돌려보낸다. 검증 방식만 다른 세 가지.
        @GetMapping("/done/none")
        public String doneNone(@RequestParam String next) {
            return "redirect:" + next;                                   // 받은 주소를 확인 없이 그대로 쓴다
        }
        @GetMapping("/done/slash")
        public String doneSlash(@RequestParam String next) {
            if (!next.startsWith("/")) next = "/";                       // "/"로 시작하는지만 본다
            return "redirect:" + next;
        }
        @GetMapping("/done/path")
        public String donePath(@RequestParam String next) {
            boolean ok = next.startsWith("/") && !next.startsWith("//") && !next.startsWith("/\\");   // 같은 사이트의 경로만
            if (!ok) next = "/";
            return "redirect:" + next;
        }
    }

    static ConfigurableApplicationContext start(String hdr, String... more) {
        SpringApplication app = new SpringApplication(ClickjackProbe.class);
        app.setBannerMode(Banner.Mode.OFF); app.setLogStartupInfo(false);
        List<String> a = new ArrayList<>(List.of("--server.port=0", "--server.address=127.0.0.1", "--lab.hdr=" + hdr, "--logging.level.root=OFF"));
        a.addAll(List.of(more));
        return app.run(a.toArray(new String[0]));
    }
    static String port(ConfigurableApplicationContext ctx) { return ctx.getEnvironment().getProperty("local.server.port"); }

    static final String[] HDRS = { "default", "same", "off", "csp", "both" };
    static final String[] NEXTS = { "/orders", "https://attacker.example/login", "//attacker.example/login", "/\\attacker.example/login" };
    static final String[] NEXT_IDS = { "path", "abs", "dslash", "bslash" };

    static void redirects(HttpClient client, String base, String tag, List<String> out) throws Exception {
        for (String check : new String[] { "none", "slash", "path" })
            for (int i = 0; i < NEXTS.length; i++) {
                HttpResponse<String> d = client.send(HttpRequest.newBuilder(URI.create(base + "/done/" + check + "?next=" + URLEncoder.encode(NEXTS[i], StandardCharsets.UTF_8))).GET().build(), HttpResponse.BodyHandlers.ofString());
                String loc = d.headers().firstValue("Location").orElse("-"), host;
                // 이 Location을 따라가면 닿는 호스트 (자바 URI의 RFC 3986 계산. 역슬래시는 URI 문법에 없는 글자라 오류가 된다)
                try { host = URI.create(base + "/done/" + check).resolve(new URI(loc)).getHost(); } catch (Exception e) { host = "(자바 URI로는 해석 불가)"; }
                out.add(tag + "|" + check + "|" + NEXT_IDS[i] + " => status=" + d.statusCode() + "|location=" + loc.replace(base, "{서버}") + "|host=" + ("127.0.0.1".equals(host) ? "{서버}" : host));
            }
    }

    public static void main(String[] args) throws Exception {
        List<String> out = new ArrayList<>();
        out.add("# spring boot " + SpringBootVersion.getVersion() + " | spring security " + SpringSecurityCoreVersion.getVersion() + " | {서버}는 시험 서버의 주소(http://127.0.0.1:포트)");
        HttpClient client = HttpClient.newHttpClient();   // 리다이렉트를 따라가지 않는다 (기본값)
        for (String hdr : HDRS) {
            try (ConfigurableApplicationContext ctx = start(hdr)) {
                String base = "http://127.0.0.1:" + port(ctx);
                HttpResponse<String> r = client.send(HttpRequest.newBuilder(URI.create(base + "/pay")).GET().build(), HttpResponse.BodyHandlers.ofString());
                if (hdr.equals("default")) {
                    // 기본 설정에서 스프링 시큐리티가 붙인 헤더 전체 (본문과 연결에 관한 헤더는 뺀다)
                    TreeMap<String, String> hs = new TreeMap<>();
                    r.headers().map().forEach((k, v) -> { if (!k.matches("(?i)date|content-length|content-type|keep-alive|connection|:status")) hs.put(k, String.join(", ", v)); });
                    out.add("# 기본 설정의 응답 헤더: " + hs);
                }
                out.add("frame|" + hdr + " => status=" + r.statusCode() + "|xfo=" + r.headers().firstValue("X-Frame-Options").orElse("-") + "|csp=" + r.headers().firstValue("Content-Security-Policy").orElse("-"));
                if (hdr.equals("default")) redirects(client, base, "redir", out);
            }
        }
        try (ConfigurableApplicationContext ctx = start("default", "--server.tomcat.use-relative-redirects=true")) {
            redirects(client, "http://127.0.0.1:" + port(ctx), "redirrel", out);
        }
        if (args.length > 1) browser(args[1], out);
        Files.write(Path.of(args[0]), out, StandardCharsets.UTF_8);
        out.forEach(System.out::println);
    }

    // 크로미움으로 주소 하나를 열고, 페이지가 다 뜰 때까지 기다린다.
    // 127.0.0.1이 아닌 이름은 풀리지 않게 하고, 프록시도 닫힌 로컬 포트로 돌려 바깥으로는 아무 요청도 나가지 못하게 한다.
    static void open(String chrome, Path profile, String url) throws Exception {
        Process p = new ProcessBuilder(chrome, "--headless", "--disable-gpu", "--no-first-run", "--disable-background-networking", "--disable-component-update", "--disable-sync", "--disable-default-apps",
            "--host-resolver-rules=MAP * ~NOTFOUND, EXCLUDE 127.0.0.1", "--proxy-server=http://127.0.0.1:9", "--proxy-bypass-list=127.0.0.1",
            "--user-data-dir=" + profile, "--virtual-time-budget=4000", "--dump-dom", url).redirectErrorStream(true).start();
        p.getInputStream().readAllBytes();
        if (!p.waitFor(60, TimeUnit.SECONDS)) p.destroyForcibly();
        Thread.sleep(150);
    }

    // 실제 브라우저(크로미움)로 확인: 공격자 사이트, 협력 사이트, 같은 사이트의 페이지가 결제 화면을 iframe에 넣는다.
    static void browser(String chrome, List<String> out) throws Exception {
        Map<String, String> shop = new LinkedHashMap<>();   // 헤더 설정 → 그 설정으로 띄운 가게 서버의 주소
        // 공격자와 협력 사이트 역할의 서버: 가게 서버 다섯 개의 결제 화면을 iframe으로 넣은 페이지만 내준다
        Map<String, HttpServer> framers = new LinkedHashMap<>();
        for (String who : new String[] { "attacker", "partner" }) {
            HttpServer s = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
            s.createContext("/", ex -> {
                landed.add(ex.getRequestURI().getPath());
                StringBuilder b = new StringBuilder("<!doctype html><meta charset=\"utf-8\"><title>" + who + "</title>");
                if (ex.getRequestURI().getPath().equals("/")) shop.forEach((hdr, base) -> b.append("<iframe src=\"").append(base).append("/pay?from=").append(who).append("\" width=\"300\" height=\"120\"></iframe>"));
                else b.append("<p>다른 사이트의 화면</p>");   // 리다이렉트를 따라 도착한 경우
                byte[] body = b.toString().getBytes(StandardCharsets.UTF_8);
                ex.getResponseHeaders().set("Content-Type", "text/html; charset=utf-8");
                ex.sendResponseHeaders(200, body.length); ex.getResponseBody().write(body); ex.close();
            });
            s.start(); framers.put(who, s);
        }
        String partner = "http://127.0.0.1:" + framers.get("partner").getAddress().getPort();
        List<ConfigurableApplicationContext> ctxs = new ArrayList<>();
        try {
            for (String hdr : HDRS) { ConfigurableApplicationContext c = start(hdr, "--lab.partner=" + partner); ctxs.add(c); shop.put(hdr, "http://127.0.0.1:" + port(c)); }
            List<String> urls = new ArrayList<>();
            framers.forEach((who, s) -> urls.add("http://127.0.0.1:" + s.getAddress().getPort() + "/"));
            shop.forEach((hdr, base) -> { urls.add(base + "/selfframe"); urls.add(base + "/pay"); });   // /pay를 직접 여는 것은 "그려지면 흔적이 남는다"는 것을 확인하는 대조군
            Path profile = Files.createTempDirectory("clickjack-chromium");
            String version = "";
            for (String url : urls) open(chrome, profile, url);
            try { Process v = new ProcessBuilder(chrome, "--version").redirectErrorStream(true).start(); version = new String(v.getInputStream().readAllBytes(), StandardCharsets.UTF_8).trim(); v.waitFor(20, TimeUnit.SECONDS); } catch (Exception e) { version = "(버전 확인 실패)"; }
            Thread.sleep(500);
            out.add("# browser: " + version + " | 협력 사이트의 출처 " + partner.replaceAll(":\\d+$", ":포트") + " | 그려졌는지는 결제 화면 안의 그림 요청(/shown)이 서버에 왔는지로 판단");
            for (String hdr : HDRS) {
                if (!shown.contains(hdr + ":direct")) out.add("# 주의: " + hdr + " 서버의 결제 화면을 직접 열었는데 흔적이 없음 (브라우저 실행 실패)");
                for (String who : new String[] { "attacker", "self", "partner" }) out.add("browser|" + hdr + "|" + who + " => shown=" + shown.contains(hdr + ":" + who));
            }
            // 리다이렉트: 브라우저가 Location을 따라 실제로 어느 서버에 닿는지. attacker.example 자리에는 공격자 역할 서버의 주소(127.0.0.1의 다른 포트)를 넣는다.
            String atk = "127.0.0.1:" + framers.get("attacker").getAddress().getPort();
            String[] nexts = { "/orders", "http://" + atk + "/landed", "//" + atk + "/landed", "/\\" + atk + "/landed" };
            for (String mode : new String[] { "redir", "redirrel" }) {
                try (ConfigurableApplicationContext c = mode.equals("redir") ? start("default") : start("default", "--server.tomcat.use-relative-redirects=true")) {
                    for (String check : new String[] { "none", "slash", "path" })
                        for (int i = 0; i < nexts.length; i++) {
                            seen.clear(); landed.clear();
                            open(chrome, profile, "http://127.0.0.1:" + port(c) + "/done/" + check + "?next=" + URLEncoder.encode(nexts[i], StandardCharsets.UTF_8));
                            List<String> at = new ArrayList<>(seen); at.remove(0);   // 첫 요청(/done/...)은 뺀다
                            out.add("browser" + mode + "|" + check + "|" + NEXT_IDS[i] + " => attacker=" + landed.contains("/landed") + "|shop=" + at.toString().replace(atk, "{공격자}"));
                        }
                }
            }
        } finally {
            ctxs.forEach(ConfigurableApplicationContext::close);
            framers.values().forEach(s -> s.stop(0));
        }
    }
}

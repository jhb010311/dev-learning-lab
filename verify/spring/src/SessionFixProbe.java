import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpSession;
import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.security.Principal;
import java.util.ArrayList;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import org.springframework.boot.Banner;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.SpringBootConfiguration;
import org.springframework.boot.SpringBootVersion;
import org.springframework.boot.autoconfigure.EnableAutoConfiguration;
import org.springframework.context.ConfigurableApplicationContext;
import org.springframework.context.annotation.Bean;
import org.springframework.core.env.Environment;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.core.SpringSecurityCoreVersion;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.provisioning.InMemoryUserDetailsManager;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

// "세션 하이재킹과 세션 고정" 실습의 대조용 실행.
// 스프링 부트 + 스프링 시큐리티 서버를 127.0.0.1에 띄우고, 폼 로그인 전후의 세션 ID(JSESSIONID)를 실제 응답에서 읽는다.
// 요청은 모두 이 프로세스가 띄운 서버(127.0.0.1)로만 간다. 계정과 비밀번호는 이 시험만을 위한 값이다.
//   lab.fix = default(설정 없음) | none | newSession | change | migrate
// "공격자"와 "피해자"는 Cookie 헤더에 어떤 세션 ID를 넣어 보내는지만 다른, 같은 시험 프로그램의 요청이다.
@SpringBootConfiguration
@EnableAutoConfiguration   // 기본 패키지라서 컴포넌트 스캔은 쓰지 않는다
@RestController
public class SessionFixProbe {
    static final String TEST_USER = "kim", TEST_PW = "lab-only-pw-1";

    @GetMapping("/me") public String me(Principal p) { return p.getName(); }
    // 로그인하지 않아도 담을 수 있는 장바구니: 세션에 넣어 둔다
    @PostMapping("/cart") public String add(@RequestParam String item, HttpSession session) { session.setAttribute("cart", item); return "ok"; }
    @GetMapping("/cart") public String cart(HttpServletRequest req) { HttpSession s = req.getSession(false); Object c = s == null ? null : s.getAttribute("cart"); return c == null ? "-" : c.toString(); }

    @Bean UserDetailsService users() { return new InMemoryUserDetailsManager(User.withUsername(TEST_USER).password("{noop}" + TEST_PW).roles("USER").build()); }

    @Bean
    SecurityFilterChain filterChain(HttpSecurity http, Environment env) throws Exception {
        http.authorizeHttpRequests(a -> a.requestMatchers("/cart").permitAll().anyRequest().authenticated())
            .formLogin(Customizer.withDefaults());
        String fix = env.getProperty("lab.fix", "default");
        if (fix.equals("none")) http.sessionManagement(s -> s.sessionFixation(f -> f.none()));
        if (fix.equals("newSession")) http.sessionManagement(s -> s.sessionFixation(f -> f.newSession()));
        if (fix.equals("change")) http.sessionManagement(s -> s.sessionFixation(f -> f.changeSessionId()));
        if (fix.equals("migrate")) http.sessionManagement(s -> s.sessionFixation(f -> f.migrateSession()));
        return http.build();
    }

    // ---- 시험용 HTTP 도우미 ----
    static final HttpClient client = HttpClient.newBuilder().followRedirects(HttpClient.Redirect.NEVER).build();
    static String base;
    record Resp(int status, String body, String setCookie, String location) {
        String sid() { if (setCookie == null) return null; Matcher m = Pattern.compile("JSESSIONID=([^;]+)").matcher(setCookie); return m.find() ? m.group(1) : null; }
        String attrs() { return setCookie == null ? "-" : setCookie.replaceFirst("^JSESSIONID=[^;]+;?\\s*", ""); }
        String csrf() { Matcher m = Pattern.compile("name=\"_csrf\"[^>]*value=\"([^\"]+)\"").matcher(body); return m.find() ? m.group(1) : null; }
    }
    static Resp send(HttpRequest.Builder rb, String sid) throws Exception {
        if (sid != null) rb.header("Cookie", "JSESSIONID=" + sid);
        HttpResponse<String> r = client.send(rb.build(), HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8));
        String sc = r.headers().allValues("set-cookie").stream().filter(v -> v.startsWith("JSESSIONID=")).findFirst().orElse(null);
        return new Resp(r.statusCode(), r.body(), sc, r.headers().firstValue("location").orElse("-"));
    }
    static Resp get(String path, String sid) throws Exception { return send(HttpRequest.newBuilder(URI.create(base + path)).GET(), sid); }
    static Resp post(String path, String sid, String... kv) throws Exception {
        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < kv.length; i += 2) sb.append(i > 0 ? "&" : "").append(kv[i]).append('=').append(URLEncoder.encode(kv[i + 1], StandardCharsets.UTF_8));
        return send(HttpRequest.newBuilder(URI.create(base + path)).header("Content-Type", "application/x-www-form-urlencoded").POST(HttpRequest.BodyPublishers.ofString(sb.toString())), sid);
    }
    static String loc(Resp r) { return r.location().replaceFirst("^https?://[^/]+", ""); }

    // 한 가지 조합을 처음부터 끝까지 실행한다
    static String scenario(String when, boolean logout) throws Exception {
        // 1. 로그인 전 세션: 로그인 화면을 처음 열면 서버가 세션을 만들고 ID를 내려 준다
        Resp first = get("/login", null);
        String pre = first.sid();                       // before: 공격자가 받아 둔 ID를 피해자의 브라우저가 쓰게 된다 / after: 피해자가 직접 받은 ID
        // 2. 피해자: 그 세션 ID로 로그인 화면을 열고, 장바구니에 담고, 로그인한다
        Resp page = get("/login", pre);
        String csrf = page.csrf();
        Resp add = post("/cart", pre, "_csrf", csrf, "item", "키보드");
        Resp login = post("/login", pre, "_csrf", csrf, "username", TEST_USER, "password", TEST_PW);
        String postId = login.sid() != null ? login.sid() : pre;          // 응답에 새 Set-Cookie가 없으면 브라우저는 쓰던 ID를 계속 쓴다
        Resp cart = get("/cart", postId);
        Resp victimMe = get("/me", postId);
        // 3. 공격자가 알고 있는 ID: before는 로그인 전의 ID, after는 로그인 뒤의 ID
        String known = when.equals("before") ? pre : postId;
        // 4. (선택) 피해자가 로그아웃한다
        String logoutRes = "-";
        if (logout) { Resp lp = get("/logout", postId); Resp lo = post("/logout", postId, "_csrf", lp.csrf()); logoutRes = lo.status() + ":" + loc(lo); }
        // 5. 공격자: 알고 있는 ID를 쿠키에 넣어 요청한다
        Resp att = get("/me", known);
        return "preIssued=" + (pre != null) + "|pageNewCookie=" + (page.sid() != null) + "|cartAdd=" + add.status() + "|login=" + login.status() + ":" + loc(login)
            + "|idChanged=" + !postId.equals(pre) + "|cart=" + cart.body() + "|victim=" + victimMe.status() + ":" + (victimMe.status() == 200 ? victimMe.body() : loc(victimMe))
            + "|knownIsCurrent=" + known.equals(postId) + "|logout=" + logoutRes + "|attacker=" + att.status() + ":" + (att.status() == 200 ? att.body() : loc(att))
            + "|firstCookieAttrs=" + first.attrs() + "|loginCookieAttrs=" + login.attrs() + "|idLength=" + pre.length();
    }

    public static void main(String[] args) throws Exception {
        List<String> out = new ArrayList<>();
        out.add("# spring boot " + SpringBootVersion.getVersion() + " | spring security " + SpringSecurityCoreVersion.getVersion() + " | java " + System.getProperty("java.version"));
        for (String fix : new String[] { "default", "newSession", "none", "change", "migrate" }) {
            SpringApplication app = new SpringApplication(SessionFixProbe.class);
            app.setBannerMode(Banner.Mode.OFF); app.setLogStartupInfo(false);
            try (ConfigurableApplicationContext ctx = app.run("--server.port=0", "--server.address=127.0.0.1", "--lab.fix=" + fix, "--logging.level.root=OFF")) {
                base = "http://127.0.0.1:" + ctx.getEnvironment().getProperty("local.server.port");
                for (String when : new String[] { "before", "after" })
                    for (boolean logout : new boolean[] { false, true }) {
                        boolean extra = fix.equals("change") || fix.equals("migrate");      // 모형의 설정에는 없는 참고용 실행
                        out.add((extra ? "# 참고 " : "") + fix + "|" + when + "|" + logout + " => " + scenario(when, logout));
                    }
            }
        }
        // 참고: 세션 쿠키에 Secure를 붙이는 설정(server.servlet.session.cookie.secure=true)에서 Set-Cookie의 속성
        SpringApplication app = new SpringApplication(SessionFixProbe.class);
        app.setBannerMode(Banner.Mode.OFF); app.setLogStartupInfo(false);
        try (ConfigurableApplicationContext ctx = app.run("--server.port=0", "--server.address=127.0.0.1", "--server.servlet.session.cookie.secure=true", "--logging.level.root=OFF")) {
            base = "http://127.0.0.1:" + ctx.getEnvironment().getProperty("local.server.port");
            out.add("# 참고 cookie.secure=true 일 때 첫 Set-Cookie의 속성: " + get("/login", null).attrs());
        }
        Files.write(Path.of(args[0]), out, StandardCharsets.UTF_8);
        out.forEach(System.out::println);
    }
}

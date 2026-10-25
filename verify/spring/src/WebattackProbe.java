import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import jakarta.servlet.http.HttpServletRequest;
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
import org.springframework.security.web.csrf.CsrfToken;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

// "웹 공격 세 가지" 실습의 CSRF 서버 쪽을 실제 스프링 부트 + 스프링 시큐리티 서버에 HTTP 요청을 보내 확인한다.
// 브라우저가 쿠키를 붙이느냐(SameSite)는 브라우저가 정하는 일이라 여기서는 보지 않고(verify/cookie_probe.js),
// 서버가 받은 요청을 어떻게 처리하는지만 본다. 공격 요청 = 로그인한 세션 쿠키는 붙었지만 _csrf 값은 없는 POST.
//   token   : 화면의 코드처럼 CSRF 보호를 끄지 않은 구성(스프링 시큐리티 기본)
//   disable : http.csrf(csrf -> csrf.disable())로 끈 구성(실습의 "방어 없음", "SameSite=Lax만")
//   lax     : disable에 server.servlet.session.cookie.same-site=lax를 더한 구성. 서버가 내려 주는 Set-Cookie만 본다.
// 실행: javac -cp "libs/*" -d <임시> WebattackProbe.java, java -cp "<임시>;libs/*" WebattackProbe <결과 파일>
@SpringBootConfiguration
@EnableAutoConfiguration
@RestController
public class WebattackProbe {
    static final AtomicInteger transfers = new AtomicInteger();

    @PostMapping("/transfer")
    public String transfer(@RequestParam String to, @RequestParam long amount) { transfers.incrementAndGet(); return "transferred " + amount + " to " + to; }

    // 정상 화면이 폼에 심을 토큰 값 (스프링 시큐리티가 요청 속성 _csrf로 내놓는 CsrfToken)
    @GetMapping("/form-token")
    public String formToken(HttpServletRequest req) { CsrfToken t = (CsrfToken) req.getAttribute("_csrf"); return t == null ? "none" : t.getParameterName() + "=" + t.getToken(); }

    @Bean
    UserDetailsService users() { return new InMemoryUserDetailsManager(User.withUsername("kim").password("{noop}test-pass").roles("USER").build()); }

    @Bean
    SecurityFilterChain filterChain(HttpSecurity http, Environment env) throws Exception {
        http.authorizeHttpRequests(auth -> auth.anyRequest().authenticated())
            .formLogin(Customizer.withDefaults());
        if (!"token".equals(env.getProperty("lab.variant"))) http.csrf(csrf -> csrf.disable());
        return http.build();
    }

    static String enc(String s) { return URLEncoder.encode(s, StandardCharsets.UTF_8); }

    public static void main(String[] args) throws Exception {
        List<String> out = new ArrayList<>();
        out.add("# spring boot " + SpringBootVersion.getVersion() + " | spring security " + SpringSecurityCoreVersion.getVersion() + " | java " + System.getProperty("java.version"));
        HttpClient client = HttpClient.newBuilder().followRedirects(HttpClient.Redirect.NEVER).build();
        for (String variant : new String[] { "token", "disable", "lax" }) {
            SpringApplication app = new SpringApplication(WebattackProbe.class);
            app.setBannerMode(Banner.Mode.OFF); app.setLogStartupInfo(false);
            List<String> a = new ArrayList<>(List.of("--server.port=0", "--lab.variant=" + variant, "--logging.level.root=WARN"));
            if (variant.equals("lax")) a.add("--server.servlet.session.cookie.same-site=lax");
            try (ConfigurableApplicationContext ctx = app.run(a.toArray(new String[0]))) {
                String base = "http://127.0.0.1:" + ctx.getEnvironment().getProperty("local.server.port");
                // 1. 로그인 화면(스프링 시큐리티가 만드는 기본 화면)을 받아 세션과 폼의 _csrf 값을 얻는다
                HttpResponse<String> page = client.send(HttpRequest.newBuilder(URI.create(base + "/login")).GET().build(), HttpResponse.BodyHandlers.ofString());
                String cookie = page.headers().firstValue("Set-Cookie").orElse("");
                Matcher m = Pattern.compile("name=\"_csrf\"[^>]*value=\"([^\"]+)\"").matcher(page.body());
                String loginToken = m.find() ? m.group(1) : null;
                out.add(variant + "|login-page hidden _csrf input => " + (loginToken != null));
                String sid = cookie.isEmpty() ? "" : cookie.split(";")[0];
                // 2. 로그인
                String form = "username=kim&password=test-pass" + (loginToken != null ? "&_csrf=" + enc(loginToken) : "");
                HttpRequest.Builder lb = HttpRequest.newBuilder(URI.create(base + "/login")).header("Content-Type", "application/x-www-form-urlencoded").POST(HttpRequest.BodyPublishers.ofString(form));
                if (!sid.isEmpty()) lb.header("Cookie", sid);
                HttpResponse<String> login = client.send(lb.build(), HttpResponse.BodyHandlers.ofString());
                String setCookie = login.headers().firstValue("Set-Cookie").orElse("");
                out.add(variant + "|login => " + login.statusCode() + " " + login.headers().firstValue("Location").orElse("-").replace(base, ""));
                out.add(variant + "|session Set-Cookie => " + setCookie.replaceAll("JSESSIONID=[^;]+", "JSESSIONID=…"));
                String session = setCookie.isEmpty() ? sid : setCookie.split(";")[0];
                // 3. 공격: 다른 사이트의 숨은 폼이 보낸 것과 같은 POST (세션 쿠키는 붙었다고 보고, _csrf 값은 없다)
                int before = transfers.get();
                HttpResponse<String> atk = client.send(HttpRequest.newBuilder(URI.create(base + "/transfer")).header("Content-Type", "application/x-www-form-urlencoded").header("Cookie", session)
                    .POST(HttpRequest.BodyPublishers.ofString("to=attacker&amount=1000000")).build(), HttpResponse.BodyHandlers.ofString());
                out.add(variant + "|attack POST /transfer (cookie, no _csrf) => " + atk.statusCode() + "|transfer=" + (transfers.get() > before));
                // 4. 틀린 토큰
                before = transfers.get();
                HttpResponse<String> wrong = client.send(HttpRequest.newBuilder(URI.create(base + "/transfer")).header("Content-Type", "application/x-www-form-urlencoded").header("Cookie", session)
                    .POST(HttpRequest.BodyPublishers.ofString("to=attacker&amount=1000000&_csrf=guessed-value")).build(), HttpResponse.BodyHandlers.ofString());
                out.add(variant + "|attack POST /transfer (cookie, wrong _csrf) => " + wrong.statusCode() + "|transfer=" + (transfers.get() > before));
                // 5. 정상: 우리 화면이 심은 _csrf 값을 함께 보낸다
                HttpResponse<String> ft = client.send(HttpRequest.newBuilder(URI.create(base + "/form-token")).header("Cookie", session).GET().build(), HttpResponse.BodyHandlers.ofString());
                String pair = ft.body();
                out.add(variant + "|form token attribute => " + (pair.startsWith("_csrf=") ? "_csrf=(값 " + (pair.length() - 6) + "자)" : pair));
                if (pair.startsWith("_csrf=")) {
                    before = transfers.get();
                    HttpResponse<String> ok = client.send(HttpRequest.newBuilder(URI.create(base + "/transfer")).header("Content-Type", "application/x-www-form-urlencoded").header("Cookie", session)
                        .POST(HttpRequest.BodyPublishers.ofString("to=friend&amount=1000&_csrf=" + enc(pair.substring(6)))).build(), HttpResponse.BodyHandlers.ofString());
                    out.add(variant + "|own form POST /transfer (cookie, right _csrf) => " + ok.statusCode() + "|transfer=" + (transfers.get() > before));
                }
                // 6. 쿠키 없이(브라우저가 쿠키를 붙이지 않은 경우) 같은 POST
                before = transfers.get();
                HttpResponse<String> noc = client.send(HttpRequest.newBuilder(URI.create(base + "/transfer")).header("Content-Type", "application/x-www-form-urlencoded")
                    .POST(HttpRequest.BodyPublishers.ofString("to=attacker&amount=1000000")).build(), HttpResponse.BodyHandlers.ofString());
                out.add(variant + "|POST /transfer without cookie => " + noc.statusCode() + " " + noc.headers().firstValue("Location").orElse("-").replace(base, "").replaceAll(";jsessionid=[^/]*", ";jsessionid=…") + "|transfer=" + (transfers.get() > before));
            }
        }
        Files.write(Path.of(args[0]), out, StandardCharsets.UTF_8);
        out.forEach(System.out::println);
    }
}

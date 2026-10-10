import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.atomic.AtomicInteger;
import org.springframework.boot.Banner;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.SpringBootVersion;
import org.springframework.boot.SpringBootConfiguration;
import org.springframework.boot.autoconfigure.EnableAutoConfiguration;
import org.springframework.context.ConfigurableApplicationContext;
import org.springframework.context.annotation.Bean;
import org.springframework.core.env.Environment;
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.core.SpringSecurityCoreVersion;
import org.springframework.security.core.authority.AuthorityUtils;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.HttpStatusEntryPoint;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.filter.OncePerRequestFilter;

// "시큐리티 필터 체인" 실습의 열두 가지 조합을 실제 스프링 부트 + 스프링 시큐리티 서버에 HTTP 요청을 보내 확인한다.
// 두 가지 구성으로 실행한다.
//   plain  : 화면의 코드 그대로 (인증 실패 때 무엇으로 응답할지 정하지 않은 구성)
//   entry  : 거기에 "인증되지 않은 요청에는 401로 답한다"(AuthenticationEntryPoint)를 명시한 구성
@SpringBootConfiguration
@EnableAutoConfiguration   // 기본 패키지라서 컴포넌트 스캔은 쓰지 않는다
@RestController
public class SecurityProbe {
    static final AtomicInteger controllerRuns = new AtomicInteger();
    static volatile boolean authenticated;

    @GetMapping("/public/notice") public String notice() { controllerRuns.incrementAndGet(); return "notice"; }
    @GetMapping("/orders") public String orders() { controllerRuns.incrementAndGet(); return "orders"; }
    @GetMapping("/admin/users") public String users() { controllerRuns.incrementAndGet(); return "users"; }

    // 토큰이 없거나 잘못됐으면 거절하지 않고 그대로 넘긴다 (실습의 전제와 같음)
    static class JwtAuthenticationFilter extends OncePerRequestFilter {
        @Override protected void doFilterInternal(HttpServletRequest req, HttpServletResponse res, FilterChain chain) throws ServletException, IOException {
            String h = req.getHeader("Authorization");
            String role = "Bearer user-token".equals(h) ? "ROLE_USER" : "Bearer admin-token".equals(h) ? "ROLE_ADMIN" : null;
            if (role != null) SecurityContextHolder.getContext().setAuthentication(new UsernamePasswordAuthenticationToken("someone", null, AuthorityUtils.createAuthorityList(role)));
            authenticated = role != null;
            chain.doFilter(req, res);
        }
    }

    @Bean
    SecurityFilterChain filterChain(HttpSecurity http, Environment env) throws Exception {
        http.csrf(csrf -> csrf.disable())
            .sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authorizeHttpRequests(auth -> auth
                .requestMatchers("/public/**").permitAll()
                .requestMatchers("/admin/**").hasRole("ADMIN")
                .anyRequest().authenticated())
            .addFilterBefore(new JwtAuthenticationFilter(), UsernamePasswordAuthenticationFilter.class);
        if ("entry".equals(env.getProperty("lab.variant")))
            http.exceptionHandling(e -> e
                .authenticationEntryPoint((req, res, ex) -> { res.setHeader("X-Ended-At", "AuthenticationEntryPoint"); new HttpStatusEntryPoint(HttpStatus.UNAUTHORIZED).commence(req, res, ex); })
                .accessDeniedHandler((req, res, ex) -> { res.setHeader("X-Ended-At", "AccessDeniedHandler"); res.sendError(HttpServletResponse.SC_FORBIDDEN); }));
        // direct: 권한 부족 응답을 sendError가 아니라 상태 코드를 직접 써서 보낸다 (오류 페이지로 다시 넘어가지 않는다)
        if ("direct".equals(env.getProperty("lab.variant")))
            http.exceptionHandling(e -> e
                .authenticationEntryPoint((req, res, ex) -> { res.setHeader("X-Ended-At", "AuthenticationEntryPoint"); res.setStatus(HttpServletResponse.SC_UNAUTHORIZED); })
                .accessDeniedHandler((req, res, ex) -> { res.setHeader("X-Ended-At", "AccessDeniedHandler"); res.setStatus(HttpServletResponse.SC_FORBIDDEN); }));
        // defaulth: 401 응답만 정하고 권한 부족은 스프링 시큐리티의 기본 처리기에 맡긴다
        if ("defaulth".equals(env.getProperty("lab.variant")))
            http.exceptionHandling(e -> e.authenticationEntryPoint(new HttpStatusEntryPoint(HttpStatus.UNAUTHORIZED)));
        return http.build();
    }

    public static void main(String[] args) throws Exception {
        List<String> out = new ArrayList<>();
        out.add("# spring boot " + SpringBootVersion.getVersion() + " | spring security " + SpringSecurityCoreVersion.getVersion());
        HttpClient client = HttpClient.newHttpClient();
        for (String variant : new String[] { "plain", "entry", "direct", "defaulth" }) {
            SpringApplication app = new SpringApplication(SecurityProbe.class);
            app.setBannerMode(Banner.Mode.OFF); app.setLogStartupInfo(false);
            try (ConfigurableApplicationContext ctx = app.run("--server.port=0", "--lab.variant=" + variant, "--logging.level.root=WARN")) {
                String port = ctx.getEnvironment().getProperty("local.server.port");
                for (String who : new String[] { "none", "bad", "user", "admin" })
                    for (String p : new String[] { "public", "orders", "admin" }) {
                        String url = "http://127.0.0.1:" + port + (p.equals("public") ? "/public/notice" : p.equals("orders") ? "/orders" : "/admin/users");
                        HttpRequest.Builder rb = HttpRequest.newBuilder(URI.create(url)).GET();
                        if (!who.equals("none")) rb.header("Authorization", "Bearer " + (who.equals("bad") ? "expired-or-forged" : who + "-token"));
                        int before = controllerRuns.get(); authenticated = false;
                        HttpResponse<String> r = client.send(rb.build(), HttpResponse.BodyHandlers.ofString());
                        out.add(variant + "|" + who + "|" + p + " => " + r.statusCode() + "|auth=" + authenticated + "|controller=" + (controllerRuns.get() > before) + "|ended=" + r.headers().firstValue("X-Ended-At").orElse("-"));
                    }
            }
        }
        Files.write(Path.of(args[0]), out, StandardCharsets.UTF_8);
        out.forEach(System.out::println);
    }
}

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
import java.security.MessageDigest;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Base64;
import java.util.List;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import org.springframework.boot.Banner;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.SpringBootConfiguration;
import org.springframework.boot.SpringBootVersion;
import org.springframework.boot.autoconfigure.EnableAutoConfiguration;
import org.springframework.context.ConfigurableApplicationContext;
import org.springframework.context.annotation.Bean;
import org.springframework.core.env.Environment;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.SpringSecurityCoreVersion;
import org.springframework.security.core.authority.FactorGrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.AuthenticationEntryPoint;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.access.AccessDeniedHandler;
import org.springframework.security.web.authentication.www.BasicAuthenticationFilter;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.filter.OncePerRequestFilter;

// "시큐리티 필터 체인" 실습(oauth2ResourceServer 중심으로 다시 짠 것)의 열두 가지 조합을 실제 스프링 부트 + 스프링 시큐리티 서버에 HTTP 요청을 보내 확인한다.
// 실제로 도는 것: 스프링 부트 4.1.1, 스프링 시큐리티 7.1.1(core·web·config)의 SecurityFilterChain, authorizeHttpRequests(AuthorizationFilter),
//                AnonymousAuthenticationFilter, ExceptionTranslationFilter, 그리고 그 둘이 부르는 AuthenticationEntryPoint/AccessDeniedHandler.
// 대역인 것: spring-security-oauth2-resource-server와 oauth2-jose가 이 컴퓨터에 없어서, http.oauth2ResourceServer(o -> o.jwt(...))가 더하는 세 부품을
//           7.1.1 소스에서 동작만 옮긴 대역으로 둔다(실제 클래스가 아님).
//   BearerStandIn       = BearerTokenAuthenticationFilter: 토큰이 없으면 그냥 다음 필터로, 있으면 JwtDecoder로 검증해
//                         실패하면 그 자리에서 진입점을 불러 401로 끝내고(경로와 상관없음), 성공하면 SecurityContext에 인증 정보를 둔다.
//                         자리는 FilterOrderRegistration대로 BasicAuthenticationFilter 바로 앞.
//                         검증은 verify/plain/JwtProbe.java와 같은 판단(NimbusJwtDecoder.withSecretKey 기본값: HS256, 서명, exp 60초 여유)을 javax.crypto.Mac으로 실제 계산한다.
//                         권한은 JwtAuthenticationConverter + JwtGrantedAuthoritiesConverter(claim "role", 앞말 "ROLE_")처럼 ROLE_<role>과, 7.0부터 붙는 FACTOR_BEARER.
//   ENTRY               = BearerTokenAuthenticationEntryPoint: setStatus(401) + WWW-Authenticate: Bearer ...(resource_metadata 값은 뺌)
//   DENIED              = BearerTokenAccessDeniedHandler: setStatus(403) + WWW-Authenticate: Bearer error="insufficient_scope", ...
//   (OAuth2ResourceServerConfigurer는 이 둘을 exceptionHandling의 기본값으로 등록한다. 대역은 exceptionHandling에 직접 둔다.)
// 비교용 variant "custom": 잘못된 토큰이어도 거절하지 않고 넘기는, 직접 만든 필터(옛 실습의 JwtAuthenticationFilter와 같은 동작).
// 토큰은 "JWT의 구조와 검증" 실습의 값(서버 키 shop-example-hs256-secret-key-01)을 그대로 쓰고, 검증 시각은 2025-12-31T23:50:00Z(만료 10분 전)로 고정한다.
// 사용: javac -proc:none -cp "<libs>/*" -d <폴더> SecurityStdProbe.java && java -cp "<폴더>;<libs>/*" SecurityStdProbe verify/spring/security_std_probe.out.txt
@SpringBootConfiguration
@EnableAutoConfiguration
@RestController
public class SecurityStdProbe {
    static final AtomicInteger controllerRuns = new AtomicInteger();
    static volatile String seenAuth = "-";
    static final byte[] serverKey = "shop-example-hs256-secret-key-01".getBytes(StandardCharsets.US_ASCII);   // 시험용 값
    static final long NOW = 1767225000L;
    static final String TEMPLATE = "An error occurred while attempting to decode the Jwt: %s";
    static final String RFC6750 = "https://tools.ietf.org/html/rfc6750#section-3.1";

    @GetMapping("/public/notice") public String notice() { record(); return "notice"; }
    @GetMapping("/orders") public String orders() { record(); return "orders"; }
    @GetMapping("/admin/users") public String users() { record(); return "users"; }
    static void record() {
        controllerRuns.incrementAndGet();
        Authentication a = SecurityContextHolder.getContext().getAuthentication();
        seenAuth = a == null ? "null" : a.getClass().getSimpleName() + ":" + a.getName() + ":" + a.getAuthorities().stream().map(GrantedAuthority::getAuthority).sorted().toList();
    }

    static String field(String json, String name) {
        Matcher m = Pattern.compile("\"" + name + "\":(\"([^\"]*)\"|(\\d+))").matcher(json);
        return m.find() ? (m.group(2) != null ? m.group(2) : m.group(3)) : null;
    }
    // NimbusJwtDecoder.withSecretKey(key).build().decode(token)의 판단(소스에서 옮김). 성공하면 {sub, role}, 실패하면 예외 메시지를 담은 IllegalArgumentException
    static String[] decode(String token) throws Exception {
        Base64.Decoder dec = Base64.getUrlDecoder();
        String[] part = token.split("\\.", -1);
        if (part.length != 3) throw new IllegalArgumentException(String.format(TEMPLATE, "Malformed token"));
        String header = new String(dec.decode(part[0]), StandardCharsets.UTF_8), alg = field(header, "alg");
        if ("none".equals(alg)) throw new IllegalArgumentException("Unsupported algorithm of none");
        if (!"HS256".equals(alg)) throw new IllegalArgumentException(String.format(TEMPLATE, "Signed JWT rejected: Another algorithm expected, or no matching key(s) found"));
        Mac mac = Mac.getInstance("HmacSHA256");
        mac.init(new SecretKeySpec(serverKey, "HmacSHA256"));
        byte[] expected = mac.doFinal((part[0] + "." + part[1]).getBytes(StandardCharsets.US_ASCII));
        if (!MessageDigest.isEqual(expected, dec.decode(part[2]))) throw new IllegalArgumentException(String.format(TEMPLATE, "Signed JWT rejected: Invalid signature"));
        String payload = new String(dec.decode(part[1]), StandardCharsets.UTF_8);
        Instant exp = Instant.ofEpochSecond(Long.parseLong(field(payload, "exp")));
        if (Instant.ofEpochSecond(NOW).minusSeconds(60).isAfter(exp)) throw new IllegalArgumentException(String.format(TEMPLATE, "Jwt expired at " + exp));
        return new String[] { field(payload, "sub"), field(payload, "role") };
    }

    static final AuthenticationEntryPoint ENTRY = (req, res, ex) -> {
        res.setHeader("X-Ended-At", "AuthenticationEntryPoint");
        String desc = (String) req.getAttribute("lab.invalidToken");
        res.addHeader("WWW-Authenticate", desc == null ? "Bearer" : "Bearer error=\"invalid_token\", error_description=\"" + desc + "\", error_uri=\"" + RFC6750 + "\"");
        res.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
    };
    static final AccessDeniedHandler DENIED = (req, res, ex) -> {
        res.setHeader("X-Ended-At", "AccessDeniedHandler");
        res.addHeader("WWW-Authenticate", "Bearer error=\"insufficient_scope\", error_description=\"The request requires higher privileges than provided by the access token.\", error_uri=\"" + RFC6750 + "\"");
        res.setStatus(HttpServletResponse.SC_FORBIDDEN);
    };

    static class BearerStandIn extends OncePerRequestFilter {
        final boolean rejectInvalid;
        BearerStandIn(boolean rejectInvalid) { this.rejectInvalid = rejectInvalid; }
        @Override protected void doFilterInternal(HttpServletRequest req, HttpServletResponse res, FilterChain chain) throws ServletException, IOException {
            String h = req.getHeader("Authorization");
            if (h == null || !h.regionMatches(true, 0, "Bearer ", 0, 7)) { chain.doFilter(req, res); return; }   // 토큰 없음: 그냥 넘김
            String[] claims;
            try { claims = decode(h.substring(7)); }
            catch (Exception e) {
                SecurityContextHolder.clearContext();
                if (!rejectInvalid) { chain.doFilter(req, res); return; }                                       // custom: 그냥 넘김
                req.setAttribute("lab.invalidToken", e.getMessage());
                res.setHeader("X-Rejected-In", "BearerTokenAuthenticationFilter");
                ENTRY.commence(req, res, null);                                                                     // 그 자리에서 401로 끝
                return;
            }
            List<GrantedAuthority> auth = new ArrayList<>(List.of(new SimpleGrantedAuthority("ROLE_" + claims[1])));
            if (rejectInvalid) auth.add(FactorGrantedAuthority.fromAuthority(FactorGrantedAuthority.BEARER_AUTHORITY));
            var ctx = SecurityContextHolder.createEmptyContext();
            ctx.setAuthentication(UsernamePasswordAuthenticationToken.authenticated(claims[0], null, auth));
            SecurityContextHolder.setContext(ctx);
            chain.doFilter(req, res);
        }
    }

    @Bean
    SecurityFilterChain filterChain(HttpSecurity http, Environment env) throws Exception {
        boolean std = !"custom".equals(env.getProperty("lab.variant"));
        http.sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authorizeHttpRequests(auth -> auth
                .requestMatchers("/public/**").permitAll()
                .requestMatchers("/admin/**").hasRole("ADMIN")
                .anyRequest().authenticated())
            .addFilterBefore(new BearerStandIn(std), BasicAuthenticationFilter.class)
            .exceptionHandling(e -> e.authenticationEntryPoint(ENTRY).accessDeniedHandler(DENIED));
        return http.build();
    }

    static String b64u(String s) { return Base64.getUrlEncoder().withoutPadding().encodeToString(s.getBytes(StandardCharsets.UTF_8)); }
    static String sign(String hp) throws Exception {
        Mac mac = Mac.getInstance("HmacSHA256");
        mac.init(new SecretKeySpec(serverKey, "HmacSHA256"));
        return Base64.getUrlEncoder().withoutPadding().encodeToString(mac.doFinal(hp.getBytes(StandardCharsets.US_ASCII)));
    }

    public static void main(String[] args) throws Exception {
        String h = b64u("{\"alg\":\"HS256\",\"typ\":\"JWT\"}");
        String pUser = b64u("{\"sub\":\"7\",\"role\":\"USER\",\"exp\":1767225600}"), pAdmin = b64u("{\"sub\":\"7\",\"role\":\"ADMIN\",\"exp\":1767225600}");
        String user = h + "." + pUser + "." + sign(h + "." + pUser), admin = h + "." + pAdmin + "." + sign(h + "." + pAdmin);
        String bad = h + "." + pAdmin + "." + sign(h + "." + pUser);   // 내용을 고치고 서명은 그대로 둔 토큰
        List<String> out = new ArrayList<>();
        out.add("# spring boot " + SpringBootVersion.getVersion() + " | spring security " + SpringSecurityCoreVersion.getVersion() + " | java " + System.getProperty("java.version"));
        out.add("# token.user " + user);
        out.add("# token.admin " + admin);
        out.add("# token.bad " + bad);
        HttpClient client = HttpClient.newHttpClient();
        for (String variant : new String[] { "std", "custom" }) {
            SpringApplication app = new SpringApplication(SecurityStdProbe.class);
            app.setBannerMode(Banner.Mode.OFF); app.setLogStartupInfo(false);
            try (ConfigurableApplicationContext ctx = app.run("--server.port=0", "--lab.variant=" + variant, "--logging.level.root=WARN")) {
                SecurityFilterChain chain = ctx.getBean(SecurityFilterChain.class);
                out.add("# chain." + variant + " " + String.join(" > ", chain.getFilters().stream().map(f -> f.getClass().getSimpleName()).toList()));
                String port = ctx.getEnvironment().getProperty("local.server.port");
                for (String who : new String[] { "none", "bad", "user", "admin" })
                    for (String p : new String[] { "public", "orders", "admin" }) {
                        String url = "http://127.0.0.1:" + port + (p.equals("public") ? "/public/notice" : p.equals("orders") ? "/orders" : "/admin/users");
                        HttpRequest.Builder rb = HttpRequest.newBuilder(URI.create(url)).GET();
                        if (!who.equals("none")) rb.header("Authorization", "Bearer " + (who.equals("bad") ? bad : who.equals("user") ? user : admin));
                        int before = controllerRuns.get(); seenAuth = "-";
                        HttpResponse<String> r = client.send(rb.build(), HttpResponse.BodyHandlers.ofString());
                        out.add(variant + "|" + who + "|" + p + " => " + r.statusCode() + "|controller=" + (controllerRuns.get() > before) + "|auth=" + seenAuth
                            + "|ended=" + r.headers().firstValue("X-Ended-At").orElse("-") + "|rejectedIn=" + r.headers().firstValue("X-Rejected-In").orElse("-")
                            + "|www=" + r.headers().firstValue("WWW-Authenticate").orElse("-"));
                    }
            }
        }
        Files.write(Path.of(args[0]), out, StandardCharsets.UTF_8);
        out.forEach(System.out::println);
    }
}

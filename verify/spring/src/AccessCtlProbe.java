import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.Base64;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.atomic.AtomicInteger;
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
import org.springframework.http.HttpStatus;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.SpringSecurityCoreVersion;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.provisioning.InMemoryUserDetailsManager;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

// "접근 제어" 실습의 대조용 실행.
// 스프링 부트 + 스프링 시큐리티 서버를 127.0.0.1에 띄우고, 로그인한 사용자가 주소의 번호만 바꿔 주문을 조회하는 요청을 실제로 보낸다.
// 요청은 모두 이 프로세스가 띄운 서버(127.0.0.1)로만 간다. 계정과 비밀번호는 이 시험만을 위한 값이다.
//   lab.check = login(로그인만 확인) | role(URL 규칙으로 역할만 확인) | owner403(소유자가 아니면 403) | owner404(소유자가 아니면 404) | ownerAdmin(소유자이거나 ADMIN)
@SpringBootConfiguration
@EnableAutoConfiguration   // 기본 패키지라서 컴포넌트 스캔은 쓰지 않는다
@RestController
public class AccessCtlProbe {
    public record Order(long id, String owner, String item, String address) { }

    // 주문 저장소 (DB 대신 메모리)
    static class OrderRepository {
        final Map<Long, Order> rows = Map.of(1L, new Order(1, "kim", "키보드", "서울시 가나동 1"), 2L, new Order(2, "lee", "노트북", "부산시 다라동 2"));
        Optional<Order> findById(long id) { return Optional.ofNullable(rows.get(id)); }
        Optional<Order> findByIdAndOwner(long id, String owner) { return findById(id).filter(o -> o.owner().equals(owner)); }
    }
    static final OrderRepository orders = new OrderRepository();
    static final AtomicInteger controllerRuns = new AtomicInteger();
    static volatile String reason = "-", check = "login";

    @GetMapping("/orders/{id}")
    public Order one(@PathVariable long id, Authentication auth) {
        controllerRuns.incrementAndGet();
        if (check.equals("owner403")) {
            Order o = orders.findById(id).orElseThrow(() -> { reason = "not-found"; return new ResponseStatusException(HttpStatus.NOT_FOUND); });
            if (!o.owner().equals(auth.getName())) { reason = "not-owner"; throw new ResponseStatusException(HttpStatus.FORBIDDEN); }   // 소유자 확인
            reason = "owner"; return o;
        }
        if (check.equals("owner404")) {
            Order o = orders.findByIdAndOwner(id, auth.getName()).orElseThrow(() -> { reason = "not-mine"; return new ResponseStatusException(HttpStatus.NOT_FOUND); });   // 내 주문 가운데에서만 찾는다
            reason = "owner"; return o;
        }
        if (check.equals("ownerAdmin")) {
            Order o = orders.findById(id).orElseThrow(() -> { reason = "not-found"; return new ResponseStatusException(HttpStatus.NOT_FOUND); });
            boolean admin = auth.getAuthorities().stream().anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN"));
            boolean owner = o.owner().equals(auth.getName());
            if (!owner && !admin) { reason = "not-owner"; throw new ResponseStatusException(HttpStatus.FORBIDDEN); }
            reason = owner ? "owner" : "admin"; return o;
        }
        // login, role: 컨트롤러는 소유자를 확인하지 않는다
        Order o = orders.findById(id).orElseThrow(() -> { reason = "not-found"; return new ResponseStatusException(HttpStatus.NOT_FOUND); });
        reason = "no-owner-check"; return o;
    }

    static final String PW = "lab-only-pw-2";
    @Bean UserDetailsService users() {
        return new InMemoryUserDetailsManager(
            User.withUsername("kim").password("{noop}" + PW).roles("USER").build(),
            User.withUsername("lee").password("{noop}" + PW).roles("USER").build(),
            User.withUsername("park").password("{noop}" + PW).roles("ADMIN").build());
    }

    @Bean
    SecurityFilterChain filterChain(HttpSecurity http, Environment env) throws Exception {
        boolean role = "role".equals(env.getProperty("lab.check"));
        http.authorizeHttpRequests(a -> {
                if (role) a.requestMatchers("/orders/**").hasRole("USER");      // 역할만 본다
                a.anyRequest().authenticated();                                 // 로그인했는지만 본다
            })
            .httpBasic(Customizer.withDefaults());
        return http.build();
    }

    public static void main(String[] args) throws Exception {
        List<String> out = new ArrayList<>();
        out.add("# spring boot " + SpringBootVersion.getVersion() + " | spring security " + SpringSecurityCoreVersion.getVersion() + " | java " + System.getProperty("java.version"));
        HttpClient client = HttpClient.newHttpClient();
        for (String variant : new String[] { "login", "role", "owner403", "owner404", "ownerAdmin" }) {
            check = variant;
            SpringApplication app = new SpringApplication(AccessCtlProbe.class);
            app.setBannerMode(Banner.Mode.OFF); app.setLogStartupInfo(false);
            try (ConfigurableApplicationContext ctx = app.run("--server.port=0", "--server.address=127.0.0.1", "--lab.check=" + variant, "--logging.level.root=OFF")) {
                String base = "http://127.0.0.1:" + ctx.getEnvironment().getProperty("local.server.port");
                for (String who : new String[] { "kim", "admin", "anon" })
                    for (String target : new String[] { "mine", "other", "missing" }) {
                        String id = target.equals("mine") ? "1" : target.equals("other") ? "2" : "99";
                        HttpRequest.Builder rb = HttpRequest.newBuilder(URI.create(base + "/orders/" + id)).GET();
                        if (!who.equals("anon")) rb.header("Authorization", "Basic " + Base64.getEncoder().encodeToString(((who.equals("admin") ? "park" : who) + ":" + PW).getBytes(StandardCharsets.UTF_8)));
                        int before = controllerRuns.get(); reason = "-";
                        HttpResponse<String> r = client.send(rb.build(), HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8));
                        Matcher m = Pattern.compile("\"owner\":\"(\\w+)\"").matcher(r.body());
                        String line = variant + "|" + who + "|" + target + " => " + r.statusCode() + "|owner=" + (m.find() ? m.group(1) : "-") + "|controller=" + (controllerRuns.get() > before) + "|reason=" + reason
                            + "|leak=" + (r.body().contains("노트북") || r.body().contains("부산시") || r.body().contains("키보드"));
                        out.add(who.equals("anon") ? "# 참고 " + line : line);       // 로그인하지 않은 요청은 모형의 설정에 없는 참고용 실행
                    }
            }
        }
        Files.write(Path.of(args[0]), out, StandardCharsets.UTF_8);
        out.forEach(System.out::println);
    }
}

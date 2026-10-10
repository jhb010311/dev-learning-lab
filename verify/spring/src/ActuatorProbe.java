import jakarta.servlet.http.HttpServletRequest;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.TreeSet;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import org.springframework.boot.Banner;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.SpringBootConfiguration;
import org.springframework.boot.SpringBootVersion;
import org.springframework.boot.autoconfigure.EnableAutoConfiguration;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.boot.health.actuate.endpoint.HealthEndpointGroup;
import org.springframework.boot.health.actuate.endpoint.HealthEndpointGroups;
import org.springframework.boot.health.contributor.Health;
import org.springframework.boot.health.contributor.HealthIndicator;
import org.springframework.boot.health.registry.HealthContributorRegistry;
import org.springframework.context.ConfigurableApplicationContext;
import org.springframework.context.annotation.Bean;
import org.springframework.core.SpringVersion;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.AnonymousAuthenticationFilter;

// "액추에이터와 헬스 체크" 실습의 조합을 실제 스프링 부트 서버(내장 톰캣, 127.0.0.1, 포트 0)에 HTTP 요청을 보내 확인한다.
// 구성 요소는 직접 만든 pay 하나와, 스프링 부트가 넣는 livenessState, readinessState만 남긴다.
// 자동으로 붙는 diskSpace, ping, ssl, db(클래스패스에 H2와 DataSource 자동 설정이 있다)는 management.health.defaults.enabled=false로 끈다.
// 서버는 show-details 세 가지 × readiness 그룹에 pay를 넣었는지 두 가지 = 여섯 번 띄우고, pay가 답할 상태는 실행 중에 바꾼다(헬스 응답은 기본으로 캐시하지 않는다).
// "로그인한 요청"은 비밀번호 없이, X-Lab-User 헤더가 있으면 스프링 시큐리티의 인증 정보를 채워 주는 시험용 필터로 만든다.
@SpringBootConfiguration
@EnableAutoConfiguration
public class ActuatorProbe {
    static volatile String pay = "UP", stock = "UP";
    static volatile int payCalls;

    static Health answer(String status, String target) {
        Health.Builder b = switch (status) {
            case "UP" -> Health.up();
            case "DOWN" -> Health.down();
            case "OUT_OF_SERVICE" -> Health.outOfService();
            default -> Health.unknown();
        };
        return b.withDetail("target", target).build();
    }

    @Bean SecurityFilterChain open(HttpSecurity http) throws Exception {
        return http.csrf(c -> c.disable())
            .addFilterBefore((req, res, chain) -> {
                String user = ((HttpServletRequest) req).getHeader("X-Lab-User");
                if (user != null) SecurityContextHolder.getContext().setAuthentication(UsernamePasswordAuthenticationToken.authenticated(user, "N/A", List.of(new SimpleGrantedAuthority("ROLE_USER"))));
                chain.doFilter(req, res);
            }, AnonymousAuthenticationFilter.class)
            .authorizeHttpRequests(a -> a.anyRequest().permitAll()).build();
    }

    // 빈 이름 payHealthIndicator에서 HealthIndicator를 뗀 "pay"가 구성 요소 이름이 된다 (화면의 @Component class PayHealthIndicator와 같은 이름)
    @Bean @ConditionalOnProperty(name = "lab.pay", havingValue = "true") HealthIndicator payHealthIndicator() { return new PayHealthIndicator(); }
    // 화면에는 없고, 상태의 우선순위를 확인하는 추가 실행에서만 켠다
    @Bean @ConditionalOnProperty(name = "lab.stock", havingValue = "true") HealthIndicator stockHealthIndicator() { return () -> answer(stock, "stock.example"); }

    static final HttpClient CLIENT = HttpClient.newHttpClient();
    static final String[] STATUSES = { "UP", "DOWN", "OUT_OF_SERVICE", "UNKNOWN" };

    static ConfigurableApplicationContext start(String... props) {
        SpringApplication app = new SpringApplication(ActuatorProbe.class);
        app.setBannerMode(Banner.Mode.OFF); app.setLogStartupInfo(false);
        List<String> args = new ArrayList<>(List.of("--server.port=0", "--server.address=127.0.0.1", "--logging.level.root=OFF"));
        args.addAll(Arrays.asList(props));
        return app.run(args.toArray(new String[0]));
    }
    static HttpResponse<String> get(ConfigurableApplicationContext ctx, String path, boolean user) throws Exception {
        HttpRequest.Builder rb = HttpRequest.newBuilder(URI.create("http://127.0.0.1:" + ctx.getEnvironment().getProperty("local.server.port") + path)).GET();
        if (user) rb.header("X-Lab-User", "kim");
        return CLIENT.send(rb.build(), HttpResponse.BodyHandlers.ofString());
    }
    // 이 주소가 고르는 그룹에 들어 있는 구성 요소 이름 (등록된 구성 요소 가운데 그룹이 "내 것"이라고 답한 것)
    static String members(ConfigurableApplicationContext ctx, String group) {
        HealthEndpointGroups groups = ctx.getBean(HealthEndpointGroups.class);
        HealthEndpointGroup g = group == null ? groups.getPrimary() : groups.get(group);
        if (g == null) return "(그룹 없음)";
        TreeSet<String> names = new TreeSet<>();
        ctx.getBean(HealthContributorRegistry.class).stream().forEach(e -> { if (g.isMember(e.name())) names.add(e.name()); });
        return String.join(",", names);
    }
    static String registered(ConfigurableApplicationContext ctx) {
        TreeSet<String> names = new TreeSet<>();
        ctx.getBean(HealthContributorRegistry.class).stream().forEach(e -> names.add(e.name()));
        return String.join(",", names);
    }
    static String links(String body) {
        int at = body.indexOf("\"_links\""); if (at < 0) return "?";
        TreeSet<String> names = new TreeSet<>(); Matcher m = Pattern.compile("\"([A-Za-z-]+)\":\\{\"href\"").matcher(body);
        while (m.find()) names.add(m.group(1));
        return String.join(",", names);
    }
    static String code(ConfigurableApplicationContext ctx, String path) throws Exception { return path + "=" + get(ctx, path, false).statusCode(); }

    public static void main(String[] args) throws Exception {
        List<String> out = new ArrayList<>();
        out.add("# spring boot " + SpringBootVersion.getVersion() + " | spring framework " + SpringVersion.getVersion());
        String OFF = "--management.health.defaults.enabled=false", PAY = "--lab.pay=true";
        String[][] PATHS = { { "health", "/actuator/health", null }, { "liveness", "/actuator/health/liveness", "liveness" }, { "readiness", "/actuator/health/readiness", "readiness" } };

        // 화면의 조합: pay 상태 4 × 주소 3 × show-details와 요청한 사람 4 × readiness 그룹에 pay를 넣었는지 2 = 96
        for (String show : new String[] { "never", "when-authorized", "always" })
            for (boolean ready : new boolean[] { false, true }) {
                List<String> props = new ArrayList<>(List.of(OFF, PAY));
                if (!show.equals("never")) props.add("--management.endpoint.health.show-details=" + show);   // never는 적지 않는다(기본값 확인)
                if (ready) props.add("--management.endpoint.health.group.readiness.include=readinessState,pay");
                try (ConfigurableApplicationContext ctx = start(props.toArray(new String[0]))) {
                    out.add("# 등록된 구성 요소(show-details=" + show + ", readiness에 pay=" + ready + "): " + registered(ctx));
                    for (String who : show.equals("when-authorized") ? new String[] { "anon", "user" } : new String[] { "anon" }) {
                        String details = show.equals("when-authorized") ? "auth_" + who : show;
                        for (String st : STATUSES)
                            for (String[] p : PATHS) {
                                pay = st; payCalls = 0;
                                HttpResponse<String> r = get(ctx, p[1], who.equals("user"));
                                out.add(st + "|" + p[0] + "|" + details + "|" + ready + " => " + r.statusCode() + "|members=" + members(ctx, p[2]) + "|payCalled=" + (payCalls > 0) + "|body=" + r.body());
                            }
                    }
                    // 화면에 없는 경우: never와 always에서 로그인한 요청
                    if (!show.equals("when-authorized")) {
                        pay = "DOWN";
                        for (String[] p : PATHS) { HttpResponse<String> r = get(ctx, p[1], true); out.add("# extra 로그인한 요청, show-details=" + show + ", readiness에 pay=" + ready + ", pay=DOWN, " + p[1] + " => " + r.statusCode() + "|body=" + r.body()); }
                    }
                    // 화면에 없는 경우: 구성 요소 하나만 묻는 주소
                    pay = "DOWN";
                    HttpResponse<String> one = get(ctx, "/actuator/health/pay", false);
                    out.add("# extra show-details=" + show + ", readiness에 pay=" + ready + ", pay=DOWN, /actuator/health/pay => " + one.statusCode() + "|body=" + one.body());
                }
            }

        // 아래는 화면의 조합에는 없고, 설명 글의 근거로만 쓰는 실행
        // 1. 아무 설정도 하지 않았을 때: 웹에 열려 있는 엔드포인트, 자동으로 붙는 구성 요소, 프로브 그룹
        try (ConfigurableApplicationContext ctx = start()) {
            HttpResponse<String> root = get(ctx, "/actuator", false);
            out.add("# extra 설정 없음: /actuator => " + root.statusCode() + "|links=" + links(root.body()));
            out.add("# extra 설정 없음: 등록된 구성 요소=" + registered(ctx) + "|liveness=" + members(ctx, "liveness") + "|readiness=" + members(ctx, "readiness"));
            out.add("# extra 설정 없음: " + code(ctx, "/actuator/health") + " " + code(ctx, "/actuator/health/liveness") + " " + code(ctx, "/actuator/health/readiness") + " " + code(ctx, "/actuator/env") + " " + code(ctx, "/actuator/beans") + " " + code(ctx, "/actuator/info") + " " + code(ctx, "/actuator/shutdown"));
            out.add("# extra 설정 없음: /actuator/health body=" + get(ctx, "/actuator/health", false).body());
            out.add("# extra 설정 없음: exposure.include=" + ctx.getEnvironment().getProperty("management.endpoints.web.exposure.include") + " (환경에 값이 없으면 null, 기본값은 라이브러리 안에 있다)");
        }
        // 2. 노출(exposure)과 접근(access)
        try (ConfigurableApplicationContext ctx = start("--management.endpoints.web.exposure.include=*")) {
            out.add("# extra exposure.include=*: links=" + links(get(ctx, "/actuator", false).body()));
            out.add("# extra exposure.include=*: " + code(ctx, "/actuator/health") + " " + code(ctx, "/actuator/env") + " " + code(ctx, "/actuator/beans") + " " + code(ctx, "/actuator/shutdown") + " (shutdown은 GET으로만 물어봄. 주소가 있으면 405, 없으면 404)");
        }
        try (ConfigurableApplicationContext ctx = start("--management.endpoints.web.exposure.include=*", "--management.endpoint.env.access=none")) {
            out.add("# extra exposure.include=* + endpoint.env.access=none: " + code(ctx, "/actuator/env") + " " + code(ctx, "/actuator/beans"));
        }
        try (ConfigurableApplicationContext ctx = start("--management.endpoints.web.exposure.include=env")) {
            out.add("# extra exposure.include=env: " + code(ctx, "/actuator/health") + " " + code(ctx, "/actuator/env") + "|links=" + links(get(ctx, "/actuator", false).body()));
        }
        try (ConfigurableApplicationContext ctx = start("--management.endpoint.shutdown.access=unrestricted")) {
            out.add("# extra endpoint.shutdown.access=unrestricted, 노출은 기본값: " + code(ctx, "/actuator/shutdown") + " (GET)");
        }
        try (ConfigurableApplicationContext ctx = start("--management.endpoint.shutdown.access=unrestricted", "--management.endpoints.web.exposure.include=health,shutdown")) {
            out.add("# extra endpoint.shutdown.access=unrestricted + exposure.include=health,shutdown: " + code(ctx, "/actuator/shutdown") + " (GET. POST는 보내지 않음)");
        }
        // 3. 프로브 그룹을 끄면
        try (ConfigurableApplicationContext ctx = start(OFF, PAY, "--management.endpoint.health.probes.enabled=false", "--management.endpoint.health.show-details=always")) {
            pay = "DOWN";
            out.add("# extra probes.enabled=false: 등록된 구성 요소=" + registered(ctx) + "|" + code(ctx, "/actuator/health") + " " + code(ctx, "/actuator/health/liveness") + " " + code(ctx, "/actuator/health/readiness") + "|body=" + get(ctx, "/actuator/health", false).body());
        }
        // 4. liveness 그룹에 pay를 넣으면
        try (ConfigurableApplicationContext ctx = start(OFF, PAY, "--management.endpoint.health.group.liveness.include=livenessState,pay", "--management.endpoint.health.show-details=always")) {
            pay = "DOWN";
            HttpResponse<String> r = get(ctx, "/actuator/health/liveness", false);
            out.add("# extra liveness.include=livenessState,pay, pay=DOWN: /actuator/health/liveness => " + r.statusCode() + "|body=" + r.body());
        }
        // 5. 상태의 우선순위: 구성 요소를 pay와 stock 둘만 두고(프로브 그룹도 끔) 열여섯 쌍을 모두 묻는다
        try (ConfigurableApplicationContext ctx = start(OFF, PAY, "--lab.stock=true", "--management.endpoint.health.probes.enabled=false")) {
            out.add("# extra 우선순위: 등록된 구성 요소=" + registered(ctx) + ", status.order=" + ctx.getEnvironment().getProperty("management.endpoint.health.status.order") + " (환경에 값이 없으면 null)");
            for (String a : STATUSES)
                for (String b : STATUSES) {
                    pay = a; stock = b;
                    HttpResponse<String> r = get(ctx, "/actuator/health", false);
                    out.add("# extra 우선순위 pay=" + a + ", stock=" + b + " => " + r.statusCode() + "|body=" + r.body());
                }
        }
        Files.write(Path.of(args[0]), out, StandardCharsets.UTF_8);
        System.out.println(out.get(0) + " | " + out.stream().filter(l -> !l.startsWith("#")).count() + " combos");
    }
}

// 화면의 PayHealthIndicator와 같은 모양. 답할 상태만 실행 중에 바꿀 수 있게 했다.
class PayHealthIndicator implements HealthIndicator {
    @Override public Health health() {
        ActuatorProbe.payCalls++;
        return ActuatorProbe.answer(ActuatorProbe.pay, "pay.example");
    }
}

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
import java.util.concurrent.atomic.AtomicInteger;
import java.util.function.Supplier;
import org.springframework.aop.support.AopUtils;
import org.springframework.boot.Banner;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.SpringBootConfiguration;
import org.springframework.boot.autoconfigure.EnableAutoConfiguration;
import org.springframework.context.ConfigurableApplicationContext;
import org.springframework.context.annotation.AnnotationConfigApplicationContext;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.access.prepost.PostAuthorize;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.authorization.AuthorizationEventPublisher;
import org.springframework.security.authorization.AuthorizationResult;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.SpringSecurityCoreVersion;
import org.springframework.security.core.authority.AuthorityUtils;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.provisioning.InMemoryUserDetailsManager;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

// "메서드 보안" 실습의 대조용 실행. 조합의 대조는 스프링 컨텍스트만 띄우고 서비스 빈의 메서드를 직접 불러서 한다(외부 요청 없음).
// 끝에 참고용으로 작은 서버를 127.0.0.1에 띄워, 웹 요청 중에 거부되면 403이 나가는지만 따로 확인한다.
//   enable : 설정 클래스에 @EnableMethodSecurity가 있는가
//   m      : role(deleteAll, hasRole('ADMIN')) | arg(ordersOf("kim"), #owner == authentication.name) | post(findOrder(1), returnObject.owner == authentication.name)
//   who    : kim(ROLE_USER) | lee(ROLE_USER) | admin(park, ROLE_ADMIN)
//   call   : ext(다른 빈에서 직접 부름) | self(같은 클래스의 애너테이션 없는 메서드를 거쳐 부름)
// 권한 검사가 실제로 실행됐는지는 AuthorizationEventPublisher 빈으로 센다(통과든 거부든 검사 한 번에 한 번 불린다).
public class MethodSecProbe {
    public record Order(long id, String owner, String item) { }

    static final AtomicInteger bodyRuns = new AtomicInteger(), checks = new AtomicInteger(), denies = new AtomicInteger();

    public static class OrderService {
        @PreAuthorize("hasRole('ADMIN')")                              // 메서드를 실행하기 전에 확인
        public String deleteAll() {
            bodyRuns.incrementAndGet();
            return "모두 삭제함";
        }

        @PreAuthorize("#owner == authentication.name")                 // 인자와 로그인한 사용자를 비교
        public String ordersOf(String owner) {
            bodyRuns.incrementAndGet();
            return owner + "의 주문 목록";
        }

        @PostAuthorize("returnObject.owner == authentication.name")    // 돌려줄 값을 보고 확인
        public Order findOrder(long id) {
            bodyRuns.incrementAndGet();
            return new Order(id, "kim", "키보드");                       // 주문 1번의 주인은 kim
        }

        // 같은 클래스 안에서 부르는, 애너테이션이 없는 메서드들
        public String nightlyCleanUp() { return deleteAll(); }          // this.deleteAll()
        public String summary(String owner) { return ordersOf(owner); } // this.ordersOf(owner)
        public Order receipt(long id) { return findOrder(id); }         // this.findOrder(id)
    }

    // 다른 빈(컨트롤러 역할): 서비스를 주입받아 부른다
    public static class OrderController {
        final OrderService orderService;
        OrderController(OrderService orderService) { this.orderService = orderService; }
        Object call(String m, String call) {
            boolean ext = call.equals("ext");
            if (m.equals("role")) return ext ? orderService.deleteAll() : orderService.nightlyCleanUp();
            if (m.equals("arg")) return ext ? orderService.ordersOf("kim") : orderService.summary("kim");
            return ext ? orderService.findOrder(1) : orderService.receipt(1);
        }
    }

    static class Beans {
        @Bean OrderService orderService() { return new OrderService(); }
        @Bean OrderController orderController(OrderService s) { return new OrderController(s); }
        @Bean AuthorizationEventPublisher countingPublisher() {
            return new AuthorizationEventPublisher() {
                @Override public <T> void publishAuthorizationEvent(Supplier<Authentication> authentication, T object, AuthorizationResult result) {
                    checks.incrementAndGet();
                    if (result != null && !result.isGranted()) denies.incrementAndGet();
                }
            };
        }
    }
    @Configuration @EnableMethodSecurity static class On extends Beans { }
    @Configuration static class Off extends Beans { }

    // 참고용: 웹 요청을 처리하는 중에 메서드 보안이 거부하면 어떤 응답이 나가는지 확인하는 작은 서버 (127.0.0.1에서만 연다)
    // Web은 @EnableMethodSecurity를 붙인 스프링 부트 애플리케이션, WebOff는 붙이지 않은 것이다(스프링 부트가 대신 켜 주는지 확인).
    public static class WebBase {
        static final String PW = "lab-only-pw-3";       // 이 시험만을 위한 값
        @Bean static OrderService orderService() { return new OrderService(); }   // static: 이 설정 클래스 자신이 주입받으므로 순환을 피한다
        @Bean UserDetailsService users() {
            return new InMemoryUserDetailsManager(User.withUsername("kim").password("{noop}" + PW).roles("USER").build(), User.withUsername("park").password("{noop}" + PW).roles("ADMIN").build());
        }
        @Bean SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
            return http.authorizeHttpRequests(a -> a.anyRequest().authenticated()).httpBasic(Customizer.withDefaults()).build();
        }
        @org.springframework.beans.factory.annotation.Autowired OrderService orderService;
        @GetMapping("/delete-all") public String deleteAll() { return orderService.deleteAll(); }
    }
    @SpringBootConfiguration @EnableAutoConfiguration @EnableMethodSecurity @RestController
    public static class Web extends WebBase { }
    @SpringBootConfiguration @EnableAutoConfiguration @RestController
    public static class WebOff extends WebBase { }

    static void login(String who) {
        if (who == null) { SecurityContextHolder.clearContext(); return; }
        String name = who.equals("admin") ? "park" : who, role = who.equals("admin") ? "ROLE_ADMIN" : "ROLE_USER";
        SecurityContextHolder.getContext().setAuthentication(new UsernamePasswordAuthenticationToken(name, "n/a", AuthorityUtils.createAuthorityList(role)));
    }

    static String run(OrderController controller, String m, String call) {
        bodyRuns.set(0); checks.set(0); denies.set(0);
        String got; boolean denied = false;
        try {
            Object r = controller.call(m, call);
            got = r instanceof Order o ? "Order(" + o.id() + "," + o.owner() + ")" : String.valueOf(r);
        } catch (RuntimeException e) {
            got = "EX:" + e.getClass().getSimpleName(); denied = e instanceof AccessDeniedException;
        }
        return "checks=" + checks.get() + "|denies=" + denies.get() + "|body=" + bodyRuns.get() + "|got=" + got + "|accessDenied=" + denied;
    }

    public static void main(String[] args) throws Exception {
        List<String> out = new ArrayList<>();
        boolean names = OrderService.class.getMethod("ordersOf", String.class).getParameters()[0].isNamePresent();
        out.add("# spring security " + SpringSecurityCoreVersion.getVersion() + " | java " + System.getProperty("java.version") + " | 컴파일할 때 -parameters " + (names ? "있음" : "없음"));
        for (boolean enable : new boolean[] { true, false }) {
            try (AnnotationConfigApplicationContext ctx = new AnnotationConfigApplicationContext(enable ? On.class : Off.class)) {
                OrderController controller = ctx.getBean(OrderController.class);
                boolean proxy = AopUtils.isAopProxy(ctx.getBean(OrderService.class));
                for (String m : new String[] { "role", "arg", "post" })
                    for (String who : new String[] { "kim", "lee", "admin" })
                        for (String call : new String[] { "ext", "self" }) {
                            login(who);
                            out.add(enable + "|" + m + "|" + who + "|" + call + " => " + run(controller, m, call) + "|proxy=" + proxy);
                        }
                // 참고: 로그인 정보가 전혀 없는 상태에서 부르면
                login(null);
                out.add("# 참고 enable=" + enable + " 로그인 정보 없이 deleteAll() => " + run(controller, "role", "ext"));
                SecurityContextHolder.clearContext();
            }
        }
        // 참고: 웹 요청에서 거부되면 응답 코드는 무엇인가
        for (Class<?> config : new Class<?>[] { Web.class, WebOff.class }) {
            SpringApplication app = new SpringApplication(config);
            app.setBannerMode(Banner.Mode.OFF); app.setLogStartupInfo(false);
            try (ConfigurableApplicationContext ctx = app.run("--server.port=0", "--server.address=127.0.0.1", "--logging.level.root=" + System.getProperty("lab.log", "OFF"))) {
                String base = "http://127.0.0.1:" + ctx.getEnvironment().getProperty("local.server.port");
                HttpClient client = HttpClient.newHttpClient();
                for (String who : new String[] { "kim", "park" }) {
                    bodyRuns.set(0);
                    HttpRequest req = HttpRequest.newBuilder(URI.create(base + "/delete-all")).header("Authorization", "Basic " + Base64.getEncoder().encodeToString((who + ":" + WebBase.PW).getBytes(StandardCharsets.UTF_8))).GET().build();
                    HttpResponse<String> r = client.send(req, HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8));
                    out.add("# 참고 웹 요청(스프링 부트, @EnableMethodSecurity " + (config == Web.class ? "있음" : "없음") + ") GET /delete-all → @PreAuthorize(\"hasRole('ADMIN')\")가 붙은 deleteAll() 호출, " + who + " => " + r.statusCode() + "|body=" + bodyRuns.get());
                }
            }
        }
        Files.write(Path.of(args[0]), out, StandardCharsets.UTF_8);
        out.forEach(System.out::println);
    }
}

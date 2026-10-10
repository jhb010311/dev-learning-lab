import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServlet;
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
import org.apache.catalina.Context;
import org.apache.catalina.Wrapper;
import org.apache.catalina.startup.Tomcat;
import org.springframework.boot.Banner;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.SpringBootConfiguration;
import org.springframework.boot.SpringBootVersion;
import org.springframework.boot.autoconfigure.EnableAutoConfiguration;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.ConfigurableApplicationContext;
import org.springframework.context.annotation.Bean;
import org.springframework.http.HttpStatus;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.DispatcherServlet;

// "서블릿" 실습을 실제 톰캣(내장 톰캣 11)에서 확인한다.
//   plain  : 스프링 없이 톰캣에 HelloServlet을 직접 등록한다.
//   spring : 스프링 부트가 등록하는 DispatcherServlet을, 생성·초기화·요청 처리 횟수를 세는 하위 클래스로 바꿔 끼운다.
// 조합마다 서버를 새로 띄워, 객체가 언제 만들어지고 init이 언제 불리는지를 서버 시작 직후와 요청 뒤에 각각 적는다.
@SpringBootConfiguration
@EnableAutoConfiguration
public class ServletProbe {
    static final AtomicInteger made = new AtomicInteger(), inits = new AtomicInteger(), svc = new AtomicInteger(), destroyed = new AtomicInteger();
    static void reset() { made.set(0); inits.set(0); svc.set(0); destroyed.set(0); }

    public static class HelloGetOnly extends HttpServlet {
        public HelloGetOnly() { made.incrementAndGet(); }
        @Override public void init() { inits.incrementAndGet(); }
        @Override protected void service(HttpServletRequest req, HttpServletResponse resp) throws ServletException, IOException { svc.incrementAndGet(); super.service(req, resp); }
        @Override protected void doGet(HttpServletRequest req, HttpServletResponse resp) throws IOException {
            String name = req.getParameter("name");
            resp.setHeader("X-By", "HelloServlet.doGet"); resp.setContentType("text/plain; charset=UTF-8"); resp.getWriter().write("안녕하세요, " + name);
        }
        @Override public void destroy() { destroyed.incrementAndGet(); }
    }
    public static class HelloBoth extends HelloGetOnly {
        @Override protected void doPost(HttpServletRequest req, HttpServletResponse resp) throws IOException { resp.setHeader("X-By", "HelloServlet.doPost"); resp.setStatus(201); resp.getWriter().write("등록했습니다"); }
    }

    static class CountingDispatcherServlet extends DispatcherServlet {
        CountingDispatcherServlet() { made.incrementAndGet(); }
        @Override protected void initFrameworkServlet() { inits.incrementAndGet(); }
        @Override protected void service(HttpServletRequest req, HttpServletResponse resp) throws ServletException, IOException { svc.incrementAndGet(); super.service(req, resp); }
        @Override public void destroy() { destroyed.incrementAndGet(); super.destroy(); }
    }
    @Bean(name = "dispatcherServlet") DispatcherServlet dispatcherServlet() { return new CountingDispatcherServlet(); }
    @Bean SecurityFilterChain open(HttpSecurity http) throws Exception { return http.csrf(c -> c.disable()).authorizeHttpRequests(a -> a.anyRequest().permitAll()).build(); }
    @Bean @ConditionalOnProperty(name = "lab.impl", havingValue = "get") HelloGetController getOnly() { return new HelloGetController(); }
    @Bean @ConditionalOnProperty(name = "lab.impl", havingValue = "both") HelloBothController both() { return new HelloBothController(); }

    static final HttpClient client = HttpClient.newHttpClient();
    static HttpResponse<String> send(int port, String req) throws Exception {
        HttpRequest.Builder b = HttpRequest.newBuilder(URI.create("http://127.0.0.1:" + port + (req.equals("none") ? "/nothing" : req.equals("get") ? "/hello?name=chulsu" : "/hello")));
        if (req.equals("post")) b.POST(HttpRequest.BodyPublishers.noBody()); else b.GET();
        return client.send(b.build(), HttpResponse.BodyHandlers.ofString());
    }

    public static void main(String[] args) throws Exception {
        java.util.logging.LogManager.getLogManager().reset();
        List<String> out = new ArrayList<>();
        out.add("# tomcat " + org.apache.catalina.util.ServerInfo.getServerNumber() + " | spring boot " + SpringBootVersion.getVersion());
        Path base = Files.createTempDirectory("lab-tomcat");
        for (String impl : new String[] { "get", "both" })
            for (boolean startup : new boolean[] { false, true })
                for (String req : new String[] { "get", "post", "none" })
                    for (int n : new int[] { 1, 2, 3 }) {
                        reset();
                        Tomcat tomcat = new Tomcat();
                        tomcat.setBaseDir(base.toString()); tomcat.setPort(0);
                        Context ctx = tomcat.addContext("", base.toString());
                        Wrapper w = Tomcat.addServlet(ctx, "hello", (impl.equals("get") ? HelloGetOnly.class : HelloBoth.class).getName());
                        if (startup) w.setLoadOnStartup(1);
                        ctx.addServletMappingDecoded("/hello", "hello");
                        Tomcat.addServlet(ctx, "default", "org.apache.catalina.servlets.DefaultServlet");   // 톰캣의 기본 서블릿: 담당이 없는 주소를 맡는다
                        ctx.addServletMappingDecoded("/", "default");
                        tomcat.getConnector(); tomcat.start();
                        int port = tomcat.getConnector().getLocalPort(), madeAtStart = made.get(), initAtStart = inits.get(), status = 0; String by = "-";
                        for (int i = 0; i < n; i++) { HttpResponse<String> r = send(port, req); status = r.statusCode(); by = r.headers().firstValue("X-By").orElse("-"); }
                        int m = made.get(), in = inits.get(), s = svc.get();
                        tomcat.stop(); tomcat.destroy();
                        out.add("plain|" + req + "|" + impl + "|" + n + "|" + startup + " => " + status + "|madeAtStart=" + madeAtStart + "|initAtStart=" + initAtStart + "|made=" + m + "|init=" + in + "|service=" + s + "|destroy=" + destroyed.get() + "|by=" + by);
                    }
        for (String impl : new String[] { "get", "both" })
            for (boolean startup : new boolean[] { false, true })
                for (String req : new String[] { "get", "post", "none" }) {
                    int n = 2; reset();
                    SpringApplication app = new SpringApplication(ServletProbe.class);
                    app.setBannerMode(Banner.Mode.OFF); app.setLogStartupInfo(false);
                    List<String> a = new ArrayList<>(List.of("--server.port=0", "--lab.impl=" + impl, "--logging.level.root=OFF"));
                    if (startup) a.add("--spring.mvc.servlet.load-on-startup=1");
                    int madeAtStart, initAtStart, m, in, s, status = 0; String by = "-";
                    try (ConfigurableApplicationContext ctx = app.run(a.toArray(new String[0]))) {
                        int port = Integer.parseInt(ctx.getEnvironment().getProperty("local.server.port"));
                        madeAtStart = made.get(); initAtStart = inits.get();
                        for (int i = 0; i < n; i++) { HttpResponse<String> r = send(port, req); status = r.statusCode(); by = r.headers().firstValue("X-By").orElse("-"); }
                        m = made.get(); in = inits.get(); s = svc.get();
                    }
                    out.add("spring|" + req + "|" + impl + "|" + n + "|" + startup + " => " + status + "|madeAtStart=" + madeAtStart + "|initAtStart=" + initAtStart + "|made=" + m + "|init=" + in + "|service=" + s + "|destroy=" + destroyed.get() + "|by=" + by);
                }
        Files.write(Path.of(args[0]), out, StandardCharsets.UTF_8);
        System.out.println(out.get(0) + " | " + (out.size() - 1) + " combos");
    }
}

@RestController
class HelloGetController {
    @GetMapping("/hello") public org.springframework.http.ResponseEntity<String> hello(@RequestParam String name) { return org.springframework.http.ResponseEntity.ok().header("X-By", "HelloController.hello").body("안녕하세요, " + name); }
}
@RestController
class HelloBothController {
    @GetMapping("/hello") public org.springframework.http.ResponseEntity<String> hello(@RequestParam String name) { return org.springframework.http.ResponseEntity.ok().header("X-By", "HelloController.hello").body("안녕하세요, " + name); }
    @PostMapping("/hello") public org.springframework.http.ResponseEntity<String> create() { return org.springframework.http.ResponseEntity.status(HttpStatus.CREATED).header("X-By", "HelloController.create").body("등록했습니다"); }
}

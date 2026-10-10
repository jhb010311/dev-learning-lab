import jakarta.servlet.DispatcherType;
import jakarta.servlet.Filter;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import org.springframework.boot.Banner;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.SpringBootConfiguration;
import org.springframework.boot.SpringBootVersion;
import org.springframework.boot.autoconfigure.EnableAutoConfiguration;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.boot.web.servlet.FilterRegistrationBean;
import org.springframework.context.ConfigurableApplicationContext;
import org.springframework.context.annotation.Bean;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.servlet.HandlerInterceptor;
import org.springframework.web.servlet.ModelAndView;
import org.springframework.web.servlet.View;
import org.springframework.web.servlet.config.annotation.InterceptorRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

// "MVC 요청 흐름" 실습의 조합을 실제 스프링 부트 서버(내장 톰캣 + DispatcherServlet)에 HTTP 요청을 보내 확인한다.
// 필터 하나, 인터셉터 하나, @RestController와 @Controller 하나씩, 그리고 켜고 끌 수 있는 @ExceptionHandler를 둔다.
// 뷰는 템플릿 엔진 대신 같은 이름의 View 빈으로 그린다(뷰 이름 → 뷰 리졸버 → 뷰 렌더링이라는 경로는 같다).
@SpringBootConfiguration
@EnableAutoConfiguration
public class MvcProbe {
    static volatile boolean ctrl, post, after;

    @Bean SecurityFilterChain open(HttpSecurity http) throws Exception { return http.csrf(c -> c.disable()).authorizeHttpRequests(a -> a.anyRequest().permitAll()).build(); }

    @Bean FilterRegistrationBean<Filter> authFilter() {
        Filter f = (req, res, chain) -> {
            HttpServletRequest r = (HttpServletRequest) req; HttpServletResponse s = (HttpServletResponse) res;
            if ("filter".equals(r.getHeader("X-What"))) { s.setHeader("X-By", "filter"); s.setStatus(401); return; }   // 다음으로 넘기지 않는다
            chain.doFilter(req, res);
        };
        return new FilterRegistrationBean<>(f);
    }
    @Bean WebMvcConfigurer interceptors() {
        return new WebMvcConfigurer() {
            @Override public void addInterceptors(InterceptorRegistry registry) {
                registry.addInterceptor(new HandlerInterceptor() {
                    @Override public boolean preHandle(HttpServletRequest r, HttpServletResponse s, Object h) {
                        if (r.getDispatcherType() == DispatcherType.REQUEST && "pre".equals(r.getHeader("X-What"))) { s.setHeader("X-By", "interceptor"); s.setStatus(401); return false; }
                        return true;
                    }
                    @Override public void postHandle(HttpServletRequest r, HttpServletResponse s, Object h, ModelAndView mv) { if (r.getDispatcherType() == DispatcherType.REQUEST) post = true; }
                    @Override public void afterCompletion(HttpServletRequest r, HttpServletResponse s, Object h, Exception ex) { if (r.getDispatcherType() == DispatcherType.REQUEST) after = true; }
                });
            }
        };
    }
    @RestController public static class Api {
        @GetMapping("/api/order") public Map<String, Object> order(@RequestHeader(value = "X-What", required = false) String what) {
            ctrl = true; if ("ex".equals(what)) throw new IllegalStateException("이미 처리된 주문");
            return Map.of("id", 1, "by", "controller");
        }
    }
    @Controller public static class Page {
        @GetMapping("/page/order") public String order(@RequestHeader(value = "X-What", required = false) String what) {
            ctrl = true; if ("ex".equals(what)) throw new IllegalStateException("이미 처리된 주문");
            return "orderView";
        }
    }
    // Api와 Page는 설정 클래스 안의 클래스라 스프링이 알아서 빈으로 등록한다
    @Bean @ConditionalOnProperty(name = "lab.advice", havingValue = "true") MvcAdvice advice() { return new MvcAdvice(); }
    @Bean("orderView") View orderView() {
        return new View() {
            @Override public String getContentType() { return "text/html"; }   // 뷰가 만들 수 있는 형식을 알려야 뷰 리졸버가 고른다
            @Override public void render(Map<String, ?> model, HttpServletRequest req, HttpServletResponse res) throws Exception { res.setContentType("text/html;charset=UTF-8"); res.setHeader("X-By", "view"); res.getWriter().write("<h1>order</h1>"); }
        };
    }

    // 뷰 이름 "orderView"를 위의 View 빈으로 이어 주는 뷰 리졸버
    @Bean org.springframework.web.servlet.ViewResolver labViewResolver(View orderView) {
        return new LabResolver(orderView);
    }
    static class LabResolver implements org.springframework.web.servlet.ViewResolver, org.springframework.core.Ordered {
        private final View v; LabResolver(View v) { this.v = v; }
        @Override public View resolveViewName(String name, java.util.Locale locale) { return "orderView".equals(name) ? v : null; }
        @Override public int getOrder() { return 0; }
    }

    public static void main(String[] args) throws Exception {
        List<String> out = new ArrayList<>();
        out.add("# spring boot " + SpringBootVersion.getVersion());
        HttpClient client = HttpClient.newHttpClient();
        for (boolean advice : new boolean[] { false, true }) {
            SpringApplication app = new SpringApplication(MvcProbe.class);
            app.setBannerMode(Banner.Mode.OFF); app.setLogStartupInfo(false);
            try (ConfigurableApplicationContext ctx = app.run("--server.port=0", "--lab.advice=" + advice, "--logging.level.root=OFF")) {
                String port = ctx.getEnvironment().getProperty("local.server.port");
                for (String kind : new String[] { "rest", "view" })
                    for (String what : new String[] { "none", "filter", "pre", "ex" }) {
                        ctrl = post = after = false;
                        HttpRequest.Builder rb = HttpRequest.newBuilder(URI.create("http://127.0.0.1:" + port + (kind.equals("rest") ? "/api/order" : "/page/order"))).GET().header("Accept", kind.equals("rest") ? "application/json" : "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8");   // 화면 요청은 브라우저가 보내는 Accept와 같게
                        if (!what.equals("none")) rb.header("X-What", what);
                        HttpResponse<String> r = client.send(rb.build(), HttpResponse.BodyHandlers.ofString());
                        String body = r.body().replaceAll("\\s+", " ");
                        out.add(kind + "|" + what + "|" + advice + " => " + r.statusCode() + "|ctrl=" + ctrl + "|post=" + post + "|after=" + after + "|by=" + r.headers().firstValue("X-By").orElse("-") + "|type=" + r.headers().firstValue("Content-Type").orElse("-") + "|body=" + (body.length() > 70 ? body.substring(0, 70) : body));
                    }
            }
        }
        Files.write(Path.of(args[0]), out, StandardCharsets.UTF_8);
        out.forEach(System.out::println);
    }
}

// 켜고 끌 수 있도록 설정 클래스 밖에 둔다 (lab.advice=true일 때만 빈으로 등록)
@RestControllerAdvice
class MvcAdvice {
    @ExceptionHandler(IllegalStateException.class) public ResponseEntity<Map<String, Object>> conflict(IllegalStateException e) {
        return ResponseEntity.status(HttpStatus.CONFLICT).header("X-By", "advice").body(Map.of("error", "CONFLICT"));
    }
}

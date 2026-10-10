import jakarta.servlet.DispatcherType;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.lang.reflect.Type;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import org.springframework.boot.Banner;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.SpringBootConfiguration;
import org.springframework.boot.SpringBootVersion;
import org.springframework.boot.autoconfigure.EnableAutoConfiguration;
import org.springframework.context.ConfigurableApplicationContext;
import org.springframework.context.annotation.Bean;
import org.springframework.core.MethodParameter;
import org.springframework.core.Ordered;
import org.springframework.core.SpringVersion;
import org.springframework.http.HttpInputMessage;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageConverter;
import org.springframework.http.server.ServerHttpRequest;
import org.springframework.http.server.ServerHttpResponse;
import org.springframework.http.server.ServletServerHttpRequest;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.ControllerAdvice;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.ResponseBody;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.HandlerExceptionResolver;
import org.springframework.web.servlet.ModelAndView;
import org.springframework.web.servlet.View;
import org.springframework.web.servlet.ViewResolver;
import org.springframework.web.servlet.mvc.method.annotation.RequestBodyAdviceAdapter;
import org.springframework.web.servlet.mvc.method.annotation.ResponseBodyAdvice;

// "REST API와 메시지 컨버터" 실습의 조합을 실제 스프링 부트 서버(내장 톰캣)에 HTTP 요청을 보내 확인한다.
// 컨트롤러 네 가지(객체 반환, ResponseEntity 반환, 문자열 반환, @Controller의 문자열 반환)에 요청 네 가지를 보내
// 상태 코드, 컨트롤러 실행 여부, 응답의 Content-Type과 Location, 본문을 읽은 컨버터와 쓴 컨버터, 스프링이 던진 예외를 적는다.
// 컨트롤러마다 주소 앞에 /obj, /entity 같은 구분을 붙였다(화면에서는 모두 /orders).
// 화면(뷰)은 템플릿 엔진 대신 같은 이름의 View 객체로 그린다(뷰 이름 → 뷰 리졸버 → 뷰가 HTML을 씀이라는 경로는 같다).
@SpringBootConfiguration
@EnableAutoConfiguration
public class MsgConvProbe {
    static volatile boolean ctrl;
    static volatile String ex, readBy, wroteBy, view;

    public record OrderRequest(String item, int qty) { }
    public record OrderResponse(long id, String item, int qty) { }

    @Bean SecurityFilterChain open(HttpSecurity http) throws Exception { return http.csrf(c -> c.disable()).authorizeHttpRequests(a -> a.anyRequest().permitAll()).build(); }

    @Bean HandlerExceptionResolver recorder() { return new Recorder(); }
    static class Recorder implements HandlerExceptionResolver, Ordered {
        @Override public ModelAndView resolveException(HttpServletRequest req, HttpServletResponse res, Object handler, Exception e) {
            if (req.getDispatcherType() == DispatcherType.REQUEST) ex = e.getClass().getSimpleName();
            return null;
        }
        @Override public int getOrder() { return Ordered.HIGHEST_PRECEDENCE; }
    }

    // 요청 본문을 읽은 컨버터와 응답 본문을 쓴 컨버터의 이름을 적어 둔다 (/error로 넘어간 뒤의 것은 적지 않는다)
    @ControllerAdvice public static class ConverterWatcher extends RequestBodyAdviceAdapter implements ResponseBodyAdvice<Object> {
        @Override public boolean supports(MethodParameter p, Type t, Class<? extends HttpMessageConverter<?>> c) { return true; }
        @Override public Object afterBodyRead(Object body, HttpInputMessage in, MethodParameter p, Type t, Class<? extends HttpMessageConverter<?>> c) { readBy = c.getSimpleName(); return body; }
        @Override public boolean supports(MethodParameter returnType, Class<? extends HttpMessageConverter<?>> c) { return true; }
        @Override public Object beforeBodyWrite(Object body, MethodParameter returnType, MediaType type, Class<? extends HttpMessageConverter<?>> c, ServerHttpRequest req, ServerHttpResponse res) {
            if (req instanceof ServletServerHttpRequest s && s.getServletRequest().getDispatcherType() == DispatcherType.REQUEST) wroteBy = c.getSimpleName();
            return body;
        }
    }

    @RestController public static class ObjController {
        @PostMapping("/obj/orders") public OrderResponse create(@RequestBody OrderRequest req) { ctrl = true; return new OrderResponse(1, req.item(), req.qty()); }
    }
    // 화면의 조합에는 없고, 설명 글의 근거로만 쓴다: produces를 적어 두면 Accept가 맞지 않는 요청은 컨트롤러를 고르는 단계에서 걸러진다
    @RestController public static class ProducesController {
        @PostMapping(path = "/produces/orders", produces = "application/json") public OrderResponse create(@RequestBody OrderRequest req) { ctrl = true; return new OrderResponse(1, req.item(), req.qty()); }
    }
    @RestController public static class EntityController {
        @PostMapping("/entity/orders") public ResponseEntity<OrderResponse> create(@RequestBody OrderRequest req) {
            ctrl = true;
            return ResponseEntity.created(URI.create("/orders/1")).body(new OrderResponse(1, req.item(), req.qty()));
        }
    }
    @RestController public static class StrController {
        @PostMapping("/str/orders") public String create(@RequestBody OrderRequest req) { ctrl = true; return "orders/done"; }
    }
    @Controller public static class ViewController {
        @PostMapping("/view/orders") public String create(@RequestBody OrderRequest req) { ctrl = true; return "orders/done"; }
        // 아래는 화면의 조합에는 없고, 설명 글의 근거로만 쓴다
        @PostMapping("/noview/orders") public String noView(@RequestBody OrderRequest req) { ctrl = true; return "orders/nowhere"; }
        @PostMapping("/ctlbody/orders") @ResponseBody public String withResponseBody(@RequestBody OrderRequest req) { ctrl = true; return "orders/done"; }
        @PostMapping("/ctlentity/orders") public ResponseEntity<OrderResponse> entity(@RequestBody OrderRequest req) { ctrl = true; return ResponseEntity.created(URI.create("/orders/1")).body(new OrderResponse(1, req.item(), req.qty())); }
    }

    // 뷰 이름 "orders/done"에 해당하는 화면. 실제 프로젝트라면 templates/orders/done.html 같은 템플릿 파일이다.
    @Bean ViewResolver labViewResolver() { return new LabResolver(); }
    static class LabResolver implements ViewResolver, Ordered {
        private final View done = new View() {
            @Override public String getContentType() { return "text/html"; }
            @Override public void render(Map<String, ?> model, HttpServletRequest req, HttpServletResponse res) throws Exception {
                if (req.getDispatcherType() == DispatcherType.REQUEST) view = "orders/done";
                res.setContentType("text/html;charset=UTF-8"); res.getWriter().write("<h1>order done</h1>");
            }
        };
        @Override public View resolveViewName(String name, Locale locale) { return "orders/done".equals(name) ? done : null; }
        @Override public int getOrder() { return 0; }
    }

    static final String JSON = "{\"item\":\"book\",\"qty\":2}";
    static HttpRequest build(String port, String kind, String req) {
        HttpRequest.Builder b = HttpRequest.newBuilder(URI.create("http://127.0.0.1:" + port + "/" + kind + "/orders"));
        switch (req) {
            case "ok": return b.header("Content-Type", "application/json").header("Accept", "application/json").POST(HttpRequest.BodyPublishers.ofString(JSON)).build();
            case "xml": return b.header("Content-Type", "application/json").header("Accept", "application/xml").POST(HttpRequest.BodyPublishers.ofString(JSON)).build();
            case "text": return b.header("Content-Type", "text/plain").header("Accept", "application/json").POST(HttpRequest.BodyPublishers.ofString(JSON)).build();
            case "broken": return b.header("Content-Type", "application/json").header("Accept", "application/json").POST(HttpRequest.BodyPublishers.ofString("{\"item\":\"book\",\"qty\":")).build();
            // 아래는 화면의 조합에는 없는 요청
            case "noaccept": return b.header("Content-Type", "application/json").POST(HttpRequest.BodyPublishers.ofString(JSON)).build();
            case "html": return b.header("Content-Type", "application/json").header("Accept", "text/html").POST(HttpRequest.BodyPublishers.ofString(JSON)).build();
            case "noct": return b.header("Accept", "application/json").POST(HttpRequest.BodyPublishers.ofString(JSON)).build();
            default: throw new IllegalArgumentException(req);
        }
    }
    static String run(HttpClient client, String port, String kind, String req) throws Exception {
        ctrl = false; ex = readBy = wroteBy = view = "-";
        HttpResponse<String> r = client.send(build(port, kind, req), HttpResponse.BodyHandlers.ofString());
        String body = r.body().replaceAll("\\s+", " ");
        return kind + "|" + req + " => " + r.statusCode() + "|ctrl=" + ctrl + "|type=" + r.headers().firstValue("Content-Type").orElse("-") + "|location=" + r.headers().firstValue("Location").orElse("-")
            + "|read=" + readBy + "|wrote=" + wroteBy + "|view=" + view + "|ex=" + ex + "|body=" + (body.length() > 60 ? body.substring(0, 60) : body);
    }

    public static void main(String[] args) throws Exception {
        List<String> out = new ArrayList<>();
        out.add("# spring boot " + SpringBootVersion.getVersion() + " | spring framework " + SpringVersion.getVersion());
        HttpClient client = HttpClient.newHttpClient();
        SpringApplication app = new SpringApplication(MsgConvProbe.class);
        app.setBannerMode(Banner.Mode.OFF); app.setLogStartupInfo(false);
        try (ConfigurableApplicationContext ctx = app.run("--server.port=0", "--logging.level.root=OFF")) {
            String port = ctx.getEnvironment().getProperty("local.server.port");
            for (String kind : new String[] { "obj", "entity", "str", "view" })
                for (String req : new String[] { "ok", "xml", "text", "broken" }) out.add(run(client, port, kind, req));
            for (String[] x : new String[][] { { "obj", "noaccept" }, { "str", "noaccept" }, { "view", "html" }, { "obj", "noct" }, { "noview", "ok" }, { "noview", "html" }, { "ctlbody", "ok" }, { "ctlentity", "ok" }, { "produces", "ok" }, { "produces", "xml" } })
                out.add("# extra " + run(client, port, x[0], x[1]));
        }
        Files.write(Path.of(args[0]), out, StandardCharsets.UTF_8);
        System.out.println(out.get(0) + " | " + out.stream().filter(l -> !l.startsWith("#")).count() + " combos");
    }
}

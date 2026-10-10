import jakarta.servlet.DispatcherType;
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
import org.springframework.boot.Banner;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.SpringBootConfiguration;
import org.springframework.boot.SpringBootVersion;
import org.springframework.boot.autoconfigure.EnableAutoConfiguration;
import org.springframework.context.ConfigurableApplicationContext;
import org.springframework.context.annotation.Bean;
import org.springframework.core.Ordered;
import org.springframework.core.SpringVersion;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.HandlerExceptionResolver;
import org.springframework.web.servlet.ModelAndView;

// "요청 매핑과 파라미터 바인딩" 실습의 조합을 실제 스프링 부트 서버(내장 톰캣)에 HTTP 요청을 보내 확인한다.
// 받는 방법 여섯 가지(@RequestParam 세 가지, @PathVariable, @ModelAttribute, @RequestBody)마다 컨트롤러를 하나씩 두고,
// 요청 여덟 가지를 보내 상태 코드, 컨트롤러 실행 여부, 파라미터에 들어간 값, 스프링이 던진 예외의 이름을 적는다.
// 받는 방법마다 주소 앞에 /param, /opt 같은 구분을 붙였다(화면에서는 모두 /orders). 컨트롤러 메서드는 GET용과 POST용을 따로 둔다.
@SpringBootConfiguration
@EnableAutoConfiguration
public class BindingProbe {
    static volatile boolean ctrl;
    static volatile String got, ex;

    // 화면의 OrderForm과 같은 모양: 필드 하나와 getter, setter
    public static class OrderForm {
        private int qty;
        public int getQty() { return qty; }
        public void setQty(int qty) { this.qty = qty; }
    }

    @Bean SecurityFilterChain open(HttpSecurity http) throws Exception { return http.csrf(c -> c.disable()).authorizeHttpRequests(a -> a.anyRequest().permitAll()).build(); }

    // 스프링이 요청을 거절할 때 던진 예외의 이름을 적어 둔다. 처리는 하지 않고(null) 기본 처리기에 넘긴다.
    @Bean HandlerExceptionResolver recorder() { return new Recorder(); }
    static class Recorder implements HandlerExceptionResolver, Ordered {
        @Override public ModelAndView resolveException(HttpServletRequest req, HttpServletResponse res, Object handler, Exception e) {
            if (req.getDispatcherType() == DispatcherType.REQUEST) ex = e.getClass().getSimpleName();
            return null;
        }
        @Override public int getOrder() { return Ordered.HIGHEST_PRECEDENCE; }
    }

    static String ran(Object v) { ctrl = true; got = String.valueOf(v); return "ok"; }

    @RestController public static class ParamController {
        @GetMapping("/param/orders") public String get(@RequestParam int qty) { return ran(qty); }
        @PostMapping("/param/orders") public String post(@RequestParam int qty) { return ran(qty); }
    }
    @RestController public static class OptController {
        @GetMapping("/opt/orders") public String get(@RequestParam(required = false) Integer qty) { return ran(qty); }
        @PostMapping("/opt/orders") public String post(@RequestParam(required = false) Integer qty) { return ran(qty); }
    }
    @RestController public static class DefController {
        @GetMapping("/def/orders") public String get(@RequestParam(defaultValue = "1") int qty) { return ran(qty); }
        @PostMapping("/def/orders") public String post(@RequestParam(defaultValue = "1") int qty) { return ran(qty); }
    }
    @RestController public static class PathController {
        @GetMapping("/path/orders/{qty}") public String get(@PathVariable int qty) { return ran(qty); }
        @PostMapping("/path/orders/{qty}") public String post(@PathVariable int qty) { return ran(qty); }
    }
    @RestController public static class ModelController {
        @GetMapping("/model/orders") public String get(@ModelAttribute OrderForm form) { return ran(form.getQty()); }
        @PostMapping("/model/orders") public String post(@ModelAttribute OrderForm form) { return ran(form.getQty()); }
    }
    @RestController public static class BodyController {
        @GetMapping("/body/orders") public String get(@RequestBody OrderForm form) { return ran(form.getQty()); }
        @PostMapping("/body/orders") public String post(@RequestBody OrderForm form) { return ran(form.getQty()); }
    }

    // 아래 둘은 화면의 조합에는 없고, 설명 글의 근거로만 쓴다
    @RestController public static class ExtraController {
        @GetMapping("/optint/orders") public String optInt(@RequestParam(required = false) int qty) { return ran(qty); }
        @GetMapping("/modelbr/orders") public String modelBr(@ModelAttribute OrderForm form, org.springframework.validation.BindingResult errors) { return ran(form.getQty() + ",hasErrors=" + errors.hasErrors()); }
    }

    static HttpRequest build(String port, String how, String req) {
        String base = "http://127.0.0.1:" + port + "/" + how + "/orders";
        switch (req) {
            case "q3": return HttpRequest.newBuilder(URI.create(base + "?qty=3")).GET().build();
            case "qabc": return HttpRequest.newBuilder(URI.create(base + "?qty=abc")).GET().build();
            case "none": return HttpRequest.newBuilder(URI.create(base)).GET().build();
            case "p3": return HttpRequest.newBuilder(URI.create(base + "/3")).GET().build();
            case "pabc": return HttpRequest.newBuilder(URI.create(base + "/abc")).GET().build();
            case "f3": return HttpRequest.newBuilder(URI.create(base)).header("Content-Type", "application/x-www-form-urlencoded").POST(HttpRequest.BodyPublishers.ofString("qty=3")).build();
            case "j3": return HttpRequest.newBuilder(URI.create(base)).header("Content-Type", "application/json").POST(HttpRequest.BodyPublishers.ofString("{\"qty\":3}")).build();
            case "jabc": return HttpRequest.newBuilder(URI.create(base)).header("Content-Type", "application/json").POST(HttpRequest.BodyPublishers.ofString("{\"qty\":\"abc\"}")).build();
            // 아래는 화면의 조합에는 없고, 설명 글의 근거로만 쓰는 요청
            case "qempty": return HttpRequest.newBuilder(URI.create(base + "?qty=")).GET().build();
            case "jempty": return HttpRequest.newBuilder(URI.create(base)).header("Content-Type", "application/json").POST(HttpRequest.BodyPublishers.ofString("{}")).build();
            default: throw new IllegalArgumentException(req);
        }
    }

    public static void main(String[] args) throws Exception {
        List<String> out = new ArrayList<>();
        out.add("# spring boot " + SpringBootVersion.getVersion() + " | spring framework " + SpringVersion.getVersion());
        HttpClient client = HttpClient.newHttpClient();
        SpringApplication app = new SpringApplication(BindingProbe.class);
        app.setBannerMode(Banner.Mode.OFF); app.setLogStartupInfo(false);
        try (ConfigurableApplicationContext ctx = app.run("--server.port=0", "--logging.level.root=OFF")) {
            String port = ctx.getEnvironment().getProperty("local.server.port");
            String[] hows = { "param", "opt", "def", "path", "model", "body" };
            for (String how : hows)
                for (String req : new String[] { "q3", "qabc", "none", "p3", "pabc", "f3", "j3", "jabc" }) {
                    ctrl = false; got = "-"; ex = "-";
                    HttpResponse<String> r = client.send(build(port, how, req), HttpResponse.BodyHandlers.ofString());
                    out.add(how + "|" + req + " => " + r.statusCode() + "|ctrl=" + ctrl + "|got=" + got + "|ex=" + ex);
                }
            for (String how : hows)
                for (String req : new String[] { "qempty", "jempty" }) {
                    ctrl = false; got = "-"; ex = "-";
                    HttpResponse<String> r = client.send(build(port, how, req), HttpResponse.BodyHandlers.ofString());
                    out.add("# extra " + how + "|" + req + " => " + r.statusCode() + "|ctrl=" + ctrl + "|got=" + got + "|ex=" + ex);
                }
            for (String[] x : new String[][] { { "optint", "none" }, { "modelbr", "qabc" } }) {
                ctrl = false; got = "-"; ex = "-";
                HttpResponse<String> r = client.send(build(port, x[0], x[1]), HttpResponse.BodyHandlers.ofString());
                out.add("# extra " + x[0] + "|" + x[1] + " => " + r.statusCode() + "|ctrl=" + ctrl + "|got=" + got + "|ex=" + ex);
            }
        }
        Files.write(Path.of(args[0]), out, StandardCharsets.UTF_8);
        System.out.println(out.get(0) + " | " + out.stream().filter(l -> !l.startsWith("#")).count() + " combos");
    }
}

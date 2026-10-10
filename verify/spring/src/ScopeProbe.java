import java.lang.reflect.Field;
import java.net.URI;
import java.net.URL;
import java.net.URLClassLoader;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import javax.tools.JavaCompiler;
import javax.tools.ToolProvider;
import org.springframework.boot.Banner;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.SpringBootVersion;
import org.springframework.context.ConfigurableApplicationContext;
import org.springframework.core.SpringVersion;
import org.springframework.core.io.DefaultResourceLoader;

// "빈 스코프" 실습의 아홉 가지 조합을 실제 스프링 부트 서버(내장 톰캣)로 띄우고 HTTP 요청을 두 번 보내 확인한다.
// 조합마다 화면에 보이는 것과 같은 소스(패키지 lab)를 만들어 그 자리에서 컴파일한다. 화면에 없는 것은 서버를 띄우는 App 클래스뿐이다.
// Cart는 생성자가 불릴 때마다 번호를 하나씩 받으므로, 응답에 적힌 번호로 어느 객체를 썼는지 알 수 있다.
// 한 줄의 뜻: scope|get => 기동 결과(실패면 예외 사슬)|기동 직후 Cart 수|요청 두 번 뒤 Cart 수|요청 1의 응답|요청 2의 응답|OrderService의 필드에 들어 있는 것|getBean(Cart.class)를 두 번 불렀을 때
public class ScopeProbe {
    static final String HEAD = "package lab;\nimport java.util.*;\nimport jakarta.annotation.*;\nimport org.springframework.beans.factory.ObjectProvider;\nimport org.springframework.context.annotation.*;\nimport org.springframework.stereotype.*;\nimport org.springframework.web.bind.annotation.*;\nimport org.springframework.web.context.annotation.*;\n";
    static final String APP = "package lab;\nimport org.springframework.boot.SpringBootConfiguration;\nimport org.springframework.boot.autoconfigure.EnableAutoConfiguration;\nimport org.springframework.context.annotation.*;\nimport org.springframework.security.config.annotation.web.builders.HttpSecurity;\nimport org.springframework.security.web.SecurityFilterChain;\n@SpringBootConfiguration\n@EnableAutoConfiguration\n@ComponentScan\npublic class App {\n    @Bean SecurityFilterChain open(HttpSecurity http) throws Exception { return http.csrf(c -> c.disable()).authorizeHttpRequests(a -> a.anyRequest().permitAll()).build(); }\n}\n";
    static final String CONTROLLER = HEAD + "@RestController\nclass OrderController {\n    private final OrderService orderService;\n    OrderController(OrderService orderService) {\n        this.orderService = orderService;\n    }\n    @GetMapping(\"/order\")\n    String order() {\n        int first = orderService.cartNo();\n        int second = orderService.cartNo();\n        return first + \",\" + second;\n    }\n}\n";

    static String scopeLine(String scope, String get) {
        if (get.equals("proxy")) return "@Scope(value = \"" + scope + "\", proxyMode = ScopedProxyMode.TARGET_CLASS)\n";
        return scope.equals("singleton") ? "" : "@Scope(\"" + scope + "\")\n";
    }
    static String cart(String scopeLine, String more) {
        return HEAD + "@Component\n" + scopeLine + "class Cart {\n    private static int created = 0;\n    private final int no;\n    Cart() {\n        created++;\n        no = created;\n    }\n    public int no() {\n        return no;\n    }\n" + more + "}\n";
    }
    static String service(String get) {
        if (get.equals("provider")) return HEAD + "@Component\nclass OrderService {\n    private final ObjectProvider<Cart> cartProvider;\n    OrderService(ObjectProvider<Cart> cartProvider) {\n        this.cartProvider = cartProvider;\n    }\n    int cartNo() {\n        Cart cart = cartProvider.getObject();\n        return cart.no();\n    }\n}\n";
        return HEAD + "@Component\nclass OrderService {\n    private final Cart cart;\n    OrderService(Cart cart) {\n        this.cart = cart;\n    }\n    int cartNo() {\n        return cart.no();\n    }\n}\n";
    }
    static Map<String, String> sources(String scope, String get) {
        Map<String, String> m = new LinkedHashMap<>();
        m.put("Cart", cart(scopeLine(scope, get), ""));
        m.put("OrderService", service(get));
        m.put("OrderController", CONTROLLER);
        m.put("App", APP);
        return m;
    }

    static URLClassLoader compile(Path base, String key, Map<String, String> src) throws Exception {
        Path root = base.resolve(key + "-" + Integer.toHexString(src.toString().hashCode())), srcDir = root.resolve("src/lab"), out = root.resolve("classes");
        Files.createDirectories(srcDir); Files.createDirectories(out);
        List<String> files = new ArrayList<>();
        for (Map.Entry<String, String> e : src.entrySet()) { Path f = srcDir.resolve(e.getKey() + ".java"); Files.writeString(f, e.getValue(), StandardCharsets.UTF_8); files.add(f.toString()); }
        JavaCompiler jc = ToolProvider.getSystemJavaCompiler();
        List<String> args = new ArrayList<>(List.of("-encoding", "UTF-8", "-parameters", "-proc:none", "-nowarn", "-cp", System.getProperty("java.class.path"), "-d", out.toString()));
        args.addAll(files);
        if (jc.run(null, null, null, args.toArray(new String[0])) != 0) throw new IllegalStateException("컴파일 실패: " + key);
        return new URLClassLoader(new URL[] { out.toUri().toURL() }, ScopeProbe.class.getClassLoader());
    }

    static int staticInt(ClassLoader cl, String cls, String field) throws Exception { Field f = Class.forName(cls, true, cl).getDeclaredField(field); f.setAccessible(true); return f.getInt(null); }
    static Object field(Object o, String name) throws Exception { Field f = o.getClass().getDeclaredField(name); f.setAccessible(true); return f.get(o); }
    static String kind(Object o) { String n = o.getClass().getName(); return n.equals("lab.Cart") ? "Cart" : n.startsWith("lab.Cart$$SpringCGLIB") ? "CartProxy" : o instanceof org.springframework.beans.factory.ObjectProvider ? "ObjectProvider" : n; }
    static String chain(Throwable e) { List<String> c = new ArrayList<>(); for (Throwable t = e; t != null; t = t.getCause()) c.add(t.getClass().getSimpleName()); return String.join(">", c); }

    interface Check { String run(ConfigurableApplicationContext ctx, URLClassLoader cl, String port, HttpClient client) throws Exception; }

    // 소스를 컴파일해 서버를 띄우고 check를 실행한다. 기동에 실패하면 예외 사슬을 돌려준다
    static String boot(Path base, String key, Map<String, String> src, Check check) throws Exception {
        ClassLoader old = Thread.currentThread().getContextClassLoader();
        try (URLClassLoader cl = compile(base, key, src)) {
            Thread.currentThread().setContextClassLoader(cl);
            SpringApplication app = new SpringApplication(new DefaultResourceLoader(cl), Class.forName("lab.App", true, cl));
            app.setBannerMode(Banner.Mode.OFF); app.setLogStartupInfo(false);
            ConfigurableApplicationContext ctx;
            try { ctx = app.run("--server.port=0", "--logging.level.root=OFF", "--spring.jmx.enabled=false"); }
            catch (Throwable e) { return "fail:" + chain(e) + "|" + staticInt(cl, "lab.Cart", "created"); }
            try { return check.run(ctx, cl, ctx.getEnvironment().getProperty("local.server.port"), HttpClient.newHttpClient()); }
            finally { ctx.close(); }
        } finally { Thread.currentThread().setContextClassLoader(old); }
    }
    static String get(HttpClient client, String port, String path) throws Exception {
        HttpResponse<String> r = client.send(HttpRequest.newBuilder(URI.create("http://127.0.0.1:" + port + path)).GET().build(), HttpResponse.BodyHandlers.ofString());
        return r.statusCode() == 200 ? r.body() : "HTTP " + r.statusCode();
    }

    public static void main(String[] args) throws Exception {
        Path base = Path.of(args.length > 1 ? args[1] : "verify/out/scope/gen");
        List<String> out = new ArrayList<>();
        out.add("# spring boot " + SpringBootVersion.getVersion() + " | spring " + SpringVersion.getVersion());
        for (String scope : new String[] { "singleton", "prototype", "request" })
            for (String get : new String[] { "inject", "provider", "proxy" })
                out.add(scope + "|" + get + " => " + boot(base, scope + "_" + get, sources(scope, get), (ctx, cl, port, client) -> {
                    int atStart = staticInt(cl, "lab.Cart", "created");
                    Object svc = ctx.getBean(Class.forName("lab.OrderService", true, cl));
                    String holds = kind(field(svc, get.equals("provider") ? "cartProvider" : "cart"));
                    String r1 = get(client, port, "/order"), r2 = get(client, port, "/order");
                    int total = staticInt(cl, "lab.Cart", "created");
                    // 요청 밖에서 컨테이너에 직접 두 번 달라고 했을 때 같은 객체인지 (표의 값에는 쓰지 않는 참고 값)
                    String twice;
                    try { Class<?> ct = Class.forName("lab.Cart", true, cl); twice = ctx.getBean(ct) == ctx.getBean(ct) ? "same" : "diff"; } catch (Throwable e) { twice = e.getClass().getSimpleName(); }
                    return "ok|" + atStart + "|" + total + "|" + r1 + "|" + r2 + "|" + holds + "|" + twice;
                }));

        // 추가 확인 1: 프로토타입 빈을 주입받는 싱글톤 빈이 둘이면 각자 다른 객체를 하나씩 받는다
        Map<String, String> two = sources("prototype", "inject");
        two.put("PaymentService", HEAD + "@Component\nclass PaymentService {\n    private final Cart cart;\n    PaymentService(Cart cart) {\n        this.cart = cart;\n    }\n}\n");
        out.add("# extra 프로토타입을 주입받는 싱글톤 빈이 둘 => " + boot(base, "x_two", two, (ctx, cl, port, client) -> {
            Object a = field(ctx.getBean(Class.forName("lab.OrderService", true, cl)), "cart"), b = field(ctx.getBean(Class.forName("lab.PaymentService", true, cl)), "cart");
            return "ok|기동 직후 Cart " + staticInt(cl, "lab.Cart", "created") + "개|두 빈이 받은 객체가 " + (a == b ? "같다" : "다르다");
        }));
        // 추가 확인 2: 프로토타입 + 프록시에서는 메서드를 부를 때마다 새 객체라서, add로 넣은 것이 바로 다음 size에서 보이지 않는다
        Map<String, String> lost = sources("prototype", "proxy");
        lost.put("Cart", cart(scopeLine("prototype", "proxy"), "    private final List<String> items = new ArrayList<>();\n    public void add(String item) {\n        items.add(item);\n    }\n    public int size() {\n        return items.size();\n    }\n"));
        lost.put("OrderService", HEAD + "@Component\nclass OrderService {\n    private final Cart cart;\n    OrderService(Cart cart) {\n        this.cart = cart;\n    }\n    int cartNo() {\n        cart.add(\"사과\");\n        return cart.size();\n    }\n}\n");
        out.add("# extra 프로토타입 + 프록시에서 add 뒤 size => " + boot(base, "x_lost", lost, (ctx, cl, port, client) -> "ok|요청 1의 응답(size, size) " + get(client, port, "/order") + "|만들어진 Cart " + staticInt(cl, "lab.Cart", "created") + "개"));
        // 추가 확인 3: @RequestScope는 프록시를 쓰는 request 스코프라서 그대로 주입받아도 기동되고, 요청마다 하나다
        Map<String, String> rs = sources("request", "inject");
        rs.put("Cart", cart("@RequestScope\n", ""));
        out.add("# extra @RequestScope를 그대로 주입 => " + boot(base, "x_rs", rs, (ctx, cl, port, client) -> {
            String holds = kind(field(ctx.getBean(Class.forName("lab.OrderService", true, cl)), "cart"));
            return "ok|" + get(client, port, "/order") + "|" + get(client, port, "/order") + "|" + holds + "|만들어진 Cart " + staticInt(cl, "lab.Cart", "created") + "개";
        }));
        // 추가 확인 4: request 스코프 빈은 요청이 끝날 때 소멸 콜백(@PreDestroy)이 불린다
        Map<String, String> pd = sources("request", "provider");
        pd.put("Cart", cart(scopeLine("request", "provider"), "    static int destroyed = 0;\n    @PreDestroy\n    void bye() {\n        destroyed++;\n    }\n"));
        out.add("# extra request 스코프 빈의 @PreDestroy => " + boot(base, "x_pd", pd, (ctx, cl, port, client) -> {
            get(client, port, "/order"); int after1 = staticInt(cl, "lab.Cart", "destroyed"); get(client, port, "/order"); Thread.sleep(300);
            return "ok|요청 1 뒤 소멸 " + after1 + "개|요청 2 뒤 소멸 " + staticInt(cl, "lab.Cart", "destroyed") + "개|만들어진 Cart " + staticInt(cl, "lab.Cart", "created") + "개";
        }));
        Files.write(Path.of(args[0]), out, StandardCharsets.UTF_8);
        System.out.println(out.get(0) + " | " + out.stream().filter(l -> !l.startsWith("#")).count() + " combos");
    }
}

import java.lang.reflect.Method;
import java.net.URL;
import java.net.URLClassLoader;
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
import org.springframework.boot.WebApplicationType;
import org.springframework.context.ConfigurableApplicationContext;
import org.springframework.core.SpringVersion;
import org.springframework.core.io.DefaultResourceLoader;

// "빈 생명주기 콜백" 실습의 스무 가지 조합을 실제 스프링 부트(SpringApplication, 컴포넌트 스캔)로 띄워 본다.
// 조합마다 화면에 보이는 것과 같은 소스(패키지 lab)를 만들어 그 자리에서 컴파일한다.
// 화면의 System.out.println 자리에 Trace.add를 넣어, 무엇이 어떤 순서로 불렸고 그때 repository 필드가 null이었는지를 적는다.
// 실행 순서: 컨테이너 기동 → STARTED → getBean(PriceCache) → price("사과") → USE → CLOSING → context.close()
// 한 줄의 뜻: inj|cb|scope => 결과|불린 순서|price("사과")의 값|예외 사슬
public class LifecycleProbe {
    static final String HEAD = "package lab;\nimport java.util.*;\nimport jakarta.annotation.*;\nimport org.springframework.beans.factory.*;\nimport org.springframework.beans.factory.annotation.*;\nimport org.springframework.context.annotation.*;\nimport org.springframework.stereotype.*;\n";

    // 화면의 code(c)와 같은 규칙으로 소스를 만든다. destroyAttr가 false이면 @Bean에 destroyMethod를 적지 않는다(추가 확인용)
    static Map<String, String> sources(String inj, String cb, String scope, boolean destroyAttr) {
        boolean field = inj.equals("field"), bean = cb.equals("method") || cb.equals("all"), proto = scope.equals("prototype");
        boolean anno = cb.equals("anno") || cb.equals("all"), iface = cb.equals("iface") || cb.equals("all");
        String load = "        prices = repository.findAll();\n", clear = "        prices.clear();\n";
        StringBuilder s = new StringBuilder(HEAD);
        if (!bean) { s.append("@Component\n"); if (proto) s.append("@Scope(\"prototype\")\n"); }
        s.append("class PriceCache").append(iface ? " implements InitializingBean, DisposableBean" : "").append(" {\n");
        s.append(field ? "    @Autowired\n    private PriceRepository repository;\n" : "    private final PriceRepository repository;\n");
        s.append("    private Map<String, Integer> prices;\n");
        s.append(field ? "    PriceCache() {\n" : "    PriceCache(PriceRepository repository) {\n        this.repository = repository;\n");
        s.append("        Trace.add(\"ctor\", this.repository);\n");
        if (cb.equals("ctor")) s.append("        prices = this.repository.findAll();\n");
        s.append("    }\n");
        if (anno) s.append("    @PostConstruct\n    void load() {\n        Trace.add(\"PostConstruct\", repository);\n").append(load).append("    }\n");
        if (iface) s.append("    @Override\n    public void afterPropertiesSet() {\n        Trace.add(\"afterPropertiesSet\", repository);\n").append(anno ? "" : load).append("    }\n");
        if (bean) s.append("    public void init() {\n        Trace.add(\"init\", repository);\n").append(anno || iface ? "" : load).append("    }\n");
        s.append("    int price(String name) {\n        return prices.get(name);\n    }\n");
        if (anno) s.append("    @PreDestroy\n    void clear() {\n        Trace.add(\"PreDestroy\", repository);\n").append(clear).append("    }\n");
        if (iface) s.append("    @Override\n    public void destroy() {\n        Trace.add(\"destroy\", repository);\n").append(anno ? "" : clear).append("    }\n");
        if (bean) s.append("    public void close() {\n        Trace.add(\"close\", repository);\n").append(anno || iface ? "" : clear).append("    }\n");
        s.append("}\n");
        Map<String, String> m = new LinkedHashMap<>();
        m.put("Trace", "package lab;\npublic class Trace {\n    public static final java.util.List<String> log = new java.util.ArrayList<>();\n    public static void add(String what, Object repository) {\n        log.add(what + \":\" + (repository == null ? \"null\" : \"set\"));\n    }\n}\n");
        m.put("PriceRepository", HEAD + "@Component\nclass PriceRepository {\n    Map<String, Integer> findAll() {\n        return new HashMap<>(Map.of(\"사과\", 1000));\n    }\n}\n");
        m.put("PriceCache", s.toString());
        if (bean) m.put("AppConfig", HEAD + "@Configuration\nclass AppConfig {\n    @Bean(initMethod = \"init\"" + (destroyAttr ? ", destroyMethod = \"close\"" : "") + ")\n" + (proto ? "    @Scope(\"prototype\")\n" : "")
            + (field ? "    PriceCache priceCache() {\n        return new PriceCache();\n    }\n" : "    PriceCache priceCache(PriceRepository repository) {\n        return new PriceCache(repository);\n    }\n") + "}\n");
        m.put("App", HEAD + "@Configuration\n@ComponentScan\npublic class App { }\n");
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
        return new URLClassLoader(new URL[] { out.toUri().toURL() }, LifecycleProbe.class.getClassLoader());
    }
    static String chain(Throwable e) { List<String> c = new ArrayList<>(); for (Throwable t = e; t != null; t = t.getCause()) c.add(t.getClass().getSimpleName()); return String.join(">", c); }
    static String root(Throwable e) { Throwable r = e; while (r.getCause() != null) r = r.getCause(); return r.getClass().getSimpleName(); }

    static String run(Path base, String key, Map<String, String> src) throws Exception {
        ClassLoader old = Thread.currentThread().getContextClassLoader();
        try (URLClassLoader cl = compile(base, key, src)) {
            Thread.currentThread().setContextClassLoader(cl);
            @SuppressWarnings("unchecked") List<String> log = (List<String>) Class.forName("lab.Trace", true, cl).getField("log").get(null);
            String result = "ok", price = "-", why = "";
            SpringApplication app = new SpringApplication(new DefaultResourceLoader(cl), Class.forName("lab.App", true, cl));
            app.setWebApplicationType(WebApplicationType.NONE); app.setBannerMode(Banner.Mode.OFF); app.setLogStartupInfo(false);
            ConfigurableApplicationContext ctx = null;
            try { ctx = app.run("--logging.level.root=OFF"); } catch (Throwable e) { result = "startfail:" + root(e); why = chain(e); }
            if (ctx != null) {
                log.add("STARTED");
                try {
                    Class<?> type = Class.forName("lab.PriceCache", true, cl);
                    Object cache = ctx.getBean(type);
                    Method m = type.getDeclaredMethod("price", String.class); m.setAccessible(true);
                    price = String.valueOf(m.invoke(cache, "사과"));
                    log.add("USE");
                } catch (Throwable e) { result = "getfail:" + root(e); why = chain(e); }
                log.add("CLOSING");
                ctx.close();
            }
            return result + "|" + String.join(">", log) + "|" + price + "|" + why;
        } finally { Thread.currentThread().setContextClassLoader(old); }
    }

    public static void main(String[] args) throws Exception {
        Path base = Path.of(args.length > 1 ? args[1] : "verify/out/lifecycle/gen");
        List<String> out = new ArrayList<>();
        out.add("# spring boot " + SpringBootVersion.getVersion() + " | spring " + SpringVersion.getVersion());
        for (String inj : new String[] { "ctor", "field" })
            for (String cb : new String[] { "ctor", "anno", "iface", "method", "all" })
                for (String scope : new String[] { "singleton", "prototype" })
                    out.add(inj + "|" + cb + "|" + scope + " => " + run(base, inj + "_" + cb + "_" + scope, sources(inj, cb, scope, true)));
        // 추가 확인: @Bean에 destroyMethod를 적지 않아도 public close() 메서드가 있으면 컨테이너가 닫힐 때 불린다
        out.add("# extra @Bean에 destroyMethod를 적지 않음 (싱글톤) => " + run(base, "x_infer", sources("field", "method", "singleton", false)));
        out.add("# extra @Bean에 destroyMethod를 적지 않음 (프로토타입) => " + run(base, "x_infer_proto", sources("field", "method", "prototype", false)));
        Files.write(Path.of(args[0]), out, StandardCharsets.UTF_8);
        System.out.println(out.get(0) + " | " + out.stream().filter(l -> !l.startsWith("#")).count() + " combos");
    }
}

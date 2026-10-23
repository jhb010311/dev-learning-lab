import java.io.File;
import java.io.StringWriter;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;
import javax.tools.JavaCompiler;
import javax.tools.ToolProvider;
import org.springframework.core.SpringVersion;

// 기초개념 "캐시" 실습을 실제 스프링(spring-context의 @EnableCaching + ConcurrentMapCacheManager)에서 확인한다.
// 조합마다 화면에 보이는 것과 같은 글의 소스(app 패키지의 Demo.java: package/import 머리글과, 끝에 // PROBE가 붙은 측정 줄만 더함)와
// app.Main을 임시 폴더에 만들어 컴파일하고(-parameters: 스프링 부트의 빌드 설정과 같게), 자식 자바 프로세스를 새로 띄워 실행한다.
// 클래스는 @ComponentScan으로 찾는다(화면의 CacheConfig도 스캔으로 읽힌다).
//   cache : spring(find 위에 @Cacheable("product")) / none(그 줄만 없음) / map(@Cacheable 없이 Map으로 손으로 쓴 캐시, CacheConfig 없음)
//   mid   : none(두 번 찾는 사이에 아무것도 안 함) / rename(rename(1L, "마우스")로 원본만 바꿈) / evict(rename에 @CacheEvict, map이면 cache.remove 줄)
// 자식(app.Main)이 적는 것: run()이 System.out에 찍은 줄(그대로), ProductService 빈의 클래스와 프록시 여부, Caller가 받은 객체가 그 빈인가,
// 첫 find 뒤 / 가운데 일 뒤 / 끝의 loadCount와 캐시에 적힌 것(spring·none은 CacheManager의 product 캐시, map은 cache 필드).
// 덧붙여, 화면에는 없는 변형 둘도 실행해 둔다: nokey(@CacheEvict("product")처럼 key를 적지 않은 것), noenable(@EnableCaching 줄만 뺀 것).
public class CacheBasicProbe {
    static final String HEADER = "package app;\n\nimport java.util.HashMap;\nimport java.util.Map;\n"
            + "import org.springframework.beans.factory.annotation.Autowired;\n"
            + "import org.springframework.cache.CacheManager;\n"
            + "import org.springframework.cache.annotation.CacheEvict;\n"
            + "import org.springframework.cache.annotation.Cacheable;\n"
            + "import org.springframework.cache.annotation.EnableCaching;\n"
            + "import org.springframework.cache.concurrent.ConcurrentMapCacheManager;\n"
            + "import org.springframework.context.annotation.Bean;\n"
            + "import org.springframework.context.annotation.Configuration;\n"
            + "import org.springframework.stereotype.Component;\n"
            + "import org.springframework.stereotype.Service;\n\n";

    // 화면의 코드와 같은 글(lesson의 code 함수와 줄마다 같다). nokey는 화면에 없는 변형.
    static String source(String cache, String mid, boolean nokey) { return source(cache, mid, nokey, false); }

    static String source(String cache, String mid, boolean nokey, boolean noenable) {
        boolean map = cache.equals("map"), spring = cache.equals("spring"), evict = mid.equals("evict");
        List<String> l = new ArrayList<>();
        if (!map) {
            l.add("// 캐시 기능을 켠다: 이 설정이 있어야 @Cacheable, @CacheEvict가 동작한다");
            l.add("@Configuration");
            if (!noenable) l.add("@EnableCaching");
            l.add("class CacheConfig {");
            l.add("    // 캐시를 보관하는 곳: 스프링이 주는 ConcurrentMapCacheManager(메모리의 Map을 쓴다)");
            l.add("    @Bean");
            l.add("    CacheManager cacheManager() {");
            l.add("        return new ConcurrentMapCacheManager(\"product\");");
            l.add("    }");
            l.add("}");
            l.add("");
        }
        l.add(map ? "// 예시로 만든 상품 서비스. @Cacheable 없이 캐시를 손으로 쓴 모양" : "// 예시로 만든 상품 서비스");
        l.add("@Service");
        l.add("class ProductService {");
        l.add("    // 원본: 상품 이름의 원래 값(DB 대신 쓰는 Map)");
        l.add("    private final Map<Long, String> db = new HashMap<>(Map.of(1L, \"키보드\"));");
        l.add("    // 원본에서 읽은 횟수");
        l.add("    private int loadCount = 0;");
        if (map) {
            l.add("    // 캐시: 읽어 온 값을 id별로 적어 두는 Map");
            l.add("    private final Map<Long, String> cache = new HashMap<>();");
        }
        l.add("");
        if (spring) {
            l.add("    // 결과를 캐시 product에 id별로 적어 둔다. 같은 id로 다시 부르면 본문을 실행하지 않는다");
            l.add("    @Cacheable(\"product\")");
        }
        l.add("    public String find(Long id) {");
        if (map) {
            l.add("        // 적어 둔 값이 있으면 그것을 준다");
            l.add("        if (cache.containsKey(id)) {");
            l.add("            return cache.get(id);");
            l.add("        }");
        }
        l.add("        // 원본에서 읽는다(실제로는 DB 조회 같은 느린 일이 오는 자리)");
        l.add("        loadCount++;");
        if (map) {
            l.add("        String v = db.get(id);");
            l.add("        // 읽어 온 값을 적어 둔다");
            l.add("        cache.put(id, v);");
            l.add("        return v;");
        } else {
            l.add("        return db.get(id);");
        }
        l.add("    }");
        l.add("");
        if (evict && !map) {
            l.add("    // 원본을 바꾼 뒤, 캐시 product에서 키가 id인 값을 지운다");
            l.add(nokey ? "    @CacheEvict(\"product\")" : "    @CacheEvict(cacheNames = \"product\", key = \"#id\")");
        }
        l.add("    public void rename(Long id, String name) {");
        l.add("        db.put(id, name);");
        if (evict && map) {
            l.add("        // 캐시에 적어 둔 값도 지운다");
            l.add("        cache.remove(id);");
        }
        l.add("    }");
        l.add("");
        l.add("    public int loadCount() {");
        l.add("        return loadCount;");
        l.add("    }");
        l.add("");
        l.add("    public String source(Long id) {");
        l.add("        return db.get(id);");
        l.add("    }");
        l.add("}");
        l.add("");
        l.add("// 예시로 만든, ProductService를 부르는 쪽");
        l.add("@Component");
        l.add("class Caller {");
        l.add("    @Autowired");
        l.add("    ProductService productService;");
        l.add("");
        l.add("    void run() {");
        l.add("        // 1번 상품을 처음 찾는다");
        l.add("        productService.find(1L);");
        l.add("        app.Seen.mark(\"after1\", productService); // PROBE");
        if (!mid.equals("none")) {
            l.add("        // 원본의 1번 값을 바꾼다");
            l.add("        productService.rename(1L, \"마우스\");");
            l.add("        app.Seen.mark(\"afterMid\", productService); // PROBE");
        }
        l.add("        // 1번 상품을 다시 찾는다");
        l.add("        String second = productService.find(1L);");
        l.add("        // 원본에서 읽은 횟수 / 두 번째로 받은 값 / 원본의 값");
        l.add("        System.out.println(");
        l.add("            productService.loadCount() + \" / \" + second + \" / \" + productService.source(1L));");
        l.add("    }");
        l.add("}");
        return HEADER + String.join("\n", l) + "\n";
    }

    static final String MAIN = """
            package app;

            import java.util.ArrayList;
            import java.util.List;
            import java.util.Map;
            import java.util.TreeMap;
            import org.springframework.aop.support.AopUtils;
            import org.springframework.cache.Cache;
            import org.springframework.cache.CacheManager;
            import org.springframework.context.annotation.AnnotationConfigApplicationContext;
            import org.springframework.context.annotation.ComponentScan;
            import org.springframework.context.annotation.Configuration;

            public class Main {
                public static void main(String[] args) throws Exception {
                    try (AnnotationConfigApplicationContext ctx = new AnnotationConfigApplicationContext(Scan.class)) {
                        Seen.ctx = ctx;
                        ProductService bean = ctx.getBean(ProductService.class);
                        Caller caller = ctx.getBean(Caller.class);
                        System.out.println("OUT_BEGIN");
                        caller.run();
                        System.out.println("OUT_END");
                        Seen.mark("end", bean);
                        Class<?> bc = bean.getClass();
                        System.out.println("RESULT beanClass=" + bc.getName() + "|isProxy=" + AopUtils.isAopProxy(bean)
                                + "|callerHasBean=" + (caller.productService == bean)
                                + "|cacheManager=" + (ctx.getBeanNamesForType(CacheManager.class).length > 0 ? ctx.getBean(CacheManager.class).getClass().getSimpleName() : "none")
                                + "|" + String.join("|", Seen.marks));
                    }
                }
            }

            @Configuration
            @ComponentScan(basePackageClasses = Main.class)
            class Scan { }

            class Seen {
                static AnnotationConfigApplicationContext ctx;
                static List<String> marks = new ArrayList<>();
                // loadCount와 캐시에 적힌 것을 적는다
                static void mark(String name, ProductService ps) {
                    String cache;
                    try {
                        java.lang.reflect.Field f = ProductService.class.getDeclaredField("cache");
                        f.setAccessible(true);
                        Object target = AopUtils.isAopProxy(ps) ? ((org.springframework.aop.framework.Advised) ps).getTargetSource().getTarget() : ps;
                        cache = "map:" + new TreeMap<>((Map<?, ?>) f.get(target));
                    } catch (NoSuchFieldException e) {
                        CacheManager cm = ctx.getBean(CacheManager.class);
                        Cache c = cm.getCache("product");
                        cache = "product(" + c.getNativeCache().getClass().getSimpleName() + "):" + new TreeMap<>((Map<?, ?>) c.getNativeCache());
                    } catch (Exception e) {
                        cache = "ERR " + e;
                    }
                    marks.add(name + "=" + ps.loadCount() + ";" + cache);
                }
            }
            """;

    static String clean(String s) { return s.replace('|', '¦').replace("\r", "").replace("\n", "\\n"); }

    public static void main(String[] args) throws Exception {
        Path root = Files.createTempDirectory("lab-cache-basic");
        JavaCompiler javac = ToolProvider.getSystemJavaCompiler();
        String java = Path.of(System.getProperty("java.home"), "bin", "java").toString(), cp = System.getProperty("java.class.path");
        List<String> out = new ArrayList<>();
        out.add("# spring " + SpringVersion.getVersion() + " | java " + System.getProperty("java.version") + " | ConcurrentMapCacheManager");
        List<String[]> runs = new ArrayList<>();
        for (String cache : new String[] { "spring", "none", "map" })
            for (String mid : new String[] { "none", "rename", "evict" }) runs.add(new String[] { cache, mid, "" });
        runs.add(new String[] { "spring", "evict", "nokey" });
        runs.add(new String[] { "spring", "none", "noenable" });
        int no = 0;
        for (String[] r : runs) {
            Path dir = root.resolve("c" + (no++)), src = dir.resolve("src/app"), classes = dir.resolve("classes");
            Files.createDirectories(src); Files.createDirectories(classes);
            String text = source(r[0], r[1], r[2].equals("nokey"), r[2].equals("noenable"));
            Files.writeString(src.resolve("Demo.java"), text, StandardCharsets.UTF_8);
            Files.writeString(src.resolve("Main.java"), MAIN, StandardCharsets.UTF_8);
            StringWriter cw = new StringWriter();
            int rc = javac.run(null, null, new java.io.PrintStream(new java.io.OutputStream() { public void write(int b) { cw.write(b); } }),
                    "-encoding", "UTF-8", "-proc:none", "-parameters", "-cp", cp, "-d", classes.toString(), src.resolve("Demo.java").toString(), src.resolve("Main.java").toString());
            String key = r[0] + "|" + r[1] + (r[2].isEmpty() ? "" : "|" + r[2]);
            if (rc != 0) { out.add(key + " => COMPILE_ERROR " + cw.toString().replace('\n', ' ')); continue; }
            List<String> cmd = new ArrayList<>(List.of(java, "-Dfile.encoding=UTF-8", "-Dstdout.encoding=UTF-8", "-cp", cp + File.pathSeparator + classes, "app.Main"));
            Process p = new ProcessBuilder(cmd).redirectErrorStream(true).start();
            String all = new String(p.getInputStream().readAllBytes(), StandardCharsets.UTF_8); p.waitFor();
            List<String> ls = all.lines().toList();
            int b = ls.indexOf("OUT_BEGIN"), e = ls.indexOf("OUT_END");
            String printed = b >= 0 && e > b ? String.join("\\n", ls.subList(b + 1, e)) : "?";
            String res = ls.stream().filter(x -> x.startsWith("RESULT ")).findFirst().orElse("RESULT ?" + (all.length() > 800 ? all.substring(0, 800) : all).replace('\n', ' ').replace('\r', ' '));
            out.add(key + " => out=" + printed + "|" + res.substring(7) + "|src=" + clean(text));
        }
        Files.write(Path.of(args[0]), out, StandardCharsets.UTF_8);
        out.forEach(x -> System.out.println(x.contains("|src=") ? x.substring(0, x.indexOf("|src=")) : x));
    }
}

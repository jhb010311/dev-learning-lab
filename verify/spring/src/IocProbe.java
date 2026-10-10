import java.lang.reflect.Constructor;
import java.lang.reflect.Field;
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

// "스프링 컨테이너와 빈" 실습의 서른 가지 조합을 실제로 실행한다.
// 조합마다 화면에 보이는 것과 같은 소스(패키지 lab)를 만들어 그 자리에서 컴파일하고,
// 직접 new로 만드는 경우는 그대로 실행, 컨테이너를 쓰는 경우는 스프링 부트(SpringApplication, 컴포넌트 스캔)로 띄운다.
// 화면의 코드에 더한 것은 두 가지뿐이다: "누가 이 객체를 만들었는지"를 적는 생성자 한 줄(Trace.made), 컴포넌트 스캔을 켜는 App 클래스.
// 한 줄의 뜻: how|reg|use => 결과|OrderService에 들어간 구현|20000원 주문의 할인|구현 객체를 만든 쪽|use만 바꿨을 때 달라지는 파일|만들어진 구현 객체 수|예외 메시지
public class IocProbe {
    static final String HEAD = "package lab;\nimport org.springframework.beans.factory.annotation.*;\nimport org.springframework.context.annotation.*;\nimport org.springframework.stereotype.*;\n";

    static String impl(String name, String body, boolean component, boolean primary) {
        return HEAD + (component ? "@Component\n" : "") + (primary ? "@Primary\n" : "") + "class " + name + " implements DiscountPolicy {\n    " + name + "() { Trace.made(this); }\n    public int discount(int price) { return " + body + "; }\n}\n";
    }

    // 화면의 code(c)와 같은 규칙으로 소스를 만든다. param은 OrderService 생성자의 파라미터 이름(추가 확인에서만 바꾼다)
    static Map<String, String> sources(String how, String reg, String use, String param) {
        boolean fixed = use.equals("fixed"), both = reg.equals("two") || reg.equals("primary") || reg.equals("qualifier") || reg.equals("primq");
        boolean regFixed = both || (reg.equals("one") && fixed), regRate = both || (reg.equals("one") && !fixed), primary = reg.equals("primary") || reg.equals("primq");
        String cls = fixed ? "FixedDiscountPolicy" : "RateDiscountPolicy", bean = fixed ? "fixedDiscountPolicy" : "rateDiscountPolicy", otherBean = fixed ? "rateDiscountPolicy" : "fixedDiscountPolicy";
        Map<String, String> m = new LinkedHashMap<>();
        m.put("Trace", "package lab;\npublic class Trace {\n    public static final java.util.List<String> log = new java.util.ArrayList<>();\n    static void made(Object o) {\n        StringBuilder sb = new StringBuilder(o.getClass().getSimpleName());\n        for (StackTraceElement e : new Throwable().getStackTrace()) sb.append(';').append(e.getClassName()).append('#').append(e.getMethodName());\n        log.add(sb.toString());\n    }\n}\n");
        m.put("DiscountPolicy", "package lab;\ninterface DiscountPolicy {\n    int discount(int price);\n}\n");
        boolean comp = how.equals("comp");
        m.put("FixedDiscountPolicy", impl("FixedDiscountPolicy", "1000", comp && regFixed, comp && primary && fixed));
        m.put("RateDiscountPolicy", impl("RateDiscountPolicy", "price / 10", comp && regRate, comp && primary && !fixed));
        String order = "    int order(int price) {\n        return price - discountPolicy.discount(price);\n    }\n";
        if (how.equals("new")) {
            m.put("OrderService", HEAD + "class OrderService {\n    private final DiscountPolicy discountPolicy = new " + cls + "();\n" + order + "}\n");
            return m;
        }
        m.put("OrderService", HEAD + "@Component\nclass OrderService {\n    private final DiscountPolicy discountPolicy;\n    OrderService(" + (reg.equals("qualifier") ? "@Qualifier(\"" + bean + "\") " : reg.equals("primq") ? "@Qualifier(\"" + otherBean + "\") " : "") + "DiscountPolicy " + param + ") {\n        this.discountPolicy = " + param + ";\n    }\n" + order + "}\n");
        if (how.equals("bean")) {
            String s = HEAD + "@Configuration\nclass AppConfig {\n";
            if (regFixed) s += "    @Bean\n" + (primary && fixed ? "    @Primary\n" : "") + "    DiscountPolicy fixedDiscountPolicy() {\n        return new FixedDiscountPolicy();\n    }\n";
            if (regRate) s += "    @Bean\n" + (primary && !fixed ? "    @Primary\n" : "") + "    DiscountPolicy rateDiscountPolicy() {\n        return new RateDiscountPolicy();\n    }\n";
            m.put("AppConfig", s + "}\n");
        }
        m.put("App", HEAD + "@Configuration\n@ComponentScan\npublic class App { }\n");
        return m;
    }

    // 소스를 base/<key>-<내용 해시>/ 아래에 쓰고 컴파일해, 그 폴더만 보는 클래스 로더를 돌려준다
    static URLClassLoader compile(Path base, String key, Map<String, String> src) throws Exception {
        Path root = base.resolve(key + "-" + Integer.toHexString(src.toString().hashCode())), srcDir = root.resolve("src/lab"), out = root.resolve("classes");
        Files.createDirectories(srcDir); Files.createDirectories(out);
        List<String> files = new ArrayList<>();
        for (Map.Entry<String, String> e : src.entrySet()) { Path f = srcDir.resolve(e.getKey() + ".java"); Files.writeString(f, e.getValue(), StandardCharsets.UTF_8); files.add(f.toString()); }
        JavaCompiler jc = ToolProvider.getSystemJavaCompiler();
        List<String> args = new ArrayList<>(List.of("-encoding", "UTF-8", "-parameters", "-proc:none", "-nowarn", "-cp", System.getProperty("java.class.path"), "-d", out.toString()));
        args.addAll(files);
        if (jc.run(null, null, null, args.toArray(new String[0])) != 0) throw new IllegalStateException("컴파일 실패: " + key);
        return new URLClassLoader(new URL[] { out.toUri().toURL() }, IocProbe.class.getClassLoader());
    }

    static String who(String trace) {
        // trace: 구현 클래스 이름;Trace#made;구현#<init>;부른 쪽;...
        String[] f = trace.split(";");
        String caller = "?";
        for (int i = 3; i < f.length; i++) { if (f[i].startsWith("jdk.internal.") || f[i].startsWith("java.lang.reflect.") || f[i].startsWith("java.lang.invoke.")) continue; caller = f[i]; break; }
        boolean spring = trace.contains(";org.springframework.beans.factory.support.");
        if (caller.startsWith("lab.OrderService#<init>")) return "OrderService";
        if (caller.startsWith("lab.AppConfig")) return spring ? "AppConfig<spring" : "AppConfig";
        if (caller.startsWith("org.springframework.")) return "spring";
        return caller;
    }

    static String run(Path base, String key, String how, String reg, String use, String param) throws Exception {
        Map<String, String> src = sources(how, reg, use, param), other = sources(how, reg, use.equals("fixed") ? "rate" : "fixed", param);
        List<String> changed = new ArrayList<>();
        for (String k : src.keySet()) if (!src.get(k).equals(other.get(k))) changed.add(k);
        String result, impl = "-", discount = "-", by = "-", msg = "";
        int made = 0;
        ClassLoader old = Thread.currentThread().getContextClassLoader();
        try (URLClassLoader cl = compile(base, key, src)) {
            Thread.currentThread().setContextClassLoader(cl);
            Class<?> svcType = Class.forName("lab.OrderService", true, cl);
            Object svc = null;
            ConfigurableApplicationContext ctx = null;
            try {
                if (how.equals("new")) {
                    Constructor<?> c = svcType.getDeclaredConstructor(); c.setAccessible(true); svc = c.newInstance();
                    result = "plain";
                } else {
                    SpringApplication app = new SpringApplication(new DefaultResourceLoader(cl), Class.forName("lab.App", true, cl));
                    app.setWebApplicationType(WebApplicationType.NONE); app.setBannerMode(Banner.Mode.OFF); app.setLogStartupInfo(false);
                    ctx = app.run("--logging.level.root=OFF");
                    svc = ctx.getBean(svcType);
                    result = "ok";
                }
                Field f = svcType.getDeclaredField("discountPolicy"); f.setAccessible(true);
                Object policy = f.get(svc);
                impl = policy.getClass().getSimpleName();
                Method m = svcType.getDeclaredMethod("order", int.class); m.setAccessible(true);
                discount = String.valueOf(20000 - (Integer) m.invoke(svc, 20000));
                @SuppressWarnings("unchecked") List<String> log = (List<String>) Class.forName("lab.Trace", true, cl).getField("log").get(null);
                made = log.size();
                for (String t : log) if (t.startsWith(impl + ";")) by = who(t);
            } catch (Throwable e) {
                Throwable r = e; while (r.getCause() != null) r = r.getCause();
                result = "fail:" + r.getClass().getSimpleName(); msg = String.valueOf(r.getMessage()).replaceAll("\\s+", " ").replace("|", "/");
            } finally { if (ctx != null) ctx.close(); }
        } finally { Thread.currentThread().setContextClassLoader(old); }
        return result + "|" + impl + "|" + discount + "|" + by + "|" + String.join(",", changed) + "|" + made + "|" + msg;
    }

    public static void main(String[] args) throws Exception {
        Path base = Path.of(args.length > 1 ? args[1] : "verify/out/ioc/gen");
        List<String> out = new ArrayList<>();
        out.add("# spring boot " + SpringBootVersion.getVersion() + " | spring " + SpringVersion.getVersion());
        for (String how : new String[] { "new", "comp", "bean" })
            for (String reg : new String[] { "one", "two", "primary", "qualifier", "none" })
                for (String use : new String[] { "fixed", "rate" })
                    out.add(how + "|" + reg + "|" + use + " => " + run(base, how + "_" + reg + "_" + use, how, reg, use, "discountPolicy"));
        // 추가 확인: 두 구현을 모두 등록하고 고르는 표시가 없어도, 생성자 파라미터 이름이 빈 이름과 같으면 그 빈이 들어간다
        out.add("# extra 파라미터 이름이 rateDiscountPolicy (comp, two) => " + run(base, "x_comp_param", "comp", "two", "fixed", "rateDiscountPolicy"));
        out.add("# extra 파라미터 이름이 rateDiscountPolicy (bean, two) => " + run(base, "x_bean_param", "bean", "two", "fixed", "rateDiscountPolicy"));
        // 추가 확인: 한쪽에 @Primary가 있어도 주입받는 곳의 @Qualifier가 다른 빈을 가리키면 @Qualifier가 가리킨 빈이 들어간다
        out.add("# extra rate에 @Primary + @Qualifier(fixedDiscountPolicy) (comp) => " + run(base, "x_comp_primq", "comp", "primq", "rate", "discountPolicy"));
        out.add("# extra rate에 @Primary + @Qualifier(fixedDiscountPolicy) (bean) => " + run(base, "x_bean_primq", "bean", "primq", "rate", "discountPolicy"));
        Files.write(Path.of(args[0]), out, StandardCharsets.UTF_8);
        System.out.println(out.get(0) + " | " + out.stream().filter(l -> !l.startsWith("#")).count() + " combos");
    }
}

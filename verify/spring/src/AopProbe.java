import java.io.ByteArrayOutputStream;
import java.io.PrintStream;
import java.lang.reflect.InvocationTargetException;
import java.lang.reflect.Method;
import java.net.URL;
import java.net.URLClassLoader;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;
import javax.tools.JavaCompiler;
import javax.tools.ToolProvider;
import org.springframework.aop.support.AopUtils;
import org.springframework.context.annotation.AnnotationConfigApplicationContext;
import org.springframework.core.SpringVersion;

// "AOP: 어드바이스와 포인트컷" 실습의 72가지 조합을 실제 스프링 AOP(@EnableAspectJAutoProxy, AspectJ weaver)에서 실행한다.
// 조합마다 화면에 보이는 것과 같은 구조의 소스(shop 패키지)를 만들어 컴파일하고, 스프링 컨텍스트를 새로 띄워 메서드를 한 번 부른다.
// 어드바이스와 메서드 본문은 System.out.println으로 한 줄씩 찍고, Probe는 호출하는 동안 찍힌 줄을 순서대로 모은다.
// 사용: java AopProbe <출력 파일> [컴파일 결과를 둘 폴더]
public class AopProbe {
    static final String[] PCS = { "cls", "arg", "noarg", "ann" }, MS = { "order", "cancel", "join" }, OUTS = { "ok", "ex" }, SECONDS = { "none", "log1", "time1" };

    static String expr(String pc) {
        return switch (pc) {
            case "cls" -> "execution(* shop.OrderService.*(..))";
            case "arg" -> "execution(* shop.*.*(String))";
            case "noarg" -> "execution(* shop.OrderService.cancel())";
            default -> "@annotation(shop.Audit)";
        };
    }

    static final String IMPORTS = "package shop;\nimport org.aspectj.lang.ProceedingJoinPoint;\nimport org.aspectj.lang.annotation.*;\nimport org.springframework.context.annotation.*;\nimport org.springframework.core.annotation.Order;\nimport org.springframework.stereotype.*;\nimport java.lang.annotation.*;\n";

    // 어드바이스 다섯 개를 가진 애스펙트. reversed이면 메서드를 적는 순서만 거꾸로 한다(실행 순서가 적는 순서와 무관한지 보려고).
    static String logAspect(String pc, String second, boolean reversed) {
        String order = second.equals("log1") ? "@Order(1)\n" : second.equals("time1") ? "@Order(2)\n" : "";
        String[] adv = {
            "    @Around(\"pick()\")\n    Object around(ProceedingJoinPoint pjp) throws Throwable {\n        System.out.println(\"Log @Around 앞\");\n        Object result = pjp.proceed();\n        System.out.println(\"Log @Around 뒤\");\n        return result;\n    }\n",
            "    @Before(\"pick()\")\n    void before() { System.out.println(\"Log @Before\"); }\n",
            "    @AfterReturning(\"pick()\")\n    void afterReturning() { System.out.println(\"Log @AfterReturning\"); }\n",
            "    @AfterThrowing(\"pick()\")\n    void afterThrowing() { System.out.println(\"Log @AfterThrowing\"); }\n",
            "    @After(\"pick()\")\n    void after() { System.out.println(\"Log @After\"); }\n" };
        StringBuilder sb = new StringBuilder(IMPORTS + "@Aspect\n@Component\n" + order + "class LogAspect {\n    @Pointcut(\"" + expr(pc) + "\")\n    void pick() { }\n");
        for (int i = 0; i < adv.length; i++) sb.append(adv[reversed ? adv.length - 1 - i : i]);
        return sb.append("}\n").toString();
    }

    static String timeAspect(String pc, String second) {
        String order = second.equals("log1") ? "@Order(2)\n" : "@Order(1)\n";
        return IMPORTS + "@Aspect\n@Component\n" + order + "class TimeAspect {\n    @Around(\"" + expr(pc) + "\")\n    Object time(ProceedingJoinPoint pjp) throws Throwable {\n        System.out.println(\"Time 시작\");\n        try {\n            return pjp.proceed();\n        } finally {\n            System.out.println(\"Time 끝\");\n        }\n    }\n}\n";
    }

    static String body(String name, String ret, boolean fail) {
        return "System.out.println(\"" + name + " 본문\"); " + (fail ? "throw new IllegalStateException(\"실패\");" : "return \"" + ret + "\";");
    }

    static String services(String m, String out) {
        boolean ex = out.equals("ex");
        return IMPORTS + "@Retention(RetentionPolicy.RUNTIME)\n@Target(ElementType.METHOD)\n@interface Audit { }\n\n"
            + "@Service\nclass OrderService {\n    public String order(String item) { " + body("order", "주문 완료", ex && m.equals("order")) + " }\n\n    @Audit\n    public String cancel(Long id) { " + body("cancel", "취소 완료", ex && m.equals("cancel")) + " }\n}\n\n"
            + "@Service\nclass MemberService {\n    @Audit\n    public String join(String name) { " + body("join", "가입 완료", ex && m.equals("join")) + " }\n}\n\n"
            + "@Configuration\n@EnableAspectJAutoProxy\nclass AppConfig { }\n";
    }

    record Result(String seq, String caller, boolean proxy) { }

    static Result run(Path gen, String pc, String m, String out, String second, boolean reversed) throws Exception {
        return run(gen, m, out, second, logAspect(pc, second, reversed), pc);
    }

    static Result run(Path gen, String m, String out, String second, String logSource, String pc) throws Exception {
        Path src = gen.resolve("src/shop");
        Files.createDirectories(src);
        List<String> files = new ArrayList<>();
        Files.writeString(src.resolve("Services.java"), services(m, out), StandardCharsets.UTF_8); files.add(src.resolve("Services.java").toString());
        Files.writeString(src.resolve("LogAspect.java"), logSource, StandardCharsets.UTF_8); files.add(src.resolve("LogAspect.java").toString());
        if (!second.equals("none")) { Files.writeString(src.resolve("TimeAspect.java"), timeAspect(pc, second), StandardCharsets.UTF_8); files.add(src.resolve("TimeAspect.java").toString()); }
        Path cls = gen.resolve("classes");
        Files.createDirectories(cls);
        JavaCompiler javac = ToolProvider.getSystemJavaCompiler();
        List<String> args = new ArrayList<>(List.of("-encoding", "UTF-8", "-parameters", "-proc:none", "-nowarn", "-cp", System.getProperty("java.class.path"), "-d", cls.toString()));
        args.addAll(files);
        ByteArrayOutputStream err = new ByteArrayOutputStream();
        if (javac.run(null, null, err, args.toArray(new String[0])) != 0) throw new IllegalStateException("컴파일 실패: " + err.toString(StandardCharsets.UTF_8));

        PrintStream realOut = System.out;
        try (URLClassLoader loader = new URLClassLoader(new URL[] { cls.toUri().toURL() }, AopProbe.class.getClassLoader());
             AnnotationConfigApplicationContext ctx = new AnnotationConfigApplicationContext()) {
            ctx.setClassLoader(loader);
            List<Class<?>> beans = new ArrayList<>(List.of(loader.loadClass("shop.AppConfig"), loader.loadClass("shop.OrderService"), loader.loadClass("shop.MemberService"), loader.loadClass("shop.LogAspect")));
            if (!second.equals("none")) beans.add(loader.loadClass("shop.TimeAspect"));
            ctx.register(beans.toArray(new Class<?>[0]));
            ctx.refresh();
            Class<?> type = loader.loadClass(m.equals("join") ? "shop.MemberService" : "shop.OrderService");
            Object bean = ctx.getBean(type);
            Method method = type.getMethod(m, m.equals("cancel") ? Long.class : String.class);
            method.setAccessible(true);
            Object arg = m.equals("order") ? "키보드" : m.equals("cancel") ? Long.valueOf(7L) : "kim";
            ByteArrayOutputStream buf = new ByteArrayOutputStream();
            String caller;
            System.setOut(new PrintStream(buf, true, StandardCharsets.UTF_8));
            try {
                caller = "\"" + method.invoke(bean, arg) + "\"";
            } catch (InvocationTargetException e) {
                caller = e.getCause().getClass().getSimpleName();
            } finally {
                System.setOut(realOut);
            }
            String seq = String.join(" > ", buf.toString(StandardCharsets.UTF_8).strip().split("\\R"));
            return new Result(seq, caller, AopUtils.isAopProxy(bean));
        } finally {
            System.setOut(realOut);
        }
    }

    public static void main(String[] args) throws Exception {
        Path gen = Path.of(args.length > 1 ? args[1] : "verify/out/aop/gen");
        List<String> out = new ArrayList<>();
        out.add("# spring " + SpringVersion.getVersion() + " | " + Path.of(org.aspectj.weaver.tools.PointcutParser.class.getProtectionDomain().getCodeSource().getLocation().toURI()).getFileName() + " | java " + System.getProperty("java.version"));
        int same = 0, total = 0;
        for (String pc : PCS) for (String m : MS) for (String o : OUTS) for (String second : SECONDS) {
            Result r = run(gen, pc, m, o, second, false);
            out.add(pc + "|" + m + "|" + o + "|" + second + " => " + r.seq() + "|" + r.caller() + "|proxy=" + r.proxy());
            // 어드바이스 메서드를 적는 순서를 뒤집어도 실행 순서가 같은지
            Result rev = run(gen, pc, m, o, second, true);
            total++; if (rev.seq().equals(r.seq()) && rev.caller().equals(r.caller())) same++; else out.add("# 적는 순서를 뒤집으면 달라짐: " + pc + "|" + m + "|" + o + "|" + second + " => " + rev.seq());
        }
        out.add("# 어드바이스 메서드를 적는 순서를 거꾸로 해도 결과가 같은 조합: " + same + " / " + total);
        // @Around에서 pjp.proceed()를 부르지 않으면 대상 메서드가 실행되는지
        Result np = run(gen, "order", "ok", "none", IMPORTS + """
            @Aspect
            @Component
            class LogAspect {
                @Around("EXPR")
                Object around(ProceedingJoinPoint pjp) throws Throwable {
                    System.out.println("Log @Around 앞");
                    System.out.println("Log @Around 뒤");
                    return "가로챈 값";
                }
            }
            """.replace("EXPR", expr("cls")), "cls");
        out.add("# @Around에서 proceed()를 부르지 않으면: " + np.seq() + "|" + np.caller());
        // 포인트컷 메서드의 이름을 target으로 지으면(target은 포인트컷 지시자의 이름이기도 하다)
        Result tg = run(gen, "order", "ok", "none", logAspect("cls", "none", false).replace("pick()", "target()"), "cls");
        out.add("# 포인트컷 메서드의 이름을 target()으로 지으면: " + tg.seq() + "|" + tg.caller() + "|proxy=" + tg.proxy());
        Files.write(Path.of(args[0]), out, StandardCharsets.UTF_8);
        System.out.println(out.size() + " lines");
    }
}

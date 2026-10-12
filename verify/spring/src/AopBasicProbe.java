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

// 기초개념 "AOP와 프록시" 실습을 실제 스프링(AnnotationConfigApplicationContext + @EnableAspectJAutoProxy + aspectjweaver)에서 확인한다.
// 조합마다 화면에 보이는 것과 같은 글의 소스(app 패키지의 Demo.java: package/import 머리글만 더함)와 app.Main을
// 임시 폴더에 만들어 컴파일하고, 자식 자바 프로세스를 새로 띄워 실행한다. 클래스는 @Component 스캔으로 찾는다.
//   aspect : LogAspect 클래스를 두는가
//   how    : bean(@Autowired로 스프링이 넣어 준 빈) / new(new OrderService()로 직접 만든 객체)
// 자식(app.Main)이 적는 것: run()이 System.out에 찍은 줄(그대로), 부른 객체의 클래스와 프록시 여부,
// 스프링 컨테이너에 든 orderService 빈의 클래스와 프록시 여부, 부른 객체가 그 빈과 같은 객체인가,
// 컨테이너 안의 프록시 개수, 프록시라면 그 안의 진짜 객체의 클래스와 상속 관계.
public class AopBasicProbe {
    static final String HEADER = "package app;\n\nimport org.aspectj.lang.annotation.Aspect;\nimport org.aspectj.lang.annotation.Before;\nimport org.springframework.beans.factory.annotation.Autowired;\nimport org.springframework.stereotype.Component;\nimport org.springframework.stereotype.Service;\n\n";

    // 화면의 코드와 같은 글(머리글만 다름)
    static String source(boolean aspect, boolean bean) {
        List<String> l = new ArrayList<>();
        if (aspect) {
            l.add("// 끼워 넣는 일: OrderService의 order()를 부를 때마다 실행된다");
            l.add("@Aspect");
            l.add("@Component");
            l.add("class LogAspect {");
            l.add("    @Before(\"execution(* OrderService.order(..))\")");
            l.add("    void log() {");
            l.add("        System.out.println(\"[로그] order 호출됨\");");
            l.add("    }");
            l.add("}");
            l.add("");
        }
        l.add("@Service");
        l.add("class OrderService {");
        l.add("    public void order() {");
        l.add("        System.out.println(\"주문 처리\");");
        l.add("    }");
        l.add("}");
        l.add("");
        l.add("@Component");
        l.add("class Caller {");
        if (bean) {
            l.add("    // 스프링이 만들어 둔 빈을 찾아 넣어 준다");
            l.add("    @Autowired");
            l.add("    OrderService orderService;");
        } else {
            l.add("    // 내가 직접 만든다");
            l.add("    OrderService orderService = new OrderService();");
        }
        l.add("");
        l.add("    void run() {");
        l.add("        orderService.order();");
        l.add("        System.out.println(orderService.getClass().getSimpleName());");
        l.add("    }");
        l.add("}");
        return HEADER + String.join("\n", l) + "\n";
    }

    static final String MAIN = """
            package app;

            import java.io.ByteArrayOutputStream;
            import java.io.PrintStream;
            import java.nio.charset.StandardCharsets;
            import org.springframework.aop.framework.AopProxyUtils;
            import org.springframework.aop.support.AopUtils;
            import org.springframework.context.annotation.AnnotationConfigApplicationContext;
            import org.springframework.context.annotation.ComponentScan;
            import org.springframework.context.annotation.Configuration;
            import org.springframework.context.annotation.EnableAspectJAutoProxy;

            public class Main {
                public static void main(String[] args) throws Exception {
                    try (AnnotationConfigApplicationContext ctx = new AnnotationConfigApplicationContext(Cfg.class)) {
                        Caller caller = ctx.getBean(Caller.class);
                        Object inCtx = ctx.getBean(OrderService.class);
                        PrintStream real = System.out;
                        ByteArrayOutputStream buf = new ByteArrayOutputStream();
                        System.setOut(new PrintStream(buf, true, StandardCharsets.UTF_8));
                        caller.run();
                        System.out.flush();
                        System.setOut(real);
                        String out = buf.toString(StandardCharsets.UTF_8).replace("\\r", "").trim().replace("\\n", "~");
                        Object used = caller.orderService;
                        int proxies = 0;
                        for (Object b : ctx.getBeansOfType(Object.class).values()) if (AopUtils.isAopProxy(b)) proxies++;
                        Object target = AopUtils.isAopProxy(inCtx) ? AopProxyUtils.getSingletonTarget(inCtx) : null;
                        System.out.println("RESULT out=" + out
                                + "|usedClass=" + used.getClass().getName() + "|usedProxy=" + AopUtils.isAopProxy(used) + "|usedCglib=" + AopUtils.isCglibProxy(used)
                                + "|beanClass=" + inCtx.getClass().getName() + "|beanProxy=" + AopUtils.isAopProxy(inCtx)
                                + "|same=" + (used == inCtx) + "|proxies=" + proxies
                                + "|targetClass=" + (target == null ? "-" : target.getClass().getName())
                                + "|targetSame=" + (target == inCtx)
                                + "|isSub=" + (OrderService.class.isAssignableFrom(inCtx.getClass()) && inCtx.getClass() != OrderService.class)
                                + "|super=" + inCtx.getClass().getSuperclass().getName()
                                + "|aspectBean=" + ctx.containsBean("logAspect")
                                + "|callerClass=" + caller.getClass().getName());
                    }
                }
            }

            @Configuration
            @EnableAspectJAutoProxy
            @ComponentScan(basePackageClasses = Main.class)
            class Cfg { }
            """;

    static String clean(String s) { return s.replace('|', '¦').replace("\r", "").replace("\n", "\\n"); }

    public static void main(String[] args) throws Exception {
        Path root = Files.createTempDirectory("lab-aop-basic");
        JavaCompiler javac = ToolProvider.getSystemJavaCompiler();
        String java = Path.of(System.getProperty("java.home"), "bin", "java").toString(), cp = System.getProperty("java.class.path");
        List<String> out = new ArrayList<>();
        out.add("# spring " + SpringVersion.getVersion() + " | java " + System.getProperty("java.version"));
        int no = 0;
        for (boolean aspect : new boolean[] { false, true })
            for (String how : new String[] { "bean", "new" }) {
                Path dir = root.resolve("c" + (no++)), src = dir.resolve("src/app"), classes = dir.resolve("classes");
                Files.createDirectories(src); Files.createDirectories(classes);
                String text = source(aspect, how.equals("bean"));
                Files.writeString(src.resolve("Demo.java"), text, StandardCharsets.UTF_8);
                Files.writeString(src.resolve("Main.java"), MAIN, StandardCharsets.UTF_8);
                StringWriter cw = new StringWriter();
                int rc = javac.run(null, null, new java.io.PrintStream(new java.io.OutputStream() { public void write(int b) { cw.write(b); } }),
                        "-encoding", "UTF-8", "-proc:none", "-parameters", "-cp", cp, "-d", classes.toString(), src.resolve("Demo.java").toString(), src.resolve("Main.java").toString());
                String key = aspect + "|" + how;
                if (rc != 0) { out.add(key + " => COMPILE_ERROR " + cw.toString().replace('\n', ' ')); continue; }
                List<String> cmd = new ArrayList<>(List.of(java, "-Dfile.encoding=UTF-8", "-Dstdout.encoding=UTF-8", "-cp", cp + File.pathSeparator + classes, "app.Main"));
                Process p = new ProcessBuilder(cmd).redirectErrorStream(true).start();
                String all = new String(p.getInputStream().readAllBytes(), StandardCharsets.UTF_8); p.waitFor();
                String res = all.lines().filter(l -> l.startsWith("RESULT ")).findFirst().orElse("RESULT ?|" + (all.length() > 1200 ? all.substring(0, 1200) : all).replace('\n', ' ').replace('\r', ' '));
                out.add(key + " => src=" + clean(text) + "|" + res.substring(7));
            }
        Files.write(Path.of(args[0]), out, StandardCharsets.UTF_8);
        out.forEach(l -> System.out.println(l.length() > 500 ? l.substring(0, 60) + " ... " + l.substring(l.indexOf("|out=")) : l));
    }
}

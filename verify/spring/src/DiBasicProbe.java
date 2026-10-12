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

// 기초개념 "의존성 주입" 실습을 실제 스프링(AnnotationConfigApplicationContext의 컴포넌트 스캔)에서 확인한다.
// 스프링 부트는 쓰지 않는다. 조합마다 화면에 보이는 것과 같은 모양의 소스(패키지 app의 PayService, OrderService, Main)를
// verify/out/di_basic/<how>-<dep>/src/app 에 만들어 컴파일하고, 자식 java 프로세스로 실행한다.
//   how : inject(생성자의 매개변수로 받는다) / new(new PayService()로 직접 만든다) / none(받지도 만들지도 않는다)
//   dep : PayService 위에 @Component를 적는가
// 화면의 코드와 다른 줄은 "// PROBE"로 끝나는 줄뿐이다(객체가 만들어질 때 기록하는 줄, 측정하는 줄). 대조 스크립트가 그 줄을 빼고 견준다.
// 자식(app.Probe)이 적는 것: 컴포넌트 스캔이 찾은 클래스, 객체가 만들어진 순서와 만든 쪽(스프링인지 우리 코드인지),
// 컨텍스트가 만들어진 뒤 main이 getBean을 부르기 전에 이미 만들어져 있었는지, OrderService가 실제로 들고 있는 payService 필드(리플렉션)가
// 컨텍스트의 PayService 빈과 같은 객체인지, 스프링이 기록한 OrderService의 의존 대상, main이 출력한 글, 멈췄다면 예외의 사슬.
public class DiBasicProbe {
    static final String HEADER_SPRING = "package app;\n\nimport org.springframework.stereotype.Component;\n\n";

    static String paySource(boolean dep) {
        return HEADER_SPRING
                + (dep ? "@Component\n" : "")
                + "public class PayService {\n"
                + "    { Probe.made(\"PayService\"); }  // PROBE\n"
                + "    public String pay() {\n"
                + "        return \"결제 완료\";\n"
                + "    }\n"
                + "}\n";
    }

    static String orderSource(String how) {
        StringBuilder s = new StringBuilder(HEADER_SPRING);
        s.append("@Component\n");
        s.append("public class OrderService {\n");
        s.append("    { Probe.made(\"OrderService\"); }  // PROBE\n");
        s.append(switch (how) {
            case "inject" -> "    private final PayService payService;\n";
            case "new" -> "    private final PayService payService = new PayService();\n";
            default -> "    private PayService payService;\n";
        });
        s.append("\n");
        if (how.equals("inject")) {
            s.append("    // 주입: 필요한 객체를 생성자의 매개변수로 적어 두면 스프링이 넣어 준다\n");
            s.append("    public OrderService(PayService payService) {\n");
            s.append("        this.payService = payService;\n");
            s.append("    }\n\n");
        }
        s.append("    public String order() {\n");
        s.append("        return payService.pay();\n");
        s.append("    }\n");
        s.append("}\n");
        return s.toString();
    }

    static final String MAIN = "package app;\n\n"
            + "import org.springframework.context.ApplicationContext;\n"
            + "import org.springframework.context.annotation.AnnotationConfigApplicationContext;\n\n"
            + "public class Main {\n"
            + "    public static void main(String[] args) {\n"
            + "        ApplicationContext context =\n"
            + "                new AnnotationConfigApplicationContext(\"app\");\n"
            + "        Probe.afterContext();  // PROBE\n"
            + "        OrderService orderService = context.getBean(OrderService.class);\n"
            + "        Probe.measure(context, orderService);  // PROBE\n"
            + "        System.out.println(orderService.order());\n"
            + "    }\n"
            + "}\n";

    // 화면의 코드에는 없는 측정용 클래스. main은 이 클래스가 리플렉션으로 불러서, 멈춘 예외를 잡아 적는다.
    static final String PROBE = """
            package app;

            import java.lang.reflect.Field;
            import java.lang.reflect.InvocationTargetException;
            import java.util.ArrayList;
            import java.util.Arrays;
            import java.util.List;
            import java.util.Map;
            import java.util.TreeSet;
            import java.util.stream.Collectors;
            import org.springframework.beans.factory.config.BeanDefinition;
            import org.springframework.context.ApplicationContext;
            import org.springframework.context.annotation.ClassPathScanningCandidateComponentProvider;
            import org.springframework.context.support.GenericApplicationContext;

            public class Probe {
                static final List<String> events = new ArrayList<>();

                // 객체가 만들어질 때마다 불린다. 생성자를 부른 쪽(스프링 또는 우리 코드의 어느 생성자)을 적는다
                public static void made(String name) {
                    List<StackWalker.StackFrame> fs = StackWalker.getInstance().walk(s -> s.collect(Collectors.toList()));
                    String by = "?";
                    for (int i = 0; i < fs.size(); i++) {
                        StackWalker.StackFrame f = fs.get(i);
                        if (f.getClassName().equals("app." + name) && f.getMethodName().equals("<init>")) {
                            for (int j = i + 1; j < fs.size(); j++) {
                                String cn = fs.get(j).getClassName();
                                if (cn.startsWith("java.") || cn.startsWith("jdk.")) continue;
                                by = cn.startsWith("org.springframework.") ? "spring"
                                        : cn.startsWith("app.") ? cn.substring(4) + "." + fs.get(j).getMethodName() : cn;
                                break;
                            }
                            break;
                        }
                    }
                    events.add(name + "<-" + by);
                }

                public static void afterContext() { events.add("#context"); }

                public static void measure(ApplicationContext ctx, Object order) {
                    events.add("#getBean");
                    Object v;
                    try {
                        Field f = order.getClass().getDeclaredField("payService");
                        f.setAccessible(true);
                        v = f.get(order);
                    } catch (ReflectiveOperationException e) {
                        throw new IllegalStateException(e);
                    }
                    Map<String, PayService> beans = ctx.getBeansOfType(PayService.class);
                    String kind = v == null ? "none" : (beans.size() == 1 && beans.values().iterator().next() == v) ? "bean" : "other";
                    String[] deps = ((GenericApplicationContext) ctx).getBeanFactory().getDependenciesForBean("orderService");
                    System.out.println("PROBE field=" + kind + "|beans=" + beans.size() + "|orderBeans=" + ctx.getBeanNamesForType(OrderService.class).length
                            + "|deps=" + Arrays.toString(deps));
                }

                static String first(Throwable t) {
                    String m = t.getMessage();
                    if (m == null) m = "";
                    int i = m.indexOf('\\n');
                    if (i >= 0) m = m.substring(0, i);
                    return t.getClass().getName() + ": " + m.replace('|', '/');
                }

                public static void main(String[] args) throws Exception {
                    TreeSet<String> cand = new TreeSet<>();
                    for (BeanDefinition bd : new ClassPathScanningCandidateComponentProvider(true).findCandidateComponents("app")) cand.add(bd.getBeanClassName());
                    System.out.println("PROBE scan=" + cand);
                    String chain = "-", at = "-";
                    try {
                        Class.forName("app.Main").getMethod("main", String[].class).invoke(null, (Object) new String[0]);
                    } catch (InvocationTargetException e) {
                        List<String> ch = new ArrayList<>();
                        for (Throwable t = e.getCause(); t != null; t = t.getCause()) ch.add(first(t));
                        chain = String.join(" >> ", ch);
                        StackTraceElement[] st = e.getCause().getStackTrace();
                        at = st.length > 0 ? st[0].getClassName() + "." + st[0].getMethodName() : "-";
                    }
                    System.out.println("PROBE events=" + String.join(",", events) + "|exc=" + chain + "|at=" + at);
                }
            }
            """;

    public static void main(String[] args) throws Exception {
        Path base = Path.of(args[1]);
        JavaCompiler javac = ToolProvider.getSystemJavaCompiler();
        String java = Path.of(System.getProperty("java.home"), "bin", "java").toString(), cp = System.getProperty("java.class.path");
        List<String> out = new ArrayList<>();
        out.add("# spring framework " + SpringVersion.getVersion() + " | java " + System.getProperty("java.version"));
        for (String how : new String[] { "inject", "new", "none" })
            for (boolean dep : new boolean[] { false, true }) {
                String name = how + "-" + dep;
                Path dir = base.resolve(name), src = dir.resolve("src/app"), classes = dir.resolve("classes");
                Files.createDirectories(src); Files.createDirectories(classes);
                Files.writeString(src.resolve("PayService.java"), paySource(dep), StandardCharsets.UTF_8);
                Files.writeString(src.resolve("OrderService.java"), orderSource(how), StandardCharsets.UTF_8);
                Files.writeString(src.resolve("Main.java"), MAIN, StandardCharsets.UTF_8);
                Files.writeString(src.resolve("Probe.java"), PROBE, StandardCharsets.UTF_8);
                StringWriter cw = new StringWriter();
                int rc = javac.run(null, null, new java.io.PrintStream(new java.io.OutputStream() { public void write(int b) { cw.write(b); } }),
                        "-encoding", "UTF-8", "-proc:none", "-parameters", "-cp", cp, "-d", classes.toString(),
                        src.resolve("PayService.java").toString(), src.resolve("OrderService.java").toString(), src.resolve("Main.java").toString(), src.resolve("Probe.java").toString());
                String key = how + "|" + dep;
                if (rc != 0) { out.add(key + " => COMPILE_ERROR " + cw.toString().replace('\n', ' ')); continue; }
                List<String> cmd = new ArrayList<>(List.of(java, "-Dfile.encoding=UTF-8", "-Dstdout.encoding=UTF-8",
                        "-cp", cp + File.pathSeparator + classes, "app.Probe"));
                Process p = new ProcessBuilder(cmd).redirectError(ProcessBuilder.Redirect.DISCARD).start();
                String all = new String(p.getInputStream().readAllBytes(), StandardCharsets.UTF_8); p.waitFor();
                List<String> probe = new ArrayList<>(), mainOut = new ArrayList<>();
                for (String ln : all.split("\r?\n")) {
                    if (ln.isEmpty()) continue;
                    if (ln.startsWith("PROBE ")) probe.add(ln.substring(6));
                    else if (ln.matches("^\\d\\d:\\d\\d:\\d\\d\\.\\d+ \\[.*")) { /* 스프링이 남기는 로그 줄: 시작 실패 때의 경고. main이 출력한 글이 아니다 */ }
                    else mainOut.add(ln);
                }
                out.add(key + " => " + String.join("|", probe) + "|out=" + (mainOut.isEmpty() ? "(없음)" : String.join(" / ", mainOut)) + "|exit=" + p.exitValue());
            }
        Files.write(Path.of(args[0]), out, StandardCharsets.UTF_8);
        out.forEach(System.out::println);
    }
}

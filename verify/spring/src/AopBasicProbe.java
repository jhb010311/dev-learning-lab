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

// 기초개념 "AOP와 프록시" 실습을 실제 스프링에서 확인한다(2026-10-22, @Transactional 중심으로 다시 짠 판).
// 결과는 aop_basic_tx_probe.out.txt에 적는다(옛 LogAspect 중심 판의 결과 aop_basic_probe.out.txt는 그대로 둔다).
// 설정: AnnotationConfigApplicationContext + @EnableTransactionManagement + @EnableAspectJAutoProxy(aspectjweaver)
//       + H2 메모리 DB(HikariCP DataSource) + DataSourceTransactionManager(시작/커밋/롤백을 세는 줄만 더함).
// 조합마다 화면에 보이는 것과 같은 글의 소스(app 패키지의 Demo.java: package/import 머리글만 더함)와 app.Main을
// 임시 폴더에 만들어 컴파일하고, 자식 자바 프로세스를 새로 띄워 실행한다. 클래스는 @Component 스캔으로 찾는다.
//   ann : tx(order() 위에 @Transactional) / none(아무것도 없음) / log(@Transactional 대신 직접 쓴 LogAspect)
//   how : bean(@Autowired로 스프링이 넣어 준 빈) / new(new OrderService()로 직접 만든 객체)
// 자식(app.Main)이 적는 것: run()이 찍은 줄(out), 트랜잭션 매니저의 시작/커밋 표시까지 끼운 순서(seq),
// 부른 객체의 클래스와 프록시 여부, 컨테이너의 OrderService 빈의 클래스와 프록시 여부, 같은 객체인가,
// 컨테이너 안의 프록시 개수, 프록시라면 참조하는 진짜 객체의 클래스와 상속 관계, 트랜잭션 매니저 시작/커밋/롤백 횟수,
// 트랜잭션을 시작할 때 연결한 DB 제품 이름.
public class AopBasicProbe {
    static final String HEADER = "package app;\n\nimport org.aspectj.lang.annotation.Aspect;\nimport org.aspectj.lang.annotation.Before;\nimport org.springframework.beans.factory.annotation.Autowired;\nimport org.springframework.stereotype.Component;\nimport org.springframework.stereotype.Service;\nimport org.springframework.transaction.annotation.Transactional;\nimport org.springframework.transaction.support.TransactionSynchronizationManager;\n\n";

    // 화면의 코드와 같은 글(머리글만 다름)
    static String source(String ann, boolean bean) {
        List<String> l = new ArrayList<>();
        l.add("// … 설정 클래스(@EnableTransactionManagement, H2 DataSource, 트랜잭션 매니저 빈)와 import 줄은 생략");
        l.add("");
        if (ann.equals("log")) {
            l.add("// 직접 만든 애스펙트: OrderService의 order()를 부르기 전에 한 줄 찍는다");
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
        if (ann.equals("tx")) {
            l.add("    // 스프링이 주는 애너테이션: 이 메서드를 트랜잭션으로 묶는다");
            l.add("    @Transactional");
        }
        l.add("    public void order() {");
        l.add("        // 스프링이 주는 메서드: 지금 트랜잭션이 진행 중이면 true를 돌려준다");
        l.add("        boolean active = TransactionSynchronizationManager.isActualTransactionActive();");
        l.add("        System.out.println(\"트랜잭션 진행 중: \" + active);");
        l.add("    }");
        l.add("}");
        l.add("");
        l.add("@Component");
        l.add("class Caller {");
        if (bean) {
            l.add("    // 스프링이 보관한 OrderService 빈을 이 칸이 가리키게 한다");
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

            import com.zaxxer.hikari.HikariConfig;
            import com.zaxxer.hikari.HikariDataSource;
            import java.io.ByteArrayOutputStream;
            import java.io.PrintStream;
            import java.nio.charset.StandardCharsets;
            import javax.sql.DataSource;
            import org.springframework.aop.framework.AopProxyUtils;
            import org.springframework.aop.support.AopUtils;
            import org.springframework.context.annotation.AnnotationConfigApplicationContext;
            import org.springframework.context.annotation.Bean;
            import org.springframework.context.annotation.ComponentScan;
            import org.springframework.context.annotation.Configuration;
            import org.springframework.context.annotation.EnableAspectJAutoProxy;
            import org.springframework.jdbc.datasource.DataSourceTransactionManager;
            import org.springframework.transaction.PlatformTransactionManager;
            import org.springframework.transaction.TransactionDefinition;
            import org.springframework.transaction.annotation.EnableTransactionManagement;
            import org.springframework.transaction.support.DefaultTransactionStatus;

            public class Main {
                public static void main(String[] args) throws Exception {
                    try (AnnotationConfigApplicationContext ctx = new AnnotationConfigApplicationContext(Cfg.class)) {
                        Caller caller = ctx.getBean(Caller.class);
                        Object inCtx = ctx.getBean(OrderService.class);
                        PrintStream real = System.out;
                        ByteArrayOutputStream buf = new ByteArrayOutputStream();
                        System.setOut(new PrintStream(buf, true, StandardCharsets.UTF_8));
                        Seen.on = true;
                        caller.run();
                        Seen.on = false;
                        System.out.flush();
                        System.setOut(real);
                        String seq = buf.toString(StandardCharsets.UTF_8).replace("\\r", "").trim().replace("\\n", "~");
                        StringBuilder out = new StringBuilder();
                        for (String s : seq.split("~")) if (!s.startsWith("#TM ")) out.append(out.length() == 0 ? "" : "~").append(s);
                        Object used = caller.orderService;
                        int proxies = 0;
                        for (Object b : ctx.getBeansOfType(Object.class).values()) if (AopUtils.isAopProxy(b)) proxies++;
                        Object target = AopUtils.isAopProxy(inCtx) ? AopProxyUtils.getSingletonTarget(inCtx) : null;
                        System.out.println("RESULT out=" + out + "|seq=" + seq
                                + "|usedClass=" + used.getClass().getName() + "|usedProxy=" + AopUtils.isAopProxy(used) + "|usedCglib=" + AopUtils.isCglibProxy(used)
                                + "|beanClass=" + inCtx.getClass().getName() + "|beanProxy=" + AopUtils.isAopProxy(inCtx)
                                + "|same=" + (used == inCtx) + "|proxies=" + proxies
                                + "|targetClass=" + (target == null ? "-" : target.getClass().getName())
                                + "|targetSame=" + (target == inCtx)
                                + "|isSub=" + (OrderService.class.isAssignableFrom(inCtx.getClass()) && inCtx.getClass() != OrderService.class)
                                + "|super=" + inCtx.getClass().getSuperclass().getName()
                                + "|aspectBean=" + ctx.containsBean("logAspect")
                                + "|tmClass=" + ctx.getBean(PlatformTransactionManager.class).getClass().getSuperclass().getName()
                                + "|db=" + Seen.db
                                + "|begins=" + Seen.begins + "|commits=" + Seen.commits + "|rollbacks=" + Seen.rollbacks
                                + "|callerClass=" + caller.getClass().getName());
                    }
                }
            }

            @Configuration
            @EnableTransactionManagement
            @EnableAspectJAutoProxy
            @ComponentScan(basePackageClasses = Main.class)
            class Cfg {
                @Bean DataSource dataSource() {
                    HikariConfig hc = new HikariConfig();
                    hc.setJdbcUrl("jdbc:h2:mem:aop_basic;DB_CLOSE_DELAY=-1");
                    return new HikariDataSource(hc);
                }
                @Bean PlatformTransactionManager transactionManager(DataSource ds) { return new CountingTm(ds); }
            }

            // 스프링의 트랜잭션 매니저에 시작/커밋/롤백 횟수를 세고 순서 표시(#TM)를 찍는 줄만 더한 것
            class CountingTm extends DataSourceTransactionManager {
                CountingTm(DataSource ds) { super(ds); }
                @Override protected void doBegin(Object tx, TransactionDefinition def) {
                    Seen.begins++; super.doBegin(tx, def);
                    try (var c = getDataSource().getConnection()) { Seen.db = c.getMetaData().getDatabaseProductName(); } catch (Exception e) { Seen.db = "ERR"; }
                    if (Seen.on) System.out.println("#TM begin");
                }
                @Override protected void doCommit(DefaultTransactionStatus s) { Seen.commits++; super.doCommit(s); if (Seen.on) System.out.println("#TM commit"); }
                @Override protected void doRollback(DefaultTransactionStatus s) { Seen.rollbacks++; super.doRollback(s); if (Seen.on) System.out.println("#TM rollback"); }
            }

            class Seen {
                static boolean on;
                static String db = "-";
                static int begins, commits, rollbacks;
            }
            """;

    static String clean(String s) { return s.replace('|', '¦').replace("\r", "").replace("\n", "\\n"); }

    public static void main(String[] args) throws Exception {
        Path root = Files.createTempDirectory("lab-aop-basic");
        JavaCompiler javac = ToolProvider.getSystemJavaCompiler();
        String java = Path.of(System.getProperty("java.home"), "bin", "java").toString(), cp = System.getProperty("java.class.path");
        List<String> out = new ArrayList<>();
        out.add("# spring " + SpringVersion.getVersion() + " | java " + System.getProperty("java.version"));
        int no = 0;
        for (String ann : new String[] { "tx", "none", "log" })
            for (String how : new String[] { "bean", "new" }) {
                Path dir = root.resolve("c" + (no++)), src = dir.resolve("src/app"), classes = dir.resolve("classes");
                Files.createDirectories(src); Files.createDirectories(classes);
                String text = source(ann, how.equals("bean"));
                Files.writeString(src.resolve("Demo.java"), text, StandardCharsets.UTF_8);
                Files.writeString(src.resolve("Main.java"), MAIN, StandardCharsets.UTF_8);
                StringWriter cw = new StringWriter();
                int rc = javac.run(null, null, new java.io.PrintStream(new java.io.OutputStream() { public void write(int b) { cw.write(b); } }),
                        "-encoding", "UTF-8", "-proc:none", "-parameters", "-cp", cp, "-d", classes.toString(), src.resolve("Demo.java").toString(), src.resolve("Main.java").toString());
                String key = ann + "|" + how;
                if (rc != 0) { out.add(key + " => COMPILE_ERROR " + cw.toString().replace('\n', ' ')); continue; }
                List<String> cmd = new ArrayList<>(List.of(java, "-Dfile.encoding=UTF-8", "-Dstdout.encoding=UTF-8", "-cp", cp + File.pathSeparator + classes, "app.Main"));
                Process p = new ProcessBuilder(cmd).redirectErrorStream(true).start();
                String all = new String(p.getInputStream().readAllBytes(), StandardCharsets.UTF_8); p.waitFor();
                String res = all.lines().filter(l -> l.startsWith("RESULT ")).findFirst().orElse("RESULT ?|" + (all.length() > 1200 ? all.substring(0, 1200) : all).replace('\n', ' ').replace('\r', ' '));
                out.add(key + " => src=" + clean(text) + "|" + res.substring(7));
            }
        Files.write(Path.of(args[0]), out, StandardCharsets.UTF_8);
        out.forEach(l -> System.out.println(l.length() > 500 ? l.substring(0, 20) + " ... " + l.substring(l.indexOf("|out=")) : l));
    }
}

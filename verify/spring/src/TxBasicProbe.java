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

// 기초개념 "@Transactional" 실습을 실제 스프링(@EnableTransactionManagement + DataSourceTransactionManager + JdbcTemplate + H2 메모리 DB)에서 확인한다.
// 조합마다 화면에 보이는 것과 같은 모양의 OrderService 소스(package/import 줄과 PROBE 표시가 붙은 줄만 더함)와 app.Main을
// 임시 폴더에 만들어 패키지 app으로 컴파일하고, 자식 자바 프로세스를 새로 띄워 실행한다(조합마다 DB도 새로 만든다).
// OrderService는 @Service이고 스프링이 컴포넌트 스캔으로 찾는다. 자동 커밋은 JDBC 기본값 그대로 둔다.
//   tx    : order() 위에 @Transactional을 적는가
//   stock : zero(stock에 0, 두 저장 사이에서 예외) / five(stock에 5, 예외 없음)
// 자식(app.Main)이 적는 것: order()가 끝난 방식(예외 종류와 메시지), 호출 뒤 orders와 payment의 행 수(별도의 조회),
// 단계 문장이 기대는 사실: (a) order() 안에서 트랜잭션이 활성인가, (b) main이 받은 OrderService 빈의 클래스(우리 클래스 그대로인가 프록시인가),
// (c) 첫 INSERT 직후 다른 연결에서 본 orders의 행 수, (d) 트랜잭션 매니저가 시작/커밋/롤백을 한 횟수.
public class TxBasicProbe {
    static final String HEADER = "package app;\n\nimport org.springframework.jdbc.core.JdbcTemplate;\nimport org.springframework.stereotype.Service;\nimport org.springframework.transaction.annotation.Transactional;\n\n";

    // 화면의 코드와 같은 글에, 끝에 // PROBE 가 붙은 측정 줄 두 개를 더한다.
    static String source(boolean tx, boolean zero) {
        List<String> l = new ArrayList<>();
        l.add("@Service");
        l.add("public class OrderService {");
        l.add("    private final JdbcTemplate jdbc;");
        l.add("");
        l.add("    public OrderService(JdbcTemplate jdbc) {");
        l.add("        this.jdbc = jdbc;");
        l.add("    }");
        l.add("");
        if (tx) {
            l.add("    // 묶음: 이 메서드 안의 저장은 모두 반영되거나 모두 취소된다");
            l.add("    @Transactional");
        }
        l.add("    public void order() {");
        l.add("        app.Seen.active = org.springframework.transaction.support.TransactionSynchronizationManager.isActualTransactionActive(); // PROBE");
        l.add("        jdbc.update(\"INSERT INTO orders VALUES (1, '키보드')\");");
        l.add("        app.Seen.seen = app.Seen.other.queryForObject(\"SELECT COUNT(*) FROM orders\", Integer.class); // PROBE");
        l.add("        int stock = " + (zero ? "0" : "5") + ";");
        l.add("        if (stock == 0) {");
        l.add("            throw new IllegalStateException(\"재고 없음\");");
        l.add("        }");
        l.add("        jdbc.update(\"INSERT INTO payment VALUES (1, 30000)\");");
        l.add("    }");
        l.add("}");
        return HEADER + String.join("\n", l) + "\n";
    }

    static final String MAIN = """
            package app;

            import com.zaxxer.hikari.HikariConfig;
            import com.zaxxer.hikari.HikariDataSource;
            import javax.sql.DataSource;
            import org.springframework.aop.support.AopUtils;
            import org.springframework.context.annotation.AnnotationConfigApplicationContext;
            import org.springframework.context.annotation.Bean;
            import org.springframework.context.annotation.ComponentScan;
            import org.springframework.context.annotation.Configuration;
            import org.springframework.jdbc.core.JdbcTemplate;
            import org.springframework.jdbc.datasource.DataSourceTransactionManager;
            import org.springframework.jdbc.datasource.DriverManagerDataSource;
            import org.springframework.transaction.PlatformTransactionManager;
            import org.springframework.transaction.TransactionDefinition;
            import org.springframework.transaction.TransactionStatus;
            import org.springframework.transaction.annotation.EnableTransactionManagement;
            import org.springframework.transaction.support.DefaultTransactionStatus;

            public class Main {
                public static void main(String[] args) throws Exception {
                    try (AnnotationConfigApplicationContext ctx = new AnnotationConfigApplicationContext(Cfg.class)) {
                        JdbcTemplate jdbc = ctx.getBean(JdbcTemplate.class);
                        jdbc.execute("CREATE TABLE orders (id INT, item VARCHAR(20))");
                        jdbc.execute("CREATE TABLE payment (id INT, amount INT)");
                        // 다른 연결: 같은 DB를 따로 연결해 첫 INSERT 직후 orders가 보이는지 본다
                        Seen.other = new JdbcTemplate(new DriverManagerDataSource("jdbc:h2:mem:tx_basic;DB_CLOSE_DELAY=-1"));
                        OrderService os = ctx.getBean(OrderService.class);
                        String ends = "NORMAL";
                        try { os.order(); } catch (Exception e) { ends = e.getClass().getName() + ":" + e.getMessage(); }
                        int orders = jdbc.queryForObject("SELECT COUNT(*) FROM orders", Integer.class);
                        int payment = jdbc.queryForObject("SELECT COUNT(*) FROM payment", Integer.class);
                        Class<?> bc = os.getClass();
                        System.out.println("RESULT ends=" + ends.replace('|', '\\u00a6') + "|orders=" + orders + "|payment=" + payment
                                + "|active=" + Seen.active + "|seen=" + Seen.seen
                                + "|beanClass=" + bc.getName() + "|sameClass=" + (bc == OrderService.class) + "|isProxy=" + AopUtils.isAopProxy(os)
                                + "|begins=" + Seen.begins + "|commits=" + Seen.commits + "|rollbacks=" + Seen.rollbacks);
                    }
                }
            }

            @Configuration
            @EnableTransactionManagement
            @ComponentScan(basePackageClasses = Main.class)
            class Cfg {
                @Bean DataSource dataSource() {
                    HikariConfig hc = new HikariConfig();
                    hc.setJdbcUrl("jdbc:h2:mem:tx_basic;DB_CLOSE_DELAY=-1");
                    return new HikariDataSource(hc);
                }
                @Bean JdbcTemplate jdbc(DataSource ds) { return new JdbcTemplate(ds); }
                @Bean PlatformTransactionManager transactionManager(DataSource ds) { return new CountingTm(ds); }
            }

            // 스프링의 트랜잭션 매니저에 시작/커밋/롤백 횟수를 세는 줄만 더한 것
            class CountingTm extends DataSourceTransactionManager {
                CountingTm(DataSource ds) { super(ds); }
                @Override protected void doBegin(Object tx, TransactionDefinition def) { Seen.begins++; super.doBegin(tx, def); }
                @Override protected void doCommit(DefaultTransactionStatus s) { Seen.commits++; super.doCommit(s); }
                @Override protected void doRollback(DefaultTransactionStatus s) { Seen.rollbacks++; super.doRollback(s); }
            }

            class Seen {
                static boolean active;
                static int seen = -1, begins, commits, rollbacks;
                static JdbcTemplate other;
            }
            """;

    static String clean(String s) { return s.replace('|', '¦').replace("\r", "").replace("\n", "\\n"); }

    public static void main(String[] args) throws Exception {
        Path root = Files.createTempDirectory("lab-tx-basic");
        JavaCompiler javac = ToolProvider.getSystemJavaCompiler();
        String java = Path.of(System.getProperty("java.home"), "bin", "java").toString(), cp = System.getProperty("java.class.path");
        List<String> out = new ArrayList<>();
        out.add("# spring " + SpringVersion.getVersion() + " | java " + System.getProperty("java.version"));
        int no = 0;
        for (boolean tx : new boolean[] { false, true })
            for (String stock : new String[] { "zero", "five" }) {
                Path dir = root.resolve("c" + (no++)), src = dir.resolve("src/app"), classes = dir.resolve("classes");
                Files.createDirectories(src); Files.createDirectories(classes);
                String text = source(tx, stock.equals("zero"));
                Files.writeString(src.resolve("OrderService.java"), text, StandardCharsets.UTF_8);
                Files.writeString(src.resolve("Main.java"), MAIN, StandardCharsets.UTF_8);
                StringWriter cw = new StringWriter();
                int rc = javac.run(null, null, new java.io.PrintStream(new java.io.OutputStream() { public void write(int b) { cw.write(b); } }),
                        "-encoding", "UTF-8", "-proc:none", "-parameters", "-cp", cp, "-d", classes.toString(), src.resolve("OrderService.java").toString(), src.resolve("Main.java").toString());
                String key = tx + "|" + stock;
                if (rc != 0) { out.add(key + " => COMPILE_ERROR " + cw.toString().replace('\n', ' ')); continue; }
                List<String> cmd = new ArrayList<>(List.of(java, "-Dfile.encoding=UTF-8", "-Dstdout.encoding=UTF-8", "-cp", cp + File.pathSeparator + classes, "app.Main"));
                Process p = new ProcessBuilder(cmd).redirectErrorStream(true).start();
                String all = new String(p.getInputStream().readAllBytes(), StandardCharsets.UTF_8); p.waitFor();
                String res = all.lines().filter(l -> l.startsWith("RESULT ")).findFirst().orElse("RESULT ?|" + (all.length() > 800 ? all.substring(0, 800) : all).replace('\n', ' ').replace('\r', ' '));
                out.add(key + " => src=" + clean(text) + "|" + res.substring(7));
            }
        Files.write(Path.of(args[0]), out, StandardCharsets.UTF_8);
        out.forEach(l -> System.out.println(l.length() > 400 ? l.substring(0, 60) + " ... " + l.substring(l.indexOf("|ends=")) : l));
    }
}

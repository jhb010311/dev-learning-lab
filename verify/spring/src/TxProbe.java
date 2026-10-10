import com.zaxxer.hikari.HikariConfig;
import com.zaxxer.hikari.HikariDataSource;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;
import javax.sql.DataSource;
import org.springframework.context.annotation.AnnotationConfigApplicationContext;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.SpringVersion;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DataSourceTransactionManager;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.annotation.EnableTransactionManagement;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

// "트랜잭션 전파" 실습의 72가지 조합을 실제 스프링(@Transactional 프록시 + DataSourceTransactionManager + H2)에서 실행한다.
// 조합마다 주문과 로그가 DB에 남았는지, 호출한 쪽이 무엇을 받았는지, 커넥션을 동시에 몇 개 썼는지 적는다.
public class TxProbe {
    static HikariDataSource hikari;
    static int peak;
    static void sample() { peak = Math.max(peak, hikari.getHikariPoolMXBean().getActiveConnections()); }

    @Configuration
    @EnableTransactionManagement
    public static class Cfg {
        @Bean public DataSource dataSource() {
            HikariConfig hc = new HikariConfig();
            hc.setJdbcUrl("jdbc:h2:mem:txprobe;DB_CLOSE_DELAY=-1");
            hc.setMaximumPoolSize(4);
            hikari = new HikariDataSource(hc);
            return hikari;
        }
        @Bean public PlatformTransactionManager transactionManager(DataSource ds) { return new DataSourceTransactionManager(ds); }
        @Bean public JdbcTemplate jdbc(DataSource ds) { return new JdbcTemplate(ds); }
        @Bean public LogService logService(JdbcTemplate j) { return new LogService(j); }
        @Bean public OrderService orderService(JdbcTemplate j, LogService l) { return new OrderService(j, l); }
    }

    public static class LogService {
        private final JdbcTemplate j;
        public LogService(JdbcTemplate j) { this.j = j; }
        private void body(String ex, String type) throws Exception {
            j.update("insert into logs(v) values (1)");
            sample();
            if (ex.equals("inner")) { if (type.equals("chk")) throw new IOException("log"); throw new IllegalStateException("log"); }
        }
        @Transactional(propagation = Propagation.REQUIRED) public void required(String ex, String type) throws Exception { body(ex, type); }
        @Transactional(propagation = Propagation.REQUIRES_NEW) public void requiresNew(String ex, String type) throws Exception { body(ex, type); }
        @Transactional(propagation = Propagation.NESTED) public void nested(String ex, String type) throws Exception { body(ex, type); }
        @Transactional(propagation = Propagation.REQUIRED, rollbackFor = Exception.class) public void requiredRf(String ex, String type) throws Exception { body(ex, type); }
        @Transactional(propagation = Propagation.REQUIRES_NEW, rollbackFor = Exception.class) public void requiresNewRf(String ex, String type) throws Exception { body(ex, type); }
        @Transactional(propagation = Propagation.NESTED, rollbackFor = Exception.class) public void nestedRf(String ex, String type) throws Exception { body(ex, type); }
    }

    public static class OrderService {
        private final JdbcTemplate j;
        private final LogService logService;
        public OrderService(JdbcTemplate j, LogService l) { this.j = j; this.logService = l; }
        private void call(String prop, String ex, String type, boolean rf) throws Exception {
            switch (prop) {
                case "REQUIRED" -> { if (rf) logService.requiredRf(ex, type); else logService.required(ex, type); }
                case "REQUIRES_NEW" -> { if (rf) logService.requiresNewRf(ex, type); else logService.requiresNew(ex, type); }
                default -> { if (rf) logService.nestedRf(ex, type); else logService.nested(ex, type); }
            }
        }
        private void body(String prop, String ex, String type, boolean ct, boolean rf) throws Exception {
            j.update("insert into orders(v) values (1)");
            sample();
            if (ct) { try { call(prop, ex, type, rf); } catch (Exception e) { /* 로그 저장 실패는 넘어간다 */ } }
            else call(prop, ex, type, rf);
            sample();
            if (ex.equals("outer")) { if (type.equals("chk")) throw new IOException("order"); throw new IllegalStateException("order"); }
        }
        @Transactional public void place(String prop, String ex, String type, boolean ct, boolean rf) throws Exception { body(prop, ex, type, ct, rf); }
        @Transactional(rollbackFor = Exception.class) public void placeRf(String prop, String ex, String type, boolean ct, boolean rf) throws Exception { body(prop, ex, type, ct, rf); }
    }

    public static void main(String[] args) throws Exception {
        List<String> out = new ArrayList<>();
        try (AnnotationConfigApplicationContext ctx = new AnnotationConfigApplicationContext(Cfg.class)) {
            JdbcTemplate j = ctx.getBean(JdbcTemplate.class);
            j.execute("create table orders(v int)");
            j.execute("create table logs(v int)");
            OrderService os = ctx.getBean(OrderService.class);
            out.add("# spring " + SpringVersion.getVersion() + " | proxy " + (os.getClass().getName().contains("CGLIB") ? "CGLIB" : os.getClass().getSimpleName()));
            for (String prop : new String[] { "REQUIRED", "REQUIRES_NEW", "NESTED" })
                for (String ex : new String[] { "none", "inner", "outer" })
                    for (String type : new String[] { "rt", "chk" })
                        for (boolean ct : new boolean[] { false, true })
                            for (boolean rfSet : new boolean[] { false, true }) {
                                // 화면의 코드와 같은 규칙: rollbackFor는 체크 예외일 때만, try-catch는 안쪽 예외일 때만 붙는다
                                boolean chk = !ex.equals("none") && type.equals("chk"), rf = chk && rfSet, doCatch = ex.equals("inner") && ct;
                                peak = 0;
                                String caller = "정상 반환";
                                try { if (rf) os.placeRf(prop, ex, type, doCatch, rf); else os.place(prop, ex, type, doCatch, rf); }
                                catch (Exception e) { caller = e.getClass().getSimpleName(); }
                                int orders = j.queryForObject("select count(*) from orders", Integer.class), logs = j.queryForObject("select count(*) from logs", Integer.class);
                                out.add(prop + "|" + ex + "|" + type + "|" + ct + "|" + rfSet + " => " + orders + "|" + logs + "|" + caller + "|" + peak);
                                j.update("delete from orders");
                                j.update("delete from logs");
                            }
        }
        Files.write(Path.of(args[0]), out, StandardCharsets.UTF_8);
        System.out.println(out.size() - 1 + " combos");
    }
}

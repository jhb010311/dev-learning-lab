import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import javax.sql.DataSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.AnnotationConfigApplicationContext;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Lazy;
import org.springframework.core.SpringVersion;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DataSourceTransactionManager;
import org.springframework.jdbc.datasource.DriverManagerDataSource;
import org.springframework.scheduling.annotation.Async;
import org.springframework.scheduling.annotation.EnableAsync;
import org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.annotation.EnableTransactionManagement;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronizationManager;

// "프록시와 자기 호출" 실습의 열 가지 조합을 실제 스프링(@Transactional, @Async 프록시)에서 실행한다.
// @Transactional: 메서드 안에서 트랜잭션이 실제로 열려 있었는지, 예외 뒤 DB에 몇 행이 남았는지.
// @Async: 메서드가 어느 스레드에서 실행됐는지, 호출한 쪽이 얼마나 기다렸는지(메일 발송 3초는 0.3초로 줄였다).
public class ProxyProbe {
    static volatile boolean txActive;
    static volatile String ranOn;
    static volatile CountDownLatch done;

    @Configuration
    @EnableTransactionManagement
    @EnableAsync
    public static class Cfg {
        @Bean public DataSource dataSource() { return new DriverManagerDataSource("jdbc:h2:mem:proxyprobe;DB_CLOSE_DELAY=-1"); }
        @Bean public PlatformTransactionManager transactionManager(DataSource ds) { return new DataSourceTransactionManager(ds); }
        @Bean public JdbcTemplate jdbc(DataSource ds) { return new JdbcTemplate(ds); }
        @Bean public ThreadPoolTaskExecutor taskExecutor() { ThreadPoolTaskExecutor e = new ThreadPoolTaskExecutor(); e.setCorePoolSize(2); e.setThreadNamePrefix("task-"); return e; }
    }

    static void insertTwoAndFail(JdbcTemplate j) {
        txActive = TransactionSynchronizationManager.isActualTransactionActive();
        j.update("insert into orders(v) values ('A')");
        j.update("insert into orders(v) values ('B')");
        throw new IllegalStateException("도중에 실패");
    }
    static void slowMail() {
        ranOn = Thread.currentThread().getName();
        try { Thread.sleep(300); } catch (InterruptedException e) { Thread.currentThread().interrupt(); }
        done.countDown();
    }

    @Service
    public static class OrderWriter {
        @Autowired JdbcTemplate j;
        @Transactional public void saveAll() { insertTwoAndFail(j); }
    }
    @Service
    public static class OrderService {
        @Autowired JdbcTemplate j;
        @Autowired @Lazy OrderService self;
        @Autowired OrderWriter writer;
        @Transactional public void saveAll() { insertTwoAndFail(j); }
        @Transactional private void savePrivate() { insertTwoAndFail(j); }
        public void placeOrderSelf() { saveAll(); }
        public void placeOrderPriv() { savePrivate(); }
        public void placeOrderInject() { self.saveAll(); }
        public void placeOrderSplit() { writer.saveAll(); }
    }
    @Service
    public static class MailSender {
        @Async public void sendMail() { slowMail(); }
    }
    @Service
    public static class MailService {
        @Autowired @Lazy MailService self;
        @Autowired MailSender sender;
        @Async public void sendMail() { slowMail(); }
        @Async private void sendPrivate() { slowMail(); }
        public void placeOrderSelf() { sendMail(); }
        public void placeOrderPriv() { sendPrivate(); }
        public void placeOrderInject() { self.sendMail(); }
        public void placeOrderSplit() { sender.sendMail(); }
    }

    public static void main(String[] args) throws Exception {
        List<String> out = new ArrayList<>();
        try (AnnotationConfigApplicationContext ctx = new AnnotationConfigApplicationContext(Cfg.class, OrderWriter.class, OrderService.class, MailSender.class, MailService.class)) {
            JdbcTemplate j = ctx.getBean(JdbcTemplate.class);
            j.execute("create table orders(v varchar(10))");
            OrderService os = ctx.getBean(OrderService.class);
            MailService ms = ctx.getBean(MailService.class);
            out.add("# spring " + SpringVersion.getVersion() + " | OrderService 빈의 실제 클래스에 CGLIB 포함: " + os.getClass().getName().contains("CGLIB"));
            for (String path : new String[] { "ext", "self", "priv", "inject", "split" }) {
                txActive = false;
                try {
                    switch (path) {
                        case "ext" -> os.saveAll();
                        case "self" -> os.placeOrderSelf();
                        case "priv" -> os.placeOrderPriv();
                        case "inject" -> os.placeOrderInject();
                        default -> os.placeOrderSplit();
                    }
                } catch (IllegalStateException expected) { }
                int rows = j.queryForObject("select count(*) from orders", Integer.class);
                out.add("tx|" + path + " => txActive=" + txActive + "|rows=" + rows);
                j.update("delete from orders");
            }
            String caller = Thread.currentThread().getName();
            for (String path : new String[] { "ext", "self", "priv", "inject", "split" }) {
                done = new CountDownLatch(1); ranOn = null;
                long t0 = System.nanoTime();
                switch (path) {
                    case "ext" -> ms.sendMail();
                    case "self" -> ms.placeOrderSelf();
                    case "priv" -> ms.placeOrderPriv();
                    case "inject" -> ms.placeOrderInject();
                    default -> ms.placeOrderSplit();
                }
                long waited = (System.nanoTime() - t0) / 1_000_000;
                done.await(5, TimeUnit.SECONDS);
                out.add("async|" + path + " => otherThread=" + !caller.equals(ranOn) + "|thread=" + ranOn + "|callerWaitedMs=" + waited);
            }
        }
        Files.write(Path.of(args[0]), out, StandardCharsets.UTF_8);
        out.forEach(System.out::println);
    }
}

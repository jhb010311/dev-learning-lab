import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.ResultSet;
import java.sql.Statement;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.atomic.AtomicReference;

// "격리 수준" 실습의 열두 가지 조합(장면 3 × 격리 수준 4)을 실제 MySQL 8.4(InnoDB)에서 세션 두 개로 실행한다.
// 한쪽이 락을 기다리는지는, 그 문장을 다른 스레드에서 실행하고 0.8초 뒤에도 끝나지 않았는지로 판단한다.
public class IsoProbe {
    static final String URL = "jdbc:mysql://127.0.0.1:3307/lab?allowPublicKeyRetrieval=true&useSSL=false";
    static Connection open() throws Exception { return DriverManager.getConnection(URL, "root", "labtest"); }
    static String one(Connection c, String sql) throws Exception { try (Statement s = c.createStatement(); ResultSet r = s.executeQuery(sql)) { r.next(); return r.getString(1); } }
    static void exec(Connection c, String sql) throws Exception { try (Statement s = c.createStatement()) { s.execute(sql); } }
    static int level(String lv) { return switch (lv) { case "RU" -> Connection.TRANSACTION_READ_UNCOMMITTED; case "RC" -> Connection.TRANSACTION_READ_COMMITTED; case "RR" -> Connection.TRANSACTION_REPEATABLE_READ; default -> Connection.TRANSACTION_SERIALIZABLE; }; }

    public static void main(String[] args) throws Exception {
        Connection admin = null;
        for (int i = 0; i < 60 && admin == null; i++) { try { admin = open(); } catch (Exception e) { Thread.sleep(2000); } }
        if (admin == null) throw new IllegalStateException("MySQL에 연결하지 못했습니다");
        List<String> out = new ArrayList<>();
        out.add("# mysql " + one(admin, "select version()") + " | 기본 격리 수준 " + one(admin, "select @@transaction_isolation"));
        exec(admin, "drop table if exists account"); exec(admin, "drop table if exists orders");
        exec(admin, "create table account(id int primary key, balance int) engine=InnoDB");
        exec(admin, "create table orders(id int primary key auto_increment, amount int, key idx_amount(amount)) engine=InnoDB");
        final String COUNT = "select count(*) from orders where amount >= 100";
        for (String sc : new String[] { "dirty", "nonrep", "phantom" })
            for (String lv : new String[] { "RU", "RC", "RR", "SER" }) {
                exec(admin, "delete from account"); exec(admin, "insert into account values (1, 1000)");
                exec(admin, "delete from orders"); exec(admin, "insert into orders(amount) values (50), (100), (150), (300)");
                String first = "-", second = "-", waited = "없음";
                try (Connection a = open(); Connection b = open()) {
                    a.setTransactionIsolation(level(lv)); a.setAutoCommit(false); b.setAutoCommit(false);
                    if (sc.equals("dirty")) {
                        exec(b, "update account set balance = 500 where id = 1");
                        AtomicReference<String> got = new AtomicReference<>();
                        Thread t = new Thread(() -> { try { got.set(one(a, "select balance from account where id = 1")); } catch (Exception e) { got.set("ERR " + e.getMessage()); } });
                        t.start(); t.join(800);
                        if (t.isAlive()) waited = "A가 기다림";
                        b.rollback(); t.join(10000);
                        first = got.get(); a.commit();
                    } else {
                        boolean ph = sc.equals("phantom");
                        first = ph ? one(a, COUNT) + "건" : one(a, "select balance from account where id = 1");
                        AtomicReference<String> err = new AtomicReference<>();
                        Thread t = new Thread(() -> { try { exec(b, ph ? "insert into orders(amount) values (200)" : "update account set balance = 500 where id = 1"); b.commit(); } catch (Exception e) { err.set(e.getMessage()); } });
                        t.start(); t.join(800);
                        if (t.isAlive()) waited = "B가 기다림";
                        second = ph ? one(a, COUNT) + "건" : one(a, "select balance from account where id = 1");
                        a.commit(); t.join(10000);
                        if (err.get() != null) second += " (B 오류: " + err.get() + ")";
                    }
                }
                String after = sc.equals("phantom") ? one(admin, COUNT) + "건" : one(admin, "select balance from account where id = 1");
                out.add(sc + "|" + lv + " => " + first + "|" + second + "|" + waited + "|끝난 뒤 " + after);
            }
        admin.close();
        Files.write(Path.of(args[0]), out, StandardCharsets.UTF_8);
        out.forEach(System.out::println);
    }
}

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

// "갭 락과 넥스트 키 락" 실습의 열두 가지 조합을 실제 MySQL 8.4(InnoDB)에서 세션 두 개로 실행한다.
// A가 잡은 락은 performance_schema.data_locks에서 그대로 읽고, B의 INSERT가 기다리는지는 0.8초 뒤에도 끝나지 않았는지로 판단한다.
public class GapProbe {
    static final String URL = "jdbc:mysql://127.0.0.1:3307/lab?allowPublicKeyRetrieval=true&useSSL=false";
    static Connection open() throws Exception { return DriverManager.getConnection(URL, "root", "labtest"); }
    static void exec(Connection c, String sql) throws Exception { try (Statement s = c.createStatement()) { s.execute(sql); } }
    static List<String> list(Connection c, String sql) throws Exception { List<String> r = new ArrayList<>(); try (Statement s = c.createStatement(); ResultSet rs = s.executeQuery(sql)) { while (rs.next()) r.add(rs.getString(1)); } return r; }

    public static void main(String[] args) throws Exception {
        List<String> out = new ArrayList<>();
        final boolean filled = args.length > 1 && args[1].equals("filled");
        try (Connection admin = open()) {
            out.add("# mysql " + list(admin, "select version()").get(0) + (filled ? " | 행 10, 20, 30, 40과 멀리 떨어진 행 500개(1001~1500)" : " | 행 10, 20, 30, 40뿐인 테이블"));
            exec(admin, "drop table if exists coupon");
            exec(admin, "create table coupon(id int primary key) engine=InnoDB");
            for (String q : new String[] { "hit", "miss", "range" })
                for (String lv : new String[] { "RR", "RC" })
                    for (String ins : new String[] { "25", "45" }) {
                        // 지운 행의 흔적(삭제 표시만 된 레코드)이 락 목록에 섞이지 않도록 조합마다 테이블을 새로 만든다
                        exec(admin, "drop table if exists coupon"); exec(admin, "create table coupon(id int primary key) engine=InnoDB"); exec(admin, "insert into coupon values (10), (20), (30), (40)");
                        // filled: 멀리 떨어진 행 500개를 더 넣어, 조회 범위가 테이블의 일부일 때의 실행 계획(범위 탐색)이 되게 한다
                        if (filled) { exec(admin, "insert into coupon with recursive s(n) as (select 1 union all select n + 1 from s where n < 500) select 1000 + n from s"); exec(admin, "analyze table coupon"); }
                        String where = switch (q) { case "hit" -> "id = 20"; case "miss" -> "id = 25"; default -> "id between 20 and 30"; };
                        String select = "select id from coupon where " + where + " for update";
                        try (Connection a = open(); Connection b = open()) {
                            a.setTransactionIsolation(lv.equals("RR") ? Connection.TRANSACTION_REPEATABLE_READ : Connection.TRANSACTION_READ_COMMITTED);
                            a.setAutoCommit(false); b.setAutoCommit(false);
                            String plan = list(admin, "explain format=tree " + select.replace(" for update", "")).get(0).trim();
                            List<String> firstRows = list(a, select);
                            List<String> locks = list(admin, "select concat(lock_mode, '@', lock_data) from performance_schema.data_locks where object_name = 'coupon' and lock_type = 'RECORD' order by lock_data");
                            AtomicReference<String> err = new AtomicReference<>();
                            Thread t = new Thread(() -> { try { exec(b, "insert into coupon values (" + ins + ")"); b.commit(); } catch (Exception e) { err.set(e.getMessage()); } });
                            t.start(); t.join(800);
                            boolean blocked = t.isAlive();
                            List<String> secondRows = list(a, select);   // B가 끼어들었다면 같은 조회의 결과가 달라진다
                            a.commit(); t.join(10000);
                            out.add(q + "|" + lv + "|" + ins + " => plan=" + (plan.contains("(cost") ? plan.substring(0, plan.indexOf("(cost")).trim() : plan) + "|locks=" + String.join(",", locks) + "|blocked=" + blocked + "|first=" + String.join(",", firstRows) + "|second=" + String.join(",", secondRows) + (err.get() != null ? "|err=" + err.get() : ""));
                        }
                    }
        }
        Files.write(Path.of(args[0]), out, StandardCharsets.UTF_8);
        out.forEach(System.out::println);
    }
}

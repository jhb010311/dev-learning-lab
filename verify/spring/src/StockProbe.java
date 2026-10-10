import java.io.InputStream;
import java.io.OutputStream;
import java.net.Socket;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.ResultSet;
import java.sql.Statement;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.atomic.AtomicInteger;

// "재고 차감과 락" 실습의 다섯 가지 방법을 실제 MySQL 8.4(분산 락은 실제 Redis)에서, 주문마다 DB 세션을 따로 열어 실행한다.
// 모형과 같은 "가장 나쁘게 겹치는 순서"가 되도록 순서를 맞춘다: 모두가 먼저 읽은 다음에 쓴다.
public class StockProbe {
    static final String URL = "jdbc:mysql://127.0.0.1:3307/lab?allowPublicKeyRetrieval=true&useSSL=false";
    static Connection open() throws Exception { return DriverManager.getConnection(URL, "root", "labtest"); }
    static int num(Connection c, String sql) throws Exception { try (Statement s = c.createStatement(); ResultSet r = s.executeQuery(sql)) { r.next(); return r.getInt(1); } }
    static int[] two(Connection c, String sql) throws Exception { try (Statement s = c.createStatement(); ResultSet r = s.executeQuery(sql)) { r.next(); return new int[] { r.getInt(1), r.getInt(2) }; } }
    static int upd(Connection c, String sql) throws Exception { try (Statement s = c.createStatement()) { return s.executeUpdate(sql); } }

    // Redis에 명령 하나를 보내고 첫 줄을 돌려받는다 (SET ... NX의 성공은 +OK, 실패는 $-1)
    static String redis(String... parts) throws Exception {
        try (Socket so = new Socket("127.0.0.1", 6380)) {
            StringBuilder sb = new StringBuilder("*" + parts.length + "\r\n");
            for (String p : parts) sb.append('$').append(p.getBytes(StandardCharsets.UTF_8).length).append("\r\n").append(p).append("\r\n");
            OutputStream o = so.getOutputStream(); o.write(sb.toString().getBytes(StandardCharsets.UTF_8)); o.flush();
            InputStream in = so.getInputStream(); StringBuilder line = new StringBuilder(); int ch;
            while ((ch = in.read()) != -1 && ch != '\n') if (ch != '\r') line.append((char) ch);
            return line.toString();
        }
    }

    public static void main(String[] args) throws Exception {
        List<String> out = new ArrayList<>();
        try (Connection admin = open()) {
            out.add("# mysql " + num(admin, "select 1") + " ok | redis " + redis("PING"));
            upd(admin, "drop table if exists stock"); upd(admin, "drop table if exists stock_order");
            upd(admin, "create table stock(id int primary key, qty int, version int) engine=InnoDB");
            upd(admin, "create table stock_order(id int primary key auto_increment, who int) engine=InnoDB");
            for (String how : new String[] { "none", "pess", "opt", "atomic", "dist" })
                for (int s : new int[] { 1, 3, 5 })
                    for (int n : new int[] { 2, 4, 6 }) {
                        upd(admin, "delete from stock"); upd(admin, "delete from stock_order"); upd(admin, "insert into stock values (1, " + s + ", 0)");
                        redis("DEL", "lock:stock");
                        AtomicInteger waits = new AtomicInteger(), retries = new AtomicInteger();
                        List<Connection> cs = new ArrayList<>();
                        for (int i = 0; i < n; i++) cs.add(open());
                        if (how.equals("none")) {
                            int[] read = new int[n];
                            for (int i = 0; i < n; i++) read[i] = num(cs.get(i), "select qty from stock where id = 1");   // 모두가 먼저 읽는다
                            for (int i = 0; i < n; i++) if (read[i] > 0) { upd(cs.get(i), "update stock set qty = " + (read[i] - 1) + " where id = 1"); upd(cs.get(i), "insert into stock_order(who) values (" + i + ")"); }
                        } else if (how.equals("atomic")) {
                            for (int i = 0; i < n; i++) if (upd(cs.get(i), "update stock set qty = qty - 1 where id = 1 and qty > 0") == 1) upd(cs.get(i), "insert into stock_order(who) values (" + i + ")");
                        } else if (how.equals("opt")) {
                            List<Integer> active = new ArrayList<>();
                            for (int i = 0; i < n; i++) active.add(i);
                            while (!active.isEmpty()) {
                                List<int[]> read = new ArrayList<>();
                                for (int i : active) read.add(two(cs.get(i), "select qty, version from stock where id = 1"));   // 남은 요청이 한꺼번에 다시 읽는다
                                List<Integer> next = new ArrayList<>();
                                for (int k = 0; k < active.size(); k++) {
                                    int i = active.get(k); int[] r = read.get(k);
                                    if (r[0] <= 0) continue;   // 품절: 포기
                                    if (upd(cs.get(i), "update stock set qty = " + (r[0] - 1) + ", version = version + 1 where id = 1 and version = " + r[1]) == 1) upd(cs.get(i), "insert into stock_order(who) values (" + i + ")");
                                    else { retries.incrementAndGet(); next.add(i); }
                                }
                                active = next;
                            }
                        } else {
                            // 비관적 락과 분산 락: 첫 요청이 락을 쥐고 있는 동안 나머지가 모두 시도하게 한 뒤 풀어 준다
                            boolean dist = how.equals("dist");
                            CountDownLatch firstHas = new CountDownLatch(1), release = new CountDownLatch(1), othersTried = new CountDownLatch(n - 1);
                            List<Thread> ts = new ArrayList<>();
                            for (int i = 0; i < n; i++) {
                                final int me = i; final Connection c = cs.get(i);
                                Thread t = new Thread(() -> {
                                    try {
                                        int qty;
                                        if (dist) {
                                            boolean first = true;
                                            while (!redis("SET", "lock:stock", "req" + me, "NX", "PX", "10000").equals("+OK")) { if (first) { waits.incrementAndGet(); othersTried.countDown(); first = false; } Thread.sleep(40); }
                                            if (me == 0) { firstHas.countDown(); release.await(); }
                                            qty = num(c, "select qty from stock where id = 1");
                                            if (qty > 0) { upd(c, "update stock set qty = " + (qty - 1) + " where id = 1"); upd(c, "insert into stock_order(who) values (" + me + ")"); }
                                            redis("DEL", "lock:stock");
                                        } else {
                                            c.setAutoCommit(false);
                                            if (me != 0) othersTried.countDown();
                                            qty = num(c, "select qty from stock where id = 1 for update");
                                            if (me == 0) { firstHas.countDown(); release.await(); }
                                            if (qty > 0) { upd(c, "update stock set qty = " + (qty - 1) + " where id = 1"); upd(c, "insert into stock_order(who) values (" + me + ")"); }
                                            c.commit();
                                        }
                                    } catch (Exception e) { throw new RuntimeException(e); }
                                });
                                ts.add(t);
                            }
                            ts.get(0).start(); firstHas.await();
                            for (int i = 1; i < n; i++) ts.get(i).start();
                            othersTried.await(); Thread.sleep(700);
                            if (!dist) waits.set(num(admin, "select count(distinct requesting_engine_transaction_id) from performance_schema.data_lock_waits"));   // 지금 락을 기다리는 세션 수(대기 관계가 아니라 기다리는 쪽을 센다)
                            release.countDown();
                            for (Thread t : ts) t.join(20000);
                        }
                        for (Connection c : cs) c.close();
                        int orders = num(admin, "select count(*) from stock_order"), qty = num(admin, "select qty from stock where id = 1");
                        out.add(how + "|" + s + "|" + n + " => " + orders + "|" + qty + "|" + waits.get() + "|" + retries.get());
                    }
        }
        Files.write(Path.of(args[0]), out, StandardCharsets.UTF_8);
        System.out.println(out.get(0) + " | " + (out.size() - 1) + " combos");
    }
}

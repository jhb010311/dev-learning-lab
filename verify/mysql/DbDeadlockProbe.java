import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.atomic.AtomicLong;

// "DB의 교착 상태" 실습의 조합을 실제 MySQL 8.4(InnoDB)에서 세션 두 개(A, B)로 실행한다.
// 계좌 1과 2의 잔액은 1000씩. A는 1에서 2로 100을, B는 2에서 1로 50을 옮긴다.
// 출력 한 줄: 상황|일의 양|대응 => A의 오류 코드|B의 오류 코드|오류 직후 그 트랜잭션에 남은 것|계좌 1 잔액|계좌 2 잔액|부가 정보
public class DbDeadlockProbe {
    static final String BASE = "jdbc:mysql://127.0.0.1:3307/", OPT = "?allowPublicKeyRetrieval=true&useSSL=false";
    static Connection open(String db) throws Exception { return DriverManager.getConnection(BASE + db + OPT, "root", "labtest"); }
    static void exec(Connection c, String sql) throws Exception { try (Statement s = c.createStatement()) { s.execute(sql); } }
    static String one(Connection c, String sql) throws Exception { try (Statement s = c.createStatement(); ResultSet r = s.executeQuery(sql)) { return r.next() ? r.getString(1) : ""; } }

    static final String A1 = "update account set balance = balance - 100 where id = 1", A2 = "update account set balance = balance + 100 where id = 2";
    static final String B_REV1 = "update account set balance = balance - 50 where id = 2", B_REV2 = "update account set balance = balance + 50 where id = 1";
    static final String B_SAME1 = "update account set balance = balance + 50 where id = 1", B_SAME2 = "update account set balance = balance - 50 where id = 2";

    // 문장 하나를 다른 스레드에서 실행한다. 오류 코드(없으면 0)와 걸린 시간을 남긴다.
    static Thread run(Connection c, String sql, AtomicInteger err, AtomicLong ms) {
        Thread t = new Thread(() -> { long s = System.nanoTime(); try { exec(c, sql); } catch (SQLException e) { err.set(e.getErrorCode()); } catch (Exception e) { err.set(-1); } ms.set((System.nanoTime() - s) / 1_000_000); });
        t.start(); return t;
    }
    // 그 세션이 지금 행 락을 기다리는지. information_schema.innodb_trx는 '마지막으로 읽힌 뒤 0.1초'가 지나야 새로 고쳐지므로
    // 짧은 간격으로 되풀이해 읽으면 옛 내용만 보인다. 그래서 기다림은 performance_schema.data_lock_waits로 확인한다.
    static void waitUntilWaiting(Connection admin, String connId) throws Exception {
        for (int i = 0; i < 100; i++) { if (!one(admin, "select count(*) from performance_schema.data_lock_waits w join performance_schema.threads t on t.thread_id = w.requesting_thread_id where t.processlist_id = " + connId).equals("0")) return; Thread.sleep(30); }
        throw new IllegalStateException("기다리는 상태가 되지 않음");
    }
    static String weight(Connection admin, String connId) throws Exception { Thread.sleep(250); return one(admin, "select concat(trx_weight, '(', trx_state, ')') from information_schema.innodb_trx where trx_mysql_thread_id = " + connId); }
    // 그 세션의 트랜잭션이 아직 살아 있는지: 쥐고 있는 레코드 락 수(performance_schema)와 고친 행 수(innodb_trx, 참고용)
    static String alive(Connection admin, String connId) throws Exception {
        String locks = one(admin, "select count(*) from performance_schema.data_locks l join performance_schema.threads t on t.thread_id = l.thread_id where t.processlist_id = " + connId + " and l.lock_type = 'RECORD' and l.lock_status = 'GRANTED'");
        Thread.sleep(250);
        String mod = one(admin, "select coalesce(sum(trx_rows_modified), 0) from information_schema.innodb_trx where trx_mysql_thread_id = " + connId);
        return "record_locks=" + locks + ",rows_modified=" + mod;
    }

    static String combo(Connection admin, String sit, String heavy, String after, boolean verbose) throws Exception {
        // 조합마다 테이블을 새로 만든다 (지운 행의 흔적이 락 목록에 섞이지 않게)
        exec(admin, "drop table if exists account");
        exec(admin, "create table account(id int primary key, balance int not null, memo varchar(10)) engine=InnoDB");
        exec(admin, "insert into account values (1, 1000, null), (2, 1000, null)");
        exec(admin, "insert into account with recursive s(n) as (select 101 union all select n + 1 from s where n < 250) select n, 0, null from s");
        int errA = 0, errB = 0; String kept = "-", extra = "";
        try (Connection a = open("lab_dbdeadlock"); Connection b = open("lab_dbdeadlock")) {
            a.setAutoCommit(false); b.setAutoCommit(false);
            int timeout = sit.equals("hold") ? 2 : 20;   // 세션에만 적용되는 값. 기본값은 50초
            exec(a, "set session innodb_lock_wait_timeout = " + timeout); exec(b, "set session innodb_lock_wait_timeout = " + timeout);
            String ida = one(a, "select connection_id()"), idb = one(b, "select connection_id()");
            // 교착 전에 한 일의 양: B가 교착과 상관없는 다른 행 50개를 먼저 고친다
            if (heavy.equals("b")) exec(b, "update account set memo = 'B' where id between 201 and 250");
            AtomicInteger ea = new AtomicInteger(), eb = new AtomicInteger(); AtomicLong ma = new AtomicLong(), mb = new AtomicLong();
            if (sit.equals("same")) {
                exec(a, A1);
                Thread tb = run(b, B_SAME1, eb, mb); waitUntilWaiting(admin, idb);
                String waiters = one(admin, "select count(distinct requesting_engine_transaction_id) from performance_schema.data_lock_waits");
                exec(a, A2); a.commit(); tb.join(10000);
                errB = eb.get(); if (errB == 0) { exec(b, B_SAME2); b.commit(); }
                extra = "B가 기다린 시간(ms)=" + mb.get() + ",대기 중인 트랜잭션 수=" + waiters;
            } else if (sit.equals("rev")) {
                exec(a, A1); exec(b, B_REV1);
                Thread ta = run(a, A2, ea, ma); waitUntilWaiting(admin, ida);
                String wa = weight(admin, ida), wb = weight(admin, idb);
                long t0 = System.nanoTime();
                Thread tb = run(b, B_REV2, eb, mb);
                ta.join(15000); tb.join(15000);
                long both = (System.nanoTime() - t0) / 1_000_000;   // B가 두 번째 UPDATE를 보낸 때부터 양쪽 문장이 모두 끝날 때까지
                errA = ea.get(); errB = eb.get();
                boolean victimA = errA != 0;
                Connection v = victimA ? a : b, s = victimA ? b : a; String idv = victimA ? ida : idb;
                String al = alive(admin, idv);
                String own = one(v, "select balance from account where id = " + (victimA ? 1 : 2));   // 오류를 받은 쪽이 자기가 고쳤던 행을 다시 읽는다
                kept = own.equals("1000") ? "rolledback" : "kept";
                extra = "오류까지 걸린 시간(ms)=" + both + ",락 대기 제한(초)=" + timeout + ",trx_weight A=" + wa + " B=" + wb + ",오류 직후 " + al + ",자기가 고친 행을 다시 읽은 값=" + own;
                s.commit();
                finish(v, after, victimA ? new String[] { A1, A2 } : new String[] { B_REV1, B_REV2 });
            } else {
                exec(a, A1); exec(b, B_REV1);
                Thread tb = run(b, B_REV2, eb, mb); waitUntilWaiting(admin, idb);
                String waiters = one(admin, "select count(distinct requesting_engine_transaction_id) from performance_schema.data_lock_waits");
                tb.join(15000);
                errB = eb.get();
                String al = alive(admin, idb);
                String own = one(b, "select balance from account where id = 2");
                kept = own.equals("1000") ? "rolledback" : "kept";
                extra = "오류까지 걸린 시간(ms)=" + mb.get() + ",락 대기 제한(초)=" + timeout + ",대기 중인 트랜잭션 수=" + waiters + ",오류 직후 " + al + ",자기가 고친 행을 다시 읽은 값=" + own;
                // B가 대응한 뒤에 A가 뒤늦게 나머지를 실행한다. retry는 A가 끝난 뒤에 다시 시도한다.
                if (after.equals("commit")) b.commit(); else b.rollback();
                exec(a, A2); a.commit();
                if (after.equals("retry")) { exec(b, B_REV1); exec(b, B_REV2); b.commit(); }
            }
        }
        String line = sit + "|" + heavy + "|" + after + " => " + errA + "|" + errB + "|" + kept + "|" + one(admin, "select balance from account where id = 1") + "|" + one(admin, "select balance from account where id = 2") + "|" + extra;
        if (verbose) System.out.println(line);
        return line;
    }
    static void finish(Connection v, String after, String[] redo) throws Exception {
        if (after.equals("commit")) { v.commit(); return; }
        v.rollback();
        if (after.equals("retry")) { exec(v, redo[0]); exec(v, redo[1]); v.commit(); }
    }

    public static void main(String[] args) throws Exception {
        List<String> out = new ArrayList<>();
        try (Connection root = open("")) { exec(root, "create database if not exists lab_dbdeadlock"); }
        try (Connection admin = open("lab_dbdeadlock")) {
            out.add("# mysql " + one(admin, "select version()") + " | innodb_deadlock_detect=" + one(admin, "select @@innodb_deadlock_detect") + " | innodb_lock_wait_timeout 기본값=" + one(admin, "select @@global.innodb_lock_wait_timeout") + " | innodb_rollback_on_timeout=" + one(admin, "select @@innodb_rollback_on_timeout") + " | 격리 수준=" + one(admin, "select @@transaction_isolation"));
            for (String heavy : new String[] { "eq", "b" }) for (String after : new String[] { "giveup", "retry", "commit" }) out.add(combo(admin, "rev", heavy, after, true));
            out.add(combo(admin, "same", "eq", "giveup", true));
            for (String after : new String[] { "giveup", "retry", "commit" }) out.add(combo(admin, "hold", "eq", after, true));
            // 어느 쪽이 롤백되는지: 같은 조합을 여러 번 되풀이해 센다
            for (String heavy : new String[] { "eq", "b" }) {
                int n = 30, va = 0, vb = 0;
                for (int i = 0; i < n; i++) { String l = combo(admin, "rev", heavy, "giveup", false); String[] p = l.split(" => ")[1].split("\\|"); if (!p[0].equals("0")) va++; if (!p[1].equals("0")) vb++; }
                out.add("# repeat " + heavy + ": " + n + "번 되풀이, A가 롤백된 횟수=" + va + ", B가 롤백된 횟수=" + vb);
            }
            exec(admin, "drop table if exists account");
        }
        Files.write(Path.of(args[0]), out, StandardCharsets.UTF_8);
        out.stream().filter(l -> l.startsWith("#")).forEach(System.out::println);
    }
}

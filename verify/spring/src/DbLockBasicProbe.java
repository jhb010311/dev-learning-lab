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

// 기초개념 "행 잠금" 실습을 실제 DB(H2 2.4.240, 메모리 DB, JDBC)에서 확인한다. 스프링은 쓰지 않는다.
// 조합마다 DB를 새로 만들고(이름을 주고 DB_CLOSE_DELAY=-1로 여러 연결이 같은 DB를 보게 한다),
// 화면에 보이는 SQL 전체(주석 줄 포함)를 만든 뒤 "-- 연결 A" / "-- 연결 B" 구역으로 나눠, 연결 A와 연결 B(스레드)가 각자의 구역을 실행한다.
// 실행 차례는 화면이 말하는 그대로다: A의 BEGIN, UPDATE -> B의 BEGIN, UPDATE 시도 -> (A의 COMMIT이 있으면 그것) -> B의 나머지.
//   row : B가 고치는 행. same(id 1, A가 고치는 행과 같음) / other(id 2)
//   end : A가 묶음을 끝내는 방법. commit(COMMIT) / hold(COMMIT을 적지 않고 계속 붙잡고 있음)
// 화면의 코드에는 없는 확인용 조회는 연결 C가 한다(읽기가 기다리는지, 마지막 잔액).
// H2의 잠금 대기 시간(LOCK_TIMEOUT)은 연결 B에서 1000ms로 줄여 둔다(기본은 2000ms). 이 설정도 화면의 코드에는 없다.
public class DbLockBasicProbe {
    static final int LOCK_TIMEOUT_MS = 1000;

    // 화면의 코드와 같은 글. 줄바꿈 \n 으로 이어 붙인다(마지막 줄 뒤에는 줄바꿈 없음).
    static String sql(String row, String end) {
        List<String> l = new ArrayList<>();
        l.add("CREATE TABLE account (id INT PRIMARY KEY, balance INT);");
        l.add("INSERT INTO account VALUES (1, 1000), (2, 1000);");
        l.add("");
        l.add("-- 연결 A (먼저 실행)");
        l.add("BEGIN;");
        l.add("-- 고치는 행에 잠금이 걸리고, 이 묶음이 끝날 때까지 유지된다");
        l.add("UPDATE account SET balance = balance - 100 WHERE id = 1;");
        if (end.equals("commit")) {
            l.add("-- 끝: 묶음을 확정하고 잠금을 푼다");
            l.add("COMMIT;");
        }
        l.add("");
        l.add("-- 연결 B (A의 UPDATE 다음에 실행)");
        l.add("BEGIN;");
        l.add("-- 고치려는 행에 다른 연결의 잠금이 있는지 DB가 먼저 본다");
        l.add("UPDATE account SET balance = balance + 50 WHERE id = " + (row.equals("same") ? "1" : "2") + ";");
        l.add("COMMIT;");
        return String.join("\n", l);
    }

    static String clean(String s) { return s == null ? "" : s.replace('|', '¦').replace("\r", "").replace("\n", "\\n"); }
    static String first(String s) { return s == null ? "" : s.split("\n")[0]; }
    static long ms(long from, long to) { return (to - from) / 1_000_000L; }

    // 구역 하나의 문장들: 주석 줄과 빈 줄을 빼고 ;로 자른다
    static List<String> stmts(List<String> lines) {
        StringBuilder b = new StringBuilder();
        for (String ln : lines) if (!ln.strip().startsWith("--") && !ln.isBlank()) b.append(ln).append(' ');
        List<String> r = new ArrayList<>();
        for (String s : b.toString().split(";")) if (!s.isBlank()) r.add(s.strip());
        return r;
    }

    static String rows(Connection c) throws SQLException {
        List<String> r = new ArrayList<>();
        try (Statement st = c.createStatement(); ResultSet rs = st.executeQuery("SELECT * FROM account ORDER BY id")) {
            while (rs.next()) r.add("(" + rs.getInt(1) + ", " + rs.getInt(2) + ")");
        }
        return String.join(", ", r);
    }

    static String bal(Connection c, int id) throws SQLException {
        try (Statement st = c.createStatement(); ResultSet rs = st.executeQuery("SELECT balance FROM account WHERE id = " + id)) { rs.next(); return rs.getString(1); }
    }

    static String err(SQLException e) {
        return "ERR|sqlstate=" + e.getSQLState() + "|code=" + e.getErrorCode() + "|msg=" + clean(first(e.getMessage()));
    }

    public static void main(String[] args) throws Exception {
        List<String> out = new ArrayList<>();
        String ver, iso;
        try (Connection c = DriverManager.getConnection("jdbc:h2:mem:dblock_basic_ver"); Statement st = c.createStatement()) {
            ver = c.getMetaData().getDatabaseProductName() + " " + c.getMetaData().getDatabaseProductVersion();
            try (ResultSet rs = st.executeQuery("SELECT ISOLATION_LEVEL FROM INFORMATION_SCHEMA.SESSIONS WHERE SESSION_ID = SESSION_ID()")) { rs.next(); iso = rs.getString(1); }
        }
        out.add("# " + ver + " | java " + System.getProperty("java.version") + " | isolation " + iso + " | B의 LOCK_TIMEOUT " + LOCK_TIMEOUT_MS + "ms");
        for (String row : new String[] { "same", "other" })
            for (String end : new String[] { "commit", "hold" }) {
                String script = sql(row, end);
                // 구역 나누기
                List<String> setup = new ArrayList<>(), secA = new ArrayList<>(), secB = new ArrayList<>(), cur = setup;
                for (String ln : script.split("\n")) {
                    if (ln.startsWith("-- 연결 A")) { cur = secA; continue; }
                    if (ln.startsWith("-- 연결 B")) { cur = secB; continue; }
                    cur.add(ln);
                }
                List<String> sSetup = stmts(setup), sA = stmts(secA), sB = stmts(secB);
                // 구역 안의 문장 위치를 이름으로 찾는다
                String aUpdate = sA.get(1), bUpdate = sB.get(1);
                boolean hasACommit = sA.size() == 3 && sA.get(2).equals("COMMIT");
                StringBuilder f = new StringBuilder();
                f.append("sql=").append(clean(script));
                f.append("|nA=").append(sA.size()).append("|nB=").append(sB.size()).append("|aHasCommit=").append(hasACommit);
                String url = "jdbc:h2:mem:dblock_basic_" + row + "_" + end + ";DB_CLOSE_DELAY=-1";
                Connection a = DriverManager.getConnection(url), b = DriverManager.getConnection(url), c = DriverManager.getConnection(url);
                try (Statement st = a.createStatement()) { for (String s : sSetup) st.execute(s); }
                try (Statement st = b.createStatement()) { st.execute("SET LOCK_TIMEOUT " + LOCK_TIMEOUT_MS); }
                f.append("|autoStart=").append(a.getAutoCommit());
                // 1. A: BEGIN, UPDATE
                try (Statement st = a.createStatement()) {
                    st.execute(sA.get(0));
                    f.append("|autoABegin=").append(a.getAutoCommit());
                    st.execute(aUpdate);
                }
                f.append("|aOwn1=").append(bal(a, 1));
                f.append("|cAfterA=").append(bal(c, 1)); // A가 고친 뒤 다른 연결이 읽는 값(확정 전)
                // 2. B: BEGIN, UPDATE 시도(스레드)
                try (Statement st = b.createStatement()) { st.execute(sB.get(0)); }
                f.append("|autoBBegin=").append(b.getAutoCommit());
                final long[] t = new long[3]; // 0 시작, 1 끝, 2 A의 COMMIT 시각
                final String[] bRes = { "" };
                final boolean[] bDone = { false };
                final long tStart = System.nanoTime();
                Thread th = new Thread(() -> {
                    try (Statement st = b.createStatement()) {
                        t[0] = System.nanoTime();
                        int n = st.executeUpdate(bUpdate);
                        t[1] = System.nanoTime();
                        bRes[0] = "OK|updated=" + n;
                    } catch (SQLException e) {
                        t[1] = System.nanoTime();
                        bRes[0] = err(e);
                    }
                    bDone[0] = true;
                });
                th.start();
                Thread.sleep(400);
                f.append("|bDoneAt400=").append(bDone[0]);
                // 이 사이(B가 기다리는 중이라면 기다리는 동안)에 다른 연결 C가 id 1을 읽는다
                long r0 = System.nanoTime();
                String cRead = bal(c, 1);
                long r1 = System.nanoTime();
                f.append("|cReadWhileB=").append(cRead).append("|cReadMs=").append(ms(r0, r1) < 200 ? "fast" : "slow(" + ms(r0, r1) + ")");
                f.append("|bDoneAfterRead=").append(bDone[0]);
                // 3. A의 COMMIT(있으면)
                if (hasACommit) {
                    try (Statement st = a.createStatement()) { st.execute(sA.get(2)); }
                    t[2] = System.nanoTime();
                    f.append("|autoAEnd=").append(a.getAutoCommit());
                }
                th.join(10_000);
                f.append("|bDone=").append(bDone[0]);
                f.append("|bUpdate=").append(bRes[0]);
                long bMs = ms(t[0], t[1]);
                f.append("|bMs=").append(bMs >= 300 ? "long" : "short");
                f.append("|bMsRaw=").append(bMs);
                if (hasACommit) f.append("|bEndedAfterACommit=").append(t[1] > t[2]);
                else f.append("|bEndedAfterACommit=none");
                f.append("|autoBAfterUpdate=").append(b.getAutoCommit());
                f.append("|bOwn1=").append(bal(b, 1)).append("|bOwn2=").append(bal(b, 2));
                // 4. B의 COMMIT
                try (Statement st = b.createStatement()) {
                    st.execute(sB.get(2));
                    f.append("|bCommit=OK|autoBEnd=").append(b.getAutoCommit());
                } catch (SQLException e) { f.append("|bCommit=").append(err(e)); }
                // 5. 마지막 잔액: 새 연결로 읽는다. 끝내지 않은 A는 아직 붙잡고 있는 채로 읽는다.
                try (Connection d = DriverManager.getConnection(url)) {
                    long q0 = System.nanoTime();
                    String fin = rows(d);
                    long q1 = System.nanoTime();
                    f.append("|final=").append(fin).append("|finalMs=").append(ms(q0, q1) < 200 ? "fast" : "slow(" + ms(q0, q1) + ")");
                }
                // 6. A를 닫은 뒤에도 같은지(끝내지 않은 A의 변경은 확정되지 않았다)
                a.close();
                try (Connection d = DriverManager.getConnection(url)) { f.append("|finalAfterClose=").append(rows(d)); }
                b.close(); c.close();
                out.add(row + "|" + end + " => " + f);
            }
        Files.write(Path.of(args[0]), out, StandardCharsets.UTF_8);
        System.out.println(out.get(0) + " | " + (out.size() - 1) + " combos");
        out.forEach(System.out::println);
    }
}

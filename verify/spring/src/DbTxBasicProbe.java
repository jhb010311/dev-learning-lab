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

// 기초개념 "트랜잭션" 실습을 실제 DB(H2 2.4.240, 메모리 DB, JDBC)에서 확인한다. 스프링은 쓰지 않는다.
// 조합마다 DB를 새로 만들고(이름을 주고 DB_CLOSE_DELAY=-1로 두 연결이 같은 DB를 보게 한다),
// 화면에 보이는 SQL 전체를 글자 그대로(주석 줄 포함) 연결 A에서 한 문장씩 실행한다.
// 별도로 연결 B를 미리 열어 두고, A가 문장을 실행할 때마다 B로 계좌 잔액을 읽는다(화면의 코드에는 없는 확인용 조회).
//   begin : 화면에 BEGIN 문장을 적는가 (H2 2.4.240은 START TRANSACTION을 받지 않아 BEGIN을 쓴다)
//   end   : commit(COMMIT) / rollback(ROLLBACK) / none(끝내는 문장 없이 A의 연결을 닫는다)
// 격리 수준은 H2 기본값 그대로 두고 값을 출력의 머리글에 남긴다.
// 적는 것: 실행한 SQL 전체, 문장마다 A와 B가 읽은 잔액, 자동 커밋 상태, 끝난 뒤 새 연결 C가 읽은 잔액, 오류.
public class DbTxBasicProbe {
    // 화면의 코드와 같은 글. 줄바꿈 \n 으로 이어 붙인다(마지막 줄 뒤에는 줄바꿈 없음).
    static String sql(boolean begin, String end) {
        List<String> l = new ArrayList<>();
        l.add("CREATE TABLE account (id INT PRIMARY KEY, balance INT);");
        l.add("INSERT INTO account VALUES (1, 1000), (2, 0);");
        l.add("");
        if (begin) {
            l.add("-- 시작: 여기서부터의 문장을 한 묶음으로 다룬다");
            l.add("BEGIN;");
        }
        l.add("UPDATE account SET balance = balance - 300 WHERE id = 1;");
        l.add("UPDATE account SET balance = balance + 300 WHERE id = 2;");
        if (end.equals("commit")) {
            l.add(begin ? "-- 끝: 묶음 전체를 확정한다" : "-- 묶음이 없어 확정할 것이 없다(두 UPDATE는 이미 확정됨)");
            l.add("COMMIT;");
        } else if (end.equals("rollback")) {
            l.add(begin ? "-- 끝: 묶음에서 한 일을 전부 취소한다" : "-- 묶음이 없어 취소할 것이 없다(두 UPDATE는 이미 확정됨)");
            l.add("ROLLBACK;");
        }
        l.add("");
        l.add("SELECT * FROM account ORDER BY id;");
        return String.join("\n", l);
    }

    static String clean(String s) { return s == null ? "" : s.replace('|', '¦').replace("\r", "").replace("\n", "\\n"); }

    // 화면의 코드에는 없는 확인용 조회. 기다리거나 실패하면 그 사실을 적는다.
    static String bal(Connection c, int id) {
        try (Statement st = c.createStatement()) {
            st.setQueryTimeout(3);
            try (ResultSet rs = st.executeQuery("SELECT balance FROM account WHERE id = " + id)) { rs.next(); return rs.getString(1); }
        } catch (SQLException e) { return "기다림(" + clean(e.getMessage() == null ? "" : e.getMessage().split("\n")[0]) + ")"; }
    }

    static String both(Connection c) { return bal(c, 1) + "," + bal(c, 2); }

    static String kind(String stmt) {
        StringBuilder b = new StringBuilder();
        for (String ln : stmt.split("\n")) if (!ln.strip().startsWith("--")) b.append(ln).append(' ');
        return b.toString().strip().split("\\s+")[0].toUpperCase();
    }

    static String rows(Statement st, String sqlText) throws SQLException {
        List<String> r = new ArrayList<>();
        try (ResultSet rs = st.executeQuery(sqlText)) {
            while (rs.next()) r.add("(" + rs.getInt(1) + ", " + rs.getInt(2) + ")");
        }
        return String.join(", ", r);
    }

    public static void main(String[] args) throws Exception {
        List<String> out = new ArrayList<>();
        String ver, iso;
        try (Connection c = DriverManager.getConnection("jdbc:h2:mem:dbtx_basic_ver"); Statement st = c.createStatement()) {
            ver = c.getMetaData().getDatabaseProductName() + " " + c.getMetaData().getDatabaseProductVersion();
            try (ResultSet rs = st.executeQuery("SELECT ISOLATION_LEVEL FROM INFORMATION_SCHEMA.SESSIONS WHERE SESSION_ID = SESSION_ID()")) { rs.next(); iso = rs.getString(1) + " (JDBC " + c.getTransactionIsolation() + ")"; }
        }
        out.add("# " + ver + " | java " + System.getProperty("java.version") + " | isolation " + iso);
        for (boolean begin : new boolean[] { false, true })
            for (String end : new String[] { "commit", "rollback", "none" }) {
                String script = sql(begin, end);
                List<String> stmts = new ArrayList<>();
                for (String s : script.split(";")) if (!s.isBlank()) stmts.add(s.strip());
                StringBuilder f = new StringBuilder();
                f.append("sql=").append(clean(script));
                String url = "jdbc:h2:mem:dbtx_basic_" + begin + "_" + end + ";DB_CLOSE_DELAY=-1";
                Connection a = DriverManager.getConnection(url), b = DriverManager.getConnection(url);
                f.append("|autoStart=").append(a.getAutoCommit());
                int upd = 0;
                try (Statement st = a.createStatement()) {
                    for (String s : stmts) {
                        String k = kind(s);
                        try {
                            if (k.equals("SELECT")) f.append("|aSelect=").append(rows(st, s));
                            else st.execute(s);
                        } catch (SQLException e) { f.append("|ERR ").append(k).append("=").append(clean(e.getMessage())); }
                        switch (k) {
                            case "INSERT": f.append("|bSetup=").append(both(b)); break;
                            case "BEGIN": f.append("|autoBegin=").append(a.getAutoCommit()); break;
                            case "UPDATE":
                                upd++;
                                f.append("|aUpd").append(upd).append("=").append(both(a));
                                f.append("|bUpd").append(upd).append("=").append(both(b));
                                break;
                            case "COMMIT": case "ROLLBACK":
                                f.append("|autoEnd=").append(a.getAutoCommit());
                                f.append("|aEnd=").append(both(a));
                                f.append("|bEnd=").append(both(b));
                                break;
                            case "SELECT": f.append("|bSelect=").append(both(b)); break;
                            default: break;
                        }
                    }
                    f.append("|autoLast=").append(a.getAutoCommit());
                }
                if (end.equals("none")) a.close();
                // 끝난 뒤(none이면 A를 닫은 뒤) 새 연결 C로 읽은 값
                try (Connection c = DriverManager.getConnection(url)) {
                    String c1 = bal(c, 1), c2 = bal(c, 2);
                    f.append("|final1=").append(c1).append("|final2=").append(c2);
                    f.append("|sum=").append(Integer.parseInt(c1) + Integer.parseInt(c2));
                }
                f.append("|bFinal=").append(both(b));
                if (!end.equals("none")) a.close();
                b.close();
                out.add(begin + "|" + end + " => " + f);
            }
        Files.write(Path.of(args[0]), out, StandardCharsets.UTF_8);
        System.out.println(out.get(0) + " | " + (out.size() - 1) + " combos");
        out.forEach(System.out::println);
    }
}

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

// 기초개념 "외래 키" 실습을 실제 DB(H2 2.4.240, 메모리 DB, JDBC)에서 확인한다. 스프링은 쓰지 않는다.
// 조합마다 DB를 새로 만들고, 화면에 보이는 SQL 전체를 글자 그대로(주석 줄 포함) 한 문장씩 실행한다. 문장 하나가 거부돼도 다음 문장은 계속 실행한다.
//   fk  : orders 테이블에 FOREIGN KEY (member_id) REFERENCES member(id) 줄을 적는가
//   who : 둘째 주문의 member_id. none(99, 없는 회원) / exist(1, 있는 회원) / null(NULL)
// 적는 것: 실행한 SQL 전체, 문장별 결과(오류면 SQLSTATE, 오류 코드, 메시지 첫 줄), 마지막 SELECT 결과,
//         화면의 코드에는 없는 확인용 SELECT(없는 회원을 가리키는 주문의 수)와 member의 남은 행 수.
public class FkBasicProbe {
    // 화면의 코드와 같은 글. 줄바꿈 \n 으로 이어 붙인다(마지막 줄 뒤에는 줄바꿈 없음).
    static String sql(boolean fk, String who) {
        String m2 = who.equals("none") ? "99" : who.equals("exist") ? "1" : "NULL";
        List<String> l = new ArrayList<>();
        l.add("CREATE TABLE member (");
        l.add("    id   INT PRIMARY KEY,");
        l.add("    name VARCHAR(20)");
        l.add(");");
        l.add("CREATE TABLE orders (");
        l.add("    id        INT PRIMARY KEY,");
        l.add("    member_id INT" + (fk ? "," : ""));
        if (fk) {
            l.add("    -- 외래 키: member_id 열의 값은 member 테이블에 있는 id여야 한다");
            l.add("    FOREIGN KEY (member_id) REFERENCES member(id)");
        }
        l.add(");");
        l.add("");
        l.add("INSERT INTO member VALUES (1, '김철수');");
        l.add("INSERT INTO orders VALUES (10, 1);");
        l.add("INSERT INTO orders VALUES (11, " + m2 + ");");
        l.add("");
        l.add("DELETE FROM member WHERE id = 1;");
        l.add("SELECT * FROM orders ORDER BY id;");
        return String.join("\n", l);
    }

    static String clean(String s) { return s == null ? "" : s.replace('|', '¦').replace("\r", "").replace("\n", "\\n"); }

    static String err(SQLException e) {
        String m = e.getMessage() == null ? "" : e.getMessage().split("\n")[0];
        return "ERR|sqlstate=" + e.getSQLState() + "|code=" + e.getErrorCode() + "|msg=" + clean(m);
    }

    static int one(Statement st, String q) throws SQLException {
        try (ResultSet rs = st.executeQuery(q)) { rs.next(); return rs.getInt(1); }
    }

    static String orders(Statement st, String sqlText) throws SQLException {
        List<String> r = new ArrayList<>();
        try (ResultSet rs = st.executeQuery(sqlText)) {
            while (rs.next()) {
                Object m = rs.getObject(2);
                r.add("(" + rs.getObject(1) + ", " + (m == null ? "NULL" : m) + ")");
            }
        }
        return String.join(", ", r);
    }

    static final String ORPHANS = "SELECT COUNT(*) FROM orders o LEFT JOIN member m ON o.member_id = m.id WHERE o.member_id IS NOT NULL AND m.id IS NULL";

    public static void main(String[] args) throws Exception {
        List<String> out = new ArrayList<>();
        String ver;
        try (Connection c = DriverManager.getConnection("jdbc:h2:mem:fk_basic_ver")) { ver = c.getMetaData().getDatabaseProductName() + " " + c.getMetaData().getDatabaseProductVersion(); }
        out.add("# " + ver + " | java " + System.getProperty("java.version"));
        for (boolean fk : new boolean[] { false, true })
            for (String who : new String[] { "none", "exist", "null" }) {
                String script = sql(fk, who);
                // 한 문장씩 실행하려고 ;로 자른다(화면의 SQL 안에는 ;가 문장 끝에만 있다)
                List<String> stmts = new ArrayList<>();
                for (String s : script.split(";")) if (!s.isBlank()) stmts.add(s.strip());
                StringBuilder f = new StringBuilder();
                f.append("sql=").append(clean(script));
                try (Connection c = DriverManager.getConnection("jdbc:h2:mem:fk_basic_" + fk + "_" + who); Statement st = c.createStatement()) {
                    String[] names = { "createMember", "createOrders", "insMember", "ins10", "ins11", "del" };
                    for (int i = 0; i < names.length; i++) {
                        f.append("|").append(names[i]).append("=");
                        try {
                            if (i == 5) { int n = st.executeUpdate(stmts.get(i)); f.append("OK|deleted=").append(n); }
                            else { st.execute(stmts.get(i)); f.append("OK"); }
                        } catch (SQLException e) { f.append(err(e)); }
                    }
                    f.append("|final=").append(orders(st, stmts.get(6)));
                    f.append("|members=").append(one(st, "SELECT COUNT(*) FROM member"));
                    f.append("|orphans=").append(one(st, ORPHANS));
                }
                out.add(fk + "|" + who + " => " + f);
            }
        // 참고: 열 정의 옆에 REFERENCES를 쓴 모양(MySQL은 이 모양을 해석만 하고 무시한다). H2에서는 어떻게 되는가
        try (Connection c = DriverManager.getConnection("jdbc:h2:mem:fk_basic_inline"); Statement st = c.createStatement()) {
            st.execute("CREATE TABLE member (id INT PRIMARY KEY, name VARCHAR(20))");
            st.execute("CREATE TABLE orders (id INT PRIMARY KEY, member_id INT REFERENCES member(id))");
            st.execute("INSERT INTO member VALUES (1, '김철수')");
            String r;
            try { st.execute("INSERT INTO orders VALUES (11, 99)"); r = "OK"; } catch (SQLException e) { r = err(e); }
            out.add("extra|inlineReferences => ins99=" + r);
        }
        Files.write(Path.of(args[0]), out, StandardCharsets.UTF_8);
        System.out.println(out.get(0) + " | " + (out.size() - 2) + " combos");
        out.forEach(System.out::println);
    }
}

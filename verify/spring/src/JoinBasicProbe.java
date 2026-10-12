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

// 기초개념 "조인" 실습을 실제 DB(H2 2.4.240, 메모리 DB, JDBC)에서 확인한다. 스프링은 쓰지 않는다.
// 조합마다 DB를 새로 만들고, 화면에 보이는 SQL 전체를 글자 그대로(주석 줄 포함) 한 문장씩 실행한다.
//   how    : join(JOIN member m ON ...) / none(JOIN 없음) / cross(CROSS JOIN, ON 없음)
//   orphan : 회원이 없는 주문 (13, 9, 헤드셋)을 하나 더 넣는가
// 적는 것: 실행한 SQL 전체, 각 문장의 성공 여부, SELECT가 돌려준 행(열 값은 ·로, 행은 /로 잇는다),
//         그리고 단계 문장의 근거로 쓰는 값(orders 행 수, member 행 수, id가 9인 회원 수, 주문 10의 짝, ON 없는 CROSS JOIN 행 수).
public class JoinBasicProbe {
    // 화면의 코드와 같은 글. 줄바꿈 \n 으로 이어 붙인다(마지막 줄 뒤에는 줄바꿈 없음).
    static String sql(String how, boolean orphan) {
        List<String> l = new ArrayList<>();
        l.add("CREATE TABLE member (id INT PRIMARY KEY, name VARCHAR(20));");
        l.add("CREATE TABLE orders (id INT PRIMARY KEY, member_id INT, item VARCHAR(20));");
        l.add("INSERT INTO member VALUES (1, '김철수'), (2, '이영희');");
        l.add("INSERT INTO orders VALUES (10, 1, '키보드'), (11, 1, '마우스'),");
        l.add("    (12, 2, '모니터')" + (orphan ? ", (13, 9, '헤드셋');" : ";"));
        l.add("");
        if (how.equals("none")) {
            l.add("SELECT o.item, o.member_id");
            l.add("FROM orders o");
            l.add("ORDER BY o.id;");
        } else {
            l.add("-- 조인: orders의 행에 member의 행을 옆으로 붙인다");
            l.add("SELECT o.item, m.name");
            l.add("FROM orders o");
            if (how.equals("join")) {
                l.add("-- ON: member_id가 회원의 id와 같은 행끼리 짝이다");
                l.add("JOIN member m ON o.member_id = m.id");
                l.add("ORDER BY o.id;");
            } else {
                l.add("CROSS JOIN member m");
                l.add("ORDER BY o.id, m.id;");
            }
        }
        return String.join("\n", l);
    }

    static String clean(String s) { return s == null ? "" : s.replace('|', '¦').replace("\r", "").replace("\n", "\\n"); }

    static int count(Statement st, String sqlText) throws SQLException {
        try (ResultSet rs = st.executeQuery(sqlText)) { rs.next(); return rs.getInt(1); }
    }

    static String rows(Statement st, String sqlText) throws SQLException {
        List<String> r = new ArrayList<>();
        try (ResultSet rs = st.executeQuery(sqlText)) {
            while (rs.next()) r.add(rs.getString(1) + "·" + rs.getObject(2));
        }
        return String.join("/", r);
    }

    public static void main(String[] args) throws Exception {
        List<String> out = new ArrayList<>();
        String ver;
        try (Connection c = DriverManager.getConnection("jdbc:h2:mem:join_basic_ver")) { ver = c.getMetaData().getDatabaseProductName() + " " + c.getMetaData().getDatabaseProductVersion(); }
        out.add("# " + ver + " | java " + System.getProperty("java.version"));
        for (String how : new String[] { "join", "none", "cross" })
            for (boolean orphan : new boolean[] { false, true }) {
                String script = sql(how, orphan);
                // 한 문장씩 실행하려고 ;로 자른다(화면의 SQL 안에는 ;가 문장 끝에만 있다)
                List<String> stmts = new ArrayList<>();
                for (String s : script.split(";")) if (!s.isBlank()) stmts.add(s.strip());
                StringBuilder f = new StringBuilder();
                f.append("sql=").append(clean(script)).append("|stmts=").append(stmts.size());
                try (Connection c = DriverManager.getConnection("jdbc:h2:mem:join_basic_" + how + "_" + orphan); Statement st = c.createStatement()) {
                    for (int i = 0; i < 4; i++) {
                        try { st.execute(stmts.get(i)); f.append("|s").append(i).append("=OK"); }
                        catch (SQLException e) { f.append("|s").append(i).append("=ERR ").append(clean(e.getMessage())); }
                    }
                    // 단계 문장의 근거
                    f.append("|ordersCount=").append(count(st, "SELECT COUNT(*) FROM orders"));
                    f.append("|memberCount=").append(count(st, "SELECT COUNT(*) FROM member"));
                    f.append("|member9=").append(count(st, "SELECT COUNT(*) FROM member WHERE id = 9"));
                    f.append("|pairOf10=").append(rows(st, "SELECT o.item, m.name FROM orders o JOIN member m ON o.member_id = m.id WHERE o.id = 10"));
                    f.append("|noOnRows=").append(count(st, "SELECT COUNT(*) FROM orders o CROSS JOIN member m"));
                    // 화면의 SELECT
                    try {
                        String r = rows(st, stmts.get(4));
                        int n = r.isEmpty() ? 0 : r.split("/").length;
                        f.append("|sel=OK|n=").append(n).append("|rows=").append(clean(r));
                    } catch (SQLException e) { f.append("|sel=ERR ").append(clean(e.getMessage())); }
                }
                out.add(how + "|" + orphan + " => " + f);
            }
        Files.write(Path.of(args[0]), out, StandardCharsets.UTF_8);
        System.out.println(out.get(0) + " | " + (out.size() - 1) + " combos");
        out.forEach(System.out::println);
    }
}

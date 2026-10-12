import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;
import java.util.ArrayList;
import java.util.List;

// 기초개념 "GROUP BY와 집계" 실습을 실제 DB(H2 2.4.240, 메모리 DB, JDBC)에서 확인한다. 스프링은 쓰지 않는다.
// 조합마다 DB를 새로 만들고, 화면에 보이는 SQL 전체를 글자 그대로(주석 줄 포함) 한 문장씩 실행한다.
//   group : GROUP BY member를 쓰는가 (false면 GROUP BY member, SELECT의 member, ORDER BY member를 지운다)
//   extra : none / col(SELECT에 묶지 않은 열 id를 더 적는다) / where(WHERE price >= 1000을 넣는다)
// 적는 것: 실행한 SQL 전체, 문장 수, 앞의 두 문장(테이블, INSERT)의 성공 여부,
//         화면의 SELECT가 돌려준 행(열 값은 ', '로, 행은 /로 잇는다) 또는 오류(코드와 메시지 첫 줄),
//         문장을 해석만 해 보는 prepareStatement 단계에서 이미 오류가 나는가,
//         그리고 단계 문장의 근거로 쓰는 값(행 수, 조건에 맞는 행의 id, 이름별 id 목록, 이름별 서로 다른 id 수, 전체 합계).
public class GroupByBasicProbe {
    // 화면의 코드와 같은 글. 줄바꿈 \n 으로 이어 붙인다(마지막 줄 뒤에는 줄바꿈 없음).
    static String sql(boolean group, String extra) {
        List<String> l = new ArrayList<>();
        l.add("CREATE TABLE orders (id INT PRIMARY KEY, member VARCHAR(20), price INT);");
        l.add("INSERT INTO orders VALUES (1, 'kim', 1000), (2, 'kim', 2000),");
        l.add("    (3, 'lee', 500), (4, 'lee', 1500), (5, 'park', 3000);");
        l.add("");
        String cols = (group ? "member, " : "") + (extra.equals("col") ? "id, " : "") + "COUNT(*), SUM(price)";
        l.add("SELECT " + cols);
        l.add("FROM orders" + (extra.equals("where") || group ? "" : ";"));
        if (extra.equals("where")) {
            l.add("-- WHERE: 조건에 맞는 행만 남긴다");
            l.add("WHERE price >= 1000" + (group ? "" : ";"));
        }
        if (group) {
            l.add("-- GROUP BY: member 값이 같은 행끼리 한 묶음으로 만든다");
            l.add("GROUP BY member");
            l.add("ORDER BY member;");
        }
        return String.join("\n", l);
    }

    static String clean(String s) { return s == null ? "" : s.replace('|', '¦').replace("\r", "").replace("\n", "\\n"); }

    static String first(String s) { return s == null ? "" : s.split("\n")[0]; }

    static String rows(Statement st, String sqlText) throws SQLException {
        List<String> r = new ArrayList<>();
        try (ResultSet rs = st.executeQuery(sqlText)) {
            int n = rs.getMetaData().getColumnCount();
            while (rs.next()) {
                List<String> v = new ArrayList<>();
                for (int i = 1; i <= n; i++) v.add(String.valueOf(rs.getObject(i)));
                r.add("(" + String.join(", ", v) + ")");
            }
        }
        return String.join("/", r);
    }

    static String one(Statement st, String sqlText) throws SQLException {
        try (ResultSet rs = st.executeQuery(sqlText)) { rs.next(); return rs.getString(1); }
    }

    // 이름별 값 목록: "kim:1,2;lee:3,4;park:5"
    static String byMember(Statement st, String expr, String where) throws SQLException {
        List<String> r = new ArrayList<>();
        try (ResultSet rs = st.executeQuery("SELECT member, " + expr + " FROM orders " + where + " GROUP BY member ORDER BY member")) {
            while (rs.next()) r.add(rs.getString(1) + ":" + rs.getString(2));
        }
        return String.join(";", r);
    }

    public static void main(String[] args) throws Exception {
        List<String> out = new ArrayList<>();
        String ver;
        try (Connection c = DriverManager.getConnection("jdbc:h2:mem:groupby_basic_ver")) { ver = c.getMetaData().getDatabaseProductName() + " " + c.getMetaData().getDatabaseProductVersion(); }
        out.add("# " + ver + " | java " + System.getProperty("java.version"));
        for (boolean group : new boolean[] { true, false })
            for (String extra : new String[] { "none", "col", "where" }) {
                String script = sql(group, extra);
                // 한 문장씩 실행하려고 ;로 자른다(화면의 SQL 안에는 ;가 문장 끝에만 있다)
                List<String> stmts = new ArrayList<>();
                for (String s : script.split(";")) if (!s.isBlank()) stmts.add(s.strip());
                StringBuilder f = new StringBuilder();
                f.append("sql=").append(clean(script)).append("|stmts=").append(stmts.size());
                try (Connection c = DriverManager.getConnection("jdbc:h2:mem:groupby_basic_" + group + "_" + extra); Statement st = c.createStatement()) {
                    for (int i = 0; i < 2; i++) {
                        try { st.execute(stmts.get(i)); f.append("|s").append(i).append("=OK"); }
                        catch (SQLException e) { f.append("|s").append(i).append("=ERR ").append(clean(e.getMessage())); }
                    }
                    // 단계 문장의 근거
                    f.append("|total=").append(one(st, "SELECT COUNT(*) FROM orders"));
                    f.append("|sumAll=").append(one(st, "SELECT SUM(price) FROM orders"));
                    f.append("|whereIds=").append(clean(rows(st, "SELECT id FROM orders WHERE price >= 1000 ORDER BY id")));
                    f.append("|idsOf=").append(byMember(st, "LISTAGG(CAST(id AS VARCHAR), ',') WITHIN GROUP (ORDER BY id)", ""));
                    f.append("|idsOfWhere=").append(byMember(st, "LISTAGG(CAST(id AS VARCHAR), ',') WITHIN GROUP (ORDER BY id)", "WHERE price >= 1000"));
                    f.append("|distinctIds=").append(byMember(st, "COUNT(DISTINCT id)", ""));
                    f.append("|groups=").append(one(st, "SELECT COUNT(DISTINCT member) FROM orders"));
                    // id를 집계 함수 안에 넣으면 되는가, 그리고 id 값이 하나뿐인 묶음(park)만 남겨도 같은 문장이 오류인가
                    f.append("|maxId=").append(rows(st, "SELECT member, MAX(id) FROM orders GROUP BY member ORDER BY member"));
                    try { f.append("|parkOnly=OK ").append(rows(st, "SELECT member, id, COUNT(*) FROM orders WHERE member = 'park' GROUP BY member")); }
                    catch (SQLException e) { f.append("|parkOnly=ERR ").append(e.getErrorCode()); }
                    // 묶음마다 id가 하나씩뿐이도록 행을 남기면(id 1, 3, 5) 오류가 나지 않는가
                    try { f.append("|oneIdEach=OK ").append(rows(st, "SELECT member, id, COUNT(*) FROM orders WHERE id IN (1, 3, 5) GROUP BY member ORDER BY member")); }
                    catch (SQLException e) { f.append("|oneIdEach=ERR ").append(e.getErrorCode()); }
                    // 화면의 SELECT: 먼저 해석만 해 보고(prepareStatement), 그다음 실행한다
                    String select = stmts.get(2);
                    try (PreparedStatement ps = c.prepareStatement(select)) { f.append("|prepared=OK"); }
                    catch (SQLException e) { f.append("|prepared=ERR ").append(e.getErrorCode()).append(' ').append(clean(first(e.getMessage()))); }
                    try {
                        String r = rows(st, select);
                        int n = r.isEmpty() ? 0 : r.split("/").length;
                        f.append("|sel=OK|n=").append(n).append("|rows=").append(clean(r)).append("|err=none");
                    } catch (SQLException e) {
                        f.append("|sel=ERR|n=-|rows=-|err=").append(e.getErrorCode()).append(' ').append(clean(first(e.getMessage())));
                    }
                }
                out.add(group + "|" + extra + " => " + f);
            }
        Files.write(Path.of(args[0]), out, StandardCharsets.UTF_8);
        System.out.println(out.get(0) + " | " + (out.size() - 1) + " combos");
        out.forEach(System.out::println);
    }
}

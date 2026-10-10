import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.ResultSet;
import java.sql.Statement;
import java.util.ArrayList;
import java.util.List;

// "실행 계획 읽기" 실습의 모든 조합을 실제 MySQL 8.4에서 EXPLAIN으로 실행해, 계획의 각 칸을 그대로 적는다.
// member 2만 행(name에 인덱스 idx_name, 이름 하나에 두 행), orders 2만 행을 넣고 ANALYZE TABLE을 한 뒤에 실행한다.
public class ExplainPlanProbe {
    static final String URL = "jdbc:mysql://127.0.0.1:3307/?allowPublicKeyRetrieval=true&useSSL=false&characterEncoding=UTF-8";
    static final int N = 20000;
    static void exec(Connection c, String sql) throws Exception { try (Statement s = c.createStatement()) { s.execute(sql); } }
    static String one(Connection c, String sql) throws Exception { try (Statement s = c.createStatement(); ResultSet rs = s.executeQuery(sql)) { return rs.next() ? String.valueOf(rs.getString(1)) : "(없음)"; } }

    // 화면에 나오는 SQL과 같은 문장을 만든다
    static String query(String w, String sel, String tail) {
        if (w.equals("join")) return "SELECT o.id, o.amount, m.name FROM orders o JOIN member m ON m.id = o.member_id";
        String where = switch (w) {
            case "pk" -> "id = 500";
            case "eq" -> "name = 'user00123'";
            case "prefix" -> "name LIKE 'user001%'";
            case "suffix" -> "name LIKE '%00123'";
            case "func" -> "LEFT(name, 7) = 'user001'";
            case "noidx" -> "age = 30";
            default -> "";
        };
        String cols = tail.equals("gage") ? "age, COUNT(*)" : sel.equals("cov") ? "id, name" : "*";
        return "SELECT " + cols + " FROM member" + (where.isEmpty() ? "" : " WHERE " + where)
                + switch (tail) { case "oname" -> " ORDER BY name"; case "oage" -> " ORDER BY age"; case "gage" -> " GROUP BY age"; default -> ""; };
    }

    static String explain(Connection c, String sql) throws Exception {
        List<String> rows = new ArrayList<>();
        try (Statement s = c.createStatement(); ResultSet rs = s.executeQuery("EXPLAIN " + sql)) {
            while (rs.next())
                rows.add("table=" + rs.getString("table") + "|type=" + rs.getString("type") + "|possible_keys=" + rs.getString("possible_keys") + "|key=" + rs.getString("key")
                        + "|key_len=" + rs.getString("key_len") + "|ref=" + rs.getString("ref") + "|rows=" + rs.getString("rows") + "|filtered=" + rs.getString("filtered") + "|Extra=" + rs.getString("Extra"));
        }
        return String.join(" ;; ", rows);
    }

    public static void main(String[] args) throws Exception {
        List<String> out = new ArrayList<>();
        try (Connection c = DriverManager.getConnection(URL, "root", "labtest")) {
            exec(c, "create database if not exists lab_explainplan");
            c.setCatalog("lab_explainplan");
            exec(c, "set session cte_max_recursion_depth = 100000");
            exec(c, "drop table if exists orders");
            exec(c, "drop table if exists member");
            exec(c, "create table member(id int primary key, name varchar(20) not null, age int not null, city varchar(20) not null, key idx_name (name)) engine=InnoDB");
            exec(c, "create table orders(id int primary key, member_id int not null, amount int not null) engine=InnoDB");
            // 이름 하나에 두 행(1만 가지 이름), 나이는 20~69, 도시는 다섯 가지
            exec(c, "insert into member with recursive s(n) as (select 1 union all select n + 1 from s where n < " + N + ") "
                    + "select n, concat('user', lpad(1 + (n - 1) % " + (N / 2) + ", 5, '0')), 20 + (n * 7) % 50, elt(1 + n % 5, '서울', '부산', '대구', '광주', '대전') from s");
            exec(c, "insert into orders with recursive s(n) as (select 1 union all select n + 1 from s where n < " + N + ") select n, 1 + (n * 13) % " + N + ", 1000 + (n * 37) % 9000 from s");
            exec(c, "analyze table member");
            exec(c, "analyze table orders");
            out.add("# mysql " + one(c, "select version()") + " | member " + one(c, "select count(*) from member") + "행 (idx_name), orders " + one(c, "select count(*) from orders") + "행");
            // 조건마다 실제로 맞는 행의 수
            StringBuilder cnt = new StringBuilder("# counts");
            for (String w : new String[] { "none", "pk", "eq", "prefix", "suffix", "func", "noidx" }) {
                String q = query(w, "star", "none");
                cnt.append(cnt.length() > 8 ? "|" : " ").append(w).append("=").append(one(c, q.replace("SELECT *", "SELECT COUNT(*)")));
            }
            out.add(cnt.toString());
            for (String w : new String[] { "none", "pk", "eq", "prefix", "suffix", "func", "noidx" })
                for (String tail : new String[] { "none", "oname", "oage", "gage" })
                    for (String sel : tail.equals("gage") ? new String[] { "star" } : new String[] { "star", "cov" }) {
                        String sql = query(w, sel, tail);
                        out.add(w + "|" + sel + "|" + tail + " => " + explain(c, sql) + " ## " + sql);
                    }
            out.add("join|star|none => " + explain(c, query("join", "star", "none")) + " ## " + query("join", "star", "none"));
            // 덧붙인 확인: 인덱스가 있는 컬럼으로 GROUP BY를 하면 임시 테이블 표시가 없는가
            out.add("# extra groupbyname => " + explain(c, "SELECT name, COUNT(*) FROM member GROUP BY name") + " ## SELECT name, COUNT(*) FROM member GROUP BY name");
        }
        Files.write(Path.of(args[0]), out, StandardCharsets.UTF_8);
        out.forEach(System.out::println);
    }
}

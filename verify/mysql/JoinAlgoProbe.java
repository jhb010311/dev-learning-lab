import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.ResultSet;
import java.sql.Statement;
import java.util.ArrayList;
import java.util.List;

// "조인 알고리즘" 실습의 모든 조합을 실제 MySQL 8.4에서 실행한다.
// member 1,000행(기본 키 id)과 orders 10,000행(회원 한 명에 주문 10건)을 넣고, 조합마다
//   EXPLAIN(표 형식)의 테이블 순서, type, key, Extra와
//   EXPLAIN ANALYZE(트리 형식)의 조인 방식, 실제로 읽은 행 수(rows)와 되풀이 횟수(loops)를 적는다.
// 비용(cost)과 시간(time)은 실행할 때마다 달라지므로 지우고 적는다.
public class JoinAlgoProbe {
    static final String URL = "jdbc:mysql://127.0.0.1:3307/?allowPublicKeyRetrieval=true&useSSL=false&characterEncoding=UTF-8";
    static void exec(Connection c, String sql) throws Exception { try (Statement s = c.createStatement()) { s.execute(sql); } }
    static String one(Connection c, String sql) throws Exception { try (Statement s = c.createStatement(); ResultSet rs = s.executeQuery(sql)) { return rs.next() ? String.valueOf(rs.getString(1)) : "(없음)"; } }

    // 화면에 나오는 SQL과 같은 문장을 만든다
    // few가 true이면 회원 10명만 찾는 조건을 붙인다(덧붙인 확인에만 쓴다)
    static String query(String drive, boolean few, boolean hash) {
        String from = switch (drive) {
            case "m" -> "FROM member m STRAIGHT_JOIN orders o ON o.member_id = m.id";
            case "o" -> "FROM orders o STRAIGHT_JOIN member m ON m.id = o.member_id";
            default -> "FROM member m JOIN orders o ON o.member_id = m.id";
        };
        return "SELECT " + (hash ? "" : "/*+ NO_BNL() */ ") + "m.name, o.amount " + from + (few ? " WHERE m.id <= 10" : "");
    }

    static String explain(Connection c, String sql) throws Exception {
        List<String> rows = new ArrayList<>();
        try (Statement s = c.createStatement(); ResultSet rs = s.executeQuery("EXPLAIN " + sql)) {
            while (rs.next()) rows.add(rs.getString("table") + ":" + rs.getString("type") + ":" + rs.getString("key") + ":" + rs.getString("Extra"));
        }
        return String.join(" > ", rows);
    }

    // EXPLAIN ANALYZE의 각 줄에서 비용과 시간을 지우고 "하는 일 [rows=실제 행 loops=횟수]"만 남긴다
    static String analyze(Connection c, String sql) throws Exception {
        String tree = one(c, "EXPLAIN ANALYZE " + sql);
        List<String> out = new ArrayList<>();
        for (String line : tree.split("\n")) {
            String t = line.trim();
            if (t.isEmpty()) continue;
            int depth = (line.indexOf("->") < 0 ? 0 : line.indexOf("->")) / 4;
            String what = t.replaceFirst("^-> ", "").replaceAll("\\s*\\(cost=[^)]*\\)", "");
            java.util.regex.Matcher m = java.util.regex.Pattern.compile("\\(actual time=[^ ]+ rows=([^ ]+) loops=(\\d+)\\)").matcher(what);
            String act = m.find() ? " [rows=" + m.group(1) + " loops=" + m.group(2) + "]" : " [실행 안 됨]";
            what = what.replaceAll("\\s*\\(actual time=[^)]*\\)", "").replaceAll("\\s*\\(never executed\\)", "").trim();
            out.add(depth + ") " + what + act);
        }
        return String.join(" > ", out);
    }

    // EXPLAIN FORMAT=TREE의 첫 줄(맨 위의 조인 방식)에서 비용을 지운 것
    static String treeRoot(Connection c, String sql) throws Exception {
        return one(c, "EXPLAIN FORMAT=TREE " + sql).split("\n")[0].replaceAll("\\s*\\(cost=[^)]*\\)", "").replaceFirst("^-> ", "").trim();
    }

    public static void main(String[] args) throws Exception {
        List<String> out = new ArrayList<>();
        try (Connection c = DriverManager.getConnection(URL, "root", "labtest")) {
            exec(c, "create database if not exists lab_joinalgo");
            c.setCatalog("lab_joinalgo");
            exec(c, "set session cte_max_recursion_depth = 100000");
            for (boolean idx : new boolean[] { false, true }) {
                exec(c, "drop table if exists orders");
                exec(c, "drop table if exists member");
                exec(c, "create table member(id int primary key, name varchar(20) not null) engine=InnoDB");
                exec(c, "create table orders(id int primary key, member_id int not null, amount int not null" + (idx ? ", key idx_member (member_id)" : "") + ") engine=InnoDB");
                exec(c, "insert into member with recursive s(n) as (select 1 union all select n + 1 from s where n < 1000) select n, concat('user', lpad(n, 4, '0')) from s");
                // 회원 한 명에 주문이 정확히 10건
                exec(c, "insert into orders with recursive s(n) as (select 1 union all select n + 1 from s where n < 10000) select n, 1 + (n - 1) % 1000, 1000 + (n * 37) % 9000 from s");
                exec(c, "analyze table member");
                exec(c, "analyze table orders");
                if (!idx) out.add("# mysql " + one(c, "select version()") + " | member " + one(c, "select count(*) from member") + "행, orders " + one(c, "select count(*) from orders") + "행, 회원 한 명의 주문 " + one(c, "select count(*) from orders where member_id = 7") + "건");
                for (String drive : new String[] { "m", "o", "auto" })
                    for (boolean hash : new boolean[] { true, false }) {
                        String sql = query(drive, false, hash);
                        out.add(idx + "|" + drive + "|" + hash + " => plan=" + explain(c, sql) + " || ftree=" + treeRoot(c, sql) + " || tree=" + analyze(c, sql) + " || result=" + one(c, "select count(*) from (" + sql + ") t") + " ## " + sql);
                    }
                // 덧붙인 확인: 회원 10명의 주문만 찾을 때, 나중 테이블 orders를 얼마나 읽는가
                String few = query("m", true, true);
                out.add("# extra few|" + idx + " => plan=" + explain(c, few) + " || ftree=" + treeRoot(c, few) + " || tree=" + analyze(c, few) + " || result=" + one(c, "select count(*) from (" + few + ") t") + " ## " + few);
            }
        }
        Files.write(Path.of(args[0]), out, StandardCharsets.UTF_8);
        out.forEach(System.out::println);
    }
}

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

// "파티셔닝" 실습의 모든 조합(나누는 방법 2 x 기본 키 2 x 넣는 행 2 x 조회 조건 4 = 32)을 실제 MySQL 8.4에서 실행한다.
// 조합마다 테이블을 새로 만들고, 주문 300건을 넣고, 행 하나를 더 넣고, EXPLAIN으로 조회가 읽는 파티션을 본다.
// 출력 한 줄: 방법|기본 키|넣는 행|조회 => CREATE 결과|INSERT 결과|EXPLAIN의 partitions|전체 파티션 수|파티션별 행 수|type|key|오류 메시지
public class PartitionProbe {
    static final String BASE = "jdbc:mysql://127.0.0.1:3307/", OPT = "?allowPublicKeyRetrieval=true&useSSL=false";
    static Connection open(String db) throws Exception { return DriverManager.getConnection(BASE + db + OPT, "root", "labtest"); }
    static void exec(Connection c, String sql) throws Exception { try (Statement s = c.createStatement()) { s.execute(sql); } }
    static String one(Connection c, String sql) throws Exception { try (Statement s = c.createStatement(); ResultSet r = s.executeQuery(sql)) { return r.next() && r.getString(1) != null ? r.getString(1) : ""; } }
    // 성공하면 "ok", 실패하면 "오류 코드:메시지"
    static String tryExec(Connection c, String sql) throws Exception { try { exec(c, sql); return "ok"; } catch (SQLException e) { return e.getErrorCode() + ":" + e.getMessage(); } }
    static String[] explain(Connection c, String sql) throws Exception { try (Statement s = c.createStatement(); ResultSet r = s.executeQuery("explain " + sql)) { r.next(); return new String[] { r.getString("partitions"), r.getString("type"), String.valueOf(r.getString("key")) }; } }

    static final String COLS = "id BIGINT NOT NULL, member_id INT NOT NULL, ordered_at DATE NOT NULL, amount INT NOT NULL";
    static String create(String how, String key) {
        return how.equals("range")
            ? "CREATE TABLE orders (" + COLS + (key.isEmpty() ? "" : ", " + key.replace("KEYCOL", "ordered_at")) + ") PARTITION BY RANGE (YEAR(ordered_at)) (PARTITION p2023 VALUES LESS THAN (2024), PARTITION p2024 VALUES LESS THAN (2025), PARTITION p2025 VALUES LESS THAN (2026))"
            : "CREATE TABLE orders (" + COLS + (key.isEmpty() ? "" : ", " + key.replace("KEYCOL", "member_id")) + ") PARTITION BY HASH (member_id) PARTITIONS 4";
    }
    // 주문 300건: n번째 주문의 회원 번호는 n % 40 + 1, 주문 날짜는 2023-01-01에서 3n일 뒤
    static final String FILL = "INSERT INTO orders WITH RECURSIVE s(n) AS (SELECT 1 UNION ALL SELECT n + 1 FROM s WHERE n < 300) SELECT n, n % 40 + 1, DATE_ADD('2023-01-01', INTERVAL (n * 3) DAY), 1000 + n FROM s";
    static String where(String how, String q) {
        if (q.equals("other")) return "id = 100";
        if (how.equals("range")) return q.equals("key") ? "ordered_at = '2024-03-05'" : q.equals("range") ? "ordered_at BETWEEN '2024-11-01' AND '2025-02-28'" : "YEAR(ordered_at) = 2024";
        return q.equals("key") ? "member_id = 7" : q.equals("range") ? "member_id BETWEEN 1 AND 100" : "member_id % 4 = 3";
    }
    static String[] parts(String how) { return how.equals("range") ? new String[] { "p2023", "p2024", "p2025" } : new String[] { "p0", "p1", "p2", "p3" }; }
    static String counts(Connection c, String how) throws Exception { List<String> r = new ArrayList<>(); for (String p : parts(how)) r.add(one(c, "select count(*) from orders partition (" + p + ")")); return String.join(",", r); }

    public static void main(String[] args) throws Exception {
        List<String> out = new ArrayList<>();
        try (Connection r = open("")) { exec(r, "create database if not exists lab_partition"); }
        try (Connection c = open("lab_partition")) {
            out.add("# mysql " + one(c, "select version()"));
            for (String how : new String[] { "range", "hash" }) for (String pk : new String[] { "with", "only" }) for (String ins : new String[] { "in", "out" }) for (String q : new String[] { "key", "range", "func", "other" }) {
                exec(c, "drop table if exists orders");
                String made = tryExec(c, create(how, pk.equals("with") ? "PRIMARY KEY (id, KEYCOL)" : "PRIMARY KEY (id)"));
                String key = how + "|" + pk + "|" + ins + "|" + q + " => ";
                if (!made.equals("ok")) { out.add(key + made.split(":")[0] + "|-|-|-|-|-|-|" + made.substring(made.indexOf(':') + 1)); continue; }
                exec(c, FILL);
                String cnt = counts(c, how);
                String row = ins.equals("in") ? "(1001, 7, '2025-06-01', 5000)" : "(1002, 9, '2026-01-10', 5000)", id = ins.equals("in") ? "1001" : "1002";
                String put = tryExec(c, "INSERT INTO orders VALUES " + row), where = "-", msg = "";
                if (put.equals("ok")) { for (String p : parts(how)) if (one(c, "select count(*) from orders partition (" + p + ") where id = " + id).equals("1")) where = p; }
                else { where = put.split(":")[0]; msg = put.substring(put.indexOf(':') + 1); }
                exec(c, "analyze table orders");
                String[] ex = explain(c, "SELECT * FROM orders WHERE " + where(how, q));
                out.add(key + "ok|" + where + "|" + ex[0] + "|" + parts(how).length + "|" + cnt + "|" + ex[1] + "|" + ex[2] + "|" + msg);
            }
            // 화면의 설명에 쓴 그 밖의 사실
            exec(c, "drop table if exists orders");
            out.add("extra unique => " + tryExec(c, create("range", "PRIMARY KEY (id, KEYCOL), UNIQUE KEY uk_member (member_id, id)")));   // 유니크 키에도 파티션 키가 들어 있어야 한다
            exec(c, "drop table if exists orders");
            out.add("extra nokey => " + tryExec(c, create("range", "")));   // 기본 키도 유니크 키도 없으면 제약에 걸리지 않는다
            exec(c, "drop table if exists orders"); exec(c, create("range", "PRIMARY KEY (id, KEYCOL)")); exec(c, FILL);
            out.add("extra rewrite => " + explain(c, "SELECT * FROM orders WHERE ordered_at >= '2024-01-01' AND ordered_at < '2025-01-01'")[0]);   // 함수 대신 컬럼의 범위로 쓰면 한 파티션만 읽는다
            // 파티션마다 InnoDB 안에서 별도의 테이블(파일)이고 저마다 PRIMARY 인덱스를 가진다 (인덱스 통계가 파티션별로 따로 있다)
            exec(c, "analyze table orders");
            out.add("extra localindex => InnoDB 테이블 " + one(c, "select count(*) from information_schema.innodb_tables where name like 'lab_partition/orders#p#%'") + "개, PRIMARY 인덱스 " + one(c, "select count(distinct table_name) from mysql.innodb_index_stats where database_name = 'lab_partition' and table_name like 'orders#p#%' and index_name = 'PRIMARY'") + "개, 데이터 파일 " + one(c, "select count(*) from information_schema.innodb_tablespaces where name like 'lab_partition/orders#p#%'") + "개");
            String before = tryExec(c, "INSERT INTO orders VALUES (1002, 9, '2026-01-10', 5000)");
            exec(c, "ALTER TABLE orders ADD PARTITION (PARTITION p2026 VALUES LESS THAN (2027))");
            out.add("extra addpartition => 추가 전 " + before.split(":")[0] + ", 추가 뒤 " + tryExec(c, "INSERT INTO orders VALUES (1002, 9, '2026-01-10', 5000)") + ", 들어간 곳 p2026=" + one(c, "select count(*) from orders partition (p2026)"));
            String all = one(c, "select count(*) from orders"), old = one(c, "select count(*) from orders partition (p2023)");
            exec(c, "ALTER TABLE orders DROP PARTITION p2023");
            out.add("extra droppartition => 전체 " + all + "행, p2023 " + old + "행 -> DROP PARTITION p2023 뒤 전체 " + one(c, "select count(*) from orders") + "행, 남은 파티션 " + one(c, "select group_concat(partition_name order by partition_ordinal_position) from information_schema.partitions where table_schema = 'lab_partition' and table_name = 'orders'"));
            out.add("extra sameid => " + tryExec(c, "INSERT INTO orders VALUES (5000, 1, '2024-05-05', 1), (5000, 1, '2025-05-05', 1)") + ", id가 5000인 행 수=" + one(c, "select count(*) from orders where id = 5000"));   // 기본 키가 (id, ordered_at)이면 id만 같은 두 행이 들어간다
            exec(c, "drop table if exists orders"); exec(c, create("hash", "PRIMARY KEY (id, KEYCOL)")); exec(c, FILL);
            out.add("extra shortrange => " + explain(c, "SELECT * FROM orders WHERE member_id BETWEEN 5 AND 6")[0]);   // 아주 짧은 정수 범위는 HASH에서도 파티션을 골라낸다
            out.add("extra engine => " + one(c, "select concat(count(distinct table_name), '개 테이블, ', count(*), '개 파티션, 엔진 ', group_concat(distinct engine)) from information_schema.partitions p join information_schema.tables t using (table_schema, table_name) where p.table_schema = 'lab_partition' and p.table_name = 'orders'"));
            exec(c, "drop table if exists orders");
        }
        Files.write(Path.of(args[0]), out, StandardCharsets.UTF_8);
        out.forEach(System.out::println);
    }
}

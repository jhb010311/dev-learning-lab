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
import java.util.concurrent.atomic.AtomicInteger;

// 기초개념 "인덱스" 실습을 실제 DB(H2 2.4.240, 메모리 DB, JDBC)에서 확인한다. 스프링은 쓰지 않는다.
// 조합마다 DB를 새로 만들고, 화면에 보이는 SQL 전체를 글자 그대로(주석 줄 포함) 실행한다.
// 화면의 "-- 회원 1000명을 넣는다" 주석 줄이 있는 자리에서 Probe가 회원 1000명을 넣는다(INSERT 문은 화면에서 줄였다).
//   idx  : CREATE INDEX idx_name ON member(name)을 실행하는가
//   cond : 찾는 조건. name(WHERE name = '회원777') / city(WHERE city = '부산') / id(WHERE id = 777)
// 적는 것: 실행한 SQL 전체, 색인 목록(CREATE TABLE 직후와 CREATE INDEX 직후), CREATE INDEX 전후의 행 수,
//         EXPLAIN 원문과 EXPLAIN ANALYZE의 scanCount, SELECT가 돌려준 행(id 목록),
//         그리고 scanCount가 "읽은 행 수 + 1"이라는 근거(EXTRA 줄들).
public class IndexBasicProbe {
    // 화면의 코드와 같은 글. 줄바꿈 \n 으로 이어 붙인다(마지막 줄 뒤에는 줄바꿈 없음).
    static String sql(boolean idx, String cond) {
        String where = cond.equals("name") ? "WHERE name = '회원777'" : cond.equals("city") ? "WHERE city = '부산'" : "WHERE id = 777";
        List<String> l = new ArrayList<>();
        l.add("CREATE TABLE member (");
        l.add("    id   INT PRIMARY KEY,");
        l.add("    name VARCHAR(20),");
        l.add("    city VARCHAR(20)");
        l.add(");");
        l.add("-- 회원 1000명을 넣는다 (회원1 ~ 회원1000. INSERT 문은 화면에서 줄였다)");
        l.add("");
        if (idx) {
            l.add("-- 인덱스: name 값으로 행을 빨리 찾기 위한 색인을 만든다");
            l.add("CREATE INDEX idx_name ON member(name);");
            l.add("");
        }
        l.add("SELECT * FROM member " + where + ";");
        return String.join("\n", l);
    }

    static final String[] CITIES = { "서울", "부산", "대구", "광주" };

    static String clean(String s) { return s == null ? "" : s.replace('|', '¦').replace("\r", "").replace("\n", "\\n"); }

    static int count(Statement st, String sqlText) throws SQLException {
        try (ResultSet rs = st.executeQuery(sqlText)) { rs.next(); return rs.getInt(1); }
    }

    static void fill(Connection c, int n) throws SQLException {
        try (PreparedStatement ps = c.prepareStatement("INSERT INTO member VALUES (?, ?, ?)")) {
            for (int i = 1; i <= n; i++) { ps.setInt(1, i); ps.setString(2, "회원" + i); ps.setString(3, CITIES[(i - 1) % 4]); ps.addBatch(); }
            ps.executeBatch();
        }
    }

    // 색인 목록: 이름(종류, 열 정렬 순서, 자동 생성 여부)
    static String indexes(Statement st) throws SQLException {
        List<String> r = new ArrayList<>();
        String q = "SELECT i.INDEX_NAME, i.INDEX_TYPE_NAME, i.IS_GENERATED, c.COLUMN_NAME, c.ORDERING_SPECIFICATION "
            + "FROM INFORMATION_SCHEMA.INDEXES i JOIN INFORMATION_SCHEMA.INDEX_COLUMNS c "
            + "ON i.INDEX_SCHEMA = c.INDEX_SCHEMA AND i.INDEX_NAME = c.INDEX_NAME AND i.TABLE_NAME = c.TABLE_NAME "
            + "WHERE i.TABLE_NAME = 'MEMBER' ORDER BY i.INDEX_NAME";
        try (ResultSet rs = st.executeQuery(q)) {
            while (rs.next()) r.add(rs.getString(1) + "(" + rs.getString(2) + "," + rs.getString(4) + " " + rs.getString(5) + ",generated=" + rs.getString(3) + ")");
        }
        return String.join(";", r);
    }

    static String ids(Statement st, String sqlText) throws SQLException {
        List<String> r = new ArrayList<>();
        try (ResultSet rs = st.executeQuery(sqlText)) { while (rs.next()) r.add(rs.getString(1)); }
        return String.join(",", r);
    }

    // EXPLAIN 또는 EXPLAIN ANALYZE의 결과 글(줄바꿈을 공백으로 바꾼 것)
    static String plan(Statement st, String prefix, String select) throws SQLException {
        try (ResultSet rs = st.executeQuery(prefix + select)) { rs.next(); return rs.getString(1); }
    }

    static String scanCount(String analyzed) {
        int i = analyzed.indexOf("scanCount: ");
        if (i < 0) return "none";
        int j = i + "scanCount: ".length(), k = j;
        while (k < analyzed.length() && Character.isDigit(analyzed.charAt(k))) k++;
        return analyzed.substring(j, k);
    }

    // 실행 계획 글에서 H2가 적은 주석 한 줄(어떤 색인이나 tableScan을 썼는지)만 뽑는다
    static String via(String explained) {
        for (String ln : explained.split("\n")) {
            String t = ln.strip();
            if (t.startsWith("/* PUBLIC.") && !t.contains("scanCount")) return t;
        }
        return "none";
    }

    // 행을 하나 볼 때마다 세는 함수. 조건에 이 함수를 쓰면 색인을 못 써서 테이블 전체를 읽고, 읽은 행마다 한 번씩 불린다.
    static final AtomicInteger CALLS = new AtomicInteger();
    public static String cnt(String s) { CALLS.incrementAndGet(); return s; }

    public static void main(String[] args) throws Exception {
        List<String> out = new ArrayList<>();
        String ver;
        try (Connection c = DriverManager.getConnection("jdbc:h2:mem:index_basic_ver")) { ver = c.getMetaData().getDatabaseProductName() + " " + c.getMetaData().getDatabaseProductVersion(); }
        out.add("# " + ver + " | java " + System.getProperty("java.version"));
        for (boolean idx : new boolean[] { true, false })
            for (String cond : new String[] { "name", "city", "id" }) {
                String script = sql(idx, cond);
                // 문장 단위로 실행하려고 ;로 자른다(화면의 SQL 안에는 ;가 문장 끝에만 있다). 앞뒤의 주석 줄은 문장에 붙은 채 실행한다.
                List<String> stmts = new ArrayList<>();
                for (String s : script.split(";")) if (!s.isBlank()) stmts.add(s.strip());
                String last = stmts.get(stmts.size() - 1);
                StringBuilder only = new StringBuilder();
                for (String ln : last.split("\n")) if (!ln.strip().startsWith("--")) only.append(ln).append("\n");
                String select = only.toString().strip();
                StringBuilder f = new StringBuilder();
                f.append("sql=").append(clean(script));
                try (Connection c = DriverManager.getConnection("jdbc:h2:mem:index_basic_" + idx + "_" + cond); Statement st = c.createStatement()) {
                    try { st.execute(stmts.get(0)); f.append("|create=OK"); } catch (SQLException e) { f.append("|create=ERR ").append(clean(e.getMessage())); }
                    f.append("|indexesAfterCreateTable=").append(indexes(st));
                    // 화면의 "-- 회원 1000명을 넣는다" 자리
                    fill(c, 1000);
                    f.append("|rowsAfterInsert=").append(count(st, "SELECT COUNT(*) FROM member"));
                    StringBuilder cc = new StringBuilder();
                    for (String city : CITIES) cc.append(cc.length() > 0 ? "," : "").append(city).append("=").append(count(st, "SELECT COUNT(*) FROM member WHERE city = '" + city + "'"));
                    f.append("|cityCounts=").append(cc);
                    f.append("|neighbors=").append(ids(st, "SELECT name FROM member WHERE name >= '회원776' AND name <= '회원778' ORDER BY name"));
                    int rowsBefore = count(st, "SELECT COUNT(*) FROM member");
                    String before = ids(st, "SELECT id FROM member ORDER BY id");
                    if (idx) {
                        try { st.execute(stmts.get(1)); f.append("|createIndex=OK"); } catch (SQLException e) { f.append("|createIndex=ERR ").append(clean(e.getMessage())); }
                    } else f.append("|createIndex=none");
                    f.append("|rowsBeforeIndex=").append(rowsBefore).append("|rowsAfterIndex=").append(count(st, "SELECT COUNT(*) FROM member"));
                    f.append("|sameRowsAfterIndex=").append(before.equals(ids(st, "SELECT id FROM member ORDER BY id")));
                    f.append("|indexesAfterCreateIndex=").append(indexes(st));
                    // SELECT: 화면의 문장(앞의 주석 줄까지)을 글자 그대로 실행한다
                    String foundIds = ids(st, last);
                    f.append("|found=").append(foundIds.isEmpty() ? 0 : foundIds.split(",").length).append("|ids=").append(foundIds);
                    String ex = plan(st, "EXPLAIN ", select), an = plan(st, "EXPLAIN ANALYZE ", select);
                    f.append("|via=").append(clean(via(ex))).append("|scan=").append(scanCount(an));
                    f.append("|explain=").append(clean(ex.replaceAll("\\s+", " ")));
                }
                out.add(idx + "|" + cond + " => " + f);
            }
        // 근거 1: scanCount는 "읽은 행 수 + 1"이다. 조건에 행마다 세는 함수를 쓰면 색인을 못 써서 테이블 전체를 읽고, 함수가 불린 횟수가 읽은 행 수다.
        try (Connection c = DriverManager.getConnection("jdbc:h2:mem:index_basic_extra1"); Statement st = c.createStatement()) {
            st.execute("CREATE ALIAS CNT FOR \"IndexBasicProbe.cnt\"");
            st.execute("CREATE TABLE member (id INT PRIMARY KEY, name VARCHAR(20), city VARCHAR(20))");
            fill(c, 1000);
            st.execute("CREATE INDEX idx_name ON member(name)");
            String s = "SELECT * FROM member WHERE CNT(name) = '회원777'";
            CALLS.set(0);
            int found = ids(st, s.replace("*", "id")).isEmpty() ? 0 : 1;
            int calls = CALLS.get();
            String an = plan(st, "EXPLAIN ANALYZE ", s);
            out.add("extra|counted => calls=" + calls + "|found=" + found + "|scan=" + scanCount(an) + "|via=" + clean(via(plan(st, "EXPLAIN ", s))));
        }
        // 근거 2: 같은 모양의 조회를 행 수가 다른 테이블에서, 그리고 없는 값을 찾을 때 실행해 scanCount를 본다
        for (int n : new int[] { 0, 10, 1000 }) {
            try (Connection c = DriverManager.getConnection("jdbc:h2:mem:index_basic_extra2_" + n); Statement st = c.createStatement()) {
                st.execute("CREATE TABLE member (id INT PRIMARY KEY, name VARCHAR(20), city VARCHAR(20))");
                fill(c, n);
                String an = plan(st, "EXPLAIN ANALYZE ", "SELECT * FROM member WHERE name = '회원777'");
                String an2 = plan(st, "EXPLAIN ANALYZE ", "SELECT * FROM member WHERE id = 777");
                out.add("extra|tableOf" + n + " => fullScan=" + scanCount(an) + "|pkLookup=" + scanCount(an2));
            }
        }
        // 근거 3: 색인으로 찾을 때, 없는 값은 0행(scanCount 1), 있는 값은 1행(scanCount 2)
        try (Connection c = DriverManager.getConnection("jdbc:h2:mem:index_basic_extra3"); Statement st = c.createStatement()) {
            st.execute("CREATE TABLE member (id INT PRIMARY KEY, name VARCHAR(20), city VARCHAR(20))");
            fill(c, 1000);
            st.execute("CREATE INDEX idx_name ON member(name)");
            out.add("extra|indexLookup => present=" + scanCount(plan(st, "EXPLAIN ANALYZE ", "SELECT * FROM member WHERE name = '회원777'"))
                + "|missing=" + scanCount(plan(st, "EXPLAIN ANALYZE ", "SELECT * FROM member WHERE name = '회원0'"))
                + "|pkMissing=" + scanCount(plan(st, "EXPLAIN ANALYZE ", "SELECT * FROM member WHERE id = 5000")));
        }
        // 근거 4: city 열에 색인을 만들면 city로 찾을 때 그 색인을 쓴다(읽은 행 250 = 찾아낸 행)
        try (Connection c = DriverManager.getConnection("jdbc:h2:mem:index_basic_extra4"); Statement st = c.createStatement()) {
            st.execute("CREATE TABLE member (id INT PRIMARY KEY, name VARCHAR(20), city VARCHAR(20))");
            fill(c, 1000);
            st.execute("CREATE INDEX idx_city ON member(city)");
            String s = "SELECT * FROM member WHERE city = '부산'";
            out.add("extra|cityIndex => via=" + clean(via(plan(st, "EXPLAIN ", s))) + "|scan=" + scanCount(plan(st, "EXPLAIN ANALYZE ", s)) + "|found=" + ids(st, s).split(",").length);
        }
        Files.write(Path.of(args[0]), out, StandardCharsets.UTF_8);
        System.out.println(out.get(0) + " | " + (out.size() - 1) + " lines");
        out.forEach(System.out::println);
    }
}

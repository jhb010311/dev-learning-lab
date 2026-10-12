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

// 기초개념 "기본 키" 실습을 실제 DB(H2 2.4.240, 메모리 DB, JDBC)에서 확인한다. 스프링은 쓰지 않는다.
// 조합마다 DB를 새로 만들고, 화면에 보이는 SQL 전체를 글자 그대로(주석 줄 포함) 한 문장씩 실행한다.
//   pk     : id 열에 PRIMARY KEY를 적는가
//   second : 두 번째 INSERT의 id 값. same(1, 첫 행과 같음) / diff(2) / null(NULL)
// 적는 것: 실행한 SQL 전체, 두 번째 INSERT의 결과(오류면 SQLSTATE, 오류 코드, 메시지 첫 줄), INSERT 두 번 뒤의 행 수,
//         UPDATE가 돌려준 수, 마지막 SELECT 결과, 그리고 문장의 근거로 쓰는 NULL 비교 두 가지.
public class PkBasicProbe {
    // 화면의 코드와 같은 글. 줄바꿈 \n 으로 이어 붙인다(마지막 줄 뒤에는 줄바꿈 없음).
    static String sql(boolean pk, String second) {
        String id2 = second.equals("same") ? "1" : second.equals("diff") ? "2" : "NULL";
        List<String> l = new ArrayList<>();
        l.add("CREATE TABLE member (");
        if (pk) l.add("    -- 기본 키: 이 열의 값은 행마다 달라야 하고 비어 있을 수 없다");
        l.add("    id   INT" + (pk ? " PRIMARY KEY" : "") + ",");
        l.add("    name VARCHAR(20)");
        l.add(");");
        l.add("");
        l.add("INSERT INTO member VALUES (1, '김철수');");
        l.add("INSERT INTO member VALUES (" + id2 + ", '이영희');");
        l.add("");
        l.add("UPDATE member SET name = '박민수' WHERE id = 1;");
        l.add("SELECT * FROM member ORDER BY id;");
        return String.join("\n", l);
    }

    static String clean(String s) { return s == null ? "" : s.replace('|', '\u00a6').replace("\r", "").replace("\n", "\\n"); }

    static int count(Statement st, String where) throws SQLException {
        try (ResultSet rs = st.executeQuery("SELECT COUNT(*) FROM member" + where)) { rs.next(); return rs.getInt(1); }
    }

    static String rows(Statement st, String sqlText) throws SQLException {
        List<String> r = new ArrayList<>();
        try (ResultSet rs = st.executeQuery(sqlText)) {
            while (rs.next()) { Object id = rs.getObject(1); r.add("(" + (id == null ? "NULL" : id) + ", " + rs.getString(2) + ")"); }
        }
        return String.join(", ", r);
    }

    public static void main(String[] args) throws Exception {
        List<String> out = new ArrayList<>();
        String ver;
        try (Connection c = DriverManager.getConnection("jdbc:h2:mem:pk_basic_ver")) { ver = c.getMetaData().getDatabaseProductName() + " " + c.getMetaData().getDatabaseProductVersion(); }
        out.add("# " + ver + " | java " + System.getProperty("java.version"));
        for (boolean pk : new boolean[] { false, true })
            for (String second : new String[] { "same", "diff", "null" }) {
                String script = sql(pk, second);
                // 한 문장씩 실행하려고 ;로 자른다(화면의 SQL 안에는 ;가 문장 끝에만 있다)
                List<String> stmts = new ArrayList<>();
                for (String s : script.split(";")) if (!s.isBlank()) stmts.add(s.strip());
                StringBuilder f = new StringBuilder();
                f.append("sql=").append(clean(script));
                try (Connection c = DriverManager.getConnection("jdbc:h2:mem:pk_basic_" + pk + "_" + second); Statement st = c.createStatement()) {
                    try { st.execute(stmts.get(0)); f.append("|create=OK"); } catch (SQLException e) { f.append("|create=ERR ").append(clean(e.getMessage())); }
                    try { st.execute(stmts.get(1)); f.append("|ins1=OK"); } catch (SQLException e) { f.append("|ins1=ERR ").append(clean(e.getMessage())); }
                    try { st.execute(stmts.get(2)); f.append("|ins2=OK"); }
                    catch (SQLException e) {
                        String m = e.getMessage() == null ? "" : e.getMessage().split("\n")[0];
                        f.append("|ins2=ERR|sqlstate=").append(e.getSQLState()).append("|code=").append(e.getErrorCode()).append("|msg=").append(clean(m));
                    }
                    f.append("|count=").append(count(st, ""));
                    f.append("|updated=").append(st.executeUpdate(stmts.get(3)));
                    f.append("|final=").append(rows(st, stmts.get(4)));
                    f.append("|eqNull=").append(count(st, " WHERE id = NULL"));
                    f.append("|isNull=").append(count(st, " WHERE id IS NULL"));
                }
                out.add(pk + "|" + second + " => " + f);
            }
        // 문장의 근거: PRIMARY KEY가 없으면 id가 비어 있는 행을 더 넣어도 받아들이고, IS NULL은 그 행들을 모두 고른다
        try (Connection c = DriverManager.getConnection("jdbc:h2:mem:pk_basic_extra"); Statement st = c.createStatement()) {
            st.execute("CREATE TABLE member (id INT, name VARCHAR(20))");
            st.execute("INSERT INTO member VALUES (NULL, '이영희')");
            st.execute("INSERT INTO member VALUES (NULL, '최지우')");
            out.add("extra|twoNullIds => count=" + count(st, "") + "|isNull=" + count(st, " WHERE id IS NULL") + "|eqNull=" + count(st, " WHERE id = NULL"));
        }
        Files.write(Path.of(args[0]), out, StandardCharsets.UTF_8);
        System.out.println(out.get(0) + " | " + (out.size() - 2) + " combos");
        out.forEach(System.out::println);
    }
}

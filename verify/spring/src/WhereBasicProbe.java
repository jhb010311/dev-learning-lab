import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

// 기초개념 "WHERE" 실습을 실제 DB(H2 2.4.240, 메모리 DB, JDBC)에서 확인한다. 스프링은 쓰지 않는다.
// 조합마다 DB를 새로 만들고, 화면에 보이는 SQL 전체를 글자 그대로(주석 줄 포함) 한 문장씩 실행한다.
//   stmt : WHERE를 붙이는 문장. update / delete / select
//   cond : WHERE 조건. one(id = 2) / many(age = 30) / zero(id = 9) / none(WHERE 없음)
// 적는 것: 실행한 SQL 전체, 문장이 돌려준 수(UPDATE·DELETE는 executeUpdate, SELECT는 읽힌 행 수),
//         문장이 적용된 행의 id(UPDATE는 이름이 바뀐 행, DELETE는 사라진 행, SELECT는 읽힌 행), 오류 여부, 마지막 SELECT 결과.
public class WhereBasicProbe {
    // 화면의 코드와 같은 글. 줄바꿈 \n 으로 이어 붙인다(마지막 줄 뒤에는 줄바꿈 없음).
    static String sql(String stmt, String cond) {
        String head = stmt.equals("update") ? "UPDATE member SET name = '탈퇴'" : stmt.equals("delete") ? "DELETE FROM member" : "SELECT * FROM member";
        String where = cond.equals("one") ? " WHERE id = 2" : cond.equals("many") ? " WHERE age = 30" : cond.equals("zero") ? " WHERE id = 9" : "";
        List<String> l = new ArrayList<>();
        l.add("CREATE TABLE member (");
        l.add("    id   INT PRIMARY KEY,");
        l.add("    name VARCHAR(20),");
        l.add("    age  INT");
        l.add(");");
        l.add("INSERT INTO member VALUES (1, '김철수', 20);");
        l.add("INSERT INTO member VALUES (2, '이영희', 30);");
        l.add("INSERT INTO member VALUES (3, '박민수', 30);");
        l.add("");
        if (!cond.equals("none")) l.add("-- WHERE: 조건에 맞는 행에만 이 문장을 적용한다");
        l.add(head + where + ";");
        l.add("SELECT * FROM member ORDER BY id;");
        return String.join("\n", l);
    }

    static String clean(String s) { return s == null ? "" : s.replace('|', '¦').replace("\r", "").replace("\n", "\\n"); }

    // id -> "name,age"
    static Map<Integer, String> snapshot(Statement st) throws SQLException {
        Map<Integer, String> m = new LinkedHashMap<>();
        try (ResultSet rs = st.executeQuery("SELECT id, name, age FROM member ORDER BY id")) {
            while (rs.next()) m.put(rs.getInt(1), rs.getString(2) + "," + rs.getInt(3));
        }
        return m;
    }

    static String rows(Statement st, String sqlText) throws SQLException {
        List<String> r = new ArrayList<>();
        try (ResultSet rs = st.executeQuery(sqlText)) {
            while (rs.next()) r.add("(" + rs.getInt(1) + ", " + rs.getString(2) + ", " + rs.getInt(3) + ")");
        }
        return r.isEmpty() ? "(행이 없음)" : String.join(", ", r);
    }

    public static void main(String[] args) throws Exception {
        List<String> out = new ArrayList<>();
        String ver;
        try (Connection c = DriverManager.getConnection("jdbc:h2:mem:where_basic_ver")) { ver = c.getMetaData().getDatabaseProductName() + " " + c.getMetaData().getDatabaseProductVersion(); }
        out.add("# " + ver + " | java " + System.getProperty("java.version"));
        for (String stmt : new String[] { "update", "delete", "select" })
            for (String cond : new String[] { "one", "many", "zero", "none" }) {
                String script = sql(stmt, cond);
                // 한 문장씩 실행하려고 ;로 자른다(화면의 SQL 안에는 ;가 문장 끝에만 있다)
                List<String> stmts = new ArrayList<>();
                for (String s : script.split(";")) if (!s.isBlank()) stmts.add(s.strip());
                StringBuilder f = new StringBuilder();
                f.append("sql=").append(clean(script));
                f.append("|stmts=").append(stmts.size());
                try (Connection c = DriverManager.getConnection("jdbc:h2:mem:where_basic_" + stmt + "_" + cond); Statement st = c.createStatement()) {
                    for (int i = 0; i < 4; i++) st.execute(stmts.get(i));
                    Map<Integer, String> before = snapshot(st);
                    String target = stmts.get(4);
                    int applied;
                    List<Integer> ids = new ArrayList<>();
                    String err = "none";
                    try {
                        if (stmt.equals("select")) {
                            applied = 0;
                            try (ResultSet rs = st.executeQuery(target)) { while (rs.next()) { applied++; ids.add(rs.getInt(1)); } }
                        } else {
                            applied = st.executeUpdate(target);
                            Map<Integer, String> after = snapshot(st);
                            for (Map.Entry<Integer, String> e : before.entrySet())
                                if (!e.getValue().equals(after.get(e.getKey()))) ids.add(e.getKey());
                        }
                    } catch (SQLException e) {
                        applied = -1;
                        err = "ERR " + e.getSQLState() + " " + clean(e.getMessage() == null ? "" : e.getMessage().split("\n")[0]);
                    }
                    f.append("|err=").append(err);
                    f.append("|applied=").append(applied);
                    f.append("|ids=").append(ids.toString().replace("[", "").replace("]", "").replace(" ", ""));
                    f.append("|total=").append(before.size());
                    f.append("|final=").append(rows(st, stmts.get(5)));
                }
                out.add(stmt + "|" + cond + " => " + f);
            }
        Files.write(Path.of(args[0]), out, StandardCharsets.UTF_8);
        System.out.println(out.get(0) + " | " + (out.size() - 1) + " combos");
        out.forEach(System.out::println);
    }
}

import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.ResultSet;
import java.sql.ResultSetMetaData;
import java.sql.SQLException;
import java.sql.Statement;
import java.util.ArrayList;
import java.util.List;

// 기초개념 "테이블, 행, 열" 실습을 실제 DB(H2 2.4.240, 메모리 DB, JDBC)에서 확인한다. 스프링은 쓰지 않는다.
// 조합마다 DB를 새로 만들고, 화면에 보이는 SQL 전체를 글자 그대로(주석 줄 포함) 문장 하나씩 따로 실행한다.
// 한 문장이 실패해도 다음 문장은 계속 실행한다.
//   create : CREATE TABLE 문이 있는가
//   second : 둘째 INSERT. ok(2, '이영희') / text('둘', '이영희') / more(2, '이영희', 30) / less(2)
//   col    : SELECT가 읽는 열. name / age(없는 열)
// 적는 것: 실행한 SQL 전체, 문장마다 OK 또는 오류(SQLSTATE, 오류 코드, 메시지 첫 줄),
//         CREATE 직후의 행 수, 첫 INSERT 뒤의 행 수, INSERT 두 번 뒤의 행 수, 열의 이름과 타입(메타데이터),
//         SELECT가 읽은 값.
public class TableBasicProbe {
    // 화면의 코드와 같은 글. 줄바꿈 \n 으로 이어 붙인다(마지막 줄 뒤에는 줄바꿈 없음).
    static String sql(boolean create, String second, String col) {
        String row2 = second.equals("ok") ? "(2, '이영희')" : second.equals("text") ? "('둘', '이영희')" : second.equals("more") ? "(2, '이영희', 30)" : "(2)";
        List<String> l = new ArrayList<>();
        if (create) {
            l.add("-- 테이블: member라는 표를 만들고, 열 두 개(id, name)를 정한다");
            l.add("CREATE TABLE member (");
            l.add("    id   INT,");
            l.add("    name VARCHAR(20)");
            l.add(");");
            l.add("");
        }
        l.add("-- 행: 한 사람의 정보 한 줄을 넣는다");
        l.add("INSERT INTO member VALUES (1, '김철수');");
        l.add("INSERT INTO member VALUES " + row2 + ";");
        l.add("");
        l.add("SELECT " + col + " FROM member;");
        return String.join("\n", l);
    }

    static String clean(String s) { return s == null ? "" : s.replace('|', '¦').replace("\r", "").replace("\n", "\\n"); }

    // 문장 앞의 주석 줄을 떼고 첫 낱말로 종류를 알아낸다
    static String kind(String stmt) {
        for (String ln : stmt.split("\n")) {
            String t = ln.strip();
            if (t.isEmpty() || t.startsWith("--")) continue;
            return t.split("\\s+")[0].toUpperCase();
        }
        return "";
    }

    static String err(String name, SQLException e) {
        String m = e.getMessage() == null ? "" : e.getMessage().split("\n")[0];
        return name + "=ERR|" + name + "_state=" + e.getSQLState() + "|" + name + "_code=" + e.getErrorCode() + "|" + name + "_msg=" + clean(m);
    }

    static String count(Statement st) {
        try (ResultSet rs = st.executeQuery("SELECT COUNT(*) FROM member")) { rs.next(); return String.valueOf(rs.getInt(1)); }
        catch (SQLException e) { return "ERR " + e.getSQLState(); }
    }

    public static void main(String[] args) throws Exception {
        List<String> out = new ArrayList<>();
        String ver;
        try (Connection c = DriverManager.getConnection("jdbc:h2:mem:table_basic_ver")) { ver = c.getMetaData().getDatabaseProductName() + " " + c.getMetaData().getDatabaseProductVersion(); }
        out.add("# " + ver + " | java " + System.getProperty("java.version"));
        int n = 0;
        for (boolean create : new boolean[] { true, false })
            for (String second : new String[] { "ok", "text", "more", "less" })
                for (String col : new String[] { "name", "age" }) {
                    String script = sql(create, second, col);
                    // 한 문장씩 실행하려고 ;로 자른다(화면의 SQL 안에는 ;가 문장 끝에만 있다)
                    List<String> stmts = new ArrayList<>();
                    for (String s : script.split(";")) if (!s.isBlank()) stmts.add(s.strip());
                    StringBuilder f = new StringBuilder();
                    f.append("sql=").append(clean(script));
                    int ins = 0;
                    try (Connection c = DriverManager.getConnection("jdbc:h2:mem:table_basic_" + create + "_" + second + "_" + col); Statement st = c.createStatement()) {
                        for (String s : stmts) {
                            String k = kind(s);
                            try {
                                if (k.equals("SELECT")) {
                                    List<String> vals = new ArrayList<>();
                                    try (ResultSet rs = st.executeQuery(s)) { while (rs.next()) vals.add(rs.getString(1)); }
                                    f.append("|sel=OK|vals=").append(String.join(", ", vals)).append("|nrows=").append(vals.size());
                                } else {
                                    st.execute(s);
                                    if (k.equals("CREATE")) {
                                        f.append("|create=OK|rows0=").append(count(st));
                                        // 열의 이름과 타입을 DB가 기억하고 있는지: 메타데이터로 읽는다
                                        try (ResultSet rs = st.executeQuery("SELECT * FROM member")) {
                                            ResultSetMetaData md = rs.getMetaData();
                                            List<String> cols = new ArrayList<>();
                                            for (int i = 1; i <= md.getColumnCount(); i++) cols.add(md.getColumnName(i) + ":" + md.getColumnTypeName(i) + (md.getPrecision(i) > 0 && md.getColumnTypeName(i).startsWith("CHARACTER") ? "(" + md.getPrecision(i) + ")" : ""));
                                            f.append("|meta=").append(String.join(",", cols));
                                        }
                                    } else {
                                        ins++;
                                        f.append("|ins").append(ins).append("=OK");
                                        if (ins == 1) f.append("|rows1=").append(count(st));
                                    }
                                }
                            } catch (SQLException e) {
                                if (k.equals("CREATE")) f.append("|").append(err("create", e));
                                else if (k.equals("SELECT")) f.append("|").append(err("sel", e));
                                else { ins++; f.append("|").append(err("ins" + ins, e)); if (ins == 1) f.append("|rows1=").append(count(st)); }
                            }
                        }
                        f.append("|count=").append(count(st));
                    }
                    out.add(create + "|" + second + "|" + col + " => " + f);
                    n++;
                }
        Files.write(Path.of(args[0]), out, StandardCharsets.UTF_8);
        System.out.println(out.get(0) + " | " + n + " combos");
        out.forEach(System.out::println);
    }
}

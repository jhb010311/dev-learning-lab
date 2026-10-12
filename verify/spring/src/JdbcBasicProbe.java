import java.io.ByteArrayOutputStream;
import java.io.PrintStream;
import java.net.URI;
import java.net.URL;
import java.net.URLClassLoader;
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
import javax.tools.Diagnostic;
import javax.tools.DiagnosticCollector;
import javax.tools.JavaCompiler;
import javax.tools.JavaFileObject;
import javax.tools.SimpleJavaFileObject;
import javax.tools.ToolProvider;

// 기초개념 "JDBC" 실습을 실제 H2 2.4.240(메모리 DB)에서 확인한다. 스프링은 쓰지 않는다.
// 조합(연결 2 x SQL 3 = 6개)마다 화면에 보이는 자바 코드를 main 안에 넣은 Main.java를 만들어 javax.tools로 컴파일하고,
// 새 자바 프로세스(child)에서 실행한다. 자식은 먼저 member 테이블과 행 하나를 만들고(화면에서는 줄인 준비 코드),
// QUERY_STATISTICS를 켠 뒤 Main.main을 부르고, 출력과 던져진 예외와 DB 쪽 기록을 한 줄로 남긴다.
//   conn : open(연결을 맺고 보낸다) / closed(conn.close()를 한 뒤에 보낸다)
//   sql  : ok(맞는 SQL) / typo(없는 테이블 memberr) / none(조건에 맞는 행이 없는 WHERE id = 99)
// 출력 한 줄: conn|sql => compile=OK|out=..|exc=..|state=..|code=..|msg=..|frames=..|parser=..|quotes=..|stat=..|recv=..|sessions=..
//   recv(DB가 받은 SQL) : QUERY_STATISTICS에 그 SELECT가 실행 기록으로 남았으면 그 SQL,
//                        아니면 예외가 DB 엔진의 파서(org.h2.command.Parser)에서 났고 메시지가 그 SQL을 인용하면 그 SQL, 아니면 -
// 끝에 FACT 줄: 단계 문장이 기대는 사실(세션 수, 문장을 만들 때는 SQL이 가지 않는 것, next() 전에 읽으면 예외).
public class JdbcBasicProbe {
    // 화면의 코드(실습의 code 함수)와 같은 글
    static String body(String conn, String sql) {
        String table = sql.equals("typo") ? "memberr" : "member";
        String where = sql.equals("none") ? "id = 99" : "id = 1";
        List<String> l = new ArrayList<>();
        l.add("// member 테이블에는 (id 1, name kim) 한 행이 들어 있다");
        l.add("// 연결: 주소가 가리키는 DB와 연결을 맺는다");
        l.add("Connection conn = DriverManager.getConnection(\"jdbc:h2:mem:shop\");");
        l.add("// 도구: 이 연결로 SQL을 보내는 객체");
        l.add("Statement st = conn.createStatement();");
        if (conn.equals("closed")) {
            l.add("// 닫기: DB와의 연결을 끊는다");
            l.add("conn.close();");
        }
        l.add("// 보내기: SQL 글자를 DB에 보내고, 결과를 받는다");
        l.add("ResultSet rs = st.executeQuery(\"SELECT name FROM " + table + " WHERE " + where + "\");");
        l.add("// 읽기: 다음 행으로 옮긴다. 행이 있으면 true");
        l.add("boolean found = rs.next();");
        l.add("System.out.println(found);");
        l.add("System.out.println(rs.getString(\"name\"));");
        return String.join("\n", l);
    }

    static String wrap(String body) {
        StringBuilder s = new StringBuilder("import java.sql.*;\n\npublic class Main {\n    public static void main(String[] args) throws Exception {\n");
        for (String ln : body.split("\n")) s.append("        ").append(ln).append("\n");
        return s.append("    }\n}\n").toString();
    }

    static String clean(String s) { return s == null ? "" : s.replace('|', '¦').replace("\r", "").replace("\n", "\\n"); }

    // ---------- 부모: 컴파일하고 조합마다 자식 프로세스를 띄운다 ----------
    static String runChild(String h2, String self, List<String> args) throws Exception {
        List<String> cmd = new ArrayList<>(List.of(Path.of(System.getProperty("java.home"), "bin", "java").toString(),
            "-Dfile.encoding=UTF-8", "-Dstdout.encoding=UTF-8", "-cp", h2 + System.getProperty("path.separator") + self, "JdbcBasicProbe"));
        cmd.addAll(args);
        Process p = new ProcessBuilder(cmd).redirectErrorStream(true).start();
        String all = new String(p.getInputStream().readAllBytes(), StandardCharsets.UTF_8);
        p.waitFor();
        for (String ln : all.split("\r?\n")) if (ln.startsWith("RESULT ")) return ln.substring(7);
        return "자식 프로세스 오류: " + clean(all);
    }

    public static void main(String[] args) throws Exception {
        if (args.length > 0 && args[0].equals("child")) { child(args); return; }
        if (args.length > 0 && args[0].equals("fact")) { fact(); return; }
        String outFile = args[0], base = args[1], h2 = args[2], self = args[3];
        JavaCompiler jc = ToolProvider.getSystemJavaCompiler();
        List<String> out = new ArrayList<>();
        out.add("# java " + System.getProperty("java.version") + " | H2 2.4.240");
        for (String conn : new String[] { "open", "closed" })
            for (String sql : new String[] { "ok", "typo", "none" }) {
                String src = wrap(body(conn, sql));
                Path dir = Path.of(base, conn + "-" + sql);
                Files.createDirectories(dir);
                Files.deleteIfExists(dir.resolve("Main.class"));
                Files.writeString(dir.resolve("Main.java"), src, StandardCharsets.UTF_8);
                DiagnosticCollector<JavaFileObject> dc = new DiagnosticCollector<>();
                JavaFileObject fo = new SimpleJavaFileObject(URI.create("string:///Main.java"), JavaFileObject.Kind.SOURCE) {
                    @Override public CharSequence getCharContent(boolean ignore) { return src; }
                };
                boolean ok = jc.getTask(null, null, dc, List.of("-d", dir.toString(), "-proc:none"), null, List.of(fo)).call();
                String line;
                if (!ok) {
                    StringBuilder e = new StringBuilder();
                    for (Diagnostic<? extends JavaFileObject> d : dc.getDiagnostics()) e.append(d.getKind()).append(' ').append(d.getMessage(java.util.Locale.ENGLISH)).append(' ');
                    line = "compile=ERR " + clean(e.toString());
                } else line = "compile=OK|" + runChild(h2, self, List.of("child", dir.toString()));
                out.add(conn + "|" + sql + " => " + line);
            }
        out.add("FACT " + runChild(h2, self, List.of("fact")));
        Files.write(Path.of(outFile), out, StandardCharsets.UTF_8);
        out.forEach(System.out::println);
    }

    // ---------- 자식: 한 조합을 실행 ----------
    static void prepare(Connection setup) throws SQLException {
        try (Statement s = setup.createStatement()) {
            s.execute("CREATE TABLE member (id INT PRIMARY KEY, name VARCHAR(20))");
            s.execute("INSERT INTO member VALUES (1, 'kim')");
            s.execute("SET QUERY_STATISTICS TRUE");
        }
    }

    static int sessions(Connection setup) throws SQLException {
        try (Statement s = setup.createStatement(); ResultSet r = s.executeQuery("SELECT COUNT(*) FROM INFORMATION_SCHEMA.SESSIONS")) { r.next(); return r.getInt(1); }
    }

    static List<String> stats(Connection setup) throws SQLException {
        List<String> l = new ArrayList<>();
        try (Statement s = setup.createStatement(); ResultSet r = s.executeQuery("SELECT SQL_STATEMENT, EXECUTION_COUNT FROM INFORMATION_SCHEMA.QUERY_STATISTICS ORDER BY SQL_STATEMENT")) {
            while (r.next()) l.add(r.getString(1) + " x" + r.getString(2));
        }
        return l;
    }

    static void child(String[] args) throws Exception {
        Path dir = Path.of(args[1]);
        Connection setup = DriverManager.getConnection("jdbc:h2:mem:shop");
        prepare(setup);
        PrintStream real = System.out;
        ByteArrayOutputStream buf = new ByteArrayOutputStream();
        Throwable thrown = null;
        try (URLClassLoader cl = new URLClassLoader(new URL[] { dir.toUri().toURL() }, JdbcBasicProbe.class.getClassLoader())) {
            System.setOut(new PrintStream(buf, true, StandardCharsets.UTF_8));
            try { cl.loadClass("Main").getMethod("main", String[].class).invoke(null, (Object) new String[0]); }
            catch (java.lang.reflect.InvocationTargetException e) { thrown = e.getCause(); }
            finally { System.setOut(real); }
        }
        String printed = buf.toString(StandardCharsets.UTF_8).strip().replace("\r\n", "\n").replace("\n", " / ");
        String main = Files.readString(dir.resolve("Main.java"), StandardCharsets.UTF_8);
        String sql = null;
        for (String ln : main.split("\n")) if (ln.contains("executeQuery(\"")) sql = ln.substring(ln.indexOf("executeQuery(\"") + 14, ln.lastIndexOf("\""));
        StringBuilder f = new StringBuilder("out=" + clean(printed));
        boolean parser = false, quotes = false;
        if (thrown == null) f.append("|exc=-|state=-|code=-|msg=-|frames=-");
        else {
            String msg = thrown.getMessage() == null ? "" : thrown.getMessage();
            StringBuilder fr = new StringBuilder();
            int shown = 0;
            for (StackTraceElement e : thrown.getStackTrace()) {
                if (e.getClassName().startsWith("org.h2.message.") || shown >= 3) continue;
                fr.append(shown++ > 0 ? " < " : "").append(e.getClassName().replace("org.h2.", "")).append('.').append(e.getMethodName());
            }
            for (StackTraceElement e : thrown.getStackTrace()) if (e.getClassName().equals("org.h2.command.Parser")) parser = true;
            quotes = msg.contains("SQL statement:\n" + sql);
            String state = "-", code = "-";
            if (thrown instanceof SQLException se) { state = se.getSQLState(); code = String.valueOf(se.getErrorCode()); }
            f.append("|exc=").append(thrown.getClass().getName()).append(thrown instanceof SQLException ? " (SQLException)" : "")
                .append("|state=").append(state).append("|code=").append(code)
                .append("|msg=").append(clean(msg.split("\n")[0])).append("|frames=").append(fr);
        }
        List<String> st = stats(setup);
        String hit = "-";
        for (String s : st) if (s.startsWith("SELECT name FROM")) hit = s.substring(0, s.lastIndexOf(" x"));
        String recv = !hit.equals("-") ? hit : parser && quotes ? sql : "-";
        f.append("|parser=").append(parser).append("|quotes=").append(quotes).append("|stat=").append(hit).append("|recv=").append(recv)
            .append("|sessions=").append(sessions(setup));
        real.println("RESULT " + f);
    }

    // ---------- 사실 확인 ----------
    static int selectRows(Connection setup) throws SQLException {
        return (int) stats(setup).stream().filter(x -> x.startsWith("SELECT name FROM")).count();
    }

    // QUERY_STATISTICS는 한 번 읽은 뒤에는 다시 읽어도 새 기록이 보이지 않았다(원인은 확인하지 않음).
    // 그래서 "그 시점의 기록"은 DB를 따로 만들어 시점마다 한 번만 읽는다.
    static void fact() throws Exception {
        StringBuilder f = new StringBuilder();
        // A: 연결을 맺고 Statement만 만든 시점의 기록
        try (Connection setup = DriverManager.getConnection("jdbc:h2:mem:factA")) {
            prepare(setup);
            Connection c = DriverManager.getConnection("jdbc:h2:mem:factA");
            Statement st = c.createStatement();
            f.append("selectAfterCreateStatement=").append(selectRows(setup));
            c.close();
        }
        // B: executeQuery까지 한 시점의 기록
        try (Connection setup = DriverManager.getConnection("jdbc:h2:mem:factB")) {
            prepare(setup);
            Connection c = DriverManager.getConnection("jdbc:h2:mem:factB");
            Statement st = c.createStatement();
            ResultSet rs = st.executeQuery("SELECT name FROM member WHERE id = 1");
            f.append("|selectAfterExecuteQuery=").append(selectRows(setup));
            c.close();
        }
        // C: 세션 수와, next() 전에 읽으면 나는 예외, next()를 두 번 부른 결과
        try (Connection setup = DriverManager.getConnection("jdbc:h2:mem:factC")) {
            prepare(setup);
            int s0 = sessions(setup);
            Connection conn = DriverManager.getConnection("jdbc:h2:mem:factC");
            int s1 = sessions(setup);
            Statement st = conn.createStatement();
            ResultSet rs = st.executeQuery("SELECT name FROM member WHERE id = 1");
            String before;
            try { rs.getString("name"); before = "읽힘"; } catch (SQLException e) { before = "SQLException " + e.getSQLState() + " " + e.getErrorCode() + " " + clean(e.getMessage()); }
            boolean n1 = rs.next();
            String name = rs.getString("name");
            boolean n2 = rs.next();
            conn.close();
            int s2 = sessions(setup);
            f.append("|sessions(before,open,closed)=").append(s0).append(',').append(s1).append(',').append(s2)
                .append("|getStringBeforeNext=").append(before).append("|nextTwice=").append(n1).append(',').append(n2).append("|name=").append(name)
                .append("|product=").append(setup.getMetaData().getDatabaseProductName()).append(' ').append(setup.getMetaData().getDatabaseProductVersion());
        }
        System.out.println("RESULT " + f);
    }
}

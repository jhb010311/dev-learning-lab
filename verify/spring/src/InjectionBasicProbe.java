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
import java.sql.PreparedStatement;
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

// 기초개념 "SQL 인젝션" 실습을 실제 H2 2.4.240(메모리 DB)에서 확인한다. 스프링은 쓰지 않는다.
// 조합(방법 2 x 입력 3 = 6개)마다 화면에 보이는 자바 코드를 main 안에 넣은 Main.java를 만들어 javax.tools로 컴파일하고,
// 새 자바 프로세스(child)에서 실행한다. 자식은 먼저 member 테이블과 세 행(kim, lee, O'Neil)을 만들고(화면에서는 줄인 준비 코드),
// QUERY_STATISTICS를 켠 뒤 Main.main을 부르고, 출력과 던져진 예외와 DB 쪽 기록을 한 줄로 남긴다.
//   how   : bind(sql에 ?를 적고 ps.setString으로 값을 따로 넘긴다) / concat(sql 글자에 input을 이어 붙이고 st.executeQuery(sql)로 보낸다)
//   input : kim / or(' OR '1'='1) / oneil(O'Neil)
// 출력 한 줄: how|input => compile=OK|out=..|exc=..|state=..|code=..|msg=..|frames=..|parser=..|quotes=..|stat=..|recv=..
//   recv(DB가 받은 SQL) : QUERY_STATISTICS에 그 SELECT가 실행 기록으로 남았으면 그 SQL,
//                        아니면 예외가 DB 엔진의 파서(org.h2.command.Parser)에서 났고 메시지가 그 SQL을 인용하면 그 SQL, 아니면 -
// 끝에 FACT 줄: 단계 문장이 기대는 사실(값을 넘긴 형태, 실행 전에는 DB 실행 기록이 없는 것, 파라미터 개수).
public class InjectionBasicProbe {
    static String inp(String input) { return input.equals("or") ? "' OR '1'='1" : input.equals("oneil") ? "O'Neil" : "kim"; }

    // 화면의 코드(실습의 code 함수)와 같은 글
    static String body(String how, String input) {
        List<String> l = new ArrayList<>();
        l.add("// member 테이블에는 세 행(name: kim, lee, O'Neil)이 들어 있다");
        l.add("// 연결: 주소가 가리키는 DB와 연결을 맺는다");
        l.add("Connection conn = DriverManager.getConnection(\"jdbc:h2:mem:shop\");");
        l.add("// 입력: 사용자가 입력창에 쓴 글이라고 하자");
        l.add("String input = \"" + inp(input) + "\";");
        if (how.equals("bind")) {
            l.add("// SQL: 값이 들어갈 자리를 ?로 비워 둔다");
            l.add("String sql = \"SELECT name FROM member WHERE name = ?\";");
            l.add("// 보내기: SQL 글자와 값을 따로 넘긴다");
            l.add("PreparedStatement ps = conn.prepareStatement(sql);");
            l.add("ps.setString(1, input);");
            l.add("ResultSet rs = ps.executeQuery();");
        } else {
            l.add("// SQL: input의 글자를 SQL 글자 사이에 그대로 이어 붙인다");
            l.add("String sql = \"SELECT name FROM member WHERE name = '\" + input + \"'\";");
            l.add("// 보내기: 이어 붙여 완성한 SQL 글자를 통째로 보낸다");
            l.add("Statement st = conn.createStatement();");
            l.add("ResultSet rs = st.executeQuery(sql);");
        }
        l.add("// 읽기: 돌아온 행마다 name을 출력한다");
        l.add("while (rs.next()) {");
        l.add("    System.out.println(rs.getString(\"name\"));");
        l.add("}");
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
            "-Dfile.encoding=UTF-8", "-Dstdout.encoding=UTF-8", "-cp", h2 + System.getProperty("path.separator") + self, "InjectionBasicProbe"));
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
        for (String how : new String[] { "bind", "concat" })
            for (String input : new String[] { "kim", "or", "oneil" }) {
                String src = wrap(body(how, input));
                Path dir = Path.of(base, how + "-" + input);
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
                out.add(how + "|" + input + " => " + line);
            }
        out.add("FACT " + runChild(h2, self, List.of("fact")));
        Files.write(Path.of(outFile), out, StandardCharsets.UTF_8);
        out.forEach(System.out::println);
    }

    // ---------- 자식: 한 조합을 실행 ----------
    static void prepare(Connection setup) throws SQLException {
        try (Statement s = setup.createStatement()) {
            s.execute("CREATE TABLE member (id INT PRIMARY KEY, name VARCHAR(20))");
            s.execute("INSERT INTO member VALUES (1, 'kim'), (2, 'lee'), (3, 'O''Neil')");
            s.execute("SET QUERY_STATISTICS TRUE");
        }
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
        try (URLClassLoader cl = new URLClassLoader(new URL[] { dir.toUri().toURL() }, InjectionBasicProbe.class.getClassLoader())) {
            System.setOut(new PrintStream(buf, true, StandardCharsets.UTF_8));
            try { cl.loadClass("Main").getMethod("main", String[].class).invoke(null, (Object) new String[0]); }
            catch (java.lang.reflect.InvocationTargetException e) { thrown = e.getCause(); }
            finally { System.setOut(real); }
        }
        String printed = buf.toString(StandardCharsets.UTF_8).strip().replace("\r\n", "\n").replace("\n", " / ");
        // 조합이 보낸 SQL 글: bind는 sql 변수의 글, concat은 이어 붙여 완성된 글 (Main이 만든 글을 소스에서 다시 계산하지 않고, 같은 규칙으로 여기서 만든다)
        String how = dir.getFileName().toString().split("-")[0], input = dir.getFileName().toString().split("-")[1];
        String sql = how.equals("bind") ? "SELECT name FROM member WHERE name = ?" : "SELECT name FROM member WHERE name = '" + inp(input) + "'";
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
            .append("|statCount=").append(st.stream().filter(x -> x.startsWith("SELECT name FROM")).count());
        real.println("RESULT " + f);
    }

    // ---------- 사실 확인 ----------
    static int selectRows(Connection setup) throws SQLException {
        return (int) stats(setup).stream().filter(x -> x.startsWith("SELECT name FROM")).count();
    }

    // QUERY_STATISTICS는 한 번 읽은 뒤에는 다시 읽어도 새 기록이 보이지 않았다(jdbc_basic 실습에서 본 것).
    // 그래서 "그 시점의 기록"은 DB를 따로 만들어 시점마다 한 번만 읽는다.
    static void fact() throws Exception {
        StringBuilder f = new StringBuilder();
        // A: prepareStatement와 setString까지만 한 시점의 기록 (실행 전)
        try (Connection setup = DriverManager.getConnection("jdbc:h2:mem:factA")) {
            prepare(setup);
            Connection c = DriverManager.getConnection("jdbc:h2:mem:factA");
            PreparedStatement ps = c.prepareStatement("SELECT name FROM member WHERE name = ?");
            ps.setString(1, "kim");
            f.append("selectBeforeExecute=").append(selectRows(setup));
            f.append("|paramCount=").append(ps.getParameterMetaData().getParameterCount());
            c.close();
        }
        // B: createStatement까지만 한 시점의 기록
        try (Connection setup = DriverManager.getConnection("jdbc:h2:mem:factB")) {
            prepare(setup);
            Connection c = DriverManager.getConnection("jdbc:h2:mem:factB");
            Statement st = c.createStatement();
            f.append("|selectAfterCreateStatement=").append(selectRows(setup));
            c.close();
        }
        // C: ? 자리에 넘긴 값이 어떤 모양으로 들어 있는지 (입력마다)
        try (Connection setup = DriverManager.getConnection("jdbc:h2:mem:factC")) {
            prepare(setup);
            Connection c = DriverManager.getConnection("jdbc:h2:mem:factC");
            for (String input : new String[] { "kim", "or", "oneil" }) {
                PreparedStatement ps = c.prepareStatement("SELECT name FROM member WHERE name = ?");
                ps.setString(1, inp(input));
                f.append("|ps_").append(input).append("=").append(clean(ps.toString()));
            }
            // 같은 입력을 이어 붙인 SQL의 파라미터 개수 (O'Neil 말고 kim으로: 만들어지는 SQL이 유효해야 센다)
            PreparedStatement pc = c.prepareStatement("SELECT name FROM member WHERE name = '" + "kim" + "'");
            f.append("|concatParamCount=").append(pc.getParameterMetaData().getParameterCount());
            f.append("|product=").append(setup.getMetaData().getDatabaseProductName()).append(' ').append(setup.getMetaData().getDatabaseProductVersion());
            c.close();
        }
        System.out.println("RESULT " + f);
    }
}

import java.io.File;
import java.io.StringWriter;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;
import javax.tools.JavaCompiler;
import javax.tools.ToolProvider;

// 기초개념 "엔티티" 실습을 실제 Hibernate 7 + H2(메모리 DB)에서 확인한다. 스프링은 쓰지 않고 Hibernate를 직접 부트스트랩한다.
// 조합마다 화면에 보이는 것과 같은 모양의 Member 소스(package와 import 줄만 더함)와 app.Main을 임시 폴더에 만들어 컴파일하고,
// 자바 프로세스를 새로 띄워 Hibernate를 시작한다. @Entity가 없는 조합에서도 같은 방식(addAnnotatedClass)으로 등록을 시도한다.
//   ent   : Member 위에 @Entity가 있는가
//   idf   : id 필드 위에 @Id가 있는가
//   extra : email 필드를 하나 더 적는가
// 자식(app.Main)이 적는 것: 시작(buildSessionFactory)의 성공 여부와 예외, Hibernate가 아는 엔티티, 시작 직후와 실행 뒤 H2에 있는 테이블과 열
// (INFORMATION_SCHEMA.COLUMNS), 화면의 저장 코드를 실행하면서 어느 줄에서 예외가 났는지, StatementInspector로 잡은 SQL 전체와 INSERT 수
// (persist 직후, commit 직후), 실행 뒤의 행 수와 내용.
public class EntityBasicProbe {
    // 화면의 코드와 같은 Member 소스(package와 import 줄은 화면에서 줄인다)
    static String source(boolean ent, boolean idf, boolean extra) {
        StringBuilder s = new StringBuilder();
        s.append("package app;\n\nimport jakarta.persistence.Entity;\nimport jakarta.persistence.Id;\n\n");
        if (ent) s.append("// 표시: 이 클래스의 객체는 테이블의 한 행으로 저장된다\n@Entity\n");
        s.append("public class Member {\n");
        if (idf) s.append("    // 표시: 이 필드가 기본 키다\n    @Id\n");
        s.append("    private Long id;\n    private String name;\n");
        if (extra) s.append("    private String email;\n");
        s.append("\n    protected Member() { }\n\n    public Member(Long id, String name) {\n        this.id = id;\n        this.name = name;\n    }\n}\n");
        return s.toString();
    }

    // 자식이 실행하는 Main. SAVE-BEGIN과 SAVE-END 사이의 줄(Lab.으로 시작하는 측정 줄은 빼고)이 화면의 "저장하는 쪽"이다.
    static final String MAIN = """
            package app;

            import jakarta.persistence.EntityManager;
            import java.sql.Connection;
            import java.sql.DriverManager;
            import java.sql.ResultSet;
            import java.sql.ResultSetMetaData;
            import java.sql.Statement;
            import java.util.ArrayList;
            import java.util.LinkedHashMap;
            import java.util.List;
            import java.util.Map;
            import org.hibernate.SessionFactory;
            import org.hibernate.cfg.Configuration;
            import org.hibernate.resource.jdbc.spi.StatementInspector;

            public class Main {
                static final List<String> SQL = new ArrayList<>();
                public static class Capture implements StatementInspector {
                    @Override public String inspect(String sql) { SQL.add(sql); return sql; }
                }
                static int inserts() { int n = 0; for (String s : SQL) if (s.trim().toLowerCase().startsWith("insert")) n++; return n; }
                static String clean(String s) { return s == null ? "" : s.replace('|', (char) 166).replace((char) 13, ' ').replace((char) 10, ' '); }
                static String first(String s) { if (s == null) return ""; int i = s.indexOf((char) 10); return clean(i < 0 ? s : s.substring(0, i)); }
                static String desc(Throwable t) {
                    Throwable r = t;
                    while (r.getCause() != null && r.getCause() != r) r = r.getCause();
                    return t.getClass().getName() + ": " + first(t.getMessage()) + (r == t ? "" : " <= " + r.getClass().getName() + ": " + first(r.getMessage()));
                }
                static final String URL = "jdbc:h2:mem:entity_basic;DB_CLOSE_DELAY=-1";
                // H2에 있는 테이블과 열: MEMBER(ID,NAME)
                static String tables() throws Exception {
                    Map<String, List<String>> m = new LinkedHashMap<>();
                    try (Connection c = DriverManager.getConnection(URL); Statement s = c.createStatement();
                         ResultSet rs = s.executeQuery("select table_name, column_name from information_schema.columns where table_schema = 'PUBLIC' order by table_name, ordinal_position")) {
                        while (rs.next()) m.computeIfAbsent(rs.getString(1), k -> new ArrayList<>()).add(rs.getString(2));
                    }
                    List<String> out = new ArrayList<>();
                    for (Map.Entry<String, List<String>> e : m.entrySet()) out.add(e.getKey() + "(" + String.join(",", e.getValue()) + ")");
                    return out.isEmpty() ? "-" : String.join(";", out);
                }
                // 각 테이블의 행 수와 내용
                static String rows() throws Exception {
                    List<String> out = new ArrayList<>();
                    try (Connection c = DriverManager.getConnection(URL); Statement s = c.createStatement()) {
                        List<String> names = new ArrayList<>();
                        try (ResultSet rs = s.executeQuery("select distinct table_name from information_schema.columns where table_schema = 'PUBLIC' order by table_name")) { while (rs.next()) names.add(rs.getString(1)); }
                        for (String n : names) {
                            int cnt;
                            try (ResultSet rs = s.executeQuery("select count(*) from \\"" + n + "\\"")) { rs.next(); cnt = rs.getInt(1); }
                            List<String> data = new ArrayList<>();
                            try (ResultSet rs = s.executeQuery("select * from \\"" + n + "\\"")) {
                                ResultSetMetaData md = rs.getMetaData();
                                while (rs.next()) { List<String> cells = new ArrayList<>(); for (int i = 1; i <= md.getColumnCount(); i++) cells.add(md.getColumnName(i) + "=" + rs.getObject(i)); data.add(String.join(",", cells)); }
                            }
                            out.add(n + "=" + cnt + "{" + String.join("/", data) + "}");
                        }
                    }
                    return out.isEmpty() ? "-" : String.join(";", out);
                }

                public static void main(String[] a) throws Exception {
                    SessionFactory sf = null;
                    String buildEx = "-", known = "-";
                    try {
                        Configuration cfg = new Configuration().addAnnotatedClass(Class.forName("app.Member"));
                        cfg.setProperty("hibernate.connection.url", URL);
                        cfg.setProperty("hibernate.hbm2ddl.auto", "create-drop");
                        cfg.setProperty("hibernate.session_factory.statement_inspector", Capture.class.getName());
                        sf = cfg.buildSessionFactory();
                    } catch (Throwable t) { buildEx = desc(t); }
                    if (sf != null) {
                        List<String> names = new ArrayList<>();
                        sf.getMetamodel().getEntities().forEach(e -> names.add(e.getName()));
                        known = names.isEmpty() ? "none" : String.join(",", names);
                    }
                    String tablesBuild = tables();
                    int sqlAtStart = SQL.size();
                    String persistEx = "-";
                    if (sf != null) {
                        EntityManager em = sf.createEntityManager();
                        try {
                            // SAVE-BEGIN
                            em.getTransaction().begin();
                            Lab.stage("persist");
                            em.persist(new Member(1L, "김철수"));
                            Lab.stage("commit");
                            em.getTransaction().commit();
                            Lab.stage("done");
                            // SAVE-END
                        } catch (Throwable t) {
                            persistEx = Lab.stage + ": " + desc(t);
                            if (em.getTransaction().isActive()) em.getTransaction().rollback();
                        }
                        em.close();
                    }
                    String tablesEnd = tables(), rows = rows();
                    List<String> dml = new ArrayList<>();
                    for (int i = sqlAtStart; i < SQL.size(); i++) dml.add(clean(SQL.get(i)));
                    List<String> ddl = new ArrayList<>();
                    for (int i = 0; i < sqlAtStart; i++) ddl.add(clean(SQL.get(i)));
                    System.out.println("RESULT build=" + (sf != null ? "OK" : "ERR") + "|buildEx=" + buildEx + "|known=" + known
                            + "|tablesBuild=" + tablesBuild + "|persistEx=" + persistEx + "|tablesEnd=" + tablesEnd
                            + "|insAtPersist=" + Lab.insAtPersist + "|insAtCommit=" + Lab.insAtCommit + "|insTotal=" + inserts()
                            + "|rows=" + rows + "|dml=" + (dml.isEmpty() ? "-" : String.join(" ;; ", dml)) + "|ddl=" + (ddl.isEmpty() ? "-" : String.join(" ;; ", ddl)));
                    if (sf != null) sf.close();
                }
            }

            class Lab {
                static String stage = "begin";
                static int insAtPersist = -1, insAtCommit = -1;
                static void stage(String s) {
                    if (s.equals("commit")) insAtPersist = Main.inserts();
                    if (s.equals("done")) insAtCommit = Main.inserts();
                    stage = s;
                }
            }
            """;

    // Main 소스에서 화면의 "저장하는 쪽" 줄만 꺼낸다(들여쓰기를 걷어 내고, 측정 줄은 뺀다)
    static String saveLines(String main) {
        List<String> out = new ArrayList<>();
        boolean in = false;
        for (String ln : main.split("\n")) {
            String t = ln.strip();
            if (t.equals("// SAVE-END")) break;
            if (in && !t.startsWith("Lab.")) out.add(t);
            if (t.equals("// SAVE-BEGIN")) in = true;
        }
        return String.join("\n", out);
    }

    static String clean(String s) { return s.replace("|", "¦").replace("\r", "").replace("\n", "\\n"); }

    public static void main(String[] args) throws Exception {
        Path root = Files.createTempDirectory("lab-entity-basic");
        JavaCompiler javac = ToolProvider.getSystemJavaCompiler();
        String java = Path.of(System.getProperty("java.home"), "bin", "java").toString(), cp = System.getProperty("java.class.path");
        List<String> out = new ArrayList<>();
        out.add("# hibernate " + org.hibernate.Version.getVersionString() + " | h2 " + org.h2.engine.Constants.VERSION + " | java " + System.getProperty("java.version"));
        int no = 0;
        for (boolean ent : new boolean[] { false, true })
            for (boolean idf : new boolean[] { false, true })
                for (boolean extra : new boolean[] { false, true }) {
                    Path dir = root.resolve("c" + (no++)), src = dir.resolve("src/app"), classes = dir.resolve("classes");
                    Files.createDirectories(src); Files.createDirectories(classes);
                    String member = source(ent, idf, extra);
                    Files.writeString(src.resolve("Member.java"), member, StandardCharsets.UTF_8);
                    Files.writeString(src.resolve("Main.java"), MAIN, StandardCharsets.UTF_8);
                    StringWriter cw = new StringWriter();
                    int rc = javac.run(null, null, new java.io.PrintStream(new java.io.OutputStream() { public void write(int b) { cw.write(b); } }),
                            "-encoding", "UTF-8", "-proc:none", "-cp", cp, "-d", classes.toString(), src.resolve("Member.java").toString(), src.resolve("Main.java").toString());
                    String key = ent + "|" + idf + "|" + extra;
                    if (rc != 0) { out.add(key + " => COMPILE_ERROR " + cw.toString().replace('\n', ' ')); continue; }
                    // 화면의 코드: Member 소스(package와 import 줄 제외) + 저장하는 쪽
                    String shownMember = member.substring(member.indexOf("\n\n", member.indexOf("import jakarta.persistence.Id;")) + 2);
                    List<String> cmd = new ArrayList<>(List.of(java, "-Dfile.encoding=UTF-8", "-Dstdout.encoding=UTF-8", "-cp", cp + File.pathSeparator + classes, "app.Main"));
                    Process p = new ProcessBuilder(cmd).redirectErrorStream(true).start();
                    String all = new String(p.getInputStream().readAllBytes(), StandardCharsets.UTF_8); p.waitFor();
                    String res = all.lines().filter(l -> l.startsWith("RESULT ")).findFirst().orElse("RESULT ?|" + (all.length() > 800 ? all.substring(0, 800) : all).replace('\n', ' ').replace('\r', ' '));
                    out.add(key + " => src=" + clean(shownMember) + "|save=" + clean(saveLines(MAIN)) + "|" + res.substring(7));
                }
        Files.write(Path.of(args[0]), out, StandardCharsets.UTF_8);
        out.forEach(System.out::println);
    }
}

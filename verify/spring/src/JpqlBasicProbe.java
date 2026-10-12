import jakarta.persistence.EntityManager;
import java.io.ByteArrayOutputStream;
import java.io.PrintStream;
import java.net.URL;
import java.net.URLClassLoader;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.Statement;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.function.Consumer;
import javax.tools.JavaCompiler;
import javax.tools.ToolProvider;
import org.hibernate.SessionFactory;
import org.hibernate.cfg.Configuration;
import org.hibernate.resource.jdbc.spi.StatementInspector;

// 기초개념 "JPQL" 실습을 실제 Hibernate 7.4.5 + H2 메모리 DB(스프링 없이 직접 부트스트랩)에서 확인한다.
// 조합마다 화면에 보이는 코드(엔티티 Member + 조회하는 쪽 줄)를 글자 그대로 컴파일해 실행한다.
// 엔티티는 Member.java로(import 줄만 더함), 조회하는 쪽 줄은 JpqlRun.accept(EntityManager em)의 본문으로 들어간다.
//   q : ok(select m from Member m where m.age >= 20) / table(… from member_tbl m …) / col(… where m.user_name = 'kim') / field(… where m.name = 'kim')
// DB에는 미리 member_tbl에 (1, kim, 25), (2, lee, 17), (3, park, 30)을 JDBC로 넣는다(이 준비의 SQL은 세지 않는다).
// 적는 것: 실행한 코드, 오류(종류와 메시지 첫 줄, 원인 사슬, 어느 줄에서 났는가), StatementInspector로 잡은 SQL(원문, 나간 줄),
//         돌아온 리스트(크기, 원소 클래스, 원소의 id/name/age), 측정 실행에서 줄마다 직후 나간 SQL 수와 em.contains.
public class JpqlBasicProbe {
    // [나간 줄, SQL 원문]
    static final List<String[]> SQL = new ArrayList<>();
    static final List<String> OBS = new ArrayList<>();
    static boolean counting;
    static String[] codeLines;
    static int offset;

    public static class Capture implements StatementInspector {
        @Override public String inspect(String sql) {
            if (counting) {
                String at = "-";
                if (codeLines != null)
                    for (StackTraceElement e : new Throwable().getStackTrace())
                        if (e.getClassName().equals("JpqlRun")) {
                            int i = e.getLineNumber() - offset - 1;
                            at = i >= 0 && i < codeLines.length ? codeLines[i].strip() : "line " + e.getLineNumber();
                            break;
                        }
                SQL.add(new String[] { at, sql });
            }
            return sql;
        }
    }

    // 측정 실행에서 줄 하나 실행 직후의 사실
    public static void obs(String stmt, EntityManager em, Object list) {
        StringBuilder b = new StringBuilder(stmt + " :: sql=" + SQL.size());
        if (list instanceof List<?> l) {
            b.append(" size=").append(l.size());
            List<String> cls = new ArrayList<>(), contained = new ArrayList<>();
            for (Object o : l) { cls.add(o.getClass().getName()); contained.add(String.valueOf(em.contains(o))); }
            List<String> vals = new ArrayList<>();
            for (Object o : l) vals.add(describe(o));
            b.append(" classes=").append(String.join(",", cls)).append(" contains=").append(String.join(",", contained)).append(" values=").append(String.join(",", vals));
        }
        OBS.add(b.toString());
    }

    static String describe(Object o) {
        try {
            var c = o.getClass();
            var id = c.getDeclaredField("id"); var name = c.getDeclaredField("name"); var age = c.getDeclaredField("age");
            id.setAccessible(true); name.setAccessible(true); age.setAccessible(true);
            return id.get(o) + ":" + name.get(o) + ":" + age.get(o);
        } catch (Exception e) { return "?" + e; }
    }

    static final String ENTITY_HEAD = "import jakarta.persistence.Column;\nimport jakarta.persistence.Entity;\nimport jakarta.persistence.Id;\nimport jakarta.persistence.Table;\n\n";
    static final String ENTITY = """
            @Entity
            // 테이블: Member 클래스 하나가 member_tbl 테이블 하나와 짝이 된다
            @Table(name = "member_tbl")
            public class Member {
                @Id
                private Long id;

                // 열: name 필드는 user_name 열과 짝이 된다
                @Column(name = "user_name")
                private String name;

                private int age;
            }""";
    static final String RUN_HEAD = "import jakarta.persistence.EntityManager;\nimport jakarta.persistence.TypedQuery;\nimport java.util.List;\n\npublic class JpqlRun implements java.util.function.Consumer<EntityManager> {\n    public void accept(EntityManager em) {\n";
    static final String RUN_TAIL = "    }\n}\n";

    static String jpql(String q) {
        return switch (q) {
            case "ok" -> "select m from Member m where m.age >= 20";
            case "table" -> "select m from member_tbl m where m.age >= 20";
            case "col" -> "select m from Member m where m.user_name = 'kim'";
            default -> "select m from Member m where m.name = 'kim'";
        };
    }

    // 조회하는 쪽 줄(화면의 코드와 같은 글)
    static List<String> lines(String q) {
        return List.of(
                "// JPQL: JPA가 읽는 쿼리 글",
                "String jpql = \"" + jpql(q) + "\";",
                "TypedQuery<Member> query = em.createQuery(jpql, Member.class);",
                "List<Member> list = query.getResultList();");
    }

    static String screen(String q) { return ENTITY + "\n\n// 조회하는 쪽\n" + String.join("\n", lines(q)); }

    static String runSource(List<String> ls, boolean measure) {
        StringBuilder b = new StringBuilder(RUN_HEAD);
        boolean hasList = false;
        for (String s : ls) {
            b.append("        ").append(s).append("\n");
            if (s.startsWith("List<Member> list")) hasList = true;
            if (measure && !s.startsWith("//"))
                b.append("        JpqlBasicProbe.obs(\"").append(s.replace("\\", "\\\\").replace("\"", "\\\"")).append("\", em, ").append(hasList ? "list" : "null").append("); // PROBE\n");
        }
        return b.append(RUN_TAIL).toString();
    }

    static String clean(String s) { return s == null ? "" : s.replace('|', '¦').replace("\r", "").replace("\n", "\\n"); }
    static String firstLine(String s) { if (s == null) return ""; int i = s.indexOf('\n'); return clean(i < 0 ? s : s.substring(0, i)); }
    static String chain(Throwable t) {
        List<String> l = new ArrayList<>();
        for (Throwable x = t; x != null && l.size() < 6; x = x.getCause() == x ? null : x.getCause()) l.add(x.getClass().getName() + ": " + firstLine(x.getMessage()));
        return String.join(" <= ", l);
    }

    @SuppressWarnings("unchecked")
    static String run(String id, String q, boolean measure, Path dir) throws Exception {
        Path src = dir.resolve("src"), classes = dir.resolve("classes");
        Files.createDirectories(src); Files.createDirectories(classes);
        List<String> ls = lines(q);
        String runSrc = runSource(ls, measure);
        Files.writeString(src.resolve("Member.java"), ENTITY_HEAD + ENTITY + "\n", StandardCharsets.UTF_8);
        Files.writeString(src.resolve("JpqlRun.java"), runSrc, StandardCharsets.UTF_8);
        JavaCompiler javac = ToolProvider.getSystemJavaCompiler();
        ByteArrayOutputStream cerr = new ByteArrayOutputStream();
        int rc = javac.run(null, null, new PrintStream(cerr, true, StandardCharsets.UTF_8), "-encoding", "UTF-8", "-proc:none", "-cp", System.getProperty("java.class.path"),
                "-d", classes.toString(), src.resolve("Member.java").toString(), src.resolve("JpqlRun.java").toString());
        if (rc != 0) return "COMPILE_ERROR=" + clean(cerr.toString(StandardCharsets.UTF_8));
        offset = (int) RUN_HEAD.chars().filter(ch -> ch == '\n').count();
        codeLines = measure ? null : ls.toArray(new String[0]);
        String url = "jdbc:h2:mem:jpql_basic_" + id + ";DB_CLOSE_DELAY=-1";
        ClassLoader old = Thread.currentThread().getContextClassLoader();
        StringBuilder f = new StringBuilder();
        try (URLClassLoader cl = new URLClassLoader(new URL[] { classes.toUri().toURL() }, JpqlBasicProbe.class.getClassLoader())) {
            Thread.currentThread().setContextClassLoader(cl);
            Configuration cfg = new Configuration().addAnnotatedClass(cl.loadClass("Member"));
            cfg.setProperty("hibernate.connection.url", url);
            cfg.setProperty("hibernate.hbm2ddl.auto", "create-drop");
            cfg.setProperty("hibernate.session_factory.statement_inspector", Capture.class.getName());
            try (SessionFactory sf = cfg.buildSessionFactory()) {
                try (Connection c = DriverManager.getConnection(url); Statement st = c.createStatement()) {
                    st.executeUpdate("INSERT INTO member_tbl (id, user_name, age) VALUES (1, 'kim', 25)");
                    st.executeUpdate("INSERT INTO member_tbl (id, user_name, age) VALUES (2, 'lee', 17)");
                    st.executeUpdate("INSERT INTO member_tbl (id, user_name, age) VALUES (3, 'park', 30)");
                }
                Consumer<EntityManager> code = (Consumer<EntityManager>) cl.loadClass("JpqlRun").getDeclaredConstructor().newInstance();
                String err = "", errAt = "-";
                SQL.clear(); OBS.clear();
                        try (EntityManager em = sf.createEntityManager()) {
                    counting = true;
                    try { code.accept(em); }
                    catch (Throwable t) {
                        err = chain(t);
                        for (StackTraceElement e : t.getStackTrace())
                            if (e.getClassName().equals("JpqlRun")) {
                                int i = e.getLineNumber() - offset - 1;
                                errAt = i >= 0 && i < ls.size() ? ls.get(i).strip() : "line " + e.getLineNumber();
                                break;
                            }
                    } finally { counting = false; }
                }
                f.append("err=").append(clean(err)).append("|errAt=").append(clean(errAt));
                List<String> sq = new ArrayList<>();
                for (String[] s : SQL) sq.add(clean(s[0]) + " :: " + clean(s[1]));
                f.append("|sqlCount=").append(SQL.size()).append("|sqls=").append(String.join(" ## ", sq));
                f.append("|obs=").append(clean(String.join(" ## ", OBS)));
            }
        } finally { Thread.currentThread().setContextClassLoader(old); counting = false; }
        return f.toString();
    }

    public static void main(String[] args) throws Exception {
        Path root = Files.createTempDirectory("lab-jpql-basic");
        List<String> out = new ArrayList<>();
        out.add("# hibernate " + org.hibernate.Version.getVersionString() + " | h2 " + org.h2.engine.Constants.VERSION + " | java " + System.getProperty("java.version"));
        int no = 0;
        for (String q : new String[] { "ok", "table", "col", "field" }) {
            String shown = run("c" + no, q, false, root.resolve("c" + no + "a")); no++;
            String meas = run("c" + no, q, true, root.resolve("c" + no + "b")); no++;
            out.add(q + " => code=" + clean(screen(q)) + "|" + shown);
            out.add("measure|" + q + " => " + meas);
        }
        Files.write(Path.of(args[0]), out, StandardCharsets.UTF_8);
        for (String l : out) System.out.println(l.length() > 900 ? l.substring(0, 900) + " ..." : l);
    }
}

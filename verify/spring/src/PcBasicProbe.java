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
import java.sql.ResultSet;
import java.sql.Statement;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Locale;
import java.util.function.Consumer;
import javax.tools.JavaCompiler;
import javax.tools.ToolProvider;
import org.hibernate.SessionFactory;
import org.hibernate.cfg.Configuration;
import org.hibernate.resource.jdbc.spi.StatementInspector;

// 기초개념 "영속성 컨텍스트" 실습을 실제 Hibernate 7.4.5 + H2 메모리 DB(스프링 없이 직접 부트스트랩)에서 확인한다.
// 조합마다 DB와 SessionFactory를 새로 만들고, 화면에 보이는 코드(처음 설정의 다섯 줄 남짓)를 글자 그대로 PcRun.accept(EntityManager em)의 본문에 넣어
// 컴파일해 실행한다. 엔티티 Member(id, name, setName)와 EntityManager를 얻는 코드는 화면에 없고 Probe가 준비한다.
//   how   : find(em.find로 가져온다) / new(new Member(1L, "김철수")로 만든다) / detach(find 뒤 em.detach(m))
//   again : 같은 id로 한 번 더 find하고 m == m2를 출력하는가
// DB에는 미리 (1, 김철수)가 들어 있다(JDBC로 넣음. 이 준비 단계의 SQL은 세지 않는다).
// 적는 것: 실행한 코드, 커밋 뒤 다른 연결(순수 JDBC)로 조회한 name, StatementInspector로 센 UPDATE/SELECT/INSERT 수와 SQL 원문 및 나간 줄,
//         화면에 찍힌 값(m == m2), 그리고 단계 문장이 기대는 사실(각 줄 실행 직후 em.contains(m), m과 m2의 name, 그때까지 나간 SELECT/UPDATE 수,
//         Hibernate가 기억하는 처음 값). 사실을 재는 줄(PROBE)은 코드를 따로 만든 두 번째 실행에서만 끼워 넣는다(첫 실행은 화면의 코드 그대로).
public class PcBasicProbe {
    // [종류, 나간 줄, SQL 원문]
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
                        if (e.getClassName().equals("PcRun")) {
                            int i = e.getLineNumber() - offset - 1;
                            at = i >= 0 && i < codeLines.length ? codeLines[i].strip() : "line " + e.getLineNumber();
                            break;
                        }
                String t = sql.strip().toLowerCase(Locale.ROOT);
                String kind = t.startsWith("select") ? "select" : t.startsWith("update") ? "update" : t.startsWith("insert") ? "insert" : t.startsWith("delete") ? "delete" : "other";
                SQL.add(new String[] { kind, at, sql });
            }
            return sql;
        }
    }

    static long count(String kind) { return SQL.stream().filter(s -> s[0].equals(kind)).count(); }

    // 두 번째(측정) 실행에서만 불리는 줄. 줄 하나 실행 직후의 사실을 적는다.
    public static void obs(String stmt, EntityManager em, Object m, Object m2) {
        OBS.add(stmt + " :: contains(m)=" + contains(em, m) + " contains(m2)=" + contains(em, m2) + " name(m)=" + name(m) + " name(m2)=" + name(m2)
                + " loaded(m)=" + loaded(em, m) + " select=" + count("select") + " update=" + count("update") + " insert=" + count("insert"));
    }
    static String contains(EntityManager em, Object o) { return o == null ? "-" : String.valueOf(em.contains(o)); }
    static String name(Object o) {
        if (o == null) return "-";
        try { return String.valueOf(o.getClass().getMethod("getName").invoke(o)); } catch (Exception e) { return "?" + e; }
    }
    // Hibernate가 영속성 컨텍스트에 기억해 둔, 읽어 올 때의 값
    static String loaded(EntityManager em, Object o) {
        if (o == null) return "-";
        try {
            var si = em.unwrap(org.hibernate.engine.spi.SessionImplementor.class);
            var ee = si.getPersistenceContextInternal().getEntry(o);
            return ee == null ? "(기억 없음)" : Arrays.toString(ee.getLoadedState());
        } catch (Throwable t) { return "?" + t; }
    }

    static final String ENTITY = """
            import jakarta.persistence.Entity;
            import jakarta.persistence.Id;

            @Entity(name = "Member")
            public class Member {
                @Id Long id;
                String name;
                protected Member() { }
                public Member(Long id, String name) { this.id = id; this.name = name; }
                public void setName(String name) { this.name = name; }
                public String getName() { return name; }
            }
            """;
    static final String HEAD = "import jakarta.persistence.EntityManager;\n\npublic class PcRun implements java.util.function.Consumer<EntityManager> {\n    public void accept(EntityManager em) {\n";
    static final String TAIL = "    }\n}\n";

    // 코드 한 줄. declM/declM2: 이 줄이 변수 m/m2를 선언한다. comment: 주석 줄(측정 줄을 끼우지 않는다)
    record Stmt(String text, boolean declM, boolean declM2, boolean comment) {
        static Stmt s(String t) { return new Stmt(t, false, false, false); }
        static Stmt m(String t) { return new Stmt(t, true, false, false); }
        static Stmt m2(String t) { return new Stmt(t, false, true, false); }
        static Stmt c(String t) { return new Stmt(t, false, false, true); }
    }

    // 화면의 코드와 같은 글
    static List<Stmt> screen(String how, boolean again) {
        List<Stmt> l = new ArrayList<>();
        l.add(Stmt.s("em.getTransaction().begin();"));
        if (how.equals("new")) {
            l.add(Stmt.m("Member m = new Member(1L, \"김철수\");"));
        } else {
            l.add(Stmt.c("// find: DB에서 읽어 온 엔티티가 영속성 컨텍스트에 들어간다"));
            l.add(Stmt.m("Member m = em.find(Member.class, 1L);"));
            if (how.equals("detach")) l.add(Stmt.s("em.detach(m);"));
        }
        l.add(Stmt.s("m.setName(\"이영희\");"));
        if (again) {
            l.add(Stmt.m2("Member m2 = em.find(Member.class, 1L);"));
            l.add(Stmt.s("System.out.println(m == m2);"));
        }
        l.add(Stmt.s("em.getTransaction().commit();"));
        return l;
    }

    static String codeText(List<Stmt> l) {
        List<String> t = new ArrayList<>();
        for (Stmt s : l) t.add(s.text());
        return String.join("\n", t);
    }

    // measure가 참이면 줄마다 바로 아래에 측정 줄(// PROBE)을 끼운다
    static String runSource(List<Stmt> l, boolean measure) {
        StringBuilder b = new StringBuilder(HEAD);
        boolean hasM = false, hasM2 = false;
        for (Stmt s : l) {
            b.append("        ").append(s.text()).append("\n");
            hasM |= s.declM(); hasM2 |= s.declM2();
            if (measure && !s.comment())
                b.append("        PcBasicProbe.obs(\"").append(s.text().replace("\\", "\\\\").replace("\"", "\\\"")).append("\", em, ")
                        .append(hasM ? "m" : "null").append(", ").append(hasM2 ? "m2" : "null").append("); // PROBE\n");
        }
        return b.append(TAIL).toString();
    }

    static String clean(String s) { return s == null ? "" : s.replace('|', '¦').replace("\r", "").replace("\n", "\\n"); }

    static String one(Connection c, String q) throws Exception {
        try (Statement st = c.createStatement(); ResultSet rs = st.executeQuery(q)) { return rs.next() ? rs.getString(1) : "-"; }
    }

    // 한 번 실행한다. measure=false면 화면의 코드 그대로, true면 측정 줄을 끼운 코드. 결과 필드를 적은 글을 돌려준다.
    @SuppressWarnings("unchecked")
    static String run(String id, List<Stmt> stmts, boolean measure, Path dir) throws Exception {
        Path src = dir.resolve("src"), classes = dir.resolve("classes");
        Files.createDirectories(src); Files.createDirectories(classes);
        String runSrc = runSource(stmts, measure);
        Files.writeString(src.resolve("Member.java"), ENTITY, StandardCharsets.UTF_8);
        Files.writeString(src.resolve("PcRun.java"), runSrc, StandardCharsets.UTF_8);
        JavaCompiler javac = ToolProvider.getSystemJavaCompiler();
        ByteArrayOutputStream cerr = new ByteArrayOutputStream();
        int rc = javac.run(null, null, new PrintStream(cerr, true, StandardCharsets.UTF_8), "-encoding", "UTF-8", "-proc:none", "-cp", System.getProperty("java.class.path"),
                "-d", classes.toString(), src.resolve("Member.java").toString(), src.resolve("PcRun.java").toString());
        if (rc != 0) return "COMPILE_ERROR=" + clean(cerr.toString(StandardCharsets.UTF_8));
        StringBuilder f = new StringBuilder();
        SQL.clear(); OBS.clear();
        // 첫 줄(HEAD의 줄 수) 다음부터가 코드
        offset = (int) HEAD.chars().filter(ch -> ch == '\n').count();
        codeLines = measure ? null : stmts.stream().map(Stmt::text).toArray(String[]::new);
        String url = "jdbc:h2:mem:pc_basic_" + id + ";DB_CLOSE_DELAY=-1";
        ClassLoader old = Thread.currentThread().getContextClassLoader();
        try (URLClassLoader cl = new URLClassLoader(new URL[] { classes.toUri().toURL() }, PcBasicProbe.class.getClassLoader())) {
            Thread.currentThread().setContextClassLoader(cl);
            Configuration cfg = new Configuration().addAnnotatedClass(cl.loadClass("Member"));
            cfg.setProperty("hibernate.connection.url", url);
            cfg.setProperty("hibernate.hbm2ddl.auto", "create-drop");
            cfg.setProperty("hibernate.session_factory.statement_inspector", Capture.class.getName());
            try (SessionFactory sf = cfg.buildSessionFactory()) {
                // 준비 단계: DB에 (1, 김철수)를 미리 넣는다(세지 않는다)
                try (Connection c = DriverManager.getConnection(url); Statement st = c.createStatement()) { st.executeUpdate("INSERT INTO member (id, name) VALUES (1, '김철수')"); }
                Consumer<EntityManager> code = (Consumer<EntityManager>) cl.loadClass("PcRun").getDeclaredConstructor().newInstance();
                PrintStream realOut = System.out;
                ByteArrayOutputStream cap = new ByteArrayOutputStream();
                String err = "";
                SQL.clear(); OBS.clear();
                try (EntityManager em = sf.createEntityManager()) {
                    counting = true;
                    System.setOut(new PrintStream(cap, true, StandardCharsets.UTF_8));
                    try { code.accept(em); } catch (Throwable t) { err = t.getClass().getName() + ": " + t.getMessage(); }
                    finally { System.setOut(realOut); counting = false; }
                    // 커밋 뒤, 다른 연결(순수 JDBC)로 조회한다
                    try (Connection c = DriverManager.getConnection(url)) {
                        f.append("dbName=").append(one(c, "SELECT name FROM member WHERE id = 1"));
                        f.append("|name2=").append(one(c, "SELECT name FROM member WHERE id = 2"));
                        f.append("|rows=").append(one(c, "SELECT COUNT(*) FROM member"));
                    }
                }
                f.append("|select=").append(count("select")).append("|update=").append(count("update")).append("|insert=").append(count("insert"))
                        .append("|other=").append(count("other") + count("delete"));
                f.append("|stdout=").append(clean(cap.toString(StandardCharsets.UTF_8).strip()));
                f.append("|err=").append(clean(err));
                List<String> sq = new ArrayList<>();
                for (String[] s : SQL) sq.add(s[0] + " @ " + clean(s[1]) + " :: " + clean(s[2]));
                f.append("|sqls=").append(String.join(" ## ", sq));
                f.append("|obs=").append(clean(String.join(" ## ", OBS)));
            }
        } finally { Thread.currentThread().setContextClassLoader(old); counting = false; }
        return f.toString();
    }

    public static void main(String[] args) throws Exception {
        Path root = Files.createTempDirectory("lab-pc-basic");
        List<String> out = new ArrayList<>();
        out.add("# hibernate " + org.hibernate.Version.getVersionString() + " | java " + System.getProperty("java.version"));
        int no = 0;
        for (String how : new String[] { "find", "new", "detach" })
            for (boolean again : new boolean[] { false, true }) {
                List<Stmt> stmts = screen(how, again);
                String key = how + "|" + again;
                String shown = run("c" + no, stmts, false, root.resolve("c" + no++ + "a"));
                String meas = run("c" + no, stmts, true, root.resolve("c" + no++ + "b"));
                out.add(key + " => code=" + clean(codeText(stmts)) + "|" + shown);
                out.add("measure|" + key + " => " + meas);
            }
        // 문장의 근거: (1) 이름을 바꿨다가 처음 값으로 되돌리면 UPDATE가 나가지 않는다(처음 값과 비교한다), (2) em.persist로 넘긴 엔티티도 영속성 컨텍스트에 들어간다
        List<Stmt> revert = List.of(Stmt.s("em.getTransaction().begin();"), Stmt.m("Member m = em.find(Member.class, 1L);"), Stmt.s("m.setName(\"이영희\");"),
                Stmt.s("m.setName(\"김철수\");"), Stmt.s("em.getTransaction().commit();"));
        out.add("extra|revert => code=" + clean(codeText(revert)) + "|" + run("x1", revert, false, root.resolve("x1a")));
        out.add("measure|extra|revert => " + run("x2", revert, true, root.resolve("x1b")));
        List<Stmt> persist = List.of(Stmt.s("em.getTransaction().begin();"), Stmt.m("Member m = new Member(2L, \"박민수\");"), Stmt.s("em.persist(m);"), Stmt.s("em.getTransaction().commit();"));
        out.add("extra|persist => code=" + clean(codeText(persist)) + "|" + run("x3", persist, false, root.resolve("x2a")));
        out.add("measure|extra|persist => " + run("x4", persist, true, root.resolve("x2b")));
        Files.write(Path.of(args[0]), out, StandardCharsets.UTF_8);
        for (String l : out) System.out.println(l.length() > 700 ? l.substring(0, 700) + " ..." : l);
    }
}

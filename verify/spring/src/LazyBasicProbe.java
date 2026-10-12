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
import org.hibernate.Hibernate;
import org.hibernate.SessionFactory;
import org.hibernate.cfg.Configuration;
import org.hibernate.proxy.HibernateProxy;
import org.hibernate.resource.jdbc.spi.StatementInspector;

// 기초개념 "지연 로딩" 실습을 실제 Hibernate 7.4.5 + H2 메모리 DB(스프링 없이 직접 부트스트랩)에서 확인한다.
// 조합마다 DB와 SessionFactory를 새로 만들고, 화면에 보이는 엔티티 두 클래스(Member, Order)를 package/import 줄만 더해 컴파일하고,
// 화면에 보이는 "읽는 코드"를 글자 그대로 LazyRun.accept(EntityManager em)의 본문에 넣어 컴파일해 실행한다.
//   fetch : lazy(@ManyToOne(fetch = FetchType.LAZY)) / eager(@ManyToOne(fetch = FetchType.EAGER))
//   use   : 읽는 코드의 끝에 order.getMember().getName() 줄이 있는가
// DB에는 미리 회원 (1, 김철수)와 주문 (10, member_id 1)이 들어 있다(JDBC로 넣음. 이 준비 단계의 SQL은 세지 않는다).
// 저장은 읽는 EntityManager와 다른 연결에서 하므로 읽을 때 영속성 컨텍스트는 비어 있다.
// 적는 것: 실행한 코드, StatementInspector로 잡은 SQL(종류, 나간 줄, 원문), 실행 중 난 예외,
//         그리고 단계 문장이 기대는 사실(줄마다 바로 아래에 측정 줄을 끼운 두 번째 실행에서만 잰다. 첫 실행은 화면의 코드 그대로).
public class LazyBasicProbe {
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
                        if (e.getClassName().equals("LazyRun")) {
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

    static long countFrom(String table) {
        return SQL.stream().filter(s -> s[0].equals("select") && s[2].toLowerCase(Locale.ROOT).matches("(?s).*\\b(from|join)\\s+" + table + "\\b.*")).count();
    }

    // 두 번째(측정) 실행에서만 불리는 줄. 줄 하나 실행 직후의 사실을 적는다.
    public static void obs(String stmt, EntityManager em, Object order, Object mem) {
        String line = stmt + " :: selects=" + SQL.stream().filter(s -> s[0].equals("select")).count() + " fromOrders=" + countFrom("orders") + " fromMember=" + countFrom("member")
                + " containsOrder=" + (order == null ? "-" : String.valueOf(em.contains(order)));
        if (order != null) {
            try {
                Object m = order.getClass().getMethod("getMember").invoke(order);
                line += " " + describe("field", em, m);
            } catch (Exception e) { line += " field?" + e; }
        }
        if (mem != null) line += " " + describe("var", em, mem);
        OBS.add(line);
    }
    static String describe(String who, EntityManager em, Object m) {
        if (m == null) return who + "Class=null";
        String id;
        try { id = String.valueOf(em.getEntityManagerFactory().getPersistenceUnitUtil().getIdentifier(m)); } catch (Throwable t) { id = "?" + t; }
        return who + "Class=" + m.getClass().getName() + " " + who + "Proxy=" + (m instanceof HibernateProxy) + " " + who + "Init=" + Hibernate.isInitialized(m) + " " + who + "Id=" + id;
    }

    static final String HEAD_ENT = "import jakarta.persistence.Entity;\nimport jakarta.persistence.FetchType;\nimport jakarta.persistence.Id;\nimport jakarta.persistence.ManyToOne;\nimport jakarta.persistence.Table;\n\n";

    // 화면의 코드 가운데 Member 클래스
    static final String MEMBER_SHOWN = "@Entity\npublic class Member {\n    @Id\n    private Long id;\n    private String name;\n\n    public String getName() { return name; }\n}\n";

    // 화면의 코드 가운데 Order 클래스
    static String orderShown(String fetch) {
        return "@Entity\n@Table(name = \"orders\")\npublic class Order {\n    @Id\n    private Long id;\n\n"
                + "    // 연결: 이 주문이 가리키는 회원을 언제 읽어 올지 정한다\n"
                + (fetch.equals("default") ? "    @ManyToOne\n" : "    @ManyToOne(fetch = FetchType." + (fetch.equals("lazy") ? "LAZY" : "EAGER") + ")\n")
                + "    private Member member;\n\n    public Member getMember() { return member; }\n}\n";
    }

    // 코드 한 줄. declOrder/declMem: 이 줄이 변수 order/mem을 선언한다. comment: 주석 줄(측정 줄을 끼우지 않는다)
    record Stmt(String text, boolean declOrder, boolean declMem, boolean comment) {
        static Stmt s(String t) { return new Stmt(t, false, false, false); }
        static Stmt o(String t) { return new Stmt(t, true, false, false); }
        static Stmt m(String t) { return new Stmt(t, false, true, false); }
        static Stmt c(String t) { return new Stmt(t, false, false, true); }
    }

    // 화면의 "읽는 코드"와 같은 글
    static List<Stmt> screen(boolean use) {
        List<Stmt> l = new ArrayList<>();
        l.add(Stmt.c("// DB에는 주문 10과, 그 주문을 한 회원 1(김철수)이 들어 있다"));
        l.add(Stmt.o("Order order = em.find(Order.class, 10L);"));
        if (use) {
            l.add(Stmt.c("// 사용: 회원의 값(이름)을 실제로 쓴다"));
            l.add(Stmt.s("String name = order.getMember().getName();"));
        }
        return l;
    }

    // 측정 실행의 코드: getMember()와 getName()을 두 줄로 나누어 각각의 직후를 잴 수 있게 한다
    static List<Stmt> measured(boolean use) {
        List<Stmt> l = new ArrayList<>();
        for (Stmt s : screen(use)) {
            if (s.text().equals("String name = order.getMember().getName();")) {
                l.add(Stmt.m("Member mem = order.getMember();"));
                l.add(Stmt.s("String name = mem.getName();"));
            } else l.add(s);
        }
        return l;
    }

    static String codeText(String fetch, boolean use) {
        List<String> t = new ArrayList<>();
        for (Stmt s : screen(use)) t.add(s.text());
        return MEMBER_SHOWN + "\n" + orderShown(fetch) + "\n" + String.join("\n", t);
    }

    static final String HEAD = "import jakarta.persistence.EntityManager;\n\npublic class LazyRun implements java.util.function.Consumer<EntityManager> {\n    public void accept(EntityManager em) {\n";
    static final String TAIL = "    }\n}\n";

    static String runSource(List<Stmt> l, boolean measure) {
        StringBuilder b = new StringBuilder(HEAD);
        boolean hasOrder = false, hasMem = false;
        for (Stmt s : l) {
            b.append("        ").append(s.text()).append("\n");
            hasOrder |= s.declOrder(); hasMem |= s.declMem();
            if (measure && !s.comment())
                b.append("        LazyBasicProbe.obs(\"").append(s.text().replace("\\", "\\\\").replace("\"", "\\\"")).append("\", em, ")
                        .append(hasOrder ? "order" : "null").append(", ").append(hasMem ? "mem" : "null").append("); // PROBE\n");
        }
        return b.append(TAIL).toString();
    }

    static String clean(String s) { return s == null ? "" : s.replace('|', '¦').replace("\r", "").replace("\n", "\\n"); }

    // 한 번 실행한다. measure=false면 화면의 코드 그대로, true면 측정 줄을 끼운 코드.
    @SuppressWarnings("unchecked")
    static String run(String id, String fetch, boolean use, boolean measure, Path dir) throws Exception {
        Path src = dir.resolve("src"), classes = dir.resolve("classes");
        Files.createDirectories(src); Files.createDirectories(classes);
        List<Stmt> stmts = measure ? measured(use) : screen(use);
        Files.writeString(src.resolve("Member.java"), HEAD_ENT + MEMBER_SHOWN, StandardCharsets.UTF_8);
        Files.writeString(src.resolve("Order.java"), HEAD_ENT + orderShown(fetch), StandardCharsets.UTF_8);
        Files.writeString(src.resolve("LazyRun.java"), runSource(stmts, measure), StandardCharsets.UTF_8);
        JavaCompiler javac = ToolProvider.getSystemJavaCompiler();
        ByteArrayOutputStream cerr = new ByteArrayOutputStream();
        int rc = javac.run(null, null, new PrintStream(cerr, true, StandardCharsets.UTF_8), "-encoding", "UTF-8", "-proc:none", "-cp", System.getProperty("java.class.path"),
                "-d", classes.toString(), src.resolve("Member.java").toString(), src.resolve("Order.java").toString(), src.resolve("LazyRun.java").toString());
        if (rc != 0) return "COMPILE_ERROR=" + clean(cerr.toString(StandardCharsets.UTF_8));
        StringBuilder f = new StringBuilder();
        offset = (int) HEAD.chars().filter(ch -> ch == '\n').count();
        codeLines = measure ? null : stmts.stream().map(Stmt::text).toArray(String[]::new);
        String url = "jdbc:h2:mem:lazy_basic_" + id + ";DB_CLOSE_DELAY=-1";
        ClassLoader old = Thread.currentThread().getContextClassLoader();
        try (URLClassLoader cl = new URLClassLoader(new URL[] { classes.toUri().toURL() }, LazyBasicProbe.class.getClassLoader())) {
            Thread.currentThread().setContextClassLoader(cl);
            Configuration cfg = new Configuration().addAnnotatedClass(cl.loadClass("Member")).addAnnotatedClass(cl.loadClass("Order"));
            cfg.setProperty("hibernate.connection.url", url);
            cfg.setProperty("hibernate.hbm2ddl.auto", "create-drop");
            cfg.setProperty("hibernate.session_factory.statement_inspector", Capture.class.getName());
            try (SessionFactory sf = cfg.buildSessionFactory()) {
                // 준비 단계: DB에 회원 (1, 김철수)와 주문 (10, 회원 1)을 미리 넣는다(세지 않는다)
                try (Connection c = DriverManager.getConnection(url); Statement st = c.createStatement()) {
                    st.executeUpdate("INSERT INTO member (id, name) VALUES (1, '김철수')");
                    st.executeUpdate("INSERT INTO orders (id, member_id) VALUES (10, 1)");
                }
                Consumer<EntityManager> code = (Consumer<EntityManager>) cl.loadClass("LazyRun").getDeclaredConstructor().newInstance();
                String err = "";
                SQL.clear(); OBS.clear();
                try (EntityManager em = sf.createEntityManager()) {
                    counting = true;
                    try { code.accept(em); } catch (Throwable t) { err = t.getClass().getName() + ": " + t.getMessage(); }
                    finally { counting = false; }
                }
                f.append("select=").append(SQL.stream().filter(s -> s[0].equals("select")).count()).append("|other=").append(SQL.stream().filter(s -> !s[0].equals("select")).count());
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
        Path root = Path.of(args[1]);
        List<String> out = new ArrayList<>();
        out.add("# hibernate " + org.hibernate.Version.getVersionString() + " | java " + System.getProperty("java.version"));
        int no = 0;
        for (String fetch : new String[] { "lazy", "eager" })
            for (boolean use : new boolean[] { true, false }) {
                String key = fetch + "|" + use;
                String shown = run("c" + no, fetch, use, false, root.resolve("c" + no++ + "a"));
                String meas = run("c" + no, fetch, use, true, root.resolve("c" + no++ + "b"));
                out.add(key + " => code=" + clean(codeText(fetch, use)) + "|" + shown);
                out.add("measure|" + key + " => " + meas);
            }
        // 문장과 용어 설명의 근거: fetch를 적지 않은 @ManyToOne(화면의 설정이 아니다)은 어느 쪽으로 읽히는가
        out.add("extra|default => code=" + clean(codeText("default", true)) + "|" + run("x1", "default", true, false, root.resolve("x1a")));
        out.add("measure|extra|default => " + run("x2", "default", true, true, root.resolve("x1b")));
        Files.write(Path.of(args[0]), out, StandardCharsets.UTF_8);
        for (String l : out) System.out.println(l.length() > 900 ? l.substring(0, 900) + " ..." : l);
    }
}

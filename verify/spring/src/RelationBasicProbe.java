import java.io.File;
import java.io.StringWriter;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;
import javax.tools.JavaCompiler;
import javax.tools.ToolProvider;

// 기초개념 "연관관계" 실습을 실제 Hibernate 7 + H2(메모리 DB)에서 확인한다. 스프링은 쓰지 않고 Hibernate를 직접 부트스트랩한다.
// 조합마다 화면에 보이는 것과 같은 모양의 Order 소스(생성자와 getter만 더함)와 Member 소스, app.Main을 임시 폴더에 만들어 컴파일하고,
// 자바 프로세스를 새로 띄워 Hibernate를 시작한다.
//   how : ref(@ManyToOne) | named(@ManyToOne + @JoinColumn(name = "buyer_id")) | noanno(@ManyToOne을 지움) | idonly(Long memberId)
// 자식(app.Main)이 적는 것: 시작(buildSessionFactory)의 성공 여부와 예외, 시작 직후와 실행 뒤 H2에 있는 테이블과 열(INFORMATION_SCHEMA.COLUMNS),
// 외래 키 제약(INFORMATION_SCHEMA의 REFERENTIAL_CONSTRAINTS와 KEY_COLUMN_USAGE), 저장하고 읽는 코드를 실행하면서 어느 단계에서 예외가 났는지와
// 화면에 찍힌 글, StatementInspector로 잡은 SQL(저장 단계와 읽기 단계로 나눔), 실행 뒤 orders 테이블의 행.
public class RelationBasicProbe {
    static final String HEAD = "package app;\n\nimport jakarta.persistence.Entity;\nimport jakarta.persistence.Id;\nimport jakarta.persistence.JoinColumn;\nimport jakarta.persistence.ManyToOne;\nimport jakarta.persistence.Table;\n\n";

    // 화면의 코드 가운데 Order 클래스(생성자와 getter는 화면에서 줄인다)
    static String orderShown(String how) {
        StringBuilder s = new StringBuilder();
        s.append("@Entity\n@Table(name = \"orders\")\npublic class Order {\n    @Id\n    private Long id;\n");
        if (how.equals("ref") || how.equals("named")) s.append("    // 연관관계: 이 주문을 한 회원을 객체로 가리킨다\n    @ManyToOne\n");
        if (how.equals("named")) s.append("    @JoinColumn(name = \"buyer_id\")\n");
        s.append(how.equals("idonly") ? "    private Long memberId;\n" : "    private Member member;\n");
        s.append("}\n");
        return s.toString();
    }

    // 컴파일하는 Order 소스: 화면의 소스에 생성자와 getter를 더한다
    static String orderFull(String how) {
        String shown = orderShown(how);
        String hidden = how.equals("idonly")
                ? "\n    protected Order() { }\n\n    public Order(Long id, Long memberId) {\n        this.id = id;\n        this.memberId = memberId;\n    }\n\n    public Long getMemberId() {\n        return memberId;\n    }\n}\n"
                : "\n    protected Order() { }\n\n    public Order(Long id, Member member) {\n        this.id = id;\n        this.member = member;\n    }\n\n    public Member getMember() {\n        return member;\n    }\n}\n";
        return HEAD + shown.substring(0, shown.length() - 2) + hidden;
    }

    static final String MEMBER = HEAD + "@Entity\npublic class Member {\n    @Id\n    private Long id;\n    private String name;\n\n    protected Member() { }\n\n    public Member(Long id, String name) {\n        this.id = id;\n        this.name = name;\n    }\n\n    public String getName() {\n        return name;\n    }\n}\n";

    // 화면의 "쓰는 쪽". Lab.으로 시작하는 줄은 측정하는 줄이고 화면에는 없다.
    static String block(String how) {
        if (how.equals("idonly"))
            return "// 쓰는 쪽: 주문을 저장하고, 다시 읽어서 주문한 회원의 이름을 본다\n"
                 + "Lab.begin(em);\n"
                 + "em.persist(new Order(10L, 1L));\n"
                 + "Lab.commit(em);\n"
                 + "// 저장(commit)을 마친 뒤, 새 EntityManager(em2)로 DB에서 다시 읽는다\n"
                 + "Lab.stage(\"read\");\n"
                 + "Order o = em2.find(Order.class, 10L);\n"
                 + "Member m = em2.find(Member.class, o.getMemberId());\n"
                 + "System.out.println(m.getName());\n";
        return "// 쓰는 쪽: 주문을 저장하고, 다시 읽어서 주문한 회원의 이름을 본다\n"
             + "Lab.begin(em);\n"
             + "Member kim = em.find(Member.class, 1L);\n"
             + "em.persist(new Order(10L, kim));\n"
             + "Lab.commit(em);\n"
             + "// 저장(commit)을 마친 뒤, 새 EntityManager(em2)로 DB에서 다시 읽는다\n"
             + "Lab.stage(\"read\");\n"
             + "Order o = em2.find(Order.class, 10L);\n"
             + "System.out.println(o.getMember().getName());\n";
    }

    static final String MAIN = """
            package app;

            import jakarta.persistence.EntityManager;
            import java.io.ByteArrayOutputStream;
            import java.io.PrintStream;
            import java.nio.charset.StandardCharsets;
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
                static String clean(String s) { return s == null ? "" : s.replace('|', (char) 166).replace((char) 13, ' ').replace((char) 10, ' '); }
                static String first(String s) { if (s == null) return ""; int i = s.indexOf((char) 10); return clean(i < 0 ? s : s.substring(0, i)); }
                static String desc(Throwable t) {
                    Throwable r = t;
                    while (r.getCause() != null && r.getCause() != r) r = r.getCause();
                    return t.getClass().getName() + ": " + first(t.getMessage()) + (r == t ? "" : " <= " + r.getClass().getName() + ": " + first(r.getMessage()));
                }
                static final String URL = "jdbc:h2:mem:relation_basic;DB_CLOSE_DELAY=-1";
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
                // 외래 키 제약: 걸린 테이블.열 -> 가리키는 테이블.열
                static String fks() throws Exception {
                    List<String> out = new ArrayList<>();
                    String q = "select fk.table_name, fk.column_name, pk.table_name, pk.column_name"
                            + " from information_schema.referential_constraints rc"
                            + " join information_schema.key_column_usage fk on fk.constraint_schema = rc.constraint_schema and fk.constraint_name = rc.constraint_name"
                            + " join information_schema.key_column_usage pk on pk.constraint_schema = rc.unique_constraint_schema and pk.constraint_name = rc.unique_constraint_name"
                            + " and pk.ordinal_position = fk.position_in_unique_constraint"
                            + " order by fk.table_name, fk.column_name";
                    try (Connection c = DriverManager.getConnection(URL); Statement s = c.createStatement(); ResultSet rs = s.executeQuery(q)) {
                        while (rs.next()) out.add(rs.getString(1) + "." + rs.getString(2) + "->" + rs.getString(3) + "." + rs.getString(4));
                    }
                    return out.isEmpty() ? "-" : String.join(";", out);
                }
                // orders 테이블의 행 수와 내용 (테이블이 없으면 -)
                static String orderRows() throws Exception {
                    try (Connection c = DriverManager.getConnection(URL); Statement s = c.createStatement()) {
                        boolean has = false;
                        try (ResultSet rs = s.executeQuery("select count(*) from information_schema.tables where table_schema = 'PUBLIC' and table_name = 'ORDERS'")) { rs.next(); has = rs.getInt(1) > 0; }
                        if (!has) return "-";
                        int cnt;
                        try (ResultSet rs = s.executeQuery("select count(*) from orders")) { rs.next(); cnt = rs.getInt(1); }
                        List<String> data = new ArrayList<>();
                        try (ResultSet rs = s.executeQuery("select * from orders")) {
                            ResultSetMetaData md = rs.getMetaData();
                            while (rs.next()) { List<String> cells = new ArrayList<>(); for (int i = 1; i <= md.getColumnCount(); i++) cells.add(md.getColumnName(i) + "=" + rs.getObject(i)); data.add(String.join(",", cells)); }
                        }
                        return cnt + "{" + String.join("/", data) + "}";
                    }
                }
                static String join(List<String> l, int from, int to) {
                    List<String> o = new ArrayList<>();
                    for (int i = from; i < to; i++) o.add(clean(SQL.get(i)));
                    return o.isEmpty() ? "-" : String.join(" ;; ", o);
                }
                static int count(int from, int to, String prefix) {
                    int n = 0;
                    for (int i = from; i < to; i++) if (SQL.get(i).trim().toLowerCase().startsWith(prefix)) n++;
                    return n;
                }

                public static void main(String[] a) throws Exception {
                    SessionFactory sf = null;
                    String buildEx = "-", known = "-", prepEx = "-";
                    try {
                        Configuration cfg = new Configuration().addAnnotatedClass(Member.class).addAnnotatedClass(Order.class);
                        cfg.setProperty("hibernate.connection.url", URL);
                        cfg.setProperty("hibernate.hbm2ddl.auto", "create-drop");
                        cfg.setProperty("hibernate.physical_naming_strategy", "org.hibernate.boot.model.naming.PhysicalNamingStrategySnakeCaseImpl");
                        cfg.setProperty("hibernate.session_factory.statement_inspector", Capture.class.getName());
                        sf = cfg.buildSessionFactory();
                    } catch (Throwable t) { buildEx = desc(t); }
                    if (sf != null) {
                        List<String> names = new ArrayList<>();
                        sf.getMetamodel().getEntities().forEach(e -> names.add(e.getName()));
                        known = names.isEmpty() ? "none" : String.join(",", names);
                    }
                    String tablesBuild = tables(), fkBuild = fks();
                    // 준비: member 테이블에 (1, 김철수)를 미리 넣는다(JDBC로 직접. 화면에는 보이지 않는 단계)
                    if (sf != null) {
                        try (Connection c = DriverManager.getConnection(URL); Statement s = c.createStatement()) {
                            s.executeUpdate("insert into member (id, name) values (1, '김철수')");
                        } catch (Throwable t) { prepEx = desc(t); }
                    }
                    int sqlAtStart = SQL.size();
                    String ex = "-", out = "-";
                    if (sf != null) {
                        EntityManager em = sf.createEntityManager(), em2 = sf.createEntityManager();
                        PrintStream real = System.out;
                        ByteArrayOutputStream bo = new ByteArrayOutputStream();
                        try {
                            System.setOut(new PrintStream(bo, true, StandardCharsets.UTF_8));
                            // SAVE-BEGIN
                            //BLOCK
                            // SAVE-END
                        } catch (Throwable t) {
                            ex = Lab.stage + ": " + desc(t);
                            if (em.getTransaction().isActive()) em.getTransaction().rollback();
                        } finally { System.setOut(real); }
                        out = bo.size() == 0 ? "-" : clean(bo.toString(StandardCharsets.UTF_8).trim());
                        em.close(); em2.close();
                    }
                    int sqlEnd = SQL.size();
                    int rd = Lab.sqlAtRead < 0 ? sqlEnd : Lab.sqlAtRead;
                    System.out.println("RESULT build=" + (sf != null ? "OK" : "ERR") + "|buildEx=" + buildEx + "|known=" + known + "|prepEx=" + prepEx
                            + "|tablesBuild=" + tablesBuild + "|fkBuild=" + fkBuild + "|ex=" + ex + "|out=" + out
                            + "|tablesEnd=" + tables() + "|fk=" + fks() + "|orders=" + orderRows()
                            + "|saveSql=" + join(SQL, sqlAtStart, rd) + "|saveInserts=" + count(sqlAtStart, rd, "insert") + "|saveSelects=" + count(sqlAtStart, rd, "select")
                            + "|readSql=" + join(SQL, rd, sqlEnd) + "|readSelects=" + count(rd, sqlEnd, "select") + "|readSelectsMember=" + countFrom(rd, sqlEnd, "member")
                            + "|ddl=" + join(SQL, 0, sqlAtStart));
                    if (sf != null) sf.close();
                }
                // 읽기 단계의 SELECT 가운데 member 테이블을 읽는 것의 수
                static int countFrom(int from, int to, String table) {
                    int n = 0;
                    for (int i = from; i < to; i++) {
                        String s = SQL.get(i).trim().toLowerCase();
                        if (s.startsWith("select") && (s.contains(" from " + table + " ") || s.contains(" join " + table + " "))) n++;
                    }
                    return n;
                }
            }

            class Lab {
                static String stage = "save";
                static int sqlAtRead = -1;
                static void begin(EntityManager em) { stage = "save"; em.getTransaction().begin(); }
                static void commit(EntityManager em) { stage = "commit"; em.getTransaction().commit(); }
                static void stage(String s) { stage = s; if (s.equals("read")) sqlAtRead = Main.SQL.size(); }
            }
            """;

    static String saveLines(String block) {
        List<String> out = new ArrayList<>();
        for (String ln : block.split("\n")) { String t = ln.strip(); if (!t.startsWith("Lab.")) out.add(t); }
        return String.join("\n", out);
    }

    static String clean(String s) { return s.replace("|", "¦").replace("\r", "").replace("\n", "\\n"); }

    public static void main(String[] args) throws Exception {
        Path root = Files.createTempDirectory("lab-relation-basic");
        JavaCompiler javac = ToolProvider.getSystemJavaCompiler();
        String java = Path.of(System.getProperty("java.home"), "bin", "java").toString(), cp = System.getProperty("java.class.path");
        List<String> out = new ArrayList<>();
        out.add("# hibernate " + org.hibernate.Version.getVersionString() + " | h2 " + org.h2.engine.Constants.VERSION + " | java " + System.getProperty("java.version"));
        int no = 0;
        for (String how : new String[] { "ref", "named", "noanno", "idonly" }) {
            Path dir = root.resolve("c" + (no++)), src = dir.resolve("src/app"), classes = dir.resolve("classes");
            Files.createDirectories(src); Files.createDirectories(classes);
            String blk = block(how);
            Files.writeString(src.resolve("Member.java"), MEMBER, StandardCharsets.UTF_8);
            Files.writeString(src.resolve("Order.java"), orderFull(how), StandardCharsets.UTF_8);
            Files.writeString(src.resolve("Main.java"), MAIN.replace("//BLOCK", blk), StandardCharsets.UTF_8);
            StringWriter cw = new StringWriter();
            int rc = javac.run(null, null, new java.io.PrintStream(new java.io.OutputStream() { public void write(int b) { cw.write(b); } }),
                    "-encoding", "UTF-8", "-proc:none", "-cp", cp, "-d", classes.toString(), src.resolve("Member.java").toString(), src.resolve("Order.java").toString(), src.resolve("Main.java").toString());
            if (rc != 0) { out.add(how + " => COMPILE_ERROR " + cw.toString().replace('\n', ' ')); continue; }
            List<String> cmd = new ArrayList<>(List.of(java, "-Dfile.encoding=UTF-8", "-Dstdout.encoding=UTF-8", "-cp", cp + File.pathSeparator + classes, "app.Main"));
            Process p = new ProcessBuilder(cmd).redirectErrorStream(true).start();
            String all = new String(p.getInputStream().readAllBytes(), StandardCharsets.UTF_8); p.waitFor();
            String res = all.lines().filter(l -> l.startsWith("RESULT ")).findFirst().orElse("RESULT ?|" + (all.length() > 800 ? all.substring(0, 800) : all).replace('\n', ' ').replace('\r', ' '));
            // 화면의 코드: Order 소스(생성자와 getter만 줄임) + 쓰는 쪽
            out.add(how + " => src=" + clean(orderShown(how)) + "|save=" + clean(saveLines(blk)) + "|" + res.substring(7));
        }
        Files.write(Path.of(args[0]), out, StandardCharsets.UTF_8);
        out.forEach(System.out::println);
    }
}

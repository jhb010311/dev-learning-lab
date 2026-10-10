import jakarta.persistence.EntityManager;
import java.io.StringWriter;
import java.net.URI;
import java.net.URL;
import java.net.URLClassLoader;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.ResultSet;
import java.sql.ResultSetMetaData;
import java.sql.Statement;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import javax.tools.JavaCompiler;
import javax.tools.JavaFileObject;
import javax.tools.SimpleJavaFileObject;
import javax.tools.ToolProvider;
import org.hibernate.SessionFactory;
import org.hibernate.cfg.Configuration;
import org.hibernate.resource.jdbc.spi.StatementInspector;

// "엔티티 매핑과 기본 키" 실습의 모든 조합을 실제 Hibernate + H2에서 실행한다.
// 조합마다 엔티티 클래스의 소스를 만들어 컴파일하고, Hibernate가 만든 create table 문을 그대로 받아 적는다.
// 그 뒤 회원 한 명을 저장하고, DB에 남은 행을 JDBC로 직접 읽고, 새 em으로 다시 조회한다.
// 출력 한 줄: name의 @Column|@Enumerated|@Transient|기본 키 => ddl=...|persist=...|inserts=...|row=...|read=...
public class MappingProbe {
    static final List<String> SQL = new ArrayList<>();
    public static class Capture implements StatementInspector {
        @Override public String inspect(String sql) { SQL.add(sql.toLowerCase(Locale.ROOT).trim().split("\\s+")[0]); return sql; }
    }
    static class Src extends SimpleJavaFileObject {
        final String code;
        Src(String name, String code) { super(URI.create("string:///" + name.replace('.', '/') + ".java"), JavaFileObject.Kind.SOURCE); this.code = code; }
        @Override public CharSequence getCharContent(boolean ignore) { return code; }
    }

    // 화면에 보이는 것과 같은 구조의 엔티티 소스를 만든다. added가 true이면 enum 맨 앞에 GUEST를 추가한 뒤의 소스다
    static String memberSource(String pkg, String col, String en, boolean tr, String pk) {
        String column = switch (col) { case "nn" -> "    @Column(nullable = false)\n"; case "uq" -> "    @Column(unique = true)\n"; case "len" -> "    @Column(length = 20)\n"; default -> ""; };
        return "package " + pkg + ";\nimport jakarta.persistence.*;\n\n@Entity\npublic class Member {\n    @Id\n"
            + (pk.equals("auto") ? "    @GeneratedValue(strategy = GenerationType.IDENTITY)\n" : "")
            + "    public Long id;\n\n" + column + "    public String name;\n\n"
            + (en.equals("NONE") ? "" : "    @Enumerated(EnumType." + (en.startsWith("ORDINAL") ? "ORDINAL" : "STRING") + ")\n") + "    public Grade grade;\n\n"
            + (tr ? "    @Transient\n" : "") + "    public String memo;\n}\n";
    }
    static String gradeSource(String pkg, boolean added) { return "package " + pkg + ";\npublic enum Grade { " + (added ? "GUEST, " : "") + "BASIC, VIP }\n"; }

    static Path genDir;
    static ClassLoader compile(List<Src> sources) throws Exception {
        JavaCompiler jc = ToolProvider.getSystemJavaCompiler();
        StringWriter err = new StringWriter();
        boolean ok = jc.getTask(err, null, null, List.of("-d", genDir.toString(), "-classpath", System.getProperty("java.class.path"), "-proc:none"), null, sources).call();
        if (!ok) throw new IllegalStateException("엔티티 소스 컴파일 실패\n" + err);
        return new URLClassLoader(new URL[] { genDir.toUri().toURL() }, MappingProbe.class.getClassLoader());
    }
    static SessionFactory factory(Class<?> entity, String url, StringWriter ddl) {
        Configuration cfg = new Configuration().addAnnotatedClass(entity);
        cfg.setProperty("hibernate.connection.url", url);
        cfg.setProperty("hibernate.session_factory.statement_inspector", Capture.class.getName());
        if (ddl != null) {
            // 테이블을 만들면서, 만든 DDL을 글자 그대로 받아 둔다
            cfg.getProperties().put("jakarta.persistence.schema-generation.database.action", "drop-and-create");
            cfg.getProperties().put("jakarta.persistence.schema-generation.scripts.action", "create");
            cfg.getProperties().put("jakarta.persistence.schema-generation.scripts.create-target", ddl);
        }
        return cfg.buildSessionFactory();
    }
    static Object newMember(Class<?> c, Long id, String name, String grade, String memo) throws Exception {
        Object m = c.getDeclaredConstructor().newInstance();
        if (id != null) c.getField("id").set(m, id);
        c.getField("name").set(m, name);
        if (grade != null) { Class<?> g = c.getField("grade").getType(); for (Object k : g.getEnumConstants()) if (k.toString().equals(grade)) c.getField("grade").set(m, k); }
        c.getField("memo").set(m, memo);
        return m;
    }
    static String root(Throwable e) {
        // 가장 바깥의 예외 종류를 적는다(커밋 중에 난 것은 RollbackException이 감싸므로 한 겹 벗긴다)
        Throwable c = e;
        if (c instanceof jakarta.persistence.RollbackException && c.getCause() != null) c = c.getCause();
        return c.getClass().getSimpleName();
    }
    // 회원을 저장한다. 돌려주는 값: "ok" 또는 예외 이름
    static String persist(SessionFactory sf, Object m) {
        EntityManager em = sf.createEntityManager();
        try { em.getTransaction().begin(); em.persist(m); em.getTransaction().commit(); return "ok"; }
        catch (RuntimeException e) { if (em.getTransaction().isActive()) em.getTransaction().rollback(); return root(e); }
        finally { em.close(); }
    }
    // DB에 남은 행을 하이버네이트를 거치지 않고 읽는다. 컬럼 이름과 값을 그대로 적는다
    static String rawRows(String url) throws Exception {
        try (Connection c = DriverManager.getConnection(url); Statement s = c.createStatement(); ResultSet rs = s.executeQuery("select * from member order by id")) {
            ResultSetMetaData md = rs.getMetaData();
            List<String> rows = new ArrayList<>();
            while (rs.next()) {
                List<String> cells = new ArrayList<>();
                // 컬럼은 이름순으로 적어 비교하기 쉽게 한다
                List<String> names = new ArrayList<>();
                for (int i = 1; i <= md.getColumnCount(); i++) names.add(md.getColumnName(i).toLowerCase(Locale.ROOT));
                names.sort(null);
                for (String n : names) cells.add(n + "=" + rs.getObject(n));
                rows.add(String.join(",", cells));
            }
            return rows.isEmpty() ? "none" : String.join(";", rows);
        }
    }

    public static void main(String[] args) throws Exception {
        genDir = Path.of(MappingProbe.class.getProtectionDomain().getCodeSource().getLocation().toURI()).resolve("gen");
        Files.createDirectories(genDir);
        String[] cols = { "none", "nn", "uq", "len" }, ens = { "ORDINAL", "STRING", "ORDINAL_ADD", "STRING_ADD" }, pks = { "assigned", "auto", "forgot" };
        // 모든 조합의 소스를 한 번에 컴파일한다. 조합마다 패키지를 따로 둔다(m0, m1, ...). enum에 값을 추가한 뒤의 소스는 m0b, m1b, ...
        List<Src> sources = new ArrayList<>();
        List<String[]> combos = new ArrayList<>();
        for (String col : cols) for (String en : ens) for (boolean tr : new boolean[] { false, true }) for (String pk : pks) {
            String pkg = "m" + combos.size();
            combos.add(new String[] { col, en, String.valueOf(tr), pk });
            sources.add(new Src(pkg + ".Member", memberSource(pkg, col, en, tr, pk))); sources.add(new Src(pkg + ".Grade", gradeSource(pkg, false)));
            if (en.endsWith("_ADD")) { sources.add(new Src(pkg + "b.Member", memberSource(pkg + "b", col, en, tr, pk))); sources.add(new Src(pkg + "b.Grade", gradeSource(pkg + "b", true))); }
        }
        // 제약을 어기는 값을 넣어 보는 확인용 엔티티 (col마다 하나)와, 자동 생성인데 id를 직접 넣어 보는 엔티티
        for (String col : cols) { sources.add(new Src("v" + col + ".Member", memberSource("v" + col, col, "STRING", true, "assigned"))); sources.add(new Src("v" + col + ".Grade", gradeSource("v" + col, false))); }
        sources.add(new Src("vauto.Member", memberSource("vauto", "none", "STRING", true, "auto"))); sources.add(new Src("vauto.Grade", gradeSource("vauto", false)));
        // @Enumerated를 붙이지 않은 엔티티
        sources.add(new Src("vnoenum.Member", memberSource("vnoenum", "none", "NONE", true, "assigned"))); sources.add(new Src("vnoenum.Grade", gradeSource("vnoenum", false)));
        ClassLoader loader = compile(sources);
        Thread.currentThread().setContextClassLoader(loader);

        List<String> out = new ArrayList<>();
        out.add("# hibernate " + org.hibernate.Version.getVersionString());
        for (int i = 0; i < combos.size(); i++) {
            String[] c = combos.get(i);
            String col = c[0], en = c[1], pk = c[3], url = "jdbc:h2:mem:mapping" + i + ";DB_CLOSE_DELAY=-1";
            Class<?> entity = loader.loadClass("m" + i + ".Member");
            StringWriter ddl = new StringWriter();
            String persist, row, read = "none"; long inserts;
            try (SessionFactory sf = factory(entity, url, ddl)) {
                Object m = newMember(entity, pk.equals("assigned") ? 100L : null, "김철수", "VIP", "오늘 가입");
                SQL.clear();
                persist = persist(sf, m);
                inserts = SQL.stream().filter(s -> s.equals("insert")).count();
                row = rawRows(url);
                if (persist.equals("ok")) {
                    Object id = entity.getField("id").get(m);
                    // 다시 조회: enum을 바꾸는 조합은 바꾼 뒤의 클래스로(테이블은 그대로 두고) 읽는다
                    Class<?> readEntity = en.endsWith("_ADD") ? loader.loadClass("m" + i + "b.Member") : entity;
                    SessionFactory sf2 = readEntity == entity ? sf : factory(readEntity, url, null);
                    try (EntityManager em = sf2.createEntityManager()) {
                        Object r = em.find(readEntity, id);
                        read = "grade=" + readEntity.getField("grade").get(r) + ",memo=" + readEntity.getField("memo").get(r);
                    } finally { if (sf2 != sf) sf2.close(); }
                }
            }
            out.add(String.join("|", c) + " => ddl=" + ddl.toString().trim().replaceAll("\\s+", " ") + "|persist=" + persist + "|inserts=" + inserts + "|row=" + row + "|read=" + read);
        }
        // 모형의 조합은 아니지만 화면의 설명에 쓴 사실을 따로 확인한다
        // (1) 제약을 어기는 값: 회원 한 명(김철수)을 저장한 뒤, 두 번째 회원의 name을 null / 같은 이름 / 21자로 넣어 본다. 두 번째 INSERT가 DB로 나갔는지도 적는다
        for (String col : cols) for (String val : new String[] { "null", "dup", "long" }) {
            String url = "jdbc:h2:mem:mappingv_" + col + "_" + val + ";DB_CLOSE_DELAY=-1";
            Class<?> entity = loader.loadClass("v" + col + ".Member");
            try (SessionFactory sf = factory(entity, url, new StringWriter())) {
                persist(sf, newMember(entity, 100L, "김철수", "VIP", null));
                SQL.clear();
                String name = val.equals("null") ? null : val.equals("dup") ? "김철수" : "가".repeat(21);
                String res = persist(sf, newMember(entity, 101L, name, "VIP", null));
                out.add("extra|viol|" + col + "|" + val + " => " + res + "|insertSent=" + SQL.stream().filter(s -> s.equals("insert")).count());
            }
        }
        // (2) 자동 생성(IDENTITY)인 엔티티에 id를 직접 넣고 persist하면
        {
            Class<?> entity = loader.loadClass("vauto.Member");
            try (SessionFactory sf = factory(entity, "jdbc:h2:mem:mappingv_auto;DB_CLOSE_DELAY=-1", new StringWriter())) {
                SQL.clear();
                out.add("extra|auto-with-id => " + persist(sf, newMember(entity, 100L, "김철수", "VIP", null)) + "|insertSent=" + SQL.stream().filter(s -> s.equals("insert")).count());
            }
        }
        // (3) 테이블을 Hibernate가 만들지 않은 경우: 제약이 없는 테이블을 SQL로 직접 만들어 두고, 같은 엔티티로 같은 값을 넣어 본다
        for (String col : cols) for (String val : new String[] { "null", "dup", "long" }) {
            String url = "jdbc:h2:mem:mappingn_" + col + "_" + val + ";DB_CLOSE_DELAY=-1";
            try (Connection c = DriverManager.getConnection(url); Statement s = c.createStatement()) { s.executeUpdate("create table member (id bigint primary key, name varchar(255), grade varchar(255))"); }
            Class<?> entity = loader.loadClass("v" + col + ".Member");
            try (SessionFactory sf = factory(entity, url, null)) {
                persist(sf, newMember(entity, 100L, "김철수", "VIP", null));
                SQL.clear();
                String name = val.equals("null") ? null : val.equals("dup") ? "김철수" : "가".repeat(21);
                String res = persist(sf, newMember(entity, 101L, name, "VIP", null));
                out.add("extra|noddl|" + col + "|" + val + " => " + res + "|insertSent=" + SQL.stream().filter(s -> s.equals("insert")).count());
            }
        }
        // (4) enum 필드에 @Enumerated를 붙이지 않으면 어떻게 만들어지고 저장되는가
        {
            String url = "jdbc:h2:mem:mappingv_noenum;DB_CLOSE_DELAY=-1";
            Class<?> entity = loader.loadClass("vnoenum.Member");
            StringWriter ddl = new StringWriter();
            try (SessionFactory sf = factory(entity, url, ddl)) {
                String res = persist(sf, newMember(entity, 100L, "김철수", "VIP", null));
                out.add("extra|no-enumerated => ddl=" + ddl.toString().trim().replaceAll("\\s+", " ") + "|persist=" + res + "|row=" + rawRows(url));
            }
        }
        Files.write(Path.of(args[0]), out, StandardCharsets.UTF_8);
        System.out.println(out.get(0) + " | " + (out.size() - 1) + " lines");
        out.stream().limit(14).forEach(System.out::println);
    }
}

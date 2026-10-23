import jakarta.persistence.EntityManager;
import java.io.ByteArrayOutputStream;
import java.io.PrintStream;
import java.io.StringWriter;
import java.lang.reflect.InvocationTargetException;
import java.lang.reflect.Method;
import java.net.URI;
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
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import javax.tools.JavaCompiler;
import javax.tools.JavaFileObject;
import javax.tools.SimpleJavaFileObject;
import javax.tools.ToolProvider;
import org.hibernate.SessionFactory;
import org.hibernate.cfg.Configuration;

// "열거형(enum)" 실습의 45가지 조합(저장 방식 3 × 선언의 변경 5 × 저장해 둔 상수 3)을 실제 Hibernate + H2에서 실행한다.
// 화면의 코드는 실습의 code 함수가 만든 글을 그대로 쓴다: 먼저 node verify/spring/enumtype_probe_src.js <폴더>가 조합마다 screen.txt를 쓰고,
// 이 프로그램이 그 글을 "// 파일: X.java" 줄로 나눠 패키지만 붙여 컴파일한다(예전 선언은 o<번호>, 지금 선언은 n<번호> 패키지).
// 조합마다:
//   1. 예전 선언(ORDERED, PAID, SHIPPED)의 Order로 SessionFactory를 만들며 테이블을 새로 만든다(만든 create table 문을 받아 둔다).
//   2. new Order(1L, 저장할 상수)를 persist하고 커밋한 뒤, DB의 status 값을 JDBC로 직접 읽는다.
//   3. 테이블은 그대로 두고, 지금 선언의 Order로 새 SessionFactory를 만들어 화면의 OrderReader.print(em)을 그대로 부른다.
//      표준 출력을 받아 적고, 예외가 나면 예외의 종류와 메시지(원인 사슬 전부)를 적는다.
//   4. 같은 DB 값을 순수 자바로 바꾼 결과도 적는다: ORDINAL이면 values()[값], STRING이면 Enum.valueOf(이름), 코드면 fromCode(값).
// 출력 한 줄: 저장 방식|변경|상수 => ddl=status 컬럼 정의|db=DB의 status 값|out=출력 줄 / 출력 줄|err=예외(없으면 -)|java=순수 자바로 바꾼 결과
//   예외 메시지의 패키지 이름(n12. 같은 것)은 화면의 코드에 없으므로 지우고 적는다.
//       # src 저장 방식|변경|상수 :: 화면의 코드 (줄바꿈은 \n으로 적음. 화면의 코드와 같은지 대조하는 데 쓴다)
// 실행 (JDK 21, 라이브러리는 E:/dev/java-interview-lab/verify/spring/libs):
//   node verify/spring/enumtype_probe_src.js <폴더>
//   javac -cp "libs/*" -d <클래스 폴더> verify/spring/src/EnumTypeProbe.java
//   java -cp "<클래스 폴더>;libs/*" EnumTypeProbe <폴더> > verify/spring/enumtype_probe.out.txt
public class EnumTypeProbe {
    static class Src extends SimpleJavaFileObject {
        final String code;
        Src(String name, String code) { super(URI.create("string:///" + name.replace('.', '/') + ".java"), JavaFileObject.Kind.SOURCE); this.code = code; }
        @Override public CharSequence getCharContent(boolean ignore) { return code; }
    }
    static final Pattern FILE = Pattern.compile("^// 파일: (\\w+)\\.java$", Pattern.MULTILINE);

    // 화면의 코드를 파일마다 나누고 패키지를 붙인다
    static List<Src> split(String pkg, String screen) {
        List<Src> list = new ArrayList<>();
        Matcher m = FILE.matcher(screen);
        List<int[]> at = new ArrayList<>();
        List<String> names = new ArrayList<>();
        while (m.find()) { at.add(new int[] { m.start() }); names.add(m.group(1)); }
        for (int i = 0; i < at.size(); i++) {
            int from = at.get(i)[0], to = i + 1 < at.size() ? at.get(i + 1)[0] : screen.length();
            list.add(new Src(pkg + "." + names.get(i), "package " + pkg + ";\n" + screen.substring(from, to)));
        }
        return list;
    }

    static Path genDir;
    static ClassLoader compile(List<Src> sources) throws Exception {
        JavaCompiler jc = ToolProvider.getSystemJavaCompiler();
        StringWriter err = new StringWriter();
        boolean ok = jc.getTask(err, null, null, List.of("-d", genDir.toString(), "-classpath", System.getProperty("java.class.path"), "-proc:none", "-encoding", "UTF-8"), null, sources).call();
        if (!ok) throw new IllegalStateException("화면 코드 컴파일 실패\n" + err);
        return new URLClassLoader(new URL[] { genDir.toUri().toURL() }, EnumTypeProbe.class.getClassLoader());
    }

    static SessionFactory factory(Class<?> entity, String url, StringWriter ddl) {
        Configuration cfg = new Configuration().addAnnotatedClass(entity);
        cfg.setProperty("hibernate.connection.url", url);
        if (ddl != null) {
            // 처음 배포: 테이블을 만들면서, 만든 DDL을 글자 그대로 받아 둔다
            cfg.getProperties().put("jakarta.persistence.schema-generation.database.action", "drop-and-create");
            cfg.getProperties().put("jakarta.persistence.schema-generation.scripts.action", "create");
            cfg.getProperties().put("jakarta.persistence.schema-generation.scripts.create-target", ddl);
        }
        // 다시 배포: 테이블을 건드리지 않는다(아무 설정도 하지 않으면 스키마 생성은 none)
        return cfg.buildSessionFactory();
    }

    static Object constant(Class<?> enumClass, String name) {
        for (Object k : enumClass.getEnumConstants()) if (((Enum<?>) k).name().equals(name)) return k;
        throw new IllegalStateException("상수 없음 " + name);
    }

    // 예외의 원인 사슬을 "종류: 메시지 <- 종류: 메시지" 꼴로 적는다
    static String chain(Throwable e, String pkg) {
        List<String> parts = new ArrayList<>();
        for (Throwable t = e; t != null; t = t.getCause()) parts.add(clean(t.getClass().getName() + ": " + t.getMessage(), pkg));
        return String.join(" <- ", parts);
    }
    static String clean(String s, String pkg) { return (pkg.isEmpty() ? s : s.replace(pkg + ".", "")).replace("\n", " "); }

    static String persist(SessionFactory sf, Object order) {
        EntityManager em = sf.createEntityManager();
        try { em.getTransaction().begin(); em.persist(order); em.getTransaction().commit(); return "ok"; }
        catch (RuntimeException e) { if (em.getTransaction().isActive()) em.getTransaction().rollback(); return "!" + chain(e, ""); }
        finally { em.close(); }
    }

    static String rawStatus(String url, long id) throws Exception {
        try (Connection c = DriverManager.getConnection(url); Statement s = c.createStatement(); ResultSet rs = s.executeQuery("select status from orders where id = " + id)) {
            return rs.next() ? String.valueOf(rs.getObject(1)) : "none";
        }
    }

    static String statusColumn(String ddl) {
        String one = ddl.trim().replaceAll("\\s+", " ");
        int a = one.indexOf("status "), b = one.indexOf(", id ", a);
        if (b < 0) b = one.indexOf(", primary key", a);
        return a < 0 || b < 0 ? one : one.substring(a, b);
    }

    // 화면의 OrderReader.print(em)을 그대로 부르고, 표준 출력과 예외를 받아 적는다
    static String[] runPrint(ClassLoader loader, String pkg, SessionFactory sf) throws Exception {
        Class<?> reader = loader.loadClass(pkg + ".OrderReader");
        Method print = reader.getDeclaredMethod("print", EntityManager.class);
        print.setAccessible(true);
        PrintStream old = System.out;
        ByteArrayOutputStream buf = new ByteArrayOutputStream();
        String err = "-";
        try (EntityManager em = sf.createEntityManager()) {
            System.setOut(new PrintStream(buf, true, StandardCharsets.UTF_8));
            try { print.invoke(null, em); }
            catch (InvocationTargetException e) { err = chain(e.getCause(), pkg); }
        } finally { System.setOut(old); }
        String out = buf.toString(StandardCharsets.UTF_8).replace("\r", "").strip();
        return new String[] { out.isEmpty() ? "-" : String.join(" / ", out.split("\n")), err };
    }

    // DB 값을 순수 자바 enum API로 바꾼 결과
    static String javaRead(ClassLoader loader, String pkg, String store, String db) throws Exception {
        Class<?> st = loader.loadClass(pkg + ".OrderStatus");
        try {
            return switch (store) {
                case "ORDINAL" -> ((Object[]) st.getMethod("values").invoke(null))[Integer.parseInt(db)].toString();
                case "STRING" -> ((Enum<?>) st.getMethod("valueOf", String.class).invoke(null, db)).name();
                default -> ((Enum<?>) st.getMethod("fromCode", String.class).invoke(null, db)).name();
            };
        } catch (InvocationTargetException e) { return "!" + chain(e.getCause(), pkg); }
        catch (RuntimeException e) { return "!" + chain(e, pkg); }
    }

    public static void main(String[] args) throws Exception {
        // Hibernate의 로그가 화면 코드의 표준 출력에 섞이지 않게 끈다
        ((ch.qos.logback.classic.Logger) org.slf4j.LoggerFactory.getLogger(org.slf4j.Logger.ROOT_LOGGER_NAME)).setLevel(ch.qos.logback.classic.Level.OFF);
        Path base = Path.of(args[0]);
        genDir = Path.of(EnumTypeProbe.class.getProtectionDomain().getCodeSource().getLocation().toURI()).resolve("gen");
        Files.createDirectories(genDir);
        List<String> keys = Files.readAllLines(base.resolve("keys.txt")).stream().filter(s -> !s.isBlank()).toList();
        Map<String, String> oldScreen = new LinkedHashMap<>();
        for (String store : new String[] { "ORDINAL", "STRING", "code" }) oldScreen.put(store, Files.readString(base.resolve(store + "_old/screen.txt"), StandardCharsets.UTF_8).replace("\r", ""));

        List<Src> sources = new ArrayList<>();
        List<String> screens = new ArrayList<>();
        for (int i = 0; i < keys.size(); i++) {
            String store = keys.get(i).split("_")[0];
            String screen = Files.readString(base.resolve(keys.get(i)).resolve("screen.txt"), StandardCharsets.UTF_8).replace("\r", "");
            screens.add(screen);
            sources.addAll(split("o" + i, oldScreen.get(store)));
            sources.addAll(split("n" + i, screen));
        }
        // 화면 밖에서 확인할 사실에 쓰는 소스
        String ordOld = oldScreen.get("ORDINAL");
        // (1) @Enumerated를 붙이지 않은 엔티티
        sources.addAll(split("xnoenum", ordOld.replace("    @Enumerated(EnumType.ORDINAL)\n", "")));
        // (2) 저장한 뒤 맨 끝의 SHIPPED를 지운 선언
        String removed = ordOld.replace("{ ORDERED, PAID, SHIPPED }", "{ ORDERED, PAID }");
        if (removed.equals(ordOld)) throw new IllegalStateException("SHIPPED를 지우지 못함");
        sources.addAll(split("xremoved", removed));
        ClassLoader loader = compile(sources);
        Thread.currentThread().setContextClassLoader(loader);

        List<String> out = new ArrayList<>();
        out.add("# hibernate " + org.hibernate.Version.getVersionString() + ", h2 " + org.h2.engine.Constants.FULL_VERSION + ", java " + System.getProperty("java.version"));
        for (int i = 0; i < keys.size(); i++) {
            String[] k = keys.get(i).split("_");
            String store = k[0], change = k[1], saved = k[2], url = "jdbc:h2:mem:enumtype" + i + ";DB_CLOSE_DELAY=-1";
            Class<?> oldOrder = loader.loadClass("o" + i + ".Order"), oldStatus = loader.loadClass("o" + i + ".OrderStatus");
            StringWriter ddl = new StringWriter();
            String persisted;
            try (SessionFactory sf = factory(oldOrder, url, ddl)) {
                persisted = persist(sf, oldOrder.getConstructor(Long.class, oldStatus).newInstance(1L, constant(oldStatus, saved)));
            }
            if (!persisted.equals("ok")) throw new IllegalStateException(keys.get(i) + " 저장 실패 " + persisted);
            String db = rawStatus(url, 1);
            String[] printed;
            try (SessionFactory sf = factory(loader.loadClass("n" + i + ".Order"), url, null)) {
                printed = runPrint(loader, "n" + i, sf);
            }
            String key = store + "|" + change + "|" + saved;
            out.add(key + " => ddl=" + statusColumn(ddl.toString()) + "|db=" + db + "|out=" + printed[0] + "|err=" + printed[1] + "|java=" + javaRead(loader, "n" + i, store, db));
            if (change.equals("same") && saved.equals("ORDERED")) out.add("# create table (" + store + ") :: " + ddl.toString().trim().replaceAll("\\s+", " "));
            out.add("# src " + key + " :: " + screens.get(i).replace("\n", "\\n"));
        }

        // 설정에는 없지만 글에서 말한 사실
        // (1) @Enumerated를 붙이지 않으면: 컬럼 정의와 저장된 값
        {
            String url = "jdbc:h2:mem:enumtype_noenum;DB_CLOSE_DELAY=-1";
            Class<?> o = loader.loadClass("xnoenum.Order"), st = loader.loadClass("xnoenum.OrderStatus");
            StringWriter ddl = new StringWriter();
            try (SessionFactory sf = factory(o, url, ddl)) { persist(sf, o.getConstructor(Long.class, st).newInstance(1L, constant(st, "PAID"))); }
            out.add("extra|no-enumerated => ddl=" + statusColumn(ddl.toString()) + "|db=" + rawStatus(url, 1));
        }
        // (2) ORDINAL로 SHIPPED(2)를 저장한 뒤 SHIPPED를 지우고 읽으면
        {
            String url = "jdbc:h2:mem:enumtype_removed;DB_CLOSE_DELAY=-1";
            int ordSame = keys.indexOf("ORDINAL_same_SHIPPED");
            Class<?> o = loader.loadClass("o" + ordSame + ".Order"), st = loader.loadClass("o" + ordSame + ".OrderStatus");
            try (SessionFactory sf = factory(o, url, new StringWriter())) { persist(sf, o.getConstructor(Long.class, st).newInstance(1L, constant(st, "SHIPPED"))); }
            try (SessionFactory sf = factory(loader.loadClass("xremoved.Order"), url, null)) {
                String[] p = runPrint(loader, "xremoved", sf);
                out.add("extra|removed-ordinal => db=" + rawStatus(url, 1) + "|out=" + p[0] + "|err=" + p[1] + "|java=" + javaRead(loader, "xremoved", "ORDINAL", rawStatus(url, 1)));
            }
        }
        // (3) 변환기가 모르는 코드: 코드로 저장하는 테이블에 status가 'X'인 행을 SQL로 넣고 em.find로 읽으면
        {
            int i = keys.indexOf("code_same_PAID");
            String url = "jdbc:h2:mem:enumtype" + i + ";DB_CLOSE_DELAY=-1";
            // Hibernate가 만든 check 조건이 있으면 넣기 전에 지운다(조건 이름은 H2가 정하므로 찾아서 지운다)
            try (Connection c = DriverManager.getConnection(url); Statement s = c.createStatement()) {
                List<String> checks = new ArrayList<>();
                try (ResultSet rs = s.executeQuery("select constraint_name from information_schema.table_constraints where table_name = 'ORDERS' and constraint_type = 'CHECK'")) { while (rs.next()) checks.add(rs.getString(1)); }
                for (String ck : checks) s.executeUpdate("alter table orders drop constraint " + ck);
                out.add("extra|converter-unknown-code-dropped-checks => " + checks.size());
                s.executeUpdate("insert into orders (id, status) values (2, 'X')");
            }
            Class<?> o = loader.loadClass("n" + i + ".Order");
            try (SessionFactory sf = factory(o, url, null); EntityManager em = sf.createEntityManager()) {
                String r;
                try { Object order = em.find(o, 2L); r = "ok " + o.getMethod("getStatus").invoke(order); }
                catch (RuntimeException e) { r = "!" + chain(e, "n" + i); }
                out.add("extra|converter-unknown-code => " + r);
            }
        }
        // (4) Hibernate가 만든 테이블을 그대로 쓸 때, 다시 배포한 뒤 새 상수를 저장하면 (CANCELED를 끼워 넣은 조합의 DB에 이어서)
        for (String store : new String[] { "ORDINAL", "STRING" }) {
            int i = keys.indexOf(store + "_insert_PAID");
            String url = "jdbc:h2:mem:enumtype" + i + ";DB_CLOSE_DELAY=-1";
            Class<?> o = loader.loadClass("n" + i + ".Order"), st = loader.loadClass("n" + i + ".OrderStatus");
            try (SessionFactory sf = factory(o, url, null)) {
                out.add("extra|save-after-insert|" + store + "|SHIPPED => " + persist(sf, o.getConstructor(Long.class, st).newInstance(2L, constant(st, "SHIPPED"))));
                out.add("extra|save-after-insert|" + store + "|CANCELED => " + persist(sf, o.getConstructor(Long.class, st).newInstance(3L, constant(st, "CANCELED"))));
            }
        }
        // (5) 순수 자바: 같은 상수는 values()·valueOf·코드에 적은 것 모두 같은 객체인가, valueOf에 소문자 이름을 주면
        {
            Class<?> st = loader.loadClass("o0.OrderStatus");
            Object a = constant(st, "PAID"), b = st.getMethod("valueOf", String.class).invoke(null, "PAID"), c = ((Object[]) st.getMethod("values").invoke(null))[1];
            out.add("extra|same-object => " + (a == b && b == c));
            out.add("extra|valueOf-lowercase => " + javaRead(loader, "o0", "STRING", "paid"));
        }
        System.out.println(String.join("\n", out));
    }
}

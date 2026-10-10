import jakarta.persistence.Entity;
import jakarta.persistence.EntityManager;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Inheritance;
import jakarta.persistence.InheritanceType;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.TreeMap;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import org.hibernate.SessionFactory;
import org.hibernate.cfg.Configuration;
import org.hibernate.resource.jdbc.spi.StatementInspector;

// "상속 관계 매핑" 실습의 모든 조합을 실제 Hibernate + H2에서 실행한다.
// 조합마다 만들어진 테이블과 컬럼, 나간 SQL(종류와 테이블별 횟수), 조회 쿼리의 모양(읽은 테이블, 조인 수, UNION 수), DB에 남은 행을 적는다.
public class InheritMapProbe {
    static final List<String> SQL = new ArrayList<>();
    static boolean on = true;
    public static class Capture implements StatementInspector {
        @Override public String inspect(String sql) { if (on) SQL.add(sql.toLowerCase(Locale.ROOT)); return sql; }
    }

    // 조인 전략: 부모 테이블과 자식 테이블을 따로 만들고, 자식의 기본 키가 부모를 가리킨다
    public static class J {
        @Entity(name = "Item") @Inheritance(strategy = InheritanceType.JOINED)
        public static abstract class Item {
            @Id Long id; String name; int price;
            public Item() { }
            public Item(Long id, String name, int price) { this.id = id; this.name = name; this.price = price; }
        }
        @Entity(name = "Book")
        public static class Book extends Item {
            String author;
            public Book() { }
            public Book(Long id, String name, int price, String author) { super(id, name, price); this.author = author; }
        }
        @Entity(name = "Album")
        public static class Album extends Item {
            String artist;
            public Album() { }
            public Album(Long id, String name, int price, String artist) { super(id, name, price); this.artist = artist; }
        }
        @Entity(name = "Movie")
        public static class Movie extends Item {
            String actor;
            public Movie() { }
            public Movie(Long id, String name, int price, String actor) { super(id, name, price); this.actor = actor; }
        }
    }
    // 단일 테이블 전략: 부모와 자식을 모두 한 테이블에 넣고, 구분 컬럼(DTYPE)으로 어느 자식인지 적는다
    public static class S {
        @Entity(name = "Item") @Inheritance(strategy = InheritanceType.SINGLE_TABLE)
        public static abstract class Item {
            @Id Long id; String name; int price;
            public Item() { }
            public Item(Long id, String name, int price) { this.id = id; this.name = name; this.price = price; }
        }
        @Entity(name = "Book")
        public static class Book extends Item {
            String author;
            public Book() { }
            public Book(Long id, String name, int price, String author) { super(id, name, price); this.author = author; }
        }
        @Entity(name = "Album")
        public static class Album extends Item {
            String artist;
            public Album() { }
            public Album(Long id, String name, int price, String artist) { super(id, name, price); this.artist = artist; }
        }
        @Entity(name = "Movie")
        public static class Movie extends Item {
            String actor;
            public Movie() { }
            public Movie(Long id, String name, int price, String actor) { super(id, name, price); this.actor = actor; }
        }
    }
    // 구현 클래스마다 테이블 전략: 자식 테이블만 만들고, 부모의 필드를 자식 테이블마다 되풀이해 넣는다
    public static class T {
        @Entity(name = "Item") @Inheritance(strategy = InheritanceType.TABLE_PER_CLASS)
        public static abstract class Item {
            @Id Long id; String name; int price;
            public Item() { }
            public Item(Long id, String name, int price) { this.id = id; this.name = name; this.price = price; }
        }
        @Entity(name = "Book")
        public static class Book extends Item {
            String author;
            public Book() { }
            public Book(Long id, String name, int price, String author) { super(id, name, price); this.author = author; }
        }
        @Entity(name = "Album")
        public static class Album extends Item {
            String artist;
            public Album() { }
            public Album(Long id, String name, int price, String artist) { super(id, name, price); this.artist = artist; }
        }
        @Entity(name = "Movie")
        public static class Movie extends Item {
            String actor;
            public Movie() { }
            public Movie(Long id, String name, int price, String actor) { super(id, name, price); this.actor = actor; }
        }
    }
    // 덧붙여 확인: 구현 클래스마다 테이블 전략에서 기본 키를 IDENTITY로 만들면 시작할 때 실패하는가
    public static class TI {
        @Entity(name = "Item") @Inheritance(strategy = InheritanceType.TABLE_PER_CLASS)
        public static abstract class Item {
            @Id @GeneratedValue(strategy = GenerationType.IDENTITY) Long id; String name;
        }
        @Entity(name = "Book")
        public static class Book extends Item { String author; }
    }

    // 덧붙여 확인: @Inheritance를 적지 않으면 어떤 전략이 되는가
    public static class D {
        @Entity(name = "Item")
        public static abstract class Item { @Id Long id; String name; int price; }
        @Entity(name = "Book")
        public static class Book extends Item { String author; }
    }
    // 덧붙여 확인: 조인 전략에 @DiscriminatorColumn을 붙이면 부모 테이블에 구분 컬럼이 생기는가
    public static class JD {
        @Entity(name = "Item") @Inheritance(strategy = InheritanceType.JOINED) @jakarta.persistence.DiscriminatorColumn
        public static abstract class Item { @Id Long id; String name; int price; }
        @Entity(name = "Book")
        public static class Book extends Item { String author; }
    }

    static int dbNo = 0;
    static SessionFactory factory(Class<?>... cs) {
        Configuration cfg = new Configuration();
        for (Class<?> c : cs) cfg.addAnnotatedClass(c);
        cfg.setProperty("hibernate.connection.url", "jdbc:h2:mem:inheritmap" + (dbNo++) + ";DB_CLOSE_DELAY=-1");
        cfg.setProperty("hibernate.hbm2ddl.auto", "create-drop");
        cfg.setProperty("hibernate.session_factory.statement_inspector", Capture.class.getName());
        return cfg.buildSessionFactory();
    }
    @SuppressWarnings("unchecked")
    static List<Object[]> q(SessionFactory sf, String query) {
        on = false;
        try (EntityManager em = sf.createEntityManager()) {
            List<Object[]> out = new ArrayList<>();
            for (Object r : em.createNativeQuery(query).getResultList()) out.add(r instanceof Object[] x ? x : new Object[] { r });
            return out;
        } finally { on = true; }
    }
    static String low(Object o) { return String.valueOf(o).toLowerCase(Locale.ROOT); }
    static Map<String, List<String>> tableMap(SessionFactory sf) {
        Map<String, List<String>> t = new TreeMap<>();
        for (Object[] r : q(sf, "select c.table_name, c.column_name from information_schema.columns c join information_schema.tables t on t.table_schema = c.table_schema and t.table_name = c.table_name where c.table_schema = 'PUBLIC' and t.table_type = 'BASE TABLE' order by c.table_name, c.column_name")) t.computeIfAbsent(low(r[0]), k -> new ArrayList<>()).add(low(r[1]));
        return t;
    }
    static String tables(Map<String, List<String>> t) {
        StringBuilder sb = new StringBuilder();
        t.forEach((k, v) -> sb.append(sb.length() > 0 ? ";" : "").append(k).append('(').append(String.join(",", v)).append(')'));
        return sb.toString();
    }
    static String fks(SessionFactory sf) {
        List<String> out = new ArrayList<>();
        for (Object[] r : q(sf, "select k.table_name, k.column_name, t.table_name from information_schema.referential_constraints r join information_schema.key_column_usage k on k.constraint_name = r.constraint_name join information_schema.table_constraints t on t.constraint_name = r.unique_constraint_name order by 1, 2")) out.add(low(r[0]) + "." + low(r[1]) + ">" + low(r[2]));
        return out.isEmpty() ? "none" : String.join(",", out);
    }
    static final Pattern KIND = Pattern.compile("^(insert into|update|delete from|select)\\s+(\\S+)");
    static String sql() {
        Map<String, Integer> m = new LinkedHashMap<>();
        for (String s : SQL) {
            Matcher k = KIND.matcher(s); if (!k.find()) continue;
            String kind = k.group(1).split(" ")[0];
            m.merge(kind.equals("select") ? "select" : kind + ":" + k.group(2).replaceAll("[^a-z_]", ""), 1, Integer::sum);
        }
        StringBuilder sb = new StringBuilder();
        m.forEach((k, v) -> sb.append(sb.length() > 0 ? "," : "").append(k).append('=').append(v));
        return sb.length() == 0 ? "none" : sb.toString();
    }
    // 조회 쿼리의 모양: 읽은 테이블(나온 순서), join의 수, union의 수, 구분 컬럼(dtype)을 조건으로 쓰는지
    static final Pattern TBL = Pattern.compile("\\b(?:from|join)\\s+([a-z_]+)\\b");
    static String shape() {
        StringBuilder sb = new StringBuilder();
        for (String s : SQL) {
            if (!s.startsWith("select")) continue;
            List<String> ts = new ArrayList<>();
            Matcher m = TBL.matcher(s); while (m.find()) if (!ts.contains(m.group(1))) ts.add(m.group(1));
            int joins = s.split("\\bjoin\\b", -1).length - 1, inner = s.split("(?<!left )(?<!outer )\\bjoin\\b", -1).length - 1, unions = s.split("\\bunion\\b", -1).length - 1;
            int where = s.lastIndexOf(" where ");
            boolean dtypeCond = where >= 0 && s.substring(where).contains("dtype");
            sb.append(sb.length() > 0 ? " // " : "").append("read=").append(String.join("+", ts)).append(",join=").append(joins).append(",innerJoin=").append(inner).append(",union=").append(unions).append(",dtypeInWhere=").append(dtypeCond);
        }
        return sb.length() == 0 ? "none" : sb.toString();
    }
    static String dump(SessionFactory sf, Map<String, List<String>> t) {
        StringBuilder sb = new StringBuilder();
        t.forEach((name, cols) -> {
            StringBuilder rs = new StringBuilder();
            for (Object[] a : q(sf, "select " + String.join(", ", cols) + " from " + name + " order by id")) { List<String> cells = new ArrayList<>(); for (Object o : a) cells.add(String.valueOf(o)); rs.append(rs.length() > 0 ? "/" : "").append(String.join(",", cells)); }
            sb.append(sb.length() > 0 ? ";" : "").append(name).append('[').append(rs).append(']');
        });
        return sb.toString();
    }

    static Class<?>[] classes(String st, int kids) {
        Class<?>[] all = switch (st) {
            case "JOINED" -> new Class<?>[] { J.Item.class, J.Book.class, J.Album.class, J.Movie.class };
            case "SINGLE_TABLE" -> new Class<?>[] { S.Item.class, S.Book.class, S.Album.class, S.Movie.class };
            default -> new Class<?>[] { T.Item.class, T.Book.class, T.Album.class, T.Movie.class };
        };
        Class<?>[] out = new Class<?>[kids + 1];
        System.arraycopy(all, 0, out, 0, kids + 1);
        return out;
    }
    static Object book(String st) {
        return switch (st) { case "JOINED" -> new J.Book(1L, "자바책", 20000, "김저자"); case "SINGLE_TABLE" -> new S.Book(1L, "자바책", 20000, "김저자"); default -> new T.Book(1L, "자바책", 20000, "김저자"); };
    }
    static final List<String> SAMPLE = new ArrayList<>();
    static String run(String st, int kids, String op) {
        Class<?>[] cs = classes(st, kids);
        try (SessionFactory sf = factory(cs)) {
            Map<String, List<String>> tm = tableMap(sf);
            String t = tables(tm), f = fks(sf);
            SQL.clear();
            int before;
            try (EntityManager em = sf.createEntityManager()) {
                em.getTransaction().begin();
                em.persist(book(st));
                before = SQL.size();   // id를 직접 넣었으므로 persist만으로는 INSERT가 나가지 않는지 본다
                em.getTransaction().commit();
            }
            String save = sql(), found = "-", shape = "none";
            if (op.equals("save") && kids == 3) SQL.forEach(x -> SAMPLE.add("# sql " + st + "|save: " + x));
            if (!op.equals("save")) {
                SQL.clear();
                try (EntityManager em = sf.createEntityManager()) {
                    Class<?> type = op.equals("findc") ? cs[1] : cs[0];   // findc는 Book.class, findp는 Item.class
                    Object o = em.find(type, 1L);
                    found = o == null ? "null" : o.getClass().getSimpleName();
                }
                shape = shape();
                if (kids == 3) for (String x : SQL) SAMPLE.add("# sql " + st + "|" + op + ": " + x);
            }
            return "tables=" + t + "|fk=" + f + "|sqlBeforeCommit=" + (op.equals("save") ? String.valueOf(before) : "-") + "|sql=" + (op.equals("save") ? save : sql()) + "|shape=" + shape + "|found=" + found + "|db=" + dump(sf, tm);
        }
    }

    public static void main(String[] args) throws Exception {
        List<String> out = new ArrayList<>();
        out.add("# hibernate " + org.hibernate.Version.getVersionString());
        for (String st : new String[] { "JOINED", "SINGLE_TABLE", "TABLE_PER_CLASS" }) for (int kids = 1; kids <= 3; kids++) for (String op : new String[] { "save", "findc", "findp" }) out.add(st + "|" + kids + "|" + op + " => " + run(st, kids, op));
        out.add("# 아래는 자식 클래스 3개일 때 실제로 나간 SQL 문장(소문자로 바꾼 것)");
        out.addAll(SAMPLE);
        // 덧붙여 확인: 일반 테이블이 아닌 것(Hibernate가 대량 수정용으로 만들어 두는 임시 테이블)이 무엇인지
        try (SessionFactory sf = factory(classes("JOINED", 2))) {
            StringBuilder sb = new StringBuilder();
            for (Object[] r : q(sf, "select table_name, table_type from information_schema.tables where table_schema = 'PUBLIC' order by 1")) sb.append(sb.length() > 0 ? "," : "").append(low(r[0])).append(':').append(low(r[1]));
            out.add("# JOINED|2 all tables => " + sb);
        }
        try (SessionFactory sf = factory(D.Item.class, D.Book.class)) { out.add("# @Inheritance 없음 => tables=" + tables(tableMap(sf))); }
        try (SessionFactory sf = factory(JD.Item.class, JD.Book.class)) { out.add("# JOINED + @DiscriminatorColumn => tables=" + tables(tableMap(sf))); }
        String id;
        try (SessionFactory sf = factory(TI.Item.class, TI.Book.class)) { id = "started"; } catch (Throwable e) { Throwable r = e; while (r.getCause() != null && r.getCause() != r) r = r.getCause(); id = r.getClass().getSimpleName() + ":" + String.valueOf(r.getMessage()).replaceAll("\\s+", " "); }
        out.add("# TABLE_PER_CLASS + IDENTITY => " + id);
        Files.write(Path.of(args[0]), out, StandardCharsets.UTF_8);
        System.out.println(out.get(0) + " | " + out.stream().filter(x -> x.contains(" => ") && !x.startsWith("#")).count() + " combos");
    }
}

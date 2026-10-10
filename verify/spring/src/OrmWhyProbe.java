import jakarta.persistence.Entity;
import jakarta.persistence.EntityManager;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
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
import java.util.HashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import org.hibernate.SessionFactory;
import org.hibernate.cfg.Configuration;
import org.hibernate.resource.jdbc.spi.StatementInspector;

// "JPA가 푸는 문제" 실습의 모든 조합을 실제로 실행한다. 같은 일을 JDBC(SQL을 직접 씀)와 JPA(Hibernate)로 한다.
// 출력 한 줄: 해 볼 일|방식|빠진 코드를 직접 채웠는가 => 코드에 직접 쓴 SQL의 수|줄별로 나간 SQL(종류와 테이블)|결과|DB의 grade
public class OrmWhyProbe {
    // 실제로 DB에 나간 SQL (JDBC 쪽은 도우미 sql()이, JPA 쪽은 StatementInspector가 적는다)
    static final List<String> SENT = new ArrayList<>();
    // 애플리케이션 코드에 직접 적은 SQL 문장 (서로 다른 것만)
    static final Set<String> WRITTEN = new LinkedHashSet<>();
    static final Pattern TABLE = Pattern.compile("\\b(?:from|into|update)\\s+(\\w+)");
    static String kind(String sql) {
        String s = sql.toLowerCase(Locale.ROOT).trim();
        Matcher m = TABLE.matcher(s);
        return s.split("\\s+")[0] + (m.find() ? " " + m.group(1) : "");
    }
    public static class Capture implements StatementInspector {
        @Override public String inspect(String sql) { SENT.add(kind(sql)); return sql; }
    }
    static final List<String> TRACE = new ArrayList<>();
    interface Step { void run() throws Exception; }
    static void line(String key, Step r) throws Exception {
        int before = SENT.size();
        try { r.run(); } finally { TRACE.add(key + ":" + String.join(",", SENT.subList(before, SENT.size()))); }
    }

    // ───────── JDBC 쪽: 테이블의 행을 객체로 옮겨 담는 코드를 직접 쓴다 ─────────
    static class Member {
        Long id; String name; String grade;
        Long getId() { return id; } String getName() { return name; } String getGrade() { return grade; }
        void setId(Long v) { id = v; } void setName(String v) { name = v; } void setGrade(String v) { grade = v; }
    }
    static class Order {
        Long id; int amount; Member member;
        Member getMember() { return member; }
        void setId(Long v) { id = v; } void setAmount(int v) { amount = v; } void setMember(Member m) { member = m; }
    }
    static PreparedStatement sql(Connection conn, String text) throws SQLException { WRITTEN.add(text); SENT.add(kind(text)); return conn.prepareStatement(text); }

    // 주문 조회. cache: 한 번 읽은 객체를 보관해 다시 돌려주는 코드를 직접 넣음. withMember: 회원을 읽는 SQL을 직접 더 씀
    static class OrderDao {
        final Connection conn; final boolean cache, withMember; final Map<Long, Order> loaded = new HashMap<>();
        OrderDao(Connection conn, boolean cache, boolean withMember) { this.conn = conn; this.cache = cache; this.withMember = withMember; }
        Order findById(long id) throws SQLException {
            if (cache && loaded.containsKey(id)) return loaded.get(id);
            Order o = new Order(); long memberId;
            try (PreparedStatement ps = sql(conn, "select id, amount, member_id from orders where id = ?")) {
                ps.setLong(1, id);
                try (ResultSet rs = ps.executeQuery()) { rs.next(); o.setId(rs.getLong("id")); o.setAmount(rs.getInt("amount")); memberId = rs.getLong("member_id"); }
            }
            if (withMember) {
                try (PreparedStatement ps = sql(conn, "select id, name from member where id = ?")) {
                    ps.setLong(1, memberId);
                    try (ResultSet rs = ps.executeQuery()) { rs.next(); Member m = new Member(); m.setId(rs.getLong("id")); m.setName(rs.getString("name")); o.setMember(m); }
                }
            }
            if (cache) loaded.put(id, o);
            return o;
        }
    }
    // 회원 저장과 조회. withGrade가 false이면 grade 필드를 추가하기 전에 쓴 SQL 그대로다
    static class MemberDao {
        final Connection conn; final boolean withGrade;
        MemberDao(Connection conn, boolean withGrade) { this.conn = conn; this.withGrade = withGrade; }
        void save(Member m) throws SQLException {
            try (PreparedStatement ps = sql(conn, withGrade ? "insert into member (id, name, grade) values (?, ?, ?)" : "insert into member (id, name) values (?, ?)")) {
                ps.setLong(1, m.getId()); ps.setString(2, m.getName());
                if (withGrade) ps.setString(3, m.getGrade());
                ps.executeUpdate();
            }
        }
        Member findById(long id) throws SQLException {
            try (PreparedStatement ps = sql(conn, withGrade ? "select id, name, grade from member where id = ?" : "select id, name from member where id = ?")) {
                ps.setLong(1, id);
                try (ResultSet rs = ps.executeQuery()) {
                    rs.next(); Member m = new Member(); m.setId(rs.getLong("id")); m.setName(rs.getString("name"));
                    if (withGrade) m.setGrade(rs.getString("grade"));
                    return m;
                }
            }
        }
    }

    // ───────── JPA 쪽: 매핑만 적어 두고 SQL은 쓰지 않는다 ─────────
    @Entity(name = "Member") @Table(name = "member")
    public static class JMember {
        @Id Long id; String name;
        public JMember() { }
        public String getName() { return name; }
    }
    @Entity(name = "Order") @Table(name = "orders")
    public static class JOrder {
        @Id Long id; int amount;
        @ManyToOne(fetch = FetchType.LAZY) JMember member;
        public JOrder() { }
        public JMember getMember() { return member; }
    }
    // grade 필드를 추가한 뒤의 회원 엔티티
    @Entity(name = "MemberG") @Table(name = "member")
    public static class GMember {
        @Id Long id; String name; String grade;
        public GMember() { }
        public void setId(Long v) { id = v; } public void setName(String v) { name = v; } public void setGrade(String v) { grade = v; }
        public String getGrade() { return grade; }
    }

    static final String JDBC_URL = "jdbc:h2:mem:ormwhy_jdbc;DB_CLOSE_DELAY=-1";
    static String jpaUrl(boolean field) { return "jdbc:h2:mem:ormwhy_jpa" + (field ? "2" : "1") + ";DB_CLOSE_DELAY=-1"; }
    static void seed(String url) throws SQLException {
        try (Connection c = DriverManager.getConnection(url); Statement s = c.createStatement()) {
            s.executeUpdate("delete from orders"); s.executeUpdate("delete from member");
            s.executeUpdate("insert into member (id, name) values (1, '김철수')");
            s.executeUpdate("insert into orders (id, amount, member_id) values (1, 30000, 1)");
        }
    }
    static String gradeInDb(String url) throws SQLException {
        try (Connection c = DriverManager.getConnection(url); Statement s = c.createStatement(); ResultSet rs = s.executeQuery("select grade from member where id = 2")) { return rs.next() ? String.valueOf(rs.getString(1)) : "행 없음"; }
    }

    static String runJdbc(String sc, boolean fix) throws Exception {
        seed(JDBC_URL);
        SENT.clear(); WRITTEN.clear(); TRACE.clear();
        String[] res = { "" }; String db = "-";
        try (Connection conn = DriverManager.getConnection(JDBC_URL)) {
            if (sc.equals("same")) {
                OrderDao dao = new OrderDao(conn, fix, false);
                Order[] h = new Order[2];
                line("find1", () -> h[0] = dao.findById(1L));
                line("find2", () -> h[1] = dao.findById(1L));
                res[0] = String.valueOf(h[0] == h[1]);
            } else if (sc.equals("nav")) {
                OrderDao dao = new OrderDao(conn, false, fix);
                Order[] h = new Order[1];
                line("find", () -> h[0] = dao.findById(1L));
                try { line("name", () -> res[0] = h[0].getMember().getName()); } catch (NullPointerException e) { res[0] = "NullPointerException"; }
            } else {
                MemberDao dao = new MemberDao(conn, fix);
                Member m = new Member(); m.setId(2L); m.setName("이영희"); m.setGrade("VIP");
                line("save", () -> dao.save(m));
                line("read", () -> res[0] = String.valueOf(dao.findById(2L).getGrade()));
                db = gradeInDb(JDBC_URL);
            }
        }
        return WRITTEN.size() + "|" + String.join("; ", TRACE) + "|" + res[0] + "|" + db;
    }

    static String runJpa(SessionFactory sf, String sc) throws Exception {
        seed(jpaUrl(sc.equals("field")));
        SENT.clear(); WRITTEN.clear(); TRACE.clear();
        String[] res = { "" }; String db = "-";
        EntityManager em = sf.createEntityManager();
        em.getTransaction().begin();
        if (sc.equals("same")) {
            JOrder[] h = new JOrder[2];
            line("find1", () -> h[0] = em.find(JOrder.class, 1L));
            line("find2", () -> h[1] = em.find(JOrder.class, 1L));
            res[0] = String.valueOf(h[0] == h[1]);
            em.getTransaction().commit(); em.close();
        } else if (sc.equals("nav")) {
            JOrder[] h = new JOrder[1];
            line("find", () -> h[0] = em.find(JOrder.class, 1L));
            line("name", () -> res[0] = h[0].getMember().getName());
            em.getTransaction().commit(); em.close();
        } else {
            GMember m = new GMember(); m.setId(2L); m.setName("이영희"); m.setGrade("VIP");
            line("persist", () -> em.persist(m));
            line("commit", () -> em.getTransaction().commit());
            em.close();
            EntityManager em2 = sf.createEntityManager();   // 1차 캐시가 아니라 DB에서 다시 읽도록 새 em으로 조회
            line("read", () -> res[0] = String.valueOf(em2.find(GMember.class, 2L).getGrade()));
            em2.close();
            db = gradeInDb(jpaUrl(true));
        }
        return WRITTEN.size() + "|" + String.join("; ", TRACE) + "|" + res[0] + "|" + db;
    }

    static SessionFactory factory(boolean field) {
        Configuration cfg = new Configuration();
        if (field) cfg.addAnnotatedClass(GMember.class); else cfg.addAnnotatedClass(JMember.class).addAnnotatedClass(JOrder.class);
        cfg.setProperty("hibernate.connection.url", jpaUrl(field));
        cfg.setProperty("hibernate.hbm2ddl.auto", "create-drop");
        cfg.setProperty("hibernate.session_factory.statement_inspector", Capture.class.getName());
        return cfg.buildSessionFactory();
    }

    public static void main(String[] args) throws Exception {
        List<String> out = new ArrayList<>();
        out.add("# hibernate " + org.hibernate.Version.getVersionString());
        // JDBC 쪽 테이블은 SQL로 직접 만든다. grade 컬럼은 "필드 추가" 장면에서만 쓰인다
        try (Connection c = DriverManager.getConnection(JDBC_URL); Statement s = c.createStatement()) {
            s.executeUpdate("create table member (id bigint primary key, name varchar(255), grade varchar(255))");
            s.executeUpdate("create table orders (id bigint primary key, amount integer, member_id bigint)");
        }
        try (SessionFactory sf1 = factory(false); SessionFactory sf2 = factory(true)) {
            // JPA "필드 추가" 장면의 DB에도 orders 테이블을 만들어 둔다(seed가 두 테이블을 모두 쓴다)
            try (Connection c = DriverManager.getConnection(jpaUrl(true)); Statement s = c.createStatement()) { s.executeUpdate("create table orders (id bigint primary key, amount integer, member_id bigint)"); }
            for (String sc : new String[] { "same", "nav", "field" })
                for (String how : new String[] { "jdbc", "jpa" })
                    for (boolean fix : new boolean[] { false, true })
                        out.add(sc + "|" + how + "|" + fix + " => " + (how.equals("jdbc") ? runJdbc(sc, fix) : runJpa(sc.equals("field") ? sf2 : sf1, sc)));
        }
        Files.write(Path.of(args[0]), out, StandardCharsets.UTF_8);
        out.forEach(System.out::println);
    }
}

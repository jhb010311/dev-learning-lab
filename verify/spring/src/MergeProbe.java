import jakarta.persistence.Entity;
import jakarta.persistence.EntityManager;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.ResultSet;
import java.sql.Statement;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import org.hibernate.SessionFactory;
import org.hibernate.cfg.Configuration;
import org.hibernate.resource.jdbc.spi.StatementInspector;

// "준영속과 병합" 실습의 모든 조합을 실제 Hibernate + H2에서 실행한다.
// 출력 한 줄: 준영속 객체를 얻은 방법|반영 방법|merge 뒤에 한 일 => 줄별 SQL|contains(m)|돌려받은 객체가 m과 같은가|contains(돌려받은 객체)|DB의 행
public class MergeProbe {
    static final List<String> SQL = new ArrayList<>();
    public static class Capture implements StatementInspector {
        @Override public String inspect(String sql) { SQL.add(sql.toLowerCase(Locale.ROOT).trim().split("\\s+")[0]); return sql; }
    }
    @Entity(name = "Member") @Table(name = "member")
    public static class Member {
        @Id Long id; String name; String city;
        public Member() { }
        public void setId(Long id) { this.id = id; }
        public void setName(String n) { this.name = n; }
        public void setCity(String c) { this.city = c; }
        public String getName() { return name; }
        public String getCity() { return city; }
    }
    static final String URL = "jdbc:h2:mem:merge;DB_CLOSE_DELAY=-1";
    static final List<String> TRACE = new ArrayList<>();
    static void line(String key, Runnable r) {
        int before = SQL.size();
        r.run();
        TRACE.add(key + ":" + String.join(",", SQL.subList(before, SQL.size())));
    }
    // DB에 실제로 남은 행을 하이버네이트를 거치지 않고 JDBC로 직접 읽는다
    static String rows() throws Exception {
        try (Connection c = DriverManager.getConnection(URL); Statement s = c.createStatement(); ResultSet rs = s.executeQuery("select id, name, city from member order by id")) {
            List<String> r = new ArrayList<>();
            while (rs.next()) r.add(rs.getLong(1) + "=" + rs.getString(2) + "," + rs.getString(3));
            return String.join(";", r);
        }
    }
    static void reset() throws Exception {
        try (Connection c = DriverManager.getConnection(URL); Statement s = c.createStatement()) { s.executeUpdate("delete from member"); s.executeUpdate("insert into member (id, name, city) values (1, '김철수', '서울')"); }
        SQL.clear(); TRACE.clear();
    }
    // 준영속 객체를 얻는다. loaded: 앞선 em에서 조회한 뒤 그 em을 닫음. form: 화면에서 받은 값으로 새로 만듦(id와 name만 채움)
    static Member detached(SessionFactory sf, String src, long id) {
        Member[] h = new Member[1];
        if (src.equals("loaded")) {
            EntityManager em1 = sf.createEntityManager();
            line("find1", () -> h[0] = em1.find(Member.class, id));
            line("close1", em1::close);
        } else {
            line("new", () -> { h[0] = new Member(); h[0].setId(id); });
        }
        return h[0];
    }

    static String run(SessionFactory sf, String src, String how, String after) throws Exception {
        reset();
        Member m = detached(sf, src, 1L);
        line("set", () -> m.setName("김영수"));
        EntityManager em = sf.createEntityManager();
        em.getTransaction().begin();
        Member[] r = new Member[1];
        if (how.equals("merge")) {
            line("merge", () -> r[0] = em.merge(m));
            if (after.equals("arg")) line("setArg", () -> m.setCity("부산"));
            if (after.equals("ret")) line("setRet", () -> r[0].setCity("부산"));
        } else if (how.equals("dirty")) {
            line("find", () -> r[0] = em.find(Member.class, 1L));
            line("copy", () -> r[0].setName(m.getName()));
        }
        boolean cm = em.contains(m);
        String same = r[0] == null ? "-" : String.valueOf(r[0] == m), cr = r[0] == null ? "-" : String.valueOf(em.contains(r[0]));
        line("commit", () -> em.getTransaction().commit());
        em.close();
        return String.join(" ", TRACE) + "|" + cm + "|" + same + "|" + cr + "|" + rows();
    }

    public static void main(String[] args) throws Exception {
        Configuration cfg = new Configuration().addAnnotatedClass(Member.class);
        cfg.setProperty("hibernate.connection.url", URL);
        cfg.setProperty("hibernate.hbm2ddl.auto", "create-drop");
        cfg.setProperty("hibernate.session_factory.statement_inspector", Capture.class.getName());
        List<String> out = new ArrayList<>();
        out.add("# hibernate " + org.hibernate.Version.getVersionString());
        try (SessionFactory sf = cfg.buildSessionFactory()) {
            for (String src : new String[] { "form", "loaded" })
                for (String how : new String[] { "merge", "none", "dirty" })
                    for (String after : new String[] { "none", "arg", "ret" }) out.add(src + "|" + how + "|" + after + " => " + run(sf, src, how, after));
            // 모형의 조합은 아니지만 화면의 설명에 쓴 사실을 따로 확인한다
            // (1) DB에 없는 id를 가진 객체를 merge하면 SELECT로 없음을 확인한 뒤 INSERT한다
            {
                reset();
                Member m = detached(sf, "form", 9L);
                m.setName("새회원");
                EntityManager em = sf.createEntityManager();
                em.getTransaction().begin();
                line("merge", () -> em.merge(m));
                line("commit", () -> em.getTransaction().commit());
                em.close();
                out.add("extra|merge-new-id => " + String.join(" ", TRACE) + "|" + rows());
            }
            // (2) 조회했던 객체를 아무 값도 바꾸지 않고 merge하면 SELECT만 나가고 UPDATE는 없다
            {
                reset();
                Member m = detached(sf, "loaded", 1L);
                EntityManager em = sf.createEntityManager();
                em.getTransaction().begin();
                line("merge", () -> em.merge(m));
                line("commit", () -> em.getTransaction().commit());
                em.close();
                out.add("extra|merge-unchanged => " + String.join(" ", TRACE) + "|" + rows());
            }
            // (3) 같은 id의 엔티티가 이미 영속 상태로 있으면 merge는 SELECT를 보내지 않고 그 객체에 값을 덮어쓴다
            {
                reset();
                Member m = detached(sf, "form", 1L);
                m.setName("김영수");
                EntityManager em = sf.createEntityManager();
                em.getTransaction().begin();
                Member[] h = new Member[2];
                line("find", () -> h[0] = em.find(Member.class, 1L));
                line("merge", () -> h[1] = em.merge(m));
                line("commit", () -> em.getTransaction().commit());
                em.close();
                out.add("extra|merge-already-managed => " + String.join(" ", TRACE) + "|sameAsFound=" + (h[0] == h[1]) + "|" + rows());
            }
            // (5) m을 조회한 뒤에 DB의 city가 다른 곳에서 바뀌었어도, merge는 m이 가진 예전 값으로 덮어쓴다
            {
                reset();
                Member m = detached(sf, "loaded", 1L);
                try (Connection c = DriverManager.getConnection(URL); Statement s = c.createStatement()) { s.executeUpdate("update member set city = '대전' where id = 1"); }
                m.setName("김영수");
                EntityManager em = sf.createEntityManager();
                em.getTransaction().begin();
                line("merge", () -> em.merge(m));
                line("commit", () -> em.getTransaction().commit());
                em.close();
                out.add("extra|merge-stale => " + String.join(" ", TRACE) + "|" + rows());
            }
            // (4) 준영속 객체를 persist에 넘기면(직접 넣는 id, 이미 있는 행) 커밋 때 INSERT가 나가 기본 키가 겹쳐 실패한다
            {
                reset();
                Member m = detached(sf, "form", 1L);
                m.setName("김영수");
                EntityManager em = sf.createEntityManager();
                em.getTransaction().begin();
                String res;
                try { line("persist", () -> em.persist(m)); line("commit", () -> em.getTransaction().commit()); res = "ok"; }
                catch (RuntimeException e) { Throwable c = e; while (c.getCause() != null && !(c instanceof org.hibernate.exception.ConstraintViolationException)) c = c.getCause(); res = c.getClass().getSimpleName(); }
                em.close();
                out.add("extra|persist-detached => " + String.join(" ", TRACE) + "|" + res + "|sql=" + String.join(",", SQL) + "|" + rows());
            }
        }
        Files.write(Path.of(args[0]), out, StandardCharsets.UTF_8);
        out.forEach(System.out::println);
    }
}

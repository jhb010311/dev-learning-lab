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

// "엔티티의 생명주기" 실습의 모든 조합을 실제 Hibernate + H2에서 실행한다.
// 한 줄을 실행할 때마다 그 줄에서 나간 SQL의 종류를 적고, em.contains의 결과와 DB에 남은 행을 적는다.
// 출력 한 줄: 상태|이름을 바꾸는 때 => 줄별 SQL|contains|DB의 행
public class EntityLifeProbe {
    static final List<String> SQL = new ArrayList<>();
    public static class Capture implements StatementInspector {
        @Override public String inspect(String sql) { SQL.add(sql.toLowerCase(Locale.ROOT).trim().split("\\s+")[0]); return sql; }
    }
    @Entity(name = "Member") @Table(name = "member")
    public static class Member {
        @Id Long id; String name;
        public Member() { }
        public Member(Long id, String name) { this.id = id; this.name = name; }
        public void setName(String n) { this.name = n; }
        public String getName() { return name; }
    }
    static final String URL = "jdbc:h2:mem:entitylife;DB_CLOSE_DELAY=-1";
    // INSERT로 들어온 행의 값을 적어 두는 H2 트리거. persist 뒤에 값을 바꿨을 때 INSERT에 어떤 값이 실려 가는지 확인하는 데만 쓴다
    static final List<String> INSERTED = new ArrayList<>();
    public static class InsTrigger implements org.h2.api.Trigger {
        @Override public void fire(Connection conn, Object[] oldRow, Object[] newRow) { List<String> v = new ArrayList<>(); for (Object o : newRow) v.add(String.valueOf(o)); INSERTED.add(String.join(",", v)); }
    }

    // 한 줄을 실행하고 그 줄에서 나간 SQL을 적는다
    static final List<String> TRACE = new ArrayList<>();
    static void line(String key, Runnable r) {
        int before = SQL.size();
        r.run();
        TRACE.add(key + ":" + String.join(",", SQL.subList(before, SQL.size())));
    }
    // DB에 실제로 남은 행을 하이버네이트를 거치지 않고 JDBC로 직접 읽는다
    static String rows() throws Exception {
        try (Connection c = DriverManager.getConnection(URL); Statement s = c.createStatement(); ResultSet rs = s.executeQuery("select id, name from member order by id")) {
            List<String> r = new ArrayList<>();
            while (rs.next()) r.add(rs.getLong(1) + "=" + rs.getString(2));
            return String.join(";", r);
        }
    }
    static void reset() throws Exception {
        try (Connection c = DriverManager.getConnection(URL); Statement s = c.createStatement()) { s.executeUpdate("delete from member"); s.executeUpdate("insert into member (id, name) values (1, '김철수')"); }
        SQL.clear(); TRACE.clear();
    }

    static String run(SessionFactory sf, String st, String when) throws Exception {
        reset();
        boolean before = when.equals("before");
        EntityManager em = sf.createEntityManager();
        em.getTransaction().begin();
        Member[] h = new Member[1];
        String contains;
        Runnable setOld = () -> h[0].setName("김영수"), setNew = () -> h[0].setName("이수진");
        switch (st) {
            case "new" -> {
                line("new", () -> h[0] = new Member(2L, "이영희"));
                line("set", setNew);
            }
            case "persist" -> {
                line("new", () -> h[0] = new Member(2L, "이영희"));
                if (before) line("set", setNew);
                line("persist", () -> em.persist(h[0]));
                if (!before) line("set", setNew);
            }
            case "find" -> {
                line("find", () -> h[0] = em.find(Member.class, 1L));
                line("set", setOld);
            }
            case "detach", "clear", "remove" -> {
                line("find", () -> h[0] = em.find(Member.class, 1L));
                if (before && !st.equals("remove")) line("set", setOld);
                line(st, () -> { if (st.equals("detach")) em.detach(h[0]); else if (st.equals("clear")) em.clear(); else em.remove(h[0]); });
                if (!before || st.equals("remove")) line("set", setOld);
            }
            case "close" -> {
                line("find", () -> h[0] = em.find(Member.class, 1L));
                if (before) line("set", setOld);
                line("commit", () -> em.getTransaction().commit());
                line("close", em::close);
                if (!before) line("set", setOld);
            }
            default -> throw new IllegalArgumentException(st);
        }
        try { boolean[] b = new boolean[1]; line("contains", () -> b[0] = em.contains(h[0])); contains = String.valueOf(b[0]); }
        catch (RuntimeException e) { TRACE.add("contains:"); contains = e.getClass().getSimpleName(); }
        if (!st.equals("close")) { line("commit", () -> em.getTransaction().commit()); em.close(); }
        return String.join(" ", TRACE) + "|" + contains + "|" + rows();
    }

    public static void main(String[] args) throws Exception {
        Configuration cfg = new Configuration().addAnnotatedClass(Member.class);
        cfg.setProperty("hibernate.connection.url", URL);
        cfg.setProperty("hibernate.hbm2ddl.auto", "create-drop");
        cfg.setProperty("hibernate.session_factory.statement_inspector", Capture.class.getName());
        List<String> out = new ArrayList<>();
        out.add("# hibernate " + org.hibernate.Version.getVersionString());
        try (SessionFactory sf = cfg.buildSessionFactory()) {
            for (String st : new String[] { "new", "persist", "find", "detach", "clear", "close", "remove" })
                for (String when : new String[] { "after", "before" }) out.add(st + "|" + when + " => " + run(sf, st, when));
            // 모형의 조합은 아니지만 화면의 설명에 쓴 사실을 따로 확인한다
            // (1) 값을 바꾼 뒤 em.flush()를 부르고 나서 떼어 내면 UPDATE가 이미 나갔으므로 반영된다
            for (String how : new String[] { "detach", "clear" }) {
                reset();
                EntityManager em = sf.createEntityManager();
                em.getTransaction().begin();
                Member[] h = new Member[1];
                line("find", () -> h[0] = em.find(Member.class, 1L));
                line("set", () -> h[0].setName("김영수"));
                line("flush", em::flush);
                line(how, () -> { if (how.equals("detach")) em.detach(h[0]); else em.clear(); });
                line("commit", () -> em.getTransaction().commit());
                em.close();
                out.add("extra|flush-then-" + how + " => " + String.join(" ", TRACE) + "|" + rows());
            }
            // (2) 떼어 낸 뒤 같은 id를 다시 조회하면 SELECT가 다시 나가고, 떼어 낸 객체와는 다른 객체가 온다
            for (String how : new String[] { "detach", "clear" }) {
                reset();
                EntityManager em = sf.createEntityManager();
                em.getTransaction().begin();
                Member[] h = new Member[2];
                line("find", () -> h[0] = em.find(Member.class, 1L));
                line(how, () -> { if (how.equals("detach")) em.detach(h[0]); else em.clear(); });
                line("find", () -> h[1] = em.find(Member.class, 1L));
                em.getTransaction().commit();
                em.close();
                out.add("extra|" + how + "-then-find => " + String.join(" ", TRACE) + "|same=" + (h[0] == h[1]));
            }
            // (3) remove한 객체를 커밋 전에 다시 persist하면 삭제가 취소된다
            {
                reset();
                EntityManager em = sf.createEntityManager();
                em.getTransaction().begin();
                Member[] h = new Member[1];
                boolean[] c = new boolean[1];
                line("find", () -> h[0] = em.find(Member.class, 1L));
                line("remove", () -> em.remove(h[0]));
                line("persist", () -> em.persist(h[0]));
                line("contains", () -> c[0] = em.contains(h[0]));
                line("commit", () -> em.getTransaction().commit());
                em.close();
                out.add("extra|remove-then-persist => " + String.join(" ", TRACE) + "|" + c[0] + "|" + rows());
            }
            // (5) persist 뒤에 이름을 바꾸면 INSERT에는 persist할 때의 값이 실려 가고, 바뀐 값은 UPDATE로 간다
            {
                reset();
                try (Connection c = DriverManager.getConnection(URL); Statement st = c.createStatement()) { st.executeUpdate("create trigger ins_watch after insert on member for each row call \"EntityLifeProbe$InsTrigger\""); }
                INSERTED.clear();
                EntityManager em = sf.createEntityManager();
                em.getTransaction().begin();
                Member m = new Member(2L, "이영희");
                em.persist(m);
                m.setName("이수진");
                em.getTransaction().commit();
                em.close();
                try (Connection c = DriverManager.getConnection(URL); Statement st = c.createStatement()) { st.executeUpdate("drop trigger ins_watch"); }
                out.add("extra|persist-then-set-insert-values => inserted=" + String.join(";", INSERTED) + "|" + rows());
            }
            // (4) remove한 뒤에도 자바 객체는 그대로 남아 값을 읽을 수 있다
            {
                reset();
                EntityManager em = sf.createEntityManager();
                em.getTransaction().begin();
                Member m = em.find(Member.class, 1L);
                em.remove(m);
                em.getTransaction().commit();
                em.close();
                out.add("extra|object-after-remove => name=" + m.getName() + "|" + rows());
            }
        }
        Files.write(Path.of(args[0]), out, StandardCharsets.UTF_8);
        out.forEach(System.out::println);
    }
}

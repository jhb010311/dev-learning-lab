import jakarta.persistence.Entity;
import jakarta.persistence.EntityGraph;
import jakarta.persistence.EntityManager;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.persistence.TypedQuery;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import org.hibernate.SessionFactory;
import org.hibernate.cfg.Configuration;
import org.hibernate.resource.jdbc.spi.StatementInspector;

// "N+1" 실습의 조합을 실제 Hibernate + H2에서 실행해, 실제로 나간 SQL을 세어 적는다.
// @EntityGraph는 스프링 데이터가 내부에서 쓰는 것과 같은 JPA 엔티티 그래프 힌트(jakarta.persistence.fetchgraph)로 실행한다.
public class NPlusOneProbe {
    static final List<String> SQL = new ArrayList<>();
    public static class Capture implements StatementInspector {
        @Override public String inspect(String sql) { SQL.add(sql); return sql; }
    }

    @Entity(name = "Member") @Table(name = "member_t")
    public static class Member {
        @Id Long id; String name;
        public Member() { }
        public Member(Long id, String name) { this.id = id; this.name = name; }
        public String getName() { return name; }
    }
    @Entity(name = "OrderLazy") @Table(name = "orders_t")
    public static class OrderLazy {
        @Id Long id; int amount;
        @ManyToOne(fetch = FetchType.LAZY) Member member;
        public OrderLazy() { }
        public OrderLazy(Long id, Member m) { this.id = id; this.amount = 1000; this.member = m; }
        public Member getMember() { return member; }
        public int getAmount() { return amount; }
    }
    @Entity(name = "OrderEager") @Table(name = "orders_t")
    public static class OrderEager {
        @Id Long id; int amount;
        @ManyToOne(fetch = FetchType.EAGER) Member member;
        public OrderEager() { }
        public OrderEager(Long id, Member m) { this.id = id; this.amount = 1000; this.member = m; }
        public Member getMember() { return member; }
        public int getAmount() { return amount; }
    }

    static SessionFactory factory(boolean eager, int batch, String db) {
        Configuration cfg = new Configuration();
        cfg.addAnnotatedClass(Member.class).addAnnotatedClass(eager ? OrderEager.class : OrderLazy.class);
        cfg.setProperty("hibernate.connection.url", "jdbc:h2:mem:" + db + ";DB_CLOSE_DELAY=-1");
        cfg.setProperty("hibernate.hbm2ddl.auto", "create-drop");
        cfg.setProperty("hibernate.session_factory.statement_inspector", Capture.class.getName());
        if (batch > 0) cfg.setProperty("hibernate.default_batch_fetch_size", String.valueOf(batch));
        return cfg.buildSessionFactory();
    }

    static final Pattern FROM = Pattern.compile("\\bfrom\\s+(\\w+)");
    static String run(SessionFactory sf, String st, int n, int m, boolean use) {
        boolean eager = st.equals("eager");
        try (EntityManager em = sf.createEntityManager()) {
            em.getTransaction().begin();
            em.createQuery("delete from " + (eager ? "OrderEager" : "OrderLazy")).executeUpdate();
            em.createQuery("delete from Member").executeUpdate();
            List<Member> ms = new ArrayList<>();
            for (long i = 1; i <= m; i++) { Member mm = new Member(i, "회원" + i); em.persist(mm); ms.add(mm); }
            for (long i = 1; i <= n; i++) em.persist(eager ? new OrderEager(i, ms.get((int) ((i - 1) % m))) : new OrderLazy(i, ms.get((int) ((i - 1) % m))));
            em.getTransaction().commit();
        }
        SQL.clear();
        int names = 0;
        try (EntityManager em = sf.createEntityManager()) {
            em.getTransaction().begin();   // 반복문은 트랜잭션(영속성 컨텍스트)이 열려 있는 동안 실행된다
            if (eager) {
                List<OrderEager> orders = em.createQuery("select o from OrderEager o", OrderEager.class).getResultList();
                for (OrderEager o : orders) { if (use) { o.getMember().getName(); names++; } else o.getAmount(); }
            } else {
                String jpql = st.equals("fetch") ? "select o from OrderLazy o join fetch o.member" : "select o from OrderLazy o";
                TypedQuery<OrderLazy> q = em.createQuery(jpql, OrderLazy.class);
                if (st.equals("graph")) { EntityGraph<OrderLazy> g = em.createEntityGraph(OrderLazy.class); g.addAttributeNodes("member"); q.setHint("jakarta.persistence.fetchgraph", g); }
                List<OrderLazy> orders = q.getResultList();
                for (OrderLazy o : orders) { if (use) { o.getMember().getName(); names++; } else o.getAmount(); }
            }
            em.getTransaction().commit();
        }
        int orderQ = 0, memberQ = 0;
        for (String s : SQL) { Matcher mt = FROM.matcher(s.toLowerCase(Locale.ROOT)); if (!mt.find()) continue; if (mt.group(1).startsWith("orders_t")) orderQ++; else if (mt.group(1).startsWith("member_t")) memberQ++; }
        return SQL.size() + "|" + orderQ + "|" + memberQ;
    }

    public static void main(String[] args) throws Exception {
        List<String> out = new ArrayList<>();
        out.add("# hibernate " + org.hibernate.Version.getVersionString());
        int[] ns = { 1, 10, 30 }, mAll = { 1, 3, 10, 30 }, batches = { 2, 5, 20 };
        int db = 0;
        for (String st : new String[] { "lazy", "eager", "fetch", "graph", "batch" }) {
            int[] bss = st.equals("batch") ? batches : new int[] { 0 };
            for (int bs : bss) {
                try (SessionFactory sf = factory(st.equals("eager"), bs, "np" + (db++))) {
                    for (int n : ns) for (int m : mAll) { if (m > n) continue; for (boolean use : new boolean[] { false, true }) out.add(st + "|" + bs + "|" + n + "|" + m + "|" + use + " => " + run(sf, st, n, m, use)); }
                }
            }
        }
        Files.write(Path.of(args[0]), out, StandardCharsets.UTF_8);
        System.out.println(out.get(0) + " | " + (out.size() - 1) + " combos");
    }
}

import jakarta.persistence.Entity;
import jakarta.persistence.EntityManager;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import org.hibernate.Hibernate;
import org.hibernate.SessionFactory;
import org.hibernate.cfg.Configuration;
import org.hibernate.proxy.HibernateProxy;
import org.hibernate.resource.jdbc.spi.StatementInspector;

// "프록시와 지연 로딩" 실습의 20가지 조합(객체를 얻는 방법 5 x 그 객체로 하는 일 4)을 실제 Hibernate + H2에서 실행한다.
// 조합마다 얻은 객체가 프록시인지, 회원 테이블 조회 SQL이 언제 몇 번 나갔는지, 결과 값이나 예외가 무엇인지 적는다.
public class LazyProxyProbe {
    static final List<String> SQL = new ArrayList<>();
    public static class Capture implements StatementInspector {
        @Override public String inspect(String sql) { SQL.add(sql.toLowerCase(Locale.ROOT)); return sql; }
    }

    @Entity(name = "Member") @Table(name = "member")
    public static class Member {
        @Id Long id; String name;
        public Member() { }
        public Member(Long id, String name) { this.id = id; this.name = name; }
        public Long getId() { return id; }
        public String getName() { return name; }
    }
    @Entity(name = "Order") @Table(name = "orders")
    public static class Order {
        @Id Long id;
        @ManyToOne(fetch = FetchType.LAZY) Member member;
        public Order() { }
        public Order(Long id, Member m) { this.id = id; this.member = m; }
        public Member getMember() { return member; }
    }

    static SessionFactory factory() {
        Configuration cfg = new Configuration().addAnnotatedClass(Member.class).addAnnotatedClass(Order.class);
        cfg.setProperty("hibernate.connection.url", "jdbc:h2:mem:lazyproxy;DB_CLOSE_DELAY=-1");
        cfg.setProperty("hibernate.hbm2ddl.auto", "create-drop");
        cfg.setProperty("hibernate.session_factory.statement_inspector", Capture.class.getName());
        return cfg.buildSessionFactory();
    }
    static long memberSelects() { return SQL.stream().filter(s -> s.startsWith("select") && s.matches("(?s).*\\bfrom\\s+member\\b.*")).count(); }
    static long orderSelects() { return SQL.stream().filter(s -> s.startsWith("select") && s.matches("(?s).*\\bfrom\\s+orders\\b.*")).count(); }

    static String run(SessionFactory sf, String how, String use) {
        SQL.clear();
        EntityManager em = sf.createEntityManager();
        em.getTransaction().begin();
        Member m, other = null;
        switch (how) {
            case "ref": m = em.getReference(Member.class, 1L); break;
            case "lazy": { Order o = em.find(Order.class, 1L); m = o.getMember(); break; }
            case "find": m = em.find(Member.class, 1L); break;
            case "findref": other = em.find(Member.class, 1L); m = em.getReference(Member.class, 1L); break;
            default: other = em.getReference(Member.class, 1L); m = em.find(Member.class, 1L); break;   // reffind
        }
        long selAtGet = memberSelects();
        boolean proxy = m instanceof HibernateProxy, initAtGet = Hibernate.isInitialized(m);
        String same = other == null ? "-" : String.valueOf(other == m);
        String result, ex = "none";
        try {
            switch (use) {
                case "id": result = String.valueOf(m.getId()); break;
                case "name": result = m.getName(); break;
                case "cls": result = (m.getClass() == Member.class) + "," + (m instanceof Member); break;
                default:                                        // closed: 영속성 컨텍스트를 닫은 뒤에 이름을 읽는다
                    em.getTransaction().commit(); em.close();
                    result = m.getName();
            }
        } catch (Exception e) { result = "-"; ex = e.getClass().getSimpleName(); }
        long selAtUse = memberSelects() - selAtGet;
        boolean initAfter = Hibernate.isInitialized(m);
        if (em.isOpen()) { em.getTransaction().commit(); em.close(); }
        return "proxy=" + proxy + "|same=" + same + "|selAtGet=" + selAtGet + "|initAtGet=" + initAtGet + "|selAtUse=" + selAtUse + "|initAfter=" + initAfter + "|result=" + result + "|ex=" + ex + "|orderSel=" + orderSelects();
    }

    public static void main(String[] args) throws Exception {
        List<String> out = new ArrayList<>();
        out.add("# hibernate " + org.hibernate.Version.getVersionString());
        try (SessionFactory sf = factory()) {
            try (EntityManager em = sf.createEntityManager()) {
                em.getTransaction().begin();
                Member m = new Member(1L, "김철수"); em.persist(m); em.persist(new Order(1L, m));
                em.getTransaction().commit();
            }
            for (String how : new String[] { "ref", "lazy", "find", "findref", "reffind" })
                for (String use : new String[] { "id", "name", "cls", "closed" }) out.add(how + "|" + use + " => " + run(sf, how, use));

            // 참고로 적어 두는 것들 (모형의 결과 표에는 쓰지 않고 설명 글의 근거로 쓴다)
            try (EntityManager em = sf.createEntityManager()) {
                Member ref = em.getReference(Member.class, 1L);
                String cn = ref.getClass().getName();
                String shortName = cn.replace("LazyProxyProbe$", "");          // 바깥 클래스 이름은 뗀다
                int at = shortName.indexOf("HibernateProxy");
                out.add("# extra className=" + (at < 0 ? shortName : shortName.substring(0, at + "HibernateProxy".length())) + " hasTail=" + (at >= 0 && shortName.length() > at + "HibernateProxy".length()));
                out.add("# extra superclassIsMember=" + (ref.getClass().getSuperclass() == Member.class));
                SQL.clear();
                String direct = ref.name;                       // 게터를 거치지 않고 필드를 직접 읽는다
                out.add("# extra directFieldOnProxy=" + direct + " sql=" + SQL.size() + " initialized=" + Hibernate.isInitialized(ref));
                SQL.clear();
                Class<?> lazyCls = Hibernate.getClassLazy(ref);
                out.add("# extra Hibernate.getClassLazy=" + lazyCls.getSimpleName() + " sql=" + SQL.size() + " initialized=" + Hibernate.isInitialized(ref));
                Object real = Hibernate.unproxy(ref);
                out.add("# extra Hibernate.unproxy class=" + real.getClass().getSimpleName() + " sql=" + SQL.size() + " sameAsProxy=" + (real == ref));
            }
            // 없는 식별자로 getReference를 하면 언제 예외가 나는가
            try (EntityManager em = sf.createEntityManager()) {
                SQL.clear();
                Member ghost = em.getReference(Member.class, 999L);
                String atGet = "sql=" + SQL.size(), ex = "none";
                try { ghost.getName(); } catch (Exception e) { ex = e.getClass().getSimpleName(); }
                out.add("# extra getReference(없는 id) atGet " + atGet + " getName ex=" + ex + " sql=" + SQL.size());
            }
            // 영속성 컨텍스트를 닫은 뒤 프록시의 getId()는 되는가
            {
                EntityManager em = sf.createEntityManager();
                Member ref = em.getReference(Member.class, 1L);
                em.close();
                String ex = "none", v = "-";
                try { v = String.valueOf(ref.getId()); } catch (Exception e) { ex = e.getClass().getSimpleName(); }
                out.add("# extra closed then getId=" + v + " ex=" + ex);
            }
        }
        Files.write(Path.of(args[0]), out, StandardCharsets.UTF_8);
        System.out.println(out.get(0) + " | " + out.stream().filter(l -> !l.startsWith("#")).count() + " combos");
    }
}

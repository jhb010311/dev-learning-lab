import jakarta.persistence.Entity;
import jakarta.persistence.EntityManager;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.SequenceGenerator;
import jakarta.persistence.Table;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import org.hibernate.SessionFactory;
import org.hibernate.cfg.Configuration;
import org.hibernate.resource.jdbc.spi.StatementInspector;

// "영속성 컨텍스트" 실습의 여섯 장면을 실제 Hibernate + H2에서 실행해, SQL이 몇 건 나갔고 쓰기 SQL이 언제 나갔는지 적는다.
public class PcProbe {
    static final List<String> SQL = new ArrayList<>();
    public static class Capture implements StatementInspector {
        @Override public String inspect(String sql) { SQL.add(sql.toLowerCase(Locale.ROOT)); return sql; }
    }
    @Entity(name = "MemberI") @Table(name = "member_i")
    public static class MemberI {
        @Id @GeneratedValue(strategy = GenerationType.IDENTITY) Long id; String name;
        public MemberI() { }
        public MemberI(String name) { this.name = name; }
        public void setName(String n) { this.name = n; }
        public String getName() { return name; }
    }
    @Entity(name = "MemberS") @Table(name = "member_s")
    public static class MemberS {
        // 모형은 "persist마다 시퀀스를 한 번 조회"로 단순화했으므로 allocationSize를 1로 맞춘다(기본값은 50)
        @Id @GeneratedValue(strategy = GenerationType.SEQUENCE, generator = "ms") @SequenceGenerator(name = "ms", sequenceName = "member_seq", allocationSize = 1) Long id; String name;
        public MemberS() { }
        public MemberS(String name) { this.name = name; }
    }
    static SessionFactory factory(Class<?> c, String db) {
        Configuration cfg = new Configuration().addAnnotatedClass(c);
        cfg.setProperty("hibernate.connection.url", "jdbc:h2:mem:" + db + ";DB_CLOSE_DELAY=-1");
        cfg.setProperty("hibernate.hbm2ddl.auto", "create-drop");
        cfg.setProperty("hibernate.session_factory.statement_inspector", Capture.class.getName());
        return cfg.buildSessionFactory();
    }
    static long count(String kind) { return SQL.stream().filter(s -> s.startsWith(kind)).count(); }
    static Long seed(SessionFactory sf) {
        try (EntityManager em = sf.createEntityManager()) { em.getTransaction().begin(); MemberI m = new MemberI("김철수"); em.persist(m); em.getTransaction().commit(); SQL.clear(); return m.id; }
    }
    static String nameInDb(SessionFactory sf, Long id) {
        int before = SQL.size();
        try (EntityManager em = sf.createEntityManager()) { String n = em.find(MemberI.class, id).getName(); while (SQL.size() > before) SQL.remove(SQL.size() - 1); return n; }
    }

    public static void main(String[] args) throws Exception {
        List<String> out = new ArrayList<>();
        out.add("# hibernate " + org.hibernate.Version.getVersionString());
        try (SessionFactory sf = factory(MemberI.class, "pc1")) {
            // 같은 회원을 두 번 조회
            Long id = seed(sf);
            try (EntityManager em = sf.createEntityManager()) {
                em.getTransaction().begin();
                MemberI a = em.find(MemberI.class, id), b = em.find(MemberI.class, id);
                em.getTransaction().commit();
                out.add("find2 => sql=" + SQL.size() + "|select=" + count("select") + "|same=" + (a == b));
            }
            // 조회한 뒤 이름만 바꿈, 트랜잭션 있음
            id = seed(sf);
            try (EntityManager em = sf.createEntityManager()) {
                em.getTransaction().begin();
                MemberI m = em.find(MemberI.class, id);
                m.setName("김영수");
                long updBefore = count("update");
                em.getTransaction().commit();
                out.add("update|tx => sql=" + SQL.size() + "|updateBeforeCommit=" + updBefore + "|updateAfterCommit=" + count("update") + "|db=" + nameInDb(sf, id));
            }
            // 조회한 뒤 이름만 바꿈, 트랜잭션 없음: 조회만 자체 트랜잭션으로 끝나고, 그 뒤의 변경에는 커밋 시점이 없다
            id = seed(sf);
            try (EntityManager em = sf.createEntityManager()) {
                em.getTransaction().begin();
                MemberI m = em.find(MemberI.class, id);
                em.getTransaction().commit();
                m.setName("김영수");
                out.add("update|notx => sql=" + SQL.size() + "|update=" + count("update") + "|db=" + nameInDb(sf, id));
            }
            // 이름을 바꾼 뒤 JPQL로 조회
            id = seed(sf);
            try (EntityManager em = sf.createEntityManager()) {
                em.getTransaction().begin();
                MemberI m = em.find(MemberI.class, id);
                m.setName("김영수");
                long updBeforeQuery = count("update");
                em.createQuery("select m from MemberI m", MemberI.class).getResultList();
                int updAt = -1, lastSelect = -1;
                for (int i = 0; i < SQL.size(); i++) { if (SQL.get(i).startsWith("update")) updAt = i; if (SQL.get(i).startsWith("select")) lastSelect = i; }
                long sqlBeforeCommit = SQL.size();
                em.getTransaction().commit();
                out.add("jpql => sql=" + SQL.size() + "|sqlBeforeCommit=" + sqlBeforeCommit + "|updateBeforeQueryCall=" + updBeforeQuery + "|updateIndex=" + updAt + "|jpqlSelectIndex=" + lastSelect + "|db=" + nameInDb(sf, id));
            }
            // 새 회원 3명 저장, IDENTITY
            SQL.clear();
            try (EntityManager em = sf.createEntityManager()) {
                em.getTransaction().begin();
                StringBuilder per = new StringBuilder();
                for (String n : new String[] { "회원A", "회원B", "회원C" }) { em.persist(new MemberI(n)); per.append(count("insert")).append(','); }
                long before = count("insert");
                em.getTransaction().commit();
                out.add("persist|IDENTITY => sql=" + SQL.size() + "|insertsAfterEachPersist=" + per + "|insertBeforeCommit=" + before + "|insertTotal=" + count("insert"));
            }
        }
        try (SessionFactory sf = factory(MemberS.class, "pc2")) {
            SQL.clear();
            try (EntityManager em = sf.createEntityManager()) {
                em.getTransaction().begin();
                for (String n : new String[] { "회원A", "회원B", "회원C" }) em.persist(new MemberS(n));
                long before = count("insert"), seqBefore = SQL.size();
                em.getTransaction().commit();
                out.add("persist|SEQUENCE => sql=" + SQL.size() + "|sequenceCallsBeforeCommit=" + seqBefore + "|insertBeforeCommit=" + before + "|insertTotal=" + count("insert"));
            }
        }
        Files.write(Path.of(args[0]), out, StandardCharsets.UTF_8);
        out.forEach(System.out::println);
    }
}

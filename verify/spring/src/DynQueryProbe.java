import jakarta.persistence.Entity;
import jakarta.persistence.EntityManager;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.TypedQuery;
import jakarta.persistence.criteria.CriteriaBuilder;
import jakarta.persistence.criteria.CriteriaQuery;
import jakarta.persistence.criteria.Predicate;
import jakarta.persistence.criteria.Root;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import org.hibernate.SessionFactory;
import org.hibernate.cfg.Configuration;
import org.hibernate.resource.jdbc.spi.StatementInspector;

// "동적 쿼리와 Querydsl" 실습의 조합을 실제 Hibernate + H2에서 실행한다.
// 문자열을 이어 붙이는 세 가지 방식과 JPA Criteria API 방식으로, 검색 조건(이름, 나이)이 있고 없는 네 경우를 모두 돌려
// 조립된 JPQL, 실행 결과(성공 또는 예외), DB로 나간 SQL, 조회된 회원 수를 적는다. Querydsl은 이 PC에 라이브러리가 없어 실행하지 않는다.
public class DynQueryProbe {
    static final List<String> SQL = new ArrayList<>();
    static int NCONDS = 0;   // Criteria 방식에서 where에 넘긴 조건 객체의 수
    public static class Capture implements StatementInspector {
        @Override public String inspect(String sql) { SQL.add(sql.toLowerCase(Locale.ROOT)); return sql; }
    }

    @Entity(name = "Member") @Table(name = "member")
    public static class Member {
        @Id Long id; String name; int age;
        public Member() { }
        public Member(Long id, String name, int age) { this.id = id; this.name = name; this.age = age; }
    }

    // 방식 1: where를 항상 붙여 놓고 조건을 이어 붙인다
    static String fixed(String name, Integer age) {
        String jpql = "select m from Member m where";
        if (name != null) jpql += " m.name = :name";
        if (age != null) jpql += " and m.age >= :age";
        return jpql;
    }
    // 방식 2: 첫 조건인지에 따라 where와 and를 고르지만, 앞의 띄어쓰기를 빠뜨렸다
    static String nospace(String name, Integer age) {
        String jpql = "select m from Member m";
        boolean first = true;
        if (name != null) { jpql += (first ? "where" : "and") + " m.name = :name"; first = false; }
        if (age != null) { jpql += (first ? "where" : "and") + " m.age >= :age"; first = false; }
        return jpql;
    }
    // 방식 3: 조건을 목록에 모은 뒤 " and "로 잇는다
    static String join(String name, Integer age) {
        List<String> conds = new ArrayList<>();
        if (name != null) conds.add("m.name = :name");
        if (age != null) conds.add("m.age >= :age");
        String jpql = "select m from Member m";
        if (!conds.isEmpty()) jpql += " where " + String.join(" and ", conds);
        return jpql;
    }
    static List<Member> runString(EntityManager em, String jpql, String name, Integer age) {
        TypedQuery<Member> q = em.createQuery(jpql, Member.class);
        if (name != null) q.setParameter("name", name);
        if (age != null) q.setParameter("age", age);
        return q.getResultList();
    }
    // 방식 4: JPA Criteria API. 조건을 문자열이 아니라 객체(Predicate)로 모은다
    static List<Member> runCriteria(EntityManager em, String name, Integer age) {
        CriteriaBuilder cb = em.getCriteriaBuilder();
        CriteriaQuery<Member> cq = cb.createQuery(Member.class);
        Root<Member> m = cq.from(Member.class);
        List<Predicate> conds = new ArrayList<>();
        if (name != null) conds.add(cb.equal(m.get("name"), name));
        if (age != null) conds.add(cb.greaterThanOrEqualTo(m.get("age"), age));
        NCONDS = conds.size();
        cq.select(m).where(conds.toArray(new Predicate[0]));
        return em.createQuery(cq).getResultList();
    }

    public static void main(String[] args) throws Exception {
        List<String> out = new ArrayList<>();
        out.add("# hibernate " + org.hibernate.Version.getVersionString());
        Configuration cfg = new Configuration().addAnnotatedClass(Member.class);
        cfg.setProperty("hibernate.connection.url", "jdbc:h2:mem:dynquery;DB_CLOSE_DELAY=-1");
        cfg.setProperty("hibernate.hbm2ddl.auto", "create-drop");
        cfg.setProperty("hibernate.session_factory.statement_inspector", Capture.class.getName());
        try (SessionFactory sf = cfg.buildSessionFactory()) {
            try (EntityManager em = sf.createEntityManager()) {
                em.getTransaction().begin();
                String[] names = { "김철수", "김철수", "이영희", "박민수", "김영수", "최지우", "이철민" };
                int[] ages = { 30, 17, 25, 41, 22, 19, 35 };
                for (int i = 0; i < names.length; i++) em.persist(new Member((long) i + 1, names[i], ages[i]));
                em.getTransaction().commit();
            }
            for (String how : new String[] { "fixed", "nospace", "join", "criteria" })
                for (boolean useName : new boolean[] { false, true })
                    for (boolean useAge : new boolean[] { false, true }) {
                        String name = useName ? "김철수" : null;
                        Integer age = useAge ? 20 : null;
                        String jpql = how.equals("fixed") ? fixed(name, age) : how.equals("nospace") ? nospace(name, age) : how.equals("join") ? join(name, age) : "";
                        SQL.clear();
                        String result, ex = "", cause = "", msg = "", rows = "";
                        try (EntityManager em = sf.createEntityManager()) {
                            List<Member> list = how.equals("criteria") ? runCriteria(em, name, age) : runString(em, jpql, name, age);
                            result = "OK"; rows = String.valueOf(list.size());
                        } catch (Throwable e) {
                            result = "ERR"; ex = e.getClass().getSimpleName();
                            Throwable r = e; while (r.getCause() != null) r = r.getCause();
                            cause = r.getClass().getName();
                            msg = String.valueOf(e.getMessage()).replace("\r", "").replace("\n", "\\n");
                        }
                        out.add(how + "|" + useName + "|" + useAge + " => jpql=" + jpql + "|result=" + result + "|ex=" + ex + "|cause=" + cause + "|rows=" + rows + "|nconds=" + (how.equals("criteria") ? NCONDS : 0) + "|nsql=" + SQL.size() + "|sql=" + String.join(" ;; ", SQL) + "|msg=" + msg);
                    }
            // 덧붙임: Criteria에서 프로퍼티 이름을 틀리면 컴파일이 아니라 실행 중에 예외가 나는지
            try (EntityManager em = sf.createEntityManager()) {
                CriteriaBuilder cb = em.getCriteriaBuilder();
                CriteriaQuery<Member> cq = cb.createQuery(Member.class);
                Root<Member> m = cq.from(Member.class);
                cq.select(m).where(cb.equal(m.get("nmae"), "김철수"));
                out.add("extra|criteriaTypo => OK rows=" + em.createQuery(cq).getResultList().size());
            } catch (Throwable e) { out.add("extra|criteriaTypo => ERR " + e.getClass().getSimpleName() + ": " + String.valueOf(e.getMessage()).replace('\n', ' ')); }
        }
        Files.write(Path.of(args[0]), out, StandardCharsets.UTF_8);
        System.out.println(out.get(0) + " | " + (out.size() - 1) + " combos");
    }
}

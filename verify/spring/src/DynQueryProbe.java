package dynquery;

import com.querydsl.core.types.dsl.BooleanExpression;
import com.querydsl.jpa.impl.JPAQueryFactory;
import jakarta.persistence.Entity;
import jakarta.persistence.EntityManager;
import jakarta.persistence.EntityManagerFactory;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.TypedQuery;
import jakarta.persistence.criteria.CriteriaBuilder;
import jakarta.persistence.criteria.CriteriaQuery;
import jakarta.persistence.criteria.Predicate;
import jakarta.persistence.criteria.Root;
import java.lang.reflect.InvocationTargetException;
import java.lang.reflect.Proxy;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.TreeMap;
import java.util.function.Supplier;
import javax.sql.DataSource;
import org.springframework.beans.factory.config.BeanPostProcessor;
import org.springframework.boot.Banner;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.SpringBootConfiguration;
import org.springframework.boot.SpringBootVersion;
import org.springframework.boot.WebApplicationType;
import org.springframework.boot.autoconfigure.EnableAutoConfiguration;
import org.springframework.context.ConfigurableApplicationContext;
import org.springframework.context.annotation.Bean;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.jdbc.core.JdbcTemplate;

// "동적 쿼리" 실습의 조합을 실제 스프링 부트(자동 설정) + 스프링 데이터 JPA + Hibernate + H2 + Querydsl(5.1.0 jakarta)로 실행한다.
// 방식 네 가지(스프링 데이터 JPA Specification, JPA Criteria API, Querydsl, 문자열 직접 이어 붙이기) ×
// 이름 칸(입력 안 함 / 김철수 / 따옴표가 섞인 글자) × 나이 칸(입력 안 함 / 20)을 모두 돌려,
// 성공 여부(또는 예외), DB로 나간 SQL과 바인딩된 값, 조회된 회원 수를 적는다.
// DB로 나간 SQL은 DataSource를 감싸 실행 순간에 잡는다(DataJpaProbe와 같은 방법).
// Q클래스(QMember)는 컴파일할 때 querydsl-apt(JPAAnnotationProcessor)가 Member 엔티티를 보고 만든다.
// 클래스들을 dynquery 패키지에 둔 이유: 자동 설정은 설정 클래스가 있는 패키지에서 엔티티와 리포지토리를 찾는다.
// 옛 프로브(문자열 방식 세 가지 + Criteria, 기본 패키지)의 결과는 dynquery_probe.out.txt에 그대로 있다.

@Entity
@Table(name = "member")
class Member {
    @Id Long id;
    String name;
    int age;
    protected Member() { }
    Member(Long id, String name, int age) { this.id = id; this.name = name; this.age = age; }
}

// 화면의 리포지토리와 같다. 구현 클래스는 스프링 데이터 JPA가 만든다
interface MemberRepository extends JpaRepository<Member, Long>, JpaSpecificationExecutor<Member> { }

public class DynQueryProbe {
    static final List<String> SQL = new ArrayList<>();
    static final List<String> PARAMS = new ArrayList<>();
    static int NCONDS = 0;   // Criteria 방식에서 where에 넘긴 조건 객체의 수

    static Object wrap(Object target, Class<?> itf, String sql) {
        TreeMap<Integer, Object> params = new TreeMap<>();
        return Proxy.newProxyInstance(DynQueryProbe.class.getClassLoader(), new Class<?>[] { itf }, (p, m, a) -> {
            Object r;
            try { r = m.invoke(target, a); } catch (InvocationTargetException e) { throw e.getCause(); }
            String n = m.getName();
            if (itf == DataSource.class && n.equals("getConnection")) return wrap(r, Connection.class, null);
            if (itf == Connection.class && n.equals("prepareStatement")) return wrap(r, PreparedStatement.class, (String) a[0]);
            if (itf == PreparedStatement.class) {
                if (n.startsWith("set") && a != null && a.length >= 2 && a[0] instanceof Integer i && !n.equals("setNull")) params.put(i, a[1]);
                if (n.startsWith("execute")) { SQL.add(sql.toLowerCase(Locale.ROOT)); PARAMS.add(params.values().toString()); params.clear(); }
            }
            return r;
        });
    }

    @SpringBootConfiguration
    @EnableAutoConfiguration
    public static class App {
        @Bean static BeanPostProcessor sqlCapture() {
            return new BeanPostProcessor() {
                @Override public Object postProcessAfterInitialization(Object bean, String name) { return bean instanceof DataSource ? wrap(bean, DataSource.class, null) : bean; }
            };
        }
    }

    // ── 방식 1: 스프링 데이터 JPA Specification (화면 코드와 같은 구조) ──
    static Specification<Member> nameEq(String name) {
        return (root, query, cb) -> name == null ? null : cb.equal(root.get("name"), name);
    }
    static Specification<Member> ageGoe(Integer age) {
        return (root, query, cb) -> age == null ? null : cb.greaterThanOrEqualTo(root.get("age"), age);
    }
    static List<Member> spec(MemberRepository memberRepository, String name, Integer age) {
        Specification<Member> spec = Specification.where(nameEq(name))
                .and(ageGoe(age));
        return memberRepository.findAll(spec);
    }

    // ── 방식 2: JPA Criteria API ──
    static List<Member> criteria(EntityManager em, String name, Integer age) {
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

    // ── 방식 3: Querydsl ──
    static BooleanExpression qNameEq(String name) { return name == null ? null : QMember.member.name.eq(name); }
    static BooleanExpression qAgeGoe(Integer age) { return age == null ? null : QMember.member.age.goe(age); }
    static List<Member> querydsl(JPAQueryFactory queryFactory, String name, Integer age) {
        QMember m = QMember.member;
        return queryFactory
                .selectFrom(m)
                .where(qNameEq(name), qAgeGoe(age))
                .fetch();
    }

    // ── 방식 4: 문자열을 직접 이어 붙인다(값까지 문자열에 넣음) ──
    static String concat(String name, Integer age) {
        String jpql = "select m from Member m where";
        if (name != null) jpql += " m.name = '" + name + "'";
        if (age != null) jpql += " and m.age >= " + age;
        return jpql;
    }

    static void reset(JdbcTemplate jdbc) {
        jdbc.execute("delete from member");
        String[] names = { "김철수", "김철수", "이영희", "박민수", "김영수", "최지우", "이철민" };
        int[] ages = { 30, 17, 25, 41, 22, 19, 35 };
        for (int i = 0; i < names.length; i++) jdbc.update("insert into member (id, name, age) values (?, ?, ?)", i + 1, names[i], ages[i]);
        SQL.clear(); PARAMS.clear();
    }
    static String sqls() {
        StringBuilder b = new StringBuilder();
        for (int i = 0; i < SQL.size(); i++) b.append(i == 0 ? "" : " ;; ").append(SQL.get(i)).append(" ").append(PARAMS.get(i));
        return b.toString();
    }
    static String err(Throwable e) {
        Throwable r = e; while (r.getCause() != null) r = r.getCause();
        return "ERR|ex=" + e.getClass().getSimpleName() + "|cause=" + r.getClass().getName() + "|msg=" + String.valueOf(e.getMessage()).replace("\r", "").replace("\n", "\\n");
    }
    static String tryRun(Supplier<String> body) { try { return body.get(); } catch (Throwable e) { return err(e); } }

    public static void main(String[] args) throws Exception {
        List<String> out = new ArrayList<>();
        SpringApplication app = new SpringApplication(App.class);
        app.setWebApplicationType(WebApplicationType.NONE);
        app.setBannerMode(Banner.Mode.OFF);
        app.setLogStartupInfo(false);
        try (ConfigurableApplicationContext ctx = app.run("--logging.level.root=OFF",
                "--spring.datasource.url=jdbc:h2:mem:dynquery;DB_CLOSE_DELAY=-1",
                "--spring.jpa.hibernate.ddl-auto=create-drop")) {
            out.add("# spring boot " + SpringBootVersion.getVersion() + " | spring data jpa " + JpaRepository.class.getPackage().getImplementationVersion()
                    + " | hibernate " + org.hibernate.Version.getVersionString() + " | querydsl " + JPAQueryFactory.class.getProtectionDomain().getCodeSource().getLocation().getPath().replaceAll(".*/", ""));
            MemberRepository repo = ctx.getBean(MemberRepository.class);
            EntityManagerFactory emf = ctx.getBean(EntityManagerFactory.class);
            JdbcTemplate jdbc = ctx.getBean(JdbcTemplate.class);
            String quote = "' or '1'='1";
            for (String how : new String[] { "spec", "criteria", "querydsl", "concat" })
                for (String nameKey : new String[] { "none", "kim", "quote" })
                    for (boolean useAge : new boolean[] { false, true }) {
                        String name = nameKey.equals("none") ? null : nameKey.equals("kim") ? "김철수" : quote;
                        Integer age = useAge ? 20 : null;
                        reset(jdbc);
                        String jpql = how.equals("concat") ? concat(name, age) : "";
                        String res;
                        try (EntityManager em = emf.createEntityManager()) {
                            res = tryRun(() -> {
                                List<Member> list = switch (how) {
                                    case "spec" -> spec(repo, name, age);
                                    case "criteria" -> criteria(em, name, age);
                                    case "querydsl" -> querydsl(new JPAQueryFactory(em), name, age);
                                    default -> em.createQuery(jpql, Member.class).getResultList();
                                };
                                return "OK|rows=" + list.size();
                            });
                        }
                        out.add(how + "|" + nameKey + "|" + useAge + " => jpql=" + jpql + "|nconds=" + (how.equals("criteria") ? NCONDS : 0) + "|nsql=" + SQL.size() + "|sql=" + sqls() + "|result=" + res);
                    }

            // 덧붙임 1: 스프링 데이터 JPA 4.x에서 null인 Specification을 where/and에 넘기면
            out.add("extra|specWhereNull => " + tryRun(() -> { Specification<Member> s = Specification.where((Specification<Member>) null); return "OK " + s; }));
            out.add("extra|specAndNull => " + tryRun(() -> { Specification<Member> s = Specification.where(nameEq("김철수")).and((Specification<Member>) null); return "OK " + s; }));
            // 덧붙임 2: Criteria에서 프로퍼티 이름을 틀리면 컴파일이 아니라 실행 중에 예외가 나는지
            try (EntityManager em = emf.createEntityManager()) {
                out.add("extra|criteriaTypo => " + tryRun(() -> {
                    CriteriaBuilder cb = em.getCriteriaBuilder();
                    CriteriaQuery<Member> cq = cb.createQuery(Member.class);
                    Root<Member> m = cq.from(Member.class);
                    cq.select(m).where(cb.equal(m.get("nmae"), "김철수"));
                    return "OK rows=" + em.createQuery(cq).getResultList().size();
                }));
            }
            // 덧붙임 3: 문자열이라도 조건을 목록에 모아 " and "로 잇고 값은 :name 자리로 바인딩하면 여섯 조합이 다 되는지
            for (String nameKey : new String[] { "none", "kim", "quote" })
                for (boolean useAge : new boolean[] { false, true }) {
                    String name = nameKey.equals("none") ? null : nameKey.equals("kim") ? "김철수" : quote;
                    Integer age = useAge ? 20 : null;
                    reset(jdbc);
                    List<String> conds = new ArrayList<>();
                    if (name != null) conds.add("m.name = :name");
                    if (age != null) conds.add("m.age >= :age");
                    String jpql = "select m from Member m";
                    if (!conds.isEmpty()) jpql += " where " + String.join(" and ", conds);
                    String q = jpql;
                    try (EntityManager em = emf.createEntityManager()) {
                        String r = tryRun(() -> {
                            TypedQuery<Member> tq = em.createQuery(q, Member.class);
                            if (name != null) tq.setParameter("name", name);
                            if (age != null) tq.setParameter("age", age);
                            return "OK|rows=" + tq.getResultList().size();
                        });
                        out.add("extra|join|" + nameKey + "|" + useAge + " => jpql=" + q + "|sql=" + sqls() + "|result=" + r);
                    }
                }
        }
        Files.write(Path.of(args[0]), out, StandardCharsets.UTF_8);
        System.out.println(out.get(0) + " | " + (out.size() - 1) + " lines");
    }
}

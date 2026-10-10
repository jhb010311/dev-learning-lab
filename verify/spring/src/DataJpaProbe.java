package datajpa;

import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.Transient;
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
import org.springframework.aop.framework.AopProxyUtils;
import org.springframework.aop.support.AopUtils;
import org.springframework.beans.factory.config.BeanPostProcessor;
import org.springframework.boot.Banner;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.SpringBootConfiguration;
import org.springframework.boot.SpringBootVersion;
import org.springframework.boot.WebApplicationType;
import org.springframework.boot.autoconfigure.EnableAutoConfiguration;
import org.springframework.context.ConfigurableApplicationContext;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.ComponentScan;
import org.springframework.context.annotation.FilterType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Persistable;
import org.springframework.data.domain.Slice;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.config.EnableJpaRepositories;
import org.springframework.jdbc.core.JdbcTemplate;

// "스프링 데이터 JPA" 실습의 모든 장면을 실제 스프링 부트(자동 설정) + 스프링 데이터 JPA + Hibernate + H2로 실행한다.
// DB로 나간 SQL은 DataSource를 감싸서 실행 순간에 잡고, 바인딩된 값(예: 몇 건을 요청했는지)도 함께 적는다.
// 클래스들을 datajpa 패키지에 둔 이유: 자동 설정은 설정 클래스가 있는 패키지에서 엔티티와 리포지토리를 찾는다(기본 패키지면 클래스패스 전체를 뒤진다).

// 회원. id는 DB가 정한다(IDENTITY)
@Entity
@Table(name = "member")
class Member {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) Long id;
    String name;
    int age;
    protected Member() { }
    Member(String name, int age) { this.name = name; this.age = age; }
    Member(Long id, String name, int age) { this.id = id; this.name = name; this.age = age; }
    Long getId() { return id; }
    String getName() { return name; }
}

// 쿠폰. id(code)를 코드에서 직접 정한다(@GeneratedValue 없음)
@Entity
@Table(name = "coupon")
class Coupon {
    @Id String code;
    String title;
    protected Coupon() { }
    Coupon(String code, String title) { this.code = code; this.title = title; }
}

// 구현 클래스는 어디에도 없다. 인터페이스만 선언한다
interface MemberRepository extends JpaRepository<Member, Long> {
    List<Member> findByName(String name);
    List<Member> findByNameAndAgeGreaterThan(String name, int age);
    List<Member> findByNameContainingOrderByAgeDesc(String part);
    long countByAgeGreaterThan(int age);
    Slice<Member> findSliceBy(Pageable pageable);
}

interface CouponRepository extends JpaRepository<Coupon, String> { }

// 덧붙임 확인용: id를 직접 정하지만, 새 엔티티인지를 스스로 알려 주는 엔티티
@Entity
@Table(name = "pass")
class Pass implements Persistable<String> {
    @Id String code;
    String title;
    @Transient boolean fresh = false;
    protected Pass() { }
    Pass(String code, String title) { this.code = code; this.title = title; this.fresh = true; }
    @Override public String getId() { return code; }
    @Override public boolean isNew() { return fresh; }
}

interface PassRepository extends JpaRepository<Pass, String> { }

public class DataJpaProbe {
    // 실행된 SQL과 바인딩된 값
    static final List<String> SQL = new ArrayList<>();
    static final List<String> PARAMS = new ArrayList<>();

    // DataSource → Connection → PreparedStatement를 감싸, execute가 불리는 순간의 SQL과 값을 적는다
    static Object wrap(Object target, Class<?> itf, String sql) {
        TreeMap<Integer, Object> params = new TreeMap<>();
        return Proxy.newProxyInstance(DataJpaProbe.class.getClassLoader(), new Class<?>[] { itf }, (p, m, a) -> {
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

    // 정상적인 애플리케이션: 자동 설정이 DataSource, EntityManagerFactory, 트랜잭션 매니저를 만들고 리포지토리 인터페이스를 찾는다
    @SpringBootConfiguration
    @EnableAutoConfiguration
    public static class App {
        @Bean static BeanPostProcessor sqlCapture() {
            return new BeanPostProcessor() {
                @Override public Object postProcessAfterInitialization(Object bean, String name) { return bean instanceof DataSource ? wrap(bean, DataSource.class, null) : bean; }
            };
        }
    }

    // 잘못된 메서드 이름을 가진 리포지토리. 다른 클래스 안에 있어서 자동 설정은 찾지 않고, 아래 설정에서 하나씩 지정해 띄운다
    public static class Bad {
        public interface NicknameRepository extends JpaRepository<Member, Long> { List<Member> findByNickname(String nickname); }
        public interface TypoRepository extends JpaRepository<Member, Long> { List<Member> findByAgeGreaterThen(int age); }
    }
    @SpringBootConfiguration
    @EnableAutoConfiguration
    @EnableJpaRepositories(considerNestedRepositories = true, includeFilters = @ComponentScan.Filter(type = FilterType.ASSIGNABLE_TYPE, classes = Bad.NicknameRepository.class))
    public static class AppNickname { }
    @SpringBootConfiguration
    @EnableAutoConfiguration
    @EnableJpaRepositories(considerNestedRepositories = true, includeFilters = @ComponentScan.Filter(type = FilterType.ASSIGNABLE_TYPE, classes = Bad.TypoRepository.class))
    public static class AppTypo { }

    static ConfigurableApplicationContext boot(Class<?> config, String db) {
        SpringApplication app = new SpringApplication(config);
        app.setWebApplicationType(WebApplicationType.NONE);
        app.setBannerMode(Banner.Mode.OFF);
        app.setLogStartupInfo(false);
        return app.run("--logging.level.root=OFF",
            "--spring.datasource.url=jdbc:h2:mem:datajpa_" + db + ";DB_CLOSE_DELAY=-1",
            "--spring.jpa.hibernate.ddl-auto=create-drop");
    }

    // 회원 7명과 쿠폰 1장을 다시 넣는다(조합마다 같은 상태에서 시작)
    static void reset(JdbcTemplate jdbc) {
        jdbc.execute("delete from member");
        jdbc.execute("alter table member alter column id restart with 1");
        String[] names = { "김철수", "김철수", "이영희", "박민수", "김영수", "최지우", "이철민" };
        int[] ages = { 30, 17, 25, 41, 22, 19, 35 };
        for (int i = 0; i < names.length; i++) jdbc.update("insert into member (name, age) values (?, ?)", names[i], ages[i]);
        jdbc.execute("delete from pass");
        jdbc.execute("delete from coupon");
        jdbc.update("insert into coupon (code, title) values (?, ?)", "WELCOME", "가입 축하");
        SQL.clear(); PARAMS.clear();
    }
    static String sqls() {
        StringBuilder b = new StringBuilder();
        for (int i = 0; i < SQL.size(); i++) b.append(i == 0 ? "" : " ;; ").append(SQL.get(i)).append(" ").append(PARAMS.get(i));
        return b.toString();
    }
    static String root(Throwable e) { Throwable r = e; while (r.getCause() != null) r = r.getCause(); return r.getClass().getSimpleName() + "|msg=" + r.getMessage(); }
    static String call(Supplier<String> body) { try { return body.get(); } catch (Throwable e) { return "ret=예외:" + e.getClass().getSimpleName() + "/" + root(e).replace('|', '/'); } }

    public static void main(String[] args) throws Exception {
        List<String> out = new ArrayList<>();
        out.add("# spring boot " + SpringBootVersion.getVersion() + " | spring data jpa " + JpaRepository.class.getPackage().getImplementationVersion() + " | hibernate " + org.hibernate.Version.getVersionString());

        try (ConfigurableApplicationContext ctx = boot(App.class, "ok")) {
            MemberRepository repo = ctx.getBean(MemberRepository.class);
            CouponRepository coupons = ctx.getBean(CouponRepository.class);
            PassRepository passes = ctx.getBean(PassRepository.class);
            JdbcTemplate jdbc = ctx.getBean(JdbcTemplate.class);
            // 인터페이스의 구현이 무엇인지
            out.add("extra|impl => jdkProxy=" + AopUtils.isJdkDynamicProxy(repo) + "|target=" + AopProxyUtils.getSingletonTarget(repo).getClass().getSimpleName());

            // 1. 메서드 이름으로 조회
            reset(jdbc); out.add("name|findByName => boot=성공|rows=" + repo.findByName("김철수").size() + "|order=|sql=" + sqls());
            reset(jdbc); out.add("name|findByNameAndAgeGreaterThan => boot=성공|rows=" + repo.findByNameAndAgeGreaterThan("김철수", 20).size() + "|order=|sql=" + sqls());
            reset(jdbc); { List<Member> r = repo.findByNameContainingOrderByAgeDesc("철"); StringBuilder o = new StringBuilder(); for (Member m : r) o.append(m.age).append(' '); out.add("name|findByNameContainingOrderByAgeDesc => boot=성공|rows=" + r.size() + "|order=" + o.toString().trim() + "|sql=" + sqls()); }
            reset(jdbc); out.add("name|countByAgeGreaterThan => boot=성공|rows=" + repo.countByAgeGreaterThan(20) + "|order=|sql=" + sqls());

            // 2. Pageable로 페이지 요청 (한 페이지 3건, id 순)
            for (int pg = 0; pg <= 3; pg++) {
                reset(jdbc);
                Page<Member> page = repo.findAll(PageRequest.of(pg, 3, Sort.by("id")));
                out.add("page|page|" + pg + " => boot=성공|content=" + page.getContent().size() + "|total=" + page.getTotalElements() + "|totalPages=" + page.getTotalPages() + "|hasNext=" + page.hasNext() + "|sql=" + sqls());
            }
            for (int pg = 0; pg <= 3; pg++) {
                reset(jdbc);
                Slice<Member> slice = repo.findSliceBy(PageRequest.of(pg, 3, Sort.by("id")));
                out.add("page|slice|" + pg + " => boot=성공|content=" + slice.getContent().size() + "|total=|totalPages=|hasNext=" + slice.hasNext() + "|sql=" + sqls());
            }

            // 3. save(). 바깥에 트랜잭션이 없으므로 save 자신의 트랜잭션이 끝날 때 쓰기 SQL이 나간다
            reset(jdbc); out.add("save|new => boot=성공|" + call(() -> { Member in = new Member("박새로", 20); Member m = repo.save(in); return "ret=same:" + (m == in) + ",id:" + m.getId(); }) + "|db=" + jdbc.queryForObject("select count(*) from member", Integer.class) + "|sql=" + sqls());
            reset(jdbc); out.add("save|change => boot=성공|" + call(() -> { Member in = new Member(1L, "김영수", 30); Member m = repo.save(in); return "ret=same:" + (m == in); }) + "|db=" + jdbc.queryForObject("select name from member where id = 1", String.class) + "|sql=" + sqls());
            reset(jdbc); out.add("save|same => boot=성공|" + call(() -> { Member in = new Member(1L, "김철수", 30); Member m = repo.save(in); return "ret=same:" + (m == in); }) + "|db=" + jdbc.queryForObject("select name from member where id = 1", String.class) + "|sql=" + sqls());
            reset(jdbc); out.add("save|gone => boot=성공|" + call(() -> { Member in = new Member(999L, "없는회원", 30); Member m = repo.save(in); return "ret=same:" + (m == in); }) + "|db=" + jdbc.queryForObject("select count(*) from member", Integer.class) + "|sql=" + sqls());
            reset(jdbc); out.add("save|assigned => boot=성공|" + call(() -> { Coupon in = new Coupon("SUMMER", "여름 할인"); Coupon c = coupons.save(in); return "ret=same:" + (c == in); }) + "|db=" + jdbc.queryForObject("select count(*) from coupon", Integer.class) + "|sql=" + sqls());
            // 덧붙임: id를 직접 정하는 엔티티가 Persistable로 "새 엔티티"라고 알려 주면 SELECT 없이 INSERT만 나가는지
            reset(jdbc); out.add("extra|persistable => " + call(() -> { Pass in = new Pass("DAY1", "일일권"); Pass p = passes.save(in); return "ret=same:" + (p == in); }) + "|db=" + jdbc.queryForObject("select count(*) from pass", Integer.class) + "|sql=" + sqls());
        }

        // 4. 엔티티에 없는 프로퍼티 이름을 쓴 리포지토리: 애플리케이션이 뜨는지
        for (Object[] bad : new Object[][] { { "findByNickname", AppNickname.class }, { "findByAgeGreaterThen", AppTypo.class } }) {
            SQL.clear(); PARAMS.clear();
            String r;
            try (ConfigurableApplicationContext ctx = boot((Class<?>) bad[1], (String) bad[0])) { r = "boot=성공"; }
            catch (Throwable e) { r = "boot=실패|error=" + root(e); }
            out.add("name|" + bad[0] + " => " + r + "|sql=" + sqls());
        }
        Files.write(Path.of(args[0]), out, StandardCharsets.UTF_8);
        System.out.println(out.get(0) + " | " + (out.size() - 1) + " lines");
    }
}

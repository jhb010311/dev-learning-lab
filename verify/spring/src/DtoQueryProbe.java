package dtoquery;

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
import org.hibernate.Session;
import org.hibernate.SessionFactory;
import org.hibernate.cfg.Configuration;
import org.hibernate.resource.jdbc.spi.StatementInspector;

// "DTO로 바로 조회하기" 실습의 열두 가지 조합을 실제 Hibernate + H2에서 실행한다.
// 조합마다 나간 SELECT의 수, 첫 SELECT의 컬럼 수, 영속성 컨텍스트가 관리하는 엔티티 수, 값을 바꾼 뒤 커밋할 때 나간 UPDATE의 수를 적는다.
// JPQL의 new에는 패키지 이름까지 적어야 하므로, 클래스들을 dtoquery 패키지에 두었다.

@Entity(name = "Team") @Table(name = "team")
class Team {
    @Id Long id; String name; String region;
    protected Team() { }
    Team(Long id, String name, String region) { this.id = id; this.name = name; this.region = region; }
    String getName() { return name; }
}

@Entity(name = "Member") @Table(name = "member")
class Member {
    @Id Long id; String name; int age; String email; String city;
    @ManyToOne(fetch = FetchType.LAZY) Team team;
    protected Member() { }
    Member(Long id, String name, int age, String email, String city, Team team) { this.id = id; this.name = name; this.age = age; this.email = email; this.city = city; this.team = team; }
    String getName() { return name; }
    int getAge() { return age; }
    Team getTeam() { return team; }
    void setName(String name) { this.name = name; }
}

// 화면에 내보낼 값만 담는 객체. 엔티티가 아니다(@Entity 없음)
class MemberDto {
    private String name; private final int age; private final String teamName;
    public MemberDto(String name, int age) { this(name, age, null); }
    public MemberDto(String name, int age, String teamName) { this.name = name; this.age = age; this.teamName = teamName; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
}

public class DtoQueryProbe {
    static final List<String> SQL = new ArrayList<>();
    public static class Capture implements StatementInspector {
        @Override public String inspect(String sql) { SQL.add(sql.toLowerCase(Locale.ROOT)); return sql; }
    }
    static long count(String kind) { return SQL.stream().filter(s -> s.startsWith(kind)).count(); }
    static void seed(SessionFactory sf) {
        try (EntityManager em = sf.createEntityManager()) {
            em.getTransaction().begin();
            em.createQuery("delete from Member").executeUpdate();
            em.createQuery("delete from Team").executeUpdate();
            Team dev = new Team(1L, "개발팀", "서울"), ops = new Team(2L, "운영팀", "부산");
            em.persist(dev); em.persist(ops);
            em.persist(new Member(1L, "김철수", 30, "kim@example.com", "서울", dev));
            em.persist(new Member(2L, "이영희", 25, "lee@example.com", "서울", dev));
            em.persist(new Member(3L, "박민수", 41, "park@example.com", "부산", ops));
            em.persist(new Member(4L, "최지우", 19, "choi@example.com", "부산", ops));
            em.getTransaction().commit();
        }
        SQL.clear();
    }
    // select와 from 사이의 컬럼 수
    static int columns(String sql) { String list = sql.substring("select ".length(), sql.indexOf(" from ")); return list.split(",").length; }
    static String tables(String sql) {
        java.util.regex.Matcher m = java.util.regex.Pattern.compile("\\b(?:from|join)\\s+(\\w+)").matcher(sql);
        List<String> t = new ArrayList<>(); while (m.find()) t.add(m.group(1)); return String.join("+", t);
    }

    static String run(SessionFactory sf, String how, boolean team, boolean mod) {
        seed(sf);
        int managed; long updBefore; String jpql;
        try (EntityManager em = sf.createEntityManager()) {
            em.getTransaction().begin();
            if (how.equals("dto")) {
                jpql = team ? "select new dtoquery.MemberDto(m.name, m.age, t.name) from Member m join m.team t"
                            : "select new dtoquery.MemberDto(m.name, m.age) from Member m";
                List<MemberDto> dtos = em.createQuery(jpql, MemberDto.class).getResultList();
                if (mod) dtos.get(0).setName("김영수");
            } else {
                jpql = how.equals("fetch") ? "select m from Member m join fetch m.team" : "select m from Member m";
                List<Member> members = em.createQuery(jpql, Member.class).getResultList();
                List<MemberDto> dtos = new ArrayList<>();
                for (Member m : members) dtos.add(team ? new MemberDto(m.getName(), m.getAge(), m.getTeam().getName()) : new MemberDto(m.getName(), m.getAge()));
                if (mod) members.get(0).setName("김영수");
            }
            managed = em.unwrap(Session.class).getStatistics().getEntityCount();
            updBefore = count("update");
            em.getTransaction().commit();
        }
        long selects = count("select"), updates = count("update");
        String first = SQL.get(0);
        StringBuilder later = new StringBuilder();
        for (int i = 1; i < SQL.size(); i++) if (SQL.get(i).startsWith("select")) later.append(later.length() == 0 ? "" : ",").append(tables(SQL.get(i)));
        String db;
        try (EntityManager em = sf.createEntityManager()) { db = em.createQuery("select m.name from Member m where m.id = 1", String.class).getSingleResult(); }
        return "selects=" + selects + "|columns=" + columns(first) + "|tables=" + tables(first) + "|later=" + later + "|managed=" + managed + "|updatesBeforeCommit=" + updBefore + "|updates=" + updates + "|db=" + db + "|sql=" + first;
    }

    public static void main(String[] args) throws Exception {
        List<String> out = new ArrayList<>();
        out.add("# hibernate " + org.hibernate.Version.getVersionString());
        Configuration cfg = new Configuration().addAnnotatedClass(Team.class).addAnnotatedClass(Member.class);
        cfg.setProperty("hibernate.connection.url", "jdbc:h2:mem:dtoquery;DB_CLOSE_DELAY=-1");
        cfg.setProperty("hibernate.hbm2ddl.auto", "create-drop");
        cfg.setProperty("hibernate.session_factory.statement_inspector", Capture.class.getName());
        try (SessionFactory sf = cfg.buildSessionFactory()) {
            for (String how : new String[] { "entity", "fetch", "dto" })
                for (boolean team : new boolean[] { false, true })
                    for (boolean mod : new boolean[] { false, true })
                        out.add(how + "|" + team + "|" + mod + " => " + run(sf, how, team, mod));
            // 덧붙임: new 뒤에 패키지 이름을 빼고 클래스 이름만 적으면 어떻게 되는지
            seed(sf);
            try (EntityManager em = sf.createEntityManager()) {
                int n = em.createQuery("select new MemberDto(m.name, m.age) from Member m", MemberDto.class).getResultList().size();
                out.add("extra|unqualifiedTyped => OK rows=" + n);
            } catch (Throwable e) {
                Throwable r = e; while (r.getCause() != null) r = r.getCause();
                out.add("extra|unqualifiedTyped => ERR " + e.getClass().getSimpleName() + "/" + r.getClass().getSimpleName() + ": " + String.valueOf(r.getMessage()).replace("\n", " "));
            }
            // 덧붙임: 결과 타입도 넘기지 않고 클래스 이름만 적으면
            try (EntityManager em = sf.createEntityManager()) {
                int n = em.createQuery("select new MemberDto(m.name, m.age) from Member m").getResultList().size();
                out.add("extra|unqualifiedUntyped => OK rows=" + n);
            } catch (Throwable e) {
                Throwable r = e; while (r.getCause() != null) r = r.getCause();
                out.add("extra|unqualifiedUntyped => ERR " + e.getClass().getSimpleName() + "/" + r.getClass().getSimpleName() + ": " + String.valueOf(r.getMessage()).replace("\n", " "));
            }
        }
        Files.write(Path.of(args[0]), out, StandardCharsets.UTF_8);
        System.out.println(out.get(0) + " | " + (out.size() - 1) + " lines");
    }
}

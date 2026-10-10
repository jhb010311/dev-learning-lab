import jakarta.persistence.Entity;
import jakarta.persistence.EntityManager;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToMany;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.TreeMap;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import org.hibernate.SessionFactory;
import org.hibernate.cfg.Configuration;
import org.hibernate.resource.jdbc.spi.StatementInspector;

// "연관관계의 주인" 실습의 열두 가지 조합을 실제 Hibernate + H2에서 실행한다.
// 조합마다 만들어진 테이블과 컬럼, 나간 SQL(종류와 테이블별 횟수), DB의 member.team_id, 연결 테이블의 행 수, team.getMembers().size()를 적는다.
public class OwnerProbe {
    static final List<String> SQL = new ArrayList<>();
    static boolean on = true;
    public static class Capture implements StatementInspector {
        @Override public String inspect(String sql) { if (on) SQL.add(sql.toLowerCase(Locale.ROOT)); return sql; }
    }

    // mappedBy가 있는 양방향: Member.team이 주인, Team.members는 읽기만 하는 쪽
    public static class With {
        @Entity(name = "Team")
        public static class Team {
            @Id @GeneratedValue(strategy = GenerationType.IDENTITY) Long id; String name;
            @OneToMany(mappedBy = "team") List<Member> members = new ArrayList<>();
            public Team() { }
            public Team(String name) { this.name = name; }
            public Long getId() { return id; }
            public List<Member> getMembers() { return members; }
        }
        @Entity(name = "Member")
        public static class Member {
            @Id @GeneratedValue(strategy = GenerationType.IDENTITY) Long id; String name;
            @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "team_id") Team team;
            public Member() { }
            public Member(String name) { this.name = name; }
            public void setTeam(Team team) { this.team = team; }
        }
        static String run(SessionFactory sf, String set, boolean clear) {
            try (EntityManager em = sf.createEntityManager()) {
                em.getTransaction().begin();
                Team team = new Team("개발팀");
                em.persist(team);
                Member member = new Member("김철수");
                if (!set.equals("inverse")) member.setTeam(team);
                if (!set.equals("owner")) team.getMembers().add(member);
                em.persist(member);
                String afterPersist = sql();          // persist 두 번이 끝난 시점까지 나간 SQL
                if (clear) { em.flush(); em.clear(); }
                Team found = em.find(Team.class, team.getId());
                int size = found.getMembers().size();
                boolean same = found == team;
                String beforeCommit = sql();          // 커밋 직전까지 나간 SQL
                em.getTransaction().commit();
                return "size=" + size + "|sameObject=" + same + "|sqlAfterPersist=" + afterPersist + "|sqlBeforeCommit=" + beforeCommit;
            }
        }
    }
    // mappedBy를 빠뜨린 경우: Team.members가 따로 주인이 되어 연결 테이블을 쓴다
    public static class Without {
        @Entity(name = "Team")
        public static class Team {
            @Id @GeneratedValue(strategy = GenerationType.IDENTITY) Long id; String name;
            @OneToMany List<Member> members = new ArrayList<>();
            public Team() { }
            public Team(String name) { this.name = name; }
            public Long getId() { return id; }
            public List<Member> getMembers() { return members; }
        }
        @Entity(name = "Member")
        public static class Member {
            @Id @GeneratedValue(strategy = GenerationType.IDENTITY) Long id; String name;
            @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "team_id") Team team;
            public Member() { }
            public Member(String name) { this.name = name; }
            public void setTeam(Team team) { this.team = team; }
        }
        static String run(SessionFactory sf, String set, boolean clear) {
            try (EntityManager em = sf.createEntityManager()) {
                em.getTransaction().begin();
                Team team = new Team("개발팀");
                em.persist(team);
                Member member = new Member("김철수");
                if (!set.equals("inverse")) member.setTeam(team);
                if (!set.equals("owner")) team.getMembers().add(member);
                em.persist(member);
                String afterPersist = sql();          // persist 두 번이 끝난 시점까지 나간 SQL
                if (clear) { em.flush(); em.clear(); }
                Team found = em.find(Team.class, team.getId());
                int size = found.getMembers().size();
                boolean same = found == team;
                String beforeCommit = sql();          // 커밋 직전까지 나간 SQL
                em.getTransaction().commit();
                return "size=" + size + "|sameObject=" + same + "|sqlAfterPersist=" + afterPersist + "|sqlBeforeCommit=" + beforeCommit;
            }
        }
    }

    static int dbNo = 0;
    static SessionFactory factory(boolean mappedBy) {
        Configuration cfg = new Configuration();
        if (mappedBy) cfg.addAnnotatedClass(With.Team.class).addAnnotatedClass(With.Member.class);
        else cfg.addAnnotatedClass(Without.Team.class).addAnnotatedClass(Without.Member.class);
        cfg.setProperty("hibernate.connection.url", "jdbc:h2:mem:owner" + (dbNo++) + ";DB_CLOSE_DELAY=-1");
        cfg.setProperty("hibernate.hbm2ddl.auto", "create-drop");
        cfg.setProperty("hibernate.session_factory.statement_inspector", Capture.class.getName());
        return cfg.buildSessionFactory();
    }
    @SuppressWarnings("unchecked")
    static String tables(SessionFactory sf) {
        on = false;
        try (EntityManager em = sf.createEntityManager()) {
            Map<String, List<String>> t = new TreeMap<>();
            List<Object[]> rows = em.createNativeQuery("select c.table_name, c.column_name from information_schema.columns c join information_schema.tables t on t.table_schema = c.table_schema and t.table_name = c.table_name where c.table_schema = 'PUBLIC' and t.table_type = 'BASE TABLE' order by c.table_name, c.column_name").getResultList();
            for (Object[] r : rows) t.computeIfAbsent(String.valueOf(r[0]).toLowerCase(Locale.ROOT), k -> new ArrayList<>()).add(String.valueOf(r[1]).toLowerCase(Locale.ROOT));
            StringBuilder sb = new StringBuilder();
            t.forEach((k, v) -> sb.append(sb.length() > 0 ? ";" : "").append(k).append('(').append(String.join(",", v)).append(')'));
            return sb.toString();
        } finally { on = true; }
    }
    static final Pattern KIND = Pattern.compile("^(insert into|update|delete from|select)\\s+(\\S+)");
    static final Pattern FROM = Pattern.compile("\\bfrom\\s+(\\w+)");
    static String sql() {
        Map<String, Integer> m = new LinkedHashMap<>();
        for (String s : SQL) {
            Matcher k = KIND.matcher(s); if (!k.find()) continue;
            String kind = k.group(1).split(" ")[0], table = k.group(2);
            if (kind.equals("select")) { Matcher f = FROM.matcher(s); table = f.find() ? f.group(1) : "?"; }
            m.merge(kind + ":" + table.replaceAll("[^a-z_]", ""), 1, Integer::sum);
        }
        StringBuilder sb = new StringBuilder();
        m.forEach((k, v) -> sb.append(sb.length() > 0 ? "," : "").append(k).append('=').append(v));
        return sb.length() == 0 ? "none" : sb.toString();
    }
    @SuppressWarnings("unchecked")
    static String rows(SessionFactory sf, String query) {
        on = false;
        try (EntityManager em = sf.createEntityManager()) {
            StringBuilder sb = new StringBuilder();
            for (Object r : em.createNativeQuery(query).getResultList()) {
                Object[] a = r instanceof Object[] x ? x : new Object[] { r };
                List<String> cells = new ArrayList<>(); for (Object o : a) cells.add(String.valueOf(o));
                sb.append(sb.length() > 0 ? ";" : "").append(String.join(",", cells));
            }
            return sb.length() == 0 ? "empty" : sb.toString();
        } finally { on = true; }
    }

    public static void main(String[] args) throws Exception {
        List<String> out = new ArrayList<>();
        out.add("# hibernate " + org.hibernate.Version.getVersionString());
        for (boolean mp : new boolean[] { true, false }) for (String set : new String[] { "inverse", "owner", "both" }) for (boolean clear : new boolean[] { false, true }) {
            try (SessionFactory sf = factory(mp)) {
                String t = tables(sf);
                SQL.clear();
                String r = mp ? With.run(sf, set, clear) : Without.run(sf, set, clear);
                String s = sql();
                String join = mp ? "-" : rows(sf, "select count(*) from team_member");
                out.add(mp + "|" + set + "|" + clear + " => tables=" + t + "|sql=" + s + "|teamId=" + rows(sf, "select team_id from member") + "|joinRows=" + join + "|" + r);
            }
        }
        Files.write(Path.of(args[0]), out, StandardCharsets.UTF_8);
        System.out.println(out.get(0) + " | " + (out.size() - 1) + " combos");
    }
}

import jakarta.persistence.Entity;
import jakarta.persistence.EntityManager;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToMany;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToMany;
import jakarta.persistence.OneToOne;
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

// "다대일, 일대다, 일대일, 다대다" 실습의 모든 조합을 실제 Hibernate + H2에서 실행한다.
// 조합마다 만들어진 테이블과 컬럼, 외래 키가 놓인 곳(유니크 여부), 저장할 때 나간 SQL(종류와 테이블별 횟수), 외래 키 컬럼에 남은 값을 적는다.
public class RelationsProbe {
    static final List<String> SQL = new ArrayList<>();
    static boolean on = true;
    public static class Capture implements StatementInspector {
        @Override public String inspect(String sql) { if (on) SQL.add(sql.toLowerCase(Locale.ROOT)); return sql; }
    }

    // 다대일: 회원 여러 명이 팀 하나에 속한다. 외래 키는 회원 테이블에 있고, 회원이 그것을 관리한다
    public static class M2O {
        @Entity(name = "Team")
        public static class Team {
            @Id @GeneratedValue(strategy = GenerationType.IDENTITY) Long id; String name;
            public Team() { }
            public Team(String name) { this.name = name; }
        }
        @Entity(name = "Member")
        public static class Member {
            @Id @GeneratedValue(strategy = GenerationType.IDENTITY) Long id; String name;
            @ManyToOne @JoinColumn(name = "team_id") Team team;
            public Member() { }
            public Member(String name) { this.name = name; }
            public void setTeam(Team team) { this.team = team; }
        }
        static void save(EntityManager em, int n) {
            Team team = new Team("개발팀");
            em.persist(team);
            for (int i = 1; i <= n; i++) { Member member = new Member("회원" + i); member.setTeam(team); em.persist(member); }
        }
    }
    // 일대다 단방향 + @JoinColumn: 팀이 회원 목록을 갖는다. 외래 키는 여전히 회원 테이블에 있는데, 팀이 그것을 관리한다
    public static class O2M {
        @Entity(name = "Team")
        public static class Team {
            @Id @GeneratedValue(strategy = GenerationType.IDENTITY) Long id; String name;
            @OneToMany @JoinColumn(name = "team_id") List<Member> members = new ArrayList<>();
            public Team() { }
            public Team(String name) { this.name = name; }
            public List<Member> getMembers() { return members; }
        }
        @Entity(name = "Member")
        public static class Member {
            @Id @GeneratedValue(strategy = GenerationType.IDENTITY) Long id; String name;
            public Member() { }
            public Member(String name) { this.name = name; }
        }
        static void save(EntityManager em, int n) {
            Team team = new Team("개발팀");
            em.persist(team);
            for (int i = 1; i <= n; i++) { Member member = new Member("회원" + i); em.persist(member); team.getMembers().add(member); }
        }
    }
    // 일대다 단방향인데 @JoinColumn이 없는 경우: 연결 테이블이 생긴다
    public static class O2MJT {
        @Entity(name = "Team")
        public static class Team {
            @Id @GeneratedValue(strategy = GenerationType.IDENTITY) Long id; String name;
            @OneToMany List<Member> members = new ArrayList<>();
            public Team() { }
            public Team(String name) { this.name = name; }
            public List<Member> getMembers() { return members; }
        }
        @Entity(name = "Member")
        public static class Member {
            @Id @GeneratedValue(strategy = GenerationType.IDENTITY) Long id; String name;
            public Member() { }
            public Member(String name) { this.name = name; }
        }
        static void save(EntityManager em, int n) {
            Team team = new Team("개발팀");
            em.persist(team);
            for (int i = 1; i <= n; i++) { Member member = new Member("회원" + i); em.persist(member); team.getMembers().add(member); }
        }
    }
    // 일대일, 외래 키를 회원 테이블(주로 조회하는 쪽)에 둔다
    public static class O2OMain {
        @Entity(name = "Locker")
        public static class Locker {
            @Id @GeneratedValue(strategy = GenerationType.IDENTITY) Long id; String name;
            public Locker() { }
            public Locker(String name) { this.name = name; }
        }
        @Entity(name = "Member")
        public static class Member {
            @Id @GeneratedValue(strategy = GenerationType.IDENTITY) Long id; String name;
            @OneToOne @JoinColumn(name = "locker_id") Locker locker;
            public Member() { }
            public Member(String name) { this.name = name; }
            public void setLocker(Locker locker) { this.locker = locker; }
        }
        static void save(EntityManager em) {
            Locker locker = new Locker("101번 사물함");
            em.persist(locker);
            Member member = new Member("회원1");
            member.setLocker(locker);
            em.persist(member);
        }
    }
    // 일대일, 외래 키를 사물함 테이블(대상 쪽)에 둔다. 회원 쪽은 mappedBy로 읽기만 한다
    public static class O2OTarget {
        @Entity(name = "Locker")
        public static class Locker {
            @Id @GeneratedValue(strategy = GenerationType.IDENTITY) Long id; String name;
            @OneToOne @JoinColumn(name = "member_id") Member member;
            public Locker() { }
            public Locker(String name) { this.name = name; }
            public void setMember(Member member) { this.member = member; }
        }
        @Entity(name = "Member")
        public static class Member {
            @Id @GeneratedValue(strategy = GenerationType.IDENTITY) Long id; String name;
            @OneToOne(mappedBy = "member") Locker locker;
            public Member() { }
            public Member(String name) { this.name = name; }
        }
        static void save(EntityManager em) {
            Member member = new Member("회원1");
            em.persist(member);
            Locker locker = new Locker("101번 사물함");
            locker.setMember(member);
            em.persist(locker);
        }
    }
    // 다대다: 회원이 상품 여러 개를 고르고, 한 상품을 여러 회원이 고를 수 있다. 가운데에 연결 테이블이 생긴다
    public static class M2M {
        @Entity(name = "Product")
        public static class Product {
            @Id @GeneratedValue(strategy = GenerationType.IDENTITY) Long id; String name;
            public Product() { }
            public Product(String name) { this.name = name; }
        }
        @Entity(name = "Member")
        public static class Member {
            @Id @GeneratedValue(strategy = GenerationType.IDENTITY) Long id; String name;
            @ManyToMany List<Product> products = new ArrayList<>();
            public Member() { }
            public Member(String name) { this.name = name; }
            public List<Product> getProducts() { return products; }
        }
        static void save(EntityManager em, int n) {
            Member member = new Member("회원1");
            em.persist(member);
            for (int i = 1; i <= n; i++) { Product product = new Product("상품" + i); em.persist(product); member.getProducts().add(product); }
        }
    }

    static int dbNo = 0;
    static SessionFactory factory(Class<?>... cs) {
        Configuration cfg = new Configuration();
        for (Class<?> c : cs) cfg.addAnnotatedClass(c);
        cfg.setProperty("hibernate.connection.url", "jdbc:h2:mem:relations" + (dbNo++) + ";DB_CLOSE_DELAY=-1");
        cfg.setProperty("hibernate.hbm2ddl.auto", "create-drop");
        cfg.setProperty("hibernate.session_factory.statement_inspector", Capture.class.getName());
        return cfg.buildSessionFactory();
    }
    @SuppressWarnings("unchecked")
    static List<Object[]> q(SessionFactory sf, String query) {
        on = false;
        try (EntityManager em = sf.createEntityManager()) {
            List<Object[]> out = new ArrayList<>();
            for (Object r : em.createNativeQuery(query).getResultList()) out.add(r instanceof Object[] x ? x : new Object[] { r });
            return out;
        } finally { on = true; }
    }
    static String low(Object o) { return String.valueOf(o).toLowerCase(Locale.ROOT); }
    static String tables(SessionFactory sf) {
        Map<String, List<String>> t = new TreeMap<>();
        for (Object[] r : q(sf, "select c.table_name, c.column_name from information_schema.columns c join information_schema.tables t on t.table_schema = c.table_schema and t.table_name = c.table_name where c.table_schema = 'PUBLIC' and t.table_type = 'BASE TABLE' order by c.table_name, c.column_name")) t.computeIfAbsent(low(r[0]), k -> new ArrayList<>()).add(low(r[1]));
        StringBuilder sb = new StringBuilder();
        t.forEach((k, v) -> sb.append(sb.length() > 0 ? ";" : "").append(k).append('(').append(String.join(",", v)).append(')'));
        return sb.toString();
    }
    // 외래 키: 테이블.컬럼>가리키는 테이블 (유니크 제약이 걸린 컬럼에는 !를 붙인다)
    static String fks(SessionFactory sf) {
        List<String> uniq = new ArrayList<>();
        for (Object[] r : q(sf, "select k.table_name, k.column_name from information_schema.table_constraints t join information_schema.key_column_usage k on k.constraint_name = t.constraint_name where t.constraint_type = 'UNIQUE'")) uniq.add(low(r[0]) + "." + low(r[1]));
        List<String> out = new ArrayList<>();
        for (Object[] r : q(sf, "select k.table_name, k.column_name, t.table_name from information_schema.referential_constraints r join information_schema.key_column_usage k on k.constraint_name = r.constraint_name join information_schema.table_constraints t on t.constraint_name = r.unique_constraint_name order by 1, 2")) {
            String c = low(r[0]) + "." + low(r[1]);
            out.add(c + (uniq.contains(c) ? "!" : "") + ">" + low(r[2]));
        }
        return out.isEmpty() ? "none" : String.join(",", out);
    }
    static final Pattern KIND = Pattern.compile("^(insert into|update|delete from|select)\\s+(\\S+)");
    static String sql() {
        Map<String, Integer> m = new LinkedHashMap<>();
        for (String s : SQL) {
            Matcher k = KIND.matcher(s); if (!k.find()) continue;
            m.merge(k.group(1).split(" ")[0] + ":" + k.group(2).replaceAll("[^a-z_]", ""), 1, Integer::sum);
        }
        StringBuilder sb = new StringBuilder();
        m.forEach((k, v) -> sb.append(sb.length() > 0 ? "," : "").append(k).append('=').append(v));
        return sb.length() == 0 ? "none" : sb.toString();
    }
    static String rows(SessionFactory sf, String query) {
        StringBuilder sb = new StringBuilder();
        for (Object[] a : q(sf, query)) { List<String> cells = new ArrayList<>(); for (Object o : a) cells.add(String.valueOf(o)); sb.append(sb.length() > 0 ? ";" : "").append(String.join(",", cells)); }
        return sb.length() == 0 ? "empty" : sb.toString();
    }

    static String run(String rel, int n) {
        Class<?>[] cs = switch (rel) {
            case "m2o" -> new Class<?>[] { M2O.Team.class, M2O.Member.class };
            case "o2m" -> new Class<?>[] { O2M.Team.class, O2M.Member.class };
            case "o2mjt" -> new Class<?>[] { O2MJT.Team.class, O2MJT.Member.class };
            case "o2omain" -> new Class<?>[] { O2OMain.Locker.class, O2OMain.Member.class };
            case "o2otarget" -> new Class<?>[] { O2OTarget.Locker.class, O2OTarget.Member.class };
            default -> new Class<?>[] { M2M.Product.class, M2M.Member.class };
        };
        try (SessionFactory sf = factory(cs)) {
            String t = tables(sf), f = fks(sf);
            SQL.clear();
            String beforeCommit;
            try (EntityManager em = sf.createEntityManager()) {
                em.getTransaction().begin();
                switch (rel) {
                    case "m2o" -> M2O.save(em, n);
                    case "o2m" -> O2M.save(em, n);
                    case "o2mjt" -> O2MJT.save(em, n);
                    case "o2omain" -> O2OMain.save(em);
                    case "o2otarget" -> O2OTarget.save(em);
                    default -> M2M.save(em, n);
                }
                beforeCommit = sql();
                em.getTransaction().commit();
            }
            String db = switch (rel) {
                case "m2o", "o2m" -> rows(sf, "select name, team_id from member order by id");
                case "o2mjt" -> rows(sf, "select team_id, members_id from team_member order by 1, 2");
                case "o2omain" -> rows(sf, "select name, locker_id from member order by id");
                case "o2otarget" -> rows(sf, "select name, member_id from locker order by id");
                default -> rows(sf, "select member_id, products_id from member_product order by 1, 2");
            };
            // 외래 키가 있는 테이블의 INSERT 문에 외래 키 컬럼이 들어 있는가 (연결 테이블을 쓰는 관계는 해당 없음)
            String[] holder = switch (rel) { case "m2o", "o2m" -> new String[] { "member", "team_id" }; case "o2omain" -> new String[] { "member", "locker_id" }; case "o2otarget" -> new String[] { "locker", "member_id" }; default -> null; };
            String fkInInsert = holder == null ? "-" : String.valueOf(SQL.stream().filter(x -> x.startsWith("insert into " + holder[0] + " ")).allMatch(x -> x.contains(holder[1])));
            return "tables=" + t + "|fk=" + f + "|sqlBeforeCommit=" + beforeCommit + "|sql=" + sql() + "|fkInInsert=" + fkInInsert + "|db=" + db;
        }
    }

    public static void main(String[] args) throws Exception {
        List<String> out = new ArrayList<>();
        out.add("# hibernate " + org.hibernate.Version.getVersionString());
        for (String rel : new String[] { "m2o", "o2m", "o2mjt", "m2m" }) for (int n = 1; n <= 3; n++) out.add(rel + "|" + n + " => " + run(rel, n));
        for (String rel : new String[] { "o2omain", "o2otarget" }) out.add(rel + "|1 => " + run(rel, 1));
        Files.write(Path.of(args[0]), out, StandardCharsets.UTF_8);
        System.out.println(out.get(0) + " | " + (out.size() - 1) + " combos");
    }
}

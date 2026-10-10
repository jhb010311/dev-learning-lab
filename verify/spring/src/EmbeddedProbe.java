import jakarta.persistence.AttributeOverride;
import jakarta.persistence.AttributeOverrides;
import jakarta.persistence.CollectionTable;
import jakarta.persistence.Column;
import jakarta.persistence.ElementCollection;
import jakarta.persistence.Embeddable;
import jakarta.persistence.Embedded;
import jakarta.persistence.Entity;
import jakarta.persistence.EntityManager;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.OrderColumn;
import jakarta.persistence.Table;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.Collection;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.TreeMap;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import org.hibernate.SessionFactory;
import org.hibernate.cfg.Configuration;
import org.hibernate.resource.jdbc.spi.StatementInspector;

// "값 타입과 임베디드 타입" 실습의 모든 조합을 실제 Hibernate + H2에서 실행한다.
// 조합마다 만들어진 테이블과 컬럼, 나간 SQL(종류와 테이블별 횟수), DB에 남은 값을 한 줄로 적는다.
public class EmbeddedProbe {
    static final List<String> SQL = new ArrayList<>();
    static boolean on = true;
    public static class Capture implements StatementInspector {
        @Override public String inspect(String sql) { if (on) SQL.add(sql.toLowerCase(Locale.ROOT)); return sql; }
    }

    // 값 타입: 세터가 있는 것(고칠 수 있음)
    @Embeddable
    public static class Address {
        String city; String street;
        public Address() { }
        public Address(String city, String street) { this.city = city; this.street = street; }
        public String getCity() { return city; }
        public String getStreet() { return street; }
        public void setCity(String city) { this.city = city; }
        @Override public boolean equals(Object o) { return o instanceof Address a && Objects.equals(city, a.city) && Objects.equals(street, a.street); }
        @Override public int hashCode() { return Objects.hash(city, street); }
    }
    // 값 타입: 모든 컬럼이 NOT NULL인 것 (값 타입 컬렉션의 Set에서 한 행만 골라 지울 수 있는 조건)
    @Embeddable
    public static class AddressNN {
        @Column(nullable = false) String city; @Column(nullable = false) String street;
        public AddressNN() { }
        public AddressNN(String city, String street) { this.city = city; this.street = street; }
        @Override public boolean equals(Object o) { return o instanceof AddressNN a && Objects.equals(city, a.city) && Objects.equals(street, a.street); }
        @Override public int hashCode() { return Objects.hash(city, street); }
    }
    // 값 타입: 세터가 없는 것(불변). 바꾸려면 새 객체를 만들어 통째로 갈아 끼운다
    @Embeddable
    public static class FixedAddress {
        String city; String street;
        protected FixedAddress() { }
        public FixedAddress(String city, String street) { this.city = city; this.street = street; }
        public String getCity() { return city; }
        public String getStreet() { return street; }
    }

    // 임베디드 타입을 쓰지 않고 필드를 그대로 둔 회원
    @Entity(name = "MemberPlain") @Table(name = "member")
    public static class MemberPlain {
        @Id @GeneratedValue(strategy = GenerationType.IDENTITY) Long id; String name; String city; String street;
        public MemberPlain() { }
        public MemberPlain(String name, String city, String street) { this.name = name; this.city = city; this.street = street; }
    }
    // 주소를 임베디드 타입으로 묶은 회원
    @Entity(name = "MemberEmb") @Table(name = "member")
    public static class MemberEmb {
        @Id @GeneratedValue(strategy = GenerationType.IDENTITY) Long id; String name;
        @Embedded Address address;
        public MemberEmb() { }
        public MemberEmb(String name, Address address) { this.name = name; this.address = address; }
        public Address getAddress() { return address; }
        public void setAddress(Address a) { this.address = a; }
    }
    // 불변 값 타입을 쓰는 회원
    @Entity(name = "MemberFixed") @Table(name = "member")
    public static class MemberFixed {
        @Id @GeneratedValue(strategy = GenerationType.IDENTITY) Long id; String name;
        @Embedded FixedAddress address;
        public MemberFixed() { }
        public MemberFixed(String name, FixedAddress address) { this.name = name; this.address = address; }
        public FixedAddress getAddress() { return address; }
        public void setAddress(FixedAddress a) { this.address = a; }
    }
    // 같은 값 타입을 두 번 쓰고 컬럼 이름을 바꾸지 않은 회원
    @Entity(name = "MemberTwo") @Table(name = "member")
    public static class MemberTwo {
        @Id @GeneratedValue(strategy = GenerationType.IDENTITY) Long id; String name;
        @Embedded Address homeAddress;
        @Embedded Address workAddress;
        public MemberTwo() { }
        public MemberTwo(String name, Address home, Address work) { this.name = name; this.homeAddress = home; this.workAddress = work; }
    }
    // 같은 값 타입을 두 번 쓰되 두 번째의 컬럼 이름을 바꾼 회원
    @Entity(name = "MemberTwoOv") @Table(name = "member")
    public static class MemberTwoOv {
        @Id @GeneratedValue(strategy = GenerationType.IDENTITY) Long id; String name;
        @Embedded Address homeAddress;
        @Embedded
        @AttributeOverrides({ @AttributeOverride(name = "city", column = @Column(name = "work_city")), @AttributeOverride(name = "street", column = @Column(name = "work_street")) })
        Address workAddress;
        public MemberTwoOv() { }
        public MemberTwoOv(String name, Address home, Address work) { this.name = name; this.homeAddress = home; this.workAddress = work; }
    }
    // 값 타입 컬렉션: List, 순서 컬럼이 있는 List, Set
    public interface HasHistory { Collection<?> getHistory(); }
    @Entity(name = "MemberList") @Table(name = "member")
    public static class MemberList implements HasHistory {
        @Id @GeneratedValue(strategy = GenerationType.IDENTITY) Long id; String name;
        @ElementCollection @CollectionTable(name = "address_history", joinColumns = @JoinColumn(name = "member_id"))
        List<Address> history = new ArrayList<>();
        public MemberList() { }
        public MemberList(String name) { this.name = name; }
        public Collection<?> getHistory() { return history; }
    }
    @Entity(name = "MemberOrder") @Table(name = "member")
    public static class MemberOrder implements HasHistory {
        @Id @GeneratedValue(strategy = GenerationType.IDENTITY) Long id; String name;
        @ElementCollection @CollectionTable(name = "address_history", joinColumns = @JoinColumn(name = "member_id")) @OrderColumn(name = "idx")
        List<Address> history = new ArrayList<>();
        public MemberOrder() { }
        public MemberOrder(String name) { this.name = name; }
        public Collection<?> getHistory() { return history; }
    }
    @Entity(name = "MemberSet") @Table(name = "member")
    public static class MemberSet implements HasHistory {
        @Id @GeneratedValue(strategy = GenerationType.IDENTITY) Long id; String name;
        @ElementCollection @CollectionTable(name = "address_history", joinColumns = @JoinColumn(name = "member_id"))
        Set<Address> history = new HashSet<>();
        public MemberSet() { }
        public MemberSet(String name) { this.name = name; }
        public Collection<?> getHistory() { return history; }
    }

    @Entity(name = "MemberSetNN") @Table(name = "member")
    public static class MemberSetNN implements HasHistory {
        @Id @GeneratedValue(strategy = GenerationType.IDENTITY) Long id; String name;
        @ElementCollection @CollectionTable(name = "address_history", joinColumns = @JoinColumn(name = "member_id"))
        Set<AddressNN> history = new HashSet<>();
        public MemberSetNN() { }
        public MemberSetNN(String name) { this.name = name; }
        public Collection<?> getHistory() { return history; }
    }

    static int dbNo = 0;
    static SessionFactory factory(Class<?> c) {
        Configuration cfg = new Configuration().addAnnotatedClass(c);
        cfg.setProperty("hibernate.connection.url", "jdbc:h2:mem:embedded" + (dbNo++) + ";DB_CLOSE_DELAY=-1");
        cfg.setProperty("hibernate.hbm2ddl.auto", "create-drop");
        cfg.setProperty("hibernate.session_factory.statement_inspector", Capture.class.getName());
        return cfg.buildSessionFactory();
    }
    // 만들어진 테이블과 컬럼: member(city,id,name,street);... (이름순)
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
    // 나간 SQL을 종류와 테이블로 센다: insert:member=2,update:member=1 (처음 나온 순서)
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
    // 테이블의 행을 그대로 읽는다: 값,값;값,값
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
    static String root(Throwable e) { Throwable r = e; while (r.getCause() != null && r.getCause() != r) r = r.getCause(); return r.getClass().getSimpleName() + ":" + String.valueOf(r.getMessage()).replaceAll("\\s+", " "); }

    // 장면 1: 임베디드 타입이 테이블에 어떻게 저장되는가
    static String table(String tb) {
        Class<?> c = switch (tb) { case "plain" -> MemberPlain.class; case "two" -> MemberTwo.class; case "twoov" -> MemberTwoOv.class; default -> MemberEmb.class; };
        SessionFactory sf;
        SQL.clear();
        try { sf = factory(c); } catch (Throwable e) {
            String msg = root(e);
            return "error=" + msg.split(":")[0] + "|dupColumn=" + (msg.toLowerCase(Locale.ROOT).contains("city") || msg.toLowerCase(Locale.ROOT).contains("street")) + "|msg=" + msg;
        }
        try (sf) {
            String t = tables(sf);
            SQL.clear();
            String loaded = "-", beforeCommit;
            try (EntityManager em = sf.createEntityManager()) {
                em.getTransaction().begin();
                Object m = switch (tb) {
                    case "plain" -> new MemberPlain("김철수", "서울", "강남대로");
                    case "nul" -> new MemberEmb("김철수", null);
                    case "two" -> new MemberTwo("김철수", new Address("서울", "강남대로"), new Address("성남", "판교로"));
                    case "twoov" -> new MemberTwoOv("김철수", new Address("서울", "강남대로"), new Address("성남", "판교로"));
                    default -> new MemberEmb("김철수", new Address("서울", "강남대로"));
                };
                em.persist(m);
                beforeCommit = sql();   // IDENTITY 전략이라 persist에서 INSERT가 이미 나갔는지 본다
                em.getTransaction().commit();
            }
            String s = sql(), readSql = "-";
            if (tb.equals("emb") || tb.equals("nul")) {
                // 새 영속성 컨텍스트에서 다시 읽어, 주소가 어떤 객체로 돌아오는지 본다
                SQL.clear();
                try (EntityManager em = sf.createEntityManager()) { MemberEmb m = em.find(MemberEmb.class, 1L); loaded = m.getAddress() == null ? "null" : m.getAddress().getCity() + "/" + m.getAddress().getStreet(); }
                readSql = sql();
            }
            String cols = tb.equals("twoov") ? "id, name, city, street, work_city, work_street" : "id, name, city, street";
            return "tables=" + t + "|sqlBeforeCommit=" + beforeCommit + "|sql=" + s + "|db=" + rows(sf, "select " + cols + " from member order by id") + "|readSql=" + readSql + "|loadedAddress=" + loaded;
        }
    }

    // 장면 2: 같은 값 객체를 두 회원이 함께 쓰다가 회원 1의 도시만 바꾼다
    static String share(String sh) {
        boolean fixed = sh.equals("fixed");
        try (SessionFactory sf = factory(fixed ? MemberFixed.class : MemberEmb.class)) {
            String t = tables(sf);
            SQL.clear();
            boolean sameObject;
            String beforeChange = "", beforeCommit;
            try (EntityManager em = sf.createEntityManager()) {
                em.getTransaction().begin();
                if (fixed) {
                    FixedAddress addr = new FixedAddress("서울", "강남대로");
                    MemberFixed m1 = new MemberFixed("회원1", addr), m2 = new MemberFixed("회원2", addr);
                    em.persist(m1); em.persist(m2);
                    beforeChange = sql();
                    m1.setAddress(new FixedAddress("부산", addr.getStreet()));
                    sameObject = m1.getAddress() == m2.getAddress();
                } else {
                    Address addr = new Address("서울", "강남대로");
                    MemberEmb m1 = new MemberEmb("회원1", addr), m2 = new MemberEmb("회원2", sh.equals("copy") ? new Address(addr.getCity(), addr.getStreet()) : addr);
                    em.persist(m1); em.persist(m2);
                    beforeChange = sql();
                    m1.getAddress().setCity("부산");
                    sameObject = m1.getAddress() == m2.getAddress();
                }
                beforeCommit = sql();   // 값을 고친 뒤 커밋 전까지는 UPDATE가 나가지 않는지 본다
                em.getTransaction().commit();
            }
            return "tables=" + t + "|sqlBeforeChange=" + beforeChange + "|sqlBeforeCommit=" + beforeCommit + "|sql=" + sql() + "|db=" + rows(sf, "select name, city from member order by id") + "|sameObjectAtEnd=" + sameObject;
        }
    }

    // 장면 3: 값 타입 컬렉션에서 하나를 고치거나, 더하거나, 뺀다
    static final List<String> SAMPLE = new ArrayList<>();
    static final String[] CITY = { "서울", "부산", "대구", "광주", "인천" };
    static Object value(boolean nn, String city, String street) { return nn ? new AddressNN(city, street) : new Address(city, street); }
    @SuppressWarnings("unchecked")
    static void add(HasHistory m, Object v) { ((Collection<Object>) m.getHistory()).add(v); }
    static String coll(String ct, String op, int n) {
        Class<?> c = ct.equals("list") ? MemberList.class : ct.equals("order") ? MemberOrder.class : ct.equals("set") ? MemberSet.class : MemberSetNN.class;
        boolean nn = ct.equals("setnn");
        try (SessionFactory sf = factory(c)) {
            String t = tables(sf);
            Object id;
            SQL.clear();
            try (EntityManager em = sf.createEntityManager()) {
                em.getTransaction().begin();
                HasHistory m = ct.equals("list") ? new MemberList("김철수") : ct.equals("order") ? new MemberOrder("김철수") : ct.equals("set") ? new MemberSet("김철수") : new MemberSetNN("김철수");
                for (int i = 0; i < n; i++) add(m, value(nn, CITY[i], (i + 1) + "번길"));
                em.persist(m);
                em.getTransaction().commit();
                id = sf.getPersistenceUnitUtil().getIdentifier(m);
            }
            String seed = sql(), beforeCommit, afterFind;
            SQL.clear();
            try (EntityManager em = sf.createEntityManager()) {
                em.getTransaction().begin();
                HasHistory m = (HasHistory) em.find(c, id);
                afterFind = sql();      // find만으로는 컬렉션 테이블을 읽지 않는지(지연 로딩) 본다
                if (op.equals("mod") || op.equals("del")) m.getHistory().remove(value(nn, "서울", "1번길"));
                if (op.equals("mod") || op.equals("add")) add(m, value(nn, "제주", "9번길"));
                beforeCommit = sql();   // 커밋 전까지는 조회만 나가고 쓰기 SQL은 나가지 않는지 본다
                em.getTransaction().commit();
            }
            if (n == 3) for (String x : SQL) if (!x.startsWith("select")) SAMPLE.add("# sql coll|" + ct + "|" + op + "|3: " + x);
            // DELETE가 "이 회원의 행 전부"를 지우는 것인지(조건이 member_id뿐), 한 행만 골라 지우는 것인지 구분한다
            long deleteAll = SQL.stream().filter(x -> x.startsWith("delete from address_history") && !x.contains("city") && !x.contains("idx")).count();
            return "tables=" + t + "|seed=" + seed + "|sqlAfterFind=" + afterFind + "|sqlBeforeCommit=" + beforeCommit + "|sql=" + sql() + "|deleteAll=" + deleteAll + "|db=" + rows(sf, ct.equals("order") ? "select idx || ':' || city from address_history order by idx" : "select city from address_history order by city");
        }
    }

    public static void main(String[] args) throws Exception {
        List<String> out = new ArrayList<>();
        out.add("# hibernate " + org.hibernate.Version.getVersionString());
        for (String tb : new String[] { "plain", "emb", "nul", "two", "twoov" }) out.add("table|" + tb + " => " + table(tb));
        for (String sh : new String[] { "same", "copy", "fixed" }) out.add("share|" + sh + " => " + share(sh));
        for (String ct : new String[] { "list", "order", "set", "setnn" }) for (String op : new String[] { "mod", "add", "del" }) for (int n = 2; n <= 5; n++) out.add("coll|" + ct + "|" + op + "|" + n + " => " + coll(ct, op, n));
        out.add("# 아래는 값 타입 컬렉션에 주소가 3개 있을 때 실제로 나간 쓰기 SQL 문장(소문자로 바꾼 것)");
        out.addAll(SAMPLE);
        Files.write(Path.of(args[0]), out, StandardCharsets.UTF_8);
        System.out.println(out.get(0) + " | " + out.stream().filter(x -> x.contains(" => ")).count() + " combos");
    }
}

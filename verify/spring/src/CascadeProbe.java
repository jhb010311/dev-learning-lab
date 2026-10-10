import jakarta.persistence.CascadeType;
import jakarta.persistence.Entity;
import jakarta.persistence.EntityManager;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToMany;
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

// "영속성 전이와 고아 객체" 실습의 24가지 조합(cascade 4 x orphanRemoval 2 x 동작 3)을 실제 Hibernate + H2에서 실행한다.
// 조합마다 나간 SQL을 종류와 테이블로 세고, 예외가 났는지, 끝난 뒤 DB에 남은 행 수를 적는다.
// 애노테이션의 값은 실행 중에 바꿀 수 없으므로 게시글과 댓글 클래스를 설정마다 한 쌍씩(여덟 쌍) 둔다. 내용은 애노테이션만 다르다.
public class CascadeProbe {
    static final List<String> SQL = new ArrayList<>();
    public static class Capture implements StatementInspector {
        @Override public String inspect(String sql) { SQL.add(sql.toLowerCase(Locale.ROOT)); return sql; }
    }
    public interface Par { void addComment(String text); List<?> getComments(); }

    // cascade 없음
    @Entity(name = "PostN0") @Table(name = "post")
    public static class PostN0 implements Par {
        @Id @GeneratedValue(strategy = GenerationType.IDENTITY) Long id; String title;
        @OneToMany(mappedBy = "post") List<CommentN0> comments = new ArrayList<>();
        public void addComment(String t) { CommentN0 c = new CommentN0(); c.text = t; c.post = this; comments.add(c); }
        public List<?> getComments() { return comments; }
    }
    @Entity(name = "CommentN0") @Table(name = "comment")
    public static class CommentN0 { @Id @GeneratedValue(strategy = GenerationType.IDENTITY) Long id; String text; @ManyToOne(fetch = FetchType.LAZY) PostN0 post; }
    @Entity(name = "PostN1") @Table(name = "post")
    public static class PostN1 implements Par {
        @Id @GeneratedValue(strategy = GenerationType.IDENTITY) Long id; String title;
        @OneToMany(mappedBy = "post", orphanRemoval = true) List<CommentN1> comments = new ArrayList<>();
        public void addComment(String t) { CommentN1 c = new CommentN1(); c.text = t; c.post = this; comments.add(c); }
        public List<?> getComments() { return comments; }
    }
    @Entity(name = "CommentN1") @Table(name = "comment")
    public static class CommentN1 { @Id @GeneratedValue(strategy = GenerationType.IDENTITY) Long id; String text; @ManyToOne(fetch = FetchType.LAZY) PostN1 post; }

    // CascadeType.PERSIST
    @Entity(name = "PostP0") @Table(name = "post")
    public static class PostP0 implements Par {
        @Id @GeneratedValue(strategy = GenerationType.IDENTITY) Long id; String title;
        @OneToMany(mappedBy = "post", cascade = CascadeType.PERSIST) List<CommentP0> comments = new ArrayList<>();
        public void addComment(String t) { CommentP0 c = new CommentP0(); c.text = t; c.post = this; comments.add(c); }
        public List<?> getComments() { return comments; }
    }
    @Entity(name = "CommentP0") @Table(name = "comment")
    public static class CommentP0 { @Id @GeneratedValue(strategy = GenerationType.IDENTITY) Long id; String text; @ManyToOne(fetch = FetchType.LAZY) PostP0 post; }
    @Entity(name = "PostP1") @Table(name = "post")
    public static class PostP1 implements Par {
        @Id @GeneratedValue(strategy = GenerationType.IDENTITY) Long id; String title;
        @OneToMany(mappedBy = "post", cascade = CascadeType.PERSIST, orphanRemoval = true) List<CommentP1> comments = new ArrayList<>();
        public void addComment(String t) { CommentP1 c = new CommentP1(); c.text = t; c.post = this; comments.add(c); }
        public List<?> getComments() { return comments; }
    }
    @Entity(name = "CommentP1") @Table(name = "comment")
    public static class CommentP1 { @Id @GeneratedValue(strategy = GenerationType.IDENTITY) Long id; String text; @ManyToOne(fetch = FetchType.LAZY) PostP1 post; }

    // CascadeType.REMOVE
    @Entity(name = "PostR0") @Table(name = "post")
    public static class PostR0 implements Par {
        @Id @GeneratedValue(strategy = GenerationType.IDENTITY) Long id; String title;
        @OneToMany(mappedBy = "post", cascade = CascadeType.REMOVE) List<CommentR0> comments = new ArrayList<>();
        public void addComment(String t) { CommentR0 c = new CommentR0(); c.text = t; c.post = this; comments.add(c); }
        public List<?> getComments() { return comments; }
    }
    @Entity(name = "CommentR0") @Table(name = "comment")
    public static class CommentR0 { @Id @GeneratedValue(strategy = GenerationType.IDENTITY) Long id; String text; @ManyToOne(fetch = FetchType.LAZY) PostR0 post; }
    @Entity(name = "PostR1") @Table(name = "post")
    public static class PostR1 implements Par {
        @Id @GeneratedValue(strategy = GenerationType.IDENTITY) Long id; String title;
        @OneToMany(mappedBy = "post", cascade = CascadeType.REMOVE, orphanRemoval = true) List<CommentR1> comments = new ArrayList<>();
        public void addComment(String t) { CommentR1 c = new CommentR1(); c.text = t; c.post = this; comments.add(c); }
        public List<?> getComments() { return comments; }
    }
    @Entity(name = "CommentR1") @Table(name = "comment")
    public static class CommentR1 { @Id @GeneratedValue(strategy = GenerationType.IDENTITY) Long id; String text; @ManyToOne(fetch = FetchType.LAZY) PostR1 post; }

    // CascadeType.ALL
    @Entity(name = "PostA0") @Table(name = "post")
    public static class PostA0 implements Par {
        @Id @GeneratedValue(strategy = GenerationType.IDENTITY) Long id; String title;
        @OneToMany(mappedBy = "post", cascade = CascadeType.ALL) List<CommentA0> comments = new ArrayList<>();
        public void addComment(String t) { CommentA0 c = new CommentA0(); c.text = t; c.post = this; comments.add(c); }
        public List<?> getComments() { return comments; }
    }
    @Entity(name = "CommentA0") @Table(name = "comment")
    public static class CommentA0 { @Id @GeneratedValue(strategy = GenerationType.IDENTITY) Long id; String text; @ManyToOne(fetch = FetchType.LAZY) PostA0 post; }
    @Entity(name = "PostA1") @Table(name = "post")
    public static class PostA1 implements Par {
        @Id @GeneratedValue(strategy = GenerationType.IDENTITY) Long id; String title;
        @OneToMany(mappedBy = "post", cascade = CascadeType.ALL, orphanRemoval = true) List<CommentA1> comments = new ArrayList<>();
        public void addComment(String t) { CommentA1 c = new CommentA1(); c.text = t; c.post = this; comments.add(c); }
        public List<?> getComments() { return comments; }
    }
    @Entity(name = "CommentA1") @Table(name = "comment")
    public static class CommentA1 { @Id @GeneratedValue(strategy = GenerationType.IDENTITY) Long id; String text; @ManyToOne(fetch = FetchType.LAZY) PostA1 post; }

    // 비교용: 컬렉션이 외래 키를 직접 관리하는 단방향 @OneToMany(@JoinColumn), cascade 없음
    @Entity(name = "PostU") @Table(name = "post")
    public static class PostU {
        @Id @GeneratedValue(strategy = GenerationType.IDENTITY) Long id; String title;
        @OneToMany @jakarta.persistence.JoinColumn(name = "post_id") List<CommentU> comments = new ArrayList<>();
    }
    @Entity(name = "CommentU") @Table(name = "comment")
    public static class CommentU { @Id @GeneratedValue(strategy = GenerationType.IDENTITY) Long id; String text; }

    static final String[] CAS = { "none", "PERSIST", "REMOVE", "ALL" };
    static final Class<?>[][] POST = { { PostN0.class, PostN1.class }, { PostP0.class, PostP1.class }, { PostR0.class, PostR1.class }, { PostA0.class, PostA1.class } };
    static final Class<?>[][] COMMENT = { { CommentN0.class, CommentN1.class }, { CommentP0.class, CommentP1.class }, { CommentR0.class, CommentR1.class }, { CommentA0.class, CommentA1.class } };

    static SessionFactory factory(Class<?> post, Class<?> comment, String db) {
        Configuration cfg = new Configuration().addAnnotatedClass(post).addAnnotatedClass(comment);
        cfg.setProperty("hibernate.connection.url", "jdbc:h2:mem:" + db + ";DB_CLOSE_DELAY=-1");
        cfg.setProperty("hibernate.hbm2ddl.auto", "create-drop");
        cfg.setProperty("hibernate.session_factory.statement_inspector", Capture.class.getName());
        return cfg.buildSessionFactory();
    }
    static Par newPost(Class<?> post) throws Exception {
        Par p = (Par) post.getDeclaredConstructor().newInstance();
        post.getDeclaredField("title").set(p, "공지");
        p.addComment("첫째 댓글"); p.addComment("둘째 댓글");
        return p;
    }
    // SQL의 종류(select, insert, delete)와 그 SQL이 처음 가리키는 테이블로 센다
    static final java.util.regex.Pattern FIRST = java.util.regex.Pattern.compile("\\b(?:from|into)\\s+(\\w+)");
    static long count(String start, String table) {
        return SQL.stream().filter(s -> { java.util.regex.Matcher m = FIRST.matcher(s); return s.startsWith(start) && m.find() && m.group(1).equals(table); }).count();
    }
    // 나간 SQL을 순서대로 "종류:테이블"로 적는다 (S 조회, I 삽입, D 삭제, U 수정)
    static String seq(int from, int to) {
        StringBuilder sb = new StringBuilder();
        for (int i = from; i < to; i++) { java.util.regex.Matcher m = FIRST.matcher(SQL.get(i)); sb.append(sb.length() > 0 ? "," : "").append(Character.toUpperCase(SQL.get(i).charAt(0))).append(':').append(m.find() ? m.group(1) : "?"); }
        return sb.length() == 0 ? "-" : sb.toString();
    }
    static long rows(SessionFactory sf, String table) {
        try (EntityManager em = sf.createEntityManager()) { return ((Number) em.createNativeQuery("select count(*) from " + table).getSingleResult()).longValue(); }
    }
    // 예외의 원인을 따라 내려가며 클래스 이름을 모은다
    static String chain(Throwable t) {
        StringBuilder sb = new StringBuilder();
        for (Throwable x = t; x != null && sb.length() < 400; x = x.getCause()) sb.append(sb.length() > 0 ? " <- " : "").append(x.getClass().getSimpleName());
        return sb.toString();
    }
    // 게시글 하나와 댓글 둘을 미리 넣어 둔다(설정과 상관없이 댓글도 직접 persist한다)
    static Object seed(SessionFactory sf, Class<?> post) throws Exception {
        try (EntityManager em = sf.createEntityManager()) {
            em.getTransaction().begin();
            em.createNativeQuery("delete from comment").executeUpdate();
            em.createNativeQuery("delete from post").executeUpdate();
            Par p = newPost(post);
            em.persist(p);
            for (Object c : p.getComments()) em.persist(c);
            em.getTransaction().commit();
            return post.getDeclaredField("id").get(p);
        }
    }

    static String run(SessionFactory sf, Class<?> post, String act) throws Exception {
        Object id = null;
        if (act.equals("persist")) {
            try (EntityManager em = sf.createEntityManager()) { em.getTransaction().begin(); em.createNativeQuery("delete from comment").executeUpdate(); em.createNativeQuery("delete from post").executeUpdate(); em.getTransaction().commit(); }
        } else id = seed(sf, post);
        SQL.clear();
        String ex = "none", exAt = "none", msg = "";
        int beforeCommit = -1;
        EntityManager em = sf.createEntityManager();
        try {
            em.getTransaction().begin();
            String step = "call";
            try {
                if (act.equals("persist")) {
                    Par p = newPost(post);
                    em.persist(p);                              // 부모만 persist
                } else if (act.equals("remove")) {
                    Object p = em.find(post, id);
                    em.remove(p);                               // 부모를 remove
                } else {
                    Par p = (Par) em.find(post, id);
                    p.getComments().remove(0);                  // 컬렉션에서 첫 댓글을 뺀다
                }
                beforeCommit = SQL.size();                      // 여기까지가 호출하는 순간에 나간 SQL, 이 뒤가 커밋할 때 나간 SQL
                step = "commit";
                em.getTransaction().commit();
            } catch (Exception e) {
                ex = chain(e); exAt = step; msg = String.valueOf(e.getMessage()).replaceAll("\\s+", " ");
                if (msg.length() > 160) msg = msg.substring(0, 160);
                if (em.getTransaction().isActive()) em.getTransaction().rollback();
            }
        } finally { em.close(); }
        String sql = "selPost=" + count("select", "post") + "|selComment=" + count("select", "comment") + "|insPost=" + count("insert", "post") + "|insComment=" + count("insert", "comment")
            + "|delPost=" + count("delete", "post") + "|delComment=" + count("delete", "comment") + "|upd=" + SQL.stream().filter(s -> s.startsWith("update")).count() + "|total=" + SQL.size() + "|atCall=" + seq(0, beforeCommit < 0 ? SQL.size() : beforeCommit) + "|atCommit=" + seq(beforeCommit < 0 ? SQL.size() : beforeCommit, SQL.size());
        return sql + "|ex=" + ex + "|exAt=" + exAt + "|dbPost=" + rows(sf, "post") + "|dbComment=" + rows(sf, "comment") + "|msg=" + msg;
    }

    public static void main(String[] args) throws Exception {
        List<String> out = new ArrayList<>();
        out.add("# hibernate " + org.hibernate.Version.getVersionString());
        int db = 0;
        for (int i = 0; i < CAS.length; i++) for (int o = 0; o < 2; o++) {
            try (SessionFactory sf = factory(POST[i][o], COMMENT[i][o], "cascade" + (db++))) {
                for (String act : new String[] { "persist", "remove", "orphan" }) out.add(CAS[i] + "|" + (o == 1) + "|" + act + " => " + run(sf, POST[i][o], act));
            }
        }
        // 비교용 한 줄: 단방향 @OneToMany(@JoinColumn)에서 cascade 없이 부모만 persist
        try (SessionFactory sf = factory(PostU.class, CommentU.class, "cascade" + (db++))) {
            SQL.clear();
            String ex = "none", msg = "";
            EntityManager em = sf.createEntityManager();
            try {
                em.getTransaction().begin();
                PostU p = new PostU(); p.title = "공지";
                CommentU c = new CommentU(); c.text = "첫째 댓글"; p.comments.add(c);
                em.persist(p);
                em.getTransaction().commit();
            } catch (Exception e) { ex = chain(e); msg = String.valueOf(e.getMessage()).replaceAll("\\s+", " "); if (em.getTransaction().isActive()) em.getTransaction().rollback(); }
            finally { em.close(); }
            out.add("# extra unidirectional|none|persist => ex=" + ex + "|dbPost=" + rows(sf, "post") + "|dbComment=" + rows(sf, "comment") + "|msg=" + (msg.length() > 200 ? msg.substring(0, 200) : msg));
        }
        Files.write(Path.of(args[0]), out, StandardCharsets.UTF_8);
        System.out.println(out.get(0) + " | " + out.stream().filter(l -> !l.startsWith("#")).count() + " combos");
    }
}

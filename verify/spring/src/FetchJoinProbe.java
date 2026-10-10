import ch.qos.logback.classic.Level;
import ch.qos.logback.classic.Logger;
import ch.qos.logback.classic.spi.ILoggingEvent;
import ch.qos.logback.core.AppenderBase;
import jakarta.persistence.Entity;
import jakarta.persistence.EntityManager;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToMany;
import jakarta.persistence.Table;
import jakarta.persistence.TypedQuery;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import org.hibernate.Hibernate;
import org.hibernate.SessionFactory;
import org.hibernate.cfg.Configuration;
import org.hibernate.resource.jdbc.spi.StatementInspector;
import org.slf4j.LoggerFactory;

// "JPQL과 페치 조인" 실습의 12가지 조합(JPQL 6 x 페이징 2)을 실제 Hibernate + H2에서 실행한다.
// 조합마다 결과 목록(크기와 순서), DB가 돌려준 행 수, SQL의 모양(조인, 댓글 컬럼, 행 수 제한의 위치), 뒤따라 나간 조회 수, 경고와 예외를 적는다.
// 조합마다 SessionFactory를 새로 만든다. 같은 JPQL을 페이징 없이 실행한 적이 있으면 결과가 달라지는 것을 보았기 때문이다(맨 아래 extra 참고).
public class FetchJoinProbe {
    static final List<String> SQL = new ArrayList<>();
    static final List<String> WARN = new ArrayList<>();
    public static class Capture implements StatementInspector {
        @Override public String inspect(String sql) { SQL.add(sql.toLowerCase(Locale.ROOT)); return sql; }
    }

    @Entity(name = "Post") @Table(name = "posts")
    public static class Post {
        @Id Long id; String title;
        @OneToMany(mappedBy = "post") List<Comment> comments = new ArrayList<>();
        @OneToMany(mappedBy = "post") List<Attachment> files = new ArrayList<>();
        public Post() { }
        public Post(Long id, String title) { this.id = id; this.title = title; }
        public Long getId() { return id; }
        public List<Comment> getComments() { return comments; }
    }
    @Entity(name = "Comment") @Table(name = "comments")
    public static class Comment {
        @Id Long id; String text;
        @ManyToOne(fetch = FetchType.LAZY) Post post;
        public Comment() { }
        public Comment(Long id, String text, Post post) { this.id = id; this.text = text; this.post = post; }
    }
    @Entity(name = "Attachment") @Table(name = "files")
    public static class Attachment {
        @Id Long id; String name;
        @ManyToOne(fetch = FetchType.LAZY) Post post;
        public Attachment() { }
        public Attachment(Long id, String name, Post post) { this.id = id; this.name = name; this.post = post; }
    }
    // 비교용: 두 번째 컬렉션(files)만 Set으로 바꾼 같은 모양의 엔티티
    @Entity(name = "Post") @Table(name = "posts")
    public static class PostS {
        @Id Long id; String title;
        @OneToMany(mappedBy = "post") List<CommentS> comments = new ArrayList<>();
        @OneToMany(mappedBy = "post") Set<AttachmentS> files = new HashSet<>();
        public PostS() { }
        public PostS(Long id, String title) { this.id = id; this.title = title; }
    }
    @Entity(name = "Comment") @Table(name = "comments")
    public static class CommentS {
        @Id Long id; String text;
        @ManyToOne(fetch = FetchType.LAZY) PostS post;
        public CommentS() { }
        public CommentS(Long id, String text, PostS post) { this.id = id; this.text = text; this.post = post; }
    }
    @Entity(name = "Attachment") @Table(name = "files")
    public static class AttachmentS {
        @Id Long id; String name;
        @ManyToOne(fetch = FetchType.LAZY) PostS post;
        public AttachmentS() { }
        public AttachmentS(Long id, String name, PostS post) { this.id = id; this.name = name; this.post = post; }
    }

    static int dbNo = 0;
    // 게시글 1 "공지"에 댓글 3개와 첨부 2개, 게시글 2 "질문"에 댓글 2개와 첨부 1개
    static SessionFactory factory(boolean set) {
        Configuration cfg = new Configuration();
        if (set) cfg.addAnnotatedClass(PostS.class).addAnnotatedClass(CommentS.class).addAnnotatedClass(AttachmentS.class);
        else cfg.addAnnotatedClass(Post.class).addAnnotatedClass(Comment.class).addAnnotatedClass(Attachment.class);
        cfg.setProperty("hibernate.connection.url", "jdbc:h2:mem:fetchjoin" + (dbNo++) + ";DB_CLOSE_DELAY=-1");
        cfg.setProperty("hibernate.hbm2ddl.auto", "create-drop");
        cfg.setProperty("hibernate.session_factory.statement_inspector", Capture.class.getName());
        SessionFactory sf = cfg.buildSessionFactory();
        try (EntityManager em = sf.createEntityManager()) {
            em.getTransaction().begin();
            if (set) {
                PostS p1 = new PostS(1L, "공지"), p2 = new PostS(2L, "질문");
                em.persist(p1); em.persist(p2);
                for (long i = 1; i <= 5; i++) em.persist(new CommentS(i, "댓글 " + i, i <= 3 ? p1 : p2));
                em.persist(new AttachmentS(1L, "a.png", p1)); em.persist(new AttachmentS(2L, "b.png", p1)); em.persist(new AttachmentS(3L, "c.png", p2));
            } else {
                Post p1 = new Post(1L, "공지"), p2 = new Post(2L, "질문");
                em.persist(p1); em.persist(p2);
                for (long i = 1; i <= 5; i++) em.persist(new Comment(i, "댓글 " + i, i <= 3 ? p1 : p2));
                em.persist(new Attachment(1L, "a.png", p1)); em.persist(new Attachment(2L, "b.png", p1)); em.persist(new Attachment(3L, "c.png", p2));
            }
            em.getTransaction().commit();
        }
        return sf;
    }
    static String jpql(String q) {
        switch (q) {
            case "plain": return "select p from Post p order by p.id";
            case "table": return "select p from posts p order by p.id";                       // 엔티티 이름 대신 테이블 이름을 쓴 것
            case "join": return "select p from Post p join p.comments c order by p.id";
            case "fetch": return "select p from Post p join fetch p.comments order by p.id";
            case "fetchsort": return "select p from Post p join fetch p.comments c order by c.id desc";
            default: return "select p from Post p join fetch p.comments join fetch p.files order by p.id";   // two
        }
    }
    static String chain(Throwable t) {
        StringBuilder sb = new StringBuilder();
        for (Throwable x = t; x != null && sb.length() < 300; x = x.getCause()) sb.append(sb.length() > 0 ? " <- " : "").append(x.getClass().getSimpleName());
        return sb.toString();
    }
    static final Pattern COMMENT_ALIAS = Pattern.compile("\\bjoin\\s+comments\\s+(\\w+)");
    static final String LIMIT = "offset ? rows fetch first ? rows only";
    // 잡아 둔 SQL을 그대로 다시 실행해 DB가 몇 행을 돌려주는지 센다(행 수 제한의 ?에는 실제로 준 값 0과 max를 넣는다)
    static int rows(EntityManager em, String sql, int max) {
        return em.createNativeQuery(sql.replace(LIMIT, "offset 0 rows fetch first " + max + " rows only")).getResultList().size();
    }
    // 행 수 제한이 SQL의 어디에 있는가: none 없음, outer 바깥 쿼리 끝, subquery 안쪽 서브쿼리
    static String limitAt(String sql) {
        if (!sql.contains(LIMIT)) return sql.contains("limit") || sql.contains("rownum") || sql.contains("row_number") ? "other" : "none";
        return sql.endsWith(LIMIT) ? "outer" : "subquery";
    }

    static String run(String q, boolean page) {
        try (SessionFactory sf = factory(false)) {
            SQL.clear(); WARN.clear();
            String ex = "none", exAt = "none", msg = "", ids = "-", limit = "-";
            int size = -1, rows = -1, firstComments = -1, mainSql = 0; long extra = -1;
            boolean join = false, commentCols = false, firstInit = false;
            EntityManager em = sf.createEntityManager();
            em.getTransaction().begin();
            String step = "createQuery";
            try {
                TypedQuery<Post> query = em.createQuery(jpql(q), Post.class);
                if (page) query.setFirstResult(0).setMaxResults(1);
                step = "getResultList";
                List<Post> posts = query.getResultList();
                size = posts.size(); mainSql = SQL.size();
                StringBuilder sb = new StringBuilder();
                for (Post p : posts) sb.append(sb.length() > 0 ? "," : "").append(p.getId());
                ids = sb.toString();
                String first = SQL.get(0);
                join = first.contains(" join ");
                Matcher m = COMMENT_ALIAS.matcher(first);
                commentCols = m.find() && first.substring(0, first.indexOf(" from ")).contains(m.group(1) + ".");
                limit = limitAt(first);
                step = "use";
                firstInit = Hibernate.isInitialized(posts.get(0).getComments());
                for (Post p : posts) p.getComments().size();        // 조회한 게시글마다 댓글을 사용한다
                firstComments = posts.get(0).getComments().size();
                extra = SQL.size() - mainSql;
                em.getTransaction().commit();
                rows = rows(em, first, 1);
            } catch (Exception e) {
                ex = chain(e); exAt = step; msg = String.valueOf(e.getMessage()).replaceAll("\\s+", " ");
                if (msg.length() > 160) msg = msg.substring(0, 160);
                if (em.getTransaction().isActive()) em.getTransaction().rollback();
            } finally { em.close(); }
            String warn = "none";
            for (String w : WARN) if (w.contains("HHH90003004")) warn = "HHH90003004";
            return "size=" + size + "|ids=" + ids + "|rows=" + rows + "|mainSql=" + mainSql + "|join=" + join + "|commentCols=" + commentCols + "|limit=" + limit + "|commentsLoaded=" + firstInit
                + "|extraSelects=" + extra + "|firstPostComments=" + firstComments + "|warn=" + warn + "|ex=" + ex + "|exAt=" + exAt + "|msg=" + msg + (mainSql == 0 ? "" : "|sql=" + SQL.get(0));
        }
    }

    public static void main(String[] args) throws Exception {
        // 경고 로그를 잡는다(메모리에서 페이징할 때 Hibernate가 내는 경고 HHH90003004를 확인하려는 것)
        Logger root = (Logger) LoggerFactory.getLogger(org.slf4j.Logger.ROOT_LOGGER_NAME);
        root.setLevel(Level.WARN);
        AppenderBase<ILoggingEvent> app = new AppenderBase<>() {
            @Override protected void append(ILoggingEvent e) { if (e.getLevel().isGreaterOrEqual(Level.WARN)) WARN.add(e.getFormattedMessage().replaceAll("\\s+", " ")); }
        };
        app.setContext(root.getLoggerContext()); app.start(); root.addAppender(app);

        List<String> out = new ArrayList<>();
        out.add("# hibernate " + org.hibernate.Version.getVersionString());
        for (String q : new String[] { "plain", "table", "join", "fetch", "fetchsort", "two" })
            for (boolean page : new boolean[] { false, true }) out.add(q + "|" + page + " => " + run(q, page));

        // 아래는 모형의 결과 표에는 쓰지 않고 설명 글의 근거로 쓰는 것들
        // 1) 두 번째 컬렉션을 Set으로 바꾸면 컬렉션 두 개의 페치 조인이 실행되는가, 행 수와 List 쪽의 크기는 어떤가
        try (SessionFactory sf = factory(true); EntityManager em = sf.createEntityManager()) {
            SQL.clear();
            String ex = "none"; int size = -1, rows = -1, c1 = -1, f1 = -1;
            try {
                List<PostS> posts = em.createQuery(jpql("two"), PostS.class).getResultList();
                size = posts.size(); c1 = posts.get(0).comments.size(); f1 = posts.get(0).files.size();
                rows = rows(em, SQL.get(0), 1);
            } catch (Exception e) { ex = chain(e); }
            out.add("# extra two(files가 Set) => ex=" + ex + "|size=" + size + "|rows=" + rows + "|게시글1의 comments 크기=" + c1 + "|게시글1의 files 크기=" + f1);
        }
        // 2) 그냥 join에 페이징을 걸고 두 번째 페이지를 달라고 하면 어느 게시글이 나오는가
        try (SessionFactory sf = factory(false); EntityManager em = sf.createEntityManager()) {
            List<Post> second = em.createQuery(jpql("join"), Post.class).setFirstResult(1).setMaxResults(1).getResultList();
            out.add("# extra join 두 번째 페이지(first=1,max=1) => ids=" + (second.isEmpty() ? "-" : String.valueOf(second.get(0).getId())));
        }
        // 3) 엔티티가 아니라 값(p.title)을 조회하면 조인으로 늘어난 행이 합쳐지는가
        try (SessionFactory sf = factory(false); EntityManager em = sf.createEntityManager()) {
            out.add("# extra select p.title ... join p.comments => size=" + em.createQuery("select p.title from Post p join p.comments c", String.class).getResultList().size());
        }
        // 4) 같은 SessionFactory에서 같은 JPQL을 페이징 없이 먼저 실행한 뒤 페이징을 걸어 실행하면
        try (SessionFactory sf = factory(false)) {
            int a, b; String lim;
            try (EntityManager em = sf.createEntityManager()) { a = em.createQuery(jpql("fetch"), Post.class).getResultList().size(); }
            SQL.clear();
            try (EntityManager em = sf.createEntityManager()) { b = em.createQuery(jpql("fetch"), Post.class).setFirstResult(0).setMaxResults(1).getResultList().size(); lim = limitAt(SQL.get(0)); }
            out.add("# extra 같은 JPQL을 페이징 없이 실행(size=" + a + ")한 뒤 max=1로 실행 => size=" + b + "|limit=" + lim);
        }
        // 5) 페치 조인한 컬렉션에 where 조건을 걸고 페이징하면
        try (SessionFactory sf = factory(false); EntityManager em = sf.createEntityManager()) {
            String ex = "none"; int size = -1;
            try { size = em.createQuery("select p from Post p join fetch p.comments c where c.id > 1 order by p.id", Post.class).setFirstResult(0).setMaxResults(1).getResultList().size(); } catch (Exception e) { ex = chain(e); }
            out.add("# extra join fetch + where c.id > 1 + 페이징 => size=" + size + "|ex=" + ex);
        }
        Files.write(Path.of(args[0]), out, StandardCharsets.UTF_8);
        System.out.println(out.get(0) + " | " + out.stream().filter(l -> !l.startsWith("#")).count() + " combos");
    }
}

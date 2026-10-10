import jakarta.persistence.Entity;
import jakarta.persistence.EntityManager;
import jakarta.persistence.Id;
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

// "벌크 연산" 실습의 조합(방법 3 x 그 뒤에 하는 일 5 x 먼저 고쳐 둔 변경 2 x 상품 수 3)을 실제 Hibernate + H2에서 실행한다.
// "하나씩 고치기"에서는 "그 뒤에 하는 일" 설정을 쓰지 않으므로(화면에서도 숨긴다) 그 조합은 한 번만 실행한다. 모두 66줄.
// 조합마다 나간 SQL을 순서대로 적고(S 조회, U1 한 행 UPDATE, UB 벌크 UPDATE, DB 벌크 DELETE), 메모리에서 읽은 값, DB에 남은 값, 예외를 적는다.
public class BulkProbe {
    static final List<String> SQL = new ArrayList<>();
    public static class Capture implements StatementInspector {
        @Override public String inspect(String sql) { SQL.add(sql.toLowerCase(Locale.ROOT)); return sql; }
    }

    @Entity(name = "Item") @Table(name = "item")
    public static class Item {
        @Id Long id; String name; int price;
        public Item() { }
        public Item(Long id, String name, int price) { this.id = id; this.name = name; this.price = price; }
        public int getPrice() { return price; }
        public void setPrice(int price) { this.price = price; }
    }

    // 비교용: cascade = ALL, orphanRemoval = true인 부모(Shelf)와 자식(Book). 벌크 DELETE가 이 설정을 따르는지 본다
    @Entity(name = "Shelf") @Table(name = "shelf")
    public static class Shelf {
        @Id Long id;
        @jakarta.persistence.OneToMany(mappedBy = "shelf", cascade = jakarta.persistence.CascadeType.ALL, orphanRemoval = true) List<Book> books = new ArrayList<>();
        public Shelf() { }
        public Shelf(Long id) { this.id = id; }
    }
    @Entity(name = "Book") @Table(name = "book")
    public static class Book {
        @Id Long id;
        @jakarta.persistence.ManyToOne(fetch = jakarta.persistence.FetchType.LAZY) Shelf shelf;
        public Book() { }
        public Book(Long id, Shelf shelf) { this.id = id; this.shelf = shelf; }
    }

    static SessionFactory factory() {
        Configuration cfg = new Configuration().addAnnotatedClass(Item.class).addAnnotatedClass(Shelf.class).addAnnotatedClass(Book.class);
        cfg.setProperty("hibernate.connection.url", "jdbc:h2:mem:bulk;DB_CLOSE_DELAY=-1");
        cfg.setProperty("hibernate.hbm2ddl.auto", "create-drop");
        cfg.setProperty("hibernate.session_factory.statement_inspector", Capture.class.getName());
        return cfg.buildSessionFactory();
    }
    static String kind(String s) {
        if (s.startsWith("select")) return "S";
        if (s.startsWith("update")) return s.contains("where id=?") ? "U1" : "UB";
        if (s.startsWith("delete")) return s.contains("where id=?") ? "D1" : "DB";
        return "?";
    }
    static String seq(int from) { StringBuilder sb = new StringBuilder(); for (int i = from; i < SQL.size(); i++) sb.append(sb.length() > 0 ? "," : "").append(kind(SQL.get(i))); return sb.length() == 0 ? "-" : sb.toString(); }
    static String chain(Throwable t) {
        StringBuilder sb = new StringBuilder();
        for (Throwable x = t; x != null && sb.length() < 300; x = x.getCause()) sb.append(sb.length() > 0 ? " <- " : "").append(x.getClass().getSimpleName());
        return sb.toString();
    }

    static String run(SessionFactory sf, String op, String after, boolean dirty, int n) {
        try (EntityManager em = sf.createEntityManager()) {
            em.getTransaction().begin();
            em.createNativeQuery("delete from item").executeUpdate();
            for (long i = 1; i <= n; i++) em.persist(new Item(i, "상품" + i, (int) (1000 * i)));
            em.getTransaction().commit();
        }
        SQL.clear();
        String read = "-", readEx = "none", commitEx = "none", contains = "-";
        int changed = -1, afterLoad, afterOp, afterRead;
        EntityManager em = sf.createEntityManager();
        try {
            em.getTransaction().begin();
            List<Item> items = em.createQuery("select i from Item i order by i.id", Item.class).getResultList();
            Item first = items.get(0);
            if (dirty) first.setPrice(5000);                    // 먼저 고쳐 둔 변경. 아직 SQL은 나가지 않는다
            afterLoad = SQL.size();
            if (op.equals("update")) changed = em.createQuery("update Item i set i.price = i.price + 500").executeUpdate();
            else if (op.equals("delete")) changed = em.createQuery("delete from Item i").executeUpdate();
            else for (Item i : items) i.setPrice(i.getPrice() + 500);
            afterOp = SQL.size();
            try {
                if (op.equals("each") || after.equals("none")) read = String.valueOf(first.getPrice());
                else if (after.equals("find")) { Item f = em.find(Item.class, 1L); read = f == null ? "null" : f.getPrice() + (f == first ? "" : "(다른 객체)"); }
                else if (after.equals("jpql")) { List<Item> again = em.createQuery("select i from Item i order by i.id", Item.class).getResultList(); read = again.isEmpty() ? "empty" : again.get(0).getPrice() + (again.get(0) == first ? "" : "(다른 객체)"); }
                else if (after.equals("clear")) { em.clear(); Item f = em.find(Item.class, 1L); read = f == null ? "null" : String.valueOf(f.getPrice()); }
                else { em.refresh(first); read = String.valueOf(first.getPrice()); }
            } catch (Exception e) { readEx = chain(e); }
            afterRead = SQL.size();
            try { contains = String.valueOf(em.contains(first)); } catch (Exception e) { contains = "ex"; }
            try { em.getTransaction().commit(); } catch (Exception e) { commitEx = chain(e); if (em.getTransaction().isActive()) em.getTransaction().rollback(); }
        } finally { em.close(); }
        String s = "load=" + seq(0).split(",")[0] + "|atOp=" + seqRange(afterLoad, afterOp) + "|atRead=" + seqRange(afterOp, afterRead) + "|atCommit=" + seqRange(afterRead, SQL.size()) + "|total=" + SQL.size();
        String db;
        try (EntityManager em2 = sf.createEntityManager()) {
            List<?> r = em2.createNativeQuery("select price from item where id = 1").getResultList();
            Number cnt = (Number) em2.createNativeQuery("select count(*) from item").getSingleResult();
            db = (r.isEmpty() ? "none" : String.valueOf(r.get(0))) + "|dbRows=" + cnt;
        }
        return s + "|changed=" + changed + "|read=" + read + "|readEx=" + readEx + "|contains=" + contains + "|commitEx=" + commitEx + "|db=" + db;
    }
    static String seqRange(int from, int to) { StringBuilder sb = new StringBuilder(); for (int i = from; i < to; i++) sb.append(sb.length() > 0 ? "," : "").append(kind(SQL.get(i))); return sb.length() == 0 ? "-" : sb.toString(); }

    public static void main(String[] args) throws Exception {
        List<String> out = new ArrayList<>();
        out.add("# hibernate " + org.hibernate.Version.getVersionString());
        try (SessionFactory sf = factory()) {
            for (String op : new String[] { "update", "delete", "each" })
                for (String after : op.equals("each") ? new String[] { "none" } : new String[] { "none", "find", "jpql", "clear", "refresh" })
                    for (boolean dirty : new boolean[] { false, true })
                        for (int n : new int[] { 2, 3, 8 }) out.add(op + "|" + after + "|" + dirty + "|" + n + " => " + run(sf, op, after, dirty, n));

            // 아래는 모형의 결과 표에는 쓰지 않고 설명 글의 근거로 쓰는 것: 벌크 DELETE는 cascade와 orphanRemoval을 따르는가
            try (EntityManager em = sf.createEntityManager()) {
                em.getTransaction().begin();
                Shelf s = new Shelf(1L); s.books.add(new Book(1L, s)); s.books.add(new Book(2L, s));
                em.persist(s);                                  // cascade = ALL이라 책 둘도 함께 저장된다
                em.getTransaction().commit();
            }
            SQL.clear();
            String ex = "none";
            EntityManager em = sf.createEntityManager();
            try {
                em.getTransaction().begin();
                em.createQuery("delete from Shelf s").executeUpdate();
                em.getTransaction().commit();
            } catch (Exception e) { ex = chain(e); if (em.getTransaction().isActive()) em.getTransaction().rollback(); }
            finally { em.close(); }
            String sent = String.join(" ; ", SQL);                  // 벌크 DELETE 때 실제로 나간 SQL
            long shelves, books;
            try (EntityManager em2 = sf.createEntityManager()) {
                shelves = ((Number) em2.createNativeQuery("select count(*) from shelf").getSingleResult()).longValue();
                books = ((Number) em2.createNativeQuery("select count(*) from book").getSingleResult()).longValue();
            }
            out.add("# extra 자식이 있는 부모(cascade ALL, orphanRemoval)를 벌크 DELETE => sql=" + sent + "|ex=" + ex + "|남은 부모=" + shelves + "|남은 자식=" + books);
        }
        Files.write(Path.of(args[0]), out, StandardCharsets.UTF_8);
        System.out.println(out.get(0) + " | " + out.stream().filter(l -> !l.startsWith("#")).count() + " combos");
    }
}

import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;
import java.util.ArrayList;
import java.util.List;

// "NoSQL과 문서 모델" 실습의 조합(저장 방식 2 x 하는 일 4 x 주문 수)을 실제 MySQL 8.4에서 실행한다.
// 관계형은 테이블 셋(product, orders, order_item)으로, 문서 모델은 JSON 컬럼 하나짜리 테이블(order_doc)로 재현한다.
// 전용 문서 DB(MongoDB 등)는 이 PC에 없어 실행하지 않았다.
// 출력 한 줄: 저장 방식|하는 일|주문 수 => 오류 코드(없으면 0)|값 1|값 2|값 3|부가 정보   (값의 뜻은 하는 일마다 다르다. 아래 주석)
public class NoSqlProbe {
    static final String BASE = "jdbc:mysql://127.0.0.1:3307/", OPT = "?allowPublicKeyRetrieval=true&useSSL=false&characterEncoding=UTF-8";
    static Connection open(String db) throws Exception { return DriverManager.getConnection(BASE + db + OPT, "root", "labtest"); }
    static void exec(Connection c, String sql) throws Exception { try (Statement s = c.createStatement()) { s.execute(sql); } }
    static int upd(Connection c, String sql) throws Exception { try (Statement s = c.createStatement()) { return s.executeUpdate(sql); } }
    static String one(Connection c, String sql) throws Exception { try (Statement s = c.createStatement(); ResultSet r = s.executeQuery(sql)) { return r.next() && r.getString(1) != null ? r.getString(1) : "NULL"; } }
    static int rows(Connection c, String sql) throws Exception { int n = 0; try (Statement s = c.createStatement(); ResultSet r = s.executeQuery(sql)) { while (r.next()) n++; } return n; }
    static String tryExec(Connection c, String sql) throws Exception { try { exec(c, sql); return "0"; } catch (SQLException e) { return e.getErrorCode() + ":" + e.getMessage(); } }
    static long handler(Connection c) throws Exception { long n = 0; try (Statement s = c.createStatement(); ResultSet r = s.executeQuery("show session status like 'Handler_read%'")) { while (r.next()) n += Long.parseLong(r.getString(2)); } return n; }

    static final String[] WHO = { "kim", "lee", "park", "choi", "jung" };
    static final String JOIN = "SELECT o.id, o.member, p.name, i.qty FROM orders o JOIN order_item i ON i.order_id = o.id JOIN product p ON p.id = i.product_id";
    static final String FIND = "JSON_SEARCH(doc, 'one', '키보드', NULL, '$.items[*].name')";
    static final String SUM_DOC = "SELECT SUM(j.qty) FROM order_doc, JSON_TABLE(doc, '$.items[*]' COLUMNS (qty INT PATH '$.qty')) j";

    // 주문 n건을 넣는다. 주문마다 키보드(상품 1) 1개와 마우스(상품 2) 2개
    static void setup(Connection c, int n) throws Exception {
        exec(c, "drop table if exists order_item"); exec(c, "drop table if exists orders"); exec(c, "drop table if exists product"); exec(c, "drop table if exists order_doc");
        exec(c, "CREATE TABLE product (id INT PRIMARY KEY, name VARCHAR(50) NOT NULL)");
        exec(c, "CREATE TABLE orders (id INT PRIMARY KEY, member VARCHAR(20) NOT NULL)");
        exec(c, "CREATE TABLE order_item (order_id INT NOT NULL, product_id INT NOT NULL, qty INT NOT NULL, PRIMARY KEY (order_id, product_id))");
        exec(c, "CREATE TABLE order_doc (id INT PRIMARY KEY, doc JSON NOT NULL)");
        exec(c, "INSERT INTO product VALUES (1, '키보드'), (2, '마우스')");
        for (int i = 1; i <= n; i++) {
            exec(c, "INSERT INTO orders VALUES (" + i + ", '" + WHO[i - 1] + "')");
            exec(c, "INSERT INTO order_item VALUES (" + i + ", 1, 1), (" + i + ", 2, 2)");
            exec(c, "INSERT INTO order_doc VALUES (" + i + ", '{\"member\": \"" + WHO[i - 1] + "\", \"items\": [{\"product_id\": 1, \"name\": \"키보드\", \"qty\": 1}, {\"product_id\": 2, \"name\": \"마우스\", \"qty\": 2}]}')");
        }
    }

    static String run(Connection c, String model, String op, int n) throws Exception {
        setup(c, n);
        boolean rel = model.equals("rel"); int next = n + 1;
        String err = "0", a = "-", b = "-", d = "-", extra = "";
        if (op.equals("read")) {
            // 값 1 = EXPLAIN에 나오는 테이블 수, 값 2 = 결과 행 수, 값 3 = 얻은 항목 수
            String q = rel ? JOIN + " WHERE o.id = 1" : "SELECT doc FROM order_doc WHERE id = 1";
            a = String.valueOf(rows(c, "explain " + q));
            long h0 = handler(c); int got = rows(c, q); long h1 = handler(c);
            b = String.valueOf(got); d = rel ? String.valueOf(got) : one(c, "SELECT JSON_LENGTH(doc, '$.items') FROM order_doc WHERE id = 1");
            extra = "이 PC에서 본 Handler_read 합계 증가=" + (h1 - h0);
        } else if (op.equals("rename")) {
            // 값 1 = 고친 행(문서) 수, 값 2 = 새 이름으로 보이는 주문 수, 값 3 = 옛 이름으로 보이는 주문 수
            a = String.valueOf(rel ? upd(c, "UPDATE product SET name = '기계식 키보드' WHERE id = 1") : upd(c, "UPDATE order_doc SET doc = JSON_SET(doc, JSON_UNQUOTE(" + FIND + "), '기계식 키보드') WHERE " + FIND + " IS NOT NULL"));
            b = rel ? one(c, "SELECT COUNT(DISTINCT o.id) FROM orders o JOIN order_item i ON i.order_id = o.id JOIN product p ON p.id = i.product_id WHERE p.name = '기계식 키보드'") : one(c, "SELECT COUNT(*) FROM order_doc WHERE JSON_SEARCH(doc, 'one', '기계식 키보드', NULL, '$.items[*].name') IS NOT NULL");
            d = rel ? one(c, "SELECT COUNT(DISTINCT o.id) FROM orders o JOIN order_item i ON i.order_id = o.id JOIN product p ON p.id = i.product_id WHERE p.name = '키보드'") : one(c, "SELECT COUNT(*) FROM order_doc WHERE " + FIND + " IS NOT NULL");
        } else if (op.equals("newfield")) {
            // 값 1 = 실행 뒤 주문(문서) 수, 값 2 = gift가 있는 주문(문서) 수
            String r = rel ? tryExec(c, "INSERT INTO orders (id, member, gift) VALUES (" + next + ", 'han', TRUE)") : tryExec(c, "INSERT INTO order_doc VALUES (" + next + ", '{\"member\": \"han\", \"gift\": true, \"items\": [{\"product_id\": 2, \"name\": \"마우스\", \"qty\": 1}]}')");
            err = r.split(":")[0]; if (!err.equals("0")) extra = r.substring(r.indexOf(':') + 1);
            a = one(c, "SELECT COUNT(*) FROM " + (rel ? "orders" : "order_doc"));
            b = rel ? "0" : one(c, "SELECT COUNT(*) FROM order_doc WHERE JSON_CONTAINS_PATH(doc, 'one', '$.gift')");
            if (rel) {   // 구조를 바꾼 뒤에는 저장된다. 그리고 기존 주문에도 gift 칸이 생긴다
                exec(c, "ALTER TABLE orders ADD COLUMN gift BOOLEAN NOT NULL DEFAULT FALSE");
                extra += " | ALTER TABLE 뒤 같은 INSERT=" + tryExec(c, "INSERT INTO orders (id, member, gift) VALUES (" + next + ", 'han', TRUE)") + ",gift 칸이 있는 주문=" + one(c, "SELECT COUNT(*) FROM orders WHERE gift IS NOT NULL") + ",gift가 참인 주문=" + one(c, "SELECT COUNT(*) FROM orders WHERE gift");
            } else extra = "gift가 없는 문서에서 읽은 값=" + one(c, "SELECT doc->>'$.gift' FROM order_doc WHERE id = 1");
        } else {
            // 값 1 = 실행 뒤 주문(문서) 수, 값 2 = 수량 합계, 값 3 = 실제로 주문된 수량(넣으려던 3개를 포함)
            String r = rel ? tryExec(c, "INSERT INTO order_item (order_id, product_id, quantity) VALUES (" + next + ", 1, 3)") : tryExec(c, "INSERT INTO order_doc VALUES (" + next + ", '{\"member\": \"han\", \"items\": [{\"product_id\": 1, \"name\": \"키보드\", \"quantity\": 3}]}')");
            err = r.split(":")[0]; if (!err.equals("0")) extra = r.substring(r.indexOf(':') + 1);
            a = one(c, rel ? "SELECT COUNT(DISTINCT order_id) FROM order_item" : "SELECT COUNT(*) FROM order_doc");
            b = one(c, rel ? "SELECT SUM(qty) FROM order_item" : SUM_DOC);
            d = String.valueOf(3 * n + (err.equals("0") ? 3 : 0));
        }
        return model + "|" + op + "|" + n + " => " + err + "|" + a + "|" + b + "|" + d + "|" + extra;
    }

    public static void main(String[] args) throws Exception {
        List<String> out = new ArrayList<>();
        try (Connection r = open("")) { exec(r, "create database if not exists lab_nosql"); }
        try (Connection c = open("lab_nosql")) {
            out.add("# mysql " + one(c, "select version()") + " | 문서 모델은 JSON 컬럼으로 재현. 전용 문서 DB는 실행하지 않음");
            for (String model : new String[] { "rel", "doc" }) {
                out.add(run(c, model, "read", 3));
                for (String op : new String[] { "rename", "newfield", "typo" }) for (int n : new int[] { 2, 3, 5 }) out.add(run(c, model, op, n));
            }
            // 화면의 설명에 쓴 그 밖의 사실
            setup(c, 3);
            out.add("extra separate => 조인 없이 테이블마다 따로 읽으면 쿼리 3번: orders " + rows(c, "SELECT * FROM orders WHERE id = 1") + "행, order_item " + rows(c, "SELECT * FROM order_item WHERE order_id = 1") + "행, product " + rows(c, "SELECT * FROM product WHERE id IN (1, 2)") + "행");
            // JSON 컬럼에도 모양을 검사하는 제약을 걸 수 있다: 필드 이름을 틀린 문서가 거절된다
            exec(c, "ALTER TABLE order_doc ADD CONSTRAINT chk_shape CHECK (JSON_SCHEMA_VALID('{\"type\": \"object\", \"required\": [\"member\", \"items\"], \"properties\": {\"items\": {\"type\": \"array\", \"items\": {\"type\": \"object\", \"required\": [\"product_id\", \"name\", \"qty\"]}}}}', doc))");
            String r = tryExec(c, "INSERT INTO order_doc VALUES (4, '{\"member\": \"han\", \"items\": [{\"product_id\": 1, \"name\": \"키보드\", \"quantity\": 3}]}')");
            out.add("extra schemacheck => " + r.split(":")[0] + " | 올바른 문서는 " + tryExec(c, "INSERT INTO order_doc VALUES (5, '{\"member\": \"han\", \"items\": [{\"product_id\": 1, \"name\": \"키보드\", \"qty\": 3}]}')"));
            // 문서 일부만 고치고 멈추면 같은 상품이 문서마다 다른 이름으로 남는다
            setup(c, 3);
            upd(c, "UPDATE order_doc SET doc = JSON_SET(doc, JSON_UNQUOTE(" + FIND + "), '기계식 키보드') WHERE id = 1");
            out.add("extra partial => 문서 1개만 고친 뒤 상품 1의 이름 종류=" + one(c, "SELECT GROUP_CONCAT(DISTINCT j.name ORDER BY j.name) FROM order_doc, JSON_TABLE(doc, '$.items[*]' COLUMNS (pid INT PATH '$.product_id', name VARCHAR(50) PATH '$.name')) j WHERE j.pid = 1"));
            exec(c, "drop table if exists order_item"); exec(c, "drop table if exists orders"); exec(c, "drop table if exists product"); exec(c, "drop table if exists order_doc");
        }
        Files.write(Path.of(args[0]), out, StandardCharsets.UTF_8);
        out.forEach(System.out::println);
    }
}

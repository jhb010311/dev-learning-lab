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

// "뷰, 프로시저, 트리거" 실습의 열두 가지 조합을 실제 MySQL 8.4(InnoDB, 자동 커밋)에서 실행한다.
// 조합마다 테이블, 뷰, 복사본 테이블, 프로시저, 트리거를 새로 만들고, 주문 문장 하나를 실행한 뒤 각 테이블의 상태를 읽는다.
public class ViewProcProbe {
    static final String URL = "jdbc:mysql://127.0.0.1:3307/?allowPublicKeyRetrieval=true&useSSL=false&characterEncoding=UTF-8";
    static void exec(Connection c, String sql) throws Exception { try (Statement s = c.createStatement()) { s.execute(sql); } }
    static String one(Connection c, String sql) throws Exception { try (Statement s = c.createStatement(); ResultSet rs = s.executeQuery(sql)) { return rs.next() ? String.valueOf(rs.getString(1)) : "(없음)"; } }

    // 조합마다 테이블, 뷰, 복사본, 프로시저, 트리거를 새로 만든다
    static void setup(Connection c, String how, boolean trig) throws Exception {
        exec(c, "drop view if exists v_stock");
        exec(c, "drop procedure if exists place_order");
        exec(c, "drop table if exists orders, stock_log, stock_copy, product");
        exec(c, "create table product(id int primary key, name varchar(20) not null, stock int not null, constraint chk_stock check (stock >= 0)) engine=InnoDB");
        exec(c, "create table orders(id int auto_increment primary key, product_id int not null, qty int not null) engine=InnoDB");
        exec(c, "create table stock_log(id int auto_increment primary key, product_id int not null, change_qty int not null, memo varchar(40)) engine=InnoDB");
        exec(c, "insert into product values (1, '키보드', 10)");
        // 뷰: 쿼리만 저장한다. 복사본: 지금의 결과를 새 테이블에 저장한다.
        exec(c, "create view v_stock as select name, stock from product");
        exec(c, "create table stock_copy as select name, stock from product");
        if (how.equals("proc"))
            exec(c, "create procedure place_order(in p_product int, in p_qty int)\nbegin\n"
                    + "  update product set stock = stock - p_qty where id = p_product;\n"
                    + "  insert into orders(product_id, qty) values (p_product, p_qty);\n"
                    + "  insert into stock_log(product_id, change_qty, memo) values (p_product, -p_qty, '프로시저');\nend");
        if (trig)
            exec(c, "create trigger trg_order_stock after insert on orders for each row\nbegin\n"
                    + "  update product set stock = stock - new.qty where id = new.product_id;\n"
                    + "  insert into stock_log(product_id, change_qty, memo) values (new.product_id, -new.qty, '트리거');\nend");
    }

    public static void main(String[] args) throws Exception {
        List<String> out = new ArrayList<>();
        try (Connection c = DriverManager.getConnection(URL, "root", "labtest")) {
            exec(c, "create database if not exists lab_viewproc");
            c.setCatalog("lab_viewproc");
            out.add("# mysql " + one(c, "select version()") + " | autocommit=" + one(c, "select @@autocommit") + " | product 1행(재고 10), 주문 문장 하나 실행");
            for (String how : new String[] { "insert", "proc" })
                for (boolean trig : new boolean[] { false, true })
                    for (int qty : new int[] { 3, 6, 12 }) {
                        setup(c, how, trig);
                        String viewBefore = one(c, "select stock from v_stock");
                        String result = "ok";
                        try { exec(c, how.equals("proc") ? "call place_order(1, " + qty + ")" : "insert into orders(product_id, qty) values (1, " + qty + ")"); }
                        catch (SQLException e) { result = "error " + e.getErrorCode() + " " + e.getMessage(); }
                        out.add(how + "|" + trig + "|" + qty + " => result=" + result
                                + "|orders=" + one(c, "select count(*) from orders")
                                + "|stock=" + one(c, "select stock from product where id = 1")
                                + "|log=" + one(c, "select count(*) from stock_log")
                                + "|memo=" + one(c, "select coalesce(group_concat(memo order by id), '') from stock_log")
                                + "|viewBefore=" + viewBefore
                                + "|view=" + one(c, "select stock from v_stock")
                                + "|copy=" + one(c, "select stock from stock_copy")
                                + "|viewType=" + one(c, "select concat(table_type, '/', coalesce(engine, 'NULL')) from information_schema.tables where table_schema = 'lab_viewproc' and table_name = 'v_stock'")
                                + "|copyType=" + one(c, "select concat(table_type, '/', coalesce(engine, 'NULL')) from information_schema.tables where table_schema = 'lab_viewproc' and table_name = 'stock_copy'"));
                    }
            // 덧붙인 확인: 같은 CALL을 트랜잭션 안에서 실행하고 오류가 나면 ROLLBACK하면 재고가 돌아오는가
            setup(c, "proc", true);
            c.setAutoCommit(false);
            String r = "ok";
            try { exec(c, "call place_order(1, 6)"); c.commit(); } catch (SQLException e) { r = "error " + e.getErrorCode(); c.rollback(); }
            c.setAutoCommit(true);
            out.add("# tx-check proc|true|6 (트랜잭션 안에서 CALL, 오류 시 ROLLBACK) => result=" + r + "|orders=" + one(c, "select count(*) from orders") + "|stock=" + one(c, "select stock from product where id = 1") + "|log=" + one(c, "select count(*) from stock_log"));
            exec(c, "drop view if exists v_stock");
            exec(c, "drop procedure if exists place_order");
            exec(c, "drop table if exists orders, stock_log, stock_copy, product");
        }
        Files.write(Path.of(args[0]), out, StandardCharsets.UTF_8);
        out.forEach(System.out::println);
    }
}

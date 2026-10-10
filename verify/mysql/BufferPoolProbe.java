import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.ResultSet;
import java.sql.Statement;
import java.util.ArrayList;
import java.util.List;

// "버퍼 풀과 페이지" 실습을 실제 MySQL 8.4(InnoDB)에서 확인한다. lab_bufferpool 데이터베이스만 쓰고 전역 설정은 바꾸지 않는다.
// 1) 행 16개(행 하나가 약 3.5KB라서 16KB 페이지 하나에 4개씩 들어간다)짜리 작은 테이블을 장면마다 하나씩 만든다.
// 2) 다른 테이블(filler)에 행을 계속 넣어 버퍼 풀을 채운다. 그동안 건드리지 않은 작은 테이블의 페이지는 버퍼 풀에서 밀려나고,
//    계속 읽은 테이블(hot_t)의 페이지는 남는지 본다. 어느 페이지가 버퍼 풀에 있는지는 information_schema.innodb_buffer_page로 본다.
// 3) 밀려나서 버퍼 풀에 없는 테이블에 화면과 같은 순서로 조회와 수정을 실행하고, 문장마다 그 테이블의 데이터 파일을
//    실제로 몇 번 읽고 썼는지(performance_schema.file_summary_by_instance)와 새로 올라온 페이지 수를 적는다.
// 출력 한 줄: 조회 순서|수정 여부 => 조회마다 디스크에서 읽었는지(M) 아닌지(H)|수정 문장의 디스크 읽기|커밋 직후 더티 페이지 수|커밋 직후 데이터 파일 쓰기|나중에 쓰였는지|문장별 기록
public class BufferPoolProbe {
    static final String BASE = "jdbc:mysql://127.0.0.1:3307/", OPT = "?allowPublicKeyRetrieval=true&useSSL=false";
    static Connection open(String db) throws Exception { return DriverManager.getConnection(BASE + db + OPT, "root", "labtest"); }
    static void exec(Connection c, String sql) throws Exception { try (Statement s = c.createStatement()) { s.execute(sql); } }
    static String one(Connection c, String sql) throws Exception { try (Statement s = c.createStatement(); ResultSet r = s.executeQuery(sql)) { return r.next() && r.getString(1) != null ? r.getString(1) : ""; } }
    static long num(Connection c, String sql) throws Exception { String v = one(c, sql); return v.isEmpty() ? 0 : Long.parseLong(v); }
    static long status(Connection c, String name) throws Exception { try (Statement s = c.createStatement(); ResultSet r = s.executeQuery("show global status like '" + name + "'")) { r.next(); return Long.parseLong(r.getString(2)); } }

    static final String COLS = "(id int primary key, name varchar(20) not null, pad varchar(3500) not null) engine=InnoDB";
    static void small(Connection admin, String t) throws Exception {
        exec(admin, "drop table if exists " + t);
        exec(admin, "create table " + t + COLS);
        exec(admin, "insert into " + t + " with recursive s(n) as (select 1 union all select n + 1 from s where n < 16) select n, concat('item', n), repeat('x', 3500) from s");
        exec(admin, "alter table " + t + " engine=InnoDB");   // 다시 지어 잎 페이지마다 4행씩 차게 한다
    }
    static String space(Connection admin, String t) throws Exception { return one(admin, "select space from information_schema.innodb_tablespaces where name = 'lab_bufferpool/" + t + "'"); }
    static String root(Connection admin, String t) throws Exception { return one(admin, "select i.page_no from information_schema.innodb_indexes i join information_schema.innodb_tables t on t.table_id = i.table_id where t.name = 'lab_bufferpool/" + t + "' and i.name = 'PRIMARY'"); }
    // 버퍼 풀에 올라와 있는 그 테이블의 잎 페이지(행이 든 페이지) 번호들. 루트 페이지는 뺀다.
    static String leaves(Connection admin, String t) throws Exception { return one(admin, "select group_concat(page_number order by page_number) from information_schema.innodb_buffer_page where space = " + space(admin, t) + " and page_type = 'INDEX' and page_number <> " + root(admin, t) + " and data_size > 1000"); }
    static int count(String list) { return list.isEmpty() ? 0 : list.split(",").length; }
    static long dirty(Connection admin, String t) throws Exception { return num(admin, "select count(*) from information_schema.innodb_buffer_page where space = " + space(admin, t) + " and page_type = 'INDEX' and oldest_modification > 0"); }
    static long[] file(Connection admin, String t) throws Exception { try (Statement s = admin.createStatement(); ResultSet r = s.executeQuery("select count_read, count_write from performance_schema.file_summary_by_instance where file_name like '%/lab_bufferpool/" + t + ".ibd'")) { r.next(); return new long[] { r.getLong(1), r.getLong(2) }; } }

    public static void main(String[] args) throws Exception {
        List<String> out = new ArrayList<>();
        try (Connection r = open("")) { exec(r, "create database if not exists lab_bufferpool"); }
        try (Connection admin = open("lab_bufferpool"); Connection user = open("lab_bufferpool")) {
            long total = status(admin, "Innodb_buffer_pool_pages_total");
            out.add("# mysql " + one(admin, "select version()") + " | innodb_page_size=" + one(admin, "select @@innodb_page_size") + " | innodb_buffer_pool_size=" + one(admin, "select @@innodb_buffer_pool_size") + " | Innodb_buffer_pool_pages_total=" + total + " | 페이지 수 x 페이지 크기=" + (total * Long.parseLong(one(admin, "select @@innodb_page_size"))));
            String[] seqs = { "same", "spread", "hot" };
            List<String> tables = new ArrayList<>();
            for (String q : seqs) for (String u : new String[] { "r", "u" }) { String t = "item_" + q + "_" + u; small(admin, t); tables.add(t); }
            small(admin, "hot_t");
            exec(admin, "flush tables " + String.join(", ", tables) + ", hot_t for export"); exec(admin, "unlock tables");   // 만든 내용을 디스크에 써 둔다
            StringBuilder lay = new StringBuilder();
            for (String t : tables) lay.append(t).append("=").append(one(admin, "select group_concat(number_records order by page_number) from information_schema.innodb_buffer_page where space = " + space(admin, t) + " and page_type = 'INDEX' and page_number <> " + root(admin, t) + " and data_size > 1000")).append(" ");
            out.add("# 잎 페이지마다 든 행 수(만든 직후): " + lay.toString().trim());
            long free0 = status(admin, "Innodb_buffer_pool_pages_free"), data0 = status(admin, "Innodb_buffer_pool_pages_data");
            int cached0 = 0; for (String t : tables) cached0 += count(leaves(admin, t));

            // 버퍼 풀 채우기: filler에 행을 계속 넣는다. hot_t는 그동안 계속 읽는다(자주 쓰는 페이지). item_* 은 건드리지 않는다(오래 안 쓴 페이지).
            exec(admin, "drop table if exists filler"); exec(admin, "create table filler(id int primary key, pad varchar(3500) not null) engine=InnoDB");
            int rows = 0, cached = cached0; long minFree = free0;
            Thread.sleep(1500);
            while (cached > 0 && rows < 48000) {
                exec(admin, "insert into filler with recursive s(n) as (select 1 union all select n + 1 from s where n < 400) select " + rows + " + n, repeat('y', 3500) from s");
                rows += 400;
                one(user, "select sum(length(name)) from hot_t");
                minFree = Math.min(minFree, status(admin, "Innodb_buffer_pool_pages_free"));
                if (rows % 2000 == 0) { cached = 0; for (String t : tables) cached += count(leaves(admin, t)); }
                Thread.sleep(40);
            }
            long free1 = status(admin, "Innodb_buffer_pool_pages_free"), data1 = status(admin, "Innodb_buffer_pool_pages_data");
            out.add("# 채우기: filler에 " + rows + "행(약 " + (rows / 4) + "페이지)을 넣음 | Innodb_buffer_pool_pages_free " + free0 + " -> " + free1 + " (가장 적었을 때 " + minFree + ") | Innodb_buffer_pool_pages_data " + data0 + " -> " + data1);
            out.add("evict => 건드리지 않은 테이블 6개의 버퍼 풀 안 잎 페이지=" + cached0 + "->" + cached + "|계속 읽은 hot_t의 버퍼 풀 안 잎 페이지=" + count(leaves(admin, "hot_t")) + "|빈 페이지가 가장 적었을 때=" + minFree);

            for (String q : seqs) for (String u : new String[] { "r", "u" }) {
                String t = "item_" + q + "_" + u;
                int[] ids = q.equals("same") ? new int[] { 1, 2, 1 } : q.equals("spread") ? new int[] { 1, 5, 9, 13, 1 } : new int[] { 1, 5, 1, 9, 13, 1 };
                StringBuilder pat = new StringBuilder(), log = new StringBuilder();
                String updRead = "-", dirtyNow = "-", writesNow = "-", later = "-";
                long gr0 = status(admin, "Innodb_buffer_pool_reads"), gq0 = status(admin, "Innodb_buffer_pool_read_requests");
                for (int i = 0; i < ids.length; i++) {
                    long[] f0 = file(admin, t); int l0 = count(leaves(admin, t)); long g0 = status(admin, "Innodb_buffer_pool_reads");
                    String got = one(user, "select name from " + t + " where id = " + ids[i]);
                    long[] f1 = file(admin, t); int l1 = count(leaves(admin, t)); long g1 = status(admin, "Innodb_buffer_pool_reads");
                    pat.append(l1 > l0 ? "M" : "H");
                    log.append("SELECT id=").append(ids[i]).append("(").append(got).append("):파일 읽기+").append(f1[0] - f0[0]).append(",새 잎 페이지+").append(l1 - l0).append(",Innodb_buffer_pool_reads+").append(g1 - g0).append(" ");
                    if (i == 0 && u.equals("u")) {
                        long[] w0 = file(admin, t); long gd0 = status(admin, "Innodb_buffer_pool_pages_dirty");
                        user.setAutoCommit(false); exec(user, "update " + t + " set name = 'changed' where id = 1"); user.commit(); user.setAutoCommit(true);
                        long[] w1 = file(admin, t); long d = dirty(admin, t);
                        updRead = String.valueOf(w1[0] - w0[0]); dirtyNow = String.valueOf(d); writesNow = String.valueOf(w1[1] - w0[1]);
                        log.append("UPDATE id=1+COMMIT:파일 읽기+").append(w1[0] - w0[0]).append(",파일 쓰기+").append(w1[1] - w0[1]).append(",더티 페이지=").append(d).append(",전체 Innodb_buffer_pool_pages_dirty ").append(gd0).append("->").append(status(admin, "Innodb_buffer_pool_pages_dirty")).append(" ");
                    }
                }
                if (u.equals("u")) {
                    // 커밋한 뒤 더티 페이지가 저절로 디스크에 쓰이기를 최대 20초 기다린다. 그래도 남으면 이 테이블만 강제로 쓰게 한다(FLUSH TABLES ... FOR EXPORT).
                    long[] w0 = file(admin, t); long start = System.nanoTime(), gf0 = status(admin, "Innodb_buffer_pool_pages_flushed"); String how = "저절로";
                    while (dirty(admin, t) > 0 && System.nanoTime() - start < 20_000_000_000L) Thread.sleep(250);
                    if (dirty(admin, t) > 0) { how = "20초 안에는 쓰이지 않아 FLUSH TABLES로 강제"; exec(admin, "flush tables " + t + " for export"); exec(admin, "unlock tables"); }
                    long[] w1 = file(admin, t);
                    later = how + "(" + ((System.nanoTime() - start) / 100_000_000L / 10.0) + "초 뒤),파일 쓰기+" + (w1[1] - w0[1]) + ",더티 페이지=" + dirty(admin, t) + ",버퍼 풀 안 잎 페이지=" + count(leaves(admin, t)) + ",전체 Innodb_buffer_pool_pages_flushed+" + (status(admin, "Innodb_buffer_pool_pages_flushed") - gf0);
                }
                log.append("| 전체 Innodb_buffer_pool_reads+").append(status(admin, "Innodb_buffer_pool_reads") - gr0).append(",Innodb_buffer_pool_read_requests+").append(status(admin, "Innodb_buffer_pool_read_requests") - gq0);
                String line = q + "|" + (u.equals("u")) + " => " + pat + "|" + updRead + "|" + dirtyNow + "|" + writesNow + "|" + later + "|" + log.toString().trim();
                out.add(line); System.out.println(line);
            }
            exec(admin, "drop table if exists filler");
            for (String t : tables) exec(admin, "drop table if exists " + t);
            exec(admin, "drop table if exists hot_t");
        }
        Files.write(Path.of(args[0]), out, StandardCharsets.UTF_8);
        out.stream().filter(l -> l.startsWith("#") || l.startsWith("evict")).forEach(System.out::println);
    }
}

import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.ResultSet;
import java.sql.Statement;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;

// "윈도우 함수" 실습의 스물네 가지 조합을 실제 MySQL 8.4에서 실행한다.
// 화면에 나오는 SQL과 같은 문장을 실행하고, 결과 행을 (팀, 점수, 붙은 값) 순서로 정리해 한 줄에 적는다.
// 동점인 행 가운데 어느 행이 먼저 오는지는 정해져 있지 않으므로, 이름이 아니라 (팀, 점수, 값)만 비교 대상으로 삼는다.
public class WindowFnProbe {
    static final String URL = "jdbc:mysql://127.0.0.1:3307/?allowPublicKeyRetrieval=true&useSSL=false&characterEncoding=UTF-8";
    static void exec(Connection c, String sql) throws Exception { try (Statement s = c.createStatement()) { s.execute(sql); } }

    static String fnSql(String fn) {
        return switch (fn) { case "rownum" -> "ROW_NUMBER()"; case "rank" -> "RANK()"; case "dense" -> "DENSE_RANK()"; case "sum" -> "SUM(pts)"; default -> "LAG(pts)"; };
    }
    // 화면의 SQL과 같은 별칭
    static String alias(String fn) {
        return switch (fn) { case "rownum" -> "num"; case "rank", "dense" -> "rnk"; case "sum" -> "running"; default -> "prev"; };
    }

    // 윈도우 함수 쿼리를 실행해 "팀:점수:값" 목록을 돌려준다. frame은 OVER 절 끝에 붙일 프레임 지정(없으면 빈 문자열).
    static List<String> window(Connection c, String fn, boolean part, String frame) throws Exception {
        String sql = "SELECT name, team, pts, " + fnSql(fn) + " OVER (" + (part ? "PARTITION BY team " : "") + "ORDER BY pts DESC" + frame + ") AS " + alias(fn) + " FROM score ORDER BY " + (part ? "team, " : "") + "pts DESC";
        List<String[]> rows = new ArrayList<>();
        try (Statement s = c.createStatement(); ResultSet rs = s.executeQuery(sql)) {
            while (rs.next()) rows.add(new String[] { part ? rs.getString("team") : "", rs.getString("pts"), rs.getString(alias(fn)) == null ? "NULL" : rs.getString(alias(fn)) });
        }
        // 같은 (팀, 점수) 안에서는 값이 작은 것부터(NULL이 맨 앞) 놓아 순서를 고정한다
        Comparator<String[]> cmp = Comparator.<String[], String>comparing(r -> r[0]).thenComparing(r -> -Integer.parseInt(r[1])).thenComparing(r -> r[2].equals("NULL") ? -1 : Integer.parseInt(r[2]));
        rows.sort(cmp);
        List<String> out = new ArrayList<>();
        for (String[] r : rows) out.add((part ? r[0] + ":" : "") + r[1] + ":" + r[2]);
        return out;
    }

    public static void main(String[] args) throws Exception {
        List<String> out = new ArrayList<>();
        try (Connection c = DriverManager.getConnection(URL, "root", "labtest")) {
            exec(c, "create database if not exists lab_windowfn");
            c.setCatalog("lab_windowfn");
            try (Statement s = c.createStatement(); ResultSet rs = s.executeQuery("select version()")) { rs.next(); out.add("# mysql " + rs.getString(1) + " | score 테이블 6행 (A팀 3명, B팀 3명)"); }
            for (String fn : new String[] { "group", "rownum", "rank", "dense", "sum", "lag" })
                for (boolean part : new boolean[] { false, true })
                    for (String tie : new String[] { "yes", "no" }) {
                        exec(c, "drop table if exists score");
                        exec(c, "create table score(id int primary key, name varchar(20), team char(1), pts int) engine=InnoDB");
                        exec(c, "insert into score values (1, '가은', 'A', 90), (2, '나래', 'A', " + (tie.equals("yes") ? 90 : 85) + "), (3, '다솜', 'A', 70), (4, '라온', 'B', 80), (5, '마루', 'B', " + (tie.equals("yes") ? 70 : 75) + "), (6, '바다', 'B', 60)");
                        String line = fn + "|" + part + "|" + tie + " => ";
                        if (fn.equals("group")) {
                            String sql = part ? "SELECT team, SUM(pts) AS total FROM score GROUP BY team ORDER BY team" : "SELECT SUM(pts) AS total FROM score";
                            List<String> vals = new ArrayList<>();
                            try (Statement s = c.createStatement(); ResultSet rs = s.executeQuery(sql)) { while (rs.next()) vals.add((part ? rs.getString("team") + ":" : "") + rs.getString("total")); }
                            line += "rows=" + vals.size() + "|vals=" + String.join(",", vals);
                        } else {
                            List<String> vals = window(c, fn, part, "");
                            line += "rows=" + vals.size() + "|vals=" + String.join(",", vals);
                            // 누계: 행 단위 프레임(ROWS)을 직접 적었을 때의 값도 함께 기록한다(동점 행의 누계가 달라지는지 확인)
                            if (fn.equals("sum")) line += "|rowsframe=" + String.join(",", window(c, fn, part, " ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW"));
                        }
                        out.add(line);
                    }
            exec(c, "drop table if exists score");
        }
        Files.write(Path.of(args[0]), out, StandardCharsets.UTF_8);
        out.forEach(System.out::println);
    }
}

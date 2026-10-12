import java.io.IOException;
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
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Stream;

// 기초개념 "저장과 지속성" 실습을 실제 H2 2.4.240에서 확인한다. 스프링은 쓰지 않는다. 라이브러리는 h2 jar 하나면 된다.
// 조합(COMMIT 줄 2 x 데이터를 두는 곳 2 = 4개)마다 화면에 보이는 SQL 전체를 글자 그대로 쓴다.
//   1. 새 자바 프로세스(run1)가 첫 줄 주석에 적힌 주소로 연결해, "DB 프로그램이 갑자기 꺼졌다가" 줄 앞까지의 문장을 한 문장씩 실행한 뒤
//      연결을 닫지도 정상 종료하지도 않고 Runtime.halt로 프로세스를 바로 끝낸다(종료 코드 7).
//   2. 다시 새 자바 프로세스(run2)가 같은 주소로 연결해 그 줄 뒤의 문장(SELECT)을 실행한다. 행 수나 오류를 그대로 적는다.
// 작업 폴더는 조합마다 verify/out/durable_basic/<조합>/ 이고, 파일 DB 주소의 ./shop 은 이 폴더 안의 파일이다.
// 화면에는 없는 확인용 조회(꺼지기 직전 행 수, 자동 커밋 상태)는 run1이 따로 하고 출력에 남긴다.
// FACT 줄: 화면의 조합이 아닌 참고 실험. H2 기본 설정(쓰기 지연 500ms)으로 COMMIT 직후 바로 끝내면 어떻게 되는지.
public class DurableBasicProbe {
    static final String MID = "-- DB 프로그램이 갑자기";

    // 화면의 코드(실습의 code 함수)와 같은 글. 줄바꿈 \n 으로 잇는다.
    static String sql(boolean commit, String where) {
        List<String> l = new ArrayList<>();
        l.add(where.equals("file") ? "-- 파일에 저장하는 DB(jdbc:h2:file:./shop;WRITE_DELAY=0)에 연결해서" : "-- 메모리에만 두는 DB(jdbc:h2:mem:shop)에 연결해서");
        l.add("CREATE TABLE memo (id INT PRIMARY KEY, text VARCHAR(20));");
        l.add("");
        l.add("-- 시작: 여기서부터를 한 묶음으로 다룬다");
        l.add("BEGIN;");
        l.add("INSERT INTO memo VALUES (1, 'hello');");
        if (commit) {
            l.add("-- 확정: 여기까지의 변경을 남기겠다고 DB에 알린다");
            l.add("COMMIT;");
        }
        l.add("");
        l.add("-- DB 프로그램이 갑자기 꺼졌다가 다시 켜진 뒤, 같은 주소로 연결해서");
        l.add("SELECT * FROM memo;");
        return String.join("\n", l);
    }

    static String clean(String s) { return s == null ? "" : s.replace('|', '¦').replace("\r", "").replace("\n", "\\n"); }

    static String urlOf(String script) {
        Matcher m = Pattern.compile("\\((jdbc:[^)]*)\\)").matcher(script.split("\n")[0]);
        if (!m.find()) throw new IllegalStateException("첫 줄에 주소가 없음");
        return m.group(1);
    }

    // 첫 줄(연결) 뒤의 문장 조각들. 주석 줄은 뒤따르는 문장과 함께 DB에 그대로 보낸다.
    static List<String> stmts(String text, boolean dropFirstLine) {
        String[] lines = text.split("\n");
        StringBuilder b = new StringBuilder();
        for (int i = dropFirstLine ? 1 : 0; i < lines.length; i++) b.append(lines[i]).append('\n');
        List<String> r = new ArrayList<>();
        for (String s : b.toString().split(";")) if (!s.isBlank()) r.add(s.strip());
        return r;
    }

    static String kind(String stmt) {
        StringBuilder b = new StringBuilder();
        for (String ln : stmt.split("\n")) if (!ln.strip().startsWith("--")) b.append(ln).append(' ');
        return b.toString().strip().split("\\s+")[0].toUpperCase();
    }

    static String files(Path dir) throws IOException {
        try (Stream<Path> s = Files.list(dir)) {
            List<String> n = new ArrayList<>();
            s.forEach(p -> { String f = p.getFileName().toString(); if (f.startsWith("shop")) n.add(f); });
            java.util.Collections.sort(n);
            return String.join(",", n);
        }
    }

    // run1: args = run1 <full.sql> <part1.sql> <sleepMs>
    static void run1(String[] a) throws Exception {
        String full = Files.readString(Path.of(a[1]), StandardCharsets.UTF_8), part1 = Files.readString(Path.of(a[2]), StandardCharsets.UTF_8);
        long sleep = Long.parseLong(a[3]);
        StringBuilder f = new StringBuilder();
        Connection c = DriverManager.getConnection(urlOf(full));
        f.append("autoStart=").append(c.getAutoCommit());
        int ok = 0;
        try (Statement st = c.createStatement()) {
            for (String s : stmts(part1, true)) {
                String k = kind(s);
                try { st.execute(s); ok++; } catch (SQLException e) { f.append("|ERR ").append(k).append("=").append(clean(e.getMessage())); }
                if (k.equals("BEGIN")) f.append("|autoAfterBegin=").append(c.getAutoCommit());
                if (k.equals("COMMIT")) f.append("|autoAfterCommit=").append(c.getAutoCommit());
            }
            try (ResultSet rs = st.executeQuery("SELECT COUNT(*) FROM memo")) { rs.next(); f.append("|beforeHalt=").append(rs.getInt(1)); }
        }
        f.append("|ok=").append(ok);
        System.out.println("RESULT " + f);
        System.out.flush();
        if (sleep > 0) Thread.sleep(sleep);
        Runtime.getRuntime().halt(7); // 연결을 닫지 않고, 종료 작업(shutdown hook)도 돌리지 않고 프로세스를 바로 끝낸다
    }

    // run2: args = run2 <full.sql> <part2.sql>
    static void run2(String[] a) throws Exception {
        String full = Files.readString(Path.of(a[1]), StandardCharsets.UTF_8), part2 = Files.readString(Path.of(a[2]), StandardCharsets.UTF_8);
        StringBuilder f = new StringBuilder();
        try (Connection c = DriverManager.getConnection(urlOf(full)); Statement st = c.createStatement()) {
            f.append("opened=true");
            for (String s : stmts(part2, false)) {
                try (ResultSet rs = st.executeQuery(s)) {
                    List<String> r = new ArrayList<>();
                    while (rs.next()) r.add("(" + rs.getInt(1) + ", " + rs.getString(2) + ")");
                    f.append("|rows=").append(r.size()).append("|data=").append(String.join(" ", r));
                } catch (SQLException e) { f.append("|errCode=").append(e.getErrorCode()).append("|errState=").append(e.getSQLState()).append("|msg=").append(clean(e.getMessage())); }
            }
        } catch (SQLException e) { f.append("opened=false|errCode=").append(e.getErrorCode()).append("|msg=").append(clean(e.getMessage())); }
        System.out.println("RESULT " + f);
    }

    static void wipe(Path dir) throws IOException {
        if (!dir.toString().replace('\\', '/').contains("/verify/out/durable_basic/")) throw new IllegalStateException("엉뚱한 폴더: " + dir);
        if (!Files.exists(dir)) return;
        try (Stream<Path> w = Files.walk(dir)) { for (Path p : (Iterable<Path>) w.sorted(java.util.Comparator.reverseOrder())::iterator) Files.delete(p); }
    }

    static String java() { return Path.of(System.getProperty("java.home"), "bin", "java").toString(); }

    static String absCp() {
        List<String> r = new ArrayList<>();
        for (String e : System.getProperty("java.class.path").split(java.io.File.pathSeparator)) r.add(Path.of(e).toAbsolutePath().toString());
        return String.join(java.io.File.pathSeparator, r);
    }

    // 자식 프로세스를 돌리고 RESULT 줄과 종료 코드를 돌려준다
    static String[] child(Path dir, String cp, String... args) throws Exception {
        List<String> cmd = new ArrayList<>(List.of(java(), "-Dfile.encoding=UTF-8", "-Dstdout.encoding=UTF-8", "-cp", cp, "DurableBasicProbe"));
        cmd.addAll(List.of(args));
        Process p = new ProcessBuilder(cmd).directory(dir.toFile()).redirectErrorStream(true).start();
        String out = new String(p.getInputStream().readAllBytes(), StandardCharsets.UTF_8);
        int code = p.waitFor();
        String res = "";
        for (String ln : out.split("\r?\n")) if (ln.startsWith("RESULT ")) res = ln.substring(7);
        if (res.isEmpty()) res = "NORESULT " + clean(out);
        return new String[] { res, String.valueOf(code) };
    }

    // 한 번의 실험: 새 폴더에서 run1 -> (파일 목록) -> run2
    static String experiment(Path dir, String script, String cp, long sleep) throws Exception {
        wipe(dir);
        Files.createDirectories(dir);
        String[] lines = script.split("\n");
        int mid = -1;
        for (int i = 0; i < lines.length; i++) if (lines[i].startsWith(MID)) mid = i;
        String part1 = String.join("\n", java.util.Arrays.copyOfRange(lines, 0, mid)) + "\n";
        String part2 = String.join("\n", java.util.Arrays.copyOfRange(lines, mid, lines.length)) + "\n";
        Files.writeString(dir.resolve("full.sql"), script, StandardCharsets.UTF_8);
        Files.writeString(dir.resolve("part1.sql"), part1, StandardCharsets.UTF_8);
        Files.writeString(dir.resolve("part2.sql"), part2, StandardCharsets.UTF_8);
        String[] r1 = child(dir, cp, "run1", "full.sql", "part1.sql", String.valueOf(sleep));
        String files1 = files(dir);
        String[] r2 = child(dir, cp, "run2", "full.sql", "part2.sql");
        String files2 = files(dir);
        return "exit1=" + r1[1] + "|" + r1[0] + "|files1=" + files1 + "|" + r2[0] + "|exit2=" + r2[1] + "|files2=" + files2;
    }

    public static void main(String[] args) throws Exception {
        if (args.length > 0 && args[0].equals("run1")) { run1(args); return; }
        if (args.length > 0 && args[0].equals("run2")) { run2(args); return; }
        // 부모: args[0] = 출력 파일, args[1] = 작업 폴더 루트(verify/out/durable_basic)
        Path out = Path.of(args[0]), root = Path.of(args[1]).toAbsolutePath();
        String cp = absCp();
        String ver;
        try (Connection c = DriverManager.getConnection("jdbc:h2:mem:durable_basic_ver")) { ver = c.getMetaData().getDatabaseProductName() + " " + c.getMetaData().getDatabaseProductVersion(); }
        List<String> lines = new ArrayList<>();
        lines.add("# " + ver + " | java " + System.getProperty("java.version"));
        for (boolean commit : new boolean[] { true, false })
            for (String where : new String[] { "file", "mem" }) {
                String script = sql(commit, where);
                String f = experiment(root.resolve(commit + "_" + where), script, cp, 0);
                lines.add(commit + "|" + where + " => sql=" + clean(script) + "|" + f);
            }
        // 참고 실험: 파일 DB, COMMIT 있음, 주소에서 ;WRITE_DELAY=0 을 뺀 H2 기본 설정. 바로 끝내기 5번, 1.5초 기다렸다가 끝내기 2번.
        String dflt = sql(true, "file").replace(";WRITE_DELAY=0", "");
        for (int i = 1; i <= 5; i++) lines.add("FACT defaultImmediate" + i + " => " + experiment(root.resolve("default_now_" + i), dflt, cp, 0));
        for (int i = 1; i <= 2; i++) lines.add("FACT defaultWait" + i + " => " + experiment(root.resolve("default_wait_" + i), dflt, cp, 1500));
        Files.write(out, lines, StandardCharsets.UTF_8);
        System.out.println(lines.get(0) + " | " + (lines.size() - 1) + " lines");
        lines.forEach(System.out::println);
    }
}

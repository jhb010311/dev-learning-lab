import java.io.File;
import java.lang.management.ManagementFactory;
import java.lang.management.ThreadMXBean;
import java.lang.reflect.InvocationTargetException;
import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.TreeMap;
import java.util.TreeSet;
import java.util.concurrent.TimeUnit;
import javax.tools.Diagnostic;
import javax.tools.DiagnosticCollector;
import javax.tools.JavaCompiler;
import javax.tools.JavaFileObject;
import javax.tools.SimpleJavaFileObject;
import javax.tools.ToolProvider;

// 기초개념 "스레드 풀" 실습의 여섯 가지 조합(맡기는 방법 2 x 풀의 스레드 수 3)을 실제로 실행한다.
// 조합마다 화면에 보이는 것과 같은 소스를 문자열로 만들어 javax.tools로 컴파일하고,
// 이 JDK의 java를 자식 프로세스로 띄워 같은 프로그램을 RUNS번 실행해, 종료 코드, 표준 오류, 표준 출력의 줄을 본다.
//   how  : pool(Executors.newFixedThreadPool로 만든 풀에 submit) / new(일마다 new Thread(...).start())
//   size : 풀의 스레드 수 2 / 1 / 6 (how가 new이면 쓰이지 않는다. 그래도 세 가지 모두 실행한다)
// 어느 스레드가 어느 일을 하는지는 실행마다 달라질 수 있으므로, 실행마다 "일한 스레드 이름의 서로 다른 것"만 뽑아
// 실행 20번의 집합으로 본다. "새로 시작된 스레드"는 자식 프로세스의 시작 클래스(이 Probe의 --child 모드)가
// Main.main을 부르기 전과 뒤에 ThreadMXBean.getTotalStartedThreadCount()를 읽어 그 차이로 잰다.
// 출력: how|size => 컴파일(OK/ERR)|오류 개수|실행 횟수|종료 코드|서로 다른 이름 집합의 수|출력 줄 수의 집합|새로 시작된 스레드 수의 집합|표준 오류(없으면 -)|이름 집합(정렬, 쉼표) (집합이 여럿이면 " ## "로 잇는다)
// 끝에 FACT 줄: 단계 문장이 기대는 사실을 따로 만든 소스로 실행한 결과.
// 조합마다 만든 소스는 verify/out/pool_basic/<조합>/Main.java에, 마지막 실행의 출력은 stdout.txt와 stderr.txt에 남긴다.
public class PoolBasicProbe {
    static final int RUNS = 20;

    // 화면의 코드(실습의 code 함수)와 같은 글
    static String source(String how, int size) {
        StringBuilder s = new StringBuilder();
        if (how.equals("pool")) s.append("import java.util.concurrent.*;\n\n");
        s.append("public class Main {\n"
            + "    // 일: 이 줄을 실행한 스레드의 이름을 출력하고 0.05초 쉰다\n"
            + "    static void work() {\n"
            + "        String who = Thread.currentThread().getName();\n"
            + "        System.out.println(\"일한 스레드: \" + who);\n"
            + "        try { Thread.sleep(50); } catch (InterruptedException e) { }\n"
            + "    }\n\n"
            + "    public static void main(String[] args) {\n");
        if (how.equals("pool")) {
            s.append("        // 스레드 풀: 정해진 수의 스레드를 만들어 돌려 쓴다\n"
                + "        ExecutorService pool = Executors.newFixedThreadPool(" + size + ");\n"
                + "        for (int i = 1; i <= 6; i++) {\n"
                + "            // 맡기기: 일을 풀에 넘기면 풀의 스레드가 가져가 실행한다\n"
                + "            pool.submit(() -> work());\n"
                + "        }\n"
                + "        // 정리: 맡긴 일은 끝까지 하고, 그다음 풀의 스레드를 끝낸다\n"
                + "        pool.shutdown();\n");
        } else {
            s.append("        for (int i = 1; i <= 6; i++) {\n"
                + "            // 일마다 새 스레드를 만들어 시작한다\n"
                + "            new Thread(() -> work()).start();\n"
                + "        }\n");
        }
        s.append("    }\n}\n");
        return s.toString();
    }

    // ---- 사실 확인용 소스들 ----

    // 사실 lazy: 풀을 만든 직후에는 스레드가 없고, submit할 때마다 풀의 스레드 수까지 만들어진다
    static String factLazySource() {
        return "import java.lang.management.ManagementFactory;\n"
            + "import java.util.concurrent.*;\n\n"
            + "public class Main {\n"
            + "    public static void main(String[] args) throws Exception {\n"
            + "        var mx = ManagementFactory.getThreadMXBean();\n"
            + "        long base = mx.getTotalStartedThreadCount();\n"
            + "        ThreadPoolExecutor pool = (ThreadPoolExecutor) Executors.newFixedThreadPool(2);\n"
            + "        StringBuilder sb = new StringBuilder();\n"
            + "        sb.append(\"만든 직후: 시작된 +\" + (mx.getTotalStartedThreadCount() - base) + \" 풀의 스레드 \" + pool.getPoolSize() + \" 줄 \" + pool.getQueue().size());\n"
            + "        for (int i = 1; i <= 3; i++) {\n"
            + "            pool.submit(() -> { try { Thread.sleep(300); } catch (InterruptedException e) { } });\n"
            + "            sb.append(\" / submit \" + i + \"번 뒤: 시작된 +\" + (mx.getTotalStartedThreadCount() - base) + \" 풀의 스레드 \" + pool.getPoolSize() + \" 줄 \" + pool.getQueue().size());\n"
            + "        }\n"
            + "        pool.shutdown();\n"
            + "        pool.awaitTermination(10, TimeUnit.SECONDS);\n"
            + "        System.out.println(sb);\n"
            + "    }\n}\n";
    }

    // 사실 queue: 일 6개를 맡긴 직후, 풀의 스레드 수 / 일하는 스레드 수 / 줄에서 기다리는 일의 수 (일은 0.5초 걸리게 해서 아직 하나도 안 끝난 때를 잰다)
    static String factQueueSource(int size) {
        return "import java.util.concurrent.*;\n\n"
            + "public class Main {\n"
            + "    static void work() {\n"
            + "        try { Thread.sleep(500); } catch (InterruptedException e) { }\n"
            + "    }\n\n"
            + "    public static void main(String[] args) throws Exception {\n"
            + "        ThreadPoolExecutor pool = (ThreadPoolExecutor) Executors.newFixedThreadPool(" + size + ");\n"
            + "        for (int i = 1; i <= 6; i++) {\n"
            + "            pool.submit(() -> work());\n"
            + "        }\n"
            + "        System.out.println(\"맡긴 직후: 풀의 스레드 \" + pool.getPoolSize() + \" 일하는 중 \" + pool.getActiveCount() + \" 줄 \" + pool.getQueue().size());\n"
            + "        pool.shutdown();\n"
            + "        pool.awaitTermination(10, TimeUnit.SECONDS);\n"
            + "        System.out.println(\"끝난 뒤: 풀의 스레드 \" + pool.getPoolSize() + \" 끝난 일 \" + pool.getCompletedTaskCount());\n"
            + "    }\n}\n";
    }

    // 사실 who: 일마다 번호를 붙여 "번호:스레드 이름"을 출력하고, 동시에 일하는 일의 최대 수를 잰다
    static String factWhoSource(String how, int size) {
        StringBuilder s = new StringBuilder("import java.util.*;\nimport java.util.concurrent.*;\nimport java.util.concurrent.atomic.*;\n\n"
            + "public class Main {\n"
            + "    static AtomicInteger now = new AtomicInteger(), max = new AtomicInteger();\n\n"
            + "    static void work(int id) {\n"
            + "        max.accumulateAndGet(now.incrementAndGet(), Math::max);\n"
            + "        System.out.println(id + \":\" + Thread.currentThread().getName());\n"
            + "        try { Thread.sleep(50); } catch (InterruptedException e) { }\n"
            + "        now.decrementAndGet();\n"
            + "    }\n\n"
            + "    public static void main(String[] args) throws Exception {\n");
        if (how.equals("pool")) {
            s.append("        ExecutorService pool = Executors.newFixedThreadPool(" + size + ");\n"
                + "        for (int i = 1; i <= 6; i++) {\n"
                + "            final int id = i;\n"
                + "            pool.submit(() -> work(id));\n"
                + "        }\n"
                + "        pool.shutdown();\n"
                + "        pool.awaitTermination(10, TimeUnit.SECONDS);\n");
        } else {
            s.append("        List<Thread> ts = new ArrayList<>();\n"
                + "        for (int i = 1; i <= 6; i++) {\n"
                + "            final int id = i;\n"
                + "            Thread t = new Thread(() -> work(id));\n"
                + "            ts.add(t);\n"
                + "            t.start();\n"
                + "        }\n"
                + "        for (Thread t : ts) t.join();\n");
        }
        s.append("        System.out.println(\"max=\" + max.get());\n    }\n}\n");
        return s.toString();
    }

    // 사실 shutdown: shutdown()은 맡긴 일이 끝나기를 기다리지 않고 돌아온다 (main 끝 앞에 찍힌 줄의 수를 본다)
    static String factShutdownSource() {
        String s = source("pool", 2);
        return s.replace("        pool.shutdown();\n", "        pool.shutdown();\n        System.out.println(\"main 끝\");\n");
    }

    // 사실 noshutdown: shutdown()을 부르지 않으면 일이 다 끝나도 프로그램이 끝나지 않는다
    static String factNoShutdownSource() {
        String s = source("pool", 2);
        return s.replace("        // 정리: 맡긴 일은 끝까지 하고, 그다음 풀의 스레드를 끝낸다\n        pool.shutdown();\n", "");
    }

    // ---- 실행 도구 ----

    // 자식 프로세스의 시작 클래스: Main.main을 부르기 전후의 "지금까지 시작된 스레드 수"의 차이를 파일에 쓴다
    static void child(String metaFile) throws Exception {
        ThreadMXBean mx = ManagementFactory.getThreadMXBean();
        mx.getTotalStartedThreadCount();
        long before = mx.getTotalStartedThreadCount();
        try {
            Class.forName("Main").getMethod("main", String[].class).invoke(null, (Object) new String[0]);
        } catch (InvocationTargetException e) {
            throw new RuntimeException(e.getCause());
        }
        long after = mx.getTotalStartedThreadCount();
        Files.writeString(Path.of(metaFile), String.valueOf(after - before), StandardCharsets.UTF_8);
    }

    static List<String> lines(String text) {
        text = text.replace("\r\n", "\n");
        List<String> r = new ArrayList<>();
        if (text.isEmpty()) return r;
        for (String l : text.stripTrailing().split("\n")) r.add(l);
        return r;
    }

    static boolean compile(JavaCompiler jc, String src, Path dir, List<Diagnostic<? extends JavaFileObject>>[] errsOut) throws Exception {
        DiagnosticCollector<JavaFileObject> dc = new DiagnosticCollector<>();
        JavaFileObject fo = new SimpleJavaFileObject(URI.create("string:///Main.java"), JavaFileObject.Kind.SOURCE) {
            @Override public CharSequence getCharContent(boolean ignore) { return src; }
        };
        boolean ok = jc.getTask(null, null, dc, List.of("-d", dir.toString(), "-proc:none"), null, List.of(fo)).call();
        errsOut[0] = dc.getDiagnostics().stream().filter(d -> d.getKind() == Diagnostic.Kind.ERROR).toList();
        return ok;
    }

    record Result(int exit, List<String> out, String err, String started) { }

    // 한 번 실행한다. wrapped이면 시작 클래스를 거쳐 새로 시작된 스레드 수도 잰다. limitSec 안에 끝나지 않으면 강제로 끝내고 exit -1
    static Result runOnce(String java, String probeCp, Path dir, boolean wrapped, int limitSec) throws Exception {
        Path so = dir.resolve("stdout.txt"), se = dir.resolve("stderr.txt"), meta = dir.resolve("started.txt");
        Files.deleteIfExists(so); Files.deleteIfExists(se); Files.deleteIfExists(meta);
        List<String> cmd = new ArrayList<>(List.of(java, "-Dfile.encoding=UTF-8", "-Dstdout.encoding=UTF-8", "-Dstderr.encoding=UTF-8"));
        if (wrapped) cmd.addAll(List.of("-cp", probeCp + File.pathSeparator + dir, "PoolBasicProbe", "--child", meta.toString()));
        else cmd.addAll(List.of("-cp", dir.toString(), "Main"));
        ProcessBuilder pb = new ProcessBuilder(cmd);
        pb.redirectOutput(so.toFile());
        pb.redirectError(se.toFile());
        Process p = pb.start();
        int exit;
        if (!p.waitFor(limitSec, TimeUnit.SECONDS)) { p.destroyForcibly(); p.waitFor(); exit = -1; }
        else exit = p.exitValue();
        String err = String.join(" / ", lines(Files.readString(se, StandardCharsets.UTF_8)));
        String started = Files.exists(meta) ? Files.readString(meta, StandardCharsets.UTF_8).trim() : "-";
        return new Result(exit, lines(Files.readString(so, StandardCharsets.UTF_8)), err.isEmpty() ? "-" : err, started);
    }

    static Path prepare(JavaCompiler jc, String base, String name, String src) throws Exception {
        Path dir = Path.of(base, name);
        Files.createDirectories(dir);
        Files.deleteIfExists(dir.resolve("Main.class"));
        Files.writeString(dir.resolve("Main.java"), src, StandardCharsets.UTF_8);
        @SuppressWarnings("unchecked") List<Diagnostic<? extends JavaFileObject>>[] errs = new List[1];
        if (!compile(jc, src, dir, errs)) throw new IllegalStateException("컴파일 실패 " + name + ": " + errs[0].get(0).getMessage(null));
        return dir;
    }

    static String names(List<String> out) {
        TreeSet<String> n = new TreeSet<>();
        for (String l : out) if (l.startsWith("일한 스레드: ")) n.add(l.substring("일한 스레드: ".length()));
        return String.join(",", n);
    }

    public static void main(String[] args) throws Exception {
        if (args.length > 1 && args[0].equals("--child")) { child(args[1]); return; }
        String base = args.length > 0 ? args[0] : "verify/out/pool_basic";
        String probeCp = System.getProperty("java.class.path");
        JavaCompiler jc = ToolProvider.getSystemJavaCompiler();
        String java = Path.of(System.getProperty("java.home"), "bin", "java").toString();
        System.out.println("# java " + System.getProperty("java.version"));
        for (String how : new String[] { "pool", "new" })
            for (int size : new int[] { 2, 1, 6 }) {
                Path dir = prepare(jc, base, how + "-" + size, source(how, size));
                Set<String> exits = new TreeSet<>(), nameSets = new LinkedHashSet<>(), nlines = new TreeSet<>(), started = new TreeSet<>(), errs = new LinkedHashSet<>();
                for (int i = 0; i < RUNS; i++) {
                    Result r = runOnce(java, probeCp, dir, true, 60);
                    exits.add(String.valueOf(r.exit)); nameSets.add(names(r.out)); nlines.add(String.valueOf(r.out.size())); started.add(r.started); errs.add(r.err);
                }
                System.out.println(how + "|" + size + " => OK|0|" + RUNS + "|" + String.join(",", exits) + "|" + nameSets.size() + "|" + String.join(",", nlines)
                    + "|" + String.join(",", started) + "|" + String.join(" ## ", errs) + "|" + String.join(" ## ", nameSets));
            }

        // 사실 확인
        {   // lazy
            Path dir = prepare(jc, base, "fact-lazy", factLazySource());
            Set<String> outs = new LinkedHashSet<>();
            for (int i = 0; i < RUNS; i++) { Result r = runOnce(java, probeCp, dir, false, 60); outs.add(r.exit + "/" + r.err + "/" + String.join(" // ", r.out)); }
            System.out.println("FACT lazy => " + RUNS + "|" + outs.size() + "|" + String.join(" ## ", outs));
        }
        for (int size : new int[] { 2, 1, 6 }) {   // queue
            Path dir = prepare(jc, base, "fact-queue-" + size, factQueueSource(size));
            Set<String> outs = new LinkedHashSet<>();
            for (int i = 0; i < RUNS; i++) { Result r = runOnce(java, probeCp, dir, false, 60); outs.add(r.exit + "/" + r.err + "/" + String.join(" // ", r.out)); }
            System.out.println("FACT queue-" + size + " => " + RUNS + "|" + outs.size() + "|" + String.join(" ## ", outs));
        }
        String[][] whoCombos = { { "pool", "2" }, { "pool", "1" }, { "pool", "6" }, { "new", "2" } };
        for (String[] wc : whoCombos) {   // who: 번호별 스레드 이름의 집합, 일이 시작된 차례(묶음), 동시에 일한 최대 수
            String how = wc[0]; int size = Integer.parseInt(wc[1]);
            int wave = how.equals("pool") ? size : 6;
            Path dir = prepare(jc, base, "fact-who-" + how + "-" + size, factWhoSource(how, size));
            Map<Integer, TreeSet<String>> byId = new TreeMap<>();
            Set<String> maxes = new TreeSet<>(), exits = new TreeSet<>(), errs = new LinkedHashSet<>();
            boolean wavesOk = true;
            for (int i = 0; i < RUNS; i++) {
                Result r = runOnce(java, probeCp, dir, false, 60);
                exits.add(String.valueOf(r.exit)); errs.add(r.err);
                List<Integer> order = new ArrayList<>();
                for (String l : r.out) {
                    if (l.startsWith("max=")) { maxes.add(l.substring(4)); continue; }
                    String[] p = l.split(":", 2);
                    int id = Integer.parseInt(p[0]);
                    order.add(id);
                    byId.computeIfAbsent(id, k -> new TreeSet<>()).add(p[1]);
                }
                if (order.size() != 6) wavesOk = false;
                // 시작된 차례의 묶음: 앞에서부터 wave개씩 끊으면 묶음 k는 (k*wave+1)..((k+1)*wave) 번 일이다
                for (int k = 0; k * wave < order.size(); k++) {
                    Set<Integer> got = new TreeSet<>(order.subList(k * wave, Math.min(order.size(), (k + 1) * wave)));
                    Set<Integer> want = new TreeSet<>();
                    for (int id = k * wave + 1; id <= Math.min(6, (k + 1) * wave); id++) want.add(id);
                    if (!got.equals(want)) wavesOk = false;
                }
            }
            StringBuilder sb = new StringBuilder();
            for (var e : byId.entrySet()) sb.append(e.getKey()).append("=").append(String.join("/", e.getValue())).append(";");
            System.out.println("FACT who-" + how + "-" + size + " => " + RUNS + "|" + String.join(",", exits) + "|" + String.join(" ## ", errs) + "|max=" + String.join(",", maxes) + "|waves=" + wavesOk + "|" + sb);
        }
        {   // shutdown: main 끝이 찍히기 전에 찍힌 줄의 수
            Path dir = prepare(jc, base, "fact-shutdown", factShutdownSource());
            Set<String> before = new TreeSet<>(), exits = new TreeSet<>(), total = new TreeSet<>();
            for (int i = 0; i < RUNS; i++) {
                Result r = runOnce(java, probeCp, dir, false, 60);
                exits.add(String.valueOf(r.exit));
                before.add(String.valueOf(r.out.indexOf("main 끝")));
                total.add(String.valueOf(r.out.size()));
            }
            System.out.println("FACT shutdown => " + RUNS + "|" + String.join(",", exits) + "|main 끝 앞의 줄 수=" + String.join(",", before) + "|전체 줄 수=" + String.join(",", total));
        }
        {   // noshutdown: 5초 안에 끝나지 않으면(exit -1) 끝나지 않는 것으로 본다. 일 6개의 출력은 모두 나온다
            Path dir = prepare(jc, base, "fact-noshutdown", factNoShutdownSource());
            Set<String> exits = new TreeSet<>(), total = new TreeSet<>();
            int n = 3;
            for (int i = 0; i < n; i++) {
                Result r = runOnce(java, probeCp, dir, false, 5);
                exits.add(String.valueOf(r.exit)); total.add(String.valueOf(r.out.size()));
            }
            System.out.println("FACT noshutdown => " + n + "|" + String.join(",", exits) + "|전체 줄 수=" + String.join(",", total));
        }
    }
}

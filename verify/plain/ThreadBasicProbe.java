import java.io.File;
import java.lang.management.ManagementFactory;
import java.lang.management.ThreadMXBean;
import java.lang.reflect.InvocationTargetException;
import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.TreeSet;
import java.util.LinkedHashSet;
import java.util.Set;
import java.util.concurrent.TimeUnit;
import javax.tools.Diagnostic;
import javax.tools.DiagnosticCollector;
import javax.tools.JavaCompiler;
import javax.tools.JavaFileObject;
import javax.tools.SimpleJavaFileObject;
import javax.tools.ToolProvider;

// 기초개념 "스레드" 실습의 여섯 가지 조합(start 줄 3 x 스레드 하나 더 2)을 실제로 실행한다.
// 조합마다 화면에 보이는 것과 같은 소스를 문자열로 만들어 javax.tools로 컴파일하고,
// 이 JDK의 java를 자식 프로세스로 띄워 같은 프로그램을 RUNS번 실행해, 표준 출력과 종료 코드와 표준 오류가 매번 같은지 본다.
//   how : start(t.start()를 부른다) / run(t.run()을 부른다) / none(부르지 않는다)
//   two : 스레드를 하나 더 만드는가(t2)
// "새로 시작된 스레드"는 화면의 소스를 한 글자도 바꾸지 않고, 자식 프로세스의 시작 클래스(이 Probe의 --child 모드)가
// Main.main을 부르기 전과 뒤에 ThreadMXBean.getTotalStartedThreadCount()를 읽어 그 차이로 잰다.
// (시작 클래스는 Thread 객체를 만들지 않으므로 Thread-n 이름의 번호를 쓰지 않는다.)
// 출력: how|two => 컴파일(OK/ERR)|오류 개수|실행 횟수|종료 코드|서로 다른 표준 출력의 수|새로 시작된 스레드 수(실행마다 읽은 값의 집합)|표준 오류(없으면 -)|표준 출력(줄은 " / "로 잇는다)
// 끝에 FACT 줄: 단계 문장이 기대는 사실을 따로 만든 소스로 실행한 결과.
// 조합마다 만든 소스는 verify/out/thread_basic/<조합>/Main.java에, 마지막 실행의 출력은 stdout.txt와 stderr.txt에 남긴다.
public class ThreadBasicProbe {
    static final int RUNS = 20;

    // 화면의 코드(실습의 code 함수)와 같은 글
    static String source(String how, boolean two) {
        StringBuilder s = new StringBuilder("public class Main {\n"
            + "    static void work() {\n"
            + "        String who = Thread.currentThread().getName();\n"
            + "        System.out.println(\"work를 실행한 스레드: \" + who);\n"
            + "    }\n\n"
            + "    public static void main(String[] args) throws Exception {\n"
            + "        // 스레드 객체를 만든다. 아직 새 흐름은 생기지 않았다\n"
            + "        Thread t = new Thread(() -> work());\n");
        if (how.equals("start")) s.append("        // start: 새 흐름이 생겨 work를 실행한다\n        t.start();\n");
        else if (how.equals("run")) s.append("        t.run();\n");
        s.append("        // join: 그 스레드가 끝날 때까지 main이 기다린다\n        t.join();\n");
        if (two) {
            s.append("        // 스레드를 하나 더 만든다. t와 같은 방식으로 다룬다\n        Thread t2 = new Thread(() -> work());\n");
            if (how.equals("start")) s.append("        t2.start();\n");
            else if (how.equals("run")) s.append("        t2.run();\n");
            s.append("        t2.join();\n");
        }
        s.append("        String me = Thread.currentThread().getName();\n"
            + "        System.out.println(\"이 줄을 실행한 스레드: \" + me);\n"
            + "    }\n}\n");
        return s.toString();
    }

    // 사실 확인 1: start 앞뒤로 흐름이 하나에서 둘이 되는지. 새 스레드는 래치에서 기다리게 해 결과가 매번 같게 한다.
    static String factStateSource() {
        return "import java.util.concurrent.CountDownLatch;\n\n"
            + "public class Main {\n"
            + "    public static void main(String[] args) throws Exception {\n"
            + "        CountDownLatch go = new CountDownLatch(1);\n"
            + "        Thread t = new Thread(() -> {\n"
            + "            try { go.await(); } catch (InterruptedException e) { }\n"
            + "        });\n"
            + "        System.out.println(\"만든 직후: \" + t.getName() + \" \" + t.getState() + \" \" + t.isAlive());\n"
            + "        t.start();\n"
            + "        while (t.getState() != Thread.State.WAITING) Thread.sleep(1);\n"
            + "        System.out.println(\"start 뒤: \" + t.getState() + \" \" + t.isAlive() + \" \"\n"
            + "            + Thread.currentThread().getName() + \" \" + Thread.currentThread().isAlive());\n"
            + "        go.countDown();\n"
            + "        t.join();\n"
            + "        System.out.println(\"join 뒤: \" + t.getState() + \" \" + t.isAlive());\n"
            + "    }\n}\n";
    }

    // 사실 확인 2: run()은 새 흐름을 만들지 않고 부른 스레드가 실행하며, 시작한 적 없는 스레드의 join()은 바로 돌아온다.
    static String factRunSource() {
        return "public class Main {\n"
            + "    public static void main(String[] args) throws Exception {\n"
            + "        Thread t = new Thread(() -> System.out.println(\"맡긴 코드를 실행한 스레드: \" + Thread.currentThread().getName()));\n"
            + "        t.run();\n"
            + "        System.out.println(\"run 뒤: \" + t.getState() + \" \" + t.isAlive());\n"
            + "        t.join();\n"
            + "        System.out.println(\"join이 돌아옴\");\n"
            + "    }\n}\n";
    }

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

    static String[] lines(String text) {
        text = text.replace("\r\n", "\n");
        if (text.isEmpty()) return new String[0];
        return text.stripTrailing().split("\n");
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

    // 한 번 실행한 결과: {종료 코드, 표준 출력, 표준 오류, 시작된 스레드 수}
    static String[] runOnce(String java, String probeCp, Path dir) throws Exception {
        Path so = dir.resolve("stdout.txt"), se = dir.resolve("stderr.txt"), meta = dir.resolve("started.txt");
        Files.deleteIfExists(so); Files.deleteIfExists(se); Files.deleteIfExists(meta);
        ProcessBuilder pb = new ProcessBuilder(java, "-Dfile.encoding=UTF-8", "-Dstdout.encoding=UTF-8", "-Dstderr.encoding=UTF-8",
            "-cp", probeCp + File.pathSeparator + dir, "ThreadBasicProbe", "--child", meta.toString());
        pb.redirectOutput(so.toFile());
        pb.redirectError(se.toFile());
        Process p = pb.start();
        if (!p.waitFor(60, TimeUnit.SECONDS)) { p.destroyForcibly(); throw new IllegalStateException("시간 초과 " + dir); }
        String out = String.join(" / ", lines(Files.readString(so, StandardCharsets.UTF_8)));
        String err = String.join(" / ", lines(Files.readString(se, StandardCharsets.UTF_8)));
        String started = Files.exists(meta) ? Files.readString(meta, StandardCharsets.UTF_8).trim() : "-";
        return new String[] { String.valueOf(p.exitValue()), out, err.isEmpty() ? "-" : err, started };
    }

    public static void main(String[] args) throws Exception {
        if (args.length > 1 && args[0].equals("--child")) { child(args[1]); return; }
        String base = args.length > 0 ? args[0] : "verify/out/thread_basic";
        String probeCp = System.getProperty("java.class.path");
        JavaCompiler jc = ToolProvider.getSystemJavaCompiler();
        String java = Path.of(System.getProperty("java.home"), "bin", "java").toString();
        System.out.println("# java " + System.getProperty("java.version"));
        for (String how : new String[] { "start", "run", "none" })
            for (boolean two : new boolean[] { false, true }) {
                String src = source(how, two);
                Path dir = Path.of(base, how + "-" + two);
                Files.createDirectories(dir);
                Files.deleteIfExists(dir.resolve("Main.class"));
                Files.writeString(dir.resolve("Main.java"), src, StandardCharsets.UTF_8);
                @SuppressWarnings("unchecked") List<Diagnostic<? extends JavaFileObject>>[] errs = new List[1];
                boolean ok = compile(jc, src, dir, errs);
                if (!ok) { System.out.println(how + "|" + two + " => ERR|" + errs[0].size() + "|0|-|-|-|" + errs[0].get(0).getMessage(null) + "|-"); continue; }
                Set<String> exits = new TreeSet<>(), outs = new LinkedHashSet<>(), errsSeen = new LinkedHashSet<>(), started = new TreeSet<>();
                for (int i = 0; i < RUNS; i++) {
                    String[] r = runOnce(java, probeCp, dir);
                    exits.add(r[0]); outs.add(r[1]); errsSeen.add(r[2]); started.add(r[3]);
                }
                System.out.println(how + "|" + two + " => OK|0|" + RUNS + "|" + String.join(",", exits) + "|" + outs.size() + "|"
                    + String.join(",", started) + "|" + String.join(" ## ", errsSeen) + "|" + String.join(" ## ", outs));
            }
        // 사실 확인
        String[][] facts = { { "state", factStateSource() }, { "run", factRunSource() } };
        for (String[] f : facts) {
            Path dir = Path.of(base, "fact-" + f[0]);
            Files.createDirectories(dir);
            Files.deleteIfExists(dir.resolve("Main.class"));
            Files.writeString(dir.resolve("Main.java"), f[1], StandardCharsets.UTF_8);
            @SuppressWarnings("unchecked") List<Diagnostic<? extends JavaFileObject>>[] errs = new List[1];
            boolean ok = compile(jc, f[1], dir, errs);
            if (!ok) { System.out.println("FACT " + f[0] + " => 컴파일 실패 " + errs[0].get(0).getMessage(null)); continue; }
            Set<String> outs = new LinkedHashSet<>(), startedSet = new TreeSet<>();
            for (int i = 0; i < RUNS; i++) { String[] r = runOnce(java, probeCp, dir); outs.add(r[0] + "/" + r[2] + "/" + r[1]); startedSet.add(r[3]); }
            System.out.println("FACT " + f[0] + " => " + RUNS + "|" + outs.size() + "|" + String.join(",", startedSet) + "|" + String.join(" ## ", outs));
        }
    }
}

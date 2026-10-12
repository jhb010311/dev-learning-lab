import java.io.File;
import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;
import java.util.TreeSet;
import java.util.concurrent.TimeUnit;
import javax.tools.Diagnostic;
import javax.tools.DiagnosticCollector;
import javax.tools.JavaCompiler;
import javax.tools.JavaFileObject;
import javax.tools.SimpleJavaFileObject;
import javax.tools.ToolProvider;

// 기초개념 "락(synchronized)" 실습의 네 가지 조합(synchronized 2 x 스레드 수 2)을 실제로 실행한다.
// 조합마다 화면에 보이는 것과 같은 소스를 문자열로 만들어 javax.tools로 컴파일하고,
// 이 JDK의 java를 자식 프로세스로 띄워 같은 프로그램을 RUNS번 실행해, 매번 찍힌 count의 마지막 값과 종료 코드와 표준 오류를 모은다.
//   sync    : add 메서드에 synchronized를 붙이는가
//   threads : 2(t1, t2가 각각 add()를 100000번) / 1(t1만)
// 출력: sync|threads => 컴파일(OK/ERR)|오류 개수|실행 횟수|종료 코드(집합)|기대한 값|기대한 값보다 작게 나온 횟수|기대한 값보다 크게 나온 횟수|
//        서로 다른 값의 수|가장 작은 값|가장 큰 값|표준 오류(없으면 -)|나온 값들(작은 것부터, 쉼표)
// 끝에 FACT 줄: 단계 문장이 기대는 사실을 따로 만든 소스로 확인한 결과.
//   FACT bytecode : add() 안의 count++가 javap로 보면 어떤 동작 순서인가
//   FACT held     : static synchronized 메서드를 t1이 실행하는 동안 t2가 BLOCKED이고, 그 락이 Main 클래스 객체의 것인가
// 조합마다 만든 소스는 verify/out/lock_basic/<조합>/Main.java에 남긴다.
public class LockBasicProbe {
    static final int RUNS = 30;
    static final int EACH = 100000;

    // 화면의 코드(실습의 code 함수)와 같은 글
    static String source(boolean sync, boolean two) {
        StringBuilder s = new StringBuilder("public class Main {\n"
            + "    // 두 스레드가 함께 고치는 변수. 프로그램에 하나뿐이다\n"
            + "    static int count = 0;\n\n");
        if (sync) s.append("    // 락: synchronized를 붙이면 한 번에 한 스레드만 실행한다\n");
        s.append("    static " + (sync ? "synchronized " : "") + "void add() {\n"
            + "        // count++는 읽기, 더하기, 쓰기 세 동작이다\n"
            + "        count++;\n"
            + "    }\n\n"
            + "    public static void main(String[] args) throws Exception {\n"
            + "        // 스레드가 할 일: add()를 100000번 부른다\n"
            + "        Runnable job = () -> {\n"
            + "            for (int i = 0; i < 100000; i++) {\n"
            + "                add();\n"
            + "            }\n"
            + "        };\n"
            + "        Thread t1 = new Thread(job);\n");
        if (two) s.append("        // 두 번째 스레드: 같은 일을 한다\n        Thread t2 = new Thread(job);\n");
        s.append("        t1.start();\n");
        if (two) s.append("        t2.start();\n");
        s.append("        t1.join();\n");
        if (two) s.append("        t2.join();\n");
        s.append("        System.out.println(count);\n    }\n}\n");
        return s.toString();
    }

    // 사실 확인 1: add() 안의 count++를 javap로 본다
    static String factBytecodeSource() {
        return "public class Main {\n"
            + "    static int count = 0;\n\n"
            + "    static void add() {\n"
            + "        count++;\n"
            + "    }\n\n"
            + "    public static void main(String[] args) {\n"
            + "        add();\n"
            + "        System.out.println(count);\n"
            + "    }\n}\n";
    }

    // 사실 확인 2: t1이 락을 잡고 add() 안에 있는 동안 t2는 add()를 부르고도 들어가지 못하고 BLOCKED 상태로 기다린다
    static String factHeldSource() {
        return "import java.util.concurrent.CountDownLatch;\n\n"
            + "public class Main {\n"
            + "    static int count = 0;\n"
            + "    static final CountDownLatch inside = new CountDownLatch(1);\n"
            + "    static final CountDownLatch release = new CountDownLatch(1);\n\n"
            + "    static synchronized void add(boolean first) throws InterruptedException {\n"
            + "        if (first) {\n"
            + "            System.out.println(\"t1이 add() 안에서 Main 클래스의 락을 쥠: \" + Thread.holdsLock(Main.class));\n"
            + "            inside.countDown();\n"
            + "            release.await();\n"
            + "        }\n"
            + "        count++;\n"
            + "    }\n\n"
            + "    static void call(boolean first) {\n"
            + "        try { add(first); } catch (InterruptedException e) { }\n"
            + "    }\n\n"
            + "    public static void main(String[] args) throws Exception {\n"
            + "        Thread t1 = new Thread(() -> call(true));\n"
            + "        t1.start();\n"
            + "        inside.await();\n"
            + "        Thread t2 = new Thread(() -> call(false));\n"
            + "        t2.start();\n"
            + "        while (t2.getState() != Thread.State.BLOCKED) Thread.sleep(1);\n"
            + "        System.out.println(\"t2 상태: \" + t2.getState() + \", 이때 count=\" + count);\n"
            + "        release.countDown();\n"
            + "        t1.join();\n"
            + "        t2.join();\n"
            + "        System.out.println(\"둘 다 끝난 뒤 count=\" + count);\n"
            + "    }\n}\n";
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

    // 한 번 실행한 결과: {종료 코드, 표준 출력, 표준 오류}
    static String[] runOnce(String java, Path dir) throws Exception {
        Path so = dir.resolve("stdout.txt"), se = dir.resolve("stderr.txt");
        Files.deleteIfExists(so); Files.deleteIfExists(se);
        ProcessBuilder pb = new ProcessBuilder(java, "-Dfile.encoding=UTF-8", "-Dstdout.encoding=UTF-8", "-Dstderr.encoding=UTF-8", "-cp", dir.toString(), "Main");
        pb.redirectOutput(so.toFile());
        pb.redirectError(se.toFile());
        Process p = pb.start();
        if (!p.waitFor(60, TimeUnit.SECONDS)) { p.destroyForcibly(); throw new IllegalStateException("시간 초과 " + dir); }
        String out = String.join(" / ", lines(Files.readString(so, StandardCharsets.UTF_8)));
        String err = String.join(" / ", lines(Files.readString(se, StandardCharsets.UTF_8)));
        return new String[] { String.valueOf(p.exitValue()), out, err.isEmpty() ? "-" : err };
    }

    public static void main(String[] args) throws Exception {
        String base = args.length > 0 ? args[0] : "verify/out/lock_basic";
        JavaCompiler jc = ToolProvider.getSystemJavaCompiler();
        String javaHome = System.getProperty("java.home");
        String java = Path.of(javaHome, "bin", "java").toString();
        String javap = Path.of(javaHome, "bin", "javap").toString();
        System.out.println("# java " + System.getProperty("java.version"));
        for (boolean sync : new boolean[] { true, false })
            for (boolean two : new boolean[] { true, false }) {
                String src = source(sync, two);
                String threads = two ? "2" : "1";
                Path dir = Path.of(base, sync + "-" + threads);
                Files.createDirectories(dir);
                Files.deleteIfExists(dir.resolve("Main.class"));
                Files.writeString(dir.resolve("Main.java"), src, StandardCharsets.UTF_8);
                @SuppressWarnings("unchecked") List<Diagnostic<? extends JavaFileObject>>[] errs = new List[1];
                boolean ok = compile(jc, src, dir, errs);
                if (!ok) { System.out.println(sync + "|" + threads + " => ERR|" + errs[0].size() + "|0|-|-|-|-|-|-|-|" + errs[0].get(0).getMessage(null) + "|-"); continue; }
                int expect = (two ? 2 : 1) * EACH, less = 0, more = 0;
                Set<String> exits = new TreeSet<>(), errsSeen = new LinkedHashSet<>();
                List<Integer> vals = new ArrayList<>();
                for (int i = 0; i < RUNS; i++) {
                    String[] r = runOnce(java, dir);
                    exits.add(r[0]); errsSeen.add(r[2]);
                    int v = Integer.parseInt(r[1].trim());
                    vals.add(v);
                    if (v < expect) less++;
                    if (v > expect) more++;
                }
                vals.sort(null);
                Set<Integer> distinct = new TreeSet<>(vals);
                StringBuilder vs = new StringBuilder();
                for (int v : vals) { if (vs.length() > 0) vs.append(','); vs.append(v); }
                System.out.println(sync + "|" + threads + " => OK|0|" + RUNS + "|" + String.join(",", exits) + "|" + expect + "|" + less + "|" + more + "|"
                    + distinct.size() + "|" + vals.get(0) + "|" + vals.get(vals.size() - 1) + "|" + String.join(" ## ", errsSeen) + "|" + vs);
            }
        // 사실 확인 1: count++의 바이트코드
        {
            Path dir = Path.of(base, "fact-bytecode");
            Files.createDirectories(dir);
            Files.deleteIfExists(dir.resolve("Main.class"));
            String src = factBytecodeSource();
            Files.writeString(dir.resolve("Main.java"), src, StandardCharsets.UTF_8);
            @SuppressWarnings("unchecked") List<Diagnostic<? extends JavaFileObject>>[] errs = new List[1];
            if (!compile(jc, src, dir, errs)) System.out.println("FACT bytecode => 컴파일 실패 " + errs[0].get(0).getMessage(null));
            else {
                Process p = new ProcessBuilder(javap, "-c", "-p", "-cp", dir.toString(), "Main").redirectErrorStream(true).start();
                String text = new String(p.getInputStream().readAllBytes(), StandardCharsets.UTF_8);
                p.waitFor(60, TimeUnit.SECONDS);
                List<String> ops = new ArrayList<>();
                boolean in = false;
                for (String ln : lines(text)) {
                    String t = ln.strip();
                    if (t.startsWith("static void add()")) { in = true; continue; }
                    if (in) {
                        if (t.isEmpty() || t.startsWith("public ")) break;
                        if (t.equals("Code:")) continue;
                        String[] parts = t.split("\\s+");
                        if (parts.length >= 2 && parts[0].endsWith(":")) ops.add(parts[1]);
                    }
                }
                System.out.println("FACT bytecode => " + String.join(",", ops));
            }
        }
        // 사실 확인 2: 락을 쥔 동안 다른 스레드는 BLOCKED
        {
            Path dir = Path.of(base, "fact-held");
            Files.createDirectories(dir);
            Files.deleteIfExists(dir.resolve("Main.class"));
            String src = factHeldSource();
            Files.writeString(dir.resolve("Main.java"), src, StandardCharsets.UTF_8);
            @SuppressWarnings("unchecked") List<Diagnostic<? extends JavaFileObject>>[] errs = new List[1];
            if (!compile(jc, src, dir, errs)) System.out.println("FACT held => 컴파일 실패 " + errs[0].get(0).getMessage(null));
            else {
                Set<String> outs = new LinkedHashSet<>();
                for (int i = 0; i < RUNS; i++) { String[] r = runOnce(java, dir); outs.add(r[0] + "/" + r[2] + "/" + r[1]); }
                System.out.println("FACT held => " + RUNS + "|" + outs.size() + "|" + String.join(" ## ", outs));
            }
        }
    }
}

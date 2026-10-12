import java.net.URI;
import java.net.URL;
import java.net.URLClassLoader;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import javax.tools.Diagnostic;
import javax.tools.DiagnosticCollector;
import javax.tools.JavaCompiler;
import javax.tools.JavaFileObject;
import javax.tools.SimpleJavaFileObject;
import javax.tools.ToolProvider;
import org.junit.platform.launcher.Launcher;
import org.junit.platform.launcher.LauncherDiscoveryRequest;
import org.junit.platform.launcher.core.LauncherDiscoveryRequestBuilder;
import org.junit.platform.launcher.core.LauncherFactory;
import org.junit.platform.launcher.listeners.SummaryGeneratingListener;
import org.junit.platform.launcher.listeners.TestExecutionSummary;
import org.junit.platform.engine.discovery.DiscoverySelectors;

// 기초개념 "테스트 코드" 실습의 여덟 가지 조합(add의 구현 2 x 기대한 값 2 x @Test 유무 2)을 실제 JUnit으로 실행한다.
// 조합마다 화면에 보이는 것과 같은 소스(맨 위에 import 두 줄만 더함)를 CalcTest.java로 만들어 javax.tools로 컴파일하고,
// JUnit Platform Launcher(junit-platform-launcher 6.0.3)로 CalcTest 클래스를 실행해 요약을 얻는다.
//   impl   : plus(return a + b;) / minus(return a - b;)
//   expect : five(assertEquals(5, ...)) / six(assertEquals(6, ...))
//   anno   : adds() 위에 @Test가 있는가
// 출력: impl|expect|anno => compile=OK|found=찾은 테스트 수|started=시작한 테스트 수|succeeded=성공|failed=실패|aborted=중단|skipped=건너뜀|
//        containersFailed=컨테이너 실패|exc=실패의 예외 클래스|msg=예외 메시지의 첫 줄
// 끝에 FACT 줄을 더한다(단계 문장이 기대는 사실): 테스트 메서드에 표시를 하는 필드를 두어, JUnit이 adds()를 불렀는지 / 부르지 않았는지, 그때 Calc.add가 불렸는지를 잰다.
// 조합마다 만든 소스는 verify/out/test_basic/<조합>/CalcTest.java에 남긴다.
public class TestBasicProbe {
    static final String HEAD = "import org.junit.jupiter.api.Test;\nimport static org.junit.jupiter.api.Assertions.assertEquals;\n\n";

    // 화면의 코드(실습의 code 함수)와 같은 글
    static String body(String impl, String expect, boolean anno) {
        StringBuilder s = new StringBuilder();
        s.append("// 검사받는 코드\n")
         .append("class Calc {\n")
         .append("    int add(int a, int b) {\n")
         .append("        return ").append(impl.equals("plus") ? "a + b" : "a - b").append(";\n")
         .append("    }\n}\n\n")
         .append("// 테스트 코드: Calc가 맞게 동작하는지 확인하는 코드\n")
         .append("class CalcTest {\n");
        if (anno) s.append("    // 표시: JUnit은 @Test가 붙은 메서드를 찾아 테스트로 실행한다\n    @Test\n");
        s.append("    void adds() {\n")
         .append("        // 판정: 앞의 값(기대한 값)과 뒤의 값(실제 값)이 다르면 실패\n")
         .append("        assertEquals(").append(expect.equals("five") ? "5" : "6").append(", new Calc().add(2, 3));\n")
         .append("    }\n}\n");
        return s.toString();
    }

    // 사실 확인용: 같은 모양에 호출 표시를 더한다. Calc.add가 불렸는지, adds()가 불렸는지를 정적 필드로 잰다.
    static String factSource(boolean anno) {
        return HEAD
            + "class Calc {\n    static int addCalls;\n    int add(int a, int b) {\n        addCalls++;\n        return a + b;\n    }\n}\n\n"
            + "class CalcTest {\n    static int addsCalls;\n"
            + (anno ? "    @Test\n" : "")
            + "    void adds() {\n        addsCalls++;\n        assertEquals(5, new Calc().add(2, 3));\n    }\n}\n";
    }

    static int acc(Class<?> c, String f) throws Exception { var x = c.getDeclaredField(f); x.setAccessible(true); return x.getInt(null); }

    record Outcome(boolean compiled, String errors, TestExecutionSummary summary, URLClassLoader loader) {}

    static Outcome compileAndRun(String full, Path dir) throws Exception {
        Files.createDirectories(dir);
        Files.deleteIfExists(dir.resolve("CalcTest.class"));
        Files.writeString(dir.resolve("CalcTest.java"), full, StandardCharsets.UTF_8);
        JavaCompiler jc = ToolProvider.getSystemJavaCompiler();
        DiagnosticCollector<JavaFileObject> dc = new DiagnosticCollector<>();
        JavaFileObject fo = new SimpleJavaFileObject(URI.create("string:///CalcTest.java"), JavaFileObject.Kind.SOURCE) {
            @Override public CharSequence getCharContent(boolean ignore) { return full; }
        };
        boolean ok = jc.getTask(null, null, dc, List.of("-d", dir.toString(), "-proc:none", "-classpath", System.getProperty("java.class.path")), null, List.of(fo)).call();
        if (!ok) {
            StringBuilder e = new StringBuilder();
            for (Diagnostic<? extends JavaFileObject> d : dc.getDiagnostics()) e.append(d.getKind()).append(' ').append(d.getMessage(java.util.Locale.ENGLISH)).append(" // ");
            return new Outcome(false, e.toString(), null, null);
        }
        URLClassLoader cl = new URLClassLoader(new URL[] { dir.toUri().toURL() }, TestBasicProbe.class.getClassLoader());
        Thread.currentThread().setContextClassLoader(cl);
        LauncherDiscoveryRequest request = LauncherDiscoveryRequestBuilder.request().selectors(DiscoverySelectors.selectClass(cl.loadClass("CalcTest"))).build();
        Launcher launcher = LauncherFactory.create();
        SummaryGeneratingListener listener = new SummaryGeneratingListener();
        launcher.execute(request, listener);
        return new Outcome(true, "", listener.getSummary(), cl);
    }

    public static void main(String[] args) throws Exception {
        String base = args.length > 1 ? args[1] : "verify/out/test_basic";
        System.out.println("# java " + System.getProperty("java.version") + " / junit-jupiter 6.0.3 / junit-platform-launcher 6.0.3");
        for (String impl : new String[] { "plus", "minus" })
            for (String expect : new String[] { "five", "six" })
                for (boolean anno : new boolean[] { true, false }) {
                    String body = body(impl, expect, anno);
                    Outcome o = compileAndRun(HEAD + body, Path.of(base, impl + "-" + expect + "-" + anno));
                    if (!o.compiled()) { System.out.println(impl + "|" + expect + "|" + anno + " => compile=ERR|" + o.errors()); continue; }
                    TestExecutionSummary s = o.summary();
                    String exc = "-", msg = "-";
                    if (!s.getFailures().isEmpty()) {
                        Throwable t = s.getFailures().get(0).getException();
                        exc = t.getClass().getName();
                        msg = String.valueOf(t.getMessage()).split("\n")[0];
                    }
                    System.out.println(impl + "|" + expect + "|" + anno + " => compile=OK|found=" + s.getTestsFoundCount() + "|started=" + s.getTestsStartedCount()
                        + "|succeeded=" + s.getTestsSucceededCount() + "|failed=" + s.getTestsFailedCount() + "|aborted=" + s.getTestsAbortedCount()
                        + "|skipped=" + s.getTestsSkippedCount() + "|containersFailed=" + s.getContainersFailedCount() + "|exc=" + exc + "|msg=" + msg);
                    o.loader().close();
                }
        // 사실 확인: 테스트 메서드를 부르는 것은 우리 코드가 아니라 JUnit이다(이 Probe는 adds()나 add를 직접 부르지 않는다)
        for (boolean anno : new boolean[] { true, false }) {
            Outcome o = compileAndRun(factSource(anno), Path.of(base, "fact-" + anno));
            Class<?> test = o.loader().loadClass("CalcTest"), calc = o.loader().loadClass("Calc");
            System.out.println("FACT anno=" + anno + " => compile=" + (o.compiled() ? "OK" : "ERR") + "|found=" + o.summary().getTestsFoundCount()
                + "|addsCalls=" + acc(test, "addsCalls") + "|addCalls=" + acc(calc, "addCalls"));
            o.loader().close();
        }
    }
}

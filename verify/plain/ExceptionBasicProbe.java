import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.concurrent.TimeUnit;
import javax.tools.Diagnostic;
import javax.tools.DiagnosticCollector;
import javax.tools.JavaCompiler;
import javax.tools.JavaFileObject;
import javax.tools.SimpleJavaFileObject;
import javax.tools.ToolProvider;

// 기초개념 "예외" 실습의 여덟 가지 조합(try-catch 2 x b의 값 2 x catch가 잡는 종류 2)을 실제로 실행한다.
// 조합마다 화면에 보이는 것과 같은 소스를 문자열로 만들어 javax.tools로 컴파일하고,
// 컴파일이 성공하면 이 JDK의 java를 자식 프로세스로 띄워 Main을 실행해 표준 출력, 표준 오류, 종료 코드를 잡는다.
//   tc   : try-catch로 감싸는가
//   b    : zero(int b = 0;) / two(int b = 2;)
//   kind : arith(catch (ArithmeticException e)) / npe(catch (NullPointerException e))
// 출력: tc|b|kind => 컴파일(OK/ERR)|오류 개수|종료 코드|표준 출력(여러 줄이면 " / ", 없으면 (없음))|
//        표준 오류의 첫 줄(없으면 -)|표준 오류의 줄 수|표준 출력 줄 수   (한 줄로 출력한다)
// 조합마다 만든 소스는 verify/out/exception_basic/<조합>/Main.java에, 실제 출력은 stdout.txt와 stderr.txt에 남긴다.
public class ExceptionBasicProbe {
    // 화면의 코드(실습의 code 함수)와 같은 글
    static String source(boolean tc, String b, String kind) {
        StringBuilder s = new StringBuilder();
        s.append("public class Main {\n"
            + "    public static void main(String[] args) {\n"
            + "        int a = 10;\n"
            + "        int b = " + (b.equals("zero") ? "0" : "2") + ";\n");
        if (tc) {
            s.append("        // try 블록: 문제가 날 수 있는 코드를 여기에 쓴다\n"
                + "        try {\n"
                + "            System.out.println(a / b);\n"
                + "        // catch: 예외가 나면 여기로 건너온다\n"
                + "        } catch (" + (kind.equals("arith") ? "ArithmeticException" : "NullPointerException") + " e) {\n"
                + "            System.out.println(\"0으로 나눌 수 없습니다\");\n"
                + "        }\n");
        } else {
            s.append("        System.out.println(a / b);\n");
        }
        s.append("        System.out.println(\"끝\");\n"
            + "    }\n"
            + "}\n");
        return s.toString();
    }

    static String[] lines(String text) {
        text = text.replace("\r\n", "\n");
        if (text.isEmpty()) return new String[0];
        return text.stripTrailing().split("\n");
    }

    public static void main(String[] args) throws Exception {
        String base = args.length > 0 ? args[0] : "verify/out/exception_basic";
        JavaCompiler jc = ToolProvider.getSystemJavaCompiler();
        String java = Path.of(System.getProperty("java.home"), "bin", "java").toString();
        System.out.println("# java " + System.getProperty("java.version"));
        for (boolean tc : new boolean[] { false, true })
            for (String b : new String[] { "zero", "two" })
                for (String kind : new String[] { "arith", "npe" }) {
                    String src = source(tc, b, kind);
                    Path dir = Path.of(base, tc + "-" + b + "-" + kind);
                    Files.createDirectories(dir);
                    Files.deleteIfExists(dir.resolve("Main.class"));
                    Files.deleteIfExists(dir.resolve("stdout.txt"));
                    Files.deleteIfExists(dir.resolve("stderr.txt"));
                    Files.writeString(dir.resolve("Main.java"), src, StandardCharsets.UTF_8);
                    DiagnosticCollector<JavaFileObject> dc = new DiagnosticCollector<>();
                    JavaFileObject fo = new SimpleJavaFileObject(URI.create("string:///Main.java"), JavaFileObject.Kind.SOURCE) {
                        @Override public CharSequence getCharContent(boolean ignore) { return src; }
                    };
                    boolean ok = jc.getTask(null, null, dc, List.of("-d", dir.toString(), "-proc:none"), null, List.of(fo)).call();
                    List<Diagnostic<? extends JavaFileObject>> errs = dc.getDiagnostics().stream().filter(d -> d.getKind() == Diagnostic.Kind.ERROR).toList();
                    String exit = "-", out = "-", errFirst = "-", errCount = "-", outCount = "-";
                    if (ok) {
                        ProcessBuilder pb = new ProcessBuilder(java, "-Dfile.encoding=UTF-8", "-Dstdout.encoding=UTF-8", "-Dstderr.encoding=UTF-8",
                            "-cp", dir.toString(), "Main");
                        pb.redirectOutput(dir.resolve("stdout.txt").toFile());
                        pb.redirectError(dir.resolve("stderr.txt").toFile());
                        Process p = pb.start();
                        if (!p.waitFor(60, TimeUnit.SECONDS)) { p.destroyForcibly(); throw new IllegalStateException("시간 초과 " + dir); }
                        exit = String.valueOf(p.exitValue());
                        String[] so = lines(Files.readString(dir.resolve("stdout.txt"), StandardCharsets.UTF_8));
                        String[] se = lines(Files.readString(dir.resolve("stderr.txt"), StandardCharsets.UTF_8));
                        out = so.length == 0 ? "(없음)" : String.join(" / ", so);
                        outCount = String.valueOf(so.length);
                        errFirst = se.length == 0 ? "-" : se[0];
                        errCount = String.valueOf(se.length);
                    }
                    System.out.println(tc + "|" + b + "|" + kind + " => " + (ok ? "OK" : "ERR") + "|" + errs.size() + "|"
                        + exit + "|" + out + "|" + errFirst + "|" + errCount + "|" + outCount);
                }
    }
}

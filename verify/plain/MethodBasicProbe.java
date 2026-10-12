import java.io.ByteArrayOutputStream;
import java.io.PrintStream;
import java.net.URI;
import java.net.URL;
import java.net.URLClassLoader;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.Locale;
import java.util.stream.Collectors;
import javax.tools.Diagnostic;
import javax.tools.DiagnosticCollector;
import javax.tools.JavaCompiler;
import javax.tools.JavaFileObject;
import javax.tools.SimpleJavaFileObject;
import javax.tools.ToolProvider;

// 기초개념 "메서드" 실습의 열두 가지 조합(선언 2 x 호출 3 x 넘기는 값 2)을 실제로 실행한다.
// 조합마다 화면에 보이는 것과 같은 소스를 문자열로 만들어 javax.tools로 컴파일하고,
// 컴파일이 성공하면 클래스를 새 클래스 로더로 읽어 Main.main을 실행해 표준 출력을 잡는다.
//   decl : add 메서드의 선언이 있는가
//   call : once(add(2, 3)을 한 번) / twice(두 번) / none(부르는 줄을 지움)
//   args : two(값을 두 개 넘김) / one(값을 하나만 넘김)
// 출력: decl|call|args => 컴파일(OK/ERR)|첫 오류의 진단 코드|오류 개수|Main.class가 만들어졌는가|실행했는가|출력(줄은 ' / '로 잇는다)|
//        첫 오류의 영어 메시지 첫 줄|오류가 난 줄(소스의 그 줄 글, ## 로 구분)   (한 줄로 출력한다)
// 끝에 FACT 줄을 더한다: 단계 문장이 기대는 사실(실행은 main의 첫 줄부터이고, 선언이 위에 있어도 먼저 실행되지 않는다)을
// 따로 컴파일해 실행한 결과. 조합마다 만든 소스는 verify/out/method_basic/<조합>/Main.java에 남긴다.
public class MethodBasicProbe {
    // 화면의 코드(실습의 code 함수)와 같은 글
    static String source(boolean decl, String call, String args) {
        boolean two = args.equals("two");
        String a = two ? "2, 3" : "2";
        StringBuilder s = new StringBuilder("public class Main {\n");
        if (decl) s.append("    // 선언: add라는 이름의 코드 묶음. 부르기 전에는 실행되지 않는다\n"
            + "    static int add(int a, int b) {\n"
            + "        System.out.println(\"add 실행\");\n"
            + "        return a + b;\n"
            + "    }\n\n");
        s.append("    public static void main(String[] args) {\n");
        if (!call.equals("none")) {
            s.append("        // 호출: ").append(two ? "2와 3을 넘겨" : "2를 넘겨").append(" add를 실행하고, 돌려받은 값을 sum에 담는다\n");
            s.append("        int sum = add(").append(a).append(");\n");
            s.append("        System.out.println(sum);\n");
            if (call.equals("twice")) {
                s.append("        int sum2 = add(").append(a).append(");\n");
                s.append("        System.out.println(sum2);\n");
            }
        }
        s.append("    }\n}\n");
        return s.toString();
    }

    // 사실 확인용: main의 첫 줄에서 "main 시작"을 출력하고, add 선언은 main보다 위에 둔다
    static String factSource() {
        return "public class Main {\n"
            + "    static int add(int a, int b) {\n"
            + "        System.out.println(\"add 실행\");\n"
            + "        return a + b;\n"
            + "    }\n\n"
            + "    public static void main(String[] args) {\n"
            + "        System.out.println(\"main 시작\");\n"
            + "        int sum = add(2, 3);\n"
            + "        System.out.println(sum);\n"
            + "    }\n}\n";
    }

    static String run(Path dir) throws Exception {
        try (URLClassLoader cl = new URLClassLoader(new URL[] { dir.toUri().toURL() }, MethodBasicProbe.class.getClassLoader().getParent())) {
            PrintStream old = System.out;
            ByteArrayOutputStream buf = new ByteArrayOutputStream();
            System.setOut(new PrintStream(buf, true, StandardCharsets.UTF_8));
            try { cl.loadClass("Main").getMethod("main", String[].class).invoke(null, (Object) new String[0]); }
            finally { System.setOut(old); }
            return buf.toString(StandardCharsets.UTF_8).strip().replace("\r\n", "\n").replace("\n", " / ");
        }
    }

    public static void main(String[] args) throws Exception {
        String base = args.length > 0 ? args[0] : "verify/out/method_basic";
        JavaCompiler jc = ToolProvider.getSystemJavaCompiler();
        System.out.println("# java " + System.getProperty("java.version"));
        for (boolean decl : new boolean[] { false, true })
            for (String call : new String[] { "once", "twice", "none" })
                for (String a : new String[] { "two", "one" }) {
                    String src = source(decl, call, a);
                    Path dir = Path.of(base, decl + "-" + call + "-" + a);
                    Files.createDirectories(dir);
                    Files.deleteIfExists(dir.resolve("Main.class"));
                    Files.writeString(dir.resolve("Main.java"), src, StandardCharsets.UTF_8);
                    DiagnosticCollector<JavaFileObject> dc = new DiagnosticCollector<>();
                    JavaFileObject fo = new SimpleJavaFileObject(URI.create("string:///Main.java"), JavaFileObject.Kind.SOURCE) {
                        @Override public CharSequence getCharContent(boolean ignore) { return src; }
                    };
                    boolean ok = jc.getTask(null, null, dc, List.of("-d", dir.toString(), "-proc:none"), null, List.of(fo)).call();
                    List<Diagnostic<? extends JavaFileObject>> errs = dc.getDiagnostics().stream().filter(d -> d.getKind() == Diagnostic.Kind.ERROR).toList();
                    String code = "-", msg = "-", where = "-";
                    if (!errs.isEmpty()) {
                        String[] lines = src.split("\n");
                        code = errs.get(0).getCode();
                        msg = errs.get(0).getMessage(Locale.ENGLISH).split("\n")[0];
                        where = errs.stream().map(d -> lines[(int) d.getLineNumber() - 1].strip()).collect(Collectors.joining(" ## "));
                    }
                    String mainClass = String.valueOf(Files.exists(dir.resolve("Main.class")));
                    String ran = "false", out = "-";
                    if (ok) { out = run(dir); ran = "true"; }
                    System.out.println(decl + "|" + call + "|" + a + " => " + (ok ? "OK" : "ERR") + "|" + code + "|" + errs.size()
                        + "|" + mainClass + "|" + ran + "|" + out + "|" + msg + "|" + where);
                }
        // 사실 확인
        String src = factSource();
        Path dir = Path.of(base, "fact-order");
        Files.createDirectories(dir);
        Files.writeString(dir.resolve("Main.java"), src, StandardCharsets.UTF_8);
        DiagnosticCollector<JavaFileObject> dc = new DiagnosticCollector<>();
        JavaFileObject fo = new SimpleJavaFileObject(URI.create("string:///Main.java"), JavaFileObject.Kind.SOURCE) {
            @Override public CharSequence getCharContent(boolean ignore) { return src; }
        };
        boolean ok = jc.getTask(null, null, dc, List.of("-d", dir.toString(), "-proc:none"), null, List.of(fo)).call();
        System.out.println("FACT order => " + (ok ? run(dir) : "컴파일 실패"));
    }
}

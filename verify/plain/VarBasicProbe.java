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

// 기초개념 "변수와 타입" 실습의 여섯 가지 조합(타입 2 x 담는 값 3)을 실제로 실행한다.
// 조합마다 화면에 보이는 것과 같은 소스를 문자열로 만들어 javax.tools로 컴파일하고,
// 컴파일이 성공하면 클래스를 새 클래스 로더로 읽어 Main.main을 실행해 표준 출력을 잡는다.
//   type  : 변수 이름 앞에 타입 int를 적는가
//   value : num(20을 담는다) / text("스무 살"을 담는다) / none(값을 담지 않는다)
// 출력: type|value => 컴파일(OK/ERR)|첫 오류의 진단 코드|오류 개수|Main.class가 만들어졌는가|실행했는가|출력|
//        첫 오류의 영어 메시지 첫 줄|모든 오류의 진단 코드(쉼표)|오류가 난 줄(소스의 그 줄 글, ## 로 구분)   (한 줄로 출력한다)
// 조합마다 만든 소스는 verify/out/var_basic/<조합>/Main.java에 남긴다(대조 스크립트가 화면의 코드와 같은지 비교한다).
public class VarBasicProbe {
    // 화면의 코드(실습의 code 함수)와 같은 글
    static String source(boolean type, String value) {
        StringBuilder s = new StringBuilder();
        s.append("public class Main {\n")
         .append("    public static void main(String[] args) {\n");
        if (type) {
            if (value.equals("num")) s.append("        // 선언: int 타입의 변수 age를 만들고 20을 담는다\n        int age = 20;\n");
            else if (value.equals("text")) s.append("        // 선언: int 타입의 변수 age를 만들고 \"스무 살\"을 담는다\n        int age = \"스무 살\";\n");
            else s.append("        // 선언: int 타입의 변수 age를 만들기만 하고 값은 담지 않는다\n        int age;\n");
        } else {
            if (value.equals("num")) s.append("        age = 20;\n");
            else if (value.equals("text")) s.append("        age = \"스무 살\";\n");
        }
        s.append("        age = age + 1;\n")
         .append("        System.out.println(age);\n")
         .append("    }\n")
         .append("}\n");
        return s.toString();
    }

    public static void main(String[] args) throws Exception {
        String base = args.length > 0 ? args[0] : "verify/out/var_basic";
        JavaCompiler jc = ToolProvider.getSystemJavaCompiler();
        System.out.println("# java " + System.getProperty("java.version"));
        for (boolean type : new boolean[] { false, true })
            for (String value : new String[] { "num", "text", "none" }) {
                String src = source(type, value);
                Path dir = Path.of(base, type + "-" + value);
                Files.createDirectories(dir);
                Files.deleteIfExists(dir.resolve("Main.class"));
                Files.writeString(dir.resolve("Main.java"), src, StandardCharsets.UTF_8);
                DiagnosticCollector<JavaFileObject> dc = new DiagnosticCollector<>();
                JavaFileObject fo = new SimpleJavaFileObject(URI.create("string:///Main.java"), JavaFileObject.Kind.SOURCE) {
                    @Override public CharSequence getCharContent(boolean ignore) { return src; }
                };
                boolean ok = jc.getTask(null, null, dc, List.of("-d", dir.toString(), "-proc:none"), null, List.of(fo)).call();
                List<Diagnostic<? extends JavaFileObject>> errs = dc.getDiagnostics().stream().filter(d -> d.getKind() == Diagnostic.Kind.ERROR).toList();
                String code = "-", msg = "-", codes = "-", where = "-";
                if (!errs.isEmpty()) {
                    String[] lines = src.split("\n");
                    code = errs.get(0).getCode();
                    msg = errs.get(0).getMessage(Locale.ENGLISH).split("\n")[0];
                    codes = errs.stream().map(d -> d.getCode()).collect(Collectors.joining(","));
                    where = errs.stream().map(d -> lines[(int) d.getLineNumber() - 1].strip()).collect(Collectors.joining(" ## "));
                }
                String mainClass = String.valueOf(Files.exists(dir.resolve("Main.class")));
                String ran = "false", out = "-";
                if (ok) {
                    try (URLClassLoader cl = new URLClassLoader(new URL[] { dir.toUri().toURL() }, VarBasicProbe.class.getClassLoader().getParent())) {
                        PrintStream old = System.out;
                        ByteArrayOutputStream buf = new ByteArrayOutputStream();
                        System.setOut(new PrintStream(buf, true, StandardCharsets.UTF_8));
                        try { cl.loadClass("Main").getMethod("main", String[].class).invoke(null, (Object) new String[0]); }
                        finally { System.setOut(old); }
                        ran = "true";
                        out = buf.toString(StandardCharsets.UTF_8).strip();
                    }
                }
                System.out.println(type + "|" + value + " => " + (ok ? "OK" : "ERR") + "|" + code + "|" + errs.size()
                    + "|" + mainClass + "|" + ran + "|" + out + "|" + msg + "|" + codes + "|" + where);
            }
    }
}

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

// 기초개념 "인터페이스" 실습의 열두 가지 조합(선언 2 x implements 2 x pay 메서드 3)을 실제로 실행한다.
// 조합마다 화면에 보이는 것과 같은 소스를 문자열로 만들어 javax.tools로 컴파일하고,
// 컴파일이 성공하면 클래스를 새 클래스 로더로 읽어 Main.main을 실행해 표준 출력을 잡는다.
//   decl   : interface Payable 선언이 있는가
//   impl   : Card 클래스에 implements Payable을 쓰는가
//   method : body(pay 메서드를 작성) / empty(본문을 비움) / none(pay 메서드를 작성하지 않음)
// 출력: decl|impl|method => 컴파일(OK/ERR)|첫 오류의 진단 코드|오류 개수|Main.class가 만들어졌는가|실행했는가|출력|
//        첫 오류의 영어 메시지 첫 줄|오류가 난 줄(소스의 그 줄 글, ## 로 구분)   (한 줄로 출력한다)
// 조합마다 만든 소스는 verify/out/interface_basic/<조합>/Main.java에 남긴다(대조 스크립트가 화면의 코드와 같은지 비교한다).
public class InterfaceBasicProbe {
    // 화면의 코드(실습의 code 함수)와 같은 글
    static String source(boolean decl, boolean impl, String method) {
        StringBuilder s = new StringBuilder();
        if (decl) s.append("// 약속: Payable이라면 pay 메서드를 갖춰야 한다 (이름만 적는다)\n"
            + "interface Payable {\n"
            + "    void pay();\n"
            + "}\n\n");
        if (impl) s.append("// 약속을 지키겠다는 선언\n");
        s.append("class Card").append(impl ? " implements Payable" : "").append(" {\n");
        if (method.equals("body")) s.append("    // 약속한 메서드를 실제로 작성한 것\n"
            + "    public void pay() {\n"
            + "        System.out.println(\"카드로 결제\");\n"
            + "    }\n");
        else if (method.equals("empty")) s.append("    // 약속한 메서드를 실제로 작성한 것\n"
            + "    public void pay() { }\n");
        s.append("}\n\n");
        s.append("public class Main {\n"
            + "    public static void main(String[] args) {\n"
            + "        // Payable 타입 변수에 Card 객체를 담는다\n"
            + "        Payable p = new Card();\n"
            + "        p.pay();\n"
            + "    }\n"
            + "}\n");
        return s.toString();
    }

    public static void main(String[] args) throws Exception {
        String base = args.length > 0 ? args[0] : "verify/out/interface_basic";
        JavaCompiler jc = ToolProvider.getSystemJavaCompiler();
        System.out.println("# java " + System.getProperty("java.version"));
        for (boolean decl : new boolean[] { false, true })
            for (boolean impl : new boolean[] { false, true })
                for (String method : new String[] { "body", "empty", "none" }) {
                    String src = source(decl, impl, method);
                    Path dir = Path.of(base, decl + "-" + impl + "-" + method);
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
                    if (ok) {
                        try (URLClassLoader cl = new URLClassLoader(new URL[] { dir.toUri().toURL() }, InterfaceBasicProbe.class.getClassLoader().getParent())) {
                            PrintStream old = System.out;
                            ByteArrayOutputStream buf = new ByteArrayOutputStream();
                            System.setOut(new PrintStream(buf, true, StandardCharsets.UTF_8));
                            try { cl.loadClass("Main").getMethod("main", String[].class).invoke(null, (Object) new String[0]); }
                            finally { System.setOut(old); }
                            ran = "true";
                            out = buf.toString(StandardCharsets.UTF_8).strip();
                        }
                    }
                    System.out.println(decl + "|" + impl + "|" + method + " => " + (ok ? "OK" : "ERR") + "|" + code + "|" + errs.size()
                        + "|" + mainClass + "|" + ran + "|" + out + "|" + msg + "|" + where);
                }
    }
}

import java.io.ByteArrayOutputStream;
import java.io.PrintStream;
import java.lang.reflect.InvocationTargetException;
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

// 기초개념 "클래스와 객체" 실습의 열두 가지 조합(선언 2 x 객체 만들기 3 x 하나 더 2)을 실제로 실행한다.
// 조합마다 화면에 보이는 것과 같은 소스를 문자열로 만들어 javax.tools로 컴파일하고,
// 컴파일이 성공하면 클래스를 새 클래스 로더로 읽어 Main.main을 실행해 표준 출력과 예외를 잡는다.
//   decl : class Card 선언이 있는가
//   make : new(Card a = new Card();) / none(Card a;) / null(Card a = null;)
//   two  : 객체를 하나 더 만드는가(Card b)
// 만들어진 Card 객체의 수는 Probe용 소스에만 더한 줄(Card 안의 "// PROBE" 줄: 인스턴스 초기화 블록이 static 필드를 올린다)로 센다.
// 이 줄은 화면의 코드에는 없으므로, 대조 스크립트가 화면의 코드와 견줄 때 뺀다.
// 출력: decl|make|two => 컴파일(OK/ERR)|첫 오류의 진단 코드|오류 개수|Main.class가 만들어졌는가|실행했는가|
//        예외 클래스(없으면 -)|예외 메시지 첫 줄|출력(여러 줄이면 " / ")|만들어진 Card 객체 수(실행 안 했으면 -)|
//        첫 오류의 영어 메시지 첫 줄|오류가 난 줄(소스의 그 줄 글, ## 로 구분)   (한 줄로 출력한다)
// 조합마다 만든 소스는 verify/out/class_basic/<조합>/Main.java에 남긴다.
public class ClassBasicProbe {
    // 화면의 코드(실습의 code 함수)와 같은 글. probe가 true면 세는 줄을 더한다.
    static String source(boolean decl, String make, boolean two, boolean probe) {
        StringBuilder s = new StringBuilder();
        if (decl) {
            s.append("// 설계도: Card는 owner라는 값(필드)과 show라는 메서드를 가진다\n");
            s.append("class Card {\n");
            if (probe) s.append("    static int made; { made++; } // PROBE\n");
            s.append("    String owner;\n"
                + "    void show() {\n"
                + "        System.out.println(owner + \"의 카드\");\n"
                + "    }\n"
                + "}\n\n");
        }
        s.append("public class Main {\n"
            + "    public static void main(String[] args) {\n");
        if (make.equals("new")) s.append("        // 객체: 설계도대로 실제 카드를 하나 만들어 변수 a에 담는다\n"
            + "        Card a = new Card();\n");
        else if (make.equals("none")) s.append("        // 카드를 담을 변수 a만 선언한다\n"
            + "        Card a;\n");
        else s.append("        // 변수 a에 null을 담는다. 가리키는 객체가 없다\n"
            + "        Card a = null;\n");
        s.append("        a.owner = \"김철수\";\n"
            + "        a.show();\n");
        if (two) s.append("\n"
            + "        // 객체를 하나 더 만들어 변수 b에 담는다\n"
            + "        Card b = new Card();\n"
            + "        b.owner = \"이영희\";\n"
            + "        b.show();\n"
            + "\n"
            + "        // a가 가리키는 객체의 owner가 그대로인지 다시 불러 본다\n"
            + "        a.show();\n");
        s.append("    }\n"
            + "}\n");
        return s.toString();
    }

    public static void main(String[] args) throws Exception {
        String base = args.length > 0 ? args[0] : "verify/out/class_basic";
        JavaCompiler jc = ToolProvider.getSystemJavaCompiler();
        System.out.println("# java " + System.getProperty("java.version"));
        for (boolean decl : new boolean[] { false, true })
            for (String make : new String[] { "new", "none", "null" })
                for (boolean two : new boolean[] { false, true }) {
                    String shown = source(decl, make, two, false);
                    String src = source(decl, make, two, true);
                    Path dir = Path.of(base, decl + "-" + make + "-" + two);
                    Files.createDirectories(dir);
                    Files.deleteIfExists(dir.resolve("Main.class"));
                    Files.deleteIfExists(dir.resolve("Card.class"));
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
                    String ran = "false", exc = "-", excMsg = "-", out = "-", made = "-";
                    if (ok) {
                        try (URLClassLoader cl = new URLClassLoader(new URL[] { dir.toUri().toURL() }, ClassBasicProbe.class.getClassLoader().getParent())) {
                            PrintStream old = System.out;
                            ByteArrayOutputStream buf = new ByteArrayOutputStream();
                            System.setOut(new PrintStream(buf, true, StandardCharsets.UTF_8));
                            try {
                                cl.loadClass("Main").getMethod("main", String[].class).invoke(null, (Object) new String[0]);
                            } catch (InvocationTargetException e) {
                                Throwable t = e.getCause();
                                exc = t.getClass().getName();
                                excMsg = String.valueOf(t.getMessage()).split("\n")[0];
                            } finally { System.setOut(old); }
                            ran = "true";
                            out = buf.toString(StandardCharsets.UTF_8).strip().replace("\r\n", "\n").replace("\n", " / ");
                            if (out.isEmpty()) out = "(없음)";
                            if (decl) {
                                java.lang.reflect.Field f = cl.loadClass("Card").getDeclaredField("made");
                                f.setAccessible(true);
                                made = String.valueOf(f.get(null));
                            }
                            else made = "-";
                        }
                    }
                    // 화면에 보이는 소스(세는 줄을 뺀 것)가 Probe 소스에서 세는 줄만 뺀 것과 같은지는 대조 스크립트가 확인한다.
                    if (!src.replace("    static int made; { made++; } // PROBE\n", "").equals(shown)) throw new IllegalStateException("소스 불일치 " + dir);
                    System.out.println(decl + "|" + make + "|" + two + " => " + (ok ? "OK" : "ERR") + "|" + code + "|" + errs.size()
                        + "|" + mainClass + "|" + ran + "|" + exc + "|" + excMsg + "|" + out + "|" + made + "|" + msg + "|" + where);
                }
        // 단계 문장이 기대는 사실: new로 막 만든 객체의 owner는 값을 담기 전에 null이다(JLS 4.12.5, 15.9.4)
        String cardOnly = source(true, "new", false, false);
        String factSrc = cardOnly.substring(0, cardOnly.indexOf("public class Main"))
            + "public class Main {\n    public static void main(String[] args) {\n        new Card().show();\n    }\n}\n";
        Path fdir = Path.of(base, "fact-owner-default");
        Files.createDirectories(fdir);
        Files.writeString(fdir.resolve("Main.java"), factSrc, StandardCharsets.UTF_8);
        DiagnosticCollector<JavaFileObject> fdc = new DiagnosticCollector<>();
        JavaFileObject ffo = new SimpleJavaFileObject(URI.create("string:///Main.java"), JavaFileObject.Kind.SOURCE) {
            @Override public CharSequence getCharContent(boolean ignore) { return factSrc; }
        };
        boolean fok = jc.getTask(null, null, fdc, List.of("-d", fdir.toString(), "-proc:none"), null, List.of(ffo)).call();
        String fout = "-";
        if (fok) {
            try (URLClassLoader cl = new URLClassLoader(new URL[] { fdir.toUri().toURL() }, ClassBasicProbe.class.getClassLoader().getParent())) {
                PrintStream old = System.out;
                ByteArrayOutputStream buf = new ByteArrayOutputStream();
                System.setOut(new PrintStream(buf, true, StandardCharsets.UTF_8));
                try { cl.loadClass("Main").getMethod("main", String[].class).invoke(null, (Object) new String[0]); }
                finally { System.setOut(old); }
                fout = buf.toString(StandardCharsets.UTF_8).strip();
            }
        }
        System.out.println("FACT owner_default => " + fout);
    }
}

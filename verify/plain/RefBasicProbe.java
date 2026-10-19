import java.io.ByteArrayOutputStream;
import java.io.PrintStream;
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

// 기초개념 "참조" 실습의 네 가지 조합(how: same, fresh, copy, prim)을 실제로 실행한다.
// 조합마다 화면에 보이는 코드에 "세는 줄"(줄 끝에 // PROBE)만 더한 소스를 javax.tools로 컴파일하고,
// 클래스를 새 클래스 로더로 읽어 Main.main을 실행해 표준 출력을 잡는다.
// 세는 줄은 Card 객체가 만들어진 수를 세고(static 변수와 생성자), Card b = ...; 줄 직후의 상태를 출력한다.
// 출력: how => 컴파일(OK/ERR)|첫째 출력 줄|둘째 출력 줄|끝에서 만들어진 Card 수|
//        b 줄 직후의 Card 수|a == b|b.owner|두 owner가 같은가   (prim은 해당 없는 칸이 -, 직후에는 a == b만 있다)
// 조합마다 만든 소스는 verify/out/ref_basic/<조합>/Main.java에 남긴다(대조 스크립트가 // PROBE 줄을 빼고 화면의 코드와 비교한다).
public class RefBasicProbe {
    static final String P = " // PROBE\n";

    static String source(String how) {
        StringBuilder s = new StringBuilder();
        if (how.equals("prim")) {
            s.append("public class Main {\n"
                + "    public static void main(String[] args) {\n"
                + "        int a = 1;\n"
                + "        int b = a;\n"
                + "        System.out.println(\"PROBE after \" + (a == b));" + P
                + "        b = 2;\n"
                + "        System.out.println(a);\n"
                + "        System.out.println(a == b);\n"
                + "    }\n"
                + "}\n");
            return s.toString();
        }
        s.append("class Card {\n"
            + "    static int made;" + P
            + "    Card() { made++; }" + P
            + "    String owner;\n"
            + "}\n\n"
            + "public class Main {\n"
            + "    public static void main(String[] args) {\n"
            + "        Card a = new Card();\n"
            + "        a.owner = \"김철수\";\n");
        if (how.equals("same")) s.append("        // a가 가진 참조가 b에 복사되어 b도 같은 객체를 가리킨다. 객체는 새로 생기지 않는다\n"
            + "        Card b = a;\n");
        else {
            s.append("        Card b = new Card();\n");
            if (how.equals("copy")) s.append("        b.owner = a.owner;\n");
        }
        s.append("        System.out.println(\"PROBE after \" + Card.made + \" \" + (a == b) + \" \" + b.owner + \" \" + java.util.Objects.equals(a.owner, b.owner));" + P
            + "        b.owner = \"이영희\";\n"
            + "        System.out.println(a.owner);\n"
            + "        System.out.println(a == b);\n"
            + "        System.out.println(\"PROBE end \" + Card.made);" + P
            + "    }\n"
            + "}\n");
        return s.toString();
    }

    public static void main(String[] args) throws Exception {
        String base = args.length > 0 ? args[0] : "verify/out/ref_basic";
        JavaCompiler jc = ToolProvider.getSystemJavaCompiler();
        System.out.println("# java " + System.getProperty("java.version"));
        for (String how : new String[] { "same", "fresh", "copy", "prim" }) {
            String src = source(how);
            Path dir = Path.of(base, how);
            Files.createDirectories(dir);
            Files.deleteIfExists(dir.resolve("Main.class"));
            Files.writeString(dir.resolve("Main.java"), src, StandardCharsets.UTF_8);
            DiagnosticCollector<JavaFileObject> dc = new DiagnosticCollector<>();
            JavaFileObject fo = new SimpleJavaFileObject(URI.create("string:///Main.java"), JavaFileObject.Kind.SOURCE) {
                @Override public CharSequence getCharContent(boolean ignore) { return src; }
            };
            boolean ok = jc.getTask(null, null, dc, List.of("-d", dir.toString(), "-proc:none"), null, List.of(fo)).call();
            for (Diagnostic<? extends JavaFileObject> d : dc.getDiagnostics())
                if (d.getKind() == Diagnostic.Kind.ERROR) System.out.println("# 오류 " + how + ": " + d.getMessage(null));
            String o1 = "-", o2 = "-", end = "-", aMade = "-", aEq = "-", aOwner = "-", aSame = "-";
            if (ok) {
                try (URLClassLoader cl = new URLClassLoader(new URL[] { dir.toUri().toURL() }, RefBasicProbe.class.getClassLoader().getParent())) {
                    PrintStream old = System.out;
                    ByteArrayOutputStream buf = new ByteArrayOutputStream();
                    System.setOut(new PrintStream(buf, true, StandardCharsets.UTF_8));
                    try { cl.loadClass("Main").getMethod("main", String[].class).invoke(null, (Object) new String[0]); }
                    finally { System.setOut(old); }
                    List<String> shown = new java.util.ArrayList<>();
                    for (String ln : buf.toString(StandardCharsets.UTF_8).split("\\R")) {
                        if (ln.startsWith("PROBE after ")) {
                            String[] f = ln.substring("PROBE after ".length()).split(" ");
                            if (how.equals("prim")) aEq = f[0];
                            else { aMade = f[0]; aEq = f[1]; aOwner = f[2]; aSame = f[3]; }
                        } else if (ln.startsWith("PROBE end ")) end = ln.substring("PROBE end ".length());
                        else shown.add(ln);
                    }
                    o1 = shown.get(0); o2 = shown.get(1);
                    if (shown.size() != 2) throw new IllegalStateException("출력 줄이 둘이 아님: " + shown);
                }
            }
            System.out.println(how + " => " + (ok ? "OK" : "ERR") + "|" + o1 + "|" + o2 + "|" + end + "|" + aMade + "|" + aEq + "|" + aOwner + "|" + aSame);
        }
    }
}
